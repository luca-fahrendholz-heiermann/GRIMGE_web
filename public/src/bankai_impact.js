// GRIMGE Prototype — Bankai ground impact (user spec 16 Nov 2026). The fully charged DOWN technique of a Bankai becomes
// one big commitment: the weapon (a staff, a spear crown, tower shields, a titanic axe …) is driven into the ground, the
// material is drawn in, then an eruption breaks out around the caster, a ring races outward and an element-specific
// aftermath stays. The CLASS decides the prop and silhouette (bankai_arsenal.js passes its painters in), the ELEMENT
// decides the material behaviour: damage, status, ground, knock-up / pull, ally effects.
//   0.00–0.35 s commitment and ground contact (the caster is locked)   0.35–0.65 s the material is drawn in (charge)
//   0.65–0.95 s main eruption — the ONE main hit and the ONE hitstop   0.95–1.35 s expanding ring (status only, no damage)
//   1.35–2.50 s element aftermath (ticks without hitstop)
// Gameplay is data (ELEMENT_IMPACT) and deterministic; the render functions only draw.
import { SigSequence, foesOf, hit, massOf, groundDist, DEPTH } from './signature_core.js';
import { plate, TAU, lerp, clamp01, ease, groundRing } from './buff_v32_kit.js';
import { bankaiStyleOf } from './bankai.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { environment } from './environment.js';
import { applyStatus } from './status_effects.js';
import { groundYForDepth } from './world.js';

export const IMPACT = Object.freeze({ commit: .35, charge: .65, impact: .95, expand: 1.35, end: 2.5, R: 132, ringR: 205, pullR: 190, damage: 78, knock: 380, lift: 190, stun: .6, hitstop: 8, shake: 16, tickEvery: .5 });

// ── elements ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const ELEMENT_OF_RUNE = Object.freeze({ ignis: 'fire', terra: 'earth', aqua: 'water', frost: 'ice', fulgur: 'lightning', ventus: 'wind', natura: 'nature', lux: 'light', ward: 'light', umbra: 'shadow', void: 'shadow', bestia: 'beast', construct: 'construct' });
export const impactGroupOf = (runeId) => ELEMENT_OF_RUNE[runeId] ?? 'arcane';
// kx: knock multiplier (negative = inward, the foe is pulled into the centre); lift: launch multiplier; status: applied to
// every foe of the main hit; ring: applied to foes the expanding ring passes (no damage); env: ground effects
// [type, radius factor, life]; regen / ward: what allies get; feed: the element scene objects are fed with.
export const ELEMENT_IMPACT = Object.freeze({
  fire: Object.freeze({ label: 'FEUER', look: 'column', pal: ['#2a0a05', '#ff5a1f', '#ffd24a', '#fff4c2'], dmg: 1, kx: 1, lift: 1, status: 'burn', ring: 'burn', env: [['scorch', .95, 3.6]], feed: 'ignis' }),
  earth: Object.freeze({ label: 'ERDE', look: 'spikes', shape: 'plate', pal: ['#2b2118', '#7a5a3a', '#cdb08a', '#f3e2c4'], dmg: 1, kx: .8, lift: 1.7, status: null, ring: 'slow', env: [['rubble', .9, 4], ['crater', .5, 5]], feed: 'terra' }),
  water: Object.freeze({ label: 'WASSER', look: 'vortex', pal: ['#06223a', '#1f78c8', '#7fd0ff', '#e6f7ff'], dmg: .9, kx: 1.35, lift: .8, status: 'wet', ring: 'wet', env: [['water', .9, 7]], feed: 'aqua' }),
  ice: Object.freeze({ label: 'EIS', look: 'spikes', shape: 'crystal', pal: ['#0a2b3a', '#4fb3d9', '#bdeeff', '#ffffff'], dmg: .9, kx: .5, lift: .9, status: 'frozen', ring: 'slow', env: [['ice', .9, 7]], feed: 'frost' }),
  lightning: Object.freeze({ label: 'BLITZ', look: 'arcs', pal: ['#161433', '#6a5cff', '#fff176', '#ffffff'], dmg: 1, kx: .6, lift: 1, status: 'paralysis', ring: 'paralysis', env: [['scorch', .35, 1.8]], conduct: 1.25, feed: 'fulgur' }),
  wind: Object.freeze({ label: 'WIND', look: 'vortex', pal: ['#1c2a2a', '#7fbfae', '#d6fff0', '#ffffff'], dmg: .85, kx: 1.1, lift: 2.3, status: null, ring: 'slow', env: [], feed: 'ventus' }),
  nature: Object.freeze({ label: 'NATUR', look: 'spikes', shape: 'root', pal: ['#0e2410', '#2f8f3a', '#9be564', '#eaffc8'], dmg: .9, kx: .4, lift: .8, status: 'root', ring: 'root', env: [['rubble', .7, 4]], regen: 6, feed: 'natura' }),
  light: Object.freeze({ label: 'LICHT', look: 'column', pal: ['#3a3010', '#e8c040', '#fff1a8', '#ffffff'], dmg: .95, kx: .9, lift: 1.1, status: null, ring: 'slow', env: [], ward: 36, feed: 'lux' }),
  shadow: Object.freeze({ label: 'SCHATTEN', look: 'collapse', pal: ['#0d0618', '#4a2a8a', '#b388ff', '#f1e4ff'], dmg: 1, kx: -.9, lift: .7, status: null, ring: 'slow', env: [['crack', .8, 7]], feed: 'umbra' }),
  beast: Object.freeze({ label: 'BESTIE', look: 'claws', pal: ['#2a1608', '#a85a24', '#ffb066', '#fff0d8'], dmg: 1.05, kx: 1, lift: .9, status: 'bleed', ring: 'bleed', env: [['rubble', .6, 3]], feed: 'bestia' }),
  construct: Object.freeze({ label: 'KONSTRUKT', look: 'spikes', shape: 'block', pal: ['#1d242b', '#68788a', '#b6c8d8', '#f0f6ff'], dmg: 1, kx: 1.15, lift: 1.1, status: null, ring: 'slow', env: [['rubble', .8, 4]], feed: 'construct' }),
  arcane: Object.freeze({ label: 'ARKAN', look: 'shock', pal: ['#150a2e', '#5b2bd6', '#b98cff', '#f1e4ff'], dmg: .95, kx: 1, lift: 1, status: null, ring: 'slow', env: [['crack', .6, 5]], feed: 'void' })
});
export const IMPACT_ELEMENT_GROUPS = Object.freeze(Object.keys(ELEMENT_IMPACT));
// The element the impact takes: the last normal element rune cast while this Bankai runs, else the profile's start
// element (the player), else none (the arcane fallback).
export function impactElementFor(actor, gw) {
  // "During this Bankai": the element rune was cast while this very form object was running (no clock comparison —
  // slow motion and hitstop make game time and wall time drift apart).
  const last = actor?.lastElementCast; const form = actor?.buffForm;
  if (last?.id && form && last.form === form) return last.id;
  const start = gw?.profile?.character?.startElement;
  return actor && actor === gw?.player && start ? start : null;
}

// ── class props ───────────────────────────────────────────────────────────────────────────────────────────────────────
// The arsenal (bankai.js style.arsenal) decides what is driven into the ground; staffs and sigil families plant the staff.
const PROP_OF_ARSENAL = Object.freeze({ sigils: 'staff', lances: 'spear', bulwark: 'shield', colossus: 'axe', swordring: 'blades', swarm: 'blades', archer: 'arrow', fists: 'fists', deck: 'seal', crescent: 'scythe', shadow: 'daggers' });
export const propOfStyle = (style) => PROP_OF_ARSENAL[style?.arsenal] ?? 'blades';
export const PROP_NAME = Object.freeze({ staff: 'STABRAMME', spear: 'SPEERKRONE', shield: 'SCHILDRING', axe: 'ERDBRECHER', blades: 'KLINGENSTURZ', arrow: 'STERNENPFEIL', fists: 'FAUSTSCHLAG', seal: 'SIEGELSETZUNG', scythe: 'SENSENSTURZ', daggers: 'DOLCHFÄCHER' });
export const impactName = (actor, gw = globalThis.window?.gameWorld) => `${PROP_NAME[propOfStyle(bankaiStyleOf(actor))]} · ${ELEMENT_IMPACT[impactGroupOf(impactElementFor(actor, gw))].label}`;

// ── the sequence ──────────────────────────────────────────────────────────────────────────────────────────────────────
const ownerLock = (p) => { p.vx = 0; p.vz = 0; if (p.state !== 'hurt') { p.state = 'heavyStrike'; p.stateTimer = .12; } };
class BankaiImpact extends SigSequence {
  constructor(caster, style, items, runeId, gw) {
    const group = impactGroupOf(runeId); const prof = ELEMENT_IMPACT[group];
    super({ mat: style.mat, seed: 12000 + group.length * 17 }, caster, { dur: IMPACT.end });
    this.seed = 12000 + group.length * 17; /* the painters and the cosmetic noise read it */
    this.style = style; this.items = items; this.group = group; this.prof = prof; this.runeId = runeId; this.prop = propOfStyle(style);
    this.power = caster.buffForm?.power ?? 1; this.mainHits = 0; this.hitstops = 0; this.impacted = false; this.ringed = new Set(); this.tickT = 0; this.rooted = new Set();
    this.R = IMPACT.R; this.wet = false;
  }
  get phase() { const t = this.t; return t < IMPACT.commit ? 'commit' : t < IMPACT.charge ? 'charge' : t < IMPACT.impact ? 'impact' : t < IMPACT.expand ? 'ring' : 'aftermath'; }
  update(dt, gw) {
    const p = this.caster; const before = this.t;
    if (this.t < IMPACT.impact && p?.isAlive !== false) ownerLock(p);
    // The charge draws foes in a little (shadow: a lot, via its inward knock at the eruption).
    if (this.t >= IMPACT.commit && this.t < IMPACT.charge) for (const f of foesOf(gw, this.team)) { const d = groundDist(f, this); if (d > IMPACT.pullR || d < 4) continue; const step = Math.min(d, 60 * massOf(f) * dt); f.x += (this.x - f.x) / d * step; }
    super.update(dt, gw);
    if (!this.impacted && this.t >= IMPACT.charge) { this.impacted = true; this.eruption(gw); }
    if (this.t >= IMPACT.impact && this.t < IMPACT.expand) this.ring(gw);
    if (before < IMPACT.expand && this.t >= IMPACT.expand) this.aftermathStart(gw);
    if (this.t >= IMPACT.expand) { this.tickT -= dt; if (this.tickT <= 0) { this.tickT = IMPACT.tickEvery; this.aftermathTick(gw); } }
  }
  // The main eruption: damage, status, knock — once; one hitstop; objects and ground.
  eruption(gw) {
    const prof = this.prof; const reach = this.R * (prof.conduct && environment.effectsAt?.(this.x, this.z, 'water')?.length ? prof.conduct : 1);
    for (const f of foesOf(gw, this.team)) {
      if (groundDist(f, this) > reach) continue;
      const dir = Math.sign(f.x - this.x) || this.facing;
      hit(f, IMPACT.damage * prof.dmg * this.power, dir * IMPACT.knock * prof.kx * massOf(f), IMPACT.lift * prof.lift * Math.max(.4, massOf(f)), IMPACT.stun);
      this.applyKind(f, prof.status, true); this.mainHits++;
      combat.spawnHitSparks?.(f.x, (f.y ?? this.y) - 36, dir, prof.pal[2], 14);
    }
    for (const o of environment.props) {
      if (o.isDead || Math.hypot(o.x - this.x, (o.z - this.z) * DEPTH) > this.R) continue;
      if (o.isSceneObject) o.feed?.(prof.feed, 24);
      o.takeDamage?.(30, (Math.sign(o.x - this.x) || 1) * 320, 0, 0, false, 'spell');
    }
    for (const [type, k, life] of prof.env) environment.add(type, this.x, this.z, { radius: this.R * k, life, team: this.team, ownerSafe: true });
    if (prof.ward) for (const a of this.allies(gw)) { a.arcaneShield = Math.max(a.arcaneShield ?? 0, prof.ward); a.arcaneShieldTimer = Math.max(a.arcaneShieldTimer ?? 0, 3.5); }
    combat.spawnShockwave?.(this.x, this.y - 8, this.R * 1.2, prof.pal[2]); combat.shakeCamera?.(IMPACT.shake, .6, this.facing); audio.playImpact?.(true);
    if (this.mainHits > 0) { this.hitstops = 1; combat.triggerHitstop?.(IMPACT.hitstop); }
  }
  // The ring passes foes once: status only, never damage (the main hit is the only one).
  ring(gw) {
    const k = clamp01((this.t - IMPACT.impact) / (IMPACT.expand - IMPACT.impact)); const r = lerp(this.R, IMPACT.ringR, k);
    for (const f of foesOf(gw, this.team)) { if (this.ringed.has(f) || groundDist(f, this) > r) continue; this.ringed.add(f); this.applyKind(f, this.prof.ring, false); }
  }
  aftermathStart(gw) { if (this.prof.look === 'collapse') combat.spawnShockwave?.(this.x, this.y - 6, this.R * 1.4, this.prof.pal[2]); }
  aftermathTick(gw) {
    const prof = this.prof;
    if (prof.regen) for (const a of this.allies(gw)) if (groundDist(a, this) <= this.R * 1.3 && a.hp > 0) a.hp = Math.min(a.maxHp ?? a.hp, a.hp + prof.regen * this.power);
    if (prof.status === 'root') for (const f of this.rooted) if (f.hp > 0 && this.t < IMPACT.expand + .6) f.slow?.(.6, .05);
  }
  allies(gw) {
    const list = []; for (const e of [gw?.player, gw?.enemyChampion]) if (e && e.team === this.team && e.isAlive !== false && !e.isDead) list.push(e);
    for (const m of gw?.minions ?? []) if (m.team === this.team && !m.isDead && !m.isTrainingDummy) list.push(m);
    return list;
  }
  applyKind(f, kind, main) {
    if (!kind) return;
    if (kind === 'root') { f.slow?.(2, .05); this.rooted.add(f); } else if (kind === 'slow') f.slow?.(1.4, .5);
    else if (kind === 'frozen') f.freeze?.(main ? 1.2 : .6); else applyStatus(f, kind, { force: true });
  }
  render(ctx) { drawImpact(ctx, this); }
}

// ── drawing ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
const rnd = (seed, n) => { const s = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); };
// The planted weapon: it plunges from above, lands at 0.35 s and stays until the aftermath ends.
function drawProp(ctx, s, al) {
  const y = groundYForDepth(s.z); const k = clamp01(s.t / IMPACT.commit); const drop = (1 - ease(k)) * 150; const m = s.mat; const A = s.items; const prop = s.prop; const L = 34;
  const draw = (item, x, yy, ang, size) => item?.(ctx, Math.round(x), Math.round(yy), ang, size, m, al, s.seed, s.style.weaponId);
  const x = s.x; const wob = s.t > IMPACT.commit && s.t < IMPACT.impact ? Math.sin(s.t * 60) * 1.2 : 0;
  switch (prop) {
    case 'staff': { const top = y - 104 - drop; plate(ctx, [[x - 2 + wob, top], [x + 2 + wob, top], [x + 3, y], [x - 3, y]], { ...m, body: m.dark, facet: m.vein, edge: m.vein }, s.seed, { alpha: al }); draw(A.sigil, x + wob, top - 10, s.t * 2, 18); break; }
    case 'spear': for (let i = 0; i < 6; i++) draw(A.spear, x + (i - 2.5) * 14, y - 26 - drop * (.7 + (i % 3) * .15), Math.PI / 2 + (i - 2.5) * .12, L * .9); break;
    case 'shield': for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; draw(A.shield, x + Math.cos(a) * 44, y + Math.sin(a) * 14 - 16 - drop, 0, 26); } break;
    case 'axe': draw(A.axe, x + wob, y - 34 - drop, Math.PI / 2 + .1, 40); break;
    case 'arrow': draw(A.arrow, x, y - 52 - drop, Math.PI / 2, 46); for (let i = 0; i < 4; i++) draw(A.arrow, x + (i - 1.5) * 26, y - 22 - drop * .8, Math.PI / 2 + (i - 1.5) * .08, 26); break;
    case 'fists': draw(A.fist, x - 22, y - 30 - drop, Math.PI / 2, 26); draw(A.fist, x + 22, y - 30 - drop * 1.2, Math.PI / 2, 26); break;
    case 'seal': draw(A.sigil, x, y - 14 - drop * .4, s.t * 2, 30); break;
    case 'scythe': draw(A.scythe, x + wob, y - 40 - drop, Math.PI / 2 - .25, 40); break;
    case 'daggers': for (let i = 0; i < 5; i++) draw(A.blade, x + (i - 2) * 16, y - 18 - drop - Math.abs(i - 2) * 4, Math.PI / 2 + (i - 2) * .18, 28); break;
    default: draw(A.greatsword, x + wob, y - 42 - drop, Math.PI / 2, 40); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + s.t * 2.2; if (s.t > IMPACT.charge) draw(A.blade, x + Math.cos(a) * (50 + (s.t - IMPACT.charge) * 90), y - 26 + Math.sin(a) * 16, a, 20); }
  }
}
function drawEffect(ctx, s, al) {
  const prof = s.prof; const [dark, body, accent, spark] = prof.pal; const y = groundYForDepth(s.z); const x = s.x; const R = s.R; const t = s.t;
  const te = t - IMPACT.charge; // seconds since the eruption
  // Charge: the material is drawn in, a ring glows on the ground.
  if (t >= IMPACT.commit && t < IMPACT.charge) {
    const c = clamp01((t - IMPACT.commit) / (IMPACT.charge - IMPACT.commit));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `${accent}55`; ctx.beginPath(); ctx.ellipse(x, y, R * .7 * c, R * .22 * c, 0, 0, TAU); ctx.fill(); ctx.restore();
    for (let i = 0; i < 26; i++) { const a = rnd(s.seed, i) * TAU + t * 5; const r = R * 1.35 * (1 - c) * (.5 + .5 * rnd(s.seed, i + 30)); px(ctx, x + Math.cos(a) * r, y - 10 - 40 * c * rnd(s.seed, i + 7) + Math.sin(a) * r * .3, 3, 3, i % 3 ? accent : spark); }
  }
  if (te < 0) return;
  // The eruption itself, by look.
  const rise = clamp01(te / .22); const settle = 1 - clamp01((te - .3) / .5) * .8; const flash = te < .12 ? 1 - te / .12 : 0;
  if (flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${.55 * flash})`; ctx.beginPath(); ctx.ellipse(x, y - 8, R * 1.1, R * .36, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  const eruptDur = IMPACT.expand - IMPACT.charge + .15;
  if (te < eruptDur) switch (prof.look) {
    case 'column': for (let c = -1; c <= 1; c++) { const h = (c ? 96 : 170) * rise * settle; for (let i = 0; i < h; i += 4) { const w = (c ? 26 : 44) * Math.pow(1 - i / (h + 1), .6) * (1 + .12 * Math.sin(t * 16 + i)); px(ctx, x + c * 34 - w / 2, y - i, w, 4, body); px(ctx, x + c * 34 - w * .6 / 2, y - i, w * .6, 4, accent); px(ctx, x + c * 34 - w * .25 / 2, y - i, w * .25, 4, spark); } } break;
    case 'spikes': for (let i = 0; i < 22; i++) {
      const a = i / 22 * TAU + rnd(s.seed, i) * .3; const r = R * (.35 + .65 * rnd(s.seed, i + 5)); const bx = x + Math.cos(a) * r; const by = y + Math.sin(a) * r * .3; const h = (46 + 56 * rnd(s.seed, i + 9)) * rise * settle; const wd = prof.shape === 'plate' ? 16 : prof.shape === 'block' ? 14 : 9;
      if (prof.shape === 'root') { for (let q = 0; q < h; q += 3) px(ctx, bx + Math.sin(q * .12 + t * 3 + i) * (3 + q * .05), by - q, 4, 3, q % 9 < 3 ? accent : body); }
      else if (prof.shape === 'crystal') plate(ctx, [[bx - wd / 2, by], [bx, by - h], [bx + wd / 2, by]], { ...s.mat, body, facet: accent, edge: spark, vein: body, dark }, s.seed + i, { alpha: al, glowEdge: .8 });
      else { px(ctx, bx - wd / 2, by - h, wd, h, body); px(ctx, bx - wd / 2, by - h, wd, 3, accent); px(ctx, bx - wd / 2, by - h, 2, h, dark); }
    } break;
    case 'vortex': for (let i = 0; i < 70; i++) { const u = i / 70; const a = u * TAU * 3 + t * 9; const r = (18 + u * R * 1.1) * rise; px(ctx, x + Math.cos(a) * r, y - 6 - u * 110 * rise * settle + Math.sin(a) * r * .3, 4, 4, i % 4 ? body : accent); } break;
    case 'arcs': for (let b = 0; b < 9; b++) { const a = b / 9 * TAU + Math.floor(t * 18) * .37; ctx.save(); ctx.strokeStyle = b % 2 ? accent : spark; ctx.lineWidth = 2; ctx.beginPath(); let bx = x; let by = y - 6; ctx.moveTo(bx, by); const len = R * 1.15 * rise; for (let q = 1; q <= 6; q++) { bx = x + Math.cos(a) * len * q / 6 + (rnd(s.seed, Math.floor(t * 18) * 9 + b * 7 + q) - .5) * 14; by = y - 6 + Math.sin(a) * len * q / 6 * .32 + (rnd(s.seed, b * 11 + q) - .5) * 6; ctx.lineTo(bx, by); } ctx.stroke(); ctx.restore(); } break;
    case 'collapse': { const inward = clamp01(1 - te / .3); const rr = R * (.2 + .9 * (te < .3 ? inward : (te - .3) / .5)); ctx.save(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y - 30, rr, rr * .5, 0, 0, TAU); ctx.stroke(); ctx.restore(); for (let i = 0; i < 24; i++) { const a = rnd(s.seed, i) * TAU; const r = rr * (.6 + .4 * rnd(s.seed, i + 3)); px(ctx, x + Math.cos(a) * r, y - 30 + Math.sin(a) * r * .5, 3, 3, i % 3 ? body : spark); } px(ctx, x - 9, y - 39, 18, 18, dark); break; }
    case 'claws': for (let c = 0; c < 3; c++) { const off = (c - 1) * 44; ctx.save(); ctx.strokeStyle = c === 1 ? spark : accent; ctx.lineWidth = 7 - c % 2 * 2; ctx.globalAlpha = rise * settle; ctx.beginPath(); ctx.moveTo(x + off - 60, y - 140 * rise); ctx.quadraticCurveTo(x + off - 10, y - 70, x + off + 50, y - 4); ctx.stroke(); ctx.restore(); } break;
    default: for (let r = 0; r < 3; r++) { ctx.save(); ctx.strokeStyle = r % 2 ? accent : spark; ctx.lineWidth = 3; ctx.globalAlpha = settle; ctx.beginPath(); ctx.ellipse(x, y - 24, R * (.3 + .35 * r) * rise, R * (.3 + .35 * r) * rise * .5, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  }
  // The expanding ring.
  if (t >= IMPACT.impact && t < IMPACT.expand + .1) { const q = clamp01((t - IMPACT.impact) / (IMPACT.expand - IMPACT.impact)); groundRing(ctx, x, y, lerp(R * .8, IMPACT.ringR, q), { ...s.mat, edge: accent, vein: body, spark }, 0, 1 - q * .8, 18, s.seed + 5, 5); }
  // Aftermath: the element's remains drift and fade.
  if (t >= IMPACT.expand - .1) {
    const f = 1 - clamp01((t - IMPACT.expand) / (IMPACT.end - IMPACT.expand)); const ta = t - IMPACT.expand;
    for (let i = 0; i < 16; i++) { const e = (ta * .5 + rnd(s.seed, i + 60)) % 1; const a = rnd(s.seed, i + 80) * TAU; const r = Math.sqrt(rnd(s.seed, i + 90)) * R; ctx.globalAlpha = f; px(ctx, x + Math.cos(a) * r, y - 6 - e * 60 + Math.sin(a) * r * .3, 3, 3, i % 3 ? accent : spark); ctx.globalAlpha = 1; }
  }
}
function drawImpact(ctx, s) {
  const al = Math.min(1, s.t / .08, (IMPACT.end - s.t) / .5);
  ctx.save();
  drawEffect(ctx, s, al);
  drawProp(ctx, s, Math.max(.05, al));
  ctx.restore();
}

// The technique: one impact sequence for the caster. A = the arsenal (or null = swarm), items = the arsenal's painters.
export function makeBankaiImpact(caster, items, gw = globalThis.window?.gameWorld) {
  const style = bankaiStyleOf(caster); const runeId = impactElementFor(caster, gw);
  const seq = new BankaiImpact(caster, style, items ?? {}, runeId, gw);
  audio.playImpact?.(false);
  return seq;
}
export { BankaiImpact };
