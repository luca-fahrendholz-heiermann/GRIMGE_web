// GRIMGE — FIRE, hand-drawn quality (vfx_brush.cjs; authored at final density, 1 px = 1 world px).
// Own designs; LF2 fire sheets and the kiddolink beams were studied for technique only.
//   fire_ball       8-frame loop, 72×44 (faces right): a lumpy white-hot head, flame strands streaming back
//                   and rising, detached flecks, smoke at the end of the tail.
//   fire_explosion  10 frames, 104×104: flash star → lumpy fireball → flames thrown out → the top turns to smoke
//                   → a billowing smoke cloud with embers → thinning wisps.
//   fire_jet        6-frame loop, 48×40, TILEABLE along x (the inferno beam body): a burning band, pointed
//                   tongues curling up-back, hot streaks flowing forward 8 px / frame (seamless).
//   fire_jet_root   6 frames, 32×40: flames bursting out of the hand.
//   fire_jet_head   6 frames, 44×52: the beam's churning, splashing front.
//   fire_whirl      12-frame loop, 112×150: a burning funnel — flame streak core, flame-hook sweeps with
//                   licking tips, a smoke crown, a ring of flames at the foot, embers.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;

const C = B.pal({
  fire: ['#3d0d05', '#7a1f0a', '#c2380f', '#f06a14', '#ff9f2a', '#ffd04a', '#fff3b8', '#ffffff'],
  hot: ['#f06a14', '#ff9f2a', '#ffd04a', '#fff3b8', '#ffffff'],
  strand: ['#5a1407', '#a32c0c', '#e5551a', '#ff9a28', '#ffd04a'],
  smoke: ['#1f1916', '#332a26', '#4a3e38', '#66574f', '#86766c'],
  out: '#2a0803'
});
const fireTone = (s, f, x, y, v) => { const fv = clamp01(v) * (C.fire.length - 1); const lo = Math.floor(fv); s.set(f, x, y, C.fire[Math.min(C.fire.length - 1, lo + (B.dither(Math.round(x), Math.round(y), fv - lo) ? 1 : 0))]); };
// A fire body: lumpy blob filled hot at a (front-biased) heart, cooling toward the rim.
function fireBody(s, f, cx, cy, r, seed, { heartX = 0, heartY = 0, rough = .2, squash = 1, cool = 0 } = {}) {
  const m = B.noisyBlob(cx, cy, r, seed, rough, squash);
  for (let y = Math.floor(cy - r * 1.5); y <= cy + r * 1.5; y++) for (let x = Math.floor(cx - r * 1.5); x <= cx + r * 1.5; x++) {
    if (!m(x, y)) continue; const d = Math.hypot(x - (cx + heartX), (y - (cy + heartY)) / squash) / (r * 1.15);
    fireTone(s, f, x, y, 1 - d * .95 - cool);
  }
  return m;
}
// A flame: a teardrop with a wide base that S-curves and tapers to a point (not a stroke). Base centre (x, y),
// height h, base width w, dir = growth direction angle (−π/2 = up), lean bends the upper part sideways,
// ph = flicker phase. Hot white-yellow heart low in the middle, orange body, red edges and tip.
function flame(s, f, x, y, h, w, { dir = -Math.PI / 2, lean = 0, ph = 0, cool = 0 } = {}) {
  const dx = Math.cos(dir); const dy = Math.sin(dir); const nx = -dy; const ny = dx; const n = Math.max(4, Math.round(h * 1.3));
  for (let i = 0; i <= n; i++) {
    const u = i / n; const half = (w / 2) * Math.pow(1 - u, .75) * (1 + .3 * Math.sin(u * Math.PI)) + .3;
    const off = lean * u * u + Math.sin(u * 3.2 + ph) * w * .22 * u;
    const cx = x + dx * u * h + nx * off; const cy = y + dy * u * h + ny * off;
    const steps = Math.max(1, Math.round(half * 2 * 1.3));
    for (let k = 0; k <= steps; k++) { const v = k / steps * 2 - 1; const heat = (1 - Math.abs(v)) * (1 - u * .85) * 1.05 + .18 - cool; fireTone(s, f, cx + nx * v * half, cy + ny * v * half, heat); }
  }
}
// A cauliflower fire body: several overlapping lumpy blobs, each hot in its own heart, the whole cooling outward.
function fireMass(s, f, cx, cy, r, seed, { cool = 0, heartY = -2, lobes = 6 } = {}) {
  const rr = rng(seed); const blobs = [[cx, cy, r * .8]];
  for (let i = 0; i < lobes; i++) { const a = rr() * TAU; const d = r * (.35 + rr() * .35); blobs.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * .85, r * (.4 + rr() * .3)]); }
  const tests = blobs.map(([x, y, rad], i) => B.noisyBlob(x, y, rad, seed + i * 3, .2, .95));
  for (let y = Math.floor(cy - r * 1.6); y <= cy + r * 1.6; y++) for (let x = Math.floor(cx - r * 1.6); x <= cx + r * 1.6; x++) {
    let best = -1; tests.forEach((t, i) => { if (!t(x, y)) return; const [bx, by, br] = blobs[i]; const local = 1 - Math.hypot(x - bx, y - by) / (br * 1.2); best = Math.max(best, local * .45); });
    if (best < 0) continue; const global = 1 - Math.hypot(x - cx, (y - cy - heartY)) / (r * 1.25);
    fireTone(s, f, x, y, global * .8 + best + .05 - cool);
  }
}
function smokePuff(s, f, cx, cy, r, seed, thin = 0) {
  const m = B.noisyBlob(cx, cy, r, seed, .25, .85);
  B.volume(s, f, cx - r * 1.6, cy - r * 1.4, cx + r * 1.6, cy + r * 1.4, (x, y) => m(x, y) && !(thin > 0 && B.dither(x, y, thin)), C.smoke, { reach: Math.max(3, r * .6) });
}
const ember = (s, f, x, y, big) => { s.set(f, x, y, C.fire[6]); if (big) { s.set(f, x + 1, y, C.fire[5]); s.set(f, x, y + 1, C.fire[4]); } };

function ball() {
  const W = 72; const H = 44; const N = 8; const s = new Sheet('fire_ball', W, H, N, { anchor: 'center' });
  const hx = 54; const hy = 23;
  for (let f = 0; f < N; f++) {
    const ph = f / N;
    // Smoke at the end of the tail (drawn first, furthest back).
    for (let q = 0; q < 3; q++) { const rq = rng(30 + q); const life = (ph + rq()) % 1; smokePuff(s, f, 10 - life * 6 + q * 5, hy - 4 - life * 6 + (rq() - .5) * 8, 2.5 + life * 2.5, 40 + q + f, life > .7 ? (life - .7) * 2 : 0); }
    // Comet body: one tapering flame lying backward (wide at the head, rising tip) under the strands.
    flame(s, f, hx - 4, hy, 40, 20, { dir: Math.PI + .12, lean: -6, ph: ph * TAU, cool: .05 });
    // Flame tongues trailing off the comet's upper and lower edge, flickering out of phase.
    flame(s, f, hx - 10, hy - 7, 24 + Math.sin(ph * TAU) * 3, 9, { dir: Math.PI + .35, lean: -4, ph: ph * TAU * 2, cool: .12 });
    flame(s, f, hx - 10, hy + 5, 20 + Math.cos(ph * TAU) * 3, 8, { dir: Math.PI - .1, lean: -5, ph: ph * TAU * 2 + 2, cool: .16 });
    // Detached flecks drifting off the tail.
    for (let q = 0; q < 6; q++) { const rq = rng(200 + q); const life = (ph * 2 + rq()) % 1; const x = hx - 26 - life * 30 - rq() * 8; const y = hy + (rq() - .5) * 14 - life * 8; const sz = life < .5 ? 2 : 1; for (let yy = 0; yy < sz + 1; yy++) for (let xx = 0; xx < sz; xx++) s.set(f, x + xx, y - yy, C.strand[yy === 0 ? 2 : 3]); }
    // The head: a lumpy white-hot ball, heart pushed to the front.
    // Licks off the top of the head, bending back (real flame shapes).
    for (let q = 0; q < 3; q++) { const a = -2.0 + q * .5; flame(s, f, hx + Math.cos(a) * 7, hy + Math.sin(a) * 7, 9 + ((q + f) % 3) * 2, 6, { dir: -Math.PI / 2 - .9, lean: -3, ph: ph * TAU * 2 + q, cool: .1 }); }
    fireMass(s, f, hx, hy, 11 + Math.sin(ph * TAU) * .8, 300 + f, { heartY: -1, lobes: 5 });
    B.selOutline(s, f, C.out);
  }
  return s;
}

function explosion() {
  const W = 104; const H = 104; const N = 10; const s = new Sheet('fire_explosion', W, H, N, { anchor: 'center' });
  const cx = 52; const cy = 56;
  for (let f = 0; f < N; f++) {
    const r = rng(400 + f);
    if (f === 0) {
      // Flash: a white star with long thin rays and a hot disc.
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + .2; const l = i % 2 ? 22 : 36; B.stroke(s, f, [[cx, cy], [cx + Math.cos(a) * l * .5, cy + Math.sin(a) * l * .5], [cx + Math.cos(a) * l, cy + Math.sin(a) * l]], { max: i % 2 ? 3 : 4, ramp: C.hot, seed: 410 + i, dry: .2, headBias: .2 }); }
      fireBody(s, f, cx, cy, 9, 420, { rough: .1 });
      B.selOutline(s, f, C.out); continue;
    }
    const grow = Math.min(1, f / 4); const smokeK = clamp01((f - 3) / 5); const R = 14 + grow * 22;
    // Smoke rising over the top (from frame 3): stacked puffs, growing and thinning.
    if (f >= 3) for (let q = 0; q < 10; q++) { const rq = rng(500 + q); const a = -Math.PI / 2 + (rq() - .5) * 2.4; const d = R * (.15 + rq() * .45) + smokeK * 8; smokePuff(s, f, cx + Math.cos(a) * d, cy - R * .1 + Math.sin(a) * d * .8 - smokeK * 22, 7 + rq() * 6 + smokeK * 7, 510 + q, f >= 8 ? (f - 7) * .3 : 0); }
    // The fireball: shrinking and cooling under the smoke after frame 4.
    const fireR = f <= 4 ? R : R * (1 - (f - 4) / 6.5);
    // Flames thrown out first (behind the mass): real flame shapes along the rim, pointing out and bending up.
    if (f <= 5 && fireR > 3) for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + r() * .5; const up = Math.sin(a) > .3 ? 0 : 1; flame(s, f, cx + Math.cos(a) * fireR * .7, cy + Math.sin(a) * fireR * .6, fireR * (.55 + r() * .4) * (1 - f / 9), fireR * .45, { dir: a - up * Math.sign(Math.cos(a) || 1) * .5, lean: -4 * Math.sign(Math.cos(a) || 1), ph: f + i, cool: .08 + f * .03 }); }
    if (fireR > 3) fireMass(s, f, cx, cy + (f > 4 ? (f - 4) * 2 : 0), fireR, 600 + f * 3, { heartY: -2, cool: f > 4 ? (f - 4) * .1 : 0, lobes: 7 });
    // Embers flying (frames 3-9).
    if (f >= 3) for (let q = 0; q < 12; q++) { const rq = rng(800 + q); const a = rq() * TAU; const d = R * .6 + (f - 3) * (5 + rq() * 6); ember(s, f, cx + Math.cos(a) * d, cy + Math.sin(a) * d * .8 - (f - 3) * 2 + (f - 3) ** 2 * .6, q % 3 === 0 && f < 7); }
    B.selOutline(s, f, C.out);
  }
  return s;
}

// Tileable jet: every feature is drawn at x, x − 48 and x + 48 so the tile wraps seamlessly.
function jetTile() {
  const W = 48; const H = 40; const N = 6; const s = new Sheet('fire_jet', W, H, N, { anchor: 'center' });
  const cy = 22;
  for (let f = 0; f < N; f++) {
    const off = f * 8; // flow 8 px per frame → 6 frames = one tile
    const wrap = (fn) => { for (const d of [-W, 0, W]) fn(d); };
    // Band: hot core band with a rough lower edge and a body that cools outward.
    for (let x = 0; x < W; x++) {
      const k = (x - off + W * 4) % W; const top = cy - 7 - Math.round(Math.sin(k / W * TAU * 2) * 1.5); const bot = cy + 6 + Math.round(Math.sin(k / W * TAU * 3 + 1) * 1.5);
      for (let y = top; y <= bot; y++) { const v = 1 - Math.abs(y - cy + 1) / 8; fireTone(s, f, x, y, .35 + v * .62); }
    }
    // Tongues: pointed strokes curling up and back off the top edge (4 per tile).
    for (let i = 0; i < 6; i++) {
      const rr = rng(900 + i); const base = (i * 8 + off + rr() * 5) % W; const h = (i % 2 ? 6 : 10) + rr() * 9; const w = 5 + rr() * 4;
      wrap((d) => { if (base + d < -12 || base + d > W + 12) return; flame(s, f, base + d, cy - 4, h, w, { dir: -Math.PI / 2 - .55, lean: -3 - rr() * 3, ph: i * 1.7, cool: i % 2 ? .12 : 0 }); });
    }
    // Hot streaks flowing forward inside the band.
    for (let i = 0; i < 5; i++) {
      const rr = rng(950 + i); const base = (i * 9.6 + off + rr() * 3) % W; const y = cy - 3 + Math.round(rr() * 5); const len = 6 + Math.round(rr() * 8);
      wrap((d) => { for (let x = base + d; x < base + d + len; x++) { if (x < 0 || x >= W) continue; s.set(f, x, y, C.fire[7]); if (x < base + d + len - 2) s.set(f, x, y + 1, C.fire[6]); } });
    }
    // Flecks lifting off the top.
    for (let i = 0; i < 3; i++) { const rr = rng(980 + i); const base = (i * 16 + off * 1.5 + rr() * 6) % W; const y = cy - 14 - rr() * 8; wrap((d) => { const x = base + d; if (x >= 0 && x < W) { s.set(f, x, y, C.strand[3]); s.set(f, x, y + 1, C.strand[2]); } }); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function jetRoot() {
  const W = 32; const H = 40; const N = 6; const s = new Sheet('fire_jet_root', W, H, N, { anchor: 'center' });
  for (let f = 0; f < N; f++) {
    const ph = f / N;
    for (let i = 0; i < 4; i++) { const a = -1.3 + i * .55 + Math.sin(ph * TAU + i) * .2; flame(s, f, 14 + Math.cos(a) * 4, 20 + Math.sin(a) * 4, 9 + ((i + f) % 3) * 3, 6, { dir: a - .3, lean: -2, ph: ph * TAU + i }); }
    fireMass(s, f, 14, 20, 8 + Math.sin(ph * TAU * 2) * .8, 1050 + f, { lobes: 4 });
    B.selOutline(s, f, C.out);
  }
  return s;
}
function jetHead() {
  const W = 44; const H = 52; const N = 6; const s = new Sheet('fire_jet_head', W, H, N, { anchor: 'center' });
  for (let f = 0; f < N; f++) {
    const ph = f / N;
    for (let q = 0; q < 2; q++) smokePuff(s, f, 16 + q * 8, 10 - ((ph + q * .5) % 1) * 6, 3.5 + q, 1100 + q + f, 0);
    for (let i = 0; i < 6; i++) { const a = -1.8 + i * .62 + Math.sin(ph * TAU + i * 1.3) * .25; flame(s, f, 18 + Math.cos(a) * 8, 27 + Math.sin(a) * 8, 11 + ((i + f) % 3) * 4, 9, { dir: a - .35, lean: -4, ph: ph * TAU + i, cool: .05 }); }
    fireMass(s, f, 18, 27, 12 + Math.sin(ph * TAU) * 1, 1150 + f, { heartY: -1, lobes: 6 });
    for (let q = 0; q < 6; q++) { const rq = rng(1170 + q); const life = (ph + rq()) % 1; ember(s, f, 26 + life * 14, 27 + (rq() - .5) * 26 - life * 8, life < .4); }
    B.selOutline(s, f, C.out);
  }
  return s;
}

function whirl() {
  // A column of swirling FLAME (not a cone with vines): a dark-red glowing core, then flames stacked along a
  // spiral that climbs and turns (back flames cooler behind the core's front, front flames hot), leaning with
  // the spin and growing with height; smoke rolls out of the top, flames burn round the foot, embers fly.
  const W = 112; const H = 150; const N = 12; const s = new Sheet('fire_whirl', W, H, N, { anchor: 'base', baseOffset: 2 });
  const cx = 56; const top = 30; const foot = 144;
  for (let f = 0; f < N; f++) {
    const ph = f / N;
    const u = (y) => clamp01((y - top) / (foot - top));
    const sway = (y) => Math.sin(u(y) * 3 + ph * TAU) * 5 * (1 - u(y) * .35);
    const hw = (y) => 4 + 30 * Math.pow(1 - u(y), 1.25);
    // Smoke rolling out of the mouth.
    for (let q = 0; q < 7; q++) { const rq = rng(1310 + q); const life = (ph + rq()) % 1; smokePuff(s, f, cx + sway(top) + (rq() - .5) * 46, top + 4 - life * 24, 6 + rq() * 4 + life * 5, 1320 + q + f, life > .75 ? (life - .75) * 2.5 : 0); }
    // Spiral flames: positions along a helix (3 turns from foot to top), rotating with the loop.
    const flames = [];
    for (let i = 0; i < 72; i++) {
      const v = i / 71; const y = foot - 6 - v * (foot - top - 2); const ang = v * TAU * 3 + ph * TAU + (rng(1600 + i)() - .5) * .5;
      flames.push({ y, ang, v, i });
    }
    const draw = (fl, front) => {
      const r = hw(fl.y); const x = cx + sway(fl.y) + Math.cos(fl.ang) * r * .92; const yy = fl.y + Math.sin(fl.ang) * r * .24;
      const size = 9 + fl.v * 17 + ((fl.i + f) % 3) * 2; const lean = -Math.sin(fl.ang) * 5 - 3;
      flame(s, f, x, yy, size, 8 + fl.v * 10, { dir: -Math.PI / 2 - Math.cos(fl.ang) * .35, lean, ph: ph * TAU * 2 + fl.i, cool: front ? .02 : .3 });
    };
    for (const fl of flames) if (Math.sin(fl.ang) < 0) draw(fl, false);
    // Glowing core between the back and front flames: dark red, hotter toward the middle (no flat cone).
    for (let y = top; y <= foot; y++) for (let x = cx - 36; x <= cx + 36; x++) { const c = cx + sway(y); const w = hw(y) * .8; const v = (x - c) / w; if (Math.abs(v) > 1) continue; fireTone(s, f, x, y, .48 - Math.abs(v) * .3 - (v > 0 ? .06 : 0) + (B.dither(x, y, .3) ? .06 : 0)); }
    B.streakFill(s, f, cx - 36, top, cx + 36, foot, (x, y) => { const c = cx + sway(y); const w = hw(y) * .6; const v = (x - c) / w; return Math.abs(v) > 1 ? null : clamp01(.55 - Math.abs(v) * .5); }, C.hot, { seed: 1400 + f, minLen: 2, maxLen: 8, gap: 7 });
    for (const fl of flames) if (Math.sin(fl.ang) >= 0) draw(fl, true);
    // Flames round the foot and embers.
    for (let q = 0; q < 9; q++) { const a = q / 9 * TAU + ph * TAU; flame(s, f, cx + sway(foot) + Math.cos(a) * 20, foot - 1 + Math.sin(a) * 5, 8 + ((q + f) % 3) * 4, 8, { lean: Math.sin(ph * TAU + q) * 2, ph: ph * TAU * 2 + q, cool: Math.sin(a) < 0 ? .2 : 0 }); }
    for (let q = 0; q < 10; q++) { const rq = rng(1480 + q); const life = (ph + rq()) % 1; const side = q % 2 ? 1 : -1; ember(s, f, cx + side * (hw(top + 40) + 8 + life * 18), top + 20 + rq() * 80 - life * 20, life < .3); }
    B.selOutline(s, f, C.out);
  }
  return s;
}

module.exports = { fireSheets: () => [ball(), explosion(), jetTile(), jetRoot(), jetHead(), whirl()], flame, fireMass, smokePuff, ember };
