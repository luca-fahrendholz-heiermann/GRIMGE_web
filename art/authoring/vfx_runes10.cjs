// GRIMGE — special runes, round 10 (hand-drawn quality; drawn at scale 1: a sheet px is a world px). Own designs.
//   blood_circle 6×100×40  S51 Blutkreuz — a blood circle with an inverted triangle and runes (pulsing)
//   blood_cross  1×80×110 (base) S51 — the blood cross with chains
//   cry_sigil    4×22×26  S52 Herausforderung — a gold-red war sigil over the head
//   shadow_hands 4×40×84 (base) S54 Schattenbindung — two clawed shadow hands climbing (frames: rise stages)
//   azure_flame  6×28×50 (base) S55 Azurflamme — a roaring blue hand flame
//   seal_cube    4×64×74 (base) S70 Bannwürfel — a glassy sealing cube with lit edges and rune corners
//   rage_core    4×44×44  S71 Zornstrahl — a red-black core with a crackling rim
//   mist_puff    6×30×30  S74 Trugbild — a burst double dissolving into lilac mist
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
const OUT = (c) => B.pal({ o: c }).o;
const disc = (s, f, r, cx, cy, rx, ry, sh) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) tone(s, f, r, cx + x, cy + y, sh(x, y, e)); } };
const line = (s, f, r, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) tone(s, f, r, x0 + (x1 - x0) * i / n + k, y0 + (y1 - y0) * i / n, typeof v === 'function' ? v(i / n) : v); };
const C = {
  blood: ramp('#1a0306', '#5c0a14', '#a01622', '#d32f2f', '#ff8a80'), iron: ramp('#1a1a1e', '#3a3a42', '#6a6a74'),
  gold: ramp('#5a3a08', '#b07a10', '#ffca28', '#fff3c4'), war: ramp('#2a0d05', '#7a1a10', '#b71c1c', '#ff6a5a'),
  ink: ramp('#000000', '#0b0b12', '#2a2240', '#5e4b8b', '#9d8bd6'), azure: ramp('#0a2a5c', '#1565c0', '#40c4ff', '#b8eaff', '#ffffff'),
  ice: ramp('#0d2b3a', '#2a6a8a', '#4fc3f7', '#e1f5fe', '#ffffff'), rage: ramp('#120000', '#4a0000', '#b71c1c', '#ff5252', '#ffffff'),
  mist: ramp('#2a1a33', '#7b5a8c', '#c8a0d8', '#e1bee7', '#ffffff')
};
const S = (n, w, h, k, base) => new Sheet(n, w, h, k, base ? { anchor: 'base', baseOffset: 2 } : { anchor: 'center' });

function bloodCircle() { const s = S('blood_circle', 100, 40, 6); const cx = 50; const cy = 20; const R = 48; const ry = 18;
  for (let f = 0; f < 6; f++) { const pulse = .7 + .3 * Math.sin(f / 6 * TAU);
    for (let a = 0; a < TAU; a += .006) { for (let d = 0; d < 2; d++) tone(s, f, C.blood, cx + Math.cos(a) * (R - d), cy + Math.sin(a) * (ry - d * .4), pulse + (d ? -.2 : 0)); tone(s, f, C.blood, cx + Math.cos(a) * R * .82, cy + Math.sin(a) * ry * .82, pulse - .15); }
    line(s, f, C.blood, cx - R * .7, cy - ry * .5, cx + R * .7, cy - ry * .5, pulse, 2); line(s, f, C.blood, cx + R * .7, cy - ry * .5, cx, cy + ry * .8, pulse, 2); line(s, f, C.blood, cx, cy + ry * .8, cx - R * .7, cy - ry * .5, pulse, 2);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + f * .07; const x = cx + Math.cos(a) * R * .91; const y = cy + Math.sin(a) * ry * .91; tone(s, f, C.blood, x, y, 1); tone(s, f, C.blood, x + 1, y, .9); tone(s, f, C.blood, x, y - 1, .9); }
    B.selOutline(s, f, OUT('#0a0002')); } return s; }
function bloodCross() { const s = S('blood_cross', 80, 110, 1, true);
  for (let y = 4; y <= 108; y++) for (let x = -5; x <= 5; x++) tone(s, 0, C.blood, 40 + x, y, (x < -2 ? .8 : x < 2 ? .55 : .35) + ((y % 18) === 0 ? -.25 : 0));
  for (let x = -38; x <= 38; x++) for (let y = -5; y <= 5; y++) tone(s, 0, C.blood, 40 + x, 26 + y + Math.round(x * .03), (y < -2 ? .8 : y < 2 ? .55 : .35) + ((x % 16) === 0 ? -.25 : 0));
  for (const sg of [-1, 1]) for (let k = 0; k < 7; k++) disc(s, 0, C.iron, 40 + sg * (30 - k * 2), 34 + k * 4, 2, 1, (x, y) => (y < 0 ? .9 : .4));
  B.selOutline(s, 0, OUT('#0a0002')); return s; }
function crySigil() { const s = S('cry_sigil', 22, 26, 4); for (let f = 0; f < 4; f++) { for (let y = 2; y <= 20; y++) { const w = y < 14 ? 8 : Math.round(8 - (y - 14) * 1.3); for (let x = -w; x <= w; x++) tone(s, f, C.war, 11 + x, y, x < 0 ? .8 : .55); } for (let y = 2; y <= 20; y++) { tone(s, f, C.gold, 3, y, .8); tone(s, f, C.gold, 19, y, .8); } line(s, f, C.gold, 11, 6, 11, 14, f % 2 ? 1 : .8, 2); tone(s, f, C.gold, 11, 17, 1); tone(s, f, C.gold, 12, 17, 1); B.selOutline(s, f, OUT('#0a0402')); } return s; }
function shadowHands() { const s = S('shadow_hands', 40, 84, 4, true);
  for (let f = 0; f < 4; f++) { const h = 30 + f * 16;
    for (const sg of [-1, 1]) for (let j = 0; j < 3; j++) { const hh = h * (1 - j * .16); const x0 = 20 + sg * (8 - j * 2); for (let i = 0; i <= 60; i++) { const u = i / 60; const x = x0 + sg * u * u * 7; const y = 82 - u * hh; const w = Math.max(1, Math.round(3 * (1 - u * .7))); for (let d = -w; d <= w; d++) tone(s, f, C.ink, x + d, y, Math.abs(d) === w ? .9 : .3 + u * .3); } for (let k = 0; k < 4; k++) tone(s, f, C.ink, x0 + sg * (7 + k), 82 - hh - k, 1); }
    B.selOutline(s, f, OUT('#000000')); } return s; }
function azureFlame() { const s = S('azure_flame', 28, 50, 6, true);
  for (let f = 0; f < 6; f++) { for (let k = 0; k < 3; k++) { const H = 40 - k * 9 + ((f + k) % 3) * 3; const ox = 14 + (k - 1) * 4; for (let j = 0; j < H; j++) { const u = j / H; const w = Math.max(0, Math.round((6 - k) * Math.sin(Math.PI * (1 - u) * .85))); const sw = Math.round(Math.sin(u * 6 + f * 1.2 + k) * 2 * u); for (let d = -w; d <= w; d++) tone(s, f, C.azure, ox + d + sw, 48 - j, Math.abs(d) === w ? .3 : u < .4 ? .95 : .65); } }
    B.selOutline(s, f, OUT('#020a1a')); } return s; }
function sealCube() { const s = S('seal_cube', 64, 74, 4, true); const x0 = 6; const y0 = 72; const hw = 22; const h = 52; const dx = 12; const dy = 10;
  for (let f = 0; f < 4; f++) {
    for (let y = y0 - h; y <= y0; y++) for (let x = x0; x <= x0 + 2 * hw; x++) if ((x + y + f) % 3 === 0) tone(s, f, C.ice, x, y, .6); // front face (dithered glass)
    for (let k = 0; k <= dx; k++) for (let y = y0 - h; y <= y0; y++) if ((k + y) % 3 === 0) tone(s, f, C.ice, x0 + 2 * hw + k, y - k * dy / dx, .4); // side
    const P = [[x0, y0], [x0 + 2 * hw, y0], [x0 + 2 * hw, y0 - h], [x0, y0 - h]]; const Q = P.map(([x, y]) => [x + dx, y - dy]);
    for (let i = 0; i < 4; i++) { line(s, f, C.ice, P[i][0], P[i][1], P[(i + 1) % 4][0], P[(i + 1) % 4][1], .95); line(s, f, C.ice, Q[i][0], Q[i][1], Q[(i + 1) % 4][0], Q[(i + 1) % 4][1], .7); line(s, f, C.ice, P[i][0], P[i][1], Q[i][0], Q[i][1], .8); }
    for (const [x, y] of P) disc(s, f, C.ice, x, y, 2, 2, () => ((f + x) % 2 ? 1 : .8));
    const gy = y0 - h + ((f * 13) % h); line(s, f, C.ice, x0 + 2, gy, x0 + 2 * hw - 2, gy - 6, 1);
    B.selOutline(s, f, OUT('#02101a')); } return s; }
function rageCore() { const s = S('rage_core', 44, 44, 4); for (let f = 0; f < 4; f++) { disc(s, f, C.rage, 22, 22, 12, 12, (x, y, e) => (e > .8 ? .55 : e > .45 ? .4 : .05)); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + f * .4; let r = 14; for (let k = 0; k < 4; k++) { tone(s, f, C.rage, 22 + Math.cos(a + k * .15 * (i % 2 ? 1 : -1)) * (r + k * 2), 22 + Math.sin(a + k * .15 * (i % 2 ? 1 : -1)) * (r + k * 2), k < 2 ? 1 : .75); } } B.selOutline(s, f, OUT('#000000')); } return s; }
function mistPuff() { const s = S('mist_puff', 30, 30, 6); for (let f = 0; f < 6; f++) { const k = f / 5; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; const r = 4 + k * 8; disc(s, f, C.mist, Math.round(15 + Math.cos(a) * r), Math.round(15 + Math.sin(a) * r), Math.max(1, Math.round(4 - k * 3)), Math.max(1, Math.round(4 - k * 3)), (x, y) => (x + y < 0 ? .95 : .6) - k * .3); } B.selOutline(s, f, OUT('#120a18')); } return s; }
module.exports = { runes10Sheets: () => [bloodCircle(), bloodCross(), crySigil(), shadowHands(), azureFlame(), sealCube(), rageCore(), mistPuff()] };
