// GRIMGE — breathing-style element pieces (drawn at scale 1: a sheet px is a world px). Own designs.
// Every piece is drawn in a 4-step GREY ramp plus a near-black outline; the game recolours it per style
// (dark / mid / light / core of the style's ramp, spell_visuals.drawSpellSpriteTinted), so one sheet serves
// every style that shares the look (flame for flame / sun / forge trails, water for water / serpent …).
//   bp_<look> 4×26×26 (center): water, serpent, flame, sun, love, steam, bolt, wind, mist, rock, petal, moon,
//                               claw, blast, shield, sting, sound, ice
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01 } = B;
const G = B.pal({ r: ['#3c3c3c', '#787878', '#b4b4b4', '#f0f0f0'] }).r;
const OUT = B.pal({ o: '#141414' }).o;
const tone = (s, f, x, y, v) => s.set(f, x, y, G[Math.round(clamp01(v) * 3)]);
const disc = (s, f, cx, cy, rx, ry, sh) => { for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(rx); x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) tone(s, f, cx + x, cy + y, sh(x, y, e)); } };
const line = (s, f, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) { const u = i / n; const ww = typeof w === 'function' ? w(u) : w; for (let k = 0; k < ww; k++) tone(s, f, x0 + (x1 - x0) * u + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? k : 0), y0 + (y1 - y0) * u + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? 0 : k), typeof v === 'function' ? v(u, k) : v); } };
const W = 26; const C = 13;
const sheet = (look, draw) => { const s = new Sheet('bp_' + look, W, W, 4, { anchor: 'center' }); for (let f = 0; f < 4; f++) { draw(s, f); B.selOutline(s, f, OUT); } return s; };

// A curling wave crest: the body rises to the right and its lip curls over; foam spray at the lip.
const water = () => sheet('water', (s, f) => {
  for (let x = 2; x <= 19; x++) { const u = (x - 2) / 17; const top = Math.round(22 - 13 * u ** 1.4); for (let y = top; y <= 22; y++) tone(s, f, x, y, y - top < 2 ? .67 : y > 19 ? 0 : (x + y) % 5 === 0 ? .67 : .33); }
  for (let a = -Math.PI / 2; a <= Math.PI * .9; a += .05) for (let d = 0; d < 3; d++) tone(s, f, 17 + Math.cos(a) * (4 - d), 9 + Math.sin(a) * (4 - d), d === 0 ? 1 : .67);
  for (let k = 0; k < 4; k++) tone(s, f, 21 + ((k + f) % 3), 9 + k * 2 - (f % 2), k % 2 ? 1 : .67);
  tone(s, f, 23 - (f % 2), 6 + f, 1); line(s, f, 4, 21, 12, 17, 1);
});
// A sinuous scaled body with a small head: diamond scales march along it.
const serpent = () => sheet('serpent', (s, f) => {
  for (let x = 2; x <= 21; x++) { const cy = 13 + 5 * Math.sin(x * .42 + f * .8); for (let d = -2; d <= 2; d++) tone(s, f, x, cy + d, d === -2 ? .67 : d === 2 ? 0 : (x + f) % 4 === 0 && d === 0 ? 1 : .33); }
  const hy = 13 + 5 * Math.sin(22 * .42 + f * .8); disc(s, f, 22, hy, 3, 2.5, (x, y) => (y < 0 ? .67 : .33)); tone(s, f, 23, hy - 1, 1);
});
// A flame tongue in three nested layers; the tips flicker every frame.
const flameBody = (s, f, ox, H, w0) => { for (let k = 0; k < 3; k++) { const h = H - k * 5 + ((f + k) % 3) * 2; for (let j = 0; j < h; j++) { const u = j / h; const w = Math.max(0, Math.round((w0 - k * 2) * Math.sin(Math.PI * (1 - u) * .85))); const sw = Math.round(Math.sin(u * 5 + f * 1.4 + k) * 2 * u); for (let d = -w; d <= w; d++) tone(s, f, ox + d + sw, 24 - j, k === 2 ? 1 : k === 1 ? .67 : Math.abs(d) === w ? 0 : .33); } } };
const flame = () => sheet('flame', (s, f) => { flameBody(s, f, 13, 22, 7); });
// A sun: a lit disc with eight rays that alternate length, a small flame licking off the top.
const sun = () => sheet('sun', (s, f) => {
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + f * .2; const L = (i + f) % 2 ? 11 : 8; line(s, f, C + Math.cos(a) * 6, C + Math.sin(a) * 6, C + Math.cos(a) * L, C + Math.sin(a) * L, .67); }
  disc(s, f, C, C, 6, 6, (x, y, e) => (e < .3 ? 1 : x + y < 0 ? .67 : .33));
});
// A heart with flame wisps flickering on top.
const love = () => sheet('love', (s, f) => {
  for (let y = -10; y <= 10; y++) for (let x = -11; x <= 11; x++) { const X = x / 9; const Y = -(y - 1) / 9; const v = (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3; if (v <= 0) tone(s, f, C + x, C + y, x < -2 && y < -1 ? .67 : y > 5 ? 0 : .33); }
  tone(s, f, C - 5, C - 4, 1); tone(s, f, C - 4, C - 5, 1);
  for (const ox of [-5, 5]) for (let k = 0; k < 3 + ((f + (ox > 0 ? 1 : 0)) % 2); k++) tone(s, f, C + ox + Math.round(Math.sin(k + f) * .8), C - 8 - k, k > 1 ? 1 : .67);
});
// A rising steam cluster: puffs swell from frame to frame.
const steam = () => sheet('steam', (s, f) => {
  const g = f * .6; for (const [x, y, r] of [[9, 17, 5], [16, 15, 5], [12, 10, 4], [18, 8, 3]]) disc(s, f, x, y - f, r + g * (r > 4 ? 1 : .5), r + g * (r > 4 ? 1 : .5), (dx, dy, e) => (dx + dy < -2 ? 1 : e > .7 && dy > 0 ? .33 : .67));
});
// A zigzag spark with a fork; the path changes every frame.
const bolt = () => sheet('bolt', (s, f) => {
  const P = [[8, 1]]; for (let i = 1; i <= 5; i++) P.push([C + ((i + f) % 2 ? 5 : -5) * (i < 5 ? 1 : .3), i * 5]);
  for (let i = 0; i < P.length - 1; i++) { line(s, f, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], .67, 3); }
  for (let i = 0; i < P.length - 1; i++) line(s, f, P[i][0] + 1, P[i][1], P[i + 1][0] + 1, P[i + 1][1], 1);
  const b = P[2 + (f % 2)]; line(s, f, b[0], b[1], b[0] + (f % 2 ? -6 : 6), b[1] + 4, .67);
});
// A wind sickle: a filled crescent with a bright outer edge and two speed streaks.
const wind = () => sheet('wind', (s, f) => {
  const ro = f * .25; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const dx = x - 11; const dy = y - 13; const ix = x - 14 - Math.cos(ro) * 1.5; const iy = y - 11 - Math.sin(ro); const o = Math.hypot(dx, dy); if (o <= 10 && Math.hypot(ix, iy) > 9) tone(s, f, x, y, o > 9 ? 1 : dx < -4 ? .67 : .33); }
  line(s, f, 14, 22 - f % 2, 23, 21 - f % 2, .67); line(s, f, 16, 4 + f % 2, 23, 5 + f % 2, .67);
});
// A layered cloud puff (flat tones), slowly turning.
const mist = () => sheet('mist', (s, f) => {
  for (const [x, y, r] of [[8, 15, 5], [14, 13, 6], [19, 16, 4], [12, 18, 4]]) disc(s, f, x + Math.round(Math.sin(f + x) * .8), y, r, r * .8, (dx, dy) => (dy < -1 ? 1 : dy < 2 ? .67 : .33));
});
// An angular rock chunk with lit facets and two pebbles orbiting it.
const rock = () => sheet('rock', (s, f) => {
  const V = [[6, 17], [9, 8], [16, 6], [21, 12], [19, 20], [11, 22]];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { let inside = true; for (let i = 0; i < 6; i++) { const [ax, ay] = V[i]; const [bx, by] = V[(i + 1) % 6]; if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) { inside = false; break; } } if (inside) tone(s, f, x, y, x + y < 24 ? .67 : x - y > 2 ? .33 : y > 18 ? 0 : .33); }
  line(s, f, 9, 9, 15, 14, 1); line(s, f, 15, 14, 16, 7, .67);
  for (let k = 0; k < 2; k++) { const a = f / 4 * TAU + k * Math.PI; disc(s, f, C + Math.cos(a) * 11, C + Math.sin(a) * 6, 1.5, 1.5, (x, y) => (y < 0 ? .67 : .33)); }
});
// Two notched blossom petals tumbling.
const petalAt = (s, f, cx, cy, ang) => { const ca = Math.cos(ang); const sa = Math.sin(ang); for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) { const u = x * ca + y * sa; const v = -x * sa + y * ca; if ((u / 6) ** 2 + (v / 3.4) ** 2 > 1) continue; if (u > 4 && Math.abs(v) < 1) continue; tone(s, f, cx + x, cy + y, v < -1 ? 1 : v < 1 ? .67 : .33); } };
const petal = () => sheet('petal', (s, f) => { petalAt(s, f, 9, 10, f * .5); petalAt(s, f, 17, 17, 1.8 - f * .6); });
// A crescent moon blade with a travelling glint.
const moon = () => sheet('moon', (s, f) => {
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const o = Math.hypot(x - C, y - C); const i = Math.hypot(x - C + 5, y - C - 1); if (o <= 10 && i > 9) tone(s, f, x, y, o > 9 ? 1 : i < 10.5 ? .67 : .33); }
  const a = -1.2 + f * .8; disc(s, f, C + Math.cos(a) * 9, C + Math.sin(a) * 9, 1.5, 1.5, () => 1);
});
// Three tapered claw rips; they extend over the frames.
const claw = () => sheet('claw', (s, f) => {
  const L = [.5, .8, 1, 1][f]; for (let k = -1; k <= 1; k++) { const x0 = 6 + k * 5; const y0 = 3; const x1 = x0 + 12 * L; const y1 = y0 + 20 * L; line(s, f, x0, y0, x1, y1, (u) => (u < .3 ? 1 : .67), (u) => Math.max(1, Math.round(3 * Math.sin(Math.PI * Math.min(1, u * 1.1))))); }
});
// A spark burst: alternating spikes around a white-hot core.
const blast = () => sheet('blast', (s, f) => {
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + f * .4; const L = (i % 2 ? 7 : 11) + (f % 2); line(s, f, C, C, C + Math.cos(a) * L, C + Math.sin(a) * L, (u) => (u < .5 ? 1 : .67), (u) => (u < .4 ? 2 : 1)); }
  disc(s, f, C, C, 4, 4, (x, y, e) => (e < .4 ? 1 : .67));
});
// A hex shield shard: lit rim, dithered glass, a glint sweeping across.
const shield = () => sheet('shield', (s, f) => {
  const R = 10; const H = Math.round(R * Math.sqrt(3) / 2);
  for (let y = -H; y <= H; y++) for (let x = -R; x <= R; x++) { const e = Math.max(Math.abs(y) / H, (Math.abs(x) + Math.abs(y) / Math.sqrt(3)) / R); if (e > 1) continue; const gl = Math.abs(x + y - (f * 6 - 9)) < 2; tone(s, f, C + x, C + y, e > .82 ? (y < 0 ? 1 : .67) : gl ? 1 : (x + y) % 2 === 0 ? .33 : -1); }
});
// A butterfly with spotted wings (flapping) and a stinger needle.
const sting = () => sheet('sting', (s, f) => {
  const fl = [1, .7, .35, .7][f]; disc(s, f, 9, 9, 5, 6 * fl, (x, y) => (Math.hypot(x + 1, y + 1) < 2 ? 1 : y < 0 ? .67 : .33)); disc(s, f, 10, 17, 4, 4 * fl, (x, y) => (y < 0 ? .67 : .33));
  line(s, f, 12, 13, 24, 13, 1); line(s, f, 11, 12, 13, 14, .33);
});
// A music note with sound rings opening on its right.
const sound = () => sheet('sound', (s, f) => {
  disc(s, f, 8, 19, 4, 3, (x, y) => (x + y < -1 ? 1 : .67)); line(s, f, 11, 18, 11, 5, .67, 2); line(s, f, 12, 5, 17, 9, .67, 2);
  for (let k = 0; k < 2; k++) { const r = 4 + k * 4 + f; for (let a = -.9; a <= .9; a += .08) tone(s, f, 13 + Math.cos(a) * r, 13 + Math.sin(a) * r, k ? .67 : 1); }
});
// An ice crystal cluster: three faceted shards (lit left facet, shaded right facet, bright edge).
const shard = (s, f, bx, by, ang, L, w) => { const ca = Math.cos(ang); const sa = Math.sin(ang); for (let j = 0; j <= L; j++) { const u = j / L; const ww = Math.round(w * (u < .7 ? 1 : (1 - u) / .3)); for (let d = -ww; d <= ww; d++) tone(s, f, bx + ca * j - sa * d, by + sa * j + ca * d, d === 0 ? 1 : d < 0 ? .67 : .33); } };
const ice = () => sheet('ice', (s, f) => { shard(s, f, 12, 23, -Math.PI / 2 + .1, 20, 3); shard(s, f, 11, 22, -Math.PI / 2 - .7, 12, 2); shard(s, f, 14, 23, -Math.PI / 2 + .8, 11, 2); tone(s, f, 13 + (f % 2), 4 + f, 1); });


// ── Flutwelle: a continuous wave (grey ramp, recoloured per style like the pieces) ──
//   bw_wave_body  4×32×40 (base) a seamless rolling water body tile (surface swell, diagonal flow streaks, foam on the peaks)
//   bw_wave_crest 4×48×60 (base) the breaking head: a tall face, the lip curling over a hollow tube, foam spray
const waveBody = () => { const s = new Sheet('bw_wave_body', 32, 40, 4, { anchor: 'base', baseOffset: 1 }); for (let f = 0; f < 4; f++) {
  const top = (x) => Math.round(17 + 3 * Math.sin(TAU * (x + f * 8) / 32) + 1.2 * Math.sin(TAU * 2 * (x + f * 8) / 32 + 1));
  for (let x = 0; x < 32; x++) { const t0 = top(x); const peak = t0 <= 14; for (let y = t0; y < 40; y++) { const d = y - t0; let v = d < 2 ? (peak ? 1 : .67) : y > 35 ? 0 : .33; if (d > 4 && y <= 35 && ((x + f * 8 + y * 2) % 13) < 3) v = .67; if (d > 3 && y <= 35 && ((x + f * 8 + y * 2 + 6) % 17) === 0) v = 1; tone(s, f, x, y, v); } if (peak && (x + f) % 3 === 0) tone(s, f, x, t0 - 1, 1); }
  B.selOutline(s, f, OUT); } return s; };
const CREST = [[0, 59], [0, 38], [8, 32], [16, 24], [23, 15], [29, 9], [35, 6], [41, 7], [45, 11], [47, 17], [46, 23], [43, 26], [42, 21], [39, 17], [35, 16], [32, 20], [31, 27], [33, 35], [37, 44], [42, 52], [47, 59]];
const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i]; const [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const waveCrest = () => { const s = new Sheet('bw_wave_crest', 48, 60, 4, { anchor: 'base', baseOffset: 1 }); for (let f = 0; f < 4; f++) {
  for (let y = 0; y < 60; y++) for (let x = 0; x < 48; x++) { if (!inPoly(CREST, x + .5, y + .5)) continue;
    const lip = y < 22 && x > 30; const face = x > 30 && y >= 22; const edge = !inPoly(CREST, x + .5, y - 1.5);
    let v = lip ? (((x + y + f) % 4) ? 1 : .67) : face ? .67 : .33; if (edge && !lip) v = .67; if (y > 55) v = 0;
    if (!lip && y <= 55 && ((x + y * 2 + f * 5) % 12) < 2) v = face ? 1 : .67; tone(s, f, x, y, v); }
  for (let k = 0; k < 10; k++) { const x = 40 + ((k * 5 + f * 3) % 8); const y = 1 + ((k * 7 + f * 4) % 9); tone(s, f, x, y, 1); }
  for (let k = 0; k < 4; k++) tone(s, f, 44 + (k % 2), 27 + k * 2 + ((f + k) % 2), 1);
  B.selOutline(s, f, OUT); } return s; };
module.exports = { breathSheets: () => [waveBody(), waveCrest(), water(), serpent(), flame(), sun(), love(), steam(), bolt(), wind(), mist(), rock(), petal(), moon(), claw(), blast(), shield(), sting(), sound(), ice()] };
