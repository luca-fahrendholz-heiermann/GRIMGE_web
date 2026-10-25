// GRIMGE Prototype — signature specials S70–S73 (user, 20 Oct 2026; anime ideas,
// adapted — own names and looks):
//   S70 BANNWÜRFEL   a translucent cube seals the foe in (it cannot get out);
//                    tap again: ZERFALL — the cube collapses and crushes it
//   S71 ZORNSTRAHL   a charged beam: press the slot and hold (touch) or tap
//                    once (keys) — a red-black core grows in the hand, the beam
//                    gets wider; release / tap again: it fires through the lane
//                    and the recoil shoves the caster back (auto-fire when full)
//   S72 BLUTVERTRAG  a blood seal, smoke — a giant horned beast rises behind the
//                    caster, strikes ONE huge claw blow across the front, vanishes
//   S73 ZEITSTOPP    a field where every projectile freezes in mid-air (yours
//                    too); when the field ends they fly on
import { applyStatus } from './status_effects.js';
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
import { defineSignature, emit, foesOf, hit, plate, TAU, DEPTH } from './signature_core.js';
import { offerRecast } from './recast.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';

const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;
const mat = (dark, body, facet, vein, edge, spark) => ({ kind: 'crystal', dark, body, facet, vein, edge, spark, core: '#ffffff', glow: 'rgba(255,255,255,', edgeGlow: 'rgba(255,255,255,' });

// ── S70 Bannwürfel ───────────────────────────────────────────────────────
export const CUBE = Object.freeze({ half: 30, halfZ: .09, height: 74, window: 5, crush: 42 });
const CUBE_MAT = mat('#0d2b3a', '#4fc3f7', '#b3e5fc', '#e1f5fe', '#ffffff', '#e1f5fe');
export class SealCube {
  constructor(sig, owner, x, z, quality, gw) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.quality = quality; this.t = 0; this.isFinished = false;
    // Seal the nearest foe around the target point (or the point itself).
    const v = foesOf(gw, this.team).filter((t) => !t.isProp && Math.hypot(t.x - x, ((t.z ?? z) - z) * DEPTH) < 70).sort((a, b) => Math.hypot(a.x - x, ((a.z ?? z) - z) * DEPTH) - Math.hypot(b.x - x, ((b.z ?? z) - z) * DEPTH))[0];
    this.victim = v ?? null; this.x = v ? v.x : x; this.z = v ? (v.z ?? z) : z;
    this.crushT = null; this.endT = null;
  }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt;
    if (this.endT != null) { if (this.t - this.endT > .5) this.isFinished = true; return; }
    const v = this.victim;
    if (this.crushT != null) {
      const k = Math.min(1, (this.t - this.crushT) / .3);
      if (v && alive(v)) { v.x = this.x; if (Number.isFinite(v.z)) v.z = this.z; v.freeze?.(.1); }
      if (k >= 1 && !this.crushed) { this.crushed = true; if (v && alive(v)) hit(v, Math.round(CUBE.crush * (this.quality?.power ?? 1)), 0, 120, .7, true); combat.shakeCamera(9, .25); audio.playImpact?.(true); this.endT = this.t; }
      return;
    }
    // Sealed: the foe cannot leave the cube.
    if (v && alive(v)) {
      v.x = Math.max(this.x - CUBE.half + 8, Math.min(this.x + CUBE.half - 8, v.x));
      if (Number.isFinite(v.z)) v.z = Math.max(this.z - CUBE.halfZ * .6, Math.min(this.z + CUBE.halfZ * .6, v.z));
      v.kbVelX = 0;
    }
    if (this.t > CUBE.window + .2) this.dissolve();
  }
  collapse() { if (this.crushT != null || this.endT != null) return false; this.crushT = this.t; audio.playSlash?.(.5); return true; }
  dissolve() { if (this.endT == null) this.endT = this.t; }
  render(ctx) {
    const grow = Math.min(1, this.t / .18);
    const shrink = this.crushT != null ? 1 - .75 * Math.min(1, (this.t - this.crushT) / .3) : 1;
    const fade = this.endT != null ? Math.max(0, 1 - (this.t - this.endT) / .5) : 1;
    const s = grow * shrink; const hw = CUBE.half * s; const h = CUBE.height * s; const dx = 12 * s; const dy = 10 * s;
    const x = this.x; const y = this.y + 6;
    // Back face, sides and front face of a 2.5D cube.
    const front = [[x - hw, y], [x + hw, y], [x + hw, y - h], [x - hw, y - h]];
    const back = front.map(([px, py]) => [px + dx, py - dy]);
    ctx.save(); ctx.globalAlpha = .22 * fade; ctx.fillStyle = '#4fc3f7';
    ctx.beginPath(); back.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill();
    ctx.beginPath(); front.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = .95 * fade; ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = 2;
    for (const face of [front, back]) { ctx.beginPath(); face.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(front[i][0], front[i][1]); ctx.lineTo(back[i][0], back[i][1]); ctx.stroke(); }
    // A seal glyph on the front face, pulsing.
    ctx.globalAlpha = (.5 + .4 * Math.sin(this.t * 8)) * fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y - h / 2, 9 * s, 0, TAU); ctx.moveTo(x - 9 * s, y - h / 2); ctx.lineTo(x + 9 * s, y - h / 2); ctx.moveTo(x, y - h / 2 - 9 * s); ctx.lineTo(x, y - h / 2 + 9 * s); ctx.stroke();
    ctx.restore();
    if (this.crushed) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const k = (this.t - this.endT) / .5; plate(ctx, [[x + Math.cos(a) * 30 * k - 4, y - 36 + Math.sin(a) * 26 * k], [x + Math.cos(a) * 30 * k + 4, y - 40 + Math.sin(a) * 26 * k], [x + Math.cos(a) * 30 * k, y - 30 + Math.sin(a) * 26 * k]], CUBE_MAT, 7000 + i, { alpha: Math.max(0, 1 - k) }); }
  }
}
defineSignature('S70', {
  cast(c) {
    const p = c.caster; const gw = globalThis.window?.gameWorld;
    const x = c.target?.x ?? p.x + (p.facing || 1) * 140; const z = c.target?.z ?? p.z;
    const cube = emit(new SealCube(c.sig, p, x, z, c.quality, gw), c.quality);
    offerRecast(p, { window: CUBE.window, label: 'ZERFALL', valid: () => !cube.isFinished && cube.crushT == null && cube.endT == null, stage2: () => cube.collapse(), expire: () => cube.dissolve() });
  }
});

// ── S71 Zornstrahl ───────────────────────────────────────────────────────
export const WRATH = Object.freeze({ full: 2, length: 520, minWidth: 10, maxWidth: 46, base: 20, bonus: 44, recoil: 380, fire: .35 });
export class WrathBeam {
  constructor(sig, owner, quality) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.quality = quality; this.f = owner.facing || 1;
    this.t = 0; this.charge = 0; this.phase = 'charge'; this.fireT = null; this.hits = new Set(); this.isFinished = false; this.x = owner.x; this.z = owner.z;
  }
  get y() { return groundYForDepth(this.z); }
  get k() { return Math.min(1, this.charge / WRATH.full); }
  get beamWidth() { return WRATH.minWidth + (WRATH.maxWidth - WRATH.minWidth) * this.k; }
  update(dt, gw) {
    this.t += dt; const p = this.owner;
    if (!alive(p)) { this.isFinished = true; return; }
    if (this.phase === 'charge') {
      // Rooted while charging; a hit breaks the charge (no shot).
      if (p.state === 'hurt') { this.phase = 'broken'; this.fireT = this.t; return; }
      this.charge += dt; p.state = 'heavyStrike'; p.stateTimer = .1; p.vx = 0; p.vz = 0; this.x = p.x; this.z = p.z; this.f = p.facing || 1;
      if (this.charge >= WRATH.full + .5) this.fire(); // auto-fire when held too long
      return;
    }
    if (this.phase === 'fire') {
      // Everyone in the beam's lane is struck once.
      const half = this.beamWidth * .5;
      for (const t of foesOf(gw, this.team)) {
        if (t.isProp || this.hits.has(t)) continue;
        const along = (t.x - this.x) * this.f; if (along < 0 || along > WRATH.length) continue;
        if (Math.abs(((t.z ?? this.z) - this.z) * DEPTH) > half + 8) continue;
        this.hits.add(t); hit(t, Math.round((WRATH.base + WRATH.bonus * this.k) * (this.quality?.power ?? 1)), this.f * (180 + 260 * this.k), 80, .5, this.k > .8);
      }
      if (this.t - this.fireT > WRATH.fire) { this.phase = 'done'; this.fireT = this.t; }
      return;
    }
    if (this.t - this.fireT > .4) this.isFinished = true;
  }
  fire() {
    if (this.phase !== 'charge') return false;
    this.phase = 'fire'; this.fireT = this.t;
    const p = this.owner; p.kbVelX = -this.f * WRATH.recoil * (.4 + .6 * this.k); p.state = 'heavyStrike'; p.stateTimer = .3;
    combat.shakeCamera(6 + 10 * this.k, .3); combat.triggerHitstop?.(Math.round(2 + 4 * this.k)); audio.playImpact?.(true);
    return true;
  }
  render(ctx) {
    const p = this.owner; const hy = (p.y ?? this.y) - 44; const hx = p.x + this.f * 18;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (this.phase === 'charge') {
      // A red-black core grows in the hand; streaks get sucked in.
      const r = 5 + 13 * this.k; const pulse = .7 + .3 * Math.sin(this.t * 22);
      ctx.globalAlpha = .9; ctx.fillStyle = '#b71c1c'; ctx.beginPath(); ctx.arc(hx, hy, r + 4, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#120000'; ctx.beginPath(); ctx.arc(hx, hy, r * .7, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pulse; ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, r + 7, 0, TAU); ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + this.t * 4; const rr = (36 + 14 * this.k) * (1 - ((this.t * 2.5 + i / 8) % 1)) + r; ctx.globalAlpha = .8; ctx.strokeStyle = i % 2 ? '#ff8a80' : '#ffffff'; ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * .7); ctx.lineTo(hx + Math.cos(a) * (rr - 6), hy + Math.sin(a) * (rr - 6) * .7); ctx.stroke(); }
      // Charge meter under the caster.
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .85; ctx.fillStyle = '#1a0000'; ctx.fillRect(Math.round(p.x - 20), Math.round((p.y ?? this.y) + 4), 40, 4); ctx.fillStyle = this.k >= 1 ? '#ffffff' : '#ff5252'; ctx.fillRect(Math.round(p.x - 20), Math.round((p.y ?? this.y) + 4), Math.round(40 * this.k), 4);
    } else if (this.phase === 'fire' || this.phase === 'done') {
      const fade = this.phase === 'done' ? Math.max(0, 1 - (this.t - this.fireT) / .4) : 1; const w = this.beamWidth * (.4 + .6 * fade);
      const x0 = hx; const x1 = hx + this.f * WRATH.length; const by = groundYForDepth(this.z) - 44;
      for (const [ww, c, a] of [[w, '#4a0000', .7], [w * .75, '#d50000', .85], [w * .45, '#ff5252', .95], [w * .18, '#ffffff', 1]]) { ctx.globalAlpha = a * fade; ctx.fillStyle = c; ctx.fillRect(Math.min(x0, x1), Math.round(by - ww / 2), Math.abs(x1 - x0), Math.max(1, Math.round(ww))); }
      ctx.globalAlpha = fade; ctx.fillStyle = '#ff8a80'; ctx.beginPath(); ctx.arc(x0, by, w * .7, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}
defineSignature('S71', {
  cast(c) {
    const p = c.caster; const beam = emit(new WrathBeam(c.sig, p, c.quality), c.quality);
    offerRecast(p, { window: WRATH.full + .6, label: 'LOSLASSEN: FEUER', releaseOnUp: true, valid: () => beam.phase === 'charge', stage2: () => beam.fire(), expire: () => beam.fire() });
  }
});

// ── S72 Blutvertrag ──────────────────────────────────────────────────────
// The pact costs blood (a share of the caster's HP); the beast's blow crushes everything in
// front (wide), throws it down, makes it bleed and leaves it frozen in terror for a moment.
export const PACT = Object.freeze({ seal: .45, rise: .4, strike: .3, sink: .6, reach: 320, depth: 72, damage: 86, bloodCost: .08, terror: .9, launch: 420 });
const BEAST = mat('#1a0c08', '#5d2e1f', '#8d4b32', '#ff7043', '#ffccbc', '#ffab91');
export class BloodPact {
  constructor(sig, owner, quality) { this.sig = sig; this.owner = owner; this.team = owner.team; this.quality = quality; this.f = owner.facing || 1; this.x = owner.x - this.f * 30; this.z = Math.max(.04, owner.z - .06); this.t = 0; this.struck = false; this.isFinished = false; }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt; const p = this.owner;
    if (this.t < PACT.seal) { p.state = 'heavyStrike'; p.stateTimer = .1; p.vx = 0; p.vz = 0; }
    // The price: the caster's own blood seals the pact (never lethal).
    if (!this.paid) { this.paid = true; const cost = Math.floor((p.maxHp ?? 0) * PACT.bloodCost); if (cost > 0 && p.hp > cost + 1) { p.hp -= cost; combat.spawnDamageText?.(p.x, (p.y ?? 0) - 70, `−${cost} BLUT`, { color: '#d50000' }); } }
    const strikeAt = PACT.seal + PACT.rise + PACT.strike * .6;
    if (!this.struck && this.t >= strikeAt) {
      this.struck = true;
      // ONE huge claw blow across the front.
      for (const t of foesOf(gw, this.team)) {
        if (t.isProp) continue;
        const along = (t.x - p.x) * this.f;
        if (along < -30 || along > PACT.reach || Math.abs(((t.z ?? p.z) - p.z) * DEPTH) > PACT.depth) continue;
        hit(t, Math.round(PACT.damage * (this.quality?.power ?? 1)), this.f * 520, PACT.launch, .9, true);
        applyStatus(t, 'bleed', { force: true }); t.freeze?.(PACT.terror);
        combat.spawnHitSparks?.(t.x, (t.y ?? 0) - 40, this.f, '#ff1744', 22);
      }
      combat.shakeCamera(16, .5); combat.triggerHitstop?.(7); audio.playImpact?.(true);
      combat.spawnShockwave(p.x + this.f * 140, groundYForDepth(p.z), 150, '#ff7043');
    }
    if (this.t > PACT.seal + PACT.rise + PACT.strike + PACT.sink) this.isFinished = true;
  }
  render(ctx) {
    const p = this.owner; const f = this.f; const gy = groundYForDepth(p.z); const t = this.t;
    ctx.save();
    // The blood seal on the ground, smoke when the beast arrives / leaves.
    const sealA = t < PACT.seal + PACT.rise ? Math.min(1, t / .2) : Math.max(0, 1 - (t - PACT.seal - PACT.rise) / .4);
    ctx.globalAlpha = sealA; ctx.strokeStyle = '#d50000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, gy, 50, 16, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t; ctx.beginPath(); ctx.moveTo(p.x, gy); ctx.lineTo(p.x + Math.cos(a) * 50, gy + Math.sin(a) * 16); ctx.stroke(); }
    if (t < PACT.seal) { ctx.fillStyle = '#d50000'; ctx.beginPath(); ctx.arc(p.x + f * 10, (p.y ?? gy) - 44 + t * 30, 3, 0, TAU); ctx.fill(); ctx.restore(); return; }
    const rk = Math.min(1, (t - PACT.seal) / PACT.rise); const sinkK = Math.max(0, (t - PACT.seal - PACT.rise - PACT.strike) / PACT.sink);
    const rise = rk * (1 - sinkK); const by = gy - 10; const bx = p.x - f * 34;
    // Smoke puffs.
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const r = 30 + 40 * (rk < 1 ? rk : sinkK); ctx.globalAlpha = .5 * (rk < 1 ? 1 - rk : sinkK); ctx.fillStyle = '#e0e0e0'; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * r, by - 60 + Math.sin(a) * r * .5, 18, 0, TAU); ctx.fill(); }
    if (rise <= 0) { ctx.restore(); return; }
    // The beast: a huge horned head and shoulders rising behind the caster.
    const H = 170 * rise; const top = by - H; ctx.globalAlpha = 1;
    // Solid body first (the plates add facets and glow on top).
    const solid = (pts, c = '#3e1f14') => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill(); };
    solid([[bx - 60, by], [bx - 52, top + 40], [bx - 26, top + 6], [bx + 26, top + 6], [bx + 52, top + 40], [bx + 60, by]]);
    solid([[bx - 30, top + 10], [bx - 50, top - 30], [bx - 18, top + 4]], '#2a140c'); solid([[bx + 30, top + 10], [bx + 50, top - 30], [bx + 18, top + 4]], '#2a140c');
    plate(ctx, [[bx - 60, by], [bx - 52, top + 40], [bx - 26, top + 6], [bx + 26, top + 6], [bx + 52, top + 40], [bx + 60, by]], BEAST, 7100, { alpha: 1, glowEdge: .6 });
    plate(ctx, [[bx - 30, top + 10], [bx - 50, top - 30], [bx - 18, top + 4]], BEAST, 7101, { alpha: 1 });
    plate(ctx, [[bx + 30, top + 10], [bx + 50, top - 30], [bx + 18, top + 4]], BEAST, 7102, { alpha: 1 });
    ctx.fillStyle = '#ffeb3b'; ctx.fillRect(Math.round(bx - 18), Math.round(top + 34), 8, 4); ctx.fillRect(Math.round(bx + 10), Math.round(top + 34), 8, 4);
    // The claw: raised, then sweeping down across the front.
    const sk = Math.max(0, Math.min(1, (t - PACT.seal - PACT.rise) / PACT.strike));
    const ax = bx + f * (30 + 200 * sk); const ay = top + 50 + (by - top - 50) * sk;
    solid([[bx + f * 20, top + 60], [ax - f * 10, ay - 20], [ax + f * 16, ay - 6], [bx + f * 34, top + 86]]);
    plate(ctx, [[bx + f * 20, top + 60], [ax - f * 10, ay - 20], [ax + f * 16, ay - 6], [bx + f * 34, top + 86]], BEAST, 7103, { alpha: 1, glowEdge: .7 });
    for (let i = -1; i <= 1; i++) plate(ctx, [[ax, ay - 8 + i * 8], [ax + f * 34, ay + i * 10], [ax + f * 6, ay + 2 + i * 8]], mat('#2b1d14', '#e0d6c8', '#fff8e1', '#ffffff', '#ffffff', '#ffffff'), 7104 + i, { alpha: 1 });
    if (sk > .5 && sk < 1) { ctx.globalAlpha = (1 - sk) * 2; ctx.strokeStyle = '#ffccbc'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bx, top + 60, 200, f > 0 ? -.2 : Math.PI - .9, f > 0 ? .9 : Math.PI + .2); ctx.stroke(); }
    ctx.restore();
  }
}
defineSignature('S72', { cast(c) { emit(new BloodPact(c.sig, c.caster, c.quality), c.quality); } });

// ── S73 Zeitstopp ────────────────────────────────────────────────────────
export const STOP = Object.freeze({ radius: 120, life: 5 });
// Projectiles: moving spells (and the world's bolts / orbs) — not fields, walls or this field.
const isProjectile = (s) => s && !s.isGroundDecal && !s.isTimeField && Number.isFinite(s.vx) && Math.abs(s.vx) > 40 && Number.isFinite(s.x);
export class TimeStopField {
  constructor(sig, owner, x, z, quality) { this.sig = sig; this.owner = owner; this.team = owner.team; this.x = x; this.z = z; this.quality = quality; this.t = 0; this.life = STOP.life * (quality?.duration ?? 1); this.frozen = new Set(); this.isFinished = false; this.isTimeField = true; }
  get y() { return groundYForDepth(this.z); }
  inside(o) { return Math.hypot(o.x - this.x, ((o.z ?? this.z) - this.z) * DEPTH) < STOP.radius; }
  update(dt, gw) {
    this.t += dt;
    if (this.t >= this.life) { this.release(); this.isFinished = true; return; }
    for (const s of this.system?.activeSpells ?? []) if (!this.frozen.has(s) && isProjectile(s) && this.inside(s)) { this.frozen.add(s); s.timeFrozen = true; }
    for (const pr of gw?.projectiles ?? []) if (!this.frozen.has(pr) && Number.isFinite(pr.vx) && this.inside(pr)) { this.frozen.add(pr); pr.timeFrozen = true; }
  }
  release() { for (const s of this.frozen) s.timeFrozen = false; this.frozen.clear(); }
  get fineVfx() { return spellSheetReady('time_dome'); }
  render(ctx) {
    const x = this.x; const y = this.y; const R = STOP.radius; const ry = R * .34;
    const a = Math.min(1, this.t / .2) * Math.min(1, (this.life - this.t) / .3);
    if (spellSheetReady('time_dome')) {
      // Hand-drawn time-stop dome (art/authoring/vfx_runes2.cjs) + frozen projectiles marked with a small dial.
      drawSpellSprite(ctx, 'time_dome', Math.floor(this.t * 4) % 8, x, y, { scale: R / 120 * (.6 + .4 * Math.min(1, this.t / .2)), alpha: a });
      for (const s of this.frozen) { if (!Number.isFinite(s.x)) continue; const sy = (s.y ?? groundYForDepth(s.z ?? this.z)) - (s.h ?? s.height ?? 40); ctx.fillStyle = '#eef3fa'; for (let k = 0; k < 12; k++) { const ang = k / 12 * TAU; ctx.fillRect(Math.round(s.x + Math.cos(ang) * 11), Math.round(sy + Math.sin(ang) * 11), 2, 2); } }
      return;
    }
    ctx.save(); ctx.globalAlpha = .16 * a; ctx.fillStyle = '#cfd8dc'; ctx.beginPath(); ctx.ellipse(x, y - R * .45, R, R * .55, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = .7 * a; ctx.strokeStyle = '#eceff1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, R, ry, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(x, y - R * .45, R, R * .55, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // A frozen clock face hovering above the field.
    const cy = y - R * .95; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, cy, 16, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, cy - 11); ctx.moveTo(x, cy); ctx.lineTo(x + 8, cy + 3); ctx.stroke();
    // Frozen projectiles get a pale ring.
    for (const s of this.frozen) { if (!Number.isFinite(s.x)) continue; const sy = (s.y ?? groundYForDepth(s.z ?? this.z)) - (s.h ?? s.height ?? 40); ctx.globalAlpha = .8 * a; ctx.strokeStyle = '#eceff1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, sy, 12, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
}
defineSignature('S73', {
  cast(c) {
    const p = c.caster; const x = c.target?.x ?? p.x + (p.facing || 1) * 160; const z = c.target?.z ?? p.z;
    emit(new TimeStopField(c.sig, p, x, z, c.quality), c.quality);
    combat.spawnShockwave(x, groundYForDepth(z), STOP.radius, '#eceff1');
  }
});
