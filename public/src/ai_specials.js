// GRIMGE Prototype — the AI Wizard uses special runes (user, 20 Oct 2026: "KI-Gegner
// sollen S53 selbst öffnen können (Duell-Gegenzug)", traps, shadow binding …).
//
//   • Counter domain: when a hostile domain unfolds around it, the AI answers
//     with its own (→ domain duel; it taps at a steady rate there).
//   • Specials by situation: shadow binding / rush at mid range in the same lane,
//     traps under the player, a domain when the player is close, stances when
//     pressed. Own cooldown, mana like every cast.
//   • Second stages: the AI takes the offered re-cast and fires it with simple
//     timing (mash fast where the slot asks for it, close a domain late).
import { lookupRecipe, runeManaCost } from './spell_catalog.js';
import { takeOfferedRecast } from './recast.js';
import { activeDomains, DOMAIN } from './signature_abilities_g.js';

export const AI_SPECIAL_COOLDOWN = 7;
// Arena duels and boss fights without a configured deck still get a small special kit.
const DEFAULT_KIT = Object.freeze(['sig_S54', 'sig_S47', 'sig_S53']);

const sigId = (id) => (id.startsWith('sig_') ? id.slice(4) : id);
export function aiSpecialIds(ai, gw) {
  const fromDeck = (ai.deckIds ?? []).filter((id) => id.startsWith('sig_'));
  if (fromDeck.length) return [...new Set(fromDeck)];
  if (ai.aiSpecialIds) return ai.aiSpecialIds;
  // Training: only what the sparring partner's deck holds (set it in the deck editor).
  if (gw?.activeMode?.id === 'training') return [];
  return gw?.activeMode?.enemyBehavior === 'duel' || gw?.modeState?.bossActive ? DEFAULT_KIT : [];
}
const defOf = (id) => lookupRecipe([{ id }]);
const cost = (id) => runeManaCost(id) ?? 40;

function cast(ai, id, gw, spells, target = null) {
  const def = defOf(id); if (!def) return false;
  const price = cost(id);
  if ((ai.mp ?? 0) < price) return false;
  ai.mp -= price;
  takeOfferedRecast(null);
  spells.cast(ai, def, gw, null, target);
  const offer = takeOfferedRecast(ai);
  // Traps go off on contact; the AI never detonates them by hand.
  if (offer && sigId(id) !== 'S47') ai.aiRecast = { ...offer, sig: sigId(id), left: offer.window, total: offer.window, next: firstDelay(offer, sigId(id)) };
  ai.specialCooldown = AI_SPECIAL_COOLDOWN; ai.spellCooldown = Math.max(ai.spellCooldown ?? 0, 1.2);
  ai.lastAISpecial = sigId(id);
  return true;
}
function firstDelay(offer, sig) {
  if (sig === 'S53') return Math.max(.5, offer.window - 1.2); // close the domain with the finale near its end
  if (sig === 'S54') return 1.6;                               // lead the bound player a bit, then strangle
  return .7;
}

// A hostile domain around the AI → open its own (domain duel).
export function tryAICounterDomain(ai, gw, spells) {
  const ids = aiSpecialIds(ai, gw); if (!ids.includes('sig_S53')) return false;
  const threat = activeDomains().find((d) => d.team !== ai.team && d.collapseT == null && !d.clash && Math.hypot(d.cx - ai.x, ((d.cz - (ai.z ?? d.cz)) * 150)) < d.R + DOMAIN.radius);
  if (!threat || (ai.mp ?? 0) < cost('sig_S53')) return false;
  ai.facing = Math.sign(threat.cx - ai.x) || ai.facing;
  return cast(ai, 'sig_S53', gw, spells);
}

// Pick a special that fits the moment.
export function tryAISpecial(ai, player, distance, gw, spells) {
  if ((ai.specialCooldown ?? 0) > 0 || ai.aiRecast || !player?.isAlive) return false;
  const ids = aiSpecialIds(ai, gw); if (!ids.length) return false;
  const sameLane = Math.abs((player.z ?? 0) - (ai.z ?? 0)) < .12;
  ai.facing = Math.sign(player.x - ai.x) || ai.facing;
  const options = [];
  for (const id of ids) {
    const def = defOf(id); if (!def || (ai.mp ?? 0) < cost(id)) continue;
    const s = sigId(id); const mode = def.targetingMode;
    if (s === 'S53') { if (distance < 170 && !activeDomains().some((d) => d.team === ai.team)) options.push([id, null, 3]); continue; }
    if (s === 'S54') { if (distance > 110 && distance < 320 && sameLane && (player.elevation ?? 0) < 10) options.push([id, null, 4]); continue; }
    if (mode === 'ground' || mode === 'placement') { if (distance < 360) options.push([id, { x: player.x, z: player.z }, 2]); continue; }
    if (mode === 'direction') { if (sameLane && distance < 300) options.push([id, null, 2]); continue; }
    if (mode === 'self') { if (distance < 140 || ai.hp / ai.maxHp < .5) options.push([id, null, 1]); continue; }
  }
  if (!options.length) return false;
  // Weighted pick (the strongest fit wins more often, but not always).
  const total = options.reduce((sum, o) => sum + o[2], 0); let r = Math.random() * total;
  const [id, target] = options.find((o) => (r -= o[2]) <= 0) ?? options[0];
  return cast(ai, id, gw, spells, target);
}

// Second stages for the AI: wait, then fire; repeat where the spell keeps the slot open.
export function updateAIRecast(ai, dt, gw) {
  const r = ai.aiRecast; if (!r) return;
  r.left -= dt;
  const upd = r.poll?.();
  if (upd) { if (upd.window != null) { r.left = upd.window; r.total = upd.window; } if (upd.label) { r.label = upd.label; if (/SCHNELL|DRÜCKEN/.test(upd.label)) r.next = .12; if (/SCHATTENWÜRGEN/.test(upd.label)) r.next = 1.6; } }
  if (r.left <= 0 || (r.valid && !r.valid())) { r.expire?.(); ai.aiRecast = null; return; }
  if (/DUELL/.test(r.label)) return; // the domain duel taps for the AI on its own
  r.next -= dt;
  if (r.next > 0) return;
  const out = r.stage2?.(gw);
  if (out && typeof out === 'object' && out.again) {
    if (out.label) r.label = out.label;
    if (out.window != null) { r.left = out.window; r.total = out.window; }
    r.next = /SCHNELL|DRÜCKEN/.test(r.label) ? .15 : .45;
  } else ai.aiRecast = null;
}
