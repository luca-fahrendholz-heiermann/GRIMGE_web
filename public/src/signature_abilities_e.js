// GRIMGE Prototype — signature specials S45–S48 (user, 20 Oct 2026):
// two-stage spells (recast.js) and counter charges.
//   S45 BLITZMARKE    stage 1: throw a marked kunai (sticks in the foe it hits,
//                     else in the ground) · stage 2: teleport to it and strike
//   S46 SPIRALKUGEL   stage 1: rush forward with a spinning energy ball, the
//                     impact launches the foe · stage 2: teleport above it and
//                     slam it into the ground — explosion
//   S47 BANNFALLE     stage 1: lay a seal trap (always armed, triggers on
//                     contact) · stage 2: detonate it yourself (bigger blast).
//                     When the window runs out the trap stays armed — it just
//                     can no longer be detonated by hand.
//   S48 SCHATTENKONTER three charges: a hit is negated, you vanish and reappear
//                     behind the attacker with a counter strike
import { defineSignature, startStance, endStance, emit, foesOf, groundDist, hit, plate, thread, sparks, TAU, DEPTH, currentAttacker } from './signature_core.js';
import { offerRecast } from './recast.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';

const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && (t.hp ?? 1) > 0;
const nearestAhead = (gw, p, range) => foesOf(gw, p.team).filter((t) => !t.isProp && (t.x - p.x) * (p.facing || 1) > -10 && groundDist(t, p) < range).sort((a, b) => groundDist(a, p) - groundDist(b, p))[0] ?? null;
// Teleport with an afterimage left behind and a flash at both ends.
function teleport(p, x, z, gw, color) {
  p.ghosts?.push({ x: p.x, y: p.y, z: p.z, elevation: p.elevation, facing: p.facing, alpha: .6, state: p.state, animTime: p.animTime });
  combat.spawnShockwave(p.x, (p.y ?? 0) - 40, 30, color);
  p.x = x; p.z = Math.max(.04, Math.min(.96, z));
  gw?.battlefield?.placeOnSurface?.(p);
  p.vx = 0; p.vz = 0; p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, .2);
  combat.spawnShockwave(p.x, (p.y ?? 0) - 40, 36, color);
  audio.playSlash?.(1.5);
}

// ── S45 Blitzmarke ───────────────────────────────────────────────────────
const KUNAI = { steel: '#cfd8dc', dark: '#37474f', tag: '#ffd54f', glow: '#ffe082' };
class MarkedKunai {
  constructor(sig, owner) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.f = owner.facing || 1;
    this.x = owner.x + this.f * 20; this.z = owner.z; this.h = 44; this.vx = this.f * 760; this.t = 0;
    this.stuckIn = null; this.landed = false; this.life = 8; this.isFinished = false; this.spin = 0;
  }
  get y() { return groundYForDepth(this.z); }
  get pos() { return this.stuckIn && alive(this.stuckIn) ? { x: this.stuckIn.x, z: this.stuckIn.z ?? this.z } : { x: this.x, z: this.z }; }
  update(dt, gw) {
    this.t += dt; if (this.t > this.life) { this.isFinished = true; return; }
    if (this.stuckIn) { if (!alive(this.stuckIn)) { this.x = this.stuckIn.x; this.stuckIn = null; this.landed = true; } return; }
    if (this.landed) return;
    const px = this.x; this.x += this.vx * dt; this.h = Math.max(4, this.h - dt * 30);
    for (const t of foesOf(gw, this.team)) {
      if (t.isProp) continue;
      const lo = Math.min(px, this.x) - 14; const hi = Math.max(px, this.x) + 14;
      if (t.x < lo || t.x > hi || Math.abs(((t.z ?? this.z) - this.z) * DEPTH) > 22) continue;
      hit(t, 14, this.f * 80, 10, .3); this.stuckIn = t; combat.spawnHitSparks(t.x, (t.y ?? this.y) - 30, this.f, KUNAI.tag, 6); return;
    }
    if (Math.abs(this.x - this.owner.x) > 340) { this.landed = true; this.h = 2; }
  }
  render(ctx) {
    const { x } = this.pos; const y = (this.stuckIn ? (this.stuckIn.y ?? this.y) - 30 : this.y - this.h);
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(this.f, 1);
    if (this.landed && !this.stuckIn) ctx.rotate(.9); // stuck slanted in the ground
    ctx.fillStyle = KUNAI.dark; ctx.fillRect(-12, -1, 7, 3);                                   // grip
    ctx.strokeStyle = KUNAI.dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-14, 0, 2.5, 0, TAU); ctx.stroke(); // ring
    ctx.fillStyle = KUNAI.steel; ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(8, 0); ctx.lineTo(-5, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = KUNAI.dark; ctx.lineWidth = 1; ctx.stroke();
    // The marking tag (the teleport seal) flutters behind the ring.
    const flap = Math.sin(this.t * 18) * 2;
    ctx.fillStyle = KUNAI.tag; ctx.fillRect(-22, -2 + flap, 6, 5); ctx.fillStyle = '#b71c1c'; ctx.fillRect(-20, -1 + flap, 2, 3);
    ctx.restore();
    if (this.landed || this.stuckIn) { ctx.save(); ctx.globalAlpha = .45 + .35 * Math.sin(this.t * 8); ctx.strokeStyle = KUNAI.glow; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, groundYForDepth(this.pos.z), 14, 4.5, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  }
}
defineSignature('S45', {
  cast(c) {
    const p = c.caster; const kunai = emit(new MarkedKunai(c.sig, p), c.quality);
    offerRecast(p, { window: 5, label: 'TELEPORT ZUR MARKE', valid: () => !kunai.isFinished, stage2: (gw) => {
      const { x, z } = kunai.pos; const victim = kunai.stuckIn && alive(kunai.stuckIn) ? kunai.stuckIn : null;
      // Into the foe: appear behind it and strike; at a ground mark: appear on it with a slash ring.
      const f = victim ? Math.sign(victim.x - p.x || p.facing || 1) : p.facing || 1;
      teleport(p, victim ? x + f * 26 : x, z, gw, KUNAI.glow);
      p.facing = victim ? -f : p.facing;
      for (const t of foesOf(gw, p.team)) if (!t.isProp && groundDist(t, p) < (victim ? 60 : 70)) hit(t, victim ? 36 : 24, p.facing * 260, 140, .5, !!victim);
      combat.shakeCamera(6, .2); kunai.isFinished = true;
    } });
  }
});

// ── S46 Spiralkugel ──────────────────────────────────────────────────────
const ORB = { core: '#ffffff', mid: '#9be7ff', rim: '#2196f3', dark: '#0d47a1' };
function drawSpiralOrb(ctx, x, y, r, t) {
  ctx.save();
  ctx.fillStyle = ORB.dark; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.fill();
  ctx.fillStyle = ORB.rim; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = ORB.mid; ctx.beginPath(); ctx.arc(x, y, r * .72, 0, TAU); ctx.fill();
  ctx.strokeStyle = ORB.core; ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); const a0 = t * 14 + k * TAU / 3; for (let i = 0; i <= 10; i++) { const a = a0 + i * .35; const rr = r * (.15 + i * .08); const px = x + Math.cos(a) * rr; const py = y + Math.sin(a) * rr * .8; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
  ctx.fillStyle = ORB.core; ctx.beginPath(); ctx.arc(x, y, r * .25, 0, TAU); ctx.fill();
  ctx.restore();
}
class SpiralRush {
  constructor(sig, owner, quality) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.f = owner.facing || 1; this.quality = quality;
    this.t = 0; this.dur = .45; this.victim = null; this.isFinished = false; this.startX = owner.x;
  }
  get x() { return this.owner.x; } get z() { return this.owner.z; } get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt; const p = this.owner;
    if (!this.victim && this.t < this.dur) {
      p.vx = this.f * 620; p.state = 'dash'; p.stateTimer = .05;
      for (const t of foesOf(gw, this.team)) {
        if (t.isProp || Math.abs(t.x - (p.x + this.f * 24)) > 30 || Math.abs(((t.z ?? p.z) - p.z) * DEPTH) > 24) continue;
        this.victim = t; this.hitAt = this.t; p.vx = 0;
        hit(t, 34 * (this.quality?.power ?? 1), this.f * 140, 640, 1.2, true); // launched high
        combat.shakeCamera(8, .25); combat.triggerHitstop?.(5); break;
      }
    }
    if (this.t >= (this.hitAt ?? this.dur) + .35) this.isFinished = true;
  }
  render(ctx) {
    const p = this.owner; const grow = Math.min(1, this.t / .12); const burst = this.hitAt != null ? (this.t - this.hitAt) / .35 : 0;
    const x = p.x + this.f * (22 + 6 * burst); const y = (p.y ?? this.y) - 42;
    if (burst > 0) { ctx.save(); ctx.globalAlpha = 1 - burst; ctx.strokeStyle = ORB.mid; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 14 + burst * 50, 0, TAU); ctx.stroke(); ctx.restore(); }
    drawSpiralOrb(ctx, x, y, (8 + 4 * grow) * (1 - burst * .6), this.t);
    if (!this.hitAt) thread(ctx, [[p.x - this.f * 40, y], [x - this.f * 10, y]], ORB.mid, 3, .7);
  }
}
class SpiralSlam {
  constructor(sig, owner, victim, quality) { this.sig = sig; this.owner = owner; this.team = owner.team; this.victim = victim; this.quality = quality; this.t = 0; this.landed = false; this.isFinished = false; this.x = owner.x; this.z = owner.z; }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt; const p = this.owner;
    if (!this.landed) {
      if (p.grounded || this.t > 1.2) {
        this.landed = true; this.landT = this.t; this.x = p.x; this.z = p.z;
        for (const t of foesOf(gw, this.team)) if (!t.isProp && groundDist(t, p) < 110) hit(t, (t === this.victim ? 60 : 30) * (this.quality?.power ?? 1), Math.sign(t.x - p.x || 1) * 300, -200, .7, t === this.victim);
        combat.shakeCamera(14, .4); combat.triggerHitstop?.(6); audio.playImpact?.(true);
      } else if (this.victim && alive(this.victim)) { this.victim.x += (p.x - this.victim.x) * Math.min(1, dt * 12); this.victim.vElevation = Math.min(this.victim.vElevation ?? 0, -900); }
    }
    if (this.landed && this.t - this.landT > .6) this.isFinished = true;
  }
  render(ctx) {
    const p = this.owner;
    if (!this.landed) { drawSpiralOrb(ctx, p.x + (p.facing || 1) * 8, (p.y ?? this.y) - (p.elevation ?? 0) + 6, 13, this.t); return; }
    const k = (this.t - this.landT) / .6; const y = this.y;
    ctx.save();
    ctx.globalAlpha = 1 - k; ctx.fillStyle = ORB.mid; ctx.beginPath(); ctx.ellipse(this.x, y, 30 + 90 * k, (30 + 90 * k) * .32, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = ORB.core; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(this.x, y, 20 + 110 * k, (20 + 110 * k) * .32, 0, 0, TAU); ctx.stroke();
    if (k < .4) drawSpiralOrb(ctx, this.x, y - 14, 22 * (1 - k * 2), this.t);
    ctx.restore();
    sparks(ctx, [[this.x, y - 10]], this.sig.mat, this.t, 4601, 10, 1 - k);
  }
}
defineSignature('S46', {
  cast(c) {
    const p = c.caster; const rush = emit(new SpiralRush(c.sig, p, c.quality), c.quality);
    offerRecast(p, { window: 2.5, label: 'SPRUNG & EINSCHLAG', valid: () => !rush.victim || alive(rush.victim), stage2: (gw) => {
      const v = rush.victim && alive(rush.victim) ? rush.victim : nearestAhead(gw, p, 260);
      if (!v) return false;
      // Above the foe, then a fast dive that drags it down into the ground.
      teleport(p, v.x - (p.facing || 1) * 6, v.z ?? p.z, gw, ORB.mid);
      p.grounded = false; p.elevation = Math.max(90, (v.elevation ?? 0) + 70); p.vElevation = -1100; p.state = 'dive'; p.stateTimer = .5;
      emit(new SpiralSlam(c.sig, p, v, c.quality), c.quality);
    } });
  }
});

// ── S47 Bannfalle ────────────────────────────────────────────────────────
class SealTrap {
  constructor(sig, owner, x, z) { this.sig = sig; this.owner = owner; this.team = owner.team; this.x = x; this.z = z; this.t = 0; this.life = 20; this.manual = true; this.fired = false; this.firedT = 0; this.isFinished = false; this.big = false; }
  get y() { return groundYForDepth(this.z); }
  detonate(gw, big) {
    if (this.fired) return; this.fired = true; this.big = big; this.firedT = this.t;
    for (const t of foesOf(gw, this.team)) if (!t.isProp && Math.hypot(t.x - this.x, ((t.z ?? this.z) - this.z) * DEPTH) < (big ? 95 : 60)) hit(t, big ? 48 : 30, Math.sign(t.x - this.x || 1) * (big ? 320 : 200), big ? 300 : 220, .6);
    combat.shakeCamera(big ? 10 : 6, .25); audio.playImpact?.(true);
  }
  update(dt, gw) {
    this.t += dt;
    if (this.fired) { if (this.t - this.firedT > .55) this.isFinished = true; return; }
    if (this.t > this.life) { this.isFinished = true; return; }
    // Always armed: a foe stepping on it sets it off.
    if (this.t > .35) for (const t of foesOf(gw, this.team)) if (!t.isProp && Math.hypot(t.x - this.x, ((t.z ?? this.z) - this.z) * DEPTH) < 22) { this.detonate(gw, false); break; }
  }
  render(ctx) {
    const y = this.y; const R = 20;
    if (this.fired) {
      const k = (this.t - this.firedT) / .55; const RR = (this.big ? 95 : 60) * Math.min(1, k * 2.2);
      ctx.save(); ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#ff7043'; ctx.beginPath(); ctx.ellipse(this.x, y, RR, RR * .32, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.ellipse(this.x, y - 6, RR * .5, RR * .5 * .6, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.fillStyle = '#f6e7b8'; ctx.fillRect(this.x + Math.cos(a) * RR * .8, y - 10 - k * 40 + Math.sin(a) * 8, 6, 8); }
      ctx.restore(); return;
    }
    const pulse = .5 + .5 * Math.sin(this.t * (this.manual ? 6 : 3));
    ctx.save();
    ctx.strokeStyle = this.manual ? '#d84315' : '#8d6e63'; ctx.lineWidth = 2; ctx.globalAlpha = .6 + .4 * pulse;
    ctx.beginPath(); ctx.ellipse(this.x, y, R, R * .32, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(this.x, y, R * .6, R * .6 * .32, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = '#f6e7b8'; ctx.fillRect(this.x - 5, y - 9, 10, 9); ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1; ctx.strokeRect(this.x - 5 + .5, y - 9 + .5, 9, 8);
    ctx.fillStyle = '#b71c1c'; ctx.fillRect(this.x - 1, y - 7, 2, 5); ctx.fillRect(this.x - 3, y - 5, 6, 1);
    ctx.restore();
  }
}
defineSignature('S47', {
  cast(c) {
    const p = c.caster; const x = c.target?.x ?? p.x + (p.facing || 1) * 110; const z = c.target?.z ?? p.z;
    const trap = emit(new SealTrap(c.sig, p, x, z), c.quality);
    offerRecast(p, { window: 6, label: 'FALLE ZÜNDEN', valid: () => !trap.fired && !trap.isFinished,
      stage2: (gw) => trap.detonate(gw, true),
      // Window over: the trap stays armed (contact only), it just can't be detonated by hand.
      expire: () => { trap.manual = false; } });
  }
});

// ── S48 Schattenkonter ───────────────────────────────────────────────────
defineSignature('S48', {
  cast(c) { startStance(c.caster, 'S48', c.quality, { charges: 3, flash: 0 }); },
  stance: {
    duration: 12,
    hint: 'NÄCHSTE 3 TREFFER: AUSWEICHEN & KONTER HINTER DEM GEGNER',
    counter: (p, st) => ({ n: st.charges, max: 3 }),
    update(p, st, dt) { st.flash = Math.max(0, st.flash - dt); if (st.charges <= 0) endStance(p, 'spent'); },
    damageTaken(p, st, amount) {
      if (st.charges <= 0 || !(amount > 0)) return amount;
      st.charges--; st.flash = .3;
      const a = currentAttacker(); const gw = globalThis.window?.gameWorld;
      if (a && alive(a) && a.team !== p.team) {
        const side = Math.sign(a.x - p.x) || p.facing || 1;
        teleport(p, a.x + side * 28, a.z ?? p.z, gw, '#b39ddb'); p.facing = -side;
        a.takeDamage?.(26, -side * 260, 120, .6, true, 'melee');
      } else {
        // No attacker known (spell / projectile): a short sidestep in depth.
        teleport(p, p.x, p.z + (p.z > .5 ? -.12 : .12), gw, '#b39ddb');
      }
      return 0;
    },
    render(ctx, p, st, ry, layer) {
      if (layer !== 'front') return;
      for (let i = 0; i < st.charges; i++) { const a = st.t * 2 + i * TAU / 3; const x = p.x + Math.cos(a) * 22; const y = ry - 50 + Math.sin(a) * 26; ctx.save(); ctx.fillStyle = '#311b92'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b39ddb'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
      if (st.flash > 0) plate(ctx, [[p.x - 14, ry - 80], [p.x + 14, ry - 80], [p.x + 14, ry], [p.x - 14, ry]], { kind: 'smoke', dark: '#1a0f33', body: '#4527a0', facet: '#b39ddb', vein: '#b39ddb', edge: '#ede7f6', spark: '#ede7f6', core: '#ffffff', glow: 'rgba(179,157,219,', edgeGlow: 'rgba(237,231,246,' }, 4801, { alpha: st.flash * 2 });
    }
  }
});
