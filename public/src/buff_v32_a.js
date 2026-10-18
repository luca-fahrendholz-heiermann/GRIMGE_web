// GRIMGE Prototype — V3.2 individual morphologies of the curated Arcane States
// (docs/GRIMGE_Arcane_States_Atlas_V3_2_Morphologie_Overhaul.md, {ID}.0).
// Each renderer follows its form's binding silhouette, its own transform /
// movement animations (sprint, defense, grab, jump phases) and the
// morphological mapping of the six heavies. Attachment-only, the Wizard's
// sprite never changes; no form builds a humanoid torso (only B02 may).
import {
  plate, band, fallout, shard, orbitItem, TAU, lerp, lerpP, clamp01, ease,
  techOf, jumpOf, grabOf, frame, shape, gather, line, specks, groundRing, channel, column
} from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';

// ── T02 Schlackenkern: one bulbous floating furnace chamber at the hip ───
function schlackenkern(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  // Swings like heavy luggage behind the hip, hangs lower in a jump and stomps on landing.
  let c = [s.hipB[0] - f * 14 - pose.lean * f * 8, s.hipB[1] - 6 + Math.sin(t * 1.4) * 2 + j.air * 18 + j.land * 6];
  c = lerpP(c, [s.x + f * 30, s.y - 30], dn.f);
  const rot = -pose.lean * .35 + Math.sin(t * 1.1) * .05 + (fw.f ? .5 : 0);
  const R = 17 * (1 + .45 * Math.max(fw.f, up.f, pose.fullReady ? .25 : 0));
  if (layer === 'back') {
    if (pose.fade < .6) groundRing(ctx, s.x - f * 12, s.y, 14 + pose.fade * 12, mat, t, 1 - pose.fade, 8, 3100);
    c = gather(c, [s.x - f * 12, s.y], pose.fade * 1.3);
    // Hollow ceramic bell with three broken nozzle bands.
    const P = frame(c, rot, f);
    plate(ctx, [P(-R, R * .8), P(-R * .6, R * 1.2), P(R * .6, R * 1.1), P(R * .95, R * .2), P(R * .7, -R), P(-R * .7, -R * .95)], mat, 3110, { alpha: pose.fade, lit: .9, glowEdge: .5 });
    for (let k = 0; k < 3; k++) { const v = R * (.6 - k * .55); plate(ctx, [P(-R * .9, v), P(R * .9, v + 1), P(R * .85, v - 4), P(-R * .85, v - 5)], mat, 3120 + k, { alpha: pose.fade, glowEdge: .9, pulse: .5 + .5 * Math.sin(t * 3 + k) }); }
    // Furnace mouth glows on the facing side; the door flaps open for the lava lance.
    const open = Math.max(fw.f, fw.s * .5, .15 + .1 * Math.sin(t * 4));
    plate(ctx, [P(R * .5, R * .3), P(R * (.95 + open * .5), R * (.4 + open * .4)), P(R * (.95 + open * .5), -R * (.3 + open * .4)), P(R * .5, -R * .3)], mat, 3130, { alpha: pose.fade, core: 1, glowEdge: 1.4 });
    // Ash falls; a vertical spark plume in jumps; valves breathe against each other.
    fallout(ctx, [P(0, -R)], mat, t, 3140, { count: 5 + j.air * 6, alpha: pose.fade, driftY: j.air ? -30 : 18 });
    if (up.s || up.f) column(ctx, c[0], c[1] - R, 50 + 60 * up.f, 5 + 8 * up.f, mat, 3150, Math.max(up.s, up.f) * .8, up.f ? 5 : 3);
    if (dn.s) groundRing(ctx, s.x, s.y, 20, mat, t, dn.s, 9, 3160, 3);
    if (dn.f) { groundRing(ctx, c[0], s.y, 40 * dn.f, mat, t, dn.f, 12, 3170, 6); fallout(ctx, [[c[0], c[1] + R]], mat, t, 3175, { count: 14, alpha: dn.f, driftY: 40 }); }
  } else {
    const P = frame(c, rot, f);
    // Defense: ceramic shutters close around the facing flank.
    if (pose.guardK > .05) for (let k = 0; k < 3; k++) plate(ctx, [[s.x + f * 18, s.chest[1] - 20 + k * 14], [s.x + f * 28, s.chest[1] - 18 + k * 14], [s.x + f * 27, s.chest[1] - 6 + k * 14], [s.x + f * 17, s.chest[1] - 8 + k * 14]], mat, 3180 + k, { alpha: pose.guardK * pose.fade, lit: .9, glowEdge: .8 });
    // Grab: a furnace hook reaches out of the side valve.
    if (gr.k > 0) { const tx = gr.tx ?? s.x + f * 42; const h = [lerp(c[0], tx, gr.k), lerp(c[1], s.chest[1], gr.k)]; band(ctx, [P(R, 0), [(c[0] + h[0]) / 2, Math.min(c[1], h[1]) - 10], h], () => 2.5, mat, 3190, { t, alpha: gr.k }); shape(ctx, h, 1.2, f, [[0, 0], [8, 4], [10, -6], [4, -2]], mat, 3195, { alpha: gr.k }); }
    if (fw.s) specks(ctx, [P(R * 1.4, 0), P(R * 1.8, 3), P(R * 2.1, -2)], mat.spark, fw.s);
    if (fw.f) channel(ctx, c[0] + f * R, c[1], f, 150 * fw.f, 6, mat, 3196, fw.f);
  }
}

// ── T04 Korallenschild: two coral sail fans at hip height ───────────────
function korallenschild(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose).k;
  [{ p: s.hipB, side: -1, y: -18 }, { p: s.hipF, side: 1, y: 2 }].forEach((sail, i) => {
    let piv = [sail.p[0] + f * sail.side * 6, sail.p[1] + sail.y];
    // The fans open and close slower than breathing; sprint folds them back; jumps pull them under.
    let spread = .9 + .2 * Math.sin(t * .8 + i * 2); let dir = sail.side > 0 ? -.5 : Math.PI + .5; let R = 50 + i * 8;
    const fold = Math.max(pose.sprintK, pose.run * .5); dir = lerp(dir, Math.PI + .1, fold); spread = lerp(spread, .35, fold);
    piv = lerpP(piv, [s.x - f * 6, s.y + 4], j.air * .8); dir = lerp(dir, Math.PI * .5 + (i ? -.4 : .4) * 1, j.air * .7);
    // Defense: the framed edges stand as a V-shield in front.
    piv = lerpP(piv, [s.x + f * 18, s.chest[1] + (i ? 10 : -14)], pose.guardK); dir = lerp(dir, i ? .9 : -.9, pose.guardK); spread = lerp(spread, .45, pose.guardK);
    if (i === 1) { piv = lerpP(piv, [s.x + f * 30, s.chest[1]], gr); dir = lerp(dir, 0, gr); }
    if (i === 0) { dir = lerp(dir, -Math.PI / 2, up.s); }
    dir = lerp(dir, -Math.PI / 2 + (i ? .5 : -.5), up.f); spread = lerp(spread, 1.1, Math.max(up.f, fw.f));
    piv = lerpP(piv, [s.x + f * (16 + i * 6), s.chest[1] + (i ? 6 : -10)], fw.f); dir = lerp(dir, (i ? .3 : -.3), fw.f);
    R *= 1 + .5 * Math.max(fw.f, up.f);
    const isFront = i === 1 || pose.guardK > .5;
    if ((layer === 'front') !== isFront) return;
    piv = gather(piv, [s.x, s.hip[1]], pose.fade * 1.3);
    const k = clamp01(pose.fade * 1.3 - i * .1);
    // Lattice ribs with salt-speckled porcelain membranes between them.
    const ribs = 6; const pts = [];
    for (let r = 0; r <= ribs; r++) { const a = dir + (r / ribs - .5) * spread * 2; pts.push([piv[0] + f * Math.cos(a) * R * k, piv[1] + Math.sin(a) * R * .75 * k]); }
    for (let r = 0; r < ribs; r++) plate(ctx, [piv, pts[r], pts[r + 1]], { ...mat, kind: 'crystal' }, 3310 + i * 10 + r, { alpha: pose.fade * .65, glowEdge: .5, lit: .7 });
    for (const q of pts) line(ctx, [piv, q], mat.edge, 1, .6 * pose.fade);
    specks(ctx, pts.slice(1, -1).map(([x, y]) => [lerp(piv[0], x, .6), lerp(piv[1], y, .6)]), '#ffffff', .7 * pose.fade, 1);
    if (fold > .5) fallout(ctx, [pts[ribs]], mat, t, 3330 + i, { count: 4, alpha: fold * pose.fade, driftX: -f * 30 });
  });
  if (layer === 'front') {
    if (fw.s) channel(ctx, s.handF[0], s.handF[1], f, 90 * fw.s, 3, mat, 3340, fw.s);
    if (fw.f) channel(ctx, s.x + f * 30, s.chest[1], f, 140 * fw.f, 18, { ...mat, kind: 'crystal' }, 3345, fw.f * .6, 7);
    if (dn.s) groundRing(ctx, s.x, s.y, 18, mat, t, dn.s, 8, 3350, 3);
    if (dn.f) for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; specks(ctx, [[s.x + Math.cos(a) * 60 * dn.f, s.y + Math.sin(a) * 18 * dn.f]], '#ffffff', dn.f, 3); groundRing(ctx, s.x + Math.cos(a) * 55 * dn.f, s.y + Math.sin(a) * 16 * dn.f, 7, mat, t, dn.f * .8, 5, 3360 + k, 2); }
  }
}

// ── T05 Bruchflug: three asymmetric gravity fins behind / under ─────────
function bruchflug(ctx, s, pose, mat, form, layer) {
  if (layer !== 'back' && !pose.guardK && !techOf(pose, 'forward').a && !grabOf(pose).k) return;
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose).k;
  const fins = [{ o: [-16, -46], L: 52, a: -2.3, g: .9 }, { o: [-8, -22], L: 40, a: -2.0, g: .5 }, { o: [4, 4], L: 34, a: -1.6, g: 1.4 }];
  fins.forEach((fin, i) => {
    // Different anchors and gains: the fins tilt differently on acceleration and slide on after a stop.
    let base = [s.x + f * fin.o[0] - pose.lean * f * 10 * fin.g, s.y + fin.o[1]];
    let rot = fin.a - pose.lean * .6 * fin.g + Math.sin(t * 1.3 + i * 2) * .06;
    // Jump: three underside jets on ascent, weightless counter-rotation at the apex.
    rot = lerp(rot, Math.PI + (i - 1) * .3, j.up); rot += j.apex * Math.sin(t * 4 + i) * .8;
    if (i === 0) { base = lerpP(base, [s.x + f * 26, s.chest[1] - 10], pose.guardK); rot = lerp(rot, .1, pose.guardK); }
    if (i === 2) { base = lerpP(base, [s.x + f * 30, s.chest[1] + 10], gr); rot = lerp(rot, 1.2, gr); }
    if (i === 0) { base = lerpP(base, [s.handF[0] + f * 10, s.handF[1]], fw.s); rot = lerp(rot, 1.5, fw.s); }
    base = lerpP(base, [s.x + f * (24 + i * 4), s.chest[1] - 18 + i * 18], fw.f); rot = lerp(rot, 1.57 + (i - 1) * .12, fw.f);
    if (i === 1) rot = lerp(rot, 0, up.s);
    base = lerpP(base, [s.x + f * (10 + i * 12), s.y - 20 - i * 26], up.f); rot = lerp(rot, -.2 + i * .1, up.f);
    if (i === 2) { base = lerpP(base, [s.x + f * 20, s.y], dn.s); rot = lerp(rot, 1.6, dn.s); }
    base = lerpP(base, [s.x + f * (40 + (i - 1) * 26), s.y - 110 + dn.f * 0], dn.f); rot = lerp(rot, Math.PI, dn.f);
    base = gather(base, [s.x, s.y], pose.fade * 1.3 - i * .12);
    const L = fin.L * (1 + .5 * Math.max(fw.f, up.f));
    const front = rot > .6 && rot < 2.5;
    if ((layer === 'front') !== front) return;
    // Black-glass fracture blade with a bright pole node at the tip.
    shape(ctx, base, rot, f, [[-5, 0], [-6, L * .6], [0, L], [5, L * .55], [4, 0]], mat, 3410 + i, { alpha: pose.fade, glowEdge: .8, lit: .6 });
    const tip = frame(base, rot, f)(0, L); plate(ctx, [[tip[0], tip[1] - 3], [tip[0] + 3, tip[1]], [tip[0], tip[1] + 3], [tip[0] - 3, tip[1]]], mat, 3420 + i, { alpha: pose.fade, core: 1 });
  });
  // The space between the fins distorts: dithered warp lines.
  if (layer === 'back') for (let k = 0; k < 4; k++) { const y = s.y - 40 + k * 10; line(ctx, [[s.x - f * 30, y], [s.x - f * 14, y + Math.sin(t * 6 + k) * 2], [s.x + f * 2, y]], mat.vein, 1, .25 * pose.fade); }
  if (layer === 'back' && pose.land) groundRing(ctx, s.x - f * 6, s.y, 16 + (1 - pose.land) * 24, mat, t, pose.land, 8, 3430, 3);
  if (layer === 'front' && fw.f) channel(ctx, s.x + f * 30, s.chest[1], f, 150 * fw.f, 12, { ...mat, body: '#05060a', facet: '#10141c' }, 3440, fw.f * .8);
  if (layer === 'back' && dn.f) for (let k = 0; k < 3; k++) line(ctx, [[s.x + f * (20 + k * 26), s.y - 100], [s.x + f * (20 + k * 26), s.y]], mat.vein, 2, dn.f * .6);
}

// ── T06 Ionspindel: three diagonal electromagnetic coils ────────────────
function ionspindel(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const anchors = [[s.shoulderF[0] + f * 10, s.shoulderF[1] - 6], [s.elbowF[0] + f * 14, s.elbowF[1] + 4], [s.hipB[0] - f * 16, s.hipB[1] + 2]];
  const pos = anchors.map((p, i) => {
    let c = [p[0], p[1] + Math.sin(t * 2 + i) * 2];
    c = lerpP(c, [s.x + f * 24, s.chest[1] - 16 + i * 16], pose.guardK);
    c = lerpP(c, [s.x + f * (24 + i * 34), s.chest[1] - 4 - i * 3], fw.f);
    c = lerpP(c, [s.x + f * 16, s.chest[1] - 20 - i * 30], up.f);
    c = lerpP(c, [s.x + f * (20 + i * 22), s.y - 10], dn.f);
    return gather(c, [s.x, s.chest[1]], pose.fade * 1.4 - i * .1);
  });
  // Rotors spin against each other at different speeds; counter-rotate at the apex.
  const spin = (i) => t * (i % 2 ? -3.2 : 2.4 + i) * (1 + 2 * pose.act) * (j.apex ? -1 : 1);
  if (layer === 'back') {
    // Thin copper threads join the coils; hair-fine sparks jump between them.
    line(ctx, pos, '#c87a3a', 1, .8 * pose.fade);
    for (let i = 0; i < 2; i++) { const a = pos[i]; const b = pos[i + 1]; const m = [(a[0] + b[0]) / 2 + Math.sin(t * 30 + i) * 4, (a[1] + b[1]) / 2 + Math.cos(t * 27 + i) * 4]; line(ctx, [a, m, b], mat.spark, 1, (.4 + .5 * Math.abs(Math.sin(t * 9 + i))) * pose.fade); }
    if (j.air) specks(ctx, [[s.x - f * 10, s.y + 6], [s.x - f * 18, s.y + 14], [s.x - f * 4, s.y + 20]], mat.spark, .8);
  }
  pos.forEach((c, i) => {
    const isFront = i < 2 || pose.guardK > .5 || fw.f > .5;
    if ((layer === 'front') !== isFront) return;
    const r = 8 - i + 3 * fw.f;
    orbitItem(ctx, 'coil', c[0], c[1], r, spin(i) * .1 + .6, mat, 3510 + i, pose.fade, t);
    for (let k = 0; k < 6; k++) { const a = spin(i) + k * TAU / 6; plate(ctx, [[c[0] + Math.cos(a) * (r + 2), c[1] + Math.sin(a) * (r + 2) * .45], [c[0] + Math.cos(a + .4) * (r + 4), c[1] + Math.sin(a + .4) * (r + 4) * .45], [c[0] + Math.cos(a + .2) * (r + 1), c[1] + Math.sin(a + .2) * (r + 1) * .45]], mat, 3520 + i * 6 + k, { alpha: pose.fade, glowEdge: .8 }); }
  });
  if (layer === 'front') {
    if (pose.guardK > .05) for (let k = 0; k < 4; k++) line(ctx, [[s.x + f * 20, s.chest[1] - 26 + k * 4], [s.x + f * (26 + Math.sin(t * 9 + k) * 3), s.chest[1] - 8 + k * 6], [s.x + f * 22, s.chest[1] + 14 + k * 2]], mat.vein, 1, pose.guardK * .7);
    if (gr.k > 0) line(ctx, [pos[1], [gr.tx ?? s.x + f * 40, s.chest[1] + Math.sin(t * 20) * 3]], '#c87a3a', 1.5, gr.k);
    if (fw.s) line(ctx, [s.handF, [s.handF[0] + f * 50, s.handF[1] - 3], [s.handF[0] + f * 90 * fw.s, s.handF[1] + 2]], mat.spark, 2, fw.s);
    if (fw.f) { const pts = []; for (let k = 0; k <= 10; k++) pts.push([pos[2][0] + f * k * 16, pos[2][1] + (k % 2 ? -7 : 7)]); line(ctx, pts, mat.spark, 2, fw.f); line(ctx, pts, mat.core, 1, fw.f); }
    if (up.s) line(ctx, [s.handF, [s.handF[0], s.handF[1] - 50 * up.s]], mat.spark, 2, up.s);
    if (up.f) column(ctx, s.x + f * 16, s.y, 140 * up.f, 7, mat, 3540, up.f * .7);
    if (dn.s) groundRing(ctx, s.x, s.y, 14, mat, t * 4, dn.s, 8, 3550, 2);
    if (dn.f) groundRing(ctx, s.x + f * 40, s.y, 30, mat, t * 5, dn.f, 10, 3560, 4);
  }
}

// ── T08 Ossuarium: acoustic ceramic bell mobile behind the back ──────────
function ossuarium(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose).k;
  // Three bells of different sizes and two hanging grave plates on invisible pull axes.
  const items = [{ kind: 'bell', r: 13, dx: -18, h: 100 }, { kind: 'bell', r: 9, dx: -30, h: 70 }, { kind: 'bell', r: 7, dx: -10, h: 54 }, { kind: 'plate', r: 8, dx: -26, h: 34 }, { kind: 'plate', r: 7, dx: -14, h: 20 }];
  const top = [s.back[0] - f * 20, s.y - 128];
  items.forEach((it, i) => {
    const swing = Math.sin(t * (1.1 + i * .23) + i * 1.9) * (.12 + j.land * .6) - pose.lean * .2;
    let p = [s.x + f * it.dx + Math.sin(swing) * 10, s.y - it.h + j.air * 12];
    if (i === 0) p = lerpP(p, [s.x + f * 26, s.chest[1] - 6], pose.guardK);
    if (i === 4) p = lerpP(p, [s.x + f * 32, s.chest[1] + 10], gr);
    p = lerpP(p, [s.x + f * (26 + i * 18), s.chest[1] - 10], fw.f);
    if (i === 3) p = lerpP(p, [p[0], p[1] - 40], up.s);
    const ua = i * TAU / 5 + t; p = lerpP(p, [s.x + f * 6 + Math.cos(ua) * 34, s.head[1] - 20 + Math.sin(ua) * 16], up.f);
    if (i === 3) p = lerpP(p, [s.x + f * 24, s.y - 8], dn.s);
    p = lerpP(p, [s.x + f * 40 + (i - 2) * 22, s.y - 12], dn.f);
    p = gather(p, [s.x - f * 10, s.y], pose.fade * 1.3 - i * .08);
    const isFront = pose.guardK > .5 && i === 0 || fw.f > .5 || gr > .5 && i === 4;
    if ((layer === 'front') !== isFront) return;
    if (layer === 'back' && !fw.f && !up.f && !dn.f) line(ctx, [[top[0] + i * 2, top[1]], [p[0], p[1] - it.r]], mat.edge, 1, .35 * pose.fade);
    if (it.kind === 'bell') {
      const open = fw.f || up.f ? 1.4 : 1;
      orbitItem(ctx, 'bell', p[0], p[1], it.r * open, swing + (fw.f ? f * 1.57 : 0), mat, 3710 + i, pose.fade, t);
      // Hatched resonance edge running out of each sound rim.
      const rim = p[1] + it.r * .7; line(ctx, [[p[0] - it.r, rim + 2], [p[0], rim + 4 + Math.sin(t * 5 + i) * 2], [p[0] + it.r, rim + 2]], mat.vein, 1, (.4 + .4 * j.land) * pose.fade);
    } else plate(ctx, [[p[0] - it.r * .6, p[1] - it.r], [p[0] + it.r * .6, p[1] - it.r], [p[0] + it.r * .7, p[1] + it.r], [p[0] - it.r * .7, p[1] + it.r]], mat, 3720 + i, { alpha: pose.fade, lit: .8, glowEdge: .5 });
  });
  if (layer === 'front') {
    if (fw.s) channel(ctx, s.x + f * 20, s.chest[1] - 6, f, 90 * fw.s, 3, mat, 3730, fw.s, 4);
    if (fw.f) channel(ctx, s.x + f * 70, s.chest[1] - 10, f, 120 * fw.f, 22, mat, 3735, fw.f * .55);
    if (dn.f) { const w = 70 * dn.f; line(ctx, [[s.x + f * 20, s.y + 6], [s.x + f * (20 + w), s.y + 6], [s.x + f * (20 + w), s.y - 6], [s.x + f * 20, s.y - 6], [s.x + f * 20, s.y + 6]], mat.vein, 2, dn.f); }
  }
}

registerFormRenderer('T02', schlackenkern);
registerFormRenderer('T04', korallenschild);
registerFormRenderer('T05', bruchflug);
registerFormRenderer('T06', ionspindel);
registerFormRenderer('T08', ossuarium);
