// GRIMGE — special runes, round 7 (hand-drawn quality; vfx_brush.cjs; final density, drawn at scale .5 in game — at scale 1 a sheet px is a world px).
// Rune palettes from signature_runes_data.js; own designs.
//   glass_tile     6 frames, 64×24: S18 Glasfeld — a hexagonal mirror tile (0–3 idle glint, 4 charged, 5 spent)
//   beam_prism     4 frames, 100×120 (base): S19 Strahlenweber — a three-armed copper prism on a stone foot, light seam
//   prism_clamp    5 frames, 48×56: S20 Prismenhalter — two brass V-clamps opening (0–3), 4 = a stored cyan shard held
//   swarm_window   3 frames, 18×18: S21 Schwarmprotokoll — a launch window (0/1 open pulse, 2 closed)
//   swarm_mark     4 frames, 60×24: S21 — four violet target fins circling above the marked foe
//   rift_gate      4 frames, 64×92 (base): S22 Rissweiche — a broken lapis gate frame, gold inner rim, dark shimmer
//   polar_tower    4 frames, 52×150 (base): S23 Polarisationswerk — a copper slab tower with two toothed rotors
//   lift_column    6 frames, 20×96 (base): S24 Schwerelosband — a rising mint field line over a ground crack
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
const OUT = (c) => B.pal({ o: c }).o;
const disc = (s, f, r, cx, cy, rx, ry, sh) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) tone(s, f, r, cx + x, cy + y, sh(x, y, e)); } };
const line = (s, f, r, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) tone(s, f, r, x0 + (x1 - x0) * i / n + k, y0 + (y1 - y0) * i / n, typeof v === 'function' ? v(i / n) : v); };
const poly = (s, f, r, pts, sh) => { const ys = pts.map((q) => q[1]); const xs = pts.map((q) => q[0]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if ((yi > y + .5) !== (yj > y + .5) && x + .5 < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi) c = !c; } if (c) tone(s, f, r, x, y, sh(x, y)); } };
const C = {
  glass: ramp('#14262a', '#2a4a50', '#6a9aa4', '#d8eef6', '#ffffff'), jade: ramp('#0a3a2a', '#3fbf9a', '#a8ffe0'), dark: ramp('#0a1214', '#1a2024', '#2a3034'),
  copper: ramp('#2a1408', '#6a3a18', '#c8742a', '#ffd27a', '#fff6d8'), stone: ramp('#1a1612', '#3a332a', '#5e5444', '#8a7e68'),
  brass: ramp('#3a2a14', '#6a5226', '#a8803a', '#e8c878'), cyan: ramp('#0a3a40', '#2a9aa6', '#5fe6f0', '#d8fcff'),
  steel: ramp('#1a1c24', '#3a3e4c', '#6a7084', '#a0a8bc'), violet: ramp('#2a2048', '#6a5ac0', '#d8c8ff', '#ffffff'),
  lapis: ramp('#0a1430', '#0f1f4a', '#2a4ab0', '#6a8ae8'), gold: ramp('#5a4010', '#b08a2a', '#f2c64a', '#fff0b0'),
  rust: ramp('#3a1a10', '#6a2a18', '#b0482a', '#e8885a'), teal: ramp('#0a3a34', '#1aa090', '#3fe0c8', '#c8fff4'),
  night: ramp('#0a0a24', '#14143a', '#2a2a6e'), mint: ramp('#1a6a4a', '#3ac088', '#7fffc0', '#e8fff4')
};

function glassTile() {
  const s = new Sheet('glass_tile', 64, 24, 6, { anchor: 'center' }); const cx = 32; const cy = 12; const R = 30;
  for (let f = 0; f < 6; f++) {
    const spent = f === 5; const charged = f === 4; const pts = Array.from({ length: 6 }, (_, i) => [cx + Math.cos(i * TAU / 6 + .3) * R, cy + Math.sin(i * TAU / 6 + .3) * R * .34]);
    poly(s, f, spent ? C.dark : C.glass, pts, (x, y) => { const band = ((x - y * 2 + f * 9) % 30 + 30) % 30; return spent ? .5 : charged ? .75 : band < 3 ? .95 : .5 - (y - cy) / 30; });
    for (let i = 0; i < 6; i++) { const a = pts[i]; const b = pts[(i + 1) % 6]; line(s, f, spent ? C.dark : charged ? C.jade : C.glass, a[0], a[1], b[0], b[1], spent ? .9 : .85); }
    if (charged) { disc(s, f, C.jade, cx, cy, 6, 2, () => 1); line(s, f, C.jade, cx - 14, cy, cx + 14, cy, .7); }
    if (spent) { line(s, f, C.glass, cx - 12, cy - 3, cx + 4, cy + 3, .35); line(s, f, C.glass, cx + 2, cy - 4, cx + 14, cy + 2, .35); }
    B.selOutline(s, f, OUT('#06100e'));
  }
  return s;
}
function beamPrism() {
  const s = new Sheet('beam_prism', 100, 120, 4, { anchor: 'base', baseOffset: 2 }); const cx = 50; const cy = 60;
  for (let f = 0; f < 4; f++) {
    // Stone foot.
    for (let y = 92; y <= 118; y++) { const w = 10 + Math.round((y - 92) * .3); for (let x = -w; x <= w; x++) tone(s, f, C.stone, cx + x, y, (x < -3 ? .8 : x < 3 ? .55 : .35) - (y > 114 ? .2 : 0)); }
    // Three copper arms (faceted wedges) around the centre, a seam of light.
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3 - Math.PI / 2 + f * .05; const tip = [cx + Math.cos(a) * 44, cy + Math.sin(a) * 36]; const l = [cx + Math.cos(a - .3) * 34, cy + Math.sin(a - .3) * 28]; const r = [cx + Math.cos(a + .3) * 34, cy + Math.sin(a + .3) * 28];
      poly(s, f, C.copper, [[cx, cy], l, tip, r], (x, y) => { const side = (x - cx) * Math.sin(a) - (y - cy) * Math.cos(a); return side > 0 ? .75 : .45; }); line(s, f, C.copper, cx, cy, tip[0], tip[1], .95); }
    for (let y = cy - 26; y <= cy + 26; y++) { tone(s, f, C.copper, cx, y, (y + f * 6) % 12 < 3 ? 1 : .9); tone(s, f, C.copper, cx + 1, y, .8); }
    disc(s, f, C.copper, cx, cy, 5, 5, (x, y) => (x + y < 0 ? 1 : .85));
    line(s, f, C.stone, cx, cy + 6, cx, 92, .55, 3);
    B.selOutline(s, f, OUT('#120804'));
  }
  return s;
}
function prismClamp() {
  const s = new Sheet('prism_clamp', 48, 56, 5, { anchor: 'center' }); const cx = 10; const cy = 28;
  for (let f = 0; f < 5; f++) {
    const open = Math.min(1, f / 3);
    for (const sg of [-1, 1]) { const pts = [[cx, cy + sg * 3], [cx + 26 * open + 8, cy + sg * (6 + 18 * open)], [cx + 20 * open + 6, cy + sg * (3 + 22 * open)], [cx - 2, cy + sg * 7]]; poly(s, f, C.brass, pts, (x, y) => (sg < 0 ? .75 : .5) + ((x + y) % 7 === 0 ? .2 : 0)); line(s, f, C.brass, pts[0][0], pts[0][1], pts[1][0], pts[1][1], .95); }
    disc(s, f, C.brass, cx, cy, 4, 4, (x, y) => (x + y < 0 ? .9 : .5));
    if (f === 4) for (let y = -9; y <= 9; y++) { const w = Math.round(5 * (1 - Math.abs(y) / 9)); for (let x = -w; x <= w; x++) tone(s, f, C.cyan, cx + 24 + x, cy + y, x < 0 ? .95 : .6); }
    B.selOutline(s, f, OUT('#120c04'));
  }
  return s;
}
function swarmWindow() {
  const s = new Sheet('swarm_window', 18, 18, 3, { anchor: 'center' });
  for (let f = 0; f < 3; f++) {
    const closed = f === 2; const R = closed ? 4 : 7;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const edge = Math.abs(x) === R || Math.abs(y) === R; tone(s, f, edge ? C.steel : closed ? C.steel : C.violet, 9 + x, 9 + y, edge ? .8 : closed ? .3 : (f ? .7 : .55) + (x + y < 0 ? .2 : 0)); }
    if (!closed) { line(s, f, C.violet, 6, 10, 9, 7, 1); line(s, f, C.violet, 9, 7, 12, 10, 1); }
    B.selOutline(s, f, OUT('#06060a'));
  }
  return s;
}
function swarmMark() {
  const s = new Sheet('swarm_mark', 60, 24, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    for (let i = 0; i < 4; i++) { const a = f / 4 * TAU / 4 + i * TAU / 4; const x = 30 + Math.cos(a) * 24; const y = 12 + Math.sin(a) * 8; const tipX = 30 + Math.cos(a) * 14; const tipY = 12 + Math.sin(a) * 4.6; poly(s, f, C.violet, [[x - 3, y - 4], [x + 3, y - 4], [tipX, tipY]], (px) => (px < x ? .85 : .55)); }
    disc(s, f, C.violet, 30, 12, 2, 2, () => 1); B.selOutline(s, f, OUT('#06060a'));
  }
  return s;
}
function riftGate() {
  const s = new Sheet('rift_gate', 64, 92, 4, { anchor: 'base', baseOffset: 2 }); const cx = 32;
  for (let f = 0; f < 4; f++) {
    // Dark shimmering inside.
    for (let y = 6; y <= 88; y++) for (let x = -14; x <= 14; x++) tone(s, f, C.lapis, cx + x, y, ((x * 3 + y + f * 7) % 17 === 0) ? .55 : .1);
    // Frayed lapis splinters for the side posts, broken at the top; gold inner rim.
    for (const sg of [-1, 1]) for (let i = 0; i < 7; i++) { const y0 = 90 - i * 12; const wob = (i % 2) * 2; poly(s, f, C.lapis, [[cx + sg * (16 + wob), y0], [cx + sg * (24 + wob), y0 - 2], [cx + sg * (22 + (i % 3)), y0 - 12], [cx + sg * (15 + wob), y0 - 11]], (x) => (sg * (x - cx) < 19 ? .8 : .45)); }
    for (let y = 8; y <= 88; y++) { tone(s, f, C.gold, cx - 15, y, (y + f * 5) % 14 < 3 ? 1 : .7); tone(s, f, C.gold, cx + 15, y, (y + f * 5 + 7) % 14 < 3 ? 1 : .7); }
    for (let x = -12; x <= 12; x++) tone(s, f, C.gold, cx + x, 8 + Math.round(Math.abs(x) * .2), .8);
    B.selOutline(s, f, OUT('#040814'));
  }
  return s;
}
function polarTower() {
  const s = new Sheet('polar_tower', 52, 150, 4, { anchor: 'base', baseOffset: 2 }); const cx = 26;
  for (let f = 0; f < 4; f++) {
    for (let y = 80; y <= 148; y++) { const w = 7 + Math.round((y - 80) * .05); for (let x = -w; x <= w; x++) tone(s, f, C.rust, cx + x, y, (x < -2 ? .85 : x < 2 ? .6 : .35) + ((y % 12) === 0 ? -.2 : 0)); }
    for (let y = 84; y <= 144; y += 12) for (let x = -5; x <= 5; x++) tone(s, f, C.teal, cx + x, y + 4, (x + f) % 4 === 0 ? 1 : .6);
    for (let k = 0; k < 2; k++) { const cy = 58 - k * 28; const R = 18 - k * 4; const rot = f / 4 * TAU / 8 * (k ? -1 : 1);
      disc(s, f, C.rust, cx, cy, R - 4, Math.round((R - 4) * .5), (x, y) => (y < 0 ? .75 : .45));
      for (let i = 0; i < 8; i++) { const a = rot + i * TAU / 8; const x = cx + Math.cos(a) * R; const y = cy + Math.sin(a) * R * .5; for (let dy = -2; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tone(s, f, C.rust, x + dx, y + dy, Math.sin(a) < 0 ? .4 : .85); }
      line(s, f, C.teal, cx - R + 4, cy, cx + R - 4, cy, .9); line(s, f, C.rust, cx, cy + 4, cx, cy + 22 - k * 0, .55, 2); }
    B.selOutline(s, f, OUT('#120604'));
  }
  return s;
}
function liftColumn() {
  const s = new Sheet('lift_column', 20, 96, 6, { anchor: 'base', baseOffset: 2 }); const cx = 10;
  for (let f = 0; f < 6; f++) {
    for (let x = -8; x <= 8; x++) tone(s, f, C.night, cx + x, 92 + (Math.abs(x) % 3 === 0 ? 1 : 0), .5); // crack
    for (let y = 4; y < 92; y++) { const u = (92 - y) / 88; const x = cx + Math.sin(u * 6 + f) * 3; const on = ((y + f * 15) % 30) < 6; tone(s, f, on ? C.mint : C.night, x, y, on ? .95 - u * .3 : .9); if (on) tone(s, f, C.mint, x + 1, y, .6); }
    for (let k = 0; k < 2; k++) { const y = 92 - ((f * 15 + k * 45) % 88); tone(s, f, C.gold, cx - 3 + k * 6, y, 1); }
    B.selOutline(s, f, OUT('#040412'));
  }
  return s;
}
module.exports = { runes7Sheets: () => [glassTile(), beamPrism(), prismClamp(), swarmWindow(), swarmMark(), riftGate(), polarTower(), liftColumn()] };
