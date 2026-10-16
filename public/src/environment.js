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
// Breakable props: wooden crates (may drop a potion) and oil barrels (burst
// into flame). Every melee hit and spell reaches them through the normal
// hostile-target list; they also block movement like a small wall.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';

export const GROUND_EFFECTS = Object.freeze({
  ice: Object.freeze({ life: 7, slow: null, slippery: true }),
  scorch: Object.freeze({ life: 4.5, dps: 6, fire: true }),
  lava: Object.freeze({ life: 5, dps: 14, fire: true }),
  crater: Object.freeze({ life: 9, slow: .72 }),
  crack: Object.freeze({ life: 7, slow: .82 }),
  rubble: Object.freeze({ life: 6, slow: .78 }),
  water: Object.freeze({ life: 8 }),
  hole: Object.freeze({ life: 6 }),
  smoke: Object.freeze({ life: 2.4 })
});

const MAX_EFFECTS = 48;
const TICK = .5;

const groundDistance = (x, z, effect) => Math.hypot(x - effect.x, (z - effect.z) * 150);

class GroundEffect {
  constructor(type, x, z, { radius = 50, team = null, life = null, angle = 0 } = {}) {
    this.type = type; this.x = x; this.z = z; this.radius = radius; this.team = team;
    this.maxLife = life ?? GROUND_EFFECTS[type].life; this.life = this.maxLife;
    this.angle = angle; this.seed = Math.random() * 1000; this.electrified = 0;
  }
  get rules() { return GROUND_EFFECTS[this.type]; }
  get fade() { return Math.max(0, Math.min(1, this.life / Math.min(1.2, this.maxLife * .4))); }
  contains(x, z, pad = 0) { return groundDistance(x, z, this) <= this.radius + pad; }
  overlaps(other, k = .6) { return groundDistance(other.x, other.z, this) <= (this.radius + other.radius) * k; }
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
    this.tickTimer = 0;
  }

  clear() { this.effects = []; this.props = []; this.tickTimer = 0; }

  effectsAt(x, z, type = null) {
    return this.effects.filter((effect) => (!type || effect.type === type) && effect.contains(x, z));
  }

  // ── adding effects (with element reactions) ──────────────────────────
  add(type, x, z, options = {}) {
    if (!GROUND_EFFECTS[type]) return null;
    const effect = new GroundEffect(type, x, z, options);
    if (!this.react(effect)) return null;
    // Same-type overlaps refresh instead of stacking endlessly.
    const twin = this.effects.find((other) => other.type === type && other.overlaps(effect, .45));
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
    return effect;
  }

  // Returns false if the new effect is consumed by a reaction.
  react(effect) {
    const touching = (types) => this.effects.filter((other) => types.includes(other.type) && other.overlaps(effect));
    const isFire = effect.rules.fire;
    if (isFire) {
      // Fire melts ice into water; water douses the fire.
      for (const ice of touching(['ice'])) this.transform(ice, 'water');
      const wet = touching(['water']);
      if (wet.length) {
        for (const puddle of wet) puddle.life = Math.min(puddle.life, 1.2);
        this.puff(effect.x, effect.z, effect.radius);
        if (effect.type !== 'lava') return false;
        this.transform(effect, 'crater');
      }
    }
    if (effect.type === 'ice') {
      for (const fire of touching(['scorch'])) { fire.life = 0; this.puff(fire.x, fire.z, fire.radius); }
      for (const pool of touching(['lava'])) { this.transform(pool, 'crater'); this.puff(pool.x, pool.z, pool.radius); }
      for (const puddle of touching(['water'])) { this.transform(puddle, 'ice'); puddle.radius = Math.max(puddle.radius, effect.radius); }
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

  // Lightning on a puddle electrifies it: everyone standing in it is shocked.
  electrify(x, z, radius, team, damage, gameWorld) {
    let shocked = false;
    for (const puddle of this.effects) {
      if (puddle.type !== 'water' || groundDistance(x, z, puddle) > puddle.radius + radius) continue;
      puddle.electrified = .6;
      for (const actor of gameWorld.getHostileTargets(team)) {
        if (actor.isProp || actor.isDead || actor.lifeState === 'Dead' || !puddle.contains(actor.x, actor.z ?? puddle.z, 6)) continue;
        if ((actor.elevation ?? 0) > 12) continue;
        actor.takeDamage(damage, 0, 40, .25, false, 'spell');
        combat.spawnHitSparks(actor.x, (actor.y ?? groundYForDepth(actor.z)) - 14, 1, '#ffeb3b', 6);
        shocked = true;
      }
    }
    return shocked;
  }

  // Wind clears smoke and drags burning ground downwind.
  wind(x, z, radius, dir) {
    const spread = [];
    for (const effect of this.effects) {
      if (groundDistance(x, z, effect) > radius + effect.radius) continue;
      if (effect.type === 'smoke') effect.life = Math.min(effect.life, .25);
      if (effect.type === 'scorch' && !effect.windSpread) {
        effect.windSpread = true;
        spread.push([effect.x + dir * (effect.radius + 30), effect.z, { radius: effect.radius * .8, team: effect.team }]);
      }
    }
    for (const [sx, sz, opts] of spread) this.add('scorch', sx, sz, opts);
  }

  // ── props ────────────────────────────────────────────────────────────
  addProp(kind, x, z) {
    const prop = new BreakableProp(kind, x, z);
    this.props.push(prop);
    return prop;
  }

  livingProps() { return this.props.filter((prop) => !prop.isDead); }

  // Props are small solid obstacles for every mobile actor.
  blocks(entity) { return this.blocksAt(entity, entity.x, entity.z); }

  blocksAt(entity, x, z) {
    if ((entity.elevation ?? 0) > 34) return false;
    for (const prop of this.props) {
      if (prop.isDead) continue;
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
      for (const team of ['red', 'blue']) {
        for (const actor of gameWorld.getHostileTargets(team)) {
          if (actor === prop || actor.isDead || actor.lifeState === 'Dead') continue;
          if (Math.hypot(actor.x - prop.x, ((actor.z ?? prop.z) - prop.z) * 150) > 80) continue;
          if (actor.isProp) { if (!actor.burning) actor.burning = .01; continue; }
          actor.takeDamage(28, Math.sign(actor.x - prop.x || 1) * 260, 200, .35, false, 'spell');
        }
      }
      this.add('scorch', prop.x, prop.z, { radius: 70 });
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
    this.tickTimer -= dt;
    const tick = this.tickTimer <= 0;
    if (tick) this.tickTimer = TICK;
    for (const effect of this.effects) {
      effect.life -= dt;
      effect.electrified = Math.max(0, effect.electrified - dt);
      if (effect.rules.fire && Math.random() < dt * 4) combat.spawnElementalParticles(effect.x + (Math.random() - .5) * effect.radius, groundYForDepth(effect.z) - 4, 'ignis', 1);
    }
    this.effects = this.effects.filter((effect) => effect.life > 0);

    // Surface rules for every grounded actor.
    const actors = [gameWorld.player, gameWorld.enemyChampion, ...(gameWorld.minions ?? []), ...summons].filter((actor) => actor && !actor.isDead && actor.lifeState !== 'Dead');
    for (const actor of actors) {
      actor.onIce = false;
      if ((actor.elevation ?? 0) > 10 || actor.burrowed) continue;
      for (const effect of this.effects) {
        if (!effect.contains(actor.x, actor.z ?? effect.z)) continue;
        const rules = effect.rules;
        if (rules.slippery) {
          if (actor === gameWorld.player) actor.onIce = true;
          else actor.slow?.(.2, .7);
        }
        if (rules.slow) actor.slow?.(.15, rules.slow);
        if (tick && rules.dps && actor.team !== effect.team) {
          if (actor.takeHazardDamage) actor.takeHazardDamage(rules.dps * TICK);
          else actor.takeDamage(rules.dps * TICK, 0, 0, 0, false, 'hazard');
        }
      }
    }

    // Props: burning barrels burst, burning ground sets crates alight.
    for (const prop of this.props) {
      if (prop.isDead) continue;
      prop.hitFlash = Math.max(0, prop.hitFlash - dt);
      prop.shake = Math.max(0, prop.shake - dt);
      if (tick && this.effects.some((effect) => effect.rules.fire && effect.contains(prop.x, prop.z, 8))) {
        if (prop.kind === 'barrel') prop.burning = Math.max(prop.burning, .01);
        else prop.takeDamage(6, 0, 0, 0, false, 'fire');
      }
      if (prop.burning > 0) {
        prop.burning += dt;
        if (Math.random() < .4) combat.spawnElementalParticles(prop.x, prop.y - 26, 'ignis', 1);
        if (prop.burning > .9) prop.isDead = true;
      }
    }
    for (const prop of this.props) {
      if (prop.isDead && !prop.broken) { prop.broken = true; this.breakProp(prop, gameWorld); }
    }
    this.props = this.props.filter((prop) => !prop.broken);
  }

  // ── rendering (pixel style, drawn through the spell pixel layer) ─────
  renderGround(ctx) {
    const t = performance.now() * .001;
    for (const effect of this.effects) {
      if (effect.type === 'smoke') continue;
      const y = groundYForDepth(effect.z);
      const rx = effect.radius; const ry = effect.radius * .32;
      ctx.save();
      ctx.globalAlpha = effect.fade;
      const ellipse = (sx, sy, fill, stroke = null) => {
        ctx.beginPath(); ctx.ellipse(effect.x, y, rx * sx, ry * sy, 0, 0, Math.PI * 2);
        ctx.fillStyle = fill; ctx.fill();
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
      };
      switch (effect.type) {
        case 'ice':
          ellipse(1, 1, 'rgba(178,235,242,.75)', '#e0f7fa');
          ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5;
          for (let i = 0; i < 4; i++) {
            const a = effect.seed + i * 1.7;
            ctx.beginPath(); ctx.moveTo(effect.x, y); ctx.lineTo(effect.x + Math.cos(a) * rx * .8, y + Math.sin(a) * ry * .8); ctx.stroke();
          }
          break;
        case 'water':
          ellipse(1, 1, 'rgba(41,121,255,.45)', 'rgba(130,177,255,.8)');
          ctx.strokeStyle = 'rgba(187,222,251,.7)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(effect.x, y, rx * (.4 + (t % 1) * .5), ry * (.4 + (t % 1) * .5), 0, 0, Math.PI * 2); ctx.stroke();
          if (effect.electrified > 0) {
            ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(effect.x - rx * .7, y);
            for (let i = 1; i <= 6; i++) ctx.lineTo(effect.x - rx * .7 + rx * 1.4 * i / 6, y + (Math.random() - .5) * ry * 1.4);
            ctx.stroke();
          }
          break;
        case 'scorch':
          ellipse(1, 1, 'rgba(33,20,14,.78)', 'rgba(255,111,0,.6)');
          for (let i = 0; i < 4; i++) {
            const fx = effect.x + Math.cos(effect.seed + i * 1.9) * rx * .55;
            const fy = y + Math.sin(effect.seed + i * 1.9) * ry * .55;
            const h = 6 + Math.abs(Math.sin(t * 7 + i + effect.seed)) * 8;
            ctx.fillStyle = i % 2 ? '#ffb300' : '#ff5722';
            ctx.fillRect(Math.round(fx - 3), Math.round(fy - h), 6, h);
          }
          break;
        case 'lava':
          ellipse(1, 1, '#bf360c', '#3e2723');
          ellipse(.65, .65, '#ff6d00');
          ctx.fillStyle = '#ffd54f';
          for (let i = 0; i < 3; i++) {
            const bubble = (t * .8 + i / 3 + effect.seed) % 1;
            ctx.beginPath(); ctx.arc(effect.x + Math.cos(effect.seed + i * 2.1) * rx * .4, y + Math.sin(effect.seed + i * 2.1) * ry * .4, 2 + bubble * 3, 0, Math.PI * 2); ctx.fill();
          }
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
          ctx.fillStyle = '#8d6e63'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1;
          for (let i = 0; i < 6; i++) {
            const px = effect.x + Math.cos(effect.seed + i * 1.3) * rx * .7;
            const py = y + Math.sin(effect.seed + i * 1.3) * ry * .7;
            ctx.fillRect(Math.round(px - 3), Math.round(py - 3), 6, 5); ctx.strokeRect(Math.round(px - 3), Math.round(py - 3), 6, 5);
          }
          break;
        case 'hole':
          ellipse(1, 1, '#1b120e', '#6d4c41');
          break;
        default: break;
      }
      ctx.restore();
    }
  }

  renderAir(ctx) {
    for (const effect of this.effects) {
      if (effect.type !== 'smoke') continue;
      const k = 1 - effect.life / effect.maxLife;
      const y = groundYForDepth(effect.z) - 10 - k * 60;
      ctx.save();
      ctx.globalAlpha = (1 - k) * .7;
      ctx.fillStyle = '#9e9e9e'; ctx.strokeStyle = '#616161'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const r = effect.radius * (.25 + k * .3);
        ctx.beginPath(); ctx.arc(effect.x + (i - 1.5) * r * .9, y - (i % 2) * r * .5, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  }
}

export function renderProp(ctx, prop) {
  const x = Math.round(prop.x + (prop.shake > 0 ? Math.sin(performance.now() * .08) * 2 : 0));
  const y = Math.round(prop.y);
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
    ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 12, y - 26); ctx.lineTo(x + 12, y - 4); ctx.stroke();
  }
  if (prop.burning > 0) { px(-8, -44, 6, 10, '#ff5722'); px(2, -48, 6, 14, '#ffb300'); }
  if (prop.hitFlash > 0) { ctx.globalAlpha = .55; px(-15, -34, 30, 34, '#ffffff'); }
  ctx.restore();
}

export const environment = new EnvironmentSystem();
