// GRIMGE — the ground Primals' bodies (drawn at scale 1: a sheet px is a world px). Own designs, spirit creatures
// in their archetype colours. Frames: 0–3 run cycle, 4 attack wind-up, 5 attack strike. All face right.
//   primal_wolf   6×64×40 (base) HUNTER — a lean spirit wolf, green fur with streak texture, pale chest ruff, gold markings
//   primal_turtle 6×64×40 (base) BULWARK — a low shell of dark plates with glowing cyan seams, scuted rim, beaked head
//   primal_ape    6×58×62 (base) BRAWLER — a hunched spirit gorilla, violet fur, silver back, huge forearms, knuckle walk
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
const disc = (s, f, r, cx, cy, rx, ry, sh) => { for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(rx); x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) tone(s, f, r, cx + x, cy + y, sh(x, y, e)); } };
const line = (s, f, r, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) tone(s, f, r, x0 + (x1 - x0) * i / n + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? k : 0), y0 + (y1 - y0) * i / n + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? 0 : k), typeof v === 'function' ? v(i / n) : v); };
const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i]; const [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const OUT = (c) => B.pal({ o: c }).o;
const lerp = (a, b, u) => a + (b - a) * u;
// A limb as a tapered stroke (w0 at the root, w1 at the end), shaded across: lit upper side, shadowed lower side.
const limb = (s, f, r, x0, y0, x1, y1, w0, w1, base = .5) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); const nx = -(y1 - y0) / n; const ny = (x1 - x0) / n;
  for (let i = 0; i <= n; i++) { const u = i / n; const w = lerp(w0, w1, u) / 2; for (let d = -w; d <= w; d += .5) tone(s, f, r, x0 + (x1 - x0) * u + nx * d, y0 + (y1 - y0) * u + ny * d, base + (d < -w * .4 ? .25 : d > w * .4 ? -.2 : 0)); } };
// Fill a polygon with top-left light, a lit rim on top edges and a streak texture (fur / plates).
const shape = (s, f, r, P, { light = .62, dark = .28, rim = .9, tex = 0, seed = 0 } = {}) => {
  const xs = P.map((p) => p[0]); const ys = P.map((p) => p[1]); const x0 = Math.floor(Math.min(...xs)); const x1 = Math.ceil(Math.max(...xs)); const y0 = Math.floor(Math.min(...ys)); const y1 = Math.ceil(Math.max(...ys));
  const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2; const sz = Math.max(x1 - x0, y1 - y0) / 2;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inPoly(P, x + .5, y + .5)) continue;
    const top = !inPoly(P, x + .5, y - 1.5); const k = clamp01(.5 - ((x - cx) + (y - cy)) / (sz * 2.4));
    let v = lerp(dark, light, k); if (top) v = rim; else if (tex && ((x * 3 + y * 7 + seed) % tex) === 0) v -= .18; else if (tex && ((x * 5 + y * 3 + seed) % (tex + 4)) === 0) v += .14;
    tone(s, f, r, x, y, v);
  }
};

function wolf() {
  const s = new Sheet('primal_wolf', 64, 40, 6, { anchor: 'base', baseOffset: 1 });
  const fur = ramp('#0e2412', '#1f4f27', '#33803f', '#55b864', '#8fe39a', '#d4ffb0'); const gold = ramp('#7a5a08', '#f2d12e', '#fff3a0'); const pale = ramp('#6a8f6a', '#b8dcb0', '#ecffe0');
  for (let f = 0; f < 6; f++) {
    const atk = f >= 4; const ph = (f % 4) / 4 * TAU; const bob = atk ? (f === 4 ? 2 : -1) : Math.round(-Math.abs(Math.sin(ph)) * 2); const L = f === 5 ? 4 : f === 4 ? -2 : 0; const dip = f === 4 ? 3 : f === 5 ? 1 : 0;
    // legs first (far pair darker, behind the body)
    const legs = [[18, 22, ph + Math.PI, .25], [22, 22, ph + Math.PI + .6, .5], [38, 25, ph, .25], [42, 25, ph + .6, .5]];
    for (const [hx, hy, a, v] of legs) { const sw = atk ? (f === 4 ? -.4 : .8) * (hx < 30 ? -1 : 1) : Math.sin(a); const kx = hx + Math.round(sw * 4) + L; const ky = hy + 7 + bob; const fx = kx + Math.round(sw * 4); const fy = Math.min(38, ky + 8 - (atk ? 0 : Math.round(Math.max(0, Math.cos(a)) * 3)));
      limb(s, f, fur, hx + L, hy + bob, kx, ky, 5, 3, v); limb(s, f, fur, kx, ky, fx, fy, 3, 2, v - .05); tone(s, f, gold, fx + 1, fy, 1); tone(s, f, gold, fx + 2, fy, .5); }
    // tail (bushy, swaying)
    for (let k = 0; k <= 14; k++) { const u = k / 14; const tx = Math.round(15 - u * 13) + L; const ty = Math.round(17 - Math.sin(u * 2.4) * 6 + Math.sin(ph) * u * 2) + bob; const r = Math.max(1, Math.round(3.4 * Math.sin(Math.PI * (u * .8 + .2)))); for (let d = -r; d <= r; d++) tone(s, f, fur, tx, ty + d, d < -r / 2 ? .85 : d > r / 2 ? .3 : .55); }
    // torso: deep chest, tucked waist, fur streaks
    const T = [[14, 18], [22, 14], [34, 13], [42, 15], [46, 20], [44, 28], [36, 27], [28, 24], [18, 26]].map(([x, y]) => [x + L, y + bob]);
    shape(s, f, fur, T, { light: .7, dark: .32, rim: .9, tex: 9, seed: f });
    // pale chest ruff and belly
    disc(s, f, pale, 42 + L, 22 + bob, 4, 5, (x, y) => (x + y < 0 ? .9 : .55)); for (let x = 30; x <= 40; x++) tone(s, f, pale, x + L, 26 + bob - Math.round((x - 30) * .1), .4);
    for (let k = 0; k < 4; k++) line(s, f, gold, 22 + k * 5 + L, 15 + bob - (k % 2), 24 + k * 5 + L, 19 + bob, 1); // gold stripes
    // neck + head (dips to bite), cheek ruff, snout, jaw opens on the strike
    shape(s, f, fur, [[40, 18], [46, 10], [52, 7], [54, 12], [50, 18], [46, 22]].map(([x, y]) => [x + L, y + bob + dip * (x > 46 ? 1 : .5)]), { light: .75, dark: .35, tex: 8, seed: 3 });
    disc(s, f, fur, 52 + L, 11 + bob + dip, 5, 4.5, (x, y) => (y < -1 ? .85 : x < -2 ? .45 : .6));
    for (let x = 55; x <= 62; x++) { const u = (x - 55) / 7; const t0 = Math.round(lerp(9, 12, u)) + bob + dip; const t1 = Math.round(lerp(14, 13, u)) + bob + dip; for (let y = t0; y <= t1; y++) tone(s, f, fur, x + L, y, y === t0 ? .85 : .55); }
    if (f === 5) for (let x = 55; x <= 61; x++) tone(s, f, fur, x + L, 16 + bob + dip + Math.round((x - 55) * .3), .35);
    disc(s, f, pale, 50 + L, 14 + bob + dip, 2.5, 2, () => .75); // cheek ruff
    tone(s, f, gold, 55 + L, 10 + bob + dip, 2); tone(s, f, gold, 56 + L, 10 + bob + dip, 1); tone(s, f, fur, 62 + L, 12 + bob + dip, 0); // eye, nose
    for (const ex of [48, 51]) for (let k = 0; k < 5; k++) for (let w = 0; w < Math.max(1, 3 - k); w++) tone(s, f, fur, ex + w + Math.round(k * .4) + L, 7 - k + bob + dip, k > 2 ? 1 : w ? .5 : .8); // ears
    // spirit wisps off the back
    for (let i = 0; i < 4; i++) { const x0 = 20 + i * 6 + L; const h = 2 + ((i + f) % 3); for (let k = 1; k <= h; k++) tone(s, f, fur, x0 - Math.round(k * .7), 13 + bob - k - (i === 1 || i === 2 ? 1 : 0), k === h ? 1 : .9); }
    B.selOutline(s, f, OUT('#06140a'), OUT('#55b864'));
  }
  return s;
}

function turtle() {
  const s = new Sheet('primal_turtle', 64, 40, 6, { anchor: 'base', baseOffset: 1 });
  const plate = ramp('#071a20', '#0e2f3a', '#174b5a', '#22677a', '#2f8199'); const seam = ramp('#2fa8c0', '#57e0f0', '#bff6ff'); const skin = ramp('#13302a', '#245a4c', '#3a8670', '#62b89b', '#a6e6cf'); const belly = ramp('#5a6a3a', '#a8b870', '#e0e8b0');
  for (let f = 0; f < 6; f++) {
    const atk = f >= 4; const ph = (f % 4) / 4 * TAU; const bob = atk ? 0 : Math.round(Math.abs(Math.sin(ph)) * 1);
    // tail and legs (scaled, splayed, claws); the far pair darker
    limb(s, f, skin, 9, 27 + bob, 3, 30 + bob, 4, 1, .45);
    for (const [lx, a, far] of [[14, ph, true], [22, ph + Math.PI, false], [38, ph + Math.PI, true], [46, ph, false]]) { const st = atk ? 0 : Math.round(Math.sin(a) * 2.5); const fx = lx + (lx > 30 ? 4 : -2) + st;
      limb(s, f, skin, lx, 28 + bob, fx, 37, far ? 6 : 8, far ? 5 : 6, far ? .25 : .5); for (let k = 0; k < 3; k++) tone(s, f, skin, fx - 2 + k * 2, 38, 1);
      if (!far) for (let k = 0; k < 3; k++) tone(s, f, skin, lx + (fx - lx) * (k + 1) / 4 - 1, 30 + bob + k * 2, .2); }
    // neck + beaked head: pulled in on the wind-up, thrust out snapping on the strike
    const hx = f === 4 ? 50 : f === 5 ? 60 : 55; const hy = 24 + bob;
    limb(s, f, skin, 44, 27 + bob, hx - 3, hy, 8, 6, .5);
    disc(s, f, skin, hx, hy - 1, 5.5, 4.5, (x, y) => (y < -1 ? .85 : x < -2 ? .4 : .6));
    for (let x = hx + 4; x <= hx + 7; x++) for (let y = hy - 2; y <= hy + 1 - (x - hx - 4); y++) tone(s, f, belly, x, y, x === hx + 7 ? .4 : .8); // beak
    if (f === 5) line(s, f, skin, hx + 2, hy + 2, hx + 7, hy + 4, .2);
    tone(s, f, seam, hx + 1, hy - 3, 2); tone(s, f, seam, hx + 2, hy - 3, 1); // eye
    // plastron peeking under the rim
    for (let x = 12; x <= 46; x++) for (let y = 27; y <= 29; y++) tone(s, f, belly, x, y + bob, y === 27 ? .9 : .5);
    // low domed carapace of dark plates (top-left light)
    const R = (x) => 1 - ((x - 29) / 21) ** 2; const topY = (x) => 27 - Math.sqrt(Math.max(0, R(x))) * 18;
    for (let x = 8; x <= 50; x++) { const t0 = Math.round(topY(x)); for (let y = t0; y <= 26; y++) { const k = clamp01(.55 - ((x - 29) / 21 + (y - 18) / 9) * .35); tone(s, f, plate, x, y + bob, y === t0 ? 1 : k > .6 ? .75 : k > .4 ? .55 : .35); } }
    // glowing seams: vertebral row along the crown, costal plates below it, the scuted rim
    const crown = (x) => Math.round(topY(x) + (26 - topY(x)) * .42);
    for (let x = 12; x <= 46; x++) tone(s, f, seam, x, crown(x) + bob, (x + f) % 6 === 0 ? 2 : 1);
    for (const vx of [18, 29, 40]) { for (let y = Math.round(topY(vx)) + 1; y < crown(vx); y++) tone(s, f, seam, vx + (y % 2), y + bob, 1); }
    for (const cx of [13, 23, 35, 45]) { for (let y = crown(cx) + 1; y <= 23; y++) tone(s, f, seam, cx, y + bob, 1); }
    for (let x = 8; x <= 50; x++) { tone(s, f, seam, x, 24 + bob, 1); tone(s, f, plate, x, 25 + bob, x % 5 === 0 ? 0 : .8); tone(s, f, plate, x, 26 + bob, x % 5 === 0 ? 0 : .55); }
    for (let k = 0; k < 3; k++) tone(s, f, seam, 16 + k * 3, Math.round(topY(16 + k * 3)) + 2 + bob, 2); // glint on the crown
    B.selOutline(s, f, OUT('#020c10'), OUT('#2fa8c0'));
  }
  return s;
}

function ape() {
  const s = new Sheet('primal_ape', 58, 62, 6, { anchor: 'base', baseOffset: 1 });
  const fur = ramp('#120a20', '#2a1a4a', '#46307a', '#6a4cb0', '#9a78e0', '#d8c8ff'); const silver = ramp('#5a5070', '#a69cc0', '#e6e0f5'); const skin = ramp('#2a2236', '#4a3e5c', '#6e6084', '#9c8eb2');
  for (let f = 0; f < 6; f++) {
    const atk = f >= 4; const ph = (f % 4) / 4 * TAU; const bob = atk ? 0 : Math.round(Math.abs(Math.sin(ph * 2)) * 1.5);
    // far arm (behind) and hind legs
    const sw = Math.sin(ph) * 5;
    if (f === 5) limb(s, f, fur, 30, 26 + bob, 28, 58, 9, 11, .25); else limb(s, f, fur, 30, 26 + bob, 34 - sw, 58, 9, 11, .25);
    for (const [lx, a] of [[12, ph], [20, ph + Math.PI]]) { const st = atk ? 0 : Math.round(Math.sin(a) * 3); limb(s, f, fur, lx, 42 + bob, lx - 1 + st, 58, 9, 7, .35); disc(s, f, skin, lx + st, 59, 4, 2, () => .5); }
    // hunched body: high shoulders, sloping back to the rump, silver saddle on the back
    const body = [[5, 40], [6, 30], [12, 22], [22, 15], [32, 12], [40, 16], [42, 26], [38, 38], [28, 45], [14, 46]].map(([x, y]) => [x, y + bob]);
    shape(s, f, fur, body, { light: .72, dark: .3, rim: .92, tex: 17, seed: f });
    for (let x = 9; x <= 24; x++) { const y0 = Math.round(lerp(26, 18, (x - 9) / 15)) + bob; for (let y = y0; y <= y0 + 3; y++) tone(s, f, silver, x, y, y === y0 ? 1 : ((x + y) % 4 === 0 ? .4 : .7)); }
    disc(s, f, skin, 34, 34 + bob, 6, 8, (x, y) => (x + y < -3 ? .85 : .55)); // bare chest
    // head low and forward: brow ridge, dark face, muzzle, glowing eyes
    disc(s, f, fur, 44, 21 + bob, 7, 7, (x, y) => (y < -3 ? .85 : x < -3 ? .4 : .6));
    for (let x = 39; x <= 50; x++) tone(s, f, fur, x, 17 + bob, .95);
    disc(s, f, skin, 47, 23 + bob, 4.5, 4, (x, y) => (y < -1 ? .75 : .45)); disc(s, f, skin, 50, 25 + bob, 2.5, 2, () => .85);
    tone(s, f, silver, 46, 20 + bob, 2); tone(s, f, silver, 48, 20 + bob, 2); tone(s, f, skin, 51, 25 + bob, 0);
    // near arm: huge forearm, knuckles — wind-up raises the fist, strike punches forward
    const near = (sx, sy, ex, ey) => { const mx = lerp(sx, ex, .45); const my = lerp(sy, ey, .45); limb(s, f, fur, sx, sy, mx, my, 9, 8, .55); limb(s, f, fur, mx, my, ex, ey, 9, 13, .6); disc(s, f, skin, ex + 1, ey + 1, 5, 4, (x, y) => (x + y < 0 ? .9 : .5)); };
    if (f === 4) near(36, 22 + bob, 30, 6); else if (f === 5) near(38, 24 + bob, 54, 26); else near(38, 24 + bob, 44 + sw, 57);
    // spirit flames on the shoulders
    for (let i = 0; i < 4; i++) { const x0 = 18 + i * 5; const h = 2 + ((i + f) % 3); for (let k = 1; k <= h; k++) tone(s, f, fur, x0 - Math.round(k * .5), Math.round(lerp(17, 12, i / 3)) + bob - k, k === h ? 1 : .9); }
    B.selOutline(s, f, OUT('#06030c'), OUT('#6a4cb0'));
  }
  return s;
}

module.exports = { primalSheets: () => [wolf(), turtle(), ape()] };
