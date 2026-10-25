// GRIMGE Prototype — element material drawing (user, 25 Oct 2026: "genau so im Detail auch die anderen
// Attacken und Elemente"; reference: Tidenbohrer v3). Shared, purely visual primitives that make every element
// behave like its material over the whole life of a shape:
//   birth — it grows out of its source (a hand, a nozzle, the ground)
//   body  — the material flows (fire licks upward, water streams, ice crystallises, lightning re-forms …)
//   edge  — the leading end breaks up the way the material would (flame splash, spray, shard burst, crackle)
//   death — it burns out / tears off / shatters / blinks out (callers pass k = 0 … 1 strength)
// Everything is opaque and drawn in 1-world-px steps (the res-2 sprite density), with seeded irregularity —
// no soft gradients, no additive glow.
const R = Math.round;
const box = (ctx, x, y, w, h, c) => { if (w <= 0 || h <= 0) return; ctx.fillStyle = c; ctx.fillRect(R(x), R(y), R(w), R(h)); };
export const hash01 = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export const MAT = Object.freeze({
  fire: { out: '#4a1206', deep: '#8d2a0c', body: '#e64a19', mid: '#ff9800', light: '#ffd54f', core: '#fff6d0', smoke: '#3e3230' },
  water: { out: '#082a4d', deep: '#0b3d73', body: '#1f7fd1', mid: '#2fb4ea', light: '#7fdcff', core: '#ffffff', foam: '#d6f6ff' },
  ice: { out: '#123a5a', deep: '#2f6f9f', body: '#4fa3d1', mid: '#81d4fa', light: '#e1f5fe', core: '#ffffff' },
  lightning: { out: '#5d4300', deep: '#f9a825', body: '#ffe600', mid: '#fff59d', light: '#fffde7', core: '#ffffff' },
  void: { out: '#000000', deep: '#1a0026', body: '#4a0d6b', mid: '#9c27b0', light: '#e040fb', core: '#f3c5ff' },
  light: { out: '#7a4f00', deep: '#ffb300', body: '#ffe082', mid: '#fff3c4', light: '#fffdf2', core: '#ffffff' }
});
export const materialForVfx = (vfx) => ({ fire: 'fire', ice: 'ice', lightning: 'lightning', void: 'void', light: 'light', water: 'water' }[vfx] ?? null);

// ── a ball of fire (projectile head) ──────────────────────────────────────
// A lumpy, churning body (dark rim → red → orange → yellow → white heart toward the front) with flame
// tongues streaming back against the flight and licking upward. dir = flight direction (±1 or an angle).
export function drawFireBall(ctx, x, y, r, dir, t, seed = 1, k = 1) {
  const m = MAT.fire; const ang = typeof dir === 'number' && Math.abs(dir) === 1 ? (dir > 0 ? 0 : Math.PI) : dir;
  const bx = -Math.cos(ang); const by = -Math.sin(ang); // backwards
  // Tongues: tapered, wavy, rising a little as they trail.
  for (let i = 0; i < 5; i++) {
    const len = r * (1.5 + hash01(seed + i) * 1.6) * (.85 + .15 * Math.sin(t * 18 + i * 2)); const off = (i - 2) * r * .32;
    const steps = Math.max(2, R(len));
    for (let s = 0; s <= steps; s++) {
      const u = s / steps; const wave = Math.sin(u * 5 - t * 26 + i * 1.7) * r * .18 * u;
      const px = x + bx * (r * .4 + u * len) - by * (off * (1 - u * .4) + wave);
      const py = y + by * (r * .4 + u * len) + bx * (off * (1 - u * .4) + wave) - u * u * r * .5;
      const w = Math.max(1, R(r * .55 * (1 - u) + 1));
      box(ctx, px - w / 2 - 1, py - w / 2 - 1, w + 2, w + 2, m.out);
    }
    for (let s = 0; s <= steps; s++) {
      const u = s / steps; const wave = Math.sin(u * 5 - t * 26 + i * 1.7) * r * .18 * u;
      const px = x + bx * (r * .4 + u * len) - by * (off * (1 - u * .4) + wave);
      const py = y + by * (r * .4 + u * len) + bx * (off * (1 - u * .4) + wave) - u * u * r * .5;
      const w = Math.max(1, R(r * .55 * (1 - u) + 1));
      box(ctx, px - w / 2, py - w / 2, w, w, u < .35 ? m.mid : u < .7 ? m.body : m.deep);
    }
  }
  // Body: concentric lumpy layers, the hot heart pushed toward the front-top.
  const layers = [[1, m.out, 0], [.9, m.body, .08], [.7, m.mid, .16], [.48, m.light, .24], [.24, m.core, .3]];
  for (const [rk, c, push] of layers) {
    const rr = r * rk * (.8 + .2 * k); const cx = x - bx * r * push; const cy = y - by * r * push - r * push * .4;
    for (let yy = -R(rr) - 1; yy <= R(rr) + 1; yy++) {
      const a = Math.asin(clamp01(Math.abs(yy) / (rr + .01))); const lump = 1 + .14 * Math.sin(a * 5 + t * 22 + seed + (yy > 0 ? 1.3 : 0));
      const hw = Math.sqrt(Math.max(0, rr * rr * lump * lump - yy * yy));
      if (hw >= .5) box(ctx, cx - hw, cy + yy, hw * 2, 1, c);
    }
  }
}

// ── streams: beams, rays, breath ──────────────────────────────────────────
// One look per material, drawn column by column from (x0, y0) to (x1, y1) (beams run nearly level).
// w = nominal width, t = time (s), k = strength (0 … 1, fades the width — no alpha).
export function drawStream(ctx, mat, x0, y0, x1, y1, w, t, seed = 1, k = 1) {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return;
  const dx = (x1 - x0) / L; const dy = (y1 - y0) / L; const n = R(L);
  const W = Math.max(3, w * (.55 + .45 * k));
  const col = (s) => ({ x: x0 + dx * s, y: y0 + dy * s });
  if (mat === 'lightning') return drawBolt(ctx, x0, y0, x1, y1, W, t, seed, k);
  const m = MAT[mat] ?? MAT.fire;
  // Width profile: a root that swells out of the source, the body, a widening head that breaks up.
  const prof = (s) => { const u = s / L; const root = Math.min(1, .45 + u * L / 26 * .55); const head = u > .8 ? 1 + (u - .8) * 1.5 : 1; return W * root * head; };
  for (let pass = 0; pass < 4; pass++) for (let s = 0; s <= n; s++) {
    const p = col(s); const x = R(p.x); let hw = prof(s) / 2; let top; let bot;
    // Leading end: the last stretch drops columns and scatters (the material breaks up).
    if (s > L * .88) { const fr = (s - L * .88) / (L * .12); if (hash01(Math.floor(s / 3) + seed) < fr * .8) continue; }
    if (mat === 'fire') {
      // Flames lick upward: tongues travel outward along the top edge; the bottom stays calmer.
      // Pointed tongues of irregular height (each 17-px cell has its own), drifting outward and flickering.
      const cellF = (s - t * 90) / 17; const cell = Math.floor(cellF); const u = cellF - cell;
      const amp = W * (.2 + hash01(cell + seed) * .75) * (.8 + .2 * Math.sin(t * 30 + cell));
      const tongue = Math.pow(Math.max(0, Math.sin(u * Math.PI)), 2.4) * amp;
      top = p.y - hw - tongue; bot = p.y + hw * .8 + Math.sin(s / 5 - t * 20) * 1.2;
    } else if (mat === 'water') {
      const wob = Math.sin(s / 6.5 - t * 50) * 1.2; top = p.y - hw + wob; bot = p.y + hw + wob * .5;
    } else if (mat === 'ice') {
      // A crystallised ray: hard straight body; ice needles grow out of both edges (irregular, fixed in place).
      const cell = Math.floor(s / 6); const spike = hash01(cell + seed) > .55 ? (1 - Math.abs((s % 6) - 3) / 3) * W * (.4 + hash01(cell * 3 + seed) * .7) : 0;
      const up = hash01(cell * 7 + seed) > .5;
      top = p.y - hw * .8 - (up ? spike : 0); bot = p.y + hw * .8 + (up ? 0 : spike);
    } else if (mat === 'void') {
      const pinch = 1 + Math.sin(s / 11 + t * 18) * .18; top = p.y - hw * pinch; bot = p.y + hw * pinch;
    } else { // light: a hard, perfectly straight shaft that shimmers at its edges
      const sh = hash01(Math.floor(s / 3) + Math.floor(t * 24) * 17 + seed) > .8 ? 1 : 0;
      top = p.y - hw * .7 - sh; bot = p.y + hw * .7 + sh;
    }
    top = R(top); bot = R(bot); const h = bot - top;
    if (pass === 0) box(ctx, x, top - 1, 1, h + 3, m.out);
    else if (pass === 1) box(ctx, x, top, 1, h + 1, mat === 'void' ? m.deep : m.body);
    else if (pass === 2) {
      if (mat === 'fire') {
        // Hot in the middle, cooler toward the edges: red tongue tips, an orange body, a yellow core band.
        const yc = p.y; const tTop = R(yc - hw);
        if (tTop > top) { box(ctx, x, top, 1, Math.max(1, R((tTop - top) * .45)), m.deep); }
        box(ctx, x, R(yc - hw * .7), 1, Math.max(1, R(hw * 1.2)), m.mid);
        box(ctx, x, R(yc - hw * .32), 1, Math.max(1, R(hw * .5)), m.light);
      }
      else if (mat === 'void') { box(ctx, x, top, 1, 1, m.light); box(ctx, x, bot, 1, 1, m.mid); }
      else if (mat === 'ice') {
        // Crystal facets: every cell is a slanted prism — a lit face and a shaded face, split on a diagonal.
        const cell = Math.floor(s / 7); const u = (s % 7) / 7; const yc = p.y; const split = R(yc - hw * .8 + u * hw * 1.6);
        box(ctx, x, top, 1, Math.max(1, split - top), hash01(cell + seed * 3) > .5 ? m.light : m.mid);
        box(ctx, x, split, 1, Math.max(1, bot - split), m.body);
        if ((s % 7) === 0) box(ctx, x, top, 1, h, m.deep); // facet seam
      } else { // light: gold sheath, a broad white-hot core
        box(ctx, x, top, 1, 1, m.deep); box(ctx, x, bot, 1, 1, m.deep);
        box(ctx, x, R(p.y - hw * .45), 1, Math.max(1, R(hw * .9)), m.mid);
      }
    } else {
      // Flow detail travelling along the stream (void flows inward — it pulls).
      const flowDir = mat === 'void' ? -1 : 1; const f = (s - flowDir * t * (mat === 'fire' ? 360 : 560)) / 14; const ph = f - Math.floor(f);
      const len = .25 + hash01(Math.floor(f) + seed) * .3; const mid = R((top + bot) / 2);
      if (mat === 'fire') { if (ph < len) box(ctx, x, mid - 1, 1, 2, m.core); }
      else if (mat === 'water') { box(ctx, x, top, 1, 1, m.light); if (ph < len && h >= 4) box(ctx, x, top + 1, 1, 1, ph < len * .5 ? m.core : m.foam); }
      else if (mat === 'ice') { box(ctx, x, mid, 1, 1, m.core); if (ph < len * .4) box(ctx, x, top + 1, 1, 1, m.core); }
      else if (mat === 'void') { box(ctx, x, mid, 1, 1, '#000000'); if (ph < len) { box(ctx, x, top + 1, 1, 1, m.light); box(ctx, x, bot - 1, 1, 1, m.light); } }
      else {
        box(ctx, x, mid - 1, 1, 3, m.core);
        // Light rays flicker off the shaft: short vertical spokes of random length, gold with a white root.
        if (s % 5 === 0) { const fr = Math.floor(t * 18); const hr = hash01(Math.floor(s / 5) * 13 + fr * 7 + seed); if (hr > .55) { const l = R(W * (.3 + (hr - .55) * 2.2)); const up = hash01(s + fr) > .5; box(ctx, x, up ? top - l : bot + 1, 1, l, m.body); box(ctx, x, up ? top - 2 : bot + 1, 1, 2, m.core); } }
      }
    }
  }
  drawStreamHead(ctx, mat, x1, y1, Math.atan2(dy, dx), W, t, seed);
  drawStreamRoot(ctx, mat, x0, y0, W, t, seed);
}

// The leading end of a stream: how the material arrives.
export function drawStreamHead(ctx, mat, x, y, ang, W, t, seed = 1) {
  const m = MAT[mat] ?? MAT.fire; const cs = Math.cos(ang); const sn = Math.sin(ang);
  if (mat === 'fire') { drawFireBall(ctx, x, y, W * .55, ang + Math.PI, t, seed + 9); return; } // a roiling splash licking back
  if (mat === 'water' || mat === 'light' || mat === 'ice' || mat === 'void') {
    const N = mat === 'void' ? 8 : 11;
    for (let i = 0; i < N; i++) {
      const life = (t * (mat === 'void' ? 2.5 : 3) + hash01(seed + i)) % 1;
      let a = ang + (hash01(seed + i * 7) - .5) * (mat === 'light' ? 2.4 : 1.4); let d = 2 + life * W * 1.4;
      if (mat === 'void') { a = hash01(seed + i * 7) * Math.PI * 2 + t * 6; d = W * (1.2 - life); } // motes falling in
      const px = x + Math.cos(a) * d; const py = y + Math.sin(a) * d * .75 + (mat === 'water' ? life * life * 14 : 0);
      const sz = life < .4 ? 3 : life < .75 ? 2 : 1;
      if (mat === 'ice') { box(ctx, px - 1, py, 3, 1, m.light); box(ctx, px, py - 1, 1, 3, m.light); box(ctx, px, py, 1, 1, m.core); continue; }
      if (mat === 'light') { box(ctx, px - sz, py, sz * 2 + 1, 1, m.body); box(ctx, px, py - sz, 1, sz * 2 + 1, m.body); box(ctx, px, py, 1, 1, m.core); continue; }
      box(ctx, px - 1, py - 1, sz + 1, sz + 1, m.out); box(ctx, px, py, sz, sz, i % 3 ? m.mid : (m.foam ?? m.light));
    }
    if (mat === 'void') { for (let yy = -R(W * .5); yy <= R(W * .5); yy++) { const hw = Math.sqrt(Math.max(0, (W * .5) ** 2 - yy * yy)); box(ctx, x - hw - 1, y + yy, hw * 2 + 2, 1, m.light); box(ctx, x - hw + 1, y + yy, Math.max(0, hw * 2 - 2), 1, '#000000'); } }
    if (mat === 'light') { const s = R(W * .8 + Math.sin(t * 30) * 2); box(ctx, x - s, y - 1, s * 2, 2, m.mid); box(ctx, x - 1, y - s, 2, s * 2, m.mid); box(ctx, x - 2, y - 2, 4, 4, m.core); }
    if (mat === 'ice') { for (let i = 0; i < 6; i++) { const a = ang + (i - 2.5) * .5; const l = W * (.6 + hash01(seed + i * 5) * .6); for (let s = 0; s < l; s++) box(ctx, x + cs * 2 + Math.cos(a) * s, y + Math.sin(a) * s * .8, 2, 2, s < l * .6 ? m.mid : m.light); } }
  }
}
// The root of a stream: it grows out of the hand / source.
export function drawStreamRoot(ctx, mat, x, y, W, t, seed = 1) {
  const m = MAT[mat] ?? MAT.fire; const r = W * .45 + Math.sin(t * 24) * 1;
  if (mat === 'fire') { drawFireBall(ctx, x, y, r, Math.PI, t, seed + 3); return; }
  for (let yy = -R(r); yy <= R(r); yy++) { const hw = Math.sqrt(Math.max(0, r * r - yy * yy)); box(ctx, x - hw - 1, y + yy, hw * 2 + 2, 1, m.out); box(ctx, x - hw, y + yy, hw * 2, 1, yy < -r * .3 ? m.light : m.mid); }
  box(ctx, x - 1, y - 1, 2, 2, m.core);
}

// ── lightning ──────────────────────────────────────────────────────────────
// A thick jagged bolt that re-forms ~20× per second: a white-hot core, a yellow sheath, a dark rim, side
// forks that flicker off it, and a crackling knot at the end.
export function drawBolt(ctx, x0, y0, x1, y1, W, t, seed = 1, k = 1) {
  const m = MAT.lightning; const L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return;
  const frame = Math.floor(t * 20); const dx = (x1 - x0) / L; const dy = (y1 - y0) / L; const nx = -dy; const ny = dx;
  const pts = [[x0, y0]]; let s = 0; let i = 0;
  while (s < L) { s = Math.min(L, s + 10 + hash01(seed + frame * 13 + i) * 12); const off = s >= L ? 0 : (hash01(seed + frame * 31 + i * 3) - .5) * W * 1.3; pts.push([x0 + dx * s + nx * off, y0 + dy * s + ny * off]); i++; }
  const seg = (a, b, size, c) => { const l = Math.max(1, R(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let j = 0; j <= l; j++) box(ctx, a[0] + (b[0] - a[0]) * j / l - size / 2, a[1] + (b[1] - a[1]) * j / l - size / 2, size, size, c); };
  const sheath = Math.max(3, R(W * .45 * (.6 + .4 * k)));
  for (let j = 1; j < pts.length; j++) seg(pts[j - 1], pts[j], sheath + 2, m.out);
  for (let j = 1; j < pts.length; j++) seg(pts[j - 1], pts[j], sheath, m.body);
  for (let j = 1; j < pts.length; j++) seg(pts[j - 1], pts[j], Math.max(1, sheath - 3), m.mid);
  for (let j = 1; j < pts.length; j++) seg(pts[j - 1], pts[j], 1, m.core);
  // Forks: short jagged side branches from a few joints.
  for (let j = 1; j < pts.length - 1; j++) {
    if (hash01(seed + frame * 7 + j * 11) > .45) continue;
    const side = hash01(seed + frame + j) > .5 ? 1 : -1; let a = pts[j];
    for (let q = 0; q < 3; q++) { const l = 6 + hash01(seed + j * 5 + q + frame) * 8; const b = [a[0] + dx * l * .6 + nx * side * l * .8, a[1] + dy * l * .6 + ny * side * l * .8]; seg(a, b, 2, m.body); seg(a, b, 1, m.core); a = b; }
  }
  // The end knot: a crackling ball of short arcs.
  for (let q = 0; q < 6; q++) { const a = hash01(seed + frame * 3 + q) * Math.PI * 2; const l = W * (.4 + hash01(seed + q * 9 + frame) * .6); seg([x1, y1], [x1 + Math.cos(a) * l, y1 + Math.sin(a) * l], 2, m.body); }
  box(ctx, x1 - 3, y1 - 3, 6, 6, m.mid); box(ctx, x1 - 2, y1 - 2, 4, 4, m.core);
}

// ── gathering (beam charge / cast windup) ────────────────────────────────
// The material collects at a point before it is released: fire swirls into a growing ball, water spirals in,
// ice crystals snap together, lightning sparks jump inward, void folds in, light condenses into a star.
export function drawGather(ctx, mat, x, y, r, t, seed = 1) {
  const m = MAT[mat] ?? MAT.fire;
  if (mat === 'fire') { drawFireBall(ctx, x, y, Math.max(2, r * .6), -Math.PI / 2, t, seed); }
  for (let i = 0; i < 8; i++) {
    const life = (t * 2.2 + hash01(seed + i)) % 1; const a = hash01(seed + i * 5) * Math.PI * 2 + life * 2.5; const d = r * 1.8 * (1 - life) + r * .3;
    const px = x + Math.cos(a) * d; const py = y + Math.sin(a) * d * .8;
    if (mat === 'lightning') { box(ctx, px, py, 2, 2, m.body); box(ctx, (px + x) / 2, (py + y) / 2, 1, 1, m.core); continue; }
    box(ctx, px - 1, py - 1, 3, 3, m.out); box(ctx, px, py, 2, 2, life > .6 ? m.light : m.mid);
  }
  if (mat !== 'fire') { const rr = Math.max(2, r * .45); for (let yy = -R(rr); yy <= R(rr); yy++) { const hw = Math.sqrt(Math.max(0, rr * rr - yy * yy)); box(ctx, x - hw - 1, y + yy, hw * 2 + 2, 1, m.out); box(ctx, x - hw, y + yy, hw * 2, 1, mat === 'void' ? '#000000' : m.mid); } box(ctx, x - 1, y - 1, 2, 2, mat === 'void' ? m.light : m.core); }
}

// ── a void orb (projectile) ────────────────────────────────────────────────
// A hole in the world: a black core with a hot violet rim, a tilted ring of matter spiralling into it and
// dark tears trailing behind where space is dragged along. dir = ±1 flight direction.
export function drawVoidOrb(ctx, x, y, r, dir, t, seed = 1) {
  const m = MAT.void; const back = -(dir || 1);
  // Tears: dark streaks pulled back, pinched toward the orb.
  for (let i = 0; i < 4; i++) {
    const len = r * (1.8 + hash01(seed + i) * 1.4); const off = (i - 1.5) * r * .45;
    for (let s = 0; s < len; s++) { const u = s / len; const yy = y + off * (.3 + u * .7) + Math.sin(u * 4 + t * 12 + i) * 1.5; box(ctx, x + back * (r * .6 + s), yy, 1, Math.max(1, R(2 * (1 - u)) + 1), u < .3 ? m.mid : u < .7 ? m.body : m.deep); }
  }
  // The infalling ring: motes on a tilted ellipse, back half first, then the core, then the front half.
  const ring = (front) => { for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + t * 7; if ((Math.sin(a) > 0) !== front) continue; const rr = r * (1.6 - ((t * .8 + i / 14) % 1) * .5); const px = x + Math.cos(a) * rr; const py = y + Math.sin(a) * rr * .35 - Math.cos(a) * rr * .12; box(ctx, px - 1, py - 1, 2, 2, i % 3 ? m.mid : m.core); } };
  ring(false);
  for (let yy = -R(r) - 1; yy <= R(r) + 1; yy++) { const hw = Math.sqrt(Math.max(0, (r + 1) * (r + 1) - yy * yy)); if (hw < .5) continue; box(ctx, x - hw, y + yy, hw * 2, 1, m.light); const ih = Math.sqrt(Math.max(0, (r - 1) * (r - 1) - yy * yy)); box(ctx, x - ih, y + yy, ih * 2, 1, '#000000'); }
  // A thin hot crescent on the leading side, a faint inner glint.
  for (let yy = -R(r * .7); yy <= R(r * .7); yy++) { const hw = Math.sqrt(Math.max(0, (r - 1) ** 2 - yy * yy)); box(ctx, x + (dir || 1) * (hw - 1), y + yy, 1, 1, m.core); }
  box(ctx, x - (dir || 1) * r * .3, y - r * .3, 1, 1, m.mid);
  ring(true);
}

// ── wind ───────────────────────────────────────────────────────────────────
// User, 25 Oct 2026: thin streaks read as electricity — wind is VOLUME. References: a pixel tornado (stepped
// bands of pale lavender-blue to white, dark slate where you look inside) and a gust strip (tapered white
// wisps with a pale-blue rim and small torn fragments behind). Flat, few colours, hard steps.
export const WIND = Object.freeze({ deep: '#4a5680', body: '#8e9bd0', light: '#c9d0f0', core: '#f5f7ff', inner: '#39436a' });
export const FUNNEL_LOOKS = Object.freeze({
  wind: WIND,
  fire: { deep: '#8d2a0c', body: '#e64a19', light: '#ff9800', core: '#ffd54f', inner: '#4a1206' },
  sand: { deep: '#7a5a3a', body: '#b8935f', light: '#dcc195', core: '#f3e6c8', inner: '#4e3826' },
  pollen: { deep: '#6f8f3a', body: '#a8c66c', light: '#e3efb4', core: '#fffbe0', inner: '#3e5420' }
});
// One wisp: a tapered, slightly S-curved body (round head, long thin tail) moving in `dir`; the head can curl
// up / down (curl −1 … 1). Shaded like a solid: pale core streak on top, body, a darker underside.
export function drawWisp(ctx, x, y, len, thick, dir, t, seed = 1, curl = 0, pal = WIND) {
  const n = Math.max(4, R(len)); const d = dir || 1;
  for (let i = 0; i <= n; i++) {
    const u = i / n; // 0 head … 1 tail
    const th = Math.max(1, thick * (u < .3 ? Math.sqrt(1 - ((.3 - u) / .3) ** 2) : u < .45 ? 1 : Math.pow(1 - (u - .45) / .55, 1.1)));
    const wave = Math.sin(u * 3.2 + t * 8 + seed) * thick * .35 * u;
    const hook = u < .3 ? -curl * Math.pow(1 - u / .3, 2) * thick * .6 : 0;
    const cx = x - d * i; const cy = y + wave + hook; const top = R(cy - th / 2); const h = Math.max(1, R(th));
    box(ctx, cx, top, 1, h, pal.body);
    if (h >= 3) { box(ctx, cx, top, 1, Math.max(1, R(h * .55)), pal.light); box(ctx, cx, top, 1, Math.max(1, R(h * .25)), pal.core); }
    box(ctx, cx, top + h - 1, 1, 1, pal.deep);
  }
  // Torn fragments trailing the tail, irregularly spaced.
  let fx = x - d * (n + 3 + hash01(seed) * 4);
  for (let q = 0; q < 3; q++) { const l = 2 + R(hash01(seed + q * 7) * 4); box(ctx, d > 0 ? fx - l : fx, y + (hash01(seed + q * 3) - .5) * thick * 1.4, l, 1, q === 0 ? pal.light : pal.body); fx -= d * (l + 2 + hash01(seed + q) * 6); }
}
// A gust: wisps stacked in a forward bow (the middle leads), the outer heads curl inward like the edge of a
// rolling wave; lengths breathe as it streams. k = 0 … 1 strength (it thins out as it dies).
export function drawWindGust(ctx, x, y, facing, t, seed = 1, size = 1, k = 1) {
  // Few, chunky puffs (length ≈ 4 × thickness, like the reference strip) in a forward bow.
  const f = facing || 1; const N = 5;
  for (let i = 0; i < N; i++) {
    const v = (i - (N - 1) / 2) / ((N - 1) / 2); // −1 top … 1 bottom
    const lead = (1 - v * v) * 14 * size + Math.sin(t * 11 + i * 1.9) * 2;
    const thick = (6 + (1 - Math.abs(v)) * 5 + hash01(seed + i * 3) * 2) * size * (.55 + .45 * k);
    const len = thick * (3.4 + hash01(seed + i) * 1.4) * (.5 + .5 * k);
    drawWisp(ctx, x + f * lead, y + v * 18 * size, len, thick, f, t, seed + i * 13, v * .35);
  }
}
// A funnel (tornado / firestorm / sandstorm): stacked elliptical bands, wide on top and narrow at the ground,
// snaking sideways; each band's back half is darker, its front half lit, with highlight segments racing round
// (the spin); the top shows the dark inside. (x, yGround) = foot point, h = height, wTop = top width.
export function drawFunnel(ctx, x, yGround, h, wTop, t, look = 'wind', seed = 1, k = 1) {
  // Like the reference tornado: FEW thick, lumpy, tilted bands that overlap, wide on top, snaking, a hooked
  // tail — and then every element behaves like its material (user, 25 Oct 2026: "die Trichter sehen alle
  // gleich aus, egal welches Element"):
  //   wind   smooth lavender bands, white highlights racing round, wisps peeling off, dust whirled at the foot
  //   fire   the bands burn: pointed flame tongues lick upward off every band, the white-hot core glows
  //          through the gaps, a smoke crown billows on top, a ring of flames at the foot, embers fly
  //   sand   grainy, rough, matt bands (no shine), stones orbit in front of / behind the funnel, a thick
  //          dust cloud rolls out at the foot
  //   pollen no solid body: leaves and petals ride the band orbits, a thin green veil of wind behind them
  const pal = FUNNEL_LOOKS[look] ?? WIND; const H = h * k; if (H < 2) return;
  const N = Math.max(4, Math.min(9, R(H / 14)));
  const bands = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1); // 0 top … 1 foot
    const step = H / (N - 1); const thick = R(step * (1.75 - u * .45) * (.9 + hash01(seed + i * 5) * .25));
    const hookDir = hash01(seed * 7) > .5 ? 1 : -1;
    const cx = x + Math.sin(u * 2.4 + t * 2.2 + seed) * wTop * .16 * (1 - u * .4) + (u > .7 ? ((u - .7) / .3) ** 2 * wTop * .35 * hookDir : 0);
    const hw = Math.max(3, (wTop * .5) * Math.pow(1 - u * .9, 1.45) * (.9 + .2 * hash01(seed + i)) + Math.sin(t * 7 + i * 1.7) * 1.5);
    const cy = yGround - H * (1 - u) + thick * .3; const tilt = (hash01(seed + i * 9) - .5) * .25;
    bands.push({ u, cx, hw, cy, thick, tilt });
  }
  const ring = (b, ang) => ({ x: b.cx + Math.cos(ang) * b.hw, y: b.cy - b.thick * .5 + Math.sin(ang) * b.hw * .26 + Math.cos(ang) * b.tilt * b.hw });
  const orbiters = (front, draw) => { // things carried round the funnel: back half first, front half after the body
    for (let q = 0; q < 14; q++) { const b = bands[Math.floor(hash01(seed + q * 5) * bands.length)]; const ang = hash01(seed + q * 11) * Math.PI * 2 + t * (3 + hash01(seed + q) * 2); if ((Math.sin(ang) > 0) !== front) continue; const pnt = ring({ ...b, hw: b.hw + 4 + hash01(seed + q * 3) * 6 }, ang); draw(pnt.x, pnt.y, q); }
  };
  if (look === 'pollen') return drawPollenFunnel(ctx, bands, ring, pal, t, seed, yGround, wTop);
  // ── behind the body ──
  if (look === 'sand') orbiters(false, (px, py, q) => { const s = 2 + (q % 3); box(ctx, px - 1, py - 1, s + 2, s + 2, '#2e2016'); box(ctx, px, py, s, s, q % 2 ? '#5d4a36' : pal.deep); });
  // The mouth: the dark inside (wind / sand); fire shows its white-hot heart instead.
  const top = bands[0];
  for (let yy = -R(top.hw * .26); yy <= 0; yy++) { const w = top.hw * Math.sqrt(Math.max(0, 1 - (yy / (top.hw * .26 + .01)) ** 2)) * .85; box(ctx, top.cx - w, top.cy + yy - top.thick * .55, w * 2, 1, look === 'fire' ? '#fff6d0' : pal.inner); }
  if (look === 'fire') for (const b of bands) box(ctx, b.cx - b.hw * .35, b.cy - b.thick, b.hw * .7, b.thick, '#ffd54f'); // core glowing through gaps
  // ── the bands ──
  for (let bi = bands.length - 1; bi >= 0; bi--) {
    const b = bands[bi]; const ry = b.hw * .26;
    for (let xx = -R(b.hw); xx <= R(b.hw); xx++) {
      const c = xx / b.hw; const arc = Math.sqrt(Math.max(0, 1 - c * c)); const front = R(b.cy + arc * ry + c * b.tilt * b.hw);
      const lumpTop = R((hash01(seed + bi * 31 + Math.floor((xx + b.hw) / 5)) - .5) * 3);
      let th = Math.max(3, R(b.thick * (.55 + .45 * arc))) + lumpTop;
      const ang = Math.acos(Math.max(-1, Math.min(1, c))); const ph = ((ang / Math.PI) - t * 1.3 + bi * .29) % 1;
      const lit = (ph + 1) % 1 < .35; const X = b.cx + xx;
      if (look === 'fire') {
        // Burning band: pointed tongues of irregular height lick up off its top edge and flicker.
        // Broad flickering tongues (10-px cells), leaning with the spin, only on the lit front of the band.
        const cell = Math.floor((xx + b.hw + t * 40) / 10); const uu = ((xx + b.hw + t * 40) / 10) - cell;
        const tongue = arc > .3 ? Math.pow(Math.max(0, Math.sin(uu * Math.PI)), 1.5) * b.thick * (.2 + hash01(cell + bi * 17 + seed) * .55) * (.75 + .25 * Math.sin(t * 25 + cell)) : 0;
        const y0 = front - th - R(tongue); const tTop = front - th;
        box(ctx, X, y0 - 1, 1, front - y0 + 1, '#4a1206');
        box(ctx, X, y0, 1, Math.max(1, tTop - y0 + 1), pal.deep);          // red tongue tips
        box(ctx, X, tTop, 1, th, pal.body);
        box(ctx, X, tTop + 1, 1, Math.max(1, R(th * .55)), lit ? pal.core : pal.light);
        box(ctx, X, front - 1, 1, 1, pal.deep);
        continue;
      }
      if (look === 'sand') th += R((hash01(seed + X * 3 + bi) - .5) * 3); // rough, ragged edges
      const y0 = front - th;
      box(ctx, X, y0, 1, th, pal.body);
      if (look === 'sand') {
        // Matt and grainy: a dithered lighter top, grains everywhere, no racing shine.
        for (let yy = y0; yy < front - 1; yy++) { const g = hash01(X * 13 + yy * 7 + seed + Math.floor(t * 12)); if (g > .72) box(ctx, X, yy, 1, 1, g > .9 ? pal.core : yy < y0 + th * .4 ? pal.light : pal.deep); }
        box(ctx, X, front - 2, 1, 2, pal.deep);
      } else {
        box(ctx, X, y0, 1, Math.max(1, R(th * .38)), lit ? pal.core : pal.light);
        box(ctx, X, front - 2, 1, 2, pal.deep);
      }
      if (Math.abs(c) > .8) box(ctx, X, y0 + R(th * .38), 1, Math.max(1, th - R(th * .38) - 2), pal.deep);
    }
  }
  // ── in front of / around the body ──
  if (look === 'wind') {
    for (let q = 0; q < 4; q++) { const b = bands[1 + q % Math.max(1, bands.length - 2)]; const side = q % 2 ? 1 : -1; const life = (t * 1.2 + hash01(seed + q)) % 1; drawWisp(ctx, b.cx + side * (b.hw + 4 + life * 26), b.cy - b.thick * .5 - life * 6, 14 + life * 10, 4, side, t, seed + q * 7, 0, pal); }
    for (let q = 0; q < 10; q++) { const a = hash01(seed + q * 3) * Math.PI * 2 + t * 5; const r = wTop * (.25 + hash01(seed + q) * .25); box(ctx, x + Math.cos(a) * r, yGround - 2 - Math.abs(Math.sin(a * 2)) * 8, 2, 2, q % 3 ? '#cbb89a' : '#a1887f'); }
  } else if (look === 'fire') {
    // Smoke crown billowing off the top, a ring of flames at the foot, embers flung out.
    for (let q = 0; q < 7; q++) { const life = (t * .8 + hash01(seed + q * 7)) % 1; const r = 5 + life * 9; const px = top.cx + (hash01(seed + q) - .5) * top.hw * 1.6 + Math.sin(t * 2 + q) * 4; const py = top.cy - top.thick - 4 - life * 26; for (let yy = -R(r); yy <= R(r); yy++) { const w = Math.sqrt(Math.max(0, r * r - yy * yy)); box(ctx, px - w, py + yy * .8, w * 2, 1, yy < -r * .3 ? '#5d4a40' : '#3e3230'); } }
    for (let q = 0; q < 9; q++) { const a = (q / 9) * Math.PI * 2 + t * .8; const px = x + Math.cos(a) * wTop * .4; const py = yGround + Math.sin(a) * wTop * .1; drawFlameLick(ctx, px, py, 7 + hash01(seed + q) * 8, 4 + hash01(seed + q * 3) * 2, t * 1.3 + q, seed + q); }
    orbiters(true, (px, py, q) => { box(ctx, px, py, 2, 2, q % 2 ? '#ffd54f' : '#ff9800'); });
  } else if (look === 'sand') {
    orbiters(true, (px, py, q) => { const s = 2 + (q % 3); box(ctx, px - 1, py - 1, s + 2, s + 2, '#2e2016'); box(ctx, px, py, s, s, q % 2 ? '#8a6e4e' : pal.body); box(ctx, px, py, 1, 1, pal.light); });
    // Dust cloud rolling out at the foot.
    // Dust cloud rolling out at the foot: clusters of small round puffs that swell and settle.
    for (let q = 0; q < 8; q++) { const side = q % 2 ? 1 : -1; const life = (t * .9 + hash01(seed + q * 3)) % 1; const cx0 = x + side * (6 + life * wTop * .7);
      for (let m = 0; m < 3; m++) { const r = (3 + life * 6) * (1 - m * .2); const px = cx0 + (m - 1) * r * 1.1; const py = yGround - r - m % 2 * r * .6; for (let yy = -R(r); yy <= R(r); yy++) { const w = Math.sqrt(Math.max(0, r * r - yy * yy)); box(ctx, px - w, py + yy, w * 2, 1, yy < -r * .35 ? pal.light : yy > r * .5 ? pal.deep : pal.body); } } }
  }
}
// A single flame lick standing on the ground (h tall, w wide): tapered, flickering, red tips, yellow heart.
export function drawFlameLick(ctx, x, y, h, w, t, seed = 1) {
  const m = MAT.fire; const H = R(h * (.8 + .2 * Math.sin(t * 22 + seed)));
  for (let r = 0; r < H; r++) { const u = r / H; const hw = Math.max(.5, w * (u < .3 ? 1 : 1 - (u - .3) / .7) * .5 + 1); const sway = Math.sin(u * 3 + t * 14 + seed) * u * 2; box(ctx, x - hw + sway - 1, y - r, hw * 2 + 2, 1, m.out); box(ctx, x - hw + sway, y - r, hw * 2, 1, u > .7 ? m.deep : u > .4 ? m.body : m.mid); if (u < .45 && hw > 1.5) box(ctx, x - hw * .4 + sway, y - r, Math.max(1, hw * .8), 1, u < .2 ? m.core : m.light); }
}
// Pollen / nature funnel: leaves and petals ride the band orbits; only a thin green veil of wind behind.
function drawPollenFunnel(ctx, bands, ring, pal, t, seed, yGround, wTop) {
  // The veil: each band's orbit as a broken ribbon of green wind (back half dark, front half light).
  const veil = (front) => { for (const b of bands) for (let i = 0; i < 40; i++) { const ang = (i / 40) * Math.PI * 2; if ((Math.sin(ang) > 0) !== front) continue; if (((i / 40) * 3 - t * 1.5 + b.u) % 1 < .35) continue; const pnt = ring(b, ang); box(ctx, pnt.x, pnt.y, 3, 2, front ? pal.light : pal.deep); } };
  veil(false);
  const leaves = [];
  bands.forEach((b, bi) => { const n = 10 + bi * 2; for (let q = 0; q < n; q++) { const ang = (q / n) * Math.PI * 2 + t * (2.6 + bi * .3) + hash01(seed + bi * 13 + q); const pnt = ring({ ...b, hw: b.hw * (.85 + hash01(seed + q * 7 + bi) * .3) }, ang); leaves.push({ ...pnt, front: Math.sin(ang) > 0, q: q + bi * 17 }); } });
  leaves.sort((l1, l2) => l1.front - l2.front);
  for (const l of leaves) {
    const kind = hash01(seed + l.q * 3); const ph = Math.floor(t * 9 + l.q) % 4; const x = l.x; const y = l.y;
    if (kind > .8) { box(ctx, x - 2, y - 2, 5, 5, '#ad1457'); box(ctx, x - 1, y - 1, 3, 3, '#f8bbd0'); box(ctx, x, y, 1, 1, '#fff59d'); continue; } // blossom
    const c1 = l.front ? '#9ccc65' : '#689f38'; const c2 = l.front ? '#dcedc8' : '#9ccc65'; const ink = '#2e4a14';
    if (ph === 0) { box(ctx, x - 3, y - 1, 7, 4, ink); box(ctx, x - 2, y, 5, 2, c1); box(ctx, x - 2, y, 2, 1, c2); }       // leaf flat
    else if (ph === 1) { box(ctx, x - 1, y - 3, 4, 7, ink); box(ctx, x, y - 2, 2, 5, c1); box(ctx, x, y - 2, 1, 2, c2); } // leaf edge-on turning
    else if (ph === 2) { box(ctx, x - 3, y, 7, 2, ink); box(ctx, x - 2, y, 5, 1, c1); }                                    // thin edge
    else { box(ctx, x - 2, y - 2, 5, 5, ink); box(ctx, x - 1, y - 1, 3, 3, c1); box(ctx, x - 1, y - 1, 1, 1, c2); }         // tumbling
  }
  veil(true);
  for (let q = 0; q < 10; q++) { const life = (t * .7 + hash01(seed + q)) % 1; box(ctx, bands[0].cx + (hash01(seed + q * 5) - .5) * wTop, bands[0].cy - 8 - life * 30, 2, 2, '#fff59d'); } // pollen rising
}

// ── earth ──────────────────────────────────────────────────────────────────
// A rock spike: a jagged spire with strata, a lit left face and a dark right face, a crack, a ring of broken
// ground at its foot. rise 0 … 1 (grows out of the ground), crumble 0 … 1 (sinks and breaks into chunks).
export function drawRockSpike(ctx, x, y, h, w, seed = 1, rise = 1, crumble = 0) {
  const c = { out: '#1e1410', dark: '#3e2a20', body: '#6d4c41', light: '#a1887f', top: '#d7c4a8', strata: '#4e342e' };
  const H = h * rise * (1 - crumble * .7); if (H < 2) return;
  const lean = (hash01(seed) - .5) * w * .5; const tipX = x + lean;
  // Broken ground ring at the foot (dirt clods pushed up).
  for (let i = 0; i < 7; i++) { const a = (i / 6 - .5) * 2.6; const px = x + Math.sin(a) * w * 1.1; const py = y - Math.cos(a) * 2; const s = 2 + R(hash01(seed + i) * 2); box(ctx, px - s / 2 - 1, py - s - 1, s + 2, s + 1, c.out); box(ctx, px - s / 2, py - s, s, s, i % 2 ? c.body : c.dark); }
  const rows = R(H);
  for (let r = 0; r <= rows; r++) {
    const u = r / rows; // 0 foot … 1 tip
    const jag = (hash01(seed + Math.floor(r / 4) * 3) - .5) * 3 * (1 - u);
    const half = Math.max(.5, w * (1 - u) ** .9 + jag * .5); const cx = x + lean * u;
    const yy = y - r; const l = R(cx - half); const rr = R(cx + half);
    box(ctx, l - 1, yy, rr - l + 2, 1, c.out);
    box(ctx, l, yy, rr - l, 1, c.body);
    box(ctx, l, yy, Math.max(1, R((cx - l) * .8)), 1, c.light);                 // lit left face
    box(ctx, R(cx + half * .35), yy, Math.max(1, rr - R(cx + half * .35)), 1, c.dark); // shaded right face
    if ((r + R(seed)) % 9 === 0 && u < .85) box(ctx, l, yy, rr - l, 1, c.strata); // strata
  }
  box(ctx, tipX - 1, y - rows - 1, 2, 2, c.top);
  // A crack running down the lit face.
  let cx = x - w * .2; for (let r = 4; r < rows * .7; r += 2) { cx += (hash01(seed + r) - .5) * 2; box(ctx, cx, y - r, 1, 2, c.out); }
  // Crumbling: chunks break off and fall beside it.
  if (crumble > 0) for (let i = 0; i < 6; i++) { const u = clamp01(crumble * 1.3 - i * .08); if (u <= 0) continue; const side = i % 2 ? 1 : -1; const px = x + side * (w * .6 + u * 14 + i * 2); const py = y - h * (.6 - i * .08) + u * u * h * .9; const s = 2 + (i % 3); box(ctx, px - 1, py - 1, s + 2, s + 2, c.out); box(ctx, px, py, s, s, i % 2 ? c.body : c.light); }
}

// ── frost ──────────────────────────────────────────────────────────────────
// Frost spreading over the ground from a point: an icy floor patch (pale, with white glints), a front of
// crystals that shoot up as it passes, and at the end the crystals shatter. r = current front radius
// (ground ellipse r × r·0.3), k = 0 … 1 life.
export function drawFrostSpread(ctx, x, y, r, k, seed = 1) {
  const c = MAT.ice; const ry = r * .32;
  // Icy floor: rows of the ellipse, frosted in irregular streaks.
  for (let yy = -R(ry); yy <= R(ry); yy++) {
    const hw = r * Math.sqrt(Math.max(0, 1 - (yy / (ry + .01)) ** 2)); if (hw < 1) continue;
    // Rime, not a rink: sparse frost streaks, denser toward the front where it is freshest.
    const edge = Math.abs(yy) / (ry + .01);
    for (let xx = -R(hw); xx < R(hw); xx += 3) { const front = Math.max(Math.abs(xx) / (hw + .01), edge); const hv = hash01(seed + xx * 7 + yy * 13); if (hv < .78 - front * .35) continue; box(ctx, x + xx, y + yy, hv > .9 ? 2 : 3, 1, hv > .96 ? c.core : hv > .86 ? c.light : c.mid); }
  }
  // The crystal front: shards pop up around the ellipse, irregular heights; shatter at the end.
  const N = Math.max(8, R(r / 5));
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + hash01(seed + i) * .3; const px = x + Math.cos(a) * r; const py = y + Math.sin(a) * ry;
    const hgt = (6 + hash01(seed + i * 5) * 10) * (k < .7 ? 1 : 1 - (k - .7) / .3);
    if (k > .7) { const u = (k - .7) / .3; for (let q = 0; q < 3; q++) { const qa = -Math.PI / 2 + (q - 1) * .9; box(ctx, px + Math.cos(qa) * u * 12, py - 6 + Math.sin(qa) * u * 10 + u * u * 12, 2, 2, q === 1 ? c.core : c.light); } }
    if (hgt < 1) continue;
    for (let rr = 0; rr < hgt; rr++) { const w = Math.max(1, R(3 * (1 - rr / hgt))); box(ctx, px - w / 2 - 1, py - rr, w + 2, 1, c.out); box(ctx, px - w / 2, py - rr, w, 1, rr > hgt * .6 ? c.core : c.light); box(ctx, px + w / 2 - 1, py - rr, 1, 1, c.body); }
  }
}

// ── hand-drawn strokes (user, 25 Oct 2026: "das Art Design ist mir zu simpel") ─────────────────────────
// Geometric bands read as programmer art. Hand-drawn pixel VFX (the LF2 whirlwind / fireball sheets studied
// in docs/GRIMGE_VFX_Referenzanalyse.md) are built from CALLIGRAPHIC strokes — thick in the middle, tapering
// to points, with dry-brush breakup at the ends — and STREAK texture: many horizontal dashes of different
// lengths in 3–4 tones instead of flat fills.
// A crescent: an elliptical arc stroke (centre cx, cy; radii rx, ry; from angle a0 to a1) whose width swells
// to maxW in the middle; the outer edge is lit, the inner edge dark; the ends break into dashes.
export function drawCrescent(ctx, cx, cy, rx, ry, a0, a1, maxW, pal, seed = 1) {
  const len = Math.abs(a1 - a0) * Math.max(rx, ry); const n = Math.max(6, R(len * 1.6));
  for (let i = 0; i <= n; i++) {
    const u = i / n; const a = a0 + (a1 - a0) * u;
    const w = maxW * Math.pow(Math.sin(Math.PI * u), .75);
    if ((u < .12 || u > .88) && hash01(seed + i * 3) < .45) continue; // dry-brush ends
    const px = cx + Math.cos(a) * rx; const py = cy + Math.sin(a) * ry;
    const nx = Math.cos(a) * ry; const ny = Math.sin(a) * rx; const nl = Math.hypot(nx, ny) || 1; // outward normal
    const steps = Math.max(1, R(w));
    for (let s = 0; s <= steps; s++) {
      const v = s / steps; // 0 inner … 1 outer
      const qx = px + (nx / nl) * (v - .5) * w; const qy = py + (ny / nl) * (v - .5) * w;
      box(ctx, qx, qy, 1, 1, v > .78 ? pal.core : v > .45 ? pal.light : v > .18 ? pal.body : pal.deep);
    }
  }
}
// Streak texture inside a silhouette: rows of horizontal dashes of random length (gaps between), tone by row
// position and dash; `shape(y)` returns [xLeft, xRight] for row y or null. Moves with t (dir = drift).
export function drawStreaks(ctx, y0, y1, shape, pal, t, seed = 1, density = 1, dir = 1) {
  for (let y = R(y0); y <= R(y1); y++) {
    const span = shape(y); if (!span) continue; const [l, r] = span; const w = r - l; if (w < 2) continue;
    let x = l + hash01(seed + y * 7) * 6 - (t * 60 * dir) % 9;
    let j = 0;
    while (x < r) {
      const dl = 3 + R(hash01(seed + y * 13 + j * 5 + Math.floor(t * 8)) * w * .35);
      const gap = 1 + R(hash01(seed + y * 3 + j * 11) * 4 / density);
      const xa = Math.max(l, x); const xb = Math.min(r, x + dl);
      if (xb > xa) {
        const centre = 1 - Math.abs(((xa + xb) / 2 - (l + r) / 2) / (w / 2 + .01)); const tone = hash01(seed + y * 17 + j);
        box(ctx, xa, y, xb - xa, 1, centre > .6 && tone > .45 ? pal.core : centre > .3 ? (tone > .5 ? pal.light : pal.body) : (tone > .6 ? pal.body : pal.deep));
      }
      x += dl + gap; j++;
    }
  }
}
// The whirlwind, LF2-style: a streaky cone core (dense in the middle, frayed at the edges) wrapped by
// calligraphic crescents that orbit — back ones dark behind the core, front ones bright before it. Life
// k: forming (scattered crescents, no core) → full → dissolving (core thins to loose streaks).
export function drawWhirlwind(ctx, x, yGround, h, wTop, t, pal = WIND, seed = 1, k = 1) {
  const form = clamp01(k / .35); const H = h * (.55 + .45 * form); const top = yGround - H;
  const coreW = (y) => { const u = (y - top) / H; return wTop * .5 * Math.pow(1 - u * .82, 1.3) * (.35 + .65 * form); };
  const sway = (y) => Math.sin((y - top) / H * 3 + t * 4 + seed) * wTop * .08;
  const cres = [];
  for (let i = 0; i < 11; i++) {
    const u = (i + hash01(seed + i) * .6) / 11; const yy = top + u * H * .95; const rx = coreW(yy) * (1.25 + hash01(seed + i * 3) * .6) + 6; const ry = rx * .26;
    const spin = t * (4 + hash01(seed + i * 5) * 2) + hash01(seed + i * 7) * 6; const span = 1.2 + hash01(seed + i * 9) * 1.4;
    cres.push({ yy, rx, ry, a0: spin, a1: spin + span, w: Math.max(2, (3 + rx * .1) * (.6 + .4 * form)), cx: x + sway(yy), i });
  }
  const back = (c) => Math.sin((c.a0 + c.a1) / 2) < 0;
  for (const c of cres) if (back(c)) drawCrescent(ctx, c.cx, c.yy, c.rx, c.ry, c.a0, c.a1, c.w, { deep: pal.inner, body: pal.deep, light: pal.body, core: pal.light }, seed + c.i);
  if (form > .3) drawStreaks(ctx, top + 4, yGround - 2, (y) => { const w = coreW(y) * (k > .8 ? 1 - (k - .8) * 3 : 1); if (w < 1) return null; const c = x + sway(y); return [c - w, c + w]; }, pal, t, seed, form * (k > .8 ? .5 : 1));
  for (const c of cres) if (!back(c)) drawCrescent(ctx, c.cx, c.yy, c.rx, c.ry, c.a0, c.a1, c.w, pal, seed + c.i * 3);
}
