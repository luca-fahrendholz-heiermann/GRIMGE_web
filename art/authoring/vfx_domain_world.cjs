// GRIMGE — domain (Sphäre) inner worlds: hand-drawn backdrop props (drawn at scale 1: a sheet px is a world px). Own designs.
//   dw_eclipse     4×64×64   S53 Abgrundschrein — a black sun with a flaring crimson corona
//   dw_clock       1×112×112 S56 Stillstand — a gilded clock face (the hands are drawn live)
//   dw_lavafall    4×16×64   S57 Glutkessel — a falling lava column (base)
//   dw_crust       2×44×18   S57 — a cooling crust island with glowing cracks
//   dw_tree        2×110×120 S58 Lebenshain — a broad tree with a layered crown (base)
//   dw_mirror      2×26×84   S59 Spiegelwelt — a tall glass shard with a travelling glint (base)
//   dw_blackhole   4×100×44  S60 Schwerkraft — a black hole with a swirling accretion disc
//   dw_stormcloud  4×84×34   S61 Sturm — a heavy storm cloud (frame 3 lit from below by lightning)
//   dw_beast       4×40×48   S62 Schattenmeer — a shadow beast peeking out (eyes blink) (base)
//   dw_stalactite  2×18×48   S64 Steingrab — a ridged stalactite hanging down (top anchored via center)
//   dw_boulder     1×30×20   S64 — a faceted cave boulder (base)
//   dw_kelp        4×16×72   S65 — swaying kelp (base)
//   dw_pine        1×44×130  S66 Jagdgrund — a dark pine silhouette, moonlit on the right (base)
//   dw_pillar      1×24×110  S69 Sonnenheiligtum — a fluted golden temple column (base)
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const OUT = (c) => B.pal({ o: c }).o;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
const disc = (s, f, r, cx, cy, rx, ry, sh) => { for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(rx); x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) tone(s, f, r, cx + x, cy + y, sh(x, y, e)); } };
const line = (s, f, r, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) tone(s, f, r, x0 + (x1 - x0) * i / n + k, y0 + (y1 - y0) * i / n, typeof v === 'function' ? v(i / n) : v); };
const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i]; const [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const S = (n, w, h, k, base) => new Sheet(n, w, h, k, base ? { anchor: 'base', baseOffset: 1 } : { anchor: 'center' });

function eclipse() { const s = S('dw_eclipse', 64, 64, 4); const c = ramp('#4a0016', '#a0103a', '#ff3d6e', '#ffd1dc'); const k = ramp('#05020a', '#120822');
  for (let f = 0; f < 4; f++) {
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + f * .07; const L = 22 + ((i * 7 + f * 3) % 5) * 2 + (i % 3 === 0 ? 5 : 0); line(s, f, c, 32 + Math.cos(a) * 19, 32 + Math.sin(a) * 19, 32 + Math.cos(a) * L, 32 + Math.sin(a) * L, (u) => 1 - u * .8, 1); }
    disc(s, f, c, 32, 32, 20, 20, (x, y, e) => (e > .8 ? .67 : 1));
    disc(s, f, k, 33, 33, 16, 16, (x, y, e) => (e > .85 ? 1 : 0));
    B.selOutline(s, f, OUT('#05020a')); } return s; }

function clock() { const s = S('dw_clock', 112, 112, 1); const g = ramp('#5a3a08', '#b07a10', '#ffd54f', '#fff8e1'); const face = ramp('#03141a', '#083544', '#0c4858'); const c = 56;
  for (let y = -48; y <= 48; y++) for (let x = -48; x <= 48; x++) { const r = Math.hypot(x, y); if (r <= 44 && (x + y) % 2 === 0) tone(s, 0, face, c + x, c + y, r < 30 ? .5 : 1); }
  for (let a = 0; a < TAU; a += .004) { for (let d = 0; d < 4; d++) tone(s, 0, g, c + Math.cos(a) * (52 - d), c + Math.sin(a) * (52 - d), d === 0 ? .4 : d === 1 ? 1 : .7); tone(s, 0, g, c + Math.cos(a) * 44, c + Math.sin(a) * 44, .7); }
  for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; const L = i % 15 === 0 ? 10 : i % 5 === 0 ? 7 : 3; line(s, 0, g, c + Math.cos(a) * 44, c + Math.sin(a) * 44, c + Math.cos(a) * (44 - L), c + Math.sin(a) * (44 - L), i % 5 === 0 ? 1 : .6, i % 15 === 0 ? 2 : 1); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - Math.PI / 2; const x = c + Math.cos(a) * 30; const y = c + Math.sin(a) * 30; disc(s, 0, g, x, y, 2.5, 2.5, (dx, dy) => (dx + dy < 0 ? 1 : .6)); }
  disc(s, 0, g, c, c, 5, 5, (x, y) => (x + y < 0 ? 1 : .5));
  B.selOutline(s, 0, OUT('#020a0e')); return s; }

function lavafall() { const s = S('dw_lavafall', 16, 64, 4, true); const l = ramp('#3a0a02', '#bf360c', '#ff6d00', '#ffab40', '#fff3e0');
  for (let f = 0; f < 4; f++) {
    for (let y = 0; y < 60; y++) { const w = 4 + (y > 54 ? 1 : 0); for (let x = -w; x <= w; x++) { const fl = (y - f * 6 + 64 + Math.abs(x) * 2) % 11 < 2 && Math.abs(x) < w - 1; tone(s, f, l, 8 + x, y, Math.abs(x) === w ? .25 : fl ? 1 : Math.abs(x) < 2 ? .8 : .55); } if ((y + f * 5) % 9 === 0) tone(s, f, l, 8 + ((y * 3) % 5) - 2, y, 0); }
    for (let k = 0; k < 6; k++) disc(s, f, l, 8 + Math.cos(k * 1.1 + f) * 5, 60 - Math.abs(Math.sin(k + f)) * 3, 1.5, 1.5, () => (k % 2 ? 1 : .7));
    B.selOutline(s, f, OUT('#1a0302')); } return s; }

function crust() { const s = S('dw_crust', 44, 18, 2); const c = ramp('#1a0503', '#3a0a02', '#5e1808'); const g = ramp('#ff6d00', '#ffab40', '#fff3e0');
  for (let f = 0; f < 2; f++) { const blob = B.noisyBlob(22, 9, 15, 7 + f, .2, .5); for (let y = 0; y < 18; y++) for (let x = 0; x < 44; x++) if (blob(x, y)) tone(s, f, c, x, y, y < 7 ? 1 : .5);
    for (const [x0, y0, x1, y1] of [[9, 9, 19, 6], [19, 6, 27, 11], [27, 11, 36, 8], [18, 9, 22, 14], [30, 10, 33, 14]]) line(s, f, g, x0, y0 + f, x1, y1, f ? 1 : .6);
    B.selOutline(s, f, OUT('#0a0201')); } return s; }

function tree() { const s = S('dw_tree', 110, 120, 2, true); const bark = ramp('#2a1a10', '#4e342e', '#6d4c41', '#8d6e63'); const leaf = ramp('#0b2a10', '#1b5e20', '#2e7d32', '#43a047', '#7cb342', '#c5e1a5');
  for (let f = 0; f < 2; f++) {
    for (let y = 60; y < 119; y++) { const w = 6 + (y > 108 ? (y - 108) * 1.4 : 0); for (let x = -w; x <= w; x++) tone(s, f, bark, 55 + x, y, x < -w * .4 ? .9 : x > w * .5 ? .2 : ((y + x * 3) % 7 === 0 ? .2 : .55)); }
    line(s, f, bark, 52, 70, 34, 52, .5, 3); line(s, f, bark, 58, 66, 76, 50, .5, 3);
    for (const [cx, cy, r, b] of [[55, 38, 34, .3], [30, 50, 22, .35], [82, 48, 22, .4], [44, 26, 22, .55], [70, 28, 22, .6], [56, 18, 16, .8]]) { const blob = B.noisyBlob(cx + f, cy, r, cx * 3 + cy, .16, .8); for (let y = 0; y < 120; y++) for (let x = 0; x < 110; x++) if (blob(x, y)) { const lit = (cx - x) + (cy - y) > r * .3; tone(s, f, leaf, x, y, b + (lit ? .25 : 0) + (((x * 7 + y * 13 + f * 5) % 23) === 0 ? .2 : 0)); } }
    B.selOutline(s, f, OUT('#06140a')); } return s; }

function mirror() { const s = S('dw_mirror', 26, 84, 2, true); const g = ramp('#2a3444', '#607d8b', '#b0bec5', '#e0f7fa', '#ffffff'); const P = [[3, 83], [5, 6], [20, 2], [23, 14], [22, 83]];
  for (let f = 0; f < 2; f++) { for (let y = 0; y < 84; y++) for (let x = 0; x < 26; x++) { if (!inPoly(P, x + .5, y + .5)) continue; const edge = !inPoly(P, x - .5, y + .5) || !inPoly(P, x + .5, y - .5); const gl = Math.abs((x + y * .4) - (14 + f * 22)) < 2; tone(s, f, g, x, y, edge ? 1 : gl ? .85 : ((x + y) % 2 === 0 ? .55 : .35)); }
    B.selOutline(s, f, OUT('#0e1116')); } return s; }

function blackhole() { const s = S('dw_blackhole', 100, 44, 4); const d = ramp('#271c45', '#5e35b1', '#b388ff', '#ede7f6', '#ffffff'); const k = ramp('#000000', '#000000');
  for (let f = 0; f < 4; f++) {
    const ring = (front) => { for (let a = 0; a < TAU; a += .01) { const isFront = Math.sin(a) > 0; if (isFront !== front) continue; for (let r = 0; r < 4; r++) { const R = 46 - r * 4; const v = ((Math.floor((a * 12) + f * 1.5 + r) % 3) === 0 ? 1 : r === 1 ? .75 : .5) - r * .08; tone(s, f, d, 50 + Math.cos(a) * R, 22 + Math.sin(a) * R * .26, v); } } };
    ring(false); disc(s, f, k, 50, 22, 14, 14, () => 0); for (let a = 0; a < TAU; a += .02) tone(s, f, d, 50 + Math.cos(a) * 15, 22 + Math.sin(a) * 15, .9); ring(true);
    B.selOutline(s, f, OUT('#000000')); } return s; }

function stormcloud() { const s = S('dw_stormcloud', 84, 34, 4); const c = ramp('#0b1118', '#1f2b38', '#2b3a4d', '#455a70', '#90caf9', '#e1f5fe');
  for (let f = 0; f < 4; f++) { const lit = f === 3; for (const [cx, cy, r] of [[20, 20, 12], [38, 15, 15], [58, 17, 13], [72, 22, 9], [46, 24, 12]]) { const blob = B.noisyBlob(cx + (f % 2), cy, r, cx + cy, .2, .7); for (let y = 0; y < 34; y++) for (let x = 0; x < 84; x++) if (blob(x, y)) tone(s, f, c, x, y, (y < cy - r * .3 ? .5 : y > cy + r * .3 ? (lit ? .8 : .1) : .3) + (((x + y * 3 + f) % 17) === 0 ? .15 : 0)); }
    B.selOutline(s, f, OUT('#05080c')); } return s; }

function beast() { const s = S('dw_beast', 40, 48, 4, true); const k = ramp('#000000', '#12101e', '#311b92', '#7e57c2'); const eye = ramp('#d1c4e9', '#ffffff');
  for (let f = 0; f < 4; f++) { const bob = Math.round(Math.sin(f / 4 * TAU) * 1.5);
    disc(s, f, k, 20, 34 + bob, 15, 14, (x, y, e) => (e > .85 && x < 0 && y < 0 ? .67 : 0)); for (let y = 34; y < 48; y++) for (let x = -15; x <= 15; x++) tone(s, f, k, 20 + x, y + bob, 0);
    for (const sg of [-1, 1]) for (let j = 0; j < 14; j++) { const w = Math.max(0, Math.round(3 * (1 - j / 14))); for (let x = -w; x <= w; x++) tone(s, f, k, 20 + sg * (9 + j * .4) + x, 24 - j + bob, x === -w ? .67 : 0); }
    if (f !== 3) for (const sg of [-1, 1]) { tone(s, f, eye, 20 + sg * 6, 32 + bob, 1); tone(s, f, eye, 20 + sg * 6 + sg, 32 + bob, 0); tone(s, f, eye, 20 + sg * 6, 33 + bob, 0); } else for (const sg of [-1, 1]) line(s, f, eye, 20 + sg * 5, 33 + bob, 20 + sg * 7, 33 + bob, 0);
    B.selOutline(s, f, OUT('#000000'), OUT('#7e57c2')); } return s; }

function stalactite() { const s = S('dw_stalactite', 18, 48, 2); const r = ramp('#1a1410', '#3a2d22', '#5d4037', '#8d6e63', '#bcaaa4');
  for (let f = 0; f < 2; f++) { const L = 40 - f * 10; for (let y = 0; y < L; y++) { const w = Math.round(7 * (1 - y / L) ** .8); for (let x = -w; x <= w; x++) tone(s, f, r, 9 + x, y, x < -w * .3 ? .8 : x > w * .4 ? .2 : ((y + x) % 6 === 0 ? .3 : .5)); }
    tone(s, f, ramp('#81d4fa', '#e1f5fe'), 9, L + 3, 1); B.selOutline(s, f, OUT('#0a0806')); } return s; }

function boulder() { const s = S('dw_boulder', 30, 20, 1, true); const r = ramp('#1a1410', '#3a2d22', '#5d4037', '#8d6e63', '#a1887f'); const V = [[2, 19], [5, 9], [12, 3], [22, 4], [28, 11], [27, 19]];
  for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) if (inPoly(V, x + .5, y + .5)) tone(s, 0, r, x, y, x + y < 18 ? .9 : x > 20 ? .3 : y > 15 ? .2 : .55);
  line(s, 0, r, 12, 4, 15, 12, .3); line(s, 0, r, 15, 12, 24, 10, .3); B.selOutline(s, 0, OUT('#0a0806')); return s; }

function kelp() { const s = S('dw_kelp', 16, 72, 4, true); const g = ramp('#0b2a10', '#1b5e20', '#2e7d32', '#66bb6a');
  for (let f = 0; f < 4; f++) { for (let y = 71; y > 4; y--) { const u = (71 - y) / 67; const x = 8 + Math.sin(u * 4 + f / 4 * TAU) * 3 * u; for (let d = -1; d <= 1; d++) tone(s, f, g, x + d, y, d < 0 ? .67 : .33); if (y % 9 === 0) { const sg = (y / 9) % 2 ? 1 : -1; for (let j = 1; j < 5; j++) tone(s, f, g, x + sg * j, y - j * .5, j < 3 ? 1 : .67); } }
    B.selOutline(s, f, OUT('#04140a')); } return s; }

function pine() { const s = S('dw_pine', 44, 130, 1, true); const k = ramp('#0b0805', '#1b130a', '#2d2416', '#5d4a2a');
  for (let y = 100; y < 130; y++) for (let x = -3; x <= 3; x++) tone(s, 0, k, 22 + x, y, x === 3 ? .67 : .2);
  for (let t = 0; t < 7; t++) { const top = 6 + t * 14; const H = 26; for (let j = 0; j < H; j++) { const w = Math.round(4 + (j / H) * (8 + t * 1.8)); for (let x = -w; x <= w; x++) tone(s, 0, k, 22 + x, top + j, x >= w - 1 ? .9 : x > w * .4 ? .4 : ((x + j) % 5 === 0 ? .25 : .1)); } }
  B.selOutline(s, 0, OUT('#000000')); return s; }

function pillar() { const s = S('dw_pillar', 24, 110, 1, true); const g = ramp('#5a3a08', '#8a6a18', '#c9a227', '#ffe082', '#fffde7');
  for (let y = 10; y < 100; y++) for (let x = -7; x <= 7; x++) { const fl = ((x + 8) % 4) === 0; tone(s, 0, g, 12 + x, y, x < -4 ? .85 : fl ? .35 : x > 4 ? .3 : .6); }
  for (const [y0, y1, w] of [[0, 4, 11], [4, 10, 9], [100, 104, 9], [104, 110, 11]]) for (let y = y0; y < y1; y++) for (let x = -w; x <= w; x++) tone(s, 0, g, 12 + x, y, y === y0 ? 1 : x < 0 ? .75 : .45);
  B.selOutline(s, 0, OUT('#2a1a04')); return s; }

module.exports = { domainWorldSheets: () => [eclipse(), clock(), lavafall(), crust(), tree(), mirror(), blackhole(), stormcloud(), beast(), stalactite(), boulder(), kelp(), pine(), pillar()] };
