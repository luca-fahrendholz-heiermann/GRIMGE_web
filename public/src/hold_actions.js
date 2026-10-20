// GRIMGE Prototype — the HOLD slot: attack held without a direction swipe
// (touch hold without drag, K without W / S / forward, pad X with a neutral stick).
//
// Slot model (user, 18 Oct 2026):
//  • Normal weapon mode — tap attacks are melee on the lane and ranged only on
//    the castle battlements; HOLD is the weapon-typical ranged move that also
//    works on the lane (magic staffs fire, daggers are thrown, bows shoot a
//    charged piercing arrow, melee weapons cut an air slash). On the castle it
//    becomes the bigger ranged attack. It costs a little mana (no spamming).
//  • Arcane State / transformation — HOLD is the PULL: the form fires a hook at
//    the nearest foe in range; only a real hit drags it close (brief stun) so a
//    grab can follow (no homing, guard stops it, short cooldown).
//    Like every special attack of an Arcane State it costs mana.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { makeWeaponShots, WEAPONS } from './weapons.js';
import { PULL_LOOKS, defaultPullLook } from './pull_looks.js';
import { stackedShot } from './weapon_kits.js';
import { groundYForDepth } from './world.js';

const DEPTH_PX = 150;

export const HOLD_MANA = Object.freeze({ lane: 2, castle: 4, pull: 5 });
export const HOLD_MIN_TIME = .3;          // touch: a hold shorter than this stays a tap

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
  const shot = stackedShot(player, weaponReachShot(player)); // Gezinkte Karten: every card a joker
  const big = castle ? { ...shot, life: (shot.life ?? 1) * 1.6, size: (shot.size ?? 1) * 1.3, pierce: true } : shot;
  const shots = makeWeaponShots(player, big, player.weapon ?? player.classWeapon, { power: (castle ? 1.5 : 1) * (1 + Math.min(1, charge) * .3), volley: castle ? 2 : 0 });
  for (const s of shots) spells.addSpell(s, 'B');
  player.state = 'heavyStrike'; player.stateTimer = .32; player._weaponSwingTime = .32; player.vx = 0; player.vz = 0; player.canAttack = false;
  player.setWeaponMotion?.('heavy');
  player.lastHoldAction = castle ? 'CASTLE SHOT' : 'REACH';
  audio.playSlash(castle ? .7 : .95);
  return true;
}

// The pull hook (user, 20 Oct 2026 — the old pull always caught the nearest foe and
// could be spammed): it is FIRED in a straight line at the nearest foe inside the
// aim radius (also at foes in the air), does NOT home in, and only grabs when it
// really hits. A guard in front stops it; a miss reels back empty. Range grows with
// the pullRange passive; a short cooldown follows every throw.
export const PULL_RANGE = 260;
export const PULL_COOLDOWN = 1.2;
const PULL_SPEED = 980;
const PULL_STOP = 46;
const HOOK_HIT_X = 20;
const HOOK_HIT_DEPTH = 22;
export const pullRangeOf = (player) => PULL_RANGE * (player.buildModifiers?.pullRange ?? 1) + (player.pullRangeBonus ?? 0);

export class PullTetherFx {
  constructor(player, game, mat, look = null, aim = null) {
    this.player = player; this.owner = player; this.team = player.team; this.game = game;
    this.mat = mat; this.look = look; this.t = 0; this.drag = .3; this.isFinished = false;
    const f = player.facing || 1;
    // 3D hook: x, depth in pixels (z * DEPTH_PX), height above the ground.
    this.ox = player.x + f * 16; this.oz = player.z; this.oh = (player.elevation ?? 0) + 48;
    this.range = pullRangeOf(player);
    const tx = aim ? aim.x : this.ox + f * this.range; const tz = aim ? (aim.z ?? player.z) : player.z; const th = aim ? (aim.elevation ?? 0) + 40 : this.oh;
    const dx = tx - this.ox; const dd = (tz - this.oz) * DEPTH_PX; const dh = th - this.oh; const len = Math.hypot(dx, dd, dh) || 1;
    this.dir = { x: dx / len, d: dd / len, h: dh / len };   // fixed at release: no homing
    this.dist = 0; this.phase = 'fly'; this.target = null; this.fromX = 0; this.fromH = 0; this.dragT = 0; this.reelFrom = 0;
  }
  get tip() { return { x: this.ox + this.dir.x * this.dist, z: this.oz + this.dir.d * this.dist / DEPTH_PX, h: this.oh + this.dir.h * this.dist }; }
  candidates() {
    return (this.game?.getHostileTargets?.(this.team) ?? []).filter((t) => t && !t.isDead && !t.isObjective && !t.isProp && !t.isStoneWall && (t.hp ?? 1) > 0);
  }
  update(dt) {
    this.t += dt;
    const p = this.player; const f = p.facing || 1;
    if (this.phase === 'fly') {
      this.dist = Math.min(this.range, this.dist + PULL_SPEED * dt);
      const tip = this.tip;
      const hit = this.candidates().find((t) => {
        const el = t.elevation ?? 0; const height = t.visualHeight ?? 80;
        return Math.abs(t.x - tip.x) < HOOK_HIT_X + (t.hitRadiusX ?? 14) * .5 && Math.abs(((t.z ?? tip.z) - tip.z) * DEPTH_PX) < HOOK_HIT_DEPTH && tip.h > el - 10 && tip.h < el + height;
      });
      if (hit) {
        const res = hit.takeDamage?.(6, Math.sign(hit.x - p.x || f) * .5, 0, .75, false, 'spell');
        if (res?.blocked || res?.dodged || res?.ignored) {
          // Guarded / dodged: the hook bounces off and reels back empty.
          combat.spawnHitSparks(tip.x, groundYForDepth(tip.z) - tip.h, -f, this.mat?.edge ?? '#fff', 8);
          this.phase = 'reel'; this.reelFrom = this.dist;
        } else {
          this.phase = 'drag'; this.target = hit; this.fromX = hit.x; this.fromH = hit.elevation ?? 0; this.dragT = 0;
          combat.triggerHitstop?.(3); audio.playSlash(1.3);
        }
      } else if (this.dist >= this.range) { this.phase = 'reel'; this.reelFrom = this.dist; }
    } else if (this.phase === 'drag') {
      const t = this.target; this.dragT += dt;
      if (t && !t.isDead) {
        // Ease-out slide to just in front of the caster, same depth band; airborne foes come down.
        const k = Math.min(1, this.dragT / this.drag); const e = 1 - (1 - k) * (1 - k);
        t.x = this.fromX + (p.x + f * PULL_STOP - this.fromX) * e; t.kbVelX = 0; t.vx = 0;
        if (Number.isFinite(t.z)) t.z += (p.z - t.z) * Math.min(1, dt * 10);
        if (this.fromH > 0) { t.elevation = this.fromH * (1 - e) + (p.elevation ?? 0) * e; t.vElevation = 0; }
      }
      if (this.dragT > this.drag + .12) this.isFinished = true;
    } else {
      // Missed: reel the empty hook back.
      this.dist = Math.max(0, this.dist - PULL_SPEED * 1.4 * dt);
      if (this.dist <= 0) this.isFinished = true;
    }
  }
  render(ctx) {
    const p = this.player; const f = p.facing || 1; const hx = p.x + f * 16; const hy = p.y - 48; // y already includes the elevation
    let tx; let ty; let k; let d = 0; let a = 1;
    if (this.phase === 'drag' && this.target) {
      const t = this.target; tx = t.x; ty = (t.y ?? p.y) - 40; k = 1;
      d = Math.min(1, this.dragT / this.drag); a = this.dragT > this.drag ? Math.max(0, 1 - (this.dragT - this.drag) / .12) : 1;
    } else {
      const tip = this.tip; tx = tip.x; ty = groundYForDepth(tip.z) - tip.h; k = Math.min(.99, this.dist / this.range);
      if (this.phase === 'reel') a = .55 + .45 * (this.dist / (this.reelFrom || 1));
    }
    // Each form draws its own pull (pull_looks.js); the mechanic stays the same.
    const q = { hx, hy, tx, ty, k, d, a, f, t: (p.animTime ?? 0) + this.t, mat: this.mat, target: this.target, player: p, fromX: this.fromX || tx };
    ctx.save(); (PULL_LOOKS[this.look] ?? defaultPullLook)(ctx, q); ctx.restore();
  }
}

// Arcane State / transformation: fire the pull hook at the nearest foe in the aim radius.
const PULL_MAT = { kind: 'crystal', dark: '#2a1f44', body: '#b9a3f0', facet: '#e6dcff', vein: '#c9a8ff', edge: '#ffffff', spark: '#e9dcff', core: '#ffffff', glow: 'rgba(201,168,255,', edgeGlow: 'rgba(255,255,255,' };
export function releaseFormPull(player, game, spells, { look = null, mat = PULL_MAT, mana = true } = {}) {
  if ((player.pullCooldown ?? 0) > 0) {
    combat.spawnDamageText(player.x, player.y - 70, 'COOLDOWN', { color: '#b39ddb' });
    return false;
  }
  if (mana && player.freeMana < HOLD_MANA.pull) return noMana(player);
  const range = pullRangeOf(player);
  const hand = { x: player.x, z: player.z, h: (player.elevation ?? 0) + 48 };
  // Aim: the nearest foe inside the radius, in any direction and also in the air.
  const aim = (game?.getHostileTargets?.(player.team) ?? [])
    .filter((t) => t && !t.isDead && !t.isObjective && !t.isProp && !t.isStoneWall && (t.hp ?? 1) > 0)
    .map((t) => ({ t, d: Math.hypot(t.x - hand.x, ((t.z ?? hand.z) - hand.z) * DEPTH_PX, (t.elevation ?? 0) + 40 - hand.h) }))
    .filter((o) => o.d < range).sort((a, b) => a.d - b.d)[0]?.t ?? null;
  if (aim && Math.abs(aim.x - player.x) > 4) player.facing = Math.sign(aim.x - player.x);
  if (mana) player.mp -= HOLD_MANA.pull;
  player.pullCooldown = PULL_COOLDOWN;
  player.state = 'attack3'; player.stateTimer = .36; player.canAttack = false; player.vx = 0; player.vz = 0;
  player.lastHoldAction = 'PULL';
  spells.addSpell(new PullTetherFx(player, game, mat, look, aim), 'B');
  audio.playSlash(1.1);
  return true;
}

export const isHoldDir = (dir) => dir === 'hold';
