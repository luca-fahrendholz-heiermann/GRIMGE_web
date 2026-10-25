// GRIMGE — LIGHTNING, hand-drawn quality (vfx_brush.cjs; authored at final density, 1 px = 1 world px).
//   bolt         6 frames, 48×40, TILEABLE (enters / leaves at the centre line): a jagged bolt that re-forms
//                every frame — white-hot core, pale-yellow inner, yellow sheath, violet rim — with side forks,
//                a dim twin strand and crackle sparks. Used for thunder lance, chain links and the blitz dash.
//   bolt_root    6 frames, 32×40: a crackling charge ball at the hand, arcs leaping off it.
//   bolt_head    6 frames, 44×52: the bolt's end knot — a ball of short arcs.
//   bolt_hit     8 frames, 56×56: impact — flash star, arcs radiating, sparks flying, a scorched mark.
//   shock_ring   8 frames, 160×72 (base): an electric discharge ring racing out over the ground (aura shock).
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
// v2 (user, 25 Oct 2026: "Blitze sollten eher so zackig sein als gerade so wurstig"): thin, sharp zigzag
// segments — a 1-px white core with a yellow edge — filled triangular barbs at every kink, scattered spark
// dots and dashes, and only a thin dark outline (no thick violet sausage).
const C = B.pal({ bolt: ['#3b2470', '#c79a12', '#ffd21e', '#fff06a', '#fffbe0', '#ffffff'], spark: ['#ffc81e', '#fff06a', '#ffffff'], scorch: ['#2a2018', '#40332a'], out: '#141026' });

// Jagged path between two points: recursive midpoint displacement (seeded), returns points.
function jag(x0, y0, x1, y1, rough, depth, r) {
  // A sharp zigzag: steps along the line, each joint thrown alternately to one side (big angle changes).
  const L = Math.hypot(x1 - x0, y1 - y0) || 1; const dx = (x1 - x0) / L; const dy = (y1 - y0) / L; const nx = -dy; const ny = dx;
  const pts = [[x0, y0]]; let d = 0; let side = r() < .5 ? 1 : -1; const amp = Math.max(3, rough * .45);
  while (d < L - 6) { d = Math.min(L - 3, d + 5 + r() * 8); const off = side * amp * (.45 + r() * .7); side = -side; pts.push([x0 + dx * d + nx * off, y0 + dy * d + ny * off]); }
  pts.push([x1, y1]); void depth; return pts;
}
// Stamp a polyline with a given square size in a colour.
function stamp(s, f, pts, size, c) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]; const [bx, by] = pts[i]; const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n; const y = ay + (by - ay) * k / n; for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) s.set(f, x - (size >> 1) + dx, y - (size >> 1) + dy, c); }
  }
}
// A bolt: thin yellow edge + white core along each segment, a filled barb (triangle) in every kink.
function boltPath(s, f, pts, w = 5) {
  const edge = w >= 3 ? 2 : 1;
  stamp(s, f, pts, edge, C.bolt[2]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i - 1]; const [bx, by] = pts[i]; const [cx, cy] = pts[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay) || 1; const l2 = Math.hypot(cx - bx, cy - by) || 1; const k = Math.min(4, w * .8 + 1);
    s.poly(f, [[bx, by], [bx - (bx - ax) / l1 * k, by - (by - ay) / l1 * k], [bx + (cx - bx) / l2 * k, by + (cy - by) / l2 * k]], C.bolt[3]);
    s.set(f, bx, by, C.bolt[5]);
  }
  stamp(s, f, pts, 1, C.bolt[5]);
}
const spark = (s, f, x, y, big) => { s.set(f, x, y, C.spark[big ? 2 : 1]); if (big) { s.set(f, x + 1, y, C.spark[1]); s.set(f, x + 2, y, C.spark[0]); } };
// A small zig arc (crackle) of n segments from (x, y) in roughly direction a.
function arc(s, f, x, y, a, len, r, w = 2) { const pts = [[x, y]]; let px = x; let py = y; for (let k = 0; k < 3; k++) { const aa = a + (r() - .5) * 1.6; const l = len / 3; px += Math.cos(aa) * l; py += Math.sin(aa) * l; pts.push([px, py]); } boltPath(s, f, pts, w); return pts[pts.length - 1]; }

function bolt() {
  const W = 48; const H = 40; const N = 6; const s = new Sheet('bolt', W, H, N, { anchor: 'center' }); const cy = 20;
  for (let f = 0; f < N; f++) {
    const r = rng(100 + f * 13);
    // Dim twin strand behind (thin, violet-yellow).
    const twin = jag(0, cy, W, cy, 14, 4, r); stamp(s, f, twin.map(([x, y]) => [x, y + 3]), 3, C.bolt[1]); stamp(s, f, twin.map(([x, y]) => [x, y + 3]), 1, C.bolt[2]);
    // The main bolt.
    const main = jag(0, cy, W, cy, 18, 4, r); boltPath(s, f, main, 5);
    // Forks off two joints.
    for (let k = 0; k < 2; k++) { const j = main[2 + Math.floor(r() * (main.length - 4))]; const a = (r() < .5 ? -1 : 1) * (.6 + r() * .6); const end = arc(s, f, j[0], j[1], a, 9 + r() * 7, r, 3); if (r() < .6) arc(s, f, end[0], end[1], a + (r() - .5), 5, r, 2); }
    for (let q = 0; q < 5; q++) spark(s, f, r() * W, cy + (r() - .5) * 26, q < 2);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function root() {
  const W = 32; const H = 40; const N = 6; const s = new Sheet('bolt_root', W, H, N, { anchor: 'center' });
  for (let f = 0; f < N; f++) {
    const r = rng(200 + f * 7);
    for (let k = 0; k < 4; k++) arc(s, f, 14, 20, r() * TAU, 8 + r() * 6, r, 2);
    for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) { const d = Math.hypot(xx, yy); if (d > 6) continue; s.set(f, 14 + xx, 20 + yy, C.bolt[d > 5 ? 2 : d > 3.5 ? 3 : d > 2 ? 4 : 5]); }
    for (let q = 0; q < 4; q++) spark(s, f, 14 + (r() - .5) * 26, 20 + (r() - .5) * 28, q === 0);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function head() {
  const W = 44; const H = 52; const N = 6; const s = new Sheet('bolt_head', W, H, N, { anchor: 'center' });
  for (let f = 0; f < N; f++) {
    const r = rng(300 + f * 11);
    for (let k = 0; k < 7; k++) { const end = arc(s, f, 16, 26, r() * TAU, 10 + r() * 9, r, 3); if (r() < .5) arc(s, f, end[0], end[1], r() * TAU, 6, r, 2); }
    for (let yy = -7; yy <= 7; yy++) for (let xx = -7; xx <= 7; xx++) { const d = Math.hypot(xx, yy) + (r() - .5); if (d > 7) continue; s.set(f, 16 + xx, 26 + yy, C.bolt[d > 6 ? 2 : d > 4 ? 3 : d > 2.5 ? 4 : 5]); }
    for (let q = 0; q < 6; q++) spark(s, f, 16 + (r() - .5) * 40, 26 + (r() - .5) * 46, q < 2);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function hit() {
  const W = 56; const H = 56; const N = 8; const s = new Sheet('bolt_hit', W, H, N, { anchor: 'center' }); const cx = 28; const cy = 28;
  for (let f = 0; f < N; f++) {
    const r = rng(400 + f * 5); const k = f / (N - 1);
    // Scorch mark (from frame 2).
    if (f >= 2) for (let yy = -3; yy <= 3; yy++) for (let xx = -11; xx <= 11; xx++) { if ((xx / 11) ** 2 + (yy / 3) ** 2 > 1 || B.dither(cx + xx, cy + 14 + yy, k * .9)) continue; s.set(f, cx + xx, cy + 14 + yy, C.scorch[(xx + yy) % 3 ? 0 : 1]); }
    if (f <= 1) { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .3; const l = f === 0 ? 22 : 14; boltPath(s, f, [[cx, cy], [cx + Math.cos(a) * l * .5, cy + Math.sin(a) * l * .5], [cx + Math.cos(a) * l, cy + Math.sin(a) * l]], i % 2 ? 2 : 3); } for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) if (xx * xx + yy * yy <= 25) s.set(f, cx + xx, cy + yy, C.bolt[xx * xx + yy * yy > 12 ? 4 : 5]); }
    else if (f <= 5) for (let i = 0; i < 6 - (f - 2); i++) { const a = r() * TAU; const p0 = [cx + Math.cos(a) * 4, cy + Math.sin(a) * 4]; arc(s, f, p0[0], p0[1], a, 10 + (f - 2) * 4, r, 3 - (f > 3 ? 1 : 0)); }
    for (let q = 0; q < 10; q++) { const rq = rng(450 + q); const a = rq() * TAU; const d = 6 + k * (14 + rq() * 12); spark(s, f, cx + Math.cos(a) * d, cy + Math.sin(a) * d * .8 + k * k * 10, q % 3 === 0 && f < 6); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function ring() {
  const W = 160; const H = 72; const N = 8; const s = new Sheet('shock_ring', W, H, N, { anchor: 'base', baseOffset: 4 }); const cx = 80; const gy = 64;
  for (let f = 0; f < N; f++) {
    const r = rng(500 + f * 9); const R = 14 + f * 9.5; const ry = R * .3; const fade = clamp01((f - 4) / 3);
    // The racing ring: a closed jagged bolt loop round the ellipse, broken in places as it fades.
    const pts = []; const n = Math.max(12, Math.round(R / 2.5));
    for (let i = 0; i <= n; i++) { const a = i / n * TAU; const jitter = (r() - .5) * 6; pts.push([cx + Math.cos(a) * (R + jitter), gy + Math.sin(a) * (ry + jitter * .3)]); }
    for (let i = 1; i < pts.length; i++) { if (fade > 0 && r() < fade * .7) continue; boltPath(s, f, [pts[i - 1], pts[i]], 3); }
    // Arcs leaping up off the ring, and a few crawling inward.
    for (let k = 0; k < 6; k++) { const a = r() * TAU; const x = cx + Math.cos(a) * R; const y = gy + Math.sin(a) * ry; if (r() > fade) arc(s, f, x, y, -Math.PI / 2 + (r() - .5), 8 + r() * 10, r, 2); }
    for (let q = 0; q < 10; q++) spark(s, f, cx + (r() - .5) * R * 2.2, gy - r() * 20, q < 3);
    B.selOutline(s, f, C.out);
  }
  return s;
}
module.exports = { lightningSheets: () => [bolt(), root(), head(), hit(), ring()] };
