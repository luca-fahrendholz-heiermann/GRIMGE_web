// GRIMGE Prototype — Arena runes (user spec 16 Nov 2026): the Arena is a melee-first duel in which runes are contested
// one-use items. This module is PURE logic without imports, so the profile, the game loop and the tests share it:
//   • the Arena Rune Portfolio (up to six distinct runes, 12 points) and its validation,
//   • the shared spawn pool built from BOTH portfolios, with rarity weights,
//   • three carried slots per fighter: collect, replace by holding, consume on a committed cast, eject, clear on KO,
//   • the relic bounce lock.
// Player and AI use exactly the same objects and rules. All numbers are data (ARENA_RULES), tuned by playtests.

export const ARENA_RULES = Object.freeze({
  maxRunes: 6,               // distinct runes in one portfolio
  budget: 12,                // points per portfolio
  maxArcaneStates: 1,
  slots: 3,                  // carried runes per fighter (the spell triangle)
  replaceHold: .35,          // s standing on a relic with full slots replaces the highlighted slot
  bounceLock: .5,            // s a new or ejected relic cannot be collected
  ejectCooldown: .8,         // s per victim: a multi-hit heavy strips one rune only
  // Portfolio points by rune category (progression.js runeCategory): simple element 1, tactical / counter / trap 2,
  // strong special or summon 3, beam / sphere / large control 4, Arcane State 5. The class transformation costs nothing.
  points: Object.freeze({ element: 1, simple: 2, multi: 2, stance: 3, summon: 3, breath: 3, domain: 4, arcane: 5 }),
  // Relative spawn weight by rarity.
  weights: Object.freeze({ common: 1, uncommon: .7, rare: .4, epic: .22, legendary: .1 }),
  rarityOrder: Object.freeze(['common', 'uncommon', 'rare', 'epic', 'legendary'])
});

// Rarity of a rune in the Arena: the six base elements are common, the other elements uncommon, single-effect
// specials rare, summons / stances / breaths epic, spheres and Arcane States legendary.
export function arenaRarityOf(category, starter = false) {
  if (category === 'element') return starter ? 'common' : 'uncommon';
  if (category === 'simple' || category === 'multi') return 'rare';
  if (category === 'domain' || category === 'arcane') return 'legendary';
  return 'epic';
}
export const arenaPointsOf = (category, rules = ARENA_RULES) => rules.points[category] ?? 3;

// A portfolio: { ok, reasons[], cost, count, arcane }. infoOf(id) → { id, category, cost?, rarity? } or null for an
// unknown rune. Duplicates inside one portfolio are not allowed.
export function validatePortfolio(ids, infoOf, rules = ARENA_RULES) {
  const reasons = []; const list = Array.isArray(ids) ? ids : [];
  const unique = new Set(list);
  if (unique.size !== list.length) reasons.push('DUPLICATE');
  if (unique.size > rules.maxRunes) reasons.push('TOO_MANY_RUNES');
  let cost = 0; let arcane = 0;
  for (const id of unique) {
    const info = infoOf?.(id);
    if (!info) { reasons.push('UNKNOWN_RUNE'); continue; }
    cost += info.cost ?? arenaPointsOf(info.category, rules);
    if (info.category === 'arcane') arcane++;
  }
  if (cost > rules.budget) reasons.push('OVER_BUDGET');
  if (arcane > rules.maxArcaneStates) reasons.push('TOO_MANY_ARCANE_STATES');
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)], cost, count: unique.size, arcane };
}
// The German line for a validation result (UI).
export const PORTFOLIO_REASON_TEXT = Object.freeze({
  DUPLICATE: 'Keine doppelten Runen', TOO_MANY_RUNES: 'Höchstens 6 Runen', OVER_BUDGET: 'Über dem Punktebudget',
  TOO_MANY_ARCANE_STATES: 'Nur ein Arcane State', UNKNOWN_RUNE: 'Unbekannte Rune'
});
// Keeps the valid prefix of a wish list (used when a saved portfolio no longer fits, e.g. after a rule change).
export function fitPortfolio(ids, infoOf, rules = ARENA_RULES) {
  const out = [];
  for (const id of Array.isArray(ids) ? ids : []) { if (out.includes(id)) continue; if (validatePortfolio([...out, id], infoOf, rules).ok) out.push(id); }
  return out;
}

// The shared spawn pool: one entry per portfolio pick, so a rune chosen by both players has two entries (twice the
// weight). entry = { runeId, rarity, weight, owner }.
export function buildSpawnPool(portfolios, infoOf, rules = ARENA_RULES) {
  const pool = [];
  portfolios.forEach((ids, owner) => {
    for (const id of new Set(Array.isArray(ids) ? ids : [])) {
      const info = infoOf?.(id); if (!info) continue;
      const rarity = info.rarity ?? 'common';
      pool.push({ runeId: id, rarity, weight: rules.weights[rarity] ?? 1, owner });
    }
  });
  return pool;
}
// Weighted pick; minRarity limits the pick to that rarity or better (announced central events), falling back to the
// whole pool when nothing qualifies. rng() in [0,1).
export function pickFromPool(pool, rng = Math.random, { minRarity = null, exclude = null, rules = ARENA_RULES } = {}) {
  let list = pool;
  if (minRarity) { const floor = rules.rarityOrder.indexOf(minRarity); const better = pool.filter((e) => rules.rarityOrder.indexOf(e.rarity) >= floor); if (better.length) list = better; }
  if (exclude?.size) { const rest = list.filter((e) => !exclude.has(e.runeId)); if (rest.length) list = rest; }
  const total = list.reduce((n, e) => n + e.weight, 0); if (!(total > 0)) return null;
  let roll = rng() * total;
  for (const e of list) { roll -= e.weight; if (roll <= 0) return e; }
  return list[list.length - 1];
}

// ── a fighter's carried runes ─────────────────────────────────────────────────────────────────────────────────────────
// Three slots. An entry = { runeId, cardId, order }: cardId links the entry to the player's card (hand, prepared spell
// slot); the AI uses runeId only. Everything here is deterministic; time comes in through tick(dt).
export class ArenaRuneSlots {
  constructor(rules = ARENA_RULES) {
    this.rules = rules; this.slots = Array.from({ length: rules.slots }, () => null);
    this.order = 0; this.ejectLock = 0; this.hold = null;
  }
  tick(dt) { this.ejectLock = Math.max(0, this.ejectLock - dt); }
  get entries() { return this.slots.filter(Boolean); }
  get count() { return this.entries.length; }
  get full() { return this.count >= this.rules.slots; }
  runeIds() { return this.entries.map((e) => e.runeId); }
  has(cardId) { return this.entries.some((e) => e.cardId === cardId); }
  // A free slot takes the rune; a full inventory never replaces silently.
  collect(runeId, cardId = null) {
    const index = this.slots.indexOf(null); if (index < 0) return { ok: false, reason: 'full' };
    const entry = { runeId, cardId, order: ++this.order }; this.slots[index] = entry; return { ok: true, index, entry };
  }
  // Holding the pickup replaces the highlighted slot (selected entry, else the oldest); returns the ejected entry.
  replace(runeId, cardId = null, selectedCardId = null) {
    if (!this.full) { const r = this.collect(runeId, cardId); return { ...r, ejected: null }; }
    const index = this.indexToEject(selectedCardId); const ejected = this.slots[index];
    const entry = { runeId, cardId, order: ++this.order }; this.slots[index] = entry;
    return { ok: true, index, entry, ejected };
  }
  indexToEject(selectedCardId = null) {
    if (selectedCardId != null) { const i = this.slots.findIndex((e) => e && e.cardId === selectedCardId); if (i >= 0) return i; }
    let best = -1; this.slots.forEach((e, i) => { if (e && (best < 0 || e.order < this.slots[best].order)) best = i; });
    return best;
  }
  // A committed cast empties the slots of every participating rune (fusion = all of them). Match by cardId when the
  // cast knows its cards, otherwise by runeId (one entry per id, the oldest first).
  consume({ cardIds = [], runeIds = [] } = {}) {
    const removed = [];
    for (const id of cardIds) { const i = this.slots.findIndex((e) => e && e.cardId === id); if (i >= 0) { removed.push(this.slots[i]); this.slots[i] = null; } }
    for (const id of runeIds) {
      let at = -1; this.slots.forEach((e, i) => { if (e && e.runeId === id && (at < 0 || e.order < this.slots[at].order)) at = i; });
      if (at >= 0) { removed.push(this.slots[at]); this.slots[at] = null; }
    }
    return removed;
  }
  // Keeps only entries whose card still exists somewhere (hand, deck, prepared spell): the player's own bookkeeping.
  retain(liveCardIds) { const gone = []; this.slots.forEach((e, i) => { if (e && e.cardId != null && !liveCardIds.has(e.cardId)) { gone.push(e); this.slots[i] = null; } }); return gone; }
  // A qualifying heavy hit knocks out at most one rune (selected, else the oldest) and starts the ejection lock.
  eject(selectedCardId = null) {
    if (this.ejectLock > 0 || !this.count) return null;
    const index = this.indexToEject(selectedCardId); const entry = this.slots[index];
    this.slots[index] = null; this.ejectLock = this.rules.ejectCooldown; return entry;
  }
  // KO: everything is cleared; the runes do not drop and go to nobody (they stay in the shared pool).
  clear() { const gone = this.entries; this.slots.fill(null); this.hold = null; return gone; }
  // The replace hold: dwelling on a relic with full slots; returns true once the hold time is reached.
  holdOn(relicId, dt) {
    if (!this.full) { this.hold = null; return false; }
    if (!this.hold || this.hold.relicId !== relicId) this.hold = { relicId, t: 0 };
    this.hold.t += dt; return this.hold.t >= this.rules.replaceHold;
  }
  holdProgress() { return this.hold ? Math.min(1, this.hold.t / this.rules.replaceHold) : 0; }
  releaseHold() { this.hold = null; }
}

// ── relics on the field ───────────────────────────────────────────────────────────────────────────────────────────────
let relicIds = 0;
export function makeRelic(runeId, x, z, { lock = ARENA_RULES.bounceLock, source = 'spawn', rarity = 'common' } = {}) {
  return { id: ++relicIds, runeId, x, z, lock, source, rarity, age: 0 };
}
export function tickRelics(relics, dt) { for (const r of relics) { r.age += dt; r.lock = Math.max(0, r.lock - dt); } }
export const relicCollectible = (relic) => relic.lock <= 0;
