// GRIMGE Prototype — Combat Feedback, Hitstop, Camera & Particle VFX Engine
import { audio } from './audio.js';

export class CombatEngine {
  constructor() {
    this.hitstopFrames = 0;
    this.camera = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      zoom: 1.0,
      shakeX: 0,
      shakeY: 0,
      trauma: 0,
      shakeDuration: 0
    };
    this.damageNumbers = [];
    this.particles = [];
    this.slashTrails = [];
    this.projectiles = [];
  }

  // Trigger hitstop freeze frames for meaty impact
  triggerHitstop(frames = 4) {
    this.hitstopFrames = Math.max(this.hitstopFrames, frames);
  }

  resetEffects() {
    this.hitstopFrames = 0;
    this.damageNumbers = [];
    this.particles = [];
    this.slashTrails = [];
    this.camera.trauma = 0;
    this.camera.shakeX = 0;
    this.camera.shakeY = 0;
  }

  // Camera Shake
  shakeCamera(intensity = 8, duration = 0.25) {
    this.camera.trauma = Math.min(1.0, this.camera.trauma + intensity / 10);
    this.camera.shakeDuration = duration;
  }

  // Spawn Floating Combat Text
  spawnDamageText(x, y, amount, opt = {}) {
    const {
      isCrit = false,
      color = '#ffffff',
      prefix = '',
      text = null
    } = opt;

    const displayText = text || `${prefix}${amount}`;
    this.damageNumbers.push({
      x: x + (Math.random() * 20 - 10),
      y: y - 10 + (Math.random() * 10 - 5),
      vx: (Math.random() * 40 - 20),
      vy: isCrit ? -110 : -75,
      text: displayText,
      color: isCrit ? '#ffd700' : color,
      scale: isCrit ? 1.4 : 1.0,
      alpha: 1.0,
      life: isCrit ? 0.9 : 0.65,
      maxLife: isCrit ? 0.9 : 0.65,
      isCrit
    });
  }

  // Spawn Slash Arc Effect
  spawnSlashArc(x, y, facing, opt = {}) {
    const {
      radius = 42,
      angleStart = -0.6,
      angleEnd = 1.0,
      color = '#ffeedd',
      glow = '#ff9900',
      width = 5,
      duration = 0.16
    } = opt;

    this.slashTrails.push({
      x, y, facing,
      radius, angleStart, angleEnd,
      color, glow, width,
      duration, maxDuration: duration,
      alpha: 1.0
    });
  }

  // Particle Emitters
  spawnHitSparks(x, y, dirX = 1, color = '#ffea70', count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = (dirX > 0 ? 0 : Math.PI) + (Math.random() * 1.4 - 0.7);
      const speed = 120 + Math.random() * 240;
      this.particles.push({
        type: 'spark',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        life: 0.25 + Math.random() * 0.2,
        gravity: 600
      });
    }
  }

  spawnShockwave(x, y, maxRadius = 50, color = '#ffffff') {
    this.particles.push({
      type: 'shockwave',
      x, y,
      radius: 6,
      maxRadius,
      color,
      alpha: 0.8,
      life: 0.22,
      maxLife: 0.22
    });
  }

  spawnDust(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'dust',
        x: x + (Math.random() * 16 - 8),
        y: y - 2,
        vx: (Math.random() * 60 - 30),
        vy: -20 - Math.random() * 30,
        color: 'rgba(210, 195, 175, 0.6)',
        size: 3 + Math.random() * 4,
        alpha: 0.7,
        life: 0.35 + Math.random() * 0.2,
        gravity: -20
      });
    }
  }

  spawnElementalParticles(x, y, element, count = 8) {
    let color = '#ff4400';
    let size = 4;
    let grav = 0;
    if (element === 'ignis' || element === 'fire') {
      color = '#ff6600';
      grav = -150;
    } else if (element === 'ventus' || element === 'wind') {
      color = '#4deeea';
      grav = -40;
    } else if (element === 'fulgur' || element === 'lightning') {
      color = '#ffe600';
      grav = 0;
    } else if (element === 'terra' || element === 'earth') {
      color = '#8d6e63';
      grav = 400;
    } else if (element === 'aqua' || element === 'frost') {
      color = '#80d8ff';
      grav = -30;
    }

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      this.particles.push({
        type: 'elemental',
        x: x + (Math.random() * 12 - 6),
        y: y + (Math.random() * 12 - 6),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * size,
        alpha: 1.0,
        life: 0.3 + Math.random() * 0.4,
        gravity: grav
      });
    }
  }

  // Update Camera, Hitstop & Particles
  update(dt, targetX, targetY, viewportW, viewportH, battlefieldBounds) {
    // 1. Hitstop Check
    if (this.hitstopFrames > 0) {
      this.hitstopFrames--;
      return false; // Tells main loop to freeze physics for this frame
    }

    // 2. Camera Lerp Follow
    const lerpSpeed = 6.0;
    this.camera.targetX = targetX - viewportW * 0.5;
    this.camera.targetY = targetY - viewportH * 0.55;

    // Clamp within battlefield
    const minCamX = 0;
    const maxCamX = Math.max(0, battlefieldBounds.width - viewportW);
    const minCamY = -150;
    const maxCamY = Math.max(0, battlefieldBounds.height - viewportH);

    this.camera.targetX = Math.max(minCamX, Math.min(maxCamX, this.camera.targetX));
    this.camera.targetY = Math.max(minCamY, Math.min(maxCamY, this.camera.targetY));

    this.camera.x += (this.camera.targetX - this.camera.x) * Math.min(1.0, dt * lerpSpeed);
    this.camera.y += (this.camera.targetY - this.camera.y) * Math.min(1.0, dt * lerpSpeed);

    // 3. Camera Shake Decay
    if (this.camera.trauma > 0) {
      const shakeAmt = Math.pow(this.camera.trauma, 2) * 22;
      this.camera.shakeX = (Math.random() * 2 - 1) * shakeAmt;
      this.camera.shakeY = (Math.random() * 2 - 1) * shakeAmt;
      this.camera.trauma = Math.max(0, this.camera.trauma - dt * 2.2);
    } else {
      this.camera.shakeX = 0;
      this.camera.shakeY = 0;
    }

    // 4. Update Damage Numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 180 * dt; // Gravity
      d.life -= dt;
      d.alpha = Math.max(0, d.life / d.maxLife);
      if (d.life <= 0) this.damageNumbers.splice(i, 1);
    }

    // 5. Update Slash Trails
    for (let i = this.slashTrails.length - 1; i >= 0; i--) {
      const s = this.slashTrails[i];
      s.duration -= dt;
      s.alpha = Math.max(0, s.duration / s.maxDuration);
      if (s.duration <= 0) this.slashTrails.splice(i, 1);
    }

    // 6. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      p.life -= dt;

      if (p.type === 'shockwave') {
        const progress = 1 - (p.life / p.maxLife);
        p.radius += (p.maxRadius - p.radius) * Math.min(1, dt * 14);
        p.alpha = 1 - progress;
      } else {
        p.alpha = Math.max(0, p.life / 0.5);
      }

      if (p.life <= 0) this.particles.splice(i, 1);
    }

    return true; // Normal physics frame
  }

  // Render VFX Pass
  render(ctx) {
    ctx.save();

    // 1. Draw Slash Trails with additive blend
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.slashTrails) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(s.facing, 1);

      ctx.beginPath();
      ctx.arc(0, 0, s.radius, s.angleStart, s.angleEnd);
      ctx.strokeStyle = s.glow;
      ctx.lineWidth = s.width * 2;
      ctx.globalAlpha = s.alpha * 0.6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, s.radius, s.angleStart, s.angleEnd);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.globalAlpha = s.alpha;
      ctx.stroke();

      ctx.restore();
    }

    // 2. Draw Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'shockwave') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      } else if (p.type === 'elemental') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
      } else if (p.type === 'dust') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'source-over';

    // 3. Draw Floating Damage Numbers
    for (const d of this.damageNumbers) {
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.font = d.isCrit ? '900 20px Cinzel, serif' : '700 15px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = d.color;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();
    }

    ctx.restore();
  }
}

export const combat = new CombatEngine();
