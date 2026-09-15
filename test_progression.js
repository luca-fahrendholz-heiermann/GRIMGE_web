import assert from 'node:assert/strict';
import { MageProfile, MAGE_SKILL_TREE, applyMageProfile } from './public/src/progression.js';

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

test('Skill tree remains a compact 12-node Mage vertical slice', () => {
  assert.equal(MAGE_SKILL_TREE.length, 12);
  assert.deepEqual(new Set(MAGE_SKILL_TREE.map((node) => node.branch)), new Set(['ELEMENTAL', 'DEFENSE', 'SUMMONING', 'RUNE MASTERY']));
});

console.log(`\nProgression results: ${passed} passed, ${process.exitCode ? 1 : 0} failed.`);
