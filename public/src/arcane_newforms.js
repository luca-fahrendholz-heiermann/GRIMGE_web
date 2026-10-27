// GRIMGE Prototype — three Arcane States from the user's example sprites (27 Oct 2026; own adaptations):
//   A12 DONNERKRANZ   a drum ring behind the shoulders, lightning drum to drum (sprite 17). Lightning.
//                     passive: every 4 s a drum strikes the nearest foe with lightning.
//   A13 TOTENMASKE    black-red war armour with a crest plume and war banners, green soul fire (13/14, 19). Shadow.
//                     passive: defeated foes leave a soul skull that heals the hero when walked over.
//   A14 FEUERSIEGEL   a burning seal wheel on the back, seal marks branded on foes (23). Fire.
//                     passive: melee hits brand a seal mark; the 3rd mark on a foe explodes.
// Each has six techniques (forward / up / down × short / full) of its own, built from compact strike primitives.
import { ARCANE_MOVES, ARCANE_CHARGE } from './arcane_moves.js';
import { SigSequence, foesOf, hit, sigWorld, DEPTH } from './signature_core.js';
import { listen } from './signature_runes.js';
import { hashStr, TAU } from './buff_v32_kit.js';
import { applyStatus } from './status_effects.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { drawSpellSprite, spellSheetReady, drawSheetBeam } from './spell_visuals.js';
import { spells } from './spells.js';

export const NEWFORMS = Object.freeze({ drumEvery: 4, drumDmg: 14, drumReach: 320, skullHeal: 12, skullLife: 8, markDmg: 30, marks: 3 });
const worldOf = () => sigWorld() ?? globalThis.window?.gameWorld ?? null;
const fade = (k, inT = .1, outT = .3) => Math.max(0, Math.min(1, k / inT, (1 - k) / outT));
const ahead = (len, w = 26) => (s) => (t, dx, dz) => dx * s.facing > -8 && dx * s.facing < len && Math.abs(dz) < w;
const around = (r, ox = 0) => (s) => (t, dx, dz) => Math.hypot(dx - s.facing * ox, dz) < r;
const seq = (f, p, o) => { const s = new SigSequence({ mat: f.mat, seed: hashStr(f.id) }, p, o); s.fineVfx = true; return s; };
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const st = (list) => (t) => { for (const k of list) applyStatus(t, k); };
// A crisp zigzag bolt with barbs (lightning look of the project), 2 px wide with a white core.
function bolt(ctx, x0, y0, x1, y1, seed, a = 1, col = '#fff07a') {
  let r = seed; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280); const n = 7; let pxx = x0; let pyy = y0; const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  ctx.save(); ctx.globalAlpha = a;
  for (let j = 1; j <= n; j++) { const off = j < n ? (j % 2 ? 1 : -1) * (3 + rnd() * 6) : 0; const nx = x0 + (x1 - x0) * j / n - (y1 - y0) / L * off; const ny = y0 + (y1 - y0) * j / n + (x1 - x0) / L * off; const m = Math.ceil(Math.hypot(nx - pxx, ny - pyy) / 2);
    for (let k = 0; k <= m; k++) { const x = pxx + (nx - pxx) * k / m; const y = pyy + (ny - pyy) * k / m; px(ctx, x - 1, y - 1, 3, 3, col); px(ctx, x, y, 1, 1, '#ffffff'); } pxx = nx; pyy = ny; }
  ctx.restore();
}
const ring = (ctx, x, y, rx, ry, col, a = 1) => { ctx.save(); ctx.globalAlpha = a; const n = Math.max(12, Math.round((rx + ry) * 1.4)); for (let i = 0; i < n; i++) { const t = i / n * TAU; px(ctx, x + Math.cos(t) * rx, y + Math.sin(t) * ry, 2, 2, col); } ctx.restore(); };
const gy = (s) => groundYForDepth(s.z);

// ── A12 DONNERKRANZ ───────────────────────────────────────────────────────
ARCANE_MOVES.A12 = [
  // forward short — TROMMELSCHLAG: a bolt down the lane from the front drum.
  (f, p) => seq(f, p, { dur: .4, steps: [{ at: .06, fn: (s, gw) => s.strike(gw, ahead(260, 18)(s), 26, 140, 30, .35, { onHit: st(['paralysis']) }) }],
    draw: (ctx, s, k) => { const c = s.caster; bolt(ctx, c.x + s.facing * 20, c.y - 70, c.x + s.facing * 270, c.y - 44, 11 + Math.floor(s.t * 30), fade(k, .03, .4)); } }),
  // forward full — DONNERWALZE: six bolts roll down the lane one after another.
  (f, p) => seq(f, p, { dur: 1.1, steps: Array.from({ length: 6 }, (_, i) => ({ at: .1 + i * .14, fn: (s, gw) => { s.x = s.caster.x + s.facing * (50 + i * 50); s.strike(gw, around(40)(s), 16, (t, dx) => Math.sign(dx || 1) * 120, 60, .3, { again: true, onHit: st(['paralysis']) }); } })),
    draw: (ctx, s) => { const c = s.caster; for (let i = 0; i < 6; i++) { const e = s.t - (.1 + i * .14); if (e < 0 || e > .2) continue; const x = c.x + s.facing * (50 + i * 50); bolt(ctx, x + 6, gy(s) - 160, x, gy(s), 30 + i * 7 + Math.floor(e * 40), 1 - e * 4); } } }),
  // up short — HIMMELSTROMMEL: a bolt from the sky onto the foe ahead, launching it.
  (f, p) => seq(f, p, { dur: .5, x: p.x + (p.facing || 1) * 80, steps: [{ at: .08, fn: (s, gw) => s.strike(gw, around(44)(s), 24, 0, 480, .4, { onHit: st(['paralysis']) }) }],
    draw: (ctx, s, k) => { bolt(ctx, s.x + 10, gy(s) - 200, s.x, gy(s), 70 + Math.floor(s.t * 30), fade(k, .03, .4)); ring(ctx, s.x, gy(s), 30 * Math.min(1, s.t * 6), 9 * Math.min(1, s.t * 6), '#fff07a', fade(k)); } }),
  // up full — GEWITTERKRANZ: the drum ring rises above the hero, six bolts fall around.
  (f, p) => seq(f, p, { dur: 1.3, steps: Array.from({ length: 6 }, (_, i) => ({ at: .2 + i * .15, fn: (s, gw) => { const a = i / 6 * TAU; s.x = s.caster.x + Math.cos(a) * 90; s.z = s.caster.z + Math.sin(a) * 60 / DEPTH; s.strike(gw, around(46)(s), 18, 0, 300, .35, { again: true, onHit: st(['paralysis']) }); } })),
    draw: (ctx, s, k) => { const c = s.caster; ring(ctx, c.x, c.y - 120, 44, 14, '#e6c062', fade(k)); for (let i = 0; i < 6; i++) { const e = s.t - (.2 + i * .15); if (e < 0 || e > .2) continue; const a = i / 6 * TAU; const x = c.x + Math.cos(a) * 90; const yg = groundYForDepth(c.z + Math.sin(a) * 60 / DEPTH); bolt(ctx, c.x + Math.cos(a) * 44, c.y - 120 + Math.sin(a) * 14, x, yg, 90 + i * 9, 1 - e * 4); } } }),
  // down short — DONNERSTOSS: a shock ring around the hero.
  (f, p) => seq(f, p, { dur: .45, steps: [{ at: .05, fn: (s, gw) => s.strike(gw, around(80)(s), 20, (t, dx) => Math.sign(dx || 1) * 240, 60, .35, { onHit: st(['paralysis']) }) }],
    draw: (ctx, s, k) => { const c = s.caster; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; bolt(ctx, c.x, gy(s) - 10, c.x + Math.cos(a) * 80 * k * 1.5, gy(s) + Math.sin(a) * 24 * k * 1.5, i * 13 + Math.floor(s.t * 30), fade(k, .03, .3)); } } }),
  // down full — TROMMELWIRBEL: the drums beat 8 times, each beat a shock around.
  (f, p) => seq(f, p, { dur: 1.5, steps: Array.from({ length: 8 }, (_, i) => ({ at: .1 + i * .16, fn: (s, gw) => { s.x = s.caster.x; s.z = s.caster.z; s.strike(gw, around(110)(s), 9, (t, dx) => Math.sign(dx || 1) * 90, 20, .2, { again: true, onHit: i === 7 ? st(['paralysis']) : null }); combat.shakeCamera(2, .05); } })),
    draw: (ctx, s, k) => { const c = s.caster; const beat = ((s.t - .1) / .16) % 1; ring(ctx, c.x, gy(s), 30 + beat * 80, 9 + beat * 24, '#fff07a', (1 - beat) * fade(k)); } })
];
ARCANE_CHARGE.A12 = (ctx, s, mat, dir, k, t) => { const x = s.x + s.f * (dir === 'up' ? 6 : 34); const y = dir === 'up' ? s.y - 96 : dir === 'down' ? s.y - 6 : s.y - 50; ring(ctx, x, y, 14 - k * 6, 14 - k * 6, '#e6c062', .9); if (Math.floor(t * 20) % 2) bolt(ctx, x - 12, y - 8, x + 12, y + 8, Math.floor(t * 30), .9); };

// ── A13 TOTENMASKE ────────────────────────────────────────────────────────
const soulFire = (ctx, x, y, a = 1, sc = 1) => { if (spellSheetReady('soul_skull')) drawSpellSprite(ctx, 'soul_skull', Math.floor(performance.now() / 90) % 6, x, y, { anchor: 'center', alpha: a, scale: sc }); else px(ctx, x - 4, y - 4, 8, 8, '#4fffb0'); };
ARCANE_MOVES.A13 = [
  // forward short — SEELENSCHNITT: a soul-fire crescent flies down the lane.
  (f, p) => seq(f, p, { dur: .55, steps: [{ at: .06, fn: (s, gw) => s.strike(gw, ahead(240, 24)(s), 28, 160, 40, .4) }],
    draw: (ctx, s, k) => { const c = s.caster; const x = c.x + s.facing * (30 + 220 * Math.min(1, s.t / .4)); ctx.save(); ctx.globalAlpha = fade(k, .05, .3); for (let i = -6; i <= 6; i++) px(ctx, x - s.facing * Math.abs(i) * 1.6, c.y - 44 + i * 3, 4, 3, Math.abs(i) < 2 ? '#d0ffe8' : '#4fffb0'); ctx.restore(); } }),
  // forward full — TOTENZUG: soul skulls stream down the lane, each hits.
  (f, p) => seq(f, p, { dur: 1.2, steps: Array.from({ length: 5 }, (_, i) => ({ at: .15 + i * .16, fn: (s, gw) => s.strike(gw, ahead(300, 30)(s), 12, 80, 20, .25, { again: true }) })),
    draw: (ctx, s, k) => { const c = s.caster; for (let i = 0; i < 5; i++) { const e = s.t - .15 - i * .16; if (e < 0 || e > .5) continue; soulFire(ctx, c.x + s.facing * (30 + e * 600), c.y - 48 + Math.sin(e * 20 + i) * 6, 1 - e); } } }),
  // up short — BANNERHIEB: the banner pole sweeps up, launching the foe ahead.
  (f, p) => seq(f, p, { dur: .5, steps: [{ at: .1, fn: (s, gw) => s.strike(gw, ahead(100, 30)(s), 24, 40, 500, .4) }],
    draw: (ctx, s, k) => { const c = s.caster; const a = -2.4 + Math.min(1, s.t / .2) * 2; ctx.save(); ctx.globalAlpha = fade(k); for (let r = 0; r < 70; r++) px(ctx, c.x + s.facing * Math.cos(a) * r, c.y - 40 + Math.sin(a) * r, 2, 2, r > 50 ? '#3a3a48' : '#5a3a20'); ctx.restore(); } }),
  // up full — SEELENSÄULE: a column of green soul fire bursts up ahead.
  (f, p) => seq(f, p, { dur: 1, x: p.x + (p.facing || 1) * 100, steps: Array.from({ length: 4 }, (_, i) => ({ at: .1 + i * .18, fn: (s, gw) => s.strike(gw, around(48)(s), 14, 0, 220, .3, { again: true }) })),
    draw: (ctx, s, k) => { for (let i = 0; i < 6; i++) soulFire(ctx, s.x + Math.sin(s.t * 8 + i) * 8, gy(s) - 20 - i * 26 * Math.min(1, s.t * 3), fade(k, .05, .3), 1 - i * .08); } }),
  // down short — TOTENKREIS: soul fire rings around the hero, foes are pushed back.
  (f, p) => seq(f, p, { dur: .55, steps: [{ at: .06, fn: (s, gw) => s.strike(gw, around(78)(s), 20, (t, dx) => Math.sign(dx || 1) * 260, 60, .35) }],
    draw: (ctx, s, k) => { const c = s.caster; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + s.t * 4; soulFire(ctx, c.x + Math.cos(a) * 60 * Math.min(1, s.t * 5), gy(s) - 14 + Math.sin(a) * 18, fade(k), .7); } } }),
  // down full — HEERBANN: a ghost host of soul skulls circles the hero for 1.5 s, hitting all around.
  (f, p) => seq(f, p, { dur: 1.6, steps: Array.from({ length: 6 }, (_, i) => ({ at: .15 + i * .23, fn: (s, gw) => { s.x = s.caster.x; s.z = s.caster.z; s.strike(gw, around(110)(s), 10, (t, dx) => Math.sign(dx || 1) * 100, 30, .2, { again: true }); } })),
    draw: (ctx, s, k) => { const c = s.caster; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + s.t * 3; soulFire(ctx, c.x + Math.cos(a) * 80, c.y - 40 + Math.sin(a) * 26, fade(k, .1, .25), .85); } } })
];
ARCANE_CHARGE.A13 = (ctx, s, mat, dir, k, t) => { const x = s.x + s.f * (dir === 'up' ? 6 : 34); const y = dir === 'up' ? s.y - 96 : dir === 'down' ? s.y - 10 : s.y - 50; soulFire(ctx, x, y, .5 + k * .5, .5 + k * .5); };

// ── A14 FEUERSIEGEL ───────────────────────────────────────────────────────
const sealAt = (ctx, x, y, a = 1, sc = 1) => { if (spellSheetReady('seal_mark')) drawSpellSprite(ctx, 'seal_mark', Math.floor(performance.now() / 120) % 4, x, y, { anchor: 'center', alpha: a, scale: sc }); else ring(ctx, x, y, 8, 8, '#ff5a1f', a); };
ARCANE_MOVES.A14 = [
  // forward short — SIEGELWURF: a burning seal flies down the lane, brands the first foe.
  (f, p) => seq(f, p, { dur: .5, steps: [{ at: .06, fn: (s, gw) => s.strike(gw, ahead(240, 22)(s), 20, 120, 20, .3, { onHit: (t) => { applyStatus(t, 'burn'); brand(s.caster, t); } }) }],
    draw: (ctx, s, k) => { const c = s.caster; sealAt(ctx, c.x + s.facing * (30 + 210 * Math.min(1, s.t / .35)), c.y - 46, fade(k, .03, .3)); } }),
  // forward full — FEUERWALZE: a flame road rolls down the lane.
  (f, p) => seq(f, p, { dur: 1.1, steps: Array.from({ length: 6 }, (_, i) => ({ at: .1 + i * .13, fn: (s, gw) => s.strike(gw, ahead(60 + i * 45, 26)(s), 9, 80, 10, .2, { again: true, onHit: (t) => applyStatus(t, 'burn') }) })),
    draw: (ctx, s, k) => { const c = s.caster; const L = 300 * Math.min(1, s.t / .8); if (!drawSheetBeam(ctx, 'fire', c.x + s.facing * 20, c.y - 20, c.x + s.facing * (20 + L), c.y - 20, s.t, fade(k, .05, .2))) px(ctx, Math.min(c.x, c.x + s.facing * L), c.y - 24, L, 8, '#ff5a1f'); } }),
  // up short — SIEGELSÄULE: a seal under the foe ahead flares up into a fire column.
  (f, p) => seq(f, p, { dur: .6, x: p.x + (p.facing || 1) * 90, steps: [{ at: .2, fn: (s, gw) => s.strike(gw, around(44)(s), 26, 0, 460, .4, { onHit: (t) => applyStatus(t, 'burn') }) }],
    draw: (ctx, s, k) => { sealAt(ctx, s.x, gy(s) - 4, fade(k), 1.4); if (s.t > .2) for (let i = 0; i < 8; i++) px(ctx, s.x - 8 + (i % 3) * 6, gy(s) - 10 - i * 14 * Math.min(1, (s.t - .2) * 6), 6, 10, i % 2 ? '#ffd27a' : '#ff5a1f'); } }),
  // up full — SIEGELREGEN: burning seals rain on the area ahead.
  (f, p) => seq(f, p, { dur: 1.2, x: p.x + (p.facing || 1) * 120, steps: Array.from({ length: 6 }, (_, i) => ({ at: .25 + i * .13, fn: (s, gw) => s.strike(gw, around(70)(s), 14, 0, 160, .3, { again: true, onHit: (t) => { applyStatus(t, 'burn'); brand(s.caster, t); } }) })),
    draw: (ctx, s, k) => { for (let i = 0; i < 6; i++) { const e = s.t - .1 - i * .13; if (e < 0 || e > .3) continue; const x = s.x + (i - 2.5) * 22; sealAt(ctx, x, gy(s) - 160 * (1 - e / .15), 1, .9); } } }),
  // down short — SIEGELBRAND: the seal slams on the ground, a fire ring.
  (f, p) => seq(f, p, { dur: .5, steps: [{ at: .06, fn: (s, gw) => s.strike(gw, around(80)(s), 20, (t, dx) => Math.sign(dx || 1) * 240, 60, .35, { onHit: (t) => applyStatus(t, 'burn') }) }],
    draw: (ctx, s, k) => { const c = s.caster; sealAt(ctx, c.x, gy(s), fade(k), 1 + k * 4); } }),
  // down full — SONNENSIEGEL: the wheel burns on the ground around the hero, then all marked foes explode.
  (f, p) => seq(f, p, { dur: 1.4, steps: [...Array.from({ length: 5 }, (_, i) => ({ at: .1 + i * .2, fn: (s, gw) => { s.x = s.caster.x; s.z = s.caster.z; s.strike(gw, around(110)(s), 8, 0, 10, .2, { again: true, onHit: (t) => { applyStatus(t, 'burn'); brand(s.caster, t); } }); } })), { at: 1.25, fn: (s, gw) => { for (const t of foesOf(gw, s.team)) if (t._sealMarks > 0) detonate(s.caster, t); } }],
    draw: (ctx, s, k) => { const c = s.caster; sealAt(ctx, c.x, gy(s), fade(k, .05, .2), 5.5); } })
];
ARCANE_CHARGE.A14 = (ctx, s, mat, dir, k, t) => { const x = s.x + s.f * (dir === 'up' ? 6 : 34); const y = dir === 'up' ? s.y - 96 : dir === 'down' ? s.y - 10 : s.y - 50; sealAt(ctx, x, y, .6 + k * .4, .6 + k * .6); };

// Seal marks: branded on foes (shown above them), the 3rd explodes.
// One overlay in the spell system draws the seal marks above branded foes while marks exist.
let overlay = null;
function sealOverlay(p) { if (overlay && !overlay.isFinished) return; overlay = { fineVfx: true, isVisualOnly: true, x: p.x, y: 0, z: 1, isFinished: false, t: 0, update(dt, gw) { this.t += dt; const any = foesOf(gw ?? worldOf(), p.team).some((o) => (o._sealMarks ?? 0) > 0); if (!any && this.t > 1) this.isFinished = true; }, render(ctx) { drawSealMarks(ctx, worldOf(), p.team); } }; spells.activeSpells?.push(overlay); }
function brand(p, t) { if (!t || t.isDead) return; t._sealMarks = (t._sealMarks ?? 0) + 1; t._sealBy = p; sealOverlay(p); if (t._sealMarks >= NEWFORMS.marks) detonate(p, t); }
function detonate(p, t) { const n = t._sealMarks ?? 0; t._sealMarks = 0; if (!n) return; hit(t, NEWFORMS.markDmg * (n / NEWFORMS.marks + .3), Math.sign(t.x - p.x || 1) * 260, 160, .5); combat.spawnHitSparks?.(t.x, (t.y ?? 0) - 40, 1, '#ffd27a', 14); combat.shakeCamera(5, .12); combat.spawnDamageText?.(t.x, (t.y ?? 0) - 90, 'SIEGEL BRICHT', { color: '#ffd27a' }); }

// ── Passives ──────────────────────────────────────────────────────────────
const listeners = new WeakMap();
const skulls = [];
export function newFormsTick(p, dt, form) {
  if (!form || !p.buffForm) return;
  const gw = worldOf();
  if (form.id === 'A12') {
    p._drumT = (p._drumT ?? NEWFORMS.drumEvery) - dt; if (p._drumT > 0) return; p._drumT = NEWFORMS.drumEvery;
    const t = foesOf(gw, p.team).filter((o) => Math.abs(o.x - p.x) < NEWFORMS.drumReach).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (!t) { p._drumT = .5; return; }
    hit(t, NEWFORMS.drumDmg, Math.sign(t.x - p.x || 1) * 80, 40, .3); applyStatus(t, 'paralysis', { duration: .8 });
    zap(p.x - (p.facing || 1) * 6, p.y - 88, t.x, (t.y ?? 0) - 40);
    return;
  }
  if (form.id === 'A13' || form.id === 'A14') {
    let l = listeners.get(p);
    if (!l || l.isFinished) {
      l = { owner: p, isFinished: false, id: form.id, onSigEvent(type, info) {
        if (!p.buffForm || p.buffForm.id !== this.id) { this.isFinished = true; return; }
        if (type !== 'hit') return;
        for (const h of info.hits ?? []) { if (h.blocked || h.target?.isProp) continue;
          if (this.id === 'A14') { brand(p, h.target); sealOverlay(p); }
          else if ((h.target.hp ?? 1) <= 0 || h.target.isDead) dropSkull(p, h.target); }
      } };
      listeners.set(p, listen(l));
    }
    if (form.id === 'A13') for (let i = skulls.length - 1; i >= 0; i--) { const s = skulls[i]; if (s.life <= 0) { skulls.splice(i, 1); continue; } if (s.owner !== p) continue; if (Math.hypot(s.x - p.x, (s.z - p.z) * DEPTH) < 26) { p.hp = Math.min(p.maxHp, p.hp + NEWFORMS.skullHeal); combat.spawnDamageText?.(p.x, p.y - 100, '+' + NEWFORMS.skullHeal + ' SEELE', { color: '#4fffb0' }); s.life = 0; } if (s.life <= 0) skulls.splice(i, 1); }
  }
}
function zap(x0, y0, x1, y1) { const seed = Math.floor(Math.random() * 1000); spells.activeSpells?.push({ fineVfx: true, isVisualOnly: true, x: x1, y: 0, z: 0, t: 0, isFinished: false, update(d) { this.t += d; if (this.t > .2) this.isFinished = true; }, render(ctx) { bolt(ctx, x0, y0, x1, y1, seed + Math.floor(this.t * 40), 1 - this.t * 4); } }); }
function dropSkull(p, t) { const s = { owner: p, x: t.x, z: t.z ?? p.z, life: NEWFORMS.skullLife }; skulls.push(s); spells.activeSpells?.push({ fineVfx: true, isVisualOnly: true, get x() { return s.x; }, get z() { return s.z; }, y: 0, isFinished: false, update(d) { s.life -= d; if (s.life <= 0) this.isFinished = true; } /* the skull fades in game time even after the form ends */, render(ctx) { soulFire(ctx, s.x, groundYForDepth(s.z) - 16 + Math.sin(performance.now() / 300) * 2, Math.min(1, s.life), .8); } }); }
// Seal marks above branded foes (drawn by the spell system as a tiny overlay per frame).
export function drawSealMarks(ctx, gw, team) { for (const t of foesOf(gw, team)) { const n = t._sealMarks ?? 0; for (let i = 0; i < n; i++) sealAt(ctx, t.x + (i - (n - 1) / 2) * 14, (t.y ?? 0) - 96, 1, .6); } }
