// GRIMGE Prototype — breathing aura & side effects (user, 3 Nov 2026: "nebeneffekte … wie bei nebel das um einen
// herum bei aktiver anwendung immer mehr nebel kommt" / "aura um den charakter die wächst je mehr dmg man während der
// atmungstechnik macht … ähnlich wie bei transformations von gelb zu blau zu weiß, nur jeweils für das element").
//   aura   the damage dealt during the stance fills it: stage I (the element itself), II at 250 (a hotter hue),
//          III at 600 (white god mode with the element's rim). Each stage hits 10 % harder and makes the side
//          effect stronger; a derived style (combo) keeps the damage already dealt.
//   side   every style changes the ground / air around the Wizard while it breathes (SIDE below) — mist builds a
//          fog bank that grows the longer you breathe (foes in it are slowed, the Wizard is harder to track).
import { hit, foesOf, projectilesOf, DEPTH, TAU } from './signature_core.js';
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
  thunder: { every: (lvl) => 2.4 - .5 * lvl, tick(p, st, gw, lvl, s) { const t = nearest(gw, p, 110 + 20 * lvl); if (!t) return; zap(p, st, s, t, 4 * lvl, 'bolt'); if (lvl >= 3) applyStatus(t, 'paralysis', { quiet: true }); } },
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
}

export function updateBreathAura(p, st, dt, gw, s) {
  st.zaps = st.zaps ?? []; for (const z of st.zaps) z.t += dt; st.zaps = st.zaps.filter((z) => z.t < .3);
  st.auraPop = Math.max(0, (st.auraPop ?? 0) - dt);
  const lvl = auraStage(st);
  // Fog builds up while the Wizard breathes (and with every hit); foes inside are slowed, the Wizard is concealed.
  const cap = FOG_CAP[st.style];
  if (cap) {
    st.fog = Math.min(cap[lvl - 1], (st.fog ?? 0) + dt * .08);
    const r = fogRadius(st);
    for (const t of near(gw, p, r)) t.slow?.(.4, 1 - .3 * st.fog);
    p.concealment = st.style === 'mist' ? st.fog : st.fog * .5;
  }
  const side = SIDE[st.style]; if (!side) return;
  const every = typeof side.every === 'function' ? side.every(lvl) : side.every;
  st.sideT = (st.sideT ?? 0) + dt;
  if (st.sideT >= every) { st.sideT = 0; side.tick(p, st, gw, lvl, s); }
}
export function endBreathAura(p) { p.concealment = 0; }

// ── look ─────────────────────────────────────────────────────────────────
const sprite = (ctx, sheet, pal, frame, x, y, opts) => { if (!spellSheetReady(sheet)) return false; drawFineFromLayer(ctx, (c) => drawSpellSpriteTinted(c, sheet, pal, frame, x, y, opts)); return true; };
// The stance cloak (contour aura along the sprite) from stage II on.
export function breathCloak(p, st, s) {
  const l = auraStage(st); if (l < 2 || p.focusTransformTimer > 0) return null;
  const P = auraPalettes(st.style, s.ramp)[l - 1];
  return { edge: css(P[2]), inner: css(P[3]), fade: Math.min(1, st.timer * 2) };
}
export function renderBreathAura(ctx, p, st, ry, layer, s, pieceSheet) {
  const l = auraStage(st); const P = auraPalettes(st.style, s.ramp)[l - 1]; const t = st.t; const f = p.facing || 1;
  const fade = Math.min(1, st.t * 3, st.timer * 2);
  // Fog bank (mist / steam): clouds on a ring around the Wizard — behind it on the back layer, thinner in front.
  if (st.fog > .02 && spellSheetReady('bp_mist')) {
    const fp = st.style === 'steam' ? auraPalettes('steam', s.ramp)[0] : ['#263238', '#546e7a', '#90a4ae', '#cfd8dc', '#eceff1'];
    const n = Math.round(5 + 15 * st.fog); const R = fogRadius(st);
    ctx.save();
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + t * .25 + Math.sin(i * 1.7) * .4; const front = Math.sin(a) > 0;
      if (front !== (layer === 'front')) continue;
      const rr = R * (.45 + .55 * ((i * 37 % 11) / 11));
      ctx.globalAlpha = fade * (front ? .45 : .85) * Math.min(1, st.fog * 2);
      sprite(ctx, 'bp_mist', fp, (i + Math.floor(t * 6)) % 4, p.x + Math.cos(a) * rr, ry - 14 + Math.sin(a) * rr * .3 - (i % 3) * 8, { anchor: 'center', scale: 1.3 + st.fog * 1.2 + (i % 3) * .3 });
    }
    ctx.restore();
  }
  // Side-effect strikes: zig-zag bolts, moon crescents, sound rings.
  if (layer === 'front') for (const z of st.zaps ?? []) {
    const k = z.t / .3; ctx.save(); ctx.globalAlpha = 1 - k;
    if (z.kind === 'ring') { ctx.strokeStyle = P[3]; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(z.x0, ry - 20, z.r * (.3 + .7 * k), z.r * .3 * (.3 + .7 * k), 0, 0, TAU); ctx.stroke(); }
    else {
      const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([z.x0 + (z.x1 - z.x0) * u + (i % 6 ? (i % 2 ? 6 : -6) : 0) * (z.kind === 'bolt' ? 1 : 0), z.y0 + (z.y1 - z.y0) * u - (z.kind === 'moon' ? Math.sin(u * Math.PI) * 26 : 0)]); }
      for (const [w, c] of [[5, P[1]], [3, P[3]], [1, P[4]]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
    }
    ctx.restore();
  }
  if (p.focusTransformTimer > 0) return; // the transformation's own aura wins
  // The stage aura: the transformation's flame shapes in the style's colours, growing towards the next stage.
  const grow = (.78 + .22 * stageProgress(st)) * (1 + (st.auraPop ?? 0) * .4) + (l === 3 ? .08 : 0);
  const frame = Math.floor(t * 12) % 8;
  ctx.save(); ctx.globalAlpha = fade * (l === 1 ? .7 : .9);
  sprite(ctx, `bra_${l}_${layer === 'front' ? 'front' : 'back'}`, P, frame, p.x, ry - 58 + (1 - grow) * 30, { anchor: 'center', flip: f < 0, scale: grow });
  ctx.restore();
  // Motes of the element rising around the body (more per stage).
  if (layer === 'back' || !pieceSheet || !spellSheetReady(pieceSheet)) return;
  ctx.save();
  for (let i = 0; i < 1 + 2 * l; i++) {
    const u = (t * .7 + i * .37) % 1; const x = p.x + Math.sin(i * 2.3 + t * 1.5) * (22 + 4 * l); const y = ry - 10 - u * (70 + 12 * l);
    ctx.globalAlpha = fade * (1 - u) * .9;
    sprite(ctx, pieceSheet, P, (i + Math.floor(t * 12)) % 4, x, y, { anchor: 'center', scale: .45 + .1 * l });
  }
  ctx.restore();
}
