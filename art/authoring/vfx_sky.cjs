// GRIMGE — SKY SPHERES, hand-drawn quality (vfx_brush.cjs; final density). Drawn for a body radius of 34 px.
//   sky_sun        6-frame loop, 128×128: a volume-shaded sun, a corona of flame tongues licking outward.
//   sky_moon       4-frame loop, 112×112: a shaded moon, craters with lit rims, a cool halo of motes.
//   sky_bloodmoon  4-frame loop, 112×112: the moon steeped in red, a dripping crimson haze.
//   sky_eclipse    6-frame loop, 128×128: a black disc, a white-gold corona with flaring rays.
//   sky_cloud      8-frame loop, 160×112: a churning storm cloud (volume-shaded puffs); frames 5-6 flash a bolt.
//   sky_stars      6-frame loop, 160×96: a constellation of twinkling four-point stars linked by faint lines.
const B = require('./vfx_brush.cjs');
const F = require('./vfx_fire.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = B.pal({
  sun: ['#7a3a00', '#c86a00', '#ff9f1a', '#ffc94a', '#ffe7a0', '#fff8e0', '#ffffff'],
  moon: ['#2a2f52', '#4a5384', '#7480b8', '#a8b2de', '#d8def6', '#f4f6ff'],
  blood: ['#2a0306', '#5a0a10', '#8e1b1b', '#c62828', '#ef6a5a', '#ffc2b8'],
  ecl: ['#5a3a00', '#c99a1a', '#ffe082', '#fff3c4', '#ffffff'],
  cloud: ['#12181f', '#1f2a33', '#2f3d48', '#45555f', '#62727b', '#8a989f'],
  bolt: ['#7d5cf0', '#ffc81e', '#fff06a', '#ffffff'],
  star: ['#5a7aa8', '#a8c8f0', '#e1f5fe', '#ffffff'],
  out: '#0a0a14'
});
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };
const sphere = (s, f, ramp, cx, cy, r, { lx = -.45, ly = -.5, bias = 0 } = {}) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y) / r; if (d > 1) continue; const nz = Math.sqrt(1 - d * d); const lit = clamp01((x / r) * lx + (y / r) * ly + nz * .75); tone(s, f, ramp, cx + x, cy + y, lit * .85 + .1 + bias - (d > .93 ? .2 : 0)); } };

function sun() {
  const s = new Sheet('sky_sun', 128, 128, 6, { anchor: 'center' }); const c = 64;
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + f * .07; const h = 12 + ((i + f) % 3) * 6; F.flame(s, f, c + Math.cos(a) * 30, c + Math.sin(a) * 30, h, 10, { dir: a, lean: 2, ph: f + i, cool: .02 }); }
    sphere(s, f, C.sun, c, c, 34, { bias: .05 });
    for (let q = 0; q < 6; q++) { const rr = rng(20 + q + f); const a = rr() * TAU; const d = rr() * 24; tone(s, f, C.sun, c + Math.cos(a) * d, c + Math.sin(a) * d, .35); tone(s, f, C.sun, c + Math.cos(a) * d + 1, c + Math.sin(a) * d, .45); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function moon(name, ramp, blood) {
  const s = new Sheet(name, 112, 112, 4, { anchor: 'center' }); const c = 56;
  for (let f = 0; f < 4; f++) {
    for (let q = 0; q < 14; q++) { const rr = rng(40 + q); const a = rr() * TAU + f * .1; const d = 38 + rr() * 12 + Math.sin(f + q) * 2; tone(s, f, ramp, c + Math.cos(a) * d, c + Math.sin(a) * d, .6 + (q % 3) * .1); }
    sphere(s, f, ramp, c, c, 34);
    for (const [ox, oy, cr] of [[-10, -7, 8], [9, 5, 10], [-2, 15, 5], [13, -12, 4], [-15, 9, 4]]) for (let y = -cr; y <= cr; y++) for (let x = -cr; x <= cr; x++) { const d = Math.hypot(x, y) / cr; if (d > 1) continue; tone(s, f, ramp, c + ox + x, c + oy + y, d > .75 && (x + y) < 0 ? .3 : d > .75 ? .85 : .42); }
    if (blood) for (let q = 0; q < 6; q++) { const x = c - 20 + q * 8; const len = 4 + ((q + f) % 3) * 3; for (let k = 0; k < len; k++) tone(s, f, ramp, x, c + 30 + k, .55 - k / len * .3); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function eclipse() {
  const s = new Sheet('sky_eclipse', 128, 128, 6, { anchor: 'center' }); const c = 64;
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.sin(f / 6 * TAU + i) * .08; const l = 14 + ((i * 3 + f) % 4) * 6; for (let k = 0; k < l; k++) { const w = Math.max(0, Math.round((1 - k / l) * 2.5)); for (let j = -w; j <= w; j++) tone(s, f, C.ecl, c + Math.cos(a) * (38 + k) - Math.sin(a) * j, c + Math.sin(a) * (38 + k) + Math.cos(a) * j, .9 - k / l * .6); } }
    for (let y = -40; y <= 40; y++) for (let x = -40; x <= 40; x++) { const d = Math.hypot(x, y); if (d > 40 || d < 34) continue; tone(s, f, C.ecl, c + x, c + y, 1 - (d - 34) / 8); }
    for (let y = -34; y <= 34; y++) for (let x = -34; x <= 34; x++) if (Math.hypot(x - 2, y) <= 34) s.set(f, c + x + 2, c + y, C.out);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function cloud() {
  const s = new Sheet('sky_cloud', 160, 112, 8, { anchor: 'center' }); const c = 80; const cy = 50;
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    if (f === 5 || f === 6) { let x = c + (f === 5 ? -10 : 14); let y = cy + 20; const pts = [[x, y]]; const r = rng(70 + f); for (let k = 0; k < 6; k++) { x += (r() - .5) * 16; y += 8; pts.push([x, y]); } for (const [w, col] of [[5, C.bolt[0]], [3, C.bolt[1]], [1, C.bolt[3]]]) for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1]; const [bx, by] = pts[i]; const n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let k = 0; k <= n; k++) for (let dy = 0; dy < w; dy++) for (let dx = 0; dx < w; dx++) s.set(f, ax + (bx - ax) * k / n - (w >> 1) + dx, ay + (by - ay) * k / n - (w >> 1) + dy, col); } }
    for (const [ox, oy, cr] of [[-44, 12, 22], [44, 14, 24], [-20, -4, 30], [20, -8, 32], [0, 16, 28]]) { const mx = c + ox + Math.sin(ph * TAU + ox) * 2; const my = cy + oy; const m = B.noisyBlob(mx, my, cr, 80 + ox, .14, .7); B.volume(s, f, mx - cr * 1.3, my - cr, mx + cr * 1.3, my + cr, m, f === 5 || f === 6 ? C.cloud.map((col, i) => C.cloud[Math.min(5, i + 1)]) : C.cloud, { reach: cr * .6 }); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function stars() {
  const s = new Sheet('sky_stars', 160, 96, 6, { anchor: 'center' });
  const pts = [[30, 60], [62, 34], [92, 50], [120, 24], [138, 58], [80, 76]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i]; const [bx, by] = pts[i + 1]; const n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let k = 0; k <= n; k += 3) tone(s, f, C.star, ax + (bx - ax) * k / n, ay + (by - ay) * k / n, .3); }
    pts.forEach(([x, y], i) => { const r = 3 + ((i + f) % 3); for (let k = -r; k <= r; k++) { const v = 1 - Math.abs(k) / (r + 1); tone(s, f, C.star, x + k, y, .4 + v * .6); tone(s, f, C.star, x, y + k, .4 + v * .6); } tone(s, f, C.star, x - 1, y - 1, .8); tone(s, f, C.star, x + 1, y + 1, .8); tone(s, f, C.star, x + 1, y - 1, .8); tone(s, f, C.star, x - 1, y + 1, .8); });
    const r = rng(90 + f); for (let q = 0; q < 14; q++) tone(s, f, C.star, Math.round(r() * 158), Math.round(r() * 94), .5 + r() * .5);
  }
  return s;
}
module.exports = { skySheets: () => [sun(), moon('sky_moon', C.moon, false), moon('sky_bloodmoon', C.blood, true), eclipse(), cloud(), stars()] };
