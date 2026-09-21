// GRIMGE Prototype — 2.5D actors, combat state, lane AI, and structures.
import { sprites } from './sprites.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { spells } from './spells.js';
import { ARENA_LAYOUT, ENTITY_VISUALS, GroundEntity, groundDistance } from './world.js';

const ACTION_STATES = new Set(['attack1', 'attack2', 'attack3', 'uppercut', 'heavyStrike', 'dive', 'dash', 'hurt']);
// Deliberately the shared prototype baseline, not the future weapon system.
// Every future weapon may replace this table, but must retain its timing and
// input contract unless its own combo specification explicitly says otherwise.
export const MELEE_BASELINE = Object.freeze({
  normal: Object.freeze([
    Object.freeze({ state: 'attack1', time: .22, vx: 180, damage: 28, knockback: 220, lift: 100, radius: 40, color: '#fff', glow: '#ffd54f' }),
    Object.freeze({ state: 'attack2', time: .24, vx: 220, damage: 34, knockback: 260, lift: 140, radius: 44, color: '#fff', glow: '#ff9800' }),
    Object.freeze({ state: 'attack3', time: .35, vx: 320, damage: 52, knockback: 480, lift: 320, radius: 54, color: '#ffd700', glow: '#ff3d00', finisher: true })
  ]),
  bufferWindow: .13,
  uppercut: Object.freeze({ time: .28, damage: 40, knockback: 140, lift: 480 }),
  heavy: Object.freeze({ time: .34, damage: 48, knockback: 620, lift: 170 }),
  dive: Object.freeze({ time: .35, damage: 55, knockback: 200, lift: -300 })
});
// z is projected more strongly than x, but needs to stay quick enough for
// brawler-style depth dodges and lane changes.
const DEPTH_SPEED = 1.15;
const DASH_SPEED = 720;
const DASH_DEPTH_SPEED = 4.2;

function moveVector(input) {
  if (input.move) return { x: input.move.x, z: input.move.z };
  return {
    x: (input.keys?.KeyD || input.keys?.ArrowRight ? 1 : 0) - (input.keys?.KeyA || input.keys?.ArrowLeft ? 1 : 0),
    z: (input.keys?.KeyS || input.keys?.ArrowDown ? 1 : 0) - (input.keys?.KeyW || input.keys?.ArrowUp ? 1 : 0)
  };
}

function normalizeMove(move) {
  const magnitude = Math.hypot(move.x, move.z);
  return magnitude > 1 ? { x: move.x / magnitude, z: move.z / magnitude } : move;
}

function isUpperCastleBattlement(entity) {
  return entity?.surfaceId === 'blueCastleUpperPlatform' || entity?.surfaceId === 'redCastleUpperPlatform';
}

function objectiveApproachZ(minion, objective) {
  // A lane remains a preference, not a rail. When marching on a structure,
  // guide each lane into the structure's reachable depth band so front-lane
  // fighters do not stall forever outside a rear-wall Tower's hit volume.
  // Ranged bolts keep a narrow depth hit tolerance, so objective approach is
  // intentionally tighter than the large melee contact band. This lets every
  // lane join a siege without ranged minions firing harmlessly past a Tower.
  // Preserve the broad three-lane silhouette while a wave is still crossing
  // the arena. It folds toward the objective only in the final approach, so
  // minions do not prematurely collapse into a single rear-wall train.
  if (Math.abs(objective.x - minion.x) > 108) return minion.preferredZ;
  const reach = Math.max(0.12, Math.min(0.16, (objective.hitRadiusZ ?? 0.25) - 0.06));
  return Math.max(objective.z - reach, Math.min(objective.z + reach, minion.preferredZ));
}

export class Player extends GroundEntity {
  constructor(x, z) {
    super(x, z);
    this.width = ENTITY_VISUALS.heroColliderWidth;
    this.height = ENTITY_VISUALS.heroColliderHeight;
    this.facing = 1;
    this.team = 'blue';
    this.isMobileCombatant = true;
    this.heroKey = 'paladin';
    // Player durability has to support fast brawler scrums. Enemy champions
    // start at 280 HP and minion damage stacks quickly across three lanes, so
    // this gives the player time to dash, block and reposition without
    // changing attack cadence, enemy damage or movement speed.
    this.maxHp = 320; this.hp = 320;
    this.maxMp = 100; this.mp = 100;
    this.maxSp = 100; this.sp = 100;
    this.moveSpeed = 340;
    this.depthSpeed = DEPTH_SPEED;
    this.jumpForce = 580;
    this.jumpsLeft = 2;
    this.state = 'idle';
    this.stateTimer = 0;
    this.animTime = 0;
    this.hitFlash = 0;
    this.invulnerableTimer = 0;
    this.freezeTimer = 0;
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.comboStep = 0;
    this.comboResetTimer = 0;
    this.queuedAttack = null;
    this.attackBufferTimer = 0;
    this.canAttack = true;
    // Rune cards (the three cards in the hand) deliberately stay separate
    // from prepared spell components. Drawing a card consumes that *card*,
    // sends it to the back of the deck and immediately replaces it. The
    // resulting rune is then placed in one of the three spell-component
    // slots. They must never be the same array.
    this.runeHand = [];
    this.preparedRunes = [];
    this.slottedSpells = [];
    this.selectedSpellIndex = 0;
    this.runeDeck = [];
    this.nextRuneCardId = 1;
    this.auraShockCooldown = 0;
    this.arcaneShield = 0;
    this.arcaneShieldTimer = 0;
    this.arcaneShieldCooldown = 0;
    this.eidolonTimer = 0;
    this.eidolonCooldown = 0;
    this.eidolonPower = 1;
    this.eidolonArmor = 0;
    this.ninefoldTimer = 0;
    this.ninefoldCooldown = 0;
    this.ninefoldPower = 1;
    this.focus = 0;
    this.maxFocus = 100;
    this.focusTransformTimer = 0;
    this.focusTransformPower = 1;
    this.isGuarding = false;
    // Physical guarding deliberately has a hidden stability meter.  It is
    // not another HUD resource: it only exists to prevent permanently
    // holding SHIELD through a whole melee crowd.
    this.guardStability = 100;
    this.guardHoldTime = 0;
    this.guardBreakTimer = 0;
    this.ghosts = [];
    this.lifeState = 'Alive';
    this.respawnTimer = 0;
    this.respawnDuration = 3;
    this.mountedSummon = null;
  }

  get isAlive() { return this.lifeState === 'Alive'; }

  setHero(heroKey) {
    if (!this.isAlive || !sprites.sprites[heroKey]) return;
    this.heroKey = heroKey;
    audio.playSlash(1.3);
    combat.spawnShockwave(this.x, this.y - 25, 40, '#ffd700');
  }

  update(dt, input, battlefield, gameWorld = null) {
    this.animTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.updateGhosts(dt);

    if (this.lifeState === 'Dying') {
      this.stateTimer -= dt;
      this.integrateElevation(dt);
      if (this.stateTimer <= 0) {
        this.lifeState = 'Dead';
        this.state = 'dead';
        this.respawnTimer = gameWorld?.canRespawn(this.team) === false ? Infinity : this.respawnDuration;
        if (!Number.isFinite(this.respawnTimer)) gameWorld?.onFinalWizardDeath(this.team);
      }
      return;
    }
    if (this.lifeState === 'Dead') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn(battlefield);
      return;
    }

    if (this.mountedSummon?.isDead || this.mountedSummon?.rider !== this) this.dismount();

    this.mp = Math.min(this.maxMp, this.mp + dt * 14);
    this.sp = Math.min(this.maxSp, this.sp + dt * 25);
    this.auraShockCooldown = Math.max(0, this.auraShockCooldown - dt);
    this.arcaneShieldTimer = Math.max(0, this.arcaneShieldTimer - dt);
    this.arcaneShieldCooldown = Math.max(0, this.arcaneShieldCooldown - dt);
    this.eidolonTimer = Math.max(0, this.eidolonTimer - dt);
    this.eidolonCooldown = Math.max(0, this.eidolonCooldown - dt);
    if (this.eidolonTimer <= 0) { this.eidolonPower = 1; this.eidolonArmor = 0; }
    this.ninefoldTimer = Math.max(0, this.ninefoldTimer - dt);
    this.ninefoldCooldown = Math.max(0, this.ninefoldCooldown - dt);
    if (this.ninefoldTimer <= 0) this.ninefoldPower = 1;
    this.focusTransformTimer = Math.max(0, this.focusTransformTimer - dt);
    if (this.focusTransformTimer <= 0) this.focusTransformPower = 1;
    this.attackBufferTimer = Math.max(0, this.attackBufferTimer - dt);
    if (this.attackBufferTimer <= 0) this.queuedAttack = null;
    this.guardBreakTimer = Math.max(0, this.guardBreakTimer - dt);
    if (this.arcaneShieldTimer <= 0) this.arcaneShield = 0;
    this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    if (this.slowTimer <= 0) this.slowFactor = 1;
    this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
    if (this.comboResetTimer <= 0) this.comboStep = 0;

    if (ACTION_STATES.has(this.state)) {
      this.stateTimer -= dt;
      if (this.state === 'dash' && Math.random() < 0.6) {
        this.ghosts.push({ x: this.x, y: this.y, z: this.z, elevation: this.elevation, facing: this.facing, alpha: 0.5, state: this.state, animTime: this.animTime });
      }
      if (this.stateTimer <= 0) this.finishAction(input);
    }

    const controlsBlocked = input.gameplayBlocked || this.freezeTimer > 0 || this.state === 'hurt' || !this.isAlive;
    const isAction = ACTION_STATES.has(this.state) && this.state !== 'hurt';
    // SHIELD is a held, physical front guard. It has no mana cost and is
    // deliberately different from the temporary rune-created Arcane Aegis.
    const guardRequested = !!(input.keys?.KeyF || input.guardHeld);
    const wasGuarding = this.isGuarding;
    this.isGuarding = !controlsBlocked && !isAction && this.grounded
      && guardRequested && this.sp > 0 && this.guardBreakTimer <= 0;
    if (this.isGuarding) {
      this.guardHoldTime = wasGuarding ? this.guardHoldTime + dt : 0;
      this.sp = Math.max(0, this.sp - dt * 8);
      this.state = 'guard';
    } else {
      this.guardHoldTime = 0;
      // Recovery is intentionally invisible and only happens while the
      // shield is down.  A player must release the shield after a break.
      this.guardStability = Math.min(100, this.guardStability + dt * 28);
    }
    const riding = this.isMounted;
    if (riding) {
      this.updateMountedMovement(dt, input, battlefield, gameWorld, controlsBlocked || isAction);
    } else {
      if (!controlsBlocked && !isAction) this.handleMovementInput(dt, input);
      // Air movement remains available, but jump elevation never changes z by itself.
      this.integrateElevation(dt, 1250);
      const previousX = this.x; const previousZ = this.z;
      this.x += this.vx * dt;
      this.z += this.vz * dt;
      battlefield.resolveEntityCollision(this);
      gameWorld?.resolveSpellObstacles(this, previousX, previousZ);
      if (this.grounded) this.jumpsLeft = 2;
      if (!this.grounded && !ACTION_STATES.has(this.state)) this.state = this.vElevation > 0 ? 'jump' : 'fall';
    }
  }

  get isMounted() { return !!this.mountedSummon && !this.mountedSummon.isDead && this.mountedSummon.rider === this; }

  mount(summon) {
    if (!this.isAlive || this.isMounted || !summon?.definition?.mountable || summon.isDead || summon.team !== this.team || summon.rider) return false;
    this.mountedSummon = summon;
    summon.rider = this;
    this.isGuarding = false;
    this.syncToMount();
    return true;
  }

  dismount() {
    const mount = this.mountedSummon;
    if (!mount) return false;
    if (mount.rider === this) mount.rider = null;
    this.mountedSummon = null;
    this.vx = mount.vx ?? 0;
    this.vz = mount.vz ?? 0;
    return true;
  }

  syncToMount() {
    const mount = this.mountedSummon;
    if (!mount) return;
    this.x = mount.x; this.z = mount.z;
    this.surfaceId = mount.surfaceId;
    this.surfaceHeight = mount.surfaceHeight;
    this.elevation = mount.elevation;
    this.vElevation = mount.vElevation;
    this.grounded = mount.grounded;
    this.facing = mount.facing || this.facing;
  }

  updateMountedMovement(dt, input, battlefield, gameWorld, blocked) {
    const mount = this.mountedSummon;
    if (!mount) return;
    // Jump is a quick dismount. This keeps elevated Castle routes and combat
    // readable without giving ground summons fake flight physics.
    if (!blocked && input.justPressed('Space')) {
      this.dismount();
      this.vElevation = this.jumpForce;
      this.grounded = false;
      this.state = 'jump';
      this.jumpsLeft = Math.max(0, this.jumpsLeft - 1);
      audio.playJump();
      combat.spawnDust(this.x, this.y, 3);
      return;
    }
    const move = blocked ? { x: 0, z: 0 } : normalizeMove(moveVector(input));
    const moving = Math.hypot(move.x, move.z) > .05;
    // Mount movement is intentionally a build modifier rather than a
    // separate control scheme: Spirit Bond improves every rideable summon.
    const speed = (mount.definition.mountSpeed ?? mount.speed) * (this.buildModifiers?.mountSpeed ?? 1);
    const previousX = mount.x; const previousZ = mount.z;
    mount.vx = moving ? move.x * speed : 0;
    mount.vz = moving ? move.z * speed / 150 : 0;
    if (Math.abs(move.x) > .02) mount.facing = Math.sign(move.x);
    mount.x += mount.vx * dt;
    mount.z += mount.vz * dt;
    mount.state = moving ? 'run' : 'idle';
    battlefield.resolveEntityCollision(mount);
    gameWorld?.resolveSpellObstacles(mount, previousX, previousZ);
    this.syncToMount();
    this.state = moving && !ACTION_STATES.has(this.state) ? 'run' : this.state;
    if (!moving && this.state === 'run') this.state = 'idle';
  }

  handleMovementInput(dt, input) {
    const move = normalizeMove(moveVector(input));
    if (Math.abs(move.x) > 0.02) this.facing = Math.sign(move.x);
    const guardSpeed = this.isGuarding ? 0.38 : 1;
    const beastSpeed = this.ninefoldTimer > 0 ? 1.23 : 1;
    const focusSpeed = this.focusTransformTimer > 0 ? 1.12 : 1;
    const targetX = move.x * this.moveSpeed * this.slowFactor * guardSpeed * beastSpeed * focusSpeed;
    const targetZ = move.z * this.depthSpeed * this.slowFactor * guardSpeed * beastSpeed * focusSpeed;
    this.vx += (targetX - this.vx) * Math.min(1, dt * 18);
    this.vz += (targetZ - this.vz) * Math.min(1, dt * 18);
    if (Math.hypot(move.x, move.z) > 0.05 && this.grounded) {
      this.state = 'run';
      if (Math.random() < 0.18) combat.spawnDust(this.x, this.y, 1);
    } else if (this.grounded && (this.state === 'run' || this.state === 'guard')) this.state = this.isGuarding ? 'guard' : 'idle';

    if (!this.isGuarding && input.justPressed('Space') && this.jumpsLeft > 0) {
      this.jumpsLeft--;
      this.vElevation = this.jumpForce;
      this.grounded = false;
      this.state = 'jump';
      audio.playJump();
      combat.spawnDust(this.x, this.y, 3);
    }
    if (!this.isGuarding && (input.justPressed('ShiftLeft') || input.justPressed('ShiftRight')) && this.sp >= 25) {
      this.sp -= 25;
      this.state = 'dash'; this.stateTimer = 0.26; this.invulnerableTimer = 0.28;
      const dashMove = normalizeMove(moveVector(input));
      const dashHasDirection = Math.hypot(dashMove.x, dashMove.z) > 0.08;
      // Dash in the current 2.5D movement direction. Facing remains the
      // intentional fallback when the player dashes without a movement input.
      this.vx = dashHasDirection ? dashMove.x * DASH_SPEED : this.facing * DASH_SPEED;
      this.vz = dashHasDirection ? dashMove.z * DASH_DEPTH_SPEED : 0;
      audio.playDash();
      combat.spawnShockwave(this.x, this.y - 25, 30, '#ffd700');
    }
    if (input.justPressed('KeyJ') || input.justPressed('Mouse0')) this.executeAttack(input);
  }

  finishAction(input = null) {
    if (!this.isAlive) return;
    this.state = this.grounded ? 'idle' : (this.vElevation > 0 ? 'jump' : 'fall');
    this.stateTimer = 0;
    this.canAttack = true;
    if (this.queuedAttack && this.attackBufferTimer > 0) {
      const queued = this.queuedAttack;
      this.queuedAttack = null;
      this.attackBufferTimer = 0;
      this.executeAttack(input ?? { move: { x: 0, z: 0 }, keys: {} }, queued);
    }
  }

  executeAttack(input, attackKind = 'normal') {
    if (!this.isAlive || this.isGuarding || !window.gameWorld?.isMatchRunning?.()) return false;
    if (ACTION_STATES.has(this.state) || !this.canAttack) {
      const canBuffer = attackKind === 'normal' && /^attack[123]$/.test(this.state) && this.stateTimer <= MELEE_BASELINE.bufferWindow;
      if (canBuffer) {
        this.queuedAttack = 'normal';
        this.attackBufferTimer = MELEE_BASELINE.bufferWindow + .10;
      }
      return canBuffer;
    }
    this.canAttack = false;
    const move = moveVector(input);
    if (attackKind === 'uppercut' || input.keys?.KeyU) {
      this.state = 'uppercut'; this.stateTimer = MELEE_BASELINE.uppercut.time; this.vElevation = 280;
      audio.playSlash(1.2);
      combat.spawnSlashArc(this.x, this.y - 25, this.facing, { radius: 46, angleStart: -1.2, angleEnd: 0.6, color: '#ffea00', glow: '#ff9800' });
      this.triggerMeleeHitbox(MELEE_BASELINE.uppercut.damage, this.facing * MELEE_BASELINE.uppercut.knockback, MELEE_BASELINE.uppercut.lift, 0.5);
      return true;
    }
    if (!this.grounded && (attackKind === 'dive' || move.z > 0.55)) {
      this.state = 'dive'; this.stateTimer = MELEE_BASELINE.dive.time; this.vElevation = -850;
      audio.playSlash(0.9);
      combat.spawnSlashArc(this.x, this.y - 15, this.facing, { radius: 50, angleStart: 0.8, angleEnd: 2.2, color: '#ff5722', glow: '#d50000' });
      this.triggerMeleeHitbox(MELEE_BASELINE.dive.damage, this.facing * MELEE_BASELINE.dive.knockback, MELEE_BASELINE.dive.lift, 0.6);
      return true;
    }
    if (attackKind === 'heavy') {
      this.state = 'heavyStrike'; this.stateTimer = MELEE_BASELINE.heavy.time; this.vx = this.facing * 360;
      audio.playSlash(0.78);
      combat.spawnSlashArc(this.x + this.facing * 28, this.y - 25, this.facing, { radius: 58, angleStart: -0.9, angleEnd: 0.9, color: '#ffd54f', glow: '#ff6d00', width: 7 });
      this.triggerMeleeHitbox(MELEE_BASELINE.heavy.damage, this.facing * MELEE_BASELINE.heavy.knockback, MELEE_BASELINE.heavy.lift, 0.48, true);
      return true;
    }
    this.comboStep = (this.comboStep % 3) + 1;
    this.comboResetTimer = 0.65;
    const attack = MELEE_BASELINE.normal[this.comboStep - 1];
    this.state = attack.state; this.stateTimer = attack.time; this.vx = this.facing * attack.vx;
    audio.playSlash(this.comboStep === 3 ? 0.85 : 1 + this.comboStep * 0.1);
    combat.spawnSlashArc(this.x + this.facing * 22, this.y - 28, this.facing, { radius: attack.radius, color: attack.color, glow: attack.glow, width: attack.finisher ? 7 : 4 });
    this.triggerMeleeHitbox(attack.damage, this.facing * attack.knockback, attack.lift, attack.finisher ? 0.6 : 0.4, !!attack.finisher);
    return true;
  }

  triggerMeleeHitbox(dmg, kx, lift, stunDuration, isFinisher = false) {
    if (this.eidolonTimer > 0) {
      dmg *= 1.30 * this.eidolonPower;
      kx *= 1.18;
      lift *= 1.12;
    }
    if (this.ninefoldTimer > 0) {
      dmg *= 1.38 * this.ninefoldPower;
      kx *= 1.30;
      lift *= 1.18;
    }
    if (this.focusTransformTimer > 0) {
      dmg *= 1.18 * this.focusTransformPower;
      kx *= 1.14;
      lift *= 1.10;
    }
    const targets = window.gameWorld?.getHostileTargets(this.team, true) ?? [];
    let hitAny = false; let hitCount = 0;
    for (const target of targets) {
      if (isUpperCastleBattlement(this) && isUpperCastleBattlement(target) && target.heroKey) continue;
      const inFront = (target.x - this.x) * this.facing >= -10 && Math.abs(target.x - this.x) <= (target.hitRadiusX ?? 78);
      const closeDepth = Math.abs((target.z ?? this.z) - this.z) <= (target.hitRadiusZ ?? 0.22);
      const heightDifference = Math.abs((target.worldHeight ?? target.elevation ?? 0) - this.worldHeight);
      const verticalReach = target.hitHeightTolerance ?? (target.isObjective ? 120 : 70);
      if (inFront && closeDepth && heightDifference <= verticalReach) {
        target.takeDamage(dmg, kx, lift, stunDuration, isFinisher);
        combat.spawnHitSparks(target.x, target.y - 25, this.facing, isFinisher ? '#ffea00' : '#fff', isFinisher ? 16 : 8);
        hitAny = true; hitCount++;
      }
    }
    if (hitAny) {
      this.gainFocus(Math.min(16, 5 + hitCount * (isFinisher ? 4 : 3)), isFinisher ? 'FINISHER' : 'MELEE');
      audio.playImpact(isFinisher);
      combat.triggerHitstop(isFinisher ? 6 : 4);
      combat.shakeCamera(isFinisher ? 8 : 4, 0.2);
    }
  }

  takeDamage(amount, kx = 0, lift = 0, stun = 0.3, isCrit = false, hitKind = 'melee') {
    if (!this.isAlive || this.invulnerableTimer > 0) return { ignored: true };
    // Knockback points away from the attacker, so its inverse identifies the
    // attacker's approach direction. Only an attack from the held shield's
    // front receives the physical guard reduction.
    const incomingFromFront = Math.abs(kx) > 0.01 && Math.sign(-kx) === this.facing;
    if (this.isGuarding && incomingFromFront && hitKind === 'spell' && this.guardHoldTime <= 0.18) {
      // The first fraction of a held guard is a precise parry moment.  The
      // caller receives this result and reverses a reflectable projectile.
      combat.spawnHitSparks(this.x + this.facing * 26, this.y - 42, this.facing, '#e1f5fe', 14);
      combat.spawnShockwave(this.x + this.facing * 24, this.y - 40, 32, '#80d8ff');
      audio.playImpact(true);
      return { blocked: true, perfect: true };
    }
    if (this.isGuarding && incomingFromFront) {
      if (hitKind === 'melee') {
        this.guardStability = Math.max(0, this.guardStability - 10);
        if (this.guardStability <= 0) {
          this.isGuarding = false;
          this.guardHoldTime = 0;
          this.guardBreakTimer = 0.7;
          this.state = 'hurt'; this.stateTimer = 0.7; this.canAttack = false;
          this.vx = -this.facing * 110; this.vElevation = 35;
          combat.spawnShockwave(this.x, this.y - 28, 46, '#ffca28');
          combat.spawnDamageText(this.x, this.y - 56, 'BREAK', { color: '#ffca28', isCrit: true });
          return { blocked: true, guardBroken: true };
        }
      }
      const guardedAmount = Math.max(1, Math.ceil(amount * 0.22));
      this.sp = Math.max(0, this.sp - (6 + amount * 0.25));
      amount = guardedAmount;
      kx *= 0.12; lift *= 0.12; stun *= 0.18;
      combat.spawnHitSparks(this.x + this.facing * 24, this.y - 38, this.facing, '#7de8ff', 7);
      combat.spawnShockwave(this.x + this.facing * 22, this.y - 38, 18, '#4fc3f7');
    }
    if (this.arcaneShield > 0) {
      const absorbed = Math.min(amount, this.arcaneShield);
      this.arcaneShield -= absorbed;
      amount -= absorbed;
      combat.spawnElementalParticles(this.x, this.y - 35, 'fulgur', 6);
      if (this.arcaneShield <= 0) { this.arcaneShield = 0; this.arcaneShieldTimer = 0; combat.spawnShockwave(this.x, this.y - 30, 44, '#b388ff'); }
      if (amount <= 0) return { blocked: true };
    }
    if (this.eidolonTimer > 0) {
      amount *= 1 - this.eidolonArmor;
      kx *= .72;
      lift *= .78;
      combat.spawnElementalParticles(this.x, this.y - 38, 'void', 4);
    }
    if (this.ninefoldTimer > 0) {
      amount *= .88;
      kx *= .88;
    }
    if (this.focusTransformTimer > 0) {
      amount *= .86;
      kx *= .82;
      lift *= .88;
    }
    // Passive build modifiers are applied after temporary forms/shields so
    // every incoming source shares the same final damage rule.
    amount *= this.buildModifiers?.damageTaken ?? 1;
    const receivedWhileGuarding = this.isGuarding && incomingFromFront;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.15; this.vx = kx; this.vElevation = lift;
    this.state = 'hurt'; this.stateTimer = stun; this.canAttack = false;
    // A tiny post-hit grace window prevents an overlapping minion pack from
    // deleting the player in one simulation tick. It is shorter than a combo
    // beat and leaves aggression / chase gameplay intact.
    if (!receivedWhileGuarding) this.invulnerableTimer = Math.max(this.invulnerableTimer, 0.18);
    audio.playImpact(isCrit);
    combat.spawnDamageText(this.x, this.y - 45, amount, { isCrit, color: '#ff5252' });
    combat.shakeCamera(isCrit ? 9 : 5, 0.25);
    if (this.hp <= 0) this.beginDeath();
    return { blocked: false };
  }

  beginDeath() {
    this.dismount();
    window.gameWorld?.recordWizardDeath?.(this.team);
    this.lifeState = 'Dying';
    this.state = 'dead'; this.stateTimer = 0.45; this.canAttack = false; this.isGuarding = false;
    this.vx = 0; this.vz = 0; this.clearPreparedRunes();
    combat.spawnShockwave(this.x, this.y - 25, 60, '#ff1744');
  }

  respawn(battlefield) {
    this.dismount();
    const spawn = battlefield?.getSpawn(this.team) ?? ARENA_LAYOUT.spawns.player;
    this.x = spawn.x; this.z = spawn.z; this.elevation = 0;
    this.vx = 0; this.vz = 0; this.vElevation = 0;
    this.hp = this.maxHp; this.mp = this.maxMp; this.sp = this.maxSp;
    this.state = 'idle'; this.stateTimer = 0; this.comboStep = 0; this.comboResetTimer = 0; this.queuedAttack = null; this.attackBufferTimer = 0;
    this.canAttack = true; this.freezeTimer = 0; this.slowTimer = 0; this.slowFactor = 1;
    this.invulnerableTimer = 1.25; this.auraShockCooldown = 0; this.arcaneShield = 0; this.arcaneShieldTimer = 0; this.arcaneShieldCooldown = 0; this.eidolonTimer = 0; this.eidolonCooldown = 0; this.eidolonPower = 1; this.eidolonArmor = 0; this.ninefoldTimer = 0; this.ninefoldCooldown = 0; this.ninefoldPower = 1; this.focus = 0; this.focusTransformTimer = 0; this.focusTransformPower = 1; this.isGuarding = false; this.guardStability = 100; this.guardHoldTime = 0; this.guardBreakTimer = 0; this.jumpsLeft = 2; this.ghosts = [];
    this.lifeState = 'Alive'; this.respawnTimer = 0; this.grounded = true;
    battlefield?.resolveEntityCollision(this);
    combat.spawnShockwave(this.x, this.y - 25, 55, '#80d8ff');
  }

  freeze(duration) { if (this.isAlive) this.freezeTimer = duration; }
  slow(duration, factor) { if (this.isAlive) { this.slowTimer = duration; this.slowFactor = factor; } }
  makeRuneCard(rune) { return { ...rune, cardId: this.nextRuneCardId++ }; }
  configureRuneDeck(runes) {
    this.nextRuneCardId = 1;
    this.runeDeck = runes.map((rune) => this.makeRuneCard(rune));
    this.runeHand = [];
    this.preparedRunes = [];
    this.slottedSpells = [];
    this.selectedSpellIndex = 0;
    this.drawRunesToHand();
  }
  drawRunesToHand() {
    while (this.runeHand.length < 3 && this.runeDeck.length) this.runeHand.push(this.runeDeck.shift());
  }
  getRuneCard(cardId = null, runeId = null) {
    if (cardId != null) return this.runeHand.find((card) => card.cardId === cardId) ?? null;
    return this.runeHand.find((card) => card.id === runeId) ?? null;
  }
  playRuneCard(runeId, expectedCardId = null) {
    if (!this.isAlive || this.preparedRunes.length >= 3) return null;
    const card = this.getRuneCard(expectedCardId, runeId);
    // A selected card must be drawn as that exact rune; free drawing may
    // only recognise one of the current three hand cards.
    if (!card || card.id !== runeId) return null;
    this.runeHand = this.runeHand.filter((handCard) => handCard.cardId !== card.cardId);
    this.preparedRunes.push(card);
    this.runeDeck.push(card);
    this.drawRunesToHand();
    return card;
  }
  consumePreparedRunes() { const used = [...this.preparedRunes]; this.preparedRunes = []; return used; }
  addPreparedRune(rune) { return this.playRuneCard(rune.id); }
  clearPreparedRunes() { this.preparedRunes = []; this.slottedSpells = []; this.selectedSpellIndex = 0; }
  updateGhosts(dt) { this.ghosts = this.ghosts.filter(g => (g.alpha -= dt * 3.5) > 0); }

  render(ctx) {
    const renderY = this.y - (this.isMounted ? (this.mountedSummon.definition.riderOffsetY ?? 42) : 0);
    // Prepared spell components trail behind the Wizard in world space. They
    // are a gameplay indicator, not a DOM overlay or a baked reference image.
    if (this.isAlive && this.slottedSpells.length) {
      ctx.save();
      const baseX = this.x - this.facing * 30;
      for (let i = 0; i < this.slottedSpells.length; i++) {
        const slot = this.slottedSpells[i];
        const rune = slot.definition;
        const phase = this.animTime * 2.8 + i * 1.7;
        const selected = i === this.selectedSpellIndex;
        const px = selected ? this.x + this.facing * 42 : baseX - this.facing * (i * 18) + Math.cos(phase) * 3;
        const py = selected ? renderY - 58 + Math.sin(phase) * 4 : renderY - 42 - i * 12 + Math.sin(phase) * 4;
        ctx.globalAlpha = selected ? 1 : .68;
        ctx.fillStyle = `${rune.color}33`;
        ctx.strokeStyle = rune.color;
        ctx.lineWidth = selected ? 2.5 : 1.5;
        ctx.shadowColor = rune.color;
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(px, py, selected ? 14 : 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = '12px Cinzel'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(slot.isCombo ? '✦' : slot.runes[0].glyph, px, py + .5);
        if (slot.quality?.grade) {
          ctx.font = '8px Cinzel';
          ctx.fillStyle = slot.quality.grade === 'S' ? '#fff3a0' : '#d8e9ff';
          ctx.fillText(slot.quality.grade, px + (selected ? 12 : 9), py - (selected ? 12 : 9));
        }
      }
      ctx.restore();
    }
    if (this.isAlive && this.focusTransformTimer > 0) this.renderFocusAscendant(ctx, renderY);
    if (this.isAlive && this.ninefoldTimer > 0) this.renderNinefoldBeast(ctx, renderY);
    if (this.isAlive && this.eidolonTimer > 0) this.renderEidolonMantle(ctx, renderY);
    for (const g of this.ghosts) sprites.renderEntity(ctx, this.heroKey, g.x, g.y, { facing: g.facing, state: g.state, animTime: g.animTime, alpha: g.alpha, hitFlash: 1 });
    sprites.renderEntity(ctx, this.heroKey, this.x, renderY, { facing: this.facing, state: this.state, animTime: this.animTime, hitFlash: this.hitFlash > 0 ? 1 : 0, alpha: this.lifeState === 'Dead' ? 0 : 1 });
    if (this.isAlive) {
      const ratio = Math.max(0, this.hp / this.maxHp);
      ctx.save();
      const healthBarY = renderY - ENTITY_VISUALS.heroHeight - 10;
      ctx.fillStyle = 'rgba(4, 8, 14, .82)'; ctx.fillRect(this.x - 24, healthBarY, 48, 5);
      ctx.fillStyle = ratio > .34 ? '#49c86b' : '#ff5252'; ctx.fillRect(this.x - 23, healthBarY + 1, 46 * ratio, 3);
      ctx.strokeStyle = 'rgba(202, 239, 255, .7)'; ctx.lineWidth = 1; ctx.strokeRect(this.x - 24, healthBarY, 48, 5);
      ctx.restore();
    }
    if (this.isGuarding && this.isAlive) {
      const shieldX = this.x + this.facing * 26;
      const shieldY = renderY - 40;
      ctx.save();
      ctx.translate(shieldX, shieldY);
      ctx.scale(this.facing, 1);
      ctx.fillStyle = 'rgba(33, 104, 154, .78)';
      ctx.strokeStyle = '#b9f4ff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#3ad8ff'; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -25); ctx.lineTo(14, -16); ctx.lineTo(14, 14); ctx.lineTo(0, 25); ctx.lineTo(-14, 14); ctx.lineTo(-14, -16); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 17); ctx.moveTo(-9, -2); ctx.lineTo(9, -2); ctx.stroke();
      ctx.restore();
    }
    if (this.arcaneShield > 0 && this.isAlive) {
      ctx.save(); ctx.strokeStyle = 'rgba(194, 164, 255, .9)'; ctx.fillStyle = 'rgba(137, 98, 255, .12)'; ctx.lineWidth = 2;
      ctx.shadowColor = '#b388ff'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.ellipse(this.x, renderY - 37, 32, 45, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (this.freezeTimer > 0 && this.isAlive) {
      ctx.save(); ctx.fillStyle = 'rgba(0,229,255,.45)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.fillRect(this.x - 24, this.y - 75, 48, 75); ctx.strokeRect(this.x - 24, this.y - 75, 48, 75); ctx.restore();
    }
  }

  renderFocusAscendant(ctx, renderY) {
    const pulse = 1 + Math.sin(this.animTime * 7) * .08;
    ctx.save();
    ctx.globalAlpha = .52;
    ctx.strokeStyle = '#f0a6ff';
    ctx.shadowColor = '#b668ff';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(this.x, renderY - 28, 31 * pulse, 46 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = .92;
    ctx.fillStyle = '#fff0ff';
    ctx.font = '9px Cinzel';
    ctx.textAlign = 'center';
    ctx.fillText('ASCENDANT', this.x, renderY - 78);
    ctx.restore();
  }

  gainFocus(amount, source = 'COMBAT') {
    if (!this.isAlive || this.focusTransformTimer > 0) return false;
    const previous = this.focus;
    this.focus = Math.min(this.maxFocus, this.focus + Math.max(0, amount) * (this.buildModifiers?.focusGain ?? 1));
    if (previous < this.maxFocus && this.focus >= this.maxFocus) {
      window.gameWorld?.showAnnouncement?.('FOCUS FULL — TAP FOCUS OR PRESS T', 1.8);
      combat.spawnShockwave(this.x, this.y - 34, 52, '#f0c8ff');
    }
    return this.focus > previous;
  }

  activateFocusTransformation() {
    if (!this.isAlive || this.focus < this.maxFocus || this.focusTransformTimer > 0) return false;
    this.focus = 0;
    this.focusTransformTimer = 8;
    this.focusTransformPower = 1;
    combat.spawnShockwave(this.x, this.y - 38, 92, '#f0a6ff');
    combat.spawnElementalParticles(this.x, this.y - 38, 'void', 34);
    audio.playSpell('focus_ascendant');
    return true;
  }

  renderEidolonMantle(ctx, renderY) {
    const pulse = .82 + Math.sin(this.animTime * 5) * .10;
    const alpha = Math.min(1, this.eidolonTimer * 2) * .52;
    ctx.save();
    ctx.translate(this.x, renderY - 35);
    ctx.scale(this.facing, 1);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#b668ff'; ctx.shadowBlur = 24;
    ctx.fillStyle = 'rgba(128, 50, 220, .28)';
    ctx.strokeStyle = '#e2a7ff'; ctx.lineWidth = 3;
    // Original, abstract guardian silhouette: crown, shoulders, arms and
    // a broad rune blade. It deliberately evokes GRIMGE's void magic rather
    // than reproducing a specific external character design.
    ctx.beginPath();
    ctx.moveTo(-34 * pulse, 30); ctx.lineTo(-43, -6); ctx.lineTo(-28, -46);
    ctx.lineTo(-14, -64); ctx.lineTo(0, -74); ctx.lineTo(14, -64); ctx.lineTo(28, -46);
    ctx.lineTo(43, -6); ctx.lineTo(34 * pulse, 30); ctx.lineTo(20, 48);
    ctx.lineTo(0, 56); ctx.lineTo(-20, 48); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(211, 126, 255, .65)';
    ctx.beginPath(); ctx.arc(0, -51, 13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-18, -62); ctx.lineTo(-7, -83); ctx.lineTo(0, -66); ctx.lineTo(8, -86); ctx.lineTo(18, -62); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(242, 202, 255, .92)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-28, -20); ctx.lineTo(-62, 12); ctx.lineTo(-70, 38); ctx.moveTo(28, -20); ctx.lineTo(60, 8); ctx.lineTo(68, 33); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(48, 36); ctx.lineTo(84, -34); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff0ff'; ctx.font = '14px serif'; ctx.textAlign = 'center';
    ctx.fillText('✦', 0, -47);
    ctx.restore();
  }

  renderNinefoldBeast(ctx, renderY) {
    const alpha = Math.min(1, this.ninefoldTimer * 2) * .50;
    const wave = Math.sin(this.animTime * 7) * 5;
    ctx.save();
    ctx.translate(this.x - this.facing * 8, renderY - 26);
    ctx.scale(this.facing, 1);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffb13b'; ctx.fillStyle = 'rgba(255, 70, 30, .23)';
    ctx.shadowColor = '#ff4c24'; ctx.shadowBlur = 22; ctx.lineWidth = 4;
    // Nine independent energy tails make the form readable as a fast,
    // original GRIMGE beast manifestation rather than a borrowed character.
    for (let i = 0; i < 9; i++) {
      const angle = -2.65 + i * .66;
      const length = 42 + (i % 3) * 9;
      ctx.beginPath(); ctx.moveTo(-3, 16);
      ctx.quadraticCurveTo(Math.cos(angle) * length * .55, Math.sin(angle) * length + wave, Math.cos(angle) * length, Math.sin(angle) * length * 1.25 + wave);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, -17, 29, 43, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe7a0'; ctx.beginPath(); ctx.arc(11, -32, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();
  }
}

export class Minion extends GroundEntity {
  constructor(x, z, team, type = 'melee', laneIndex = 1) {
    super(x, z); this.team = team; this.isMobileCombatant = true; this.isMinion = true; this.type = type; this.laneIndex = laneIndex; this.preferredZ = z; this.spriteKey = `minion_${team}_${type}`; this.facing = team === 'blue' ? 1 : -1;
    this.maxHp = type === 'melee' ? 90 : 55; this.hp = this.maxHp; this.speed = type === 'melee' ? 75 : 60;
    this.attackRange = type === 'melee' ? 36 : 190; this.attackCooldown = type === 'melee' ? 1.4 : 2; this.attackTimer = Math.random() * .8; this.damage = type === 'melee' ? 14 : 18;
    this.width = ENTITY_VISUALS.minionColliderWidth; this.height = ENTITY_VISUALS.minionColliderHeight; this.state = 'run'; this.animTime = Math.random() * 10; this.hitFlash = 0; this.isDead = false; this.freezeTimer = 0; this.slowTimer = 0; this.slowFactor = 1; this.hurtTimer = 0;
    this.target = null; this.targetLockTimer = 0;
    this.archetype = null; this.special = null; this.specialTimer = 0; this.specialCd = 0;
  }
  configureArchetype(config) {
    if (!config) return;
    this.archetype = config;
    this.maxHp = Math.round(this.maxHp * (config.hpMul ?? 1));
    this.hp = this.maxHp;
    this.damage = Math.round(this.damage * (config.dmgMul ?? 1));
    this.speed *= (config.spdMul ?? 1);
    if (config.combatType === 'ranged' && this.type !== 'ranged') {
      this.type = 'ranged'; this.attackRange = 190; this.attackCooldown = 2;
    }
    this.specialTimer = (config.specialCd ?? 99) * (0.4 + Math.random() * 0.3);
    this.specialCd = config.specialCd ?? 99;
    this.special = config.special ?? null;
    this.renderHeight = config.renderHeight ?? 56;
  }
  update(dt, gameWorld, battlefield) {
    this.animTime += dt; this.hitFlash = Math.max(0, this.hitFlash - dt); this.attackTimer -= dt; this.targetLockTimer = Math.max(0, this.targetLockTimer - dt);
    this.freezeTimer = Math.max(0, this.freezeTimer - dt); this.slowTimer = Math.max(0, this.slowTimer - dt); if (!this.slowTimer) this.slowFactor = 1;
    if (this.specialTimer > 0) this.specialTimer -= dt;
    const target = gameWorld.findMinionTarget(this);
    const distance = target ? groundDistance(this, target) : Infinity;
    if (this.freezeTimer > 0) { this.vx = this.vz = 0; }
    else if (this.hurtTimer > 0) { this.hurtTimer -= dt; this.state = 'hurt'; }
    else if (target && distance <= (target.isObjective ? 70 : this.attackRange)) { this.vx = this.vz = 0; this.facing = Math.sign(target.x - this.x) || this.facing; if (this.attackTimer <= 0) { this.attackTimer = this.attackCooldown; this.state = 'attack'; this.performAttack(target, gameWorld); } else { this.state = this.attackTimer > this.attackCooldown - 0.35 ? 'attack' : 'idle'; } }
    else {
      // Structures are attacked from each lane; combat units may pull a minion
      // slightly off its lane only when already nearby.
      const targetZ = target?.isObjective ? objectiveApproachZ(this, target) : target ? target.z : this.preferredZ;
      const desired = target ? normalizeMove({ x: target.x - this.x, z: (targetZ - this.z) * 150 }) : { x: this.facing, z: (this.preferredZ - this.z) * 150 };
      this.facing = desired.x ? Math.sign(desired.x) : this.facing; this.vx = desired.x * this.speed * this.slowFactor; this.vz = desired.z * (this.speed / 150) * this.slowFactor; this.state = 'run';
    }
    this.applySeparation(gameWorld);
    this.integrateElevation(dt, 1150); const previousX = this.x; const previousZ = this.z; this.x += this.vx * dt; this.z += this.vz * dt; battlefield.resolveEntityCollision(this); gameWorld.resolveSpellObstacles(this, previousX, previousZ);
  }
  applySeparation(gameWorld) {
    if (this.freezeTimer > 0 || this.hurtTimer > 0) return;
    let pushX = 0; let pushZ = 0;
    for (const other of gameWorld.minions) {
      if (other === this || other.team !== this.team || other.isDead) continue;
      const dx = this.x - other.x;
      const dz = (this.z - other.z) * 150;
      const distance = Math.hypot(dx, dz);
      if (distance <= 0.01 || distance >= 34) continue;
      const strength = (34 - distance) / 34;
      pushX += (dx / distance) * strength;
      pushZ += (dz / distance) * strength;
    }
    // Deliberately subtle: it separates overlapping sprites without turning
    // the authored lanes into rigid rails or adding a physics solver.
    this.vx += pushX * this.speed * 0.45;
    this.vz += pushZ * (this.speed / 150) * 0.45;
  }
  performAttack(target, gameWorld) {
    if (this.special && this.specialTimer <= 0) { this.specialTimer = this.specialCd; this.performSpecial(target, gameWorld); return; }
    audio.playSlash(1.4); if (this.type === 'melee') { combat.spawnSlashArc(this.x + this.facing * 14, this.y - 16, this.facing, { radius: 22, color: this.team === 'blue' ? '#42a5f5' : '#ef5350' }); target.takeDamage(this.damage, this.facing * 100, 50, .2); } else gameWorld.spawnMinionBolt(this.x + this.facing * 12, this.z, this.facing, this.team, this.damage, target.z, this.worldHeight + 18);
  }
  performSpecial(target, gameWorld) {
    const dir = Math.sign(target.x - this.x) || this.facing;
    switch (this.special) {
      case 'shield_charge': {
        this.vx = dir * 320; this.state = 'attack';
        audio.playSlash(0.8);
        combat.spawnShockwave(this.x, this.y - 16, 28, '#78909c');
        const targets = gameWorld?.getHostileTargets(this.team) ?? [];
        for (const t of targets) { if (Math.abs(t.x - this.x) < 60 && Math.abs(t.z - this.z) < 0.2) t.takeDamage(Math.round(this.damage * 1.5), dir * 280, 120, 0.4); }
        break;
      }
      case 'backstab': {
        this.x = target.x - dir * 30; this.z = target.z;
        this.facing = Math.sign(target.x - this.x) || this.facing;
        audio.playSlash(1.6);
        combat.spawnElementalParticles(this.x, this.y - 16, 'void', 6);
        target.takeDamage(Math.round(this.damage * 2), this.facing * 160, 60, 0.3, true);
        break;
      }
      case 'arcane_burst': {
        audio.playSlash(0.6);
        combat.spawnShockwave(this.x, this.y - 20, 50, '#b388ff');
        combat.spawnElementalParticles(this.x, this.y - 20, 'fulgur', 8);
        const targets = gameWorld?.getHostileTargets(this.team) ?? [];
        for (const t of targets) { if (groundDistance(this, t) < 100) t.takeDamage(Math.round(this.damage * 0.8), 0, 30, 0.2); }
        break;
      }
      case 'combo_strike': {
        audio.playSlash(1.3);
        combat.spawnSlashArc(this.x + this.facing * 14, this.y - 16, this.facing, { radius: 26, color: '#42a5f5' });
        combat.spawnSlashArc(this.x + this.facing * 20, this.y - 20, this.facing, { radius: 30, color: '#ffd54f' });
        target.takeDamage(Math.round(this.damage * 1.7), this.facing * 140, 80, 0.25);
        combat.spawnHitSparks(target.x, target.y - 16, this.facing, '#ffd54f', 10);
        break;
      }
      case 'blade_dash': {
        this.vx = dir * 400; this.state = 'attack';
        audio.playSlash(1.1);
        combat.spawnShockwave(this.x, this.y - 16, 22, '#66bb6a');
        const targets = gameWorld?.getHostileTargets(this.team) ?? [];
        for (const t of targets) { if (Math.abs(t.x - this.x) < 80 && Math.abs(t.z - this.z) < 0.18) t.takeDamage(Math.round(this.damage * 1.2), dir * 140, 80, 0.25); }
        break;
      }
      case 'fire_dash': {
        this.vx = dir * 350; this.state = 'attack';
        audio.playSlash(0.7);
        combat.spawnShockwave(this.x, this.y - 20, 40, '#ff6d00');
        combat.spawnElementalParticles(this.x, this.y - 20, 'fire', 12);
        const targets = gameWorld?.getHostileTargets(this.team) ?? [];
        for (const t of targets) { if (Math.abs(t.x - this.x) < 70 && Math.abs(t.z - this.z) < 0.2) t.takeDamage(Math.round(this.damage * 1.8), dir * 300, 150, 0.5, true); }
        break;
      }
    }
  }
  takeDamage(amount, kx = 0, lift = 0, stun = .25) { this.hp = Math.max(0, this.hp - amount); this.hitFlash = .15; this.vx = kx; this.vElevation = lift; this.hurtTimer = Math.max(this.hurtTimer, stun); combat.spawnDamageText(this.x, this.y - 25, amount, { color: this.team === 'blue' ? '#90caf9' : '#ffab91' }); if (!this.hp) { this.isDead = true; combat.spawnHitSparks(this.x, this.y - 16, this.facing, '#fff', 8); } }
  freeze(duration) { this.freezeTimer = duration; } slow(duration, factor) { this.slowTimer = duration; this.slowFactor = factor; }
  render(ctx) { const vh = this.renderHeight ?? ENTITY_VISUALS.minionHeight; sprites.renderEntity(ctx, this.spriteKey, this.x, this.y, { facing: this.facing, state: this.state, animTime: this.animTime, hitFlash: this.hitFlash > 0, visualHeight: vh }); if (this.hp < this.maxHp) { const barY = this.y - vh - 4; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(this.x - 11, barY, 22, 3); ctx.fillStyle = this.team === 'blue' ? '#42a5f5' : '#e53935'; ctx.fillRect(this.x - 11, barY, 22 * this.hp / this.maxHp, 3); } }
}

export class Tower extends GroundEntity {
  constructor(x, z, team, onDestroyed = null) { super(x, z); this.team = team; this.isObjective = true; this.maxHp = this.hp = 800; this.range = 280; this.hitRadiusX = 68; this.hitRadiusZ = 0.46; this.shootCooldown = 1.8; this.shootTimer = 0; this.isDead = false; this.corePulse = 0; this.hitFlash = 0; this.topHeight = 125; this.currentTarget = null; this.onDestroyed = onDestroyed; }
  get crystalY() { return this.y - this.topHeight; }
  update(dt, gameWorld) { if (this.isDead) { this.currentTarget = null; return; } this.corePulse += dt * 3; this.hitFlash = Math.max(0, this.hitFlash - dt); this.shootTimer -= dt; let target = null; let distance = this.range; for (const candidate of gameWorld.getHostileMobileTargets(this.team)) { const d = groundDistance(this, candidate); if (d < distance) { target = candidate; distance = d; } } this.currentTarget = target; if (target && this.shootTimer <= 0) { this.shootTimer = this.shootCooldown; audio.playTowerShot(); combat.spawnShockwave(this.x, this.crystalY, 20, this.team === 'blue' ? '#00e5ff' : '#ff1744'); gameWorld.spawnTowerOrb(this.x, this.z, target, this.team, 42, this.worldHeight + this.topHeight); } }
  takeDamage(amount) { if (this.isDead) return; this.hp = Math.max(0, this.hp - amount); this.hitFlash = .15; combat.spawnDamageText(this.x, this.crystalY - 15, amount, { isCrit: true, color: this.team === 'blue' ? '#4fc3f7' : '#e57373' }); if (!this.hp) { this.isDead = true; audio.playImpact(true); combat.shakeCamera(15, .8); combat.spawnShockwave(this.x, this.crystalY, 80, '#ff9100'); combat.spawnHitSparks(this.x, this.crystalY, 1, '#ffcc80', 24); this.onDestroyed?.(this); } }
  render(ctx) { const y = this.crystalY + Math.sin(this.corePulse) * 5; const color = this.team === 'blue' ? '#00e5ff' : '#ff1744'; ctx.save(); ctx.fillStyle = this.team === 'blue' ? 'rgba(0,229,255,.35)' : 'rgba(255,23,68,.35)'; ctx.beginPath(); ctx.arc(this.x, y, 20, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = this.hitFlash ? '#fff' : color; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(this.x, y - 15); ctx.lineTo(this.x + 9, y); ctx.lineTo(this.x, y + 15); ctx.lineTo(this.x - 9, y); ctx.closePath(); ctx.fill(); if (!this.isDead && this.hp < this.maxHp) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,.78)'; ctx.fillRect(this.x - 30, y - 31, 60, 5); ctx.fillStyle = color; ctx.fillRect(this.x - 30, y - 31, 60 * this.hp / this.maxHp, 5); } ctx.restore(); }
  renderRange(ctx) { ctx.save(); ctx.setLineDash([6,6]); ctx.strokeStyle = this.team === 'blue' ? 'rgba(33,190,255,.55)' : 'rgba(255,82,82,.55)'; ctx.beginPath(); ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
}

export class Castle extends GroundEntity {
  constructor(x, z, team, onDestroyed = null, onProtectedHit = null) {
    super(x, z); this.team = team; this.isObjective = true; this.maxHp = this.hp = 1800;
    this.isVulnerable = false; this.isDestroyed = false; this.hitRadiusX = 88; this.hitRadiusZ = 0.56;
    // The gate/objective sits below the upper battlement. Attacks from the
    // playable battlement therefore need to reach the structure below rather
    // than being rejected as an impossible vertical hit.
    this.hitHeightTolerance = 210;
    this.hitFlash = 0; this.corePulse = 0; this.onDestroyed = onDestroyed; this.onProtectedHit = onProtectedHit; this.protectedFeedbackTimer = 0;
  }
  takeDamage(amount) {
    if (this.isDestroyed) return;
    if (!this.isVulnerable) { if (this.protectedFeedbackTimer <= 0) { this.protectedFeedbackTimer = .8; this.onProtectedHit?.(this); } return; }
    this.hp = Math.max(0, this.hp - amount); this.hitFlash = .15;
    combat.spawnDamageText(this.x, this.y - 95, amount, { isCrit: true, color: this.team === 'blue' ? '#81d4fa' : '#ff8a80' });
    if (!this.hp) { this.isDestroyed = true; this.isVulnerable = false; audio.playImpact(true); combat.shakeCamera(20, 1); combat.spawnShockwave(this.x, this.y - 55, 130, '#ffd740'); combat.spawnShockwave(this.x, this.y - 55, 72, '#ff6d00'); combat.spawnHitSparks(this.x, this.y - 55, 1, '#ff9100', 56); combat.spawnElementalParticles(this.x, this.y - 55, 'fire', 24); this.onDestroyed?.(this); }
  }
  update(dt) { this.corePulse += dt * 2; this.hitFlash = Math.max(0, this.hitFlash - dt); this.protectedFeedbackTimer = Math.max(0, this.protectedFeedbackTimer - dt); }
  render(ctx) {
    const color = this.team === 'blue' ? '#29b6f6' : '#ef5350'; const y = this.y - 58;
    ctx.save(); ctx.globalAlpha = this.isDestroyed ? .2 : 1; ctx.strokeStyle = this.isVulnerable ? color : '#b0bec5'; ctx.lineWidth = 3; ctx.setLineDash(this.isVulnerable ? [] : [6, 5]);
    ctx.beginPath(); ctx.ellipse(this.x, y, this.hitRadiusX, 18, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = this.hitFlash ? '#fff' : color; ctx.shadowColor = color; ctx.shadowBlur = this.isVulnerable ? 15 : 5; ctx.beginPath(); ctx.arc(this.x, y, 10 + Math.sin(this.corePulse) * 2, 0, Math.PI * 2); ctx.fill(); if (this.isVulnerable && !this.isDestroyed && this.hp < this.maxHp) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,.78)'; ctx.fillRect(this.x - 38, y - 27, 76, 5); ctx.fillStyle = color; ctx.fillRect(this.x - 38, y - 27, 76 * this.hp / this.maxHp, 5); } ctx.restore();
  }
}

export class EnemyChampion extends GroundEntity {
  constructor(x, z, heroKey = 'warlord') { super(x, z); this.heroKey = heroKey; this.team = 'red'; this.isMobileCombatant = true; this.facing = -1; this.width = ENTITY_VISUALS.heroColliderWidth; this.height = ENTITY_VISUALS.heroColliderHeight; this.maxHp = this.hp = 280; this.maxMp = this.mp = 100; this.speed = 230; this.state = 'idle'; this.animTime = 0; this.hitFlash = 0; this.freezeTimer = 0; this.slowTimer = 0; this.slowFactor = 1; this.attackCooldown = 0; this.spellCooldown = 1.4; this.defensiveCooldown = 0; this.arcaneShield = 0; this.arcaneShieldTimer = 0; this.aiMode = 'DEFEND_CASTLE'; this.stateTimer = 0; this.lifeState = 'Alive'; this.respawnTimer = 0; this.respawnDuration = 3; }
  get isAlive() { return this.lifeState === 'Alive'; }
  get isDead() { return this.lifeState === 'Dead'; }
  set isDead(value) { this.lifeState = value ? 'Dead' : 'Alive'; }
  update(dt, gameWorld, battlefield) {
    this.animTime += dt; this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.lifeState === 'Dying') { this.stateTimer -= dt; if (this.stateTimer <= 0) { this.lifeState = 'Dead'; this.respawnTimer = gameWorld.canRespawn(this.team) ? this.respawnDuration : Infinity; if (!Number.isFinite(this.respawnTimer)) gameWorld.onFinalWizardDeath(this.team); } return; }
    if (this.lifeState === 'Dead') { this.respawnTimer -= dt; if (this.respawnTimer <= 0) this.respawn(battlefield, gameWorld); return; }
    this.attackCooldown -= dt; this.spellCooldown -= dt; this.defensiveCooldown -= dt; this.mp = Math.min(this.maxMp, this.mp + dt * 11); this.arcaneShieldTimer = Math.max(0, this.arcaneShieldTimer - dt); if (this.arcaneShieldTimer <= 0) this.arcaneShield = 0; this.freezeTimer = Math.max(0, this.freezeTimer - dt); this.slowTimer = Math.max(0, this.slowTimer - dt); if (!this.slowTimer) this.slowFactor = 1;
    if (this.stateTimer > 0) { this.stateTimer -= dt; if (this.stateTimer <= 0) this.state = this.grounded ? 'idle' : 'fall'; }
    const player = gameWorld.player; const distance = player.isAlive ? groundDistance(this, player) : Infinity;
    const home = gameWorld.getEnemyHome?.(this.team, battlefield) ?? battlefield.getSpawn(this.team);
    const ownTower = battlefield.getTower(this.team);
    const ownCastle = battlefield.getCastle(this.team);
    const objectiveThreat = battlefield.objectivesActive && player.isAlive
      && [ownTower, ownCastle].some((objective) => !objective.isDead && !objective.isDestroyed && groundDistance(player, objective) < 245);
    if (this.freezeTimer > 0) { this.vx = this.vz = 0; }
    else if (player.isAlive && distance <= 70) {
      this.aiMode = 'DUEL';
      this.vx = this.vz = 0;
      this.facing = Math.sign(player.x - this.x) || this.facing;
      // The upper battlements are Wizard-only spell-duel spaces.  Champions
      // can pressure each other there, but not with grounded melee strings.
      if (isUpperCastleBattlement(this) && isUpperCastleBattlement(player)) {
        this.state = 'idle';
        this.tryAICast('fireball', gameWorld, 12, 2.0);
      } else if (this.tryAIDefense(player, distance, objectiveThreat, gameWorld)) {
        this.vx = this.vz = 0;
      } else if (this.attackCooldown <= 0) this.executeAIAttack(player);
    }
    else if (player.isAlive && distance < 430 && (gameWorld.activeMode?.enemyBehavior === 'duel' || gameWorld.modeState?.bossActive || objectiveThreat || Math.abs(player.x - home.x) < 430)) {
      this.aiMode = objectiveThreat ? 'PROTECT_OBJECTIVE' : 'INTERCEPT';
      const retreating = this.hp / this.maxHp < .30 && distance < 180;
      const destination = retreating ? home : player;
      const move = normalizeMove({ x: destination.x - this.x, z: (destination.z - this.z) * 150 });
      this.facing = retreating ? -Math.sign(move.x || this.facing) : Math.sign(move.x) || this.facing;
      this.vx = move.x * this.speed * this.slowFactor * (retreating ? -.82 : 1);
      this.vz = move.z * this.speed / 150 * this.slowFactor * (retreating ? -.82 : 1);
      this.state = 'run';
      if (!this.tryAIDefense(player, distance, objectiveThreat, gameWorld) && distance > 110) this.tryAICast('fireball', gameWorld, 12, objectiveThreat ? 2.1 : 3.1);
    } else {
      this.aiMode = 'DEFEND_CASTLE';
      const move = normalizeMove({ x: home.x - this.x, z: (home.z - this.z) * 150 }); this.facing = Math.sign(move.x) || this.facing; this.vx = move.x * this.speed * .45; this.vz = move.z * this.speed / 150 * .45; this.state = 'run';
    }
    this.integrateElevation(dt, 1200); const previousX = this.x; const previousZ = this.z; this.x += this.vx * dt; this.z += this.vz * dt; battlefield.resolveEntityCollision(this); gameWorld.resolveSpellObstacles(this, previousX, previousZ);
  }
  tryAICast(id, gameWorld, manaCost, cooldown) {
    if (this.spellCooldown > 0 || this.mp < manaCost) return false;
    this.mp -= manaCost; this.spellCooldown = cooldown;
    spells.cast(this, { id, tier: id === 'stone_wall' || id === 'arcane_aegis' ? 2 : 1 }, gameWorld);
    return true;
  }
  tryAIDefense(player, distance, objectiveThreat, gameWorld) {
    if (this.hp / this.maxHp < .48 && this.defensiveCooldown <= 0 && this.mp >= 24) {
      this.mp -= 24; this.defensiveCooldown = 8; this.arcaneShield = 72; this.arcaneShieldTimer = 4;
      spells.cast(this, { id: 'arcane_aegis', tier: 2 }, gameWorld);
      return true;
    }
    if (distance <= 105 && this.mp >= 18 && this.spellCooldown <= 0) return this.tryAICast('frost_nova', gameWorld, 18, 9.0);
    if (objectiveThreat && distance < 230 && this.mp >= 22 && this.spellCooldown <= 0) return this.tryAICast('stone_wall', gameWorld, 22, 5.0);
    return false;
  }
  executeAIAttack(target) { this.attackCooldown = 1.1; this.state = 'attack1'; this.stateTimer = .28; audio.playSlash(1.1); combat.spawnSlashArc(this.x + this.facing * 20, this.y - 28, this.facing, { radius: 42, color: '#f44336', glow: '#b71c1c' }); if (!(isUpperCastleBattlement(this) && isUpperCastleBattlement(target)) && Math.abs(target.z - this.z) <= .22 && Math.abs((target.worldHeight ?? 0) - this.worldHeight) <= 70) target.takeDamage(24, this.facing * 240, 100, .3); }
  takeDamage(amount, kx = 0, lift = 0, stun = .35, isCrit = false) { if (!this.isAlive) return; if (this.arcaneShield > 0) { const absorbed = Math.min(amount, this.arcaneShield); this.arcaneShield -= absorbed; amount -= absorbed; if (amount <= 0) { combat.spawnElementalParticles(this.x, this.y - 35, 'fulgur', 5); return; } } this.hp = Math.max(0, this.hp - amount); this.hitFlash = .15; this.vx = kx; this.vElevation = lift; this.state = 'hurt'; this.stateTimer = stun; combat.spawnDamageText(this.x, this.y - 45, amount, { isCrit, color: '#ff7043' }); if (!this.hp) { window.gameWorld?.recordWizardDeath?.(this.team); this.lifeState = 'Dying'; this.state = 'dead'; this.stateTimer = .45; combat.spawnShockwave(this.x, this.y - 30, 80, '#ff5252'); } }
  respawn(battlefield, gameWorld = null) { const spawn = gameWorld?.getEnemyHome?.(this.team, battlefield) ?? battlefield.getSpawn(this.team); this.x = spawn.x; this.z = spawn.z; this.elevation = 0; this.vx = this.vz = this.vElevation = 0; this.hp = this.maxHp; this.mp = this.maxMp; this.arcaneShield = 0; this.arcaneShieldTimer = 0; this.state = 'idle'; this.lifeState = 'Alive'; this.respawnTimer = 0; this.attackCooldown = 0; this.spellCooldown = 1; this.defensiveCooldown = 0; battlefield.resolveEntityCollision(this); combat.spawnShockwave(this.x, this.y - 28, 50, '#ff5252'); }
  freeze(duration) { this.freezeTimer = duration; } slow(duration, factor) { this.slowTimer = duration; this.slowFactor = factor; }
  render(ctx) { sprites.renderEntity(ctx, this.heroKey, this.x, this.y, { facing: this.facing, state: this.state, animTime: this.animTime, hitFlash: this.hitFlash > 0, alpha: this.lifeState === 'Dead' ? 0 : 1 }); if (this.lifeState !== 'Dead') { const healthBarY = this.y - ENTITY_VISUALS.heroHeight - 8; ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(this.x - 27, healthBarY, 54, 6); ctx.fillStyle = '#f44336'; ctx.fillRect(this.x - 27, healthBarY, 54 * this.hp / this.maxHp, 6); } }
}
