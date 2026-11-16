// GRIMGE Prototype — which classes a character may choose (user, 16 Nov 2026). Pure data and rules without imports, so
// the profile (progression.js) and the class screens (classes.js, character_creation.js) share one source.
// Five readable starter classes; every other class is earned by the profile level below, or early through a boss, secret
// or mission reward (MageProfile.unlockClass).
export const STARTER_CLASSES = Object.freeze(['Guardian', 'Berserker', 'Bladedancer', 'Ranger', 'Arcanist']);
export const CLASS_UNLOCK_AT = Object.freeze({ Lancer: 2, Monk: 3, Ronin: 4, Shadow: 5, Reaper: 7, Runeblade: 8, Oracle: 9, Occultist: 10, Resonant: 12, Spiritbound: 14, Beastborn: 16, Trickster: 18, Fateweaver: 20 });
export const ALL_CLASS_IDS = Object.freeze([...STARTER_CLASSES, ...Object.keys(CLASS_UNLOCK_AT)]);

// A class can be chosen: a starter, the level reached, an explicit unlock, the class already in use (an old save keeps
// it), or the debug / test access (the vault's test switch).
export function classUnlocked(profile, id) {
  if (STARTER_CLASSES.includes(id)) return true;
  if (!(id in CLASS_UNLOCK_AT)) return false;
  return !!profile?.debugAccess || !!profile?.unlockedClasses?.has?.(id) || (profile?.level ?? 1) >= CLASS_UNLOCK_AT[id] || profile?.character?.classId === id;
}
// The condition of a locked class as a German line for the creation screen; null for a starter class.
export function classRequirement(id) {
  return id in CLASS_UNLOCK_AT ? `AB LEVEL ${CLASS_UNLOCK_AT[id]} · ODER ALS BELOHNUNG` : null;
}
// The class (weapon family) of each class weapon, for the profile's save migration; weapons.js is the source (a runtime
// test checks that this table matches it).
export const WEAPON_FAMILY_OF = Object.freeze({ sword_shield: 'Guardian', mace_shield: 'Guardian', great_axe: 'Berserker', great_hammer: 'Berserker', dual_swords: 'Bladedancer', twinblade: 'Bladedancer', katana: 'Ronin', odachi: 'Ronin', spear: 'Lancer', glaive: 'Lancer', daggers: 'Shadow', throwing_blades: 'Shadow', gauntlets: 'Monk', quarterstaff: 'Monk', scythe: 'Reaper', chain_scythe: 'Reaper', bow: 'Ranger', crossbow: 'Ranger', spellblade: 'Runeblade', rune_greatsword: 'Runeblade', arcane_staff: 'Arcanist', orb_focus: 'Arcanist', warlock_rod: 'Occultist', rod_grimoire: 'Occultist', scepter_shield: 'Oracle', sacred_staff: 'Oracle', harp: 'Resonant', battle_zither: 'Resonant', spirit_glaive: 'Spiritbound', spirit_sword: 'Spiritbound', claws: 'Beastborn', beast_staff: 'Beastborn', chakrams: 'Trickster', magic_cards: 'Trickster', talisman: 'Fateweaver', ritual_fan: 'Fateweaver' });
