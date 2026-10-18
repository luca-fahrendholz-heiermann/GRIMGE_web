// GRIMGE Prototype — signature renderers of Arcane States that have their
// own reference art (user mockups, 18 Oct 2026):
//  • T40 Sonnenwyrm — two dragons of rhombic obsidian scales with gold rims
//    and ember seams circle the Wizard; angular heads with turquoise eyes,
//    swept horn fins and a lance-blade crest; a long golden lance in the
//    front hand; a spiked halo crown; floating scales.
//  • T38 Asterglied — five floating stone joint brackets (cylindrical drum
//    segments with golden veins), many pale crystals and drifting rubble.
//  • T39 Vorausschnitt — four floating holographic frames with corner
//    brackets and glitch edges, showing ghost silhouettes of the Wizard in
//    motion poses and abstract motion vectors; green static at the body.
//  • T37 Säuregerüst — a bundle of glass tubes with green fluid and brass
//    caps above the back, brass hoses to two side units with hexagonal glass
//    chambers, floating hex crystals, acid drips and green mist.
// Each has its own MORPHOLOGY (silhouette family), so no two read alike:
// Sonnenwyrm = creature manifestation, Asterglied = orbital construct,
// Vorausschnitt = temporal projection, Säuregerüst = body augmentation,
// Risswild = energy extension (Arkengestell stays the one astral avatar).
// Attachment-only: the Wizard's own sprite stays visible and unchanged.
import { plate, band, fallout, mix, rgba, registerRenderer } from './buff_vfx.js';
import { sprites } from './sprites.js';
import { drawNinefoldSpirit } from './forms_fx.js';

const TAU = Math.PI * 2;
const snap = (v) => Math.round(v);

// ── Sonnenwyrm building blocks (also used by its techniques) ────────────
// One rhombic scale oriented along (dx, dy).
function scale(ctx, x, y, dx, dy, len, wid, mat, seed, alpha) {
  const l = Math.hypot(dx, dy) || 1; const ux = dx / l; const uy = dy / l; const nx = -uy; const ny = ux;
  plate(ctx, [[x - ux * len * .5, y - uy * len * .5], [x + nx * wid * .5, y + ny * wid * .5], [x + ux * len * .5, y + uy * len * .5], [x - nx * wid * .5, y - ny * wid * .5]], mat, seed, { alpha, pulse: .5 + .5 * Math.sin(seed * 1.7), glowEdge: 1.1 });
}

// A wyrm body of overlapping rhombic scales along a spine (tail → head).
export function drawWyrmBody(ctx, spine, mat, seed, alpha = 1, thickness = 1) {
  const n = spine.length;
  // A continuous obsidian underbody so the scales read as one creature.
  if (n > 1) band(ctx, spine.slice().reverse(), (i, nn) => (4 + 10 * Math.sin(Math.min(1, (i / nn) * 1.3) * Math.PI * .5)) * thickness, { ...mat, kind: 'crust', body: mix(mat.dark, '#000000', .2), facet: mat.dark }, seed + 500, { alpha, glow: .6 });
  for (let i = n - 1; i >= 1; i--) {
    const [x, y] = spine[i]; const [px, py] = spine[i - 1];
    const k = 1 - i / n; // 0 at the tail, 1 near the head
    const wid = (6 + 12 * Math.sin(Math.min(1, k * 1.3) * Math.PI * .5)) * thickness;
    scale(ctx, (x + px) / 2, (y + py) / 2, px - x, py - y, Math.hypot(px - x, py - y) * 2.2 + 4, wid * 1.6, mat, seed + i, alpha);
    // Side scales flaring off the body.
    if (i % 3 === 0) {
      const dx = px - x; const dy = py - y; const l = Math.hypot(dx, dy) || 1;
      for (const sgn of [-1, 1]) scale(ctx, x - dy / l * wid * sgn * 1.1, y + dx / l * wid * sgn * 1.1, dx - dy * sgn * .8, dy + dx * sgn * .8, 12 * thickness, 5 * thickness, mat, seed + 100 + i + sgn, alpha * .9);
    }
  }
}

// An angular wyrm head looking along (dx, dy): skull, jaw, horn fins,
// lance-blade crest and a turquoise eye.
export function drawWyrmHead(ctx, x, y, dx, dy, size, mat, open = .2, alpha = 1, seed = 900) {
  const l = Math.hypot(dx, dy) || 1; const ux = dx / l; const uy = dy / l; const nx = -uy; const ny = ux;
  const P = (a, b) => [x + ux * a * size + nx * b * size, y + uy * a * size + ny * b * size];
  // Swept-back horn fins.
  for (let i = 0; i < 3; i++) plate(ctx, [P(-.1, -.25 - i * .08), P(-.9 - i * .25, -.55 - i * .22), P(-.35, -.18 - i * .05)], mat, seed + i, { alpha, glowEdge: 1.2 });
  // Jaw (opens on attacks).
  plate(ctx, [P(.05, .12), P(.95, .18 + open * .4), P(.7, .32 + open * .5), P(-.1, .3)], mat, seed + 5, { alpha });
  // Skull with the lance-blade crest running forward.
  plate(ctx, [P(-.35, -.2), P(.25, -.3), P(1.05, -.04), P(.95, .12), P(-.3, .22)], mat, seed + 6, { alpha, core: .8 });
  plate(ctx, [P(-.2, -.26), P(.6, -.36), P(1.45, -.12), P(.55, -.22)], mat, seed + 7, { alpha, core: 1, glowEdge: 1.4 });
  // Teeth.
  for (let i = 0; i < 3; i++) { const a = .35 + i * .18; plate(ctx, [P(a, .12), P(a + .05, .24 + open * .2), P(a + .1, .13)], mat, seed + 10 + i, { alpha, glowEdge: .6 }); }
  // Turquoise eye.
  const [ex, ey] = P(.42, -.08);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
  ctx.fillStyle = rgba(mat.spark, .5); ctx.fillRect(snap(ex) - size * .1, snap(ey) - size * .06, size * .2, size * .12);
  ctx.fillStyle = mix(mat.spark, '#ffffff', .4); ctx.fillRect(snap(ex) - 2, snap(ey) - 1, 4, 3);
  ctx.restore();
}

// Spine on an elliptical orbit around a centre (phase advances along it).
function orbitSpine(cx, cy, rx, ry, phase, length, count, tilt = 0) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = phase - (i / (count - 1)) * length;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry + Math.cos(a) * tilt]);
  }
  return pts;
}

function sonnenwyrm(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t;
  const wyrms = [
    { cy: s.y - 100, rx: 150, ry: 46, tilt: -24, speed: .55, phase: 0, size: 52 },
    { cy: s.y - 38, rx: 132, ry: 36, tilt: 16, speed: .55, phase: Math.PI, size: 44 }
  ];
  wyrms.forEach((w, wi) => {
    let spine;
    if (pose.sprint) {
      // Sprint: the wyrms stream out behind, heads at the shoulders.
      spine = Array.from({ length: 16 }, (_, i) => { const k = i / 15; return [s.x - f * (20 + k * 190), w.cy + 30 * (wi ? 1 : -.4) + Math.sin(t * 6 + k * 5 + wi) * 10 * k]; });
    } else {
      // V3.2: two differently long lance bands swing BEHIND the Wizard and cross
      // each other dynamically — chest and head stay free (no orbit through the body).
      const side = wi ? 1 : -1; const len = wi ? 150 : 190;
      spine = Array.from({ length: 18 }, (_, i) => { const k = i / 17; const sw = Math.sin(t * 1.1 + wi * Math.PI + k * 3.2); return [s.x - f * (14 + k * len * .62) + f * sw * 14 * k, w.cy + 40 * wi - side * Math.sin(k * Math.PI) * 38 + sw * 22 * (.3 + k) + pose.air * -30 * (1 - k) + (pose.airborne && pose.air < 0 ? 30 * k : 0)]; });
    }
    // Depth: everything stays behind the body (sprint trail included).
    const isBack = () => true;
    const runs = []; let cur = [];
    spine.forEach((p, i) => { if (isBack(p, i) === (layer === 'back')) cur.push(p); else { if (cur.length > 1) runs.push(cur); cur = []; } });
    if (cur.length > 1) runs.push(cur);
    for (const run of runs) drawWyrmBody(ctx, run, mat, 4000 + wi * 50, pose.fade, wi ? 1.15 : 1.3);
    // Head on its own layer.
    const [hx, hy] = spine[0]; const [nx, ny] = spine[1];
    // V3.2: recognisable wyrm heads appear only for heavy attacks (charge / release);
    // otherwise the band ends in a narrow lance-scale wedge.
    const heavy = Math.max(pose.charge ?? 0, pose.tech ? pose.tech.k : 0);
    if (layer === 'back') {
      if (heavy > .05) drawWyrmHead(ctx, hx, hy, hx - nx, hy - ny, w.size * (.6 + .4 * heavy), mat, .2 + .5 * heavy, pose.fade * Math.min(1, heavy * 2), 4200 + wi * 20);
      else { const dx = hx - nx; const dy = hy - ny; const l = Math.hypot(dx, dy) || 1; plate(ctx, [[hx - dy / l * 5, hy + dx / l * 5], [hx + dx / l * 18, hy + dy / l * 18], [hx + dy / l * 5, hy - dx / l * 5]], mat, 4230 + wi, { alpha: pose.fade, core: 1, glowEdge: 1.2 }); }
    }
  });
  if (layer === 'back') {
    // Spiked halo crown above the head and floating scales.
    const [cx, cy] = s.crown;
    for (let i = 0; i < 11; i++) { const a = -Math.PI + (i / 10) * Math.PI; const len = i % 2 ? 9 : 15; const bx = cx + Math.cos(a) * 13; const by = cy + 2 + Math.sin(a) * 7; plate(ctx, [[bx - 2.5, by], [bx + Math.cos(a) * len, by + Math.sin(a) * len], [bx + 2.5, by]], mat, 4400 + i, { alpha: pose.fade, glowEdge: 1.3 }); }
    for (let i = 0; i < 10; i++) { const a = t * .6 + i * TAU / 10; scale(ctx, s.chest[0] + Math.cos(a) * 70, s.chest[1] - 10 + Math.sin(a * 1.3) * 44, Math.cos(a + 1), Math.sin(a + 1), 10, 6, mat, 4500 + i, pose.fade * .85); }
  } else {
    // The golden lance projection in the front hand.
    const [hx, hy] = s.handF; const L = 70;
    plate(ctx, [[hx - f * 22, hy + 1.5], [hx + f * L, hy - 1], [hx + f * L, hy + 1], [hx - f * 22, hy + 3]], mat, 4600, { alpha: pose.fade });
    plate(ctx, [[hx + f * (L - 4), hy - 6], [hx + f * (L + 34), hy], [hx + f * (L - 4), hy + 6], [hx + f * (L + 4), hy]], mat, 4610, { alpha: pose.fade, core: 1, glowEdge: 1.5 });
    fallout(ctx, [[hx + f * (L + 20), hy]], mat, t, 4620, { count: 6, alpha: pose.fade, driftX: -f * 20 });
  }
}

// ── T38 Asterglied — ORBITAL CONSTRUCT ──────────────────────────────────
// No arms, no head: five massive broken stone rings float at different
// angles around the Wizard, spin on their own axes and drift around him.
// On attacks they assemble (fist, ring tower, shield, crushing machine —
// see buff_techniques.js / buff_forms.js).
export const STONE = { kind: 'crust', dark: '#2c2a27', body: '#55524b', facet: '#77726a', vein: '#e3c37a', edge: '#efe1b8', spark: '#f6d58a', core: '#fff6d8', glow: 'rgba(227,195,122,', edgeGlow: 'rgba(239,225,184,' };
const PALE_CRYSTAL = { kind: 'crystal', dark: '#5f6b44', body: '#c9d39a', facet: '#eef3c8', vein: '#f4e9a0', edge: '#fff7c8', spark: '#fff2a8', core: '#fffde8', glow: 'rgba(244,233,160,', edgeGlow: 'rgba(255,247,200,' };

// A broken stone ring seen in 3D: radius r, tilt (0 = flat on the ground,
// 1 = upright), spin = rotation along the ring, gaps = missing arcs.
export function stoneRing(ctx, cx, cy, r, tilt, roll, spin, thick, seed, alpha, layer = null, gaps = 2) {
  const segs = 14; const gapEvery = Math.floor(segs / gaps);
  const sq = Math.max(.18, Math.abs(Math.cos(tilt * Math.PI / 2)));
  const cr = Math.cos(roll); const sr = Math.sin(roll);
  const P = (a, d) => { const x = Math.cos(a) * d; const y = Math.sin(a) * d * sq; return [cx + x * cr - y * sr, cy + x * sr + y * cr]; };
  for (let i = 0; i < segs; i++) {
    if (i % gapEvery === gapEvery - 1) continue; // broken gaps
    const a0 = spin + i / segs * TAU; const a1 = a0 + TAU / segs * .9;
    const back = Math.sin((a0 + a1) / 2) < 0;
    if (layer && (layer === 'back') !== back) continue;
    plate(ctx, [P(a0, r), P(a1, r), P(a1, r + thick), P(a0, r + thick)], STONE, seed + i, { alpha: alpha * (back ? .85 : 1), pulse: .5 + .5 * Math.sin(seed + i * 1.3), glowEdge: .5, lit: .7 });
  }
}

function asterglied(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t;
  const rings = [
    { dx: -70, dy: -150, r: 34, tilt: .75, roll: .5, sp: .6 }, { dx: 80, dy: -160, r: 30, tilt: .6, roll: -.6, sp: -.7 },
    { dx: 0, dy: -205, r: 26, tilt: .25, roll: .1, sp: .9 }, { dx: -120, dy: -70, r: 38, tilt: .85, roll: -.3, sp: -.5 },
    { dx: 115, dy: -62, r: 36, tilt: .45, roll: .4, sp: .55 }
  ];
  const peak = pose.full ? 1.25 : 1;
  rings.forEach((g, i) => {
    const orbitA = t * .25 + i * TAU / 5;
    const x = s.x + (g.dx + Math.cos(orbitA) * 12) * f * peak - f * pose.run * 18;
    const y = s.y + g.dy * peak + Math.sin(orbitA) * 8 + Math.sin(t * 1.1 + i) * 4 + pose.air * -18;
    // Guarding: the rings slide in front (the shield itself is drawn by the guard hook).
    const gx = pose.guard ? s.x + f * 34 : x; const gy = pose.guard ? s.y - 60 - i * 12 : y;
    stoneRing(ctx, gx, gy, g.r * 1.3 * (pose.guard ? .7 : 1), pose.guard ? .9 : g.tilt, g.roll + Math.sin(t * .4 + i) * .2, t * g.sp, 17, 5000 + i * 40, pose.fade, layer);
  });
  for (let i = 0; i < 9; i++) {
    const a = i * TAU / 9 + t * .18; const back = Math.sin(a) < 0;
    if ((layer === 'back') !== back) continue;
    const x = s.x + Math.cos(a) * 150; const y = s.y - 110 + Math.sin(a) * 70 + Math.sin(t * 1.6 + i) * 6;
    const h = 7 + (i % 3) * 3;
    plate(ctx, [[x, y - h], [x + h * .5, y - h * .3], [x + h * .4, y + h * .6], [x - h * .4, y + h * .6], [x - h * .5, y - h * .3]], PALE_CRYSTAL, 5600 + i, { alpha: pose.fade * .9, core: .6 });
  }
  if (layer === 'front') fallout(ctx, rings.map((g) => [s.x + g.dx * f, s.y + g.dy + 20]), STONE, t, 5800, { count: 10, alpha: pose.fade });
}

// ── T39 Vorausschnitt — TEMPORAL PROJECTION ─────────────────────────────
// No body-like manifestation: four large, slightly transparent time planes
// stand offset in space. Each shows the Wizard's own movement from a moment
// ago (recorded trail); on attacks these echoes leave their planes and
// strike delayed (EchoStrikeFx in buff_forms.js).
export function ghostOf(ctx, player, x, y, state, animTime, facing, alpha, tint = '#d9e6dd', scaleK = 1) {
  if (!player?.heroKey) return;
  ctx.save();
  if (scaleK !== 1) { ctx.translate(x, y); ctx.scale(scaleK, scaleK); ctx.translate(-x, -y); }
  sprites.renderEntity(ctx, player.heroKey, x, y, { facing, state, animTime, alpha, tint });
  ctx.restore();
}

function timePlane(ctx, x, y, w, h, depthSkew, mat, alpha, t, seed) {
  // A standing plane in perspective: its top edge leans away from the camera.
  const quad = [[x, y - h], [x + w, y - h - depthSkew], [x + w, y - depthSkew * .2], [x, y]];
  ctx.save();
  const g = ctx.createLinearGradient?.(x, y - h, x, y);
  if (g) { g.addColorStop(0, rgba(mat.edge, .08)); g.addColorStop(1, rgba(mat.vein, .2)); ctx.fillStyle = g; } else ctx.fillStyle = rgba(mat.vein, .14);
  ctx.globalAlpha = alpha;
  ctx.beginPath(); quad.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  // Time ticks running along the plane edges.
  ctx.strokeStyle = mat.core; ctx.lineWidth = 1.4; ctx.globalAlpha = alpha * .8; ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const u = ((t * .5 + i / 6 + seed) % 1);
    const [ax, ay] = quad[0]; const [bx, by] = quad[1];
    ctx.globalAlpha = alpha * Math.sin(u * Math.PI); ctx.fillStyle = mat.core;
    ctx.fillRect(ax + (bx - ax) * u, ay + (by - ay) * u - 2, 3, 4);
  }
  // Ripples across the plane (time passing).
  ctx.globalAlpha = alpha * .25; ctx.strokeStyle = mat.edge; ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) { const v = ((t * .3 + k / 3 + seed) % 1); ctx.beginPath(); ctx.moveTo(x, y - h * v); ctx.lineTo(x + w, y - h * v - depthSkew * (1 - v * .8)); ctx.stroke(); }
  ctx.restore();
}

function vorausschnitt(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t; const player = pose.player; const trail = player?._timeTrail ?? [];
  const planes = [
    { dx: -150, dz: -.12, w: 70, h: 120, delay: 12, back: true }, { dx: -75, dz: -.2, w: 64, h: 128, delay: 24, back: true },
    { dx: 70, dz: -.18, w: 64, h: 124, delay: 36, back: true }, { dx: -110, dz: .14, w: 72, h: 110, delay: 48, back: false }
  ];
  const peak = pose.full ? 1.2 : 1;
  planes.forEach((pl, i) => {
    if ((layer === 'back') !== pl.back) return;
    const baseY = s.y + pl.dz * 150 * .55;
    const x = s.x + pl.dx * f * peak - (f < 0 ? pl.w : 0);
    timePlane(ctx, x, baseY, pl.w * peak, pl.h * peak, 14 * f, mat, pose.fade, t, i * .29);
    // The echo inside: the Wizard's own pose from `delay` frames ago.
    const past = trail[Math.min(trail.length - 1, pl.delay)];
    if (past) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 4, baseY - pl.h * peak - 20, pl.w * peak + 8, pl.h * peak + 24); ctx.clip();
      ghostOf(ctx, player, x + pl.w * peak / 2 + (past.x - s.x) * .3, baseY - 2, past.state, past.animTime, past.facing, .45 * pose.fade, i % 2 ? '#c9f5dc' : '#f3d9e6', .8);
      ctx.restore();
    }
  });
  if (layer === 'front') {
    // Faint time static along the body.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const k = Math.sin(t * 8 + i * 2.3); if (k < .3) continue;
      ctx.globalAlpha = pose.fade * k * .8; ctx.strokeStyle = i % 2 ? mat.edge : mat.core; ctx.lineWidth = 1.2;
      let x = s.x - f * 10; let y = s.y - 70 + i * 18; ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += f * 7; y += j % 2 ? -5 : 5; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── T37 Säuregerüst — BODY AUGMENTATION ─────────────────────────────────
// No giant body: transparent catalyst tubes wind around arms, back and legs,
// fluid is pumped between small chambers, irregular acid-glass bubbles float
// close by and acid vapour streams over the ground. (Peak: Down Full turns
// the ground into a rising acid-glass reactor — buff_techniques.js.)
export const ACID_GLASS = { kind: 'crystal', dark: '#24493c', body: '#7fd8a4', facet: '#d6fbe4', vein: '#7dff9c', edge: '#e9fff1', spark: '#9dff7a', core: '#f4fff6', glow: 'rgba(125,255,156,', edgeGlow: 'rgba(233,255,241,' };
const BRASS = { kind: 'crust', dark: '#3b2d16', body: '#7a5a26', facet: '#a8803a', vein: '#e9c46a', edge: '#ffe29a', spark: '#ffd36a', core: '#fff3c8', glow: 'rgba(233,196,106,', edgeGlow: 'rgba(255,226,154,' };

// A transparent tube coiling around a limb segment A→B (front or back half).
function coilTube(ctx, A, B, radius, turns, t, layer, seed, alpha) {
  const n = Math.max(12, Math.round(turns * 10));
  const dx = B[0] - A[0]; const dy = B[1] - A[1]; const len = Math.hypot(dx, dy) || 1; const nx = -dy / len; const ny = dx / len;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const u = i / n; const a = u * turns * TAU + seed;
    const cx = A[0] + dx * u; const cy = A[1] + dy * u;
    const p = [cx + nx * Math.cos(a) * radius, cy + ny * Math.cos(a) * radius + Math.sin(a) * 1.5];
    const front = Math.sin(a) > 0;
    if (prev && (layer === 'front') === front) {
      ctx.save();
      ctx.globalAlpha = alpha * .8; ctx.strokeStyle = '#d8f5e8'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      ctx.globalAlpha = alpha; ctx.strokeStyle = '#3fcf6c'; ctx.lineWidth = 3; ctx.stroke();
      // Pumped fluid pulses.
      if (Math.sin(u * 18 - t * 9 + seed) > .85) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#d8ffe2'; ctx.fillRect(p[0] - 1, p[1] - 1, 3, 3); }
      ctx.restore();
    }
    prev = p;
  }
}

function acidBubble(ctx, x, y, r, t, seed, alpha) {
  // Irregular etched-glass blob.
  const pts = Array.from({ length: 9 }, (_, j) => { const a = j / 9 * TAU; const w = 1 + .22 * Math.sin(seed * 3 + j * 1.7 + t * 1.5); return [x + Math.cos(a) * r * w, y + Math.sin(a) * r * w * .9]; });
  plate(ctx, pts, ACID_GLASS, seed, { alpha: alpha * .85, core: .5, glowEdge: .8 });
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * .7; ctx.fillStyle = '#ffffff';
  ctx.fillRect(snap(x - r * .4), snap(y - r * .5), 2, 3); ctx.restore();
}

function saeuregeruest(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t;
  const peak = pose.full ? 1.6 : 1;
  // Catalyst tubes around both arms, the back and both legs.
  const limbs = layer === 'front'
    ? [[s.elbowF, s.handF, 4, 1.6], [s.kneeF, s.footF, 4.5, 1.8], [s.shoulderF, s.elbowF, 4.5, 1.2]]
    : [[s.elbowB, s.handB, 4, 1.6], [s.kneeB, s.footB, 4.5, 1.8], [s.shoulderB, s.elbowB, 4.5, 1.2], [[s.back[0], s.back[1] - 10], [s.hip[0] - f * 4, s.hip[1]], 6, 2.4]];
  limbs.forEach(([A, B, r, turns], i) => coilTube(ctx, A, B, r * 1.9 * peak, turns, t, layer, 7000 + i * 3 + (layer === 'front' ? 50 : 0), pose.fade));
  if (layer === 'back') {
    // Small chambers on the back the fluid is pumped between.
    for (let i = 0; i < 2; i++) {
      const x = s.back[0] - f * (4 + i * 9); const y = s.back[1] - 6 + i * 16;
      const hex = Array.from({ length: 6 }, (_, j) => [x + Math.cos(j * TAU / 6) * 6, y + Math.sin(j * TAU / 6) * 6]);
      plate(ctx, hex, ACID_GLASS, 7100 + i, { alpha: pose.fade, core: .5 + .5 * Math.sin(t * 4 + i * 2) });
      plate(ctx, [[x - 6, y - 8], [x + 6, y - 8], [x + 6, y - 6], [x - 6, y - 6]], BRASS, 7110 + i, { alpha: pose.fade });
    }
  }
  // Irregular acid-glass bubbles floating close by.
  for (let i = 0; i < 6; i++) {
    const a = t * .35 + i * TAU / 6; const back = Math.sin(a) < 0;
    if ((layer === 'back') !== back) continue;
    acidBubble(ctx, s.x + Math.cos(a) * 52 * peak, s.y - 56 + Math.sin(a) * 26 + Math.sin(t * 1.3 + i) * 10, (7 + (i % 3) * 3) * peak, t, 7200 + i * 7, pose.fade * (back ? .75 : 1));
  }
  if (layer === 'front') {
    // Acid vapour streaming over the ground, drips from the forearms.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const ph = (t * .35 + i / 6) % 1; ctx.globalAlpha = pose.fade * .16 * (1 - ph); ctx.fillStyle = '#6dff92'; ctx.beginPath(); ctx.ellipse(s.x + (i - 2.5) * 20 - f * ph * 40, s.y - 3 - ph * 6, 22 + ph * 26, 6 + ph * 3, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    for (const [x, y] of [s.handF, s.handB]) { const k = (t * 1.1 + x * .01) % 1; ctx.save(); ctx.globalAlpha = pose.fade * (1 - k); ctx.fillStyle = '#7dff9c'; ctx.fillRect(snap(x), snap(y + 4 + k * 40), 2, 4); ctx.restore(); }
  }
}

// ── B01 Risswild — animal: nine fox-flame tails (user, 18 Oct 2026: the
// abstract whips were too abstract, the Kyubi tails looked better) ─────
// The Kyubi spirit (nine tails, flame cloak, fox head) sits behind the
// Wizard; when he attacks, three tails lash forward over him as rift whips.
function risswildWhips(ctx, s, pose, mat, form, layer) {
  const f = s.f; const t = pose.t;
  drawNinefoldSpirit(ctx, s.x, s.y, f, t, 2, pose.fade, layer, { lean: pose.lean ?? 0, bob: 0, air: pose.air ?? 0, guarding: pose.guardK > .5 });
  if (!pose.attacking) return;
  const peak = pose.full ? 1.35 : 1;
  const whips = [
    { from: s.shoulderB, len: 220, w: 12, phase: 0, front: false, up: 1 },
    { from: s.hipB, len: 180, w: 10, phase: 2.2, front: false, up: -.3 },
    { from: s.hipF, len: 150, w: 8, phase: 4.1, front: true, up: .4 }
  ];
  const lash = pose.attacking ? 1 : 0;
  whips.forEach((w, wi) => {
    if ((layer === 'front') !== w.front) return;
    const n = 16; const spine = [];
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      // Travelling wave growing toward the tip; sprint streams them back,
      // the jump apex lets them hang; an attack snaps them forward.
      const wave = Math.sin(t * (3.2 + wi * .5) - k * 7 + w.phase) * (6 + 34 * k) * (1 - .5 * pose.sprint);
      const baseAng = lash ? (-.4 - wi * .25) : (pose.sprint ? Math.PI - .05 : Math.PI - .7 * w.up);
      const ang = baseAng + (lash ? Math.sin(k * 2.2) * .9 : Math.sin(k * 1.6 + w.phase) * .5);
      const r = w.len * peak * k;
      spine.push([w.from[0] + f * Math.cos(ang) * r + f * -wave * Math.sin(ang) * .3, w.from[1] - Math.sin(ang) * r * .55 + wave + (pose.airborne && pose.air < .2 ? 50 * k * k : 0) - w.up * 30 * k]);
    }
    band(ctx, spine, (i, nn) => w.w * peak * Math.pow(1 - i / nn, .8) + 1, mat, 11 + wi * 97, { t, alpha: pose.fade });
    // Splintered tip.
    const tip = spine[n - 1]; const pre = spine[n - 2];
    const dx = tip[0] - pre[0]; const dy = tip[1] - pre[1]; const l = Math.hypot(dx, dy) || 1;
    plate(ctx, [[tip[0] - dy / l * 4, tip[1] + dx / l * 4], [tip[0] + dx / l * 16, tip[1] + dy / l * 16], [tip[0] + dy / l * 4, tip[1] - dx / l * 4]], mat, 400 + wi, { alpha: pose.fade, core: 1 });
    fallout(ctx, spine.slice(6), mat, t, 900 + wi, { count: 8, alpha: pose.fade, driftX: -f * 14 * pose.sprint });
  });
}

registerRenderer('wyrm', sonnenwyrm, 1);
registerRenderer('asterglied', asterglied, 1);
registerRenderer('vorausschnitt', vorausschnitt, 1);
registerRenderer('saeuregeruest', saeuregeruest, 1.15);
registerRenderer('risswild', risswildWhips, 1);
