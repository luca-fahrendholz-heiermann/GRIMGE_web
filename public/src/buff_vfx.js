// GRIMGE Prototype — VFX kit for the special-rune buff transformations
// (docs/GRIMGE_Transformations_Atlas_V3_1_Sonnenwyrm.md).
//
// Attachment-only: the Wizard's own sprite always stays visible and
// unchanged. Every form is built from textured pixel-art material — never a
// single glow ring or flat primitive:
//  • plate():   one piece of material with a dark base, matte inner facet,
//               glowing seams / veins, a lit bevel facing the light (upper
//               left), a dark outline, pixel notches and a core light.
//               Three material kinds: 'crust' (dark plates, molten seams),
//               'crystal' (translucent bright plates, dark structure lines,
//               bright rims) and 'smoke' (soft translucent wisps).
//  • band():    a ribbon of plates along an animated spine (bands, tails,
//               wyrm bodies) with a running seam along its centre.
//  • fallout(): deterministic pixel shards drifting off the material.
//  • contour veins: painted INSIDE the current sprite frame's alpha mask
//    (sprites.renderEntity maskPaint), the rim is the tinted silhouette —
//    both follow the real visible pose, never a bounding box.
// Manifestations are anchored to body sockets (head, chest, shoulders,
// hands, hip, feet) and follow the pose with damped inertia; layer 'back'
// draws behind the sprite, 'front' in front of it.

const TAU = Math.PI * 2;

// ── Colour helpers ──────────────────────────────────────────────────────
const hexToRgb = (hex) => { const h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, k) => { const A = hexToRgb(a); const B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * k)); };
export const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
const glowPrefix = (hex) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},`; };

// Deterministic RNG so every plate keeps its cracks frame to frame.
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const snap = (v) => Math.round(v);

// Material of a form from its palette (dark · body · accent [· spark]).
export function materialFor(form) {
  let p = form.palette?.length ? form.palette : ['#222222', '#888888', '#ffd27a'];
  // T40 lists gold, orange, obsidian, turquoise: reorder to dark · vein · edge · spark.
  if (form.id === 'T40' && p.length >= 4) p = [p[2], p[1], p[0], p[3]];
  const text = `${form.material ?? ''} ${form.quality ?? ''}`.toLowerCase();
  let kind = /rauch|dunst|schatten|nebel|ruß|schleier/.test(text) ? 'smoke'
    : /glas|kristall|prisma|spiegel|licht|frost|eis|papier|seide|transparent|perlmutt|glimmer|kondens/.test(text) ? 'crystal' : 'crust';
  if (form.id === 'B01') kind = 'crust';
  if (form.id === 'B02') kind = 'crystal';
  if (form.id === 'T40') kind = 'crust';
  const four = p.length >= 4;
  const dark = p[0];
  const vein = four ? p[1] : p[2];
  const edge = four ? p[2] : mix(p[2], '#ffffff', .3);
  const body = four ? p[0] : mix(p[0], p[1], .45);
  const facet = four ? mix(p[0], p[1], .28) : p[1];
  const spark = four ? p[3] : mix(p[2], '#ffffff', .15);
  const crystalBody = form.id === 'B02' ? p[1] : mix(p[1], p[2], .25);
  return {
    kind, dark, body: kind === 'crystal' ? crystalBody : body, facet: kind === 'crystal' ? mix(crystalBody, '#ffffff', .35) : facet,
    vein, edge, spark, core: mix(edge, '#ffffff', .62), glow: glowPrefix(vein), edgeGlow: glowPrefix(edge)
  };
}

// ── Material primitives ─────────────────────────────────────────────────
function path(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(snap(x), snap(y)) : ctx.moveTo(snap(x), snap(y)))); ctx.closePath(); }
const centroid = (pts) => pts.reduce((a, [x, y]) => [a[0] + x / pts.length, a[1] + y / pts.length], [0, 0]);
const shrink = (pts, k) => { const [cx, cy] = centroid(pts); return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]); };

// One piece of material. pts = polygon; seed keeps its cracks stable.
// opts: alpha, glow (0–1 seam intensity), pulse (0–1), lit (edge strength).
export function plate(ctx, pts, mat, seed = 1, opts = {}) {
  if (pts.length < 3) return;
  const alpha = opts.alpha ?? 1;
  if (alpha <= .01) return;
  const r = rng(seed);
  const pulse = opts.pulse ?? .5;
  ctx.save();
  // Never inherit an additive / faded state from whatever was drawn before.
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  if (mat.kind === 'smoke') {
    // Soft translucent wisp with brighter strands.
    ctx.globalAlpha = alpha * .55;
    ctx.shadowColor = mat.dark; ctx.shadowBlur = 6;
    ctx.fillStyle = mat.body; path(ctx, pts); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * .35; ctx.fillStyle = mat.facet; path(ctx, shrink(pts, .6)); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (.35 + .4 * pulse); ctx.strokeStyle = mat.vein; ctx.lineWidth = 1;
    const [cx, cy] = centroid(pts);
    for (let i = 0; i < 2; i++) { const a = pts[Math.floor(r() * pts.length)]; ctx.beginPath(); ctx.moveTo(snap(a[0]), snap(a[1])); ctx.quadraticCurveTo(cx + (r() - .5) * 8, cy + (r() - .5) * 8, snap(cx), snap(cy)); ctx.stroke(); }
    ctx.restore();
    return;
  }
  const crystal = mat.kind === 'crystal';
  // 0) Emissive edge glow (the luminous rim of the reference mockups).
  if ((opts.glowEdge ?? 1) > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = crystal ? mat.edge : mat.vein;
    ctx.globalAlpha = alpha * (crystal ? .22 : .32) * (opts.glowEdge ?? 1); ctx.lineWidth = crystal ? 6 : 7; path(ctx, pts); ctx.stroke();
    ctx.globalAlpha = alpha * (crystal ? .4 : .6) * (opts.glowEdge ?? 1); ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  // 1) Base.
  ctx.globalAlpha = alpha * (crystal ? .62 : .96);
  ctx.fillStyle = mat.body; path(ctx, pts); ctx.fill();
  // 2) Matte inner facet (offset toward the light).
  const inner = shrink(pts, crystal ? .55 : .68).map(([x, y]) => [x - 1, y - 1]);
  ctx.globalAlpha = alpha * (crystal ? .45 : .7);
  ctx.fillStyle = mat.facet; path(ctx, inner); ctx.fill();
  // 3) Seams / structure lines from the centre toward a few corners.
  const [cx, cy] = centroid(pts);
  const seams = 2 + Math.floor(r() * 2);
  const seamPts = [];
  for (let i = 0; i < seams; i++) {
    const v = pts[Math.floor(r() * pts.length)];
    const mx = cx + (v[0] - cx) * (.35 + r() * .3) + (r() - .5) * 4; const my = cy + (v[1] - cy) * (.35 + r() * .3) + (r() - .5) * 4;
    seamPts.push([[cx + (r() - .5) * 3, cy + (r() - .5) * 3], [mx, my], [v[0] + (cx - v[0]) * .12, v[1] + (cy - v[1]) * .12]]);
  }
  if (crystal) {
    ctx.globalAlpha = alpha * .8; ctx.strokeStyle = mat.dark; ctx.lineWidth = 1;
    for (const s of seamPts) { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(snap(x), snap(y)) : ctx.moveTo(snap(x), snap(y)))); ctx.stroke(); }
  } else {
    ctx.globalCompositeOperation = 'lighter';
    const g = (opts.glow ?? 1) * (.55 + .45 * pulse);
    ctx.globalAlpha = alpha * .45 * g; ctx.strokeStyle = mat.vein; ctx.lineWidth = 4.5;
    for (const s of seamPts) { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(snap(x), snap(y)) : ctx.moveTo(snap(x), snap(y)))); ctx.stroke(); }
    ctx.globalAlpha = alpha * g; ctx.strokeStyle = mix(mat.vein, mat.edge, .35); ctx.lineWidth = 1.7;
    for (const s of seamPts) { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(snap(x), snap(y)) : ctx.moveTo(snap(x), snap(y)))); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
  }
  // 4) Outline: dark everywhere, lit bevel on edges facing the light.
  ctx.globalAlpha = alpha * (crystal ? .7 : .9); ctx.strokeStyle = crystal ? mix(mat.dark, mat.body, .3) : mat.dark; ctx.lineWidth = 1.2;
  path(ctx, pts); ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * (opts.lit ?? 1) * (crystal ? .95 : .85); ctx.strokeStyle = mat.edge; ctx.lineWidth = crystal ? 1.4 : 1.2;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    const nx = (b[1] - a[1]); const ny = -(b[0] - a[0]);
    // Light from the upper left: lit when the outward normal points there.
    const len = Math.hypot(nx, ny) || 1;
    if ((nx / len) * -0.7 + (ny / len) * -0.7 > .15 || crystal) {
      ctx.beginPath(); ctx.moveTo(snap(a[0]), snap(a[1])); ctx.lineTo(snap(b[0]), snap(b[1])); ctx.stroke();
    }
  }
  // 5) Pixel notches and a core light cluster.
  ctx.fillStyle = mat.core;
  for (let i = 0; i < 2; i++) {
    const v = pts[Math.floor(r() * pts.length)];
    ctx.globalAlpha = alpha * (.5 + .5 * pulse);
    ctx.fillRect(snap(v[0] + (cx - v[0]) * .15) - 1, snap(v[1] + (cy - v[1]) * .15) - 1, 2, 2);
  }
  if (opts.core) { ctx.globalAlpha = alpha * opts.core; ctx.fillRect(snap(cx) - 1, snap(cy) - 1, 3, 2); }
  ctx.restore();
}

// A jagged quad between two spine points (half-widths w0/w1, normal n).
function bandQuad(a, b, w0, w1, r) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1]; const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; const ny = dx / len;
  const j = () => (r() - .5) * 2.5;
  return [[a[0] + nx * w0 + j(), a[1] + ny * w0 + j()], [b[0] + nx * w1 + j(), b[1] + ny * w1 + j()], [b[0] - nx * w1 + j(), b[1] - ny * w1 + j()], [a[0] - nx * w0 + j(), a[1] - ny * w0 + j()]];
}

// A ribbon of plates along a spine. widths(i, n) → half width at point i.
export function band(ctx, spine, widths, mat, seed, opts = {}) {
  const n = spine.length;
  if (n < 2) return;
  const r = rng(seed);
  for (let i = 0; i < n - 1; i++) {
    const w0 = widths(i, n); const w1 = widths(i + 1, n);
    const q = bandQuad(spine[i], spine[i + 1], w0, w1, r);
    plate(ctx, q, mat, seed * 31 + i * 7, { alpha: opts.alpha, pulse: .5 + .5 * Math.sin((opts.t ?? 0) * 3 + i * .8 + seed), glow: opts.glow });
  }
  // Running seam along the centre of the band (molten core / light thread).
  if (mat.kind !== 'smoke') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const travel = ((opts.t ?? 0) * .8 + seed * .13) % 1;
    for (let i = 0; i < n - 1; i++) {
      const k = Math.max(0, 1 - Math.abs(i / (n - 1) - travel) * 4);
      ctx.globalAlpha = (opts.alpha ?? 1) * (.25 + .6 * k);
      ctx.strokeStyle = mat.kind === 'crystal' ? mat.edge : mat.vein; ctx.lineWidth = 1 + k;
      ctx.beginPath(); ctx.moveTo(snap(spine[i][0]), snap(spine[i][1])); ctx.lineTo(snap(spine[i + 1][0]), snap(spine[i + 1][1])); ctx.stroke();
    }
    ctx.restore();
  }
}

// Deterministic pixel shards drifting off the material.
export function fallout(ctx, origins, mat, t, seed, opts = {}) {
  const count = opts.count ?? 10;
  const r = rng(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const o = origins[Math.floor(r() * origins.length)];
    const life = .9 + r() * .9; const phase = (t / life + r()) % 1;
    const vx = (r() - .5) * 26 + (opts.driftX ?? 0); const vy = -10 - r() * 22 + (opts.driftY ?? 0);
    const x = o[0] + vx * phase * life; const y = o[1] + vy * phase * life + 12 * phase * phase;
    ctx.globalAlpha = (opts.alpha ?? 1) * (1 - phase) * .95;
    ctx.fillStyle = r() < .35 ? mat.core : r() < .5 ? mat.spark : mat.edge;
    const w = r() < .3 ? 3 : 2; const h = r() < .5 ? 1 : 2;
    ctx.fillRect(snap(x), snap(y), w, h);
  }
  ctx.restore();
}

// A small spinning shard (triangle) of material.
function shard(ctx, x, y, size, rot, mat, seed, alpha = 1) {
  const pts = [[0, -size], [size * .55, size * .4], [-size * .45, size * .55]].map(([px, py]) => [x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)]);
  plate(ctx, pts, mat, seed, { alpha, pulse: .6 });
}

// ── Body sockets of the Wizard (logical px; feet at y) ───────────────────
export function sockets(player, y) {
  const f = player.facing || 1; const x = player.x;
  return {
    f, x, y,
    head: [x, y - 82], crown: [x, y - 100], chest: [x, y - 58], back: [x - f * 7, y - 60],
    shoulderF: [x + f * 10, y - 66], shoulderB: [x - f * 10, y - 68],
    handF: [x + f * 17, y - 46], handB: [x - f * 9, y - 49], elbowF: [x + f * 14, y - 56], elbowB: [x - f * 12, y - 58],
    hip: [x, y - 38], hipF: [x + f * 7, y - 38], hipB: [x - f * 8, y - 40],
    kneeF: [x + f * 6, y - 18], kneeB: [x - f * 6, y - 18], footF: [x + f * 7, y - 2], footB: [x - f * 6, y - 2]
  };
}

// Pose state the manifestations react to.
export function poseOf(player) {
  const speed = Math.abs(player.vx ?? 0);
  return {
    t: player.animTime ?? 0,
    run: Math.min(1, speed / 260),
    sprint: player.sprintActive ? 1 : 0,
    air: player.grounded === false ? Math.max(-1, Math.min(1, (player.vElevation ?? 0) / (player.jumpForce || 216))) : 0,
    airborne: player.grounded === false,
    guard: !!player.isGuarding,
    charge: player.formCharge ? Math.min(1, player.formCharge.elapsed / 1.2) : player.chargeTimer > 0 ? .5 : 0,
    chargeDir: player.chargeDir ?? 'forward',
    full: !!(player.formCharge && player.formCharge.elapsed >= 1.2),
    lean: player.formLean ?? 0,
    fade: 1
  };
}

// ── Manifestation renderers ─────────────────────────────────────────────
// Each: (ctx, s = sockets, pose, mat, form, layer). Scales stay inside
// 2.2–4.5 × the hero height (88 px) as the atlas asks.

// B01 Risswild: three unequal cracked energy bands from hip and shoulders,
// flowing like viscous liquid that breaks into plates; a jagged shard crown.
function risswild(ctx, s, pose, mat, form, layer) {
  const { f, t } = { f: s.f, t: pose.t };
  const sweep = pose.sprint ? 1 : pose.run * .5;
  const bands = [
    { from: s.hipB, w: 17, len: 150, lift: 70, phase: 0, front: false },
    { from: s.shoulderB, w: 13, len: 170, lift: 110, phase: 2.1, front: false },
    { from: s.hipF, w: 10, len: 120, lift: 30, phase: 4.2, front: true }
  ];
  bands.forEach((b, bi) => {
    if ((layer === 'front') !== b.front) return;
    const n = 9; const spine = [];
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      // S-curve behind the Wizard; sprint folds it into horizontal shear lines,
      // the jump apex hangs it below the body.
      const back = -f * b.len * k * (1 - .25 * sweep);
      const wave = Math.sin(t * (1.6 + bi * .37) + b.phase + k * 4.2) * (18 + 26 * k) * (1 - .6 * sweep);
      const up = -b.lift * Math.sin(k * Math.PI * .9) * (1 - .8 * sweep) + pose.air * -40 * k + (pose.airborne && pose.air < .2 ? 50 * k * k : 0);
      spine.push([b.from[0] + back + (b.front ? f * 26 * Math.sin(k * Math.PI) : 0), b.from[1] + up + wave * .55]);
    }
    band(ctx, spine, (i, nn) => b.w * (1 - .75 * (i / (nn - 1))) + 1.5 + (i % 3 === 1 ? 2 : 0), mat, 11 + bi * 97, { t, alpha: pose.fade });
    // Splintered tip shards.
    const tip = spine[spine.length - 1];
    for (let k = 0; k < 3; k++) shard(ctx, tip[0] - f * (6 + k * 9), tip[1] + Math.sin(t * 3 + k) * 6 - k * 4, 4 + k, t * (1 + k * .3) + k, mat, 400 + bi * 10 + k, pose.fade * .9);
    fallout(ctx, spine.slice(2), mat, t, 900 + bi, { count: 7, alpha: pose.fade, driftX: -f * 10 * sweep });
  });
  if (layer === 'back') {
    // Jagged shard crown hovering over the head.
    const [hx, hy] = [s.crown[0], s.crown[1] + 4];
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i / 8) * Math.PI;
      const len = (i % 2 ? 9 : 15) + Math.sin(t * 3 + i) * 1.5;
      const bx = hx + Math.cos(a) * 11; const by = hy + Math.sin(a) * 6;
      plate(ctx, [[bx - 2.5, by], [bx + Math.cos(a) * len, by + Math.sin(a) * len], [bx + 2.5, by]], mat, 70 + i, { alpha: pose.fade, pulse: .5 + .5 * Math.sin(t * 4 + i) });
    }
    // Floating breaking shards around the body.
    for (let i = 0; i < 6; i++) {
      const a = t * .6 + i * TAU / 6;
      shard(ctx, s.chest[0] + Math.cos(a) * 34 - s.f * 10, s.chest[1] + Math.sin(a) * 26, 3 + (i % 3), a * 2, mat, 520 + i, pose.fade * .85);
    }
  }
}

// B02 Arkengestell: an open asymmetric force frame — halo core with a light
// spire, segmented ring bands, two spring-jointed arms with single finger
// blocks (rear arm a fist, front arm folding out the bow), crystal plates.
function arkengestell(ctx, s, pose, mat, form, layer) {
  const { f } = s; const t = pose.t;
  const bob = Math.sin(t * 1.8) * 3;
  const cx = s.x - f * 4; const cy = s.y - 70 + bob;
  if (layer === 'back') {
    // Light spire and halo core.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .55 * pose.fade; ctx.strokeStyle = mat.edge; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(snap(cx), snap(cy - 120)); ctx.lineTo(snap(cx), snap(cy + 20)); ctx.stroke();
    ctx.globalAlpha = .25 * pose.fade; ctx.lineWidth = 6; ctx.stroke();
    ctx.restore();
    const hx = cx; const hy = cy - 62;
    for (let i = 0; i < 12; i++) {
      const a0 = i / 12 * TAU + t * .25; const a1 = a0 + TAU / 12 * .78;
      const r0 = 20; const r1 = 30;
      plate(ctx, [[hx + Math.cos(a0) * r0, hy + Math.sin(a0) * r0], [hx + Math.cos(a0) * r1, hy + Math.sin(a0) * r1], [hx + Math.cos(a1) * r1, hy + Math.sin(a1) * r1], [hx + Math.cos(a1) * r0, hy + Math.sin(a1) * r0]], mat, 30 + i, { alpha: pose.fade, pulse: .5 + .5 * Math.sin(t * 2 + i) });
    }
    // Four-point star at the core.
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .9 * pose.fade; ctx.fillStyle = mat.core;
    const st = 9 + Math.sin(t * 5) * 2;
    path(ctx, [[hx, hy - st], [hx + 2, hy - 2], [hx + st, hy], [hx + 2, hy + 2], [hx, hy + st], [hx - 2, hy + 2], [hx - st, hy], [hx - 2, hy - 2]]); ctx.fill();
    ctx.restore();
    // Rear arm: shoulder pivot → upper arm → forearm → fist of finger blocks.
    const sh = [cx - f * 34, cy - 18];
    const el = [sh[0] - f * 26, sh[1] + 26 + Math.sin(t * 1.3) * 4];
    const fist = [el[0] - f * 8, el[1] + 30 + Math.sin(t * 1.3 + .6) * 3];
    limbSegment(ctx, sh, el, 17, mat, 140, pose);
    limbSegment(ctx, el, fist, 15, mat, 150, pose);
    for (let k = 0; k < 4; k++) {
      const fx = fist[0] + (k - 1.5) * 7; const fy = fist[1] + 6 + Math.abs(k - 1.5) * 1.5;
      plate(ctx, [[fx - 4, fy - 5], [fx + 4, fy - 5], [fx + 4, fy + 7], [fx - 4, fy + 7]], mat, 160 + k, { alpha: pose.fade });
    }
    plate(ctx, [[fist[0] - 13, fist[1] - 8], [fist[0] + 13, fist[1] - 8], [fist[0] + 11, fist[1] + 4], [fist[0] - 11, fist[1] + 4]], mat, 170, { alpha: pose.fade });
    // Segmented ring bands spiralling around the body (back halves).
    ringBands(ctx, s, pose, mat, 'back');
    // Floating crystal plates.
    for (let i = 0; i < 6; i++) {
      const a = t * .35 + i * TAU / 6;
      const px = cx + Math.cos(a) * 64; const py = cy - 10 + Math.sin(a * 1.3) * 34;
      if (Math.sin(a) < 0) plate(ctx, [[px, py - 9], [px + 4, py], [px, py + 9], [px - 4, py]], mat, 200 + i, { alpha: pose.fade * .9 });
    }
  } else {
    ringBands(ctx, s, pose, mat, 'front');
    // Front arm holds the bow; drawn taut while a forward technique charges.
    const sh = [cx + f * 30, cy - 16];
    const drawing = pose.charge > 0 && pose.chargeDir === 'forward';
    const hand = [sh[0] + f * (34 + (drawing ? 10 : 0)), sh[1] + 14];
    limbSegment(ctx, sh, [sh[0] + f * 18, sh[1] + 18], 15, mat, 180, pose);
    limbSegment(ctx, [sh[0] + f * 18, sh[1] + 18], hand, 13, mat, 190, pose);
    const bowH = 70; const pull = drawing ? 10 + 18 * pose.charge : 0;
    const top = [hand[0] - f * 6, hand[1] - bowH / 2]; const bot = [hand[0] - f * 6, hand[1] + bowH / 2];
    const bend = [hand[0] + f * 22, hand[1]];
    // Bow limbs as plate segments along two arcs.
    for (const [a, b, sd] of [[top, bend, 210], [bend, bot, 220]]) {
      const pts = []; for (let k = 0; k <= 4; k++) { const u = k / 4; pts.push([a[0] + (b[0] - a[0]) * u + f * Math.sin(u * Math.PI) * 6, a[1] + (b[1] - a[1]) * u]); }
      band(ctx, pts, () => 2.6, mat, sd, { t, alpha: pose.fade });
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = mat.core; ctx.globalAlpha = .8 * pose.fade; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(snap(top[0]), snap(top[1])); ctx.lineTo(snap(hand[0] - f * pull), snap(hand[1])); ctx.lineTo(snap(bot[0]), snap(bot[1])); ctx.stroke();
    if (drawing) {
      // The arrow of light nocked on the string.
      ctx.globalAlpha = (.5 + .5 * pose.charge) * pose.fade; ctx.strokeStyle = pose.full ? mat.core : mat.edge; ctx.lineWidth = pose.full ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(snap(hand[0] - f * pull), snap(hand[1])); ctx.lineTo(snap(hand[0] + f * 46), snap(hand[1])); ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 6; i++) {
      const a = t * .35 + i * TAU / 6;
      const px = cx + Math.cos(a) * 64; const py = cy - 10 + Math.sin(a * 1.3) * 34;
      if (Math.sin(a) >= 0) plate(ctx, [[px, py - 9], [px + 4, py], [px, py + 9], [px - 4, py]], mat, 200 + i, { alpha: pose.fade * .9 });
    }
  }
  fallout(ctx, [[cx, cy - 62], [cx - f * 34, cy], [cx + f * 40, cy]], mat, t, 260, { count: 8, alpha: pose.fade });
}

// A spring-jointed limb segment: a faceted plate between two joints.
function limbSegment(ctx, a, b, w, mat, seed, pose) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1]; const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len * w * .5; const ny = dx / len * w * .5;
  plate(ctx, [[a[0] + nx, a[1] + ny], [a[0] + dx * .5 + nx * 1.25, a[1] + dy * .5 + ny * 1.25], [b[0] + nx * .8, b[1] + ny * .8], [b[0] - nx * .8, b[1] - ny * .8], [a[0] + dx * .5 - nx * 1.25, a[1] + dy * .5 - ny * 1.25], [a[0] - nx, a[1] - ny]], mat, seed, { alpha: pose.fade, pulse: .5 + .5 * Math.sin(pose.t * 2 + seed) });
  plate(ctx, [[b[0] - 4, b[1] - 4], [b[0] + 4, b[1] - 4], [b[0] + 4, b[1] + 4], [b[0] - 4, b[1] + 4]], mat, seed + 1, { alpha: pose.fade, core: .8 });
}

// Segmented elliptical ring bands around the body (for B02 and girdles).
function ringBands(ctx, s, pose, mat, layer, rings = 3) {
  const t = pose.t;
  for (let r = 0; r < rings; r++) {
    const ry = s.y - 24 - r * 22; const rx = 30 + r * 4; const rz = 7 + r;
    const segs = 14;
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * TAU + t * (.5 + r * .2) * (r % 2 ? -1 : 1);
      const a1 = a0 + TAU / segs * .7;
      const back = Math.sin((a0 + a1) / 2) < 0;
      if ((layer === 'back') !== back) continue;
      const p = (a) => [s.x + Math.cos(a) * rx, ry + Math.sin(a) * rz];
      const [q0, q1] = [p(a0), p(a1)];
      plate(ctx, [[q0[0], q0[1] - 2], [q1[0], q1[1] - 2], [q1[0], q1[1] + 2], [q0[0], q0[1] + 2]], mat, 300 + r * 20 + i, { alpha: pose.fade * (back ? .7 : 1) });
    }
  }
}

// Generic: N bands from the back (comet / leading / condensation bands).
function bands(ctx, s, pose, mat, form, layer) {
  const n = Math.max(1, Math.min(5, form.count ?? 3)); const f = s.f; const t = pose.t;
  const seed = hashStr(form.id);
  for (let b = 0; b < n; b++) {
    const front = n > 1 && b === n - 1;
    if ((layer === 'front') !== front) continue;
    const from = [s.back[0], s.back[1] + (b - (n - 1) / 2) * 12];
    const spine = [];
    const len = (n === 1 ? 160 : 110) + (b % 2) * 30; const sweep = pose.sprint ? 1 : pose.run * .5;
    for (let i = 0; i < 8; i++) {
      const k = i / 7;
      // S-curve flowing behind; sprint stretches it flat, the jump apex lets it hang.
      const wave = Math.sin(t * 1.4 + b * 1.7 + k * 4.2) * (10 + 22 * k) * (1 - .6 * sweep);
      spine.push([from[0] - f * len * k, from[1] + (b - (n - 1) / 2) * 16 * k - 18 * Math.sin(k * Math.PI) * (1 - sweep) + wave + (pose.airborne ? 30 * k * k * (pose.air < 0 ? 1 : -.4) : 0)]);
    }
    band(ctx, spine, (i, nn) => (n === 1 ? 1.7 : 1) * (6 + (b % 2) * 3) * (1 - .55 * i / (nn - 1)) + (i === nn - 1 ? 4 : 0), mat, seed + b * 13, { t, alpha: pose.fade });
    // Fan-shaped end (comet bands / leading bands).
    const tip = spine[spine.length - 1];
    for (let k = -1; k <= 1; k++) plate(ctx, [[tip[0], tip[1]], [tip[0] - f * 16, tip[1] + k * 9 - 3], [tip[0] - f * 13, tip[1] + k * 9 + 3]], mat, seed + 50 + b * 3 + k, { alpha: pose.fade * .9 });
    fallout(ctx, spine.slice(3), mat, t, seed + 70 + b, { count: 5, alpha: pose.fade });
  }
}

// Generic: N fins / sails / lamellae / shingles fanned from the back.
function fins(ctx, s, pose, mat, form, layer) {
  if (layer !== 'back') return;
  const n = Math.max(2, Math.min(6, form.count ?? 3)); const f = s.f; const t = pose.t;
  const seed = hashStr(form.id); const item = form.item ?? 'blade';
  const fold = pose.sprint ? .55 : pose.guard ? -.25 : 0;
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? .5 : i / (n - 1);
    const ang = (-2.35 + k * 1.5 + fold) + Math.sin(t * 1.5 + i) * .05 + pose.air * .15;
    const base = [s.back[0] - f * 2, s.back[1] + 4 + i * 2];
    const len = item === 'sail' ? 70 : item === 'shingle' ? 34 : 58 - Math.abs(k - .5) * 16;
    const dir = [Math.cos(ang) * f, Math.sin(ang)];
    const perp = [-dir[1], dir[0]];
    const w = item === 'sail' ? 22 : item === 'shingle' ? 10 : 7;
    const peel = item === 'shingle' ? ((t * .4 + i * .23) % 1) : 0;
    const off = [dir[0] * peel * 30 - f * peel * 10, dir[1] * peel * 30 - peel * 8];
    const tip = [base[0] + dir[0] * len + off[0], base[1] + dir[1] * len + off[1]];
    const pts = item === 'sail'
      ? [[base[0] + off[0], base[1] + off[1]], [base[0] + dir[0] * len * .5 + perp[0] * w + off[0], base[1] + dir[1] * len * .5 + perp[1] * w + off[1]], tip, [base[0] + dir[0] * len * .55 - perp[0] * 4 + off[0], base[1] + dir[1] * len * .55 - perp[1] * 4 + off[1]]]
      : [[base[0] + perp[0] * w * .5 + off[0], base[1] + perp[1] * w * .5 + off[1]], [base[0] + dir[0] * len * .7 + perp[0] * w * .65 + off[0], base[1] + dir[1] * len * .7 + perp[1] * w * .65 + off[1]], tip, [base[0] + dir[0] * len * .6 - perp[0] * w * .5 + off[0], base[1] + dir[1] * len * .6 - perp[1] * w * .5 + off[1]], [base[0] - perp[0] * w * .5 + off[0], base[1] - perp[1] * w * .5 + off[1]]];
    plate(ctx, pts, mat, seed + i * 17, { alpha: pose.fade * (1 - peel * .8), pulse: .5 + .5 * Math.sin(t * 2.2 + i * 1.3) });
    if (item === 'sail') {
      // Lamellae ribs across the sail.
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = mat.edge; ctx.globalAlpha = .55 * pose.fade; ctx.lineWidth = 1;
      for (let r = 1; r <= 3; r++) { const u = r / 4; ctx.beginPath(); ctx.moveTo(snap(base[0] + dir[0] * len * u * .3), snap(base[1] + dir[1] * len * u * .3)); ctx.lineTo(snap(base[0] + dir[0] * len * (.3 + u * .6) + perp[0] * w * (1 - u)), snap(base[1] + dir[1] * len * (.3 + u * .6) + perp[1] * w * (1 - u))); ctx.stroke(); }
      ctx.restore();
    }
    fallout(ctx, [tip], mat, t, seed + 90 + i, { count: 2, alpha: pose.fade });
  }
}

// Orbit items (coils, knots, mirrors, frames, voids, glyph plates, seeds …).
function orbitItem(ctx, item, x, y, size, rot, mat, seed, alpha, t) {
  const c = Math.cos(rot); const sn = Math.sin(rot);
  const P = (px, py) => [x + px * c - py * sn, y + px * sn + py * c];
  switch (item) {
    case 'coil': {
      plate(ctx, [P(-size * .4, -size), P(size * .4, -size), P(size * .4, size), P(-size * .4, size)], mat, seed, { alpha });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = mat.vein; ctx.globalAlpha = alpha * (.6 + .4 * Math.sin(t * 9 + seed)); ctx.lineWidth = 1;
      for (let k = -3; k <= 3; k++) { const [ax, ay] = P(-size * .45, k * size * .28); const [bx, by] = P(size * .45, k * size * .28 + 2); ctx.beginPath(); ctx.moveTo(snap(ax), snap(ay)); ctx.lineTo(snap(bx), snap(by)); ctx.stroke(); }
      ctx.restore();
      break;
    }
    case 'knot': {
      for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + t; plate(ctx, [P(Math.cos(a) * size * .2, Math.sin(a) * size * .2), P(Math.cos(a) * size, Math.sin(a) * size), P(Math.cos(a + .7) * size * .7, Math.sin(a + .7) * size * .7)], mat, seed + k, { alpha }); }
      break;
    }
    case 'mirror': plate(ctx, [P(-size * .5, -size), P(size * .6, -size * .7), P(size * .5, size), P(-size * .6, size * .8)], mat, seed, { alpha, core: .6 }); break;
    case 'frame': {
      const o = [P(-size * .7, -size), P(size * .7, -size), P(size * .7, size), P(-size * .7, size)];
      const i2 = [P(-size * .45, -size * .7), P(size * .45, -size * .7), P(size * .45, size * .7), P(-size * .45, size * .7)];
      plate(ctx, o, mat, seed, { alpha });
      ctx.save(); ctx.globalAlpha = alpha * .8; ctx.fillStyle = mat.dark; path(ctx, i2); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = mat.core; ctx.lineWidth = 1;
      const [ax, ay] = P(-size * .3, size * .3); const [bx, by] = P(size * .3, -size * .3 + Math.sin(t * 3 + seed) * 3);
      ctx.beginPath(); ctx.moveTo(snap(ax), snap(ay)); ctx.lineTo(snap(bx), snap(by)); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'void': {
      ctx.save();
      ctx.globalAlpha = alpha * .92; ctx.fillStyle = '#05060a';
      ctx.beginPath(); ctx.ellipse(snap(x), snap(y), size, size * .75, rot, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = mat.edge; ctx.lineWidth = 1.3; ctx.globalAlpha = alpha * .9;
      ctx.beginPath(); ctx.ellipse(snap(x), snap(y), size, size * .75, rot, 0, TAU); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'glyph': {
      plate(ctx, [P(-size * .7, -size * .8), P(size * .8, -size * .6), P(size * .7, size * .8), P(-size * .8, size * .6)], mat, seed, { alpha });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = mat.vein; ctx.globalAlpha = alpha; ctx.lineWidth = 1.2;
      const g = [P(-size * .3, -size * .35), P(size * .3, -size * .35), P(0, size * .4), P(-size * .3, -size * .35)];
      ctx.beginPath(); g.forEach(([gx, gy], i) => (i ? ctx.lineTo(snap(gx), snap(gy)) : ctx.moveTo(snap(gx), snap(gy)))); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'bell': {
      plate(ctx, [P(-size * .35, -size), P(size * .35, -size), P(size * .7, size * .6), P(-size * .7, size * .6)], mat, seed, { alpha });
      plate(ctx, [P(-size * .8, size * .55), P(size * .8, size * .55), P(size * .6, size * .85), P(-size * .6, size * .85)], mat, seed + 3, { alpha });
      break;
    }
    case 'apparatus': {
      const kind = seed % 3;
      if (kind === 0) { plate(ctx, [P(-1.5, -size), P(1.5, -size), P(1.5, size * .4), P(-1.5, size * .4)], mat, seed, { alpha }); plate(ctx, [P(-size * .4, size * .3), P(size * .4, size * .3), P(0, size)], mat, seed + 1, { alpha }); }
      else if (kind === 1) { plate(ctx, [P(-size * .2, -size), P(size * .5, -size * .2), P(size * .1, size)], mat, seed, { alpha }); plate(ctx, [P(size * .2, -size), P(-size * .5, -size * .2), P(-size * .1, size)], mat, seed + 2, { alpha }); }
      else plate(ctx, [P(0, -size), P(size * .35, 0), P(0, size), P(-size * .35, 0)], mat, seed, { alpha, core: .8 });
      break;
    }
    case 'seed': plate(ctx, [P(0, -size), P(size * .45, size * .5), P(-size * .45, size * .5)], mat, seed, { alpha, pulse: .5 + .5 * Math.sin(t * 4 + seed) }); break;
    default: shard(ctx, x, y, size, rot, mat, seed, alpha);
  }
}

function orbit(ctx, s, pose, mat, form, layer) {
  const n = Math.max(3, Math.min(8, form.count ?? 4)); const t = pose.t; const seed = hashStr(form.id);
  const item = form.item ?? 'shard';
  const small = item === 'seed' || item === 'shard';
  const rx = small ? 30 : 46; const ry = small ? 14 : 22;
  const center = small ? s.handF : s.chest;
  const speed = item === 'coil' ? 1.6 : item === 'seed' ? 1.1 : .7;
  for (let i = 0; i < n; i++) {
    const a = t * speed + i * TAU / n;
    const back = Math.sin(a) < 0;
    if ((layer === 'back') !== back) continue;
    const x = center[0] + Math.cos(a) * rx * (pose.sprint ? .7 : 1) - s.f * pose.run * 10;
    const y = center[1] + Math.sin(a) * ry + (item === 'knot' || item === 'bell' ? Math.sin(t * 2 + i) * 6 : 0) + pose.air * -10;
    const size = small ? 6 : item === 'mirror' ? 13 - i : 10;
    // Small orbit bodies leave a short comet trail of shards.
    if (small) for (let g = 1; g <= 3; g++) { const ag = a - g * .22; orbitItem(ctx, item, center[0] + Math.cos(ag) * rx - s.f * pose.run * 10, center[1] + Math.sin(ag) * ry, size * (1 - g * .2), ag * .5, mat, seed + i * 11 + g, pose.fade * (back ? .75 : 1) * (.5 - g * .12), t); }
    orbitItem(ctx, item, x, y, size, item === 'coil' ? .6 : item === 'frame' ? 0 : a * .5, mat, seed + i * 11, pose.fade * (back ? .75 : 1), t);
  }
  if (layer === 'front') fallout(ctx, [center], mat, t, seed + 5, { count: 6, alpha: pose.fade });
}

// Limb attachments at hands, forearms, elbows and feet.
function limbs(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const f = s.f; const seed = hashStr(form.id); const item = form.item ?? 'mark';
  const sets = layer === 'front' ? [['elbowF', 'handF', 1], ['kneeF', 'footF', 1]] : [['elbowB', 'handB', -1], ['kneeB', 'footB', -1]];
  sets.forEach(([a, b, side], si) => {
    const A = s[a]; const B = s[b];
    const leg = si === 1;
    if (item === 'accent' && !leg) return;
    if ((item === 'capillary' || item === 'tube' || item === 'fold' || item === 'notes' || item === 'thread') && leg) return;
    const k = seed + si * 7 + (side > 0 ? 0 : 3);
    // A material bracer along forearm / calf anchors the attachment on the body.
    if (item !== 'thread') {
      const mx = (A[0] + B[0]) / 2; const my = (A[1] + B[1]) / 2;
      const dx = B[0] - A[0]; const dy = B[1] - A[1]; const len = Math.hypot(dx, dy) || 1; const nx = -dy / len * 3.5; const ny = dx / len * 3.5;
      plate(ctx, [[A[0] + dx * .2 + nx, A[1] + dy * .2 + ny], [mx + nx * 1.2, my + ny * 1.2], [mx - nx * 1.2, my - ny * 1.2], [A[0] + dx * .2 - nx, A[1] + dy * .2 - ny]], mat, k + 40, { alpha: pose.fade * .9 });
      plate(ctx, [[mx + nx * 1.1, my + ny * 1.1], [B[0] - dx * .12 + nx, B[1] - dy * .12 + ny], [B[0] - dx * .12 - nx, B[1] - dy * .12 - ny], [mx - nx * 1.1, my - ny * 1.1]], mat, k + 41, { alpha: pose.fade * .9, pulse: .5 + .5 * Math.sin(t * 4 + si) });
    }
    switch (item) {
      case 'sickle': {
        const swing = Math.sin(t * 2.4 + si + side) * .3 - pose.run * .4;
        const base = [B[0], B[1] - 2];
        const pts = []; for (let q = 0; q <= 5; q++) { const u = q / 5; const ang = -1.9 + swing + u * 1.8; pts.push([base[0] - f * Math.cos(ang) * (8 + u * 22) * -1, base[1] + Math.sin(ang) * (8 + u * 22)]); }
        band(ctx, pts, (i, nn) => 4 * (1 - i / nn) + 1, mat, k, { t, alpha: pose.fade });
        fallout(ctx, [pts[pts.length - 1]], mat, t, k + 1, { count: 3, alpha: pose.fade, driftX: -f * 14 });
        break;
      }
      case 'notes': for (let q = 0; q < 3; q++) { const u = q / 3; const x = A[0] + (B[0] - A[0]) * u; const y = A[1] + (B[1] - A[1]) * u; plate(ctx, [[x, y - 2], [x + f * 14, y - 5], [x + f * 14, y - 3], [x, y + 1]], mat, k + q, { alpha: pose.fade, pulse: .5 + .5 * Math.sin(t * 6 + q) }); } break;
      case 'capillary': {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = mat.vein; ctx.lineWidth = 1.2; ctx.globalAlpha = pose.fade * .85;
        for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(snap(A[0]), snap(A[1] + q * 2)); ctx.quadraticCurveTo(snap((A[0] + B[0]) / 2 + Math.sin(t * 3 + q) * 4), snap((A[1] + B[1]) / 2 - 6 + q * 3), snap(B[0]), snap(B[1] + q)); ctx.stroke(); }
        ctx.restore();
        for (let q = 0; q < 3; q++) shard(ctx, A[0] + (B[0] - A[0]) * (q / 2), A[1] + (B[1] - A[1]) * (q / 2) - 4, 3, q, mat, k + q, pose.fade);
        break;
      }
      case 'fold': plate(ctx, [[A[0] - 7, A[1] - 6], [A[0] + 8, A[1] - 8], [A[0] + 6, A[1] + 7], [A[0] - 8, A[1] + 5]], mat, k, { alpha: pose.fade }); plate(ctx, [[A[0] - 3, A[1] - 12], [A[0] + 10, A[1] - 13], [A[0] + 8, A[1] - 4]], mat, k + 1, { alpha: pose.fade * .8 }); break;
      case 'tube': {
        const dx = B[0] - A[0]; const dy = B[1] - A[1];
        plate(ctx, [[A[0] - 3, A[1] - 3], [B[0] - 3, B[1] - 3], [B[0] + 3, B[1] + 3], [A[0] + 3, A[1] + 3]], mat, k, { alpha: pose.fade * .8 });
        for (let q = 1; q <= 2; q++) { const cx = A[0] + dx * q / 3; const cy = A[1] + dy * q / 3; const hex = Array.from({ length: 6 }, (_, j) => [cx + Math.cos(j * TAU / 6) * 4, cy + Math.sin(j * TAU / 6) * 4]); plate(ctx, hex, mat, k + q, { alpha: pose.fade, core: .7 }); }
        break;
      }
      case 'scale': for (let q = 0; q < 3; q++) { const x = A[0] + (q - 1) * 5; const y = A[1] + Math.abs(q - 1) * 2; plate(ctx, [[x - 3, y - 3], [x + 3, y - 3], [x + 2, y + 3], [x - 2, y + 3]], mat, k + q, { alpha: pose.fade }); } break;
      case 'accent': {
        const step = Math.abs(Math.sin(t * 7 + side)) > .85 || pose.run < .1;
        if (step) plate(ctx, [[B[0] - 6, B[1] - 3], [B[0] + 6, B[1] - 3], [B[0] + 6, B[1]], [B[0] - 6, B[1]]], mat, k, { alpha: pose.fade, core: 1 });
        break;
      }
      case 'thread': {
        if (side < 0) break;
        const spool = [s.shoulderB[0] - f * 4, s.shoulderB[1] - 6];
        orbitItem(ctx, 'coil', spool[0], spool[1], 6, 1.57, mat, k, pose.fade, t);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = mat.edge; ctx.lineWidth = 1; ctx.globalAlpha = pose.fade * .8;
        for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.moveTo(snap(spool[0]), snap(spool[1] + q - 2)); ctx.quadraticCurveTo(snap(s.chest[0]), snap(s.chest[1] - 14 + q * 3 + Math.sin(t * 4 + q) * 2), snap(s.handF[0] + f * 6), snap(s.handF[1] + q - 2)); ctx.stroke(); }
        ctx.restore();
        break;
      }
      default: shard(ctx, B[0], B[1] - 6, 5, t + si, mat, k, pose.fade);
    }
  });
}

// Around waist and torso: kiln ribs, bell carousel, root tubes, prism cells.
function girdle(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const seed = hashStr(form.id); const item = form.item ?? 'rib';
  const n = Math.max(4, Math.min(8, form.count ?? 5));
  const cy = item === 'tube' ? s.chest[1] : s.hip[1] - 4;
  for (let i = 0; i < n; i++) {
    const a = t * (item === 'bell' ? .9 : .5) + i * TAU / n;
    const back = Math.sin(a) < 0;
    if ((layer === 'back') !== back) continue;
    const x = s.x + Math.cos(a) * 32; const y = cy + Math.sin(a) * 10;
    const alpha = pose.fade * (back ? .75 : 1);
    if (item === 'bell') orbitItem(ctx, 'bell', x, y + 6 + Math.sin(t * 3 + i) * 3, 8, Math.sin(t * 2 + i) * .2, mat, seed + i, alpha, t);
    else if (item === 'cell') orbitItem(ctx, 'mirror', x, y - 8 * Math.cos(a * 2), 7, a, mat, seed + i, alpha, t);
    else if (item === 'tube') {
      const pts = [[x, y - 24], [x + Math.cos(a) * 4, y - 8], [x, y + 8], [x - Math.cos(a) * 3, y + 22]];
      band(ctx, pts, () => 2.6, mat, seed + i, { t, alpha });
    } else plate(ctx, [[x - 4, y - 14], [x + 4, y - 12], [x + 5, y + 10], [x - 5, y + 12]], mat, seed + i, { alpha, pulse: .5 + .5 * Math.sin(t * 3 + i) });
  }
  if (item === 'rib' && layer === 'front') {
    // The glowing kiln opening at the left hip.
    const [hx, hy] = s.hipB;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pose.fade * (.6 + .3 * Math.sin(t * 6)); ctx.fillStyle = mat.vein;
    ctx.beginPath(); ctx.ellipse(snap(hx), snap(hy), 5, 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = mat.core; ctx.fillRect(snap(hx) - 1, snap(hy) - 2, 2, 4);
    ctx.restore();
    fallout(ctx, [s.hipB], mat, t, seed + 9, { count: 6, alpha: pose.fade });
  }
}

// External braces, clamps, compass arms or braided armatures.
function frame(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const seed = hashStr(form.id); const item = form.item ?? 'brace'; const f = s.f;
  const anchors = layer === 'front' ? ['shoulderF', 'hipF', 'kneeF'] : ['shoulderB', 'hipB', 'kneeB'];
  const n = Math.max(2, Math.min(5, form.count ?? 3));
  anchors.slice(0, Math.ceil(n / 2) + (layer === 'back' ? 0 : 0)).forEach((name, i) => {
    const [ax, ay] = s[name];
    const lag = item === 'braid' ? Math.sin(t * 2 - i) * 6 : 0;
    const side = layer === 'front' ? f : -f;
    const k = seed + i * 13 + (layer === 'front' ? 0 : 50);
    if (item === 'clamp') {
      const w = 12; const h = 10 + i * 2;
      plate(ctx, [[ax - w, ay - h], [ax + w, ay - h], [ax + w, ay - h + 4], [ax - w + 4, ay - h + 4], [ax - w + 4, ay + h - 4], [ax + w, ay + h - 4], [ax + w, ay + h], [ax - w, ay + h]].map(([x, y]) => [ax + (x - ax) * side, y + Math.sin(t * 1.5 + i) * 2]), mat, k, { alpha: pose.fade });
    } else if (item === 'compass') {
      const ang = Math.sin(t * 1.2 + i) * .5;
      for (const sgn of [-1, 1]) plate(ctx, [[ax, ay - 2], [ax + side * Math.cos(ang * sgn - .4) * 26, ay + Math.sin(ang * sgn + .6) * 18], [ax + side * Math.cos(ang * sgn - .4) * 24, ay + Math.sin(ang * sgn + .6) * 18 + 3], [ax, ay + 2]], mat, k + (sgn > 0 ? 1 : 0), { alpha: pose.fade });
      plate(ctx, [[ax - 3, ay - 3], [ax + 3, ay - 3], [ax + 3, ay + 3], [ax - 3, ay + 3]], mat, k + 5, { alpha: pose.fade, core: 1 });
    } else {
      // Brace / braid: an open arched exoskeleton bow beside the joint.
      const pts = []; for (let q = 0; q <= 5; q++) { const u = q / 5; pts.push([ax + side * (10 + Math.sin(u * Math.PI) * 18) + lag, ay - 14 + u * 28]); }
      band(ctx, pts, () => item === 'braid' ? 2.5 : 3.6, mat, k, { t, alpha: pose.fade * (item === 'braid' ? .75 : 1) });
      if (item === 'braid') band(ctx, pts.map(([x, y], q) => [x + Math.sin(t * 3 + q) * 3, y + 2]), () => 1.8, mat, k + 9, { t, alpha: pose.fade * .6 });
    }
  });
}

// Three angular fossil-glass jaw arcs beside the Wizard, opening and closing.
function jaws(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const seed = hashStr(form.id); const f = s.f;
  const open = .35 + .25 * Math.sin(t * 1.7) + (pose.charge ? .3 : 0);
  for (let j = 0; j < 3; j++) {
    const front = j === 2;
    if ((layer === 'front') !== front) continue;
    const cx = s.x + f * (front ? 30 : -30 - j * 8); const cy = s.y - 70 + j * 18;
    for (const sgn of [-1, 1]) {
      const pts = []; for (let q = 0; q <= 5; q++) { const u = q / 5; const a = sgn * (open * .8) + (u - .5) * 1.4 * sgn; pts.push([cx + f * Math.cos(a) * (10 + u * 22), cy + Math.sin(a) * (6 + u * 10)]); }
      band(ctx, pts, (i) => 3 + (i % 2) * 1.5, mat, seed + j * 7 + (sgn > 0 ? 1 : 0), { t, alpha: pose.fade });
      // Teeth.
      for (let q = 1; q < 5; q += 1) { const [x, y] = pts[q]; plate(ctx, [[x - 2, y], [x + 2, y], [x, y - sgn * 6]], mat, seed + 100 + j * 10 + q, { alpha: pose.fade }); }
    }
  }
}

// Two flat jointed shadow marionettes hanging from diagonal light threads.
function puppets(ctx, s, pose, mat, form, layer) {
  if (layer !== 'back') return;
  const t = pose.t; const seed = hashStr(form.id); const f = s.f;
  for (let p = 0; p < 2; p++) {
    const side = p === 0 ? -1 : 1;
    const hx = s.x + side * 46 - f * 6; const hy = s.y - 78 + Math.sin(t * 1.4 + p * 2) * 5;
    const anchor = [hx + side * 18, hy - 50];
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = mat.edge; ctx.lineWidth = 1; ctx.globalAlpha = pose.fade * .7;
    for (const [dx, dy] of [[0, 0], [-8, 22], [8, 22], [0, 40]]) { ctx.beginPath(); ctx.moveTo(snap(anchor[0]), snap(anchor[1])); ctx.lineTo(snap(hx + dx), snap(hy + dy)); ctx.stroke(); }
    ctx.restore();
    const sw = Math.sin(t * 2 + p) * .3;
    plate(ctx, [[hx - 5, hy - 6], [hx + 5, hy - 6], [hx + 4, hy + 4], [hx - 4, hy + 4]], mat, seed + p * 20, { alpha: pose.fade });
    plate(ctx, [[hx - 7, hy + 6], [hx + 7, hy + 6], [hx + 5, hy + 26], [hx - 5, hy + 26]], mat, seed + p * 20 + 1, { alpha: pose.fade });
    limbSegment(ctx, [hx - 7, hy + 8], [hx - 12 + sw * 10, hy + 24], 4, mat, seed + p * 20 + 2, pose);
    limbSegment(ctx, [hx + 7, hy + 8], [hx + 12 - sw * 10, hy + 24], 4, mat, seed + p * 20 + 4, pose);
    limbSegment(ctx, [hx - 3, hy + 26], [hx - 5 - sw * 6, hy + 44], 4, mat, seed + p * 20 + 6, pose);
    limbSegment(ctx, [hx + 3, hy + 26], [hx + 5 + sw * 6, hy + 44], 4, mat, seed + p * 20 + 8, pose);
  }
}

// Grid arches standing on the lane / a projector apparatus with segments.
function arches(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const seed = hashStr(form.id); const n = Math.max(1, Math.min(4, form.count ?? 3));
  const projector = /projektionsapparat/.test((form.silhouette ?? '').toLowerCase());
  if (projector) {
    if (layer !== 'back') return;
    const cx = s.x - s.f * 30; const cy = s.y - 92 + Math.sin(t * 1.5) * 3;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * .9 + Math.sin(t + i) * .08;
      plate(ctx, [[cx, cy], [cx + Math.cos(a - .25) * 24, cy + Math.sin(a - .25) * 24], [cx + Math.cos(a + .25) * 24, cy + Math.sin(a + .25) * 24]], mat, seed + i, { alpha: pose.fade });
    }
    orbitItem(ctx, 'frame', cx, cy + 10, 7, 0, mat, seed + 9, pose.fade, t);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pose.fade * .25; ctx.fillStyle = mat.edge;
    path(ctx, [[cx - 4, cy + 14], [cx + 4, cy + 14], [s.x + s.f * 40, s.y], [s.x - s.f * 10, s.y]]); ctx.fill(); ctx.restore();
    return;
  }
  for (let i = 0; i < n; i++) {
    const back = i % 2 === 0;
    if ((layer === 'back') !== back) continue;
    const ax = s.x + (i - (n - 1) / 2) * 44; const ay = s.y + (back ? -6 : 4);
    const h = 70 + (i % 2) * 14; const w = 18;
    const pts = []; for (let q = 0; q <= 8; q++) { const u = q / 8; pts.push([ax - w + u * w * 2, ay - Math.sin(u * Math.PI) * h]); }
    band(ctx, pts, () => 2.8, mat, seed + i, { t, alpha: pose.fade * (back ? .7 : 1) });
    // Grid struts.
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = mat.edge; ctx.lineWidth = 1; ctx.globalAlpha = pose.fade * .45;
    for (let q = 1; q < 8; q++) { const [x, y] = pts[q]; ctx.beginPath(); ctx.moveTo(snap(x), snap(y)); ctx.lineTo(snap(x), snap(ay)); ctx.stroke(); }
    ctx.restore();
  }
}

// T40 Sonnenwyrm: two counter-rotating scale bands with a lance-blade head
// fin, floating scales and a lance projection at the front hand.
function wyrm(ctx, s, pose, mat, form, layer) {
  const t = pose.t; const f = s.f;
  if (layer === 'back') {
    for (let w = 0; w < 2; w++) {
      const side = w === 0 ? -1 : 1;
      const base = [s.back[0] + side * 14, s.back[1] + 6 + w * 8];
      const spine = [];
      for (let i = 0; i < 12; i++) {
        const k = i / 11;
        // Two counter-swaying wyrm bands rear up behind the back; sprint
        // stretches them out behind, the jump apex lets them trail below.
        const sway = Math.sin(t * 1.3 + w * Math.PI + k * 3.2) * (10 + 18 * k) * side + side * 30 * Math.sin(k * Math.PI * .8);
        const rise = pose.sprint ? 30 * k : 105 * k;
        const back = pose.sprint ? 130 * k : 26 + 30 * Math.sin(k * Math.PI);
        spine.push([base[0] - f * back + sway, base[1] - rise + (pose.airborne && pose.air < .2 ? 40 * k * k : 0)]);
      }
      band(ctx, spine, (i, nn) => 7.5 - (i / nn) * 3 + (i % 3 === 0 ? 1.5 : 0), mat, 4000 + w * 31, { t, alpha: pose.fade });
      // Scale fins along the body.
      for (let i = 2; i < 11; i += 3) {
        const [x, y] = spine[i]; const [nx, ny] = spine[i + 1];
        const ang = Math.atan2(ny - y, nx - x) + side * 1.2;
        plate(ctx, [[x, y], [x + Math.cos(ang) * 11, y + Math.sin(ang) * 11], [nx, ny]], mat, 4050 + w * 10 + i, { alpha: pose.fade });
      }
      // Lance-blade head at the top, looking forward.
      const head = spine[spine.length - 1]; const neck = spine[spine.length - 2];
      const dx = head[0] - neck[0]; const dy = head[1] - neck[1]; const len = Math.hypot(dx, dy) || 1;
      const ux = (dx / len) * .4 + f * .9; const uy = (dy / len) * .6 - .1; const ul = Math.hypot(ux, uy) || 1;
      const hx = ux / ul; const hy = uy / ul;
      const open = pose.charge > 0 ? 4 + 4 * pose.charge : 1;
      plate(ctx, [[head[0] - hy * 7, head[1] + hx * 7], [head[0] + hx * 30, head[1] + hy * 30], [head[0] + hy * 4, head[1] - hx * 4]], mat, 4100 + w, { alpha: pose.fade, core: 1 });
      plate(ctx, [[head[0] + hy * 2, head[1] - hx * 2], [head[0] + hx * 20 - hy * open, head[1] + hy * 20 + hx * open], [head[0] + hx * 6 - hy * 8, head[1] + hy * 6 + hx * 8]], mat, 4105 + w, { alpha: pose.fade });
      plate(ctx, [[head[0], head[1]], [head[0] - hx * 12 - hy * 14, head[1] - hy * 12 + hx * 14], [head[0] - hx * 4, head[1] - hy * 4]], mat, 4110 + w, { alpha: pose.fade });
      fallout(ctx, spine.slice(4), mat, t, 4120 + w, { count: 6, alpha: pose.fade });
    }
    for (let i = 0; i < 5; i++) { const a = t * .7 + i * TAU / 5; shard(ctx, s.chest[0] + Math.cos(a) * 44, s.chest[1] - 8 + Math.sin(a) * 24, 4, a, mat, 4300 + i, pose.fade * .8); }
  } else {
    // The lance projection at the front hand.
    const [hx, hy] = s.handF;
    plate(ctx, [[hx - f * 4, hy - 1.5], [hx + f * 34, hy - 2.5], [hx + f * 46, hy], [hx + f * 34, hy + 2.5], [hx - f * 4, hy + 1.5]], mat, 4200, { alpha: pose.fade, core: 1 });
    fallout(ctx, [[hx + f * 40, hy]], mat, t, 4210, { count: 4, alpha: pose.fade });
  }
}

const RENDERERS = { risswild, arkengestell, bands, fins, orbit, limbs, girdle, frame, jaws, puppets, arches, wyrm };
// Presence of the generic archetypes (the atlas asks for 2.2–4.5 × H large
// manifestations; anchored pieces stay closer to the body).
const ARCHETYPE_SCALE = { bands: 1.5, fins: 1.6, arches: 1.25, puppets: 1.45, jaws: 1.5, orbit: 1.45, frame: 1.4, girdle: 1.35, limbs: 1.3, arkengestell: 1.3, wyrm: 1.35, risswild: 1 };

// P0: a segmented material sigil on the ground under the feet.
function groundSigil(ctx, s, pose, mat, seed) {
  const t = pose.t; const segs = 12;
  for (let i = 0; i < segs; i++) {
    const a0 = i / segs * TAU + t * .3; const a1 = a0 + TAU / segs * .62;
    const P = (a, r) => [s.x + Math.cos(a) * r, s.y + 1 + Math.sin(a) * r * .28];
    plate(ctx, [P(a0, 30), P(a1, 30), P(a1, 37), P(a0, 37)], mat, seed + i, { alpha: pose.fade * .55, glowEdge: .6, pulse: .5 + .5 * Math.sin(t * 2 + i) });
  }
}

// Draws a form's manifestation on one layer.
export function renderManifestation(ctx, player, form, layer, renderY, fade = 1) {
  const draw = RENDERERS[form.archetype] ?? fins;
  const mat = form.mat ?? (form.mat = materialFor(form));
  const s = sockets(player, renderY);
  const pose = poseOf(player); pose.fade = fade;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (layer === 'back' && !pose.airborne) groundSigil(ctx, s, pose, mat, hashStr(form.id) + 7000);
  const k = ARCHETYPE_SCALE[form.archetype] ?? 1.3;
  // Scale around the chest so anchored pieces keep hugging the body.
  if (k !== 1) { ctx.translate(s.chest[0], s.chest[1]); ctx.scale(k, k); ctx.translate(-s.chest[0], -s.chest[1]); }
  draw(ctx, s, pose, mat, form, layer);
  ctx.restore();
}

// Contour veins: painted inside the sprite frame's own alpha (source-atop).
export function contourVeinPainter(form, t, sweep = null) {
  const mat = form.mat ?? (form.mat = materialFor(form));
  const seed = hashStr(form.id);
  return (mctx, w, h) => {
    const r = rng(seed);
    const scale = h / 88;
    mctx.globalCompositeOperation = 'source-atop';
    mctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const x0 = w * (.25 + r() * .5); const y0 = h * (.15 + r() * .7);
      const pulse = .4 + .6 * Math.max(0, Math.sin(t * 2.4 + i * 1.7));
      mctx.globalAlpha = .55 * pulse;
      mctx.strokeStyle = mat.kind === 'crystal' ? mat.edge : mat.vein;
      mctx.lineWidth = Math.max(1, 1.1 * scale);
      mctx.beginPath(); mctx.moveTo(x0, y0);
      let x = x0; let y = y0;
      for (let k = 0; k < 3; k++) { x += (r() - .5) * w * .22; y += (r() - .3) * h * .1; mctx.lineTo(x, y); }
      mctx.stroke();
      mctx.globalAlpha = .9 * pulse; mctx.fillStyle = mat.core;
      mctx.fillRect(x - scale, y - scale, 2 * scale, 2 * scale);
    }
    // Transform-in / -out: a band of light running over the real contour.
    if (sweep) {
      const yb = h * (1 - sweep.pos);
      mctx.globalCompositeOperation = 'source-atop';
      mctx.globalAlpha = .85 * sweep.alpha; mctx.fillStyle = mat.edge;
      mctx.fillRect(0, yb - h * .05, w, h * .05);
      mctx.globalAlpha = .5 * sweep.alpha; mctx.fillStyle = mat.core;
      mctx.fillRect(0, yb - h * .015, w, h * .015);
    }
    mctx.globalCompositeOperation = 'source-over';
  };
}
