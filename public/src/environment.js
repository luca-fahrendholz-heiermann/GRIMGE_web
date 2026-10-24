// GRIMGE Prototype — environment layer: what spells leave on the battlefield.
//
// Ground effects are real gameplay surfaces, not decals:
//   ice      slippery: actors brake and turn slowly (player) / are slowed (AI)
//   scorch   burning ground: short damage over time to the other team
//   lava     molten pool: stronger damage over time
//   crater   / crack / rubble: rough ground that slows movement
//   water    a puddle left by melted ice; conducts lightning, puts out fire
//   hole     a burrow exit (visual)
//   smoke    rises from doused fire / steam (visual, wind clears it)
// Elements react: fire melts ice into water, ice or water douse fire (smoke),
// ice on lava cools it into a crater with steam, lightning electrifies water,
// wind blows smoke away and spreads burning ground.
//
// Maps add permanent painted TERRAIN (water, mana, ice, lava, sand, hay,
// crater) that follows the same rules: lightning shocks everyone in a pool,
// ice spells freeze a pool over, fire melts ice fields, ice cools lava, fire
// sets hay ablaze. Maps also bring weather and ambient events (storm
// lightning into puddles, wind gusts).
//
// Breakable props: wooden crates (may drop a potion) and oil barrels (burst
// into flame). Every melee hit and spell reaches them through the normal
// hostile-target list; they also block movement like a small wall.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { getGroundProjection, groundYForDepth } from './world.js';
import { drawFx, fxReady } from './fx_sprites.js';
import { applyStatus } from './status_effects.js';
import { SCENE_KINDS, isSceneKind, resetSignals } from './scene_objects.js';
import './scene_pack_elements.js'; // element objects (vine, mushrooms, kegs, pylons …)
import './scene_pack_puzzles.js'; // traversal / puzzle pieces (lianas, geysers, gates, plates …)
import { renderSceneHint } from './scene_systems.js';
import { BUFF_ZONES } from './zone_buffs.js';

export const GROUND_EFFECTS = Object.freeze({
  ice: Object.freeze({ life: 7, slow: null, slippery: true }),
  scorch: Object.freeze({ life: 4.5, dps: 6, fire: true }),
  lava: Object.freeze({ life: 5, dps: 14, fire: true }),
  crater: Object.freeze({ life: 9, slow: .72 }),
  crack: Object.freeze({ life: 7, slow: .82 }),
  rubble: Object.freeze({ life: 6, slow: .78 }),
  water: Object.freeze({ life: 8 }),
  hole: Object.freeze({ life: 6 }),
  blood: Object.freeze({ life: 10 }),   // blood puddles (S90 Blutschirm arrows) — the twin dragons rise from them
  smoke: Object.freeze({ life: 2.4 })
});

// Permanent terrain painted into a map.
export const TERRAIN_RULES = Object.freeze({
  water: Object.freeze({ conducts: true, freezes: true, douses: true }),
  mana: Object.freeze({ conducts: true, freezes: true, douses: true, manaRegen: 8 }),
  ice: Object.freeze({ slippery: true, melts: true }),
  lava: Object.freeze({ dps: 14, fire: true, cools: true }),
  sand: Object.freeze({ slow: .7 }),
  crater: Object.freeze({ slow: .72 }),
  hay: Object.freeze({ flammable: true })
});

const MAX_EFFECTS = 48;
const TICK = .5;

const zDepthPx = () => { const p = getGroundProjection(); return p.nearY - p.farY; };

// Shared shape test: circle (radius in ground px, z scaled by 150),
// ellipse (rx in px, rz in z units) or rect (hx px, hz z units).
function shapeContains(shape, x, z, pad = 0) {
  const dx = x - shape.x; const dz = z - shape.z;
  if (shape.shape === 'ellipse') return (dx / (shape.rx + pad)) ** 2 + (dz / (shape.rz + pad / 150)) ** 2 <= 1;
  if (shape.shape === 'rect') return Math.abs(dx) <= shape.hx + pad && Math.abs(dz) <= shape.hz + pad / 150;
  return Math.hypot(dx, dz * 150) <= shape.radius + pad;
}

function shapeExtentX(shape) { return shape.shape === 'ellipse' ? shape.rx : shape.shape === 'rect' ? shape.hx : shape.radius; }

class GroundEffect {
  constructor(type, x, z, { radius = 50, team = null, life = null, angle = 0, shape = 'circle', rx, rz, hx, hz } = {}) {
    this.type = type; this.x = x; this.z = z; this.radius = radius; this.team = team;
    this.shape = shape; this.rx = rx; this.rz = rz; this.hx = hx; this.hz = hz;
    this.maxLife = life ?? GROUND_EFFECTS[type].life; this.life = this.maxLife;
    this.angle = angle; this.seed = Math.random() * 1000; this.electrified = 0; this.age = 0;
  }
  get rules() { return GROUND_EFFECTS[this.type]; }
  get fade() { return Math.max(0, Math.min(1, this.life / Math.min(1.2, this.maxLife * .4))); }
  contains(x, z, pad = 0) { return shapeContains(this, x, z, pad); }
  overlaps(other, k = .6) {
    if (this.shape !== 'circle' || other.shape !== 'circle') return shapeContains(this, other.x, other.z, shapeExtentX(other) * k);
    return Math.hypot(other.x - this.x, (other.z - this.z) * 150) <= (this.radius + other.radius) * k;
  }
}

class TerrainZone {
  constructor(zone) {
    Object.assign(this, zone);
    this.radius = shapeExtentX(zone);
    this.electrified = 0; this.burning = 0; this.burnt = 0; this.burnTick = 0; this.seed = Math.random() * 1000;
  }
  get rules() { return TERRAIN_RULES[this.type] ?? {}; }
  contains(x, z, pad = 0) { return shapeContains(this, x, z, pad); }
}

export class BreakableProp {
  constructor(kind, x, z) {
    this.kind = kind; this.x = x; this.z = z;
    this.isProp = true; this.team = 'neutral';
    this.maxHp = this.hp = kind === 'barrel' ? 40 : 60;
    this.radius = 16; this.hitRadiusX = 16; this.halfX = 16; this.halfZ = .05;
    this.worldHeight = 0; this.elevation = 0; this.surfaceHeight = 0; this.hitHeightTolerance = 120;
    this.isDead = false; this.hitFlash = 0; this.shake = 0; this.burning = 0;
  }
  get y() { return groundYForDepth(this.z); }
  takeDamage(amount, kx = 0, lift = 0, stun = 0, isCrit = false, hitKind = 'melee') {
    if (this.isDead || !(amount > 0)) return;
    this.hp -= amount; this.hitFlash = .12; this.shake = .25;
    // Oil barrels catch fire from spells and burst shortly after.
    if (this.kind === 'barrel' && hitKind === 'spell') this.burning = Math.max(this.burning, .01);
    if (this.hp <= 0) this.isDead = true;
  }
  slow() {}
}

export class EnvironmentSystem {
  constructor() {
    this.effects = [];
    this.props = [];
    this.terrain = [];
    this.transient = [];
    this.sceneFx = []; // scene-object animations that are no targets (a falling tree)
    this.map = null;
    this.tickTimer = 0;
    this.ambientTimer = 7;
    this.gustTimer = 11;
    this.strike = null;
    this.time = 0;
    // Set by the active sky sphere (sky.js): { fireLife, iceLife, shockMult, waterSlow }.
    this.skyMods = null;
  }

  clear() {
    this.effects = []; this.props = []; this.terrain = []; this.transient = []; this.sceneFx = []; this.map = null; resetSignals(); for (const z of [...BUFF_ZONES]) if (z.isSceneZone) BUFF_ZONES.delete(z); // shrine zones end with the match
    this.tickTimer = 0; this.ambientTimer = 7; this.gustTimer = 11; this.strike = null;
  }

  // A Training map's painted terrain, weather and ambient events.
  setMap(map, worldZones = []) {
    this.map = map ?? null;
    this.terrain = worldZones.map((zone) => new TerrainZone(zone));
    this.ambientTimer = 6 + Math.random() * 3;
    this.gustTimer = 9 + Math.random() * 4;
    this.strike = null;
  }

  effectsAt(x, z, type = null) {
    return this.effects.filter((effect) => (!type || effect.type === type) && effect.contains(x, z));
  }

  terrainAt(x, z, pad = 0) { return this.terrain.filter((zone) => zone.contains(x, z, pad)); }

  spawnFx(name, x, z, { duration = .45, scale = 2, height = 0, anchor = 'bottom' } = {}) {
    this.transient.push({ name, x, z, t: 0, duration, scale, height, anchor });
  }

  // ── adding effects (with element reactions) ──────────────────────────
  add(type, x, z, options = {}) {
    if (!GROUND_EFFECTS[type]) return null;
    const effect = new GroundEffect(type, x, z, options);
    if (effect.rules.fire && this.map?.fireLifeMult) effect.maxLife = effect.life = effect.life * this.map.fireLifeMult;
    const sky = this.skyMods;
    if (sky?.fireLife && effect.rules.fire) effect.maxLife = effect.life = effect.life * sky.fireLife;
    if (sky?.iceLife && type === 'ice') effect.maxLife = effect.life = effect.life * sky.iceLife;
    if (!this.react(effect)) return null;
    // Same-type overlaps refresh instead of stacking endlessly.
    const twin = this.effects.find((other) => other.type === type && other.shape === 'circle' && effect.shape === 'circle' && other.overlaps(effect, .45));
    if (twin) {
      twin.life = Math.max(twin.life, effect.life);
      twin.maxLife = Math.max(twin.maxLife, effect.maxLife);
      twin.radius = Math.min(twin.radius * 1.06 + 2, Math.max(twin.radius, effect.radius) * 1.4);
      twin.team = effect.team ?? twin.team;
      return twin;
    }
    this.effects.push(effect);
    if (this.effects.length > MAX_EFFECTS) {
      const disposable = this.effects.findIndex((e) => e.type === 'smoke' || e.type === 'hole');
      this.effects.splice(disposable >= 0 ? disposable : 0, 1);
    }
    if (type === 'ice' && fxReady('fx_ice')) this.spawnFx('fx_ice', x, z, { duration: .5, scale: 1.5 });
    return effect;
  }

  // Returns false if the new effect is consumed by a reaction.
  react(effect) {
    const touching = (types) => this.effects.filter((other) => types.includes(other.type) && other.overlaps(effect));
    const terrainTouching = (types) => this.terrain.filter((zone) => types.includes(zone.type) && zone.contains(effect.x, effect.z, shapeExtentX(effect) * .6));
    const isFire = effect.rules.fire;
    if (isFire) {
      // Fire melts ice into water; water douses the fire.
      for (const ice of touching(['ice'])) this.transform(ice, 'water');
      // Painted ice fields melt locally into a puddle.
      for (const field of terrainTouching(['ice'])) {
        if (!this.effects.some((e) => e.type === 'water' && e.contains(effect.x, effect.z))) this.effects.push(new GroundEffect('water', effect.x, effect.z, { radius: shapeExtentX(effect) * 1.2 }));
        void field;
      }
      // Dry hay catches fire.
      for (const hay of terrainTouching(['hay'])) if (!hay.burning && !hay.burnt) { hay.burning = 3.5; hay.burnt = 25; }
      const wet = touching(['water']);
      const wetTerrain = terrainTouching(['water', 'mana']);
      if (wet.length || wetTerrain.length) {
        for (const puddle of wet) puddle.life = Math.min(puddle.life, 1.2);
        this.puff(effect.x, effect.z, shapeExtentX(effect));
        if (effect.type !== 'lava') return false;
        this.transform(effect, 'crater');
      }
    }
    if (effect.type === 'ice') {
      for (const fire of touching(['scorch'])) { fire.life = 0; this.puff(fire.x, fire.z, fire.radius); }
      for (const pool of touching(['lava'])) { this.transform(pool, 'crater'); this.puff(pool.x, pool.z, pool.radius); }
      for (const puddle of touching(['water'])) { this.transform(puddle, 'ice'); puddle.radius = Math.max(puddle.radius, effect.radius); }
      // Painted pools freeze over completely; painted lava cools locally.
      for (const pool of terrainTouching(['water', 'mana'])) {
        if (this.effects.some((e) => e.type === 'ice' && e.frozenPool === pool)) continue;
        const cover = new GroundEffect('ice', pool.x, pool.z, { shape: pool.shape, rx: pool.rx, rz: pool.rz, hx: pool.hx, hz: pool.hz, radius: pool.radius, team: effect.team, life: 9 });
        cover.frozenPool = pool;
        this.effects.push(cover);
      }
      for (const lava of terrainTouching(['lava'])) {
        this.effects.push(new GroundEffect('crater', effect.x, effect.z, { radius: Math.min(shapeExtentX(effect), lava.radius), life: 8 }));
        this.puff(effect.x, effect.z, shapeExtentX(effect));
      }
    }
    if (effect.type === 'water') for (const fire of touching(['scorch', 'lava'])) { fire.life = Math.min(fire.life, .3); this.puff(fire.x, fire.z, fire.radius); }
    return true;
  }

  transform(effect, type) {
    effect.type = type;
    effect.maxLife = effect.life = GROUND_EFFECTS[type].life;
  }

  puff(x, z, radius) {
    this.effects.push(new GroundEffect('smoke', x, z, { radius: Math.max(30, radius * .8) }));
    audio.playImpact?.(false);
  }

  // Lightning on a puddle or painted pool electrifies it: everyone standing
  // in it is shocked (team = the caster's team; null = neutral storm).
  electrify(x, z, radius, team, damage, gameWorld) {
    let shocked = false;
    damage *= this.skyMods?.shockMult ?? 1;
    const pools = [
      ...this.effects.filter((e) => e.type === 'water' && (e.shape !== 'circle' ? e.contains(x, z, radius) : Math.hypot(x - e.x, (z - e.z) * 150) <= e.radius + radius)),
      ...this.terrain.filter((zone) => zone.rules.conducts && zone.contains(x, z, radius) && !this.isFrozen(zone))
    ];
    const hit = new Set();
    for (const pool of pools) {
      pool.electrified = .6;
      const targets = team ? gameWorld.getHostileTargets(team) : [gameWorld.player, gameWorld.enemyChampion, ...(gameWorld.minions ?? [])];
      for (const actor of targets) {
        if (!actor || hit.has(actor) || actor.isProp || actor.isStoneWall || actor.isDead || actor.lifeState === 'Dead') continue;
        if (!pool.contains(actor.x, actor.z ?? pool.z, 6) || (actor.elevation ?? 0) > 12) continue;
        hit.add(actor);
        actor.takeDamage(damage, 0, 40, .25, false, 'spell');
        combat.spawnHitSparks(actor.x, (actor.y ?? groundYForDepth(actor.z)) - 14, 1, '#ffeb3b', 6);
        shocked = true;
      }
    }
    return shocked;
  }

  isFrozen(zone) { return this.effects.some((e) => e.type === 'ice' && e.frozenPool === zone); }

  // Wind clears smoke and drags burning ground downwind.
  wind(x, z, radius, dir) {
    const spread = [];
    for (const effect of this.effects) {
      if (Math.hypot(x - effect.x, (z - effect.z) * 150) > radius + shapeExtentX(effect)) continue;
      if (effect.type === 'smoke') effect.life = Math.min(effect.life, .25);
      if (effect.type === 'scorch' && !effect.windSpread) {
        effect.windSpread = true;
        spread.push([effect.x + dir * (effect.radius + 30), effect.z, { radius: effect.radius * .8, team: effect.team }]);
      }
    }
    for (const [sx, sz, opts] of spread) this.add('scorch', sx, sz, opts);
  }

  // ── props ────────────────────────────────────────────────────────────
  addProp(kind, x, z, opts = {}) {
    // Reactive scene objects (scene_objects.js + packs); opts configure them (keys, links, elements).
    const prop = isSceneKind(kind) ? SCENE_KINDS[kind](x, z, opts) : new BreakableProp(kind, x, z);
    this.props.push(prop);
    return prop;
  }

  livingProps() { return this.props.filter((prop) => !prop.isDead); }
  addSceneFx(fx) { this.sceneFx.push(fx); return fx; }

  blocks(entity) { return this.blocksAt(entity, entity.x, entity.z); }

  blocksAt(entity, x, z) {
    // Ground props block on the ground only — not someone standing on a platform / branch above them.
    if ((entity.elevation ?? 0) + (entity.surfaceHeight ?? 0) > 34) return false;
    for (const prop of this.props) {
      if (prop.isDead || prop.noBlock) continue;
      if (Math.abs(x - prop.x) <= prop.halfX + (entity.width ?? 24) * .5 && Math.abs(z - prop.z) <= prop.halfZ + .05) return true;
    }
    return false;
  }

  breakProp(prop, gameWorld) {
    combat.spawnHitSparks(prop.x, prop.y - 16, 1, prop.kind === 'barrel' ? '#ff9800' : '#a1887f', 14);
    combat.spawnDust(prop.x, prop.y, 8);
    audio.playImpact?.(true);
    if (prop.kind === 'barrel') {
      // Oil barrel: a fiery burst that hurts everyone nearby and leaves fire.
      combat.shakeCamera(8, .3);
      combat.spawnShockwave(prop.x, prop.y - 14, 80, '#ff6d00');
      this.spawnFx('fx_smoke', prop.x, prop.z, { duration: .7, scale: 2.5 });
      for (const team of ['red', 'blue']) {
        for (const actor of gameWorld.getHostileTargets(team)) {
          if (actor === prop || actor.isDead || actor.lifeState === 'Dead') continue;
          if (Math.hypot(actor.x - prop.x, ((actor.z ?? prop.z) - prop.z) * 150) > 80) continue;
          if (actor.isProp) { if (!actor.burning) actor.burning = .01; continue; }
          actor.takeDamage(28, Math.sign(actor.x - prop.x || 1) * 260, 200, .35, false, 'spell');
        }
      }
      this.add('scorch', prop.x, prop.z, { radius: 70 });
    } else if (prop.weaponId) {
      // A weapon crate drops its weapon onto the field.
      this.add('rubble', prop.x, prop.z, { radius: 26, life: 3 });
      gameWorld.armory?.drop(prop.weaponId, prop.x, prop.z);
    } else {
      this.add('rubble', prop.x, prop.z, { radius: 26, life: 3 });
      // Crates may hold a potion.
      if (Math.random() < .6 && gameWorld.modeState?.potions) {
        gameWorld.modeState.potions.push({ x: prop.x, z: prop.z, kind: Math.random() < .55 ? 'hp' : 'mana', life: 15 });
      }
    }
  }

  // ── simulation ───────────────────────────────────────────────────────
  update(dt, gameWorld, summons = []) {
    this.time += dt;
    this.tickTimer -= dt;
    const tick = this.tickTimer <= 0;
    if (tick) this.tickTimer = TICK;
    for (const effect of this.effects) {
      effect.life -= dt; effect.age += dt;
      effect.electrified = Math.max(0, effect.electrified - dt);
      if (effect.rules.fire && Math.random() < dt * 4) combat.spawnElementalParticles(effect.x + (Math.random() - .5) * effect.radius, groundYForDepth(effect.z) - 4, 'ignis', 1);
    }
    this.effects = this.effects.filter((effect) => effect.life > 0);
    for (const fx of this.transient) fx.t += dt;
    this.transient = this.transient.filter((fx) => fx.t < fx.duration);
    this.updateTerrain(dt);
    this.updateAmbient(dt, gameWorld);

    // Surface rules for every grounded actor.
    const actors = [gameWorld.player, gameWorld.enemyChampion, ...(gameWorld.minions ?? []), ...summons].filter((actor) => actor && !actor.isDead && actor.lifeState !== 'Dead');
    for (const actor of actors) {
      actor.onIce = false;
      if ((actor.elevation ?? 0) > 10 || (actor.surfaceHeight ?? 0) > 10 || actor.burrowed || actor.isHovering) {
        actor._inWater = false;
        continue;
      }
      const ax = actor.x; const az = actor.z ?? 0;
      const dynamicHere = this.effects.filter((effect) => effect.contains(ax, az));
      let wet = false;
      for (const effect of dynamicHere) {
        const rules = effect.rules;
        if (rules.slippery) {
          if (actor === gameWorld.player) actor.onIce = true;
          else actor.slow?.(.2, .7);
        }
        if (effect.type === 'water') wet = true;
        if (rules.slow) actor.slow?.(.15, rules.slow);
        if (tick && rules.dps && actor.team !== effect.team) this.hazard(actor, rules.dps * TICK);
      }
      for (const zone of this.terrainAt(ax, az)) {
        const rules = zone.rules;
        const covered = (types) => dynamicHere.some((effect) => types.includes(effect.type));
        if (rules.slippery && !covered(['water', 'scorch', 'lava'])) {
          if (actor === gameWorld.player) actor.onIce = true;
          else actor.slow?.(.2, .7);
        }
        if (rules.slow) actor.slow?.(.15, rules.slow);
        if (rules.conducts && !this.isFrozen(zone)) wet = true;
        if (rules.manaRegen && Number.isFinite(actor.mp)) actor.mp = Math.min(actor.maxMp ?? 100, actor.mp + rules.manaRegen * dt);
        if (tick && rules.dps && !covered(['ice', 'crater', 'water'])) this.hazard(actor, rules.dps * TICK);
      }
      // A lunar tide makes every pool heavy to wade through.
      if (wet && this.skyMods?.waterSlow) actor.slow?.(.15, this.skyMods.waterSlow);
      // Splash when stepping into water, and while wading.
      actor._wadeTimer = Math.max(0, (actor._wadeTimer ?? 0) - dt);
      const moving = Math.abs(actor.vx ?? 0) + Math.abs((actor.vz ?? 0) * 150) > 40;
      if (wet && (!actor._inWater || (moving && actor._wadeTimer <= 0))) {
        this.spawnFx('fx_splash', ax, az, { duration: .4, scale: actor._inWater ? 1.2 : 1.8 });
        actor._wadeTimer = .38;
      }
      actor._inWater = wet;
      // Standing in water soaks (status WET → lightning / ice combos; puts out a burn).
      if (wet) applyStatus(actor, 'wet', { duration: 2, quiet: true });
    }

    // Props: burning barrels burst, burning ground sets crates alight.
    for (const prop of this.props) {
      if (prop.isDead) continue;
      if (prop.isSceneObject) { prop.tick(dt, gameWorld, this); continue; } // feels elements itself
      prop.hitFlash = Math.max(0, prop.hitFlash - dt);
      prop.shake = Math.max(0, prop.shake - dt);
      const onFire = this.effects.some((effect) => effect.rules.fire && effect.contains(prop.x, prop.z, 8))
        || this.terrain.some((zone) => (zone.rules.fire || zone.burning > 0) && zone.contains(prop.x, prop.z, 8));
      if (tick && onFire) {
        if (prop.kind === 'barrel') prop.burning = Math.max(prop.burning, .01);
        else { prop.charred = true; prop.takeDamage(6, 0, 0, 0, false, 'fire'); }
      }
      if (prop.burning > 0) {
        prop.burning += dt;
        if (Math.random() < .4) combat.spawnElementalParticles(prop.x, prop.y - 26, 'ignis', 1);
        if (prop.burning > .9) prop.isDead = true;
      }
    }
    for (const prop of this.props) {
      if (prop.isDead && !prop.broken) { prop.broken = true; if (prop.isSceneObject) prop.onBreak(gameWorld, this); else this.breakProp(prop, gameWorld); }
    }
    this.props = this.props.filter((prop) => !prop.broken);
    for (const fx of this.sceneFx) fx.update(dt, gameWorld, this);
    this.sceneFx = this.sceneFx.filter((fx) => !fx.isFinished);
  }

  hazard(actor, amount) {
    if (actor.takeHazardDamage) actor.takeHazardDamage(amount);
    else actor.takeDamage(amount, 0, 0, 0, false, 'hazard');
  }

  updateTerrain(dt) {
    for (const zone of this.terrain) {
      zone.electrified = Math.max(0, zone.electrified - dt);
      zone.burnt = Math.max(0, zone.burnt - dt);
      if (zone.burning > 0) {
        // Burning hay: fire spreads across the whole field, then turns to ash.
        zone.burning -= dt;
        zone.burnTick -= dt;
        if (zone.burnTick <= 0) {
          zone.burnTick = .25;
          // Golden-angle spread: the fire walks evenly across the field.
          const i = zone.burnIndex = (zone.burnIndex ?? 0) + 1;
          const a = i * 2.39996 + zone.seed; const k = Math.sqrt(((i % 9) + .5) / 9) * .85;
          const x = zone.x + Math.cos(a) * shapeExtentX(zone) * k;
          const z = zone.z + Math.sin(a) * (zone.rz ?? zone.hz ?? .1) * k;
          this.add('scorch', x, z, { radius: 34, life: 3 });
        }
      }
    }
  }

  updateAmbient(dt, gameWorld) {
    const ambient = this.map?.ambient;
    if (!ambient) return;
    // Wind gusts (storm, breeze): clear smoke, spread fire, nudge fighters.
    this.gustTimer -= dt;
    if (this.gustTimer <= 0) {
      this.gustTimer = 10 + Math.random() * 5;
      const dir = Math.random() < .5 ? -1 : 1;
      this.wind(512, .5, 700, dir);
      for (const actor of [gameWorld.player, gameWorld.enemyChampion, ...(gameWorld.minions ?? [])]) {
        if (actor && !actor.isDead && actor.lifeState !== 'Dead' && !actor.isTrainingDummy && (actor.elevation ?? 0) < 10) actor.kbVelX = (actor.kbVelX ?? 0) + dir * (ambient === 'storm' ? 140 : 80);
      }
      this.gust = { dir, t: 0 };
    }
    if (this.gust) { this.gust.t += dt; if (this.gust.t > 1.2) this.gust = null; }
    // Storm: a telegraphed lightning strike into a random puddle.
    if (ambient !== 'storm') return;
    if (this.strike) {
      this.strike.t += dt;
      if (!this.strike.hit && this.strike.t >= .9) {
        this.strike.hit = true;
        const zone = this.strike.zone;
        this.spawnFx('fx_lightning', zone.x, zone.z, { duration: .5, scale: 2 });
        combat.shakeCamera(10, .35);
        audio.playImpact?.(true);
        this.electrify(zone.x, zone.z, 1, null, 18, gameWorld);
      }
      if (this.strike.t > 1.4) this.strike = null;
      return;
    }
    this.ambientTimer -= dt;
    const pools = this.terrain.filter((zone) => zone.rules.conducts);
    if (this.ambientTimer <= 0 && pools.length) {
      this.ambientTimer = 6 + Math.random() * 3.5;
      this.strike = { zone: pools[Math.floor(Math.random() * pools.length)], t: 0, hit: false };
    }
  }

  // ── rendering ────────────────────────────────────────────────────────
  // Procedural ground shapes (drawn through the pixel layer).
  renderGround(ctx) {
    const t = performance.now() * .001;
    const depth = zDepthPx();
    // Map terrain overlays: burnt hay and storm warnings.
    for (const zone of this.terrain) {
      if (zone.type === 'hay' && zone.burnt > 0 && zone.burning <= 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, zone.burnt / 3) * .8;
        this.pathShape(ctx, zone, depth); ctx.fillStyle = '#2b2118'; ctx.fill(); ctx.restore();
      }
      if (this.strike?.zone === zone && !this.strike.hit) {
        ctx.save(); ctx.globalAlpha = .25 + .35 * Math.abs(Math.sin(t * 18));
        this.pathShape(ctx, zone, depth); ctx.fillStyle = '#e3f2fd'; ctx.fill(); ctx.restore();
      }
    }
    for (const effect of this.effects) {
      if (effect.type === 'smoke') continue;
      const y = groundYForDepth(effect.z);
      const rx = effect.radius; const ry = effect.radius * .32;
      ctx.save();
      ctx.globalAlpha = effect.fade;
      const ellipse = (sx, sy, fill, stroke = null) => {
        if (effect.shape !== 'circle') this.pathShape(ctx, effect, depth, sx);
        else { ctx.beginPath(); ctx.ellipse(effect.x, y, rx * sx, ry * sy, 0, 0, Math.PI * 2); }
        ctx.fillStyle = fill; ctx.fill();
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
      };
      switch (effect.type) {
        case 'ice':
          ellipse(1, 1, 'rgba(178,235,242,.78)', '#e0f7fa');
          ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5;
          for (let i = 0; i < 4; i++) {
            const a = effect.seed + i * 1.7;
            ctx.beginPath(); ctx.moveTo(effect.x, y); ctx.lineTo(effect.x + Math.cos(a) * shapeExtentX(effect) * .8, y + Math.sin(a) * ry * .8); ctx.stroke();
          }
          break;
        case 'water':
          ellipse(1, 1, 'rgba(41,121,255,.45)', 'rgba(130,177,255,.8)');
          ctx.strokeStyle = 'rgba(187,222,251,.7)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(effect.x, y, rx * (.4 + (t % 1) * .5), ry * (.4 + (t % 1) * .5), 0, 0, Math.PI * 2); ctx.stroke();
          break;
        case 'scorch':
          ellipse(1, 1, 'rgba(33,20,14,.78)', 'rgba(255,111,0,.6)');
          if (!fxReady('fx_flame')) {
            for (let i = 0; i < 4; i++) {
              const fx = effect.x + Math.cos(effect.seed + i * 1.9) * rx * .55;
              const fy = y + Math.sin(effect.seed + i * 1.9) * ry * .55;
              const h = 6 + Math.abs(Math.sin(t * 7 + i + effect.seed)) * 8;
              ctx.fillStyle = i % 2 ? '#ffb300' : '#ff5722';
              ctx.fillRect(Math.round(fx - 3), Math.round(fy - h), 6, h);
            }
          }
          break;
        case 'lava':
          ellipse(1, 1, '#bf360c', '#3e2723');
          ellipse(.65, .65, '#ff6d00');
          break;
        case 'crater':
          ellipse(1, 1, '#4e342e', '#8d6e63');
          ellipse(.6, .55, '#2b1d18');
          break;
        case 'crack': {
          ctx.strokeStyle = '#2b1d18'; ctx.lineWidth = 3;
          for (let i = 0; i < 3; i++) {
            const a = effect.angle + (i - 1) * .7 + Math.sin(effect.seed + i) * .2;
            ctx.beginPath(); ctx.moveTo(effect.x, y);
            let px = effect.x; let py = y;
            for (let s = 1; s <= 4; s++) { px += Math.cos(a) * rx * .25 + Math.sin(effect.seed * s) * 3; py += Math.sin(a) * ry * .25; ctx.lineTo(px, py); }
            ctx.stroke();
          }
          break;
        }
        case 'rubble':
          if (!fxReady('fx_rubble')) {
            ctx.fillStyle = '#8d6e63'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
              const px = effect.x + Math.cos(effect.seed + i * 1.3) * rx * .7;
              const py = y + Math.sin(effect.seed + i * 1.3) * ry * .7;
              ctx.fillRect(Math.round(px - 3), Math.round(py - 3), 6, 5); ctx.strokeRect(Math.round(px - 3), Math.round(py - 3), 6, 5);
            }
          }
          break;
        case 'hole':
          ellipse(1, 1, '#1b120e', '#6d4c41');
          break;
        case 'blood':
          ellipse(1, 1, 'rgba(120,8,18,.85)', '#e53935');
          ellipse(.45, .45, 'rgba(229,57,53,.7)');
          break;
        default: break;
      }
      ctx.restore();
    }
  }

  pathShape(ctx, shape, depth, k = 1) {
    const y = groundYForDepth(shape.z);
    ctx.beginPath();
    if (shape.shape === 'rect') {
      const y0 = groundYForDepth(shape.z - shape.hz * k); const y1 = groundYForDepth(shape.z + shape.hz * k);
      ctx.rect(shape.x - shape.hx * k, y0, shape.hx * 2 * k, y1 - y0);
    } else if (shape.shape === 'ellipse') {
      ctx.ellipse(shape.x, y, shape.rx * k, shape.rz * depth * k, 0, 0, Math.PI * 2);
    } else ctx.ellipse(shape.x, y, shape.radius * k, shape.radius * .32 * k, 0, 0, Math.PI * 2);
  }

  // Seeded positions inside a shape (stable per effect).
  pointsIn(shape, count, seed) {
    const points = [];
    for (let i = 0; i < count; i++) {
      const a = seed + i * 2.399; const k = .25 + ((Math.sin(seed * 7 + i * 3.1) + 1) / 2) * .6;
      const ex = shapeExtentX(shape);
      const ez = shape.shape === 'ellipse' ? shape.rz : shape.shape === 'rect' ? shape.hz : shape.radius / 150;
      points.push({ x: shape.x + Math.cos(a) * ex * k, z: shape.z + Math.sin(a) * ez * k });
    }
    return points;
  }

  // Pixel-art sprite details on the ground (flames, bubbles, crystals,
  // sparks, rubble) — drawn crisp, outside the low-res layer.
  renderGroundDetails(ctx, debug = false) {
    const t = performance.now() * .001;
    // F3 debug: outline the gameplay terrain zones over the painted scene.
    if (debug) {
      const depth = zDepthPx();
      ctx.save(); ctx.lineWidth = 2; ctx.setLineDash?.([5, 4]);
      for (const zone of this.terrain) { ctx.strokeStyle = { water: '#40c4ff', mana: '#18ffff', ice: '#e1f5fe', lava: '#ff3d00', sand: '#ffd54f', crater: '#a1887f', hay: '#c6ff00' }[zone.type] ?? '#fff'; this.pathShape(ctx, zone, depth); ctx.stroke(); }
      ctx.restore();
    }
    for (const zone of this.terrain) {
      if (zone.type === 'lava') this.renderBubbles(ctx, zone, 4, t);
      if (zone.type === 'hay' && zone.burning > 0) this.renderFlames(ctx, zone, 7, t, 1.6, 1);
      if (zone.electrified > 0) this.renderSparks(ctx, zone, 6, t);
      if (zone.rules.manaRegen && fxReady('fx_weather')) {
        for (const [i, p] of this.pointsIn(zone, 3, zone.seed).entries()) drawFx(ctx, 'fx_weather', 6 + ((t * 3 + i) | 0) % 2, p.x, groundYForDepth(p.z) - 6 - ((t * 20 + i * 9) % 22), { scale: 2, anchor: 'center', alpha: .85 });
      }
    }
    for (const effect of this.effects) {
      if (effect.type === 'scorch') this.renderFlames(ctx, effect, Math.max(2, Math.min(5, Math.round(effect.radius / 14))), t, 1.5, effect.fade);
      else if (effect.type === 'lava') this.renderBubbles(ctx, effect, 3, t);
      else if (effect.type === 'ice' && fxReady('fx_ice')) {
        const n = effect.frozenPool ? 4 : 2;
        for (const p of this.pointsIn(effect, n, effect.seed)) drawFx(ctx, 'fx_ice', 3, p.x, groundYForDepth(p.z) + 4, { scale: 1, alpha: effect.fade });
      } else if (effect.type === 'rubble' && fxReady('fx_rubble')) {
        for (const [i, p] of this.pointsIn(effect, 4, effect.seed).entries()) drawFx(ctx, 'fx_rubble', i, p.x, groundYForDepth(p.z) + 4, { scale: 2, alpha: effect.fade });
      }
      if (effect.type === 'water' && effect.electrified > 0) this.renderSparks(ctx, effect, 4, t);
    }
  }

  renderFlames(ctx, shape, count, t, scale, alpha) {
    if (!fxReady('fx_flame')) return;
    for (const [i, p] of this.pointsIn(shape, count, shape.seed).entries()) drawFx(ctx, 'fx_flame', t * 10 + i * 2, p.x, groundYForDepth(p.z) + 2, { scale, alpha, flip: i % 2 === 1 });
  }

  renderBubbles(ctx, shape, count, t) {
    if (!fxReady('fx_lava_bubble')) return;
    for (let i = 0; i < count; i++) {
      const cycle = t * 1.3 + i * .37 + shape.seed;
      const round = Math.floor(cycle);
      const [p] = this.pointsIn(shape, 1, shape.seed + round * 1.618 + i * 4.2);
      drawFx(ctx, 'fx_lava_bubble', (cycle - round) * 6, p.x, groundYForDepth(p.z) + 2, { scale: 2 });
    }
  }

  renderSparks(ctx, shape, count, t) {
    if (!fxReady('fx_spark')) return;
    for (const [i, p] of this.pointsIn(shape, count, shape.seed + Math.floor(t * 12)).entries()) drawFx(ctx, 'fx_spark', t * 20 + i, p.x, groundYForDepth(p.z), { scale: 2, anchor: 'center' });
  }

  // Smoke and transient sprite effects above the actors.
  renderAir(ctx) {
    for (const effect of this.effects) {
      if (effect.type !== 'smoke') continue;
      const k = 1 - effect.life / effect.maxLife;
      const y = groundYForDepth(effect.z) - 10 - k * 60;
      // Solid smoke frames only; the fade is an alpha ramp (the dithered
      // frames would read as a checkerboard at large scales).
      if (fxReady('fx_smoke')) { drawFx(ctx, 'fx_smoke', Math.min(3, k * 4), effect.x, y, { scale: Math.min(2.4, Math.max(1.5, effect.radius / 18)), anchor: 'center', alpha: 1 - k * k }); continue; }
      ctx.save();
      ctx.globalAlpha = (1 - k) * .7;
      ctx.fillStyle = '#9e9e9e'; ctx.strokeStyle = '#616161'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const r = effect.radius * (.25 + k * .3);
        ctx.beginPath(); ctx.arc(effect.x + (i - 1.5) * r * .9, y - (i % 2) * r * .5, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
    for (const fx of this.transient) {
      const k = fx.t / fx.duration;
      const smoke = fx.name === 'fx_smoke';
      const sheetFrames = { fx_splash: 6, fx_lightning: 5, fx_ice: 5, fx_smoke: 4, fx_spark: 4 }[fx.name] ?? 4;
      drawFx(ctx, fx.name, Math.min(sheetFrames - 1, k * sheetFrames), fx.x, groundYForDepth(fx.z) + (fx.name === 'fx_lightning' ? 8 : 4) - fx.height, { scale: fx.scale, anchor: fx.anchor, alpha: smoke ? 1 - k * k : 1 });
    }
  }

  // Screen-space weather (stateless, time-based particles).
  renderWeather(ctx, width, height) {
    const weather = this.map?.weather;
    if (!weather || !fxReady('fx_weather')) return;
    const t = performance.now() * .001;
    const layers = {
      snow: [{ frame: 0, count: 48, vx: 14, vy: 42, sway: 18, scale: 1.5, alpha: .75 }],
      rain: [{ frame: 1, count: 110, vx: -70, vy: 520, sway: 0 }],
      storm: [{ frame: 1, count: 120, vx: -140, vy: 560, sway: 0 }, { frame: 3, count: 14, vx: 180, vy: 40, sway: 30, alt: 4 }],
      embers: [{ frame: 2, count: 45, vx: 8, vy: -46, sway: 22 }],
      leaves: [{ frame: 3, count: 26, vx: 55, vy: 32, sway: 26, alt: 4 }],
      dust: [{ frame: 5, count: 50, vx: 95, vy: 6, sway: 10 }],
      motes: [{ frame: 6, count: 40, vx: 4, vy: -18, sway: 14, alt: 7 }]
    }[weather] ?? [];
    const gustBoost = this.gust ? this.gust.dir * 160 * Math.sin(Math.min(1, this.gust.t / 1.2) * Math.PI) : 0;
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const sx = (i * 97.13) % 1; const sy = (i * 57.31 + .37) % 1; const speed = .7 + ((i * 13) % 7) / 10;
        const x = ((sx * (width + 40) + t * (layer.vx + gustBoost) * speed + Math.sin(t + i) * layer.sway) % (width + 40) + width + 40) % (width + 40) - 20;
        const y = ((sy * (height + 40) + t * layer.vy * speed) % (height + 40) + height + 40) % (height + 40) - 20;
        const frame = layer.alt && i % 2 ? layer.alt : layer.frame;
        drawFx(ctx, 'fx_weather', frame, x, y, { scale: layer.scale ?? 2, anchor: 'center', alpha: weather === 'motes' ? .5 + .5 * Math.sin(t * 3 + i) : layer.alpha ?? .9 });
      }
    }
  }
}

export function renderProp(ctx, prop) {
  if (prop.isSceneObject) { const h = prop.flight?.h ?? (prop.carriedBy ? 58 + (prop.carriedBy.worldHeight ?? 0) : 0); if (h) { ctx.save(); ctx.translate(0, -Math.round(h)); } prop.render(ctx); if (h) ctx.restore(); renderSceneHint(ctx, prop); return; }
  const x = Math.round(prop.x + (prop.shake > 0 ? Math.sin(performance.now() * .08) * 2 : 0));
  const y = Math.round(prop.y);
  if (prop.weaponId) {
    // Weapon crates carry a golden band and a floating sword mark.
    ctx.save();
    const bob = Math.sin(performance.now() * .004) * 2;
    ctx.fillStyle = 'rgba(255,213,79,.9)';
    ctx.beginPath(); ctx.moveTo(x, y - 54 + bob); ctx.lineTo(x + 3, y - 46 + bob); ctx.lineTo(x + 1, y - 46 + bob); ctx.lineTo(x + 1, y - 40 + bob); ctx.lineTo(x - 1, y - 40 + bob); ctx.lineTo(x - 1, y - 46 + bob); ctx.lineTo(x - 3, y - 46 + bob); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 4, y - 46 + bob, 8, 2);
    ctx.restore();
  }
  const sheet = prop.kind === 'barrel' ? 'prop_barrel' : 'prop_crate';
  if (fxReady(sheet)) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const frame = prop.kind === 'barrel' ? (prop.burning > 0 ? 2 : prop.hp < prop.maxHp * .5 ? 1 : 0) : (prop.charred ? 2 : prop.hp < prop.maxHp * .5 ? 1 : 0);
    drawFx(ctx, sheet, frame, x, y + 2, { scale: 1.25 });
    if (prop.hitFlash > 0) { ctx.save(); ctx.globalAlpha = .4; ctx.fillStyle = '#fff'; ctx.fillRect(x - 18, y - 40, 36, 40); ctx.restore(); }
    if (prop.burning > 0 || prop.charred) drawFx(ctx, 'fx_flame', performance.now() * .012, x, y - 26, { scale: 1.2 });
    return;
  }
  const px = (rx, ry, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x + rx, y + ry, w, h); };
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (prop.kind === 'barrel') {
    px(-12, -34, 24, 34, '#3e2723'); px(-11, -33, 22, 32, '#a1572b');
    px(-11, -27, 22, 3, '#424242'); px(-11, -9, 22, 3, '#424242');
    px(-4, -22, 8, 8, '#ffb300'); px(-2, -20, 4, 4, '#3e2723');
  } else {
    px(-15, -30, 30, 30, '#3e2723'); px(-14, -29, 28, 28, '#a1887f');
    px(-14, -29, 28, 3, '#6d4c41'); px(-14, -4, 28, 3, '#6d4c41');
    px(-14, -29, 3, 28, '#6d4c41'); px(11, -29, 3, 28, '#6d4c41');
  }
  if (prop.burning > 0) { px(-8, -44, 6, 10, '#ff5722'); px(2, -48, 6, 14, '#ffb300'); }
  if (prop.hitFlash > 0) { ctx.globalAlpha = .55; px(-15, -34, 30, 34, '#ffffff'); }
  ctx.restore();
}

export const environment = new EnvironmentSystem();
