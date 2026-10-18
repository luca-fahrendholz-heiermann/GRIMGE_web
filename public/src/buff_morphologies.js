// GRIMGE Prototype — morphology family renderers of the Arcane States
// (design note 18 Oct 2026, docs/GRIMGE_Arcane_States_Morphologien.md).
//
// Every Arcane State without its own reference art is drawn by the renderer
// of its MORPHOLOGY, so the silhouette family — how the effect relates to
// the Wizard and the arena — tells the states apart before any detail:
//  • Energy Extension      living whips / tails / membranes break out of
//                          the contour: idle S-curves, flat stream in the
//                          sprint, hanging in the air, lash forward on
//                          attacks, full-length fan at the peak.
//  • Orbital Construct     free objects on their own tilted orbits; they
//                          spin up on attacks and close into a spearhead,
//                          stack into a wall on guard and assemble into one
//                          large construct while charging / at the peak.
//  • Body Augmentation     conduits pump along arms and legs between the
//                          body-hugging attachments; an extra jointed limb
//                          strikes on attacks, a forearm plate guards, and
//                          at the peak structures grow out of the ground.
//  • Creature Manifestation independent creatures with their own paths
//                          (T03 jaw creatures, T24 floor-standing
//                          marionettes on the Wizard's threads).
//  • Levitation State      controlled projectiles regroup per action (halo,
//                          aimed queue, shield arc, trail, peak fan).
//  • Environmental State   a wide patch of arena (T28 grid dome, T35 frost
//                          field) that condenses forward on attacks.
//  • Temporal Projection   (T26) resonance forks + rings linking the echoes.
// Each family reads the per-form item / count / palette for its detail.
// Attachment-only: the Wizard's own sprite stays visible and unchanged.
import { plate, band, fallout, orbitItem, shard, limbSegment, hashStr, registerMorphology, archetypeRenderer } from './buff_vfx.js';
import { ghostOf } from './buff_signatures.js';

const TAU = Math.PI * 2;
const snap = (v) => Math.round(v);
const lerp = (a, b, k) => a + (b - a) * k;
const lerpP = (A, B, k) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k)];
const peakOf = (pose) => Math.max(pose.peak || 0, pose.full ? 1 : 0);
const clampN = (n, lo, hi, d) => Math.max(lo, Math.min(hi, n ?? d));

// The archetype attachment drawn in its usual presence, scaled around the chest.
function baseAttachment(ctx, s, pose, mat, form, layer, k = 1.3) {
  ctx.save(); ctx.translate(s.chest[0], s.chest[1]); ctx.scale(k, k); ctx.translate(-s.chest[0], -s.chest[1]);
  archetypeRenderer(form.archetype)(ctx, s, pose, mat, form, layer);
  ctx.restore();
}

function line(ctx, pts, color, width, alpha) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = alpha;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(snap(x), snap(y)) : ctx.moveTo(snap(x), snap(y)))); ctx.stroke(); ctx.restore();
}
const normalAt = (pts, q) => { const a = pts[Math.max(0, q - 1)]; const b = pts[Math.min(pts.length - 1, q + 1)]; const dx = b[0] - a[0]; const dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };

// ── Energy Extension ────────────────────────────────────────────────────
const ENERGY_VARIANT = { T11: 'paper', T15: 'spectral', T30: 'thread' };

// One living whip from a contour point; blends idle → sprint → air → lash → peak.
function whipSpine(s, pose, from, len, i, n, seg = 11) {
  const f = s.f; const t = pose.t; const peak = peakOf(pose);
  const lash = pose.act * (1 - peak); const sweep = Math.max(pose.sprintK, pose.run * .4); const hang = pose.airborne ? 1 : 0;
  const L = len * (1 + .5 * peak + .2 * lash); const spread = i - (n - 1) / 2;
  const pts = [];
  for (let q = 0; q < seg; q++) {
    const k = q / (seg - 1);
    const wave = Math.sin(t * 1.7 + i * 1.9 - k * 4.6) * (5 + 18 * k);
    let p = [-f * L * k * .7, -L * .5 * Math.sin(k * Math.PI * .85) + spread * 16 * k + wave];
    p = lerpP(p, [-f * L * k, spread * 9 * k + wave * .3 - 5 * k], sweep);
    p = lerpP(p, [-f * L * .3 * k + wave * .3, L * .45 * k * k + spread * 6 * k], hang * (1 - sweep));
    // Lash: the whip arcs over the shoulder and cracks out in front.
    p = lerpP(p, [f * L * (k * 1.05 - .3 * Math.sin(k * Math.PI)), -L * .55 * Math.sin(k * Math.PI) + L * .3 * k * k + spread * 10 * k], lash);
    // Peak: straight full-length fan forward.
    const ang = spread * .32 - .12;
    p = lerpP(p, [f * Math.cos(ang) * L * 1.15 * k, Math.sin(ang) * L * 1.15 * k + wave * .25], peak);
    pts.push([from[0] + p[0], from[1] + p[1]]);
  }
  return pts;
}

function energyExtension(ctx, s, pose, mat, form, layer) {
  const variant = ENERGY_VARIANT[form.id] ?? form.item ?? 'ribbon';
  const n = clampN(form.count, 1, 5, 3); const t = pose.t; const seed = hashStr(form.id); const f = s.f;
  const peak = peakOf(pose);
  const origins = [s.shoulderB, s.hipB, s.back, s.hipF, s.shoulderF];
  const len = variant === 'thread' ? 120 : variant === 'sail' ? 66 : variant === 'shingle' ? 70 : 76;
  const forward = pose.act > .5 || peak > .5;
  const spines = [];
  for (let i = 0; i < n; i++) spines.push(whipSpine(s, pose, origins[i % origins.length], len + (i % 2) * 14, i, n));
  const frontOf = (i) => forward || i >= 3;
  for (let i = 0; i < n; i++) {
    if ((layer === 'front') !== frontOf(i)) continue;
    const sp = spines[i]; const k0 = seed + i * 19; const a = pose.fade;
    switch (variant) {
      case 'blade': { // comb lamellae standing off the whip
        band(ctx, sp, (q, nn) => 3.4 * (1 - .5 * q / nn) + 1, mat, k0, { t, alpha: a });
        for (let q = 1; q < sp.length - 1; q += 2) {
          const [nx, ny] = normalAt(sp, q); const side = ny < 0 ? 1 : -1; const L = 11 * (1 - q / sp.length * .5) * (1 + .4 * pose.act);
          const [x, y] = sp[q];
          plate(ctx, [[x - nx * 2, y - ny * 2], [x + nx * side * L, y + ny * side * L], [sp[q + 1][0] + nx * side * 3, sp[q + 1][1] + ny * side * 3]], mat, k0 + q, { alpha: a, pulse: .5 + .5 * Math.sin(t * 3 + q) });
        }
        break;
      }
      case 'sail': { // membrane stretched between this whip and its neighbour
        band(ctx, sp, () => 2.2, mat, k0, { t, alpha: a });
        const nb = spines[i + 1];
        if (nb) for (let q = 0; q < sp.length - 1; q++) plate(ctx, [sp[q], sp[q + 1], nb[q + 1], nb[q]], mat, k0 + 40 + q, { alpha: a * .5, glowEdge: .5 });
        if (n === 1 || (!nb && i === 0)) for (let q = 1; q < sp.length; q += 2) { const [nx, ny] = normalAt(sp, q); plate(ctx, [sp[q - 1], sp[q], [sp[q][0] + nx * 14, sp[q][1] + ny * 14]], mat, k0 + 60 + q, { alpha: a * .55 }); }
        break;
      }
      case 'shingle': { // loose glowing shingles that peel off at the tip
        for (let q = 0; q < sp.length - 1; q += 1) {
          const [x, y] = sp[q]; const [x2, y2] = sp[q + 1]; const peel = q > sp.length - 4 ? ((t * .9 + q * .3) % 1) : 0;
          const ox = -f * peel * 18; const oy = -peel * 14; const w = 6 - q * .35;
          const [nx, ny] = normalAt(sp, q);
          plate(ctx, [[x + nx * w + ox, y + ny * w + oy], [x2 + nx * w * .6 + ox, y2 + ny * w * .6 + oy], [x2 - nx * w * .6 + ox, y2 - ny * w * .6 + oy], [x - nx * w + ox, y - ny * w + oy]], mat, k0 + q, { alpha: a * (1 - peel), pulse: .5 + .5 * Math.sin(t * 4 + q) });
        }
        fallout(ctx, sp.slice(-4), mat, t, k0 + 80, { count: 9, alpha: a, driftY: -12 });
        break;
      }
      case 'paper': { // accordion-folded frost paper
        for (let q = 0; q < sp.length - 1; q++) {
          const [nx, ny] = normalAt(sp, q); const w = 8 * (1 - .5 * q / sp.length); const sg = q % 2 ? 1 : -1;
          plate(ctx, [[sp[q][0] + nx * w * sg, sp[q][1] + ny * w * sg], [sp[q + 1][0] - nx * w * sg, sp[q + 1][1] - ny * w * sg], [sp[q + 1][0] + nx * w * sg * .3, sp[q + 1][1] + ny * w * sg * .3]], mat, k0 + q, { alpha: a, lit: .8 });
        }
        break;
      }
      case 'spectral': { // three spectral threads run in parallel
        const cols = [mat.vein, mat.edge, mat.spark];
        cols.forEach((c, j) => line(ctx, sp.map((p, q) => { const [nx, ny] = normalAt(sp, q); const o = (j - 1) * (2 + 3 * q / sp.length) * (1 + pose.act); return [p[0] + nx * o, p[1] + ny * o]; }), c, 1.6, a * .85));
        band(ctx, sp, () => 1.6, mat, k0, { t, alpha: a * .6 });
        break;
      }
      case 'thread': { // a camouflaged thread: almost invisible until it lashes
        const vis = .3 + .7 * Math.max(pose.act, peak, pose.sprintK * .5);
        line(ctx, sp, mat.edge, 1 + vis, a * vis);
        for (let q = 2; q < sp.length; q += 3) plate(ctx, [[sp[q][0] - 3, sp[q][1]], [sp[q][0], sp[q][1] - 3], [sp[q][0] + 3, sp[q][1]], [sp[q][0], sp[q][1] + 3]], mat, k0 + q, { alpha: a * vis, core: 1 });
        break;
      }
      default: band(ctx, sp, (q, nn) => 7 * (1 - .55 * q / nn) + 1, mat, k0, { t, alpha: a });
    }
    // The whip tip cracks with sparks when it lashes.
    const tip = sp[sp.length - 1];
    if (pose.act > .3 || peak > 0) fallout(ctx, [tip], mat, t, k0 + 90, { count: 6, alpha: a * Math.max(pose.act, peak) });
  }
}

// ── Orbital Construct ───────────────────────────────────────────────────
function orbitalConstruct(ctx, s, pose, mat, form, layer) {
  const item = form.item === 'rib' ? 'rib' : form.item === 'cell' ? 'mirror' : form.item ?? 'shard';
  const small = item === 'shard' || item === 'seed';
  const n = clampN(form.count, 3, 9, 4) + (small ? 3 : 0); const t = pose.t; const seed = hashStr(form.id); const f = s.f;
  const assemble = Math.max(peakOf(pose), pose.charge * .85); const wall = pose.guardK * (1 - assemble); const strike = pose.act * (1 - assemble) * (1 - wall);
  const P = []; const rows = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    // Each object on its own tilted orbit, faster while fighting.
    const tilt = ((i % 3) - 1) * .55; const R = (small ? 30 : 42) + (i % 2) * 14; const speed = (.55 + .2 * (i % 3)) * (1 + 1.6 * pose.act);
    const a = t * speed + i * TAU / n;
    let p = [s.chest[0] + Math.cos(a) * R - f * pose.run * 12, s.chest[1] - 6 + Math.sin(a) * R * .3 + Math.cos(a) * tilt * R * .55 + Math.sin(t * 1.3 + i) * 3 + pose.air * 20];
    const wallP = [s.x + f * (30 + (i % 2) * 9), s.y - 18 - Math.floor(i / 2) / Math.max(1, rows - 1) * 64];
    const strikeP = [s.handF[0] + f * (16 + i * (small ? 6 : 8)), s.handF[1] + ((i % 2) * 2 - 1) * (n - i) * 2.2];
    const pa = i / n * TAU + t * .9; const pr = small ? 26 : 34;
    const peakP = [s.x + f * 74 + Math.cos(pa) * pr, s.chest[1] - 12 + Math.sin(pa) * pr];
    p = lerpP(lerpP(lerpP(p, wallP, wall), strikeP, strike), peakP, assemble);
    const w = Math.max(wall, strike, assemble);
    P.push({ p, depth: lerp(Math.sin(a), 1, w), rot: lerp(a * .5, wall > .5 ? Math.PI / 2 : 0, w), w, i });
  }
  const formed = Math.max(wall, strike, assemble);
  if (layer === 'front' && formed > .25) {
    // Assembled: light struts link the parts into one construct.
    line(ctx, [...P.map((o) => o.p), ...(assemble > .5 ? [P[0].p] : [])], mat.edge, 1.2, pose.fade * formed * .7);
    if (assemble > .4) { const c = [s.x + f * 74, s.chest[1] - 12]; plate(ctx, [[c[0], c[1] - 12], [c[0] + 10, c[1]], [c[0], c[1] + 12], [c[0] - 10, c[1]]], mat, seed + 99, { alpha: pose.fade * assemble, core: 1, glowEdge: 1 }); }
  }
  for (const o of P) {
    if ((layer === 'back') !== (o.depth < 0)) continue;
    const size = (small ? 6 : item === 'mirror' ? 12 : item === 'knot' ? 14 : item === 'rib' ? 12 : 10) * (1 + .45 * assemble);
    const alpha = pose.fade * (o.depth < 0 ? .75 : 1);
    if (item === 'rib') {
      const [x, y] = o.p; const c = Math.cos(o.rot * .3); const h = size * 1.4;
      plate(ctx, [[x - 4 * c, y - h], [x + 4 * c, y - h + 2], [x + 5 * c, y + h], [x - 5 * c, y + h - 2]], mat, seed + o.i, { alpha, pulse: .5 + .5 * Math.sin(t * 3 + o.i), glowEdge: .6 });
    } else orbitItem(ctx, item, o.p[0], o.p[1], size, o.rot, mat, seed + o.i * 11, alpha, t);
  }
  if (layer === 'front') fallout(ctx, P.slice(0, 3).map((o) => o.p), mat, t, seed + 5, { count: 5, alpha: pose.fade });
}

// ── Body Augmentation ───────────────────────────────────────────────────
// A conduit along a joint chain with a pump pulse travelling through it.
function conduit(ctx, chain, mat, seed, pose, width, alpha = 1) {
  ctx.save(); ctx.strokeStyle = mat.dark; ctx.lineWidth = width + 1.5; ctx.globalAlpha = pose.fade * alpha * .7;
  ctx.beginPath(); chain.forEach(([x, y], i) => (i ? ctx.lineTo(snap(x), snap(y)) : ctx.moveTo(snap(x), snap(y)))); ctx.stroke(); ctx.restore();
  line(ctx, chain, mat.vein, width * .6, pose.fade * alpha * (.55 + .3 * Math.sin(pose.t * 3 + seed)));
  const total = chain.length - 1; const ph = (pose.t * (1.2 + pose.sprintK * 1.5) + seed * .07) % 1;
  const u = ph * total; const q = Math.min(total - 1, Math.floor(u)); const r = u - q;
  const [x, y] = lerpP(chain[q], chain[q + 1], r);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pose.fade; ctx.fillStyle = mat.core; ctx.fillRect(snap(x) - 1, snap(y) - 1, 3, 3); ctx.restore();
  for (let j = 1; j < chain.length; j++) plate(ctx, [[chain[j][0] - 2, chain[j][1] - 2], [chain[j][0] + 2, chain[j][1] - 2], [chain[j][0] + 2, chain[j][1] + 2], [chain[j][0] - 2, chain[j][1] + 2]], mat, seed + 10 + j, { alpha: pose.fade * alpha, core: .6 });
}

// Root tubes (T10) and prism raster cells (T18) stay attached to the body.
function attachedGirdle(ctx, s, pose, mat, form, layer, seed) {
  const t = pose.t; const front = layer === 'front';
  if (form.item === 'tube') {
    const foot = front ? s.footF : s.footB;
    for (let r = 0; r < 3; r++) { const a = (r - 1) * .7 + (front ? 0 : Math.PI); const L = 18 * (1 - pose.sprintK * .7); band(ctx, [foot, [foot[0] + Math.cos(a) * L * .5, foot[1] + 2], [foot[0] + Math.cos(a) * L, foot[1] + 3 + Math.sin(a) * 2]], (q) => 2.4 - q * .7, mat, seed + 70 + r, { t, alpha: pose.fade }); }
    const knee = front ? s.kneeF : s.kneeB; const elbow = front ? s.elbowF : s.elbowB;
    for (const [A, j] of [[knee, 0], [elbow, 1]]) band(ctx, [A, [A[0] + (front ? s.f : -s.f) * 8, A[1] - 6 + Math.sin(t * 2 + j) * 2], [A[0] + (front ? s.f : -s.f) * 12, A[1] - 14]], (q) => 1.8 - q * .5, mat, seed + 80 + j, { t, alpha: pose.fade * .9 });
    return;
  }
  // Cells: hexagonal prism tiles along the arm and back that re-sort in a rhythm.
  const pts = front ? [s.shoulderF, s.elbowF, s.handF, s.kneeF] : [s.shoulderB, s.elbowB, s.back, [s.back[0], s.back[1] + 14], s.kneeB];
  pts.forEach(([cx, cy], j) => {
    const flip = Math.sin(t * 2.5 + j * 1.3) > .6 ? 1 : 0; const r = 4 + flip;
    plate(ctx, Array.from({ length: 6 }, (_, q) => [cx + Math.cos(q * TAU / 6 + flip * .5) * r, cy + Math.sin(q * TAU / 6 + flip * .5) * r]), mat, seed + j, { alpha: pose.fade, core: .5 + flip * .5, glowEdge: .6 });
  });
}

function bodyAugmentation(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const f = s.f; const seed = hashStr(form.id); const peak = peakOf(pose); const front = layer === 'front';
  const w = 1.4 + .5 * pose.act + .6 * peak;
  if (front) { conduit(ctx, [s.chest, s.shoulderF, s.elbowF, s.handF], mat, seed + 1, pose, w, .65); conduit(ctx, [s.hip, s.hipF, s.kneeF, s.footF], mat, seed + 2, pose, w * .9, .65); }
  else { conduit(ctx, [s.back, s.shoulderB, s.elbowB, s.handB], mat, seed + 3, pose, w); conduit(ctx, [s.hip, s.hipB, s.kneeB, s.footB], mat, seed + 4, pose, w * .9); }
  if (form.archetype === 'girdle') attachedGirdle(ctx, s, pose, mat, form, layer, seed);
  else baseAttachment(ctx, s, pose, mat, form, layer);
  // Action: an extra jointed limb unfolds from the back shoulder and strikes.
  const ext = Math.max(pose.act, peak);
  if (ext > .05 && (layer === 'front') === (ext > .5)) {
    const sh = s.shoulderB;
    const elbow = lerpP([s.x - f * 18, s.y - 86], [s.x + f * 6, s.y - 92], ext);
    const tip = lerpP([s.x - f * 10, s.y - 70], [s.x + f * 54, s.y - 62], ext);
    limbSegment(ctx, sh, elbow, 6, mat, seed + 20, pose); limbSegment(ctx, elbow, tip, 5, mat, seed + 22, pose);
    const dx = tip[0] - elbow[0]; const dy = tip[1] - elbow[1]; const l = Math.hypot(dx, dy) || 1; const ux = dx / l; const uy = dy / l;
    const blade = form.item === 'sickle' ? 22 : form.item === 'clamp' || form.item === 'brace' ? 12 : 16;
    plate(ctx, [[tip[0] - uy * 5, tip[1] + ux * 5], [tip[0] + ux * blade, tip[1] + uy * blade - (form.item === 'sickle' ? 8 : 0)], [tip[0] + uy * 5, tip[1] - ux * 5]], mat, seed + 24, { alpha: pose.fade * Math.min(1, ext * 2), core: 1, glowEdge: .8 });
  }
  // Guard: a plate grows over the front forearm.
  if (front && pose.guardK > .05) {
    const [hx, hy] = s.handF; const g = pose.guardK;
    plate(ctx, [[hx + f * 4, hy - 20 * g], [hx + f * 11, hy - 14 * g], [hx + f * 11, hy + 12 * g], [hx + f * 4, hy + 16 * g], [hx, hy]], mat, seed + 30, { alpha: pose.fade * g, glowEdge: 1, lit: .8 });
  }
  // Peak: the structures briefly grow out into the arena.
  if (peak > 0) {
    for (let i = 0; i < 6; i++) {
      const back = i % 2 === 0; if ((layer === 'back') !== back) continue;
      const x = s.x + f * [-62, -44, 40, 58, 76, -80][i]; const h = (34 + (i % 3) * 16) * peak; const y = s.y + (back ? -4 : 4);
      plate(ctx, [[x - 6, y], [x - 2, y - h], [x + 3, y - h - 6], [x + 6, y]], mat, seed + 40 + i, { alpha: pose.fade * Math.min(1, peak * 1.5), glowEdge: 1 });
    }
  }
}

// ── Creature Manifestation ──────────────────────────────────────────────
// T03: a fossil-glass jaw creature — snapping head, segmented body behind.
function jawCreature(ctx, x, y, dx, dy, open, size, mat, seed, pose) {
  const l = Math.hypot(dx, dy) || 1; const ux = dx / l; const uy = dy / l; const nx = -uy; const ny = ux;
  const body = [[x, y]]; for (let q = 1; q <= 4; q++) body.push([x - ux * q * 9 * size + nx * Math.sin(pose.t * 5 + q + seed) * 3, y - uy * q * 9 * size + ny * Math.sin(pose.t * 5 + q + seed) * 3]);
  band(ctx, body, (q) => (6 - q) * size, mat, seed, { t: pose.t, alpha: pose.fade });
  for (const sg of [-1, 1]) {
    const a = sg * open * .7;
    const jx = ux * Math.cos(a) - uy * Math.sin(a); const jy = uy * Math.cos(a) + ux * Math.sin(a);
    const L = 20 * size; const base = [x + nx * sg * 3, y + ny * sg * 3];
    plate(ctx, [base, [base[0] + jx * L, base[1] + jy * L], [base[0] + jx * L * .6 + nx * sg * 6 * size, base[1] + jy * L * .6 + ny * sg * 6 * size]], mat, seed + 5 + (sg > 0 ? 1 : 0), { alpha: pose.fade, glowEdge: .7 });
    for (let q = 1; q <= 3; q++) { const tx = base[0] + jx * L * q / 4; const ty = base[1] + jy * L * q / 4; plate(ctx, [[tx - 1.5, ty], [tx + 1.5, ty], [tx - nx * sg * 4, ty - ny * sg * 4]], mat, seed + 10 + q, { alpha: pose.fade }); }
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pose.fade; ctx.fillStyle = mat.core; ctx.fillRect(snap(x - ux * 4 + nx * 3), snap(y - uy * 4 + ny * 3), 2, 2); ctx.restore();
}

function relicJaws(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const f = s.f; const seed = hashStr(form.id); const peak = peakOf(pose);
  const n = clampN(form.count, 2, 4, 3);
  for (let j = 0; j < n; j++) {
    const ph = j * 2.1; const u = t * .75 + ph;
    // Each creature roams on its own path around the Wizard.
    let p = [s.x + Math.cos(u) * 52 + Math.sin(t * 1.3 + ph) * 12, s.y - 72 + Math.sin(u * 1.4) * 16 + j * 10];
    let d = [-Math.sin(u) * 52, Math.cos(u * 1.4) * 22]; let depth = Math.sin(u);
    const strike = pose.act * (1 - peak); const sprint = pose.sprintK * (1 - strike);
    p = lerpP(p, [s.x - f * (30 + j * 26), s.y - 62 + j * 8 + Math.sin(t * 6 + j) * 3], sprint);
    p = lerpP(p, [s.x + f * 22, s.chest[1] - 24 + j * 20], pose.guardK);
    p = lerpP(p, [s.x + f * (44 + j * 14), s.chest[1] + (j - 1) * 16], strike);
    p = lerpP(p, [s.x + f * (96 + j * 38), s.chest[1] - 10 + (j - 1) * 26 + Math.sin(t * 6 + j) * 6], peak);
    const w = Math.max(sprint, pose.guardK, strike, peak);
    if (w > .3) { d = [f, 0]; depth = 1; }
    if ((layer === 'back') !== (depth < 0)) continue;
    const open = .25 + .2 * Math.sin(t * 2 + j * 1.7) + .6 * Math.max(strike, peak) * Math.abs(Math.sin(t * 9 + j));
    jawCreature(ctx, p[0], p[1], d[0], d[1], open, 1 + .35 * peak, mat, seed + j * 30, pose);
    if (peak > 0) fallout(ctx, [p], mat, t, seed + 200 + j, { count: 5, alpha: pose.fade * peak, driftX: -f * 30 });
  }
}

// T24: two flat shadow marionettes standing on the floor, led by threads
// from the Wizard's hands; they step in and strike on his attacks.
function marionettes(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const f = s.f; const seed = hashStr(form.id); const peak = peakOf(pose);
  for (let p = 0; p < 2; p++) {
    if ((layer === 'front') !== (p === 1)) continue;
    const side = p === 0 ? -1 : 1;
    const strike = pose.act * (1 - peak);
    let foot = [s.x + side * 42 - f * 4, s.y + side * 3];
    foot = lerpP(foot, [s.x - f * (40 + p * 22), s.y + side * 3], pose.sprintK);
    foot = lerpP(foot, [s.x + f * (26 + p * 8), s.y + side * 4], pose.guardK);
    foot = lerpP(foot, [s.x + f * (36 + p * 24), s.y + side * 3], strike);
    foot = lerpP(foot, [s.x + f * (64 + p * 40), s.y + side * 3], peak);
    const k = 1 + .45 * peak; const H = 58 * k; const x = foot[0]; const y = foot[1] - (pose.airborne ? 20 : 0);
    const step = Math.sin(t * 8 + p * 3) * Math.max(pose.run, pose.sprintK) * 6;
    const sway = Math.sin(t * 1.6 + p * 2) * 2;
    const head = [x + sway, y - H]; const neck = [x + sway, y - H + 9 * k]; const hip = [x, y - H * .45];
    const hand = (sg) => { const reach = Math.max(strike, peak) * (sg === f ? 1 : .3); return [x + sg * 10 * k + f * reach * 22 * k, y - H * .62 + Math.sin(t * 2 + sg + p) * 3 - reach * 6]; };
    // Threads from the Wizard's hands to the puppet's head and hands.
    const ctrl = p === 1 ? s.handF : s.handB;
    line(ctx, [ctrl, [head[0], head[1] - 4]], mat.edge, 1, pose.fade * .7);
    line(ctx, [ctrl, hand(-1)], mat.edge, 1, pose.fade * .5); line(ctx, [ctrl, hand(1)], mat.edge, 1, pose.fade * .5);
    plate(ctx, [[head[0] - 5 * k, head[1] - 6 * k], [head[0] + 5 * k, head[1] - 6 * k], [head[0] + 4 * k, head[1] + 5 * k], [head[0] - 4 * k, head[1] + 5 * k]], mat, seed + p * 20, { alpha: pose.fade, core: .6 });
    plate(ctx, [[neck[0] - 7 * k, neck[1]], [neck[0] + 7 * k, neck[1]], [hip[0] + 5 * k, hip[1]], [hip[0] - 5 * k, hip[1]]], mat, seed + p * 20 + 1, { alpha: pose.fade });
    for (const sg of [-1, 1]) {
      const sh = [neck[0] + sg * 7 * k, neck[1] + 2]; const hd = hand(sg); const el = [(sh[0] + hd[0]) / 2 + sg * 3, (sh[1] + hd[1]) / 2 + 4];
      limbSegment(ctx, sh, el, 3.5 * k, mat, seed + p * 20 + 3 + sg, pose); limbSegment(ctx, el, hd, 3.5 * k, mat, seed + p * 20 + 5 + sg, pose);
      const hp = [hip[0] + sg * 4 * k, hip[1]]; const ft = [x + sg * 5 * k + sg * step, y]; const kn = [(hp[0] + ft[0]) / 2 + f * 3, (hp[1] + ft[1]) / 2];
      limbSegment(ctx, hp, kn, 4 * k, mat, seed + p * 20 + 7 + sg, pose); limbSegment(ctx, kn, ft, 4 * k, mat, seed + p * 20 + 9 + sg, pose);
    }
    if (strike > .3 || peak > 0) { const hd = hand(f); for (let i = 0; i < 3; i++) { const a = -.6 + i * .6; plate(ctx, [hd, [hd[0] + f * Math.cos(a) * 18, hd[1] + Math.sin(a) * 18], [hd[0] + f * Math.cos(a + .2) * 12, hd[1] + Math.sin(a + .2) * 12]], mat, seed + 60 + i, { alpha: pose.fade * Math.max(strike, peak), pulse: 1 }); } }
  }
}

function creatureManifestation(ctx, s, pose, mat, form, layer) {
  (form.archetype === 'puppets' ? marionettes : relicJaws)(ctx, s, pose, mat, form, layer);
}

// ── Levitation State ────────────────────────────────────────────────────
function levitationState(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const f = s.f; const seed = hashStr(form.id); const peak = peakOf(pose); const star = form.id === 'T34';
  const n = 5 + (peak > .3 ? 2 : 0);
  const P = [];
  for (let i = 0; i < n; i++) {
    const a = t * 1.1 + i * TAU / n;
    let p = [s.x + Math.cos(a) * 34, s.y - 74 + Math.sin(a) * 10]; let depth = Math.sin(a); let rot = a;
    const g = (i / (n - 1) - .5) * 1.6;
    const strike = pose.act * (1 - peak);
    p = lerpP(p, [s.x - f * (22 + i * 14), s.chest[1] - 6 + Math.sin(t * 5 + i) * 2], pose.sprintK);
    p = lerpP(p, [s.x + (i - (n - 1) / 2) * 12, s.y + 10 + Math.sin(t * 3 + i) * 2], pose.airborne ? .7 : 0);
    p = lerpP(p, [s.x + f * (26 + Math.cos(g) * 8), s.chest[1] + Math.sin(g) * 30], pose.guardK);
    p = lerpP(p, [s.handF[0] + f * (14 + i * 12), s.handF[1] - 4 + Math.sin(t * 12 + i) * 1.5], strike);
    p = lerpP(p, [s.x + f * (40 + Math.cos(g * .9) * 56), s.chest[1] - 14 + Math.sin(g * .9) * 56], peak);
    const w = Math.max(pose.sprintK, pose.guardK, strike, peak);
    if (w > .3) { depth = 1; rot = f > 0 ? 0 : Math.PI; }
    P.push({ p, depth, rot, i });
  }
  if (layer === 'back') {
    if (star) line(ctx, [...P.map((o) => o.p), P[0].p], mat.edge, 1, pose.fade * .35); // constellation lines
    else for (let i = 0; i < 6; i++) { const ph = (t * .5 + i / 6) % 1; const x = s.x + Math.cos(i * 2.4) * 26; const y = s.y + 14 - ph * 34; plate(ctx, [[x - 3, y], [x, y - 4], [x + 3, y], [x, y + 3]], mat, seed + 300 + i, { alpha: pose.fade * (1 - ph) }); }
  }
  for (const o of P) {
    if ((layer === 'back') !== (o.depth < 0)) continue;
    const [x, y] = o.p; const alpha = pose.fade * (o.depth < 0 ? .75 : 1);
    if (star) {
      const r = 7 + peak * 3; const sp = Math.sin(t * 4 + o.i) * .2;
      plate(ctx, Array.from({ length: 8 }, (_, q) => { const a = q * TAU / 8 + sp; const rr = q % 2 ? r * .38 : r; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; }), mat, seed + o.i, { alpha, core: 1, glowEdge: .8 });
    } else {
      const c = Math.cos(o.rot); const sn = Math.sin(o.rot); const R = (px, py) => [x + px * c - py * sn, y + px * sn + py * c];
      plate(ctx, [R(10, 0), R(-2, -5), R(-7, 0), R(-2, 5)], mat, seed + o.i, { alpha, core: 1, glowEdge: .7 });
    }
  }
}

// ── Environmental State ─────────────────────────────────────────────────
function environmentalState(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const f = s.f; const seed = hashStr(form.id); const peak = peakOf(pose);
  const R = 120 * (1 + 1.1 * peak); const cx = s.x + f * 46 * pose.act; const cy = s.y;
  if (form.id === 'T35') {
    // Frost field: frosted ground, a slow chrono dial and ice crystal clusters.
    if (layer === 'back') {
      ctx.save(); ctx.globalAlpha = pose.fade * .16; ctx.fillStyle = mat.edge; ctx.beginPath(); ctx.ellipse(snap(cx), snap(cy), R, R * .24, 0, 0, TAU); ctx.fill(); ctx.restore();
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * .08; const P = (r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r * .24]; line(ctx, [P(R * .86), P(R * (i % 3 ? .93 : 1))], mat.vein, i % 3 ? 1 : 2, pose.fade * .6); }
    }
    const nC = 9;
    for (let i = 0; i < nC; i++) {
      const a = i / nC * TAU + .3; const depth = Math.sin(a); if ((layer === 'back') !== (depth < 0)) continue;
      const x = cx + Math.cos(a) * R * .72; const y = cy + Math.sin(a) * R * .72 * .24;
      const inFront = Math.cos(a) * f > .3 ? pose.act : 0; const h = (12 + (i % 3) * 7) * (1 + 1.2 * inFront + .8 * peak);
      for (let c = -1; c <= 1; c++) plate(ctx, [[x + c * 4 - 2, y], [x + c * 6, y - h * (c ? .65 : 1)], [x + c * 4 + 2, y]], mat, seed + i * 3 + c, { alpha: pose.fade * .9, glowEdge: .8, lit: .8 });
    }
    if (layer === 'front') for (let i = 0; i < 10; i++) { const ph = (t * .25 + i / 10) % 1; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pose.fade * (1 - ph) * .8; ctx.fillStyle = mat.core; ctx.fillRect(snap(cx + Math.cos(i * 2.7) * R * .8 + Math.sin(t + i) * 6), snap(cy - 90 + ph * 90), 2, 2); ctx.restore(); }
    return;
  }
  // T28 grid dome: hatched meridians and parallels arch over the field.
  if (layer === 'back') {
    for (let i = -6; i <= 6; i++) { const k = 1 - Math.abs(i) / 7; line(ctx, [[cx - R * k, cy + i * R * .03], [cx + R * k, cy + i * R * .03]], mat.edge, 1, pose.fade * .25 * k); }
  }
  const H = R * .75;
  for (let m = 0; m < 5; m++) {
    const a = m / 5 * Math.PI + t * .1; const ca = Math.cos(a); const sa = Math.sin(a);
    // Meridian: half ellipse from one side of the ground ring to the other.
    const pts = []; for (let q = 0; q <= 12; q++) { const u = q / 12 * Math.PI; pts.push([cx + Math.cos(u) * R * ca, cy + Math.cos(u) * R * .24 * sa - Math.sin(u) * H]); }
    const back = layer === 'back';
    line(ctx, pts, mat.edge, 1, pose.fade * (back ? .4 : .18));
    if (back) for (let q = 2; q <= 10; q += 2) plate(ctx, [[pts[q][0] - 2, pts[q][1] - 2], [pts[q][0] + 2, pts[q][1] - 2], [pts[q][0] + 2, pts[q][1] + 2], [pts[q][0] - 2, pts[q][1] + 2]], mat, seed + m * 10 + q, { alpha: pose.fade * .7, core: .6 });
  }
  for (const hk of [.35, .7]) {
    const rr = R * Math.cos(Math.asin(hk)); const yy = cy - H * hk;
    const pts = []; for (let q = 0; q <= 24; q++) { const u = q / 24 * Math.PI * (layer === 'back' ? -1 : 1); pts.push([cx + Math.cos(u) * rr, yy + Math.sin(u) * rr * .24]); }
    line(ctx, pts, mat.vein, 1.2, pose.fade * (layer === 'back' ? .45 : .22));
  }
}

// ── Temporal Projection (T26 Resonanzwache) ─────────────────────────────
function temporalProjection(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const f = s.f; const seed = hashStr(form.id); const peak = peakOf(pose);
  baseAttachment(ctx, s, pose, mat, form, layer, 1.4);
  const trail = pose.player?._timeTrail ?? [];
  if (layer === 'back') {
    // Resonance rings ripple between the Wizard and his echoes.
    for (const d of [10, 20]) {
      const past = trail[d]; if (!past) continue;
      const ex = past.x; const ey = s.y - (pose.player.y - (past.y ?? pose.player.y)) - 44;
      for (let r = 0; r < 3; r++) { const ph = (t * .9 + r / 3) % 1; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = mat.edge; ctx.lineWidth = 1; ctx.globalAlpha = pose.fade * (1 - ph) * .6; ctx.beginPath(); ctx.ellipse(snap(lerp(s.x, ex, .5)), snap(ey), 6 + ph * 26, 4 + ph * 18, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    }
    // Peak: the echoes step out together in a synchronized line.
    if (peak > 0 && pose.player) for (let e = 1; e <= 3; e++) ghostOf(ctx, pose.player, s.x + f * e * 26, s.y, pose.player.state, pose.player.animTime, f, .35 * peak * pose.fade, mat.edge);
  }
  // Tuning-fork resonators above the shoulders hum with the rhythm.
  const sh = layer === 'front' ? s.shoulderF : s.shoulderB; const hum = Math.sin(t * 14) * (1 + 2 * pose.act);
  for (const sg of [-1, 1]) plate(ctx, [[sh[0] + sg * 2, sh[1] - 4], [sh[0] + sg * 4 + hum * .5, sh[1] - 22], [sh[0] + sg * 6 + hum * .5, sh[1] - 22], [sh[0] + sg * 4, sh[1] - 4]], mat, seed + 50 + sg, { alpha: pose.fade, glowEdge: .8 });
}

registerMorphology('energy_extension', energyExtension, 1);
registerMorphology('orbital_construct', orbitalConstruct, 1);
registerMorphology('body_augmentation', bodyAugmentation, 1);
registerMorphology('creature_manifestation', creatureManifestation, 1);
registerMorphology('levitation', levitationState, 1);
registerMorphology('environmental', environmentalState, 1);
registerMorphology('temporal_projection', temporalProjection, 1);
