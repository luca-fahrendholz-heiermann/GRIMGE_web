// GRIMGE Prototype — Composable Spell System & Elemental Combinations
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundDistance, groundYForDepth } from './world.js';

function withinHeight(target, sourceHeight, fallback = 110) {
  return Math.abs((target.worldHeight ?? 0) - sourceHeight) < (target.hitHeightTolerance ?? fallback);
}

export class SpellSystem {
  constructor() {
    this.activeSpells = [];
  }

  // Determine which spell is formed by a given set of prepared runes
  resolveSpell(runes) {
    if (!runes || runes.length === 0) return null;

    const ids = runes.map(r => r.id).sort();
    const key = ids.join('+');

    // 1. Triple Rune Grand Combinations
    if (ids.length === 3) {
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
    }

    return null;
  }

  // Cast the resolved spell into the game world
  cast(caster, spellDef, gameWorld) {
    if (!spellDef) return;

    audio.playSpell(spellDef.id);
    combat.shakeCamera(spellDef.tier * 4 + 3, 0.3);

    const facing = caster.facing;
    const startX = caster.x + facing * 35;
    const startZ = caster.z;
    const startHeight = caster.worldHeight ?? 0;

    switch (spellDef.id) {
      case 'fireball': {
        this.activeSpells.push(new FireballSpell(startX, startZ, facing, caster.team, startHeight));
        break;
      }

      case 'gale_blast': {
        this.activeSpells.push(new GaleBlastSpell(startX, startZ, facing, caster.team, startHeight));
        break;
      }

      case 'chain_lightning': {
        this.activeSpells.push(new ChainLightningSpell(startX, startZ, facing, caster.team, gameWorld, startHeight));
        break;
      }

      case 'stone_spikes': {
        this.activeSpells.push(new StoneSpikesSpell(startX, startZ, facing, caster.team));
        break;
      }

      case 'frost_nova': {
        this.activeSpells.push(new FrostNovaSpell(caster.x, startZ, caster.team));
        break;
      }

      case 'firestorm': {
        // High-value combo: fire tornado
        this.activeSpells.push(new FirestormSpell(startX, startZ, facing, caster.team));
        break;
      }

      case 'meteor_cataclysm': {
        // High-value combo: blazing meteor
        const targetX = caster.x + facing * 240;
        this.activeSpells.push(new MeteorSpell(targetX, startZ, caster.team));
        break;
      }

      case 'tempest_blitz': {
        // High-value combo: lightning dash
        this.activeSpells.push(new TempestBlitzSpell(caster, gameWorld));
        break;
      }

      case 'magma_fissure': {
        this.activeSpells.push(new MagmaFissureSpell(startX, startZ, facing, caster.team));
        break;
      }

      case 'sandstorm_bastion': {
        this.activeSpells.push(new SandstormBastionSpell(caster));
        break;
      }

      case 'blizzard_surge': {
        this.activeSpells.push(new BlizzardSurgeSpell(startX, startZ, facing, caster.team));
        break;
      }

      case 'aura_shock': {
        this.castAuraShock(caster, gameWorld);
        break;
      }

      case 'apocalyptic_heavensurge': {
        // Grand 3-rune combination
        this.activeSpells.push(new FirestormSpell(startX, startZ, facing, caster.team));
        const targetX = caster.x + facing * 280;
        this.activeSpells.push(new MeteorSpell(targetX, startZ, caster.team));
        this.activeSpells.push(new BlizzardSurgeSpell(startX + facing * 50, startZ, facing, caster.team));
        combat.shakeCamera(16, 0.8);
        break;
      }

      case 'tri_elemental_burst': {
        this.activeSpells.push(new FireballSpell(startX, startZ, facing, caster.team, startHeight));
        this.activeSpells.push(new FireballSpell(startX, startZ, facing, caster.team, startHeight));
        this.activeSpells.push(new GaleBlastSpell(startX, startZ, facing, caster.team, startHeight));
        this.activeSpells.push(new ChainLightningSpell(startX, startZ, facing, caster.team, gameWorld, startHeight));
        break;
      }
    }
  }

  castAuraShock(caster, gameWorld) {
    const radius = 112;
    const damage = 22;
    audio.playSpell('aura_shock');
    combat.shakeCamera(7, 0.18);
    combat.spawnShockwave(caster.x, caster.y - 28, radius, '#b388ff');
    combat.spawnElementalParticles(caster.x, caster.y - 28, 'fulgur', 24);

    let hitAny = false;
    for (const target of gameWorld.getHostileTargets(caster.team)) {
      if (target.isObjective || target.isDead || target.lifeState === 'Dead') continue;
      const dx = target.x - caster.x;
      const dz = (target.z - caster.z) * 150;
      const distance = Math.hypot(dx, dz);
      if (distance > radius || !withinHeight(target, caster.worldHeight, 88)) continue;
      const safeDistance = Math.max(1, distance);
      const push = 340 * (1 - distance / radius * 0.35);
      target.takeDamage(damage, (dx / safeDistance) * push, 90, 0.18);
      // `vz` is independent ground-plane depth momentum; Aura Shock is a
      // true radial 2.5D push rather than a horizontal-only hit.
      target.vz += (dz / safeDistance) * (push / 150);
      combat.spawnHitSparks(target.x, target.y - 24, Math.sign(dx) || caster.facing, '#d1c4ff', 10);
      hitAny = true;
    }
    if (hitAny) combat.triggerHitstop(3);
    return hitAny;
  }

  castArcaneShield(caster) {
    caster.arcaneShield = 90;
    caster.arcaneShieldTimer = 5;
    audio.playSpell('arcane_shield');
    combat.spawnShockwave(caster.x, caster.y - 32, 52, '#b388ff');
    combat.spawnElementalParticles(caster.x, caster.y - 30, 'fulgur', 18);
  }

  update(dt, gameWorld) {
    for (let i = this.activeSpells.length - 1; i >= 0; i--) {
      const spell = this.activeSpells[i];
      spell.update(dt, gameWorld);
      if (spell.isFinished) {
        this.activeSpells.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const spell of this.activeSpells) {
      spell.render(ctx);
    }
  }
}

// ----------------------------------------------------
// SPELL IMPLEMENTATIONS
// ----------------------------------------------------

class FireballSpell {
  constructor(x, z, facing, team, height = 0) {
    this.x = x;
    this.z = z;
    this.height = height;
    this.vx = facing * 620;
    this.vy = 0;
    this.facing = facing;
    this.team = team;
    this.radius = 16;
    this.life = 1.4;
    this.isFinished = false;
    this.damage = 65;
  }
  get y() { return groundYForDepth(this.z) - this.height - 30; }

  update(dt, gameWorld) {
    this.x += this.vx * dt;
    this.life -= dt;

    // Emit fire sparks
    combat.spawnElementalParticles(this.x, this.y, 'ignis', 3);

    // Collision check against hostile entities
    const targets = gameWorld.getHostileTargets(this.team);
    for (const t of targets) {
      const dist = groundDistance(this, t);
      if (dist < this.radius + (t.radius || t.hitRadiusX || 20) && withinHeight(t, this.height)) {
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
    combat.spawnShockwave(this.x, this.y, 65, '#ff5722');
    combat.spawnHitSparks(this.x, this.y, this.facing, '#ff9100', 16);

    // AoE Damage
    const targets = gameWorld.getHostileTargets(this.team);
    for (const t of targets) {
      const dist = groundDistance(this, t);
      // Structures are wider than fighters. A Fireball that legitimately
      // collides with the edge of a Tower must damage that Tower rather than
      // exploding just outside an unrelated smaller AoE radius.
      const impactRadius = 80 + (t.isObjective ? (t.hitRadiusX ?? 0) * 0.5 : 0);
      if (dist < impactRadius && withinHeight(t, this.height, 120)) {
        t.takeDamage(this.damage, this.facing * 380, 220, 0.4);
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.radius * 1.6);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#ff9100');
    grad.addColorStop(0.8, '#ff3d00');
    grad.addColorStop(1, 'rgba(255, 61, 0, 0)');
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
          t.takeDamage(35, this.facing * 600, 280, 0.6);
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
  constructor(x, z, facing, team, gameWorld, height = 0) {
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
        nearest.takeDamage(48, facing * 220, 120, 0.5);
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
            if (Math.abs(t.x - sp.x) < 32 && Math.abs(t.z - sp.z) < 0.16) {
              t.takeDamage(42, this.facing * 120, 420, 0.6); // Knock straight up
              combat.spawnElementalParticles(sp.x, sp.y, 'terra', 8);
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
          t.takeDamage(30, 0, 80, 0.4);
          t.freeze?.(2.5); // Structures take damage but cannot be frozen.
          combat.spawnElementalParticles(t.x, t.y - 20, 'aqua', 12);
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

      if (dist < 180) {
        // Pull inwards into the tornado eye!
        const safeDist = Math.max(1, dist);
        t.vx += (dx / safeDist) * 350 * dt;
        t.vElevation += 160 * dt; // Lift up into the air!

        // Continuous burn ticks
        if (this.tickTimer >= 0.15 && dist < 100) {
          t.takeDamage(12, this.facing * 40, 120, 0.2);
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
          if (dist < 150) {
            t.takeDamage(120, (t.x > this.targetX ? 1 : -1) * 450, 350, 0.7);
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
  constructor(caster, gameWorld) {
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
        t.takeDamage(75, facing * 350, 180, 0.6);
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
        if (Math.abs(t.x - this.x) < 60 && Math.abs(t.z - this.z) < 0.18) {
          t.takeDamage(18, 0, 80, 0.2);
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
          target.takeDamage(14, Math.sign(dx || 1) * 240, 80, 0.18);
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
      if (Math.abs(t.x - this.x) < 80 && Math.abs(t.z - this.z) < 0.22) {
        if (this.tickTimer <= 0) t.takeDamage(8, 0, 0, 0.1);
        t.slow?.(1.5, 0.35); // Structures take damage but cannot be slowed.
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

export const spells = new SpellSystem();
