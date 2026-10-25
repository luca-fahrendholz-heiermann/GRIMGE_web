// GRIMGE — EARTH, hand-drawn quality (vfx_brush.cjs; authored at final density, 1 px = 1 world px).
//   rock_spike_v0..v3  7 frames, 44×84 (base): a faceted rock spire breaking out of the ground (0-2: clods and
//                      dust kick up), standing (3), crumbling into chunks and dust (4-6). Heights 48/56/64/72.
//   rock_burst         8 frames, 64×72 (base): an earth eruption — slabs and chunks thrown up, a dust plume.
//   quake_ring         8 frames, 260×84 (base): a stomp quake — ground slabs heaving up in a ring, cracks
//                      racing out, a rolling dust ring.
//   magma_crack        8-frame loop, 168×44 (base): a glowing fissure — broken rock lips, bubbling lava, flames
//                      and embers rising.
//   sand_wall          8-frame loop, 240×120 (base): a ring of whirling sand round the caster — sand sweeps with
//                      grain texture, pebbles carried round, a dust skirt.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = B.pal({
  rock: ['#14100e', '#2a231f', '#433933', '#5f5249', '#7f6f62', '#a3907f', '#c7b5a1', '#e9ddcc'],
  dust: ['#5a4632', '#806650', '#a8906f', '#cdb894', '#e6d8b8'],
  sand: ['#6b4e2e', '#94703f', '#b99358', '#d8b878', '#efdcab'],
  lava: ['#3d0d05', '#8a1e08', '#d1400c', '#ff7a14', '#ffb52e', '#ffe680', '#ffffff'],
  out: '#140c08'
});
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(Math.round(x), Math.round(y), fv - lo) ? 1 : 0))]); };
const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
// A rock shard: jagged silhouette from base (x, y) up to height h, base width w. The ridge from the tip to a
// point left of the base centre splits a lit left face from a shaded right face; strata, chips, rim light.
function rockShard(s, f, x, y, w, h, seed, { lean = 0, flatTop = 0 } = {}) {
  // Chiselled stone: an angular silhouette (few, strong jags) cut into three flat facets by two ridges from the
  // tip — lit left face, mid face, shadowed right face — flat tones (dither only on the ridge seams), broken
  // strata, a bright lit edge and a dark shadow rim.
  if (h < 2) return;
  const r = rng(seed); const tipX = x + lean; const left = []; const right = []; const n = 4;
  for (let i = 0; i <= n; i++) { const u = i / n; const half = (w / 2) * Math.pow(1 - u, .8) + (u === 1 ? flatTop : 0); left.push([x + (tipX - x) * u - half - (i > 0 && i < n ? r() * w * .22 : 0), y - h * u + (i > 0 && i < n ? (r() - .5) * h * .08 : 0)]); right.push([x + (tipX - x) * u + half + (i > 0 && i < n ? r() * w * .18 : 0), y - h * u + (i > 0 && i < n ? (r() - .5) * h * .08 : 0)]); }
  const poly = [...left, ...right.reverse()];
  const r1 = x - w * .2; const r2 = x + w * .18;
  for (let yy = Math.floor(y - h - 1); yy <= y; yy++) for (let xx = Math.floor(x - w); xx <= x + w + Math.abs(lean); xx++) {
    if (!inPoly(poly, xx + .5, yy + .5)) continue;
    const u = (y - yy) / h; const k1 = r1 + (tipX - r1) * u; const k2 = r2 + (tipX - r2) * u;
    let v = xx < k1 ? .74 : xx < k2 ? .5 : .27;
    const seam = Math.abs(xx - k1) < .7 || Math.abs(xx - k2) < .7;
    if (seam) v += B.dither(xx, yy, .5) ? .08 : -.08;
    if (!inPoly(poly, xx - .5, yy + .5) && xx < k1) v = .9;               // lit edge
    if (!inPoly(poly, xx + 1.5, yy + .5)) v = .14;                          // shadow rim
    if ((Math.round(yy + seed * 3) % 9 === 0) && u < .85 && ((xx * 7 + yy) % 11) < 7) v -= .16; // broken strata
    s.set(f, xx, yy, C.rock[Math.max(0, Math.min(7, Math.round(v * 7)))]);
  }
  for (let k = 0; k < 3; k++) { const u = .2 + r() * .55; const yy = y - h * u; const xr = x + (tipX - x) * u + (w / 2) * Math.pow(1 - u, .8) - 1; s.set(f, xr, yy, C.rock[0]); s.set(f, xr - 1, yy + 1, C.rock[1]); }
}
function dustPuff(s, f, cx, cy, r, seed, thin = 0, ramp = C.dust) { const m = B.noisyBlob(cx, cy, r, seed, .25, .8); B.volume(s, f, cx - r * 1.6, cy - r * 1.4, cx + r * 1.6, cy + r * 1.4, (x, y) => m(x, y) && !(thin > 0 && B.dither(x, y, thin)), ramp, { reach: Math.max(3, r * .6) }); }
function chunk(s, f, x, y, sz, seed) { rockShard(s, f, x, y + sz / 2, sz, sz, seed, { lean: (seed % 3) - 1, flatTop: sz * .3 }); }

function spike(i) {
  const H0 = [48, 56, 64, 72][i]; const W = 44; const Hh = 84; const s = new Sheet(`rock_spike_v${i}`, W, Hh, 7, { anchor: 'base', baseOffset: 2 }); const x = 22; const gy = 82;
  for (let f = 0; f < 7; f++) {
    const rise = f < 3 ? (f + 1) / 3 : 1; const crumble = f > 3 ? (f - 3) / 3 : 0; const h = H0 * rise * (1 - crumble * .6);
    if (f >= 4) for (let q = 0; q < 6; q++) { const rq = rng(30 + q); const side = q % 2 ? 1 : -1; const u = crumble; chunk(s, f, x + side * (6 + q * 2 + u * 10), gy - H0 * (.7 - q * .1) + u * u * H0 * .8, 4 + (q % 3), 40 + q); if (rq() < .5) dustPuff(s, f, x + side * (8 + u * 12), gy - 6 - q * 4 * (1 - u), 4 + u * 4, 60 + q + f, u * .5); }
    if (h > 2) { rockShard(s, f, x, gy, 18 + i * 1.5, h, 100 + i * 7, { lean: (i % 2 ? 2 : -2) }); rockShard(s, f, x - 8, gy, 9, h * .45, 110 + i, { lean: -3 }); rockShard(s, f, x + 8, gy, 8, h * .35, 120 + i, { lean: 3 }); }
    // Clods pushed up at the foot, dust kicked on emerge.
    for (let q = 0; q < 5; q++) { const rq = rng(140 + q); const side = q % 2 ? 1 : -1; chunk(s, f, x + side * (9 + q * 2), gy - 1 - (f < 3 ? (2 - f) * 3 * rq() : 0), 3 + (q % 2), 150 + q); }
    if (f < 3) for (let q = 0; q < 3; q++) dustPuff(s, f, x + (q - 1) * 12, gy - 4 - f * 3, 4 + f * 2, 170 + q + f, f * .25);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function burst() {
  const W = 64; const H = 72; const N = 8; const s = new Sheet('rock_burst', W, H, N, { anchor: 'base', baseOffset: 2 }); const x = 32; const gy = 70;
  for (let f = 0; f < N; f++) {
    const k = f / (N - 1);
    for (let q = 0; q < 4; q++) dustPuff(s, f, x + (q - 1.5) * 10 * (1 + k), gy - 8 - k * 26 - (q % 2) * 6, 6 + k * 8, 200 + q + f, f > 5 ? (f - 5) * .3 : 0);
    if (f <= 3) for (let q = 0; q < 3; q++) rockShard(s, f, x + (q - 1) * 9, gy, 10, (14 + q * 4) * (1 - f / 4) * (f === 0 ? .6 : 1), 220 + q, { lean: (q - 1) * 6 });
    for (let q = 0; q < 8; q++) { const rq = rng(240 + q); const a = -Math.PI / 2 + (rq() - .5) * 2.2; const sp = 30 + rq() * 30; const t = k * 1.2; chunk(s, f, x + Math.cos(a) * sp * t, gy - 6 + Math.sin(a) * sp * t * 1.3 + 40 * t * t, 3 + (q % 3), 250 + q); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function quake() {
  const W = 260; const H = 84; const N = 8; const s = new Sheet('quake_ring', W, H, N, { anchor: 'base', baseOffset: 4 }); const cx = 130; const gy = 76;
  for (let f = 0; f < N; f++) {
    const k = f / (N - 1); const R = 20 + k * 100; const ry = R * .28;
    // Cracks racing out over the ground.
    for (let c = 0; c < 8; c++) { const rr = rng(300 + c); let a = c / 8 * TAU + rr() * .4; let px = cx; let py = gy; for (let t = 0; t < R * .95; t++) { a += (rr() - .5) * .3; px += Math.cos(a); py += Math.sin(a) * .28; s.set(f, px, py, C.rock[0]); if (t % 5 === 0) s.set(f, px, py + 1, C.rock[2]); } }
    // Dust ring rolling out behind the slabs.
    for (let q = 0; q < 12; q++) { const a = q / 12 * TAU; dustPuff(s, f, cx + Math.cos(a) * R * 1.05, gy - 6 + Math.sin(a) * ry, 5 + k * 6, 320 + q + f, f > 5 ? (f - 5) * .35 : 0); }
    // Slabs heaving up along the ring (tallest at the front of the wave, sinking behind it).
    const slabs = []; const n = Math.round(10 + k * 10);
    for (let q = 0; q < n; q++) { const rq = rng(340 + q); const a = q / n * TAU + rq() * .2; slabs.push({ x: cx + Math.cos(a) * R, y: gy + Math.sin(a) * ry, h: (10 + rq() * 10) * (1 - k * .5), w: 10 + rq() * 6, seed: 350 + q, lean: Math.cos(a) * 4 }); }
    slabs.sort((p, q) => p.y - q.y);
    for (const sl of slabs) rockShard(s, f, sl.x, sl.y, sl.w, sl.h, sl.seed, { lean: sl.lean, flatTop: 3 });
    B.selOutline(s, f, C.out);
  }
  return s;
}
function magma() {
  const W = 168; const H = 44; const N = 8; const s = new Sheet('magma_crack', W, H, N, { anchor: 'base', baseOffset: 4 }); const gy = 36;
  for (let f = 0; f < N; f++) {
    const ph = f / N;
    // The fissure: a jagged lava channel (glowing, brighter in the middle) with dark broken lips.
    const yAt = (x) => gy + Math.sin(x / 13) * 2 + Math.sin(x / 5.3) * 1;
    const half = (x) => 3 + Math.sin(x / 17 + 1) * 1.5 + (x < 12 || x > W - 12 ? -2 : 0);
    for (let x = 6; x < W - 6; x++) { const c = yAt(x); const h = half(x); for (let y = Math.floor(c - h - 2); y <= c + h + 2; y++) { const d = Math.abs(y - c) / (h + 2); if (d > 1) continue; if (d > .7) tone(s, f, C.rock, x, y, .3 + (y < c ? .25 : 0)); else tone(s, f, C.lava, x, y, .9 - d * .8 + Math.sin(x / 4 + ph * TAU * 2) * .08); } }
    // Bubbles swelling and popping, flames and embers rising out of the channel.
    for (let q = 0; q < 6; q++) { const rq = rng(400 + q); const x = 12 + rq() * (W - 24); const life = (ph + rq()) % 1; const r = 1 + life * 3; if (life < .8) for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) tone(s, f, C.lava, x + xx, yAt(x) - r * .6 + yy, .75 + (yy < 0 ? .2 : 0)); }
    for (let q = 0; q < 7; q++) { const rq = rng(420 + q); const x = 14 + rq() * (W - 28); const hgt = 6 + ((q + f) % 3) * 4 + rq() * 4; for (let yy = 0; yy < hgt; yy++) { const u = yy / hgt; const hw = Math.max(.5, 3 * (1 - u)); for (let xx = -hw; xx <= hw; xx++) tone(s, f, C.lava, x + xx + Math.sin(u * 3 + ph * TAU + q) * u * 2, yAt(x) - 2 - yy, (1 - Math.abs(xx) / (hw + .5)) * (1 - u * .7) + .2); } }
    for (let q = 0; q < 8; q++) { const rq = rng(440 + q); const life = (ph + rq()) % 1; s.set(f, 10 + rq() * (W - 20) + life * 4, gy - 4 - life * 26, C.lava[life < .5 ? 5 : 4]); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function sandWall() {
  // Two layers so the caster stands INSIDE the ring: sand_wall_back (the tall streaked wall arc and the sweeps
  // behind) is drawn behind the caster, sand_wall_front (low sweeps, pebbles and dust in front) before.
  const W = 240; const H = 120; const N = 8; const cx = 120; const gy = 110; const R = 104; const ry = 30;
  const back = new Sheet('sand_wall_back', W, H, N, { anchor: 'base', baseOffset: 6 });
  const front = new Sheet('sand_wall_front', W, H, N, { anchor: 'base', baseOffset: 6 });
  for (let f = 0; f < N; f++) {
    const ph = f / N;
    B.streakFill(back, f, cx - R - 8, gy - 100, cx + R + 8, gy, (x, y) => { const c = (x - cx) / R; if (Math.abs(c) > 1) return null; const b = gy - Math.sqrt(1 - c * c) * ry; const top = b - 62 * (.75 + .25 * Math.sin(c * 6 + ph * TAU)); if (y < top || y > b) return null; return clamp01(.35 + (y - top) / (b - top) * -.15 + (1 - Math.abs(c)) * .2); }, C.sand, { seed: 500 + f, minLen: 4, maxLen: 16, gap: 3, shift: f * 6 });
    for (let i = 0; i < 9; i++) { const rr = rng(520 + i); const hgt = rr() * 56; const a0 = rr() * TAU + ph * TAU * (1 + i % 2); const len = 1.2 + rr(); const isFront = Math.sin(a0 + len / 2) > 0; if (isFront && hgt > 20) continue; B.crescent(isFront ? front : back, f, cx, gy - hgt, R * (.92 + rr() * .1), ry * (.92 + rr() * .1), a0, a0 + len, { max: 4 + rr() * 2, ramp: C.sand, seed: 530 + i + f, dry: .45 }); }
    for (let q = 0; q < 10; q++) { const rq = rng(560 + q); const a2 = rq() * TAU + ph * TAU * 2; const hgt = rq() * 40; chunk(Math.sin(a2) > 0 ? front : back, f, cx + Math.cos(a2) * R, gy - hgt + Math.sin(a2) * ry, 3 + (q % 2), 570 + q); }
    for (let q = 0; q < 8; q++) { const a2 = q / 8 * TAU + ph * TAU; dustPuff(Math.sin(a2) > 0 ? front : back, f, cx + Math.cos(a2) * R, gy - 4 + Math.sin(a2) * ry, 6, 590 + q + f, 0, C.sand); }
    B.selOutline(back, f, C.out); B.selOutline(front, f, C.out);
  }
  return [back, front];
}
module.exports = { earthSheets: () => [spike(0), spike(1), spike(2), spike(3), burst(), quake(), magma(), ...sandWall()] };
