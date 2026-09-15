// Browserless integration smoke test for the real 2.5D module graph.
class ClassListStub { constructor() { this.values = new Set(); } add(v) { this.values.add(v); } remove(v) { this.values.delete(v); } toggle(v) { this.values.has(v) ? this.values.delete(v) : this.values.add(v); } }
function makeContext() { const gradient = { addColorStop() {} }; return new Proxy({ createRadialGradient: () => gradient, createLinearGradient: () => gradient, getImageData: () => ({ data: new Uint8ClampedArray([0,255,0,255,0,0,0,255,0,0,0,255,0,0,0,255]) }), putImageData() {} }, { get(target, prop) { return prop in target ? target[prop] : () => {}; }, set(target, prop, value) { target[prop] = value; return true; } }); }
class ElementStub { constructor(id = '') { this.id = id; this.style = {}; this.classList = new ClassListStub(); this.listeners = {}; this.attributes = {}; this.textContent = ''; this.innerHTML = ''; this.src = ''; } addEventListener(type, handler) { this.listeners[type] = handler; } getAttribute(name) { return this.attributes[name] ?? null; } setAttribute(name, value) { this.attributes[name] = value; } querySelector() { return new ElementStub(); } getBoundingClientRect() { return { left: 0, top: 0, width: 1024, height: 576 }; } }
class CanvasStub extends ElementStub { constructor(id = '') { super(id); this.width = 2; this.height = 2; this.context = makeContext(); } getContext() { return this.context; } }
const elements = new Map();
// The current triangular mobile HUD deliberately has no separate attack or
// dash buttons. Model that real DOM shape so an obsolete listener cannot hide
// behind an overly-permissive test stub and abort browser startup.
const absentElementIds = new Set(['action-attack-btn', 'action-dash-btn']);
const heroChips = ['paladin', 'berserker', 'mage', 'warlord', 'fighter'].map((hero) => { const chip = new ElementStub(); chip.setAttribute('data-hero', hero); return chip; });
globalThis.document = { getElementById(id) { if (absentElementIds.has(id)) return null; if (!elements.has(id)) elements.set(id, id.includes('canvas') ? new CanvasStub(id) : new ElementStub(id)); return elements.get(id); }, querySelectorAll(selector) { return selector === '.hero-chip' ? heroChips : []; }, createElement(tag) { return tag === 'canvas' ? new CanvasStub() : new ElementStub(); } };
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
const initialPlayer = game.player;
game.startMatch();
assert(game.player === initialPlayer && game.matchState === 'Running', 'A duplicate PLAY activation cannot reset a live match');
assert(game.canvas.width === 2048 && game.canvas.height === 1152, 'DPR-aware backing canvas preserves logical 1024x576 gameplay coordinates');
const fullViewportRect = game.canvas.getBoundingClientRect;
game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 512, height: 288 });
game.syncHudScale();
assert(game.uiLayer.style['--hud-scale'] === '0.5', 'HUD scales as one 1024×576 composition with a resized Canvas');
game.canvas.getBoundingClientRect = fullViewportRect;
game.syncHudScale();
assert(game.minions.length === 6 && game.battlefield.waveNumber === 1, 'Initial lane wave spawns coherently');
assert(game.battlefield.bgLoaded, 'Clean arena background load path completes');
assert(game.player.x === game.battlefield.getSpawn('blue').x && game.player.z === game.battlefield.getSpawn('blue').z, 'Player starts at the blue Castle spawn');
assert(new Set(game.minions.filter((minion) => minion.team === 'blue').map((minion) => minion.laneIndex)).size === 3, 'A wave populates all three authored depth lanes');
const battlementMinionProbe = game.minions[0];
const probeStart = { x: battlementMinionProbe.x, z: battlementMinionProbe.z, preferredZ: battlementMinionProbe.preferredZ };
battlementMinionProbe.x = 170; battlementMinionProbe.z = .48;
game.battlefield.resolveEntityCollision(battlementMinionProbe);
assert(battlementMinionProbe.surfaceId === 'mainArena' && battlementMinionProbe.surfaceHeight === 0, 'Lane minions remain on the ground and cannot enter upper Castle battlements');
battlementMinionProbe.x = probeStart.x; battlementMinionProbe.z = probeStart.z; battlementMinionProbe.preferredZ = probeStart.preferredZ;
game.battlefield.resolveEntityCollision(battlementMinionProbe);
const redMinionProbe = game.minions.find((minion) => minion.team === 'red');
assert(game.findMinionTarget(redMinionProbe) !== game.player, 'Minions do not target a Wizard standing on an upper Castle battlement');
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

// A rune card opens persistent Arcane Focus. Releasing a non-rune stroke
// cannot trigger the old timeout/auto-close path; another card tap commits
// or rejects and closes it without needing a separate Draw button.
const firstRuneCard = elements.get('card-0');
const runePointer = { pointerId: 77, clientX: 850, clientY: 470, preventDefault() {}, stopPropagation() {} };
firstRuneCard.listeners.pointerdown(runePointer);
assert(game.drawing.active && game.drawing.inputMode === null, 'Tapping a hand rune card opens persistent drawing mode without a Draw button');
const incompleteRuneTouch = { identifier: 77, clientX: 850, clientY: 470 };
game.canvas.listeners.touchstart({ changedTouches: [incompleteRuneTouch] });
windowListeners.touchend({ changedTouches: [incompleteRuneTouch] });
assert(game.drawing.active && game.drawing.inputMode === null, 'Releasing an unrecognized mobile stroke keeps Arcane Focus open');
firstRuneCard.listeners.pointerdown(runePointer);
assert(!game.drawing.active && game.drawing.strokes.length === 0 && game.drawing.currentStroke.length === 0 && game.timeScale === 1, 'A second rune-card press exits Arcane Focus after rejecting and clearing an unrecognized sketch');

game.player.x = 470; game.player.z = .52; game.player.elevation = 0; game.player.vElevation = 0; game.player.grounded = true; game.player.state = 'idle'; game.player.canAttack = true; game.player.invulnerableTimer = 0; game.battlefield.placeOnSurface(game.player);
game.enemyChampion.x = game.player.x + 40; game.enemyChampion.z = game.player.z; game.enemyChampion.elevation = 0; game.enemyChampion.lifeState = 'Alive'; game.battlefield.placeOnSurface(game.enemyChampion);
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
game.player.state = 'idle'; game.player.stateTimer = 0; game.player.canAttack = true; game.player.grounded = true;
assert(game.performTouchAttackGesture(0, -60) && game.player.state === 'uppercut', 'Right-side upward swipe maps to a responsive uppercut');
game.player.finishAction(); game.player.state = 'idle'; game.player.canAttack = true;
assert(game.performTouchAttackGesture(65, 0) && game.player.state === 'heavyStrike', 'Right-side horizontal swipe maps to the compact heavy lunge');
game.player.finishAction(); game.player.state = 'jump'; game.player.canAttack = true; game.player.grounded = false; game.player.elevation = 55;
assert(game.performTouchAttackGesture(0, 65) && game.player.state === 'dive', 'Airborne downward swipe maps to the existing dive strike');
game.player.finishAction(); game.player.grounded = true; game.player.elevation = 0;

const ignisCard = game.player.runeHand.find((rune) => rune.id === 'ignis');
const initialHand = game.player.runeHand.map((rune) => rune.id).join(',');
game.startRuneDrawing(ignisCard.cardId);
game.finishRuneDrawing({ rune: recognizer.runes.find((rune) => rune.id === 'ignis'), confidence: 0.99 });
assert(!game.drawing.active && game.timeScale === 1 && game.player.preparedRunes.map((rune) => rune.id).join(',') === 'ignis' && game.player.runeHand.map((rune) => rune.id).join(',') === 'fulgur,terra,ventus' && game.player.runeDeck.map((rune) => rune.id).join(',') === 'aqua,fulgur,terra,ignis,ventus,aqua,ignis', 'Drawing a hand card slots its rune, returns the card to the deck back, and draws a replacement from the selected 10-card deck');
assert(game.player.slottedSpells[0].quality.grade === 'S', 'Rune-recognition quality is retained by the concrete orbiting spell slot');
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
const slotIgnis = recognizer.runes.find((rune) => rune.id === 'ignis');
const slotAqua = recognizer.runes.find((rune) => rune.id === 'aqua');
game.slotRuneSpell(slotIgnis); game.slotRuneSpell(slotAqua);
assert(game.player.slottedSpells.length === 2 && game.player.selectedSpellIndex === 1 && game.swapSlottedSpell() && game.player.selectedSpellIndex === 0, 'Slotted spells retain an explicit selected slot and SWAP rotates it');
const selectedSpellCount = spells.activeSpells.length;
assert(game.castPreparedSpell() && game.player.slottedSpells.length === 1 && spells.activeSpells.length === selectedSpellCount + 1, 'CAST fires only the selected slotted spell and leaves other slots intact');
game.player.clearPreparedRunes();
game.slotRuneSpell(slotIgnis); game.slotRuneSpell(slotAqua);
assert(game.castGrimoireSpells() && game.player.slottedSpells.length === 0, 'Grimoire releases one random non-combo slot then clears all remaining slots');
game.player.clearPreparedRunes();
game.slotRuneSpell(slotIgnis); game.slotRuneSpell(recognizer.runes.find((rune) => rune.id === 'ventus'));
const beforeGrimoireFusion = spells.activeSpells.length;
assert(game.player.slottedSpells.length === 2 && game.player.slottedSpells.every((slot) => !slot.isCombo), 'Compatible drawn runes remain separate orbiting slots until Grimoire is used');
assert(game.castGrimoireSpells() && game.player.slottedSpells.length === 1 && game.player.slottedSpells[0].isCombo && spells.activeSpells.length === beforeGrimoireFusion, 'Grimoire fuses compatible slots into a ready combo without firing it');
assert(game.castGrimoireSpells() && game.player.slottedSpells.length === 0 && spells.activeSpells.length === beforeGrimoireFusion + 1, 'A second Grimoire press casts the Grimoire-fused combo slot');

// Every rune is independently useful. BESTIA still participates in stronger
// combinations, but a normal successful drawing must slot and cast its own
// Beast Familiar through the exact hand -> slot -> CAST path.
const bestiaCardRune = recognizer.runes.find((rune) => rune.id === 'bestia');
game.player.configureRuneDeck([bestiaCardRune, slotIgnis, slotAqua]);
const bestiaCard = game.player.runeHand.find((rune) => rune.id === 'bestia');
game.startRuneDrawing(bestiaCard.cardId);
game.finishRuneDrawing({ rune: bestiaCardRune, confidence: .94, grade: 'S' });
spells.clearRuntime();
assert(!game.drawing.active && game.player.slottedSpells[0]?.definition?.id === 'summon_lesser_beast' && game.castPreparedSpell() && spells.getSummons('blue').some((summon) => summon.definition.id === 'lesser_beast'), 'Drawing and casting BESTIA creates a Beast Familiar instead of blocking or freezing');
const battlementSummon = spells.getSummons('blue')[0];
battlementSummon.x = 198; battlementSummon.z = game.player.z; battlementSummon.surfaceHeight = game.player.surfaceHeight; battlementSummon.grounded = true;
game.enemyChampion.isDead = false; game.enemyChampion.x = 470; game.enemyChampion.z = game.player.z; game.enemyChampion.surfaceHeight = 0; game.enemyChampion.elevation = 0;
for (let i = 0; i < 12; i++) spells.update(.1, game);
assert(battlementSummon.surfaceHeight < 145 && battlementSummon.worldHeight < 145, 'A non-flying summon leaving a Castle battlement transitions down instead of hovering at platform height');
spells.clearRuntime();
game.player.clearPreparedRunes();
const constructBaseRune = recognizer.runes.find((rune) => rune.id === 'construct');
game.player.mp = game.player.maxMp;
game.slotRuneSpell(constructBaseRune);
assert(game.castPreparedSpell() && spells.activeSpells.some((spell) => spell.isStoneWall && spell.wallHeight === 66 && spell.life < 3), 'Single KONSTRUKT casts a short Construct Bulwark through the selected-slot cast path');
spells.clearRuntime();
const voidBaseRune = recognizer.runes.find((rune) => rune.id === 'void');
game.enemyChampion.isDead = false; game.enemyChampion.hp = game.enemyChampion.maxHp; game.enemyChampion.slowTimer = 0;
game.enemyChampion.x = game.player.x + 82; game.enemyChampion.z = game.player.z;
// Isolate the projectile-height rule: this target occupies the same
// battlement surface as the caster, so a valid VOID hit is not rejected as
// an intentional cross-level shot.
game.enemyChampion.surfaceHeight = game.player.surfaceHeight; game.enemyChampion.elevation = 0;
const minionDeadState = game.minions.map((minion) => minion.isDead);
game.minions.forEach((minion) => { minion.isDead = true; });
game.player.facing = 1;
game.player.mp = game.player.maxMp;
game.slotRuneSpell(voidBaseRune);
assert(game.castPreparedSpell(), 'Single VOID is castable from an orbiting selected slot');
spells.update(.12, game);
assert(game.enemyChampion.slowTimer > 0, 'Single VOID Bolt hits and slows a same-depth hostile target');
game.minions.forEach((minion, index) => { minion.isDead = minionDeadState[index]; });
spells.clearRuntime();
game.prepareDefaultRunes();

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

// Stone Wall is a deck-driven Terra + Terra defensive entity: it is not a
// button, blocks hostile bolts, and uses the same movement-obstacle hook the
// actor update path calls each frame.
spells.activeSpells = [];
const terraWallRunes = [recognizer.runes.find((rune) => rune.id === 'terra'), recognizer.runes.find((rune) => rune.id === 'terra')];
spells.cast(game.player, spells.resolveSpell(terraWallRunes), game);
const stoneWall = spells.activeSpells.find((spell) => spell.isStoneWall);
assert(stoneWall && stoneWall.blocksMovement && stoneWall.blocksProjectiles, 'Terra + Terra creates a temporary physical Stone Wall spell entity');
const wallShot = { x: stoneWall.x, z: stoneWall.z, team: 'red', life: 1, radius: 5, height: 18, facing: -1 };
game.projectiles = [wallShot];
spells.update(1 / 60, game);
assert(wallShot.life === 0, 'Stone Wall blocks an incoming hostile projectile through the active spell update path');
const wallBeforeX = stoneWall.x - 40;
game.enemyChampion.x = stoneWall.x; game.enemyChampion.z = stoneWall.z; game.enemyChampion.elevation = 0; game.battlefield.placeOnSurface(game.enemyChampion);
assert(game.resolveSpellObstacles(game.enemyChampion, wallBeforeX, stoneWall.z) && game.enemyChampion.x === wallBeforeX, 'Stone Wall rejects a hostile actor movement overlap instead of acting as visual-only scenery');
spells.activeSpells = [];
game.projectiles = [];

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

game.player.setHero('darklord');
assert(game.player.heroKey === 'darklord', 'Dark Lord is a selectable playable hero even when the optional source sprite is absent');
spells.clearRuntime();
game.player.x = 470; game.player.z = .52; game.player.facing = 1; game.battlefield.placeOnSurface(game.player);
game.enemyChampion.isDead = false; game.enemyChampion.hp = game.enemyChampion.maxHp; game.enemyChampion.x = 510; game.enemyChampion.z = .52; game.battlefield.placeOnSurface(game.enemyChampion);
const wolfRunes = ['aqua', 'terra', 'ventus'].map((id) => recognizer.runes.find((rune) => rune.id === id));
spells.cast(game.player, spells.resolveSpell(wolfRunes), game);
assert(spells.getSummons('blue').length === 1 && spells.getSummons('blue')[0].definition.id === 'spirit_wolf', 'Rune combination creates a real active Spirit Wolf summon');
const wolfTargetHp = game.enemyChampion.hp;
spells.update(1, game);
assert(game.enemyChampion.hp < wolfTargetHp, 'Spirit Wolf acquires and damages a hostile through the shared world target path');
spells.clearRuntime();
// Mounting reuses the real summoned creature rather than a separate player
// movement mode: proximity toggles the rider, input moves the summon, and a
// dead mount automatically returns control to the Wizard.
game.player.state = 'idle'; game.player.canAttack = true; game.player.vx = game.player.vz = 0;
spells.cast(game.player, spells.resolveSpell(wolfRunes), game);
const rideWolf = spells.getSummons('blue')[0];
assert(game.toggleMount() && game.player.mountedSummon === rideWolf && rideWolf.rider === game.player, 'Nearby own Spirit Wolf can be mounted through the real match input path');
const mountedStartX = rideWolf.x;
game.player.buildModifiers = { ...(game.player.buildModifiers ?? {}), mountSpeed: 1.10 };
game.input.move = { x: 1, z: 0 };
game.player.update(.1, game.input, game.battlefield, game);
spells.update(.1, game);
assert(rideWolf.x - mountedStartX > rideWolf.definition.mountSpeed * .105 && game.player.x === rideWolf.x && rideWolf.target === null, 'Mounted input uses the Spirit Bond mount-speed modifier while autonomous summon AI pauses');
rideWolf.takeDamage(rideWolf.hp);
assert(!game.player.isMounted && !rideWolf.rider, 'Mount death cleanly dismounts the Wizard without leaving stale rider state');
game.input.move = { x: 0, z: 0 };
spells.clearRuntime();
const bestia = recognizer.runes.find((rune) => rune.id === 'bestia');
const construct = recognizer.runes.find((rune) => rune.id === 'construct');
// Hunter role: a Storm Wolf deliberately selects the hostile Wizard even
// when lane minions exist as closer incidental targets.
game.enemyChampion.isDead = false; game.enemyChampion.x = game.player.x + 85; game.enemyChampion.z = game.player.z;
const stormWolfRunes = [bestia, recognizer.runes.find((rune) => rune.id === 'fulgur')];
spells.cast(game.player, spells.resolveSpell(stormWolfRunes), game);
const stormWolf = spells.getSummons('blue')[0];
spells.update(.1, game);
assert(stormWolf?.definition.id === 'storm_wolf' && stormWolf.definition.spriteKey === 'storm_wolf' && stormWolf.target === game.enemyChampion, 'Storm Wolf Hunter uses its dedicated sprite and prioritizes the hostile Wizard over the minion line');
spells.clearRuntime();
const voidRune = recognizer.runes.find((rune) => rune.id === 'void');
game.enemyChampion.slowTimer = 0; game.enemyChampion.x = game.player.x + 72; game.enemyChampion.z = game.player.z;
spells.cast(game.player, spells.resolveSpell([bestia, voidRune]), game);
const voidSpider = spells.getSummons('blue')[0];
voidSpider.attackTimer = 0;
spells.update(.4, game);
assert(voidSpider?.definition.id === 'void_spider' && voidSpider.target === game.enemyChampion && game.enemyChampion.slowTimer > 0, 'Void Spider Control summon entangles a nearby Wizard with a slowing web');
spells.clearRuntime();
// The World Rune Serpent is a ground mount and lane-control summon: it uses
// the same creature/mount path as wolves while its real attack launches a
// nearby hostile upward instead of being a decorative spell effect.
game.minions.forEach((minion) => { minion.isDead = true; });
game.enemyChampion.elevation = 0; game.enemyChampion.vElevation = 0;
game.enemyChampion.x = game.player.x + 44; game.enemyChampion.z = game.player.z;
const snakeRunes = [bestia, recognizer.runes.find((rune) => rune.id === 'terra'), recognizer.runes.find((rune) => rune.id === 'ventus')];
spells.cast(game.player, spells.resolveSpell(snakeRunes), game);
const runeSnake = spells.getSummons('blue')[0];
runeSnake.attackTimer = 0;
spells.update(.2, game);
assert(runeSnake?.definition.id === 'rune_snake' && runeSnake.definition.mountable && game.enemyChampion.vElevation > 0, 'World Rune Serpent is a mountable lane-control summon whose shared attack path launches enemies');
game.player.x = runeSnake.x; game.player.z = runeSnake.z;
assert(game.toggleMount() && game.player.mountedSummon === runeSnake, 'Nearby World Rune Serpent can be mounted through the normal mount input path');
game.player.dismount();
spells.clearRuntime();
// Vanguard role: with no defender in its nearby engagement band, the Rune
// Golem advances onto the living enemy Tower rather than idling in lane.
game.minions.forEach((minion) => { minion.isDead = true; });
game.enemyChampion.x = game.player.x + 300; game.enemyChampion.z = game.player.z;
game.battlefield.redTower.isDead = false; game.battlefield.redTower.hp = game.battlefield.redTower.maxHp;
spells.cast(game.player, spells.resolveSpell([construct, recognizer.runes.find((rune) => rune.id === 'terra')]), game);
const runeGolem = spells.getSummons('blue')[0];
spells.update(.1, game);
assert(runeGolem?.definition.id === 'rune_golem' && runeGolem.target === game.battlefield.redTower, 'Rune Golem Vanguard naturally progresses onto the enemy Tower');
spells.clearRuntime();
game.minions.forEach((minion) => { minion.isDead = false; });
const dragonRunes = ['ignis', 'terra', 'fulgur'].map((id) => recognizer.runes.find((rune) => rune.id === id));
const dragonTargetHp = game.enemyChampion.hp = game.enemyChampion.maxHp;
game.enemyChampion.x = game.player.x + 175; game.enemyChampion.z = game.player.z;
spells.cast(game.player, spells.resolveSpell(dragonRunes), game);
spells.update(.7, game);
assert(game.enemyChampion.hp < dragonTargetHp, 'Dragon Invocation resolves a strong temporary battlefield strike through normal spell targets');
spells.update(1, game);
assert(spells.activeSpells.length === 0, 'Dragon Invocation cleans itself up after its short attack run');

const spellSets = [['ventus'], ['fulgur'], ['terra'], ['aqua'], ['ignis', 'ventus'], ['ignis', 'fulgur'], ['fulgur', 'ventus'], ['ignis', 'terra'], ['aqua', 'ventus'], ['aqua', 'fulgur']];
for (const ids of spellSets) {
  spells.activeSpells = [];
  spells.cast(game.player, spells.resolveSpell(ids.map((id) => recognizer.runes.find((rune) => rune.id === id))), game);
  spells.update(0.1, game);
}
assert(true, 'All core spells update against the 2.5D actor model without exceptions');

// EIDOLON MANTLE is a combat form, not a cosmetic: its real spell path
// creates a temporary guardian state that improves melee and mitigates damage.
const eidolonRunes = ['bestia', 'terra', 'void'].map((id) => recognizer.runes.find((rune) => rune.id === id));
game.player.eidolonTimer = 0; game.player.eidolonCooldown = 0; game.player.eidolonArmor = 0; game.player.hp = game.player.maxHp; game.player.invulnerableTimer = 0; game.player.isGuarding = false; game.player.arcaneShield = 0;
spells.cast(game.player, spells.resolveSpell(eidolonRunes), game, spells.qualityForRunes(eidolonRunes));
const eidolonHp = game.player.hp;
game.player.takeDamage(100, 200, 0, .1, false, 'spell');
assert(game.player.eidolonTimer > 0 && game.player.eidolonArmor > 0 && game.player.hp > eidolonHp - 100, 'Eidolon Mantle creates a temporary protective guardian form with real mitigation');
game.player.eidolonTimer = 0; game.player.eidolonArmor = 0; game.player.eidolonPower = 1;

const ninefoldRunes = ['bestia', 'ignis', 'void'].map((id) => recognizer.runes.find((rune) => rune.id === id));
game.player.ninefoldTimer = 0; game.player.ninefoldCooldown = 0; game.player.ninefoldPower = 1;
spells.cast(game.player, spells.resolveSpell(ninefoldRunes), game, spells.qualityForRunes(ninefoldRunes));
assert(game.player.ninefoldTimer > 0 && game.player.ninefoldPower >= 1, 'Ninefold Beast Form creates a temporary aggressive rune transformation');
game.player.ninefoldTimer = 0; game.player.ninefoldPower = 1;

// Aura Shock is a rune combination: Aqua + Fulgur, mana/cooldown gated radial
// damage and 2.5D push, with no separate action button or shortcut.
spells.activeSpells = [];
game.player.x = 470; game.player.z = 0.52; game.player.elevation = 0; game.player.lifeState = 'Alive'; game.player.mp = game.player.maxMp; game.player.auraShockCooldown = 0; game.battlefield.placeOnSurface(game.player);
game.enemyChampion.isDead = false; game.enemyChampion.hp = game.enemyChampion.maxHp; game.enemyChampion.x = 505; game.enemyChampion.z = 0.62; game.enemyChampion.elevation = 0; game.battlefield.placeOnSurface(game.enemyChampion);
const auraHp = game.enemyChampion.hp;
const auraMana = game.player.mp;
const auraRunes = ['aqua', 'fulgur'].map((id) => recognizer.runes.find((rune) => rune.id === id));
game.player.preparedRunes = auraRunes;
assert(game.castPreparedSpell() && game.enemyChampion.hp < auraHp && game.player.mp === auraMana - 20 && game.enemyChampion.vz > 0, 'Aura Shock applies radial 2.5D control through the rune-combination cast path');
const auraCooldownHp = game.enemyChampion.hp;
game.player.preparedRunes = auraRunes;
assert(!game.castPreparedSpell() && game.enemyChampion.hp === auraCooldownHp, 'Aura Shock respects its cooldown instead of spamming crowd control');
game.player.clearPreparedRunes();
game.player.mp = game.player.maxMp; game.player.arcaneShieldCooldown = 0; game.player.invulnerableTimer = 0;
const shieldHp = game.player.hp;
game.player.preparedRunes = [recognizer.runes.find((rune) => rune.id === 'aqua'), recognizer.runes.find((rune) => rune.id === 'terra')];
assert(game.castPreparedSpell() && game.player.arcaneShield === 90 && game.player.mp === game.player.maxMp - 30, 'Arcane Aegis casts as an Aqua + Terra defensive rune combination');
game.player.takeDamage(40, 0, 0, 0.1);
assert(game.player.hp === shieldHp && game.player.arcaneShield === 50, 'Arcane Shield absorbs incoming damage before player health');
game.player.takeDamage(60, 0, 0, 0.1);
game.player.preparedRunes = [recognizer.runes.find((rune) => rune.id === 'aqua'), recognizer.runes.find((rune) => rune.id === 'terra')];
assert(game.player.hp === shieldHp - 10 && game.player.arcaneShield === 0 && !game.castPreparedSpell(), 'Arcane Aegis breaks cleanly and its cooldown prevents immediate recast');

game.player.arcaneShield = 0; game.player.hp = game.player.maxHp; game.player.sp = game.player.maxSp; game.player.facing = 1; game.player.state = 'idle'; game.player.grounded = true;
game.input.keys.KeyF = true;
game.player.update(1 / 60, game.input, game.battlefield, game);
const guardedHp = game.player.hp;
game.player.takeDamage(100, -200, 80, .3);
assert(game.player.isGuarding && game.player.hp === guardedHp - 22 && game.player.sp < game.player.maxSp, 'Held SHIELD creates a directional physical guard that reduces frontal damage and spends stamina');
assert(game.player.guardStability === 90, 'A blocked melee hit consumes 10 hidden guard-stability points');
for (let i = 0; i < 9; i++) game.player.takeDamage(12, -120, 0, .2);
assert(game.player.guardBreakTimer > 0 && !game.player.isGuarding && game.player.state === 'hurt', 'Guard breaks and stuns the player after 100 blocked melee stability damage');
game.input.keys.KeyF = false;
game.player.update(1 / 60, game.input, game.battlefield, game);
assert(!game.player.isGuarding, 'Releasing SHIELD lowers the physical guard');
game.player.state = 'idle'; game.player.stateTimer = 0; game.player.canAttack = true; game.player.guardBreakTimer = 0; game.player.guardStability = 100;
game.player.x = 500; game.player.z = 0.5; game.player.elevation = 0; game.player.grounded = true; game.battlefield.resolveEntityCollision(game.player);
game.player.hp = game.player.maxHp; game.player.invulnerableTimer = 0; game.player.facing = 1; game.input.keys.KeyF = true;
game.player.update(1 / 60, game.input, game.battlefield, game);
game.spawnMinionBolt(game.player.x + 12, game.player.z, -1, 'red', 20, game.player.z, game.player.worldHeight + 18);
game.updateProjectiles(0.01);
assert(game.projectiles.length === 1 && game.projectiles[0].team === 'blue' && game.projectiles[0].facing === 1 && game.player.hp === game.player.maxHp, 'Fresh physical guard perfectly reflects a hostile spell projectile without harming the player');
game.projectiles = []; game.input.keys.KeyF = false; game.player.update(1 / 60, game.input, game.battlefield, game);

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
frontLaneMinion.x = 132; frontLaneMinion.z = 0.84; frontLaneMinion.preferredZ = 0.84; frontLaneMinion.attackTimer = 0; frontLaneMinion.isDead = false; frontLaneMinion.hp = frontLaneMinion.maxHp; frontLaneMinion.target = null; frontLaneMinion.targetLockTimer = 0; frontLaneMinion.hurtTimer = 0; frontLaneMinion.freezeTimer = 0; frontLaneMinion.slowTimer = 0; frontLaneMinion.slowFactor = 1;
const beforeNaturalTowerPush = redTower.hp;
for (let i = 0; i < 160; i++) { frontLaneMinion.update(0.1, game, game.battlefield); for (let step = 0; step < 6; step++) game.updateProjectiles(1 / 60); }
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
// Upper Castle battlements intentionally allow Wizard-vs-Wizard spell duels,
// not melee.  Resolve the final kill through the same prepared-Fireball path
// a player uses at runtime.
game.enemyChampion.isDead = false; game.enemyChampion.hp = 30;
game.enemyChampion.x = redCastle.x; game.enemyChampion.z = redCastle.z; game.enemyChampion.elevation = 0; game.battlefield.placeOnSurface(game.enemyChampion);
game.player.x = 830; game.player.z = redCastle.z; game.player.elevation = 0; game.player.grounded = true; game.player.facing = 1; game.player.mp = game.player.maxMp; game.battlefield.placeOnSurface(game.player);
game.player.preparedRunes = [recognizer.runes.find((rune) => rune.id === 'ignis')];
game.castPreparedSpell();
for (let i = 0; i < 18; i++) spells.update(1 / 60, game);
game.enemyChampion.update(0.5, game, game.battlefield);
assert(game.matchState === 'Ending' && game.winnerTeam === 'blue' && game.enemyChampion.isDead, 'Prepared spell kills final Wizard on the Castle battlement and enters the controlled Victory ending');
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
