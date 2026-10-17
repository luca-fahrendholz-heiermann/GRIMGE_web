// GRIMGE Prototype — Primals: the Wizard's own spirit companion and the
// Primal Bond transformation (port of Unity GRIMGE).
//
// Source: C:\Dev\unity_projects\GRIMGE — Documentation/Gameplay/
// PrimalCompanionSystem.md, Code/Gameplay/Companions/PetCompanionRuntime.cs,
// PrimalBondRuntime.cs, WolfBondProfile.cs, TurtleBondProfile.cs and the
// BondForms/*.asset values.
//
// A Primal is a supernatural spirit creature, not a pet: two archetypes
// (Wolf, Turtle) with three evolution stages each.
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
//    (sprint attack pushes further).
// Distances: 24 px per Unity unit, 6 u lane depth = z 0…1. Health and bite
// damage are scaled ×3 to the prototype's health scale (Wizard 320 HP vs.
// Unity 100).
import { audio } from './audio.js';
import { combat } from './combat.js';
import { GroundEntity, groundDistance } from './world.js';
import { SIEGE_ZONES } from './siege_match.js';

const U = 24;                 // px per Unity unit (lateral)
const UZ = 1 / 6;             // z per Unity unit (depth)
const HP_SCALE = 3;

export const PRIMAL_ARCHETYPES = Object.freeze({
  wolf: Object.freeze({ id: 'wolf', name: 'PRIMAL WOLF', role: 'HUNTER', aura: 'rgba(115,235,71,', variant: '#f2d12e' }),
  turtle: Object.freeze({ id: 'turtle', name: 'PRIMAL TURTLE', role: 'BULWARK', aura: 'rgba(56,173,209,', variant: '#57e0f0' })
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
  ])
});

export const PRIMAL_STATS = Object.freeze({
  hp: 55 * HP_SCALE,
  speedX: 5.3 * U, speedZ: 3.4 * UZ,
  bite: Object.freeze({ damage: 6 * HP_SCALE, windup: .1, active: .08, recovery: .42 }),
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
  }

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
          if (Math.abs(dx) <= PRIMAL_STATS.attackReachX + (target.isObjective ? 40 : 0) && Math.abs(target.z - this.z) <= PRIMAL_STATS.attackReachZ + .05) {
            this.facing = Math.sign(dx) || this.facing;
            this.startBite(target);
            this.integrate(dt, game);
            return;
          }
          // Close in well inside the bite reach (the steering stops a few px short).
          goal = { x: target.x - Math.sign(dx || 1) * PRIMAL_STATS.attackReachX * .5, z: target.z };
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
    const a = this.attack; const bite = PRIMAL_STATS.bite;
    a.t += dt;
    if (!a.struck && a.t >= bite.windup) {
      a.struck = true;
      const t = a.target;
      if (t && !t.isDead && t.lifeState !== 'Dead' && Math.abs(t.x - this.x) <= PRIMAL_STATS.attackReachX + 20 + (t.isObjective ? 40 : 0)) {
        t.takeDamage(bite.damage, this.facing * 120, 30, .2, false, 'melee');
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
    ctx.translate(x, y - bob); ctx.scale(f * 1.35, 1.35);
    if (this.archetype === 'wolf') drawWolf(ctx, this.hitFlash > 0, this.state === 'attack', this.animTime);
    else drawTurtle(ctx, this.hitFlash > 0, this.state === 'attack', this.animTime);
    ctx.restore();
    // Health.
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(x - 16, y - 54, 32, 4);
    ctx.fillStyle = this.info.variant; ctx.fillRect(x - 16, y - 54, 32 * this.hp / this.maxHp, 4);
    ctx.restore();
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
// Sprint attack variant: Primal Pounce (wolf) / Shell Rush (turtle).
export function primalSprintVariant(player) {
  const bond = activeBond(player);
  if (!bond) return null;
  bond.flash = 1;
  return bond.archetype === 'wolf'
    ? { name: 'PRIMAL POUNCE', primal: true, carryMult: bond.form.pounceCarry, recoilMult: 1, color: PRIMAL_ARCHETYPES.wolf.variant }
    : { name: 'SHELL RUSH', primal: true, carryMult: 1, recoilMult: bond.form.shellRushPush, color: PRIMAL_ARCHETYPES.turtle.variant };
}

// Bond aura: three rising streaks (wider in the full-replacement stages)
// and a horizontal flash in front during a Pounce / Shell Rush.
export function renderPrimalBond(ctx, player, renderY) {
  const bond = player.primalBond;
  if (!bond) return;
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
