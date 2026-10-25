// GRIMGE — WATER & ICE, hand-drawn quality (vfx_brush.cjs; authored at final density, 1 px = 1 world px).
//   ice_ray        6-frame loop, 48×40, TILEABLE (glacial ray body): a faceted crystal bar with seams, ice
//                  needles bristling off both edges, frost mist, glints, cold streaks flowing 8 px / frame.
//   ice_ray_root   6 frames, 32×40: a crystal bloom at the hand.
//   ice_ray_head   6 frames, 48×56: a crystal cluster at the front, shards breaking off, mist.
//   ice_nova       10 frames, 300×84 (base anchored): frost spreading over the ground with cracks, crystals
//                  erupting along the front (frames 0-5), then the crystals shatter into fragments and mist.
//   ice_blizzard   8-frame loop, 128×96 (faces right): a rolling snow storm — streaked body full of snow,
//                  swirling icy sweeps, hail streaking down-forward, tumbling shards, a mist skirt.
//   water_splash   8 frames, 56×56: an impact crown of drops rising and falling, a ripple ring.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;

const C = B.pal({
  ice: ['#0f2c4f', '#1e5a8c', '#3f8fc7', '#7cc4ec', '#bfe9fb', '#effbff', '#ffffff'],
  water: ['#08264a', '#0e4a85', '#1f7fd1', '#3fb0ec', '#8fdcff', '#d6f6ff', '#ffffff'],
  mist: ['#8fb4d6', '#bcd6ee', '#e4f1fb'],
  snow: ['#9db7d6', '#cfe0f2', '#f2f8ff', '#ffffff'],
  out: '#0a1f38', wout: '#061a33'
});
const iceTone = (s, f, x, y, v) => { const fv = clamp01(v) * (C.ice.length - 1); const lo = Math.floor(fv); s.set(f, x, y, C.ice[Math.min(C.ice.length - 1, lo + (B.dither(Math.round(x), Math.round(y), fv - lo) ? 1 : 0))]); };
// A crystal: an elongated hexagonal shard from base (x, y) along angle `dir`, length len, base width w. Two faces
// split on the ridge (the face toward the light from the top left is lit), a bright ridge, a white tip glint.
function crystal(s, f, x, y, len, w, dir, { bright = 0 } = {}) {
  if (len < 2) return;
  const dx = Math.cos(dir); const dy = Math.sin(dir); const nx = -dy; const ny = dx;
  const P = (u, v) => [x + dx * u * len + nx * v * w / 2, y + dy * u * len + ny * v * w / 2];
  const bL = P(0, -1); const sL = P(.72, -.8); const tip = P(1, 0); const sR = P(.72, .8); const bR = P(0, 1); const bM = P(0, 0);
  const litLeft = (-nx * -.6 + -ny * -.8) > 0; // the −normal side faces the light?
  s.poly(f, [bL, sL, tip, bM], C.ice[litLeft ? 4 + bright : 2 + bright]);
  s.poly(f, [bM, tip, sR, bR], C.ice[litLeft ? 2 + bright : 4 + bright]);
  s.line(f, bM[0], bM[1], tip[0], tip[1], C.ice[Math.min(6, 5 + bright)]);
  s.line(f, sL[0], sL[1], tip[0], tip[1], C.ice[litLeft ? 5 : 3]);
  s.set(f, tip[0], tip[1], C.ice[6]);
}
const glint = (s, f, x, y, r) => { for (let k = -r; k <= r; k++) { s.set(f, x + k, y, C.ice[Math.abs(k) === r ? 4 : 6]); s.set(f, x, y + k, C.ice[Math.abs(k) === r ? 4 : 6]); } };
function mistPuff(s, f, cx, cy, r, seed, thin = 0) { const m = B.noisyBlob(cx, cy, r, seed, .3, .7); for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r * 1.4); x <= cx + r * 1.4; x++) { if (!m(x, y) || B.dither(x, y, .45 + thin)) continue; s.set(f, x, y, C.mist[y < cy - r * .3 ? 2 : y < cy + r * .3 ? 1 : 0]); } }

function iceRay() {
  const W = 48; const H = 40; const N = 6; const s = new Sheet('ice_ray', W, H, N, { anchor: 'center' }); const cy = 20;
  for (let f = 0; f < N; f++) {
    const off = f * 8; const wrap = (fn) => { for (const d of [-W, 0, W]) fn(d); };
    // Needles first (behind the bar): crystals bristling up and down at varied angles.
    for (let i = 0; i < 6; i++) { const rr = rng(100 + i); const base = (i * 8 + rr() * 3) % W; const up = i % 2 === 0; const len = (up ? 8 : 6) + rr() * 8; const dir = up ? -Math.PI / 2 - .7 - rr() * .2 : Math.PI / 2 + .7 + rr() * .2; wrap((d) => { const x0 = base + d; if (x0 < -18 || x0 > W + 18) return; crystal(s, f, x0, cy + (up ? -5 : 4), len, 4 + rr() * 2, dir); if (len > 10) crystal(s, f, x0 - 3, cy + (up ? -5 : 4), len * .5, 3, dir + (up ? .35 : -.35)); }); }
    // The crystal bar: lit upper half, darker lower half, ridge line, diagonal facet seams (fixed in place —
    // the ice does not move, the cold flows through it).
    for (let x = 0; x < W; x++) for (let y = cy - 6; y <= cy + 5; y++) { const v = (cy - y) / 6; iceTone(s, f, x, y, .45 + v * .35); }
    for (let x = 0; x < W; x++) { s.set(f, x, cy - 1, C.ice[5]); s.set(f, x, cy - 6, C.ice[5]); s.set(f, x, cy + 5, C.ice[1]); }
    for (let k = 0; k < 4; k++) { const x0 = k * 12 + 3; for (let t = 0; t < 11; t++) { const x = (x0 + Math.round(t * .6)) % W; s.set(f, x, cy - 6 + t, C.ice[t < 5 ? 3 : 1]); } }
    // Cold streaks flowing forward inside the bar.
    for (let i = 0; i < 4; i++) { const rr = rng(200 + i); const base = (i * 12 + off + rr() * 4) % W; const y = cy - 4 + Math.round(rr() * 6); const len = 5 + Math.round(rr() * 7); wrap((d) => { for (let x = base + d; x < base + d + len; x++) if (x >= 0 && x < W) s.set(f, x, y, C.ice[6]); }); }
    // Frost mist above / below, drifting with the flow, and glints twinkling on the needles.
    for (let i = 0; i < 3; i++) { const rr = rng(300 + i); const base = (i * 16 + off * .5 + rr() * 6) % W; wrap((d) => { const x = base + d; if (x > -8 && x < W + 8) mistPuff(s, f, x, cy + (i % 2 ? 12 : -13), 3 + rr() * 2, 310 + i, .1); }); }
    for (let i = 0; i < 2; i++) { const rr = rng(400 + i + f * 7); glint(s, f, Math.round(rr() * (W - 4)) + 2, cy + (rr() < .5 ? -9 : 9), f % 3 === i ? 2 : 1); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function iceRoot() {
  const W = 32; const H = 40; const N = 6; const s = new Sheet('ice_ray_root', W, H, N, { anchor: 'center' });
  for (let f = 0; f < N; f++) { const pulse = Math.sin(f / N * TAU) * 1.5;
    for (let i = 0; i < 6; i++) { const a = -1.4 + i * .56; crystal(s, f, 12, 20, 9 + (i % 2) * 4 + pulse, 5, a); }
    for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) if (xx * xx + yy * yy <= 16) iceTone(s, f, 12 + xx, 20 + yy, .7 - (xx + yy) * .04);
    glint(s, f, 13, 19, 2); B.selOutline(s, f, C.out);
  }
  return s;
}
function iceHead() {
  const W = 48; const H = 56; const N = 6; const s = new Sheet('ice_ray_head', W, H, N, { anchor: 'center' });
  for (let f = 0; f < N; f++) { const ph = f / N;
    mistPuff(s, f, 30 + ph * 8, 14 - ph * 4, 5, 500 + f, ph * .3); mistPuff(s, f, 28 + ph * 6, 44 + ph * 3, 4, 510 + f, ph * .3);
    for (let i = 0; i < 9; i++) { const rr = rng(520 + i); const a = -1.5 + i * .37 + (rr() - .5) * .2; crystal(s, f, 16, 28, 10 + rr() * 10 + ((i + f) % 3) * 2, 6, a, { bright: i % 3 === 0 ? 1 : 0 }); }
    for (let q = 0; q < 5; q++) { const rr = rng(560 + q); const life = (ph + rr()) % 1; crystal(s, f, 30 + life * 14, 28 + (rr() - .5) * 30 + life * life * 8, 4, 3, rr() * TAU); }
    glint(s, f, 18, 26, 3); B.selOutline(s, f, C.out);
  }
  return s;
}

function nova() {
  const W = 300; const H = 84; const N = 10; const s = new Sheet('ice_nova', W, H, N, { anchor: 'base', baseOffset: 6 });
  const cx = 150; const gy = 76;
  for (let f = 0; f < N; f++) {
    const grow = Math.min(1, (f + 1) / 6); const R = 18 + grow * 122; const shatter = clamp01((f - 5) / 4);
    // Frost floor: a lit rime band at the front, inside only short frost dashes (denser toward the front, thin at
    // the centre) — rime, not a rink and not pixel noise; it thins out while the crystals shatter.
    const ry = R * .28; const fr = rng(650 + f);
    for (let y = Math.floor(gy - ry); y <= gy + ry; y++) {
      const half = R * Math.sqrt(Math.max(0, 1 - ((y - gy) / ry) ** 2)); if (half < 2) continue;
      for (let x = Math.floor(cx - half); x <= cx + half; x++) { const e = Math.abs(x - cx) / half; if (e > .9 && !B.dither(x, y, shatter * .8)) iceTone(s, f, x, y, .6 + (y < gy ? .12 : 0)); }
      let x = cx - half + fr() * 6; const rowRng = rng(Math.round(y * 31) + 7);
      while (x < cx + half * .9) { const e = Math.abs(x - cx) / half; const len = 3 + Math.round(rowRng() * 6); const gap = Math.round(4 + (1 - e) * 14 + rowRng() * 8); if (rowRng() > shatter) for (let k = 0; k < len; k++) iceTone(s, f, x + k, y, .55 + rowRng() * .3); x += len + gap; }
    }
    for (let k = 0; k < 9; k++) { const rr = rng(600 + k); let a = rr() * TAU; let px = cx; let py = gy; const steps = Math.round(R * (.5 + rr() * .45)); for (let t = 0; t < steps; t++) { a += (rr() - .5) * .25; px += Math.cos(a); py += Math.sin(a) * .28; if (((px - cx) / R) ** 2 + ((py - gy) / ry) ** 2 > 1) break; s.set(f, px, py, C.ice[1]); if (t % 7 === 0 && rr() < .5) s.set(f, px + 1, py, C.ice[0]); } }
    // Crystals: along the current front they stand tall; older rings behind are shorter stubs. Back half first.
    const rings = [{ r: R, h: 1 }, { r: R * .62, h: .55 }, { r: R * .3, h: .35 }];
    const shards = [];
    for (const ring of rings) { const n = Math.max(6, Math.round(ring.r / 7)); for (let i = 0; i < n; i++) { const rr = rng(700 + Math.round(ring.r) + i); const a = i / n * TAU + rr() * .3; shards.push({ x: cx + Math.cos(a) * ring.r, y: gy + Math.sin(a) * ring.r * .28, a, len: (12 + rr() * 16) * ring.h * (f < 5 ? 1 : 1 - shatter * .9), lean: Math.cos(a) * .5, seed: i }); } }
    shards.sort((p, q) => p.y - q.y);
    for (const sh of shards) {
      if (sh.len > 2) { const L = sh.len * 1.35; crystal(s, f, sh.x, sh.y, L, Math.max(4, L * .42), -Math.PI / 2 + sh.lean, { bright: sh.seed % 4 === 0 ? 1 : 0 }); crystal(s, f, sh.x + 4, sh.y, L * .6, Math.max(3, L * .3), -Math.PI / 2 + sh.lean + .55); crystal(s, f, sh.x - 4, sh.y, L * .45, Math.max(3, L * .26), -Math.PI / 2 + sh.lean - .6); }
      // Shatter: fragments fly out and up, then fall.
      if (shatter > 0) for (let q = 0; q < 2; q++) { const u = shatter; const ax = Math.cos(sh.a) * (8 + q * 6) * u; crystal(s, f, sh.x + ax, sh.y - 10 * u + 16 * u * u - q * 4, 3, 2, sh.a + q * 2 + f); }
    }
    if (shatter > 0) for (let q = 0; q < 8; q++) { const rr = rng(800 + q); const a = rr() * TAU; mistPuff(s, f, cx + Math.cos(a) * R * .8, gy - 6 + Math.sin(a) * ry * .8 - shatter * 8, 5 + shatter * 5, 810 + q + f, shatter * .4); }
    if (f >= 3 && f <= 6) for (let q = 0; q < 6; q++) { const rr = rng(850 + q + f); glint(s, f, cx + (rr() - .5) * R * 1.6, gy - 6 - rr() * 18, 1 + (q % 2)); }
    B.selOutline(s, f, C.out);
  }
  return s;
}

function blizzard() {
  // A storm roller: a wide churning head (right) and a long frayed tail (left), streaked and packed with
  // snow, many small icy sweeps rolling over it, hail driving down-forward, tumbling shards, a mist skirt.
  const W = 128; const H = 96; const N = 8; const s = new Sheet('ice_blizzard', W, H, N, { anchor: 'center' });
  const hx = 96; const cy = 50; const len = 100;
  for (let f = 0; f < N; f++) {
    const ph = f / N;
    for (let q = 0; q < 30; q++) { const rr = rng(900 + q); const life = (ph * 2 + rr()) % 1; const x = 4 + rr() * 120 + life * 18; const y = 4 + rr() * 34 + life * 56; const ln = 3 + Math.round(rr() * 3); for (let k = 0; k < ln; k++) s.set(f, x + k, y + k * .9, k === 0 ? C.snow[3] : C.snow[1]); }
    const yAt = (x) => cy + Math.sin((hx - x) / 16 + ph * TAU) * 4 * clamp01((hx - x) / len);
    const halfAt = (x) => { const v = (hx - x) / len; if (v < -.22 || v > 1) return 0; if (v < 0) return 26 * Math.sqrt(1 - (v / .22) ** 2); return 26 * Math.pow(1 - v, .7) * (1 + Math.sin(v * 14 + ph * TAU * 2) * .12); };
    const body = (x, y) => { const h = halfAt(x); if (h < 1) return null; const v = (y - yAt(x)) / h; if (Math.abs(v) > 1) return null; return { v, tail: clamp01((hx - x) / len) }; };
    for (let y = cy - 32; y <= cy + 32; y++) for (let x = hx - len; x <= hx + 8; x++) { const b = body(x, y); if (!b || b.tail > .75 && B.dither(x, y, (b.tail - .75) * 3)) continue; if (Math.abs(b.v) > .86 && B.dither(x, y, .5)) continue; const fv = clamp01(.62 - b.v * .4 - b.tail * .3) * 3; const lo = Math.floor(fv); s.set(f, x, y, C.snow[Math.min(3, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); }
    B.streakFill(s, f, hx - len, cy - 30, hx + 8, cy + 30, (x, y) => { const b = body(x, y); return b ? clamp01(.6 - b.v * .3 - b.tail * .2) : null; }, C.ice.slice(2), { seed: 950 + f, minLen: 5, maxLen: 20, gap: 4, shift: f * 6 });
    // Rolling sweeps: small, many, turning forward over the head.
    for (let i = 0; i < 8; i++) { const rr = rng(1000 + i); const x0 = hx - 6 - rr() * 60; const r0 = 8 + rr() * 12; const a0 = -1.6 + ph * TAU * (1 + i % 2) + rr() * 2; B.crescent(s, f, x0, yAt(x0) + (rr() - .5) * 20, r0 * 1.2, r0, a0, a0 + 1.6 + rr() * .8, { max: 3 + rr() * 1.5, ramp: C.ice.slice(1, 6), seed: 1010 + i + f, dry: .4 }); }
    for (let q = 0; q < 6; q++) { const rr = rng(1100 + q); const x = hx - 8 - rr() * 55; crystal(s, f, x, yAt(x) + (rr() - .5) * 26, 5 + rr() * 5, 3, rr() * TAU + ph * TAU * 2); }
    for (let q = 0; q < 14; q++) { const rr = rng(1150 + q); const life = (ph + rr()) % 1; const x = hx - 80 + rr() * 90 + life * 14; const y = cy - 22 + rr() * 50 + life * 14; s.set(f, x, y, C.snow[3]); s.set(f, x + 1, y, C.snow[2]); s.set(f, x, y + 1, C.snow[2]); }
    for (let q = 0; q < 5; q++) { const rr = rng(1200 + q); const life = (ph + rr()) % 1; mistPuff(s, f, hx - 70 + q * 18 - life * 10, cy + 30 + rr() * 4, 6 + rr() * 3, 1210 + q + f, life > .8 ? .3 : 0); }
    B.selOutline(s, f, C.out);
  }
  return s;
}

function splash() {
  // An open CROWN: a rim ring on the water / ground, columns rising from it that taper into drops, the drops
  // detaching and falling while the columns sink back; a ripple ring spreads underneath.
  const W = 56; const H = 56; const N = 8; const s = new Sheet('water_splash', W, H, N, { anchor: 'center' }); const cx = 28; const cy = 40;
  const wTone = (f, x, y, v) => { const fv = clamp01(v) * (C.water.length - 1); const lo = Math.floor(fv); s.set(f, x, y, C.water[Math.min(C.water.length - 1, lo + (B.dither(Math.round(x), Math.round(y), fv - lo) ? 1 : 0))]); };
  for (let f = 0; f < N; f++) {
    const rise = f <= 3 ? (f + 1) / 4 : Math.max(0, 1 - (f - 3) / 4); const R = 7 + f * 1.8;
    if (f >= 2) { const RR = 8 + (f - 2) * 4.5; for (let i = 0; i < 80; i++) { const a = i / 80 * TAU; if (B.dither(i, f * 3, (f - 2) / 8)) continue; s.set(f, cx + Math.cos(a) * RR, cy + 4 + Math.sin(a) * RR * .3, C.water[Math.sin(a) < 0 ? 3 : 5]); } }
    const cols = [];
    for (let i = 0; i < 11; i++) { const rr = rng(1300 + i); const a = i / 11 * TAU + rr() * .25; cols.push({ a, h: (10 + rr() * 9) * rise, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R * .32, rr }); }
    cols.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    for (const c of cols) {
      const back = Math.sin(c.a) < 0;
      for (let yy = 0; yy < c.h; yy++) { const u = yy / Math.max(1, c.h); const half = 1.8 * (1 - u) + .6; for (let xx = -Math.ceil(half); xx <= Math.ceil(half); xx++) wTone(f, c.x + xx + Math.cos(c.a) * u * 3, c.y - yy, (back ? .35 : .5) + (xx < 0 ? .2 : 0) + u * .25); }
      // The drop at the tip (detaches after the peak and falls outward).
      const dt = f > 3 ? (f - 3) : 0; const dx = c.x + Math.cos(c.a) * (3 + dt * 3); const dy = c.y - c.h - 3 - dt * 2 + dt * dt * 1.6;
      if (dy < cy + 6) for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 2; xx++) wTone(f, dx + xx, dy + yy, .6 + (yy === 0 ? .35 : 0) - xx * .1);
    }
    // The rim: a lit ring of water where the crown stands.
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; wTone(f, cx + Math.cos(a) * R, cy + Math.sin(a) * R * .32, Math.sin(a) < 0 ? .5 : .78); }
    B.selOutline(s, f, C.wout);
  }
  return s;
}

module.exports = { waterSheets: () => [iceRay(), iceRoot(), iceHead(), nova(), blizzard(), splash()] };
