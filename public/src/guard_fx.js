// GRIMGE Prototype — guard feedback (user, 21 Nov 2026: "das Schild schirmt ab, ein Beam wird sichtbar am Schild absorbiert,
// und je näher am Break-Stun, weil zu lange geblockt, desto röter wird das Schild").
// - Guard pressure 0..1: how close the guard is to breaking — the lower of guard stability (melee hits) and stamina
//   (holding drains it; at 0 the guard breaks with a stun, entities.js). The guard itself is tinted red with it (only its
//   own pixels, via an offscreen canvas) and flickers in the last quarter.
// - Absorption: a blocked beam / projectile / spell hit (anything that is not melee) leaves a short absorption state; the
//   guard face then glows in a pulsing ring and energy streaks pour into it from the front. A beam that hits every tick
//   keeps it alive, so it reads as a beam being swallowed by the shield.
import { drawWeaponGuard } from './weapon_guard.js';

export const guardPressure = (p) => Math.max(0, Math.min(1, 1 - Math.min((p.guardStability ?? 100) / 100, (p.sp ?? 1) / (p.maxSp || 1))));
// called by takeDamage when the guard took a hit from the front
export function noteGuardHit(p, hitKind, amount = 0) {
  if (hitKind === 'melee') return;
  const prev = p._guardAbsorb; const t = p.animTime ?? 0;
  p._guardAbsorb = { until: t + .28, start: prev && prev.until > t ? prev.start : t, power: Math.min(1, .35 + amount / 40 + (prev && prev.until > t ? .2 : 0)) };
}

let off = null; const SIZE = 150, HALF = SIZE / 2;
// Draws the guard (weapon_guard.js) tinted by the pressure, then the absorption glow; returns the guard kind.
export function drawGuardWithFx(ctx, p, x, baseY, f, perfect, t) {
  const doc = globalThis.document; const pressure = guardPressure(p);
  let kind;
  if (pressure > .02 && typeof doc?.createElement === 'function') {
    off ??= doc.createElement('canvas'); off.width = SIZE; off.height = SIZE; const g = off.getContext('2d');
    if (g) {
      g.clearRect(0, 0, SIZE, SIZE); g.imageSmoothingEnabled = false;
      kind = drawWeaponGuard(g, p, HALF - f * 24, HALF + 42, f, perfect, t); /* the guard centre lands on the canvas centre */
      const flicker = pressure > .75 ? .75 + .25 * Math.sin(t * 28) : 1;
      g.globalCompositeOperation = 'source-atop'; g.globalAlpha = Math.min(.8, Math.pow(pressure, 1.25) * .8) * flicker;
      g.fillStyle = pressure > .85 ? '#ff1a1a' : '#e0302a'; g.fillRect(0, 0, SIZE, SIZE);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(off, Math.round(x + f * 24 - HALF), Math.round(baseY - 42 - HALF)); ctx.restore();
    }
  }
  if (kind === undefined) kind = drawWeaponGuard(ctx, p, x, baseY, f, perfect, t);
  drawAbsorb(ctx, p, x + f * 24, baseY - 42, f, t, pressure);
  return kind;
}

function drawAbsorb(ctx, p, cx, cy, f, t, pressure) {
  const a = p._guardAbsorb; if (!a || a.until <= t) return;
  const life = Math.min(1, (a.until - t) / .28); const held = t - a.start; const k = a.power * life;
  const hot = pressure > .6 ? '#ff7a5a' : '#bff4ff'; const core = '#ffffff';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const fx = cx + f * 14; /* the guard's front face */
  // the swallowed energy: streaks converging on the face from the front, scrolling inward
  for (let i = 0; i < 9; i++) {
    const ph = ((held * 3.2 + i / 9) % 1); const spread = (i - 4) * 5.5 * (1 - ph * .7); const len = 46 * (1 - ph);
    ctx.globalAlpha = k * (.25 + .55 * (1 - ph)); ctx.strokeStyle = i % 3 ? hot : core; ctx.lineWidth = i % 3 ? 2 : 3;
    ctx.beginPath(); ctx.moveTo(fx + f * (8 + len), cy + spread * 1.6); ctx.lineTo(fx + f * 4, cy + spread * .35); ctx.stroke();
  }
  // the pulsing absorption ring on the face
  const r = 12 + 5 * Math.sin(held * 22) + 8 * k;
  ctx.globalAlpha = .35 * k; ctx.fillStyle = hot; ctx.beginPath(); ctx.ellipse(fx, cy, r * .55, r * 1.25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .8 * k; ctx.strokeStyle = core; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(fx, cy, r * .35, r * .9, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
