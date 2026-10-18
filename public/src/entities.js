// GRIMGE Prototype — 2.5D actors, combat state, lane AI, and structures.
import { sprites } from './sprites.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { spells } from './spells.js';
import { ARENA_LAYOUT, ENTITY_VISUALS, GroundEntity, groundDistance } from './world.js';
import { lookupRecipe, runeManaCost } from './spell_catalog.js';
import { drawFocusAura, drawEidolonGuardian, drawNinefoldSpirit, drawFormGuard } from './forms_fx.js';
import { formGuardCounter, updateFormSprint, FormGrabFx, formJumpFx, FORM_SPRINT_ATTACKS, FormSprintAttackFx, formSprintImpact } from './form_actions.js';
import { WEAPONS, ThrownWeaponSpell, drawHeldWeapon, weaponMotion, makeWeaponShots } from './weapons.js';
import { drawBeastBomb, drawSpiritBow } from './form_attacks.js';
import { FULL_CHARGE_TIME, activeMoveset, releaseFormTechnique, FORM_PALETTES } from './form_moves.js';
import { releaseWeaponReach, releaseFormPull, isOnCastle } from './hold_actions.js';
import { updatePrimalBond, bondMoveMultiplier, bondGainMultiplier, bondDisplacement, bondOnBlock, primalSprintVariant, renderPrimalBond, endPrimalBond, bondMelee, primalQuake } from './primals.js';
import { createSegments, damageSegments, updateSegments, renderSegments } from './castle_segments.js';
import { updateBuffForm, endBuffForm, isGenericBuff, currentBuffForm, renderBuffManifestation, buffVeinPainter, buffCloakColor, renderBuffGuard, levitationOffset, renderBuffCharge } from './buff_forms.js';
import { updateSignatureStance, renderSignatureStance, signatureHover, signatureMoveMult, signatureEvent, signatureDamageTaken, setHitContext } from './signature_runes.js';

// Every spell a rune deck can produce: single runes plus every valid two-
// and three-rune recipe that its cards allow (copies respected).
export function deckSpellOptions(ids = []) {
  const options = new Map();
  const addRecipe = (combo) => {
    const def = lookupRecipe(combo.map((id) => ({ id })));
    if (def && !options.has(def.id)) options.set(def.id, { def, cost: combo.reduce((sum, id) => sum + runeManaCost(id), 0) });
  };
  for (let i = 0; i < ids.length; i++) {
    addRecipe([ids[i]]);
    for (let j = i + 1; j < ids.length; j++) {
      addRecipe([ids[i], ids[j]]);
      for (let k = j + 1; k < ids.length; k++) addRecipe([ids[i], ids[j], ids[k]]);
    }
  }
  return [...options.values()];
}

// Mana price of an Arcane State heavy technique (short / full release).
export const ARCANE_TECH_MANA = Object.freeze({ short: 5, full: 12 });
const ACTION_STATES = new Set(['attack1', 'attack2', 'attack3', 'uppercut', 'heavyStrike', 'dive', 'dash', 'hurt']);
// Deliberately the shared prototype baseline, not the future weapon system.
// Every future weapon may replace this table, but must retain its timing and
// input contract unless its own combo specification explicitly says otherwise.
export const MELEE_BASELINE = Object.freeze({
  normal: Object.freeze([
    Object.freeze({ state: 'attack1', time: .22, vx: 180, damage: 28, knockback: 220, lift: 100, radius: 40, color: '#fff', glow: '#ffd54f', hitstopTicks: 4, hitReaction: 'light' }),
    Object.freeze({ state: 'attack2', time: .24, vx: 220, damage: 34, knockback: 260, lift: 140, radius: 44, color: '#fff', glow: '#ff9800', hitstopTicks: 5, hitReaction: 'strong' }),
    Object.freeze({ state: 'attack3', time: .35, vx: 320, damage: 52, knockback: 480, lift: 320, radius: 54, color: '#ffd700', glow: '#ff3d00', finisher: true, hitstopTicks: 6, hitReaction: 'finisher' })
  ]),
  bufferWindow: .13,
  uppercut: Object.freeze({ time: .28, damage: 40, knockback: 140, lift: 480, hitstopTicks: 5, hitReaction: 'strong' }),
  heavy: Object.freeze({ time: .34, damage: 48, knockback: 620, lift: 170, hitstopTicks: 6, hitReaction: 'strong' }),
  dive: Object.freeze({ time: .35, damage: 55, knockback: 200, lift: -300, hitstopTicks: 5, hitReaction: 'strong' })
});
// ── Movement values ported from the Unity project ─────────────────────
// Source: C:\Dev\unity_projects\GRIMGE, character_base_fighter.asset
// (overrides CharacterDefinition.cs defaults), CharacterMotion.cs and
// CharacterDriver.cs; 60 Hz ticks. Conversion: UNITY_PX = 24 px per Unity
// unit (the 3.7 u tall fighter ↔ the 88.8 px hero; the 6 u deep lane ↔ the
// prototype's 150 px depth metric). Controls and mechanics are unchanged.
const UNITY_PX = 24;
const UNITY_LANE_DEPTH = 6;               // u — the full depth range z 0…1
export const UNITY_MOVEMENT = Object.freeze({
  walkSpeed: 6.0 * UNITY_PX,               // 6.0 u/s lateral   → 144 px/s
  depthSpeed: 3.9 / UNITY_LANE_DEPTH,      // 3.9 u/s depth     → 0.65 z/s
  // Jump raised on request (Unity: 9 u/s / 25 u/s², apex ≈ 0.44 hero heights):
  // 13.5 u/s with 34 u/s² peaks at ≈ 0.73 hero heights in ≈ 0.79 s.
  jumpVelocity: 13.5 * UNITY_PX,           // 13.5 u/s          → 324 px/s
  gravity: 34.0 * UNITY_PX                 // 34 u/s²           → 816 px/s²
});
const DEPTH_SPEED = UNITY_MOVEMENT.depthSpeed;

const WALK_ACCEL_TIME = 0.12;   // asset: accelerationTime
const WALK_DECEL_TIME = 0.08;   // asset: decelerationTime
const TURN_TIME = 0.07;         // asset: turnTime (full reversal)

const SPRINT_MULT = 1.65;                 // lateral only (depth stays at walk speed)
const SPRINT_FLICK_WINDOW = 14 / 60;      // 14 ticks between the two taps
const SPRINT_ACCEL_TIME = 0.06;           // walk → sprint speed

const JUMP_BUFFER_TIME = 6 / 60;          // 6 ticks

const BACKDASH_DISTANCE = 1.5 * UNITY_PX; // 1.5 u → 36 px
const BACKDASH_DURATION = 15 / 60;        // 15 ticks
const BACKDASH_INVULN_TIME = 3 / 60;      // first 3 ticks
const BACKDASH_REVERSAL_WINDOW = 9 / 60;  // flick toward facing, then back within 9 ticks
// After a backdash no sprint can start right away (stale direction is
// suppressed for 8 ticks in Unity). The prototype keeps its dodge cooldown.
const BACKDASH_SUPPRESS_TIME = 8 / 60;
const BACKDASH_COOLDOWN = 0.5;
// Sprint Attack (sprint punisher) — Unity CharacterDefinition "Sprint Attack":
// the Forward Heavy at normal Heavy strength, started at once from a sprint.
// It keeps advancing until it connects; a clean hit carries the attacker a
// little further and drives the target back (forced ground recoil, no launch).
const SPRINT_ATTACK_ACTIVE_TIME = .20;                 // advancing hit window
const SPRINT_ATTACK_CARRY_DISTANCE = 0.6 * UNITY_PX;   // _sprintAttackLungeDistance
const SPRINT_ATTACK_CARRY_TIME = 6 / 60;               // _sprintAttackLungeTicks
const SPRINT_ATTACK_RECOIL_DISTANCE = 1.8 * UNITY_PX;  // _sprintAttackTargetRecoilDistance

const KB_DECAY_RATE = 450;

// ── Hit Effect Constants ──────────────────────────────────────────────
const HITSTOP_NORMAL = 4;
const HITSTOP_CHARGED_MAX = 8;

const FINISHER_RECOIL_TICKS = 12;
const PERFECT_FINISHER_KB_MULT = 1.5;

// Launch speeds applied to hit targets (their own gravity) — combat tuning, unchanged.
const CHARGED_LAUNCHER_MIN_VEL = 350;
const CHARGED_LAUNCHER_MAX_VEL = 650;
const LAUNCHER_LANDING_RECOVERY_TICKS = 18;

const PERFECT_BLOCK_ATTACKER_RECOIL = 0.7;
const PERFECT_BLOCK_ATTACKER_RECOIL_TICKS = 8;

const GRAB_THROW_KB = 5.0;
const GRAB_RANGE = 55;

const AIR_STEER_ACCEL = 6.0 * UNITY_PX;   // sprint-jump air steering, 6 u/s²
// The player's own combat launches (uppercut, dive, being hit) keep their
// former arc height under the new gravity: v scales with sqrt(g_new / g_old).
const PLAYER_ARC_SCALE = Math.sqrt(UNITY_MOVEMENT.gravity / 1250);
const LAUNCHER_GRAV_SCALE = 0.65;
const LAUNCHER_APEX_GRAV_SCALE = 0.45;
const LAUNCHER_APEX_VEL_THRESH = 1.25 * UNITY_PX; // |v| ≤ 1.25 u/s near the apex

const BLOCK_MOVE_MULT = 0.4;

// ── Mobile movement (concept doc §4.5) — playtest start values ──────────
const TOUCH_SPRINT_MIN_DISTANCE = 150; // guaranteed run after a sprint flick
const TOUCH_SPRINT_MIN_TIME = 0.6;     // collisions may eat the distance

// ── Resources ───────────────────────────────────────────────────────────
const MANA_REGEN = 9;            // spent mana regenerates; bound mana stays bound
// Focus values from the Unity CharacterDefinition (character_base_fighter).
const FOCUS_DECAY_RATE = 1.0;    // per second (_focusDecayPerTick 1/60), after the grace period
// A real transformation has no timer of its own: it burns the Focus meter
// (full meter ≈ 67 s) and lasts as long as combos keep refilling it.
const FOCUS_TRANSFORM_DRAIN = 1.5; // Focus per second while transformed (_transformationFocusDrainPerSecond)
const FOCUS_TRANSFORM_GAIN_MULT = 0.5; // gains are halved while transformed (_transformationFocusGainMultiplier)
const FOCUS_DECAY_DELAY = 5;     // _focusDecayGraceTicks 300 @ 60 Hz
const CLASH_MOVE_MULT = 0.45;

function keyboardMoveX(input) {
  const keys = input?.keys ?? {};
  return (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
}

function moveTowards(current, target, maxDelta) {
  const diff = target - current;
  if (Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

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
    // Mana model: mp is current (unspent) mana. Part of it is bound to the
    // prepared slots and part may be reserved by an open drawing; only the
    // remaining FREE mana can start a new rune.
    this.reservedMana = 0;
    this.maxSp = 100; this.sp = 100;
    this.moveSpeed = UNITY_MOVEMENT.walkSpeed;
    this.depthSpeed = DEPTH_SPEED;
    this.jumpForce = UNITY_MOVEMENT.jumpVelocity;
    this.jumpsLeft = 1;
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
    this.primalBond = null;
    this.buffForm = null;
    this.focusTransformPower = 1;
    this.focusDecayDelay = FOCUS_DECAY_DELAY;
    this.activeClash = null;
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
    // ── Movement spec state ──
    this.kbVelX = 0;
    this.kbVelZ = 0;
    this.sprintActive = false;
    this.sprintDir = 0;
    this._prevInputDir = 0;
    this._lastFlickDir = 0;
    this._lastFlickTime = 0;
    this.backdashTimer = 0;
    this.backdashDir = 0;
    this.backdashTotalTicks = 0;
    this.backdashTicksLeft = 0;
    this.backdashSuppressTimer = 0;
    this.backdashCooldown = 0;
    this.touchSprint = null;
    this.touchFacingLock = false;
    this.jumpBufferTimer = 0;
    this.isSprintJump = false;
    this.launcherMode = false;
    this.sprintLean = 0;
    this.sprintBobPhase = 0;
    this.chargeTimer = 0;
    this.chargeDir = 'forward';
    this.chargeMaxTime = 1.0;
    this._wasAirborne = false;
    this.perfectBlockFlash = 0;
    this.guardStaggerTimer = 0;
    this.entityHitstop = 0;
    this.hitRecoilTimer = 0;
    this.hitRecoilDistance = 0;
    this.hitRecoilDir = 0;
    this.hitRecoilPhase = 'snap';
    this.forcedRecoilTimer = 0;
    this.forcedRecoilDistance = 0;
    this.forcedRecoilDir = 0;
    this.forcedRecoilTotalTicks = 0;
    this.forcedRecoilTicksLeft = 0;
    this.landingRecoveryTimer = 0;
    this.grabCooldown = 0;
  }

  get isAlive() { return this.lifeState === 'Alive'; }
  get boundMana() { return this.slottedSpells.reduce((sum, slot) => sum + (slot.manaCost ?? 0), 0); }
  get freeMana() { return Math.max(0, this.mp - this.boundMana - (this.reservedMana ?? 0)); }

  setHero(heroKey) {
    if (!this.isAlive || !sprites.sprites[heroKey]) return;
    this.heroKey = heroKey;
    audio.playSlash(1.3);
    combat.spawnShockwave(this.x, this.y - 25, 40, '#ffd700');
  }

  update(dt, input, battlefield, gameWorld = null) {
    if (this.entityHitstop > 0) {
      this.entityHitstop = Math.max(0, this.entityHitstop - dt * 60);
    }
    this.animTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.perfectBlockFlash = Math.max(0, this.perfectBlockFlash - dt);
    this.guardStaggerTimer = Math.max(0, this.guardStaggerTimer - dt);
    this._wasAirborne = !this.grounded;
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

    this.mp = Math.min(this.maxMp, this.mp + dt * MANA_REGEN);
    // Focus drains after a short grace period without gains. A full meter
    // holds while the transformation is ready to be activated.
    if (this.focusTransformTimer <= 0 && !this.primalBond && this.focus < this.maxFocus) {
      this.focusDecayDelay = Math.max(0, this.focusDecayDelay - dt);
      if (this.focusDecayDelay <= 0) this.focus = Math.max(0, this.focus - FOCUS_DECAY_RATE * dt);
    }
    this.backdashCooldown = Math.max(0, this.backdashCooldown - dt);
    this.sp = Math.min(this.maxSp, this.sp + dt * 25);
    this.auraShockCooldown = Math.max(0, this.auraShockCooldown - dt);
    this.arcaneShieldTimer = Math.max(0, this.arcaneShieldTimer - dt);
    this.arcaneShieldCooldown = Math.max(0, this.arcaneShieldCooldown - dt);
    this.eidolonTimer = Math.max(0, this.eidolonTimer - dt);
    this.eidolonCooldown = Math.max(0, this.eidolonCooldown - dt);
    if (this.eidolonTimer <= 0) { this.eidolonPower = 1; this.eidolonArmor = 0; }
    this.ninefoldTimer = Math.max(0, this.ninefoldTimer - dt);
    // How long each body form has been manifest (drives its build-up).
    this.eidolonAge = this.eidolonTimer > 0 ? (this.eidolonAge ?? 0) + dt : 0;
    this.ninefoldAge = this.ninefoldTimer > 0 ? (this.ninefoldAge ?? 0) + dt : 0;
    // Smoothed run speed along the facing: body forms lean, lag and stream with it.
    const runAlongFacing = Math.max(-1, Math.min(1, (this.vx ?? 0) * (this.facing || 1) / 340));
    this.formLean = (this.formLean ?? 0) + (runAlongFacing - (this.formLean ?? 0)) * Math.min(1, dt * 6);
    this.ninefoldCooldown = Math.max(0, this.ninefoldCooldown - dt);
    if (this.ninefoldTimer <= 0) this.ninefoldPower = 1;
    if (this.focusTransformTimer > 0) {
      this.focus = Math.max(0, this.focus - FOCUS_TRANSFORM_DRAIN * dt);
      // Remaining time at the current meter (kept for every "is transformed" check).
      this.focusTransformTimer = this.focus > 0 ? this.focus / FOCUS_TRANSFORM_DRAIN : 0;
    }
    if (this.focusTransformTimer <= 0) this.focusTransformPower = 1;
    // Primal Bond: wind-up, merge, Focus drain (1.5/s × form), Fortified.
    updatePrimalBond(this, dt, FOCUS_TRANSFORM_DRAIN);
    // Buff transformation (special rune): limited time, one at a time.
    updateBuffForm(this, dt);
    // Signature special stance (hover, lenses, blades, needles …).
    updateSignatureStance(this, dt, window.gameWorld);
    if (this._sigBoost) { this._sigBoost.t -= dt; if (this._sigBoost.t <= 0) this._sigBoost = null; }
    this.attackBufferTimer = Math.max(0, this.attackBufferTimer - dt);
    if (this.attackBufferTimer <= 0) this.queuedAttack = null;
    this.guardBreakTimer = Math.max(0, this.guardBreakTimer - dt);
    if (this.arcaneShieldTimer <= 0) this.arcaneShield = 0;
    this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    this.rootTimer = Math.max(0, (this.rootTimer ?? 0) - dt);
    this.landingRecoveryTimer = Math.max(0, this.landingRecoveryTimer - dt);
    this.grabCooldown = Math.max(0, this.grabCooldown - dt);
    if (this.slowTimer <= 0) this.slowFactor = 1;
    this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
    if (this.comboResetTimer <= 0) this.comboStep = 0;
    // Charged heavy direction follows the held direction until release
    // (K first, then W / S works as well as W / S first; stick up / down on a pad).
    if (this.chargeTimer > 0 && input && this.chargeSource !== 'touch') {
      const k = input.keys ?? {}; const pz = input.padMove?.z ?? 0; const px = (input.padMove?.x ?? 0) * (this.facing || 1);
      const ahead = this.facing < 0 ? k.KeyA || k.ArrowLeft : k.KeyD || k.ArrowRight;
      // A charge without a direction is the HOLD slot (weapon reach / form pull).
      this.chargeDir = k.KeyW || k.ArrowUp || pz < -.6 ? 'up' : k.KeyS || k.ArrowDown || pz > .6 ? 'down' : ahead || px > .6 ? 'forward' : 'hold';
    }
    if (this.chargeTimer > 0 && this.formCharge) {
      // Form charge: no auto release at the threshold (safety cap 4 s).
      this.formCharge.elapsed += dt;
      if (this.formCharge.elapsed >= 4 || !activeMoveset(this)) this.releaseCharge();
    } else if (this.chargeTimer > 0) {
      this.chargeTimer = Math.max(0, this.chargeTimer - dt);
      if (this.chargeTimer <= 0) this.releaseCharge();
    }

    if (ACTION_STATES.has(this.state)) {
      if (this.sprintStrike) this.updateSprintAttack(dt);
      this.stateTimer -= dt;
      if (this.state === 'dash' && Math.random() < 0.6) {
        this.ghosts.push({ x: this.x, y: this.y, z: this.z, elevation: this.elevation, facing: this.facing, alpha: 0.5, state: this.state, animTime: this.animTime });
      }
      if (this.stateTimer <= 0) this.finishAction(input);
    }

    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    this.backdashSuppressTimer = Math.max(0, this.backdashSuppressTimer - dt);

    const controlsBlocked = input.gameplayBlocked || this.freezeTimer > 0 || this.state === 'hurt' || !this.isAlive;
    const whiffFree = this._whiffRecovery > 0 && /^attack[12]$/.test(this.state) && this.stateTimer <= this._whiffRecovery;
    const isAction = ACTION_STATES.has(this.state) && this.state !== 'hurt' && !whiffFree;
    const guardRequested = !!(input.keys?.KeyF || input.guardHeld);
    const wasGuarding = this.isGuarding;
    this.isGuarding = !controlsBlocked && !isAction && this.grounded
      && guardRequested && this.sp > 0 && this.guardBreakTimer <= 0
      && this.backdashTimer <= 0;
    if (this.isGuarding) {
      this.guardHoldTime = wasGuarding ? this.guardHoldTime + dt : 0;
      this.sp = Math.max(0, this.sp - dt * 8);
      this.state = 'guard';
      this.cancelSprint();
    } else {
      this.guardHoldTime = 0;
      this.guardStability = Math.min(100, this.guardStability + dt * 28);
    }

    this.updateKnockback(dt);

    const riding = this.isMounted;
    if (riding) {
      this.cancelSprint();
      this.updateMountedMovement(dt, input, battlefield, gameWorld, controlsBlocked || isAction);
    } else if (this.backdashTimer > 0) {
      this.updateBackdash(dt);
      this.integrateElevation(dt, this.getEffectiveGravity());
      const previousX = this.x; const previousZ = this.z;
      this.x += this.kbVelX * dt;
      this.z += this.kbVelZ * dt;
      battlefield.resolveEntityCollision(this);
      gameWorld?.resolveSpellObstacles(this, previousX, previousZ);
    } else {
      if (!controlsBlocked && !isAction) {
        if (this.grounded) {
          this.handleMovementInput(dt, input);
        } else if (this.isSprintJump) {
          this.updateAirSteering(dt, input);
          if (input.justPressed('Space')) this.jumpBufferTimer = JUMP_BUFFER_TIME;
        } else {
          if (input.justPressed('Space')) this.jumpBufferTimer = JUMP_BUFFER_TIME;
        }
      }
      this.integrateElevation(dt, this.getEffectiveGravity());
      const previousX = this.x; const previousZ = this.z;
      this.x += (this.vx + this.kbVelX) * dt;
      this.z += (this.vz + this.kbVelZ) * dt;
      battlefield.resolveEntityCollision(this);
      gameWorld?.resolveSpellObstacles(this, previousX, previousZ);
      if (this.sprintActive && this.grounded && Math.abs(this.vx) > this.moveSpeed && Math.abs(this.x - previousX) < Math.abs(this.vx) * dt * .2) this.cancelSprint();
      if (this.grounded) {
        if (this._wasAirborne) {
          formJumpFx(this, 'land');
          combat.spawnDust(this.x, this.y, 6);
          if (this.launcherMode) {
            combat.spawnShockwave(this.x, this.y - 2, 28, '#b0bec5');
            this.landingRecoveryTimer = LAUNCHER_LANDING_RECOVERY_TICKS / 60;
          }
        }
        this.jumpsLeft = 1;
        if (this.isSprintJump) this.isSprintJump = false;
        if (this.launcherMode) this.launcherMode = false;
        if (this.jumpBufferTimer > 0 && !controlsBlocked && !isAction && !this.isGuarding) {
          this.jumpBufferTimer = 0;
          this.performJump();
        }
      }
      if (!this.grounded && !ACTION_STATES.has(this.state)) this.state = this.vElevation > 0 ? 'jump' : 'fall';
    }

    this.updateSprintVisuals(dt);
    updateFormSprint(this, gameWorld, dt);
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
    // A held shadow (Shadow Stomper): no walking, sprinting or jumping.
    if (this.rootTimer > 0) {
      this.vx = 0; this.vz = 0;
      this.cancelSprint();
      if (!ACTION_STATES.has(this.state) && !this.isGuarding) this.state = 'idle';
      return;
    }
    let move = normalizeMove(moveVector(input));

    // Keyboard double-flicks keep their PC behaviour. Touch flicks are
    // classified by the left-half gesture router instead, so an active
    // joystick can never trigger a dash or sprint by itself.
    // Charging a heavy roots the Wizard (like Smash Bros. smash attacks): no
    // walking, sprinting, dashing or jumping until it is released.
    if (this.chargeTimer > 0) {
      this.vx = moveTowards(this.vx, 0, this.moveSpeed / WALK_DECEL_TIME * dt);
      this.vz = moveTowards(this.vz, 0, this.depthSpeed / WALK_DECEL_TIME * dt);
      this._prevInputDir = 0;
      return;
    }
    this.detectFlicks(input?.touchMove?.x ? keyboardMoveX(input) : move.x, input);

    if (this.touchSprint && this.sprintActive) {
      this.touchSprint.time += dt;
      // Guaranteed minimum run after a sprint flick, even if the finger was
      // lifted. Strong counter-steering still cancels into a brake.
      const along = move.x * this.sprintDir;
      const minRunLeft = this.touchSprint.remaining > 0 && this.touchSprint.time < TOUCH_SPRINT_MIN_TIME;
      if (minRunLeft && along < 0.3 && along > -0.5) move = { x: this.sprintDir, z: move.z };
    }

    if (this.backdashTimer > 0) return;

    if (this.landingRecoveryTimer > 0) {
      this.vx = moveTowards(this.vx, 0, this.moveSpeed / WALK_DECEL_TIME * dt);
      this.vz = moveTowards(this.vz, 0, this.depthSpeed / WALK_DECEL_TIME * dt);
      return;
    }

    // Auto-run (user request): a sprint keeps going without holding the direction until
    // another movement input — the opposite direction or a depth input — ends it.
    if (this.sprintActive) {
      const reverse = Math.abs(move.x) >= .3 && Math.sign(move.x) !== this.sprintDir;
      if (reverse || Math.abs(move.z) >= .3) this.cancelSprint();
      else move = { x: this.sprintDir, z: 0 };
    }
    if (Math.abs(move.x) > 0.02 && !this.sprintActive && !this.isGuarding && !this.touchFacingLock) this.facing = Math.sign(move.x);

    const sprintMult = this.sprintActive ? SPRINT_MULT : 1;
    const guardMult = this.isGuarding ? BLOCK_MOVE_MULT : 1;
    const beastMult = this.ninefoldTimer > 0 ? 1.23 : 1;
    const focusMult = this.focusTransformTimer > 0 ? 1.12 : 1;
    const clashMult = this.activeClash ? CLASH_MOVE_MULT : 1;
    const burrowMult = this.burrowed ? 1.35 : 1;
    const bondMult = bondMoveMultiplier(this) * (isGenericBuff(this) ? 1.08 : 1); // Wolf bond: SpeedBoost; buff forms move a little faster
    // Signature specials: hover stances glide slower, walkways / currents speed up.
    const sigMult = signatureMoveMult(this) * (this._sigBoost?.k ?? 1);
    const combinedMult = this.slowFactor * guardMult * beastMult * focusMult * sprintMult * clashMult * burrowMult * bondMult * sigMult;

    const baseSpeed = this.moveSpeed;
    const baseDepth = this.depthSpeed;
    const targetX = move.x * baseSpeed * combinedMult;
    // Sprint speeds up the lateral axis only (Unity: depth stays at walk speed).
    const targetZ = this.isGuarding ? 0 : move.z * baseDepth * combinedMult / sprintMult;

    const accelSpeed = this.sprintActive ? baseSpeed * SPRINT_MULT : baseSpeed;
    this.vx = this.accelerateAxis(this.vx, targetX, accelSpeed, dt);
    this.vz = this.accelerateAxis(this.vz, targetZ, baseDepth * (combinedMult > 1 ? combinedMult : 1), dt);
    if (this.touchSprint) this.touchSprint.remaining -= Math.abs(this.vx) * dt;


    const moving = Math.hypot(move.x, move.z) > 0.05;
    if (moving && this.grounded) {
      this.state = 'run';
      if (Math.random() < 0.12) combat.spawnDust(this.x, this.y, 1);
    } else if (this.grounded && (this.state === 'run' || this.state === 'guard')) {
      this.state = this.isGuarding ? 'guard' : 'idle';
    }

    if (!this.isGuarding && input.justPressed('Space') && this.jumpsLeft > 0) {
      this.performJump();
    }

    if (input.justPressed('KeyJ') || input.justPressed('Mouse0')) {
      // The attack reads the sprint first (sprint attack / weapon throw).
      this.executeAttack(input);
      this.cancelSprint();
    }

    if (this.isGuarding && (move.z > 0.55 || input.keys?.ArrowDown || input.keys?.KeyS)) {
      const targets = window.gameWorld?.getHostileTargets(this.team, true) ?? [];
      this.attemptGrab(targets);
    }
  }

  accelerateAxis(current, target, refSpeed, dt) {
    if (Math.abs(target) < 0.01 && Math.abs(current) < 0.01) return 0;
    // Ice (environment layer): slow to brake and to turn, a bit slow to start.
    const grip = this.onIce ? .22 : 1;
    const isReversing = current !== 0 && target !== 0 && Math.sign(target) !== Math.sign(current);
    let rate;
    if (isReversing) {
      rate = 2 * refSpeed / TURN_TIME * grip;
    } else if (Math.abs(target) >= Math.abs(current)) {
      const accelTime = this.sprintActive ? SPRINT_ACCEL_TIME : WALK_ACCEL_TIME;
      rate = refSpeed / accelTime * (this.onIce ? .55 : 1);
    } else {
      rate = refSpeed / WALK_DECEL_TIME * grip;
    }
    return moveTowards(current, target, rate * dt);
  }

  detectFlicks(moveX, input) {
    const flickThresh = 0.45;
    const currentDir = moveX > flickThresh ? 1 : moveX < -flickThresh ? -1 : 0;

    if (currentDir !== 0 && this._prevInputDir === 0) {
      this.onDirectionalFlick(currentDir);
    }
    this._prevInputDir = currentDir;
  }

  onDirectionalFlick(dir) {
    const now = performance.now() * 0.001;
    const timeSinceLast = now - this._lastFlickTime;

    if (this._lastFlickDir !== 0 && timeSinceLast < BACKDASH_REVERSAL_WINDOW) {
      if (this._lastFlickDir === this.facing && dir === -this.facing) {
        this._lastFlickDir = 0;
        this.triggerBackdash();
        return;
      }
    }

    if (this._lastFlickDir === dir && timeSinceLast < SPRINT_FLICK_WINDOW) {
      this._lastFlickDir = 0;
      this.activateSprint(dir);
      return;
    }

    this._lastFlickDir = dir;
    this._lastFlickTime = now;
  }

  performJump() {
    if (this.jumpsLeft <= 0 || this.rootTimer > 0) return;
    const wasSprinting = this.sprintActive;
    this.cancelSprint();
    this.jumpsLeft--;
    this.vElevation = this.jumpForce;
    this.grounded = false;
    this.state = 'jump';
    this.isSprintJump = wasSprinting;
    audio.playJump();
    combat.spawnDust(this.x, this.y, 3);
    formJumpFx(this, 'takeoff');
  }

  activateSprint(dir) {
    this._sprintHits = new Set();
    if (this.rootTimer > 0 || this.isGuarding || this.backdashTimer > 0 || this.backdashSuppressTimer > 0 || !this.grounded || this.activeClash) return;
    this.sprintActive = true;
    this.sprintDir = dir;
    audio.playDash();
    combat.spawnDust(this.x, this.y, 5);
    combat.spawnShockwave(this.x, this.y - 15, 18, '#80ffea');
  }

  cancelSprint() {
    this.touchSprint = null;
    if (!this.sprintActive) return;
    this.sprintActive = false;
    this.sprintDir = 0;
  }

  // Mobile sprint flick: a movement state with a guaranteed minimum run,
  // joystick steering while the finger stays down and a controlled end.
  startTouchSprint(dir) {
    this.activateSprint(dir);
    if (!this.sprintActive) return false;
    this.touchSprint = { remaining: TOUCH_SPRINT_MIN_DISTANCE, time: 0, held: true };
    return true;
  }

  releaseTouchSprint() {
    if (this.touchSprint) this.touchSprint.held = false;
  }

  beginCharge(direction = 'forward', source = 'key') {
    this.chargeSource = source;
    if (!this.isAlive || this.isGuarding || !this.grounded || this.chargeTimer > 0) return false;
    if (ACTION_STATES.has(this.state)) return false;
    // Inside a transformation / manifest the charge feeds a form technique:
    // held for FULL_CHARGE_TIME it becomes the FULL version and can be held.
    this.formCharge = activeMoveset(this) ? { elapsed: 0 } : null;
    this.chargeTimer = this.formCharge ? 99 : this.chargeMaxTime;
    this.chargeDir = direction;
    this.state = 'guard';
    this.cancelSprint();
    audio.playImpact(false);
    return true;
  }

  // HOLD slot (attack held without a direction): weapon reach in the normal
  // mode, the PULL in an Arcane State / transformation (hold_actions.js).
  holdAttack(charge = 0) {
    if (!this.isAlive || !this.grounded || this.isGuarding || ACTION_STATES.has(this.state) && this.state !== 'guard') return false;
    const game = window.gameWorld;
    if (activeMoveset(this)) {
      // Every Arcane State special costs mana; the Focus transformations burn Focus instead.
      const form = currentBuffForm(this);
      const mat = form?.mat;
      return releaseFormPull(this, game, spells, { color: mat?.vein ?? '#c9a8ff', core: mat?.edge ?? '#ffffff', mana: !!(this.buffForm?.timer > 0) });
    }
    return releaseWeaponReach(this, spells, charge);
  }

  releaseCharge() {
    // Transformations / manifests: one of six form techniques (or the HOLD pull).
    if (this.formCharge) {
      const charge = this.formCharge; this.formCharge = null; this.chargeTimer = 0;
      if (!this.isAlive || charge.elapsed < .08) return false;
      if (this.chargeDir === 'hold') { this.state = 'idle'; return this.holdAttack(); }
      return this.releaseFormTechnique(charge.elapsed >= FULL_CHARGE_TIME);
    }
    const chargeRatio = 1 - (this.chargeTimer / this.chargeMaxTime);
    this.chargeTimer = 0;
    if (this.chargeDir === 'hold') { if (this.isAlive) this.state = 'idle'; return this.isAlive ? this.holdAttack(chargeRatio) : false; }
    if (!this.isAlive || chargeRatio < 0.05) return false;
    const heavy = MELEE_BASELINE.heavy;
    signatureEvent(this, 'heavy', { charge: chargeRatio });
    const dmgMult = 1 + chargeRatio * 0.8;
    const kbMult = 1 + chargeRatio * 0.6;
    const dir = this.chargeDir ?? 'forward';
    // Ranged weapons: the charged heavy is a stronger shot — UP a volley, DOWN a low pinning shot.
    const weaponHeavy = this.weaponProfile?.heavy;
    if (weaponHeavy?.shot && dir !== 'forward') {
      this.state = 'heavyStrike'; this.stateTimer = heavy.time; this._weaponSwingTime = heavy.time; this.setWeaponMotion('heavy'); this.vx = 0; this.canAttack = false;
      const shots = makeWeaponShots(this, { ...weaponHeavy.shot, pierce: weaponHeavy.shot.pierce || chargeRatio > .7 }, this.weapon ?? this.classWeapon, { power: 1 + chargeRatio * .8, volley: dir === 'up' ? 2 : 0, low: dir === 'down' });
      for (const shot of shots) spells.addSpell(shot, 'B');
      audio.playSlash(.9 - chargeRatio * .2);
      return true;
    }
    if (dir !== 'forward') {
      // Up: a rising launcher that lifts the target high (air follow-ups);
      // Down: a low sweep along the ground that breaks guards and trips.
      const up = dir === 'up';
      this.state = up ? 'uppercut' : 'heavyStrike'; this.stateTimer = heavy.time; this._weaponSwingTime = heavy.time;
      this.setWeaponMotion(up ? 'uppercut' : 'heavy');
      this.vx = 0; this.canAttack = false;
      if (up) this.vElevation = 180 * PLAYER_ARC_SCALE;
      audio.playSlash(up ? 1.05 : .7);
      combat.spawnSlashArc(this.x + this.facing * 20, this.y - (up ? 30 : 8), this.facing, up ? { radius: 56 + chargeRatio * 16, angleStart: -1.5, angleEnd: .5, color: '#ffea00', glow: '#ff9800', width: 6 + chargeRatio * 4 } : { radius: 64 + chargeRatio * 18, angleStart: .1, angleEnd: 1.2, color: '#ffd54f', glow: '#ff6d00', width: 6 + chargeRatio * 4 });
      if (!up) combat.spawnShockwave(this.x + this.facing * 34, this.y - 2, 40 + chargeRatio * 20, '#ffab00');
      this.triggerMeleeHitbox(heavy.damage * dmgMult * (up ? .9 : .85), this.facing * heavy.knockback * (up ? .35 : .7) * kbMult, up ? 420 + chargeRatio * 160 : 40, up ? .55 : .5 + chargeRatio * .2, chargeRatio > 0.7, { hitstopTicks: Math.round(4 + chargeRatio * 4), hitReaction: up ? 'launch' : 'trip', isCharged: true, chargeRatio, guardBreak: up ? 0 : 18 + chargeRatio * 20 });
      return true;
    }
    this.state = 'heavyStrike';
    this.stateTimer = heavy.time;
    this._weaponSwingTime = heavy.time;
    this.setWeaponMotion('heavy');
    this.vx = 0; this.vz = 0; // rooted heavy (Unity)
    this.canAttack = false;
    audio.playSlash(0.78 - chargeRatio * 0.15);
    const radius = 58 + chargeRatio * 20;
    combat.spawnSlashArc(this.x + this.facing * 28, this.y - 25, this.facing, { radius, angleStart: -0.9, angleEnd: 0.9, color: chargeRatio > 0.5 ? '#ff6d00' : '#ffd54f', glow: '#ff3d00', width: 7 + chargeRatio * 5 });
    if (chargeRatio > 0.6) combat.spawnShockwave(this.x + this.facing * 30, this.y - 25, 35, '#ffab00');
    this.triggerMeleeHitbox(heavy.damage * dmgMult, this.facing * heavy.knockback * kbMult, heavy.lift * (1 + chargeRatio * 0.4), 0.48 + chargeRatio * 0.2, chargeRatio > 0.7, { guardBreak: 30 + chargeRatio * 70, hitstopTicks: Math.round(4 + chargeRatio * 4), hitReaction: chargeRatio > 0.7 ? 'finisher' : 'strong', isCharged: true, chargeRatio });
    return true;
  }

  // Recovery per form and tier (moveset doc: Kyubi fast, Susanoo heavy).
  releaseFormTechnique(full) {
    const form = activeMoveset(this);
    // Arcane State techniques cost mana from the free pool (runes bind theirs when drawn,
    // the Focus transformation burns Focus): combining both forms has a real price.
    if (this.buffForm?.timer > 0 && form === (this.buffForm.id === 'B01' ? 'ninefold' : this.buffForm.id === 'B02' ? 'eidolon' : this.buffForm.id)) {
      const cost = full ? ARCANE_TECH_MANA.full : ARCANE_TECH_MANA.short;
      if (this.freeMana < cost) {
        combat.spawnDamageText(this.x, this.y - 70, 'NO MANA', { color: '#64b5f6' });
        combat.spawnShockwave(this.x + (this.facing || 1) * 20, this.y - 40, 22, '#64b5f6');
        this.state = 'attack1'; this.stateTimer = .2; this.canAttack = false;
        return false;
      }
      this.mp -= cost;
    }
    const name = releaseFormTechnique(this, window.gameWorld, spells, this.chargeDir ?? 'forward', full);
    if (!name) return false;
    signatureEvent(this, 'heavy', { full, form: true });
    if (this.buffForm) this.buffForm.lastTech = { dir: this.chargeDir ?? 'forward', full, at: this.buffForm.age };
    const recovery = { ninefold: full ? .42 : .2, eidolon: full ? .55 : .28, ascendant: full ? .45 : .24 }[form] ?? .3;
    this.state = this.chargeDir === 'up' ? 'uppercut' : 'attack3';
    this.stateTimer = recovery; this.canAttack = false; this.vx = 0;
    combat.shakeCamera(full ? 8 : 4, .25);
    this.lastFormTechnique = name;
    return true;
  }

  attemptGrab(targets) {
    if (!this.isAlive || !this.isGuarding || this.grabCooldown > 0) return false;
    let closest = null;
    let closestDist = GRAB_RANGE;
    for (const t of targets) {
      if (!t.isAlive && !t.hp) continue;
      const dx = Math.abs(t.x - this.x);
      const dz = Math.abs((t.z ?? this.z) - this.z);
      const dist = Math.hypot(dx, dz * 150);
      if (dist < closestDist) { closest = t; closestDist = dist; }
    }
    const grabForm = activeMoveset(this);
    if (this.buffForm) { this.buffForm.grabAt = this.buffForm.age; this.buffForm.grabHit = !!closest; this.buffForm.grabX = closest?.x ?? null; }
    if (!closest) {
      // A form shows a short search pulse when the grab misses.
      if (grabForm && this.grabCooldown <= 0) { this.grabCooldown = .5; spells.addSpell(new FormGrabFx(this, null, grabForm), 'B'); }
      return false;
    }
    if (grabForm) spells.addSpell(new FormGrabFx(this, closest, grabForm), 'B');
    this.grabCooldown = 1.5;
    this.isGuarding = false;
    this.state = 'attack1';
    this.stateTimer = 0.3;
    this.canAttack = false;
    const throwDir = this.facing;
    closest.kbVelX = throwDir * GRAB_THROW_KB * 60;
    closest.vx = 0;
    if (closest.takeDamage) {
      closest.takeDamage(18, throwDir * 120, 60, 0.4, false, 'grab');
    }
    audio.playImpact(true);
    combat.spawnShockwave(closest.x, closest.y - 25, 30, '#ffd740');
    combat.spawnDamageText(this.x, this.y - 55, 'GRAB', { color: '#ffd740', isCrit: true });
    return true;
  }

  triggerBackdash(options = {}) {
    if (this.rootTimer > 0 || this.isGuarding || this.backdashTimer > 0 || this.backdashCooldown > 0 || !this.grounded || !this.isAlive || this.activeClash) return false;
    this.backdashCooldown = BACKDASH_COOLDOWN + BACKDASH_DURATION;
    // Forget pending direction flicks so the dodge cannot turn into a sprint.
    this._lastFlickDir = 0; this._lastFlickTime = 0;
    this.cancelSprint();
    this.backdashDir = -this.facing;
    this.backdashTimer = BACKDASH_DURATION;
    this.backdashTotalTicks = Math.round(BACKDASH_DURATION * 60);
    this.backdashTicksLeft = this.backdashTotalTicks;
    this.invulnerableTimer = BACKDASH_INVULN_TIME;
    this.state = 'dash';
    this.stateTimer = BACKDASH_DURATION;
    this.vx = 0; this.vz = 0;
    audio.playDash();
    combat.spawnShockwave(this.x, this.y - 25, 24, '#80d8ff');
    return true;
  }

  updateBackdash(dt) {
    this.backdashTimer -= dt;
    if (this.backdashTimer <= 0) {
      this.backdashTimer = 0;
      this.backdashSuppressTimer = BACKDASH_SUPPRESS_TIME;
      this.state = this.grounded ? 'idle' : 'fall';
      this.stateTimer = 0;
      this.canAttack = true;
      return;
    }
    const total = this.backdashTotalTicks;
    const tickWeight = 2 * this.backdashTicksLeft / (total * (total + 1));
    const distThisTick = BACKDASH_DISTANCE * tickWeight;
    const speed = distThisTick * 60;
    this.x += this.backdashDir * speed * dt;
    this.backdashTicksLeft = Math.max(0, this.backdashTicksLeft - dt * 60);
    if (Math.random() < 0.5) {
      this.ghosts.push({ x: this.x, y: this.y, z: this.z, elevation: this.elevation, facing: this.facing, alpha: 0.45, state: 'dash', animTime: this.animTime });
    }
  }

  updateAirSteering(dt, input) {
    // Unity: RequestSprintJump locks the sprint velocity for the whole jump (the
    // 6 u/s² steering never applies), so a sprint jump carries ≈ 1.65 × further.
    // Only a firm counter-input brakes it gently.
    const move = normalizeMove(moveVector(input));
    if (Math.abs(move.x) > .5 && Math.sign(move.x) !== Math.sign(this.vx)) this.vx = moveTowards(this.vx, 0, AIR_STEER_ACCEL * dt);
  }

  updateKnockback(dt) {
    if (Math.abs(this.kbVelX) > 0.5) {
      const decay = KB_DECAY_RATE * dt;
      this.kbVelX = Math.abs(this.kbVelX) <= decay ? 0 : this.kbVelX - Math.sign(this.kbVelX) * decay;
    } else {
      this.kbVelX = 0;
    }
    if (Math.abs(this.kbVelZ) > 0.001) {
      const decay = (KB_DECAY_RATE / 300) * dt;
      this.kbVelZ = Math.abs(this.kbVelZ) <= decay ? 0 : this.kbVelZ - Math.sign(this.kbVelZ) * decay;
    } else {
      this.kbVelZ = 0;
    }
  }

  getEffectiveGravity() {
    const g = UNITY_MOVEMENT.gravity;
    if (!this.launcherMode) return g;
    if (Math.abs(this.vElevation) <= LAUNCHER_APEX_VEL_THRESH) return g * LAUNCHER_APEX_GRAV_SCALE;
    return g * LAUNCHER_GRAV_SCALE;
  }

  updateSprintVisuals(dt) {
    const targetLean = this.sprintActive ? this.sprintDir * 20 : 0;
    const leanRate = this.sprintActive ? (1 / 0.06) : (1 / 0.10);
    this.sprintLean = moveTowards(this.sprintLean, targetLean, leanRate * Math.abs(targetLean || 20) * dt);
    if (this.sprintActive) {
      this.sprintBobPhase += dt * 10 * Math.PI * 2;
      if (Math.random() < 0.55) combat.spawnDust(this.x - this.sprintDir * 8, this.y, 1);
      if (Math.random() < 0.3) {
        this.ghosts.push({ x: this.x, y: this.y, z: this.z, elevation: this.elevation, facing: this.facing, alpha: 0.25, state: 'run', animTime: this.animTime });
      }
    } else {
      this.sprintBobPhase = 0;
    }
  }

  finishAction(input = null) {
    this.sprintStrike = null;
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
    if (!this.isAlive || this.isGuarding || this.burrowed || !window.gameWorld?.isMatchRunning?.()) return false;
    // Holding targets with Gravity Lift: the attack releases them instead.
    if (this.activeTelekinesis && !this.activeTelekinesis.isFinished) {
      const back = attackKind === 'normal' && normalizeMove(moveVector(input)).x * (this.facing || 1) < -.5;
      return this.activeTelekinesis.release(back ? 'pull' : attackKind);
    }
    // Sprint + attack: a picked-up field weapon is thrown (Little Fighter
    // style); otherwise — bare hands or the class's own fixed weapon, which
    // can never be thrown — it is the Sprint Attack.
    const sprinting = this.sprintActive && this.grounded && !ACTION_STATES.has(this.state) && this.canAttack;
    if (sprinting && (attackKind === 'normal' || attackKind === 'heavy')) {
      return this.weapon ? this.throwWeapon() : this.startSprintAttack();
    }
    // Attack while standing on a field weapon picks it up.
    if (attackKind === 'normal' && !ACTION_STATES.has(this.state) && this.grounded) {
      if (window.gameWorld?.tryPickupWeapon?.(this)) return true;
    }
    if (ACTION_STATES.has(this.state) || !this.canAttack) {
      const canBuffer = attackKind === 'normal' && /^attack[123]$/.test(this.state) && this.stateTimer <= MELEE_BASELINE.bufferWindow;
      if (canBuffer) {
        this.queuedAttack = 'normal';
        this.attackBufferTimer = MELEE_BASELINE.bufferWindow + .10;
      }
      return canBuffer;
    }
    this.canAttack = false;
    this.cancelSprint();
    const move = moveVector(input);
    const weapon = this.weaponProfile;
    if (attackKind === 'uppercut' || input.keys?.KeyU) {
      const up = weapon ? { ...MELEE_BASELINE.uppercut, ...weapon.uppercut } : MELEE_BASELINE.uppercut;
      this.state = 'uppercut'; this.stateTimer = up.time; this._weaponSwingTime = up.time; this.vElevation = 280 * PLAYER_ARC_SCALE;
      this.setWeaponMotion('uppercut');
      audio.playSlash(1.2);
      // An astral weapon draws its own trail; bare hands keep the slash arc.
      if (!weapon) combat.spawnSlashArc(this.x, this.y - 25, this.facing, { radius: 46, angleStart: -1.2, angleEnd: 0.6, color: '#ffea00', glow: '#ff9800' });
      this.triggerMeleeHitbox(up.damage, this.facing * up.knockback, up.lift, 0.5, false, { hitstopTicks: up.hitstopTicks, hitReaction: up.hitReaction });
      return true;
    }
    if (!this.grounded && (attackKind === 'dive' || move.z > 0.55)) {
      this.state = 'dive'; this.stateTimer = MELEE_BASELINE.dive.time; this.vElevation = -850 * PLAYER_ARC_SCALE;
      audio.playSlash(0.9);
      combat.spawnSlashArc(this.x, this.y - 15, this.facing, { radius: 50, angleStart: 0.8, angleEnd: 2.2, color: '#ff5722', glow: '#d50000' });
      this.triggerMeleeHitbox(MELEE_BASELINE.dive.damage, this.facing * MELEE_BASELINE.dive.knockback, MELEE_BASELINE.dive.lift, 0.6, false, { hitstopTicks: MELEE_BASELINE.dive.hitstopTicks, hitReaction: MELEE_BASELINE.dive.hitReaction });
      return true;
    }
    if (attackKind === 'heavy') {
      const heavy = weapon ? { ...MELEE_BASELINE.heavy, ...weapon.heavy } : MELEE_BASELINE.heavy;
      this.state = 'heavyStrike'; this.stateTimer = heavy.time; this._weaponSwingTime = heavy.time; this.vx = 0; this.vz = 0;
      signatureEvent(this, 'heavy', { charge: 0 });
      this.setWeaponMotion('heavy');
      if (heavy.shot) { for (const shot of makeWeaponShots(this, heavy.shot, this.weapon ?? this.classWeapon)) spells.addSpell(shot, 'B'); return true; }
      audio.playSlash(0.78);
      if (!weapon) combat.spawnSlashArc(this.x + this.facing * 28, this.y - 25, this.facing, { radius: 58, angleStart: -0.9, angleEnd: 0.9, color: '#ffd54f', glow: '#ff6d00', width: 7 });
      this.triggerMeleeHitbox(heavy.damage, this.facing * heavy.knockback, heavy.lift, 0.48, true, { hitstopTicks: heavy.hitstopTicks, hitReaction: heavy.hitReaction, reach: heavy.reach, freeze: heavy.freeze });
      return true;
    }
    // A held weapon brings its own combo (length, speed, reach, finisher).
    const combo = weapon ? weapon.combo : MELEE_BASELINE.normal;
    this.comboStep = (this.comboStep % combo.length) + 1;
    this.comboResetTimer = 0.65;
    const attack = combo[this.comboStep - 1];
    // Unity: ground attacks root the Wizard — no forward lunge on a whiff.
    this.state = attack.state; this.stateTimer = attack.time; this._weaponSwingTime = attack.time; this.vx = 0; this.vz = 0;
    this._whiffRecovery = 0;
    signatureEvent(this, 'attack', { step: this.comboStep, damage: attack.damage });
    this.setWeaponMotion('combo', this.comboStep);
    audio.playSlash(attack.finisher ? 0.85 : 1 + this.comboStep * 0.1);
    if (!weapon) combat.spawnSlashArc(this.x + this.facing * 22, this.y - 28, this.facing, { radius: attack.radius, color: attack.color, glow: attack.glow, width: attack.finisher ? 7 : 4 });
    if (attack.finisher) {
      combat.spawnShockwave(this.x + this.facing * 16, this.y - 30, 60, '#ff3d00');
      combat.spawnShockwave(this.x + this.facing * 16, this.y - 30, 36, '#ffd740');
      combat.spawnHitSparks(this.x + this.facing * 20, this.y - 32, this.facing, '#ffd700', 14);
      combat.shakeCamera(6, 0.18);
    }
    // Ranged / magic weapons: the step fires real projectiles instead of a melee hitbox.
    // Ranged steps shoot only from the castle battlements (1 mana per shot, no spam);
    // on the lane every tap is melee — the weapon's ranged move is the HOLD slot.
    const castle = isOnCastle(this);
    const ranged = attack.shot ?? attack.bolt;
    if (ranged && castle && this.freeMana >= 1) {
      this.mp -= 1;
      for (const shot of makeWeaponShots(this, ranged, this.weapon ?? this.classWeapon)) spells.addSpell(shot, 'B');
      if (attack.shot) return true;
    }
    if (attack.shot) {
      // A bow / staff / card on the lane: a short melee bash with the weapon.
      const dmg = Math.max(14, Math.round((attack.shot.damage ?? 16) * (attack.shot.count ?? 1) * .7));
      const bash = this.triggerMeleeHitbox(dmg, this.facing * (attack.finisher ? 320 : 170) * (attack.finisher ? 1 : .3), attack.finisher ? 160 : 10, attack.finisher ? .6 : .35, !!attack.finisher, { hitstopTicks: 3, hitReaction: attack.finisher ? 'finisher' : 'light', reach: 66 });
      if (!bash && !attack.finisher) this._whiffRecovery = attack.time * .5;
      return true;
    }
    // Chain steps barely push (the target stays in front for the next hit); only the finisher sends it away.
    const push = attack.finisher ? 1 : .3; const pop = attack.finisher ? 1 : .2;
    const connected = this.triggerMeleeHitbox(attack.damage, this.facing * attack.knockback * push, attack.lift * pop, attack.finisher ? 0.6 : 0.4, !!attack.finisher, { hitstopTicks: attack.hitstopTicks, hitReaction: attack.hitReaction, reach: attack.reach, behind: attack.behind, crit: attack.crit, freeze: attack.freeze, guardBreak: attack.guardBreak, shockwave: attack.shockwave });
    // Unity whiff relief: a missed chain step frees locomotion once its active window is over.
    if (!connected && !attack.finisher) this._whiffRecovery = attack.time * .5;
    return true;
  }

  // Which motion the astral weapon plays (each weapon has its own set) and
  // which hand leads (paired weapons alternate per combo step).
  setWeaponMotion(kind, step = 1) {
    const id = this.weapon ?? this.classWeapon;
    this._weaponMotion = id ? weaponMotion(id, kind, step) : null;
    this._weaponLead = kind === 'combo' && step % 2 === 0 ? 'rear' : 'front';
    return this._weaponMotion;
  }

  // The moveset in use: a picked-up field weapon overrides the class weapon.
  get weaponProfile() {
    const id = this.weapon ?? this.classWeapon;
    return id ? WEAPONS[id] ?? null : null;
  }

  // The chosen class's own weapon: a fixed part of the Wizard — never thrown,
  // dropped or worn out. A field weapon picked up on top of it takes over the
  // moveset until it is thrown away or breaks.
  equipClassWeapon(weaponId) {
    this.classWeapon = WEAPONS[weaponId] ? weaponId : null;
    this.comboStep = 0;
    return this.classWeapon;
  }

  // In a transformation / manifest the form's own variant replaces it
  // (Beast Pounce, Colossus Breaker, Radiant Lunge — like Unity's Pounce /
  // Shell Rush sprint variants): own wind-up, reach, carry, recoil, recovery.
  startSprintAttack() {
    const weapon = this.weaponProfile;
    const heavy = weapon ? { ...MELEE_BASELINE.heavy, ...weapon.heavy } : MELEE_BASELINE.heavy;
    const form = activeMoveset(this);
    // Primal Bond: the Unity sprint attack with the bond's carry / push.
    const primal = form ? null : primalSprintVariant(this);
    const variant = form ? FORM_SPRINT_ATTACKS[form]
      : primal ? { ...primal, windup: 0, active: SPRINT_ATTACK_ACTIVE_TIME, recovery: Math.max(.05, heavy.time - SPRINT_ATTACK_ACTIVE_TIME) } : null;
    const speed = Math.max(Math.abs(this.vx), this.moveSpeed * SPRINT_MULT);
    this.cancelSprint();
    this.canAttack = false;
    this.comboStep = 0;
    this.queuedAttack = null;
    const windup = variant?.windup ?? 0;
    const active = variant?.active ?? SPRINT_ATTACK_ACTIVE_TIME;
    const time = variant ? windup + active + variant.recovery : heavy.time;
    this.state = 'heavyStrike'; this.stateTimer = time; this._weaponSwingTime = time;
    this.setWeaponMotion('heavy');
    this.vx = this.facing * speed * (variant?.windupSpeed ?? 1); this.vz = 0;
    this.sprintStrike = { heavy, form, variant, speed, windup, active, elapsed: 0, launched: false, connected: false, carry: 0, hits: new Set() };
    this.lastSprintAttack = variant?.name ?? 'SPRINT ATTACK';
    audio.playSlash(variant?.pitch ?? 0.82);
    combat.spawnDust(this.x, this.y, 6);
    if (variant && !variant.primal) spells.addSpell(new FormSprintAttackFx(this, form), 'B');
    else if (!weapon) combat.spawnSlashArc(this.x + this.facing * 28, this.y - 25, this.facing, { radius: 58, angleStart: -0.9, angleEnd: 0.9, color: '#ffd54f', glow: '#ff6d00', width: 7 });
    this.updateSprintAttack(0);
    return true;
  }

  // Wind-up, advancing hit window, then the post-impact carry; recovery is planted.
  updateSprintAttack(dt) {
    const strike = this.sprintStrike;
    if (!strike) return;
    if (this.state !== 'heavyStrike') { this.sprintStrike = null; return; }
    strike.elapsed += dt;
    const { heavy, variant } = strike;
    if (strike.elapsed < strike.windup) return; // anticipation: keeps sliding at wind-up speed
    if (!strike.launched) {
      strike.launched = true;
      this.vx = this.facing * strike.speed * (variant?.lungeSpeed ?? 1);
      if (variant?.leap && this.grounded) { this.grounded = false; this.vElevation = variant.leap * PLAYER_ARC_SCALE; }
    }
    if (strike.connected) {
      strike.carry -= dt;
      if (strike.carry <= 0) this.vx = 0;
      return;
    }
    if (strike.elapsed > strike.windup + strike.active) { this.vx = 0; return; }
    if (Math.random() < .5) this.ghosts.push({ x: this.x, y: this.y, z: this.z, elevation: this.elevation, facing: this.facing, alpha: .3, state: this.state, animTime: this.animTime });
    // Recoil as knockback: the linear knockback decay slides the target ≈ 1.8 u (× variant).
    // The run-up carries into the punch: entry speed scales the drive-back and the impact.
    const momentum = Math.max(.8, Math.min(1.35, strike.speed / (this.moveSpeed * SPRINT_MULT)));
    const recoil = Math.sqrt(2 * KB_DECAY_RATE * SPRINT_ATTACK_RECOIL_DISTANCE * (variant?.recoilMult ?? 1) * momentum);
    const hit = this.triggerMeleeHitbox(heavy.damage * (variant?.damageMult ?? 1) * (1 + .25 * momentum), this.facing * recoil, variant?.lift ?? 0, variant?.stun ?? .55, true, {
      hitstopTicks: (variant?.hitstopTicks ?? heavy.hitstopTicks) + 2, hitReaction: variant && !variant.primal ? 'finisher' : heavy.hitReaction,
      reach: variant?.reach ?? heavy.reach, freeze: heavy.freeze, sprintAttack: true, hitSet: strike.hits
    });
    if (!hit) return;
    if (variant && !variant.primal) formSprintImpact(this, strike.form, strike.hits, window.gameWorld);
    else if (variant?.primal) combat.spawnShockwave(this.x + this.facing * 30, this.y - 26, 50, variant.color);
    if (variant?.quake) primalQuake(this, variant.quake);
    // A piercing lunge keeps going and hits every enemy on its path once.
    if (variant?.pierce) return;
    strike.connected = true;
    strike.carry = SPRINT_ATTACK_CARRY_TIME;
    this.vx = this.facing * SPRINT_ATTACK_CARRY_DISTANCE * (variant?.carryMult ?? 1) / SPRINT_ATTACK_CARRY_TIME;
    if (!variant) combat.spawnShockwave(this.x + this.facing * 30, this.y - 26, 46, '#ffab00');
    if (variant?.primal) combat.spawnHitSparks(this.x + this.facing * 34, this.y - 30, this.facing, variant.color, 12);
  }

  // Equip a field weapon (returns the previously held one, if any).
  equipWeapon(weaponId, durability = null) {
    const previous = this.weapon ? { weapon: this.weapon, durability: this.weaponDurability } : null;
    this.weapon = WEAPONS[weaponId] ? weaponId : null;
    this.weaponDurability = this.weapon ? (durability ?? WEAPONS[weaponId].durability ?? null) : null;
    this.comboStep = 0;
    return previous;
  }

  // Sprint + attack: the held weapon spins forward and lands on the field.
  throwWeapon() {
    if (!this.weapon) return false;
    const world = window.gameWorld;
    const thrown = new ThrownWeaponSpell(this, this.weapon, this.weaponDurability, (weapon, x, z, durability) => world?.armory?.drop(weapon, x, z, durability));
    spells.addSpell(thrown, 'B');
    this.weapon = null; this.weaponDurability = null;
    this.cancelSprint();
    this.state = 'attack2'; this.stateTimer = .22; this.canAttack = false; this.vx = 0;
    audio.playSlash(1.4);
    return true;
  }

  triggerMeleeHitbox(dmg, kx, lift, stunDuration, isFinisher = false, hitMeta = {}) {
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
    if (isGenericBuff(this)) {
      dmg *= 1.25 * (this.buffForm.power ?? 1);
      kx *= 1.15;
      lift *= 1.08;
    }
    if (this.focusTransformTimer > 0) {
      dmg *= 1.18 * this.focusTransformPower;
      kx *= 1.14;
      lift *= 1.10;
    }
    // Ape bond: heavier fists.
    const apeBond = bondMelee(this);
    if (apeBond) { dmg *= apeBond.dmg; kx *= apeBond.kx; }
    const targets = window.gameWorld?.getHostileTargets(this.team, true) ?? [];
    let hitAny = false; let hitCount = 0; const sigHits = [];
    setHitContext(this);
    // Weapon reach / sweeps behind (scythe); the default reach stays 78 px.
    const reach = hitMeta.reach ?? null;
    if (hitMeta.crit && Math.random() < hitMeta.crit) { dmg *= 1.5; isFinisher = true; }
    for (const target of targets) {
      if (hitMeta.hitSet?.has(target)) continue;
      if (isUpperCastleBattlement(this) && isUpperCastleBattlement(target) && target.heroKey) continue;
      const limit = reach ?? (target.hitRadiusX ?? 78);
      const inFront = (target.x - this.x) * this.facing >= (hitMeta.behind ? -limit * .6 : -10) && Math.abs(target.x - this.x) <= limit;
      const closeDepth = Math.abs((target.z ?? this.z) - this.z) <= (target.hitRadiusZ ?? 0.22);
      const heightDifference = Math.abs((target.worldHeight ?? target.elevation ?? 0) - this.worldHeight);
      const verticalReach = target.hitHeightTolerance ?? (target.isObjective ? 120 : 70);
      if (inFront && closeDepth && heightDifference <= verticalReach) {
        const outcome = target.takeDamage(dmg, kx, lift, stunDuration, isFinisher, 'melee');
        sigHits.push({ target, blocked: !!outcome?.blocked || (!!target.isGuarding && Math.sign(-kx) === (target.facing || 0)) });
        hitMeta.hitSet?.add(target);
        combat.spawnHitSparks(target.x, target.y - 25, this.facing, isFinisher ? '#ffea00' : '#fff', isFinisher ? 16 : 8);
        if (hitMeta.freeze) target.freeze?.(hitMeta.freeze);
        if (hitMeta.guardBreak && target.isGuarding && Number.isFinite(target.guardStability)) target.guardStability = Math.max(0, target.guardStability - hitMeta.guardBreak);
        hitAny = true; hitCount++;
      }
    }
    setHitContext(null);
    if (sigHits.length) signatureEvent(this, 'hit', { hits: sigHits, heavy: this.state === 'heavyStrike' || isFinisher, facing: this.facing });
    if (hitAny && this.buffForm) this.buffForm.hitAt = this.buffForm.age;
    if (hitMeta.shockwave) combat.spawnShockwave(this.x + this.facing * 40, this.y - 6, 70, '#b0bec5');
    // Conjured weapons wear out with every hit and finally shatter.
    if (hitAny && this.weaponDurability != null) {
      this.weaponDurability -= 1;
      if (this.weaponDurability <= 0) {
        combat.spawnHitSparks(this.x + this.facing * 20, this.y - 40, this.facing, WEAPONS[this.weapon]?.color ?? '#fff', 18);
        window.gameWorld?.showAnnouncement?.(`${WEAPONS[this.weapon]?.name ?? 'WEAPON'} SHATTERED`, 1);
        this.weapon = null; this.weaponDurability = null;
      }
    }
    if (hitAny) {
      this.gainFocus(Math.min(16, 5 + hitCount * (isFinisher ? 4 : 3)), isFinisher ? 'FINISHER' : 'MELEE');
      audio.playImpact(isFinisher);
      const hsFrames = hitMeta.hitstopTicks ?? (isFinisher ? 6 : 4);
      combat.triggerHitstop(hsFrames);
      this.entityHitstop = hsFrames;
      combat.shakeCamera(isFinisher ? 8 : 4, 0.2);
    }
    return hitAny;
  }

  takeDamage(amount, kx = 0, lift = 0, stun = 0.3, isCrit = false, hitKind = 'melee') {
    if (!this.isAlive || this.invulnerableTimer > 0) return { ignored: true };
    // The Primal steps in: during its intercept window it takes the melee hit.
    if (hitKind === 'melee' && window.gameWorld?.primal?.tryIntercept?.(this, amount)) return { intercepted: true };
    // Knockback points away from the attacker, so its inverse identifies the
    // attacker's approach direction. Only an attack from the held shield's
    // front receives the physical guard reduction.
    const incomingFromFront = Math.abs(kx) > 0.01 && Math.sign(-kx) === this.facing;
    // Signature stances (floe plates, forge shield, shard shield) soften hits.
    amount = signatureDamageTaken(this, amount, kx, hitKind);
    if (this.isGuarding && incomingFromFront && hitKind === 'spell' && this.guardHoldTime <= 0.18) {
      // The first fraction of a held guard is a precise parry moment.  The
      // caller receives this result and reverses a reflectable projectile.
      combat.spawnHitSparks(this.x + this.facing * 26, this.y - 42, this.facing, '#fff9c4', 18);
      combat.spawnShockwave(this.x + this.facing * 24, this.y - 40, 44, '#ffd740');
      combat.spawnShockwave(this.x + this.facing * 20, this.y - 38, 24, '#80d8ff');
      this.perfectBlockFlash = 0.3;
      audio.playImpact(true);
      formGuardCounter(this, window.gameWorld);
      return { blocked: true, perfect: true, attackerRecoilDistance: PERFECT_BLOCK_ATTACKER_RECOIL, attackerRecoilTicks: PERFECT_BLOCK_ATTACKER_RECOIL_TICKS };
    }
    if (this.isGuarding && incomingFromFront) {
      // In a form, a well-timed block of a melee hit counters as well.
      if (hitKind === 'melee' && this.guardHoldTime <= .18 && activeMoveset(this) && !this._formCounterLock) {
        this._formCounterLock = true;
        this.perfectBlockFlash = .3;
        formGuardCounter(this, window.gameWorld);
        this._formCounterLock = false;
      }
      if (hitKind === 'melee') {
        this.guardStability = Math.max(0, this.guardStability - 10);
        if (this.guardStability <= 0) {
          this.isGuarding = false;
          this.guardHoldTime = 0;
          this.guardBreakTimer = 0.7;
          this.state = 'hurt'; this.stateTimer = 0.7; this.canAttack = false;
          this.kbVelX = -this.facing * 110; this.vElevation = 35 * PLAYER_ARC_SCALE;
          combat.spawnShockwave(this.x, this.y - 28, 46, '#ffca28');
          combat.spawnDamageText(this.x, this.y - 56, 'BREAK', { color: '#ffca28', isCrit: true });
          return { blocked: true, guardBroken: true };
        }
      }
      const isMovingWhileGuarding = Math.abs(this.vx) > 10;
      // A shield weapon blocks better.
      const shieldBonus = this.weapon ? (WEAPONS[this.weapon]?.guardBonus ?? 0) : 0;
      const guardReduction = (isMovingWhileGuarding ? 0.35 : 0.22) * (1 - shieldBonus * .5);
      const guardedAmount = Math.max(1, Math.ceil(amount * guardReduction));
      this.sp = Math.max(0, this.sp - (6 + amount * 0.25));
      amount = guardedAmount;
      kx *= 0.12; lift *= 0.12; stun *= 0.18;
      this.guardStaggerTimer = 0.15;
      bondOnBlock(this); // Turtle bond: Fortified
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
    if (isGenericBuff(this)) { amount *= .88; kx *= .85; }
    // Turtle bond: Shell Guard / Fortified scale the displacement taken.
    const displacement = bondDisplacement(this);
    kx *= displacement; lift *= displacement;
    // Passive build modifiers are applied after temporary forms/shields so
    // every incoming source shares the same final damage rule.
    amount *= this.buildModifiers?.damageTaken ?? 1;
    const receivedWhileGuarding = this.isGuarding && incomingFromFront;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.15;
    this.kbVelX = kx;
    this.vx = 0;
    if (lift > 200) {
      this.launcherMode = true;
    }
    this.vElevation = lift * PLAYER_ARC_SCALE;
    this.cancelSprint();
    this.backdashTimer = 0;
    this.state = 'hurt'; this.stateTimer = stun; this.canAttack = false;
    this.entityHitstop = isCrit ? HITSTOP_CHARGED_MAX : HITSTOP_NORMAL;
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

  // Ground hazards (burning ground, lava) chip HP without a hit reaction,
  // stagger or invulnerability window, so standing in fire is a cost, not a stun.
  takeHazardDamage(amount) {
    if (!this.isAlive || this.burrowed || this.invulnerableTimer > 0 || !(amount > 0)) return;
    if (this.arcaneShield > 0) {
      const absorbed = Math.min(amount, this.arcaneShield);
      this.arcaneShield -= absorbed; amount -= absorbed;
      if (amount <= 0) return;
    }
    amount *= this.buildModifiers?.damageTaken ?? 1;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = Math.max(this.hitFlash, .08);
    combat.spawnDamageText(this.x, this.y - 45, Math.round(amount), { color: '#ff8a65' });
    if (this.hp <= 0) this.beginDeath();
  }

  beginDeath() {
    this.dismount();
    endPrimalBond(this, 'death');
    endBuffForm(this);
    // A held weapon falls to the ground.
    if (this.weapon) { window.gameWorld?.armory?.drop(this.weapon, this.x, this.z, this.weaponDurability); this.weapon = null; this.weaponDurability = null; }
    window.gameWorld?.recordWizardDeath?.(this.team);
    this.lifeState = 'Dying';
    this.state = 'dead'; this.stateTimer = 0.45; this.canAttack = false; this.isGuarding = false;
    this.vx = 0; this.vz = 0; this.kbVelX = 0; this.kbVelZ = 0;
    this.cancelSprint(); this.backdashTimer = 0; this.chargeTimer = 0;
    this.clearPreparedRunes();
    combat.spawnShockwave(this.x, this.y - 25, 60, '#ff1744');
  }

  respawn(battlefield) {
    this.dismount();
    const spawn = battlefield?.getSpawn(this.team) ?? ARENA_LAYOUT.spawns.player;
    this.x = spawn.x; this.z = spawn.z; this.elevation = 0;
    this.vx = 0; this.vz = 0; this.vElevation = 0; this.kbVelX = 0; this.kbVelZ = 0;
    this.hp = this.maxHp; this.mp = this.maxMp; this.sp = this.maxSp;
    this.state = 'idle'; this.stateTimer = 0; this.comboStep = 0; this.comboResetTimer = 0; this.queuedAttack = null; this.attackBufferTimer = 0;
    this.canAttack = true; this.freezeTimer = 0; this.slowTimer = 0; this.slowFactor = 1;
    this.invulnerableTimer = 1.25; this.auraShockCooldown = 0; this.arcaneShield = 0; this.arcaneShieldTimer = 0; this.arcaneShieldCooldown = 0; this.eidolonTimer = 0; this.eidolonCooldown = 0; this.eidolonPower = 1; this.eidolonArmor = 0; this.ninefoldTimer = 0; this.ninefoldCooldown = 0; this.ninefoldPower = 1; this.focus = 0; this.focusTransformTimer = 0; this.focusTransformPower = 1; this.isGuarding = false; this.guardStability = 100; this.guardHoldTime = 0; this.guardBreakTimer = 0; this.jumpsLeft = 1; this.ghosts = [];
    this.sprintActive = false; this.sprintDir = 0; this.sprintLean = 0; this.sprintBobPhase = 0;
    this.backdashTimer = 0; this.backdashSuppressTimer = 0; this.jumpBufferTimer = 0;
    this.isSprintJump = false; this.launcherMode = false; this.chargeTimer = 0;
    this._prevInputDir = 0; this._lastFlickDir = 0; this._lastFlickTime = 0;
    this.entityHitstop = 0; this.hitRecoilTimer = 0; this.hitRecoilDistance = 0;
    this.forcedRecoilTimer = 0; this.landingRecoveryTimer = 0; this.grabCooldown = 0;
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
    if (!this.isAlive || this.slottedSpells.length >= 3) return null;
    const card = this.getRuneCard(expectedCardId, runeId);
    // A selected card must be drawn as that exact rune; free drawing may
    // only recognise one of the current three hand cards.
    if (!card || card.id !== runeId) return null;
    this.runeHand = this.runeHand.filter((handCard) => handCard.cardId !== card.cardId);
    this.preparedRunes.push(card);
    // The used card goes to the bottom of the deck and the next one is drawn,
    // so the hand cycles through the whole deck.
    this.runeDeck.push(card);
    this.drawRunesToHand();
    return card;
  }
  consumePreparedRunes() { const used = [...this.preparedRunes]; this.preparedRunes = []; return used; }
  addPreparedRune(rune) { return this.playRuneCard(rune.id); }
  clearPreparedRunes() { this.preparedRunes = []; this.slottedSpells = []; this.selectedSpellIndex = 0; }
  updateGhosts(dt) { this.ghosts = this.ghosts.filter(g => (g.alpha -= dt * 3.5) > 0); }

  render(ctx) {
    // Burrowed: only the travelling dirt mound (drawn by the spell) is visible.
    if (this.burrowed) return;
    // Levitation-state Arcane States let the Wizard hover above his shadow.
    const renderY = this.y - (this.isMounted ? (this.mountedSummon.definition.riderOffsetY ?? 42) : 0) - levitationOffset(this) - signatureHover(this);
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
    if (this.isAlive && this.primalBond) renderPrimalBond(ctx, this, renderY);
    else if (this.isAlive) this.renderFocusCharge(ctx, renderY);
    // Buff transformation manifestation behind the body (P1/P2).
    const buffActive = this.isAlive && renderBuffManifestation(ctx, this, renderY, 'back');
    if (this.isAlive) renderSignatureStance(ctx, this, renderY, 'back');
    if (this.isAlive && this.chargeTimer > 0 && !buffActive) this.renderChargeAura(ctx, renderY);
    // Body forms glow along the Wizard's own silhouette (chakra cloak).
    const formCloak = this.isAlive ? this.formCloakColor() : null;
    for (const g of this.ghosts) sprites.renderEntity(ctx, this.heroKey, g.x, g.y, { facing: g.facing, state: g.state, animTime: g.animTime, alpha: g.alpha, hitFlash: 1 });

    let useProc = false;
    let pRot = 0, pOX = 0, pOY = 0, pSX = 1.0, pSY = 1.0;
    let cadence = 1.0;
    let reverse = false;

    if (this.state === 'run' && this.grounded) {
      if (this.sprintActive) {
        cadence = 1.35;
      } else {
        cadence = Math.max(0.3, Math.min(1.0, Math.hypot(this.vx, this.vz) / this.moveSpeed));
      }
    }

    if (this.state === 'heavyStrike') {
      useProc = true;
      pRot = -this.facing * 8; pOX = this.facing * 15;
      pSX = 1.15; pSY = 1.05;
    } else if (this.state === 'uppercut') {
      useProc = true;
      pRot = -this.facing * 45; pOX = this.facing * 5; pOY = -20;
      pSX = 1.05; pSY = 1.10;
    } else if (this.state === 'dive') {
      useProc = true;
      pRot = this.facing * 35; pOX = this.facing * 5; pOY = 15;
      pSX = 1.05; pSY = 1.10;
    } else if (this.state === 'hurt' && this.guardBreakTimer > 0) {
      useProc = true;
      pRot = -this.facing * 18; pOX = -this.facing * 6; pOY = -5;
    } else if (this.state === 'hurt') {
      useProc = true;
      const kbMag = Math.abs(this.kbVelX);
      pOX = -this.facing * (kbMag > 400 ? 20 : kbMag > 200 ? 12 : 6);
    } else if (this.backdashTimer > 0) {
      useProc = true;
      pRot = this.facing * 20; pOY = -2;
    } else if (this.isGuarding) {
      useProc = true;
      pOX = -this.facing * 4;
      pRot = -this.facing * (1 - this.guardStability / 100) * 10;
      if (this.guardStaggerTimer > 0) {
        const staggerRatio = this.guardStaggerTimer / 0.15;
        pOX += -this.facing * 7 * staggerRatio;
        pOY += -2 * staggerRatio;
        pRot += -this.facing * 12 * staggerRatio;
      }
    } else if (this.sprintActive && this.state === 'run') {
      useProc = true;
      pRot = this.facing * 12;
      pOY = 3 + Math.sin(this.sprintBobPhase) * 1;
    } else if (this.launcherMode && !this.grounded) {
      useProc = true;
      if (this.vElevation > LAUNCHER_APEX_VEL_THRESH) pRot = -this.facing * 14;
      else if (this.vElevation > 0) pRot = -this.facing * 8;
      else if (Math.abs(this.vElevation) < LAUNCHER_APEX_VEL_THRESH) pRot = this.facing * 11;
      else pRot = this.facing * 7;
    } else if (this.chargeTimer > 0) {
      useProc = true;
      if (this.chargeDir === 'up') { pRot = this.facing * 25; pOX = -this.facing * 4; pOY = -8; pSX = 1.04; pSY = 1.08; }
      else if (this.chargeDir === 'down') { pRot = -this.facing * 20; pOX = -this.facing * 4; pOY = 13; pSX = 1.04; pSY = 1.08; }
      else { pRot = this.facing * 10; pOX = -this.facing * 11; pOY = 2; pSX = 1.08; pSY = 1.03; }
    }

    if (this.state === 'attack2') reverse = true;

    if (this.hitFlash > 0 && this.state !== 'dead') {
      useProc = true;
      pOX += -this.facing * 7;
      pOY += 2;
      pRot += -this.facing * 9;
    }

    if (this.forcedRecoilTimer > 0 && this.forcedRecoilTotalTicks > 0) {
      useProc = true;
      const progress = 1 - (this.forcedRecoilTicksLeft / this.forcedRecoilTotalTicks);
      const frontLoaded = 1 - Math.pow(progress, 0.4);
      pOX += this.forcedRecoilDir * this.forcedRecoilDistance * frontLoaded;
    }

    const renderOpts = {
      facing: this.facing, state: this.state, animTime: this.animTime,
      hitFlash: this.hitFlash > 0 ? 1 : 0,
      alpha: this.lifeState === 'Dead' ? 0 : 1,
      cadence, reverse, procOffsetX: pOX, procOffsetY: pOY,
    };
    if (useProc) { renderOpts.procRot = pRot; renderOpts.procScaleX = pSX; renderOpts.procScaleY = pSY; }
    const veins = this.isAlive ? buffVeinPainter(this) : null;
    if (veins) renderOpts.maskPaint = veins;
    if (formCloak) this.renderFormCloak(ctx, renderY, renderOpts, formCloak, 'back');
    // Astral weapon: the rear-hand piece behind the body, the front one in front.
    const armed = this.isAlive && (this.weapon || this.classWeapon);
    if (armed) drawHeldWeapon(ctx, this, renderY, 'back');
    sprites.renderEntity(ctx, this.heroKey, this.x, renderY, renderOpts);
    if (armed) drawHeldWeapon(ctx, this, renderY, 'front');
    if (formCloak) this.renderFormCloak(ctx, renderY, renderOpts, formCloak, 'front');
    // Guard poses: tail cocoon (Ninefold, drawn with the tails), ribs + palm, light shield.
    if (this.isAlive && this.isGuarding) {
      const guardForm = activeMoveset(this);
      if (!renderBuffGuard(ctx, this, renderY) && guardForm === 'ascendant') drawFormGuard(ctx, this.x, renderY, this.facing, this.animTime, guardForm);
    }
    // Charging a form technique: forward builds the projectile / bow, up and
    // down gather energy in the arms / legs; a pulse ring marks FULL ready.
    if (this.isAlive && this.formCharge) this.renderFormCharge(ctx, renderY);
    // Front layers of the body forms (ribs, claws) wrap around the Wizard.
    // Buff transformation manifestation in front of the body (P5).
    if (this.isAlive) renderBuffManifestation(ctx, this, renderY, 'front');
    if (this.isAlive) renderSignatureStance(ctx, this, renderY, 'front');
    if (this.isAlive && this.primalBond) renderPrimalBond(ctx, this, renderY, 'front');
    if (this.isAlive) {
      const ratio = Math.max(0, this.hp / this.maxHp);
      ctx.save();
      const healthBarY = renderY - ENTITY_VISUALS.heroHeight - 10;
      ctx.fillStyle = 'rgba(4, 8, 14, .82)'; ctx.fillRect(this.x - 24, healthBarY, 48, 5);
      ctx.fillStyle = ratio > .34 ? '#49c86b' : '#ff5252'; ctx.fillRect(this.x - 23, healthBarY + 1, 46 * ratio, 3);
      ctx.strokeStyle = 'rgba(202, 239, 255, .7)'; ctx.lineWidth = 1; ctx.strokeRect(this.x - 24, healthBarY, 48, 5);
      ctx.restore();
    }
    // Forms show their own guard (tail cocoon, astral palm, light shield).
    if (this.isGuarding && this.isAlive && !activeMoveset(this)) {
      const isPerfect = this.perfectBlockFlash > 0;
      const shieldX = this.x + this.facing * 26;
      const shieldY = renderY - 40;
      ctx.save();
      ctx.translate(shieldX, shieldY);
      ctx.scale(this.facing, 1);
      ctx.fillStyle = isPerfect ? 'rgba(180, 160, 40, .85)' : 'rgba(33, 104, 154, .78)';
      ctx.strokeStyle = isPerfect ? '#fff176' : '#b9f4ff';
      ctx.lineWidth = isPerfect ? 3.5 : 2.5;
      ctx.shadowColor = isPerfect ? '#ffd740' : '#3ad8ff'; ctx.shadowBlur = isPerfect ? 18 : 10;
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

  // Transformed: the full blazing aura streams upward.
  renderFocusAscendant(ctx, renderY) {
    drawFocusAura(ctx, this.x, renderY, this.animTime, 1.3, { height: ENTITY_VISUALS.heroHeight });
  }

  // Charging: from 25 % Focus a rising aura grows with the meter; at 100 %
  // a ring and a hint show how to transform (tap the Wizard / the profile bar).
  renderFocusCharge(ctx, renderY) {
    const ratio = this.focus / this.maxFocus;
    if (ratio < .25) return;
    const ready = this.focus >= this.maxFocus;
    const touch = globalThis.window?.gameWorld?.inputMode === 'touch';
    drawFocusAura(ctx, this.x, renderY, this.animTime, (ratio - .25) / .75, {
      height: ENTITY_VISUALS.heroHeight, ready, hint: ready ? (touch ? '✦ TAP TO TRANSFORM' : '✦ CLICK OR T TO TRANSFORM') : ''
    });
  }

  renderFormCharge(ctx, renderY) {
    const form = activeMoveset(this);
    if (!form) return;
    const charge = Math.min(1, this.formCharge.elapsed / FULL_CHARGE_TIME);
    const full = this.formCharge.elapsed >= FULL_CHARGE_TIME;
    const dir = this.chargeDir ?? 'forward';
    // Arcane States: each charges with its own ritual.
    if (renderBuffCharge(ctx, this, renderY, dir, charge, full)) return;
    const pal = FORM_PALETTES[form];
    if (dir === 'forward' && form === 'ninefold') drawBeastBomb(ctx, this.x + this.facing * (34 + 10 * charge), renderY - 52, 6 + 24 * charge, this.animTime);
    else if (dir === 'forward' && form === 'eidolon') drawSpiritBow(ctx, this.x + this.facing * 40, renderY - 84, this.facing, charge, this.animTime);
    else {
      // Energy gathering: a core in front (forward), in the fists (up) or at the feet (down).
      const cy = dir === 'up' ? renderY - 70 : dir === 'down' ? renderY - 8 : renderY - 52;
      const cx = this.x + this.facing * (dir === 'forward' ? 36 : 14);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = pal.glow + (.35 + .4 * charge) + ')';
      ctx.beginPath(); ctx.arc(cx, cy, 6 + 14 * charge, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pal.core; ctx.beginPath(); ctx.arc(cx, cy, 3 + 6 * charge, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (full) {
      const pulse = .5 + .5 * Math.sin(this.animTime * 14);
      ctx.save(); ctx.strokeStyle = pal.glow + (.6 + .4 * pulse) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(this.x, renderY, 30 + 6 * pulse, 9 + 2 * pulse, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }

  // Colour of the cloak of the active body form / transformation.
  formCloakColor() {
    const buff = buffCloakColor(this);
    if (buff) return buff;
    if (this.ninefoldTimer > 0) return { edge: 'rgba(255,110,20,1)', inner: 'rgba(255,170,60,1)', fade: Math.min(1, this.ninefoldTimer * 2) };
    if (this.eidolonTimer > 0) return { edge: 'rgba(150,80,255,1)', inner: 'rgba(200,150,255,1)', fade: Math.min(1, this.eidolonTimer * 2) };
    if (this.focusTransformTimer > 0) return { edge: 'rgba(255,214,80,1)', inner: 'rgba(255,240,170,1)', fade: Math.min(1, this.focusTransformTimer * 2) };
    return null;
  }

  // A flickering cloak hugging the sprite: tinted copies of the Wizard's own
  // silhouette around it (back) and a glow over the body (front).
  renderFormCloak(ctx, renderY, renderOpts, cloak, layer) {
    if (layer === 'back') {
      const flicker = 2.6 + Math.sin(this.animTime * 17) * .8 + Math.sin(this.animTime * 7.3) * .6;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        // The cloak streams upward: copies above the body reach further.
        const lift = Math.sin(a) < 0 ? 1.8 : 1;
        sprites.renderEntity(ctx, this.heroKey, this.x + Math.cos(a) * flicker, renderY + Math.sin(a) * flicker * lift, { ...renderOpts, hitFlash: 0, tint: cloak.edge, alpha: .5 * cloak.fade });
      }
      return;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    sprites.renderEntity(ctx, this.heroKey, this.x, renderY, { ...renderOpts, hitFlash: 0, tint: cloak.inner, alpha: (.22 + Math.sin(this.animTime * 9) * .05) * cloak.fade });
    ctx.restore();
  }

  renderChargeAura(ctx, renderY) {
    const t = this.chargeTimer;
    const intensity = Math.min(1, t / 0.5);
    const pulse = 1 + Math.sin(this.animTime * 10) * 0.12 * intensity;
    ctx.save();
    ctx.globalAlpha = 0.35 + intensity * 0.3;
    ctx.strokeStyle = '#ff6d00';
    ctx.shadowColor = '#ff9100';
    ctx.shadowBlur = 14 + intensity * 12;
    ctx.lineWidth = 2 + intensity * 2;
    ctx.beginPath();
    ctx.ellipse(this.x, renderY - 30, (22 + intensity * 10) * pulse, (34 + intensity * 14) * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (intensity > 0.5) {
      ctx.globalAlpha = (intensity - 0.5) * 0.6;
      ctx.fillStyle = 'rgba(255, 109, 0, .15)';
      ctx.beginPath();
      ctx.ellipse(this.x, renderY - 30, 18 * pulse, 28 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  gainFocus(amount, source = 'COMBAT') {
    if (!this.isAlive) return false;
    const previous = this.focus;
    const transformed = this.focusTransformTimer > 0;
    this.focusDecayDelay = FOCUS_DECAY_DELAY;
    const gainMult = (this.buildModifiers?.focusGain ?? 1) * (transformed ? FOCUS_TRANSFORM_GAIN_MULT : 1) * bondGainMultiplier(this);
    this.focus = Math.min(this.maxFocus, this.focus + Math.max(0, amount) * gainMult);
    // While transformed, combos refill the meter and so extend the form.
    if (transformed) {
      this.focusTransformTimer = this.focus / FOCUS_TRANSFORM_DRAIN;
      return this.focus > previous;
    }
    if (previous < this.maxFocus && this.focus >= this.maxFocus && !this.primalBond) {
      window.gameWorld?.showAnnouncement?.('FOCUS FULL — TAP FOCUS OR PRESS T', 1.8);
      combat.spawnShockwave(this.x, this.y - 34, 52, '#f0c8ff');
    }
    return this.focus > previous;
  }

  activateFocusTransformation() {
    if (!this.isAlive || this.focus < this.maxFocus || this.focusTransformTimer > 0 || this.activeClash) return false;
    // No own timer: the transformation now burns the Focus meter.
    this.focusTransformTimer = this.focus / FOCUS_TRANSFORM_DRAIN;
    this.focusTransformPower = 1;
    combat.spawnShockwave(this.x, this.y - 38, 92, '#f0a6ff');
    combat.spawnElementalParticles(this.x, this.y - 38, 'void', 34);
    audio.playSpell('focus_ascendant');
    return true;
  }

  renderEidolonMantle(ctx, renderY) {
    drawEidolonGuardian(ctx, this.x, renderY, this.facing, this.animTime, this.eidolonAge ?? 1, Math.min(1, this.eidolonTimer * 2), 'back', { drawingBow: this.chargeTimer > 0, ...this.formMotion() });
  }

  renderNinefoldBeast(ctx, renderY) {
    drawNinefoldSpirit(ctx, this.x, renderY, this.facing, this.animTime, this.ninefoldAge ?? 1, Math.min(1, this.ninefoldTimer * 2), 'back', this.formMotion());
  }

  // Movement the body forms react to: lean (run speed along facing) and the
  // step phase while running.
  formMotion() {
    return {
      lean: this.formLean ?? 0,
      bob: this.state === 'run' && this.grounded ? Math.sin(this.animTime * 14) : 0,
      // -1 (falling fast) … 1 (rising fast) while airborne.
      air: this.grounded ? 0 : Math.max(-1, Math.min(1, (this.vElevation ?? 0) / (this.jumpForce || 1))),
      guarding: this.isGuarding
    };
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
    else if (!target && this.followLeader) {
      // Companions without a target stay close to their leader instead of
      // marching off through a long Dungeon room on their own.
      const leader = this.followLeader;
      if (!leader.isAlive || groundDistance(this, leader) < 90) { this.vx = this.vz = 0; this.state = 'idle'; }
      else {
        const desired = normalizeMove({ x: leader.x - this.x, z: (leader.z - this.z) * 150 });
        this.facing = desired.x ? Math.sign(desired.x) : this.facing; this.vx = desired.x * this.speed * this.slowFactor; this.vz = desired.z * (this.speed / 150) * this.slowFactor; this.state = 'run';
      }
    }
    else if (target && distance <= (target.isObjective ? 70 : this.attackRange)) { this.vx = this.vz = 0; this.facing = Math.sign(target.x - this.x) || this.facing; if (this.attackTimer <= 0) { this.attackTimer = this.attackCooldown; this.state = 'attack'; this.performAttack(target, gameWorld); } else { this.state = this.attackTimer > this.attackCooldown - 0.35 ? 'attack' : 'idle'; } }
    else {
      // Structures are attacked from each lane; combat units may pull a minion
      // slightly off its lane only when already nearby.
      const targetZ = target?.isObjective ? objectiveApproachZ(this, target) : target ? target.z : this.preferredZ;
      const desired = target ? normalizeMove({ x: target.x - this.x, z: (targetZ - this.z) * 150 }) : { x: this.facing, z: (this.preferredZ - this.z) * 150 };
      this.facing = desired.x ? Math.sign(desired.x) : this.facing; this.vx = desired.x * this.speed * this.slowFactor; this.vz = desired.z * (this.speed / 150) * this.slowFactor; this.state = 'run';
    }
    this.applySeparation(gameWorld);
    if (Math.abs(this.kbVelX) > 0.5) { const decay = KB_DECAY_RATE * dt; this.kbVelX = Math.abs(this.kbVelX) <= decay ? 0 : this.kbVelX - Math.sign(this.kbVelX) * decay; } else { this.kbVelX = 0; }
    this.integrateElevation(dt, 1150); const previousX = this.x; const previousZ = this.z; this.x += (this.vx + this.kbVelX) * dt; this.z += this.vz * dt; battlefield.resolveEntityCollision(this); gameWorld.resolveSpellObstacles(this, previousX, previousZ);
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
    const arch = this.archetype;
    if (arch === 'enemy_knight') {
      audio.playSlash(1.0);
      combat.spawnSlashArc(this.x + this.facing * 16, this.y - 18, this.facing, { radius: 28, color: '#78909c', glow: '#455a64' });
      target.takeDamage(this.damage, this.facing * 140, 70, .3);
    } else if (arch === 'enemy_bandit') {
      audio.playSlash(1.8);
      combat.spawnHitSparks(target.x, target.y - 14, this.facing, '#ce93d8', 5);
      target.takeDamage(this.damage, this.facing * 60, 20, .12);
    } else if (arch === 'enemy_sorcerer') {
      audio.playSlash(0.7);
      combat.spawnElementalParticles(this.x + this.facing * 14, this.y - 18, 'fulgur', 4);
      gameWorld.spawnMinionBolt(this.x + this.facing * 12, this.z, this.facing, this.team, this.damage, target.z, this.worldHeight + 18);
    } else if (arch === 'ally_fighter') {
      audio.playSlash(1.3);
      combat.spawnSlashArc(this.x + this.facing * 14, this.y - 16, this.facing, { radius: 24, color: '#42a5f5' });
      combat.spawnHitSparks(target.x, target.y - 14, this.facing, '#42a5f5', 4);
      target.takeDamage(this.damage, this.facing * 110, 55, .22);
    } else if (arch === 'ally_blade') {
      audio.playSlash(1.6);
      combat.spawnSlashArc(this.x + this.facing * 18, this.y - 14, this.facing, { radius: 20, color: '#66bb6a' });
      combat.spawnSlashArc(this.x + this.facing * 10, this.y - 20, this.facing, { radius: 16, color: '#a5d6a7' });
      target.takeDamage(this.damage, this.facing * 80, 40, .18);
    } else if (arch === 'boss_firelord') {
      audio.playSlash(0.8);
      combat.spawnSlashArc(this.x + this.facing * 20, this.y - 22, this.facing, { radius: 34, color: '#ff6d00', glow: '#bf360c' });
      combat.spawnElementalParticles(this.x + this.facing * 16, this.y - 18, 'fire', 4);
      target.takeDamage(this.damage, this.facing * 180, 90, .35);
    } else {
      audio.playSlash(1.4);
      if (this.type === 'melee') { combat.spawnSlashArc(this.x + this.facing * 14, this.y - 16, this.facing, { radius: 22, color: this.team === 'blue' ? '#42a5f5' : '#ef5350' }); target.takeDamage(this.damage, this.facing * 100, 50, .2); }
      else gameWorld.spawnMinionBolt(this.x + this.facing * 12, this.z, this.facing, this.team, this.damage, target.z, this.worldHeight + 18);
    }
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
  takeDamage(amount, kx = 0, lift = 0, stun = .25) { if (this.arcaneShield > 0) { const absorbed = Math.min(amount, this.arcaneShield); this.arcaneShield -= absorbed; amount -= absorbed; if (amount <= 0) return; } this.hp = Math.max(0, this.hp - amount); this.hitFlash = .15; this.kbVelX = kx; this.vx = 0; this.vElevation = lift; this.hurtTimer = Math.max(this.hurtTimer, stun); combat.spawnDamageText(this.x, this.y - 25, amount, { color: this.team === 'blue' ? '#90caf9' : '#ffab91' }); if (!this.hp) { this.isDead = true; combat.spawnHitSparks(this.x, this.y - 16, this.facing, '#fff', 8); } }
  freeze(duration) { this.freezeTimer = duration; } slow(duration, factor) { this.slowTimer = duration; this.slowFactor = factor; }
  render(ctx) { const vh = this.renderHeight ?? ENTITY_VISUALS.minionHeight; sprites.renderEntity(ctx, this.spriteKey, this.x, this.y, { facing: this.facing, state: this.state, animTime: this.animTime, hitFlash: this.hitFlash > 0, visualHeight: vh }); if (this.hp < this.maxHp) { const barY = this.y - vh - 4; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(this.x - 11, barY, 22, 3); ctx.fillStyle = this.team === 'blue' ? '#42a5f5' : '#e53935'; ctx.fillRect(this.x - 11, barY, 22 * this.hp / this.maxHp, 3); } }
}

export class Tower extends GroundEntity {
  constructor(x, z, team, onDestroyed = null) { super(x, z); this.team = team; this.isObjective = true; this.maxHp = this.hp = 800; this.range = 280; this.hitRadiusX = 68; this.hitRadiusZ = 0.46; this.shootCooldown = 1.8; this.shootTimer = 0; this.isDead = false; this.corePulse = 0; this.hitFlash = 0; this.topHeight = 125; this.currentTarget = null; this.onDestroyed = onDestroyed; }
  get crystalY() { return this.y - this.topHeight; }
  update(dt, gameWorld) { if (this.isDead) { this.currentTarget = null; return; } this.corePulse += dt * 3; this.hitFlash = Math.max(0, this.hitFlash - dt); this.shootTimer -= dt; let target = null; let distance = this.range; for (const candidate of gameWorld.getHostileMobileTargets(this.team)) { const d = groundDistance(this, candidate); if (d < distance) { target = candidate; distance = d; } } this.currentTarget = target; if (target && this.shootTimer <= 0) { this.shootTimer = this.shootCooldown; audio.playTowerShot(); combat.spawnShockwave(this.x, this.crystalY, 20, this.team === 'blue' ? '#00e5ff' : '#ff1744'); gameWorld.spawnTowerOrb(this.x, this.z, target, this.team, this.damage ?? 42, this.worldHeight + this.topHeight); } }
  takeDamage(amount) { if (this.isDead) return; this.hp = Math.max(0, this.hp - amount); this.hitFlash = .15; combat.spawnDamageText(this.x, this.crystalY - 15, amount, { isCrit: true, color: this.team === 'blue' ? '#4fc3f7' : '#e57373' }); if (!this.hp) { this.isDead = true; audio.playImpact(true); combat.shakeCamera(15, .8); combat.spawnShockwave(this.x, this.crystalY, 80, '#ff9100'); combat.spawnHitSparks(this.x, this.crystalY, 1, '#ffcc80', 24); this.onDestroyed?.(this); } }
  render(ctx) { const y = this.crystalY + Math.sin(this.corePulse) * 5; const color = this.team === 'blue' ? '#00e5ff' : '#ff1744'; if (this.isLaneTower) this.renderLaneBody(ctx, color); ctx.save(); ctx.fillStyle = this.team === 'blue' ? 'rgba(0,229,255,.35)' : 'rgba(255,23,68,.35)'; ctx.beginPath(); ctx.arc(this.x, y, 20, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = this.hitFlash ? '#fff' : color; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(this.x, y - 15); ctx.lineTo(this.x + 9, y); ctx.lineTo(this.x, y + 15); ctx.lineTo(this.x - 9, y); ctx.closePath(); ctx.fill(); if (!this.isDead && this.hp < this.maxHp) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,.78)'; ctx.fillRect(this.x - 30, y - 31, 60, 5); ctx.fillStyle = color; ctx.fillRect(this.x - 30, y - 31, 60 * this.hp / this.maxHp, 5); } ctx.restore(); }
  // Lane towers stand on the open field (Siege towers are painted into the
  // scene): a stone obelisk with a glowing rune band under the crystal.
  renderLaneBody(ctx, color) {
    const base = this.y; const top = this.crystalY + 16;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(this.x, base, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createLinearGradient(this.x - 12, 0, this.x + 12, 0);
    g.addColorStop(0, '#4a5262'); g.addColorStop(.5, '#7d8696'); g.addColorStop(1, '#3a4150');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(this.x - 14, base); ctx.lineTo(this.x - 8, top); ctx.lineTo(this.x + 8, top); ctx.lineTo(this.x + 14, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,24,32,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#5c6575'; ctx.fillRect(this.x - 17, base - 6, 34, 6); ctx.fillRect(this.x - 11, top - 4, 22, 5);
    ctx.globalAlpha = .55 + .35 * Math.sin(this.corePulse * 1.3); ctx.fillStyle = color;
    ctx.fillRect(this.x - 9, (base + top) / 2 - 2, 18, 3);
    ctx.restore();
  }
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
    // Unity structure: seven segments, three load-bearing (castle_segments.js).
    this.segments = createSegments(team); this.loadBearingLost = 0; this.showSegments = true;
  }
  takeDamage(amount, kx = 0, lift = 0, stun = 0, isCrit = false, hitKind = 'melee') {
    if (this.isDestroyed) return;
    if (!this.isVulnerable) { if (this.protectedFeedbackTimer <= 0) { this.protectedFeedbackTimer = .8; this.onProtectedHit?.(this); } return; }
    this.hitFlash = .15;
    combat.spawnDamageText(this.x, this.y - 95, amount, { isCrit: true, color: this.team === 'blue' ? '#81d4fa' : '#ff8a80' });
    // The struck segment and the global health lose the same amount; the castle
    // collapses at zero health or when 2 of its 3 load-bearing segments fall.
    damageSegments(this, amount, hitKind);
    if (this.isDestroyed) { combat.spawnShockwave(this.x, this.y - 55, 130, '#ffd740'); combat.spawnShockwave(this.x, this.y - 55, 72, '#ff6d00'); combat.spawnHitSparks(this.x, this.y - 55, 1, '#ff9100', 56); combat.spawnElementalParticles(this.x, this.y - 55, 'fire', 24); }
  }
  update(dt) { this.corePulse += dt * 2; this.hitFlash = Math.max(0, this.hitFlash - dt); this.protectedFeedbackTimer = Math.max(0, this.protectedFeedbackTimer - dt); updateSegments(this, dt); }
  render(ctx) {
    if (this.showSegments) renderSegments(ctx, this);
    const color = this.team === 'blue' ? '#29b6f6' : '#ef5350'; const y = this.y - 58;
    ctx.save(); ctx.globalAlpha = this.isDestroyed ? .2 : 1; ctx.strokeStyle = this.isVulnerable ? color : '#b0bec5'; ctx.lineWidth = 3; ctx.setLineDash(this.isVulnerable ? [] : [6, 5]);
    ctx.beginPath(); ctx.ellipse(this.x, y, this.hitRadiusX, 18, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = this.hitFlash ? '#fff' : color; ctx.shadowColor = color; ctx.shadowBlur = this.isVulnerable ? 15 : 5; ctx.beginPath(); ctx.arc(this.x, y, 10 + Math.sin(this.corePulse) * 2, 0, Math.PI * 2); ctx.fill(); if (this.isVulnerable && !this.isDestroyed && this.hp < this.maxHp) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,.78)'; ctx.fillRect(this.x - 38, y - 27, 76, 5); ctx.fillStyle = color; ctx.fillRect(this.x - 38, y - 27, 76 * this.hp / this.maxHp, 5); } ctx.restore();
  }
}

export class EnemyChampion extends GroundEntity {
  constructor(x, z, heroKey = 'warlord') { super(x, z); this.heroKey = heroKey; this.team = 'red'; this.isMobileCombatant = true; this.facing = -1; this.width = ENTITY_VISUALS.heroColliderWidth; this.height = ENTITY_VISUALS.heroColliderHeight; this.maxHp = this.hp = 280; this.maxMp = this.mp = 100; this.speed = 230; this.state = 'idle'; this.animTime = 0; this.hitFlash = 0; this.freezeTimer = 0; this.slowTimer = 0; this.slowFactor = 1; this.attackCooldown = 0; this.spellCooldown = 1.4; this.defensiveCooldown = 0; this.arcaneShield = 0; this.arcaneShieldTimer = 0; this.aiMode = 'DEFEND_CASTLE'; this.stateTimer = 0; this.lifeState = 'Alive'; this.respawnTimer = 0; this.respawnDuration = 3; this.beamCooldown = 4; this.activeClash = null; }
  get isAlive() { return this.lifeState === 'Alive'; }
  get isDead() { return this.lifeState === 'Dead'; }
  set isDead(value) { this.lifeState = value ? 'Dead' : 'Alive'; }
  update(dt, gameWorld, battlefield) {
    this.animTime += dt; this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.lifeState === 'Dying') { this.stateTimer -= dt; if (this.stateTimer <= 0) { this.lifeState = 'Dead'; this.respawnTimer = gameWorld.canRespawn(this.team) ? this.respawnDuration : Infinity; if (!Number.isFinite(this.respawnTimer)) gameWorld.onFinalWizardDeath(this.team); } return; }
    if (this.lifeState === 'Dead') { this.respawnTimer -= dt; if (this.respawnTimer <= 0) this.respawn(battlefield, gameWorld); return; }
    this.attackCooldown -= dt; this.spellCooldown -= dt; this.defensiveCooldown -= dt; this.beamCooldown -= dt; this.mp = Math.min(this.maxMp, this.mp + dt * 11); this.arcaneShieldTimer = Math.max(0, this.arcaneShieldTimer - dt); if (this.arcaneShieldTimer <= 0) this.arcaneShield = 0; this.freezeTimer = Math.max(0, this.freezeTimer - dt); this.slowTimer = Math.max(0, this.slowTimer - dt); if (!this.slowTimer) this.slowFactor = 1;
    if (this.stateTimer > 0) { this.stateTimer -= dt; if (this.stateTimer <= 0) this.state = this.grounded ? 'idle' : 'fall'; }
    const player = gameWorld.player; const distance = player.isAlive ? groundDistance(this, player) : Infinity;
    const home = gameWorld.getEnemyHome?.(this.team, battlefield) ?? battlefield.getSpawn(this.team);
    const ownTower = battlefield.getTower(this.team);
    const ownCastle = battlefield.getCastle(this.team);
    const objectiveThreat = battlefield.objectivesActive && player.isAlive
      && [ownTower, ownCastle].some((objective) => !objective.isDead && !objective.isDestroyed && groundDistance(player, objective) < 245);
    if (this.freezeTimer > 0) { this.vx = this.vz = 0; }
    else if (this.activeClash) {
      // Locked in a Beam Clash: hold the beam; the clash coordinator drives
      // push timing for the AI side.
      this.aiMode = 'CLASH';
      this.vx = this.vz = 0;
      if (this.stateTimer <= 0) this.state = 'idle';
    }
    else if (this.passive) {
      // Passive training partner: no decisions at all — physics (knockback,
      // launches, lifts, freezes) still apply. Health refills after a pause.
      this.aiMode = 'PASSIVE';
      this.vx = this.vz = 0;
      if (this.stateTimer <= 0 && this.grounded) this.state = 'idle';
      this.passiveIdle = (this.passiveIdle ?? 0) + dt;
      if (this.passiveIdle > 3 && this.hp < this.maxHp) this.hp = this.maxHp;
    }
    else if (player.isAlive && this.tryAICounterBeam(gameWorld)) {
      this.vx = this.vz = 0;
    }
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
      if (!this.tryAIDefense(player, distance, objectiveThreat, gameWorld) && distance > 110 && !this.tryAIBeam(player, distance, gameWorld)) {
        if (this.deckSpells) this.tryAIDeckSpell(player, distance, gameWorld);
        else this.tryAICast('fireball', gameWorld, 12, objectiveThreat ? 2.1 : 3.1);
      }
    } else {
      this.aiMode = 'DEFEND_CASTLE';
      const move = normalizeMove({ x: home.x - this.x, z: (home.z - this.z) * 150 }); this.facing = Math.sign(move.x) || this.facing; this.vx = move.x * this.speed * .45; this.vz = move.z * this.speed / 150 * .45; this.state = 'run';
    }
    if (Math.abs(this.kbVelX) > 0.5) { const decay = KB_DECAY_RATE * dt; this.kbVelX = Math.abs(this.kbVelX) <= decay ? 0 : this.kbVelX - Math.sign(this.kbVelX) * decay; } else { this.kbVelX = 0; }
    this.integrateElevation(dt, 1200); const previousX = this.x; const previousZ = this.z; this.x += (this.vx + this.kbVelX) * dt; this.z += this.vz * dt; battlefield.resolveEntityCollision(this); gameWorld.resolveSpellObstacles(this, previousX, previousZ);
  }
  tryAICast(id, gameWorld, manaCost, cooldown) {
    if (this.spellCooldown > 0 || this.mp < manaCost) return false;
    this.mp -= manaCost; this.spellCooldown = cooldown;
    spells.cast(this, { id, tier: ['stone_wall', 'arcane_aegis', 'inferno_beam', 'glacial_ray', 'thunder_lance', 'null_ray'].includes(id) ? 2 : 1 }, gameWorld);
    return true;
  }
  // Training: the sparring partner fights with an editable rune deck.
  setDeck(ids = []) {
    this.deckIds = [...ids];
    this.deckSpells = deckSpellOptions(this.deckIds);
  }
  aiBeamId() {
    const deckBeam = this.deckSpells?.find((option) => option.def.deliveryType === 'beam');
    if (this.deckSpells) return deckBeam?.def.id ?? null;
    return { boss_firelord: 'inferno_beam', darklord: 'null_ray', mage: 'glacial_ray' }[this.heroKey] ?? 'thunder_lance';
  }
  // Pick a spell from the deck that suits the moment and give it a target.
  tryAIDeckSpell(player, distance, gameWorld) {
    if (!this.deckSpells) return this.tryAICast('fireball', gameWorld, 12, 3.1);
    if (this.spellCooldown > 0 || !this.deckSpells.length) return false;
    const hurt = this.hp / this.maxHp < .6;
    const usable = this.deckSpells.filter(({ def, cost }) => {
      if (cost > this.mp || def.deliveryType === 'beam') return false;
      if (def.targetingMode === 'self' || def.targetingMode === 'ally') return hurt && ['arcane_aegis', 'sandstorm_bastion', 'mirror_ward', 'eidolon_mantle'].includes(def.id);
      return true;
    });
    if (!usable.length) return false;
    const { def, cost } = usable[Math.floor(Math.random() * usable.length)];
    this.facing = Math.sign(player.x - this.x) || this.facing;
    const target = def.targetingMode === 'ground' ? { x: player.x, z: player.z }
      : def.targetingMode === 'placement' ? { x: this.x + this.facing * 80, z: this.z }
      : def.targetingMode === 'ally' ? { entity: this } : null;
    this.mp -= cost; this.spellCooldown = 2.4;
    spells.cast(this, def, gameWorld, null, target);
    return true;
  }
  // Beams stay rare in narrow Castle Siege lanes: only duel / boss fighters
  // open with one, and only when lined up in the same depth lane.
  tryAIBeam(player, distance, gameWorld) {
    if (!(gameWorld.activeMode?.enemyBehavior === 'duel' || gameWorld.modeState?.bossActive)) return false;
    if (this.beamCooldown > 0 || this.mp < 26 || this.spellCooldown > 0 || !this.aiBeamId()) return false;
    if (Math.abs(player.z - this.z) > .12 || distance < 170 || distance > 420) return false;
    this.facing = Math.sign(player.x - this.x) || this.facing;
    this.vx = this.vz = 0;
    this.beamCooldown = 8;
    return this.tryAICast(this.aiBeamId(), gameWorld, 26, 1.6);
  }
  // Answer a hostile beam that is charging toward this fighter with a beam
  // of its own — the frontal tip-to-tip meeting is what starts a clash.
  tryAICounterBeam(gameWorld) {
    const incoming = spells.activeSpells.find((spell) => spell.isBeam && !spell.aiConsidered && spell.team !== this.team
      && spell.phase === 'charge' && Math.abs(spell.z - this.z) < .15 && Math.sign(this.x - spell.originX) === spell.facing);
    if (!incoming) return false;
    incoming.aiConsidered = true;
    if (this.beamCooldown > 0 || this.mp < 26 || !this.aiBeamId() || Math.random() > .6) return false;
    this.facing = -incoming.facing;
    this.beamCooldown = 8;
    this.spellCooldown = 0;
    return this.tryAICast(this.aiBeamId(), gameWorld, 26, 1.6);
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
  takeDamage(amount, kx = 0, lift = 0, stun = .35, isCrit = false) { if (!this.isAlive) return; if (this.arcaneShield > 0) { const absorbed = Math.min(amount, this.arcaneShield); this.arcaneShield -= absorbed; amount -= absorbed; if (amount <= 0) { combat.spawnElementalParticles(this.x, this.y - 35, 'fulgur', 5); return; } } this.passiveIdle = 0; this.hp = Math.max(this.passive ? 1 : 0, this.hp - amount); this.hitFlash = .15; this.kbVelX = kx; this.vx = 0; this.vElevation = lift; this.state = 'hurt'; this.stateTimer = stun; combat.spawnDamageText(this.x, this.y - 45, amount, { isCrit, color: '#ff7043' }); if (!this.hp) { window.gameWorld?.recordWizardDeath?.(this.team); this.lifeState = 'Dying'; this.state = 'dead'; this.stateTimer = .45; combat.spawnShockwave(this.x, this.y - 30, 80, '#ff5252'); } }
  takeHazardDamage(amount) {
    if (!this.isAlive || !(amount > 0)) return;
    if (this.arcaneShield > 0) { const absorbed = Math.min(amount, this.arcaneShield); this.arcaneShield -= absorbed; amount -= absorbed; if (amount <= 0) return; }
    if (this.hp - amount <= 0) { this.takeDamage(amount, 0, 0, 0); return; }
    this.hp -= amount; this.hitFlash = .08;
    combat.spawnDamageText(this.x, this.y - 45, Math.round(amount), { color: '#ff8a65' });
  }
  respawn(battlefield, gameWorld = null) { const spawn = gameWorld?.getEnemyHome?.(this.team, battlefield) ?? battlefield.getSpawn(this.team); this.x = spawn.x; this.z = spawn.z; this.elevation = 0; this.vx = this.vz = this.vElevation = 0; this.hp = this.maxHp; this.mp = this.maxMp; this.arcaneShield = 0; this.arcaneShieldTimer = 0; this.state = 'idle'; this.lifeState = 'Alive'; this.respawnTimer = 0; this.attackCooldown = 0; this.spellCooldown = 1; this.defensiveCooldown = 0; battlefield.resolveEntityCollision(this); combat.spawnShockwave(this.x, this.y - 28, 50, '#ff5252'); }
  freeze(duration) { this.freezeTimer = duration; } slow(duration, factor) { this.slowTimer = duration; this.slowFactor = factor; }
  render(ctx) { sprites.renderEntity(ctx, this.heroKey, this.x, this.y, { facing: this.facing, state: this.state, animTime: this.animTime, hitFlash: this.hitFlash > 0, alpha: this.lifeState === 'Dead' ? 0 : 1 }); if (this.lifeState !== 'Dead') { const healthBarY = this.y - ENTITY_VISUALS.heroHeight - 8; ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(this.x - 27, healthBarY, 54, 6); ctx.fillStyle = '#f44336'; ctx.fillRect(this.x - 27, healthBarY, 54 * this.hp / this.maxHp, 6); } }
}

// Training yard straw dummy: a stationary, unkillable hostile target. It is
// listed with the minions so every melee hit, projectile, beam and area
// spell interacts with it through the normal hostile-target path, but it
// never moves, never attacks and refills its HP after a short pause.
export class TrainingDummy extends GroundEntity {
  constructor(x, z) {
    super(x, z);
    this.homeX = x; this.homeZ = z;
    this.team = 'red'; this.type = 'dummy'; this.isTrainingDummy = true;
    this.maxHp = this.hp = 1000; this.mp = 0; this.maxMp = 100;
    this.radius = 18; this.hitRadiusX = 18; this.hitHeightTolerance = 120;
    this.isDead = false; this.hitFlash = 0; this.wobble = 0; this.idleTimer = 0;
    this.damageWindow = []; this.facing = -1; this.state = 'idle'; this.animTime = 0;
  }

  get dps() {
    const now = performance.now();
    this.damageWindow = this.damageWindow.filter((entry) => now - entry.t < 3000);
    return Math.round(this.damageWindow.reduce((sum, entry) => sum + entry.amount, 0) / 3);
  }

  update(dt) {
    this.animTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.wobble *= Math.max(0, 1 - dt * 6);
    this.idleTimer += dt;
    if (this.idleTimer > 2.5 && this.hp < this.maxHp) this.hp = this.maxHp;
    // Unmovable: knockback, pulls and launches never displace the dummy.
    this.x = this.homeX; this.z = this.homeZ;
    this.vx = this.vz = 0; this.kbVelX = 0; this.vElevation = 0; this.elevation = 0; this.grounded = true;
  }

  takeDamage(amount, kx = 0) {
    if (!(amount > 0)) return;
    this.hp -= amount;
    if (this.hp <= 0) this.hp = this.maxHp;
    this.hitFlash = .12; this.idleTimer = 0;
    this.wobble = Math.max(-1, Math.min(1, this.wobble + (Math.sign(kx) || 1) * .6));
    this.damageWindow.push({ t: performance.now(), amount });
    combat.spawnDamageText(this.x, this.y - 70, Math.round(amount), { color: '#ffe082' });
  }

  slow() {}

  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y);
    const px = (rx, ry, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x + rx, y + ry, w, h); };
    ctx.save();
    // The wooden stand stays planted; the body sways from the base.
    px(-15, -4, 30, 4, '#3e2723'); px(-14, -5, 28, 3, '#6d4c41');
    ctx.translate(x, y); ctx.rotate(this.wobble * .2); ctx.translate(-x, -y);
    px(-4, -66, 8, 62, '#3e2723'); px(-3, -66, 6, 62, '#795548');
    // Cross bar arms with straw tufts.
    px(-27, -51, 54, 8, '#3e2723'); px(-26, -50, 52, 6, '#8d6e63');
    px(-33, -53, 7, 12, '#e6c35c'); px(26, -53, 7, 12, '#e6c35c');
    // Burlap body with stitching and a target emblem.
    px(-15, -60, 30, 40, '#4e342e'); px(-14, -59, 28, 38, '#c8a165');
    px(-14, -46, 28, 2, '#a1804a'); px(-14, -32, 28, 2, '#a1804a');
    px(-7, -47, 14, 14, '#b71c1c'); px(-5, -45, 10, 10, '#f5f5f5'); px(-3, -43, 6, 6, '#b71c1c');
    px(-10, -22, 6, 6, '#e6c35c'); px(4, -22, 6, 6, '#e6c35c');
    // Sack head with stitched X eyes and a rope collar.
    px(-12, -80, 24, 21, '#4e342e'); px(-11, -79, 22, 19, '#d7b98a');
    px(-7, -74, 2, 2, '#4e342e'); px(-5, -72, 2, 2, '#4e342e'); px(-7, -70, 2, 2, '#4e342e'); px(-3, -74, 2, 2, '#4e342e'); px(-3, -70, 2, 2, '#4e342e');
    px(3, -74, 2, 2, '#4e342e'); px(5, -72, 2, 2, '#4e342e'); px(3, -70, 2, 2, '#4e342e'); px(7, -74, 2, 2, '#4e342e'); px(7, -70, 2, 2, '#4e342e');
    px(-12, -61, 24, 3, '#8d6e63');
    px(-6, -84, 12, 5, '#e6c35c');
    if (this.hitFlash > 0) { ctx.globalAlpha = .6; px(-15, -84, 30, 64, '#ffffff'); }
    ctx.restore();
    if (this.hp < this.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(x - 24, y - 94, 48, 5);
      ctx.fillStyle = '#ffb300'; ctx.fillRect(x - 24, y - 94, 48 * this.hp / this.maxHp, 5);
    }
  }
}
