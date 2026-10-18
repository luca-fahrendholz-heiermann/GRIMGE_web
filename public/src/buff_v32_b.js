// GRIMGE Prototype — V3.2 individual morphologies of the curated Arcane States
// (docs/GRIMGE_Arcane_States_Atlas_V3_2_Morphologie_Overhaul.md, {ID}.0).
import {
  plate, band, fallout, shard, orbitItem, limbSegment, TAU, lerp, lerpP, clamp01, ease,
  techOf, jumpOf, grabOf, frame, shape, gather, line, specks, groundRing, channel, column
} from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';

const weaponTip = (s) => [s.handF[0] + s.f * 22, s.handF[1] - 18];

// ── T13 Fadenschlag: a thread spool and four taut visible weapon wires ───
function fadenschlag(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const spool = gather([s.shoulderB[0] - f * 8, s.shoulderB[1] - 8 + Math.sin(t * 9) * .6], s.shoulderB, pose.fade * 1.4);
  if (layer === 'back') {
    // One coarsely etched spool hanging at a shoulder; its rim trembles.
    orbitItem(ctx, 'coil', spool[0], spool[1], 8, 1.57 + Math.sin(t * 11) * .03, mat, 4210, pose.fade, t);
    plate(ctx, [[spool[0] - 9, spool[1] - 10], [spool[0] + 9, spool[1] - 10], [spool[0] + 9, spool[1] - 7], [spool[0] - 9, spool[1] - 7]], mat, 4211, { alpha: pose.fade, lit: 1 });
    plate(ctx, [[spool[0] - 9, spool[1] + 7], [spool[0] + 9, spool[1] + 7], [spool[0] + 9, spool[1] + 10], [spool[0] - 9, spool[1] + 10]], mat, 4212, { alpha: pose.fade, lit: 1 });
    return;
  }
  // Four thin metal wires to the visible weapon / hand anchors.
  const ends = [weaponTip(s), [s.handF[0] + f * 4, s.handF[1]], [s.handB[0], s.handB[1]], [lerp(s.handF[0], weaponTip(s)[0], .5), lerp(s.handF[1], weaponTip(s)[1], .5)]];
  const wave = Math.max(pose.act, j.land, j.up) ;
  ends.forEach((e, i) => {
    let end = e;
    if (pose.guardK > .05) end = lerpP(end, [s.x + f * 26, s.chest[1] - 28 + i * 18], pose.guardK);
    if (gr.k > 0 && i < 2) end = lerpP(end, [gr.tx ?? s.x + f * 40, s.chest[1] - 6 + i * 6], gr.k);
    if (fw.s && i === 0) end = lerpP(end, [s.x + f * 110, s.chest[1] - 6], fw.s);
    end = lerpP(end, [s.x + f * (110 + i * 12), s.chest[1] - 24 + i * 16], fw.f);
    if (up.s && i === 0) end = lerpP(end, [s.x + f * 20, s.head[1] - 40], up.s);
    end = lerpP(end, [s.x + f * (10 + i * 10), s.head[1] - 50 - i * 6], up.f);
    if (dn.s && i === 0) end = lerpP(end, [s.x + f * 30, s.y], dn.s);
    end = lerpP(end, [s.x + f * (20 + i * 22), s.y + (i % 2 ? 4 : -4)], dn.f);
    // Jump: the wires stretch behind on the ascent and snap back on landing.
    const mid = [lerp(spool[0], end[0], .5) - f * j.up * 18, lerp(spool[1], end[1], .5) + Math.sin(t * 14 + i * 2) * (1 + 3 * wave) * (1 - j.apex)];
    line(ctx, [spool, mid, end], i % 2 ? mat.edge : mat.vein, 1, pose.fade * .95);
    specks(ctx, [lerpP(spool, end, (t * 1.5 + i * .25) % 1)], mat.core, wave * .9);
  });
  if (pose.guardK > .3) for (let k = 0; k < 3; k++) line(ctx, [[s.x + f * 26, s.chest[1] - 28], [s.x + f * 26, s.chest[1] + 26]].map(([x, y]) => [x + f * k * 3, y]), mat.edge, 1, pose.guardK * .5);
  if (fw.f) for (let k = 0; k < 6; k++) line(ctx, [[s.x + f * 40, s.chest[1] - 24 + k * 8], [s.x + f * 130, s.chest[1] - 30 + k * 10]], mat.vein, 1, fw.f * .7);
  if (dn.f) for (let k = 0; k < 4; k++) groundRing(ctx, s.x + f * (20 + k * 22), s.y, 5, mat, t, dn.f, 4, 4220 + k, 2);
}

// ── T23 Nullfeldträger: negative spaces with real light withdrawal ───────
function nullfeld(ctx, s, pose, mat, form, layer) {
  if (layer !== 'front') return;
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const holes = [{ p: [s.handF[0] + f * 16, s.handF[1] - 4], r: 9, n: 5 }, { p: [s.shoulderB[0] - f * 18, s.shoulderB[1] - 12], r: 12, n: 6 }, { p: [s.hip[0] - f * 26, s.hip[1] + 6], r: 7, n: 4 }];
  holes.forEach((h, i) => {
    let c = [h.p[0] + Math.sin(t * .9 + i * 2) * 3, h.p[1] + Math.cos(t * 1.1 + i) * 2];
    // Jump: one hole drags down, another runs over the head; landing collapses them to dither dots.
    if (j.air) c = i === 2 ? [c[0], c[1] + 20] : i === 1 ? lerpP(c, [s.x, s.head[1] - 22], j.apex) : c;
    let r = h.r * (1 - j.land * .7);
    if (i === 0) { c = lerpP(c, [s.x + f * 26, s.chest[1] - 6], pose.guardK); r = lerp(r, 16, pose.guardK); }
    if (gr.k && i === 0) { c = lerpP(c, [gr.tx ?? s.x + f * 40, s.chest[1]], gr.k); r = lerp(r, 6, gr.k); }
    c = lerpP(c, [s.x + f * (40 + i * 34), s.chest[1] - 4], fw.f); r = lerp(r, 14, fw.f);
    c = lerpP(c, [s.x + f * 18, s.y - 30 - i * 40], up.f);
    c = lerpP(c, [s.x + f * (30 + i * 36), s.y - 2], dn.f); r = lerp(r, 12, dn.f);
    c = gather(c, s.chest, pose.fade * 1.4); r *= clamp01(pose.fade * 1.4);
    if (r < 1) return;
    // The interior is missing (light withdrawn), the rim a thin dithering light edge.
    const pts = Array.from({ length: h.n }, (_, q) => { const a = q / h.n * TAU + i + t * .2; return [c[0] + Math.cos(a) * r * (1 + (q % 2) * .2), c[1] + Math.sin(a) * r * .9]; });
    ctx.save(); ctx.globalAlpha = .95 * pose.fade; ctx.fillStyle = '#020204'; ctx.beginPath(); pts.forEach(([x, y], q) => (q ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.restore();
    line(ctx, [...pts, pts[0]], mat.edge, 1, (.5 + .3 * Math.sin(t * 7 + i)) * pose.fade);
    specks(ctx, pts.filter((_, q) => (q + Math.floor(t * 6)) % 2 === 0), mat.edge, .7 * pose.fade, 1);
    // Erasure points drift past and vanish at the edge.
    const ph = (t * .7 + i * .3) % 1; specks(ctx, [[c[0] - r * 1.6 + ph * r * 3.2, c[1] - r * .3]], mat.core, (1 - Math.abs(ph - .5) * 2) * pose.fade);
  });
  if (fw.s) { ctx.save(); ctx.globalAlpha = fw.s; ctx.fillStyle = '#020204'; ctx.fillRect(Math.min(s.handF[0] + f * 6, s.handF[0] + f * 66), s.handF[1] - 1, 60, 2); ctx.restore(); }
  if (fw.f) { ctx.save(); ctx.globalAlpha = .9 * fw.f; ctx.fillStyle = '#020204'; ctx.fillRect(Math.min(s.x + f * 30, s.x + f * 170), s.chest[1] - 10, 140, 20); ctx.restore(); line(ctx, [[s.x + f * 30, s.chest[1] - 11], [s.x + f * 170, s.chest[1] - 11]], mat.edge, 1, fw.f); line(ctx, [[s.x + f * 30, s.chest[1] + 11], [s.x + f * 170, s.chest[1] + 11]], mat.edge, 1, fw.f); }
  if (up.f) { ctx.save(); ctx.globalAlpha = .85 * up.f; ctx.fillStyle = '#020204'; ctx.fillRect(s.x + f * 12 - 7, s.y - 180, 14, 180); ctx.restore(); }
}

// ── T24 Fadenregent: two jointed shadow marionettes hanging on light threads ─
function fadenregent(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const shadow = { ...mat, body: '#0c1018', facet: '#1a2230' };
  for (let p = 0; p < 2; p++) {
    const side = p ? 1 : -1;
    // Hanging offset left / right behind the Wizard, smaller than him, jerking as if pulled.
    const jerk = Math.round(Math.sin(t * 2.3 + p * 2) * 2) * 2;
    let hx = s.x + side * 34 - f * 10; let hy = s.y - 70 + p * 10 + jerk + (j.air ? 14 : 0) - j.land * 6;
    let c = [hx, hy];
    if (p === 1) c = lerpP(c, [s.x + f * 24, s.chest[1] - 18], pose.guardK);
    if (p === 1 && gr.k) c = lerpP(c, [gr.tx ?? s.x + f * 40, s.chest[1] - 16], gr.k);
    if (fw.s && p === 0) c = lerpP(c, [s.x + f * 20, s.chest[1] - 22], fw.s);
    c = lerpP(c, [s.x + f * (16 + p * 12), s.chest[1] - 30 + p * 14], fw.f);
    c = lerpP(c, [s.x + f * (6 + p * 18), s.head[1] - 40 - p * 10], up.f);
    c = lerpP(c, [s.x + f * (30 + p * 40), s.y - 40], dn.f);
    c = gather(c, [s.x, s.y], pose.fade * 1.3 - p * .1);
    const isFront = p === 1 && (pose.guardK > .5 || gr.k > .5) || fw.f > .5;
    if ((layer === 'front') !== isFront) continue;
    // Visible diagonal light threads from a point high above.
    const anchor = [s.x + side * 50 - f * 6, s.y - 128];
    if (!dn.f) for (const [dx, dy] of [[0, -4], [-6, 14], [6, 14], [0, 30]]) line(ctx, [anchor, [c[0] + dx, c[1] + dy]], mat.edge, 1, .6 * pose.fade);
    // Only flat jointed plates (head, torso, four limbs) — no full ghost soldier.
    const sw = Math.sin(t * 3 + p) * .4 + (fw.a || up.a ? 1 : 0);
    plate(ctx, [[c[0] - 4, c[1] - 9], [c[0] + 4, c[1] - 9], [c[0] + 3, c[1] - 1], [c[0] - 3, c[1] - 1]], shadow, 5210 + p, { alpha: pose.fade, glowEdge: .7 });
    plate(ctx, [[c[0] - 6, c[1]], [c[0] + 6, c[1]], [c[0] + 4, c[1] + 18], [c[0] - 4, c[1] + 18]], shadow, 5212 + p, { alpha: pose.fade, glowEdge: .7 });
    limbSegment(ctx, [c[0] - 6, c[1] + 2], [c[0] - 10 + sw * 4, c[1] + 14], 3, shadow, 5214 + p, pose);
    limbSegment(ctx, [c[0] + 6, c[1] + 2], [c[0] + 10 + f * sw * 12, c[1] + 12 - sw * 8], 3, shadow, 5216 + p, pose);
    limbSegment(ctx, [c[0] - 3, c[1] + 18], [c[0] - 5, c[1] + 32], 3, shadow, 5218 + p, pose);
    limbSegment(ctx, [c[0] + 3, c[1] + 18], [c[0] + 5, c[1] + 32], 3, shadow, 5220 + p, pose);
    if (fw.s && p === 0) shape(ctx, [c[0] + f * (14 + fw.s * 60), c[1] + 6], 0, f, [[-5, -3], [5, -2], [6, 3], [-4, 3]], shadow, 5222, { alpha: fw.s, glowEdge: 1 });
  }
  if (layer === 'front') {
    if (fw.f) channel(ctx, s.x + f * 40, s.chest[1] - 16, f, 130 * fw.f, 4, shadow, 5230, fw.f, 6);
    if (dn.f) for (let k = 0; k < 4; k++) { const x = s.x + f * (24 + k * 26); ctx.save(); ctx.globalAlpha = .6 * dn.f; ctx.fillStyle = '#0a0d14'; ctx.beginPath(); ctx.ellipse(x, s.y, 7, 3, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    if (dn.s) line(ctx, [[s.x - f * 6, s.y], [s.x + f * 40, s.y - 2]], '#0a0d14', 3, dn.s);
  }
}

registerFormRenderer('T13', fadenschlag);
registerFormRenderer('T23', nullfeld);
registerFormRenderer('T24', fadenregent);
