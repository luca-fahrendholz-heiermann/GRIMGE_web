// GRIMGE Prototype — S74 TRUGBILD (user, 20 Oct 2026: "Gedankenspiegelung /
// Illusion — der Gegner sieht falsche Positionen, Treffer auf die Illusion
// zerplatzen"; adapted from genjutsu ideas, own look).
//   Three doubles of the Wizard appear around him and copy his look. Foes nearby
//   are deceived: minions and the AI Wizard go for a double instead. A double that
//   is hit bursts into mist and the attacker is confused for a moment (then picks
//   the next one). Tap again: TAUSCH — swap places with the double farthest from
//   the foes (escape) — the double takes your old spot.
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
import { defineSignature, emit, foesOf, TAU, DEPTH } from './signature_core.js';
import { offerRecast } from './recast.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { sprites } from './sprites.js';

export const TRUG = Object.freeze({ life: 5, count: 3, deceiveRange: 420, confuse: .6 });
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;

// One double: looks like the caster, can be attacked, bursts when hit.
export class IllusionDouble {
  constructor(owner, x, z, seed) { this.owner = owner; this.team = owner.team; this.x = x; this.z = Math.max(.04, Math.min(.96, z)); this.seed = seed; this.isAlive = true; this.isDead = false; this.lifeState = 'Alive'; this.hp = 1; this.maxHp = 1; this.isIllusion = true; this.burstT = null; this.elevation = 0; this.surfaceHeight = 0; this.facing = owner.facing || 1; this.hitRadiusX = 16; this.hitRadiusZ = .2; this.state = 'idle'; this.isGuarding = false; }
  get y() { return groundYForDepth(this.z); }
  get worldHeight() { return 0; }
  takeDamage() { this.burst(); return { illusion: true }; }
  takeHazardDamage() {}
  freeze() {} slow() {}
  burst() {
    if (!this.isAlive) return;
    this.isAlive = false; this.isDead = true; this.lifeState = 'Dead'; this.burstT = 0;
    combat.spawnShockwave?.(this.x, this.y - 40, 40, '#e1bee7');
    combat.spawnDamageText?.(this.x, this.y - 90, 'TRUGBILD!', { color: '#e1bee7', isCrit: true });
    audio.playSlash?.(1.8);
  }
}

// Render the caster at the double's spot (position, facing) and restore everything afterwards.
function drawAs(ctx, p, d, alpha) {
  const keep = { x: p.x, z: p.z, elevation: p.elevation, surfaceHeight: p.surfaceHeight, facing: p.facing };
  p.x = d.x; p.z = d.z; p.elevation = 0; p.surfaceHeight = 0; p.facing = d.facing;
  ctx.save(); ctx.globalAlpha *= alpha;
  try { if (typeof p.render === 'function') p.render(ctx); else sprites.renderEntity(ctx, p.heroKey, d.x, d.y, { facing: d.facing, state: 'idle', animTime: p.animTime ?? 0, alpha }); }
  finally { ctx.restore(); Object.assign(p, keep); }
}

export class Mirage {
  constructor(sig, owner, quality, gw) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.quality = quality; this.t = 0; this.life = TRUG.life * (quality?.duration ?? 1); this.isFinished = false;
    const offs = [[-90, -.1], [95, .08], [25, .2]];
    this.doubles = offs.slice(0, TRUG.count).map(([dx, dz], i) => new IllusionDouble(owner, owner.x + dx, owner.z + dz, i));
    this.deceived = new Set();
    this.deceive(gw);
  }
  get x() { return this.owner.x; } get z() { return this.owner.z; } get y() { return groundYForDepth(this.z); }
  living() { return this.doubles.filter((d) => d.isAlive); }
  // Point every foe in range at a (different) living double.
  deceive(gw) {
    const pool = this.living(); if (!pool.length) return;
    let i = 0;
    for (const f of foesOf(gw, this.team)) {
      if (f.isProp || Math.hypot(f.x - this.owner.x, ((f.z ?? this.owner.z) - this.owner.z) * DEPTH) > TRUG.deceiveRange) continue;
      const d = pool[i++ % pool.length];
      f.tauntedBy = d; f.tauntTimer = this.life - this.t; f.deceivedBy = d; f.deceiveTimer = this.life - this.t;
      this.deceived.add(f);
    }
  }
  update(dt, gw) {
    this.t += dt;
    const p = this.owner;
    for (const d of this.doubles) { if (d.burstT != null) d.burstT += dt; else { d.facing = p.facing; d.x += Math.sin(this.t * 1.3 + d.seed * 2) * 8 * dt; } }
    // A foe whose double burst is confused, then turns to the next double (or the real one).
    for (const f of this.deceived) {
      if (f.deceivedBy && !f.deceivedBy.isAlive) {
        f.freeze?.(TRUG.confuse);
        const next = this.living()[0] ?? null;
        f.deceivedBy = next; f.tauntedBy = next; if (!next) { f.tauntTimer = 0; f.deceiveTimer = 0; }
      }
    }
    if (this.t >= this.life || !alive(p) || (!this.living().length && this.doubles.every((d) => (d.burstT ?? 0) > .5))) this.end();
  }
  // Stage 2: swap places with the double farthest from the foes.
  swap(gw) {
    const pool = this.living(); if (!pool.length) return false;
    const foes = foesOf(gw, this.team);
    const score = (d) => Math.min(...foes.map((f) => Math.hypot(f.x - d.x, ((f.z ?? d.z) - d.z) * DEPTH)), 9999);
    const best = pool.sort((a, b) => score(b) - score(a))[0];
    const p = this.owner; const ox = p.x; const oz = p.z;
    combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 30, '#e1bee7');
    p.x = best.x; p.z = best.z; gw?.battlefield?.placeOnSurface?.(p); p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, .25);
    best.x = ox; best.z = oz;
    combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 36, '#e1bee7'); audio.playSlash?.(1.5);
    return true;
  }
  end() {
    if (this.isFinished) return;
    this.isFinished = true;
    for (const f of this.deceived) if (f.deceivedBy?.isIllusion || f.tauntedBy?.isIllusion) { f.deceivedBy = null; f.tauntedBy = null; f.tauntTimer = 0; f.deceiveTimer = 0; }
    for (const d of this.doubles) if (d.isAlive) { d.isAlive = false; d.isDead = true; d.lifeState = 'Dead'; }
  }
  // The doubles are actors in the painter's order (sharp, like the real Wizard —
  // the spell layer is pixelated VFX).
  actorEntries() {
    if (this.isFinished || !this.owner?.heroKey) return [];
    return this.living().map((d) => ({ y: d.y, render: (ctx) => this.renderDouble(ctx, d) }));
  }
  // A double is drawn through the caster's OWN render path (same sprite scale, weapon,
  // aura, health bar, slot orbs): for the foes it is indistinguishable.
  renderDouble(ctx, d) {
    const p = this.owner; if (this._drawing) return;
    this._drawing = true; // the owner's render must never re-enter this one
    try {
      const fadeIn = Math.min(1, this.t / .25) * Math.min(1, (this.life - this.t) / .3);
      drawAs(ctx, p, d, fadeIn);
      // Only the caster knows: a faint violet glint at the double's feet.
      if (p === globalThis.window?.gameWorld?.player) {
        ctx.save(); ctx.globalAlpha = .35 + .2 * Math.sin(this.t * 4 + d.seed); ctx.strokeStyle = '#e1bee7'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(d.x, d.y + 1, 12, 3.5, 0, 0, TAU); ctx.stroke(); ctx.restore();
      }
    } finally { this._drawing = false; }
  }
  // The spell layer only draws the mist where doubles burst.
  render(ctx) {
    for (const d of this.doubles) {
      if (d.burstT == null) continue;
      const k = Math.min(1, d.burstT / .5); if (k >= 1) continue;
      if (spellSheetReady('mist_puff')) { drawSpellSprite(ctx, 'mist_puff', Math.min(5, Math.floor(k * 6)), d.x, (d.y ?? groundYForDepth(d.z)) - 40, { anchor: 'center', scale: 1.4 }); continue; }
      ctx.save(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ctx.globalAlpha = .55 * (1 - k); ctx.fillStyle = '#e1bee7'; ctx.beginPath(); ctx.arc(d.x + Math.cos(a) * 26 * k, d.y - 40 + Math.sin(a) * 20 * k, 12, 0, TAU); ctx.fill(); } ctx.restore();
    }
  }
}
defineSignature('S74', {
  cast(c) {
    const p = c.caster; const gw = globalThis.window?.gameWorld;
    const mirage = emit(new Mirage(c.sig, p, c.quality, gw), c.quality);
    combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 70, '#e1bee7');
    offerRecast(p, { window: mirage.life, label: 'TAUSCH', valid: () => !mirage.isFinished && mirage.living().length > 0, stage2: (game) => mirage.swap(game) });
  }
});
// Hand-drawn rune objects (rounds 7–10) render at fine density, not through the coarse pixel layer.
for (const C of [Mirage]) Object.defineProperty(C.prototype, 'fineVfx', { value: true, writable: true, configurable: true });
