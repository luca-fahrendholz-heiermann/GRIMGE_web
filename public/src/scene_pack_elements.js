// GRIMGE Prototype — element scene objects (user, 23 Oct 2026: "alles umsetzen" — the
// interactive-object ideas, round 1). Every object is a SceneObject (scene_objects.js): neutral,
// breakable (unless it is a fixture), with its own life bar, feeling elements from hits, ground
// and spells close by. Kinds (addProp / map props):
//   vine          climbing vine: water / nature grow it into a platform, fire burns it (and the platform) away
//   mushrooms     mushroom ring: a hit bursts a poison cloud, fire blows the spores up, shadow makes it toxic
//   bloom         giant bloom: light charges it, a hit then spreads healing pollen; shadow → it bites
//   beehive       a hit wakes a swarm that hunts the nearest fighter (any team); smoke / fire calms it
//   icicle        frost grows it, fire melts it into a puddle, a heavy hit shatters it into shards (throwable)
//   water_barrel  a hit makes it leak: a growing puddle (frost → ice field) (throwable)
//   brazier       wind spreads its embers, water turns it into a steam cloud (shots go astray), knocked over → fire
//   powder_keg    fire / lightning / breaking: a big blast; chains to other kegs; airborne / guarding = a launch (throwable)
//   crystal_pylon stores lightning hits; the third discharges a chain lightning (and switches its signal)
//   gong          a hit sends a stunning sound wave (signal); lightning keeps it humming (paralysis around)
//   jump_pad      a hit (or landing on it from high) launches everyone standing on it
//   stalagmite    earth grows it into a pillar platform; toppled by a heavy hit it becomes a stone bridge
//   windmill      wind spins it: an updraft column carries up, shots are deflected; lightning → mana generator
//   banner        fire burns it down; the fallen cloth is a veil that swallows shots for a moment
//   mirror        reflects shots; light becomes a beam; shadow opens a portal (two portals = teleporter)
//   lantern       a light zone (reveals ghost platforms); shadow puts it out → darkness hides who stands in it
//   grave         shadow raises a skeleton for the caster's side; light banishes it
//   chandelier    cut the rope and it falls on whoever stands below
//   chest         an element lock: only its element opens it (loot)
//   shrine        an element shrine: a hit gives the Wizard element charges (melee hits carry the element);
//                 a spell of its element opens a buff zone for that side
import { SceneObject, registerSceneKind, actorsOf, groundDist, px, blob, flames, makeSurface, setSignal, hideActor, timeNow, DEPTH, TAU } from './scene_objects.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { applyStatus, getStatusSource } from './status_effects.js';
import { projectilesOf, projVel, projSetVel } from './signature_core.js';
import { BUFF_ZONES } from './zone_buffs.js';

const isHero = (a, gw) => a === gw?.player || !!a.heroKey;
const outward = (a, x) => Math.sign(a.x - x || 1);
// Launch an actor straight up: heroes get a jump impulse, everyone else a lift hit.
export function launchActor(a, gw, h = 200, dmg = 1) {
  if (isHero(a, gw)) { a.grounded = false; a.vElevation = Math.max(a.vElevation ?? 0, Math.sqrt(2 * 984 * h)); a.surfaceId = null; return; }
  a.takeDamage(dmg, 0, Math.sqrt(2 * 984 * h) * 1.15, .4, false, 'spell');
}
// A lit lantern / brazier within its light radius (ghost platforms, darkness).
export function lightAt(env, x, z, pad = 0) { return env.props.some((o) => o.lit && o.lightRadius && !o.isDead && groundDist(o, x, z) < o.lightRadius + pad); }
// Shared burn behaviour: hp drain, embers; returns true while burning.
function burnTick(o, dt, rate) {
  if (o.burning <= 0) return false;
  o.burning -= dt; o.hp -= dt * rate; if (Math.random() < .4) combat.spawnElementalParticles(o.x + (Math.random() - .5) * o.halfX * 2, o.y - 12, 'ignis', 1);
  if (o.hp <= 0) { o.hp = 0; o.isDead = true; o.burnt = true; }
  return true;
}
// A fixture: no damage from hits (it still feels elements and reacts), no life bar.
class Fixture extends SceneObject {
  constructor(kind, x, z, o = {}) { super(kind, x, z, { hp: 999, ...o }); this.indestructible = true; }
  elementDamage() { return 0; }
  takeDamage(amount, kx, lift, stun, crit, hitKind) { const out = super.takeDamage(amount, kx, lift, stun, crit, hitKind); this.hp = this.maxHp; this.isDead = false; return out; }
  renderBars() {}
}

// ── scene FX (no targets; environment.sceneFx) ─────────────────────────────
export class Cloud {
  constructor(x, z, { r = 60, life = 3, kind = 'poison', team = null } = {}) { Object.assign(this, { x, z, r, life, kind, team, t: 0, tick: 0, isFinished: false, deflected: new Set() }); }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt; if (this.t >= this.life) this.isFinished = true;
    if (this.kind === 'poison' && (this.tick -= dt) <= 0) { this.tick = .5; for (const a of actorsOf(gw)) if (groundDist(a, this.x, this.z) < this.r && a.team !== this.team) { a.takeDamage(4, 0, 0, .05, false, 'spell'); applyStatus(a, 'poison'); } }
    // Steam / veil: shots lose their aim (steam) or are swallowed (veil).
    if (this.kind !== 'poison') for (const p of projectilesOf(gw)) {
      if (this.deflected.has(p) || Math.abs(p.x - this.x) > this.r || Math.abs(((p.z ?? this.z) - this.z) * DEPTH) > this.r * .5) continue;
      this.deflected.add(p);
      if (this.kind === 'veil') { p.isFinished = true; if ('life' in p) p.life = 0; continue; }
      const [vx, vz] = projVel(p); projSetVel(p, vx * .85, vz + (Math.random() < .5 ? -1 : 1) * (.35 + Math.random() * .3));
    }
  }
  render(ctx) {
    const k = Math.min(1, this.t / .3, (this.life - this.t) / .5); const y = this.y;
    const col = this.kind === 'poison' ? ['#6a1b9a', '#9ccc65'] : this.kind === 'veil' ? ['#5d4037', '#a1887f'] : ['#cfd8dc', '#ffffff'];
    ctx.save(); ctx.globalAlpha = .55 * k;
    for (let i = 0; i < 7; i++) { const a = i * 2.4 + this.t * .7; blob(ctx, this.x + Math.cos(a) * this.r * .55, y - 18 - Math.abs(Math.sin(a * 1.3)) * 20, Math.round(this.r * .35), col[i % 2], .6); }
    ctx.restore();
  }
}
export class BeeSwarm {
  constructor(x, z, target) { Object.assign(this, { x, z, h: 40, target, t: 0, life: 6, tick: 0, isFinished: false }); }
  get y() { return groundYForDepth(this.z) - this.h; }
  update(dt, gw, env) {
    this.t += dt; if (this.t >= this.life) this.isFinished = true;
    if (!this.target || this.target.isDead || this.target.lifeState === 'Dead') this.target = actorsOf(gw).sort((a, b) => groundDist(a, this.x, this.z) - groundDist(b, this.x, this.z))[0] ?? null;
    // Smoke or fire close by calms the swarm.
    if (env.effects.some((e) => (e.type === 'smoke' || e.rules.fire) && e.contains(this.x, this.z, 20))) { this.isFinished = true; combat.spawnDamageText?.(this.x, this.y - 10, 'BERUHIGT', { color: '#ffe082' }); return; }
    const t = this.target; if (!t) return;
    const dx = t.x - this.x; const dz = ((t.z ?? this.z) - this.z) * DEPTH; const d = Math.hypot(dx, dz) || 1; const sp = 150 * dt;
    this.x += dx / d * Math.min(sp, d); this.z += dz / d * Math.min(sp, d) / DEPTH;
    if ((this.tick -= dt) <= 0 && d < 20) { this.tick = .4; t.takeDamage(3, 0, 0, .05, false, 'spell'); }
  }
  render(ctx) { const y = this.y; for (let i = 0; i < 9; i++) { const a = i * 2.1 + this.t * 9; px(ctx, this.x + Math.cos(a) * 9, y + Math.sin(a * 1.4) * 6, 2, 2, i % 3 ? '#ffd54f' : '#212121'); } }
}
class ShardBurst {
  constructor(x, z, dir, n = 5) { this.x = x; this.z = z; this.t = 0; this.isFinished = false; this.shards = Array.from({ length: n }, (_, i) => ({ x, z, a: (i / Math.max(1, n - 1) - .5) * 1.4 + (dir < 0 ? Math.PI : 0), hit: new Set() })); }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt; if (this.t > .5) this.isFinished = true;
    for (const s of this.shards) { s.x += Math.cos(s.a) * 420 * dt; s.z += Math.sin(s.a) * 420 * dt / DEPTH * .5; for (const a of actorsOf(gw)) if (!s.hit.has(a) && groundDist(a, s.x, s.z) < 18) { s.hit.add(a); a.takeDamage(14, Math.cos(s.a) * 200, 40, .3, false, 'spell'); a.slow?.(1.2, .5); } }
  }
  render(ctx) { for (const s of this.shards) { const y = groundYForDepth(s.z) - 26; px(ctx, s.x - 4, y - 1, 8, 3, '#b3e5fc'); px(ctx, s.x - 1, y - 1, 3, 3, '#ffffff'); } }
}
class Ray {
  constructor(x, z, h, dir, len, color) { Object.assign(this, { x, z, h, dir, len, color, t: 0, isFinished: false }); }
  get y() { return groundYForDepth(this.z); }
  update(dt) { this.t += dt; if (this.t > .3) this.isFinished = true; }
  render(ctx) { const y = this.y - this.h; const a = 1 - this.t / .3; ctx.save(); ctx.globalAlpha = a; px(ctx, Math.min(this.x, this.x + this.dir * this.len), y - 3, this.len, 6, this.color); px(ctx, Math.min(this.x, this.x + this.dir * this.len), y - 1, this.len, 2, '#ffffff'); ctx.restore(); }
}
class Bolt {
  constructor(pts, z) { this.pts = pts; this.z = z; this.t = 0; this.isFinished = false; }
  get y() { return groundYForDepth(this.z) + 1; }
  update(dt) { this.t += dt; if (this.t > .3) this.isFinished = true; }
  render(ctx) { ctx.save(); ctx.globalAlpha = 1 - this.t / .3; ctx.strokeStyle = '#ffee58'; ctx.lineWidth = 2; ctx.beginPath(); this.pts.forEach(([x, y], i) => { const jx = i && i < this.pts.length - 1 ? (Math.random() - .5) * 10 : 0; i ? ctx.lineTo(Math.round(x + jx), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)); }); ctx.stroke(); ctx.restore(); }
}
class Falling {
  constructor(o, h, onImpact) { this.x = o.x; this.z = o.z; this.h = h; this.v = 0; this.onImpact = onImpact; this.isFinished = false; this.draw = (ctx, x, y) => o.renderBody(ctx, x, y); }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw, env) { this.v += 984 * dt; this.h -= this.v * dt; if (this.h <= 0) { this.isFinished = true; this.onImpact(gw, env); } }
  render(ctx) { this.draw(ctx, this.x, this.y - Math.max(0, this.h)); }
}

// A big blast (powder keg): heroes in the air or guarding ride it (launch), everyone else is hurt.
export function blast(gw, env, x, z, { r = 95, dmg = 45 } = {}) {
  combat.shakeCamera(10, .3); combat.spawnShockwave(x, groundYForDepth(z) - 14, r, '#ff6d00'); combat.spawnShockwave(x, groundYForDepth(z) - 14, r * .6, '#ffd54f'); audio.playImpact?.(true);
  for (const a of actorsOf(gw)) {
    const d = groundDist(a, x, z); if (d > r) continue;
    if (isHero(a, gw) && (!a.grounded || a.isGuarding)) { launchActor(a, gw, 210); if ('kbVelX' in a) a.kbVelX = outward(a, x) * 240; continue; }
    a.takeDamage(dmg * (1 - d / r * .5), outward(a, x) * 360, 260, .6, false, 'spell');
  }
  for (const o of env.props) if (o.isSceneObject && !o.isDead && groundDist(o, x, z) < r) { o.feed('ignis', 20); o.takeDamage(30, outward(o, x) * 320, 0, 0, false, 'spell'); }
  env.add('scorch', x, z, { radius: r * .6 });
}

// ── round-1 objects ──────────────────────────────────────────────────────
class Vine extends SceneObject {
  constructor(x, z, o = {}) { super('vine', x, z, { hp: 50, half: 10, tol: 160, blocks: false, barColor: '#7cb342' }); this.growth = o.grown ? 40 : 0; this.top = o.h ?? 90; this.surfaces = [makeSurface('Vine pad', x, z, 24, .07, () => (this.grown && !this.isDead ? this.top : 0))]; }
  get grown() { return this.growth >= 40; }
  elementDamage(el) { return el === 'aqua' || el === 'natura' ? 0 : el === 'ignis' ? 2 : 1; }
  react(el, amount) {
    if ((el === 'aqua' || el === 'natura') && this.burning <= 0) this.growth = Math.min(40, this.growth + amount * (el === 'natura' ? 1.4 : 1));
    if (el === 'ignis' && this.burning <= 0 && (this.exposure.ignis ?? 0) >= 5) this.burning = 4;
    if (el === 'aqua' && this.burning > 0) this.burning = 0;
  }
  update(dt) { burnTick(this, dt, 16); }
  onBreak(gw, env) { this.dropSurfaces(gw); if (this.burnt) env.puff(this.x, this.z, 30); }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const h = Math.round(this.top * Math.min(1, this.growth / 40)); const leaf = this.burning > 0 ? '#6d4c2a' : '#4c9a35';
    px(ctx, x - 8, y - 2, 16, 3, '#4e342e');
    for (let yy = 0; yy < h; yy += 6) { const sx = Math.round(Math.sin(yy * .2) * 4); px(ctx, x - 1 + sx, y - yy - 6, 3, 6, '#2e6b22'); if (yy % 12 === 0) px(ctx, x + sx + (yy % 24 ? 2 : -6), y - yy - 5, 5, 3, leaf); }
    if (this.grown) { px(ctx, x - 24, y - this.top - 4, 48, 5, '#2e6b22'); px(ctx, x - 22, y - this.top - 6, 44, 2, '#7cb342'); }
    if (this.burning > 0) flames(ctx, x, y - h * .6, 18, this.age, 2);
    this.renderBars(ctx, y - Math.max(24, h) - 10, this.grown ? null : this.growth / 40);
  }
}
class Mushrooms extends SceneObject {
  constructor(x, z) { super('mushrooms', x, z, { hp: 60, half: 22, tol: 30, blocks: false, barColor: '#ce93d8' }); this.cd = 0; this.toxic = false; }
  takeDamage(amount, kx, lift, stun, crit, hitKind) { return super.takeDamage(amount * .25, kx, lift, stun, crit, hitKind); }
  onHit(amount, kx, els) { if (!els.has('ignis') && !els.has('aqua') && this.cd <= 0) { this.cd = this.toxic ? 2 : 4; this.pendingCloud = true; } }
  react(el) {
    if (el === 'ignis' && (this.exposure.ignis ?? 0) >= 6 && !this.exploded) { this.exploded = true; this.pendingBlast = true; }
    if (el === 'umbra') this.toxic = true;
  }
  update(dt, gw, env) {
    this.cd = Math.max(0, this.cd - dt);
    if (this.pendingCloud) { this.pendingCloud = false; env.addSceneFx(new Cloud(this.x, this.z, { r: this.toxic ? 85 : 60, life: this.toxic ? 4 : 3 })); }
    if (this.pendingBlast) {
      this.pendingBlast = false; combat.spawnShockwave(this.x, this.y - 10, 80, '#ff9800');
      for (const a of actorsOf(gw)) if (groundDist(a, this.x, this.z) < 80) { a.takeDamage(30, outward(a, this.x) * 260, 140, .4, false, 'spell'); applyStatus(a, 'burn'); }
      this.hp = 0; this.isDead = true; this.burnt = true;
    }
  }
  onBreak(gw, env) { env.puff(this.x, this.z, 40); }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const cap = this.toxic ? ['#4a148c', '#ab47bc'] : ['#b71c1c', '#ef5350'];
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const mx = x + Math.cos(a) * 18; const my = y + Math.sin(a) * 5; px(ctx, mx - 1, my - 8, 3, 8, '#efebe9'); px(ctx, mx - 5, my - 12, 11, 4, cap[0]); px(ctx, mx - 3, my - 13, 7, 2, cap[1]); px(ctx, mx - 2, my - 11, 2, 1, '#ffffff'); }
    this.renderBars(ctx, y - 24);
  }
}
class Bloom extends SceneObject {
  constructor(x, z) { super('bloom', x, z, { hp: 70, half: 14, tol: 60, blocks: false, barColor: '#f48fb1' }); this.charge = 20; this.carnivore = false; this.biteT = 0; }
  elementDamage(el) { return el === 'aqua' || el === 'natura' || el === 'lux' ? 0 : 1; }
  react(el, amount) {
    if (el === 'lux') { this.charge = Math.min(100, this.charge + amount * 2); this.carnivore = false; }
    if (el === 'umbra') this.carnivore = true;
  }
  onHit(amount, kx, els) { if (!this.carnivore && this.charge >= 40 && !els.has('lux')) { this.charge -= 40; this.pollen = getStatusSource()?.team ?? 'blue'; } }
  update(dt, gw) {
    if (this.pollen) {
      const team = this.pollen; this.pollen = null; combat.spawnShockwave(this.x, this.y - 30, 90, '#f8bbd0');
      for (const a of actorsOf(gw)) if (a.team === team && groundDist(a, this.x, this.z) < 90) { a.hp = Math.min(a.maxHp ?? a.hp, a.hp + 25); combat.spawnDamageText?.(a.x, (a.y ?? this.y) - 60, '+25', { color: '#9be36a' }); }
    }
    if (this.carnivore && (this.biteT -= dt) <= 0) {
      const v = actorsOf(gw).find((a) => groundDist(a, this.x, this.z) < 50); this.biteT = 1.5;
      if (v) { v.takeDamage(12, outward(v, this.x) * -60, 0, .3, false, 'melee'); v.slow?.(1, .4); this.bite = .25; }
    }
    this.bite = Math.max(0, (this.bite ?? 0) - dt);
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const petal = this.carnivore ? '#4a148c' : '#f06292'; const glow = this.charge >= 40 && !this.carnivore;
    px(ctx, x - 2, y - 30, 4, 28, '#2e7d32'); px(ctx, x - 10, y - 14, 8, 3, '#43a047'); px(ctx, x + 2, y - 20, 8, 3, '#43a047');
    const open = this.bite > 0 ? 4 : 0;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .3; px(ctx, x + Math.cos(a) * (9 + open) - 4, y - 38 + Math.sin(a) * 7 - 2, 8, 5, petal); }
    blob(ctx, x, y - 38, 5, this.carnivore ? '#c62828' : glow ? '#fff59d' : '#fbc02d', .9);
    if (this.carnivore) for (let i = -2; i <= 2; i++) px(ctx, x + i * 3, y - 34, 1, 3, '#ffffff');
    this.renderBars(ctx, y - 56, this.carnivore ? null : this.charge / 100, '#fff59d');
  }
}
class Beehive extends SceneObject {
  constructor(x, z) { super('beehive', x, z, { hp: 40, half: 12, tol: 120, blocks: false, barColor: '#ffb300' }); this.cd = 0; }
  onHit() { if (this.cd <= 0) { this.cd = 6; this.wake = true; } }
  update(dt, gw, env) {
    this.cd = Math.max(0, this.cd - dt);
    if (this.wake) { this.wake = false; const t = actorsOf(gw).sort((a, b) => groundDist(a, this.x, this.z) - groundDist(b, this.x, this.z))[0]; env.addSceneFx(new BeeSwarm(this.x, this.z, t)); audio.playImpact?.(false); }
  }
  onBreak(gw, env) { const t = actorsOf(gw).sort((a, b) => groundDist(a, this.x, this.z) - groundDist(b, this.x, this.z))[0]; env.addSceneFx(new BeeSwarm(this.x, this.z, t)); }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y);
    px(ctx, x - 1, y - 70, 3, 68, '#5d4037'); px(ctx, x - 14, y - 72, 28, 3, '#5d4037');
    for (let i = 0; i < 5; i++) px(ctx, x - 10 + Math.abs(2 - i) * 2, y - 66 + i * 5, 20 - Math.abs(2 - i) * 4, 5, i % 2 ? '#f9a825' : '#ffca28');
    px(ctx, x - 2, y - 52, 4, 3, '#3e2723');
    this.renderBars(ctx, y - 82);
  }
}
class Icicle extends SceneObject {
  constructor(x, z) { super('icicle', x, z, { hp: 50, half: 10, tol: 120, blocks: true, barColor: '#81d4fa' }); this.size = 1; this.throwable = true; this.heavy = true; }
  elementDamage(el) { return el === 'frost' ? 0 : el === 'ignis' ? 1.5 : 1; }
  onHit(amount, kx) { if (Math.abs(kx) >= 300) this.shatter = true; }
  react(el) {
    if (el === 'frost' && (this.exposure.frost ?? 0) >= 20 && this.size < 2) { this.size++; this.exposure.frost = 0; this.maxHp += 30; this.hp += 30; this.halfX += 3; }
    if (el === 'ignis' && (this.exposure.ignis ?? 0) >= 8 && !this.melted) { this.melted = true; this.hp = 0; this.isDead = true; }
  }
  update() { if (this.shatter && !this.isDead) { this.isDead = true; this.hp = 0; } }
  onLand() { this.shatter = true; this.isDead = true; this.hp = 0; }
  onBreak(gw, env) { if (this.melted) { env.add('water', this.x, this.z, { radius: 30 + this.size * 14 }); return; } env.addSceneFx(new ShardBurst(this.x, this.z, this.lastHitDir, 4 + this.size * 2)); audio.playImpact?.(true); }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const h = 26 + this.size * 18; const w = 8 + this.size * 3;
    for (let i = 0; i < h; i += 2) { const k = 1 - i / h; px(ctx, x - Math.round(w * k), y - i - 2, Math.max(2, Math.round(w * k * 2)), 2, i % 6 ? '#b3e5fc' : '#e1f5fe'); }
    px(ctx, x - 2, y - h + 4, 2, h - 8, '#ffffff');
    this.renderBars(ctx, y - h - 10);
  }
}
class WaterBarrel extends SceneObject {
  constructor(x, z) { super('water_barrel', x, z, { hp: 50, half: 13, tol: 120, blocks: true, barColor: '#4fc3f7' }); this.leak = 0; this.spill = 0; this.throwable = true; this.heavy = true; }
  elementDamage(el) { return el === 'aqua' ? 0 : 1; }
  onHit(amount, kx, els) { if (!els.has('frost') && this.leak <= 0) this.leak = 6; }
  react(el) { if (el === 'frost' && (this.exposure.frost ?? 0) >= 8) { this.exposure.frost = 0; this.freeze = true; } }
  update(dt, gw, env) {
    if (this.freeze) { this.freeze = false; env.add('ice', this.x, this.z, { radius: 50 }); }
    if (this.leak > 0) { this.leak -= dt; if ((this.spill -= dt) <= 0) { this.spill = .5; env.add('water', this.x + this.lastHitDir * 10, this.z, { radius: 22 + (6 - this.leak) * 6 }); } }
  }
  onBreak(gw, env) { env.add('water', this.x, this.z, { radius: 70 }); combat.spawnHitSparks(this.x, this.y - 16, 1, '#4fc3f7', 12); }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y);
    px(ctx, x - 12, y - 32, 24, 32, '#3e2723'); px(ctx, x - 11, y - 31, 22, 30, '#1e88e5'); px(ctx, x - 11, y - 26, 22, 3, '#424242'); px(ctx, x - 11, y - 9, 22, 3, '#424242'); px(ctx, x - 7, y - 22, 4, 10, '#90caf9');
    if (this.leak > 0) for (let i = 0; i < 3; i++) px(ctx, x + this.lastHitDir * 12, y - 16 + ((i * 5 + Math.floor(this.age * 20)) % 14), 2, 3, '#81d4fa');
    this.renderBars(ctx, y - 42);
  }
}
class Brazier extends SceneObject {
  constructor(x, z, o = {}) { super('brazier', x, z, { hp: 80, half: 12, tol: 120, blocks: true, barColor: '#ff8a65' }); this.lit = o.lit ?? true; this.lightRadius = 90; this.cd = 0; }
  elementDamage(el) { return el === 'ignis' ? 0 : 1; }
  onHit(amount, kx) { if (this.lit && Math.abs(kx) >= 250) { this.lit = false; this.tipped = true; this.tipDir = Math.sign(kx); this.pendingTip = true; } }
  react(el, amount) {
    if (el === 'ignis') { this.lit = true; this.tipped = false; }
    if (el === 'aqua' && this.lit) { this.lit = false; this.pendingSteam = true; }
    if (el === 'ventus' && this.lit && amount > 3 && this.cd <= 0) { this.cd = 2; this.pendingEmbers = true; }
  }
  update(dt, gw, env) {
    this.cd = Math.max(0, this.cd - dt);
    if (this.pendingSteam) { this.pendingSteam = false; env.addSceneFx(new Cloud(this.x, this.z, { r: 70, life: 5, kind: 'steam' })); }
    if (this.pendingTip) { this.pendingTip = false; env.add('scorch', this.x + this.tipDir * 34, this.z, { radius: 50 }); }
    if (this.pendingEmbers) { this.pendingEmbers = false; for (let i = 1; i <= 3; i++) env.add('scorch', this.x + this.lastHitDir * 40 * i, this.z, { radius: 30 }); }
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y);
    if (this.tipped) { px(ctx, x - 16 + this.tipDir * 8, y - 10, 32, 10, '#424242'); return this.renderBars(ctx, y - 22); }
    px(ctx, x - 3, y - 24, 6, 22, '#424242'); px(ctx, x - 9, y - 4, 18, 4, '#424242'); px(ctx, x - 14, y - 32, 28, 8, '#616161'); px(ctx, x - 12, y - 34, 24, 3, '#3e2723');
    if (this.lit) flames(ctx, x, y - 34, 20, this.age, 2);
    this.renderBars(ctx, y - 56);
  }
}
class PowderKeg extends SceneObject {
  constructor(x, z) { super('powder_keg', x, z, { hp: 40, half: 13, tol: 120, blocks: true, barColor: '#ff7043' }); this.fuse = -1; this.throwable = true; this.metal = true; this.heavy = true; }
  react(el) { if ((el === 'ignis' || el === 'fulgur') && this.fuse < 0) this.fuse = .4; }
  onLand() { this.hp = 0; this.isDead = true; }
  update(dt) { if (this.fuse >= 0 && (this.fuse -= dt) <= 0) { this.hp = 0; this.isDead = true; } }
  onBreak(gw, env) { blast(gw, env, this.x, this.z); }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y);
    px(ctx, x - 12, y - 30, 24, 30, '#3e2723'); px(ctx, x - 11, y - 29, 22, 28, '#6d4c41'); px(ctx, x - 11, y - 24, 22, 3, '#9e9e9e'); px(ctx, x - 11, y - 8, 22, 3, '#9e9e9e');
    px(ctx, x - 6, y - 20, 12, 8, '#212121'); px(ctx, x - 4, y - 18, 8, 4, '#ff5252'); px(ctx, x + 2, y - 36, 2, 6, '#d7ccc8');
    if (this.fuse >= 0) px(ctx, x + 1, y - 39, 4, 4, Math.floor(this.age * 20) % 2 ? '#ffeb3b' : '#ff6d00');
    this.renderBars(ctx, y - 46);
  }
}
class CrystalPylon extends SceneObject {
  constructor(x, z, o = {}) { super('crystal_pylon', x, z, { hp: 200, half: 12, tol: 160, blocks: true, barColor: '#fff176' }); this.charges = 0; this.lastCharge = -9; this.key = o.key ?? null; }
  takeDamage(amount, kx, lift, stun, crit, hitKind) { return super.takeDamage(amount * .2, kx, lift, stun, crit, hitKind); }
  react(el) { if (el === 'fulgur' && this.age - this.lastCharge > .3) { this.lastCharge = this.age; this.charges++; if (this.charges >= 3) { this.charges = 0; this.discharge = true; } } }
  update(dt, gw, env) {
    if (this.charges && this.age - this.lastCharge > 6) this.charges = 0;
    if (!this.discharge) return;
    this.discharge = false; this.flash = .4; if (this.key) setSignal(this.key, true, 6);
    let from = { x: this.x, y: this.y - 70 }; const pts = [[from.x, from.y]]; const done = new Set();
    for (let j = 0; j < 3; j++) {
      const t = actorsOf(gw).filter((a) => !done.has(a) && a.team !== this.lastSourceTeam && groundDist(a, from.x, a.z ?? this.z) < (j ? 140 : 220)).sort((a, b) => Math.abs(a.x - from.x) - Math.abs(b.x - from.x))[0];
      if (!t) break; done.add(t); t.takeDamage(15, outward(t, from.x) * 120, 60, .3, false, 'spell'); pts.push([t.x, (t.y ?? this.y) - 30]); from = { x: t.x, y: (t.y ?? this.y) - 30 };
    }
    if (pts.length < 2) pts.push([this.x, this.y - 140]);
    env.addSceneFx(new Bolt(pts, this.z)); combat.shakeCamera(4, .12);
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const f = (this.flash = Math.max(0, (this.flash ?? 0) - 1 / 60)) > 0;
    px(ctx, x - 12, y - 8, 24, 8, '#5d4037');
    for (let i = 0; i < 60; i += 3) { const w = Math.round(9 * (1 - Math.abs(i - 30) / 34)); px(ctx, x - w, y - 8 - i, w * 2, 3, f ? '#ffffff' : i % 9 ? '#fff176' : '#fbc02d'); }
    for (let i = 0; i < 3; i++) px(ctx, x - 8 + i * 6, y - 78, 4, 4, i < this.charges ? '#ffee58' : '#424242');
    this.renderBars(ctx, y - 88);
  }
}
class Gong extends Fixture {
  constructor(x, z, o = {}) { super('gong', x, z, { half: 16, tol: 140, blocks: true }); this.key = o.key ?? 'gong'; this.cd = 0; this.hum = 0; }
  onHit(amount, kx, els) { if (this.cd <= 0 && !els.has('fulgur')) { this.cd = .8; this.ring = getStatusSource()?.team ?? null; } }
  react(el) { if (el === 'fulgur') this.hum = 4; }
  update(dt, gw) {
    this.cd = Math.max(0, this.cd - dt);
    if (this.ring !== undefined) {
      const team = this.ring; this.ring = undefined; this.wave = .5; setSignal(this.key, true, 3); combat.spawnShockwave(this.x, this.y - 40, 110, '#ffd54f'); audio.playImpact?.(true);
      for (const a of actorsOf(gw)) if (a.team !== team && groundDist(a, this.x, this.z) < 110) a.takeDamage(4, outward(a, this.x) * 120, 0, .45, false, 'spell');
    }
    if (this.hum > 0) { this.hum -= dt; if ((this.humT = (this.humT ?? 0) - dt) <= 0) { this.humT = 1; for (const a of actorsOf(gw)) if (a.team !== this.lastSourceTeam && groundDist(a, this.x, this.z) < 90) applyStatus(a, 'paralysis'); } }
    this.wave = Math.max(0, (this.wave ?? 0) - dt);
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const sh = this.wave > 0 || this.hum > 0 ? Math.round(Math.sin(this.age * 60) * 2) : 0;
    px(ctx, x - 22, y - 70, 4, 70, '#5d4037'); px(ctx, x + 18, y - 70, 4, 70, '#5d4037'); px(ctx, x - 24, y - 74, 48, 5, '#4e342e');
    blob(ctx, x + sh, y - 44, 16, '#c79100', 1); blob(ctx, x + sh, y - 44, 11, '#ffca28', 1); blob(ctx, x + sh - 3, y - 47, 4, '#fff8e1', 1);
    if (this.hum > 0) px(ctx, x - 1 + sh, y - 62, 2, 36, '#ffee58');
  }
}
class JumpPad extends Fixture {
  constructor(x, z) { super('jump_pad', x, z, { half: 22, tol: 20, blocks: false }); this.cd = 0; this.lastVE = new Map(); }
  standing(gw) { return actorsOf(gw).filter((a) => Math.abs(a.x - this.x) < this.halfX && Math.abs(((a.z ?? this.z) - this.z) * DEPTH) < 14 && (a.elevation ?? 0) + (a.surfaceHeight ?? 0) < 12); }
  onHit() { if (this.cd <= 0) { this.cd = .4; this.fire = true; } }
  update(dt, gw) {
    this.cd = Math.max(0, this.cd - dt); this.pop = Math.max(0, (this.pop ?? 0) - dt);
    // Landing on it from high (a stomp) bounces the hero up as well.
    for (const a of [gw?.player, gw?.enemyChampion]) { if (!a) continue; const prev = this.lastVE.get(a) ?? 0; if (a.grounded && prev < -420 && Math.abs(a.x - this.x) < this.halfX && Math.abs(((a.z ?? this.z) - this.z) * DEPTH) < 14) this.fire = true; this.lastVE.set(a, a.grounded ? 0 : a.vElevation ?? 0); }
    if (this.fire) { this.fire = false; this.pop = .25; combat.spawnShockwave(this.x, this.y - 4, 30, '#b388ff'); for (const a of this.standing(gw)) launchActor(a, gw, 190); }
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const up = this.pop > 0 ? 4 : 0;
    px(ctx, x - 22, y - 4, 44, 5, '#37474f'); px(ctx, x - 18, y - 8 - up, 36, 4, '#7e57c2'); px(ctx, x - 14, y - 9 - up, 28, 1, '#d1c4e9');
    for (let i = -1; i <= 1; i++) px(ctx, x + i * 10 - 1, y - 12 - up, 2, 3, '#ede7f6');
  }
}
class Stalagmite extends SceneObject {
  constructor(x, z, o = {}) { super('stalagmite', x, z, { hp: 120, half: 14, tol: 200, blocks: true, barColor: '#bcaaa4' }); this.h = o.h ?? 30; this.surfaces = [makeSurface('Stalagmite', x, z, 16, .06, () => (this.isDead ? 0 : this.h))]; }
  elementDamage(el) { return el === 'terra' ? 0 : 1; }
  react(el, amount) { if (el === 'terra') this.h = Math.min(130, this.h + amount * 1.2); }
  onHit(amount, kx) { if (Math.abs(kx) >= 300 && this.h >= 80) { this.topple = Math.sign(kx); this.hp = 0; this.isDead = true; } }
  onBreak(gw, env) {
    this.dropSurfaces(gw); combat.spawnDust(this.x, this.y, 10);
    if (!this.topple) return;
    const dir = this.topple; combat.shakeCamera(7, .2);
    for (const a of actorsOf(gw)) { const dx = (a.x - this.x) * dir; if (dx > 0 && dx < this.h + 20 && Math.abs(((a.z ?? this.z) - this.z) * DEPTH) < 26) a.takeDamage(30, dir * 200, 140, .5, false, 'spell'); }
    env.props.push(new StoneBridge(this.x + dir * (this.h / 2 + 10), this.z, this.h));
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const h = Math.round(this.h);
    for (let i = 0; i < h; i += 3) { const w = Math.round(14 * (1 - i / (h + 20))); px(ctx, x - w, y - i - 3, w * 2, 3, i % 9 ? '#8d6e63' : '#6d4c41'); }
    px(ctx, x - 12, y - h - 1, 24, 3, '#a1887f');
    this.renderBars(ctx, y - h - 12);
  }
}
class StoneBridge extends SceneObject {
  constructor(x, z, len = 120) { super('stone_bridge', x, z, { hp: 150, half: len / 2, tol: 60, blocks: false, barColor: '#bcaaa4' }); this.len = len; this.surfaces = [makeSurface('Stone bridge', x, z, len / 2, .07, () => (this.isDead ? 0 : 30))]; }
  onBreak(gw, env) { this.dropSurfaces(gw); combat.spawnDust(this.x, this.y, 10); env.add('rubble', this.x, this.z, { radius: this.len / 2, life: 4 }); }
  render(ctx) { const x = Math.round(this.x); const y = Math.round(this.y); const w = Math.round(this.len / 2); px(ctx, x - w, y - 34, w * 2, 8, '#6d4c41'); px(ctx, x - w, y - 36, w * 2, 3, '#a1887f'); for (let i = -w + 6; i < w; i += 24) px(ctx, x + i, y - 26, 6, 26, '#5d4037'); this.renderBars(ctx, y - 46); }
}
class Windmill extends SceneObject {
  constructor(x, z, o = {}) { super('windmill', x, z, { hp: 120, half: 12, tol: 200, blocks: true, barColor: '#b0bec5' }); this.spin = 0; this.rot = 0; this.key = o.key ?? null; this.deflected = new Set(); this.lift = o.lift ?? 210; }
  elementDamage(el) { return el === 'ventus' ? 0 : 1; }
  react(el, amount) { if (el === 'ventus' && amount > 2) this.spin = 6; if (el === 'fulgur' && this.spin > 0) this.generator = 3; }
  update(dt, gw) {
    this.rot += dt * (this.spin > 0 ? 14 : .4); this.generator = Math.max(0, (this.generator ?? 0) - dt);
    if (this.spin <= 0) return;
    this.spin -= dt; if (this.key) setSignal(this.key, true, .3);
    // Updraft column: carries whoever stands in it up to the top of the column.
    for (const a of actorsOf(gw)) {
      if (Math.abs(a.x - this.x) > 20 || Math.abs(((a.z ?? this.z) - this.z) * DEPTH) > 16) continue;
      const hgt = (a.elevation ?? 0) + (a.surfaceHeight ?? 0);
      if (isHero(a, gw) && hgt < this.lift) { a.grounded = false; a.vElevation = Math.max(a.vElevation ?? 0, 300); } else if (!isHero(a, gw) && hgt < 30) a.takeDamage(1, 0, 360, .2, false, 'spell');
    }
    for (const p of projectilesOf(gw)) { if (this.deflected.has(p) || Math.abs(p.x - this.x) > 100 || Math.abs(((p.z ?? this.z) - this.z) * DEPTH) > 60) continue; this.deflected.add(p); const [vx, vz] = projVel(p); projSetVel(p, vx * .9, vz + Math.sign((p.z ?? this.z) - this.z || 1) * .8); }
    if (this.generator > 0) for (const a of actorsOf(gw)) if (a.team === this.lastSourceTeam && Number.isFinite(a.mp) && groundDist(a, this.x, this.z) < 140) a.mp = Math.min(a.maxMp ?? 100, a.mp + 6 * dt);
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y);
    px(ctx, x - 6, y - 90, 12, 88, '#8d6e63'); px(ctx, x - 9, y - 4, 18, 4, '#5d4037');
    for (let i = 0; i < 4; i++) { const a = this.rot + i * Math.PI / 2; for (let r = 4; r < 34; r += 3) px(ctx, x + Math.cos(a) * r - 2, y - 92 + Math.sin(a) * r - 2, 4, 4, r > 12 ? '#eceff1' : '#90a4ae'); }
    blob(ctx, x, y - 92, 4, '#455a64', 1);
    if (this.spin > 0) { ctx.save(); ctx.globalAlpha = .35; for (let i = 0; i < 6; i++) { const yy = y - ((this.age * 160 + i * 34) % this.lift); px(ctx, x - 14 + (i % 3) * 10, yy, 2, 10, '#e0f7fa'); } ctx.restore(); }
    this.renderBars(ctx, y - 132);
  }
}
class Banner extends SceneObject {
  constructor(x, z) { super('banner', x, z, { hp: 40, half: 10, tol: 200, blocks: false, barColor: '#ef5350' }); }
  react(el) { if (el === 'ignis' && this.burning <= 0) this.burning = 2; }
  update(dt) { if (this.burning > 0) { this.burning -= dt; if (this.burning <= 0) { this.hp = 0; this.isDead = true; } } }
  onBreak(gw, env) { env.addSceneFx(new Cloud(this.x + this.lastHitDir * 20, this.z, { r: 50, life: 4, kind: 'veil' })); }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const w = Math.round(Math.sin(this.age * 3) * 2);
    px(ctx, x - 2, y - 110, 4, 108, '#5d4037'); px(ctx, x + 2, y - 104, 22 + w, 40, '#c62828'); px(ctx, x + 2, y - 104, 22 + w, 3, '#ffca28'); px(ctx, x + 8, y - 90, 10, 10, '#ffca28');
    if (this.burning > 0) flames(ctx, x + 12, y - 70, 20, this.age, 2);
    this.renderBars(ctx, y - 120);
  }
}
class Mirror extends SceneObject {
  constructor(x, z) { super('mirror', x, z, { hp: 150, half: 12, tol: 140, blocks: true, barColor: '#e1bee7' }); this.portal = 0; this.reflected = new Set(); this.tp = new Map(); }
  react(el) { if (el === 'lux') this.beam = this.lastHitDir; if (el === 'umbra') this.portal = 12; }
  update(dt, gw, env) {
    this.portal = Math.max(0, this.portal - dt);
    for (const p of projectilesOf(gw)) { if (this.reflected.has(p) || Math.abs(p.x - this.x) > 18 || Math.abs(((p.z ?? this.z) - this.z) * DEPTH) > 22) continue; this.reflected.add(p); const [vx, vz] = projVel(p); projSetVel(p, -vx, -vz); combat.spawnHitSparks(this.x, this.y - 40, 1, '#ffffff', 5); }
    if (this.beam) {
      const dir = this.beam; this.beam = 0; env.addSceneFx(new Ray(this.x, this.z, 40, dir, 360, '#fff59d'));
      for (const a of actorsOf(gw)) { const dx = (a.x - this.x) * dir; if (dx > 0 && dx < 360 && Math.abs(((a.z ?? this.z) - this.z) * DEPTH) < 24 && a.team !== this.lastSourceTeam) a.takeDamage(20, dir * 160, 40, .3, false, 'spell'); }
    }
    // Two shadow portals form a teleporter (heroes and their minions).
    if (this.portal > 0) {
      const other = env.props.find((o) => o !== this && o.kind === 'mirror' && o.portal > 0 && !o.isDead);
      if (other) for (const a of actorsOf(gw)) {
        if ((this.tp.get(a) ?? 0) > this.age || groundDist(a, this.x, this.z) > 20 || (a.elevation ?? 0) > 20) continue;
        const f = a.facing || 1; a.x = other.x + f * 30; a.z = other.z; other.tp.set(a, other.age + 1); this.tp.set(a, this.age + 1); combat.spawnShockwave(other.x, other.y - 30, 30, '#7e57c2');
      }
    }
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y);
    px(ctx, x - 12, y - 8, 24, 8, '#5d4037'); px(ctx, x - 10, y - 70, 20, 62, this.portal > 0 ? '#311b92' : '#b39ddb'); px(ctx, x - 8, y - 68, 16, 58, this.portal > 0 ? '#4527a0' : '#e1f5fe'); px(ctx, x - 5, y - 64, 3, 30, '#ffffff');
    if (this.portal > 0) for (let i = 0; i < 6; i++) { const a = this.age * 3 + i; px(ctx, x + Math.cos(a) * 5, y - 40 + Math.sin(a) * 20, 2, 2, '#b388ff'); }
    this.renderBars(ctx, y - 82);
  }
}
class Lantern extends SceneObject {
  constructor(x, z, o = {}) { super('lantern', x, z, { hp: 50, half: 8, tol: 120, blocks: false, barColor: '#ffe082' }); this.lit = o.lit ?? true; this.lightRadius = 110; }
  elementDamage(el) { return el === 'ignis' || el === 'lux' ? 0 : 1; }
  react(el) { if (el === 'umbra') this.lit = false; if (el === 'ignis' || el === 'lux') this.lit = true; }
  update(dt, gw) { if (!this.lit) for (const a of actorsOf(gw)) if (groundDist(a, this.x, this.z) < this.lightRadius) hideActor(a); }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y);
    if (this.lit) { ctx.save(); ctx.globalAlpha = .12; ctx.fillStyle = '#fff59d'; ctx.beginPath(); ctx.ellipse(x, y, this.lightRadius, this.lightRadius * .3, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    else { ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = '#0d0716'; ctx.beginPath(); ctx.ellipse(x, y, this.lightRadius, this.lightRadius * .3, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    px(ctx, x - 1, y - 60, 3, 58, '#37474f'); px(ctx, x - 7, y - 72, 14, 14, '#263238'); px(ctx, x - 5, y - 70, 10, 10, this.lit ? '#ffe082' : '#37474f'); px(ctx, x - 8, y - 74, 16, 3, '#455a64');
    if (this.lit) px(ctx, x - 2, y - 68, 4, 5, '#fffde7');
    this.renderBars(ctx, y - 84);
  }
}
class Grave extends Fixture {
  constructor(x, z) { super('grave', x, z, { half: 12, tol: 60, blocks: true }); this.cd = 0; this.pure = 0; this.skeleton = null; }
  react(el) {
    if (el === 'umbra' && this.cd <= 0 && this.pure <= 0 && (this.exposure.umbra ?? 0) >= 10 && !(this.skeleton && !this.skeleton.isDead)) { this.cd = 12; this.raise = true; }
    if (el === 'lux') { this.pure = 20; if (this.skeleton && !this.skeleton.isDead) { this.skeleton.hp = 0; this.skeleton.isDead = true; } }
  }
  update(dt, gw) {
    this.cd = Math.max(0, this.cd - dt); this.pure = Math.max(0, this.pure - dt);
    if (!this.raise) return;
    this.raise = false; const Minion = gw?.constructor?.MinionClass ?? globalThis.__GrimgeMinion; if (!Minion || !gw?.minions) return;
    const s = new Minion(this.x + 24, this.z, this.lastSourceTeam ?? 'blue', 'melee', 1); s.maxHp = s.hp = 60; s.damage = 10; s.isSkeleton = true; s.isSummonedByScene = true;
    gw.battlefield?.placeOnSurface?.(s); gw.minions.push(s); this.skeleton = s; combat.spawnShockwave(this.x, this.y - 10, 40, '#7e57c2'); combat.spawnDamageText?.(this.x, this.y - 60, 'SKELETT', { color: '#b39ddb' });
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y);
    px(ctx, x - 12, y - 4, 24, 4, '#3e2723'); px(ctx, x - 10, y - 40, 20, 36, '#757575'); px(ctx, x - 8, y - 44, 16, 4, '#757575'); px(ctx, x - 1, y - 36, 2, 14, '#424242'); px(ctx, x - 5, y - 32, 10, 2, '#424242');
    if (this.pure > 0) px(ctx, x - 10, y - 46, 20, 2, '#fff59d');
  }
}
class Chandelier extends SceneObject {
  constructor(x, z, o = {}) { super('chandelier', x, z, { hp: 30, half: 22, tol: 260, blocks: false, barColor: '#ffd54f' }); this.hang = o.h ?? 150; this.worldHeight = 0; }
  onBreak(gw, env) {
    env.addSceneFx(new Falling(this, this.hang, (g, e) => {
      combat.shakeCamera(8, .25); combat.spawnDust(this.x, this.y, 12); audio.playImpact?.(true);
      for (const a of actorsOf(g)) if (groundDist(a, this.x, this.z) < 55) a.takeDamage(40, outward(a, this.x) * 220, 160, .6, false, 'spell');
      e.add('rubble', this.x, this.z, { radius: 40, life: 4 });
    }));
  }
  renderBody(ctx, x, y) { px(ctx, x - 22, y - 6, 44, 5, '#c79100'); px(ctx, x - 2, y - 16, 4, 12, '#c79100'); for (let i = -2; i <= 2; i++) { px(ctx, x + i * 10 - 1, y - 12, 3, 6, '#fff8e1'); px(ctx, x + i * 10 - 1, y - 15, 3, 3, '#ffb300'); } }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y) - this.hang;
    px(ctx, x, y - 120, 1, 104, '#bcaaa4'); this.renderBody(ctx, x, y);
    ctx.save(); ctx.globalAlpha = .25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, this.y, 22, 6, 0, 0, TAU); ctx.fill(); ctx.restore();
    this.renderBars(ctx, y - 28);
  }
}
const LOCK_COLORS = { ignis: '#ff7043', aqua: '#4fc3f7', frost: '#b3e5fc', fulgur: '#ffee58', terra: '#a1887f', ventus: '#80deea', natura: '#9be36a', umbra: '#7e57c2', lux: '#fff59d' };
class Chest extends Fixture {
  constructor(x, z, o = {}) { super('chest', x, z, { half: 16, tol: 60, blocks: true }); this.lock = o.lock ?? 'ignis'; this.open = false; this.onOpen = o.onOpen ?? null; this.metal = true; this.loot = o.loot ?? 2; }
  react(el) { if (!this.open && el === this.lock && (this.exposure[el] ?? 0) >= 10) { this.open = true; this.opened = true; this.noBlock = true; } }
  update(dt, gw) {
    if (!this.opened) return;
    this.opened = false; combat.spawnShockwave(this.x, this.y - 20, 40, LOCK_COLORS[this.lock] ?? '#ffd54f'); combat.spawnDamageText?.(this.x, this.y - 50, 'GEÖFFNET', { color: '#ffd54f' });
    for (let i = 0; i < this.loot; i++) gw?.modeState?.potions?.push({ x: this.x + (i - (this.loot - 1) / 2) * 22, z: Math.min(.95, this.z + .06), kind: i % 2 ? 'mana' : 'hp', life: 20 });
    this.onOpen?.(gw, this);
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const c = LOCK_COLORS[this.lock] ?? '#ffd54f';
    px(ctx, x - 16, y - 18, 32, 18, '#5d4037'); px(ctx, x - 16, y - 18, 32, 3, '#8d6e63');
    if (this.open) { px(ctx, x - 16, y - 30, 32, 6, '#6d4c41'); px(ctx, x - 12, y - 20, 24, 3, '#ffd54f'); }
    else { px(ctx, x - 16, y - 24, 32, 7, '#6d4c41'); px(ctx, x - 4, y - 18, 8, 8, '#424242'); px(ctx, x - 2, y - 16, 4, 4, c); }
  }
}
class Shrine extends Fixture {
  constructor(x, z, o = {}) { super('shrine', x, z, { half: 16, tol: 140, blocks: true }); this.element = o.element ?? 'aqua'; this.cd = 0; this.zone = null; }
  onHit() { const by = getStatusSource()?.castBy; if (by && this.cd <= 0 && by === globalThis.window?.gameWorld?.player) { this.cd = 1; by.shrineCharge = { element: this.element, n: 4, until: timeNow() + 25 }; combat.spawnDamageText?.(this.x, this.y - 80, `${this.element.toUpperCase()} ×4`, { color: LOCK_COLORS[this.element] }); } }
  react(el) { if (el === this.element && (this.exposure[el] ?? 0) >= 15 && !this.zone) { this.exposure[el] = 0; this.zoneTeam = this.lastSourceTeam ?? 'blue'; this.makeZone = true; } }
  update(dt) {
    this.cd = Math.max(0, this.cd - dt);
    if (this.makeZone) { this.makeZone = false; this.zone = { team: this.zoneTeam, x: this.x, z: this.z, radius: 100, dmg: 1.2, move: 1.1, isFinished: false, until: this.age + 8 }; BUFF_ZONES.add(this.zone); combat.spawnShockwave(this.x, this.y - 10, 100, LOCK_COLORS[this.element]); }
    if (this.zone && this.age > this.zone.until) { this.zone.isFinished = true; BUFF_ZONES.delete(this.zone); this.zone = null; }
  }
  onBreak() { if (this.zone) BUFF_ZONES.delete(this.zone); }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const c = LOCK_COLORS[this.element] ?? '#ffffff';
    if (this.zone) { ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, 100, 30, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    px(ctx, x - 16, y - 8, 32, 8, '#757575'); px(ctx, x - 10, y - 50, 20, 42, '#9e9e9e'); px(ctx, x - 14, y - 54, 28, 5, '#616161');
    blob(ctx, x, y - 64, 7, c, 1); px(ctx, x - 2, y - 67, 3, 3, '#ffffff');
    for (let i = 0; i < 3; i++) { const ph = (this.age * .8 + i / 3) % 1; ctx.save(); ctx.globalAlpha = 1 - ph; px(ctx, x - 8 + i * 8, y - 70 - ph * 30, 2, 2, c); ctx.restore(); }
  }
}

registerSceneKind('vine', (x, z, o) => new Vine(x, z, o));
registerSceneKind('mushrooms', (x, z) => new Mushrooms(x, z));
registerSceneKind('bloom', (x, z) => new Bloom(x, z));
registerSceneKind('beehive', (x, z) => new Beehive(x, z));
registerSceneKind('icicle', (x, z) => new Icicle(x, z));
registerSceneKind('water_barrel', (x, z) => new WaterBarrel(x, z));
registerSceneKind('brazier', (x, z, o) => new Brazier(x, z, o));
registerSceneKind('powder_keg', (x, z) => new PowderKeg(x, z));
registerSceneKind('crystal_pylon', (x, z, o) => new CrystalPylon(x, z, o));
registerSceneKind('gong', (x, z, o) => new Gong(x, z, o));
registerSceneKind('jump_pad', (x, z) => new JumpPad(x, z));
registerSceneKind('stalagmite', (x, z, o) => new Stalagmite(x, z, o));
registerSceneKind('stone_bridge', (x, z, o) => new StoneBridge(x, z, o?.len));
registerSceneKind('windmill', (x, z, o) => new Windmill(x, z, o));
registerSceneKind('banner', (x, z) => new Banner(x, z));
registerSceneKind('mirror', (x, z) => new Mirror(x, z));
registerSceneKind('lantern', (x, z, o) => new Lantern(x, z, o));
registerSceneKind('grave', (x, z) => new Grave(x, z));
registerSceneKind('chandelier', (x, z, o) => new Chandelier(x, z, o));
registerSceneKind('chest', (x, z, o) => new Chest(x, z, o));
registerSceneKind('shrine', (x, z, o) => new Shrine(x, z, o));
export { Fixture, burnTick, Falling, Ray, Bolt, ShardBurst, LOCK_COLORS };
