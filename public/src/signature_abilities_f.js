// GRIMGE Prototype — signature specials S50–S52 (user, 20 Oct 2026: "solche
// effekte und spells braucht es, die ordentlich krachen — aber nicht immer im
// selben Stil"):
//   S50 SPIEGELKERKER  (after Haku's crystal ice mirrors) an ice shard flies
//                      ahead; the first hit raises six ice mirrors around the
//                      foe. Unguarded it is lifted and held inside (prison);
//                      guarded the mirrors only fence it in. Each further tap:
//                      a mirror image dashes out of a mirror through the foe
//                      (4×), the 5th tap: all mirrors at once (mirror storm).
//   S51 BLUTKREUZ      (War of Wizards voodoo + a blood ritual circle) a blood
//                      circle on the ground; a foe that steps in is bound to a
//                      cross — then mash the slot: the faster, the harder each
//                      blood spike hits. Ends with a burst scaled by the taps.
//   S52 HERAUSFORDERUNG (tank) a war cry: nearby foes are taunted — minions
//                      and the enemy Wizard go only for you — while you take
//                      30 % less damage.
import { defineSignature, startStance, endStance, emit, foesOf, groundDist, hit, plate, thread, sparks, TAU, DEPTH } from './signature_core.js';
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
import { offerRecast } from './recast.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { ghostOf } from './buff_signatures.js';

const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;
// Painter depth relative to a (possibly lifted) victim — its y already includes the lift.
const depthAround = (ownZ, victim, side) => { const own = groundYForDepth(ownZ); const vy = victim?.y; if (!Number.isFinite(vy)) return 0; return own - (side < 0 ? Math.min(own, vy - 1) : Math.max(own, vy + 1)); };
// Hold a foe in place (optionally in the air) — used by the prison and the cross.
function holdFoe(t, x, z, elevation = null) {
  t.x = x; if (Number.isFinite(t.z)) t.z = z;
  t.vx = 0; t.vz = 0; t.kbVelX = 0; t.kbVelZ = 0;
  if (elevation != null) { t.elevation = elevation; t.vElevation = 0; }
  t.freeze?.(.12);
}

// ── S50 Spiegelkerker ────────────────────────────────────────────────────
const ICE = { kind: 'crystal', dark: '#0d3b4f', body: '#7fd3ee', facet: '#d8f6ff', vein: '#bff0ff', edge: '#ffffff', spark: '#e0f7fa', core: '#ffffff', glow: 'rgba(127,211,238,', edgeGlow: 'rgba(255,255,255,' };
const MIRRORS = 6; const MIRROR_RX = 74; const MIRROR_RZ = 30; // ellipse around the foe (px)
const PRISON_LIFT = 54;

class MirrorShard {
  constructor(sig, owner, quality) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.quality = quality; this.f = owner.facing || 1;
    this.x = owner.x + this.f * 20; this.z = owner.z; this.dist = 0; this.range = 330; this.t = 0;
    this.prison = null; this.missed = false; this.isFinished = false;
  }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt;
    if (this.prison || this.missed) { if (this.t > .3 || this.prison) this.isFinished = true; return; }
    const step = 860 * dt; this.x += this.f * step; this.dist += step;
    const victim = foesOf(gw, this.team).find((t) => !t.isProp && Math.abs(t.x - this.x) < 24 && Math.abs(((t.z ?? this.z) - this.z) * DEPTH) < 24);
    if (victim) {
      const res = hit(victim, 16 * (this.quality?.power ?? 1), this.f * 40, 0, .5);
      const trapped = !(res?.blocked || res?.dodged || res?.ignored);
      this.prison = emit(new MirrorPrison(this.sig, this.owner, victim, trapped, this.quality), this.quality);
      combat.shakeCamera(6, .2); audio.playImpact?.(true);
    } else if (this.dist >= this.range) { this.missed = true; this.t = 0; combat.spawnHitSparks?.(this.x, this.y - 40, this.f, ICE.edge, 8); }
  }
  get fineVfx() { return spellSheetReady('ice_shard_bolt'); }
  render(ctx) {
    if (this.prison || this.missed) return;
    const y = this.y - 42; const f = this.f;
    if (spellSheetReady('ice_shard_bolt')) { drawSpellSprite(ctx, 'ice_shard_bolt', Math.floor(this.t * 20) % 2, this.x - f * 14, y, { anchor: 'center', flip: f < 0 }); return; }
    plate(ctx, [[this.x - f * 18, y - 4], [this.x + f * 10, y - 6], [this.x + f * 22, y], [this.x + f * 10, y + 6], [this.x - f * 18, y + 4]], ICE, 5001, { alpha: 1, glowEdge: 1.2 });
    thread(ctx, [[this.x - f * 70, y], [this.x - f * 18, y]], ICE.vein, 3, .55);
  }
}

class MirrorPrison {
  constructor(sig, owner, victim, trapped, quality) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.victim = victim; this.trapped = trapped; this.quality = quality;
    this.cx = victim.x; this.cz = victim.z ?? owner.z; this.t = 0; this.taps = 0; this.dashes = []; this.storm = null; this.isFinished = false; this.endT = null;
    this.life = trapped ? 9 : 3.5; // a guarded foe is only fenced in briefly
    // Draw order: the back mirrors behind the foe, the front ones in front of it.
    emit(new MirrorLayer(this, false), quality); emit(new MirrorLayer(this, true), quality);
  }
  get x() { return this.cx; } get z() { return this.cz + .001; } get y() { return groundYForDepth(this.cz); }
  get surfaceHeight() { return depthAround(this.z, this.victim, 1); }
  mirrorPos(i) { const a = -Math.PI / 2 + Math.PI / MIRRORS + i * TAU / MIRRORS; // offset: none straight in front of the foe
    return { x: this.cx + Math.cos(a) * MIRROR_RX, dz: Math.sin(a) * MIRROR_RZ, a }; }
  get active() { return !this.isFinished && this.endT == null; }
  update(dt, gw) {
    this.t += dt;
    const v = this.victim;
    if (this.endT != null) { if (this.t - this.endT > .45) this.isFinished = true; return; }
    if (!alive(v) || this.t > this.life) { this.shatter(); return; }
    if (this.trapped) {
      // Prison: lifted into the air and held between the mirrors.
      const lift = PRISON_LIFT * Math.min(1, this.t / .3) + Math.sin(this.t * 3) * 3;
      holdFoe(v, this.cx, this.cz, lift);
    } else {
      // Fence: the foe cannot leave the mirror ring.
      const dx = v.x - this.cx; const dz = ((v.z ?? this.cz) - this.cz) * DEPTH;
      const k = Math.hypot(dx / (MIRROR_RX - 14), dz / (MIRROR_RZ - 4));
      if (k > 1) { v.x = this.cx + dx / k; if (Number.isFinite(v.z)) v.z = this.cz + dz / k / DEPTH; v.kbVelX = 0; }
    }
    for (const d of this.dashes) {
      d.t += dt;
      if (!d.hit && d.t >= d.dur * .5) { d.hit = true; if (alive(v)) { hit(v, d.dmg, d.dir * 30, 0, .45); combat.spawnHitSparks?.(v.x, (v.y ?? this.y) - 40, d.dir, ICE.edge, 10); combat.triggerHitstop?.(2); } }
    }
    this.dashes = this.dashes.filter((d) => d.t < d.dur + .15);
    if (this.storm) {
      this.storm.t += dt;
      while (this.storm.next <= this.storm.t && this.storm.hits < 10) {
        this.storm.hits++; this.storm.next += .1;
        const i = this.storm.hits % MIRRORS; const o = (i + 3) % MIRRORS; this.dashes.push({ from: i, to: o, t: 0, dur: .16, dir: Math.sign(this.mirrorPos(o).x - this.mirrorPos(i).x) || 1, dmg: 7 * (this.quality?.power ?? 1), hit: false });
      }
      if (this.storm.t > 1.25) { combat.shakeCamera(10, .3); this.shatter(); }
    }
  }
  // EISSPIEGEL-REIGEN (Fähigkeiten-Atlas II, user 24 Oct 2026: mash up to 8): taps 1–7 each send a mirror image
  // through the foe; the 8th is the mirror storm. Stop tapping and the mirrors shatter (splinters, more taps = more).
  tap() {
    if (!this.active) return false;
    this.taps++;
    if (this.taps <= 7) {
      const order = [0, 2, 4, 1, 3, 5, 0]; const i = order[this.taps - 1]; const o = (i + 3) % MIRRORS;
      this.dashes.push({ from: i, to: o, t: 0, dur: .18, dir: Math.sign(this.mirrorPos(o).x - this.mirrorPos(i).x) || 1, dmg: 12 * (this.quality?.power ?? 1), hit: false });
      audio.playSlash?.(1.3 + this.taps * .05);
      return { again: true, window: 1.2, label: this.taps < 7 ? `SPIEGELSPRUNG ${this.taps + 1}/8` : 'SPIEGELSTURM' };
    }
    this.storm = { t: 0, next: 0, hits: 0 }; this.life = this.t + 2;
    audio.playImpact?.(true);
    return true;
  }
  shatter() {
    if (this.endT != null) return;
    this.endT = this.t;
    const v = this.victim;
    if (alive(v) && this.trapped) { v.vElevation = -260; }
    // Splinters: every mirror bursts — the more taps were mashed, the harder the shards hit.
    for (const t of foesOf(globalThis.window?.gameWorld, this.team)) if (!t.isProp && Math.hypot(t.x - this.cx, ((t.z ?? this.cz) - this.cz) * DEPTH) < 80) hit(t, (6 + this.taps * 3) * (this.quality?.power ?? 1), Math.sign(t.x - this.cx || 1) * 160, 60, .3);
    for (let i = 0; i < MIRRORS; i++) { const m = this.mirrorPos(i); combat.spawnHitSparks?.(m.x, groundYForDepth(this.cz) + m.dz - 34, 1, ICE.edge, 6); }
    audio.playImpact?.(false);
  }
  renderMirrors(ctx, front) {
    const rise = Math.min(1, this.t / .25); const gone = this.endT != null ? Math.min(1, (this.t - this.endT) / .45) : 0;
    const p = this.owner;
    for (let i = 0; i < MIRRORS; i++) {
      const m = this.mirrorPos(i); if ((m.dz > 0) !== front) continue;
      const k = Math.max(0, Math.min(1, rise * 1.6 - i * .1)); if (k <= 0) continue;
      const by = groundYForDepth(this.cz) + m.dz; const h = (this.trapped ? 112 : 78) * k; const w = 15;
      // Hand-drawn mirror panes (art/authoring/vfx_runes2.cjs); front panes are see-through so the foe shows.
      if (spellSheetReady('ice_mirror')) {
        const sc = (this.trapped ? 1 : .72) * k;
        if (gone > 0) drawSpellSprite(ctx, 'ice_mirror_break', Math.min(4, Math.floor(gone * 5)), m.x, by, { scale: this.trapped ? 1 : .72, alpha: front ? .5 : 1 });
        else { drawSpellSprite(ctx, 'ice_mirror', Math.floor(this.t * 6 + i) % 4, m.x, by, { scale: sc, alpha: front ? .5 : 1, flip: m.x < this.cx }); if (k >= 1 && p?.heroKey) ghostOf(ctx, p, m.x, by - 112 * sc * .3, 'idle', p.animTime ?? 0, Math.sign(this.cx - m.x) || 1, .28, '#4fc3f7', .72); }
        continue;
      }
      // Shattering: the panel breaks into falling shards.
      if (gone > 0) { for (let s = 0; s < 4; s++) plate(ctx, [[m.x - 6 + s * 3, by - h * (.2 + s * .2) + gone * 50], [m.x + s * 3, by - h * (.3 + s * .2) + gone * 60], [m.x + 4 + s * 3, by - h * (.15 + s * .2) + gone * 55]], ICE, 5100 + i * 10 + s, { alpha: 1 - gone }); continue; }
      const skew = Math.cos(m.a) * 5;
      plate(ctx, [[m.x - w, by], [m.x - w + skew, by - h], [m.x + w + skew, by - h - 3], [m.x + w, by - 2]], ICE, 5010 + i, { alpha: front ? .62 : .8, glowEdge: 1.1 });
      // The caster's reflection inside every mirror (Haku style).
      if (k >= 1 && p?.heroKey) ghostOf(ctx, p, m.x + skew * .5, by - h * .25, 'idle', p.animTime ?? 0, Math.sign(this.cx - m.x) || 1, .28, '#4fc3f7', .72);
      // Sheen sweeping over the glass.
      const g = ((this.t * .7 + i * .17) % 1);
      ctx.save(); ctx.globalAlpha = .6; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(m.x - w + 4 + g * (w * 2 - 8)), Math.round(by - h + 8 + g * 20), 2, 18); ctx.restore();
    }
  }
  render(ctx) {
    if (this.endT != null) return;
    const p = this.owner; const v = this.victim;
    // Dashing mirror images (ice-tinted copies of the caster) with an afterimage trail.
    for (const d of this.dashes) {
      const a = this.mirrorPos(d.from); const b = this.mirrorPos(d.to); const k = Math.min(1, d.t / d.dur);
      const y0 = groundYForDepth(this.cz) + a.dz; const y1 = groundYForDepth(this.cz) + b.dz;
      const lift = this.trapped ? PRISON_LIFT * .7 : 0;
      for (let tr = 3; tr >= 0; tr--) {
        const kk = Math.max(0, k - tr * .08); const x = a.x + (b.x - a.x) * kk; const y = y0 + (y1 - y0) * kk - lift * Math.sin(kk * Math.PI);
        if (p?.heroKey) ghostOf(ctx, p, x, y, 'attack1', p.animTime ?? 0, d.dir, (tr ? .14 : .6) * (1 - Math.max(0, d.t - d.dur) / .15), tr ? '#4fc3f7' : '#b3e5fc');
      }
      if (d.hit && d.t < d.dur + .1 && alive(v)) { const vy = (v.y ?? this.y) - 40; thread(ctx, [[v.x - 26 * d.dir, vy + 10], [v.x + 26 * d.dir, vy - 10]], ICE.edge, 3, .9); }
    }
    // The held foe: frost ring under it.
    if (this.trapped && alive(v)) { ctx.save(); ctx.globalAlpha = .45; ctx.strokeStyle = ICE.vein; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(this.cx, groundYForDepth(this.cz), 30, 9, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  }
}
class MirrorLayer {
  constructor(prison, front) { this.prison = prison; this.front = front; this.isFinished = false; }
  get x() { return this.prison.cx; } get z() { return this.prison.cz + (this.front ? MIRROR_RZ / DEPTH * .8 : -MIRROR_RZ / DEPTH * .8); }
  get y() { return groundYForDepth(this.z); }
  get surfaceHeight() { return depthAround(this.z, this.prison.victim, this.front ? 1 : -1); }
  get fineVfx() { return spellSheetReady('ice_mirror'); }
  update() { if (this.prison.isFinished) this.isFinished = true; }
  render(ctx) { this.prison.renderMirrors(ctx, this.front); }
}
defineSignature('S50', {
  cast(c) {
    const p = c.caster; const shard = emit(new MirrorShard(c.sig, p, c.quality), c.quality);
    let announced = false;
    offerRecast(p, {
      window: 1.2, label: 'SPIEGEL…',
      valid: () => !shard.missed && (!shard.prison || shard.prison.active),
      poll: () => (shard.prison && !announced ? (announced = true, { window: 2.5, label: shard.prison.trapped ? 'SPIEGELSPRUNG 1/8' : 'SPIEGELSPRUNG 1/8 (GEBLOCKT)' }) : null),
      stage2: () => (shard.prison ? shard.prison.tap() : { again: true }),
      expire: () => shard.prison?.shatter()
    });
  }
});

// ── S51 Blutkreuz ────────────────────────────────────────────────────────
const BLOOD = { kind: 'crust', dark: '#1a0306', body: '#5c0a14', facet: '#8e1b2b', vein: '#d32f2f', edge: '#ff8a80', spark: '#ff5252', core: '#ffe0e0', glow: 'rgba(211,47,47,', edgeGlow: 'rgba(255,138,128,' };
const CIRCLE_R = 48; const BIND_TIME = 3.5;

class BloodCircle {
  constructor(sig, owner, x, z, quality) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.x = x; this.z = z; this.quality = quality;
    this.t = 0; this.life = 12; this.victim = null; this.bindT = null; this.taps = 0; this.lastTapT = null; this.spikes = []; this.burstT = null; this.isFinished = false;
    this.isGroundDecal = true;
  }
  get y() { return groundYForDepth(this.z); }
  get bound() { return this.bindT != null && this.burstT == null; }
  update(dt, gw) {
    this.t += dt;
    if (this.burstT != null) { if (this.t - this.burstT > .6) this.isFinished = true; return; }
    if (this.bindT == null) {
      if (this.t > this.life) { this.isFinished = true; return; }
      // The first foe that steps into the circle is bound to the cross.
      const v = foesOf(gw, this.team).find((t) => !t.isProp && Math.hypot(t.x - this.x, ((t.z ?? this.z) - this.z) * DEPTH * 2.6) < CIRCLE_R);
      if (v) { this.victim = v; this.bindT = this.t; emit(new BloodCrossFx(this), this.quality); combat.shakeCamera(8, .3); audio.playImpact?.(true); }
      return;
    }
    const v = this.victim;
    if (!alive(v)) { this.burst(); return; }
    holdFoe(v, this.x, this.z, 22 * Math.min(1, (this.t - this.bindT) / .3));
    for (const s of this.spikes) s.t += dt;
    this.spikes = this.spikes.filter((s) => s.t < .35);
    if (this.t - this.bindT >= BIND_TIME) this.burst();
  }
  // Mashing: the shorter the gap since the last tap, the harder the spike.
  tap() {
    if (!this.bound) return { again: true };
    const gap = this.lastTapT == null ? .45 : this.t - this.lastTapT; this.lastTapT = this.t; this.taps++;
    const speed = Math.max(0, Math.min(1, (.45 - gap) / .33));
    const dmg = Math.round((4 + 12 * speed) * (this.quality?.power ?? 1));
    const v = this.victim;
    hit(v, dmg, 0, 0, .3);
    this.spikes.push({ t: 0, a: -Math.PI / 2 + (this.taps % 2 ? 1 : -1) * (.5 + (this.taps * 37 % 40) / 100), dmg, speed });
    audio.playSlash?.(1.6 + speed * .4);
    const left = Math.max(.05, BIND_TIME - (this.t - this.bindT));
    return { again: true, window: left, label: `SCHNELL! ×${this.taps}` };
  }
  burst() {
    if (this.burstT != null) return;
    this.burstT = this.t;
    const v = this.victim;
    if (v && alive(v)) { hit(v, (10 + this.taps * 2) * (this.quality?.power ?? 1), Math.sign(v.x - this.owner.x || 1) * 200, 180, .6, true); v.vElevation = Math.max(v.vElevation ?? 0, 120); }
    if (this.bindT != null) combat.shakeCamera(10, .35);
  }
  render(ctx) {
    // Ground circle with an inverted triangle and runes; it pulses while armed.
    const fade = this.burstT != null ? 1 - (this.t - this.burstT) / .6 : Math.min(1, this.t / .3);
    const pulse = this.bindT == null ? .6 + .4 * Math.sin(this.t * 5) : 1;
    const x = this.x; const y = this.y; const R = CIRCLE_R; const ry = R * .38;
    ctx.save(); ctx.globalAlpha = Math.max(0, fade);
    if (this.bound) { ctx.globalAlpha *= .35; ctx.fillStyle = '#4a0008'; ctx.beginPath(); ctx.ellipse(x, y, R * 2.4, R * .95, 0, 0, TAU); ctx.fill(); ctx.globalAlpha /= .35; }
    ctx.strokeStyle = BLOOD.vein; ctx.lineWidth = 3; ctx.globalAlpha *= pulse;
    ctx.beginPath(); ctx.ellipse(x, y, R, ry, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, R * .82, ry * .82, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - R * .7, y - ry * .5); ctx.lineTo(x + R * .7, y - ry * .5); ctx.lineTo(x, y + ry * .8); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = BLOOD.edge; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + this.t * .4; ctx.fillRect(Math.round(x + Math.cos(a) * R * .91) - 1, Math.round(y + Math.sin(a) * ry * .91) - 1, 3, 2); }
    ctx.restore();
  }
}
// The cross behind the bound foe, the blood spikes and the tap counter in front of it.
class BloodCrossFx {
  constructor(circle) { this.circle = circle; this.isFinished = false; }
  get x() { return this.circle.x; } get z() { return this.circle.z + .002; } get y() { return groundYForDepth(this.circle.z); }
  get surfaceHeight() { return depthAround(this.z, this.circle.victim, 1); }
  update() { if (this.circle.isFinished) this.isFinished = true; }
  render(ctx) {
    const c = this.circle; const v = c.victim; if (!v) return;
    const fade = c.burstT != null ? Math.max(0, 1 - (c.t - c.burstT) / .6) : 1;
    const grow = Math.min(1, (c.t - c.bindT) / .3); const base = groundYForDepth(c.z); const vy = base - (v.elevation ?? 0);
    // Dark ritual sky over the scene: a black moon with a red rim.
    ctx.save(); ctx.globalAlpha = .55 * fade * grow; ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(c.x, base - 190, 26, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    // Chains from the cross bar to the wrists.
    const barY = vy - 62 * grow; const half = 34;
    ctx.save(); ctx.globalAlpha = fade;
    ctx.strokeStyle = '#8e1b2b'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(c.x + s * half, barY); ctx.lineTo(c.x + s * 12, vy - 52); ctx.stroke(); }
    ctx.setLineDash([]); ctx.restore();
    // Blood spikes stabbing in from the ground (one per tap); harder taps → longer, brighter.
    for (const s of c.spikes) {
      const k = Math.min(1, s.t / .08); const a = 1 - Math.max(0, s.t - .15) / .2; const L = (50 + 40 * s.speed) * k;
      const tx = v.x; const ty = vy - 38; const bx = tx - Math.cos(s.a) * L; const by = ty - Math.sin(s.a) * L;
      plate(ctx, [[bx - 3, by], [tx, ty], [bx + 3, by]], BLOOD, 5200 + Math.round(s.a * 10), { alpha: Math.max(0, a), glowEdge: .8 + s.speed });
    }
    if (c.bound && c.taps) { ctx.save(); ctx.font = '900 14px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff5252'; ctx.strokeStyle = '#1a0306'; ctx.lineWidth = 3; ctx.strokeText(`×${c.taps}`, v.x + 30, vy - 80); ctx.fillText(`×${c.taps}`, v.x + 30, vy - 80); ctx.restore(); }
    if (c.burstT != null) sparks(ctx, [[c.x, vy - 40]], BLOOD, c.t, 5250, 14, fade);
  }
}
class BloodCrossBeam {
  // The cross itself stands BEHIND the foe.
  constructor(circle) { this.circle = circle; this.isFinished = false; }
  get x() { return this.circle.x; } get z() { return this.circle.z - .002; } get y() { return groundYForDepth(this.z); }
  get surfaceHeight() { return depthAround(this.z, this.circle.victim, -1); }
  update() { if (this.circle.isFinished) this.isFinished = true; }
  render(ctx) {
    const c = this.circle; if (c.bindT == null) return;
    const fade = c.burstT != null ? Math.max(0, 1 - (c.t - c.burstT) / .6) : 1;
    const grow = Math.min(1, (c.t - c.bindT) / .3); const base = groundYForDepth(c.z);
    const top = base - 104 * grow; const barY = base - (22 + 62) * grow;
    plate(ctx, [[c.x - 5, base], [c.x - 5, top], [c.x + 5, top - 2], [c.x + 5, base]], BLOOD, 5301, { alpha: fade, glowEdge: .9 });
    plate(ctx, [[c.x - 38, barY - 4], [c.x + 38, barY - 6], [c.x + 38, barY + 4], [c.x - 38, barY + 6]], BLOOD, 5302, { alpha: fade, glowEdge: .9 });
  }
}
defineSignature('S51', {
  cast(c) {
    const p = c.caster; const x = c.target?.x ?? p.x + (p.facing || 1) * 140; const z = c.target?.z ?? p.z;
    const circle = emit(new BloodCircle(c.sig, p, x, z, c.quality), c.quality);
    emit(new BloodCrossBeam(circle), c.quality);
    let announced = false;
    offerRecast(p, {
      window: circle.life, label: 'WARTET AUF EIN OPFER',
      valid: () => !circle.isFinished && circle.burstT == null,
      poll: () => (circle.bindT != null && !announced ? (announced = true, { window: BIND_TIME, label: 'SCHNELL DRÜCKEN!' }) : null),
      stage2: () => circle.tap()
    });
  }
});

// ── S52 Herausforderung ──────────────────────────────────────────────────
const CRY = { kind: 'crust', dark: '#2a0d05', body: '#b71c1c', facet: '#ff7043', vein: '#ffca28', edge: '#fff3c4', spark: '#ffd54f', core: '#ffffff', glow: 'rgba(255,202,40,', edgeGlow: 'rgba(255,243,196,' };
const TAUNT_RADIUS = 280; const TAUNT_TIME = 4;
defineSignature('S52', {
  cast(c) {
    const p = c.caster; const gw = globalThis.window?.gameWorld;
    const taunted = foesOf(gw, p.team).filter((t) => !t.isProp && groundDist(t, p) < TAUNT_RADIUS);
    for (const t of taunted) { t.tauntedBy = p; t.tauntTimer = TAUNT_TIME; }
    combat.shakeCamera(8, .3); audio.playImpact?.(true);
    combat.spawnShockwave(p.x, (p.y ?? 0) - 40, 120, CRY.vein); combat.spawnShockwave(p.x, (p.y ?? 0) - 40, 70, CRY.body);
    startStance(p, 'S52', c.quality, { taunted, ring: 0 });
  },
  stance: {
    duration: TAUNT_TIME,
    hint: 'HERAUSGEFORDERT: GEGNER GREIFEN NUR DICH AN · 30 % WENIGER SCHADEN',
    update(p, st, dt) {
      st.ring += dt;
      for (const t of st.taunted) if (t.tauntedBy === p) { t.tauntTimer = Math.max(0, (t.tauntTimer ?? 0) - dt); if (t.tauntTimer <= 0) t.tauntedBy = null; }
    },
    end(p, st) { for (const t of st.taunted) if (t.tauntedBy === p) { t.tauntTimer = 0; t.tauntedBy = null; } },
    damageTaken(p, st, amount) { return amount * .7; },
    render(ctx, p, st, ry, layer) {
      if (layer !== 'front') return;
      // War banner sigil over the head and a gold pulse ring.
      const k = (st.ring * 1.5) % 1;
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = CRY.vein; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, ry - 2, 24 + 40 * k, (24 + 40 * k) * .32, 0, 0, TAU); ctx.stroke(); ctx.restore();
      plate(ctx, [[p.x - 9, ry - 108], [p.x + 9, ry - 110], [p.x + 9, ry - 94], [p.x, ry - 88], [p.x - 9, ry - 94]], CRY, 5401, { alpha: .95, glowEdge: 1.1 });
      // A red line from every taunted foe to the challenger, "!" above them.
      for (const t of st.taunted) {
        if (t.tauntedBy !== p || !alive(t)) continue;
        const ty = (t.y ?? ry);
        thread(ctx, [[t.x, ty - 60], [p.x, ry - 60]], '#ff5252', 1.5, .35);
        ctx.save(); ctx.font = '900 16px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff5252'; ctx.strokeStyle = '#2a0d05'; ctx.lineWidth = 3; ctx.strokeText('!', t.x, ty - 92); ctx.fillText('!', t.x, ty - 92); ctx.restore();
      }
    }
  }
});
