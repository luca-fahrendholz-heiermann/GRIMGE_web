// GRIMGE Prototype — Composable Spell System & Elemental Combinations
import { audio } from './audio.js';
import { combat } from './combat.js';
import { GroundEntity, groundDistance, groundYForDepth, ENTITY_VISUALS, ARENA_LAYOUT } from './world.js';
import { lookupRecipe, SHADOW_STOMP } from './spell_catalog.js';
import { environment } from './environment.js';
import { sky, isSkyField } from './sky.js';
import { ShadowStomperSpell, HaloPulseSpell, castShadowStep, alliesOf } from './light_shadow.js';
import { raiseMirrorGate } from './portal.js';
import { activateBuffForm } from './buff_forms.js';
import { castSignature, signatureProjectileSpawned, updateSignatureWorld } from './signature_runes.js';
import { BeamSpell, BeamClash, resolveBeamInteractions, MirrorWardSpell, GravityLiftSpell, TitanStompSpell, SoulSeekerBolt, SeismicSlamSpell, ConeBreathSpell, BurrowStrikeSpell, ShieldBubbleSpell, renderPixelated } from './abilities.js';

export { BeamClash };

// Rune accuracy is intentionally a gameplay value instead of a pass/fail
// gate.  C casts are still useful; S casts are cleaner, stronger versions of
// the same spell.  The four multipliers map to damage, ground coverage,
// persistent effect time, and visual particle density respectively.
export const RUNE_GRADE_PROFILES = Object.freeze({
  C: Object.freeze({ grade: 'C', power: 0.80, area: 0.86, duration: 0.84, particles: 0.78 }),
  B: Object.freeze({ grade: 'B', power: 1.00, area: 1.00, duration: 1.00, particles: 1.00 }),
  A: Object.freeze({ grade: 'A', power: 1.10, area: 1.08, duration: 1.08, particles: 1.15 }),
  S: Object.freeze({ grade: 'S', power: 1.25, area: 1.20, duration: 1.20, particles: 1.40 })
});

export const SUMMON_DEFINITIONS = Object.freeze({
  lesser_beast: Object.freeze({ id: 'lesser_beast', spriteKey: 'spirit_wolf', name: 'BEAST FAMILIAR', hp: 54, duration: 7, speed: 230, attackRange: 36, damage: 12, attackCooldown: .85, radius: 15, color: '#b388ff', role: 'hunter', particleElement: 'bestia', mountable: true, mountSpeed: 390, riderOffsetY: 36 }),
  // Roles are gameplay contracts, not visual skins. New rune families can
  // reuse them without duplicating the movement/targeting implementation.
  spirit_wolf: Object.freeze({ id: 'spirit_wolf', name: 'SPIRIT WOLF', hp: 95, duration: 13, speed: 245, attackRange: 40, damage: 20, attackCooldown: .72, radius: 17, color: '#80d8ff', role: 'hunter', mountable: true, mountSpeed: 430, riderOffsetY: 39 }),
  storm_wolf: Object.freeze({ id: 'storm_wolf', spriteKey: 'storm_wolf', name: 'STORM WOLF', hp: 86, duration: 11, speed: 275, attackRange: 42, damage: 23, attackCooldown: .62, radius: 17, color: '#ffd54f', role: 'hunter', particleElement: 'fulgur', mountable: true, mountSpeed: 465, riderOffsetY: 42 }),
  siege_golem: Object.freeze({ id: 'siege_golem', name: 'SIEGE GOLEM', hp: 260, duration: 16, speed: 105, attackRange: 48, damage: 38, attackCooldown: 1.15, radius: 25, color: '#a1887f', role: 'vanguard', mountable: true, mountSpeed: 245, riderOffsetY: 64 }),
  rune_golem: Object.freeze({ id: 'rune_golem', spriteKey: 'siege_golem', name: 'RUNE GOLEM', hp: 235, duration: 15, speed: 120, attackRange: 48, damage: 32, attackCooldown: 1.0, radius: 24, color: '#b0bec5', role: 'vanguard', mountable: true, mountSpeed: 260, riderOffsetY: 64 }),
  void_spider: Object.freeze({ id: 'void_spider', spriteKey: 'void_spider', name: 'VOID SPIDER', hp: 125, duration: 14, speed: 178, attackRange: 54, damage: 14, attackCooldown: .9, radius: 22, color: '#d500f9', role: 'control', particleElement: 'void', slowDuration: 1.35, slowFactor: .45 }),
  // Solo special runes. A shadow double copies its caster's look; a revenant
  // borrows the body of a fallen fighter and bursts when it breaks.
  shadow_double: Object.freeze({ id: 'shadow_double', name: 'SHADOW DOUBLE', hp: 120, duration: 28, speed: 300, attackRange: 40, damage: 16, attackCooldown: .7, radius: 16, color: '#5e35b1', role: 'doppel', particleElement: 'void', limitKey: 'extraDoppels' }),
  revenant: Object.freeze({ id: 'revenant', name: 'REVENANT', hp: 130, duration: 24, speed: 205, attackRange: 42, damage: 22, attackCooldown: .9, radius: 16, color: '#9ccc65', role: 'revenant', particleElement: 'terra', limitKey: 'extraRevenants', rise: .8, burst: Object.freeze({ radius: 95, damage: 48 }) }),
  rune_snake: Object.freeze({ id: 'rune_snake', spriteKey: 'rune_snake', name: 'WORLD RUNE SERPENT', hp: 180, duration: 15, speed: 205, attackRange: 58, damage: 25, attackCooldown: .95, radius: 27, color: '#b668ff', role: 'lane_control', particleElement: 'void', mountable: true, mountSpeed: 355, riderOffsetY: 54, launch: 175 })
});

function gradeForQuality(quality) {
  if (quality >= 1.18) return 'S';
  if (quality >= 1.05) return 'A';
  if (quality >= 0.91) return 'B';
  return 'C';
}

function withinHeight(target, sourceHeight, fallback = 110) {
  return Math.abs((target.worldHeight ?? 0) - sourceHeight) < (target.hitHeightTolerance ?? fallback);
}

// Placed walls are chains of blocks; the drawing grade sets the length.
export const WALL_SEGMENT_SPACING = 24;
const WALL_SEGMENTS = Object.freeze({
  stone: Object.freeze({ C: 3, B: 4, A: 5, S: 6 }),
  bulwark: Object.freeze({ C: 2, B: 2, A: 3, S: 3 })
});

export class SpellSystem {
  constructor() {
    this.activeSpells = [];
    this.activeSummons = [];
    this.activeClashes = [];
    // Fallen fighters a Revenant Call can raise ({ x, z, spriteKey, … }).
    this.graves = [];
    this.wallGroupCounter = 0;
    // Spell VFX are rendered through a low-resolution layer for a pixel-art
    // look that matches the sprites (logical pixels per VFX pixel).
    this.pixelVfx = 2.5;
  }

  getClashFor(caster) {
    return this.activeClashes.find((clash) => !clash.isFinished && clash.sideOf(caster)) ?? null;
  }

  // Determine which spell is formed by a given set of prepared runes. The
  // catalog is data-driven (spell_catalog.js); unknown combinations have no
  // recipe and resolve to null instead of a generated random spell.
  resolveSpell(runes) {
    return lookupRecipe(runes);
  }

  qualityForRunes(runes = []) {
    if (!runes.length) return RUNE_GRADE_PROFILES.B;
    const profiles = runes.map((rune) => {
      if (rune?.grade && RUNE_GRADE_PROFILES[rune.grade]) return RUNE_GRADE_PROFILES[rune.grade];
      const confidence = Number(rune?.quality);
      if (Number.isFinite(confidence)) {
        if (confidence >= .92) return RUNE_GRADE_PROFILES.S;
        if (confidence >= .80) return RUNE_GRADE_PROFILES.A;
        if (confidence >= .64) return RUNE_GRADE_PROFILES.B;
      }
      return RUNE_GRADE_PROFILES.B;
    });
    const average = (key) => profiles.reduce((sum, profile) => sum + profile[key], 0) / profiles.length;
    // Rune levels are intentionally modest and additive to execution skill:
    // a great drawing still matters more than grinding a single element.
    const runeMastery = runes.reduce((sum, rune) => sum + Math.max(0, (rune?.runeLevel ?? 1) - 1), 0) / runes.length;
    const power = average('power') * (1 + runeMastery * .04);
    const grade = gradeForQuality(power);
    return Object.freeze({
      grade, power,
      area: average('area') * (1 + runeMastery * .025),
      duration: average('duration') * (1 + runeMastery * .02),
      particles: average('particles') * (1 + runeMastery * .05)
    });
  }

  normalizeQuality(quality) {
    if (!quality) return RUNE_GRADE_PROFILES.B;
    if (typeof quality === 'string') return RUNE_GRADE_PROFILES[quality] ?? RUNE_GRADE_PROFILES.B;
    return quality;
  }

  // The profile only adjusts final cast values. The recognizer remains the
  // authority for the grade, so a better drawing is still always better.
  applyCasterModifiers(caster, spellDef, quality) {
    let adjusted = { ...this.normalizeQuality(quality) };
    const mods = caster?.buildModifiers ?? {};
    if (mods.qualityFloor === 'B' && adjusted.grade === 'C') {
      const floor = RUNE_GRADE_PROFILES.B;
      adjusted = {
        ...adjusted,
        grade: 'B',
        power: Math.max(adjusted.power, floor.power),
        area: Math.max(adjusted.area, floor.area),
        duration: Math.max(adjusted.duration, floor.duration),
        particles: Math.max(adjusted.particles, floor.particles)
      };
    }
    const isSummon = spellDef?.id?.startsWith('summon_');
    adjusted.power *= (isSummon ? 1 : (mods.spellPower ?? 1)) * (spellDef?.tier > 1 ? (mods.comboPower ?? 1) : 1);
    adjusted.area *= (mods.spellArea ?? 1) * (spellDef?.id === 'dragon_invocation' ? (mods.dragonArea ?? 1) : 1);
    adjusted.duration *= (mods.spellDuration ?? 1);
    // The active sky sphere strengthens or weakens whole elements.
    adjusted.power *= sky.powerMultiplier(spellDef);
    return adjusted;
  }

  addSpell(spell, quality) {
    spell.quality = this.normalizeQuality(quality);
    // These cover projectile collision, radial coverage, path width and the
    // persistence of fields.  Individual damage ticks below read quality.power.
    if (typeof spell.radius === 'number') spell.radius *= spell.quality.area;
    if (typeof spell.maxRadius === 'number') spell.maxRadius *= spell.quality.area;
    if (typeof spell.width === 'number') spell.width *= spell.quality.area;
    if (typeof spell.damage === 'number') spell.damage *= spell.quality.power;
    if (typeof spell.life === 'number') spell.life *= spell.quality.duration;
    if (typeof spell.craterLife === 'number') spell.craterLife *= spell.quality.duration;
    spell.system = this;
    this.activeSpells.push(spell);
    if (spell.isCapturableProjectile) signatureProjectileSpawned(spell);
    return spell;
  }

  getSummons(team = null) {
    return this.activeSummons.filter((summon) => !summon.isDead && (team == null || summon.team === team));
  }

  clearRuntime() {
    for (const clash of this.activeClashes) clash.finish({ type: 'cleared' });
    this.activeSpells = [];
    this.activeSummons = [];
    this.activeClashes = [];
    this.graves = [];
    sky.clear();
  }

  // A fallen fighter leaves a grave a Revenant Call can raise for a while.
  recordGrave(actor) {
    const spriteKey = actor?.heroKey ?? actor?.spriteKey;
    if (!spriteKey || actor.isTrainingDummy || actor.isSummon || !Number.isFinite(actor.x)) return null;
    const grave = {
      x: actor.x, z: actor.z ?? .5, spriteKey, team: actor.team, age: 0, isHero: !!actor.heroKey,
      visualHeight: actor.heroKey ? ENTITY_VISUALS.heroHeight : (actor.renderHeight ?? ENTITY_VISUALS.minionHeight),
      maxHp: actor.maxHp ?? 60
    };
    this.graves.push(grave);
    if (this.graves.length > 12) this.graves.shift();
    return grave;
  }

  takeGrave(caster, range = 460) {
    let best = -1; let bestD = Infinity;
    this.graves.forEach((grave, index) => {
      const d = Math.hypot(grave.x - caster.x, (grave.z - caster.z) * 150);
      if (d <= range && d < bestD) { best = index; bestD = d; }
    });
    return best >= 0 ? this.graves.splice(best, 1)[0] : null;
  }

  summon(caster, definition, gameWorld, quality, options = {}) {
    // One summon per kind (role) and caster by default; Pack Leader adds
    // more (shadow doubles / revenants use their own Shadow passives).
    // Beyond the limit the oldest of that kind is dismissed.
    const mods = caster.buildModifiers ?? {};
    const extra = definition.limitKey ? (mods[definition.limitKey] ?? 0) : (mods.extraSummons ?? 0);
    const limit = 1 + Math.max(0, extra);
    const sameKind = this.activeSummons.filter((summon) => !summon.isDead && summon.team === caster.team && summon.definition.role === definition.role);
    while (sameKind.length >= limit) sameKind.shift().dismiss();
    const summon = new SummonedCreature(options.x ?? caster.x + caster.facing * 34, options.z ?? caster.z, caster.team, caster.surfaceHeight ?? 0, definition, quality, gameWorld.sprites);
    summon.owner = caster;
    if (options.mimicKey) summon.mimicKey = options.mimicKey;
    if (options.bodyKey) { summon.bodyKey = options.bodyKey; summon.bodyHeight = options.bodyHeight ?? ENTITY_VISUALS.minionHeight; }
    if (options.maxHp) summon.maxHp = options.maxHp;
    if (options.damageScale) summon.damage *= options.damageScale;
    if (definition.rise) summon.riseTimer = summon.riseDuration = definition.rise;
    summon.maxHp = Math.round(summon.maxHp * (mods.summonHp ?? 1));
    summon.hp = summon.maxHp;
    summon.damage *= mods.summonDamage ?? 1;
    // A ground summon inherits the caster's local platform height, then uses
    // the same surface solver as a Wizard. If it was created at a ledge it
    // visibly drops rather than retaining a Castle-battlement height forever.
    if (!summon.isFlying) gameWorld.battlefield.resolveEntityCollision(summon);
    this.activeSummons.push(summon);
    combat.spawnShockwave(summon.x, summon.y - 20, 42 * quality.area, definition.color);
    combat.spawnElementalParticles(summon.x, summon.y - 25, definition.particleElement ?? (definition.id === 'siege_golem' ? 'terra' : 'aqua'), Math.round(18 * quality.particles));
    return summon;
  }

  // Cast the resolved spell into the game world. `target` comes from the
  // targeting step: { x, z } for ground spells, { x, z, orientation, length }
  // for placed walls and { entity } for ally spells. Without a target every
  // spell falls back to its classic in-front-of-the-caster behaviour.
  cast(caster, spellDef, gameWorld, quality = null, target = null) {
    if (!spellDef) return;
    const castQuality = this.applyCasterModifiers(caster, spellDef, quality);

    audio.playSpell(spellDef.id);
    combat.shakeCamera(spellDef.tier * 4 + 3, 0.3);

    const facing = caster.facing;
    const startX = caster.x + facing * 35;
    const startZ = caster.z;
    const startHeight = caster.worldHeight ?? 0;

    // Buff transformation special runes (one per deck, one active at a time).
    if (spellDef.isBuffForm) { activateBuffForm(caster, spellDef.buffFormId, castQuality, this); return; }
    // Signature special runes (own glyph, own mechanic; not Arcane States).
    if (spellDef.isSignature) { castSignature(this, caster, spellDef, castQuality, target, gameWorld); return; }

    switch (spellDef.id) {
      case 'fireball': {
        this.addSpell(new FireballSpell(startX, startZ, facing, caster.team, startHeight), castQuality);
        break;
      }

      case 'gale_blast': {
        // Wind: clears smoke and drags burning ground along its path.
        this.addSpell(new GaleBlastSpell(startX, startZ, facing, caster.team, startHeight), castQuality).trail = { type: 'wind', interval: .08, radius: 70, dir: facing };
        break;
      }

      case 'chain_lightning': {
        this.addSpell(new ChainLightningSpell(startX, startZ, facing, caster.team, gameWorld, startHeight, castQuality), castQuality);
        environment.electrify(startX + facing * 120, startZ, 140, caster.team, 14 * castQuality.power, gameWorld);
        break;
      }

      case 'stone_spikes': {
        this.addSpell(new StoneSpikesSpell(startX, startZ, facing, caster.team), castQuality);
        environment.add('crack', startX + facing * 70, startZ, { radius: 70, angle: facing > 0 ? 0 : Math.PI });
        break;
      }

      case 'frost_nova': {
        this.addSpell(new FrostNovaSpell(caster.x, startZ, caster.team), castQuality);
        environment.add('ice', caster.x, startZ, { radius: 120 * castQuality.area, team: caster.team });
        break;
      }

      case 'firestorm': {
        // High-value combo: fire tornado — burns a trail and fans the flames.
        this.addSpell(new FirestormSpell(target?.x ?? startX, target?.z ?? startZ, facing, caster.team), castQuality).trail = { type: 'scorch', interval: .3, radius: 42, wind: facing };
        break;
      }

      case 'meteor_cataclysm': {
        // High-value combo: blazing meteor on the chosen impact point.
        this.addSpell(new MeteorSpell(target?.x ?? caster.x + facing * 240, target?.z ?? startZ, caster.team), castQuality);
        break;
      }

      case 'tempest_blitz': {
        // High-value combo: lightning dash (a gust along the dash line).
        const dashStart = caster.x;
        this.addSpell(new TempestBlitzSpell(caster, gameWorld, castQuality), castQuality);
        environment.wind((dashStart + caster.x) / 2, caster.z, Math.abs(caster.x - dashStart) / 2 + 40, facing);
        environment.electrify((dashStart + caster.x) / 2, caster.z, Math.abs(caster.x - dashStart) / 2, caster.team, 12, gameWorld);
        break;
      }

      case 'magma_fissure': {
        // The fissure opens 80px in front of its start; a chosen point is the centre.
        // The fissure leaves a molten pool for its whole lifetime (once, on its first tick).
        this.addSpell(new MagmaFissureSpell(target ? target.x - facing * 80 : startX, target?.z ?? startZ, facing, caster.team), castQuality).trail = { type: 'lava', interval: 99, radius: 70 };
        break;
      }

      case 'sandstorm_bastion': {
        this.addSpell(new SandstormBastionSpell(caster), castQuality).trail = { type: 'wind', interval: .3, radius: 105, dir: facing };
        break;
      }

      case 'blizzard_surge': {
        this.addSpell(new BlizzardSurgeSpell(startX, startZ, facing, caster.team), castQuality).trail = { type: 'ice', interval: .22, radius: 55 };
        break;
      }

      case 'aura_shock': {
        this.castAuraShock(caster, gameWorld, castQuality);
        environment.electrify(caster.x, caster.z, 112, caster.team, 10, gameWorld);
        break;
      }

      case 'arcane_aegis': {
        const ally = target?.entity;
        if (ally && ally !== caster) {
          this.addSpell(new ShieldBubbleSpell(ally, Math.round(90 * castQuality.power), 5 * castQuality.duration), castQuality);
          audio.playSpell('arcane_shield');
          combat.spawnShockwave(ally.x, (ally.y ?? groundYForDepth(ally.z)) - 30, 46, '#b388ff');
        } else this.castArcaneShield(caster, castQuality);
        break;
      }

      case 'eidolon_mantle': {
        this.castEidolonMantle(caster, castQuality);
        break;
      }

      case 'ninefold_beast_form': {
        this.castNinefoldBeast(caster, castQuality);
        break;
      }

      case 'stone_wall': {
        this.castStoneWall(caster, gameWorld, castQuality, target);
        break;
      }

      case 'construct_bulwark': {
        this.castConstructBulwark(caster, gameWorld, castQuality, target);
        break;
      }

      case 'halo_pulse': {
        this.addSpell(new HaloPulseSpell(caster, gameWorld, { healMultiplier: sky.healMultiplier(), allies: alliesOf(gameWorld, caster.team, this.getSummons(caster.team)) }), castQuality);
        break;
      }

      case 'shadow_step': {
        castShadowStep(caster, gameWorld, castQuality);
        break;
      }

      case 'shadow_stomper': {
        const mods = caster.buildModifiers ?? {};
        this.addSpell(new ShadowStomperSpell(caster, gameWorld, target, {
          maxTargets: 1 + (mods.bindTargets ?? 0) + sky.bindBonus(),
          hold: 2.6 * (mods.bindHold ?? 1) * castQuality.duration,
          range: SHADOW_STOMP.range * castQuality.area * sky.bindRange()
        }), castQuality);
        break;
      }

      case 'shadow_doppelganger': {
        const mods = caster.buildModifiers ?? {};
        // The double rises from the caster's shadow, just behind them.
        this.summon(caster, SUMMON_DEFINITIONS.shadow_double, gameWorld, castQuality, {
          x: caster.x - caster.facing * 38, z: Math.min(.95, caster.z + .05),
          mimicKey: caster.heroKey ?? 'paladin',
          maxHp: Math.round((caster.maxHp ?? 300) * .4 * (mods.doppelHp ?? 1) * castQuality.power)
        });
        break;
      }

      case 'revenant_call': {
        // Raise the nearest fallen fighter; without one a nameless fallen
        // soldier of the other side claws its way up.
        const grave = this.takeGrave(caster);
        const foe = caster.team === 'blue' ? 'red' : 'blue';
        const options = grave
          ? { x: grave.x, z: grave.z, bodyKey: grave.spriteKey, bodyHeight: grave.visualHeight, maxHp: Math.round(Math.min(260, Math.max(90, grave.maxHp * .7)) * castQuality.power), damageScale: grave.isHero ? 1.35 : 1 }
          : { x: caster.x + caster.facing * 60, z: caster.z, bodyKey: `minion_${foe}_melee`, bodyHeight: ENTITY_VISUALS.minionHeight * 1.25 };
        this.summon(caster, SUMMON_DEFINITIONS.revenant, gameWorld, castQuality, options);
        break;
      }

      case 'mirror_gate': {
        raiseMirrorGate(this, caster, target, castQuality, gameWorld);
        break;
      }

      case 'radiant_lance': {
        this.addSpell(new BeamSpell(caster, 'radiant', 'radiant_lance'), castQuality);
        break;
      }

      case 'solar_orb':
      case 'lunar_orb':
      case 'eclipse':
      case 'thunderhead':
      case 'blood_moon':
      case 'starfall':
      case 'aurora_veil': {
        if (isSkyField(spellDef.id)) sky.cast(caster, spellDef.id, castQuality, gameWorld);
        break;
      }

      case 'dragon_breath': {
        this.addSpell(new ConeBreathSpell(caster), castQuality);
        break;
      }

      case 'burrow_strike': {
        this.addSpell(new BurrowStrikeSpell(caster), castQuality);
        break;
      }

      case 'annihilation_beam': {
        this.addSpell(new BeamSpell(caster, 'annihilation', 'annihilation_beam'), castQuality);
        audio.playSpell('focus_ascendant');
        combat.shakeCamera(6, 0.3);
        break;
      }

      // One Beam controller, individual looks (concept doc §5).
      case 'inferno_beam':
      case 'glacial_ray':
      case 'thunder_lance':
      case 'null_ray': {
        const profile = { inferno_beam: 'inferno', glacial_ray: 'glacial', thunder_lance: 'thunder', null_ray: 'null' }[spellDef.id];
        this.addSpell(new BeamSpell(caster, profile, spellDef.id), castQuality);
        break;
      }

      case 'mirror_ward': {
        this.addSpell(new MirrorWardSpell(caster), castQuality);
        break;
      }

      case 'gravity_lift': {
        this.addSpell(new GravityLiftSpell(caster, gameWorld, target), castQuality);
        break;
      }

      case 'titan_stomp': {
        this.addSpell(new TitanStompSpell(caster), castQuality);
        break;
      }

      case 'soul_seekers': {
        // A three-shot homing salvo fanned around the facing direction.
        const base = facing > 0 ? 0 : Math.PI;
        [-.55, 0, .55].forEach((spread, index) => {
          this.addSpell(new SoulSeekerBolt(startX, startZ, startHeight, base + spread, caster.team, index * .09), castQuality);
        });
        break;
      }

      case 'seismic_slam': {
        // Terrain impact: short-lived rock pillars reuse the Stone Wall
        // obstacle rules (movement + projectile blocking).
        const spawnPillar = (x, z, surfaceHeight) => this.addSpell(new StoneWallSpell(x, z, caster.team, surfaceHeight, {
          halfX: 10, halfZ: .08, wallHeight: 52, life: 2.2, color: '#8d6e63', hp: 40, isPillar: true
        }), castQuality);
        this.addSpell(new SeismicSlamSpell(caster, spawnPillar), castQuality);
        combat.shakeCamera(8, .35);
        break;
      }

      case 'void_implosion': {
        environment.add('crack', target?.x ?? startX + facing * 120, target?.z ?? startZ, { radius: 90, angle: 0 });
        this.addSpell(new VoidImplosionSpell(target?.x ?? startX + facing * 120, target?.z ?? startZ, caster.team), castQuality);
        audio.playSpell('eidolon_mantle');
        combat.shakeCamera(8, 0.4);
        break;
      }

      case 'inferno_rampage': {
        this.addSpell(new InfernoRampageSpell(startX, startZ, facing, caster.team), castQuality).trail = { type: 'scorch', interval: .15, radius: 38 };
        audio.playSpell('ignis');
        combat.shakeCamera(10, 0.5);
        break;
      }

      case 'void_bolt': {
        this.addSpell(new FireballSpell(startX, startZ, facing, caster.team, startHeight, {
          element: 'void', damage: 30, radius: 13, speed: 680,
          coreColor: '#f3e5f5', midColor: '#d500f9', edgeColor: '#4a148c', slowDuration: 1.15, slowFactor: .5
        }), castQuality);
        break;
      }

      case 'summon_lesser_beast': {
        this.summon(caster, SUMMON_DEFINITIONS.lesser_beast, gameWorld, castQuality);
        break;
      }

      case 'summon_spirit_wolf': {
        this.summon(caster, SUMMON_DEFINITIONS.spirit_wolf, gameWorld, castQuality);
        break;
      }

      case 'summon_storm_wolf': {
        this.summon(caster, SUMMON_DEFINITIONS.storm_wolf, gameWorld, castQuality);
        break;
      }

      case 'summon_void_spider': {
        this.summon(caster, SUMMON_DEFINITIONS.void_spider, gameWorld, castQuality);
        break;
      }

      case 'summon_rune_snake': {
        this.summon(caster, SUMMON_DEFINITIONS.rune_snake, gameWorld, castQuality);
        break;
      }

      case 'summon_siege_golem': {
        this.summon(caster, SUMMON_DEFINITIONS.siege_golem, gameWorld, castQuality);
        break;
      }

      case 'summon_rune_golem': {
        this.summon(caster, SUMMON_DEFINITIONS.rune_golem, gameWorld, castQuality);
        break;
      }

      case 'dragon_invocation': {
        this.addSpell(new DragonInvocationSpell(caster, gameWorld.sprites), castQuality);
        break;
      }

      case 'apocalyptic_heavensurge': {
        // Grand 3-rune combination
        this.addSpell(new FirestormSpell(startX, startZ, facing, caster.team), castQuality);
        const targetX = caster.x + facing * 280;
        this.addSpell(new MeteorSpell(targetX, startZ, caster.team), castQuality);
        this.addSpell(new BlizzardSurgeSpell(startX + facing * 50, startZ, facing, caster.team), castQuality);
        combat.shakeCamera(16, 0.8);
        break;
      }
    }
  }

  castAuraShock(caster, gameWorld, quality = RUNE_GRADE_PROFILES.B) {
    const mods = caster.buildModifiers ?? {};
    const radius = 112 * quality.area * (mods.auraArea ?? 1);
    const damage = 22 * quality.power;
    audio.playSpell('aura_shock');
    combat.shakeCamera(7, 0.18);
    combat.spawnShockwave(caster.x, caster.y - 28, radius, '#b388ff');
    combat.spawnElementalParticles(caster.x, caster.y - 28, 'fulgur', Math.round(24 * quality.particles));

    let hitAny = false;
    for (const target of gameWorld.getHostileTargets(caster.team)) {
      if (target.isObjective || target.isDead || target.lifeState === 'Dead') continue;
      const dx = target.x - caster.x;
      const dz = (target.z - caster.z) * 150;
      const distance = Math.hypot(dx, dz);
      if (distance > radius || !withinHeight(target, caster.worldHeight, 88)) continue;
      const safeDistance = Math.max(1, distance);
      const push = 340 * quality.power * (mods.auraPush ?? 1) * (1 - distance / radius * 0.35);
      target.takeDamage(damage, (dx / safeDistance) * push, 90, 0.18, false, 'spell');
      // `vz` is independent ground-plane depth momentum; Aura Shock is a
      // true radial 2.5D push rather than a horizontal-only hit.
      target.vz += (dz / safeDistance) * (push / 150);
      combat.spawnHitSparks(target.x, target.y - 24, Math.sign(dx) || caster.facing, '#d1c4ff', 10);
      hitAny = true;
    }
    if (hitAny) combat.triggerHitstop(3);
    return hitAny;
  }

  castArcaneShield(caster, quality = RUNE_GRADE_PROFILES.B) {
    caster.arcaneShield = Math.round(90 * quality.power);
    caster.arcaneShieldTimer = 5 * quality.duration;
    audio.playSpell('arcane_shield');
    combat.spawnShockwave(caster.x, caster.y - 32, 52, '#b388ff');
    combat.spawnElementalParticles(caster.x, caster.y - 30, 'fulgur', Math.round(18 * quality.particles));
  }

  castEidolonMantle(caster, quality = RUNE_GRADE_PROFILES.B) {
    // This is an original GRIMGE transformation, not a character skin. It
    // intentionally layers with neither a permanent summon nor a new button:
    // runes decide when a short, high-pressure guardian form is available.
    caster.ninefoldTimer = 0;
    caster.ninefoldPower = 1;
    caster.eidolonTimer = 10 * quality.duration;
    caster.eidolonPower = quality.power;
    caster.eidolonArmor = Math.min(.48, .30 + (quality.power - 1) * .35);
    combat.spawnShockwave(caster.x, caster.y - 38, 78 * quality.area, '#b668ff');
    combat.spawnElementalParticles(caster.x, caster.y - 38, 'void', Math.round(34 * quality.particles));
    audio.playSpell('eidolon_mantle');
  }

  castNinefoldBeast(caster, quality = RUNE_GRADE_PROFILES.B) {
    // Forms are intentionally mutually exclusive: the player chooses a
    // defensive guardian or a short aggressive transformation, not both.
    caster.eidolonTimer = 0;
    caster.eidolonPower = 1;
    caster.eidolonArmor = 0;
    caster.ninefoldTimer = 8 * quality.duration;
    caster.ninefoldPower = quality.power;
    combat.spawnShockwave(caster.x, caster.y - 38, 88 * quality.area, '#ff6f3b');
    combat.spawnElementalParticles(caster.x, caster.y - 38, 'ignis', Math.round(32 * quality.particles));
    audio.playSpell('ignis');
  }

  // A placed wall follows the swiped line, snapped to the two collision axes:
  // a "depth" wall spans the lane (blocks horizontal approach), a "lateral"
  // wall runs along x (blocks depth movement).
  // How many stone blocks a placed wall may have: the drawing grade sets the
  // maximum (a cleaner rune builds a longer wall), Barrier Mastery adds one.
  wallSegmentLimit(spellId, quality, caster = null) {
    const grade = this.normalizeQuality(quality).grade ?? 'B';
    const table = spellId === 'construct_bulwark' ? WALL_SEGMENTS.bulwark : WALL_SEGMENTS.stone;
    return (table[grade] ?? table.B) + ((caster?.buildModifiers?.wallHp ?? 1) > 1 ? 1 : 0);
  }

  // Block centres along the placed line. A swipe ({ start, end }) places the
  // wall exactly there in any direction — across, along or diagonal to the
  // lane — starting where the swipe began. Without a swipe (tap, gamepad,
  // AI) a full-length wall is centred on the point, across the lane unless
  // `orientation: 'lateral'`.
  wallLine(caster, target, maxSegments, spacing = WALL_SEGMENT_SPACING, bounds = null) {
    const depth = 150;
    let sx; let sz; let ex; let ez;
    const swiped = target?.start && target?.end && Math.hypot(target.end.x - target.start.x, (target.end.z - target.start.z) * depth) >= spacing * .75;
    if (swiped) {
      ({ x: sx, z: sz } = target.start); ({ x: ex, z: ez } = target.end);
    } else {
      const cx = target?.x ?? caster.x + (caster.facing || 1) * 78;
      const cz = target?.z ?? caster.z;
      const half = (maxSegments - 1) * spacing / 2;
      const lateral = target?.orientation === 'lateral';
      sx = cx - (lateral ? half : 0); ex = cx + (lateral ? half : 0);
      sz = cz - (lateral ? 0 : half / depth); ez = cz + (lateral ? 0 : half / depth);
    }
    const total = Math.hypot(ex - sx, (ez - sz) * depth);
    const count = Math.max(1, Math.min(maxSegments, Math.floor(total / spacing + 1e-6) + 1));
    const ux = total > 0 ? (ex - sx) / total : 0; const uz = total > 0 ? (ez - sz) / total : 0;
    const area = bounds ?? ARENA_LAYOUT.playableBounds;
    const points = [];
    for (let i = 0; i < count; i++) {
      const z = sz + uz * spacing * i;
      points.push({ x: sx + ux * spacing * i, z: Math.max(area.farZ ?? .06, Math.min(area.nearZ ?? .94, z)) });
    }
    return points;
  }

  // Walls on the field are limited per caster (base 1; the Rampart Mason
  // passive raises it). A wall is one group of blocks. Only when the limit
  // is exceeded does the oldest wall crumble.
  makeRoomForWall(caster) {
    const limit = Math.max(1, caster.buildModifiers?.maxWalls ?? 1);
    const groups = [];
    for (const spell of this.activeSpells) {
      if (!spell.isStoneWall || spell.isPillar || spell.isFinished || spell.team !== caster.team || spell.owner !== caster) continue;
      if (!groups.includes(spell.wallGroup)) groups.push(spell.wallGroup);
    }
    while (groups.length >= limit) {
      const oldest = groups.shift();
      for (const spell of this.activeSpells) if (spell.wallGroup === oldest) spell.life = 0;
    }
  }

  placeWall(caster, gameWorld, quality, target, spellId, block) {
    this.makeRoomForWall(caster);
    const max = this.wallSegmentLimit(spellId, quality, caster);
    const points = this.wallLine(caster, target, max, WALL_SEGMENT_SPACING, gameWorld?.battlefield?.boundsOverride);
    const group = ++this.wallGroupCounter;
    const blocks = points.map((point) => {
      const wall = this.addSpell(new StoneWallSpell(point.x, point.z, caster.team, caster.surfaceHeight ?? 0, block), quality);
      wall.owner = caster; wall.wallGroup = group;
      return wall;
    });
    return blocks;
  }

  castStoneWall(caster, gameWorld, quality = RUNE_GRADE_PROFILES.B, target = null) {
    const mods = caster.buildModifiers ?? {};
    const blocks = this.placeWall(caster, gameWorld, quality, target, 'stone_wall', {
      halfX: 13, halfZ: .075, wallHeight: 72, life: 16 * (mods.wallDuration ?? 1), hp: Math.round(110 * (mods.wallHp ?? 1))
    });
    audio.playSpell('stone_spikes');
    combat.shakeCamera(5, 0.2);
    for (const wall of blocks) {
      combat.spawnDust(wall.x, wall.y, 3);
      combat.spawnElementalParticles(wall.x, wall.y, 'terra', Math.round(5 * quality.particles));
    }
    return blocks[0];
  }

  castConstructBulwark(caster, gameWorld, quality = RUNE_GRADE_PROFILES.B, target = null) {
    const mods = caster.buildModifiers ?? {};
    const blocks = this.placeWall(caster, gameWorld, quality, target, 'construct_bulwark', {
      halfX: 12, halfZ: .07, wallHeight: 66, life: 9 * (mods.wallDuration ?? 1), hp: Math.round(80 * (mods.wallHp ?? 1)), color: '#90a4ae'
    });
    audio.playSpell('stone_spikes');
    for (const wall of blocks) combat.spawnElementalParticles(wall.x, wall.y, 'construct', Math.round(5 * quality.particles));
    return blocks[0];
  }

  // Moving spells can leave a trail on the environment layer.
  updateTrail(spell, dt) {
    const trail = spell.trail;
    if (!trail || spell.isFinished) return;
    spell.trailTimer = (spell.trailTimer ?? 0) - dt;
    if (spell.trailTimer > 0) return;
    spell.trailTimer = trail.interval;
    const x = spell.x ?? spell.caster?.x; const z = spell.z ?? spell.caster?.z;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    if (trail.type === 'wind') { environment.wind(x, z, trail.radius, trail.dir ?? spell.facing ?? 1); return; }
    environment.add(trail.type, x, z, { radius: trail.radius * (spell.quality?.area ?? 1), team: spell.team });
    if (trail.wind) environment.wind(x, z, trail.radius + 30, trail.wind);
  }

  update(dt, gameWorld) {
    updateSignatureWorld(dt, gameWorld);
    for (let i = this.activeSpells.length - 1; i >= 0; i--) {
      const spell = this.activeSpells[i];
      spell.update(dt, gameWorld);
      this.updateTrail(spell, dt);
      if (spell.isFinished) {
        this.activeSpells.splice(i, 1);
      }
    }
    for (let i = this.activeSummons.length - 1; i >= 0; i--) {
      const summon = this.activeSummons[i];
      summon.update(dt, gameWorld);
      if (summon.isDead) {
        // A revenant's borrowed body bursts when it breaks or its time ends.
        if (summon.definition.burst && !summon.dismissed && !summon.burstDone) summon.burst(gameWorld);
        this.activeSummons.splice(i, 1);
      }
    }
    for (const grave of this.graves) grave.age += dt;
    this.graves = this.graves.filter((grave) => grave.age < 45);
    sky.update(dt, gameWorld);
    this.activeClashes.push(...resolveBeamInteractions(this, gameWorld));
    for (const clash of this.activeClashes) clash.update(dt);
    this.activeClashes = this.activeClashes.filter((clash) => !clash.isFinished);
  }

  // Ground depth of a spell for painter's-order sorting with the actors, or
  // null for effects without a ground position (drawn on top).
  spellDepth(spell) {
    const z = Number.isFinite(spell.z) ? spell.z : Number.isFinite(spell.targetZ) ? spell.targetZ : null;
    return z === null ? null : groundYForDepth(z) - (spell.surfaceHeight ?? 0);
  }

  pixelSizeFor(ctx) {
    return Math.max(1, Math.round(this.pixelVfx * (ctx.getTransform?.()?.a || 1)));
  }

  renderBatch(ctx, batch) {
    if (!batch.length) return;
    renderPixelated(ctx, this.pixelSizeFor(ctx), (layer) => { for (const spell of batch) this.renderSafely(layer, spell); });
  }

  // One broken effect must never freeze the game loop: it is logged once
  // and removed instead of throwing out of the frame.
  renderSafely(ctx, spell) {
    try {
      ctx.save?.();
      spell.render(ctx);
    } catch (error) {
      console.error(`Spell render failed (${spell.constructor?.name ?? 'spell'}) — effect removed`, error);
      spell.isFinished = true;
    } finally {
      ctx.restore?.();
    }
  }

  // Sortable entries ({ y, spell } / { y, render }) for the actor pass.
  depthEntries() {
    const entries = [];
    for (const spell of this.activeSpells) {
      if (spell.isGroundDecal) continue;
      const y = this.spellDepth(spell);
      if (y !== null) entries.push({ y, spell });
    }
    for (const summon of this.activeSummons) entries.push({ y: summon.y, render: (c) => summon.render(c) });
    return entries;
  }

  // Ground decals (shadow tethers) and graves lie under every actor.
  renderGroundDecals(ctx) {
    this.renderBatch(ctx, this.activeSpells.filter((spell) => spell.isGroundDecal));
    const t = performance.now() * .001;
    ctx.save();
    for (const grave of this.graves) {
      // A faint soul wisp marks a body a Revenant Call can raise.
      const fade = Math.min(1, (45 - grave.age) / 6) * .7;
      const y = groundYForDepth(grave.z);
      const bob = Math.sin(t * 3 + grave.x) * 3;
      ctx.fillStyle = `rgba(20,30,20,${fade * .5})`;
      ctx.beginPath(); ctx.ellipse(grave.x, y, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(156,204,101,${fade})`;
      ctx.fillRect(Math.round(grave.x - 2), Math.round(y - 20 + bob), 4, 8);
      ctx.fillStyle = `rgba(220,237,200,${fade})`;
      ctx.fillRect(Math.round(grave.x - 1), Math.round(y - 24 + bob), 2, 5);
    }
    ctx.restore();
  }

  // Spells without a ground depth (and the clash UI) stay on top. Pass
  // { depthSorted: true } when the actor pass already drew the rest.
  render(ctx, { depthSorted = false } = {}) {
    const topLayer = depthSorted ? this.activeSpells.filter((spell) => !spell.isGroundDecal && this.spellDepth(spell) === null) : this.activeSpells;
    this.renderBatch(ctx, topLayer);
    if (!depthSorted) for (const summon of this.activeSummons) summon.render(ctx);
    for (const clash of this.activeClashes) clash.render(ctx);
  }
}

// ----------------------------------------------------
// SPELL IMPLEMENTATIONS
// ----------------------------------------------------

class FireballSpell {
  // Fireball is also the compact projectile base for element variants.  The
  // original IGNIS call site passes no options, so its old behaviour remains
  // unchanged while VOID can supply its own visuals and on-hit control.
  constructor(x, z, facing, team, height = 0, options = {}) {
    this.x = x;
    this.z = z;
    this.height = height;
    this.vx = facing * (options.speed ?? 620);
    this.vy = 0;
    this.facing = facing;
    this.team = team;
    this.radius = options.radius ?? 16;
    this.life = 1.4;
    this.isFinished = false;
    this.damage = options.damage ?? 65;
    this.element = options.element ?? 'ignis';
    this.coreColor = options.coreColor ?? '#ffffff';
    this.midColor = options.midColor ?? '#ff9100';
    this.edgeColor = options.edgeColor ?? '#ff3d00';
    this.slowDuration = options.slowDuration ?? 0;
    this.slowFactor = options.slowFactor ?? 1;
    this.isCapturableProjectile = true;
  }
  get y() { return groundYForDepth(this.z) - this.height - 30; }

  update(dt, gameWorld) {
    const previousX = this.x;
    this.x += this.vx * dt;
    this.life -= dt;

    combat.spawnElementalParticles(this.x, this.y, this.element, 3);

    // Collision check against hostile entities
    const targets = gameWorld.getHostileTargets(this.team);
    for (const t of targets) {
      const dist = groundDistance(this, t);
      // Projectiles must not tunnel through a fighter after a dropped frame.
      // The ground plane's z scale is preserved while x is tested across the
      // travelled segment rather than only at the final frame position.
      const segmentX = Math.max(Math.min(previousX, this.x), Math.min(Math.max(previousX, this.x), t.x));
      const sweptDist = Math.hypot(segmentX - t.x, (this.z - (t.z ?? this.z)) * 150);
      const hitRadius = this.radius + (t.radius || t.hitRadiusX || 20);
      if (Math.min(dist, sweptDist) < hitRadius && withinHeight(t, this.height)) {
        this.x = segmentX;
        // A freshly raised physical shield can reverse a travelling Fireball
        // before it detonates.  Area spells are still blockable, but only a
        // discrete projectile gets this literal return-to-sender behaviour.
        if (t === gameWorld.player) {
          const outcome = t.takeDamage(0, this.facing * 380, 0, 0, false, 'spell');
          if (outcome?.perfect) {
            this.team = t.team;
            this.facing *= -1;
            this.vx *= -1;
            this.x = t.x + t.facing * 22;
            this.z = t.z;
            this.height = t.worldHeight + 24;
            this.life = Math.max(this.life, 0.8);
            combat.spawnShockwave(this.x, this.y, 30, '#b3e5fc');
            return;
          }
        }
        this.detonate(gameWorld);
        break;
      }
    }

    if (this.life <= 0) this.detonate(gameWorld);
  }

  detonate(gameWorld) {
    if (this.isFinished) return;
    this.isFinished = true;
    audio.playImpact(true);
    combat.shakeCamera(6, 0.2);
    combat.spawnShockwave(this.x, this.y, 65, this.midColor);
    combat.spawnHitSparks(this.x, this.y, this.facing, this.midColor, 16);
    if (this.element === 'ignis') environment.add('scorch', this.x, this.z, { radius: 44 * (this.quality?.area ?? 1), team: this.team });

    // AoE Damage
    const targets = gameWorld.getHostileTargets(this.team);
    for (const t of targets) {
      const dist = groundDistance(this, t);
      // Structures are wider than fighters. A Fireball that legitimately
      // collides with the edge of a Tower must damage that Tower rather than
      // exploding just outside an unrelated smaller AoE radius.
      const impactRadius = 80 * this.quality.area + (t.isObjective ? (t.hitRadiusX ?? 0) * 0.5 : 0);
      if (dist < impactRadius && withinHeight(t, this.height, 120)) {
        t.takeDamage(this.damage, this.facing * 380, 220, 0.4, false, 'spell');
        if (this.slowDuration > 0) t.slow?.(this.slowDuration * this.quality.duration, this.slowFactor);
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.radius * 1.6);
    grad.addColorStop(0, this.coreColor);
    grad.addColorStop(0.3, this.midColor);
    grad.addColorStop(0.8, this.edgeColor);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class GaleBlastSpell {
  constructor(x, z, facing, team, height = 0) {
    this.x = x;
    this.z = z;
    this.heightAboveSurface = height;
    this.vx = facing * 750;
    this.facing = facing;
    this.team = team;
    this.width = 40;
    this.height = 70;
    this.life = 0.8;
    this.isFinished = false;
    this.hitEntities = new Set();
  }
  get y() { return groundYForDepth(this.z) - this.heightAboveSurface - 26; }

  update(dt, gameWorld) {
    this.x += this.vx * dt;
    this.life -= dt;

    combat.spawnElementalParticles(this.x, this.y, 'ventus', 3);

    const targets = gameWorld.getHostileTargets(this.team);
    for (const t of targets) {
      if (!this.hitEntities.has(t)) {
        if (Math.abs(t.x - this.x) < 45 && Math.abs(t.z - this.z) < 0.2 && Math.abs((t.worldHeight ?? 0) - this.heightAboveSurface) < 105) {
          this.hitEntities.add(t);
          t.takeDamage(35 * this.quality.power, this.facing * 600, 280, 0.6, false, 'spell');
          combat.spawnHitSparks(t.x, t.y - 20, this.facing, '#4deeea', 10);
        }
      }
    }

    if (this.life <= 0) this.isFinished = true;
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#4deeea';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 35, (this.facing > 0 ? -1.2 : 2.0), (this.facing > 0 ? 1.2 : 4.4));
    ctx.stroke();
    ctx.restore();
  }
}

class ChainLightningSpell {
  constructor(x, z, facing, team, gameWorld, height = 0, quality = RUNE_GRADE_PROFILES.B) {
    this.isFinished = false;
    this.life = 0.35;
    this.segments = [];
    this.team = team;

    // Find up to 4 nearby hostile targets to chain
    const targets = gameWorld.getHostileTargets(team);
    let currX = x;
    let currZ = z;
    let currY = groundYForDepth(z) - height - 28;
    let currHeight = height;
    const hitList = [];

    for (let c = 0; c < 4; c++) {
      let nearest = null;
      let nearDist = 320;
      for (const t of targets) {
        if (!hitList.includes(t)) {
          const d = Math.hypot(t.x - currX, (t.z - currZ) * 150);
          if (d < nearDist && Math.abs((t.worldHeight ?? 0) - currHeight) < 125) {
            nearDist = d;
            nearest = t;
          }
        }
      }

      if (nearest) {
        hitList.push(nearest);
        this.segments.push({ x1: currX, y1: currY, x2: nearest.x, y2: nearest.y - 25 });
        nearest.takeDamage(48 * quality.power, facing * 220, 120, 0.5, false, 'spell');
        combat.spawnHitSparks(nearest.x, nearest.y - 25, facing, '#ffff00', 12);
        currX = nearest.x;
        currZ = nearest.z;
        currY = nearest.y - 25;
        currHeight = nearest.worldHeight ?? 0;
      } else {
        break;
      }
    }

    if (this.segments.length === 0) {
      // Strike straight forward
      this.segments.push({ x1: x, y1: currY, x2: x + facing * 240, y2: currY });
    }
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.isFinished = true;
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#fff59d';
    ctx.shadowColor = '#ffd000';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;

    for (const seg of this.segments) {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      // Zig-zag jagged bolt
      const midX = (seg.x1 + seg.x2) * 0.5 + (Math.random() * 24 - 12);
      const midY = (seg.y1 + seg.y2) * 0.5 + (Math.random() * 24 - 12);
      ctx.lineTo(midX, midY);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class StoneSpikesSpell {
  constructor(startX, z, facing, team) {
    this.startX = startX;
    this.z = z;
    this.y = groundYForDepth(z);
    this.facing = facing;
    this.team = team;
    this.spikes = [];
    this.life = 1.6;
    this.isFinished = false;

    // 4 Sequential spikes advancing forward
    for (let i = 0; i < 4; i++) {
      this.spikes.push({
        x: startX + facing * (i * 45 + 30),
        y: this.y,
        z,
        height: 0,
        maxHeight: 48 + i * 8,
        delay: i * 0.1,
        active: false,
        hitDone: false
      });
    }
  }

  update(dt, gameWorld) {
    this.life -= dt;
    for (const sp of this.spikes) {
      if (sp.delay > 0) {
        sp.delay -= dt;
        if (sp.delay <= 0) {
          sp.active = true;
          audio.playImpact(false);
          combat.shakeCamera(3, 0.15);
          combat.spawnShockwave(sp.x, sp.y, 25, '#8d6e63');
        }
      } else if (sp.active) {
        if (sp.height < sp.maxHeight) {
          sp.height += (sp.maxHeight - sp.height) * Math.min(1, dt * 18);
        }

        if (!sp.hitDone) {
          sp.hitDone = true;
          const targets = gameWorld.getHostileTargets(this.team);
          for (const t of targets) {
            if (Math.abs(t.x - sp.x) < 32 * this.quality.area && Math.abs(t.z - sp.z) < 0.16 * this.quality.area) {
              t.takeDamage(42 * this.quality.power, this.facing * 120, 420, 0.6, false, 'spell'); // Knock straight up
              combat.spawnElementalParticles(sp.x, sp.y, 'terra', Math.round(8 * this.quality.particles));
            }
          }
        }
      }
    }

    if (this.life <= 0) this.isFinished = true;
  }

  render(ctx) {
    ctx.save();
    for (const sp of this.spikes) {
      if (sp.height > 2) {
        ctx.fillStyle = '#5d4037';
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sp.x - 14, sp.y);
        ctx.lineTo(sp.x, sp.y - sp.height);
        ctx.lineTo(sp.x + 14, sp.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

class FrostNovaSpell {
  constructor(x, z, team) {
    this.x = x;
    this.z = z;
    this.team = team;
    this.radius = 10;
    this.maxRadius = 140;
    this.life = 0.5;
    this.isFinished = false;
    this.hitEntities = new Set();
  }
  get y() { return groundYForDepth(this.z); }

  update(dt, gameWorld) {
    this.radius += (this.maxRadius - this.radius) * Math.min(1, dt * 10);
    this.life -= dt;

    const targets = gameWorld.getHostileTargets(this.team);
    for (const t of targets) {
      if (!this.hitEntities.has(t)) {
        const d = groundDistance(this, t);
        if (d < this.radius) {
          this.hitEntities.add(t);
          t.takeDamage(30 * this.quality.power, 0, 80, 0.4, false, 'spell');
          t.freeze?.(1.2 * this.quality.duration); // Structures take damage but cannot be frozen.
          combat.spawnElementalParticles(t.x, t.y - 20, 'aqua', Math.round(12 * this.quality.particles));
        }
      }
    }

    if (this.life <= 0) this.isFinished = true;
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ----------------------------------------------------
// TRANSFORMATION SPECIAL
// ----------------------------------------------------

class VoidImplosionSpell {
  constructor(x, z, team) {
    this.x = x;
    this.z = z;
    this.team = team;
    this.life = 3.0;
    this.phase = 'expand';
    this.expandTime = 0;
    this.expandDuration = 0.8;
    this.collapseTime = 0;
    this.collapseDuration = 0.5;
    this.holdTime = 0;
    this.holdDuration = 1.2;
    this.radius = 0;
    this.maxRadius = 120;
    this.isFinished = false;
    this.pullStrength = 450;
    this.damageTicked = 0;
  }
  get y() { return groundYForDepth(this.z); }

  update(dt, gameWorld) {
    this.life -= dt;
    if (this.phase === 'expand') {
      this.expandTime += dt;
      this.radius = (this.expandTime / this.expandDuration) * this.maxRadius * (this.quality?.area ?? 1);
      combat.spawnElementalParticles(this.x + (Math.random() - 0.5) * this.radius, this.y - 20, 'void', 2);
      if (this.expandTime >= this.expandDuration) { this.phase = 'hold'; combat.shakeCamera(6, 0.3); }
    } else if (this.phase === 'hold') {
      this.holdTime += dt;
      this.damageTicked += dt;
      const targets = gameWorld.getHostileTargets(this.team);
      for (const t of targets) {
        const dx = this.x - t.x;
        const dz = (this.z - t.z) * 150;
        const dist = Math.hypot(dx, dz);
        if (dist < this.radius * 1.5) {
          const pull = Math.min(1, this.radius / Math.max(1, dist)) * this.pullStrength * (this.quality?.power ?? 1);
          t.vx += (dx / Math.max(1, dist)) * pull * dt;
          if (this.damageTicked >= 0.25 && dist < this.radius) {
            t.takeDamage(18 * (this.quality?.power ?? 1), 0, 40, 0.12, false, 'spell');
            combat.spawnHitSparks(t.x, t.y - 20, 1, '#d596ff', 4);
          }
        }
      }
      if (this.damageTicked >= 0.25) this.damageTicked = 0;
      if (this.holdTime >= this.holdDuration) {
        this.phase = 'collapse';
        const targets2 = gameWorld.getHostileTargets(this.team);
        for (const t of targets2) {
          const dist = Math.hypot(this.x - t.x, (this.z - t.z) * 150);
          if (dist < this.radius * 1.2) {
            t.takeDamage(35 * (this.quality?.power ?? 1), 0, 200, 0.4, true, 'spell');
            combat.spawnHitSparks(t.x, t.y - 20, 1, '#b668ff', 10);
          }
        }
        combat.shakeCamera(14, 0.6);
        combat.spawnShockwave(this.x, this.y - 20, this.radius * 0.8, '#b668ff');
        audio.playImpact(true);
      }
    } else {
      this.collapseTime += dt;
      this.radius = Math.max(0, this.maxRadius * (1 - this.collapseTime / this.collapseDuration));
      if (this.collapseTime >= this.collapseDuration) this.isFinished = true;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const baseY = this.y - 20;
    const t = performance.now() * 0.004;
    if (this.phase === 'expand' || this.phase === 'hold') {
      const pulseR = this.radius * (1 + Math.sin(t * 3) * 0.08);
      const g = ctx.createRadialGradient(this.x, baseY, 0, this.x, baseY, pulseR);
      g.addColorStop(0, 'rgba(0,0,0,0.7)');
      g.addColorStop(0.4, 'rgba(100,30,180,0.5)');
      g.addColorStop(0.7, 'rgba(182,104,255,0.3)');
      g.addColorStop(1, 'rgba(182,104,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.x, baseY, pulseR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d596ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      for (let i = 0; i < 3; i++) {
        const ringR = pulseR * (0.4 + i * 0.25);
        ctx.beginPath();
        ctx.arc(this.x, baseY, ringR, t + i * 2, t + i * 2 + Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (let i = 0; i < 8; i++) {
        const angle = t * 2 + i * Math.PI / 4;
        const dist = pulseR * 0.9;
        const px = this.x + Math.cos(angle) * dist;
        const py = baseY + Math.sin(angle) * dist * 0.5;
        ctx.fillStyle = '#e0b0ff';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const fade = 1 - this.collapseTime / this.collapseDuration;
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#b668ff';
      ctx.shadowColor = '#8e24aa';
      ctx.shadowBlur = 30 * fade;
      ctx.beginPath();
      ctx.arc(this.x, baseY, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class InfernoRampageSpell {
  constructor(startX, z, facing, team) {
    this.x = startX;
    this.z = z;
    this.facing = facing;
    this.team = team;
    this.speed = 520;
    this.life = 1.8;
    this.isFinished = false;
    this.trailTimer = 0;
    this.damageTicked = 0;
    this.width = 60;
  }
  get y() { return groundYForDepth(this.z); }

  update(dt, gameWorld) {
    this.x += this.facing * this.speed * dt;
    this.life -= dt;
    this.trailTimer += dt;
    this.damageTicked += dt;
    combat.spawnElementalParticles(this.x, this.y - 25, 'ignis', 3);
    combat.spawnElementalParticles(this.x - this.facing * 20, this.y - 15, 'ignis', 2);
    if (this.trailTimer >= 0.06) {
      this.trailTimer = 0;
      combat.spawnHitSparks(this.x - this.facing * 30, this.y - 20, this.facing, '#ff6f3b', 3);
    }
    if (this.damageTicked >= 0.12) {
      this.damageTicked = 0;
      const targets = gameWorld.getHostileTargets(this.team);
      for (const t of targets) {
        const dx = Math.abs(t.x - this.x);
        const dz = Math.abs(t.z - this.z) * 150;
        if (dx < this.width * (this.quality?.area ?? 1) && dz < 60) {
          t.takeDamage(16 * (this.quality?.power ?? 1), this.facing * 200, 140, 0.2, false, 'spell');
          combat.spawnHitSparks(t.x, t.y - 20, this.facing, '#ff9100', 6);
          combat.spawnElementalParticles(t.x, t.y - 25, 'ignis', 4);
        }
      }
    }
    if (this.life <= 0) {
      combat.spawnShockwave(this.x, this.y - 25, 70, '#ff6f3b');
      combat.shakeCamera(8, 0.3);
      this.isFinished = true;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const baseY = this.y - 25;
    const t = performance.now() * 0.008;
    const fade = Math.min(1, this.life * 2);
    const headR = 28 + Math.sin(t * 4) * 6;
    const hg = ctx.createRadialGradient(this.x, baseY, 0, this.x, baseY, headR);
    hg.addColorStop(0, `rgba(255,255,200,${fade})`);
    hg.addColorStop(0.3, `rgba(255,150,50,${fade * 0.9})`);
    hg.addColorStop(0.7, `rgba(255,80,20,${fade * 0.6})`);
    hg.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(this.x, baseY, headR * 1.3, 0, Math.PI * 2);
    ctx.fill();
    const trailLen = 90;
    for (let i = 0; i < 5; i++) {
      const tx = this.x - this.facing * (20 + i * trailLen / 5);
      const ty = baseY + Math.sin(t * 6 + i) * 8;
      const tr = 18 - i * 3;
      const alpha = fade * (1 - i * 0.18);
      ctx.fillStyle = i % 2 === 0 ? `rgba(255,111,59,${alpha})` : `rgba(255,200,50,${alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(tx, ty, tr, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 9; i++) {
      const angle = t * 3 + i * 0.7;
      const dist = headR + Math.sin(angle * 2) * 12;
      const sx = this.x + Math.cos(angle) * dist * 0.8;
      const sy = baseY + Math.sin(angle) * dist * 0.4;
      ctx.fillStyle = `rgba(255,235,59,${fade * 0.6})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ----------------------------------------------------
// DUAL COMBINATIONS (High Value Systemic Magic)
// ----------------------------------------------------

class FirestormSpell {
  constructor(startX, z, facing, team) {
    this.x = startX;
    this.z = z;
    this.vx = facing * 180; // Sweeps steadily across lane
    this.facing = facing;
    this.team = team;
    this.width = 90;
    this.height = 140;
    this.life = 4.2;
    this.isFinished = false;
    this.tickTimer = 0;
  }
  get y() { return groundYForDepth(this.z); }

  update(dt, gameWorld) {
    this.x += this.vx * dt;
    this.life -= dt;
    this.tickTimer += dt;

    // Atmospheric roar particles
    combat.spawnElementalParticles(this.x, this.y - 40, 'ignis', 4);
    combat.spawnElementalParticles(this.x, this.y - 40, 'ventus', 4);

    // Gravitational SUCK & BURN
    const targets = gameWorld.getHostileTargets(this.team);
    for (const t of targets) {
      const dx = this.x - t.x;
      const dz = this.z - t.z;
      const dist = Math.hypot(dx, dz * 150);

      if (dist < 180 * this.quality.area) {
        // Pull inwards into the tornado eye!
        const safeDist = Math.max(1, dist);
        t.vx += (dx / safeDist) * 350 * this.quality.power * dt;
        t.vElevation += 160 * this.quality.power * dt; // Lift up into the air!

        // Continuous burn ticks
        if (this.tickTimer >= 0.15 && dist < 100 * this.quality.area) {
          t.takeDamage(12 * this.quality.power, this.facing * 40, 120, 0.2, false, 'spell');
          combat.spawnHitSparks(t.x, t.y - 20, this.facing, '#ff9100', 4);
        }
      }
    }

    if (this.tickTimer >= 0.15) this.tickTimer = 0;

    if (this.life <= 0) {
      // Final explosive blast
      combat.shakeCamera(8, 0.3);
      combat.spawnShockwave(this.x, this.y - 40, 100, '#ff6d00');
      this.isFinished = true;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Swirling multi-layer fire vortex
    const time = performance.now() * 0.005;
    const numRings = 7;
    for (let i = 0; i < numRings; i++) {
      const ringY = this.y - i * 18;
      const ringW = 20 + i * 10;
      const offsetAngle = time + i * 0.6;
      const shiftX = Math.sin(offsetAngle) * 12;

      ctx.strokeStyle = i % 2 === 0 ? '#ff6d00' : '#ffd000';
      ctx.lineWidth = 4 + (numRings - i);
      ctx.beginPath();
      ctx.ellipse(this.x + shiftX, ringY, ringW, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class MeteorSpell {
  constructor(targetX, targetZ, team) {
    this.targetX = targetX;
    this.targetZ = targetZ;
    this.targetY = groundYForDepth(targetZ);
    this.team = team;
    this.x = targetX - 160;
    this.y = this.targetY - 450;
    this.vx = 320;
    this.vy = 850;
    this.isLanded = false;
    this.craterLife = 3.5;
    this.isFinished = false;
    this.damageDone = false;
    // Heavy falling object (concept doc §7.1): beams block on it, slow it
    // and chip its structure; only enough beam pressure shatters it.
    this.isHeavyObject = true;
    this.structureHp = 50;
    this.beamSlow = 1;
  }

  get heightAboveGround() { return this.targetY - this.y; }

  takeBeamDamage(amount) {
    if (this.isLanded || this.isFinished) return;
    this.beamSlow = .55;
    this.structureHp -= amount;
    if (this.structureHp > 0) return;
    this.isFinished = true;
    combat.shakeCamera(8, .3);
    combat.spawnShockwave(this.x, this.y, 70, '#ffab40');
    combat.spawnHitSparks(this.x, this.y, 1, '#ffd180', 22);
    combat.spawnElementalParticles(this.x, this.y, 'ignis', 18);
  }

  update(dt, gameWorld) {
    if (!this.isLanded) {
      this.x += this.vx * dt * this.beamSlow;
      this.y += this.vy * dt * this.beamSlow;
      this.beamSlow = 1;
      combat.spawnElementalParticles(this.x, this.y, 'ignis', 6);

      if (this.y >= this.targetY - 10) {
        this.isLanded = true;
        this.y = this.targetY;
        environment.add('crater', this.targetX, this.targetZ, { radius: 72 * (this.quality?.area ?? 1) });
        environment.add('lava', this.targetX, this.targetZ, { radius: 42 * (this.quality?.area ?? 1), team: this.team });
        audio.playSpell('meteor');
        combat.shakeCamera(14, 0.6);
        combat.spawnShockwave(this.x, this.y, 140, '#ff3d00');
        combat.spawnHitSparks(this.x, this.y, 1, '#ffeb3b', 30);
      }
    } else {
      // Crater phase
      this.craterLife -= dt;

      if (!this.damageDone) {
        this.damageDone = true;
        const targets = gameWorld.getHostileTargets(this.team);
        for (const t of targets) {
          const dist = Math.hypot(t.x - this.targetX, (t.z - this.targetZ) * 150);
          if (dist < 150 * this.quality.area) {
            t.takeDamage(120 * this.quality.power, (t.x > this.targetX ? 1 : -1) * 450, 350, 0.7, false, 'spell');
          }
        }
      }

      // Lingering magma burn
      if (Math.random() < 0.3) {
        combat.spawnElementalParticles(this.targetX + (Math.random() * 80 - 40), this.targetY, 'ignis', 2);
      }

      if (this.craterLife <= 0) this.isFinished = true;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (!this.isLanded) {
      ctx.fillStyle = '#ff3d00';
      ctx.shadowColor = '#ffd000';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 24, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Burning magma crater
      ctx.fillStyle = 'rgba(255, 61, 0, 0.6)';
      ctx.beginPath();
      ctx.ellipse(this.targetX, this.targetY, 70, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class TempestBlitzSpell {
  constructor(caster, gameWorld, quality = RUNE_GRADE_PROFILES.B) {
    this.isFinished = false;
    this.life = 0.3;
    const facing = caster.facing;
    const startX = caster.x;
    const unclampedEndX = caster.x + facing * 420;
    // Dungeon rooms scroll far past the arena width: respect the room walls.
    const bounds = gameWorld.battlefield.boundsOverride ?? gameWorld.battlefield.playableBounds;
    const endX = Math.max(bounds.left, Math.min(bounds.right, unclampedEndX));

    // Instant blink dash
    caster.x = endX;
    caster.invulnerableTimer = 0.4;
    audio.playSpell('fulgur');
    combat.shakeCamera(8, 0.25);
    combat.spawnShockwave(startX, caster.y - 20, 50, '#00e5ff');
    combat.spawnShockwave(endX, caster.y - 20, 60, '#00e5ff');

    // Slash all enemies between startX and endX
    const targets = gameWorld.getHostileTargets(caster.team);
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);

    for (const t of targets) {
      if (t.x >= minX && t.x <= maxX && Math.abs(t.z - caster.z) < 0.2) {
        t.takeDamage(75 * quality.power, facing * 350, 180, 0.6, false, 'spell');
        combat.spawnHitSparks(t.x, t.y - 25, facing, '#00e5ff', 16);
      }
    }

    this.startX = startX;
    this.endX = endX;
    this.y = caster.y - 20;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.isFinished = true;
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#00e5ff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.startX, this.y);
    ctx.lineTo(this.endX, this.y);
    ctx.stroke();
    ctx.restore();
  }
}

class MagmaFissureSpell {
  constructor(startX, z, facing, team) {
    this.x = startX + facing * 80;
    this.z = z;
    this.team = team;
    this.life = 3.5;
    this.isFinished = false;
    this.tick = 0;
  }
  get y() { return groundYForDepth(this.z); }

  update(dt, gameWorld) {
    this.life -= dt;
    this.tick += dt;

    if (Math.random() < 0.4) {
      combat.spawnElementalParticles(this.x + (Math.random() * 90 - 45), this.y, 'ignis', 3);
    }

    if (this.tick >= 0.25) {
      this.tick = 0;
      const targets = gameWorld.getHostileTargets(this.team);
      for (const t of targets) {
        if (Math.abs(t.x - this.x) < 60 * this.quality.area && Math.abs(t.z - this.z) < 0.18 * this.quality.area) {
          t.takeDamage(18 * this.quality.power, 0, 80, 0.2, false, 'spell');
        }
      }
    }

    if (this.life <= 0) this.isFinished = true;
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255, 60, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 60, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class SandstormBastionSpell {
  constructor(caster) {
    this.caster = caster;
    this.team = caster.team;
    this.x = caster.x;
    this.z = caster.z;
    this.radius = 105;
    this.life = 2.6;
    this.tickTimer = 0;
    this.isFinished = false;
  }
  get y() { return groundYForDepth(this.z) - 28; }

  update(dt, gameWorld) {
    this.life -= dt;
    this.tickTimer -= dt;
    this.x = this.caster.x;
    this.z = this.caster.z;

    combat.spawnElementalParticles(this.x + (Math.random() * 80 - 40), this.y, 'terra', 2);
    combat.spawnElementalParticles(this.x + (Math.random() * 80 - 40), this.y, 'ventus', 2);

    // The bastion is a short-lived tactical guard that erases hostile lane shots.
    for (const projectile of gameWorld.projectiles) {
      if (projectile.team !== this.team && Math.hypot(projectile.x - this.x, (projectile.z - this.z) * 150) < this.radius) {
        projectile.life = 0;
        combat.spawnShockwave(projectile.x, groundYForDepth(projectile.z) - 20, 18, '#ffd54f');
      }
    }

    if (this.tickTimer <= 0) {
      this.tickTimer = 0.38;
      const targets = gameWorld.getHostileTargets(this.team);
      for (const target of targets) {
        const dx = target.x - this.x;
        if (Math.hypot(dx, (target.z - this.z) * 150) < this.radius) {
          target.takeDamage(14 * this.quality.power, Math.sign(dx || 1) * 240, 80, 0.18, false, 'spell');
        }
      }
    }

    if (this.life <= 0) this.isFinished = true;
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255, 214, 96, 0.82)';
    ctx.shadowColor = '#b2ffff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

class BlizzardSurgeSpell {
  constructor(startX, z, facing, team) {
    this.x = startX;
    this.z = z;
    this.vx = facing * 240;
    this.team = team;
    this.life = 2.5;
    this.tickTimer = 0;
    this.isFinished = false;
  }
  get y() { return groundYForDepth(this.z) - 30; }

  update(dt, gameWorld) {
    this.x += this.vx * dt;
    this.life -= dt;
    this.tickTimer -= dt;

    combat.spawnElementalParticles(this.x, this.y, 'aqua', 4);

    const targets = gameWorld.getHostileTargets(this.team);
    for (const t of targets) {
      if (Math.abs(t.x - this.x) < 80 * this.quality.area && Math.abs(t.z - this.z) < 0.22 * this.quality.area) {
        if (this.tickTimer <= 0) t.takeDamage(8 * this.quality.power, 0, 0, 0.1, false, 'spell');
        t.slow?.(1.5 * this.quality.duration, 0.35); // Structures take damage but cannot be slowed.
      }
    }
    if (this.tickTimer <= 0) this.tickTimer = 0.25;

    if (this.life <= 0) this.isFinished = true;
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(128, 216, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// A compact authored barrier rather than a generic physics framework.  It is
// deliberately wide across depth and narrow across x so it reads as a wall
// laid across the 2.5D battlefield.
function shade(hex, k) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

class StoneWallSpell {
  constructor(x, z, team, surfaceHeight = 0, options = {}) {
    this.x = x;
    this.z = z;
    this.team = team;
    this.surfaceHeight = surfaceHeight;
    this.halfX = options.halfX ?? 16;
    this.halfZ = options.halfZ ?? 0.24;
    this.wallHeight = options.wallHeight ?? 88;
    this.life = options.life ?? 3.8;
    this.color = options.color ?? '#4e342e';
    this.isStoneWall = true;
    this.isPillar = !!options.isPillar;
    this.blocksMovement = true;
    this.blocksProjectiles = true;
    this.isFinished = false;
    // Walls are destructible: hostile melee, spells and projectiles wear
    // them down; they stand until broken (or their long lifetime ends).
    this.maxHp = this.hp = options.hp ?? 140;
    this.hitFlash = 0;
    this.hitRadiusX = this.halfX;
    this.hitHeightTolerance = this.wallHeight + 40;
    this.worldHeight = this.surfaceHeight;
  }

  get isDead() { return this.isFinished || this.hp <= 0; }

  takeDamage(amount) {
    if (this.isDead || !(amount > 0)) return;
    this.hp -= amount;
    this.hitFlash = .1;
    combat.spawnHitSparks(this.x, this.y - this.wallHeight * .5, 1, '#c7b299', 4);
    if (this.hp <= 0) this.life = 0;
  }
  get y() { return groundYForDepth(this.z) - this.surfaceHeight; }

  blocksProjectile(projectile) {
    if (projectile.team === this.team || projectile.life <= 0) return false;
    const sameX = Math.abs(projectile.x - this.x) <= this.halfX + (projectile.radius ?? 4);
    const sameZ = Math.abs(projectile.z - this.z) <= this.halfZ + .03;
    return sameX && sameZ && (projectile.height ?? 0) <= this.surfaceHeight + this.wallHeight + 18;
  }

  update(dt, gameWorld) {
    this.life -= dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    for (const projectile of gameWorld.projectiles) {
      if (!this.blocksProjectile(projectile)) continue;
      projectile.life = 0;
      combat.spawnHitSparks(projectile.x, groundYForDepth(projectile.z) - 20, projectile.facing ?? 1, '#c7b299', 8);
      combat.spawnShockwave(projectile.x, groundYForDepth(projectile.z) - 20, 18, '#8d6e63');
    }
    if (this.life <= 0) {
      this.isFinished = true;
      combat.spawnDust(this.x, this.y, 10);
      environment.add('rubble', this.x, this.z, { radius: Math.max(24, this.halfX + 10), life: 4 });
    }
  }

  render(ctx) {
    const fade = Math.min(1, this.life / .45);
    // A stone block: front face at the near edge, a lit top face behind it.
    const front = groundYForDepth(this.z + this.halfZ) - this.surfaceHeight;
    const back = groundYForDepth(this.z - this.halfZ) - this.surfaceHeight;
    const h = this.wallHeight;
    const left = this.x - this.halfX; const width = this.halfX * 2;
    ctx.save();
    ctx.globalAlpha = Math.max(.18, fade);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3e2723';
    ctx.fillStyle = this.hitFlash > 0 ? '#efebe9' : shade(this.color, 1.35);
    ctx.fillRect(left, back - h, width, front - back);
    ctx.strokeRect(left, back - h, width, front - back);
    ctx.fillStyle = this.hitFlash > 0 ? '#d7ccc8' : this.color;
    ctx.fillRect(left, front - h, width, h);
    ctx.strokeRect(left, front - h, width, h);
    // Masonry lines and cracks that grow with damage.
    ctx.strokeStyle = 'rgba(215, 204, 200, .55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(left + 3, front - h * .55); ctx.lineTo(left + width - 3, front - h * .55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(this.x, front - h * .55); ctx.lineTo(this.x, front - h * .2); ctx.stroke();
    if (this.hp < this.maxHp * .6) {
      ctx.strokeStyle = 'rgba(20, 10, 5, .7)';
      ctx.beginPath(); ctx.moveTo(left + 4, front - h * .9); ctx.lineTo(this.x - 2, front - h * .62); ctx.lineTo(this.x + 4, front - h * .35); ctx.stroke();
    }
    ctx.restore();
  }
}

class SummonedCreature extends GroundEntity {
  constructor(x, z, team, surfaceHeight, definition, quality, spriteManager = null) {
    super(x, z);
    this.team = team; this.surfaceHeight = surfaceHeight; this.grounded = true;
    this.definition = definition; this.quality = quality;
    this.maxHp = Math.round(definition.hp * quality.power); this.hp = this.maxHp;
    this.duration = definition.duration * quality.duration;
    this.speed = definition.speed; this.attackRange = definition.attackRange * quality.area;
    this.damage = definition.damage * quality.power; this.attackCooldown = definition.attackCooldown;
    this.attackTimer = .25; this.radius = definition.radius; this.width = definition.radius * 2;
    this.isMobileCombatant = true; this.isSummon = true; this.isDead = false;
    this.isFlying = definition.isFlying === true;
    this.rider = null;
    this.target = null;
    this.animTime = 0; this.state = 'idle'; this.facing = team === 'blue' ? 1 : -1;
    this.spriteManager = spriteManager;
    this.riseTimer = 0; this.riseDuration = 0; this.hitFlash = 0;
    this.dismissed = false; this.burstDone = false;
  }

  // Replaced by a newer cast of the same kind: vanish without a burst.
  dismiss() {
    if (this.isDead) return;
    this.dismissed = true;
    this.rider?.dismount?.();
    this.rider = null;
    this.isDead = true;
    combat.spawnShockwave(this.x, this.y - 18, 34, this.definition.color);
    combat.spawnElementalParticles(this.x, this.y - 25, this.definition.particleElement ?? 'void', 10);
  }

  burst(gameWorld) {
    const burst = this.definition.burst;
    if (!burst || this.burstDone) return;
    this.burstDone = true;
    const scale = this.owner?.buildModifiers?.revenantBurst ?? 1;
    const radius = burst.radius * (this.quality?.area ?? 1);
    combat.spawnShockwave(this.x, this.y - 10, radius, '#9ccc65');
    combat.spawnElementalParticles(this.x, this.y - 20, 'terra', 16);
    combat.shakeCamera(8, .3);
    for (const target of gameWorld.getHostileTargets(this.team)) {
      if (target.isDead || target.lifeState === 'Dead' || target.isObjective) continue;
      if (groundDistance(this, target) > radius) continue;
      target.takeDamage(burst.damage * (this.quality?.power ?? 1) * scale, Math.sign(target.x - this.x || 1) * 260, 160, .4, false, 'spell');
    }
  }
  chooseTarget(gameWorld) {
    // A Hunter Bell (signature special) points own summons at marked enemy summons.
    if (this.priorityTarget && !this.priorityTarget.isDead && this.priorityTarget.team !== this.team) return this.priorityTarget;
    const candidates = gameWorld.getHostileTargets(this.team).filter((target) => !target.isDead && !target.isDestroyed);
    if (!candidates.length) return null;
    const sortNearest = (list) => list.sort((a, b) => groundDistance(this, a) - groundDistance(this, b));
    const mobile = candidates.filter((target) => target.isMobileCombatant);
    const structures = candidates.filter((target) => target.isObjective);
    if (this.definition.role === 'hunter') {
      // The Wolf is an assassin: it deliberately looks past the minion line
      // for a hostile Wizard, then falls back to the nearest mobile target.
      const wizard = sortNearest(mobile.filter((target) => target.heroKey));
      return wizard[0] ?? sortNearest(mobile)[0] ?? sortNearest(structures)[0];
    }
    if (this.definition.role === 'control') {
      // The spider is an anti-Wizard control summon. It can still fall back
      // to a minion or objective, but a nearby enemy caster is its tactical
      // priority instead of being hidden by incidental lane traffic.
      const wizard = sortNearest(mobile.filter((target) => target.heroKey));
      return wizard[0] ?? sortNearest(mobile)[0] ?? sortNearest(structures)[0];
    }
    if (this.definition.role === 'lane_control') {
      // The serpent does not tunnel straight for objectives. It keeps lane
      // pressure readable by disrupting the closest mobile group first.
      const nearby = sortNearest(mobile)[0];
      return nearby ?? sortNearest(structures)[0];
    }
    if (this.definition.role === 'vanguard') {
      // The Golem holds the front line when it encounters a defender, but
      // continues its siege push when the path is clear.
      const nearbyDefender = sortNearest(mobile)[0];
      if (nearbyDefender && groundDistance(this, nearbyDefender) < 118) return nearbyDefender;
      const structure = sortNearest(structures)[0];
      if (structure) return structure;
    }
    if (this.definition.role === 'siege') {
      const structure = candidates.filter((target) => target.isObjective).sort((a, b) => groundDistance(this, a) - groundDistance(this, b))[0];
      if (structure) return structure;
    }
    return candidates.sort((a, b) => groundDistance(this, a) - groundDistance(this, b))[0];
  }

  update(dt, gameWorld) {
    this.duration -= dt; this.attackTimer -= dt; this.animTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    // A revenant first claws its way out of the ground.
    if (this.riseTimer > 0) {
      this.riseTimer = Math.max(0, this.riseTimer - dt);
      this.state = 'idle';
      if (Math.random() < .5) combat.spawnDust(this.x, this.y, 1);
      return;
    }
    if (this.mimicKey && Math.random() < dt * 6) combat.spawnElementalParticles(this.x + (Math.random() - .5) * 20, this.y - 30 - Math.random() * 40, 'void', 1);
    if (this.duration <= 0) {
      this.rider?.dismount?.();
      this.rider = null;
      this.isDead = true; combat.spawnShockwave(this.x, this.y - 18, 32, this.definition.color); return;
    }
    // A rider owns this creature's locomotion. It remains a normal ground
    // entity (including ramps and falls) but pauses autonomous chasing and
    // attacks so the mount does not fight against the player's input.
    if (this.rider?.isAlive) {
      this.target = null;
      this.vx = 0; this.vz = 0;
      this.state = this.rider.state === 'run' ? 'run' : 'idle';
      return;
    }
    this.rider = null;
    if (!this.isFlying) this.integrateElevation(dt, 1350);
    if (this.priorityTarget && this.target !== this.priorityTarget && !this.priorityTarget.isDead) this.target = this.priorityTarget;
    if (!this.target || this.target.isDead || this.target.isDestroyed || this.target.team === this.team) this.target = this.chooseTarget(gameWorld);
    if (!this.target) {
      if (!this.isFlying) gameWorld.battlefield.resolveEntityCollision(this);
      return;
    }
    const distance = groundDistance(this, this.target);
    const previousX = this.x; const previousZ = this.z;
    if (distance <= this.attackRange + (this.target.radius ?? this.target.hitRadiusX ?? 18) * .25) {
      this.vx = this.vz = 0;
      if (this.attackTimer <= 0) {
        this.attackTimer = this.attackCooldown;
        const direction = Math.sign(this.target.x - this.x) || 1;
        this.facing = direction; this.state = 'attack';
        const isLaneControl = this.definition.role === 'lane_control';
        const savage = (this.mimicKey || this.bodyKey) ? sky.summonPower(this.team) : 1;
        this.target.takeDamage(this.damage * savage, direction * (this.definition.role === 'siege' ? 250 : isLaneControl ? 210 : 180), isLaneControl ? (this.definition.launch ?? 160) : 80, .22, false, 'summon');
        if (this.definition.role === 'control') {
          this.target.slow?.(this.definition.slowDuration * this.quality.duration, this.definition.slowFactor);
          combat.spawnShockwave(this.target.x, this.target.y - 18, 24, this.definition.color);
        }
        if (isLaneControl) {
          // A small depth displacement makes the launch a 2.5D crowd-control
          // tool rather than a purely horizontal knockback skin.
          this.target.vz += Math.sign((this.target.z ?? this.z) - this.z || .01) * .26;
          combat.spawnShockwave(this.target.x, this.target.y - 18, 34, this.definition.color);
        }
        combat.spawnSlashArc(this.x + direction * this.radius, this.y - 18, direction, { radius: this.radius + 12, color: this.definition.color, glow: this.definition.color, width: 4 });
        combat.spawnHitSparks(this.target.x, this.target.y - 20, direction, this.definition.color, 8);
      }
    } else {
      const dx = this.target.x - this.x; const dz = (this.target.z - this.z) * 150;
      const length = Math.max(1, Math.hypot(dx, dz));
      this.facing = Math.sign(dx) || this.facing; this.state = 'run';
      this.vx = dx / length * this.speed;
      this.vz = dz / length * this.speed / 150;
      this.x += this.vx * dt; this.z += this.vz * dt;
      gameWorld.resolveSpellObstacles(this, previousX, previousZ);
    }
    if (!this.isFlying) gameWorld.battlefield.resolveEntityCollision(this);
  }

  takeDamage(amount) {
    if (this.arcaneShield > 0) {
      const absorbed = Math.min(amount, this.arcaneShield);
      this.arcaneShield -= absorbed; amount -= absorbed;
      if (amount <= 0) return;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = .12;
    if (this.hp <= 0) {
      this.rider?.dismount?.();
      this.rider = null;
      this.isDead = true;
    }
  }

  // Doubles and revenants reuse a fighter's sprite: a doppelganger is the
  // caster's own silhouette in living shadow, a revenant a pale borrowed body.
  renderBorrowedBody(ctx) {
    const key = this.mimicKey ?? this.bodyKey;
    const manager = this.spriteManager;
    if (!key || !manager?.renderEntity || !manager.sprites?.[key]) return false;
    const height = this.mimicKey ? ENTITY_VISUALS.heroHeight : (this.bodyHeight ?? ENTITY_VISUALS.minionHeight);
    const rise = this.riseDuration > 0 ? 1 - this.riseTimer / this.riseDuration : 1;
    const state = this.state === 'attack' ? 'attack1' : this.state;
    ctx.save();
    if (rise < 1) {
      // Seal circle and a ground clip while the body rises.
      ctx.strokeStyle = `rgba(156,204,101,${.9 - rise * .5})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(this.x, this.y, 30, 9, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.rect(this.x - 120, this.y - 400, 240, 400); ctx.clip();
    }
    manager.renderEntity(ctx, key, this.x, this.y + (1 - rise) * height, {
      facing: this.facing, state, animTime: this.animTime, visualHeight: height, hitFlash: this.hitFlash > 0,
      tint: this.mimicKey ? 'rgba(28,6,54,.8)' : 'rgba(170,205,150,.55)', alpha: this.mimicKey ? .9 : 1
    });
    ctx.restore();
    const barY = this.y - height - 8;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(this.x - 18, barY, 36, 4); ctx.fillStyle = this.definition.color; ctx.fillRect(this.x - 18, barY, 36 * (this.hp / this.maxHp), 4); ctx.restore();
    return true;
  }

  render(ctx) {
    if (this.renderBorrowedBody(ctx)) return;
    const color = this.definition.color;
    const spriteKey = this.definition.spriteKey ?? this.definition.id;
    if (this.spriteManager?.renderSummon(ctx, spriteKey, this.x, this.y, { facing: this.facing, state: this.state, animTime: this.animTime, visualHeight: spriteKey === 'siege_golem' ? 84 : spriteKey === 'rune_snake' ? 90 : 58 })) {
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(this.x - 17, this.y - 64, 34, 4); ctx.fillStyle = color; ctx.fillRect(this.x - 17, this.y - 64, 34 * (this.hp / this.maxHp), 4); ctx.restore();
      return;
    }
    ctx.save(); ctx.translate(this.x, this.y - 20);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `${color}55`; ctx.beginPath(); ctx.arc(0, 0, this.radius + 9, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = color; ctx.strokeStyle = '#e8f7ff'; ctx.lineWidth = 2;
    if (this.definition.id === 'spirit_wolf') {
      ctx.beginPath(); ctx.moveTo(-this.radius, 8); ctx.lineTo(-4, -this.radius); ctx.lineTo(this.radius, -4); ctx.lineTo(this.radius - 3, 11); ctx.lineTo(-this.radius, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(4, -4, 4, 3);
    } else {
      ctx.fillStyle = '#5d4037'; ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2 + 12); ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2 + 12);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -this.radius * .25, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(-this.radius, this.radius + 16, this.radius * 2, 4); ctx.fillStyle = color; ctx.fillRect(-this.radius, this.radius + 16, this.radius * 2 * (this.hp / this.maxHp), 4);
    ctx.restore();
  }
}

class DragonInvocationSpell {
  constructor(caster, spriteManager = null) {
    this.team = caster.team; this.x = caster.x + caster.facing * 175; this.z = caster.z;
    this.y = groundYForDepth(this.z) - 180; this.life = 1.45; this.didBreathe = false; this.isFinished = false;
    this.facing = caster.facing; this.spriteManager = spriteManager;
  }
  update(dt, gameWorld) {
    this.life -= dt;
    if (!this.didBreathe && this.life <= .78) {
      this.didBreathe = true;
      const radius = 135 * this.quality.area;
      combat.shakeCamera(16, .55); combat.spawnShockwave(this.x, groundYForDepth(this.z), radius, '#ff5722');
      for (const target of gameWorld.getHostileTargets(this.team)) {
        if (groundDistance(this, target) <= radius && Math.abs((target.worldHeight ?? 0)) < 180) target.takeDamage(110 * this.quality.power, Math.sign(target.x - this.x || 1) * 430, 260, .65, true, 'spell');
      }
    }
    if (this.life <= 0) this.isFinished = true;
  }
  render(ctx) {
    if (this.spriteManager?.renderSummon(ctx, 'dragon', this.x, this.y + 46, { facing: this.facing, visualHeight: 170, alpha: Math.min(1, this.life * 3) })) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffe082'; ctx.shadowColor = '#ff5722'; ctx.shadowBlur = 18; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(this.x + this.facing * 35, this.y + 28); ctx.lineTo(this.x + this.facing * 112, groundYForDepth(this.z) - 12); ctx.stroke(); ctx.restore();
      return;
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ff7044'; ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.ellipse(this.x, this.y, 56, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(this.x - 45, this.y + 8); ctx.lineTo(this.x + 92, groundYForDepth(this.z) - 12); ctx.stroke(); ctx.restore();
  }
}

export const spells = new SpellSystem();
