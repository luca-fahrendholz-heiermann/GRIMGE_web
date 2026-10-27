// GRIMGE — special runes, round 9 (hand-drawn quality; final density, drawn at scale .5 in game — at scale 1 a sheet px is a world px). Own designs.
//   geo_stone / geo_ice / geo_root / geo_bark  2×48×32: GeoPlatform pillars (S37 Eiszacken, S38 Schachtwuchs …) —
//                 frame 0 = a tileable body block (seams, cracks, facets / grain), frame 1 = the top cap with its lit top face
//   sanct_obelisk 1×40×160 (base) / sanct_circle 6×210×68: S43 Sanktuarium — ivory obelisk with a green crystal; ground circle
//   war_banner    6×64×200 (base): S44 Kriegsbanner — wooden pole, gold finial, red cloth with a gold emblem, waving
//   mark_kunai    2×40×14: S45 Blitzmarke — a kunai with a red-sealed paper tag (tag flaps)
//   seal_trap     2×52×22: S47 Bannfalle — a ground seal tag in a double ring (0 armed, 1 manual / hot)
//   shadow_charge 4×18×18: S48 Schattenkonter — a violet shadow charge
//   water_jet     6×48×30 tileable: S49 Flutstrahl — a pressure jet of water flowing right with foam crests
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01, rng } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
const OUT = (c) => B.pal({ o: c }).o;
const disc = (s, f, r, cx, cy, rx, ry, sh) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) tone(s, f, r, cx + x, cy + y, sh(x, y, e)); } };
const line = (s, f, r, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) tone(s, f, r, x0 + (x1 - x0) * i / n + k, y0 + (y1 - y0) * i / n, typeof v === 'function' ? v(i / n) : v); };
const LOOKS = {
  stone: { body: ramp('#2f2a24', '#4a4238', '#6d6253', '#8f8371', '#efe0bd'), vein: ramp('#8a6a3a', '#d9b77a') },
  ice: { body: ramp('#1c3c52', '#3a7aa0', '#8fd8ff', '#d9f6ff', '#ffffff'), vein: ramp('#8ae0ff', '#ffffff') },
  root: { body: ramp('#2a1c10', '#4a3420', '#6b4a2b', '#8a6640', '#d8f5b0'), vein: ramp('#4aa030', '#9be36a') },
  bark: { body: ramp('#24180e', '#3e2a18', '#5a3d22', '#7a5634', '#c8e8a0'), vein: ramp('#3a9a2a', '#7ddc5a') }
};
function geo(look) {
  const L = LOOKS[look]; const s = new Sheet(`geo_${look}`, 48, 32, 2, { anchor: 'center' }); const r = rng(look.length * 31);
  for (let f = 0; f < 2; f++) {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 48; x++) {
      const side = x < 6 ? .82 : x > 41 ? .32 : .55; let v = side;
      if (look === 'stone') { const row = Math.floor(y / 16); const bx = (x + row * 12) % 24; if (y % 16 === 0 || bx === 0) v = .15; else v += ((x * 7 + y * 3) % 11 === 0 ? .1 : 0); }
      if (look === 'ice') { const fac = Math.floor((x + y * .6) / 9) % 3; v = side + (fac === 0 ? .2 : fac === 1 ? 0 : -.12); if ((x + y) % 13 === 0) v = .95; }
      if (look === 'root' || look === 'bark') { const grain = Math.sin(x * .55 + Math.sin(y * .3) * 1.4); v = side + (grain > .7 ? .18 : grain < -.75 ? -.18 : 0); }
      if (f === 1 && y < 10) v = .78 + (y < 2 ? .15 : 0) - Math.abs(x - 24) / 120; // the lit top face
      if (f === 1 && y === 10) v = .2;
      tone(s, f, L.body, x, y, v);
    }
    // Veins / cracks.
    const n = look === 'ice' ? 2 : 3; for (let k = 0; k < n; k++) { let x = 8 + r() * 32; let y = f ? 12 : 0; for (let j = 0; j < 10; j++) { const nx = x + (r() - .5) * 6; const ny = y + 2 + r() * 2; line(s, f, L.vein, x, y, nx, ny, look === 'stone' ? .3 : .8); x = nx; y = ny; if (y > 31) break; } }
  }
  return s;
}
function sanctuary() {
  const ob = new Sheet('sanct_obelisk', 40, 160, 1, { anchor: 'base', baseOffset: 2 }); const iv = ramp('#3a3a30', '#8a8470', '#d8d2bc', '#fff8d6'); const gr = ramp('#1e3a14', '#4a8a2a', '#9be36a', '#e6ffd0');
  for (let y = 10; y <= 158; y++) { const w = y < 26 ? Math.round((y - 10) * .6) : Math.round(10 + (y - 26) * .03); for (let x = -w; x <= w; x++) tone(ob, 0, iv, 20 + x, y, (x < -2 ? .9 : x < 2 ? .65 : .4) - (y > 150 ? .25 : 0) + ((y % 24) === 0 ? -.2 : 0)); }
  for (let y = -12; y <= 12; y++) { const w = Math.round(6 * (1 - Math.abs(y) / 12)); for (let x = -w; x <= w; x++) tone(ob, 0, gr, 20 + x, 50 + y, x < 0 ? .95 : .65); }
  for (let k = 0; k < 4; k++) line(ob, 0, gr, 15, 80 + k * 16, 25, 80 + k * 16, .7); B.selOutline(ob, 0, OUT('#0a0a06'));
  const ci = new Sheet('sanct_circle', 210, 68, 6, { anchor: 'center' }); const cx = 105; const cy = 34; const R = 100;
  for (let f = 0; f < 6; f++) { for (let a = 0; a < TAU; a += .005) { tone(ci, f, gr, cx + Math.cos(a) * R, cy + Math.sin(a) * R * .32, .9); tone(ci, f, gr, cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1) * .32, .7); tone(ci, f, iv, cx + Math.cos(a) * R * .82, cy + Math.sin(a) * R * .82 * .32, .85); }
    for (const off of [0, Math.PI / 3]) for (let i = 0; i < 3; i++) { const a0 = off + f / 6 * TAU / 6 + i * TAU / 3; const a1 = a0 + TAU / 3; line(ci, f, gr, cx + Math.cos(a0) * R * .78, cy + Math.sin(a0) * R * .78 * .32, cx + Math.cos(a1) * R * .78, cy + Math.sin(a1) * R * .78 * .32, .6); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - f / 6 * TAU / 12; tone(ci, f, iv, cx + Math.cos(a) * R * .91, cy + Math.sin(a) * R * .29, 1); }
    B.selOutline(ci, f, OUT('#0a1206')); }
  return [ob, ci];
}
function banner() {
  const s = new Sheet('war_banner', 64, 200, 6, { anchor: 'base', baseOffset: 2 }); const wood = ramp('#2a1a10', '#5d4037', '#8a6040'); const red = ramp('#4a0a0a', '#8a1414', '#c62828', '#e53935', '#ff8a80'); const gold = ramp('#7a5a10', '#d8a830', '#ffd27a', '#fff1c2');
  for (let f = 0; f < 6; f++) {
    for (let y = 14; y <= 198; y++) for (let x = 0; x < 3; x++) tone(s, f, wood, 8 + x, y, x === 0 ? .9 : .5);
    for (let y = 2; y <= 14; y++) { const w = Math.round((14 - y) * .3); for (let x = -w; x <= w; x++) tone(s, f, gold, 9 + x, y, x < 0 ? 1 : .6); }
    for (let u = 0; u <= 1; u += .01) { const x = 11 + u * 50; const wave = Math.sin(f / 6 * TAU - u * 5) * 4 * u; const top = 18 + wave; const bot = 18 + 52 - u * 10 + wave + (u > .8 && (Math.round(u * 40) % 3 === 0) ? -6 : 0); for (let y = top; y <= bot; y++) tone(s, f, red, x, y, (y < top + 3 ? .9 : .55) + (Math.sin(f / 6 * TAU - u * 5) > .4 ? .15 : 0)); tone(s, f, gold, x, top, .85); }
    disc(s, f, gold, 30, 42 + Math.round(Math.sin(f / 6 * TAU - 1.9) * 2), 6, 6, (x, y, e) => (e > .55 ? .9 : .5));
    for (let x = 11; x <= 22; x++) tone(s, f, gold, x, 18, 1);
    B.selOutline(s, f, OUT('#0a0404'));
  }
  return s;
}
function kunai() {
  const s = new Sheet('mark_kunai', 40, 14, 2, { anchor: 'center' }); const st = ramp('#2a2c34', '#6a7080', '#cfd8dc', '#ffffff'); const dk = ramp('#0a0a0a', '#1a1a1a', '#3a3a3a'); const tag = ramp('#c8b080', '#ffe082', '#fff6d8'); const red = ramp('#7a0a0a', '#b71c1c');
  for (let f = 0; f < 2; f++) { for (let a = 0; a < TAU; a += .2) tone(s, f, dk, 14 + Math.cos(a) * 3, 7 + Math.sin(a) * 3, .9); for (let x = 17; x <= 23; x++) for (let d = -1; d <= 1; d++) tone(s, f, dk, x, 7 + d, (x + d) % 2 ? .3 : .7);
    for (let x = 24; x <= 38; x++) { const w = Math.round(4 * (1 - (x - 24) / 15)); for (let d = -w; d <= w; d++) tone(s, f, st, x, 7 + d, d < 0 ? .9 : d === 0 ? 1 : .5); }
    const fl = f ? 1 : -1; for (let y = -3; y <= 3; y++) for (let x = 2; x <= 9; x++) tone(s, f, tag, x, 7 + y + Math.round(fl * (9 - x) * .15), .7); for (let y = -2; y <= 2; y++) tone(s, f, red, 5, 7 + y, 1); B.selOutline(s, f, OUT('#000000')); }
  return s;
}
function sealTrap() {
  const s = new Sheet('seal_trap', 52, 22, 2, { anchor: 'center' }); const br = ramp('#3e2723', '#8d6e63', '#d84315', '#ffab91'); const tag = ramp('#c8b080', '#f6e7b8', '#fff3c4'); const red = ramp('#7a0a0a', '#b71c1c');
  for (let f = 0; f < 2; f++) { for (let a = 0; a < TAU; a += .01) { tone(s, f, br, 26 + Math.cos(a) * 24, 11 + Math.sin(a) * 8, f ? .8 : .5); tone(s, f, br, 26 + Math.cos(a) * 15, 11 + Math.sin(a) * 5, f ? .9 : .55); } for (let y = 4; y <= 16; y++) for (let x = 20; x <= 32; x++) tone(s, f, tag, x, y, x < 23 ? .9 : .6); line(s, f, red, 26, 6, 26, 15, 1); line(s, f, red, 23, 10, 29, 10, 1); B.selOutline(s, f, OUT('#0a0402')); }
  return s;
}
function shadowCharge() { const s = new Sheet('shadow_charge', 18, 18, 4, { anchor: 'center' }); const v = ramp('#1a0f33', '#4527a0', '#7c4dff', '#b39ddb', '#ede7f6'); for (let f = 0; f < 4; f++) { disc(s, f, v, 9, 9, 6, 6, (x, y, e) => (e > .7 ? .35 : x + y < -2 ? .95 : .6)); for (let i = 0; i < 3; i++) { const a = f / 4 * TAU / 3 + i * TAU / 3; tone(s, f, v, 9 + Math.cos(a) * 8, 9 + Math.sin(a) * 8, .85); } B.selOutline(s, f, OUT('#06040e')); } return s; }
function waterJet() {
  const W = 48; const s = new Sheet('water_jet', W, 30, 6, { anchor: 'center' }); const wt = ramp('#0b3d73', '#1f7fd1', '#5aaee8', '#d6f6ff', '#ffffff'); const cy = 15;
  for (let f = 0; f < 6; f++) { const off = f * 8; for (let x = 0; x < W; x++) { const top = cy - 9 + Math.round(Math.sin((x - off) / W * TAU * 2) * 1.5); const bot = cy + 9 - Math.round(Math.sin((x - off) / W * TAU * 2 + 1) * 1.5); for (let y = top; y <= bot; y++) { const d = Math.abs(y - cy) / 9; tone(s, f, wt, x, y, d > .8 ? .2 : d > .45 ? .45 : .7); } tone(s, f, wt, x, top, .9); }
    for (let i = 0; i < 3; i++) { const b = (i * 16 + off) % W; for (const dd of [-W, 0, W]) for (let k = 0; k < 7; k++) { const x = b + dd - k; if (x < 0 || x >= W) continue; tone(s, f, wt, x, cy - 3 + Math.round(k * .4), k < 2 ? 1 : .85); tone(s, f, wt, x, cy + 4 - Math.round(k * .3), k < 3 ? .95 : .7); } }
    B.selOutline(s, f, OUT('#020a18')); }
  return s;
}
module.exports = { runes9Sheets: () => [geo('stone'), geo('ice'), geo('root'), geo('bark'), ...sanctuary(), banner(), kunai(), sealTrap(), shadowCharge(), waterJet()] };
