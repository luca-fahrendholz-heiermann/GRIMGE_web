// GRIMGE — special runes, round 1 (hand-drawn quality; vfx_brush.cjs; final density). Own designs.
//   spiral_core / spiral_core_over  8-frame loop, 96×96: a swirling energy sphere — volume-shaded core, spiral
//                                   arms sweeping round it, wind rings, a white-hot heart, sparks (blue / violet).
//   spiral_burst                    8 frames, 176×112 (base): the core bursts — a spiral shock dome, streaks.
//   guardian_spirit                 6-frame loop, 104×128 (base): a violet spectral warrior — horned mask, glowing
//                                   eyes, broad chest, shoulder plates, a smoke tail instead of legs.
//   guardian_fist                   4 frames, 48×36 (faces right): a spectral fist with motion streaks.
//   guardian_slam                   6 frames, 112×88: the huge finishing fist and its impact star.
//   stab_flash                      4 frames, 128×20 (faces right): a thrust — tapered streak, point flash.
//   pierce_wave                     6 frames, 336×48 (faces right): the long piercing thrust with a cone shock.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = B.pal({
  spiral: ['#06223f', '#0d47a1', '#1e88e5', '#42a5f5', '#90caf9', '#e3f2fd', '#ffffff'],
  over: ['#24063a', '#4a148c', '#8e24aa', '#ce5cf0', '#ea9cff', '#f8e4ff', '#ffffff'],
  ghost: ['#0f0626', '#271456', '#4a2c8f', '#7e57c2', '#b39ddb', '#e6dcff', '#ffffff'],
  thrust: ['#5a3a00', '#c99a1a', '#ffe082', '#fff6cf', '#ffffff'],
  blue: ['#020818', '#06204f', '#1546b8', '#2979ff', '#82b1ff', '#d6e4ff', '#ffffff'],
  red: ['#1c0204', '#5a0610', '#a3001a', '#e8141e', '#ff8a80', '#ffd6d0', '#ffffff'],
  violet: ['#0c0216', '#2e0652', '#6a0fb0', '#aa00ff', '#d97cff', '#f3d6ff', '#ffffff'],
  out: '#060812', outG: '#07031a'
});
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };

function spiralCore(name, ramp) {
  const W = 96; const s = new Sheet(name, W, W, 8, { anchor: 'center' }); const c = 48; const R = 24;
  for (let f = 0; f < 8; f++) {
    const ph = f / 8 * TAU;
    // Outer wind rings (tilted ellipses, broken), back halves first.
    for (let k = 0; k < 3; k++) { const rx = R + 8 + k * 6; const tilt = .35 + k * .12; const a0 = ph * (k % 2 ? -1 : 1) + k * 2; B.crescent(s, f, c, c, rx, rx * tilt, a0 + Math.PI, a0 + Math.PI + 2.2, { max: 2.5, ramp: ramp.slice(1, 5), seed: 10 + k + f, dry: .5 }); }
    // The sphere: volume shading, light from the top left.
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const d = Math.hypot(x, y) / R; if (d > 1) continue; const nz = Math.sqrt(1 - d * d); const lit = clamp01(-(x / R) * .45 - (y / R) * .5 + nz * .7); tone(s, f, ramp, c + x, c + y, .15 + lit * .7 - (d > .92 ? .15 : 0)); }
    // Spiral arms sweeping round inside the sphere (bright strokes), the heart.
    for (let a = 0; a < 4; a++) { const pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10; const ang = ph * 1.5 + a * TAU / 4 + u * 3.4; const r = R * (.15 + u * .82); pts.push([c + Math.cos(ang) * r, c + Math.sin(ang) * r * .9]); } B.stroke(s, f, pts, { max: 3.2, swell: .8, ramp: ramp.slice(3), seed: 30 + a + f, dry: .3, headBias: .6, light: [-.6, -.8] }); }
    for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) { const d = Math.hypot(x, y); if (d <= 7) tone(s, f, ramp, c + x, c + y, 1 - d / 14); }
    // Front wind rings and sparks.
    for (let k = 0; k < 3; k++) { const rx = R + 8 + k * 6; const tilt = .35 + k * .12; const a0 = ph * (k % 2 ? -1 : 1) + k * 2; B.crescent(s, f, c, c, rx, rx * tilt, a0, a0 + 2.2, { max: 3, ramp: ramp.slice(2), seed: 20 + k + f, dry: .4 }); }
    for (let q = 0; q < 8; q++) { const a = q / 8 * TAU + ph * 2; const life = (f / 8 + q / 8) % 1; const r = R + 4 + (1 - life) * 14; tone(s, f, ramp, c + Math.cos(a) * r, c + Math.sin(a) * r, .9); tone(s, f, ramp, c + Math.cos(a) * r + 1, c + Math.sin(a) * r, .7); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function spiralBurst() {
  const W = 176; const H = 112; const s = new Sheet('spiral_burst', W, H, 8, { anchor: 'base', baseOffset: 6 }); const cx = 88; const gy = 104;
  for (let f = 0; f < 8; f++) {
    const k = (f + 1) / 8; const R = 20 + k * 64; const fade = clamp01((f - 4) / 3);
    // A spiral shock dome: crescents sweeping round the hemisphere.
    for (let a = 0; a < 6; a++) { const a0 = a / 6 * TAU + k * 4; B.crescent(s, f, cx, gy - R * .45, R, R * .55, a0, a0 + 1.6, { max: (5 - fade * 4) * (1 - k * .3) + 1, ramp: C.spiral.slice(2), seed: 50 + a + f, dry: .3 + fade * .5 }); }
    // Ground ring and flying streaks.
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; if (B.dither(i, f, fade)) continue; tone(s, f, C.spiral, cx + Math.cos(a) * R, gy + Math.sin(a) * R * .25, .8); }
    for (let q = 0; q < 10; q++) { const rr = rng(70 + q); const a = -Math.PI * rr(); const d = R * (.6 + rr() * .6); const x = cx + Math.cos(a) * d; const y = gy - 10 + Math.sin(a) * d * .7; B.stroke(s, f, [[x, y], [x + Math.cos(a) * 8, y + Math.sin(a) * 6]], { max: 2, ramp: C.spiral.slice(3), seed: 80 + q, dry: 0 }); }
    if (f < 3) for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) { const d = Math.hypot(x, y); if (d <= 10 - f * 2) tone(s, f, C.spiral, cx + x, gy - 24 + y, 1 - d / 20); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function guardian() {
  const W = 104; const H = 128; const s = new Sheet('guardian_spirit', W, H, 6, { anchor: 'base', baseOffset: 4 }); const cx = 52;
  const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const shade = (f, pts, top, bot) => { const ys = pts.map((p) => p[1]); const y0 = Math.min(...ys); const y1 = Math.max(...ys); for (let y = Math.floor(y0); y <= y1; y++) for (let x = 0; x < W; x++) { if (!inPoly(pts, x + .5, y + .5)) continue; const u = (y - y0) / Math.max(1, y1 - y0); let v = top + (bot - top) * u + (x < cx ? .08 : -.06); if (!inPoly(pts, x + .5, y - .5)) v += .18; tone(s, f, C.ghost, x, y, v); } };
  for (let f = 0; f < 6; f++) {
    const bob = Math.round(Math.sin(f / 6 * TAU) * 2);
    // Smoke tail: wisps curling down instead of legs.
    const tailX = (y) => cx + Math.sin((y - 70) / 14 + f * 1.05) * 6 * ((y - 70) / 52);
    B.streakFill(s, f, cx - 30, 66 + bob, cx + 30, 124, (x, y) => { const u = (y - 66 - bob) / 58; if (u < 0 || u > 1) return null; const hw = 21 * Math.pow(1 - u, .9) + 1; const v = (x - tailX(y)) / hw; if (Math.abs(v) > 1) return null; return clamp01(.74 - u * .3 - v * .2 - Math.abs(v) * .12); }, C.ghost, { seed: 100 + f, minLen: 3, maxLen: 9, gap: 2 });
    for (let k = 0; k < 4; k++) { const side = k % 2 ? 1 : -1; const y0 = 80 + k * 9 + bob; const x0 = tailX(y0) + side * (20 - k * 4); B.stroke(s, f, [[x0, y0], [x0 + side * 7, y0 + 4], [x0 + side * 5, y0 + 10]], { max: 3, swell: .5, ramp: C.ghost.slice(2, 6), seed: 110 + k + f, dry: .4, headBias: .3 }); }
    // Torso (broad chest tapering to the waist), shoulder plates, arms hanging ready.
    shade(f, [[cx - 26, 32 + bob], [cx - 31, 40 + bob], [cx - 29, 52 + bob], [cx - 21, 62 + bob], [cx - 17, 74 + bob], [cx + 17, 74 + bob], [cx + 21, 62 + bob], [cx + 29, 52 + bob], [cx + 31, 40 + bob], [cx + 26, 32 + bob]], .64, .3);
    for (let y = 60; y <= 72; y += 4) for (let x = -8; x <= 8; x++) if (Math.abs(x) > 1) tone(s, f, C.ghost, cx + x, y + bob, .25); // abdomen plates
    for (const side of [-1, 1]) { shade(f, [[cx + side * 22, 28 + bob], [cx + side * 40, 32 + bob], [cx + side * 38, 44 + bob], [cx + side * 22, 42 + bob]], .75, .45); B.stroke(s, f, [[cx + side * 34, 42 + bob], [cx + side * 40, 58 + bob], [cx + side * 36, 72 + bob]], { max: 9, swell: .5, ramp: C.ghost.slice(1, 6), seed: 120 + side + f, dry: 0, headBias: .3 }); for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 25) tone(s, f, C.ghost, cx + side * 36 + x, 76 + bob + y, .55 - y / 20); }
    // Chest plates (pec ridges) and a glowing rune on the chest.
    for (let x = -18; x <= 18; x++) tone(s, f, C.ghost, cx + x, 46 + bob + Math.round(Math.abs(x) * .15), .2);
    for (let k = -4; k <= 4; k++) { tone(s, f, C.ghost, cx + k, 56 + bob, .95); tone(s, f, C.ghost, cx, 56 + bob + k, .95); }
    // Head: a horned mask with glowing eyes.
    shade(f, [[cx - 11, 14 + bob], [cx + 11, 14 + bob], [cx + 9, 32 + bob], [cx, 36 + bob], [cx - 9, 32 + bob]], .7, .4);
    for (const side of [-1, 1]) { B.stroke(s, f, [[cx + side * 8, 16 + bob], [cx + side * 16, 8 + bob], [cx + side * 18, 0 + bob]], { max: 4, swell: .5, ramp: C.ghost.slice(2, 7), seed: 140 + side, dry: 0, headBias: .05 }); for (let x = 0; x < 4; x++) tone(s, f, C.ghost, cx + side * (4 + x) - (side < 0 ? 3 : 0), 23 + bob, 1); }
    B.selOutline(s, f, C.outG);
  }
  return s;
}
// A clenched fist seen from the side (facing right): the back of the hand, four knuckle bumps at the front,
// finger rows folded under, the thumb across, the wrist trailing into the motion streaks.
function drawFist(s, f, x0, cy, sc, ramp) {
  const box = (x, y, w, h, v) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) tone(s, f, ramp, x + xx, y + yy, v - yy / (h * 3)); };
  box(x0 - 10 * sc, cy - 5 * sc, 12 * sc, 10 * sc, .6);                                 // wrist
  box(x0, cy - 9 * sc, 16 * sc, 18 * sc, .78);                                          // back of the hand
  for (let k = 0; k < 4; k++) { box(x0 + 15 * sc, cy - 9 * sc + k * 4.5 * sc, 4 * sc, 4 * sc, .92 - k * .05); tone(s, f, ramp, x0 + 15 * sc, cy - 9 * sc + k * 4.5 * sc + 4 * sc, .2); } // knuckles
  for (let k = 0; k < 4; k++) for (let xx = 0; xx < 12 * sc; xx++) tone(s, f, ramp, x0 + 3 * sc + xx, cy - 9 * sc + (k + 1) * 4.5 * sc, .35); // finger seams
  box(x0 + 3 * sc, cy + 5 * sc, 11 * sc, 4 * sc, .55);                                  // thumb across
}
function fist() {
  const s = new Sheet('guardian_fist', 48, 36, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    for (let k = 0; k < 4; k++) { const y = 10 + k * 5; const len = 14 + (k % 2) * 8 - f * 2; for (let x = 2; x < 2 + len; x++) if ((x + k) % 5) tone(s, f, C.ghost, x, y, .55 + (x - 2) / len * .35); }
    drawFist(s, f, 22, 18, 1, C.ghost);
    B.selOutline(s, f, C.outG);
  }
  return s;
}
function slam() {
  const W = 112; const H = 88; const s = new Sheet('guardian_slam', W, H, 6, { anchor: 'center' }); const cy = 44;
  for (let f = 0; f < 6; f++) {
    const k = f / 5; const fx = 30 + k * 40;
    if (f >= 2) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const l = 14 + (f - 2) * 9 + (i % 2) * 8; B.stroke(s, f, [[fx + 22, cy], [fx + 22 + Math.cos(a) * l, cy + Math.sin(a) * l * .8]], { max: 3.5 - (f - 2) * .6, ramp: C.ghost.slice(3), seed: 160 + i, dry: .3, headBias: .2 }); }
    for (let k2 = 0; k2 < 5; k2++) { const y = cy - 16 + k2 * 8; for (let x = fx - 28; x < fx - 4; x++) if ((x + k2) % 4) tone(s, f, C.ghost, x, y, .6 + (x - fx + 28) / 60); }
    drawFist(s, f, fx - 6, cy, 2, C.ghost);
    B.selOutline(s, f, C.outG);
  }
  return s;
}
function stabFlash() {
  const W = 128; const s = new Sheet('stab_flash', W, 20, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const len = [70, 120, 110, 80][f]; const w = [4, 6, 5, 3][f];
    for (let x = 0; x < len; x++) { const u = x / len; const hw = Math.max(0, Math.round(w * u)); for (let y = -hw; y <= hw; y++) tone(s, f, C.thrust, 4 + x, 10 + y, .35 + u * .55 - Math.abs(y) / (hw + 1) * .3); }
    if (f >= 1 && f <= 2) { const px0 = 4 + len; for (let k = -5; k <= 5; k++) { tone(s, f, C.thrust, px0 + k * .4, 10 + k, 1 - Math.abs(k) / 7); tone(s, f, C.thrust, px0 + Math.abs(k) * .5, 10, 1); } }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function pierceWave() {
  const W = 336; const s = new Sheet('pierce_wave', W, 48, 6, { anchor: 'center' }); const cy = 24;
  for (let f = 0; f < 6; f++) {
    const k = (f + 1) / 6; const len = Math.min(1, k * 1.6) * 320; const fade = clamp01((f - 3) / 2);
    for (let x = 0; x < len; x++) { const u = x / Math.max(1, len); const hw = Math.round((3 + u * 9) * (1 - fade * .3)); for (let y = -hw; y <= hw; y++) if (!B.dither(x, y, fade * .35)) tone(s, f, C.thrust, 8 + x, cy + y, .4 + u * .5 - Math.abs(y) / (hw + 1) * .3); }
    // Cone shock rings along the thrust.
    for (let r = 0; r < 4; r++) { const x = 8 + len * (.3 + r * .2); const rad = 10 + r * 4 + k * 8; for (let a = -1.2; a <= 1.2; a += .06) if (!B.dither(Math.round(a * 20), r, fade)) tone(s, f, C.thrust, x - Math.cos(a) * rad * .4, cy + Math.sin(a) * rad, .7); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
// ── S89 GRENZENLOS ──
//   limitless_sog   8-frame loop, 112×96: a singularity — black core, a blue lensing ring, streaks spiralling in,
//                   distortion rings shrinking inward.
//   limitless_push  6 frames, 208×136: the red repulsion — a sphere bursting into a shock dome, crescents out.
//   limit_beam (+_root, _head)  NICHTS: a violet beam with blue and red twisting through it; the meeting sphere.
function sog() {
  const W = 112; const H = 96; const s = new Sheet('limitless_sog', W, H, 8, { anchor: 'center' }); const cx = 56; const cy = 48;
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    for (let r = 0; r < 3; r++) { const k = (ph + r / 3) % 1; const R = 44 * (1 - k) + 14; for (let i = 0; i < 80; i++) { const a = i / 80 * TAU; if (B.dither(i, r * 5, k * .7)) continue; tone(s, f, C.blue, cx + Math.cos(a) * R, cy + Math.sin(a) * R * .72, .5 + k * .3); } }
    for (let i = 0; i < 9; i++) { const a0 = i / 9 * TAU - ph * TAU; const pts = []; for (let t = 0; t <= 6; t++) { const u = t / 6; const a = a0 + u * 1.6; const R = 50 - u * 34; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * .72]); } B.stroke(s, f, pts, { max: 2.6, swell: .9, ramp: C.blue.slice(3), seed: 300 + i + f, dry: .4, headBias: .8 }); }
    for (let y = -15; y <= 15; y++) for (let x = -15; x <= 15; x++) { const d = Math.hypot(x, y); if (d > 15) continue; tone(s, f, C.blue, cx + x, cy + y, d > 12 ? .9 - (d - 12) / 6 : d > 9 ? .55 : 0); }
    for (let k = -2; k <= 2; k++) tone(s, f, C.blue, cx - 5 + k, cy - 6, 1);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function push() {
  const W = 208; const H = 136; const s = new Sheet('limitless_push', W, H, 6, { anchor: 'center' }); const cx = 104; const cy = 68;
  for (let f = 0; f < 6; f++) {
    const k = (f + 1) / 6; const R = 14 + k * 86; const fade = clamp01((f - 3) / 2);
    // Pressure haze inside the shock (dithered, thinning outward), then three stacked shock bands.
    for (let y = -R * .62; y <= R * .62; y++) for (let x = -R; x <= R; x++) { const e = Math.hypot(x / R, y / (R * .62)); if (e > 1 || B.dither(x, y, .55 + e * .35 + fade * .3)) continue; tone(s, f, C.red, cx + x, cy + y, .35 + e * .3); }
    for (let b = 0; b < 3; b++) { const Rb = R - b * 7; if (Rb < 8) continue; for (let a = 0; a < 12; a++) { const a0 = a / 12 * TAU + k + b; B.crescent(s, f, cx, cy, Rb, Rb * .62, a0, a0 + .7, { max: (9 - f * 1.2) * (1 - b * .25) + 1, ramp: C.red.slice(2), seed: 400 + a + f + b * 20, dry: .25 + fade * .5 }); } }
    if (f < 3) { const r0 = 18 - f * 5; for (let y = -r0; y <= r0; y++) for (let x = -r0; x <= r0; x++) { const d = Math.hypot(x, y); if (d <= r0) tone(s, f, C.red, cx + x, cy + y, 1 - d / (r0 * 2)); } }
    for (let q = 0; q < 12; q++) { const rr = rng(450 + q); const a = rr() * TAU; const d = R * (.7 + rr() * .4); B.stroke(s, f, [[cx + Math.cos(a) * d, cy + Math.sin(a) * d * .62], [cx + Math.cos(a) * (d + 10), cy + Math.sin(a) * (d + 10) * .62]], { max: 2, ramp: C.red.slice(3), seed: 460 + q, dry: 0 }); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function limitBeam() {
  const W = 48; const H = 56; const s = new Sheet('limit_beam', W, H, 6, { anchor: 'center' }); const cy = 28;
  for (let f = 0; f < 6; f++) {
    const off = f * 8;
    for (let x = 0; x < W; x++) for (let y = cy - 18; y <= cy + 18; y++) { const d = Math.abs(y - cy) / 18; tone(s, f, C.violet, x, y, 1 - d * .9 + (d < .2 ? .1 : 0)); }
    // Blue and red strands twisting through the beam (a double helix).
    for (const [ramp, phs] of [[C.blue, 0], [C.red, Math.PI]]) for (let x = 0; x < W; x++) { const a = (x + off) / W * TAU * 2 + phs; const y = cy + Math.sin(a) * 10; const front = Math.cos(a) > 0; for (let k = 0; k < 3; k++) tone(s, f, ramp, x, y - 1 + k, front ? .85 - k * .1 : .45); }
    for (let x = 0; x < W; x++) { tone(s, f, C.violet, x, cy - 19, .55); tone(s, f, C.violet, x, cy + 19, .35); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function limitOrb(name, r, W) {
  const s = new Sheet(name, W, W, 6, { anchor: 'center' }); const c = W / 2;
  for (let f = 0; f < 6; f++) {
    const rr = r + Math.sin(f / 6 * TAU) * 1.5;
    for (let y = -rr - 6; y <= rr + 6; y++) for (let x = -rr - 6; x <= rr + 6; x++) { const d = Math.hypot(x, y); if (d > rr + 6) continue; if (d > rr) { if (!B.dither(x, y, (d - rr) / 6)) tone(s, f, C.violet, c + x, c + y, .6); continue; } tone(s, f, C.violet, c + x, c + y, 1 - d / rr * .55); }
    for (const [ramp, sx] of [[C.blue, -1], [C.red, 1]]) { const cx0 = c + sx * rr * .45; for (let y = -rr * .4; y <= rr * .4; y++) for (let x = -rr * .4; x <= rr * .4; x++) if (Math.hypot(x, y) <= rr * .4) tone(s, f, ramp, cx0 + x, c + y, .8); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
module.exports = { runes1Sheets: () => [sog(), push(), limitBeam(), limitOrb('limit_beam_root', 12, 40), limitOrb('limit_beam_head', 18, 56), spiralCore('spiral_core', C.spiral), spiralCore('spiral_core_over', C.over), spiralBurst(), guardian(), fist(), slam(), stabFlash(), pierceWave()] };
