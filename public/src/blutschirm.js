// GRIMGE Prototype — S90 BLUTSCHIRM (user, 24 Oct 2026: a second blood rune next to Blutfinsternis, inspired by a
// blood-umbrella fighter — own adaptation, own names and look). Costs mana and a little blood (8 HP).
//   1  CAST       a blood umbrella opens over the Wizard; five blood archers hover above and behind and loose an
//                 arrow rain onto the target zone for ~3 s. Arrows make foes bleed and leave BLOOD PUDDLES.
//   ·  BLOCK      while the umbrella is open, guarding folds it into a BLOOD DOME around the Wizard: hits take only
//                 20 %, hostile shots soak into the dome.
//   2  TAP AGAIN  BLUTZWILLINGE — from every puddle (up to three) two blood dragons screw upward in a spiral;
//                 whoever stands in the puddle is carried up in the middle and hit hard (bleeding).
import { defineSignature, startStance, emit, foesOf, hit, TAU, DEPTH } from './signature_core.js';
import { drawDragon, dragonReady } from './spell_visuals.js';
import { projectilesOf } from './signature_core.js';
import { offerRecast } from './recast.js';
import { applyStatus } from './status_effects.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';

export const BLOOD = Object.freeze({ dur: 7, rainTime: 3.2, archers: 5, every: .09, zoneR: 70, arrowDmg: 8, shell: .2, dragonDmg: 50, hpCost: 8, puddleR: 22 });
const C = { dark: '#2a0006', body: '#b71c1c', bright: '#e53935', light: '#ff8a80', white: '#ffebee' };
const gy = (z) => groundYForDepth(z);
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
const blob = (ctx, x, y, r, c) => { ctx.fillStyle = c; for (let dy = -r; dy <= r; dy += 2) { const w = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); ctx.fillRect(Math.round(x - w), Math.round(y + dy * .85), w * 2, 2); } };
export const bloodPuddles = () => environment.effects.filter((e) => e.type === 'blood' && e.life > .3);
// Archer slots: an arc above the Wizard, leaning back (world x offset, height).
const archerAt = (p, i, t) => { const f = p.facing || 1; const u = i / 4 - .5; return { x: p.x - f * 18 + u * 120, h: 120 + (1 - u * u * 4) * 34 + Math.sin(t * 2 + i) * 3 }; };

class BloodArrow {
  constructor(p, from, to) { Object.assign(this, { caster: p, owner: p, team: p.team, x0: from.x, h0: from.h, z0: p.z, tx: to.x, tz: to.z, t: 0, dur: .42, isFinished: false }); this.x = this.x0; this.z = this.z0; }
  get y() { return gy(this.z); }
  update(dt, gw) {
    this.t += dt; const k = Math.min(1, this.t / this.dur);
    this.x = this.x0 + (this.tx - this.x0) * k; this.z = this.z0 + (this.tz - this.z0) * k;
    if (k < 1) return;
    this.isFinished = true;
    for (const t of foesOf(gw, this.team)) if (Math.hypot(t.x - this.tx, ((t.z ?? this.tz) - this.tz) * DEPTH) < 18) { hit(t, BLOOD.arrowDmg * (this.power ?? 1), 0, 20, .15); applyStatus(t, 'bleed'); }
    environment.add('blood', this.tx, this.tz, { radius: BLOOD.puddleR, life: 10, team: this.team });
  }
  render(ctx) {
    const k = Math.min(1, this.t / this.dur); const h = this.h0 * (1 - k); const y = gy(this.z) - h;
    const dx = (this.tx - this.x0) / this.dur; const dy = this.h0 / this.dur; const len = Math.hypot(dx, dy) || 1; const ux = dx / len; const uy = dy / len;
    ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = C.dark; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(this.x - ux * 14, y - uy * 14); ctx.lineTo(this.x, y); ctx.stroke();
    ctx.strokeStyle = C.bright; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x - ux * 13, y - uy * 13); ctx.lineTo(this.x, y); ctx.stroke(); ctx.restore();
    px(ctx, this.x - 2, y - 2, 4, 4, C.light);
  }
}

class BloodTwins {
  constructor(p, puddle) { Object.assign(this, { caster: p, owner: p, team: p.team, x: puddle.x, z: puddle.z, r: Math.max(26, puddle.radius), t: 0, isFinished: false, lifted: new Set(), topped: false }); }
  get y() { return gy(this.z); }
  update(dt, gw) {
    this.t += dt;
    if (this.t >= .15 && !this.risen) {
      this.risen = true; combat.shakeCamera(7, .25);
      for (const t of foesOf(gw, this.team)) { if (Math.hypot(t.x - this.x, ((t.z ?? this.z) - this.z) * DEPTH) > this.r + 10) continue; this.lifted.add(t); hit(t, BLOOD.dragonDmg * (this.power ?? 1), 0, 720, .8); applyStatus(t, 'bleed'); }
    }
    if (this.t >= .9 && !this.topped) { this.topped = true; for (const t of this.lifted) if (!t.isDead) hit(t, 20 * (this.power ?? 1), Math.sign(t.x - this.caster.x || 1) * 200, 120, .4); combat.spawnShockwave(this.x, this.y - 210, 50, C.bright); }
    if (this.t > 1.3) this.isFinished = true;
  }
  render(ctx) {
    const base = this.y; const rise = Math.min(1, this.t / .9); const fade = Math.min(1, (1.3 - this.t) / .3);
    ctx.save(); ctx.globalAlpha = fade;
    // The puddle bursts open, blood splashes up.
    ctx.save(); ctx.globalAlpha = fade * .8; ctx.fillStyle = C.dark; ctx.beginPath(); ctx.ellipse(this.x, base, this.r, this.r * .32, 0, 0, TAU); ctx.fill(); ctx.restore();
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const up = (this.t * 60 + i * 7) % 24; px(ctx, this.x + Math.cos(a) * this.r * .8, base + Math.sin(a) * this.r * .25 - up, 3, 4, i % 2 ? C.bright : C.body); }
    // Twin DRAGONS (art/authoring/vfx_dragon.cjs) screw upward round the lifted foe — back halves first, then
    // the front halves; their heads rear up at the top with jaws opening as they reach it.
    if (dragonReady('blood')) {
      const spineOf = (off, side) => { const pts = []; const N = 26; for (let i = 0; i <= N; i++) { const u = 1 - i / N; const h = 200 * rise * Math.min(u, .82) + Math.max(0, u - .82) * 60 * rise; const ang = this.t * 8 + Math.min(u, .82) * 8 + off; const rr = 26 * (1 - u * .15); const out = Math.max(0, u - .82) / .18; pts.push([this.x + Math.cos(ang) * rr * (1 - out) + side * out * 46, base - h + Math.sin(ang) * rr * .32 * (1 - out), Math.sin(ang) < 0 && out < .3]); } return pts; };
      const twins = [spineOf(0, 1), spineOf(Math.PI, -1)]; /* the heads rear out to both sides at the top */
      for (const only of ['back', 'front']) for (const sp of twins) drawDragon(ctx, 'blood', sp, { thickness: 1.25, open: Math.min(1, rise * 1.4), behind: (i) => sp[i][2], only });
      ctx.restore(); return;
    }
    const TWINS = [{ off: 0, body: '#c62828', light: '#ff8a80', dark: '#3b0008' }, { off: Math.PI, body: '#7f0000', light: '#e57373', dark: '#1a0003' }];
    for (const d of TWINS) {
      const N = 30; let head = null; let prev = null;
      for (let i = 0; i <= N; i++) {
        const u = i / N; const h = 240 * rise * u; const ang = this.t * 8 + u * 8 + d.off; const rr = 24 * (1 - u * .2);
        const x = this.x + Math.cos(ang) * rr; const y = base - h + Math.sin(ang) * rr * .32; const rad = Math.max(3, Math.round(6 - u * 2.5));
        // Back half of the helix behind the column (darker), front half bright.
        const behind = Math.sin(ang) < 0;
        blob(ctx, x, y, rad + 1, d.dark); blob(ctx, x, y, rad, behind ? d.dark : d.body); if (!behind && i % 2) px(ctx, x - 1, y - rad + 1, 2, 2, d.light);
        prev = { x, y }; if (i === N) head = { x, y, ang };
      }
      if (head && rise > .25) {
        const fx = -Math.sin(head.ang) >= 0 ? 1 : -1; const hx = head.x; const hy = head.y;
        blob(ctx, hx, hy, 9, d.dark); blob(ctx, hx, hy, 7, d.body);
        px(ctx, hx + fx * 4, hy - 3, fx * 11, 5, d.body); px(ctx, hx + fx * 4, hy + 3, fx * 9, 3, d.dark); px(ctx, hx + fx * 6, hy + 2, fx * 6, 1, C.white);
        px(ctx, hx + fx * 2, hy - 4, 2, 2, '#fff59d'); px(ctx, hx - fx * 3, hy - 12, 2, 7, d.dark); px(ctx, hx - fx * 7, hy - 10, 2, 6, d.dark);
      }
      void prev;
    }
    ctx.restore();
  }
}

function zoneFor(p, c, gw) {
  if (Number.isFinite(c?.target?.x)) return { x: c.target.x, z: c.target.z ?? p.z };
  const f = p.facing || 1;
  const foe = foesOf(gw, p.team).filter((t) => !t.isProp && (t.x - p.x) * f > 0 && Math.abs(t.x - p.x) < 360).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  return foe ? { x: foe.x, z: foe.z ?? p.z } : { x: p.x + f * 180, z: p.z };
}
function twins(p, gw) {
  // Up to three puddles that lie apart (nearby puddles share one pair of twins).
  const pools = []; for (const pool of bloodPuddles().sort((a, b) => b.radius - a.radius)) { if (pools.length < 3 && pools.every((q) => Math.hypot(q.x - pool.x, (q.z - pool.z) * DEPTH) > 80)) pools.push(pool); }
  for (const pool of pools) { emit(new BloodTwins(p, pool)); pool.life = Math.min(pool.life, .6); }
  combat.spawnDamageText?.(p.x, (p.y ?? 0) - 100, 'BLUTZWILLINGE', { color: C.light });
  if (p.signature?.id === 'S90') p.signature.timer = Math.min(p.signature.timer, 1);
}

defineSignature('S90', {
  cast(c) {
    const p = c.caster; p.hp = Math.max(1, p.hp - BLOOD.hpCost);
    startStance(p, 'S90', c.quality, { zone: zoneFor(p, c, c.gw), fireT: 0, shot: 0, shellK: 0 });
    combat.spawnShockwave?.(p.x, (p.y ?? 0) - 60, 50, C.bright);
    offerRecast(p, { window: BLOOD.dur, label: 'BLUTZWILLINGE', valid: () => p.signature?.id === 'S90' || bloodPuddles().length > 0, /* open while the umbrella is up (the puddles come with the rain) */ stage2: (gw) => twins(p, gw) });
  },
  stance: {
    duration: BLOOD.dur,
    hint: () => 'BLUTSCHIRM · BLOCKEN: BLUTKUPPEL · ERNEUT TIPPEN: BLUTZWILLINGE',
    damageTaken(p, st, amount) { return p.isGuarding ? amount * BLOOD.shell : amount; },
    update(p, st, dt, gw) {
      // The zone follows the nearest foe a little; the archers loose the rain in turn.
      const foe = foesOf(gw, p.team).filter((t) => !t.isProp && Math.hypot(t.x - st.zone.x, ((t.z ?? st.zone.z) - st.zone.z) * DEPTH) < 160)[0];
      if (foe) { st.zone.x += (foe.x - st.zone.x) * Math.min(1, dt * 2); st.zone.z += ((foe.z ?? st.zone.z) - st.zone.z) * Math.min(1, dt * 2); }
      if (st.t < BLOOD.rainTime && (st.fireT -= dt) <= 0) {
        st.fireT = BLOOD.every; const i = st.shot++ % BLOOD.archers; const from = archerAt(p, i, st.t);
        const a = st.shot * 2.39; const rr = Math.sqrt((st.shot * 37 % 100) / 100) * BLOOD.zoneR;
        emit(new BloodArrow(p, from, { x: st.zone.x + Math.cos(a) * rr, z: Math.max(.04, Math.min(.96, st.zone.z + Math.sin(a) * rr / DEPTH)) }));
      }
      // Guarding: the umbrella folds into a dome; hostile shots soak into it.
      st.shellK = Math.max(0, Math.min(1, st.shellK + (p.isGuarding ? dt * 6 : -dt * 6)));
      if (st.shellK > .5) for (const pr of projectilesOf(gw)) if (pr.team !== p.team && Math.hypot(pr.x - p.x, ((pr.z ?? p.z) - p.z) * DEPTH) < 48) { pr.isFinished = true; if ('life' in pr) pr.life = 0; combat.spawnHitSparks?.(pr.x, pr.y ?? p.y, 1, C.bright, 4); }
    },
    render(ctx, p, st, ry, layer) {
      const f = p.facing || 1; const fade = Math.min(1, st.t / .3, st.timer / .4 + .2);
      if (layer === 'back') {
        // The blood archers hover above and behind.
        if (st.t < BLOOD.rainTime + .6) for (let i = 0; i < BLOOD.archers; i++) {
          const a = archerAt(p, i, st.t); const x = Math.round(a.x); const y = Math.round(gy(p.z) - a.h); const k = Math.min(1, st.t * 3 - i * .2); if (k <= 0) continue;
          ctx.save(); ctx.globalAlpha = fade * Math.min(1, k, (BLOOD.rainTime + .6 - st.t) / .6);
          px(ctx, x - 6, y - 26, 12, 20, C.dark); px(ctx, x - 5, y - 25, 10, 18, C.body); px(ctx, x - 3, y - 23, 3, 12, C.bright); blob(ctx, x, y - 31, 6, C.dark); blob(ctx, x, y - 31, 5, C.body); px(ctx, x + f * 2, y - 32, 2, 2, '#fff59d');
          px(ctx, x - 4, y - 6, 3, 10, C.dark); px(ctx, x + 1, y - 6, 3, 10, C.dark); px(ctx, x - 8, y - 4, 16, 2, C.bright);
          ctx.strokeStyle = C.bright; ctx.lineWidth = 3; ctx.beginPath(); if (f > 0) ctx.arc(x + 8, y - 16, 13, -1.2, 1.2); else ctx.arc(x - 8, y - 16, 13, Math.PI - 1.2, Math.PI + 1.2); ctx.stroke(); ctx.strokeStyle = C.light; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + f * 13, y - 28); ctx.lineTo(x + f * 13, y - 4); ctx.stroke();
          ctx.restore();
        }
        return;
      }
      // The umbrella over the head; guarding folds it into a dome around the Wizard.
      const k = st.shellK; const cx = p.x; const top = ry - 96;
      ctx.save(); ctx.globalAlpha = fade;
      if (k > .05) {
        ctx.globalAlpha = fade * .55; ctx.fillStyle = C.body; ctx.beginPath(); ctx.ellipse(cx, ry - 42, 34 * k + 8, 52 * k + 8, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = fade; ctx.strokeStyle = C.bright; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, ry - 42, 34 * k + 8, 52 * k + 8, 0, 0, TAU); ctx.stroke();
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + st.t; ctx.strokeStyle = C.dark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, ry - 42 - (52 * k + 8)); ctx.lineTo(cx + Math.cos(a) * (34 * k + 8), ry - 42 + Math.sin(a) * 10); ctx.stroke(); }
      } else {
        const w = 34; const spin = st.t * 2;
        px(ctx, cx + f * 2, top, 2, 50, C.dark);
        for (let i = 0; i < 8; i++) { const u0 = -1 + i / 4; const u1 = u0 + .25; const yy = (u) => top - 12 * (1 - u * u); ctx.fillStyle = (i + Math.floor(spin)) % 2 ? C.body : C.bright; ctx.beginPath(); ctx.moveTo(cx, top - 16); ctx.lineTo(cx + u0 * w, yy(u0) + 6); ctx.lineTo(cx + u1 * w, yy(u1) + 6); ctx.closePath(); ctx.fill(); }
        ctx.strokeStyle = C.dark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - w, top + 6); ctx.quadraticCurveTo(cx, top - 26, cx + w, top + 6); ctx.stroke();
        for (let i = 0; i < 3; i++) px(ctx, cx - w + 6 + i * 26, top + 6 + ((st.t * 30 + i * 7) % 14), 2, 3, C.bright);
      }
      ctx.restore();
    }
  }
});
