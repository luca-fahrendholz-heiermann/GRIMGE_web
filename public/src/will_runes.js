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
//   stage 2   (tap again) EDLE SELBSTAUFOPFERUNG (like a "rage" transformation): the remaining
//             shield and 20 % of the HP become attack power for 10 s — inside a bright blue aura tight
//             to the body, outside black lightning with dark-red edges; every hit sends a black bolt
//             into the target. The energy flows into the class's astral weapon (black, crimson edges),
//             which grows with time and every hit.
//   stage 3   (tap again, or by itself when the rage ends) ASTRALER RICHTSPRUCH: the giant weapon
//             comes down and its slash runs across half the arena.
import { defineSignature, startStance, emit, SigSequence, foesOf, hit, TAU, DEPTH } from './signature_core.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { applyWard } from './mastery.js';
import { offerRecast } from './recast.js';
import { drawWeaponSolid, astralTipLength } from './weapons.js';
import { ghostOf } from './buff_signatures.js';

const R = Object.freeze({ steel: '#14121a', steelLit: '#3a3446', crimson: '#d50032', red: '#ff1744', spark: '#ff8a80', white: '#ffffff' });
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;
const quake = (m, d) => combat.shakeCamera?.(m, d);
// Deterministic jitter (stable within one flicker frame).
const rnd = (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// A jagged black bolt with a crimson edge, from (x0, y0) toward (x1, y1).
function blackBolt(ctx, x0, y0, x1, y1, seed, width = 3, edge = R.crimson) {
  const pts = [[x0, y0]]; const n = 5;
  for (let i = 1; i < n; i++) { const u = i / n; const j = (rnd(seed + i) - .5) * 14; pts.push([x0 + (x1 - x0) * u - (y1 - y0) / 40 * j, y0 + (y1 - y0) * u + (x1 - x0) / 40 * j]); }
  pts.push([x1, y1]);
  const line = (c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)))); ctx.stroke(); };
  line(edge, width + 2); line('#0a0006', width); // a BLACK bolt with a coloured edge
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
const WILL = Object.freeze({ dur: 15, melee: 1.2, shieldTear: 30, strikeReach: 175, strikeDash: 46, conqRadius: 220, conqKO: .45, conqCd: 6, foresight: 4, dodges: 3, waveReach: 320, waveCd: .9 });

function willStrike(p, st, k) {
  const f = p.facing || 1;
  p.state = 'heavyStrike'; p.stateTimer = .34; p._weaponSwingTime = .34; p.vx = 0; p.vz = 0; p.canAttack = false;
  // A short step into the blow (the will lands before the fist).
  emit(new SigSequence(st.sig, p, { dur: .5, tick: (s, dt) => { if (s.t < .1) p.x += f * WILL.strikeDash / .1 * dt; }, steps: [{ at: .1, fn: (s, gw) => {
    for (const t of foesOf(gw, p.team)) {
      const dx = (t.x - p.x) * f; if (dx < -16 || dx > WILL.strikeReach || Math.abs(((t.z ?? p.z) - p.z) * DEPTH) > 44) continue;
      if (t.arcaneShield > 0) { t.arcaneShield = 0; combat.spawnDamageText?.(t.x, (t.y ?? 0) - 96, 'SCHILD GEBROCHEN', { color: R.red }); }
      hit(t, Math.round((20 + 14 * k) * (p.signature?.quality?.power ?? 1)), f * (380 + 160 * k), 90, .45, k > .8);
    }
    quake(9, .25); combat.triggerHitstop?.(4);
  } }], draw: (ctx, s, kk) => {
    // Shock rings rushing ahead of the fist (seen from the side: tall ellipses).
    s.x = p.x; const y = groundYForDepth(s.z) - 44;
    for (let i = 0; i < 5; i++) {
      const u = Math.min(1, kk * 2.4 - i * .2); if (u <= 0) continue; const x = s.x + s.facing * (24 + u * WILL.strikeReach);
      ctx.save(); ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#0a0006'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 6 + u * 6, 22 + u * 14, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = R.crimson; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
    if (kk < .55) for (let i = 0; i < 5; i++) blackBolt(ctx, s.x + s.facing * 18, y, s.x + s.facing * (60 + rnd(i + 3) * 110), y + (rnd(i + 9) - .5) * 70, 40 + i + Math.floor(s.t * 20));
    // The ground cracks along the blow.
    if (kk > .2 && kk < .8) { const gy = groundYForDepth(s.z); ctx.fillStyle = '#0a0006'; ctx.fillRect(Math.round(Math.min(s.x, s.x + s.facing * WILL.strikeReach)), Math.round(gy - 2), WILL.strikeReach, 3); ctx.fillStyle = R.crimson; ctx.fillRect(Math.round(Math.min(s.x, s.x + s.facing * WILL.strikeReach)), Math.round(gy - 3), WILL.strikeReach, 1); }
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
      if ((i + flick) % 2) continue; // they flicker: half of them per frame
      // Radiate from a ring around the body (not one clump at the centre).
      const ang = i / n * TAU + rnd(i) * .3; const rr = r * (.55 + rnd(i + 20) * .45); const r0 = r * .22;
      blackBolt(ctx, x + Math.cos(ang) * r0, y - 40 + Math.sin(ang) * r0 * .55, x + Math.cos(ang) * rr, y - 30 + Math.sin(ang) * rr * .35, 70 + i * 3 + flick, 2);
    }
    ctx.restore();
  } }), st.quality);
}

// HOLD: WILLENSWELLE — the will sent out as a travelling shock (breaks shields, stuns briefly).
function willWave(p, st, charge = 0) {
  if (st.t - (st.waveAt ?? -9) < WILL.waveCd) return true; st.waveAt = st.t;
  const f = p.facing || 1; const x0 = p.x + f * 20; const z0 = p.z; const reach = WILL.waveReach * (1 + Math.min(1, charge) * .3); const hitSet = new Set();
  p.state = 'heavyStrike'; p.stateTimer = .3; p._weaponSwingTime = .3; p.vx = 0; p.vz = 0; p.canAttack = false;
  emit(new SigSequence(st.sig, p, { dur: .65, x: x0, z: z0, tick: (s, dt, gw) => {
    const front = x0 + f * reach * Math.min(1, s.t / .45);
    for (const t of foesOf(gw, p.team)) {
      if (hitSet.has(t) || (t.x - x0) * f < -10 || (t.x - front) * f > 0 || Math.abs(((t.z ?? z0) - z0) * DEPTH) > 40) continue;
      hitSet.add(t); if (t.arcaneShield > 0) t.arcaneShield = 0;
      hit(t, Math.round(16 * (p.signature?.quality?.power ?? 1)), f * 300, 60, .35); t.freeze?.(.25);
    }
  }, draw: (ctx, s) => {
    const u = Math.min(1, s.t / .45); const a = 1 - Math.max(0, (s.t - .45) / .2); const x = x0 + f * reach * u; const y = groundYForDepth(z0) - 40;
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    for (const [col, wd] of [[R.crimson, 7], ['#0a0006', 4]]) { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 10, 30, 0, 0, TAU); ctx.stroke(); }
    for (let i = 0; i < 3; i++) blackBolt(ctx, x, y + (i - 1) * 16, x - f * (30 + rnd(i + Math.floor(s.t * 20)) * 40), y + (rnd(i + 5) - .5) * 40, 600 + i + Math.floor(s.t * 20), 2);
    ctx.restore();
  } }), st.quality);
  combat.spawnShockwave?.(x0, (p.y ?? 0) - 40, 30, R.crimson); quake(4, .12);
  return true;
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
    hold: (p, st, charge) => willWave(p, st, charge),
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
        // The surroundings crackle: small black-red bolts in the air and on the ground nearby.
        const flick = Math.floor(t * 12); const hot = st.t - st.conqAt < 3 ? 2 : 1; const gy0 = groundYForDepth(p.z);
        ctx.save(); ctx.globalAlpha = fade;
        for (let i = 0; i < 7 * hot; i++) {
          if (rnd(flick * 3 + i) < .3) continue;
          const ang = rnd(flick * 11 + i * 7) * TAU; const rr = 40 + rnd(flick + i * 13) * 120 * hot; const bx = p.x + Math.cos(ang) * rr; const by = (i % 2 ? gy0 - 4 : ry - 30 - rnd(i + flick) * 60) + Math.sin(ang) * 14;
          const len = 14 + rnd(i * 5 + flick) * 20; blackBolt(ctx, bx, by, bx + (rnd(i + 2 * flick) - .5) * len * 2, by - len, 900 + i * 17 + flick, 2);
          ctx.fillStyle = rnd(i + flick * 7) < .5 ? R.red : R.spark; ctx.fillRect(Math.round(bx), Math.round(by - len - 2), 2, 2);
        }
        ctx.restore();
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
const NOBLE = Object.freeze({ window: 10, shield: 110, heal: 3, sacrificeDur: 10, hpShare: .2, maxBonus: .9, perPoint: 1 / 160, boltEvery: .25,
  growPerSec: .07, growPerHit: .05, judgeDur: 1.25, judgeAt: .5, judgeDamage: 34, judgeDamagePerCharge: 56 });
const BLUE = ['#0d47a1', '#42a5f5', '#e3f2fd']; const DARK_RED = '#7f0000';
const weaponOf = (p) => p.weapon ?? p.classWeapon ?? 'rune_greatsword'; // bare hands: an astral greatsword

export function nobleSacrifice(p) {
  const st = p.signature; if (st?.id !== 'S87' || st.phase !== 'shield') return false;
  const left = Math.max(0, p.arcaneShield ?? 0);
  p.arcaneShield = 0; p.arcaneShieldTimer = 0; p.shieldWatch = false; p.sacrificedHp = 0;
  let paid = 0; if (Number.isFinite(p.hp)) { paid = Math.floor(p.hp * NOBLE.hpShare); if (p.hp - paid < 1) paid = Math.max(0, p.hp - 1); p.hp -= paid; }
  st.phase = 'sacrifice'; st.power = 1 + Math.min(NOBLE.maxBonus, (left + paid * 1.5) * NOBLE.perPoint); st.timer = NOBLE.sacrificeDur; st.flash = .6; st.boltAt = new WeakMap(); st.charge = 0;
  combat.spawnDamageText?.(p.x, (p.y ?? 0) - 118, 'EDLE SELBSTAUFOPFERUNG', { color: '#ff5252', isCrit: true });
  combat.spawnDamageText?.(p.x, (p.y ?? 0) - 100, `ANGRIFF ×${st.power.toFixed(2)}`, { color: '#ff8a80' });
  combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 90, '#42a5f5'); quake(10, .35); combat.triggerHitstop?.(5);
  return true;
}

// Stage 3: the grown astral weapon comes down; its slash runs across half the arena.
export function astralJudgement(p, gw = globalThis.window?.gameWorld) {
  const st = p.signature; if (st?.id !== 'S87' || st.phase !== 'sacrifice') return false;
  const charge = Math.min(1, st.charge ?? 0); const f = p.facing || 1; const weapon = weaponOf(p);
  const reach = Math.max(500, (gw?.battlefield?.width ?? gw?.renderWidth ?? 1280) * .5);
  st.phase = 'judgement'; st.timer = NOBLE.judgeDur; st.judgeT = 0;
  p.state = 'heavyStrike'; p.stateTimer = NOBLE.judgeAt + .1; p._weaponSwingTime = NOBLE.judgeAt + .1; p.vx = 0; p.vz = 0; p.canAttack = false; p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, NOBLE.judgeAt);
  combat.spawnDamageText?.(p.x, (p.y ?? 0) - 126, 'ASTRALER RICHTSPRUCH', { color: '#ff1744', isCrit: true });
  const dmg = Math.round((NOBLE.judgeDamage + NOBLE.judgeDamagePerCharge * charge) * st.power);
  const scale = 2.2 + 3.2 * charge; const x0 = p.x; const z0 = p.z;
  emit(new SigSequence(st.sig, p, { dur: NOBLE.judgeDur, x: x0, z: z0, steps: [{ at: NOBLE.judgeAt, fn: (s, gw2) => {
    for (const t of foesOf(gw2, p.team)) {
      const dx = (t.x - x0) * f; if (dx < -30 || dx > reach || Math.abs(((t.z ?? z0) - z0) * DEPTH) > 70) continue;
      hit(t, dmg, f * 520, 320, .7, true);
    }
    quake(18, .7); combat.triggerHitstop?.(9); combat.spawnShockwave?.(x0 + f * 60, groundYForDepth(z0) - 10, 120, '#7f0000');
  } },
  // The rift keeps the scene shaking while it is open.
  { at: NOBLE.judgeAt + .18, fn: () => quake(10, .25) }, { at: NOBLE.judgeAt + .36, fn: () => quake(7, .25) }, { at: NOBLE.judgeAt + .55, fn: () => quake(4, .2) }], draw: (ctx, s, k) => {
    const gy = groundYForDepth(z0); const tt = s.t;
    // The giant weapon: raised behind (0 → judgeAt), swung down in front, then fading.
    const raise = Math.min(1, tt / (NOBLE.judgeAt * .7)); const swing = Math.max(0, Math.min(1, (tt - NOBLE.judgeAt * .7) / (NOBLE.judgeAt * .3)));
    const ang = swing > 0 ? -2.5 + swing * 2.9 : -1.2 - raise * 1.3; const fade = tt < NOBLE.judgeAt + .25 ? 1 : Math.max(0, 1 - (tt - NOBLE.judgeAt - .25) / .5);
    if (fade > 0) {
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(Math.round(s.x + f * 10), Math.round(gy - 52)); ctx.scale(f, 1); ctx.rotate(ang);
      drawWeaponSolid(ctx, weapon, scale * (1 + raise * .15), { mainOnly: true }); ctx.restore();
    }
    // The slash: a black crescent with a dark-red edge that rushes across half the arena.
    if (tt >= NOBLE.judgeAt) {
      const u = Math.min(1, (tt - NOBLE.judgeAt) / .45); const a = 1 - Math.max(0, (tt - NOBLE.judgeAt - .35) / .4);
      const front = s.x + f * reach * u; const h = 60 + 70 * charge;
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      // The torn ground behind the wave.
      ctx.fillStyle = '#0a0006'; ctx.fillRect(Math.round(Math.min(s.x, front)), Math.round(gy - 3), Math.round(Math.abs(front - s.x)), 6);
      ctx.fillStyle = DARK_RED; ctx.fillRect(Math.round(Math.min(s.x, front)), Math.round(gy - 4), Math.round(Math.abs(front - s.x)), 2);
      for (const [col, wdt] of [[DARK_RED, 14], ['#0a0006', 9], ['#ff1744', 2]]) {
        ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.beginPath(); ctx.ellipse(Math.round(front - f * 24), Math.round(gy - h * .55), 34, h * .6, 0, f > 0 ? -1.3 : Math.PI - 1.3, f > 0 ? 1.3 : Math.PI + 1.3); ctx.stroke();
      }
      for (let i = 0; i < 5; i++) { const bx = s.x + f * reach * u * (i + 1) / 6; blackBolt(ctx, bx, gy - 8, bx + f * 20, gy - 40 - rnd(i + Math.floor(tt * 16)) * h * .6, 500 + i + Math.floor(tt * 16), 2, DARK_RED); }
      ctx.restore();
      // The energy rift: space itself tears open along the slash — a jagged black gap with crimson lips,
      // bolts leaping off its edges; it widens, holds and closes again.
      const rt = tt - NOBLE.judgeAt; const open = Math.min(1, rt / .12) * (1 - Math.max(0, (rt - .4) / .35)); if (open > 0) {
        const len = Math.abs(front - s.x); const n = Math.max(6, Math.round(len / 18)); const cy = gy - 46; const H = (12 + 26 * charge) * open; const fl = Math.floor(tt * 18);
        const edge = (side) => Array.from({ length: n + 1 }, (_, i) => { const u2 = i / n; const taper = Math.sin(u2 * Math.PI) ** .6; return [s.x + f * len * u2, cy + side * H * taper * (.6 + .4 * rnd(i * 7 + fl + (side > 0 ? 3 : 0)))]; });
        const top = edge(-1); const bot = edge(1).reverse(); const poly = [...top, ...bot];
        const path = () => { ctx.beginPath(); poly.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)))); ctx.closePath(); };
        ctx.save(); path(); ctx.fillStyle = '#d50032'; ctx.lineWidth = 6; ctx.strokeStyle = '#7f0000'; ctx.stroke(); ctx.fill();
        ctx.save(); ctx.translate(0, 0); ctx.beginPath(); const inner = [...top.map(([x, y]) => [x, cy + (y - cy) * .7]), ...bot.map(([x, y]) => [x, cy + (y - cy) * .7])]; inner.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)))); ctx.closePath(); ctx.fillStyle = '#0a0006'; ctx.fill(); ctx.restore();
        ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.round(s.x), Math.round(cy)); ctx.lineTo(Math.round(front), Math.round(cy)); ctx.stroke();
        for (let i = 0; i < 6 + Math.round(10 * charge); i++) { const [ex, ey] = poly[Math.floor(rnd(fl * 5 + i) * poly.length)]; const up = ey < cy ? -1 : 1; blackBolt(ctx, ex, ey, ex + (rnd(i + fl) - .5) * 40, ey + up * (14 + rnd(i * 3 + fl) * 30), 700 + i * 7 + fl, 2, DARK_RED); }
        ctx.restore();
      }
    }
  } }), st.quality);
  return true;
}

defineSignature('S87', {
  cast(c) {
    const p = c.caster;
    startStance(p, 'S87', c.quality, { phase: 'shield', power: 1, flash: .5, charge: 0 });
    applyWard(p, Math.round(NOBLE.shield * (c.quality?.power ?? 1)), NOBLE.window, ['ward', 'lux']);
    combat.spawnDamageText?.(p.x, (p.y ?? 0) - 110, 'LEBENSSCHILD', { color: '#90caf9', isCrit: true });
    combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 70, '#42a5f5');
    offerRecast(p, {
      window: NOBLE.window, label: 'EDLE SELBSTAUFOPFERUNG',
      valid: () => p.signature?.id === 'S87' && (p.signature.phase === 'shield' || p.signature.phase === 'sacrifice'),
      // Tap 2: the sacrifice (the slot stays open); tap 3: the judgement.
      stage2: (gw) => {
        const ph = p.signature?.phase;
        if (ph === 'shield') return nobleSacrifice(p) ? { again: true, label: 'ASTRALER RICHTSPRUCH', window: NOBLE.sacrificeDur } : false;
        if (ph === 'sacrifice') return astralJudgement(p, gw);
        return false;
      },
      expire: () => {}
    });
  },
  stance: {
    duration: NOBLE.window + .5,
    hint: (p, st) => (st.phase === 'shield' ? 'LEBENSSCHILD · ERNEUT TIPPEN: EDLE SELBSTAUFOPFERUNG' : st.phase === 'sacrifice' ? `ANGRIFF ×${st.power.toFixed(2)} · WAFFE ${Math.round(Math.min(1, st.charge) * 100)} % · ERNEUT TIPPEN: RICHTSPRUCH` : 'ASTRALER RICHTSPRUCH'),
    meleeMult: (p, st) => (st.phase === 'sacrifice' ? st.power : 1),
    // The held weapon has become the growing black astral weapon (drawn by the stance).
    hidesWeapon: (p, st) => st.phase !== 'shield',
    counter: (p, st) => (st.phase === 'sacrifice' ? { n: Math.round(Math.min(1, st.charge) * 5), max: 5 } : null),
    onEvent(p, st, type, info) {
      if (type !== 'hit' || st.phase !== 'sacrifice') return;
      // Every hit sends a black bolt into the target (at most every 0.25 s per target) and feeds the weapon.
      for (const h of info.hits ?? []) {
        const t = h.target; if (!alive(t) || t.isProp) continue;
        st.charge = Math.min(1, (st.charge ?? 0) + NOBLE.growPerHit);
        if ((st.boltAt.get(t) ?? -9) > st.t - NOBLE.boltEvery) continue; st.boltAt.set(t, st.t);
        hit(t, Math.round(5 * st.power), 0, 0, .15);
        st.bolts = [...(st.bolts ?? []), { x: t.x, y: (t.y ?? groundYForDepth(t.z)) - 46, t: 0 }];
      }
    },
    update(p, st, dt, gw) {
      st.flash = Math.max(0, (st.flash ?? 0) - dt);
      for (const b of st.bolts ?? []) b.t += dt; if (st.bolts) st.bolts = st.bolts.filter((b) => b.t < .18);
      // Lebensschild: the shield heals while it holds.
      if (st.phase === 'shield' && p.arcaneShield > 0 && Number.isFinite(p.hp)) p.hp = Math.min(p.maxHp ?? p.hp, p.hp + NOBLE.heal * dt);
      if (st.phase === 'sacrifice') {
        st.charge = Math.min(1, (st.charge ?? 0) + NOBLE.growPerSec * dt); // the energy flows into the weapon
        if (st.timer <= .15) astralJudgement(p, gw); // the rage ends in the judgement anyway
      }
    },
    render(ctx, p, st, ry, layer) {
      const t = st.t; const f = p.facing || 1;
      if (st.phase === 'shield') {
        const k = Math.min(1, st.t / .25) * (1 + (st.flash ?? 0) * .8);
        auraFlames(ctx, p, ry, layer === 'back' ? t : t + 3.1, BLUE, layer === 'back' ? k : k * .55, layer === 'back' ? 18 : 8);
        return;
      }
      if (st.phase === 'judgement') return; // the judgement draws itself
      const frame = Math.floor(t * 12);
      if (layer === 'back') {
        // Inside: a bright blue aura tight to the body — the Wizard's own silhouette, slightly larger, pulsing.
        // It grows and gets more restless as the weapon charges (jitter, more layers, a dark-red rim).
        const c0 = Math.min(1, st.charge ?? 0); const pulse = .85 + .15 * Math.sin(t * (14 + 10 * c0)); const grow = 1 + (st.flash ?? 0) * .1 + .12 * c0;
        const jit = (i) => (rnd(frame * 3 + i) - .5) * (1 + 4 * c0);
        if (c0 > .35) ghostOf(ctx, p, p.x + jit(9), ry + 44.5 * (1.3 * grow - 1), p.state, p.animTime ?? 0, f, .55 + .3 * c0, '#4a0000', 1.3 * grow);
        for (const [col, k, a, i] of [['#0d47a1', 1.22 * grow, pulse, 1], ['#2196f3', 1.14 * grow, 1, 2], ['#90caf9', 1.08 + .04 * c0, 1, 3], ['#ffffff', 1.035, .9, 4]]) ghostOf(ctx, p, p.x + jit(i), ry + 44.5 * (k - 1) + jit(i + 5) * .5, p.state, p.animTime ?? 0, f, a, col, k);
        // The weapon in the hand turns into the black astral weapon and grows, held up over the shoulder.
        const c = Math.min(1, st.charge ?? 0); const sc = 1.1 + 2.1 * c; const tip = astralTipLength(weaponOf(p)) * sc;
        const hx = p.x + f * 12; const hy = ry - 46; const a = -2.15 + Math.sin(t * 3) * .05;
        ctx.save(); ctx.translate(Math.round(hx), Math.round(hy)); ctx.scale(f, 1); ctx.rotate(a);
        // The weapon's own aura: a jittering dark-red copy behind it, larger and wilder with the charge.
        ctx.save(); ctx.translate((rnd(frame + 31) - .5) * 3 * c, (rnd(frame + 37) - .5) * 3 * c); drawWeaponSolid(ctx, weaponOf(p), sc * (1.08 + .06 * c), { mainOnly: true, fill: '#4a0000', edge: '#d50032', inner: '#ff1744', detail: '#4a0000' }); ctx.restore();
        drawWeaponSolid(ctx, weaponOf(p), sc, { mainOnly: true }); /* the giant: only the main piece (no sheath / off-hand) */ ctx.restore();
        // The energy streams from the body into the weapon, and bolts crackle off the blade.
        for (let i = 0; i < 2 + Math.round(2 * c); i++) { const u = .35 + .55 * rnd(frame + i); blackBolt(ctx, p.x, ry - 50, hx + f * Math.cos(a) * tip * u, hy + Math.sin(a) * tip * u, frame * 5 + i, 2, DARK_RED); }
        for (let i = 0; i < Math.round(1 + 4 * c); i++) { const u = .3 + .7 * rnd(frame * 2 + i); const bx = hx + f * Math.cos(a) * tip * u; const by = hy + Math.sin(a) * tip * u; const o = rnd(frame + i * 9) * TAU; blackBolt(ctx, bx, by, bx + Math.cos(o) * (10 + 18 * c), by + Math.sin(o) * (10 + 18 * c), frame * 9 + i, 2, DARK_RED); }
        return;
      }
      // Outside: black lightning with dark-red edges crackling around the Wizard — more and longer with the charge.
      const cc = Math.min(1, st.charge ?? 0);
      for (let i = 0; i < 4 + Math.round(6 * cc); i++) {
        const a = rnd(frame * 7 + i) * TAU; const x0 = p.x + Math.cos(a) * 18; const y0 = ry - 44 + Math.sin(a) * 34; const L = 1 + cc;
        blackBolt(ctx, x0, y0, x0 + Math.cos(a) * (22 + rnd(frame + i * 3) * 24) * L, y0 + (Math.sin(a) * (16 + rnd(frame + i * 5) * 22) - 8) * L, frame * 13 + i, 3, DARK_RED);
      }
      for (const b of st.bolts ?? []) blackBolt(ctx, p.x + f * 14, ry - 50, b.x, b.y, 300 + Math.floor(b.t * 60), 3, DARK_RED);
    },
    end(p, st) { if (st.phase !== 'shield') combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 50, DARK_RED); }
  }
});

export const WILL_RULES = WILL; export const NOBLE_RULES = NOBLE;
