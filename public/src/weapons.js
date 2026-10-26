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
import { drawWeaponSheet, hasWeaponSheet, drawKatanaSheath } from './weapon_sheets.js'; // hand-drawn weapons (some ids)
import { EXT_WEAPONS, EXT_HUES, EXT_MOTIONS, EXT_MOTION_FNS, EXT_SHAPES, EXT_PIECES, WeaponShot } from './weapons_ext.js';

const hit = (state, time, vx, damage, knockback, lift, reach, extra = {}) => Object.freeze({ state, time, vx, damage, knockback, lift, radius: Math.round(reach * .6), reach, hitstopTicks: extra.finisher ? 6 : 3, hitReaction: extra.finisher ? 'finisher' : 'light', ...extra });

const BASE_WEAPONS = ({
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

// All 36 weapon families of docs/class_concept.md (+ the conjured ice sword).
export const WEAPONS = Object.freeze({ ...BASE_WEAPONS, ...Object.fromEntries(Object.entries(EXT_WEAPONS).map(([id, w]) => [id, Object.freeze(w)])) });
export const WEAPON_IDS = Object.freeze(Object.keys(WEAPONS));

// ── drawing ──────────────────────────────────────────────────────────────
// Astral weapons: until weapon sprites and the final character animations
// exist, every weapon is a conjured, glowing VFX silhouette (additive glow,
// crystal core, rune details). Each weapon has its own motion set — slash,
// overhead chop, thrust, iaido draw, whirl, punches … — and its pieces sit
// in the hands they belong to (sword in the rear hand, shield in the front;
// dual blades, daggers and fists one per hand). It floats at the hands
// instead of being held pixel-exact, so it reads well with any body animation.
const ASTRAL_HUES = Object.freeze({ ...EXT_HUES,
  sword_shield: '#7fd8ff', great_axe: '#ff7a45', great_hammer: '#ffb300', dual_swords: '#4dd0e1', katana: '#ff4d6d',
  spear: '#9be564', daggers: '#b388ff', gauntlets: '#ffab40', scythe: '#c158ff', ice_sword: '#80e9ff'
});
export const astralHue = (weapon) => ASTRAL_HUES[weapon] ?? WEAPONS[weapon]?.accent ?? '#7fd8ff';

// Per weapon: idle pose, hand layout and the motion of every attack.
// hands: 'single' (one weapon, front hand), 'shield' (sword rear + shield
// front), 'pair' (one piece per hand; the lead hand alternates per strike).
export const WEAPON_MOTIONS = Object.freeze({ ...EXT_MOTIONS,
  sword_shield: { hands: 'shield', idle: -2.05, combo: ['slash', 'backhand', 'overhead'], heavy: 'bash', uppercut: 'rising' },
  great_axe: { hands: 'single', idle: .95, combo: ['cleave', 'overhead'], heavy: 'whirl', uppercut: 'rising' },
  great_hammer: { hands: 'single', idle: -2.35, combo: ['overhead', 'slam'], heavy: 'slam', uppercut: 'rising' },
  dual_swords: { hands: 'pair', idle: -.55, idleRear: -.95, combo: ['slash', 'backhand', 'slash', 'backhand', 'cross'], heavy: 'cross', uppercut: 'rising' },
  katana: { hands: 'single', idle: 2.75, combo: ['iaido', 'backhand', 'iaido'], heavy: 'iaido', uppercut: 'rising' },
  spear: { hands: 'single', idle: -.22, combo: ['thrust', 'thrust', 'lunge'], heavy: 'lunge', uppercut: 'rising' },
  daggers: { hands: 'pair', idle: 1.9, idleRear: 2.1, combo: ['stab', 'stab', 'stab', 'flurry'], heavy: 'flurry', uppercut: 'rising' },
  gauntlets: { hands: 'pair', idle: 0, idleRear: 0, combo: ['punch', 'punch', 'punch', 'smash'], heavy: 'smash', uppercut: 'upper' },
  scythe: { hands: 'single', idle: -1.85, combo: ['reap', 'whirl'], heavy: 'whirl', uppercut: 'rising' },
  ice_sword: { hands: 'single', idle: -.55, combo: ['slash', 'backhand', 'overhead'], heavy: 'thrust', uppercut: 'rising' }
});

// The motion of an attack ('combo' with its 1-based step, 'heavy', 'uppercut').
export function weaponMotion(weaponId, kind, step = 1) {
  const m = WEAPON_MOTIONS[weaponId];
  if (!m) return 'slash';
  if (kind === 'heavy') return m.heavy;
  if (kind === 'uppercut') return m.uppercut;
  return m.combo[(Math.max(1, step) - 1) % m.combo.length];
}

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const span = (p, a, b) => clamp01((p - a) / (b - a));

// Motion → pose at progress p (0…1): angle (0 = forward, negative = up),
// reach (px pushed forward), the trail kind and where it starts.
const MOTIONS = {
  ...EXT_MOTION_FNS,
  slash: (p) => ({ angle: -1.6 + ease(p * 1.35) * 2.4, trail: 'arc', from: -1.6 }),
  backhand: (p) => ({ angle: .9 - ease(p * 1.35) * 2.4, trail: 'arc', from: .9 }),
  rising: (p) => ({ angle: 1.3 - ease(p * 1.3) * 3.3, trail: 'arc', from: 1.3 }),
  overhead: (p) => {
    const up = span(p, 0, .3); const down = span(p, .3, .55);
    return down > 0 ? { angle: -2.7 + ease(down) * 4.0, trail: 'arc', from: -2.7 } : { angle: -.6 - up * 2.1 };
  },
  slam: (p) => {
    const up = span(p, 0, .35); const down = span(p, .35, .55);
    return down > 0 ? { angle: -2.8 + ease(down) * 4.3, trail: 'arc', from: -2.8, impact: span(p, .52, 1) } : { angle: -2.35 - up * .6 };
  },
  cleave: (p) => ({ angle: -2.9 + ease(p * 1.2) * 3.8, trail: 'arc', from: -2.9, wide: true }),
  reap: (p) => ({ angle: -2.6 + ease(p * 1.15) * 3.5, trail: 'arc', from: -2.6, wide: true }),
  whirl: (p) => ({ angle: -1.8 + ease(p) * Math.PI * 2.4, trail: 'ring', from: -1.8, wide: true }),
  thrust: (p) => { const back = span(p, 0, .22); const out = span(p, .22, .45); const ret = span(p, .7, 1); return { angle: -.06, reach: -10 * back * (1 - out) + 30 * ease(out) * (1 - ret), trail: out > 0 && ret < 1 ? 'line' : null }; },
  lunge: (p) => { const back = span(p, 0, .28); const out = span(p, .28, .5); const ret = span(p, .75, 1); return { angle: -.04, reach: -16 * back * (1 - out) + 56 * ease(out) * (1 - ret), trail: out > 0 && ret < 1 ? 'line' : null, long: true }; },
  stab: (p) => { const out = span(p, 0, .35); const ret = span(p, .5, 1); return { angle: .1, reach: 20 * ease(out) * (1 - ret), trail: out > 0 && ret < 1 ? 'line' : null }; },
  flurry: (p) => ({ angle: .05 + Math.sin(p * 37) * .12, reach: 10 + Math.abs(Math.sin(p * Math.PI * 6)) * 20, trail: 'line', both: true }),
  punch: (p) => { const out = span(p, 0, .3); const ret = span(p, .45, 1); return { angle: 0, reach: 22 * ease(out) * (1 - ret), trail: out > 0 && ret < 1 ? 'line' : null }; },
  smash: (p) => { const back = span(p, 0, .3); const out = span(p, .3, .5); const ret = span(p, .75, 1); return { angle: 0, reach: -10 * back * (1 - out) + 34 * ease(out) * (1 - ret), trail: out > 0 ? 'line' : null, impact: span(p, .45, 1), long: true }; },
  upper: (p) => { const out = span(p, 0, .4); return { angle: -1.2 * ease(out), reach: 14 * ease(out), lift: 18 * ease(out), trail: 'line' }; },
  iaido: (p) => { const draw = span(p, .12, .3); return draw > 0 ? { angle: 2.75 - ease(draw) * 3.25, trail: 'flash', flash: 1 - span(p, .3, 1) } : { angle: 2.75 }; },
  bash: (p) => { const out = span(p, .1, .35); const ret = span(p, .65, 1); return { angle: -1.0, shieldReach: 24 * ease(out) * (1 - ret), impact: span(p, .3, .9) }; },
  cross: (p) => ({ angle: -1.6 + ease(p * 1.3) * 2.5, trail: 'arc', from: -1.6, both: true, cross: true })
};
export const MOTION_NAMES = Object.freeze(Object.keys(MOTIONS));

// ── Silhouettes: parts per piece, pointing along +x from the grip. ──────
// 'fill' = closed outline, 'line' = stroked line, 'detail' = thin inner
// line drawn only in the bright core pass (fullers, runes, bands …).
const bladePath = (len, width, from = 6) => (c) => { c.moveTo(from, -width / 2); c.lineTo(len - 7, -width / 2); c.lineTo(len, 0); c.lineTo(len - 7, width / 2); c.lineTo(from, width / 2); c.closePath(); };
const seg = (x0, y0, x1, y1) => (c) => { c.moveTo(x0, y0); c.lineTo(x1, y1); };
const runeTicks = (x0, x1, n, h = 1.6) => (c) => { for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + .5) / n; c.moveTo(x - 1.2, -h); c.lineTo(x + 1.2, h); } };
const ASTRAL_SHAPES = {
  ...EXT_SHAPES,
  sword: { tip: 42, parts: [
    { type: 'line', width: 3, draw: seg(-7, 0, 1, 0) },
    { type: 'fill', draw: (c) => { c.arc(-8, 0, 2.4, 0, Math.PI * 2); } },
    { type: 'fill', draw: (c) => { c.moveTo(1, -7); c.lineTo(4, -7); c.lineTo(4, 7); c.lineTo(1, 7); c.closePath(); } },
    { type: 'fill', draw: bladePath(42, 6.5) },
    { type: 'detail', draw: seg(8, 0, 34, 0) },
    { type: 'detail', draw: runeTicks(10, 30, 4) }
  ] },
  shield: { tip: 14, parts: [
    { type: 'fill', draw: (c) => { c.moveTo(-6, -13); c.lineTo(8, -13); c.quadraticCurveTo(12, -6, 10, 1); c.lineTo(1, 15); c.lineTo(-8, 1); c.quadraticCurveTo(-10, -6, -6, -13); c.closePath(); } },
    { type: 'detail', draw: (c) => { c.moveTo(-4, -10.5); c.lineTo(6, -10.5); c.quadraticCurveTo(9, -5, 7.5, 0.5); c.lineTo(1, 11.5); c.lineTo(-5.5, 0.5); c.quadraticCurveTo(-7.5, -5, -4, -10.5); } },
    { type: 'detail', draw: (c) => { c.moveTo(1, -9); c.lineTo(1, 9); c.moveTo(-5, -3); c.lineTo(7, -3); } },
    { type: 'fill', draw: (c) => { c.arc(1, -3, 2.6, 0, Math.PI * 2); } }
  ] },
  axe: { tip: 60, parts: [
    { type: 'line', width: 3.2, draw: seg(-8, 0, 50, 0) },
    { type: 'detail', draw: (c) => { for (let x = -4; x < 30; x += 7) { c.moveTo(x, -2); c.lineTo(x + 3, 2); } } },
    { type: 'fill', draw: (c) => { c.moveTo(40, -3); c.quadraticCurveTo(54, -22, 60, -17); c.quadraticCurveTo(57, 0, 60, 17); c.quadraticCurveTo(54, 22, 40, 3); c.closePath(); } },
    { type: 'fill', draw: (c) => { c.moveTo(38, -2); c.quadraticCurveTo(31, -9, 29, -6); c.quadraticCurveTo(31, 0, 29, 6); c.quadraticCurveTo(31, 9, 38, 2); c.closePath(); } },
    { type: 'detail', draw: (c) => { c.moveTo(57, -14); c.quadraticCurveTo(55, 0, 57, 14); } },
    { type: 'detail', draw: (c) => { c.moveTo(46, -4); c.lineTo(50, 0); c.lineTo(46, 4); } }
  ] },
  hammer: { tip: 54, parts: [
    { type: 'line', width: 3.4, draw: seg(-8, 0, 44, 0) },
    { type: 'fill', draw: (c) => { c.rect(36, -13, 18, 26); } },
    { type: 'fill', draw: (c) => { c.rect(33, -9, 3, 18); } },
    { type: 'detail', draw: (c) => { c.moveTo(40, -13); c.lineTo(40, 13); c.moveTo(50, -13); c.lineTo(50, 13); } },
    { type: 'detail', draw: (c) => { c.moveTo(45, -5); c.lineTo(49, 0); c.lineTo(45, 5); c.lineTo(41, 0); c.closePath(); } },
    { type: 'detail', draw: (c) => { for (let x = -4; x < 28; x += 6) { c.moveTo(x, -2); c.lineTo(x + 3, 2); } } }
  ] },
  spear: { tip: 80, parts: [
    { type: 'line', width: 3, draw: seg(-10, 0, 62, 0) },
    { type: 'fill', draw: (c) => { c.moveTo(60, 0); c.quadraticCurveTo(68, -7, 80, 0); c.quadraticCurveTo(68, 7, 60, 0); c.closePath(); } },
    { type: 'fill', draw: (c) => { c.rect(56, -3.5, 4, 7); } },
    { type: 'detail', draw: seg(62, 0, 76, 0) },
    // Tassel ribbon under the blade.
    { type: 'line', width: 1.6, draw: (c) => { c.moveTo(57, 3); c.quadraticCurveTo(52, 10, 47, 12); c.moveTo(57, 3); c.quadraticCurveTo(54, 12, 51, 15); } }
  ] },
  katana: { tip: 46, parts: [
    { type: 'line', width: 3, draw: seg(-10, 0, 2, 0) },
    { type: 'detail', draw: (c) => { for (let x = -8; x < 1; x += 3) { c.moveTo(x, -1.6); c.lineTo(x + 1.5, 1.6); c.moveTo(x, 1.6); c.lineTo(x + 1.5, -1.6); } } },
    { type: 'fill', draw: (c) => { c.ellipse(3, 0, 1.6, 5.5, 0, 0, Math.PI * 2); } },
    { type: 'fill', draw: (c) => { c.moveTo(5, -1.8); c.quadraticCurveTo(26, -6.5, 46, -8.5); c.quadraticCurveTo(28, -2.5, 5, 1.8); c.closePath(); } },
    // Hamon temper line.
    { type: 'detail', draw: (c) => { c.moveTo(8, 0); for (let x = 8; x <= 40; x += 4) c.quadraticCurveTo(x + 2, -2.4 - x * .1, x + 4, -1.2 - x * .12); } }
  ] },
  blade: { tip: 36, parts: [
    { type: 'line', width: 3, draw: seg(-6, 0, 1, 0) },
    { type: 'fill', draw: (c) => { c.moveTo(1, -5); c.lineTo(3, -5); c.lineTo(3, 5); c.lineTo(1, 5); c.closePath(); } },
    { type: 'fill', draw: bladePath(36, 5) },
    { type: 'detail', draw: seg(7, 0, 29, 0) }
  ] },
  dagger: { tip: 24, parts: [
    { type: 'line', width: 2.6, draw: seg(-5, 0, 1, 0) },
    { type: 'fill', draw: (c) => { c.moveTo(1, -4); c.lineTo(3, -4); c.lineTo(3, 4); c.lineTo(1, 4); c.closePath(); } },
    { type: 'fill', draw: (c) => { c.moveTo(3, -2.6); c.quadraticCurveTo(14, -5, 24, -1); c.quadraticCurveTo(14, 1, 3, 2.6); c.closePath(); } },
    { type: 'detail', draw: (c) => { c.moveTo(6, -.5); c.quadraticCurveTo(14, -2, 20, -1); } }
  ] },
  fist: { tip: 14, parts: [
    { type: 'fill', draw: (c) => { c.moveTo(-6, -7); c.lineTo(9, -7); c.quadraticCurveTo(14, -6, 14, 0); c.quadraticCurveTo(14, 6, 9, 7); c.lineTo(-6, 7); c.closePath(); } },
    { type: 'detail', draw: (c) => { for (const y of [-4.5, -1.5, 1.5, 4.5]) { c.moveTo(7, y); c.lineTo(12.5, y); } } },
    { type: 'detail', draw: (c) => { c.moveTo(-6, -7); c.lineTo(-6, 7); c.moveTo(-2, -7); c.lineTo(-2, 7); } },
    { type: 'fill', draw: (c) => { c.arc(3, 0, 2, 0, Math.PI * 2); } }
  ] },
  scythe: { tip: 62, parts: [
    { type: 'line', width: 3, draw: seg(-10, 0, 60, 0) },
    { type: 'detail', draw: (c) => { c.moveTo(18, -2); c.lineTo(18, 2); c.moveTo(38, -2); c.lineTo(38, 2); } },
    { type: 'fill', draw: (c) => { c.moveTo(58, -2); c.quadraticCurveTo(50, -34, 16, -36); c.quadraticCurveTo(44, -26, 54, 3); c.closePath(); } },
    { type: 'detail', draw: (c) => { c.moveTo(55, -4); c.quadraticCurveTo(48, -28, 22, -33); } },
    { type: 'detail', draw: runeTicks(28, 46, 3, 1.4) }
  ] }
};
const PIECES = Object.freeze({ ...EXT_PIECES,
  sword_shield: { main: 'sword', off: 'shield' }, great_axe: { main: 'axe' }, great_hammer: { main: 'hammer' },
  dual_swords: { main: 'blade', off: 'blade' }, katana: { main: 'katana' }, spear: { main: 'spear' },
  daggers: { main: 'dagger', off: 'dagger' }, gauntlets: { main: 'fist', off: 'fist' }, scythe: { main: 'scythe' },
  ice_sword: { main: 'sword' }
});
const shapeOf = (piece) => ASTRAL_SHAPES[piece] ?? ASTRAL_SHAPES.sword;
export const astralTipLength = (weapon) => shapeOf(PIECES[weapon]?.main).tip;

function traceParts(ctx, parts, pass) {
  for (const part of parts) {
    if (part.type === 'detail' && !pass.detail) continue;
    ctx.beginPath();
    part.draw(ctx);
    if (part.type === 'fill') {
      if (pass.fill) { ctx.fillStyle = pass.fill; ctx.fill(); }
      if (pass.edge) { ctx.strokeStyle = pass.edge; ctx.lineWidth = pass.edgeWidth; ctx.stroke(); }
    } else if (part.type === 'line') {
      ctx.strokeStyle = pass.line; ctx.lineWidth = Math.max(1, part.width + pass.lineGrow); ctx.stroke();
    } else {
      ctx.strokeStyle = pass.detail; ctx.lineWidth = 1; ctx.stroke();
    }
  }
}

// One astral piece pointing along +x from (0,0), already placed/rotated.
export function drawAstralPiece(ctx, piece, hue, { intensity = .8, time = performance.now() / 1000 } = {}) {
  const shape = shapeOf(piece);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  const base = ctx.globalAlpha;
  // 1) Soft outer glow.
  ctx.shadowColor = hue; ctx.shadowBlur = 10 + 8 * intensity;
  ctx.globalAlpha = base * Math.min(1, .3 + .25 * intensity);
  traceParts(ctx, shape.parts, { fill: hue, edge: hue, edgeWidth: 4, line: hue, lineGrow: 4 });
  // 2) Crystal core, bright edge and the inner rune details.
  ctx.shadowBlur = 0;
  ctx.globalAlpha = base * .88;
  traceParts(ctx, shape.parts, { fill: hue + '59', edge: 'rgba(255,255,255,.9)', edgeWidth: 1.2, line: 'rgba(255,255,255,.92)', lineGrow: -1, detail: 'rgba(255,255,255,.75)' });
  // 3) Motes drifting along the piece.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    const u = (time * .7 + i / 3) % 1;
    ctx.globalAlpha = base * Math.sin(u * Math.PI) * .9;
    ctx.fillRect(u * shape.tip - 1, Math.sin(time * 5 + i * 2.1) * 4 - 1, 2, 2);
  }
  ctx.restore();
}

// Projectiles of a ranged / magic weapon shot (count, spread, charge power).
export function makeWeaponShots(player, shot, weaponId, { power = 1, volley = 0, low = false, delay = 0 } = {}) {
  const hue = astralHue(weaponId); const count = (shot.count ?? 1) + volley;
  const cfg = volley ? { ...shot, spread: Math.max(shot.spread ?? 0, .22) } : low ? { ...shot, slow: Math.min(shot.slow ?? 1, .45) } : shot;
  return Array.from({ length: count }, (_, index) => new WeaponShot(player, cfg, hue, drawAstralPiece, { power, index, count, height: low ? (player.worldHeight ?? 0) + 14 : null, delay }));
}

// Draws a weapon pointing along +x from (0,0) (pickups and thrown weapons).
export function drawWeaponShape(ctx, weapon, scale = 1, options = {}) {
  const pieces = PIECES[weapon] ?? PIECES.sword_shield;
  const hue = astralHue(weapon);
  ctx.save();
  ctx.scale(scale, scale);
  drawAstralPiece(ctx, pieces.main, hue, options);
  if (pieces.off) { ctx.translate(pieces.off === 'shield' ? -2 : 0, pieces.off === 'shield' ? 14 : 9); drawAstralPiece(ctx, pieces.off, hue, options); }
  ctx.restore();
}

// A weapon in flat, opaque colours (EDLES OPFER: the class's astral weapon turned black with crimson
// edges, like the black lightning). Drawn along +x from (0,0); line widths stay crisp at any scale.
export function drawWeaponSolid(ctx, weapon, scale = 1, { fill = '#0a0006', edge = '#8b0000', inner = '#ff1744', detail = '#3a0010', mainOnly = false } = {}) {
  const pieces = PIECES[weapon] ?? PIECES.sword_shield;
  ctx.save(); ctx.scale(scale, scale); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
  const one = (piece) => {
    const shape = shapeOf(piece);
    traceParts(ctx, shape.parts, { fill: edge, edge, edgeWidth: 6 / scale, line: edge, lineGrow: 5 / scale });
    traceParts(ctx, shape.parts, { fill, edge: inner, edgeWidth: 1.6 / scale, line: fill, lineGrow: 0, detail }); // dark details: the weapon reads black
  };
  one(pieces.main);
  if (pieces.off && !mainOnly) { ctx.translate(pieces.off === 'shield' ? -2 : 0, pieces.off === 'shield' ? 14 : 9); one(pieces.off); }
  ctx.restore();
}

// Current swing of the held weapon: motion name, progress and pose.
export function weaponSwing(player, weaponId = player.weapon ?? player.classWeapon) {
  const swinging = player.stateTimer > 0 && /^attack|uppercut|heavyStrike/.test(player.state);
  const progress = swinging ? 1 - Math.max(0, player.stateTimer) / (player._weaponSwingTime || .3) : 0;
  const motion = swinging ? (player._weaponMotion ?? 'slash') : null;
  const pose = motion ? (MOTIONS[motion] ?? MOTIONS.slash)(clamp01(progress)) : null;
  return { swinging, progress, motion, pose };
}

// Trails of a swing, drawn in hand space (unrotated).
function drawTrail(ctx, pose, tip, hue, progress) {
  if (!pose?.trail) return;
  const fade = 1 - progress * .7;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  if (pose.trail === 'arc' || pose.trail === 'ring') {
    const from = pose.from ?? pose.angle; const to = pose.angle;
    if (Math.abs(to - from) > .05) {
      const a0 = Math.min(from, to); const a1 = Math.max(from, to);
      ctx.globalAlpha = .28 * fade; ctx.strokeStyle = hue; ctx.lineWidth = pose.wide ? 20 : 13;
      ctx.beginPath(); ctx.arc(0, 0, tip * .78, a0, a1); ctx.stroke();
      ctx.globalAlpha = .55 * fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
      const head = to > from ? [Math.max(from, to - 1), to] : [to, Math.min(from, to + 1)];
      ctx.beginPath(); ctx.arc(0, 0, tip * .96, head[0], head[1]); ctx.stroke();
      if (pose.cross) {
        // The second blade crosses the first: an X of two crescents.
        ctx.globalAlpha = .3 * fade; ctx.strokeStyle = hue; ctx.lineWidth = 13;
        ctx.beginPath(); ctx.arc(0, 6, tip * .78, -a1 + .2, -a0 + .2); ctx.stroke();
      }
    }
  } else if (pose.trail === 'line') {
    const len = tip + (pose.reach ?? 0);
    for (const [dy, a, w] of [[0, .5, 3], [-4, .25, 1.5], [4, .25, 1.5]]) {
      ctx.globalAlpha = a * fade; ctx.strokeStyle = dy ? '#ffffff' : hue; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(len - (pose.long ? 70 : 40), dy - (pose.lift ?? 0)); ctx.lineTo(len, dy - (pose.lift ?? 0)); ctx.stroke();
    }
  } else if (pose.trail === 'flash') {
    // Iaido: one long thin flash across the line of the draw.
    const k = pose.flash ?? 1;
    ctx.globalAlpha = .85 * k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(tip + 70, -14); ctx.stroke();
    ctx.globalAlpha = .35 * k; ctx.strokeStyle = hue; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(tip + 70, -14); ctx.stroke();
  }
  ctx.restore();
}

// Ground impact under a slam / smash / bash (hand space; ground ≈ +44 px).
function drawImpact(ctx, x, k, hue) {
  if (!(k > 0) || k >= 1) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = (1 - k) * .8; ctx.strokeStyle = hue; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, 44, 10 + 46 * k, 4 + 12 * k, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = (1 - k) * .5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, 44, 6 + 30 * k, 2 + 8 * k, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// Hand anchors relative to the Wizard's feet (facing right; mirrored by facing).
const HANDS = Object.freeze({ front: Object.freeze({ x: 15, y: -44 }), rear: Object.freeze({ x: -7, y: -47 }) });

// The weapon at the Wizard's hands. layer 'back' draws the rear-hand piece
// (behind the body), 'front' the front-hand piece and the trails.
export function drawHeldWeapon(ctx, player, renderY, layer = 'front') {
  const weaponId = player.weapon ?? player.classWeapon;
  if (!weaponId) return;
  const cfg = WEAPON_MOTIONS[weaponId] ?? WEAPON_MOTIONS.sword_shield;
  const pieces = PIECES[weaponId] ?? PIECES.sword_shield;
  const hue = astralHue(weaponId);
  const f = player.facing || 1;
  const time = player.animTime ?? 0;
  const { swinging, progress, pose } = weaponSwing(player, weaponId);
  const hover = swinging ? 0 : Math.sin(time * 2.4) * 2;
  if (weaponId === 'katana' && layer === 'back') drawKatanaSheath(ctx, player, renderY);
  const guarding = !!player.isGuarding;
  // HOLD charge: the weapon itself pulses in its colour (null = not charging the HOLD slot).
  const holdK = player.holdChargeLevel?.() ?? null;
  // Which hand leads this strike (pairs alternate per combo step).
  const leadFront = cfg.hands !== 'pair' || (player._weaponLead ?? 'front') === 'front';
  const items = [];
  if (cfg.hands === 'shield') {
    // Shield in the front hand, sword in the rear hand.
    const bashing = pose?.shieldReach;
    items.push({ hand: 'front', piece: 'shield', angle: guarding ? -.15 : -.35, reach: bashing ?? (guarding ? 6 : 0), dy: 6, active: !!bashing || guarding, static: true });
    items.push({ hand: 'rear', piece: pieces.main, angle: pose && !pose.shieldReach ? pose.angle : cfg.idle, reach: 0, active: !!pose && !pose.shieldReach, layerOverride: pose && !pose.shieldReach ? 'front' : null });
  } else if (cfg.hands === 'pair') {
    const both = !!pose?.both;
    const leadPose = pose ? { angle: pose.angle, reach: pose.reach ?? 0 } : null;
    const restFront = { angle: cfg.idle, reach: 0 }; const restRear = { angle: cfg.idleRear ?? cfg.idle, reach: 0 };
    const frontPose = pose && (leadFront || both) ? leadPose : restFront;
    let rearPose = pose && (!leadFront || both) ? leadPose : restRear;
    if (both && pose?.cross) rearPose = { angle: -pose.angle + .4, reach: 0 };
    if (both && pose?.reach !== undefined && !pose.cross) rearPose = { angle: pose.angle, reach: 30 - (pose.reach ?? 0) };
    items.push({ hand: 'front', piece: pieces.main, ...frontPose, active: frontPose !== restFront });
    items.push({ hand: 'rear', piece: pieces.off ?? pieces.main, ...rearPose, active: rearPose !== restRear, layerOverride: rearPose !== restRear && !both ? 'front' : null });
  } else {
    items.push({ hand: 'front', piece: pieces.main, angle: pose ? pose.angle : cfg.idle, reach: pose?.reach ?? 0, active: !!pose });
  }
  for (const item of items) {
    const itemLayer = item.layerOverride ?? (item.hand === 'rear' ? 'back' : 'front');
    if (itemLayer !== layer) continue;
    const hand = HANDS[item.hand];
    const lift = item.active ? (pose?.lift ?? 0) : 0;
    ctx.save();
    ctx.translate(player.x + f * hand.x, renderY + hand.y + hover - lift + (item.dy ?? 0));
    ctx.scale(f, 1);
    if (item.active && pose && !item.static) {
      drawTrail(ctx, pose, shapeOf(item.piece).tip, hue, progress);
      drawImpact(ctx, Math.cos(item.angle) * shapeOf(item.piece).tip + (item.reach ?? 0), pose.impact, hue);
      // Afterimages just behind the blade on sweeping motions.
      if (pose.trail === 'arc' || pose.trail === 'ring') {
        for (let k = 3; k >= 1; k--) {
          const back = pose.angle - Math.sign(pose.angle - (pose.from ?? pose.angle)) * k * .22;
          ctx.save(); ctx.globalAlpha = .15 / k * (1 - progress * .7); ctx.rotate(back);
          if (!drawWeaponSheet(ctx, weaponId, item.piece, time)) drawAstralPiece(ctx, item.piece, hue, { intensity: .4, time });
          ctx.restore();
        }
      }
    }
    if (item.static && pose?.impact) drawImpact(ctx, 18 + (item.reach ?? 0), pose.impact, hue);
    // Grip anchor: a small orb of light binding the piece to the hand (astral pieces only — drawn weapons are held).
    const drawn = hasWeaponSheet(weaponId, item.piece);
    if (!drawn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5; ctx.fillStyle = hue;
      ctx.beginPath(); ctx.arc(0, 0, item.active ? 4.5 : 3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.translate(item.reach ?? 0, 0);
    ctx.rotate(item.angle);
    if (!drawn || !drawWeaponSheet(ctx, weaponId, item.piece, time)) drawAstralPiece(ctx, item.piece, hue, { intensity: item.active ? 1.1 : .7, time });
    if (holdK != null) {
      const pulse = .5 + .5 * Math.sin(time * 16);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (.18 + .32 * holdK) * (.4 + .6 * pulse);
      ctx.shadowColor = hue; ctx.shadowBlur = 8 + 12 * holdK;
      const s = 1 + .06 * pulse * (.5 + holdK); ctx.scale(s, s);
      if (!drawWeaponSheet(ctx, weaponId, item.piece, time)) drawAstralPiece(ctx, item.piece, hue, { intensity: .9, time });
      ctx.restore();
    }
    ctx.restore();
  }
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
