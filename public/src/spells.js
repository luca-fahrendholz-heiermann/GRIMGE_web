// GRIMGE Prototype — Composable Spell System & Elemental Combinations
import { audio } from './audio.js';
import { combat } from './combat.js';
import { GroundEntity, groundDistance, groundYForDepth } from './world.js';

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

export class SpellSystem {
  constructor() {
    this.activeSpells = [];
    this.activeSummons = [];
  }

  // Determine which spell is formed by a given set of prepared runes
  resolveSpell(runes) {
    if (!runes || runes.length === 0) return null;

    const ids = runes.map(r => r.id).sort();
    const key = ids.join('+');

    // 1. Triple Rune Grand Combinations
    if (ids.length === 3) {
      if (key === 'bestia+terra+void') return { id: 'eidolon_mantle', name: 'EIDOLON MANTLE', tier: 3, manaCost: 45, cooldown: 18, color: '#b668ff', desc: 'Bestia, Earth and Void form a temporary spectral guardian around the Wizard: damage resistance, knockback resistance and empowered melee.' };
      // An original GRIMGE feral transformation: its nine rune-flame tails
      // evoke a legendary beast without borrowing a named character or form.
      if (key === 'bestia+ignis+void') return { id: 'ninefold_beast_form', name: 'NINEFOLD BEAST FORM', tier: 3, manaCost: 55, cooldown: 22, color: '#ff7a2f', desc: 'Bestia, Fire and Void awaken a short feral rune form: faster movement, savage melee and light damage resistance.' };
      if (key === 'bestia+ignis+ventus') return { id: 'dragon_invocation', name: 'INFERNO DRAGON INVOCATION', tier: 3, manaCost: 70, color: '#ff7043', desc: 'Bestia, Fire and Wind call a temporary fire dragon to scorch a battlefield zone.' };
      if (key === 'bestia+terra+ventus') return { id: 'summon_rune_snake', name: 'WORLD RUNE SERPENT', tier: 3, manaCost: 48, color: '#b668ff', desc: 'A mountable lane-control serpent that slithers through the fight and launches enemies upward.' };
      if (key === 'aqua+terra+ventus') return { id: 'summon_spirit_wolf', name: 'SPIRIT WOLF', tier: 3, manaCost: 32, color: '#80d8ff', desc: 'Summons a quick frost spirit that hunts nearby enemies.' };
      if (key === 'fulgur+terra+terra') return { id: 'summon_siege_golem', name: 'SIEGE GOLEM', tier: 3, manaCost: 46, color: '#a1887f', desc: 'Summons a slow, durable golem that presses objectives.' };
      if (key === 'fulgur+ignis+terra') return { id: 'dragon_invocation', name: 'DRAGON INVOCATION', tier: 3, manaCost: 70, color: '#ff7043', desc: 'Calls a temporary fire dragon to scorch a battlefield zone.' };
      if (key === 'fulgur+ignis+ventus') {
        return {
          id: 'apocalyptic_heavensurge',
          name: 'APOCALYPTIC HEAVENSURGE',
          tier: 3,
          color: '#ff3d00',
          desc: 'Cataclysmic storm of Fire, Wind, and Thunder engulfing the battlefield!'
        };
      }
      return {
        id: 'tri_elemental_burst',
        name: 'TRI-ELEMENTAL CONVERGENCE',
        tier: 3,
        color: '#e040fb',
        desc: 'Overwhelming release of three converged elemental forces!'
      };
    }

    // 2. Dual Rune Combinations
    if (ids.length === 2) {
      if (key === 'bestia+fulgur') return { id: 'summon_storm_wolf', name: 'STORM WOLF', tier: 2, manaCost: 26, color: '#ffd54f', desc: 'A lightning Hunter that bypasses the minion line to chase the Wizard.' };
      if (key === 'bestia+void') return { id: 'summon_void_spider', name: 'VOID SPIDER', tier: 2, manaCost: 34, color: '#d500f9', desc: 'A Control summon that entangles nearby enemies in slowing void webs.' };
      if (key === 'construct+terra') return { id: 'summon_rune_golem', name: 'RUNE GOLEM', tier: 2, manaCost: 38, color: '#b0bec5', desc: 'A durable Vanguard that binds defenders and marches on objectives.' };
      if (key === 'ignis+ventus') {
        return {
          id: 'firestorm',
          name: 'FIRESTORM VORTEX',
          tier: 2,
          color: '#ff6d00',
          desc: 'Raging flame tornado that pulls enemies in, burns, and launches them!'
        };
      }
      if (key === 'fulgur+ignis') {
        return {
          id: 'meteor_cataclysm',
          name: 'METEOR CATACLYSM',
          tier: 2,
          color: '#d50000',
          desc: 'Calls down a blazing meteor that creates an explosive magma crater!'
        };
      }
      if (key === 'fulgur+ventus') {
        return {
          id: 'tempest_blitz',
          name: 'TEMPEST BLITZ',
          tier: 2,
          color: '#00e5ff',
          desc: 'Transforms into lightning, dashing forward and slashing all enemies!'
        };
      }
      if (key === 'ignis+terra') {
        return {
          id: 'magma_fissure',
          name: 'MAGMA FISSURE',
          tier: 2,
          color: '#ff3d00',
          desc: 'Ruptures the earth with geysers of molten lava!'
        };
      }
      if (key === 'terra+ventus') {
        return {
          id: 'sandstorm_bastion',
          name: 'SANDSTORM BASTION',
          tier: 2,
          color: '#ffd600',
          desc: 'Swirling wall of stone and wind deflecting enemy attacks.'
        };
      }
      if (key === 'aqua+ventus') {
        return {
          id: 'blizzard_surge',
          name: 'BLIZZARD SURGE',
          tier: 2,
          color: '#80d8ff',
          desc: 'Freezing gale freezing minions and drastically slowing enemy lane push.'
        };
      }
      if (key === 'aqua+fulgur') {
        return { id: 'aura_shock', name: 'AURA SHOCK', tier: 2, manaCost: 20, cooldown: 3.5, color: '#b388ff', desc: 'Frost-lightning pulse blasting surrounding enemies away.' };
      }
      if (key === 'aqua+terra') {
        return { id: 'arcane_aegis', name: 'ARCANE AEGIS', tier: 2, manaCost: 30, cooldown: 8, color: '#b388ff', desc: 'A temporary protective aura that absorbs incoming damage.' };
      }
      if (key === 'terra+terra') {
        return { id: 'stone_wall', name: 'STONE WALL', tier: 2, manaCost: 25, color: '#8d6e63', desc: 'Raises a temporary earth wall that stops hostile movement and projectiles.' };
      }
    }

    // 3. Single Rune Base Spells
    const single = ids[0];
    switch (single) {
      case 'ignis':
        return { id: 'fireball', name: 'IGNIS FIREBALL', tier: 1, color: '#ff5722', desc: 'Explosive projectile burning enemies.' };
      case 'ventus':
        return { id: 'gale_blast', name: 'GALE SHOCKWAVE', tier: 1, color: '#00bcd4', desc: 'High-velocity wind wave knocking enemies back.' };
      case 'fulgur':
        return { id: 'chain_lightning', name: 'ARC LIGHTNING', tier: 1, color: '#ffeb3b', desc: 'Crackling bolt leaping between targets.' };
      case 'terra':
        return { id: 'stone_spikes', name: 'STONE SPIKES', tier: 1, color: '#795548', desc: 'Erupts jagged stone spikes from the ground.' };
      case 'aqua':
        return { id: 'frost_nova', name: 'FROST NOVA', tier: 1, color: '#00e5ff', desc: 'Freezes surrounding foes solid.' };
      case 'bestia':
        return { id: 'summon_lesser_beast', name: 'BEAST FAMILIAR', tier: 1, manaCost: 18, color: '#b388ff', desc: 'Summons a short-lived hunter familiar.' };
      case 'construct':
        return { id: 'construct_bulwark', name: 'CONSTRUCT BULWARK', tier: 1, manaCost: 16, color: '#b0bec5', desc: 'Raises a short physical barrier in front of the caster.' };
      case 'void':
        return { id: 'void_bolt', name: 'VOID BOLT', tier: 1, manaCost: 16, color: '#d500f9', desc: 'Fires a void projectile that slows the first target hit.' };
    }

    return null;
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
    this.activeSpells.push(spell);
    return spell;
  }

  getSummons(team = null) {
    return this.activeSummons.filter((summon) => !summon.isDead && (team == null || summon.team === team));
  }

  clearRuntime() {
    this.activeSpells = [];
    this.activeSummons = [];
  }

  summon(caster, definition, gameWorld, quality) {
    const existing = this.activeSummons.find((summon) => summon.team === caster.team && summon.definition.role === definition.role);
    if (existing) existing.isDead = true;
    const summon = new SummonedCreature(caster.x + caster.facing * 34, caster.z, caster.team, caster.surfaceHeight ?? 0, definition, quality, gameWorld.sprites);
    const mods = caster.buildModifiers ?? {};
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

  // Cast the resolved spell into the game world
  cast(caster, spellDef, gameWorld, quality = null) {
    if (!spellDef) return;
    const castQuality = this.applyCasterModifiers(caster, spellDef, quality);

    audio.playSpell(spellDef.id);
    combat.shakeCamera(spellDef.tier * 4 + 3, 0.3);

    const facing = caster.facing;
    const startX = caster.x + facing * 35;
    const startZ = caster.z;
    const startHeight = caster.worldHeight ?? 0;

    switch (spellDef.id) {
      case 'fireball': {
        this.addSpell(new FireballSpell(startX, startZ, facing, caster.team, startHeight), castQuality);
        break;
      }

      case 'gale_blast': {
        this.addSpell(new GaleBlastSpell(startX, startZ, facing, caster.team, startHeight), castQuality);
        break;
      }

      case 'chain_lightning': {
        this.addSpell(new ChainLightningSpell(startX, startZ, facing, caster.team, gameWorld, startHeight, castQuality), castQuality);
        break;
      }

      case 'stone_spikes': {
        this.addSpell(new StoneSpikesSpell(startX, startZ, facing, caster.team), castQuality);
        break;
      }

      case 'frost_nova': {
        this.addSpell(new FrostNovaSpell(caster.x, startZ, caster.team), castQuality);
        break;
      }

      case 'firestorm': {
        // High-value combo: fire tornado
        this.addSpell(new FirestormSpell(startX, startZ, facing, caster.team), castQuality);
        break;
      }

      case 'meteor_cataclysm': {
        // High-value combo: blazing meteor
        const targetX = caster.x + facing * 240;
        this.addSpell(new MeteorSpell(targetX, startZ, caster.team), castQuality);
        break;
      }

      case 'tempest_blitz': {
        // High-value combo: lightning dash
        this.addSpell(new TempestBlitzSpell(caster, gameWorld, castQuality), castQuality);
        break;
      }

      case 'magma_fissure': {
        this.addSpell(new MagmaFissureSpell(startX, startZ, facing, caster.team), castQuality);
        break;
      }

      case 'sandstorm_bastion': {
        this.addSpell(new SandstormBastionSpell(caster), castQuality);
        break;
      }

      case 'blizzard_surge': {
        this.addSpell(new BlizzardSurgeSpell(startX, startZ, facing, caster.team), castQuality);
        break;
      }

      case 'aura_shock': {
        this.castAuraShock(caster, gameWorld, castQuality);
        break;
      }

      case 'arcane_aegis': {
        this.castArcaneShield(caster, castQuality);
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
        this.castStoneWall(caster, gameWorld, castQuality);
        break;
      }

      case 'construct_bulwark': {
        this.castConstructBulwark(caster, gameWorld, castQuality);
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

      case 'tri_elemental_burst': {
        this.addSpell(new FireballSpell(startX, startZ, facing, caster.team, startHeight), castQuality);
        this.addSpell(new FireballSpell(startX, startZ, facing, caster.team, startHeight), castQuality);
        this.addSpell(new GaleBlastSpell(startX, startZ, facing, caster.team, startHeight), castQuality);
        this.addSpell(new ChainLightningSpell(startX, startZ, facing, caster.team, gameWorld, startHeight, castQuality), castQuality);
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

  castStoneWall(caster, gameWorld, quality = RUNE_GRADE_PROFILES.B) {
    // One wall per Wizard keeps the arena readable and prevents a deck cycle
    // from turning the brawler plane into a permanent maze.
    for (const spell of this.activeSpells) {
      if (spell.isStoneWall && spell.team === caster.team) spell.isFinished = true;
    }
    const offset = caster.facing * 78;
    const mods = caster.buildModifiers ?? {};
    const wall = this.addSpell(new StoneWallSpell(caster.x + offset, caster.z, caster.team, caster.surfaceHeight ?? 0, {
      halfZ: .24 * (mods.wallHp ?? 1), life: 3.8 * (mods.wallDuration ?? 1)
    }), quality);
    audio.playSpell('stone_spikes');
    combat.shakeCamera(5, 0.2);
    combat.spawnShockwave(wall.x, wall.y, 48 * quality.area, '#8d6e63');
    combat.spawnElementalParticles(wall.x, wall.y, 'terra', Math.round(18 * quality.particles));
    return wall;
  }

  castConstructBulwark(caster, gameWorld, quality = RUNE_GRADE_PROFILES.B) {
    for (const spell of this.activeSpells) {
      if (spell.isStoneWall && spell.team === caster.team) spell.isFinished = true;
    }
    const offset = caster.facing * 64;
    const wall = this.addSpell(new StoneWallSpell(caster.x + offset, caster.z, caster.team, caster.surfaceHeight ?? 0, {
      halfX: 12, halfZ: .18, wallHeight: 66, life: 2.25, color: '#90a4ae'
    }), quality);
    audio.playSpell('stone_spikes');
    combat.spawnShockwave(wall.x, wall.y, 38 * quality.area, '#b0bec5');
    combat.spawnElementalParticles(wall.x, wall.y, 'construct', Math.round(12 * quality.particles));
    return wall;
  }

  update(dt, gameWorld) {
    for (let i = this.activeSpells.length - 1; i >= 0; i--) {
      const spell = this.activeSpells[i];
      spell.update(dt, gameWorld);
      if (spell.isFinished) {
        this.activeSpells.splice(i, 1);
      }
    }
    for (let i = this.activeSummons.length - 1; i >= 0; i--) {
      const summon = this.activeSummons[i];
      summon.update(dt, gameWorld);
      if (summon.isDead) this.activeSummons.splice(i, 1);
    }
  }

  render(ctx) {
    for (const spell of this.activeSpells) {
      spell.render(ctx);
    }
    for (const summon of this.activeSummons) summon.render(ctx);
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
  }

  update(dt, gameWorld) {
    if (!this.isLanded) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      combat.spawnElementalParticles(this.x, this.y, 'ignis', 6);

      if (this.y >= this.targetY - 10) {
        this.isLanded = true;
        this.y = this.targetY;
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
    const bounds = gameWorld.battlefield.playableBounds;
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
    this.blocksMovement = true;
    this.blocksProjectiles = true;
    this.isFinished = false;
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
    for (const projectile of gameWorld.projectiles) {
      if (!this.blocksProjectile(projectile)) continue;
      projectile.life = 0;
      combat.spawnHitSparks(projectile.x, groundYForDepth(projectile.z) - 20, projectile.facing ?? 1, '#c7b299', 8);
      combat.spawnShockwave(projectile.x, groundYForDepth(projectile.z) - 20, 18, '#8d6e63');
    }
    if (this.life <= 0) {
      this.isFinished = true;
      combat.spawnDust(this.x, this.y, 10);
    }
  }

  render(ctx) {
    const fade = Math.min(1, this.life / .45);
    ctx.save();
    ctx.globalAlpha = Math.max(.18, fade);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#bcaaa4';
    ctx.lineWidth = 2;
    const depthPixels = this.halfZ * 150;
    ctx.beginPath();
    ctx.moveTo(this.x - this.halfX, this.y + depthPixels * .18);
    ctx.lineTo(this.x - this.halfX + 5, this.y - this.wallHeight);
    ctx.lineTo(this.x + this.halfX - 5, this.y - this.wallHeight);
    ctx.lineTo(this.x + this.halfX, this.y + depthPixels * .18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(215, 204, 200, .65)';
    ctx.beginPath(); ctx.moveTo(this.x - this.halfX + 6, this.y - this.wallHeight * .55); ctx.lineTo(this.x + this.halfX - 6, this.y - this.wallHeight * .55); ctx.stroke();
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
  }
  chooseTarget(gameWorld) {
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
        this.target.takeDamage(this.damage, direction * (this.definition.role === 'siege' ? 250 : isLaneControl ? 210 : 180), isLaneControl ? (this.definition.launch ?? 160) : 80, .22, false, 'summon');
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
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.rider?.dismount?.();
      this.rider = null;
      this.isDead = true;
    }
  }

  render(ctx) {
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
