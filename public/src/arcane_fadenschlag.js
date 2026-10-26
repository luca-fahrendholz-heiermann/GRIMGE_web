// GRIMGE Prototype — T13 FADENSCHLAG as a swinging form (user, 26 Oct 2026: "könnte mehr spiderman mäßig sein. das
// man sich auch rumschwingen kann" — meant Fadenschlag; own adaptation, no webs from the wrist: a hook kunai is
// flung up, bites into the air and the hero swings on the silk wire tied to its ring).
//   air jump       FADENSCHWUNG  jump again in the air: a kunai bites in ahead and above, the hero swings through
//                                the low point and is flung forward and up at the end (or on the next jump). Foes in
//                                the swing path take a swing kick (slowed by chance). Chainable.
//   forward short  FADENHAKEN    the kunai hooks the first foe ahead, the wire yanks it in, an uppercut follows.
//   up short       FADENZUG      the kunai bites in high above and the wire pulls the hero up (swing from there).
//   down full      SEIDENNETZ    a silk web pinned by six kunai: foes are drawn in, then the web snaps shut (root).
import { ARCANE_MOVES } from './arcane_moves.js';
import { SigSequence, foesOf, hit, massOf, groundDist, DEPTH } from './signature_core.js';
import { spells } from './spells.js';
import { applyStatuses } from './buff_techniques.js';
import { hashStr } from './buff_v32_kit.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';

export const SILK_SWING = Object.freeze({ reach: 62, rise: 74, minLow: 12, maxAnchor: 200, boost: 1.3, pump: 1.4, releaseAng: .9, maxT: 1.7, snap: .18, kickDmg: 16, kickSpeed: 180, slowChance: .35 });
const isSilk = (p) => p?.buffForm?.id === 'T13' && p.buffForm.timer > 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fade = (k, inT = .1, outT = .3) => Math.max(0, Math.min(1, k / inT, (1 - k) / outT));
// The wire hangs from the fore hand: 8 px ahead of and HAND px above the feet (the pendulum swings the hand).
const HAND = 50;
const handOf = (c) => [c.x + (c.facing || 1) * 8, c.y - HAND];

// The silk wire: a 2-px peach core with a dark contour, rose glints and a white pulse running to the tip.
function thread(ctx, x0, y0, x1, y1, t, alpha = 1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2)); const pts = [];
  for (let i = 0; i <= n; i++) pts.push([Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)]);
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = '#1c1420'; for (const [x, y] of pts) ctx.fillRect(x - 2, y - 2, 4, 4);
  const pulse = Math.floor(t * 90);
  pts.forEach(([x, y], i) => { ctx.fillStyle = (i + pulse) % 14 < 2 ? '#ffffff' : i % 9 === 0 ? '#ff3d6e' : '#ffd0a8'; ctx.fillRect(x - 1, y - 1, 2, 2); });
  ctx.restore();
}
const anchorSprite = (ctx, x, y, t, alpha = 1, scale = 1) => { if (spellSheetReady('silk_anchor')) drawSpellSprite(ctx, 'silk_anchor', Math.floor(t * 12) % 4, x, y, { anchor: 'center', alpha, scale }); };

// ── FADENSCHWUNG (the swing) ─────────────────────────────────────────────
// Called by the player when jump is pressed in the air. Returns true when the press was used.
export function silkAirJump(p) {
  if (!isSilk(p) || p.grounded || p.isMounted) return false;
  const sw = p._silkSwing;
  if (sw && !sw.released) { releaseSwing(p, sw); return true; }
  if (sw) return false; // the last wire is still snapping back (acts as the cooldown)
  startSwing(p); return true;
}
function startSwing(p) {
  const f = Math.abs(p.vx ?? 0) > 60 ? Math.sign(p.vx) : (p.facing || 1); p.facing = f;
  const hx = p.x + f * 8; const hh = p.elevation + HAND; const ax = hx + f * SILK_SWING.reach;
  let ah = Math.min(Math.max(SILK_SWING.maxAnchor, hh + 50), hh + SILK_SWING.rise);
  // Raise the anchor until the feet stay above the ground at the low point of the arc.
  for (let i = 0; i < 3; i++) { const low = ah - Math.hypot(ax - hx, ah - hh) - HAND; if (low < SILK_SWING.minLow) ah += SILK_SWING.minLow - low; }
  const L = Math.hypot(ax - hx, ah - hh); const a = Math.atan2(hx - ax, ah - hh);
  const w = ((p.vx ?? 0) * Math.cos(a) + (p.vElevation ?? 0) * Math.sin(a)) / L + f * SILK_SWING.boost;
  const sw = p._silkSwing = { f, ax, ah, L, a, w, t: 0, px: p.x, released: false, snap: 0, hits: new Set() };
  p.jumpsLeft = 0;
  spells.addSpell(new SilkTether(p, sw), 'B');
}
function releaseSwing(p, sw) {
  sw.released = true; sw.snap = 0;
  p.vx = clamp(sw.L * Math.cos(sw.a) * sw.w * 1.05, -420, 420);
  p.vElevation = clamp(sw.L * Math.sin(sw.a) * sw.w + 40, 120, 320);
  p.isSprintJump = true;
}
// Called every movement step; returns true while the swing drives the position (no gravity integration then).
export function silkSwingStep(p, dt, gw) {
  const sw = p._silkSwing; if (!sw) return false;
  if (sw.released) { sw.snap += dt; if (sw.snap > SILK_SWING.snap) p._silkSwing = null; return false; }
  // Dropped by losing the form, a mount, a hit or a wall (the collision moved the hero off the arc).
  if (!isSilk(p) || p.isMounted || p.state === 'hurt' || p.freezeTimer > 0 || Math.abs(p.x - sw.px) > 3) { p._silkSwing = null; return false; }
  sw.t += dt;
  const g = (p.getEffectiveGravity?.() ?? 1250) * .8; // a little floatier than a fall
  sw.w += (-(g / sw.L) * Math.sin(sw.a) + (Math.sign(sw.w) === sw.f ? sw.f * SILK_SWING.pump : 0)) * dt;
  sw.a += sw.w * dt;
  const x = sw.ax + sw.L * Math.sin(sw.a) - sw.f * 8; const h = sw.ah - sw.L * Math.cos(sw.a) - HAND;
  p.vx = (x - p.x) / dt; p.vElevation = (h - p.elevation) / dt; p.facing = sw.f;
  p.x = x; sw.px = x;
  if (h <= 0) { p.elevation = 0; p.vElevation = 0; p.grounded = true; p._silkSwing = null; return true; }
  p.elevation = h; p.grounded = false;
  // Swing kick: fast through the low part of the arc, every foe once per swing.
  if (Math.abs(sw.w) * sw.L > SILK_SWING.kickSpeed) for (const t of foesOf(gw, p.team)) {
    if (sw.hits.has(t) || Math.abs(t.x - p.x) > 34 || Math.abs(((t.z ?? p.z) - p.z) * DEPTH) > 26 || Math.abs((t.worldHeight ?? 0) - p.worldHeight) > 60) continue;
    sw.hits.add(t); hit(t, SILK_SWING.kickDmg, sw.f * 360, 160, .35);
    if (Math.random() < SILK_SWING.slowChance) applyStatuses(t, ['slow'], p, sw.f);
    combat.spawnHitSparks(t.x, t.y - 30, sw.f, '#ffd0a8', 8); combat.shakeCamera(3, .08);
  }
  if ((sw.f * sw.a > SILK_SWING.releaseAng && sw.f * sw.w > 0) || sw.t > SILK_SWING.maxT) releaseSwing(p, sw);
  return true;
}
// The visible wire and anchor kunai of one swing; after the release the wire snaps back to the kunai.
class SilkTether {
  constructor(p, sw) { Object.assign(this, { p, sw, t: 0, isFinished: false, fineVfx: true, isVisualOnly: true }); }
  get x() { return this.p.x; }
  get z() { return this.p.z + .002; }
  get y() { return this.p.y; }
  update(dt) {
    this.t += dt;
    if (this.p._silkSwing !== this.sw || this.t > 4) this.isFinished = true;
  }
  render(ctx) {
    const { p, sw } = this; const ay = groundYForDepth(p.z) - (p.surfaceHeight ?? 0) - sw.ah; const [hx, hy] = handOf(p);
    const fly = Math.min(1, this.t / .08); const tipX = hx + (sw.ax - hx) * fly; const tipY = hy + (ay - hy) * fly;
    if (!sw.released) { thread(ctx, hx, hy, tipX, tipY, this.t); anchorSprite(ctx, tipX, tipY, this.t); return; }
    const k = clamp(sw.snap / SILK_SWING.snap, 0, 1);
    thread(ctx, sw.ax + (hx - sw.ax) * (1 - k), ay + (hy - ay) * (1 - k), sw.ax, ay, this.t, 1 - k * .5);
    anchorSprite(ctx, sw.ax, ay, this.t, 1 - k);
  }
}

// ── Thread techniques (replace three of the six T13 techniques) ─────────
const sigOf = (f) => ({ mat: f.mat, seed: hashStr(f.id) });
// Wires, kunai and the web are hand-drawn sheets / 2-px lines: render them at fine density.
const fine = (s) => { s.fineVfx = true; return s; };
const tie = (s, list) => (t) => applyStatuses(t, list, s.caster, s.facing);
const moves = ARCANE_MOVES.T13;
// forward short — FADENHAKEN: hook the first foe ahead (330 px), yank it in, then an uppercut that launches it.
moves[0] = (f, p) => fine(new SigSequence(sigOf(f), p, { dur: .72, data: { tgt: null, miss: false },
  steps: [
    { at: .02, fn: (s, gw) => { s.tgt = foesOf(gw, s.team).filter((t) => (t.x - s.caster.x) * s.facing > 0 && (t.x - s.caster.x) * s.facing < 330 && Math.abs(((t.z ?? s.z) - s.z) * DEPTH) < 40).sort((a, b) => Math.abs(a.x - s.caster.x) - Math.abs(b.x - s.caster.x))[0] ?? null; s.miss = !s.tgt; } },
    { at: .16, fn: (s) => { if (s.tgt && !s.tgt.isDead) { hit(s.tgt, 14 * (s.power ?? 1), 0, 20, .5); tie(s, ['slow'])(s.tgt); combat.spawnHitSparks(s.tgt.x, s.tgt.y - 40, -s.facing, '#ffd0a8', 6); } } },
    { at: .5, fn: (s, gw) => { s.x = s.caster.x; s.z = s.caster.z; s.strike(gw, (t, dx, dz) => dx * s.facing > -10 && dx * s.facing < 84 && Math.abs(dz) < 30, 20, () => s.facing * 40, 460, .45); } }
  ],
  tick: (s, dt) => { const t = s.tgt; if (!t || t.isDead || s.t < .16 || s.t > .46) return; const m = massOf(t); t.x += (s.caster.x + s.facing * 44 - t.x) * Math.min(1, dt * 9) * m; t.z += (s.caster.z - t.z) * Math.min(1, dt * 9) * m; },
  draw: (ctx, s, k) => {
    const [hx, hy] = handOf(s.caster); if (s.t > .5) return;
    const out = Math.min(1, s.t / .16); const back = s.miss ? clamp((s.t - .2) / .2, 0, 1) : 0;
    const [ex, ey] = s.tgt && !s.miss ? [s.tgt.x, s.tgt.y - 40] : [s.caster.x + s.facing * 330, hy];
    const tx = hx + (ex - hx) * out * (1 - back); const ty = hy + (ey - hy) * out * (1 - back);
    thread(ctx, hx, hy, tx, ty, s.t, fade(k, .02, .4)); anchorSprite(ctx, tx, ty, s.t, 1, .8);
  } }));
// up short — FADENZUG: the kunai bites in high above, the wire yanks the hero up; a cut ring at the take-off.
moves[2] = (f, p) => fine(new SigSequence(sigOf(f), p, { dur: .7, data: { ax: p.x + (p.facing || 1) * 50, ah: (p.elevation ?? 0) + 200 },
  steps: [{ at: .1, fn: (s, gw) => { const c = s.caster; s.strike(gw, (t, dx, dz) => Math.hypot(dx, dz) < 54, 14, (t, dx) => Math.sign(dx || 1) * 160, 120, .3); c.grounded = false; c.vElevation = Math.max(c.vElevation ?? 0, 560); c.vx = s.facing * 200; c.jumpsLeft = 0; } }],
  draw: (ctx, s, k) => {
    const c = s.caster; const ay = groundYForDepth(s.z) - (c.surfaceHeight ?? 0) - s.ah; const [hx, hy] = handOf(c);
    const out = Math.min(1, s.t / .1); const tx = hx + (s.ax - hx) * out; const ty = hy + (ay - hy) * out; const a = s.t > .55 ? 1 - (s.t - .55) / .15 : 1;
    if (s.t < .5) thread(ctx, hx, hy, tx, ty, s.t, a); anchorSprite(ctx, tx, ty, s.t, a);
  } }));
// down full — SEIDENNETZ: the web pins down ahead and draws foes in; at 0.7 s it snaps shut (heavy hit, root).
moves[5] = (f, p) => fine(new SigSequence(sigOf(f), p, { dur: 1.2, x: p.x + (p.facing || 1) * 80,
  tick: (s, dt, gw) => { if (s.t > .7) return; for (const t of foesOf(gw, s.team)) { const d = groundDist(t, s); if (d < 130 && d > 6) t.x += (s.x - t.x) / d * 70 * dt * massOf(t); } },
  steps: [{ at: .7, fn: (s, gw) => { s.strike(gw, (t, dx, dz) => Math.hypot(dx, dz) < 125, 64, 120, 160, .8, { onHit: tie(s, ['root']) }); combat.shakeCamera(4, .12); } }],
  draw: (ctx, s, k) => {
    const spread = Math.min(1, s.t / .15); const shut = s.t > .7 ? Math.min(1, (s.t - .7) / .12) : 0; const a = fade(k, .05, .2);
    if (spellSheetReady('silk_web')) drawSpellSprite(ctx, 'silk_web', Math.floor(s.t * 12) % 6, s.x, s.y, { anchor: 'center', scale: spread < 1 ? .5 + .5 * spread : shut > 0 ? 1 - shut * .5 : 1, alpha: a });
    const [hx, hy] = handOf(s.caster); if (s.t < .25) thread(ctx, hx, hy, s.x, s.y, s.t, 1 - s.t / .25);
  } }));
