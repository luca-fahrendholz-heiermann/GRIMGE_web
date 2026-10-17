// GRIMGE Prototype — charged attacks of the body forms.
//
// While a form is active, holding the heavy attack no longer charges a
// sword strike:
//  • Ninefold Beast Form gathers a dark beast bomb in front of the Wizard
//    that grows with the charge and is hurled forward; it detonates on the
//    first enemy (or at the end of its flight) in a large blast.
//  • Eidolon Mantle makes the guardian draw a giant spirit bow; on release a
//    huge arrow flies across the lane and pierces every enemy in its path.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';

const DEPTH_PX = 150;
const alive = (t) => t && !t.isDead && (!t.lifeState || t.lifeState === 'Alive') && !t.isObjective && !t.isProp;

export class BeastBombSpell {
  constructor(caster, charge = 1) {
    this.team = caster.team; this.caster = caster;
    this.facing = caster.facing || 1;
    this.charge = Math.max(.15, Math.min(1, charge));
    this.x = caster.x + this.facing * 40; this.z = caster.z;
    this.height = 46 + (caster.worldHeight ?? 0);
    this.size = 14 + 22 * this.charge;
    this.speed = 330 + 120 * (1 - this.charge);
    this.travel = 0; this.maxTravel = 640;
    this.blastRadius = 85 + 85 * this.charge;
    this.damage = 55 + 105 * this.charge;
    this.exploded = false; this.blastTimer = 0; this.isFinished = false; this.t = 0;
  }
  get y() { return groundYForDepth(this.z); }

  update(dt, gameWorld) {
    this.t += dt;
    if (this.exploded) {
      this.blastTimer += dt;
      if (this.blastTimer > .55) this.isFinished = true;
      return;
    }
    const step = this.speed * dt;
    this.x += this.facing * step; this.travel += step;
    const targets = gameWorld.getHostileTargets(this.team).filter(alive);
    const hit = targets.some((t) => Math.abs(t.x - this.x) <= this.size + (t.radius ?? 14) && Math.abs((t.z ?? this.z) - this.z) * DEPTH_PX <= this.size + 12);
    if (hit || this.travel >= this.maxTravel) this.explode(gameWorld, targets);
  }

  explode(gameWorld, targets) {
    this.exploded = true;
    const radius = this.blastRadius * (this.quality?.area ?? 1);
    combat.shakeCamera(10 + 10 * this.charge, .5);
    combat.spawnShockwave(this.x, this.y - this.height * .6, radius, '#ff6d00');
    combat.spawnShockwave(this.x, this.y - this.height * .6, radius * .6, '#3e1200');
    combat.spawnElementalParticles(this.x, this.y - this.height * .6, 'ignis', 30);
    audio.playImpact?.(true);
    for (const target of targets) {
      const d = Math.hypot(target.x - this.x, ((target.z ?? this.z) - this.z) * DEPTH_PX);
      if (d > radius) continue;
      const falloff = 1 - d / radius * .5;
      target.takeDamage(this.damage * falloff, Math.sign(target.x - this.x || this.facing) * 420, 240, .6, true, 'spell');
    }
  }

  render(ctx) {
    const cy = this.y - this.height;
    if (this.exploded) {
      const k = this.blastTimer / .55;
      const r = this.blastRadius * (this.quality?.area ?? 1) * (.4 + k * .8);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,140,40,${.55 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(this.x, cy + this.height * .4, r * .7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,236,179,${.6 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(this.x, cy + this.height * .4, r * .35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    drawBeastBomb(ctx, this.x, cy, this.size, this.t);
    // Short glowing trail.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i <= 4; i++) {
      ctx.fillStyle = `rgba(255,120,30,${.18 / i})`;
      ctx.beginPath(); ctx.arc(this.x - this.facing * i * this.size * .6, cy, this.size * (1 - i * .15), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// The beast bomb itself: a dark swirling core inside a burning shell, with
// energy streaks being sucked inward (used while charging and in flight).
export function drawBeastBomb(ctx, x, y, r, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient?.(x, y, r * .3, x, y, r * 2.1);
  if (glow) { glow.addColorStop(0, 'rgba(255,120,30,.55)'); glow.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 2.1, 0, Math.PI * 2); ctx.fill(); }
  // Inward streaks.
  ctx.strokeStyle = 'rgba(255,200,120,.7)'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + t * 2;
    const p = (t * 1.8 + i * .37) % 1;
    const r0 = r * (2.4 - p * 1.3); const r1 = r0 - r * .45;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a0700';
  ctx.beginPath(); ctx.arc(x, y, r * .78, 0, Math.PI * 2); ctx.fill();
  // Swirling bands inside the core.
  ctx.strokeStyle = 'rgba(255,110,30,.85)'; ctx.lineWidth = Math.max(1.5, r * .12);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(x, y, r * (.25 + i * .18), t * (3 + i) + i, t * (3 + i) + i + Math.PI * 1.1); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,236,179,.9)';
  ctx.beginPath(); ctx.arc(x - r * .35, y - r * .35, Math.max(1.5, r * .14), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export class SpiritArrowSpell {
  constructor(caster, charge = 1) {
    this.team = caster.team; this.caster = caster;
    this.facing = caster.facing || 1;
    this.charge = Math.max(.15, Math.min(1, charge));
    this.x = caster.x + this.facing * 50; this.z = caster.z;
    this.height = 70 + (caster.worldHeight ?? 0);
    this.length = 90 + 70 * this.charge;
    this.speed = 1150;
    this.travel = 0; this.maxTravel = 900;
    this.damage = 50 + 95 * this.charge;
    this.hit = new Set(); this.isFinished = false; this.t = 0; this.fade = 0;
  }
  get y() { return groundYForDepth(this.z); }

  update(dt, gameWorld) {
    this.t += dt;
    if (this.travel >= this.maxTravel) {
      this.fade += dt;
      if (this.fade > .25) this.isFinished = true;
      return;
    }
    const step = this.speed * dt;
    const x0 = this.x; this.x += this.facing * step; this.travel += step;
    const lo = Math.min(x0, this.x) - 16; const hi = Math.max(x0, this.x) + 16;
    for (const target of gameWorld.getHostileTargets(this.team).filter(alive)) {
      if (this.hit.has(target)) continue;
      if (target.x < lo || target.x > hi || Math.abs((target.z ?? this.z) - this.z) * DEPTH_PX > 30) continue;
      this.hit.add(target);
      target.takeDamage(this.damage, this.facing * 380, 140, .5, true, 'spell');
      combat.spawnHitSparks(target.x, (target.y ?? this.y) - 40, this.facing, '#e1bee7', 12);
      combat.shakeCamera(5, .15);
    }
  }

  render(ctx) {
    const cy = this.y - this.height;
    const k = 1 - Math.min(1, this.fade / .25);
    drawSpiritArrow(ctx, this.x, cy, this.facing, this.length, this.t, k);
    // Wake of light behind the arrow.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const tail = this.x - this.facing * Math.min(this.travel, 260);
    const g = ctx.createLinearGradient?.(tail, cy, this.x, cy);
    if (g) { g.addColorStop(0, 'rgba(179,136,255,0)'); g.addColorStop(1, `rgba(206,147,216,${.5 * k})`); ctx.fillStyle = g; }
    else ctx.fillStyle = `rgba(206,147,216,${.3 * k})`;
    ctx.fillRect(Math.min(tail, this.x), cy - 6, Math.abs(this.x - tail), 12);
    ctx.restore();
  }
}

// A huge spectral arrow pointing in `facing` (tip at x).
export function drawSpiritArrow(ctx, x, y, facing, length, t, alpha = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(facing, 1);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(156,77,255,.35)';
  ctx.beginPath(); ctx.ellipse(-length * .45, 0, length * .6, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // Shaft.
  ctx.fillStyle = '#d1b3ff'; ctx.fillRect(-length, -3, length - 18, 6);
  ctx.fillStyle = '#fff3ff'; ctx.fillRect(-length, -1, length - 18, 2);
  // Head.
  ctx.fillStyle = '#efe0ff'; ctx.strokeStyle = '#7b3fd6'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-22, -12); ctx.lineTo(-16, 0); ctx.lineTo(-22, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Fletching of spirit flame.
  const flick = Math.sin(t * 30) * 2;
  ctx.fillStyle = 'rgba(179,136,255,.85)';
  ctx.beginPath(); ctx.moveTo(-length + 18, 0); ctx.lineTo(-length - 6, -14 - flick); ctx.lineTo(-length + 2, 0); ctx.lineTo(-length - 6, 14 + flick); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// The guardian's drawn bow (used while charging in Eidolon Mantle).
export function drawSpiritBow(ctx, x, y, facing, charge, t) {
  const pull = 10 + 46 * charge;
  ctx.save();
  ctx.translate(x, y); ctx.scale(facing, 1);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(225,190,255,.75)'; ctx.lineWidth = 22;
  ctx.beginPath(); ctx.moveTo(30, -118); ctx.quadraticCurveTo(92, 0, 30, 118); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#4a1d96'; ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(30, -118); ctx.quadraticCurveTo(92, 0, 30, 118); ctx.stroke();
  ctx.strokeStyle = '#e8d5ff'; ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
  ctx.stroke();
  // Glowing tips of the limbs.
  ctx.fillStyle = '#f3e5ff';
  for (const ty of [-118, 118]) { ctx.beginPath(); ctx.arc(30, ty, 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#fff3ff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(30, -118); ctx.lineTo(30 - pull, 0); ctx.lineTo(30, 118); ctx.stroke();
  ctx.restore();
  drawSpiritArrow(ctx, x + facing * (64 - pull * .2), y, facing, 70 + 60 * charge, t, .55 + .45 * charge);
}
