// GRIMGE — Arcane States, round 2 (hand-drawn quality; final density). Manifestation sheets as_<id>_back / _front,
// 128×128 with the hero's CHEST at (64, 64), facing right. Rules (user, 26 Oct 2026): nothing over the face — big parts
// live on the back layer, attached to the body (no random floating parts); the front layer only holds small side
// sparks. Own designs from the forms' silhouettes.
//   T08 Ossuarium        a bone yoke over the shoulders carrying swinging glazed bells and two cracked grave slabs,
//                        jade sound rings pulsing off the bells
//   T23 Nullfeldträger   three black negative spaces with an acid-lime rim, specks streaming into them
//   T24 Fadenregent      a gold control cross above the back, two flat indigo marionettes hanging on light threads
//   T35 Kältestillstand  broken frosted-glass bands round back and hip, ice flakes frozen in the air
//   T37 Säuregerüst      a back rig of hexagonal dosing chambers (bubbling acid), glass tubes over the shoulders, drips
//   A05 Dehnleib         curling white steam clouds rising round the body (the stretch arms stay the form renderer)
//   A06 Beben            a web of glass cracks hanging behind the hero with drifting shards (fist cracks stay)
//   A08 Sprengleib       smoke plumes, a spark ring and glowing blast marks behind the body (fist smoke stays)
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
const pair = (id, n) => [new Sheet(`as_${id}_back`, 128, 128, n, { anchor: 'center' }), new Sheet(`as_${id}_front`, 128, 128, n, { anchor: 'center' })];
const CX = 64; const CY = 64;
const line = (s, f, r, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) tone(s, f, r, x0 + (x1 - x0) * i / n + k, y0 + (y1 - y0) * i / n, typeof v === 'function' ? v(i / n) : v); };
const disc = (s, f, r, x, y, rx, ry, shade) => { for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) { const e = (dx / rx) ** 2 + (dy / ry) ** 2; if (e <= 1) tone(s, f, r, x + dx, y + dy, shade(dx, dy, e)); } };
const sparks = (fr, f, r, seed, n = 2) => { for (const sx of [CX - 42, CX + 40]) { const q = rng(seed + f + sx); for (let i = 0; i < n; i++) { const x = sx + (q() - .5) * 10; const y = CY - 30 + q() * 70; tone(fr, f, r, x, y, 1); tone(fr, f, r, x + 1, y + 1, .7); } } };
const OUT = (c) => B.pal({ o: c }).o;

function t08() {
  const [bk, fr] = pair('T08', 8); const bone = ramp('#3a3426', '#7a705a', '#c8bc9c', '#efe6cc', '#fffaf0'); const glaze = ramp('#2a3a34', '#6a8a7a', '#bfd8c8', '#eef8f0'); const jade = ramp('#0e4a34', '#2ab47a', '#4fe0a8', '#c8ffe8'); const stone = ramp('#22302c', '#3e5048', '#64786c', '#8aa092');
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    // The yoke: a bone arc over the shoulders (behind), vertebra knobs along it.
    for (let a = Math.PI * 1.05; a <= Math.PI * 1.95; a += .01) { const x = CX - 4 + Math.cos(a) * 44; const y = CY - 6 + Math.sin(a) * 20; for (let d = -2; d <= 2; d++) tone(bk, f, bone, x, y + d, d < 0 ? .8 : .45); }
    for (let k = 0; k < 7; k++) { const a = Math.PI * (1.1 + k * .13); disc(bk, f, bone, Math.round(CX - 4 + Math.cos(a) * 44), Math.round(CY - 6 + Math.sin(a) * 20), 2, 2, (dx, dy) => (dx + dy < 0 ? .95 : .5)); }
    // Bells hanging from the yoke on short cords, swinging out of phase; a jade crack glows in the glaze.
    [[-40, 0], [-30, 3], [28, 3], [38, 0]].forEach(([ox, k], i) => { const a = Math.PI * (1.08 + (ox + 44) / 88 * .84); const hx = CX - 4 + Math.cos(a) * 44; const hy = CY - 6 + Math.sin(a) * 20; const sw = Math.sin((ph + i * .27) * TAU) * 3; const bx = hx + sw; const by = hy + 12 + k;
      line(bk, f, bone, hx, hy, bx, by - 6, .3);
      for (let y = -6; y <= 7; y++) { const w = Math.round(3 + (y + 6) * .38); for (let x = -w; x <= w; x++) tone(bk, f, glaze, bx + x, by + y, (x < -1 ? .9 : x < 2 ? .65 : .4) - (y > 5 ? .2 : 0)); }
      for (let y = -2; y <= 5; y++) tone(bk, f, jade, bx + Math.round(Math.sin(y * 1.3 + i) * 1.5), by + y, .8);
      tone(bk, f, bone, bx, by + 8, .9);
      if ((f + i * 2) % 8 < 2) for (let q = 0; q < 24; q++) { const ra = q / 24 * TAU; const R = 9 + ((f + i * 2) % 2) * 4; tone(bk, f, jade, bx + Math.cos(ra) * R, by + Math.sin(ra) * R * .6, .75); } });
    // Two cracked grave slabs hanging at the back, engraved.
    for (const [sx, sy, rot] of [[CX - 36, CY + 22, -.14], [CX - 24, CY + 30, .08]]) for (let y = -12; y <= 12; y++) for (let x = -6; x <= 6; x++) { const xx = sx + x * Math.cos(rot) - y * Math.sin(rot); const yy = sy + x * Math.sin(rot) + y * Math.cos(rot); const crack = Math.abs(x - Math.round(y * .4)) < 1 && y > -4; const rune = (y % 5 === 0 && Math.abs(x) < 4); tone(bk, f, crack ? jade : stone, xx, yy, crack ? .6 : rune ? .15 : (x < 0 ? .75 : .45) - (y > 9 ? .2 : 0)); }
    B.selOutline(bk, f, OUT('#0a100e')); sparks(fr, f, jade, 800);
  }
  return [bk, fr];
}
function t23() {
  const [bk, fr] = pair('T23', 8); const lime = ramp('#2a4a00', '#7ac000', '#a4ff3d', '#e6ff8a', '#ffffff'); const grey = ramp('#050608', '#1a1e26', '#4a5266');
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    [[-24, -30, 11], [22, -32, 9], [-30, 10, 8]].forEach(([ox, oy, R], i) => {
      const x = CX + ox; const y = CY + oy + Math.sin((ph + i * .3) * TAU) * 2;
      // Distortion rings (grey, rippling inward) around a pure black void, a crisp lime rim.
      for (let k = 0; k < 2; k++) { const rr = R + 4 + ((f * .5 + k * 2 + i) % 4) * 2 - 0; for (let a = 0; a < TAU; a += .05) if ((Math.round(a * 10) + f + k) % 3) tone(bk, f, grey, x + Math.cos(a) * rr, y + Math.sin(a) * rr, .9); }
      disc(bk, f, grey, x, y, R, R, () => 0);
      for (let a = 0; a < TAU; a += .02) { const on = Math.floor(a / TAU * 16 + f * 2) % 16 < 3; tone(bk, f, lime, x + Math.cos(a) * R, y + Math.sin(a) * R, on ? 1 : .55); }
      // Specks streaming into the void along spirals.
      for (let q = 0; q < 6; q++) { const rr = rng(200 + q + i * 17); const life = (ph + rr()) % 1; const a = rr() * TAU + life * 2; const d = R + 14 * (1 - life); tone(bk, f, lime, x + Math.cos(a) * d, y + Math.sin(a) * d, .9 - life * .3); }
    });
    B.selOutline(bk, f, OUT('#000000')); sparks(fr, f, lime, 830);
  }
  return [bk, fr];
}
function t24() {
  const [bk, fr] = pair('T24', 8); const gold = ramp('#4a3010', '#a8781e', '#ffd27a', '#fff4c8'); const ind = ramp('#0a0c22', '#141633', '#2a2f6a', '#5a6cff'); const thread = ramp('#c87a2a', '#ff9a3d', '#ffd27a', '#ffffff');
  for (let f = 0; f < 8; f++) {
    const ph = f / 8; const cxr = CX - 6; const cyr = CY - 52;
    // Control cross above the back (gold bars with knobs).
    line(bk, f, gold, cxr - 22, cyr, cxr + 22, cyr, (u) => .7 - Math.abs(u - .5) * .3, 2); line(bk, f, gold, cxr, cyr - 8, cxr, cyr + 10, .55, 2);
    for (const kx of [-22, 22]) disc(bk, f, gold, cxr + kx, cyr, 2, 2, (dx, dy) => (dx + dy < 0 ? 1 : .6));
    // Two flat shadow marionettes at the sides, swinging, hung on light threads from the cross ends.
    for (const side of [-1, 1]) {
      const sw = Math.sin((ph + (side > 0 ? .5 : 0)) * TAU) * 3; const px = CX + side * 36 + sw; const py = CY + 2;
      line(bk, f, thread, cxr + side * 22, cyr + 2, px, py - 22, (u) => ((Math.round(u * 30) + f) % 6 === 0 ? 1 : .55)); line(bk, f, thread, cxr + side * 10, cyr + 2, px + side * 8, py - 4, .45);
      disc(bk, f, ind, px, py - 18, 4, 5, (dx, dy) => (dx < 0 ? .7 : .45)); // head
      for (let y = -12; y <= 8; y++) { const w = y < -4 ? 4 : 3; for (let x = -w; x <= w; x++) tone(bk, f, ind, px + x, py + y, (x < 0 ? .65 : .4)); } // torso
      for (const [ax, ay, L, a] of [[-4, -10, 12, 2.2 + sw * .05], [4, -10, 12, .9 - sw * .05], [-2, 8, 14, 1.9], [2, 8, 14, 1.25]]) { const ex = px + ax + Math.cos(a) * L; const ey = py + ay + Math.sin(a) * L; line(bk, f, ind, px + ax, py + ay, ex, ey, .55, 2); disc(bk, f, gold, Math.round(px + ax), Math.round(py + ay), 1, 1, () => .9); }
      tone(bk, f, thread, px + side, py - 19, 1);
    }
    B.selOutline(bk, f, OUT('#05060f')); sparks(fr, f, thread, 860);
  }
  return [bk, fr];
}
function t35() {
  const [bk, fr] = pair('T35', 8); const frost = ramp('#1a2e3e', '#4a7a9a', '#8fdcff', '#d8f6ff', '#ffffff');
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    // Broken frosted-glass bands (back halves only): around the back at chest height and around the hip.
    for (const [by, rx, ry, tilt, gapA] of [[CY - 6, 34, 10, 6, .8], [CY + 24, 30, 9, -4, 2.2]]) for (let a = Math.PI; a <= TAU; a += .008) {
      if (Math.abs(a - Math.PI - gapA) < .18 || Math.abs(a - Math.PI - gapA - 1.4) < .1) continue; // breaks in the band
      const x = CX + Math.cos(a) * rx; const y = by + Math.sin(a) * ry + Math.cos(a) * tilt; for (let d = -3; d <= 3; d++) tone(bk, f, frost, x, y + d, d === -3 ? .95 : Math.abs(d) < 2 ? .55 + ((Math.round(a * 40) + f) % 7 === 0 ? .3 : 0) : .35);
    }
    // Frozen ice flakes hanging in the air (barely moving) and a crystal crest at the band breaks.
    const r = rng(77); for (let q = 0; q < 12; q++) { const x = CX - 44 + r() * 88; const y = CY - 50 + r() * 100 + Math.sin(ph * TAU + q) * .6; if (Math.abs(x - CX) < 16 && y > CY - 40) continue; for (let k = -2; k <= 2; k++) { tone(bk, f, frost, x + k, y, Math.abs(k) === 2 ? .6 : .95); tone(bk, f, frost, x, y + k, Math.abs(k) === 2 ? .6 : .95); } }
    B.selOutline(bk, f, OUT('#06121a')); sparks(fr, f, frost, 890);
  }
  return [bk, fr];
}
function t37() {
  const [bk, fr] = pair('T37', 8); const glass = ramp('#1f3a2e', '#4a7a62', '#a8d8bc', '#e9fff1'); const acid = ramp('#2a5a00', '#6ac010', '#c6ff3d', '#f4ffc0'); const metal = ramp('#14201a', '#2a3a32', '#4a5e54', '#7a9084');
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    // Back rig: three hexagonal dosing chambers in a frame behind the back, acid level sloshing, bubbles rising.
    [[CX - 34, CY - 6], [CX - 40, CY + 16], [CX - 30, CY + 32]].forEach(([hx, hy], i) => {
      const R = 11; for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const hexd = Math.max(Math.abs(y) * 1.15, Math.abs(x) * .58 + Math.abs(y) * .58); if (hexd > R) continue; const rim = hexd > R - 2; const level = y > -2 + Math.sin((ph + i * .3) * TAU) * 1.5; tone(bk, f, rim ? metal : level ? acid : glass, hx + x, hy + y, rim ? (y < 0 ? .8 : .45) : level ? (x < 0 ? .7 : .5) : .45); }
      for (let q = 0; q < 3; q++) { const life = (ph + q / 3 + i * .2) % 1; tone(bk, f, acid, hx - 3 + q * 3, hy + 5 - life * 9, 1); }
    });
    // Glass tubes from the chambers over the shoulders, a nozzle at each, acid pulses running through.
    for (const [x0, y0, x1, y1] of [[CX - 30, CY - 14, CX + 10, CY - 24], [CX - 44, CY + 8, CX - 14, CY - 26]]) { const n = 30; for (let i = 0; i <= n; i++) { const u = i / n; const x = x0 + (x1 - x0) * u; const y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 10; for (let d = -1; d <= 1; d++) tone(bk, f, (i + f * 4) % 10 < 3 && d === 0 ? acid : glass, x, y + d, d === -1 ? .9 : d === 0 ? .55 : .4); } disc(bk, f, metal, x1, y1, 2, 2, (dx, dy) => (dx + dy < 0 ? .85 : .45)); }
    // Acid drips falling from the rig.
    for (let q = 0; q < 3; q++) { const r = rng(330 + q); const life = (ph + r()) % 1; const x = CX - 44 + r() * 24; tone(bk, f, acid, x, CY + 42 + life * 22, .9); tone(bk, f, acid, x, CY + 41 + life * 22, .6); }
    B.selOutline(bk, f, OUT('#06100a')); sparks(fr, f, acid, 920);
  }
  return [bk, fr];
}
function a05() {
  const [bk, fr] = pair('A05', 8); const steam = ramp('#8a8a94', '#c8c8d0', '#eeeef4', '#ffffff');
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    // Big curling steam clouds rising around the body: each cloud is a cluster of puffs with a spiral curl.
    for (let q = 0; q < 8; q++) { const r = rng(400 + q); const life = (ph + q / 8) % 1; if (life > .9) continue; const side = q % 2 ? 1 : -1; const x = CX + side * (28 + r() * 8) + Math.sin(life * 4 + q) * 4; const y = CY + 46 - life * 104; const R = 7 + life * 8;
      for (const [ox, oy, k] of [[0, 0, 1], [-R * .7, R * .3, .7], [R * .7, R * .25, .75], [R * .2, -R * .5, .6]]) disc(bk, f, steam, Math.round(x + ox), Math.round(y + oy), Math.round(R * k), Math.round(R * k * .8), (dx, dy, e) => (e > .78 ? .3 : dx + dy < 0 ? .95 : .62));
      for (let a = 0; a < TAU * .9; a += .08) { const rr = R * .7 * (a / TAU); tone(bk, f, steam, x + Math.cos(a + q) * rr, y + Math.sin(a + q) * rr * .8, .25); } }
    for (let a = Math.PI * 1.1; a < Math.PI * 1.9; a += .03) { const rr = 40 + Math.sin(a * 3 + ph * TAU) * 3; tone(bk, f, steam, CX + Math.cos(a) * rr, CY + 40 + Math.sin(a) * 10, .8); } // a steam swirl at the feet
    B.selOutline(bk, f, OUT('#3a3a44')); sparks(fr, f, steam, 950);
  }
  return [bk, fr];
}
function a06() {
  const [bk, fr] = pair('A06', 8); const glass = ramp('#2a4a4a', '#80cbc4', '#e0f2f1', '#ffffff');
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    // A web of cracks hanging in the air behind the hero: jagged radial cracks from two centres and connecting rings.
    for (const [cx, cy, n, R] of [[CX - 28, CY - 14, 7, 30], [CX + 28, CY + 4, 6, 26]]) {
      const r = rng(cx * 7 + cy); for (let k = 0; k < n; k++) { const a = k / n * TAU + r() * .4; let x = cx; let y = cy; for (let j = 0; j < 5; j++) { const nx = cx + Math.cos(a + (r() - .5) * .5) * R * (j + 1) / 5; const ny = cy + Math.sin(a + (r() - .5) * .5) * R * (j + 1) / 5; line(bk, f, glass, x, y, nx, ny, j < 2 ? .95 : .7); x = nx; y = ny; } }
      for (const rr of [R * .4, R * .75]) for (let a = 0; a < TAU; a += .1) if ((Math.round(a * 10) + Math.round(rr)) % 4) tone(bk, f, glass, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, .6);
    }
    // Drifting shards (triangles) that slowly turn.
    for (let q = 0; q < 6; q++) { const r = rng(500 + q); const x = CX - 46 + r() * 92; const y = CY - 40 + r() * 80 - ph * 6; if (Math.abs(x - CX) < 16) continue; const s = 3 + Math.floor(r() * 3); for (let y2 = 0; y2 < s; y2++) for (let x2 = 0; x2 <= y2; x2++) tone(bk, f, glass, x + x2 - y2 / 2 + (f % 2), y + y2, x2 === 0 ? 1 : .55); }
    B.selOutline(bk, f, OUT('#0a1818')); sparks(fr, f, glass, 980);
  }
  return [bk, fr];
}
function a08() {
  const [bk, fr] = pair('A08', 8); const smoke = ramp('#1a1210', '#3a2a24', '#5a4a40', '#7a6a5e'); const fire = ramp('#8a2a00', '#ff6d00', '#ffd180', '#ffea00', '#ffffff');
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    // Smoke plumes rising behind the shoulders.
    for (let q = 0; q < 8; q++) { const life = (ph + q / 8) % 1; const side = q % 2 ? 1 : -1; const x = CX + side * (18 + life * 10) + Math.sin(life * 5 + q) * 3; const y = CY - 20 - life * 40; const R = 4 + life * 6; disc(bk, f, smoke, Math.round(x), Math.round(y), Math.round(R), Math.round(R * .85), (dx, dy, e) => (e > .7 ? .3 : dx + dy < 0 ? .85 : .55)); }
    // A ring of sparks spinning at the hips and glowing blast marks (crosses) behind.
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + ph * TAU; if (Math.sin(a) > 0) continue; const x = CX + Math.cos(a) * 34; const y = CY + 22 + Math.sin(a) * 9; tone(bk, f, fire, x, y, 1); tone(bk, f, fire, x - Math.sin(a), y + 1, .6); }
    for (const [mx, my] of [[CX - 30, CY - 4], [CX + 28, CY - 12], [CX - 22, CY + 34]]) { const on = (f + mx) % 4 < 2; for (let k = -3; k <= 3; k++) { tone(bk, f, fire, mx + k, my, on ? (Math.abs(k) < 2 ? 1 : .6) : .3); tone(bk, f, fire, mx, my + k, on ? (Math.abs(k) < 2 ? 1 : .6) : .3); } }
    B.selOutline(bk, f, OUT('#0a0604')); sparks(fr, f, fire, 1010, 3);
  }
  return [bk, fr];
}
module.exports = { arcane2Sheets: () => [...t08(), ...t23(), ...t24(), ...t35(), ...t37(), ...a05(), ...a06(), ...a08()] };
