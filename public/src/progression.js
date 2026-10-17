// GRIMGE Prototype — lightweight local Mage progression.
// This deliberately stays data-driven: UI, casting and future save/profile
// work consume the same skill definitions and aggregate modifiers.

export const MAGE_SKILL_TREE = Object.freeze([
  { id: 'elemental_power', branch: 'ELEMENTAL', title: 'Elemental Power', desc: '+12% spell damage.', cost: 1, modifiers: { spellPower: 1.12 } },
  { id: 'elemental_reach', branch: 'ELEMENTAL', title: 'Elemental Reach', desc: '+12% spell area and reach.', cost: 1, prerequisites: ['elemental_power'], modifiers: { spellArea: 1.12 } },
  { id: 'resonance', branch: 'ELEMENTAL', title: 'Rune Resonance', desc: '+15% combined-spell power.', cost: 1, prerequisites: ['elemental_reach'], modifiers: { comboPower: 1.15 } },
  { id: 'arcane_skin', branch: 'DEFENSE', title: 'Arcane Skin', desc: 'Take 10% less damage.', cost: 1, modifiers: { damageTaken: .90 } },
  { id: 'barrier_mastery', branch: 'DEFENSE', title: 'Barrier Mastery', desc: 'Walls last 30% longer and cover more ground.', cost: 1, prerequisites: ['arcane_skin'], modifiers: { wallDuration: 1.30, wallHp: 1.25 } },
  { id: 'rampart_mason', branch: 'DEFENSE', title: 'Rampart Mason', desc: 'Keep up to 3 walls on the field at once; older walls only fall when destroyed or expired.', cost: 1, prerequisites: ['barrier_mastery'], modifiers: { maxWalls: 2 } },
  { id: 'aura_shock_mastery', branch: 'DEFENSE', title: 'Aura Shock Mastery', desc: '+18% Aura Shock radius and knockback.', cost: 1, prerequisites: ['barrier_mastery'], modifiers: { auraArea: 1.18, auraPush: 1.18 } },
  { id: 'spirit_bond', branch: 'SUMMONING', title: 'Spirit Bond', desc: '+25% summon health and +10% mount speed.', cost: 1, modifiers: { summonHp: 1.25, mountSpeed: 1.10 } },
  { id: 'empowered_summons', branch: 'SUMMONING', title: 'Empowered Summons', desc: '+18% summon damage.', cost: 1, prerequisites: ['spirit_bond'], modifiers: { summonDamage: 1.18 } },
  { id: 'pack_leader', branch: 'SUMMONING', title: 'Pack Leader', desc: 'Command one more summon of each kind at the same time.', cost: 1, prerequisites: ['empowered_summons'], modifiers: { extraSummons: 1 } },
  { id: 'dragon_heart', branch: 'SUMMONING', title: 'Dragon Heart', desc: '+25% Dragon Invocation coverage.', cost: 1, prerequisites: ['empowered_summons'], modifiers: { dragonArea: 1.25 } },
  { id: 'quick_draw', branch: 'RUNE MASTERY', title: 'Quick Draw', desc: 'C-grade runes become B-grade for spell scaling.', cost: 1, modifiers: { qualityFloor: 'B' } },
  { id: 'focused_casting', branch: 'RUNE MASTERY', title: 'Focused Casting', desc: '+12% duration and +15% Focus gain.', cost: 1, prerequisites: ['quick_draw'], modifiers: { spellDuration: 1.12, focusGain: 1.15 } },
  { id: 'telekinetic_grip', branch: 'RUNE MASTERY', title: 'Telekinetic Grip', desc: 'Gravity Lift grabs 3 more targets and holds them 60% longer.', cost: 1, prerequisites: ['focused_casting'], modifiers: { liftTargets: 3, liftHold: 1.6 } },
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
  skyDuration: 1
});
const ADDITIVE_MODIFIERS = new Set(['maxWalls', 'extraSummons', 'liftTargets', 'bindTargets', 'extraDoppels', 'extraRevenants']);

export const RUNE_XP_BY_GRADE = Object.freeze({ C: 6, B: 10, A: 14, S: 18 });
export const STARTER_RUNES = Object.freeze(['ignis', 'ventus', 'fulgur', 'terra', 'aqua']);
export const MATCH_DECK_SIZE = 10;
export const MAX_RUNE_COPIES = 2;
import { BUFF_FORM_DATA } from './buff_forms_data.js';
// Buff transformation special runes: max. ONE of them per deck (atlas §1.9).
export const BUFF_RUNE_IDS = Object.freeze(BUFF_FORM_DATA.map((form) => 'buff_' + form.id));
export const MAX_BUFF_RUNES = 1;
export const isBuffRuneId = (id) => String(id).startsWith('buff_');
export const ALL_RUNE_IDS = Object.freeze(['ignis', 'ventus', 'fulgur', 'terra', 'aqua', 'bestia', 'construct', 'void', 'lux', 'umbra', 'doppel', 'mortis', ...BUFF_RUNE_IDS]);
// A deck may take this rune (copy limit, and only one buff rune at all).
export function deckAccepts(deck, id) {
  if (isBuffRuneId(id)) return deck.filter(isBuffRuneId).length < MAX_BUFF_RUNES;
  return deck.filter((entry) => entry === id).length < MAX_RUNE_COPIES;
}
// The first deck deliberately contains two copies of every starter rune.
// It is a legal 10-card deck and guarantees a varied initial three-card hand.
export const DEFAULT_MATCH_DECK = Object.freeze(['fulgur', 'terra', 'ignis', 'ventus', 'aqua', 'fulgur', 'terra', 'ignis', 'ventus', 'aqua']);
// These are real cards, not UI flags. Once unlocked they are appended to a
// live deck and can be drawn/recognised using the ordinary hand-card path.
export const MAGE_LEVEL_RUNE_UNLOCKS = Object.freeze([
  { level: 2, runeId: 'bestia', title: 'BESTIA RUNE UNLOCKED' },
  { level: 3, runeId: 'construct', title: 'KONSTRUKT RUNE UNLOCKED' },
  { level: 4, runeId: 'void', title: 'VOID RUNE UNLOCKED' },
  { level: 5, runeId: 'lux', title: 'LUX RUNE UNLOCKED' },
  { level: 6, runeId: 'umbra', title: 'UMBRA RUNE UNLOCKED' },
  { level: 8, runeId: 'doppel', title: 'DOPPEL SPECIAL RUNE UNLOCKED' },
  { level: 10, runeId: 'mortis', title: 'MORTIS SPECIAL RUNE UNLOCKED' }
]);
export function runeUnlockLabel(runeId) {
  const entry = MAGE_LEVEL_RUNE_UNLOCKS.find((unlock) => unlock.runeId === runeId);
  return entry ? `MAGE LV.${entry.level}` : 'STARTER';
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
    this.runeXp = { ...(source?.runeXp ?? {}) };
    this.discoveredSpells = new Set(source?.discoveredSpells ?? []);
    this.unlockedRunes = new Set(source?.unlockedRunes ?? STARTER_RUNES);
    this.syncRuneUnlocks();
    const savedDeck = Array.isArray(source?.matchDeck) ? source.matchDeck : DEFAULT_MATCH_DECK;
    this.matchDeck = this.sanitizeDeck(savedDeck);
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
      unlockedSkills: [...this.unlockedSkills], runeXp: clone(this.runeXp),
      discoveredSpells: [...this.discoveredSpells], unlockedRunes: [...this.unlockedRunes],
      matchDeck: [...this.matchDeck], progressionVersion: 3
    };
  }

  xpToNextLevel() { return 70 + (this.level - 1) * 35; }
  runeLevel(id) { return 1 + Math.floor((this.runeXp[id] ?? 0) / 60); }
  runeXpIntoLevel(id) { return (this.runeXp[id] ?? 0) % 60; }
  // Prototype: every buff rune is available (its deck slot is the limit).
  isRuneUnlocked(id) { return isBuffRuneId(id) || this.unlockedRunes.has(id); }

  sanitizeDeck(ids = []) {
    const copies = new Map();
    return ids.filter((id) => {
      if (!ALL_RUNE_IDS.includes(id) || !this.isRuneUnlocked(id)) return false;
      const count = copies.get(id) ?? 0;
      if (count >= MAX_RUNE_COPIES || copies.size > ALL_RUNE_IDS.length) return false;
      if (isBuffRuneId(id) && [...copies.keys()].some(isBuffRuneId)) return false;
      copies.set(id, count + 1);
      return true;
    }).slice(0, MATCH_DECK_SIZE);
  }

  getMatchDeck() { return [...this.matchDeck]; }
  getRuneCopies(id) { return this.matchDeck.filter((entry) => entry === id).length; }
  isDeckReady() { return this.matchDeck.length === MATCH_DECK_SIZE; }

  addRuneToDeck(id) {
    if (!this.isRuneUnlocked(id)) return { ok: false, reason: 'LOCKED' };
    if (this.matchDeck.length >= MATCH_DECK_SIZE) return { ok: false, reason: 'DECK FULL' };
    if (this.getRuneCopies(id) >= MAX_RUNE_COPIES) return { ok: false, reason: 'COPY LIMIT' };
    if (!deckAccepts(this.matchDeck, id)) return { ok: false, reason: 'ONE BUFF TRANSFORMATION PER DECK' };
    this.matchDeck.push(id); this.save();
    return { ok: true };
  }

  removeRuneFromDeck(id) {
    const index = this.matchDeck.lastIndexOf(id);
    if (index < 0) return { ok: false, reason: 'NOT IN DECK' };
    this.matchDeck.splice(index, 1); this.save();
    return { ok: true };
  }

  resetMatchDeck() {
    this.matchDeck = this.sanitizeDeck(DEFAULT_MATCH_DECK);
    this.save();
    return this.getMatchDeck();
  }

  syncRuneUnlocks() {
    const unlocked = [];
    for (const entry of MAGE_LEVEL_RUNE_UNLOCKS) {
      if (this.level >= entry.level && !this.unlockedRunes.has(entry.runeId)) {
        this.unlockedRunes.add(entry.runeId);
        unlocked.push(entry);
      }
    }
    return unlocked;
  }

  awardRuneUse(id, grade = 'B') {
    const gained = RUNE_XP_BY_GRADE[grade] ?? RUNE_XP_BY_GRADE.B;
    this.runeXp[id] = (this.runeXp[id] ?? 0) + gained;
    const beforeLevel = this.runeLevel(id);
    const result = this.awardXp(gained, { save: false });
    result.runeLevelUp = this.runeLevel(id) > beforeLevel;
    result.runeLevel = this.runeLevel(id);
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
  player.profileLevel = profile.level;
  return player.buildModifiers;
}
