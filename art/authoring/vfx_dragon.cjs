// GRIMGE — DRAGON KIT, hand-drawn quality (user, 25 Oct 2026: "Drachen sollen eindrucksstarke Drachen sein und
// keine Würmer" — reference: the twin blood dragons of the Tougen Anki clip and a winged pixel dragon; own
// design, inspiration only). Eastern dragons are assembled at runtime along a spine (spell_visuals.js
// drawDragon) from these parts, so they can coil round a target and still read as DRAGONS: a big head with
// jaws, horns and mane; armoured scale plates; dorsal spines; claws.
// Looks: blood (dark crimson scales, glowing red veins) and sun (obsidian scales with gold rims, T40).
//   dragon_<look>_head   4 frames, 72×52 (faces right): jaw closed → opening → roar → snap.
//   dragon_<look>_scale  2 frames, 22×22: an armour plate seen from the front (lit) and from behind (dark).
//   dragon_<look>_spine  1 frame, 12×16: a dorsal spine, curved back.
//   dragon_<look>_claw   2 frames, 24×18: a clawed foreleg, open / gripping.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const LOOKS = {
  blood: B.pal({ body: ['#12000a', '#2a0410', '#4a0a18', '#701424', '#9a1e2e'], vein: ['#b3121f', '#ff2a2a', '#ff8a7a', '#ffd6cc'], horn: ['#2a1a1a', '#5a3a36', '#9a7a70', '#d8c4b8'], mane: ['#3a0008', '#7a0a14', '#c21a24', '#ff5a4a'], eye: ['#ffe680', '#ffffff'], tooth: ['#c8b8a8', '#fffaf0'], out: '#080004' }),
  sun: B.pal({ body: ['#0c0a10', '#1c1822', '#2e2836', '#463e52', '#625870'], vein: ['#8a5a00', '#e0a020', '#ffd76a', '#fff6cf'], horn: ['#3a2a10', '#7a5a20', '#c99a3a', '#ffe6a0'], mane: ['#5a3200', '#b8780a', '#f2b32a', '#ffe680'], eye: ['#ff8a1f', '#fff6cf'], tooth: ['#d8ccb8', '#fffaf0'], out: '#06040a' })
};
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };
const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
// Fill a polygon with a vertical light gradient (top lit) and an optional rim.
function shadePoly(s, f, pts, ramp, { top = .8, bottom = .25, rim = true } = {}) {
  const ys = pts.map((p) => p[1]); const xs = pts.map((p) => p[0]); const y0 = Math.min(...ys); const y1 = Math.max(...ys);
  for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) { if (!inPoly(pts, x + .5, y + .5)) continue; const u = (y - y0) / Math.max(1, y1 - y0); let v = top + (bottom - top) * u; if (rim && !inPoly(pts, x + .5, y - .5)) v += .2; tone(s, f, ramp, x, y, v); }
}

function head(look) {
  // An eastern dragon head in profile: long flat snout with an upturned nose, an angry brow ridge over a big
  // slit eye, heavy branched horns, jagged cheek frills, a mane of flame-like spikes, fangs, long whiskers.
  const L = LOOKS[look]; const s = new Sheet(`dragon_${look}_head`, 72, 52, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const jaw = [0, .45, 1, .2][f]; const sway = Math.sin(f / 4 * TAU) * 1.5;
    // Mane: layered spiky locks streaming back (filled jagged triangles, dark under, bright on top).
    for (let k = 0; k < 9; k++) { const rr = rng(10 + k); const by = 12 + k * 2.6; const bx = 22 + (k % 3); const len = 14 + rr() * 10; const tipY = by - 6 + k * 1.2 + sway * (k % 2 ? 1 : -1); shadePoly(s, f, [[bx, by - 3], [bx - len, tipY], [bx - len * .55, by + 2], [bx, by + 3]], L.mane, { top: .85 - (k % 3) * .15, bottom: .25 }); }
    // Horns: heavy, curving back, with a branch.
    B.stroke(s, f, [[32, 13], [22, 6], [8, 3]], { max: 6, swell: .45, ramp: L.horn, seed: 41, dry: 0, headBias: .05, light: [-.5, -.85] });
    B.stroke(s, f, [[20, 6], [16, 0], [12, -2]], { max: 3, swell: .5, ramp: L.horn, seed: 42, dry: 0, headBias: .05, light: [-.5, -.85] });
    B.stroke(s, f, [[38, 14], [30, 9], [20, 9]], { max: 4, swell: .45, ramp: L.horn, seed: 43, dry: 0, headBias: .05, light: [-.5, -.85] });
    // Cheek frills: jagged spikes off the back of the jaw.
    for (let k = 0; k < 4; k++) shadePoly(s, f, [[28, 24 + k * 2], [14 - k * 2, 26 + k * 4], [26, 28 + k * 2]], L.body, { top: .6, bottom: .2 });
    // Lower jaw hinged under the eye, rotating open; mouth interior glows.
    const ang = jaw * .5; const jx = 30; const jy = 26;
    const rot = ([x, y]) => [jx + (x - jx) * Math.cos(ang) - (y - jy) * Math.sin(ang), jy + (x - jx) * Math.sin(ang) + (y - jy) * Math.cos(ang)];
    if (jaw > .1) shadePoly(s, f, [[32, 24], [68, 22], ...[[64, 25], [46, 27], [32, 27]].map(rot)], L.vein, { top: .5, bottom: .15, rim: false });
    shadePoly(s, f, [[26, 25], [48, 25], [66, 24], [64, 27], [52, 29], [34, 31], [26, 29]].map(rot), L.body, { top: .55, bottom: .18 });
    // Lower fangs + chin barbel.
    for (const x of [44, 52, 60]) { const q = rot([x, 25]); s.set(f, q[0], q[1] - 1, L.tooth[1]); s.set(f, q[0], q[1] - 2, L.tooth[0]); }
    const chin = rot([56, 29]); B.stroke(s, f, [[chin[0], chin[1]], [chin[0] - 4, chin[1] + 6], [chin[0] - 9, chin[1] + 9]], { max: 2, swell: .4, ramp: L.mane, seed: 60 + f, dry: .2, headBias: .1 });
    // Upper skull and long snout (angular), lit along the top.
    shadePoly(s, f, [[20, 18], [34, 10], [44, 13], [52, 15], [62, 15], [66, 12], [70, 16], [70, 20], [62, 23], [44, 24], [30, 26], [22, 24]], L.body, { top: .9, bottom: .35 });
    // Upper fangs (bigger at the front).
    for (const [x, h] of [[42, 2], [50, 2], [58, 3], [66, 4]]) for (let k = 0; k < h; k++) s.set(f, x, 23 + k, k === h - 1 ? L.tooth[0] : L.tooth[1]);
    // Angry brow ridge, big slit eye glowing under it, nostril.
    for (let x = 33; x < 48; x++) { const y = 12 + Math.round((x - 33) * .2); s.set(f, x, y, L.out); tone(s, f, L.body, x, y - 1, .98); }
    for (let x = 39; x < 45; x++) for (let y = 15; y < 18; y++) s.set(f, x, y, (x === 42) ? L.out : y === 15 ? L.eye[1] : L.eye[0]);
    s.set(f, 66, 16, L.out); s.set(f, 67, 16, L.out);
    // Veins / gold rims along the scales of the skull and snout.
    for (let k = 0; k < 7; k++) { const x = 24 + k * 6; const y = 19 + (k % 2) * 2; s.set(f, x, y, L.vein[2]); s.set(f, x + 1, y + 1, L.vein[1]); s.set(f, x + 2, y, L.vein[1]); }
    // Whiskers: long, curving down and back from the upper lip, swaying.
    B.stroke(s, f, [[68, 20], [60, 30 + sway], [48, 38 + jaw * 4 + sway], [38, 44 + jaw * 3]], { max: 2, swell: .35, ramp: L.horn, seed: 70 + f, dry: .15, headBias: .1 });
    B.selOutline(s, f, L.out);
  }
  return s;
}
function scale(look) {
  // A body section: a slightly tall armoured disc covered in overlapping fish-scale arcs (dark seam, lit top
  // of each scale, veins / gold rims in the seams) with a pale belly band — front (lit) and back (dark).
  const L = LOOKS[look]; const s = new Sheet(`dragon_${look}_scale`, 22, 22, 2, { anchor: 'center' });
  for (let f = 0; f < 2; f++) {
    const back = f === 1;
    for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) {
      const d = Math.hypot(x - 11, (y - 11) * .95); if (d > 10.3) continue;
      // Fish-scale arcs: cells of 5 px, staggered rows; the cell's lower edge is the dark seam.
      const row = Math.floor(y / 4); const cx = ((x + (row % 2) * 2.5) % 5) - 2.5; const cy = (y % 4) - 2; const inCell = cx * cx + (cy + 1) * (cy + 1) * 1.6;
      let v = clamp01(.72 - (y - 11) / 16 - (d > 8.6 ? .22 : 0));
      if (inCell > 5.2) v -= .3; else if (cy < -1) v += .12;
      if (y > 15) v = clamp01(.5 - (y - 15) / 14);
      tone(s, f, y > 15 ? L.horn : L.body, x, y, v * (back ? .55 : 1));
      if (!back && inCell > 5.2 && inCell < 6.4 && y <= 15 && (x + row) % 3 === 0) s.set(f, x, y, L.vein[1]);
    }
    B.selOutline(s, f, L.out);
  }
  return s;
}
function spine(look) {
  const L = LOOKS[look]; const s = new Sheet(`dragon_${look}_spine`, 12, 16, 1, { anchor: 'center' });
  B.stroke(s, 0, [[6, 15], [5, 8], [2, 1]], { max: 5, swell: .5, ramp: L.horn, seed: 90, dry: 0, headBias: .05, light: [-.6, -.8] });
  B.selOutline(s, 0, L.out); return s;
}
function claw(look) {
  const L = LOOKS[look]; const s = new Sheet(`dragon_${look}_claw`, 24, 18, 2, { anchor: 'center' });
  for (let f = 0; f < 2; f++) {
    B.stroke(s, f, [[4, 3], [10, 7], [14, 10]], { max: 6, swell: .5, ramp: L.body, seed: 95, dry: 0, headBias: .3 });
    for (let k = 0; k < 3; k++) { const a = (f ? .9 : .2) + k * .45; B.stroke(s, f, [[14, 10], [14 + Math.cos(a) * 5, 10 + Math.sin(a) * 5], [14 + Math.cos(a + .5) * 8, 10 + Math.sin(a + .5) * 7]], { max: 2.2, swell: .5, ramp: L.horn, seed: 96 + k, dry: 0, headBias: .1 }); }
    B.selOutline(s, f, L.out);
  }
  return s;
}
module.exports = { dragonSheets: () => ['blood', 'sun'].flatMap((l) => [head(l), scale(l), spine(l), claw(l)]) };
