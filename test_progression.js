import assert from 'node:assert/strict';
import { MageProfile, MAGE_SKILL_TREE, applyMageProfile, DEFAULT_MATCH_DECK, MAX_DECK_PRESETS, DOMAIN_RUNE_IDS, deckAccepts } from './public/src/progression.js';

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

test('Domains: only ONE domain per deck (like the Arcane States), all share one glyph family', () => {
  assert.ok(DOMAIN_RUNE_IDS.length >= 4 && DOMAIN_RUNE_IDS.includes('sig_S53') && DOMAIN_RUNE_IDS.includes('sig_S58'));
  assert.ok(deckAccepts(['ignis', 'sig_S53'], 'sig_S45') && !deckAccepts(['ignis', 'sig_S53'], 'sig_S56'));
  const profile = new MageProfile({ level: 30, lateUnlocks: ['sig_S53', 'sig_S56', 'sig_S57', 'sig_S58'] });
  profile.matchDeck = ['ignis', 'ignis', 'aqua', 'aqua', 'terra', 'terra', 'ventus', 'sig_S57'];
  assert.equal(profile.addRuneToDeck('sig_S58').reason, 'ONE DOMAIN PER DECK');
  assert.equal(profile.sanitizeDeck(['sig_S53', 'sig_S56', 'ignis']).join(), 'sig_S53,ignis');
});

console.log(`\nProgression results: ${passed} passed, ${process.exitCode ? 1 : 0} failed.`);
