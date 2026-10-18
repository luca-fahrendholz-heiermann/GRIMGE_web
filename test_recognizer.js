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

// The former 3-rune manifests are buff-transformation special runes now
// (atlas: max. one buff per deck), so the old recipes are gone.
assert(spells.resolveSpell([rBestia, rTerra, rVoid])?.id === 'void_implosion' && spells.resolveSpell([rBestia, rIgnis, rVoid])?.id === 'inferno_rampage', 'Bestia + Terra + Void = VOID IMPLOSION, Bestia + Ignis + Void = INFERNO RAMPAGE (former transformation runes, now combinations)');
const sEidolonMantle = spells.resolveSpell([{ id: 'buff_B02' }]);
assert(sEidolonMantle && sEidolonMantle.isBuffForm && sEidolonMantle.buffFormId === 'B02', 'Buff rune B02 -> ARKENGESTELL buff transformation');

const sNinefoldBeast = spells.resolveSpell([{ id: 'buff_B01' }]);
assert(sNinefoldBeast && sNinefoldBeast.isBuffForm && sNinefoldBeast.buffFormId === 'B01', 'Buff rune B01 -> RISSWILD buff transformation');

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
const sRuneSnake = spells.resolveSpell([rBestia, rTerra, rVentus]);
assert(sRuneSnake?.id === 'summon_rune_snake', 'Spell: Bestia + Terra + Ventus -> WORLD RUNE SERPENT');

const sGrand = spells.resolveSpell([rIgnis, rVentus, rFulgur]);
assert(sGrand && sGrand.id === 'apocalyptic_heavensurge', 'Spell: Grand 3-Rune -> APOCALYPTIC HEAVENSURGE');

// ── Light / shadow runes and the solo special runes ─────────────────────
const vStroke = Array.from({ length: 30 }, (_, i) => ({ x: 100 + i * 4, y: i < 15 ? 100 + i * 9 : 100 + (29 - i) * 9 }));
const resV = recognizer.recognize([vStroke]);
assert(resV?.rune.id === 'lux' && resV.confidence >= .9, 'Recognize: downward V -> LUX');
const crescent = Array.from({ length: 30 }, (_, i) => { const a = Math.PI * .3 + i / 29 * Math.PI * 1.4; return { x: 150 + Math.cos(a) * 60, y: 150 + Math.sin(a) * 60 }; });
const resC = recognizer.recognize([crescent]);
assert(resC?.rune.id === 'umbra' && resC.confidence >= .9, 'Recognize: open crescent (C) -> UMBRA');
assert(recognizer.recognize([circleStroke])?.rune.id === 'aqua', 'Recognize: a closed circle stays AQUA next to UMBRA');
assert(recognizer.recognize([triStroke])?.rune.id === 'ignis', 'Recognize: the upward triangle stays IGNIS next to LUX');
const fig8 = Array.from({ length: 60 }, (_, i) => { const t = i / 59 * Math.PI * 2; return { x: 200 + Math.sin(t) * 90 + Math.sin(i * 1.7) * 3, y: 150 + Math.sin(t) * Math.cos(t) * 90 + Math.cos(i * 2.3) * 3 }; });
const resFig8 = recognizer.recognize([fig8]);
assert(resFig8?.rune.id === 'doppel' && resFig8.grade === 'S', 'Recognize: closed figure-eight (∞) -> DOPPEL special rune');
const star = [];
for (let k = 0; k < 5; k++) {
  const a = -Math.PI / 2 + k * Math.PI * 4 / 5; const b = -Math.PI / 2 + (k + 1) * Math.PI * 4 / 5;
  for (let s = 0; s < 10; s++) { const f = s / 10; star.push({ x: 200 + Math.cos(a) * 80 * (1 - f) + Math.cos(b) * 80 * f + Math.sin(star.length) * 4, y: 200 + Math.sin(a) * 80 * (1 - f) + Math.sin(b) * 80 * f }); }
}
star.push({ ...star[0] });
const resStar = recognizer.recognize([star]);
assert(resStar?.rune.id === 'mortis' && resStar.grade === 'S', 'Recognize: one-stroke pentagram -> MORTIS special rune');
const doubleCircle = Array.from({ length: 60 }, (_, i) => { const a = i / 59 * Math.PI * 4; return { x: 150 + Math.cos(a) * 60, y: 150 + Math.sin(a) * 60 }; });
assert(recognizer.recognize([doubleCircle])?.rune.id === 'aqua', 'Recognize: a circle drawn twice is not mistaken for MORTIS');

// LUX is now a star of four crossing lines (+ then ×).
const lineStroke = (x0, y0, x1, y1) => Array.from({ length: 12 }, (_, i) => ({ x: x0 + (x1 - x0) * i / 11 + Math.sin(i * 2.1) * 1.5, y: y0 + (y1 - y0) * i / 11 + Math.cos(i * 1.3) * 1.5 }));
const starLines = [lineStroke(100, 200, 300, 200), lineStroke(200, 100, 200, 300), lineStroke(130, 130, 270, 270), lineStroke(270, 130, 130, 270)];
const resStar4 = recognizer.recognize(starLines);
assert(resStar4?.rune.id === 'lux' && resStar4.grade === 'S', 'Recognize: four crossing lines (+ and ×) -> LUX');
assert(recognizer.recognize(starLines.slice(0, 3))?.rune.id === 'lux', 'Recognize: three crossing lines also count as LUX');
assert(recognizer.recognize([lineStroke(100, 150, 300, 150), lineStroke(100, 250, 300, 250)], ['lux', 'ventus'])?.rune.id !== 'lux', 'Recognize: two parallel lines are not a LUX star');
const { RUNE_GUIDES, guideStrokes } = await import('./public/src/rune_guides.js');
const BASE_HAND = ['ignis', 'ventus', 'fulgur', 'terra', 'aqua', 'bestia', 'construct', 'void', 'lux', 'umbra', 'doppel', 'mortis'];
const guideMisses = Object.keys(RUNE_GUIDES).filter((key) => {
  // The buff sigil resolves to whichever buff rune is in the hand.
  const id = key === 'buff_sigil' ? 'buff_T07' : key;
  const free = recognizer.recognize(guideStrokes(id, 400, 300, 150), key === 'buff_sigil' ? [...BASE_HAND, id] : null);
  const own = recognizer.recognize(guideStrokes(id, 400, 300, 110), [id]);
  return free?.rune.id !== id || own?.grade !== 'S';
});
assert(!guideMisses.length && ['lux', 'mortis', 'doppel', 'void'].every((id) => RUNE_GUIDES[id]), `Every tracing guide is itself an S-grade drawing of its rune${guideMisses.length ? ' (misses: ' + guideMisses.join(',') + ')' : ''}`);
const wobblyStar = guideStrokes('mortis', 300, 300, 100)[0].map((p, i) => ({ x: p.x + Math.sin(i * .9) * 7, y: p.y + Math.cos(i * 1.1) * 7 })).slice(0, -6);
assert(recognizer.recognize([wobblyStar], ['mortis', 'aqua', 'terra'])?.rune.id === 'mortis', 'Recognize: a wobbly, not quite closed pentagram still counts as MORTIS');

const rLux = { id: 'lux' }; const rUmbra = { id: 'umbra' };
assert(spells.resolveSpell([rTerra, rUmbra])?.id === 'shadow_stomper', 'Spell: Umbra + Terra -> SHADOW STOMPER');
assert(spells.resolveSpell([rUmbra, rAqua])?.id === 'lunar_orb', 'Spell: Umbra + Aqua -> LUNAR ORB');
assert(spells.resolveSpell([rLux, rIgnis])?.id === 'solar_orb', 'Spell: Lux + Ignis -> SOLAR ORB');
assert(spells.resolveSpell([rLux, rUmbra])?.id === 'eclipse', 'Spell: Lux + Umbra -> ECLIPSE');
assert(spells.resolveSpell([{ id: 'doppel' }])?.id === 'shadow_doppelganger' && spells.resolveSpell([{ id: 'mortis' }])?.id === 'revenant_call', 'Spell: DOPPEL / MORTIS are complete solo spells');

const cQuality = spells.qualityForRunes([{ id: 'ignis', grade: 'C' }]);
const sQuality = spells.qualityForRunes([{ id: 'ignis', grade: 'S' }]);
assert(cQuality.power < 1 && cQuality.area < 1 && cQuality.duration < 1, 'C-grade rune casts intentionally trade power, area, and duration for leniency');
assert(sQuality.power > 1 && sQuality.area > 1 && sQuality.duration > 1, 'S-grade rune casts improve power, area, and duration');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
