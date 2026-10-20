// GRIMGE Prototype — A04 Klingenblüte (user, 20 Oct 2026: "Bankai-artige
// Waffen-Entfesselung als Arcane State: die Klassenwaffe verwandelt sich, z. B.
// Schwert → Klingenblüten-Schwarm" — adapted, own look). The weapon's blade
// dissolves into a swarm of blade petals that circles the Wizard; only the
// glowing grip stays in the hand. Every hit sends the swarm streaming forward,
// guard turns it into a wall of petals, full techniques use the whole swarm.
import { plate, TAU, clamp01, ease, techOf, grabOf, specks } from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';

export const PETAL = { kind: 'crystal', dark: '#4a1530', body: '#ec407a', facet: '#f8bbd0', vein: '#ad1457', edge: '#fce4ec', spark: '#fff0f5', core: '#ffffff', glow: 'rgba(236,64,122,', edgeGlow: 'rgba(255,255,255,' };

// One blade petal: a thin, pointed leaf of steel and blossom.
export function petal(ctx, x, y, a, size, alpha, seed) {
  const c = Math.cos(a); const s = Math.sin(a); const L = size; const W = size * .34;
  plate(ctx, [[x - c * L, y - s * L], [x - s * W, y + c * W], [x + c * L, y + s * L], [x + s * W, y - c * W]], PETAL, seed, { alpha, glowEdge: .8 });
}

const SWARM = 28;
function klingenbluete(ctx, s, pose, mat, form, layer) {
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
    ctx.fillStyle = '#ec407a'; ctx.fillRect(Math.round(s.x + f * 12) - 4, Math.round(cy) - 6, 8, 3); ctx.restore();
  }
  if (layer === 'back' && pose.full) specks(ctx, Array.from({ length: 10 }, (_, k) => [cx + Math.cos(t * 2 + k) * 44, cy - 6 + Math.sin(t * 2 + k) * 22]), '#fff0f5', .9, 2);
}

registerFormRenderer('A04', klingenbluete);
