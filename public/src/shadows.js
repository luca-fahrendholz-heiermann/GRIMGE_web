// GRIMGE Prototype — round ground shadows under every actor.
//
// The shadow always sits on the ground at the actor's real depth (z), so a
// jumping fighter shows where they are in the lane. It shrinks and fades
// with height. The active sky sphere scales and tints all shadows (a sun
// makes them short, a moon or eclipse long and dark, a blood moon red).
import { groundYForDepth } from './world.js';

export function shadowScaleForElevation(elevation = 0) {
  return Math.max(.42, Math.min(1, 1 - Math.max(0, elevation) / 280));
}

// Base half-width of an actor's shadow in logical pixels.
export function shadowRadius(actor) {
  if (Number.isFinite(actor.shadowRadius)) return actor.shadowRadius;
  if (actor.heroKey) return 23;
  if (Number.isFinite(actor.radius)) return actor.radius * 1.15;
  return Math.max(10, (actor.width ?? 24) * .6);
}

export function shadowFor(actor, style = {}) {
  const elevation = Math.max(0, actor.elevation ?? 0);
  const s = shadowScaleForElevation(elevation);
  const scale = style.scale ?? 1;
  const base = shadowRadius(actor);
  return {
    x: actor.x,
    y: groundYForDepth(actor.z ?? 0) - (actor.surfaceHeight ?? 0),
    rx: base * s * scale * (style.stretch ?? 1),
    ry: base * .3 * s * scale,
    alpha: Math.min(.75, .5 * (.62 + .38 * s) * (style.alpha ?? 1)),
    scale: s
  };
}

function hasShadow(actor) {
  if (!actor || actor.burrowed || actor.isObjective || actor.isProp) return false;
  if (actor.isDead === true || actor.lifeState === 'Dead') return false;
  return Number.isFinite(actor.x) && Number.isFinite(actor.z);
}

export function renderGroundShadows(ctx, actors, style = {}) {
  const color = style.color ?? '0,0,0';
  ctx.save();
  for (const actor of actors) {
    if (!hasShadow(actor)) continue;
    const shadow = shadowFor(actor, style);
    ctx.fillStyle = `rgba(${color},${shadow.alpha})`;
    ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y, shadow.rx, shadow.ry, 0, 0, Math.PI * 2); ctx.fill();
    // A darker core reads as contact with the ground.
    ctx.fillStyle = `rgba(${color},${shadow.alpha * .6})`;
    ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y, shadow.rx * .55, shadow.ry * .55, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
