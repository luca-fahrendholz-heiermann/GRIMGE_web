// Browserless integration smoke test for the real 2.5D module graph.
class ClassListStub { constructor() { this.values = new Set(); } add(v) { this.values.add(v); } remove(v) { this.values.delete(v); } toggle(v) { this.values.has(v) ? this.values.delete(v) : this.values.add(v); } }
function makeContext() { const gradient = { addColorStop() {} }; return new Proxy({ createRadialGradient: () => gradient, createLinearGradient: () => gradient, getImageData: () => ({ data: new Uint8ClampedArray([0,255,0,255,0,0,0,255,0,0,0,255,0,0,0,255]) }), putImageData() {} }, { get(target, prop) { return prop in target ? target[prop] : () => {}; }, set(target, prop, value) { target[prop] = value; return true; } }); }
class ElementStub { constructor(id = '') { this.id = id; this.style = {}; this.classList = new ClassListStub(); this.listeners = {}; this.attributes = {}; this.textContent = ''; this.innerHTML = ''; this.src = ''; } addEventListener(type, handler) { this.listeners[type] = handler; } getAttribute(name) { return this.attributes[name] ?? null; } setAttribute(name, value) { this.attributes[name] = value; } querySelector() { return new ElementStub(); } getBoundingClientRect() { return { left: 0, top: 0, width: 1024, height: 576 }; } }
class CanvasStub extends ElementStub { constructor(id = '') { super(id); this.width = 2; this.height = 2; this.context = makeContext(); } getContext() { return this.context; } }
const elements = new Map();
const heroChips = ['paladin', 'berserker', 'mage', 'warlord', 'fighter'].map((hero) => { const chip = new ElementStub(); chip.setAttribute('data-hero', hero); return chip; });
globalThis.document = { getElementById(id) { if (!elements.has(id)) elements.set(id, id.includes('canvas') ? new CanvasStub(id) : new ElementStub(id)); return elements.get(id); }, querySelectorAll(selector) { return selector === '.hero-chip' ? heroChips : []; }, createElement(tag) { return tag === 'canvas' ? new CanvasStub() : new ElementStub(); } };
const windowListeners = {};
globalThis.window = { addEventListener(type, handler) { windowListeners[type] = handler; }, devicePixelRatio: 2 };
globalThis.Image = class { constructor() { this.width = 1024; this.height = 1024; } set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); } get src() { return this._src; } };
let nextFrame = null;
globalThis.requestAnimationFrame = (callback) => { nextFrame = callback; return 1; };

const [{ GameWorld }, { audio }, { spells }, { recognizer }, { groundYForDepth }] = await Promise.all([import('./public/src/main.js'), import('./public/src/audio.js'), import('./public/src/spells.js'), import('./public/src/recognizer.js'), import('./public/src/world.js')]);
for (const method of ['playSlash', 'playImpact', 'playJump', 'playDash', 'playRuneChime', 'playRuneSuccess', 'playRuneFail', 'playSpell', 'playTowerShot']) audio[method] = () => {};
audio.ensureContext = () => {};
let passed = 0; let failed = 0;
function assert(condition, name) { if (condition) { console.log(`  ✅ PASS: ${name}`); passed++; } else { console.error(`  ❌ FAIL: ${name}`); failed++; } }

console.log('\n🎮 Starting GRIMGE 2.5D runtime smoke test...\n');
const game = new GameWorld();
await game.init();
assert(game.matchState === 'Menu', 'Boot enters the playable Hub state');
game.startMatch();
await Promise.resolve();
assert(game.running && typeof nextFrame === 'function', 'Game loop initializes and schedules a frame');
assert(game.canvas.width === 2048 && game.canvas.height === 1152, 'DPR-aware backing canvas preserves logical 1024x576 gameplay coordinates');
assert(game.minions.length === 6 && game.battlefield.waveNumber === 1, 'Initial lane wave spawns coherently');
assert(game.battlefield.bgLoaded, 'Clean arena background load path completes');
assert(game.player.x === game.battlefield.getSpawn('blue').x && game.player.z === game.battlefield.getSpawn('blue').z, 'Player starts at the blue Castle spawn');
assert(new Set(game.minions.filter((minion) => minion.team === 'blue').map((minion) => minion.laneIndex)).size === 3, 'A wave populates all three authored depth lanes');
for (let i = 0; i < 15; i++) for (const minion of game.minions) minion.update(0.1, game, game.battlefield);
const blueLaneSpan = Math.max(...game.minions.filter((minion) => minion.team === 'blue').map((minion) => minion.z)) - Math.min(...game.minions.filter((minion) => minion.team === 'blue').map((minion) => minion.z));
assert(blueLaneSpan > 0.45, 'AI minions retain meaningful front-to-back lane separation while advancing');
game.player.x = 240; game.player.z = 0.48; game.player.elevation = 0; game.player.grounded = true;
game.battlefield.resolveEntityCollision(game.player);
assert(game.player.surfaceId === 'blueCastleAccessRamp' && game.player.surfaceHeight > 0 && game.player.surfaceHeight < 145, 'Upper Castle access transitions smoothly between battlement and arena heights');
game.player.x = 300; game.battlefield.resolveEntityCollision(game.player);
assert(game.player.surfaceId === 'mainArena' && game.player.surfaceHeight === 0, 'Player can naturally descend from Castle platform to main arena');
game.player.x = 260; game.player.z = 0.48; game.player.grounded = true; game.player.elevation = 0; game.battlefield.resolveEntityCollision(game.player);
assert(game.player.surfaceId === 'blueCastleAccessRamp' && game.player.surfaceHeight > 0, 'Player can approach the upper Castle battlement through its authored access');
game.player.x = 170; game.battlefield.resolveEntityCollision(game.player);
assert(game.player.surfaceId === 'blueCastleUpperPlatform' && game.player.surfaceHeight === 145, 'Access reaches the elevated upper Castle battlement');
game.player.z = 0.83; game.player.grounded = true; game.player.elevation = 0; game.battlefield.resolveEntityCollision(game.player);
assert(game.player.surfaceId === 'mainArena' && !game.player.grounded && game.player.elevation > 130, 'Leaving an upper Castle edge preserves height for a readable fall');
game.player.x = game.battlefield.getSpawn('blue').x; game.player.z = game.battlefield.getSpawn('blue').z; game.battlefield.placeOnSurface(game.player);

const startX = game.player.x;
game.input.move = { x: 1, z: 0 };
game.player.update(0.1, game.input, game.battlefield);
assert(game.player.x > startX, 'Horizontal movement advances the player');
const startZ = game.player.z;
const startElevation = game.player.elevation;
game.input.move = { x: 0, z: 1 };
game.player.update(0.1, game.input, game.battlefield);
assert(game.player.z > startZ && game.player.elevation === startElevation, 'Depth movement changes z without changing elevation');
assert(game.player.y === groundYForDepth(game.player.z) - game.player.surfaceHeight, 'Grounded actor uses projected depth position plus surface height');
assert(game.player.surfaceId === 'blueCastleUpperPlatform' && game.player.surfaceHeight > 0, 'Player starts on an upper Castle battlement');

game.player.state = 'idle'; game.player.sp = game.player.maxSp; game.input.move = { x: 0, z: 1 }; game.input.justPressedKeys.ShiftLeft = true;
game.player.update(1 / 60, game.input, game.battlefield);
game.input.justPressedKeys = {}; game.input.move = { x: 0, z: 0 };
assert(game.player.state === 'dash' && game.player.vz > 0.5 && Math.abs(game.player.vx) < 1, 'Dash follows the meaningful 2.5D movement direction');
game.player.state = 'idle'; game.player.vx = game.player.vz = 0; game.player.canAttack = true;

game.input.move = { x: 0, z: 0 };
const preJumpZ = game.player.z;
game.input.justPressedKeys.Space = true;
game.player.update(1 / 60, game.input, game.battlefield);
game.input.justPressedKeys = {};
assert(game.player.elevation > 0 && game.player.z === preJumpZ, 'Jump changes elevation without corrupting depth');

// The mobile circle opens a persistent rune mode. Releasing the circle (or
// a non-rune canvas stroke) cannot trigger the old timeout/auto-close path.
const arcaneCircle = elements.get('arcane-circle-trigger');
const runePointer = { pointerId: 77, clientX: 850, clientY: 470, preventDefault() {}, stopPropagation() {} };
arcaneCircle.listeners.pointerdown(runePointer);
assert(game.drawing.active && game.drawing.inputMode === null, 'Mobile arcane circle opens persistent drawing mode without a countdown');
const incompleteRuneTouch = { identifier: 77, clientX: 850, clientY: 470 };
game.canvas.listeners.touchstart({ changedTouches: [incompleteRuneTouch] });
windowListeners.touchend({ changedTouches: [incompleteRuneTouch] });
assert(game.drawing.active && game.drawing.inputMode === null, 'Releasing an unrecognized mobile stroke keeps Arcane Focus open');
arcaneCircle.listeners.pointerdown(runePointer);
assert(game.drawing.active, 'A second mobile circle press explicitly attempts rune lock-in without auto-closing a failed gesture');
game.cancelRuneDrawing();
assert(!game.drawing.active && game.timeScale === 1, 'Escape/cancel path cleanly exits persistent drawing mode');

game.player.elevation = 0; game.player.vElevation = 0; game.player.grounded = true; game.player.state = 'idle'; game.player.canAttack = true; game.player.invulnerableTimer = 0;
game.enemyChampion.x = game.player.x + 40; game.enemyChampion.z = game.player.z;
const enemyHp = game.enemyChampion.hp;
game.player.executeAttack(game.input);
assert(game.enemyChampion.hp < enemyHp, 'Melee hitbox damages a target in the same depth lane');
game.player.state = 'idle'; game.player.stateTimer = 0; game.player.canAttack = true;
game.enemyChampion.elevation = game.player.elevation + 160;
const highTargetHp = game.enemyChampion.hp;
game.player.executeAttack(game.input);
assert(game.enemyChampion.hp === highTargetHp, 'Melee rejects a character outside its vertical reach');
game.enemyChampion.elevation = 0;
let recoveredAttacks = 0;
for (let i = 0; i < 20; i++) { game.player.state = 'idle'; game.player.stateTimer = 0; game.player.canAttack = true; if (game.player.executeAttack(game.input)) recoveredAttacks++; game.player.update(0.5, game.input, game.battlefield); }
assert(recoveredAttacks === 20 && game.player.canAttack, 'Repeated melee actions always recover to an attack-ready state');

const ignisCard = game.player.runeHand.find((rune) => rune.id === 'ignis');
const initialHand = game.player.runeHand.map((rune) => rune.id).join(',');
game.startRuneDrawing(ignisCard.cardId);
game.finishRuneDrawing({ rune: recognizer.runes.find((rune) => rune.id === 'ignis'), confidence: 0.99 });
assert(!game.drawing.active && game.timeScale === 1 && game.player.preparedRunes.map((rune) => rune.id).join(',') === 'ignis' && game.player.runeHand.map((rune) => rune.id).join(',') === 'fulgur,terra,ventus' && game.player.runeDeck.map((rune) => rune.id).join(',') === 'aqua,ignis,ignis', 'Drawing a hand card slots its rune, returns the card to the deck back, and draws a replacement');
const spellCount = spells.activeSpells.length;
game.castPreparedSpell();
assert(spells.activeSpells.length > spellCount && game.player.preparedRunes.length === 0 && game.player.runeHand.map((rune) => rune.id).join(',') === 'fulgur,terra,ventus' && initialHand === 'fulgur,terra,ignis', 'Casting consumes slotted spell components without cycling untouched hand cards');
const handBeforeMismatch = game.player.runeHand.map((rune) => rune.cardId).join(',');
const fulgurCard = game.player.runeHand.find((rune) => rune.id === 'fulgur');
game.startRuneDrawing(fulgurCard.cardId);
game.drawing.strokes = [[...Array.from({ length: 26 }, (_, index) => ({ x: 100 + index * 10, y: 200 + Math.sin((100 + index * 10) * .1) * 2 }))]];
game.confirmRuneDrawing();
assert(game.drawing.active && game.player.runeHand.map((rune) => rune.cardId).join(',') === handBeforeMismatch, 'Recognized gestures are rejected when they do not match the selected hand card');
game.cancelRuneDrawing();
const ventusCard = game.player.runeHand.find((rune) => rune.id === 'ventus');
game.startRuneDrawing(ventusCard.cardId);
game.drawing.strokes = [[...Array.from({ length: 26 }, (_, index) => ({ x: 100 + index * 10, y: 200 + Math.sin((100 + index * 10) * .1) * 2 }))]];
game.drawing.lastStrokeTime = performance.now() - 2001;
game.drawing.autoLockArmed = true;
game.loop(game.lastFrameTime + 16);
assert(!game.drawing.active && game.player.preparedRunes.length === 1 && game.player.preparedRunes[0].id === 'ventus', 'A paused rune stroke automatically locks in after two seconds');
game.player.clearPreparedRunes();

game.player.invulnerableTimer = 0;
game.player.takeDamage(999, 0, 0, 0.1);
assert(game.player.lifeState === 'Dying', 'Lethal damage enters an authoritative player death state');
const spellsBeforeDeath = spells.activeSpells.length;
assert(!game.player.executeAttack(game.input) && !game.castPreparedSpell() && !game.drawing.active, 'Dead or dying player cannot attack, cast, or start rune drawing');
assert(spells.activeSpells.length === spellsBeforeDeath, 'Death input lock prevents new spell instances');
game.player.update(0.5, game.input, game.battlefield);
game.player.update(3.1, game.input, game.battlefield);
assert(game.player.isAlive && game.player.hp === game.player.maxHp && game.player.canAttack && game.player.elevation === 0 && game.player.surfaceId === 'blueCastleUpperPlatform', 'Respawn restores a clean valid upper-Castle state');

spells.activeSpells = [];
const terra = recognizer.runes.find((rune) => rune.id === 'terra');
const ventus = recognizer.runes.find((rune) => rune.id === 'ventus');
spells.cast(game.player, spells.resolveSpell([terra, ventus]), game);
const hostileShot = { x: game.player.x + 10, z: game.player.z, team: 'red', life: 1 };
game.projectiles.push(hostileShot);
spells.update(1 / 60, game);
assert(hostileShot.life === 0, 'Sandstorm Bastion blocks hostile shots on its depth lane');

spells.activeSpells = [];
const ignis = recognizer.runes.find((rune) => rune.id === 'ignis');
game.enemyChampion.isDead = false; game.enemyChampion.hp = game.enemyChampion.maxHp;
game.enemyChampion.x = game.player.x + 90; game.enemyChampion.z = game.player.z - 0.5;
const crossLaneHp = game.enemyChampion.hp;
spells.cast(game.player, spells.resolveSpell([ignis]), game);
spells.update(0.05, game);
assert(game.enemyChampion.hp === crossLaneHp, 'Ground projectile ignores an enemy on a different depth lane');
spells.activeSpells = [];
game.enemyChampion.z = game.player.z;
spells.cast(game.player, spells.resolveSpell([ignis]), game);
spells.update(0.05, game);
assert(game.enemyChampion.hp < crossLaneHp, 'Ground projectile hits an enemy on the same depth lane');

const spellSets = [['ventus'], ['fulgur'], ['terra'], ['aqua'], ['ignis', 'ventus'], ['ignis', 'fulgur'], ['fulgur', 'ventus'], ['ignis', 'terra'], ['aqua', 'ventus']];
for (const ids of spellSets) {
  spells.activeSpells = [];
  spells.cast(game.player, spells.resolveSpell(ids.map((id) => recognizer.runes.find((rune) => rune.id === id))), game);
  spells.update(0.1, game);
}
assert(true, 'All core spells update against the 2.5D actor model without exceptions');

// Aura Shock is a real runtime ability: mana/cooldown gated radial damage and
// 2.5D push, with no effect on protected structures.
spells.activeSpells = [];
game.player.x = 470; game.player.z = 0.52; game.player.elevation = 0; game.player.lifeState = 'Alive'; game.player.mp = game.player.maxMp; game.player.auraShockCooldown = 0; game.battlefield.placeOnSurface(game.player);
game.enemyChampion.isDead = false; game.enemyChampion.hp = game.enemyChampion.maxHp; game.enemyChampion.x = 505; game.enemyChampion.z = 0.62; game.enemyChampion.elevation = 0; game.battlefield.placeOnSurface(game.enemyChampion);
const auraHp = game.enemyChampion.hp;
const auraMana = game.player.mp;
assert(game.castAuraShock() && game.enemyChampion.hp < auraHp && game.player.mp === auraMana - 20 && game.enemyChampion.vz > 0, 'Aura Shock applies radial 2.5D control through the player ability path');
const auraCooldownHp = game.enemyChampion.hp;
assert(!game.castAuraShock() && game.enemyChampion.hp === auraCooldownHp, 'Aura Shock respects its cooldown instead of spamming crowd control');
game.player.mp = game.player.maxMp; game.player.arcaneShieldCooldown = 0; game.player.invulnerableTimer = 0;
const shieldHp = game.player.hp;
assert(game.castArcaneShield() && game.player.arcaneShield === 90 && game.player.mp === game.player.maxMp - 30, 'Arcane Shield casts through the player ability path with mana cost');
game.player.takeDamage(40, 0, 0, 0.1);
assert(game.player.hp === shieldHp && game.player.arcaneShield === 50, 'Arcane Shield absorbs incoming damage before player health');
game.player.takeDamage(60, 0, 0, 0.1);
assert(game.player.hp === shieldHp - 10 && game.player.arcaneShield === 0 && !game.castArcaneShield(), 'Shield breaks cleanly and its cooldown prevents immediate recast');

// Objective progression is authoritative: tower -> Castle -> final Wizard.
game.enemyChampion.isDead = false; game.enemyChampion.hp = game.enemyChampion.maxHp;
game.enemyChampion.takeDamage(999, 0, 0, 0.1);
game.enemyChampion.update(0.5, game, game.battlefield);
game.enemyChampion.update(3.1, game, game.battlefield);
assert(game.enemyChampion.isAlive && game.enemyChampion.x === game.battlefield.getSpawn('red').x, 'Wizard respawns at its Castle while the Castle stands');

const redTower = game.battlefield.redTower;
const redCastle = game.battlefield.redCastle;
const laneMinion = game.minions.find((minion) => minion.team === 'blue' && minion.type === 'melee');
const frontLaneMinion = game.minions.find((minion) => minion.team === 'blue' && minion.laneIndex === 2);
const protectedHp = redCastle.hp;
redCastle.takeDamage(100);
assert(redCastle.hp === protectedHp && !redCastle.isVulnerable, 'Castle rejects damage before its lane tower falls');

game.minions.forEach((minion) => { minion.isDead = true; });
game.player.x = redTower.x - 40; game.player.z = redTower.z; game.player.elevation = 0; game.player.grounded = true; game.battlefield.resolveEntityCollision(game.player);
redTower.isDead = false; redTower.hp = redTower.maxHp; redTower.shootTimer = 0; game.projectiles = []; redTower.update(0.1, game);
assert(redTower.currentTarget === game.player, 'Tower selects a hostile mobile Wizard in local range');
assert(game.projectiles.length === 1, 'Tower fires at a valid hostile mobile Wizard');
game.projectiles = []; game.player.lifeState = 'Dead'; laneMinion.isDead = false; laneMinion.x = redTower.x - 30; laneMinion.z = redTower.z;
redTower.shootTimer = 0; redTower.update(2, game);
assert(redTower.currentTarget === laneMinion && game.projectiles.length === 1, 'Tower targets a hostile mobile minion in local range');
game.projectiles = []; laneMinion.isDead = true;
redTower.shootTimer = 0; redTower.update(2, game);
assert(redTower.currentTarget === null && game.projectiles.length === 0, 'Tower remains idle when only hostile structures are available');
game.player.lifeState = 'Alive'; game.player.hp = game.player.maxHp;

// This helper uses the same mouse-input -> Player.update -> melee hitbox
// path as actual play. It never invokes an objective's takeDamage directly.
function playerMeleeObjective(target, maximumStrikes = 1) {
  let strikes = 0;
  while (!target.isDead && !target.isDestroyed && strikes < maximumStrikes) {
    game.player.x = target.x - Math.min(44, (target.hitRadiusX ?? 50) - 5);
    game.player.z = target.z;
    game.player.elevation = 0; game.player.vElevation = 0; game.player.grounded = true;
    game.player.state = 'idle'; game.player.stateTimer = 0; game.player.canAttack = true; game.player.facing = 1;
    game.player.vx = game.player.vz = 0;
    game.battlefield.placeOnSurface(game.player);
    game.input.justPressedMouse[0] = true;
    game.player.update(1 / 60, game.input, game.battlefield, game);
    game.input.justPressedMouse = {};
    strikes++;
  }
  return strikes;
}

laneMinion.isDead = false;
game.minions = [laneMinion, frontLaneMinion];
game.enemyChampion.isDead = true;
const playerTowerHp = redTower.hp;
playerMeleeObjective(redTower);
assert(redTower.hp < playerTowerHp, 'Real player input -> update -> melee hitbox damages the lane tower objective');
game.player.x = redTower.x - 180; game.player.z = redTower.z; game.player.facing = 1; game.player.elevation = 0; game.battlefield.placeOnSurface(game.player);
game.player.preparedRunes = [recognizer.runes.find((rune) => rune.id === 'ignis')];
const spellTowerHp = redTower.hp;
game.castPreparedSpell();
for (let i = 0; i < 28; i++) spells.update(1 / 60, game);
assert(redTower.hp < spellTowerHp, 'Prepared Fireball cast follows the runtime spell path and damages Tower');
laneMinion.x = redTower.x - 24; laneMinion.z = redTower.z; laneMinion.attackTimer = 0;
const towerHp = redTower.hp;
laneMinion.update(0.1, game, game.battlefield);
assert(redTower.hp < towerHp, 'Minion can attack the enemy lane tower');

// A front-lane minion begins at its real lane depth and must steer into the
// Tower's attack band rather than being teleported next to the objective.
frontLaneMinion.x = 132; frontLaneMinion.z = 0.84; frontLaneMinion.preferredZ = 0.84; frontLaneMinion.attackTimer = 0; frontLaneMinion.isDead = false;
const beforeNaturalTowerPush = redTower.hp;
for (let i = 0; i < 120; i++) { frontLaneMinion.update(0.1, game, game.battlefield); game.updateProjectiles(0.1); }
assert(frontLaneMinion.z < 0.55 && redTower.hp < beforeNaturalTowerPush, 'Front-lane minion naturally steers to and damages the rear Tower');

playerMeleeObjective(redTower, 30);
assert(redTower.isDead && redCastle.isVulnerable && game.matchPhase === 'CastlePhase', 'Repeated real player melee destroys Tower and unlocks Castle');
game.projectiles = []; redTower.shootTimer = 0; redTower.update(1, game);
assert(game.projectiles.length === 0, 'Destroyed Tower stops applying defensive pressure');
// With the Tower gone, the same real minion AI continues toward the Castle.
frontLaneMinion.attackTimer = 0;
const castleHp = redCastle.hp;
for (let i = 0; i < 130; i++) { frontLaneMinion.update(0.1, game, game.battlefield); game.updateProjectiles(0.1); }
assert(redCastle.hp < castleHp, 'AI-controlled minion naturally progresses from Tower to vulnerable Castle');

playerMeleeObjective(redCastle, 60);
assert(redCastle.isDestroyed && !game.canRespawn('red') && game.matchPhase === 'FinalWizardPhase', 'Repeated real player melee destroys Castle and disables respawn');
game.enemyChampion.isDead = false; game.enemyChampion.hp = game.enemyChampion.maxHp;
game.enemyChampion.x = redCastle.x; game.enemyChampion.z = redCastle.z; game.enemyChampion.elevation = 0; game.battlefield.placeOnSurface(game.enemyChampion);
playerMeleeObjective(game.enemyChampion, 12);
game.enemyChampion.update(0.5, game, game.battlefield);
assert(game.matchState === 'Ending' && game.winnerTeam === 'blue' && game.enemyChampion.isDead, 'Real player melee kills final Wizard and enters the controlled Victory ending');
const endingMatchTime = game.matchTime;
for (let i = 1; i <= 12; i++) game.loop(game.lastFrameTime + 100);
assert(game.matchState === 'Results' && game.matchTime === endingMatchTime, 'Ending advances to Results while the final match time remains frozen');
game.startMatch();
assert(game.matchState === 'Running' && game.winnerTeam === null && !game.battlefield.redTower.isDead && !game.battlefield.redCastle.isVulnerable && game.projectiles.length === 0 && game.player.surfaceId === 'blueCastleUpperPlatform', 'Rematch reconstructs a clean running match without a page refresh');
game.returnToHub();
assert(game.matchState === 'Menu', 'Return to Hub exits the match without reloading the page');
game.startMatch();
assert(game.matchState === 'Running' && game.objectivePhase === 'LanePhase', 'A new match can start cleanly after returning to Hub');

const frameCallback = nextFrame;
frameCallback(game.lastFrameTime + 16);
game.debugVisible = true;
game.render();
assert(typeof nextFrame === 'function', 'Complete 2.5D update/render frame schedules a successor');
game.running = false;
console.log(`\nRuntime results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
