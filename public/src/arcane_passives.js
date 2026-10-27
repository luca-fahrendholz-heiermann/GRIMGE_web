// GRIMGE Prototype — signature passives for the round-2 Arcane States (user, 27 Oct 2026: forms should play
// differently, like Fadenschlag's swing / Blutarsenal's bleed). Each matches the form's back pieces (vfx_arcane2.cjs):
//   T23 Nullfeldträger  the three negative spaces swallow hostile projectiles that come close (each void then
//                       recharges 2 s); the swallowed shot is shown collapsing into the void.
//   T24 Fadenregent     the two marionettes strike the nearest foe on their side by themselves every 2.5 s.
//   T08 Ossuarium       every third landed melee hit rings the bells: a sound burst paralyses foes around (1 s).
//   Kältestillstand T35 foes that come within reach freeze for 1.6 s (once per foe every 6 s).
import { foesOf, hit, projectilesOf, projKill, sigWorld, DEPTH } from './signature_core.js';
// The game world: the signature world when set, else the global one (also set in tests).
const worldOf = () => sigWorld() ?? globalThis.window?.gameWorld ?? null;
import { listen } from './signature_runes.js';
import { applyStatus } from './status_effects.js';
import { combat } from './combat.js';
import { spells } from './spells.js';

export const PASSIVES = Object.freeze({ voidR: 34, voidCd: 2, puppetEvery: 2.5, puppetReach: 110, puppetDmg: 12, bellEvery: 3, bellR: 96, frostR: 56, frostCd: 6 });
const isForm = (p, id) => p?.buffForm?.id === id && p.buffForm.timer > 0;
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
// Positions of the three negative spaces (the back sheet: chest-centred offsets, mirrored with the facing).
const VOIDS = [[-24, -30], [22, -32], [-30, 10]];
const voidAt = (p, i) => [p.x + (p.facing || 1) * VOIDS[i][0], p.y - 58 + VOIDS[i][1]];

// A short visual (pixel ring collapsing / expanding), kept in the spell system.
function flash(x, y, color, { r0 = 4, r1 = 30, dur = .3, inward = false } = {}) {
  spells.activeSpells?.push({ fineVfx: true, isVisualOnly: true, x, y: 0, z: 0, t: 0, isFinished: false, update(dt) { this.t += dt; if (this.t > dur) this.isFinished = true; },
    render(ctx) { const k = this.t / dur; const r = inward ? r1 + (r0 - r1) * k : r0 + (r1 - r0) * k; ctx.save(); ctx.globalAlpha = 1 - k * .6; const n = Math.max(10, Math.round(r * 1.4)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * .6, 2, 2, color); } ctx.restore(); } });
}

function voidTick(p, dt) {
  const cd = (p._voidCd ??= [0, 0, 0]);
  for (let i = 0; i < 3; i++) cd[i] = Math.max(0, cd[i] - dt);
  for (const pr of projectilesOf(worldOf())) {
    if (!pr || pr.team === p.team || (pr.life ?? 1) <= 0 || pr.isFinished) continue;
    const py = (pr.y ?? 0); const pz = pr.z ?? p.z; if (Math.abs((pz - p.z) * DEPTH) > 40) continue;
    for (let i = 0; i < 3; i++) { if (cd[i] > 0) continue; const [vx, vy] = voidAt(p, i); if (Math.hypot(pr.x - vx, py - vy) > PASSIVES.voidR) continue;
      projKill(pr); cd[i] = PASSIVES.voidCd; flash(vx, vy, '#a4ff3d', { r0: 2, r1: 18, inward: true }); combat.spawnDamageText?.(vx, vy - 14, 'VERSCHLUCKT', { color: '#e6ff8a' }); break; }
  }
}
function puppetTick(p, dt, gw) {
  p._puppetT = (p._puppetT ?? 1) - dt; if (p._puppetT > 0) return;
  p._puppetT = PASSIVES.puppetEvery; let struck = 0;
  for (const side of [-1, 1]) {
    const sx = p.x + side * 36; const t = foesOf(gw, p.team).filter((o) => Math.sign(o.x - p.x || side) === side && Math.abs(o.x - sx) < PASSIVES.puppetReach && Math.abs(((o.z ?? p.z) - p.z) * DEPTH) < 40).sort((a, b) => Math.abs(a.x - sx) - Math.abs(b.x - sx))[0];
    if (!t) continue; hit(t, PASSIVES.puppetDmg, side * 140, 60, .3); struck++;
    combat.spawnHitSparks?.(t.x, (t.y ?? 0) - 40, side, '#ffd27a', 6); flash(t.x, (t.y ?? 0) - 40, '#5a6cff', { r1: 16, dur: .2 });
  }
  if (!struck) p._puppetT = .4; // nothing in reach: look again soon
}
function frostTick(p, gw) {
  const now = performance.now() / 1000; const cds = (p._frostCd ??= new WeakMap());
  for (const t of foesOf(gw, p.team)) {
    if (Math.hypot(t.x - p.x, ((t.z ?? p.z) - p.z) * DEPTH) > PASSIVES.frostR || (cds.get(t) ?? 0) > now) continue;
    cds.set(t, now + PASSIVES.frostCd); applyStatus(t, 'frozen'); flash(t.x, (t.y ?? 0) - 30, '#d8f6ff', { r1: 22 });
  }
}
// Ossuarium: a hit listener counts landed melee hits; every third rings the bells.
const listeners = new WeakMap();
function bellListen(p) {
  let l = listeners.get(p);
  if (l && !l.isFinished) return;
  l = { owner: p, isFinished: false, n: 0, onSigEvent(type, info) {
    if (!isForm(p, 'T08')) { this.isFinished = true; return; }
    if (type !== 'hit' || !(info.hits ?? []).some((h) => !h.blocked)) return;
    if (++this.n % PASSIVES.bellEvery) return;
    const gw = worldOf(); for (const t of foesOf(gw, p.team)) if (Math.hypot(t.x - p.x, ((t.z ?? p.z) - p.z) * DEPTH) < PASSIVES.bellR) applyStatus(t, 'paralysis', { duration: 1 });
    for (const r of [0, .1]) setTimeout(() => flash(p.x, p.y - 50, '#4fe0a8', { r0: 10, r1: PASSIVES.bellR, dur: .35 }), r * 1000);
    combat.spawnDamageText?.(p.x, p.y - 112, 'GLOCKENSCHLAG', { color: '#4fe0a8' }); combat.shakeCamera(3, .1);
  } };
  listeners.set(p, listen(l));
}

// Called every form update (buff_forms.updateBuffForm).
export function arcanePassivesTick(p, dt, form) {
  if (!form || !p.buffForm) return;
  const gw = worldOf();
  if (form.id === 'T23') voidTick(p, dt);
  else if (form.id === 'T24') puppetTick(p, dt, gw);
  else if (form.id === 'T35') frostTick(p, gw);
  else if (form.id === 'T08') bellListen(p);
}
