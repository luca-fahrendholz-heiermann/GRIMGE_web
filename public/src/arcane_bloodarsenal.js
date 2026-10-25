// GRIMGE Prototype — A09 BLUTARSENAL, a body power as Arcane State (user, 25 Oct 2026: after the blood-pact
// weapon "verschmolzen mit dem Charakter … so dann als Transformation bzw. Arcane State" — reference: a fighter
// fused with a whole arsenal of blood weapons; own adaptation, no foreign character). Non-elemental, boss drop
// only. Black-red veins run over the body, the eyes and a grin glow; a blood rifle grows out of the fore arm,
// a rocket launcher sits on the shoulder and two rifles sprout from the back. Every landed melee hit leaves
// the foe bleeding.
//   forward  short BLUTSALVE    a rifle burst down the lane          full GATLING-STURM  a rotary barrage
//   up       short RAKETENHUB   a rocket launches the foe            full RAKETENREGEN  rockets rain ahead
//   down     short DORNENBETT   blood spears burst up all around     full VOLLES ARSENAL every weapon fires
import { ARCANE_MOVES, ARCANE_CHARGE } from './arcane_moves.js';
import { SigSequence, foesOf, hit, DEPTH } from './signature_core.js';
import { listen } from './signature_runes.js';
import { TAU, clamp01, hashStr } from './buff_v32_kit.js';
import { registerFormRenderer } from './buff_vfx.js';
import { applyStatus } from './status_effects.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';

export const ARSENAL = Object.freeze({ bleedChance: .5, rocketDmg: 26, rocketR: 56 });
const gy = (s) => groundYForDepth(s.z);
const fade = (k, inT = .1, outT = .3) => Math.max(0, Math.min(1, k / inT, (1 - k) / outT));
const ahead = (len, w = 28) => (s) => (t, dx, dz) => dx * s.facing > -8 && dx * s.facing < len && Math.abs(dz) < w;
const around = (r) => () => (t, dx, dz) => Math.hypot(dx, dz) < r;
const outward = (kx) => (t, dx) => Math.sign(dx || 1) * kx;
// While a technique runs it holds its own weapons: the idle fore-arm rifle hides (a timestamp, so a cleared
// technique can never leave it hidden).
const seq = (f, p, o) => new SigSequence({ mat: f.mat, seed: hashStr(f.id) }, p, { ...o, tick: (s, dt, gw) => { s.caster._arsenalBusyUntil = performance.now() + 120; o.tick?.(s, dt, gw); } });
const bleed = () => (t) => applyStatus(t, 'bleed');
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
// A weapon sheet held with its grip at (x, y), facing f (sheets face right; grip offsets in sheet px).
const GRIP = Object.freeze({ blood_rifle: [30, 22, 92, 40], blood_gatling: [26, 24, 96, 44], blood_launcher: [30, 24, 88, 40] });
function weapon(ctx, name, frame, x, y, f, ang = 0, alpha = 1) {
  if (!spellSheetReady(name)) return;
  const [gx, gyy, w, h] = GRIP[name];
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(f, 1); ctx.rotate(ang);
  drawSpellSprite(ctx, name, frame, w / 2 - gx, h / 2 - gyy, { anchor: 'center', alpha });
  ctx.restore();
}
const tracer = (ctx, x0, y0, x1, y1, a = 1) => { ctx.save(); ctx.globalAlpha = a; const n = Math.ceil(Math.abs(x1 - x0) / 3); for (let i = 0; i < n; i++) { const u = i / n; if (i % 3 === 2) continue; px(ctx, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 2, 1, i % 3 ? '#ff4a44' : '#ffe0da'); } ctx.restore(); };
// Blood spear bursting out of the ground (h tall).
function spear(ctx, x, y, h, a = 1) { ctx.save(); ctx.globalAlpha = a; for (let k = 0; k < h; k++) { const w = Math.max(1, Math.round(4 * (1 - k / h))); px(ctx, x - w / 2 - 1, y - k, w + 2, 1, '#1a0004'); px(ctx, x - w / 2, y - k, w, 1, k > h * .7 ? '#ff4a44' : '#9a0e1c'); if (w > 2) px(ctx, x - w / 2, y - k, 1, 1, '#ff9c90'); } ctx.restore(); }

// A blood rocket: flies, homes a little toward the nearest foe, explodes on contact or at the end.
class BloodRocket {
  constructor(s, x, z, h, vx, vh, { target = null } = {}) { Object.assign(this, { owner: s.caster, caster: s.caster, team: s.team, s, x, z, h, vx, vh, target, t: 0, isFinished: false, fineVfx: true }); }
  get y() { return groundYForDepth(this.z) - this.h; }
  update(dt, gw) {
    this.t += dt; this.vh -= 520 * dt; this.x += this.vx * dt; this.h += this.vh * dt;
    if (this.target && !this.target.isDead) { this.vx += Math.sign(this.target.x - this.x) * 600 * dt; this.z += ((this.target.z ?? this.z) - this.z) * Math.min(1, dt * 3); }
    const hitFoe = foesOf(gw, this.team).find((t) => Math.abs(t.x - this.x) < 18 && Math.abs(((t.z ?? this.z) - this.z) * DEPTH) < 22 && Math.abs((t.worldHeight ?? 0) + 30 - this.h) < 50);
    if (hitFoe || this.h <= 2 || this.t > 2.2) this.explode(gw);
  }
  explode(gw) {
    if (this.isFinished) return; this.isFinished = true;
    for (const t of foesOf(gw, this.team)) if (Math.hypot(t.x - this.x, ((t.z ?? this.z) - this.z) * DEPTH) < ARSENAL.rocketR) { hit(t, ARSENAL.rocketDmg * (this.s.power ?? 1), Math.sign(t.x - this.x || 1) * 280, 200, .45); applyStatus(t, 'bleed'); }
    environment.add('blood', this.x, this.z, { radius: 30, life: 6 });
    const sys = this.s.system; const ex = this.x; const ez = this.z;
    if (sys && spellSheetReady('fire_explosion')) sys.activeSpells.push({ fineVfx: true, isVisualOnly: true, x: ex, z: ez, t: 0, isFinished: false, update(dt) { this.t += dt; if (this.t > .66) this.isFinished = true; }, render(ctx) { drawSpellSprite(ctx, 'fire_explosion', Math.min(9, Math.floor(this.t * 15)), ex, groundYForDepth(ez) - 20, { anchor: 'center', scale: .7 }); } });
    combat.shakeCamera(5, .15);
  }
  render(ctx) {
    const ang = Math.atan2(-this.vh * .6, this.vx); ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y)); ctx.rotate(ang);
    if (spellSheetReady('blood_rocket')) drawSpellSprite(ctx, 'blood_rocket', Math.floor(this.t * 16) % 4, -6, 0, { anchor: 'center' }); else px(ctx, -8, -2, 16, 4, '#c8202a');
    ctx.restore();
  }
}
const fireRocket = (s, x, h, vx, vh, target) => { const r = new BloodRocket(s, x, s.caster.z, h, vx, vh, { target }); s.system?.addSpell(r, 'B'); return r; };
const nearestFoe = (gw, s, maxDist = 420) => foesOf(gw, s.team).filter((t) => !t.isProp && (t.x - s.caster.x) * s.facing > -20 && Math.abs(t.x - s.caster.x) < maxDist).sort((a, b) => Math.abs(a.x - s.caster.x) - Math.abs(b.x - s.caster.x))[0] ?? null;

ARCANE_MOVES.A09 = [
  // forward short — BLUTSALVE: a rifle burst (5 shots) down the lane, each can make the foe bleed.
  (f, p) => seq(f, p, { dur: .5, steps: Array.from({ length: 5 }, (_, i) => ({ at: .04 + i * .07, fn: (s, gw) => s.strike(gw, ahead(300, 24)(s), 8, outward(90), 10, .2, { again: true, onHit: (t) => { if (Math.random() < ARSENAL.bleedChance) bleed(s)(t); } }) })),
    draw: (ctx, s, k) => { const c = s.caster; const y = c.y - 46; const firing = Math.floor(s.t / .07) % 2 === 0 && s.t < .4; weapon(ctx, 'blood_rifle', firing ? 2 : 0, c.x + s.facing * 17, y, s.facing, 0, fade(k, .02, .2)); if (firing) tracer(ctx, c.x + s.facing * 80, y - 6, c.x + s.facing * 320, y - 6 + Math.sin(s.t * 40) * 3, fade(k)); } }),
  // forward full — GATLING-STURM: a rotary barrage for 1.2 s, the foe is pinned and bleeds.
  (f, p) => seq(f, p, { dur: 1.3, steps: [...Array.from({ length: 16 }, (_, i) => ({ at: .1 + i * .065, fn: (s, gw) => s.strike(gw, ahead(340, 30)(s), 5, outward(40), 0, .3, { again: true, onHit: (t) => { if (i % 4 === 0) bleed(s)(t); } }) })), { at: 1.2, fn: (s, gw) => { s.strike(gw, ahead(340, 34)(s), 18, outward(380), 120, .5, { again: true }); combat.shakeCamera(6, .2); } }],
    draw: (ctx, s, k) => { const c = s.caster; const y = c.y - 44; const spin = Math.floor(s.t * 30) % 2; weapon(ctx, 'blood_gatling', s.t > .1 && s.t < 1.2 ? 2 + spin : spin, c.x + s.facing * 14, y, s.facing, 0, fade(k, .05, .12)); if (s.t > .1 && s.t < 1.2) for (let i = 0; i < 3; i++) tracer(ctx, c.x + s.facing * 82, y - 2 + (i - 1) * 4, c.x + s.facing * (200 + ((s.t * 900 + i * 60) % 160)), y - 2 + (i - 1) * 6 + Math.sin(s.t * 50 + i) * 4, 1); } }),
  // up short — RAKETENHUB: a rocket from the shoulder launcher hits the foe ahead and throws it up.
  (f, p) => seq(f, p, { dur: .6, steps: [{ at: .08, fn: (s, gw) => { const t = nearestFoe(gw, s, 360); fireRocket(s, s.caster.x + s.facing * 30, 70, s.facing * 520, 120, t); } }, { at: .12, fn: (s, gw) => s.strike(gw, ahead(80, 30)(s), 14, () => 0, 520, .4, { onHit: bleed(s) }) }],
    draw: (ctx, s, k) => { const c = s.caster; weapon(ctx, 'blood_launcher', s.t > .08 && s.t < .2 ? 1 : 0, c.x - s.facing * 2, c.y - 70, s.facing, -.25, fade(k, .05, .3)); } }),
  // up full — RAKETENREGEN: six rockets arc high and rain on the lane ahead.
  (f, p) => seq(f, p, { dur: 1.6, steps: Array.from({ length: 6 }, (_, i) => ({ at: .1 + i * .12, fn: (s, gw) => { const tgt = nearestFoe(gw, s, 420); const dist = tgt ? Math.abs(tgt.x - s.caster.x) + (i - 2.5) * 22 : 90 + i * 40; fireRocket(s, s.caster.x - s.facing * 4, 76, s.facing * dist / 1.25, 330, null); } })),
    draw: (ctx, s, k) => { const c = s.caster; weapon(ctx, 'blood_launcher', Math.floor(s.t / .12) % 2 && s.t < .9 ? 1 : 0, c.x - s.facing * 2, c.y - 72, s.facing, -.9, fade(k, .05, .2)); } }),
  // down short — DORNENBETT: blood spears burst out of the ground all around.
  (f, p) => seq(f, p, { dur: .55, steps: [{ at: .06, fn: (s, gw) => { s.strike(gw, around(110)(s), 22, outward(200), 380, .45, { onHit: bleed(s) }); environment.add('blood', s.x, s.z, { radius: 60, life: 5 }); combat.shakeCamera(6, .2); } }],
    draw: (ctx, s, k) => { const y = gy(s); const rise = Math.min(1, k * 5) * (1 - Math.max(0, k - .6) / .4); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; spear(ctx, s.x + Math.cos(a) * (40 + (i % 3) * 22), y + Math.sin(a) * 18, (20 + (i * 7) % 22) * rise, fade(k, .02, .3)); } } }),
  // down full — VOLLES ARSENAL: rifles, gatling and rockets fire at once in both directions, then a spear ring.
  (f, p) => seq(f, p, { dur: 1.5, steps: [...Array.from({ length: 10 }, (_, i) => ({ at: .1 + i * .09, fn: (s, gw) => s.strike(gw, (t, dx, dz) => Math.abs(dx) < 300 && Math.abs(dz) < 34, 6, outward(60), 0, .25, { again: true, onHit: (t) => { if (i % 3 === 0) bleed(s)(t); } }) })), ...[.2, .5, .8].map((at, i) => ({ at, fn: (s) => { fireRocket(s, s.caster.x, 80, s.facing * (i % 2 ? -1 : 1) * 260, 380, null); } })), { at: 1.3, fn: (s, gw) => { s.strike(gw, around(140)(s), 40, outward(460), 300, .6, { again: true, onHit: bleed(s) }); environment.add('blood', s.x, s.z, { radius: 90, life: 6 }); combat.shakeCamera(12, .3); combat.triggerHitstop?.(5); } }],
    draw: (ctx, s, k) => { const c = s.caster; const y = c.y - 46; const firing = s.t > .1 && s.t < 1.05; const fl = Math.floor(s.t * 30) % 2;
      weapon(ctx, 'blood_gatling', firing ? 2 + fl : 0, c.x + s.facing * 14, y, s.facing, 0, fade(k, .05, .1)); weapon(ctx, 'blood_rifle', firing ? 2 + fl : 0, c.x - s.facing * 8, y - 4, -s.facing, 0, fade(k, .05, .1)); weapon(ctx, 'blood_launcher', 0, c.x, c.y - 74, s.facing, -.5, fade(k, .05, .1));
      if (firing) { tracer(ctx, c.x + s.facing * 82, y, c.x + s.facing * 300, y + Math.sin(s.t * 40) * 4); tracer(ctx, c.x - s.facing * 80, y - 6, c.x - s.facing * 300, y - 6 + Math.cos(s.t * 40) * 4); }
      if (s.t > 1.3) { const q = (s.t - 1.3) / .2; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; spear(ctx, s.x + Math.cos(a) * (50 + (i % 3) * 30), gy(s) + Math.sin(a) * 22, (26 + (i * 5) % 20) * Math.min(1, q * 3), 1 - Math.max(0, q - .6) * 2.5); } } } })
];

ARCANE_CHARGE.A09 = (ctx, s, mat, dir, k) => {
  // The weapon for the direction grows out of the arm / shoulder while the charge builds.
  if (dir === 'up') weapon(ctx, 'blood_launcher', 0, s.x - s.f * 2, s.y - 70, s.f, -.4 - k * .4, .5 + k * .5);
  else if (dir === 'down') { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; spear(ctx, s.x + Math.cos(a) * 40, s.y + Math.sin(a) * 14, 6 + k * 18, .8); } }
  else weapon(ctx, k > .6 ? 'blood_gatling' : 'blood_rifle', 0, s.x + s.f * 16, s.y - 46, s.f, 0, .5 + k * .5);
};

// ── the fused look ─────────────────────────────────────────────────────────
// Veins: seeded branching paths over chest and arms (dark red with a bright pulse travelling along them).
const VEINS = (() => { const out = []; let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; for (let v = 0; v < 7; v++) { const pts = [[(rnd() - .5) * 8, -10 + rnd() * 22]]; for (let k = 0; k < 6; k++) { const [x, y] = pts[pts.length - 1]; pts.push([x + (rnd() - .5) * 7, y + (rnd() < .5 ? -1 : 1) * (3 + rnd() * 4)]); } out.push(pts); } return out; })();
registerFormRenderer('A09', (ctx, s, pose, mat, form, layer) => {
  if (pose.fade <= .01) return;
  const f = s.f; const t = pose.t; const a = pose.fade;
  if (layer === 'back') {
    // Rifles sprouting from the back, the launcher over the shoulder.
    weapon(ctx, 'blood_rifle', 0, s.back[0], s.back[1] - 4, -f, -.75 + Math.sin(t * 2) * .03, a);
    weapon(ctx, 'blood_rifle', 1, s.back[0] + f * 2, s.back[1] + 6, -f, -.35 + Math.sin(t * 2 + 1) * .03, a);
    weapon(ctx, 'blood_launcher', 0, s.shoulderB[0], s.shoulderB[1] - 6, f, -.15, a);
    return;
  }
  // Veins over the body with a pulse running along them.
  ctx.save(); ctx.globalAlpha = a * .9;
  VEINS.forEach((pts, i) => { pts.forEach(([vx, vy], k) => { const x = s.chest[0] + vx * f; const y = s.chest[1] + vy; const pulse = Math.floor(t * 10 + i * 2) % pts.length === k; px(ctx, x, y, 1, 2, pulse ? '#ff4a44' : '#3c000a'); }); });
  ctx.restore();
  // Glowing eyes and a grin.
  const [hx, hy] = s.head; px(ctx, hx + f * 2, hy - 2, 2, 1, '#ff2a2a'); px(ctx, hx + f * 5, hy - 2, 2, 1, '#ff2a2a'); px(ctx, hx + f * 1, hy + 3, 6 * f, 1, '#ffe0da');
  // The rifle fused to the forearm (hidden while a technique holds its own weapon).
  if (!((pose.player._arsenalBusyUntil ?? 0) > performance.now())) weapon(ctx, 'blood_rifle', Math.floor(t * 4) % 2, s.handF[0], s.handF[1], f, 0, a);
});

// Passive: landed melee hits make foes bleed (50 %).
const listeners = new WeakMap();
export function arsenalTick(p, form) {
  if (form?.id !== 'A09' || !p.buffForm) return;
  let l = listeners.get(p);
  if (!l || l.isFinished) {
    l = { owner: p, isFinished: false, onSigEvent(type, info) {
      if (!p.buffForm || p.buffForm.id !== 'A09') { this.isFinished = true; return; }
      if (type !== 'hit') return;
      for (const h of info.hits ?? []) if (!h.blocked && !h.target?.isProp && Math.random() < ARSENAL.bleedChance) applyStatus(h.target, 'bleed');
    } };
    listeners.set(p, listen(l));
  }
}
// Shared with form_specials / pull_looks (sprint, dive, pull looks).
export const bloodWeapon = weapon;
export const bloodSpear = spear;
// A blood strand lashing out from the hand to (x1, y1): a wavy dark-red line with a bright pulse and a hook.
export function bloodStrand(ctx, x0, y0, x1, y1, a = 1, t = 0) {
  const n = Math.max(4, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2)); ctx.save(); ctx.globalAlpha = a;
  for (let i = 0; i <= n; i++) { const u = i / n; const w = Math.sin(u * 9 + t * 14) * 3 * Math.sin(u * Math.PI); const x = x0 + (x1 - x0) * u; const y = y0 + (y1 - y0) * u + w; px(ctx, x - 1, y - 1, 3, 3, '#1a0004'); px(ctx, x, y, 2, 2, Math.floor(t * 20 - i) % 6 === 0 ? '#ff4a44' : '#9a0e1c'); }
  for (let k = 0; k < 5; k++) px(ctx, x1 - 2 + k, y1 - 3 + Math.abs(k - 2), 1, 1, '#ff9c90');
  ctx.restore();
}
export { BloodRocket };
void clamp01;
