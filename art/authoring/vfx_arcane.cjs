// GRIMGE — LIGHT, VOID, SHADOW, hand-drawn quality (vfx_brush.cjs; final density, 1 px = 1 world px).
//   light_ray (+ _root, _head)  radiant lance: a white-hot shaft in a gold sheath, spokes of light flickering
//                               off it, star glints; a sun-star at the hand, a blinding star burst at the front.
//   halo_burst                  8 frames, 280×96 (base): a ring of light racing out over the ground, light
//                               pillars rising from it, sparkles — halo pulse.
//   void_ray (+ _root, _head)   null ray: a black tube with hot violet rims, motes streaming INTO the caster
//                               (−8 px / frame), ripples of bent space, purple crackle.
//   void_orb                    8-frame loop, 52×40 (faces right): a black hole, infalling ring, dragged tears.
//   shadow_burst                8 frames, 64×80 (base): a black shadow pool, smoke tendrils curling up, violet
//                               sparks — sinking into / rising out of the shadow (shadow step).
//   soul_flame                  8-frame loop, 40×28 (faces right): a ghostly violet-blue flame with a veil tail.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = B.pal({
  light: ['#7a4a00', '#c98a00', '#ffc21a', '#ffe27a', '#fff4c4', '#fffdf2', '#ffffff'],
  void: ['#000000', '#12001f', '#2e0a4a', '#5a1a85', '#9b30d9', '#d77bff', '#f6d4ff'],
  shadow: ['#06030c', '#140a26', '#2a1a4a', '#46307a', '#6e52b0', '#a48ae0'],
  soul: ['#140a3a', '#2a2a8a', '#4060d0', '#6aa0ff', '#a8d4ff', '#e8f6ff', '#ffffff'],
  outL: '#4a2c00', outV: '#000000', outS: '#04020a', outSo: '#0a0624'
});
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(Math.round(x), Math.round(y), fv - lo) ? 1 : 0))]); };
const star = (s, f, ramp, x, y, r) => { for (let k = -r; k <= r; k++) { const v = 1 - Math.abs(k) / (r + 1); tone(s, f, ramp, x + k, y, .5 + v * .5); tone(s, f, ramp, x, y + k, .5 + v * .5); } if (r > 2) for (let k = -1; k <= 1; k++) { tone(s, f, ramp, x + k, y + k, .8); tone(s, f, ramp, x + k, y - k, .8); } };
function flameShape(s, f, ramp, x, y, h, w, { dir = -Math.PI / 2, lean = 0, ph = 0, cool = 0 } = {}) {
  const dx = Math.cos(dir); const dy = Math.sin(dir); const nx = -dy; const ny = dx; const n = Math.max(4, Math.round(h * 1.3));
  for (let i = 0; i <= n; i++) { const u = i / n; const half = (w / 2) * Math.pow(1 - u, .75) * (1 + .3 * Math.sin(u * Math.PI)) + .3; const off = lean * u * u + Math.sin(u * 3.2 + ph) * w * .22 * u; const cx = x + dx * u * h + nx * off; const cy = y + dy * u * h + ny * off; const steps = Math.max(1, Math.round(half * 2.6)); for (let k = 0; k <= steps; k++) { const v = k / steps * 2 - 1; tone(s, f, ramp, cx + nx * v * half, cy + ny * v * half, (1 - Math.abs(v)) * (1 - u * .85) * 1.05 + .18 - cool); } }
}
const wrap3 = (W, fn) => { for (const d of [-W, 0, W]) fn(d); };

// ── light ──
function lightRay() {
  const W = 48; const H = 40; const N = 6; const s = new Sheet('light_ray', W, H, N, { anchor: 'center' }); const cy = 20;
  for (let f = 0; f < N; f++) {
    const r = rng(100 + f * 7);
    // Spokes: vertical rays off the shaft, random lengths each frame (flicker), gold with a white root.
    for (let x = 1; x < W; x += 3) { if (r() < .45) continue; const up = r() < .5; const l = 4 + Math.round(r() * 12); for (let k = 0; k < l; k++) { const y = up ? cy - 6 - k : cy + 6 + k; tone(s, f, C.light, x, y, .85 - k / l * .6); } }
    for (let x = 0; x < W; x++) for (let y = cy - 6; y <= cy + 6; y++) { const d = Math.abs(y - cy) / 6; tone(s, f, C.light, x, y, 1 - d * d * .75 - (B.dither(x + f, y, .15) ? .05 : 0)); }
    for (let q = 0; q < 2; q++) star(s, f, C.light, Math.round(r() * (W - 6)) + 3, cy + (r() < .5 ? -12 : 12), 2 + (q === 0 ? 1 : 0));
    B.selOutline(s, f, C.outL);
  }
  return s;
}
function lightRoot() {
  const s = new Sheet('light_ray_root', 32, 40, 6, { anchor: 'center' });
  for (let f = 0; f < 6; f++) { const r = rng(150 + f); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + f * .2; const l = 8 + (i % 2 ? 4 : 9) + r() * 3; for (let k = 0; k < l; k++) tone(s, f, C.light, 14 + Math.cos(a) * k, 20 + Math.sin(a) * k, .95 - k / l * .7); } for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) if (xx * xx + yy * yy <= 25) tone(s, f, C.light, 14 + xx, 20 + yy, 1 - Math.hypot(xx, yy) / 9); B.selOutline(s, f, C.outL); }
  return s;
}
function lightHead() {
  const s = new Sheet('light_ray_head', 48, 56, 6, { anchor: 'center' });
  for (let f = 0; f < 6; f++) { const r = rng(170 + f * 3); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + f * .13; const l = (i % 2 ? 10 : 20) + r() * 6; for (let k = 0; k < l; k++) { const w = Math.max(0, Math.round((1 - k / l) * 2)); for (let j = -w; j <= w; j++) tone(s, f, C.light, 16 + Math.cos(a) * k - Math.sin(a) * j * .5, 28 + Math.sin(a) * k + Math.cos(a) * j * .5, .95 - k / l * .7); } } for (let yy = -7; yy <= 7; yy++) for (let xx = -7; xx <= 7; xx++) if (xx * xx + yy * yy <= 49) tone(s, f, C.light, 16 + xx, 28 + yy, 1.05 - Math.hypot(xx, yy) / 12); for (let q = 0; q < 4; q++) star(s, f, C.light, 16 + Math.round((r() - .5) * 40), 28 + Math.round((r() - .5) * 44), 2); B.selOutline(s, f, C.outL); }
  return s;
}
function halo() {
  const W = 280; const H = 96; const N = 8; const s = new Sheet('halo_burst', W, H, N, { anchor: 'base', baseOffset: 6 }); const cx = 140; const gy = 88;
  for (let f = 0; f < N; f++) {
    const k = (f + 1) / N; const R = 16 + k * 118; const ry = R * .3; const fade = clamp01((f - 4) / 3);
    const pillars = []; const n = Math.round(10 + k * 8);
    for (let i = 0; i < n; i++) { const rr = rng(200 + i); const a = i / n * TAU + rr() * .2; pillars.push({ x: cx + Math.cos(a) * R, y: gy + Math.sin(a) * ry, h: (14 + rr() * 26) * (1 - fade * .8), back: Math.sin(a) < 0 }); }
    const drawPillar = (p) => { for (let yy = 0; yy < p.h; yy++) { const u = yy / p.h; const w = Math.max(0, Math.round(2.4 * (1 - u))); for (let j = -w; j <= w; j++) if (!B.dither(p.x + j, p.y - yy, u * .8 + fade * .4)) tone(s, f, C.light, p.x + j, p.y - yy, .95 - u * .5 - Math.abs(j) * .1 - (p.back ? .15 : 0)); } };
    for (const p of pillars) if (p.back) drawPillar(p);
    // The ring band: a thick lit ellipse band, broken as it fades.
    for (let i = 0; i < Math.round(R * 4); i++) { const a = i / (R * 4) * TAU; if (fade > 0 && B.dither(i, f, fade * .8)) continue; const x = cx + Math.cos(a) * R; const y = gy + Math.sin(a) * ry; for (let t = -2; t <= 2; t++) tone(s, f, C.light, x, y + t, .95 - Math.abs(t) * .18 - (Math.sin(a) < 0 ? .1 : 0)); }
    for (const p of pillars) if (!p.back) drawPillar(p);
    for (let q = 0; q < 8; q++) { const rr = rng(260 + q + f); star(s, f, C.light, cx + Math.round((rr() - .5) * R * 2), gy - 10 - Math.round(rr() * 40), 1 + (q % 3 === 0 ? 1 : 0)); }
    B.selOutline(s, f, C.outL);
  }
  return s;
}
// ── void ──
function voidRay() {
  const W = 48; const H = 40; const N = 6; const s = new Sheet('void_ray', W, H, N, { anchor: 'center' }); const cy = 20;
  for (let f = 0; f < N; f++) {
    const off = -f * 8; // flows INTO the caster
    // Ripples of bent space: thin violet arcs around the tube, drifting inward.
    for (let i = 0; i < 3; i++) { const base = ((i * 16 + off) % W + W) % W; wrap3(W, (d) => { const x0 = base + d; for (let t = -14; t <= 14; t++) { const x = x0 + Math.round(Math.abs(t) * .35); if (x >= 0 && x < W && Math.abs(t) > 7) s.set(f, x, cy + t, C.void[Math.abs(t) > 11 ? 3 : 4]); } }); }
    // The tube: black core, deep body, hot violet rims that pinch and swell.
    for (let x = 0; x < W; x++) { const pinch = 6 + Math.round(Math.sin(((x - off) / W) * TAU * 2) * 1.2); for (let y = cy - pinch; y <= cy + pinch; y++) { const d = Math.abs(y - cy) / pinch; const v = d > .82 ? .82 : d > .6 ? .45 : .05 + d * .1; tone(s, f, C.void, x, y, v); } }
    // Motes streaming inward along the core, crackle on the rims.
    for (let i = 0; i < 6; i++) { const rr = rng(300 + i); const base = ((i * 8 + off + rr() * 4) % W + W) % W; const y = cy - 3 + Math.round(rr() * 6); wrap3(W, (d) => { const x = base + d; if (x >= 0 && x < W) { s.set(f, x, y, C.void[6]); if (x + 1 < W) s.set(f, x + 1, y, C.void[5]); if (x + 2 < W) s.set(f, x + 2, y, C.void[4]); } }); }
    const r = rng(330 + f); for (let q = 0; q < 3; q++) { let x = r() * W; let y = cy + (r() < .5 ? -7 : 7); for (let k = 0; k < 4; k++) { x += 2; y += (r() - .5) * 4; s.set(f, x, y, C.void[5]); } }
    B.selOutline(s, f, C.outV);
  }
  return s;
}
function voidDisc(s, f, cx, cy, r, ph, seed) {
  const ring = (front) => { for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + ph * TAU; if ((Math.sin(a) > 0) !== front) continue; const rr = r * (1.7 - ((ph + i / 24) % 1) * .45); const x = cx + Math.cos(a) * rr; const y = cy + Math.sin(a) * rr * .32; tone(s, f, C.void, x, y, .75 + (i % 3 === 0 ? .2 : 0)); tone(s, f, C.void, x + 1, y, .6); } };
  ring(false);
  for (let yy = -r - 1; yy <= r + 1; yy++) for (let xx = -r - 1; xx <= r + 1; xx++) { const d = Math.hypot(xx, yy); if (d > r + 1) continue; tone(s, f, C.void, cx + xx, cy + yy, d > r ? .82 : d > r - 1.2 ? .7 : 0); }
  ring(true);
}
function voidRoot() { const s = new Sheet('void_ray_root', 32, 40, 6, { anchor: 'center' }); for (let f = 0; f < 6; f++) { voidDisc(s, f, 14, 20, 6, f / 6, 400); B.selOutline(s, f, C.outV); } return s; }
function voidHead() {
  const s = new Sheet('void_ray_head', 48, 56, 6, { anchor: 'center' });
  for (let f = 0; f < 6; f++) { const r = rng(420 + f); for (let q = 0; q < 10; q++) { const a = r() * TAU; const d = 10 + ((f / 6 + r()) % 1) * 14; const x = 18 + Math.cos(a) * (24 - d); const y = 28 + Math.sin(a) * (24 - d) * .8; s.set(f, x, y, C.void[5]); s.set(f, x + 1, y, C.void[4]); } voidDisc(s, f, 18, 28, 9, f / 6, 430); B.selOutline(s, f, C.outV); }
  return s;
}
function voidOrb() {
  const W = 52; const H = 40; const N = 8; const s = new Sheet('void_orb', W, H, N, { anchor: 'center' });
  for (let f = 0; f < N; f++) { const ph = f / N;
    for (let i = 0; i < 4; i++) { const rr = rng(450 + i); const len = 18 + rr() * 12; const off = (i - 1.5) * 4.5; for (let t = 0; t < len; t++) { const u = t / len; const y = 20 + off * (.3 + u * .7) + Math.sin(u * 4 + ph * TAU + i) * 1.5; const th = Math.max(1, Math.round(2.4 * (1 - u))); for (let k = 0; k < th; k++) tone(s, f, C.void, 30 - 6 - t, y + k, .6 - u * .45); } }
    voidDisc(s, f, 34, 20, 8, ph, 460); for (let yy = -5; yy <= 5; yy++) tone(s, f, C.void, 34 + Math.round(Math.sqrt(Math.max(0, 49 - yy * yy))), 20 + yy, .95);
    B.selOutline(s, f, C.outV);
  }
  return s;
}
// ── shadow ──
function shadowBurst() {
  const W = 64; const H = 80; const N = 8; const s = new Sheet('shadow_burst', W, H, N, { anchor: 'base', baseOffset: 4 }); const cx = 32; const gy = 74;
  for (let f = 0; f < N; f++) {
    const k = f / (N - 1); const pool = 14 + Math.sin(k * Math.PI) * 6;
    for (let yy = -5; yy <= 5; yy++) for (let xx = -Math.round(pool); xx <= pool; xx++) { if ((xx / pool) ** 2 + (yy / 5) ** 2 > 1) continue; tone(s, f, C.shadow, cx + xx, gy + yy, Math.abs(xx) / pool > .85 ? .45 : .05); }
    // Tendrils of shadow smoke curling up out of the pool, thinning out at the end.
    for (let i = 0; i < 6; i++) { const rr = rng(500 + i); const x0 = cx + (rr() - .5) * pool * 1.4; const hgt = (20 + rr() * 34) * Math.sin(Math.min(1, k * 1.4) * Math.PI * .9 + .3); const pts = []; for (let t = 0; t <= 5; t++) { const u = t / 5; pts.push([x0 + Math.sin(u * 4 + k * 6 + i) * 6 * u, gy - u * hgt]); } B.stroke(s, f, pts, { max: 5 - (i % 3), ramp: C.shadow.slice(0, 5), seed: 510 + i + f, dry: .4 + k * .4, headBias: .15, light: [-.6, -.8] }); }
    for (let q = 0; q < 6; q++) { const rr = rng(560 + q); const life = (k + rr()) % 1; const x = cx + (rr() - .5) * 40; const y = gy - 6 - life * 50; s.set(f, x, y, C.shadow[5]); if (q % 2) s.set(f, x + 1, y, C.shadow[4]); }
    B.selOutline(s, f, C.outS);
  }
  return s;
}
function soulFlame() {
  const W = 40; const H = 28; const N = 8; const s = new Sheet('soul_flame', W, H, N, { anchor: 'center' });
  for (let f = 0; f < N; f++) { const ph = f / N;
    flameShape(s, f, C.soul, 26, 14, 24, 13, { dir: Math.PI + .08, lean: -3, ph: ph * TAU, cool: .05 });
    flameShape(s, f, C.soul, 24, 10, 14, 6, { dir: Math.PI + .5, lean: -2, ph: ph * TAU * 2, cool: .15 });
    for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) if (xx * xx + yy * yy <= 25) tone(s, f, C.soul, 28 + xx, 14 + yy, 1.02 - Math.hypot(xx - 1, yy + 1) / 8);
    s.set(f, 30, 12, C.soul[0]); s.set(f, 30, 15, C.soul[0]); // two dark eye-hollows give it a spirit face
    B.selOutline(s, f, C.outSo);
  }
  return s;
}
module.exports = { arcaneSheets: () => [lightRay(), lightRoot(), lightHead(), halo(), voidRay(), voidRoot(), voidHead(), voidOrb(), shadowBurst(), soulFlame()] };
