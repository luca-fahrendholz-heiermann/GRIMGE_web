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
// A gust: a sickle of air built from thin flowing streaks (dashes run along each arc), curls at the tips,
// dust and a leaf dragged along inside. Opaque, pale — wind is shown by what it moves and by its lines.
export function drawWindGust(ctx, x, y, facing, t, seed = 1, size = 1, k = 1) {
  const c = { out: '#2f6f6a', edge: '#4db6ac', body: '#80deea', light: '#e0f7fa', core: '#ffffff' };
  const f = facing || 1;
  for (let i = 0; i < 7; i++) {
    const r = (16 + i * 4.2) * size; const span = (.75 + hash01(seed + i) * .45) * (.7 + .3 * k); const back = i * 2.2 * size;
    const n = Math.max(6, R(r * span * 2));
    for (let j = 0; j <= n; j++) {
      const a = -span + (j / n) * span * 2; const px = x - f * back + f * Math.cos(a) * r * .75; const py = y + Math.sin(a) * r;
      const flow = ((j / n) * 3 - t * 9 + i * .37) % 1; const dash = (flow + 1) % 1 < .62;
      if (!dash) continue;
      // Inner arcs are the dense front of the gust (2 px), outer ones thin trailing wisps (1 px).
      const tip = Math.abs(a) > span * .8; const thick = i < 4 && !tip ? 2 : 1;
      box(ctx, px - 1, py - 1, thick + 2, thick + 2, c.out);
      box(ctx, px, py, thick, thick, i < 2 ? c.core : tip ? c.edge : i < 4 ? c.light : c.body);
    }
    // Curls at both tips of the outer arcs.
    if (i >= 4) for (const sgn of [-1, 1]) {
      const a0 = sgn * span; const cx0 = x - f * back + f * Math.cos(a0) * r * .75; const cy0 = y + Math.sin(a0) * r;
      for (let q = 0; q < 10; q++) { const u = q / 10; const ang = a0 + sgn * u * 4.2 + t * 6; const rr = 5 * size * (1 - u * .7); box(ctx, cx0 - f * Math.cos(ang) * rr * .6 - f * u * 4, cy0 + Math.sin(ang) * rr * .6, 1, 1, u < .5 ? c.light : c.body); }
    }
  }
  // Debris swept inside the gust: dust motes and a tumbling leaf.
  for (let q = 0; q < 6; q++) { const u = (t * 2.5 + hash01(seed + q * 7)) % 1; const px = x - f * (u * 30 * size) + f * 6; const py = y + (hash01(seed + q) - .5) * 40 * size + Math.sin(t * 12 + q) * 3; box(ctx, px, py, 2, 1, q % 3 ? '#cbb89a' : '#9ccc65'); }
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
