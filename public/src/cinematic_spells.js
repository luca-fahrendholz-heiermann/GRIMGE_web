// GRIMGE Prototype — the four cinematic special runes (user spec 16 Nov 2026): S96 INFERNOAUSBRUCH, S97 ARKANSTRUDEL,
// S98 GRÜNES ERWACHEN, S99 ELEMENTARTOR. Each is a staged spell with its own charge, impact and aftermath phase:
//   charge     the warning: the thing the opponent can read and dodge
//   impact     the one moment of main damage / effect (gameplay is decided HERE, once, deterministically)
//   aftermath  what remains (burning ground, fading rings, a living field, the closing gate)
// Rules for this file: no gameplay in the render functions, hit results are deterministic (no Math.random in update),
// randomness is only cosmetic and comes from a seeded hash. Original designs — inspired by effect categories only.
import { defineSignature, emit, foesOf, hit, massOf, groundDist, TAU, DEPTH } from './signature_core.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { environment } from './environment.js';
import { applyStatus } from './status_effects.js';
import { groundYForDepth } from './world.js';

// ── data ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Timelines in seconds: [0, impactAt) charge · [impactAt, impactEnd) impact · [impactEnd, end) aftermath.
export const CINEMATIC = Object.freeze({
  S96: Object.freeze({ id: 'inferno_eruption', impactAt: .5, impactEnd: 1.4, end: 3.0, R: 104, front: 150, damage: 58, knock: 360, lift: 150, stun: .5, hitstop: 7, shake: 14, groundLife: 3.4 }),
  S97: Object.freeze({ id: 'arcane_vortex', impactAt: 1.9, impactEnd: 2.3, end: 3.2, R: 118, pullR: 170, core: 44, pullSpeed: 135, damage: 44, knock: 420, lift: 200, stun: .55, hitstop: 7, shake: 12 }),
  S98: Object.freeze({ id: 'verdant_awakening', impactAt: .6, impactEnd: 1.2, end: 7.2, R: 112, damage: 20, rootFor: 2.2, regen: 5, regenEvery: .5, field: 6, slow: .62, hitstop: 4, shake: 8 }),
  S99: Object.freeze({ id: 'elemental_gateway', impactAt: 1.1, impactEnd: 1.5, end: 2.4, shake: 5 })
});

// The Gateway's explicit allowlist: element → what comes through. A familiar of its own (ember, ward guardian, arcane) is
// derived from a base summon of the game and recoloured; nothing arbitrary can come out.
const ELEMENT_GROUP = Object.freeze({ aqua: 'water', frost: 'water', fulgur: 'storm', ventus: 'storm', umbra: 'shadow', void: 'shadow', terra: 'earth', construct: 'earth', natura: 'nature', bestia: 'nature', ignis: 'fire', lux: 'light', ward: 'light' });
export const GATEWAY_SUMMONS = Object.freeze({
  water: Object.freeze({ base: 'spirit_wolf', color: '#4fc3f7' }),
  storm: Object.freeze({ base: 'storm_wolf', color: '#ffd54f' }),
  shadow: Object.freeze({ base: 'void_spider', color: '#b388ff' }),
  earth: Object.freeze({ base: 'rune_golem', color: '#bcaaa4' }),
  nature: Object.freeze({ base: 'lesser_beast', color: '#9be564' }),
  fire: Object.freeze({ base: 'lesser_beast', color: '#ff8a50', override: Object.freeze({ id: 'ember_familiar', name: 'GLUT-FAMILIAR', color: '#ff7043', particleElement: 'ignis', hp: 68, damage: 17, duration: 12 }) }),
  light: Object.freeze({ base: 'rune_golem', color: '#fff59d', override: Object.freeze({ id: 'ward_guardian', name: 'WÄCHTER', color: '#fff59d', particleElement: 'lux', hp: 210, damage: 14, duration: 13, role: 'vanguard' }) }),
  arcane: Object.freeze({ base: 'spirit_wolf', color: '#cfe7ff', override: Object.freeze({ id: 'arcane_familiar', name: 'ARKAN-FAMILIAR', color: '#b98cff', particleElement: 'void', hp: 90, damage: 18, duration: 12 }) })
});
export const elementGroupOf = (id) => ELEMENT_GROUP[id] ?? 'arcane';
// The caster's element: the one normal element rune it cast last, else the profile's start element (the player), else none.
export function casterElement(caster, gw) {
  const last = caster?.lastElementCast?.id; if (last) return last;
  const start = gw?.profile?.character?.startElement; if (caster && caster === gw?.player && start) return start;
  return null;
}
// The summon definition a gateway opens for an element (base definitions come from the spell system).
export function gatewayDefinition(element, baseOf) {
  const entry = GATEWAY_SUMMONS[elementGroupOf(element)]; const base = baseOf(entry.base);
  return base ? { ...base, ...(entry.override ?? {}) } : null;
}

// ── helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const rnd = (seed, n) => { const s = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); };
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// A filled pixel disc (rows of two pixels): round shapes without smoothing.
const disc = (ctx, cx, cy, r, c) => { ctx.fillStyle = c; for (let dy = -r; dy < r; dy += 2) { const w = Math.sqrt(Math.max(0, r * r - (dy + 1) * (dy + 1))) * 2; ctx.fillRect(Math.round(cx - w / 2), Math.round(cy + dy), Math.max(1, Math.round(w)), 2); } };
const alive = (t) => t && !t.isDead && (t.lifeState === undefined || t.lifeState === 'Alive') && (t.hp ?? 1) > 0;
const outward = (t, x, fallback = 1) => Math.sign(t.x - x) || fallback;
const allies = (gw, team, system) => {
  const list = [];
  for (const e of [gw?.player, gw?.enemyChampion, gw?.primal]) if (e && e.team === team && alive(e) && e.isAlive !== false && !e.merged) list.push(e);
  for (const m of gw?.minions ?? []) if (m.team === team && alive(m) && !m.isTrainingDummy) list.push(m);
  for (const s of system?.activeSummons ?? []) if (s.team === team && alive(s)) list.push(s);
  return list;
};
// Props and scene objects inside a circle (ground px): plain props take a spell hit, scene objects also get fed.
function propsIn(x, z, R, fn) { for (const p of environment.props) if (!p.isDead && Math.hypot(p.x - x, (p.z - z) * DEPTH) <= R) fn(p); }

// ── the shared staged skeleton ────────────────────────────────────────────────────────────────────────────────────────
class StagedSpell {
  constructor(sig, owner, quality, x, z, timeline) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.quality = quality; this.x = x; this.z = z; this.T = timeline;
    this.t = 0; this.isFinished = false; this.impacted = false; this.mainHits = 0; this.hitstops = 0; this.seed = (sig?.seed ?? 7) + Math.round(x);
    this.f = owner.facing || 1;
  }
  get y() { return groundYForDepth(this.z); }
  get power() { return this.quality?.power ?? 1; }
  get area() { return this.quality?.area ?? 1; }
  get phase() { const T = this.T; return this.t < T.impactAt ? 'charge' : this.t < T.impactEnd ? 'impact' : 'aftermath'; }
  update(dt, gw) {
    if (this.isFinished) return;
    this.t += dt;
    if (!this.impacted && this.t >= this.T.impactAt) { this.impacted = true; this.onImpact(gw); }
    this.onTick?.(dt, gw);
    if (this.t >= this.T.end) { this.isFinished = true; this.onEnd?.(gw); }
  }
  // The single main hitstop of a spell: only on a meaningful hit, and only once.
  mainHitstop(frames) { if (this.hitstops === 0 && this.mainHits > 0) { this.hitstops = 1; combat.triggerHitstop?.(frames); } }
}
for (const C of [StagedSpell]) Object.defineProperty(C.prototype, 'fineVfx', { value: true, writable: true, configurable: true });

// ── S96 INFERNOAUSBRUCH ───────────────────────────────────────────────────────────────────────────────────────────────
const FIRE = Object.freeze({ dark: '#2a0a05', ember: '#ff5a1f', flame: '#ff8a2a', gold: '#ffd24a', hot: '#fff4c2', smoke: 'rgba(52,44,44,' });
// A pixel flame column: stacked rows, outer to inner colours, swaying with height.
function flameColumn(ctx, cx, baseY, H, W, t, seed) {
  const rows = Math.max(2, Math.round(H / 4));
  for (let i = 0; i < rows; i++) {
    const u = i / rows; const w = W * Math.pow(1 - u, .7) * (1 + .18 * Math.sin(t * 18 + i * 1.3 + seed)); const sway = Math.sin(t * 9 + i * .5 + seed) * W * .12 * u; const y = baseY - i * 4;
    px(ctx, cx - w / 2 + sway, y, w, 4, FIRE.ember); px(ctx, cx - w * .33 + sway, y, w * .66, 4, FIRE.flame); px(ctx, cx - w * .17 + sway, y, w * .34, 4, FIRE.gold);
    if (u < .8) px(ctx, cx - w * .07 + sway, y, Math.max(2, w * .14), 4, FIRE.hot);
  }
}
class InfernoEruption extends StagedSpell {
  constructor(sig, owner, quality, x, z) { super(sig, owner, quality, x, z, CINEMATIC.S96); this.R = CINEMATIC.S96.R * this.area; this.dmg = CINEMATIC.S96.damage * this.power; }
  onImpact(gw) {
    const C = CINEMATIC.S96;
    for (const t of foesOf(gw, this.team)) {
      const d = groundDist(t, this); if (d > this.R) continue;
      // The core hits hardest; the edge of the circle still hurts (three quarters).
      hit(t, this.dmg * (d <= this.R * .5 ? 1 : .75), outward(t, this.x, this.f) * C.knock * massOf(t), C.lift * Math.max(.4, massOf(t)), C.stun);
      applyStatus(t, 'burn', { force: true });
      combat.spawnHitSparks?.(t.x, (t.y ?? this.y) - 36, outward(t, this.x), FIRE.gold, 14); this.mainHits++;
    }
    // Objects: barrels and crates catch fire, plants burn, boulders are shoved.
    propsIn(this.x, this.z, this.R, (p) => { if (p.isSceneObject) p.feed?.('ignis', 20); p.takeDamage?.(30, outward(p, this.x) * 320, 0, 0, false, 'spell'); if (!p.isSceneObject) p.burning = Math.max(p.burning ?? 0, .01); });
    // Burning ground: it hurts the other team for a few seconds (environment 'scorch').
    environment.add('scorch', this.x, this.z, { radius: this.R * .9, life: C.groundLife, team: this.team, ownerSafe: true });
    combat.spawnShockwave?.(this.x, this.y - 8, this.R * 1.1, FIRE.gold); combat.shakeCamera?.(C.shake, .55); audio.playImpact?.(true);
    this.mainHitstop(C.hitstop);
  }
  render(ctx) {
    const { x, y, t, R } = this; const T = this.T; const gy = y;
    ctx.save();
    if (t < T.impactAt) {
      // Charge: the ground glows and cracks along spokes, embers are drawn in.
      const k = clamp01(t / T.impactAt);
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,120,40,${.28 * k})`; ctx.beginPath(); ctx.ellipse(x, gy, R * .62 * k, R * .2 * k, 0, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      for (let s = 0; s < 9; s++) {
        const a = s / 9 * TAU + rnd(this.seed, s) * .5; const len = R * k * (.55 + .45 * rnd(this.seed, s + 20));
        for (let d = 4; d < len; d += 5) { const j = (rnd(this.seed, s * 40 + d) - .5) * 6; px(ctx, x + Math.cos(a) * d + j * .3, gy + Math.sin(a) * d * .32 + j * .1, 3, 2, d % 10 < 5 ? FIRE.gold : FIRE.ember); }
      }
      for (let i = 0; i < 22; i++) { const a = rnd(this.seed, i) * TAU + t * 3; const r = R * (1.15 - .95 * k) * (.55 + .45 * rnd(this.seed, i + 50)); px(ctx, x + Math.cos(a) * r, gy + Math.sin(a) * r * .32 - 8 * k * rnd(this.seed, i + 9), 2, 2, i % 3 ? FIRE.flame : FIRE.hot); }
    } else {
      const tt = t - T.impactAt;
      // Impact: a white-hot core flashes, then three flame masses rise and settle.
      if (tt < .14) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,244,194,${.7 * (1 - tt / .14)})`; ctx.beginPath(); ctx.ellipse(x, gy - 10, R * 1.05, R * .36, 0, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      if (tt < .85) {
        const rise = clamp01(tt / .18); const settle = 1 - clamp01((tt - .45) / .4) * .85; const H = 152 * rise * settle; const W = R * .62 * (.6 + .4 * rise);
        flameColumn(ctx, x - W * .55, gy, H * .72, W * .6, t, this.seed + 1); flameColumn(ctx, x + W * .55, gy, H * .64, W * .55, t, this.seed + 2); flameColumn(ctx, x, gy, H, W, t, this.seed);
      }
      // The fire front: a ring of tongues racing outward.
      const tf = t - (T.impactAt + .4); if (tf > 0 && tf < .5) {
        const rr = R * (.5 + 1.0 * tf / .5); const fade = 1 - tf / .5;
        for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; const h = 12 + 10 * Math.abs(Math.sin(t * 14 + i * 2.1)); ctx.globalAlpha = fade; flameColumn(ctx, x + Math.cos(a) * rr, gy + Math.sin(a) * rr * .32, h, 9, t, i); }
        ctx.globalAlpha = 1;
      }
      // Aftermath: smoke, floating embers and small flames on the scorched ground.
      if (t > T.impactEnd - .2) {
        const ta = t - (T.impactEnd - .2); const f = 1 - clamp01(ta / (T.end - T.impactEnd + .2));
        for (let i = 0; i < 12; i++) { const rise = ta * (28 + 30 * rnd(this.seed, i)); const sx = x + (rnd(this.seed, i + 30) - .5) * R * 1.3; px(ctx, sx, gy - 14 - rise, 8 + rise * .12, 6 + rise * .08, `${FIRE.smoke}${.42 * f})`); }
        for (let i = 0; i < 14; i++) { const e = ((ta * .45 + rnd(this.seed, i + 70)) % 1); px(ctx, x + (rnd(this.seed, i + 5) - .5) * R * 1.2 + Math.sin(ta * 2 + i) * 6, gy - 10 - e * 70, 2, 2, e < .5 ? FIRE.gold : FIRE.ember); }
        if (f > .3) for (let i = 0; i < 12; i++) { const a = rnd(this.seed, i + 90) * TAU; const r = Math.sqrt(rnd(this.seed, i + 110)) * R * .75; ctx.globalAlpha = Math.min(1, f * 1.4); flameColumn(ctx, x + Math.cos(a) * r, gy + Math.sin(a) * r * .32, 10 + 8 * Math.abs(Math.sin(t * 11 + i)), 7, t, i + 3); }
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }
}

// ── S97 ARKANSTRUDEL ──────────────────────────────────────────────────────────────────────────────────────────────────
const ARC = Object.freeze({ dark: '#150a2e', body: '#5b2bd6', light: '#b98cff', white: '#f1e4ff' });
class ArcaneVortex extends StagedSpell {
  constructor(sig, owner, quality, x, z) { super(sig, owner, quality, x, z, CINEMATIC.S97); this.R = CINEMATIC.S97.R * this.area; this.pullR = CINEMATIC.S97.pullR * this.area; this.dmg = CINEMATIC.S97.damage * this.power; }
  // The pull: from the first moment until the discharge, foes in reach slide toward the centre and are held near the core.
  onTick(dt, gw) {
    const C = CINEMATIC.S97; if (this.t < .3 || this.t >= C.impactAt) return;
    for (const t of foesOf(gw, this.team)) {
      const d = groundDist(t, this); if (d > this.pullR || d < 1) continue;
      const m = massOf(t); const step = Math.min(d, C.pullSpeed * m * (1 - .45 * d / this.pullR) * dt);
      t.x += (this.x - t.x) / d * step; if (Number.isFinite(t.z)) t.z += (this.z - t.z) / d * step / DEPTH;
      if (d <= C.core * this.area) t.slow?.(.3, .12); else t.slow?.(.2, .6);
    }
  }
  onImpact(gw) {
    const C = CINEMATIC.S97;
    for (const t of foesOf(gw, this.team)) {
      const d = groundDist(t, this); if (d > this.R) continue;
      hit(t, this.dmg, outward(t, this.x, this.f) * C.knock * massOf(t), C.lift * Math.max(.4, massOf(t)), C.stun);
      combat.spawnHitSparks?.(t.x, (t.y ?? this.y) - 36, outward(t, this.x), ARC.light, 12); this.mainHits++;
    }
    // Movable scene objects take the discharge through their own hit reaction (a boulder rolls away).
    propsIn(this.x, this.z, this.R, (p) => { if (p.isSceneObject) p.feed?.('void', 10); p.takeDamage?.(8, outward(p, this.x) * 320, 0, 0, false, 'spell'); });
    combat.spawnShockwave?.(this.x, this.y - 60, this.R * 1.3, ARC.light); combat.shakeCamera?.(C.shake, .45); audio.playImpact?.(true);
    this.mainHitstop(C.hitstop);
  }
  render(ctx) {
    const { x, y, t } = this; const T = this.T; const cy = y - 66; ctx.save();
    const form = clamp01(t / .6); const compress = clamp01((t - 1.5) / .4); const cr = (5 + 16 * form) * (1 - .62 * compress) + (t < T.impactAt ? Math.sin(t * 12) * 1.2 : 0);
    const afterK = t > T.impactAt ? clamp01((t - T.impactAt) / (T.end - T.impactAt)) : 0; const fade = 1 - afterK;
    if (this.phase !== 'aftermath' || fade > 0) {
      // The ground ring that shows the reach of the pull.
      if (t < T.impactAt) { ctx.strokeStyle = `rgba(185,140,255,${.25 + .15 * Math.sin(t * 6)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, this.pullR * form, this.pullR * form * .32, 0, 0, TAU); ctx.stroke(); }
      // Spiralling particles and short bolts, drawn inward.
      if (t < T.impactAt) {
        for (let i = 0; i < 30; i++) { const u = (t * .7 + rnd(this.seed, i)) % 1; const r = this.pullR * (1 - u); const a = rnd(this.seed, i + 40) * TAU + t * 3 + (1 - u) * 5; const rise = (1 - u) * 66; px(ctx, x + Math.cos(a) * r, y - rise + Math.sin(a) * r * .32, 2, 2, i % 3 ? ARC.light : ARC.white); }
        const bucket = Math.floor(t * 9); for (let b = 0; b < 4; b++) {
          const a = rnd(this.seed, bucket * 7 + b) * TAU; let bx = x + Math.cos(a) * this.pullR * .8; let by = y + Math.sin(a) * this.pullR * .26; ctx.strokeStyle = ARC.white; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by);
          for (let s = 1; s <= 3; s++) { bx += (x - bx) / (4 - s + 1) + (rnd(this.seed, bucket * 31 + b * 5 + s) - .5) * 10; by += (cy - by) / (4 - s + 1) + (rnd(this.seed, bucket * 17 + b * 3 + s) - .5) * 8; ctx.lineTo(bx, by); }
          ctx.stroke();
        }
      }
      // Several rings turning at different speeds and tilts.
      for (let r = 0; r < 3; r++) {
        const rx = (46 + r * 24) * clamp01(t / .8) * (1 + .5 * afterK) * (1 - .35 * compress); const ry = rx * (.34 + .1 * r); const tilt = (r - 1) * .5 + t * (r % 2 ? -.5 : .4); const ang0 = t * (1.6 + r * .9) * (r % 2 ? -1 : 1);
        ctx.globalAlpha = fade; for (let i = 0; i < 44; i++) { const a = ang0 + i / 44 * TAU; const ex = Math.cos(a) * rx; const ey = Math.sin(a) * ry; px(ctx, x + ex * Math.cos(tilt) - ey * Math.sin(tilt), cy + ex * Math.sin(tilt) + ey * Math.cos(tilt), 3, 3, i % 5 ? ARC.light : ARC.white); }
      }
      // The core: dark body, bright heart, glow.
      ctx.globalAlpha = fade; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(150,100,255,${.35 * fade})`; ctx.beginPath(); ctx.arc(x, cy, cr * 2, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      disc(ctx, x, cy, Math.round(cr + 2), ARC.dark); disc(ctx, x, cy, Math.round(cr), ARC.body); disc(ctx, x, cy, Math.round(cr * .62), ARC.light); disc(ctx, x, cy, Math.max(2, Math.round(cr * .3)), ARC.white);
      ctx.globalAlpha = 1;
    }
    // The discharge: a bright pulse ring on the ground and around the core, motes thrown outward.
    if (t >= T.impactAt) {
      const td = t - T.impactAt; if (td < .45) {
        const k = td / .45; ctx.strokeStyle = `rgba(241,228,255,${1 - k})`; ctx.lineWidth = 4 * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(x, y, this.R * 1.4 * k, this.R * 1.4 * k * .32, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x, cy, this.R * .9 * k, this.R * .9 * k * .7, 0, 0, TAU); ctx.stroke();
        if (td < .1) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(241,228,255,${.6 * (1 - td / .1)})`; ctx.beginPath(); ctx.arc(x, cy, 46, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      }
      for (let i = 0; i < 20; i++) { const k = clamp01(td / 1.2); const a = rnd(this.seed, i + 60) * TAU; const r = this.R * 1.5 * k * (.4 + .6 * rnd(this.seed, i + 80)); ctx.globalAlpha = 1 - k; px(ctx, x + Math.cos(a) * r, cy + Math.sin(a) * r * .45, 2, 2, ARC.light); ctx.globalAlpha = 1; }
    }
    ctx.restore();
  }
}

// ── S98 GRÜNES ERWACHEN ───────────────────────────────────────────────────────────────────────────────────────────────
const LEAF = Object.freeze({ dark: '#0e2410', body: '#2f8f3a', light: '#9be564', white: '#eaffc8', bark: '#5d4037' });
class VerdantAwakening extends StagedSpell {
  constructor(sig, owner, quality, x, z) {
    super(sig, owner, quality, x, z, { ...CINEMATIC.S98, end: CINEMATIC.S98.impactEnd + CINEMATIC.S98.field * (quality?.duration ?? 1) });
    this.R = CINEMATIC.S98.R * this.area; this.dmg = CINEMATIC.S98.damage * this.power; this.regenT = 0; this.rooted = new Set();
  }
  get inField() { return this.impacted && this.t < this.T.end; }
  onImpact(gw) {
    const C = CINEMATIC.S98;
    for (const t of foesOf(gw, this.team)) {
      if (groundDist(t, this) > this.R) continue;
      hit(t, this.dmg, 0, 40, .3); t.slow?.(C.rootFor, .05); this.rooted.add(t); this.mainHits++;
      combat.spawnHitSparks?.(t.x, (t.y ?? this.y) - 30, 1, LEAF.light, 10);
    }
    // Plants nearby are awakened: they grow a stage; other objects only feel the pulse.
    propsIn(this.x, this.z, this.R * 1.2, (p) => { if (p.isSceneObject) p.feed?.('natura', 40); });
    combat.spawnShockwave?.(this.x, this.y - 6, this.R * 1.1, LEAF.light); combat.shakeCamera?.(C.shake, .35); audio.playImpact?.(false);
    this.mainHitstop(C.hitstop);
  }
  // The living field: allies heal in short ticks, enemies in it are slowed; plants keep growing.
  onTick(dt, gw) {
    if (!this.inField || this.t < this.T.impactEnd) return;
    const C = CINEMATIC.S98; this.regenT -= dt; if (this.regenT > 0) return; this.regenT = C.regenEvery;
    for (const a of allies(gw, this.team, this.system)) { if (groundDist(a, this) > this.R || !(a.hp > 0)) continue; const before = a.hp; a.hp = Math.min(a.maxHp ?? a.hp, a.hp + C.regen * this.power); if (a.hp > before) combat.spawnElementalParticles?.(a.x, (a.y ?? this.y) - 30, 'natura', 2); }
    for (const t of foesOf(gw, this.team)) if (groundDist(t, this) <= this.R) t.slow?.(.7, C.slow);
    propsIn(this.x, this.z, this.R, (p) => { if (p.isSceneObject) p.feed?.('natura', 3); });
  }
  render(ctx) {
    const { x, y, t, R } = this; const T = this.T; ctx.save();
    const veins = clamp01(t / T.impactAt);
    // Charge: glowing green veins run through the ground toward the centre.
    if (t < T.impactEnd) {
      for (let s = 0; s < 8; s++) {
        const a = s / 8 * TAU + .3; const len = R * 1.05 * veins;
        for (let d = R * 1.05; d > R * 1.05 - len; d -= 4) { const j = (rnd(this.seed, s * 50 + d) - .5) * 5; px(ctx, x + Math.cos(a) * d + j, y + Math.sin(a) * d * .32 + j * .2, 3, 2, (Math.floor(d / 6) + Math.floor(t * 6)) % 3 ? LEAF.body : LEAF.light); }
      }
    }
    if (t >= T.impactAt) {
      const ti = t - T.impactAt;
      // Impact: roots and vines burst up around the circle, a bright pulse with leaves and spores follows.
      const rise = clamp01(ti / .3); const fall = this.t < T.impactEnd ? 1 : 1 - clamp01((t - T.impactEnd) / 1.5) * .55;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU + rnd(this.seed, i) * .3; const r = R * (.35 + .65 * rnd(this.seed, i + 20)); const bx = x + Math.cos(a) * r; const by = y + Math.sin(a) * r * .32; const h = (34 + 40 * rnd(this.seed, i + 40)) * rise * fall;
        for (let s = 0; s < h; s += 3) { const bend = Math.sin(s * .12 + t * 3 + i) * (3 + s * .06); px(ctx, bx + bend, by - s, s < 8 ? 4 : 3, 3, s % 9 < 3 ? LEAF.light : s % 2 ? LEAF.body : LEAF.dark); if (s > 14 && s % 15 < 3) px(ctx, bx + bend + (i % 2 ? 4 : -7), by - s - 1, 5, 3, LEAF.light); }
      }
      if (ti < .6) {
        const k = ti / .6; ctx.strokeStyle = `rgba(234,255,200,${1 - k})`; ctx.lineWidth = 4 * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(x, y, R * 1.15 * k, R * 1.15 * k * .32, 0, 0, TAU); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(155,229,100,${.3 * (1 - k)})`; ctx.beginPath(); ctx.ellipse(x, y - 6, R * k, R * k * .34, 0, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 26; i++) { const a = rnd(this.seed, i + 60) * TAU; const r = R * 1.1 * k * (.3 + .7 * rnd(this.seed, i + 70)); px(ctx, x + Math.cos(a) * r, y - 8 - 30 * k * rnd(this.seed, i + 90) + Math.sin(a) * r * .32, i % 3 ? 3 : 2, 2, i % 2 ? LEAF.light : LEAF.white); }
      }
      // The living field: a glowing rim, swaying blades, healing motes; it thins out as it ends.
      if (t >= T.impactEnd - .2) {
        const fieldLeft = clamp01((T.end - t) / 1.2); ctx.globalAlpha = fieldLeft;
        ctx.strokeStyle = LEAF.light; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, R, R * .32, 0, 0, TAU); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(100,200,90,.12)'; ctx.beginPath(); ctx.ellipse(x, y, R, R * .32, 0, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 26; i++) { const a = rnd(this.seed, i + 120) * TAU; const r = Math.sqrt(rnd(this.seed, i + 140)) * R * .95; const h = 6 + 6 * rnd(this.seed, i + 160) + Math.sin(t * 3 + i) * 2; px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * .32 - h, 2, h, i % 3 ? LEAF.body : LEAF.light); }
        for (let i = 0; i < 8; i++) { const e = (t * .5 + rnd(this.seed, i + 180)) % 1; const a = rnd(this.seed, i + 200) * TAU; px(ctx, x + Math.cos(a) * R * .7 * rnd(this.seed, i + 220), y - 6 - e * 46, 2, 2, LEAF.white); }
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }
}

// ── S99 ELEMENTARTOR ──────────────────────────────────────────────────────────────────────────────────────────────────
class ElementalGateway extends StagedSpell {
  constructor(sig, owner, quality, x, z, element, system) {
    super(sig, owner, quality, x, z, CINEMATIC.S99); this.element = element; this.group = elementGroupOf(element); this.systemRef = system;
    this.color = GATEWAY_SUMMONS[this.group].color; this.fizzled = false; this.summoned = null; this.summonId = null;
  }
  // A hit before the gate opens breaks the cast: nothing comes through.
  onTick(dt, gw) {
    if (this.impacted || this.fizzled) return;
    const o = this.owner; if (!alive(o) || o.isAlive === false || o.state === 'hurt') { this.fizzled = true; this.isFinished = true; combat.spawnShockwave?.(this.x, this.y - 40, 26, this.color); }
  }
  onImpact(gw) {
    if (this.fizzled) return;
    const def = gatewayDefinition(this.element, (id) => this.systemRef.summonDef(id)); if (!def) return;
    this.summonId = def.id; this.summoned = this.systemRef.summon(this.owner, def, gw, this.quality, { x: this.x, z: this.z }) ?? null;
    combat.spawnShockwave?.(this.x, this.y - 44, 70, this.color); combat.shakeCamera?.(CINEMATIC.S99.shake, .25); audio.playRuneChime?.(880);
  }
  render(ctx) {
    if (this.fizzled) return;
    const { x, y, t } = this; const T = this.T; const cy = y - 46; const col = this.color; ctx.save();
    const form = clamp01(t / .5); const closing = t > T.impactEnd ? clamp01((t - T.impactEnd) / (T.end - T.impactEnd)) : 0; const a = (1 - closing) * form; const sc = form * (1 - .4 * closing);
    const rx = Math.max(.6, 24 * sc); const ry = Math.max(1.2, 50 * sc); /* never a negative radius while the ring is still forming */
    ctx.globalAlpha = a;
    // The ring: a thin double outline of light pixels.
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, cy, Math.max(.3, rx - 3), Math.max(.3, ry - 3), 0, 0, TAU); ctx.stroke();
    // Glyphs travelling around it.
    for (let i = 0; i < 10; i++) { const ang = i / 10 * TAU + t * 1.4; const gx = x + Math.cos(ang) * (rx + 5); const gy = cy + Math.sin(ang) * (ry + 5); px(ctx, gx - 2, gy - 2, 4, 4, i % 3 ? '#ffffff' : col); px(ctx, gx - 1, gy - 5, 2, 2, col); }
    // The rotating plane inside, forming from t = .5 and flaring on activation.
    const plane = clamp01((t - .5) / .6);
    if (plane > 0) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(x, cy, Math.max(1, rx - 4), Math.max(1, ry - 4), 0, 0, TAU); ctx.clip();
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col; ctx.globalAlpha = a * .22 * plane; ctx.fillRect(x - rx, cy - ry, rx * 2, ry * 2);
      for (let r = 0; r < 9; r++) { const yy = cy - ry + (r + (t * 3) % 1) * ry * 2 / 9; const w = Math.sin(t * 4 + r * .9) * rx * .5 + rx * .6; ctx.globalAlpha = a * .5 * plane; px(ctx, x - w / 2, yy, w, 3, '#ffffff'); }
      ctx.restore();
    }
    // Activation: a pulse of light.
    if (t >= T.impactAt) { const td = t - T.impactAt; if (td < .4) { const k = td / .4; ctx.globalAlpha = 1 - k; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, cy, rx * (1 + k), ry * (1 + .4 * k), 0, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; } }
    ctx.restore();
  }
}

// ── registration ──────────────────────────────────────────────────────────────────────────────────────────────────────
// Where the spell lands: the aimed ground point, else a bit in front of the caster.
const aimOf = (c) => ({ x: Number.isFinite(c.target?.x) ? c.target.x : c.caster.x + (c.caster.facing || 1) * 190, z: Number.isFinite(c.target?.z) ? c.target.z : c.caster.z });
defineSignature('S96', { cast(c) { const p = aimOf(c); audio.playSpell?.('ignis'); emit(new InfernoEruption(c.sig, c.caster, c.quality, p.x, p.z), c.quality); } });
defineSignature('S97', { cast(c) { const p = aimOf(c); audio.playSpell?.('void'); emit(new ArcaneVortex(c.sig, c.caster, c.quality, p.x, p.z), c.quality); } });
defineSignature('S98', { cast(c) { const p = aimOf(c); audio.playSpell?.('natura'); emit(new VerdantAwakening(c.sig, c.caster, c.quality, p.x, p.z), c.quality); } });
defineSignature('S99', {
  cast(c) {
    const f = c.caster.facing || 1; audio.playSpell?.('lux');
    emit(new ElementalGateway(c.sig, c.caster, c.quality, c.caster.x + f * 78, c.caster.z, casterElement(c.caster, c.gw), c.system), c.quality);
  }
});
export { InfernoEruption, ArcaneVortex, VerdantAwakening, ElementalGateway };
