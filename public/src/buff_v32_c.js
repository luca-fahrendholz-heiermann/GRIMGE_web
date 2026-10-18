// GRIMGE Prototype — V3.2 individual morphologies of the curated Arcane States
// (docs/GRIMGE_Arcane_States_Atlas_V3_2_Morphologie_Overhaul.md, {ID}.0).
import {
  plate, band, fallout, shard, orbitItem, TAU, lerp, lerpP, clamp01, ease,
  techOf, jumpOf, grabOf, frame, shape, gather, line, specks, groundRing, channel, column
} from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';

// Per-player scratch state for world-anchored pieces (left-behind folds, arches).
const scratch = (pose, key) => { const p = pose.player ?? {}; p._v32 ??= {}; return (p._v32[key] ??= {}); };

// ── T35 Kältestillstand: frost condensation bands with time stutter ──────
function kaeltestillstand(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const glass = { ...mat, kind: 'crystal' };
  const st = scratch(pose, 'T35');
  const bands = [{ a: s.elbowF, b: s.handF, L: 26, front: true }, { a: s.hipF, b: [s.hipF[0] + f * 10, s.hipF[1] + 10], L: 20, front: true }, { a: s.back, b: [s.back[0] - f * 10, s.back[1] - 20], L: 34, front: false }];
  st.frozen ??= bands.map(() => null);
  bands.forEach((bd, i) => {
    // Each band holds for a few frames, then jumps back to its smoothed position.
    let A = [bd.a[0] + f * (bd.front ? 8 : -8), bd.a[1] - 4];
    const hold = Math.sin(t * 1.7 + i * 2.2) > .85;
    if (hold && st.frozen[i]) A = st.frozen[i]; else st.frozen[i] = A;
    if (pose.guardK > .05) A = lerpP(A, [s.x + f * (20 + i * 4), s.chest[1] - 22 + i * 16], pose.guardK);
    if (gr.k && i === 0) A = lerpP(A, [gr.tx ?? s.x + f * 36, s.chest[1]], gr.k);
    A = lerpP(A, [s.x + f * (26 + i * 30), s.chest[1] - 6 + i * 4], fw.f);
    A = lerpP(A, [s.x + f * 14, s.y - 30 - i * 40], up.f);
    A = lerpP(A, [s.x + f * (16 + i * 34), s.y - 2], dn.f);
    A = gather(A, bd.a, pose.fade * 1.4);
    const isFront = bd.front || pose.guardK > .5 || fw.a > .3 || up.f > .3 || dn.f > .3;
    if ((layer === 'front') !== isFront) return;
    const dir = pose.guardK > .5 || up.f > .3 ? [0, -1] : fw.f > .3 || dn.f > .3 ? [f, 0] : [bd.front ? f * .9 : -f * .7, bd.front ? .3 : -.5];
    const L = bd.L * (1 + .8 * Math.max(fw.f, dn.f, up.f));
    // A broken glass strip: segments with gaps (quiet empty image space between bands).
    for (let k = 0; k < 4; k++) { if (k === 2 && !fw.f) continue; const u0 = k / 4; const u1 = u0 + .2; const p0 = [A[0] + dir[0] * L * u0, A[1] + dir[1] * L * u0]; const p1 = [A[0] + dir[0] * L * u1, A[1] + dir[1] * L * u1]; plate(ctx, [[p0[0], p0[1] - 3], [p1[0], p1[1] - 3], [p1[0], p1[1] + 3], [p0[0], p0[1] + 3]], glass, 6210 + i * 10 + k, { alpha: pose.fade * .85, glowEdge: .9, lit: .8 }); }
    // Jump: afterimage stripes linger at several heights.
    if (j.air) for (let k = 1; k <= 2; k++) line(ctx, [[A[0], A[1] + k * 10], [A[0] + dir[0] * L, A[1] + dir[1] * L + k * 10]], mat.edge, 1, .3 / k);
  });
  if (layer === 'front') {
    if (fw.s) specks(ctx, [[s.handF[0] + f * 12, s.handF[1]], [s.handF[0] + f * 18, s.handF[1] - 3]], mat.edge, fw.s, 3);
    if (fw.f) channel(ctx, s.x + f * 30, s.chest[1] - 4, f, 150 * fw.f, 12, glass, 6240, fw.f * .45, 7);
    if (dn.s) groundRing(ctx, s.footF[0], s.y, 8, glass, 0, dn.s, 6, 6250, 2);
    if (dn.f) { ctx.save(); ctx.globalAlpha = .22 * dn.f; ctx.fillStyle = mat.edge; ctx.beginPath(); ctx.ellipse(s.x + f * 40, s.y, 80 * dn.f, 22 * dn.f, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  }
}

registerFormRenderer('T35', kaeltestillstand);
