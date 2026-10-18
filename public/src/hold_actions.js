// GRIMGE Prototype — the HOLD slot: attack held without a direction swipe
// (touch hold without drag, K without W / S / forward, pad X with a neutral stick).
//
// Slot model (user, 18 Oct 2026):
//  • Normal weapon mode — tap attacks are melee on the lane and ranged only on
//    the castle battlements; HOLD is the weapon-typical ranged move that also
//    works on the lane (magic staffs fire, daggers are thrown, bows shoot a
//    charged piercing arrow, melee weapons cut an air slash). On the castle it
//    becomes the bigger ranged attack. It costs a little mana (no spamming).
//  • Arcane State / transformation — HOLD is the PULL: the form reaches out,
//    drags the nearest foe in front close (brief stun) so a grab can follow.
//    Like every special attack of an Arcane State it costs mana.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { makeWeaponShots, WEAPONS } from './weapons.js';
import { PULL_LOOKS, defaultPullLook } from './pull_looks.js';

export const HOLD_MANA = Object.freeze({ lane: 2, castle: 4, pull: 5 });
export const HOLD_MIN_TIME = .3;          // touch: a hold shorter than this stays a tap
const PULL_RANGE = 300;
const PULL_STOP = 46;

export const isOnCastle = (p) => /CastleUpperPlatform|CastleAccessRamp/.test(p?.surfaceId ?? '');

// The weapon-typical ranged move of the held / class weapon.
export function weaponReachShot(player) {
  const id = player.weapon ?? player.classWeapon;
  const w = id ? WEAPONS[id] : null;
  if (w?.heavy?.shot) return { ...w.heavy.shot };                                       // bows, staffs, cards, fans …
  if (w?.look === 'daggers') return { kind: 'knife', speed: 860, damage: 14, count: 3, spread: .14, life: .55 };
  // Melee weapons: an air slash; heavier weapons cut slower, wider and harder.
  const heavy = w?.heavy?.damage ?? 40;
  return { kind: 'wave', speed: 760 - Math.min(260, heavy * 3), damage: Math.round(10 + heavy * .3), knock: 120 + heavy * 2, life: .5, size: .9 + heavy / 120, pierce: heavy >= 60 };
}

function noMana(player) {
  combat.spawnDamageText(player.x, player.y - 70, 'NO MANA', { color: '#64b5f6' });
  combat.spawnShockwave(player.x + (player.facing || 1) * 20, player.y - 40, 22, '#64b5f6');
  return false;
}

// Normal mode: fires the weapon-typical ranged move (bigger on the castle).
export function releaseWeaponReach(player, spells, charge = 0) {
  const castle = isOnCastle(player);
  const cost = castle ? HOLD_MANA.castle : HOLD_MANA.lane;
  if (player.freeMana < cost) return noMana(player);
  player.mp -= cost;
  const shot = weaponReachShot(player);
  const big = castle ? { ...shot, life: (shot.life ?? 1) * 1.6, size: (shot.size ?? 1) * 1.3, pierce: true } : shot;
  const shots = makeWeaponShots(player, big, player.weapon ?? player.classWeapon, { power: (castle ? 1.5 : 1) * (1 + Math.min(1, charge) * .3), volley: castle ? 2 : 0 });
  for (const s of shots) spells.addSpell(s, 'B');
  player.state = 'heavyStrike'; player.stateTimer = .32; player._weaponSwingTime = .32; player.vx = 0; player.vz = 0; player.canAttack = false;
  player.setWeaponMotion?.('heavy');
  player.lastHoldAction = castle ? 'CASTLE SHOT' : 'REACH';
  audio.playSlash(castle ? .7 : .95);
  return true;
}

// The pull tether: reaches the target, then drags it in front of the caster.
export class PullTetherFx {
  constructor(player, target, mat, look = null) {
    this.player = player; this.owner = player; this.team = player.team; this.target = target;
    this.mat = mat; this.look = look; this.t = 0; this.reach = .14; this.drag = .3; this.isFinished = false;
    this.fromX = target?.x ?? player.x;
  }
  update(dt) {
    this.t += dt;
    const p = this.player; const t = this.target; const f = p.facing || 1;
    if (t && this.t > this.reach && this.t <= this.reach + this.drag && !t.isDead) {
      // Drag it in: an ease-out slide to just in front of the caster, same depth band.
      const k = Math.min(1, (this.t - this.reach) / this.drag); const e = 1 - (1 - k) * (1 - k);
      t.x = this.fromX + (p.x + f * PULL_STOP - this.fromX) * e; t.kbVelX = 0; t.vx = 0;
      if (Number.isFinite(t.z)) t.z += (p.z - t.z) * Math.min(1, dt * 10);
    }
    if (this.t > this.reach + this.drag + .12) this.isFinished = true;
  }
  render(ctx) {
    const p = this.player; const t = this.target; if (!t) return;
    const f = p.facing || 1; const hx = p.x + f * 16; const hy = p.y - 48;
    const k = Math.min(1, this.t / this.reach);
    const tx = hx + ((t.x) - hx) * k; const ty = hy + ((t.y ?? p.y) - 40 - hy) * k;
    const fade = this.t > this.reach + this.drag ? Math.max(0, 1 - (this.t - this.reach - this.drag) / .12) : 1;
    // Each form draws its own pull (pull_looks.js); the mechanic stays the same.
    const q = { hx, hy, tx, ty, k, d: Math.max(0, Math.min(1, (this.t - this.reach) / this.drag)), a: fade, f, t: (p.animTime ?? 0) + this.t, mat: this.mat, target: t, player: p, fromX: this.fromX };
    ctx.save(); (PULL_LOOKS[this.look] ?? defaultPullLook)(ctx, q); ctx.restore();
  }
}

// Arcane State / transformation: pull the nearest foe in front close.
const PULL_MAT = { kind: 'crystal', dark: '#2a1f44', body: '#b9a3f0', facet: '#e6dcff', vein: '#c9a8ff', edge: '#ffffff', spark: '#e9dcff', core: '#ffffff', glow: 'rgba(201,168,255,', edgeGlow: 'rgba(255,255,255,' };
export function releaseFormPull(player, game, spells, { look = null, mat = PULL_MAT, mana = true } = {}) {
  if (mana && player.freeMana < HOLD_MANA.pull) return noMana(player);
  const f = player.facing || 1;
  const target = (game?.getHostileTargets?.(player.team) ?? [])
    .filter((t) => t && !t.isDead && !t.isObjective && !t.isProp && (t.hp ?? 1) > 0 && (t.x - player.x) * f > 10)
    .map((t) => ({ t, d: Math.hypot(t.x - player.x, ((t.z ?? player.z) - player.z) * 150) }))
    .filter((o) => o.d < PULL_RANGE).sort((a, b) => a.d - b.d)[0]?.t ?? null;
  if (mana) player.mp -= HOLD_MANA.pull;
  player.state = 'attack3'; player.stateTimer = .36; player.canAttack = false; player.vx = 0; player.vz = 0;
  player.lastHoldAction = 'PULL';
  if (!target) { combat.spawnShockwave(player.x + f * 60, player.y - 40, 20, mat.vein); return true; }
  target.takeDamage?.(6, 0, 0, .75, false, 'spell');
  spells.addSpell(new PullTetherFx(player, target, mat, look), 'B');
  audio.playSlash(1.3);
  return true;
}

export const isHoldDir = (dir) => dir === 'hold';
