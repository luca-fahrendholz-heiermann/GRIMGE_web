// GRIMGE Prototype — V3.2 individual morphologies T01–T12
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

// ── T01 Kammwacht: vertical back fan of four shingle lamellae ────────────
function kammwacht(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose).k;
  const front = layer === 'front';
  for (let i = 0; i < 4; i++) {
    const L = [70, 96, 118, 84][i] * (1 + .1 * (pose.fullReady ? 1 : 0)); const w = 13 - i;
    // Keel fins staggered behind one body side; breathing opens them minimally.
    let base = [s.back[0] - f * (4 + i * 7), s.back[1] + 14 - i * 3];
    let rot = -.32 - i * .1 + Math.sin(t * 1.3 + i * .7) * .03 - Math.max(pose.sprintK, pose.run * .5) * (.35 + i * .08);
    // Jump: the lamellae lie flat like roof tiles, landing pushes them out over the shoulders.
    rot = lerp(rot, -1.35 - i * .05, j.air * (.4 + .6 * j.apex)); rot += j.land * .5;
    // Defense: shear forward into a half-open slanted guard comb.
    base = lerpP(base, [s.x + f * (16 + i * 5), s.back[1] + 20 - i * 10], pose.guardK); rot = lerp(rot, .25 + i * .05, pose.guardK);
    // Grab: two lamella ends cross over the near target.
    if (i >= 2) { base = lerpP(base, [s.x + f * 22, s.chest[1] + 6], gr); rot = lerp(rot, 1.25 + (i - 2) * .5, gr); }
    // Forward: short = one enamel tooth strikes, full = the comb opens into a glowing forward plate channel.
    if (i === 3) rot = lerp(rot, 1.5, fw.s);
    rot = lerp(rot, 1.45 + i * .04, fw.f); base = lerpP(base, [s.x + f * (10 + i * 22), s.chest[1] - 2 + (i % 2) * 6], fw.f);
    // Up: short = the top lamella thrusts up, full = four plates fold into a steep ascent ramp.
    if (i === 2) base = lerpP(base, [base[0], base[1] - 34], up.s);
    base = lerpP(base, [s.x + f * (14 + i * 10), s.y - 20 - i * 30], up.f); rot = lerp(rot, .55, up.f);
    // Down: short = a lamella end sweeps dust, full = shingles brace a wide heat wall from the ground.
    if (i === 0) { rot = lerp(rot, -2.4, dn.s); }
    base = lerpP(base, [s.x + f * (26 + i * 12), s.y + 2], dn.f); rot = lerp(rot, 0, dn.f);
    const facing = rot > .9 || pose.guardK > .5 || dn.f > .5;
    if (front !== facing) continue;
    base = gather(base, [s.hip[0] - f * 4, s.hip[1]], pose.fade * 1.4 - i * .1);
    const k = clamp01(pose.fade * 1.4 - i * .1);
    shape(ctx, base, rot, f, [[-w * .5, 0], [-w * .55, L * .55], [-w * .2, L], [w * .45, L * .82], [w * .55, L * .15]].map(([u, v]) => [u, v * k]), mat, 3010 + i, { alpha: pose.fade, glowEdge: fw.f || up.f || dn.f ? 1.3 : .6, lit: .8, pulse: .5 + .5 * Math.sin(t * 2 + i) });
    // Oxide veins wander only on the real plate surfaces.
    const P = frame(base, rot, f); line(ctx, [P(-1, L * .15 * k), P(1, L * .5 * k), P(-2, L * .8 * k)], mat.vein, 1, .6 * pose.fade);
  }
  if (dn.s && front) fallout(ctx, [[s.x - f * 10, s.y]], mat, t, 3020, { count: 8, alpha: dn.s });
  if (fw.f && front) channel(ctx, s.x + f * 18, s.chest[1] + 2, f, 120 * fw.f, 10, mat, 3030, fw.f * .6);
}

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

// ── T03 Reliktkiefer: three side-floating fossil grip bows (no creature) ─
function reliktkiefer(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose).k;
  const bows = [{ p: s.shoulderB, side: -1, y: -6 }, { p: s.shoulderF, side: 1, y: -4 }, { p: s.hipF, side: 1, y: 14 }];
  bows.forEach((b, i) => {
    // Scissor-like gliding beside the figure (never over the head), one hangs lower.
    let c = [b.p[0] + f * b.side * 26 + Math.sin(t * 1.2 + i * 2) * 4, b.p[1] + b.y + Math.cos(t * 1.5 + i) * 3 + j.air * (j.up * 10 - j.fall * 12 * (i - 1))];
    let rot = b.side * .2 + Math.sin(t * 1.7 + i) * .15; let open = .55 + .15 * Math.sin(t * 2 + i) - j.land;
    c = lerpP(c, [s.x + f * 20, s.chest[1] - 10 + i * 12], pose.guardK); rot = lerp(rot, (i - 1) * .7, pose.guardK);
    if (i === 2) { c = lerpP(c, [s.x + f * 34, s.chest[1] + 8], gr); open = lerp(open, .1, gr); }
    if (i === 1) { c = lerpP(c, [s.x + f * 48, s.chest[1] - 4], fw.s); open = lerp(open, Math.abs(Math.sin(t * 20)) * .5, fw.s); }
    c = lerpP(c, [s.x + f * (38 + i * 16), s.chest[1] - 10 + (i - 1) * 16], fw.f); rot = lerp(rot, (i - 1) * .35, fw.f);
    if (i === 0) c = lerpP(c, [s.x + f * 8, s.head[1] - 22], up.s);
    c = lerpP(c, [s.x + f * 20 + (i - 1) * 14, s.head[1] - 20 - (i === 1 ? 14 : 0)], up.f); rot = lerp(rot, -Math.PI / 2 + (i - 1) * .6, up.f);
    if (i === 2) { const a = dn.s * Math.PI; c = lerpP(c, [s.x + f * Math.cos(a) * 36, s.y - 6 - Math.sin(a) * 8], dn.s); }
    const sp = i / 3 * TAU + t * 3; c = lerpP(c, [s.x + Math.cos(sp) * (30 + i * 12), s.y - 6 + Math.sin(sp) * 6], dn.f);
    const isFront = i > 0 || pose.guardK > .5 || fw.f > .5;
    if ((layer === 'front') !== isFront) return;
    c = gather(c, [s.x + b.side * f * 18, s.y - 10], pose.fade * 1.3 - i * .1);
    // An open fossil bow: two curved jaw bands, visible inner space, turquoise inclusions.
    for (const sg of [-1, 1]) {
      const pts = []; for (let q = 0; q <= 6; q++) { const u = q / 6; const a = rot + sg * (open * .9) * (1 - u * .4) + (u - .3) * sg * 1.1; pts.push([c[0] + f * Math.cos(a) * (8 + u * 22), c[1] + Math.sin(a) * (6 + u * 14)]); }
      band(ctx, pts, (q, n) => 3.2 - q / n * 1.6, mat, 3210 + i * 4 + (sg > 0 ? 1 : 0), { t, alpha: pose.fade });
      specks(ctx, [pts[2], pts[4]], mat.vein, .8 * pose.fade);
    }
  });
  if (layer === 'front' && fw.f) for (let k = 0; k < 5; k++) { const a = -.5 + k * .25; plate(ctx, [[s.x + f * 60, s.chest[1] - 2], [s.x + f * (60 + Math.cos(a) * 90 * fw.f), s.chest[1] + Math.sin(a) * 50 * fw.f], [s.x + f * (60 + Math.cos(a + .1) * 70 * fw.f), s.chest[1] + Math.sin(a + .1) * 40 * fw.f]], mat, 3240 + k, { alpha: fw.f * .7, glowEdge: 1 }); }
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

// ── T07 Dämmerlauf: four smoke sickle flags on forearms and calves ───────
function daemmerlauf(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose).k;
  const smoke = { ...mat, kind: 'smoke' };
  const sets = [{ a: s.elbowF, b: s.handF, leg: false, front: true }, { a: s.elbowB, b: s.handB, leg: false, front: false }, { a: s.kneeF, b: s.footF, leg: true, front: true }, { a: s.kneeB, b: s.footB, leg: true, front: false }];
  sets.forEach((st, i) => {
    let isFront = st.front || pose.guardK > .5;
    if ((layer === 'front') !== isFront) return;
    // Each sickle trembles on its own; sprint drags a jagged trail low over the lane.
    let base = [lerp(st.a[0], st.b[0], .6), lerp(st.a[1], st.b[1], .6)];
    let ang = (st.leg ? 2.6 : -2.4) + Math.sin(t * 7 + i * 1.7) * .08 - Math.max(pose.sprintK, pose.run * .5) * .5;
    let L = (st.leg ? 26 : 30) * (1 + .3 * Math.max(pose.sprintK, pose.run * .5));
    if (st.leg) ang = lerp(ang, Math.PI / 2 + .3, j.air * (1 - j.apex)); ang = lerp(ang, Math.PI, j.apex * j.air);
    if (!st.leg) { base = lerpP(base, [s.x + f * 18, s.chest[1] - 6 + i * 8], pose.guardK); ang = lerp(ang, i ? -1 : 1, pose.guardK); }
    if (i === 2) { base = lerpP(base, [s.x + f * 30, s.y - 10], gr); ang = lerp(ang, .4, gr); L = lerp(L, 34, gr); }
    if (i === 0) { ang = lerp(ang, -.3, fw.s); L = lerp(L, 44, fw.s); }
    L = lerp(L, 70, fw.f); ang = lerp(ang, -.9 + i * .5, fw.f); base = lerpP(base, [s.x + f * 26, s.chest[1] - 10 + i * 8], fw.f);
    if (i === 0) ang = lerp(ang, -1.5, up.s);
    base = lerpP(base, [s.x + f * (8 + i * 10), s.chest[1] - 20 - i * 14], up.f); ang = lerp(ang, -1.2, up.f);
    if (i === 2) { ang = lerp(ang, .2, dn.s); L = lerp(L, 40, dn.s); }
    const ca = t * 6 + i * TAU / 4; base = lerpP(base, [s.x + Math.cos(ca) * 50, s.y - 4 + Math.sin(ca) * 12], dn.f); ang = lerp(ang, ca + Math.PI / 2, dn.f);
    base = gather(base, st.b, pose.fade * 1.4);
    // Ragged smoke crescent with a metallic core flashing only at the rim.
    const pts = []; for (let q = 0; q <= 6; q++) { const u = q / 6; const a = ang + (u - .5) * 1.3 * (st.leg ? -1 : 1); pts.push([base[0] + f * Math.cos(a) * L * (.4 + u * .6), base[1] + Math.sin(a) * L * (.4 + u * .6) * .8 + Math.sin(t * 9 + q + i) * 1.2]); }
    band(ctx, pts, (q, n) => 4 * Math.sin(q / n * Math.PI) + 1, smoke, 3610 + i, { t, alpha: pose.fade * .85 });
    line(ctx, pts.slice(2, 6), mat.edge, 1, .8 * pose.fade);
    if (j.land && st.leg) fallout(ctx, [st.b], smoke, t, 3620 + i, { count: 6, alpha: j.land });
  });
  // Full: a wide one-sided half-moon cut that collapses back into four flags.
  if (layer === 'front' && fw.f) { const pts = []; for (let q = 0; q <= 10; q++) { const a = -1.2 + q * .24; pts.push([s.x + f * (20 + Math.cos(a) * 70), s.chest[1] + Math.sin(a) * 60]); } band(ctx, pts, (q, n) => 6 * Math.sin(q / n * Math.PI) + 1, mat, 3630, { t, alpha: fw.f }); }
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

// ── T09 Prismabruch: a one-sided five-plate mirror prism ────────────────
function prismabruch(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose).k;
  const glass = { ...mat, kind: 'crystal' };
  for (let i = 0; i < 5; i++) {
    // Only on one flank (behind), slanted and stacked like a prismatic screen.
    let c = [s.x - f * (22 + i * 3) - pose.lean * f * 6, s.y - 92 + i * 17]; let rot = -.25 + i * .06; const w = 9 - Math.abs(i - 2); const h = 12 + (i % 2) * 3;
    rot = lerp(rot, -.9, j.air * .8); if (j.air && i % 2) c = [c[0] - f * 8, c[1] + 6];
    // Defense: the prism turns in front of the facing like blinds.
    c = lerpP(c, [s.x + f * 24, s.y - 90 + i * 17], pose.guardK); rot = lerp(rot, 1.4, pose.guardK);
    if (i === 4) c = lerpP(c, [s.x + f * 34, s.chest[1] + 6], gr);
    if (i === 0) c = lerpP(c, [s.x + f * 20, s.chest[1] - 6], fw.s);
    const fa = (i - 2) * .32; c = lerpP(c, [s.x + f * (30 + Math.cos(fa) * 20), s.chest[1] + Math.sin(fa) * 40], fw.f); rot = lerp(rot, 1.57 + fa, fw.f);
    if (i === 0) c = lerpP(c, [c[0], c[1] - 30], up.s);
    c = lerpP(c, [s.x + f * (16 + i * 8), s.y - 30 - i * 26], up.f); rot = lerp(rot, .8, up.f);
    c = lerpP(c, [s.x + f * (20 + i * 16), s.y - 6], dn.f); rot = lerp(rot, 0, dn.f);
    c = gather(c, [s.x, s.chest[1]], pose.fade * 1.4 - i * .1);
    const isFront = pose.guardK > .5 || fw.a > .5 || gr > .5 && i === 4;
    if ((layer === 'front') !== isFront) continue;
    shape(ctx, c, rot, f, [[-w, -h], [w * .8, -h * .8], [w, h], [-w * .8, h * .9]], glass, 3810 + i, { alpha: pose.fade * .85, glowEdge: .8, core: .3 });
    // Reflections slide across the scratched glass independent of the pose.
    const P = frame(c, rot, f); const k = ((t * .4 + i * .23) % 1) * 2 - 1;
    line(ctx, [P(-w * .6, k * h), P(w * .6, k * h + 4)], '#ffffff', 1, .45 * pose.fade);
  }
  if (layer === 'front') {
    if (fw.s) channel(ctx, s.x + f * 26, s.chest[1] - 6, f, 100 * fw.s, 2, glass, 3830, fw.s, 3);
    if (fw.f) for (let k = 0; k < 5; k++) { const a = (k - 2) * .18; line(ctx, [[s.x + f * 40, s.chest[1]], [s.x + f * (40 + Math.cos(a) * 140 * fw.f), s.chest[1] + Math.sin(a) * 90 * fw.f]], mat.edge, 2, fw.f); }
    if (dn.f) channel(ctx, s.x + f * 20, s.y - 4, f, 130 * dn.f, 5, glass, 3840, dn.f * .7);
  }
}

// ── T10 Aderarchon: external pulsing capillary network with a hip pump ───
function aderarchon(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const glass = { ...mat, kind: 'crystal' };
  const squeeze = 1 - .25 * Math.max(pose.sprintK, pose.act * .5);
  const pump = gather([s.hipB[0] - f * 18, s.hipB[1] + 4], [s.x, s.hip[1]], pose.fade * 1.3);
  // Four hollow root-glass tubes frame arms and ribs only from the outside.
  const tubes = [
    [pump, [s.back[0] - f * 14 * squeeze, s.back[1] - 10], [s.shoulderB[0] - f * 10 * squeeze, s.shoulderB[1] - 4], [s.handB[0] - f * 6, s.handB[1]]],
    [pump, [s.back[0] - f * 4, s.chest[1] - 22], [s.shoulderF[0] + f * 8 * squeeze, s.shoulderF[1] - 6], [s.handF[0] + f * 6, s.handF[1] - 2]],
    [pump, [s.hipB[0] - f * 8, s.chest[1] + 4], [s.x - f * 14 * squeeze, s.chest[1] - 6]],
    [pump, [s.hip[0] + f * 10 * squeeze, s.hip[1] + 4], [s.x + f * 16 * squeeze, s.chest[1] + 2]]
  ];
  tubes.forEach((pts, i) => {
    let path = pts.map((p) => gather(p, pump, pose.fade * 1.3 - i * .1));
    const target = (k) => { if (fw.f) return [s.x + f * (20 + k * 30), s.chest[1] - 4 + (i - 1.5) * 3]; if (up.f) return [s.x + f * (10 + i * 6), s.y - 30 - k * 30]; if (dn.f) { const a = i * TAU / 4 + k; return [s.x + Math.cos(a) * 30 * (k + 1), s.y - 4 + Math.sin(a) * 6 * (k + 1)]; } if (pose.guardK > .05) return [s.x + f * (18 + k * 4), s.chest[1] - 24 + (i % 2 ? 1 : -1) * k * 10 + 20]; return null; };
    const w = Math.max(fw.f, up.f, dn.f, pose.guardK);
    if (w > .02) path = path.map((p, k) => (k === 0 ? p : lerpP(p, target(k), w)));
    if (i === 1 && gr.k > 0) path[path.length - 1] = lerpP(path[path.length - 1], [gr.tx ?? s.x + f * 40, s.chest[1]], gr.k);
    // The tubes run outside the body contour (behind it); only attacks / guard bring them forward.
    const isFront = w > .5;
    if ((layer === 'front') !== isFront) return;
    band(ctx, path, () => 2.4, glass, 3910 + i, { t, alpha: pose.fade * .8 });
    // A bright pulse front runs along each tube wall at its own frequency.
    const ph = (t * (.8 + i * .17)) % 1; const q = Math.min(path.length - 2, Math.floor(ph * (path.length - 1))); const r = ph * (path.length - 1) - q;
    const [px, py] = lerpP(path[q], path[q + 1], r); plate(ctx, [[px - 2, py - 2], [px + 2, py - 2], [px + 2, py + 2], [px - 2, py + 2]], mat, 3920 + i, { alpha: pose.fade, core: 1 });
    if (j.apex) specks(ctx, [lerpP(path[1], path[2] ?? path[1], .5)], '#ffffff', j.apex);
  });
  if (layer === 'back') {
    // The strongest pump sits beside / behind the hip, not in a chest plate.
    const beat = .85 + .15 * Math.sin(t * 6) + j.land * .3;
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; plate(ctx, [pump, [pump[0] + Math.cos(a) * 10 * beat, pump[1] + Math.sin(a) * 10 * beat], [pump[0] + Math.cos(a + 1.05) * 10 * beat, pump[1] + Math.sin(a + 1.05) * 10 * beat]], glass, 3930 + k, { alpha: pose.fade * .8, glowEdge: .7 }); }
    plate(ctx, [[pump[0] - 3, pump[1] - 3], [pump[0] + 3, pump[1] - 3], [pump[0] + 3, pump[1] + 3], [pump[0] - 3, pump[1] + 3]], mat, 3940, { alpha: pose.fade, core: 1 });
    if (j.air) fallout(ctx, [pump], mat, t, 3945, { count: 5, alpha: .8, driftY: 30 });
  } else {
    if (fw.s) channel(ctx, s.handF[0], s.handF[1], f, 80 * fw.s, 2, mat, 3950, fw.s, 3);
    if (fw.f) channel(ctx, s.x + f * 110, s.chest[1] - 4, f, 70 * fw.f, 6, mat, 3955, fw.f);
    if (up.s) band(ctx, [s.handF, [s.handF[0] + f * 10, s.handF[1] - 20], [s.handF[0] + f * 4, s.handF[1] - 36 * up.s]], () => 2, glass, 3960, { t, alpha: up.s });
    if (dn.s) groundRing(ctx, s.x, s.y, 16, glass, t, dn.s, 8, 3965, 3);
  }
}

// ── T11 Polartrick: swarm of folded frost-paper comets ──────────────────
function polartrick(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose).k;
  const paper = { ...mat, kind: 'crystal' };
  const roots = [s.shoulderB, s.back, s.hipF];
  roots.forEach((r, i) => {
    const isFront = i === 2 || pose.guardK > .5 || fw.f > .5 || gr > .5 && i === 2;
    if ((layer === 'front') !== isFront) return;
    // Long flat paper comets at uneven heights, diagonally behind the figure.
    const sweep = Math.max(pose.sprintK, pose.run * .6); const L = 64 + i * 10;
    let head = [r[0] - f * 18, r[1] - 10 + i * 6]; let dir = [-f * (.9 - .1 * i), -.4 + i * .3 + Math.sin(t * 1.4 + i) * .05];
    dir = [lerp(dir[0], -f, sweep), lerp(dir[1], 0, sweep)];
    if (j.air) { dir = [lerp(dir[0], 0, (1 - j.apex) * .9), lerp(dir[1], 1, (1 - j.apex) * .9)]; if (j.apex) dir = [-f, 0]; }
    head = lerpP(head, [s.x + f * 24, s.chest[1] - 20 + i * 18], pose.guardK); dir = [lerp(dir[0], 0, pose.guardK), lerp(dir[1], 1, pose.guardK)];
    if (i === 2) { head = lerpP(head, [s.x + f * 40, s.chest[1]], gr); dir = [lerp(dir[0], -f, gr), lerp(dir[1], 0, gr)]; }
    head = lerpP(head, [s.x + f * (30 + i * 10), s.chest[1] - 14 + i * 12], fw.f); dir = [lerp(dir[0], f, fw.f), lerp(dir[1], (i - 1) * .3, fw.f)];
    if (i === 0) dir = [lerp(dir[0], 0, up.s), lerp(dir[1], -1, up.s)];
    head = lerpP(head, [s.x + f * (10 + i * 14), s.y - 30 - i * 24], up.f); dir = [lerp(dir[0], f * .4, up.f), lerp(dir[1], -.9, up.f)];
    head = gather(head, [s.handB[0], s.handB[1]], pose.fade * 1.3 - i * .1);
    const len = L * (1 + .6 * fw.f);
    const pts = []; for (let q = 0; q <= 7; q++) { const u = q / 7; pts.push([head[0] + dir[0] * len * u, head[1] + dir[1] * len * u + Math.sin(t * 3 + u * 6 + i) * 3 * u]); }
    // Folded accordion paper with frozen crease edges and free leaf tips.
    for (let q = 0; q < 7; q++) { const sg = q % 2 ? 1 : -1; const w = 7 * (1 - q / 9); const dx = pts[q + 1][0] - pts[q][0]; const dy = pts[q + 1][1] - pts[q][1]; const l = Math.hypot(dx, dy) || 1; const nx = -dy / l * w * sg; const ny = dx / l * w * sg; plate(ctx, [[pts[q][0] + nx, pts[q][1] + ny], [pts[q + 1][0] - nx * .4, pts[q + 1][1] - ny * .4], [pts[q][0] - nx * .2, pts[q][1] - ny * .2]], paper, 4010 + i * 10 + q, { alpha: pose.fade, lit: .9, glowEdge: .6 }); }
    const tip = pts[7]; specks(ctx, [[tip[0] - f * 4, tip[1] + 2], [tip[0] - f * 8, tip[1] - 3]], mat.edge, .9 * pose.fade);
    if (j.land) fallout(ctx, [tip], paper, t, 4040 + i, { count: 5, alpha: j.land });
  });
  if (layer === 'front') {
    if (fw.f) for (let k = 0; k < 3; k++) channel(ctx, s.x + f * 50, s.chest[1] - 16 + k * 14, f, 120 * fw.f, 5, paper, 4050 + k * 10, fw.f * .6, 5);
    if (dn.s) line(ctx, [[s.x - f * 10, s.y + 2], [s.x + f * 40 * dn.s, s.y + 2]], mat.edge, 2, dn.s);
    if (dn.f) { ctx.save(); ctx.globalAlpha = .25 * dn.f; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(s.x + f * 50, s.y, 70 * dn.f, 20 * dn.f, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  }
}

// ── T12 Stratospalter: four external air-pressure struts ────────────────
function stratospalter(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose).k;
  const struts = [{ p: s.shoulderF, side: 1, y: 6 }, { p: s.shoulderB, side: -1, y: 6 }, { p: s.hipF, side: 1, y: 2 }, { p: s.hipB, side: -1, y: 2 }];
  struts.forEach((st, i) => {
    // Unsynchronised pneumatic spring legs standing obliquely in the air, never resting on the body.
    const spring = Math.sin(t * (2.2 + i * .4) + i * 1.3) * 3;
    let base = [st.p[0] + f * st.side * 18, st.p[1] + st.y + spring]; let rot = st.side * (i < 2 ? .9 : 2.3) + pose.lean * .3;
    if (st.side < 0) rot = lerp(rot, -.05, j.up);
    rot += j.land * st.side * .6;
    if (st.side > 0) { base = lerpP(base, [s.x + f * 26, st.p[1] + st.y], pose.guardK); rot = lerp(rot, .3, pose.guardK); }
    if (i === 0) { base = lerpP(base, [s.x + f * 34, s.chest[1] - 4], gr); rot = lerp(rot, 1.4, gr); }
    if (i === 0) rot = lerp(rot, 1.6, fw.s);
    if (st.side > 0) { base = lerpP(base, [s.x + f * 30, s.chest[1] - 10 + (i ? 20 : 0)], fw.f); rot = lerp(rot, 1.57, fw.f); }
    if (i === 1) rot = lerp(rot, 0, up.s);
    base = lerpP(base, [s.x + f * (6 + i * 6), s.y - 10 - i * 28], up.f); rot = lerp(rot, 0, up.f);
    base = lerpP(base, [s.x + (i % 2 ? -1 : 1) * f * (20 + i * 4), s.y - 6], dn.f); rot = lerp(rot, (i % 2 ? -1 : 1) * 1.2, dn.f);
    base = gather(base, st.p, pose.fade * 1.4);
    const isFront = st.side > 0;
    if ((layer === 'front') !== isFront) return;
    // Open, sharply polished pressure strut with carved buffer chambers (no hands).
    const L = 36 + (i < 2 ? 4 : 0);
    shape(ctx, base, rot, f, [[-4, 0], [-3, L], [3, L + 3], [4, 2]], mat, 4110 + i, { alpha: pose.fade, lit: 1, glowEdge: .6 });
    shape(ctx, base, rot, f, [[-7, L * .3], [-7, L * .55], [-3, L * .55], [-3, L * .3]], mat, 4120 + i, { alpha: pose.fade, glowEdge: 1 });
    const tip = frame(base, rot, f)(0, L + 2); plate(ctx, [[tip[0] - 4, tip[1] - 2], [tip[0] + 4, tip[1] - 2], [tip[0] + 3, tip[1] + 3], [tip[0] - 3, tip[1] + 3]], mat, 4130 + i, { alpha: pose.fade, core: j.apex ? 1 : .4 });
    if (j.apex) specks(ctx, [[tip[0], tip[1] - 4]], '#ffffff', j.apex);
  });
  if (layer === 'front') {
    if (fw.s) { const pts = []; for (let k = 0; k <= 6; k++) { const a = -1 + k / 3; pts.push([s.x + f * (24 + Math.cos(a) * 30), s.chest[1] + Math.sin(a) * 24]); } line(ctx, pts, mat.edge, 2, fw.s); }
    if (fw.f) for (let k = 0; k < 3; k++) line(ctx, [[s.x + f * (40 + k * 20), s.chest[1] - 30 + k * 4], [s.x + f * (50 + k * 26), s.chest[1]], [s.x + f * (40 + k * 20), s.chest[1] + 30 - k * 4]], mat.edge, 3 - k * .7, fw.f);
    if (up.f) column(ctx, s.x + f * 14, s.y, 130 * up.f, 9, { ...mat, kind: 'crystal' }, 4140, up.f * .5);
    if (dn.s) groundRing(ctx, s.x + f * 10, s.y, 10, mat, t, dn.s, 6, 4150, 2);
    if (dn.f) groundRing(ctx, s.x, s.y, 30 + 40 * dn.f, mat, t, dn.f, 14, 4160, 4);
  }
}

registerFormRenderer('T01', kammwacht);
registerFormRenderer('T02', schlackenkern);
registerFormRenderer('T03', reliktkiefer);
registerFormRenderer('T04', korallenschild);
registerFormRenderer('T05', bruchflug);
registerFormRenderer('T06', ionspindel);
registerFormRenderer('T07', daemmerlauf);
registerFormRenderer('T08', ossuarium);
registerFormRenderer('T09', prismabruch);
registerFormRenderer('T10', aderarchon);
registerFormRenderer('T11', polartrick);
registerFormRenderer('T12', stratospalter);
