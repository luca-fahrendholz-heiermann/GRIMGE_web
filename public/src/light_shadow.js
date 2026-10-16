// GRIMGE Prototype — light (LUX) and shadow (UMBRA) spells.
//
// Shadow Stomper: the caster aims a direction (including depth), stomps,
// and their shadow races over the ground to the nearest enemy inside the
// aimed cone. It grabs that enemy's shadow and holds it: the target cannot
// move until the hold ends, the caster walks too far away or either dies.
// A guarding target slips free. Passives (and a Lunar Orb) hold more targets.
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { SHADOW_STOMP } from './spell_catalog.js';

const DEPTH_PX = 150;
const isGone = (actor) => !actor || actor.isDead || (actor.lifeState && actor.lifeState !== 'Alive');

// Actors whose shadow can be grabbed: fighters, minions, summons and the
// training dummy — never structures, props or walls.
export function canHoldShadow(actor) {
  if (isGone(actor) || actor.isObjective || actor.isProp || actor.isStoneWall || actor.burrowed) return false;
  return !!(actor.isMobileCombatant || actor.isTrainingDummy);
}

// Nearest valid targets inside the aimed cone, closest first. `dir` is a
// unit vector in ground pixels ({ x, z } with depth scaled by 150).
export function pickShadowTargets(caster, candidates, dir, range = SHADOW_STOMP.range, halfAngle = SHADOW_STOMP.halfAngle, max = 1) {
  const cos = Math.cos(halfAngle);
  return candidates
    .filter((actor) => actor !== caster && actor.team !== caster.team && canHoldShadow(actor) && !actor.isGuarding)
    .map((actor) => {
      const rx = actor.x - caster.x; const rz = ((actor.z ?? caster.z) - caster.z) * DEPTH_PX;
      const distance = Math.hypot(rx, rz);
      const facing = distance < 1 ? 1 : (rx * dir.x + rz * dir.z) / distance;
      return { actor, distance, facing };
    })
    .filter((entry) => entry.distance <= range + (entry.actor.radius ?? 16) && (entry.facing >= cos || entry.distance < 34))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, Math.max(1, max))
    .map((entry) => entry.actor);
}

// A normalized aim direction from the caster toward a point (or facing).
export function aimDirection(caster, point) {
  let dx = (point?.x ?? caster.x + (caster.facing || 1) * 200) - caster.x;
  let dz = ((point?.z ?? caster.z) - caster.z) * DEPTH_PX;
  const len = Math.hypot(dx, dz);
  if (len < 8) return { x: caster.facing || 1, z: 0 };
  dx /= len; dz /= len;
  return { x: dx, z: dz };
}

export class ShadowStomperSpell {
  constructor(caster, gameWorld, target = null, { maxTargets = 1, hold = 2.6, range = SHADOW_STOMP.range } = {}) {
    this.caster = caster; this.team = caster.team;
    this.isGroundDecal = true; this.isFinished = false;
    this.dir = aimDirection(caster, target);
    if (Math.abs(this.dir.x) > .15) caster.facing = Math.sign(this.dir.x);
    this.range = range; this.hold = hold; this.maxTargets = maxTargets;
    this.speed = 980; this.t = 0; this.stomped = false;
    this.tendrils = [];
    this.gameWorld = gameWorld;
    // A short hop: the shadow leaves when the caster's feet hit the ground.
    if (caster.grounded !== false && !caster.isMounted) {
      caster.grounded = false;
      caster.elevation = Math.max(caster.elevation ?? 0, 1);
      caster.vElevation = 300;
    }
    caster.cancelSprint?.();
  }
  get x() { return this.caster.x; }
  get z() { return this.caster.z; }
  get surfaceHeight() { return this.caster.surfaceHeight ?? 0; }

  stomp(gameWorld) {
    this.stomped = true;
    const c = this.caster;
    const groundY = groundYForDepth(c.z) - (c.surfaceHeight ?? 0);
    combat.spawnShockwave(c.x, groundY, 54, '#7e57c2');
    combat.spawnDust?.(c.x, groundY, 8);
    combat.shakeCamera(5, .2);
    const targets = pickShadowTargets(c, gameWorld.getHostileTargets(this.team), this.dir, this.range, SHADOW_STOMP.halfAngle, this.maxTargets);
    for (const target of targets) this.tendrils.push({ target, headX: c.x, headZ: c.z, state: 'travel', holdTimer: 0, anchorX: 0, anchorZ: 0 });
    // No target: the shadow still runs out along the aim and fades.
    if (!targets.length) {
      this.tendrils.push({ target: null, headX: c.x, headZ: c.z, state: 'travel', endX: c.x + this.dir.x * this.range, endZ: c.z + this.dir.z * this.range / DEPTH_PX, holdTimer: 0 });
    }
  }

  update(dt, gameWorld) {
    this.t += dt;
    const c = this.caster;
    if (!this.stomped) {
      if ((this.t > .1 && c.grounded) || this.t > .7) this.stomp(gameWorld);
      return;
    }
    const casterGone = isGone(c);
    for (const tendril of this.tendrils) {
      if (tendril.state === 'done') continue;
      const target = tendril.target;
      if (tendril.state === 'travel') {
        const goalX = target ? target.x : tendril.endX;
        const goalZ = target ? target.z : tendril.endZ;
        const dx = goalX - tendril.headX; const dz = (goalZ - tendril.headZ) * DEPTH_PX;
        const distance = Math.hypot(dx, dz);
        const step = this.speed * dt;
        if (target && isGone(target)) { tendril.state = 'fade'; tendril.holdTimer = .3; continue; }
        if (distance <= step) {
          tendril.headX = goalX; tendril.headZ = goalZ;
          if (!target) { tendril.state = 'fade'; tendril.holdTimer = .35; continue; }
          // A target that raised its guard in time slips free.
          if (target.isGuarding) {
            tendril.state = 'fade'; tendril.holdTimer = .35;
            combat.spawnDamageText?.(target.x, (target.y ?? groundYForDepth(target.z)) - 70, 'BLOCKED', { color: '#b39ddb' });
            continue;
          }
          tendril.state = 'hold';
          tendril.holdTimer = this.hold;
          tendril.anchorX = target.x; tendril.anchorZ = target.z;
          target.takeDamage?.(8 * (this.quality?.power ?? 1), 0, 0, .05, false, 'spell');
          combat.spawnShockwave(target.x, groundYForDepth(target.z) - (target.surfaceHeight ?? 0), 34, '#7e57c2');
          combat.spawnDamageText?.(target.x, (target.y ?? groundYForDepth(target.z)) - 74, 'HELD', { color: '#b39ddb' });
        } else {
          tendril.headX += dx / distance * step;
          tendril.headZ += dz / distance * step / DEPTH_PX;
        }
        continue;
      }
      if (tendril.state === 'hold') {
        tendril.holdTimer -= dt;
        const tooFar = Math.hypot(target.x - c.x, (target.z - c.z) * DEPTH_PX) > this.range * 1.6;
        if (tendril.holdTimer <= 0 || isGone(target) || casterGone || tooFar) {
          this.release(tendril);
          continue;
        }
        // Pin the held shadow: no walking, dashing or knockback slides.
        target.x = tendril.anchorX; target.z = tendril.anchorZ;
        target.vx = 0; target.vz = 0;
        if ('kbVelX' in target) target.kbVelX = 0;
        if ('kbVelZ' in target) target.kbVelZ = 0;
        target.rootTimer = tendril.holdTimer;
        tendril.headX = target.x; tendril.headZ = target.z;
        continue;
      }
      if (tendril.state === 'fade') {
        tendril.holdTimer -= dt;
        if (tendril.holdTimer <= 0) tendril.state = 'done';
      }
    }
    if (this.tendrils.every((tendril) => tendril.state === 'done')) this.isFinished = true;
  }

  release(tendril) {
    if (tendril.target) tendril.target.rootTimer = 0;
    tendril.state = 'fade'; tendril.holdTimer = .3;
  }

  get heldTargets() { return this.tendrils.filter((tendril) => tendril.state === 'hold').map((tendril) => tendril.target); }

  // Ground decal: drawn with the shadows, under every actor.
  render(ctx) {
    const c = this.caster;
    const now = performance.now() * .001;
    const startY = groundYForDepth(c.z) - (c.surfaceHeight ?? 0);
    ctx.save();
    for (const tendril of this.tendrils) {
      if (tendril.state === 'done') continue;
      const fade = tendril.state === 'fade' ? Math.max(0, tendril.holdTimer / .35) : 1;
      const endY = groundYForDepth(tendril.headZ) - (tendril.target?.surfaceHeight ?? c.surfaceHeight ?? 0);
      const dx = tendril.headX - c.x; const dy = endY - startY;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len; const ny = dx / len;
      const segments = Math.max(4, Math.ceil(len / 14));
      // A wavering ribbon of shadow between both feet.
      for (const [width, color] of [[11, `rgba(126,87,194,${.45 * fade})`], [6, `rgba(14,4,28,${.85 * fade})`]]) {
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const f = i / segments;
          const wave = Math.sin(f * 9 - now * 7) * 3 * Math.sin(f * Math.PI);
          const px = c.x + dx * f + nx * wave; const py = startY + dy * f + ny * wave * .4;
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
      if (tendril.state === 'hold') {
        // The grabbed shadow: a dark pool with clutching fingers.
        const pulse = 1 + Math.sin(now * 8) * .08;
        ctx.fillStyle = `rgba(14,4,28,${.7 * fade})`;
        ctx.beginPath(); ctx.ellipse(tendril.headX, endY, 30 * pulse, 9 * pulse, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(179,157,219,${.8 * fade})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(tendril.headX, endY, 30 * pulse, 9 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(14,4,28,${.9 * fade})`; ctx.lineWidth = 3;
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * Math.PI * 2 + now * .8;
          ctx.beginPath();
          ctx.moveTo(tendril.headX + Math.cos(a) * 30, endY + Math.sin(a) * 9);
          ctx.quadraticCurveTo(tendril.headX + Math.cos(a) * 18, endY + Math.sin(a) * 4 - 5, tendril.headX + Math.cos(a + .4) * 9, endY + Math.sin(a + .4) * 3);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
}

// Every friendly unit of a team (healing and support spells).
export function alliesOf(gameWorld, team, summons = []) {
  const list = [];
  if (gameWorld.player?.team === team && gameWorld.player.isAlive) list.push(gameWorld.player);
  if (gameWorld.enemyChampion?.team === team && gameWorld.enemyChampion.isAlive) list.push(gameWorld.enemyChampion);
  for (const minion of gameWorld.minions ?? []) if (minion.team === team && !minion.isDead && !minion.isTrainingDummy) list.push(minion);
  for (const summon of summons) if (summon.team === team && !summon.isDead) list.push(summon);
  return list;
}

export function healActor(actor, amount) {
  if (!actor || !(amount > 0) || !Number.isFinite(actor.hp) || !Number.isFinite(actor.maxHp)) return 0;
  const before = actor.hp;
  actor.hp = Math.min(actor.maxHp, actor.hp + amount);
  const healed = actor.hp - before;
  if (healed >= 1) combat.spawnDamageText?.(actor.x, (actor.y ?? groundYForDepth(actor.z)) - 60, `+${Math.round(healed)}`, { color: '#a5d6a7' });
  return healed;
}

// LUX: an expanding ring of sunlight around the caster.
export class HaloPulseSpell {
  constructor(caster, gameWorld, { healMultiplier = 1, allies = [] } = {}) {
    this.caster = caster; this.team = caster.team; this.x = caster.x; this.z = caster.z;
    this.surfaceHeight = caster.surfaceHeight ?? 0;
    this.radius = 135; this.damage = 16; this.heal = 30; this.life = .65; this.maxLife = .65;
    this.isFinished = false; this.applied = false;
    this.healMultiplier = healMultiplier; this.allies = allies; this.gameWorld = gameWorld;
  }
  update(dt, gameWorld) {
    if (!this.applied) {
      this.applied = true;
      const reach = (actor) => Math.hypot(actor.x - this.x, ((actor.z ?? this.z) - this.z) * DEPTH_PX) <= this.radius;
      for (const ally of this.allies) if (reach(ally)) healActor(ally, this.heal * (this.quality?.power ?? 1) * this.healMultiplier);
      for (const target of gameWorld.getHostileTargets(this.team)) {
        if (isGone(target) || target.isObjective || !reach(target)) continue;
        target.takeDamage(this.damage, Math.sign(target.x - this.x || 1) * 80, 30, .2, false, 'spell');
        target.slow?.(1.2, .55);
      }
      combat.spawnShockwave(this.x, groundYForDepth(this.z) - this.surfaceHeight - 30, this.radius * .6, '#ffe082');
    }
    this.life -= dt;
    if (this.life <= 0) this.isFinished = true;
  }
  render(ctx) {
    const k = 1 - this.life / this.maxLife;
    const y = groundYForDepth(this.z) - this.surfaceHeight;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,236,179,${(1 - k) * .9})`; ctx.lineWidth = 6 * (1 - k) + 2;
    ctx.beginPath(); ctx.ellipse(this.x, y, this.radius * k, this.radius * k * .32, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(255,224,130,${(1 - k) * .35})`;
    ctx.beginPath(); ctx.ellipse(this.x, y, this.radius * k, this.radius * k * .32, 0, 0, Math.PI * 2); ctx.fill();
    // Rays rising from the ring.
    ctx.strokeStyle = `rgba(255,248,225,${(1 - k) * .7})`; ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      const px = this.x + Math.cos(a) * this.radius * k; const py = y + Math.sin(a) * this.radius * k * .32;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 46 * (1 - k)); ctx.stroke();
    }
    ctx.restore();
  }
}

// UMBRA: sink into the own shadow and rise behind the nearest enemy ahead.
export function castShadowStep(caster, gameWorld, quality = { power: 1 }) {
  const facing = caster.facing || 1;
  const candidates = gameWorld.getHostileTargets(caster.team).filter((actor) => canHoldShadow(actor)
    && Math.sign(actor.x - caster.x) === facing && Math.abs(actor.x - caster.x) <= 380 && Math.abs((actor.z ?? caster.z) - caster.z) <= .3);
  candidates.sort((a, b) => Math.abs(a.x - caster.x) - Math.abs(b.x - caster.x));
  const target = candidates[0] ?? null;
  const fromX = caster.x; const fromZ = caster.z;
  combat.spawnShockwave(fromX, groundYForDepth(fromZ) - (caster.surfaceHeight ?? 0), 30, '#4527a0');
  if (target) {
    caster.x = target.x + facing * ((target.radius ?? 16) + 26);
    caster.z = target.z;
    caster.facing = -facing;
    target.takeDamage(24 * (quality.power ?? 1), -facing * 140, 60, .4, false, 'spell');
    combat.spawnHitSparks?.(target.x, (target.y ?? groundYForDepth(target.z)) - 30, -facing, '#b39ddb', 10);
  } else {
    caster.x += facing * 170;
  }
  caster.vx = 0; caster.vz = 0;
  gameWorld.battlefield?.resolveEntityCollision?.(caster);
  caster.invulnerableTimer = Math.max(caster.invulnerableTimer ?? 0, .25);
  combat.spawnShockwave(caster.x, groundYForDepth(caster.z) - (caster.surfaceHeight ?? 0), 34, '#7e57c2');
  return target;
}
