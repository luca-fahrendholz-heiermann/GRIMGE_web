// GRIMGE Prototype — A03 Tausendhand (user, 20 Oct 2026: "Attacke, wo mehrere
// Hände und Arme visualisiert werden" → as an Arcane State). A half-halo of six
// spirit arms in red lacquer with gold bracers fans out behind the Wizard; on
// every melee hit one arm punches along, guard turns them into a palm wall,
// grab sends several hands out, full techniques use all of them.
import { plate, TAU, lerpP, clamp01, ease, techOf, jumpOf, grabOf, specks } from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';
import { giantHand } from './buff_v32_extra.js';

export const LACQUER = { kind: 'crust', dark: '#2a0808', body: '#b71c1c', facet: '#e53935', vein: '#6d1414', edge: '#ffecb3', spark: '#fff3c4', core: '#ffffff', glow: 'rgba(255,213,79,', edgeGlow: 'rgba(255,236,179,' };
export const PALM = { kind: 'crust', dark: '#5d2e0a', body: '#ffcc80', facet: '#ffe0b2', vein: '#8a4a12', edge: '#fff8e1', spark: '#fff3c4', core: '#ffffff', glow: 'rgba(255,213,79,', edgeGlow: 'rgba(255,248,225,' };
const quad = (a, b, w) => { const dx = b[0] - a[0]; const dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; const nx = -dy / l * w / 2; const ny = dx / l * w / 2; return [[a[0] + nx, a[1] + ny], [b[0] + nx * .8, b[1] + ny * .8], [b[0] - nx * .8, b[1] - ny * .8], [a[0] - nx, a[1] - ny]]; };
// One spirit arm from root to hand: lacquered forearm, a gold bracer, an open or closed hand.
export function spiritArm(ctx, root, hand, f, curl, alpha, seed, size = 12) {
  const len = Math.hypot(hand[0] - root[0], hand[1] - root[1]);
  if (len > size * 5) {
    // A long reach is jointed: lacquered segments with gold rings between them (one stretched quad read as a flat bar).
    const n = Math.ceil(len / (size * 2.4)); const nx = -(hand[1] - root[1]) / len; const ny = (hand[0] - root[0]) / len;
    const at = (u) => { const q = lerpP(root, hand, u); const sway = Math.sin(u * Math.PI) * Math.sin(seed + u * 5) * size * .35; return [q[0] + nx * sway, q[1] + ny * sway]; };
    for (let i = 0; i < n; i++) {
      plate(ctx, quad(at(i / n), at((i + .84) / n), size * (.8 - .12 * i / n)), LACQUER, seed + 3 + i, { alpha, lit: .7, glowEdge: .6 });
      if (i < n - 1) plate(ctx, quad(at((i + .82) / n), at((i + 1.02) / n), size * .95), { ...LACQUER, body: '#ffb300', facet: '#ffe082' }, seed + 40 + i, { alpha, lit: 1 });
    }
  } else plate(ctx, quad(root, hand, size * .75), LACQUER, seed, { alpha, lit: .7, glowEdge: .6 });
  const b = lerpP(root, hand, .72);
  const dx = hand[0] - root[0]; const dy = hand[1] - root[1]; const l = Math.hypot(dx, dy) || 1;
  plate(ctx, quad([b[0] - dx / l * 3, b[1] - dy / l * 3], [b[0] + dx / l * 3, b[1] + dy / l * 3], size * .95), { ...LACQUER, body: '#ffb300', facet: '#ffe082' }, seed + 1, { alpha, lit: 1 });
  giantHand(ctx, hand, Math.atan2(-dy, dx * f), f, size, curl, PALM, seed + 2, alpha);
}

function tausendhand(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const fade = ease(clamp01(pose.fade));
  const root = [s.back[0] - f * 10, s.back[1] - 2];
  const hits = pose.hitK ?? 0; const act = pose.act ?? 0;
  for (let i = 0; i < 6; i++) {
    // Half-halo: angles from up-back to forward-up; arms 0–2 behind the body, 3–5 in front.
    // Fan from back-down (200°) over the top to forward-up (60°), in the facing frame.
    const phi = (215 - i * 24) * Math.PI / 180 + Math.sin(t * 2 + i) * .05;
    const L = (58 + (i % 2) * 10) * fade;
    let hand = [root[0] + f * Math.cos(phi) * L, root[1] - Math.sin(phi) * L];
    let curl = .15; let size = 11;
    // The punching arm of this hit (one arm per hit, rotating).
    const turn = Math.floor(t * 6) % 6;
    if (act > .3 && i === turn) { hand = lerpP(hand, [s.x + f * (60 + 30 * hits), s.chest[1]], act); curl = 1; }
    if (pose.guardK > .05) { hand = lerpP(hand, [s.x + f * 26, s.y - 20 - i * 14], pose.guardK); curl = 0; }
    if (gr.k && i % 2 === 1) { hand = lerpP(hand, [gr.tx ?? s.x + f * 50, s.chest[1] + (i - 3) * 8], gr.k); curl = gr.hit ? 1 : .4; }
    if (fw.f) { const k = clamp01(fw.e * 4 - i * .3); hand = lerpP(hand, [s.x + f * (70 + i * 22), s.chest[1] + (i % 3 - 1) * 12], k * fw.f); curl = 1; size = 12; }
    if (fw.s && i >= 3) { hand = lerpP(hand, [s.x + f * (50 + (i - 3) * 20), s.chest[1]], fw.s); curl = 1; }
    if (up.f || up.s) { const w = Math.max(up.f, up.s); hand = lerpP(hand, [s.x + f * (30 + i * 8), s.y - 90 - i * 8], w); curl = 1; }
    if (dn.f || dn.s) { const w = Math.max(dn.f, dn.s); hand = lerpP(hand, [s.x + f * (20 + i * 14), s.y - 4], w); curl = 0; size = 13; }
    if (j.air) hand = [hand[0], hand[1] + 10 * j.up];
    // Resting arms stay behind the Wizard; an arm that acts (punch, guard, grab, technique) comes in front.
    const acting = curl === 1 || curl === 0 || (gr.k && i % 2 === 1);
    if ((layer === 'front') !== !!acting) continue;
    spiritArm(ctx, root, hand, f, curl, fade * .95, 9900 + i * 10, size);
  }
  if (layer === 'back') {
    // Gold rings in the aura where the arms grow out.
    ctx.save(); ctx.globalAlpha = .7 * fade; ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(root[0], root[1], 12, 16, 0, 0, TAU); ctx.stroke(); ctx.restore();
    if (pose.full) specks(ctx, Array.from({ length: 8 }, (_, k) => [root[0] + Math.cos(t * 3 + k) * 30, root[1] + Math.sin(t * 3 + k) * 34]), '#fff3c4', .9, 2);
  }
}

registerFormRenderer('A03', tausendhand);
