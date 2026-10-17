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
// Astral weapons: until weapon sprites and the final character animations
// exist, every weapon is a conjured, glowing VFX silhouette (additive glow,
// crystal core, swing trail). It floats at the hand instead of being held
// pixel-exact, so it reads well with any body animation.
const ASTRAL_HUES = Object.freeze({
  sword_shield: '#7fd8ff', great_axe: '#ff7a45', great_hammer: '#ffb300', dual_swords: '#4dd0e1', katana: '#ff4d6d',
  spear: '#9be564', daggers: '#b388ff', gauntlets: '#ffab40', scythe: '#c158ff', ice_sword: '#80e9ff'
});
export const astralHue = (weapon) => ASTRAL_HUES[weapon] ?? WEAPONS[weapon]?.accent ?? '#7fd8ff';

// Silhouette parts per look, pointing along +x from the grip at (0,0).
// 'fill' parts trace a closed outline, 'line' parts a stroked line.
const bladePath = (len, width, from = 6) => (c) => { c.moveTo(from, -width / 2); c.lineTo(len - 6, -width / 2); c.lineTo(len, 0); c.lineTo(len - 6, width / 2); c.lineTo(from, width / 2); c.closePath(); };
const linePath = (x0, x1) => (c) => { c.moveTo(x0, 0); c.lineTo(x1, 0); };
const ASTRAL_SHAPES = {
  sword: { tip: 40, parts: [{ type: 'line', width: 3, draw: linePath(-6, 2) }, { type: 'line', width: 3, draw: (c) => { c.moveTo(2, -6); c.lineTo(2, 6); } }, { type: 'fill', draw: bladePath(40, 6) }] },
  axe: { tip: 58, parts: [{ type: 'line', width: 3, draw: linePath(-6, 46) }, { type: 'fill', draw: (c) => { c.moveTo(38, -3); c.quadraticCurveTo(52, -18, 58, -14); c.lineTo(56, 14); c.quadraticCurveTo(50, 18, 38, 3); c.closePath(); } }] },
  hammer: { tip: 52, parts: [{ type: 'line', width: 3, draw: linePath(-6, 42) }, { type: 'fill', draw: (c) => { c.rect(36, -12, 16, 24); } }] },
  spear: { tip: 78, parts: [{ type: 'line', width: 3, draw: linePath(-6, 62) }, { type: 'fill', draw: bladePath(78, 7, 58) }] },
  katana: { tip: 44, parts: [{ type: 'line', width: 3, draw: linePath(-6, 4) }, { type: 'line', width: 3, draw: (c) => { c.moveTo(4, -4); c.lineTo(4, 4); } }, { type: 'line', width: 3.5, draw: (c) => { c.moveTo(6, 0); c.quadraticCurveTo(26, -5, 44, -7); } }] },
  dual: { tip: 34, parts: [{ type: 'fill', draw: bladePath(34, 5) }, { type: 'fill', draw: (c) => { c.moveTo(6, 5.5); c.lineTo(24, 5.5); c.lineTo(30, 8); c.lineTo(24, 10.5); c.lineTo(6, 10.5); c.closePath(); } }] },
  daggers: { tip: 20, parts: [{ type: 'fill', draw: bladePath(20, 5) }, { type: 'fill', draw: (c) => { c.moveTo(6, 4.5); c.lineTo(12, 4.5); c.lineTo(18, 7); c.lineTo(12, 9.5); c.lineTo(6, 9.5); c.closePath(); } }] },
  gauntlets: { tip: 14, parts: [{ type: 'fill', draw: (c) => { c.rect(-4, -6, 16, 12); } }, { type: 'line', width: 2, draw: (c) => { c.moveTo(8, -6); c.lineTo(8, 6); } }] },
  scythe: { tip: 58, parts: [{ type: 'line', width: 3, draw: linePath(-6, 58) }, { type: 'line', width: 4.5, draw: (c) => { c.moveTo(56, 0); c.quadraticCurveTo(46, -26, 20, -30); } }] }
};
const shapeFor = (w) => ASTRAL_SHAPES[w.look] ?? ASTRAL_SHAPES.sword;
export const astralTipLength = (weapon) => shapeFor(WEAPONS[weapon] ?? WEAPONS.sword_shield).tip;

function traceParts(ctx, parts, pass) {
  for (const part of parts) {
    ctx.beginPath();
    part.draw(ctx);
    if (part.type === 'fill') {
      if (pass.fill) { ctx.fillStyle = pass.fill; ctx.fill(); }
      if (pass.edge) { ctx.strokeStyle = pass.edge; ctx.lineWidth = pass.edgeWidth; ctx.stroke(); }
    } else {
      ctx.strokeStyle = pass.line; ctx.lineWidth = Math.max(1, part.width + pass.lineGrow); ctx.stroke();
    }
  }
}

// Draws a weapon pointing along +x from (0,0) (the grip), already rotated.
// options: intensity (glow strength), time (shimmer phase).
export function drawWeaponShape(ctx, weapon, scale = 1, { intensity = .8, time = performance.now() / 1000 } = {}) {
  const w = WEAPONS[weapon] ?? WEAPONS.sword_shield;
  const hue = astralHue(weapon);
  const shape = shapeFor(w);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  const base = ctx.globalAlpha;
  // 1) Soft outer glow.
  ctx.shadowColor = hue; ctx.shadowBlur = 10 + 8 * intensity;
  ctx.globalAlpha = base * Math.min(1, .32 + .25 * intensity);
  traceParts(ctx, shape.parts, { fill: hue, edge: hue, edgeWidth: 4, line: hue, lineGrow: 4 });
  // 2) Crystal core with a bright edge.
  ctx.shadowBlur = 0;
  ctx.globalAlpha = base * .85;
  traceParts(ctx, shape.parts, { fill: hue + '59', edge: 'rgba(255,255,255,.9)', edgeWidth: 1.2, line: 'rgba(255,255,255,.92)', lineGrow: -1 });
  // The shield of sword & shield: a ring of light.
  if (w.shield) {
    ctx.globalAlpha = base * .7; ctx.strokeStyle = hue; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(-4, 14, 8, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = base * .18; ctx.fillStyle = hue; ctx.fill();
  }
  // 3) Motes drifting along the weapon.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    const u = (time * .7 + i / 3) % 1;
    ctx.globalAlpha = base * Math.sin(u * Math.PI) * .9;
    ctx.fillRect(u * shape.tip - 1, Math.sin(time * 5 + i * 2.1) * 4 - 1, 2, 2);
  }
  ctx.restore();
}

// Swing angles (grip-relative) of the held weapon for the current action.
export function weaponSwing(player) {
  const swinging = player.stateTimer > 0 && /^attack|uppercut|heavyStrike/.test(player.state);
  const progress = swinging ? 1 - Math.max(0, player.stateTimer) / (player._weaponSwingTime || .3) : 0;
  if (!swinging) return { swinging, progress, from: 0, angle: -.55 + Math.sin((player.animTime ?? 0) * 3) * .05 };
  const from = player.state === 'uppercut' ? -2.2 : -1.6;
  const sweep = player.state === 'uppercut' ? 1.4 : 2.4;
  // Front-loaded: the strike snaps through, then settles.
  const eased = 1 - Math.pow(1 - Math.min(1, progress * 1.35), 3);
  return { swinging, progress, from, angle: from + eased * sweep };
}

// The weapon at a Wizard's hand: floats, swings with the attack and leaves
// a crescent of light behind.
export function drawHeldWeapon(ctx, player, renderY) {
  const weaponId = player.weapon ?? player.classWeapon;
  if (!weaponId) return;
  const f = player.facing || 1;
  const { swinging, progress, from, angle } = weaponSwing(player);
  const hue = astralHue(weaponId);
  const tip = astralTipLength(weaponId);
  const time = player.animTime ?? 0;
  const hover = swinging ? 0 : Math.sin(time * 2.4) * 2;
  ctx.save();
  ctx.translate(player.x + f * 14, renderY - 44 + hover);
  ctx.scale(f, 1);
  if (swinging && angle > from + .05) {
    const fade = 1 - progress * .7;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.globalAlpha = .28 * fade; ctx.strokeStyle = hue; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(0, 0, tip * .78, from, angle); ctx.stroke();
    ctx.globalAlpha = .55 * fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, tip * .95, Math.max(from, angle - .9), angle); ctx.stroke();
    ctx.restore();
    // Afterimages just behind the blade.
    for (let k = 3; k >= 1; k--) {
      ctx.save(); ctx.globalAlpha = .16 / k * fade; ctx.rotate(Math.max(from, angle - k * .22));
      drawWeaponShape(ctx, weaponId, 1, { intensity: .4, time });
      ctx.restore();
    }
  }
  // Grip anchor: a small orb of light where the weapon is bound to the hand.
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5; ctx.fillStyle = hue;
  ctx.beginPath(); ctx.arc(0, 0, swinging ? 5 : 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.rotate(angle);
  drawWeaponShape(ctx, weaponId, 1, { intensity: swinging ? 1.1 : .7, time });
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
