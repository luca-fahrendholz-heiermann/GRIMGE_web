// GRIMGE — special runes, round 8 (hand-drawn quality; final density, sheet px = ½ world px). Rune palettes, own designs.
//   puppet_knot     4×20×20   S26 Marionettenfaden — a light-thread knot binding the dragged object
//   forge_grip      4×44×32   S27 Runenschmiede — three counter-turning forge rings with metal shards, a green core
//   echo_plate      4×44×34   S28 Echofamulus — a flat glowing plate with a cracked eye mark
//   colossus_shoulder 1×100×70 / colossus_fist 2×80×80  S29 Bruchkoloss — slab shoulder, a huge plated fist (1 = strike)
//   hunter_bell     4×36×44 (base) S30 Jägerglocke — a bronze bell core with three swinging sound tongues
//   rule_tablet     2×32×52 (base) S31 Runengericht — an ivory rune tablet (1 = cracked)
//   exile_plane     4×26×100 (base) S32 Exilkorridor — a translucent-looking (dithered) vertical rift plane with light notches
//   harvest_seal    6×170×58  S33 Erntezirkel — a moss-gold seed seal on the ground; harvest_seed 2×14×18 (0 dull, 1 charged)
//   trade_scales    3×56×44   S34 Scherbenhandel — gold scale pans on a brass beam (0 level, 1 tipped left, 2 tipped right)
//   res_plate       3×26×112 (base) S35 Resonanzkorridor — an ivory membrane plate with red veins (0 idle, 1 ringing, 2 torn)
//   seam_crack      4×28×16   S36 Weltnaht — a dark rift chunk with green ember veins (travelling)
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
const OUT = (c) => B.pal({ o: c }).o;
const disc = (s, f, r, cx, cy, rx, ry, sh) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) tone(s, f, r, cx + x, cy + y, sh(x, y, e)); } };
const line = (s, f, r, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) tone(s, f, r, x0 + (x1 - x0) * i / n + k, y0 + (y1 - y0) * i / n, typeof v === 'function' ? v(i / n) : v); };
const poly = (s, f, r, pts, sh) => { const ys = pts.map((q) => q[1]); const xs = pts.map((q) => q[0]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if ((yi > y + .5) !== (yj > y + .5) && x + .5 < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi) c = !c; } if (c) tone(s, f, r, x, y, sh(x, y)); } };
const C = {
  thread: ramp('#1e2024', '#4a4e56', '#6fb0e0', '#e0f0ff'), forge: ramp('#2a2214', '#5a4a2a', '#9a8050', '#d8c090'), green: ramp('#0a3a1a', '#1aa050', '#3fe08a', '#e6ffe8'),
  amber: ramp('#3a2810', '#8a6030', '#e0a85a', '#fff2d0', '#ffffff'), slab: ramp('#14181c', '#24282c', '#4e565e', '#7a848c'), violet: ramp('#2a1a4a', '#6a3ac0', '#b07aff', '#e8d8ff'),
  bronze: ramp('#0a2a2a', '#5a4a20', '#a07a30', '#d0a050', '#fff0c0'), teal: ramp('#0f3a3a', '#1f7a7a', '#6ae0d0', '#e6fff8'),
  ivory: ramp('#3a3628', '#8a8470', '#e6dcc0', '#ffffff'), blue: ramp('#0a1440', '#1a2a8a', '#2a4ae0', '#a8c0ff'),
  night: ramp('#0a1028', '#0f1838', '#1f2e6e', '#4a5ab0'), cream: ramp('#6a6050', '#c8bca0', '#f2e6c8'), red: ramp('#4a0a0a', '#a01a1a', '#ff4a4a', '#ffc0c0'),
  moss: ramp('#1a1a08', '#2a2a10', '#5a5420', '#9a8a3a', '#d8b45a'), lime: ramp('#2a5a10', '#5ac030', '#a8ff7a', '#e8ffd8'),
  gold: ramp('#3a2a10', '#7a6430', '#b09a5a', '#e8d090', '#ffe8b0'), sky: ramp('#0a2a5a', '#2a6ad0', '#4aa0ff', '#c0e0ff'),
  mem: ramp('#4a4440', '#a8a098', '#e6e0d8', '#fff4f0'), rift: ramp('#040406', '#0a0a0c', '#1a1a20', '#26262c'), ember: ramp('#0a4a2a', '#1aa060', '#3fe08a', '#d6ffe8')
};
const S = (name, w, h, n, base = false) => new Sheet(name, w, h, n, base ? { anchor: 'base', baseOffset: 2 } : { anchor: 'center' });

function puppetKnot() { const s = S('puppet_knot', 20, 20, 4); for (let f = 0; f < 4; f++) { for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + f * .3; line(s, f, C.thread, 10, 10, 10 + Math.cos(a) * 8, 10 + Math.sin(a) * 8, (u) => .95 - u * .3); } disc(s, f, C.thread, 10, 10, 3, 3, (x, y) => (x + y < 0 ? 1 : .8)); B.selOutline(s, f, OUT('#06080c')); } return s; }
function forgeGrip() { const s = S('forge_grip', 44, 32, 4); for (let f = 0; f < 4; f++) { for (let i = 0; i < 3; i++) { const r = 8 + i * 6; for (let k = 0; k < 7; k++) { const a = f / 4 * TAU / 7 * (i % 2 ? -1 : 1) + k * TAU / 7; for (let d = 0; d < 3; d++) { const aa = a + d * .08; tone(s, f, C.forge, 22 + Math.cos(aa) * r, 16 + Math.sin(aa) * r * .55, Math.sin(aa) < 0 ? .45 : .85); tone(s, f, C.forge, 22 + Math.cos(aa) * r, 17 + Math.sin(aa) * r * .55, .3); } } } disc(s, f, C.green, 22, 16, 3, 3, () => (f % 2 ? 1 : .8)); B.selOutline(s, f, OUT('#0a0804')); } return s; }
function echoPlate() { const s = S('echo_plate', 44, 34, 4); for (let f = 0; f < 4; f++) { poly(s, f, C.amber, [[4, 10], [38, 6], [40, 26], [6, 30]], (x, y) => .45 + ((x + y + f * 5) % 13 < 2 ? .4 : 0)); line(s, f, C.amber, 4, 10, 38, 6, .9); for (let x = -9; x <= 9; x++) { const h = Math.round(4 * Math.sqrt(1 - (x / 10) ** 2)); tone(s, f, C.amber, 22 + x, 18 - h, .95); tone(s, f, C.amber, 22 + x, 18 + h, .95); } disc(s, f, C.amber, 22, 18, 3, 3, () => 1); line(s, f, C.amber, 22, 14, 24, 20, .2); line(s, f, C.amber, 24, 20, 21, 23, .2); B.selOutline(s, f, OUT('#120a04')); } return s; }
function colossus() {
  const sh = S('colossus_shoulder', 100, 70, 1); poly(sh, 0, C.slab, [[6, 46], [26, 6], [80, 10], [94, 50], [50, 66]], (x, y) => (x + y < 70 ? .8 : .45) + (((x * 3 + y) % 23) < 2 ? -.3 : 0)); for (const [x, y] of [[30, 30], [62, 28]]) disc(sh, 0, C.green, x, y, 4, 4, () => .95); B.selOutline(sh, 0, OUT('#04060a'));
  const fi = S('colossus_fist', 80, 80, 2);
  for (let f = 0; f < 2; f++) { poly(fi, f, C.slab, [[8, 12], [58, 16], [70, 40], [62, 70], [10, 68], [2, 40]], (x, y) => (x + y < 60 ? .85 : .5) + ((x % 14) === 0 ? -.25 : 0)); for (let i = 0; i < 4; i++) for (let y = 0; y < 10; y++) for (let x = 0; x < 8; x++) tone(fi, f, C.slab, 58 + x + (i % 2), 20 + i * 12 + y, x < 3 ? .9 : .55); for (let i = 0; i < 3; i++) line(fi, f, C.violet, 10, 30 + i * 12, 54, 32 + i * 12, f ? 1 : .7); if (f) for (let k = 0; k < 6; k++) line(fi, f, C.violet, 72, 40, 72 + Math.cos(k - 2.5) * 6, 40 + Math.sin(k - 2.5) * 14, .9); B.selOutline(fi, f, OUT('#04060a')); }
  return [sh, fi];
}
function hunterBell() { const s = S('hunter_bell', 36, 44, 4, true); for (let f = 0; f < 4; f++) { const sw = Math.round(Math.sin(f / 4 * TAU) * 2); for (let y = 4; y <= 30; y++) { const w = Math.round(5 + (y - 4) * .42); for (let x = -w; x <= w; x++) tone(s, f, C.bronze, 18 + x, y, (x < -2 ? .9 : x < 3 ? .6 : .35) - (y > 27 ? .2 : 0)); } line(s, f, C.teal, 8, 22, 28, 22, .85); for (let i = -1; i <= 1; i++) line(s, f, C.bronze, 18 + i * 6 + sw, 31, 18 + i * 6 + sw * 2, 40, .8, 2); disc(s, f, C.bronze, 18, 3, 3, 2, () => .7); B.selOutline(s, f, OUT('#040a0a')); } return s; }
function ruleTablet() { const s = S('rule_tablet', 32, 52, 2, true); for (let f = 0; f < 2; f++) { for (let y = 4; y <= 50; y++) for (let x = 4; x <= 28; x++) { const top = y < 10 && Math.abs(x - 16) > 12 - (y - 4) * 2; if (top) continue; tone(s, f, C.ivory, x, y, (x < 8 ? .9 : .6) - (y > 46 ? .25 : 0)); } for (let k = 0; k < 4; k++) line(s, f, C.blue, 9, 16 + k * 8, 23, 16 + k * 8 + (k % 2), .85); if (f) { line(s, f, C.ivory, 10, 8, 18, 30, .1); line(s, f, C.ivory, 18, 30, 14, 48, .1); } B.selOutline(s, f, OUT('#060a18')); } return s; }
function exilePlane() { const s = S('exile_plane', 26, 100, 4, true); for (let f = 0; f < 4; f++) { for (let y = 4; y <= 98; y++) for (let x = 4; x <= 22; x++) if ((x + y) % 2 === 0) tone(s, f, C.night, x, y, .4 + (x === 4 || x === 22 ? .4 : 0)); for (let k = 0; k < 4; k++) { const y = 96 - ((f * 12 + k * 24) % 92); line(s, f, C.cream, 6, y, 20, y, 1); } for (let y = 4; y <= 98; y++) { tone(s, f, C.cream, 4, y, .7); tone(s, f, C.cream, 22, y, .7); } B.selOutline(s, f, OUT('#020410')); } return s; }
function harvest() {
  const s = S('harvest_seal', 170, 58, 6); const cx = 85; const cy = 29; const R = 80;
  for (let f = 0; f < 6; f++) { for (let a = 0; a < TAU; a += .006) for (let d = 0; d < 4; d++) { const seg = Math.floor((a + f * .04) / TAU * 9) % 2 === 0; tone(s, f, C.moss, cx + Math.cos(a) * (R - d), cy + Math.sin(a) * (R - d) * .32, seg ? (d === 0 ? .95 : .6) : .3); }
    for (let i = 0; i < 3; i++) for (let k = 0; k <= 50; k++) { const u = k / 50; const a = i * TAU / 3 + u * 2 + f * .05; const r = R * (1 - u * .8); tone(s, f, C.moss, cx + Math.cos(a) * r, cy + Math.sin(a) * r * .32, .75); }
    B.selOutline(s, f, OUT('#060604')); }
  const sd = S('harvest_seed', 14, 18, 2); for (let f = 0; f < 2; f++) { for (let y = -7; y <= 7; y++) { const w = Math.round(4 * Math.sqrt(1 - (y / 8) ** 2)); for (let x = -w; x <= w; x++) tone(sd, f, f ? C.lime : C.moss, 7 + x, 9 + y, x < 0 ? .9 : .55); } B.selOutline(sd, f, OUT('#060604')); }
  return [s, sd];
}
function scales() { const s = S('trade_scales', 56, 44, 3); for (let f = 0; f < 3; f++) { const tilt = f === 1 ? -.4 : f === 2 ? .4 : 0; const c = Math.cos(tilt); const sn = Math.sin(tilt); line(s, f, C.gold, 28, 4, 28, 14, .8, 2); line(s, f, C.gold, 28 - 22 * c, 12 - 22 * sn, 28 + 22 * c, 12 + 22 * sn, .9, 2);
  for (const sg of [-1, 1]) { const px = 28 + sg * 22 * c; const py = 12 + sg * 22 * sn; line(s, f, C.gold, px, py, px - 8, py + 16, .6); line(s, f, C.gold, px, py, px + 8, py + 16, .6); for (let x = -9; x <= 9; x++) for (let y = 0; y < 4; y++) if (Math.abs(x) <= 9 - y) tone(s, f, C.gold, px + x, py + 16 + y, y ? .5 : .9); }
  disc(s, f, C.sky, 28 + 22 * c, 8 + 22 * sn, 2, 4, () => 1); disc(s, f, C.sky, 28, 4, 2, 2, () => .9); B.selOutline(s, f, OUT('#0a0804')); } return s; }
function resPlate() { const s = S('res_plate', 26, 112, 3, true); for (let f = 0; f < 3; f++) { const torn = f === 2; for (let y = 6; y <= 110; y++) { const w = y < 20 ? Math.round(3 + (y - 6) * .4) : 9; for (let x = -w; x <= w; x++) { if (torn && y < 50 && x > 2 && (y + x) % 3 === 0) continue; tone(s, f, C.mem, 13 + x, y, (x < -3 ? .9 : .6) - (y > 104 ? .25 : 0)); } }
  for (let k = 0; k < 3; k++) for (let y = 14; y <= 100; y++) tone(s, f, C.red, 10 + k * 3 + Math.round(Math.sin(y * .15 + k) * 1.2), y, f === 1 ? 1 : .6); B.selOutline(s, f, OUT('#0a0606')); } return s; }
function seamCrack() { const s = S('seam_crack', 28, 16, 4); for (let f = 0; f < 4; f++) { poly(s, f, C.rift, [[2, 8], [10, 3], [20, 4], [26, 9], [16, 13], [6, 12]], () => .6); for (let x = 4; x <= 24; x++) tone(s, f, C.ember, x, 8 + Math.round(Math.sin(x * .6 + f) * 2), (x + f * 4) % 9 < 3 ? 1 : .6); B.selOutline(s, f, OUT('#000000')); } return s; }
module.exports = { runes8Sheets: () => [puppetKnot(), forgeGrip(), echoPlate(), ...colossus(), hunterBell(), ruleTablet(), exilePlane(), ...harvest(), scales(), resPlate(), seamCrack()] };
