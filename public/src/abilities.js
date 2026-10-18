// GRIMGE Prototype — Beam class, Beam Clash and Phase-5 ability archetypes.
//
// Mechanics and visuals are deliberately separate (concept doc §5): every
// beam runs through one BeamSpell controller (origin, direction, reach,
// tip, damage ticks, clash eligibility) while BEAM_VFX draws its own look.
// Collisions are always evaluated in world/ground coordinates, never from
// particles or the projected render.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundDistance, groundYForDepth } from './world.js';
import { environment } from './environment.js';

function withinHeight(target, sourceHeight, tolerance = 110) {
  return Math.abs((target.worldHeight ?? 0) - sourceHeight) < (target.hitHeightTolerance ?? tolerance);
}

function isCombatant(target) {
  return target && !target.isObjective && !target.isDead && target.lifeState !== 'Dead';
}

// ─────────────────────────────────────────────────────────────────────────
// BEAM
// ─────────────────────────────────────────────────────────────────────────

export const BEAM_PROFILES = Object.freeze({
  inferno: Object.freeze({ vfx: 'fire', element: 'ignis', color: '#ff6d00', core: '#fff3e0', glow: '#ff3d00', length: 430, width: 20, extendSpeed: 1500, chargeTime: .35, sustainTime: 1.4, tick: .2, damage: 14, knockback: 60, clashPower: 1.0 }),
  glacial: Object.freeze({ vfx: 'ice', element: 'aqua', color: '#80deea', core: '#e0f7fa', glow: '#00bcd4', length: 400, width: 18, extendSpeed: 1400, chargeTime: .35, sustainTime: 1.4, tick: .2, damage: 10, knockback: 30, slow: Object.freeze({ duration: .7, factor: .5 }), clashPower: 1.0 }),
  thunder: Object.freeze({ vfx: 'lightning', element: 'fulgur', color: '#ffeb3b', core: '#fffde7', glow: '#ffd600', length: 470, width: 14, extendSpeed: 2400, chargeTime: .2, sustainTime: 1.0, tick: .15, damage: 12, knockback: 50, clashPower: .95 }),
  null: Object.freeze({ vfx: 'void', element: 'void', color: '#d500f9', core: '#f3e5f5', glow: '#6a1b9a', length: 420, width: 20, extendSpeed: 1300, chargeTime: .4, sustainTime: 1.5, tick: .2, damage: 12, knockback: -70, clashPower: 1.05 }),
  radiant: Object.freeze({ vfx: 'light', element: 'lux', color: '#ffe082', core: '#ffffff', glow: '#ffca28', length: 450, width: 16, extendSpeed: 2000, chargeTime: .3, sustainTime: 1.2, tick: .18, damage: 12, knockback: 40, slow: Object.freeze({ duration: .5, factor: .6 }), clashPower: 1.0 }),
  annihilation: Object.freeze({ vfx: 'arcane', element: 'ignis', color: '#ff4cff', core: '#ffffff', glow: '#ff4cff', length: 480, width: 26, extendSpeed: 1600, chargeTime: 1.2, sustainTime: 1.6, tick: .2, damage: 22, knockback: 80, clashPower: 1.5 })
});

// Pure presentation: (ctx, beam, x0, y0, x1, y1, intensity) → draws one look.
const BEAM_VFX = {
  fire(ctx, beam, x0, y0, x1, y1, k) {
    const p = beam.profile;
    const t = performance.now() * 0.012;
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * (1.15 + Math.sin(t) * .12), p.glow, .55 * k);
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * .6, p.color, .85 * k);
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * .22, p.core, k);
    // Licking flame tongues along the body.
    ctx.fillStyle = `rgba(255,171,64,${.6 * k})`;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    for (let d = 0; d < len; d += 26) {
      const f = d / len;
      const fx = x0 + (x1 - x0) * f;
      const fy = y0 + (y1 - y0) * f - beam.width * .5 - Math.abs(Math.sin(t + d * .09)) * 9;
      ctx.beginPath(); ctx.arc(fx, fy, 3 + Math.abs(Math.sin(t * 1.3 + d)) * 3, 0, Math.PI * 2); ctx.fill();
    }
  },
  ice(ctx, beam, x0, y0, x1, y1, k) {
    const p = beam.profile;
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * 1.2, p.glow, .45 * k);
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * .55, p.color, .8 * k);
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * .18, p.core, k);
    // Crystalline shards on the beam edge.
    ctx.strokeStyle = `rgba(224,247,250,${.8 * k})`; ctx.lineWidth = 1.5;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    for (let d = 14; d < len; d += 34) {
      const f = d / len; const fx = x0 + (x1 - x0) * f; const fy = y0 + (y1 - y0) * f;
      ctx.beginPath(); ctx.moveTo(fx - 5, fy - beam.width * .5); ctx.lineTo(fx, fy - beam.width * .5 - 10); ctx.lineTo(fx + 5, fy - beam.width * .5); ctx.stroke();
    }
  },
  lightning(ctx, beam, x0, y0, x1, y1, k) {
    const p = beam.profile;
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * 1.4, p.glow, .3 * k);
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = -(y1 - y0) / len; const ny = (x1 - x0) / len;
    for (let strand = 0; strand < 3; strand++) {
      ctx.strokeStyle = strand === 0 ? p.core : p.color;
      ctx.lineWidth = strand === 0 ? 3 : 1.6;
      ctx.globalAlpha = k;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      const steps = Math.max(2, Math.floor(len / 22));
      for (let i = 1; i < steps; i++) {
        const f = i / steps; const jitter = (Math.random() - .5) * beam.width * 1.4;
        ctx.lineTo(x0 + (x1 - x0) * f + nx * jitter, y0 + (y1 - y0) * f + ny * jitter);
      }
      ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  void(ctx, beam, x0, y0, x1, y1, k) {
    const p = beam.profile;
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * 1.3, p.color, .45 * k);
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * .7, '#12001f', .9 * k, 'source-over');
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * .12, p.core, k);
    // Swirling void motes drifting back toward the caster.
    const t = performance.now() * 0.004;
    ctx.fillStyle = `rgba(234,128,252,${.7 * k})`;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    for (let i = 0; i < 8; i++) {
      const f = 1 - ((t + i / 8) % 1);
      ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + Math.sin(t * 6 + i) * beam.width * .6, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  },
  light(ctx, beam, x0, y0, x1, y1, k) {
    const p = beam.profile;
    const t = performance.now() * 0.01;
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * (1.6 + Math.sin(t) * .15), p.glow, .4 * k);
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * .7, p.color, .85 * k);
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * .25, p.core, k);
    // Glinting motes drift along the ray.
    ctx.fillStyle = `rgba(255,253,231,${.9 * k})`;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    for (let d = (t * 40) % 30; d < len; d += 30) {
      const f = d / len;
      ctx.fillRect(x0 + (x1 - x0) * f - 1.5, y0 + (y1 - y0) * f - beam.width * .6 + Math.sin(d + t) * 4, 3, 3);
    }
  },
  arcane(ctx, beam, x0, y0, x1, y1, k) {
    const p = beam.profile;
    const pulse = 1 + Math.sin(performance.now() * 0.015) * .2;
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * 1.3 * pulse, p.glow, .45 * k);
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * .6, '#ff99ff', .8 * k);
    drawBeamBody(ctx, x0, y0, x1, y1, beam.width * .25, p.core, k);
  }
};

function drawBeamBody(ctx, x0, y0, x1, y1, width, color, alpha, composite = 'lighter') {
  ctx.save();
  ctx.globalCompositeOperation = composite;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, width);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
}

// Aim → Charge → Fire/Sustain → [Clash] → Break/End (concept doc §5.1).
export class BeamSpell {
  constructor(caster, profileKey = 'inferno', spellId = 'inferno_beam') {
    this.isBeam = true;
    this.clashable = true;
    this.spellId = spellId;
    this.caster = caster;
    this.team = caster.team;
    this.profile = BEAM_PROFILES[profileKey] ?? BEAM_PROFILES.inferno;
    this.facing = caster.facing || 1;
    this.phase = 'charge';
    this.timer = 0;
    this.sustain = 0;
    this.tipDistance = 0;
    this.prevTipX = null;
    this.tickTimer = 0;
    this.width = this.profile.width; // addSpell scales width by area
    this.damage = this.profile.damage; // and damage by power
    this.clash = null;
    this.isFinished = false;
    this.endReason = null;
    this.blockedAtX = null;
  }

  get z() { return this.caster.z; }
  get originX() { return this.caster.x + this.facing * 30; }
  get sourceHeight() { return this.caster.worldHeight ?? 0; }
  get y() { return groundYForDepth(this.z) - this.sourceHeight - 28; }
  get maxLength() { return this.profile.length * (this.quality?.area ?? 1); }
  get power() { return this.profile.clashPower * (this.quality?.power ?? 1); }
  get isActive() { return this.phase === 'active' && !this.isFinished; }
  get tipX() {
    if (this.clash) return this.clash.contactX;
    if (this.blockedAtX != null) return this.blockedAtX;
    return this.originX + this.facing * this.tipDistance;
  }

  update(dt, gameWorld) {
    if (this.isFinished) return;
    if (!this.caster || this.caster.isAlive === false || this.caster.isDead) { this.end('caster'); return; }
    if (this.phase === 'charge') {
      // Aim/Charge: direction follows the caster; no damage yet.
      this.facing = this.caster.facing || this.facing;
      this.timer += dt;
      if (Math.random() < .6) combat.spawnElementalParticles(this.originX + (Math.random() - .5) * 26, this.y + (Math.random() - .5) * 26, this.profile.element, 1);
      if (this.timer >= this.profile.chargeTime) {
        this.phase = 'active';
        this.timer = 0;
        this.sustain = this.profile.sustainTime * (this.quality?.duration ?? 1);
        this.prevTipX = this.originX;
        combat.spawnShockwave(this.originX, this.y, 34, this.profile.color);
        audio.playImpact(true);
      }
      return;
    }
    // While locked in a clash the tip is pinned to the shared contact point
    // and the sustain clock is frozen; the clash coordinator ends the beam.
    if (this.clash) return;
    this.timer += dt;
    this.tipDistance = Math.min(this.maxLength, this.tipDistance + this.profile.extendSpeed * dt);
    this.blockedAtX = null;
    this.interactWithHeavyObjects(dt);
    this.tickTimer -= dt;
    if (this.tickTimer <= 0) {
      this.tickTimer = this.profile.tick;
      this.applyTick(gameWorld);
    }
    if (Math.random() < .5) combat.spawnElementalParticles(this.tipX, this.y, this.profile.element, 1);
    if (this.timer >= this.sustain) this.end('expired');
  }

  segmentBounds() {
    const a = this.originX; const b = this.tipX;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  // Beams mark the ground under their body: fire scorches, frost freezes,
  // lightning electrifies puddles. The look stays per element.
  markGround(gameWorld) {
    const { min, max } = this.segmentBounds();
    const x = min + Math.random() * (max - min);
    const element = this.profile.vfx;
    if (element === 'fire' || element === 'arcane') environment.add('scorch', x, this.z, { radius: 30, team: this.team });
    else if (element === 'ice') environment.add('ice', x, this.z, { radius: 40, team: this.team });
    else if (element === 'lightning') environment.electrify((min + max) / 2, this.z, (max - min) / 2, this.team, 8, gameWorld);
  }

  applyTick(gameWorld) {
    this.markGround(gameWorld);
    const { min, max } = this.segmentBounds();
    for (const t of gameWorld.getHostileTargets(this.team)) {
      if (t.x < min || t.x > max) continue;
      if (Math.abs((t.z ?? this.z) - this.z) > .2) continue;
      if (!t.isObjective && !withinHeight(t, this.sourceHeight, 100)) continue;
      t.takeDamage(this.damage, this.facing * this.profile.knockback, 30, .12, false, 'spell');
      if (this.profile.slow) t.slow?.(this.profile.slow.duration * (this.quality?.duration ?? 1), this.profile.slow.factor);
      combat.spawnHitSparks(t.x, (t.y ?? this.y) - 20, this.facing, this.profile.color, 4);
    }
  }

  // A heavy falling object is not erased by any beam: it has structure HP,
  // blocks the beam tip, is slowed and only shatters under enough pressure.
  interactWithHeavyObjects(dt) {
    for (const spell of this.system?.activeSpells ?? []) {
      if (!spell.isHeavyObject || spell.isFinished || spell.isLanded) continue;
      if (spell.ignoresBeam?.(this)) continue; // e.g. a friendly signature construct
      if (Math.abs((spell.targetZ ?? spell.z) - this.z) > .25) continue;
      if (spell.heightAboveGround > 260) continue;
      const { min, max } = this.segmentBounds();
      if (spell.x < min || spell.x > max) continue;
      this.blockedAtX = spell.x;
      spell.takeBeamDamage?.(this.damage / this.profile.tick * dt * 2 * this.profile.clashPower, this);
    }
  }

  end(reason = 'expired') {
    if (this.isFinished) return;
    this.isFinished = true;
    this.endReason = reason;
    if (this.phase === 'active') combat.spawnShockwave(this.tipX, this.y, 40, this.profile.color);
  }

  render(ctx) {
    ctx.save();
    if (this.phase === 'charge') {
      const t = Math.min(1, this.timer / this.profile.chargeTime);
      const r = 6 + t * 18;
      const g = ctx.createRadialGradient(this.originX, this.y, 0, this.originX, this.y, r * 1.6);
      g.addColorStop(0, this.profile.core); g.addColorStop(.45, this.profile.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.originX, this.y, r * 1.6, 0, Math.PI * 2); ctx.fill();
    } else if (!this.isFinished) {
      const fadeIn = Math.min(1, this.timer / .08);
      const fadeOut = this.clash ? 1 : Math.min(1, (this.sustain - this.timer) / .2);
      const k = Math.max(.2, Math.min(fadeIn, fadeOut));
      const endY = this.clash ? groundYForDepth(this.clash.contactZ) - this.clash.contactHeight - 28 : this.y;
      (BEAM_VFX[this.profile.vfx] ?? BEAM_VFX.arcane)(ctx, this, this.originX, this.y, this.tipX, endY, k);
      // Hand flare at the origin.
      ctx.globalCompositeOperation = 'lighter';
      const sg = ctx.createRadialGradient(this.originX, this.y, 0, this.originX, this.y, this.width);
      sg.addColorStop(0, this.profile.core); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(this.originX, this.y, this.width, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// BEAM CLASH (concept doc §6) — first playtest values from §6.2.
// ─────────────────────────────────────────────────────────────────────────

export const CLASH_TUNING = Object.freeze({
  duration: 6, pushFocusCost: 12, pushPressure: 25, pushCooldown: 1.2,
  perfectCounterPressure: 30, perfectCounterFocus: 6, closeCounterRelief: 10,
  maxCounterFocusBonuses: 2, windup: .5, perfectWindow: .18,
  movementFactor: .45, frontalDepth: .18, explosionRadius: 110, explosionDamage: 45,
  breakSingleHit: 30, stability: 100
});

// Tip-vs-tip, roughly frontal → clash. A tip that enters another beam's
// body (it was already past this caster when we fired) is side/body contact:
// both beams neutralise each other instead of starting a clash.
export function resolveBeamInteractions(spells, gameWorld) {
  const beams = spells.activeSpells.filter((s) => s.isBeam && s.isActive && !s.clash);
  const started = [];
  for (let i = 0; i < beams.length; i++) {
    for (let j = i + 1; j < beams.length; j++) {
      const a0 = beams[i]; const b0 = beams[j];
      if (a0.isFinished || b0.isFinished || a0.clash || b0.clash) continue;
      if (a0.team === b0.team || a0.facing === b0.facing) continue;
      if (Math.abs(a0.z - b0.z) > CLASH_TUNING.frontalDepth) continue;
      if (Math.abs(a0.sourceHeight - b0.sourceHeight) > 90) continue;
      // `a` points right (+1), `b` points left (-1).
      const a = a0.facing > 0 ? a0 : b0; const b = a === a0 ? b0 : a0;
      if (a.originX >= b.originX) continue; // pointing away from each other
      const crossedNow = a.tipX >= b.tipX;
      if (!crossedNow) continue;
      const crossedBefore = (a.prevTipX ?? a.originX) >= (b.prevTipX ?? b.originX);
      if (crossedBefore || !a.clashable || !b.clashable) {
        // Body contact / non-clashable: mutual neutralisation.
        const x = (a.tipX + b.tipX) / 2;
        combat.spawnShockwave(x, (a.y + b.y) / 2, 48, '#ffffff');
        combat.spawnHitSparks(x, (a.y + b.y) / 2, 1, a.profile.color, 10);
        a.end('neutralised'); b.end('neutralised');
        continue;
      }
      started.push(new BeamClash(a, b, gameWorld));
    }
  }
  for (const beam of spells.activeSpells) if (beam.isBeam) beam.prevTipX = beam.tipX;
  return started;
}

export class BeamClash {
  constructor(a, b, gameWorld) {
    // Pressure is stored from side A's perspective; +100 = A breaks through.
    const human = [a, b].find((beam) => beam.caster === gameWorld?.player) ?? null;
    this.sides = [a, b].map((beam, index) => ({
      beam, caster: beam.caster, sign: index === 0 ? 1 : -1, isHuman: beam === human,
      pushCooldown: 0, counterBonuses: 0, windup: null,
      aiTimer: 1.1 + Math.random() * .8, stability: CLASH_TUNING.stability, lastHp: beam.caster.hp
    }));
    this.gameWorld = gameWorld;
    this.time = 0;
    this.pressure = Math.max(-20, Math.min(20, (a.power - b.power) * 12));
    this.isFinished = false;
    this.result = null;
    this.flash = 0;
    a.clash = this; b.clash = this;
    a.caster.activeClash = this; b.caster.activeClash = this;
    a.caster.cancelSprint?.();
    b.caster.cancelSprint?.();
    this.updateContact();
    combat.shakeCamera(10, .4);
    combat.spawnShockwave(this.contactX, this.contactY, 70, '#ffffff');
    audio.playImpact(true);
    if (human) gameWorld?.showAnnouncement?.('BEAM CLASH! PUSH (DRAW / E) · COUNTER ON ⚠', 1.6);
  }

  get a() { return this.sides[0]; }
  get b() { return this.sides[1]; }
  get remaining() { return Math.max(0, CLASH_TUNING.duration - this.time); }
  get contactY() { return groundYForDepth(this.contactZ) - this.contactHeight - 28; }

  sideOf(caster) { return this.sides.find((side) => side.caster === caster) ?? null; }
  opponentOf(side) { return side === this.a ? this.b : this.a; }

  updateContact() {
    const ax = this.a.beam.originX; const bx = this.b.beam.originX;
    this.contactX = ax + (bx - ax) * (.5 + this.pressure / 200);
    this.contactZ = (this.a.beam.z + this.b.beam.z) / 2;
    this.contactHeight = (this.a.beam.sourceHeight + this.b.beam.sourceHeight) / 2;
  }

  addPressure(side, amount) {
    this.pressure = Math.max(-100, Math.min(100, this.pressure + side.sign * amount));
    this.flash = .25;
  }

  // Human input. Returns a short result label for tests / UI feedback.
  humanAction(caster) {
    if (this.isFinished) return 'finished';
    const side = this.sideOf(caster);
    if (!side) return 'none';
    const opponent = this.opponentOf(side);
    if (opponent.windup) {
      const remaining = opponent.windup.t;
      opponent.windup = null;
      if (remaining <= CLASH_TUNING.perfectWindow) {
        this.addPressure(side, CLASH_TUNING.perfectCounterPressure);
        if (side.counterBonuses < CLASH_TUNING.maxCounterFocusBonuses) {
          side.counterBonuses++;
          caster.focus = Math.min(caster.maxFocus ?? 100, (caster.focus ?? 0) + CLASH_TUNING.perfectCounterFocus);
        }
        combat.spawnShockwave(this.contactX, this.contactY, 60, '#fff59d');
        this.gameWorld?.showAnnouncement?.('PERFECT COUNTER!', .8);
        return 'perfect';
      }
      // Close timing: the opposing push still lands, softened.
      this.addPressure(opponent, CLASH_TUNING.pushPressure - CLASH_TUNING.closeCounterRelief);
      return 'close';
    }
    if (side.pushCooldown > 0) return 'cooldown';
    if ((caster.focus ?? 0) < CLASH_TUNING.pushFocusCost) {
      this.gameWorld?.showAnnouncement?.('NOT ENOUGH FOCUS TO PUSH', .7);
      return 'nofocus';
    }
    caster.focus -= CLASH_TUNING.pushFocusCost;
    side.pushCooldown = CLASH_TUNING.pushCooldown;
    let amount = CLASH_TUNING.pushPressure;
    // The AI occasionally answers with a (close) counter of its own.
    if (!opponent.isHuman && Math.random() < .3) amount -= CLASH_TUNING.closeCounterRelief;
    this.addPressure(side, amount);
    combat.spawnShockwave(this.contactX, this.contactY, 46, side.beam.profile.color);
    return 'push';
  }

  update(dt) {
    if (this.isFinished) return;
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt);
    for (const side of this.sides) {
      const caster = side.caster;
      if (side.beam.isFinished || caster.isAlive === false || caster.isDead) { this.abort(side, false); return; }
      // External interference: participants are not immune. Small hits
      // chip stability; a heavy hit, freeze or broken stability aborts.
      const damageTaken = Math.max(0, (side.lastHp ?? caster.hp) - caster.hp);
      side.lastHp = caster.hp;
      side.stability -= damageTaken * 2;
      if (damageTaken >= CLASH_TUNING.breakSingleHit || side.stability <= 0 || (caster.freezeTimer ?? 0) > 0) { this.abort(side, false); return; }
      // Guarding is the voluntary abort, with a short stagger as its price.
      if (caster.isGuarding) { this.abort(side, true); return; }
      side.pushCooldown = Math.max(0, side.pushCooldown - dt);
      if (side.windup) {
        side.windup.t -= dt;
        if (side.windup.t <= 0) { side.windup = null; this.addPressure(side, CLASH_TUNING.pushPressure); combat.spawnShockwave(this.contactX, this.contactY, 46, side.beam.profile.color); }
      } else if (!side.isHuman) {
        side.aiTimer -= dt;
        if (side.aiTimer <= 0 && side.pushCooldown <= 0) {
          side.windup = { t: CLASH_TUNING.windup };
          side.pushCooldown = CLASH_TUNING.pushCooldown;
          side.aiTimer = 1.5 + Math.random() * 1.1;
        }
      }
    }
    // Different base strength drifts the pressure without deciding it.
    this.pressure = Math.max(-100, Math.min(100, this.pressure + (this.a.beam.power - this.b.beam.power) * 4 * dt));
    this.updateContact();
    if (Math.random() < .8) combat.spawnHitSparks(this.contactX, this.contactY, Math.random() < .5 ? 1 : -1, Math.random() < .5 ? this.a.beam.profile.color : this.b.beam.profile.color, 2);
    if (Math.abs(this.pressure) >= 100) { this.breakthrough(this.pressure > 0 ? this.a : this.b); return; }
    if (this.time >= CLASH_TUNING.duration) this.collapse();
  }

  release(side) {
    const beam = side.beam;
    beam.clash = null;
    if (beam.isFinished) return;
    beam.tipDistance = Math.abs(this.contactX - beam.originX);
    beam.timer = Math.min(beam.timer, Math.max(0, beam.sustain - .7));
    beam.tickTimer = 0;
  }

  finish(result) {
    this.isFinished = true;
    this.result = result;
    for (const side of this.sides) {
      if (side.caster.activeClash === this) side.caster.activeClash = null;
      if (side.beam.clash === this) side.beam.clash = null;
    }
  }

  // Full 100 %: the winning beam pierces on and keeps dealing damage.
  breakthrough(winner) {
    const loser = this.opponentOf(winner);
    loser.beam.end('overpowered');
    combat.shakeCamera(14, .5);
    combat.spawnShockwave(this.contactX, this.contactY, 90, winner.beam.profile.color);
    this.release(winner);
    this.gameWorld?.showAnnouncement?.(winner.isHuman ? 'BREAKTHROUGH!' : loser.isHuman ? 'OVERPOWERED!' : 'BREAKTHROUGH', 1);
    this.finish({ type: 'breakthrough', winner: winner.caster.team });
  }

  // Timeout: no winner. Both beams discharge at the current contact point,
  // so a 75:25 clash explodes near the losing caster, 50:50 in the middle.
  collapse() {
    const x = this.contactX; const z = this.contactZ;
    const radius = CLASH_TUNING.explosionRadius * ((this.a.beam.quality?.area ?? 1) + (this.b.beam.quality?.area ?? 1)) / 2;
    const damage = CLASH_TUNING.explosionDamage * ((this.a.beam.quality?.power ?? 1) + (this.b.beam.quality?.power ?? 1)) / 2;
    const hit = new Set();
    for (const team of ['red', 'blue']) {
      for (const t of this.gameWorld?.getHostileTargets?.(team) ?? []) {
        if (hit.has(t) || !isCombatant(t)) continue;
        if (Math.hypot(t.x - x, ((t.z ?? z) - z) * 150) > radius) continue;
        hit.add(t);
        t.takeDamage(damage, Math.sign(t.x - x || 1) * 320, 260, .4, false, 'spell');
      }
    }
    this.a.beam.end('collapse'); this.b.beam.end('collapse');
    combat.shakeCamera(18, .6);
    combat.spawnShockwave(x, this.contactY, radius, '#ffffff');
    combat.spawnHitSparks(x, this.contactY, 1, this.a.beam.profile.color, 24);
    audio.playImpact(true);
    this.gameWorld?.showAnnouncement?.('CLASH COLLAPSE!', 1);
    this.finish({ type: 'collapse', x, hit: [...hit] });
  }

  abort(side, voluntary) {
    const other = this.opponentOf(side);
    side.beam.end(voluntary ? 'aborted' : 'interrupted');
    this.release(other);
    if (voluntary && side.caster.isAlive !== false) {
      side.caster.state = 'hurt';
      side.caster.stateTimer = Math.max(side.caster.stateTimer ?? 0, .35);
    }
    this.finish({ type: voluntary ? 'aborted' : 'interrupted', by: side.caster.team });
  }

  render(ctx) {
    if (this.isFinished) return;
    const x = this.contactX; const y = this.contactY;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = 26 + Math.sin(performance.now() * .03) * 6 + this.flash * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.4, this.a.beam.profile.color); g.addColorStop(.75, this.b.beam.profile.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Pressure bar + clock above the contact point.
    const w = 120; const bx = x - w / 2; const by = y - 64;
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(bx - 2, by - 2, w + 4, 12);
    const split = (this.pressure + 100) / 200;
    const leftSide = this.a.beam.originX <= this.b.beam.originX ? this.a : this.b;
    const leftShare = leftSide === this.a ? split : 1 - split;
    ctx.fillStyle = leftSide.beam.profile.color; ctx.fillRect(bx, by, w * leftShare, 8);
    ctx.fillStyle = this.opponentOf(leftSide).beam.profile.color; ctx.fillRect(bx + w * leftShare, by, w * (1 - leftShare), 8);
    ctx.fillStyle = '#fff'; ctx.fillRect(bx + w * leftShare - 1, by - 3, 2, 14);
    ctx.font = 'bold 11px Georgia'; ctx.textAlign = 'center';
    ctx.fillText(this.remaining.toFixed(1), x, by - 6);
    // Readable telegraph for an incoming opponent push.
    for (const side of this.sides) {
      if (!side.windup) continue;
      const c = side.caster;
      const cy = (c.y ?? groundYForDepth(c.z)) - 70;
      const perfect = side.windup.t <= CLASH_TUNING.perfectWindow;
      ctx.fillStyle = perfect ? '#fff59d' : '#ff5252';
      ctx.font = 'bold 22px Georgia';
      ctx.fillText('⚠', c.x, cy);
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(c.x, cy - 8, 18 + side.windup.t * 30, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PROJECTILE CAPTURE + RETURN VOLLEY (MIRROR WARD)
// ─────────────────────────────────────────────────────────────────────────

class VolleyBolt {
  constructor(x, z, height, facing, team, damage, color) {
    this.isCapturableProjectile = true;
    this.x = x; this.z = z; this.height = height; this.facing = facing; this.team = team;
    this.vx = facing * 700; this.damage = damage; this.color = color;
    this.life = 1.2; this.radius = 9; this.isFinished = false;
  }
  get y() { return groundYForDepth(this.z) - this.height - 30; }
  update(dt, gameWorld) {
    const previousX = this.x;
    this.x += this.vx * dt;
    this.life -= dt;
    if (this.life <= 0) { this.isFinished = true; return; }
    for (const t of gameWorld.getHostileTargets(this.team)) {
      const sx = Math.max(Math.min(previousX, this.x), Math.min(Math.max(previousX, this.x), t.x));
      if (Math.hypot(sx - t.x, ((t.z ?? this.z) - this.z) * 150) < this.radius + (t.radius || t.hitRadiusX || 20) && (t.isObjective || withinHeight(t, this.height))) {
        t.takeDamage(this.damage, this.facing * 220, 90, .25, false, 'spell');
        combat.spawnHitSparks(t.x, (t.y ?? this.y) - 18, this.facing, this.color, 8);
        this.isFinished = true;
        return;
      }
    }
  }
  render(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

export class MirrorWardSpell {
  constructor(caster) {
    this.caster = caster; this.team = caster.team;
    this.radius = 95; this.life = 3.2; this.capacity = 5;
    this.captured = []; this.volleyQueue = null; this.volleyTimer = 0; this.isFinished = false;
  }
  get x() { return this.caster.x; }
  get z() { return this.caster.z; }
  get y() { return groundYForDepth(this.z) - (this.caster.worldHeight ?? 0) - 30; }

  update(dt, gameWorld) {
    if (this.volleyQueue) {
      this.volleyTimer -= dt;
      if (this.volleyTimer <= 0 && this.volleyQueue.length) {
        const shot = this.volleyQueue.shift();
        const facing = this.caster.facing || 1;
        this.system?.addSpell(new VolleyBolt(this.caster.x + facing * 26, this.caster.z, (this.caster.worldHeight ?? 0) + 10, facing, this.team, shot.damage * 1.15, shot.color), this.quality);
        this.volleyTimer = .08;
      }
      if (!this.volleyQueue.length) this.isFinished = true;
      return;
    }
    this.life -= dt;
    // Capture hostile spell projectiles (Fireball, Void Bolt, Soul Seekers…)
    // and plain minion/tower shots inside the ward.
    for (const spell of this.system?.activeSpells ?? []) {
      if (this.captured.length >= this.capacity) break;
      if (!spell.isCapturableProjectile || spell.isFinished || spell.team === this.team) continue;
      if (Math.hypot(spell.x - this.x, ((spell.z ?? this.z) - this.z) * 150) > this.radius) continue;
      spell.isFinished = true;
      this.captured.push({ damage: spell.damage ?? 30, color: spell.midColor ?? spell.color ?? '#b2ebf2' });
      combat.spawnHitSparks(spell.x, spell.y ?? this.y, 1, '#b2ebf2', 6);
    }
    for (const p of gameWorld.projectiles ?? []) {
      if (this.captured.length >= this.capacity) break;
      if (p.team === this.team || p.life <= 0) continue;
      if (Math.hypot(p.x - this.x, ((p.z ?? this.z) - this.z) * 150) > this.radius) continue;
      p.life = 0;
      this.captured.push({ damage: p.damage ?? 18, color: '#80deea' });
    }
    if (this.life <= 0 || this.captured.length >= this.capacity) this.release();
  }

  release() {
    if (!this.captured.length) { this.isFinished = true; combat.spawnShockwave(this.x, this.y, 30, '#b2ebf2'); return; }
    this.volleyQueue = [...this.captured];
    this.volleyTimer = 0;
    combat.spawnShockwave(this.x, this.y, 60, '#e0f7fa');
    audio.playSpell('arcane_shield');
  }

  render(ctx) {
    if (this.volleyQueue) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 1 + Math.sin(performance.now() * .01) * .05;
    ctx.strokeStyle = 'rgba(178,235,242,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(this.x, this.y + 10, this.radius * pulse, this.radius * .45 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
    // Captured shots orbit the ward until the volley fires.
    const t = performance.now() * .004;
    this.captured.forEach((shot, i) => {
      const a = t + i * (Math.PI * 2 / this.capacity);
      ctx.fillStyle = shot.color;
      ctx.beginPath(); ctx.arc(this.x + Math.cos(a) * this.radius * .7, this.y + Math.sin(a) * this.radius * .3, 6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// TELEKINESIS (GRAVITY LIFT) — multi-target lift, hold, slam.
// ─────────────────────────────────────────────────────────────────────────

export class GravityLiftSpell {
  constructor(caster, gameWorld, target = null) {
    this.caster = caster; this.team = caster.team;
    this.centerX = target?.x ?? caster.x + (caster.facing || 1) * 90;
    this.z = target?.z ?? caster.z;
    const mods = caster.buildModifiers ?? {};
    this.radius = 170; this.maxTargets = 4 + Math.max(0, mods.liftTargets ?? 0);
    this.holdTime = 1.6 * (mods.liftHold ?? 1);
    this.phase = 'lift'; this.timer = 0; this.isFinished = false;
    this.damage = 30;
    this.targets = [];
    this.gameWorld = gameWorld;
    this.releaseKind = null;
    // While held, the caster's attack input decides the release.
    caster.activeTelekinesis = this;
    if (caster === gameWorld?.player) gameWorld.showAnnouncement?.('HOLDING — ATTACK: SLAM · FORWARD: THROW · BACK: PULL · UP: TOSS', 1.6);
  }

  // Release choices: slam (attack / down), throw (forward), pull (back),
  // toss (up). Without input the hold ends in a slam.
  release(kind = 'slam') {
    if (this.phase !== 'lift' && this.phase !== 'hold') return false;
    this.releaseKind = { normal: 'slam', dive: 'slam', heavy: 'throw', uppercut: 'toss', pull: 'pull' }[kind] ?? kind;
    this.phase = 'slam'; this.timer = 0;
    this.slam();
    return true;
  }
  get x() { return this.centerX; }
  get y() { return groundYForDepth(this.z) - 30; }

  pickTargets(gameWorld) {
    const candidates = gameWorld.getHostileTargets(this.team)
      .filter((t) => isCombatant(t) && 'freezeTimer' in t && !t.isMounted)
      .map((t) => ({ t, d: Math.hypot(t.x - this.centerX, ((t.z ?? this.z) - this.z) * 150) }))
      .filter((entry) => entry.d <= this.radius * (this.quality?.area ?? 1))
      .sort((p, q) => p.d - q.d)
      .slice(0, this.maxTargets);
    this.targets = candidates.map(({ t }) => ({ t, startElevation: t.elevation ?? 0 }));
  }

  update(dt, gameWorld) {
    if (this.timer === 0 && this.phase === 'lift') this.pickTargets(gameWorld);
    this.timer += dt;
    const hold = (height) => {
      for (const entry of this.targets) {
        const t = entry.t;
        if (!isCombatant(t)) continue;
        t.freezeTimer = Math.max(t.freezeTimer ?? 0, .12);
        t.grounded = false; t.vElevation = 0; t.vx = 0; t.vz = 0; t.kbVelX = 0;
        t.elevation = height + Math.sin(performance.now() * .008 + t.x) * 4;
      }
    };
    if (this.phase === 'lift') {
      hold(90 * Math.min(1, this.timer / .45));
      if (this.timer >= .45) { this.phase = 'hold'; this.timer = 0; }
    } else if (this.phase === 'hold') {
      hold(90);
      if (this.timer >= this.holdTime * (this.quality?.duration ?? 1)) this.release('slam');
    } else if (this.timer >= .35) this.finish();
  }

  finish() {
    this.isFinished = true;
    if (this.caster.activeTelekinesis === this) this.caster.activeTelekinesis = null;
  }

  slam() {
    const kind = this.releaseKind ?? 'slam';
    const facing = this.caster.facing || 1;
    for (const { t } of this.targets) {
      if (!isCombatant(t)) continue;
      t.freezeTimer = 0;
      if (kind === 'throw') t.takeDamage(this.damage * .8, facing * 620, 240, .5, false, 'spell');
      else if (kind === 'pull') t.takeDamage(this.damage * .5, Math.sign(this.caster.x - t.x || -facing) * 520, 140, .45, false, 'spell');
      else if (kind === 'toss') t.takeDamage(this.damage * .6, 0, 760, .6, false, 'spell');
      else {
        t.takeDamage(this.damage, 0, -420, .4, false, 'spell');
        environment.add('crack', t.x, t.z, { radius: 30 });
      }
      combat.spawnShockwave(t.x, groundYForDepth(t.z), 36, '#ce93d8');
    }
    if (this.caster.activeTelekinesis === this) this.caster.activeTelekinesis = null;
    combat.shakeCamera(9, .3);
    audio.playImpact(true);
  }

  render(ctx) {
    if (this.phase === 'slam') return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(206,147,216,.75)'; ctx.lineWidth = 2;
    const hx = this.caster.x + (this.caster.facing || 1) * 18;
    const hy = groundYForDepth(this.caster.z) - (this.caster.worldHeight ?? 0) - 42;
    for (const { t } of this.targets) {
      if (!isCombatant(t)) continue;
      const ty = (t.y ?? groundYForDepth(t.z)) - 22;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + t.x) / 2, Math.min(hy, ty) - 40, t.x, ty); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(t.x, ty + 4, 20, 7, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// AIR STOMP (TITAN STOMP) — vertical hitbox around the landing point.
// ─────────────────────────────────────────────────────────────────────────

export class TitanStompSpell {
  constructor(caster) {
    this.caster = caster; this.team = caster.team;
    this.timer = 0; this.isFinished = false; this.radius = 125; this.damage = 42;
    this.landed = false;
    if (caster.grounded !== false) {
      caster.grounded = false;
      caster.elevation = Math.max(caster.elevation ?? 0, 1);
      caster.vElevation = 560;
    } else caster.vElevation = -900;
    caster.cancelSprint?.();
  }
  get x() { return this.caster.x; }
  get z() { return this.caster.z; }
  get y() { return groundYForDepth(this.z); }

  update(dt, gameWorld) {
    this.timer += dt;
    const c = this.caster;
    // Past the apex the caster is driven down hard for a heavy landing.
    if (!this.landed && this.timer > .28 && (c.vElevation ?? 0) > -900) c.vElevation = Math.min(c.vElevation ?? 0, -900);
    if (!this.landed && ((this.timer > .12 && c.grounded) || this.timer > 1.6)) this.impact(gameWorld);
    if (this.landed && this.timer > .3) this.isFinished = true;
  }

  impact(gameWorld) {
    this.landed = true; this.timer = 0;
    const radius = this.radius * (this.quality?.area ?? 1);
    for (const t of gameWorld.getHostileTargets(this.team)) {
      if (t.isDead || t.lifeState === 'Dead') continue;
      const dx = t.x - this.x;
      if (Math.hypot(dx, ((t.z ?? this.z) - this.z) * 150) > radius) continue;
      // Vertical reach: grounded and moderately airborne targets alike.
      if (!t.isObjective && (t.worldHeight ?? 0) - (this.caster.surfaceHeight ?? 0) > 170) continue;
      t.takeDamage(this.damage, Math.sign(dx || 1) * 260, 380, .45, false, 'spell');
    }
    combat.shakeCamera(13, .45);
    environment.add('crater', this.x, this.z, { radius: radius * .6 });
    combat.spawnShockwave(this.x, this.y, radius, '#8d6e63');
    combat.spawnElementalParticles(this.x, this.y, 'terra', 22);
    audio.playSpell('stone_spikes');
  }

  render(ctx) {
    if (!this.landed) return;
    ctx.save();
    ctx.strokeStyle = `rgba(161,136,127,${1 - this.timer / .3})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(this.x, this.y, this.radius * (this.quality?.area ?? 1) * (.6 + this.timer), 18, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// HOMING SALVO (SOUL SEEKERS)
// ─────────────────────────────────────────────────────────────────────────

export class SoulSeekerBolt {
  constructor(x, z, height, angle, team, delay = 0) {
    this.isCapturableProjectile = true;
    this.x = x; this.z = z; this.height = height; this.team = team;
    this.angle = angle; this.speed = 430; this.turnRate = 3.2;
    this.life = 2.4; this.delay = delay; this.radius = 10; this.damage = 26;
    this.color = '#ea80fc'; this.midColor = '#ea80fc';
    this.isFinished = false;
  }
  get y() { return groundYForDepth(this.z) - this.height - 30; }
  get facing() { return Math.cos(this.angle) >= 0 ? 1 : -1; }

  update(dt, gameWorld) {
    if (this.delay > 0) { this.delay -= dt; return; }
    this.life -= dt;
    if (this.life <= 0) { this.isFinished = true; return; }
    const targets = gameWorld.getHostileTargets(this.team).filter(isCombatant);
    let best = null; let bestD = Infinity;
    for (const t of targets) { const d = groundDistance(this, t); if (d < bestD) { best = t; bestD = d; } }
    if (best) {
      // Steer within a turn-rate limit in ground space (z scaled to pixels).
      const desired = Math.atan2(((best.z ?? this.z) - this.z) * 150, best.x - this.x);
      let delta = desired - this.angle;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.angle += Math.max(-this.turnRate * dt, Math.min(this.turnRate * dt, delta));
    }
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.z += Math.sin(this.angle) * this.speed * dt / 150;
    if (Math.random() < .5) combat.spawnElementalParticles(this.x, this.y, 'void', 1);
    for (const t of targets) {
      if (groundDistance(this, t) < this.radius + (t.radius || 20) && withinHeight(t, this.height)) {
        t.takeDamage(this.damage, this.facing * 160, 70, .2, false, 'spell');
        combat.spawnHitSparks(t.x, (t.y ?? this.y) - 18, this.facing, this.color, 8);
        this.isFinished = true;
        return;
      }
    }
  }

  render(ctx) {
    if (this.delay > 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 1.8);
    g.addColorStop(0, '#fff'); g.addColorStop(.4, this.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// GROUND SLAM / TERRAIN IMPACT (SEISMIC SLAM) — travelling shockwave that
// leaves temporary rock pillars through the supplied factory.
// ─────────────────────────────────────────────────────────────────────────

export class SeismicSlamSpell {
  constructor(caster, spawnPillar) {
    this.team = caster.team;
    this.facing = caster.facing || 1;
    this.startX = caster.x + this.facing * 40;
    this.z = caster.z;
    this.surfaceHeight = caster.surfaceHeight ?? 0;
    this.distance = 0; this.length = 420; this.speed = 560;
    this.nextBurst = 0; this.burstSpacing = 70; this.burstIndex = 0;
    this.damage = 24; this.spawnPillar = spawnPillar;
    this.hit = new Set(); this.isFinished = false; this.trail = [];
  }
  get x() { return this.startX + this.facing * this.distance; }
  get y() { return groundYForDepth(this.z) - this.surfaceHeight; }

  update(dt, gameWorld) {
    this.distance += this.speed * dt;
    const reach = this.length * (this.quality?.area ?? 1);
    while (this.nextBurst <= Math.min(this.distance, reach)) {
      const bx = this.startX + this.facing * this.nextBurst;
      this.burst(bx, gameWorld);
      this.nextBurst += this.burstSpacing;
    }
    if (this.distance >= reach) this.isFinished = true;
  }

  burst(x, gameWorld) {
    this.burstIndex++;
    this.trail.push({ x, t: performance.now() });
    environment.add('crack', x, this.z, { radius: 38, angle: this.facing > 0 ? 0 : Math.PI });
    combat.spawnElementalParticles(x, this.y, 'terra', 6);
    for (const t of gameWorld.getHostileTargets(this.team)) {
      if (this.hit.has(t) || t.isDead || t.lifeState === 'Dead') continue;
      if (Math.abs(t.x - x) > 40 || Math.abs((t.z ?? this.z) - this.z) > .22) continue;
      if (!t.isObjective && (t.worldHeight ?? 0) - this.surfaceHeight > 60) continue; // ground-only
      this.hit.add(t);
      t.takeDamage(this.damage, this.facing * 120, 360, .4, false, 'spell');
    }
    if (this.burstIndex % 2 === 0) this.spawnPillar?.(x, this.z, this.surfaceHeight);
  }

  render(ctx) {
    ctx.save();
    const now = performance.now();
    for (const crack of this.trail) {
      const age = (now - crack.t) / 600;
      if (age > 1) continue;
      ctx.fillStyle = `rgba(121,85,72,${1 - age})`;
      ctx.beginPath(); ctx.moveTo(crack.x - 16, this.y); ctx.lineTo(crack.x, this.y - 22 * (1 - age)); ctx.lineTo(crack.x + 16, this.y); ctx.fill();
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// WIDE BEAM / CONE (DRAGON BREATH) — a flame stream that widens with range.
// ─────────────────────────────────────────────────────────────────────────

export class ConeBreathSpell {
  constructor(caster) {
    this.caster = caster; this.team = caster.team;
    this.facing = caster.facing || 1;
    this.life = 1.2; this.tick = 0; this.damage = 9;
    this.length = 260; this.blobs = []; this.isFinished = false;
  }
  get z() { return this.caster.z; }
  get originX() { return this.caster.x + this.facing * 28; }
  get y() { return groundYForDepth(this.z) - (this.caster.worldHeight ?? 0) - 30; }
  get reach() { return this.length * (this.quality?.area ?? 1); }

  // Cone test in ground space: the allowed depth band grows with distance.
  contains(t) {
    const along = (t.x - this.originX) * this.facing;
    if (along < -10 || along > this.reach) return false;
    return Math.abs((t.z ?? this.z) - this.z) <= .05 + .22 * Math.max(0, along) / this.reach;
  }

  update(dt, gameWorld) {
    if (this.caster.isAlive === false || this.caster.isDead) { this.isFinished = true; return; }
    this.life -= dt;
    this.tick -= dt;
    if (this.tick <= 0 && this.life > 0) {
      this.tick = .15;
      for (const t of gameWorld.getHostileTargets(this.team)) {
        if (t.isDead || t.lifeState === 'Dead' || !this.contains(t)) continue;
        if (!t.isObjective && !withinHeight(t, this.caster.worldHeight ?? 0, 100)) continue;
        t.takeDamage(this.damage, this.facing * 40, 20, .1, false, 'spell');
      }
      // The flame stream scorches the ground inside the cone.
      const along = Math.random() * this.reach;
      environment.add('scorch', this.originX + this.facing * along, this.z + (Math.random() - .5) * .3 * along / this.reach, { radius: 28 + along * .08, team: this.team });
    }
    if (this.life > .15) for (let i = 0; i < 3; i++) this.blobs.push({ d: 0, spread: (Math.random() - .5) * 2, size: 5 + Math.random() * 4 });
    for (const blob of this.blobs) blob.d += 520 * dt;
    this.blobs = this.blobs.filter((blob) => blob.d < this.reach);
    if (this.life <= 0 && !this.blobs.length) this.isFinished = true;
  }

  render(ctx) {
    ctx.save();
    // Chunky flame blobs with a dark outline: yellow core -> orange -> red -> smoke.
    for (const blob of this.blobs) {
      const f = blob.d / this.reach;
      const x = this.originX + this.facing * blob.d;
      const y = this.y + blob.spread * (6 + f * 46);
      const r = blob.size * (1 + f * 2.2);
      ctx.fillStyle = f < .2 ? '#fff59d' : f < .5 ? '#ffb300' : f < .8 ? '#f4511e' : 'rgba(80,60,55,.75)';
      ctx.strokeStyle = 'rgba(62,26,0,.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// UNDERGROUND / BURROW (BURROW STRIKE) — untouchable travel, then eruption.
// ─────────────────────────────────────────────────────────────────────────

export class BurrowStrikeSpell {
  constructor(caster) {
    this.caster = caster; this.team = caster.team;
    this.duration = 1.4; this.timer = 0; this.radius = 95; this.damage = 38;
    this.erupted = false; this.eruptTimer = 0; this.isFinished = false;
    caster.cancelSprint?.();
    caster.burrowed = true;
    caster.invulnerableTimer = Math.max(caster.invulnerableTimer ?? 0, this.duration * 1.25 + .1);
    environment.add('hole', caster.x, caster.z, { radius: 26 });
    combat.spawnDust(caster.x, groundYForDepth(caster.z), 10);
  }
  get x() { return this.caster.x; }
  get z() { return this.caster.z; }
  get y() { return groundYForDepth(this.z); }

  update(dt, gameWorld) {
    if (this.erupted) { this.eruptTimer += dt; if (this.eruptTimer > .35) this.isFinished = true; return; }
    this.timer += dt;
    if (Math.random() < .5) combat.spawnDust(this.x, this.y, 1);
    if (this.timer >= this.duration * (this.quality?.duration ?? 1) || this.caster.isAlive === false) this.erupt(gameWorld);
  }

  erupt(gameWorld) {
    this.erupted = true;
    this.caster.burrowed = false;
    this.caster.invulnerableTimer = Math.min(this.caster.invulnerableTimer ?? 0, .15);
    const radius = this.radius * (this.quality?.area ?? 1);
    for (const t of gameWorld.getHostileTargets(this.team)) {
      if (t.isDead || t.lifeState === 'Dead') continue;
      const dx = t.x - this.x;
      if (Math.hypot(dx, ((t.z ?? this.z) - this.z) * 150) > radius) continue;
      t.takeDamage(this.damage, Math.sign(dx || 1) * 220, 420, .45, false, 'spell');
    }
    combat.shakeCamera(11, .4);
    environment.add('crater', this.x, this.z, { radius: radius * .55 });
    combat.spawnShockwave(this.x, this.y, radius, '#a1887f');
    combat.spawnElementalParticles(this.x, this.y, 'terra', 24);
    audio.playSpell('stone_spikes');
  }

  render(ctx) {
    ctx.save();
    ctx.fillStyle = '#8d6e63'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2;
    if (!this.erupted) {
      // A travelling dirt mound marks the buried caster.
      const wobble = Math.sin(performance.now() * .02) * 2;
      ctx.fillStyle = '#6d4c41';
      ctx.beginPath(); ctx.ellipse(this.x, this.y - 4 + wobble, 26, 10, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8d6e63';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(this.x + i * 9, this.y - 8 + Math.abs(i) * 2 + wobble, 3, 0, Math.PI * 2); ctx.fill(); }
    } else {
      const k = this.eruptTimer / .35;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * (i + .5) / 6;
        const px = this.x + Math.cos(a) * 40 * k; const py = this.y + Math.sin(a) * 50 * k;
        ctx.beginPath(); ctx.moveTo(px - 5, py + 6); ctx.lineTo(px, py - 8); ctx.lineTo(px + 5, py + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// ALLY SHIELD — Arcane Aegis on a chosen friendly unit.
// ─────────────────────────────────────────────────────────────────────────

export class ShieldBubbleSpell {
  constructor(target, amount, duration) {
    this.target = target; this.team = target.team;
    this.life = duration; this.isFinished = false;
    target.arcaneShield = amount;
    if ('arcaneShieldTimer' in target) target.arcaneShieldTimer = duration;
  }
  get x() { return this.target.x; }
  get z() { return this.target.z; }
  get y() { return this.target.y ?? groundYForDepth(this.z); }
  update(dt) {
    this.life -= dt;
    const gone = this.target.isDead || this.target.lifeState === 'Dead' || (this.target.arcaneShield ?? 0) <= 0;
    if (this.life <= 0 || gone) {
      if (!('arcaneShieldTimer' in this.target)) this.target.arcaneShield = 0;
      this.isFinished = true;
    }
  }
  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(179,136,255,.85)'; ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(179,136,255,.14)';
    const r = 24 + Math.sin(performance.now() * .008) * 2;
    ctx.beginPath(); ctx.arc(this.x, this.y - 26, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PIXEL VFX LAYER — spell effects are drawn at a reduced resolution and
// scaled up without smoothing, so procedural VFX match the pixel-art
// characters (chunky, hard-edged effects as in the reference videos).
// ─────────────────────────────────────────────────────────────────────────

let pixelLayer = null;
export function renderPixelated(ctx, pixelSize, draw) {
  const target = ctx.canvas;
  const transform = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  const doc = globalThis.document;
  if (!(target?.width > 0) || !(transform && 'a' in transform) || typeof doc?.createElement !== 'function' || pixelSize <= 1) { draw(ctx); return false; }
  const w = Math.ceil(target.width / pixelSize); const h = Math.ceil(target.height / pixelSize);
  if (!pixelLayer || pixelLayer.canvas.width !== w || pixelLayer.canvas.height !== h) {
    const canvas = doc.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const layerCtx = canvas.getContext?.('2d');
    if (!layerCtx) { draw(ctx); return false; }
    pixelLayer = { canvas, ctx: layerCtx };
  }
  const lctx = pixelLayer.ctx;
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.clearRect(0, 0, w, h);
  lctx.setTransform(transform.a / pixelSize, transform.b / pixelSize, transform.c / pixelSize, transform.d / pixelSize, transform.e / pixelSize, transform.f / pixelSize);
  draw(lctx);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pixelLayer.canvas, 0, 0, w * pixelSize, h * pixelSize);
  ctx.restore();
  return true;
}
