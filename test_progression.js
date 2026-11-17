import assert from 'node:assert/strict';
import { MageProfile, MAGE_SKILL_TREE, applyMageProfile, DEFAULT_MATCH_DECK, MAX_DECK_PRESETS, DOMAIN_RUNE_IDS, deckAccepts, runeCategory, RUNE_CATEGORIES } from './public/src/progression.js';

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ PASS: ${name}`); }
  catch (error) { console.error(`  ❌ FAIL: ${name}\n`, error); process.exitCode = 1; }
}

console.log('\n📚 Starting GRIMGE Mage progression tests...\n');

test('Rune quality awards escalating Rune XP and persists the concrete rune level', () => {
  const profile = new MageProfile({ runeXp: {}, unlockedRunes: ['ignis'] });
  profile.awardRuneUse('ignis', 'C');
  profile.awardRuneUse('ignis', 'S');
  assert.equal(profile.runeXp.ignis, 24);
  assert.equal(profile.runeLevel('ignis'), 1);
});

test('Rune use can level the Mage and provides a spendable skill point', () => {
  const profile = new MageProfile({ xp: 65, level: 1, skillPoints: 0 });
  const outcome = profile.awardRuneUse('fulgur', 'C');
  assert.equal(outcome.levels, 1);
  assert.equal(profile.level, 2);
  assert.equal(profile.skillPoints, 1);
});

test('New runes cost skill points (a choice against passives), not the level alone', () => {
  const profile = new MageProfile({ level: 1, xp: 0, skillPoints: 0, unlockedRunes: ['ignis', 'ventus', 'fulgur', 'terra', 'aqua'] });
  assert.equal(profile.isRuneUnlocked('bestia'), false);
  profile.awardXp(70);
  assert.equal(profile.level, 2);
  assert.equal(profile.isRuneUnlocked('bestia'), false, 'a level-up alone grants no rune');
  assert.equal(profile.skillPoints, 1);
  assert.equal(profile.runeBlocker('natura'), null, 'base runes in any order');
  assert.ok(profile.unlockRune('natura'));
  assert.equal(profile.isRuneUnlocked('natura'), true);
  assert.equal(profile.skillPoints, 0);
  assert.equal(profile.runeBlocker('bestia'), 'points');
  assert.equal(profile.runeBlocker('doppel'), 'level');
  assert.equal(new MageProfile(profile.toJSON()).isRuneUnlocked('natura'), true);
});

test('Deckbuilder persists a legal 10-card selected deck and enforces unlock/copy limits', () => {
  const profile = new MageProfile({ level: 1, unlockedRunes: ['ignis', 'ventus', 'fulgur', 'terra', 'aqua'] });
  assert.deepEqual(profile.getMatchDeck(), DEFAULT_MATCH_DECK);
  assert.equal(profile.isDeckReady(), true);
  assert.equal(profile.addRuneToDeck('bestia').reason, 'LOCKED');
  assert.equal(profile.removeRuneFromDeck('ignis').ok, true);
  assert.equal(profile.getRuneCopies('ignis'), 1);
  assert.equal(profile.addRuneToDeck('ignis').ok, true);
  assert.equal(profile.addRuneToDeck('ignis').reason, 'DECK FULL');
  profile.removeRuneFromDeck('ignis'); profile.removeRuneFromDeck('ignis');
  profile.removeRuneFromDeck('aqua'); profile.removeRuneFromDeck('aqua');
  assert.equal(profile.addRuneToDeck('ignis').ok, true);
  assert.equal(profile.addRuneToDeck('ignis').ok, true);
  assert.equal(profile.addRuneToDeck('ignis').reason, 'COPY LIMIT');
});

test('Mage skill prerequisites and aggregate modifiers are authoritative', () => {
  const profile = new MageProfile({ level: 4, skillPoints: 3 });
  assert.equal(profile.unlock('elemental_reach'), false);
  assert.equal(profile.unlock('elemental_power'), true);
  assert.equal(profile.unlock('elemental_reach'), true);
  const modifiers = profile.getModifiers();
  assert.equal(modifiers.spellPower, 1.12);
  assert.equal(modifiers.spellArea, 1.12);
});

test('Applied Mage profile updates the runtime player modifier surface', () => {
  const profile = new MageProfile({ level: 2, skillPoints: 1, unlockedSkills: ['arcane_skin', 'spirit_bond'] });
  const player = {};
  applyMageProfile(player, profile);
  assert.equal(player.profileLevel, 2);
  assert.equal(player.buildModifiers.damageTaken, .90);
  assert.equal(player.buildModifiers.summonHp, 1.25);
  assert.equal(player.buildModifiers.mountSpeed, 1.10);
});

test('Rune Mastery produces a distinct live Focus-oriented Mage identity', () => {
  const profile = new MageProfile({ level: 4, skillPoints: 2, unlockedSkills: ['quick_draw', 'focused_casting'] });
  const modifiers = profile.getModifiers();
  assert.equal(modifiers.focusGain, 1.15);
  assert.equal(profile.getBuildIdentity().label, 'RUNE MASTER');
});

test('Rune masteries: tier order, rune level through use, skill points, persistence', () => {
  const profile = new MageProfile({ level: 3, skillPoints: 3, unlockedRunes: ['fulgur', 'natura', 'terra'] });
  assert.equal(profile.masteryBlocker('fulgur.chain.2'), 'prev');
  assert.ok(profile.unlockMastery('fulgur.chain.1'));
  assert.equal(profile.skillPoints, 2);
  assert.ok(profile.unlockMastery('fulgur.chain.2'));
  assert.equal(profile.masteryBlocker('fulgur.chain.3'), 'runeLevel');
  assert.equal(profile.masteryBlocker('ignis.burn.1'), 'rune');
  assert.equal(profile.masteryBlocker('ward.absorb.3', { free: false }), 'prev');
  assert.ok(profile.unlockMastery('fulgur.chain.3', { free: true }));
  const copy = new MageProfile(profile.toJSON());
  assert.deepEqual([...copy.masteries].sort(), ['fulgur.chain.1', 'fulgur.chain.2', 'fulgur.chain.3']);
  copy.resetMasteries({ refund: true });
  assert.equal(copy.masteries.size, 0);
  assert.equal(copy.skillPoints, profile.skillPoints + 3);
});

test('Skill tree is a compact 24-node Mage vertical slice (incl. multi-instance passives)', () => {
  assert.equal(MAGE_SKILL_TREE.length, 24);
  const profile = new MageProfile({ level: 9, skillPoints: 9, matchDeck: [...DEFAULT_MATCH_DECK] });
  assert.equal(profile.getModifiers().maxWalls, 1);
  for (const id of ['arcane_skin', 'barrier_mastery', 'rampart_mason', 'spirit_bond', 'empowered_summons', 'pack_leader', 'quick_draw', 'focused_casting', 'telekinetic_grip']) assert.ok(profile.unlock(id), id);
  const modifiers = profile.getModifiers();
  assert.equal(modifiers.maxWalls, 3);
  assert.equal(modifiers.extraSummons, 1);
  assert.equal(modifiers.liftTargets, 3);
  assert.deepEqual(new Set(MAGE_SKILL_TREE.map((node) => node.branch)), new Set(['ELEMENTAL', 'DEFENSE', 'SUMMONING', 'RUNE MASTERY', 'SHADOW']));
});

test('SHADOW passives add Shadow Stomper targets, doubles and revenants; shadow / special runes are bought with points', () => {
  const profile = new MageProfile({ level: 12, skillPoints: 9, matchDeck: [...DEFAULT_MATCH_DECK] });
  const base = profile.getModifiers();
  assert.equal(base.bindTargets, 0); assert.equal(base.extraDoppels, 0); assert.equal(base.extraRevenants, 0);
  for (const id of ['shadow_weaver', 'umbral_grip', 'mirror_legion', 'shadow_army', 'grave_caller', 'forbidden_covenant', 'celestial_attunement']) assert.ok(profile.unlock(id), id);
  const modifiers = profile.getModifiers();
  assert.equal(modifiers.bindTargets, 2);
  assert.equal(modifiers.extraDoppels, 2);
  assert.equal(modifiers.extraRevenants, 2);
  assert.ok(Math.abs(modifiers.bindHold - 1.3) < 1e-9);
  assert.ok(Math.abs(modifiers.skyDuration - 1.35) < 1e-9);
  assert.equal(profile.getBuildIdentity().label, 'SHADOW MAGE');
  profile.skillPoints = 5;
  for (const id of ['umbra', 'doppel', 'mortis']) assert.ok(profile.unlockRune(id), id);
  assert.equal(profile.skillPoints, 0, 'base rune 1 point, special runes 2 points each');
  const fresh = new MageProfile({ level: 9, skillPoints: 5, matchDeck: [...DEFAULT_MATCH_DECK] });
  assert.ok(!fresh.isRuneUnlocked('lux') && fresh.unlockRune('lux') && fresh.unlockRune('doppel') && fresh.runeBlocker('mortis') === 'level');
});

test('A saved deck that lost a retired rune (archived Arcane State) is topped up to 10 cards', () => {
  const profile = new MageProfile({ level: 20, matchDeck: ['ignis', 'ignis', 'aqua', 'aqua', 'terra', 'terra', 'ventus', 'ventus', 'fulgur', 'buff_T26'] });
  assert.equal(profile.matchDeck.length, 10);
  assert.ok(profile.isDeckReady() && profile.deckRepaired && !profile.matchDeck.includes('buff_T26'));
});

test('Deck builder: build presets save, load in one step, overwrite, delete and persist', () => {
  const profile = new MageProfile({ level: 20, unlockedRunes: ['ignis', 'ventus', 'fulgur', 'terra', 'aqua', 'lux'], matchDeck: [...DEFAULT_MATCH_DECK] });
  profile.removeRuneFromDeck('aqua');
  assert.equal(profile.saveDeckPreset('Half').reason, 'DECK NEEDS 10 CARDS');
  profile.addRuneToDeck('lux');
  const fire = profile.saveDeckPreset('  Feuer <Rush>  ');
  assert.ok(fire.ok && fire.preset.name === 'Feuer Rush' && fire.preset.deck.includes('lux'));
  const firstDeck = profile.getMatchDeck();
  profile.resetMatchDeck();
  assert.ok(!profile.matchDeck.includes('lux'));
  assert.ok(profile.loadDeckPreset(fire.preset.id).ok);
  assert.deepEqual(profile.getMatchDeck(), firstDeck);
  // Same name overwrites, an empty name gets a default.
  profile.removeRuneFromDeck('lux'); profile.addRuneToDeck('aqua');
  assert.ok(profile.saveDeckPreset('feuer rush').overwritten && profile.deckPresets.length === 1 && !profile.deckPresets[0].deck.includes('lux'));
  assert.equal(profile.saveDeckPreset('').preset.name, 'BUILD 2');
  // Persisted with the profile.
  const restored = new MageProfile(profile.toJSON());
  assert.deepEqual(restored.deckPresets.map((p) => p.name), ['feuer rush', 'BUILD 2']); // overwrite takes the newly typed name
  assert.ok(restored.deleteDeckPreset(restored.deckPresets[1].id).ok && restored.deckPresets.length === 1);
  // Limit.
  for (let i = 0; i < MAX_DECK_PRESETS + 2; i++) restored.saveDeckPreset(`B${i}`);
  assert.equal(restored.deckPresets.length, MAX_DECK_PRESETS);
  assert.ok(restored.saveDeckPreset('one more').reason.startsWith('MAX'));
});

test('Deck builder: favourite runes toggle and persist; presets survive the deck repair on load', () => {
  const profile = new MageProfile({ level: 20 });
  assert.ok(profile.toggleFavoriteRune('ignis').favorite && profile.isFavoriteRune('ignis'));
  profile.toggleFavoriteRune('sig_S46'); profile.toggleFavoriteRune('ignis');
  assert.ok(!profile.isFavoriteRune('ignis') && profile.isFavoriteRune('sig_S46') && !profile.toggleFavoriteRune('nope').ok);
  assert.deepEqual([...new MageProfile(profile.toJSON()).favoriteRunes], ['sig_S46']);
  const preset = { id: 'preset_1', name: 'Old', deck: [...DEFAULT_MATCH_DECK] };
  const repaired = new MageProfile({ level: 20, favoriteRunes: ['lux'], deckPresets: [preset], matchDeck: ['ignis', 'ignis', 'aqua', 'aqua', 'terra', 'terra', 'ventus', 'ventus', 'fulgur', 'buff_T26'] });
  assert.ok(repaired.deckRepaired && repaired.deckPresets.length === 1 && repaired.isFavoriteRune('lux'));
  assert.ok(repaired.toJSON().deckPresets[0].name === 'Old');
});

test('Builds remember the masteries: loading re-skills them (refund + re-buy), older builds keep the current ones', () => {
  const profile = new MageProfile({ level: 20, skillPoints: 10, unlockedRunes: ['ignis', 'ventus', 'fulgur', 'terra', 'aqua'] });
  profile.matchDeck = [...DEFAULT_MATCH_DECK];
  for (const id of ['fulgur.chain.1', 'fulgur.chain.2', 'ignis.inferno.1']) assert.ok(profile.unlockMastery(id), id);
  assert.equal(profile.skillPoints, 7);
  const saved = profile.saveDeckPreset('Sturm'); assert.ok(saved.ok); assert.deepEqual(saved.preset.masteries, ['fulgur.chain.1', 'fulgur.chain.2', 'ignis.inferno.1']);
  profile.resetMasteries(); profile.unlockMastery('aqua.tide.1'); assert.equal(profile.skillPoints, 9);
  const loaded = profile.loadDeckPreset(saved.preset.id);
  assert.ok(loaded.ok && loaded.masteriesSkipped === 0);
  assert.deepEqual([...profile.masteries].sort(), ['fulgur.chain.1', 'fulgur.chain.2', 'ignis.inferno.1']);
  assert.equal(profile.skillPoints, 7);
  // Survives a save / load of the profile.
  assert.deepEqual(new MageProfile(profile.toJSON()).deckPresets[0].masteries, ['fulgur.chain.1', 'fulgur.chain.2', 'ignis.inferno.1']);
  // Not enough points: what cannot be bought is skipped.
  profile.resetMasteries(); profile.skillPoints = 1;
  assert.equal(profile.loadDeckPreset(saved.preset.id).masteriesSkipped, 2); assert.equal(profile.masteries.size, 1);
  // An older build without masteries keeps the current ones.
  const old = new MageProfile({ level: 20, skillPoints: 5, deckPresets: [{ id: 'preset_1', name: 'Alt', deck: [...DEFAULT_MATCH_DECK] }] });
  old.unlockMastery('fulgur.chain.1', { free: true }); old.loadDeckPreset('preset_1');
  assert.deepEqual([...old.masteries], ['fulgur.chain.1']);
});

test('Deck categories: elements, then simple / multi / stances / summons / breathings / domains / transformations', () => {
  assert.equal(RUNE_CATEGORIES.length, 8);
  assert.deepEqual(['ignis', 'bestia', 'construct', 'ward'].map(runeCategory), ['element', 'element', 'element', 'element']);
  assert.equal(runeCategory('sig_S74'), 'multi'); assert.equal(runeCategory('sig_S71'), 'multi');
  assert.equal(runeCategory('sig_S48'), 'stance'); assert.equal(runeCategory('sig_S43'), 'summon'); assert.equal(runeCategory('mortis'), 'summon');
  assert.equal(runeCategory('sig_S84'), 'breath'); assert.equal(runeCategory('sig_S40'), 'breath');
  assert.equal(runeCategory('sig_S57'), 'domain'); assert.equal(runeCategory('buff_A04'), 'arcane'); assert.equal(runeCategory('sig_S03'), 'simple');
});

test('Domains: only ONE domain per deck (like the Arcane States), all share one glyph family', () => {
  assert.ok(DOMAIN_RUNE_IDS.length >= 4 && DOMAIN_RUNE_IDS.includes('sig_S53') && DOMAIN_RUNE_IDS.includes('sig_S58'));
  assert.ok(deckAccepts(['ignis', 'sig_S53'], 'sig_S45') && !deckAccepts(['ignis', 'sig_S53'], 'sig_S56'));
  const profile = new MageProfile({ level: 30, lateUnlocks: ['sig_S53', 'sig_S56', 'sig_S57', 'sig_S58'] });
  profile.matchDeck = ['ignis', 'ignis', 'aqua', 'aqua', 'terra', 'terra', 'ventus', 'sig_S57'];
  assert.equal(profile.addRuneToDeck('sig_S58').reason, 'ONE DOMAIN PER DECK');
  assert.equal(profile.sanitizeDeck(['sig_S53', 'sig_S56', 'ignis']).join(), 'sig_S53,ignis');
});


// ── Class unlocks (user, 16 Nov 2026): five starter classes, the rest earned ──────────────────────────────────────
import { STARTER_CLASSES, CLASS_UNLOCK_AT, ALL_CLASS_IDS, classUnlocked, classRequirement } from './public/src/class_unlocks.js';

test('Only the five starter classes are selectable at the beginning', () => {
  const profile = new MageProfile({});
  assert.deepEqual([...STARTER_CLASSES], ['Guardian', 'Berserker', 'Bladedancer', 'Ranger', 'Arcanist']);
  for (const id of STARTER_CLASSES) assert.equal(classUnlocked(profile, id), true, id);
  assert.equal(ALL_CLASS_IDS.length, 18);
  const locked = ALL_CLASS_IDS.filter((id) => !classUnlocked(profile, id));
  assert.equal(locked.length, 13);
  assert.ok(locked.includes('Lancer') && locked.includes('Fateweaver') && !locked.includes('Guardian'));
});

test('Level thresholds unlock the right classes', () => {
  const expected = { Lancer: 2, Monk: 3, Ronin: 4, Shadow: 5, Reaper: 7, Runeblade: 8, Oracle: 9, Occultist: 10, Resonant: 12, Spiritbound: 14, Beastborn: 16, Trickster: 18, Fateweaver: 20 };
  assert.deepEqual({ ...CLASS_UNLOCK_AT }, expected);
  for (const [id, level] of Object.entries(expected)) {
    assert.equal(classUnlocked(new MageProfile({ level: level - 1 }), id), false, id + ' below');
    assert.equal(classUnlocked(new MageProfile({ level }), id), true, id + ' at');
  }
  assert.match(classRequirement('Ronin'), /4/);
  assert.equal(classRequirement('Guardian'), null);
});

test('An explicit boss / secret / mission unlock opens a class early and survives save and load', () => {
  const profile = new MageProfile({});
  assert.equal(classUnlocked(profile, 'Occultist'), false);
  assert.equal(profile.unlockClass('Occultist'), true);
  assert.equal(profile.unlockClass('Occultist'), false, 'a second unlock changes nothing');
  assert.equal(profile.unlockClass('NoSuchClass'), false);
  assert.equal(classUnlocked(profile, 'Occultist'), true);
  const back = new MageProfile(JSON.parse(JSON.stringify(profile.toJSON())));
  assert.equal(classUnlocked(back, 'Occultist'), true);
  assert.equal(classUnlocked(back, 'Shadow'), false);
});

test('Migration keeps the class an old save had chosen', () => {
  const old = new MageProfile({ level: 1, classWeapon: 'katana', character: { created: true, classId: 'Ronin', startWeapon: 'katana' } });
  assert.equal(classUnlocked(old, 'Ronin'), true);
  assert.equal(classUnlocked(old, 'Shadow'), false);
  const viaWeapon = new MageProfile({ level: 1, classWeapon: 'daggers' });
  assert.equal(classUnlocked(viaWeapon, 'Shadow'), true, 'the class of the equipped weapon is kept');
});

test('The debug / test access opens every class', () => {
  const profile = new MageProfile({});
  profile.debugAccess = true;
  assert.ok(ALL_CLASS_IDS.every((id) => classUnlocked(profile, id)));
});

test('Choosing a locked class is refused by the profile', () => {
  const profile = new MageProfile({});
  profile.setCharacter({ classId: 'Guardian', startWeapon: 'sword_shield' });
  profile.setCharacter({ classId: 'Lancer', startWeapon: 'spear' });
  assert.equal(profile.character.classId, 'Guardian');
});


// ── Arena runes (user spec 16 Nov 2026): portfolio, shared pool, three slots, one-use, ejection, KO ───────────────────
import { ARENA_RULES, validatePortfolio, buildSpawnPool, pickFromPool, ArenaRuneSlots, makeRelic, tickRelics, relicCollectible, fitPortfolio } from './public/src/arena_runes.js';
import { arenaRuneInfo } from './public/src/progression.js';

const info = (id) => ({ ignis: { id, category: 'element', rarity: 'common' }, aqua: { id, category: 'element', rarity: 'common' }, frost: { id, category: 'element', rarity: 'common' },
  trap: { id, category: 'multi', rarity: 'rare' }, wolf: { id, category: 'summon', rarity: 'epic' }, sphere: { id, category: 'domain', rarity: 'legendary' },
  arcA: { id, category: 'arcane', rarity: 'legendary' }, arcB: { id, category: 'arcane', rarity: 'legendary' }, a: { id, category: 'element', rarity: 'common' }, b: { id, category: 'element', rarity: 'common' },
  c: { id, category: 'element', rarity: 'common' }, d: { id, category: 'element', rarity: 'common' }, e: { id, category: 'element', rarity: 'common' }, f: { id, category: 'element', rarity: 'common' }, g: { id, category: 'element', rarity: 'common' } }[id] ?? null);

test('Arena portfolio: costs by category, within six runes and twelve points', () => {
  const ok = validatePortfolio(['ignis', 'aqua', 'trap', 'wolf', 'sphere'], info); // 1+1+2+3+4 = 11
  assert.equal(ok.ok, true); assert.equal(ok.cost, 11); assert.equal(ok.count, 5);
  assert.equal(validatePortfolio([], info).ok, true);
});

test('Arena portfolio: an over-budget selection is rejected', () => {
  const exactly = validatePortfolio(['wolf', 'sphere', 'trap', 'ignis', 'aqua', 'frost'], info); // 3+4+2+1+1+1 = 12
  assert.equal(exactly.ok, true); assert.equal(exactly.cost, 12);
  const over = validatePortfolio(['sphere', 'wolf', 'trap', 'arcA'], info); // 4+3+2+5 = 14
  assert.equal(over.ok, false); assert.deepEqual(over.reasons, ['OVER_BUDGET']);
  const many = validatePortfolio(['a', 'b', 'c', 'd', 'e', 'f', 'g'], info); // seven cheap runes: too many, not over budget
  assert.equal(many.ok, false); assert.deepEqual(many.reasons, ['TOO_MANY_RUNES']);
});
test('Arena portfolio: more than one Arcane State, duplicates and unknown runes are rejected', () => {
  assert.ok(validatePortfolio(['arcA', 'arcB'], info).reasons.includes('TOO_MANY_ARCANE_STATES'));
  assert.equal(validatePortfolio(['arcA'], info).ok, true);
  assert.equal(validatePortfolio(['arcA'], info).cost, 5);
  assert.ok(validatePortfolio(['ignis', 'ignis'], info).reasons.includes('DUPLICATE'));
  assert.ok(validatePortfolio(['nope'], info).reasons.includes('UNKNOWN_RUNE'));
  assert.deepEqual(fitPortfolio(['arcA', 'arcB', 'ignis'], info), ['arcA', 'ignis']);
});

test('Arena spawn pool: both portfolios contribute, a shared rune has two entries, rarity weights apply', () => {
  const pool = buildSpawnPool([['ignis', 'wolf'], ['ignis', 'sphere']], info);
  assert.equal(pool.length, 4);
  assert.equal(pool.filter((e) => e.runeId === 'ignis').length, 2);
  assert.equal(pool.find((e) => e.runeId === 'sphere').weight, ARENA_RULES.weights.legendary);
  assert.deepEqual({ ...ARENA_RULES.weights }, { common: 1, uncommon: .7, rare: .4, epic: .22, legendary: .1 });
  const counts = {}; let seed = 7; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 6000; i++) { const e = pickFromPool(pool, rng); counts[e.runeId] = (counts[e.runeId] ?? 0) + 1; }
  assert.ok(counts.ignis > counts.wolf * 3 && counts.wolf > counts.sphere * 1.5, JSON.stringify(counts));
  assert.equal(pickFromPool(pool, rng, { minRarity: 'epic' }).rarity === 'common', false, 'an announced event leans on the high rarities');
});

test('Arena slots: exactly three, a full inventory never replaces silently', () => {
  const s = new ArenaRuneSlots();
  assert.equal(s.count, 0);
  for (const id of ['ignis', 'aqua', 'frost']) assert.equal(s.collect(id, 'c_' + id).ok, true);
  assert.equal(s.count, 3); assert.equal(s.full, true);
  const r = s.collect('wolf', 'c_wolf'); assert.deepEqual([r.ok, r.reason], [false, 'full']);
  assert.deepEqual(s.runeIds(), ['ignis', 'aqua', 'frost']);
});

test('Arena slots: holding replaces the highlighted slot (else the oldest) and returns the ejected rune', () => {
  const s = new ArenaRuneSlots(); for (const id of ['ignis', 'aqua', 'frost']) s.collect(id, 'c_' + id);
  assert.equal(s.holdOn(1, .2), false); assert.equal(s.holdOn(1, .1), false); assert.equal(s.holdOn(1, .1), true);
  const a = s.replace('wolf', 'c_wolf', 'c_frost'); assert.equal(a.ejected.runeId, 'frost');
  const b = s.replace('sphere', 'c_sphere', null); assert.equal(b.ejected.runeId, 'ignis', 'the oldest without a highlighted slot');
  assert.deepEqual(s.runeIds().sort(), ['aqua', 'sphere', 'wolf']);
  s.releaseHold(); assert.equal(s.holdProgress(), 0);
});

test('Arena slots: a committed cast empties its slot, a fusion every participating one', () => {
  const s = new ArenaRuneSlots(); for (const id of ['ignis', 'aqua', 'frost']) s.collect(id, 'c_' + id);
  assert.equal(s.consume({ cardIds: ['c_ignis'] }).length, 1); assert.equal(s.count, 2);
  s.collect('terra', 'c_terra');
  assert.equal(s.consume({ cardIds: ['c_aqua', 'c_frost', 'c_terra'] }).length, 3); assert.equal(s.count, 0);
  s.collect('ignis'); s.collect('ignis'); assert.equal(s.consume({ runeIds: ['ignis'] }).length, 1); assert.equal(s.count, 1, 'by rune id one entry per id');
});

test('Arena slots: an interrupted cast keeps the rune; retain drops only cards that no longer exist', () => {
  const s = new ArenaRuneSlots(); for (const id of ['ignis', 'aqua']) s.collect(id, 'c_' + id);
  assert.equal(s.retain(new Set(['c_ignis', 'c_aqua'])).length, 0, 'nothing consumed, nothing lost');
  assert.equal(s.retain(new Set(['c_aqua'])).length, 1); assert.deepEqual(s.runeIds(), ['aqua']);
});

test('Arena slots: a heavy ejects exactly one rune (selected, else the oldest) and a cooldown stops multi-hits', () => {
  const s = new ArenaRuneSlots(); for (const id of ['ignis', 'aqua', 'frost']) s.collect(id, 'c_' + id);
  const first = s.eject('c_aqua'); assert.equal(first.runeId, 'aqua'); assert.equal(s.count, 2);
  assert.equal(s.eject(null), null, 'the second hit of the same heavy strips nothing');
  s.tick(ARENA_RULES.ejectCooldown + .01);
  assert.equal(s.eject(null).runeId, 'ignis', 'the oldest');
  s.tick(2); assert.equal(s.eject(null).runeId, 'frost'); s.tick(2); assert.equal(s.eject(null), null, 'nothing left to eject');
});

test('Arena slots: a KO clears everything without dropping anything', () => {
  const s = new ArenaRuneSlots(); for (const id of ['ignis', 'aqua', 'frost']) s.collect(id, 'c_' + id);
  const gone = s.clear(); assert.equal(gone.length, 3); assert.equal(s.count, 0); assert.equal(s.collect('wolf').ok, true);
});

test('Arena relics: a new or ejected relic bounces for half a second before it can be collected', () => {
  const r = makeRelic('ignis', 400, .5); assert.equal(relicCollectible(r), false);
  tickRelics([r], .3); assert.equal(relicCollectible(r), false); tickRelics([r], .25); assert.equal(relicCollectible(r), true);
});

test('Arena portfolio in the profile: validated, saved and restored; owned runes only', () => {
  const profile = new MageProfile({ rules: 'earned', runeCopies: { ignis: 1, aqua: 1, frost: 1 }, unlockedRunes: ['ignis', 'aqua', 'frost'] });
  assert.equal(profile.setArenaPortfolio(['ignis', 'aqua']).ok, true);
  assert.equal(profile.setArenaPortfolio(['ignis', 'terra']).ok, false, 'terra is not owned');
  assert.deepEqual(profile.arenaPortfolio, ['ignis', 'aqua'], 'a refused portfolio changes nothing');
  assert.deepEqual(profile.effectiveArenaPortfolio(), ['ignis', 'aqua']);
  const back = new MageProfile(JSON.parse(JSON.stringify(profile.toJSON())));
  assert.deepEqual(back.arenaPortfolio, ['ignis', 'aqua']);
  const fresh = new MageProfile({ rules: 'earned', runeCopies: { ignis: 1 }, unlockedRunes: ['ignis'] });
  assert.deepEqual(fresh.effectiveArenaPortfolio(), ['ignis'], 'without a saved portfolio the owned base elements are used');
  assert.equal(arenaRuneInfo('ignis').rarity, 'common'); assert.equal(arenaRuneInfo('buff_A04').cost, 5); assert.equal(arenaRuneInfo('transform_x'), null);
});

console.log(`\nProgression results: ${passed} passed, ${process.exitCode ? 1 : 0} failed.`);
