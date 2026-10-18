// GRIMGE Prototype — V3.2 individual morphologies T13–T24
// (docs/GRIMGE_Arcane_States_Atlas_V3_2_Morphologie_Overhaul.md, {ID}.0).
import {
  plate, band, fallout, shard, orbitItem, limbSegment, TAU, lerp, lerpP, clamp01, ease,
  techOf, jumpOf, grabOf, frame, shape, gather, line, specks, groundRing, channel, column
} from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';

const weaponTip = (s) => [s.handF[0] + s.f * 22, s.handF[1] - 18];

// ── T13 Fadenschlag: a thread spool and four taut visible weapon wires ───
function fadenschlag(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const spool = gather([s.shoulderB[0] - f * 8, s.shoulderB[1] - 8 + Math.sin(t * 9) * .6], s.shoulderB, pose.fade * 1.4);
  if (layer === 'back') {
    // One coarsely etched spool hanging at a shoulder; its rim trembles.
    orbitItem(ctx, 'coil', spool[0], spool[1], 8, 1.57 + Math.sin(t * 11) * .03, mat, 4210, pose.fade, t);
    plate(ctx, [[spool[0] - 9, spool[1] - 10], [spool[0] + 9, spool[1] - 10], [spool[0] + 9, spool[1] - 7], [spool[0] - 9, spool[1] - 7]], mat, 4211, { alpha: pose.fade, lit: 1 });
    plate(ctx, [[spool[0] - 9, spool[1] + 7], [spool[0] + 9, spool[1] + 7], [spool[0] + 9, spool[1] + 10], [spool[0] - 9, spool[1] + 10]], mat, 4212, { alpha: pose.fade, lit: 1 });
    return;
  }
  // Four thin metal wires to the visible weapon / hand anchors.
  const ends = [weaponTip(s), [s.handF[0] + f * 4, s.handF[1]], [s.handB[0], s.handB[1]], [lerp(s.handF[0], weaponTip(s)[0], .5), lerp(s.handF[1], weaponTip(s)[1], .5)]];
  const wave = Math.max(pose.act, j.land, j.up) ;
  ends.forEach((e, i) => {
    let end = e;
    if (pose.guardK > .05) end = lerpP(end, [s.x + f * 26, s.chest[1] - 28 + i * 18], pose.guardK);
    if (gr.k > 0 && i < 2) end = lerpP(end, [gr.tx ?? s.x + f * 40, s.chest[1] - 6 + i * 6], gr.k);
    if (fw.s && i === 0) end = lerpP(end, [s.x + f * 110, s.chest[1] - 6], fw.s);
    end = lerpP(end, [s.x + f * (110 + i * 12), s.chest[1] - 24 + i * 16], fw.f);
    if (up.s && i === 0) end = lerpP(end, [s.x + f * 20, s.head[1] - 40], up.s);
    end = lerpP(end, [s.x + f * (10 + i * 10), s.head[1] - 50 - i * 6], up.f);
    if (dn.s && i === 0) end = lerpP(end, [s.x + f * 30, s.y], dn.s);
    end = lerpP(end, [s.x + f * (20 + i * 22), s.y + (i % 2 ? 4 : -4)], dn.f);
    // Jump: the wires stretch behind on the ascent and snap back on landing.
    const mid = [lerp(spool[0], end[0], .5) - f * j.up * 18, lerp(spool[1], end[1], .5) + Math.sin(t * 14 + i * 2) * (1 + 3 * wave) * (1 - j.apex)];
    line(ctx, [spool, mid, end], i % 2 ? mat.edge : mat.vein, 1, pose.fade * .95);
    specks(ctx, [lerpP(spool, end, (t * 1.5 + i * .25) % 1)], mat.core, wave * .9);
  });
  if (pose.guardK > .3) for (let k = 0; k < 3; k++) line(ctx, [[s.x + f * 26, s.chest[1] - 28], [s.x + f * 26, s.chest[1] + 26]].map(([x, y]) => [x + f * k * 3, y]), mat.edge, 1, pose.guardK * .5);
  if (fw.f) for (let k = 0; k < 6; k++) line(ctx, [[s.x + f * 40, s.chest[1] - 24 + k * 8], [s.x + f * 130, s.chest[1] - 30 + k * 10]], mat.vein, 1, fw.f * .7);
  if (dn.f) for (let k = 0; k < 4; k++) groundRing(ctx, s.x + f * (20 + k * 22), s.y, 5, mat, t, dn.f, 4, 4220 + k, 2);
}

// ── T14 Glyphenschmied: a stamped glyph-plate pendulum on one clamp ──────
function glyphenschmied(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const clamp = gather([s.shoulderB[0] - f * 12, s.shoulderB[1] - 22], s.shoulderB, pose.fade * 1.4);
  // Stop-motion: the plates move in small detent steps.
  const step = Math.floor(t * 4) / 4;
  if (layer === 'back') {
    plate(ctx, [[clamp[0] - 8, clamp[1] - 6], [clamp[0] + 8, clamp[1] - 6], [clamp[0] + 6, clamp[1] + 2], [clamp[0] + 2, clamp[1] + 2], [clamp[0] + 2, clamp[1] - 2], [clamp[0] - 2, clamp[1] - 2], [clamp[0] - 2, clamp[1] + 2], [clamp[0] - 6, clamp[1] + 2]], mat, 4310, { alpha: pose.fade, lit: 1, glowEdge: .5 });
  }
  for (let i = 0; i < 3; i++) {
    const out = j.air ? Math.sin(t * 12 + i) * 5 * (1 - j.apex) : 0;
    let c = [clamp[0] + Math.sin(step * 1.7 + i) * 2 + out, clamp[1] + 14 + i * 17 + j.land * 3 * i];
    let rot = .12 * (i - 1) + Math.sin(step + i) * .05;
    if (i === 1) { c = lerpP(c, [s.x + f * 24, s.chest[1] - 4], pose.guardK); rot = lerp(rot, 0, pose.guardK); }
    if (i === 2 && gr.k) c = lerpP(c, [gr.tx ?? s.x + f * 36, s.chest[1]], gr.k);
    if (i === 0) c = lerpP(c, [s.x + f * 40, s.chest[1] - 6], fw.s);
    c = lerpP(c, [s.x + f * (40 + i * 18), s.chest[1] - 6], fw.f); rot = lerp(rot, 0, fw.f);
    if (i === 0) c = lerpP(c, [c[0], c[1] - 30], up.s);
    c = lerpP(c, [s.x + f * 20, s.y - 30 - i * 30], up.f);
    if (i === 0) c = lerpP(c, [s.x + f * 30, s.y - 6], dn.s);
    c = lerpP(c, [s.x + f * (30 + (i - 1) * 26), s.y - 4], dn.f); rot = lerp(rot, 0, dn.f);
    c = gather(c, clamp, pose.fade * 1.4 - i * .12);
    const isFront = pose.guardK > .5 && i === 1 || fw.a > .5 || up.f > .5 || dn.a > .5 || gr.k > .5 && i === 2;
    if ((layer === 'front') !== isFront) continue;
    if (!isFront && i === 0) line(ctx, [clamp, c], mat.edge, 1, .6 * pose.fade);
    const sc = 1 + .6 * Math.max(fw.f, up.f, dn.f); const w = 9 * sc; const h = 8 * sc;
    shape(ctx, c, rot, f, [[-w, h], [w * .8, h * 1.1], [w, -h], [-w * .9, -h * .85]], mat, 4320 + i, { alpha: pose.fade, lit: .9, glowEdge: .5 });
    // Dark punched holes stay visible; only the embossed notches start to glow.
    const P = frame(c, rot, f); specks(ctx, [P(-w * .4, h * .3), P(w * .3, -h * .2)], '#000000', .8 * pose.fade, 2);
    line(ctx, [P(-w * .5, -h * .4), P(0, h * .4), P(w * .5, -h * .4)], mat.vein, 1.2, (.3 + .5 * (pose.fullReady ? 1 : Math.max(0, Math.sin(t * 1.3 + i)))) * pose.fade);
  }
  if (layer === 'front') {
    if (fw.f) channel(ctx, s.x + f * 30, s.chest[1] - 6, f, 100 * fw.f, 16, mat, 4330, fw.f * .45, 5);
    if (dn.f) for (let k = 0; k < 3; k++) groundRing(ctx, s.x + f * 30, s.y, 18 + k * 18, mat, t * (k % 2 ? -1 : 1), dn.f * (1 - k * .2), 6 + k * 2, 4340 + k * 10, 3, .5);
  }
}

// ── T15 Spektralweiche: four crossing spectral conductor bands ───────────
function spektralweiche(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const cols = [mat.vein, mat.edge, mat.spark, form.palette?.[1] ?? mat.body];
  // The order of the bands swaps with the colour phase; they cross but never merge.
  const order = Math.floor(t * .5) % 2 ? [1, 0, 3, 2] : [0, 1, 2, 3];
  const roots = [[s.back[0] - f * 8, s.back[1] - 12], [s.back[0] - f * 12, s.back[1]], [s.back[0] - f * 6, s.back[1] + 12], [s.hipB[0] - f * 8, s.hipB[1]]];
  const ends = [weaponTip(s), s.handF, [s.handF[0] + f * 8, s.handF[1] + 6], [s.handF[0] + f * 12, s.handF[1] - 8]];
  // The bands run behind the body from the back to the hand; attacks / guard bring them forward.
  const forward = Math.max(pose.guardK, fw.a, up.f, dn.f, gr.k) > .5;
  if ((layer === 'front') !== forward) { if (layer === 'front') specks(ctx, [s.handF, weaponTip(s)], mat.core, .8 * pose.fade, 2); return; }
  order.forEach((k, i) => {
    let a = gather(roots[k], s.chest, pose.fade * 1.4); let b = ends[i];
    if (pose.guardK > .05) b = lerpP(b, [s.x + f * 26, s.chest[1] - 24 + i * 16], pose.guardK);
    if (gr.k > 0 && i === 0) b = lerpP(b, [gr.tx ?? s.x + f * 40, s.chest[1]], gr.k);
    if (fw.s && i === 0) b = lerpP(b, [s.x + f * 90, s.chest[1] - 4], fw.s);
    b = lerpP(b, [s.x + f * 150, s.chest[1] - 6 + (i - 1.5) * 3], fw.f);
    b = lerpP(b, [s.x + f * (10 + i * 8), s.head[1] - 40 - i * 16], up.f);
    b = lerpP(b, [s.x + f * (30 + i * 26), s.y + (i - 1.5) * 4], dn.f);
    const sag = j.air ? (j.apex ? -12 : 14) : 0;
    const mid = [lerp(a[0], b[0], .5) - f * 10, lerp(a[1], b[1], .5) - 14 + (i - 1.5) * 5 + sag + Math.sin(t * 2 + i) * 2];
    band(ctx, [a, mid, b], () => 1.8, { ...mat, kind: 'crystal', vein: cols[k] }, 4410 + k, { t, alpha: pose.fade * .55 });
    line(ctx, [a, mid, b], cols[k], 1, pose.fade * .8);
    // Colour cores travel through the inner tubes at different speeds.
    const ph = (t * (.6 + k * .2)) % 1; const p = ph < .5 ? lerpP(a, mid, ph * 2) : lerpP(mid, b, ph * 2 - 1);
    plate(ctx, [[p[0] - 2, p[1] - 2], [p[0] + 2, p[1] - 2], [p[0] + 2, p[1] + 2], [p[0] - 2, p[1] + 2]], { ...mat, vein: cols[k] }, 4420 + k, { alpha: pose.fade, core: 1 });
  });
  if (layer !== 'front') return;
  if (fw.f) channel(ctx, s.x + f * 30, s.chest[1] - 6, f, 130 * fw.f, 6, { ...mat, kind: 'crystal' }, 4430, fw.f);
  if (up.f) column(ctx, s.x + f * 20, s.y, 120 * up.f, 6, { ...mat, kind: 'crystal' }, 4440, up.f * .7);
  if (up.s) line(ctx, [s.handF, [s.handF[0], s.handF[1] - 50 * up.s]], mat.spark, 2, up.s);
  if (dn.s) groundRing(ctx, s.x, s.y, 12, mat, t, dn.s, 6, 4450, 2);
}

// ── T16 Vierknoten: four unequally weighted pendulum knots ──────────────
function vierknoten(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const knots = [{ piv: [-10, -96], L: 26, m: 12, d: -1 }, { piv: [-26, -80], L: 34, m: 10, d: -1 }, { piv: [-4, -70], L: 18, m: 7, d: 1 }, { piv: [-34, -58], L: 30, m: 15, d: -1 }];
  knots.forEach((k, i) => {
    const piv = [s.x + f * k.piv[0], s.y + k.piv[1]];
    // Each pendulum has its own phase and spin; jumps swing them down, the apex over the arc.
    const sw = Math.sin(t * (1.6 + i * .3) + i * 1.7) * .35 - pose.lean * .4 + j.apex * Math.sin(t * 3 + i) * 1.2 + j.land * Math.sin(t * 20 - i) * .5;
    let w = [piv[0] + f * Math.sin(sw) * k.L, piv[1] + Math.cos(sw) * k.L + j.air * (1 - j.apex) * 10];
    if (i === 0) w = lerpP(w, [s.x + f * 28, s.chest[1] - 4], pose.guardK);
    if (gr.k && i < 2) w = lerpP(w, [(gr.tx ?? s.x + f * 40) + (i ? 6 : -6), s.chest[1] - 4], gr.k);
    if (i === 0) w = lerpP(w, [s.x + f * 46, s.chest[1] - 6], fw.s);
    w = lerpP(w, [s.x + f * (40 + i * 30), s.chest[1] - 8 + (i % 2) * 10], fw.f);
    if (i === 2) w = lerpP(w, [s.x + f * 14, s.head[1] - 30], up.s);
    w = lerpP(w, [s.x + f * (16 + i * 8), s.y - 30 - i * 28], up.f);
    if (i === 3) w = lerpP(w, [s.x + f * 30, s.y - 4], dn.s);
    const ga = i * TAU / 4 + .4; w = lerpP(w, [s.x + Math.cos(ga) * 50, s.y + Math.sin(ga) * 14], dn.f);
    w = gather(w, piv, pose.fade * 1.4 - i * .1);
    const isFront = k.d > 0 || pose.guardK > .5 && i === 0 || fw.a > .5 || dn.f > .5 || gr.k > .5 && i < 2;
    if ((layer === 'front') !== isFront) return;
    // Short wound light axes as suspensions.
    if (!fw.f && !dn.f && !up.f) { const pts = []; for (let q = 0; q <= 5; q++) { const u = q / 5; pts.push([lerp(piv[0], w[0], u) + Math.sin(u * 12 + t * 4) * 1.5, lerp(piv[1], w[1], u)]); } line(ctx, pts, mat.edge, 1, .7 * pose.fade); }
    // A heavy weight body under the knot, so the four pendulums read as mass.
    plate(ctx, [[w[0] - k.m * .45, w[1] - k.m * .2], [w[0] + k.m * .45, w[1] - k.m * .25], [w[0] + k.m * .35, w[1] + k.m * .55], [w[0] - k.m * .35, w[1] + k.m * .5]], mat, 4515 + i, { alpha: pose.fade, lit: 1, glowEdge: .6 });
    orbitItem(ctx, 'knot', w[0], w[1], k.m * (1 + .4 * fw.f), t * (1 + i * .3) * (i % 2 ? -1 : 1), mat, 4510 + i, pose.fade, t);
    if (fw.f && fw.e > .1 + i * .06) specks(ctx, [[w[0], w[1]]], mat.core, fw.f, 4);
  });
}

// ── T17 Glutmauser: ember shingles tearing off in a diagonal moult strip ─
function glutmauser(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const N = 9;
  for (let i = 0; i < N; i++) {
    // Stepped slanted strip from the back: the top shingles peel off, new ones grow at the bottom.
    const life = ((t * .35 + i / N) % 1);
    let p = [s.back[0] - f * (6 + life * 50 + (i % 3) * 5), s.back[1] - 30 + life * 70 - (i % 2) * 6];
    if (j.air) p = [p[0], p[1] + (1 - j.apex) * life * 30];
    let rot = -.6 - life * .5;
    if (pose.guardK > .05) { p = lerpP(p, [s.x + f * (20 + (i % 3) * 4), s.chest[1] - 30 + i * 7], pose.guardK); rot = lerp(rot, .2, pose.guardK); }
    if (gr.k && i === 0) p = lerpP(p, [gr.tx ?? s.x + f * 36, s.chest[1]], gr.k);
    if (i === 0) p = lerpP(p, [s.x + f * 60, s.chest[1] - 4], fw.s);
    p = lerpP(p, [s.x + f * (24 + i * 10), s.chest[1] - 4 + Math.abs(i - 4) * 3], fw.f); rot = lerp(rot, 1.57, fw.f);
    p = lerpP(p, [s.x + f * 14 + (i % 2 ? 4 : -4), s.y - 10 - i * 14], up.f);
    p = lerpP(p, [s.x + f * (i - 4) * 14, s.y - 2], dn.f);
    p = gather(p, s.back, pose.fade * 1.4 - i * .05);
    const isFront = pose.guardK > .5 || fw.a > .5 || up.f > .5 || dn.f > .5 || gr.k > .5 && i === 0;
    if ((layer === 'front') !== isFront) continue;
    const peel = life > .75 ? (life - .75) / .25 : 0; const grow = life < .1 ? life / .1 : 1;
    const w = 7 + (i % 3) * 2;
    shape(ctx, p, rot, f, [[-w * .5, 0], [w * .5, 1], [w * .4, w * 1.1], [-w * .45, w]].map(([u, v]) => [u * grow, v * grow]), mat, 4610 + i, { alpha: pose.fade * (1 - peel), glowEdge: 1, pulse: .5 + .5 * Math.sin(t * 5 + i), core: peel * .8 });
    if (peel > 0) fallout(ctx, [p], mat, t, 4620 + i, { count: 2, alpha: peel, driftY: -10 });
  }
  if (layer === 'front') {
    if (up.s) column(ctx, s.x + f * 10, s.chest[1], 50 * up.s, 3, mat, 4630, up.s, 3);
    if (up.f) column(ctx, s.x + f * 14, s.y, 150 * up.f, 8, { ...mat, kind: 'crystal' }, 4640, up.f * .6);
    if (dn.s) fallout(ctx, [[s.x, s.y], [s.x + f * 20, s.y]], mat, t, 4650, { count: 10, alpha: dn.s, driftX: f * 30 });
  }
}

// ── T18 Morphgitter: an open tool grid of switching prism cells ──────────
function morphgitter(ctx, s, pose, mat, form, layer) {
  if (layer !== 'front' && layer !== 'back') return;
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const glass = { ...mat, kind: 'crystal' };
  // A flat, incomplete technical lattice around the player; some cells stay empty.
  const nodes = [s.handF, s.handB, s.shoulderF, s.shoulderB, s.hip, [s.x + f * 30, s.chest[1] - 20], [s.x - f * 30, s.chest[1] + 4], [s.x + f * 26, s.hip[1] + 12]];
  const pos = nodes.map((n, i) => {
    let p = [n[0] + f * (i > 4 ? 0 : (i % 2 ? -12 : 12)), n[1] + Math.round(Math.sin(t * 1.5 + i * 2.3)) * 3 + (j.air && i > 4 ? 8 : 0)];
    if (pose.guardK > .05) { const a = (i / 7 - .5) * 2; p = lerpP(p, [s.x + f * (24 + Math.cos(a) * 8), s.chest[1] + Math.sin(a) * 32], pose.guardK); }
    p = lerpP(p, [s.x + f * (24 + (i % 4) * 16), s.chest[1] - 10 + Math.floor(i / 4) * 14], fw.f);
    p = lerpP(p, [s.x + f * (14 + (i % 2) * 14), s.y - 10 - Math.floor(i / 2) * 28], up.f);
    p = lerpP(p, [s.x + f * 30 + (i % 4 - 1.5) * 18, s.y - 6 - Math.floor(i / 4) * 8], dn.f);
    return gather(p, s.chest, pose.fade * 1.4 - i * .05);
  });
  if (layer === 'back') {
    const links = [[0, 2], [2, 3], [3, 1], [2, 5], [5, 7], [4, 7], [3, 6], [6, 4]];
    links.forEach(([a, b], i) => { if (j.air && i < 2) return; line(ctx, [pos[a], pos[b]], mat.vein, 1, .45 * pose.fade); });
    return;
  }
  pos.forEach((p, i) => {
    if (Math.sin(t * .9 + i * 1.9) > .7 && !fw.f && !up.f && !dn.f) return; // transparent cells
    const r = 5 + (i % 3) + 3 * Math.max(fw.f, dn.f);
    plate(ctx, Array.from({ length: 6 }, (_, q) => [p[0] + Math.cos(q * TAU / 6) * r, p[1] + Math.sin(q * TAU / 6) * r]), glass, 4710 + i, { alpha: pose.fade * .9, glowEdge: .9, core: .3 });
  });
  if (gr.k > 0) { const tx = gr.tx ?? s.x + f * 40; for (const sg of [-1, 1]) line(ctx, [s.handF, [tx, s.chest[1] + sg * 8], [tx + f * 6, s.chest[1]]], mat.edge, 2, gr.k); }
  if (fw.s) channel(ctx, s.handF[0], s.handF[1], f, 80 * fw.s, 3, glass, 4720, fw.s, 3);
  if (fw.f) channel(ctx, s.x + f * 86, s.chest[1] - 4, f, 90 * fw.f, 8, mat, 4730, fw.f);
  if (dn.s) plate(ctx, [[s.x + f * 14, s.y - 2], [s.x + f * 34, s.y - 2], [s.x + f * 34, s.y + 3], [s.x + f * 14, s.y + 3]], glass, 4740, { alpha: dn.s, glowEdge: 1 });
}

// ── T19 Schwuranker: three heavy horseshoe anchor clamps ────────────────
function schwuranker(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const drag = Math.max(pose.sprintK, pose.run * .6) * 14;
  const clamps = [{ p: [s.shoulderB[0] - f * 8, s.shoulderB[1] - 16], r: 13, rot: .3 }, { p: [s.hipF[0] + f * 16, s.hipF[1] + 10], r: 11, rot: -.4 }, { p: [s.handF[0] + f * 14, s.handF[1] - 2], r: 9, rot: 1.57 }];
  clamps.forEach((c, i) => {
    // Heavy and almost still; running drags them behind with a delayed bronze motion.
    let p = [c.p[0] - f * drag * (1 + i * .3), c.p[1] + j.air * 14 * (1 - j.apex) + j.land * 4];
    let rot = c.rot + Math.sin(t * .8 + i) * .03;
    if (i === 0) { p = lerpP(p, [s.x + f * 26, s.chest[1] - 12], pose.guardK); rot = lerp(rot, 1.57, pose.guardK); }
    if (i === 1) p = lerpP(p, [s.x + f * 18, s.y - 8], pose.guardK * .6);
    if (gr.k && i === 2) p = lerpP(p, [gr.tx ?? s.x + f * 40, s.chest[1]], gr.k);
    if (i === 2) p = lerpP(p, [s.x + f * 60, s.chest[1] - 4], fw.s);
    p = lerpP(p, [s.x + f * (30 + i * 28), s.chest[1] - 4], fw.f); rot = lerp(rot, 1.57, fw.f);
    if (i === 0) p = lerpP(p, [p[0], p[1] - 34], up.s);
    if (i < 2) { p = lerpP(p, [s.x + f * 20 + (i ? 18 : -18), s.head[1] - 10], up.f); rot = lerp(rot, 0, up.f); }
    if (i === 1) p = lerpP(p, [s.x + f * 24, s.y - 14], dn.s);
    p = lerpP(p, [s.x + f * (20 + i * 26), s.y - 8], dn.f); rot = lerp(rot, Math.PI, dn.f);
    p = gather(p, [s.x, s.y], pose.fade * 1.3 - i * .1);
    const isFront = i > 0 || pose.guardK > .5 || fw.a > .5 || up.f > .5;
    if ((layer === 'front') !== isFront) return;
    // A thick U with a clearly empty inside.
    const pts = []; for (let q = 0; q <= 8; q++) { const a = Math.PI * (q / 8); pts.push(frame(p, rot, f)(Math.cos(a) * c.r, -Math.sin(a) * c.r)); }
    band(ctx, pts, () => 3.4, mat, 4810 + i, { t, alpha: pose.fade });
    for (const e of [pts[0], pts[8]]) plate(ctx, [[e[0] - 3, e[1] - 3], [e[0] + 3, e[1] - 3], [e[0] + 3, e[1] + 3], [e[0] - 3, e[1] + 3]], mat, 4820 + i, { alpha: pose.fade, lit: 1 });
  });
  if (layer === 'front') {
    if (fw.f) channel(ctx, s.x + f * 26, s.chest[1] - 4, f, 110 * fw.f, 5, mat, 4830, fw.f * .7);
    if (dn.f) for (let k = 0; k < 3; k++) groundRing(ctx, s.x + f * (20 + k * 26) + Math.sin(t * 20) * 2, s.y, 8 + (1 - dn.f) * 20, mat, t, dn.f, 6, 4840 + k, 3);
  }
}

// ── T20 Taktklinge: rhythmic blade edges right on the movement axes ──────
function taktklinge(ctx, s, pose, mat, form, layer) {
  if (layer !== 'front') return;
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  // Two short faceted edges mark the forearms; nearly invisible in idle (two alternating needle lights).
  const beat = Math.floor(t * 4) % 2; const moving = Math.max(pose.run, pose.sprintK, pose.act);
  [[s.elbowF, s.handF], [s.elbowB, s.handB]].forEach(([a, b], i) => {
    let A = a; let B = b;
    if (pose.guardK > .05) { A = lerpP(A, [s.x + f * 16, s.chest[1] + (i ? 14 : -14)], pose.guardK); B = lerpP(B, [s.x + f * 30, s.chest[1] + (i ? -14 : 14)], pose.guardK); }
    const vis = Math.max(.15 + (beat === i ? .5 : 0), moving, pose.guardK, fw.a, up.a, dn.a) * pose.fade;
    const dx = B[0] - A[0]; const dy = B[1] - A[1]; const l = Math.hypot(dx, dy) || 1; const nx = -dy / l * 3; const ny = dx / l * 3;
    plate(ctx, [[A[0] + nx, A[1] + ny], [B[0] + nx * 1.4 + dx * .2, B[1] + ny * 1.4 + dy * .2], [B[0], B[1]], [A[0] - nx * .5, A[1] - ny * .5]], mat, 4910 + i, { alpha: vis, glowEdge: 1.2, lit: 1 });
  });
  // Rhythm notches flash only at real foot movement ends (steps, takeoff, apex, landing).
  const stepPhase = (t * 8) % TAU; const stepHit = pose.run > .2 && Math.abs(Math.sin(stepPhase)) > .93;
  const flash = Math.max(stepHit ? 1 : 0, j.land, j.apex * j.air, pose.vy > 150 ? 1 : 0);
  if (flash > 0) for (const foot of [s.footF, s.footB]) { line(ctx, [[foot[0] - 5, foot[1] + 1], [foot[0] + 5, foot[1] - 2]], mat.edge, 2, flash * pose.fade); specks(ctx, [[foot[0] + 3, foot[1] - 4]], mat.core, flash); }
  if (gr.k) specks(ctx, [[s.handF[0] + f * 6, s.handF[1]]], mat.core, gr.k, 4);
  // Full: staggered rhythmic cut waves accompany the original action.
  const cut = (x, y, a, k, seed) => plate(ctx, [[x, y], [x + f * Math.cos(a) * 40, y + Math.sin(a) * 40], [x + f * Math.cos(a + .12) * 30, y + Math.sin(a + .12) * 30]], mat, seed, { alpha: k, glowEdge: 1.3 });
  if (fw.s) cut(s.x + f * 14, s.chest[1], -.3, fw.s, 4920);
  if (fw.f) for (let k = 0; k < 4; k++) if (fw.e > k * .07) cut(s.x + f * (14 + k * 22), s.chest[1] - 6 + k * 3, -.4 + k * .2, fw.f, 4925 + k);
  if (up.s) cut(s.x + f * 10, s.chest[1], -1.4, up.s, 4930);
  if (up.f) for (let k = 0; k < 4; k++) if (up.e > k * .07) cut(s.x + f * 10, s.chest[1] - k * 26, -1.3, up.f, 4935 + k);
  if (dn.s) line(ctx, [[s.x, s.y + 1], [s.x + f * 30, s.y + 1]], mat.edge, 2, dn.s);
  if (dn.f) for (let k = 0; k < 5; k++) if (dn.e > k * .06) line(ctx, [[s.x + f * (16 + k * 26), s.y + 3], [s.x + f * (30 + k * 26), s.y - 3]], mat.edge, 2, dn.f);
}

// ── T21 Orbitpranke: compact swarm of porous orbit claws at hands/elbows ─
function orbitpranke(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const centres = [s.handF, s.handB, s.elbowF, s.elbowB];
  for (let i = 0; i < 12; i++) {
    const c = centres[i % 4]; const ring = Math.floor(i / 4);
    // Two unequal tight rotation paths; they jump briefly on every melee hit; slow at the apex.
    const sp = (2.2 + ring * .7) * (i % 2 ? -1 : 1) * (1 - .7 * j.apex);
    const a = t * sp + i * 1.3; const r = 9 + ring * 4 + pose.hitK * 10;
    let p = [c[0] + Math.cos(a) * r - f * j.air * 10 * ring, c[1] + Math.sin(a) * r * .5];
    if (pose.guardK > .05) { const g = (i / 11 - .5) * 2; p = lerpP(p, [s.x + f * (24 + Math.abs(g) * -4), s.chest[1] + g * 26], pose.guardK); }
    if (gr.k && i < 2) p = lerpP(p, [(gr.tx ?? s.x + f * 40) + (i ? 5 : -5), s.chest[1]], gr.k);
    if (fw.s) p = lerpP(p, [s.handF[0] + f * (20 + i * 3), s.handF[1] + (i % 3 - 1) * 4], fw.s);
    const na = i / 12 * TAU; p = lerpP(p, [s.x + f * 40 + Math.cos(na) * 8 * .4, s.chest[1] + Math.sin(na) * 14], fw.f);
    if (i === 0) p = lerpP(p, [s.handF[0], s.handF[1] - 50], up.s);
    p = lerpP(p, [s.x + f * (10 + Math.sin(i) * 20), s.y - 40 - i * 8], up.f);
    p = lerpP(p, [s.x + Math.cos(na) * 70, s.y + Math.sin(na) * 18], dn.f);
    p = gather(p, c, pose.fade * 1.5);
    const back = Math.sin(a) < 0 && pose.guardK < .5 && !fw.a && !up.f && !dn.f;
    if ((layer === 'back') !== back) continue;
    shard(ctx, p[0], p[1], 3.5 + ring, a, mat, 5010 + i, pose.fade);
  }
  if (layer === 'front') {
    if (fw.f) channel(ctx, s.x + f * 44, s.chest[1], f, 140 * fw.f, 7, mat, 5030, fw.f);
    if (dn.s) groundRing(ctx, s.x, s.y, 12, mat, t, dn.s, 6, 5040, 2);
  }
}

// ── T22 Zündschuppe: locally ignited joint tiles (no scale skin) ────────
function zuendschuppe(ctx, s, pose, mat, form, layer) {
  if (layer !== 'front') return;
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const spots = [s.shoulderB, s.shoulderF, s.handF, s.handB, s.kneeF, s.kneeB, [s.footF[0], s.footF[1] - 4]];
  const pos = spots.map((p, i) => {
    let q = [p[0] + (i % 2 ? -1 : 1) * f * 3, p[1]];
    if (pose.guardK > .05 && i < 3) q = lerpP(q, [s.x + f * 22, s.chest[1] - 14 + i * 14], pose.guardK);
    if (gr.k && (i === 2 || i === 1)) q = lerpP(q, [gr.tx ?? s.x + f * 36, s.chest[1] + (i === 2 ? 6 : -6)], gr.k);
    if (dn.f) { const a = i / 7 * TAU; q = lerpP(q, [s.x + Math.cos(a) * 60, s.y + Math.sin(a) * 16], dn.f); }
    return gather(q, s.chest, pose.fade * 1.4 - i * .06);
  });
  // Burn sparks run from tile to tile like fuse wire; jumps ignite them staggered, landing lights the soles last.
  const fuse = (t * 1.2) % pos.length;
  for (let i = 0; i < pos.length - 1; i++) { const k = Math.max(0, 1 - Math.abs(fuse - i - .5)); if (k > 0) specks(ctx, [lerpP(pos[i], pos[i + 1], fuse - i)], mat.spark, k * pose.fade); }
  pos.forEach((p, i) => {
    const lit = j.air ? (Math.floor(t * 10) % 7 === i ? 1 : .2) : (i === 6 ? j.land : 0);
    const w = 4 + (i % 2);
    plate(ctx, [[p[0] - w, p[1] - w + 1], [p[0] + w, p[1] - w], [p[0] + w - 1, p[1] + w], [p[0] - w + 1, p[1] + w - 1]], mat, 5110 + i, { alpha: pose.fade, lit: .6, glowEdge: .5 + lit, core: lit });
    line(ctx, [[p[0] - w + 2, p[1]], [p[0] + w - 2, p[1] - 1]], mat.vein, 1, .9 * pose.fade); // thin burn notch
  });
  if (fw.s) specks(ctx, [[s.handF[0] + f * 6, s.handF[1]], [s.handF[0] + f * 9, s.handF[1] - 3]], mat.spark, fw.s, 3);
  if (fw.f) channel(ctx, s.x + f * 24, s.chest[1] - 2, f, 140 * fw.f, 10, mat, 5130, fw.f * .8);
  if (up.s) line(ctx, [s.shoulderF, [s.shoulderF[0] + f * 6, s.shoulderF[1] - 40 * up.s]], mat.spark, 3, up.s);
  if (up.f) { const pts = []; for (let k = 0; k <= 12; k++) pts.push([s.x + f * 20 + Math.cos(k * 1.2 + t * 8) * 12, s.y - k * 12]); band(ctx, pts, () => 3, mat, 5140, { t, alpha: up.f }); }
  if (dn.s) groundRing(ctx, s.footF[0], s.y, 10, mat, t, dn.s, 6, 5150, 2);
  if (dn.f) pos.forEach((p, i) => specks(ctx, [p], mat.core, dn.f * (Math.sin(t * 30 + i) > 0 ? 1 : .4), 5));
}

// ── T23 Nullfeldträger: negative spaces with real light withdrawal ───────
function nullfeld(ctx, s, pose, mat, form, layer) {
  if (layer !== 'front') return;
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const holes = [{ p: [s.handF[0] + f * 16, s.handF[1] - 4], r: 9, n: 5 }, { p: [s.shoulderB[0] - f * 18, s.shoulderB[1] - 12], r: 12, n: 6 }, { p: [s.hip[0] - f * 26, s.hip[1] + 6], r: 7, n: 4 }];
  holes.forEach((h, i) => {
    let c = [h.p[0] + Math.sin(t * .9 + i * 2) * 3, h.p[1] + Math.cos(t * 1.1 + i) * 2];
    // Jump: one hole drags down, another runs over the head; landing collapses them to dither dots.
    if (j.air) c = i === 2 ? [c[0], c[1] + 20] : i === 1 ? lerpP(c, [s.x, s.head[1] - 22], j.apex) : c;
    let r = h.r * (1 - j.land * .7);
    if (i === 0) { c = lerpP(c, [s.x + f * 26, s.chest[1] - 6], pose.guardK); r = lerp(r, 16, pose.guardK); }
    if (gr.k && i === 0) { c = lerpP(c, [gr.tx ?? s.x + f * 40, s.chest[1]], gr.k); r = lerp(r, 6, gr.k); }
    c = lerpP(c, [s.x + f * (40 + i * 34), s.chest[1] - 4], fw.f); r = lerp(r, 14, fw.f);
    c = lerpP(c, [s.x + f * 18, s.y - 30 - i * 40], up.f);
    c = lerpP(c, [s.x + f * (30 + i * 36), s.y - 2], dn.f); r = lerp(r, 12, dn.f);
    c = gather(c, s.chest, pose.fade * 1.4); r *= clamp01(pose.fade * 1.4);
    if (r < 1) return;
    // The interior is missing (light withdrawn), the rim a thin dithering light edge.
    const pts = Array.from({ length: h.n }, (_, q) => { const a = q / h.n * TAU + i + t * .2; return [c[0] + Math.cos(a) * r * (1 + (q % 2) * .2), c[1] + Math.sin(a) * r * .9]; });
    ctx.save(); ctx.globalAlpha = .95 * pose.fade; ctx.fillStyle = '#020204'; ctx.beginPath(); pts.forEach(([x, y], q) => (q ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.restore();
    line(ctx, [...pts, pts[0]], mat.edge, 1, (.5 + .3 * Math.sin(t * 7 + i)) * pose.fade);
    specks(ctx, pts.filter((_, q) => (q + Math.floor(t * 6)) % 2 === 0), mat.edge, .7 * pose.fade, 1);
    // Erasure points drift past and vanish at the edge.
    const ph = (t * .7 + i * .3) % 1; specks(ctx, [[c[0] - r * 1.6 + ph * r * 3.2, c[1] - r * .3]], mat.core, (1 - Math.abs(ph - .5) * 2) * pose.fade);
  });
  if (fw.s) { ctx.save(); ctx.globalAlpha = fw.s; ctx.fillStyle = '#020204'; ctx.fillRect(Math.min(s.handF[0] + f * 6, s.handF[0] + f * 66), s.handF[1] - 1, 60, 2); ctx.restore(); }
  if (fw.f) { ctx.save(); ctx.globalAlpha = .9 * fw.f; ctx.fillStyle = '#020204'; ctx.fillRect(Math.min(s.x + f * 30, s.x + f * 170), s.chest[1] - 10, 140, 20); ctx.restore(); line(ctx, [[s.x + f * 30, s.chest[1] - 11], [s.x + f * 170, s.chest[1] - 11]], mat.edge, 1, fw.f); line(ctx, [[s.x + f * 30, s.chest[1] + 11], [s.x + f * 170, s.chest[1] + 11]], mat.edge, 1, fw.f); }
  if (up.f) { ctx.save(); ctx.globalAlpha = .85 * up.f; ctx.fillStyle = '#020204'; ctx.fillRect(s.x + f * 12 - 7, s.y - 180, 14, 180); ctx.restore(); }
}

// ── T24 Fadenregent: two jointed shadow marionettes hanging on light threads ─
function fadenregent(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const shadow = { ...mat, body: '#0c1018', facet: '#1a2230' };
  for (let p = 0; p < 2; p++) {
    const side = p ? 1 : -1;
    // Hanging offset left / right behind the Wizard, smaller than him, jerking as if pulled.
    const jerk = Math.round(Math.sin(t * 2.3 + p * 2) * 2) * 2;
    let hx = s.x + side * 34 - f * 10; let hy = s.y - 70 + p * 10 + jerk + (j.air ? 14 : 0) - j.land * 6;
    let c = [hx, hy];
    if (p === 1) c = lerpP(c, [s.x + f * 24, s.chest[1] - 18], pose.guardK);
    if (p === 1 && gr.k) c = lerpP(c, [gr.tx ?? s.x + f * 40, s.chest[1] - 16], gr.k);
    if (fw.s && p === 0) c = lerpP(c, [s.x + f * 20, s.chest[1] - 22], fw.s);
    c = lerpP(c, [s.x + f * (16 + p * 12), s.chest[1] - 30 + p * 14], fw.f);
    c = lerpP(c, [s.x + f * (6 + p * 18), s.head[1] - 40 - p * 10], up.f);
    c = lerpP(c, [s.x + f * (30 + p * 40), s.y - 40], dn.f);
    c = gather(c, [s.x, s.y], pose.fade * 1.3 - p * .1);
    const isFront = p === 1 && (pose.guardK > .5 || gr.k > .5) || fw.f > .5;
    if ((layer === 'front') !== isFront) continue;
    // Visible diagonal light threads from a point high above.
    const anchor = [s.x + side * 50 - f * 6, s.y - 128];
    if (!dn.f) for (const [dx, dy] of [[0, -4], [-6, 14], [6, 14], [0, 30]]) line(ctx, [anchor, [c[0] + dx, c[1] + dy]], mat.edge, 1, .6 * pose.fade);
    // Only flat jointed plates (head, torso, four limbs) — no full ghost soldier.
    const sw = Math.sin(t * 3 + p) * .4 + (fw.a || up.a ? 1 : 0);
    plate(ctx, [[c[0] - 4, c[1] - 9], [c[0] + 4, c[1] - 9], [c[0] + 3, c[1] - 1], [c[0] - 3, c[1] - 1]], shadow, 5210 + p, { alpha: pose.fade, glowEdge: .7 });
    plate(ctx, [[c[0] - 6, c[1]], [c[0] + 6, c[1]], [c[0] + 4, c[1] + 18], [c[0] - 4, c[1] + 18]], shadow, 5212 + p, { alpha: pose.fade, glowEdge: .7 });
    limbSegment(ctx, [c[0] - 6, c[1] + 2], [c[0] - 10 + sw * 4, c[1] + 14], 3, shadow, 5214 + p, pose);
    limbSegment(ctx, [c[0] + 6, c[1] + 2], [c[0] + 10 + f * sw * 12, c[1] + 12 - sw * 8], 3, shadow, 5216 + p, pose);
    limbSegment(ctx, [c[0] - 3, c[1] + 18], [c[0] - 5, c[1] + 32], 3, shadow, 5218 + p, pose);
    limbSegment(ctx, [c[0] + 3, c[1] + 18], [c[0] + 5, c[1] + 32], 3, shadow, 5220 + p, pose);
    if (fw.s && p === 0) shape(ctx, [c[0] + f * (14 + fw.s * 60), c[1] + 6], 0, f, [[-5, -3], [5, -2], [6, 3], [-4, 3]], shadow, 5222, { alpha: fw.s, glowEdge: 1 });
  }
  if (layer === 'front') {
    if (fw.f) channel(ctx, s.x + f * 40, s.chest[1] - 16, f, 130 * fw.f, 4, shadow, 5230, fw.f, 6);
    if (dn.f) for (let k = 0; k < 4; k++) { const x = s.x + f * (24 + k * 26); ctx.save(); ctx.globalAlpha = .6 * dn.f; ctx.fillStyle = '#0a0d14'; ctx.beginPath(); ctx.ellipse(x, s.y, 7, 3, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    if (dn.s) line(ctx, [[s.x - f * 6, s.y], [s.x + f * 40, s.y - 2]], '#0a0d14', 3, dn.s);
  }
}

registerFormRenderer('T13', fadenschlag);
registerFormRenderer('T14', glyphenschmied);
registerFormRenderer('T15', spektralweiche);
registerFormRenderer('T16', vierknoten);
registerFormRenderer('T17', glutmauser);
registerFormRenderer('T18', morphgitter);
registerFormRenderer('T19', schwuranker);
registerFormRenderer('T20', taktklinge);
registerFormRenderer('T21', orbitpranke);
registerFormRenderer('T22', zuendschuppe);
registerFormRenderer('T23', nullfeld);
registerFormRenderer('T24', fadenregent);
