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
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
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
    if (spellSheetReady('mark_kunai')) { drawSpellSprite(ctx, 'mark_kunai', Math.floor(this.t * 12) % 2, -4, 0, { anchor: 'center', scale: .5 }); ctx.restore(); if (this.landed || this.stuckIn) { ctx.save(); ctx.globalAlpha = .5 + .3 * Math.sin(this.t * 8); ctx.fillStyle = '#ffd54f'; const gy = groundYForDepth(this.stuckIn?.z ?? this.z); for (let i = 0; i < 24; i++) { const u = i / 24 * TAU; if (i % 3 === 2) continue; ctx.fillRect(Math.round(x + Math.cos(u) * 14), Math.round(gy + Math.sin(u) * 4), 2, 2); } ctx.restore(); } return; }
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
// Stage 2: the Wizard appears high above the foe, hangs there for a beat while the orb
// swells over the raised hand (the foe is held in the air below), then smashes straight
// down — flash, shock rings, flying rubble, screen shake and a lingering crater.
const SLAM_HOVER = .26; const SLAM_DIVE_SPEED = 1700;
class SpiralSlam {
  constructor(sig, owner, victim, quality, hoverH) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.victim = victim; this.quality = quality;
    this.t = 0; this.hoverH = hoverH; this.diving = false; this.landed = false; this.isFinished = false; this.x = owner.x; this.z = owner.z;
    this.victimH = Math.max(0, victim?.elevation ?? 0);
  }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt; const p = this.owner;
    if (!this.landed) this.z = p.z;
    if (!this.diving && !this.landed) {
      // Hang in the air above the foe; the foe is held below.
      p.grounded = false; p.elevation = this.hoverH; p.vElevation = 0; p.vx = 0; p.state = 'dive'; p.stateTimer = .5;
      if (this.victim && alive(this.victim) && this.victimH > 0) { this.victim.elevation = this.victimH; this.victim.vElevation = 0; this.victim.x += (p.x - this.victim.x) * Math.min(1, dt * 10); }
      if (this.t >= SLAM_HOVER) { this.diving = true; p.vElevation = -SLAM_DIVE_SPEED; audio.playSlash?.(.7); }
    } else if (!this.landed) {
      p.vElevation = Math.min(p.vElevation ?? 0, -SLAM_DIVE_SPEED); p.state = 'dive'; p.stateTimer = .5;
      if (p.grounded || (p.elevation ?? 0) <= 0 || this.t > SLAM_HOVER + 1) {
        this.landed = true; this.landT = this.t; this.x = p.x; this.z = p.z;
        for (const t of foesOf(gw, this.team)) if (!t.isProp && groundDist(t, p) < 110) hit(t, (t === this.victim ? 60 : 30) * (this.quality?.power ?? 1), Math.sign(t.x - p.x || 1) * 300, -200, .7, t === this.victim);
        if (this.victim && alive(this.victim) && (this.victim.elevation ?? 0) > 0) { this.victim.elevation = 0; this.victim.vElevation = 0; }
        const gy = groundYForDepth(p.z);
        combat.shakeCamera(12, .45); combat.triggerHitstop?.(8); audio.playImpact?.(true);
        combat.spawnShockwave(p.x, gy, 130, ORB.mid); combat.spawnShockwave(p.x, gy, 80, ORB.core); combat.spawnDust(p.x, gy, 10);
        emit(new SpiralCrater(p.x, p.z), this.quality);
      } else if (this.victim && alive(this.victim)) {
        // Dragged down in front of the orb.
        this.victim.x += (p.x - this.victim.x) * Math.min(1, dt * 12);
        if ((this.victim.elevation ?? 0) > 0) this.victim.elevation = Math.max(0, Math.min(this.victim.elevation, (p.elevation ?? 0) - 10));
        this.victim.vElevation = Math.min(this.victim.vElevation ?? 0, -900);
      }
    }
    if (this.landed && this.t - this.landT > .7) this.isFinished = true;
  }
  render(ctx) {
    const p = this.owner; const f = p.facing || 1; const gy = groundYForDepth(p.z); const py = gy - (p.elevation ?? 0);
    if (!this.landed) {
      ctx.save();
      // Target mark on the ground under the Wizard: shows where it will hit.
      const mk = this.diving ? 1 : this.t / SLAM_HOVER; const mr = 70 - 30 * mk;
      ctx.globalAlpha = .45 + .4 * mk; ctx.strokeStyle = ORB.rim; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(p.x, gy, mr, mr * .32, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = .25 + .3 * mk; ctx.fillStyle = ORB.dark; ctx.beginPath(); ctx.ellipse(p.x, gy, mr * .7, mr * .22, 0, 0, TAU); ctx.fill();
      if (!this.diving) {
        // Hover: the orb swells over the raised hand, energy rushes into it.
        const k = Math.min(1, this.t / SLAM_HOVER); const ox = p.x + f * 4; const oy = py - 82 - 6 * k;
        ctx.globalCompositeOperation = 'lighter';
        for (let n = 0; n < 10; n++) { const a = n / 10 * TAU + this.t * 6; const r = 60 * (1 - ((this.t * 3 + n / 10) % 1)) + 14; ctx.globalAlpha = .8; ctx.fillStyle = n % 2 ? ORB.core : ORB.mid; ctx.fillRect(Math.round(ox + Math.cos(a) * r), Math.round(oy + Math.sin(a) * r * .8), 3, 3); }
        ctx.globalAlpha = .35; ctx.fillStyle = ORB.mid; ctx.beginPath(); ctx.arc(ox, oy, 26 + 14 * k, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        drawSpiralOrb(ctx, ox, oy, 12 + 14 * k, this.t);
        // Light line from the raised hand up to the orb.
        thread(ctx, [[p.x + f * 6, py - 52], [ox, oy + 12]], ORB.mid, 3, .8);
      } else {
        // Dive: speed lines above, the orb leads underneath.
        ctx.globalAlpha = .75; ctx.strokeStyle = ORB.core; ctx.lineWidth = 2;
        for (let n = 0; n < 7; n++) { const lx = p.x - 24 + n * 8; const ly = py - 70 - ((n * 37) % 30); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - 70 - (n % 3) * 20); ctx.stroke(); }
        ctx.globalAlpha = 1; drawSpiralOrb(ctx, p.x + f * 6, py + 4, 26, this.t);
      }
      ctx.restore(); return;
    }
    const k = (this.t - this.landT) / .7; const y = this.y;
    ctx.save();
    // White impact flash + an energy dome that bursts outward.
    if (k < .18) { ctx.globalAlpha = .9 * (1 - k / .18); ctx.fillStyle = ORB.core; ctx.beginPath(); ctx.ellipse(this.x, y - 30, 110, 80, 0, 0, TAU); ctx.fill(); }
    const dr = 40 + 110 * Math.min(1, k * 1.6);
    ctx.globalAlpha = .7 * (1 - k); ctx.fillStyle = ORB.rim; ctx.beginPath(); ctx.ellipse(this.x, y, dr, dr * .75, 0, Math.PI, TAU); ctx.fill();
    ctx.globalAlpha = .8 * (1 - k); ctx.fillStyle = ORB.mid; ctx.beginPath(); ctx.ellipse(this.x, y, dr * .7, dr * .5, 0, Math.PI, TAU); ctx.fill();
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = ORB.core; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(this.x, y, 20 + 150 * k, (20 + 150 * k) * .32, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(this.x, y, 10 + 90 * k, (10 + 90 * k) * .32, 0, 0, TAU); ctx.stroke();
    // Rubble flying out in arcs.
    for (let n = 0; n < 14; n++) {
      const a = (n / 14) * Math.PI + .1; const sp = 90 + (n * 53) % 80; const tt = k * .7;
      const rx = this.x + Math.cos(a) * sp * tt * 2.2 * (n % 2 ? 1 : -1); const ry = y - Math.sin(a) * sp * tt * 3 + 420 * tt * tt;
      if (ry > y + 4) continue;
      ctx.globalAlpha = 1 - k * .6; ctx.fillStyle = n % 3 ? '#6d6253' : '#3e3730'; const sz = 3 + (n % 3) * 2;
      ctx.fillRect(Math.round(rx - sz / 2), Math.round(ry - sz / 2), sz, sz);
    }
    if (k < .4) drawSpiralOrb(ctx, this.x, y - 16, 26 * (1 - k * 2.5), this.t);
    ctx.restore();
    sparks(ctx, [[this.x, y - 10]], this.sig.mat, this.t, 4601, 14, 1 - k);
  }
}
// Purely visual crater (no slow zone): a dark bowl with a raised rim, radial cracks with
// a fading blue glow and rocks on the rim. Lies under every actor, fades after a few seconds.
class SpiralCrater {
  constructor(x, z) { this.x = x; this.z = z; this.t = 0; this.life = 4.5; this.isGroundDecal = true; this.isSpiralCrater = true; this.isFinished = false; }
  get y() { return groundYForDepth(this.z); }
  update(dt) { this.t += dt; if (this.t >= this.life) this.isFinished = true; }
  render(ctx) {
    const a = Math.min(1, this.t / .05) * Math.min(1, (this.life - this.t) / 1.2); if (a <= 0) return;
    const x = this.x; const y = this.y; const R = 62;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#8a7a66'; ctx.beginPath(); ctx.ellipse(x, y, R + 8, (R + 8) * .34, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b241e'; ctx.beginPath(); ctx.ellipse(x, y + 1, R, R * .3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#16120f'; ctx.beginPath(); ctx.ellipse(x, y + 3, R * .55, R * .16, 0, 0, TAU); ctx.fill();
    // Radial cracks out of the bowl.
    const glow = Math.max(0, 1 - this.t / 2.5);
    for (let n = 0; n < 9; n++) {
      const ang = n / 9 * TAU + .3; const L = R + 22 + (n * 29) % 34;
      const pts = [[x + Math.cos(ang) * R * .9, y + Math.sin(ang) * R * .28], [x + Math.cos(ang + .12) * (R + L) * .5 + Math.cos(ang) * R * .3, y + Math.sin(ang + .12) * (R + L) * .16], [x + Math.cos(ang - .05) * L * 1.15, y + Math.sin(ang - .05) * L * .36]];
      ctx.strokeStyle = '#1f1a15'; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      if (glow > 0) { ctx.globalAlpha = a * glow; ctx.strokeStyle = ORB.mid; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = a; }
    }
    // Rocks on the rim.
    ctx.fillStyle = '#5d5246';
    for (let n = 0; n < 8; n++) { const ang = n / 8 * TAU + .7; const rx = x + Math.cos(ang) * (R + 4); const ry = y + Math.sin(ang) * (R + 4) * .32; const sz = 4 + (n % 3) * 2; ctx.fillRect(Math.round(rx - sz / 2), Math.round(ry - sz), sz, sz); }
    if (glow > 0) { ctx.globalAlpha = a * glow * .6; ctx.fillStyle = ORB.rim; ctx.beginPath(); ctx.ellipse(x, y + 3, R * .4, R * .1, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}
defineSignature('S46', {
  cast(c) {
    const p = c.caster; const rush = emit(new SpiralRush(c.sig, p, c.quality), c.quality);
    offerRecast(p, { window: 2.5, label: 'SPRUNG & EINSCHLAG', valid: () => !rush.victim || alive(rush.victim), stage2: (gw) => {
      const v = rush.victim && alive(rush.victim) ? rush.victim : nearestAhead(gw, p, 260);
      if (!v) return false;
      // Appear high above the foe (clearly visible), hang for a beat, then smash down.
      teleport(p, v.x - (p.facing || 1) * 6, v.z ?? p.z, gw, ORB.mid);
      const hoverH = Math.max(170, (v.elevation ?? 0) + 120);
      p.grounded = false; p.elevation = hoverH; p.vElevation = 0; p.state = 'dive'; p.stateTimer = .5;
      combat.spawnShockwave(p.x, groundYForDepth(p.z) - hoverH - 40, 46, ORB.core);
      emit(new SpiralSlam(c.sig, p, v, c.quality, hoverH), c.quality);
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
    if (spellSheetReady('seal_trap')) {
      if (this.fired) { const k = (this.t - this.firedT) / .55; if (spellSheetReady('fire_explosion') && k < 1) drawSpellSprite(ctx, 'fire_explosion', Math.min(9, Math.floor(k * 10)), this.x, y - 20, { anchor: 'center', scale: this.big ? 2.2 : 1.5 }); return; }
      const pulse = .5 + .5 * Math.sin(this.t * (this.manual ? 6 : 3)); drawSpellSprite(ctx, 'seal_trap', this.manual ? 1 : 0, this.x, y, { anchor: 'center', alpha: .75 + .25 * pulse, scale: .5 }); return;
    }
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
      st.charges--; st.flash = .3; p._sigDodged = true; // no knockback / stagger either
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
      if (spellSheetReady('shadow_charge')) { for (let i = 0; i < st.charges; i++) { const a = st.t * 2 + i * TAU / 3; drawSpellSprite(ctx, 'shadow_charge', Math.floor(st.t * 8 + i) % 4, p.x + Math.cos(a) * 22, ry - 50 + Math.sin(a) * 26, { anchor: 'center', scale: .5 }); } if (st.flash > 0 && spellSheetReady('shadow_burst')) drawSpellSprite(ctx, 'shadow_burst', Math.min(7, Math.floor((1 - st.flash * 2) * 8)), p.x, ry + 2, { scale: 1.4 }); return; }
      for (let i = 0; i < st.charges; i++) { const a = st.t * 2 + i * TAU / 3; const x = p.x + Math.cos(a) * 22; const y = ry - 50 + Math.sin(a) * 26; ctx.save(); ctx.fillStyle = '#311b92'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b39ddb'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
      if (st.flash > 0) plate(ctx, [[p.x - 14, ry - 80], [p.x + 14, ry - 80], [p.x + 14, ry], [p.x - 14, ry]], { kind: 'smoke', dark: '#1a0f33', body: '#4527a0', facet: '#b39ddb', vein: '#b39ddb', edge: '#ede7f6', spark: '#ede7f6', core: '#ffffff', glow: 'rgba(179,157,219,', edgeGlow: 'rgba(237,231,246,' }, 4801, { alpha: st.flash * 2 });
    }
  }
});

// ── S49 Flutstrahl ───────────────────────────────────────────────────────
// Stage 1: a pressure jet of water pushes foes back, soaks them and leaves
// puddles. Stage 2 (within 5 s): everything soaked freezes, the puddles turn to ice.
import { environment } from './environment.js';
import { applyStatus } from './status_effects.js';
const WATER = { dark: '#0b3d73', body: '#1f7fd1', mid: '#2fb4ea', foam: '#d6f6ff', ice: '#e3faff' };
class FloodJet {
  constructor(sig, owner) { this.sig = sig; this.owner = owner; this.team = owner.team; this.f = owner.facing || 1; this.x = owner.x; this.z = owner.z; this.t = 0; this.dur = .6; this.soaked = new Set(); this.puddles = []; this.isFinished = false; this.frozenAt = null; }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt;
    if (this.t < this.dur) {
      const reach = 30 + 250 * Math.min(1, this.t / .3);
      for (const t of foesOf(gw, this.team)) { if (t.isProp) continue; const dx = (t.x - this.x) * this.f; if (dx > 10 && dx < reach && Math.abs(((t.z ?? this.z) - this.z) * DEPTH) < 22) { if (!this.soaked.has(t)) { this.soaked.add(t); hit(t, 10, this.f * 260, 30, .3); applyStatus(t, 'wet'); } t.slow?.(.3, .7); } }
      if (this.puddles.length < 4 && this.t > this.puddles.length * .12) { const px = this.x + this.f * (60 + this.puddles.length * 60); this.puddles.push(px); environment.add('water', px, this.z, { radius: 30 }); }
    }
    if (this.frozenAt != null && this.t - this.frozenAt > .6) this.isFinished = true;
    if (this.t > 5.5) this.isFinished = true;
  }
  freeze(gw) {
    this.frozenAt = this.t;
    for (const t of this.soaked) if (alive(t)) { t.freeze?.(1.4); t.slow?.(2, .5); hit(t, 18, 0, 0, 1.4); }
    for (const px of this.puddles) environment.add('ice', px, this.z, { radius: 34 });
    combat.shakeCamera(6, .2); audio.playImpact?.(true);
  }
  render(ctx) {
    const y = this.y - 40; const f = this.f;
    if (this.t < this.dur) {
      const reach = 30 + 250 * Math.min(1, this.t / .3); const fade = this.t > this.dur - .15 ? (this.dur - this.t) / .15 : 1;
      const x0 = this.owner.x + f * 16; const x1 = this.x + f * reach;
      if (spellSheetReady('water_jet')) {
        const L = Math.abs(x1 - x0); ctx.save(); ctx.globalAlpha = fade; ctx.translate(Math.round(x0), Math.round(y)); ctx.scale(f, 1); ctx.beginPath(); ctx.rect(0, -16, L, 32); ctx.clip();
        for (let dd = 0; dd < L; dd += 48) drawSpellSprite(ctx, 'water_jet', Math.floor(this.t * 14) % 6, dd + 24, 0, { anchor: 'center' });
        ctx.restore();
        if (spellSheetReady('water_splash')) drawSpellSprite(ctx, 'water_splash', Math.floor(this.t * 14) % 6, x1, y + 6, { anchor: 'center', flip: f < 0 });
      } else {
      ctx.save(); ctx.globalAlpha = fade; ctx.lineCap = 'round';
      for (const [w, c] of [[14, WATER.dark], [10, WATER.body], [6, WATER.mid], [2, WATER.foam]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y); for (let i = 1; i <= 10; i++) { const u = i / 10; ctx.lineTo(x0 + (x1 - x0) * u, y + Math.sin(this.t * 30 + i) * 2 * u + u * 6); } ctx.stroke(); }
      ctx.fillStyle = WATER.foam; for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x1 + f * (i * 3 - 6)), Math.round(y + 4 + Math.sin(this.t * 40 + i) * 6), 3, 3);
      ctx.restore();
      }
    }
    // Soaked foes drip; after the freeze an ice block encloses them.
    for (const t of this.soaked) {
      if (!alive(t)) continue; const ty = (t.y ?? this.y) - 30;
      if (this.frozenAt == null) { ctx.save(); ctx.fillStyle = WATER.mid; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(t.x - 8 + i * 8), Math.round(ty + ((this.t * 60 + i * 9) % 26)), 2, 3); ctx.restore(); }
      else { const k = Math.min(1, (this.t - this.frozenAt) / .15); plate(ctx, [[t.x - 16, ty + 30], [t.x - 18, ty - 30 * k], [t.x + 18, ty - 34 * k], [t.x + 16, ty + 30]], { kind: 'crystal', dark: '#1c3c52', body: '#8fd8ff', facet: WATER.ice, vein: '#bff0ff', edge: '#ffffff', spark: '#ffffff', core: '#ffffff', glow: 'rgba(143,216,255,', edgeGlow: 'rgba(255,255,255,' }, 4901, { alpha: .75, glowEdge: 1 }); }
    }
  }
}
defineSignature('S49', {
  cast(c) {
    const p = c.caster; const jet = emit(new FloodJet(c.sig, p), c.quality);
    offerRecast(p, { window: 5, label: 'EINFRIEREN', valid: () => !jet.isFinished && jet.frozenAt == null, stage2: (gw) => jet.freeze(gw) });
  }
});
// Hand-drawn rune objects (rounds 7–10) render at fine density, not through the coarse pixel layer.
for (const C of [MarkedKunai, SealTrap, FloodJet]) Object.defineProperty(C.prototype, 'fineVfx', { value: true, writable: true, configurable: true });
