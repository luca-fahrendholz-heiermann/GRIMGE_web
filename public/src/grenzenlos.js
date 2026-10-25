// GRIMGE Prototype — S89 GRENZENLOS (user, 23–24 Oct 2026: a space technique like the "Limitless"
// set — own names and look, adapted, not copied). A stance; while it lasts:
//   SOG        swipe forward: a point of attraction flies ahead and pulls foes, shots and loose objects in.
//              While it exists, swipe forward again = push it further, swipe up = raise it (everything in
//              it is pulled up into the air). It drifts toward the depth of the nearest foe.
//   STOSS      tap while a Sog exists: a repulsion bursts from the Sog point — everything it gathered is
//              hurled outward (captured shots fly back as your own). Without a Sog: swipe up = a repulsion
//              around the Wizard. A tap without a Sog stays the normal combo.
//   NICHTS     tap right after creating the Sog (within 0.7 s): attraction and repulsion collide — a violet
//              beam erases the whole lane through the Sog point (scene objects in it are destroyed).
//   UNENDLICHKEIT  passive: hostile shots slow down in front of the Wizard and stop (1 mana / s while it holds).
// Costs (skills cost mana like runes): Sog 8, Stoß 6, Nichts 20.
import { defineSignature, startStance, emit, foesOf, hit, TAU, DEPTH } from './signature_core.js';
import { projectilesOf, projVel, projSetVel } from './signature_core.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';
import { drawSpellSprite, spellSheetReady, drawSheetBeam } from './spell_visuals.js';

export const LIMITLESS = Object.freeze({ dur: 14, sogMana: 8, pushMana: 6, voidMana: 20, voidWindow: .7, pullR: 130, pushR: 140, infinityR: 90, drain: 1 });
const COL = { blue: '#2979ff', blueLight: '#82b1ff', red: '#d50000', redLight: '#ff8a80', violet: '#aa00ff', violetLight: '#ea80fc', white: '#ffffff', dark: '#06102a' };
const yOf = (z) => groundYForDepth(z);
const pay = (p, cost) => { if ((p.freeMana ?? p.mp ?? 0) < cost) { combat.spawnDamageText?.(p.x, (p.y ?? 0) - 70, 'NO MANA', { color: '#64b5f6' }); return false; } p.mp -= cost; return true; };
const ring = (ctx, x, y, r, color, w, a, squash = 1) => { if (a <= 0 || r <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), r, r * squash, 0, 0, TAU); ctx.stroke(); ctx.restore(); };
const disc = (ctx, x, y, r, color, a = 1) => { if (r <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), r, 0, TAU); ctx.fill(); ctx.restore(); };

// ── the Sog point (a world effect, environment-independent) ──────────────────
export class SogPoint {
  constructor(p, st) {
    this.caster = p; this.owner = p; this.team = p.team; this.st = st; this.facing = p.facing || 1;
    this.x = p.x + this.facing * 40; this.z = p.z; this.h = 44; this.vx = this.facing * 300; this.t = 0; this.isFinished = false; this.tick = 0;
    this.captured = new Set(); this.lifted = new Set(); this.isSogPoint = true;
  }
  get y() { return yOf(this.z); }
  get fineVfx() { return spellSheetReady('limitless_sog'); }
  steerForward() { this.vx = this.facing * 260; }
  raise() { this.h = Math.min(170, this.h + 60); }
  update(dt, gw) {
    this.t += dt; const p = this.caster;
    if (!p.signature || p.signature.id !== 'S89' || p.signature.sog !== this || this.t > 6) { this.release(); return; }
    // Glide, then hover; drift toward the depth of the nearest foe.
    this.x += this.vx * dt; this.vx *= Math.pow(.04, dt);
    const b = gw?.battlefield?.boundsOverride ?? gw?.battlefield?.playableBounds; if (b) this.x = Math.max((b.left ?? 0) + 10, Math.min((b.right ?? 4000) - 10, this.x));
    const foes = foesOf(gw, this.team); const nearest = foes.sort((a, c) => Math.abs(a.x - this.x) - Math.abs(c.x - this.x))[0];
    if (nearest && Math.abs(nearest.x - this.x) < 220) this.z += ((nearest.z ?? this.z) - this.z) * Math.min(1, dt * 1.5);
    // Attraction: foes, hostile shots and loose objects are drawn in.
    for (const t of foes) {
      const dx = this.x - t.x; const dz = (this.z - (t.z ?? this.z)) * DEPTH; const d = Math.hypot(dx, dz); if (d > LIMITLESS.pullR) continue;
      const pull = (t.heroKey ? 90 : 190) * (1 - d / LIMITLESS.pullR * .5) * dt;
      if (d > 8) { t.x += dx / d * Math.min(pull, d); t.z = (t.z ?? this.z) + dz / d * Math.min(pull, d) / DEPTH; }
      t.slow?.(.2, .5);
      if (this.h > 60 && d < 34 && !this.lifted.has(t)) { this.lifted.add(t); hit(t, 4, 0, Math.sqrt(2 * 984 * (this.h - 20)) * 1.1, .4); }
    }
    for (const pr of projectilesOf(gw)) {
      if (pr.team === this.team || this.captured.has(pr)) continue;
      const d = Math.hypot(pr.x - this.x, ((pr.z ?? this.z) - this.z) * DEPTH); if (d > 110) continue;
      this.captured.add(pr); projSetVel(pr, 0, 0); pr._sogHeld = this;
    }
    for (const pr of this.captured) { if (pr.isFinished || !(pr.life > 0 || pr.life === undefined)) { this.captured.delete(pr); continue; } const a = this.t * 6 + pr.x; pr.x += (this.x + Math.cos(a) * 16 - pr.x) * Math.min(1, dt * 8); pr.z += (this.z + Math.sin(a) * .04 - pr.z) * Math.min(1, dt * 8); if ('life' in pr) pr.life = Math.max(pr.life, .5); }
    for (const o of environment.props) {
      if (!o.isSceneObject || !o.throwable || o.isDead || o.carriedBy || o.flight) continue;
      const dx = this.x - o.x; const d = Math.hypot(dx, (this.z - o.z) * DEPTH); if (d > LIMITLESS.pullR || d < 10) continue;
      o.x += Math.sign(dx) * 90 * dt; o.z += (this.z - o.z) * Math.min(1, dt);
    }
    if ((this.tick -= dt) <= 0) { this.tick = .3; for (const t of foes) if (Math.hypot(t.x - this.x, ((t.z ?? this.z) - this.z) * DEPTH) < 30) hit(t, 3, 0, 20, .1); }
  }
  release() { for (const pr of this.captured) if (pr._sogHeld === this) pr._sogHeld = null; this.captured.clear(); this.isFinished = true; if (this.st?.sog === this) this.st.sog = null; }
  render(ctx) {
    const x = this.x; const y = this.y - this.h; const t = this.t; const a = Math.min(1, t / .15);
    // Hand-drawn singularity (art/authoring/vfx_runes1.cjs); a guide line to the ground when raised.
    if (spellSheetReady('limitless_sog')) { drawSpellSprite(ctx, 'limitless_sog', Math.floor(t * 12) % 8, x, y, { anchor: 'center', scale: .6 + .4 * a }); if (this.h > 60) for (let yy = y + 20; yy < this.y; yy += 6) { ctx.fillStyle = COL.blueLight; ctx.fillRect(Math.round(x), Math.round(yy), 1, 3); } return; }
    // Streaks drawn inward, a dark core, blue rings turning inward.
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = COL.blueLight; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) { const ang = i / 10 * TAU + t * 2; const ph = (t * 1.6 + i / 10) % 1; const r0 = 60 * (1 - ph) + 14; ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0 * .7); ctx.lineTo(x + Math.cos(ang) * (r0 - 10), y + Math.sin(ang) * (r0 - 10) * .7); ctx.stroke(); }
    ctx.restore();
    for (let r = 0; r < 3; r++) { const ph = (t * 1.2 + r / 3) % 1; ring(ctx, x, y, 40 * (1 - ph) + 12, r % 2 ? COL.blueLight : COL.blue, 3 - r * .6, a * (.4 + ph * .6), .75); }
    disc(ctx, x, y, 13, COL.blue, a); disc(ctx, x, y, 8, COL.dark, a); disc(ctx, x - 3, y - 3, 2, COL.white, a);
    if (this.h > 60) { ctx.save(); ctx.globalAlpha = .35 * a; ctx.strokeStyle = COL.blue; ctx.setLineDash?.([4, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, this.y); ctx.stroke(); ctx.restore(); }
  }
}

// A short burst / beam effect (render only).
class LimitlessFx {
  constructor(kind, x, z, h, o = {}) { Object.assign(this, { kind, x, z, h, t: 0, isFinished: false, ...o }); }
  get fineVfx() { return spellSheetReady('limitless_push'); }
  get y() { return yOf(this.z); }
  update(dt) { this.t += dt; if (this.t > (this.kind === 'void' ? .7 : .45)) this.isFinished = true; }
  render(ctx) {
    const y = this.y - this.h; const k = this.t / (this.kind === 'void' ? .7 : .45); const a = 1 - k;
    if (this.kind === 'push' && spellSheetReady('limitless_push')) { drawSpellSprite(ctx, 'limitless_push', Math.min(5, Math.floor(k * 6)), this.x, y, { anchor: 'center', scale: LIMITLESS.pushR / 100 }); return; }
    if (this.kind !== 'push' && spellSheetReady('limit_beam')) {
      const f = this.dir; const len = this.len * Math.min(1, k * 4); const kk = 1 - Math.max(0, k - .6) / .4;
      drawSheetBeam(ctx, 'limitless', this.x0, y, this.x0 + f * Math.max(4, len), y, this.t, Math.max(.2, kk));
      drawSpellSprite(ctx, 'limit_beam_head', Math.floor(this.t * 12) % 6, this.x, y, { anchor: 'center', scale: 1.2 * kk + .2 });
      return;
    }
    if (this.kind === 'push') {
      disc(ctx, this.x, y, 16 * (1 - k), COL.red, a); disc(ctx, this.x, y, 8 * (1 - k), COL.white, a);
      for (let r = 0; r < 3; r++) ring(ctx, this.x, y, 20 + k * (LIMITLESS.pushR + r * 30), r % 2 ? COL.redLight : COL.red, 4 - r, a, .6);
      return;
    }
    // NICHTS: a violet sphere at the meeting point, then a beam along the whole lane.
    const f = this.dir; const len = this.len * Math.min(1, k * 4); const w = 26 * (1 - Math.max(0, k - .6) / .4);
    ctx.save(); ctx.globalAlpha = Math.min(1, a * 2);
    ctx.fillStyle = COL.violet; ctx.fillRect(Math.round(Math.min(this.x0, this.x0 + f * len)), Math.round(y - w), Math.round(len), Math.round(w * 2));
    ctx.fillStyle = COL.violetLight; ctx.fillRect(Math.round(Math.min(this.x0, this.x0 + f * len)), Math.round(y - w * .5), Math.round(len), Math.round(w));
    ctx.fillStyle = COL.white; ctx.fillRect(Math.round(Math.min(this.x0, this.x0 + f * len)), Math.round(y - w * .15), Math.round(len), Math.max(2, Math.round(w * .3)));
    ctx.restore();
    disc(ctx, this.x, y, 22 * (1 - k * .5), COL.violet, Math.min(1, a * 2)); disc(ctx, this.x - 6, y, 10, COL.blue, a); disc(ctx, this.x + 6, y, 10, COL.red, a);
  }
}

// ── techniques ─────────────────────────────────────────────────────────────
function push(p, st, gw, from) {
  const x = from?.x ?? p.x + (p.facing || 1) * 30; const z = from?.z ?? p.z; const h = from?.h ?? 40;
  for (const t of foesOf(gw, p.team)) {
    const d = Math.hypot(t.x - x, ((t.z ?? z) - z) * DEPTH); if (d > LIMITLESS.pushR) continue;
    hit(t, (from ? 28 : 24) * (st.quality?.power ?? 1), Math.sign(t.x - p.x || p.facing || 1) * 520, 200, .5); // always away from the Wizard
  }
  // Captured shots fly outward as the Wizard's own; loose objects are hurled (boulders roll, kegs fly).
  if (from) for (const pr of from.captured) { if (pr.isFinished) continue; pr.team = p.team; const ang = Math.atan2(((pr.z ?? z) - z) * DEPTH, pr.x - x) || 0; projSetVel(pr, Math.cos(ang) * 560 || (p.facing || 1) * 560, Math.sin(ang) * 560 / DEPTH); pr._sogHeld = null; if ('life' in pr) pr.life = Math.max(pr.life, .9); }
  for (const o of environment.props) if (o.isSceneObject && !o.isDead && Math.hypot(o.x - x, (o.z - z) * DEPTH) < LIMITLESS.pushR) o.takeDamage(20, Math.sign(o.x - x || 1) * 420, 0, 0, false, 'spell');
  emit(new LimitlessFx('push', x, z, h)); combat.shakeCamera(6, .2);
  if (from) from.release();
}
function nothing(p, st, gw, sog) {
  const f = p.facing || 1; const len = 520; const x0 = p.x + f * 20; const z = sog.z;
  for (const t of foesOf(gw, p.team)) { const dx = (t.x - x0) * f; if (dx < -10 || dx > len || Math.abs(((t.z ?? z) - z) * DEPTH) > 34) continue; hit(t, 70 * (st.quality?.power ?? 1), f * 420, 220, .7); }
  for (const o of environment.props) { const dx = (o.x - x0) * f; if (o.isSceneObject && !o.isDead && dx > -10 && dx < len && Math.abs((o.z - z) * DEPTH) < 34) o.takeDamage(999, f * 300, 0, 0, false, 'spell'); }
  for (const pr of projectilesOf(gw)) { const dx = (pr.x - x0) * f; if (pr.team !== p.team && dx > -10 && dx < len && Math.abs(((pr.z ?? z) - z) * DEPTH) < 34) { pr.isFinished = true; if ('life' in pr) pr.life = 0; } }
  emit(new LimitlessFx('void', sog.x, z, sog.h, { x0, dir: f, len })); combat.shakeCamera(14, .35); combat.triggerHitstop?.(6);
  sog.release();
}

defineSignature('S89', {
  cast(c) { startStance(c.caster, 'S89', c.quality, { sog: null, sogAt: -9, cd: 0, held: new Set() }); combat.spawnShockwave?.(c.caster.x, (c.caster.y ?? 0) - 40, 60, COL.blueLight); },
  stance: {
    duration: LIMITLESS.dur,
    hint: (p, st) => (st?.sog ? 'GRENZENLOS · → SOG SCHIEBEN · ↑ ANHEBEN · TIPPEN: STOSS (SOFORT: NICHTS)' : 'GRENZENLOS · → SOG · ↑ STOSS · UNENDLICHKEIT AKTIV'),
    // Inputs (entities.js executeAttack → stance.attack): true = consumed.
    attack(p, st, kind, gw) {
      if (kind !== 'heavy' && kind !== 'uppercut' && kind !== 'normal') return false; // dives, branches, finishers stay untouched
      if (st.cd > 0) return kind !== 'normal' || !!st.sog;
      if (kind === 'heavy') {
        if (st.sog && !st.sog.isFinished) { st.sog.steerForward(); st.cd = .15; return true; }
        if (!pay(p, LIMITLESS.sogMana)) return true;
        st.sog = emit(new SogPoint(p, st)); st.sogAt = st.t; st.cd = .2; p.state = 'attack1'; p.stateTimer = .2; p._weaponSwingTime = .2; p.canAttack = false; return true;
      }
      if (kind === 'uppercut') {
        if (st.sog && !st.sog.isFinished) { st.sog.raise(); st.cd = .15; return true; }
        if (!pay(p, LIMITLESS.pushMana)) return true;
        push(p, st, gw, null); st.cd = .35; p.state = 'heavyStrike'; p.stateTimer = .3; p._weaponSwingTime = .3; p.canAttack = false; return true;
      }
      if (kind === 'normal' && st.sog && !st.sog.isFinished) {
        const quick = st.t - st.sogAt <= LIMITLESS.voidWindow;
        if (!pay(p, quick ? LIMITLESS.voidMana : LIMITLESS.pushMana)) return true;
        if (quick) nothing(p, st, gw, st.sog); else push(p, st, gw, st.sog);
        st.cd = .35; p.state = 'attack3'; p.stateTimer = .3; p._weaponSwingTime = .3; p.canAttack = false; return true;
      }
      return false;
    },
    update(p, st, dt, gw) {
      st.cd = Math.max(0, st.cd - dt);
      // UNENDLICHKEIT: hostile shots slow in front of the Wizard and stop (costs mana while it holds).
      let holding = false;
      for (const pr of projectilesOf(gw)) {
        if (pr.team === p.team || pr._sogHeld) continue;
        const dx = pr.x - p.x; const dz = ((pr.z ?? p.z) - p.z) * DEPTH; const d = Math.hypot(dx, dz); if (d > LIMITLESS.infinityR) continue;
        const [vx, vz] = projVel(pr); const toward = vx * dx + vz * DEPTH * dz < 0; if (!toward && !st.held.has(pr)) continue;
        if ((p.freeMana ?? p.mp ?? 0) <= 0) break;
        holding = true; st.held.add(pr);
        const k = Math.max(0, (d - 34) / (LIMITLESS.infinityR - 34)); projSetVel(pr, vx * k * .9, vz * k * .9);
      }
      for (const pr of st.held) if (pr.isFinished || pr.life <= 0) st.held.delete(pr);
      if (holding) p.mp = Math.max(0, p.mp - LIMITLESS.drain * dt);
      st.holding = holding;
    },
    end(p, st) { st.sog?.release(); for (const pr of st.held ?? []) if (!pr.isFinished) { const [vx, vz] = projVel(pr); if (Math.abs(vx) < 20) projSetVel(pr, -(p.facing || 1) * 200, vz); } },
    render(ctx, p, st, ry, layer) {
      if (layer !== 'back') return;
      const fade = Math.min(1, st.t / .3, st.timer / .4 + .2);
      // A faint shell of slowed space around the Wizard (brighter while it holds shots).
      ring(ctx, p.x, ry - 40, LIMITLESS.infinityR * .9, COL.blueLight, st.holding ? 2 : 1, fade * (st.holding ? .8 : .3), .8);
      ring(ctx, p.x, ry - 40, LIMITLESS.infinityR * .55, COL.blue, 1, fade * (st.holding ? .6 : .2), .8);
      for (const pr of st.held ?? []) ring(ctx, pr.x, pr.y ?? ry - 40, 8, COL.white, 1, .8);
    }
  }
});
