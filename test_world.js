import { ARENA_LAYOUT, ENTITY_VISUALS, GroundEntity, clampToArena, groundDistance, groundYForDepth } from './public/src/world.js';

let passed = 0;
let failed = 0;
function assert(condition, name) {
  if (condition) { console.log(`  ✅ PASS: ${name}`); passed++; }
  else { console.error(`  ❌ FAIL: ${name}`); failed++; }
}

console.log('\n🧭 Starting GRIMGE 2.5D arena tests...\n');

const actor = new GroundEntity(500, 0.3);
const farY = actor.y;
actor.z = 0.8;
assert(actor.y > farY, 'Depth projects a grounded actor lower on screen');

const originalDepth = actor.z;
actor.vElevation = 580;
actor.integrateElevation(0.1);
assert(actor.elevation > 0 && actor.z === originalDepth, 'Jump elevation is independent of ground depth');

const clamped = new GroundEntity(-50, 2);
clampToArena(clamped);
assert(clamped.x === ARENA_LAYOUT.playableBounds.left && clamped.z === ARENA_LAYOUT.playableBounds.nearZ, 'Fortress and foreground bounds clamp the 2.5D plane');

const near = new GroundEntity(500, 0.72);
const sameLane = new GroundEntity(540, 0.72);
const otherDepth = new GroundEntity(540, 0.12);
assert(groundDistance(near, sameLane) < groundDistance(near, otherDepth), 'Ground distance includes depth separation');
assert(ENTITY_VISUALS.heroHeight > ENTITY_VISUALS.minionHeight, 'Hero/minion scale convention remains readable');
assert(groundYForDepth(ARENA_LAYOUT.playableBounds.nearZ) > groundYForDepth(ARENA_LAYOUT.playableBounds.farZ), 'Arena projection preserves front-to-back ordering');

console.log(`\nArena results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
