// GRIMGE Prototype — shared kit of the V3.2 individual Arcane State
// morphologies (docs/GRIMGE_Arcane_States_Atlas_V3_2_Morphologie_Overhaul.md).
//
// V3.2 gives every form its own morphology instead of a shared silhouette
// family. Each form renderer (buff_v32_a/b/c.js) reads the same pose signals:
//   fade       transform-in / -out assembly (parts gather from their origin)
//   act        smoothed attack weight, sprintK, guardK
//   tech       the released heavy: dir forward|up|down, full, a (attack curve)
//   fullReady  charge passed the FULL threshold (visible switch phase)
//   grab       a grab attempt: k, hit, target point
//   airborne / vy / land   jump phases: takeoff · ascend · apex · fall · land
//   hitK       a melee hit just connected
// Drawing helpers place local shapes (u = forward along the facing, v = up)
// around a socket with a lean angle, so one definition works for both sides.
export { plate, band, fallout, shard, orbitItem, limbSegment, hashStr, mix, rgba } from './buff_vfx.js';
import { plate } from './buff_vfx.js';

export const TAU = Math.PI * 2;
export const snap = (v) => Math.round(v);
export const lerp = (a, b, k) => a + (b - a) * k;
export const lerpP = (A, B, k) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k)];
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const ease = (k) => k * k * (3 - 2 * k);

// The released heavy of this direction: s / f = short / full weights (0…1).
export function techOf(pose, dir) {
  const T = pose.tech;
  if (!T || T.dir !== dir) return { s: 0, f: 0, a: 0, e: 0 };
  const a = Math.min(1, T.e / .12) * Math.min(1, T.k * 1.6);
  return { s: T.full ? 0 : a, f: T.full ? a : 0, a, e: T.e };
}
// Jump phases from the vertical speed: ascend / apex / fall (each 0…1) plus landing.
export function jumpOf(pose) {
  if (!pose.airborne) return { air: 0, up: 0, apex: 0, fall: 0, land: pose.land ?? 0 };
  const vy = pose.vy ?? 0;
  return { air: 1, up: clamp01(vy / 200), apex: clamp01(1 - Math.abs(vy) / 90), fall: clamp01(-vy / 200), land: 0 };
}
export const grabOf = (pose) => pose.grab ?? { k: 0, hit: false };

// Local → world: u forward (× facing), v up; rot leans the shape forward.
export function frame(origin, rot, f) {
  const c = Math.cos(rot); const s = Math.sin(rot);
  return (u, v) => [origin[0] + f * (u * c + v * s), origin[1] - (-u * s + v * c)];
}
export function shape(ctx, origin, rot, f, pts, mat, seed, opts = {}) {
  const P = frame(origin, rot, f);
  plate(ctx, pts.map(([u, v]) => P(u, v)), mat, seed, opts);
}
// Gather a point from its assembly origin while the form fades in / out.
export const gather = (pt, origin, k) => lerpP(origin, pt, ease(clamp01(k)));
// A thin additive line (threads, field lines, seams).
export function line(ctx, pts, color, width, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = Math.min(1, alpha);
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(snap(x), snap(y)) : ctx.moveTo(snap(x), snap(y)))); ctx.stroke(); ctx.restore();
}
// Pixel sparks / dust specks at points.
export function specks(ctx, pts, color, alpha, size = 2) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color;
  for (const [x, y] of pts) ctx.fillRect(snap(x), snap(y), size, size);
  ctx.restore();
}
// Ground ellipse ring of plate segments (feet level), ry = r · 0.32.
export function groundRing(ctx, x, y, r, mat, t, alpha, segs = 10, seed = 1, thick = 4, gap = .6) {
  if (alpha <= 0) return;
  for (let i = 0; i < segs; i++) {
    const a0 = i / segs * TAU + t; const a1 = a0 + TAU / segs * gap; const P = (a, rr) => [x + Math.cos(a) * rr, y + Math.sin(a) * rr * .32];
    plate(ctx, [P(a0, r), P(a1, r), P(a1, r + thick), P(a0, r + thick)], mat, seed + i, { alpha, glowEdge: .7 });
  }
}
// A forward beam / channel made of material plates (attack VFX instance).
export function channel(ctx, x0, y0, f, len, half, mat, seed, alpha, segs = 6) {
  if (alpha <= 0 || len <= 0) return;
  for (let i = 0; i < segs; i++) { const a = x0 + f * len * i / segs; const b = x0 + f * len * (i + 1) / segs; const h = half * (1 - i / segs * .4); plate(ctx, [[a, y0 - h], [b, y0 - h * .85], [b, y0 + h * .85], [a, y0 + h]], mat, seed + i, { alpha: alpha * (1 - i / segs * .3), glowEdge: 1.1, core: .4 }); }
}
// A rising column of plates (up techniques).
export function column(ctx, x, y0, h, half, mat, seed, alpha, segs = 5) {
  if (alpha <= 0 || h <= 0) return;
  for (let i = 0; i < segs; i++) { const a = y0 - h * i / segs; const b = y0 - h * (i + 1) / segs; const w = half * (1 - i / segs * .5); plate(ctx, [[x - w, a], [x + w, a - 1], [x + w * .85, b], [x - w * .85, b + 1]], mat, seed + i, { alpha: alpha * (1 - i / segs * .25), glowEdge: 1.1, core: .4 }); }
}
