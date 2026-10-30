// GRIMGE Prototype — Primals: the Wizard's own spirit companion and the
// Primal Bond transformation (port of Unity GRIMGE).
//
// Source: C:\Dev\unity_projects\GRIMGE — Documentation/Gameplay/
// PrimalCompanionSystem.md, Code/Gameplay/Companions/PetCompanionRuntime.cs,
// PrimalBondRuntime.cs, WolfBondProfile.cs, TurtleBondProfile.cs and the
// BondForms/*.asset values.
//
// A Primal is a supernatural spirit creature, not a pet: three archetypes
// (Wolf, Turtle and the prototype's own Ape after the Mystischer Affe
// reference art) with three evolution stages each.
//  • Castle Siege: it waits on the castle platform; when the Wizard deploys
//    it comes along. A tap on it sends it to the lane alone. After 24 s on
//    the lane it returns to the platform (the timer ignores the Wizard's
//    recall). Without a castle it stays on the lane.
//  • Owner mode (Wizard on the lane / other modes): follows behind the
//    Wizard and bites enemies within 3.5 u of the Wizard.
//  • Intercept: it steps between the Wizard and an approaching enemy; for
//    0.8 s a melee hit on the Wizard lands on the Primal instead (6 s CD).
//  • Down: hidden for 12 s, then back at the Wizard / platform.
//  • Primal Bond (T at full Focus, Primal alive and within 3.5 u): 0.5 s
//    wind-up, then the Primal merges into the Wizard. Focus drains 1.5/s ×
//    the form's drain multiplier and gains are halved; T again releases it.
//    Wolf: faster, Primal Pounce (longer sprint-attack carry). Turtle: shell
//    guard (less displacement taken), Fortified after a block, Shell Rush
//    (sprint attack pushes further). Ape (prototype only): heavier fists —
//    melee damage and knockback up, Spirit Slam sprint attack that sends a
//    chest-drum quake around the impact; the Ape itself punches instead of biting.
// Distances: 24 px per Unity unit, 6 u lane depth = z 0…1. Health and bite
// damage are scaled ×3 to the prototype's health scale (Wizard 320 HP vs.
// Unity 100).
import { audio } from './audio.js';
import { combat } from './combat.js';
import { GroundEntity, groundDistance } from './world.js';
import { SIEGE_ZONES } from './siege_match.js';
import { renderBondOverlay } from './primal_bond_vfx.js';
import { dragonReady, drawDragon, drawDragonHead, drawBreathCone } from './spell_visuals.js';

const U = 24;                 // px per Unity unit (lateral)
const UZ = 1 / 6;             // z per Unity unit (depth)
const HP_SCALE = 3;

export const PRIMAL_ARCHETYPES = Object.freeze({
  wolf: Object.freeze({ id: 'wolf', name: 'PRIMAL WOLF', role: 'HUNTER', aura: 'rgba(115,235,71,', variant: '#f2d12e' }),
  turtle: Object.freeze({ id: 'turtle', name: 'PRIMAL TURTLE', role: 'BULWARK', aura: 'rgba(56,173,209,', variant: '#57e0f0' }),
  ape: Object.freeze({ id: 'ape', name: 'PRIMAL APE', role: 'BRAWLER', aura: 'rgba(176,108,255,', variant: '#c9a8ff' }),
  // Prototype archetype (user, 29 Oct 2026: "Begleiter sollten fliegen können wie ein Drache — dann mounten"):
  // a serpentine spirit dragon that grows over the stages, hovers, breathes fire and can be ridden through the air.
  dragon: Object.freeze({ id: 'dragon', name: 'PRIMAL DRAGON', role: 'SKYRIDER', aura: 'rgba(255,145,0,', variant: '#ffb300' })
});

// BondForms/*.asset — index = evolution stage − 1.
export const BOND_FORMS = Object.freeze({
  wolf: Object.freeze([
    Object.freeze({ name: 'Synchronization', stage: 1, presentation: 'overlay', drain: 1.0, move: 1.25, pounceCarry: 1.3, shellGuard: 1, fortified: 1, fortifiedDuration: 0, shellRushPush: 1 }),
    Object.freeze({ name: 'Hunter', stage: 2, presentation: 'replacement', drain: 1.25, move: 1.35, pounceCarry: 1.5, shellGuard: 1, fortified: 1, fortifiedDuration: 0, shellRushPush: 1 }),
    Object.freeze({ name: 'Apex Predator', stage: 3, presentation: 'replacement', drain: 1.6, move: 1.5, pounceCarry: 1.95, shellGuard: 1, fortified: 1, fortifiedDuration: 0, shellRushPush: 1 })
  ]),
  turtle: Object.freeze([
    Object.freeze({ name: 'Shell Sync', stage: 1, presentation: 'overlay', drain: 1.0, move: 1, pounceCarry: 1, shellGuard: .7, fortified: .4, fortifiedDuration: .75, shellRushPush: 1.35 }),
    Object.freeze({ name: 'Bulwark', stage: 2, presentation: 'replacement', drain: 1.0, move: 1, pounceCarry: 1, shellGuard: .55, fortified: .3, fortifiedDuration: 1.15, shellRushPush: 1.5 }),
    Object.freeze({ name: 'Ironclad', stage: 3, presentation: 'replacement', drain: 1.0, move: 1, pounceCarry: 1, shellGuard: .4, fortified: .2, fortifiedDuration: 1.5, shellRushPush: 1.65 })
  ]),
  // Prototype archetype (no Unity asset): punch = melee damage, knock = melee
  // knockback, slam = Spirit Slam push, quake = chest-drum quake (damage, radius px).
  dragon: Object.freeze([
    Object.freeze({ name: 'Ember Wyrmling', stage: 1, presentation: 'overlay', drain: 1.1, move: 1.2, pounceCarry: 1.2, shellGuard: 1, fortified: 1, fortifiedDuration: 0, shellRushPush: 1 }),
    Object.freeze({ name: 'Sky Wyrm', stage: 2, presentation: 'overlay', drain: 1.3, move: 1.3, pounceCarry: 1.35, shellGuard: .9, fortified: 1, fortifiedDuration: 0, shellRushPush: 1 }),
    Object.freeze({ name: 'Elder Dragon', stage: 3, presentation: 'overlay', drain: 1.55, move: 1.4, pounceCarry: 1.5, shellGuard: .8, fortified: 1, fortifiedDuration: 0, shellRushPush: 1 })
  ]),
  ape: Object.freeze([
    Object.freeze({ name: 'Spirit Rage', stage: 1, presentation: 'overlay', drain: 1.1, move: 1, pounceCarry: 1, shellGuard: 1, fortified: 1, fortifiedDuration: 0, shellRushPush: 1, punch: 1.15, knock: 1.2, slam: 1.25, quake: Object.freeze({ damage: 14, radius: 80 }) }),
    Object.freeze({ name: 'Silverback', stage: 2, presentation: 'replacement', drain: 1.3, move: 1.05, pounceCarry: 1, shellGuard: .85, fortified: 1, fortifiedDuration: 0, shellRushPush: 1, punch: 1.25, knock: 1.3, slam: 1.4, quake: Object.freeze({ damage: 20, radius: 100 }) }),
    Object.freeze({ name: 'Mystic Titan', stage: 3, presentation: 'replacement', drain: 1.5, move: 1.1, pounceCarry: 1, shellGuard: .7, fortified: 1, fortifiedDuration: 0, shellRushPush: 1, punch: 1.4, knock: 1.45, slam: 1.6, quake: Object.freeze({ damage: 28, radius: 125 }) })
  ])
});

export const PRIMAL_STATS = Object.freeze({
  hp: 55 * HP_SCALE,
  speedX: 5.3 * U, speedZ: 3.4 * UZ,
  bite: Object.freeze({ damage: 6 * HP_SCALE, windup: .1, active: .08, recovery: .42 }),
  // The Ape punches: slower, harder, more knockback.
  punch: Object.freeze({ damage: 9 * HP_SCALE, windup: .18, active: .08, recovery: .52, kx: 220, lift: 60 }),
  attackReachX: .72 * U + 14, attackReachZ: .34 * UZ,
  searchRadius: 3.5 * U,
  // Unity follows at −0.75 u; the prototype hero sprite is much wider, so
  // the Primal trails at −1.5 u to stay visible.
  followOffsetX: -1.5 * U, followOffsetZ: -.42 * UZ, followDistance: .85 * U, followBand: .28 * U,
  laneDuration: 24, recoveryTime: 12,
  intercept: Object.freeze({ cooldown: 6, window: .8, maxStep: 1.2 * U, arrive: .5 * U }),
  bondRange: 3.5 * U, bondWindup: .5
});

export function normalizePrimalChoice(id) {
  if (id === 'none') return 'none';
  return PRIMAL_ARCHETYPES[id] ? id : 'wolf';
}

export function bondForm(archetype, stage) {
  const forms = BOND_FORMS[archetype];
  return forms ? forms[Math.max(0, Math.min(forms.length - 1, (stage ?? 1) - 1))] : null;
}

export class PrimalCompanion extends GroundEntity {
  constructor(owner, archetype = 'wolf', stage = 1) {
    super(owner.x - (owner.facing || 1) * 24, owner.z);
    this.owner = owner; this.team = owner.team;
    this.archetype = PRIMAL_ARCHETYPES[archetype] ? archetype : 'wolf';
    this.stage = Math.max(1, Math.min(3, stage | 0 || 1));
    this.info = PRIMAL_ARCHETYPES[this.archetype];
    this.maxHp = this.hp = PRIMAL_STATS.hp;
    this.isPrimal = true; this.isMobileCombatant = true;
    this.facing = owner.facing || 1; this.vx = 0; this.vz = 0; this.kbVelX = 0;
    this.state = 'idle'; this.mode = 'owner'; this.animTime = 0; this.hitFlash = 0;
    this.attack = null; this.attackTimer = 0; this.target = null;
    this.interceptCooldown = 0; this.interceptWindow = 0; this.interceptEnemy = null;
    this.recoveryTimer = 0; this.merged = false;
    this.onLane = false; this.laneTime = 0; this.autonomous = false;
    this.hitRadiusX = 30; this.hitRadiusZ = .12;
    this.lastOwnerPresence = null;
    this.focusTarget = null;
    this.isFlying = this.archetype === 'dragon'; this.rider = null; this.breathT = 0; this.diveT = 0;
  }

  // ── Riding (user, 29 Oct 2026) — the same interface as a rideable summon (Wizard.mount / mountAttack) ──
  get definition() {
    const a = this.archetype; const dragon = a === 'dragon';
    return { id: 'primal_' + a, name: this.info.name, color: this.info.variant, mountable: dragon || this.stage >= 2, flying: dragon,
      mountSpeed: dragon ? 400 + this.stage * 25 : a === 'wolf' ? 420 : a === 'ape' ? 300 : 240,
      riderOffsetY: dragon ? 8 + 6 * this.bodyScale : a === 'ape' ? 46 : a === 'turtle' ? 30 : 34 };
  }
  get damage() { return (this.archetype === 'ape' ? PRIMAL_STATS.punch : PRIMAL_STATS.bite).damage; }
  get radius() { return this.archetype === 'dragon' ? 22 : 18; }
  // The Dragon grows with its stage and swells to riding size under a rider.
  get bodyScale() { return this.rider ? 1.15 : [.55, .78, 1][this.stage - 1]; }
  get reachX() { return this.archetype === 'dragon' ? PRIMAL_STATS.attackReachX + 46 : PRIMAL_STATS.attackReachX; }
  get hoverHeight() { return this.archetype === 'dragon' ? 30 + 8 * this.stage + Math.sin(this.animTime * 2.5) * 3 : 0; }

  // Sticky focus target: overrides the search until it falls.
  setFocusTarget(target) {
    this.focusTarget = target;
    this.interceptEnemy = null;
    combat.spawnShockwave(target.x, (target.y ?? this.y) - 4, 22, this.info.variant);
  }

  validFocus() {
    const t = this.focusTarget;
    if (!t || t.isDead || t.isDestroyed || t.lifeState === 'Dead' || (t.hp ?? 1) <= 0) { this.focusTarget = null; return null; }
    return t;
  }

  // Diamond marker over the focus target.
  renderFocusMarker(ctx) {
    const t = this.isTargetable ? this.validFocus() : null;
    if (!t) return;
    const y = (t.y ?? 0) - (t.heroKey ? 100 : 66) + Math.sin(this.animTime * 4) * 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = this.info.variant; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(t.x, y - 7); ctx.lineTo(t.x + 6, y); ctx.lineTo(t.x, y + 7); ctx.lineTo(t.x - 6, y); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = this.info.aura + '.5)'; ctx.fill();
    ctx.restore();
  }

  get isAlive() { return this.hp > 0 && this.recoveryTimer <= 0; }
  get isDead() { return !this.isAlive || this.merged; }
  get isTargetable() { return this.isAlive && !this.merged; }

  // Primal Bond gate (Unity CanActivateBond): alive, not merged, close.
  canBond(owner = this.owner) {
    return this.isAlive && !this.merged && groundDistance(this, owner) <= PRIMAL_STATS.bondRange;
  }

  siegeMatch(game) { return game?.siegeMatch ?? null; }

  // A tap on the Primal while it waits on the platform sends it to the lane alone.
  tryTapDeploy(pt, game) {
    const match = this.siegeMatch(game);
    if (!match || !this.isTargetable || this.onLane || !match.castleStands(this.team)) return false;
    if (Math.abs(pt.x - this.x) > 26 || pt.y > this.y + 8 || pt.y < this.y - 46) return false;
    this.deployToLane(game, true);
    return true;
  }

  deployToLane(game, autonomous) {
    const point = SIEGE_ZONES.deploy[this.team];
    combat.spawnShockwave(this.x, this.y - 14, 26, this.info.variant);
    this.onLane = true; this.laneTime = 0; this.autonomous = autonomous;
    this.place(game, point.x + (this.team === 'blue' ? -18 : 18), point.z - .06);
    combat.spawnShockwave(this.x, this.y - 4, 34, this.info.variant);
  }

  returnToPlatform(game) {
    const spawn = game.battlefield.getSpawn(this.team);
    this.onLane = false; this.laneTime = 0; this.autonomous = false;
    this.place(game, spawn.x - (this.team === 'blue' ? 18 : -18), spawn.z + .08);
  }

  place(game, x, z) {
    this.x = x; this.z = z; this.vx = 0; this.vz = 0; this.kbVelX = 0;
    this.surfaceId = null;
    this.updateConfinement(game);
    game.battlefield.placeOnSurface(this);
  }

  updateConfinement(game) {
    const match = this.siegeMatch(game);
    this.confineBounds = match ? (this.onLane ? SIEGE_ZONES.lane : SIEGE_ZONES.platform[this.team]) : null;
  }

  takeDamage(amount, kx = 0, lift = 0, stun = .2) {
    if (!this.isTargetable) return { ignored: true };
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = .15;
    this.kbVelX = kx * .6;
    combat.spawnDamageText(this.x, this.y - 40, amount, { color: '#c5e1a5' });
    if (this.hp <= 0) this.goDown();
    return { hit: true };
  }

  goDown() {
    this.rider?.dismount?.(); this.rider = null;
    this.hp = 0;
    this.recoveryTimer = PRIMAL_STATS.recoveryTime;
    this.attack = null; this.interceptWindow = 0;
    combat.spawnShockwave(this.x, this.y - 18, 46, this.info.variant);
    combat.spawnHitSparks(this.x, this.y - 20, this.facing, '#ffffff', 12);
    if (this.owner === window.gameWorld?.player) window.gameWorld?.showAnnouncement?.(`${this.info.name} IS DOWN — BACK IN 12 S`, 1.3);
  }

  respawn(game) {
    this.hp = this.maxHp; this.recoveryTimer = 0;
    const match = this.siegeMatch(game);
    const ownerOnLane = match ? match.isDeployed(this.team) : true;
    this.onLane = !!match && ownerOnLane; this.laneTime = 0; this.autonomous = false;
    if (match && !ownerOnLane) this.returnToPlatform(game);
    else this.place(game, this.owner.x + PRIMAL_STATS.followOffsetX * (this.owner.facing || 1), this.owner.z + PRIMAL_STATS.followOffsetZ);
    combat.spawnShockwave(this.x, this.y - 10, 30, this.info.variant);
  }

  // Redirect a melee hit on the Wizard during the intercept window.
  tryIntercept(owner, amount) {
    if (owner !== this.owner || this.interceptWindow <= 0 || !this.isTargetable) return false;
    this.interceptWindow = 0;
    combat.spawnShockwave(this.x, this.y - 24, 30, this.info.variant);
    combat.spawnHitSparks(this.x, this.y - 26, this.facing, this.info.variant, 10);
    this.takeDamage(amount, 0, 0, .2);
    return true;
  }

  hostiles(game) {
    return game.getHostileTargets(this.team).filter((t) => t !== this && !t.isDead && t.lifeState !== 'Dead' && !t.isProp && !t.isStoneWall && !t.isWallProxy);
  }

  update(dt, game) {
    this.animTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.interceptCooldown = Math.max(0, this.interceptCooldown - dt);
    this.interceptWindow = Math.max(0, this.interceptWindow - dt);
    const owner = this.owner;
    if (this.merged) { this.x = owner.x; this.z = owner.z; return; }
    if (this.recoveryTimer > 0) {
      this.recoveryTimer -= dt;
      if (this.recoveryTimer <= 0) this.respawn(game);
      return;
    }
    this.breathT = Math.max(0, this.breathT - dt); this.diveT = Math.max(0, this.diveT - dt);
    if (this.rider?.isAlive) { this.attack = null; this.target = null; this.vx = 0; this.vz = 0; if (this.state !== 'attack' || this.breathT <= 0) this.state = this.rider.state === 'run' ? 'run' : 'idle'; return; }
    this.rider = null;
    const match = this.siegeMatch(game);
    if (match) this.updateSiegePresence(dt, game, match);
    else this.onLane = true;
    this.updateConfinement(game);

    // Mode: owner-centric when the Wizard fights on the same ground,
    // autonomous on the lane while it is up on the castle.
    const ownerAlive = owner.isAlive;
    const ownerOnLane = match ? match.isDeployed(this.team) : true;
    this.mode = !this.onLane ? 'tower' : ownerAlive && ownerOnLane && !this.autonomous ? 'owner' : 'lane';
    if (this.mode === 'owner' && this.autonomous) this.autonomous = false;

    if (this.attack) { this.updateAttack(dt, game); this.integrate(dt, game); return; }

    let goal = null; let speedMult = 1;
    if (this.mode === 'tower') {
      // Idle beside the Wizard's spot on the platform.
      const spawn = game.battlefield.getSpawn(this.team);
      goal = { x: (ownerAlive && !ownerOnLane ? owner.x : spawn.x) + PRIMAL_STATS.followOffsetX * (this.team === 'blue' ? 1 : -1), z: (ownerAlive && !ownerOnLane ? owner.z : spawn.z) + .08 };
    } else {
      const center = this.mode === 'owner' ? owner : this;
      const foes = this.hostiles(game);
      // Intercept an enemy closing in on the Wizard.
      if (this.mode === 'owner' && this.interceptCooldown <= 0 && !this.interceptEnemy && !this.validFocus()) {
        const threat = foes.filter((t) => t.isMobileCombatant && groundDistance(t, owner) <= PRIMAL_STATS.searchRadius)
          .sort((a, b) => groundDistance(a, owner) - groundDistance(b, owner))[0];
        if (threat) this.interceptEnemy = threat;
      }
      if (this.interceptEnemy) {
        const enemy = this.interceptEnemy;
        const d = groundDistance(enemy, owner);
        if (enemy.isDead || enemy.lifeState === 'Dead' || d > PRIMAL_STATS.searchRadius * 1.4) this.interceptEnemy = null;
        else {
          const dx = (enemy.x - owner.x) / (d || 1); const dz = (enemy.z - owner.z) * 150 / (d || 1);
          const step = Math.min(PRIMAL_STATS.intercept.maxStep, d / 2);
          goal = { x: owner.x + dx * step, z: owner.z + dz * step / 150 };
          speedMult = 1.25;
          if (groundDistance(this, goal) <= PRIMAL_STATS.intercept.arrive) {
            this.interceptWindow = PRIMAL_STATS.intercept.window;
            this.interceptCooldown = PRIMAL_STATS.intercept.cooldown;
            this.interceptEnemy = null;
            combat.spawnShockwave(this.x, this.y - 20, 24, this.info.variant);
          }
        }
      }
      if (!goal) {
        const target = this.validFocus() ?? foes.filter((t) => groundDistance(t, center) <= PRIMAL_STATS.searchRadius)
          .sort((a, b) => groundDistance(a, this) - groundDistance(b, this))[0] ?? null;
        this.target = target;
        if (target) {
          const dx = target.x - this.x;
          if (Math.abs(dx) <= this.reachX + (target.isObjective ? 40 : 0) && Math.abs(target.z - this.z) <= PRIMAL_STATS.attackReachZ + .05) {
            this.facing = Math.sign(dx) || this.facing;
            this.startBite(target);
            this.integrate(dt, game);
            return;
          }
          // Close in well inside the bite reach (the steering stops a few px short).
          goal = { x: target.x - Math.sign(dx || 1) * this.reachX * .5, z: target.z };
        } else if (this.mode === 'owner') {
          goal = { x: owner.x + PRIMAL_STATS.followOffsetX * (owner.facing || 1), z: owner.z + PRIMAL_STATS.followOffsetZ };
          if (groundDistance(this, goal) <= PRIMAL_STATS.followDistance) goal = null;
        } else {
          // Autonomous: march toward the enemy side.
          goal = { x: this.x + (this.team === 'blue' ? 60 : -60), z: this.z };
        }
      }
    }
    this.steer(goal, speedMult, dt);
    this.integrate(dt, game);
  }

  // Siege presence: deploys with the Wizard, 24 s lane timer, last stand.
  updateSiegePresence(dt, game, match) {
    const presence = match.side(this.team).presence;
    if (presence === 'Deployed' && this.lastOwnerPresence !== 'Deployed' && !this.onLane) this.deployToLane(game, false);
    this.lastOwnerPresence = presence;
    if (!match.castleStands(this.team)) { if (!this.onLane) this.deployToLane(game, false); return; }
    if (this.onLane) {
      this.laneTime += dt;
      if (this.laneTime >= PRIMAL_STATS.laneDuration) this.returnToPlatform(game);
    }
  }

  steer(goal, speedMult, dt) {
    if (!goal) {
      this.vx = moveTowards(this.vx, 0, PRIMAL_STATS.speedX * 8 * dt);
      this.vz = moveTowards(this.vz, 0, PRIMAL_STATS.speedZ * 8 * dt);
      this.state = 'idle';
      return;
    }
    const dx = goal.x - this.x; const dz = (goal.z - this.z) * 150;
    const len = Math.hypot(dx, dz);
    if (len < PRIMAL_STATS.followBand) { this.vx = 0; this.vz = 0; this.state = 'idle'; return; }
    this.vx = dx / len * PRIMAL_STATS.speedX * speedMult;
    this.vz = dz / len * PRIMAL_STATS.speedZ * speedMult;
    if (Math.abs(dx) > 2) this.facing = Math.sign(dx);
    this.state = 'run';
  }

  startBite(target) {
    this.attack = { target, t: 0, struck: false };
    this.vx = 0; this.vz = 0; this.state = 'attack';
  }

  updateAttack(dt, game) {
    const a = this.attack; const bite = this.archetype === 'ape' ? PRIMAL_STATS.punch : PRIMAL_STATS.bite;
    a.t += dt;
    if (!a.struck && a.t >= bite.windup) {
      a.struck = true;
      const t = a.target;
      if (this.archetype === 'dragon') this.breathT = .4; // the Dragon breathes fire instead of biting
      if (t && !t.isDead && t.lifeState !== 'Dead' && Math.abs(t.x - this.x) <= this.reachX + 20 + (t.isObjective ? 40 : 0)) {
        t.takeDamage(Math.round(bite.damage * (this.archetype === 'dragon' ? 1.15 : 1)), this.facing * (bite.kx ?? 120), bite.lift ?? 30, .2, false, this.archetype === 'dragon' ? 'fire' : 'melee');
        combat.spawnHitSparks(t.x, (t.y ?? this.y) - 24, this.facing, this.info.variant, 6);
        audio.playSlash?.(1.7);
      }
    }
    if (a.t >= bite.windup + bite.active + bite.recovery) { this.attack = null; this.state = 'idle'; }
  }

  integrate(dt, game) {
    if (Math.abs(this.kbVelX) > .5) this.kbVelX -= Math.sign(this.kbVelX) * Math.min(Math.abs(this.kbVelX), 450 * dt); else this.kbVelX = 0;
    const px = this.x; const pz = this.z;
    this.x += (this.vx + this.kbVelX) * dt; this.z += this.vz * dt;
    game.battlefield.resolveEntityCollision(this);
    game.resolveSpellObstacles?.(this, px, pz);
    if (this.isFlying) { this.elevation = this.hoverHeight; this.grounded = false; this.vElevation = 0; }
  }

  render(ctx) {
    if (this.merged || this.recoveryTimer > 0) return;
    const x = this.x; const y = this.y; const f = this.facing;
    const bob = this.state === 'run' ? Math.abs(Math.sin(this.animTime * 12)) * 3 : Math.sin(this.animTime * 2.5) * 1;
    ctx.save();
    // Spirit glow.
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = this.info.aura + '.22)';
    ctx.beginPath(); ctx.ellipse(x, y - 14, 26, 16, 0, 0, Math.PI * 2); ctx.fill();
    if (this.interceptWindow > 0) {
      ctx.strokeStyle = this.info.aura + '.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y - 18, 24, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (this.archetype === 'dragon' && this.renderDragon(ctx)) { ctx.restore(); this.renderHealth(ctx); return; }
    ctx.translate(x, y - bob); ctx.scale(f * 1.35, 1.35);
    if (this.archetype === 'wolf') drawWolf(ctx, this.hitFlash > 0, this.state === 'attack', this.animTime);
    else if (this.archetype === 'ape') drawApe(ctx, this.hitFlash > 0, this.state === 'attack', this.animTime);
    else drawTurtle(ctx, this.hitFlash > 0, this.state === 'attack', this.animTime);
    ctx.restore();
    this.renderHealth(ctx);
  }

  renderHealth(ctx) {
    const x = this.x; const y = this.y - (this.isFlying ? 30 * this.bodyScale : 0);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(x - 16, y - 54, 32, 4);
    ctx.fillStyle = this.info.variant; ctx.fillRect(x - 16, y - 54, 32 * this.hp / this.maxHp, 4);
    ctx.restore();
  }

  // A serpentine spirit dragon (the hand-drawn dragon kit): the head leads, the body waves behind, a shadow on
  // the ground below; fire breath when it attacks. False when the kit is missing (fallback: the wolf body).
  renderDragon(ctx) {
    const look = dragonReady('ember') ? 'ember' : dragonReady('sun') ? 'sun' : null; if (!look) return false;
    const sc = this.bodyScale; const f = this.facing || 1; const t = this.animTime; const run = this.state === 'run';
    const gy = this.y + this.elevation; const hx = this.x + f * (this.rider ? 36 : 18) * sc; const hy = this.y - 8 * sc; // a rider sits on the fore body
    ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.ellipse(this.x - f * 10 * sc, gy, 34 * sc, 7 * sc, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const spine = [[hx, hy]]; for (let j = 1; j <= 16; j++) spine.push([hx - f * j * 6.5 * sc, hy + 6 * sc + Math.sin(t * (run ? 9 : 5) - j * .65) * (5 + j * .35) * sc - j * .4 * sc]);
    drawDragon(ctx, look, spine.slice(1), { thickness: .62 * sc, alpha: this.hitFlash > 0 ? .7 : 1, t });
    drawDragonHead(ctx, look, hx, hy, spine[0][0] - spine[1][0], spine[0][1] - spine[1][1], .55 * sc, this.breathT > 0 ? 1 : .15, 1);
    if (this.breathT > 0) drawBreathCone(ctx, hx + f * 12 * sc, hy + 2, f, (this.rider ? 150 : 90) * Math.min(1, Math.max(.2, (.45 - this.breathT) * 6 + .2)), t, .8);
    return true;
  }
}

function moveTowards(v, target, step) { return Math.abs(target - v) <= step ? target : v + Math.sign(target - v) * step; }

// Placeholder spirit bodies (Unity has no Primal art yet either).
function drawWolf(ctx, flash, biting, t) {
  const fur = flash ? '#ffffff' : '#7fbf8e'; const dark = flash ? '#ffffff' : '#3e6b4a';
  const leg = Math.sin(t * 12) * 3;
  ctx.fillStyle = dark;
  for (const [lx, ph] of [[-12, 1], [-6, -1], [8, 1], [13, -1]]) ctx.fillRect(lx, -10, 3, 10 + leg * ph * .4);
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.ellipse(0, -16, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Tail.
  ctx.beginPath(); ctx.moveTo(-14, -18); ctx.quadraticCurveTo(-26, -26 + Math.sin(t * 6) * 3, -24, -14); ctx.quadraticCurveTo(-20, -18, -14, -14); ctx.fill();
  // Head and muzzle.
  ctx.beginPath(); ctx.ellipse(16, -24, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(20, -26); ctx.lineTo(30, biting ? -20 : -22); ctx.lineTo(21, -18); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, -29); ctx.lineTo(14, -38); ctx.lineTo(18, -30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : '#f2d12e'; ctx.fillRect(18, -27, 3, 2);
}

function drawTurtle(ctx, flash, biting, t) {
  const shell = flash ? '#ffffff' : '#3f8fa8'; const skin = flash ? '#ffffff' : '#8fd3c7';
  const step = Math.sin(t * 8) * 2;
  ctx.fillStyle = skin;
  for (const [lx, ph] of [[-12, 1], [10, -1]]) ctx.fillRect(lx, -8, 6, 8 + step * ph * .3);
  ctx.beginPath(); ctx.ellipse(biting ? 22 : 19, -12, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shell;
  ctx.beginPath(); ctx.ellipse(0, -14, 18, 12, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = flash ? '#ffffff' : '#57e0f0'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(-4, -22); ctx.lineTo(4, -22); ctx.lineTo(10, -14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-18, -14); ctx.lineTo(18, -14); ctx.stroke();
  ctx.fillStyle = '#0d2b33'; ctx.fillRect(22, -14, 2, 2);
}

// Spirit ape: hunched white body, knuckle-walking arms, dark face, violet eyes;
// the front fist swings forward on a punch.
function drawApe(ctx, flash, punching, t) {
  const fur = flash ? '#ffffff' : '#e6e0f4'; const shade = flash ? '#ffffff' : '#b3a8d4'; const face = flash ? '#ffffff' : '#5e4f86';
  const step = Math.sin(t * 10) * 2;
  ctx.fillStyle = shade;
  ctx.fillRect(-12, -9, 5, 9 + step * .3); ctx.fillRect(-4, -9, 5, 9 - step * .3);   // hind legs
  ctx.fillRect(-16, -26, 6, 24);                                                     // back arm
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.moveTo(-16, -12); ctx.quadraticCurveTo(-18, -34, -2, -36); ctx.quadraticCurveTo(14, -34, 14, -22); ctx.lineTo(4, -10); ctx.closePath(); ctx.fill(); // hunched torso
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-12 + i * 6, -32 - (i === 1 ? 2 : 0)); ctx.lineTo(-14 + i * 6, -40 - (i % 2) * 3); ctx.lineTo(-8 + i * 6, -33); ctx.closePath(); ctx.fill(); } // fur spikes
  // Front arm: knuckles on the ground, or a punch forward.
  ctx.save(); ctx.translate(10, -24); ctx.rotate(punching ? -1.35 : 0); ctx.fillRect(-3, 0, 7, 20); ctx.beginPath(); ctx.arc(0.5, 22, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // Head low and forward: white brow, dark face, glowing eyes.
  ctx.beginPath(); ctx.ellipse(14, -28, 7, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = face; ctx.beginPath(); ctx.ellipse(17, -25, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : '#c9a8ff'; ctx.fillRect(15, -29, 2, 2); ctx.fillRect(19, -29, 2, 2);
  if (punching) { ctx.fillStyle = '#ffffff'; ctx.fillRect(16, -23, 4, 1); }
}

// ── Primal Bond on the Wizard ────────────────────────────────────────────
export function startPrimalBond(player, primal) {
  const form = bondForm(primal.archetype, primal.stage);
  player.primalBond = { archetype: primal.archetype, stage: primal.stage, form, windup: PRIMAL_STATS.bondWindup, active: false, fortified: 0, primal, flash: 0 };
  primal.vx = primal.vz = 0;
  combat.spawnShockwave(player.x, player.y - 30, 50, primal.info.variant);
  audio.playSpell?.('focus_ascendant');
  return player.primalBond;
}

export function endPrimalBond(player, reason = 'drained') {
  const bond = player.primalBond;
  if (!bond) return false;
  player.primalBond = null;
  const primal = bond.primal;
  if (primal) {
    primal.merged = false;
    const game = window.gameWorld;
    if (game?.battlefield) {
      const match = game.siegeMatch;
      primal.onLane = match ? match.isDeployed(primal.team) : true;
      primal.place(game, player.x + PRIMAL_STATS.followOffsetX * (player.facing || 1), player.z + PRIMAL_STATS.followOffsetZ);
    }
    combat.spawnShockwave(primal.x, primal.y - 16, 36, primal.info.variant);
  }
  if (reason === 'decouple' && player === window.gameWorld?.player) window.gameWorld?.showAnnouncement?.('PRIMAL BOND RELEASED', 1.1);
  return true;
}

// Per frame (from Player.update): wind-up, merge, Focus drain, Fortified.
export function updatePrimalBond(player, dt, drainPerSecond) {
  const bond = player.primalBond;
  if (!bond) return;
  if (!player.isAlive) { endPrimalBond(player, 'death'); return; }
  bond.flash = Math.max(0, bond.flash - dt * 4);
  if (!bond.active) {
    // Committed wind-up: the Primal rushes into the Wizard. If it falls, the bond fails.
    if (!bond.primal?.isAlive) { player.primalBond = null; return; }
    bond.windup -= dt;
    bond.primal.x += (player.x - bond.primal.x) * Math.min(1, dt * 10);
    bond.primal.z += (player.z - bond.primal.z) * Math.min(1, dt * 10);
    if (bond.windup <= 0) {
      bond.active = true;
      bond.primal.merged = true;
      combat.spawnShockwave(player.x, player.y - 34, 70, bond.primal.info.variant);
      combat.spawnShockwave(player.x, player.y - 34, 40, '#ffffff');
    }
    return;
  }
  bond.fortified = Math.max(0, bond.fortified - dt);
  player.focus = Math.max(0, player.focus - drainPerSecond * bond.form.drain * dt);
  if (player.focus <= 0) endPrimalBond(player, 'drained');
}

const activeBond = (player) => (player.primalBond?.active ? player.primalBond : null);
export const bondMoveMultiplier = (player) => activeBond(player)?.form.move ?? 1;
export const bondGainMultiplier = (player) => (player.primalBond ? .5 : 1);
// Ape: heavier fists while bonded (melee damage / knockback multipliers).
export function bondMelee(player) {
  const bond = activeBond(player);
  return bond?.archetype === 'ape' ? { dmg: bond.form.punch, kx: bond.form.knock } : null;
}
// Ape Spirit Slam: a chest-drum quake around the impact hits every foe nearby.
export function primalQuake(player, quake, game = window.gameWorld) {
  const x = player.x + (player.facing || 1) * 30; let n = 0;
  for (const t of game?.getHostileTargets?.(player.team, true) ?? []) {
    if (t.isDead || t.lifeState === 'Dead' || (t.hp ?? 1) <= 0) continue;
    if (Math.hypot(t.x - x, ((t.z ?? player.z) - player.z) * 150) > quake.radius) continue;
    t.takeDamage(quake.damage, Math.sign(t.x - x || player.facing || 1) * 260, 160, .45, false, 'spell'); n++;
  }
  combat.spawnShockwave(x, player.y - 4, quake.radius, PRIMAL_ARCHETYPES.ape.variant);
  combat.spawnShockwave(x, player.y - 4, quake.radius * .6, '#ffffff');
  combat.shakeCamera?.(6, .18);
  return n;
}
// Turtle: less displacement taken (Fortified after a block is stronger still).
export function bondDisplacement(player) {
  const bond = activeBond(player);
  if (!bond) return 1;
  return bond.fortified > 0 ? bond.form.fortified : bond.form.shellGuard;
}
export function bondOnBlock(player) {
  const bond = activeBond(player);
  if (bond && bond.form.fortifiedDuration > 0) bond.fortified = bond.form.fortifiedDuration;
}
// Sprint attack variant: Primal Pounce (wolf) / Shell Rush (turtle) / Spirit Slam (ape).
export function primalSprintVariant(player) {
  const bond = activeBond(player);
  if (!bond) return null;
  bond.flash = 1;
  if (bond.archetype === 'ape') return { name: 'SPIRIT SLAM', primal: true, carryMult: 1, recoilMult: bond.form.slam, lift: 80, quake: bond.form.quake, color: PRIMAL_ARCHETYPES.ape.variant };
  return bond.archetype === 'wolf'
    ? { name: 'PRIMAL POUNCE', primal: true, carryMult: bond.form.pounceCarry, recoilMult: 1, color: PRIMAL_ARCHETYPES.wolf.variant }
    : { name: 'SHELL RUSH', primal: true, carryMult: 1, recoilMult: bond.form.shellRushPush, color: PRIMAL_ARCHETYPES.turtle.variant };
}

// Bond Form ENERGY OVERLAY (stage I; stages II / III reuse it at higher intensity):
// layered spirit-fur / shell-plate VFX from primal_bond_vfx.js, plus the old
// rising aura streaks as a faint base.
export function renderPrimalBond(ctx, player, renderY, layer = 'back') {
  const bond = player.primalBond;
  if (!bond) return;
  renderBondOverlay(ctx, player, renderY, layer, bond);
  if (layer !== 'back') return;
  const info = PRIMAL_ARCHETYPES[bond.archetype];
  const intensity = bond.active ? 1 : .65;
  const width = bond.form.presentation === 'replacement' ? 6 : 2.5;
  const t = player.animTime ?? 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const phase = (t * (3.4 + .4 * i) + 1.1 * i) % 1;
    const sx = player.x + (i - 1) * 12;
    const sy = renderY - 8 - phase * 70;
    ctx.strokeStyle = info.aura + (.85 * intensity * Math.sin(phase * Math.PI)) + ')';
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(sx, sy + 18); ctx.lineTo(sx, sy); ctx.stroke();
  }
  if (bond.flash > 0) {
    ctx.strokeStyle = info.variant; ctx.globalAlpha = bond.flash; ctx.lineWidth = 4;
    const f = player.facing || 1;
    ctx.beginPath(); ctx.moveTo(player.x + f * 10, renderY - 34); ctx.lineTo(player.x + f * (10 + 55 * bond.flash), renderY - 34); ctx.stroke();
  }
  ctx.restore();
}
