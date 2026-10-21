// GRIMGE Prototype — NATURA (nature) elemental rune spells, heal circles,
// the world tree and the weapon infusions (user, 18 Oct 2026).
//
// NATURA combines like every elemental rune (max 2 per deck):
//   natura           HEILBLÜTE        a Silkroad-style magic circle that heals
//   natura+natura    GROSSE BLÜTE     a larger circle: heal + a light shield
//   aqua+natura      HEILQUELLE       a spring zone: heal + mana over time
//   lux+natura       SEGENSKREIS      heal burst + 25 % less damage taken
//   natura+terra     DORNENWUCHS      a bramble line: roots, stays as a hazard
//   natura+umbra     GIFTSUMPF        a poison swamp at the target point
//   natura+ventus    POLLENSTURM      a spore cone: sleep + slow
//   ignis+natura     FLAMMENSAMEN     seeds that burst into fire after a moment
//   aqua+natura+terra WELTENBAUM      a giant tree that stays until destroyed:
//                                     heals allies, eats hostile projectiles,
//                                     its branches are platforms to stand on
// Weapon infusions are rune spells too (CONSTRUCT = the weapon rune):
//   construct + ignis / aqua / fulgur / natura / umbra / bestia
//   = flame / frost / storm / venom / blood (life steal) / rending (bleed).
import { startStance, signatureImpl } from './signature_core.js';
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { environment } from './environment.js';
import { applyStatuses } from './buff_techniques.js';
import { projectilesOf } from './signature_core.js';
import { GeoPlatform, registerSurface, unregisterSurface, GEO_LOOKS } from './geometry.js';
import { plate, band } from './buff_vfx.js';

const TAU = Math.PI * 2;
const DEPTH = 150;
export const NATURE_SPELL_IDS = Object.freeze(['heal_bloom', 'great_bloom', 'healing_spring', 'blessing_circle', 'thorn_growth', 'poison_swamp', 'pollen_storm', 'wildfire_seeds', 'world_tree']);
export const INFUSION_SPELLS = Object.freeze({
  flame_edge: { element: 'fire', color: '#ff7043', core: '#ffe0b2', name: 'FLAMMENKLINGE' },
  frost_edge: { element: 'frost', color: '#80deea', core: '#e0f7fa', name: 'FROSTKLINGE' },
  storm_edge: { element: 'storm', color: '#ffee58', core: '#fffde7', name: 'STURMKLINGE' },
  venom_edge: { element: 'venom', color: '#9ccc65', core: '#f1f8e9', name: 'GIFTKLINGE' },
  blood_edge: { element: 'blood', color: '#e53935', core: '#ffcdd2', name: 'BLUTKLINGE' },
  rending_edge: { element: 'bleed', color: '#d84315', core: '#ffccbc', name: 'REISSKLINGE' }
});
const dist = (a, x, z) => Math.hypot(a.x - x, ((a.z ?? z) - z) * DEPTH);
const foesOf = (caster, game) => (game?.getHostileTargets?.(caster.team) ?? []).filter((t) => t && !t.isDead && (t.hp ?? 1) > 0 && t.lifeState !== 'Dead');
function alliesOf(caster, game) {
  const list = [];
  for (const e of [game?.player, game?.enemyChampion, game?.primal]) if (e && e.team === caster.team && e.isAlive !== false && !e.merged) list.push(e);
  for (const m of game?.minions ?? []) if (m.team === caster.team && !m.isDead && !m.isTrainingDummy) list.push(m);
  return list;
}
const heal = (e, amount) => { if (e.hp > 0) e.hp = Math.min(e.maxHp ?? e.hp, e.hp + amount); };

// ── Silkroad-style magic circle (heal / bless) ───────────────────────────
function magicCircle(ctx, x, y, R, t, a, colors) {
  if (a <= 0) return;
  const [outer, inner, glyph] = colors;
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
  const E = (r, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, r, r * .32, 0, 0, TAU); ctx.stroke(); };
  E(R, 3, outer); E(R * .86, 1.5, inner); E(R * .5, 2, outer);
  // Rotating rune ticks between the two outer rings.
  ctx.fillStyle = glyph;
  for (let i = 0; i < 16; i++) { const ang = i / 16 * TAU + t * .8; const r = R * .93; ctx.fillRect(x + Math.cos(ang) * r - 1.5, y + Math.sin(ang) * r * .32 - 1, 3, 2); }
  // A hexagram turning the other way.
  ctx.strokeStyle = inner; ctx.lineWidth = 1.5;
  for (const off of [0, Math.PI / 3]) { ctx.beginPath(); for (let i = 0; i <= 3; i++) { const ang = off - t * .5 + i * TAU / 3; const px = x + Math.cos(ang) * R * .82; const py = y + Math.sin(ang) * R * .82 * .32; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
  // Petals / light motes rising from the ring.
  for (let i = 0; i < 8; i++) { const ph = (t * .7 + i / 8) % 1; const ang = i / 8 * TAU; ctx.globalAlpha = a * (1 - ph); ctx.fillStyle = glyph; ctx.beginPath(); ctx.ellipse(x + Math.cos(ang) * R * .7, y + Math.sin(ang) * R * .22 - ph * 60, 3, 2, ang, 0, TAU); ctx.fill(); }
  ctx.restore();
}

class NatureZone {
  constructor(caster, game, { x, z, R, life, kind, tick, colors }) {
    this.caster = caster; this.owner = caster; this.team = caster.team; this.game = game; this.x = x; this.z = z; this.R = R; this.life = life; this.kind = kind; this.tickFn = tick; this.colors = colors;
    this.t = 0; this.isFinished = false; this.acc = 0;
  }
  get y() { return groundYForDepth(this.z); }
  update(dt, game = this.game) {
    this.t += dt; this.acc += dt;
    if (this.acc >= .25) { this.tickFn?.(this, this.acc, game); this.acc = 0; }
    if (this.t >= this.life) this.isFinished = true;
  }
  render(ctx) {
    const a = Math.min(1, this.t * 4, (this.life - this.t) * 2);
    if (this.kind === 'swamp') {
      ctx.save(); ctx.globalAlpha = .55 * a; ctx.fillStyle = '#2e3b16'; ctx.beginPath(); ctx.ellipse(this.x, this.y, this.R, this.R * .32, 0, 0, TAU); ctx.fill(); ctx.restore();
      for (let i = 0; i < 6; i++) { const ph = (this.t * .8 + i / 6) % 1; const ang = i * 2.4; ctx.save(); ctx.globalAlpha = a * (1 - ph); ctx.strokeStyle = '#b2ff59'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(this.x + Math.cos(ang) * this.R * .6, this.y + Math.sin(ang) * this.R * .18 - ph * 6, 2 + ph * 4, 0, TAU); ctx.stroke(); ctx.restore(); }
      return;
    }
    if (this.kind === 'spring') {
      for (let r = 0; r < 3; r++) { const ph = (this.t * .6 + r / 3) % 1; ctx.save(); ctx.globalAlpha = a * (1 - ph) * .8; ctx.strokeStyle = '#81d4fa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(this.x, this.y, this.R * ph, this.R * ph * .32, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    }
    magicCircle(ctx, this.x, this.y, this.R, this.t, a, this.colors);
  }
}

// Bramble segments: thorny vines that root on emerge and hurt while standing in them.
class Bramble {
  constructor(caster, game, x, z, delay, life) { this.caster = caster; this.owner = caster; this.team = caster.team; this.game = game; this.x = x; this.z = z; this.t = -delay; this.life = life; this.isFinished = false; this.hit = new Set(); this.acc = 0; }
  get y() { return groundYForDepth(this.z); }
  update(dt, game = this.game) {
    this.t += dt; if (this.t <= 0) return;
    this.acc += dt;
    for (const t of foesOf(this.caster, game)) {
      if (dist(t, this.x, this.z) > 26) continue;
      if (!this.hit.has(t)) { this.hit.add(t); t.takeDamage?.(20, 0, 60, 1.2, false, 'spell'); applyStatuses(t, ['root'], this.caster, this.caster.facing); }
      else if (this.acc >= .5) { t.takeDamage?.(4, 0, 0, .05, false, 'spell'); t.slow?.(.6, .6); }
    }
    if (this.acc >= .5) this.acc = 0;
    if (this.t >= this.life) this.isFinished = true;
  }
  render(ctx) {
    if (this.t <= 0) return;
    const grow = Math.min(1, this.t / .2); const a = Math.min(1, (this.life - this.t) * 2); const y = this.y;
    for (let i = 0; i < 5; i++) {
      const sx = this.x + (i - 2) * 8; const h = (30 + (i % 2) * 16) * grow;
      band(ctx, [[sx, y + 2], [sx + Math.sin(i * 2) * 5, y - h * .5], [sx + Math.sin(i * 3) * 8, y - h]], (k, n) => 5 - k * 1.5, GEO_LOOKS.root, 7300 + i, { t: this.t, alpha: a });
      for (const s of [-1, 1]) plate(ctx, [[sx, y - h * .5], [sx + s * 7, y - h * .5 - 3], [sx, y - h * .5 - 2]], { ...GEO_LOOKS.root, body: '#d7ccc8' }, 7310 + i + s, { alpha: a });
    }
  }
}

// Seeds that burst into flame.
class FireSeed {
  constructor(caster, game, x, z, delay) { this.caster = caster; this.owner = caster; this.team = caster.team; this.game = game; this.x = x; this.z = z; this.t = 0; this.delay = delay; this.isFinished = false; this.burst = false; }
  get y() { return groundYForDepth(this.z); }
  update(dt, game = this.game) {
    this.t += dt;
    if (!this.burst && this.t >= this.delay) {
      this.burst = true;
      for (const t of foesOf(this.caster, game)) if (dist(t, this.x, this.z) < 46) { t.takeDamage?.(26, Math.sign(t.x - this.x || 1) * 200, 160, .4, false, 'spell'); applyStatuses(t, ['burn'], this.caster, this.caster.facing); }
      environment.add('scorch', this.x, this.z, { radius: 34, team: this.team });
      combat.spawnShockwave(this.x, this.y - 10, 40, '#ff7043');
    }
    if (this.t >= this.delay + .4) this.isFinished = true;
  }
  render(ctx) {
    const y = this.y;
    if (!this.burst) { plate(ctx, [[this.x, y - 8], [this.x + 4, y], [this.x, y + 2], [this.x - 4, y]], { ...GEO_LOOKS.root, body: '#8d6e63', vein: '#ff7043' }, 7320, { alpha: 1, pulse: .5 + .5 * Math.sin(this.t * 20) }); return; }
    const k = (this.t - this.delay) / .4;
    for (let i = 0; i < 5; i++) { const ang = -Math.PI / 2 + (i - 2) * .4; plate(ctx, [[this.x - 4, y], [this.x + Math.cos(ang) * 30 * k, y + Math.sin(ang) * 40 * k], [this.x + 4, y]], { kind: 'crystal', dark: '#3a1206', body: '#ff8a3d', facet: '#ffd0a0', vein: '#ff5a1f', edge: '#ffe2b8', spark: '#fff1c2', core: '#fffaf0', glow: 'rgba(255,90,31,', edgeGlow: 'rgba(255,226,184,' }, 7330 + i, { alpha: 1 - k }); }
  }
}

// Pollen storm: a drifting spore cone.
class PollenStorm {
  constructor(caster, game) { this.caster = caster; this.owner = caster; this.team = caster.team; this.game = game; this.x = caster.x; this.z = caster.z; this.f = caster.facing || 1; this.t = 0; this.life = 1.1; this.isFinished = false; this.hit = new Set(); }
  get y() { return groundYForDepth(this.z); }
  update(dt, game = this.game) {
    this.t += dt; const reach = 40 + Math.min(1, this.t / .7) * 200;
    for (const t of foesOf(this.caster, game)) { if (this.hit.has(t)) continue; const dx = (t.x - this.x) * this.f; if (dx > 0 && dx < reach && Math.abs(((t.z ?? this.z) - this.z) * DEPTH) < 20 + dx * .3) { this.hit.add(t); t.takeDamage?.(8, 0, 0, .9, false, 'spell'); t.slow?.(3, .5); } }
    if (this.t >= this.life) this.isFinished = true;
  }
  render(ctx) {
    const y = this.y - 34; const a = Math.min(1, (this.life - this.t) * 2);
    for (let i = 0; i < 44; i++) { const u = ((this.t * .9 + i / 28) % 1); const dx = 30 + u * 220; const spread = (Math.sin(i * 7.3) * .5) * (14 + dx * .3); ctx.save(); ctx.globalAlpha = a * (1 - u * .6); ctx.fillStyle = i % 3 ? '#f0f4c3' : '#ffd54f'; ctx.fillRect(this.x + this.f * dx, y + spread + Math.sin(this.t * 6 + i) * 3, 4, 4); ctx.restore(); }
  }
}

// ── The world tree: stays until destroyed; heals, eats projectiles, branch platforms ──
export class WorldTree {
  constructor(caster, game, x, z) {
    this.caster = caster; this.owner = caster; this.team = caster.team; this.game = game; this.x = x; this.z = z;
    this.maxHp = this.hp = 320; this.t = 0; this.life = 25; this.isFinished = false; this.isProp = true; this.isObjective = false; this.isWorldTree = true;
    // A breakable world prop: the other team can cut it down (main.getHostileTargets).
    this.isWorldProp = true; this.isDead = false; this.worldHeight = 0; this.elevation = 0; this.surfaceHeight = 0; this.hitHeightTolerance = 200;
    this.hitRadiusX = 26; this.hitRadiusZ = .1; this.acc = 0; this.hitFlash = 0;
    this.grow = 0;
    // Two branch platforms (landing-only surfaces) on either side of the trunk.
    this.branches = [
      new GeoPlatform(caster, game, { x: x - 46, z, halfW: 30, halfD: .06, height: 74, life: this.life, emerge: .9, decay: .6, delay: .5, look: 'bark', damage: 0, label: 'World tree branch' }),
      new GeoPlatform(caster, game, { x: x + 46, z, halfW: 30, halfD: .06, height: 118, life: this.life, emerge: 1.1, decay: .6, delay: .7, look: 'bark', damage: 0, label: 'World tree branch' })
    ];
  }
  get y() { return groundYForDepth(this.z); }
  get isAlive() { return !this.isFinished; }
  takeDamage(amount) {
    if (this.isFinished) return { ignored: true };
    this.hp -= amount; this.hitFlash = .12;
    if (this.hp <= 0) this.fell();
    return {};
  }
  fell() { this.hp = 0; this.isDead = true; for (const b of this.branches) b.shatter(); this.life = Math.min(this.life, this.t + .6); combat.spawnShockwave(this.x, this.y - 60, 80, '#9be36a'); }
  update(dt, game = this.game) {
    this.t += dt; this.acc += dt; this.hitFlash = Math.max(0, this.hitFlash - dt); this.grow = Math.min(1, this.t / 1.2);
    // The branches live exactly as long as the tree (its life may be scaled by the rune grade).
    if (!this.synced) { this.synced = true; for (const b of this.branches) b.life = this.life; }
    for (const b of this.branches) b.update(dt, game);
    // Roots burst out while it grows: foes at the trunk are thrown off.
    if (this.t < .4) for (const t of foesOf(this.caster, game)) if (dist(t, this.x, this.z) < 40 && !t._wtHit) { t._wtHit = true; t.takeDamage?.(30, Math.sign(t.x - this.x || 1) * 320, 220, .5, false, 'spell'); }
    if (this.acc >= .5) {
      this.acc = 0;
      for (const a of alliesOf(this.caster, game)) if (dist(a, this.x, this.z) < 150) heal(a, 4);
    }
    // The canopy and trunk swallow hostile projectiles.
    for (const pr of projectilesOf(game)) {
      if (pr.team === this.team) continue;
      if (Math.abs(pr.x - this.x) < 34 && Math.abs(((pr.z ?? this.z) - this.z) * DEPTH) < 26) { pr.isFinished = true; if ('life' in pr) pr.life = 0; this.takeDamage((pr.damage ?? 10) * .5); }
    }
    if (this.t >= this.life) { this.isFinished = true; for (const b of this.branches) unregisterSurface(game, b.surface); }
  }
  render(ctx) {
    const y = this.y; const g = this.grow; const fade = Math.min(1, (this.life - this.t) * 2);
    const bark = this.hitFlash > 0 ? { ...GEO_LOOKS.bark, body: '#ffffff' } : GEO_LOOKS.bark;
    const H = 190 * g;
    // Roots spreading at the base.
    for (let i = 0; i < 6; i++) { const s = i < 3 ? -1 : 1; const k = (i % 3) + 1; band(ctx, [[this.x, y - 6], [this.x + s * 16 * k, y - 2], [this.x + s * 26 * k * g, y + 4]], (j, n) => 6 - j * 2, bark, 7400 + i, { t: this.t, alpha: fade }); }
    // Trunk (twisting, wide at the base).
    plate(ctx, [[this.x - 22, y], [this.x + 22, y], [this.x + 12, y - H * .6], [this.x + 16, y - H], [this.x - 16, y - H], [this.x - 12, y - H * .6]], bark, 7410, { alpha: fade, lit: .6, glowEdge: .5 });
    ctx.save(); ctx.strokeStyle = GEO_LOOKS.bark.dark; ctx.globalAlpha = .6 * fade; ctx.lineWidth = 1.5; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(this.x - 12 + k * 7, y - 4); ctx.quadraticCurveTo(this.x - 6 + k * 5, y - H * .5, this.x - 10 + k * 6, y - H * .95); ctx.stroke(); } ctx.restore();
    for (const b of this.branches) b.render(ctx);
    // Canopy: layered leaf masses.
    if (g > .3) {
      const cg = Math.min(1, (g - .3) / .7);
      const leaf = (cx, cy, r, c, seed) => plate(ctx, Array.from({ length: 9 }, (_, i) => { const ang = i / 9 * TAU; const rr = r * (.85 + .15 * Math.sin(i * 2.7 + seed)); return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * .62]; }), { ...GEO_LOOKS.root, body: c, facet: '#a5d66f', vein: '#e6ff9a' }, seed, { alpha: fade, lit: .7, glowEdge: .5 });
      leaf(this.x - 40, y - H - 6, 46 * cg, '#3f7d2c', 7420); leaf(this.x + 44, y - H + 4, 44 * cg, '#3a7428', 7421); leaf(this.x, y - H - 30, 58 * cg, '#4c8f35', 7422);
      for (let i = 0; i < 6; i++) { const ph = (this.t * .3 + i / 6) % 1; ctx.save(); ctx.globalAlpha = fade * (1 - ph); ctx.fillStyle = '#e6ff9a'; ctx.fillRect(this.x + Math.sin(i * 2.1) * 60, y - H - 20 + ph * 120, 3, 3); ctx.restore(); }
    }
    // HP bar.
    if (this.hp < this.maxHp) { ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(this.x - 20, y - H - 72, 40, 4); ctx.fillStyle = '#9be36a'; ctx.fillRect(this.x - 20, y - H - 72, 40 * this.hp / this.maxHp, 4); }
  }
}

// ── Cast entry (spells.js) ───────────────────────────────────────────────
const HEAL_COLORS = ['#9be36a', '#e6ffd0', '#ffffff'];
const BLESS_COLORS = ['#ffe082', '#fff8e1', '#ffffff'];
export function castNatureSpell(system, caster, id, quality, target, game) {
  const q = quality ?? { power: 1, area: 1, duration: 1 };
  const f = caster.facing || 1;
  const add = (obj) => { system.addSpell(obj, q); return true; };
  switch (id) {
    case 'heal_bloom': return add(new NatureZone(caster, game, { x: caster.x, z: caster.z, R: 70 * (q.area ?? 1), life: 3, kind: 'heal', colors: HEAL_COLORS, tick: (s, dt, g) => { for (const a of alliesOf(caster, g)) if (dist(a, s.x, s.z) < s.R) { heal(a, 12 * dt * (q.power ?? 1)); a.slowTimer = 0; } } }));
    case 'great_bloom': {
      for (const a of alliesOf(caster, game)) if (dist(a, caster.x, caster.z) < 110) { a.arcaneShield = Math.max(a.arcaneShield ?? 0, 20); a.arcaneShieldTimer = Math.max(a.arcaneShieldTimer ?? 0, 4); }
      return add(new NatureZone(caster, game, { x: caster.x, z: caster.z, R: 110 * (q.area ?? 1), life: 4, kind: 'heal', colors: HEAL_COLORS, tick: (s, dt, g) => { for (const a of alliesOf(caster, g)) if (dist(a, s.x, s.z) < s.R) heal(a, 15 * dt * (q.power ?? 1)); } }));
    }
    case 'healing_spring': return add(new NatureZone(caster, game, { x: caster.x, z: caster.z, R: 90 * (q.area ?? 1), life: 6 * (q.duration ?? 1), kind: 'spring', colors: ['#81d4fa', '#e1f5fe', '#ffffff'], tick: (s, dt, g) => { for (const a of alliesOf(caster, g)) if (dist(a, s.x, s.z) < s.R) { heal(a, 10 * dt * (q.power ?? 1)); if (a.mp != null) a.mp = Math.min(a.maxMp ?? a.mp, a.mp + 3 * dt); } } }));
    case 'blessing_circle': {
      for (const a of alliesOf(caster, game)) if (dist(a, caster.x, caster.z) < 120) { heal(a, 25 * (q.power ?? 1)); a._blessT = 5; }
      return add(new NatureZone(caster, game, { x: caster.x, z: caster.z, R: 120, life: 1.4, kind: 'bless', colors: BLESS_COLORS }));
    }
    case 'thorn_growth': { for (let i = 0; i < 7; i++) system.addSpell(new Bramble(caster, game, caster.x + f * (40 + i * 34), caster.z, i * .06, 6 * (q.duration ?? 1)), q); return true; }
    case 'poison_swamp': { const x = target?.x ?? caster.x + f * 160; const z = target?.z ?? caster.z; return add(new NatureZone(caster, game, { x, z, R: 80 * (q.area ?? 1), life: 7 * (q.duration ?? 1), kind: 'swamp', tick: (s, dt, g) => { for (const t of foesOf(caster, g)) if (dist(t, s.x, s.z) < s.R) { t.takeDamage?.(6 * dt * (q.power ?? 1), 0, 0, .05, false, 'spell'); t.slow?.(.6, .6); } } })); }
    case 'pollen_storm': return add(new PollenStorm(caster, game));
    case 'wildfire_seeds': { for (let i = 0; i < 4; i++) system.addSpell(new FireSeed(caster, game, caster.x + f * (60 + i * 40), caster.z + (i % 2 ? .05 : -.05), 1 + i * .12), q); return true; }
    case 'world_tree': { const x = target?.x ?? caster.x + f * 110; const z = target?.z ?? caster.z; return add(new WorldTree(caster, game, x, z)); }
    default: break;
  }
  const inf = INFUSION_SPELLS[id];
  if (inf) {
    caster.weaponInfusion = { ...inf, id, t: 12 * (q.duration ?? 1), hits: 0 };
    // The infused blade breathes (user, 21 Oct 2026: breathings take over the weapon element buffs):
    // a short stance of the matching breathing style (8 s).
    const breath = INFUSION_BREATH[id];
    if (breath && caster === globalThis.window?.gameWorld?.player && signatureImpl(breath.rune)) /* stances run on the player only */ { startStance(caster, breath.rune, q, { arcs: [], style: breath.style, baseStyle: breath.style }); caster.signature.timer = Math.min(caster.signature.timer, 8 * (q.duration ?? 1)); }
    combat.spawnShockwave(caster.x + f * 18, caster.y - 46, 30, inf.color);
    audio.playSpell?.('aura_shock');
    return true;
  }
  return false;
}
// Konstrukt + element → the breathing the blade carries.
const INFUSION_BREATH = Object.freeze({ flame_edge: { rune: 'S41', style: 'flame' }, frost_edge: { rune: 'S84', style: 'ice' }, storm_edge: { rune: 'S42', style: 'thunder' }, venom_edge: { rune: 'S77', style: 'insect' }, blood_edge: { rune: 'S79', style: 'moon' }, rending_edge: { rune: 'S81', style: 'beast' } });
export const isNatureOrInfusion = (id) => NATURE_SPELL_IDS.includes(id) || !!INFUSION_SPELLS[id];

// Infusion on a melee hit (called from weapon_kits.onWeaponMeleeHit).
export function infusionOnHit(player, target, damage) {
  const inf = player.weaponInfusion; if (!inf || inf.t <= 0) return;
  inf.hits++;
  combat.spawnHitSparks(target.x, (target.y ?? 0) - 30, player.facing || 1, inf.color, 6);
  switch (inf.element) {
    case 'fire': applyStatuses(target, ['burn'], player, player.facing); break;
    case 'frost': target.slow?.(1.2, .55); if (inf.hits % 3 === 0) target.freeze?.(.5); break;
    case 'storm': { applyStatuses(target, ['shock'], player, player.facing); const g = globalThis.window?.gameWorld; const next = foesOf(player, g).filter((o) => o !== target && dist(o, target.x, target.z ?? player.z) < 120)[0]; if (next) { next.takeDamage?.(8, 0, 20, .2, false, 'spell'); combat.spawnHitSparks(next.x, (next.y ?? 0) - 30, 1, inf.color, 6); } break; }
    case 'venom': target._venom = { until: 4, by: player }; break;
    case 'blood': heal(player, damage * .2); break;
    case 'bleed': target._bleed = { until: 3, by: player }; break;
    default: break;
  }
}
// Per-frame: infusion timer + damage over time of venom / bleed on enemies.
export function updateInfusion(player, dt, game) {
  const inf = player.weaponInfusion;
  if (inf) { inf.t -= dt; if (inf.t <= 0) player.weaponInfusion = null; }
  if (player._blessT > 0) player._blessT -= dt;
  for (const t of foesOf(player, game)) {
    for (const key of ['_venom', '_bleed']) {
      const d = t[key]; if (!d || d.by !== player) continue;
      d.until -= dt; d.acc = (d.acc ?? 0) + dt;
      if (d.acc >= .5) { d.acc = 0; t.takeDamage?.(key === '_venom' ? 3 : 4, 0, 0, .02, false, 'spell'); }
      if (d.until <= 0) t[key] = null;
    }
  }
}
// The infused weapon hand glows in the element colour.
export function renderInfusion(ctx, player, renderY) {
  const inf = player.weaponInfusion; if (!inf) return;
  const f = player.facing || 1; const x = player.x + f * 18; const y = renderY - 46; const t = player.animTime ?? 0;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) { const ph = (t * 2 + i / 5) % 1; ctx.globalAlpha = .8 * (1 - ph); ctx.fillStyle = i % 2 ? inf.core : inf.color; ctx.fillRect(x + Math.sin(i * 2.3 + t * 5) * 8, y - ph * 22, 3, 3); }
  ctx.globalAlpha = .55; ctx.strokeStyle = inf.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 7 + Math.sin(t * 9) * 1.5, 0, TAU); ctx.stroke();
  ctx.restore();
}
