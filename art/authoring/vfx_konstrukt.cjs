// GRIMGE — A10 KONSTRUKTPANZER (hand-drawn quality; vfx_brush.cjs; final density). User, 26 Oct 2026: an Iron-Man-like
// armour transformation, the turtle variant that rolls into a ball (reference art; own adaptation, no foreign
// character). The armour plate itself is the hero's recoloured sprite (form_recolors.js); these sheets add:
//   as_A10_back / _front  a domed hex-plated carapace on the back (green plates, dark seams, glowing core plate,
//                         metal rim with cyan light strips, two thruster nozzles); front: sparks at the sides only.
//   kp_cannon             3 frames, 48×24: the arm cannon (grip at the left): idle / charging / firing rings.
//   kp_shell              8-frame loop, 48×48: the rolled-up armour ball (hex plates turning, core light passing).
//   kp_ring               4-frame loop, 24×24: a cannon shot — concentric cyan energy rings.
//   kp_shield             4-frame loop, 112×96: the hex aura shield dome (base anchored).
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const K = {
  plate: ramp('#0c1a10', '#16301c', '#24502c', '#3a7a40', '#62a860', '#a0d890'), metal: ramp('#14181c', '#2a3036', '#4a525a', '#7a848c', '#b8c2ca'),
  cyan: ramp('#0e3a48', '#1a8aa0', '#3ad0e0', '#a8f6ff', '#ffffff'), core: ramp('#0a3a1a', '#1aa040', '#5aff8a', '#d0ffe0', '#ffffff'),
  out: B.pal({ o: '#060a08' }).o
};
const tone = (s, f, r, x, y, v) => { const fv = clamp01(v) * (r.length - 1); const lo = Math.floor(fv); s.set(f, x, y, r[Math.min(r.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };
const S3 = Math.sqrt(3);
// Flat-top hex cell of a point: centre and the distance to the cell edge.
function hexCell(x, y, size) {
  const q = (2 / 3 * x) / size; const r = (-1 / 3 * x + S3 / 3 * y) / size; let cx = q; let cz = r; let cy = -q - r;
  let rx = Math.round(cx); let ry = Math.round(cy); let rz = Math.round(cz);
  const dx = Math.abs(rx - cx); const dy = Math.abs(ry - cy); const dz = Math.abs(rz - cz);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  const hx = size * 1.5 * rx; const hy = size * S3 * (rz + rx / 2);
  const lx = Math.abs(x - hx); const ly = Math.abs(y - hy);
  return { q: rx, r: rz, hx, hy, edge: size * S3 / 2 - Math.max(ly, lx * S3 / 2 + ly / 2) };
}

function carapace() {
  const bk = new Sheet('as_A10_back', 128, 128, 6, { anchor: 'center' }); const fr = new Sheet('as_A10_front', 128, 128, 6, { anchor: 'center' });
  const CX = 64; const CY = 64; const sx = CX - 10; const sy = CY + 2; const RX = 31; const RY = 38;
  for (let f = 0; f < 6; f++) {
    const pulse = .5 + .5 * Math.sin(f / 6 * TAU);
    for (let y = -RY; y <= RY; y++) for (let x = -RX; x <= RX; x++) {
      const e = (x / RX) ** 2 + (y / RY) ** 2; if (e > 1) continue;
      const light = 1 - Math.hypot(x / RX + .35, y / RY + .4) * .55;
      if (e > .8) { const strip = e > .86 && e < .9 && ((Math.round(Math.atan2(y, x) * 20) + f) % 5 === 0); tone(bk, f, strip ? K.cyan : K.metal, sx + x, sy + y, strip ? .8 : light * .8); continue; }
      const c = hexCell(x * 1.08, y, 9.5);
      if (c.edge < 1.1) { tone(bk, f, K.plate, sx + x, sy + y, .05); continue; }
      const centre = c.q === 0 && c.r === 0;
      if (centre) { tone(bk, f, K.core, sx + x, sy + y, .45 + pulse * .35 + (c.edge > 4 ? .15 : 0)); continue; }
      const bevel = c.edge < 2.4 ? ((x - c.hx) + (y - c.hy) < 0 ? .18 : -.18) : 0;
      tone(bk, f, K.plate, sx + x, sy + y, light * .85 + bevel + ((c.q * 7 + c.r * 3) % 3) * .03);
    }
    // Thruster nozzles below the shell with flickering cyan exhaust.
    for (const [nx, ny] of [[sx - 14, sy + RY - 2], [sx + 8, sy + RY]]) {
      for (let y = 0; y < 6; y++) for (let x = -3 - (y >> 1); x <= 3 + (y >> 1); x++) tone(bk, f, K.metal, nx + x, ny + y, x < 0 ? .7 : .35);
      const L = 4 + ((f + nx) % 3) * 2; for (let y = 0; y < L; y++) for (let x = -2 + (y >> 2); x <= 2 - (y >> 2); x++) tone(bk, f, K.cyan, nx + x, ny + 6 + y, 1 - y / (L + 2));
    }
    B.selOutline(bk, f, K.out);
    for (const px of [CX - 44, CX + 36]) { const r = rng(900 + f + px); for (let q = 0; q < 2; q++) { const x = px + (r() - .5) * 8; const y = CY - 20 + r() * 60; tone(fr, f, K.cyan, x, y, 1); tone(fr, f, K.cyan, x + 1, y, .7); } }
  }
  return [bk, fr];
}
function cannon() {
  const s = new Sheet('kp_cannon', 48, 24, 3, { anchor: 'center' }); const cy = 12;
  for (let f = 0; f < 3; f++) {
    // Gauntlet grip at the left, the barrel (dark metal with green plate bands and cyan coils) to the right.
    for (let y = -6; y <= 6; y++) for (let x = 2; x <= 12; x++) tone(s, f, K.plate, x, cy + y, (y < 0 ? .75 : .45) - Math.abs(y) / 30);
    for (let y = -5; y <= 5; y++) for (let x = 12; x <= 40; x++) { const band = (x - 12) % 7; tone(s, f, band < 2 ? K.cyan : band === 6 ? K.plate : K.metal, x, cy + y, band < 2 ? (f ? .9 : .55) : (y < -1 ? .8 : y < 2 ? .55 : .3)); }
    for (let y = -7; y <= 7; y++) for (let x = 40; x <= 44; x++) tone(s, f, K.metal, x, cy + y, y < 0 ? .85 : .45);
    for (let y = -3; y <= 3; y++) tone(s, f, K.cyan, 45, cy + y, f === 0 ? .4 : f === 1 ? .8 : 1);
    if (f === 2) for (let r = 0; r < 2; r++) for (let y = -9 + r * 2; y <= 9 - r * 2; y++) tone(s, f, K.cyan, 46 - r, cy + y, .95);
    B.selOutline(s, f, K.out);
  }
  return s;
}
function shell() {
  const s = new Sheet('kp_shell', 48, 48, 8, { anchor: 'center' }); const c = 24; const R = 20;
  for (let f = 0; f < 8; f++) {
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, y); if (d > R) continue;
      // Sphere mapping: the plate pattern compresses toward the rim and scrolls with the roll.
      const k = Math.asin(Math.min(1, d / R)) / (Math.PI / 2); const ux = d ? x / d * k * R * 1.3 : 0; const uy = d ? y / d * k * R * 1.3 : 0;
      const light = 1 - Math.hypot(x / R + .4, y / R + .45) * .6;
      if (d > R - 2.5) { tone(s, f, K.metal, c + x, c + y, light * .7); continue; }
      const h = hexCell(ux + f * 4.2, uy, 7);
      if (h.edge < 1) { tone(s, f, K.plate, c + x, c + y, .05); continue; }
      const glow = ((h.q + 64) % 4 === 0 && (h.r + 64) % 3 === 1);
      tone(s, f, glow ? K.core : K.plate, c + x, c + y, glow ? .55 + light * .3 : light * .9);
    }
    for (let a = -2.6; a < -1.2; a += .04) tone(s, f, K.cyan, c + Math.cos(a) * (R - 1), c + Math.sin(a) * (R - 1), .9);
    B.selOutline(s, f, K.out);
  }
  return s;
}
function ring() {
  const s = new Sheet('kp_ring', 24, 24, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    for (const [r, v] of [[3 + f * .5, 1], [6 + f, .85], [9.5 + f * .4, .6]]) for (let a = 0; a < TAU; a += .03) tone(s, f, K.cyan, 12 + Math.cos(a) * r * .55, 12 + Math.sin(a) * r, v);
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) tone(s, f, K.cyan, 12 + x, 12 + y, 1);
    B.selOutline(s, f, K.out);
  }
  return s;
}
function shield() {
  const W = 112; const H = 96; const s = new Sheet('kp_shield', W, H, 4, { anchor: 'base', baseOffset: 6 }); const cx = W / 2; const gy = 88; const R = 50; const RY = 76;
  for (let f = 0; f < 4; f++) {
    for (let y = -RY; y <= 0; y++) for (let x = -R; x <= R; x++) {
      const e = (x / R) ** 2 + (y / RY) ** 2; if (e > 1) continue;
      const rim = e > .9; const h = hexCell(x, y + f * 1.5, 8);
      if (rim) tone(s, f, K.cyan, cx + x, gy + y, .7 + (e > .97 ? .2 : 0));
      else if (h.edge < .9) tone(s, f, K.cyan, cx + x, gy + y, ((h.q + h.r + f) % 4 === 0) ? .95 : .55);
    }
    for (let x = -R; x <= R; x++) tone(s, f, K.cyan, cx + x, gy, .8);
    B.selOutline(s, f, K.out);
  }
  return s;
}
module.exports = { konstruktSheets: () => [...carapace(), cannon(), shell(), ring(), shield()] };
