// GRIMGE Prototype — S55 AZURFLAMME (user, 20 Oct 2026: a piercing lane dash in the
// spirit of Chidori, but adapted — blue fire instead of lightning birds so it is
// clearly its own thing). A short charge while the hand bursts into blue flame,
// then a straight dash THROUGH every foe in the lane (invulnerable while dashing,
// burning very likely). A trail of blue fire stays on the path. Tap again within
// the window: the return strike runs back through the flames — extra damage on
// foes that are still burning.
import { defineSignature, emit, foesOf, hit, TAU, DEPTH } from './signature_core.js';
import { offerRecast } from './recast.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { applyStatus, hasStatus } from './status_effects.js';

export const BIRD = Object.freeze({ charge: .3, dash: .18, length: 300, damage: 34, returnDamage: 26, returnBonus: 18, burn: .7, glow: 2, window: 2.2 });
const AZURE = { core: '#ffffff', hot: '#b3e5fc', mid: '#40c4ff', deep: '#1565c0', dark: '#0a2a5c' };
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;

// One flickering flame tongue (blue fire, brightest inside).
function flame(ctx, x, y, h, w, t, seed) {
  const sway = Math.sin(t * 14 + seed) * w * .35;
  for (const [s, c, a] of [[1, AZURE.deep, .7], [.75, AZURE.mid, .85], [.45, AZURE.hot, .95], [.2, AZURE.core, 1]]) {
    ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(x - w * s, y); ctx.quadraticCurveTo(x - w * s * .5, y - h * s * .6, x + sway * s, y - h * s);
    ctx.quadraticCurveTo(x + w * s * .5, y - h * s * .6, x + w * s, y); ctx.closePath(); ctx.fill();
  }
}

export class ThousandBirds {
  constructor(sig, owner, quality) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.quality = quality; this.f = owner.facing || 1;
    this.t = 0; this.phase = 'charge'; this.x0 = owner.x; this.z = owner.z; this.x1 = owner.x; this.hits = new Set(); this.returnHits = new Set();
    this.dashT = 0; this.glowT = null; this.returning = false; this.isFinished = false;
  }
  get x() { return (this.x0 + this.x1) / 2; } get y() { return groundYForDepth(this.z); }
  // Move the caster along the lane, striking everyone it passes once.
  sweep(from, to, k, set, damage, gw) {
    const p = this.owner; const x = from + (to - from) * k; const prev = p.x;
    p.x = x; p.vx = 0; p.vz = 0; p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, .12);
    gw?.battlefield?.resolveEntityCollision?.(p);
    const lo = Math.min(prev, p.x) - 22; const hi = Math.max(prev, p.x) + 22;
    for (const t of foesOf(gw, this.team)) {
      if (t.isProp || set.has(t) || t.x < lo || t.x > hi || Math.abs(((t.z ?? this.z) - this.z) * DEPTH) > 26) continue;
      set.add(t);
      const bonus = this.returning && hasStatus(t, 'burn') ? BIRD.returnBonus : 0;
      hit(t, (damage + bonus) * (this.quality?.power ?? 1), Math.sign(to - from) * 160, 80, .45);
      // Blue fire: burning is very likely (independent of the normal status roll).
      if (Math.random() < BIRD.burn || this.forceBurn) applyStatus(t, 'burn');
      combat.spawnHitSparks?.(t.x, (t.y ?? this.y) - 40, Math.sign(to - from), AZURE.mid, 14); combat.triggerHitstop?.(3);
    }
  }
  update(dt, gw) {
    this.t += dt; const p = this.owner;
    if (!alive(p)) { this.isFinished = true; return; }
    if (this.phase === 'charge') {
      p.state = 'heavyStrike'; p.stateTimer = .1; p.vx = 0; p.vz = 0;
      if (this.t >= BIRD.charge) { this.phase = 'dash'; this.dashT = 0; p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, BIRD.dash + .05); this.x0 = p.x; this.z = p.z; this.x1 = p.x + this.f * BIRD.length * (this.quality?.area ?? 1); audio.playSlash?.(1.4); combat.shakeCamera(6, .2); }
      return;
    }
    if (this.phase === 'dash' || this.phase === 'return') {
      this.dashT += dt; const k = Math.min(1, this.dashT / BIRD.dash);
      const [from, to] = this.phase === 'dash' ? [this.x0, this.x1] : [this.x1, this.x0];
      p.state = 'dash'; p.stateTimer = .08;
      this.sweep(from, to, k, this.phase === 'dash' ? this.hits : this.returnHits, this.phase === 'dash' ? BIRD.damage : BIRD.returnDamage, gw);
      if (k >= 1) {
        if (this.phase === 'dash') this.x1 = p.x; // a wall may have stopped the dash
        this.phase = 'glow'; this.glowT = this.t; p.state = 'idle'; p.stateTimer = 0; p.canAttack = true;
      }
      return;
    }
    if (this.t - this.glowT > BIRD.glow) this.isFinished = true;
  }
  // Stage 2: run back through the burning path.
  strikeBack() {
    if (this.phase !== 'glow' || this.returning) return false;
    this.returning = true; this.phase = 'return'; this.dashT = 0; this.owner.facing = -this.f;
    this.owner.invulnerableTimer = Math.max(this.owner.invulnerableTimer ?? 0, BIRD.dash + .05);
    audio.playSlash?.(1.6); combat.shakeCamera(7, .2);
    return true;
  }
  render(ctx) {
    const p = this.owner; const y = this.y; const hand = { x: p.x + this.f * 16, y: (p.y ?? y) - 46 };
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (this.phase === 'charge') {
      // The hand bursts into blue flame; embers swirl inward.
      const k = this.t / BIRD.charge;
      flame(ctx, hand.x, hand.y + 6, 18 + 18 * k, 7 + 4 * k, this.t, 1);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + this.t * 8; const r = 26 * (1 - ((this.t * 3 + i / 8) % 1)) + 6; ctx.globalAlpha = .9; ctx.fillStyle = i % 2 ? AZURE.core : AZURE.mid; ctx.fillRect(Math.round(hand.x + Math.cos(a) * r), Math.round(hand.y + Math.sin(a) * r * .7), 2, 2); }
    } else {
      // A trail of blue fire along the lane, roaring during the dash, then dying down.
      const fade = this.phase === 'glow' ? Math.max(0, 1 - (this.t - this.glowT) / BIRD.glow) : 1;
      const a = Math.min(this.x0, this.x1); const b = Math.max(this.x0, this.x1); const n = Math.max(4, Math.round((b - a) / 22));
      for (let i = 0; i <= n; i++) { const fx = a + (b - a) * i / n; const h = (14 + 10 * Math.abs(Math.sin(this.t * 9 + i * 1.7))) * (.35 + .65 * fade); ctx.save(); ctx.globalAlpha *= fade; flame(ctx, fx, y, h, 6, this.t, i * 2.3); ctx.restore(); }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .35 * fade; ctx.fillStyle = '#04122a'; ctx.fillRect(Math.round(a), Math.round(y - 2), Math.round(b - a), 4);
      ctx.globalCompositeOperation = 'lighter';
      if (this.phase === 'dash' || this.phase === 'return') {
        // The caster wrapped in a blue flame comet, afterimages behind.
        const dir = this.phase === 'dash' ? this.f : -this.f;
        flame(ctx, p.x + dir * 12, (p.y ?? y) - 30, 34, 12, this.t, 7);
        for (let i = 1; i <= 3; i++) { ctx.globalAlpha = .45 / i; ctx.fillStyle = AZURE.mid; ctx.beginPath(); ctx.ellipse(p.x - dir * i * 18, (p.y ?? y) - 44, 10, 18, 0, 0, TAU); ctx.fill(); }
      }
    }
    ctx.restore();
  }
}
defineSignature('S55', {
  cast(c) {
    const p = c.caster; const birds = emit(new ThousandBirds(c.sig, p, c.quality), c.quality);
    let ready = false;
    offerRecast(p, {
      window: BIRD.charge + BIRD.dash + BIRD.window, label: 'RÜCKWEG-SCHLAG',
      valid: () => !birds.isFinished && !birds.returning,
      poll: () => (birds.phase === 'glow' && !ready ? (ready = true, { window: BIRD.window, label: 'RÜCKWEG-SCHLAG' }) : null),
      stage2: () => (birds.phase === 'glow' ? birds.strikeBack() : { again: true })
    });
  }
});
