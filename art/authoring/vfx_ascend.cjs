// GRIMGE — Aufstiegsstufen for the Focus transformation (user, 27 Oct 2026, after example sprites 29–32: a golden aura
// with lightning, then white, then blue flames; own design). Three stages, each a back aura (energy tongues rising
// behind the body, sparks / lightning) and a front layer (crackles at the sides only). 128×128, chest at the centre.
//   asc_1_back / _front   gold energy with yellow-white lightning sparks
//   asc_2_back / _front   blue flame aura with white cores and cyan sparks
//   asc_3_back / _front   white god mode: the tallest, brightest aura, dense lightning (user: "gelb, blau und dann weiß als god mode")
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const STAGES = [
  { id: 1, aura: ramp('#6a4200', '#c88a10', '#f2c23a', '#ffe68a', '#fff8d8'), spark: ramp('#c8a020', '#fff07a', '#ffffff'), out: '#2a1a00', h: 1, n: 12 },
  { id: 2, aura: ramp('#0a1a6a', '#1a4ad0', '#3a8aff', '#8ac8ff', '#e8f6ff'), spark: ramp('#3ac0ff', '#a8f0ff', '#ffffff'), out: '#020820', h: 1.2, n: 15 },
  { id: 3, aura: ramp('#7a8094', '#c8cee0', '#eef2fa', '#fbfcff', '#ffffff'), spark: ramp('#b8d8ff', '#eef6ff', '#ffffff'), out: '#2a2e3a', h: 1.38, n: 17 }
];
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
// A rising energy tongue: a lens tapering to a point, rim → mid → bright core, swaying.
function tongue(s, f, r, x, y, h, w, lean, ph) {
  const n = Math.max(6, Math.round(h)); for (let i = 0; i <= n; i++) {
    const u = i / n; const half = (w / 2) * Math.sin(Math.PI * Math.min(1, u * 1.1 + .05)) * (1 - u * .4); const cx = x + lean * u * u * h * .35 + Math.sin(u * 5 + ph) * 1.6 * u; const cy = y - u * h;
    for (let d = -Math.ceil(half); d <= Math.ceil(half); d++) { if (Math.abs(d) > half + .3) continue; const e = Math.abs(d) / Math.max(1, half); tone(s, f, r, cx + d, cy, e > .75 ? .25 : e > .4 ? .55 : u < .55 ? .95 : .75); }
  }
}
function zig(s, f, r, x0, y0, x1, y1, seed) { const rr = rng(seed); let px = x0; let py = y0; const n = 5; for (let j = 1; j <= n; j++) { const nx = x0 + (x1 - x0) * j / n + (j < n ? (rr() - .5) * 8 : 0); const ny = y0 + (y1 - y0) * j / n; const m = Math.ceil(Math.hypot(nx - px, ny - py)); for (let k = 0; k <= m; k++) tone(s, f, r, px + (nx - px) * k / m, py + (ny - py) * k / m, k % 2 ? 1 : .7); px = nx; py = ny; } }
function stage(st) {
  const bk = new Sheet(`asc_${st.id}_back`, 128, 128, 8, { anchor: 'center' }); const fr = new Sheet(`asc_${st.id}_front`, 128, 128, 8, { anchor: 'center' }); const CX = 64; const CY = 64;
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    for (let i = 0; i < st.n; i++) { const u = i / (st.n - 1); const side = i % 2 ? 1 : -1; const k = (u * .9 + .05); const ox = side * (16 + Math.sin(k * Math.PI) * 12); const oy = 60 - k * 82; const h = (26 + (1 - k) * 24) * st.h * (1 + Math.sin((ph + i * .29) * TAU) * .18); tongue(bk, f, st.aura, CX + ox, CY + oy, h, 10 + (i % 3) * 3, side * (.6 + k * .8), (ph + i * .3) * TAU); }
    for (let i = 0; i < 3; i++) tongue(bk, f, st.aura, CX + (i - 1) * 7, CY - 26, (24 + i % 2 * 8) * st.h, 10, (i - 1) * .4, ph * TAU + i);
    // Lightning sparks crackling over the aura (stage 1 / 2) or cyan sparks (stage 3).
    const bolts = st.id === 3 ? 5 : st.id + 1;
    for (let b = 0; b < bolts; b++) { const r = rng(300 + f * 7 + b * 31 + st.id * 101); const x = CX + (r() < .5 ? -1 : 1) * (18 + r() * 14); const y = CY - 30 + r() * 70; zig(bk, f, st.spark, x, y, x + (r() - .5) * 10, y + 14 + r() * 10, 400 + f + b * 9); }
    for (let q = 0; q < 10; q++) { const r = rng(60 + q + st.id * 13); const life = (ph + r()) % 1; tone(bk, f, st.spark, CX - 34 + r() * 68, CY + 40 - life * 100, 1); }
    B.selOutline(bk, f, B.pal({ o: st.out }).o);
    for (const sx of [CX - 42, CX + 40]) { const r = rng(120 + f + sx + st.id); for (let q = 0; q < 2 + st.id; q++) { const x = sx + (r() - .5) * 10; const y = CY - 30 + r() * 70; tone(fr, f, st.spark, x, y, 1); tone(fr, f, st.spark, x + 1, y + 1, .7); } }
  }
  return [bk, fr];
}
module.exports = { ascendSheets: () => STAGES.flatMap(stage) };
