// GRIMGE — special runes, round 4 (hand-drawn quality; vfx_brush.cjs; final density). Rune palettes; own designs.
//   gravity_floe   4-frame loop, 36×28: S01 Himmelsregent — a floating slab of violet sky-stone: lit top face,
//                  dark underside with glowing gravity runes, crumbs drifting off.
//   seam_knot      4-frame loop, 20×20: S06 Luftnähte — an air anchor: a pale knot of wind with a blue eye.
//   mirror_frame   4-frame loop, 64×108 (base): S11 Spiegelversatz — a doorway of violet glass (two pillars and
//                  an arch) with a sheen running round it, the afterimage stands inside.
//   fate_needle    4-frame loop, 14×32: S12 Schicksalsnadel — a slim rose-gold needle with a blue glint and a
//                  loop of red thread.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = {
  stone: B.pal({ r: ['#120818', '#24122e', '#5d3a78', '#8e6bb0', '#e9dcff'] }).r, rune: B.pal({ r: ['#5d3a78', '#b98cff', '#f0e2ff', '#ffffff'] }).r,
  air: B.pal({ r: ['#8a96a2', '#cfd6dc', '#e8edf2', '#ffffff'] }).r, eye: B.pal({ r: ['#2f5a9a', '#7fb2ff', '#d6e8ff'] }).r,
  glass: B.pal({ r: ['#161320', '#2e2a3a', '#7e7598', '#bfa8ff', '#e4defa', '#ffffff'] }).r,
  needle: B.pal({ r: ['#3a1e26', '#a8606e', '#e8a8b4', '#ffd6de', '#ffffff'] }).r, thread: B.pal({ r: ['#6a0a16', '#c21a2a', '#ff5a5a'] }).r, blue: B.pal({ r: ['#2f6fb0', '#6fb8ff', '#d6ecff'] }).r,
  out: B.pal({ o: '#07050c' }).o
};
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };

function floe() {
  const s = new Sheet('gravity_floe', 36, 28, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const top = [[3, 10], [12, 6], [26, 5], [33, 9], [30, 13], [6, 14]]; // lit top face (slanted slab)
    const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const under = [[6, 14], [30, 13], [27, 19], [18, 23], [10, 20]];
    for (let y = 0; y < 28; y++) for (let x = 0; x < 36; x++) { if (inPoly(top, x + .5, y + .5)) tone(s, f, C.stone, x, y, .75 - (y - 5) / 30 + (x < 14 ? .08 : 0)); else if (inPoly(under, x + .5, y + .5)) tone(s, f, C.stone, x, y, .32 - (y - 13) / 40); }
    for (let x = 6; x < 30; x++) tone(s, f, C.stone, x, 13 + Math.round((x - 6) * -.04), .2);
    // Glowing gravity runes on the underside (pulse travelling along).
    for (let k = 0; k < 4; k++) { const x = 11 + k * 4; const y = 16 + (k % 2); const lit = (k + f) % 4 === 0; tone(s, f, C.rune, x, y, lit ? 1 : .55); tone(s, f, C.rune, x + 1, y, lit ? .8 : .4); }
    // Crumbs drifting off below.
    for (let q = 0; q < 3; q++) { const y = 22 + ((f + q * 2) % 5); tone(s, f, C.stone, 14 + q * 5, y, .55); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function knot() {
  const s = new Sheet('seam_knot', 20, 20, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    for (let a = 0; a < 3; a++) { const a0 = a / 3 * TAU + f * .5; B.crescent(s, f, 10, 10, 7, 6, a0, a0 + 2, { max: 2.5, ramp: C.air, seed: 10 + a + f, dry: .2 }); }
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) tone(s, f, C.eye, 10 + x, 10 + y, .9 - Math.hypot(x, y) / 6);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function mirrorFrame() {
  const s = new Sheet('mirror_frame', 64, 108, 4, { anchor: 'base', baseOffset: 2 });
  for (let f = 0; f < 4; f++) {
    const pillar = (x0) => { for (let y = 22; y < 106; y++) for (let x = x0; x < x0 + 7; x++) tone(s, f, C.glass, x, y, (x - x0 < 3 ? .7 : .4) - (y - 22) / 400); };
    pillar(6); pillar(51);
    // Arch: a thick elliptical band over the top.
    for (let a = Math.PI; a <= TAU; a += .01) for (let r = 22; r < 29; r++) tone(s, f, C.glass, 32 + Math.cos(a) * r, 24 + Math.sin(a) * r * .8, r < 25 ? .72 : .45);
    // Sheen running round the frame, a keystone gem.
    const run = (f / 4) * 3; const pts = [[9, 104 - run * 30], [54, 104 - ((run + 1.5) % 3) * 30]]; for (const [x, y] of pts) for (let k = 0; k < 6; k++) tone(s, f, C.glass, x, y + k, 1);
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (Math.abs(x) + Math.abs(y) <= 4) tone(s, f, C.glass, 32 + x, 2 + y, .9 - (x + y) * .04);
    // Base steps.
    for (let x = 2; x < 62; x++) { tone(s, f, C.glass, x, 105, .35); tone(s, f, C.glass, x, 104, .6); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function needle() {
  const s = new Sheet('fate_needle', 14, 32, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    for (let y = 3; y < 29; y++) { const w = y < 6 ? 1 : y < 24 ? 2 : 1; for (let x = 0; x < w; x++) tone(s, f, C.needle, 6 + x, y, x === 0 ? .85 : .45); }
    for (let y = 5; y <= 9; y++) { tone(s, f, C.needle, 5, y, .3); tone(s, f, C.needle, 8, y, .3); } // eye of the needle
    // Red thread loop through the eye, swaying.
    for (let a = 0; a < TAU; a += .15) tone(s, f, C.thread, 7 + Math.cos(a) * 4 + Math.sin(f * 1.5) * 1, 12 + Math.sin(a) * 5 + a * .3, .6 + Math.cos(a) * .3);
    const gy = 6 + f * 5; tone(s, f, C.blue, 6, gy, 1); tone(s, f, C.blue, 7, gy, .7);
    B.selOutline(s, f, C.out);
  }
  return s;
}
module.exports = { runes4Sheets: () => [floe(), knot(), mirrorFrame(), needle()] };
