// GRIMGE Prototype — the remaining weapons of docs/class_concept.md (weapon A
// and B of all 18 classes). weapons.js keeps the first ten; this module adds
// the other 27, including every RANGED and MAGIC weapon:
//  • a combo step or heavy with `shot` fires WeaponShot projectiles instead of
//    a melee hitbox (arrow, crossbow bolt, throwing knife, ricocheting
//    chakram, card fan, sound wave, arcane orb, hex, light, talisman seal,
//    wind crescent, rune bolt);
//  • charged heavies scale the shot with the charge; UP / DOWN charges turn it
//    into a volley / a low pinning shot;
//  • every weapon has its own astral silhouette, hand layout and motion set.
// Numbers are prototype tuning on top of MELEE_BASELINE's input contract.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';

const hit = (state, time, vx, damage, knockback, lift, reach, extra = {}) => Object.freeze({ state, time, vx, damage, knockback, lift, radius: Math.round(reach * .6), reach, hitstopTicks: extra.finisher ? 6 : 3, hitReaction: extra.finisher ? 'finisher' : 'light', ...extra });
// A ranged combo step: fires its shot, no melee hitbox.
const shoot = (state, time, shot, extra = {}) => Object.freeze({ state, time, vx: 0, damage: 0, knockback: 0, lift: 0, radius: 0, reach: 0, hitstopTicks: 0, hitReaction: 'light', shot: Object.freeze(shot), ...extra });
const up = (damage, lift = 460) => ({ damage, knockback: 120, lift });

export const EXT_WEAPONS = {
  // ── Guardian B / Bladedancer B / Ronin B / Lancer B ─────────────────────
  mace_shield: { name: 'MACE & SHIELD', family: 'Guardian', look: 'mace', shield: true, color: '#cfd8dc', accent: '#ffca28', desc: 'Short crushing blows that stagger; the shield blocks better.',
    combo: [hit('attack1', .26, 0, 30, 220, 50, 66, { guardBreak: 10 }), hit('attack3', .36, 0, 48, 460, 200, 70, { finisher: true, guardBreak: 22 })], heavy: { damage: 54, knockback: 600, lift: 160, reach: 74 }, uppercut: up(36), guardBonus: .5 },
  twinblade: { name: 'TWINBLADE', family: 'Bladedancer', look: 'twinblade', color: '#e0f7fa', accent: '#26c6da', desc: 'A double-ended blade: spinning chains that also cut behind.',
    combo: [hit('attack1', .16, 0, 15, 90, 20, 70, { behind: true }), hit('attack2', .16, 0, 15, 90, 20, 70, { behind: true }), hit('attack1', .18, 0, 17, 110, 30, 72, { behind: true }), hit('attack3', .3, 0, 34, 380, 200, 78, { finisher: true, behind: true })], heavy: { damage: 44, knockback: 500, lift: 150, reach: 80 }, uppercut: up(32) },
  odachi: { name: 'ODACHI', family: 'Ronin', look: 'odachi', color: '#eceff1', accent: '#ff1744', desc: 'A huge, slow blade: few cuts with enormous reach.',
    combo: [hit('attack1', .3, 0, 38, 220, 50, 104, { crit: .2 }), hit('attack3', .42, 0, 66, 520, 220, 112, { finisher: true, crit: .35 })], heavy: { damage: 70, knockback: 640, lift: 160, reach: 120 }, uppercut: up(44, 500) },
  glaive: { name: 'GLAIVE', family: 'Lancer', look: 'glaive', color: '#cfd8dc', accent: '#9ccc65', desc: 'A blade on a pole: wide sweeps at the sweet spot of its reach.',
    combo: [hit('attack1', .24, 0, 26, 220, 40, 108), hit('attack2', .26, 0, 28, 240, 60, 110), hit('attack3', .34, 0, 46, 460, 260, 116, { finisher: true })], heavy: { damage: 52, knockback: 620, lift: 200, reach: 120 }, uppercut: up(38, 520) },
  // ── Shadow B / Ranger A+B ───────────────────────────────────────────────
  throwing_blades: { name: 'THROWING BLADES', family: 'Shadow', look: 'knife', ranged: true, color: '#b0bec5', accent: '#9575cd', desc: 'Quick knife throws; the finisher fans out three blades.',
    combo: [shoot('attack1', .16, { kind: 'knife', speed: 760, damage: 11, life: .55 }), shoot('attack2', .16, { kind: 'knife', speed: 760, damage: 11, life: .55 }), shoot('attack3', .26, { kind: 'knife', speed: 780, damage: 12, count: 3, spread: .28, life: .6 }, { finisher: true })],
    heavy: { damage: 30, knockback: 300, lift: 60, reach: 60, shot: { kind: 'knife', speed: 820, damage: 26, count: 5, spread: .22, life: .7 } }, uppercut: up(26, 420) },
  bow: { name: 'BOW', family: 'Ranger', look: 'bow', ranged: true, color: '#d7ccc8', accent: '#9ccc65', desc: 'Arrows at range; a charged heavy pierces everything in line.',
    combo: [shoot('attack1', .22, { kind: 'arrow', speed: 900, damage: 14, life: .9 }), shoot('attack2', .22, { kind: 'arrow', speed: 900, damage: 14, life: .9 }), shoot('attack3', .3, { kind: 'arrow', speed: 960, damage: 22, knock: 260, life: 1 }, { finisher: true })],
    heavy: { damage: 40, knockback: 420, lift: 80, reach: 60, shot: { kind: 'arrow', speed: 1100, damage: 34, pierce: true, knock: 320, life: 1.1, size: 1.3 } }, uppercut: up(24, 420) },
  crossbow: { name: 'CROSSBOW', family: 'Ranger', look: 'crossbow', ranged: true, color: '#bcaaa4', accent: '#ffb74d', desc: 'Slow, heavy bolts that hit hard and push far.',
    combo: [shoot('attack1', .34, { kind: 'bolt', speed: 1000, damage: 24, knock: 300, life: .9 }), shoot('attack3', .42, { kind: 'bolt', speed: 1050, damage: 34, knock: 420, life: 1 }, { finisher: true })],
    heavy: { damage: 52, knockback: 560, lift: 100, reach: 60, shot: { kind: 'bolt', speed: 1150, damage: 48, explode: 52, knock: 460, life: 1.1, size: 1.3 } }, uppercut: up(28, 420) },
  // ── Monk B / Reaper B ───────────────────────────────────────────────────
  quarterstaff: { name: 'QUARTERSTAFF', family: 'Monk', look: 'staff', color: '#d7ccc8', accent: '#ffcc80', desc: 'Flowing spins and launchers for air combos.',
    combo: [hit('attack1', .16, 0, 15, 100, 40, 76), hit('attack2', .16, 0, 16, 110, 50, 76), hit('attack1', .18, 0, 18, 130, 80, 78), hit('attack3', .3, 0, 32, 360, 380, 82, { finisher: true })], heavy: { damage: 42, knockback: 520, lift: 260, reach: 86 }, uppercut: up(38, 620) },
  chain_scythe: { name: 'CHAIN SCYTHE', family: 'Reaper', look: 'chain_scythe', color: '#b0bec5', accent: '#7c4dff', desc: 'A sickle on a chain: long whips; the heavy pulls the target in.',
    combo: [hit('attack1', .26, 0, 24, 160, 40, 124), hit('attack3', .36, 0, 40, 380, 200, 132, { finisher: true })], heavy: { damage: 44, knockback: -420, lift: 60, reach: 140 }, uppercut: up(34) },
  // ── Runeblade A+B ───────────────────────────────────────────────────────
  spellblade: { name: 'SPELLBLADE & FOCUS', family: 'Runeblade', look: 'spellblade', color: '#e1f5fe', accent: '#40c4ff', desc: 'Sword cuts; the finisher releases a rune bolt from the focus.',
    combo: [hit('attack1', .2, 0, 22, 150, 40, 72), hit('attack2', .2, 0, 24, 170, 60, 74), hit('attack3', .32, 0, 34, 340, 180, 78, { finisher: true, bolt: { kind: 'rune', speed: 720, damage: 20, life: .8 } })], heavy: { damage: 46, knockback: 540, lift: 150, reach: 80, shot: { kind: 'rune', speed: 760, damage: 34, explode: 46, life: .9, size: 1.3 } }, uppercut: up(34) },
  rune_greatsword: { name: 'RUNE GREATSWORD', family: 'Runeblade', look: 'greatsword', color: '#cfd8dc', accent: '#00e5ff', desc: 'Slow, massive cleaves inscribed with runes.',
    combo: [hit('attack1', .34, 0, 42, 280, 60, 96, { guardBreak: 16 }), hit('attack3', .46, 0, 70, 560, 260, 102, { finisher: true, guardBreak: 28, shockwave: true })], heavy: { damage: 78, knockback: 700, lift: 220, reach: 108 }, uppercut: up(50, 520) },
  // ── Arcanist A+B / Occultist A+B / Oracle A+B ───────────────────────────
  arcane_staff: { name: 'ARCANE STAFF', family: 'Arcanist', look: 'arcane_staff', ranged: true, color: '#ede7f6', accent: '#b388ff', desc: 'Arcane bolts; the heavy bursts at the end of its flight.',
    combo: [shoot('attack1', .24, { kind: 'orb', speed: 620, damage: 16, life: .8 }), shoot('attack2', .24, { kind: 'orb', speed: 620, damage: 16, life: .8 }), shoot('attack3', .34, { kind: 'orb', speed: 660, damage: 24, explode: 50, life: .9, size: 1.3 }, { finisher: true })],
    heavy: { damage: 40, knockback: 400, lift: 120, reach: 60, shot: { kind: 'orb', speed: 560, damage: 40, explode: 80, life: 1, size: 1.8 } }, uppercut: up(28, 440) },
  orb_focus: { name: 'ORB & FOCUS', family: 'Arcanist', look: 'orb', ranged: true, color: '#e8eaf6', accent: '#7c4dff', desc: 'A floating orb fires seeking motes.',
    combo: [shoot('attack1', .2, { kind: 'orb', speed: 520, damage: 12, homing: 3, life: 1.1 }), shoot('attack2', .2, { kind: 'orb', speed: 520, damage: 12, homing: 3, life: 1.1 }), shoot('attack3', .32, { kind: 'orb', speed: 540, damage: 12, homing: 3, count: 3, spread: .3, life: 1.2 }, { finisher: true })],
    heavy: { damage: 36, knockback: 360, lift: 100, reach: 60, shot: { kind: 'orb', speed: 500, damage: 22, homing: 4, count: 4, spread: .35, life: 1.4 } }, uppercut: up(26, 440) },
  warlock_rod: { name: 'WARLOCK ROD & SHIELD', family: 'Occultist', look: 'rod', shield: true, ranged: true, color: '#d1c4e9', accent: '#76ff03', desc: 'Hex bolts that slow; the shield blocks.',
    combo: [shoot('attack1', .26, { kind: 'hex', speed: 560, damage: 14, slow: .6, life: .9 }), shoot('attack3', .36, { kind: 'hex', speed: 580, damage: 22, slow: .5, explode: 44, life: 1 }, { finisher: true })],
    heavy: { damage: 36, knockback: 300, lift: 60, reach: 60, shot: { kind: 'hex', speed: 520, damage: 30, slow: .4, explode: 70, life: 1.1, size: 1.5 } }, uppercut: up(26, 420), guardBonus: .4 },
  rod_grimoire: { name: 'ROD & GRIMOIRE', family: 'Occultist', look: 'rod', ranged: true, color: '#d1c4e9', accent: '#e040fb', desc: 'Curses read from the grimoire: slow, piercing drain bolts.',
    combo: [shoot('attack1', .3, { kind: 'hex', speed: 460, damage: 18, pierce: true, slow: .7, life: 1 }), shoot('attack3', .4, { kind: 'hex', speed: 480, damage: 26, pierce: true, slow: .6, life: 1.1, size: 1.3 }, { finisher: true })],
    heavy: { damage: 40, knockback: 260, lift: 60, reach: 60, shot: { kind: 'hex', speed: 420, damage: 34, pierce: true, slow: .45, life: 1.3, size: 1.8 } }, uppercut: up(26, 420) },
  scepter_shield: { name: 'SCEPTER & SHIELD', family: 'Oracle', look: 'scepter', shield: true, ranged: true, color: '#fff8e1', accent: '#ffd740', desc: 'Light bolts that dazzle; the shield blocks.',
    combo: [shoot('attack1', .24, { kind: 'light', speed: 700, damage: 13, slow: .75, life: .8 }), shoot('attack3', .34, { kind: 'light', speed: 720, damage: 22, slow: .65, life: .9, size: 1.3 }, { finisher: true })],
    heavy: { damage: 36, knockback: 360, lift: 80, reach: 60, shot: { kind: 'light', speed: 760, damage: 30, pierce: true, slow: .6, life: 1, size: 1.6 } }, uppercut: up(26, 420), guardBonus: .45 },
  sacred_staff: { name: 'SACRED STAFF', family: 'Oracle', look: 'sacred_staff', color: '#fffde7', accent: '#ffe57f', desc: 'Staff strikes; the finisher sends a wave of light.',
    combo: [hit('attack1', .2, 0, 18, 140, 40, 80), hit('attack2', .2, 0, 20, 160, 60, 80), hit('attack3', .32, 0, 30, 320, 200, 84, { finisher: true, bolt: { kind: 'light', speed: 640, damage: 18, pierce: true, life: .7, size: 1.6 } })], heavy: { damage: 44, knockback: 500, lift: 180, reach: 88 }, uppercut: up(32) },
  // ── Resonant A+B ────────────────────────────────────────────────────────
  harp: { name: 'HARP', family: 'Resonant', look: 'harp', ranged: true, color: '#fff3e0', accent: '#ff80ab', desc: 'Sound waves that pass through every enemy in line.',
    combo: [shoot('attack1', .24, { kind: 'note', speed: 520, damage: 12, pierce: true, life: .8 }), shoot('attack2', .24, { kind: 'note', speed: 520, damage: 12, pierce: true, life: .8 }), shoot('attack3', .34, { kind: 'note', speed: 540, damage: 18, pierce: true, life: .9, size: 1.6 }, { finisher: true })],
    heavy: { damage: 34, knockback: 380, lift: 80, reach: 60, shot: { kind: 'note', speed: 480, damage: 26, pierce: true, count: 3, spread: .18, life: 1, size: 1.8 } }, uppercut: up(24, 420) },
  battle_zither: { name: 'BATTLE ZITHER', family: 'Resonant', look: 'zither', ranged: true, color: '#ffe0b2', accent: '#ff6e40', desc: 'Short, heavy shockwave chords at close range.',
    combo: [shoot('attack1', .26, { kind: 'note', speed: 360, damage: 18, pierce: true, knock: 260, life: .35, size: 2 }), shoot('attack3', .36, { kind: 'note', speed: 380, damage: 28, pierce: true, knock: 420, life: .4, size: 2.6 }, { finisher: true })],
    heavy: { damage: 44, knockback: 560, lift: 120, reach: 60, shot: { kind: 'note', speed: 340, damage: 40, pierce: true, knock: 560, life: .45, size: 3.2 } }, uppercut: up(30, 460) },
  // ── Spiritbound A+B / Beastborn A+B ─────────────────────────────────────
  spirit_glaive: { name: 'SPIRIT GLAIVE', family: 'Spiritbound', look: 'spirit_glaive', translucent: true, color: '#e0f2f1', accent: '#64ffda', desc: 'A spectral polearm whose blade stretches beyond the shaft.',
    combo: [hit('attack1', .24, 0, 24, 200, 40, 118), hit('attack2', .26, 0, 26, 220, 60, 122), hit('attack3', .34, 0, 42, 440, 240, 130, { finisher: true })], heavy: { damage: 50, knockback: 600, lift: 200, reach: 138 }, uppercut: up(36, 520) },
  spirit_sword: { name: 'SPIRIT SWORD', family: 'Spiritbound', look: 'spirit_sword', translucent: true, color: '#e0f7fa', accent: '#18ffff', desc: 'Every cut is echoed by a spirit blade a moment later.',
    combo: [hit('attack1', .2, 0, 20, 150, 40, 74, { echo: true }), hit('attack2', .2, 0, 22, 170, 60, 76, { echo: true }), hit('attack3', .32, 0, 34, 360, 200, 82, { finisher: true, bolt: { kind: 'rune', speed: 680, damage: 16, pierce: true, life: .6, size: 1.4 } })], heavy: { damage: 46, knockback: 540, lift: 150, reach: 84 }, uppercut: up(34) },
  claws: { name: 'CLAWS', family: 'Beastborn', look: 'claw', color: '#d7ccc8', accent: '#ff7043', desc: 'Feral, very fast rakes in long chains.',
    combo: [hit('attack1', .12, 0, 11, 70, 10, 50), hit('attack2', .12, 0, 11, 70, 10, 50), hit('attack1', .12, 0, 12, 80, 20, 52), hit('attack2', .12, 0, 12, 80, 20, 52), hit('attack3', .24, 0, 28, 340, 220, 56, { finisher: true, crit: .3 })], heavy: { damage: 38, knockback: 440, lift: 140, reach: 60 }, uppercut: up(30, 480) },
  beast_staff: { name: 'BEAST STAFF', family: 'Beastborn', look: 'beast_staff', color: '#d7ccc8', accent: '#8bc34a', desc: 'Staff blows; the finisher calls a spirit beast swipe.',
    combo: [hit('attack1', .22, 0, 20, 160, 40, 82), hit('attack2', .22, 0, 22, 180, 60, 84), hit('attack3', .34, 0, 40, 420, 240, 96, { finisher: true, shockwave: true })], heavy: { damage: 46, knockback: 560, lift: 200, reach: 94 }, uppercut: up(36, 520) },
  // ── Trickster A+B / Fateweaver A+B ──────────────────────────────────────
  chakrams: { name: 'CHAKRAMS', family: 'Trickster', look: 'chakram', ranged: true, color: '#e0e0e0', accent: '#ffd600', desc: 'Spinning rings that ricochet from enemy to enemy.',
    combo: [shoot('attack1', .2, { kind: 'chakram', speed: 640, damage: 13, ricochet: 1, life: .9 }), shoot('attack3', .3, { kind: 'chakram', speed: 660, damage: 15, ricochet: 2, life: 1 }, { finisher: true })],
    heavy: { damage: 34, knockback: 340, lift: 80, reach: 60, shot: { kind: 'chakram', speed: 700, damage: 22, ricochet: 4, life: 1.4, size: 1.5 } }, uppercut: up(26, 440) },
  magic_cards: { name: 'MAGIC CARDS', family: 'Trickster', look: 'card', ranged: true, color: '#fafafa', accent: '#ff4081', desc: 'Card fans; one card in each fan is a joker that explodes.',
    combo: [shoot('attack1', .2, { kind: 'card', speed: 780, damage: 9, count: 3, spread: .22, life: .6 }), shoot('attack3', .3, { kind: 'card', speed: 800, damage: 10, count: 5, spread: .2, joker: true, life: .7 }, { finisher: true })],
    heavy: { damage: 30, knockback: 300, lift: 60, reach: 60, shot: { kind: 'card', speed: 820, damage: 14, count: 7, spread: .16, joker: true, life: .8 } }, uppercut: up(24, 420) },
  talisman: { name: 'TALISMAN', family: 'Fateweaver', look: 'talisman', ranged: true, color: '#fff8e1', accent: '#ff5252', desc: 'Paper seals that stick to the ground and burst a moment later.',
    combo: [shoot('attack1', .26, { kind: 'talisman', speed: 520, damage: 10, seal: .6, explode: 46, life: .8 }), shoot('attack3', .36, { kind: 'talisman', speed: 540, damage: 14, seal: .5, explode: 64, count: 2, spread: .25, life: .9 }, { finisher: true })],
    heavy: { damage: 34, knockback: 360, lift: 120, reach: 60, shot: { kind: 'talisman', speed: 480, damage: 24, seal: .7, explode: 96, life: 1, size: 1.6 } }, uppercut: up(26, 440) },
  ritual_fan: { name: 'RITUAL FAN', family: 'Fateweaver', look: 'fan', ranged: true, color: '#fce4ec', accent: '#26a69a', desc: 'Wind crescents that sweep enemies back.',
    combo: [shoot('attack1', .22, { kind: 'gust', speed: 600, damage: 12, pierce: true, knock: 280, life: .5, size: 1.4 }), shoot('attack2', .22, { kind: 'gust', speed: 600, damage: 12, pierce: true, knock: 280, life: .5, size: 1.4 }), shoot('attack3', .32, { kind: 'gust', speed: 640, damage: 18, pierce: true, knock: 480, life: .6, size: 2.2 }, { finisher: true })],
    heavy: { damage: 32, knockback: 520, lift: 160, reach: 60, shot: { kind: 'gust', speed: 560, damage: 26, pierce: true, knock: 620, lift: 160, life: .7, size: 3 } }, uppercut: up(26, 460) }
};

export const EXT_HUES = {
  mace_shield: '#ffd54f', twinblade: '#26e0ff', odachi: '#ff3355', glaive: '#a5e05a', throwing_blades: '#a98bff', bow: '#8fe36a', crossbow: '#ffb050',
  quarterstaff: '#ffc46b', chain_scythe: '#8c6bff', spellblade: '#40c4ff', rune_greatsword: '#00e5ff', arcane_staff: '#c18cff', orb_focus: '#8a5cff',
  warlock_rod: '#9dff3d', rod_grimoire: '#ea5cff', scepter_shield: '#ffe066', sacred_staff: '#fff2a0', harp: '#ff8fbf', battle_zither: '#ff7a4d',
  spirit_glaive: '#64ffda', spirit_sword: '#5cfcff', claws: '#ff7a4d', beast_staff: '#9be05a', chakrams: '#ffe000', magic_cards: '#ff5c9a', talisman: '#ff5a5a', ritual_fan: '#3fd6c0'
};

// hands: 'single', 'shield' (main rear + shield front), 'pair' (one piece per hand).
export const EXT_MOTIONS = {
  mace_shield: { hands: 'shield', idle: -2.1, combo: ['overhead', 'slam'], heavy: 'bash', uppercut: 'rising' },
  twinblade: { hands: 'single', idle: -.3, combo: ['spin', 'spin', 'slash', 'whirl'], heavy: 'whirl', uppercut: 'rising' },
  odachi: { hands: 'single', idle: 2.9, combo: ['iaido', 'cleave'], heavy: 'iaido', uppercut: 'rising' },
  glaive: { hands: 'single', idle: -.4, combo: ['reap', 'backhand', 'cleave'], heavy: 'whirl', uppercut: 'rising' },
  throwing_blades: { hands: 'pair', idle: 1.9, idleRear: 2.2, combo: ['throw', 'throw', 'throw'], heavy: 'throw', uppercut: 'rising' },
  bow: { hands: 'single', idle: -1.5, combo: ['draw', 'draw', 'draw'], heavy: 'draw', uppercut: 'rising', aimPiece: true },
  crossbow: { hands: 'single', idle: 0, combo: ['aim', 'aim'], heavy: 'aim', uppercut: 'rising', aimPiece: true },
  quarterstaff: { hands: 'single', idle: -.25, combo: ['spin', 'thrust', 'spin', 'rising'], heavy: 'whirl', uppercut: 'rising' },
  chain_scythe: { hands: 'single', idle: -1.9, combo: ['whip', 'whip'], heavy: 'pull', uppercut: 'rising' },
  spellblade: { hands: 'pair', idle: -.6, idleRear: -1.3, combo: ['slash', 'backhand', 'overhead'], heavy: 'cast', uppercut: 'rising' },
  rune_greatsword: { hands: 'single', idle: -2.3, combo: ['cleave', 'slam'], heavy: 'slam', uppercut: 'rising' },
  arcane_staff: { hands: 'single', idle: -1.2, combo: ['cast', 'cast', 'cast'], heavy: 'cast', uppercut: 'rising' },
  orb_focus: { hands: 'pair', idle: -.2, idleRear: -.9, combo: ['cast', 'cast', 'cast'], heavy: 'cast', uppercut: 'rising' },
  warlock_rod: { hands: 'shield', idle: -1.1, combo: ['cast', 'cast'], heavy: 'cast', uppercut: 'rising' },
  rod_grimoire: { hands: 'pair', idle: -1.1, idleRear: .3, combo: ['cast', 'cast'], heavy: 'cast', uppercut: 'rising' },
  scepter_shield: { hands: 'shield', idle: -1.3, combo: ['cast', 'cast'], heavy: 'cast', uppercut: 'rising' },
  sacred_staff: { hands: 'single', idle: -1.4, combo: ['thrust', 'spin', 'overhead'], heavy: 'slam', uppercut: 'rising' },
  harp: { hands: 'single', idle: -.5, combo: ['strum', 'strum', 'strum'], heavy: 'strum', uppercut: 'rising' },
  battle_zither: { hands: 'single', idle: .2, combo: ['strum', 'strum'], heavy: 'strum', uppercut: 'rising' },
  spirit_glaive: { hands: 'single', idle: -.35, combo: ['thrust', 'reap', 'lunge'], heavy: 'whirl', uppercut: 'rising' },
  spirit_sword: { hands: 'single', idle: -.55, combo: ['slash', 'backhand', 'cross'], heavy: 'thrust', uppercut: 'rising' },
  claws: { hands: 'pair', idle: .2, idleRear: .2, combo: ['rake', 'rake', 'rake', 'rake', 'cross'], heavy: 'cross', uppercut: 'upper' },
  beast_staff: { hands: 'single', idle: -1.6, combo: ['spin', 'overhead', 'slam'], heavy: 'slam', uppercut: 'rising' },
  chakrams: { hands: 'pair', idle: .4, idleRear: .6, combo: ['throw', 'throw'], heavy: 'throw', uppercut: 'rising' },
  magic_cards: { hands: 'single', idle: -.6, combo: ['flick', 'flick'], heavy: 'flick', uppercut: 'rising' },
  talisman: { hands: 'single', idle: -.9, combo: ['flick', 'flick'], heavy: 'cast', uppercut: 'rising' },
  ritual_fan: { hands: 'single', idle: -.8, combo: ['fan', 'fan', 'fan'], heavy: 'fan', uppercut: 'rising' }
};

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const span = (p, a, b) => clamp01((p - a) / (b - a));
// New motions (merged into weapons.js MOTIONS).
export const EXT_MOTION_FNS = {
  spin: (p) => ({ angle: -2.2 + ease(p) * Math.PI * 1.6, trail: 'ring', from: -2.2, wide: true }),
  draw: (p) => { const pull = span(p, 0, .55); const loose = span(p, .55, .7); return { angle: -.04, reach: -6 * pull * (1 - loose), draw: pull * (1 - loose), trail: loose > 0 && loose < 1 ? 'line' : null, long: true }; },
  aim: (p) => { const kick = span(p, .3, .5); const ret = span(p, .5, 1); return { angle: -.02 - .25 * kick * (1 - ret), reach: -8 * kick * (1 - ret) }; },
  throw: (p) => { const wind = span(p, 0, .3); const out = span(p, .3, .5); return { angle: out > 0 ? -1 + ease(out) * 1.2 : -1 - wind * .9, reach: 14 * ease(out), trail: out > 0 && out < 1 ? 'arc' : null, from: -1.9 }; },
  cast: (p) => { const raise = span(p, 0, .35); const point = span(p, .35, .55); return { angle: point > 0 ? -1.4 + ease(point) * 1.38 : -.6 - raise * .8, reach: 6 * ease(point), glow: point }; },
  strum: (p) => ({ angle: -.5 + Math.sin(p * Math.PI * 3) * .12, reach: 4 * Math.sin(p * Math.PI), strum: p }),
  flick: (p) => { const out = span(p, .2, .45); return { angle: -.9 + ease(out) * 1.1, reach: 10 * ease(out), trail: out > 0 && out < 1 ? 'arc' : null, from: -.9 }; },
  fan: (p) => ({ angle: -2.1 + ease(p * 1.2) * 2.6, trail: 'arc', from: -2.1, wide: true }),
  whip: (p) => { const out = span(p, .15, .5); const ret = span(p, .6, 1); return { angle: -1.4 + ease(out) * 1.4, reach: 50 * ease(out) * (1 - ret), trail: out > 0 && ret < 1 ? 'line' : null, long: true }; },
  pull: (p) => { const out = span(p, 0, .35); const back = span(p, .45, .85); return { angle: -.1, reach: 80 * ease(out) * (1 - back), trail: 'line', long: true }; },
  rake: (p) => ({ angle: -1.2 + ease(p * 1.5) * 1.9, trail: 'arc', from: -1.2 })
};

// ── Astral silhouettes (parts along +x from the grip) ──────────────────
const seg = (x0, y0, x1, y1) => (c) => { c.moveTo(x0, y0); c.lineTo(x1, y1); };
const blade = (from, len, w) => (c) => { c.moveTo(from, -w / 2); c.lineTo(len - 7, -w / 2); c.lineTo(len, 0); c.lineTo(len - 7, w / 2); c.lineTo(from, w / 2); c.closePath(); };
const ticks = (x0, x1, n, h = 1.6) => (c) => { for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + .5) / n; c.moveTo(x - 1.2, -h); c.lineTo(x + 1.2, h); } };
const shaft = (x0, x1, w = 3) => ({ type: 'line', width: w, draw: seg(x0, 0, x1, 0) });
export const EXT_SHAPES = {
  mace: { tip: 40, parts: [shaft(-6, 30, 3.2), { type: 'fill', draw: (c) => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const r = i % 2 ? 6 : 10; c[i ? 'lineTo' : 'moveTo'](34 + Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); } }, { type: 'detail', draw: (c) => c.arc(34, 0, 4, 0, Math.PI * 2) }] },
  twinblade: { tip: 40, parts: [shaft(-26, 26, 3), { type: 'fill', draw: blade(24, 44, 5.5) }, { type: 'fill', draw: (c) => { c.moveTo(-24, -2.7); c.lineTo(-38, -2.7); c.lineTo(-44, 0); c.lineTo(-38, 2.7); c.lineTo(-24, 2.7); c.closePath(); } }, { type: 'detail', draw: ticks(-20, 20, 5) }] },
  odachi: { tip: 66, parts: [shaft(-14, 2, 3), { type: 'fill', draw: (c) => { c.ellipse(3, 0, 1.6, 6, 0, 0, Math.PI * 2); } }, { type: 'fill', draw: (c) => { c.moveTo(5, -2); c.quadraticCurveTo(36, -8, 66, -11); c.quadraticCurveTo(38, -3, 5, 2); c.closePath(); } }, { type: 'detail', draw: (c) => { c.moveTo(8, 0); for (let x = 8; x <= 58; x += 5) c.quadraticCurveTo(x + 2.5, -2.5 - x * .1, x + 5, -1.2 - x * .12); } }] },
  glaive: { tip: 80, parts: [shaft(-12, 60), { type: 'fill', draw: (c) => { c.moveTo(58, -3); c.quadraticCurveTo(70, -16, 82, -8); c.quadraticCurveTo(74, -2, 80, 4); c.lineTo(58, 3); c.closePath(); } }, { type: 'detail', draw: (c) => { c.moveTo(62, -2); c.quadraticCurveTo(70, -10, 78, -6); } }] },
  knife: { tip: 18, parts: [shaft(-4, 2, 2.2), { type: 'fill', draw: (c) => { c.moveTo(2, -2.4); c.lineTo(14, -1.6); c.lineTo(18, 0); c.lineTo(14, 1.6); c.lineTo(2, 2.4); c.closePath(); } }, { type: 'fill', draw: (c) => c.arc(-5, 0, 2, 0, Math.PI * 2) }] },
  bow: { tip: 18, parts: [{ type: 'line', width: 3, draw: (c) => { c.moveTo(4, -30); c.quadraticCurveTo(18, 0, 4, 30); } }, { type: 'line', width: 1, draw: seg(4, -30, 4, 30) }, { type: 'detail', draw: ticks(6, 14, 3) }, { type: 'fill', draw: (c) => c.rect(8, -3, 5, 6) }] },
  crossbow: { tip: 34, parts: [shaft(-8, 30, 4), { type: 'line', width: 3, draw: (c) => { c.moveTo(24, -18); c.quadraticCurveTo(30, 0, 24, 18); } }, { type: 'line', width: 1, draw: (c) => { c.moveTo(24, -18); c.lineTo(12, 0); c.lineTo(24, 18); } }, { type: 'fill', draw: (c) => c.rect(-6, -3, 10, 6) }, { type: 'detail', draw: seg(4, 0, 30, 0) }] },
  staff: { tip: 52, parts: [shaft(-34, 52, 3), { type: 'fill', draw: (c) => c.rect(46, -3, 6, 6) }, { type: 'fill', draw: (c) => c.rect(-34, -3, 6, 6) }, { type: 'detail', draw: ticks(-20, 40, 6) }] },
  chain_scythe: { tip: 30, parts: [shaft(-6, 6, 3), { type: 'fill', draw: (c) => { c.moveTo(6, -2); c.quadraticCurveTo(16, -18, 30, -16); c.quadraticCurveTo(18, -10, 10, 3); c.closePath(); } }, { type: 'line', width: 1.4, draw: (c) => { c.moveTo(-6, 0); for (let x = -6; x > -26; x -= 4) c.lineTo(x - 2, (x % 8 ? 2 : -2)); } }] },
  spellblade: { tip: 40, parts: [shaft(-7, 1, 3), { type: 'fill', draw: (c) => c.rect(1, -6, 3, 12) }, { type: 'fill', draw: blade(5, 40, 6) }, { type: 'detail', draw: ticks(10, 32, 5, 2) }] },
  focus: { tip: 10, parts: [{ type: 'fill', draw: (c) => { c.moveTo(0, -9); c.lineTo(6, 0); c.lineTo(0, 9); c.lineTo(-6, 0); c.closePath(); } }, { type: 'detail', draw: seg(0, -6, 0, 6) }] },
  greatsword: { tip: 64, parts: [shaft(-12, 2, 3.4), { type: 'fill', draw: (c) => c.rect(2, -10, 4, 20) }, { type: 'fill', draw: blade(6, 64, 11) }, { type: 'detail', draw: seg(10, 0, 54, 0) }, { type: 'detail', draw: ticks(12, 50, 7, 3) }] },
  arcane_staff: { tip: 58, parts: [shaft(-26, 46, 3), { type: 'fill', draw: (c) => { c.moveTo(46, -2); c.quadraticCurveTo(50, -12, 58, -10); c.quadraticCurveTo(54, 0, 58, 10); c.quadraticCurveTo(50, 12, 46, 2); c.closePath(); } }, { type: 'fill', draw: (c) => c.arc(54, 0, 3.4, 0, Math.PI * 2) }, { type: 'detail', draw: ticks(-16, 36, 6) }] },
  orb: { tip: 10, parts: [{ type: 'fill', draw: (c) => c.arc(6, 0, 8, 0, Math.PI * 2) }, { type: 'detail', draw: (c) => { c.arc(6, 0, 5, 0, Math.PI * 2); c.moveTo(1, 0); c.lineTo(11, 0); } }] },
  rod: { tip: 34, parts: [shaft(-6, 28, 2.8), { type: 'fill', draw: (c) => { c.moveTo(28, 0); c.lineTo(32, -6); c.lineTo(36, 0); c.lineTo(32, 6); c.closePath(); } }, { type: 'detail', draw: (c) => { c.moveTo(20, -4); c.quadraticCurveTo(24, 0, 20, 4); } }] },
  grimoire: { tip: 10, parts: [{ type: 'fill', draw: (c) => c.rect(-2, -9, 14, 18) }, { type: 'detail', draw: (c) => { c.moveTo(5, -9); c.lineTo(5, 9); c.moveTo(0, -4); c.lineTo(3, -4); c.moveTo(7, 4); c.lineTo(10, 4); } }] },
  scepter: { tip: 32, parts: [shaft(-6, 24, 3), { type: 'fill', draw: (c) => { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const r = i % 2 ? 4 : 8; c[i ? 'lineTo' : 'moveTo'](28 + Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); } }] },
  sacred_staff: { tip: 56, parts: [shaft(-26, 46, 3), { type: 'line', width: 2, draw: (c) => c.arc(52, 0, 7, 0, Math.PI * 2) }, { type: 'fill', draw: (c) => c.arc(52, 0, 2.6, 0, Math.PI * 2) }, { type: 'detail', draw: ticks(-12, 38, 5) }] },
  harp: { tip: 26, parts: [{ type: 'line', width: 3, draw: (c) => { c.moveTo(0, 16); c.quadraticCurveTo(-6, -8, 12, -20); c.quadraticCurveTo(26, -10, 24, 14); c.lineTo(0, 16); } }, { type: 'detail', draw: (c) => { for (let x = 4; x <= 20; x += 4) { c.moveTo(x, 15); c.lineTo(x, -14 + Math.abs(x - 12)); } } }] },
  zither: { tip: 34, parts: [{ type: 'fill', draw: (c) => { c.moveTo(-4, -6); c.lineTo(34, -8); c.lineTo(34, 8); c.lineTo(-4, 6); c.closePath(); } }, { type: 'detail', draw: (c) => { for (const y of [-4, -1.5, 1, 3.5]) { c.moveTo(0, y); c.lineTo(32, y); } } }] },
  spirit_glaive: { tip: 92, parts: [shaft(-12, 62, 2.6), { type: 'fill', draw: (c) => { c.moveTo(60, -3); c.quadraticCurveTo(76, -14, 92, -6); c.quadraticCurveTo(80, 0, 92, 6); c.quadraticCurveTo(76, 14, 60, 3); c.closePath(); } }, { type: 'detail', draw: ticks(64, 88, 4, 2.4) }] },
  spirit_sword: { tip: 46, parts: [shaft(-7, 1, 3), { type: 'fill', draw: (c) => { c.moveTo(1, -9); c.quadraticCurveTo(4, 0, 1, 9); c.lineTo(4, 0); c.closePath(); } }, { type: 'fill', draw: blade(5, 46, 7) }, { type: 'detail', draw: (c) => { c.moveTo(8, 0); for (let x = 8; x < 40; x += 6) c.quadraticCurveTo(x + 3, -2, x + 6, 0); } }] },
  claw: { tip: 20, parts: [{ type: 'fill', draw: (c) => { c.moveTo(-5, -6); c.lineTo(4, -6); c.lineTo(4, 6); c.lineTo(-5, 6); c.closePath(); } }, ...[-4, 0, 4].map((y) => ({ type: 'fill', draw: (c) => { c.moveTo(4, y - 1.2); c.quadraticCurveTo(14, y - 3, 20, y + 1); c.quadraticCurveTo(12, y, 4, y + 1.2); c.closePath(); } }))] },
  beast_staff: { tip: 54, parts: [shaft(-26, 44, 3.2), { type: 'fill', draw: (c) => { c.moveTo(44, 0); c.lineTo(50, -10); c.lineTo(54, -2); c.lineTo(60, -6); c.lineTo(56, 4); c.closePath(); } }, { type: 'detail', draw: ticks(-14, 36, 5) }] },
  chakram: { tip: 12, parts: [{ type: 'line', width: 2.6, draw: (c) => c.arc(6, 0, 9, 0, Math.PI * 2) }, { type: 'fill', draw: (c) => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.moveTo(6 + Math.cos(a) * 9, Math.sin(a) * 9); c.lineTo(6 + Math.cos(a + .2) * 13, Math.sin(a + .2) * 13); c.lineTo(6 + Math.cos(a + .4) * 9, Math.sin(a + .4) * 9); } } }] },
  card: { tip: 12, parts: [{ type: 'fill', draw: (c) => c.rect(-1, -7, 12, 14) }, { type: 'detail', draw: (c) => { c.moveTo(5, -4); c.lineTo(8, 0); c.lineTo(5, 4); c.lineTo(2, 0); c.closePath(); } }] },
  talisman: { tip: 12, parts: [{ type: 'fill', draw: (c) => c.rect(-2, -10, 10, 20) }, { type: 'detail', draw: (c) => { c.moveTo(3, -7); c.lineTo(3, 7); c.moveTo(0, -3); c.lineTo(6, -1); c.moveTo(0, 3); c.lineTo(6, 5); } }] },
  fan: { tip: 26, parts: [{ type: 'fill', draw: (c) => { c.moveTo(0, 0); c.arc(0, 0, 26, -1.0, 1.0); c.closePath(); } }, { type: 'detail', draw: (c) => { for (let a = -.9; a <= .9; a += .3) { c.moveTo(0, 0); c.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); } } }] },
  // Projectiles.
  arrow: { tip: 26, parts: [shaft(-14, 18, 1.6), { type: 'fill', draw: (c) => { c.moveTo(18, -3.5); c.lineTo(26, 0); c.lineTo(18, 3.5); c.closePath(); } }, { type: 'line', width: 1.4, draw: (c) => { c.moveTo(-14, 0); c.lineTo(-18, -4); c.moveTo(-14, 0); c.lineTo(-18, 4); } }] },
  bolt: { tip: 22, parts: [shaft(-8, 14, 2.6), { type: 'fill', draw: (c) => { c.moveTo(14, -4.5); c.lineTo(22, 0); c.lineTo(14, 4.5); c.closePath(); } }] },
  rune: { tip: 14, parts: [{ type: 'fill', draw: (c) => { c.moveTo(-6, 0); c.lineTo(2, -6); c.lineTo(14, 0); c.lineTo(2, 6); c.closePath(); } }, { type: 'detail', draw: (c) => { c.moveTo(0, -3); c.lineTo(6, 3); c.moveTo(0, 3); c.lineTo(6, -3); } }] },
  hex: { tip: 10, parts: [{ type: 'fill', draw: (c) => { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c[i ? 'lineTo' : 'moveTo'](4 + Math.cos(a) * 7, Math.sin(a) * 7); } c.closePath(); } }, { type: 'detail', draw: (c) => { c.moveTo(0, -3); c.lineTo(8, 3); c.moveTo(0, 3); c.lineTo(8, -3); } }] },
  light: { tip: 16, parts: [{ type: 'fill', draw: (c) => { c.moveTo(-8, 0); c.lineTo(4, -4); c.lineTo(16, 0); c.lineTo(4, 4); c.closePath(); } }, { type: 'detail', draw: seg(-4, 0, 12, 0) }] },
  note: { tip: 10, parts: [{ type: 'line', width: 2.4, draw: (c) => { c.arc(-6, 0, 12, -.9, .9); } }, { type: 'line', width: 1.4, draw: (c) => { c.arc(-12, 0, 12, -.8, .8); } }] },
  gust: { tip: 14, parts: [{ type: 'fill', draw: (c) => { c.moveTo(-4, -16); c.quadraticCurveTo(18, 0, -4, 16); c.quadraticCurveTo(8, 0, -4, -16); c.closePath(); } }] }
};
export const EXT_PIECES = {
  mace_shield: { main: 'mace', off: 'shield' }, twinblade: { main: 'twinblade' }, odachi: { main: 'odachi' }, glaive: { main: 'glaive' },
  throwing_blades: { main: 'knife', off: 'knife' }, bow: { main: 'bow' }, crossbow: { main: 'crossbow' }, quarterstaff: { main: 'staff' },
  chain_scythe: { main: 'chain_scythe' }, spellblade: { main: 'spellblade', off: 'focus' }, rune_greatsword: { main: 'greatsword' },
  arcane_staff: { main: 'arcane_staff' }, orb_focus: { main: 'orb', off: 'focus' }, warlock_rod: { main: 'rod', off: 'shield' }, rod_grimoire: { main: 'rod', off: 'grimoire' },
  scepter_shield: { main: 'scepter', off: 'shield' }, sacred_staff: { main: 'sacred_staff' }, harp: { main: 'harp' }, battle_zither: { main: 'zither' },
  spirit_glaive: { main: 'spirit_glaive' }, spirit_sword: { main: 'spirit_sword' }, claws: { main: 'claw', off: 'claw' }, beast_staff: { main: 'beast_staff' },
  chakrams: { main: 'chakram', off: 'chakram' }, magic_cards: { main: 'card' }, talisman: { main: 'talisman' }, ritual_fan: { main: 'fan' }
};

// A bold, opaque music note (user, 23 Oct 2026: the harp / zither / Klangrad notes were "kleine Noten" —
// tiny thin arcs): a dark contour, a filled head, stem and flag in the weapon colour, a light highlight,
// plus wide sound arcs in front. Pixel crisp (integer rects), readable without any glow.
const shade = (hex, k) => { const n = parseInt(String(hex).replace('#', '').slice(0, 6).padEnd(6, '0'), 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)))); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); };
export function drawMusicNote(ctx, x, y, size, hue, { dir = 1, double = false, arcs = 2, t = 0 } = {}) {
  const s = Math.max(4, size); const dark = shade(hue, -.7); const light = shade(hue, .6);
  const R = (rx, ry, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + rx), Math.round(y + ry), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const head = (hx, c, grow) => { const hw = s * .62 + grow; const hh = s * .44 + grow; for (let i = -hh; i <= hh; i += 2) { const k = Math.sqrt(Math.max(0, 1 - (i / hh) ** 2)); R(hx - hw * k, i, hw * 2 * k, 2, c); } };
  const stem = Math.max(2, Math.round(s * .2)); const H = s * 1.9;
  const heads = double ? [-s * .55, s * .75] : [0];
  // Contour first (one pixel larger), then the body, then the highlight.
  for (const [c, g] of [[dark, 2], [hue, 0]]) {
    for (const hx of heads) { head(hx, c, g); R(hx + s * .48 - g, -H - g, stem + g * 2, H + g * 2, c); }
    if (double) R(heads[0] + s * .48 - g, -H - g, heads[1] - heads[0] + stem + g * 2, s * .32 + g * 2, c);
    else for (let i = 0; i < 3; i++) R(s * .48 + stem - g + i * s * .2, -H + i * s * .22 - g, s * .28 + g * 2, s * .26 + g * 2, c);
  }
  for (const hx of heads) R(hx - s * .3, -s * .22, s * .32, Math.max(1, s * .14), light);
  // Sound arcs ahead of the note (they pulse outward).
  ctx.save(); ctx.strokeStyle = hue; ctx.lineCap = 'butt';
  for (let i = 0; i < arcs; i++) { const r = s * (1.3 + i * .55) + ((t * 18) % 4); ctx.globalAlpha = 1 - i * .25; ctx.lineWidth = Math.max(2, s * .22 - i); ctx.beginPath(); ctx.arc(x + dir * s * .3, y - s * .6, r, dir > 0 ? -.75 : Math.PI - .75, dir > 0 ? .75 : Math.PI + .75); ctx.stroke(); }
  ctx.restore();
}

// ── Projectiles of the ranged / magic weapons ───────────────────────────
// Spread is lateral (depth) spread; every shot is a real projectile with its
// own collision (capturable / reflectable like spell projectiles).
const PIECE_OF_SHOT = { arrow: 'arrow', bolt: 'bolt', knife: 'knife', chakram: 'chakram', card: 'card', orb: 'orb', rune: 'rune', hex: 'hex', light: 'light', note: 'note', talisman: 'talisman', gust: 'gust', wave: 'gust' };
export class WeaponShot {
  constructor(owner, shot, hue, drawPiece, { power = 1, index = 0, count = 1, vzExtra = 0, height = null, delay = 0 } = {}) {
    const f = owner.facing || 1;
    this.owner = owner; this.team = owner.team; this.shot = shot; this.hue = hue; this.drawPiece = drawPiece; this.index = index; this.count = count;
    this.kind = shot.kind; this.facing = f;
    this.x = owner.x + f * 22; this.z = owner.z; this.height = height ?? (owner.worldHeight ?? 0) + 42;
    const spread = count > 1 ? (index - (count - 1) / 2) * (shot.spread ?? .2) : 0;
    this.vx = f * shot.speed; this._vz = spread * shot.speed / 150 * .6 + vzExtra;
    this.damage = shot.damage * power; this.radius = 9 * (shot.size ?? 1); this.life = shot.life ?? 1; this.t = 0;
    this.pierce = !!shot.pierce; this.ricochet = shot.ricochet ?? 0; this.homing = shot.homing ?? 0;
    this.joker = shot.allJokers || (shot.joker && index === Math.floor(count / 2));
    this.hitSet = new Set(); this.isFinished = false; this.isCapturableProjectile = true; this.isWeaponShot = true; this.spin = 0;
    this.delay = delay; // released later (the bow is drawn first): rides with the owner until then
  }
  get y() { return groundYForDepth(this.z) - this.height; }
  targets(gw) { return (gw?.getHostileTargets(this.team) ?? []).filter((t) => t && !t.isDead && !t.isDestroyed && (!t.lifeState || t.lifeState === 'Alive') && !this.hitSet.has(t)); }
  update(dt, gw) {
    if (this.delay > 0) { this.delay -= dt; const f = this.owner.facing || 1; this.facing = f; this.vx = f * Math.abs(this.vx); this.x = this.owner.x + f * 22; this.z = this.owner.z; return; }
    this.t += dt; this.spin += dt * 20;
    if (this.sealed != null) { this.sealed -= dt; if (this.sealed <= 0) this.burst(gw); return; }
    if (this.homing) {
      const tgt = this.targets(gw).filter((t) => !t.isProp).sort((a, b) => Math.hypot(a.x - this.x, (a.z - this.z) * 150) - Math.hypot(b.x - this.x, (b.z - this.z) * 150))[0];
      if (tgt) { const sp = Math.hypot(this.vx, this._vz * 150) || 1; const want = Math.atan2((tgt.z - this.z) * 150, tgt.x - this.x); const cur = Math.atan2(this._vz * 150, this.vx); let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; const a = cur + Math.max(-this.homing * dt, Math.min(this.homing * dt, d)); this.vx = Math.cos(a) * sp; this._vz = Math.sin(a) * sp / 150; }
    }
    const px = this.x;
    if (this.shot.drop) this.height = Math.max(4, this.height - dt * this.shot.drop); // angled down (arrow rain)
    this.x += this.vx * dt; this.z = Math.max(.02, Math.min(.98, this.z + this._vz * dt)); this.life -= dt;
    for (const t of this.targets(gw)) {
      const sx = Math.max(Math.min(px, this.x), Math.min(Math.max(px, this.x), t.x));
      if (Math.hypot(sx - t.x, ((t.z ?? this.z) - this.z) * 150) > this.radius + (t.hitRadiusX ?? t.radius ?? 16) * .7) continue;
      if (Math.abs((t.worldHeight ?? 0) - this.height) > (t.hitHeightTolerance ?? 110) + 30) continue;
      this.hitSet.add(t);
      const out = t.takeDamage(this.damage, Math.sign(this.vx || 1) * (this.shot.knock ?? 140), this.shot.lift ?? 40, .22, false, 'spell');
      if (out?.perfect && t.team) { this.team = t.team; this.vx *= -1; this._vz *= -1; this.hitSet.clear(); this.life = Math.max(this.life, .6); return; }
      if (this.shot.slow) t.slow?.(1.2, this.shot.slow);
      combat.spawnHitSparks(t.x, (t.y ?? this.y) - 30, Math.sign(this.vx) || 1, this.hue, 8);
      if (this.kind === 'note') combat.spawnShockwave(t.x, (t.y ?? this.y) - 32, 22 * (this.shot.size ?? 1), this.hue); // a sound ring on impact
      if (this.shot.seal) { this.sealed = this.shot.seal; this.x = t.x; this.vx = 0; this._vz = 0; return; }
      if (this.joker || this.shot.explode) { this.burst(gw); return; }
      if (this.ricochet > 0) {
        // Ricochet: fly on to the nearest other enemy.
        this.ricochet--; const next = this.targets(gw).filter((o) => !o.isProp).sort((a, b) => Math.hypot(a.x - t.x, (a.z - t.z) * 150) - Math.hypot(b.x - t.x, (b.z - t.z) * 150))[0];
        if (next) { const sp = Math.hypot(this.vx, this._vz * 150); const a = Math.atan2((next.z - t.z) * 150, next.x - t.x); this.vx = Math.cos(a) * sp; this._vz = Math.sin(a) * sp / 150; this.life = Math.max(this.life, .5); continue; }
      }
      if (!this.pierce) { this.isFinished = true; return; }
    }
    if (this.life <= 0) { if (this.shot.seal && this.sealed == null) { this.sealed = this.shot.seal * .5; return; } if (this.shot.explode || this.joker) this.burst(gw); else this.isFinished = true; }
  }
  burst(gw) {
    if (this.isFinished) return; this.isFinished = true;
    const R = this.shot.explode ?? 50;
    for (const t of gw?.getHostileTargets(this.team) ?? []) { if (!t || t.isDead) continue; if (Math.hypot(t.x - this.x, ((t.z ?? this.z) - this.z) * 150) > R) continue; t.takeDamage(this.damage * .8, Math.sign(t.x - this.x || 1) * 220, 120, .3, false, 'spell'); }
    combat.spawnShockwave(this.x, groundYForDepth(this.z) - this.height * .5, R, this.hue);
    audio.playImpact?.(true);
  }
  render(ctx) {
    if (this.delay > 0) return; // still on the string
    const a = Math.atan2(this._vz * 150 * .32, this.vx);
    // Notes: a bold upright music note with sound arcs (no thin rotating arcs).
    if (this.kind === 'note') { ctx.save(); ctx.globalAlpha = Math.min(1, this.life * 4); const fan = (this.index - (this.count - 1) / 2) * 16; drawMusicNote(ctx, this.x, this.y + 6 + fan, 9 * (this.shot.size ?? 1) * (this.count > 1 ? .8 : 1), this.joker ? '#ffffff' : this.hue, { dir: Math.sign(this.vx) || 1, double: this.count === 1 && (this.shot.size ?? 1) >= 1.5, arcs: this.count > 1 ? 1 : 2, t: this.t }); ctx.restore(); return; }
    ctx.save(); ctx.translate(this.x, this.y);
    if (this.kind === 'chakram' || this.kind === 'card' || (this.kind === 'talisman' && this.sealed != null)) ctx.rotate(this.kind === 'talisman' ? 0 : this.spin);
    else ctx.rotate(a);
    const sc = this.shot.size ?? 1; ctx.scale(sc, sc);
    if (this.kind === 'note' || this.kind === 'gust') ctx.globalAlpha = Math.min(1, this.life * 3);
    else if (this.kind === 'wave') ctx.globalAlpha = Math.min(1, this.life * 8); // air slash: crisp until the very end
    this.drawPiece(ctx, PIECE_OF_SHOT[this.kind] ?? 'rune', this.joker ? '#ffffff' : this.hue, { intensity: 1.1 });
    ctx.restore();
    if (this.sealed != null) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = this.hue; ctx.globalAlpha = .7; ctx.beginPath(); ctx.ellipse(this.x, groundYForDepth(this.z), (this.shot.explode ?? 50) * (1 - this.sealed / (this.shot.seal || 1) * .5), (this.shot.explode ?? 50) * .3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  }
}
