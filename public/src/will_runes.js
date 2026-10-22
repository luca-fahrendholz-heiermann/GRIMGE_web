// GRIMGE Prototype — two special runes after anime / game references (user, 22–23 Oct 2026), adapted,
// not copied:
//
// S86 WILLE — the will made visible (after One Piece "Haki"). A 15 s stance like the breathings:
//   passive   RÜSTUNGSWILLE: fists / weapon coated in black steel with a crimson rim; melee hits
//             +20 % and they tear 30 points out of enemy shields.
//   charge →  WILLENSSTOSS: the blow lands before the fist does — shock rings hit up to 140 px
//             ahead, break shields completely, knock far back.
//   charge ↑  HERRSCHERWILLE: a burst of will with black-red lightning; weak foes (≤ 45 % HP) drop
//             unconscious, everyone else is stunned for a moment (Wizards also lose mana).
//   charge ↓  VORAHNUNG: 4 s foresight — the next three hits are sidestepped (an afterimage stays),
//             foes nearby are outlined in red.
//   sprint    SCHWARZER SCHRITT (a piercing black-steel lunge); dive: the landing rings out as a
//             small burst of will that stuns minions.
//
// S87 EDLES OPFER — after the Exiled Heavy Knight build the GDD named (the source of the combo):
//   stage 1   LEBENSSCHILD: a blue aura flares up, a big Ward shield (Schutz masteries apply) that
//             also heals while it holds.
//   stage 2   (tap again) EDLE SELBSTAUFOPFERUNG: the remaining shield and 20 % of the HP are
//             converted into attack power for 10 s — a red aura, black lightning crackling around
//             the Wizard, every hit sends a black bolt into the target.
import { defineSignature, startStance, emit, SigSequence, foesOf, hit, TAU, DEPTH } from './signature_core.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { applyWard } from './mastery.js';
import { offerRecast } from './recast.js';

const R = Object.freeze({ steel: '#14121a', steelLit: '#3a3446', crimson: '#d50032', red: '#ff1744', spark: '#ff8a80', white: '#ffffff' });
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;
const quake = (m, d) => combat.shakeCamera?.(m, d);
// Deterministic jitter (stable within one flicker frame).
const rnd = (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// A jagged black bolt with a crimson edge, from (x0, y0) toward (x1, y1).
function blackBolt(ctx, x0, y0, x1, y1, seed, width = 3) {
  const pts = [[x0, y0]]; const n = 5;
  for (let i = 1; i < n; i++) { const u = i / n; const j = (rnd(seed + i) - .5) * 14; pts.push([x0 + (x1 - x0) * u - (y1 - y0) / 40 * j, y0 + (y1 - y0) * u + (x1 - x0) / 40 * j]); }
  pts.push([x1, y1]);
  const line = (c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)))); ctx.stroke(); };
  line(R.crimson, width + 2); line('#0a0006', width); // a BLACK bolt with a crimson edge
}
// Pixel flame tongues around the body silhouette (the aura). pal: [dark, mid, light].
function auraFlames(ctx, p, ry, t, pal, k = 1, n = 18) {
  const cx = p.x; const cy = ry - 44;
  ctx.save(); ctx.lineJoin = 'miter';
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + .13; const ex = Math.cos(a) * 24; const ey = Math.sin(a) * 46;
    const bx = cx + ex; const by = cy + ey; let dx = Math.cos(a) * .6; let dy = Math.sin(a) * .6 - 1.2; const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    const h = (9 + 8 * Math.abs(Math.sin(t * 9 + i * 1.7))) * k;
    for (const [col, w, hh] of [[pal[0], 5, 1], [pal[1], 3.4, .75], [pal[2], 1.6, .45]]) {
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(Math.round(bx - dy * w), Math.round(by + dx * w)); ctx.lineTo(Math.round(bx + dx * h * hh), Math.round(by + dy * h * hh)); ctx.lineTo(Math.round(bx + dy * w), Math.round(by - dx * w)); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

// ═════════════════════════════════════════════════════════════════════════
// S86 WILLE
// ═════════════════════════════════════════════════════════════════════════
const WILL = Object.freeze({ dur: 15, melee: 1.2, shieldTear: 30, strikeReach: 140, conqRadius: 220, conqKO: .45, conqCd: 6, foresight: 4, dodges: 3 });

function willStrike(p, st, k) {
  const f = p.facing || 1;
  p.state = 'heavyStrike'; p.stateTimer = .32; p._weaponSwingTime = .32; p.vx = 0; p.vz = 0; p.canAttack = false;
  emit(new SigSequence(st.sig, p, { dur: .45, steps: [{ at: .08, fn: (s, gw) => {
    for (const t of foesOf(gw, p.team)) {
      const dx = (t.x - p.x) * f; if (dx < -10 || dx > WILL.strikeReach || Math.abs(((t.z ?? p.z) - p.z) * DEPTH) > 34) continue;
      if (t.arcaneShield > 0) { t.arcaneShield = 0; combat.spawnDamageText?.(t.x, (t.y ?? 0) - 96, 'SCHILD GEBROCHEN', { color: R.red }); }
      hit(t, Math.round((20 + 14 * k) * (p.signature?.quality?.power ?? 1)), f * (380 + 160 * k), 90, .45, k > .8);
    }
    quake(7, .2);
  } }], draw: (ctx, s, kk) => {
    // Shock rings rushing ahead of the fist (seen from the side: tall ellipses).
    const y = groundYForDepth(s.z) - 44;
    for (let i = 0; i < 3; i++) {
      const u = Math.min(1, kk * 2.2 - i * .25); if (u <= 0) continue; const x = s.x + s.facing * (24 + u * WILL.strikeReach);
      ctx.save(); ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#0a0006'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 6 + u * 6, 22 + u * 14, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = R.crimson; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
    if (kk < .5) for (let i = 0; i < 3; i++) blackBolt(ctx, s.x + s.facing * 18, y, s.x + s.facing * (60 + rnd(i + 3) * 70), y + (rnd(i + 9) - .5) * 50, 40 + i + Math.floor(s.t * 20));
  } }), st.quality);
  return true;
}

function conquerorBurst(p, st, gw, radius = WILL.conqRadius, small = false) {
  const x = p.x; const z = p.z;
  for (const t of foesOf(gw, p.team)) {
    if (t.isObjective || Math.hypot(t.x - x, ((t.z ?? z) - z) * DEPTH) > radius) continue;
    const weak = !t.heroKey && !t.isBoss && Number.isFinite(t.hp) && t.hp <= (t.maxHp ?? t.hp) * WILL.conqKO;
    if (weak && !small) { combat.spawnDamageText?.(t.x, (t.y ?? 0) - 90, 'BEWUSSTLOS', { color: R.red, isCrit: true }); t.takeDamage?.(Math.ceil(t.hp), 0, 0, 1, true, 'spell'); continue; }
    t.freeze?.(small ? .5 : t.heroKey ? .6 : 1.4);
    hit(t, small ? 10 : 14, Math.sign(t.x - x || 1) * 120, 40, .3);
    if (t.heroKey && Number.isFinite(t.mp)) t.mp = Math.max(0, t.mp - 15);
  }
  quake(small ? 6 : 13, small ? .2 : .45); combat.triggerHitstop?.(small ? 3 : 7);
  combat.spawnDamageText?.(x, (p.y ?? 0) - 110, small ? 'WILLE' : 'HERRSCHERWILLE', { color: R.red, isCrit: true });
  emit(new SigSequence(st.sig, p, { dur: .75, x, z, draw: (ctx, s, k) => {
    const y = groundYForDepth(z); const r = radius * Math.min(1, k * 1.8); const a = 1 - Math.max(0, k - .4) / .6;
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = '#0a0006'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), r, r * .32, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = R.crimson; ctx.lineWidth = 2; ctx.stroke();
    const n = small ? 5 : 8; const flick = Math.floor(s.t * 20);
    for (let i = 0; i < n; i++) {
      if ((i + flick) % 2) continue; /* they flicker: half of them per frame */ const ang = i / n * TAU + rnd(i) * .3; const rr = r * (.55 + rnd(i + 20) * .45); const r0 = r * .22; /* radiate from a ring around the body, not one clump */ blackBolt(ctx, x + Math.cos(ang) * r0, y - 40 + Math.sin(ang) * r0 * .55, x + Math.cos(ang) * rr, y - 30 + Math.sin(ang) * rr * .35, 70 + i * 3 + flick, 2);
    }
    ctx.restore();
  } }), st.quality);
}

function foresight(p, st) {
  st.foresightUntil = st.t + WILL.foresight; st.dodges = WILL.dodges; st.lastDodge = -9;
  combat.spawnDamageText?.(p.x, (p.y ?? 0) - 100, 'VORAHNUNG', { color: R.spark });
  combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 46, R.red);
  p.state = 'idle'; return true;
}

defineSignature('S86', {
  cast(c) { startStance(c.caster, 'S86', c.quality, { conqAt: -99, diving: false, afterimages: [] }); combat.spawnShockwave?.(c.caster.x, (c.caster.y ?? 0) - 40, 70, R.crimson); },
  stance: {
    duration: WILL.dur,
    hint: () => 'WILLE · → WILLENSSTOSS · ↑ HERRSCHERWILLE · ↓ VORAHNUNG',
    meleeMult: WILL.melee,
    counter: (p, st) => (st.foresightUntil > st.t ? { n: st.dodges, max: WILL.dodges } : null),
    damageTaken(p, st, amount, kx) {
      // Foresight: the hit is seen coming and sidestepped (an afterimage stays behind).
      if (st.foresightUntil > st.t && st.dodges > 0 && st.t - st.lastDodge > .35) {
        st.dodges--; st.lastDodge = st.t; const from = p.x; p.x += (Math.sign(kx) || -(p.facing || 1)) * 26;
        st.afterimages.push({ x: from, y: p.y ?? groundYForDepth(p.z), t: 0, f: p.facing || 1 });
        combat.spawnDamageText?.(p.x, (p.y ?? 0) - 92, 'GESEHEN', { color: R.spark });
        p._sigDodged = true; return 0;
      }
      return amount;
    },
    onEvent(p, st, type, info) {
      if (type !== 'hit') return;
      for (const h of info.hits ?? []) {
        const t = h.target; if (!t || t.isProp || !(t.arcaneShield > 0)) continue;
        t.arcaneShield = Math.max(0, t.arcaneShield - WILL.shieldTear); // the black steel tears shields
        combat.spawnHitSparks?.(t.x, (t.y ?? 0) - 40, p.facing || 1, R.red, 8);
      }
    },
    charge(p, st, dir, ratio, gw) {
      const k = Math.max(.3, Math.min(1, ratio ?? .6));
      if (dir === 'down') return foresight(p, st);
      if (dir === 'up') {
        if (st.t - st.conqAt < WILL.conqCd) { combat.spawnDamageText?.(p.x, (p.y ?? 0) - 96, `WILLE ERSCHÖPFT · ${Math.ceil(WILL.conqCd - (st.t - st.conqAt))} S`, { color: '#9e9e9e' }); return true; }
        st.conqAt = st.t; p.state = 'heavyStrike'; p.stateTimer = .4; p._weaponSwingTime = .4; p.vx = 0; p.vz = 0;
        conquerorBurst(p, st, gw); return true;
      }
      if (dir === 'forward' || dir === 'back') return willStrike(p, st, k);
      return false;
    },
    sprint: () => ({ name: 'SCHWARZER SCHRITT', primal: true, pierce: true, lungeSpeed: 1.7, carryMult: 1, recoilMult: 1.1, damageMult: 1.3, color: R.crimson }),
    update(p, st, dt, gw) {
      for (const a of st.afterimages) a.t += dt; st.afterimages = st.afterimages.filter((a) => a.t < .35);
      // The dive lands as a small burst of will.
      if (p.state === 'dive' && !p.grounded) st.diving = true;
      else if (st.diving && p.grounded) { st.diving = false; conquerorBurst(p, st, gw, 90, true); }
    },
    render(ctx, p, st, ry, layer) {
      const f = p.facing || 1; const t = st.t; const fade = Math.min(1, st.t / .3, st.timer / .4 + .2);
      if (layer === 'back') {
        // Foresight: red brackets around the foes nearby, an arrow for where they face.
        if (st.foresightUntil > st.t) for (const o of foesOf(globalThis.window?.gameWorld, p.team)) {
          if (Math.abs(o.x - p.x) > 320 || o.isObjective) continue;
          const oy = o.y ?? groundYForDepth(o.z); const hgt = o.heroKey ? 86 : 52; const w = o.heroKey ? 22 : 16;
          ctx.save(); ctx.strokeStyle = R.red; ctx.lineWidth = 2; ctx.globalAlpha = .9;
          for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const bx = Math.round(o.x + sx * w); const by = Math.round(oy - hgt / 2 + sy * hgt / 2); ctx.beginPath(); ctx.moveTo(bx, by - sy * 8); ctx.lineTo(bx, by); ctx.lineTo(bx - sx * 8, by); ctx.stroke(); }
          const of = o.facing || 1; ctx.fillStyle = R.red; ctx.beginPath(); ctx.moveTo(o.x + of * (w + 10), oy - hgt / 2); ctx.lineTo(o.x + of * (w + 3), oy - hgt / 2 - 5); ctx.lineTo(o.x + of * (w + 3), oy - hgt / 2 + 5); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        for (const a of st.afterimages) { ctx.save(); ctx.globalAlpha = .5 * (1 - a.t / .35); ctx.strokeStyle = R.red; ctx.lineWidth = 2; ctx.strokeRect(Math.round(a.x - 14), Math.round(a.y - 86), 28, 86); ctx.restore(); }
        return;
      }
      // Front: black-steel coating on both fists (or along the weapon hand), crimson rim, a glint.
      ctx.save(); ctx.globalAlpha = fade;
      for (const [hx, hy, s] of [[p.x + f * 16, ry - 40, 1], [p.x - f * 9, ry - 44, .8]]) {
        const r = 6 * s; const pts = Array.from({ length: 8 }, (_, i) => [Math.round(hx + Math.cos(i / 8 * TAU + .39) * r), Math.round(hy + Math.sin(i / 8 * TAU + .39) * r)]);
        ctx.fillStyle = R.steel; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = R.crimson; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = R.steelLit; ctx.fillRect(Math.round(hx - r * .5), Math.round(hy - r * .6), Math.round(r * .6), 2);
        ctx.fillStyle = R.white; ctx.fillRect(Math.round(hx - r * .3), Math.round(hy - r * .5), 2, 2);
      }
      // Now and then a crimson crackle runs along the forearm.
      if (Math.floor(t * 6) % 3 === 0) blackBolt(ctx, p.x + f * 4, ry - 50, p.x + f * 18, ry - 38, 90 + Math.floor(t * 12), 1.5);
      ctx.restore();
    },
    end(p) { combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 40, R.crimson); }
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S87 EDLES OPFER
// ═════════════════════════════════════════════════════════════════════════
const NOBLE = Object.freeze({ window: 10, shield: 110, heal: 3, sacrificeDur: 10, hpShare: .2, maxBonus: .9, perPoint: 1 / 160, boltEvery: .25 });
const BLUE = ['#0d47a1', '#42a5f5', '#e3f2fd']; const RED = ['#4a0000', '#d50000', '#ff8a80'];

export function nobleSacrifice(p) {
  const st = p.signature; if (st?.id !== 'S87' || st.phase !== 'shield') return false;
  const left = Math.max(0, p.arcaneShield ?? 0);
  p.arcaneShield = 0; p.arcaneShieldTimer = 0; p.shieldWatch = false; p.sacrificedHp = 0;
  let paid = 0; if (Number.isFinite(p.hp)) { paid = Math.floor(p.hp * NOBLE.hpShare); if (p.hp - paid < 1) paid = Math.max(0, p.hp - 1); p.hp -= paid; }
  st.phase = 'sacrifice'; st.power = 1 + Math.min(NOBLE.maxBonus, (left + paid * 1.5) * NOBLE.perPoint); st.timer = NOBLE.sacrificeDur; st.flash = .6; st.boltAt = new WeakMap();
  combat.spawnDamageText?.(p.x, (p.y ?? 0) - 118, 'EDLE SELBSTAUFOPFERUNG', { color: '#ff5252', isCrit: true });
  combat.spawnDamageText?.(p.x, (p.y ?? 0) - 100, `ANGRIFF ×${st.power.toFixed(2)}`, { color: '#ff8a80' });
  combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 90, '#d50000'); quake(10, .35); combat.triggerHitstop?.(5);
  return true;
}

defineSignature('S87', {
  cast(c) {
    const p = c.caster;
    startStance(p, 'S87', c.quality, { phase: 'shield', power: 1, flash: .5 });
    applyWard(p, Math.round(NOBLE.shield * (c.quality?.power ?? 1)), NOBLE.window, ['ward', 'lux']);
    combat.spawnDamageText?.(p.x, (p.y ?? 0) - 110, 'LEBENSSCHILD', { color: '#90caf9', isCrit: true });
    combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 70, '#42a5f5');
    offerRecast(p, { window: NOBLE.window, label: 'EDLE SELBSTAUFOPFERUNG', valid: () => p.signature?.id === 'S87' && p.signature.phase === 'shield', stage2: () => nobleSacrifice(p), expire: () => {} });
  },
  stance: {
    duration: NOBLE.window + .5,
    hint: (p, st) => (st.phase === 'shield' ? 'LEBENSSCHILD · ERNEUT TIPPEN: EDLE SELBSTAUFOPFERUNG' : `EDLE SELBSTAUFOPFERUNG · ANGRIFF ×${st.power.toFixed(2)}`),
    meleeMult: (p, st) => (st.phase === 'sacrifice' ? st.power : 1),
    onEvent(p, st, type, info) {
      if (type !== 'hit' || st.phase !== 'sacrifice') return;
      // Every hit sends a black bolt into the target (a little extra, at most every 0.25 s per target).
      for (const h of info.hits ?? []) {
        const t = h.target; if (!alive(t) || t.isProp) continue;
        if ((st.boltAt.get(t) ?? -9) > st.t - NOBLE.boltEvery) continue; st.boltAt.set(t, st.t);
        hit(t, Math.round(5 * st.power), 0, 0, .15);
        st.bolts = [...(st.bolts ?? []), { x: t.x, y: (t.y ?? groundYForDepth(t.z)) - 46, t: 0 }];
      }
    },
    update(p, st, dt) {
      st.flash = Math.max(0, (st.flash ?? 0) - dt);
      for (const b of st.bolts ?? []) b.t += dt; if (st.bolts) st.bolts = st.bolts.filter((b) => b.t < .18);
      // Lebensschild: the shield heals while it holds.
      if (st.phase === 'shield' && p.arcaneShield > 0 && Number.isFinite(p.hp)) p.hp = Math.min(p.maxHp ?? p.hp, p.hp + NOBLE.heal * dt);
    },
    render(ctx, p, st, ry, layer) {
      const t = st.t; const sac = st.phase === 'sacrifice';
      const k = Math.min(1, st.t / .25) * (sac ? 1.15 : 1) * (1 + (st.flash ?? 0) * .8);
      if (layer === 'back') { auraFlames(ctx, p, ry, t, sac ? RED : BLUE, k); return; }
      auraFlames(ctx, p, ry, t + 3.1, sac ? RED : BLUE, k * .55, 8);
      if (!sac) return;
      // Black lightning crackling around the Wizard (re-drawn a dozen times per second).
      const frame = Math.floor(t * 12);
      for (let i = 0; i < 4; i++) {
        const a = rnd(frame * 7 + i) * TAU; const x0 = p.x + Math.cos(a) * 14; const y0 = ry - 44 + Math.sin(a) * 30;
        blackBolt(ctx, x0, y0, x0 + Math.cos(a) * (22 + rnd(frame + i * 3) * 22), y0 + Math.sin(a) * (16 + rnd(frame + i * 5) * 20) - 8, frame * 13 + i);
      }
      for (const b of st.bolts ?? []) blackBolt(ctx, p.x + (p.facing || 1) * 14, ry - 50, b.x, b.y, 300 + Math.floor(b.t * 60), 3);
    },
    end(p, st) { if (st.phase === 'sacrifice') combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 50, '#d50000'); }
  }
});

export const WILL_RULES = WILL; export const NOBLE_RULES = NOBLE;
