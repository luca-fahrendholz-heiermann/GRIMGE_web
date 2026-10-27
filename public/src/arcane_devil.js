// GRIMGE Prototype — body powers as Arcane States (user, 23 Oct 2026: "baue alle Teufelskräfte ein als
// Arcane State" — the devil-fruit ideas adapted as own, NON-elemental body powers; they must differ from the
// element transformations). All four share one weakness: WATER drains them (standing in water / a puddle
// burns the remaining time three times as fast).
//   A05 DEHNLEIB    rubber body — melee reach ×1.6, blunt melee hits bounce off (×0.6, the attacker is
//                   shoved back), lightning does nothing; stretched fists, a fist hail, a catapult, a balloon.
//   A06 BEBEN       quake fists — every landed hit sends a tremor ahead that also topples scene objects;
//                   the air cracks like glass: quake punch, world rift, sky quake, quake dome.
//   A07 RAUM        room power — a dome around the Wizard (150 px): swap places, cut everything inside,
//                   shift foes up, shuffle, pull to the centre, a room ban that freezes and slices.
//   A08 SPRENGLEIB  blast body — landed hits set blast marks (up to 3) that pop after 2.5 s or on a full
//                   technique; blast finger, chain blasts, blast column, fireworks, blast ring, the big bang.
import { ARCANE_MOVES, ARCANE_CHARGE } from './arcane_moves.js';
import { SigSequence, SigBolt, foesOf, hit, DEPTH } from './signature_core.js';
import { listen } from './signature_runes.js';
import { plate, TAU, lerp, clamp01, ease, line, specks, groundRing, hashStr } from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';
import { applyStatuses } from './buff_techniques.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';
import { blob, px } from './scene_objects.js';
import { projectilesOf, projVel, projSetVel } from './signature_core.js';
import { bankaiStrike } from './bankai_arsenal.js';

export const DEVIL_FORMS = Object.freeze(['A05', 'A06', 'A07', 'A08']);
export const ROOM_RADIUS = 150;
const gy = (s) => groundYForDepth(s.z);
const fade = (k, inT = .1, outT = .3) => Math.max(0, Math.min(1, k / inT, (1 - k) / outT));
const ahead = (len, w = 28, back = 8) => (s) => (t, dx, dz) => dx * s.facing > -back && dx * s.facing < len && Math.abs(dz) < w;
const around = (r) => () => (t, dx, dz) => Math.hypot(dx, dz) < r;
const outward = (kx) => (t, dx) => Math.sign(dx || 1) * kx;
const seq = (f, p, o) => new SigSequence({ mat: f.mat, seed: hashStr(f.id) }, p, o);
const st = (s, list) => (t) => applyStatuses(t, list, s.caster, s.facing);
const shake = (n, d = .22) => combat.shakeCamera(n, d);
const near = (gw, team, x, z, r) => foesOf(gw, team).filter((t) => Math.hypot(t.x - x, ((t.z ?? z) - z) * DEPTH) < r);
// Scene objects in an area take a blow (boulders roll, trees fall, kegs blow up).
function toppleObjects(x, z, r, dir, dmg = 24, kx = 340) { for (const o of environment.props) if (o.isSceneObject && !o.isDead && Math.hypot(o.x - x, (o.z - z) * DEPTH) < r) o.takeDamage(dmg, (Math.sign(o.x - x) || dir) * kx, 0, 0, false, 'melee'); }

// ── painters (crisp, opaque) ─────────────────────────────────────────────
function rubberArm(ctx, x0, y0, x1, y1, m, a = 1, fist = 9) {
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
  ctx.strokeStyle = m.dark; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = m.body; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = m.facet; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0 - 1.5); ctx.lineTo(x1, y1 - 1.5); ctx.stroke();
  ctx.restore();
  blob(ctx, x1, y1, fist + 2, m.dark, .9); blob(ctx, x1, y1, fist, m.body, .9); blob(ctx, x1 - 3, y1 - 3, Math.max(2, fist * .35), m.facet, .9);
}
function cracks(ctx, x, y, r, seed, a, color = '#ffffff', n = 7) {
  for (let i = 0; i < n; i++) {
    const ang = i / n * TAU + seed * .37; const pts = [[x, y]]; let cx = x; let cy = y;
    for (let j = 1; j <= 4; j++) { const rr = r * j / 4; cx = x + Math.cos(ang + Math.sin(seed + i * 3 + j) * .35) * rr; cy = y + Math.sin(ang + Math.sin(seed + i * 5 + j) * .35) * rr; pts.push([cx, cy]); }
    line(ctx, pts, color, 2, a);
  }
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r * .45, 0, TAU); ctx.stroke(); ctx.restore();
}
// The room dome, drawn crisp (user, 27 Oct 2026, Arcane States round 3): a flat tinted shell, a pixel grid of
// meridians and rings with bright nodes at the crossings, a solid rim, and small cubes drifting inside.
function dome(ctx, x, y, R, m, a, t = 0) {
  if (a <= .01) return;
  const px = (qx, qy, sz, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(qx - sz / 2), Math.round(qy - sz / 2), sz, sz); };
  const cy = y - R * .25; const ry = R * .62;
  ctx.save(); ctx.globalAlpha = a * .14; ctx.fillStyle = m.body; ctx.beginPath(); ctx.ellipse(x, cy, R, ry, 0, Math.PI, TAU); ctx.lineTo(x + R, y); ctx.ellipse(x, y, R, R * .3, 0, 0, Math.PI); ctx.fill();
  ctx.globalAlpha = a;
  // Rim: the floor ellipse and the dome outline, 2-px dots.
  for (let i = 0; i < 360; i++) { const u = i / 360 * TAU; px(x + Math.cos(u) * R, y + Math.sin(u) * R * .3, 3, '#0e1a24'); px(x + Math.cos(u) * R, y + Math.sin(u) * R * .3, 2, m.edge); if (u >= Math.PI) { px(x + Math.cos(u) * R, cy + Math.sin(u) * ry, 3, '#0e1a24'); px(x + Math.cos(u) * R, cy + Math.sin(u) * ry, 2, m.edge); } }
  // Grid: meridians (x = u·R) and rings (heights), dotted; nodes where they cross.
  ctx.globalAlpha = a * .85;
  // Meridians: at x = u·R the dome surface rises to ry·sqrt(1 − u²) above the centre line.
  for (let i = -3; i <= 3; i++) { const u = i / 4; const top = ry * Math.sqrt(1 - u * u); for (let k = 0; k <= 40; k++) px(x + u * R, cy - top * k / 40, 2, m.edge); }
  for (let j = 1; j <= 3; j++) { const h = j / 4; const rr = R * Math.sqrt(1 - h * h); const yy = cy - h * ry * .9; for (let k = 0; k < 120; k++) { const u = k / 120 * TAU; px(x + Math.cos(u) * rr, yy + Math.sin(u) * R * .3 * (1 - h * .5), 2, m.edge); } }
  ctx.globalAlpha = a;
  // Nodes where the rings cross the meridians (a few pulse bright).
  for (let j = 1; j <= 3; j++) { const h = j / 4; const rr = R * Math.sqrt(1 - h * h); const yy = cy - h * ry * .9; for (let i = -3; i <= 3; i++) { const u = i / 4; if (Math.abs(u * R) > rr) continue; const pulse = (Math.floor(t * 4) + i + j) % 5 === 0; px(x + u * R, yy - Math.sqrt(Math.max(0, 1 - (u * R / rr) ** 2)) * R * .3 * (1 - h * .5), pulse ? 3 : 2, pulse ? (m.core ?? '#ffffff') : m.edge); } }
  // Small cubes drifting inside the room.
  for (let q = 0; q < 6; q++) { const u = (q * .37 + t * .05) % 1; const qx = x + (u - .5) * R * 1.4; const qy = y - 20 - ((q * 23 + t * 8) % (R * .45)); px(qx, qy, 4, m.edge); px(qx - 1, qy - 1, 2, m.core ?? '#ffffff'); }
  ctx.restore();
}
function boom(ctx, x, y, r, k, seed = 1) {
  const e = clamp01(k); const a = 1 - Math.max(0, e - .5) * 2;
  blob(ctx, x, y, Math.round(r * (.5 + e * .6)), '#5d4037', .85);
  for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU + seed; blob(ctx, x + Math.cos(ang) * r * .45 * e, y + Math.sin(ang) * r * .3 * e, Math.round(r * .35 * (1 - e * .4)), i % 2 ? '#ff6d00' : '#ffab00', .85); }
  if (e < .5) blob(ctx, x, y, Math.round(r * .32 * (1 - e)), '#fff8e1', .85);
  specks(ctx, Array.from({ length: 10 }, (_, i) => [x + Math.cos(i * 2.4 + seed) * r * e, y + Math.sin(i * 2.4 + seed) * r * .7 * e]), '#ffea00', a, 3);
}
export function explode(gw, s, x, z, r, dmg, { kx = 300, lift = 160, statuses = ['burn'] } = {}) {
  for (const t of near(gw, s.team, x, z, r)) { hit(t, dmg * (s.power ?? 1), Math.sign(t.x - x || s.facing) * kx, lift, .4); applyStatuses(t, statuses, s.caster, s.facing); }
  for (const o of environment.props) if (o.isSceneObject && !o.isDead && Math.hypot(o.x - x, (o.z - z) * DEPTH) < r) { o.feed('ignis', 10); o.takeDamage(dmg * .6, Math.sign(o.x - x || 1) * kx, 0, 0, false, 'spell'); }
  combat.spawnShockwave(x, groundYForDepth(z) - 20, r, '#ff6d00');
}

// ── techniques [forward short, forward full, up short, up full, down short, down full] ──
const SH = (f) => ({ x: 0, y: -50, f });
ARCANE_MOVES.A05 = [
  (f, p) => seq(f, p, { dur: .45, steps: [{ at: .05, fn: (s, gw) => s.strike(gw, ahead(240, 26)(s), 30, outward(360), 60, .4) }], draw: (ctx, s, k) => { const ext = k < .25 ? k / .25 : 1 - ease((k - .25) / .75); const y = gy(s) - 50; rubberArm(ctx, s.x + s.facing * 10, y, s.x + s.facing * (24 + 220 * ext), y, f.mat, fade(k, .02, .2)); } }),
  (f, p) => seq(f, p, { dur: 1.1, steps: [...Array.from({ length: 10 }, (_, i) => ({ at: .05 + i * .085, fn: (s, gw) => s.strike(gw, ahead(260, 32)(s), 6, outward(70), 15, .25, { again: true }) })), { at: 1, fn: (s, gw) => { s.strike(gw, ahead(260, 36)(s), 24, outward(400), 140, .5, { again: true }); shake(7); } }], draw: (ctx, s, k) => { const y = gy(s) - 50; for (let i = 0; i < 6; i++) { const ph = (k * 9 + i / 6) % 1; const ext = Math.sin(ph * Math.PI); rubberArm(ctx, s.x + s.facing * 8, y - 8 + i * 4, s.x + s.facing * (24 + 230 * ext), y - 22 + ((i * 37) % 44), f.mat, fade(k, .05, .15), 7); } } }),
  (f, p) => seq(f, p, { dur: .5, x: p.x + p.facing * 60, steps: [{ at: .1, fn: (s, gw) => s.strike(gw, around(46)(s), 30, () => 0, 620, .5) }], draw: (ctx, s, k) => { const e = Math.min(1, k / .3); rubberArm(ctx, s.caster.x + s.facing * 8, s.caster.y - 46, s.x, gy(s) - 20 - 120 * e, f.mat, fade(k, .02, .25)); } }),
  (f, p) => { p.grounded = false; p.vElevation = Math.max(p.vElevation ?? 0, 640); if ('kbVelX' in p) p.kbVelX = (p.facing || 1) * 220; return seq(f, p, { dur: .9, tick: (s) => { s.x = s.caster.x + s.facing * 40; s.z = s.caster.z; }, steps: [.12, .3, .5, .7].map((at, i) => ({ at, fn: (s, gw) => s.strike(gw, around(56)(s), i === 3 ? 26 : 10, outward(i === 3 ? 380 : 120), i === 3 ? 300 : 360, .35, { again: true }) })), draw: (ctx, s, k) => { const c = s.caster; for (const sg of [-1, 1]) rubberArm(ctx, c.x, c.y - 46, c.x + sg * 30 + s.facing * 20, c.y - 30 + Math.sin(k * 20 + sg) * 10, f.mat, fade(k), 7); line(ctx, [[c.x, c.y], [c.x - s.facing * 10, c.y + 60 * (1 - k)]], f.mat.facet, 4, fade(k) * .6); } }); },
  (f, p) => seq(f, p, { dur: .6, steps: [.1, .25, .4].map((at) => ({ at, fn: (s, gw) => s.strike(gw, around(115)(s), 10, outward(260), 80, .3, { again: true }) })), draw: (ctx, s, k) => { const y = gy(s) - 44; for (const sg of [0, Math.PI]) { const a = k * 24 + sg; rubberArm(ctx, s.x, y, s.x + Math.cos(a) * 100, y + Math.sin(a) * 26, f.mat, fade(k), 8); } } }),
  (f, p) => seq(f, p, { dur: 1.2, tick: (s, dt, gw) => { s.x = s.caster.x; s.z = s.caster.z; for (const pr of projectilesOf(gw)) { if (pr.team === s.team || Math.abs(pr.x - s.x) > 60 || Math.abs(((pr.z ?? s.z) - s.z) * DEPTH) > 40) continue; const [vx, vz] = projVel(pr); if (Math.sign(vx) === Math.sign(s.x - pr.x)) projSetVel(pr, -vx, -vz); } }, steps: [{ at: .1, fn: (s, gw) => s.strike(gw, around(90)(s), 18, outward(480), 160, .4) }, { at: .7, fn: (s, gw) => { s.strike(gw, around(110)(s), 22, outward(520), 200, .5, { again: true }); shake(8); } }], draw: (ctx, s, k) => { const c = s.caster; const r = 26 + 22 * Math.sin(Math.min(1, k * 3) * Math.PI / 2) - (k > .85 ? (k - .85) * 120 : 0); blob(ctx, c.x, c.y - 40, Math.round(r + 2), f.mat.dark, .95); blob(ctx, c.x, c.y - 40, Math.round(r), f.mat.body, .95); blob(ctx, c.x - r * .35, c.y - 40 - r * .35, Math.round(r * .25), f.mat.facet, .95); } })
];
ARCANE_MOVES.A06 = [
  (f, p) => seq(f, p, { dur: .5, steps: [{ at: .06, fn: (s, gw) => { s.strike(gw, ahead(190, 42)(s), 32, outward(460), 90, .45); toppleObjects(s.x + s.facing * 100, s.z, 110, s.facing); shake(7); } }], draw: (ctx, s, k) => { const y = gy(s) - 50; cracks(ctx, s.x + s.facing * 40, y, 30 + 40 * Math.min(1, k * 4), 3, fade(k, .02, .4)); for (let i = 0; i < 3; i++) groundRing(ctx, s.x + s.facing * (60 + i * 50 * k), gy(s), 16 + i * 10, f.mat, 0, fade(k) * (1 - i * .25), 8, 9000 + i, 2); } }),
  (f, p) => seq(f, p, { dur: .9, steps: Array.from({ length: 6 }, (_, i) => ({ at: .08 + i * .09, fn: (s, gw) => { const fx = 40 + i * 60; s.strike(gw, (t, dx, dz) => Math.abs(dx * s.facing - fx) < 34 && Math.abs(dz) < 34, i === 5 ? 34 : 12, () => s.facing * (i === 5 ? 400 : 160), i === 5 ? 220 : 60, .4, { again: true }); toppleObjects(s.x + s.facing * fx, s.z, 50, s.facing); if (i % 2 === 0) environment.add('crack', s.x + s.facing * fx, s.z, { radius: 30 }); if (i === 5) shake(10); } })), draw: (ctx, s, k) => { const y = gy(s); const len = 40 + 300 * clamp01((s.t - .08) / .5); line(ctx, Array.from({ length: 12 }, (_, i) => [s.x + s.facing * len * i / 11, y + (i % 2 ? 4 : -3)]), '#ffffff', 3, fade(k)); cracks(ctx, s.x + s.facing * len, y - 20, 24, 7, fade(k), f.mat.body, 6); } }),
  (f, p) => seq(f, p, { dur: .5, x: p.x + p.facing * 60, steps: [{ at: .08, fn: (s, gw) => s.strike(gw, around(46)(s), 30, () => 0, 620, .5) }], draw: (ctx, s, k) => { const y = gy(s); const h = 150 * Math.min(1, k * 4); line(ctx, Array.from({ length: 9 }, (_, i) => [s.x + (i % 2 ? 5 : -5), y - h * i / 8]), '#ffffff', 3, fade(k)); cracks(ctx, s.x, y - h, 20, 11, fade(k), f.mat.body, 6); } }),
  (f, p) => seq(f, p, { dur: 1, x: p.x + p.facing * 70, steps: [...Array.from({ length: 5 }, (_, i) => ({ at: .1 + i * .15, fn: (s, gw) => s.strike(gw, around(60)(s), 9, () => 0, 300, .3, { again: true }) })), { at: .9, fn: (s, gw) => { s.strike(gw, around(66)(s), 26, outward(300), 520, .5, { again: true }); shake(6); } }], draw: (ctx, s, k) => { const y = gy(s) - 70; for (let i = 0; i < 4; i++) { const ph = (k * 4 + i / 4) % 1; cracks(ctx, s.x + Math.sin(i * 2.3) * 20, y - i * 20, 14 + ph * 26, i * 3, fade(k) * (1 - ph * .5), i % 2 ? '#ffffff' : f.mat.body, 5); } } }),
  (f, p) => seq(f, p, { dur: .6, steps: [{ at: .1, fn: (s, gw) => { s.strike(gw, around(140)(s), 22, outward(260), 120, .5, { onHit: st(s, ['stun']) }); toppleObjects(s.x, s.z, 160, s.facing, 26, 360); environment.add('crack', s.x, s.z, { radius: 90 }); shake(10, .3); } }], draw: (ctx, s, k) => { const y = gy(s); for (let r = 0; r < 3; r++) groundRing(ctx, s.x, y, 30 + (k + r / 3) % 1 * 130, f.mat, 0, fade(k) * (1 - ((k + r / 3) % 1)), 14, 9100 + r * 14, 3); cracks(ctx, s.x, y - 4, 70 * Math.min(1, k * 3), 5, fade(k), '#ffffff', 9); } }),
  (f, p) => seq(f, p, { dur: 1.1, steps: [{ at: .55, fn: (s, gw) => { s.strike(gw, around(180)(s), 60, outward(520), 260, .6); toppleObjects(s.x, s.z, 200, s.facing, 40, 420); shake(14, .35); combat.triggerHitstop?.(6); } }], draw: (ctx, s, k) => { const y = gy(s) - 40; const close = Math.min(1, s.t / .55); if (s.t < .55) { ctx.save(); ctx.globalAlpha = .5 * close; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x, y, 180 * (1.2 - close * .2), 110 * (1.2 - close * .2), 0, 0, TAU); ctx.stroke(); ctx.restore(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; cracks(ctx, s.x + Math.cos(a) * 150 * (1.1 - close * .3), y + Math.sin(a) * 80, 16 * close, i, close, '#ffffff', 4); } } else { const q = (s.t - .55) / .55; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; plate(ctx, [[s.x + Math.cos(a) * (40 + q * 160), y + Math.sin(a) * (30 + q * 90)], [s.x + Math.cos(a + .2) * (60 + q * 170), y + Math.sin(a + .2) * (40 + q * 95)], [s.x + Math.cos(a + .1) * (30 + q * 150), y + Math.sin(a + .1) * (50 + q * 80)]], { kind: 'crystal', dark: '#9e9e9e', body: '#ffffff', facet: '#e0f2f1', vein: '#80cbc4', edge: '#ffffff', spark: '#ffffff', core: '#ffffff', glow: 'rgba(255,255,255,', edgeGlow: 'rgba(255,255,255,' }, 9200 + i, { alpha: 1 - q, glowEdge: .6 }); } } } })
];
const inRoom = (s, gw, r = ROOM_RADIUS) => near(gw, s.team, s.caster.x, s.caster.z, r);
ARCANE_MOVES.A07 = [
  (f, p) => seq(f, p, { dur: .5, data: { from: null, to: null }, steps: [{ at: .05, fn: (s, gw) => { const t = foesOf(gw, s.team).filter((o) => (o.x - s.caster.x) * s.facing > 0 && Math.hypot(o.x - s.caster.x, (o.z - s.caster.z) * DEPTH) < 280).sort((a, b) => Math.abs(a.x - s.caster.x) - Math.abs(b.x - s.caster.x))[0]; if (!t) return; const c = s.caster; s.from = { x: c.x, z: c.z }; s.to = { x: t.x, z: t.z }; [c.x, t.x] = [t.x, c.x]; [c.z, t.z] = [t.z, c.z]; gw.battlefield?.placeOnSurface?.(c); c.facing = -c.facing; hit(t, 18 * (s.power ?? 1), Math.sign(t.x - c.x || 1) * 160, 40, .4); } }], draw: (ctx, s, k) => { if (!s.from) return; const a = fade(k, .02, .4); for (const pt of [s.from, s.to]) { const y = groundYForDepth(pt.z) - 40; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = f.mat.edge; ctx.lineWidth = 2; ctx.strokeRect(Math.round(pt.x - 14), Math.round(y - 24), 28, 48); ctx.restore(); } line(ctx, [[s.from.x, groundYForDepth(s.from.z) - 40], [s.to.x, groundYForDepth(s.to.z) - 40]], f.mat.body, 2, a); } }),
  (f, p) => seq(f, p, { dur: .7, steps: [{ at: .3, fn: (s, gw) => { for (const t of inRoom(s, gw)) { hit(t, 40 * (s.power ?? 1), Math.sign(t.x - s.caster.x || 1) * 200, 80, .5); if (t.isGuarding) t.isGuarding = false; } shake(8); } }], draw: (ctx, s, k) => { const c = s.caster; const y = c.y - 40; dome(ctx, c.x, c.y, ROOM_RADIUS, f.mat, fade(k), s.t); if (s.t > .25) { const q = clamp01((s.t - .25) / .2); line(ctx, [[c.x - ROOM_RADIUS * q, y + 50 * q], [c.x + ROOM_RADIUS * q, y - 50 * q]], '#ffffff', 4, fade(k)); line(ctx, [[c.x - ROOM_RADIUS * q, y + 50 * q], [c.x + ROOM_RADIUS * q, y - 50 * q]], f.mat.body, 2, fade(k)); } } }),
  (f, p) => seq(f, p, { dur: .5, steps: [{ at: .1, fn: (s, gw) => { for (const t of inRoom(s, gw)) hit(t, 16 * (s.power ?? 1), 0, 650, .5); } }], draw: (ctx, s, k) => { dome(ctx, s.caster.x, s.caster.y, ROOM_RADIUS, f.mat, fade(k), s.t); for (let i = 0; i < 6; i++) { const x = s.caster.x + (i - 2.5) * 40; const y = s.caster.y - 20 - 120 * Math.min(1, k * 2.5); ctx.save(); ctx.globalAlpha = fade(k); ctx.strokeStyle = f.mat.edge; ctx.strokeRect(Math.round(x - 6), Math.round(y - 6), 12, 12); ctx.restore(); } } }),
  (f, p) => seq(f, p, { dur: 1, steps: [.15, .45, .75].map((at) => ({ at, fn: (s, gw) => { const list = [...inRoom(s, gw), ...environment.props.filter((o) => o.throwable && !o.isDead && !o.carriedBy && Math.hypot(o.x - s.caster.x, (o.z - s.caster.z) * DEPTH) < ROOM_RADIUS)]; const spots = list.map((o) => ({ x: o.x, z: o.z })); for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; } list.forEach((o, i) => { o.x = spots[(i + 1) % spots.length].x; o.z = spots[(i + 1) % spots.length].z; if (!o.isSceneObject) { hit(o, 14 * (s.power ?? 1), 0, 120, .45); } }); } })), draw: (ctx, s, k) => { dome(ctx, s.caster.x, s.caster.y, ROOM_RADIUS, f.mat, fade(k), s.t * 4); } }),
  (f, p) => seq(f, p, { dur: .6, steps: [{ at: .12, fn: (s, gw) => { const c = s.caster; for (const t of inRoom(s, gw)) { t.x += (c.x + s.facing * 30 - t.x) * .7; t.z += (c.z - t.z) * .7; hit(t, 10 * (s.power ?? 1), 0, 40, .4); } for (const o of environment.props) if (o.throwable && !o.isDead && !o.carriedBy && Math.hypot(o.x - c.x, (o.z - c.z) * DEPTH) < ROOM_RADIUS) { o.x += (c.x + s.facing * 50 - o.x) * .7; o.z += (c.z - o.z) * .7; } } }], draw: (ctx, s, k) => { const c = s.caster; dome(ctx, c.x, c.y, ROOM_RADIUS * (1 - Math.min(.5, k)), f.mat, fade(k), s.t); } }),
  (f, p) => seq(f, p, { dur: 1.3, steps: [{ at: .2, fn: (s, gw) => { for (const t of inRoom(s, gw, 240)) t.freeze ? t.freeze(1.1) : (t.slowTimer = 1.1, t.slowFactor = .05); } }, { at: 1.05, fn: (s, gw) => { for (const t of inRoom(s, gw, 240)) { hit(t, 60 * (s.power ?? 1), Math.sign(t.x - s.caster.x || 1) * 320, 200, .6); applyStatuses(t, ['stun'], s.caster, s.facing); } shake(12, .3); } }], draw: (ctx, s, k) => { const c = s.caster; dome(ctx, c.x, c.y, lerp(ROOM_RADIUS, 240, Math.min(1, k * 4)), f.mat, fade(k, .05, .15), s.t); if (s.t > 1) { const q = (s.t - 1) / .3; for (let i = 0; i < 4; i++) { const a = i * .8 - 1.2; line(ctx, [[c.x - Math.cos(a) * 230, c.y - 40 - Math.sin(a) * 130], [c.x + Math.cos(a) * 230, c.y - 40 + Math.sin(a) * 130]], '#ffffff', 3, 1 - q); } } } })
];
const blastSeq = (f, p, o) => seq(f, p, o);
ARCANE_MOVES.A08 = [
  (f, p) => blastSeq(f, p, { dur: .2, steps: [{ at: .02, fn: (s) => s.system?.addSpell(new SigBolt({ x: s.caster.x + s.facing * 20, z: s.caster.z, height: (s.caster.worldHeight ?? 0) + 44, team: s.team, mat: f.mat, vx: s.facing * 620, damage: 14, size: 6, life: .7, kind: 'crystal', seed: 9300, onBurst: (b) => explode(window.gameWorld, s, b.x, b.z, 64, 26) }), 'B') }], draw: () => {} }),
  (f, p) => blastSeq(f, p, { dur: 1, steps: Array.from({ length: 6 }, (_, i) => ({ at: .08 + i * .1, fn: (s, gw) => { explode(gw, s, s.x + s.facing * (50 + i * 50), s.z, i === 5 ? 80 : 46, i === 5 ? 34 : 14, { kx: i === 5 ? 420 : 160 }); if (i === 5) shake(9); } })), draw: (ctx, s, k) => { for (let i = 0; i < 6; i++) { const at = .08 + i * .1; if (s.t < at) continue; boom(ctx, s.x + s.facing * (50 + i * 50), gy(s) - 26, i === 5 ? 46 : 30, (s.t - at) / .35, i); } } }),
  (f, p) => blastSeq(f, p, { dur: .6, x: p.x + p.facing * 60, steps: [.06, .14, .22].map((at, i) => ({ at, fn: (s, gw) => explode(gw, s, s.x, s.z, 50, i === 2 ? 20 : 8, { kx: 0, lift: 620 }) })), draw: (ctx, s, k) => { for (let i = 0; i < 3; i++) { const at = .06 + i * .08; if (s.t >= at) boom(ctx, s.x, gy(s) - 20 - i * 40, 26, (s.t - at) / .3, i); } } }),
  (f, p) => blastSeq(f, p, { dur: 1.2, x: p.x + p.facing * 80, steps: [...Array.from({ length: 5 }, (_, i) => ({ at: .1 + i * .17, fn: (s, gw) => explode(gw, s, s.x + Math.sin(i * 2.3) * 20, s.z, 60, 9, { kx: 0, lift: 320 }) })), { at: 1.05, fn: (s, gw) => { explode(gw, s, s.x, s.z, 70, 28, { kx: 300, lift: 520 }); shake(7); } }], draw: (ctx, s, k) => { for (let i = 0; i < 6; i++) { const at = i < 5 ? .1 + i * .17 : 1.05; if (s.t >= at && s.t < at + .35) boom(ctx, s.x + Math.sin(i * 2.3) * 20, gy(s) - 80 - (i % 3) * 22, i < 5 ? 24 : 40, (s.t - at) / .35, i); } } }),
  (f, p) => blastSeq(f, p, { dur: .6, steps: [{ at: .08, fn: (s, gw) => { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; explode(gw, s, s.x + Math.cos(a) * 80, s.z + Math.sin(a) * 80 / DEPTH * .6, 40, 18, { kx: 300, lift: 120 }); } shake(8); } }], draw: (ctx, s, k) => { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; boom(ctx, s.x + Math.cos(a) * 80, gy(s) + Math.sin(a) * 26 - 16, 26, k * 1.6, i); } } }),
  (f, p) => blastSeq(f, p, { dur: 1, steps: [{ at: .4, fn: (s, gw) => { explode(gw, s, s.x, s.z, 170, 70, { kx: 520, lift: 280 }); detonateMarks(s.caster, gw); environment.add('scorch', s.x, s.z, { radius: 110, team: s.team }); shake(14, .35); combat.triggerHitstop?.(6); } }], draw: (ctx, s, k) => { const c = s.caster; if (s.t < .4) { const q = s.t / .4; specks(ctx, Array.from({ length: 16 }, (_, i) => [c.x + Math.cos(i * 2.4 + s.t * 9) * 60 * (1 - q), c.y - 40 + Math.sin(i * 2.4 + s.t * 9) * 40 * (1 - q)]), '#ffea00', 1, 3); blob(ctx, c.x, c.y - 40, Math.round(8 + q * 14), '#fff8e1', .9); } else boom(ctx, c.x, gy(s) - 40, 120, (s.t - .4) / .6, 7); } })
];

// ── charge rituals (dir-aware) ─────────────────────────────────────────────
const chargeAt = (s, dir) => (dir === 'up' ? [s.x + s.f * 10, s.y - 96] : dir === 'down' ? [s.x + s.f * 10, s.y - 4] : [s.x + s.f * 34, s.y - 50]);
ARCANE_CHARGE.A05 = (ctx, s, mat, dir, k) => { const [x, y] = chargeAt(s, dir); rubberArm(ctx, s.x, s.y - 50, x - s.f * 40 * k, y + (dir === 'down' ? -20 : 0), mat, 1, 8 + k * 4); };
ARCANE_CHARGE.A06 = (ctx, s, mat, dir, k, t) => { const [x, y] = chargeAt(s, dir); cracks(ctx, x, y, 10 + 30 * k, t, .9, '#ffffff', 4 + Math.floor(k * 6)); };
ARCANE_CHARGE.A07 = (ctx, s, mat, dir, k, t) => { dome(ctx, s.x, s.y, 40 + ROOM_RADIUS * k * .8, mat, .9, t); };
ARCANE_CHARGE.A08 = (ctx, s, mat, dir, k, t) => { const [x, y] = chargeAt(s, dir); specks(ctx, Array.from({ length: 6 + Math.floor(k * 12) }, (_, i) => [x + Math.cos(i * 2.4 + t * 8) * 26 * (1 - k * .6), y + Math.sin(i * 2.4 + t * 8) * 18 * (1 - k * .6)]), '#ffea00', 1, 3); blob(ctx, x, y, Math.round(3 + k * 7), '#ff6d00', .9); };

// ── formations (renderers) ─────────────────────────────────────────────────
const strikeOf = (pose) => bankaiStrike(pose.player) ?? 0;
registerFormRenderer('A05', (ctx, s, pose, mat, form, layer) => {
  if (layer !== 'front' || pose.fade <= .01) return;
  const f = s.f; const [cx, cy] = s.chest; const k = strikeOf(pose);
  // Stretched punch in the beat of the swing; idle: glossy bands spring on the body.
  if (k > .02) rubberArm(ctx, cx + f * 6, cy - 2, cx + f * (16 + 96 * k), cy - 4, mat, pose.fade, 8);
  ctx.save(); ctx.globalAlpha = .7 * pose.fade; ctx.strokeStyle = mat.facet; ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) { const w = 10 + Math.sin(pose.t * 6 + i) * 2; ctx.beginPath(); ctx.arc(cx - f * 2, cy + 6 + i * 16, w, -2.4, -.6); ctx.stroke(); }
  ctx.restore();
});
registerFormRenderer('A06', (ctx, s, pose, mat, form, layer) => {
  if (layer !== 'front' || pose.fade <= .01) return;
  const f = s.f; const [cx, cy] = s.chest; const k = strikeOf(pose);
  cracks(ctx, cx + f * 14, cy + 2, 12 + Math.sin(pose.t * 9) * 2, Math.floor(pose.t * 3), .8 * pose.fade, '#ffffff', 5);
  cracks(ctx, cx - f * 12, cy + 4, 9, Math.floor(pose.t * 3) + 5, .6 * pose.fade, mat.body, 4);
  if (k > .05) cracks(ctx, cx + f * (30 + 40 * k), cy - 2, 18 + 26 * k, 9, pose.fade * k, '#ffffff', 8);
});
registerFormRenderer('A07', (ctx, s, pose, mat, form, layer) => {
  if (layer !== 'back' || pose.fade <= .01) return;
  dome(ctx, s.x, s.y, ROOM_RADIUS * (.4 + .6 * pose.fade), mat, pose.fade * .9, pose.t);
});
registerFormRenderer('A08', (ctx, s, pose, mat, form, layer) => {
  if (layer !== 'front' || pose.fade <= .01) return;
  const f = s.f; const [cx, cy] = s.chest; const t = pose.t;
  for (const hx of [cx + f * 14, cx - f * 10]) { for (let i = 0; i < 3; i++) { const ph = (t * 1.4 + i / 3) % 1; ctx.save(); ctx.globalAlpha = (1 - ph) * .7 * pose.fade; blob(ctx, hx + Math.sin(i * 2 + t) * 3, cy + 6 - ph * 26, Math.round(3 + ph * 4), '#757575', .9); ctx.restore(); } specks(ctx, [[hx + Math.sin(t * 13) * 5, cy + 8], [hx - Math.cos(t * 11) * 5, cy + 2]], '#ffea00', pose.fade, 2); }
  // Blast marks above the foes this Wizard has marked.
  for (const m of window.gameWorld?.minions ?? []) drawMarks(ctx, m, pose.player);
  const ec = window.gameWorld?.enemyChampion; if (ec && ec !== pose.player) drawMarks(ctx, ec, pose.player);
});
function drawMarks(ctx, t, by) {
  const mk = t?._blastMarks; if (!mk || mk.by !== by || t.isDead || mk.n <= 0) return;
  const x = Math.round(t.x); const y = Math.round((t.y ?? 0) - 70);
  for (let i = 0; i < mk.n; i++) { const blink = mk.t < .6 && Math.floor(mk.t * 12) % 2; blob(ctx, x - (mk.n - 1) * 5 + i * 10, y, 4, blink ? '#ffffff' : '#ff6d00', 1); px(ctx, x - (mk.n - 1) * 5 + i * 10 - 1, y - 7, 2, 3, '#ffea00'); }
}

// ── passives: water weakness, tremors, blast marks ─────────────────────────
function detonateMarks(p, gw) {
  for (const t of [...(gw?.minions ?? []), gw?.enemyChampion, gw?.player]) {
    const mk = t?._blastMarks; if (!mk || mk.by !== p || mk.n <= 0 || t.isDead) continue;
    const n = mk.n; t._blastMarks = null;
    const s = { team: p.team, caster: p, facing: p.facing || 1, power: 1 };
    explode(gw, s, t.x, t.z ?? p.z, 50, 12 * n, { kx: 260, lift: 140 });
    environment.addSceneFx?.({ x: t.x, z: t.z ?? p.z, t: 0, isFinished: false, get y() { return groundYForDepth(this.z); }, update(dt) { this.t += dt; if (this.t > .4) this.isFinished = true; }, render(ctx) { boom(ctx, this.x, this.y - 40, 30 + n * 8, this.t / .4, n); } });
  }
}
const listeners = new WeakMap();
export function devilTick(p, dt, form) {
  const b = p.buffForm; if (!b || !DEVIL_FORMS.includes(form?.id)) return;
  // Water weakness: standing in water burns the state three times as fast.
  const wet = p._inWater || environment.effects?.some?.((e) => e.type === 'water' && e.contains(p.x, p.z ?? .5)) || environment.terrain?.some?.((z) => z.rules?.douses && !environment.isFrozen?.(z) && z.contains(p.x, p.z ?? .5));
  if (wet && (p.elevation ?? 0) < 10 && (p.surfaceHeight ?? 0) < 10) {
    b.timer = Math.max(0, b.timer - dt * 2);
    if ((b.wetNote = (b.wetNote ?? 0) - dt) <= 0) { b.wetNote = 2; combat.spawnDamageText(p.x, p.y - 110, 'WASSER SCHWÄCHT', { color: '#4fc3f7' }); }
  }
  // Event listener (melee hits) for Beben / Sprengleib.
  let l = listeners.get(p);
  if (!l || l.isFinished) {
    l = { owner: p, isFinished: false, onSigEvent(type, info, gw) {
      if (type !== 'hit' || !p.buffForm || p.buffForm.timer <= 0) { if (!p.buffForm || p.buffForm.timer <= 0) this.isFinished = true; return; }
      const id = p.buffForm.id; const hits = (info.hits ?? []).filter((h) => !h.blocked && !h.target?.isProp);
      if (id === 'A06' && hits.length) {
        // Tremor: a small quake runs ahead of the hit and topples scene objects.
        const f = p.facing || 1; const x = p.x + f * 70;
        for (const t of near(gw, p.team, x, p.z, 50)) if (!hits.some((h) => h.target === t)) hit(t, 6, f * 160, 60, .2);
        toppleObjects(x, p.z, 60, f, 14, 320); combat.spawnShockwave(x, (p.y ?? 0) - 6, 28, '#e0f2f1');
      }
      if (id === 'A08') for (const h of hits) { const t = h.target; const mk = t._blastMarks?.by === p ? t._blastMarks : (t._blastMarks = { by: p, n: 0, t: 2.5 }); mk.n = Math.min(3, mk.n + 1); mk.t = 2.5; }
    } };
    listeners.set(p, listen(l));
  }
  // Blast marks pop after their time.
  if (form.id === 'A08') {
    const gw = window.gameWorld;
    for (const t of [...(gw?.minions ?? []), gw?.enemyChampion]) { const mk = t?._blastMarks; if (!mk || mk.by !== p) continue; mk.t -= dt; if (mk.t <= 0) { const one = { ...mk }; t._blastMarks = { ...one }; detonateMarksOf(t, p, gw); } }
  }
}
function detonateMarksOf(t, p, gw) { const mk = t._blastMarks; if (!mk) return; const n = mk.n; t._blastMarks = null; if (t.isDead || n <= 0) return; explode(gw, { team: p.team, caster: p, facing: p.facing || 1, power: 1 }, t.x, t.z ?? p.z, 50, 12 * n, { kx: 260, lift: 140 }); }
export { detonateMarks, rubberArm, cracks, dome, boom };
void SH; void ROOM_RADIUS;
