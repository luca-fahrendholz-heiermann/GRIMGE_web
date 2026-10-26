// GRIMGE Prototype — A10 KONSTRUKTPANZER (user, 26 Oct 2026: "als iron man verwandlung passt auch die schildkröten
// variante die sich zur kugel machen kann um gegner anzugreifen" — after reference art of a turtle-like tech
// armour; own adaptation, no foreign character; Atlas II concept "Konstruktpanzer"). The hero's own sprite becomes
// green armour plate with cyan trims and a closed helmet (form_recolors.js); a hex-plated carapace sits on the back.
//   forward  short HANDKANONE    the arm cannon fires three energy rings down the lane
//            full  KERNSTRAHL    a long beam from the chest core
//   up       short SCHUBSTOSS    thrusters blast the hero up, foes close by are launched
//            full  RAKETENFÄCHER mini rockets arc onto up to three foes ahead
//   down     short SCHALENSCHILD a hex aura shield (absorbs damage) pushes everyone away
//            full  SCHALENROLLE  the hero curls into the armoured ball and steers it, running foes over at speed
//   passive  every 6 s the aura shield recharges a little (30).
import { ARCANE_MOVES, ARCANE_CHARGE } from './arcane_moves.js';
import { SigSequence, foesOf, hit, DEPTH } from './signature_core.js';
import { hashStr, TAU } from './buff_v32_kit.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { drawSpellSprite, spellSheetReady, drawSheetBeam } from './spell_visuals.js';

export const KONSTRUKT = Object.freeze({ shieldEvery: 6, shieldGain: 30, shieldCap: 60 });
// The steered shell roll: duration, start / top speed (px/s), steering grip, hits and speed-scaled damage.
export const ROLL = Object.freeze({ dur: 2.8, start: 300, max: 540, grip: 5, hits: 14, dmg: 10, dmgSpeed: 18 });
const fade = (k, inT = .1, outT = .3) => Math.max(0, Math.min(1, k / inT, (1 - k) / outT));
const ahead = (len, w = 26) => (s) => (t, dx, dz) => dx * s.facing > -8 && dx * s.facing < len && Math.abs(dz) < w;
const around = (r) => () => (t, dx, dz) => Math.hypot(dx, dz) < r;
// While a technique runs it holds the cannon itself: the idle fore-arm cannon (armor_extras.js) hides (timestamp).
const seq = (f, p, o) => { const s = new SigSequence({ mat: f.mat, seed: hashStr(f.id) }, p, { ...o, tick: (sq, dt, gw) => { sq.caster._kpBusyUntil = performance.now() + 120; o.tick?.(sq, dt, gw); } }); s.fineVfx = true; return s; };
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const sprite = (ctx, name, frame, x, y, o = {}) => { if (spellSheetReady(name)) drawSpellSprite(ctx, name, frame, x, y, { anchor: 'center', ...o }); };
// The arm cannon held at the fore hand (sheet faces right, grip at its left end).
export function armCannon(ctx, c, frame, alpha = 1) {
  const f = c.facing || 1; const x = c.x + f * 20; const y = c.y - 44;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(f, 1); sprite(ctx, 'kp_cannon', frame, 14, 0, { alpha }); ctx.restore();
}
// A crisp pixel ellipse (energy rings round the ball, thruster rings).
function pixRing(ctx, x, y, rx, ry, color, a = 1, rot = 0) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; const n = Math.max(12, Math.round((rx + ry) * 1.6));
  for (let i = 0; i < n; i++) { const t = i / n * TAU; const ex = Math.cos(t) * rx; const ey = Math.sin(t) * ry; ctx.fillRect(Math.round(x + ex * Math.cos(rot) - ey * Math.sin(rot)), Math.round(y + ex * Math.sin(rot) + ey * Math.cos(rot)), 2, 2); }
  ctx.restore();
}
const muzzle = (c) => [c.x + (c.facing || 1) * 58, c.y - 44];

// A mini rocket arcing from the shoulder onto a target position, exploding there.
class KpRocket {
  constructor(s, from, to, delay) { Object.assign(this, { s, team: s.team, caster: s.caster, owner: s.caster, from, to, t: -delay, dur: .55, isFinished: false, fineVfx: true, z: to.z }); }
  get x() { return this.pos()[0]; }
  get y() { return this.pos()[1]; }
  pos() { const k = Math.max(0, Math.min(1, this.t / this.dur)); const x = this.from[0] + (this.to.x - this.from[0]) * k; const gy = groundYForDepth(this.to.z); const y0 = this.from[1]; const y = y0 + (gy - 20 - y0) * k - Math.sin(k * Math.PI) * 70; return [x, y]; }
  update(dt, gw) {
    this.t += dt; if (this.t < this.dur) return;
    this.isFinished = true;
    for (const t of foesOf(gw, this.team)) if (Math.hypot(t.x - this.to.x, ((t.z ?? this.to.z) - this.to.z) * DEPTH) < 42) hit(t, 18 * (this.s.power ?? 1), Math.sign(t.x - this.from[0] || 1) * 160, 160, .35);
    combat.spawnHitSparks(this.to.x, groundYForDepth(this.to.z) - 20, 1, '#a8f6ff', 10); combat.shakeCamera(3, .08);
    const sys = this.s.system; const ex = this.to.x; const ez = this.to.z;
    sys?.activeSpells?.push({ fineVfx: true, isVisualOnly: true, x: ex, z: ez, t: 0, isFinished: false, update(d) { this.t += d; if (this.t > .3) this.isFinished = true; }, render(ctx) { sprite(ctx, 'kp_ring', Math.min(3, Math.floor(this.t * 13)), ex, groundYForDepth(ez) - 20, { scale: 1 + this.t * 5 }); } });
  }
  render(ctx) {
    if (this.t < 0) return; const [x, y] = this.pos(); const [x2, y2] = (() => { const t0 = this.t; this.t += .02; const p = this.pos(); this.t = t0; return p; })(); const a = Math.atan2(y2 - y, x2 - x);
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a); px(ctx, -6, -2, 10, 4, '#14181c'); px(ctx, -5, -1, 8, 2, '#7a848c'); px(ctx, 3, -1, 2, 2, '#3ad0e0'); px(ctx, -9, -1, 3, 2, (Math.floor(this.t * 30) % 2) ? '#a8f6ff' : '#3ad0e0'); ctx.restore();
  }
}

ARCANE_MOVES.A10 = [
  // forward short — HANDKANONE: three energy rings fly 320 px down the lane.
  (f, p) => seq(f, p, { dur: .62, steps: [.08, .2, .32].map((at) => ({ at, fn: (s, gw) => s.strike(gw, ahead(320, 22)(s), 10, (t, dx) => Math.sign(dx || s.facing) * 120, 20, .25, { again: true }) })),
    draw: (ctx, s, k) => { const c = s.caster; armCannon(ctx, c, s.t < .4 && Math.floor(s.t / .06) % 2 === 0 ? 2 : 1, fade(k, .05, .2)); const [mx, my] = muzzle(c); for (const at of [.08, .2, .32]) { const e = s.t - at; if (e < 0 || e > .36) continue; sprite(ctx, 'kp_ring', Math.floor(e * 20) % 4, mx + s.facing * e * 900, my); } } }),
  // forward full — KERNSTRAHL: a long beam from the chest core (eight ticks, a strong last one).
  (f, p) => seq(f, p, { dur: 1.15, steps: [...Array.from({ length: 8 }, (_, i) => ({ at: .15 + i * .1, fn: (s, gw) => s.strike(gw, ahead(380, 22)(s), 7, (t, dx) => Math.sign(dx || s.facing) * 60, 10, .2, { again: true }) })), { at: 1, fn: (s, gw) => s.strike(gw, ahead(380, 26)(s), 30, (t, dx) => Math.sign(dx || s.facing) * 320, 120, .5, { again: true }) }],
    draw: (ctx, s, k) => { const c = s.caster; const x0 = c.x + s.facing * 12; const y0 = c.y - 56; pixRing(ctx, x0, y0, 5 + Math.sin(s.t * 40) * 2, 5, '#a8f6ff', fade(k, .05, .2)); if (s.t > .12 && s.t < 1.08) { const L = 380 * Math.min(1, (s.t - .12) * 6); if (!drawSheetBeam(ctx, 'ice', x0, y0, x0 + s.facing * L, y0, s.t, fade(k, .05, .15))) { px(ctx, Math.min(x0, x0 + s.facing * L), y0 - 3, L, 6, '#3ad0e0'); px(ctx, Math.min(x0, x0 + s.facing * L), y0 - 1, L, 2, '#ffffff'); } } } }),
  // up short — SCHUBSTOSS: thrusters throw the hero up; foes close by are launched.
  (f, p) => seq(f, p, { dur: .55, steps: [{ at: .06, fn: (s, gw) => { const c = s.caster; s.strike(gw, around(56)(s), 22, (t, dx) => Math.sign(dx || 1) * 80, 480, .4); c.grounded = false; c.vElevation = Math.max(c.vElevation ?? 0, 520); c.jumpsLeft = 0; } }],
    draw: (ctx, s, k) => { const c = s.caster; for (let i = 0; i < 3; i++) pixRing(ctx, c.x, c.y + 4 + i * 6 * Math.min(1, s.t * 4), 12 + i * 6 + s.t * 30, 4 + i * 2, i ? '#3ad0e0' : '#ffffff', fade(k, .02, .4) * (1 - i * .25)); } }),
  // up full — RAKETENFÄCHER: six mini rockets arc onto up to three foes ahead (or spread down the lane).
  (f, p) => seq(f, p, { dur: .9, steps: [{ at: .1, fn: (s, gw) => { const c = s.caster; const tg = foesOf(gw, s.team).filter((t) => (t.x - c.x) * s.facing > 0 && Math.abs(t.x - c.x) < 440).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x)).slice(0, 3);
      for (let i = 0; i < 6; i++) { const t = tg[i % Math.max(1, tg.length)]; const to = t ? { x: t.x, z: t.z ?? c.z } : { x: c.x + s.facing * (120 + i * 45), z: c.z }; s.system?.addSpell(new KpRocket(s, [c.x - s.facing * 10, c.y - 70], to, i * .07), 'B'); } } }],
    draw: (ctx, s, k) => { const c = s.caster; for (const d of [-1, 1]) pixRing(ctx, c.x - s.facing * 10 + d * 6, c.y - 70, 3, 3, '#3ad0e0', fade(k, .05, .3)); } }),
  // down short — SCHALENSCHILD: the hex aura shield (absorbs damage) and a push all around.
  (f, p) => seq(f, p, { dur: .8, steps: [{ at: .05, fn: (s, gw) => { const c = s.caster; c.arcaneShield = Math.max(c.arcaneShield ?? 0, 60); c.arcaneShieldTimer = Math.max(c.arcaneShieldTimer ?? 0, 4); s.strike(gw, around(78)(s), 14, (t, dx) => Math.sign(dx || 1) * 280, 60, .35); combat.shakeCamera(3, .08); } }],
    draw: (ctx, s, k) => { const c = s.caster; sprite(ctx, 'kp_shield', Math.floor(s.t * 10) % 4, c.x, c.y + 6, { anchor: 'base', alpha: .75 * fade(k, .06, .35), scale: .8 + .2 * Math.min(1, s.t * 6) }); } }),
  // down full — SCHALENROLLE: curl into the armoured ball and steer it yourself (move input) for ~2.8 s; foes in the
  // way are run over — the faster the ball, the harder the hit and the further they fly. Walls bounce the ball.
  (f, p) => seq(f, p, { dur: ROLL.dur + .3, data: { bx: p.x, bz: p.z, vx: (p.facing || 1) * ROLL.start, vz: 0, recent: new Map(), hits: 0, dist: 0 },
    steps: [{ at: ROLL.dur + .15, fn: (s, gw) => { const c = s.caster; s.x = c.x; s.z = c.z; s.strike(gw, around(54)(s), 20, (t, dx) => Math.sign(dx || 1) * 260, 200, .4, { again: true }); combat.spawnHitSparks(c.x, c.y - 24, 1, '#a8f6ff', 12); } }],
    tick: (s, dt, gw) => {
      const c = s.caster; if (s.t < .12 || s.t > ROLL.dur + .12) return;
      c._shellSpinUntil = (c.animTime ?? 0) + .12; c.invulnerableTimer = Math.max(c.invulnerableTimer ?? 0, .12); c.rootTimer = Math.max(c.rootTimer ?? 0, .12);
      c.vx = 0; c.vz = 0; c.elevation = 0; c.vElevation = 0; c.grounded = true; c.canAttack = false; /* inside the ball: no walking, jumps or swings */
      // Walls: the collision moved the hero off the ball's path → bounce.
      if (Math.abs(c.x - s.bx) > 2) { s.vx = -s.vx * .6; s.bx = c.x; }
      if (Math.abs((c.z - s.bz) * DEPTH) > 2) { s.vz = -s.vz * .6; s.bz = c.z; }
      // Steering: the move input pulls the velocity toward it; without input the ball keeps rolling (light friction).
      const m = c._moveIntent; const mx = m?.x ?? 0; const mz = m?.z ?? 0;
      if (Math.hypot(mx, mz) > .1) { s.vx += (mx * ROLL.max - s.vx) * Math.min(1, dt * ROLL.grip); s.vz += (mz * ROLL.max * .6 - s.vz) * Math.min(1, dt * ROLL.grip); }
      else { s.vx *= 1 - dt * .4; s.vz *= 1 - dt * 2; }
      s.bx += s.vx * dt; s.bz += s.vz / DEPTH * dt; const sp = Math.hypot(s.vx, s.vz); s.dist += sp * dt;
      if (Math.abs(s.vx) > 20) c.facing = Math.sign(s.vx);
      for (const [t, cd] of s.recent) { if (cd - dt <= 0) s.recent.delete(t); else s.recent.set(t, cd - dt); }
      if (s.hits < ROLL.hits) for (const t of foesOf(gw, s.team)) {
        if (s.recent.has(t) || Math.abs(t.x - s.bx) > 26 || Math.abs(((t.z ?? s.bz) - s.bz) * DEPTH) > 24) continue;
        const q = Math.min(1, sp / ROLL.max); const dir = Math.sign(s.vx || c.facing || 1);
        hit(t, (ROLL.dmg + q * ROLL.dmgSpeed) * (s.power ?? 1), dir * (180 + q * 320), 100 + q * 160, .3 + q * .2); s.hits++; s.recent.set(t, .4);
        combat.spawnHitSparks(t.x, t.y - 24, dir, '#a8f6ff', 6 + Math.round(q * 8)); combat.shakeCamera(2 + q * 4, .06 + q * .06);
        s.vx *= .85; s.vz *= .85; // the impact costs a little speed
      }
      c.x = s.bx; c.z = s.bz;
    },
    draw: (ctx, s, k) => {
      const c = s.caster; const end = ROLL.dur + .12; const curl = s.t < .12 ? s.t / .12 : s.t > end ? Math.max(0, 1 - (s.t - end) / .12) : 1; if (curl <= 0) return;
      const y = groundYForDepth(c.z) - (c.surfaceHeight ?? 0) - 20 * curl; const fr = Math.floor(s.dist / 9) % 8; const frame = s.vx >= 0 ? fr : 7 - fr;
      sprite(ctx, 'kp_shell', frame, c.x, y, { scale: .5 + .5 * curl });
      if (curl >= 1) { const q = Math.min(1, Math.hypot(s.vx, s.vz) / ROLL.max); pixRing(ctx, c.x, y, 28, 9, '#a8f6ff', .9, s.t * (3 + q * 6)); pixRing(ctx, c.x, y, 30, 7, '#3ad0e0', .8, -s.t * (2.4 + q * 5) + 1);
        // Speed streaks behind the ball.
        if (q > .4) for (let i = 1; i <= 3; i++) { const bx = c.x - Math.sign(s.vx || 1) * (20 + i * 10); ctx.save(); ctx.globalAlpha = (q - .3) * (1 - i * .25); ctx.fillStyle = i === 1 ? '#a8f6ff' : '#3ad0e0'; ctx.fillRect(Math.round(bx - 4), Math.round(y - 8 + i * 4), 8, 2); ctx.restore(); } }
    } })
];
// Charge ritual: energy rings converge on the cannon muzzle, the core flashes at FULL.
ARCANE_CHARGE.A10 = (ctx, s, mat, dir, k, t) => {
  const x = s.x + s.f * (dir === 'up' ? 6 : 34); const y = dir === 'up' ? s.y - 96 : dir === 'down' ? s.y - 4 : s.y - 46;
  for (let i = 0; i < 3; i++) { const e = ((t * 1.6 + i / 3) % 1); pixRing(ctx, x, y, 4 + (1 - e) * 22, 4 + (1 - e) * 22 * (dir === 'down' ? .3 : 1), i ? '#3ad0e0' : '#a8f6ff', .4 + e * .6); }
  if (k > .8) pixRing(ctx, x, y, 3, 3, '#ffffff', 1);
};

// Passive: the aura shield recharges by 30 every 6 s (up to 60) while the armour is on.
export function konstruktTick(p, dt, form) {
  if (form?.id !== 'A10' || !p.buffForm) return;
  p._kpShieldT = (p._kpShieldT ?? KONSTRUKT.shieldEvery) - dt;
  if (p._kpShieldT > 0) return;
  p._kpShieldT = KONSTRUKT.shieldEvery;
  p.arcaneShield = Math.min(KONSTRUKT.shieldCap, Math.max(p.arcaneShield ?? 0, 0) + KONSTRUKT.shieldGain); p.arcaneShieldTimer = Math.max(p.arcaneShieldTimer ?? 0, KONSTRUKT.shieldEvery);
}
// True while the hero is rolled up (the body and its attachments are hidden, the ball is drawn instead).
export const isShellRolled = (p) => (p?._shellSpinUntil ?? -1) > (p?.animTime ?? 0);
