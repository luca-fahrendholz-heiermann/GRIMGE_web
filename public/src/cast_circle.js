// GRIMGE Prototype — the casting circle (user, 21 Oct 2026: spells must fit the pixel-art
// character designs — reference: a crisp glowing magic circle at the caster's feet). A short
// ground decal in the spell's colour: two rings, a turning hexagram and rune ticks; drawn
// in the pixelated VFX layer (so it gets the sprite contour too), under the actors.
import { groundYForDepth } from './world.js';

const TAU = Math.PI * 2;
export class CastCircleFx {
  constructor(caster, color = '#b388ff', { radius = 54, life = .55, big = false } = {}) {
    this.x = caster.x; this.z = caster.z; this.surfaceHeight = caster.surfaceHeight ?? 0; this.color = color; this.R = radius * (big ? 1.5 : 1); this.life = life * (big ? 1.4 : 1);
    this.big = big; this.t = 0; this.isFinished = false; this.isGroundDecal = true; this.team = caster.team;
  }
  update(dt) { this.t += dt; if (this.t >= this.life) this.isFinished = true; }
  render(ctx) {
    const k = this.t / this.life; const grow = Math.min(1, this.t / .12); const a = Math.min(1, (1 - k) * 2.2);
    const x = this.x; const y = groundYForDepth(this.z) - this.surfaceHeight; const R = this.R * grow; const sq = .3;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = this.color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, y, R, R * sq, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, R * .7, R * .78 * sq, 0, 0, TAU); ctx.stroke();
    // A turning hexagram inside (big special runes only — small circles stay readable).
    const rot = this.t * 2.4;
    if (this.big) for (const off of [0, Math.PI / 3]) {
      ctx.beginPath();
      for (let i = 0; i <= 3; i++) { const ang = rot + off + i * TAU / 3; const px = x + Math.cos(ang) * R * .66; const py = y + Math.sin(ang) * R * .66 * sq; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
    // Rune ticks on the rim and a bright core flash at the start.
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) { const ang = -rot * .6 + i * TAU / 8; ctx.fillRect(Math.round(x + Math.cos(ang) * R * .85) - 1, Math.round(y + Math.sin(ang) * R * .85 * sq) - 1, 3, 3); }
    if (this.t < .1) { ctx.globalAlpha = a * .45 * (1 - this.t / .1); ctx.fillStyle = this.color; ctx.beginPath(); ctx.ellipse(x, y, R * .5, R * .5 * sq, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}
