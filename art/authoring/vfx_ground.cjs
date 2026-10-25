// GRIMGE — GROUND EFFECTS, hand-drawn quality (vfx_brush.cjs; final density). Every sheet is drawn for a
// ground ellipse of radius 40 (rx 40 / ry 13 px) and scaled to the effect's radius at runtime.
//   gfx_scorch  6-frame loop, 104×60: charred ground, glowing embers in the cracks, flame licks flickering.
//   gfx_water   6-frame loop, 96×36: a puddle — lit rim, sky highlight, a ripple running out, a glint.
//   gfx_ice     4-frame loop, 96×40: an ice sheet — faceted cracks, white highlights, crystal tufts, glints.
//   gfx_lava    6-frame loop, 100×40: a lava pool — dark crust rim, molten interior, drifting crust plates,
//               bubbles swelling and popping.
//   gfx_crater  1 frame, 104×44: a crater — raised lit rim, dark bowl, rubble.
//   gfx_blood   2-frame loop, 96×36: a glossy blood pool with a dark edge and a highlight.
//   gfx_hole    1 frame, 96×40: a dark pit with a broken earth rim.
const B = require('./vfx_brush.cjs');
const F = require('./vfx_fire.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = B.pal({
  char: ['#120c09', '#22170f', '#33241a', '#4a3527'],
  ember: ['#7a1f0a', '#d1400c', '#ff8a1f', '#ffd04a'],
  water: ['#08264a', '#0e4a85', '#1f7fd1', '#3fb0ec', '#8fdcff', '#d6f6ff', '#ffffff'],
  ice: ['#123a5a', '#2f6f9f', '#4fa3d1', '#81d4fa', '#bfe9fb', '#effbff', '#ffffff'],
  lava: ['#2a0a04', '#5a1508', '#a8300c', '#ff6a14', '#ffb52e', '#ffe680'],
  dirt: ['#1e140e', '#3a2a1e', '#5a4330', '#7c6046', '#a3845f', '#c8aa80'],
  blood: ['#2a0006', '#5a0010', '#8a0c18', '#c62028', '#ff6b6b', '#ffd0d0'],
  out: '#0c0806'
});
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };
// Fill a lumpy ground ellipse; fn(x, y, e) returns a tone (e = 0 centre … 1 rim) or null to skip.
function patch(s, f, cx, cy, rx, ry, seed, fn, ramp) {
  const r = rng(seed); const harm = [1, 2, 3, 5].map((k) => [k, r() * TAU, (r() * .5 + .5) * .12 / k * 2]);
  for (let y = Math.floor(cy - ry * 1.3); y <= cy + ry * 1.3; y++) for (let x = Math.floor(cx - rx * 1.3); x <= cx + rx * 1.3; x++) {
    const dx = (x - cx) / rx; const dy = (y - cy) / ry; const a = Math.atan2(dy, dx); let m = 1; for (const [k, p, amp] of harm) m += Math.sin(a * k + p) * amp;
    const e = Math.hypot(dx, dy) / m; if (e > 1) continue; const v = fn(x, y, e); if (v != null) tone(s, f, ramp, x, y, v);
  }
}
function scorch() {
  const s = new Sheet('gfx_scorch', 104, 60, 6, { anchor: 'center' }); const cx = 52; const cy = 46;
  for (let f = 0; f < 6; f++) {
    patch(s, f, cx, cy, 42, 13, 11, (x, y, e) => e > .85 ? .55 : .15 + (1 - e) * .1, C.char);
    // Cracks with glowing embers pulsing along them.
    for (let c = 0; c < 5; c++) { const rr = rng(20 + c); let a = rr() * TAU; let x = cx; let y = cy; for (let t = 0; t < 30; t++) { a += (rr() - .5) * .5; x += Math.cos(a); y += Math.sin(a) * .32; if (((x - cx) / 40) ** 2 + ((y - cy) / 12) ** 2 > 1) break; const glow = (Math.sin(t * .6 + f * 1.1 + c) + 1) / 2; tone(s, f, C.ember, x, y, .3 + glow * .6); } }
    // Flame licks flickering on the patch.
    for (let q = 0; q < 4; q++) { const rr = rng(40 + q); const x = cx + (rr() - .5) * 60; const y = cy + (rr() - .5) * 14; const h = 8 + ((q + f) % 3) * 4 + rr() * 4; F.flame(s, f, x, y, h, 6, { lean: Math.sin(f + q) * 2, ph: f * 1.3 + q, cool: .05 }); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function water() {
  const s = new Sheet('gfx_water', 96, 36, 6, { anchor: 'center' }); const cx = 48; const cy = 18;
  for (let f = 0; f < 6; f++) {
    patch(s, f, cx, cy, 40, 13, 31, (x, y, e) => e > .86 ? .62 + (y < cy ? .15 : 0) : .3 + (y < cy ? .08 : -.04) + (1 - e) * .08, C.water);
    for (let x = cx - 18; x < cx + 6; x++) tone(s, f, C.water, x, cy - 6 + Math.round((x - cx) * .08), .8);    // sky highlight
    const R = 6 + f * 5.5; for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; const x = cx + Math.cos(a) * R; const y = cy + Math.sin(a) * R * .32; if (((x - cx) / 38) ** 2 + ((y - cy) / 12) ** 2 > 1 || B.dither(i, f, f / 7)) continue; tone(s, f, C.water, x, y, .78); }
    if (f % 3 === 0) { tone(s, f, C.water, cx + 14, cy - 3, 1); tone(s, f, C.water, cx + 13, cy - 3, .85); tone(s, f, C.water, cx + 15, cy - 3, .85); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function ice() {
  const s = new Sheet('gfx_ice', 96, 40, 4, { anchor: 'center' }); const cx = 48; const cy = 24;
  for (let f = 0; f < 4; f++) {
    patch(s, f, cx, cy, 40, 13, 51, (x, y, e) => e > .88 ? .72 : .5 + (y < cy ? .12 : 0) + ((x + y * 2) % 13 === 0 ? .2 : 0), C.ice);
    for (let c = 0; c < 6; c++) { const rr = rng(60 + c); const a = rr() * TAU; for (let t = 4; t < 36; t++) { const x = cx + Math.cos(a) * t; const y = cy + Math.sin(a) * t * .32; if (((x - cx) / 39) ** 2 + ((y - cy) / 12.5) ** 2 > 1) break; tone(s, f, C.ice, x, y, .25); if (t % 9 === 0) tone(s, f, C.ice, x + 1, y - 1, .95); } }
    // Crystal tufts at the rim.
    for (let q = 0; q < 6; q++) { const a = q / 6 * TAU + .4; const x = cx + Math.cos(a) * 38; const y = cy + Math.sin(a) * 12.5; for (let k = 0; k < 3; k++) { const h = 4 + ((q + k) % 3) * 2; const lean = (k - 1) * .5; for (let t = 0; t < h; t++) tone(s, f, C.ice, x + (k - 1) * 2 + lean * t, y - t, .6 + t / h * .35); } }
    for (let q = 0; q < 2; q++) { const rr = rng(80 + q + f * 3); const x = Math.round(cx + (rr() - .5) * 60); const y = Math.round(cy + (rr() - .5) * 16); for (let k = -2; k <= 2; k++) { tone(s, f, C.ice, x + k, y, 1 - Math.abs(k) * .15); tone(s, f, C.ice, x, y + k, 1 - Math.abs(k) * .15); } }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function lava() {
  const s = new Sheet('gfx_lava', 100, 40, 6, { anchor: 'center' }); const cx = 50; const cy = 22;
  for (let f = 0; f < 6; f++) {
    patch(s, f, cx, cy, 42, 14, 71, (x, y, e) => e > .8 ? .12 + (y < cy ? .1 : 0) : .55 + (1 - e) * .4 + Math.sin((x + f * 4) / 6 + y / 3) * .06, C.lava);
    for (let q = 0; q < 5; q++) { const rr = rng(90 + q); const x = cx + ((rr() - .5) * 56 + f * 2) % 56 - 2; const y = cy + (rr() - .5) * 14; for (let yy = -2; yy <= 1; yy++) for (let xx = -4; xx <= 4; xx++) if (Math.abs(xx) + Math.abs(yy) * 2 < 5) tone(s, f, C.lava, x + xx, y + yy, yy < 0 ? .22 : .1); }
    for (let q = 0; q < 3; q++) { const rr = rng(110 + q); const life = ((f / 6) + rr()) % 1; const x = Math.round(cx + (rr() - .5) * 50); const y = Math.round(cy + (rr() - .5) * 12); const r = Math.round(1 + life * 3); if (life < .8) for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) tone(s, f, C.lava, x + xx, y + yy - r, .8 + (yy < 0 ? .15 : 0)); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function crater() {
  const s = new Sheet('gfx_crater', 104, 44, 1, { anchor: 'center' }); const cx = 52; const cy = 26;
  patch(s, 0, cx, cy, 44, 15, 131, (x, y, e) => e > .78 ? (y < cy ? .85 : .5) : e > .66 ? .35 : .12 + (y > cy ? .08 : 0), C.dirt);
  for (let q = 0; q < 9; q++) { const rr = rng(140 + q); const a = rr() * TAU; const x = Math.round(cx + Math.cos(a) * 30 * rr()); const y = Math.round(cy + Math.sin(a) * 9 * rr()); const sz = 2 + (q % 3); for (let yy = 0; yy < sz; yy++) for (let xx = 0; xx < sz + 1; xx++) tone(s, 0, C.dirt, x + xx, y + yy, yy === 0 ? .7 : .45); }
  B.selOutline(s, 0, C.out);
  return s;
}
function blood() {
  const s = new Sheet('gfx_blood', 96, 36, 2, { anchor: 'center' }); const cx = 48; const cy = 18;
  for (let f = 0; f < 2; f++) {
    patch(s, f, cx, cy, 38, 12, 151, (x, y, e) => e > .82 ? .18 : .4 + (1 - e) * .12, C.blood);
    for (let q = 0; q < 5; q++) { const rr = rng(160 + q); const a = rr() * TAU; const x = cx + Math.cos(a) * 44; const y = cy + Math.sin(a) * 14; for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx + yy * yy <= 4) tone(s, f, C.blood, x + xx, y + yy * .6, .35); }
    for (let x = cx - 14; x < cx + 2; x++) tone(s, f, C.blood, x, cy - 4, f ? .9 : .78);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function hole() {
  const s = new Sheet('gfx_hole', 96, 40, 1, { anchor: 'center' }); const cx = 48; const cy = 22;
  patch(s, 0, cx, cy, 40, 13, 171, (x, y, e) => e > .8 ? (y < cy ? .75 : .4) : 0, C.dirt);
  for (let q = 0; q < 8; q++) { const a = q / 8 * TAU; const x = Math.round(cx + Math.cos(a) * 40); const y = Math.round(cy + Math.sin(a) * 13); for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 4; xx++) tone(s, 0, C.dirt, x + xx - 2, y + yy - 2, yy === 0 ? .8 : .5); }
  B.selOutline(s, 0, C.out);
  return s;
}
module.exports = { groundSheets: () => [scorch(), water(), ice(), lava(), crater(), blood(), hole()] };
