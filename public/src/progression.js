// GRIMGE Prototype — lightweight local Mage progression.
// This deliberately stays data-driven: UI, casting and future save/profile
// work consume the same skill definitions and aggregate modifiers.
import { MASTERY_NODE_IDS, masteryRequirement } from './mastery_data.js';

export const MAGE_SKILL_TREE = Object.freeze([
  { id: 'elemental_power', branch: 'ELEMENTAL', title: 'Elemental Power', desc: '+12% spell damage.', cost: 1, modifiers: { spellPower: 1.12 } },
  { id: 'elemental_reach', branch: 'ELEMENTAL', title: 'Elemental Reach', desc: '+12% spell area and reach.', cost: 1, prerequisites: ['elemental_power'], modifiers: { spellArea: 1.12 } },
  { id: 'resonance', branch: 'ELEMENTAL', title: 'Rune Resonance', desc: '+15% combined-spell power.', cost: 1, prerequisites: ['elemental_reach'], modifiers: { comboPower: 1.15 } },
  { id: 'arcane_skin', branch: 'DEFENSE', title: 'Arcane Skin', desc: 'Take 10% less damage.', cost: 1, modifiers: { damageTaken: .90 } },
  { id: 'barrier_mastery', branch: 'DEFENSE', title: 'Barrier Mastery', desc: 'Walls last 30% longer and cover more ground.', cost: 1, prerequisites: ['arcane_skin'], modifiers: { wallDuration: 1.30, wallHp: 1.25 } },
  { id: 'rampart_mason', branch: 'DEFENSE', title: 'Rampart Mason', desc: 'Keep up to 3 walls on the field at once; older walls only fall when destroyed or expired.', cost: 1, prerequisites: ['barrier_mastery'], modifiers: { maxWalls: 2 } },
  { id: 'last_stand', branch: 'DEFENSE', title: 'Letztes Gefecht', desc: 'Below 25% HP your melee and charged hits deal +50% damage.', cost: 1, prerequisites: ['arcane_skin'], modifiers: { lastStand: .5 } },
  { id: 'aura_shock_mastery', branch: 'DEFENSE', title: 'Aura Shock Mastery', desc: '+18% Aura Shock radius and knockback.', cost: 1, prerequisites: ['barrier_mastery'], modifiers: { auraArea: 1.18, auraPush: 1.18 } },
  { id: 'spirit_bond', branch: 'SUMMONING', title: 'Spirit Bond', desc: '+25% summon health and +10% mount speed.', cost: 1, modifiers: { summonHp: 1.25, mountSpeed: 1.10 } },
  { id: 'empowered_summons', branch: 'SUMMONING', title: 'Empowered Summons', desc: '+18% summon damage.', cost: 1, prerequisites: ['spirit_bond'], modifiers: { summonDamage: 1.18 } },
  { id: 'pack_leader', branch: 'SUMMONING', title: 'Pack Leader', desc: 'Command one more summon of each kind at the same time.', cost: 1, prerequisites: ['empowered_summons'], modifiers: { extraSummons: 1 } },
  { id: 'dragon_heart', branch: 'SUMMONING', title: 'Dragon Heart', desc: '+25% Dragon Invocation coverage.', cost: 1, prerequisites: ['empowered_summons'], modifiers: { dragonArea: 1.25 } },
  { id: 'quick_draw', branch: 'RUNE MASTERY', title: 'Quick Draw', desc: 'C-grade runes become B-grade for spell scaling.', cost: 1, modifiers: { qualityFloor: 'B' } },
  { id: 'focused_casting', branch: 'RUNE MASTERY', title: 'Focused Casting', desc: '+12% duration and +15% Focus gain.', cost: 1, prerequisites: ['quick_draw'], modifiers: { spellDuration: 1.12, focusGain: 1.15 } },
  { id: 'telekinetic_grip', branch: 'RUNE MASTERY', title: 'Telekinetic Grip', desc: 'Gravity Lift grabs 3 more targets and holds them 60% longer.', cost: 1, prerequisites: ['focused_casting'], modifiers: { liftTargets: 3, liftHold: 1.6 } },
  { id: 'far_grasp', branch: 'RUNE MASTERY', title: 'Far Grasp', desc: 'The Arcane State pull hook flies 30% farther.', cost: 1, prerequisites: ['focused_casting'], modifiers: { pullRange: 1.3 } },
  { id: 'combination_scholar', branch: 'RUNE MASTERY', title: 'Combination Scholar', desc: '+12% combined-spell power.', cost: 1, prerequisites: ['focused_casting'], modifiers: { comboPower: 1.12 } },
  { id: 'shadow_weaver', branch: 'SHADOW', title: 'Shadow Weaver', desc: 'Shadow Stomper holds one more target at once.', cost: 1, modifiers: { bindTargets: 1 } },
  { id: 'umbral_grip', branch: 'SHADOW', title: 'Umbral Grip', desc: 'Shadow Stomper holds one more target and 30% longer.', cost: 1, prerequisites: ['shadow_weaver'], modifiers: { bindTargets: 1, bindHold: 1.3 } },
  { id: 'mirror_legion', branch: 'SHADOW', title: 'Mirror Legion', desc: 'Keep one more Shadow Doppelganger on the field (cast again for each).', cost: 1, modifiers: { extraDoppels: 1 } },
  { id: 'shadow_army', branch: 'SHADOW', title: 'Shadow Army', desc: 'Keep yet another Doppelganger; doubles gain +20% health.', cost: 1, prerequisites: ['mirror_legion'], modifiers: { extraDoppels: 1, doppelHp: 1.2 } },
  { id: 'grave_caller', branch: 'SHADOW', title: 'Grave Caller', desc: 'Keep one more Revenant bound at once (cast again for each).', cost: 1, modifiers: { extraRevenants: 1 } },
  { id: 'forbidden_covenant', branch: 'SHADOW', title: 'Forbidden Covenant', desc: 'Keep yet another Revenant; their death bursts hit 30% harder.', cost: 1, prerequisites: ['grave_caller'], modifiers: { extraRevenants: 1, revenantBurst: 1.3 } },
  { id: 'celestial_attunement', branch: 'SHADOW', title: 'Celestial Attunement', desc: 'Your sky spheres stay 35% longer.', cost: 1, modifiers: { skyDuration: 1.35 } }
]);

const BASE_MODIFIERS = Object.freeze({
  spellPower: 1,
  spellArea: 1,
  spellDuration: 1,
  comboPower: 1,
  damageTaken: 1,
  wallDuration: 1,
  wallHp: 1,
  auraArea: 1,
  auraPush: 1,
  summonHp: 1,
  summonDamage: 1,
  mountSpeed: 1,
  dragonArea: 1,
  focusGain: 1,
  qualityFloor: null,
  // Counts (added, not multiplied): walls on the field, extra summons of
  // each kind, extra Gravity Lift targets.
  maxWalls: 1,
  extraSummons: 0,
  liftTargets: 0,
  liftHold: 1,
  // Shadow: extra Shadow Stomper targets, doubles and revenants (counts).
  bindTargets: 0,
  bindHold: 1,
  extraDoppels: 0,
  doppelHp: 1,
  extraRevenants: 0,
  revenantBurst: 1,
  skyDuration: 1,
  pullRange: 1,
  lastStand: 0
});
const ADDITIVE_MODIFIERS = new Set(['lastStand', 'maxWalls', 'extraSummons', 'liftTargets', 'bindTargets', 'extraDoppels', 'extraRevenants']);

export const RUNE_XP_BY_GRADE = Object.freeze({ C: 6, B: 10, A: 14, S: 18 });
export const STARTER_RUNES = Object.freeze(['ignis', 'ventus', 'fulgur', 'terra', 'aqua']);
export const MATCH_DECK_SIZE = 10;
// Deck builder (user, 20 Oct 2026): saved builds that load in one tap, favourite runes.
export const MAX_DECK_PRESETS = 8;
export const DECK_PRESET_NAME_MAX = 20;
export const MAX_RUNE_COPIES = 2;
import { BUFF_FORM_DATA } from './buff_forms_data.js';
import { SIGNATURE_RUNE_DATA } from './signature_runes_data.js';
// Arcane States (buff transformation special runes): max. ONE per deck (atlas §1.9).
export const BUFF_RUNE_IDS = Object.freeze(BUFF_FORM_DATA.map((form) => 'buff_' + form.id));
export const MAX_BUFF_RUNES = 1;
export const isBuffRuneId = (id) => String(id).startsWith('buff_');
// Signature specials (research atlas S01–S36): special runes with their own
// glyph — NOT Arcane States. Each may be in a deck once; several different ones are fine.
export const SIGNATURE_RUNE_IDS = Object.freeze(SIGNATURE_RUNE_DATA.map((d) => 'sig_' + d.id));
export const isSignatureRuneId = (id) => String(id).startsWith('sig_');
// Domains (Sphären): a signature family with one glyph — like the Arcane States only ONE per deck.
export const DOMAIN_RUNE_IDS = Object.freeze(SIGNATURE_RUNE_DATA.filter((d) => String(d.systemType).startsWith('Domäne')).map((d) => 'sig_' + d.id));
export const MAX_DOMAIN_RUNES = 1;
// Deck builder categories (user, 21 Oct 2026): element runes, then the special runes by kind.
export const RUNE_CATEGORIES = Object.freeze([
  { id: 'element', label: 'ELEMENTE', icon: '◆', rule: 'Elementar-Runen · je bis zu 2× · frei kombinierbar' },
  { id: 'simple', label: 'EINFACH', icon: '✦', rule: 'Spezialrunen · je 1× · ein Effekt beim Wirken' },
  { id: 'multi', label: 'MEHRFACH', icon: '⟳', rule: 'Spezialrunen · je 1× · zweiter Tipp oder Halten & Loslassen' },
  { id: 'stance', label: 'HALTUNGEN', icon: '◎', rule: 'Spezialrunen · je 1× · wirken eine Zeit lang am Zauberer' },
  { id: 'summon', label: 'BESCHWÖRUNG', icon: '⚑', rule: 'Spezialrunen · je 1× · Wesen, Objekte, Fallen, Konstrukte' },
  { id: 'breath', label: 'ATMUNGEN', icon: '≋', rule: 'Spezialrunen · je 1× · Kampfstil für 15 s · zweite Atmung = Kombo' },
  { id: 'domain', label: 'SPHÄREN', icon: '◓', rule: 'nur EINE Sphäre pro Deck' },
  { id: 'arcane', label: 'ARCANE STATE', icon: '⧗', rule: 'nur EIN Arcane State pro Deck (nicht die Fokus-Transformation)' }
]);
// Specials with a second activation (tap again / hold & release) and the ones that run as a stance.
const MULTI_SIGS = new Set(['S38', 'S45', 'S46', 'S47', 'S49', 'S50', 'S51', 'S54', 'S55', 'S70', 'S71', 'S74', 'S87', 'S88', 'S90', 'S91', 'S92', 'S93']);
const STANCE_SIGS = new Set(['S01', 'S02', 'S04', 'S07', 'S10', 'S20', 'S21', 'S25', 'S27', 'S28', 'S34', 'S39', 'S48', 'S52', 'S86', 'S89', 'S94']);
const SUMMON_TYPES = /Objekt|Beschwörung|Konstrukt|Turm|Falle|Bodenkontrolle|Brücke|Forge|Großkonstrukt|Plattform/i;
const SIG_BY_ID = new Map(SIGNATURE_RUNE_DATA.map((d) => ['sig_' + d.id, d]));
export function runeCategory(id) {
  if (isBuffRuneId(id)) return 'arcane';
  if (isDomainRuneId(id)) return 'domain';
  if (id === 'doppel' || id === 'mortis') return 'summon';
  const d = SIG_BY_ID.get(id); if (!d) return 'element';
  if (String(d.systemType).startsWith('Atemtechnik')) return 'breath';
  if (MULTI_SIGS.has(d.id)) return 'multi';
  if (STANCE_SIGS.has(d.id)) return 'stance';
  if (SUMMON_TYPES.test(d.systemType)) return 'summon';
  return 'simple';
}
export const isDomainRuneId = (id) => DOMAIN_RUNE_IDS.includes(id);
export const ALL_RUNE_IDS = Object.freeze(['ignis', 'ventus', 'fulgur', 'terra', 'aqua', 'bestia', 'construct', 'void', 'lux', 'umbra', 'natura', 'ward', 'doppel', 'mortis', ...BUFF_RUNE_IDS, ...SIGNATURE_RUNE_IDS]);
// Elemental runes combine and may be in a deck twice. Special runes (DOPPEL,
// MORTIS, signature specials, Arcane States) need no combination but have a
// harder glyph: each only once — and of all Arcane States only one at all.
export const isSpecialDeckRune = (id) => id === 'doppel' || id === 'mortis' || isBuffRuneId(id) || isSignatureRuneId(id);
export const maxRuneCopies = (id) => (isSpecialDeckRune(id) ? 1 : MAX_RUNE_COPIES);
export function deckAccepts(deck, id) {
  if (isBuffRuneId(id) && deck.filter(isBuffRuneId).length >= MAX_BUFF_RUNES) return false;
  if (isDomainRuneId(id) && deck.filter(isDomainRuneId).length >= MAX_DOMAIN_RUNES) return false;
  return deck.filter((entry) => entry === id).length < maxRuneCopies(id);
}
// Signature specials unlock with the Mage level: S01–S04 at 5, then four more per level (S33–S36 at 13).
export function signatureUnlockLevel(runeId) {
  const index = SIGNATURE_RUNE_IDS.indexOf(runeId);
  return index < 0 ? Infinity : 5 + Math.floor(index / 4);
}
// The first deck deliberately contains two copies of every starter rune.
// It is a legal 10-card deck and guarantees a varied initial three-card hand.
export const DEFAULT_MATCH_DECK = Object.freeze(['fulgur', 'terra', 'ignis', 'ventus', 'aqua', 'fulgur', 'terra', 'ignis', 'ventus', 'aqua']);
// Runes bought with skill points (user, 20 Oct 2026): beyond the five starter
// elements no rune comes on its own — every skill point is a choice between a new
// rune, a passive or a mastery. Base runes: 1 point, any order; the special runes
// Doppel / Mortis: 2 points and a minimum Mage level. Real deck cards once bought.
export const SKILL_RUNE_UNLOCKS = Object.freeze([
  { runeId: 'bestia', cost: 1, level: 1, title: 'BESTIA RUNE UNLOCKED' },
  { runeId: 'construct', cost: 1, level: 1, title: 'KONSTRUKT RUNE UNLOCKED' },
  { runeId: 'void', cost: 1, level: 1, title: 'VOID RUNE UNLOCKED' },
  { runeId: 'lux', cost: 1, level: 1, title: 'LUX RUNE UNLOCKED' },
  { runeId: 'natura', cost: 1, level: 1, title: 'NATURA RUNE UNLOCKED' },
  { runeId: 'umbra', cost: 1, level: 1, title: 'UMBRA RUNE UNLOCKED' },
  { runeId: 'ward', cost: 1, level: 1, title: 'SCHUTZ RUNE UNLOCKED' },
  { runeId: 'doppel', cost: 2, level: 8, title: 'DOPPEL SPECIAL RUNE UNLOCKED' },
  { runeId: 'mortis', cost: 2, level: 10, title: 'MORTIS SPECIAL RUNE UNLOCKED' }
]);
export const skillRuneUnlock = (runeId) => SKILL_RUNE_UNLOCKS.find((entry) => entry.runeId === runeId) ?? null;
// Late runes (user, 20 Oct 2026): at the start only base runes; domains, Arcane States
// and the weapon Bankai are never reached by the Mage level. A boss drops one, or the
// matching mastery earns it — far into the game:
//   element domain    rune level 10 of its element (drawing that rune)
//   Arcane State      rune level 8 of its element
//   Bankai (A04)      class weapon level 8 (melee hits with a class weapon)
//   special domain    boss drop only
export const LATE_RUNE_LEVEL = Object.freeze({ domain: 10, arcane: 8, bankai: 8 });
export const WEAPON_XP_PER_LEVEL = 80;
const DOMAIN_ELEMENT = Object.freeze({ sig_S57: 'ignis', sig_S58: 'natura', sig_S61: 'fulgur', sig_S62: 'umbra', sig_S63: 'ventus', sig_S64: 'terra', sig_S65: 'aqua', sig_S66: 'bestia', sig_S67: 'construct', sig_S68: 'void', sig_S69: 'lux', sig_S85: 'ward' });
const ARCANE_ELEMENT = Object.freeze({
  buff_B01: 'ignis', buff_B02: 'void', buff_T02: 'ignis', buff_T04: 'aqua', buff_T05: 'terra', buff_T06: 'fulgur', buff_T08: 'construct', buff_T13: 'construct',
  buff_T23: 'void', buff_T24: 'umbra', buff_T35: 'aqua', buff_T37: 'natura', buff_T38: 'terra', buff_T39: 'lux', buff_T40: 'lux',
  buff_A01: 'lux', buff_A02: 'bestia', buff_A03: 'construct', buff_A04: 'weapon', buff_A10: 'construct', buff_A11: 'ignis'
});
export const isLateRuneId = (id) => isDomainRuneId(id) || isBuffRuneId(id);
// Bankai: ONE rune whose effect follows the chosen class, unlocked per class.
export const BANKAI_RUNE_ID = 'buff_A04';
export const LATE_RUNE_IDS = Object.freeze([...DOMAIN_RUNE_IDS, ...BUFF_RUNE_IDS]);
// How a late rune is earned besides a boss drop: { kind, element?, level? }.
export function lateRuneRoute(id) {
  if (isDomainRuneId(id)) return DOMAIN_ELEMENT[id] ? { kind: 'domain', element: DOMAIN_ELEMENT[id], level: LATE_RUNE_LEVEL.domain } : { kind: 'boss' };
  if (!isBuffRuneId(id)) return null;
  const element = ARCANE_ELEMENT[id];
  if (element === 'weapon') return { kind: 'bankai', level: LATE_RUNE_LEVEL.bankai };
  return element ? { kind: 'arcane', element, level: LATE_RUNE_LEVEL.arcane } : { kind: 'boss' };
}
const ELEMENT_LABEL = { ignis: 'IGNIS', natura: 'NATURA', fulgur: 'FULGUR', umbra: 'UMBRA', ventus: 'VENTUS', terra: 'TERRA', aqua: 'AQUA', bestia: 'BESTIA', construct: 'KONSTRUKT', void: 'VOID', lux: 'LUX' };
export function runeUnlockLabel(runeId) {
  const late = lateRuneRoute(runeId);
  if (late) return late.kind === 'boss' ? 'BOSS-DROP' : late.kind === 'bankai' ? `BOSS-DROP / KLASSENWAFFE LV.${late.level} (JE KLASSE)` : `BOSS-DROP / ${ELEMENT_LABEL[late.element]} RUNE LV.${late.level}`;
  if (isSignatureRuneId(runeId)) return `MAGE LV.${signatureUnlockLevel(runeId)}`;
  const entry = skillRuneUnlock(runeId);
  if (!entry) return 'STARTER';
  const points = `${entry.cost} SKILLPUNKT${entry.cost > 1 ? 'E' : ''} (MAGE PATHS)`;
  return entry.level > 1 ? `MAGE LV.${entry.level} · ${points}` : points;
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export class MageProfile {
  constructor(data = null) {
    const source = data ?? this.readLocal();
    this.classId = 'mage';
    this.level = Math.max(1, source?.level ?? 1);
    this.xp = Math.max(0, source?.xp ?? 0);
    this.skillPoints = Math.max(0, source?.skillPoints ?? 0);
    this.unlockedSkills = new Set(source?.unlockedSkills ?? []);
    // Rune masteries (mastery_data.js): 'tree.branch.tier' ids.
    this.masteries = new Set((Array.isArray(source?.masteries) ? source.masteries : []).filter((id) => MASTERY_NODE_IDS.includes(id)));
    this.runeXp = { ...(source?.runeXp ?? {}) };
    // Late runes earned (boss drop or mastery route) and class weapon practice.
    this.lateUnlocks = new Set((Array.isArray(source?.lateUnlocks) ? source.lateUnlocks : []).filter((id) => LATE_RUNE_IDS.includes(id) && id !== BANKAI_RUNE_ID));
    // The chosen class (= class weapon) and the classes whose Bankai is unlocked.
    this.classWeapon = typeof source?.classWeapon === 'string' ? source.classWeapon : null;
    this.bankaiClasses = new Set(Array.isArray(source?.bankaiClasses) ? source.bankaiClasses : []);
    this.weaponXp = { ...(source?.weaponXp ?? {}) };
    this.discoveredSpells = new Set(source?.discoveredSpells ?? []);
    this.unlockedRunes = new Set(source?.unlockedRunes ?? STARTER_RUNES);
    this.syncRuneUnlocks();
    // Favourites and build presets first: the deck repair below already saves the profile.
    this.favoriteRunes = new Set((Array.isArray(source?.favoriteRunes) ? source.favoriteRunes : []).filter((id) => ALL_RUNE_IDS.includes(id)));
    this.deckPresets = (Array.isArray(source?.deckPresets) ? source.deckPresets : [])
      .filter((preset) => preset && Array.isArray(preset.deck))
      .slice(0, MAX_DECK_PRESETS)
      .map((preset, i) => ({ id: String(preset.id ?? `preset_${i + 1}`), name: this.cleanPresetName(preset.name, i), deck: preset.deck.filter((id) => ALL_RUNE_IDS.includes(id)).slice(0, MATCH_DECK_SIZE), ...(Array.isArray(preset.masteries) ? { masteries: preset.masteries.filter((id) => MASTERY_NODE_IDS.includes(id)) } : {}) }));
    const savedDeck = Array.isArray(source?.matchDeck) ? source.matchDeck : DEFAULT_MATCH_DECK;
    this.matchDeck = this.sanitizeDeck(savedDeck);
    // A saved deck can lose cards when runes are retired (e.g. the archived
    // Arcane States): top it up so the deck stays playable (bug: Training
    // refused to start with a 9-card deck).
    if (Array.isArray(source?.matchDeck) && source.matchDeck.length >= MATCH_DECK_SIZE && this.matchDeck.length < MATCH_DECK_SIZE) {
      this.matchDeck = this.topUpDeck(this.matchDeck);
      this.deckRepaired = true;
      this.save();
    }
  }

  readLocal() {
    try {
      const raw = globalThis.localStorage?.getItem?.('grimge-mage-profile-v1');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  save() {
    try { globalThis.localStorage?.setItem?.('grimge-mage-profile-v1', JSON.stringify(this.toJSON())); } catch { /* optional local persistence */ }
  }

  toJSON() {
    return {
      level: this.level, xp: this.xp, skillPoints: this.skillPoints,
      unlockedSkills: [...this.unlockedSkills], masteries: [...this.masteries], runeXp: clone(this.runeXp),
      lateUnlocks: [...this.lateUnlocks], weaponXp: clone(this.weaponXp), classWeapon: this.classWeapon, bankaiClasses: [...this.bankaiClasses],
      discoveredSpells: [...this.discoveredSpells], unlockedRunes: [...this.unlockedRunes],
      matchDeck: [...this.matchDeck], progressionVersion: 3,
      favoriteRunes: [...this.favoriteRunes], deckPresets: this.deckPresets.map((preset) => ({ ...preset, deck: [...preset.deck], ...(preset.masteries ? { masteries: [...preset.masteries] } : {}) }))
    };
  }

  xpToNextLevel() { return 70 + (this.level - 1) * 35; }
  runeLevel(id) { return 1 + Math.floor((this.runeXp[id] ?? 0) / 60); }
  runeXpIntoLevel(id) { return (this.runeXp[id] ?? 0) % 60; }
  isRuneUnlocked(id) { return id === BANKAI_RUNE_ID ? this.isBankaiUnlocked() : isLateRuneId(id) ? this.lateUnlocks.has(id) || this.lateRouteMet(id) : isSignatureRuneId(id) ? this.level >= signatureUnlockLevel(id) : this.unlockedRunes.has(id); }
  weaponLevel(id) { return 1 + Math.floor((this.weaponXp[id] ?? 0) / WEAPON_XP_PER_LEVEL); }
  // Bankai is available when the chosen class has earned it (weapon level / boss drop).
  isBankaiUnlocked(classWeapon = this.classWeapon) { return !!classWeapon && (this.bankaiClasses.has(classWeapon) || this.weaponLevel(classWeapon) >= LATE_RUNE_LEVEL.bankai); }
  // Choosing a class: a deck Bankai that this class has not earned leaves the deck.
  setClassWeapon(weaponId) {
    this.classWeapon = weaponId ?? null;
    if (this.matchDeck.includes(BANKAI_RUNE_ID) && !this.isBankaiUnlocked()) this.matchDeck = this.topUpDeck(this.matchDeck.filter((id) => id !== BANKAI_RUNE_ID));
    this.save();
  }
  // The mastery route of a late rune: its element rune levelled far enough (or the class weapon).
  lateRouteMet(id) {
    const route = lateRuneRoute(id);
    if (!route || route.kind === 'boss') return false;
    if (route.kind === 'bankai') return this.isBankaiUnlocked();
    return this.unlockedRunes.has(route.element) && this.runeLevel(route.element) >= route.level;
  }
  // Late runes whose mastery route was just met: kept for good and announced once.
  claimLateRunes() {
    const fresh = [];
    // Bankai: remembered for the class that earned it.
    if (this.classWeapon && !this.bankaiClasses.has(this.classWeapon) && this.isBankaiUnlocked()) { this.bankaiClasses.add(this.classWeapon); fresh.push({ runeId: BANKAI_RUNE_ID, title: 'BANKAI EARNED FOR THIS CLASS' }); }
    for (const id of LATE_RUNE_IDS) if (id !== BANKAI_RUNE_ID && !this.lateUnlocks.has(id) && this.lateRouteMet(id)) { this.lateUnlocks.add(id); fresh.push({ runeId: id, title: `${isDomainRuneId(id) ? 'DOMAIN' : 'ARCANE STATE'} RUNE EARNED` }); }
    return fresh;
  }
  // Boss victory: one locked late rune drops (domains and Arcane States alike).
  rollBossDrop(rng = Math.random) {
    // Bankai can drop for the chosen class only.
    const pool = LATE_RUNE_IDS.filter((id) => !this.isRuneUnlocked(id) && (id !== BANKAI_RUNE_ID || this.classWeapon));
    if (!pool.length) return null;
    const id = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    if (id === BANKAI_RUNE_ID) this.bankaiClasses.add(this.classWeapon); else this.lateUnlocks.add(id);
    this.save();
    if (id === BANKAI_RUNE_ID) return { runeId: id, title: 'BOSS-DROP: BANKAI FOR THIS CLASS' };
    return { runeId: id, title: `BOSS-DROP: ${isDomainRuneId(id) ? 'DOMAIN' : 'ARCANE STATE'} RUNE` };
  }
  // Melee hits with a class weapon train it (Bankai route); saved on level-ups / match end.
  awardWeaponHit(weaponId) {
    if (!weaponId) return null;
    const before = this.weaponLevel(weaponId);
    this.weaponXp[weaponId] = (this.weaponXp[weaponId] ?? 0) + 1;
    if (this.weaponLevel(weaponId) === before) return null;
    const fresh = this.claimLateRunes(); this.save();
    return { weaponLevelUp: true, weaponLevel: this.weaponLevel(weaponId), newlyUnlockedRunes: fresh };
  }

  sanitizeDeck(ids = []) {
    const copies = new Map();
    return ids.filter((id) => {
      if (!ALL_RUNE_IDS.includes(id) || !this.isRuneUnlocked(id)) return false;
      const count = copies.get(id) ?? 0;
      if (count >= maxRuneCopies(id) || copies.size > ALL_RUNE_IDS.length) return false;
      if (isBuffRuneId(id) && [...copies.keys()].some(isBuffRuneId)) return false;
      if (isDomainRuneId(id) && [...copies.keys()].some(isDomainRuneId)) return false;
      copies.set(id, count + 1);
      return true;
    }).slice(0, MATCH_DECK_SIZE);
  }

  // Fill a deck up to MATCH_DECK_SIZE with default / unlocked elemental runes (deck rules kept).
  topUpDeck(deck) {
    const out = [...deck];
    for (const id of [...DEFAULT_MATCH_DECK, ...this.unlockedRunes]) {
      if (out.length >= MATCH_DECK_SIZE) break;
      if (this.sanitizeDeck([...out, id]).length === out.length + 1) out.push(id);
    }
    return out;
  }

  getMatchDeck() { return [...this.matchDeck]; }
  getRuneCopies(id) { return this.matchDeck.filter((entry) => entry === id).length; }
  isDeckReady() { return this.matchDeck.length === MATCH_DECK_SIZE; }

  addRuneToDeck(id) {
    if (!this.isRuneUnlocked(id)) return { ok: false, reason: 'LOCKED' };
    if (this.matchDeck.length >= MATCH_DECK_SIZE) return { ok: false, reason: 'DECK FULL' };
    if (this.getRuneCopies(id) >= maxRuneCopies(id)) return { ok: false, reason: 'COPY LIMIT' };
    if (!deckAccepts(this.matchDeck, id)) return { ok: false, reason: isDomainRuneId(id) ? 'ONE DOMAIN PER DECK' : 'ONE ARCANE STATE PER DECK' };
    this.matchDeck.push(id); this.save();
    return { ok: true };
  }

  removeRuneFromDeck(id) {
    const index = this.matchDeck.lastIndexOf(id);
    if (index < 0) return { ok: false, reason: 'NOT IN DECK' };
    this.matchDeck.splice(index, 1); this.save();
    return { ok: true };
  }

  // ── Build presets ──
  cleanPresetName(name, index = this.deckPresets?.length ?? 0) {
    const clean = String(name ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, DECK_PRESET_NAME_MAX);
    return clean || `BUILD ${index + 1}`;
  }
  getDeckPreset(id) { return this.deckPresets.find((preset) => preset.id === id) ?? null; }
  // Save a deck as a build. Same name (or the given id) overwrites that build.
  // The build remembers the masteries too (user, 21 Oct 2026): loading it re-skills them.
  saveDeckPreset(name, deck = this.matchDeck, id = null, masteries = this.masteries) {
    const cards = [...deck];
    if (cards.length !== MATCH_DECK_SIZE) return { ok: false, reason: 'DECK NEEDS 10 CARDS' };
    const existing = id ? this.getDeckPreset(id) : this.deckPresets.find((preset) => preset.name.toLowerCase() === this.cleanPresetName(name).toLowerCase());
    if (existing) {
      if (name != null && String(name).trim()) existing.name = this.cleanPresetName(name);
      existing.deck = cards; existing.masteries = [...masteries]; this.save();
      return { ok: true, preset: existing, overwritten: true };
    }
    if (this.deckPresets.length >= MAX_DECK_PRESETS) return { ok: false, reason: `MAX ${MAX_DECK_PRESETS} BUILDS` };
    let n = this.deckPresets.length + 1; while (this.getDeckPreset(`preset_${n}`)) n++;
    const preset = { id: `preset_${n}`, name: this.cleanPresetName(name), deck: cards, masteries: [...masteries] };
    this.deckPresets.push(preset); this.save();
    return { ok: true, preset };
  }
  // Load a build as the match deck (rules re-checked; runes that are not legal are skipped and the deck is topped up).
  loadDeckPreset(id, { free = false } = {}) {
    const preset = this.getDeckPreset(id);
    if (!preset) return { ok: false, reason: 'BUILD NOT FOUND' };
    const deck = this.sanitizeDeck(preset.deck);
    this.matchDeck = deck.length < MATCH_DECK_SIZE ? this.topUpDeck(deck) : deck;
    const skills = preset.masteries ? this.applyMasterySet(preset.masteries, { free }) : null; // older builds keep the current masteries
    this.save();
    return { ok: true, preset, repaired: deck.length < preset.deck.length, masteriesSkipped: skills?.skipped ?? 0 };
  }
  // Re-skill a saved set of masteries: the current ones are refunded, the set is bought again in tier
  // order; nodes the profile cannot own (yet) are skipped.
  applyMasterySet(ids, { free = false } = {}) {
    const wanted = [...new Set(ids)].filter((id) => MASTERY_NODE_IDS.includes(id)).sort((a, b) => +a.split('.')[2] - +b.split('.')[2]);
    if (!free) this.skillPoints += this.masteries.size;
    this.masteries.clear();
    let skipped = 0;
    for (const id of wanted) {
      if (!this.canUnlockMastery(id, { free })) { skipped++; continue; }
      if (!free) this.skillPoints -= masteryRequirement(id).cost;
      this.masteries.add(id);
    }
    this.save();
    return { applied: this.masteries.size, skipped };
  }
  deleteDeckPreset(id) {
    const index = this.deckPresets.findIndex((preset) => preset.id === id);
    if (index < 0) return { ok: false, reason: 'BUILD NOT FOUND' };
    const [preset] = this.deckPresets.splice(index, 1); this.save();
    return { ok: true, preset };
  }
  // ── Favourite runes (filter in the deck builder) ──
  isFavoriteRune(id) { return this.favoriteRunes.has(id); }
  toggleFavoriteRune(id) {
    if (!ALL_RUNE_IDS.includes(id)) return { ok: false, reason: 'UNKNOWN RUNE' };
    const on = !this.favoriteRunes.has(id);
    if (on) this.favoriteRunes.add(id); else this.favoriteRunes.delete(id);
    this.save();
    return { ok: true, favorite: on };
  }

  resetMatchDeck() {
    this.matchDeck = this.sanitizeDeck(DEFAULT_MATCH_DECK);
    this.save();
    return this.getMatchDeck();
  }

  // Runes no longer arrive with the level (they are bought, see unlockRune); kept as the
  // hook for level-based announcements.
  syncRuneUnlocks() { return []; }

  // Buying a rune with skill points: null = possible, else why not.
  runeBlocker(runeId) {
    const entry = skillRuneUnlock(runeId);
    if (!entry) return 'unknown';
    if (this.unlockedRunes.has(runeId)) return 'owned';
    if (this.level < entry.level) return 'level';
    if (this.skillPoints < entry.cost) return 'points';
    return null;
  }
  unlockRune(runeId) {
    if (this.runeBlocker(runeId) !== null) return null;
    const entry = skillRuneUnlock(runeId);
    this.skillPoints -= entry.cost;
    this.unlockedRunes.add(runeId);
    this.save();
    return entry;
  }

  awardRuneUse(id, grade = 'B') {
    const gained = RUNE_XP_BY_GRADE[grade] ?? RUNE_XP_BY_GRADE.B;
    const beforeLevel = this.runeLevel(id); // measured before the gain (else a level-up never shows)
    this.runeXp[id] = (this.runeXp[id] ?? 0) + gained;
    const result = this.awardXp(gained, { save: false });
    result.runeLevelUp = this.runeLevel(id) > beforeLevel;
    result.runeLevel = this.runeLevel(id);
    if (result.runeLevelUp) result.newlyUnlockedRunes = [...(result.newlyUnlockedRunes ?? []), ...this.claimLateRunes()];
    this.save();
    return result;
  }

  awardXp(amount, { save = true } = {}) {
    this.xp += Math.max(0, amount);
    let levels = 0;
    while (this.xp >= this.xpToNextLevel()) {
      this.xp -= this.xpToNextLevel();
      this.level++;
      this.skillPoints++;
      levels++;
    }
    const newlyUnlockedRunes = this.syncRuneUnlocks();
    if (save) this.save();
    return { levels, gained: amount, newlyUnlockedRunes };
  }

  discoverSpell(id) {
    if (!id || this.discoveredSpells.has(id)) return false;
    this.discoveredSpells.add(id);
    this.save();
    return true;
  }

  getModifiers() {
    const modifiers = { ...BASE_MODIFIERS };
    for (const node of MAGE_SKILL_TREE) {
      if (!this.unlockedSkills.has(node.id)) continue;
      for (const [key, value] of Object.entries(node.modifiers ?? {})) {
        if (key === 'qualityFloor') modifiers[key] = value;
        else if (ADDITIVE_MODIFIERS.has(key)) modifiers[key] += value;
        else modifiers[key] *= value;
      }
    }
    return modifiers;
  }

  getBuildIdentity() {
    const counts = new Map();
    for (const node of MAGE_SKILL_TREE) {
      if (this.unlockedSkills.has(node.id)) counts.set(node.branch, (counts.get(node.branch) ?? 0) + 1);
    }
    const [branch, count] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? ['UNBOUND', 0];
    const labels = { ELEMENTAL: 'ELEMENTAL MAGE', DEFENSE: 'DEFENSIVE MAGE', SUMMONING: 'SUMMONER MAGE', 'RUNE MASTERY': 'RUNE MASTER', SHADOW: 'SHADOW MAGE' };
    return { branch, count, label: labels[branch] ?? 'UNBOUND MAGE' };
  }

  canUnlock(id) {
    const node = MAGE_SKILL_TREE.find((entry) => entry.id === id);
    if (!node || this.unlockedSkills.has(id) || this.skillPoints < node.cost) return false;
    return (node.prerequisites ?? []).every((prerequisite) => this.unlockedSkills.has(prerequisite));
  }

  // Masteries: previous tier owned, the rune unlocked and levelled through use (III: rune
  // level 3, IV: 5; Ward = every shield: Mage level 6 / 10), one skill point each.
  masteryBlocker(id, { free = false } = {}) {
    const req = masteryRequirement(id);
    if (!req) return 'unknown';
    if (this.masteries.has(id)) return 'owned';
    if (req.prev && !this.masteries.has(req.prev)) return 'prev';
    if (free) return null; // test build: only the tier order counts
    if (req.rune && !this.unlockedRunes.has(req.rune)) return 'rune';
    if (req.rune && this.runeLevel(req.rune) < req.runeLevel) return 'runeLevel';
    if (this.level < req.mageLevel) return 'level';
    if (this.skillPoints < req.cost) return 'points';
    return null;
  }
  canUnlockMastery(id, opts) { return this.masteryBlocker(id, opts) === null; }
  unlockMastery(id, { free = false } = {}) {
    if (!this.canUnlockMastery(id, { free })) return false;
    if (!free) this.skillPoints -= masteryRequirement(id).cost;
    this.masteries.add(id);
    this.save();
    return true;
  }
  // Respec: drops every mastery (refunds the points unless they were free test unlocks).
  resetMasteries({ refund = true } = {}) {
    if (refund) this.skillPoints += this.masteries.size;
    this.masteries.clear();
    this.save();
  }

  unlock(id) {
    if (!this.canUnlock(id)) return false;
    const node = MAGE_SKILL_TREE.find((entry) => entry.id === id);
    this.skillPoints -= node.cost;
    this.unlockedSkills.add(id);
    this.save();
    return true;
  }
}

export function applyMageProfile(player, profile) {
  player.buildModifiers = profile.getModifiers();
  player.masteries = new Set(profile.masteries ?? []);
  player.profileLevel = profile.level;
  return player.buildModifiers;
}
