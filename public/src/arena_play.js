// GRIMGE Prototype — the Arena rune loop in play (user spec 16 Nov 2026). The rules live in arena_runes.js (pure); this
// file connects them to the running game: the spawn director (crates, breakable objects, announced central events),
// collecting and replacing, the heavy-hit ejection, the KO reset and the shared inventory of player AND AI champion.
// Both fighters own an ArenaRuneSlots (fighter.arenaInv) and obey the same rules — no card for one side and three casts
// for the other any more.
import { ARENA_RULES, ArenaRuneSlots, buildSpawnPool, pickFromPool, fitPortfolio, makeRelic, tickRelics, relicCollectible } from './arena_runes.js';
import { arenaRuneInfo } from './progression.js';
import { recognizer } from './recognizer.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { environment } from './environment.js';

const PICKUP_RANGE = 42;
const SPOTS = Object.freeze([{ x: 438, z: .27 }, { x: 535, z: .80 }, { x: 625, z: .48 }, { x: 330, z: .5 }, { x: 720, z: .35 }, { x: 512, z: .55 }]);
const CENTRE = Object.freeze({ x: 512, z: .5 });
const MAX_RELICS = 4; const EVENT_TELEGRAPH = 3; const EVENT_EVERY = 24; const DRY_AFTER = 4;
const runeOf = (id) => recognizer.runes.find((r) => r.id === id) ?? null;
const nameOf = (id) => runeOf(id)?.name ?? String(id).toUpperCase();
const dist = (a, b) => Math.hypot(a.x - b.x, (a.z - b.z) * 150);

// What the champion brings to a duel: the base elements plus the AI specials it knows (as far as the budget allows).
export const AI_ARENA_PORTFOLIO = Object.freeze(['ignis', 'fulgur', 'terra', 'aqua', 'sig_S54', 'sig_S47', 'sig_S53']);

export const arenaOn = (game) => game?.activeMode?.id === 'arena' && !!game?.modeState?.arena;
export const fightersOf = (game) => [game.player, game.enemyChampion].filter(Boolean);

export function setupArenaRunes(game) {
  const st = game.modeState; const P = game.player; const E = game.enemyChampion;
  const rules = game.activeMode?.arenaRunes ?? ARENA_RULES;
  const mine = fitPortfolio(game.profile?.effectiveArenaPortfolio?.() ?? [], arenaRuneInfo, rules);
  const theirs = fitPortfolio(AI_ARENA_PORTFOLIO, arenaRuneInfo, rules);
  // Only runes the game can actually put on a card enter the pool.
  const pool = buildSpawnPool([mine, theirs], arenaRuneInfo, rules).filter((e) => runeOf(e.runeId));
  st.arena = { rules, portfolios: [mine, theirs], pool, eventTimer: 9, event: null, dryTimer: 0, crateTimer: 14, enemyDead: false };
  st.runeCollectibles = [];
  P.arenaInv = new ArenaRuneSlots(rules); E.arenaInv = new ArenaRuneSlots(rules);
  P.configureRuneDeck?.([]); E.setDeck?.([]);
  game.showAnnouncement?.('ARENA — RUNEN AUS KISTEN UND EVENTS', 1.8);
}

const onField = (st) => new Set(st.runeCollectibles.map((r) => r.runeId));
export function spawnRelic(game, runeId, x, z, { source = 'spawn', minRarity = null } = {}) {
  const st = game.modeState; if (!st?.arena || st.runeCollectibles.length >= MAX_RELICS) return null;
  const info = arenaRuneInfo(runeId);
  const relic = makeRelic(runeId, x, z, { lock: st.arena.rules.bounceLock, source, rarity: info?.rarity ?? 'common' });
  st.runeCollectibles.push(relic); return relic;
}
// A relic out of the shared pool at a spot (a destroyed crate, a central event).
export function spawnPoolRelic(game, x, z, { source = 'crate', minRarity = null } = {}) {
  const st = game.modeState; const a = st?.arena; if (!a || !a.pool.length) return null;
  const pick = pickFromPool(a.pool, Math.random, { minRarity, exclude: onField(st), rules: a.rules }); if (!pick) return null;
  const relic = spawnRelic(game, pick.runeId, x, z, { source });
  if (relic && source === 'event') { combat.spawnShockwave?.(x, groundYForDepth(z) - 16, 90, runeOf(pick.runeId)?.color ?? '#ffd740'); combat.shakeCamera?.(5, .25); audio.playImpact?.(true); }
  return relic;
}
// Destructible arena objects (environment.breakProp calls this): every crate and barrel gives up a relic.
export function arenaPropBroken(game, prop) {
  if (!arenaOn(game) || !prop) return false;
  const jitter = (Math.random() - .5) * 24;
  return !!spawnPoolRelic(game, Math.max(120, Math.min(900, prop.x + jitter)), prop.z, { source: 'crate' });
}

// ── cards of the player ───────────────────────────────────────────────────────────────────────────────────────────────
function giveCard(game, runeId) {
  const P = game.player; const rune = runeOf(runeId); if (!rune) return null;
  const card = P.makeRuneCard(rune); P.runeDeck.push(card); P.drawRunesToHand(); return card;
}
// A card leaves the player (replaced, knocked out): hand, deck and a prepared spell slot are all cleaned.
function takeCardAway(game, cardId) {
  const P = game.player;
  P.runeHand = P.runeHand.filter((c) => c.cardId !== cardId);
  P.runeDeck = P.runeDeck.filter((c) => c.cardId !== cardId);
  const slot = P.slottedSpells.find((s) => s.runes.some((r) => r.cardId === cardId));
  if (slot) {
    const rest = slot.runes.filter((r) => r.cardId !== cardId);
    game.removeSlots([slot]);
    for (const r of rest) { P.runeDeck.push(r); } /* a broken fusion gives its other runes back as cards */
    P.drawRunesToHand();
  }
}
const liveCards = (P) => new Set([...P.runeHand, ...P.runeDeck, ...P.slottedSpells.flatMap((s) => s.runes)].map((c) => c.cardId));
// The player's inventory follows the cards: a committed cast, a fusion that lost runes, a recast — whatever removed the
// cards from every place also empties their slots (interrupted casts remove nothing, so nothing is lost).
export function syncArenaInventory(game) {
  const P = game.player; if (!P?.arenaInv) return 0;
  return P.arenaInv.retain(liveCards(P)).length;
}
export function arenaSelectedCardId(game) {
  const P = game.player; return P.slottedSpells?.[P.selectedSpellIndex]?.runes?.[0]?.cardId ?? null;
}

// ── collecting ────────────────────────────────────────────────────────────────────────────────────────────────────────
function collect(game, fighter, relic) {
  const inv = fighter.arenaInv; const player = fighter === game.player;
  if (player) {
    const card = giveCard(game, relic.runeId); if (!card) return false;
    inv.collect(relic.runeId, card.cardId);
    game.showAnnouncement?.(`${nameOf(relic.runeId)} AUFGENOMMEN`, 1.1);
  } else {
    inv.collect(relic.runeId); fighter.setDeck(inv.runeIds()); fighter.spellCooldown = Math.min(fighter.spellCooldown, .5);
    game.showAnnouncement?.(`GEGNER HOLT ${nameOf(relic.runeId)}`, 1.1);
  }
  audio.playRuneChime?.(640); combat.spawnShockwave?.(fighter.x, fighter.y - 30, 40, runeOf(relic.runeId)?.color ?? '#fff');
  return true;
}
function replaceWith(game, fighter, relic) {
  const inv = fighter.arenaInv; const player = fighter === game.player;
  let card = null; if (player) { card = giveCard(game, relic.runeId); if (!card) return false; }
  const res = inv.replace(relic.runeId, card?.cardId ?? null, player ? arenaSelectedCardId(game) : null);
  if (res.ejected) {
    if (player) takeCardAway(game, res.ejected.cardId); else fighter.setDeck(inv.runeIds());
    spawnRelic(game, res.ejected.runeId, fighter.x + (fighter.facing || 1) * 24, fighter.z, { source: 'replaced' });
  }
  game.showAnnouncement?.(`${player ? '' : 'GEGNER: '}${nameOf(relic.runeId)} ERSETZT ${res.ejected ? nameOf(res.ejected.runeId) : ''}`, 1.2);
  return true;
}

// ── heavy-hit ejection and KO ─────────────────────────────────────────────────────────────────────────────────────────
// A fully charged heavy, a heavy counter or a guard break knocks out AT MOST ONE rune; it lands as a neutral relic.
export function arenaEjectRune(game, victim, attacker = null) {
  if (!arenaOn(game) || !victim?.arenaInv) return false;
  const player = victim === game.player;
  const entry = victim.arenaInv.eject(player ? arenaSelectedCardId(game) : null); if (!entry) return false;
  if (player) takeCardAway(game, entry.cardId); else victim.setDeck(victim.arenaInv.runeIds());
  const dir = attacker ? Math.sign(victim.x - attacker.x) || 1 : (victim.facing ? -victim.facing : 1);
  spawnRelic(game, entry.runeId, victim.x + dir * 34, victim.z, { source: 'ejected' });
  combat.spawnHitSparks?.(victim.x, victim.y - 34, dir, runeOf(entry.runeId)?.color ?? '#fff', 18);
  combat.spawnShockwave?.(victim.x, victim.y - 30, 56, runeOf(entry.runeId)?.color ?? '#ffd740');
  audio.playRuneFail?.();
  game.showAnnouncement?.(`${player ? 'DU VERLIERST' : 'GEGNER VERLIERT'}: ${nameOf(entry.runeId)}`, 1.3);
  return true;
}
// Losing a soul spark is a KO: every carried rune is cleared — not dropped, not given to the winner (the shared pool
// simply keeps offering it).
export function arenaClearSlots(game, fighter) {
  if (!arenaOn(game) || !fighter?.arenaInv) return 0;
  const gone = fighter.arenaInv.clear();
  if (fighter === game.player) {
    const P = fighter; P.runeHand = []; P.runeDeck = []; P.preparedRunes = [];
    if (P.slottedSpells.length) game.removeSlots([...P.slottedSpells]);
    game.targeting?.cancel?.();
  } else fighter.setDeck([]);
  if (gone.length) game.showAnnouncement?.(`${fighter === game.player ? 'DEINE' : 'ALLE'} RUNEN GEHEN VERLOREN`, 1.4);
  return gone.length;
}

// ── per frame ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export function updateArenaRunes(game, dt) {
  const st = game.modeState; const a = st?.arena; if (game.activeMode?.id !== 'arena' || !a) return;
  const relics = st.runeCollectibles; tickRelics(relics, dt);
  for (const f of fightersOf(game)) f.arenaInv?.tick(dt);
  syncArenaInventory(game);
  const P = game.player; const E = game.enemyChampion;
  // Spawn director: breakable crates come back now and then, announced central events, and no dry match.
  a.crateTimer -= dt;
  if (a.crateTimer <= 0) {
    a.crateTimer = 13 + Math.random() * 5;
    if (environment.livingProps().filter((p) => p.kind === 'crate' || p.kind === 'barrel').length < 3) {
      const spot = SPOTS[Math.floor(Math.random() * SPOTS.length)];
      if (!relics.some((r) => Math.abs(r.x - spot.x) < 40 && Math.abs(r.z - spot.z) < .1)) environment.addProp('crate', spot.x, spot.z);
    }
  }
  const bothEmpty = !P?.arenaInv?.count && !E?.arenaInv?.count;
  a.dryTimer = bothEmpty && !relics.length ? a.dryTimer + dt : 0;
  if (a.dryTimer > DRY_AFTER && !a.event) { a.eventTimer = Math.min(a.eventTimer, 0); a.dryTimer = 0; }
  if (!a.event) {
    a.eventTimer -= dt;
    if (a.eventTimer <= 0 && relics.length < MAX_RELICS) { a.event = { t: EVENT_TELEGRAPH, x: CENTRE.x, z: CENTRE.z }; game.showAnnouncement?.('EVENT: RELIKT ERSCHEINT IN DER MITTE', 1.6); audio.playRuneChime?.(300); }
  } else {
    a.event.t -= dt;
    if (a.event.t <= 0) { spawnPoolRelic(game, a.event.x, a.event.z, { source: 'event', minRarity: 'rare' }); a.event = null; a.eventTimer = EVENT_EVERY + Math.random() * 6; }
  }
  // Collecting: close enough and the bounce is over. A free slot takes the rune; with full slots the fighter must stay
  // on the relic for the replace hold. Both fighters follow the same code.
  for (const f of fightersOf(game)) {
    const inv = f.arenaInv; if (!inv) continue;
    if (!f.isAlive) { inv.releaseHold(); continue; }
    const relic = relics.find((r) => relicCollectible(r) && dist(f, r) <= PICKUP_RANGE);
    if (!relic) { inv.releaseHold(); continue; }
    if (!inv.full) { if (collect(game, f, relic)) relics.splice(relics.indexOf(relic), 1); continue; }
    if (inv.holdOn(relic.id, dt) && replaceWith(game, f, relic)) { relics.splice(relics.indexOf(relic), 1); inv.releaseHold(); }
  }
}

// ── drawing ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const RARITY_RING = Object.freeze({ common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 });
export function renderArenaRelics(ctx, game) {
  const st = game.modeState; const a = st?.arena; if (game.activeMode?.id !== 'arena' || !a) return;
  const t = performance.now() * .005;
  ctx.save(); ctx.textAlign = 'center';
  // The announced central event: a rising ring on the floor.
  if (a.event) {
    const y = groundYForDepth(a.event.z); const k = 1 - Math.max(0, a.event.t) / EVENT_TELEGRAPH;
    ctx.strokeStyle = `rgba(255,215,64,${.35 + .4 * k})`; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(a.event.x, y, 26 + i * 12 + 18 * (1 - k), 8 + i * 3, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = `rgba(255,236,150,${.15 + .35 * k})`; ctx.fillRect(a.event.x - 3, y - 120 * k, 6, 120 * k);
  }
  for (const relic of st.runeCollectibles) {
    const rune = runeOf(relic.runeId); const col = rune?.color ?? '#8cf'; const ring = RARITY_RING[relic.rarity] ?? 0;
    const p = relic.lock > 0 ? 1 - relic.lock / a.rules.bounceLock : 1;
    const hop = relic.lock > 0 ? Math.sin(Math.PI * p) * 34 : Math.sin(t + relic.x) * 3;
    const y = groundYForDepth(relic.z) - 18 - hop; const live = relic.lock <= 0;
    ctx.globalAlpha = live ? 1 : .55 + .25 * Math.sin(t * 6);
    for (let i = 0; i < ring; i++) { ctx.strokeStyle = col; ctx.globalAlpha *= .8; ctx.beginPath(); ctx.arc(relic.x, y, 17 + i * 4 + Math.sin(t + i) * 1.5, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = live ? 1 : .55 + .25 * Math.sin(t * 6);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(relic.x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#07101c'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText(rune?.symbol ?? rune?.glyph ?? '✦', relic.x, y + 5);
    ctx.globalAlpha = 1;
  }
  // Each fighter's carried runes as three pips above the head, and the replace hold as a ring.
  for (const f of fightersOf(game)) {
    const inv = f.arenaInv; if (!inv || !f.isAlive) continue;
    const ry = f.y - 118;
    inv.slots.forEach((e, i) => {
      const x = f.x + (i - 1) * 11; ctx.fillStyle = e ? (runeOf(e.runeId)?.color ?? '#fff') : 'rgba(10,8,16,.7)';
      ctx.fillRect(Math.round(x - 4), Math.round(ry), 8, 8); ctx.strokeStyle = e ? '#fff' : '#3a3048'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x - 4) + .5, Math.round(ry) + .5, 8, 8);
    });
    const prog = inv.holdProgress();
    if (prog > 0) { ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y - 40, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog); ctx.stroke(); }
  }
  ctx.restore();
}
