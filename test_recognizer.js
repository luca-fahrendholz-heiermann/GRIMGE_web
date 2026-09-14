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

// 5. Test Square / Terra
const sqStroke = [];
for (let x = 100; x <= 200; x += 10) sqStroke.push({ x, y: 100 });
for (let y = 100; y <= 200; y += 10) sqStroke.push({ x: 200, y });
for (let x = 200; x >= 100; x -= 10) sqStroke.push({ x, y: 200 });
for (let y = 200; y >= 100; y -= 10) sqStroke.push({ x: 100, y });
const resSq = recognizer.recognize([sqStroke]);
assert(resSq && resSq.rune.id === 'terra', 'Recognize TERRA (Square)');

// 6. Test Spell Combinations
const rIgnis = recognizer.runes.find(r => r.id === 'ignis');
const rVentus = recognizer.runes.find(r => r.id === 'ventus');
const rFulgur = recognizer.runes.find(r => r.id === 'fulgur');
const rTerra = recognizer.runes.find(r => r.id === 'terra');
const rAqua = recognizer.runes.find(r => r.id === 'aqua');

const sSingleFire = spells.resolveSpell([rIgnis]);
assert(sSingleFire && sSingleFire.id === 'fireball', 'Spell: Single Ignis -> Fireball');

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

const sGrand = spells.resolveSpell([rIgnis, rVentus, rFulgur]);
assert(sGrand && sGrand.id === 'apocalyptic_heavensurge', 'Spell: Grand 3-Rune -> APOCALYPTIC HEAVENSURGE');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
