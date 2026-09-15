// GRIMGE Prototype — lightweight local Mage progression.
// This deliberately stays data-driven: UI, casting and future save/profile
// work consume the same skill definitions and aggregate modifiers.

export const MAGE_SKILL_TREE = Object.freeze([
  { id: 'elemental_power', branch: 'ELEMENTAL', title: 'Elemental Power', desc: '+12% spell damage.', cost: 1, modifiers: { spellPower: 1.12 } },
  { id: 'elemental_reach', branch: 'ELEMENTAL', title: 'Elemental Reach', desc: '+12% spell area and reach.', cost: 1, prerequisites: ['elemental_power'], modifiers: { spellArea: 1.12 } },
  { id: 'resonance', branch: 'ELEMENTAL', title: 'Rune Resonance', desc: '+15% combined-spell power.', cost: 1, prerequisites: ['elemental_reach'], modifiers: { comboPower: 1.15 } },
  { id: 'arcane_skin', branch: 'DEFENSE', title: 'Arcane Skin', desc: 'Take 10% less damage.', cost: 1, modifiers: { damageTaken: .90 } },
  { id: 'barrier_mastery', branch: 'DEFENSE', title: 'Barrier Mastery', desc: 'Walls last 30% longer and cover more ground.', cost: 1, prerequisites: ['arcane_skin'], modifiers: { wallDuration: 1.30, wallHp: 1.25 } },
  { id: 'aura_shock_mastery', branch: 'DEFENSE', title: 'Aura Shock Mastery', desc: '+18% Aura Shock radius and knockback.', cost: 1, prerequisites: ['barrier_mastery'], modifiers: { auraArea: 1.18, auraPush: 1.18 } },
  { id: 'spirit_bond', branch: 'SUMMONING', title: 'Spirit Bond', desc: '+25% summon health and +10% mount speed.', cost: 1, modifiers: { summonHp: 1.25, mountSpeed: 1.10 } },
  { id: 'empowered_summons', branch: 'SUMMONING', title: 'Empowered Summons', desc: '+18% summon damage.', cost: 1, prerequisites: ['spirit_bond'], modifiers: { summonDamage: 1.18 } },
  { id: 'dragon_heart', branch: 'SUMMONING', title: 'Dragon Heart', desc: '+25% Dragon Invocation coverage.', cost: 1, prerequisites: ['empowered_summons'], modifiers: { dragonArea: 1.25 } },
  { id: 'quick_draw', branch: 'RUNE MASTERY', title: 'Quick Draw', desc: 'C-grade runes become B-grade for spell scaling.', cost: 1, modifiers: { qualityFloor: 'B' } },
  { id: 'focused_casting', branch: 'RUNE MASTERY', title: 'Focused Casting', desc: '+12% duration of sustained spells and summons.', cost: 1, prerequisites: ['quick_draw'], modifiers: { spellDuration: 1.12 } },
  { id: 'combination_scholar', branch: 'RUNE MASTERY', title: 'Combination Scholar', desc: '+12% combined-spell power.', cost: 1, prerequisites: ['focused_casting'], modifiers: { comboPower: 1.12 } }
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
  qualityFloor: null
});

export const RUNE_XP_BY_GRADE = Object.freeze({ C: 6, B: 10, A: 14, S: 18 });
export const STARTER_RUNES = Object.freeze(['ignis', 'ventus', 'fulgur', 'terra', 'aqua']);
// These are real cards, not UI flags. Once unlocked they are appended to a
// live deck and can be drawn/recognised using the ordinary hand-card path.
export const MAGE_LEVEL_RUNE_UNLOCKS = Object.freeze([
  { level: 2, runeId: 'bestia', title: 'BESTIA RUNE UNLOCKED' },
  { level: 3, runeId: 'construct', title: 'KONSTRUKT RUNE UNLOCKED' },
  { level: 4, runeId: 'void', title: 'VOID RUNE UNLOCKED' }
]);

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
      discoveredSpells: [...this.discoveredSpells], unlockedRunes: [...this.unlockedRunes], progressionVersion: 2
    };
  }

  xpToNextLevel() { return 70 + (this.level - 1) * 35; }
  runeLevel(id) { return 1 + Math.floor((this.runeXp[id] ?? 0) / 60); }
  runeXpIntoLevel(id) { return (this.runeXp[id] ?? 0) % 60; }
  isRuneUnlocked(id) { return this.unlockedRunes.has(id); }

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
        else modifiers[key] *= value;
      }
    }
    return modifiers;
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
