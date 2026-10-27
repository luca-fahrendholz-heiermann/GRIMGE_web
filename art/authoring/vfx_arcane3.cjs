// GRIMGE — new Arcane States from the user's example sprites (27 Oct 2026; own designs, no foreign characters).
// Manifestation sheets as_<id>_back / _front, 128×128, chest at (64, 64), facing right; big parts on the back layer.
//   A12 Donnerkranz   a gold ring behind the shoulders carrying six drums, lightning arcing drum to drum (sprite 17)
//   A13 Totenmaske    a tall black-red crest plume and tattered war banners on the back, green soul fire (13/14, 19)
//   A14 Feuersiegel   a burning seal wheel behind the back, flame tongues off its spokes, ember swirl (23)
//   Extra sheets: soul_skull (green soul-fire skull, 6 frames 40×40) and seal_mark (fire seal glyph, 4 frames 28×28)
const B = require('./vfx_brush.cjs');
const F = require('./vfx_fire.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
const pair = (id, n) => [new Sheet(`as_${id}_back`, 128, 128, n, { anchor: 'center' }), new Sheet(`as_${id}_front`, 128, 128, n, { anchor: 'center' })];
const CX = 64; const CY = 64; const OUT = (c) => B.pal({ o: c }).o;
const disc = (s, f, r, x, y, rx, ry, shade) => { for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) { const e = (dx / rx) ** 2 + (dy / ry) ** 2; if (e <= 1) tone(s, f, r, x + dx, y + dy, shade(dx, dy, e)); } };
const zig = (s, f, r, x0, y0, x1, y1, seed) => { const q = rng(seed); let px = x0; let py = y0; const n = 5; for (let j = 1; j <= n; j++) { const L = Math.hypot(x1 - x0, y1 - y0) || 1; const off = (j < n ? (j % 2 ? 1 : -1) * (2 + q() * 4) : 0); const nx = x0 + (x1 - x0) * j / n - (y1 - y0) / L * off; const ny = y0 + (y1 - y0) * j / n + (x1 - x0) / L * off; const m = Math.ceil(Math.hypot(nx - px, ny - py)); for (let k = 0; k <= m; k++) tone(s, f, r, px + (nx - px) * k / m, py + (ny - py) * k / m, k % 2 ? 1 : .75); px = nx; py = ny; } };
const sparks = (fr, f, r, seed) => { for (const sx of [CX - 42, CX + 40]) { const q = rng(seed + f + sx); for (let i = 0; i < 2; i++) { const x = sx + (q() - .5) * 10; const y = CY - 30 + q() * 70; tone(fr, f, r, x, y, 1); tone(fr, f, r, x + 1, y + 1, .7); } } };

function a12() {
  const [bk, fr] = pair('A12', 8); const gold = ramp('#4a3010', '#a8781e', '#e6c062', '#fff4c8'); const drum = ramp('#3a1a10', '#7a3a1e', '#b8662e', '#e8a05a'); const skin = ramp('#8a7a5a', '#d8c8a0', '#fff6dc'); const bolt = ramp('#7a8a20', '#fff07a', '#ffffff');
  for (let f = 0; f < 8; f++) {
    const cx = CX - 2; const cy = CY - 30; const R = 50; const ry = .5;
    // A thick gold ring (lit top edge, dark underside) behind the shoulders.
    for (let a = 0; a < TAU; a += .004) for (let d = 0; d < 5; d++) tone(bk, f, gold, cx + Math.cos(a) * (R - d * .6), cy + Math.sin(a) * R * ry + d - 2, d === 0 ? .95 : d < 3 ? .65 : .3);
    const drums = Array.from({ length: 6 }, (_, i) => { const a = i / 6 * TAU + .3; return [Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R * ry)]; });
    // Drums: barrel bodies with gold hoops and studs, light skins; the ones in front sit lower in the pass order.
    drums.forEach(([x, y], i) => { for (let yy = -9; yy <= 9; yy++) for (let xx = -8; xx <= 8; xx++) { const e = (xx / 8.5) ** 2 * (1 - (yy / 14) ** 2 * .3); if (e > 1) continue; const head = Math.abs(yy) > 6; const hoop = Math.abs(yy) === 6 || Math.abs(yy) === 1; tone(bk, f, head ? skin : hoop ? gold : drum, x + xx, y + yy, head ? (yy < 0 ? .95 : .55) : hoop ? .8 : (xx < -2 ? .85 : xx < 3 ? .6 : .35)); }
      for (const sx of [-5, 0, 5]) tone(bk, f, gold, x + sx, y - 3, 1); });
    const k = f % 6; zig(bk, f, bolt, drums[k][0], drums[k][1], drums[(k + 1) % 6][0], drums[(k + 1) % 6][1], 500 + f); zig(bk, f, bolt, drums[(k + 3) % 6][0], drums[(k + 3) % 6][1], drums[(k + 4) % 6][0], drums[(k + 4) % 6][1], 520 + f);
    if (f % 2 === 0) zig(bk, f, bolt, drums[(k + 2) % 6][0], drums[(k + 2) % 6][1] - 8, drums[(k + 2) % 6][0] + 8, drums[(k + 2) % 6][1] - 30, 600 + f);
    B.selOutline(bk, f, OUT('#140a04')); sparks(fr, f, bolt, 700);
  }
  return [bk, fr];
}
function a13() {
  const [bk, fr] = pair('A13', 8); const plume = ramp('#1a0204', '#4a0a10', '#8a1420', '#c8283a', '#ff5a5a'); const cloth = ramp('#0a0a0e', '#1e1e26', '#3a3a48', '#5a5a6a'); const soul = ramp('#0a3a2a', '#1aa070', '#4fffb0', '#d0ffe8'); const pole = ramp('#2a1a10', '#5a3a20', '#8a6038'); const gold = ramp('#4a3010', '#a8781e', '#e6c062');
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    // Crest plume: a big horsehair arc rising from the helmet crown and sweeping back and down (14 strands).
    for (let i = 0; i < 14; i++) { const L = 46 + Math.sin(i * 1.7) * 5; for (let r = 0; r < L; r++) { const u = r / L; const sw = Math.sin(u * 5 + ph * TAU + i * .4) * u * 3; const x = CX - 2 - u * 44 + sw * .4 - i * .5; const y = CY - 40 - Math.sin(u * Math.PI * .9) * 26 + u * 22 + i * 1.1 + sw; tone(bk, f, plume, x, y, .35 + (i % 4) * .14 + (u < .1 ? .2 : 0)); tone(bk, f, plume, x, y + 1, .25 + (i % 4) * .1); } }
    for (let k = -3; k <= 3; k++) { tone(bk, f, gold, CX - 2 + k, CY - 40, .9); tone(bk, f, gold, CX - 2 + k, CY - 39, .5); } // crest holder
    // Two tattered war banners on poles behind the back: dark cloth, red emblem, notched edges, waving.
    for (const [bx, top, h, w0] of [[CX - 28, CY - 70, 46, 20], [CX - 14, CY - 62, 38, 16]]) {
      for (let y = 0; y < 82; y++) { tone(bk, f, pole, bx, top + y, .65); tone(bk, f, pole, bx + 1, top + y, .35); }
      for (let k = -2; k <= 2; k++) tone(bk, f, gold, bx + k, top - 1, .9);
      for (let y = 2; y < h; y++) { const wv = Math.round(Math.sin(y * .22 + ph * TAU + bx) * 2); const w = w0 - Math.floor(y / 9) + ((y % 8) < 2 ? -4 : 0); for (let x = 1; x <= w; x++) tone(bk, f, cloth, bx - x + wv, top + y, x === 1 ? .9 : x === w ? .25 : .5); }
      for (let y = 10; y < 20; y++) for (let x = 5; x <= 10; x++) if (Math.abs(x - 7.5) + Math.abs(y - 15) < 5) tone(bk, f, plume, bx - x, top + y, .75); // emblem
    }
    // Green soul flames off the shoulders: teardrop tongues with a white core.
    for (let q = 0; q < 6; q++) { const life = (ph + q / 6) % 1; const x = CX + (q % 2 ? 24 : -34) + Math.sin(life * 6 + q) * 3; const y = CY - 14 - life * 40; const H = 8; for (let j = 0; j < H; j++) { const w = Math.max(0, Math.round(3 * (1 - j / H) * (1 - life * .5))); for (let d = -w; d <= w; d++) tone(bk, f, soul, x + d, y - j, Math.abs(d) === w ? .35 : j < 3 ? 1 : .75); } }
    B.selOutline(bk, f, OUT('#040205')); sparks(fr, f, soul, 730);
  }
  return [bk, fr];
}
function a14() {
  const [bk, fr] = pair('A14', 8); const iron = ramp('#1a0a06', '#3a1a10', '#6a3018', '#a85020'); const glow = ramp('#8a1a00', '#ff5a1f', '#ffd27a', '#fff3c4');
  for (let f = 0; f < 8; f++) {
    const ph = f / 8; const cx = CX - 8; const cy = CY - 6; const R = 34; const rot = ph * TAU / 6;
    // The seal wheel: rim with glyph notches, six spokes, a burning hub.
    for (let a = 0; a < TAU; a += .006) for (let d = 0; d < 4; d++) { const notch = Math.floor((a + rot) / TAU * 24) % 2 === 0 && d === 1; tone(bk, f, notch ? glow : iron, cx + Math.cos(a) * (R - d), cy + Math.sin(a) * (R - d) * .9, notch ? .8 : d === 0 ? .85 : .45); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + rot; for (let r = 5; r < R - 3; r++) for (let w = 0; w < 2; w++) tone(bk, f, iron, cx + Math.cos(a) * r - Math.sin(a) * w, cy + (Math.sin(a) * r + Math.cos(a) * w) * .9, w ? .4 : .7); F.flame(bk, f, cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2) * .9, 10 + (i % 2) * 4, 5, { dir: a, lean: 0, ph: (ph * 2 + i * .3) * TAU, cool: .1 }); }
    disc(bk, f, glow, cx, cy, 6, 6, (dx, dy, e) => (e > .6 ? .4 : .95));
    for (let q = 0; q < 10; q++) { const a = q / 10 * TAU + ph * TAU * .5; const r = R + 8 + (q % 3) * 3; tone(bk, f, glow, cx + Math.cos(a) * r, cy + Math.sin(a) * r * .9, .9); }
    B.selOutline(bk, f, OUT('#120400')); sparks(fr, f, glow, 760);
  }
  return [bk, fr];
}
function soulSkull() {
  const s = new Sheet('soul_skull', 40, 40, 6, { anchor: 'center' }); const soul = ramp('#0a3a2a', '#1aa070', '#4fffb0', '#d0ffe8', '#ffffff'); const bone = ramp('#3a4a40', '#8aa898', '#d8f0e0', '#ffffff');
  for (let f = 0; f < 6; f++) {
    const ph = f / 6; const cx = 20; const cy = 22;
    for (let i = 0; i < 7; i++) F.flame(s, f, cx - 9 + i * 3, cy - 2, 10 + (i % 3) * 3, 5, { ph: (ph * 2 + i * .4) * TAU, cool: 0 });
    // recolour the flame green: draw the skull over a green fire made of tongues
    for (let y = -8; y <= 7; y++) for (let x = -7; x <= 7; x++) { const e = (x / 7.5) ** 2 + ((y + 1) / 8.5) ** 2; if (e > 1 && !(y > 3 && Math.abs(x) < 5)) continue; const eye = (Math.abs(x + 3) < 2 || Math.abs(x - 3) < 2) && y > -3 && y < 1; const nose = Math.abs(x) < 1 && y > 1 && y < 4; const teeth = y > 4 && x % 2 === 0; tone(s, f, eye || nose || teeth ? soul : bone, cx + x, cy + y, eye ? 1 : nose || teeth ? .2 : (x < 0 ? .85 : .55)); }
    B.selOutline(s, f, OUT('#020a06'));
  }
  // Make the flames soul-green: every warm (fire) pixel is mapped onto the soul ramp by its brightness.
  const d = s.png.data;
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const r = d[i]; const g = d[i + 1]; const b = d[i + 2]; if (!(r > g + 20 && r > b + 30)) continue; const L = (r * .5 + g * .4 + b * .1) / 255; const c = soul[Math.min(soul.length - 1, Math.floor(L * soul.length * 1.1))]; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
  return s;
}
function sealMark() {
  const s = new Sheet('seal_mark', 28, 28, 4, { anchor: 'center' }); const glow = ramp('#8a1a00', '#ff5a1f', '#ffd27a', '#fff3c4');
  for (let f = 0; f < 4; f++) {
    for (let a = 0; a < TAU; a += .03) tone(s, f, glow, 14 + Math.cos(a) * 10, 14 + Math.sin(a) * 10, (Math.floor(a * 4 + f) % 3) ? .75 : 1);
    for (let k = -6; k <= 6; k++) { tone(s, f, glow, 14 + k, 14, .9); tone(s, f, glow, 14, 14 + k, .9); tone(s, f, glow, 14 + Math.round(k * .7), 14 + Math.round(k * .7), .6); }
    B.selOutline(s, f, OUT('#120400'));
  }
  return s;
}
module.exports = { arcane3Sheets: () => [...a12(), ...a13(), ...a14(), soulSkull(), sealMark()] };
