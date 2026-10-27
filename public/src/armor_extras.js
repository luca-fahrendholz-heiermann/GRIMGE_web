// GRIMGE Prototype — armour pieces of the armour Arcane States, anchored to the body sockets like Blutarsenal's
// weapons (user, 26 Oct 2026: "blutarsenal … hat eine aura die sich dem sprite anpasst und dann extra die guns" —
// pieces at the sockets fit every character; the sprite's own pixels only get a material tint, form_recolors.js).
// The tailored base hero (form_recolors.js TAILORED_HEROES) keeps its tuned look without these pieces.
// Pieces that sit at the head stay BEHIND the sprite (back layer) so every face and hairstyle covers their roots.
import { registerFormExtra } from './buff_vfx.js';
import { armCannon } from './arcane_konstrukt.js';
import { hasTailoredArmour } from './form_recolors.js';
const tailored = (pose, form) => hasTailoredArmour(form.id, pose.player?.heroKey);

const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
// A tapered pixel horn / spike along a quadratic curve: dark fill, lit edge, outline.
function spike(ctx, P0, P1, P2, w0, fill, edge, a = 1) {
  ctx.save(); ctx.globalAlpha = a;
  const at = (u) => [(1 - u) ** 2 * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0], (1 - u) ** 2 * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1]];
  for (const pass of [0, 1, 2]) for (let i = 0; i <= 24; i++) {
    const u = i / 24; const [x, y] = at(u); const w = Math.max(1, Math.round(w0 * (1 - u * .85)));
    if (pass === 0) px(ctx, x - w / 2 - 1, y - 1, w + 2, 3, '#06080c');
    else if (pass === 1) px(ctx, x - w / 2, y, w, 1, fill);
    else if (u < .9) px(ctx, x - w / 2, y, 1, 1, edge);
  }
  ctx.restore();
}

// T06 Ionspindel: horned helmet crest behind the head, spiked pauldrons behind the shoulders, a clawed gauntlet.
registerFormExtra('T06', (ctx, s, pose, form, layer, a) => {
  if (tailored(pose, form)) return;
  const f = s.f; const [hx, hy] = s.head; const sway = Math.sin(pose.t * 2) * .6;
  if (layer === 'back') {
    for (const side of [-1, 1]) spike(ctx, [hx + side * 6, hy - 2], [hx + side * 22, hy], [hx + side * 28 + sway, hy - 14], 6, '#4a6488', '#ffe08a', a); /* sideways: stays below the HP bar */
    for (const [sx, sy, d] of [[s.shoulderB[0], s.shoulderB[1], -f], [s.shoulderF[0], s.shoulderF[1], f]]) { spike(ctx, [sx, sy], [sx + d * 12, sy - 4], [sx + d * 18, sy - 14], 5, '#4a6488', '#ffe08a', a); spike(ctx, [sx, sy + 4], [sx + d * 10, sy + 2], [sx + d * 16, sy - 5], 4, '#2f4262', '#e6c062', a); }
    return;
  }
  // Clawed gauntlet: three blue-steel talons from the fore hand, a gold cuff.
  const [gx, gy] = s.handF; px(ctx, gx - 3, gy - 3, 6, 3, '#06080c'); px(ctx, gx - 2, gy - 2, 4, 1, '#e6c062');
  for (let k = 0; k < 3; k++) spike(ctx, [gx, gy + k], [gx + f * 6, gy + k * 2], [gx + f * 9, gy + 4 + k * 3], 2, '#7a90c8', '#c8d8ff', a);
});

// A10 Konstruktpanzer: the arm cannon fused to the fore arm (hidden while a technique holds it), red visor eyes.
registerFormExtra('A10', (ctx, s, pose, form, layer, a) => {
  if (layer === 'back' || tailored(pose, form)) return;
  const p = pose.player; const busy = (p?._kpBusyUntil ?? 0) > performance.now();
  if (p && !busy) armCannon(ctx, p, 0, a);
  const f = s.f; const [hx, hy] = s.head; const blink = Math.floor(pose.t * 3) % 9 === 0;
  if (!blink) { px(ctx, hx + f * 2 - (f < 0 ? 2 : 0), hy - 2, 3, 1, '#ff2a2a'); px(ctx, hx + f * 6 - (f < 0 ? 2 : 0), hy - 2, 3, 1, '#ff2a2a'); }
});
