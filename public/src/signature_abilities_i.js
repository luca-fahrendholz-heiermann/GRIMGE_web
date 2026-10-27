// GRIMGE Prototype — S55 AZURFLAMME (user, 20 Oct 2026: a piercing lane dash in the
// spirit of Chidori, but adapted — blue fire instead of lightning birds so it is
// clearly its own thing). HOLD the slot to charge (user, 20 Oct 2026: "beim Aufladen
// Funken sprühen bis es entladen wird"): the hand roars into blue flame and sprays
// ever more sparks; RELEASE = a straight dash THROUGH every foe in the lane — the
// longer the charge, the farther, harder and surer to burn (invulnerable while dashing,
// burning very likely). A trail of blue fire stays on the path. Tap again within
// the window: the return strike runs back through the flames — extra damage on
// foes that are still burning.
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
import { defineSignature, emit, foesOf, hit, TAU, DEPTH } from './signature_core.js';
import { offerRecast } from './recast.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { applyStatus, hasStatus } from './status_effects.js';

export const BIRD = Object.freeze({ minCharge: .25, full: 1.4, dash: .18, length: 220, lengthBonus: 240, damage: 26, damageBonus: 30, returnDamage: 26, returnBonus: 18, burn: .7, glow: 2, window: 2.2 });
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
    this.dashT = 0; this.glowT = null; this.returning = false; this.isFinished = false; this.charge = 0; this.k = 0; this.crackle = 0;
    this.dashDamage = BIRD.damage; this.burnChance = BIRD.burn;
  }
  get chargeK() { return Math.min(1, this.charge / BIRD.full); }
  // Release the held charge: the dash (length, damage and burn grow with the charge).
  release() {
    if (this.phase !== 'charge') return false;
    const p = this.owner; this.k = Math.min(1, Math.max(BIRD.minCharge, this.charge) / BIRD.full);
    this.phase = 'dash'; this.dashT = 0; this.x0 = p.x; this.z = p.z; this.f = p.facing || this.f;
    this.x1 = p.x + this.f * (BIRD.length + BIRD.lengthBonus * this.k) * (this.quality?.area ?? 1);
    this.dashDamage = BIRD.damage + BIRD.damageBonus * this.k; this.burnChance = BIRD.burn + (1 - BIRD.burn) * this.k;
    p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, BIRD.dash + .05);
    audio.playSlash?.(1.4); combat.shakeCamera(4 + 8 * this.k, .25);
    combat.spawnShockwave?.(p.x + this.f * 16, (p.y ?? this.y) - 44, 30 + 40 * this.k, AZURE.mid);
    return { again: true, window: BIRD.dash + BIRD.window, label: 'RÜCKWEG-SCHLAG', releaseOnUp: false };
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
      if (Math.random() < this.burnChance || this.forceBurn) applyStatus(t, 'burn');
      combat.spawnHitSparks?.(t.x, (t.y ?? this.y) - 40, Math.sign(to - from), AZURE.mid, 14); combat.triggerHitstop?.(3);
    }
  }
  update(dt, gw) {
    this.t += dt; const p = this.owner;
    if (!alive(p)) { this.isFinished = true; return; }
    if (this.phase === 'charge') {
      // A hit breaks the charge (the flame gutters out).
      if (p.state === 'hurt') { this.isFinished = true; combat.spawnShockwave?.(p.x, (p.y ?? this.y) - 40, 26, AZURE.deep); return; }
      this.charge += dt; p.state = 'heavyStrike'; p.stateTimer = .1; p.vx = 0; p.vz = 0; this.f = p.facing || this.f; this.z = p.z; this.x0 = this.x1 = p.x;
      this.crackle += dt; if (this.crackle > .28) { this.crackle = 0; audio.playSpell?.('fulgur'); }
      if (this.charge >= BIRD.full + .4) this.release(); // held too long: it fires on its own
      return;
    }
    if (this.phase === 'dash' || this.phase === 'return') {
      this.dashT += dt; const k = Math.min(1, this.dashT / BIRD.dash);
      const [from, to] = this.phase === 'dash' ? [this.x0, this.x1] : [this.x1, this.x0];
      p.state = 'dash'; p.stateTimer = .08;
      this.sweep(from, to, k, this.phase === 'dash' ? this.hits : this.returnHits, this.phase === 'dash' ? this.dashDamage : BIRD.returnDamage, gw);
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
      const k = this.chargeK; const t = this.t;
      // Ground glow under the Wizard, growing with the charge.
      if (spellSheetReady('azure_flame')) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = AZURE.mid; const R = 26 + 30 * k; for (let q = 0; q < 48; q++) { if ((q + Math.floor(t * 10)) % 4 === 3) continue; const u = q / 48 * TAU; ctx.fillRect(Math.round(p.x + Math.cos(u) * R), Math.round(y + Math.sin(u) * R * .3), 2, 2); } drawSpellSprite(ctx, 'azure_flame', Math.floor(t * 14) % 6, hand.x, hand.y + 12, { scale: .55 + .65 * k }); ctx.globalCompositeOperation = 'lighter'; } else { ctx.globalAlpha = .25 + .35 * k; ctx.fillStyle = AZURE.mid; ctx.beginPath(); ctx.ellipse(p.x, y, 26 + 30 * k, 7 + 8 * k, 0, 0, TAU); ctx.fill(); }
      // The hand roars into blue fire.
      if (!spellSheetReady('azure_flame')) flame(ctx, hand.x, hand.y + 8, 18 + 34 * k, 7 + 9 * k, t, 1);
      if (!spellSheetReady('azure_flame')) flame(ctx, hand.x - this.f * 6, hand.y + 10, 12 + 20 * k, 5 + 5 * k, t * 1.3, 4);
      // Sparks spray out in every direction — more, faster and farther the fuller the charge.
      const n = 10 + Math.round(40 * k);
      for (let s = 0; s < n; s++) {
        const seed = s * 12.9898; const life = .35 + (Math.sin(seed) * .5 + .5) * .3; const ph = ((t + (Math.sin(seed * 3.1) * .5 + .5) * life) % life) / life;
        const a = (Math.sin(seed * 7.3) * .5 + .5) * TAU; const dist = (16 + 95 * k) * ph * (.6 + (Math.sin(seed * 1.7) * .5 + .5) * .8);
        const sx = hand.x + Math.cos(a) * dist; const sy = hand.y + Math.sin(a) * dist * .8 + ph * ph * 18;
        ctx.globalAlpha = (1 - ph) * .95; ctx.strokeStyle = s % 3 ? AZURE.hot : AZURE.core; ctx.lineWidth = 2.5; ctx.fillStyle = AZURE.core; const sz = 3 + Math.round(2 * k); ctx.fillStyle = s % 2 ? AZURE.core : AZURE.mid; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, sz, sz);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - Math.cos(a) * (3 + 6 * k), sy - Math.sin(a) * (3 + 6 * k) * .8); ctx.stroke();
      }
      // Crackling arcs jump around the arm.
      const roll = Math.floor(t * 24);
      for (let j = 0; j < 2 + Math.round(3 * k); j++) {
        const a0 = (roll * 1.7 + j * 2.4) % TAU; const r = 12 + 14 * k;
        ctx.globalAlpha = .8; ctx.strokeStyle = AZURE.core; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hand.x, hand.y);
        for (let q = 1; q <= 3; q++) ctx.lineTo(hand.x + Math.cos(a0) * r * q / 3 + Math.sin(roll + q * 3 + j) * 4, hand.y + Math.sin(a0) * r * q / 3 + Math.cos(roll + q * 2 + j) * 4);
        ctx.stroke();
      }
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
    // Stage 1 = release the held charge (touch: let go of the slot; keys: tap again),
    // stage 2 = the return strike through the flames.
    offerRecast(p, {
      window: BIRD.full + .6, label: 'LOSLASSEN: STOSS', releaseOnUp: true,
      valid: () => !birds.isFinished && !birds.returning,
      poll: () => (birds.phase === 'glow' && !ready ? (ready = true, { window: BIRD.window, label: 'RÜCKWEG-SCHLAG' }) : null),
      stage2: () => (birds.phase === 'charge' ? birds.release() : birds.phase === 'glow' ? birds.strikeBack() : { again: true }),
      expire: () => birds.release()
    });
  }
});
// Hand-drawn rune objects (rounds 7–10) render at fine density, not through the coarse pixel layer.
for (const C of [ThousandBirds]) Object.defineProperty(C.prototype, 'fineVfx', { value: true, writable: true, configurable: true });
