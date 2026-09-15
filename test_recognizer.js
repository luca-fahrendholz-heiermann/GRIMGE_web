// Unit test for Rune Recognizer & Spell Combinations
import { recognizer } from './public/src/recognizer.js';
import { spells } from './public/src/spells.js';

console.log('🧪 Starting GRIMGE Autonomous Unit Tests...\n');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`);
    failed++;
  }
}

// 1. Test Dash / Ventus (horizontal line)
const dashStroke = [];
for (let x = 100; x <= 350; x += 10) {
  dashStroke.push({ x, y: 200 + Math.sin(x * 0.1) * 2 });
}
const resDash = recognizer.recognize([dashStroke]);
assert(resDash && resDash.rune.id === 'ventus', 'Recognize VENTUS (Horizontal Dash)');
assert(resDash?.grade === 'S', 'Clean rune gestures receive the maximum S grade');

// A deliberately uneven diagonal-ish dash is still understandable. It must
// become a weak C cast rather than being discarded as input failure.
const roughDash = [];
for (let i = 0; i <= 12; i++) roughDash.push({ x: 100 + i * 9, y: 100 + i * 3.4 + (i % 2 ? 18 : -12) });
const resRoughDash = recognizer.recognize([roughDash]);
assert(resRoughDash && resRoughDash.rune.id === 'ventus' && resRoughDash.grade === 'C', 'Forgiving recognition accepts a rough rune as a C-grade cast');
const constrainedRoughDash = recognizer.recognize([roughDash], ['terra', 'ventus']);
assert(constrainedRoughDash?.rune.id === 'ventus', 'Recognition compares a drawing only against the current hand candidates when provided');

// 2. Test Triangle / Ignis (starts bottom-left, goes to apex, down to bottom-right, closes)
const triStroke = [];
for (let t = 0; t <= 1; t += 0.05) triStroke.push({ x: 100 + t * 100, y: 300 - t * 150 });
for (let t = 0; t <= 1; t += 0.05) triStroke.push({ x: 200 + t * 100, y: 150 + t * 150 });
for (let t = 0; t <= 1; t += 0.05) triStroke.push({ x: 300 - t * 200, y: 300 });
const resTri = recognizer.recognize([triStroke]);
assert(resTri && resTri.rune.id === 'ignis', 'Recognize IGNIS (Triangle / Peak)');

// 3. Test Zig-Zag / Fulgur (Z shape)
const zStroke = [];
for (let x = 100; x <= 220; x += 10) zStroke.push({ x, y: 100 }); // Top bar
for (let t = 0; t <= 1; t += 0.05) zStroke.push({ x: 220 - t * 120, y: 100 + t * 140 }); // Diagonal
for (let x = 100; x <= 220; x += 10) zStroke.push({ x, y: 240 }); // Bottom bar
const resZ = recognizer.recognize([zStroke]);
assert(resZ && resZ.rune.id === 'fulgur', 'Recognize FULGUR (Zig-Zag)');

// 4. Test Circle / Aqua
const circleStroke = [];
for (let a = 0; a <= Math.PI * 2; a += 0.15) {
  circleStroke.push({ x: 200 + Math.cos(a) * 80, y: 200 + Math.sin(a) * 80 });
}
const resCircle = recognizer.recognize([circleStroke]);
assert(resCircle && resCircle.rune.id === 'aqua', 'Recognize AQUA (Circle)');
const roughCircle = [];
for (let a = 0; a <= Math.PI * 1.72; a += .17) {
  const wobble = 1 + Math.sin(a * 3) * .12;
  roughCircle.push({ x: 205 + Math.cos(a) * 78 * wobble, y: 195 + Math.sin(a) * 66 * wobble });
}
const resRoughCircle = recognizer.recognize([roughCircle], ['aqua']);
assert(resRoughCircle?.rune.id === 'aqua' && resRoughCircle.grade === 'C', 'A visibly intended but incomplete touch circle is accepted as a C-grade AQUA rune');

// 5. Test Square / Terra
const sqStroke = [];
for (let x = 100; x <= 200; x += 10) sqStroke.push({ x, y: 100 });
for (let y = 100; y <= 200; y += 10) sqStroke.push({ x: 200, y });
for (let x = 200; x >= 100; x -= 10) sqStroke.push({ x, y: 200 });
for (let y = 200; y >= 100; y -= 10) sqStroke.push({ x: 100, y });
const resSq = recognizer.recognize([sqStroke]);
assert(resSq && resSq.rune.id === 'terra', 'Recognize TERRA (Square)');

// BESTIA is an open three-peak claw (M), deliberately distinct from the
// horizontal reversals used by FULGUR.
const beastStroke = [];
for (let t = 0; t <= 1; t += .08) beastStroke.push({ x: 100 + t * 50, y: 250 - t * 110 });
for (let t = 0; t <= 1; t += .08) beastStroke.push({ x: 150 + t * 50, y: 140 + t * 110 });
for (let t = 0; t <= 1; t += .08) beastStroke.push({ x: 200 + t * 50, y: 250 - t * 110 });
for (let t = 0; t <= 1; t += .08) beastStroke.push({ x: 250 + t * 50, y: 140 + t * 110 });
const resBeast = recognizer.recognize([beastStroke], ['bestia']);
assert(resBeast?.rune.id === 'bestia', 'Recognize BESTIA (Three-Peak Claw)');

const constructStroke = [];
for (let y = 100; y <= 280; y += 10) constructStroke.push({ x: 200 + Math.sin(y * .08) * 2, y });
const resConstruct = recognizer.recognize([constructStroke], ['construct']);
assert(resConstruct?.rune.id === 'construct', 'Recognize KONSTRUKT (Tall Pillar)');

const voidStroke = [];
for (let a = 0; a <= Math.PI * 5; a += .16) {
  const radius = 10 + a * 7;
  voidStroke.push({ x: 210 + Math.cos(a) * radius, y: 210 + Math.sin(a) * radius });
}
const resVoid = recognizer.recognize([voidStroke], ['void']);
assert(resVoid?.rune.id === 'void', 'Recognize VOID (Open Spiral Eye)');

// 6. Test Spell Combinations
const rIgnis = recognizer.runes.find(r => r.id === 'ignis');
const rVentus = recognizer.runes.find(r => r.id === 'ventus');
const rFulgur = recognizer.runes.find(r => r.id === 'fulgur');
const rTerra = recognizer.runes.find(r => r.id === 'terra');
const rAqua = recognizer.runes.find(r => r.id === 'aqua');
const rBestia = recognizer.runes.find(r => r.id === 'bestia');
const rConstruct = recognizer.runes.find(r => r.id === 'construct');
const rVoid = recognizer.runes.find(r => r.id === 'void');

const sSingleFire = spells.resolveSpell([rIgnis]);
assert(sSingleFire && sSingleFire.id === 'fireball', 'Spell: Single Ignis -> Fireball');
const sSingleBestia = spells.resolveSpell([rBestia]);
assert(sSingleBestia?.id === 'summon_lesser_beast', 'Spell: Single Bestia -> Beast Familiar');
const sSingleConstruct = spells.resolveSpell([rConstruct]);
assert(sSingleConstruct?.id === 'construct_bulwark', 'Spell: Single Construct -> Construct Bulwark');
const sSingleVoid = spells.resolveSpell([rVoid]);
assert(sSingleVoid?.id === 'void_bolt', 'Spell: Single Void -> Void Bolt');

const sFirestorm = spells.resolveSpell([rIgnis, rVentus]);
assert(sFirestorm && sFirestorm.id === 'firestorm', 'Spell: Ignis + Ventus -> FIRESTORM VORTEX');

const sMeteor = spells.resolveSpell([rIgnis, rFulgur]);
assert(sMeteor && sMeteor.id === 'meteor_cataclysm', 'Spell: Ignis + Fulgur -> METEOR CATACLYSM');

const sTempest = spells.resolveSpell([rVentus, rFulgur]);
assert(sTempest && sTempest.id === 'tempest_blitz', 'Spell: Ventus + Fulgur -> TEMPEST BLITZ');

const sMagma = spells.resolveSpell([rIgnis, rTerra]);
assert(sMagma && sMagma.id === 'magma_fissure', 'Spell: Ignis + Terra -> MAGMA FISSURE');

const sSandstorm = spells.resolveSpell([rTerra, rVentus]);
assert(sSandstorm && sSandstorm.id === 'sandstorm_bastion', 'Spell: Terra + Ventus -> SANDSTORM BASTION');

const sBlizzard = spells.resolveSpell([rAqua, rVentus]);
assert(sBlizzard && sBlizzard.id === 'blizzard_surge', 'Spell: Aqua + Ventus -> BLIZZARD SURGE');

const sAuraShock = spells.resolveSpell([rAqua, rFulgur]);
assert(sAuraShock && sAuraShock.id === 'aura_shock', 'Spell: Aqua + Fulgur -> AURA SHOCK');

const sArcaneAegis = spells.resolveSpell([rAqua, rTerra]);
assert(sArcaneAegis && sArcaneAegis.id === 'arcane_aegis', 'Spell: Aqua + Terra -> ARCANE AEGIS');

const sEidolonMantle = spells.resolveSpell([rBestia, rTerra, rVoid]);
assert(sEidolonMantle && sEidolonMantle.id === 'eidolon_mantle', 'Spell: Bestia + Terra + Void -> EIDOLON MANTLE');

const sNinefoldBeast = spells.resolveSpell([rBestia, rIgnis, rVoid]);
assert(sNinefoldBeast && sNinefoldBeast.id === 'ninefold_beast_form', 'Spell: Bestia + Ignis + Void -> NINEFOLD BEAST FORM');

const sStoneWall = spells.resolveSpell([rTerra, rTerra]);
assert(sStoneWall && sStoneWall.id === 'stone_wall', 'Spell: Terra + Terra -> STONE WALL');

const sWolf = spells.resolveSpell([rAqua, rTerra, rVentus]);
assert(sWolf && sWolf.id === 'summon_spirit_wolf', 'Spell: Aqua + Terra + Ventus -> SPIRIT WOLF');
const sGolem = spells.resolveSpell([rFulgur, rTerra, rTerra]);
assert(sGolem && sGolem.id === 'summon_siege_golem', 'Spell: Fulgur + Terra + Terra -> SIEGE GOLEM');
const sDragon = spells.resolveSpell([rFulgur, rIgnis, rTerra]);
assert(sDragon && sDragon.id === 'dragon_invocation', 'Spell: Ignis + Terra + Fulgur -> DRAGON INVOCATION');
const sStormWolf = spells.resolveSpell([rBestia, rFulgur]);
assert(sStormWolf?.id === 'summon_storm_wolf', 'Spell: Bestia + Fulgur -> STORM WOLF');
const sRuneGolem = spells.resolveSpell([rConstruct, rTerra]);
assert(sRuneGolem?.id === 'summon_rune_golem', 'Spell: Construct + Terra -> RUNE GOLEM');
const sInfernoDragon = spells.resolveSpell([rBestia, rIgnis, rVentus]);
assert(sInfernoDragon?.id === 'dragon_invocation', 'Spell: Bestia + Ignis + Ventus -> INFERNO DRAGON');
const sVoidSpider = spells.resolveSpell([rBestia, rVoid]);
assert(sVoidSpider?.id === 'summon_void_spider', 'Spell: Bestia + Void -> VOID SPIDER');

const sGrand = spells.resolveSpell([rIgnis, rVentus, rFulgur]);
assert(sGrand && sGrand.id === 'apocalyptic_heavensurge', 'Spell: Grand 3-Rune -> APOCALYPTIC HEAVENSURGE');

const cQuality = spells.qualityForRunes([{ id: 'ignis', grade: 'C' }]);
const sQuality = spells.qualityForRunes([{ id: 'ignis', grade: 'S' }]);
assert(cQuality.power < 1 && cQuality.area < 1 && cQuality.duration < 1, 'C-grade rune casts intentionally trade power, area, and duration for leniency');
assert(sQuality.power > 1 && sQuality.area > 1 && sQuality.duration > 1, 'S-grade rune casts improve power, area, and duration');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
