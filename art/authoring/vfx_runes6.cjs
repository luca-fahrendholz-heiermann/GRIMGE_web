// GRIMGE — special runes, round 6 (hand-drawn quality; vfx_brush.cjs; final density). Rune palettes; own designs.
//   pledge_seal    6-frame loop, 160×56 (base): S08 Sekundenpfand — an open seal on the ground: a broken ring of
//                  steel-blue plates with second-hand ticks and a wandering light point.
//   pledge_pillar  6 frames, 28×132 (base): a narrow pillar of pale light-stone striking up from a mark.
//   fugue_dome     8-frame loop, 224×144 (base): S09 Stillfuge — a hexagonal dome of bone-white glass ribs over a
//                  dark wood-brown base ring, glass flakes floating very slowly inside.
//   recall_needle  4-frame loop, 24×72 (base): S10 Rücksprungnadel — a slender jade dagger of four refracting
//                  segments with a green core and a three-blade spin ring at its foot.
//   basalt_plate   1 frame, 44×20 (base): S14 Seismischer Steg — a basalt walkway slab with a gold seam.
//   flood_rail     6-frame loop, 48×24, TILEABLE: S15 Flutschiene — a water channel flowing right: blue body,
//                  platinum crests travelling downstream, foam.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = {
  seal: B.pal({ r: ['#0e1a24', '#1f3446', '#3e6684', '#6f9ab5', '#eef2f4'] }).r, amber: B.pal({ r: ['#a87a3a', '#ffe0a8', '#ffffff'] }).r,
  glass: B.pal({ r: ['#6a6660', '#a8a49c', '#e6e2da', '#ffffff'] }).r, wood: B.pal({ r: ['#1a1612', '#2a2622', '#6a4a2a', '#9a7a4a'] }).r,
  jade: B.pal({ r: ['#142014', '#2c3a2a', '#6f9a6a', '#cfe0c0', '#f4f7ea'] }).r, green: B.pal({ r: ['#2f8a4a', '#8fe0a0', '#e0ffe8'] }).r,
  basalt: B.pal({ r: ['#0c0c0e', '#1c1c20', '#2e2f36', '#45464e', '#6e7080'] }).r, seamG: B.pal({ r: ['#8a6a1a', '#f2c64a', '#fff0b0'] }).r,
  water: B.pal({ r: ['#0c2238', '#1c3a5a', '#3a6a9e', '#5f9ad6', '#a8c8ec', '#e6eef6', '#ffffff'] }).r,
  out: B.pal({ o: '#06070a' }).o
};
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };

function seal() {
  const s = new Sheet('pledge_seal', 160, 56, 6, { anchor: 'center' }); const cx = 80; const gy = 28; const R = 70; const ry = 21;
  for (let f = 0; f < 6; f++) {
    // Six plates round an ellipse with gaps (an open seal), each a thick band lit on the far side.
    for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU + .2; const a1 = a0 + TAU / 6 * .62; for (let a = a0; a <= a1; a += .008) for (let r = 0; r < 7; r++) { const x = cx + Math.cos(a) * (R - r); const y = gy + Math.sin(a) * (ry - r * .3); tone(s, f, C.seal, x, y, (Math.sin(a) < 0 ? .7 : .45) + (r < 2 ? .2 : 0)); } }
    // Second-hand ticks inside and the wandering light point.
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; const L = k % 6 === 0 ? 5 : 2; for (let j = 0; j < L; j++) tone(s, f, C.seal, cx + Math.cos(a) * (R - 10 - j), gy + Math.sin(a) * (ry - 3 - j * .3), .85); }
    const la = f / 6 * TAU; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (Math.abs(x) + Math.abs(y) <= 3) tone(s, f, C.amber, cx + Math.cos(la) * (R + 3) + x, gy + Math.sin(la) * (ry + 1) + y, 1 - (Math.abs(x) + Math.abs(y)) * .15);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function pillar() {
  const s = new Sheet('pledge_pillar', 28, 132, 6, { anchor: 'base', baseOffset: 2 });
  for (let f = 0; f < 6; f++) {
    const k = f / 5; const h = Math.min(1, (f + 1) / 2) * 124; const w = 6 * (1 - Math.max(0, k - .5)) + 1;
    for (let y = 0; y < h; y++) for (let x = -w; x <= w; x++) tone(s, f, C.seal, 14 + x, 128 - y, (x < 0 ? .85 : .55) + (y > h - 6 ? .15 : 0) - Math.abs(x) / 30);
    for (let y = 0; y < h; y += 9) tone(s, f, C.seal, 14, 128 - y, .3);
    if (f <= 2) for (let q = 0; q < 6; q++) { const a = -Math.PI * (q / 5); tone(s, f, C.amber, 14 + Math.cos(a) * (8 + f * 3), 126 + Math.sin(a) * 4, 1); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function fugue() {
  const s = new Sheet('fugue_dome', 224, 144, 8, { anchor: 'base', baseOffset: 6 }); const cx = 112; const gy = 136; const R = 104;
  for (let f = 0; f < 8; f++) {
    // Base ring of dark wood.
    for (let a = 0; a < TAU; a += .006) for (let r = 0; r < 5; r++) tone(s, f, C.wood, cx + Math.cos(a) * (R - r), gy + Math.sin(a) * (R * .3 - r * .3), Math.sin(a) > 0 ? .75 : .45);
    // Hexagonal dome: six ribs meeting at the top, glass panes as sparse dither between.
    const apex = [cx, gy - R * .82];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const bx = cx + Math.cos(a) * R; const by = gy + Math.sin(a) * R * .3; const back = Math.sin(a) < 0; for (let u = 0; u <= 1; u += .005) { const x = bx + (apex[0] - bx) * u; const y = by + (apex[1] - by) * u - Math.sin(u * Math.PI) * 18; for (let w = 0; w < (back ? 2 : 3); w++) tone(s, f, C.glass, x + w, y, back ? .5 : .85 - w * .15); } }
    // Glass flakes drifting very slowly inside (barely move between frames).
    const r = rng(90); for (let q = 0; q < 10; q++) { const x = cx + (r() - .5) * R * 1.3; const y = gy - 20 - r() * R * .55 - f * .4; for (let k = -2; k <= 2; k++) tone(s, f, C.glass, x + k, y + (k > 0 ? 1 : 0), .95 - Math.abs(k) * .1); }
    B.selOutline(s, f, C.out);
    for (const [a0, a1, rr] of [[Math.PI * 1.15, Math.PI * 1.4, .92], [Math.PI * 1.6, Math.PI * 1.72, .85]]) for (let a = a0; a < a1; a += .008) { s.set(f, cx + Math.cos(a) * R * rr, gy + Math.sin(a) * R * .82 * rr, C.glass[3]); }
  }
  return s;
}
function needle() {
  const s = new Sheet('recall_needle', 24, 72, 4, { anchor: 'base', baseOffset: 2 }); const cx = 12; const gy = 70;
  for (let f = 0; f < 4; f++) {
    // Spin ring of three blades at the foot.
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + f * .5; for (let t = 0; t < 9; t++) tone(s, f, C.jade, cx + Math.cos(a + t * .08) * (4 + t), gy - 2 + Math.sin(a + t * .08) * (1.5 + t * .3), .7 - t / 20); }
    // Four segments, narrowing upward, lit left half, a green core line.
    for (let i = 0; i < 4; i++) { const y0 = gy - 6 - i * 13; const w = 4 - i * .7; for (let y = y0 - 11; y <= y0; y++) for (let x = -w; x <= w; x++) tone(s, f, C.jade, cx + x, y, (x < 0 ? .85 : .5) - (y0 - y) / 60); tone(s, f, C.jade, cx, y0, .2); }
    for (let y = gy - 58; y < gy - 6; y++) tone(s, f, C.green, cx, y, (y + f * 6) % 12 < 3 ? 1 : .6);
    for (let y = 0; y < 8; y++) for (let x = -Math.max(0, 2 - y * .3); x <= Math.max(0, 2 - y * .3); x++) tone(s, f, C.jade, cx + x, gy - 60 - y, .95);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function plateB() {
  const s = new Sheet('basalt_plate', 44, 20, 1, { anchor: 'base', baseOffset: 2 });
  for (let y = 4; y < 18; y++) for (let x = 2; x < 42; x++) { const top = y < 9; tone(s, 0, C.basalt, x, y, top ? .8 - (x - 2) / 120 : .4 - (y - 9) / 40); }
  for (let x = 6; x < 36; x++) tone(s, 0, C.seamG, x, 6 + Math.round(Math.sin(x / 5)), (x % 7) < 3 ? 1 : .6);
  for (const x of [14, 28]) for (let y = 9; y < 18; y++) tone(s, 0, C.basalt, x, y, .15);
  B.selOutline(s, 0, C.out); return s;
}
function rail() {
  const W = 48; const s = new Sheet('flood_rail', W, 24, 6, { anchor: 'center' }); const cy = 12;
  for (let f = 0; f < 6; f++) {
    const off = f * 8;
    for (let x = 0; x < W; x++) { const top = cy - 6 + Math.round(Math.sin((x - off) / W * TAU * 2) * 1.3); for (let y = top; y <= cy + 6; y++) tone(s, f, C.water, x, y, .3 + (cy + 6 - y) / 20 + (y === top ? .4 : 0)); }
    for (let i = 0; i < 3; i++) { const base = (i * 16 + off) % W; for (const d of [-W, 0, W]) for (let k = 0; k < 6; k++) { const x = base + d - k; if (x < 0 || x >= W) continue; tone(s, f, C.water, x, cy - 4 + Math.round(k * .5), k < 2 ? 1 : .85); } }
    for (let i = 0; i < 4; i++) { const base = (i * 12 + off * 1.5 + 5) % W; for (const d of [-W, 0, W]) { const x = base + d; if (x >= 0 && x < W) tone(s, f, C.water, x, cy + 2, .95); } }
    B.selOutline(s, f, C.out);
  }
  return s;
}
module.exports = { runes6Sheets: () => [seal(), pillar(), fugue(), needle(), plateB(), rail()] };
