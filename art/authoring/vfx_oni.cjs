// GRIMGE — Oni-Blut look for S94 Blutfinsternis (user, 27 Oct 2026, after example sprites 7–9: blood orbs in the
// hand, a seal circle on the ground; own designs).
//   oni_seal   8-frame loop, 168×56: a ground seal — double ring in blood red and dark gold, rune marks turning
//              between the rings, three spokes and an inner ring turning the other way.
//   oni_orb    4-frame loop, 26×26: a blood orb — dark core, a crimson spiral turning inside, a bright rim and two
//              thin orbit rings.
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const P = { red: ramp('#2a0004', '#6a0a12', '#b0141e', '#e8303a', '#ff8a7a', '#ffe0da'), gold: ramp('#3a2408', '#7a5418', '#c8962e', '#f0cc5a'), out: B.pal({ o: '#08020a' }).o };
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);

function seal() {
  const W = 168; const H = 56; const s = new Sheet('oni_seal', W, H, 8, { anchor: 'center' }); const cx = W / 2; const cy = H / 2; const R = 78; const k = .3;
  const at = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r * k];
  for (let f = 0; f < 8; f++) {
    const rot = f / 8 * TAU / 6;
    for (const [r, w, rp, v] of [[R, 2, P.red, .62], [R - 4, 1, P.gold, .7], [R - 22, 1, P.gold, .62], [R - 26, 2, P.red, .55]]) for (let a = 0; a < TAU; a += .004) for (let d = 0; d < w; d++) { const [x, y] = at(a, r - d); tone(s, f, rp, x, y, v + (Math.sin(a) < 0 ? -.12 : 0)); }
    // Rune marks between the outer rings: little glyphs (bar + hook), turning.
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + rot; const [x, y] = at(a, R - 13); const g = i % 3; const lit = (i + f) % 6 === 0;
      for (let j = -2; j <= 2; j++) tone(s, f, P.red, x + j, y, lit ? .95 : .7);
      if (g === 0) for (let j = 0; j < 3; j++) tone(s, f, P.red, x + 2, y - j, lit ? .95 : .7); else if (g === 1) { tone(s, f, P.red, x - 2, y - 1, .8); tone(s, f, P.red, x - 2, y - 2, .8); } else { tone(s, f, P.red, x, y - 1, .8); tone(s, f, P.red, x, y + 1, .8); } }
    // Three spokes and a small inner ring turning the other way.
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU - rot * 2; for (let r = 12; r <= R - 27; r += .5) { const [x, y] = at(a, r); tone(s, f, P.gold, x, y, .55); } const [ex, ey] = at(a, R - 27); for (let j = -1; j <= 1; j++) for (let q = -1; q <= 1; q++) tone(s, f, P.red, ex + j, ey + q, .85); }
    for (let a = 0; a < TAU; a += .02) { const [x, y] = at(a, 12); tone(s, f, P.red, x, y, (Math.floor(a * 6 + f) % 4) ? .7 : .95); }
    B.selOutline(s, f, P.out);
  }
  return s;
}
function orb() {
  const s = new Sheet('oni_orb', 26, 26, 4, { anchor: 'center' }); const c = 13; const R = 7;
  for (let f = 0; f < 4; f++) {
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const d = Math.hypot(x, y); if (d > R) continue; const a = Math.atan2(y, x); const sp = ((a + d * .55 - f * TAU / 4) % (TAU / 3) + TAU) % (TAU / 3) < .7; tone(s, f, P.red, c + x, c + y, d > R - 1.2 ? .85 : sp ? .7 : .2 + (x + y < 0 ? .1 : 0)); }
    tone(s, f, P.red, c - 3, c - 3, 1); tone(s, f, P.red, c - 2, c - 3, .9);
    for (const [rx, ry, rot] of [[11, 4, .5 + f * .3], [10, 4, -.7 - f * .25]]) for (let a = 0; a < TAU; a += .05) { const ex = Math.cos(a) * rx; const ey = Math.sin(a) * ry; const x = c + ex * Math.cos(rot) - ey * Math.sin(rot); const y = c + ex * Math.sin(rot) + ey * Math.cos(rot); if (Math.hypot(x - c, y - c) > R + .5) tone(s, f, P.red, x, y, .75); }
    B.selOutline(s, f, P.out);
  }
  return s;
}
module.exports = { oniSheets: () => [seal(), orb()] };
