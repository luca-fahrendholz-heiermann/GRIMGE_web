// GRIMGE Prototype — transformation transitions (user, 20 Oct 2026, after the
// Dragon Ball sprite-fighter reference): charge in the aura → screen flash in
// the form colour → an energy pillar with light rays out of which the new form
// steps → the pillar collapses. Purely visual (no gameplay); each form uses
// its own palette and its own particle type (crystal shards, embers, wisps).
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';

const TAU = Math.PI * 2;
export const TRANSFORM_TIMING = Object.freeze({ charge: .35, flash: .5, pillarEnd: 1.0, end: 1.2, reveal: .5 });

export class TransformationFx {
  constructor(player, { core = '#ffffff', main = '#ffd54f', rim = '#ff9800', dark = '#3a1d00', particle = 'ember', label = '' } = {}) {
    this.player = player; this.owner = player; this.team = player.team;
    this.core = core; this.main = main; this.rim = rim; this.dark = dark; this.particle = particle; this.label = label;
    this.t = 0; this.isFinished = false; this.flashed = false; this.isTransformationFx = true;
    this.seed = Math.floor(Math.random() * 1000);
  }
  update(dt) {
    this.t += dt;
    if (!this.flashed && this.t >= TRANSFORM_TIMING.charge) {
      this.flashed = true;
      combat.triggerHitstop?.(5); combat.shakeCamera(10, .35);
      combat.spawnShockwave(this.player.x, groundYForDepth(this.player.z), 120, this.main);
      combat.spawnShockwave(this.player.x, groundYForDepth(this.player.z), 70, this.core);
    }
    if (this.t >= TRANSFORM_TIMING.end) this.isFinished = true;
  }
  render(ctx) {
    const p = this.player; const T = TRANSFORM_TIMING; const t = this.t;
    const gx = p.x; const gy = groundYForDepth(p.z) - (p.elevation ?? 0);
    ctx.save();
    // 1 — Charge: converging streaks and a shrinking ground ring; the aura flickers white.
    if (t < T.charge + .05) {
      const k = Math.min(1, t / T.charge);
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * TAU + this.seed; const r0 = 140 * (1 - k) + 24; const r1 = r0 + 26;
        ctx.globalAlpha = .4 + .6 * k; ctx.strokeStyle = i % 3 ? this.main : this.core; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * r1, gy - 44 + Math.sin(a) * r1 * .8); ctx.lineTo(gx + Math.cos(a) * r0, gy - 44 + Math.sin(a) * r0 * .8); ctx.stroke();
      }
      ctx.globalAlpha = .8; ctx.strokeStyle = this.rim; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(gx, gy, 70 * (1 - k) + 18, (70 * (1 - k) + 18) * .32, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = .35 + .35 * Math.sin(t * 60); ctx.fillStyle = this.core; ctx.beginPath(); ctx.ellipse(gx, gy - 44, 20 + 6 * k, 46 + 4 * k, 0, 0, TAU); ctx.fill();
    }
    // 3 — Pillar: layered energy column (dark rim → colour → white core) with radiating light rays.
    if (t >= T.charge && t < T.end) {
      const grow = Math.min(1, (t - T.charge) / .08); const shrink = t > T.pillarEnd ? 1 - (t - T.pillarEnd) / (T.end - T.pillarEnd) : 1;
      const w = 34 * grow * shrink; const top = gy - 900;
      for (const [ww, c, a] of [[w * 1.25, this.dark, .55], [w, this.rim, .85], [w * .72, this.main, .95], [w * .38, this.core, 1]]) {
        if (ww <= .5) continue;
        ctx.globalAlpha = a; ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(gx - ww, gy + 4); ctx.lineTo(gx - ww * .8, top); ctx.lineTo(gx + ww * .8, top); ctx.lineTo(gx + ww, gy + 4); ctx.closePath(); ctx.fill();
      }
      // Wavy edge flames along the column.
      ctx.globalAlpha = .9 * shrink; ctx.strokeStyle = this.main; ctx.lineWidth = 3;
      for (const sg of [-1, 1]) { ctx.beginPath(); for (let i = 0; i <= 16; i++) { const yy = gy - i * 30; const xx = gx + sg * (w * 1.1 + Math.sin(t * 30 + i * 1.3) * 5); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
      // Light rays.
      ctx.globalAlpha = .55 * shrink; ctx.strokeStyle = this.core; ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + (i - 5.5) * .22; const L = 120 + ((i * 47) % 90); ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * 30, gy - 50 + Math.sin(a) * 30); ctx.lineTo(gx + Math.cos(a) * L * 1.6, gy - 50 + Math.sin(a) * L); ctx.stroke(); }
      // Form-specific particles rising in the column.
      for (let i = 0; i < 18; i++) {
        const ph = ((t - T.charge) * 1.6 + i / 18) % 1; const x = gx + Math.sin(i * 2.7 + t * 6) * w * 1.6; const y = gy - ph * 260;
        ctx.globalAlpha = (1 - ph) * shrink; ctx.fillStyle = i % 2 ? this.main : this.core;
        if (this.particle === 'shard') { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 3, y); ctx.closePath(); ctx.fill(); }
        else if (this.particle === 'wisp') { ctx.beginPath(); ctx.ellipse(x, y, 5, 3, ph * 3, 0, TAU); ctx.fill(); }
        else ctx.fillRect(Math.round(x), Math.round(y), 3, 3);
      }
      // Ground shock ring.
      const rk = Math.min(1, (t - T.charge) / .4);
      ctx.globalAlpha = (1 - rk) * .9; ctx.strokeStyle = this.core; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(gx, gy, 30 + 150 * rk, (30 + 150 * rk) * .32, 0, 0, TAU); ctx.stroke();
    }
    // 2 — Flash: screen-filling light in the form colour, white at the centre.
    if (t >= T.charge && t < T.flash) {
      const k = (t - T.charge) / (T.flash - T.charge); const a = Math.max(0, 1 - k) * .8;
      ctx.globalAlpha = a; ctx.fillStyle = this.main; ctx.fillRect(gx - 3000, gy - 3000, 6000, 6000);
      ctx.globalAlpha = a; ctx.fillStyle = this.core; ctx.beginPath(); ctx.ellipse(gx, gy - 60, 260 * (1 - k * .5), 220, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

// Palette / particle of a buff form (Arcane State) for its transition.
export function transitionStyleOf(form) {
  const m = form.mat ?? {};
  return { core: m.core ?? '#ffffff', main: m.kind === 'crystal' ? m.edge : m.vein, rim: m.spark ?? m.vein, dark: m.dark ?? '#111111', particle: m.kind === 'crystal' ? 'shard' : m.kind === 'smoke' ? 'wisp' : 'ember', label: form.name };
}
