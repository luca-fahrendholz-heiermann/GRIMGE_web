// GRIMGE Prototype — payoffs for the EINFACH special runes (user, 1 Nov 2026: "alle Spezialrunen in der Kategorie
// Einfach haben irgendwie keinen besonderen Effekt"). Most of them were set-ups that only paid off together with own
// beams, shots, summons or fire — cast alone, nothing visible happened. Every one now does something by itself,
// in its own idea, ON TOP of its original rules (the classes stay untouched; this layer reads their geometry):
//   S06 Luftnähte       the seam cuts whoever touches it (and snaps with a cut along it)
//   S09 Stillfuge       the stasis dome implodes at the end (damage, stun, pull to the centre)
//   S11 Spiegelversatz  the afterimage strikes at once from its spot
//   S12 Schicksalsnadel the needle pierces (bleed) and detonates if the thread is not finished
//   S15 Flutschiene     the channel soaks and batters foes in it
//   S16 Glutpumpe       the pump heats by itself and erupts after a while
//   S17 Raumfalter      crossing the fold flings foes aside; it snaps shut with a cut
//   S18 Glasfeld        glass spikes burst from the mosaic under foes
//   S19 Strahlenweber   the prism fires its own light rays at the nearest foe
//   S22 Rissweiche      the edges draw foes in and drag them through to the other one; both snap shut at the end
//   S26 Marionettenfaden with nothing to bind, the threads seize the nearest foe and pull it in
//   S30 Jägerglocke     every ring stuns foes nearby
//   S31 Runengericht    the court strikes judgement on foes inside its frame
//   S32 Exilkorridor    entering the corridor hurts and slows
//   S33 Erntezirkel     the seeds ripen by themselves; the lances seek the nearest foes
//   S35 Resonanzkorridor the plates pulse by themselves
//   S36 Weltnaht        crossing the rift line tears at the foe
//   S73 Zeitstopp       foes inside freeze for a moment when the field opens
import { foesOf, hit, emit, DEPTH, signatureImpl, sigSink } from './signature_core.js';
import { applyStatus } from './status_effects.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';

const gy = (z) => groundYForDepth(z);
const powOf = (s) => s.quality?.power ?? s.power ?? 1;
const dist = (a, x, z) => Math.hypot(a.x - x, ((a.z ?? z) - z) * DEPTH);
// Distance from a point to a segment in screen px (z scaled), plus the side of the segment it is on.
function seg(a, b, x, z) {
  const ax = a.x; const az = a.z * DEPTH; const bx = b.x; const bz = b.z * DEPTH; const px = x; const pz = z * DEPTH;
  const vx = bx - ax; const vz = bz - az; const L2 = vx * vx + vz * vz || 1; const u = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / L2));
  return { d: Math.hypot(px - (ax + vx * u), pz - (az + vz * u)), u, side: Math.sign(vx * (pz - az) - vz * (px - ax)), nx: -vz / Math.sqrt(L2), nz: vx / Math.sqrt(L2) };
}
const fx = (t, color = '#ffffff', n = 8) => { combat.spawnHitSparks?.(t.x, (t.y ?? gy(t.z)) - 34, 1, color, n); };
const ring = (x, z, r, color) => combat.spawnShockwave?.(x, gy(z) - 10, r, color);
const every = (s, key, sec, dt) => { const po = s._po ??= {}; po[key] = (po[key] ?? sec * .5) - dt; if (po[key] <= 0) { po[key] = sec; return true; } return false; };
const once = (s, key) => { const po = s._po ??= {}; if (po[key]) return false; po[key] = true; return true; };
const colorOf = (s) => s.mat?.edge ?? s.sig?.mat?.edge ?? '#ffffff';

// A short crisp light ray (S19).
class RayFx {
  constructor(x0, y0, x1, y1, color) { Object.assign(this, { x0, y0, x1, y1, color, t: 0, isFinished: false, isVisualOnly: true, fineVfx: true, x: (x0 + x1) / 2, z: null }); }
  update(dt) { this.t += dt; if (this.t > .22) this.isFinished = true; }
  render(ctx) {
    const a = 1 - this.t / .22; const n = Math.ceil(Math.hypot(this.x1 - this.x0, this.y1 - this.y0) / 3);
    ctx.save(); ctx.globalAlpha = a;
    for (let i = 0; i <= n; i++) { const u = i / n; const x = this.x0 + (this.x1 - this.x0) * u; const y = this.y0 + (this.y1 - this.y0) * u; ctx.fillStyle = this.color; ctx.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - 1), Math.round(y - 1), 2, 2); }
    ctx.restore();
  }
}

const PAYOFFS = {
  AirSeam(s, dt, gw) {
    if (every(s, 'cut', 1, dt)) for (const t of foesOf(gw, s.team)) { const q = seg(s.a, s.b, t.x, t.z ?? s.z); if (q.d < 18) { hit(t, Math.round(8 * powOf(s)), 0, 130, .2); fx(t, colorOf(s)); } }
    if ((s.torn || s.isFinished) && once(s, 'snap')) for (const t of foesOf(gw, s.team)) { const q = seg(s.a, s.b, t.x, t.z ?? s.z); if (q.d < 26) { hit(t, Math.round(18 * powOf(s)), 0, 180, .35); fx(t, colorOf(s), 12); } }
  },
  StillFugue(s, dt, gw) {
    if (s.t >= 4.6 && once(s, 'implode')) {
      ring(s.x, s.z, s.R, colorOf(s)); combat.shakeCamera?.(6, .2); combat.spawnDamageText?.(s.x, gy(s.z) - 90, 'IMPLOSION', { color: colorOf(s) });
      for (const t of foesOf(gw, s.team)) if (dist(t, s.x, s.z) < s.R) { hit(t, Math.round(26 * powOf(s)), (Math.sign(s.x - t.x) || 1) * 160, 120, .6); fx(t, colorOf(s), 12); }
    }
  },
  MirrorOffset(s, dt, gw) {
    if (s.t >= .25 && once(s, 'strike')) { const f = s.owner.facing || 1; s.swing = s.t; for (const t of foesOf(gw, s.team)) { const dx = (t.x - s.x) * f; if (dx > -10 && dx < 90 && Math.abs(((t.z ?? s.z) - s.z) * DEPTH) < 36) { hit(t, Math.round(16 * powOf(s)), f * 170, 80, .3); fx(t, colorOf(s)); } } }
  },
  FateNeedle(s, dt, gw) {
    const t = s.target; if (!t || t.isDead) return;
    if (s.t >= .2 && once(s, 'pierce')) { hit(t, Math.round(10 * powOf(s)), 0, 0, .2); applyStatus(t, 'bleed'); fx(t, colorOf(s)); }
    if (s.t >= 3.5 && !s.done && once(s, 'boom')) { hit(t, Math.round(22 * powOf(s)), (s.vec ?? 1) * 200, 140, .4); ring(t.x, t.z ?? s.z, 50, colorOf(s)); combat.spawnDamageText?.(t.x, (t.y ?? 0) - 90, 'NADELBRUCH', { color: colorOf(s) }); }
  },
  FloodRail(s, dt, gw) {
    if (s.t > .5 && every(s, 'soak', .5, dt)) for (const t of foesOf(gw, s.team)) if (s.inside(t)) { hit(t, Math.round(4 * powOf(s)), 0, 0, .05); applyStatus(t, 'wet'); }
  },
  EmberPump(s, dt, gw) {
    if (s.isDead) return;
    if (s.t >= 1.2 && once(s, 'heat')) s.trigger?.('heat', gw);
    if (s.t >= 3 && once(s, 'erupt')) {
      if (typeof s.burst === 'function') s.burst(gw);
      ring(s.x, s.z, 90, '#ff6d00'); combat.spawnDamageText?.(s.x, gy(s.z) - 90, 'AUSBRUCH', { color: '#ffab40' });
      // burst() already deals the blast damage; the eruption adds burning (no second hit).
      for (const t of foesOf(gw, s.team)) if (dist(t, s.x, s.z) < 100) { if (typeof s.burst !== 'function') hit(t, Math.round(24 * powOf(s)), (Math.sign(t.x - s.x) || 1) * 220, 160, .35); applyStatus(t, 'burn'); }
    }
  },
  SpaceFold(s, dt, gw) {
    // The fold snaps shut with a cut along it (also hits foes that never crossed).
    if ((s.collapsed || s.t > 9.6) && once(s, 'snap')) for (const t of foesOf(gw, s.team)) { const q = seg(s.a, s.b, t.x, t.z ?? s.z); if (q.d < 60) { hit(t, Math.round(16 * powOf(s)), 0, 140, .35); fx(t, colorOf(s), 12); } }
    if (s.collapsed) return; const sides = (s._po ??= {}).sides ??= new Map();
    for (const t of foesOf(gw, s.team)) { const q = seg(s.a, s.b, t.x, t.z ?? s.z); const was = sides.get(t); if (q.d < 40 && q.u > 0 && q.u < 1) { if (was != null && was !== q.side && q.side !== 0) { t.x += q.nx * q.side * 60; if (Number.isFinite(t.z)) t.z = Math.max(.04, Math.min(.96, t.z + q.nz * q.side * 60 / DEPTH)); hit(t, Math.round(10 * powOf(s)), q.nx * q.side * 200, 100, .3); fx(t, colorOf(s)); } sides.set(t, q.side); } else sides.delete(t); }
  },
  GlassField(s, dt, gw) {
    if (s.t > .5 && every(s, 'spike', 1.6, dt)) for (const t of foesOf(gw, s.team)) if (s.inside(t.x, t.z ?? s.z)) { hit(t, Math.round(10 * powOf(s)), 0, 150, .25); if (Math.random() < .4) applyStatus(t, 'bleed'); fx(t, '#e1f5fe', 10); }
  },
  BeamPrism(s, dt, gw) {
    if (s.isDead || s.t < .5 || !every(s, 'ray', 1.2, dt)) return;
    const t = foesOf(gw, s.team).filter((o) => dist(o, s.x, s.z) < 280).sort((p, q) => dist(p, s.x, s.z) - dist(q, s.x, s.z))[0]; if (!t) return;
    emit(new RayFx(s.x, gy(s.z) - 40, t.x, (t.y ?? gy(t.z)) - 36, '#ffd54f')); hit(t, Math.round(12 * powOf(s)), (Math.sign(t.x - s.x) || 1) * 120, 40, .2);
  },
  RiftSwitch(s, dt, gw) {
    if (!s.A || !s.B) return;
    // The edges draw nearby foes in; at the end both rifts snap shut on whoever stands close.
    for (const t of foesOf(gw, s.team)) for (const e of [s.A, s.B]) { const d = dist(t, e.x, e.z); if (d < 80 && d > 20) { t.x += Math.sign(e.x - t.x) * 50 * dt; if (Number.isFinite(t.z)) t.z += Math.sign(e.z - t.z) * .25 * dt; } }
    if ((s.t > 9.6 || s.uses >= 3) && once(s, 'shut')) for (const e of [s.A, s.B]) for (const t of foesOf(gw, s.team)) if (dist(t, e.x, e.z) < 70) { hit(t, Math.round(14 * powOf(s)), 0, 120, .3); fx(t, '#7c4dff', 12); } const cool = (s._po ??= {}).cool ??= new Map();
    for (const t of foesOf(gw, s.team)) { if ((cool.get(t) ?? 0) > s.t) continue; for (const [from, to] of [[s.A, s.B], [s.B, s.A]]) if (dist(t, from.x, from.z) < 24) { t.x = to.x + (Math.sign(to.x - from.x) || 1) * 26; if (Number.isFinite(t.z)) t.z = to.z; hit(t, Math.round(10 * powOf(s)), 0, 80, .3); fx(t, '#7c4dff', 12); cool.set(t, s.t + 2); break; } }
  },
  HunterBell(s, dt, gw) {
    if (s.isDead) return;
    for (const [k, at] of [['r1', .1], ['r2', .5], ['r3', .9]]) if (s.t >= at && once(s, k)) { const r = 80 + at * 200; ring(s.x, s.z, r, '#ffca28'); for (const t of foesOf(gw, s.team)) if (dist(t, s.x, s.z) < r) { hit(t, Math.round(6 * powOf(s)), 0, 0, .3); t.slow?.(.5, .3); } }
  },
  RuneCourt(s, dt, gw) {
    if (s.t < .4 || !every(s, 'judge', 1.5, dt)) return; let n = 0;
    for (const t of foesOf(gw, s.team)) if (dist(t, s.x, s.z) < s.R) { hit(t, Math.round(10 * powOf(s)), 0, 60, .25); t.slow?.(1, .6); fx(t, '#fff8e1', 10); n++; }
    if (n) combat.spawnDamageText?.(s.x, gy(s.z) - 100, 'URTEIL', { color: '#fff3c4' });
  },
  ExileCorridor(s, dt, gw) {
    const inside = (s._po ??= {}).inside ??= new Set();
    for (const t of foesOf(gw, s.team)) { const q = seg(s.a, s.b, t.x, t.z ?? s.z); const now = q.d < 20 && q.u > 0 && q.u < 1; if (now && !inside.has(t)) { hit(t, Math.round(6 * powOf(s)), 0, 0, .2); t.slow?.(1, .5); fx(t, colorOf(s)); } if (now) inside.add(t); else inside.delete(t); }
  },
  HarvestCircle(s, dt, gw) {
    if (s.released == null && every(s, 'ripen', 1.5, dt)) s.seeds = Math.min(3, (s.seeds ?? 0) + 1);
    if (s.released != null && once(s, 'lances')) for (const t of foesOf(gw, s.team).filter((o) => dist(o, s.x, s.z) < 280).sort((p, q) => dist(p, s.x, s.z) - dist(q, s.x, s.z)).slice(0, 3)) { hit(t, Math.round(16 * powOf(s)), 0, 260, .35); ring(t.x, t.z ?? s.z, 30, colorOf(s)); fx(t, colorOf(s), 12); }
  },
  ResonanceCorridor(s, dt, gw) {
    if (s.t > .8 && every(s, 'pulse', 1.6, dt)) { if (typeof s.pulse === 'function' && s.relays < 3) s.pulse(0); for (const t of foesOf(gw, s.team)) { const q = seg(s.a, s.b, t.x, t.z ?? s.z); if (q.d < 30) { hit(t, Math.round(8 * powOf(s)), 0, 70, .2); fx(t, colorOf(s)); } } }
  },
  WorldSeam(s, dt, gw) {
    const torn = (s._po ??= {}).torn ??= new Set(); const pts = s.pts ?? [];
    for (const t of foesOf(gw, s.team)) { if (torn.has(t)) continue; for (let i = 1; i < pts.length; i++) if (seg(pts[i - 1], pts[i], t.x, t.z ?? s.z).d < 18) { torn.add(t); hit(t, Math.round(12 * powOf(s)), 0, 120, .3); fx(t, colorOf(s), 12); break; } }
  },
  TimeStopField(s, dt, gw) {
    if (s.t >= .1 && once(s, 'freeze')) for (const t of foesOf(gw, s.team)) if (s.inside(t)) { t.freeze?.(1.2); t.slow?.(1.2, .1); fx(t, '#b3e5fc', 10); }
  }
};

export function runSimplePayoffs(spells, dt, gw) {
  for (const s of spells?.activeSpells ?? []) { const fn = PAYOFFS[s?.constructor?.name]; if (fn && s.team && !s.isFinished) { try { fn(s, dt, gw); } catch { /* a payoff must never break the frame */ } } }
}

// S26 Marionettenfaden: with no crate / wall / small foe at the spot, the threads seize the nearest foe and pull it in.
const s26 = signatureImpl?.('S26');
if (s26?.cast) {
  const base = s26.cast;
  s26.cast = function (c) {
    const before = new Set(sigSink()?.activeSpells ?? []);
    const r = base.call(this, c);
    const made = (sigSink()?.activeSpells ?? []).some((s) => !before.has(s) && s.constructor?.name !== 'CastCircleFx' && s.constructor?.name !== 'DebrisLayer');
    if (!made) {
      const o = c.caster; const pt = c.target ?? { x: o.x + (o.facing || 1) * 120, z: o.z };
      const t = foesOf(c.gw, o.team).filter((e) => dist(e, pt.x, pt.z) < 200).sort((p, q) => dist(p, pt.x, pt.z) - dist(q, pt.x, pt.z))[0];
      if (t) { const dx = o.x - t.x; t.x += Math.sign(dx) * Math.min(Math.abs(dx) - 40, 90); hit(t, Math.round(10 * (c.quality?.power ?? 1)), Math.sign(dx) * 120, 60, .5); t.slow?.(1.5, .15); emit(new RayFx(o.x, (o.y ?? gy(o.z)) - 50, t.x, (t.y ?? gy(t.z)) - 40, '#e1bee7')); combat.spawnDamageText?.(t.x, (t.y ?? 0) - 90, 'GEFESSELT', { color: '#e1bee7' }); }
    }
    return r;
  };
}
