// GRIMGE — NATURE, hand-drawn quality (vfx_brush.cjs; final density, 1 px = 1 world px).
//   bloom_ring    8-frame loop, 176×64 (base): grass tufts and flowers round a healing circle, buds opening,
//                 petals and green motes drifting up (heal bloom / great bloom).
//   bless_ring    8-frame loop, 176×64 (base): the same in gold — light lilies, glints (blessing circle).
//   bramble       6 frames, 52×68 (base): thorny vines twisting out of the ground (0-2), swaying (3-5 loop).
//   swamp         8-frame loop, 184×56 (base): a murky poison pool — bubbles swelling and popping, toxic fumes
//                 curling up, reeds at the rim.
//   spring        8-frame loop, 184×60 (base): a clear healing spring — ripples, a little fountain, lily pads.
//   seed_burst    7 frames, 48×60 (base): a glowing seed that bursts into a fire plant (wildfire seeds).
//   pollen_cloud  8-frame loop, 240×84 (faces right): a widening cone of pollen clusters and spores.
//   world_tree    8 frames, 200×300 (base): growth (0-4) — roots, a twisting trunk, leaf masses swelling —
//                 then a swaying idle loop (5-7).
const B = require('./vfx_brush.cjs');
const F = require('./vfx_fire.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = B.pal({
  leaf: ['#16300c', '#2a5216', '#3f7a22', '#5fa33a', '#8fcf5a', '#c6ec8e', '#f2ffd8'],
  bark: ['#1e120b', '#3a2416', '#5a3a22', '#7c5636', '#a07a52', '#c9a47a'],
  petal: ['#7a1f4a', '#c2407a', '#ee7fae', '#ffc1da', '#fff0f6'],
  gold: ['#6a4400', '#b88400', '#f2c21a', '#ffe27a', '#fff6cf', '#ffffff'],
  swamp: ['#0f1608', '#1f2c10', '#34461a', '#4f6526', '#76913a', '#a8c45a', '#d6f08a'],
  water: ['#08264a', '#0e4a85', '#1f7fd1', '#3fb0ec', '#8fdcff', '#d6f6ff', '#ffffff'],
  fume: ['#3c5a1a', '#6f9a2c', '#a6d24a', '#d8f590'],
  pollen: ['#7a6a10', '#c9b032', '#f2dc5a', '#fff3a8', '#fffbe0'],
  out: '#0c1606'
});
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };
const disc = (s, f, ramp, cx, cy, r, squash = 1, bias = 0) => { for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { const d = Math.hypot(xx, yy / squash); if (d > r) continue; tone(s, f, ramp, cx + xx, cy + yy * squash, .85 - d / r * .45 - (yy > 0 ? .12 : 0) + bias); } };
// A grass tuft: blades curving up from (x, y).
function tuft(s, f, x, y, h, sway, seed) { const r = rng(seed); for (let b = 0; b < 4; b++) { const bx = x + (b - 1.5) * 2; const bh = h * (.6 + r() * .5); const lean = (r() - .5) * 4 + sway; for (let k = 0; k < bh; k++) { const u = k / bh; tone(s, f, C.leaf, bx + lean * u * u, y - k, .35 + u * .45); } } }
// A flower: stem, five petals round a heart; open 0 … 1 (bud → bloom).
function flower(s, f, x, y, h, open, ramp, seed) {
  for (let k = 0; k < h; k++) tone(s, f, C.leaf, x + Math.sin(k / h * 2 + seed) * 1, y - k, .4 + k / h * .2);
  const cy = y - h; const r = 1 + open * 3;
  if (open < .25) { disc(s, f, C.leaf, x, cy, 2); return; }
  for (let p = 0; p < 5; p++) { const a = p / 5 * TAU + seed; const px = x + Math.cos(a) * r; const py = cy + Math.sin(a) * r * .7; disc(s, f, ramp, Math.round(px), Math.round(py), Math.max(1, Math.round(r * .7)), .8); }
  disc(s, f, C.gold, x, cy, Math.max(1, Math.round(r * .4)), 1, .2);
}
const mote = (s, f, ramp, x, y) => { tone(s, f, ramp, x, y, .95); tone(s, f, ramp, x + 1, y, .7); tone(s, f, ramp, x, y + 1, .6); };

function ring(name, petals, gold) {
  const W = 176; const H = 64; const N = 8; const s = new Sheet(name, W, H, N, { anchor: 'base', baseOffset: 6 }); const cx = 88; const gy = 56; const R = 76; const ry = 22;
  for (let f = 0; f < N; f++) {
    const ph = f / N; const items = [];
    for (let i = 0; i < 22; i++) { const rr = rng(100 + i); const a = i / 22 * TAU + rr() * .2; items.push({ x: cx + Math.cos(a) * R * (.9 + rr() * .15), y: gy + Math.sin(a) * ry * (.9 + rr() * .15), kind: i % 3, rr: rr(), seed: i }); }
    items.sort((p, q) => p.y - q.y);
    for (const it of items) {
      const sway = Math.sin(ph * TAU + it.seed) * 1.5;
      if (it.kind === 0) flower(s, f, it.x, it.y, 8 + it.rr * 6, clamp01(.4 + .6 * Math.sin(ph * TAU + it.seed * 1.7) * .5 + .3), gold ? C.gold : petals, it.seed);
      else tuft(s, f, it.x, it.y, 7 + it.rr * 5, sway, 200 + it.seed);
    }
    for (let q = 0; q < 10; q++) { const rr = rng(300 + q); const life = (ph + rr()) % 1; const a = rr() * TAU; const x = cx + Math.cos(a) * R * rr(); const y = gy + Math.sin(a) * ry * rr() - 6 - life * 34; if (gold) { tone(s, f, C.gold, x, y, 1); tone(s, f, C.gold, x - 1, y, .7); tone(s, f, C.gold, x + 1, y, .7); tone(s, f, C.gold, x, y - 1, .7); } else if (q % 3 === 0) mote(s, f, petals, x, y); else mote(s, f, C.leaf, x, y); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function bramble() {
  const W = 52; const H = 68; const N = 6; const s = new Sheet('bramble', W, H, N, { anchor: 'base', baseOffset: 2 }); const cx = 26; const gy = 66;
  for (let f = 0; f < N; f++) {
    const grow = f < 3 ? (f + 1) / 3 : 1; const sway = f >= 3 ? Math.sin((f - 3) / 3 * TAU) * 2 : 0;
    for (let v = 0; v < 4; v++) {
      const rr = rng(400 + v); const x0 = cx + (v - 1.5) * 7; const h = (34 + rr() * 22) * grow; const pts = [];
      for (let k = 0; k <= 6; k++) { const u = k / 6; pts.push([x0 + Math.sin(u * 5 + v * 2) * 6 * u + sway * u, gy - u * h]); }
      B.stroke(s, f, pts, { max: 5 - v % 2, swell: .5, ramp: C.bark, seed: 410 + v, dry: 0, headBias: .05, light: [-.7, -.7] });
      // Thorns: short pale spikes along the stem, alternating sides; a leaf here and there.
      for (let k = 1; k < 6; k++) { const [px, py] = pts[k]; const side = (k + v) % 2 ? 1 : -1; for (let t = 0; t < 4; t++) tone(s, f, C.bark, px + side * (2 + t), py - t * .7, .9 - t * .1); if (k % 2 === 0) disc(s, f, C.leaf, Math.round(px - side * 4), Math.round(py - 2), 2, .6, .1); }
    }
    for (let q = 0; q < 4; q++) { const rr = rng(450 + q); B.volume(s, f, cx - 20 + q * 11, gy - 4, cx - 12 + q * 11, gy + 1, (x, y) => (x - (cx - 16 + q * 11)) ** 2 / 16 + (y - gy + 1) ** 2 / 4 <= 1, C.bark, { reach: 3 }); void rr; }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function pool(name, ramp, deco) {
  const W = 184; const H = name === 'spring' ? 60 : 56; const N = 8; const s = new Sheet(name, W, H, N, { anchor: 'base', baseOffset: 6 }); const cx = 92; const gy = H - 10; const R = 80; const ry = 22;
  for (let f = 0; f < N; f++) {
    const ph = f / N;
    for (let yy = -ry; yy <= ry; yy++) for (let xx = -R; xx <= R; xx++) { const e = (xx / R) ** 2 + (yy / ry) ** 2; const wob = Math.sin(Math.atan2(yy, xx) * 7 + 1) * .05; if (e > 1 + wob) continue; const rim = e > .82 + wob; tone(s, f, ramp, cx + xx, gy + yy, rim ? .62 : .25 + (1 - e) * .2 + (yy < 0 ? -.05 : .05) + Math.sin((xx + ph * 40) / 9 + yy / 3) * .04); }
    deco(s, f, ph, cx, gy, R, ry);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function swamp() {
  return pool('swamp', C.swamp, (s, f, ph, cx, gy, R, ry) => {
    for (let q = 0; q < 7; q++) { const rr = rng(500 + q); const a = rr() * TAU; const x = cx + Math.cos(a) * R * .7 * rr(); const y = gy + Math.sin(a) * ry * .6 * rr(); const life = (ph + rr()) % 1; if (life < .8) { const r = 1 + Math.round(life * 4); disc(s, f, C.swamp, Math.round(x), Math.round(y - r * .6), r, .8, .25); tone(s, f, C.swamp, Math.round(x - r * .4), Math.round(y - r), 1); } else { for (let k = 0; k < 6; k++) tone(s, f, C.swamp, x + Math.cos(k) * 5, y + Math.sin(k) * 2 - 2, .9); } }
    for (let q = 0; q < 5; q++) { const rr = rng(520 + q); const life = (ph + rr()) % 1; const x0 = cx + (rr() - .5) * R * 1.4; const pts = []; for (let k = 0; k <= 4; k++) { const u = k / 4; pts.push([x0 + Math.sin(u * 4 + life * 6 + q) * 5, gy - 4 - life * 16 - u * 22]); } if (life < .85) B.stroke(s, f, pts, { max: 4 * (1 - life * .6), ramp: C.fume, seed: 530 + q + f, dry: .5, headBias: .2, light: [-.6, -.8] }); }
    for (let q = 0; q < 9; q++) { const rr = rng(560 + q); const a = rr() * TAU; const x = cx + Math.cos(a) * R * .98; const y = gy + Math.sin(a) * ry * .98; const h = 8 + rr() * 10; for (let k = 0; k < h; k++) tone(s, f, C.leaf, x + Math.sin(k / h * 2 + ph * TAU + q) * 1.2 * k / h, y - k, .35 + k / h * .3); disc(s, f, C.bark, Math.round(x), Math.round(y - h), 1, 2, .2); }
  });
}
function spring() {
  return pool('spring', C.water, (s, f, ph, cx, gy, R, ry) => {
    for (let r = 0; r < 3; r++) { const k = (ph + r / 3) % 1; for (let i = 0; i < 70; i++) { const a = i / 70 * TAU; if (B.dither(i, r * 3 + f, k * .8)) continue; tone(s, f, C.water, cx + Math.cos(a) * R * k * .9, gy + Math.sin(a) * ry * k * .9, .85); } }
    for (let q = 0; q < 4; q++) { const rr = rng(600 + q); const a = rr() * TAU; const x = Math.round(cx + Math.cos(a) * R * .6); const y = Math.round(gy + Math.sin(a) * ry * .55); disc(s, f, C.leaf, x, y, 4, .45, .1); if (q % 2 === 0) flower(s, f, x + 1, y - 1, 2, .9, C.petal, q); }
    const hgt = 14 + Math.sin(ph * TAU) * 3; for (let k = 0; k < hgt; k++) { const w = Math.max(1, Math.round(2 * (1 - k / hgt))); for (let j = -w; j <= w; j++) tone(s, f, C.water, cx + j, gy - 2 - k, .7 + (j < 0 ? .2 : 0)); }
    for (let q = 0; q < 8; q++) { const rr = rng(620 + q); const t = (ph + rr()) % 1; const a = -Math.PI / 2 + (rr() - .5) * 2; tone(s, f, C.water, cx + Math.cos(a) * t * 16, gy - 2 - hgt + Math.sin(a) * t * 12 + t * t * 18, .95); }
  });
}
function seedBurst() {
  const W = 48; const H = 60; const N = 7; const s = new Sheet('seed_burst', W, H, N, { anchor: 'base', baseOffset: 2 }); const cx = 24; const gy = 58;
  for (let f = 0; f < N; f++) {
    if (f <= 1) { disc(s, f, C.bark, cx, gy - 4, 4, .8, .1); for (let k = 0; k < 3; k++) tone(s, f, B.pal({ r: ['#c2380f', '#ff9f2a', '#ffd04a'] }).r, cx - 1 + k, gy - 5 + (k % 2), .5 + f * .4); }
    else { const k = (f - 2) / 4; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .38; F.flame(s, f, cx + Math.cos(a) * 3, gy - 2, (18 + (i === 2 ? 12 : 0)) * (1 - Math.abs(k - .35)) + 4, 8, { dir: a, lean: (i - 2) * 2, ph: f + i, cool: k * .35 }); } if (f >= 4) F.smokePuff(s, f, cx + (f - 4) * 3, gy - 34 - (f - 4) * 6, 4 + (f - 4) * 2, 700 + f, (f - 4) * .25); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function pollen() {
  const W = 240; const H = 84; const N = 8; const s = new Sheet('pollen_cloud', W, H, N, { anchor: 'center' }); const cy = 42;
  for (let f = 0; f < N; f++) {
    const ph = f / N;
    for (let q = 0; q < 26; q++) { const rr = rng(800 + q); const u = (ph + rr()) % 1; const x = 12 + u * 220; const spread = (rr() - .5) * (10 + u * 60); const r = Math.round(2 + u * 4 + rr() * 2); const m = B.noisyBlob(x, cy + spread, r, 810 + q, .3, .8); B.volume(s, f, x - r * 1.6, cy + spread - r * 1.4, x + r * 1.6, cy + spread + r * 1.4, (xx, yy) => m(xx, yy) && !B.dither(xx, yy, u > .8 ? (u - .8) * 3 : 0), C.pollen, { reach: 3 }); }
    for (let q = 0; q < 30; q++) { const rr = rng(860 + q); const u = (ph * 1.3 + rr()) % 1; const x = 10 + u * 226; const y = cy + (rr() - .5) * (8 + u * 70) + Math.sin(ph * TAU + q) * 2; tone(s, f, q % 4 ? C.pollen : C.leaf, x, y, .9); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function worldTree() {
  const W = 200; const H = 300; const N = 8; const s = new Sheet('world_tree', W, H, N, { anchor: 'base', baseOffset: 4 }); const cx = 100; const gy = 294;
  for (let f = 0; f < N; f++) {
    const g = f < 5 ? (f + 1) / 5 : 1; const sway = f >= 5 ? Math.sin((f - 5) / 3 * TAU) * 2 : 0; const Ht = 190 * g;
    // Roots spreading.
    for (let i = 0; i < 6; i++) { const side = i < 3 ? -1 : 1; const k = (i % 3) + 1; B.stroke(s, f, [[cx + side * 6, gy - 6], [cx + side * 14 * k, gy - 2], [cx + side * 24 * k * g, gy + 1]], { max: 7 - k, swell: .4, ramp: C.bark, seed: 900 + i, dry: 0, headBias: .05 }); }
    // Trunk: twisting, wide at the foot, bark streaks.
    const half = (y) => { const u = (gy - y) / Math.max(1, Ht); return 20 - 10 * u + Math.sin(u * 7) * 2; };
    const tx = (y) => cx + Math.sin((gy - y) / 40) * 4 * g + sway * (gy - y) / 190;
    B.streakFill(s, f, cx - 30, gy - Ht, cx + 30, gy, (x, y) => { if (y < gy - Ht || y > gy) return null; const c = tx(y); const h = half(y); const v = (x - c) / h; if (Math.abs(v) > 1) return null; return clamp01(.62 - v * .45 - (Math.abs(v) > .85 ? .2 : 0)); }, C.bark, { seed: 920 + f, minLen: 2, maxLen: 6, gap: 1 });
    // Two branch limbs (where the branch platforms stand).
    if (g > .5) for (const [side, hh] of [[-1, 74], [1, 118]]) { const y0 = gy - hh; B.stroke(s, f, [[tx(y0), y0 + 8], [tx(y0) + side * 22, y0 + 2], [tx(y0) + side * 46 * g, y0]], { max: 8, swell: .5, ramp: C.bark, seed: 940 + side, dry: 0, headBias: .05 }); }
    // Canopy: leaf masses with volume shading and leaf texture, swelling with growth.
    if (g > .35) {
      const cg = clamp01((g - .35) / .65);
      const masses = [[-44, -6, 44], [46, 4, 42], [0, -30, 56], [-22, -50, 34], [26, -46, 32]];
      for (const [dx, dy, r] of masses) { const mx = cx + dx * cg + sway * 1.5; const my = gy - Ht + dy * cg; const rr = r * cg; if (rr < 3) continue; const m = B.noisyBlob(mx, my, rr, 960 + dx, .16, .62); B.volume(s, f, mx - rr * 1.3, my - rr, mx + rr * 1.3, my + rr, m, C.leaf, { reach: Math.max(4, rr * .5) }); }
      const lr = rng(980 + f); for (let q = 0; q < 70 * cg; q++) { const x = cx + (lr() - .5) * 170 * cg; const y = gy - Ht - 60 * cg + lr() * 80 * cg; if (s.alpha(f, x, y) > 0) { tone(s, f, C.leaf, x, y, .85); tone(s, f, C.leaf, x + 1, y + 1, .4); } }
      if (f >= 5) for (let q = 0; q < 5; q++) { const fr = rng(990 + q); const x = cx + (fr() - .5) * 120; const y = gy - Ht - 20 + fr() * 50; if (s.alpha(f, x, y) > 0) disc(s, f, C.petal, Math.round(x), Math.round(y), 2, 1, .1); }
    }
    for (let q = 0; q < 6; q++) { const rr = rng(1000 + q); const life = ((f / N) + rr()) % 1; tone(s, f, C.leaf, cx + (rr() - .5) * 140, gy - Ht + life * 160, .95); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
module.exports = { natureSheets: () => [ring('bloom_ring', C.petal, false), ring('bless_ring', C.gold, true), bramble(), swamp(), spring(), seedBurst(), pollen(), worldTree()] };
