// GRIMGE Prototype — pickup weapons (Training, Little-Fighter style).
//
// Any Wizard can pick up a weapon lying on the field (attack while standing
// on it) and instantly fights with that weapon's melee style — independent
// of the class. Weapon crates appear now and then; breaking one drops its
// weapon. Sprint + attack throws the held weapon: it spins forward, hits the
// first enemy and lands where it can be picked up again (by anyone).
//
// Profiles follow docs/class_concept.md (weapon families and intended feel);
// the numbers are prototype tuning on top of MELEE_BASELINE's input contract.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';

const hit = (state, time, vx, damage, knockback, lift, reach, extra = {}) => Object.freeze({ state, time, vx, damage, knockback, lift, radius: Math.round(reach * .6), reach, hitstopTicks: extra.finisher ? 6 : 3, hitReaction: extra.finisher ? 'finisher' : 'light', ...extra });

export const WEAPONS = Object.freeze({
  sword_shield: Object.freeze({
    name: 'SWORD & SHIELD', family: 'Guardian', look: 'sword', shield: true, color: '#cfd8dc', accent: '#ffd54f',
    desc: 'Fast, precise cuts; the shield blocks better.',
    combo: [hit('attack1', .22, 150, 24, 160, 40, 70), hit('attack2', .22, 170, 26, 180, 60, 72), hit('attack3', .32, 260, 44, 380, 220, 78, { finisher: true })],
    heavy: { damage: 46, knockback: 560, lift: 150, reach: 82 }, uppercut: { damage: 34, knockback: 120, lift: 460 }, guardBonus: .5
  }),
  great_axe: Object.freeze({
    name: 'GREAT AXE', family: 'Berserker', look: 'axe', color: '#b0bec5', accent: '#8d6e63',
    desc: 'Slow, wide cleaves that break guards.',
    combo: [hit('attack1', .34, 120, 40, 260, 80, 92, { guardBreak: 18 }), hit('attack3', .42, 200, 64, 480, 240, 96, { finisher: true, guardBreak: 30 })],
    heavy: { damage: 70, knockback: 640, lift: 200, reach: 98 }, uppercut: { damage: 48, knockback: 160, lift: 500 }
  }),
  great_hammer: Object.freeze({
    name: 'GREAT HAMMER', family: 'Berserker', look: 'hammer', color: '#90a4ae', accent: '#5d4037',
    desc: 'Heavy knockback, stagger and launches.',
    combo: [hit('attack1', .36, 100, 38, 420, 160, 84), hit('attack3', .46, 180, 62, 700, 360, 90, { finisher: true, shockwave: true })],
    heavy: { damage: 66, knockback: 820, lift: 260, reach: 90 }, uppercut: { damage: 50, knockback: 100, lift: 620 }
  }),
  dual_swords: Object.freeze({
    name: 'DUAL SWORDS', family: 'Bladedancer', look: 'dual', color: '#e0f7fa', accent: '#4dd0e1',
    desc: 'A long chain of fast alternating cuts.',
    combo: [hit('attack1', .14, 120, 13, 90, 20, 62), hit('attack2', .14, 120, 13, 90, 20, 62), hit('attack1', .14, 130, 14, 100, 30, 64), hit('attack2', .14, 130, 15, 110, 40, 64), hit('attack3', .26, 240, 30, 360, 200, 70, { finisher: true })],
    heavy: { damage: 40, knockback: 480, lift: 160, reach: 72 }, uppercut: { damage: 30, knockback: 100, lift: 440 }
  }),
  katana: Object.freeze({
    name: 'KATANA', family: 'Ronin', look: 'katana', color: '#eceff1', accent: '#d32f2f',
    desc: 'Three precise slashes with short recovery; often critical.',
    combo: [hit('attack1', .18, 200, 26, 150, 40, 76, { crit: .25 }), hit('attack2', .18, 220, 28, 170, 60, 78, { crit: .25 }), hit('attack3', .28, 320, 46, 360, 200, 84, { finisher: true, crit: .4 })],
    heavy: { damage: 52, knockback: 520, lift: 140, reach: 90 }, uppercut: { damage: 36, knockback: 120, lift: 470 }
  }),
  spear: Object.freeze({
    name: 'SPEAR', family: 'Lancer', look: 'spear', color: '#cfd8dc', accent: '#8d6e63',
    desc: 'Long, fast linear thrusts that keep enemies at range.',
    combo: [hit('attack1', .2, 160, 22, 200, 30, 112), hit('attack2', .2, 170, 24, 220, 40, 116), hit('attack3', .3, 280, 40, 420, 160, 124, { finisher: true })],
    heavy: { damage: 48, knockback: 600, lift: 120, reach: 130 }, uppercut: { damage: 32, knockback: 140, lift: 440 }
  }),
  daggers: Object.freeze({
    name: 'DUAL DAGGERS', family: 'Shadow', look: 'daggers', color: '#b0bec5', accent: '#7e57c2',
    desc: 'Very close and very fast; short combos.',
    combo: [hit('attack1', .12, 110, 12, 70, 10, 48), hit('attack2', .12, 110, 12, 70, 10, 48), hit('attack1', .12, 120, 13, 80, 20, 50), hit('attack3', .22, 220, 26, 300, 160, 54, { finisher: true, crit: .3 })],
    heavy: { damage: 36, knockback: 400, lift: 120, reach: 58 }, uppercut: { damage: 28, knockback: 90, lift: 420 }
  }),
  gauntlets: Object.freeze({
    name: 'GAUNTLETS', family: 'Monk', look: 'gauntlets', color: '#ffb74d', accent: '#e65100',
    desc: 'Punch chains, uppercuts and a ground slam.',
    combo: [hit('attack1', .14, 130, 15, 110, 30, 52), hit('attack2', .14, 140, 16, 120, 40, 52), hit('attack1', .16, 150, 18, 140, 60, 54), hit('attack3', .28, 260, 34, 420, 300, 58, { finisher: true })],
    heavy: { damage: 44, knockback: 560, lift: 220, reach: 64 }, uppercut: { damage: 40, knockback: 80, lift: 600 }
  }),
  scythe: Object.freeze({
    name: 'SCYTHE', family: 'Reaper', look: 'scythe', color: '#b0bec5', accent: '#4a148c',
    desc: 'Huge sweeps that also catch enemies behind you.',
    combo: [hit('attack1', .3, 90, 30, 220, 60, 100, { behind: true }), hit('attack3', .4, 160, 52, 460, 220, 108, { finisher: true, behind: true })],
    heavy: { damage: 58, knockback: 560, lift: 180, reach: 110 }, uppercut: { damage: 42, knockback: 120, lift: 480 }
  }),
  ice_sword: Object.freeze({
    name: 'ICE SWORD', family: 'Conjured', look: 'sword', color: '#b3f0ff', accent: '#00b8d4', translucent: true,
    desc: 'A conjured blade: the finisher freezes; it shatters after a while.',
    combo: [hit('attack1', .2, 160, 22, 150, 40, 72), hit('attack2', .2, 170, 24, 170, 60, 74), hit('attack3', .3, 260, 36, 320, 160, 80, { finisher: true, freeze: 1.4 })],
    heavy: { damage: 44, knockback: 520, lift: 150, reach: 84, freeze: 1 }, uppercut: { damage: 32, knockback: 120, lift: 460 }, durability: 24
  })
});

export const WEAPON_IDS = Object.freeze(Object.keys(WEAPONS));

// ── drawing ──────────────────────────────────────────────────────────────
// Draws a weapon pointing along +x from (0,0) (the grip), already rotated.
export function drawWeaponShape(ctx, weapon, scale = 1) {
  const w = WEAPONS[weapon] ?? WEAPONS.sword_shield;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.globalAlpha *= w.translucent ? .8 : 1;
  ctx.lineCap = 'round';
  const blade = (len, width, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(6, -width / 2); ctx.lineTo(len - 6, -width / 2); ctx.lineTo(len, 0); ctx.lineTo(len - 6, width / 2); ctx.lineTo(6, width / 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(20,20,30,.7)'; ctx.lineWidth = 1; ctx.stroke(); };
  const haft = (len, color = '#6d4c41') => { ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(len, 0); ctx.stroke(); };
  switch (w.look) {
    case 'axe': haft(46); ctx.fillStyle = w.color; ctx.beginPath(); ctx.moveTo(38, -3); ctx.quadraticCurveTo(52, -18, 58, -14); ctx.lineTo(56, 14); ctx.quadraticCurveTo(50, 18, 38, 3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(20,20,30,.7)'; ctx.lineWidth = 1; ctx.stroke(); break;
    case 'hammer': haft(42); ctx.fillStyle = w.color; ctx.fillRect(36, -12, 16, 24); ctx.strokeStyle = 'rgba(20,20,30,.7)'; ctx.strokeRect(36, -12, 16, 24); break;
    case 'spear': haft(62); blade(78, 7, w.color); break;
    case 'katana': ctx.fillStyle = '#3e2723'; ctx.fillRect(-6, -2, 10, 4); ctx.fillStyle = w.accent; ctx.fillRect(3, -4, 3, 8); ctx.strokeStyle = w.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, 0); ctx.quadraticCurveTo(26, -5, 44, -7); ctx.stroke(); break;
    case 'dual': blade(34, 5, w.color); ctx.translate(0, 8); blade(30, 5, w.color); break;
    case 'daggers': blade(20, 5, w.color); ctx.translate(0, 7); blade(18, 5, w.color); break;
    case 'gauntlets': ctx.fillStyle = w.color; ctx.fillRect(-4, -6, 14, 12); ctx.fillStyle = w.accent; ctx.fillRect(8, -6, 4, 12); break;
    case 'scythe': haft(58, '#4e342e'); ctx.strokeStyle = w.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(56, 0); ctx.quadraticCurveTo(46, -26, 20, -30); ctx.stroke(); break;
    default:
      ctx.fillStyle = '#4e342e'; ctx.fillRect(-6, -2, 8, 4); ctx.fillStyle = w.accent; ctx.fillRect(1, -6, 3, 12);
      blade(40, 6, w.color);
      if (w.shield) { ctx.fillStyle = '#546e7a'; ctx.beginPath(); ctx.ellipse(-4, 14, 8, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = w.accent; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  ctx.restore();
}

// The weapon in a Wizard's hand: angle follows the attack swing.
export function drawHeldWeapon(ctx, player, renderY) {
  if (!player.weapon) return;
  const f = player.facing || 1;
  const progress = player.stateTimer > 0 && /^attack|uppercut|heavyStrike/.test(player.state) ? 1 - Math.max(0, player.stateTimer) / (player._weaponSwingTime || .3) : 0;
  const swing = player.state === 'uppercut' ? -2.2 + progress * 1.4 : /^attack|heavyStrike/.test(player.state) ? -1.6 + progress * 2.4 : -.55 + Math.sin(player.animTime * 3) * .05;
  ctx.save();
  ctx.translate(player.x + f * 14, renderY - 44);
  ctx.scale(f, 1);
  ctx.rotate(swing);
  drawWeaponShape(ctx, player.weapon, 1);
  ctx.restore();
}

// ── field items ──────────────────────────────────────────────────────────
export class WeaponPickup {
  constructor(weapon, x, z, durability = null) {
    this.weapon = weapon; this.x = x; this.z = z; this.t = Math.random() * 6; this.durability = durability;
    this.isWeaponPickup = true;
  }
  get y() { return groundYForDepth(this.z); }
  render(ctx) {
    const y = this.y; const bob = Math.sin(this.t * 3) * 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(this.x, y, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(this.x - 18, y - 8 + bob); ctx.rotate(-.25);
    drawWeaponShape(ctx, this.weapon, .9);
    ctx.restore();
    // Glint so the player notices it.
    if ((this.t * 1.2) % 2 < .25) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(this.x + 6, y - 16 + bob, 3, 3); ctx.restore(); }
  }
}

export class ThrownWeaponSpell {
  constructor(thrower, weapon, durability, onLand) {
    this.team = thrower.team; this.weapon = weapon; this.durability = durability; this.onLand = onLand;
    this.facing = thrower.facing || 1;
    this.x = thrower.x + this.facing * 24; this.z = thrower.z; this.height = 46;
    this.vx = this.facing * 560; this.vh = 120; this.t = 0; this.isFinished = false; this.spin = 0;
    const profile = WEAPONS[weapon]; this.damage = Math.round((profile.heavy?.damage ?? 40) * .9);
  }
  get y() { return groundYForDepth(this.z); }
  update(dt, gameWorld) {
    this.t += dt; this.spin += dt * 18 * this.facing;
    this.x += this.vx * dt; this.vh -= 600 * dt; this.height += this.vh * dt;
    if (!this.hitTarget) {
      for (const target of gameWorld.getHostileTargets(this.team)) {
        if (target.isDead || target.lifeState === 'Dead' || target.isObjective) continue;
        if (Math.abs(target.x - this.x) > 20 || Math.abs(((target.z ?? this.z) - this.z) * 150) > 24) continue;
        this.hitTarget = target;
        target.takeDamage(this.damage, this.facing * 320, 160, .45, false, 'melee');
        combat.spawnHitSparks(target.x, (target.y ?? this.y) - 34, this.facing, '#fff', 10);
        audio.playImpact?.(true);
        this.vx = -this.facing * 120; this.vh = 180;
        break;
      }
    }
    if (this.height <= 0 || this.t > 2) {
      this.isFinished = true;
      this.onLand?.(this.weapon, this.x, this.z, this.durability);
    }
  }
  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - this.height); ctx.rotate(this.spin);
    drawWeaponShape(ctx, this.weapon, .9);
    ctx.restore();
  }
}

// Training armory: field weapons and the weapon crates that appear now and then.
export class WeaponArmory {
  constructor() { this.pickups = []; this.crateTimer = 4; }
  clear() { this.pickups = []; this.crateTimer = 4; }

  drop(weapon, x, z, durability = null) {
    if (!WEAPONS[weapon]) return null;
    const pickup = new WeaponPickup(weapon, x, z, durability);
    this.pickups.push(pickup);
    return pickup;
  }

  nearest(actor, range = 30) {
    let best = null; let bestD = range;
    for (const p of this.pickups) {
      const d = Math.hypot(p.x - actor.x, (p.z - actor.z) * 150);
      if (d <= bestD) { best = p; bestD = d; }
    }
    return best;
  }

  take(pickup) {
    const i = this.pickups.indexOf(pickup);
    if (i >= 0) this.pickups.splice(i, 1);
    return pickup;
  }

  // Spawn a weapon crate now and then (max 2 at once, max 4 weapons around).
  update(dt, environment, bounds, randomWeapon = () => WEAPON_IDS[Math.floor(Math.random() * WEAPON_IDS.length)]) {
    for (const p of this.pickups) p.t += dt;
    this.crateTimer -= dt;
    if (this.crateTimer > 0) return null;
    this.crateTimer = 14 + Math.random() * 8;
    const crates = environment.livingProps().filter((prop) => prop.weaponId).length;
    if (crates >= 2 || this.pickups.length + crates >= 4) return null;
    const x = (bounds?.left ?? 100) + 60 + Math.random() * ((bounds?.right ?? 900) - (bounds?.left ?? 100) - 120);
    const z = .15 + Math.random() * .7;
    const crate = environment.addProp('crate', x, z);
    if (crate) { crate.weaponId = randomWeapon(); combat.spawnShockwave(x, groundYForDepth(z) - 10, 36, '#ffd54f'); }
    return crate;
  }
}
