// GRIMGE Prototype — S54 SCHATTENBINDUNG (user, 20 Oct 2026, after Shikamaru's
// shadow possession; own look). Control instead of damage:
//   stage 1  a shadow strip crawls from the caster's feet along the ground (it
//            leans toward the nearest foe in depth, limited reach; jumping
//            dodges it). A caught foe is bound for 3 s: it copies every move of
//            the caster — walking, facing, jumping — and cannot act itself.
//            Lead it into a trap, a domain or off the battlements.
//   stage 2  tap again: SCHATTENWÜRGEN — shadow hands climb up the foe, deal
//            damage and end the binding.
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
import { defineSignature, emit, foesOf, hit, plate, TAU, DEPTH } from './signature_core.js';
import { offerRecast } from './recast.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';

export const SHADOW = Object.freeze({ speed: 420, reach: 330, bind: 3, strangle: 30, airDodge: 22 });
// Strangling hands: lighter violet so they read against dark clothing.
const HANDS = { kind: 'smoke', dark: '#120c22', body: '#3a2d5c', facet: '#7b64b8', vein: '#9d8bd6', edge: '#e2d9ff', spark: '#e2d9ff', core: '#ffffff', glow: 'rgba(157,139,214,', edgeGlow: 'rgba(226,217,255,' };
const INK = { kind: 'smoke', dark: '#000000', body: '#0b0b12', facet: '#2b2340', vein: '#5e4b8b', edge: '#9d8bd6', spark: '#c5b8f0', core: '#ffffff', glow: 'rgba(94,75,139,', edgeGlow: 'rgba(157,139,214,' };
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;

export class ShadowBind {
  constructor(sig, owner, quality) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.quality = quality; this.f = owner.facing || 1;
    this.ox = owner.x; this.oz = owner.z; this.tipX = owner.x; this.tipZ = owner.z; this.dist = 0; this.t = 0;
    this.victim = null; this.bindT = null; this.lastX = owner.x; this.lastZ = owner.z; this.lastElev = 0;
    this.strangleT = null; this.missedT = null; this.isFinished = false; this.isGroundDecal = true; this.trail = [];
  }
  get x() { return this.tipX; } get z() { return this.tipZ; } get y() { return groundYForDepth(this.tipZ); }
  get bound() { return this.bindT != null && this.strangleT == null && this.endT == null; }
  update(dt, gw) {
    this.t += dt; const p = this.owner;
    if (this.endT != null) { if (this.t - this.endT > .5) this.isFinished = true; return; }
    if (this.missedT != null) { if (this.t - this.missedT > .45) this.isFinished = true; return; }
    if (this.bindT == null) {
      // Crawl: straight ahead, leaning toward the nearest foe in depth.
      const step = SHADOW.speed * dt; this.dist += step; this.tipX += this.f * step;
      const aim = foesOf(gw, this.team).filter((t) => !t.isProp && (t.x - this.tipX) * this.f > -10 && Math.abs(t.x - this.tipX) < 160).sort((a, b) => Math.abs(a.x - this.tipX) - Math.abs(b.x - this.tipX))[0];
      if (aim && Number.isFinite(aim.z)) this.tipZ += Math.max(-.25 * dt, Math.min(.25 * dt, aim.z - this.tipZ));
      this.trail.push({ x: this.tipX, z: this.tipZ }); if (this.trail.length > 60) this.trail.shift();
      const caught = foesOf(gw, this.team).find((t) => !t.isProp && Math.abs(t.x - this.tipX) < 18 && Math.abs(((t.z ?? this.tipZ) - this.tipZ) * DEPTH) < 16 && (t.elevation ?? 0) < SHADOW.airDodge);
      if (caught) {
        this.victim = caught; this.bindT = this.t; this.lastX = p.x; this.lastZ = p.z; this.lastElev = p.elevation ?? 0;
        caught.freeze?.(.15); combat.shakeCamera(4, .15); audio.playImpact?.(false);
        combat.spawnDamageText?.(caught.x, (caught.y ?? 0) - 96, 'GEBUNDEN', { color: INK.edge });
      } else if (this.dist >= SHADOW.reach * (this.quality?.area ?? 1)) { this.missedT = this.t; }
      return;
    }
    const v = this.victim;
    if (!alive(v) || !alive(p)) { this.release(); return; }
    if (this.strangleT != null) {
      v.freeze?.(.12); v.vx = 0; v.vz = 0;
      if (!this.strangled && this.t - this.strangleT >= .35) { this.strangled = true; hit(v, SHADOW.strangle * (this.quality?.power ?? 1), 0, 0, .8); combat.shakeCamera(6, .2); }
      if (this.t - this.strangleT > .6) this.release();
      return;
    }
    // Bound: the foe copies the caster's movement, facing and hop.
    const dx = p.x - this.lastX; const dz = p.z - this.lastZ; const de = (p.elevation ?? 0) - this.lastElev;
    this.lastX = p.x; this.lastZ = p.z; this.lastElev = p.elevation ?? 0;
    v.x += dx; if (Number.isFinite(v.z)) v.z = Math.max(.02, Math.min(.98, v.z + dz));
    if (Number.isFinite(v.elevation)) { v.elevation = Math.max(0, v.elevation + de); v.vElevation = 0; }
    v.facing = p.facing; v.vx = 0; v.vz = 0; v.kbVelX = 0;
    v.freeze?.(.12);
    if (this.t - this.bindT >= SHADOW.bind * (this.quality?.duration ?? 1)) this.release();
  }
  strangle() {
    if (!this.bound) return false;
    this.strangleT = this.t; audio.playSlash?.(.6);
    return true;
  }
  release() { if (this.endT == null) this.endT = this.t; }
  // Ground strip (under the actors): from the caster to the tip / the bound foe.
  render(ctx) {
    const p = this.owner; const fade = this.endT != null ? Math.max(0, 1 - (this.t - this.endT) / .5) : this.missedT != null ? Math.max(0, 1 - (this.t - this.missedT) / .45) : 1;
    const end = this.victim ? { x: this.victim.x, z: this.victim.z ?? this.tipZ } : { x: this.tipX, z: this.tipZ };
    const start = { x: p.x, z: p.z };
    const N = 18;
    ctx.save(); ctx.globalAlpha = .88 * fade; ctx.fillStyle = INK.dark;
    // A wavy ink band with soft, irregular edges.
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N; const x = start.x + (end.x - start.x) * u; const y = groundYForDepth(start.z + (end.z - start.z) * u); const w = 12 + 4 * Math.sin(u * 9 + this.t * 6); i ? ctx.lineTo(x, y - w * .5) : ctx.moveTo(x, y - w * .5); }
    for (let i = N; i >= 0; i--) { const u = i / N; const x = start.x + (end.x - start.x) * u; const y = groundYForDepth(start.z + (end.z - start.z) * u); const w = 12 + 4 * Math.sin(u * 9 + this.t * 6 + 1.3); ctx.lineTo(x, y + w * .5); }
    ctx.closePath(); ctx.fill();
    // A faint violet rim so the strip reads on dark ground too.
    ctx.globalAlpha = .5 * fade; ctx.strokeStyle = INK.vein; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = .88 * fade;
    // Creeping tip, or the shadow pool under the bound foe.
    const ey = groundYForDepth(end.z);
    ctx.beginPath(); ctx.ellipse(end.x, ey, this.victim ? 24 : 10 + Math.sin(this.t * 14) * 2, this.victim ? 7 : 4, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = .55 * fade; ctx.strokeStyle = INK.vein; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(end.x, ey, this.victim ? 26 : 12, this.victim ? 8 : 5, 0, 0, TAU); ctx.stroke();
    // Little shadow tendrils licking from the band.
    ctx.globalAlpha = .7 * fade; ctx.strokeStyle = INK.body; ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) { const u = i / 6; const x = start.x + (end.x - start.x) * u; const y = groundYForDepth(start.z + (end.z - start.z) * u); const h = 4 + 4 * Math.abs(Math.sin(this.t * 5 + i)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(this.t * 4 + i) * 3, y - h); ctx.stroke(); }
    ctx.restore();
  }
}
// In front of the bound foe: a dark outline aura, and the strangling hands.
class ShadowHands {
  constructor(bind) { this.bind = bind; this.isFinished = false; }
  get x() { return this.bind.victim?.x ?? this.bind.tipX; } get z() { return (this.bind.victim?.z ?? this.bind.tipZ) + .002; }
  get surfaceHeight() { const v = this.bind.victim; const own = groundYForDepth(this.z); return v && Number.isFinite(v.y) ? own - Math.max(own, v.y + 1) : 0; }
  get y() { return groundYForDepth(this.z); }
  update() { if (this.bind.isFinished) this.isFinished = true; }
  render(ctx) {
    const b = this.bind; const v = b.victim; if (!v || b.bindT == null) return;
    const fade = b.endT != null ? Math.max(0, 1 - (b.t - b.endT) / .5) : 1;
    const base = groundYForDepth(v.z ?? b.tipZ) - (v.elevation ?? 0);
    ctx.save(); ctx.globalAlpha = fade;
    // Shadow climbing the legs while bound.
    const k = Math.min(1, (b.t - b.bindT) / .25);
    ctx.globalAlpha = .45 * fade; ctx.fillStyle = INK.dark; ctx.fillRect(Math.round(v.x - 9), Math.round(base - 22 * k), 18, Math.round(22 * k));
    ctx.globalAlpha = fade;
    if (b.strangleT != null) {
      if (spellSheetReady('shadow_hands')) { const sh = Math.min(1, (b.t - b.strangleT) / .35); drawSpellSprite(ctx, 'shadow_hands', Math.min(3, Math.floor(sh * 4)), v.x, base + 2); ctx.restore(); return; }
      // Hands climb up the body and close around the neck.
      const s = Math.min(1, (b.t - b.strangleT) / .35);
      for (const side of [-1, 1]) {
        for (let j = 0; j < 3; j++) {
          const h = (20 + 40 * s) * (1 - j * .18); const x = v.x + side * (10 - j * 2);
          const quad = [[x - 5, base], [x + side * 4, base - h], [x + side * 11, base - h - 7], [x + 5, base]];
          plate(ctx, quad, HANDS, 5400 + j + (side > 0 ? 10 : 0), { alpha: .95, glowEdge: 1.3 });
          // Bright rim: the hands must read against any clothing.
          ctx.strokeStyle = HANDS.edge; ctx.lineWidth = 1.5; ctx.beginPath(); quad.forEach(([qx, qy], qi) => (qi ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy))); ctx.closePath(); ctx.stroke();
        }
      }
      if (s >= 1) { ctx.strokeStyle = INK.edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(v.x, base - 62, 10, 4, 0, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
  }
}
defineSignature('S54', {
  cast(c) {
    const p = c.caster; const bind = emit(new ShadowBind(c.sig, p, c.quality), c.quality);
    emit(new ShadowHands(bind), c.quality);
    let announced = false;
    offerRecast(p, {
      window: SHADOW.reach / SHADOW.speed + .3, label: 'SCHATTEN KRIECHT…',
      valid: () => bind.missedT == null && bind.endT == null,
      poll: () => (bind.bound && !announced ? (announced = true, { window: SHADOW.bind * (c.quality?.duration ?? 1), label: 'SCHATTENWÜRGEN' }) : null),
      stage2: () => (bind.bound ? bind.strangle() : { again: true }),
      expire: () => {}
    });
  }
});
// Hand-drawn rune objects (rounds 7–10) render at fine density, not through the coarse pixel layer.
for (const C of [ShadowHands]) Object.defineProperty(C.prototype, 'fineVfx', { value: true, writable: true, configurable: true });
