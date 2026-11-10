// GRIMGE Prototype — classes (AGENDA 2; user, 10 Nov 2026: "Familien als Klassen"). A class is a weapon family with its
// own identity: a role, a range and a playstyle. At creation the player picks the class and one of its two weapons as
// the start weapon; the family's other weapon unlocks when the start weapon reaches CLASS_UNLOCK_LEVEL. The equipped
// weapon is still profile.classWeapon (it decides the weapon kit and the Bankai), so every existing system keeps working.
import { WEAPONS } from './weapons.js';

export const CLASS_UNLOCK_LEVEL = 3;

// id = WEAPONS[].family. range: close / mid / far. Texts describe the kits as they play now (weapons.js).
export const CLASSES = Object.freeze([
  { id: 'Guardian', name: 'GUARDIAN', role: 'Shield fighter', range: 'close', text: 'Holds the line: precise cuts or crushing blows behind a shield that blocks better than any other guard.' },
  { id: 'Berserker', name: 'BERSERKER', role: 'Heavy bruiser', range: 'close', text: 'Slow, huge swings that break guards, stagger and launch — every hit moves the enemy.' },
  { id: 'Bladedancer', name: 'BLADEDANCER', role: 'Combo dancer', range: 'close', text: 'Long chains of fast alternating cuts; the twinblade spins and also cuts behind.' },
  { id: 'Ronin', name: 'RONIN', role: 'Precision duelist', range: 'close', text: 'Few, exact slashes with short recovery and frequent crits — the odachi trades speed for enormous reach.' },
  { id: 'Lancer', name: 'LANCER', role: 'Reach control', range: 'mid', text: 'Keeps foes at the tip of the weapon: fast thrusts in a line or wide sweeps at the sweet spot.' },
  { id: 'Shadow', name: 'SHADOW', role: 'Assassin', range: 'close', text: 'Very close and very fast with daggers, or quick knife throws that fan out on the finisher.' },
  { id: 'Monk', name: 'MONK', role: 'Martial artist', range: 'close', text: 'Punch chains, uppercuts and slams, or flowing staff spins and launchers for air combos.' },
  { id: 'Reaper', name: 'REAPER', role: 'Sweeping reaper', range: 'mid', text: 'Huge sweeps that catch enemies behind you; the chain scythe whips far and pulls the target in.' },
  { id: 'Ranger', name: 'RANGER', role: 'Marksman', range: 'far', text: 'Fights at range: arrows whose charged shot pierces a whole line, or slow bolts that hit hard and push far.' },
  { id: 'Runeblade', name: 'RUNEBLADE', role: 'Spell sword', range: 'close', text: 'Sword and rune in one: cuts that end in a rune bolt, or slow massive cleaves inscribed with runes.' },
  { id: 'Arcanist', name: 'ARCANIST', role: 'Arcane caster', range: 'far', text: 'Arcane bolts that burst at the end of their flight, or a floating orb that fires seeking motes.' },
  { id: 'Occultist', name: 'OCCULTIST', role: 'Hex caster', range: 'far', text: 'Curses: hex bolts that slow behind a shield, or piercing drain bolts read from the grimoire.' },
  { id: 'Oracle', name: 'ORACLE', role: 'Light bearer', range: 'mid', text: 'Light that dazzles: bolts from behind a shield, or staff strikes whose finisher sends a wave of light.' },
  { id: 'Resonant', name: 'RESONANT', role: 'Sound weaver', range: 'mid', text: 'Sound as a weapon: waves that pass through every enemy in line, or heavy shockwave chords up close.' },
  { id: 'Spiritbound', name: 'SPIRITBOUND', role: 'Spirit fighter', range: 'mid', text: 'Spectral steel: a polearm whose blade stretches past the shaft, or a sword echoed by a spirit blade.' },
  { id: 'Beastborn', name: 'BEASTBORN', role: 'Feral fighter', range: 'close', text: 'Feral, very fast rakes in long chains, or staff blows that call a spirit beast on the finisher.' },
  { id: 'Trickster', name: 'TRICKSTER', role: 'Ricochet trickster', range: 'mid', text: 'Spinning rings that bounce from foe to foe, or card fans with a hidden exploding joker.' },
  { id: 'Fateweaver', name: 'FATEWEAVER', role: 'Seal weaver', range: 'mid', text: 'Paper seals that stick and burst a moment later, or a ritual fan whose wind crescents sweep foes back.' }
]);

export const classById = (id) => CLASSES.find((c) => c.id === id) ?? null;
export const classOfWeapon = (weaponId) => classById(WEAPONS[weaponId]?.family) ?? null;
export const classWeapons = (id) => Object.keys(WEAPONS).filter((w) => WEAPONS[w].family === id);

// A weapon of the class is usable: the start weapon always, the other once the start weapon has reached the level.
export function classWeaponUnlocked(profile, weaponId) {
  const ch = profile?.character; const start = ch?.startWeapon;
  if (!start || !WEAPONS[weaponId] || WEAPONS[weaponId].family !== WEAPONS[start]?.family) return weaponId === start;
  return weaponId === start || (profile.weaponLevel?.(start) ?? 1) >= CLASS_UNLOCK_LEVEL;
}

// Start elements (user: "nur Startrunen"): the six base elements are owned by everyone, so the start element is one
// extra element rune owned from the beginning (otherwise bought with a skill point) and put into the deck twice.
export const START_ELEMENTS = Object.freeze(['bestia', 'construct', 'void', 'lux', 'natura', 'umbra', 'ward']);
