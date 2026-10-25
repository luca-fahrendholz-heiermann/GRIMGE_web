// GRIMGE Prototype — material particles (user, 25 Oct 2026: "genau so im Detail auch die anderen Attacken
// und Elemente" — the Tidenbohrer v3 reference: every element behaves like its material).
//
// combat.spawnElementalParticles() used to emit the same coloured square for every element. Each element now
// has its own material behaviour over the whole life of a particle (birth → body → death), drawn opaque in
// 1-world-px steps with seeded irregularity:
//   fire      a flame lick: rises and flickers, white-yellow → orange → red, dies as a small smoke puff
//   water     a drop: arcs and falls, stretches with speed, ends in a tiny splash
//   frost     ice glitter: a small shard that tumbles (diamond ↔ cross) and sparkles
//   lightning a crackling arc: a jagged 3-4 segment bolt that re-forms every frame, very short-lived
//   wind      a streak: a thin curved line along its motion that shortens as it fades
//   earth     pebbles that fall and bounce once, and dust puffs that swell and settle
//   nature    a leaf (or petal) that tumbles and sways as it drifts down
//   void      a mote that spirals into its origin and blinks out
//   light     a glint: a 4-point star that swells and shrinks while drifting up
//   shadow    a wisp of dark smoke that curls upward and thins out
//   blood     a heavy dark-red drop
//   ward / construct / beast — shield shards / metal splinters / violet motes
const ALIAS = { fire: 'ignis', water: 'aqua', ice: 'frost', lightning: 'fulgur', wind: 'ventus', earth: 'terra', nature: 'natura', light: 'lux', shadow: 'umbra' };
export const materialOf = (el) => ALIAS[el] ?? el ?? 'ignis';

const RAMP = {
  ignis: ['#fff6d0', '#ffd54f', '#ff9800', '#e64a19', '#8d2a0c'], smoke: ['#5d4a40', '#3e3230'],
  aqua: ['#e6fbff', '#7fdcff', '#2fb4ea', '#1f7fd1', '#0b3d73'],
  frost: ['#ffffff', '#e1f5fe', '#81d4fa', '#4fa3d1'],
  fulgur: ['#ffffff', '#fff59d', '#ffe600', '#f9a825'],
  ventus: ['#ffffff', '#e0f7fa', '#80deea', '#4db6ac'],
  terra: ['#d7c4a8', '#a1887f', '#795548', '#4e342e', '#2e1f1a'], dust: ['#d9c9b0', '#b8a68c'],
  natura: ['#dcedc8', '#9ccc65', '#558b2f', '#33691e'], petal: ['#ffffff', '#f8bbd0', '#f06292'],
  void: ['#f3c5ff', '#d500f9', '#6a1b9a', '#1a0026'],
  lux: ['#ffffff', '#fff8e1', '#ffe082', '#ffb300'],
  umbra: ['#9575cd', '#5e35b1', '#311b92', '#140a26'],
  blood: ['#ff8a80', '#e53935', '#b71c1c', '#5a0010'],
  ward: ['#ede7f6', '#b388ff', '#7c4dff', '#4527a0'],
  construct: ['#ffffff', '#cfd8dc', '#90a4ae', '#455a64'],
  bestia: ['#f3e5f5', '#ce93d8', '#9c27b0', '#4a148c']
};
const rnd = (a, b) => a + Math.random() * (b - a);
const hash = (n) => { const v = Math.sin(n * 91.345 + 47.853) * 43758.5453; return v - Math.floor(v); };
const R = (v) => Math.round(v);
const box = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(R(x), R(y), w, h); };

// New particles for one burst (plain objects; combat.js keeps them in its particle list).
export function makeMaterialParticles(element, x, y, count = 8) {
  const m = materialOf(element); const out = [];
  for (let i = 0; i < count; i++) {
    const p = { type: 'mat', m, x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: 0, vy: 0, gravity: 0, drag: 0, age: 0, life: rnd(.3, .7), seed: Math.random() * 1000, size: 1, alpha: 1 };
    const a = Math.random() * Math.PI * 2; const sp = rnd(30, 150);
    switch (m) {
      case 'ignis': Object.assign(p, { vx: Math.cos(a) * sp * .45, vy: -rnd(40, 120), gravity: -70, drag: 1.8, life: rnd(.35, .7), size: R(rnd(3, 6)) }); break;
      case 'aqua': Object.assign(p, { vx: Math.cos(a) * sp * .8, vy: -rnd(20, 140), gravity: 760, life: rnd(.35, .6), size: Math.random() < .3 ? 1 : 2 }); break;
      case 'frost': Object.assign(p, { vx: Math.cos(a) * sp * .4, vy: Math.sin(a) * sp * .3 - 10, gravity: 25, drag: 1.5, life: rnd(.4, .8), size: Math.random() < .35 ? 1 : 2 }); break;
      case 'fulgur': Object.assign(p, { vx: Math.cos(a) * sp * .5, vy: Math.sin(a) * sp * .5, drag: 4, life: rnd(.08, .2), size: R(rnd(6, 13)) }); break;
      case 'ventus': { const dir = Math.random() < .5 ? -1 : 1; Object.assign(p, { vx: dir * rnd(90, 220), vy: rnd(-40, 20), drag: 1.2, life: rnd(.28, .5), size: R(rnd(6, 12)), curl: rnd(-1, 1) }); break; }
      case 'terra': if (Math.random() < .35) Object.assign(p, { m: 'dust', vx: Math.cos(a) * 30, vy: -rnd(10, 30), drag: 2, life: rnd(.4, .7), size: R(rnd(3, 5)) });
        else Object.assign(p, { vx: Math.cos(a) * sp * .7, vy: -rnd(60, 200), gravity: 900, life: rnd(.4, .7), size: Math.random() < .4 ? 2 : 3, floor: y + rnd(14, 26), bounced: false }); break;
      case 'natura': Object.assign(p, { vx: Math.cos(a) * sp * .5, vy: -rnd(20, 80), gravity: 70, drag: 1.4, life: rnd(.6, 1), size: 3, petal: Math.random() < .2 }); break;
      case 'void': Object.assign(p, { cx: x, cy: y, ang: a, rad: rnd(10, 22), spin: rnd(6, 10) * (Math.random() < .5 ? -1 : 1), life: rnd(.3, .55), size: 2 }); break;
      case 'lux': Object.assign(p, { vx: Math.cos(a) * sp * .25, vy: -rnd(15, 50), drag: 1, life: rnd(.35, .6), size: R(rnd(2, 4)) }); break;
      case 'umbra': Object.assign(p, { vx: Math.cos(a) * 20, vy: -rnd(20, 50), drag: .8, life: rnd(.5, .9), size: R(rnd(3, 5)) }); break;
      case 'blood': Object.assign(p, { vx: Math.cos(a) * sp * .6, vy: -rnd(20, 120), gravity: 900, life: rnd(.35, .6), size: 2 }); break;
      case 'construct': Object.assign(p, { vx: Math.cos(a) * sp * .8, vy: -rnd(40, 160), gravity: 700, life: rnd(.3, .55), size: 2 }); break;
      default: Object.assign(p, { vx: Math.cos(a) * sp * .5, vy: Math.sin(a) * sp * .5 - 20, drag: 1.5, life: rnd(.3, .6), size: 2 }); break;
    }
    p.maxLife = p.life; out.push(p);
  }
  return out;
}

// Per-frame behaviour beyond plain velocity / gravity (called by combat.update before integration).
export function stepMaterialParticle(p, dt) {
  p.age += dt;
  if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; if (p.m !== 'aqua' && p.m !== 'blood') p.vy *= k; }
  if (p.m === 'void') { p.ang += p.spin * dt; p.rad = Math.max(0, p.rad - dt * 40); p.x = p.cx + Math.cos(p.ang) * p.rad; p.y = p.cy + Math.sin(p.ang) * p.rad * .6; p.vx = 0; p.vy = 0; }
  else if (p.m === 'natura') p.vx += Math.sin(p.age * 9 + p.seed) * 140 * dt;
  else if (p.m === 'umbra') p.vx += Math.sin(p.age * 6 + p.seed) * 60 * dt;
  else if (p.m === 'terra' && p.floor != null && p.y >= p.floor && p.vy > 0) { if (!p.bounced) { p.bounced = true; p.vy *= -.35; p.vx *= .5; } else { p.vy = 0; p.vx = 0; p.gravity = 0; p.y = p.floor; } }
}

// Draw one particle (opaque, crisp; the caller already set globalAlpha from the life steps).
export function drawMaterialParticle(ctx, p) {
  const k = Math.min(1, p.age / (p.maxLife || 1)); const f = Math.floor(p.age * 30); const x = p.x; const y = p.y;
  ctx.globalCompositeOperation = 'source-over';
  switch (p.m) {
    case 'ignis': {
      if (k > .78) { const s = R(2 + (k - .78) * 10); const c = RAMP.smoke[k > .9 ? 1 : 0]; box(ctx, x - s / 2, y - s / 2, s, s, c); box(ctx, x - s / 2 + 1, y - s / 2 - 1, Math.max(1, s - 2), 1, c); break; }
      const s = Math.max(1, R(p.size * (1 - k * .55))); const h = s + R(s * .9); const jx = (hash(p.seed + f) - .5) * 2;
      const ramp = RAMP.ignis; const tone = k < .2 ? 1 : k < .45 ? 2 : k < .65 ? 3 : 4;
      for (let r = 0; r < h; r++) { const w = Math.max(1, R(s * (r < h * .45 ? 1 : 1 - (r - h * .45) / (h * .7)))); box(ctx, x - w / 2 + jx * (r / h), y - r, w, 1, ramp[Math.min(4, tone + (r > h * .6 ? 1 : 0))]); }
      if (k < .4 && s >= 3) box(ctx, x - 1, y - 1, 2, 2, ramp[0]);
      break;
    }
    case 'aqua': case 'blood': {
      const ramp = RAMP[p.m]; const sp = Math.abs(p.vy); const len = p.size + Math.min(3, R(sp / 160));
      if (k > .85) { const d = R((k - .85) * 30); box(ctx, x - d - 1, y, 1, 1, ramp[1]); box(ctx, x + d, y, 1, 1, ramp[1]); box(ctx, x, y - d * .6, 1, 1, ramp[0]); break; }
      box(ctx, x, y - len + 1, p.size, len, ramp[2]); box(ctx, x, y - len + 1, 1, 1, ramp[0]); if (p.size > 1) box(ctx, x + 1, y, 1, 1, ramp[3]);
      break;
    }
    case 'frost': {
      const ramp = RAMP.frost; const spark = hash(p.seed + (f >> 2)) > .82; const c = spark ? ramp[0] : ramp[k < .5 ? 1 : 2];
      if (p.size === 1) { box(ctx, x, y, 1, 1, c); break; }
      if ((f >> 2) % 2) { box(ctx, x - 1, y, 3, 1, c); box(ctx, x, y - 1, 1, 3, c); box(ctx, x, y, 1, 1, ramp[0]); }
      else { box(ctx, x - 1, y - 1, 1, 1, c); box(ctx, x + 1, y - 1, 1, 1, c); box(ctx, x - 1, y + 1, 1, 1, c); box(ctx, x + 1, y + 1, 1, 1, c); box(ctx, x, y, 1, 1, ramp[3]); }
      break;
    }
    case 'fulgur': {
      const ramp = RAMP.fulgur; let px = x; let py = y; const n = 3 + (hash(p.seed) > .5 ? 1 : 0); const base = hash(p.seed + 3) * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = base + (hash(p.seed + f * 7 + i) - .5) * 2.2; const l = p.size / n + 1; const nx = px + Math.cos(a) * l; const ny = py + Math.sin(a) * l;
        const steps = Math.max(1, R(l));
        for (let s = 0; s <= steps; s++) { const qx = px + (nx - px) * s / steps; const qy = py + (ny - py) * s / steps; box(ctx, qx, qy - 1, 1, 3, ramp[i === 0 ? 2 : 3]); }
        for (let s = 0; s <= steps; s++) box(ctx, px + (nx - px) * s / steps, py + (ny - py) * s / steps, 1, 1, ramp[0]);
        px = nx; py = ny;
      }
      break;
    }
    case 'ventus': {
      const ramp = RAMP.ventus; const len = Math.max(2, R(p.size * (1 - k * .7))); const dir = Math.sign(p.vx) || 1;
      for (let i = 0; i < len; i++) { const u = i / len; const yy = y + Math.sin(u * 3 + p.curl * 2) * 2 * p.curl; box(ctx, x - dir * i, yy, 1, 1, i < 2 ? ramp[0] : u < .5 ? ramp[1] : ramp[2]); }
      break;
    }
    case 'terra': { const ramp = RAMP.terra; const s = p.size; box(ctx, x - 1, y - 1, s + 1, s + 1, ramp[4]); box(ctx, x, y, s, s, ramp[2]); box(ctx, x, y, s - 1 || 1, 1, ramp[1]); break; }
    case 'dust': { const s = R(p.size * (1 + k * 1.2)); const c = RAMP.dust[k > .5 ? 1 : 0]; box(ctx, x - s / 2, y - s / 2 + 1, s, Math.max(1, s - 1), c); box(ctx, x - s / 2 + 1, y - s / 2, Math.max(1, s - 2), 1, c); break; }
    case 'natura': {
      const ramp = p.petal ? RAMP.petal : RAMP.natura; const ph = Math.floor(p.age * 10 + p.seed) % 4;
      if (ph === 0) { box(ctx, x - 1, y, 3, 2, ramp[1]); box(ctx, x - 1, y, 1, 1, ramp[0]); box(ctx, x + 1, y + 1, 1, 1, ramp[2]); }
      else if (ph === 1) { box(ctx, x, y - 1, 2, 3, ramp[1]); box(ctx, x, y - 1, 1, 1, ramp[0]); }
      else if (ph === 2) box(ctx, x - 1, y, 3, 1, ramp[2]);
      else { box(ctx, x - 1, y - 1, 2, 2, ramp[1]); box(ctx, x + 1, y + 1, 1, 1, ramp[2]); }
      break;
    }
    case 'void': { const ramp = RAMP.void; if (k > .9) { box(ctx, x, y, 1, 1, ramp[0]); break; } box(ctx, x - 1, y - 1, 3, 3, ramp[1]); box(ctx, x, y, 1, 1, ramp[3]); break; }
    case 'lux': { const ramp = RAMP.lux; const s = Math.max(1, R(p.size * Math.sin(Math.PI * k) * 1.4)); box(ctx, x - s, y, s * 2 + 1, 1, ramp[2]); box(ctx, x, y - s, 1, s * 2 + 1, ramp[2]); box(ctx, x, y, 1, 1, ramp[0]); if (s > 2) { box(ctx, x - 1, y, 3, 1, ramp[1]); box(ctx, x, y - 1, 1, 3, ramp[1]); } break; }
    case 'umbra': {
      // A curl of dark smoke: two or three small puffs that drift apart and thin out (the last third loses pixels).
      const ramp = RAMP.umbra; const n = 2 + (hash(p.seed) > .5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const s = Math.max(1, R(p.size * (.8 - i * .2) * (1 + k * .5))); const ox = (hash(p.seed + i * 3) - .5) * 6 * (1 + k); const oy = -i * 3 - k * 4 * i;
        if (k > .65 && hash(p.seed + i + f * .1) < (k - .65) * 2.5) continue;
        box(ctx, x + ox - s / 2, y + oy - s / 2, s, s, ramp[i === 0 ? 3 : 2]); box(ctx, x + ox - s / 2, y + oy - s / 2, 1, 1, ramp[1]);
      }
      break;
    }
    case 'construct': { const ramp = RAMP.construct; box(ctx, x - 1, y - 1, 3, 2, ramp[3]); box(ctx, x, y - 1, 2, 1, ramp[1]); box(ctx, x, y - 1, 1, 1, ramp[0]); break; }
    default: { const ramp = RAMP[p.m] ?? RAMP.ward; box(ctx, x - 1, y - 1, 3, 3, ramp[2]); box(ctx, x, y - 1, 1, 1, ramp[0]); break; }
  }
}
