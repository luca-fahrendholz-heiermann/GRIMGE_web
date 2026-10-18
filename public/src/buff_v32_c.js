// GRIMGE Prototype — V3.2 individual morphologies T25–T36
// (docs/GRIMGE_Arcane_States_Atlas_V3_2_Morphologie_Overhaul.md, {ID}.0).
import {
  plate, band, fallout, shard, orbitItem, TAU, lerp, lerpP, clamp01, ease,
  techOf, jumpOf, grabOf, frame, shape, gather, line, specks, groundRing, channel, column
} from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';

// Per-player scratch state for world-anchored pieces (left-behind folds, arches).
const scratch = (pose, key) => { const p = pose.player ?? {}; p._v32 ??= {}; return (p._v32[key] ??= {}); };

// ── T25 Hämolith: mineralised capillary spikes on the forearms ──────────
function haemolith(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const glass = { ...mat, kind: 'crystal' };
  // Veins periodically harden to a matte stone surface.
  const hard = Math.max(0, Math.sin(t * .7)) > .8;
  [[s.elbowF, s.handF, true], [s.elbowB, s.handB, false]].forEach(([A, B, front], i) => {
    if ((layer === 'front') !== front) return;
    const k = clamp01(pose.fade * 1.4);
    // Thin blood-red glass veins wrap only the forearm and hand contours.
    for (let v = 0; v < 2; v++) { const pts = []; for (let q = 0; q <= 6; q++) { const u = q / 6 * k; pts.push([lerp(A[0], B[0], u) + Math.sin(u * 9 + v * 2) * 3, lerp(A[1], B[1], u) + Math.cos(u * 9 + v * 2) * 2]); } line(ctx, pts, hard ? '#6a5a5a' : mat.vein, 1.3, pose.fade); specks(ctx, [pts[Math.floor((t * 6 + v * 3) % 7)]], mat.core, pose.fade * (hard ? .2 : .9)); }
    // Irregular crystal spikes grow outward; guard turns them into a conical arm barrier.
    for (let q = 0; q < 4; q++) {
      const u = .25 + q * .2; const base = [lerp(A[0], B[0], u), lerp(A[1], B[1], u)];
      let ang = -1.2 + (q % 2) * 1.1 + Math.sin(q * 3.1) * .3 + j.air * .5; let L = (6 + (q * 7) % 5) * k;
      if (front) { ang = lerp(ang, (q - 1.5) * .25, pose.guardK); L = lerp(L, 14, pose.guardK); }
      if (front && gr.k) { ang = lerp(ang, .2, gr.k); L = lerp(L, 18, gr.k); }
      shape(ctx, base, 0, f, [[0, -1.5], [Math.cos(ang) * L, -Math.sin(ang) * L], [0, 1.5]], glass, 5310 + i * 10 + q, { alpha: pose.fade, glowEdge: .9 });
    }
    if (j.land) fallout(ctx, [B], glass, t, 5330 + i, { count: 5, alpha: j.land });
  });
  if (layer === 'front') {
    if (fw.s) channel(ctx, s.handF[0], s.handF[1], f, 70 * fw.s, 2, glass, 5340, fw.s, 3);
    if (fw.f) channel(ctx, s.handF[0] + f * 10, s.handF[1], f, 150 * fw.f, 6, glass, 5345, fw.f);
    if (up.s) band(ctx, [s.handF, [s.handF[0] + f * 16, s.handF[1] - 24], [s.handF[0] + f * 6, s.handF[1] - 44 * up.s]], () => 2.5, glass, 5350, { t, alpha: up.s });
    if (up.f) for (let k = 0; k < 6; k++) shape(ctx, [s.x + f * (10 + k * 10), s.y - 150], 0, f, [[-3, 0], [3, 0], [0, -30 * up.f - (k % 2) * 10]], glass, 5355 + k, { alpha: up.f, glowEdge: 1 });
    if (dn.s) shape(ctx, [s.footF[0] + f * 8, s.y], 0, f, [[-3, 0], [3, 0], [1, 16 * dn.s]], glass, 5362, { alpha: dn.s });
    if (dn.f) for (let k = 0; k < 7; k++) shape(ctx, [s.x + f * (20 + k * 16), s.y + (k % 2) * 4], 0, f, [[-4, 0], [4, 0], [(k % 3) - 1, 20 + (k % 3) * 8]].map(([u, v]) => [u, v * dn.f]), glass, 5365 + k, { alpha: dn.f, glowEdge: 1 });
  }
}

// ── T26 Resonanzwache: sound armature of three offset string frames ──────
function resonanzwache(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const glass = { ...mat, kind: 'crystal' };
  const frames = [{ dx: -20, y: -84, h: 60, w: 14 }, { dx: -34, y: -70, h: 46, w: 11 }, { dx: -12, y: -52, h: 34, w: 9 }];
  frames.forEach((fr, i) => {
    let c = [s.x + f * fr.dx, s.y + fr.y + (j.air ? 6 : 0)]; let h = fr.h; let w = fr.w; let rot = .1 + i * .06;
    if (i === 2) { c = lerpP(c, [s.x + f * 24, s.chest[1] - 14], pose.guardK); rot = lerp(rot, -.3, pose.guardK); h = lerp(h, 50, pose.guardK); }
    c = lerpP(c, [s.x + f * (30 + i * 20), s.chest[1] - 30], fw.f); h = lerp(h, 60 + i * 6, fw.f); rot = lerp(rot, 0, fw.f);
    c = lerpP(c, [s.x + f * (10 + i * 8), s.y - 60 - i * 40], up.f); rot = lerp(rot, 1.57, up.f);
    c = lerpP(c, [s.x + f * (20 + i * 30), s.y - 8], dn.f); rot = lerp(rot, 1.57, dn.f); h = lerp(h, 50, dn.f);
    c = gather(c, s.back, pose.fade * 1.4 - i * .1);
    const isFront = i === 2 && pose.guardK > .5 || fw.f > .5 || up.f > .5 || dn.f > .5;
    if ((layer === 'front') !== isFront) return;
    // Semi-transparent string frame — no hands, shoulders or head.
    const P = frame(c, rot, f);
    const corners = [P(-w, 0), P(w, 0), P(w, h), P(-w, h)];
    line(ctx, [...corners, corners[0]], mat.body, 2, pose.fade * .9);
    for (let q = 1; q <= 4; q++) {
      const u = -w + q * w * 2 / 5;
      // Slow floating waves; movement turns them into short unsynchronised wave trains (reversed at the apex).
      const amp = (1 + 3 * Math.max(pose.run, pose.act, j.land)) * (j.apex ? -1 : 1);
      const pts = []; for (let k = 0; k <= 6; k++) pts.push(P(u + Math.sin(t * 6 + k * 1.2 + q + i) * amp * Math.sin(k / 6 * Math.PI), k / 6 * h));
      line(ctx, pts, mat.edge, 1, pose.fade * .7);
    }
    if (i === 2 && pose.guardK > .3) plate(ctx, corners, glass, 5410, { alpha: pose.guardK * .35, glowEdge: .6 });
  });
  if (layer === 'front') {
    if (gr.k) line(ctx, [s.handF, [gr.tx ?? s.x + f * 40, s.chest[1]]], mat.edge, 1, gr.k);
    if (fw.s) for (let k = 0; k < 3; k++) line(ctx, [[s.x + f * (24 + k * 8), s.chest[1] - 14], [s.x + f * (30 + k * 8), s.chest[1]], [s.x + f * (24 + k * 8), s.chest[1] + 14]], mat.edge, 1.5, fw.s * (1 - k * .25));
    if (fw.f) channel(ctx, s.x + f * 30, s.chest[1] - 6, f, 140 * fw.f, 28, glass, 5420, fw.f * .4, 6);
    if (j.land || dn.s) line(ctx, [[s.x - 30, s.y + 2], [s.x + 30, s.y + 2]], mat.edge, 2, Math.max(j.land, dn.s));
    if (dn.f) groundRing(ctx, s.x + f * 20, s.y, 30 + 40 * dn.f, glass, t, dn.f * .8, 16, 5430, 3, .4);
  }
}

// ── T27 Faltspur: movable spatial folds like stacked paper edges ─────────
function faltspur(ctx, s, pose, mat, form, layer) {
  if (layer !== 'front') return;
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const st = scratch(pose, 'T27');
  // Sprint leaves a short folded stage behind in world space before it catches up.
  st.lag = st.lag ?? [s.x, s.y]; st.lag = lerpP(st.lag, [s.x, s.y], .08);
  const off = [st.lag[0] - s.x, st.lag[1] - s.y];
  const folds = [{ p: s.elbowF, w: 16, h: 12, d: 0 }, { p: s.elbowB, w: 14, h: 10, d: 1 }, { p: s.hipB, w: 18, h: 9, d: 2 }, { p: s.hipF, w: 12, h: 8, d: 1 }];
  folds.forEach((fd, i) => {
    let c = [fd.p[0] + f * (i % 2 ? -12 : 12) + (i === 2 ? off[0] : 0), fd.p[1] + (i === 2 ? off[1] : 0)];
    // The fold stripes change depth discretely.
    const depth = (fd.d + Math.floor(t * .8 + i)) % 3;
    if (i === 0) c = lerpP(c, [s.x + f * 26, s.chest[1] - 4], pose.guardK);
    if (i === 3 && j.air) c = lerpP(c, [s.x, s.y + 4], .8);
    if (gr.k && i === 0) c = lerpP(c, [lerp(s.x, gr.tx ?? s.x + f * 40, .5), s.chest[1]], gr.k);
    c = lerpP(c, [s.x + f * (30 + i * 26), s.chest[1] - 4], fw.f);
    c = lerpP(c, [s.x + f * 18, s.y - 20 - i * 30], up.f);
    c = lerpP(c, [s.x + f * (20 + i * 22), s.y + (i % 2 ? 4 : -4)], dn.f);
    c = gather(c, fd.p, pose.fade * 1.4);
    const w = fd.w * (1 + fw.f * .6); const h = fd.h;
    // A rectangular crease showing background stripes at another depth (no screen frame).
    plate(ctx, [[c[0] - w, c[1] - h], [c[0] + w * .2, c[1] - h - 3], [c[0] + w * .2, c[1] + h - 3], [c[0] - w, c[1] + h]], { ...mat, kind: 'crystal' }, 5510 + i, { alpha: pose.fade * (.35 + depth * .15), glowEdge: .4 });
    plate(ctx, [[c[0] + w * .2, c[1] - h - 3], [c[0] + w, c[1] - h], [c[0] + w, c[1] + h], [c[0] + w * .2, c[1] + h - 3]], { ...mat, kind: 'crystal' }, 5520 + i, { alpha: pose.fade * (.55 - depth * .1), glowEdge: .6 });
    for (let k = 0; k < 3; k++) line(ctx, [[c[0] - w + 3, c[1] - h + 4 + k * h * .6 + depth * 2], [c[0] + w * .15, c[1] - h + 2 + k * h * .6 + depth * 2]], mat.edge, 1, .5 * pose.fade);
    line(ctx, [[c[0] + w * .2, c[1] - h - 3], [c[0] + w * .2, c[1] + h - 3]], mat.vein, 1.5, pose.fade);
  });
  if (fw.s) line(ctx, [[s.handF[0], s.handF[1]], [s.handF[0] + f * 40 * fw.s, s.handF[1] - 2]], mat.vein, 2, fw.s);
  if (fw.f) channel(ctx, s.x + f * 30, s.chest[1] - 4, f, 160 * fw.f, 4, { ...mat, kind: 'crystal' }, 5530, fw.f * .7);
  if (dn.s) line(ctx, [[s.x, s.y], [s.x + f * 36, s.y]], mat.vein, 2, dn.s);
}

// ── T28 Rasterdom: local ground architecture of three grid arches ────────
function rasterdom(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const st = scratch(pose, 'T28');
  // World-anchored arches on lane contact points; when the player moves on, rear ones
  // are dismantled and rebuilt ahead — never while airborne (only after landing).
  st.arches ??= [-1, 0, 1].map((k) => ({ x: s.x + k * 40, y: s.y + (k === 0 ? -6 : 4), born: t - 1 }));
  if (!pose.airborne) st.arches.forEach((a) => { if (Math.abs(a.x - s.x) > 70) { const dir = Math.sign(s.x - a.x); a.x = s.x + dir * 40 + (pose.player?.vx ?? 0) * .15; a.y = s.y + (Math.floor(Math.abs(a.x) / 13) % 2 ? -6 : 4); a.born = t; } });
  const H = 70;
  st.arches.forEach((a, i) => {
    let x = a.x; let y = a.y; let h = H * clamp01((t - a.born) / .3) * clamp01(pose.fade * 1.3);
    if (i === 1 && pose.guardK > .05) x = lerp(x, s.x + f * 30, pose.guardK);
    x = lerp(x, s.x + f * (40 + i * 40), fw.f); h = lerp(h, 50, fw.f);
    if (i === 1) h = lerp(h, H * 1.8, up.f);
    x = lerp(x, s.x + (i - 1) * 70, dn.f); h = lerp(h, 60, dn.f);
    const back = y < s.y || i === 1 && pose.guardK < .5 && !fw.f;
    if ((layer === 'back') !== back) return;
    // A broken constructed grid arch with hatching struts.
    const w = 18; const pts = []; for (let q = 0; q <= 8; q++) { const u = q / 8; if (q === 5 && !fw.f) continue; pts.push([x - w + u * w * 2, y - Math.sin(u * Math.PI) * h]); }
    band(ctx, pts, () => 2.6, mat, 5610 + i, { t, alpha: pose.fade * (back ? .8 : 1) });
    for (let q = 1; q < pts.length - 1; q++) line(ctx, [pts[q], [pts[q][0], y]], mat.edge, 1, .35 * pose.fade);
    if (i === 1 && pose.guardK > .3) plate(ctx, [[x - w, y], [x - w, y - h], [x + w, y - h], [x + w, y]], { ...mat, kind: 'crystal' }, 5620, { alpha: pose.guardK * .3, glowEdge: .5 });
  });
  if (layer === 'front') {
    if (j.air) line(ctx, [[s.x, s.y + (pose.player?.elevation ?? 0)], [s.x, s.y]], mat.edge, 1, .5);
    if (gr.k) { const tx = gr.tx ?? s.x + f * 40; plate(ctx, [[tx - 10, s.y - 2], [tx + 10, s.y - 3], [tx + 8, s.y + 4], [tx - 9, s.y + 4]], mat, 5630, { alpha: gr.k, glowEdge: 1.2 }); }
    if (fw.s) line(ctx, [[s.x + f * 10, s.y - 2], [s.x + f * 80 * fw.s, s.y - 2]], mat.vein, 2, fw.s);
    if (dn.s) groundRing(ctx, s.x + f * 20, s.y, 12, mat, 0, dn.s, 4, 5640, 3, .8);
    if (dn.f) groundRing(ctx, s.x, s.y, 80, mat, t * .2, dn.f * .7, 12, 5650, 3, .7);
  }
}

// ── T29 Werkgestalt: three autonomous tool relics on unequal orbits ──────
function werkgestalt(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const tools = ['tongs', 'pendulum', 'spindle'];
  tools.forEach((tool, i) => {
    // Below chest height, on different sides, each with its own slow test motion.
    const a = t * (.5 + i * .23) + i * 2.1; let p = [s.x + Math.cos(a) * (30 + i * 6) - f * j.air * 16 * (i + 1) * .5, s.chest[1] + 16 + Math.sin(a) * 6 + i * 6];
    let depth = Math.sin(a);
    if (i === 0) { p = lerpP(p, [s.x + f * 26, s.chest[1] + 2], Math.max(pose.guardK, gr.k * 0)); }
    if (gr.k && i < 2) p = lerpP(p, [(gr.tx ?? s.x + f * 40) - f * i * 10, s.chest[1]], gr.k);
    p = lerpP(p, [s.x + f * (30 + i * 26), s.chest[1] - 4], fw.f);
    if (i === 1) p = lerpP(p, [s.x + f * 10, s.head[1] - 30], up.s);
    if (i === 2) p = lerpP(p, [s.x + f * 16, s.y - 40 - up.f * 60], up.f);
    if (i === 0) p = lerpP(p, [s.x + f * 26, s.y - 6], dn.s);
    const ga = i * TAU / 3; p = lerpP(p, [s.x + f * 50 + Math.cos(ga) * 18, s.y - 10 + Math.sin(ga) * 6], dn.f);
    p = gather(p, [s.x, s.hip[1]], pose.fade * 1.4 - i * .1);
    if (pose.guardK > .5 && i === 0 || fw.a > .3 || up.a > .3 || dn.a > .3 || gr.k > .3 && i < 2) depth = 1;
    if ((layer === 'back') !== (depth < 0)) return;
    const al = pose.fade * (depth < 0 ? .8 : 1); const rot = fw.f ? (f > 0 ? 0 : Math.PI) : 0;
    if (tool === 'tongs') { const click = Math.abs(Math.sin(t * 3)) * .4 * (1 - gr.k) ; for (const sg of [-1, 1]) shape(ctx, p, 1.57 + sg * click + rot, f, [[-2, 0], [2, 0], [1, 18], [sg * 4, 22], [-1, 16]], mat, 5710 + (sg > 0 ? 1 : 0), { alpha: al, lit: 1 }); }
    else if (tool === 'pendulum') { const sw = Math.sin(t * 2.4) * .4; line(ctx, [[p[0], p[1] - 14], [p[0] + Math.sin(sw) * 14, p[1] + Math.cos(sw) * 14 - 14]], mat.edge, 1, al); orbitItem(ctx, 'seed', p[0] + Math.sin(sw) * 14, p[1] + Math.cos(sw) * 14 - 12, 6, sw + Math.PI, mat, 5712, al, t); }
    else { const sp = t * 6; shape(ctx, p, rot + 1.57, f, [[-3, -10], [3, -10], [2, 10], [0, 14], [-2, 10]], mat, 5713, { alpha: al, lit: 1 }); for (let k = -2; k <= 2; k++) line(ctx, [[p[0] - 4, p[1] + k * 4 + Math.sin(sp + k) * 1.5], [p[0] + 4, p[1] + k * 4 + 1]], mat.vein, 1, al * .8); }
  });
  if (layer === 'front') {
    if (fw.s) specks(ctx, [[s.x + f * 50, s.chest[1] + 4], [s.x + f * 60, s.chest[1] + 2]], mat.spark, fw.s, 3);
    if (fw.f) channel(ctx, s.x + f * 30, s.chest[1] - 4, f, 120 * fw.f, 3, mat, 5720, fw.f, 5);
    if (up.f) column(ctx, s.x + f * 16, s.y, 160 * up.f, 5, mat, 5730, up.f * .6);
  }
}

// ── T30 Leisefaden: extremely reduced stealth hem with one shadow band ───
function leisefaden(ctx, s, pose, mat, form, layer) {
  if (layer !== 'front') return;
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const shadow = { ...mat, kind: 'smoke', body: '#101414', facet: '#1c2222' };
  // Nearly invisible: only sporadically a displaced contour stretch appears; fast running tears it.
  const vis = Math.max(Math.sin(t * 1.3) > .55 ? .8 : .12, pose.guardK, fw.a, up.a, dn.a, gr.k) * pose.fade;
  const contour = [s.shoulderF, s.elbowF, s.handF, s.hipF, s.kneeF, s.footF].map(([x, y]) => [x + f * 5, y + (j.air ? 10 : 0)]);
  const tear = Math.max(pose.sprintK, pose.run - .4);
  for (let i = 0; i < contour.length - 1; i++) {
    if (tear > .3 && (i + Math.floor(t * 8)) % 3 === 0) continue;
    let a = contour[i]; let b = contour[i + 1];
    if (pose.guardK > .05 && i < 2) { a = lerpP(a, [s.x + f * 20, s.chest[1] - 16 + i * 14], pose.guardK); b = lerpP(b, [s.x + f * 22, s.chest[1] - 2 + i * 14], pose.guardK); }
    line(ctx, [a, b], '#1a2020', 3, vis); line(ctx, [a, b], mat.edge, 1, vis * .5);
  }
  if (gr.k) line(ctx, [s.handF, [gr.tx ?? s.x + f * 40, s.y - 4]], '#1a2020', 3, gr.k);
  if (fw.s) specks(ctx, [[s.handF[0] + f * 6, s.handF[1] - 2], [s.handF[0] + f * 9, s.handF[1] + 2]], '#2a3030', fw.s, 3);
  if (fw.f) for (let k = 0; k < 3; k++) if (fw.e > k * .08) { const pts = []; for (let q = 0; q <= 8; q++) pts.push([s.x + f * (14 + q * 16), s.chest[1] - 10 + k * 10 + Math.sin(q + k + t * 10) * 6]); band(ctx, pts, (q, n) => 3 * Math.sin(q / n * Math.PI) + .5, shadow, 5810 + k, { t, alpha: fw.f * .8 }); }
  if (up.f) for (let k = 0; k < 3; k++) line(ctx, [[s.x - 10 + k * 10, s.head[1] - 10], [s.x - 10 + k * 10, s.head[1] - 10 - 50 * up.f * (1 - k * .2)]], '#1a2020', 3, up.f);
  if (dn.f) line(ctx, [[s.x, s.y + 2], [s.x + f * 150 * dn.f, s.y + 2]], '#1a2020', 4, dn.f);
}

// ── T31 Klingenherbarium: two offset swarms of mineral blade seeds ───────
function klingenherbarium(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const socket = gather([s.shoulderB[0] - f * 14, s.shoulderB[1] - 16], s.shoulderB, pose.fade * 1.4);
  if (layer === 'back') {
    // The empty weapon socket behind the shoulder stays see-through in the middle.
    for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + .4; plate(ctx, [[socket[0] + Math.cos(a) * 8, socket[1] + Math.sin(a) * 8], [socket[0] + Math.cos(a + .6) * 10, socket[1] + Math.sin(a + .6) * 10], [socket[0] + Math.cos(a + .3) * 12, socket[1] + Math.sin(a + .3) * 12]], mat, 5910 + k, { alpha: pose.fade, lit: 1 }); }
  }
  for (let i = 0; i < 12; i++) {
    const grp = i % 2; const a = t * (grp ? 1.3 : -.9) + i * .9 + grp * 1.2; const r = 16 + grp * 9 + (i % 3) * 2;
    let p = [socket[0] + Math.cos(a) * r - f * j.air * 14 * grp, socket[1] + Math.sin(a) * r * .6 + (grp ? 6 : -4)];
    let depth = Math.sin(a);
    if (pose.guardK > .05) { const g = (i / 11 - .5) * 2; p = lerpP(p, [s.x + f * (24 + (i % 3) * 3), s.chest[1] + g * 30], pose.guardK); }
    if (gr.k && i < 2) p = lerpP(p, [(gr.tx ?? s.x + f * 40) + (i ? 4 : -4), s.chest[1]], gr.k);
    if (i === 0) p = lerpP(p, [s.x + f * 50, s.chest[1] - 4], fw.s);
    p = lerpP(p, [s.x + f * (30 + (i % 6) * 14), s.chest[1] - 12 + Math.floor(i / 6) * 16 + (i % 2) * 4], fw.f);
    if (i === 0) p = lerpP(p, [p[0], p[1] - 40], up.s);
    p = lerpP(p, [s.x + f * 16 + Math.cos(i + t * 6) * 16, s.y - 20 - i * 12], up.f);
    if (i < 3) p = lerpP(p, [s.x + f * (16 + i * 8), s.y - 2], dn.s);
    const sa = i / 12 * TAU; p = lerpP(p, [s.x + f * 30 + Math.cos(sa) * 40, s.y + Math.sin(sa) * 12], dn.f);
    if (j.land) p = lerpP(p, [s.x + Math.cos(a) * 20, s.y - 2], j.land);
    if (pose.guardK > .5 || fw.a > .3 || up.f > .3 || dn.a > .3 || gr.k > .3 && i < 2 || j.land > .3) depth = 1;
    if ((layer === 'back') !== (depth < 0)) continue;
    // Flat triangular mica seeds that turn to the camera and tip away again.
    const flip = Math.abs(Math.sin(t * 2 + i));
    shape(ctx, p, a + (fw.f ? 0 : 0), f, [[-4 * flip, -3], [6 * flip, 0], [-4 * flip, 3]], mat, 5920 + i, { alpha: pose.fade * (depth < 0 ? .7 : 1), glowEdge: .9, lit: .9 });
  }
}

// ── T32 Taktfunke: foot- and hand-bound impulse rhythm, no aura figure ───
function taktfunke(ctx, s, pose, mat, form, layer) {
  if (layer !== 'front') return;
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const notch = (x, y, a, k, len = 7) => { if (k <= 0) return; line(ctx, [[x, y], [x + Math.cos(a) * len, y + Math.sin(a) * len]], mat.edge, 2, k * pose.fade); specks(ctx, [[x + Math.cos(a) * len, y + Math.sin(a) * len]], mat.core, k * pose.fade); };
  // Idle: a minimal foot pulse every few beats; sprint: short angular foot comets.
  const beat = (t * 1.5) % 4 < .12 ? 1 : 0;
  notch(s.footF[0], s.footF[1], -2.4, beat);
  const run = Math.max(pose.run, pose.sprintK); const step = run > .2 && Math.abs(Math.sin(t * 8)) > .9 ? 1 : 0;
  for (const foot of [s.footF, s.footB]) { notch(foot[0], foot[1], Math.PI + (f > 0 ? 0 : Math.PI) + .3, step); if (step && pose.sprintK > .5) line(ctx, [[foot[0], foot[1]], [foot[0] - f * 20, foot[1] - 2]], mat.vein, 1, .8); }
  // Every hit lights notches pointing in a new direction.
  if (pose.hitK) for (let k = 0; k < 3; k++) notch(s.handF[0] + f * 10, s.handF[1], t * 7 + k * 2.1, pose.hitK, 9);
  notch(s.footF[0], s.footF[1], -1.57, Math.max(j.land, j.apex * j.air, pose.vy > 150 ? 1 : 0), 10);
  if (pose.guardK > .3) { const cx = s.x + f * 20; const cy = s.chest[1]; line(ctx, [[cx - 6, cy - 6], [cx + 6, cy + 6]], mat.edge, 2, pose.guardK); line(ctx, [[cx - 6, cy + 6], [cx + 6, cy - 6]], mat.edge, 2, pose.guardK); }
  if (gr.k) notch(s.elbowF[0], s.elbowF[1], 0, gr.k, 12);
  if (fw.s) notch(s.x + f * 18, s.chest[1], f > 0 ? -.2 : Math.PI + .2, fw.s, 40);
  if (fw.f) for (let k = 0; k < 6; k++) if (fw.e > k * .05) notch(s.x + f * (16 + k * 22), s.chest[1] - 8 + (k % 2) * 12, f > 0 ? -.4 + (k % 2) * .8 : Math.PI + .4 - (k % 2) * .8, fw.f, 24);
  if (up.s) notch(s.x + f * 12, s.chest[1], -1.57, up.s, 50);
  if (up.f) for (let k = 0; k < 5; k++) if (up.e > k * .05) notch(s.x + f * 12, s.chest[1] - k * 24, -1.57 + (k % 2 ? .3 : -.3), up.f, 22);
  if (dn.s) notch(s.footF[0], s.y, 0, dn.s, 14);
  if (dn.f) for (let k = 0; k < 6; k++) line(ctx, [[s.x + f * k * 22, s.y + (k % 2 ? 3 : -3)], [s.x + f * (k + 1) * 22, s.y + (k % 2 ? -3 : 3)]], mat.edge, 2, dn.f);
}

// ── T33 Nachtmaß: measuring-compass stealth with two swivelling arcs ─────
function nachtmass(ctx, s, pose, mat, form, layer) {
  if (layer !== 'front') return;
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  let A = [s.shoulderF[0] + f * 12, s.shoulderF[1] - 8]; let B = [s.kneeB[0] - f * 10, s.kneeB[1] + (j.air ? 12 : 0)];
  A = lerpP(A, [s.x + f * 22, s.chest[1] - 16], pose.guardK); B = lerpP(B, [s.x + f * 22, s.chest[1] + 10], pose.guardK);
  if (gr.k) B = lerpP(B, [gr.tx ?? s.x + f * 40, s.chest[1] + 6], gr.k);
  A = lerpP(A, [s.x + f * 40, s.chest[1] - 8], fw.a); B = lerpP(B, [s.x + f * 90, s.chest[1] - 8], fw.f);
  A = lerpP(A, [s.x + f * 14, s.head[1] - 30], up.a); B = lerpP(B, [s.x + f * 30, s.head[1] - 30], up.f);
  B = lerpP(B, [s.x + f * 50, s.y - 4], dn.a);
  A = gather(A, s.chest, pose.fade * 1.4); B = gather(B, s.chest, pose.fade * 1.4);
  // Two small free-swinging compass arcs with fine measuring motions.
  [A, B].forEach((c, i) => {
    const open = .5 + .2 * Math.sin(t * 1.7 + i * 2) + .6 * Math.max(fw.f, up.f) + (j.apex && i === 0 ? .5 : 0);
    for (const sg of [-1, 1]) shape(ctx, c, sg * open + (i ? Math.PI : 0), f, [[-1, 0], [1, 0], [.5, 18], [-.5, 18]], mat, 6010 + i * 2 + (sg > 0 ? 1 : 0), { alpha: pose.fade, lit: 1, glowEdge: .6 });
    plate(ctx, [[c[0] - 2, c[1] - 2], [c[0] + 2, c[1] - 2], [c[0] + 2, c[1] + 2], [c[0] - 2, c[1] + 2]], mat, 6020 + i, { alpha: pose.fade, core: 1 });
  });
  // Irregular matte shadow foils flicker between them.
  for (let k = 0; k < 3; k++) { if (Math.sin(t * 9 + k * 2.3) < .2) continue; const u = .25 + k * .25; const p = lerpP(A, B, u); plate(ctx, [[p[0] - 7, p[1] - 4], [p[0] + 6, p[1] - 6], [p[0] + 7, p[1] + 4], [p[0] - 6, p[1] + 5]], { ...mat, kind: 'smoke', body: '#1a1e28', facet: '#262c38' }, 6030 + k, { alpha: .6 * pose.fade }); }
  if (pose.guardK > .3) line(ctx, [A, B], mat.edge, 1, pose.guardK);
  if (pose.sprintK > .3) line(ctx, [B, [B[0] - f * 30, B[1] - 6], [B[0] - f * 60, B[1]]], mat.vein, 1, pose.sprintK * .6);
  if (fw.s) line(ctx, [[s.x + f * 20, s.chest[1] - 6], [s.x + f * 90 * fw.s, s.chest[1] - 8]], mat.edge, 1.5, fw.s);
  if (fw.f) { const pts = []; for (let q = 0; q <= 10; q++) { const a = -.8 + q * .16; pts.push([s.x + f * (30 + Math.cos(a) * 80), s.chest[1] + Math.sin(a) * 40]); } band(ctx, pts, (q, n) => 4 * Math.sin(q / n * Math.PI) + .5, { ...mat, kind: 'smoke', body: '#141822' }, 6040, { t, alpha: fw.f }); }
  if (up.f) { ctx.save(); ctx.globalAlpha = .6 * up.f; ctx.fillStyle = '#0c0e14'; ctx.fillRect(s.x + f * 18 - 5, s.y - 170, 10, 170); ctx.restore(); }
  if (dn.f) { const pts = []; for (let q = 0; q <= 8; q++) pts.push([s.x + f * q * 16, s.y + (q % 2 ? 4 : -4)]); line(ctx, pts, '#141822', 4, dn.f); line(ctx, pts, mat.edge, 1, dn.f); }
}

// ── T34 Sternwerk: external work projector behind a shoulder ─────────────
function sternwerk(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  let c = [s.shoulderB[0] - f * 22, s.shoulderB[1] - 24 + Math.sin(t * 1.2) * 2 + (j.air ? 18 * (1 - j.apex) : 0)];
  let aim = -.3 + (fw.a ? .3 : 0) - up.a * 1.2 + dn.a * .8 + pose.guardK * .4;
  c = gather(c, s.shoulderB, pose.fade * 1.4);
  const close = j.land;
  if (layer === 'back' || pose.guardK > .5) {
    // Three angled ceramic segments with small adjustment steps; an empty tool socket floats in the middle.
    for (let i = 0; i < 3; i++) { const a = aim + (i - 1) * (.8 - close * .5) + Math.round(Math.sin(t * 1.5 + i) * 2) * .03; shape(ctx, c, a + 1.57, f, [[-4, 6], [4, 6], [6, 22], [-6, 22]], mat, 6110 + i, { alpha: pose.fade, lit: .9, glowEdge: .5 }); }
    orbitItem(ctx, 'frame', c[0], c[1], 5, 0, mat, 6115, pose.fade, t);
    for (let k = 0; k < 4; k++) { const a = t * 2 + k * TAU / 4; specks(ctx, [[c[0] + Math.cos(a) * 3, c[1] + Math.sin(a) * 3]], mat.core, pose.fade * .9, 1); }
    if (pose.guardK > .3) for (let k = 0; k < 4; k++) plate(ctx, [[s.x + f * 22, s.chest[1] - 24 + k * 13], [s.x + f * 30, s.chest[1] - 22 + k * 13], [s.x + f * 30, s.chest[1] - 12 + k * 13], [s.x + f * 22, s.chest[1] - 13 + k * 13]], { ...mat, kind: 'crystal' }, 6120 + k, { alpha: pose.guardK * .7, glowEdge: .9 });
  }
  if (layer === 'front') {
    if (gr.k) line(ctx, [c, [gr.tx ?? s.x + f * 40, s.chest[1]]], mat.edge, 2, gr.k);
    const shot = (x, y, k, seed) => plate(ctx, [[x, y - 3], [x + 4, y], [x, y + 3], [x - 4, y]], mat, seed, { alpha: k, core: 1, glowEdge: 1.2 });
    if (fw.s) shot(c[0] + f * (20 + fw.e * 300), c[1] + fw.e * 60, fw.s, 6130);
    if (fw.f) for (let k = 0; k < 4; k++) shot(c[0] + f * (20 + fw.e * (240 + k * 30)), c[1] + fw.e * (40 + k * 18) - k * 6, fw.f, 6131 + k);
    if (up.s) shot(c[0], c[1] - up.e * 200, up.s, 6136);
    if (up.f) for (let k = 0; k < 5; k++) shot(s.x + f * (16 + k * 6), s.y - 20 - k * 26, up.f * clamp01(up.e * 6 - k * .5), 6137 + k);
    if (dn.s) groundRing(ctx, s.x + f * 30, s.y, 6, mat, t * 3, dn.s, 5, 6143, 2);
    if (dn.f) groundRing(ctx, s.x + f * 30, s.y, 46, mat, t, dn.f, 8, 6145, 5, .5);
  }
}

// ── T35 Kältestillstand: frost condensation bands with time stutter ──────
function kaeltestillstand(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const glass = { ...mat, kind: 'crystal' };
  const st = scratch(pose, 'T35');
  const bands = [{ a: s.elbowF, b: s.handF, L: 26, front: true }, { a: s.hipF, b: [s.hipF[0] + f * 10, s.hipF[1] + 10], L: 20, front: true }, { a: s.back, b: [s.back[0] - f * 10, s.back[1] - 20], L: 34, front: false }];
  st.frozen ??= bands.map(() => null);
  bands.forEach((bd, i) => {
    // Each band holds for a few frames, then jumps back to its smoothed position.
    let A = [bd.a[0] + f * (bd.front ? 8 : -8), bd.a[1] - 4];
    const hold = Math.sin(t * 1.7 + i * 2.2) > .85;
    if (hold && st.frozen[i]) A = st.frozen[i]; else st.frozen[i] = A;
    if (pose.guardK > .05) A = lerpP(A, [s.x + f * (20 + i * 4), s.chest[1] - 22 + i * 16], pose.guardK);
    if (gr.k && i === 0) A = lerpP(A, [gr.tx ?? s.x + f * 36, s.chest[1]], gr.k);
    A = lerpP(A, [s.x + f * (26 + i * 30), s.chest[1] - 6 + i * 4], fw.f);
    A = lerpP(A, [s.x + f * 14, s.y - 30 - i * 40], up.f);
    A = lerpP(A, [s.x + f * (16 + i * 34), s.y - 2], dn.f);
    A = gather(A, bd.a, pose.fade * 1.4);
    const isFront = bd.front || pose.guardK > .5 || fw.a > .3 || up.f > .3 || dn.f > .3;
    if ((layer === 'front') !== isFront) return;
    const dir = pose.guardK > .5 || up.f > .3 ? [0, -1] : fw.f > .3 || dn.f > .3 ? [f, 0] : [bd.front ? f * .9 : -f * .7, bd.front ? .3 : -.5];
    const L = bd.L * (1 + .8 * Math.max(fw.f, dn.f, up.f));
    // A broken glass strip: segments with gaps (quiet empty image space between bands).
    for (let k = 0; k < 4; k++) { if (k === 2 && !fw.f) continue; const u0 = k / 4; const u1 = u0 + .2; const p0 = [A[0] + dir[0] * L * u0, A[1] + dir[1] * L * u0]; const p1 = [A[0] + dir[0] * L * u1, A[1] + dir[1] * L * u1]; plate(ctx, [[p0[0], p0[1] - 3], [p1[0], p1[1] - 3], [p1[0], p1[1] + 3], [p0[0], p0[1] + 3]], glass, 6210 + i * 10 + k, { alpha: pose.fade * .85, glowEdge: .9, lit: .8 }); }
    // Jump: afterimage stripes linger at several heights.
    if (j.air) for (let k = 1; k <= 2; k++) line(ctx, [[A[0], A[1] + k * 10], [A[0] + dir[0] * L, A[1] + dir[1] * L + k * 10]], mat.edge, 1, .3 / k);
  });
  if (layer === 'front') {
    if (fw.s) specks(ctx, [[s.handF[0] + f * 12, s.handF[1]], [s.handF[0] + f * 18, s.handF[1] - 3]], mat.edge, fw.s, 3);
    if (fw.f) channel(ctx, s.x + f * 30, s.chest[1] - 4, f, 150 * fw.f, 12, glass, 6240, fw.f * .45, 7);
    if (dn.s) groundRing(ctx, s.footF[0], s.y, 8, glass, 0, dn.s, 6, 6250, 2);
    if (dn.f) { ctx.save(); ctx.globalAlpha = .22 * dn.f; ctx.fillStyle = mat.edge; ctx.beginPath(); ctx.ellipse(s.x + f * 40, s.y, 80 * dn.f, 22 * dn.f, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  }
}

// ── T36 Bollwerklicht: three lateral light sails as place-bound supports ─
function bollwerklicht(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const fw = techOf(pose, 'forward'); const up = techOf(pose, 'up'); const dn = techOf(pose, 'down'); const j = jumpOf(pose); const gr = grabOf(pose);
  const glass = { ...mat, kind: 'crystal' };
  const sails = [{ a: s.shoulderB, ang: -2.4, L: 52, w: 16 }, { a: s.back, ang: -2.9, L: 44, w: 13 }, { a: s.hipB, ang: 2.7, L: 30, w: 10 }];
  sails.forEach((sl, i) => {
    // Each sail lifts slightly in its own rhythm; running pulls the ends behind; jumps tip them down.
    let base = [sl.a[0] - f * 4, sl.a[1]]; let ang = sl.ang + Math.sin(t * (.9 + i * .3) + i) * .06 - Math.max(pose.sprintK, pose.run * .5) * .3 + j.air * .5;
    if (i < 2) { base = lerpP(base, [s.x + f * 18, s.chest[1] - 14 + i * 22], pose.guardK); ang = lerp(ang, i ? .5 : -.5, pose.guardK); }
    if (i === 2 && gr.k) { base = lerpP(base, [s.x + f * 20, s.chest[1]], gr.k); ang = lerp(ang, 0, gr.k); }
    ang = lerp(ang, (i - 1) * .35, fw.f); base = lerpP(base, [s.x + f * 18, s.chest[1] - 6], fw.f);
    ang = lerp(ang, -1.57 + (i - 1) * .3, up.f);
    ang = lerp(ang, (i - 1) * 2.1 + .3, dn.f); base = lerpP(base, [s.x, s.y - 6], dn.f);
    base = gather(base, sl.a, pose.fade * 1.4 - i * .1);
    const isFront = i < 2 && pose.guardK > .5 || fw.f > .5 || up.f > .5 || dn.f > .5 || i === 2 && gr.k > .5;
    if ((layer === 'front') !== isFront) return;
    // A bent light sail — no feathers, open gaps between the three.
    const L = sl.L * (1 + .6 * Math.max(fw.f, up.f)); const dir = [Math.cos(ang) * f, Math.sin(ang)]; const n = [-dir[1], dir[0]];
    const kink = [base[0] + dir[0] * L * .5 + n[0] * sl.w * .5, base[1] + dir[1] * L * .5 + n[1] * sl.w * .5];
    const tip = [base[0] + dir[0] * L, base[1] + dir[1] * L];
    plate(ctx, [base, kink, tip, [base[0] + dir[0] * L * .55 - n[0] * 4, base[1] + dir[1] * L * .55 - n[1] * 4]], glass, 6310 + i, { alpha: pose.fade * .75, glowEdge: 1, core: .2 });
    line(ctx, [base, kink, tip], mat.edge, 1, .8 * pose.fade);
    if (j.air) line(ctx, [tip, [tip[0] - f * 10, tip[1] + 12]], mat.vein, 1, .5);
  });
  if (layer === 'front') {
    if (fw.s) channel(ctx, s.x + f * 20, s.chest[1] - 6, f, 70 * fw.s, 2, glass, 6330, fw.s, 3);
    if (fw.f) channel(ctx, s.x + f * 40, s.chest[1] - 6, f, 160 * fw.f, 16, glass, 6335, fw.f * .45, 7);
    if (up.s) line(ctx, [[s.x + f * 12, s.chest[1]], [s.x + f * 14, s.chest[1] - 40 * up.s]], mat.edge, 2, up.s);
    if (dn.s) groundRing(ctx, s.x, s.y, 12, glass, 0, dn.s, 6, 6340, 2);
    if (dn.f) groundRing(ctx, s.x, s.y, 70 * dn.f, glass, t * .3, dn.f * .8, 14, 6345, 4, .7);
  }
}

registerFormRenderer('T25', haemolith);
registerFormRenderer('T26', resonanzwache);
registerFormRenderer('T27', faltspur);
registerFormRenderer('T28', rasterdom);
registerFormRenderer('T29', werkgestalt);
registerFormRenderer('T30', leisefaden);
registerFormRenderer('T31', klingenherbarium);
registerFormRenderer('T32', taktfunke);
registerFormRenderer('T33', nachtmass);
registerFormRenderer('T34', sternwerk);
registerFormRenderer('T35', kaeltestillstand);
registerFormRenderer('T36', bollwerklicht);
