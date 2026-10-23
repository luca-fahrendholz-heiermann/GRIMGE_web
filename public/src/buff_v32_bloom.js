// GRIMGE Prototype — A04 Klingenblüte (user, 20 Oct 2026: "Bankai-artige
// Waffen-Entfesselung als Arcane State: die Klassenwaffe verwandelt sich, z. B.
// Schwert → Klingenblüten-Schwarm" — adapted, own look). The weapon's blade
// dissolves into a swarm of blade petals that circles the Wizard; only the
// glowing grip stays in the hand. Every hit sends the swarm streaming forward,
// guard turns it into a wall of petals, full techniques use the whole swarm.
import { plate, TAU, clamp01, ease, techOf, grabOf, specks } from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';
import { activeBankaiStyle, PINK_MAT } from './bankai.js';

export const PETAL = PINK_MAT;

// One swarm piece. Bankai adapts to the class (bankai.js): blade petals, arrows,
// shards, embers, runes, notes, fangs, cards or talismans in the weapon's colours.
export function petal(ctx, x, y, a, size, alpha, seed) {
  const style = activeBankaiStyle(); const mat = style.mat;
  const c = Math.cos(a); const s = Math.sin(a);
  // Local (u along the flight direction, v across) to screen.
  const P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const L = size; const opts = { alpha, glowEdge: style.mat === PINK_MAT ? .8 : .35 }; // tinted swarms keep their colour
  const line = (pts, width = 1) => { ctx.save(); ctx.globalAlpha = alpha * .9; ctx.strokeStyle = mat.edge; ctx.lineWidth = width; ctx.beginPath(); pts.forEach((p, i) => (i % 2 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore(); };
  switch (style.shape) {
    case 'arrow':
      plate(ctx, [P(L * 1.5, 0), P(L * .6, L * .22), P(-L * 1.2, L * .1), P(-L * 1.2, -L * .1), P(L * .6, -L * .22)], mat, seed, opts);
      plate(ctx, [P(-L, 0), P(-L * 1.6, L * .4), P(-L * 1.4, 0), P(-L * 1.6, -L * .4)], mat, seed + 1, { ...opts, glowEdge: .4 });
      break;
    case 'shard': { const j = (k) => .7 + ((seed * 7919 + k * 104729) % 97) / 97 * .5; plate(ctx, [P(L * j(1), 0), P(L * .2, L * .55 * j(2)), P(-L * .8 * j(3), L * .3), P(-L * j(4), -L * .25), P(L * .1, -L * .6 * j(5))], mat, seed, opts); break; }
    case 'ember': plate(ctx, [P(L * 1.3, 0), P(L * .1, L * .45), P(-L * .7, L * .3), P(-L * .9, 0), P(-L * .7, -L * .3), P(L * .1, -L * .45)], mat, seed, { ...opts, glowEdge: 1 }); break;
    case 'rune': plate(ctx, [P(L * .8, 0), P(0, L * .8), P(-L * .8, 0), P(0, -L * .8)], mat, seed, opts); line([P(L * .45, 0), P(-L * .45, 0), P(0, L * .45), P(0, -L * .45)]); break;
    case 'note': { const h = P(-L * .4, L * .3); plate(ctx, [[h[0] - L * .45, h[1]], [h[0], h[1] + L * .35], [h[0] + L * .45, h[1]], [h[0], h[1] - L * .35]], mat, seed, opts); line([[h[0] + L * .4, h[1]], [h[0] + L * .4, h[1] - L * 1.4], [h[0] + L * .4, h[1] - L * 1.4], [h[0] + L * .9, h[1] - L]], 1.5); break; }
    case 'fang': plate(ctx, [P(L * 1.3, -L * .1), P(-L * .3, L * .5), P(-L * .9, L * .1), P(-L * .2, -L * .25)], mat, seed, opts); break;
    case 'card': plate(ctx, [P(L * .7, L * .5), P(-L * .7, L * .5), P(-L * .7, -L * .5), P(L * .7, -L * .5)], mat, seed, { ...opts, glowEdge: .5 }); break;
    case 'talisman': plate(ctx, [P(L * 1.1, L * .32), P(-L * 1.1, L * .32), P(-L * 1.1, -L * .32), P(L * 1.1, -L * .32)], mat, seed, { ...opts, glowEdge: .5 }); break;
    default: { const W = L * .34; plate(ctx, [P(-L, 0), P(0, W), P(L, 0), P(0, -W)], mat, seed, opts); }
  }
}

const SWARM = 28;
export function klingenbluete(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fade = ease(clamp01(pose.fade));
  const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const gr = grabOf(pose);
  const act = pose.act ?? 0; const cx = s.x; const cy = s.chest[1];
  for (let i = 0; i < SWARM; i++) {
    const a = i / SWARM * TAU + t * 1.6; const r = 34 + Math.sin(t * 3 + i) * 6;
    let x = cx + Math.cos(a) * r; let y = cy - 6 + Math.sin(a) * r * .45; let ang = a + Math.PI / 2;
    let acting = false;
    // Stream ahead: on hits, the forward techniques and the grab.
    const stream = Math.max(act * .8, fw.f, fw.s * .7, gr.k ?? 0);
    if (stream > .05) { const u = (i / SWARM + t * 2) % 1; const tx = cx + f * (40 + 240 * u * (fw.f ? 1.15 : .6)); const ty = cy + Math.sin(u * TAU * 2 + i) * 12; x += (tx - x) * stream; y += (ty - y) * stream; ang = f > 0 ? 0 : Math.PI; acting = true; }
    if (up.f || up.s) { const w = Math.max(up.f, up.s); const u = (i / SWARM + t) % 1; x += (cx + f * 20 + Math.cos(a * 2) * 16 - x) * w; y += (s.y - 20 - u * 110 - y) * w; ang = -Math.PI / 2; acting = true; }
    if (dn.f || dn.s) { const w = Math.max(dn.f, dn.s); x += (cx + Math.cos(a) * 70 - x) * w; y += (s.y - 2 + Math.sin(a) * 18 - y) * w; acting = true; }
    if (pose.guardK > .05) { x += (cx + f * 24 + Math.cos(a) * 10 - x) * pose.guardK; y += (cy - 30 + (i / SWARM) * 70 - y) * pose.guardK; ang = Math.PI / 2; acting = true; }
    // Resting petals behind the body on the far half of the orbit, in front on the near half.
    const isFront = acting || Math.sin(a) > 0;
    if ((layer === 'front') !== isFront) continue;
    petal(ctx, x, y, ang, 6, fade * .95, 9950 + i);
  }
  if (layer === 'front') {
    // The weapon's grip stays in the hand, glowing — the blade has become the swarm.
    ctx.save(); ctx.globalAlpha = .9 * fade; ctx.fillStyle = '#5d2e3a'; ctx.fillRect(Math.round(s.x + f * 12) - 2, Math.round(cy) - 4, 4, 12);
    ctx.fillStyle = activeBankaiStyle().mat.body; ctx.fillRect(Math.round(s.x + f * 12) - 4, Math.round(cy) - 6, 8, 3); ctx.restore();
  }
  if (layer === 'back' && pose.full) specks(ctx, Array.from({ length: 10 }, (_, k) => [cx + Math.cos(t * 2 + k) * 44, cy - 6 + Math.sin(t * 2 + k) * 22]), '#fff0f5', .9, 2);
}

registerFormRenderer('A04', klingenbluete);
