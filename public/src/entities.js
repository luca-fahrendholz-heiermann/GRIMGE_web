// GRIMGE Prototype — 2.5D actors, combat state, lane AI, and structures.
import { sprites } from './sprites.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { spells } from './spells.js';
import { ARENA_LAYOUT, ENTITY_VISUALS, GroundEntity, groundDistance } from './world.js';

const ACTION_STATES = new Set(['attack1', 'attack2', 'attack3', 'uppercut', 'dive', 'dash', 'hurt']);
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

function objectiveApproachZ(minion, objective) {
  // A lane remains a preference, not a rail. When marching on a structure,
  // guide each lane into the structure's reachable depth band so front-lane
  // fighters do not stall forever outside a rear-wall Tower's hit volume.
  // Ranged bolts keep a narrow depth hit tolerance, so objective approach is
  // intentionally tighter than the large melee contact band. This lets every
  // lane join a siege without ranged minions firing harmlessly past a Tower.
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
    this.maxHp = 200; this.hp = 200;
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
    this.canAttack = true;
    // Rune cards (the three cards in the hand) deliberately stay separate
    // from prepared spell components. Drawing a card consumes that *card*,
    // sends it to the back of the deck and immediately replaces it. The
    // resulting rune is then placed in one of the three spell-component
    // slots. They must never be the same array.
    this.runeHand = [];
    this.preparedRunes = [];
    this.runeDeck = [];
    this.nextRuneCardId = 1;
    this.auraShockCooldown = 0;
    this.arcaneShield = 0;
    this.arcaneShieldTimer = 0;
    this.arcaneShieldCooldown = 0;
    this.ghosts = [];
    this.lifeState = 'Alive';
    this.respawnTimer = 0;
    this.respawnDuration = 3;
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

    this.mp = Math.min(this.maxMp, this.mp + dt * 14);
    this.sp = Math.min(this.maxSp, this.sp + dt * 25);
    this.auraShockCooldown = Math.max(0, this.auraShockCooldown - dt);
    this.arcaneShieldTimer = Math.max(0, this.arcaneShieldTimer - dt);
    this.arcaneShieldCooldown = Math.max(0, this.arcaneShieldCooldown - dt);
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
      if (this.stateTimer <= 0) this.finishAction();
    }

    const controlsBlocked = input.gameplayBlocked || this.freezeTimer > 0 || this.state === 'hurt' || !this.isAlive;
    const isAction = ACTION_STATES.has(this.state) && this.state !== 'hurt';
    if (!controlsBlocked && !isAction) this.handleMovementInput(dt, input);

    // Air movement remains available, but jump elevation never changes z by itself.
    this.integrateElevation(dt, 1250);
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    battlefield.resolveEntityCollision(this);
    if (this.grounded) this.jumpsLeft = 2;
    if (!this.grounded && !ACTION_STATES.has(this.state)) this.state = this.vElevation > 0 ? 'jump' : 'fall';
  }

  handleMovementInput(dt, input) {
    const move = normalizeMove(moveVector(input));
    if (Math.abs(move.x) > 0.02) this.facing = Math.sign(move.x);
    const targetX = move.x * this.moveSpeed * this.slowFactor;
    const targetZ = move.z * this.depthSpeed * this.slowFactor;
    this.vx += (targetX - this.vx) * Math.min(1, dt * 18);
    this.vz += (targetZ - this.vz) * Math.min(1, dt * 18);
    if (Math.hypot(move.x, move.z) > 0.05 && this.grounded) {
      this.state = 'run';
      if (Math.random() < 0.18) combat.spawnDust(this.x, this.y, 1);
    } else if (this.grounded && this.state === 'run') this.state = 'idle';

    if (input.justPressed('Space') && this.jumpsLeft > 0) {
      this.jumpsLeft--;
      this.vElevation = this.jumpForce;
      this.grounded = false;
      this.state = 'jump';
      audio.playJump();
      combat.spawnDust(this.x, this.y, 3);
    }
    if ((input.justPressed('ShiftLeft') || input.justPressed('ShiftRight')) && this.sp >= 25) {
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

  finishAction() {
    if (!this.isAlive) return;
    this.state = this.grounded ? 'idle' : (this.vElevation > 0 ? 'jump' : 'fall');
    this.stateTimer = 0;
    this.canAttack = true;
  }

  executeAttack(input) {
    if (!this.isAlive || !this.canAttack || ACTION_STATES.has(this.state) || !window.gameWorld?.isMatchRunning?.()) return false;
    this.canAttack = false;
    const move = moveVector(input);
    if (input.keys?.KeyU) {
      this.state = 'uppercut'; this.stateTimer = 0.28; this.vElevation = 280;
      audio.playSlash(1.2);
      combat.spawnSlashArc(this.x, this.y - 25, this.facing, { radius: 46, angleStart: -1.2, angleEnd: 0.6, color: '#ffea00', glow: '#ff9800' });
      this.triggerMeleeHitbox(40, this.facing * 140, 480, 0.5);
      return true;
    }
    if (!this.grounded && move.z > 0.55) {
      this.state = 'dive'; this.stateTimer = 0.35; this.vElevation = -850;
      audio.playSlash(0.9);
      combat.spawnSlashArc(this.x, this.y - 15, this.facing, { radius: 50, angleStart: 0.8, angleEnd: 2.2, color: '#ff5722', glow: '#d50000' });
      this.triggerMeleeHitbox(55, this.facing * 200, -300, 0.6);
      return true;
    }
    this.comboStep = (this.comboStep % 3) + 1;
    this.comboResetTimer = 0.65;
    const moves = [
      { state: 'attack1', time: 0.22, vx: 180, dmg: 28, knock: 220, lift: 100, radius: 40, color: '#fff', glow: '#ffd54f' },
      { state: 'attack2', time: 0.24, vx: 220, dmg: 34, knock: 260, lift: 140, radius: 44, color: '#fff', glow: '#ff9800' },
      { state: 'attack3', time: 0.35, vx: 320, dmg: 52, knock: 480, lift: 320, radius: 54, color: '#ffd700', glow: '#ff3d00', finisher: true }
    ];
    const attack = moves[this.comboStep - 1];
    this.state = attack.state; this.stateTimer = attack.time; this.vx = this.facing * attack.vx;
    audio.playSlash(this.comboStep === 3 ? 0.85 : 1 + this.comboStep * 0.1);
    combat.spawnSlashArc(this.x + this.facing * 22, this.y - 28, this.facing, { radius: attack.radius, color: attack.color, glow: attack.glow, width: attack.finisher ? 7 : 4 });
    this.triggerMeleeHitbox(attack.dmg, this.facing * attack.knock, attack.lift, attack.finisher ? 0.6 : 0.4, !!attack.finisher);
    return true;
  }

  triggerMeleeHitbox(dmg, kx, lift, stunDuration, isFinisher = false) {
    const targets = window.gameWorld?.getHostileTargets(this.team, true) ?? [];
    let hitAny = false;
    for (const target of targets) {
      const inFront = (target.x - this.x) * this.facing >= -10 && Math.abs(target.x - this.x) <= (target.hitRadiusX ?? 78);
      const closeDepth = Math.abs((target.z ?? this.z) - this.z) <= (target.hitRadiusZ ?? 0.22);
      const heightDifference = Math.abs((target.worldHeight ?? target.elevation ?? 0) - this.worldHeight);
      const verticalReach = target.hitHeightTolerance ?? (target.isObjective ? 120 : 70);
      if (inFront && closeDepth && heightDifference <= verticalReach) {
        target.takeDamage(dmg, kx, lift, stunDuration, isFinisher);
        combat.spawnHitSparks(target.x, target.y - 25, this.facing, isFinisher ? '#ffea00' : '#fff', isFinisher ? 16 : 8);
        hitAny = true;
      }
    }
    if (hitAny) {
      audio.playImpact(isFinisher);
      combat.triggerHitstop(isFinisher ? 6 : 4);
      combat.shakeCamera(isFinisher ? 8 : 4, 0.2);
    }
  }

  takeDamage(amount, kx = 0, lift = 0, stun = 0.3, isCrit = false) {
    if (!this.isAlive || this.invulnerableTimer > 0) return;
    if (this.arcaneShield > 0) {
      const absorbed = Math.min(amount, this.arcaneShield);
      this.arcaneShield -= absorbed;
      amount -= absorbed;
      combat.spawnElementalParticles(this.x, this.y - 35, 'fulgur', 6);
      if (this.arcaneShield <= 0) { this.arcaneShield = 0; this.arcaneShieldTimer = 0; combat.spawnShockwave(this.x, this.y - 30, 44, '#b388ff'); }
      if (amount <= 0) return;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.15; this.vx = kx; this.vElevation = lift;
    this.state = 'hurt'; this.stateTimer = stun; this.canAttack = false;
    audio.playImpact(isCrit);
    combat.spawnDamageText(this.x, this.y - 45, amount, { isCrit, color: '#ff5252' });
    combat.shakeCamera(isCrit ? 9 : 5, 0.25);
    if (this.hp <= 0) this.beginDeath();
  }

  beginDeath() {
    window.gameWorld?.recordWizardDeath?.(this.team);
    this.lifeState = 'Dying';
    this.state = 'dead'; this.stateTimer = 0.45; this.canAttack = false;
    this.vx = 0; this.vz = 0; this.clearPreparedRunes();
    combat.spawnShockwave(this.x, this.y - 25, 60, '#ff1744');
  }

  respawn(battlefield) {
    const spawn = battlefield?.getSpawn(this.team) ?? ARENA_LAYOUT.spawns.player;
    this.x = spawn.x; this.z = spawn.z; this.elevation = 0;
    this.vx = 0; this.vz = 0; this.vElevation = 0;
    this.hp = this.maxHp; this.mp = this.maxMp; this.sp = this.maxSp;
    this.state = 'idle'; this.stateTimer = 0; this.comboStep = 0; this.comboResetTimer = 0;
    this.canAttack = true; this.freezeTimer = 0; this.slowTimer = 0; this.slowFactor = 1;
    this.invulnerableTimer = 1.25; this.auraShockCooldown = 0; this.arcaneShield = 0; this.arcaneShieldTimer = 0; this.arcaneShieldCooldown = 0; this.jumpsLeft = 2; this.ghosts = [];
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
  clearPreparedRunes() { this.preparedRunes = []; }
  updateGhosts(dt) { this.ghosts = this.ghosts.filter(g => (g.alpha -= dt * 3.5) > 0); }

  render(ctx) {
    // Prepared spell components trail behind the Wizard in world space. They
    // are a gameplay indicator, not a DOM overlay or a baked reference image.
    if (this.isAlive && this.preparedRunes.length) {
      ctx.save();
      const baseX = this.x - this.facing * 30;
      for (let i = 0; i < this.preparedRunes.length; i++) {
        const rune = this.preparedRunes[i];
        const phase = this.animTime * 2.8 + i * 1.7;
        const px = baseX - this.facing * (i * 18) + Math.cos(phase) * 3;
        const py = this.y - 42 - i * 12 + Math.sin(phase) * 4;
        ctx.globalAlpha = .9;
        ctx.fillStyle = `${rune.color}33`;
        ctx.strokeStyle = rune.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = rune.color;
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = '12px Cinzel'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(rune.glyph, px, py + .5);
      }
      ctx.restore();
    }
    for (const g of this.ghosts) sprites.renderEntity(ctx, this.heroKey, g.x, g.y, { facing: g.facing, state: g.state, animTime: g.animTime, alpha: g.alpha, hitFlash: 1 });
    sprites.renderEntity(ctx, this.heroKey, this.x, this.y, { facing: this.facing, state: this.state, animTime: this.animTime, hitFlash: this.hitFlash > 0 ? 1 : 0, alpha: this.lifeState === 'Dead' ? 0 : 1 });
    if (this.arcaneShield > 0 && this.isAlive) {
      ctx.save(); ctx.strokeStyle = 'rgba(194, 164, 255, .9)'; ctx.fillStyle = 'rgba(137, 98, 255, .12)'; ctx.lineWidth = 2;
      ctx.shadowColor = '#b388ff'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.ellipse(this.x, this.y - 37, 32, 45, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (this.freezeTimer > 0 && this.isAlive) {
      ctx.save(); ctx.fillStyle = 'rgba(0,229,255,.45)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.fillRect(this.x - 24, this.y - 75, 48, 75); ctx.strokeRect(this.x - 24, this.y - 75, 48, 75); ctx.restore();
    }
  }
}

export class Minion extends GroundEntity {
  constructor(x, z, team, type = 'melee', laneIndex = 1) {
    super(x, z); this.team = team; this.isMobileCombatant = true; this.type = type; this.laneIndex = laneIndex; this.preferredZ = z; this.spriteKey = `minion_${team}_${type}`; this.facing = team === 'blue' ? 1 : -1;
    this.maxHp = type === 'melee' ? 90 : 55; this.hp = this.maxHp; this.speed = type === 'melee' ? 75 : 60;
    this.attackRange = type === 'melee' ? 36 : 190; this.attackCooldown = type === 'melee' ? 1.4 : 2; this.attackTimer = Math.random() * .8; this.damage = type === 'melee' ? 14 : 18;
    this.width = ENTITY_VISUALS.minionColliderWidth; this.height = ENTITY_VISUALS.minionColliderHeight; this.state = 'run'; this.animTime = Math.random() * 10; this.hitFlash = 0; this.isDead = false; this.freezeTimer = 0; this.slowTimer = 0; this.slowFactor = 1; this.hurtTimer = 0;
    this.target = null; this.targetLockTimer = 0;
  }
  update(dt, gameWorld, battlefield) {
    this.animTime += dt; this.hitFlash = Math.max(0, this.hitFlash - dt); this.attackTimer -= dt; this.targetLockTimer = Math.max(0, this.targetLockTimer - dt);
    this.freezeTimer = Math.max(0, this.freezeTimer - dt); this.slowTimer = Math.max(0, this.slowTimer - dt); if (!this.slowTimer) this.slowFactor = 1;
    const target = gameWorld.findMinionTarget(this);
    const distance = target ? groundDistance(this, target) : Infinity;
    if (this.freezeTimer > 0) { this.vx = this.vz = 0; }
    else if (this.hurtTimer > 0) { this.hurtTimer -= dt; this.state = 'hurt'; }
    else if (target && distance <= (target.isObjective ? 70 : this.attackRange)) { this.vx = this.vz = 0; this.facing = Math.sign(target.x - this.x) || this.facing; this.state = 'idle'; if (this.attackTimer <= 0) { this.attackTimer = this.attackCooldown; this.performAttack(target, gameWorld); } }
    else {
      // Structures are attacked from each lane; combat units may pull a minion
      // slightly off its lane only when already nearby.
      const targetZ = target?.isObjective ? objectiveApproachZ(this, target) : target ? target.z : this.preferredZ;
      const desired = target ? normalizeMove({ x: target.x - this.x, z: (targetZ - this.z) * 150 }) : { x: this.facing, z: (this.preferredZ - this.z) * 150 };
      this.facing = desired.x ? Math.sign(desired.x) : this.facing; this.vx = desired.x * this.speed * this.slowFactor; this.vz = desired.z * (this.speed / 150) * this.slowFactor; this.state = 'run';
    }
    this.applySeparation(gameWorld);
    this.integrateElevation(dt, 1150); this.x += this.vx * dt; this.z += this.vz * dt; battlefield.resolveEntityCollision(this);
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
  performAttack(target, gameWorld) { audio.playSlash(1.4); if (this.type === 'melee') { combat.spawnSlashArc(this.x + this.facing * 14, this.y - 16, this.facing, { radius: 22, color: this.team === 'blue' ? '#42a5f5' : '#ef5350' }); target.takeDamage(this.damage, this.facing * 100, 50, .2); } else gameWorld.spawnMinionBolt(this.x + this.facing * 12, this.z, this.facing, this.team, this.damage, target.z, this.worldHeight + 18); }
  takeDamage(amount, kx = 0, lift = 0, stun = .25) { this.hp = Math.max(0, this.hp - amount); this.hitFlash = .15; this.vx = kx; this.vElevation = lift; this.hurtTimer = Math.max(this.hurtTimer, stun); combat.spawnDamageText(this.x, this.y - 25, amount, { color: this.team === 'blue' ? '#90caf9' : '#ffab91' }); if (!this.hp) { this.isDead = true; combat.spawnHitSparks(this.x, this.y - 16, this.facing, '#fff', 8); } }
  freeze(duration) { this.freezeTimer = duration; } slow(duration, factor) { this.slowTimer = duration; this.slowFactor = factor; }
  render(ctx) { sprites.renderEntity(ctx, this.spriteKey, this.x, this.y, { facing: this.facing, state: this.state, animTime: this.animTime, hitFlash: this.hitFlash > 0, visualHeight: ENTITY_VISUALS.minionHeight }); if (this.hp < this.maxHp) { ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(this.x - 11, this.y - 42, 22, 3); ctx.fillStyle = this.team === 'blue' ? '#42a5f5' : '#e53935'; ctx.fillRect(this.x - 11, this.y - 42, 22 * this.hp / this.maxHp, 3); } }
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
  constructor(x, z, heroKey = 'warlord') { super(x, z); this.heroKey = heroKey; this.team = 'red'; this.isMobileCombatant = true; this.facing = -1; this.width = ENTITY_VISUALS.heroColliderWidth; this.height = ENTITY_VISUALS.heroColliderHeight; this.maxHp = this.hp = 280; this.mp = 100; this.speed = 230; this.state = 'idle'; this.animTime = 0; this.hitFlash = 0; this.freezeTimer = 0; this.slowTimer = 0; this.slowFactor = 1; this.attackCooldown = 0; this.spellCooldown = 3; this.stateTimer = 0; this.lifeState = 'Alive'; this.respawnTimer = 0; this.respawnDuration = 3; }
  get isAlive() { return this.lifeState === 'Alive'; }
  get isDead() { return this.lifeState === 'Dead'; }
  set isDead(value) { this.lifeState = value ? 'Dead' : 'Alive'; }
  update(dt, gameWorld, battlefield) {
    this.animTime += dt; this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.lifeState === 'Dying') { this.stateTimer -= dt; if (this.stateTimer <= 0) { this.lifeState = 'Dead'; this.respawnTimer = gameWorld.canRespawn(this.team) ? this.respawnDuration : Infinity; if (!Number.isFinite(this.respawnTimer)) gameWorld.onFinalWizardDeath(this.team); } return; }
    if (this.lifeState === 'Dead') { this.respawnTimer -= dt; if (this.respawnTimer <= 0) this.respawn(battlefield); return; }
    this.attackCooldown -= dt; this.spellCooldown -= dt; this.freezeTimer = Math.max(0, this.freezeTimer - dt); this.slowTimer = Math.max(0, this.slowTimer - dt); if (!this.slowTimer) this.slowFactor = 1;
    if (this.stateTimer > 0) { this.stateTimer -= dt; if (this.stateTimer <= 0) this.state = this.grounded ? 'idle' : 'fall'; }
    const player = gameWorld.player; const distance = player.isAlive ? groundDistance(this, player) : Infinity;
    const home = battlefield.getSpawn(this.team);
    if (this.freezeTimer > 0) { this.vx = this.vz = 0; }
    else if (player.isAlive && distance <= 70) { this.vx = this.vz = 0; this.facing = Math.sign(player.x - this.x) || this.facing; if (this.attackCooldown <= 0) this.executeAIAttack(player); }
    else if (player.isAlive && distance < 340 && Math.abs(player.x - home.x) < 420) { const move = normalizeMove({ x: player.x - this.x, z: (player.z - this.z) * 150 }); this.facing = Math.sign(move.x) || this.facing; this.vx = move.x * this.speed * this.slowFactor; this.vz = move.z * this.speed / 150 * this.slowFactor; this.state = 'run'; if (this.spellCooldown <= 0 && distance > 120) { this.spellCooldown = 4.5; spells.cast(this, { id: 'fireball', tier: 1 }, gameWorld); } }
    else { const move = normalizeMove({ x: home.x - this.x, z: (home.z - this.z) * 150 }); this.facing = Math.sign(move.x) || this.facing; this.vx = move.x * this.speed * .45; this.vz = move.z * this.speed / 150 * .45; this.state = 'run'; }
    this.integrateElevation(dt, 1200); this.x += this.vx * dt; this.z += this.vz * dt; battlefield.resolveEntityCollision(this);
  }
  executeAIAttack(target) { this.attackCooldown = 1.1; this.state = 'attack1'; this.stateTimer = .28; audio.playSlash(1.1); combat.spawnSlashArc(this.x + this.facing * 20, this.y - 28, this.facing, { radius: 42, color: '#f44336', glow: '#b71c1c' }); if (Math.abs(target.z - this.z) <= .22 && Math.abs((target.worldHeight ?? 0) - this.worldHeight) <= 70) target.takeDamage(24, this.facing * 240, 100, .3); }
  takeDamage(amount, kx = 0, lift = 0, stun = .35, isCrit = false) { if (!this.isAlive) return; this.hp = Math.max(0, this.hp - amount); this.hitFlash = .15; this.vx = kx; this.vElevation = lift; this.state = 'hurt'; this.stateTimer = stun; combat.spawnDamageText(this.x, this.y - 45, amount, { isCrit, color: '#ff7043' }); if (!this.hp) { window.gameWorld?.recordWizardDeath?.(this.team); this.lifeState = 'Dying'; this.state = 'dead'; this.stateTimer = .45; combat.spawnShockwave(this.x, this.y - 30, 80, '#ff5252'); } }
  respawn(battlefield) { const spawn = battlefield.getSpawn(this.team); this.x = spawn.x; this.z = spawn.z; this.elevation = 0; this.vx = this.vz = this.vElevation = 0; this.hp = this.maxHp; this.state = 'idle'; this.lifeState = 'Alive'; this.respawnTimer = 0; this.attackCooldown = 0; this.spellCooldown = 1; battlefield.resolveEntityCollision(this); combat.spawnShockwave(this.x, this.y - 28, 50, '#ff5252'); }
  freeze(duration) { this.freezeTimer = duration; } slow(duration, factor) { this.slowTimer = duration; this.slowFactor = factor; }
  render(ctx) { sprites.renderEntity(ctx, this.heroKey, this.x, this.y, { facing: this.facing, state: this.state, animTime: this.animTime, hitFlash: this.hitFlash > 0, alpha: this.lifeState === 'Dead' ? 0 : 1 }); if (this.lifeState !== 'Dead') { ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(this.x - 27, this.y - 82, 54, 6); ctx.fillStyle = '#f44336'; ctx.fillRect(this.x - 27, this.y - 82, 54 * this.hp / this.maxHp, 6); } }
}
