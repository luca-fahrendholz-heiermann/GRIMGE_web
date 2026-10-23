// GRIMGE Prototype — reactive scene objects (user, 23 Oct 2026: "Interaktionen mit Objekten in
// der Map … Setzlinge können zu Bäumen wachsen, wenn Wasserattacken sie lang genug treffen …
// szenenverändernde Events durch Interaktion von Elementen bzw. Attacken und Szenenobjekten
// (vom Spieler gesetzte oder als Teil der Map) … Natura-Zauber legen mit einer Wahrscheinlichkeit
// Setzlinge ab … die Objekte bleiben zerstörbar und haben eine eigene Lebensleiste").
//
// A scene object is a neutral breakable prop (environment.props: every team hits it, it may
// block movement) that FEELS elements: the element tags of every hit (status source), the
// ground under it (puddles, fire, ice, painted pools), rain and element spells passing close by.
//   PLANT    Setzling → Jungbaum → Baum. Water / nature make it grow (light a little), and
//            heal it instead of hurting it. Fire sets it ablaze (a burning tree spreads fire to
//            the ground and its neighbours, water douses it), frost freezes it (no growth,
//            brittle: melee ×1.5), lightning splits a tree and shocks around. A grown tree bears
//            a healing fruit now and then. Cut down, it FALLS in the direction of the last hit
//            (damage along the trunk) and leaves a log; burnt down, only ash remains.
//   LOG      a fallen trunk: low cover that blocks movement, burns well; nature makes it sprout
//            a new seedling.
//   BOULDER  a heavy hit or wind sets it ROLLING (it bowls over everything in its path); fire
//            heats it to glowing stone (burns on contact), water on glowing stone cracks it.
// Nature spells drop a wild seedling with SEED_CHANCE (at most MAX_WILD_SEEDS at a time).
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { getStatusSource } from './status_effects.js';
import { registerSurface, unregisterSurface } from './geometry.js';

export const DEPTH = 150;
export const TAU = Math.PI * 2;
export const SEED_CHANCE = .3;
export const MAX_WILD_SEEDS = 6;
// Tunable at runtime (the test suite turns the random seed drop off for deterministic runs).
export const sceneConfig = { seedChance: SEED_CHANCE };
// Element feed rates (per second) from the surroundings.
const SENSE_RATE = 24; const RAIN_RATE = 3; const SENSE_TICK = .25;
const ELEMENT_OF_GROUND = Object.freeze({ water: 'aqua', scorch: 'ignis', lava: 'ignis', ice: 'frost' });

// Spells are read through a source set by spells.js (no import cycle).
let spellSource = () => [];
export const setSceneSpellSource = (fn) => { spellSource = fn; };
export const sceneSpells = () => spellSource();
export const alive = (a) => a && !a.isDead && a.lifeState !== 'Dead' && (a.hp ?? 1) > 0 && !a.isProp && !a.isStoneWall && !a.isObjective;
export const actorsOf = (gw) => [gw?.player, gw?.enemyChampion, gw?.primal, ...(gw?.minions ?? []), ...(gw?.spells?.getSummons?.() ?? [])].filter(alive);
export const groundDist = (a, x, z) => Math.hypot(a.x - x, ((a.z ?? z) - z) * DEPTH);

// ── crisp pixel helpers ──────────────────────────────────────────────────
export const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
// A filled pixel disc built from rows (no anti-aliased arcs).
export function blob(ctx, cx, cy, r, c, squash = .8) {
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy += 2) { const w = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); ctx.fillRect(Math.round(cx - w), Math.round(cy + dy * squash), w * 2, 2); }
}
export function flames(ctx, x, y, w, t, k = 1) {
  for (let i = 0; i < 4 * k; i++) { const fx = x + ((i * 37) % w) - w / 2; const h = 8 + ((i * 13 + Math.floor(t * 12)) % 9); px(ctx, fx - 2, y - h, 4, h, i % 2 ? '#ff6d00' : '#ffb300'); px(ctx, fx - 1, y - h + 2, 2, 3, '#fff3c4'); }
}

// ── Signals: levers, plates, gongs and pylons switch gates / lifts by key ──
const SIGNALS = new Map();
const now = () => (globalThis.performance?.now?.() ?? Date.now()) / 1000;
export const timeNow = now;
export function setSignal(key, on = true, hold = 0) { if (!key) return; SIGNALS.set(key, { on: !!on, until: hold > 0 ? now() + hold : Infinity }); }
export function signalOn(key) { const s = SIGNALS.get(key); if (!s) return false; if (s.until < now()) { SIGNALS.delete(key); return false; } return s.on; }
export const resetSignals = () => SIGNALS.clear();
// A standable top (landing-only, like spell platforms); heightFn may change over time.
let surfaceId = 1;
export function makeSurface(label, x, z, halfW, halfD, heightFn) {
  const s = { id: `scene_${surfaceId++}`, label, xMin: x - halfW, xMax: x + halfW, zMin: z - halfD, zMax: z + halfD, landingOnly: true, isSceneSurface: true, heightAt: () => Math.max(0, heightFn()) };
  Object.defineProperty(s, 'baseHeight', { get: () => Math.max(0, heightFn()), enumerable: true });
  return s;
}
export const moveSurface = (s, x, z, halfW, halfD) => { s.xMin = x - halfW; s.xMax = x + halfW; s.zMin = z - halfD; s.zMax = z + halfD; };
// Darkness (an extinguished lantern): minions do not pick a hidden target from afar.
export const hideActor = (a, sec = .3) => { a.hiddenUntil = now() + sec; };
export const isHidden = (a) => (a?.hiddenUntil ?? 0) > now();

export class SceneObject {
  constructor(kind, x, z, { hp = 60, half = 14, tol = 120, blocks = true, barColor = '#b0a090' } = {}) {
    this.kind = kind; this.x = x; this.z = z; this.isProp = true; this.isSceneObject = true; this.team = 'neutral';
    this.maxHp = this.hp = hp; this.radius = half; this.hitRadiusX = half; this.halfX = half; this.halfZ = .05; this.noBlock = !blocks;
    this.worldHeight = 0; this.elevation = 0; this.surfaceHeight = 0; this.hitHeightTolerance = tol; this.barColor = barColor;
    this.isDead = false; this.hitFlash = 0; this.shake = 0; this.burning = 0; this.frozen = 0; this.exposure = {}; this.age = 0; this.lastHitDir = 1; this.senseT = 0;
    this.lastSourceTeam = null; this.surfaces = []; this.throwable = false; this.flight = null;
  }
  get y() { return groundYForDepth(this.z); }
  // Surfaces of this object stay registered while it lives (spells.clearRuntime resets the list).
  syncSurfaces(gw) { const bf = gw?.battlefield; if (!bf) return; bf.dynamicSurfaces ??= []; for (const s of this.surfaces) if (!bf.dynamicSurfaces.includes(s)) registerSurface(gw, s); }
  dropSurfaces(gw) { for (const s of this.surfaces) unregisterSurface(gw, s); this.surfaces = []; }
  // Thrown (grab on a throwable object, telekinesis): an arc; the first actor in the way is hit.
  throwBy(thrower, speed = 380) {
    if (!this.throwable || this.flight) return false;
    const dir = thrower.facing || 1; this.flight = { vx: dir * speed, vh: 300, h: 26, team: thrower.team, by: thrower, hit: new Set() }; this.lastHitDir = dir; this.lastSourceTeam = thrower.team;
    return true;
  }
  updateFlight(dt, gw, env) {
    const f = this.flight; f.vh -= 984 * dt; f.h += f.vh * dt; this.x += f.vx * dt;
    for (const a of actorsOf(gw)) {
      if (a.team === f.team || f.hit.has(a) || Math.abs(a.x - this.x) > this.halfX + 14 || Math.abs(((a.z ?? this.z) - this.z) * DEPTH) > 26) continue;
      f.hit.add(a); a.takeDamage(22, Math.sign(f.vx) * 260, 120, .45, false, 'melee'); f.h = Math.min(f.h, 0);
    }
    if (f.h <= 0) { this.flight = null; this.onLand(gw, env); }
  }
  onLand() { this.takeDamage(20, this.lastHitDir * 200, 0, 0, false, 'melee'); combat.spawnDust(this.x, this.y, 6); }
  slow() {}
  takeDamage(amount, kx = 0, lift = 0, stun = 0, crit = false, hitKind = 'melee') {
    if (this.isDead || !(amount > 0)) return { ignored: true };
    const src = getStatusSource(); const els = new Set(src?.statusElements ?? []);
    if (hitKind === 'fire') els.add('ignis');
    if (src?.team) this.lastSourceTeam = src.team;
    if (kx) this.lastHitDir = Math.sign(kx);
    let mult = this.frozen > 0 && hitKind === 'melee' ? 1.5 : 1;
    for (const el of els) { this.feed(el, amount); mult *= this.elementDamage(el); }
    this.onHit(amount, kx, els, hitKind);
    if (amount * mult > 0) { this.hp -= amount * mult; this.hitFlash = .12; this.shake = .25; }
    if (this.hp <= 0) { this.hp = 0; this.isDead = true; }
    return {};
  }
  elementDamage() { return 1; }
  onHit() {}
  feed(el, amount) { if (!(amount > 0)) return; this.exposure[el] = (this.exposure[el] ?? 0) + amount; this.react(el, amount); }
  react() {}
  // Per frame (environment.update): exposure fades, the surroundings feed elements.
  tick(dt, gw, env) {
    this.age += dt; this.hitFlash = Math.max(0, this.hitFlash - dt); this.shake = Math.max(0, this.shake - dt); this.frozen = Math.max(0, this.frozen - dt); this.wet = Math.max(0, (this.wet ?? 0) - dt);
    for (const k of Object.keys(this.exposure)) this.exposure[k] = Math.max(0, this.exposure[k] - dt * 3);
    if ((this.senseT -= dt) <= 0) { this.senseT = SENSE_TICK; this.sense(SENSE_TICK, env); }
    if (this.flight) this.updateFlight(dt, gw, env);
    if (this.surfaces.length) this.syncSurfaces(gw);
    this.update(dt, gw, env);
  }
  sense(dt, env) {
    const fed = new Set();
    for (const e of env.effects) { const el = ELEMENT_OF_GROUND[e.type]; if (!el || !e.contains(this.x, this.z, 6)) continue; fed.add(el); if (e.electrified > 0) fed.add('fulgur'); }
    for (const zone of env.terrain) { if (!zone.contains(this.x, this.z, 6)) continue; if (zone.rules.douses && !env.isFrozen(zone)) fed.add('aqua'); if (zone.rules.fire || zone.burning > 0) fed.add('ignis'); if (zone.electrified > 0) fed.add('fulgur'); }
    for (const s of spellSource()) {
      if (!s || s.isFinished || !s.statusElements || !Number.isFinite(s.x)) continue;
      if (Math.hypot(s.x - this.x, ((s.z ?? this.z) - this.z) * DEPTH) > Math.min(90, s.radius ?? 20) + 34) continue;
      for (const el of s.statusElements) fed.add(el);
      if (s.team) this.lastSourceTeam = s.team;
    }
    for (const el of fed) this.feed(el, SENSE_RATE * dt);
    if (env.map?.weather === 'rain') this.feed('aqua', RAIN_RATE * dt);
  }
  update() {}
  onBreak() {}
  douse(env, r) { this.burning = 0; this.wet = 2.5; env.puff(this.x, this.z, r); for (const e of env.effects) if (e.rules.fire && e.contains(this.x, this.z, this.halfX)) e.life = Math.min(e.life, .2); }
  // Own life bar (and an optional progress bar below it), crisp 2-px pixels.
  renderBars(ctx, top, progress = null, progressColor = '#4fc3f7') {
    const w = 26; const x = Math.round(this.x - w / 2); const y = Math.round(top);
    px(ctx, x - 1, y - 1, w + 2, 4, '#000000'); px(ctx, x, y, w, 2, '#3a2a2a'); px(ctx, x, y, Math.max(0, Math.round(w * this.hp / this.maxHp)), 2, this.barColor);
    if (progress != null && progress > 0) { px(ctx, x - 1, y + 3, w + 2, 3, '#000000'); px(ctx, x, y + 4, Math.round(w * Math.min(1, progress)), 1, progressColor); }
  }
  shadow(ctx, rx = 16) { ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(this.x, this.y, rx, rx * .3, 0, 0, TAU); ctx.fill(); ctx.restore(); }
}

// ── PLANT: Setzling → Jungbaum → Baum ────────────────────────────────────
export const PLANT_STAGES = Object.freeze([
  Object.freeze({ name: 'SETZLING', hp: 30, half: 8, tol: 8, blocks: false, grow: 45 }),
  Object.freeze({ name: 'JUNGBAUM', hp: 90, half: 12, tol: 80, blocks: false, grow: 90 }),
  Object.freeze({ name: 'BAUM', hp: 240, half: 20, tol: 220, blocks: true, grow: 0 })
]);
export class Plant extends SceneObject {
  constructor(x, z, stage = 0, { wild = false, withered = false, branches = null } = {}) {
    super('plant', x, z, { barColor: '#9be36a' });
    this.stage = -1; this.growth = 0; this.wild = wild; this.withered = withered; this.branchSpec = branches; this.fruitT = 10; this.growFlash = 0; this.sway = 0; this.spreadT = 0;
    this.setStage(stage);
  }
  setStage(i) {
    const st = PLANT_STAGES[i]; const k = this.stage < 0 ? 1 : this.hp / this.maxHp;
    this.stage = i; this.maxHp = Math.round(st.hp * (this.hpMult ?? 1)); this.hp = Math.max(1, Math.round(this.maxHp * Math.max(k, .6)));
    this.halfX = this.hitRadiusX = this.radius = st.half; this.hitHeightTolerance = st.tol; this.noBlock = !st.blocks;
    // A grown tree: its branches (and its crown) are landing platforms that grow out within 0.6 s.
    if (i === 2 && !this.surfaces.length) {
      const fresh = this.stage >= 0 && this.age > 0; this.grownAt = fresh ? this.age : -1;
      const spec = this.branchSpec ?? [[-34, 70, 24], [34, 118, 24], [0, 165, 30]];
      this.surfaces = spec.map(([dx, h, w]) => makeSurface('Tree branch', this.x + dx, this.z, w, .07, () => (this.isDead ? 0 : h * Math.min(1, (this.age - this.grownAt) / .6))));
    }
  }
  get label() { return PLANT_STAGES[this.stage].name; }
  // Water and nature feed a plant instead of hurting it; fire bites harder.
  elementDamage(el) { return el === 'aqua' || el === 'natura' ? 0 : el === 'ignis' ? 1.5 : 1; }
  react(el, amount) {
    if (el === 'aqua' && this.burning > 0) { this.burning = 0; this.doused = true; }
    if (el === 'aqua' || el === 'natura' || el === 'lux') {
      if (this.frozen > 0 || this.burning > 0) return;
      if (el !== 'lux') this.hp = Math.min(this.maxHp, this.hp + amount * .3);
      this.growth += amount * (el === 'natura' ? 1.4 : el === 'lux' ? .35 : 1);
      const need = PLANT_STAGES[this.stage].grow * (this.withered ? 2 : 1);
      if (need && this.growth >= need) {
        this.growth = 0; this.withered = false; this.setStage(this.stage + 1); this.growFlash = .7;
        combat.spawnShockwave(this.x, this.y - 10 - this.stage * 20, 24 + this.stage * 22, '#9be36a');
        combat.spawnDamageText?.(this.x, this.y - 40 - this.stage * 50, `${this.label}!`, { color: '#9be36a' });
        audio.playImpact?.(false);
      }
    }
    if (el === 'ignis' && this.burning <= 0 && this.frozen <= 0 && !(this.wet > 0) && (this.exposure.ignis ?? 0) >= 6) { this.burning = 4 + this.stage * 2; this.doused = false; }
    if (el === 'frost') { this.frozen = 4; this.burning = 0; }
    if (el === 'fulgur' && this.stage === 2 && !this.split && (this.exposure.fulgur ?? 0) >= 8) { this.split = true; this.pendingShock = true; this.hp = Math.max(1, this.hp - this.maxHp * .45); this.hitFlash = .3; }
    if (el === 'ventus') this.sway = 1;
  }
  update(dt, gw, env) {
    this.growFlash = Math.max(0, this.growFlash - dt); this.sway = Math.max(0, this.sway - dt * 1.2);
    if (this.doused) { this.doused = false; this.douse(env, 30 + this.stage * 14); }
    if (this.burning > 0) {
      this.burning -= dt; this.hp -= dt * (5 + this.stage * 7);
      if (Math.random() < .5) combat.spawnElementalParticles(this.x + (Math.random() - .5) * 20 * (this.stage + 1), this.y - 10 - this.stage * 50 * Math.random(), 'ignis', 1);
      if ((this.spreadT -= dt) <= 0) {
        this.spreadT = .8;
        // A burning tree sets the ground and its neighbours alight (wind spreads it further).
        if (this.stage === 2) env.add('scorch', this.x, this.z, { radius: 44 });
        for (const o of env.props) if (o !== this && o.isSceneObject && !o.isDead && groundDist(o, this.x, this.z) < 70 + this.stage * 20) o.feed('ignis', 4);
      }
      if (this.hp <= 0) { this.hp = 0; this.isDead = true; this.burnt = true; }
    }
    // Lightning split: the charge jumps into everyone close to the trunk.
    if (this.pendingShock) {
      this.pendingShock = false;
      combat.spawnShockwave(this.x, this.y - 90, 60, '#ffee58');
      for (const a of actorsOf(gw)) if (groundDist(a, this.x, this.z) < 85 && (a.team !== this.lastSourceTeam || !this.lastSourceTeam)) { a.takeDamage(22, Math.sign(a.x - this.x || 1) * 160, 80, .35, false, 'spell'); combat.spawnHitSparks(a.x, (a.y ?? this.y) - 20, 1, '#ffee58', 6); }
    }
    // A grown, healthy tree bears a healing fruit now and then.
    if (this.stage === 2 && this.burning <= 0 && this.frozen <= 0 && gw?.modeState?.potions) {
      if ((this.fruitT -= dt) <= 0) {
        this.fruitT = 14;
        if (!gw.modeState.potions.some((p) => p.fromTree === this)) gw.modeState.potions.push({ x: this.x + this.lastHitDir * 26, z: Math.min(.95, this.z + .05), kind: 'hp', life: 15, fromTree: this });
      }
    }
  }
  onBreak(gw, env) {
    this.dropSurfaces(gw);
    if (this.burnt || this.burning > 0) { env.puff(this.x, this.z, 30 + this.stage * 16); combat.spawnDust(this.x, this.y, 6); return; }
    combat.spawnHitSparks(this.x, this.y - 10, 1, '#7cb342', 10);
    if (this.stage === 2) env.addSceneFx(new FallingTree(this, this.lastHitDir || 1, gw));
  }
  render(ctx) {
    const t = this.age; const x = Math.round(this.x + (this.shake > 0 ? Math.sin(t * 80) * 1.5 : 0)); const y = Math.round(this.y);
    const ice = this.frozen > 0; const fire = this.burning > 0;
    const leaf = ice ? ['#4f8fa8', '#81d4fa', '#e1f5fe'] : fire ? ['#3e2a14', '#6d4c2a', '#ff9800'] : this.withered ? ['#5d4a2a', '#8a7040', '#b8a060'] : ['#2e6b22', '#4c9a35', '#a5d66f'];
    const bark = ['#3e2723', '#6d4c41', '#8d6e63'];
    const sway = Math.round(Math.sin(t * 6) * 3 * this.sway);
    this.shadow(ctx, 8 + this.stage * 10);
    px(ctx, x - 6 - this.stage * 3, y - 2, 12 + this.stage * 6, 3, '#4e342e');
    if (this.stage === 0) {
      px(ctx, x - 1, y - 12, 2, 10, leaf[0]);
      px(ctx, x - 6, y - 14, 5, 3, leaf[1]); px(ctx, x + 1, y - 16, 5, 3, leaf[1]); px(ctx, x - 5, y - 14, 2, 1, leaf[2]); px(ctx, x + 2, y - 16, 2, 1, leaf[2]);
    } else if (this.stage === 1) {
      px(ctx, x - 2, y - 30, 4, 28, bark[0]); px(ctx, x - 1, y - 30, 2, 28, bark[1]);
      blob(ctx, x + sway, y - 38, 12, leaf[0]); blob(ctx, x - 3 + sway, y - 41, 9, leaf[1]); blob(ctx, x - 5 + sway, y - 44, 4, leaf[2]);
    } else {
      px(ctx, x - 6, y - 74, 12, 72, bark[0]); px(ctx, x - 4, y - 74, 8, 72, bark[1]); px(ctx, x - 3, y - 70, 2, 60, bark[2]);
      px(ctx, x - 14, y - 4, 8, 4, bark[0]); px(ctx, x + 6, y - 4, 8, 4, bark[0]);
      if (this.split) { px(ctx, x - 1, y - 74, 2, 50, '#1b1b1b'); px(ctx, x + 1, y - 60, 1, 30, '#ffee58'); }
      blob(ctx, x - 20 + sway, y - 82, 22, leaf[0]); blob(ctx, x + 20 + sway, y - 80, 22, leaf[0]); blob(ctx, x + sway, y - 100, 28, leaf[0]);
      blob(ctx, x - 16 + sway, y - 88, 15, leaf[1]); blob(ctx, x + 16 + sway, y - 86, 15, leaf[1]); blob(ctx, x - 2 + sway, y - 106, 19, leaf[1]);
      blob(ctx, x - 10 + sway, y - 112, 7, leaf[2]); blob(ctx, x + 14 + sway, y - 94, 5, leaf[2]);
      if (!fire && !ice && this.fruitT < 5) for (const [fx, fy] of [[-14, -78], [10, -92], [22, -76]]) { px(ctx, x + fx + sway, y + fy, 4, 4, '#c62828'); px(ctx, x + fx + 1 + sway, y + fy, 1, 1, '#ffcdd2'); }
    }
    if (ice) { ctx.save(); ctx.globalAlpha = .35; px(ctx, x - 8 - this.stage * 18, y - 18 - this.stage * 56, 16 + this.stage * 36, 16 + this.stage * 56, '#b3e5fc'); ctx.restore(); }
    if (fire) flames(ctx, x, y - (this.stage === 2 ? 96 : this.stage === 1 ? 36 : 10), 16 + this.stage * 22, t, 1 + this.stage);
    if (this.growFlash > 0) { ctx.save(); ctx.globalAlpha = this.growFlash; px(ctx, x - 1, y - 20 - this.stage * 70, 2, 20 + this.stage * 60, '#e6ff9a'); ctx.restore(); }
    if (this.hitFlash > 0) { ctx.save(); ctx.globalAlpha = .45; px(ctx, x - 6 - this.stage * 14, y - 16 - this.stage * 60, 12 + this.stage * 28, 16 + this.stage * 60, '#ffffff'); ctx.restore(); }
    const need = PLANT_STAGES[this.stage].grow * (this.withered ? 2 : 1);
    if (this.stage === 2) for (const s of this.surfaces) { const h = s.heightAt(); if (h > 4) { px(ctx, s.xMin, y - h, s.xMax - s.xMin, 4, '#5d4037'); px(ctx, s.xMin + 2, y - h - 3, s.xMax - s.xMin - 4, 3, leaf[1]); } }
    this.renderBars(ctx, y - [24, 58, 136][this.stage], need ? this.growth / need : null);
  }
}

// A cut-down tree falling in the direction of the last hit (not a target; drawn in the actor list).
export class FallingTree {
  constructor(tree, dir, gw) { this.x = tree.x; this.z = tree.z; this.dir = dir; this.t = 0; this.dur = .6; this.done = false; this.gw = gw; this.isFinished = false; }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw, env) {
    this.t += dt;
    if (!this.done && this.t >= this.dur) {
      this.done = true;
      combat.shakeCamera(9, .28); combat.spawnDust(this.x + this.dir * 80, this.y, 12); audio.playImpact?.(true);
      for (const a of actorsOf(gw)) { const dx = (a.x - this.x) * this.dir; if (dx > 0 && dx < 175 && Math.abs(((a.z ?? this.z) - this.z) * DEPTH) < 28 && (a.elevation ?? 0) < 60) a.takeDamage(40, this.dir * 200, 160, .6, false, 'spell'); }
      for (const o of env.props) if (o.isSceneObject && !o.isDead && o.kind !== 'plant') { const dx = (o.x - this.x) * this.dir; if (dx > 0 && dx < 175 && Math.abs((o.z - this.z) * DEPTH) < 28) o.takeDamage(30, this.dir * 200, 0, 0, false, 'spell'); }
      env.props.push(new Log(this.x + this.dir * 82, this.z));
    }
    if (this.t >= this.dur + .05) this.isFinished = true;
  }
  render(ctx) {
    const a = Math.min(1, this.t / this.dur) ** 2 * Math.PI / 2 * this.dir;
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y)); ctx.rotate(a);
    px(ctx, -6, -74, 12, 72, '#3e2723'); px(ctx, -4, -74, 8, 72, '#6d4c41');
    blob(ctx, -18, -82, 20, '#2e6b22'); blob(ctx, 18, -80, 20, '#2e6b22'); blob(ctx, 0, -100, 26, '#2e6b22'); blob(ctx, -2, -104, 17, '#4c9a35');
    ctx.restore();
  }
}

// ── LOG: low cover; burns well; nature makes it sprout ──────────────────
export class Log extends SceneObject {
  constructor(x, z) { super('log', x, z, { hp: 80, half: 58, tol: 40, blocks: true, barColor: '#a1887f' }); this.sprouted = false; }
  elementDamage(el) { return el === 'ignis' ? 2 : el === 'aqua' || el === 'natura' ? 0 : 1; }
  react(el) {
    if (el === 'ignis' && this.burning <= 0 && !(this.wet > 0) && (this.exposure.ignis ?? 0) >= 5) this.burning = 6;
    if (el === 'aqua' && this.burning > 0) { this.burning = 0; this.doused = true; }
    if (el === 'natura' && !this.sprouted && (this.exposure.natura ?? 0) >= 30) this.sprouted = 'pending';
  }
  update(dt, gw, env) {
    if (this.doused) { this.doused = false; this.douse(env, 50); }
    if (this.sprouted === 'pending') { this.sprouted = true; env.props.push(new Plant(this.x + 40, Math.min(.95, this.z + .06), 0, { wild: true })); combat.spawnShockwave(this.x + 40, this.y - 8, 24, '#9be36a'); }
    if (this.burning > 0) { this.burning -= dt; this.hp -= dt * 12; if (Math.random() < .6) combat.spawnElementalParticles(this.x + (Math.random() - .5) * 100, this.y - 14, 'ignis', 1); if (this.hp <= 0) { this.hp = 0; this.isDead = true; this.burnt = true; } }
  }
  onBreak(gw, env) { combat.spawnDust(this.x, this.y, 10); if (this.burnt) env.puff(this.x, this.z, 50); else env.add('rubble', this.x, this.z, { radius: 40, life: 3 }); }
  render(ctx) {
    const x = Math.round(this.x + (this.shake > 0 ? Math.sin(this.age * 80) * 1.5 : 0)); const y = Math.round(this.y); const burnt = this.burning > 0;
    this.shadow(ctx, 60);
    px(ctx, x - 58, y - 16, 116, 14, '#3e2723'); px(ctx, x - 56, y - 15, 112, 11, burnt ? '#4e342e' : '#6d4c41'); px(ctx, x - 54, y - 14, 108, 2, '#8d6e63');
    for (const ex of [-58, 50]) { px(ctx, x + ex, y - 16, 8, 14, '#a1887f'); px(ctx, x + ex + 2, y - 12, 4, 6, '#6d4c41'); }
    if (this.sprouted) { px(ctx, x + 10, y - 22, 2, 6, '#4c9a35'); px(ctx, x + 6, y - 24, 4, 2, '#7cb342'); }
    if (burnt) flames(ctx, x, y - 14, 100, this.age, 3);
    if (this.hitFlash > 0) { ctx.save(); ctx.globalAlpha = .45; px(ctx, x - 58, y - 16, 116, 14, '#ffffff'); ctx.restore(); }
    this.renderBars(ctx, y - 28);
  }
}

// ── BOULDER: rolls on heavy hits and wind; fire makes it glow, water cracks glowing stone ──
export class Boulder extends SceneObject {
  constructor(x, z) { super('boulder', x, z, { hp: 160, half: 18, tol: 60, blocks: true, barColor: '#bdbdbd' }); this.vx = 0; this.roll = 0; this.hot = 0; this.rolled = new Set(); this.throwable = true; this.heavy = true; }
  elementDamage(el) { return el === 'ventus' ? .3 : 1; }
  onHit(amount, kx, els) { if (Math.abs(kx) >= 300 || els.has('ventus')) this.startRoll(Math.sign(kx) || this.lastHitDir); }
  startRoll(dir) { if (Math.abs(this.vx) > 60) return; this.vx = dir * 330; this.rolled.clear(); }
  react(el, amount) {
    if (el === 'ignis' && (this.exposure.ignis ?? 0) >= 40) this.hot = 8;
    if (el === 'aqua' && this.hot > 0) { this.hot = 0; this.cracked = 'pending'; }
    if (el === 'terra') this.hp = Math.min(this.maxHp, this.hp + amount * .3);
    if (el === 'ventus' && amount > 3) this.startRoll(this.lastHitDir);
  }
  update(dt, gw, env) {
    if (this.cracked === 'pending') { this.cracked = true; env.puff(this.x, this.z, 40); this.hp -= 60; this.hitFlash = .3; if (this.hp <= 0) { this.hp = 0; this.isDead = true; } }
    if (this.hot > 0) {
      this.hot -= dt;
      if ((this.hotTick = (this.hotTick ?? 0) - dt) <= 0) { this.hotTick = .5; for (const a of actorsOf(gw)) if (groundDist(a, this.x, this.z) < this.halfX + 16 && (a.elevation ?? 0) < 30) a.takeDamage(5, 0, 0, .05, false, 'fire'); }
    }
    if (Math.abs(this.vx) > 1) {
      const b = gw?.battlefield?.boundsOverride ?? gw?.battlefield?.playableBounds ?? { left: 30, right: 994 };
      this.x += this.vx * dt; this.roll += this.vx * dt / this.halfX;
      this.vx -= Math.sign(this.vx) * 170 * dt; if (Math.abs(this.vx) < 40) this.vx = 0;
      if (this.x < (b.left ?? 30) + this.halfX || this.x > (b.right ?? 994) - this.halfX) { this.x = Math.max((b.left ?? 30) + this.halfX, Math.min((b.right ?? 994) - this.halfX, this.x)); this.vx = 0; combat.shakeCamera(5, .15); }
      for (const a of actorsOf(gw)) {
        if (this.rolled.has(a) || Math.abs(a.x - this.x) > this.halfX + 12 || Math.abs(((a.z ?? this.z) - this.z) * DEPTH) > 26 || (a.elevation ?? 0) > 40) continue;
        this.rolled.add(a); a.takeDamage(28, Math.sign(this.vx) * 300, 140, .5, false, 'spell'); combat.spawnDust(a.x, a.y ?? this.y, 5);
      }
      for (const o of env.props) {
        if (o === this || o.isDead || this.rolled.has(o) || Math.abs(o.x - this.x) > this.halfX + o.halfX || Math.abs(o.z - this.z) > .08) continue;
        this.rolled.add(o); o.takeDamage(40, Math.sign(this.vx) * 300, 0, 0, false, 'spell'); this.vx *= .3; combat.shakeCamera(4, .12);
      }
      if (Math.random() < .3) combat.spawnDust(this.x - Math.sign(this.vx) * 14, this.y, 1);
    }
  }
  onBreak(gw, env) { combat.spawnHitSparks(this.x, this.y - 16, 1, '#9e9e9e', 14); combat.spawnDust(this.x, this.y, 10); env.add('rubble', this.x, this.z, { radius: 34, life: 5 }); audio.playImpact?.(true); }
  render(ctx) {
    const x = Math.round(this.x + (this.shake > 0 ? Math.sin(this.age * 80) * 1.5 : 0)); const y = Math.round(this.y);
    const glow = this.hot > 0; const q = ((Math.round(this.roll / (Math.PI / 2)) % 4) + 4) % 4;
    this.shadow(ctx, 20);
    blob(ctx, x, y - 16, 18, '#424242', .85); blob(ctx, x - 1, y - 17, 16, glow ? '#8d3a1a' : '#757575', .85); blob(ctx, x - 5, y - 21, 8, glow ? '#ff7043' : '#9e9e9e', .85);
    // Rolling: the crack pattern turns in quarter steps (stays pixel crisp).
    const cracks = [[[-8, -12], [2, -20], [10, -14]], [[6, -26], [0, -16], [8, -6]], [[-10, -18], [-2, -10], [10, -16]], [[-4, -28], [-8, -16], [-2, -6]]][q];
    for (const [cx, cy] of cracks) px(ctx, x + cx, y + cy, 3, 2, glow ? '#ffd54f' : '#424242');
    if (this.cracked) { px(ctx, x - 1, y - 32, 2, 26, '#212121'); px(ctx, x + 1, y - 22, 6, 2, '#212121'); }
    if (this.hitFlash > 0) { ctx.save(); ctx.globalAlpha = .45; blob(ctx, x, y - 16, 18, '#ffffff', .85); ctx.restore(); }
    this.renderBars(ctx, y - 42);
  }
}

// Map / editor kinds → objects.
export const SCENE_KINDS = {
  seedling: (x, z) => new Plant(x, z, 0), sapling: (x, z) => new Plant(x, z, 1), tree: (x, z) => new Plant(x, z, 2),
  withered_seedling: (x, z, o) => new Plant(x, z, 0, { withered: true, ...o }),
  log: (x, z) => new Log(x, z), boulder: (x, z) => new Boulder(x, z)
};
export function registerSceneKind(kind, factory) { SCENE_KINDS[kind] = factory; }
export const isSceneKind = (kind) => Object.prototype.hasOwnProperty.call(SCENE_KINDS, kind);

// Casts may leave objects behind (user, 23 Oct 2026: "Runen setzen Objekte"): nature → seedling,
// light → lantern, earth → stalagmite; each kind has its own cap, all share sceneConfig.seedChance.
const CAST_DROPS = [['natura', 'seedling', 1, MAX_WILD_SEEDS], ['lux', 'lantern', .6, 3], ['terra', 'stalagmite', .6, 3]];
export function dropFromCast(env, caster, target, elements, roll = Math.random()) {
  const out = [];
  for (const [i, [el, kind, k, cap]] of CAST_DROPS.entries()) {
    if (!elements?.includes(el) || !SCENE_KINDS[kind]) continue;
    if (el === 'natura') { const p = plantFromNature(env, caster, target, roll); if (p) out.push(p); continue; }
    if (roll >= sceneConfig.seedChance * k || env.props.filter((o) => o.kind === kind && o.wild && !o.isDead).length >= cap) continue;
    const f = caster.facing || 1; const x = (Number.isFinite(target?.x) ? target.x : caster.x + f * 80) + f * (24 + i * 30); const z = Math.max(.08, Math.min(.92, Number.isFinite(target?.z) ? target.z : caster.z ?? .5));
    if (env.props.some((o) => !o.isDead && Math.hypot(o.x - x, (o.z - z) * DEPTH) < 26)) continue;
    const o = SCENE_KINDS[kind](x, z, {}); o.wild = true; env.props.push(o); out.push(o);
  }
  return out;
}
// Nature spells may drop a wild seedling at the target point (or in front of the caster).
export function plantFromNature(env, caster, target = null, roll = Math.random()) {
  if (!env || !caster || roll >= sceneConfig.seedChance || !Number.isFinite(caster.x)) return null;
  if (env.props.filter((o) => o.kind === 'plant' && o.wild && !o.isDead).length >= MAX_WILD_SEEDS) return null;
  const f = caster.facing || 1;
  let x = Number.isFinite(target?.x) ? target.x : caster.x + f * 90; let z = Number.isFinite(target?.z) ? target.z : (caster.z ?? .5);
  x += (Math.random() - .5) * 30; z = Math.max(.08, Math.min(.92, z + (Math.random() - .5) * .1));
  for (let i = 0; i < 4 && env.props.some((o) => !o.isDead && Math.hypot(o.x - x, (o.z - z) * DEPTH) < 28); i++) x += f * 30;
  const plant = new Plant(x, z, 0, { wild: true });
  env.props.push(plant);
  combat.spawnHitSparks?.(x, groundYForDepth(z) - 8, 1, '#9be36a', 6);
  return plant;
}
