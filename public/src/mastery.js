// GRIMGE Prototype — modular Mastery system (GDD "Modulares Runen-, Mastery- und
// Build-System", 20 Oct 2026), adapted to what GRIMGE already has:
//   • Base runes = ignis, aqua, ventus, fulgur, terra, natura, lux, umbra, void,
//     construct, bestia. ICE is not a rune here (frost comes from water / wind
//     fusions) and WARD is not a rune: Ward = the shield principle (Arcane Aegis
//     and every shield recipe) — its tree applies to every shield.
//   • Each tree has branches with four tiers (I base, II stronger, III new
//     interaction, IV build-defining). Tiers cost skill points; III / IV need the
//     rune to be levelled through use (rune XP) — like the GDD's "Verwendung".
//   • HP, Mana and Focus stay the only global resources; masteries only change
//     parameters of concrete effects (shield capacity, chain jumps, heal per hit …).
//   • Effects run on combat EVENTS (hit, shield hit, combo, shield end) with a
//     root id, generation depth and a proc budget — no endless loops, no
//     effect profits twice from the same hit, heal / shield extension are capped.
// The reference builds (Witcher Quen "Lebenssturm-Wächter", Exiled Knight
// "Gefallener Koloss") come out of these general rules — no build-specific code.
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { applyStatus, hasStatus, setStatusSource, setStatusHooks, getStatusSource } from './status_effects.js';
import { masteryTier as tierOf } from './mastery_data.js';
export { MASTERY_TREES, MASTERY_NODE_IDS, masteryRune, masteryNode, masteryRequirement, masteryTier, analyzeBuild } from './mastery_data.js';

const DEPTH_PX = 150;
export const PROC = Object.freeze({ maxDepth: 3, budget: 14, healPerSecond: 14, shieldMaxLife: 12 });

// ── helpers ──
const nowS = () => (globalThis.performance?.now?.() ?? Date.now()) / 1000;
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;
const gw = () => globalThis.window?.gameWorld;
function foesNear(attacker, x, z, r, except = new Set()) {
  return (gw()?.getHostileTargets?.(attacker.team) ?? []).filter((o) => alive(o) && !except.has(o) && !o.isObjective && !o.isProp && !o.isStoneWall && !o.isCastle && Math.hypot(o.x - x, ((o.z ?? z) - z) * DEPTH_PX) < r);
}
// Visual arc (lightning / leech) between two points, drawn by a short-lived spell.
let sink = null; export const setMasterySink = (s) => { sink = s; };
class ArcFx {
  constructor(a, b, color, kind) { this.ax = a.x; this.az = a.z ?? .5; this.ay = (a.y ?? groundYForDepth(this.az)) - 40; this.bx = b.x; this.bz = b.z ?? .5; this.by = (b.y ?? groundYForDepth(this.bz)) - 40; this.color = color; this.kind = kind; this.t = 0; this.isFinished = false; }
  update(dt) { this.t += dt; if (this.t > .25) this.isFinished = true; }
  render(ctx) {
    const a = 1 - this.t / .25; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = this.color; ctx.lineWidth = this.kind === 'leech' ? 2 : 3; ctx.beginPath();
    const n = 6; for (let i = 0; i <= n; i++) { const u = i / n; const x = this.ax + (this.bx - this.ax) * u; const y = this.ay + (this.by - this.ay) * u + (this.kind === 'leech' ? Math.sin(u * Math.PI) * -18 : (i % 2 ? -1 : 1) * (i && i < n ? 7 : 0)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
}
const arc = (a, b, color, kind = 'bolt') => sink?.addSpell?.(new ArcFx(a, b, color, kind), 'B');

// ── event context (root id, depth, budget) ──
let current = null; let rootSeq = 0;
function inEvent(fn) {
  const outer = current; if (!outer) current = { root: ++rootSeq, depth: 0, budget: PROC.budget, extended: 0 };
  try { return fn(current); } finally { if (!outer) current = null; }
}
// Deal a follow-up hit (chain jump, retaliation, discharge) one generation deeper.
function followUp(target, damage, attacker, tags, flags, kx = 0) {
  if (!current || current.depth >= PROC.maxDepth || current.budget <= 0) return false;
  current.budget--; current.depth++;
  const prev = setStatusSource({ team: attacker.team, statusElements: tags, castBy: attacker, procFlags: flags, statusChance: .5 });
  try { target.takeDamage?.(Math.max(1, Math.round(damage)), kx, 0, .15, false, 'spell'); }
  finally { setStatusSource(prev); current.depth--; }
  return true;
}
export const attackerOf = (source) => source?.castBy ?? source?.owner ?? source?.caster ?? null;

// ── HIT (called from every takeDamage via status_effects.onStatusHit) ─────
const healLog = new WeakMap();
function heal(actor, amount) {
  if (!(amount > 0) || !Number.isFinite(actor.hp)) return 0;
  const log = (healLog.get(actor) ?? []).filter((e) => nowS() - e.t < 1); const used = log.reduce((s, e) => s + e.a, 0);
  const a = Math.min(amount, PROC.healPerSecond - used); if (a <= 0) { healLog.set(actor, log); return 0; }
  actor.hp = Math.min(actor.maxHp ?? actor.hp, actor.hp + a); log.push({ t: nowS(), a }); healLog.set(actor, log);
  return a;
}
// Clears the per-actor mastery clocks (heal window, internal cooldowns) — tests / respawn.
export function resetMasteryRuntime(actor) { healLog.delete(actor); for (const k of ['_retaliateAt', '_purifyAt', '_dischargeAt']) actor[k] = -9; actor._instinct = 0; }
export function masteryOnHit(target, amount, hitKind, source) {
  const attacker = attackerOf(source);
  if (!attacker?.masteries?.size || !(amount > 0) || target === attacker) return;
  const tags = source.statusElements ?? []; const flags = source.procFlags ?? {};
  inEvent((ev) => {
    const has = (el) => tags.includes(el);
    // Ignis · Brand
    const burn = tierOf(attacker, 'ignis', 'burn');
    if (burn && has('ignis')) {
      const cur = target.statuses?.burn;
      if (cur && !cur.isFinished && burn >= 4) cur.dur = Math.min(cur.t + 8, cur.dur + 1);
      else if (!hasStatus(target, 'burn')) { applyStatus(target, 'burn', { force: true, quiet: true, duration: burn >= 2 ? 4.5 : 3 }); if (burn >= 3 && ev.depth === 0) for (const o of foesNear(attacker, target.x, target.z, 90, new Set([target])).slice(0, 1)) applyStatus(o, 'burn', { force: true, quiet: true }); }
    }
    // Aqua · Durchnässen
    const soak = tierOf(attacker, 'aqua', 'soak');
    if (soak && has('aqua')) {
      applyStatus(target, 'wet', { quiet: true, duration: soak >= 2 ? 7.5 : 5 });
      if (soak >= 4 && ev.depth === 0) for (const o of foesNear(attacker, target.x, target.z, 80, new Set([target]))) applyStatus(o, 'wet', { quiet: true });
    }
    // Fulgur · Kette (not from a chain jump; retaliations / discharges need their tier IV).
    const chain = tierOf(attacker, 'fulgur', 'chain');
    const chainAllowed = !flags.chain && (!flags.retaliation || tierOf(attacker, 'ward', 'retaliate') >= 4) && (!flags.discharge || tierOf(attacker, 'fulgur', 'discharge') >= 4);
    if (chain && has('fulgur') && chainAllowed) {
      const jumps = chain >= 4 ? 3 : chain >= 2 ? 2 : 1; const range = chain >= 2 ? 150 : 110; const keep = chain >= 4 ? .7 : .5;
      const hitSet = new Set([target]); let from = target; let dmg = amount;
      for (let j = 0; j < jumps; j++) {
        let pool = foesNear(attacker, from.x, from.z, range, hitSet);
        if (chain >= 3) pool.sort((a, b) => (hasStatus(b, 'wet') ? 1 : 0) - (hasStatus(a, 'wet') ? 1 : 0) || Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z));
        else pool.sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z));
        const next = pool[0]; if (!next) break;
        dmg *= keep; hitSet.add(next); arc(from, next, '#fff59d');
        if (!followUp(next, dmg, attacker, tags, { ...flags, chain: true })) break;
        from = next;
      }
    }
    // Natura · Lebensentzug (follow-up hits need tier IV, retaliations need Ward Vergeltung IV).
    const leech = tierOf(attacker, 'natura', 'leech');
    const leechAllowed = (ev.depth === 0 || leech >= 4) && (!flags.retaliation || tierOf(attacker, 'ward', 'retaliate') >= 4);
    if (leech && has('natura') && leechAllowed && hitKind !== 'status') {
      const base = leech >= 2 ? 3 : 2; const healed = heal(attacker, base * Math.pow(.6, ev.depth));
      if (healed > 0) arc(target, attacker, '#9ccc65', 'leech');
    }
    // Umbra · Opfer IV: shadow hits at low HP bite harder.
    if (tierOf(attacker, 'umbra', 'sacrifice') >= 4 && has('umbra') && attacker.hp / (attacker.maxHp || 1) < .3 && ev.depth === 0) followUp(target, amount * .25, attacker, [], { bonus: true });
    // Terra · Befestigen IV: a stored conversion burst lands on this hit.
    if (attacker.convertBonus > 0 && attacker.convertUntil > nowS() && !flags.bonus && ev.depth === 0) {
      const bonus = attacker.convertBonus; attacker.convertBonus = 0;
      followUp(target, bonus, attacker, attacker.convertTags ?? [], { bonus: true, conversion: true }, Math.sign(target.x - attacker.x || 1) * 300);
      combat.shakeCamera?.(10, .3); combat.spawnShockwave?.(target.x, (target.y ?? 0) - 30, 70, '#bcaaa4');
      if (tierOf(attacker, 'ignis', 'burn') >= 1) applyStatus(target, 'burn', { force: true, quiet: true });
      if (tierOf(attacker, 'ignis', 'burn') >= 3) for (const o of foesNear(attacker, target.x, target.z, 90, new Set([target]))) followUp(o, bonus * .4, attacker, ['ignis'], { bonus: true });
    }
    const once = ev.depth === 0 && !flags.bonus; // first-generation hit, not a mastery bonus
    // Ventus · Verdrängen: harder push, slow, foe-on-foe impact.
    const disp = tierOf(attacker, 'ventus', 'displace');
    if (disp && has('ventus') && once) {
      const dir = Math.sign(target.x - attacker.x) || 1;
      // Shift the position itself (many takeDamage implementations reset kbVelX after the hit).
      target.x += dir * (disp >= 2 ? 36 : 22); gw()?.battlefield?.placeOnSurface?.(target);
      if (disp >= 3) target.slow?.(1, .6);
      if (disp >= 4) { const o = foesNear(attacker, target.x + dir * 40, target.z, 55, new Set([target]))[0]; if (o) { followUp(o, amount * .25, attacker, [], { bonus: true }); followUp(target, amount * .25, attacker, [], { bonus: true }); } }
    }
    // Ventus · Ausbreiten: the wind carries the target's statuses to its neighbours.
    const spread = tierOf(attacker, 'ventus', 'spread');
    if (spread && has('ventus') && ev.depth === 0) {
      const kinds = ['burn', 'poison', 'bleed', ...(spread >= 3 ? ['wet', 'paralysis'] : [])].filter((k) => hasStatus(target, k));
      if (kinds.length) for (const o of foesNear(attacker, target.x, target.z, spread >= 2 ? 130 : 90, new Set([target])).slice(0, spread >= 2 ? 2 : 1)) {
        for (const k of kinds) { const src = target.statuses[k]; applyStatus(o, k, { force: true, quiet: true, duration: Math.max(.5, (src.dur - src.t) * (spread >= 4 ? 1 : .6)) }); }
        arc(target, o, '#b2ebf2', 'leech');
      }
    }
    // Lux · Segen: light hits build a small shield (and heal with IV).
    const bless = tierOf(attacker, 'lux', 'blessing');
    if (bless && has('lux') && once) {
      const cap = bless >= 2 ? 45 : 30; const add = bless >= 2 ? 5 : 3;
      if (!(attacker.arcaneShield > 0)) { attacker.arcaneShieldTimer = Math.max(attacker.arcaneShieldTimer ?? 0, 3); attacker.shieldTags = ['lux']; }
      attacker.arcaneShield = Math.max(attacker.arcaneShield ?? 0, Math.min(cap, (attacker.arcaneShield ?? 0) + add));
      if (bless >= 3) attacker.arcaneShieldTimer = Math.min(PROC.shieldMaxLife, attacker.arcaneShieldTimer + .3);
      if (bless >= 4) heal(attacker, 1.5);
    }
    // Lux · Reinigung: light hits cleanse you; III exposes afflicted foes.
    const pur = tierOf(attacker, 'lux', 'purify');
    if (pur && has('lux') && once) {
      if ((attacker._purifyAt ?? -9) < nowS() - 2) {
        const bad = ['burn', 'poison', 'bleed', 'paralysis', 'frozen'].find((k) => hasStatus(attacker, k));
        if (bad) {
          attacker.statuses[bad].end(); attacker._purifyAt = nowS();
          combat.spawnDamageText?.(attacker.x, (attacker.y ?? 0) - 90, 'GEREINIGT', { color: '#ffe082' });
          if (pur >= 2) heal(attacker, 5);
          if (pur >= 4) { combat.spawnShockwave?.(attacker.x, (attacker.y ?? 0) - 30, 100, '#ffe082'); for (const o of foesNear(attacker, attacker.x, attacker.z, 100)) followUp(o, 10, attacker, ['lux'], { bonus: true }); }
        }
      }
      if (pur >= 3 && ['burn', 'poison', 'bleed'].some((k) => hasStatus(target, k))) followUp(target, amount * .25, attacker, [], { bonus: true });
    }
    // Void · Kollaps: foes nearby are pulled toward the target.
    const col = tierOf(attacker, 'void', 'collapse');
    if (col && has('void') && once) {
      for (const o of foesNear(attacker, target.x, target.z, col >= 2 ? 150 : 110, new Set([target]))) {
        const pull = Math.min(col >= 2 ? 40 : 25, Math.abs(o.x - target.x));
        o.x += Math.sign(target.x - o.x) * pull; if (Number.isFinite(o.z)) o.z += ((target.z ?? o.z) - o.z) * .3;
        gw()?.battlefield?.placeOnSurface?.(o);
        arc(o, target, '#ce93d8', 'leech');
        if (col >= 3) followUp(o, 4, attacker, [], { bonus: true });
        if (col >= 4) o.slow?.(.8, .5);
      }
    }
    // Void · Annullieren: mana drain, shield tearing, silence.
    const nul = tierOf(attacker, 'void', 'nullify');
    if (nul && has('void') && once) {
      if (Number.isFinite(target.mp)) {
        const take = Math.min(target.mp, nul >= 2 ? 6 : 4); target.mp -= take;
        if (Number.isFinite(attacker.mp)) attacker.mp = Math.min(attacker.maxMp ?? attacker.mp, attacker.mp + take * .5);
        if (nul >= 4 && target.mp <= 0 && 'spellCooldown' in target) target.spellCooldown = Math.max(target.spellCooldown, 1.5);
      }
      if (nul >= 3 && target.arcaneShield > 0) target.arcaneShield = Math.max(0, target.arcaneShield - 15);
    }
    // Konstrukt · Schmieden: forged edges cut — bleeding, bonus on bleeding foes, spreading.
    const forge = tierOf(attacker, 'construct', 'forge');
    if (forge && has('construct')) {
      if (forge >= 3 && once && hasStatus(target, 'bleed')) followUp(target, amount * .2, attacker, [], { bonus: true });
      if (!hasStatus(target, 'bleed')) {
        applyStatus(target, 'bleed', { force: true, quiet: true, duration: forge >= 2 ? 5 : 3 });
        if (forge >= 4 && ev.depth === 0) for (const o of foesNear(attacker, target.x, target.z, 90, new Set([target])).slice(0, 1)) applyStatus(o, 'bleed', { force: true, quiet: true });
      }
    }
    // Bestia · Instinkt: every 4th (3rd) beast hit is critical.
    const inst = tierOf(attacker, 'bestia', 'instinct');
    if (inst && has('bestia') && once) {
      attacker._instinct = (attacker._instinct ?? 0) + 1;
      if (attacker._instinct >= (inst >= 2 ? 3 : 4)) {
        attacker._instinct = 0;
        followUp(target, amount * .5, attacker, [], { bonus: true });
        combat.spawnDamageText?.(target.x, (target.y ?? 0) - 80, 'KRITISCH!', { color: '#ffb74d', isCrit: true });
        if (inst >= 3) applyStatus(target, 'bleed', { force: true, quiet: true });
        if (inst >= 4) heal(attacker, 3);
      }
    }
    // Bestia · Rudel: a beast hit marks, your next other hit cashes the mark in.
    const pack = tierOf(attacker, 'bestia', 'pack');
    if (pack && once) {
      if (has('bestia')) { target.packMark = { by: attacker, until: nowS() + 3 }; if (pack >= 3) target.slow?.(3, .7); }
      else if (target.packMark?.by === attacker && target.packMark.until > nowS()) {
        target.packMark = null; followUp(target, amount * (pack >= 2 ? .3 : .2), attacker, [], { bonus: true });
        if (pack >= 4) heal(attacker, 3);
      }
    }
    // Ward · Aufrechterhalten II: your own hits extend the active shield a little.
    const sustain = tierOf(attacker, 'ward', 'sustain');
    if (sustain >= 2 && attacker.arcaneShield > 0 && attacker.arcaneShieldTimer > 0) {
      const per = .15; const cap = sustain >= 3 ? .25 : 1; // III: several targets of one event extend less (fair)
      const add = Math.max(0, Math.min(per, cap - ev.extended)); ev.extended += add;
      const lifeLeft = PROC.shieldMaxLife - (nowS() - (attacker.shieldStartedAt ?? nowS()));
      attacker.arcaneShieldTimer = Math.min(attacker.arcaneShieldTimer + add, Math.max(0, lifeLeft));
    }
  });
}
// Periodic damage of a status that the attacker applied (Leech III).
export function masteryOnDot(target, amount, owner) {
  if (!owner?.masteries?.size) return;
  if (tierOf(owner, 'natura', 'leech') >= 3) heal(owner, amount * .5);
}
// A status combo fired on a target (Discharge I).
export function masteryOnCombo(target, attacker, src = null) {
  const dis = tierOf(attacker, 'fulgur', 'discharge'); if (!dis || src?.procFlags?.discharge) return;
  const icd = dis >= 2 ? .3 : .6; if ((attacker._dischargeAt ?? -9) > nowS() - icd) return;
  attacker._dischargeAt = nowS();
  inEvent(() => { const o = foesNear(attacker, target.x, target.z, 120, new Set([target]))[0]; if (o) { arc(target, o, '#fff59d'); followUp(o, 8, attacker, ['fulgur'], { discharge: true }); } });
}

// ── WARD: shields ─────────────────────────────────────────────────────────
// Every shield goes through here: capacity / duration modifiers, HP sacrifice, transfer.
export function applyWard(actor, capacity, duration, tags = [], { sacrifice: baseSacrifice = 0 } = {}) {
  const absorb = tierOf(actor, 'ward', 'absorb'); const fortify = tierOf(actor, 'terra', 'fortify'); const sustain = tierOf(actor, 'ward', 'sustain'); const sacrifice = tierOf(actor, 'umbra', 'sacrifice');
  const durable = tierOf(actor, 'construct', 'durability');
  let cap = capacity * (1 + (absorb >= 2 ? .5 : absorb ? .25 : 0) + (fortify ? .2 : 0) + (durable >= 2 ? .2 : durable ? .1 : 0));
  let dur = duration * (sustain ? 1.3 : 1);
  // Sustain IV: a new shield takes over half of the old remaining duration.
  if (sustain >= 4 && actor.arcaneShield > 0) dur += (actor.arcaneShieldTimer ?? 0) * .5;
  // Umbra · Opfer: HP become shield capacity (an HP sacrifice is no enemy hit).
  actor.sacrificedHp = 0;
  if ((sacrifice || baseSacrifice) && Number.isFinite(actor.hp)) {
    const share = sacrifice >= 2 ? .2 : sacrifice ? .15 : baseSacrifice; const conv = sacrifice >= 2 ? 1.75 : 1.5;
    const paid = Math.floor(actor.hp * share);
    if (paid > 0 && actor.hp - paid >= 1) { actor.hp -= paid; actor.sacrificedHp = paid; cap += paid * conv; combat.spawnDamageText?.(actor.x, (actor.y ?? 0) - 70, `−${paid} HP → SCHILD`, { color: '#b39ddb' }); }
  }
  actor.arcaneShield = Math.round(cap); actor.arcaneShieldTimer = Math.min(dur, PROC.shieldMaxLife);
  actor.shieldTags = [...new Set(tags)]; actor.shieldStartedAt = nowS(); actor.shieldWatch = true; actor.shieldCapacity = actor.arcaneShield; actor.shieldRebuilt = false;
  return actor.arcaneShield;
}
// Called when the shield absorbs (part of) a hit: Absorb III charge, retaliation, Fortify III.
export function masteryOnShieldHit(actor, absorbed, attacker, hitKind) {
  if (!actor?.masteries?.size || !(absorbed > 0) || hitKind === 'status' || hitKind === 'hazard') return;
  const absorb = tierOf(actor, 'ward', 'absorb'); const ret = tierOf(actor, 'ward', 'retaliate'); const dis = tierOf(actor, 'fulgur', 'discharge');
  if (absorb >= 3) actor.wardCharge = Math.min(60, (actor.wardCharge ?? 0) + absorbed * .5);
  // Konstrukt · Haltbarkeit III: a broken shield rebuilds once at 25 %.
  if (!(actor.arcaneShield > 0) && actor.shieldWatch && !actor.shieldRebuilt && tierOf(actor, 'construct', 'durability') >= 3 && actor.shieldCapacity > 0) {
    actor.shieldRebuilt = true; actor.arcaneShield = Math.round(actor.shieldCapacity * .25); actor.arcaneShieldTimer = 2.5;
    combat.spawnShockwave?.(actor.x, (actor.y ?? 0) - 34, 40, '#b0bec5');
  }
  // Terra · Befestigen III: a melee attacker bounces off the shield (stability pulse).
  if (tierOf(actor, 'terra', 'fortify') >= 3 && attacker && hitKind === 'melee' && attacker.team !== actor.team) {
    const dir = Math.sign(attacker.x - actor.x) || 1;
    if ('kbVelX' in attacker) attacker.kbVelX = dir * 260; else attacker.x += dir * 30;
    combat.spawnShockwave?.(actor.x + dir * 24, (actor.y ?? 0) - 36, 30, '#bcaaa4');
  }
  if (!ret && dis < 3) return;
  if ((actor._retaliateAt ?? -9) > nowS() - .3) return; // internal cooldown
  actor._retaliateAt = nowS();
  inEvent(() => {
    // Tags: the shield's tags with Vergeltung III; electric with Entladung III.
    const tags = new Set(); if (ret >= 3) for (const t of actor.shieldTags ?? []) tags.add(t); if (dis >= 3) tags.add('fulgur');
    const dmg = 6 + absorbed * .25;
    const targets = new Set();
    if (attacker && alive(attacker) && attacker.team !== actor.team) targets.add(attacker);
    else { const n = foesNear(actor, actor.x, actor.z, 120)[0]; if (n) targets.add(n); }
    if (ret >= 2) for (const o of foesNear(actor, actor.x, actor.z, 70)) targets.add(o);
    for (const t of targets) { arc(actor, t, tags.has('fulgur') ? '#fff59d' : '#b388ff'); followUp(t, dmg, actor, [...tags], { retaliation: true }, Math.sign(t.x - actor.x || 1) * 120); }
  });
}
// Per-frame: shield end effects (Absorb IV shockwave, Opfer III refund).
export function masteryTickShield(actor) {
  if (!actor?.shieldWatch) return;
  if (actor.arcaneShield > 0 && actor.arcaneShieldTimer > 0) return;
  actor.shieldWatch = false;
  const left = Math.max(0, actor.arcaneShield ?? 0);
  if (left > 0) {
    if (tierOf(actor, 'ward', 'absorb') >= 4 && left > 0) inEvent(() => { for (const o of foesNear(actor, actor.x, actor.z, 110)) followUp(o, left * .5, actor, actor.shieldTags ?? [], { bonus: true }, Math.sign(o.x - actor.x || 1) * 220); combat.spawnShockwave?.(actor.x, (actor.y ?? 0) - 30, 110, '#b388ff'); });
    if (tierOf(actor, 'umbra', 'sacrifice') >= 3 && actor.sacrificedHp > 0) actor.hp = Math.min(actor.maxHp, actor.hp + Math.round(actor.sacrificedHp * .3));
    if (tierOf(actor, 'construct', 'durability') >= 4 && Number.isFinite(actor.mp)) actor.mp = Math.min(actor.maxMp ?? actor.mp, actor.mp + 15);
  }
  actor.sacrificedHp = 0;
}
// A charged attack is released: Terra · Befestigen IV converts the shield into the
// next hit, Ward · Absorbieren III adds the stored reaction to it.
export function masteryChargedRelease(actor) {
  if (!actor?.masteries?.size) return 0;
  let bonus = 0; const tags = new Set(actor.shieldTags ?? []);
  if (tierOf(actor, 'terra', 'fortify') >= 4 && actor.arcaneShield > 0) {
    bonus += actor.arcaneShield * .8; tags.add('terra');
    actor.arcaneShield = 0; actor.arcaneShieldTimer = 0; actor.shieldWatch = false; actor.sacrificedHp = 0;
    combat.spawnShockwave?.(actor.x, (actor.y ?? 0) - 36, 60, '#bcaaa4');
    combat.spawnDamageText?.(actor.x, (actor.y ?? 0) - 80, 'SCHILD → WUCHT', { color: '#bcaaa4', isCrit: true });
  }
  if (actor.wardCharge > 0) { bonus += actor.wardCharge; actor.wardCharge = 0; }
  if (!(bonus > 0)) return 0;
  actor.convertBonus = Math.round(bonus); actor.convertUntil = nowS() + .9; actor.convertTags = [...tags];
  return actor.convertBonus;
}
// Ward · Absorbieren III: a perfect block releases the stored reaction.
export function masteryPerfectBlock(actor, attacker = null) {
  if (!(actor?.wardCharge > 0)) return 0;
  if (!alive(attacker) || attacker.team === actor.team) attacker = foesNear(actor, actor.x, actor.z, 320)[0];
  if (!attacker) return 0;
  const dmg = actor.wardCharge + (actor.arcaneShield ?? 0) * .3; actor.wardCharge = 0;
  inEvent(() => followUp(attacker, dmg, actor, actor.shieldTags ?? [], { bonus: true, counter: true }, Math.sign(attacker.x - actor.x || 1) * 320));
  return dmg;
}


// The attacker behind the hit currently being resolved (spell / melee status source).
export const currentAttacker = () => attackerOf(getStatusSource());
setStatusHooks({ onHit: masteryOnHit, onDot: masteryOnDot, onCombo: masteryOnCombo });
