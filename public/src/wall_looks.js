// GRIMGE Prototype — distinct looks for placed walls / pillars (user, 18 Oct
// 2026: "Wände zeichnen … sehen alle säulenartig gleich aus"). The obstacle
// rules stay the same (StoneWallSpell); each placement family draws its own
// object: a masonry rampart with merlons, a riveted steel bulwark with spikes
// and rune seams, a jagged rock spire.
import { groundYForDepth } from './world.js';

const px = (v) => Math.round(v);
function rect(ctx, x, y, w, h, fill, stroke = null) { ctx.fillStyle = fill; ctx.fillRect(px(x), px(y), px(w), px(h)); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(px(x) + .5, px(y) + .5, px(w) - 1, px(h) - 1); } }
function poly(ctx, pts, fill, stroke = null, lw = 1.5) { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), px(y)) : ctx.moveTo(px(x), px(y)))); ctx.closePath(); ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }

const LOOKS = {
  // Masonry rampart: stacked stone blocks, mortar, merlons on top, moss.
  masonry(ctx, w, g) {
    const { left, width, front, back, h, flash, dmg } = g;
    rect(ctx, left, back - h, width, front - back, flash ? '#efebe9' : '#a1887f', '#3e2723');
    rect(ctx, left, front - h, width, h, flash ? '#d7ccc8' : '#6d4c41', '#2b1a12');
    const rows = Math.max(3, Math.round(h / 12));
    for (let r = 0; r < rows; r++) {
      const y = front - h + r * (h / rows); const off = r % 2 ? width / 4 : 0;
      ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px(left), px(y)); ctx.lineTo(px(left + width), px(y)); ctx.stroke();
      for (let c = off; c < width; c += width / 2) { ctx.beginPath(); ctx.moveTo(px(left + c), px(y)); ctx.lineTo(px(left + c), px(y + h / rows)); ctx.stroke(); }
      // Light top edge on each block row.
      ctx.fillStyle = 'rgba(255,236,210,.18)'; ctx.fillRect(px(left + 1), px(y + 1), px(width - 2), 1);
    }
    // Merlons (crenellations).
    for (let i = 0; i < 2; i++) rect(ctx, left + i * width * .55, front - h - 7, width * .4, 8, flash ? '#efebe9' : '#7b5a4c', '#2b1a12');
    // Moss tufts at the base.
    ctx.fillStyle = '#6a8f3a'; for (let i = 0; i < 4; i++) ctx.fillRect(px(left + 2 + i * width / 4), px(front - 3), 3, 3);
    if (dmg) { ctx.strokeStyle = 'rgba(20,10,5,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px(left + 4), px(front - h * .9)); ctx.lineTo(px(w.x - 2), px(front - h * .6)); ctx.lineTo(px(w.x + 3), px(front - h * .3)); ctx.stroke(); }
  },
  // Riveted steel bulwark: braced plate, spikes, glowing rune seam, top rail.
  bulwark(ctx, w, g) {
    const { left, width, front, back, h, flash, dmg, t } = g;
    rect(ctx, left, back - h, width, front - back, flash ? '#eceff1' : '#b0bec5', '#263238');
    rect(ctx, left, front - h, width, h, flash ? '#cfd8dc' : '#607d8b', '#1c262b');
    // Bevel and diagonal braces.
    ctx.strokeStyle = '#37474f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px(left + 2), px(front - h + 3)); ctx.lineTo(px(left + width - 2), px(front - 3)); ctx.moveTo(px(left + width - 2), px(front - h + 3)); ctx.lineTo(px(left + 2), px(front - 3)); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(px(left + 1), px(front - h + 1), 2, px(h - 2));
    // Rivets.
    ctx.fillStyle = '#cfd8dc'; for (const [rx, ry] of [[3, 4], [width - 5, 4], [3, h - 6], [width - 5, h - 6], [width / 2 - 1, h / 2 - 1]]) ctx.fillRect(px(left + rx), px(front - h + ry), 2, 2);
    // Glowing rune seam.
    const glow = .55 + .45 * Math.sin(t * 4 + w.x * .1);
    ctx.fillStyle = `rgba(128,222,234,${glow})`; ctx.fillRect(px(w.x - 1), px(front - h + 6), 2, px(h - 12));
    // Spikes on both sides near the top and a top rail.
    for (const s of [-1, 1]) poly(ctx, [[w.x + s * width * .5, front - h * .78], [w.x + s * (width * .5 + 9), front - h * .72], [w.x + s * width * .5, front - h * .66]], '#90a4ae', '#263238', 1);
    rect(ctx, left - 2, front - h - 4, width + 4, 4, '#455a64', '#1c262b');
    if (dmg) { ctx.strokeStyle = '#1c262b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px(left + 3), px(front - h * .4)); ctx.lineTo(px(w.x), px(front - h * .5)); ctx.stroke(); }
  },
  // Jagged rock spire (seismic pillars): faceted, pointed, not a box.
  rock(ctx, w, g) {
    const { left, width, front, h, flash } = g;
    poly(ctx, [[left - 2, front], [left + width * .15, front - h * .6], [w.x - 2, front - h], [left + width * .8, front - h * .7], [left + width + 2, front]], flash ? '#efebe9' : '#8d6e63', '#3e2723');
    poly(ctx, [[w.x - 2, front - h], [left + width * .8, front - h * .7], [left + width + 2, front], [w.x + 2, front]], flash ? '#d7ccc8' : '#6d4c41');
    ctx.strokeStyle = 'rgba(255,236,210,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px(w.x - 2), px(front - h)); ctx.lineTo(px(w.x), px(front)); ctx.stroke();
  }
};

// Draws the wall's own look; false when it has none (falls back to the box).
export function renderWallLook(ctx, wall) {
  const draw = LOOKS[wall.style]; if (!draw) return false;
  const fade = Math.min(1, wall.life / .45);
  const front = groundYForDepth(wall.z + wall.halfZ) - wall.surfaceHeight;
  const back = groundYForDepth(wall.z - wall.halfZ) - wall.surfaceHeight;
  // Rising in: the wall grows out of the ground during its first 0.2 s.
  wall._age = (wall._age ?? 0);
  const rise = Math.min(1, (wall._age) / .2);
  const h = wall.wallHeight * (.25 + .75 * rise);
  ctx.save(); ctx.globalAlpha = Math.max(.18, fade);
  draw(ctx, wall, { left: wall.x - wall.halfX, width: wall.halfX * 2, front, back, h, flash: wall.hitFlash > 0, dmg: wall.hp < wall.maxHp * .6, t: wall._age });
  ctx.restore();
  return true;
}
