// GRIMGE Prototype — signature passives for the round-2 Arcane States (user, 27 Oct 2026: forms should play
// differently, like Fadenschlag's swing / Blutarsenal's bleed). Each matches the form's back pieces (vfx_arcane2.cjs):
//   T23 Nullfeldträger  the three negative spaces swallow hostile projectiles that come close (each void then
//                       recharges 2 s); the swallowed shot is shown collapsing into the void.
//   T24 Fadenregent     the two marionettes strike the nearest foe on their side by themselves every 2.5 s.
//   T08 Ossuarium       every third landed melee hit rings the bells: a sound burst paralyses foes around (1 s).
//   Kältestillstand T35 foes that come within reach freeze for 1.6 s (once per foe every 6 s).
// Round 1 forms (user, 27 Oct 2026: "Mechaniken für die älteren Formen"; A05 / A06 / A08 already have theirs):
//   T02 Schlackenkern   OFENHITZE  every landed hit heats the kiln; the 5th makes it erupt — burning slag around.
//   T04 Korallenschild  KORALLENWEHR  a coral shield (25, up to 40) regrows every 5 s.
//   T05 Bruchflug       SCHWERELOS  falling turns into a slow glide (the broken gravity fins hold the hero).
//   T06 Ionspindel      LADUNG  every landed hit charges the spindle; the 5th chains lightning to up to 3 foes.
import { foesOf, hit, projectilesOf, projKill, sigWorld, DEPTH } from './signature_core.js';
// The game world: the signature world when set, else the global one (also set in tests).
const worldOf = () => sigWorld() ?? globalThis.window?.gameWorld ?? null;
import { listen } from './signature_runes.js';
import { applyStatus } from './status_effects.js';
import { combat } from './combat.js';
import { spells } from './spells.js';

export const PASSIVES = Object.freeze({ heatHits: 5, eruptR: 90, eruptDmg: 24, coralEvery: 5, coralGain: 25, coralCap: 40, glideFall: -150, chargeHits: 5, chainDmg: 18, chainJumps: 3, chainReach: 170, voidR: 34, voidCd: 2, puppetEvery: 2.5, puppetReach: 110, puppetDmg: 12, bellEvery: 3, bellR: 96, frostR: 56, frostCd: 6 });
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

// T02 / T06: hit counters on one listener per hero (form id read at event time).
const counters = new WeakMap();
function countListen(p) {
  let l = counters.get(p);
  if (l && !l.isFinished) return;
  l = { owner: p, isFinished: false, n: 0, onSigEvent(type, info) {
    const id = p.buffForm?.timer > 0 ? p.buffForm.id : null;
    if (id !== 'T02' && id !== 'T06') { this.isFinished = true; return; }
    if (type !== 'hit') return; const hits = (info.hits ?? []).filter((h) => !h.blocked && !h.target?.isProp); if (!hits.length) return;
    this.n++; const gw = worldOf();
    if (id === 'T02' && this.n % PASSIVES.heatHits === 0) {
      for (const t of foesOf(gw, p.team)) if (Math.hypot(t.x - p.x, ((t.z ?? p.z) - p.z) * DEPTH) < PASSIVES.eruptR) { hit(t, PASSIVES.eruptDmg, Math.sign(t.x - p.x || 1) * 220, 180, .4); applyStatus(t, 'burn'); }
      flash(p.x, p.y - 40, '#ff5a1f', { r0: 8, r1: PASSIVES.eruptR, dur: .35 }); combat.spawnDamageText?.(p.x, p.y - 112, 'OFEN BRICHT AUS', { color: '#ff8a3a' }); combat.shakeCamera(5, .14);
    } else if (id === 'T02') combat.spawnDamageText?.(p.x - (p.facing || 1) * 20, p.y - 96, 'HITZE ' + (this.n % PASSIVES.heatHits) + '/' + PASSIVES.heatHits, { color: '#ffb84a' });
    if (id === 'T06' && this.n % PASSIVES.chargeHits === 0) {
      let from = hits[0].target; const done = new Set([from]);
      for (let j = 0; j < PASSIVES.chainJumps; j++) { const next = foesOf(gw, p.team).filter((o) => !done.has(o) && Math.abs(o.x - from.x) < PASSIVES.chainReach).sort((a, b) => Math.abs(a.x - from.x) - Math.abs(b.x - from.x))[0]; if (!next) break; done.add(next); hit(next, PASSIVES.chainDmg, Math.sign(next.x - from.x || 1) * 120, 40, .3); applyStatus(next, 'paralysis', { duration: .6 }); flash(next.x, (next.y ?? 0) - 40, '#2fd070', { r1: 14, dur: .2 }); from = next; }
      combat.spawnDamageText?.(p.x, p.y - 112, 'KETTENBLITZ', { color: '#a8ffc8' });
    }
  } };
  counters.set(p, listen(l));
}
// Called every form update (buff_forms.updateBuffForm).
export function arcanePassivesTick(p, dt, form) {
  if (!form || !p.buffForm) return;
  const gw = worldOf();
  if (form.id === 'T23') voidTick(p, dt);
  else if (form.id === 'T24') puppetTick(p, dt, gw);
  else if (form.id === 'T35') frostTick(p, gw);
  else if (form.id === 'T08') bellListen(p);
  else if (form.id === 'T02' || form.id === 'T06') countListen(p);
  else if (form.id === 'T04') { p._coralT = (p._coralT ?? PASSIVES.coralEvery) - dt; if (p._coralT <= 0) { p._coralT = PASSIVES.coralEvery; p.arcaneShield = Math.min(PASSIVES.coralCap, Math.max(0, p.arcaneShield ?? 0) + PASSIVES.coralGain); p.arcaneShieldTimer = Math.max(p.arcaneShieldTimer ?? 0, PASSIVES.coralEvery); } }
  else if (form.id === 'T05' && !p.grounded && (p.vElevation ?? 0) < PASSIVES.glideFall) p.vElevation = PASSIVES.glideFall; // glide
}
