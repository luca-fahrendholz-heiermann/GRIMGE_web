import assert from 'node:assert/strict';
import { MageProfile, MAGE_SKILL_TREE, applyMageProfile, DEFAULT_MATCH_DECK } from './public/src/progression.js';

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

test('Mage levels unlock Bestia, Konstrukt and Void as real deck-eligible runes', () => {
  const profile = new MageProfile({ level: 1, xp: 0, skillPoints: 0, unlockedRunes: ['ignis', 'ventus', 'fulgur', 'terra', 'aqua'] });
  assert.equal(profile.isRuneUnlocked('bestia'), false);
  profile.awardXp(70);
  assert.equal(profile.level, 2);
  assert.equal(profile.isRuneUnlocked('bestia'), true);
  profile.awardXp(105);
  assert.equal(profile.level, 3);
  assert.equal(profile.isRuneUnlocked('construct'), true);
  profile.awardXp(140);
  assert.equal(profile.level, 4);
  assert.equal(profile.isRuneUnlocked('void'), true);
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

test('Skill tree is a compact 22-node Mage vertical slice (incl. multi-instance passives)', () => {
  assert.equal(MAGE_SKILL_TREE.length, 22);
  const profile = new MageProfile({ level: 9, skillPoints: 9, matchDeck: [...DEFAULT_MATCH_DECK] });
  assert.equal(profile.getModifiers().maxWalls, 1);
  for (const id of ['arcane_skin', 'barrier_mastery', 'rampart_mason', 'spirit_bond', 'empowered_summons', 'pack_leader', 'quick_draw', 'focused_casting', 'telekinetic_grip']) assert.ok(profile.unlock(id), id);
  const modifiers = profile.getModifiers();
  assert.equal(modifiers.maxWalls, 3);
  assert.equal(modifiers.extraSummons, 1);
  assert.equal(modifiers.liftTargets, 3);
  assert.deepEqual(new Set(MAGE_SKILL_TREE.map((node) => node.branch)), new Set(['ELEMENTAL', 'DEFENSE', 'SUMMONING', 'RUNE MASTERY', 'SHADOW']));
});

test('SHADOW passives add Shadow Stomper targets, doubles and revenants; light/shadow runes unlock by level', () => {
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
  for (const id of ['lux', 'umbra', 'doppel', 'mortis']) assert.ok(profile.isRuneUnlocked(id), id);
  const fresh = new MageProfile({ level: 5, matchDeck: [...DEFAULT_MATCH_DECK] });
  assert.ok(fresh.isRuneUnlocked('lux') && !fresh.isRuneUnlocked('umbra') && !fresh.isRuneUnlocked('mortis'));
});

test('A saved deck that lost a retired rune (archived Arcane State) is topped up to 10 cards', () => {
  const profile = new MageProfile({ level: 20, matchDeck: ['ignis', 'ignis', 'aqua', 'aqua', 'terra', 'terra', 'ventus', 'ventus', 'fulgur', 'buff_T26'] });
  assert.equal(profile.matchDeck.length, 10);
  assert.ok(profile.isDeckReady() && profile.deckRepaired && !profile.matchDeck.includes('buff_T26'));
});

console.log(`\nProgression results: ${passed} passed, ${process.exitCode ? 1 : 0} failed.`);
