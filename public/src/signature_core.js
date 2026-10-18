// GRIMGE Prototype — SIGNATURE SPECIALS: shared runtime
// (docs/GRIMGE_Spezialrunen_Research_Designatlas_V1.md, S01–S36).
//
// Signature specials are special runes (own complex glyph, no combination,
// once per deck) but NOT Arcane States: none of them transforms the Wizard
// or changes his sprite. They come in the atlas's five kinds:
//  • Signature Stance   a few seconds of modified movement / inputs
//                       (player.signature, updated from Player.update)
//  • Signature Action   one striking effect with its own counterplay
//  • World Instrument   a breakable world object (SigProp) that reacts to
//                       spells and hits
//  • Rule Zone          a small, readable local rule for both teams
//  • Metamagic          an existing projectile / attack event is redirected,
//                       split, delayed or converted (projectile pipeline)
// This module holds what they share — registry, cast dispatch, combat event
// bus (attack / hit / heavy / projectile), breakable world props, the
// projectile pipeline (steer, slow, capture, kill), a signature projectile
// and the material painter helpers. The 36 mechanics live in
// signature_abilities_{a,b,c}.js.
import { plate, band, fallout, shard, mix, hashStr } from './buff_vfx.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { SIGNATURE_RUNE_DATA } from './signature_runes_data.js';

export const TAU = Math.PI * 2;
export const DEPTH = 150;
export const snap = (v) => Math.round(v);
export const SIG_PREFIX = 'sig_';
export const isSignatureRuneId = (id) => String(id ?? '').startsWith(SIG_PREFIX);
export const SIGNATURE_RUNE_IDS = Object.freeze(SIGNATURE_RUNE_DATA.map((d) => SIG_PREFIX + d.id));

// ── Material from the atlas palette (dark · body · accent · spark) ──────
const prefix = (hex) => { const h = hex.replace('#', ''); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},`; };
function sigMaterial(d) {
  const [dark, body, accent, spark] = d.palette;
  const crystal = /glas|kristall|linse|spiegel|opal|perlmutt|membran|elfenbein/i.test(d.identity);
  const edge = mix(accent, '#ffffff', .35);
  return { kind: crystal ? 'crystal' : 'crust', dark, body: crystal ? mix(body, '#ffffff', .12) : body, facet: mix(body, '#ffffff', .3), vein: accent, edge, spark, core: mix(spark, '#ffffff', .6), glow: prefix(accent), edgeGlow: prefix(edge) };
}

export const SIGNATURES = Object.fromEntries(SIGNATURE_RUNE_DATA.map((d) => [d.id, { ...d, mat: sigMaterial(d), seed: hashStr(d.id) }]));
const IMPL = {};
// Each ability registers { cast(c) } and optionally a stance (see below).
export function defineSignature(id, impl) { IMPL[id] = impl; }
export const signatureImpl = (id) => IMPL[id];

// ── Spell sink (the SpellSystem) and the last world seen ─────────────────
let sink = null; let world = null;
export const setSignatureSink = (s) => { if (s?.addSpell) sink = s; };
export const sigSink = () => sink;
export const sigWorld = () => world;
export const emit = (fx, quality = 'B') => { if (sink) sink.addSpell(fx, quality); return fx; };

// ── Hit context: who is swinging right now (melee loops set it) ─────────
let hitContext = null;
export const setHitContext = (entity) => { hitContext = entity; };
export const currentAttacker = () => hitContext;

// ── Targets ──────────────────────────────────────────────────────────────
export const aliveFoe = (t) => t && !t.isDead && !t.isDestroyed && (!t.lifeState || t.lifeState === 'Alive') && !t.isProp;
export const foesOf = (gw, team, objectives = false) => (gw?.getHostileTargets(team) ?? []).filter((t) => aliveFoe(t) && (objectives || !t.isObjective));
export const groundDist = (a, b) => Math.hypot(a.x - b.x, ((a.z ?? 0) - (b.z ?? 0)) * DEPTH);
export const yOf = (z, h = 0) => groundYForDepth(z) - h;
// Heavy fighters (champions, bosses) only take a share of forced movement.
export const massOf = (t) => (t.isObjective ? 0 : t.isBoss ? .15 : t.heroKey ? .45 : 1);
export function hit(t, damage, kx = 0, lift = 0, stun = .25, crit = false) { return t.takeDamage(damage, kx, lift, stun, crit, 'spell'); }

// ── Projectile pipeline (metamagic) ──────────────────────────────────────
// Covers minion bolts / arrows (game.projectiles) and every discrete spell
// projectile (Fireball family, Void Bolt, signature projectiles). Homing
// tower orbs are not steerable. Lateral steering uses _vz (applied here).
export function projectilesOf(gw = world) {
  const list = [];
  for (const p of gw?.projectiles ?? []) if (p.life > 0 && p.type !== 'towerOrb') list.push(p);
  for (const s of sink?.activeSpells ?? []) if (!s.isFinished && (s.isCapturableProjectile || s.isSigProjectile) && Number.isFinite(s.vx) && !s.held) list.push(s);
  return list;
}
export const projAlive = (p) => p.life > 0 && !p.isFinished;
export function projKill(p) { if ('isFinished' in p) p.isFinished = true; p.life = 0; }
export const projVel = (p) => [p.vx ?? 0, p._vz ?? 0];
export function projSetVel(p, vx, vz) { p.vx = vx; p._vz = vz; if (Math.abs(vx) > 1) p.facing = Math.sign(vx); if (p.type === 'bolt') p.targetZ = p.z; }
export const projDamage = (p) => p.damage ?? 20;
export const projHeight = (p) => p.height ?? 0;
// Slow a projectile while a zone holds it (restored by projRelease).
export function projSlow(p, k, owner) {
  if (!p._slowed) { p._slowed = { vx: p.vx, vz: p._vz ?? 0, owner }; p.vx *= k; p._vz = (p._vz ?? 0) * k; }
}
export function projRelease(p) { if (p._slowed) { p.vx = p._slowed.vx; p._vz = p._slowed.vz; p._slowed = null; } }
// Reflect a velocity on a line with unit normal (nx, nz) in ground px.
export function reflectVel(vx, vz, nx, nz) { const d = vx * nx + vz * DEPTH * nz; return [vx - 2 * d * nx, vz - 2 * d * nz / DEPTH]; }

// ── A signature projectile (needle, splinter, crystal, block …) ─────────
export class SigBolt {
  constructor(o) {
    Object.assign(this, { height: 34, vz: 0, radius: 8, life: 1.4, turn: 4, kx: 140, lift: 50, stun: .2, size: 6, kind: 'needle', skipProps: false, delay: 0 }, o);
    this._vz = o.vz ?? 0; this.facing = Math.sign(this.vx) || 1;
    this.isSigProjectile = true; this.isCapturableProjectile = o.capturable ?? true; this.isFinished = false; this.t = 0; this.trail = [];
  }
  get y() { return yOf(this.z, this.height) - 6; }
  update(dt, gw) {
    this.t += dt;
    if (this.t < this.delay) return;
    if (this.homing && aliveFoe(this.homing)) {
      // Bounded turn rate: the needle curves, it never snaps onto a target.
      const dx = this.homing.x - this.x; const dz = (this.homing.z - this.z) * DEPTH; const sp = Math.hypot(this.vx, this._vz * DEPTH) || 1;
      const want = Math.atan2(dz, dx); const cur = Math.atan2(this._vz * DEPTH, this.vx);
      let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      const a = cur + Math.max(-this.turn * dt, Math.min(this.turn * dt, da));
      this.vx = Math.cos(a) * sp; this._vz = Math.sin(a) * sp / DEPTH; this.facing = Math.sign(this.vx) || this.facing;
    }
    const px = this.x;
    this.x += this.vx * dt; this.z = Math.max(.02, Math.min(.98, this.z + this._vz * dt)); this.life -= dt;
    this.trail.unshift([this.x, this.y]); if (this.trail.length > 6) this.trail.length = 6;
    // Solid walls stop it (a wall between needle and target breaks the lock).
    for (const s of sink?.activeSpells ?? []) if (s.isStoneWall && !s.isDead && s.team !== this.team && s.blocksProjectile?.(this)) { this.burst(); return; }
    for (const t of gw.getHostileTargets(this.team)) {
      if (!t || t.isDead || t.isDestroyed || (this.skipProps && t.isProp) || (t.lifeState && t.lifeState !== 'Alive')) continue;
      if (this.hitSet?.has(t)) continue;
      const sx = Math.max(Math.min(px, this.x), Math.min(Math.max(px, this.x), t.x));
      if (Math.hypot(sx - t.x, ((t.z ?? this.z) - this.z) * DEPTH) > this.radius + (t.hitRadiusX ?? t.radius ?? 16) * .8) continue;
      if (Math.abs((t.worldHeight ?? 0) - this.height) > (t.hitHeightTolerance ?? 110) + 20) continue;
      const out = t.takeDamage(this.damage, Math.sign(this.vx || 1) * this.kx, this.lift, this.stun, false, 'spell');
      if (out?.perfect && t.team) { this.team = t.team; this.vx *= -1; this._vz *= -1; this.homing = null; this.life = Math.max(this.life, .8); return; }
      this.onHit?.(t, this);
      if (this.pierce) { (this.hitSet ??= new Set()).add(t); continue; }
      this.burst(); return;
    }
    if (this.life <= 0) this.burst();
  }
  burst() { if (this.isFinished) return; this.isFinished = true; combat.spawnHitSparks(this.x, this.y, this.facing, this.mat.edge, 6); this.onBurst?.(this); }
  render(ctx) {
    if (this.t < this.delay) return;
    const a = Math.atan2(this._vz * DEPTH * .32, this.vx); const c = Math.cos(a); const s = Math.sin(a); const k = this.size;
    const P = (u, v) => [this.x + u * c - v * s, this.y + u * s + v * c];
    for (let i = 1; i < this.trail.length; i++) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 * (1 - i / this.trail.length); ctx.fillStyle = this.mat.vein; ctx.fillRect(snap(this.trail[i][0]) - 1, snap(this.trail[i][1]) - 1, 2, 2); ctx.restore(); }
    if (this.kind === 'block') plate(ctx, [P(-k, -k), P(k, -k * .8), P(k * .9, k), P(-k, k * .9)], this.mat, this.seed ?? 3, { alpha: 1, glowEdge: .7, lit: .8 });
    else if (this.kind === 'crystal') plate(ctx, [P(k * 1.4, 0), P(0, -k * .7), P(-k, 0), P(0, k * .7)], this.mat, this.seed ?? 5, { alpha: 1, core: 1, glowEdge: 1 });
    else plate(ctx, [P(k * 1.8, 0), P(-k * .6, -k * .45), P(-k * .9, 0), P(-k * .6, k * .45)], this.mat, this.seed ?? 7, { alpha: 1, core: 1, glowEdge: .8 });
  }
}

// ── Breakable world props (instruments, anchors, plates, tablets …) ─────
// They join the hostile-target list of the other team (main.getHostileTargets),
// `hittableByAll` props also that of their own team (blossoms, resonance
// plates react to their owner's hits). Optional beam contact: heavyObject.
export class SigProp {
  constructor(sig, owner, x, z, { hp = 60, size = 18, duration = 8, hittableByAll = false, heavyObject = false } = {}) {
    this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.x = x; this.z = z;
    this.maxHp = this.hp = hp; this.hitRadiusX = size; this.halfX = size; this.halfZ = .06; this.size = size;
    this.isProp = true; this.isWorldProp = true; this.hittableByAll = hittableByAll; this.isHeavyObject = heavyObject; this.heightAboveGround = 20;
    this.worldHeight = 0; this.elevation = 0; this.surfaceHeight = 0; this.hitHeightTolerance = 150;
    this.t = 0; this.duration = duration; this.isFinished = false; this.isDead = false; this.hitFlash = 0; this.seed = sig.seed + Math.floor(Math.random() * 1000);
  }
  get y() { return groundYForDepth(this.z); }
  get fade() { return Math.max(0, Math.min(1, this.t / .25, (this.duration - this.t) / .35)); }
  takeDamage(amount, kx = 0, lift = 0, stun = 0, crit = false, kind = 'melee') {
    if (this.isDead || this.isFinished || !(amount > 0)) return { ignored: true };
    const by = currentAttacker();
    if (by && by.team === this.team) { this.onFriendlyHit?.(by, kx, amount, kind); return { friendly: true }; }
    this.hp -= amount; this.hitFlash = .14;
    combat.spawnHitSparks(this.x, this.y - this.size, Math.sign(kx) || 1, this.mat.edge, 6);
    this.onHostileHit?.(amount, kx, kind);
    if (this.hp <= 0) this.shatter();
    return {};
  }
  takeBeamDamage(dps, beam) { if (beam.team === this.team) this.onFriendlyBeam?.(beam, dps); else this.takeDamage(dps * .5, beam.facing, 0, 0, false, 'beam'); }
  ignoresBeam(beam) { return beam.team === this.team && !this.onFriendlyBeam; }
  shatter() {
    if (this.isDead) return;
    this.isDead = true; this.hp = 0; this.onShatter?.();
    combat.spawnShockwave(this.x, this.y - this.size * .6, this.size * 2.2, this.mat.vein);
    debris(this.x, this.y - this.size * .5, this.mat, this.seed, 10);
    this.duration = Math.min(this.duration, this.t + .4);
  }
  tick(dt) { this.t += dt; this.hitFlash = Math.max(0, this.hitFlash - dt); if (this.t >= this.duration) { if (!this.isDead) this.onExpire?.(); this.isFinished = true; } }
}

// Polygonal debris that tumbles off and fades (material, not dots).
const debrisList = [];
export function debris(x, y, mat, seed, n = 8, spread = 60) {
  for (let i = 0; i < n; i++) { const a = -Math.PI * (.1 + .8 * ((seed * 7 + i * 37) % 100) / 100); const sp = spread * (.5 + ((seed + i * 13) % 50) / 50); debrisList.push({ x, y, vx: Math.cos(a) * sp * (i % 2 ? 1 : -1), vy: Math.sin(a) * sp * 1.6, rot: i, vr: (i % 3 - 1) * 6, size: 3 + (i % 3), mat, seed: seed + i, t: 0, life: .7 + (i % 4) * .12 }); }
  if (debrisList.length > 160) debrisList.splice(0, debrisList.length - 160);
}
export class DebrisLayer {
  constructor() { this.isFinished = false; this.isSignatureDebris = true; }
  update(dt) { for (const d of debrisList) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 260 * dt; d.rot += d.vr * dt; } for (let i = debrisList.length - 1; i >= 0; i--) if (debrisList[i].t >= debrisList[i].life) debrisList.splice(i, 1); }
  render(ctx) { for (const d of debrisList) shard(ctx, d.x, d.y, d.size, d.rot, d.mat, d.seed, Math.max(0, 1 - d.t / d.life)); }
}

// ── Painter helpers (textured material, never a bare primitive) ─────────
// Ground ellipse with the environment's projection (ry = r · 0.32).
export const groundPt = (x, z, r, a) => [x + Math.cos(a) * r, groundYForDepth(z) + Math.sin(a) * r * .32];
export function segRing(ctx, x, z, r, mat, t, alpha, { segs = 12, thick = 5, spin = .3, gap = .62, seed = 1, glow = .6 } = {}) {
  for (let i = 0; i < segs; i++) {
    const a0 = i / segs * TAU + t * spin; const a1 = a0 + TAU / segs * gap;
    plate(ctx, [groundPt(x, z, r, a0), groundPt(x, z, r, a1), groundPt(x, z, r + thick, a1), groundPt(x, z, r + thick, a0)], mat, seed + i, { alpha, glowEdge: glow, pulse: .5 + .5 * Math.sin(t * 3 + i) });
  }
}
export function hexMark(ctx, x, z, r, mat, t, alpha, seed = 1) {
  for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU + Math.PI / 6; const a1 = a0 + TAU / 6; plate(ctx, [groundPt(x, z, r, a0), groundPt(x, z, r, a1), groundPt(x, z, r * .8, a1), groundPt(x, z, r * .8, a0)], mat, seed + i, { alpha, glowEdge: .9, pulse: .5 + .5 * Math.sin(t * 6 + i) }); }
}
export function crystal(ctx, x, y, w, h, mat, seed, alpha = 1, lean = 0) {
  plate(ctx, [[x - w * .5, y], [x - w * .55 + lean * .5, y - h * .7], [x + lean, y - h], [x + w * .55 + lean * .5, y - h * .7], [x + w * .5, y]], mat, seed, { alpha, glowEdge: .8, lit: .8, core: .4 });
}
export function slab(ctx, x, y, w, h, mat, seed, alpha = 1, skew = 0) {
  plate(ctx, [[x - w / 2 + skew, y - h], [x + w / 2 + skew, y - h + 1], [x + w / 2, y], [x - w / 2, y - 1]], mat, seed, { alpha, glowEdge: .6, lit: .8 });
}
export function thread(ctx, pts, color, width, alpha) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = alpha;
  ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(snap(px), snap(py)) : ctx.moveTo(snap(px), snap(py)))); ctx.stroke(); ctx.restore();
}
export function ribbon(ctx, pts, w, mat, seed, t, alpha) { band(ctx, pts, typeof w === 'function' ? w : () => w, mat, seed, { t, alpha }); }
export function sparks(ctx, pts, mat, t, seed, n = 6, alpha = 1) { fallout(ctx, pts, mat, t, seed, { count: n, alpha }); }
export { plate, shard };

// Line helpers for placement runes (start / end of a swipe).
export function lineOf(target, caster, maxLen = 260, minLen = 90) {
  let a = target?.start; let b = target?.end;
  if (!a || !b) {
    const c = { x: target?.x ?? caster.x + caster.facing * 120, z: target?.z ?? caster.z };
    const lateral = (target?.orientation ?? 'lateral') === 'lateral';
    const half = Math.max(minLen, Math.min(maxLen, target?.length || 160)) / 2;
    a = lateral ? { x: c.x - half, z: c.z } : { x: c.x, z: c.z - half / DEPTH };
    b = lateral ? { x: c.x + half, z: c.z } : { x: c.x, z: c.z + half / DEPTH };
  }
  const len = Math.hypot(b.x - a.x, (b.z - a.z) * DEPTH);
  if (len > maxLen) { const k = maxLen / len; b = { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k }; }
  return { a: { ...a }, b: { ...b } };
}
// Distance (ground px) of a point to segment a–b and the side (sign) it is on.
export function segInfo(a, b, x, z) {
  const ax = a.x; const az = a.z * DEPTH; const bx = b.x; const bz = b.z * DEPTH; const px = x; const pz = z * DEPTH;
  const dx = bx - ax; const dz = bz - az; const L2 = dx * dx + dz * dz || 1;
  const u = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
  const cx = ax + dx * u; const cz = az + dz * u;
  return { dist: Math.hypot(px - cx, pz - cz), u, side: Math.sign(dx * (pz - az) - dz * (px - ax)) || 1, nx: -dz / Math.sqrt(L2), nz: dx / Math.sqrt(L2), tx: dx / Math.sqrt(L2), tz: dz / Math.sqrt(L2) };
}

// ── Stances: player.signature ────────────────────────────────────────────
export function startStance(player, id, quality, data = {}) {
  const impl = IMPL[id]; const sig = SIGNATURES[id];
  if (player.signature) endStance(player, 'replaced');
  const duration = (impl.stance.duration ?? sig.duration ?? 6) * (quality?.duration ?? 1);
  player.signature = { id, sig, impl, t: 0, timer: duration, duration, quality, ...data };
  impl.stance.start?.(player, player.signature);
  return player.signature;
}
export function endStance(player, reason = 'expired') {
  const st = player.signature; if (!st) return;
  player.signature = null; player.isHovering = false;
  st.impl.stance.end?.(player, st, reason);
  combat.spawnShockwave(player.x, (player.y ?? 0) - 40, 36, st.sig.mat.vein);
  debris(player.x, (player.y ?? 0) - 50, st.sig.mat, st.sig.seed, 8);
}

// A timed effect: steps fire once at their time, `tick` runs every frame,
// `draw` renders (progress k = t / dur). Used for strikes and sequences.
export class SigSequence {
  constructor(sig, caster, { dur = 1, steps = [], draw = null, tick = null, x, z, data = {} } = {}) {
    this.sig = sig; this.mat = sig.mat; this.caster = caster; this.owner = caster; this.team = caster.team; this.facing = caster.facing || 1;
    this.x = x ?? caster.x; this.z = z ?? caster.z; this.t = 0; this.dur = dur; this.isFinished = false; this.hitSet = new Set();
    this.steps = steps.map((s) => ({ ...s, done: false })); this.draw = draw; this.tick = tick; Object.assign(this, data);
  }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt;
    for (const s of this.steps) if (!s.done && this.t >= s.at) { s.done = true; s.fn(this, gw); }
    this.tick?.(this, dt, gw);
    if (this.t >= this.dur) this.isFinished = true;
  }
  render(ctx) { this.draw?.(ctx, this, Math.min(1, this.t / this.dur)); }
  // Hit every foe matching inside(t, dx, dzPx) once.
  strike(gw, inside, damage, kx = 0, lift = 0, stun = .25, opts = {}) {
    let n = 0;
    for (const t of foesOf(gw, this.team, opts.objectives)) {
      if (this.hitSet.has(t) && !opts.again) continue;
      const dx = t.x - this.x; const dz = ((t.z ?? this.z) - this.z) * DEPTH;
      if (!inside(t, dx, dz)) continue;
      this.hitSet.add(t); n++;
      hit(t, damage * (this.power ?? 1), typeof kx === 'function' ? kx(t, dx, dz) : kx, lift, stun);
      opts.onHit?.(t);
    }
    return n;
  }
}
