// GRIMGE Prototype — Bankai arsenals (user, 23 Oct 2026: "bankai ändert eigentlich nur die
// Farbe … eigentlich sollte sich das gesamte Aussehen und die Attacken an die Waffe anpassen").
//
// Bankai (A04) stays ONE rune, but the held weapon decides the whole unleashed form:
//   swarm     sword families (Bladedancer, Ronin, Conjured) — the blade-petal swarm (buff_v32_bloom.js)
//   colossus  great axe / hammer — one titanic weapon over the shoulder: cleaves, fissures, meteor fall
//   lances    spear / glaive — a crown of spears: thrusts, spear storm, spear forest, sky spear
//   bulwark   sword / mace & shield — four orbiting tower shields: ram, phalanx, cage, bastion
//   crescent  scythes — a moon scythe behind the back: crescent waves, moon wheel, harvest
//   shadow    daggers / throwing blades / claws — wings of blades: fans, homing hail, convergence
//   archer    bow / crossbow — a star bow over the head: triple shot, star arrow beam, arrow rain
//   fists     gauntlets / quarterstaff — two giant fists at the shoulders: punches, comet, sky fist
//   swordring rune / spirit blades — a halo of greatswords: throws, cascade, execution sword
//   sigils    staffs / orbs / rods / scepters — rune circles: sigil beams, columns, judgement
//   deck      cards / chakrams / talismans / instruments — a wheel of thrown pieces
// Every arsenal has its own formation (idle, attack lean, guard wall) and six techniques
// (forward / up / down × short / full). Hits leave the class wound (bankai.js status).
import { SigSequence, SigBolt, foesOf, DEPTH } from './signature_core.js';
import { plate, TAU, lerp, clamp01, ease, techOf, line, groundRing, specks, hashStr } from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';
import { bankaiStyleOf } from './bankai.js';
import { applyStatuses } from './buff_techniques.js';
import { klingenbluete, petal } from './buff_v32_bloom.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';

const snap = Math.round;
const mir = (a, f) => (f > 0 ? a : Math.PI - a);
const fade = (k, inT = .1, outT = .3) => Math.max(0, Math.min(1, k / inT, (1 - k) / outT));
const gy = (s) => groundYForDepth(s.z);
const frameOf = (x, y, ang) => { const c = Math.cos(ang); const s = Math.sin(ang); return (u, v) => [x + c * u - s * v, y + s * u + c * v]; };
const haftCache = new Map();
const haft = (m) => { let h = haftCache.get(m); if (!h) { h = { ...m, body: m.dark, facet: m.vein, edge: m.vein }; haftCache.set(m, h); } return h; };
const bar = (ctx, P, u0, u1, w, mat, seed, a) => plate(ctx, [P(u0, -w), P(u1, -w), P(u1, w), P(u0, w)], mat, seed, { alpha: a, glowEdge: .3 });

// ── Item painters: (ctx, x, y, angle the tip points to, size L, material, alpha, seed, weapon id) ──
export const ITEMS = {
  axe(ctx, x, y, ang, L, m, a, seed, wid) {
    const P = frameOf(x, y, ang); bar(ctx, P, -L, L * .95, Math.max(1.5, L * .06), haft(m), seed, a);
    if (wid === 'great_hammer') plate(ctx, [P(L * .55, -L * .34), P(L * 1.02, -L * .34), P(L * 1.02, L * .34), P(L * .55, L * .34)], m, seed + 1, { alpha: a, lit: .8, glowEdge: .6 });
    else plate(ctx, [P(L * .5, L * .05), P(L * .38, L * .55), P(L * .72, L * .7), P(L * 1.04, L * .42), P(L * .98, L * .05)], m, seed + 1, { alpha: a, lit: .8, glowEdge: .8 });
  },
  spear(ctx, x, y, ang, L, m, a, seed, wid) {
    const P = frameOf(x, y, ang); bar(ctx, P, -L, L * .6, Math.max(1, L * .045), haft(m), seed, a);
    if (/glaive/.test(wid ?? '')) plate(ctx, [P(L * 1.32, -L * .04), P(L * .98, L * .22), P(L * .58, L * .09), P(L * .6, -L * .08)], m, seed + 1, { alpha: a, glowEdge: .9 });
    else plate(ctx, [P(L * 1.3, 0), P(L * .86, L * .14), P(L * .58, 0), P(L * .86, -L * .14)], m, seed + 1, { alpha: a, glowEdge: .9 });
    bar(ctx, P, L * .54, L * .6, L * .16, m, seed + 2, a);
  },
  shield(ctx, x, y, ang, L, m, a, seed) {
    const P = frameOf(x, y, ang);
    plate(ctx, [P(-L * .55, -L * .7), P(L * .55, -L * .7), P(L * .58, L * .15), P(0, L * .82), P(-L * .58, L * .15)], m, seed, { alpha: a, lit: .9, glowEdge: .7 });
    plate(ctx, [P(-L * .17, -L * .2), P(L * .17, -L * .2), P(L * .17, L * .14), P(-L * .17, L * .14)], { ...m, body: m.edge }, seed + 1, { alpha: a, core: 1 });
  },
  scythe(ctx, x, y, ang, L, m, a, seed) {
    const P = frameOf(x, y, ang); bar(ctx, P, -L, L, Math.max(1.5, L * .05), haft(m), seed, a);
    plate(ctx, [P(L * 1.02, -L * .06), P(L * .92, L * .52), P(L * .25, L * .82), P(L * .62, L * .47), P(L * .84, L * .13)], m, seed + 1, { alpha: a, glowEdge: 1 });
  },
  crescent(ctx, x, y, ang, L, m, a, seed) {
    const P = frameOf(x, y, ang); const pts = [];
    for (let i = 0; i <= 6; i++) { const q = -1.3 + i * 2.6 / 6; pts.push(P(Math.cos(q) * L, Math.sin(q) * L)); }
    for (let i = 6; i >= 0; i--) { const q = -1.3 + i * 2.6 / 6; pts.push(P(Math.cos(q) * L * .6 + L * .1, Math.sin(q) * L * .74)); }
    plate(ctx, pts, m, seed, { alpha: a, glowEdge: 1, core: .6 });
  },
  blade(ctx, x, y, ang, L, m, a, seed) {
    const P = frameOf(x, y, ang);
    plate(ctx, [P(L, 0), P(-L * .15, L * .2), P(-L * .45, 0), P(-L * .15, -L * .2)], m, seed, { alpha: a, glowEdge: .9 });
    bar(ctx, P, -L * .8, -L * .5, L * .09, haft(m), seed + 1, a);
  },
  claw(ctx, x, y, ang, L, m, a, seed) {
    const P = frameOf(x, y, ang);
    for (const k of [-1, 0, 1]) plate(ctx, [P(L * 1.1, k * L * .3 - L * .06), P(-L * .2, k * L * .32 + L * .12), P(-L * .55, k * L * .32), P(-L * .2, k * L * .32 - L * .1)], m, seed + k, { alpha: a, glowEdge: .9 });
  },
  arrow(ctx, x, y, ang, L, m, a, seed) {
    const P = frameOf(x, y, ang); bar(ctx, P, -L, L * .7, Math.max(1, L * .045), haft(m), seed, a);
    plate(ctx, [P(L * 1.08, 0), P(L * .66, L * .17), P(L * .66, -L * .17)], m, seed + 1, { alpha: a, glowEdge: 1, core: .6 });
    plate(ctx, [P(-L * .7, 0), P(-L * 1.05, L * .22), P(-L, 0), P(-L * 1.05, -L * .22)], m, seed + 2, { alpha: a, glowEdge: .5 });
  },
  bow(ctx, x, y, ang, L, m, a, seed) {
    const P = frameOf(x, y, ang); const pts = [];
    for (let i = 0; i <= 8; i++) { const v = -L + i * 2 * L / 8; pts.push(P(L * .32 * (1 - (v / L) ** 2), v)); }
    for (let i = 0; i < 8; i++) { const [x0, y0] = pts[i]; const [x1, y1] = pts[i + 1]; const nx = (y1 - y0) * .12; const ny = -(x1 - x0) * .12; plate(ctx, [[x0 - nx, y0 - ny], [x1 - nx, y1 - ny], [x1 + nx, y1 + ny], [x0 + nx, y0 + ny]], m, seed + i, { alpha: a, glowEdge: .7 }); }
    line(ctx, [P(0, -L), P(-L * .4, 0), P(0, L)], m.edge, 1, a);
    ITEMS.arrow(ctx, ...P(L * .25, 0), ang, L * .62, m, a, seed + 20);
  },
  fist(ctx, x, y, ang, L, m, a, seed) {
    const P = frameOf(x, y, ang); const R = L * .5;
    plate(ctx, Array.from({ length: 8 }, (_, i) => { const q = i / 8 * TAU + Math.PI / 8; return P(L * .2 + Math.cos(q) * R, Math.sin(q) * R * .9); }), m, seed, { alpha: a, lit: 1, glowEdge: .7 });
    for (let k = 0; k < 4; k++) bar(ctx, P, L * .6, L * .74, L * .08, { ...m, body: m.edge }, seed + 1 + k, a * .9);
    bar(ctx, P, -L * .55, -L * .2, L * .34, haft(m), seed + 6, a);
  },
  greatsword(ctx, x, y, ang, L, m, a, seed) {
    const P = frameOf(x, y, ang);
    plate(ctx, [P(L * 1.1, 0), P(L * .9, L * .13), P(-L * .35, L * .13), P(-L * .35, -L * .13), P(L * .9, -L * .13)], m, seed, { alpha: a, glowEdge: .9, lit: .8 });
    bar(ctx, P, -L * .44, -L * .34, L * .32, haft(m), seed + 1, a); bar(ctx, P, -L * .8, -L * .44, Math.max(1, L * .05), haft(m), seed + 2, a);
    line(ctx, [P(-L * .25, 0), P(L * .8, 0)], m.core, 1, a * .8);
  },
  sigil(ctx, x, y, ang, L, m, a, seed) {
    for (let i = 0; i < 10; i++) {
      const q0 = ang + i / 10 * TAU; const q1 = q0 + TAU / 10 * .7; const C = (q, r) => [x + Math.cos(q) * r, y + Math.sin(q) * r * .92];
      plate(ctx, [C(q0, L), C(q1, L), C(q1, L * .82), C(q0, L * .82)], m, seed + i, { alpha: a, glowEdge: .8 });
    }
    line(ctx, [0, 1, 2, 0].map((i) => { const q = -ang * 1.5 + i * TAU / 3; return [x + Math.cos(q) * L * .7, y + Math.sin(q) * L * .64]; }), m.edge, 1.5, a);
    line(ctx, [0, 1, 2, 0].map((i) => { const q = -ang * 1.5 + Math.PI + i * TAU / 3; return [x + Math.cos(q) * L * .7, y + Math.sin(q) * L * .64]; }), m.spark, 1, a);
    plate(ctx, [[x, y - L * .2], [x + L * .18, y], [x, y + L * .2], [x - L * .18, y]], m, seed + 11, { alpha: a, core: 1 });
  },
  // Cards, chakrams, talismans, notes: the style's own piece (bankai.js shape).
  card(ctx, x, y, ang, L, m, a, seed) { petal(ctx, x, y, ang, L * .55, a, seed); }
};

// ── Strike helpers ───────────────────────────────────────────────────────
const wound = (s, extra = []) => (t) => applyStatuses(t, ['bleed', ...extra], s.caster, s.facing);
const ahead = (len, w = 28, back = 8) => (s) => (t, dx, dz) => dx * s.facing > -back && dx * s.facing < len && Math.abs(dz) < w;
const around = (r, ox = 0) => (s) => (t, dx, dz) => Math.hypot(dx - s.facing * ox, dz) < r;
const outward = (kx) => (t, dx) => Math.sign(dx || 1) * kx;
const seq = (C, p, o) => new SigSequence({ mat: C.mat, seed: C.seed }, p, o);
const nearestFoe = (s, gw) => foesOf(gw, s.team).filter((t) => (t.x - s.x) * s.facing > -20).sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x))[0] ?? null;
const shake = (n, d = .22) => { if (n) combat.shakeCamera(n, d); };

// A flying piece drawn by the arsenal's painter.
class ArsenalBolt extends SigBolt {
  constructor(C, o) { super(o); this.C = C; this.paint = o.paint ?? C.item; }
  render(ctx) {
    if (this.t < this.delay) return;
    const a = Math.atan2(this._vz * DEPTH * .32, this.vx);
    for (let i = 1; i < this.trail.length; i++) specks(ctx, [this.trail[i]], this.mat.vein, .5 * (1 - i / this.trail.length), 2);
    this.paint(ctx, this.x, this.y, a, this.size, this.mat, 1, this.seed ?? 7, this.C.wid);
  }
}

// ── Technique patterns ───────────────────────────────────────────────────
// sweep: the giant weapon swings an arc in front (o.up: from low to high = launcher).
function sweep(C, p, o) {
  return seq(C, p, { dur: .45, steps: [{ at: .12, fn: (s, gw) => { s.strike(gw, ahead(o.len, o.w)(s), o.dmg, (t, dx) => Math.sign(dx || s.facing) * o.kx, o.lift, .4, { onHit: wound(s) }); shake(o.shake); } }],
    draw: (ctx, s, k) => {
      const y = gy(s) - 46; const e = ease(clamp01(k / .3)); const a0 = o.up ? 1.2 : -2.3; const a1 = o.up ? -1.5 : .75; const a = lerp(a0, a1, e);
      const L = C.L * 1.5; const al = fade(k); const ang = mir(a, s.facing);
      if (k < .55) line(ctx, Array.from({ length: 8 }, (_, i) => { const q = mir(lerp(a0, a, i / 7), s.facing); return [s.x + Math.cos(q) * L * 1.6, y + Math.sin(q) * L * 1.6]; }), C.mat.edge, 3, al);
      C.item(ctx, s.x + Math.cos(ang) * L * .6, y + Math.sin(ang) * L * .6, ang, L, C.mat, al, C.seed, C.wid);
    } });
}
// travel: a front runs along the lane (fissure, shield wall, crescent wave, comet, thrusts).
const TRAVEL_LOOKS = {
  crack(ctx, C, s, fx, y, tt, al) { line(ctx, Array.from({ length: 9 }, (_, i) => { const u = i / 8; return [lerp(s.x + s.facing * 24, fx, u), y + (i % 2 ? 3 : -2)]; }), C.mat.edge, 3, al); for (let i = 0; i < 3; i++) plate(ctx, [[fx - 8 + i * 7, y], [fx - 4 + i * 7, y - 14 - i * 6], [fx + 1 + i * 7, y]], C.mat, C.seed + 40 + i, { alpha: al, glowEdge: .7 }); C.item(ctx, s.x + s.facing * 26, y - C.L * .9, Math.PI / 2, C.L * 1.3, C.mat, al, C.seed, C.wid); },
  wall(ctx, C, s, fx, y, tt, al) { for (let i = 0; i < 2; i++) C.item(ctx, fx, y - 22 - i * C.L * 1.3, 0, C.L * 1.2, C.mat, al, C.seed + i, C.wid); },
  wall3(ctx, C, s, fx, y, tt, al) { for (let j = 0; j < 3; j++) { const x = fx - s.facing * j * 26; if ((x - s.x) * s.facing < 10) continue; for (let i = 0; i < 2; i++) C.item(ctx, x, y - 22 - i * C.L * 1.3, 0, C.L * 1.15, C.mat, al * (1 - j * .2), C.seed + j * 3 + i, C.wid); } },
  wave(ctx, C, s, fx, y, tt, al) { ITEMS.crescent(ctx, fx, y - 40, s.facing > 0 ? 0 : Math.PI, C.L * 1.4, C.mat, al, C.seed); },
  comet(ctx, C, s, fx, y, tt, al) { specks(ctx, Array.from({ length: 12 }, (_, i) => [fx - s.facing * (8 + i * 9), y - 46 + Math.sin(i * 2.3 + tt * 20) * 8]), C.mat.spark, al, 3); C.item(ctx, fx, y - 46, s.facing > 0 ? 0 : Math.PI, C.L * 1.6, C.mat, al, C.seed, C.wid); },
  thrust(ctx, C, s, fx, y, tt, al) { for (let i = 0; i < 3; i++) C.item(ctx, fx - s.facing * C.L * .6, y - 34 - i * 12, s.facing > 0 ? 0 : Math.PI, C.L * 1.3, C.mat, al * (1 - i * .25), C.seed + i, C.wid); }
};
function travel(C, p, o) {
  const n = o.n ?? 5; const len = o.len ?? 280; const gap = .09; const win = Math.max(32, (len - 30) / Math.max(1, n - 1) / 2 + 4);
  const steps = Array.from({ length: n }, (_, i) => ({ at: .08 + i * gap, fn: (s, gw) => {
    const fx = 30 + (len - 30) * i / Math.max(1, n - 1); const last = i === n - 1;
    s.strike(gw, (t, dx, dz) => Math.abs(dx * s.facing - fx) < win && Math.abs(dz) < (o.w ?? 30), last ? o.final : o.dmg, () => s.facing * (last ? (o.kx ?? 360) : 140), last ? (o.lift ?? 200) : 50, .35, { again: true, onHit: wound(s, o.st) });
    if (last) shake(o.shake ?? 6);
  } }));
  return seq(C, p, { dur: .08 + n * gap + .3, steps, draw: (ctx, s, k) => { const tt = clamp01((s.t - .08) / (n * gap)); TRAVEL_LOOKS[o.look](ctx, C, s, s.x + s.facing * (30 + (len - 30) * tt), gy(s), tt, fade(k, .05, .25)); } });
}
// bolts: thrown / shot pieces (fan, piercing storm, homing hail).
function bolts(C, p, o) {
  const gap = o.gap ?? .05;
  return seq(C, p, { dur: .15 + o.n * gap, steps: Array.from({ length: o.n }, (_, i) => ({ at: i * gap, fn: (s, gw) => {
    const spread = o.n > 1 ? (i / (o.n - 1) - .5) * 2 : 0; const target = o.homing ? nearestFoe(s, gw) : null;
    s.system?.addSpell(new ArsenalBolt(C, { x: s.caster.x + s.facing * 20, z: s.caster.z, height: (s.caster.worldHeight ?? 0) + (o.h ?? 44) + (o.homing ? Math.sin(i * 2.1) * 14 : 0), team: s.team, mat: C.mat,
      vx: s.facing * (o.speed ?? 600), vz: spread * (o.spread ?? .35), damage: o.dmg, size: o.size ?? C.L * .7, life: o.life ?? .9, pierce: o.pierce, homing: target, turn: 5,
      kx: o.kx ?? 160, lift: o.lift ?? 50, stun: .3, seed: C.seed + i, paint: o.item ? ITEMS[o.item] : null, onHit: (t) => applyStatuses(t, ['bleed'], s.caster, s.facing) }), 'B');
  } })), draw: (ctx, s, k) => { if (o.bow) ITEMS.bow(ctx, s.x + s.facing * 22, gy(s) - 46, s.facing > 0 ? 0 : Math.PI, 26, C.mat, fade(k, .05, .3), C.seed + 50); } });
}
// burstOut: pieces fly out in every direction around the Wizard.
function burstOut(C, p, o) {
  return seq(C, p, { dur: .2, steps: [{ at: .02, fn: (s) => { for (let i = 0; i < o.n; i++) { const a = i / o.n * TAU; s.system?.addSpell(new ArsenalBolt(C, { x: s.caster.x, z: s.caster.z, height: (s.caster.worldHeight ?? 0) + 30, team: s.team, mat: C.mat, vx: Math.cos(a) * (o.speed ?? 520), vz: Math.sin(a) * (o.speed ?? 520) / DEPTH, damage: o.dmg, size: o.size ?? C.L * .7, life: o.life ?? .5, pierce: true, kx: 220, lift: 80, stun: .3, seed: C.seed + i, onHit: (t) => applyStatuses(t, ['bleed'], s.caster, s.facing) }), 'B'); } shake(4, .12); } }],
    draw: (ctx, s, k) => groundRing(ctx, s.x, gy(s), 20 + k * 60, C.mat, 0, 1 - k, 10, C.seed + 60, 3) });
}
// rise: the piece bursts up out of the ground at a point ahead (launcher).
function rise(C, p, o) {
  const cnt = o.count ?? 1;
  return seq(C, p, { dur: .5, x: p.x + p.facing * o.at, steps: [{ at: .12, fn: (s, gw) => s.strike(gw, around(o.r)(s), o.dmg, () => 0, o.lift, .5, { onHit: wound(s) }) }],
    draw: (ctx, s, k) => {
      const y = gy(s); const e = ease(clamp01(k / .25)); const al = fade(k);
      if (o.look === 'column') { plate(ctx, [[s.x - 12, y], [s.x + 12, y], [s.x + 10, y - 150 * e], [s.x - 10, y - 150 * e]], C.mat, C.seed + 70, { alpha: al * .9, glowEdge: 1, core: .5 }); C.item(ctx, s.x, y - 2, k * 8, C.L * 1.6, C.mat, al, C.seed, C.wid); return; }
      for (let j = 0; j < cnt; j++) { const ox = (j - (cnt - 1) / 2) * 18; C.item(ctx, s.x + ox, y + 6 - C.L * 1.3 * e - (j % 2) * 8, o.upright ? 0 : -Math.PI / 2 + ox * .01, C.L * 1.3, C.mat, al, C.seed + j, C.wid); }
      groundRing(ctx, s.x, y, 14 + k * 40, C.mat, 0, 1 - k, 8, C.seed + 71, 3);
    } });
}
// juggle: the foe is kept in the air by repeated lifts (wheel, spiral, cage, column).
function juggle(C, p, o) {
  const n = o.n ?? 5; const dur = 1;
  const steps = Array.from({ length: n }, (_, i) => ({ at: .08 + i * (dur - .25) / n, fn: (s, gw) => s.strike(gw, around(o.r)(s), o.dmg, () => 0, o.lift, .3, { again: true, onHit: wound(s) }) }));
  steps.push({ at: dur - .1, fn: (s, gw) => { s.strike(gw, around(o.r + 6)(s), o.final, outward(300), o.finalLift ?? 520, .5, { again: true, onHit: wound(s) }); shake(5, .15); } });
  return seq(C, p, { dur, x: p.x + p.facing * (o.at ?? 70), steps, draw: (ctx, s, k) => {
    const y = gy(s); const al = fade(k, .1, .2); const L = C.L;
    if (o.look === 'wheel') { const ang = s.t * 16 * s.facing; C.item(ctx, s.x + Math.cos(ang) * L * .5, y - 60 + Math.sin(ang) * L * .5, ang, L * 1.5, C.mat, al, C.seed, C.wid); line(ctx, Array.from({ length: 13 }, (_, i) => [s.x + Math.cos(i / 12 * TAU) * L * 1.9, y - 60 + Math.sin(i / 12 * TAU) * L * 1.9]), C.mat.edge, 2, al * .7); }
    else if (o.look === 'cage') { for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + s.t * 3; C.item(ctx, s.x + Math.cos(a) * 34, y - 50 + Math.sin(a) * 10 - Math.sin(s.t * 9 + i) * 8, C.item === ITEMS.shield ? 0 : Math.PI / 2, L * 1.1, C.mat, al, C.seed + i, C.wid); } }
    else if (o.look === 'column') { for (let i = 0; i < 4; i++) C.item(ctx, s.x, y - 8 - i * 36, s.t * (4 + i), L * (1.4 - i * .2), C.mat, al, C.seed + i, C.wid); plate(ctx, [[s.x - 9, y], [s.x + 9, y], [s.x + 7, y - 160], [s.x - 7, y - 160]], C.mat, C.seed + 80, { alpha: al * .7, glowEdge: 1, core: .6 }); }
    else for (let i = 0; i < 8; i++) { const a = i * 2.39 + s.t * 10; const h = ((i / 8 + s.t * 1.4) % 1) * 140; C.item(ctx, s.x + Math.cos(a) * 24, y - 10 - h, -Math.PI / 2 + Math.cos(a) * .4, L * .9, C.mat, al, C.seed + i, C.wid); }
  } });
}
// ring: pieces slam down around the Wizard (o.slam: one giant swing into the ground; o.sweep: a low reaping circle).
function ring(C, p, o) {
  return seq(C, p, { dur: .5, steps: [{ at: .14, fn: (s, gw) => { s.strike(gw, around(o.r)(s), o.dmg, outward(o.kx ?? 260), o.lift ?? 90, .45, { onHit: wound(s, o.st) }); shake(o.shake ?? 5, .16); } }],
    draw: (ctx, s, k) => {
      const y = gy(s); const e = ease(clamp01(k / .28)); const al = fade(k); const L = C.L;
      if (o.sweep) { const a = s.t * 20 * s.facing; C.item(ctx, s.x + Math.cos(a) * L * .9, y - 16 + Math.sin(a) * L * .25, a, L * 1.5, C.mat, al, C.seed, C.wid); line(ctx, Array.from({ length: 13 }, (_, i) => [s.x + Math.cos(i / 12 * TAU) * o.r * .9, y - 10 + Math.sin(i / 12 * TAU) * o.r * .26]), C.mat.edge, 2, al * .8); return; }
      if (o.look === 'sigil') { ctx.save(); ctx.translate(s.x, y); ctx.scale(1, .3); ITEMS.sigil(ctx, 0, 0, s.t * 3, o.r * (.4 + .6 * e), C.mat, al, C.seed); ctx.restore(); return; }
      const cnt = o.n ?? 6;
      for (let i = 0; i < cnt; i++) { const a = i / cnt * TAU + .3; const x = s.x + Math.cos(a) * o.r * .7; const yy = y + Math.sin(a) * o.r * .22; C.item(ctx, x, yy - L * .9 - 90 * (1 - e), o.upright ? 0 : Math.PI / 2, L * 1.1, C.mat, al, C.seed + i, C.wid); }
      if (k > .28) groundRing(ctx, s.x, y, 20 + (k - .28) * o.r * 1.4, C.mat, 0, 1 - k, 12, C.seed + 90, 4);
    } });
}
// drop: a giant piece falls from the sky ahead (meteor, sky spear, bastion, judgement).
function drop(C, p, o) {
  const at = o.delay ?? .6;
  return seq(C, p, { dur: at + .5, x: p.x + p.facing * o.at, steps: [{ at, fn: (s, gw) => {
    s.strike(gw, around(o.r)(s), o.dmg, outward(o.kx ?? 340), o.lift ?? 240, .6, { onHit: wound(s, o.st) }); shake(o.shake ?? 12, .3); combat.triggerHitstop?.(5);
    if (o.ground) environment.add(o.ground, s.x, s.z, { radius: o.r * .6 });
    if (o.shield) { s.caster.arcaneShield = Math.max(s.caster.arcaneShield ?? 0, o.shield); s.caster.arcaneShieldTimer = Math.max(s.caster.arcaneShieldTimer ?? 0, 4); }
  } }], draw: (ctx, s, k) => {
    const y = gy(s); const e = clamp01(s.t / at); const al = fade(k, .08, .25); const L = C.L * (o.size ?? 2.4);
    ctx.save(); ctx.globalAlpha = .35 * e * al; ctx.fillStyle = '#120a1a'; ctx.beginPath(); ctx.ellipse(s.x, y, 16 + o.r * .5 * e, 5 + o.r * .14 * e, 0, 0, TAU); ctx.fill(); ctx.restore();
    if (o.look === 'sigil') {
      ctx.save(); ctx.translate(s.x, y); ctx.scale(1, .3); ITEMS.sigil(ctx, 0, 0, s.t * 2, o.r * (.5 + .5 * e), C.mat, al, C.seed); ctx.restore();
      if (s.t >= at - .08) plate(ctx, [[s.x - 22, y], [s.x + 22, y], [s.x + 16, y - 320], [s.x - 16, y - 320]], C.mat, C.seed + 95, { alpha: al, glowEdge: 1, core: .8 });
    } else {
      const fall = ease(e) ** 2; const hy = s.t < at ? y - L * .9 - 280 * (1 - fall) : y - L * .55;
      C.item(ctx, s.x, hy, o.upright ? 0 : Math.PI / 2, L, C.mat, al, C.seed, C.wid);
    }
    if (s.t >= at) { const q = clamp01((s.t - at) / .5); groundRing(ctx, s.x, y, 30 + q * o.r * 1.2, C.mat, 0, 1 - q, 14, C.seed + 96, 5); specks(ctx, Array.from({ length: 10 }, (_, i) => [s.x + Math.cos(i * 2.4) * q * o.r, y - 8 - Math.abs(Math.sin(i * 1.7)) * q * 60]), C.mat.spark, 1 - q, 3); }
  } });
}
// lineDrops: pieces drop (or rise, o.fromGround) one after another along the lane.
function lineDrops(C, p, o) {
  const n = o.n ?? 5; const gapT = .08; const space = o.space ?? 44;
  const steps = Array.from({ length: n }, (_, i) => ({ at: .14 + i * gapT, fn: (s, gw) => { const xi = 50 + i * space; const last = i === n - 1; s.strike(gw, (t, dx, dz) => Math.hypot(dx - s.facing * xi, dz) < 36, last ? (o.final ?? o.dmg * 1.6) : o.dmg, () => s.facing * 140, o.lift ?? 120, .35, { again: true, onHit: wound(s) }); if (last) shake(6, .16); } }));
  return seq(C, p, { dur: .14 + n * gapT + .4, steps, draw: (ctx, s, k) => {
    const y = gy(s); const al = fade(k, .05, .25);
    for (let i = 0; i < n; i++) { const at = .14 + i * gapT; const e = clamp01((s.t - at + .14) / .14); if (e <= 0) continue; const x = s.x + s.facing * (50 + i * space);
      if (o.fromGround) C.item(ctx, x, y + 6 - C.L * 1.3 * ease(e), -Math.PI / 2, C.L * 1.3, C.mat, al, C.seed + i, C.wid);
      else C.item(ctx, x, y - C.L * 1.2 - 160 * (1 - ease(e)), Math.PI / 2, C.L * 1.3, C.mat, al, C.seed + i, C.wid); }
  } });
}
// beam: a lane beam from a sigil (or a giant streaking arrow, o.arrow).
function beam(C, p, o) {
  const n = o.n ?? 5; const dur = .2 + n * .09;
  const steps = Array.from({ length: n }, (_, i) => ({ at: .1 + i * .09, fn: (s, gw) => s.strike(gw, ahead(o.len, o.w)(s), o.dmg, () => s.facing * 80, 30, .25, { again: true, onHit: wound(s) }) }));
  steps.push({ at: dur - .04, fn: (s, gw) => { s.strike(gw, ahead(o.len, o.w + 6)(s), o.final, () => s.facing * 380, 160, .5, { again: true, onHit: wound(s) }); shake(7, .2); } });
  return seq(C, p, { dur: dur + .15, steps, draw: (ctx, s, k) => {
    const y = gy(s) - 46; const al = fade(k, .05, .2); const len = o.len * clamp01(s.t / .14); const x0 = s.x + s.facing * 26; const x1 = s.x + s.facing * len; const w = o.w * .5 * (1 + .15 * Math.sin(s.t * 40));
    plate(ctx, [[x0, y - w], [x1, y - w * .8], [x1, y + w * .8], [x0, y + w]], C.mat, C.seed + 100, { alpha: al * .9, glowEdge: 1 });
    plate(ctx, [[x0, y - w * .35], [x1, y - w * .25], [x1, y + w * .25], [x0, y + w * .35]], { ...C.mat, body: C.mat.core, facet: C.mat.core }, C.seed + 101, { alpha: al, core: 1 });
    if (o.arrow) ITEMS.arrow(ctx, x1, y, s.facing > 0 ? 0 : Math.PI, 30, C.mat, al, C.seed + 102); else C.item(ctx, x0, y, s.t * 6, C.L * 1.4, C.mat, al, C.seed, C.wid);
  } });
}
// rain: pieces rain onto an area (ticks) and a final volley.
function rain(C, p, o) {
  const n = o.n ?? 6; const dur = .3 + n * .1;
  const steps = Array.from({ length: n }, (_, i) => ({ at: .15 + i * .1, fn: (s, gw) => s.strike(gw, around(o.r)(s), o.dmg, () => 0, 30, .25, { again: true, onHit: wound(s) }) }));
  steps.push({ at: dur - .05, fn: (s, gw) => { s.strike(gw, around(o.r + 8)(s), o.final, outward(260), 180, .45, { again: true, onHit: wound(s) }); shake(o.big ? 9 : 5, .2); } });
  return seq(C, p, { dur: dur + .1, x: p.x + p.facing * (o.at ?? 0), steps, draw: (ctx, s, k) => {
    const y = gy(s); const al = fade(k, .08, .2); const cnt = o.big ? 22 : 14;
    for (let i = 0; i < cnt; i++) { const ph = (s.t * 2.6 + i / cnt) % 1; const r1 = ((i * 7919) % 101) / 101 - .5; const r2 = ((i * 104729) % 97) / 97 - .5; const px = s.x + r1 * 2 * o.r; const pz = y + r2 * o.r * .5;
      C.item(ctx, px - s.facing * 30 * (1 - ph), pz - 180 * (1 - ph), Math.PI / 2 - s.facing * .35, C.L * (o.big ? 1.1 : .9), C.mat, al * Math.min(1, ph * 4), C.seed + i, C.wid); }
    groundRing(ctx, s.x, y, o.r, C.mat, s.t, al * .6, 14, C.seed + 110, 2);
  } });
}
// converge: pieces circle the target point and stab inward all at once.
function converge(C, p, o) {
  const at = .6;
  return seq(C, p, { dur: 1, x: p.x + p.facing * o.at, steps: [{ at, fn: (s, gw) => { s.strike(gw, around(o.r)(s), o.dmg, () => 0, 90, 1, { onHit: wound(s, ['stun']) }); shake(10, .28); combat.triggerHitstop?.(5); } }], draw: (ctx, s, k) => {
    const y = gy(s) - 34; const close = Math.min(1, (s.t / at) ** 2); const r = o.r * 1.3 * (1 - close) + 12; const al = fade(k, .1, .2); const cnt = o.n ?? 14;
    for (let i = 0; i < cnt; i++) { const a = i / cnt * TAU + s.t * 2; const lat = (i % 2) * 18; C.item(ctx, s.x + Math.cos(a) * r, y - lat + Math.sin(a) * r * .4, a + Math.PI, C.L * 1.1, C.mat, al, C.seed + i, C.wid); }
    if (s.t > at) { const q = clamp01((s.t - at) / .4); line(ctx, Array.from({ length: 13 }, (_, i) => [s.x + Math.cos(i / 12 * TAU) * (14 + q * 70), y + Math.sin(i / 12 * TAU) * (14 + q * 70) * .5]), C.mat.edge, 3, 1 - q); }
  } });
}
// punches: two giant fists strike in turn.
function punches(C, p, o) {
  const n = o.n ?? 2;
  return seq(C, p, { dur: .2 + n * .14, steps: Array.from({ length: n }, (_, i) => ({ at: .08 + i * .14, fn: (s, gw) => s.strike(gw, ahead(o.len, 32)(s), o.dmg, () => s.facing * (i === n - 1 ? 380 : 160), i === n - 1 ? 90 : 30, .35, { again: true, onHit: wound(s, o.st) }) })),
    draw: (ctx, s, k) => { const y = gy(s) - 48; const al = fade(k, .05, .25); for (let i = 0; i < n; i++) { const e = clamp01((s.t - .02 - i * .14) / .1); const r = Math.sin(Math.min(1, e) * Math.PI); if (e <= 0) continue; C.item(ctx, s.x + s.facing * (24 + o.len * .7 * r), y + (i % 2 ? 8 : -8), s.facing > 0 ? 0 : Math.PI, C.L * 1.5, C.mat, al, C.seed + i, C.wid); } } });
}

// ── The arsenals ─────────────────────────────────────────────────────────
// moves: [forward short, forward full, up short, up full, down short, down full] = [name, pattern, options].
const ARSENALS = {
  colossus: { item: ITEMS.axe, size: 30, formation: 'back', moves: [
    ['TITANENHIEB', sweep, { len: 150, w: 40, dmg: 34, kx: 380, lift: 80, shake: 6 }],
    ['BERGSPALTER', travel, { look: 'crack', len: 300, n: 5, w: 30, dmg: 12, final: 34, kx: 380, lift: 240, shake: 9 }],
    ['HIMMELSSCHWUNG', sweep, { up: true, len: 110, w: 34, dmg: 30, kx: 60, lift: 600 }],
    ['TITANENRAD', juggle, { look: 'wheel', at: 70, r: 60, n: 5, dmg: 9, lift: 300, final: 28 }],
    ['ERDBRECHER', ring, { r: 110, dmg: 30, kx: 300, lift: 160, shake: 8, n: 3 }],
    ['METEORFALL', drop, { at: 120, r: 120, dmg: 74, delay: .6, shake: 14, ground: 'crater', size: 2.2 }]] },
  lances: { item: ITEMS.spear, size: 26, formation: 'fan', moves: [
    ['SPEERSTOSS', travel, { look: 'thrust', len: 200, n: 3, w: 24, dmg: 12, final: 20, kx: 260, lift: 60, shake: 3 }],
    ['SPEERSTURM', bolts, { n: 8, gap: .04, speed: 720, spread: .5, dmg: 14, pierce: true, size: 22, life: .8 }],
    ['SPEERSÄULE', rise, { at: 64, r: 40, dmg: 30, lift: 600 }],
    ['SPEERWALD', lineDrops, { fromGround: true, n: 5, dmg: 12, final: 24, lift: 420 }],
    ['SPEERKREIS', ring, { r: 105, dmg: 26, kx: 240, lift: 100, n: 8 }],
    ['HIMMELSSPEER', drop, { at: 140, r: 90, dmg: 72, delay: .55, shake: 12, ground: 'crack', size: 2.6 }]] },
  bulwark: { item: ITEMS.shield, size: 20, formation: 'orbit4', moves: [
    ['SCHILDRAMME', travel, { look: 'wall', len: 170, n: 4, w: 34, dmg: 10, final: 22, kx: 440, lift: 60, shake: 5 }],
    ['PHALANX', travel, { look: 'wall3', len: 300, n: 6, w: 40, dmg: 10, final: 30, kx: 480, lift: 220, shake: 9 }],
    ['SCHILDHEBER', rise, { at: 60, r: 44, dmg: 28, lift: 580, upright: true }],
    ['SCHILDKÄFIG', juggle, { look: 'cage', at: 80, r: 60, n: 5, dmg: 9, lift: 300, final: 26 }],
    ['SCHILDBEBEN', ring, { r: 100, dmg: 24, kx: 280, lift: 90, n: 4, upright: true, st: ['stun'] }],
    ['BASTION', drop, { at: 110, r: 110, dmg: 66, delay: .55, shake: 12, size: 3, upright: true, shield: 50 }]] },
  crescent: { item: ITEMS.scythe, size: 30, formation: 'back', moves: [
    ['MONDSICHEL', travel, { look: 'wave', len: 260, n: 5, w: 30, dmg: 10, final: 22, kx: 260, lift: 60 }],
    ['DREIFACHER MOND', bolts, { n: 3, gap: .14, speed: 520, spread: 0, dmg: 24, pierce: true, size: 26, life: 1, item: 'crescent' }],
    ['AUFSTEIGENDER MOND', sweep, { up: true, len: 120, w: 36, dmg: 30, kx: 40, lift: 600 }],
    ['MONDRAD', juggle, { look: 'wheel', at: 0, r: 90, n: 5, dmg: 9, lift: 300, final: 26 }],
    ['ERNTE', ring, { sweep: true, r: 125, dmg: 26, kx: -220, lift: 60 }],
    ['FALLENDER MOND', drop, { at: 120, r: 110, dmg: 70, delay: .6, shake: 12, size: 2.2 }]] },
  shadow: { item: ITEMS.blade, size: 16, formation: 'wings', moves: [
    ['KLINGENFÄCHER', bolts, { n: 5, gap: .02, speed: 640, spread: .45, dmg: 10, size: 16 }],
    ['SCHATTENHAGEL', bolts, { n: 14, gap: .05, speed: 600, spread: .6, dmg: 7, homing: true, size: 15, life: 1.1 }],
    ['AUFWÄRTSSCHNITT', rise, { at: 60, r: 42, dmg: 28, lift: 580, count: 3 }],
    ['KLINGENWIRBEL', juggle, { look: 'spiral', at: 70, r: 60, n: 6, dmg: 8, lift: 300, final: 26 }],
    ['SCHATTENKREIS', burstOut, { n: 10, speed: 520, dmg: 12, size: 16, life: .5 }],
    ['TAUSEND SCHATTEN', converge, { at: 110, r: 70, dmg: 66, n: 16 }]] },
  archer: { item: ITEMS.arrow, size: 18, formation: 'bow', moves: [
    ['DREIFACHSCHUSS', bolts, { n: 3, gap: .06, speed: 820, spread: .15, dmg: 16, size: 18, bow: true }],
    ['STERNPFEIL', beam, { len: 420, w: 24, n: 6, dmg: 8, final: 34, arrow: true }],
    ['PFEILFONTÄNE', rise, { at: 70, r: 46, dmg: 26, lift: 580, count: 3 }],
    ['HIMMELSFEUER', juggle, { look: 'spiral', at: 80, r: 60, n: 6, dmg: 8, lift: 300, final: 26 }],
    ['PFEILREGEN', rain, { at: 0, r: 110, n: 6, dmg: 8, final: 20 }],
    ['STERNENFALL', rain, { at: 150, r: 120, n: 9, dmg: 8, final: 36, big: true }]] },
  fists: { item: ITEMS.fist, size: 18, formation: 'sides', moves: [
    ['DOPPELFAUST', punches, { n: 2, len: 130, dmg: 16 }],
    ['FEUERKOMET', travel, { look: 'comet', len: 320, n: 6, w: 34, dmg: 10, final: 30, kx: 420, lift: 160, st: ['burn'], shake: 8 }],
    ['AUFWÄRTSHAKEN', rise, { at: 50, r: 42, dmg: 32, lift: 620 }],
    ['FAUSTSÄULE', juggle, { look: 'spiral', at: 70, r: 56, n: 6, dmg: 9, lift: 300, final: 26 }],
    ['BODENFAUST', ring, { r: 105, dmg: 28, kx: 300, lift: 120, n: 2, shake: 7 }],
    ['HIMMELSFAUST', drop, { at: 110, r: 110, dmg: 72, delay: .55, shake: 14, size: 3.2, ground: 'crater' }]] },
  swordring: { item: ITEMS.greatsword, size: 22, formation: 'halo', moves: [
    ['KLINGENWURF', bolts, { n: 3, gap: .07, speed: 700, spread: .2, dmg: 16, size: 22, pierce: true }],
    ['KLINGENKASKADE', lineDrops, { n: 6, dmg: 14, final: 28, lift: 140 }],
    ['KLINGENAUFSTIEG', rise, { at: 62, r: 40, dmg: 30, lift: 600 }],
    ['KLINGENKRANZ', juggle, { look: 'cage', at: 75, r: 60, n: 5, dmg: 9, lift: 300, final: 26 }],
    ['KLINGENRING', ring, { r: 100, dmg: 26, kx: 260, lift: 100, n: 6 }],
    ['RICHTSCHWERT', drop, { at: 120, r: 100, dmg: 74, delay: .6, shake: 13, size: 3, ground: 'crack' }]] },
  sigils: { item: ITEMS.sigil, size: 18, formation: 'circles', moves: [
    ['SIEGELSTRAHL', beam, { len: 280, w: 18, n: 4, dmg: 9, final: 18 }],
    ['GROSSER SIEGELSTRAHL', beam, { len: 420, w: 28, n: 7, dmg: 8, final: 36 }],
    ['SIEGELSÄULE', rise, { at: 70, r: 44, dmg: 28, lift: 580, look: 'column' }],
    ['SIEGELTURM', juggle, { look: 'column', at: 80, r: 56, n: 5, dmg: 9, lift: 300, final: 26 }],
    ['SIEGELBANN', ring, { look: 'sigil', r: 110, dmg: 24, kx: 40, lift: 60, st: ['stun'] }],
    ['SIEGELGERICHT', drop, { look: 'sigil', at: 130, r: 110, dmg: 72, delay: .7, shake: 12 }]] },
  deck: { item: ITEMS.card, size: 22, formation: 'wheel', moves: [
    ['FÄCHERWURF', bolts, { n: 5, gap: .03, speed: 620, spread: .4, dmg: 10, size: 22 }],
    ['FLUTWURF', bolts, { n: 12, gap: .05, speed: 560, spread: .6, dmg: 8, homing: true, size: 20, life: 1.2 }],
    ['WIRBELSÄULE', rise, { at: 66, r: 44, dmg: 26, lift: 580, count: 3 }],
    ['WIRBELTURM', juggle, { look: 'spiral', at: 75, r: 58, n: 6, dmg: 8, lift: 300, final: 26 }],
    ['RINGWURF', burstOut, { n: 10, speed: 520, dmg: 12, size: 22, life: .5 }],
    ['SIEGELFALLE', converge, { at: 110, r: 70, dmg: 64, n: 14 }]] }
};
// Families whose pieces read differently keep the mechanics but get their own names / piece.
const FAMILY_NAMES = {
  Beastborn: ['KRALLENFÄCHER', 'FANGHAGEL', 'KRALLENAUFRISS', 'FANGWIRBEL', 'KRALLENKREIS', 'TAUSEND FÄNGE'],
  Resonant: ['KLANGFÄCHER', 'KLANGFLUT', 'KLANGSÄULE', 'RESONANZTURM', 'KLANGRING', 'STILLE FALLE'],
  Fateweaver: ['TALISMANFÄCHER', 'TALISMANFLUT', 'BANNSÄULE', 'BANNTURM', 'TALISMANRING', 'SCHICKSALSFALLE'],
  Occultist: ['FLUCHSTRAHL', 'GROSSER FLUCHSTRAHL', 'FLUCHSÄULE', 'FLUCHTURM', 'FLUCHBANN', 'FLUCHGERICHT'],
  Oracle: ['LICHTSTRAHL', 'GROSSER LICHTSTRAHL', 'LICHTSÄULE', 'LICHTTURM', 'LICHTBANN', 'LICHTGERICHT']
};
const FAMILY_ITEM = { Beastborn: ITEMS.claw };
export const BANKAI_ARSENAL_IDS = Object.freeze(Object.keys(ARSENALS));

// The arsenal of an actor's held weapon (null = the blade-petal swarm).
export function arsenalOf(actor) {
  const style = bankaiStyleOf(actor); const A = ARSENALS[style.arsenal];
  if (!A) return null;
  return { ...A, style, item: FAMILY_ITEM[style.family] ?? A.item, names: FAMILY_NAMES[style.family] ?? A.moves.map((m) => m[0]) };
}
const ctxOf = (A, actor, mat) => ({ item: A.item, L: A.size, mat: mat ?? A.style.mat, wid: A.style.weaponId, seed: hashStr(`A04${A.style.arsenal}`) % 5000 + 11000 });

// Installs the arsenals on the A04 moveset: each technique slot asks the caster's weapon.
const SLOTS = [['forward', 'short'], ['forward', 'full'], ['up', 'short'], ['up', 'full'], ['down', 'short'], ['down', 'full']];
export function installBankaiArsenal(set) {
  if (!set || set._arsenal) return;
  set._arsenal = true;
  SLOTS.forEach(([dir, variant], i) => {
    const entry = set[dir]?.[variant]; if (!entry) return;
    const swarmMake = entry.make; const swarmName = entry.name;
    entry.make = (p) => { const A = arsenalOf(p); if (!A) return swarmMake(p); const [, pattern, opts] = A.moves[i]; return pattern(ctxOf(A, p), p, opts); };
    Object.defineProperty(entry, 'name', { configurable: true, enumerable: true, get: () => { const A = arsenalOf(globalThis.window?.gameWorld?.player); return A ? A.names[i] : swarmName; } });
  });
}
// The technique names of a weapon's Bankai (Training guide, tests).
export function bankaiMoveNames(weaponActor) { const A = arsenalOf(weaponActor); return A ? A.names : null; }

// ── Formations (idle / attack lean / guard wall) ─────────────────────────
function formation(ctx, s, pose, C, layer, kind) {
  const f = s.f; const t = pose.t; const [cx, cy] = s.chest; const L = C.L;
  const busy = ['forward', 'up', 'down'].some((d) => { const q = techOf(pose, d); return q.s > .05 || q.f > .05; });
  const al = pose.fade * (busy ? .35 : 1); if (al <= .01) return;
  const act = clamp01(pose.act ?? 0); const g = clamp01(pose.guardK ?? 0); const bob = Math.sin(t * 2.4) * 2;
  const front = layer === 'front'; const guarding = g > .3;
  const draw = (x, y, a, size, seed, item = C.item) => item(ctx, snap(x), snap(y), a, size, C.mat, al, C.seed + seed, C.wid);
  switch (kind) {
    case 'back': {
      if (guarding) { if (front) draw(cx + f * 24, cy - 4, -Math.PI / 2, L * 1.4, 0); break; }
      if (!front) { const a = mir(lerp(-1.25, -.35, act), f); draw(cx - f * 10 + Math.cos(a) * L * .55, cy - 4 + bob + Math.sin(a) * L * .55, a, L * 1.4, 0); }
      break;
    }
    case 'fan': {
      for (let i = 0; i < 6; i++) {
        if (guarding) { if (front) draw(cx + f * 26, cy - 34 + i * 12, mir(0, f), L, i); continue; }
        if (front) continue;
        const a = mir(lerp(-2.7, -.45, i / 5) * (1 - act * .25) + Math.sin(t * 2 + i) * .04, f);
        draw(cx - f * 8 + Math.cos(a) * L * 1.05, cy - 12 + bob + Math.sin(a) * L * .9, a, L * .9, i);
      }
      break;
    }
    case 'halo': {
      for (let i = 0; i < 5; i++) {
        if (guarding) { if (front) draw(cx + f * (20 + i * 4), cy - 6, -Math.PI / 2 + f * (i - 2) * .12, L * 1.1, i); continue; }
        if (front) continue;
        const pa = lerp(-2.6, -.54, i / 4); const lean = act * f * .5;
        draw(cx - f * 6 + Math.cos(pa) * 32, cy - 30 + Math.sin(pa) * 22 + Math.sin(t * 2 + i) * 2, Math.PI / 2 - lean, L * 1.05, i);
      }
      break;
    }
    case 'orbit4': {
      for (let i = 0; i < 4; i++) {
        if (guarding) { if (front) draw(cx + f * 24, cy - 26 + i * 15, 0, L * .95, i); continue; }
        const a = i / 4 * TAU + t * 1.4; const near = Math.sin(a) > 0; if (near !== front) continue;
        draw(cx + Math.cos(a) * 34 + f * act * 10, cy + 6 + Math.sin(a) * 9 + bob, 0, L, i);
      }
      break;
    }
    case 'wings': {
      for (let w = 0; w < 2; w++) for (let j = 0; j < 5; j++) {
        if (guarding) { if (front) draw(cx + f * 22, cy - 14 + (w * 5 + j) * 4, mir((w ? .5 : -.5), f), L * 1.2, w * 5 + j); continue; }
        if (front) continue;
        const base = w ? lerp(2.2, 2.9, j / 4) : lerp(-2.0, -2.9, j / 4); const a = mir(base + Math.sin(t * 6 + j) * .08 + act * (w ? -.4 : .4), f);
        draw(cx - f * 6 + Math.cos(a) * (12 + j * 6), cy - 8 + Math.sin(a) * (10 + j * 5), a, L * 1.1, w * 5 + j);
      }
      break;
    }
    case 'bow': {
      if (guarding) { if (front) draw(cx + f * 24, cy - 6, -Math.PI / 2, L * 1.6, 0, ITEMS.bow); break; }
      if (front) break;
      draw(cx - f * 4, cy - 52 + bob - act * 4, mir(-act * .2, f), L * 1.7, 0, ITEMS.bow);
      break;
    }
    case 'sides': {
      const back = [cx - f * 24, cy - 4 + bob]; const fr = [cx + f * (26 + act * 30), cy + 4 - bob];
      if (guarding) { if (front) { draw(cx + f * 22, cy - 14, mir(-.5, f), L * 1.2, 0); draw(cx + f * 26, cy + 6, mir(.4, f), L * 1.2, 1); } break; }
      if (front) draw(fr[0], fr[1], mir(0, f), L * 1.2, 1); else draw(back[0], back[1], mir(0, f), L * 1.2, 0);
      if (front) specks(ctx, [0, 1, 2, 3].map((i) => [fr[0] - f * (10 + i * 5), fr[1] - 6 + Math.sin(t * 9 + i) * 4]), C.mat.spark, al * .8, 2);
      break;
    }
    case 'circles': {
      if (guarding) { if (front) draw(cx + f * 26, cy - 6, t * 3, L * 1.3, 0); break; }
      if (front) break;
      draw(cx - f * 10, cy - 8 + bob, t * 1.2, L * 1.7, 0); draw(cx - f * 10, cy - 8 + bob, -t * 2, L * .95, 1);
      break;
    }
    case 'wheel': {
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU + t * 1.5;
        if (guarding) { if (front) draw(cx + f * 24, cy - 30 + i * 6, mir(0, f), L, i); continue; }
        if (front) continue;
        draw(cx - f * 12 + Math.cos(a) * 28, cy - 10 + Math.sin(a) * 28 + bob, a + Math.PI / 2, L, i);
      }
      break;
    }
    default: break;
  }
}
// The weapon's grip stays in the hand, glowing — the weapon itself has become the arsenal.
function grip(ctx, s, pose, C) {
  const f = s.f; const cy = s.chest[1];
  ctx.save(); ctx.globalAlpha = .9 * pose.fade; ctx.fillStyle = C.mat.dark; ctx.fillRect(snap(s.x + f * 12) - 2, snap(cy) - 4, 4, 12); ctx.fillStyle = C.mat.body; ctx.fillRect(snap(s.x + f * 12) - 4, snap(cy) - 6, 8, 3); ctx.restore();
}
// The arsenal towers over the Wizard (the atlas asks for large manifestations): scaled around the chest.
const FORMATION_SCALE = 1.5;

// One renderer for A04: the swarm for sword families, the weapon's arsenal for all others.
registerFormRenderer('A04', (ctx, s, pose, mat, form, layer) => {
  const A = arsenalOf(pose.player);
  if (!A) return klingenbluete(ctx, s, pose, mat, form, layer);
  const C = ctxOf(A, pose.player, mat); const [cx, cy] = s.chest;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(FORMATION_SCALE, FORMATION_SCALE); ctx.translate(-cx, -cy);
  formation(ctx, s, pose, C, layer, A.formation);
  ctx.restore();
  if (layer === 'front') grip(ctx, s, pose, C);
});
