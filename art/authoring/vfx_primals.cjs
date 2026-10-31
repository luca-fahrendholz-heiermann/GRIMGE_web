// GRIMGE — the ground Primals' bodies (drawn at scale 1: a sheet px is a world px). Own designs, spirit creatures
// in their archetype colours. Frames: 0–3 run cycle, 4 attack wind-up, 5 attack strike. All face right.
//   primal_wolf   6×64×40 (base) HUNTER — a lean spirit wolf, green fur, gold markings, mane wisps
//   primal_turtle 6×64×40 (base) BULWARK — a domed hex-plated shell, cyan spirit glow, stubby legs, snapping head
//   primal_ape    6×58×62 (base) BRAWLER — a broad spirit ape, violet fur, pale chest, huge forearms, knuckle walk
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
const disc = (s, f, r, cx, cy, rx, ry, sh) => { for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(rx); x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) tone(s, f, r, cx + x, cy + y, sh(x, y, e)); } };
const line = (s, f, r, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) tone(s, f, r, x0 + (x1 - x0) * i / n + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? k : 0), y0 + (y1 - y0) * i / n + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? 0 : k), typeof v === 'function' ? v(i / n) : v); };
const OUT = (c) => B.pal({ o: c }).o;
const lerp = (a, b, u) => a + (b - a) * u;

function wolf() {
  const s = new Sheet('primal_wolf', 64, 40, 6, { anchor: 'base', baseOffset: 1 });
  const fur = ramp('#16341a', '#2e6b34', '#4fa65a', '#7fd98a', '#c6ff7a'); const gold = ramp('#7a5a08', '#f2d12e', '#fff3a0');
  for (let f = 0; f < 6; f++) {
    const atk = f >= 4; const ph = (f % 4) / 4 * TAU; const bob = atk ? (f === 4 ? 2 : -1) : Math.round(-Math.abs(Math.sin(ph)) * 2); const lunge = f === 5 ? 4 : f === 4 ? -2 : 0; const headDip = f === 4 ? 3 : f === 5 ? 1 : 0;
    // torso: deep chest, tucked waist
    for (let x = 14; x <= 44; x++) { const u = (x - 14) / 30; const top = 15 - Math.round(Math.sin(u * Math.PI) * 2) + bob; const bot = Math.round(u < .45 ? lerp(23, 22, u / .45) : lerp(22, 29, (u - .45) / .55)) + bob;
      for (let y = top; y <= bot; y++) { const v = (y - top) / Math.max(1, bot - top); tone(s, f, fur, x + lunge, y, v < .22 ? .8 : v < .7 ? .55 : .3); } }
    for (let k = 0; k < 4; k++) line(s, f, gold, 22 + k * 5 + lunge, 15 + bob - (k % 2), 24 + k * 5 + lunge, 19 + bob, 1); // gold stripes
    // neck + head (dips to bite), pointed snout, jaw opens on the strike
    for (let k = 0; k <= 10; k++) { const nx = Math.round(lerp(40, 49, k / 10)) + lunge; const ny = Math.round(lerp(18, 11 + headDip, k / 10)) + bob; for (let d = -4; d <= 3; d++) tone(s, f, fur, nx, ny + d, d < -1 ? .8 : .55); }
    disc(s, f, fur, 50 + lunge, 11 + bob + headDip, 5, 4, (x, y) => (y < 0 ? .85 : .55));
    for (let x = 54; x <= 61; x++) { const u = (x - 54) / 7; const t0 = Math.round(lerp(9, 12, u)) + bob + headDip; const t1 = Math.round(lerp(14, 13, u)) + bob + headDip; for (let y = t0; y <= t1; y++) tone(s, f, fur, x + lunge, y, y === t0 ? .85 : .55); }
    if (f === 5) for (let x = 55; x <= 61; x++) tone(s, f, fur, x + lunge, 16 + bob + headDip + Math.round((x - 55) * .3), .4); // lower jaw dropped
    tone(s, f, gold, 53 + lunge, 10 + bob + headDip, 2); tone(s, f, fur, 61 + lunge, 12 + bob + headDip, 0);
    for (const ex of [46, 49]) for (let k = 0; k < 5; k++) tone(s, f, fur, ex + Math.round(k * .4) + lunge, 7 - k + bob + headDip, k > 2 ? 1 : .8);
    // legs: two-joint, galloping; crouched on the wind-up, stretched on the strike
    const legs = [[18, 21, ph + Math.PI, .4], [22, 21, ph + Math.PI + .6, .55], [38, 25, ph, .4], [42, 25, ph + .6, .55]];
    for (const [hx, hy, a, v] of legs) { const sw = atk ? (f === 4 ? -.4 : .8) * (hx < 30 ? -1 : 1) : Math.sin(a); const kx = hx + Math.round(sw * 4) + lunge; const ky = hy + 6 + bob; const fx = kx + Math.round(sw * 4); const fy = Math.min(38, ky + 8 - (atk ? 0 : Math.round(Math.max(0, Math.cos(a)) * 3)));
      line(s, f, fur, hx + lunge, hy + bob, kx, ky, v, 2); line(s, f, fur, kx, ky, fx, fy, v - .1, 2); tone(s, f, gold, fx + 1, fy, 1); }
    // bushy tail and spirit wisps on the back
    for (let k = 0; k <= 14; k++) { const u = k / 14; const tx = Math.round(14 - u * 12) + lunge; const ty = Math.round(16 - Math.sin(u * 2.4) * 5 + Math.sin(ph) * u * 2) + bob; const r = Math.max(1, Math.round(3 * Math.sin(Math.PI * (u * .8 + .2)))); for (let d = -r; d <= r; d++) tone(s, f, fur, tx, ty + d, d < 0 ? .85 : .5); }
    for (let i = 0; i < 4; i++) { const x0 = 19 + i * 7 + lunge; const top = 14 - Math.round(Math.sin(((x0 - lunge - 14) / 30) * Math.PI) * 2) + bob; const h = 2 + ((i + f) % 3); for (let k = 1; k <= h; k++) tone(s, f, fur, x0 - Math.round(k * .7), top - k, k === h ? 1 : .9); }
    B.selOutline(s, f, OUT('#06140a'));
  }
  return s;
}

function turtle() {
  const s = new Sheet('primal_turtle', 64, 40, 6, { anchor: 'base', baseOffset: 1 });
  const shell = ramp('#0e2a33', '#1d5a6b', '#2f8fa5', '#57e0f0', '#bff6ff'); const skin = ramp('#1a3a30', '#2f6b58', '#4f9f85', '#8fd9bf');
  for (let f = 0; f < 6; f++) {
    const atk = f >= 4; const ph = (f % 4) / 4 * TAU; const bob = atk ? 0 : Math.round(Math.abs(Math.sin(ph)) * 1);
    // legs (stubby, alternating), behind the shell rim
    for (const [lx, a] of [[16, ph], [24, ph + Math.PI], [38, ph + Math.PI], [46, ph]]) { const st = atk ? 0 : Math.round(Math.sin(a) * 2); for (let y = 28; y <= 38; y++) for (let x = -3; x <= 3; x++) tone(s, f, skin, lx + x + (y > 33 ? st : 0), y, x < -1 ? .7 : .4); tone(s, f, skin, lx + 3 + st, 38, 1); }
    // head: pulled back on the wind-up, thrust out snapping on the strike
    const hx = f === 4 ? 49 : f === 5 ? 60 : 55; const hy = 25 + bob;
    for (let x = 44; x <= hx; x++) for (let y = -3; y <= 3; y++) tone(s, f, skin, x, hy + y + Math.round((x - 44) * -.15), y < -1 ? .8 : .45);
    disc(s, f, skin, hx, hy - 3, 5, 4, (x, y) => (y < 0 ? .85 : .5)); tone(s, f, shell, hx + 2, hy - 5, 1); tone(s, f, skin, hx + 5, hy - 2, 0);
    if (f === 5) line(s, f, skin, hx + 1, hy, hx + 5, hy + 2, .2);
    // domed shell with hex plates and a glowing rim
    for (let y = 4; y <= 30; y++) for (let x = 6; x <= 50; x++) { const u = (x - 28) / 22; const v = (y - 30) / 26; if (u * u + v * v > 1 || y > 30) continue;
      const hxp = Math.round((x + (Math.floor(y / 7) % 2) * 5) / 10); const hyp = Math.floor(y / 7); const cx = hxp * 10 - (Math.floor(y / 7) % 2) * 5; const cy = hyp * 7 + 3.5; const edge = Math.abs(x - cx) > 3.5 || Math.abs(y - cy) > 2.5;
      tone(s, f, shell, x, y + bob, u * u + v * v > .86 ? 1 : edge ? .35 : (u + v < -.4 ? .75 : .55)); }
    for (let x = 6; x <= 50; x++) tone(s, f, shell, x, 30 + bob, (x + f) % 4 === 0 ? 1 : .8);
    B.selOutline(s, f, OUT('#04121a'));
  }
  return s;
}

function ape() {
  const s = new Sheet('primal_ape', 58, 62, 6, { anchor: 'base', baseOffset: 1 });
  const fur = ramp('#1c1030', '#3a2266', '#6a44b0', '#b06cff', '#efe6ff'); const skin = ramp('#4a3a5a', '#8a7aa0', '#c9b8e0', '#f0e8ff');
  for (let f = 0; f < 6; f++) {
    const atk = f >= 4; const ph = (f % 4) / 4 * TAU; const bob = atk ? 0 : Math.round(Math.abs(Math.sin(ph * 2)) * 1.5);
    // hind legs (short), knuckle-walking front arms swinging
    for (const [lx, a] of [[18, ph], [26, ph + Math.PI]]) { const st = atk ? 0 : Math.round(Math.sin(a) * 3); line(s, f, fur, lx, 42 + bob, lx + st, 60, .35, 5); tone(s, f, skin, lx + st + 2, 60, .6); }
    // torso: huge shoulders, pale chest
    disc(s, f, fur, 26, 34 + bob, 15, 13, (x, y, e) => (e > .8 && y < 0 ? .85 : x + y < -8 ? .7 : .45));
    disc(s, f, skin, 31, 37 + bob, 7, 8, (x, y) => (y < -2 ? .75 : .5));
    disc(s, f, fur, 22, 24 + bob, 13, 8, (x, y) => (y < -2 ? .9 : .55)); // shoulders / back hump
    // head: brow ridge, muzzle, glowing eyes
    disc(s, f, fur, 38, 22 + bob, 7, 7, (x, y) => (y < -2 ? .85 : .55)); disc(s, f, skin, 42, 25 + bob, 4, 3, (x, y) => (y < 0 ? .7 : .45));
    for (let x = 34; x <= 44; x++) tone(s, f, fur, x, 18 + bob, .3); tone(s, f, skin, 41, 20 + bob, 3); tone(s, f, skin, 39, 20 + bob, 3);
    // arms: far arm behind, near arm in front — wind-up raises the fist, strike punches forward
    const arm = (sx, sy, ex, ey, near) => { line(s, f, fur, sx, sy, ex, ey, near ? .6 : .3, near ? 6 : 5); disc(s, f, skin, ex, ey, near ? 4 : 3.5, near ? 4 : 3.5, (x, y) => (x + y < 0 ? .8 : .45)); };
    if (f === 4) { arm(16, 28 + bob, 12, 54, false); arm(30, 27 + bob, 26, 8, true); }
    else if (f === 5) { arm(16, 28 + bob, 14, 54, false); arm(32, 28 + bob, 54, 30, true); }
    else { const sw = Math.sin(ph) * 5; arm(16, 28 + bob, 12 - sw, 58, false); arm(32, 28 + bob, 40 + sw, 58, true); }
    // spirit flames on the shoulders
    for (let i = 0; i < 4; i++) { const x0 = 14 + i * 5; const h = 2 + ((i + f) % 3); for (let k = 1; k <= h; k++) tone(s, f, fur, x0 - Math.round(k * .5), 16 + bob - k, k === h ? 1 : .9); }
    B.selOutline(s, f, OUT('#0a0414'));
  }
  return s;
}

module.exports = { primalSheets: () => [wolf(), turtle(), ape()] };
