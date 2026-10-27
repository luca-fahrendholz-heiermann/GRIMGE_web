// GRIMGE Prototype — individual PULL looks (HOLD slot in an Arcane State /
// transformation). The mechanic is the same for every form (reach → drag the
// foe close → grab range) so the player always knows what happens; the look
// is the form's own: Risswild lashes a molten band, Fadenschlag throws its
// wires, the Göttlicher Riese reaches with its light hand, and so on.
//
// look(ctx, q) — q: hx, hy (hand), tx, ty (tip: travels out, then rides the
// target), k (reach 0…1), d (drag 0…1), a (alpha), f (facing), t (time),
// mat (form material), seed.
import { plate, band, fallout, shard, orbitItem, TAU, lerp, line, specks, groundRing, shape } from './buff_v32_kit.js';
import { drawWyrmHead, stoneRing, STONE, ACID_GLASS, ghostOf } from './buff_signatures.js';
import { giantHand } from './buff_v32_extra.js';
import { bloodStrand } from './arcane_bloodarsenal.js';
import { spiritArm } from './buff_v32_hands.js';
import { petal } from './buff_v32_bloom.js';
import { rubberArm, cracks, dome, boom } from './arcane_devil.js';

// Points along hand → tip with a sag / wave (n + 1 points).
const path = (q, n, amp = 0, freq = 2, phase = 0) => Array.from({ length: n + 1 }, (_, i) => {
  const u = i / n; const s = Math.sin(u * Math.PI);
  return [lerp(q.hx, q.tx, u), lerp(q.hy, q.ty, u) + s * amp * Math.sin(u * Math.PI * freq + phase)];
});
const zig = (q, n, amp, roll) => path(q, n).map(([x, y], i) => (i && i < n ? [x + Math.sin(roll + i * 2.1) * amp * .5, y + Math.sin(roll * 1.7 + i * 2.9) * amp] : [x, y]));
const dirOf = (q) => { const dx = q.tx - q.hx; const dy = q.ty - q.hy; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l, l]; };
const crystal = (mat) => ({ ...mat, kind: 'crystal' });

export const PULL_LOOKS = {
  // Body powers: a stretched arm / a crack line / a room tether / a fuse spark.
  A05: (ctx, q) => rubberArm(ctx, q.hx, q.hy, q.hx + (q.tx - q.hx) * q.k, q.hy + (q.ty - q.hy) * q.k, q.mat, q.a, 8),
  A06: (ctx, q) => { line(ctx, Array.from({ length: 8 }, (_, i) => [q.hx + (q.tx - q.hx) * q.k * i / 7, q.hy + (q.ty - q.hy) * q.k * i / 7 + (i % 2 ? 4 : -4)]), '#ffffff', 2, q.a); cracks(ctx, q.hx + (q.tx - q.hx) * q.k, q.hy + (q.ty - q.hy) * q.k, 14, q.t, q.a, '#ffffff', 5); },
  A07: (ctx, q) => { dome(ctx, q.tx, q.ty + 30, 30 * q.k + 6, q.mat, q.a, q.t); line(ctx, [[q.hx, q.hy], [q.hx + (q.tx - q.hx) * q.k, q.hy + (q.ty - q.hy) * q.k]], q.mat.edge, 1.5, q.a); },
  A11: (ctx, q) => { ctx.save(); ctx.globalAlpha = q.a; const x1 = q.hx + (q.tx - q.hx) * q.k; const y1 = q.hy + (q.ty - q.hy) * q.k; const n = Math.ceil(Math.hypot(x1 - q.hx, y1 - q.hy) / 3); for (let i = 0; i <= n; i++) { ctx.fillStyle = i % 3 ? '#ff5a1f' : '#ffd27a'; ctx.fillRect(Math.round(q.hx + (x1 - q.hx) * i / n), Math.round(q.hy + (y1 - q.hy) * i / n + Math.sin(i * .8 + q.t * 20) * 2), 2, 2); } ctx.restore(); },
  A10: (ctx, q) => { ctx.save(); ctx.globalAlpha = q.a; const x1 = q.hx + (q.tx - q.hx) * q.k; const y1 = q.hy + (q.ty - q.hy) * q.k; const n = Math.ceil(Math.hypot(x1 - q.hx, y1 - q.hy) / 3); for (let i = 0; i <= n; i++) { ctx.fillStyle = i % 4 ? '#3ad0e0' : '#ffffff'; ctx.fillRect(Math.round(q.hx + (x1 - q.hx) * i / n), Math.round(q.hy + (y1 - q.hy) * i / n), 2, 2); } ctx.restore(); },
  A09: (ctx, q) => bloodStrand(ctx, q.hx, q.hy, q.hx + (q.tx - q.hx) * q.k, q.hy + (q.ty - q.hy) * q.k, q.a, q.t),
  A08: (ctx, q) => { line(ctx, [[q.hx, q.hy], [q.hx + (q.tx - q.hx) * q.k, q.hy + (q.ty - q.hy) * q.k]], '#ffab00', 2, q.a); boom(ctx, q.hx + (q.tx - q.hx) * q.k, q.hy + (q.ty - q.hy) * q.k, 10, (q.t * 2) % 1, 1); },
  // Risswild: a molten rift band whips out and coils around the foe.
  B01: (ctx, q) => {
    const pts = path(q, 10, 18 * (1 - q.d), 1.5, q.t * 10);
    band(ctx, pts, (i, n) => 6 * (1 - i / n) + 2, q.mat, 7501, { t: q.t, alpha: q.a });
    if (q.k >= 1) for (let r = 0; r < 2; r++) { const a0 = q.t * 9 + r * Math.PI; band(ctx, Array.from({ length: 6 }, (_, i) => [q.tx + Math.cos(a0 + i * .5) * 16, q.ty + Math.sin(a0 + i * .5) * 6 + (i - 3) * 3]), () => 3, q.mat, 7502 + r, { t: q.t, alpha: q.a }); }
    fallout(ctx, [[q.tx, q.ty]], q.mat, q.t, 7505, { count: 5, alpha: q.a });
  },
  // Arkengestell: a segmented crystal construct arm with a three-finger claw.
  B02: (ctx, q) => {
    const [ux, uy, L] = dirOf(q); const segs = Math.max(2, Math.round(L / 22)); const c = crystal(q.mat);
    for (let i = 0; i < segs; i++) { const a = [q.hx + ux * L * i / segs, q.hy + uy * L * i / segs]; const b = [q.hx + ux * L * (i + .82) / segs, q.hy + uy * L * (i + .82) / segs]; plate(ctx, [[a[0] - uy * 5, a[1] + ux * 5], [b[0] - uy * 4, b[1] + ux * 4], [b[0] + uy * 4, b[1] - ux * 4], [a[0] + uy * 5, a[1] - ux * 5]], c, 7510 + i, { alpha: q.a, glowEdge: 1.1, lit: 1 }); }
    for (let i = -1; i <= 1; i++) { const ang = Math.atan2(uy, ux) + i * (.7 - .45 * q.d); shape(ctx, [q.tx, q.ty], 0, 1, [[0, -3], [Math.cos(ang) * 18, Math.sin(ang) * 18 - 2], [Math.cos(ang) * 14, Math.sin(ang) * 14 + 3]], c, 7520 + i, { alpha: q.a, glowEdge: 1.2 }); }
  },
  // Schlackenkern: a glowing slag chain, embers falling off the links.
  T02: (ctx, q) => {
    const pts = path(q, 9, 14 * (1 - q.d), 1, 0);
    pts.forEach(([x, y], i) => { if (i < pts.length - 1) { const v = i % 2; plate(ctx, [[x - 5, y - (v ? 3 : 5)], [x + 5, y - (v ? 3 : 5)], [x + 6, y + (v ? 3 : 5)], [x - 6, y + (v ? 3 : 5)]], { ...q.mat, kind: 'crust' }, 7530 + i, { alpha: q.a, lit: .9 }); } });
    plate(ctx, [[q.tx - 7, q.ty - 9], [q.tx + 9, q.ty], [q.tx - 7, q.ty + 9]], q.mat, 7540, { alpha: q.a, core: 1, glowEdge: 1.3 });
    fallout(ctx, pts.filter((_, i) => i % 3 === 1), q.mat, q.t, 7541, { count: 6, alpha: q.a });
  },
  // Korallenschild: a coral branch grows out and hooks the foe with its forks.
  T04: (ctx, q) => {
    const pts = path(q, 8, 8, 3, 1.2); const c = crystal(q.mat);
    band(ctx, pts, (i, n) => 5 * (1 - i / n) + 2, c, 7550, { t: q.t, alpha: q.a });
    pts.forEach(([x, y], i) => { if (i && i % 2 === 0) { const sg = i % 4 ? 1 : -1; band(ctx, [[x, y], [x + q.f * 6, y + sg * 10], [x + q.f * 4, y + sg * 16]], () => 2, c, 7551 + i, { t: q.t, alpha: q.a * .9 }); } });
    for (const sg of [-1, 1]) band(ctx, [[q.tx, q.ty], [q.tx + q.f * 10, q.ty + sg * 8], [q.tx + q.f * 4, q.ty + sg * 16]], () => 3, c, 7560 + sg, { t: q.t, alpha: q.a });
  },
  // Bruchflug: no rope — a gravity well opens at the foe and shards stream back to the Wizard.
  T05: (ctx, q) => {
    if (q.k < 1) { specks(ctx, path(q, 6).slice(1), q.mat.spark, q.a, 3); return; }
    ctx.save(); ctx.globalAlpha = q.a * .9; ctx.fillStyle = '#05040a'; ctx.beginPath(); ctx.ellipse(q.tx, q.ty, 12 + 4 * Math.sin(q.t * 12), 12, 0, 0, TAU); ctx.fill(); ctx.restore();
    for (let i = 0; i < 8; i++) { const ph = (q.t * 2.4 + i / 8) % 1; const x = lerp(q.tx, q.hx, ph); const y = lerp(q.ty, q.hy, ph) + Math.sin(i * 2.3 + q.t * 6) * 10 * (1 - ph); shard(ctx, x, y, 5, Math.atan2(q.hy - q.ty, q.hx - q.tx) + 1.57, q.mat, 7570 + i, q.a * (1 - ph * .5)); }
    groundRing(ctx, q.tx, q.ty + 30, 18, q.mat, q.t * 3, q.a * .6, 8, 7580, 2);
  },
  // Ionspindel: an electric lasso — a jagged arc that re-rolls every frame.
  T06: (ctx, q) => {
    const roll = Math.floor(q.t * 30);
    line(ctx, zig(q, 8, 8, roll), q.mat.spark, 3, q.a); line(ctx, zig(q, 8, 5, roll + 7), q.mat.edge, 1.5, q.a);
    if (q.k >= 1) for (let i = 0; i < 3; i++) orbitItem(ctx, 'coil', q.tx + Math.cos(q.t * 14 + i * 2.1) * 14, q.ty + Math.sin(q.t * 14 + i * 2.1) * 6, 4, q.t * 20 + i, q.mat, 7590 + i, q.a, q.t);
  },
  // Ossuarium: a vertebra chain ending in a ceramic bell that snaps over the foe.
  T08: (ctx, q) => {
    const pts = path(q, 8, 10 * (1 - q.d), 1, 0);
    pts.slice(0, -1).forEach(([x, y], i) => { plate(ctx, [[x - 4, y - 5], [x + 4, y - 5], [x + 5, y], [x + 4, y + 5], [x - 4, y + 5], [x - 5, y]], { ...q.mat, kind: 'crust' }, 7600 + i, { alpha: q.a, lit: 1 }); });
    orbitItem(ctx, 'bell', q.tx, q.ty - 6, 11, Math.PI + Math.sin(q.t * 12) * .2, q.mat, 7610, q.a, q.t);
  },
  // Fadenschlag: three weapon wires fan out from the spool, needle tips pin the foe.
  T13: (ctx, q) => {
    for (let w = -1; w <= 1; w++) {
      const off = w * 10 * (1 - q.k * .8); const pts = path({ ...q, ty: q.ty + off }, 6, 4 * w, 1, q.t * 8);
      line(ctx, pts, w ? q.mat.vein : q.mat.edge, 1.5, q.a);
      const [x, y] = pts[pts.length - 1]; plate(ctx, [[x - q.f * 8, y - 2], [x + q.f * 6, y], [x - q.f * 8, y + 2]], q.mat, 7620 + w, { alpha: q.a, core: .8 });
    }
    orbitItem(ctx, 'coil', q.hx, q.hy, 6, Math.PI / 2 + q.t * 20, q.mat, 7625, q.a, q.t);
  },
  // Nullfeldträger: a hole of negative space opens behind the foe; a void tendril drags it.
  T23: (ctx, q) => {
    const pts = path(q, 8, 12, 2, q.t * 6);
    ctx.save(); ctx.globalAlpha = q.a; ctx.strokeStyle = '#050608'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
    line(ctx, pts, q.mat.spark, 1.5, q.a);
    if (q.k >= 1) { ctx.save(); ctx.globalAlpha = q.a; ctx.fillStyle = '#050608'; ctx.beginPath(); ctx.ellipse(q.tx + q.f * 14, q.ty, 10, 22, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = q.mat.edge; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
  },
  // Fadenregent: marionette threads drop from above onto the foe; the Wizard's hand works the cross.
  T24: (ctx, q) => {
    const top = Math.min(q.hy, q.ty) - 70; const cx = lerp(q.hx, q.tx, .5);
    plate(ctx, [[cx - 16, top - 2], [cx + 16, top - 2], [cx + 16, top + 2], [cx - 16, top + 2]], { ...q.mat, kind: 'crust' }, 7640, { alpha: q.a, lit: 1 });
    plate(ctx, [[cx - 2, top - 12], [cx + 2, top - 12], [cx + 2, top + 12], [cx - 2, top + 12]], { ...q.mat, kind: 'crust' }, 7641, { alpha: q.a, lit: 1 });
    line(ctx, [[q.hx, q.hy], [cx, top]], q.mat.edge, 1, q.a * .8);
    for (const [ox, oy] of [[-12, -30], [0, -40], [12, -30], [-6, 0], [6, 0]]) line(ctx, [[cx + ox * 1.3, top], [lerp(cx, q.tx, q.k) + ox, lerp(top, q.ty, q.k) + oy * .5]], q.mat.edge, 1, q.a);
  },
  // Kältestillstand: frost glass segments that appear in frozen frames (stutter).
  T35: (ctx, q) => {
    const hold = Math.floor(q.t * 8) % 2 ? 0 : 1; const [ux, uy, L] = dirOf(q); const c = crystal(q.mat); const n = 6;
    for (let i = 0; i < n; i++) { if ((i + hold) % 3 === 2 && q.k < 1) continue; const u0 = i / n; const u1 = u0 + .12; const a = [q.hx + ux * L * u0, q.hy + uy * L * u0]; const b = [q.hx + ux * L * u1, q.hy + uy * L * u1]; plate(ctx, [[a[0] - uy * 4, a[1] + ux * 4 - 2], [b[0] - uy * 4, b[1] + ux * 4], [b[0] + uy * 4, b[1] - ux * 4 + 2], [a[0] + uy * 4, a[1] - ux * 4]], c, 7650 + i, { alpha: q.a, glowEdge: .9, lit: 1 }); }
    if (q.k >= 1) for (let i = 0; i < 4; i++) shard(ctx, q.tx + Math.cos(i * 1.6) * 12, q.ty + Math.sin(i * 1.6) * 12, 6, i * 1.6, c, 7660 + i, q.a);
  },
  // Säuregerüst: a catalyst hose sprays a sticky acid string; bubbles run along it.
  T37: (ctx, q) => {
    const pts = path(q, 10, 10, 1, 0);
    band(ctx, pts, () => 4, ACID_GLASS, 7670, { t: q.t, alpha: q.a });
    for (let i = 0; i < 4; i++) { const ph = (q.t * 2 + i / 4) % 1; const idx = Math.floor(ph * (pts.length - 1)); const [x, y] = pts[idx]; ctx.save(); ctx.globalAlpha = q.a; ctx.strokeStyle = ACID_GLASS.edge; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (q.k >= 1) fallout(ctx, [[q.tx, q.ty + 6]], ACID_GLASS, q.t, 7675, { count: 6, alpha: q.a });
  },
  // Asterglied: a broken stone ring flies out, closes around the foe and tows it back.
  T38: (ctx, q) => {
    const x = q.tx; const y = q.ty; const r = q.k < 1 ? 10 : 16;
    stoneRing(ctx, x, y, r, .55, .2, q.t * 6, 5, 7680, q.a, null, 2);
    if (q.k >= 1) line(ctx, [[q.hx, q.hy], [x, y]], STONE.vein, 1.5, q.a * .7);
  },
  // Vorausschnitt: the foe's own afterimages line the path it is dragged along, inside a time plane.
  T39: (ctx, q) => {
    const tg = q.target;
    if (q.k >= 1 && tg?.heroKey) for (let i = 1; i <= 3; i++) ghostOf(ctx, tg, lerp(q.tx, q.fromX ?? q.tx, i * .25), (tg.y ?? q.ty + 40), tg.state ?? 'hurt', tg.animTime ?? 0, tg.facing ?? -q.f, .3 / i, q.mat.edge);
    else if (q.k >= 1) for (let i = 1; i <= 3; i++) { const x = lerp(q.tx, q.fromX ?? q.tx, i * .25); plate(ctx, [[x - 8, q.ty - 20], [x + 8, q.ty - 22], [x + 8, q.ty + 20], [x - 8, q.ty + 22]], crystal(q.mat), 7690 + i, { alpha: q.a * .35 / i, glowEdge: .8 }); }
    const [ux, uy] = dirOf(q); plate(ctx, [[q.hx, q.hy - 26], [q.tx, q.ty - 30], [q.tx, q.ty + 26], [q.hx, q.hy + 24]], crystal(q.mat), 7695, { alpha: q.a * .25, glowEdge: .6 });
    line(ctx, [[q.hx, q.hy], [q.tx - ux * 6, q.ty - uy * 6]], q.mat.edge, 1, q.a);
  },
  // Sonnenwyrm: a scale wyrm shoots out, bites the foe and hauls it back.
  T40: (ctx, q) => {
    const pts = path(q, 10, 14, 2, q.t * 9);
    band(ctx, pts, (i, n) => 6 - i / n * 2, q.mat, 7700, { t: q.t, alpha: q.a });
    const [ux, uy] = dirOf(q); drawWyrmHead(ctx, q.tx - ux * 6, q.ty - uy * 6, ux, uy, 18, q.mat, q.k >= 1 ? .15 : .6, q.a, 7701);
  },
  // Göttlicher Riese: the huge light hand reaches out and closes around the foe (reference pose).
  A01: (ctx, q) => {
    // A translucent silver forearm of light from above the Wizard to the hand.
    const s0 = [q.hx - q.f * 6, q.hy - 34]; const s1 = [q.tx - q.f * 18, q.ty - 10];
    plate(ctx, [[s0[0], s0[1] - 9], [s1[0], s1[1] - 12], [s1[0], s1[1] + 12], [s0[0], s0[1] + 9]], crystal(q.mat), 7709, { alpha: q.a * .7, glowEdge: 1.2, lit: 1 });
    line(ctx, [s0, s1], q.mat.core, 2, q.a * .8);
    giantHand(ctx, [q.tx, q.ty - 4], -.4 + .4 * q.k, q.f, 30, q.k >= 1 ? 1 : .2, crystal(q.mat), 7710, q.a);
  },
  // Mystischer Affe: the spirit ape's furred arm shoots out and the hand clamps the foe.
  A02: (ctx, q) => {
    const FUR = { kind: 'crust', dark: '#3d2f5c', body: '#dcd6ec', facet: '#f4f1fb', vein: '#9c7ae0', edge: '#efeaff', spark: '#c9a8ff', core: '#ffffff', glow: 'rgba(176,108,255,', edgeGlow: 'rgba(239,234,255,' };
    const [ux, uy, L] = dirOf(q); const el = [q.hx + ux * L * .45, q.hy + uy * L * .45 - 14];
    for (const [a, b, w] of [[[q.hx, q.hy], el, 14], [el, [q.tx, q.ty], 16]]) { const dx = b[0] - a[0]; const dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; const nx = -dy / l * w / 2; const ny = dx / l * w / 2; plate(ctx, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], FUR, 7720 + w, { alpha: q.a, lit: .5, glowEdge: .4 }); }
    plate(ctx, Array.from({ length: 8 }, (_, i) => [q.tx + Math.cos(i / 8 * TAU) * 11, q.ty + Math.sin(i / 8 * TAU) * 9]), FUR, 7725, { alpha: q.a, lit: 1, glowEdge: .6 });
  },
  // Tausendhand: three spirit arms reach out together and close on the foe.
  A03: (ctx, q) => { for (let i = -1; i <= 1; i++) spiritArm(ctx, [q.hx - q.f * 4, q.hy - 6 + i * 8], [q.tx - q.f * (4 - i * 3), q.ty + i * 10], q.f, q.k >= 1 ? 1 : .2, q.a, 7740 + i * 10, 10); },
  // Klingenblüte: a ribbon of blade petals reaches out and wraps the foe.
  A04: (ctx, q) => { for (let i = 0; i < 12; i++) { const u = i / 11; const x = q.hx + (q.tx - q.hx) * u * q.k; const y = q.hy + (q.ty - q.hy) * u * q.k + Math.sin(u * 8 + q.t * 10) * 6; petal(ctx, x, y, Math.atan2(q.ty - q.hy, q.tx - q.hx), 5, q.a, 7760 + i); } },
  // Focus transformations (no Arcane State): Kyubi tail, Eidolon arm, Ascendant light chain.
  ninefold: (ctx, q) => { band(ctx, path(q, 12, 20, 1.5, q.t * 8), (i, n) => 9 * Math.sin((i / n) * Math.PI) + 2, { kind: 'crystal', dark: '#3a1206', body: '#ff8a3d', facet: '#ffd0a0', vein: '#ff5a1f', edge: '#ffe2b8', spark: '#fff1c2', core: '#fffaf0', glow: 'rgba(255,90,31,', edgeGlow: 'rgba(255,226,184,' }, 7730, { t: q.t, alpha: q.a }); },
  eidolon: (ctx, q) => PULL_LOOKS.B02(ctx, q),
  ascendant: (ctx, q) => { line(ctx, path(q, 8, 6, 2, q.t * 6), '#fff3c4', 4, q.a); line(ctx, path(q, 8, 6, 2, q.t * 6), '#ffffff', 1.5, q.a); specks(ctx, [[q.tx, q.ty]], '#ffffff', q.a, 4); }
};

// Default (no own look): the plain tether with a clamp.
export function defaultPullLook(ctx, q) {
  ctx.save(); ctx.globalAlpha = q.a; ctx.lineCap = 'round';
  ctx.strokeStyle = q.mat.vein; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(q.hx, q.hy); ctx.lineTo(q.tx, q.ty); ctx.stroke();
  ctx.strokeStyle = q.mat.edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.hx, q.hy); ctx.lineTo(q.tx, q.ty); ctx.stroke();
  for (const sg of [-1, 1]) { ctx.fillStyle = q.mat.edge; ctx.beginPath(); ctx.moveTo(q.tx, q.ty); ctx.lineTo(q.tx + q.f * 9, q.ty + sg * 8); ctx.lineTo(q.tx + q.f * 3, q.ty + sg * 3); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
