// GRIMGE — domain (Sphäre) effect sprites (drawn at scale 1: a sheet px is a world px). Own designs.
//   spirit_wolf 6×64×36  S66 Jagdgrund — a pale-gold spirit wolf leaping right (run cycle, mane wisps)
//   rift_tear   4×24×76 (base) S68 Leere — a vertical void tear with violet lightning edges
//   hex_wall    4×34×112 (base) S85 Bollwerk — a honeycomb wall of violet shield hexes with a running light pulse
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
const OUT = (c) => B.pal({ o: c }).o;
const line = (s, f, r, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) tone(s, f, r, x0 + (x1 - x0) * i / n + k, y0 + (y1 - y0) * i / n, typeof v === 'function' ? v(i / n) : v); };
const disc = (s, f, r, cx, cy, rx, ry, sh) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) tone(s, f, r, cx + x, cy + y, sh(x, y, e)); } };

function wolf() {
  // Galloping wolf facing right: deep chest, tucked waist, long neck, pointed snout, two-joint legs, bushy tail, spirit flames on the back.
  const s = new Sheet('spirit_wolf', 64, 36, 6, { anchor: 'center' }); const w = ramp('#4a3010', '#a07a3a', '#e0b060', '#ffe0a0', '#fff8e8', '#ffffff');
  const lerp = (a, b, u) => a + (b - a) * u;
  for (let f = 0; f < 6; f++) {
    const ph = f / 6 * TAU; const bob = Math.round(-Math.abs(Math.sin(ph)) * 2); const str = Math.sin(ph);
    // torso: top line and belly line per column
    for (let x = 14; x <= 44; x++) { const u = (x - 14) / 30; const top = 12 - Math.round(Math.sin(u * Math.PI) * 2) + bob; const bot = Math.round(u < .45 ? lerp(19, 18, u / .45) : lerp(18, 25, (u - .45) / .55)) + bob;
      for (let y = top; y <= bot; y++) { const v = (y - top) / Math.max(1, bot - top); tone(s, f, w, x, y, v < .25 ? .8 : v < .7 ? .6 : .4); } }
    // neck and head
    for (let k = 0; k <= 10; k++) { const nx = Math.round(lerp(40, 49, k / 10)); const ny = Math.round(lerp(14, 8, k / 10)) + bob; for (let d = -4; d <= 3; d++) tone(s, f, w, nx, ny + d, d < -1 ? .8 : .6); }
    disc(s, f, w, 50, 8 + bob, 5, 4, (x, y) => (y < 0 ? .85 : .6));
    for (let x = 54; x <= 61; x++) { const u = (x - 54) / 7; const t0 = Math.round(lerp(6, 9, u)) + bob; const t1 = Math.round(lerp(11, 10, u)) + bob; for (let y = t0; y <= t1; y++) tone(s, f, w, x, y, y === t0 ? .85 : .6); }
    tone(s, f, w, 61, 9 + bob, .05); // nose
    for (const ex of [46, 49]) for (let k = 0; k < 5; k++) for (let d = 0; d < Math.max(1, 3 - k); d++) tone(s, f, w, ex + d + Math.round(k * .4), 4 - k + bob, k > 2 ? .95 : .8); // ears
    tone(s, f, w, 53, 7 + bob, .05); tone(s, f, w, 54, 7 + bob, 1); // eye
    // legs: [hipX, hipY, swing phase]; upper segment then lower, paws at the bottom
    const legs = [[18, 18, ph + Math.PI, .45], [22, 18, ph + Math.PI + .6, .6], [38, 22, ph, .45], [42, 22, ph + .6, .6]];
    for (const [hx, hy, a, v] of legs) { const sw = Math.sin(a); const kx = hx + Math.round(sw * 4); const ky = hy + 6 + bob; const fx = kx + Math.round(sw * 4 + (hx < 30 ? -1 : 1) * Math.max(0, Math.cos(a)) * 3); const fy = Math.min(33, ky + 7 - Math.round(Math.max(0, Math.cos(a)) * 3));
      line(s, f, w, hx, hy + bob, kx, ky, v, 2); line(s, f, w, kx, ky, fx, fy, v - .1, 2); tone(s, f, w, fx + 2, fy, v); }
    // bushy tail curving back and up, swaying with the stride
    for (let k = 0; k <= 14; k++) { const u = k / 14; const tx = Math.round(14 - u * 12); const ty = Math.round(13 - Math.sin(u * 2.4) * 5 + str * u * 2) + bob; const r = Math.max(1, Math.round(3 * Math.sin(Math.PI * (u * .8 + .2)))); for (let d = -r; d <= r; d++) tone(s, f, w, tx, ty + d, d < 0 ? .85 : .55); }
    // spirit flames licking off the back (pale, shift every frame)
    for (let i = 0; i < 5; i++) { const fx0 = 18 + i * 6; const top = 11 - Math.round(Math.sin(((fx0 - 14) / 30) * Math.PI) * 2) + bob; const h = 2 + ((i + f) % 3); for (let k = 1; k <= h; k++) tone(s, f, w, fx0 - Math.round(k * .7), top - k, k === h ? 1 : .9); }
    B.selOutline(s, f, OUT('#1a0e04'));
  }
  return s;
}
function riftTear() {
  const s = new Sheet('rift_tear', 24, 76, 4, { anchor: 'base', baseOffset: 2 }); const v = ramp('#1a0020', '#4a0a6a', '#a02ad8', '#e040fb', '#ffd8ff');
  for (let f = 0; f < 4; f++) {
    for (let y = 6; y <= 74; y++) { const u = (y - 6) / 68; const w = Math.round(5 * Math.sin(Math.PI * u)); for (let x = -w; x <= w; x++) tone(s, f, v, 12 + x, y, Math.abs(x) === w ? .7 : .02); }
    let x = 12; for (let y = 6; y <= 74; y += 6) { const nx = 12 + ((y / 6 + f) % 2 ? 7 : -7) * Math.sin(Math.PI * (y - 6) / 68); line(s, f, v, x, y, nx, y + 6, .95); x = nx; }
    B.selOutline(s, f, OUT('#000000'));
  }
  return s;
}
function hexWall() {
  // Honeycomb wall: two offset columns of flat-top hexes, dithered glass fill, bright rims, a light pulse running up.
  const s = new Sheet('hex_wall', 34, 112, 4, { anchor: 'base', baseOffset: 2 }); const v = ramp('#1a0a3a', '#4527a0', '#7e57c2', '#b388ff', '#ede7f6');
  const R = 8; const H = Math.round(R * Math.sqrt(3) / 2);
  for (let f = 0; f < 4; f++) {
    for (let col = 0; col < 2; col++) for (let row = 0; row < 8; row++) { const cx = 10 + col * 13; const cy = 101 - row * (2 * H + 1) - col * (H + 1); if (cy - H < 2) continue; const lit = (row * 2 + col + 7 - f * 2) % 8 < 2;
      for (let y = -H; y <= H; y++) for (let x = -R; x <= R; x++) { const e = Math.max(Math.abs(y) / H, (Math.abs(x) + Math.abs(y) / Math.sqrt(3)) / R); if (e > 1) continue;
        if (e > .82) tone(s, f, v, cx + x, cy + y, lit ? 1 : y < 0 ? .8 : .6); else if ((x + y) % 2 === 0) tone(s, f, v, cx + x, cy + y, lit ? .6 : .3); } }
    B.selOutline(s, f, OUT('#06021a'));
  }
  return s;
}
module.exports = { domainSheets: () => [wolf(), riftTear(), hexWall()] };
