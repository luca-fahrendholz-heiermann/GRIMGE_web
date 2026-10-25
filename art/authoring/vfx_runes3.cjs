// GRIMGE — special runes, round 3 (hand-drawn quality; vfx_brush.cjs; final density). Palettes from the
// signature data (dark · body · accent · light). Own designs.
//   garnet_lens   2 frames, 20×24: S02 Aureolenschwarm — a faceted garnet lens (dim / charged with a glow).
//   star_anchor   4-frame loop, 88×84 (center): S03 Sternenanker — a six-rayed crystal star with a split core
//                 vein and copper-glowing seams (it falls, lands, tips).
//   star_impact   6 frames, 176×80 (base): its landing — a hexagon crater ring, cracks, the star's rays flash.
//   comet_mantle  6-frame loop, 104×104: S05 Kometenträger — a blazing sky-fragment shell round the Wizard,
//                 a burning core, a flame tail streaming back (faces right).
//   comet_crash   8 frames, 200×96 (base): its landing — three shock rings of starry shards, a blast.
//   blossom       6 frames, 48×72 (base): S13 Splittergarten — a crystal blossom growing (0-3) and pulsing
//                 (4-5): ribbed dark leaves, nested crystal petals, a jade core.
const B = require('./vfx_brush.cjs');
const F = require('./vfx_fire.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const ramp5 = (dark, body, accent, light) => B.pal({ r: [dark, body, accent, light, '#ffffff'] }).r;
const C = {
  garnet: ramp5('#3a0c14', '#9b1b30', '#e84a64', '#ffd6dc'),
  star: ramp5('#1a1f4a', '#3b4aa0', '#7f8fe0', '#d6dcff'), copper: ramp5('#4a2210', '#a8541e', '#e08a4a', '#ffd2a8'),
  comet: ramp5('#0f1c3d', '#24427a', '#6f9ae0', '#b8d4ff'),
  jade: ramp5('#163a2c', '#2f8a63', '#6fd4a4', '#d6ffe8'), rose: ramp5('#5a2a24', '#b8564a', '#e59a86', '#ffe0d8'),
  out: B.pal({ o: '#08060e' }).o
};
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };
// A faceted gem polygon: lit facet top-left, shaded bottom-right, a bright ridge, a glint.
function gem(s, f, pts, ramp, { glow = 0 } = {}) {
  const ys = pts.map((p) => p[1]); const xs = pts.map((p) => p[0]); const cx = xs.reduce((a, b) => a + b) / xs.length; const cy = ys.reduce((a, b) => a + b) / ys.length;
  const inPoly = (x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) { if (!inPoly(x + .5, y + .5)) continue; const lit = (x - cx) + (y - cy) < 0; tone(s, f, ramp, x, y, (lit ? .62 : .32) + glow * .25 + (!inPoly(x - .5, y + .5) && lit ? .25 : 0)); }
}

function lens() {
  const s = new Sheet('garnet_lens', 20, 24, 2, { anchor: 'center' });
  for (let f = 0; f < 2; f++) {
    if (f === 1) for (let a = 0; a < TAU; a += .2) tone(s, f, C.garnet, 10 + Math.cos(a) * 9, 12 + Math.sin(a) * 11, .7);
    gem(s, f, [[10, 3], [16, 9], [14, 18], [10, 21], [6, 18], [4, 9]], C.garnet, { glow: f });
    for (let y = 6; y <= 18; y++) tone(s, f, C.garnet, 10, y, f ? .95 : .7);
    tone(s, f, C.garnet, 8, 7, 1); if (f) { tone(s, f, C.garnet, 7, 7, 1); tone(s, f, C.garnet, 8, 8, 1); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function star() {
  const s = new Sheet('star_anchor', 88, 84, 4, { anchor: 'center' }); const cx = 44; const cy = 42;
  for (let f = 0; f < 4; f++) {
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .2; const L = 34 + (i % 2) * 6; const w = .2; gem(s, f, [[cx, cy], [cx + Math.cos(a - w) * L * .7, cy + Math.sin(a - w) * L * .62], [cx + Math.cos(a) * L, cy + Math.sin(a) * L * .7], [cx + Math.cos(a + w) * L * .7, cy + Math.sin(a + w) * L * .62]], C.star);
      const n = Math.round(L * .8); for (let k = 4; k < n; k++) { const pulse = (k + f * 4) % 12 < 3; tone(s, f, C.copper, cx + Math.cos(a) * k, cy + Math.sin(a) * k * .7, pulse ? 1 : .65); } }
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = Math.hypot(x, y); if (d <= 6) tone(s, f, C.copper, cx + x, cy + y, 1 - d / 10); }
    for (let k = -18; k <= 18; k++) tone(s, f, C.copper, cx + (k > 0 ? 1 : -1) * (Math.abs(k) % 3 === 0 ? 1 : 0), cy + k, .95); // split central vein
    B.selOutline(s, f, C.out);
  }
  return s;
}
function starImpact() {
  const s = new Sheet('star_impact', 176, 80, 6, { anchor: 'base', baseOffset: 6 }); const cx = 88; const gy = 72;
  for (let f = 0; f < 6; f++) {
    const k = (f + 1) / 6; const R = 30 + k * 50; const fade = clamp01((f - 3) / 2);
    // Hexagonal crater rim.
    for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU; const a1 = a0 + TAU / 6; const n = 40; for (let j = 0; j <= n; j++) { const u = j / n; const x = cx + (Math.cos(a0) * (1 - u) + Math.cos(a1) * u) * R; const y = gy + (Math.sin(a0) * (1 - u) + Math.sin(a1) * u) * R * .3; if (B.dither(j, i, fade * .7)) continue; tone(s, f, C.star, x, y, .8); tone(s, f, C.star, x, y - 1, .5); } }
    // Rays flashing up from the centre (early frames) and cracks running out.
    if (f < 3) for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * .35; const L = 30 + (2 - f) * 12; for (let t = 0; t < L; t++) { const w = Math.round(2 * (1 - t / L)); for (let j = -w; j <= w; j++) tone(s, f, C.copper, cx + Math.cos(a) * t + j, gy - 8 + Math.sin(a) * t, .95 - t / L * .4); } }
    for (let c = 0; c < 6; c++) { const rr = rng(80 + c); let a = c / 6 * TAU + rr() * .4; let x = cx; let y = gy; for (let t = 0; t < R; t++) { a += (rr() - .5) * .3; x += Math.cos(a); y += Math.sin(a) * .3; s.set(f, x, y, C.out); } }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function cometMantle() {
  const s = new Sheet('comet_mantle', 104, 104, 6, { anchor: 'center' }); const cx = 60; const cy = 52;
  for (let f = 0; f < 6; f++) {
    const ph = f / 6;
    // Flame tail streaming back (to the left), the burning core behind the back.
    F.flame(s, f, cx - 10, cy, 46, 26, { dir: Math.PI + .1, lean: -6, ph: ph * TAU, cool: .05 });
    // Shell: sky fragments (gems) orbiting on an ellipse round the Wizard.
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + ph * TAU; const x = cx + Math.cos(a) * 30; const y = cy + Math.sin(a) * 40; const r = 6 + (i % 3); gem(s, f, [[x, y - r], [x + r * .8, y], [x, y + r], [x - r * .8, y]], C.comet); }
    for (let q = 0; q < 6; q++) { const rr = rng(90 + q + f); tone(s, f, C.comet, cx - 20 - rr() * 30, cy + (rr() - .5) * 30, 1); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function cometCrash() {
  const s = new Sheet('comet_crash', 200, 96, 8, { anchor: 'base', baseOffset: 6 }); const cx = 100; const gy = 88;
  for (let f = 0; f < 8; f++) {
    for (let r = 0; r < 3; r++) { const at = r * 1.5; if (f < at) continue; const k = clamp01((f - at) / 4); const R = 30 + r * 30 + k * 18; for (let i = 0; i < 12 + r * 4; i++) { const a = i / (12 + r * 4) * TAU; const x = cx + Math.cos(a) * R; const y = gy + Math.sin(a) * R * .3; if (k > .7 && i % 2) continue; gem(s, f, [[x, y - 10 + k * 5], [x + 5, y], [x, y + 3], [x - 5, y]], C.comet); } }
    if (f < 4) { F.fireMass(s, f, cx, gy - 22, 26 - f * 5, 990 + f, { lobes: 6 }); }
    if (f >= 2 && f < 7) for (let q = 0; q < 5; q++) F.smokePuff(s, f, cx + (q - 2) * 16, gy - 12 - (f - 2) * 5, 6 + (f - 2) * 2, 1000 + q + f, f > 5 ? .4 : 0);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function blossom() {
  const s = new Sheet('blossom', 48, 72, 6, { anchor: 'base', baseOffset: 2 }); const cx = 24; const gy = 70;
  for (let f = 0; f < 6; f++) {
    const g = f < 4 ? (f + 1) / 4 : 1; const pulse = f >= 4 ? (f - 4) * .15 : 0; const h = 62 * g;
    for (const sg of [-1, 1]) gem(s, f, [[cx, gy], [cx + sg * 18 * g, gy - h * .22], [cx + sg * 12 * g, gy - h * .48], [cx + sg * 3, gy - h * .2]], C.jade);
    for (let i = 0; i < 3; i++) { const lean = (i - 1) * 5 * g; const hh = h * (1 - Math.abs(i - 1) * .25); const w = (8 - Math.abs(i - 1) * 2) * g; gem(s, f, [[cx + (i - 1) * 5 - w / 2, gy], [cx + (i - 1) * 5 - w * .55 + lean * .5, gy - hh * .7], [cx + (i - 1) * 5 + lean, gy - hh], [cx + (i - 1) * 5 + w * .55 + lean * .5, gy - hh * .7], [cx + (i - 1) * 5 + w / 2, gy]], i === 1 ? C.rose : C.jade, { glow: pulse }); }
    const cy = gy - h * .62; for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (Math.abs(x) + Math.abs(y) <= 4) tone(s, f, C.jade, cx + x, cy + y, .85 + pulse - (Math.abs(x) + Math.abs(y)) * .05);
    B.selOutline(s, f, C.out);
  }
  return s;
}
module.exports = { runes3Sheets: () => [lens(), star(), starImpact(), cometMantle(), cometCrash(), blossom()] };
