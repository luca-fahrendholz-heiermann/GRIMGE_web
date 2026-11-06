// GRIMGE Prototype — breathing aura & side effects (user, 3 Nov 2026: "nebeneffekte … wie bei nebel das um einen
// herum bei aktiver anwendung immer mehr nebel kommt" / "aura um den charakter die wächst je mehr dmg man während der
// atmungstechnik macht … ähnlich wie bei transformations von gelb zu blau zu weiß, nur jeweils für das element").
//   aura   the damage dealt during the stance fills it: stage I (the element itself), II at 250 (a hotter hue),
//          III at 600 (white god mode with the element's rim). Each stage hits 10 % harder and makes the side
//          effect stronger; a derived style (combo) keeps the damage already dealt.
//   side   every style changes the ground / air around the Wizard while it breathes (SIDE below) — mist builds a
//          fog bank that grows the longer you breathe (foes in it are slowed, the Wizard is harder to track).
import { hit, foesOf, projectilesOf, projKill, DEPTH, TAU } from './signature_core.js';
import { drawWardShell } from './ward_shell.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { applyStatus } from './status_effects.js';
import { spellSheetReady, drawSpellSpriteTinted, drawFineFromLayer } from './spell_visuals.js';

export const AURA = Object.freeze({ stages: [0, 250, 600], power: [1, 1.1, 1.2] });
// The stage-II hue per style (the "blue" of the transformation's gold → blue → white).
const HOT = { water: '#00e5ff', flame: '#2f7bff', thunder: '#b388ff', wind: '#b2ff59', stone: '#ff8f00', flower: '#ff1744', sun: '#ffea00', moon: '#e040fb', mist: '#b39ddb', beast: '#ff5722', forge: '#ff3d00', ward: '#ffd740', ice: '#18ffff', serpent: '#c6ff00', love: '#ea80fc', insect: '#f50057', steam: '#ff7043', sound: '#ff6d00' };

// ── colours ──────────────────────────────────────────────────────────────
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => { const A = rgb(a); const B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * k)); };
const css = (h) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},1)`; };
const pals = new Map();
// [outline, dark, mid, light, core] per stage.
export function auraPalettes(style, R) {
  let p = pals.get(style); if (p) return p;
  const hot = HOT[style] ?? R.light;
  p = [
    [mix('#000000', R.dark, .35), R.dark, R.mid, R.light, R.core],
    [mix('#000000', hot, .25), mix('#000000', hot, .55), hot, mix(hot, '#ffffff', .5), '#ffffff'],
    [mix('#000000', R.dark, .45), mix(R.mid, '#ffffff', .55), mix(R.light, '#ffffff', .75), '#f4f8ff', '#ffffff']
  ];
  pals.set(style, p); return p;
}

// ── stages ───────────────────────────────────────────────────────────────
export const auraStage = (st) => ((st?.auraDmg ?? 0) >= AURA.stages[2] ? 3 : (st?.auraDmg ?? 0) >= AURA.stages[1] ? 2 : 1);
export const auraPower = (st) => AURA.power[auraStage(st) - 1];
// Progress inside the current stage (0..1) — the aura grows towards the next one.
const stageProgress = (st) => { const s = auraStage(st); if (s === 3) return 1; const a = AURA.stages[s - 1]; const b = AURA.stages[s]; return Math.min(1, ((st.auraDmg ?? 0) - a) / (b - a)); };
export function noteBreathDamage(p, st, amount, s) {
  if (!st || !(amount > 0)) return;
  const before = auraStage(st); st.auraDmg = (st.auraDmg ?? 0) + amount; const now = auraStage(st);
  if (now > before) {
    st.auraPop = .6;
    const R = auraPalettes(st.style, s.ramp)[now - 1];
    combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 70 + now * 16, R[3]); combat.shakeCamera?.(4 + now, .15);
    globalThis.window?.gameWorld?.showAnnouncement?.(`${s.name} ${now === 3 ? 'III' : 'II'}`, 1.1);
  }
}

// ── side effects ─────────────────────────────────────────────────────────
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;
const dist = (a, b) => Math.hypot(a.x - b.x, ((a.z ?? b.z) - (b.z ?? 0)) * DEPTH);
const near = (gw, p, r) => foesOf(gw, p.team).filter((t) => !t.isProp && alive(t) && dist(t, p) < r);
const nearest = (gw, p, r) => near(gw, p, r).sort((a, b) => dist(a, p) - dist(b, p))[0] ?? null;
const moving = (p) => Math.abs(p.vx ?? 0) + Math.abs(p.vz ?? 0) * DEPTH > 30;
const chance = (k) => Math.random() < k;
// Side-effect damage counts towards the aura too.
function zap(p, st, s, t, dmg, kind) {
  const r = hit(t, Math.round(dmg * auraPower(st) * (st.quality?.power ?? 1)), Math.sign(t.x - p.x || 1) * 60, 0, .12);
  if (!r?.ignored) noteBreathDamage(p, st, dmg, s);
  st.zaps.push({ kind, x0: p.x, y0: (p.y ?? 0) - 50, x1: t.x, y1: (t.y ?? 0) - 40, t: 0 });
}
const FOG_CAP = { mist: [.5, .8, 1], steam: [.3, .45, .6] };
export const fogRadius = (st) => 60 + 120 * (st.fog ?? 0);
// every: seconds between ticks; tick(p, st, gw, lvl, s).
const SIDE = {
  water: { every: .45, tick(p, st, gw, lvl) { if (moving(p)) environment.add('water', p.x, p.z, { radius: 20 + 6 * lvl, team: p.team, ownerSafe: true, life: 2.5 + lvl }); for (const t of near(gw, p, 60 + 20 * lvl)) if (chance(.3 * lvl)) applyStatus(t, 'wet', { quiet: true }); } },
  flame: { every: .5, tick(p, st, gw, lvl) { if (moving(p)) environment.add('scorch', p.x, p.z, { radius: 16 + 5 * lvl, team: p.team, ownerSafe: true, life: 1.5 + .5 * lvl }); for (const t of near(gw, p, 55 + 15 * lvl)) if (chance(.12 * lvl)) applyStatus(t, 'burn', { quiet: true }); } },
  sun: { every: .5, tick(p, st, gw, lvl) { if (moving(p)) environment.add('scorch', p.x, p.z, { radius: 18 + 5 * lvl, team: p.team, ownerSafe: true, life: 1.5 + .5 * lvl }); for (const t of near(gw, p, 70 + 15 * lvl)) if (chance(.15 * lvl)) applyStatus(t, 'burn', { quiet: true }); } },
  thunder: { every: (lvl, st) => Math.max(.45, 2.4 - .5 * lvl - .25 * (st?.heat ?? 0)), tick(p, st, gw, lvl, s) { const t = nearest(gw, p, 110 + 20 * lvl); if (!t) return; zap(p, st, s, t, 4 * lvl, 'bolt'); if (lvl >= 3) applyStatus(t, 'paralysis', { quiet: true }); } },
  wind: { every: .2, tick(p, st, gw, lvl) {
    // A wind wall: hostile shots near the Wizard are slowed (from stage III turned away), foes pressed back.
    const r = 70 + 20 * lvl;
    for (const pr of projectilesOf(gw)) { if (pr.team === p.team || !Number.isFinite(pr.x)) continue; if (Math.abs(pr.x - p.x) < r && Math.abs(((pr.z ?? p.z) - p.z) * DEPTH) < 40) { if (lvl >= 3 && Math.sign(pr.vx) === Math.sign(p.x - pr.x)) pr.vx = -pr.vx * .6; else pr.vx *= .85; } }
    for (const t of near(gw, p, 50 + 10 * lvl)) t.kbVelX = (t.kbVelX ?? 0) + Math.sign(t.x - p.x || 1) * 25 * lvl;
  } },
  stone: { every: .6, tick(p, st, gw, lvl) { if (moving(p)) environment.add('crack', p.x, p.z, { radius: 14 + 4 * lvl, team: p.team, ownerSafe: true, life: 2 }); } },
  flower: { every: .5, tick(p, st, gw, lvl) {
    if (Number.isFinite(p.hp)) p.hp = Math.min(p.maxHp, p.hp + .5 * lvl);
    for (const a of gw?.minions ?? []) if (a.team === p.team && alive(a) && dist(a, p) < 120 && Number.isFinite(a.hp)) a.hp = Math.min(a.maxHp ?? a.hp, a.hp + .4 * lvl);
  } },
  moon: { every: (lvl) => 1.7 - .3 * lvl, tick(p, st, gw, lvl, s) { const t = nearest(gw, p, 95 + 10 * lvl); if (!t) return; zap(p, st, s, t, 5 * lvl, 'moon'); if (lvl >= 3) applyStatus(t, 'bleed', { quiet: true }); } },
  mist: { every: .7, tick(p, st, gw, lvl) { const a = Math.random() * TAU; const r = fogRadius(st) * .6; environment.add('smoke', p.x + Math.cos(a) * r, Math.max(.04, Math.min(.96, p.z + Math.sin(a) * r / DEPTH * .5)), { radius: 26 + 10 * lvl, team: p.team }); } },
  beast: { every: .5, tick(p, st, gw, lvl) { for (const t of near(gw, p, 60 + 15 * lvl)) if (chance(.08 * lvl)) applyStatus(t, 'bleed', { quiet: true }); } },
  forge: { every: .5, tick(p, st, gw, lvl) { for (const t of near(gw, p, 50 + 10 * lvl)) if (chance(.1 * lvl)) applyStatus(t, 'burn', { quiet: true }); } },
  ward: { every: .5, tick(p, st, gw, lvl) { if (Number.isFinite(p.arcaneShield)) p.arcaneShield = Math.min(Math.max(p.arcaneShield, 15 * lvl), p.arcaneShield + .8 * lvl); } },
  ice: { every: .5, tick(p, st, gw, lvl) { if (moving(p)) environment.add('ice', p.x, p.z, { radius: 18 + 6 * lvl, team: p.team, ownerSafe: true, life: 2 + lvl }); for (const t of near(gw, p, 60 + 15 * lvl)) t.slow?.(.6, 1 - .12 * lvl); } },
  serpent: { every: .6, tick(p, st, gw, lvl) { for (const t of near(gw, p, 55 + 10 * lvl)) if (chance(.12 * lvl)) applyStatus(t, 'poison', { quiet: true }); } },
  insect: { every: .6, tick(p, st, gw, lvl) { for (const t of near(gw, p, 55 + 10 * lvl)) if (chance(.12 * lvl)) applyStatus(t, 'poison', { quiet: true }); } },
  love: { every: .5, tick(p, st, gw, lvl) { for (const t of near(gw, p, 70 + 15 * lvl)) t.slow?.(.6, 1 - .1 * lvl); } },
  steam: { every: .6, tick(p, st, gw, lvl) { for (const t of near(gw, p, fogRadius(st) * .8)) if (chance(.1 * lvl)) applyStatus(t, 'burn', { quiet: true }); } },
  sound: { every: (lvl) => 2.2 - .4 * lvl, tick(p, st, gw, lvl, s) {
    const foes = near(gw, p, 90 + 15 * lvl); st.zaps.push({ kind: 'ring', x0: p.x, y0: (p.y ?? 0) - 40, r: 90 + 15 * lvl, t: 0 });
    for (const t of foes) { const r = hit(t, Math.round(3 * lvl * auraPower(st)), Math.sign(t.x - p.x || 1) * 120, 40, .15); if (!r?.ignored) noteBreathDamage(p, st, 3 * lvl, s); if (lvl >= 3 && chance(.3)) applyStatus(t, 'paralysis', { quiet: true }); }
  } }
};
// Movement / defence of the side effects (stance hooks in breathing.js).
export const sideMoveMult = (st) => { const l = auraStage(st); return st.style === 'wind' ? 1 + .04 * l : st.style === 'beast' ? 1 + .05 * l : 1; };
export const sideDamageTaken = (st, amount) => (st.style === 'stone' ? amount * (1 - .07 * auraStage(st)) : amount);
// Per landed hit (melee and moves).
export function sideOnHit(p, st, t) {
  const l = auraStage(st);
  if (st.style === 'forge' && chance(.25 * l)) applyStatus(t, 'burn', { quiet: true });
  if (st.style === 'beast' && Number.isFinite(p.hp)) p.hp = Math.min(p.maxHp, p.hp + l); // the hunt feeds
  if (st.style === 'mist' || st.style === 'steam') st.fog = Math.min(FOG_CAP[st.style][l - 1], (st.fog ?? 0) + .04);
  // Every hit charges the air (thunder: more bolts round the Wizard, faster sparks).
  st.heat = Math.min(6, (st.heat ?? 0) + 1);
}

export function updateBreathAura(p, st, dt, gw, s) {
  st.zaps = st.zaps ?? []; for (const z of st.zaps) z.t += dt; st.zaps = st.zaps.filter((z) => z.t < .3);
  st.auraPop = Math.max(0, (st.auraPop ?? 0) - dt);
  const lvl = auraStage(st);
  st.heat = Math.max(0, (st.heat ?? 0) - dt * .8);
  updateDrones(p, st, dt, gw, lvl);
  // Fog builds up while the Wizard breathes (and with every hit); foes inside are slowed, the Wizard is concealed.
  const cap = FOG_CAP[st.style];
  if (cap) {
    st.fog = Math.min(cap[lvl - 1], (st.fog ?? 0) + dt * .08);
    const r = fogRadius(st);
    for (const t of near(gw, p, r)) t.slow?.(.4, 1 - .3 * st.fog);
    p.concealment = st.style === 'mist' ? st.fog : st.fog * .5;
  }
  const side = SIDE[st.style]; if (!side) return;
  const every = typeof side.every === 'function' ? side.every(lvl, st) : side.every;
  st.sideT = (st.sideT ?? 0) + dt;
  if (st.sideT >= every) { st.sideT = 0; side.tick(p, st, gw, lvl, s); }
}
export function endBreathAura(p) { p.concealment = 0; }
// Blossom / butterfly drones (flower, insect, love): 2 per stage orbit the Wizard and each catches one hostile shot,
// then regrows after 2.5 s.
function updateDrones(p, st, dt, gw, lvl) {
  if (surroundOf(st.style) !== 'drones') return;
  const want = 2 * lvl; st.drones = st.drones ?? [];
  while (st.drones.length < want) st.drones.push({ i: st.drones.length, a: 0, cd: 0, x: p.x, y: p.y ?? 0, z: p.z });
  const n = st.drones.length;
  for (const d of st.drones) {
    d.cd = Math.max(0, d.cd - dt); d.a = d.i / n * TAU + st.t * 1.4; const R = 34;
    d.x = p.x + Math.cos(d.a) * R; d.z = p.z + Math.sin(d.a) * R * .28 / DEPTH; d.y = (p.y ?? 0) - 38 - (d.i % 3) * 14 + Math.sin(d.a) * R * .28;
    if (d.cd > 0) continue;
    for (const pr of projectilesOf(gw)) { if (pr.team === p.team || !Number.isFinite(pr.x)) continue; if (Math.abs(pr.x - d.x) < 20 && Math.abs(((pr.z ?? p.z) - p.z) * DEPTH) < 30) { projKill(pr); d.cd = 2.5; combat.spawnHitSparks?.(d.x, d.y, 1, '#ffc1e3', 8); break; } }
  }
}

// ── look: the surroundings of each element (user, 4 Nov 2026: "nicht die typische aura nur in anderen farben, sondern
// quasi umgebung um den charakter herum elementweise affektiert") ─────────────────────────────────────────────
// Every style changes the space round the Wizard and grows with the stage: lightning crackles in the air (more with every
// hit), the body catches fire until it blazes, a blizzard rages, water rings orbit, wind sickles spiral, a spirit serpent
// coils, a spirit predator crouches behind (and the Wizard drops into a four-legged sprint stance), blossom drones guard,
// rocks orbit, moons circle, a ward lattice shields, sound rings pulse, fog swallows the Wizard. The mark spreads.
const sprite = (ctx, sheet, pal, frame, x, y, opts) => { if (!spellSheetReady(sheet)) return false; drawFineFromLayer(ctx, (c) => drawSpellSpriteTinted(c, sheet, pal, frame, x, y, opts)); return true; };
const FAMILY = { flame: 'fire', sun: 'fire', forge: 'fire', ice: 'snow', water: 'water', steam: 'water', wind: 'wind', serpent: 'serpent', beast: 'beast', flower: 'drones', insect: 'drones', love: 'drones', stone: 'rocks', moon: 'moons', ward: 'ward', sound: 'sound', thunder: 'bolts', mist: 'fog' };
export const surroundOf = (style) => FAMILY[style] ?? 'none';
const HERO_H = 92;
// Body stance of the style (applied in Player.render): the beast crouches into a sprint start, fire grows, fog veils,
// sound makes the body hum.
export function breathBodyPose(p, st) {
  const fam = surroundOf(st.style); const l = auraStage(st); const f = p.facing || 1;
  if (fam === 'beast' && p.grounded && !/^attack|heavyStrike|uppercut|dive|dash/.test(p.state ?? '')) {
    const run = Math.min(1, (Math.abs(p.vx ?? 0) + Math.abs(p.vz ?? 0) * DEPTH) / 260);
    return { rot: f * (9 + 3 * l + 8 * run), ox: f * (4 + 3 * run), oy: 6 + l, sx: 1.05, sy: .84 - .02 * l };
  }
  if (fam === 'fire' && l >= 3) return { sx: 1.1, sy: 1.1 };
  if (fam === 'sound') return { ox: Math.sin(st.t * 70) * .5 * l };
  if (fam === 'fog' && (p.concealment ?? 0) > .05) return { alpha: 1 - .5 * Math.min(1, p.concealment) };
  return null;
}
// No colour cloak any more: the body itself turns into the element (renderBodyMaterial).
export function breathCloak() { return null; }
const px = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
function pline(ctx, x0, y0, x1, y1, c, w = 1) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); ctx.fillStyle = c; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; const y = y0 + (y1 - y0) * i / n; ctx.fillRect(Math.round(x - (w - 1) / 2), Math.round(y - (w - 1) / 2), w, w); } }
const seeded = (seed) => { let x = Math.sin(seed * 999.13) * 43758.5; return () => { x = Math.sin(x * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }; };

// ── real lightning: midpoint displacement with branches; a soft glow, a coloured body, a white core ─────────────
function boltPath(x0, y0, x1, y1, r, rough, depth) {
  let pts = [[x0, y0], [x1, y1]];
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1]; const [bx, by] = pts[i]; const len = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / (len || 1); const ny = (bx - ax) / (len || 1); const off = (r() - .5) * len * rough;
      next.push([(ax + bx) / 2 + nx * off, (ay + by) / 2 + ny * off], pts[i]);
    }
    pts = next;
  }
  return pts;
}
function strokePts(ctx, pts, c, w) { for (let i = 1; i < pts.length; i++) pline(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, w); }
function drawBolt(ctx, x0, y0, x1, y1, P, r, { width = 1, branches = 2, alpha = 1 } = {}) {
  const main = boltPath(x0, y0, x1, y1, r, .55, 5);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.globalAlpha *= .35; strokePts(ctx, main, P[2], 3 + width * 2); ctx.globalAlpha /= .35;
  strokePts(ctx, main, P[3], 1 + width); strokePts(ctx, main, P[4], 1);
  for (let b = 0; b < branches; b++) {
    const i = 3 + Math.floor(r() * (main.length - 6)); const [bx, by] = main[i]; const ang = Math.atan2(y1 - y0, x1 - x0) + (r() - .5) * 2; const L = Math.hypot(x1 - x0, y1 - y0) * (.2 + r() * .3);
    const br = boltPath(bx, by, bx + Math.cos(ang) * L, by + Math.sin(ang) * L, r, .6, 3); strokePts(ctx, br, P[3], 1); if (r() < .5) strokePts(ctx, br.slice(0, 4), P[4], 1);
  }
  ctx.restore();
}
// Thunder: bolts crack through the air behind the Wizard (more with the stage and every hit); in front only thin arcs
// crawl over the body, and a few sparks.
function thunderSurround(ctx, p, st, ry, layer, P, l) {
  const tick = Math.floor(st.t / .055);
  if (layer !== 'front') {
    const n = 1 + l + Math.min(5, Math.round(st.heat ?? 0));
    for (let b = 0; b < n; b++) {
      const r = seeded(tick * 13 + b * 7 + 1); if (r() < .3) continue;
      const a0 = Math.PI + r() * Math.PI; const R = 40 + l * 14 + r() * 20;
      const x0 = p.x + Math.cos(a0) * R * .4; const y0 = ry - HERO_H * (.5 + r() * .6);
      const x1 = p.x + Math.cos(a0 + (r() - .5)) * R * 1.4; const y1 = Math.min(ry, y0 + 30 + r() * 60);
      drawBolt(ctx, x0, y0, x1, y1, P, r, { width: l >= 3 ? 2 : 1, branches: 1 + l });
    }
    return;
  }
  // Arcs crawling over the body (thin — the Wizard stays visible).
  const r = seeded(tick * 5 + 3);
  for (let k = 0; k < l + Math.min(3, Math.round((st.heat ?? 0) / 2)); k++) {
    const x0 = p.x + (r() - .5) * 26; const y0 = ry - 10 - r() * (HERO_H - 20); const x1 = x0 + (r() - .5) * 22; const y1 = y0 + (r() - .5) * 26;
    const pts = boltPath(x0, y0, x1, y1, r, .7, 3); ctx.save(); ctx.globalAlpha *= .85; strokePts(ctx, pts, P[3], 1); ctx.restore(); px(ctx, x1, y1, P[4]);
  }
  for (let i = 0; i < l * 2; i++) { const a = r() * TAU; const x = p.x + Math.cos(a) * (14 + r() * 22); const y = ry + Math.sin(a) * 5; px(ctx, x, y - r() * 3, P[4]); }
}
// Fire: flames lick up behind the Wizard; the body itself burns (material); in front only small, half transparent
// tongues at the feet.
function fireSurround(ctx, p, st, ry, layer, P, l, grow) {
  const reach = Math.min(1, .35 + .28 * (l - 1) + .2 * grow);
  const n = layer === 'front' ? 1 + l : 3 + l * 3;
  for (let i = 0; i < n; i++) {
    const r = seeded(i * 17 + (layer === 'front' ? 99 : 3)); const h = layer === 'front' ? r() * .25 : r() * reach;
    const x = p.x + (r() - .5) * (26 + l * 6); const y = ry - h * HERO_H + 3;
    ctx.save(); ctx.globalAlpha *= layer === 'front' ? .45 : .85;
    sprite(ctx, 'br_flame_tongue', P, (Math.floor(st.t * 14) + i) % 8, x, y, { scale: (layer === 'front' ? .45 : .6 + .22 * l) + r() * .2, flip: (i % 2) === 1 });
    ctx.restore();
  }
  if (st.style === 'sun' && layer !== 'front') { for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + st.t * .4; const L = 34 + l * 12 + (k % 2) * 10; pline(ctx, p.x + Math.cos(a) * 24, ry - 52 + Math.sin(a) * 24, p.x + Math.cos(a) * L, ry - 52 + Math.sin(a) * L, k % 2 ? P[3] : P[2], 2); } }
  if (st.style === 'forge' && layer !== 'front') { const r = seeded(Math.floor(st.t / .05)); for (let i = 0; i < 4 + l * 3; i++) { const u = r(); const x = p.x + (r() - .5) * 46; const y = ry - 20 - u * 70; px(ctx, x, y, u < .5 ? P[4] : P[3]); px(ctx, x - 1, y + 1, P[2]); } }
}
function drones(ctx, p, st, ry, layer, P) {
  // Flower and love: blossom drones (love in its pink), insect: big butterflies. The front ones are see-through.
  const sheet = st.style === 'insect' ? 'br_butterfly' : 'br_petal_drone';
  for (const d of st.drones ?? []) { if (d.cd > 0) continue; const front = Math.sin(d.a) > 0; if (front !== (layer === 'front')) continue; ctx.save(); if (front) ctx.globalAlpha *= .7; sprite(ctx, sheet, P, (Math.floor(st.t * 10) + d.i) % (sheet === 'br_butterfly' ? 4 : 6), d.x, d.y, { anchor: 'center', scale: sheet === 'br_butterfly' ? 1.6 : 1.3 }); ctx.restore(); }
}
// A few pieces drifting behind the Wizard (rocks, moons, notes) — never a ring in front of the body.
function behind(ctx, p, st, ry, layer, P, sheet, count, spread, sc, speed = .6) {
  if (layer === 'front') return;
  for (let i = 0; i < count; i++) { const u = ((st.t * speed * .3 + i / count) % 1); const x = p.x + Math.sin(i * 2.1 + st.t * speed) * spread; const y = ry - 20 - u * (HERO_H + 10); ctx.save(); ctx.globalAlpha *= Math.sin(u * Math.PI); sprite(ctx, sheet, P, (Math.floor(st.t * 8) + i) % 4, x, y, { anchor: 'center', scale: sc }); ctx.restore(); }
}

// ── the body turns into the element (X-Men style: from the feet up, further with every stage) ────────────────────
// The Wizard's own sprite is drawn into an offscreen canvas, the material is laid over its pixels only (source-atop),
// covering the body from the feet up to `cover` of its height, with a bright transformation front; then composited
// over the body. Patterns per material: ice facets, flame skin, rock cracks, liquid bands, lightning veins, glowing
// cracks, vines, scales, hex plates, moon shadow, sunlight.
const MATERIAL = {
  ice: { tint: '#bfe9fb', a: .42, front: '#ffffff', pat: 'facets' },
  flame: { tint: '#ff7a1a', a: .38, front: '#fff1c2', pat: 'flame' }, sun: { tint: '#ffd54f', a: .35, front: '#ffffff', pat: 'flame' }, forge: { tint: '#5a2a10', a: .45, front: '#ffb300', pat: 'cracksHot' },
  stone: { tint: '#8d7a66', a: .45, front: '#d2c3ad', pat: 'cracks' }, water: { tint: '#2f8fff', a: .36, front: '#d4f4ff', pat: 'liquid' }, steam: { tint: '#eceff1', a: .3, front: '#ffffff', pat: 'liquid' },
  thunder: { tint: '#fff176', a: .18, front: '#ffffff', pat: 'veins' }, flower: { tint: '#f8bbd0', a: .2, front: '#ffc1e3', pat: 'vines' }, love: { tint: '#ff80ab', a: .25, front: '#ffd6e8', pat: 'vines' },
  insect: { tint: '#7b1fa2', a: .28, front: '#e1bee7', pat: 'scales' }, serpent: { tint: '#66bb6a', a: .35, front: '#c8e6c9', pat: 'scales' }, ward: { tint: '#90caf9', a: .35, front: '#e3f2fd', pat: 'hex' },
  moon: { tint: '#2a1550', a: .4, front: '#d1c4e9', pat: 'moon' }, beast: { tint: '#6d4c41', a: .25, front: '#e0d4cd', pat: 'fur' }, wind: { tint: '#d7fff4', a: .18, front: '#ffffff', pat: 'streaks' }, sound: { tint: '#ffca28', a: .15, front: '#fff3c4', pat: 'streaks' }
};
let off = null;
function offscreen(w, h) {
  const doc = globalThis.document; if (!doc?.createElement) return null;
  if (!off) { off = doc.createElement('canvas'); }
  if (off.width !== w) off.width = w; if (off.height !== h) off.height = h;
  const c = off.getContext?.('2d'); return c ? { c, canvas: off } : null;
}
function materialPattern(c, kind, W, top, bottom, t, P, l) {
  const r = seeded(7);
  const dot = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const line = (x0, y0, x1, y1, col) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); c.fillStyle = col; for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1); };
  switch (kind) {
    case 'facets': for (let k = 0; k < 18; k++) { const x = r() * W; const y = top + r() * (bottom - top); line(x, y, x + 6 + r() * 6, y - 8 - r() * 6, '#ffffff'); line(x, y, x - 5, y - 4, '#7cc4ec'); } for (let k = 0; k < 6; k++) { const x = (r() * W + t * 20) % W; dot(x, top + r() * (bottom - top), '#ffffff'); } break;
    case 'flame': for (let k = 0; k < 26; k++) { const x = r() * W; const y = bottom - ((r() * (bottom - top) + t * 60) % (bottom - top)); line(x, y, x + Math.sin(y * .2 + t * 8) * 2, y - 5, k % 3 ? P[3] : P[4]); } break;
    case 'cracksHot': case 'cracks': for (let k = 0; k < 8; k++) { let x = r() * W; let y = top + r() * (bottom - top); for (let s = 0; s < 6; s++) { const nx = x + (r() - .5) * 6; const ny = y + 3 + r() * 3; line(x, y, nx, ny, kind === 'cracksHot' ? (s % 2 ? '#ffb300' : '#ff6d00') : '#3e2f22'); x = nx; y = ny; } } break;
    case 'liquid': for (let y = Math.floor(top); y < bottom; y += 6) { const ph = y * .3 - t * 6; for (let x = 0; x < W; x += 2) if (Math.sin(x * .25 + ph) > .85) dot(x, y + Math.sin(x * .2 + ph) * 1.5, '#d4f4ff'); } break;
    case 'veins': { const rr = seeded(Math.floor(t / .07)); for (let k = 0; k < 3 + l * 2; k++) { const x0 = W / 2 + (rr() - .5) * 24; const y0 = top + rr() * (bottom - top); const pts = boltPath(x0, y0, x0 + (rr() - .5) * 20, y0 + (rr() - .3) * 26, rr, .7, 3); for (let i = 1; i < pts.length; i++) line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], i % 2 ? '#ffffff' : P[3]); } break; }
    case 'vines': for (let k = 0; k < 6; k++) { let x = r() * W; let y = bottom; for (let s = 0; s < 10 && y > top; s++) { const nx = x + Math.sin(s + k) * 3; const ny = y - 5; line(x, y, nx, ny, '#4a8a2a'); if (s % 3 === 2) { dot(nx + 1, ny, P[3]); dot(nx - 1, ny, P[4]); } x = nx; y = ny; } } break;
    case 'scales': for (let y = Math.floor(top); y < bottom; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < W; x += 4) { dot(x, y, P[3]); dot(x + 1, y + 1, P[1]); } break;
    case 'hex': for (let y = Math.floor(top); y < bottom; y += 7) for (let x = (y / 7) % 2 ? 4 : 0; x < W; x += 8) { line(x, y, x + 4, y, '#e3f2fd'); line(x + 4, y, x + 6, y + 3, '#e3f2fd'); } break;
    case 'moon': for (let y = Math.floor(top); y < bottom; y += 1) dot(W / 2 - 14 + Math.sin(y * .1) * 2, y, '#d1c4e9'); break;
    case 'fur': for (let k = 0; k < 40; k++) { const x = r() * W; const y = top + r() * (bottom - top); line(x, y, x + 1, y + 3, '#3e2723'); } break;
    case 'streaks': for (let k = 0; k < 10; k++) { const y = top + r() * (bottom - top); const x = (r() * W + t * 120) % W; line(x, y, x - 8, y, P[4]); } break;
    default: break;
  }
}
export function renderBodyMaterial(ctx, p, st, ry, drawBody, s) {
  if (p.focusTransformTimer > 0) return;
  const m = MATERIAL[st.style]; if (!m || typeof drawBody !== 'function') return;
  const l = auraStage(st); const grow = stageProgress(st); const cover = Math.min(1, .28 + (l - 1) * .34 + grow * .3) * Math.min(1, st.t * 2);
  if (cover <= .02) return;
  // The offscreen copy must be rasterised at the SAME screen scale as the body (renderEntity snaps the hero scale to
  // the transform), else it lands a pixel off / a size off and the Wizard looks doubled (user report, 6 Nov 2026).
  const k = Math.abs(ctx.getTransform?.()?.a ?? 1) || 1;
  const W = 170; const H = 190; const base = H - 14; const o = offscreen(Math.ceil(W * k), Math.ceil(H * k)); if (!o) return;
  const { c, canvas } = o; const pals = auraPalettes(st.style, s.ramp); const P = surroundOf(st.style) === 'fire' ? pals[Math.min(1, l - 1)] : pals[0];
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, canvas.width, canvas.height); c.setTransform(k, 0, 0, k, 0, 0); c.imageSmoothingEnabled = false;
  c.save(); c.translate(W / 2 - p.x, base - ry); drawBody(c, p.x, ry); c.restore();
  // Material over the body pixels only, from the feet up to the transformation front.
  const top = base - cover * (HERO_H + 16);
  c.globalCompositeOperation = 'source-atop';
  c.globalAlpha = m.a + .06 * (l - 1); /* the Wizard stays readable under the material */ c.fillStyle = m.tint; c.fillRect(0, top, W, H - top);
  c.globalAlpha = 1; materialPattern(c, m.pat, W, top, base, st.t, P, l);
  // The bright front where the body is turning (ice line, flame edge …).
  if (cover < .99) { c.globalAlpha = .9; c.fillStyle = m.front; c.fillRect(0, Math.round(top), W, 1); c.globalAlpha = .45; c.fillRect(0, Math.round(top) + 1, W, 2); }
  // Above the transformation front only the original body shows (no second copy).
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, W, Math.max(0, Math.floor(top) - 1));
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha *= Math.min(1, st.timer * 2); ctx.drawImage(canvas, p.x - W / 2, ry - base, W, H); ctx.restore();
}

export function renderBreathAura(ctx, p, st, ry, layer, s) {
  const l = auraStage(st); const t = st.t; const f = p.facing || 1; const fam = surroundOf(st.style);
  // The element keeps its own colours at every stage (no white god mode); only fire heats up (orange → hot hue).
  const pals = auraPalettes(st.style, s.ramp); const P = fam === 'fire' ? pals[Math.min(1, l - 1)] : pals[0];
  const fade = Math.min(1, st.t * 3, st.timer * 2); const grow = stageProgress(st); const side = layer === 'front' ? 'front' : 'back';
  // Fog bank (mist / steam): clouds round the Wizard — dense behind, see-through in front.
  if (st.fog > .02 && spellSheetReady('bp_mist')) {
    const fp = st.style === 'steam' ? ['#3a3a3a', '#8d8d8d', '#cfd8dc', '#eceff1', '#ffffff'] : ['#263238', '#546e7a', '#90a4ae', '#cfd8dc', '#eceff1'];
    const n = Math.round(6 + 22 * st.fog); const R = fogRadius(st);
    ctx.save();
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + t * .25 + Math.sin(i * 1.7) * .4; const front = Math.sin(a) > 0;
      if (front !== (layer === 'front')) continue;
      const rr = R * (.2 + .8 * ((i * 37 % 11) / 11));
      ctx.globalAlpha = fade * (front ? .25 + .3 * st.fog : .85) * Math.min(1, st.fog * 2);
      sprite(ctx, 'bp_mist', fp, (i + Math.floor(t * 6)) % 4, p.x + Math.cos(a) * rr, ry - 14 + Math.sin(a) * rr * .3 - (i % 4) * 14, { anchor: 'center', scale: 1.3 + st.fog * 1.4 + (i % 3) * .3 });
    }
    ctx.restore();
  }
  // Side-effect strikes (thunder sparks are real bolts now, moon cuts, sound rings).
  if (layer === 'front') for (const z of st.zaps ?? []) {
    const k = z.t / .3; ctx.save(); ctx.globalAlpha = 1 - k;
    if (z.kind === 'ring') { for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; px(ctx, z.x0 + Math.cos(a) * z.r * (.3 + .7 * k), ry - 20 + Math.sin(a) * z.r * .3 * (.3 + .7 * k), P[3]); } }
    else if (z.kind === 'bolt') drawBolt(ctx, z.x0, z.y0, z.x1, z.y1, P, seeded(Math.floor(z.t / .05) + Math.round(z.x1)), { width: 1, branches: 2 });
    else { const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([z.x0 + (z.x1 - z.x0) * u, z.y0 + (z.y1 - z.y0) * u - Math.sin(u * Math.PI) * 26]); } for (let i = 1; i < pts.length; i++) { pline(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], P[1], 3); pline(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], P[4], 1); } }
    ctx.restore();
  }
  if (p.focusTransformTimer > 0) return; // the transformation's own look wins
  ctx.save(); ctx.globalAlpha = fade;
  const sc = .7 + .12 * l + .08 * grow; const thin = layer === 'front' ? .35 : 1; // in front: see-through
  switch (fam) {
    case 'bolts': thunderSurround(ctx, p, st, ry, layer, P, l); break;
    case 'fire': fireSurround(ctx, p, st, ry, layer, P, l, grow); break;
    case 'snow': ctx.globalAlpha = fade * (.5 + .15 * l) * thin; sprite(ctx, `br_snow_${side}`, P, Math.floor(t * 12) % 8, p.x, ry + 6, { scale: sc }); break;
    case 'water': {
      // Water: the body turns liquid (material); a stream swirls behind from stage II, drops fall from the body.
      if (layer !== 'front' && l >= 2) sprite(ctx, 'br_water_back', P, Math.floor(t * 12) % 8, p.x, ry + 4, { scale: .7 + .1 * grow });
      if (layer === 'front') { const r = seeded(Math.floor(t / .1)); for (let i = 0; i < 2 + l * 2; i++) { const u = (t * 1.5 + i * .37) % 1; px(ctx, p.x + (r() - .5) * 28, ry - 60 + u * 62, P[3]); } }
      break;
    }
    case 'wind': ctx.globalAlpha = fade * thin; sprite(ctx, `br_wind_${side}`, P, Math.floor(t * 14) % 8, p.x, ry + 6, { scale: sc, flip: f < 0 }); break;
    case 'serpent': ctx.globalAlpha = fade * (layer === 'front' ? .45 : 1); sprite(ctx, `br_serpent_${side}`, P, Math.floor(t * 8) % 8, p.x, ry + 6, { scale: .72 + .1 * l, flip: f < 0 }); break;
    case 'beast': if (layer !== 'front') { ctx.globalAlpha = fade * (.45 + .14 * l); sprite(ctx, 'br_beast_spirit', P, Math.floor(t * 6) % 6, p.x - f * 18, ry + 4, { scale: .5 + .14 * l + .06 * grow, flip: f < 0 }); } break;
    case 'drones': drones(ctx, p, st, ry, layer, P); break;
    case 'rocks': behind(ctx, p, st, ry, layer, P, 'bp_rock', 2 + 2 * l, 26, .9, .5); break;
    case 'moons': if (layer !== 'front') { for (let i = 0; i < l; i++) sprite(ctx, 'bp_moon', P, (Math.floor(t * 6) + i) % 4, p.x - f * (10 + i * 12), ry - HERO_H - 6 - i * 6 + Math.sin(t * 2 + i) * 3, { anchor: 'center', scale: 1 + .2 * l - i * .2 }); } break;
    case 'ward': if (layer !== 'front' && l >= 2) { ctx.globalAlpha = fade * .35; drawWardShell(ctx, p.x, ry, { frac: l / 3, t, scale: .85 + .1 * l, color: P[2], light: P[3], dark: P[0] }); } break;
    case 'sound': behind(ctx, p, st, ry, layer, P, 'bp_sound', 2 + 2 * l, 30, .9 + .1 * l, 1.2); break;
    default: break;
  }
  ctx.restore();
}
