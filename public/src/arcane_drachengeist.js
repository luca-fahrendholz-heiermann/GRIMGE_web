// GRIMGE Prototype — A11 DRACHENGEIST (user, 27 Oct 2026, after example sprite 20: a horned dragon spirit rising
// behind the hero, a fire aura — own adaptation, no foreign character; dragons must be impressive dragons, not worms,
// so it uses the dragon kit). Fire Arcane State; the dragon's neck curls up behind the back and its horned head
// towers above the hero; a blaze burns behind the body (as_A11 sheets) and the contour glows orange.
//   forward  short DRACHENBISS    the head lunges down the lane and bites (burn by chance)
//            full  DRACHENATEM    a long cone of dragon fire from the jaws
//   up       short AUFSTIEG       the dragon shoots up from the ground ahead and throws foes into the air
//            full  HIMMELSSTURZ   the whole dragon dives from the sky onto the area ahead, leaves a burning crater
//   down     short SCHWEIFRING    the dragon sweeps a ring of fire around the hero
//            full  DRACHENWACHT   the dragon coils around the hero for 1.5 s, burning everything close
//   passive  melee hits set foes on fire (30 %).
import { ARCANE_MOVES, ARCANE_CHARGE } from './arcane_moves.js';
import { SigSequence, foesOf, hit, DEPTH } from './signature_core.js';
import { listen } from './signature_runes.js';
import { hashStr, TAU } from './buff_v32_kit.js';
import { applyStatus } from './status_effects.js';
import { registerFormExtra } from './buff_vfx.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';
import { drawDragon, drawDragonHead, dragonReady, drawBreathCone } from './spell_visuals.js';

export const DRACHENGEIST = Object.freeze({ burnChance: .3, look: 'ember' });
const LOOK = DRACHENGEIST.look;
const fade = (k, inT = .1, outT = .3) => Math.max(0, Math.min(1, k / inT, (1 - k) / outT));
const ahead = (len, w = 28) => (s) => (t, dx, dz) => dx * s.facing > -8 && dx * s.facing < len && Math.abs(dz) < w;
const around = (r, ox = 0) => (s) => (t, dx, dz) => Math.hypot(dx - s.facing * ox, dz) < r;
// A real burning status (status_effects.js), like Blutarsenal's bleed.
const burn = (s, k = 1) => (t) => { if (Math.random() < k) applyStatus(t, 'burn'); };
// While a technique runs the dragon acts in it: the idle spirit behind the back hides (timestamp).
const seq = (f, p, o) => { const s = new SigSequence({ mat: f.mat, seed: hashStr(f.id) }, p, { ...o, tick: (sq, dt, gw) => { sq.caster._dragonBusyUntil = performance.now() + 120; o.tick?.(sq, dt, gw); } }); s.fineVfx = true; return s; };
// The idle spirit: neck rising from behind the back hip, head towering above the hero, facing forward.
function spiritSpine(x, y, f, t) {
  const b = Math.sin(t * 2) * 2;
  return [[x + f * 20, y - 122 + b], [x + f * 2, y - 120 + b], [x - f * 12, y - 110 + b], [x - f * 22, y - 92 + b * .6], [x - f * 26, y - 72], [x - f * 22, y - 52], [x - f * 14, y - 34]];
}

registerFormExtra('A11', (ctx, s, pose, form, layer, a) => {
  const p = pose.player; if (layer !== 'back' || !p || !dragonReady(LOOK)) return;
  if ((p._dragonBusyUntil ?? 0) > performance.now()) return;
  const t = pose.t; const open = pose.tech ? .9 : (Math.sin(t * 1.3) > .85 ? .5 : 0);
  drawDragon(ctx, LOOK, spiritSpine(p.x, s.y, s.f, t), { thickness: 1.15, open, alpha: a, t });
});

// Helpers for the techniques: a spine between two points with an S-wave, head first.
function spineTo(hx, hy, tx, ty, n = 7, wave = 10, t = 0) { const out = []; for (let i = 0; i < n; i++) { const u = i / (n - 1); out.push([hx + (tx - hx) * u + Math.sin(u * Math.PI * 2 + t * 6) * wave * (u > .05 ? 1 : 0) * .3, hy + (ty - hy) * u + Math.sin(u * Math.PI * 1.5 + t * 5) * wave]); } return out; }

ARCANE_MOVES.A11 = [
  // forward short — DRACHENBISS: the head lunges 170 px down the lane and bites.
  (f, p) => seq(f, p, { dur: .6, steps: [{ at: .22, fn: (s, gw) => { s.strike(gw, ahead(170, 28)(s), 30, (t, dx) => Math.sign(dx || s.facing) * 220, 80, .45, { onHit: burn(s, .5) }); combat.shakeCamera(4, .1); } }],
    draw: (ctx, s, k) => { const c = s.caster; const lunge = Math.sin(Math.min(1, s.t / .3) * Math.PI / 2) * (s.t < .4 ? 1 : Math.max(0, 1 - (s.t - .4) / .2)); const hx = c.x + s.facing * (20 + 150 * lunge); const hy = c.y - 60 - 30 * (1 - lunge);
      drawDragon(ctx, LOOK, spineTo(hx, hy, c.x - s.facing * 14, c.y - 40, 7, 12, s.t), { thickness: 1, open: s.t > .15 && s.t < .3 ? 1 : .2, alpha: fade(k, .05, .25), t: s.t }); } }),
  // forward full — DRACHENATEM: a long cone of fire from the jaws (eight ticks).
  (f, p) => seq(f, p, { dur: 1.3, steps: Array.from({ length: 8 }, (_, i) => ({ at: .25 + i * .11, fn: (s, gw) => s.strike(gw, (t, dx, dz) => dx * s.facing > 10 && dx * s.facing < 300 && Math.abs(dz) < 18 + dx * s.facing * .18, 9, (t, dx) => Math.sign(dx || s.facing) * 70, 10, .2, { again: true, onHit: burn(s, .25) }) })),
    draw: (ctx, s, k) => { const c = s.caster; const hx = c.x + s.facing * 26; const hy = c.y - 92; drawDragon(ctx, LOOK, spineTo(hx, hy, c.x - s.facing * 16, c.y - 38, 7, 8, s.t), { thickness: 1.05, open: s.t > .2 ? 1 : .3, alpha: fade(k, .08, .2), t: s.t });
      if (s.t > .2 && s.t < 1.2) drawBreathCone(ctx, hx + s.facing * 26, hy + 6, s.facing, 280, s.t, Math.min(1, (s.t - .2) * 4)); } }),
  // up short — AUFSTIEG: the dragon bursts up from the ground ahead, launching foes.
  (f, p) => seq(f, p, { dur: .75, x: p.x + (p.facing || 1) * 90, steps: [{ at: .12, fn: (s, gw) => { s.strike(gw, around(56)(s), 26, (t, dx) => Math.sign(dx || 1) * 60, 520, .45, { onHit: burn(s, .4) }); combat.shakeCamera(4, .1); } }],
    draw: (ctx, s, k) => { const gyy = groundYForDepth(s.z); const rise = Math.min(1, s.t / .25); const hy = gyy - 30 - 150 * rise; drawDragon(ctx, LOOK, spineTo(s.x, hy, s.x + s.facing * 6, gyy + 4, 7, 6, s.t), { thickness: 1.1, open: rise > .6 ? 1 : .4, alpha: fade(k, .05, .3), t: s.t }); } }),
  // up full — HIMMELSSTURZ: the dragon dives from the sky onto the area ahead and leaves a burning crater.
  (f, p) => seq(f, p, { dur: 1.2, x: p.x + (p.facing || 1) * 130, steps: [{ at: .55, fn: (s, gw) => { s.strike(gw, around(96)(s), 58, (t, dx) => Math.sign(dx || 1) * 300, 260, .6, { again: true, onHit: burn(s, .8) }); environment.add?.('scorch', s.x, s.z, { radius: 70, life: 6 }); combat.shakeCamera(12, .3); } }],
    draw: (ctx, s, k) => { const gyy = groundYForDepth(s.z); const d = Math.min(1, s.t / .55); const hx = s.x - s.facing * 140 * (1 - d); const hy = gyy - 260 * (1 - d) - 20; if (s.t < .7) drawDragon(ctx, LOOK, spineTo(hx, hy, hx - s.facing * 120, hy - 140, 8, 14, s.t), { thickness: 1.3, open: 1, alpha: fade(k, .05, .3), t: s.t });
      if (s.t > .55) { const e = (s.t - .55) / .65; ctx.save(); ctx.globalAlpha = 1 - e; ctx.fillStyle = '#ffd27a'; const n = 48; for (let i = 0; i < n; i++) { const a = i / n * TAU; ctx.fillRect(Math.round(s.x + Math.cos(a) * 96 * e), Math.round(gyy + Math.sin(a) * 30 * e), 3, 3); } ctx.restore(); } } }),
  // down short — SCHWEIFRING: the dragon sweeps a ring of fire around the hero.
  (f, p) => seq(f, p, { dur: .7, steps: [{ at: .2, fn: (s, gw) => s.strike(gw, around(84)(s), 22, (t, dx) => Math.sign(dx || 1) * 260, 80, .4, { onHit: burn(s, .5) }) }],
    draw: (ctx, s, k) => { const c = s.caster; const gyy = c.y - 30; const a0 = s.t * 9; const pts = Array.from({ length: 9 }, (_, i) => { const a = a0 - i * .45; return [c.x + Math.cos(a) * 62, gyy + Math.sin(a) * 20]; }); drawDragon(ctx, LOOK, pts, { thickness: .9, open: .6, alpha: fade(k, .05, .3), t: s.t, behind: (i) => Math.sin(a0 - i * .45) < 0 }); } }),
  // down full — DRACHENWACHT: the dragon coils around the hero for 1.5 s, burning everything close (six ticks).
  (f, p) => seq(f, p, { dur: 1.6, steps: Array.from({ length: 6 }, (_, i) => ({ at: .15 + i * .24, fn: (s, gw) => { s.x = s.caster.x; s.z = s.caster.z; s.strike(gw, around(108)(s), 10, (t, dx) => Math.sign(dx || 1) * 140, 40, .25, { again: true, onHit: burn(s, .6) }); } })),
    draw: (ctx, s, k) => { const c = s.caster; const pts = Array.from({ length: 12 }, (_, i) => { const a = s.t * 4 - i * .55; return [c.x + Math.cos(a) * 46, c.y - 18 - i * 8 + Math.sin(a) * 14]; }).reverse(); drawDragon(ctx, LOOK, pts, { thickness: 1, open: .7, alpha: fade(k, .08, .25), t: s.t, behind: (i) => Math.sin(s.t * 4 - (11 - i) * .55) < 0 }); } })
];
// Charge ritual: a small dragon head forms of embers at the charge point, its jaws opening at FULL.
ARCANE_CHARGE.A11 = (ctx, s, mat, dir, k, t) => {
  const x = s.x + s.f * (dir === 'up' ? 6 : 34); const y = dir === 'up' ? s.y - 96 : dir === 'down' ? s.y - 10 : s.y - 50;
  if (!drawDragonHead(ctx, LOOK, x, y, s.f, 0, .45 + .25 * k, k > .8 ? 1 : 0, .5 + .5 * k)) { ctx.save(); ctx.fillStyle = '#ff5a1f'; ctx.fillRect(Math.round(x - 3), Math.round(y - 3), 6, 6); ctx.restore(); }
};
// Passive: melee hits set foes on fire (30 %).
const listeners = new WeakMap();
export function drachengeistTick(p, form) {
  if (form?.id !== 'A11' || !p.buffForm) return;
  let l = listeners.get(p);
  if (!l || l.isFinished) {
    l = { owner: p, isFinished: false, onSigEvent(type, info) {
      if (!p.buffForm || p.buffForm.id !== 'A11') { this.isFinished = true; return; }
      if (type !== 'hit') return;
      for (const h of info.hits ?? []) if (!h.blocked && !h.target?.isProp && Math.random() < DRACHENGEIST.burnChance) applyStatus(h.target, 'burn');
    } };
    listeners.set(p, listen(l));
  }
}
