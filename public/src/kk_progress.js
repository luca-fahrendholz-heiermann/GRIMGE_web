// GRIMGE Prototype — Kronenkrieg progression rules (GRIMGE_KRONENKRIEG.md §4a/§4b/§5). Pure: levels, deck slots, the
// level a rune category needs, and the loot tables (what a chest may hold depends on time and place, so luck changes
// WHEN one finds something strong, never whether one can use it too early).
import { mulberry32 } from './kk_map.js';

// XP needed to REACH each level (index = level).
export const LEVEL_XP = Object.freeze([0, 0, 60, 140, 240, 360, 500, 660, 840, 1040, 1260]);
export const MAX_LEVEL = 10;
export const levelForXp = (xp) => { let l = 1; while (l < MAX_LEVEL && xp >= LEVEL_XP[l + 1]) l++; return l; };
export const xpProgress = (xp) => { const l = levelForXp(xp); if (l >= MAX_LEVEL) return 1; return (xp - LEVEL_XP[l]) / (LEVEL_XP[l + 1] - LEVEL_XP[l]); };
// Deck slots by level: 4 → 8 (levels 2, 4, 6, 9 add one).
export const deckSlots = (level) => 4 + [2, 4, 6, 9].filter((l) => level >= l).length;
export const squadBonus = (level) => (level >= 4 ? 2 : 0) + (level >= 7 ? 2 : 0);
// The level a rune category needs (the mastery order: breathing → sphere → Arcane State / Bankai).
export const RUNE_GATE = Object.freeze({ element: 1, simple: 1, summon: 3, stance: 3, breath: 4, multi: 5, domain: 6, arcane: 8 });
export const FUSE_GATE = Object.freeze({ two: 2, three: 6 });
export const gateFor = (category) => RUNE_GATE[category] ?? 1;
// What each level unlocks (shown on level-up).
export const LEVEL_UNLOCKS = Object.freeze({
  2: '+1 DECKPLATZ · FUSION AUS ZWEI RUNEN', 3: 'PFERDE REITEN · BESCHWÖRUNGEN & HALTUNGEN', 4: '+1 DECKPLATZ · TRUPP +2 · ATMUNG',
  5: 'KREATUREN REITEN · MEHRFACH-RUNEN', 6: '+1 DECKPLATZ · SPHÄREN · FUSION AUS DREI RUNEN', 7: 'TRUPP +2 · ZWEITER TRANKPLATZ',
  8: 'FLIEGEN · KRÖNUNG I: ARCANE STATE ODER BANKAI', 9: '+1 DECKPLATZ', 10: 'KRONENSTUFE · KRÖNUNG II: FOKUS-TRANSFORMATION'
});
export const XP = Object.freeze({ discover: 4, search: 20, mine: 5, shrine: 10, kill: 10, killHero: 60, capture: 60, free: 30, hatch: 80, trial: 50 });
// Beating a higher-level hero pays more (a bounty on the leader).
export const heroKillXp = (myLevel, theirLevel) => Math.round(XP.killHero * (1 + Math.max(0, theirLevel - myLevel) * .35));

// ── loot ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// Tier 0–3 of a place: grows with the time played and toward the middle band / away from the main castles.
export function lootTier({ time = 0, middleBand = false, hqDistance = 0 } = {}) {
  let t = 0; if (time > 240) t++; if (time > 600) t++; if (middleBand) t++; if (hqDistance > 3200) t++;
  return Math.min(3, t);
}
// Which rune categories a chest of a tier may hold.
export const TIER_CATEGORIES = Object.freeze([
  ['element', 'simple'], ['element', 'simple', 'summon', 'stance'], ['simple', 'summon', 'stance', 'breath', 'multi'], ['summon', 'breath', 'multi', 'domain', 'arcane']
]);
export const MATERIALS = Object.freeze(['wood', 'stone', 'steel', 'obsidian']);
const MATERIAL_BY_TIER = Object.freeze([['wood', 'wood', 'stone'], ['wood', 'stone', 'stone', 'steel'], ['stone', 'steel', 'steel', 'obsidian'], ['steel', 'obsidian', 'obsidian']]);

// One chest: { gold, materials{}, stones{}, weapons[], potions{}, runeCategory|null } — a pure roll (seeded).
export function rollChest(seed, tier, { biomeElement = null, weapons = [] } = {}) {
  const rng = mulberry32(seed); const r = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const out = { gold: r(10, 30) * (1 + tier * .6) | 0, materials: {}, stones: {}, weapons: [], potions: {}, runeCategory: null };
  const mats = MATERIAL_BY_TIER[tier]; for (let i = 0; i < 2 + (rng() < .5 ? 1 : 0); i++) { const m = mats[Math.floor(rng() * mats.length)]; out.materials[m] = (out.materials[m] ?? 0) + r(2, 5); }
  if (biomeElement && rng() < .7) out.stones[biomeElement] = r(1, 2 + tier);
  if (weapons.length && rng() < .45) out.weapons.push(weapons[Math.floor(rng() * weapons.length)]);
  if (rng() < .5) out.potions[rng() < .65 ? 'hp' : 'mp'] = 1;
  if (rng() < .38 + tier * .06) { const cats = TIER_CATEGORIES[tier]; out.runeCategory = cats[Math.floor(rng() * cats.length)]; }
  return out;
}
