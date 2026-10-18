// GRIMGE Prototype — Arcane States added from user reference art (18 Oct 2026):
// A01 Göttlicher Riese (a giant luminous copy of the player's own body that
// grabs with huge hands) and A02 Mystischer Affe (a white spirit ape rising
// behind the player in violet crystal flames). Same pose signals as V3.2.
import {
  plate, band, fallout, TAU, lerp, lerpP, clamp01, ease,
  techOf, jumpOf, grabOf, frame, line, specks, groundRing
} from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';
import { ghostOf } from './buff_signatures.js';

const zig = (x0, y0, x1, y1, n, amp, seed) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [lerp(x0, x1, u), lerp(y0, y1, u) + (i && i < n ? Math.sin(seed * 1.7 + i * 2.9) * amp : 0)]; });
const quad = (a, b, w) => { const dx = b[0] - a[0]; const dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; const nx = -dy / l * w / 2; const ny = dx / l * w / 2; return [[a[0] + nx, a[1] + ny], [b[0] + nx * .8, b[1] + ny * .8], [b[0] - nx * .8, b[1] - ny * .8], [a[0] - nx, a[1] - ny]]; };

// A huge open / closing hand: palm plus four two-joint fingers and a thumb.
// rot leans the hand (0 = fingers forward), curl 0 = open … 1 = fist.
export function giantHand(ctx, origin, rot, f, size, curl, mat, seed, alpha) {
  const P = frame(origin, rot, f);
  plate(ctx, [P(-size * .5, size * .45), P(size * .45, size * .5), P(size * .5, -size * .5), P(-size * .45, -size * .45)], mat, seed, { alpha, glowEdge: 1.2, lit: 1 });
  for (let i = 0; i < 4; i++) {
    const v = size * (.38 - i * .25); const a1 = -curl * 1.1; const a2 = -curl * 2.3; const L1 = size * (.5 - Math.abs(i - 1.5) * .06); const L2 = L1 * .75;
    const k0 = [size * .5, v]; const k1 = [k0[0] + Math.cos(a1) * L1, k0[1] + Math.sin(a1) * L1]; const k2 = [k1[0] + Math.cos(a2) * L2, k1[1] + Math.sin(a2) * L2];
    plate(ctx, quad(P(...k0), P(...k1), size * .2), mat, seed + 1 + i * 2, { alpha, glowEdge: 1 });
    plate(ctx, quad(P(...k1), P(...k2), size * .17), mat, seed + 2 + i * 2, { alpha, glowEdge: 1 });
  }
  const t0 = [size * .1, size * .5]; const t1 = [t0[0] + size * .35, t0[1] + size * (.3 - curl * .6)];
  plate(ctx, quad(P(...t0), P(...t1), size * .22), mat, seed + 12, { alpha, glowEdge: 1 });
}

// ── A01 Göttlicher Riese: the player's own body, enlarged, made of silver light ──
function divineGiant(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const p = pose.player ?? {};
  const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const light = { ...mat, kind: 'crystal' };
  const grow = ease(clamp01(pose.fade));
  const K = lerp(1, 2.5, grow) * (1 + .12 * (pose.peak ?? 0) + .06 * (pose.full ? 1 : 0));
  const H = 88 * K;
  // The giant stands behind; full techniques bring it forward, a landing makes it sink.
  const gx = s.x - f * (16 - 26 * Math.max(fw.f, up.f * .6, dn.f * .8)); const gy = s.y - 4 + 6 * (pose.land ?? 0);
  if (layer === 'back') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // Sprint: silver afterimages trail behind.
    if (pose.sprintK > .05) for (let i = 1; i <= 2; i++) ghostOf(ctx, p, gx - f * i * 26, gy, p.state, p.animTime, f, .12 * pose.sprintK * pose.fade / i, mat.vein, K);
    ghostOf(ctx, p, gx, gy + 2, p.state, p.animTime, f, .22 * pose.fade, mat.vein, K * 1.05);
    // Translucent light body that keeps the sprite's own detail, plus a pale sheen.
    ghostOf(ctx, p, gx, gy, p.state, p.animTime, f, .38 * pose.fade, null, K);
    ghostOf(ctx, p, gx, gy, p.state, p.animTime, f, (.3 + .08 * Math.sin(t * 3)) * pose.fade, mat.vein, K);
    ctx.restore();
    // Lightning veins wander over the contour (re-rolled ~12× per second).
    const roll = Math.floor(t * 12);
    for (let i = 0; i < 4; i++) {
      const r = Math.sin(roll * 3.1 + i * 7.7); const y0 = gy - H * (.25 + .6 * Math.abs(Math.sin(roll + i * 1.9)));
      line(ctx, zig(gx - f * H * .1 * r, y0, gx + f * H * .12 * Math.cos(roll + i), y0 + H * .16, 4, 4 * K * .4, roll + i), i % 2 ? mat.spark : mat.core, 1.5, (.5 + .5 * (pose.hitK ?? 0)) * pose.fade);
    }
    // Silver light flames above the head.
    fallout(ctx, [[gx, gy - H * .97], [gx - f * H * .08, gy - H * .9], [gx + f * H * .08, gy - H * .92]], light, t, 9701, { count: 9, alpha: .8 * pose.fade });
    if (pose.full) specks(ctx, Array.from({ length: 10 }, (_, i) => [gx + Math.cos(t * 2 + i * .63) * H * .35, gy - H * .5 + Math.sin(t * 2 + i * .63) * H * .4]), mat.spark, .9, 2);
    return;
  }
  // Front: the giant's hands act in the world.
  const shoulder = [gx + f * H * .1, gy - H * .7];
  if (gr.k) {
    // Reference pose: the huge hand comes down from above and closes around the target.
    const tx = gr.tx ?? s.x + f * 40; const at = lerpP([shoulder[0] + f * 30, shoulder[1]], [tx, s.y - 44], gr.k);
    line(ctx, [shoulder, at], mat.vein, 6 * K * .4, .25 * gr.k);
    giantHand(ctx, at, -.9 + .6 * gr.k, f, 30, gr.hit ? clamp01(gr.k * 1.6) : .3, light, 9710, .85 * pose.fade);
  }
  if (pose.guardK > .05) for (const sg of [-1, 1]) giantHand(ctx, [s.x + f * (22 + 6 * sg), s.chest[1] + sg * 14], -1.45, f, 26 * pose.guardK, .1, light, 9730 + sg, .7 * pose.guardK * pose.fade);
  if (fw.s) giantHand(ctx, [s.x + f * (36 + 50 * fw.s), s.chest[1] + 4], .1, f, 28, .15, light, 9740, fw.s * .85);
  if (fw.f) { const x = s.x + f * (40 + 150 * ease(clamp01(fw.e * 3))); giantHand(ctx, [x, s.chest[1] - 6], 0, f, 40, 1, light, 9750, fw.f); line(ctx, [[x - f * 90, s.chest[1] - 6], [x - f * 20, s.chest[1] - 6]], mat.core, 3, fw.f * .6); }
  if (up.s) giantHand(ctx, [s.x + f * 30, s.y - 50 - 70 * up.s], -1.4, f, 30, 1, light, 9760, up.s * .85);
  if (up.f) giantHand(ctx, [s.x + f * 54, s.y - 60 - 90 * Math.sin(clamp01(up.e / .7) * Math.PI)], -.4, f, 36, 1, light, 9770, up.f);
  if (dn.s) groundRing(ctx, s.x + f * 30, s.y, 30 + 30 * dn.s, light, 0, dn.s, 10, 9780, 3);
  if (dn.f) for (const [i, ox] of [[0, 40], [1, 92]]) { const e = clamp01(dn.e * 3 - i * .9); const drop = s.y - 120 * (1 - e); giantHand(ctx, [s.x + f * ox, drop - 20], 1.57, f, 34, 1, light, 9790 + i * 20, dn.f * (e > 0 ? 1 : .3)); if (e >= 1) groundRing(ctx, s.x + f * ox, s.y, 44, light, 0, dn.f, 12, 9791 + i * 20, 4); }
  if (j.land || (pose.land ?? 0) > 0) groundRing(ctx, s.x, s.y, 40 + 50 * (1 - pose.land), light, 0, pose.land, 12, 9799, 4);
}

// ── A02 Mystischer Affe: white spirit ape behind the player in crystal flames ──
// Hunched spirit-ape silhouette: high hump, head low and forward between the
// shoulders, long arms resting on the knuckles, spiky white fur, glowing eyes.
function mysticApe(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t;
  const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const fur = { ...mat, kind: 'crust', dark: '#3d2f5c', body: '#dcd6ec', facet: '#f4f1fb', vein: '#9c7ae0', edge: '#efeaff' };
  const shade = { ...fur, body: '#b9afd6', facet: '#d8d0ee' };
  const flame = { ...mat, kind: 'crystal', body: '#7f66ff', facet: '#c3b4ff', vein: '#5f86ff', edge: '#efe6ff' };
  const rise = ease(clamp01(pose.fade)); const al = .82 * rise;
  // The ape rises from the flames; the full up technique makes it leap.
  const leap = up.f ? Math.sin(clamp01(up.e / .7) * Math.PI) * 90 : 0;
  const ax = s.x - f * (20 - 22 * fw.f); const ay = s.y + (1 - rise) * 120 - leap - 12 * j.up;
  const breath = Math.sin(t * 2.2) * 3; const lunge = pose.sprintK * 12;
  const A = (u, v) => [ax + f * (u + lunge), ay - v];
  // Joints of both arms: shoulder → elbow → knuckles (front = facing side).
  const sh = { F: A(40, 128 + breath), B: A(-44, 132 + breath) };
  const fist = { F: A(74, 12), B: A(-58, 12) };
  const elbow = { F: A(82, 70), B: A(-70, 74) };
  // The front fist joins the player's actions; both fists drum for the full down technique.
  const act = Math.max(pose.act * .7, pose.hitK ?? 0);
  const target = (pt, w) => { if (w <= 0) return; fist.F = lerpP(fist.F, pt, w); elbow.F = lerpP(elbow.F, [lerp(sh.F[0], pt[0], .55), Math.min(sh.F[1], pt[1]) - 6], w * .8); };
  target([s.x + f * 64, s.chest[1] + 4], act);
  target([s.x + f * (60 + 70 * fw.s), s.chest[1]], fw.s);
  target([s.x + f * 46, s.y - 100 - 50 * up.s], up.s);
  target([s.x + f * 56, s.y - 8], dn.s);
  if (gr.k) target([gr.tx ?? s.x + f * 40, s.chest[1] + 6], gr.k);
  if (dn.f) { const beat = Math.sin(t * 26); fist.F = lerpP(fist.F, A(22, 104 + beat * 8), dn.f); fist.B = lerpP(fist.B, A(-8, 104 - beat * 8), dn.f); elbow.F = lerpP(elbow.F, A(64, 86), dn.f); elbow.B = lerpP(elbow.B, A(-56, 86), dn.f); }
  if (pose.guardK > .05) { fist.F = lerpP(fist.F, [s.x + f * 30, s.chest[1] - 16], pose.guardK); fist.B = lerpP(fist.B, [s.x + f * 26, s.chest[1] + 18], pose.guardK); }
  const frontArm = pose.guardK > .3 || act > .3 || fw.s > .2 || up.s > .2 || dn.s > .2 || gr.k > .2;
  // Fur spikes along a polyline, pointing away from the body (u/v normal side = out).
  const spikes = (a, b, n, len, side, seed) => { for (let i = 0; i < n; i++) { const q = lerpP(a, b, (i + .5) / n); const dx = b[0] - a[0]; const dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; const nx = -dy / l * side; const ny = dx / l * side; const w = Math.sin(t * 3 + i + seed) * 2; plate(ctx, [[q[0] - dx / l * 5, q[1] - dy / l * 5], [q[0] + nx * len + w, q[1] + ny * len], [q[0] + dx / l * 5, q[1] + dy / l * 5]], fur, seed + i, { alpha: al }); } };
  const arm = (side, seed, sign) => {
    plate(ctx, quad(sh[side], elbow[side], 30), fur, seed, { alpha: al, lit: .4, glowEdge: .35 });
    plate(ctx, quad(elbow[side], fist[side], 34), shade, seed + 1, { alpha: al, lit: .4, glowEdge: .35 });
    spikes(sh[side], elbow[side], 3, 12, sign, seed + 2);
    spikes(elbow[side], fist[side], 3, 10, sign, seed + 5);
    const [x, y] = fist[side]; const r = 18;
    plate(ctx, Array.from({ length: 8 }, (_, i) => [x + Math.cos(i / 8 * TAU) * r, y + Math.sin(i / 8 * TAU) * r * .8]), fur, seed + 9, { alpha: rise, lit: 1, glowEdge: .6 });
    for (let i = 0; i < 3; i++) line(ctx, [[x + f * 4 - 8 + i * 6, y - 8], [x + f * 4 - 8 + i * 6, y + 2]], '#8e7fb8', 1, .5 * rise);
  };
  const flames = (front) => {
    for (let i = 0; i < 3; i++) {
      const pts = Array.from({ length: 26 }, (_, q) => { const a = t * 2.6 + i * TAU / 3 + q * .2; return [s.x - f * 10 + Math.cos(a) * (62 + q * 1.6), s.y - 6 - q * 6 + Math.sin(a) * 12]; });
      // Only contiguous runs on this side of the body (no strips jumping across).
      let run = [];
      const flush = () => { if (run.length > 1) band(ctx, run, (q, n) => 3.5 * (1 - q / n) + 1, flame, 9810 + i, { t, alpha: (front ? .38 : .55) * pose.fade }); run = []; };
      pts.forEach((pt, q) => { if ((Math.sin(t * 2.6 + i * TAU / 3 + q * .2) > 0) === front) run.push(pt); else flush(); });
      flush();
    }
  };
  if (layer === 'back') {
    flames(false);
    arm('B', 9830, f);
    // Hunched torso: hump high behind, chest forward, narrow hips.
    const torso = [A(-58, 120 + breath), A(-36, 150 + breath), A(0, 156 + breath), A(42, 140 + breath), A(52, 112), A(30, 60), A(-30, 56), A(-50, 84)];
    plate(ctx, torso, fur, 9820, { alpha: al, lit: .4, glowEdge: .35 });
    plate(ctx, [A(4, 118 + breath), A(36, 120 + breath), A(26, 70), A(0, 68)], shade, 9821, { alpha: al });
    spikes(A(-58, 120 + breath), A(-36, 150 + breath), 3, 14, -f, 9822);
    spikes(A(-36, 150 + breath), A(10, 156 + breath), 3, 16, -f, 9825);
    if (!frontArm) arm('F', 9850, -f);
    // Head low between the shoulders: crest, heavy brow, muzzle, jaw (roars on full forward / hits).
    const roar = Math.max(fw.f, (pose.hitK ?? 0) * .5, dn.f * .4);
    const H = A(52 + 14 * fw.f, 134 + breath);
    const hp = (u, v) => [H[0] + f * u, H[1] - v];
    for (let i = 0; i < 4; i++) plate(ctx, [hp(-18 + i * 8, 22), hp(-26 + i * 7, 38 + (i % 2) * 6 + Math.sin(t * 4 + i) * 2), hp(-10 + i * 8, 24)], fur, 9835 + i, { alpha: al });
    plate(ctx, [hp(-20, 0), hp(-18, 22), hp(2, 28), hp(18, 18), hp(20, 0), hp(4, -10), hp(-12, -8)], fur, 9840, { alpha: rise, lit: .8 });
    // Dark face under the white brow, like the reference spirit ape.
    plate(ctx, [hp(-2, 10), hp(22, 10), hp(28, -2), hp(4, -6)], { ...shade, body: '#5e4f86', facet: '#7a6aa6' }, 9839, { alpha: rise });
    plate(ctx, [hp(-6, 18), hp(26, 16), hp(26, 9), hp(-6, 10)], fur, 9841, { alpha: rise, lit: .6 });
    plate(ctx, [hp(6, 4), hp(30, 2), hp(30, -8 - roar * 6), hp(8, -8 - roar * 4)], { ...shade, body: '#8a7cb4', facet: '#a597cc' }, 9842, { alpha: rise, glowEdge: .3 });
    plate(ctx, [hp(8, -9 - roar * 4), hp(28, -10 - roar * 8), hp(24, -18 - roar * 14), hp(8, -16 - roar * 10)], { ...shade, body: '#5e4f86', facet: '#6e5f98' }, 9843, { alpha: rise, glowEdge: .3 });
    if (roar > .1) { for (let i = 0; i < 3; i++) plate(ctx, [hp(12 + i * 6, -9 - roar * 5), hp(15 + i * 6, -9 - roar * 5), hp(13.5 + i * 6, -15 - roar * 5)], { ...fur, body: '#ffffff' }, 9844 + i, { alpha: rise }); line(ctx, [hp(10, -10 - roar * 6), hp(26, -12 - roar * 9)], mat.spark, 2, roar * rise); }
    specks(ctx, [hp(10, 9), hp(19, 9)], mat.spark, (.8 + .2 * Math.sin(t * 5)) * rise, 3);
    if (pose.full) fallout(ctx, [H, sh.F, sh.B], flame, t, 9860, { count: 10, alpha: .8 * pose.fade });
    return;
  }
  if (frontArm) arm('F', 9850, -f);
  flames(true);
  if (dn.s) groundRing(ctx, s.x + f * 56, s.y, 20 + 40 * dn.s, flame, 0, dn.s, 10, 9870, 3);
  if (dn.f) groundRing(ctx, s.x, s.y, 40 + 80 * ((t * 1.6) % 1), flame, 0, dn.f * (1 - (t * 1.6) % 1), 14, 9880, 3);
  if (fw.f) for (let r = 0; r < 3; r++) { const e = clamp01(fw.e * 2 - r * .15); if (e <= 0 || e >= 1) continue; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - e) * fw.f; ctx.strokeStyle = r % 2 ? flame.edge : mat.spark; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(s.x + f * (30 + e * 160), s.y - 70, 14 + e * 26, 30 + e * 50, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  if ((pose.land ?? 0) > 0) groundRing(ctx, s.x, s.y, 30 + 60 * (1 - pose.land), flame, 0, pose.land, 12, 9890, 4);
}

registerFormRenderer('A01', divineGiant);
registerFormRenderer('A02', mysticApe);
