// GRIMGE Prototype — S55 TAUSENDVOGEL (user, 20 Oct 2026, after Chidori / Raikiri;
// own look): a short charge with crackling lightning in the hand and chirping
// spark-birds, then a straight lightning dash THROUGH every foe in the lane
// (invulnerable while dashing, paralysis very likely). The path keeps glowing.
// Tap again within the window: the return strike runs back along the same path
// — extra damage on foes that are still paralysed.
import { defineSignature, emit, foesOf, hit, TAU, DEPTH } from './signature_core.js';
import { offerRecast } from './recast.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { applyStatus, hasStatus } from './status_effects.js';

export const BIRD = Object.freeze({ charge: .3, dash: .18, length: 300, damage: 34, returnDamage: 26, returnBonus: 18, paralysis: .7, glow: 2, window: 2.2 });
const BOLT = { core: '#ffffff', mid: '#b3e5fc', rim: '#4fc3f7', dark: '#0d47a1' };
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;

export class ThousandBirds {
  constructor(sig, owner, quality) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.quality = quality; this.f = owner.facing || 1;
    this.t = 0; this.phase = 'charge'; this.x0 = owner.x; this.z = owner.z; this.x1 = owner.x; this.hits = new Set(); this.returnHits = new Set();
    this.dashT = 0; this.glowT = null; this.returning = false; this.isFinished = false; this.bolts = [];
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
      const bonus = this.returning && hasStatus(t, 'paralysis') ? BIRD.returnBonus : 0;
      hit(t, (damage + bonus) * (this.quality?.power ?? 1), Math.sign(to - from) * 160, 80, .45);
      // Lightning: paralysis is very likely (independent of the normal status roll).
      if (Math.random() < BIRD.paralysis || this.forceParalysis) applyStatus(t, 'paralysis');
      combat.spawnHitSparks?.(t.x, (t.y ?? this.y) - 40, Math.sign(to - from), BOLT.mid, 14); combat.triggerHitstop?.(3);
    }
  }
  update(dt, gw) {
    this.t += dt; const p = this.owner;
    if (!alive(p)) { this.isFinished = true; return; }
    if (this.phase === 'charge') {
      p.state = 'heavyStrike'; p.stateTimer = .1; p.vx = 0; p.vz = 0;
      if (this.t >= BIRD.charge) { this.phase = 'dash'; this.dashT = 0; p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, BIRD.dash + .05); this.x0 = p.x; this.z = p.z; this.x1 = p.x + this.f * BIRD.length * (this.quality?.area ?? 1); audio.playSlash?.(1.7); combat.shakeCamera(6, .2); }
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
  // Stage 2: run back along the glowing path.
  strikeBack() {
    if (this.phase !== 'glow' || this.returning) return false;
    this.returning = true; this.phase = 'return'; this.dashT = 0; this.owner.facing = -this.f;
    this.owner.invulnerableTimer = Math.max(this.owner.invulnerableTimer ?? 0, BIRD.dash + .05);
    audio.playSlash?.(1.9); combat.shakeCamera(7, .2);
    return true;
  }
  render(ctx) {
    const p = this.owner; const y = this.y; const hand = { x: p.x + this.f * 16, y: (p.y ?? y) - 46 };
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (this.phase === 'charge') {
      // Crackling ball in the hand, spark-birds darting around it.
      const k = this.t / BIRD.charge;
      ctx.globalAlpha = .9; ctx.fillStyle = BOLT.rim; ctx.beginPath(); ctx.arc(hand.x, hand.y, 6 + 6 * k, 0, TAU); ctx.fill();
      ctx.fillStyle = BOLT.core; ctx.beginPath(); ctx.arc(hand.x, hand.y, 3 + 3 * k, 0, TAU); ctx.fill();
      ctx.strokeStyle = BOLT.mid; ctx.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + this.t * 25; const r = 10 + 10 * k + (i % 3) * 3; ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(hand.x + Math.cos(a) * r * .6, hand.y + Math.sin(a) * r * .6 + 3); ctx.lineTo(hand.x + Math.cos(a) * r, hand.y + Math.sin(a) * r); ctx.stroke(); }
      // Little "birds": chevrons flitting outward.
      ctx.strokeStyle = BOLT.core; for (let i = 0; i < 4; i++) { const ph = (this.t * 4 + i / 4) % 1; const bx = hand.x + Math.cos(i * 1.7) * 26 * ph; const by = hand.y + Math.sin(i * 1.7) * 18 * ph; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.moveTo(bx - 3, by - 2); ctx.lineTo(bx, by); ctx.lineTo(bx + 3, by - 2); ctx.stroke(); }
    } else {
      // The path: a jagged lightning seam on the lane, bright while dashing, then glowing out.
      const fade = this.phase === 'glow' ? Math.max(0, 1 - (this.t - this.glowT) / BIRD.glow) : 1;
      const a = Math.min(this.x0, this.x1); const b = Math.max(this.x0, this.x1); const ly = y - 30;
      const seed = Math.floor(this.t * 24);
      for (const [w, c, al] of [[7, BOLT.dark, .5], [4, BOLT.rim, .8], [2, BOLT.core, 1]]) {
        ctx.globalAlpha = al * fade; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
        for (let i = 0; i <= 14; i++) { const u = i / 14; const jx = a + (b - a) * u; const jy = ly + (i % 2 ? -1 : 1) * (4 + ((seed * 7 + i * 13) % 6)); i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy); }
        ctx.stroke();
      }
      // Scorched streak on the ground.
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .35 * fade; ctx.fillStyle = '#0b1a2a'; ctx.fillRect(Math.round(a), Math.round(y - 2), Math.round(b - a), 4);
      ctx.globalCompositeOperation = 'lighter';
      // Afterimages of the dash.
      if (this.phase === 'dash' || this.phase === 'return') {
        ctx.globalAlpha = .9; ctx.fillStyle = BOLT.core; ctx.beginPath(); ctx.arc(p.x + (this.phase === 'dash' ? this.f : -this.f) * 14, (p.y ?? y) - 44, 9, 0, TAU); ctx.fill();
        ctx.strokeStyle = BOLT.mid; ctx.lineWidth = 2; for (let i = 1; i <= 3; i++) { ctx.globalAlpha = .5 / i; ctx.beginPath(); ctx.arc(p.x - (this.phase === 'dash' ? this.f : -this.f) * i * 18, (p.y ?? y) - 44, 10, 0, TAU); ctx.stroke(); }
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
