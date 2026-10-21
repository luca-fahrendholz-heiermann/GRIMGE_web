// Browserless integration smoke test for the real 2.5D module graph.
class ClassListStub { constructor() { this.values = new Set(); } add(v) { this.values.add(v); } remove(v) { this.values.delete(v); } toggle(v, force) { if (force === true) { this.values.add(v); return true; } if (force === false) { this.values.delete(v); return false; } if (this.values.has(v)) { this.values.delete(v); return false; } this.values.add(v); return true; } }
function makeContext() { const gradient = { addColorStop() {} }; return new Proxy({ createRadialGradient: () => gradient, createLinearGradient: () => gradient, getImageData: () => ({ data: new Uint8ClampedArray([0,255,0,255,0,0,0,255,0,0,0,255,0,0,0,255]) }), putImageData() {} }, { get(target, prop) { return prop in target ? target[prop] : () => {}; }, set(target, prop, value) { target[prop] = value; return true; } }); }
class ElementStub { constructor(id = '') { this.id = id; this.style = {}; this.classList = new ClassListStub(); this.listeners = {}; this.attributes = {}; this.textContent = ''; this.innerHTML = ''; this.src = ''; } addEventListener(type, handler) { this.listeners[type] = handler; } getAttribute(name) { return this.attributes[name] ?? null; } setAttribute(name, value) { this.attributes[name] = value; } querySelector() { return new ElementStub(); } getBoundingClientRect() { return { left: 0, top: 0, width: 1024, height: 576 }; } }
class CanvasStub extends ElementStub { constructor(id = '') { super(id); this.width = 2; this.height = 2; this.context = makeContext(); } getContext() { return this.context; } }
const elements = new Map();
// The current triangular mobile HUD deliberately has no separate attack or
// dash buttons. Model that real DOM shape so an obsolete listener cannot hide
// behind an overly-permissive test stub and abort browser startup.
const absentElementIds = new Set(['action-attack-btn', 'action-dash-btn', 'action-swap-btn']);
const heroChips = ['paladin', 'berserker', 'mage', 'warlord', 'fighter'].map((hero) => { const chip = new ElementStub(); chip.setAttribute('data-hero', hero); return chip; });
globalThis.document = { body: new ElementStub('body'), getElementById(id) { if (absentElementIds.has(id)) return null; if (!elements.has(id)) elements.set(id, id.includes('canvas') ? new CanvasStub(id) : new ElementStub(id)); return elements.get(id); }, querySelectorAll(selector) { return selector === '.hero-chip' ? heroChips : []; }, createElement(tag) { return tag === 'canvas' ? new CanvasStub() : new ElementStub(); } };
const windowListeners = {};
globalThis.window = { addEventListener(type, handler) { windowListeners[type] = handler; }, devicePixelRatio: 2 };
globalThis.Image = class { constructor() { this.width = 1024; this.height = 1024; } set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); } get src() { return this._src; } };
let nextFrame = null;
globalThis.requestAnimationFrame = (callback) => { nextFrame = callback; return 1; };

const [{ GameWorld }, { audio }, { spells }, { recognizer }, { groundYForDepth }, { ui }] = await Promise.all([import('./public/src/main.js'), import('./public/src/audio.js'), import('./public/src/spells.js'), import('./public/src/recognizer.js'), import('./public/src/world.js'), import('./public/src/ui.js')]);
for (const method of ['playSlash', 'playImpact', 'playJump', 'playDash', 'playRuneChime', 'playRuneSuccess', 'playRuneFail', 'playSpell', 'playTowerShot']) audio[method] = () => {};
audio.ensureContext = () => {};
// Status effects are chance-based; tests force the roll explicitly (default: never).
const STATUS = await import('./public/src/status_effects.js');
STATUS.setStatusRandom(() => 1);
let passed = 0; let failed = 0;
function assert(condition, name) { if (condition) { console.log(`  ✅ PASS: ${name}`); passed++; } else { console.error(`  ❌ FAIL: ${name}`); failed++; } }

console.log('\n🎮 Starting GRIMGE 2.5D runtime smoke test...\n');
const game = new GameWorld();
await game.init();
// Most tests place the Wizard freely on the Siege lane; the platform ↔ lane
// match rules get their own block (they are on by default in the game).
game.siegeDeployRules = false;
// Legacy tests expect T to be Focus Ascendant: no Primal unless a block picks one.
ui.selectedCompanion = 'none';
assert(game.matchState === 'Menu', 'Boot enters the playable Hub state');
ui.setHubHero('astral');
assert(ui.getSelectedHero() === 'astral' && game.player.heroKey === 'astral' && game.sprites.sprites.astral && game.sprites.sprites.astral_v2, 'Astral hooded and unhooded variants are loaded selectable gameplay heroes');
ui.setHubHero('darklord');
assert(ui.getSelectedHero() === 'darklord' && game.player.heroKey === 'darklord', 'Hub hero selection updates the current loadout preview before a match starts');
game.startMatch();
await Promise.resolve();
assert(game.running && typeof nextFrame === 'function', 'Game loop initializes and schedules a frame');
window.innerWidth = 390; window.innerHeight = 844;
game.syncOrientationState();
assert(game.orientationBlocked && document.body.classList.values.has('portrait-gameplay'), 'Portrait blocks live gameplay and activates the full-screen rotate state');
window.innerWidth = 844; window.innerHeight = 390;
game.syncOrientationState();
assert(!game.orientationBlocked && !document.body.classList.values.has('portrait-gameplay'), 'Landscape resumes the preserved match after device rotation');
const initialPlayer = game.player;
game.startMatch();
assert(game.player === initialPlayer && game.matchState === 'Running', 'A duplicate PLAY activation cannot reset a live match');
assert(game.canvas.width === 2048 && game.canvas.height === 1152, 'DPR-aware backing canvas preserves logical 1024x576 gameplay coordinates');
const menuButton = elements.get('game-menu-btn');
const menuModal = elements.get('game-menu-modal');
menuButton.listeners.pointerdown({ preventDefault() {}, stopPropagation() {} });
assert(game.menuPaused && !menuModal.classList.values.has('hidden'), 'Match menu opens from the HUD button and pauses the live match');
menuModal.listeners.pointerdown({ target: menuModal });
assert(!game.menuPaused && menuModal.classList.values.has('hidden'), 'Tapping beside the match-menu panel closes it and resumes the match');
// One fixed 16:9 stage on every device: scene, camera and HUD scale together.
const stageHost = elements.get('game-container');
const screenSize = (w, h) => { stageHost.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h }); game.updateViewport(); };
screenSize(512, 288);
assert(game.uiLayer.style['--hud-scale'] === '0.5' && game.stage.width === 512 && game.stage.height === 288, 'HUD and scene scale together as one 1024×576 stage');
screenSize(1248, 576);
assert(game.renderWidth === 1024 && game.renderHeight === 576 && game.worldOffsetY === 0 && game.cameraOffsetX === 0 && game.stage.left === 112 && game.canvas.style.left === '112px' && game.canvas.style.width === '1024px', 'A 19.5:9 screen shows exactly the same 16:9 stage, centred between side bars (no copied edges, no crop)');
assert(game.uiLayer.style.left === '112px' && game.uiLayer.style.width === '1024px' && game.runeCanvas.style.left === '112px', 'HUD and rune layer sit on the same stage as the scene');
const savedCanvasRect = game.canvas.getBoundingClientRect;
game.canvas.getBoundingClientRect = () => ({ left: 112, top: 0, width: 1024, height: 576 });
assert(game.getCanvasCoords(624, 288).x === 512 && game.getCanvasCoords(624, 288).y === 288, 'Input coordinates map through the centred stage');
game.canvas.getBoundingClientRect = savedCanvasRect;
screenSize(1024, 576);
// Option FILL: wide screens zoom to full width (a little sky/foreground cut),
// the HUD covers the visible screen; narrower screens still fit.
elements.get('screen-fit-btn').listeners.pointerdown({ preventDefault() {}, stopPropagation() {} });
screenSize(1248, 576);
assert(game.screenFit === 'fill' && game.stage.width === 1248 && game.stage.left === 0 && game.stage.top < 0 && game.hud.left === 0 && game.hud.width === 1024 && game.hud.height === 473 && game.uiLayer.style.left === '0px' && elements.get('screen-fit-btn').textContent.includes('FILL'), 'Screen option FILL zooms a 19.5:9 screen to full width; the HUD sits on the visible screen');
assert(Math.round(game.canvasToHud({ x: 512, y: 288 }).y) === Math.round(288 + game.stage.top / game.stage.scale), 'Canvas points convert into HUD coordinates for the dynamic joystick');
screenSize(1024, 768);
assert(game.stage.top === 96 && game.stage.width === 1024, 'FILL never crops the field on screens narrower than 16:9');
elements.get('screen-fit-btn').listeners.pointerdown({ preventDefault() {}, stopPropagation() {} });
assert(game.screenFit === 'fit' && elements.get('screen-fit-btn').textContent.includes('FIT'), 'The menu toggles back to FIT (same view everywhere)');
screenSize(1024, 576);
assert(game.minions.length === 6 && game.battlefield.waveNumber === 1, 'Initial lane wave spawns coherently');
assert(game.battlefield.bgLoaded, 'Clean arena background load path completes');
assert(['arena', 'dungeon', 'invasion'].every((world) => game.battlefield.modeBackdropImages[world]?.loaded), 'Alternate combat modes load authored scene backdrops instead of the debug-grid fallback');
assert(game.player.x === game.battlefield.getSpawn('blue').x && game.player.z === game.battlefield.getSpawn('blue').z, 'Player starts at the blue Castle spawn');
assert(game.player.heroKey === 'darklord', 'A selected Hub hero carries into the reconstructed match without changing gameplay geometry');
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

game.player.state = 'idle'; game.player.sp = game.player.maxSp; game.player.facing = 1;
game.player._prevInputDir = 0; game.player._lastFlickDir = 0; game.player._lastFlickTime = 0;
game.input.move = { x: 1, z: 0 };
game.player.update(1 / 60, game.input, game.battlefield);
game.input.move = { x: 0, z: 0 };
game.player.update(1 / 60, game.input, game.battlefield);
game.player._lastFlickTime = performance.now() * 0.001;
game.input.move = { x: -1, z: 0 };
game.player.update(1 / 60, game.input, game.battlefield);
game.input.move = { x: 0, z: 0 };
assert(game.player.state === 'dash' && game.player.backdashTimer > 0, 'Backdash triggers on forward-then-backward flick reversal');
game.player.backdashTimer = 0; game.player.state = 'idle'; game.player.vx = game.player.vz = 0; game.player.canAttack = true; game.player.stateTimer = 0;

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
assert(game.targetTimeScale === 1, 'Drawing runes does not slow the world down (multiplayer-safe)');
assert(game.runeGuide()?.name && game.runeGuide().name === game.player.getRuneCard(game.drawing.expectedCardId)?.name, 'The tapped rune card shows its name above the drawing template');
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
game.player.focus = 90;
game.player.gainFocus(10, 'TEST');
assert(game.player.focus === 100 && game.activateFocusTransformation() && game.player.focusTransformTimer > 0, 'Melee/rune Focus can fill and activate the earned Ascendant transformation');
const ascendantHp = game.player.hp;
game.player.takeDamage(20, 100, 0, .1);
assert(game.player.hp > ascendantHp - 20, 'Focus Ascendant supplies temporary damage resistance through the shared damage path');
game.player.focusTransformTimer = 0; game.player.focusTransformPower = 1; game.player.hp = game.player.maxHp;
game.player.state = 'idle'; game.player.stateTimer = 0; game.player.canAttack = true;
game.enemyChampion.elevation = game.player.elevation + 160;
const highTargetHp = game.enemyChampion.hp;
game.player.executeAttack(game.input);
assert(game.enemyChampion.hp === highTargetHp, 'Melee rejects a character outside its vertical reach');
game.enemyChampion.elevation = 0;
let recoveredAttacks = 0;
for (let i = 0; i < 20; i++) { game.player.state = 'idle'; game.player.stateTimer = 0; game.player.canAttack = true; if (game.player.executeAttack(game.input)) recoveredAttacks++; game.player.update(0.5, game.input, game.battlefield); }
assert(recoveredAttacks === 20 && game.player.canAttack, 'Repeated melee actions always recover to an attack-ready state');
game.player.state = 'attack1'; game.player.stateTimer = .08; game.player.canAttack = false; game.player.comboStep = 1; // attack1 connected
assert(game.player.executeAttack(game.input) && game.player.queuedAttack === 'normal', 'Normal melee can be buffered near recovery without adding a weapon-specific combo system');
game.player.finishAction(game.input);
assert(game.player.state === 'attack2', 'Buffered normal input chains directly into the next baseline combo strike');
game.player.finishAction();
game.player.state = 'idle'; game.player.stateTimer = 0; game.player.canAttack = true; game.player.grounded = true;
assert(game.performTouchAttackGesture(0, -60) && game.player.state === 'uppercut', 'Right-side upward swipe maps to a responsive uppercut');
game.player.finishAction(); game.player.state = 'idle'; game.player.canAttack = true;
assert(game.performTouchAttackGesture(65, 0) && game.player.state === 'heavyStrike', 'Right-side horizontal swipe maps to the compact heavy lunge');
game.player.finishAction(); game.player.state = 'jump'; game.player.canAttack = true; game.player.grounded = false; game.player.elevation = 55;
assert(game.performTouchAttackGesture(0, 65) && game.player.state === 'dive', 'Airborne downward swipe maps to the existing dive strike');
game.player.finishAction(); game.player.grounded = true; game.player.elevation = 0;

const ignisCard = game.player.runeHand.find((rune) => rune.id === 'ignis');
const initialHand = game.player.runeHand.map((rune) => rune.id).join(',');
const spellCountBeforeDraw = spells.activeSpells.length;
game.startRuneDrawing(ignisCard.cardId);
game.finishRuneDrawing({ rune: recognizer.runes.find((rune) => rune.id === 'ignis'), confidence: 0.99 });
assert(!game.drawing.active && game.timeScale === 1 && game.player.preparedRunes.length === 1 && game.player.slottedSpells.length === 1 && game.player.slottedSpells[0].runes[0].id === 'ignis' && spells.activeSpells.length === spellCountBeforeDraw && game.player.runeHand.map((rune) => rune.id).join(',') === 'fulgur,terra,ventus' && game.player.runeDeck.map((rune) => rune.id).join(',') === 'aqua,fulgur,terra,ignis,ventus,aqua,ignis', 'Drawing a hand card only slots the rune spell (no auto-cast); the used card goes to the bottom of the deck and the next one is drawn');
game.player.mp = game.player.maxMp;
assert(game.castPreparedSpell() && game.player.slottedSpells.length === 0 && game.player.preparedRunes.length === 0 && spells.activeSpells.length > spellCountBeforeDraw, 'CAST releases the slotted rune spell drawn from the hand');
assert(initialHand === 'fulgur,terra,ignis', 'Casting consumes slotted spell components without cycling untouched hand cards');
const handBeforeMismatch = game.player.runeHand.map((rune) => rune.cardId).join(',');
const fulgurCard = game.player.runeHand.find((rune) => rune.id === 'fulgur');
game.startRuneDrawing(fulgurCard.cardId);
game.drawing.strokes = [[...Array.from({ length: 26 }, (_, index) => ({ x: 100 + index * 10, y: 200 + Math.sin((100 + index * 10) * .1) * 2 }))]];
game.confirmRuneDrawing();
assert(game.drawing.active && game.player.runeHand.map((rune) => rune.cardId).join(',') === handBeforeMismatch, 'Recognized gestures are rejected when they do not match the selected hand card');
game.cancelRuneDrawing();
// The played IGNIS went to the bottom of the deck; VENTUS was drawn.
const ventusCard = game.player.runeHand.find((rune) => rune.id === 'ventus');
game.startRuneDrawing(ventusCard.cardId);
game.drawing.strokes = [[...Array.from({ length: 26 }, (_, i) => ({ x: 100 + i * 10, y: 200 + Math.sin(i) * 2 }))]];
game.drawing.lastStrokeTime = performance.now() - 2001;
game.drawing.autoLockArmed = true;
const spellCountBeforeAutoLock = spells.activeSpells.length;
game.loop(game.lastFrameTime + 16);
assert(!game.drawing.active && game.player.slottedSpells.length === game.player.preparedRunes.length && spells.activeSpells.length === spellCountBeforeAutoLock, 'A paused rune stroke automatically locks in after two seconds without auto-casting');
game.player.clearPreparedRunes();
const slotIgnis = recognizer.runes.find((rune) => rune.id === 'ignis');
const slotAqua = recognizer.runes.find((rune) => rune.id === 'aqua');
const runeById = (id) => recognizer.runes.find((rune) => rune.id === id);
game.player.mp = game.player.maxMp;
game.slotRuneSpell(slotIgnis); game.slotRuneSpell(slotAqua);
assert(game.slotAt(0)?.runes[0].id === 'ignis' && game.slotAt(1)?.runes[0].id === 'aqua' && !game.slotAt(2), 'Drawn runes fill the triangle slots in order: top, bottom-left, bottom-right');
assert(game.player.boundMana === 20 && game.player.freeMana === game.player.mp - 20, 'Prepared slots bind their rune mana; only the remainder is free for new drawings');
const realSpells = () => spells.activeSpells.filter((sp) => sp.constructor.name !== 'CastCircleFx').length; // the cast circle is decoration
const selectedSpellCount = realSpells();
const manaBeforeSlotCast = game.player.mp;
assert(game.castSlotAt(0) && game.player.slottedSpells.length === 1 && game.slotAt(1)?.runes[0].id === 'aqua' && realSpells() === selectedSpellCount + 1 && spells.activeSpells.some((sp) => sp.constructor.name === 'CastCircleFx'), 'Tapping a slot fires exactly that spell (with a casting circle at the feet) and leaves the other slots in place');
assert(game.player.mp === manaBeforeSlotCast - 10 && game.player.boundMana === 10, 'Casting turns the slot\'s bound mana into spent mana without a second payment');
game.slotRuneSpell(runeById('ventus'));
assert(game.slotAt(0)?.runes[0].id === 'ventus', 'A freed slot is refilled by the next drawn rune');
game.player.clearPreparedRunes();
game.slotRuneSpell(slotIgnis); game.slotRuneSpell(runeById('ventus')); game.slotRuneSpell(slotAqua);
const beforeSlotFusion = spells.activeSpells.length;
assert(game.player.slottedSpells.every((slot) => !slot.isCombo), 'Compatible drawn runes remain separate slots until the player swipes them together');
const fusion = game.fuseSlots([1, 0]);
assert(fusion.ok && game.slotAt(1)?.isCombo && game.slotAt(1).definition.id === 'firestorm' && !game.slotAt(0) && spells.activeSpells.length === beforeSlotFusion, 'Swiping slot 2 onto slot 1 fuses into the start slot, frees the other and casts nothing');
assert(game.slotAt(2)?.runes[0].id === 'aqua' && game.player.boundMana === 30, 'An unselected third rune is untouched and fusion merges bound mana without extra cost');
assert(!game.fuseSlots([1, 2]).ok && game.slotAt(1)?.isCombo && game.slotAt(2), 'A fused spell cannot be fused again (no recursive fusion)');
assert(game.castSlotAt(1) && game.targeting.isActive && game.targeting.active.mode === 'ground' && spells.activeSpells.length === beforeSlotFusion, 'Tapping a ground-target slot (Firestorm) first asks for the impact point');
game.targeting.setPoint({ x: game.player.x + 150, z: game.player.z });
assert(game.targeting.confirm() && spells.activeSpells.length > beforeSlotFusion && !game.slotAt(1) && !game.targeting.isActive, 'Confirming the target casts the fused combination there');
game.player.clearPreparedRunes();
game.slotRuneSpell(slotIgnis); game.slotRuneSpell(slotAqua);
const beforeFailedFusion = spells.activeSpells.length;
const failedFusion = game.fuseSlots([0, 1]);
assert(!failedFusion.ok && failedFusion.reason === 'norecipe' && game.player.slottedSpells.length === 1 && spells.activeSpells.length === beforeFailedFusion && game.player.boundMana === 10, 'A swipe without recipe keeps one random ingredient, drops the other, frees its mana and casts nothing');
game.player.clearPreparedRunes();
game.slotRuneSpell(runeById('aqua')); game.slotRuneSpell(runeById('terra')); game.slotRuneSpell(runeById('ventus'));
assert(game.fuseSlots([2, 0, 1]).ok && game.slotAt(2)?.definition.id === 'summon_spirit_wolf' && game.player.slottedSpells.length === 1, 'A swipe across all three slots checks the triple recipe regardless of order');
game.player.clearPreparedRunes();
['ignis', 'ventus'].forEach((id) => game.slotRuneSpell(runeById(id)));
game.fuseSlots([0, 1]);
['ignis', 'ignis'].forEach((id) => game.slotRuneSpell(runeById(id)));
assert(game.slotAt(0)?.isCombo && game.slotAt(1) && game.slotAt(2), 'Freed slots can be refilled right after a fusion');
game.fuseSlots([1, 2]);
assert(game.player.slottedSpells.filter((slot) => slot.isCombo).length === 2 && game.slotAt(1)?.definition.id === 'inferno_beam', 'Several fused spells (here Firestorm and an Inferno Beam) may coexist');
game.player.clearPreparedRunes();
game.player.mp = 4;
game.startRuneDrawing(game.player.runeHand[0].cardId);
assert(!game.drawing.active && game.player.reservedMana === 0, 'A hand rune that costs more than the free mana cannot start a drawing');
game.player.mp = game.player.maxMp;
game.startRuneDrawing(game.player.runeHand[0].cardId);
assert(game.drawing.active && game.player.reservedMana > 0 && game.player.freeMana === game.player.maxMp - game.player.reservedMana, 'Starting a drawing reserves the rune mana against parallel use');
game.cancelRuneDrawing();
assert(game.player.reservedMana === 0, 'Cancelling a drawing releases the reservation');

// Every rune is independently useful. BESTIA still participates in stronger
// combinations, but a normal successful drawing must slot and cast its own
// Beast Familiar through the exact hand -> slot -> CAST path.
const bestiaCardRune = recognizer.runes.find((rune) => rune.id === 'bestia');
game.player.configureRuneDeck([bestiaCardRune, slotIgnis, slotAqua]);
const bestiaCard = game.player.runeHand.find((rune) => rune.id === 'bestia');
spells.clearRuntime();
game.startRuneDrawing(bestiaCard.cardId);
game.finishRuneDrawing({ rune: bestiaCardRune, confidence: .94, grade: 'S' });
game.player.mp = game.player.maxMp;
assert(!game.drawing.active && game.player.slottedSpells.length === 1 && game.castPreparedSpell() && spells.getSummons('blue').some((summon) => summon.definition.id === 'lesser_beast'), 'Drawing and casting BESTIA creates a Beast Familiar instead of blocking or freezing');
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
assert(game.castPreparedSpell() && game.targeting.active?.mode === 'placement' && game.castPreparedSpell() && spells.activeSpells.some((spell) => spell.isStoneWall && spell.wallHeight === 66 && spell.maxHp === 80), 'Single KONSTRUKT asks for its placement and E confirms a short Construct Bulwark');
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
game.enemyChampion.z = game.player.z; game.enemyChampion.elevation = 0; game.battlefield.placeOnSurface(game.enemyChampion);
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
assert(game.updateMountCandidate() === rideWolf, 'Mount candidate selects the nearest valid own mount before exposing the action');
game.player.x += 200;
assert(game.updateMountCandidate() === null, 'Mount candidate clears immediately outside interaction range');
game.player.x = rideWolf.x; game.player.z = rideWolf.z;
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
const eidolonRunes = [recognizer.runes.find((rune) => rune.id === 'buff_B02')];
game.player.eidolonTimer = 0; game.player.eidolonCooldown = 0; game.player.eidolonArmor = 0; game.player.hp = game.player.maxHp; game.player.invulnerableTimer = 0; game.player.isGuarding = false; game.player.arcaneShield = 0;
spells.cast(game.player, spells.resolveSpell(eidolonRunes), game, spells.qualityForRunes(eidolonRunes));
const eidolonHp = game.player.hp;
game.player.takeDamage(100, 200, 0, .1, false, 'spell');
assert(game.player.eidolonTimer > 0 && game.player.eidolonArmor > 0 && game.player.hp > eidolonHp - 100, 'Arkengestell (buff rune B02) creates a temporary protective frame with real mitigation');
game.player.eidolonTimer = 0; game.player.eidolonArmor = 0; game.player.eidolonPower = 1; game.player.buffForm = null;

const ninefoldRunes = [recognizer.runes.find((rune) => rune.id === 'buff_B01')];
game.player.ninefoldTimer = 0; game.player.ninefoldCooldown = 0; game.player.ninefoldPower = 1;
spells.cast(game.player, spells.resolveSpell(ninefoldRunes), game, spells.qualityForRunes(ninefoldRunes));
assert(game.player.ninefoldTimer > 0 && game.player.ninefoldPower >= 1, 'Risswild (buff rune B01) creates a temporary aggressive transformation');
game.player.ninefoldTimer = 0; game.player.ninefoldPower = 1; game.player.buffForm = null;

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

game.player.arcaneShield = 0; game.player.hp = game.player.maxHp; game.player.sp = game.player.maxSp; game.player.facing = 1; game.player.state = 'idle'; game.player.grounded = true; game.player.invulnerableTimer = 0;
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
spells.clearRuntime();
game.player.lifeState = 'Alive'; game.player.x = redTower.x - 95; game.player.z = redTower.z; game.player.elevation = 0; game.player.grounded = true; game.battlefield.resolveEntityCollision(game.player);
game.enemyChampion.isDead = false; game.enemyChampion.hp = game.enemyChampion.maxHp; game.enemyChampion.mp = game.enemyChampion.maxMp; game.enemyChampion.x = redTower.x + 70; game.enemyChampion.z = redTower.z; game.enemyChampion.spellCooldown = 0; game.enemyChampion.defensiveCooldown = 0; game.battlefield.resolveEntityCollision(game.enemyChampion);
game.enemyChampion.update(.1, game, game.battlefield);
assert(game.enemyChampion.aiMode === 'PROTECT_OBJECTIVE' && spells.activeSpells.some((spell) => spell.isStoneWall && spell.team === 'red'), 'Enemy Wizard detects pressure on its Tower and creates real defensive wall pressure');
spells.clearRuntime();
game.enemyChampion.hp = 100; game.enemyChampion.mp = game.enemyChampion.maxMp; game.enemyChampion.spellCooldown = 0; game.enemyChampion.defensiveCooldown = 0;
game.enemyChampion.update(.1, game, game.battlefield);
assert(game.enemyChampion.arcaneShield > 0, 'Low-health Enemy Wizard uses the shared Arcane Aegis defense instead of only walking or meleeing');
game.enemyChampion.arcaneShield = 0; game.enemyChampion.arcaneShieldTimer = 0; game.enemyChampion.hp = game.enemyChampion.maxHp;
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
frontLaneMinion.attackTimer = 0; frontLaneMinion.specialTimer = 99;
frontLaneMinion.isDead = false; frontLaneMinion.hp = frontLaneMinion.maxHp; frontLaneMinion.hurtTimer = 0;
const castleHp = redCastle.hp;
for (let i = 0; i < 250; i++) { frontLaneMinion.update(0.1, game, game.battlefield); game.updateProjectiles(0.1); }
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

// Invasion keeps the player Grimoire, while Dungeon alone starts as a
// level-zero melee-first run. Arena uses on-map rune relics rather than a
// start modal.
game.setMatchMode('invasion'); game.startMatch();
assert(game.matchState === 'Running' && game.activeMode.id === 'invasion' && game.minions.length > 0 && game.modeState.run === null && game.player.runeHand.length > 0, 'Invasion starts immediately with the persistent player deck and hostile defense wave');
assert(game.battlefield.defenseTowers.length === 2 && game.battlefield.redCastle.isDestroyed && game.battlefield.objectivesActive && !game.battlefield.autoWaves && game.player.x < 300, 'Invasion has one left-side keep with two nearby defense towers, not an enemy Castle lane');
game.player.x = 872; game.player.z = .48; game.player.elevation = 0; game.player.grounded = true; game.battlefield.resolveEntityCollision(game.player);
assert(game.player.surfaceId === 'mainArena' && game.player.surfaceHeight === 0, 'Invasion has no inherited invisible right Castle battlement surface');
game.returnToHub();

game.setMatchMode('dungeon'); game.startMatch();
assert(game.activeMode.id === 'dungeon' && !game.battlefield.objectivesActive && !game.modeState.run.pending && game.modeState.stage === 0 && game.minions.length === 1 && game.player.runeHand.length === 0, 'Dungeon starts with one melee scout and no opening Rune choice or inherited deck');
assert(game.sprites.sprites.enemy_knight && game.sprites.sprites.ally_fighter && ['enemy_knight', 'enemy_bandit', 'enemy_sorcerer'].includes(game.minions[0].spriteKey), 'Dungeon scout uses an LF2 sheet sprite from the enemy pool');
game.player.x = 872; game.player.z = .48; game.player.elevation = 0; game.player.grounded = true; game.battlefield.resolveEntityCollision(game.player);
assert(game.player.surfaceId === 'mainArena' && game.player.surfaceHeight === 0, 'Dungeon has no inherited invisible Castle plateau');
const dungeonCamBefore = game.modeState.dungeonCameraX;
game.player.vx = 140;
game.player.x += 140 * 0.2;
game.updateMode(.2);
assert(game.modeState.dungeonCameraX > dungeonCamBefore, 'Dungeon forward movement advances only the route presentation, not the combat geometry');
game.player.vx = 0;
const dungeonStarter = game.minions[0];
dungeonStarter.takeDamage(999);
game.awardRunXp(dungeonStarter.runXpValue);
assert(game.modeState.run.pending && game.modeState.run.options.length === 2, 'The first defeated Dungeon scout grants the first two-Rune level-up choice');
game.minions = []; // mirrors the runtime's dead-minion cleanup before the pick is chosen
game.chooseRunRune(game.modeState.run.options[0].id);
const dungeonHostiles = () => game.minions.filter((minion) => minion.team === 'red' && !minion.isDead);
const killDungeonHostiles = () => dungeonHostiles().forEach((minion) => { minion.isDead = true; });
const moveDungeonPlayer = (x) => { game.player.x = x; game.player.elevation = 0; game.player.grounded = true; game.battlefield.resolveEntityCollision(game.player); };
const room1 = game.modeState.dungeonRoom;
assert(game.modeState.stage === 1 && room1 && dungeonHostiles().length === 2 && game.enemyChampion.isDead && game.battlefield.boundsOverride.right === room1.right && room1.right - room1.left > game.logicalWidth * 2, 'A first Rune choice opens a wide LF2-style Dungeon room with its first enemy group');
assert(dungeonHostiles().every((minion) => minion.x > game.modeState.dungeonCameraX - game.cameraOffsetX + game.renderWidth), 'Dungeon room enemies spawn beyond the right screen edge and walk into view');
assert(game.minions.every((minion) => minion.team !== 'red' || ['enemy_knight', 'enemy_bandit', 'enemy_sorcerer'].includes(minion.spriteKey)), 'Dungeon room enemies use LF2 sheet sprites with distinct archetypes');
killDungeonHostiles();
game.updateMode(0.1);
assert(game.modeState.stage === 1 && !room1.cleared && !game.isDungeonExitOpen(), 'Killing the visible group does not skip to the next phase while the room continues to the right');
moveDungeonPlayer(room1.right + 300);
assert(game.player.x === room1.right, 'The right room wall stays closed until the room is cleared');
game.updateMode(0.1);
assert(dungeonHostiles().length === 2, 'Walking further right triggers the next enemy group of the same room');
killDungeonHostiles();
game.updateMode(0.1);
assert(room1.cleared && game.isDungeonExitOpen() && game.battlefield.boundsOverride.right > room1.right && game.getObjectiveStatus().includes('GO RIGHT'), 'Clearing every room group opens the right exit and shows the GO arrow');
moveDungeonPlayer(300); game.updateMode(0.1);
assert(game.modeState.stage === 1 && game.player.x === 300, 'A cleared room can still be walked back through before leaving it');
moveDungeonPlayer(room1.right + 30); game.updateMode(0.1);
const room2 = game.modeState.dungeonRoom;
assert(game.modeState.stage === 2 && room2.left === room1.right && game.battlefield.boundsOverride.left === room1.right && game.modeState.rescue && game.modeState.rescue.x > room2.left && game.enemyChampion.isDead, 'Walking through the exit enters the next room, locks the previous one and can place a prisoner');
moveDungeonPlayer(room2.right - 40); game.updateMode(0.1);
killDungeonHostiles(); game.updateMode(0.1);
assert(room2.cleared && game.modeState.rescue && !game.modeState.rescue.rescued, 'The prisoner stays in place while the player clears the rest of the room');
game.player.x = game.modeState.rescue.x; game.player.z = game.modeState.rescue.z;
game.updateDungeonRescue();
assert(game.modeState.rescue.rescued && game.minions.some((minion) => minion.team === 'blue' && minion.isRescuedCompanion), 'Walking back frees the prisoner, who becomes a persistent allied companion until defeated');
assert(game.minions.some((minion) => minion.isRescuedCompanion && ['ally_fighter', 'ally_blade'].includes(minion.spriteKey)), 'A rescued Dungeon companion uses an LF2 ally sheet sprite');
const dungeonCompanion = game.minions.find((minion) => minion.isRescuedCompanion);
dungeonCompanion.x = game.player.x + 400; dungeonCompanion.z = game.player.z; dungeonCompanion.hurtTimer = 0; dungeonCompanion.freezeTimer = 0;
dungeonCompanion.update(0.1, game, game.battlefield);
assert(dungeonCompanion.vx < 0 && dungeonCompanion.state === 'run', 'An idle rescued companion follows the player instead of wandering off through the room');
moveDungeonPlayer(room2.right + 30); game.updateMode(0.1);
const room3 = game.modeState.dungeonRoom;
moveDungeonPlayer(room3.right - 40); game.updateMode(0.1);
killDungeonHostiles(); game.updateMode(0.1);
game.modeState.rescue = { x: room3.left + 400, z: .44, rescued: false };
moveDungeonPlayer(room3.right + 30); game.updateMode(0.1);
assert(game.modeState.stage === 4 && game.modeState.rescue === null, 'An unfreed prisoner is lost once the player moves on to the next room');
moveDungeonPlayer(room3.left);
assert(game.player.x === room3.right, 'A left-behind room cannot be re-entered');
assert(game.enemyChampion.isAlive && game.enemyChampion.heroKey === 'boss_firelord' && game.enemyChampion.x > room3.right && game.getEnemyHome('red').x > room3.right, 'The final Dungeon room escalates into the Firelord boss, who holds its own room');
game.returnToHub();

game.setMatchMode('arena'); game.startMatch();
assert(game.activeMode.id === 'arena' && !game.battlefield.objectivesActive && game.minions.length === 0 && !game.canRespawn('blue') && game.enemyChampion.isAlive && game.modeState.runeCollectibles.length === 3 && game.player.runeHand.length === 0, 'Arena starts immediately as a melee duel with on-map Rune relics rather than a Rune-choice modal');
const arenaPlatform = game.battlefield.surfaces.find((surface) => surface.id === 'arenaCenterPlatform');
game.player.x = (arenaPlatform.xMin + arenaPlatform.xMax) * .5; game.player.z = (arenaPlatform.zMin + arenaPlatform.zMax) * .5; game.player.elevation = 0; game.player.vElevation = 0; game.player.grounded = true; game.player.surfaceId = 'mainArena'; game.player.surfaceHeight = 0;
game.battlefield.resolveEntityCollision(game.player);
assert(game.player.surfaceId === 'mainArena', 'Arena platforms cannot be walked up as invisible step-up ledges');
game.player.elevation = arenaPlatform.baseHeight + 16; game.player.vElevation = -160; game.player.grounded = false;
game.battlefield.resolveEntityCollision(game.player);
assert(game.player.surfaceId === 'arenaCenterPlatform' && game.player.surfaceHeight === arenaPlatform.baseHeight, 'A falling fighter can land on a visible Arena intermediate platform');
game.player.hp = game.player.maxHp;
game.player.takeDamage(24, 120, 0, .2);
assert(game.player.maxHp === 320 && game.player.hp === 296 && game.player.invulnerableTimer >= .18, 'Player durability supports brawler scrums with 320 HP and brief post-hit protection');
game.player.x = game.modeState.runeCollectibles[0].x; game.player.z = game.modeState.runeCollectibles[0].z;
game.updateArenaRuneCollectibles();
assert(game.player.runeHand.length === 1 && game.modeState.runeCollectibles.length === 2, 'Walking onto an Arena relic adds that Rune to the temporary Arena hand');
game.modeState.transformationRelicTimer = 0;
game.updateArenaTransformationRelic(0.01);
assert(game.modeState.transformationRelic, 'Arena spawns a contested transformation relic instead of granting a permanent form from the profile');
game.modeState.transformationRelic.form = 'FOCUS ASCENDANT';
game.player.x = game.modeState.transformationRelic.x; game.player.z = game.modeState.transformationRelic.z;
game.updateArenaTransformationRelic(0);
assert(!game.modeState.transformationRelic && game.player.focusTransformTimer > 0, 'Claiming an Arena transformation relic activates the existing temporary transformation implementation');
game.enemyChampion.hp = 1; game.enemyChampion.takeDamage(2); game.enemyChampion.update(0.5, game, game.battlefield); game.updateMode(0.1);
assert(game.matchState === 'Ending' && game.winnerTeam === 'blue', 'Arena Champion defeat resolves through the normal ending path');
game.returnToHub();

game.setMatchMode('training'); game.startMatch();
assert(game.activeMode.id === 'training' && !game.battlefield.objectivesActive && game.canRespawn('blue') && game.getObjectiveStatus() === 'PRACTICE — NO REWARDS', 'Training keeps combat live without Siege objectives or permanent defeat');
// Training yard: stationary straw dummy + toggleable sparring partner.
{
  const dummy = game.trainingDummy;
  assert(dummy && game.minions.includes(dummy) && dummy.x === 512 && game.enemyChampion.lifeState === 'Dead' && !game.modeState.sparring && game.hudOpponent() === dummy, 'Training starts with a straw dummy in the centre and no attacking partner');
  assert(game.battlefield.mode.world === 'training' && game.battlefield.surfaces.length === 1 && !game.battlefield.objectivesActive, 'Training uses its own castle-free yard with one ground plane');
  dummy.takeDamage(50, 400); dummy.vx = 300; dummy.z = .9; dummy.update(1 / 60);
  assert(dummy.x === 512 && dummy.z === .5 && dummy.hp === dummy.maxHp - 50, 'The dummy takes damage but never moves');
  dummy.takeDamage(5000, 0); dummy.update(1 / 60);
  assert(!dummy.isDead && dummy.hp > 0, 'The dummy cannot be destroyed');
  dummy.update(3);
  assert(dummy.hp === dummy.maxHp, 'The dummy refills after a short pause');
  assert(game.toggleSparringPartner() === true && game.enemyChampion.isAlive && game.hudOpponent() === game.enemyChampion, 'The sparring button adds an attacking partner');
  game.enemyChampion.lifeState = 'Dead'; game.updateMode(.1);
  assert(game.enemyChampion.isAlive, 'A defeated sparring partner comes back while sparring is on');
  assert(game.toggleSparringPartner() === false && game.enemyChampion.lifeState === 'Dead' && game.hudOpponent() === dummy, 'The same button removes the partner again');
  game.updateMode(.1);
  assert(game.enemyChampion.lifeState === 'Dead', 'Without sparring the partner stays away');
}
// ── Combat / Rune Clash / Mobile concept (v0.2) ─────────────────────────
// Training is a duel against a live champion and the place where fusion
// experiments are lossless, so it hosts the deterministic concept checks.
{
  const realNow = performance.now.bind(performance);
  let fakeNow = 50000;
  const useFakeClock = () => Object.defineProperty(performance, 'now', { value: () => fakeNow, configurable: true, writable: true });
  const useRealClock = () => Object.defineProperty(performance, 'now', { value: realNow, configurable: true, writable: true });
  const realRandom = Math.random;
  const P = game.player; const E = game.enemyChampion;
  const rune = (id) => recognizer.runes.find((entry) => entry.id === id);
  const stepSpells = (seconds) => { for (let t = 0; t < seconds; t += 1 / 60) spells.update(1 / 60, game); };
  const resetDuel = (playerX = 300, enemyX = 700) => {
    spells.clearRuntime();
    game.minions = [];
    for (const [actor, x, facing] of [[P, playerX, 1], [E, enemyX, -1]]) {
      actor.x = x; actor.z = .58; actor.elevation = 0; actor.vElevation = 0; actor.grounded = true; actor.facing = facing;
      actor.vx = actor.vz = 0; actor.kbVelX = 0; actor.freezeTimer = 0; actor.activeClash = null; actor.state = 'idle'; actor.stateTimer = 0;
      actor.hp = actor.maxHp; actor.mp = actor.maxMp; actor.invulnerableTimer = 0; actor.arcaneShield = 0;
      game.battlefield.placeOnSurface(actor);
    }
    E.lifeState = 'Alive'; E.beamCooldown = 99; E.spellCooldown = 99;
    P.isGuarding = false; P.focusTransformTimer = 0; P.clearPreparedRunes();
  };

  // Training: a fusion without recipe loses nothing.
  resetDuel();
  game.slotRuneSpell(rune('ignis')); game.slotRuneSpell(rune('aqua'));
  const trainingFusion = game.fuseSlots([0, 1]);
  assert(!trainingFusion.ok && trainingFusion.lossless && P.slottedSpells.length === 2, 'Training mode allows lossless fusion experiments');

  // Beam vs beam, tip to tip and frontal -> Beam Clash.
  resetDuel();
  spells.cast(P, spells.resolveSpell([rune('ignis'), rune('ignis')]), game);
  spells.cast(E, { id: 'inferno_beam', tier: 2 }, game);
  stepSpells(.7);
  const clash = spells.activeClashes[0];
  assert(clash && P.activeClash === clash && E.activeClash === clash, 'Two frontal beams meeting tip to tip start one shared Beam Clash');
  assert(clash.contactX > P.x && clash.contactX < E.x && Math.abs(clash.pressure) < 25, 'The clash contact point sits between both casters with balanced starting pressure');
  assert(spells.activeSpells.filter((s) => s.isBeam).every((beam) => beam.tipX === clash.contactX), 'Both straight beam segments end at the shared contact point');
  clash.b.aiTimer = 99;
  P.focus = 50;
  const pressureBeforePush = clash.pressure;
  Math.random = () => .99; // no AI counter on this push
  assert(clash.humanAction(P) === 'push' && P.focus === 38 && clash.pressure === pressureBeforePush + 25, 'An active push costs 12 Focus (not mana) and adds 25 pressure');
  Math.random = realRandom;
  assert(clash.humanAction(P) === 'cooldown', 'Pushes share a cooldown against spamming');
  clash.a.pushCooldown = 0;
  clash.b.windup = { t: .1 };
  const pressureBeforeCounter = clash.pressure;
  assert(clash.humanAction(P) === 'perfect' && P.focus === 44 && clash.pressure === Math.min(100, pressureBeforeCounter + 30), 'A perfectly timed counter cancels the enemy push, shifts pressure and returns 6 Focus');
  clash.b.windup = { t: .4 };
  const pressureBeforeClose = clash.pressure;
  assert(clash.humanAction(P) === 'close' && P.focus === 44 && clash.pressure === pressureBeforeClose - 15, 'A close counter only softens the enemy push and gives no Focus');
  P.focus = 5; clash.a.pushCooldown = 0;
  assert(clash.humanAction(P) === 'nofocus' && P.focus === 5, 'Without enough Focus the push is refused while the passive beam keeps holding');
  assert(!P.triggerBackdash({ source: 'touch' }) && !P.startTouchSprint(1) && !P.activateFocusTransformation(), 'Dash, sprint and transformation are locked during a clash');
  clash.pressure = 99; clash.addPressure(clash.a, 5); clash.update(1 / 60);
  const playerBeam = spells.activeSpells.find((s) => s.isBeam && s.team === 'blue');
  const enemyBeam = spells.activeSpells.find((s) => s.isBeam && s.team === 'red');
  assert(clash.isFinished && clash.result.type === 'breakthrough' && clash.result.winner === 'blue' && playerBeam && !playerBeam.isFinished && !playerBeam.clash && (!enemyBeam || enemyBeam.isFinished), 'At 100 % the winning beam breaks through and keeps firing');
  assert(!P.activeClash && !E.activeClash, 'Clash state is released from both casters afterwards');

  // Timeout: no winner, a shared explosion at the current contact point.
  resetDuel(300, 600);
  spells.cast(P, spells.resolveSpell([rune('ignis'), rune('ignis')]), game);
  spells.cast(E, { id: 'inferno_beam', tier: 2 }, game);
  stepSpells(.7);
  const timeoutClash = spells.activeClashes[0];
  timeoutClash.b.aiTimer = 99;
  timeoutClash.pressure = 50; timeoutClash.time = 5.99; timeoutClash.updateContact();
  const hpBeforeCollapse = { p: P.hp, e: E.hp };
  timeoutClash.update(.02);
  assert(timeoutClash.result?.type === 'collapse' && E.hp < hpBeforeCollapse.e && P.hp === hpBeforeCollapse.p, 'A 75:25 timeout explodes near the losing caster instead of naming a winner');
  assert(spells.activeSpells.filter((s) => s.isBeam).every((beam) => beam.isFinished), 'A collapse discharges both beams');

  // A beam tip entering the body of an already running beam neutralises both.
  resetDuel(300, 600);
  spells.cast(E, { id: 'inferno_beam', tier: 2 }, game);
  stepSpells(.8);
  P.hp = P.maxHp;
  spells.cast(P, spells.resolveSpell([rune('ignis'), rune('ignis')]), game);
  stepSpells(.5);
  assert(!spells.activeClashes.length && spells.activeSpells.filter((s) => s.isBeam).every((beam) => beam.isFinished && beam.endReason === 'neutralised'), 'Body contact with a running beam is no clash: both beams neutralise each other');

  // Heavy object: a beam is blocked by a falling meteor and chips its structure.
  resetDuel(300, 900);
  spells.cast(P, spells.resolveSpell([rune('ignis'), rune('ignis')]), game);
  stepSpells(.8);
  spells.cast(E, { id: 'meteor_cataclysm', tier: 2 }, game);
  const meteor = spells.activeSpells.find((s) => s.isHeavyObject);
  meteor.x = 450; meteor.y = meteor.targetY - 120; meteor.vx = 0; meteor.vy = 0; meteor.targetZ = P.z;
  stepSpells(.1);
  const beamOnMeteor = spells.activeSpells.find((s) => s.isBeam && !s.isFinished);
  assert(meteor.structureHp < 50 && beamOnMeteor?.tipX === 450, 'A beam does not erase a meteor: the object blocks the tip and loses structure HP');
  meteor.takeBeamDamage(999);
  assert(meteor.isFinished && !meteor.isLanded, 'Enough beam pressure shatters the meteor before it can impact');

  // AI answers a charging hostile beam with its own counter-beam.
  resetDuel(300, 650);
  E.beamCooldown = 0; E.spellCooldown = 0;
  Math.random = () => .1;
  spells.cast(P, spells.resolveSpell([rune('fulgur'), rune('fulgur')]), game);
  E.update(1 / 60, game, game.battlefield);
  Math.random = realRandom;
  assert(spells.activeSpells.some((s) => s.isBeam && s.team === 'red'), 'A duel champion can answer a charging beam with a counter-beam');

  // Projectile capture + return volley.
  resetDuel(300, 470);
  spells.cast(P, spells.resolveSpell([rune('construct'), rune('ventus')]), game);
  const ward = spells.activeSpells.find((s) => s.captured);
  spells.cast(E, { id: 'fireball', tier: 1 }, game);
  const hpBeforeCapture = P.hp;
  stepSpells(.5);
  assert(ward.captured.length === 1 && P.hp === hpBeforeCapture, 'Mirror Ward captures a hostile Fireball before it detonates');
  ward.life = 0; stepSpells(.3);
  assert(spells.activeSpells.some((s) => s.isCapturableProjectile && s.team === 'blue' && s.vx > 0) || E.hp < E.maxHp, 'The ward fires captured shots back as a return volley');

  // Telekinesis: lift, hold, slam.
  resetDuel(300, 430);
  spells.cast(P, spells.resolveSpell([rune('ventus'), rune('void')]), game);
  stepSpells(.6);
  assert(E.elevation > 60 && E.freezeTimer > 0, 'Gravity Lift raises and holds nearby enemies');
  stepSpells(1.8);
  assert(E.hp < E.maxHp && !P.activeTelekinesis, 'Without a release input Gravity Lift slams the targets down after the hold');

  // Air stomp with a vertical hitbox.
  resetDuel(300, 360);
  spells.cast(P, spells.resolveSpell([rune('bestia'), rune('terra')]), game);
  const neutralInput = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, justPressed: () => false };
  for (let t = 0; t < 1.6; t += 1 / 60) { P.update(1 / 60, neutralInput, game.battlefield, game); spells.update(1 / 60, game); }
  assert(E.hp < E.maxHp && P.grounded, 'Titan Stomp leaps, lands and hits around the landing point');

  // Homing salvo steers toward a target in another depth lane.
  resetDuel(300, 520);
  E.z = .78; game.battlefield.placeOnSurface(E);
  spells.cast(P, spells.resolveSpell([rune('ignis'), rune('void')]), game);
  stepSpells(2);
  assert(E.hp < E.maxHp, 'Soul Seekers home in on an enemy outside the straight firing lane');

  // Ground slam with temporary terrain objects.
  resetDuel(300, 480);
  spells.cast(P, spells.resolveSpell([rune('fulgur'), rune('terra')]), game);
  stepSpells(.9);
  assert(E.hp < E.maxHp && spells.activeSpells.some((s) => s.isStoneWall && s.team === 'blue'), 'Seismic Slam launches enemies along its path and leaves short-lived rock pillars');

  // Focus drains after a grace period but holds while the transformation is ready.
  resetDuel();
  P.focus = 50; P.focusDecayDelay = 0;
  P.update(1, neutralInput, game.battlefield, game);
  assert(Math.abs(P.focus - 49) < .01, 'Focus decays 1 per second after its grace period (Unity value)');
  P.focus = P.maxFocus; P.focusDecayDelay = 0;
  P.update(1, neutralInput, game.battlefield, game);
  assert(P.focus === P.maxFocus, 'A full Focus meter holds until the transformation is activated');

  // Mobile left half: flick vs. joystick classifier.
  const touch = game.touchGestureDebug;
  const ev = (x, y, id = 41) => ({ pointerId: id, pointerType: 'touch', clientX: x, clientY: y, preventDefault() {} });
  useFakeClock();
  resetDuel(); P.backdashCooldown = 0;
  fakeNow = 60000; touch.beginJoystick(ev(200, 400));
  assert(touch.leftGesture?.state === 'pending' && P.touchFacingLock, 'A left touch starts as a pending gesture with frozen facing');
  fakeNow += 80; touch.update(ev(320, 404));
  assert(P.sprintActive && P.touchSprint && touch.leftGesture.state === 'sprint' && !P.touchFacingLock, 'A fast horizontal flick toward the facing direction starts a sprint');
  touch.clear(ev(320, 404));
  P.update(.1, neutralInput, game.battlefield, game);
  assert(P.sprintActive && P.vx > 0, 'Releasing right after the sprint flick still runs the guaranteed minimum distance');
  for (let t = 0; t < 1.2; t += 1 / 60) P.update(1 / 60, neutralInput, game.battlefield, game);
  assert(P.sprintActive && P.vx > 0, 'Auto-run: after the flick the sprint keeps going without holding the direction');
  P.update(1 / 60, { ...neutralInput, keys: { ArrowLeft: true }, move: { x: -1, z: 0 } }, game.battlefield, game);
  assert(!P.sprintActive, 'Another movement input (here the opposite direction) ends the auto-run');
  resetDuel(); P.backdashCooldown = 0;
  fakeNow += 1000; touch.beginJoystick(ev(300, 400));
  fakeNow += 70; touch.update(ev(190, 398));
  assert(P.state !== 'dash' && touch.leftGesture.state === 'joystick' && !P.touchFacingLock, 'Left half: a fast move against the facing is plain stick input (no backdash, facing free to turn)');
  touch.clear(ev(190, 398));
  // Right half: a back swipe is the backdash; attack during it fires one counter shot.
  resetDuel(); P.backdashCooldown = 0; P.mp = P.maxMp; spells.clearRuntime();
  assert(game.performTouchAttackGesture(-90, 6) && P.state === 'dash' && P.backdashTimer > 0 && P.facing === 1, 'Right half: a swipe away from the facing triggers the backdash and keeps facing');
  const mpDash = P.mp;
  assert(P.executeAttack(neutralInput, 'normal') && spells.activeSpells.some((s) => s.isWeaponShot) && mpDash - P.mp === 1 && P.lastBackdashCounter, 'Attack during the backdash fires one counter shot (1 mana)');
  const shotsAfter = spells.activeSpells.length;
  assert(!P.executeAttack(neutralInput, 'normal') && spells.activeSpells.length === shotsAfter, 'Only one counter shot per backdash (no free automatic counter)');
  P.backdashTimer = 0; P.state = 'idle';
  assert(!P.triggerBackdash({ source: 'touch' }), 'Touch backdash has a cooldown');
  resetDuel(); P.backdashCooldown = 0;
  fakeNow += 1000; touch.beginJoystick(ev(200, 400));
  fakeNow += 320; touch.update(ev(310, 400));
  assert(touch.leftGesture.state === 'joystick' && !P.sprintActive, 'A slow hold-and-drag stays joystick movement without sprinting');
  fakeNow += 40; touch.update(ev(120, 400));
  assert(touch.leftGesture.state === 'joystick' && P.state !== 'dash', 'A fast reversal inside an active joystick gesture does not trigger a dash');
  touch.clear(ev(120, 400));
  fakeNow += 1000; touch.beginJoystick(ev(200, 400));
  fakeNow += 60; touch.update(ev(230, 520));
  assert(touch.leftGesture.state === 'joystick' && !P.sprintActive && P.state !== 'dash', 'A fast vertical swipe is joystick input, not a flick');
  touch.clear(ev(230, 520));
  // Right half: holding attack still starts the HOLD charge (glow) after HOLD_MIN_TIME; it stays HOLD.
  {
    const { HOLD_MANA } = await import('./public/src/hold_actions.js');
    resetDuel(); P.equipClassWeapon('bow'); P.mp = P.maxMp; P.surfaceId = null; spells.clearRuntime();
    const rx = game.renderWidth * .8;
    const rev = (x, y) => ({ pointerId: 77, pointerType: 'touch', clientX: x, clientY: y, preventDefault() {} });
    // getCanvasCoords maps client → canvas; feed coordinates that land on the right half.
    const right = (dx = 0, dy = 0) => { const c = game.getCanvasCoords(0, 0); const k = game.getCanvasCoords(100, 100); const sx = (k.x - c.x) / 100 || 1; const sy = (k.y - c.y) / 100 || 1; return rev((rx - c.x) / sx + dx, (300 - c.y) / sy + dy); };
    fakeNow += 1000; touch.beginAttackGesture(right());
    fakeNow += 150; game.tickTouchHold();
    assert(!(P.chargeTimer > 0), 'Touch hold: a short press is not a charge yet (still a tap)');
    fakeNow += 200; game.tickTouchHold();
    assert(P.chargeTimer > 0 && P.chargeDir === 'hold' && touch.holdArmed && P.holdChargeLevel() !== null, 'Touch hold: holding attack still starts the HOLD charge (glow at weapon / hands)');
    windowListeners.pointermove?.(right(0, -120)); P.update(1 / 60, neutralInput, game.battlefield, game);
    assert(P.chargeDir === 'hold', 'Touch hold: once HOLD charges, a drag no longer turns it into a directional charge');
    const mp0 = P.mp; touch.finishAttackGesture(right(0, -120));
    assert(P.lastHoldAction === 'REACH' && mp0 - P.mp === HOLD_MANA.lane && !(P.chargeTimer > 0), 'Touch hold: releasing fires the HOLD move');
    // Held to full charge: it fires by itself, and lifting the finger does not fire again.
    resetDuel(); P.mp = P.maxMp; P.lastHoldAction = null; spells.clearRuntime();
    fakeNow += 1000; touch.beginAttackGesture(right()); fakeNow += 350; game.tickTouchHold();
    const mp1 = P.mp; for (let i = 0; i < 70; i++) { P.update(1 / 60, neutralInput, game.battlefield, game); game.tickTouchHold(); }
    const fired = P.lastHoldAction === 'REACH'; const shotsAuto = spells.activeSpells.filter((sp) => sp.isWeaponShot).length; touch.finishAttackGesture(right());
    assert(fired && shotsAuto > 0 && spells.activeSpells.filter((sp) => sp.isWeaponShot).length === shotsAuto && mp1 - P.mp > HOLD_MANA.lane - 2, 'Touch hold: at full charge it releases on its own — exactly once');
    resetDuel();
  }
  useRealClock();
  resetDuel();
}
// Spell targeting, input devices and the Cone / Burrow archetypes.
{
  const P = game.player; const E = game.enemyChampion;
  const rune = (id) => recognizer.runes.find((entry) => entry.id === id);
  const stepSpells = (seconds) => { for (let t = 0; t < seconds; t += 1 / 60) spells.update(1 / 60, game); };
  const reset = () => {
    spells.clearRuntime(); game.minions = []; game.targeting.cancel(); P.clearPreparedRunes();
    P.x = 300; P.z = .58; P.facing = 1; P.mp = P.maxMp; P.isGuarding = false; P.burrowed = false; P.invulnerableTimer = 0;
    P.state = 'idle'; P.stateTimer = 0; P.grounded = true; P.elevation = 0; game.battlefield.placeOnSurface(P);
    E.lifeState = 'Alive'; E.x = 520; E.z = .58; E.hp = E.maxHp; E.beamCooldown = 99; E.spellCooldown = 99; E.arcaneShield = 0; E.invulnerableTimer = 0; game.battlefield.placeOnSurface(E);
  };
  const slotFused = (ids) => { ids.forEach((id) => game.slotRuneSpell(rune(id))); game.fuseSlots(ids.map((_, i) => i)); return game.slotAt(0); };
  const screenOf = (x, z) => game.targeting.worldToScreen(x, z);

  reset();
  slotFused(['fulgur', 'ignis']);
  assert(game.castSlotAt(0) && game.targeting.active?.mode === 'ground', 'Meteor asks for an impact point after its slot is tapped');
  game.targeting.setPointFromScreen(screenOf(470, .4));
  assert(game.targeting.confirm() && spells.activeSpells.some((s) => s.isHeavyObject && s.targetX === 470 && Math.abs(s.targetZ - .4) < .01), 'The meteor lands exactly on the chosen point');
  reset();
  slotFused(['fulgur', 'ignis']);
  game.castSlotAt(0); game.targeting.setPoint({ x: 2000, z: .58 });
  assert(game.targeting.active.point.x <= P.x + 460, 'Ground targets are clamped to the spell range');
  const manaBeforeCancel = P.mp;
  game.targeting.cancel();
  assert(game.slotAt(0) && P.mp === manaBeforeCancel, 'Cancelling a target keeps the prepared slot and its mana');
  game.castSlotAt(0);
  windowListeners.keydown?.({ code: 'Escape', repeat: false, preventDefault() {} });
  assert(!game.targeting.isActive && game.slotAt(0) && !game.menuPaused, 'Esc cancels targeting before opening the menu');

  // Placement: the swipe decides orientation and length of the wall.
  reset();
  slotFused(['terra', 'terra']);
  game.castSlotAt(0);
  const a = screenOf(420, .5); const b = screenOf(560, .52);
  game.targeting.pointerDown(a, 'mouse'); game.targeting.pointerMove(b, 'mouse'); game.targeting.pointerUp(b, 'mouse');
  const lateralBlocks = spells.activeSpells.filter((s) => s.isStoneWall);
  const lateralXs = lateralBlocks.map((s) => s.x);
  assert(lateralBlocks.length >= 3 && Math.abs(Math.min(...lateralXs) - 420) < 4 && Math.max(...lateralXs) - Math.min(...lateralXs) > 60 && lateralBlocks.every((s) => Math.abs(s.z - .5) < .03), 'A horizontal swipe places a row of wall blocks exactly along the swiped line');
  reset();
  slotFused(['terra', 'terra']);
  game.castSlotAt(0);
  const c = screenOf(450, .25); const d = screenOf(452, .8);
  game.targeting.pointerDown(c, 7); game.targeting.pointerMove(d, 7); game.targeting.pointerUp(d, 7);
  const depthBlocks = spells.activeSpells.filter((s) => s.isStoneWall);
  const depthZs = depthBlocks.map((s) => s.z);
  assert(depthBlocks.length >= 3 && Math.max(...depthZs) - Math.min(...depthZs) > .3 && depthBlocks.every((s) => Math.abs(s.x - 450) < 6), 'A downward swipe places the wall into the depth (across the lane)');
  // A diagonal swipe follows the line; the drawing grade sets the length.
  reset();
  spells.cast(P, spells.resolveSpell([{ id: 'terra' }, { id: 'terra' }]), game, 'S', { x: 0, z: 0, start: { x: 400, z: .3 }, end: { x: 700, z: .8 } });
  const diagonal = spells.activeSpells.filter((s) => s.isStoneWall);
  assert(diagonal.length === spells.wallSegmentLimit('stone_wall', 'S') && diagonal.every((s, i) => i === 0 || (s.x > diagonal[i - 1].x && s.z > diagonal[i - 1].z)), 'A diagonal swipe builds a diagonal wall; an S-grade rune gives the most blocks');
  assert(spells.wallSegmentLimit('stone_wall', 'S') > spells.wallSegmentLimit('stone_wall', 'B') && spells.wallSegmentLimit('stone_wall', 'B') > spells.wallSegmentLimit('stone_wall', 'C'), 'Cleaner drawings allow longer walls (more segments)');
  // Nobody walks through a placed wall — the caster included.
  const block = diagonal[0];
  const fromX = block.x - 40;
  P.x = block.x; P.z = block.z;
  assert(game.resolveSpellObstacles(P, fromX, block.z) && P.x === fromX, 'The caster cannot walk through their own wall');
  P.x = block.x; P.z = block.z;
  assert(!game.resolveSpellObstacles(P, block.x + 2, block.z), 'Someone a wall rose on top of can still walk out of it');

  // Ally targeting: shield a friendly minion.
  reset();
  const { Minion } = await import('./public/src/entities.js');
  const ally = new Minion(380, .5, 'blue', 'melee', 0);
  game.battlefield.placeOnSurface(ally); game.minions.push(ally);
  slotFused(['aqua', 'terra']);
  game.castSlotAt(0);
  assert(game.targeting.active?.mode === 'ally' && game.targeting.active.entity === P, 'Arcane Aegis defaults to the caster and waits for an ally');
  const allyScreen = screenOf(ally.x, ally.z);
  game.targeting.pointerDown(allyScreen, 9); game.targeting.pointerUp(allyScreen, 9);
  const allyHp = ally.hp;
  ally.takeDamage(30);
  assert(ally.arcaneShield > 0 && ally.hp === allyHp, 'Tapping an ally shields that minion instead of the caster');

  // Touch: a touch on the battlefield aims an open target (canvas routing).
  reset();
  slotFused(['fulgur', 'ignis']);
  game.castSlotAt(0);
  const tap = screenOf(500, .5);
  game.canvas.listeners.pointerdown?.({ pointerType: 'touch', pointerId: 31, clientX: tap.x, clientY: tap.y, preventDefault() {} });
  assert(game.targeting.active?.pointerId === 31, 'A battlefield touch takes over an open target');
  game.targeting.pointerUp(tap, 31);
  assert(spells.activeSpells.some((s) => s.isHeavyObject && Math.abs(s.targetX - 500) < 2), 'Releasing the touch casts at that point');

  // Keyboard Z / X / C: tap casts, chord fuses.
  reset();
  game.slotRuneSpell(rune('ignis')); game.slotRuneSpell(rune('ventus'));
  windowListeners.keydown?.({ code: 'KeyZ', repeat: false, preventDefault() {} });
  windowListeners.keydown?.({ code: 'KeyX', repeat: false, preventDefault() {} });
  windowListeners.keyup?.({ code: 'KeyZ' }); windowListeners.keyup?.({ code: 'KeyX' });
  assert(game.slotAt(0)?.definition.id === 'firestorm' && !game.slotAt(1), 'Holding Z and X together fuses slots 1 and 2');
  game.slotRuneSpell(rune('ignis'));
  const spellsBeforeKey = spells.activeSpells.length;
  windowListeners.keydown?.({ code: 'KeyX', repeat: false, preventDefault() {} }); windowListeners.keyup?.({ code: 'KeyX' });
  assert(spells.activeSpells.length > spellsBeforeKey && !game.slotAt(1), 'A single X press casts slot 2');

  // Gamepad (standard mapping) through a stubbed Gamepad API.
  reset();
  const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  const press = (index, on) => { pad.buttons[index] = { pressed: on, value: on ? 1 : 0 }; game.gamepad.poll(1 / 60); };
  const nav = globalThis.navigator;
  const hadGetGamepads = Object.getOwnPropertyDescriptor(nav, 'getGamepads');
  Object.defineProperty(nav, 'getGamepads', { value: () => [pad], configurable: true, writable: true });
  game.slotRuneSpell(rune('ignis')); game.slotRuneSpell(rune('ventus'));
  press(4, true); press(5, true); press(4, false); press(5, false);
  assert(game.inputMode === 'gamepad' && game.slotAt(0)?.definition.id === 'firestorm', 'LB + RB together fuse slots 1 and 2 on a gamepad');
  press(4, true); press(4, false);
  assert(game.targeting.active?.mode === 'ground', 'LB opens the targeting of the fused ground spell');
  pad.axes = [0, 0, 1, 0]; game.gamepad.poll(.5); pad.axes = [0, 0, 0, 0];
  const aimed = game.targeting.active.point.x;
  press(0, true); press(0, false);
  assert(aimed > P.x + 200 && !game.targeting.isActive && spells.activeSpells.length > 0, 'The right stick moves the reticle and A confirms the cast');
  pad.axes = [1, 0, 0, 0]; game.gamepad.poll(1 / 60); game.refreshMovement();
  assert(game.input.move.x > .5, 'The left stick moves the Wizard');
  pad.axes = [0, 0, 0, 0]; game.gamepad.poll(1 / 60);
  press(1, true);
  assert(game.input.guardHeld, 'Holding B blocks');
  press(1, false);
  if (hadGetGamepads) Object.defineProperty(nav, 'getGamepads', hadGetGamepads); else delete nav.getGamepads;
  game.setInputMode('desktop');

  // Wide beam / cone: hits inside the widening cone, not behind the caster.
  reset();
  E.x = 480; E.z = .74; game.battlefield.placeOnSurface(E);
  game.slotRuneSpell(rune('bestia')); game.slotRuneSpell(rune('ignis')); game.fuseSlots([0, 1]);
  game.castSlotAt(0);
  stepSpells(.5);
  assert(E.hp < E.maxHp, 'Dragon Breath hits an enemy off-lane at range inside its widening cone');
  reset();
  E.x = 200; game.battlefield.placeOnSurface(E);
  game.slotRuneSpell(rune('bestia')); game.slotRuneSpell(rune('ignis')); game.fuseSlots([0, 1]);
  game.castSlotAt(0); stepSpells(.5);
  assert(E.hp === E.maxHp, 'The cone does not hit behind the caster');

  // Underground / burrow: untouchable travel, then an eruption.
  reset();
  E.x = 350; game.battlefield.placeOnSurface(E);
  game.slotRuneSpell(rune('terra')); game.slotRuneSpell(rune('void')); game.fuseSlots([0, 1]);
  game.castSlotAt(0);
  const hpBurrowed = P.hp;
  P.takeDamage(40, 100);
  assert(P.burrowed && P.hp === hpBurrowed && !P.executeAttack(game.input), 'A burrowed Wizard is untouchable and cannot attack');
  stepSpells(1.6);
  assert(!P.burrowed && E.hp < E.maxHp, 'Burrow Strike erupts and launches nearby enemies');
  reset();
}
// Environment layer: ground effects, element reactions and breakable props.
{
  const { environment } = await import('./public/src/environment.js');
  const P = game.player; const E = game.enemyChampion;
  const realRandom = Math.random;
  const stepWorld = (seconds) => { for (let t = 0; t < seconds; t += 1 / 60) { spells.update(1 / 60, game); environment.update(1 / 60, game, spells.getSummons()); } };
  const reset = () => {
    spells.clearRuntime(); environment.clear(); game.minions = []; game.targeting.cancel(); P.clearPreparedRunes();
    P.x = 300; P.z = .58; P.facing = 1; P.mp = P.maxMp; P.hp = P.maxHp; P.burrowed = false; P.invulnerableTimer = 0; P.state = 'idle'; P.stateTimer = 0;
    P.grounded = true; P.elevation = 0; P.vx = 0; P.onIce = false; game.battlefield.placeOnSurface(P);
    E.lifeState = 'Alive'; E.x = 520; E.z = .58; E.hp = E.maxHp; E.state = 'idle'; E.stateTimer = 0; E.arcaneShield = 0; E.slowTimer = 0; E.slowFactor = 1; E.elevation = 0; game.battlefield.placeOnSurface(E);
  };

  reset();
  spells.cast(P, spells.resolveSpell([recognizer.runes.find((r) => r.id === 'ignis')]), game);
  stepWorld(.6);
  const scorch = environment.effects.find((e) => e.type === 'scorch');
  assert(scorch && scorch.team === 'blue', 'A Fireball leaves burning ground at its impact');
  E.x = scorch.x; E.z = scorch.z; E.hp = E.maxHp; E.state = 'idle';
  stepWorld(1.1);
  assert(E.hp < E.maxHp && E.state !== 'hurt', 'Burning ground damages the other team over time without a hit stun');
  const playerHpOnOwnFire = P.hp;
  P.x = scorch.x; P.z = scorch.z; stepWorld(.6);
  assert(P.hp === playerHpOnOwnFire, 'Own burning ground does not hurt its caster team');

  reset();
  environment.add('ice', 300, .58, { radius: 90, team: 'blue' });
  environment.update(1 / 60, game, []);
  assert(P.onIce, 'Standing on ice marks the Wizard as on ice');
  P.vx = 300;
  const iceVx = P.accelerateAxis(P.vx, 0, P.moveSpeed, .1);
  P.onIce = false;
  const groundVx = P.accelerateAxis(300, 0, P.moveSpeed, .1);
  assert(iceVx > groundVx + 50, 'Ice makes the Wizard slide: braking takes much longer');

  reset();
  environment.add('ice', 400, .5, { radius: 60 });
  environment.add('scorch', 400, .5, { radius: 50, team: 'blue' });
  assert(environment.effects.some((e) => e.type === 'water') && !environment.effects.some((e) => e.type === 'ice'), 'Fire melts ice into a water puddle');
  assert(!environment.effects.some((e) => e.type === 'scorch' && e.life > .5), 'The puddle douses the new fire');
  E.x = 400; E.z = .5; E.hp = E.maxHp;
  assert(environment.electrify(400, .5, 40, 'blue', 15, game) && E.hp < E.maxHp, 'Lightning electrifies the puddle and shocks whoever stands in it');
  reset();
  environment.add('scorch', 450, .5, { radius: 50, team: 'blue' });
  environment.add('ice', 450, .5, { radius: 60 });
  assert(!environment.effects.some((e) => e.type === 'scorch' && e.life > 0) && environment.effects.some((e) => e.type === 'smoke'), 'Ice douses burning ground with a puff of smoke');
  reset();
  environment.add('lava', 450, .5, { radius: 45, team: 'blue' });
  environment.add('ice', 450, .5, { radius: 60 });
  assert(environment.effects.some((e) => e.type === 'crater') && !environment.effects.some((e) => e.type === 'lava'), 'Ice cools lava into a crater');
  reset();
  environment.add('scorch', 450, .5, { radius: 40, team: 'blue' });
  environment.add('smoke', 470, .5, { radius: 40 });
  environment.wind(450, .5, 120, 1);
  assert(environment.effects.filter((e) => e.type === 'scorch').length === 2 && environment.effects.find((e) => e.type === 'smoke').life <= .25, 'Wind clears smoke and spreads burning ground downwind');

  reset();
  environment.add('crater', 520, .58, { radius: 70 });
  environment.update(1 / 60, game, []);
  assert(E.slowFactor < 1, 'Craters and rough ground slow actors');

  reset();
  spells.cast(P, { id: 'meteor_cataclysm', tier: 2 }, game, null, { x: 500, z: .5 });
  stepWorld(1.2);
  assert(environment.effects.some((e) => e.type === 'crater') && environment.effects.some((e) => e.type === 'lava'), 'A meteor impact leaves a crater with a lava pool');

  // Breakable props.
  reset();
  const crate = environment.addProp('crate', 360, .58);
  assert(game.getHostileTargets('blue').includes(crate) && game.getHostileTargets('red').includes(crate), 'Crates are neutral targets for both teams');
  P.x = 300; P.z = .58;
  const before = P.x;
  P.x = 350; game.resolveSpellObstacles(P, before, P.z);
  assert(P.x === before, 'Crates block movement like a small wall');
  Math.random = () => .1;
  crate.takeDamage(999, 100, 0, 0, false, 'melee');
  environment.update(1 / 60, game, []);
  Math.random = realRandom;
  assert(!environment.livingProps().includes(crate) && environment.effects.some((e) => e.type === 'rubble') && game.modeState.potions.length > 0, 'A broken crate leaves splinters and can drop a potion');
  reset();
  const barrel = environment.addProp('barrel', 500, .58);
  E.x = 540; E.z = .58;
  barrel.takeDamage(5, 0, 0, 0, false, 'spell');
  stepWorld(1.1);
  assert(!environment.livingProps().includes(barrel) && E.hp < E.maxHp && environment.effects.some((e) => e.type === 'scorch'), 'A spell-lit oil barrel bursts into flame and hurts everyone nearby');

  reset();
  spells.cast(P, spells.resolveSpell([recognizer.runes.find((r) => r.id === 'terra'), recognizer.runes.find((r) => r.id === 'terra')]), game);
  const blocks = spells.activeSpells.filter((s) => s.isStoneWall);
  blocks[0].takeDamage(999);
  stepWorld(.1);
  assert(environment.effects.some((e) => e.type === 'rubble') && spells.activeSpells.filter((s) => s.isStoneWall).length === blocks.length - 1, 'A destroyed wall block crumbles into rubble and leaves a gap');
  for (const rest of spells.activeSpells.filter((s) => s.isStoneWall)) rest.takeDamage(999);
  stepWorld(.1);
  assert(!spells.activeSpells.some((s) => s.isStoneWall), 'Breaking every block removes the wall');
  reset();
}
// Improvements: dash cooldown, training depth, depth sorting, training decks,
// multiple walls / summons via passives, telekinesis release choices.
{
  const { environment } = await import('./public/src/environment.js');
  const P = game.player; const E = game.enemyChampion;
  const rune = (id) => recognizer.runes.find((entry) => entry.id === id);
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const stepSpells = (seconds) => { for (let t = 0; t < seconds; t += 1 / 60) spells.update(1 / 60, game); };
  const savedMods = { ...P.buildModifiers };
  const reset = () => {
    spells.clearRuntime(); environment.clear(); game.minions = []; game.targeting.cancel(); P.clearPreparedRunes();
    P.buildModifiers = { ...savedMods };
    P.x = 300; P.z = .58; P.facing = 1; P.mp = P.maxMp; P.hp = P.maxHp; P.state = 'idle'; P.stateTimer = 0; P.grounded = true; P.elevation = 0;
    P.backdashTimer = 0; P.backdashCooldown = 0; P.backdashSuppressTimer = 0; P.sprintActive = false; P.invulnerableTimer = 0; P.activeTelekinesis = null;
    game.battlefield.placeOnSurface(P);
    E.lifeState = 'Alive'; E.x = 420; E.z = .58; E.hp = E.maxHp; E.state = 'idle'; E.stateTimer = 0; E.freezeTimer = 0; E.kbVelX = 0; E.elevation = 0; E.arcaneShield = 0;
    game.battlefield.placeOnSurface(E);
  };

  // 1. A dash never chains into a sprint and has a cooldown.
  reset();
  assert(P.triggerBackdash(), 'A backdash starts');
  for (let t = 0; t < .3; t += 1 / 60) P.update(1 / 60, neutral, game.battlefield, game);
  P.activateSprint(1);
  assert(!P.sprintActive && !P.triggerBackdash(), 'Right after a dash there is no sprint and the dash is on cooldown');
  for (let t = 0; t < .9; t += 1 / 60) P.update(1 / 60, neutral, game.battlefield, game);
  P.activateSprint(1);
  assert(P.sprintActive && (P.cancelSprint(), P.triggerBackdash()), 'After the cooldown sprint and dash are available again');

  // 2. The whole painted training floor is walkable.
  reset();
  assert(Math.abs(groundYForDepth(0) - 199.57) < .1 && game.battlefield.boundsOverride.farZ <= .02, 'Training projects the combat plane over the whole painted floor (scene fitted to the 16:9 stage)');
  P.z = .01; P.x = 60; game.battlefield.resolveEntityCollision(P);
  assert(P.z === .02 && P.x === 96, 'The player can walk to the rear and side edges of the training yard');

  // 3. Spells are depth-sorted with actors.
  reset();
  P.z = .4; game.battlefield.placeOnSurface(P);
  spells.cast(P, spells.resolveSpell([rune('terra')]), game);
  const spikes = spells.activeSpells.find((s) => !s.isGroundDecal && Number.isFinite(spells.spellDepth(s)));
  const dummyY = groundYForDepth(.5);
  assert(spikes && spells.spellDepth(spikes) < dummyY && spells.depthEntries().some((entry) => entry.spell === spikes), 'Spikes behind the dummy sort behind it (painter order)');

  // 4. Training deck editor: debug build unlocks every rune, player and partner decks.
  reset();
  game.profile.unlockedRunes.delete('void');
  assert(game.openTrainingDeck('player') && game.menuPaused && game.deckEditTarget === 'player', 'The training DECK button opens the editor and pauses the training');
  game.trainingDecks.player.splice(0, game.trainingDecks.player.length, 'ignis');
  assert(game.updateMatchDeck('add', 'void') && game.trainingDecks.player.includes('void'), 'In the debug build every rune can be slotted into the training deck');
  assert(game.openTrainingDeck('opponent') && game.deckEditTarget === 'player', 'The partner deck is only editable while the partner is active');
  game.toggleSparringPartner();
  game.openTrainingDeck('opponent');
  assert(!game.updateMatchDeck('add', 'bestia'), 'A full 10-card training deck needs a free card slot first');
  game.updateMatchDeck('remove', 'aqua');
  game.updateMatchDeck('add', 'bestia');
  assert(game.deckEditTarget === 'opponent' && game.trainingDecks.opponent.includes('bestia'), 'With the partner active its deck can be edited');
  ui.toggleDeckBuilder(false);
  assert(!game.menuPaused && !game.deckEditTarget, 'Closing the editor resumes the training');
  assert([...P.runeDeck, ...P.runeHand].some((card) => card.id === 'void') && E.deckSpells.some((option) => option.def.id === 'summon_lesser_beast'), 'Both edited decks are applied (partner AI casts from its deck)');
  game.toggleSparringPartner();
  game.profile.unlockedRunes.add('void');
  {
    // Deck builder: saved builds load in one tap (match deck and training deck), favourites filter the list.
    const prof = game.profile; const savedDeck = prof.getMatchDeck(); const savedPresets = prof.deckPresets.splice(0); const savedFavs = new Set(prof.favoriteRunes);
    prof.favoriteRunes.clear();
    assert(game.updateMatchDeck('preset-save', 'Main <b>') && prof.deckPresets.length === 1 && prof.deckPresets[0].name === 'Main b', 'SAVE CURRENT DECK stores the match deck as a named build');
    const mainId = prof.deckPresets[0].id;
    game.updateMatchDeck('remove', 'ignis'); game.updateMatchDeck('remove', 'ignis');
    assert(prof.matchDeck.length === 8 && game.updateMatchDeck('preset-load', mainId) && prof.getRuneCopies('ignis') === 2 && prof.matchDeck.length === 10, 'LOAD restores the saved build as the match deck in one step');
    ui.toggleDeckBuilder(true); game.refreshDeckBuilder();
    const presetHtml = document.getElementById('deck-presets').innerHTML;
    assert(presetHtml.includes('Main b') && presetHtml.includes('is-active') && !presetHtml.includes('<b>Main'), 'The build list shows the saved build (name escaped), the loaded one marked active');
    assert(game.updateMatchDeck('favorite', 'sig_S46') && prof.isFavoriteRune('sig_S46'), 'The star marks a rune as favourite');
    ui.deckFilter = 'favorites'; game.refreshDeckBuilder();
    const favHtml = document.getElementById('deck-builder-content').innerHTML;
    const favCards = favHtml.match(/<article[\s\S]*?<\/article>/g) ?? [];
    assert(favCards.length === 1 && favCards[0].includes('data-rune-id="sig_S46"') && favHtml.includes('deck-strip'), 'The FAVORITES filter lists only favourite runes (the deck stays visible as ten slots above)');
    ui.deckFilter = 'deck'; game.refreshDeckBuilder();
    assert(document.getElementById('deck-builder-content').innerHTML.includes('data-rune-id="ignis"') && !document.getElementById('deck-builder-content').innerHTML.includes('data-rune-id="sig_S46"'), 'The IN DECK filter lists only the runes in the deck');
    ui.deckFilter = 'all'; ui.toggleDeckBuilder(false);
    // Training: a build loads straight into the open training deck.
    game.openTrainingDeck('player');
    game.trainingDecks.player.splice(0, game.trainingDecks.player.length, 'void');
    assert(game.updateMatchDeck('preset-load', mainId) && game.trainingDecks.player.length === 10 && !game.trainingDecks.player.includes('void'), 'In training a saved build loads into the edited training deck');
    assert(game.updateMatchDeck('preset-delete', mainId) && !prof.deckPresets.length, 'A build can be deleted');
    ui.toggleDeckBuilder(false);
    prof.matchDeck = savedDeck; prof.deckPresets.push(...savedPresets); prof.favoriteRunes = savedFavs;
  }

  // 5. Walls: base limit 1, Rampart Mason keeps several; walls stand until broken.
  reset();
  const wallSpell = spells.resolveSpell([rune('terra'), rune('terra')]);
  spells.cast(P, wallSpell, game, null, { x: 400, z: .3 });
  spells.cast(P, wallSpell, game, null, { x: 500, z: .5 });
  stepSpells(.05);
  assert(new Set(spells.activeSpells.filter((s) => s.isStoneWall).map((s) => s.wallGroup)).size === 1, 'Without the passive only one wall stands at a time');
  reset();
  P.buildModifiers = { ...savedMods, maxWalls: 3 };
  for (const x of [380, 460, 540]) spells.cast(P, wallSpell, game, null, { x, z: .5 });
  stepSpells(5);
  assert(new Set(spells.activeSpells.filter((s) => s.isStoneWall).map((s) => s.wallGroup)).size === 3, 'With Rampart Mason several walls stay on the field (long-lasting until destroyed)');
  const { Minion } = await import('./public/src/entities.js');
  const raider = new Minion(560, .5, 'red', 'melee', 0);
  game.battlefield.placeOnSurface(raider); game.minions.push(raider);
  const wallTarget = game.findMinionTarget(raider);
  assert(wallTarget?.isWallProxy && game.getHostileTargets('red').some((t) => t.isStoneWall), 'Enemies attack a wall that blocks them; hostile walls are valid targets');

  // 6. Summons: one per kind, Pack Leader allows more.
  reset();
  const beast = spells.resolveSpell([rune('bestia')]);
  spells.cast(P, beast, game); spells.cast(P, beast, game);
  assert(spells.getSummons('blue').length === 1, 'One summon of each kind by default');
  P.buildModifiers = { ...savedMods, extraSummons: 1 };
  spells.cast(P, beast, game);
  assert(spells.getSummons('blue').length === 2, 'Pack Leader keeps two of the same kind');

  // 7. Telekinesis: hold, then throw away or pull in.
  reset();
  P.buildModifiers = { ...savedMods, liftTargets: 3 };
  spells.cast(P, { id: 'gravity_lift', tier: 2 }, game, null, { x: 420, z: .58 });
  const lift = spells.activeSpells.find((s) => s.maxTargets);
  assert(lift.maxTargets === 7 && P.activeTelekinesis === lift, 'Telekinetic Grip raises the target count; the caster holds the lift');
  stepSpells(.6);
  assert(E.elevation > 60 && P.executeAttack(neutral, 'heavy') && E.kbVelX > 0 && !P.activeTelekinesis, 'A forward attack throws the held targets away');
  reset();
  E.x = 460; game.battlefield.placeOnSurface(E);
  spells.cast(P, { id: 'gravity_lift', tier: 2 }, game, null, { x: 460, z: .58 });
  stepSpells(.6);
  const pullInput = { ...neutral, move: { x: -1, z: 0 } };
  assert(P.executeAttack(pullInput, 'normal') && E.kbVelX < 0, 'Attacking while holding back pulls the targets toward the caster');
  P.buildModifiers = { ...savedMods };
  reset();
}
// Selectable training maps: painted terrain becomes real gameplay terrain.
{
  const { environment } = await import('./public/src/environment.js');
  const { TRAINING_MAPS, zoneToWorld } = await import('./public/src/training_maps.js');
  let P = game.player; let E = game.enemyChampion;
  const rune = (id) => recognizer.runes.find((entry) => entry.id === id);
  const stepWorld = (seconds) => { for (let t = 0; t < seconds; t += 1 / 60) { spells.update(1 / 60, game); environment.update(1 / 60, game, spells.getSummons()); } };
  const place = (actor, x, z) => { actor.x = x; actor.z = z; actor.elevation = 0; actor.grounded = true; actor.vx = 0; game.battlefield.placeOnSurface(actor); };
  const prepare = (mapId) => {
    game.selectTrainingMap(mapId);
    P = game.player; E = game.enemyChampion;
    spells.clearRuntime(); game.minions = [];
    for (const effect of [...environment.effects]) effect.life = 0;
    environment.effects = [];
    P.hp = P.maxHp; P.mp = P.maxMp; P.invulnerableTimer = 0; P.state = 'idle'; P.slowFactor = 1; P.slowTimer = 0;
    E.lifeState = 'Alive'; E.hp = E.maxHp; E.state = 'idle'; E.slowFactor = 1; E.slowTimer = 0; E.invulnerableTimer = 0; E.arcaneShield = 0; E.beamCooldown = 99; E.spellCooldown = 99;
    return environment.terrain;
  };

  assert(TRAINING_MAPS.length === 8 && TRAINING_MAPS.every((map) => map.props.length >= 2), 'Eight selectable training maps with their own props');
  let terrain = prepare('rain');
  assert(game.trainingMapId === 'rain' && game.battlefield.trainingMap.id === 'rain' && terrain.length === 2 && terrain.every((zone) => zone.type === 'water'), 'Selecting a map restarts Training on it with its painted terrain');
  const leftPool = zoneToWorld(TRAINING_MAPS.find((m) => m.id === 'rain').zones[0]);
  assert(Math.abs(leftPool.x - 274) < 3 && leftPool.shape === 'rect', 'Painted zones convert from image percentages into world space');
  const pool = terrain[0];
  place(E, pool.x, pool.z);
  assert(environment.electrify(pool.x, pool.z, 20, 'blue', 16, game) && E.hp < E.maxHp, 'Lightning into a painted water basin shocks whoever stands in it');
  spells.cast(P, spells.resolveSpell([rune('aqua')]), game);
  environment.add('ice', pool.x, pool.z, { radius: 40, team: 'blue' });
  assert(environment.isFrozen(pool) && !environment.electrify(pool.x, pool.z, 20, 'blue', 16, game), 'An ice spell freezes the whole basin; frozen water no longer conducts');

  terrain = prepare('frozen');
  const field = terrain[0];
  place(P, field.x, field.z);
  environment.update(1 / 60, game, []);
  assert(P.onIce, 'Painted ice fields are slippery');
  environment.add('scorch', field.x, field.z, { radius: 40, team: 'red' });
  environment.update(1 / 60, game, []);
  assert(environment.effects.some((e) => e.type === 'water') && !P.onIce, 'Fire melts a painted ice field into a puddle where it lands');

  terrain = prepare('volcano');
  const lava = terrain.find((zone) => zone.type === 'lava');
  place(E, lava.x, lava.z); place(P, 160, .9);
  stepWorld(1.1);
  assert(E.hp < E.maxHp, 'Painted lava burns anyone standing in it');
  E.hp = E.maxHp;
  environment.add('ice', lava.x, lava.z, { radius: 60, team: 'blue' });
  stepWorld(1.1);
  assert(E.hp === E.maxHp && environment.effects.some((e) => e.type === 'crater'), 'Ice cools the lava into a safe crater');

  terrain = prepare('ruins');
  const hay = terrain[0];
  environment.add('scorch', hay.x, hay.z, { radius: 30, team: 'blue' });
  assert(hay.burning > 0, 'Fire sets a dry hay field ablaze');
  // Random start angle: give the fire a few spread ticks (overlapping spots merge).
  stepWorld(1.75);
  assert(environment.effects.filter((e) => e.type === 'scorch').length > 2, 'The hay fire spreads across the field');

  terrain = prepare('arcane');
  const manaPool = terrain[0];
  place(P, manaPool.x, manaPool.z); P.mp = 20;
  stepWorld(1);
  assert(P.mp > 25, 'Mana pools restore mana while standing in them');

  terrain = prepare('canyon');
  place(E, terrain[0].x, terrain[0].z);
  environment.update(1 / 60, game, []);
  assert(E.slowFactor < 1, 'The sand pit slows movement');

  terrain = prepare('storm');
  const puddle = terrain[1];
  place(E, puddle.x, puddle.z); place(P, 512, .1);
  environment.ambientTimer = 0;
  const realRandom = Math.random; Math.random = () => .3;
  stepWorld(1.2);
  Math.random = realRandom;
  assert(environment.strike?.zone === puddle || E.hp < E.maxHp, 'Storm lightning strikes a puddle after a telegraph');
  assert(E.hp < E.maxHp, 'The storm strike shocks everyone standing in that puddle');

  game.selectTrainingMap('waterfalls');
  assert(environment.terrain.length === 0 && game.trainingMapId === 'waterfalls', 'The classic map has no special terrain');
}
// Team castles (skins) in the training arenas.
{
  const castles = await import('./public/src/castles.js');
  const { TRAINING_MAPS } = await import('./public/src/training_maps.js');
  game.selectTrainingMap('frozen');
  const P = game.player;
  assert(castles.castleSkinFor('blue', 'frozen') === 'frozen' && castles.castleImageSrc('frozen', 'red') === 'assets/castles/frozen_red.png' && TRAINING_MAPS.every((map) => castles.CASTLE_SKINS[map.id]), 'Every training map has its own castle skin (blue and red image)');
  const blueBox = castles.castleBox('frozen', 'blue'); const redBox = castles.castleBox('frozen', 'red');
  assert(blueBox.x >= 0 && redBox.x + redBox.w <= 1024 && redBox.mirrored && !blueBox.mirrored && Math.abs(blueBox.x - (1024 - redBox.x - redBox.w)) < .01, 'The blue castle stands on the left, the red one mirrored on the right, both fully on the 16:9 stage');
  const gate = castles.castleGatePoint('frozen', 'blue');
  assert(gate.x > 96 && gate.z > .3 && gate.z < .8 && !castles.castleBlocksAt('frozen', gate.x, gate.z), 'The gate point lies just inside the arena in front of the castle');
  assert(castles.castleBlocksAt('frozen', 60, .55) && !castles.castleBlocksAt('frozen', 512, .5), 'The castle footprint is solid, the arena centre is free');
  P.x = 140; P.z = .5; P.elevation = 0; game.battlefield.placeOnSurface(P);
  P.z = .7; game.battlefield.placeOnSurface(P);
  const fromX = P.x; P.x = 90; P.z = .7;
  assert(game.resolveSpellObstacles(P, fromX, .7) && P.x === fromX, 'The player cannot walk into a castle wall');
  castles.setCastleSkin('red', 'volcano');
  assert(castles.castleSkinFor('red', 'frozen') === 'volcano' && castles.castleSkinFor('blue', 'frozen') === 'frozen', 'Each team can choose its own castle skin');
  castles.setCastleSkin('red', null);
  game.render();
  // The gate opens at the arena's middle depth; the wall in front overlaps the castle.
  assert(Math.abs(gate.z - .5) < .03, 'The castle gate opens at the middle depth of the arena');
  const overlay = castles.castleWallOverlay('frozen', 'blue');
  const blueBase = castles.castleFootprint('frozen', 'blue')[0].y;
  assert(overlay.length === 4 && Math.min(...overlay.map((p) => p.y)) < blueBase && Math.max(...overlay.map((p) => p.y)) > blueBase, 'The painted wall in front is redrawn over the castle base (wall butts against the castle)');

  // Rampart deck: walk in through the gate, stand on top, drop down on the arena side.
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const walk = (mx, mz, frames) => { const input = { ...neutral, move: { x: mx, z: mz } }; for (let i = 0; i < frames; i++) P.update(1 / 60, input, game.battlefield, game); };
  const door = castles.castleGateDoor('frozen', 'blue');
  P.state = 'idle'; P.stateTimer = 0; P.sprintActive = false; P.x = door.x + 30; P.z = door.z; P.vx = 0; P.vz = 0; game.battlefield.placeOnSurface(P);
  walk(-1, 0, 40);
  const deckH = castles.castleDeckHeight('frozen', 'blue');
  assert(P.surfaceId === 'blueCastleDeck' && Math.abs(P.surfaceHeight - deckH) < .5 && deckH > 120, `Walking into the gate leads up onto the castle rampart (${Math.round(deckH)} px high)`);
  walk(0, -1, 70);
  assert(P.surfaceId === 'blueCastleDeck' && P.grounded && P.z < door.z - .1, `The rampart reaches back into the depth and holds the Wizard (no falling through) [${P.surfaceId} x${P.x.toFixed(0)} z${P.z.toFixed(2)} g${P.grounded}]`);
  walk(-1, 0, 60);
  assert(P.surfaceId === 'blueCastleDeck' && P.grounded, 'The outer rampart edge holds like a wall');
  walk(0, 1, 120);
  assert(P.surfaceId === 'blueCastleDeck' && P.grounded, 'The front rampart edge holds like a wall');
  walk(1, 0, 90);
  assert(P.surfaceId !== 'blueCastleDeck' && P.x >= 96, `On the arena side the Wizard can drop down from the rampart (training) [${P.surfaceId} x${P.x.toFixed(0)} z${P.z.toFixed(2)}]`);
  walk(0, 0, 60);
  assert(P.grounded && P.surfaceHeight === 0 && P.elevation === 0, 'After the drop the Wizard lands on the arena floor');
  // Ground units never step up onto a rampart.
  const deckPoint = castles.castleDeckEntry('frozen', 'blue');
  assert(castles.castleDeckAt('frozen', deckPoint.x, deckPoint.z) && game.battlefield.getSurfaceAt(deckPoint.x, deckPoint.z, { surfaceId: 'mainArena', worldHeight: 0 }).id === 'mainArena', 'The rampart is only reached through the gate (or from above), not by walking against the wall');

  // Training extras: minion waves leave the gates; lane towers can be switched on.
  game.minions = [];
  assert(game.toggleTrainingMinions() && game.battlefield.trainingWavesOn, 'M / the MINIONS button switches minion waves on');
  for (let i = 0; i < 5.5 * 60; i++) game.battlefield.update(1 / 60, game);
  assert(game.minions.length === 0, 'The first wave waits 6 s (Unity lane wave)');
  for (let i = 0; i < 2.5 * 60; i++) game.battlefield.update(1 / 60, game);
  const blueGate = castles.castleGatePoint('frozen', 'blue'); const redGate = castles.castleGatePoint('frozen', 'red');
  const blues = game.minions.filter((m) => m.team === 'blue'); const reds = game.minions.filter((m) => m.team === 'red');
  assert(blues.length === 5 && reds.length === 5 && blues.filter((m) => m.type === 'ranged').length === 2, 'Each gate sends 3 melee and 2 ranged minions');
  assert(Math.min(...blues.map((m) => Math.abs(m.x - blueGate.x))) < 30 && Math.min(...reds.map((m) => Math.abs(m.x - redGate.x))) < 30, 'The minions come out of the castle gates');
  assert(!game.toggleTrainingMinions() && game.minions.length === 0, 'Switching minions off clears them');
  assert(game.toggleTrainingTowers() && game.battlefield.trainingTowers.length === 4, 'N / the TOWERS button puts two defence towers per side on the lane');
  const redTower = game.battlefield.trainingTowers.find((t) => t.team === 'red');
  assert(redTower.maxHp === 260 && redTower.shootCooldown === 1.25 && redTower.damage === 18 && game.getHostileTargets('blue').includes(redTower), 'Lane towers use the Unity values and can be attacked');
  game.render();
  assert(!game.toggleTrainingTowers() && !game.getHostileTargets('blue').includes(redTower), 'Switching towers off removes them');
}

// Focus: a rising aura while charging; tapping the own Wizard or profile bar transforms.
{
  game.selectTrainingMap('waterfalls');
  const P = game.player;
  P.x = 400; P.z = .6; P.elevation = 0; game.battlefield.placeOnSurface(P);
  P.focus = P.maxFocus * .6; P.focusTransformTimer = 0;
  game.render();
  assert(!game.tryTransformByTap({ x: P.x, y: P.y - 40 }), 'Below full Focus, tapping the Wizard does not transform');
  P.focus = P.maxFocus;
  game.render();
  assert(!game.tryTransformByTap({ x: P.x + 200, y: P.y - 40 }) && P.focusTransformTimer === 0, 'Tapping beside the Wizard does not transform');
  assert(game.tryTransformByTap({ x: P.x + 5, y: P.y - 40 }) && P.focusTransformTimer > 0, 'With full Focus, tapping your own Wizard transforms');
  game.render();
  P.focusTransformTimer = 0; P.focus = P.maxFocus;
  ui.update(1 / 60, P, game.hudOpponent(), game.battlefield);
  assert(game.activateFocusTransformation() && P.focusTransformTimer > 0, 'The profile bar / ✦ button path activates the transformation too');
  P.focusTransformTimer = 0; P.focus = 0;
  // Body forms render without errors (skeleton guardian, nine tails).
  const { spells: spellSystem } = await import('./public/src/spells.js');
  spellSystem.cast(P, spellSystem.resolveSpell([{ id: 'buff_B02' }]), game);
  for (let i = 0; i < 20; i++) P.update(1 / 60, { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false }, game.battlefield, game);
  game.render();
  assert(P.eidolonTimer > 0 && P.eidolonAge > .2, 'The Eidolon guardian builds up over time while the mantle lasts');
  spellSystem.cast(P, spellSystem.resolveSpell([{ id: 'buff_B01' }]), game);
  assert(P.ninefoldTimer === 0 && P.eidolonTimer > 0, 'Only one buff transformation at a time: Risswild is refused while Arkengestell lasts');
  P.eidolonTimer = 0; P.update(1 / 60, { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false }, game.battlefield, game);
  spellSystem.cast(P, spellSystem.resolveSpell([{ id: 'buff_B01' }]), game);
  game.render();
  assert(P.ninefoldTimer > 0 && P.eidolonTimer === 0, 'After it ends, Risswild takes over and renders');
  P.ninefoldTimer = 0;
  // Form techniques: six charged heavies (forward / up / down × short / full)
  // per transformation and manifest — no extra rune card is ever added.
  const { FORM_MOVESETS, FULL_CHARGE_TIME, activeMoveset } = await import('./public/src/form_moves.js');
  const neutralInput = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const resetForm = () => { spellSystem.clearRuntime(); P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true; P.elevation = 0; P.chargeTimer = 0; P.formCharge = null; P.facing = 1; P.x = 300; P.z = .5; P.ninefoldTimer = 0; P.eidolonTimer = 0; P.focusTransformTimer = 0; game.battlefield.placeOnSurface(P); };
  const formTarget = game.trainingDummy; formTarget.homeX = formTarget.x = 400; formTarget.homeZ = formTarget.z = .5;
  const chargeAndRelease = (dir, full) => {
    P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true;
    if (!P.beginCharge(dir)) return null;
    P.formCharge.elapsed = full ? FULL_CHARGE_TIME + .05 : .3;
    return P.releaseCharge() ? P.lastFormTechnique : null;
  };
  const forms = { ninefold: () => { P.ninefoldTimer = 8; }, eidolon: () => { P.eidolonTimer = 8; }, ascendant: () => { P.focus = P.maxFocus; P.focusTransformTimer = 10; } };
  const released = [];
  for (const [formId, enable] of Object.entries(forms)) {
    for (const dir of ['forward', 'up', 'down']) {
      for (const full of [false, true]) {
        resetForm(); enable();
        const name = chargeAndRelease(dir, full);
        for (let i = 0; i < 80; i++) spellSystem.update(1 / 60, game);
        game.render();
        if (name === FORM_MOVESETS[formId][dir][full ? 'full' : 'short'].name) released.push(`${formId}:${dir}:${full}`);
      }
    }
  }
  assert(released.length === 18, `Every transformation / manifest has six charged techniques (forward / up / down × short / full): ${released.length}/18`);
  resetForm(); P.ninefoldTimer = 8;
  chargeAndRelease('forward', true);
  assert(spellSystem.activeSpells.some((s) => s.isBeam && s.profile?.vfx === 'rift'), 'A full forward heavy in Risswild fires the broad rift beam');
  resetForm(); P.ninefoldTimer = 8;
  const hpBeforeBomb = formTarget.hp;
  chargeAndRelease('forward', false);
  const bomb = spellSystem.activeSpells.find((s) => s.constructor.name === 'BeastBombSpell');
  for (let i = 0; i < 90 && bomb && !bomb.exploded; i++) spellSystem.update(1 / 60, game);
  assert(bomb?.exploded && formTarget.hp < hpBeforeBomb, 'A short forward heavy hurls the rift core, which explodes on the first enemy');
  resetForm(); P.eidolonTimer = 8;
  chargeAndRelease('forward', false);
  const shortArrow = spellSystem.activeSpells.find((s) => s.constructor.name === 'SpiritArrowSpell');
  assert(shortArrow && !shortArrow.pierce, 'A short forward heavy in the Eidolon form looses a single spectral arrow (no pierce)');
  resetForm(); P.eidolonTimer = 8;
  chargeAndRelease('forward', true);
  const siegeArrow = spellSystem.activeSpells.find((s) => s.constructor.name === 'SpiritArrowSpell');
  assert(siegeArrow?.pierce && siegeArrow.explodeAtEnd, 'A full forward heavy looses the piercing Astral Siege Arrow that explodes at max range');
  resetForm(); P.focus = P.maxFocus; P.focusTransformTimer = 10; P.ninefoldTimer = 8;
  assert(activeMoveset(P) === 'ninefold', 'A manifest overrides the transformation moveset while it lasts');
  P.ninefoldTimer = 0;
  assert(activeMoveset(P) === 'ascendant', 'Afterwards the transformation moveset returns');
  resetForm(); P.ninefoldTimer = 8;
  P.beginCharge('forward'); P.formCharge.elapsed = 2; P.update(1 / 60, neutralInput, game.battlefield, game);
  assert(P.formCharge && P.chargeTimer > 0, 'A FULL form charge can be held (no automatic release at the threshold)');
  P.releaseCharge();
  resetForm(); P.eidolonTimer = 8;
  game.input.keys.KeyW = true;
  windowListeners.keydown?.({ code: 'KeyK', repeat: false, preventDefault() {} });
  game.input.keys.KeyW = false;
  assert(P.chargeDir === 'up' && P.formCharge, 'K + W charges the UP technique on the keyboard');
  P.formCharge.elapsed = FULL_CHARGE_TIME + .1;
  windowListeners.keyup?.({ code: 'KeyK', preventDefault() {} });
  assert(P.lastFormTechnique === 'LICHTSPALTER', 'Releasing K fires the full up technique (Lichtspalter)');
  // Transformations burn the Focus meter instead of running on a timer.
  resetForm();
  const deckBefore = P.runeDeck.length + P.runeHand.length;
  P.focus = P.maxFocus;
  assert(game.activateFocusTransformation() && P.runeDeck.length + P.runeHand.length === deckBefore, 'Transforming adds no extra rune card to deck or hand');
  for (let i = 0; i < 60; i++) P.update(1 / 60, neutralInput, game.battlefield, game);
  const afterSecond = P.focus;
  assert(P.focusTransformTimer > 0 && Math.abs(afterSecond - (P.maxFocus - 1.5)) < .05, 'While transformed the Focus meter drains 1.5 per second (Unity value)');
  P.focus = 60; P.focusTransformTimer = 40;
  P.gainFocus(20, 'COMBO');
  assert(Math.abs(P.focus - 70) < .01 && Math.abs(P.focusTransformTimer - 70 / 1.5) < .01, 'Combos refill the meter at half rate and extend the transformation');
  P.focus = .02; P.update(1 / 60, neutralInput, game.battlefield, game);
  assert(P.focusTransformTimer === 0 && P.focus === 0, 'The transformation ends when the Focus meter is empty');
  resetForm();
  // Movement values ported from the Unity project (24 px per unit, 60 Hz).
  const { UNITY_MOVEMENT } = await import('./public/src/entities.js');
  resetForm();
  assert(P.moveSpeed === 144 && Math.abs(P.depthSpeed - .65) < 1e-9 && P.jumpForce === 324 && UNITY_MOVEMENT.gravity === 816, 'Walk 6 u/s and depth 3.9 u/s from the Unity asset; the jump is raised (13.5 u/s, 34 u/s²)');
  P.performJump();
  let apex = 0; let airTicks = 0;
  for (let i = 0; i < 120; i++) { P.update(1 / 60, neutralInput, game.battlefield, game); apex = Math.max(apex, P.elevation); airTicks++; if (P.grounded && i > 2) break; }
  assert(Math.abs(apex - 64.3) < 4 && Math.abs(airTicks / 60 - .79) < .06, `A jump peaks at ~0.73 hero heights (${apex.toFixed(1)} px) and lasts ~0.79 s (${(airTicks / 60).toFixed(2)} s)`);
  resetForm(); P.backdashCooldown = 0; P.backdashSuppressTimer = 0;
  const dashFrom = P.x;
  P.triggerBackdash();
  for (let i = 0; i < 24; i++) P.update(1 / 60, neutralInput, game.battlefield, game);
  assert(Math.abs(Math.abs(P.x - dashFrom) - 81.6) < 5, `The backdash covers 3.4 u (${Math.abs(P.x - dashFrom).toFixed(1)} px) over 18 ticks — farther than the original 1.5 u`);
  resetForm();
  // The body forms move with the Wizard: running makes them lean / stream.
  resetForm();
  const runInput = { ...neutralInput, move: { x: 1, z: 0 } };
  for (let i = 0; i < 40; i++) P.update(1 / 60, runInput, game.battlefield, game);
  assert(P.formLean > .4 && P.formMotion().lean === P.formLean, 'Running makes the body forms lean and stream with the Wizard');
  for (let i = 0; i < 60; i++) P.update(1 / 60, neutralInput, game.battlefield, game);
  assert(Math.abs(P.formLean) < .15, 'Standing still lets the body forms settle again');
  game.render();
  P.eidolonTimer = 0; P.ninefoldTimer = 0;
  // Grimoire: tapping a recipe explains what it does and how to cast it.
  const detailHtml = document.getElementById('fusion-guide').innerHTML;
  assert(detailHtml.includes('data-detail="gravity_lift"') && detailHtml.includes('ATTACK FORWARD to throw') && detailHtml.includes('HOW TO CAST'), 'The grimoire explains every recipe (e.g. Gravity Lift: throw / pull / slam)');
}

// Training: a PASSIVE sparring partner to test spells on a movable target.
{
  game.selectTrainingMap('waterfalls');
  const P = game.player; const E = game.enemyChampion;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  assert(!game.toggleSparringPassive(), 'Without a partner there is nothing to switch to passive');
  assert(game.toggleSparringPartner() && !game.modeState.sparringPassive, 'The sparring partner joins and fights');
  assert(game.toggleSparringPassive() && game.modeState.sparringPassive && E.passive, 'The PARTNER button (O) switches it to PASSIVE (no actions)');
  P.x = 300; P.z = .58; game.battlefield.placeOnSurface(P);
  E.x = 420; E.z = .58; E.elevation = 0; E.vx = 0; game.battlefield.placeOnSurface(E);
  const startX = E.x;
  for (let i = 0; i < 90; i++) E.update(1 / 60, game, game.battlefield);
  assert(Math.abs(E.x - startX) < 1 && E.aiMode === 'PASSIVE', 'A passive partner does not walk, attack or cast');
  spells.cast(P, { id: 'gravity_lift', tier: 2 }, game, null, { x: 420, z: .58 });
  let maxLift = 0;
  for (let i = 0; i < 50; i++) { spells.update(1 / 60, game); E.update(1 / 60, game, game.battlefield); maxLift = Math.max(maxLift, E.elevation); }
  assert(maxLift > 50, `Gravity Lift visibly raises the passive partner (${Math.round(maxLift)} px)`);
  E.takeDamage(99999, 0, 0, .1);
  assert(E.isAlive && E.hp >= 1, 'A passive training partner cannot die');
  for (let i = 0; i < 200; i++) E.update(1 / 60, game, game.battlefield);
  assert(E.hp === E.maxHp, 'Its health refills after a short pause');
  assert(!game.toggleSparringPassive() && !E.passive, 'The PARTNER button switches it back to ACTIVE');
  game.toggleSparringPassive();
  assert(!game.toggleSparringPartner() && !game.modeState.sparring && !E.passive, 'Removing the partner also ends passive mode');
  spells.clearRuntime();
  void neutral;
}

// Training: pickup weapons (Little Fighter style) — crates, combos, throwing.
{
  const { environment } = await import('./public/src/environment.js');
  const { WEAPONS, WEAPON_IDS } = await import('./public/src/weapons.js');
  game.selectTrainingMap('waterfalls');
  const P = game.player;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const ready = () => { P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true; P.elevation = 0; P.sprintActive = false; };
  assert(WEAPON_IDS.length >= 10 && WEAPON_IDS.every((id) => WEAPONS[id].combo.length >= 2 && WEAPONS[id].heavy && WEAPONS[id].uppercut), 'At least ten weapon profiles with their own combo, heavy and uppercut');
  game.armory.crateTimer = 0;
  const crate = game.armory.update(1 / 60, environment, game.battlefield.boundsOverride, () => 'spear');
  assert(crate?.weaponId === 'spear', 'Weapon crates appear on the training field now and then');
  crate.takeDamage(999, 0, 0, 0, false, 'melee');
  environment.update(1 / 60, game, []);
  const dropped = game.armory.pickups.find((p) => p.weapon === 'spear');
  assert(dropped && Math.abs(dropped.x - crate.x) < 1, 'Breaking a weapon crate drops its weapon');
  P.x = dropped.x; P.z = dropped.z; game.battlefield.placeOnSurface(P); ready();
  assert(P.executeAttack(neutral, 'normal') && P.weapon === 'spear' && !game.armory.pickups.includes(dropped), 'Attacking while standing on a weapon picks it up');
  // The spear reaches further than the default 78 px.
  const dummy = game.trainingDummy; dummy.homeX = dummy.x = P.x + 108; dummy.homeZ = dummy.z = P.z; P.facing = 1;
  const before = dummy.hp; ready();
  P.executeAttack(neutral, 'normal');
  assert(dummy.hp < before, 'The spear hits at long reach (~110 px)');
  // Dual swords: a five-hit chain.
  P.equipWeapon('dual_swords'); P.comboStep = 0;
  dummy.homeX = dummy.x = P.x + 24; dummy.hp = dummy.maxHp; // the chain only continues while it hits
  const states = [];
  for (let i = 0; i < 5; i++) { ready(); P.executeAttack(neutral, 'normal'); states.push(P.comboStep); }
  assert(states.join(',') === '1,2,3,4,5', 'Dual swords chain five strikes before the combo restarts');
  // Throwing: sprint + attack; the weapon flies, hits and lands to be picked up again.
  // Fixed free lane (no crates / barrels between thrower and dummy).
  P.x = 300; P.z = .5; game.battlefield.placeOnSurface(P); P.facing = 1;
  P.equipWeapon('great_axe'); ready(); P.sprintActive = true;
  dummy.homeX = dummy.x = P.x + 120; dummy.homeZ = dummy.z = P.z;
  const hpThrow = dummy.hp;
  assert(P.executeAttack(neutral, 'normal') && !P.weapon && spells.activeSpells.some((s) => s.constructor.name === 'ThrownWeaponSpell'), 'Sprint + attack throws the held weapon');
  for (let i = 0; i < 150; i++) spells.update(1 / 60, game);
  const landed = game.armory.pickups.find((p) => p.weapon === 'great_axe');
  assert(dummy.hp < hpThrow && landed, 'The thrown weapon hits and lands on the field');
  P.x = landed.x; P.z = landed.z; game.battlefield.placeOnSurface(P); ready();
  assert(P.executeAttack(neutral, 'normal') && P.weapon === 'great_axe', 'A thrown weapon can be picked up again');
  // Conjured ice sword: the finisher freezes; it shatters after its hits.
  P.equipWeapon('ice_sword'); P.comboStep = 0;
  dummy.homeX = dummy.x = P.x + 50; dummy.homeZ = dummy.z = P.z;
  let frozen = false; const freezeTarget = dummy; freezeTarget.freeze = () => { frozen = true; };
  for (let i = 0; i < 3; i++) { ready(); P.executeAttack(neutral, 'normal'); }
  assert(frozen && P.weaponDurability < WEAPONS.ice_sword.durability, 'The ice sword finisher freezes and wears the blade down');
  P.weaponDurability = 1; ready(); P.executeAttack(neutral, 'normal');
  assert(!P.weapon, 'The ice sword shatters after its last hit');
  delete freezeTarget.freeze;
  // A held weapon falls to the ground when the Wizard dies.
  P.equipWeapon('katana'); const count = game.armory.pickups.length;
  P.beginDeath();
  assert(!P.weapon && game.armory.pickups.length === count + 1, 'A held weapon is dropped on death');
  game.render();
  game.selectTrainingMap('waterfalls');
}

// Sprint attack (sprint punisher) vs. throwing a picked-up field weapon.
{
  const { FORM_SPRINT_ATTACKS } = await import('./public/src/form_actions.js');
  game.selectTrainingMap('waterfalls');
  const P = game.player; const E = game.enemyChampion;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const thrownCount = () => spells.activeSpells.filter((s) => s.constructor.name === 'ThrownWeaponSpell').length;
  const sprintReady = () => { P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true; P.elevation = 0; P.facing = 1; P.sprintActive = true; P.sprintDir = 1; P.vx = 0; P.lastSprintAttack = null; };
  game.toggleSparringPartner(); game.toggleSparringPassive();
  const placePartner = (dx) => { P.x = 300; P.z = .58; game.battlefield.placeOnSurface(P); E.x = P.x + dx; E.z = .58; E.elevation = 0; E.vx = 0; E.kbVelX = 0; E.hp = E.maxHp; E.state = 'idle'; game.battlefield.placeOnSurface(E); };
  // Bare hands: the Unity sprint attack, advancing until it connects.
  P.equipWeapon(null); P.equipClassWeapon(null);
  placePartner(118); sprintReady();
  assert(P.executeAttack(neutral, 'normal') && P.lastSprintAttack === 'SPRINT ATTACK' && P.state === 'heavyStrike' && !P.sprintActive, 'Sprint + attack without a field weapon is the Sprint Attack');
  assert(E.hp === E.maxHp, 'The partner starts just out of reach');
  const recoilStart = E.x;
  for (let i = 0; i < 30; i++) { P.update(1 / 60, neutral, game.battlefield, game); E.update(1 / 60, game, game.battlefield); }
  assert(E.hp < E.maxHp, 'The Sprint Attack keeps advancing until it connects');
  for (let i = 0; i < 30; i++) { P.update(1 / 60, neutral, game.battlefield, game); E.update(1 / 60, game, game.battlefield); }
  assert(E.x - recoilStart > 28 && E.elevation < 5, `A clean hit drives the target back along the ground (${Math.round(E.x - recoilStart)} px, no launch)`);
  // Keyboard: J during a sprint must reach the attack before the sprint ends.
  placePartner(400); sprintReady();
  const pressJ = { ...neutral, keys: { KeyD: true }, move: { x: 1, z: 0 }, justPressed: (k) => k === 'KeyJ' };
  P.update(1 / 60, pressJ, game.battlefield, game);
  assert(P.lastSprintAttack === 'SPRINT ATTACK', 'Pressing J while sprinting triggers the Sprint Attack on the keyboard too');
  // A class weapon is part of the Wizard: never thrown, its heavy powers the sprint attack.
  P.equipClassWeapon('katana'); placePartner(400); sprintReady();
  const before = thrownCount();
  assert(P.executeAttack(neutral, 'normal') && P.lastSprintAttack === 'IAI-DURCHZUG' && P.classWeapon === 'katana' && thrownCount() === before, 'The class weapon is never thrown: sprint + attack is the weapon own sprint attack (katana: IAI-DURCHZUG)');
  // A picked-up field weapon overrides the class moveset and can be thrown.
  P.equipWeapon('great_axe');
  assert(P.weaponProfile?.name === 'GREAT AXE', 'A picked-up field weapon takes over the moveset');
  sprintReady();
  assert(P.executeAttack(neutral, 'normal') && !P.weapon && thrownCount() === before + 1 && P.lastSprintAttack === null, 'Sprint + attack throws the field weapon (Little Fighter style)');
  assert(P.weaponProfile?.name === 'KATANA', 'After the throw the class weapon moveset returns');
  P.beginDeath();
  assert(P.classWeapon === 'katana' && !game.armory.pickups.some((pk) => pk.weapon === 'katana'), 'The class weapon is not dropped on death');
  P.equipClassWeapon(null);
  // Form variants of the sprint attack.
  const dummy = game.trainingDummy;
  const step = (n) => { for (let i = 0; i < n; i++) { P.update(1 / 60, neutral, game.battlefield, game); E.update(1 / 60, game, game.battlefield); spells.update(1 / 60, game); } };
  const formReady = (form) => { spells.clearRuntime(); if (!P.isAlive) P.respawn(game.battlefield); P.ninefoldTimer = form === 'ninefold' ? 20 : 0; P.eidolonTimer = form === 'eidolon' ? 20 : 0; P.focusTransformTimer = form === 'ascendant' ? 20 : 0; P.focus = form === 'ascendant' ? P.maxFocus : 0; P.hp = P.maxHp; };
  const placeDummy = (dx) => { dummy.homeX = dummy.x = P.x + dx; dummy.homeZ = dummy.z = P.z; dummy.hp = dummy.maxHp; };
  // Ninefold: Beast Pounce — leaps, long reach, carries further than the base sprint attack.
  formReady('ninefold'); placePartner(150); placeDummy(600); sprintReady();
  P.executeAttack(neutral, 'normal');
  assert(P.lastSprintAttack === 'BEAST POUNCE' && spells.activeSpells.some((sp) => sp.constructor.name === 'FormSprintAttackFx'), 'Ninefold: sprint + attack is the Beast Pounce with its chakra claw');
  let peak = 0;
  for (let i = 0; i < 24; i++) { step(1); peak = Math.max(peak, P.elevation); }
  assert(peak > 8 && E.hp < E.maxHp, `The Beast Pounce leaps (${Math.round(peak)} px) and strikes with long reach`);
  step(60);
  assert(!P.sprintStrike && !spells.activeSpells.some((sp) => sp.constructor.name === 'FormSprintAttackFx'), 'The claw dissolves when the pounce ends');
  // Eidolon: Colossus Breaker — slow wind-up, far push, shoves the enemy behind, long recovery.
  formReady('eidolon'); placePartner(120); placeDummy(120 + 70); sprintReady();
  P.executeAttack(neutral, 'normal');
  assert(P.lastSprintAttack === 'KOLOSSSTOSS' || P.lastSprintAttack === 'KOLOSSSTOß', 'Arkengestell: sprint + attack is the Kolossstoß');
  step(10);
  assert(E.hp === E.maxHp, 'The Colossus Breaker winds up before the fist flies');
  const breakerStart = E.x;
  step(30);
  assert(E.hp < E.maxHp && dummy.hp < dummy.maxHp, 'The astral fist hits and its pressure shoves the enemy standing behind');
  step(40);
  assert(E.x - breakerStart > 40, `The Colossus Breaker pushes far (${Math.round(E.x - breakerStart)} px)`);
  const T = FORM_SPRINT_ATTACKS;
  assert(T.eidolon.windup + T.eidolon.recovery > T.ninefold.windup + T.ninefold.recovery + .2 && T.eidolon.recoilMult === 1.65 && T.ninefold.carryMult === 1.5, 'Breaker: clearly longer wind-up and recovery than the Pounce; Unity bond multipliers (carry ×1.5, push ×1.65)');
  // Ascendant: Radiant Lunge — pierces and hits every enemy on its path once.
  formReady('ascendant'); placePartner(60); placeDummy(130); sprintReady();
  P.executeAttack(neutral, 'normal');
  assert(P.lastSprintAttack === 'RADIANT LUNGE', 'Ascendant: sprint + attack is the Radiant Lunge');
  const hpAfter = () => [E.hp, dummy.hp];
  step(30);
  const [eHp, dHp] = hpAfter();
  assert(eHp < E.maxHp && dHp < dummy.maxHp, 'The Radiant Lunge passes through and hits every enemy on its path');
  step(30);
  assert(E.hp === eHp, 'Each enemy is struck only once per lunge');
  formReady(null);
  dummy.homeX = dummy.x = 400;
  game.render();
  spells.clearRuntime();
  game.selectTrainingMap('waterfalls');
}

// Light & shadow: Shadow Stomper, sky spheres, shadow doubles, revenants
// and the round ground shadows under every actor.
{
  const { environment } = await import('./public/src/environment.js');
  const { sky } = await import('./public/src/sky.js');
  const { shadowFor } = await import('./public/src/shadows.js');
  const { Minion } = await import('./public/src/entities.js');
  const { needsTarget } = await import('./public/src/targeting.js');
  const { isSpecialRune } = await import('./public/src/spell_catalog.js');
  game.selectTrainingMap('waterfalls');
  const P = game.player; const E = game.enemyChampion;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const stepSpells = (seconds) => { for (let t = 0; t < seconds; t += 1 / 60) spells.update(1 / 60, game); };
  const savedMods = { ...P.buildModifiers };
  const reset = () => {
    spells.clearRuntime(); environment.clear(); game.minions = []; game.targeting.cancel();
    P.buildModifiers = { ...savedMods };
    P.x = 300; P.z = .5; P.facing = 1; P.mp = P.maxMp; P.hp = P.maxHp; P.state = 'idle'; P.stateTimer = 0; P.grounded = true; P.elevation = 0; P.vElevation = 0;
    P.rootTimer = 0; P.backdashTimer = 0; P.backdashCooldown = 0; P.sprintActive = false; P.isGuarding = false;
    game.battlefield.placeOnSurface(P);
    E.lifeState = 'Alive'; E.x = 900; E.z = .5; E.hp = E.maxHp; E.state = 'idle'; E.isGuarding = false; E.rootTimer = 0; E.elevation = 0; E.facing = -1;
    game.battlefield.placeOnSurface(E);
  };
  const foe = (x, z) => { const m = new Minion(x, z, 'red', 'melee', 0); game.battlefield.placeOnSurface(m); game.minions.push(m); return m; };
  const stomper = spells.resolveSpell([{ id: 'terra' }, { id: 'umbra' }]);
  const holdOf = () => spells.activeSpells.find((spell) => spell.heldTargets);

  // 1. The stomp sends the shadow to the nearest enemy inside the aimed cone.
  reset();
  assert(stomper.targetingMode === 'aim' && needsTarget(stomper), 'Shadow Stomper asks for an aim direction (cone) before it is cast');
  const behind = foe(170, .5); const ahead = foe(400, .5); foe(470, .5);
  spells.cast(P, stomper, game, null, { x: 520, z: .5, aim: true });
  assert(P.vElevation > 0, 'The caster hops for the stomp');
  stepSpells(1);
  assert(holdOf()?.heldTargets.length === 1 && holdOf().heldTargets[0] === ahead && ahead.rootTimer > 0 && behind.rootTimer !== ahead.rootTimer, 'The shadow grabs the nearest enemy in the aimed cone, not one behind the caster');
  const heldX = ahead.x; ahead.x += 60; ahead.z += .1; stepSpells(1 / 60);
  assert(ahead.x === heldX && Math.abs(ahead.z - .5) < 1e-9, 'A held enemy cannot move away from its shadow');
  stepSpells(3.2);
  assert(ahead.rootTimer === 0 && !holdOf(), 'The hold ends after its duration and releases the target');

  // 2. The aim includes depth.
  reset();
  const rear = foe(340, .1); const front = foe(340, .9);
  spells.cast(P, stomper, game, null, { x: 330, z: .95, aim: true });
  stepSpells(1);
  assert(holdOf()?.heldTargets[0] === front && !rear.rootTimer, 'Aiming toward the near lane grabs the enemy there (depth-aware cone)');

  // 3. A guarding enemy slips free; the next one in the cone is taken instead.
  reset();
  E.x = 390; E.isGuarding = true; game.battlefield.placeOnSurface(E);
  const second = foe(450, .5);
  spells.cast(P, stomper, game, null, { x: 600, z: .5, aim: true });
  stepSpells(1);
  assert(holdOf()?.heldTargets[0] === second && !E.rootTimer, 'A guarding enemy is not grabbed; the shadow takes the next target');
  E.isGuarding = false;

  // 4. Held player: no walking, jumping or dashing.
  reset();
  E.x = 420; game.battlefield.placeOnSurface(E);
  spells.cast(E, stomper, game, null, { x: P.x, z: P.z, aim: true });
  stepSpells(1);
  const startX = P.x;
  const walkRight = { ...neutral, move: { x: 1, z: 0 } };
  for (let i = 0; i < 20; i++) { P.update(1 / 60, walkRight, game.battlefield, game); spells.update(1 / 60, game); }
  P.performJump();
  assert(P.rootTimer > 0 && Math.abs(P.x - startX) < 1 && P.vElevation <= 0 && !P.triggerBackdash(), 'A held player can neither walk, jump nor dash');

  // 5. Shadow Weaver holds more targets; a Lunar Orb adds one more.
  reset();
  P.buildModifiers = { ...savedMods, bindTargets: 1 };
  for (const x of [380, 430, 480]) foe(x, .5);
  spells.cast(P, stomper, game, null, { x: 600, z: .5, aim: true });
  stepSpells(1);
  assert(holdOf()?.heldTargets.length === 2, 'Shadow Weaver: the stomp holds two enemies at once');
  for (const spell of spells.activeSpells) for (const t of spell.tendrils ?? []) spell.release?.(t);
  stepSpells(.5);
  sky.cast(P, 'lunar_orb', { duration: 1 }, game);
  spells.cast(P, stomper, game, null, { x: 600, z: .5, aim: true });
  stepSpells(1);
  assert(holdOf()?.heldTargets.length === 3, 'Under a Lunar Orb the long shadows hold one more target');

  // 6. Sky spheres: one at a time, they strengthen / weaken elements and fade.
  reset();
  const fireball = spells.resolveSpell([{ id: 'ignis' }]);
  const nova = spells.resolveSpell([{ id: 'aqua' }]);
  const plainFire = spells.applyCasterModifiers(P, fireball, 'B').power;
  sky.cast(P, 'solar_orb', { duration: 1 }, game);
  assert(sky.active?.id === 'solar_orb' && spells.applyCasterModifiers(P, fireball, 'B').power > plainFire && sky.powerMultiplier(nova) < 1 && sky.powerMultiplier(stomper) < 1, 'A Solar Orb strengthens fire, weakens ice and shadow magic');
  sky.cast(P, 'lunar_orb', { duration: 1 }, game);
  assert(sky.active?.id === 'lunar_orb' && sky.powerMultiplier(nova) > 1 && sky.powerMultiplier(fireball) < 1 && environment.skyMods?.waterSlow < 1, 'A new sphere replaces the old one (Lunar Orb: water and ice stronger, the tide slows waders)');
  stepSpells(1);
  assert(sky.shadowStyle().scale > 1.3, 'Under the moon every shadow grows');
  stepSpells(17);
  assert(!sky.active && !environment.skyMods, 'The sphere fades after its duration and its effects end');
  sky.cast(P, 'blood_moon', { duration: 1 }, game);
  assert(sky.healMultiplier() === .5 && spells.applyCasterModifiers(P, fireball, 'B').power > plainFire, 'Blood Moon: every spell hits harder, healing is halved');
  // The only enemy on the field (the champion is down) must be struck.
  E.lifeState = 'Dead';
  const struck = foe(420, .5); const struckHp = struck.hp;
  sky.cast(P, 'thunderhead', { duration: 1 }, game);
  stepSpells(3);
  assert(struck.hp < struckHp || struck.isDead, 'Thunderhead strikes enemies with lightning');
  E.lifeState = 'Alive';
  sky.clear();

  // 7. Ground shadows: on the ground at the real depth, smaller when jumping.
  reset();
  const grounded = shadowFor(P);
  P.elevation = 160;
  const airborne = shadowFor(P);
  assert(airborne.rx < grounded.rx * .6 && airborne.alpha < grounded.alpha && airborne.y === grounded.y, 'A jumping fighter\'s shadow stays on the ground at its depth, smaller and lighter');
  P.elevation = 0;
  assert(shadowFor(P, { scale: 1.45, stretch: 1.35 }).rx > grounded.rx && shadowFor(P, { scale: .62 }).rx < grounded.rx, 'The sky scales shadows (moon longer, sun shorter)');
  foe(500, .5);
  spells.cast(P, spells.resolveSpell([{ id: 'bestia' }]), game);
  const casters = game.shadowCasters();
  assert(casters.includes(P) && casters.some((a) => a.isMinion) && casters.some((a) => a.isSummon), 'Player, minions and summons all cast a round shadow');

  // 8. Shadow Doppelganger: own (lower) health, recast replaces, passive keeps more.
  reset();
  const doppel = spells.resolveSpell([{ id: 'doppel' }]);
  assert(isSpecialRune('doppel') && isSpecialRune('mortis') && doppel.isSpecial, 'DOPPEL and MORTIS are special runes that never fuse');
  spells.cast(P, doppel, game);
  const doubles = () => spells.getSummons('blue').filter((s) => s.definition.role === 'doppel');
  const first = doubles()[0];
  assert(doubles().length === 1 && first.mimicKey === P.heroKey && first.maxHp < P.maxHp * .6 && first.maxHp >= P.maxHp * .3, 'A shadow double copies the caster with its own, lower health');
  spells.cast(P, doppel, game);
  assert(doubles().length === 1 && doubles()[0] !== first && first.dismissed, 'Casting again makes the old double vanish and a new one appear');
  P.buildModifiers = { ...savedMods, extraDoppels: 2 };
  spells.cast(P, doppel, game); spells.cast(P, doppel, game); spells.cast(P, doppel, game);
  assert(doubles().length === 3, 'Mirror Legion + Shadow Army keep three doubles (one cast each)');
  game.render();

  // 9. Revenant Call: raises the nearest fallen body; it bursts when it breaks.
  reset();
  const revenantDef = spells.resolveSpell([{ id: 'mortis' }]);
  const fallen = foe(360, .5); game.minions = [];
  spells.recordGrave(fallen);
  spells.cast(P, revenantDef, game);
  const revenants = () => spells.getSummons('blue').filter((s) => s.definition.role === 'revenant');
  const rev = revenants()[0];
  assert(rev?.bodyKey === fallen.spriteKey && rev.x === 360 && rev.riseTimer > 0 && spells.graves.length === 0, 'Revenant Call raises the nearest fallen fighter in its own body (the grave is used up)');
  const victim = foe(400, .5); const victimHp = victim.hp;
  rev.riseTimer = 0; rev.takeDamage(9999); stepSpells(1 / 60);
  assert(victim.hp < victimHp && rev.burstDone && !revenants().length, 'A broken revenant bursts and damages nearby enemies');
  spells.cast(P, revenantDef, game);
  assert(revenants()[0]?.bodyKey === 'minion_red_melee', 'Without a grave a nameless fallen soldier rises');
  spells.cast(P, revenantDef, game);
  assert(revenants().length === 1 && revenants()[0].riseTimer > 0, 'Casting again replaces the revenant');
  P.buildModifiers = { ...savedMods, extraRevenants: 1 };
  spells.cast(P, revenantDef, game);
  assert(revenants().length === 2, 'Grave Caller keeps a second revenant bound');
  E.lifeState = 'Dying'; game.noteFallenWizards(); game.noteFallenWizards();
  assert(spells.graves.filter((g) => g.spriteKey === E.heroKey).length === 1, 'A fallen Wizard leaves exactly one grave');
  E.lifeState = 'Alive';

  // 10b. Frost Mirror Gate: two points, step in one, come out of the other.
  reset();
  const gate = spells.resolveSpell([{ id: 'aqua' }, { id: 'void' }]);
  assert(gate?.id === 'mirror_gate' && gate.targetingMode === 'dual' && needsTarget(gate), 'AQUA + VOID forms the Frost Mirror Gate, which asks for two points');
  const gateSlot = { runes: [{ id: 'aqua' }, { id: 'void' }], definition: gate, isCombo: true, quality: 'B', manaCost: 0 };
  game.targeting.begin(gateSlot, 'tap');
  game.targeting.setPoint({ x: 360, z: .5 });
  assert(game.targeting.confirm() && game.targeting.isActive && game.targeting.active.points.length === 1, 'The first confirm only sets the first mirror');
  game.targeting.setPoint({ x: 760, z: .3 });
  game.render();
  assert(game.targeting.confirm() && !game.targeting.isActive, 'The second confirm raises the gate');
  const mirrors = spells.activeSpells.filter((s) => s.isFrostMirror);
  assert(mirrors.length === 2 && Math.abs(mirrors[1].x - 760) < 1 && Math.abs(mirrors[1].z - .3) < .01, 'Two ice mirrors stand at the chosen points');
  P.x = mirrors[0].x - 60; P.z = mirrors[0].z; P._mirrorArrival = null;
  stepSpells(1 / 60);
  assert(Math.abs(P.x - (mirrors[0].x - 60)) < 1, 'Standing next to a mirror does nothing');
  P.x = mirrors[0].x; P.z = mirrors[0].z;
  stepSpells(1 / 60);
  assert(Math.abs(P.x - 760) < 1 && Math.abs(P.z - .3) < .01, 'Stepping into a mirror brings the Wizard out of the other one');
  stepSpells(.5);
  assert(Math.abs(P.x - 760) < 1, 'The arrival mirror does not send the traveller straight back');
  P.x += 80; stepSpells(1 / 60); P.x = mirrors[1].x; P.z = mirrors[1].z; stepSpells(1 / 60);
  assert(Math.abs(P.x - mirrors[0].x) < 1, 'After stepping off, the gate works the other way too');
  const foeTraveller = foe(mirrors[0].x, mirrors[0].z); const foeX = foeTraveller.x;
  stepSpells(1 / 60);
  assert(foeTraveller.x === foeX, 'Enemies cannot use the gate');
  stepSpells(31);
  assert(!spells.activeSpells.some((s) => s.isFrostMirror), 'The gate closes after its duration');

  // 10c. Training: a tapped hand rune is pre-drawn as a template; DRAW is free.
  reset();
  P.configureRuneDeck(['lux', 'mortis', 'ignis'].map((id) => recognizer.runes.find((r) => r.id === id)));
  game.startRuneDrawing(P.runeHand[0].cardId);
  assert(game.runeGuide()?.id === 'lux', 'Training: tapping a hand rune shows it as a template to trace');
  game.renderRuneStrokes();
  game.cancelRuneDrawing();
  game.startRuneDrawing();
  assert(game.runeGuide() === null, 'Training: free drawing (DRAW) shows no template');
  game.cancelRuneDrawing();

  // 10d. Regression: casting LUX (Halo Pulse) must not throw while rendering
  // (a negative ring radius froze the whole game loop).
  reset();
  const strictCtx = new Proxy({}, { get: (t, p) => (p === 'ellipse' || p === 'arc') ? (x, y, rx, ry) => { if (rx < 0 || (p === 'ellipse' && ry < 0)) throw new Error('IndexSizeError'); } : (p === 'canvas' ? undefined : () => {}), set: () => true });
  spells.cast(P, spells.resolveSpell([{ id: 'lux' }]), game, 'S');
  const halo = spells.activeSpells.find((s) => s.constructor.name === 'HaloPulseSpell');
  let haloThrew = false;
  try { halo.render(strictCtx); stepSpells(1 / 60); halo.render(strictCtx); } catch { haloThrew = true; }
  assert(halo && !haloThrew, 'Casting LUX (Halo Pulse) renders without errors at any rune grade');
  const broken = { z: .5, render() { throw new Error('boom'); }, update() {}, isFinished: false };
  const silence = console.error; console.error = () => {};
  spells.renderBatch(strictCtx, [broken]);
  console.error = silence;
  assert(broken.isFinished, 'A spell whose drawing fails is removed instead of freezing the game loop');
  const guideHtml = document.getElementById('fusion-guide').innerHTML;
  assert(guideHtml.includes('🕳️ VOID</span> + <span class="g-rune" style="--rune-color:#8e24aa">🕳️ VOID</span> = <strong>NULL RAY') && guideHtml.includes('FROST MIRROR GATE') && guideHtml.includes('SHADOW STOMPER') && guideHtml.includes('☀ LUX') && !guideHtml.includes('ANNIHILATION'), 'The grimoire lists every fusion from the recipes with rune icon and name (incl. NULL RAY = VOID + VOID)');
  assert(document.getElementById('rune-glyph-guide').innerHTML.includes('MORTIS') && document.getElementById('rune-glyph-guide').innerHTML.includes('special rune'), 'The grimoire lists every rune gesture, special runes marked');

  // 10. Aiming through the slot: the cone preview marks the auto-target.
  reset();
  const marked = foe(420, .5);
  const slot = { runes: [{ id: 'terra' }, { id: 'umbra' }], definition: stomper, isCombo: true, quality: 'B', manaCost: 0 };
  game.targeting.begin(slot, 'tap');
  game.targeting.setPoint({ x: 560, z: .5 });
  assert(game.targeting.active.mode === 'aim' && game.targeting.aimPreview().targets[0] === marked, 'The aim cone highlights the enemy the shadow will grab');
  game.render();
  assert(game.targeting.confirm() && holdOf(), 'Confirming the aim casts Shadow Stomper');
  stepSpells(1);
  assert(marked.rootTimer > 0, 'The previewed enemy is the one held');
  P.buildModifiers = { ...savedMods };
  reset();
}

game.returnToHub();
game.setMatchMode('siege'); game.startMatch();
assert(game.matchState === 'Running' && game.objectivePhase === 'LanePhase', 'A new Siege match can start cleanly after alternate modes');
assert(groundYForDepth(0) === 306, 'Leaving Training restores the Siege ground projection');

// Every screen format shows the identical 16:9 stage, only scaled.
screenSize(1024, 768);
assert(game.renderWidth === 1024 && game.renderHeight === 576 && game.stage.top === 96 && game.stage.width === 1024 && game.uiLayer.style.top === '96px', 'A 4:3 screen shows the same stage with bars above and below');
game.render();
screenSize(2560, 1080);
assert(game.renderWidth === 1024 && game.renderHeight === 576 && game.stage.width === 1920 && game.stage.left === 320 && game.canvas.width === Math.round(1024 * game.deviceScale) && game.deviceScale <= 2.5, 'An ultrawide monitor shows the same stage, scaled up crisply and centred');
game.returnToHub(); game.setMatchMode('training'); game.startMatch();
assert(game.renderWidth === 1024 && game.stage.width === 1920, 'Training uses the same stage framing');
game.returnToHub(); game.setMatchMode('arena'); game.startMatch();
assert(game.renderWidth === 1024 && game.worldOffsetY === 0, 'The Arena uses the same stage framing');
game.returnToHub(); game.setMatchMode('siege'); game.startMatch();
game.render();
screenSize(1024, 576);
assert(game.renderWidth === 1024 && game.renderHeight === 576, 'A 16:9 screen uses the authored 1024×576 view');
// Touch vs. mouse/keyboard is detected from the input actually used.
windowListeners.pointerdown?.({ pointerType: 'touch' });
assert(game.inputMode === 'touch' && game.uiLayer.classList.values.has('input-touch') && !game.uiLayer.classList.values.has('input-desktop'), 'A touch shows the touch layout (joystick)');
windowListeners.pointerdown?.({ pointerType: 'mouse' });
assert(game.inputMode === 'desktop' && game.uiLayer.classList.values.has('input-desktop'), 'Mouse input switches to the desktop layout with keyboard hints');
windowListeners.pointerdown?.({ pointerType: 'touch' });
windowListeners.keydown?.({ code: 'KeyD', repeat: false, preventDefault() {} });
assert(game.inputMode === 'desktop', 'Keyboard input switches a hybrid device back to the desktop layout');

// Castle Siege match rules (Unity MatchRunner): platform ↔ timed lane deploys.
{
  const { SIEGE_RULES, SIEGE_ZONES } = await import('./public/src/siege_match.js');
  game.returnToHub(); game.siegeDeployRules = true; game.setMatchMode('siege'); game.startMatch();
  const M = game.siegeMatch; const P = game.player; const E = game.enemyChampion;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const step = (seconds, input = neutral) => { for (let t = 0; t < seconds; t += 1 / 60) { P.update(1 / 60, input, game.battlefield, game); E.update(1 / 60, game, game.battlefield); M.tick(1 / 60); } };
  const walkRight = { ...neutral, move: { x: 1, z: 0 } }; const walkLeft = { ...neutral, move: { x: -1, z: 0 } };
  E.update = () => {}; // keep the bot still; its own deploys are checked below
  assert(M && M.side('blue').presence === 'OnPlatform' && P.surfaceId === 'blueCastleUpperPlatform', 'Siege starts with the Wizard on its castle platform');
  step(2, walkRight);
  assert(P.x <= SIEGE_ZONES.platform.blue.right + .5 && M.side('blue').presence === 'OnPlatform', 'Platform and lane are not connected: no walking down to the lane');
  assert(M.isSheltered(P) && !game.getHostileMobileTargets('red').includes(P), 'On the platform the Wizard is sheltered: defence towers (and minions) skip it');
  assert(M.canPrepare('blue'), 'Runes can be drawn on the platform');
  assert(game.requestDeploy() && M.side('blue').presence === 'Deployed' && Math.abs(P.x - SIEGE_ZONES.deploy.blue.x) < 1 && M.side('blue').laneTimeLeft === SIEGE_RULES.laneDuration, 'G deploys the Wizard to the lane deploy point for 15 s');
  assert(!M.isSheltered(P) && game.getHostileMobileTargets('red').includes(P), 'On the lane the Wizard is exposed again');
  game.startRuneDrawing();
  assert(!game.drawing.active && !M.canPrepare('blue'), 'On the lane runes cannot be drawn (slotted spells still cast)');
  step(2, walkLeft);
  assert(P.x >= SIEGE_ZONES.lane.left - .5, 'A deployed Wizard cannot walk back up to the castle');
  step(13.2);
  assert(M.side('blue').presence === 'OnPlatform' && P.surfaceId === 'blueCastleUpperPlatform' && Math.abs(M.side('blue').cooldown - SIEGE_RULES.deployCooldown) < .3, 'After 15 s the Wizard is recalled to the platform and Deploy cools down for 12 s');
  assert(!game.requestDeploy() && M.deployLabel('blue').state === 'cooldown', 'Deploy is blocked during its cooldown');
  step(12.1);
  assert(game.requestDeploy(), 'After 12 s the Wizard can deploy again');
  // Death on the lane: respawn after 2.5 s on the platform, Focus 0, slots cleared, full cooldown.
  P.focus = 70; P.beginDeath();
  step(.45 + SIEGE_RULES.respawnDelay + .2);
  assert(P.isAlive && M.side('blue').presence === 'OnPlatform' && P.surfaceId === 'blueCastleUpperPlatform' && P.focus === 0 && P.slottedSpells.length === 0 && M.side('blue').cooldown > SIEGE_RULES.deployCooldown - .5, `Respawn: on the platform after 2.5 s with Focus 0, empty slots and the full deploy cooldown (${P.respawnDuration} s)`);
  // The bot deploys on its own.
  M.side('red').cooldown = 0; M.side('red').botWait = SIEGE_RULES.botDeployDelay;
  step(SIEGE_RULES.botDeployDelay + .1);
  assert(M.side('red').presence === 'Deployed' && Math.abs(E.x - SIEGE_ZONES.deploy.red.x) < 1, 'The enemy Wizard deploys to its lane point by itself');
  // A fallen castle: last stand on the lane, runes may be prepared there.
  game.battlefield.blueCastle.isDestroyed = true;
  step(.1);
  assert(M.side('blue').presence === 'Deployed' && P.x >= SIEGE_ZONES.lane.left - .5 && M.canPrepare('blue') && M.deployLabel('blue').state === 'laststand', 'When the castle falls the Wizard drops to the lane for a last stand');
  assert(!game.canRespawn('blue'), 'Without a castle there is no respawn — the next death ends the match');
  game.render();
  game.returnToHub(); game.siegeDeployRules = false; game.setMatchMode('siege'); game.startMatch();
  assert(!game.siegeMatch && !game.player.confineBounds, 'With the rules switched off, Siege runs without platform confinement');
}

// Primals (Unity PetCompanionRuntime / PrimalBondRuntime).
{
  const { PRIMAL_STATS, BOND_FORMS, bondMoveMultiplier, bondDisplacement, bondMelee, primalQuake } = await import('./public/src/primals.js');
  const { SIEGE_ZONES } = await import('./public/src/siege_match.js');
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  globalThis.localStorage?.setItem?.('grimge-primal-stage', '1');
  ui.selectedCompanion = 'wolf';
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  let P = game.player; let W = game.primal;
  const step = (seconds, input = neutral) => { for (let t = 0; t < seconds; t += 1 / 60) { P.update(1 / 60, input, game.battlefield, game); game.primal?.update(1 / 60, game); } };
  assert(W && W.archetype === 'wolf' && W.stage === 1 && W.hp === PRIMAL_STATS.hp, 'The chosen Primal (wolf, stage I) joins the Wizard in Training');
  // Follows behind the Wizard.
  const dummy = game.trainingDummy; dummy.homeX = dummy.x = 900; dummy.homeZ = dummy.z = .9;
  P.x = 500; P.z = .5; game.battlefield.placeOnSurface(P); W.place(game, 300, .5);
  step(3);
  assert(Math.abs(W.x - P.x) < 50 && W.x < P.x + 5, `The Primal follows behind its Wizard (${Math.round(W.x)} vs ${Math.round(P.x)})`);
  // Bites an enemy close to the Wizard.
  dummy.homeX = dummy.x = P.x + 60; dummy.homeZ = dummy.z = P.z; dummy.hp = dummy.maxHp;
  step(2.5);
  assert(dummy.hp < dummy.maxHp, 'It bites enemies within 3.5 u of the Wizard');
  dummy.homeX = dummy.x = 900; dummy.homeZ = dummy.z = .9;
  // Intercept: a melee hit on the Wizard lands on the Primal instead.
  const pHp = P.hp; const wHp = W.hp; P.invulnerableTimer = 0;
  W.interceptWindow = PRIMAL_STATS.intercept.window;
  const res = P.takeDamage(30, 100, 0, .2, false, 'melee');
  assert(res.intercepted && P.hp === pHp && W.hp < wHp, 'During its intercept window the Primal takes the melee hit for the Wizard');
  // Down for 12 s, then back.
  W.takeDamage(9999);
  assert(!W.isAlive && !game.getHostileTargets('red').includes(W), 'A downed Primal disappears');
  step(PRIMAL_STATS.recoveryTime + .2);
  assert(W.isAlive && W.hp === W.maxHp && groundDistanceOk(W, P), 'After 12 s it returns to the Wizard');
  function groundDistanceOk(a, b) { return Math.hypot(a.x - b.x, (a.z - b.z) * 150) < 80; }
  // Primal Bond: T at full Focus with the Primal close.
  P.state = 'idle'; P.stateTimer = 0; P.grounded = true; P.focus = P.maxFocus; P.focusTransformTimer = 0;
  W.place(game, P.x - 30, P.z);
  assert(game.activateFocusTransformation() && P.primalBond && !P.primalBond.active && P.focusTransformTimer === 0, 'With a Primal, T starts the Primal Bond (not Focus Ascendant)');
  step(PRIMAL_STATS.bondWindup + .05);
  assert(P.primalBond.active && W.merged && !game.getHostileTargets('red').includes(W), 'After the 0.5 s wind-up the Primal merges into the Wizard');
  assert(bondMoveMultiplier(P) === BOND_FORMS.wolf[0].move, 'Wolf bond (Synchronization): ×1.25 movement');
  const f0 = P.focus; step(1);
  assert(Math.abs((f0 - P.focus) - 1.5 * BOND_FORMS.wolf[0].drain) < .05, 'The bond drains Focus at 1.5/s × the form multiplier');
  P.gainFocus(10); const fGain = P.focus; P.gainFocus(10);
  assert(Math.abs(P.focus - fGain - 5) < .01 || P.focus === P.maxFocus, 'Focus gains are halved while bonded');
  P.sprintActive = true; P.canAttack = true; P.state = 'idle'; P.stateTimer = 0;
  P.executeAttack(neutral, 'normal');
  assert(P.lastSprintAttack === 'PRIMAL POUNCE', 'Wolf bond: the sprint attack becomes the Primal Pounce');
  P.state = 'idle'; P.stateTimer = 0; P.sprintStrike = null;
  assert(game.activateFocusTransformation() !== false && !P.primalBond && !W.merged && W.isTargetable, 'T again releases the bond; the Primal reappears');
  // Bond refused when the Primal is far away.
  P.focus = P.maxFocus; W.place(game, P.x + 300, P.z);
  assert(!game.activateFocusTransformation() && !P.primalBond, 'The bond needs the Primal within 3.5 u');
  // Turtle: shell guard, Fortified after a block, Shell Rush.
  // Focus target: tapping an enemy sends the Primal after it; armed spell targeting keeps priority.
  {
    const E = game.enemyChampion;
    game.toggleSparringPartner(); game.toggleSparringPassive();
    P.x = 300; P.z = .5; game.battlefield.placeOnSurface(P); W.place(game, 280, .5);
    E.x = 640; E.z = .5; E.hp = E.maxHp; E.state = 'idle'; game.battlefield.placeOnSurface(E);
    game.targeting.active = { pointerId: null }; const armed = game.targeting.isActive;
    if (armed) assert(!game.tryTransformByTap({ x: E.x, y: E.y - 40 }) && !W.focusTarget, 'While a spell is being aimed, a tap does not retarget the Primal');
    game.targeting.cancel?.(); game.targeting.active = null;
    assert(game.tryTransformByTap({ x: E.x, y: E.y - 40 }) && W.focusTarget === E, 'Tapping an enemy marks it as the Primal focus target');
    for (let t = 0; t < 5; t += 1 / 60) { P.update(1 / 60, neutral, game.battlefield, game); W.update(1 / 60, game); E.update(1 / 60, game, game.battlefield); }
    assert(E.hp < E.maxHp, 'The Primal hunts its focus target even beyond its usual search radius');
    game.render();
    game.toggleSparringPartner();
    W.focusTarget = null;
  }
  assert(game.cyclePrimal() === 'wolf:2' && game.primal.stage === 2, 'B / the PRIMAL button cycles the Primal and its stage');
  game.cyclePrimal(); game.cyclePrimal();
  W = game.primal;
  assert(W.archetype === 'turtle' && W.stage === 1, 'The turtle can be chosen');
  P.focus = P.maxFocus; P.grounded = true; W.place(game, P.x - 20, P.z);
  game.activateFocusTransformation(); step(PRIMAL_STATS.bondWindup + .05);
  assert(bondDisplacement(P) === BOND_FORMS.turtle[0].shellGuard, 'Turtle bond (Shell Sync): shell guard ×0.7 displacement');
  P.isGuarding = true; P.facing = 1; P.guardHoldTime = 1; P.invulnerableTimer = 0;
  P.takeDamage(10, -120, 0, .2, false, 'melee');
  assert(bondDisplacement(P) === BOND_FORMS.turtle[0].fortified, 'A block makes the turtle bond Fortified (×0.4)');
  P.isGuarding = false; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.sprintActive = true; P.grounded = true;
  P.executeAttack(neutral, 'normal');
  assert(P.lastSprintAttack === 'SHELL RUSH', 'Turtle bond: the sprint attack becomes the Shell Rush');
  P.state = 'idle'; P.stateTimer = 0; P.sprintStrike = null;
  // Ape (after the Mystischer Affe art): heavier fists, Spirit Slam with a chest-drum quake, a punching companion.
  game.activateFocusTransformation();
  game.cyclePrimal(); game.cyclePrimal(); game.cyclePrimal();
  W = game.primal;
  assert(W.archetype === 'ape' && W.stage === 1 && BOND_FORMS.ape.length === 3, 'The ape can be chosen (three bond stages)');
  const dummyFoe = () => ({ x: W.x + 20, z: W.z, y: W.y, hp: 100, dmg: 0, kx: 0, takeDamage(d, kx) { this.dmg += d; this.kx = kx; } });
  const foe = dummyFoe(); W.facing = 1; W.attack = { target: foe, t: 0, struck: false }; W.updateAttack(.2, game);
  assert(foe.dmg === PRIMAL_STATS.punch.damage && foe.dmg > PRIMAL_STATS.bite.damage && foe.kx === PRIMAL_STATS.punch.kx, 'The ape companion punches harder than the wolf bites');
  W.attack = null; W.state = 'idle';
  P.focus = P.maxFocus; P.grounded = true; W.place(game, P.x - 20, P.z);
  game.activateFocusTransformation(); step(PRIMAL_STATS.bondWindup + .05);
  assert(P.primalBond?.active && bondMelee(P)?.dmg === BOND_FORMS.ape[0].punch && bondMelee(P).kx === BOND_FORMS.ape[0].knock, 'Ape bond (Spirit Rage): melee damage ×1.15, knockback ×1.2');
  P.isGuarding = false; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.sprintActive = true; P.grounded = true;
  P.executeAttack(neutral, 'normal');
  assert(P.lastSprintAttack === 'SPIRIT SLAM' && P.sprintStrike?.variant?.quake === BOND_FORMS.ape[0].quake, 'Ape bond: the sprint attack becomes the Spirit Slam');
  const near = { x: P.x + 40, z: P.z, hp: 50, dmg: 0, takeDamage(d) { this.dmg += d; } }; const far = { x: P.x + 400, z: P.z, hp: 50, dmg: 0, takeDamage(d) { this.dmg += d; } };
  assert(primalQuake(P, BOND_FORMS.ape[0].quake, { getHostileTargets: () => [near, far] }) === 1 && near.dmg === 14 && far.dmg === 0, 'Spirit Slam: the chest-drum quake hits every foe around the impact');
  const { renderBondOverlay } = await import('./public/src/primal_bond_vfx.js');
  const strictBond = new Proxy({}, { get: (t, k) => (k === 'ellipse' || k === 'arc') ? (x, y, rx, ry) => { if (rx < 0 || (k === 'ellipse' && ry < 0)) throw new Error('IndexSizeError'); } : (k === 'canvas' ? undefined : () => {}), set: () => true });
  let apeDrawn = true;
  try { for (const stage of [1, 2, 3]) for (const layer of ['back', 'front']) renderBondOverlay(strictBond, { ...P, state: 'attack1', stateTimer: .2, animTime: 1.3 }, P.y, layer, { ...P.primalBond, stage, flash: .6 }); game.render(); } catch { apeDrawn = false; }
  assert(apeDrawn, 'The ape bond overlay (spirit mane, ape head, spirit arms, spirit fist, slam) renders at every stage');
  P.state = 'idle'; P.stateTimer = 0; P.sprintStrike = null; game.activateFocusTransformation();
  // Siege: waits on the platform, comes along on deploy, returns after 24 s.
  ui.setHubCompanion('wolf');
  game.returnToHub(); game.siegeDeployRules = true; game.setMatchMode('siege'); game.startMatch();
  P = game.player; W = game.primal; const M = game.siegeMatch;
  game.enemyChampion.update = () => {};
  assert(W && !W.onLane && W.x <= SIEGE_ZONES.platform.blue.right + 1, 'Siege: the Primal waits on the castle platform');
  game.requestDeploy(); step(.1);
  assert(W.onLane && W.x >= SIEGE_ZONES.lane.left - 1, 'When the Wizard deploys, the Primal comes along');
  for (let t = 0; t < PRIMAL_STATS.laneDuration + .3; t += 1 / 60) { P.update(1 / 60, neutral, game.battlefield, game); M.tick(1 / 60); W.update(1 / 60, game); }
  assert(!W.onLane && W.x <= SIEGE_ZONES.platform.blue.right + 1, 'After 24 s on the lane the Primal returns to the platform');
  game.render();
  assert(W.tryTapDeploy({ x: W.x, y: W.y - 20 }, game) && W.onLane && W.autonomous, 'A tap on the waiting Primal sends it to the lane alone');
  game.returnToHub(); game.siegeDeployRules = false; ui.selectedCompanion = 'none'; game.setMatchMode('siege'); game.startMatch();
  assert(!game.primal, 'Without a Primal none is spawned');
}

// Charging roots the Wizard; every astral weapon has its own motion set.
{
  const { WEAPON_IDS, WEAPON_MOTIONS, MOTION_NAMES, weaponMotion } = await import('./public/src/weapons.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  P.x = 400; P.z = .5; P.state = 'idle'; P.stateTimer = 0; P.grounded = true; P.vx = 0; game.battlefield.placeOnSurface(P);
  assert(P.beginCharge('forward'), 'A heavy charge starts');
  const startX = P.x;
  for (let i = 0; i < 30; i++) P.update(1 / 60, { ...neutral, move: { x: 1, z: .5 }, keys: { KeyD: true } }, game.battlefield, game);
  assert(Math.abs(P.x - startX) < 1 && P.chargeTimer > 0, 'While charging the Wizard cannot walk (Smash-style)');
  P.releaseCharge(); P.state = 'idle'; P.stateTimer = 0;
  const motions = WEAPON_IDS.map((id) => [weaponMotion(id, 'combo', 1), weaponMotion(id, 'heavy')].join('/'));
  assert(WEAPON_IDS.every((id) => [...WEAPON_MOTIONS[id].combo, WEAPON_MOTIONS[id].heavy, WEAPON_MOTIONS[id].uppercut].every((m) => MOTION_NAMES.includes(m))), 'Every weapon motion is a known motion');
  assert(new Set(motions).size >= 8, `The weapons play clearly different attacks (${new Set(motions).size} distinct opener/heavy pairs)`);
  assert(weaponMotion('spear', 'combo', 1) === 'thrust' && weaponMotion('katana', 'combo', 1) === 'iaido' && weaponMotion('great_hammer', 'heavy') === 'slam' && weaponMotion('scythe', 'heavy') === 'whirl', 'Spear thrusts, katana draws (iaido), hammer slams, scythe whirls');
  const ready = () => { P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true; P.sprintActive = false; };
  P.equipWeapon('dual_swords'); P.comboStep = 0;
  if (game.trainingDummy) { game.trainingDummy.homeX = game.trainingDummy.x = P.x + P.facing * 24; game.trainingDummy.homeZ = game.trainingDummy.z = P.z; } // the chain continues on hits
  ready(); P.executeAttack(neutral, 'normal'); const lead1 = P._weaponLead;
  ready(); P.executeAttack(neutral, 'normal'); const lead2 = P._weaponLead;
  assert(P._weaponMotion === 'backhand' && lead1 === 'front' && lead2 === 'rear', 'Dual swords alternate the striking hand');
  assert(WEAPON_MOTIONS.sword_shield.hands === 'shield' && WEAPON_MOTIONS.daggers.hands === 'pair' && WEAPON_MOTIONS.gauntlets.hands === 'pair', 'Sword and shield sit in separate hands; daggers and fists one per hand');
  P.equipWeapon('sword_shield'); ready(); P.executeAttack(neutral, 'heavy');
  assert(P._weaponMotion === 'bash', 'Sword & shield heavy is a shield bash');
  game.render();
  P.equipWeapon(null);
}

// Buff transformations (Transformations-Atlas V3.1): 42 special runes, max. one per deck.
{
  const buff = await import('./public/src/buff_forms.js');
  const { FORM_MOVESETS, activeMoveset } = await import('./public/src/form_moves.js');
  const { FORM_SPRINT_ATTACKS } = await import('./public/src/form_actions.js');
  const { SPELL_DEFINITIONS, isSpecialRune } = await import('./public/src/spell_catalog.js');
  const { guideStrokes } = await import('./public/src/rune_guides.js');
  const { MageProfile, BUFF_RUNE_IDS } = await import('./public/src/progression.js');
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const ids = buff.BUFF_FORM_IDS;
  assert(ids.length === 19 && ids[0] === 'B01' && ids[1] === 'B02' && ids.includes('T40') && ['A01', 'A02', 'A03', 'A04'].every((id) => ids.includes(id)), 'The 19 curated Arcane States are registered (B01, B02, 13 atlas forms, A01 Göttlicher Riese, A02 Mystischer Affe, A03 Tausendhand, A04 Klingenblüte)');
  const tForms = ids.filter((id) => /^[TA]/.test(id));
  assert(tForms.every((id) => ['forward', 'up', 'down'].every((d) => FORM_MOVESETS[id]?.[d]?.short?.make && FORM_MOVESETS[id][d].full?.make) && FORM_SPRINT_ATTACKS[id]?.name), 'Every T / A form has six charged techniques and its own sprint attack');
  assert(FORM_MOVESETS.T13.forward.short.name === 'THREAD NEEDLE' && FORM_MOVESETS.T13.forward.full.name === 'HUNDRED FILAMENTS' && FORM_SPRINT_ATTACKS.T13.name === 'SILK STRIKE', 'Technique names come straight from the atlas (T13 Fadenschlag)');
  assert(FORM_MOVESETS.ninefold.forward.short.name === 'VERDICHTETER RISSKERN' && FORM_MOVESETS.ninefold.forward.full.name === 'RISSSTRAHL' && FORM_MOVESETS.eidolon.up.full.name === 'LICHTSPALTER', 'B01 Risswild / B02 Arkengestell carry the atlas technique names');
  assert(ids.every((id) => { const r = recognizer.runes.find((x) => x.id === 'buff_' + id); const d = SPELL_DEFINITIONS['buff_' + id]; return r?.isBuffForm && r.tags.includes('max-1-per-deck') && d?.isBuffForm && d.tags.includes('arcane-state') && isSpecialRune('buff_' + id); }), 'Each form is an Arcane State special rune tagged "arcane-state · max-1-per-deck", never fusable');
  // Deck rule: at most one buff rune.
  const profile = new MageProfile(); profile.level = 20; for (const id of ids) profile.lateUnlocks.add('buff_' + id);
  profile.matchDeck = ['ignis', 'ventus', 'fulgur', 'terra', 'aqua', 'ignis', 'ventus', 'fulgur'];
  assert(profile.addRuneToDeck('buff_T13').ok, 'A buff rune can join the deck');
  const second = profile.addRuneToDeck('buff_B01');
  assert(!second.ok && /ONE ARCANE STATE/.test(second.reason), 'A second buff rune is refused (one per deck)');
  assert(profile.sanitizeDeck(['ignis', 'buff_T13', 'buff_T08', 'aqua']).filter((id) => id.startsWith('buff_')).length === 1, 'Loading a deck keeps only one buff rune');
  assert(BUFF_RUNE_IDS.length === 19, 'All 19 Arcane State runes are offered in the deck builder');
  {
    // A04 Klingenblüte: the weapon becomes the petal swarm (no normal held weapon), its cuts bleed.
    const BF = await import('./public/src/buff_forms.js');
    const Pq = game.player; Pq.equipClassWeapon('sword_shield'); BF.endBuffForm(Pq); spells.cast(Pq, spells.resolveSpell([{ id: 'buff_A04' }]), game);
    const isA04 = BF.currentBuffForm(Pq)?.id === 'A04';
    const dmy = game.trainingDummy; dmy.homeX = dmy.x = Pq.x + 60; dmy.homeZ = dmy.z = Pq.z; dmy.statusImmuneUntil = {}; STATUS.clearStatuses(dmy);
    Pq.state = 'idle'; Pq.stateTimer = 0; Pq.canAttack = true; Pq.mp = Pq.maxMp; Pq.grounded = true; Pq.beginCharge('forward', 'key'); if (Pq.formCharge) Pq.formCharge.elapsed = .3; Pq.chargeDir = 'forward'; Pq.releaseCharge();
    for (let i = 0; i < 40; i++) spells.update(1 / 60, game);
    assert(isA04 && STATUS.hasStatus(dmy, 'bleed'), 'A04 KLINGENBLÜTE: the unleashed weapon is a petal swarm whose techniques make the foe bleed');
    BF.endBuffForm(Pq); Pq.equipClassWeapon(null); STATUS.clearStatuses(); spells.clearRuntime(); dmy.homeX = dmy.x = 900;
  }
  // The shared hourglass sigil.
  const hand = ['ignis', 'fulgur', 'doppel', 'buff_T13'];
  const sigil = recognizer.recognize(guideStrokes('buff_T13', 400, 300, 120), hand);
  assert(sigil?.rune.id === 'buff_T13' && sigil.grade === 'S', 'The hourglass sigil resolves to the buff rune in the hand');
  assert(recognizer.recognize(guideStrokes('fulgur', 400, 300, 120), hand)?.rune.id === 'fulgur' && recognizer.recognize(guideStrokes('doppel', 400, 300, 120), hand)?.rune.id === 'doppel', 'The open Z stays FULGUR and the wide ∞ stays DOPPEL');
  // Activation in Training, together with the Focus transformation.
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy;
  P.x = 400; P.z = .5; game.battlefield.placeOnSurface(P);
  P.focus = P.maxFocus; game.activateFocusTransformation();
  spells.cast(P, spells.resolveSpell([{ id: 'buff_T13' }]), game);
  assert(P.buffForm?.id === 'T13' && P.focusTransformTimer > 0 && activeMoveset(P) === 'T13', 'A buff runs together with the Focus transformation and owns the charged heavy');
  spells.cast(P, spells.resolveSpell([{ id: 'buff_T08' }]), game);
  assert(P.buffForm.id === 'T13', 'Only one buff transformation can be active at a time');
  // Render the manifestation in every pose.
  for (const pose of [{}, { sprintActive: true, vx: 300 }, { grounded: false, vElevation: 150 }, { grounded: false, vElevation: -20 }, { isGuarding: true, guardHoldTime: .2 }]) {
    Object.assign(P, { sprintActive: false, vx: 0, grounded: true, vElevation: 0, isGuarding: false }, pose);
    game.render();
  }
  Object.assign(P, { sprintActive: false, vx: 0, grounded: true, vElevation: 0, isGuarding: false });
  assert(true, 'The manifestation renders idle, sprinting, rising, at the apex and guarding');
  // Generic combat bonus of a T buff.
  dummy.homeX = dummy.x = P.x + 14; dummy.homeZ = dummy.z = P.z;
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.focusTransformTimer = 0; P.comboStep = 0; P.facing = 1; P.weapon = null; P.classWeapon = null;
  let hpBefore = dummy.hp; P.executeAttack(neutral, 'normal'); const buffed = hpBefore - dummy.hp;
  const saved = P.buffForm; P.buffForm = null;
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.comboStep = 0;
  hpBefore = dummy.hp; P.executeAttack(neutral, 'normal'); const plain = hpBefore - dummy.hp;
  P.buffForm = saved;
  assert(buffed > plain, `A buff transformation strengthens melee (${Math.round(buffed)} vs ${Math.round(plain)})`);
  // Every technique of every T form runs and renders.
  let fired = 0;
  for (const id of tForms) {
    P.buffForm = { id, timer: 10, total: 16, age: 1, power: 1 };
    for (const d of ['forward', 'up', 'down']) for (const v of ['short', 'full']) {
      spells.clearRuntime();
      const spell = FORM_MOVESETS[id][d][v].make(P);
      spells.addSpell(spell, 'B');
      for (let i = 0; i < 20; i++) spells.update(1 / 60, game);
      game.render();
      fired++;
    }
  }
  assert(fired === tForms.length * 6, `Every technique of every curated T form releases, updates and renders (${fired})`);
  // The new kinds hit.
  const hitBy = (id, d, v, dx) => { spells.clearRuntime(); dummy.homeX = dummy.x = P.x + dx; dummy.hp = dummy.maxHp; P.buffForm = { id, timer: 10, total: 16, age: 1, power: 1 }; spells.addSpell(FORM_MOVESETS[id][d][v].make(P), 'B'); for (let i = 0; i < 90; i++) spells.update(1 / 60, game); return dummy.maxHp - dummy.hp; };
  assert(hitBy('T04', 'forward', 'short', 160) > 0, 'Korallenschild: the pearl bolt travels and hits');
  assert(hitBy('T02', 'forward', 'full', 160) > 0 && hitBy('T06', 'forward', 'full', 120) > 0, 'Unique full techniques hit: Schlackenkern lava lance, Ionspindel chain lightning');
  assert(hitBy('T40', 'forward', 'full', 220) > 0 && hitBy('T40', 'down', 'full', 180) > 0, 'T40 Sonnenwyrm: the twin wyrms hunt along the lane and the portal ritual strikes its target');
  spells.clearRuntime();
  // Sprint attack and grab use the form's material.
  P.buffForm = { id: 'T13', timer: 10, total: 16, age: 1, power: 1 };
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true; P.sprintActive = true; P.facing = 1;
  P.executeAttack(neutral, 'normal');
  assert(P.lastSprintAttack === 'SILK STRIKE', 'Sprint + attack is the form\'s own sprint heavy (Silk Strike)');
  game.render();
  P.state = 'idle'; P.stateTimer = 0; P.sprintStrike = null;
  // Timer runs out → the buff ends.
  P.buffForm.timer = .05; P.update(1 / 10, neutral, game.battlefield, game);
  assert(!P.buffForm && activeMoveset(P) === null, 'When its time runs out the buff ends and the normal moveset returns');
  spells.clearRuntime();
  dummy.homeX = dummy.x = 512;
}

// Buff rune unlocks and the class weapon selector in Training.
{
  const { MageProfile, runeUnlockLabel, LATE_RUNE_LEVEL } = await import('./public/src/progression.js');
  const fresh = new MageProfile({ level: 1 });
  // Late runes (user, 20 Oct 2026): no Arcane State / domain through the Mage level.
  fresh.level = 30;
  assert(!fresh.isRuneUnlocked('buff_B01') && !fresh.isRuneUnlocked('sig_S57') && fresh.isRuneUnlocked('sig_S01'), 'Arcane States and domains never unlock with the Mage level (other special runes still do)');
  assert(runeUnlockLabel('buff_T02') === 'BOSS-DROP / IGNIS RUNE LV.8' && runeUnlockLabel('sig_S57') === 'BOSS-DROP / IGNIS RUNE LV.10' && runeUnlockLabel('sig_S53') === 'BOSS-DROP' && runeUnlockLabel('buff_A04') === 'BOSS-DROP / KLASSENWAFFE LV.8 (JE KLASSE)', 'Lock labels name the boss drop and the mastery route');
  fresh.runeXp.ignis = (LATE_RUNE_LEVEL.arcane - 1) * 60 - 5; const early = fresh.awardRuneUse('ignis', 'B');
  assert(fresh.isRuneUnlocked('buff_T02') && fresh.isRuneUnlocked('buff_B01') && !fresh.isRuneUnlocked('sig_S57') && early.newlyUnlockedRunes.some((e) => e.runeId === 'buff_T02'), 'Ignis rune level 8 earns the fire Arcane States (announced), the Ignis domain needs level 10');
  fresh.runeXp.ignis = (LATE_RUNE_LEVEL.domain - 1) * 60; fresh.claimLateRunes();
  assert(fresh.isRuneUnlocked('sig_S57') && !fresh.isRuneUnlocked('sig_S53'), 'Ignis rune level 10 earns the Ignis domain; special domains only drop from bosses');
  // Bankai: ONE rune, unlocked per class (class weapon level 8 or a boss drop for that class).
  fresh.setClassWeapon('katana'); fresh.weaponXp.katana = 7 * 80 - 1;
  assert(!fresh.isRuneUnlocked('buff_A04') && fresh.awardWeaponHit('katana')?.newlyUnlockedRunes?.some((e) => e.runeId === 'buff_A04') && fresh.isRuneUnlocked('buff_A04'), 'Class weapon level 8 earns the Bankai for that class');
  fresh.setClassWeapon('bow'); assert(!fresh.isRuneUnlocked('buff_A04'), 'Another class has not earned its Bankai yet (selectable per class)');
  fresh.setClassWeapon(null); assert(!fresh.isRuneUnlocked('buff_A04'), 'Without a class there is no Bankai');
  fresh.setClassWeapon('katana'); assert(fresh.isRuneUnlocked('buff_A04') && new MageProfile(fresh.toJSON()).isRuneUnlocked('buff_A04'), 'The earned Bankai stays with its class (saved)');
  { const BK = await import('./public/src/bankai.js'); const k = BK.bankaiStyleFor('katana'); const bw = BK.bankaiStyleFor('bow'); const hm = BK.bankaiStyleFor('great_hammer'); const harp = BK.bankaiStyleFor('harp');
    assert(k.shape === 'petal' && bw.shape === 'arrow' && hm.shape === 'shard' && harp.shape === 'note' && bw.name !== hm.name && hm.status !== k.status, 'Bankai adapts to the class: blade petals, arrow swarm, shard storm, sound swarm — own name and wound'); }
  const drop = fresh.rollBossDrop(() => 0);
  assert(drop && fresh.isRuneUnlocked(drop.runeId) && new MageProfile(fresh.toJSON()).isRuneUnlocked(drop.runeId), 'A boss drops a locked late rune — kept in the save');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch();
  const first = game.cycleClassWeapon();
  assert(first && game.player.classWeapon === first && !game.player.weapon, 'V cycles a class weapon in Training (fixed, not a pickup)');
  let guard = 0; while (game.player.classWeapon && guard++ < 60) game.cycleClassWeapon();
  assert(!game.player.classWeapon, 'Cycling further returns to bare hands');
}

// Buff choreography from the atlas: perfect-block counters, grab throws, jumps, transform in/out.
{
  const buff = await import('./public/src/buff_forms.js');
  const { formGuardCounter, formJumpFx, FormGrabFx } = await import('./public/src/form_actions.js');
  const data = buff.BUFF_FORMS;
  assert(Object.values(data).every((f) => f.tech.defense?.counter && f.tech.grab?.throw && f.tech.jump?.landing), 'Every buff form has its own counter, throw and landing from the atlas text');
  assert(data.T06.tech.defense.counter === 'shock' && data.T02.tech.grab.throw === 'slam', 'Examples: Ionspindel current counter, Schlackenkern slam into the ground');
  assert(data.T02.tech.up.full.status.length === 0 && data.T05.tech.forward.full.kind === 'beam', 'Reviewed mechanics: no lightning from "Positionen", Annihilation Ray is a beam');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const E = game.enemyChampion;
  game.toggleSparringPartner(); game.toggleSparringPassive();
  const place = (dx) => { P.x = 400; P.z = .5; P.facing = 1; game.battlefield.placeOnSurface(P); E.x = P.x + dx; E.z = .5; E.hp = E.maxHp; E.elevation = 0; E.vx = 0; E.kbVelX = 0; E.state = 'idle'; game.battlefield.placeOnSurface(E); };
  spells.clearRuntime();
  spells.cast(P, spells.resolveSpell([{ id: 'buff_T02' }]), game);
  assert(spells.activeSpells.some((sp) => sp.constructor.name === 'BuffBurstFx' && sp.kind === 'assemble'), 'Transform-in: the form assembles from material shards');
  P.buffForm.age = .3;
  const painter = buff.buffVeinPainter(P);
  assert(typeof painter === 'function', 'Transform-in: a light thread runs over the real sprite contour (mask painter with sweep)');
  P.buffForm.age = 2;
  place(70);
  assert(formGuardCounter(P, game) && E.hp < E.maxHp && spells.activeSpells.some((sp) => sp.kind === 'spike'), 'Kammwacht perfect block: a thorn plate strikes back');
  // Grab: Dämmerlauf throws over the back (target ends up behind).
  spells.clearRuntime();
  P.buffForm = { id: 'T08', timer: 10, total: 16, age: 2, power: 1 }; place(30);
  const grab = new FormGrabFx(P, E, 'T08'); spells.addSpell(grab, 'B');
  for (let i = 0; i < 40; i++) { spells.update(1 / 60, game); E.update(1 / 60, game, game.battlefield); }
  assert(E.hp < E.maxHp && E.x < P.x + 10, `Ossuarium grab throws the target over the back (${Math.round(E.x - P.x)} px)`);
  // Jump: takeoff and the form's own landing.
  spells.clearRuntime();
  assert(formJumpFx(P, 'takeoff') && formJumpFx(P, 'land') && spells.activeSpells.filter((sp) => sp.constructor.name === 'BuffBurstFx').length >= 2, 'Jump: material takeoff burst and form-specific landing');
  game.render();
  // Transform-out: shards scatter when the buff ends.
  spells.clearRuntime();
  buff.endBuffForm(P);
  assert(!P.buffForm && spells.activeSpells.some((sp) => sp.kind === 'scatter'), 'Transform-out: the manifestation breaks apart into shards');
  game.toggleSparringPartner();
  spells.clearRuntime();
}

// Castle structure (Unity Tower.cs): segments, load-bearing collapse.
{
  const { SEGMENT_SPECS, COLLAPSE_THRESHOLD } = await import('./public/src/castle_segments.js');
  game.returnToHub(); game.siegeDeployRules = false; game.setMatchMode('siege'); game.startMatch();
  const castle = game.battlefield.redCastle;
  assert(castle.segments.length === 7 && castle.segments.filter((s) => s.loadBearing).map((s) => s.id).join(',') === 'A3,B1,B2' && COLLAPSE_THRESHOLD === .6 && SEGMENT_SPECS.find((s) => s.id === 'A1').durability === 432, 'The castle has seven segments (A1–A3, B1–B2, C1–C2), three load-bearing, Unity values scaled to 1800 HP');
  castle.takeDamage(50);
  assert(castle.hp === castle.maxHp && castle.segments.every((s) => s.hp === s.max), 'Before its tower falls the castle stays protected');
  castle.isVulnerable = true;
  castle.takeDamage(100, -100, 0, .1, false, 'melee');
  const a1 = castle.segments.find((s) => s.id === 'A1');
  assert(a1.hp === a1.max - 100 && castle.hp === castle.maxHp - 100, 'A lane strike hits the front wall at the lane edge (A1) and the global health by the same amount');
  castle.takeDamage(100, 0, 0, .1, false, 'spell');
  assert(castle.segments.find((s) => s.id === 'B1').hp === castle.segments.find((s) => s.id === 'B1').max - 100, 'Spells strike the keep (B row) first');
  let guard = 0;
  while (!castle.segments.find((s) => s.id === 'B2').destroyed && guard++ < 50) castle.takeDamage(120, 0, 0, .1, false, 'spell');
  assert(castle.isDestroyed && castle.collapsedStructurally && castle.hpAtCollapse > 0, `Two of three load-bearing segments down: the castle collapses before its health runs out (${Math.round(castle.hpAtCollapse)} HP left)`);
  assert(game.objectivePhase === 'FinalWizardPhase', 'The collapse ends the castle phase like a destroyed castle');
  for (let i = 0; i < 150; i++) castle.update(1 / 60);
  assert(castle.segments.every((s) => s.destroyed), 'The rest of the castle comes down with it (staggered: tower tops, keep, front wall)');
  game.render();
}

// Void Implosion and Inferno Rampage are combination spells now.
{
  game.returnToHub(); game.setMatchMode('training'); game.startMatch();
  const P = game.player; P.x = 400; P.z = .5; game.battlefield.placeOnSurface(P);
  spells.clearRuntime();
  const implode = spells.resolveSpell([{ id: 'bestia' }, { id: 'terra' }, { id: 'void' }]);
  const rampage = spells.resolveSpell([{ id: 'bestia' }, { id: 'ignis' }, { id: 'void' }]);
  assert(implode?.id === 'void_implosion' && !implode.isSpecial && rampage?.id === 'inferno_rampage' && !rampage.isSpecial, 'Bestia+Terra+Void and Bestia+Ignis+Void fuse into Void Implosion and Inferno Rampage');
  spells.cast(P, implode, game, null, { x: 520, z: .5 }); spells.cast(P, rampage, game);
  assert(spells.activeSpells.length >= 2, 'Both combination spells cast in the match');
  for (let i = 0; i < 30; i++) spells.update(1 / 60, game);
  game.render();
  spells.clearRuntime();
}

// Arcane State morphologies (design note): distinct silhouette families, idle / action / peak.
{
  const buff = await import('./public/src/buff_forms.js');
  const forms = Object.values(buff.BUFF_FORMS);
  assert(forms.every((f) => f.morphology && f.states?.idle && f.states.action && f.states.peak), 'Every Arcane State has a morphology and idle / action / peak silhouettes');
  assert(forms.filter((f) => f.morphology === 'astral_avatar').map((f) => f.id).join() === 'B02', 'Only Arkengestell is a giant humanoid astral avatar');
  assert(buff.BUFF_FORMS.T37.morphology === 'body_augmentation' && buff.BUFF_FORMS.T38.morphology === 'orbital_construct' && buff.BUFF_FORMS.T39.morphology === 'temporal_projection' && buff.BUFF_FORMS.B01.morphology === 'energy_extension' && buff.BUFF_FORMS.T40.morphology === 'creature_manifestation', 'Säuregerüst, Asterglied, Vorausschnitt, Risswild and Sonnenwyrm have their own morphologies');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  P.x = 400; P.z = .5; P.facing = 1; game.battlefield.placeOnSurface(P);
  spells.clearRuntime();
  spells.cast(P, spells.resolveSpell([{ id: 'buff_T39' }]), game);
  for (let i = 0; i < 20; i++) P.update(1 / 60, neutral, game.battlefield, game);
  assert((P._timeTrail?.length ?? 0) >= 15, 'Vorausschnitt records the last moments for its time planes');
  dummy.homeX = dummy.x = P.x + 40; dummy.homeZ = dummy.z = P.z; dummy.hp = dummy.maxHp;
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.comboStep = 0;
  P.executeAttack(neutral, 'normal'); P.update(1 / 60, neutral, game.battlefield, game);
  assert(spells.activeSpells.filter((sp) => sp.constructor.name === 'EchoStrikeFx').length === 3, 'On an attack three echoes leave their time planes');
  const hpBefore = dummy.hp;
  for (let i = 0; i < 40; i++) spells.update(1 / 60, game);
  assert(dummy.hp < hpBefore, 'The echoes strike a moment later');
  game.render();
  buff.endBuffForm(P); spells.clearRuntime();
  // Asterglied: guard stacks the rings into a stone shield; Bruchflug levitates.
  spells.cast(P, spells.resolveSpell([{ id: 'buff_T38' }]), game); P.buffForm.age = 2;
  P.isGuarding = true; P.guardHoldTime = .2;
  assert(buff.renderBuffGuard(game.ctx, P, P.y), 'Asterglied guards with its rings stacked into a stone shield');
  P.isGuarding = false; buff.endBuffForm(P); spells.clearRuntime();
  spells.cast(P, spells.resolveSpell([{ id: 'buff_T05' }]), game); P.buffForm.age = 2;
  assert(buff.levitationOffset(P) > 5, 'Levitation state: Bruchflug lets the Wizard hover above his shadow');
  // Peak: a full release flares the manifestation.
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true;
  P.beginCharge('forward'); P.formCharge.elapsed = 1.3; P.update(1 / 60, neutral, game.battlefield, game);
  P.releaseCharge(); P.update(1 / 60, neutral, game.battlefield, game);
  assert(buff.peakOf(P) > 0, 'A full release triggers the peak manifestation');
  game.render();
  buff.endBuffForm(P); spells.clearRuntime();
  dummy.homeX = dummy.x = 512;
}

// Morphology family renderers: every Arcane State has idle / action / peak silhouettes.
{
  const buff = await import('./public/src/buff_forms.js');
  const P = game.player; P.x = 400; P.z = .5; P.facing = 1; game.battlefield.placeOnSurface(P);
  // A measuring context: counts drawn shapes, tracks how far right (forward) they reach and rejects negative radii.
  const probe = () => { const m = { shapes: 0, maxX: -1e9 }; const ctx = new Proxy({}, { get: (t, k) => k === 'ellipse' ? (x, y, rx, ry) => { if (rx < 0 || ry < 0) throw new Error('IndexSizeError'); m.maxX = Math.max(m.maxX, x + rx); } : (k === 'moveTo' || k === 'lineTo') ? (x) => { m.maxX = Math.max(m.maxX, x); } : (k === 'fill' || k === 'stroke' || k === 'fillRect') ? () => { m.shapes++; } : (k === 'canvas' ? undefined : () => {}), set: () => true }); return { ctx, m }; };
  const draw = (state) => { const { ctx, m } = probe(); const b = P.buffForm; Object.assign(b, { act: 0, guardK: 0, sprintK: 0, peakAt: null, lastTech: null, grabAt: null, landAt: null }, state); buff.renderBuffManifestation(ctx, P, P.y, 'back'); buff.renderBuffManifestation(ctx, P, P.y, 'front'); return m; };
  let ok = true; let forward = 0; let generic = [];
  for (const id of Object.keys(buff.BUFF_FORMS)) {
    spells.clearRuntime(); buff.endBuffForm(P);
    spells.cast(P, spells.resolveSpell([{ id: 'buff_' + id }]), game); P.buffForm.age = 2;
    const idle = draw({}); const act = draw({ act: 1, lastTech: { dir: 'forward', full: false, at: 1.9 } }); draw({ guardK: 1 }); draw({ sprintK: 1 }); draw({ grabAt: 1.8, grabHit: true }); draw({ landAt: 1.9 }); draw({ lastTech: { dir: 'up', full: true, at: 1.9 } }); draw({ lastTech: { dir: 'down', full: true, at: 1.9 } }); const peak = draw({ peakAt: 2, lastTech: { dir: 'forward', full: true, at: 1.9 } });
    if (!(idle.shapes > 0 && act.shapes > 0 && peak.shapes > 0)) { ok = false; generic.push(id); }
    if (act.maxX > idle.maxX + 8 || peak.maxX > idle.maxX + 8) forward++;
  }
  assert(ok, 'All Arcane States draw an idle, action and peak silhouette ' + generic.join());
  assert(forward >= 12, 'Attacks and the peak reshape the silhouettes forward (' + forward + ' of 15)');
  // V3.2 Morphologie-Overhaul: every form has its own profile and (T01–T36) its own renderer.
  const vfx = await import('./public/src/buff_vfx.js');
  const forms42 = Object.values(buff.BUFF_FORMS);
  assert(forms42.every((f) => f.v32?.category && f.v32.anchors.length && f.v32.attacks.forward && f.v32.anim.grab && f.v32.anim.jump), 'V3.2: all 42 Arcane States carry their individual morphology profile (category, anchors, states, animations, heavy mapping)');
  assert(forms42.filter((f) => !['T37', 'T38', 'T39', 'T40'].includes(f.id) && f.id.startsWith('T')).every((f) => vfx.hasFormRenderer(f.id)) && new Set(forms42.map((f) => f.v32.category)).size === forms42.length, 'V3.2: every curated T form has its individual renderer and a distinct morphology category');
  assert(buff.BUFF_FORMS.T24.v32.silhouette.includes('hinter dem Avatar'), 'V3.2 silhouettes replace the old family look (hanging marionettes)');
  buff.endBuffForm(P); spells.clearRuntime();
  // Vorausschnitt (temporal projection) echoes strike with the Wizard.
  const dummy = game.trainingDummy; const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  P.state = 'idle'; P.stateTimer = 0;
  spells.cast(P, spells.resolveSpell([{ id: 'buff_T39' }]), game);
  for (let i = 0; i < 12; i++) P.update(1 / 60, neutral, game.battlefield, game);
  spells.clearRuntime();
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.comboStep = 0;
  P.executeAttack(neutral, 'normal'); P.update(1 / 60, neutral, game.battlefield, game);
  assert(spells.activeSpells.filter((sp) => sp.constructor.name === 'EchoStrikeFx').length === 3, 'Vorausschnitt sends three time echoes into an attack');
  assert(P.buffForm.act > .2, 'The action weight rises while attacking');
  buff.endBuffForm(P); spells.clearRuntime(); dummy.homeX = dummy.x = 512;
}

// Signature specials (research atlas S01–S36): special runes with their own glyph and mechanic — not Arcane States.
{
  const sigMod = await import('./public/src/signature_runes.js');
  const core = await import('./public/src/signature_core.js');
  const prog = await import('./public/src/progression.js');
  const { activeMoveset } = await import('./public/src/form_moves.js');
  const { spellHowTo, runeManaCost, isSpecialRune } = await import('./public/src/spell_catalog.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const reset = () => { spells.clearRuntime(); if (P.signature) core.endStance(P, 'replaced'); P.x = 400; P.z = .5; P.facing = 1; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.hp = P.maxHp; game.battlefield.placeOnSurface(P); dummy.homeX = dummy.x = 470; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp; };
  const step = (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) { P.update(dt, neutral, game.battlefield, game); game.updateProjectiles(dt); spells.update(dt, game); } };
  const cast = (id, target = null) => spells.cast(P, spells.resolveSpell([{ id: 'sig_' + id }]), game, null, target);
  const ids = Object.keys(core.SIGNATURES);
  assert(ids.length === 85 && ids.every((id) => core.signatureImpl(id)?.cast) && sigMod.SIGNATURE_RUNE_IDS.every((id) => isSpecialRune(id) && runeManaCost(id) >= 28 && runeManaCost(id) <= 46), 'All 85 signature specials (atlas S01–S36 + S37–S85) are special runes with their own mechanic and bound mana');
  assert(ids.every((id) => spellHowTo('sig_' + id)?.effect?.length > 40) && !spells.resolveSpell([{ id: 'sig_S03' }, { id: 'ignis' }]), 'Signature specials explain themselves in the grimoire and never fuse');
  // Every special casts, runs and renders (strict canvas) without errors.
  const strict = new Proxy({}, { get: (t, k) => (k === 'ellipse' || k === 'arc') ? (x, y, rx, ry) => { if (rx < 0 || (k === 'ellipse' && ry < 0)) throw new Error('IndexSizeError ' + k); } : (k === 'canvas' ? undefined : () => {}), set: () => true });
  const broken = [];
  for (const id of ids) {
    reset();
    try {
      const d = core.SIGNATURES[id];
      const target = d.targeting === 'dual' ? { a: { x: 450, z: .4 }, b: { x: 560, z: .6 } } : d.targeting === 'placement' ? { x: 470, z: .5, orientation: 'lateral', length: 200, start: { x: 380, z: .5 }, end: { x: 560, z: .5 } } : { x: 470, z: .5 };
      cast(id, target);
      for (let k = 0; k < 12; k++) { step(10); for (const sp of spells.activeSpells) sp.render?.(strict); for (const layer of ['back', 'front']) sigMod.renderSignatureStance(strict, P, P.y, layer); }
    } catch (e) { broken.push(id + ': ' + e.message); }
  }
  assert(!broken.length, 'Every signature special casts, runs and renders for 2 s without errors ' + broken.slice(0, 3).join(' | '));
  // S01 Himmelsregent: the Wizard really rises and the six hover heavies take over.
  reset(); cast('S01'); step(60);
  assert(sigMod.signatureHover(P) > 50 && P.isHovering && activeMoveset(P) === 'sig_S01', 'Himmelsregent: the Wizard hovers ~0.7 hero heights and owns the hover heavies');
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true;
  P.beginCharge('forward'); P.formCharge.elapsed = 1.3; P.releaseCharge(); step(40);
  assert(dummy.hp < dummy.maxHp, 'Himmelsregent: Wanderchor floes hunt and hit the target');
  core.endStance(P); assert(sigMod.signatureHover(P) === 0 && !P.isHovering, 'The hover ends with the stance');
  // S03 Sternenanker: telegraph, then pull and tip outward.
  reset(); dummy.x = dummy.homeX = 520; cast('S03', { x: 470, z: .5 }); step(30);
  assert(dummy.hp === dummy.maxHp, 'Sternenanker: nothing happens during the 0.65 s warning');
  step(40); assert(dummy.hp < dummy.maxHp, 'Sternenanker: the anchor lands and tips the enemy outward');
  // S08 Sekundenpfand: pillars strike the recorded spots.
  reset(); cast('S08', { x: 470, z: .5 }); step(40); const marks = spells.activeSpells.find((sp) => sp.marks)?.marks.length ?? 0; step(60);
  assert(marks >= 1 && dummy.hp < dummy.maxHp, 'Sekundenpfand: recorded positions are struck by pillars');
  // S09 Stillfuge: projectiles inside the dome crawl.
  reset(); cast('S09', { x: 470, z: .5 }); step(55); game.spawnMinionBolt(520, .5, -1, 'red', 10, .5, 18); step(3);
  const bolt = game.projectiles[game.projectiles.length - 1];
  assert(bolt && Math.abs(bolt.vx) < 150, 'Stillfuge: an enemy bolt inside the dome is slowed');
  // S20 Prismenhalter: catch an enemy bolt, fire it back on the next attack.
  reset(); cast('S20'); game.spawnMinionBolt(P.x + 70, P.z, -1, 'red', 18, P.z, 18); step(10);
  const caught = P.signature?.stored;
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.executeAttack(neutral, 'normal'); step(2);
  assert(caught && spells.activeSpells.filter((sp) => sp.isSigProjectile).length === 3, 'Prismenhalter: the bolt is caught and fired back as a three-crystal salvo');
  // S29 Bruchkoloss: wind-up, then a horizontal punch.
  reset(); cast('S29', { x: 430, z: .5 }); step(60); const before = dummy.hp; step(20);
  assert(before === dummy.maxHp && dummy.hp < before, 'Bruchkoloss: the fist only hits after its clear wind-up');
  // S13 Splittergarten: hitting a blossom sprays splinters.
  reset(); cast('S13', { x: 440, z: .5 }); step(70);
  const blossom = spells.activeSpells.find((sp) => sp.constructor.name === 'Blossom');
  P.x = blossom.x - 10; P.z = blossom.z; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.executeAttack(neutral, 'normal');
  assert(spells.activeSpells.some((sp) => sp.isSigProjectile), 'Splittergarten: an own hit makes a blossom spray splinters');
  // Hit events feed stances: S21 marks with the first hit and launches needles after.
  reset(); cast('S21'); dummy.x = dummy.homeX = P.x + 14;
  for (let k = 0; k < 3; k++) { P.x = dummy.x - 14; P.vx = 0; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.executeAttack(neutral, 'normal'); step(30); }
  assert(P.signature?.mark === dummy && P.signature.shots >= 1, 'Schwarmprotokoll: the first hit marks, further hits launch homing needles');
  // Orbs fire on command: Aureolenschwarm lenses shoot on every attack, even without a hit.
  reset(); cast('S02'); dummy.x = dummy.homeX = 900; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.executeAttack(neutral, 'normal');
  assert(P.signature?.charged === 2 && spells.activeSpells.some((sp) => sp.isSigProjectile), 'Aureolenschwarm: an attack fires a lens right away (no hit needed)');
  reset(); cast('S25'); P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.executeAttack(neutral, 'heavy');
  assert(spells.activeSpells.filter((sp) => sp.isSigProjectile).length === 3, 'Klingenchor: a heavy hurls all three blades');
  reset();
  // Deck rules: elemental ×2, special runes ×1 each, Arcane States one of all.
  const deck = ['ignis', 'ignis', 'sig_S01', 'sig_S13', 'buff_T05'];
  assert(!prog.deckAccepts(deck, 'ignis') && !prog.deckAccepts(deck, 'sig_S01') && prog.deckAccepts(deck, 'sig_S02') && !prog.deckAccepts(deck, 'buff_T13') && !prog.deckAccepts(['doppel'], 'doppel'), 'Deck: elemental runes twice, every special rune once, several signature specials but only one Arcane State');
  assert(prog.signatureUnlockLevel('sig_S01') === 5 && prog.signatureUnlockLevel('sig_S36') === 13, 'Signature specials unlock from Mage level 5 to 13');
  dummy.homeX = dummy.x = 512;
}

// Charged heavies: UP / DOWN work on every device (direction live until release).
{
  const buff = await import('./public/src/buff_forms.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy;
  const inp = (keys = {}, pz = 0) => ({ keys, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: pz }, justPressed: () => false });
  const ready = () => { spells.clearRuntime(); P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true; P.chargeTimer = 0; P.formCharge = null; P.isGuarding = false; };
  // Keyboard: K first, W afterwards still selects UP (and S DOWN) in an Arcane State.
  ready(); spells.cast(P, spells.resolveSpell([{ id: 'buff_T02' }]), game); P.buffForm.age = 2;
  P.beginCharge('forward', 'key'); P.update(1 / 60, inp({ KeyW: true }), game.battlefield, game);
  assert(P.chargeDir === 'up', 'K held, then W: the charged heavy switches to UP');
  P.formCharge.elapsed = 1.3; P.releaseCharge();
  assert(P.buffForm.lastTech?.dir === 'up' && P.buffForm.lastTech.full && spells.activeSpells.length > 0, 'The form releases its UP FULL technique');
  ready(); P.state = 'idle'; P.beginCharge('forward', 'pad'); P.update(1 / 60, inp({}, .9), game.battlefield, game); P.formCharge.elapsed = .3; P.releaseCharge();
  assert(P.buffForm.lastTech?.dir === 'down' && !P.buffForm.lastTech.full, 'Gamepad stick down while charging: DOWN SHORT technique');
  buff.endBuffForm(P);
  // Touch charges keep their gesture direction (no keyboard override).
  ready(); P.beginCharge('up', 'touch'); P.update(1 / 60, inp({}), game.battlefield, game);
  assert(P.chargeDir === 'up', 'A touch-armed UP charge keeps its direction');
  P.releaseCharge(); ready();
  // Without a form the charged heavy is directional too: UP launches, DOWN sweeps low.
  dummy.homeX = dummy.x = P.x + 14; dummy.homeZ = dummy.z = P.z; dummy.hp = dummy.maxHp;
  P.beginCharge('up', 'key'); P.chargeTimer = P.chargeMaxTime * .3; P.chargeDir = 'up'; P.releaseCharge();
  assert(P.state === 'uppercut' && dummy.hp < dummy.maxHp, 'Base UP charged heavy: a rising launcher');
  ready(); dummy.hp = dummy.maxHp; const downStarted = P.beginCharge('down', 'key');
  P.chargeTimer = P.chargeMaxTime * .3; P.chargeDir = 'down'; const downFired = P.releaseCharge();
  assert(!downStarted && !downFired && dummy.hp === dummy.maxHp, 'Normal mode: no generic ground charge-down (the low sweep is gone)');
  ready(); dummy.homeX = dummy.x = 512;
}

// Arcane State heavies cost mana (trade-off with runes and the Focus form).
{
  const buff = await import('./public/src/buff_forms.js');
  const { ARCANE_TECH_MANA } = await import('./public/src/entities.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; spells.clearRuntime();
  spells.cast(P, spells.resolveSpell([{ id: 'buff_T04' }]), game); P.buffForm.age = 2;
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true; P.mp = P.maxMp; P.reservedMana = 0; P.runeSlots?.fill?.(null);
  const before = P.mp; P.beginCharge('forward', 'key'); P.formCharge.elapsed = 1.3; P.releaseCharge();
  assert(before - P.mp === ARCANE_TECH_MANA.full, 'A full Arcane State technique costs 12 mana');
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.mp = 3; spells.clearRuntime();
  P.beginCharge('up', 'key'); P.formCharge.elapsed = .3; const fired = P.releaseCharge();
  assert(!fired && P.mp === 3 && !spells.activeSpells.length, 'Without free mana the technique fizzles (NO MANA)');
  // HOLD in an Arcane State: the pull drags the nearest foe in front close (and costs mana like every special).
  {
    const { HOLD_MANA } = await import('./public/src/hold_actions.js');
    const dummy = game.trainingDummy; P.mp = P.maxMp; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.x = 300; P.z = .5; P.facing = 1; game.battlefield.placeOnSurface(P);
    dummy.homeX = dummy.x = 520; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp; spells.clearRuntime();
    const before = P.mp; P.beginCharge('hold', 'key'); P.formCharge.elapsed = .3; P.releaseCharge();
    for (let i = 0; i < 40; i++) spells.update(1 / 60, game);
    assert(P.lastHoldAction === 'PULL' && before - P.mp === HOLD_MANA.pull && Math.abs(dummy.x - (P.x + 46)) < 12, 'Arcane State HOLD: the fired pull hook hits and drags the foe in front of the Wizard (5 mana)');
    {
      const { PULL_RANGE, PULL_COOLDOWN } = await import('./public/src/hold_actions.js');
      const pull = () => { P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.mp = P.maxMp; spells.clearRuntime(); P.beginCharge('hold', 'key'); P.formCharge.elapsed = .3; return P.releaseCharge(); };
      const run = (sec, each) => { for (let i = 0; i < sec * 60; i++) { each?.(); spells.update(1 / 60, game); } };
      // A second throw right away is on cooldown (no spam, no mana spent).
      const mpBefore = P.mp; assert(!pull() && P.mp === P.maxMp && P.pullCooldown > 0, 'The pull has a cooldown — it cannot be spammed');
      // Out of range: the hook flies to its limit and reels back empty.
      P.pullCooldown = 0; P.x = 300; P.facing = 1; dummy.x = 300 + PULL_RANGE + 80; dummy.elevation = 0; const far = dummy.x;
      pull(); run(.8);
      assert(dummy.x === far && P.pullCooldown > 0 && PULL_COOLDOWN >= 1, 'Out of range the hook misses and reels back empty (still on cooldown)');
      // No homing: the foe steps aside after the throw → miss.
      P.pullCooldown = 0; dummy.x = 480; dummy.z = .5; pull(); run(.6, () => { dummy.z = .85; });
      assert(Math.abs(dummy.x - 480) < 1, 'The hook does not home in: a foe that steps out of its line is not grabbed');
      // Airborne foe within range: aimed upward and grabbed.
      P.pullCooldown = 0; dummy.x = 470; dummy.z = .5; dummy.elevation = 110; pull(); run(.8, () => { if (!dummy._held) dummy.vElevation = 0; });
      assert(Math.abs(dummy.x - (P.x + 46)) < 14 && (dummy.elevation ?? 0) < 40, 'The hook also aims at foes in the air and pulls them down in front of the Wizard');
      // Behind the caster: aims backward and turns around.
      P.pullCooldown = 0; dummy.elevation = 0; dummy.x = 160; dummy.z = .5; P.x = 300; P.facing = 1; pull(); run(.8);
      assert(P.facing === -1 && Math.abs(dummy.x - (P.x - 46)) < 14, 'The hook fires at the nearest foe in range even behind the caster (turns around)');
      P.pullCooldown = 0; dummy.homeX = dummy.x = 520; dummy.z = .5; dummy.elevation = 0; void mpBefore;
    }
    // Every Arcane State (and each Focus transformation) pulls with its own look.
    const { PULL_LOOKS } = await import('./public/src/pull_looks.js');
    const strictPull = new Proxy({}, { get: (t, k) => (k === 'ellipse' || k === 'arc') ? (x, y, rx, ry) => { if (rx < 0 || (k === 'ellipse' && ry < 0)) throw new Error('IndexSizeError ' + k); } : (k === 'canvas' ? undefined : () => {}), set: () => true });
    const missingLook = []; const brokenLook = [];
    for (const id of [...Object.keys(buff.BUFF_FORMS), 'ninefold', 'eidolon', 'ascendant']) {
      if (!PULL_LOOKS[id]) { missingLook.push(id); continue; }
      for (const [k, d] of [[.5, 0], [1, .5], [1, 1]]) { try { PULL_LOOKS[id](strictPull, { hx: 300, hy: 250, tx: 300 + 200 * k * (1 - d * .8), ty: 260, k, d, a: 1, f: 1, t: 1.3, mat: buff.BUFF_FORMS[id]?.mat ?? buff.BUFF_FORMS.B02.mat, target: dummy, player: P, fromX: 500 }); } catch (e) { brokenLook.push(id + ': ' + e.message); } }
    }
    assert(!missingLook.length && !brokenLook.length && new Set(Object.values(PULL_LOOKS)).size >= 19, 'Every Arcane State and Focus transformation has its own pull look ' + [...missingLook, ...brokenLook].slice(0, 3).join(' | '));
    dummy.homeX = dummy.x = 512;
  }
  P.mp = P.maxMp; buff.endBuffForm(P); spells.clearRuntime();
}

// User reference art (18 Oct 2026): A01 Göttlicher Riese and A02 Mystischer Affe — six techniques that hit, own renderer, own charge ritual.
{
  const buff = await import('./public/src/buff_forms.js');
  const { FORM_MOVESETS } = await import('./public/src/form_moves.js');
  const { hasFormRenderer } = await import('./public/src/buff_vfx.js');
  const { ARCANE_MOVES, ARCANE_CHARGE } = await import('./public/src/arcane_moves.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const strict = new Proxy({}, { get: (t, k) => (k === 'ellipse' || k === 'arc') ? (x, y, rx, ry) => { if (rx < 0 || (k === 'ellipse' && ry < 0)) throw new Error('IndexSizeError ' + k); } : (k === 'canvas' ? undefined : () => {}), set: () => true });
  const slots = [['forward', 'short'], ['forward', 'full'], ['up', 'short'], ['up', 'full'], ['down', 'short'], ['down', 'full']];
  const missed = []; const broken = [];
  for (const id of ['A01', 'A02', 'A03']) for (const [dir, variant] of slots) {
    spells.clearRuntime(); buff.endBuffForm(P);
    P.x = 400; P.z = .5; P.facing = 1; P.state = 'idle'; P.stateTimer = 0; game.battlefield.placeOnSurface(P);
    dummy.homeX = dummy.x = 470; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp;
    spells.cast(P, spells.resolveSpell([{ id: 'buff_' + id }]), game); P.buffForm.age = 2;
    try {
      spells.addSpell(FORM_MOVESETS[id][dir][variant].make(P), 'B');
      for (let i = 0; i < 90; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); if (i % 10 === 0) for (const sp of spells.activeSpells) sp.render?.(strict); }
      if (!(dummy.hp < dummy.maxHp)) missed.push(id + ' ' + dir + ' ' + variant);
    } catch (e) { broken.push(id + ' ' + dir + ' ' + variant + ': ' + e.message); }
  }
  assert(ARCANE_MOVES.A01?.length === 6 && ARCANE_MOVES.A02?.length === 6 && ARCANE_MOVES.A01.every(Boolean) && ARCANE_MOVES.A02.every(Boolean), 'A01 Göttlicher Riese and A02 Mystischer Affe have six techniques of their own');
  assert(!broken.length && !missed.length, 'All eighteen A01 / A02 / A03 techniques run, render and hit a foe in front ' + [...broken, ...missed].slice(0, 3).join(' | '));
  let charged = true;
  for (const id of ['A01', 'A02']) for (const dir of ['forward', 'up', 'down']) { try { ARCANE_CHARGE[id](strict, { x: 400, y: 300, f: 1 }, buff.BUFF_FORMS[id].mat, dir, .7, 1.2); } catch { charged = false; } }
  assert(charged && hasFormRenderer('A01') && hasFormRenderer('A02') && buff.BUFF_FORMS.A01.mat.kind === 'crystal', 'A01 / A02 have their own renderer and a charge ritual in every direction');
  buff.endBuffForm(P); spells.clearRuntime();
}

// Block 3: every Arcane State has its own sprint attack (mechanic + look + impact) and its own air dive.
{
  const buff = await import('./public/src/buff_forms.js');
  const FS = await import('./public/src/form_specials.js');
  const { FORM_SPRINT_ATTACKS, FormSprintAttackFx } = await import('./public/src/form_actions.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const strict = new Proxy({}, { get: (t, k) => (k === 'ellipse' || k === 'arc') ? (x, y, rx, ry) => { if (rx < 0 || (k === 'ellipse' && ry < 0)) throw new Error('IndexSizeError ' + k); } : (k === 'canvas' ? undefined : (k === 'measureText' ? () => ({ width: 10 }) : (k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}))), set: () => true });
  const ids = Object.keys(buff.BUFF_FORMS);
  const impacts = ids.filter((id) => FS.FORM_SPRINTS[id]).map((id) => FS.FORM_SPRINTS[id].impact);
  assert(new Set(impacts).size === impacts.length && impacts.length === 17, 'Every Arcane State (besides the B01 / B02 engines) has its own sprint impact');
  assert(ids.every((id) => FS.FORM_DIVES[id]) && new Set(ids.map((id) => FS.FORM_DIVES[id].style)).size === ids.length && ['ninefold', 'eidolon', 'ascendant'].every((k) => FS.FORM_DIVES[k]), 'Every Arcane State and Focus transformation has its own air dive');
  const broken = [];
  for (const id of ids) {
    try {
      spells.clearRuntime(); buff.endBuffForm(P); P.weaponBuff = null; P.equipClassWeapon(null);
      P.x = 300; P.z = .5; P.facing = 1; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.mp = P.maxMp; P.reservedMana = 0; game.battlefield.placeOnSurface(P);
      dummy.homeX = dummy.x = 370; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp;
      spells.cast(P, spells.resolveSpell([{ id: 'buff_' + id }]), game); P.buffForm.age = 2;
      // Sprint attack: own variant, costs mana, renders.
      const mp0 = P.mp; P.sprintActive = true; P.vx = 300; P.startSprintAttack();
      if (P.lastSprintAttack !== FORM_SPRINT_ATTACKS[buff.BUFF_FORMS[id].moveset]?.name) broken.push(id + ': sprint name ' + P.lastSprintAttack);
      if (mp0 - P.mp !== FS.FORM_SPECIAL_MANA.sprint) broken.push(id + ': sprint mana');
      for (let i = 0; i < 40; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); if (i % 8 === 0) for (const sp of spells.activeSpells) sp.render?.(strict); }
      // Air dive: own dive, costs mana, lands and renders.
      P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.sprintStrike = null; P.grounded = false; P.elevation = 70; P.vElevation = 0; const mp1 = P.mp;
      P.executeAttack(neutral, 'dive');
      if (P.lastFormDive !== id || mp1 - P.mp !== FS.FORM_SPECIAL_MANA.dive) broken.push(id + ': dive');
      for (let i = 0; i < 80; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); if (i % 10 === 0) for (const sp of spells.activeSpells) sp.render?.(strict); for (const layer of ['back', 'front']) buff.renderBuffManifestation(strict, P, P.y, layer); }
    } catch (e) { broken.push(id + ': ' + e.message); }
  }
  assert(!broken.length, 'Every Arcane State sprint attack and air dive runs, costs mana and renders ' + broken.slice(0, 4).join(' | '));
  buff.endBuffForm(P); spells.clearRuntime(); P.grounded = true; P.elevation = 0;
}

// Block 4a: NATURA, heal circles, the world tree (platforms), spell geometry and weapon infusions.
{
  const NS = await import('./public/src/nature_spells.js');
  const G = await import('./public/src/geometry.js');
  const { lookupRecipe, SPELL_DEFINITIONS } = await import('./public/src/spell_catalog.js');
  const { ALL_RUNE_IDS } = await import('./public/src/progression.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const strict = new Proxy({}, { get: (t, k) => (k === 'ellipse' || k === 'arc') ? (x, y, rx, ry) => { if (rx < 0 || (k === 'ellipse' && ry < 0)) throw new Error('IndexSizeError ' + k); } : (k === 'canvas' ? undefined : (k === 'measureText' ? () => ({ width: 10 }) : () => {})), set: () => true });
  const R = (ids) => lookupRecipe(ids.map((id) => ({ id })))?.id;
  assert(ALL_RUNE_IDS.includes('natura') && R(['natura']) === 'heal_bloom' && R(['natura', 'terra']) === 'thorn_growth' && R(['terra', 'aqua', 'natura']) === 'world_tree' && R(['construct', 'ignis']) === 'flame_edge', 'NATURA is an elemental rune with its own combinations (Weltenbaum = Terra + Aqua + Natura, infusions = Konstrukt + element)');
  const reset = () => { spells.clearRuntime(); P.x = 300; P.z = .5; P.facing = 1; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.hp = P.maxHp; P.weaponInfusion = null; game.battlefield.placeOnSurface(P); dummy.homeX = dummy.x = 380; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp; };
  const step = (n) => { for (let i = 0; i < n; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); } };
  const broken = [];
  for (const id of [...NS.NATURE_SPELL_IDS, ...Object.keys(NS.INFUSION_SPELLS)]) {
    try { reset(); spells.cast(P, SPELL_DEFINITIONS[id], game, null, { x: 420, z: .5 }); for (let i = 0; i < 90; i++) { step(1); if (i % 15 === 0) for (const sp of spells.activeSpells) sp.render?.(strict); } } catch (e) { broken.push(id + ': ' + e.message); }
  }
  assert(!broken.length, 'Every NATURA spell and weapon infusion casts, runs and renders ' + broken.slice(0, 3).join(' | '));
  reset(); P.hp = P.maxHp - 100; spells.cast(P, SPELL_DEFINITIONS.heal_bloom, game); step(185);
  assert(P.hp > P.maxHp - 100 + 30, 'HEILBLÜTE: the magic circle heals over time');
  reset(); spells.cast(P, SPELL_DEFINITIONS.thorn_growth, game); step(30);
  assert(dummy.hp < dummy.maxHp, 'DORNENWUCHS: the brambles catch the foe ahead');
  // World tree: branches are real platforms — the Wizard lands on one and stands there.
  reset(); spells.cast(P, SPELL_DEFINITIONS.world_tree, game, null, { x: 520, z: .5 }); step(150);
  const tree = spells.activeSpells.find((s) => s.isWorldTree);
  assert(tree && (game.battlefield.dynamicSurfaces ?? []).length === 2 && game.getHostileTargets('red').includes(tree) && !game.getHostileTargets('blue').includes(tree), 'WELTENBAUM grows with two branch platforms; it is breakable only by the other team');
  const branch = tree.branches[0];
  P.x = branch.x; P.z = branch.z; P.grounded = false; P.elevation = 0; P.surfaceHeight = 0; P.vElevation = 0;
  P.elevation = branch.height + 20; step(60);
  assert(P.grounded && P.surfaceId === branch.surface.id && Math.abs(P.worldHeight - branch.height) < 4, 'A Wizard falling onto a world-tree branch lands and stands on it');
  // A spell pillar emerging under a foe: hit, and a hero standing in it rides it up.
  reset(); const pillar = G.spawnPlatform(spells, P, game, { x: 300, z: .5, height: 80, life: 2, look: 'stone', damage: 0 }); step(30);
  assert(Math.abs(P.worldHeight - 80) < 4 && P.surfaceId === pillar.surface.id, 'A pillar rising under the Wizard carries him up (platform)');
  step(120); assert(P.worldHeight < 4 && !(game.battlefield.dynamicSurfaces ?? []).includes(pillar.surface), 'When the pillar decays the Wizard comes down and the surface is gone');
  // Infusion: a flame blade burns on hit.
  reset(); spells.cast(P, SPELL_DEFINITIONS.flame_edge, game); dummy.homeX = dummy.x = P.x + 12; P.executeAttack(neutral, 'normal');
  assert(P.weaponInfusion?.element === 'fire' && P.weaponInfusion.hits === 1 && dummy.hp < dummy.maxHp, 'FLAMMENKLINGE: the infused weapon burns on hit');
  reset();
}

// Block 4b: S37–S42 — own objects (ice spikes, stone shafts), water drill shell, breathing styles.
{
  const core = await import('./public/src/signature_core.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const reset = () => { spells.clearRuntime(); if (P.signature) core.endStance(P, 'replaced'); P.x = 300; P.z = .5; P.facing = 1; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.hp = P.maxHp; game.battlefield.placeOnSurface(P); dummy.homeX = dummy.x = 400; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp; };
  const step = (n) => { for (let i = 0; i < n; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); } };
  const cast = (id, target = null) => spells.cast(P, spells.resolveSpell([{ id: 'sig_' + id }]), game, null, target);
  reset(); cast('S37'); step(40);
  assert((game.battlefield.dynamicSurfaces ?? []).filter((sf) => sf.label === 'Ice spike').length === 7 && dummy.hp < dummy.maxHp, 'S37 EISZACKEN: seven ice spikes erupt in a row (each a platform) and hit the foe');
  reset(); cast('S38', { x: 360, z: .5 }); step(60);
  const shafts = (game.battlefield.dynamicSurfaces ?? []).filter((sf) => sf.label === 'Stone shaft');
  assert(shafts.length === 3 && shafts[0].heightAt(0) < shafts[1].heightAt(0) && shafts[1].heightAt(0) < shafts[2].heightAt(0), 'S38 SCHACHTWUCHS: three stepped stone shafts (low, middle, high) as platforms');
  reset(); cast('S39'); const hp0 = P.hp; P.takeDamage(30, 0, 0, .1, false, 'spell'); step(60);
  assert(P.signature?.id === 'S39' && hp0 - P.hp <= 21 && dummy.hp < dummy.maxHp, 'S39 TIDENBOHRER: the water shell takes a third of a hit and its jets hammer the foe');
  reset(); cast('S40'); dummy.homeX = dummy.x = P.x + 20; for (let i = 0; i < 3; i++) { P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.executeAttack(neutral, 'normal'); step(4); }
  step(40); assert(P.signature?.id === 'S40' && dummy.hp < dummy.maxHp, 'S40 WASSERATMUNG: water arcs on every swing, the finisher sends a wave');
  reset(); cast('S42'); P.sprintActive = true; P.vx = 300; P.startSprintAttack();
  assert(P.lastSprintAttack === 'BLITZSCHRITT' && P.sprintStrike?.variant?.pierce, 'S42 DONNERATMUNG: the sprint attack becomes a lightning dash through everyone in line');
  // Charged forward attack = the breathing's signature move.
  const charged = () => { P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.beginCharge('forward'); P.chargeTimer = P.chargeMaxTime * .1; P.releaseCharge(); };
  reset(); cast('S41'); dummy.homeX = dummy.x = P.x + 330; dummy.hp = dummy.maxHp; dummy.statusImmuneUntil = {}; charged(); step(50);
  assert(dummy.hp < dummy.maxHp && STATUS.hasStatus(dummy, 'burn'), 'S41 FLAMMENATMUNG charged: a flame serpent rolls far down the lane (330 px) and burns');
  reset(); cast('S42'); dummy.homeX = dummy.x = P.x + 150; dummy.hp = dummy.maxHp; dummy.statusImmuneUntil = {}; charged(); step(12);
  assert(P.x > dummy.x && dummy.hp < dummy.maxHp && STATUS.hasStatus(dummy, 'paralysis'), 'S42 DONNERATMUNG charged: one flash — the Wizard strikes through the foe and stands behind it (paralysed)');
  reset(); cast('S40'); dummy.homeX = dummy.x = P.x + 300; dummy.hp = dummy.maxHp; dummy.statusImmuneUntil = {}; charged(); step(45);
  assert(dummy.hp < dummy.maxHp && STATUS.hasStatus(dummy, 'wet'), 'S40 WASSERATMUNG charged: a towering flood wave sweeps the lane and soaks');
  reset();
}

// Block 5: placement families look different; heal / buff special runes with their own objects.
{
  const core = await import('./public/src/signature_core.js');
  const { SPELL_DEFINITIONS } = await import('./public/src/spell_catalog.js');
  const K = await import('./public/src/weapon_kits.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const strict = new Proxy({}, { get: (t, k) => (k === 'ellipse' || k === 'arc') ? (x, y, rx, ry) => { if (rx < 0 || (k === 'ellipse' && ry < 0)) throw new Error('IndexSizeError ' + k); } : (k === 'canvas' ? undefined : () => {}), set: () => true });
  const reset = () => { spells.clearRuntime(); if (P.signature) core.endStance(P, 'replaced'); P.x = 300; P.z = .5; P.facing = 1; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.hp = P.maxHp; game.battlefield.placeOnSurface(P); };
  const step = (n) => { for (let i = 0; i < n; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); } };
  const walls = [];
  for (const id of ['stone_wall', 'construct_bulwark']) { reset(); spells.cast(P, SPELL_DEFINITIONS[id], game, null, { start: { x: 360, z: .4 }, end: { x: 360, z: .6 }, x: 360, z: .5, orientation: 'lateral', length: 80 }); step(20); walls.push(...spells.activeSpells.filter((w) => w.isStoneWall)); }
  let wallRender = true; try { for (const w of walls) w.render(strict); } catch { wallRender = false; }
  assert(walls.some((w) => w.style === 'masonry') && walls.some((w) => w.style === 'bulwark') && wallRender, 'Placed walls look different: masonry rampart (Stone Wall) vs. riveted steel bulwark (Construct)');
  reset(); P.hp = P.maxHp - 80; spells.cast(P, spells.resolveSpell([{ id: 'sig_S43' }]), game, null, { x: 300, z: .5 }); step(120);
  assert(P.hp > P.maxHp - 80 + 8 && spells.activeSpells.some((sp) => sp.isWorldProp && sp.radius === 100), 'S43 SANKTUARIUM: an obelisk in a magic circle heals allies inside (a breakable object)');
  reset(); spells.cast(P, spells.resolveSpell([{ id: 'sig_S44' }]), game, null, { x: 320, z: .5 }); step(10);
  assert(K.meleeBuffMods(P).dmg >= 1.2 && K.weaponMoveMult(P) >= 1.1, 'S44 KRIEGSBANNER: allies near the banner strike harder and move faster');
  P.x = 700; assert(K.meleeBuffMods(P).dmg === 1, 'Away from the banner the bonus is gone');
  reset();
}

// Regression (found by the visual catalog capture): clearing the spells mid-burrow left the Wizard underground and invisible.
{
  const { SPELL_DEFINITIONS } = await import('./public/src/spell_catalog.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch();
  const P = game.player; spells.clearRuntime(); P.state = 'idle'; P.stateTimer = 0; P.canAttack = true;
  spells.cast(P, SPELL_DEFINITIONS.burrow_strike, game);
  const wasBurrowed = P.burrowed; spells.clearRuntime();
  assert(wasBurrowed && !P.burrowed, 'Clearing the spells mid-burrow brings the Wizard back above ground');
  P.burrowed = true; P.respawn(game.battlefield);
  assert(!P.burrowed, 'A respawn never leaves the Wizard underground');
}

// Visual upgrade pilot A (docs/GRIMGE_Visual_Upgrade_Plan.md): sprite-based Eiszacken on a read-only visual layer.
{
  const V = await import('./public/src/spell_visuals.js');
  const { SPELL_SPRITE_SHEETS } = await import('./public/src/spell_sprite_sheets.js');
  const core = await import('./public/src/signature_core.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch();
  const P = game.player; spells.clearRuntime(); if (P.signature) core.endStance(P, 'replaced');
  P.x = 300; P.z = .5; P.facing = 1; P.state = 'idle'; P.stateTimer = 0; game.battlefield.placeOnSurface(P);
  spells.cast(P, spells.resolveSpell([{ id: 'sig_S37' }]), game);
  const spikes = spells.activeSpells.filter((sp) => sp.surface?.label === 'Ice spike');
  // No sheets loaded (missing files / no Image) → the old procedural renderer draws (fallback).
  for (const name of Object.keys(SPELL_SPRITE_SHEETS)) V.__setSpellSheetImage(name, null);
  assert(spikes.length === 7 && !V.renderSpellVisual(new Proxy({}, { get: () => () => {} }), spikes[0], 'ice_spike'), 'Without loaded sheets the visual layer falls back to the old renderer');
  assert(Object.keys(SPELL_SPRITE_SHEETS).filter((k) => k.startsWith('ice_spike_v')).length === 7 && ['ice_crack', 'ice_shard', 'ice_hit', 'ice_cast'].every((k) => SPELL_SPRITE_SHEETS[k]), 'Pilot A sheets: seven spike variants (one per height) plus crack, shards, hit and cast');
  // Phases come from the spike's own timers.
  const sp = spikes[6]; const frameAt = (t) => { sp.t = t; return V.iceSpikeFrame(sp); };
  assert(frameAt(-.1) === -1 && frameAt(.01) === 0 && frameAt(.11) === 2 && frameAt(1.5) === 3 && frameAt(sp.life - .01) === 6, 'Spike frames follow emerge / hold / break of the gameplay object');
  // With a sheet present: drawn as a sprite; its plateau sits on the real platform height (± 1 px); flipped when facing left.
  const calls = []; const rec = new Proxy({}, { get: (t, k) => k === 'drawImage' ? (...a) => calls.push(a) : (k === 'save' || k === 'restore' || k === 'translate' || k === 'scale') ? (...a) => calls.push([k, ...a]) : () => {}, set: () => true });
  for (const name of Object.keys(SPELL_SPRITE_SHEETS)) V.__setSpellSheetImage(name, { width: 1, height: 1 });
  sp.t = 1.5; V.renderSpellVisual(rec, sp, 'ice_spike');
  const draw = calls.find((c) => typeof c[0] === 'object' && c.length === 9);
  const meta = SPELL_SPRITE_SHEETS.ice_spike_v6;
  const plateauTop = draw ? draw[6] + (meta.h - 1 - meta.baseOffset - meta.plateau) * 2 : NaN;
  assert(draw && Math.abs((sp.y - plateauTop) - sp.height) <= 1, 'The ice rib plateau matches the standable platform height (pixel-aligned)');
  calls.length = 0; P.facing = -1; V.renderSpellVisual(rec, sp, 'ice_spike'); P.facing = 1;
  assert(calls.some((c) => c[0] === 'scale' && c[1] === -1), 'Cast to the left: the ice ribs are mirrored');
  // Impact / cast sprites are visual only (no hit logic).
  const burst = new V.SpriteBurst({ sheet: 'ice_hit', x: 400, z: .5 });
  for (let i = 0; i < 20; i++) burst.update(1 / 60);
  assert(burst.isVisualOnly && burst.isFinished && !('damage' in burst), 'Impact sprites are purely visual and finish after their animation');
  for (const name of Object.keys(SPELL_SPRITE_SHEETS)) V.__setSpellSheetImage(name, null);
  spells.clearRuntime();
}

// Visual upgrade pilot B: Meteor Cataclysm sprites on the read-only visual layer; gameplay unchanged.
{
  const V = await import('./public/src/spell_visuals.js');
  const { SPELL_SPRITE_SHEETS } = await import('./public/src/spell_sprite_sheets.js');
  const { SPELL_DEFINITIONS } = await import('./public/src/spell_catalog.js');
  const { combat } = await import('./public/src/combat.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch();
  const P = game.player; const dummy = game.trainingDummy;
  const run = (sheets) => {
    for (const name of Object.keys(SPELL_SPRITE_SHEETS)) V.__setSpellSheetImage(name, sheets ? { width: 1, height: 1 } : null);
    spells.clearRuntime(); combat.particles.length = 0; dummy.homeX = dummy.x = 520; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp;
    spells.cast(P, SPELL_DEFINITIONS.meteor_cataclysm, game, null, { x: 520, z: .5 });
    const m = spells.activeSpells.find((sp) => sp.isHeavyObject);
    let particlesWhileFalling = 0; let t = 0;
    while (!m.isLanded && t < 2) { spells.update(1 / 60, game); t += 1 / 60; if (!m.isLanded) particlesWhileFalling = combat.particles.length; }
    for (let i = 0; i < 5; i++) spells.update(1 / 60, game);
    return { m, t, particlesWhileFalling, damage: dummy.maxHp - dummy.hp };
  };
  const legacy = run(false); const sprite = run(true);
  assert(Math.abs(legacy.t - sprite.t) < 1e-9 && legacy.damage === sprite.damage && legacy.damage > 0, 'Meteor: fall time and impact damage are identical with and without the sprite visuals');
  assert(legacy.particlesWhileFalling > 30 && sprite.particlesWhileFalling < 10, 'Meteor: with sprites the generic fire particles no longer bury the falling body');
  const calls = []; const rec = new Proxy({}, { get: (t, k) => k === 'drawImage' ? (...a) => calls.push(a) : () => {}, set: () => true });
  const fresh = run(true); spells.clearRuntime(); spells.cast(P, SPELL_DEFINITIONS.meteor_cataclysm, game, null, { x: 520, z: .5 });
  const falling = spells.activeSpells.find((sp) => sp.isHeavyObject);
  V.renderSpellVisual(rec, falling, 'meteor');
  assert(fresh.m.isLanded && calls.length >= 4, 'Meteor falling: telegraph, trail, flame and body are drawn as sprites');
  calls.length = 0; V.renderSpellVisual(rec, fresh.m, 'meteor');
  assert(calls.length >= 2, 'Meteor landed: crater and explosion are drawn as sprites');
  // A strong beam still shatters it in the air (heavy object), now with a visual debris burst.
  spells.clearRuntime(); spells.cast(P, SPELL_DEFINITIONS.meteor_cataclysm, game, null, { x: 520, z: .5 });
  const target = spells.activeSpells.find((sp) => sp.isHeavyObject); target.takeBeamDamage(60);
  assert(target.isFinished && spells.activeSpells.some((sp) => sp.isVisualOnly && sp.sheet === 'meteor_debris'), 'A beam still shatters the meteor in the air; the debris burst is purely visual');
  for (const name of Object.keys(SPELL_SPRITE_SHEETS)) V.__setSpellSheetImage(name, null);
  spells.clearRuntime(); combat.particles.length = 0;
}

// Visual upgrade pilot C: Tidenbohrer rotor / jets as sprites; stance mechanics unchanged.
{
  const V = await import('./public/src/spell_visuals.js');
  const { SPELL_SPRITE_SHEETS } = await import('./public/src/spell_sprite_sheets.js');
  const core = await import('./public/src/signature_core.js');
  const sig = await import('./public/src/signature_runes.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch();
  const P = game.player; const dummy = game.trainingDummy;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const run = (sheets) => {
    for (const name of Object.keys(SPELL_SPRITE_SHEETS)) V.__setSpellSheetImage(name, sheets ? { width: 1, height: 1 } : null);
    spells.clearRuntime(); if (P.signature) core.endStance(P, 'replaced');
    P.x = 300; P.z = .5; P.facing = 1; P.state = 'idle'; P.stateTimer = 0; P.hp = P.maxHp; game.battlefield.placeOnSurface(P);
    dummy.homeX = dummy.x = 400; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp;
    spells.cast(P, spells.resolveSpell([{ id: 'sig_S39' }]), game);
    const calls = []; const rec = new Proxy({}, { get: (t, k) => k === 'drawImage' ? (...a) => calls.push(a) : () => {}, set: () => true });
    for (let i = 0; i < 90; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); if (i === 60) for (const l of ['back', 'front']) sig.renderSignatureStance(rec, P, P.y, l); }
    return { dmg: dummy.maxHp - dummy.hp, draws: calls.length, jets: P.signature?.jets?.length ?? 0 };
  };
  const legacy = run(false); const sprite = run(true);
  assert(legacy.dmg === sprite.dmg && legacy.dmg > 0, 'Tidenbohrer: jet damage is identical with and without the sprite visuals');
  assert(legacy.draws === 0 && sprite.draws >= 4, 'Tidenbohrer: rotor halves and nozzles are drawn as sprites (fallback without sheets)');
  for (const name of Object.keys(SPELL_SPRITE_SHEETS)) V.__setSpellSheetImage(name, null);
  spells.clearRuntime(); if (P.signature) core.endStance(P, 'replaced');
}

// Block B: two-stage spells (slot stays after stage 1, tap again for stage 2) and counter charges.
{
  const core = await import('./public/src/signature_core.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch();
  const P = game.player; const dummy = game.trainingDummy;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const frame = (sec) => { for (let t = 0; t < sec; t += 1 / 60) { P.update(1 / 60, neutral, game.battlefield, game); game.updateRecasts(1 / 60); spells.update(1 / 60, game); dummy.update?.(1 / 60, game, game.battlefield); } };
  const reset = () => { spells.clearRuntime(); if (P.signature) core.endStance(P, 'replaced'); P.slottedSpells.length = 0; P.preparedRunes = []; P.x = 300; P.z = .5; P.facing = 1; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.hp = P.maxHp; P.mp = P.maxMp; game.battlefield.placeOnSurface(P); dummy.homeX = dummy.x = 470; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp; };
  // S45: kunai sticks in the foe, the slot stays (paid, counting down), second tap teleports behind the foe.
  reset(); const s45 = game.slotRuneSpell(runeById('sig_S45')); const mp0 = P.mp;
  game.castSlotAt(s45.position);
  assert(P.slottedSpells.includes(s45) && s45.recast && s45.manaCost === 0 && mp0 - P.mp > 0, 'Two-stage spell: after stage 1 the slot stays with an open re-cast (mana paid once)');
  frame(.4);
  const hpAfterKunai = dummy.hp;
  game.castSlotAt(s45.position);
  assert(!P.slottedSpells.includes(s45) && Math.abs(P.x - dummy.x) < 40 && dummy.hp < hpAfterKunai, 'S45 BLITZMARKE stage 2: teleport to the kunai in the foe, strike from behind, slot freed');
  // Window runs out → the slot is freed without stage 2.
  reset(); const s45b = game.slotRuneSpell(runeById('sig_S45')); dummy.homeX = dummy.x = 900; game.castSlotAt(s45b.position); frame(5.3);
  assert(!P.slottedSpells.includes(s45b), 'When the re-cast window runs out the slot is freed');
  // S46: rush launches, stage 2 slams it down with an explosion.
  reset(); const s46 = game.slotRuneSpell(runeById('sig_S46')); dummy.homeX = dummy.x = 360; game.castSlotAt(s46.position); frame(.3);
  const launched = (dummy.vElevation ?? 0) > 0 || (dummy.elevation ?? 0) > 0 || dummy.hp < dummy.maxHp;
  const hp1 = dummy.hp; game.castSlotAt(s46.position); frame(.1);
  const hoverH = P.elevation; const hoverX = P.x; frame(.1); const stillUp = P.elevation;
  assert(hoverH >= 150 && stillUp >= 150 && Math.abs(hoverX - dummy.x) < 30, 'S46 stage 2: the Wizard appears high above the foe and hangs there for a beat');
  frame(.9);
  const crater = spells.activeSpells.find((sp) => sp.isSpiralCrater);
  assert(launched && dummy.hp < hp1 && !P.slottedSpells.includes(s46) && P.grounded, 'S46 SPIRALKUGEL: the rush launches the foe, stage 2 slams it down from above');
  assert(crater && crater.isGroundDecal, 'S46 impact leaves a (purely visual) crater on the ground');
  { let bad = false; const cctx = new Proxy({}, { get: (t, k) => (k === 'ellipse' || k === 'arc') ? (...v) => { if (v[2] < 0 || (k === 'ellipse' && v[3] < 0)) bad = true; } : k === 'canvas' ? undefined : () => {}, set: () => true });
    for (const sp of spells.activeSpells) sp.render?.(cctx); crater.t = crater.life - .01; crater.render(cctx);
    assert(!bad, 'S46 slam and crater render without negative radii'); }
  // S47: the trap stays armed after the window — no manual detonation, but contact still sets it off.
  reset(); dummy.homeX = dummy.x = 900; const s47 = game.slotRuneSpell(runeById('sig_S47')); game.castSlotAt(s47.position);
  if (game.targeting.isActive) { game.targeting.setPoint?.({ x: 520, z: .5 }); game.targeting.confirm(); }
  const trap = spells.activeSpells.find((sp) => sp.constructor.name === 'SealTrap');
  frame(6.3);
  assert(trap && !trap.fired && !trap.isFinished && !trap.manual && !P.slottedSpells.includes(s47), 'S47 BANNFALLE: after the window the trap stays armed (manual detonation gone)');
  dummy.homeX = dummy.x = trap.x; dummy.homeZ = dummy.z = trap.z; frame(.2);
  assert(trap.fired && dummy.hp < dummy.maxHp, 'S47: a foe stepping on the armed trap sets it off');
  reset(); dummy.homeX = dummy.x = 900; const s47b = game.slotRuneSpell(runeById('sig_S47')); game.castSlotAt(s47b.position);
  if (game.targeting.isActive) { game.targeting.setPoint?.({ x: 520, z: .5 }); game.targeting.confirm(); }
  const trap2 = spells.activeSpells.find((sp) => sp.constructor.name === 'SealTrap'); frame(.5); game.castSlotAt(s47b.position);
  assert(trap2?.fired && trap2.big, 'S47 stage 2 within the window: detonate the trap yourself (bigger blast)');
  // S50 SPIEGELKERKER: shard → six mirrors around the foe; 4 single dashes, the 5th tap is the mirror storm.
  reset(); dummy.homeX = dummy.x = 470; const s50 = game.slotRuneSpell(runeById('sig_S50')); game.castSlotAt(s50.position); frame(.4);
  const prison = spells.activeSpells.find((sp) => sp.constructor.name === 'MirrorPrison');
  assert(prison?.trapped && P.slottedSpells.includes(s50) && /SPIEGELSPRUNG 1\/4/.test(s50.recast?.label ?? ''), 'S50: the shard hits, six ice mirrors rise around the foe (prison) and the slot waits for the dashes');
  let hpMirror = dummy.hp; let dashHits = 0;
  for (let i = 0; i < 4; i++) { game.castSlotAt(s50.position); frame(.3); if (dummy.hp < hpMirror) dashHits++; hpMirror = dummy.hp; }
  assert(dashHits === 4 && P.slottedSpells.includes(s50) && s50.recast?.label === 'SPIEGELSTURM', 'S50: every tap sends a mirror image through the foe (4 dashes), then the storm is offered');
  game.castSlotAt(s50.position); frame(2);
  assert(dummy.hp < hpMirror && !P.slottedSpells.includes(s50) && prison.isFinished, 'S50: the 5th tap is the mirror storm — all mirrors at once, then they shatter and the slot is free');
  reset(); dummy.homeX = dummy.x = 900; const s50b = game.slotRuneSpell(runeById('sig_S50')); game.castSlotAt(s50b.position); frame(1.6);
  assert(!P.slottedSpells.includes(s50b) && !spells.activeSpells.some((sp) => sp.constructor.name === 'MirrorPrison'), 'S50: a missed shard builds no prison and frees the slot');
  // S51 BLUTKREUZ: a foe in the blood circle is bound to the cross; faster taps hit harder.
  const crossRun = (gap) => {
    reset(); dummy.homeX = dummy.x = 520; const s51 = game.slotRuneSpell(runeById('sig_S51')); game.castSlotAt(s51.position);
    if (game.targeting.isActive) { game.targeting.setPoint?.({ x: 520, z: .5 }); game.targeting.confirm(); }
    frame(.1);
    const circle = spells.activeSpells.find((sp) => sp.constructor.name === 'BloodCircle');
    const label = s51.recast?.label; const hp0 = dummy.hp;
    for (let i = 0; i < 6; i++) { game.castSlotAt(s51.position); frame(gap); }
    return { circle, label, perTap: (hp0 - dummy.hp) / Math.max(1, circle?.taps ?? 1), taps: circle?.taps ?? 0, slot: s51 };
  };
  const fast = crossRun(.1); const slow = crossRun(.45);
  assert(fast.circle?.bindT != null && fast.label === 'SCHNELL DRÜCKEN!' && fast.taps === 6, 'S51: the foe steps into the blood circle, is bound to the cross and the slot asks for fast taps');
  assert(fast.perTap > slow.perTap * 1.5, `S51: faster tapping hits harder (${fast.perTap.toFixed(1)} vs ${slow.perTap.toFixed(1)} per tap)`);
  frame(4);
  assert(!P.slottedSpells.includes(slow.slot) && slow.circle.isFinished, 'S51: after the binding a burst ends it and the slot is freed');
  // S52 HERAUSFORDERUNG: foes in range are taunted, the challenger takes 30 % less damage.
  reset(); dummy.homeX = dummy.x = 470; const s52 = game.slotRuneSpell(runeById('sig_S52')); game.castSlotAt(s52.position);
  assert(dummy.tauntedBy === P && dummy.tauntTimer > 3.5 && P.signature?.id === 'S52', 'S52: nearby foes are taunted by the challenger');
  P.invulnerableTimer = 0; const hpT = P.hp; P.takeDamage(20, 0, 0, .1, false, 'spell');
  assert(Math.abs((hpT - P.hp) - 14 * (P.buildModifiers?.damageTaken ?? 1)) < .6, 'S52: while challenging the Wizard takes 30 % less damage');
  frame(4.2);
  assert(!dummy.tauntedBy && !P.signature, 'S52: the taunt wears off after 4 s');
  // S53 SPHÄRENENTFALTUNG: sure-hit dome, foes trapped, finale on the 2nd tap, domain duel.
  {
    const D = await import('./public/src/signature_abilities_g.js');
    core.setSignatureSink(spells);
    reset(); dummy.homeX = dummy.x = P.x + 110; const s53 = game.slotRuneSpell(runeById('sig_S53')); game.castSlotAt(s53.position);
    const dom = spells.activeSpells.find((sp) => sp instanceof D.Domain);
    frame(.2);
    assert(dom && dummy.hp === dummy.maxHp && P.state === 'heavyStrike', 'S53: hand sign first (the caster is rooted, nothing happens yet)');
    // Every unfold phase renders cleanly (radii grow from zero).
    { let badU = 0; const strictU = new Proxy({}, { get: (t, k) => (k === 'arc' || k === 'ellipse') ? (x, y, r1, r2) => { if (r1 < 0 || (k === 'ellipse' && r2 < 0)) badU++; } : k === 'canvas' ? undefined : () => {}, set: () => true });
      const t0 = dom.t; for (const tt of [.1, .36, .4, .5, .7, 1, 1.5]) { dom.t = tt; for (const sp of spells.activeSpells) sp.render?.(strictU); } dom.t = t0;
      assert(!badU, 'S53: the dome renders cleanly in every unfold phase'); }
    frame(1.6); const cut1 = dummy.maxHp - dummy.hp; frame(1); const cut2 = dummy.maxHp - dummy.hp;
    assert(dom.unfoldK === 1 && cut1 > 0 && cut2 > cut1 && dom.slashes !== undefined, `S53: the dome unfolds and its sure-hit slashes keep cutting the foe inside (${cut1} → ${cut2})`);
    let bad = 0; const strict = new Proxy({}, { get: (t, k) => (k === 'arc' || k === 'ellipse') ? (x, y, r1, r2) => { if (r1 < 0 || (k === 'ellipse' && r2 < 0)) bad++; } : k === 'canvas' ? undefined : () => {}, set: () => true });
    for (const sp of spells.activeSpells) sp.render?.(strict);
    assert(!bad && spells.activeSpells.some((sp) => sp.constructor.name === 'DomainShell' && spells.spellDepth(sp) === null) && dom.isGroundDecal, 'S53: inner world under the actors, shell + rim over them; renders cleanly');
    const hpFin = dummy.hp; game.castSlotAt(s53.position); frame(.7);
    assert(dummy.maxHp - hpFin > 0 && dom.isFinished && !P.slottedSpells.includes(s53), 'S53: the second tap closes the dome with a final slash storm and frees the slot');
    // The Wizard inside an enemy domain: guarding does not help, the wall holds him in.
    reset(); const E = game.enemyChampion; E.lifeState = 'Alive'; E.hp = E.maxHp; E.x = P.x + 60; E.z = P.z; E.isPlayerControlled = false;
    const enemyDom = D.openDomain(E, null, core.SIGNATURES.S53);
    for (let i = 0; i < 60; i++) { game.updateRecasts(1 / 60); spells.update(1 / 60, game); }
    P.facing = 1; P.isGuarding = true; P.guardHoldTime = 1; P.invulnerableTimer = 0; const hpG = P.hp;
    for (let i = 0; i < 60; i++) { P.invulnerableTimer = 0; spells.update(1 / 60, game); }
    P.x = enemyDom.cx - 400; spells.update(1 / 60, game);
    assert(P.hp < hpG && Math.abs(P.x - enemyDom.cx) < enemyDom.R, 'S53: inside an enemy domain the sure hit ignores the guard and the wall keeps you in');
    P.isGuarding = false;
    // Domain duel: tapping fast wins, the enemy dome collapses.
    const duel = (taps) => {
      reset(); spells.clearRuntime(); E.x = P.x + 120; E.z = P.z; E.lifeState = 'Alive'; E.hp = E.maxHp;
      const rival = D.openDomain(E, null, core.SIGNATURES.S53); for (let i = 0; i < 70; i++) spells.update(1 / 60, game);
      const sl = game.slotRuneSpell(runeById('sig_S53')); game.castSlotAt(sl.position); frame(.05);
      const mine = spells.activeSpells.find((sp) => sp instanceof D.Domain && sp.owner === P);
      const clashed = !!mine?.clash && mine.clash === rival.clash && sl.recast?.label === 'SPHÄREN-DUELL: TIPPEN!';
      for (let i = 0; i < taps; i++) { game.castSlotAt(sl.position); frame(3 / Math.max(1, taps) * .9); }
      frame(3.2 - (taps ? 2.7 : 0));
      return { clashed, mineAlive: mine && mine.collapseT == null, rivalAlive: rival.collapseT == null };
    };
    const win = duel(20); const lose = duel(0);
    assert(win.clashed && win.mineAlive && !win.rivalAlive, 'S53 domain duel: two domains meet, tapping fast wins — the enemy dome collapses');
    assert(lose.clashed && !lose.mineAlive && lose.rivalAlive, 'S53 domain duel: without tapping your own dome collapses');
    spells.clearRuntime(); E.x = 900;
  }
  // More domains: same flow, own ability inside.
  {
    const D = await import('./public/src/signature_abilities_g.js');
    const E = game.enemyChampion;
    const foeIn = () => { E.lifeState = 'Alive'; E.hp = E.maxHp; E.passive = true; E.x = P.x + 80; E.z = P.z; E.elevation = 0; E.slowFactor = 1; E.statusImmuneUntil = {}; STATUS.clearStatuses(E); };
    const run = (sec) => { for (let i = 0; i < sec * 60; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); E.update(1 / 60, game, game.battlefield); } };
    // Zeit: slow motion + clock-hand strikes.
    reset(); dummy.homeX = dummy.x = 900; foeIn(); const dTime = D.openDomain(P, null, core.SIGNATURES.S56, 'S56'); run(2.6);
    assert(dTime.rule.name === 'STILLSTAND' && E.slowFactor <= .25 + 1e-9 && E.hp < E.maxHp, 'S56 STILLSTAND: foes inside move in slow motion (25 %) and the clock hand strikes');
    // Glut: burning + geysers.
    reset(); foeIn(); const dFire = D.openDomain(P, null, core.SIGNATURES.S57, 'S57'); run(1.4);
    assert(STATUS.hasStatus(E, 'burn') && dFire.geysers.length + (E.maxHp - E.hp > 18 ? 1 : 0) > 0 && E.hp < E.maxHp - 15, 'S57 GLUTKESSEL: foes inside burn and fire geysers erupt under them');
    // Hain: the caster heals and is cleansed, foes are poisoned.
    reset(); foeIn(); P.hp = P.maxHp - 60; P.statusImmuneUntil = {}; STATUS.applyStatus(P, 'poison'); const hpHeal = P.hp;
    const dLife = D.openDomain(P, null, core.SIGNATURES.S58, 'S58'); run(1.6);
    assert(P.hp > hpHeal + 4 && !STATUS.hasStatus(P, 'poison') && STATUS.hasStatus(E, 'poison'), 'S58 LEBENSHAIN: allies heal and shake off ailments, foes inside are poisoned');
    // Every domain renders cleanly in every phase.
    let bad = 0; const strict = new Proxy({}, { get: (t, k) => (k === 'arc' || k === 'ellipse') ? (x, y, r1, r2) => { if (r1 < 0 || (k === 'ellipse' && r2 < 0)) bad++; } : k === 'canvas' ? undefined : () => {}, set: () => true });
    for (const d of [dTime, dFire, dLife]) { const t0 = d.t; for (const tt of [.1, .4, .6, 1, 2]) { d.t = tt; d.render(strict); for (const sp of spells.activeSpells) sp.render?.(strict); } d.t = t0; }
    assert(!bad, 'All domains render cleanly in every unfold phase');
    // Cast through a slot: the finale label is the domain's own; tapping fires its finale.
    reset(); foeIn(); const sFire = game.slotRuneSpell(runeById('sig_S57')); game.castSlotAt(sFire.position); frame(1.2);
    const hpFin = E.hp;
    assert(sFire.recast?.label === 'SCHLIESSEN: ERUPTION', 'A domain slot offers its own finale (Glutkessel: ERUPTION)');
    game.castSlotAt(sFire.position); run(.2);
    assert(E.hp < hpFin && !P.slottedSpells.includes(sFire), 'The finale fires and frees the slot');
    // Spiegelwelt: mirror images strike from the sides.
    reset(); foeIn(); const dMirror = D.openDomain(P, null, core.SIGNATURES.S59, 'S59'); run(1.6);
    assert(dMirror.rule.name === 'SPIEGELWELT' && E.hp <= E.maxHp - 11, 'S59 SPIEGELWELT: mirror images of the caster strike the trapped foe');
    // Schwerkraft: no flying inside — a foe in the air is slammed down; a pulse pulls to the centre.
    reset(); foeIn(); E.x = P.x + 150; const dGrav = D.openDomain(P, null, core.SIGNATURES.S60, 'S60'); run(1);
    E.elevation = 70; E.vElevation = 0; const hpGrav = E.hp; run(.5);
    assert((E.elevation ?? 0) < 10 && E.hp < hpGrav, 'S60 SCHWERKRAFT: a foe in the air is torn down and hurt');
    const distGrav = Math.abs(E.x - dGrav.cx); run(2.1);
    assert(Math.abs(E.x - dGrav.cx) < distGrav, 'S60 SCHWERKRAFT: the gravity pulse drags foes toward the centre');
    // Sturm (cast through a slot so the domain carries lightning): rain soaks, the bolt turns it into a shock.
    reset(); foeIn(); const sStorm = game.slotRuneSpell(runeById('sig_S61')); game.castSlotAt(sStorm.position); run(2.4);
    assert(STATUS.hasStatus(E, 'paralysis') && E.hp < E.maxHp, 'S61 STURM: rain soaks the foe, the lightning strike turns it into SCHOCK (paralysis)');
    // Schattenmeer: shadow hands hold.
    reset(); foeIn(); const dShadow = D.openDomain(P, null, core.SIGNATURES.S62, 'S62'); let held = false;
    for (let i = 0; i < 100; i++) { run(1 / 60); if (E.freezeTimer > .3) held = true; }
    assert(held && E.hp < E.maxHp && dShadow.rule.name === 'SCHATTENMEER', 'S62 SCHATTENMEER: shadow hands grab and hold the foe');
    for (const d of [dMirror, dGrav, dShadow]) { const t0 = d.t; for (const tt of [.1, .5, 1.2, 2]) { d.t = tt; d.render(strict); for (const sp of spells.activeSpells) sp.render?.(strict); } d.t = t0; }
    assert(!bad, 'The new domains render cleanly in every phase');
    reset(); const firstD = D.openDomain(P, null, core.SIGNATURES.S59, 'S59'); const secondD = D.openDomain(P, null, core.SIGNATURES.S61, 'S61');
    assert(firstD.collapseT != null && secondD.collapseT == null, 'A new own domain replaces the previous dome of the same caster (never two own domes)');
    // Element domains: one per rune element, each with its own effect.
    const elementCheck = {
      S63: (d, st) => st.moved || st.lifted,
      S64: (d, st) => st.fx.has('spike'),
      S65: () => STATUS.hasStatus(E, 'wet'),
      S66: (d, st) => st.fx.has('wolf'),
      S67: (d, st) => st.fx.has('blade'),
      S68: (d, st) => st.foeMp < 100 && P.mp > st.mpStart,
      S69: (d, st) => P.hp > st.hpStart,
      S85: (d, st) => st.fx.has('hexwall') && st.fx.has('ward') && P.arcaneShield > 0
    };
    const elementNames = { S63: 'AUGE DES ORKANS', S64: 'STEINGRAB', S65: 'TIEFSEE', S66: 'JAGDGRUND', S67: 'KLINGENSCHMIEDE', S68: 'LEERE', S69: 'SONNENHEILIGTUM', S85: 'BOLLWERK' };
    const failedEl = [];
    for (const [id, check] of Object.entries(elementCheck)) {
      reset(); foeIn(); E.mp = 100; P.mp = 20; P.hp = P.maxHp - 50;
      const st = { mpStart: P.mp, hpStart: P.hp, fx: new Set(), moved: false, lifted: false, foeMp: 100 }; const x0 = E.x;
      const dom = D.openDomain(P, null, core.SIGNATURES[id], id);
      for (let i = 0; i < 150; i++) { run(1 / 60); for (const f of dom.fx) st.fx.add(f.type); if (Math.abs(E.x - x0) > 6) st.moved = true; if ((E.elevation ?? 0) > 5) st.lifted = true; }
      st.foeMp = E.mp;
      if (dom.rule.name !== elementNames[id] || !(E.hp < E.maxHp) || !check(dom, st)) failedEl.push(id);
      for (const tt of [.1, .5, 1.2, 2]) { const t0 = dom.t; dom.t = tt; dom.render(strict); for (const sp of spells.activeSpells) sp.render?.(strict); dom.t = t0; }
    }
    assert(!failedEl.length && !bad, 'Element domains (Ventus, Terra, Aqua, Bestia, Konstrukt, Void, Lux, Schutz) each work with their own effect and render cleanly' + (failedEl.length ? ' (' + failedEl.join(',') + ')' : ''));
    const { DOMAIN_RUNE_IDS } = await import('./public/src/progression.js');
    assert(DOMAIN_RUNE_IDS.length === 16 && DOMAIN_RUNE_IDS.includes('sig_S85'), 'Every rune element (also SCHUTZ) has its own domain, plus the special domains (16 in total)');
    { reset(); foeIn(); P.arcaneShield = 0; const dw = D.openDomain(P, null, core.SIGNATURES.S85, 'S85'); for (let i = 0; i < 90; i++) run(1 / 60); const sh = P.arcaneShield; const hpW = E.hp; dw.closeWithFinale(game);
      assert(sh > 0 && P.arcaneShield === 0 && hpW - E.hp > sh * .5, 'S85 BOLLWERK: AEGIS-BRUCH breaks the shield outward — its capacity hits the foes inside'); }
    // Only the caster sees the domain name; the opponent has to find out by playing.
    const names = (dom) => { const texts = []; const rec = new Proxy({}, { get: (t, k) => k === 'fillText' ? (txt) => texts.push(String(txt)) : k === 'canvas' ? undefined : () => {}, set: () => true }); const shell = spells.activeSpells.find((sp) => sp.domain === dom); dom.t = DOMAIN_T; shell?.render(rec); return texts; };
    const DOMAIN_T = 1.2;
    reset(); E.x = P.x + 400; E.isPlayerControlled = false; E.lifeState = 'Alive'; P.isPlayerControlled = true;
    const ownD = D.openDomain(P, null, core.SIGNATURES.S57, 'S57'); const foeD = D.openDomain(E, null, core.SIGNATURES.S60, 'S60');
    assert(names(ownD).includes('GLUTKESSEL') && !names(foeD).some((txt) => txt === 'SCHWERKRAFT'), 'Domain names are shown only to the caster — the opponent sees no name');
    // A duel works between different domains.
    reset(); E.x = P.x + 120; E.isPlayerControlled = false; E.lifeState = 'Alive';
    const rivalD = D.openDomain(E, null, core.SIGNATURES.S58, 'S58'); run(.3); const mineD = D.openDomain(P, null, core.SIGNATURES.S56, 'S56');
    assert(mineD.clash && mineD.clash === rivalD.clash, 'A domain duel also starts between two different domains');
    spells.clearRuntime(); STATUS.clearStatuses(); E.passive = false; E.x = 900;
  }
  // S54 SCHATTENBINDUNG: the shadow crawls, a caught foe copies the caster's moves; 2nd tap strangles.
  {
    const H = await import('./public/src/signature_abilities_h.js');
    const E = game.enemyChampion;
    const setupFoe = (dx) => { E.lifeState = 'Alive'; E.hp = E.maxHp; E.passive = true; E.x = P.x + dx; E.z = P.z; E.elevation = 0; E.vElevation = 0; E.freezeTimer = 0; game.battlefield.placeOnSurface(E); };
    const step = (sec, each) => { for (let i = 0; i < sec * 60; i++) { each?.(); P.update(1 / 60, neutral, game.battlefield, game); game.updateRecasts(1 / 60); spells.update(1 / 60, game); E.update?.(1 / 60, game, game.battlefield); } };
    reset(); dummy.homeX = dummy.x = 900; setupFoe(160);
    const s54 = game.slotRuneSpell(runeById('sig_S54')); game.castSlotAt(s54.position); step(.6);
    const bind = spells.activeSpells.find((sp) => sp instanceof H.ShadowBind);
    assert(bind?.bound && bind.victim === E && s54.recast?.label === 'SCHATTENWÜRGEN', 'S54: the shadow crawls to the foe and binds it; the slot offers the strangle');
    const ex = E.x; const ez = E.z; P.x += 60; P.z = Math.min(.9, P.z + .1); P.facing = -1; step(2 / 60);
    assert(Math.abs(E.x - (ex + 60)) < 2 && Math.abs(E.z - (ez + .1)) < .02 && E.facing === -1, 'S54: the bound foe copies every move of the caster (x, depth, facing)');
    let bad = 0; const strict = new Proxy({}, { get: (t, k) => (k === 'arc' || k === 'ellipse') ? (x, y, r1, r2) => { if (r1 < 0 || (k === 'ellipse' && r2 < 0)) bad++; } : k === 'canvas' ? undefined : () => {}, set: () => true });
    for (const sp of spells.activeSpells) sp.render?.(strict);
    const hp0 = E.hp; game.castSlotAt(s54.position); step(.2); for (const sp of spells.activeSpells) sp.render?.(strict); step(.7);
    assert(!bad && hp0 - E.hp >= H.SHADOW.strangle - .5 && !bind.bound && !P.slottedSpells.includes(s54), 'S54: the second tap strangles (shadow hands, damage), ends the binding and frees the slot');
    // Bound without a strangle: it lets go after 3 s.
    reset(); dummy.homeX = dummy.x = 900; setupFoe(160); const s54b = game.slotRuneSpell(runeById('sig_S54')); game.castSlotAt(s54b.position); step(.6);
    const bindB = spells.activeSpells.find((sp) => sp instanceof H.ShadowBind); step(3.2);
    assert(bindB?.bindT != null && !bindB.bound && !P.slottedSpells.includes(s54b), 'S54: the binding ends on its own after 3 s');
    // Jumping dodges the shadow; out of reach it fades.
    reset(); dummy.homeX = dummy.x = 900; setupFoe(160); const s54c = game.slotRuneSpell(runeById('sig_S54')); game.castSlotAt(s54c.position);
    step(1.2, () => { E.elevation = 60; E.vElevation = 0; });
    const bindC = spells.activeSpells.find((sp) => sp instanceof H.ShadowBind);
    assert(!bindC?.victim && !P.slottedSpells.includes(s54c), 'S54: a foe in the air is not caught (jump to dodge); the slot frees after the miss');
    spells.clearRuntime(); E.elevation = 0; E.passive = false; E.x = 900;
  }
  // The AI Wizard uses special runes: counter domain, shadow binding, second stages.
  {
    const AI = await import('./public/src/ai_specials.js'); const D = await import('./public/src/signature_abilities_g.js'); const H = await import('./public/src/signature_abilities_h.js');
    const E = game.enemyChampion;
    const arm = (kit, dx) => { spells.clearRuntime(); E.lifeState = 'Alive'; E.hp = E.maxHp; E.mp = E.maxMp; E.passive = false; E.aiRecast = null; E.specialCooldown = 0; E.spellCooldown = 0; E.freezeTimer = 0; E.deckIds = []; E.aiSpecialIds = kit; E.x = P.x + dx; E.z = P.z; E.elevation = 0; E.state = 'idle'; E.stateTimer = 0; game.battlefield.placeOnSurface(E); };
    const stepAI = (sec) => { for (let i = 0; i < sec * 60; i++) { P.update(1 / 60, neutral, game.battlefield, game); game.updateRecasts(1 / 60); spells.update(1 / 60, game); E.update(1 / 60, game, game.battlefield); } };
    // Training without a kit: no specials.
    reset(); arm(null, 200); E.aiSpecialIds = undefined;
    assert(!AI.tryAISpecial(E, P, 200, game, spells), 'AI: without a deck / kit the training partner casts no special runes');
    // Counter domain → domain duel.
    reset(); dummy.homeX = dummy.x = 900; arm(['sig_S53'], 120);
    const sd = game.slotRuneSpell(runeById('sig_S53')); game.castSlotAt(sd.position); stepAI(.2);
    const aiDomain = D.activeDomains().find((d) => d.owner === E); const myDomain = D.activeDomains().find((d) => d.owner === P);
    assert(aiDomain && myDomain && aiDomain.clash && aiDomain.clash === myDomain.clash && E.lastAISpecial === 'S53', 'AI: a hostile domain around it → it opens its own (domain duel)');
    stepAI(3.4);
    assert(myDomain.collapseT != null && aiDomain.collapseT == null, 'AI: in the duel the AI taps on its own — without tapping your dome loses');
    // Shadow binding: the AI binds the Wizard and strangles after a moment.
    reset(); dummy.homeX = dummy.x = 900; arm(['sig_S54'], 200); P.invulnerableTimer = 0; const hpS = P.hp;
    assert(AI.tryAISpecial(E, P, 200, game, spells) && E.aiRecast?.sig === 'S54', 'AI: at mid range in the same lane it casts the shadow binding');
    stepAI(.8); const bindAI = spells.activeSpells.find((sp) => sp instanceof H.ShadowBind);
    assert(bindAI?.victim === P && P.freezeTimer > 0, 'AI: the shadow reaches the Wizard and binds him');
    stepAI(2.6);
    assert(P.hp <= hpS - H.SHADOW.strangle + 1 && !E.aiRecast, 'AI: it uses the second stage (strangle) on its own');
    // A two-stage rush: the AI fires stage 2 by itself.
    reset(); dummy.homeX = dummy.x = 900; arm(['sig_S46'], 150); P.invulnerableTimer = 0; const hpR = P.hp;
    assert(AI.tryAISpecial(E, P, 150, game, spells) && E.aiRecast?.sig === 'S46', 'AI: in the same lane it opens with the spiral rush');
    stepAI(2.5);
    assert(P.hp < hpR && !E.aiRecast && E.lastAISpecial === 'S46', 'AI: stage 2 (teleport above, slam) follows without the player');
    E.aiSpecialIds = undefined; E.passive = false; E.x = 900; spells.clearRuntime(); P.freezeTimer = 0;
  }
  // S55 TAUSENDVOGEL: lightning dash through everyone in the lane; 2nd tap runs back.
  {
    const I = await import('./public/src/signature_abilities_i.js');
    const E = game.enemyChampion;
    const stepB = (sec) => { for (let i = 0; i < sec * 60; i++) { P.update(1 / 60, neutral, game.battlefield, game); game.updateRecasts(1 / 60); spells.update(1 / 60, game); } };
    reset(); dummy.homeX = dummy.x = P.x + 110; E.lifeState = 'Alive'; E.hp = E.maxHp; E.passive = true; E.x = P.x + 210; E.z = P.z; E.elevation = 0; E.statusImmuneUntil = {}; dummy.statusImmuneUntil = {};
    const x0 = P.x; const s55 = game.slotRuneSpell(runeById('sig_S55')); game.castSlotAt(s55.position);
    const birds = spells.activeSpells.find((sp) => sp instanceof I.ThousandBirds); birds.forceBurn = true;
    stepB(.15);
    assert(birds.phase === 'charge' && Math.abs(P.x - x0) < 1, 'S55: holding the slot charges (blue fire in the hand, sparks spraying, the Wizard stands)');
    stepB(.6); assert(birds.phase === 'charge' && birds.chargeK > .4, 'S55: the charge keeps building while held — it only fires on release');
    game.castSlotAt(s55.position); // release (keys: tap again; touch: let go of the slot)
    assert(birds.phase === 'dash' && birds.x1 - birds.x0 > I.BIRD.length + 100 && birds.dashDamage > I.BIRD.damage, 'S55: the release dashes — farther and harder the longer the charge');
    let inv = true; for (let i = 0; i < 18; i++) { stepB(1 / 60); if (birds.phase === 'dash' && !(P.invulnerableTimer > 0)) inv = false; }
    stepB(.3);
    assert(P.x - x0 > 250 && dummy.hp < dummy.maxHp && E.hp < E.maxHp && inv, 'S55: the azure dash runs THROUGH every foe in the lane (both hit), invulnerable meanwhile');
    assert(STATUS.hasStatus(E, 'burn') && s55.recast?.label === 'RÜCKWEG-SCHLAG', 'S55: the blue fire sets foes burning; the slot offers the return strike');
    const hpBack = E.hp; game.castSlotAt(s55.position); stepB(.4);
    assert(Math.abs(P.x - x0) < 40 && hpBack - E.hp >= I.BIRD.returnDamage + I.BIRD.returnBonus - .5 && !P.slottedSpells.includes(s55), 'S55: the return strike runs back through the flames, extra damage on a burning foe');
    // Out of the lane: no hit.
    reset(); dummy.homeX = dummy.x = 900; E.x = P.x + 150; E.z = P.z + .3; E.hp = E.maxHp;
    const s55b = game.slotRuneSpell(runeById('sig_S55')); game.castSlotAt(s55b.position); stepB(.8);
    let bad = 0; const strict = new Proxy({}, { get: (t, k) => (k === 'arc' || k === 'ellipse') ? (x, y, r1, r2) => { if (r1 < 0 || (k === 'ellipse' && r2 < 0)) bad++; } : k === 'canvas' ? undefined : () => {}, set: () => true });
    for (const sp of spells.activeSpells) sp.render?.(strict);
    assert(E.hp === E.maxHp && !bad, 'S55: foes outside the lane are not hit; renders cleanly');
    spells.clearRuntime(); STATUS.clearStatuses(); E.passive = false; E.x = 900; E.z = .5;
  }
  // S70–S73: seal cube, wrath beam (hold to charge), blood pact, time stop.
  {
    const J = await import('./public/src/signature_abilities_j.js');
    const E = game.enemyChampion;
    const foeAt = (dx) => { E.lifeState = 'Alive'; E.hp = E.maxHp; E.passive = true; E.x = P.x + dx; E.z = P.z; E.elevation = 0; E.freezeTimer = 0; game.battlefield.placeOnSurface(E); };
    const runJ = (sec) => { for (let i = 0; i < sec * 60; i++) { P.update(1 / 60, neutral, game.battlefield, game); game.updateRecasts(1 / 60); spells.update(1 / 60, game); E.update(1 / 60, game, game.battlefield); } };
    // Seal cube: the foe cannot get out; tap again: crushed.
    reset(); dummy.homeX = dummy.x = 900; foeAt(150);
    const s70 = game.slotRuneSpell(runeById('sig_S70')); game.castSlotAt(s70.position);
    if (game.targeting.isActive) { game.targeting.setPoint?.({ x: E.x, z: E.z }); game.targeting.confirm(); }
    const cube = spells.activeSpells.find((sp) => sp instanceof J.SealCube); runJ(.2); E.x += 80; runJ(1 / 60);
    assert(cube?.victim === E && Math.abs(E.x - cube.x) <= J.CUBE.half && s70.recast?.label === 'ZERFALL', 'S70 BANNWÜRFEL: the cube seals the foe in — it cannot get out');
    const hpCube = E.hp; game.castSlotAt(s70.position); runJ(.5);
    assert(hpCube - E.hp >= J.CUBE.crush - .5 && !P.slottedSpells.includes(s70), 'S70: tap again — the cube collapses and crushes the foe (slot freed)');
    // Wrath beam via the real slot button: press = charge, release = fire.
    reset(); dummy.homeX = dummy.x = P.x + 300; dummy.hp = dummy.maxHp;
    const s71 = game.slotRuneSpell(runeById('sig_S71')); const btn = elements.get('action-slot-' + s71.position);
    assert(game.isChargeSlot(s71.position), 'S71 ZORNSTRAHL is a charge slot');
    const pe = { pointerId: 91, clientX: 10, clientY: 10, preventDefault() {}, stopPropagation() {} };
    btn.listeners.pointerdown(pe); const beam = spells.activeSpells.find((sp) => sp instanceof J.WrathBeam); const xBeam = P.x;
    runJ(1.2);
    assert(beam?.phase === 'charge' && beam.k > .5 && Math.abs(P.x - xBeam) < 1, 'S71: pressing the slot charges the beam (the Wizard stands, the core grows)');
    btn.listeners.pointerup(pe); runJ(.4);
    assert(dummy.hp < dummy.maxHp - J.WRATH.base && !P.slottedSpells.includes(s71) && P.x < xBeam - 5, 'S71: releasing fires through the lane (more damage when charged) and the recoil shoves the Wizard back');
    reset(); dummy.homeX = dummy.x = P.x + 300; dummy.hp = dummy.maxHp; const s71b = game.slotRuneSpell(runeById('sig_S71')); game.castSlotAt(s71b.position); runJ(3.2);
    assert(dummy.hp < dummy.maxHp && !P.slottedSpells.includes(s71b), 'S71: held too long it fires on its own (keys: tap to charge, tap to fire)');
    // Blood pact: one huge blow across the front.
    reset(); dummy.homeX = dummy.x = 900; foeAt(180); const hpPact = E.hp;
    const s72 = game.slotRuneSpell(runeById('sig_S72')); game.castSlotAt(s72.position); runJ(1.6);
    const pact = spells.activeSpells.find((sp) => sp instanceof J.BloodPact);
    assert(hpPact - E.hp >= J.PACT.damage - .5 && STATUS.hasStatus(E, 'bleed'), 'S72 BLUTVERTRAG: the summoned beast crushes the front with ONE huge blow — the foe bleeds');
    assert(P.hp <= P.maxHp - Math.floor(P.maxHp * J.PACT.bloodCost), 'S72: the pact costs the caster blood (a share of HP)');
    // Time stop: a projectile entering the field hangs in the air, then flies on.
    reset(); dummy.homeX = dummy.x = 900; E.x = 900;
    spells.cast(P, { ...spells.resolveSpell([runeById('sig_S73')]) }, game, null, { x: P.x + 140, z: P.z });
    spells.cast(P, spells.resolveSpell([runeById('ignis')]), game);
    const ball = spells.activeSpells.find((sp) => Number.isFinite(sp.vx) && Math.abs(sp.vx) > 40 && !sp.isTimeField);
    runJ(.5); const xFrozen = ball?.x; runJ(1);
    assert(ball?.timeFrozen && Math.abs(ball.x - xFrozen) < .01, 'S73 ZEITSTOPP: a projectile in the field freezes in mid-air');
    runJ(4); const xAfter = ball.x; runJ(.1);
    assert(!ball.timeFrozen && Math.abs(ball.x - xAfter) > 1, 'S73: when the field ends the projectile flies on');
    let bad = 0; const strict = new Proxy({}, { get: (t, k) => (k === 'arc' || k === 'ellipse') ? (x, y, r1, r2) => { if (r1 < 0 || (k === 'ellipse' && r2 < 0)) bad++; } : k === 'canvas' ? undefined : () => {}, set: () => true });
    for (const sp of [cube, beam, pact]) { if (!sp) continue; const t0 = sp.t; for (const tt of [.05, .3, .6, 1, 1.5]) { sp.t = tt; sp.render(strict); } sp.t = t0; }
    assert(!bad, 'S70–S73 render cleanly in every phase');
    spells.clearRuntime(); E.passive = false; E.x = 900;
  }
  // S74 TRUGBILD: doubles deceive the foes; a hit double bursts; 2nd tap swaps places.
  {
    const K = await import('./public/src/signature_abilities_k.js');
    const E = game.enemyChampion;
    reset(); dummy.homeX = dummy.x = 900; E.lifeState = 'Alive'; E.hp = E.maxHp; E.passive = false; E.x = P.x + 150; E.z = P.z; E.elevation = 0; E.attackCooldown = 0; E.aiSpecialIds = []; E.deckIds = []; E.spellCooldown = 99; E.beamCooldown = 99; // melee only: the hit must land on a double
    const s74 = game.slotRuneSpell(runeById('sig_S74')); game.castSlotAt(s74.position);
    const mirage = spells.activeSpells.find((sp) => sp instanceof K.Mirage);
    assert(mirage?.doubles.length === 3 && E.deceivedBy?.isIllusion, 'S74: three doubles appear and the AI Wizard is deceived (targets a double)');
    const hpReal = P.hp; let burst = false;
    for (let i = 0; i < 240 && !burst; i++) { E.update(1 / 60, game, game.battlefield); spells.update(1 / 60, game); game.updateRecasts(1 / 60); if (mirage.doubles.some((d) => d.burstT != null)) burst = true; }
    assert(burst && P.hp === hpReal, 'S74: the deceived AI attacks a double — it bursts into mist, the real Wizard stays untouched');
    const before = { x: P.x, z: P.z }; game.castSlotAt(s74.position);
    assert(Math.hypot(P.x - before.x, (P.z - before.z) * 150) > 30 && !P.slottedSpells.includes(s74), 'S74: tap again — swap places with a double (slot freed)');
    let bad = 0; const strict = new Proxy({}, { get: (t, k) => (k === 'arc' || k === 'ellipse') ? (x, y, r1, r2) => { if (r1 < 0 || (k === 'ellipse' && r2 < 0)) bad++; } : k === 'canvas' ? undefined : () => {}, set: () => true });
    mirage.render(strict); for (const e of mirage.actorEntries()) e.render(strict); assert(!bad && mirage.actorEntries().length === mirage.living().length, 'S74 renders cleanly — the doubles are sharp actors in the painter order, not pixelated VFX');
    spells.clearRuntime(); E.passive = false; E.x = 900; E.deceivedBy = null; E.deceiveTimer = 0; E.tauntedBy = null; E.tauntTimer = 0; E.spellCooldown = 0; E.beamCooldown = 0; P.invulnerableTimer = 0;
  }
  // S48: a hit is negated, the Wizard reappears behind the attacker and counters; three charges.
  reset(); const s48 = game.slotRuneSpell(runeById('sig_S48')); game.castSlotAt(s48.position);
  const attacker = { x: P.x + 40, z: P.z, team: 'red', hp: 100, isDead: false, took: 0, takeDamage(d) { this.took += d; this.hp -= d; } };
  const { setHitContext } = await import('./public/src/signature_runes.js');
  setHitContext(attacker); const hpBefore = P.hp; P.invulnerableTimer = 0; P.takeDamage(30, -200, 0, .3, false, 'melee'); setHitContext(null);
  assert(P.hp === hpBefore && attacker.took > 0 && P.x > attacker.x && P.signature?.charges === 2 && P.state !== 'hurt' && !(Math.abs(P.kbVelX ?? 0) > 0), 'S48 SCHATTENKONTER: a hit is negated, the Wizard counters from behind the attacker (charge used)');
  // More two-stage spells: S38 shafts burst, Stone Wall bursts forward, S49 water jet → freeze.
  const { SPELL_DEFINITIONS } = await import('./public/src/spell_catalog.js');
  reset(); dummy.homeX = dummy.x = 420; const s38 = game.slotRuneSpell(runeById('sig_S38')); game.castSlotAt(s38.position);
  if (game.targeting.isActive) { game.targeting.setPoint?.({ x: 360, z: .5 }); game.targeting.confirm(); }
  frame(1.2); const hp38 = dummy.hp;
  assert(s38.recast && P.slottedSpells.includes(s38), 'S38 SCHACHTWUCHS offers a second stage');
  game.castSlotAt(s38.position); frame(.3);
  assert(dummy.hp < hp38 && !P.slottedSpells.includes(s38), 'S38 stage 2: the shafts burst and hit foes around them');
  reset(); dummy.homeX = dummy.x = 900; P.facing = 1;
  const wallSlot = { runes: [runeById('terra'), runeById('terra')], definition: SPELL_DEFINITIONS.stone_wall, isCombo: true, quality: spells.qualityForRunes([{ id: 'terra' }]), position: 0, manaCost: 25 };
  P.slottedSpells.push(wallSlot); game.castSpellSlot(wallSlot, true, { start: { x: 360, z: .4 }, end: { x: 360, z: .6 }, x: 360, z: .5, orientation: 'lateral', length: 80 });
  const walls = spells.activeSpells.filter((w) => w.isStoneWall); dummy.homeX = dummy.x = 420; dummy.homeZ = dummy.z = .5; frame(.2); const hpW = dummy.hp;
  assert(walls.length > 0 && wallSlot.recast, 'STONE WALL offers a second stage (burst)');
  game.castSpellSlot(wallSlot, true); frame(.2);
  assert(dummy.hp < hpW && walls.every((w) => w.isFinished || w.life <= 0), 'Stone Wall stage 2: the wall bursts forward and hits the foe behind it');
  reset(); dummy.homeX = dummy.x = 420; const s49 = game.slotRuneSpell(runeById('sig_S49')); game.castSlotAt(s49.position); frame(.7);
  const jet = spells.activeSpells.find((sp) => sp.constructor.name === 'FloodJet'); const hp49 = dummy.hp;
  game.castSlotAt(s49.position); frame(.1);
  assert(jet?.soaked.has(dummy) && jet.frozenAt != null && dummy.hp < hp49 && !P.slottedSpells.includes(s49), 'S49 FLUTSTRAHL: the jet soaks the foe, stage 2 freezes everything soaked');
  reset();
}

// Transformation transitions: charge → flash → pillar; the form appears after the flash.
{
  const buff = await import('./public/src/buff_forms.js');
  const { TRANSFORM_TIMING } = await import('./public/src/transform_fx.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch();
  const P = game.player; spells.clearRuntime(); buff.endBuffForm(P);
  spells.cast(P, spells.resolveSpell([{ id: 'buff_T40' }]), game);
  const fx = spells.activeSpells.find((sp) => sp.isTransformationFx);
  const strict = new Proxy({}, { get: (t, k) => (k === 'ellipse' || k === 'arc') ? (x, y, rx, ry) => { if (rx < 0 || (k === 'ellipse' && ry < 0)) throw new Error('IndexSizeError'); } : (k === 'canvas' ? undefined : () => {}), set: () => true });
  P.buffForm.age = .2; const hidden = buff.buffFade(P); P.buffForm.age = TRANSFORM_TIMING.reveal + .4; const shown = buff.buffFade(P);
  let ok = true; try { for (let i = 0; i < 80; i++) { spells.update(1 / 60, game); fx?.render(strict); } } catch { ok = false; }
  assert(fx && hidden === 0 && shown > .9 && ok && fx.isFinished, 'A new Arcane State plays its transition (charge, flash, pillar) and the form appears after the flash');
  buff.endBuffForm(P); spells.clearRuntime();
}

// Combo rule (user): one swing into the air is allowed, but only hits chain into the next step.
{
  game.returnToHub(); game.setMatchMode('training'); game.startMatch();
  const P = game.player; const dummy = game.trainingDummy; spells.clearRuntime(); P.equipClassWeapon(null); P.weapon = null;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const ready = () => { P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; };
  P.x = 300; P.z = .5; P.facing = 1; game.battlefield.placeOnSurface(P); P.comboStep = 0;
  dummy.homeX = dummy.x = 800; ready(); P.executeAttack(neutral, 'normal'); const afterWhiff = P.comboStep; ready(); P.executeAttack(neutral, 'normal');
  assert(afterWhiff === 0 && P.comboStep === 0 && P.state === 'attack1', 'A swing into the air is allowed but does not advance the combo');
  dummy.homeX = dummy.x = P.x + 20; dummy.homeZ = dummy.z = P.z; dummy.hp = dummy.maxHp; const steps = [];
  for (let i = 0; i < 3; i++) { ready(); P.executeAttack(neutral, 'normal'); steps.push(P.comboStep); }
  assert(steps.join(',') === '1,2,3', 'Hitting the foe chains the combo step by step up to the finisher');
}

// Rune drawing: a tapped hand rune shows its template in every mode; DRAW (free drawing) earns a small grade bonus.
{
  const { FREE_DRAW_BONUS } = await import('./public/src/main.js');
  game.returnToHub(); game.setMatchMode('siege'); game.startMatch();
  const P = game.player; P.slottedSpells.length = 0; P.mp = P.maxMp; P.reservedMana = 0;
  if (game.siegeMatch) game.siegeMatch.canPrepare = () => true;
  const card = P.runeHand[0];
  game.startRuneDrawing(card.cardId);
  const guide = game.runeGuide();
  game.drawing.active = false; P.reservedMana = 0;
  assert(guide?.id === card.id, 'Tapping a hand rune shows its template outside Training too (Siege)');
  // Each drawing uses a card that is currently in the hand (played cards cycle back into the deck).
  const grade = (traced) => { P.slottedSpells.length = 0; const c = P.runeHand[0]; game.drawing.active = true; game.drawing.expectedCardId = traced ? c.cardId : null; game.drawing.strokes = []; game.drawing.currentStroke = []; game.finishRuneDrawing({ rune: c, confidence: .78 }); return P.slottedSpells.at(-1)?.runes?.[0]?.grade; };
  const traced = grade(true); const free = grade(false);
  assert(FREE_DRAW_BONUS > 0 && traced === 'B' && free === 'A', 'Free drawing (DRAW) earns a small grade bonus over tracing the template');
  P.slottedSpells.length = 0; game.returnToHub();
}

// Element status effects (20 Oct 2026): chance-based burn / frozen / paralysis / poison / bleed.
{
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const rune = (id) => recognizer.runes.find((entry) => entry.id === id);
  const P = game.player; const dummy = game.trainingDummy; spells.clearRuntime();
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const stepSpells = (sec) => { for (let i = 0; i < sec * 60; i++) { spells.update(1 / 60, game); dummy.update(1 / 60); } };
  P.x = 300; P.z = .5; P.facing = 1; game.battlefield.placeOnSurface(P); P.mp = P.maxMp; P.state = 'idle'; P.canAttack = true;
  dummy.homeX = dummy.x = 420; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp; dummy.statusImmuneUntil = {};
  assert(STATUS.statusElementsOf(spells.resolveSpell([rune('ignis')])).includes('ignis') && STATUS.statusElementsOf({ id: 'frost_nova', name: 'FROST NOVA' }).includes('frost'), 'Spells carry their rune elements (ice spells count as frost)');
  // Not guaranteed: with a failed roll the fireball hits without a status.
  STATUS.setStatusRandom(() => 1);
  spells.cast(P, spells.resolveSpell([rune('ignis')]), game); stepSpells(.6);
  assert(dummy.hp < dummy.maxHp && !STATUS.hasStatus(dummy, 'burn'), 'A failed roll: the hit lands but leaves no status (chance, not guaranteed)');
  // A successful roll burns: flames on the body and fire damage over time.
  spells.clearRuntime(); dummy.hp = dummy.maxHp; STATUS.setStatusRandom(() => 0);
  spells.cast(P, spells.resolveSpell([rune('ignis')]), game); stepSpells(.5);
  STATUS.setStatusRandom(() => 1);
  assert(STATUS.hasStatus(dummy, 'burn'), 'A successful roll sets the target on fire (BURN)');
  const hpBurn = dummy.hp; stepSpells(1.2);
  assert(dummy.hp < hpBurn, 'Burning deals damage over time');
  // Every look renders safely (ice block, flames, arcs, bubbles, blood) incl. the icon row.
  let bad = 0; const strict = new Proxy({}, { get: (t, k) => (k === 'arc' || k === 'ellipse') ? (x, y, r1, r2) => { if (r1 < 0 || (k === 'ellipse' && r2 < 0)) bad++; } : k === 'canvas' ? undefined : () => {}, set: () => true });
  // WET puts a burn out, so it goes onto the Wizard; the other five onto the dummy.
  for (const kind of Object.keys(STATUS.STATUS_DEFS).filter((k) => k !== 'wet')) { dummy.statusImmuneUntil = {}; STATUS.applyStatus(dummy, kind); }
  P.statusImmuneUntil = {}; STATUS.applyStatus(P, 'wet');
  for (const e of STATUS.statusDepthEntries()) e.render(strict);
  assert(!bad && Object.keys(dummy.statuses).length === 5 && STATUS.hasStatus(P, 'wet') && STATUS.statusDepthEntries().filter((e) => e.y > dummy.y).length >= 5, 'All six statuses render on their targets (in front of them) without errors');
  spells.clearRuntime();
  assert(!Object.keys(dummy.statuses ?? {}).length, 'Clearing the runtime clears the statuses');
  // Frozen: the player is stuck in an ice block; afterwards a short immunity.
  P.statusImmuneUntil = {}; STATUS.applyStatus(P, 'frozen');
  const fx0 = P.x; P.update(.3, { ...neutral, keys: { KeyD: true }, move: { x: 1, z: 0 } }, game.battlefield, game);
  assert(P.freezeTimer > 0 && Math.abs(P.x - fx0) < 1, 'FROZEN: trapped in an ice block — no movement');
  for (let i = 0; i < 100; i++) spells.update(1 / 60, game);
  assert(!STATUS.hasStatus(P, 'frozen') && !STATUS.applyStatus(P, 'frozen'), 'After the ice breaks a short immunity prevents an instant re-freeze');
  // Paralysis stutters (short freezes every ~0.8 s).
  P.statusImmuneUntil = {}; P.freezeTimer = 0; STATUS.applyStatus(P, 'paralysis'); let stutters = 0;
  for (let i = 0; i < 120; i++) { spells.update(1 / 60, game); if (P.freezeTimer > .15) stutters++; P.freezeTimer = Math.max(0, P.freezeTimer - 1 / 60); }
  assert(stutters >= 2, 'PARALYSIS: the target keeps stuttering (short freezes)');
  spells.clearRuntime(); P.freezeTimer = 0;
  // Bleeding hurts more while moving.
  const E = dummy; const bleedRun = (moving) => { E.statusImmuneUntil = {}; E.hp = E.maxHp; E.x = 500; E.z = .5; STATUS.applyStatus(E, 'bleed'); for (let i = 0; i < 120; i++) { if (moving) E.x += 2; spells.update(1 / 60, game); } spells.clearRuntime(); return E.maxHp - E.hp; };
  const still = bleedRun(false); const moving = bleedRun(true);
  assert(moving > still && still > 0, `BLEED: damage over time, more while moving (${still} still vs ${moving} moving)`);
  // Blade weapons can cause bleeding; blunt ones never do.
  P.state = 'idle'; P.canAttack = true; P.comboStep = 0; dummy.homeX = dummy.x = P.x + 30; dummy.statusImmuneUntil = {};
  P.equipClassWeapon('sword_shield'); STATUS.setStatusRandom(() => 0); P.executeAttack(neutral, 'normal');
  const swordBleeds = STATUS.hasStatus(dummy, 'bleed'); spells.clearRuntime(); dummy.statusImmuneUntil = {};
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.comboStep = 0; P.equipClassWeapon('hammer'); P.executeAttack(neutral, 'normal');
  STATUS.setStatusRandom(() => 1);
  assert(swordBleeds && !STATUS.hasStatus(dummy, 'bleed'), 'Blade weapons can make the target bleed, blunt weapons cannot');
  spells.clearRuntime(); P.equipClassWeapon(null); dummy.homeX = dummy.x = 900;

  // ── Status combos ──
  dummy.homeX = dummy.x = 420; dummy.homeZ = dummy.z = .5;
  const fresh = (t) => { t.statusImmuneUntil = {}; STATUS.clearStatuses(t); t.statusImmuneUntil = {}; };
  const castAt = (ids) => { P.mp = P.maxMp; P.state = 'idle'; P.canAttack = true; spells.cast(P, spells.resolveSpell(ids.map(rune)), game, null, { x: dummy.x, z: dummy.z }); stepSpells(.7); };
  // Water soaks (WET) — a failed roll still leaves the combo setup to chance.
  fresh(dummy); STATUS.setStatusRandom(() => 0); castAt(['aqua']); STATUS.setStatusRandom(() => 1);
  assert(STATUS.hasStatus(dummy, 'wet'), 'A water spell can soak the target (WET)');
  // WET + lightning → guaranteed paralysis, even with a failed roll.
  const hpShock = dummy.hp; castAt(['fulgur']);
  assert(STATUS.hasStatus(dummy, 'paralysis') && !STATUS.hasStatus(dummy, 'wet') && dummy.hp < hpShock, 'Combo WET + lightning: SCHOCK — guaranteed paralysis (the water is used up)');
  // WET + ice → guaranteed freeze.
  fresh(dummy); STATUS.applyStatus(dummy, 'wet');
  const prevSrc = STATUS.setStatusSource({ team: P.team, statusElements: ['frost'] }); dummy.takeDamage(5, 0, 0, 0, false, 'spell'); STATUS.setStatusSource(prevSrc);
  assert(STATUS.hasStatus(dummy, 'frozen') && !STATUS.hasStatus(dummy, 'wet'), 'Combo WET + ice: SCHOCKFROST — guaranteed freeze');
  // FROZEN + a hard hit → the ice shatters for bonus damage (any source).
  const hpIce = dummy.hp; dummy.takeDamage(STATUS.COMBO.shatterThreshold + 2, 0, 0, 0, false, 'melee');
  assert(!STATUS.hasStatus(dummy, 'frozen') && hpIce - dummy.hp >= STATUS.COMBO.shatterThreshold + 2 + STATUS.COMBO.shatterBonus - .01, 'Combo FROZEN + hard hit: ZERSPLITTERT — the ice bursts for bonus damage');
  fresh(dummy); STATUS.applyStatus(dummy, 'frozen'); dummy.takeDamage(5, 0, 0, 0, false, 'melee');
  assert(STATUS.hasStatus(dummy, 'frozen'), 'A light hit does not shatter the ice');
  // BURN + wind → the fire jumps to foes nearby.
  const EC = game.enemyChampion; EC.lifeState = 'Alive'; EC.hp = EC.maxHp; EC.x = dummy.x + 60; EC.z = dummy.z; EC.passive = true; fresh(EC);
  fresh(dummy); STATUS.applyStatus(dummy, 'burn');
  const prevWind = STATUS.setStatusSource({ team: P.team, statusElements: ['ventus'] }); dummy.takeDamage(5, 0, 0, 0, false, 'spell'); STATUS.setStatusSource(prevWind);
  assert(STATUS.hasStatus(EC, 'burn') && STATUS.hasStatus(dummy, 'burn'), 'Combo BURN + wind: FEUERSTURM — the fire jumps to a foe nearby');
  // BURN + water → put out, steam, the target is WET; a wet target does not catch fire.
  const prevWater = STATUS.setStatusSource({ team: P.team, statusElements: ['aqua'] }); dummy.takeDamage(5, 0, 0, 0, false, 'spell'); STATUS.setStatusSource(prevWater);
  assert(!STATUS.hasStatus(dummy, 'burn') && STATUS.hasStatus(dummy, 'wet') && !STATUS.applyStatus(dummy, 'burn'), 'Combo BURN + water: GELÖSCHT — the burn ends, the target is wet and cannot catch fire');
  // Standing in a puddle soaks.
  const { environment } = await import('./public/src/environment.js');
  fresh(P); P.x = 300; P.z = .5; game.battlefield.placeOnSurface(P); environment.add('water', P.x, P.z, { radius: 40 });
  for (let i = 0; i < 5; i++) environment.update(1 / 60, game, []);
  assert(STATUS.hasStatus(P, 'wet'), 'Standing in a puddle makes the Wizard WET');
  // More combos: poison + fire, bleed + wind, paralysis + earth.
  const withSource = (els, fn) => { const prev = STATUS.setStatusSource({ team: P.team, statusElements: els }); try { fn(); } finally { STATUS.setStatusSource(prev); } };
  EC.lifeState = 'Alive'; EC.hp = EC.maxHp; EC.passive = true; EC.x = dummy.x + 60; EC.z = dummy.z; EC.elevation = 0;
  fresh(dummy); fresh(EC); STATUS.applyStatus(dummy, 'poison'); const hpGasE = EC.hp; const hpGasD = dummy.hp;
  withSource(['ignis'], () => dummy.takeDamage(5, 0, 0, 0, false, 'spell'));
  assert(!STATUS.hasStatus(dummy, 'poison') && STATUS.hasStatus(EC, 'poison') && EC.hp < hpGasE && hpGasD - dummy.hp > 5, 'Combo POISON + fire: GIFTGAS-EXPLOSION — the cloud blows up and poisons foes nearby');
  fresh(dummy); fresh(EC); STATUS.applyStatus(dummy, 'bleed'); const hpWhirl = dummy.hp;
  withSource(['ventus'], () => dummy.takeDamage(5, 0, 0, 0, false, 'spell'));
  assert(STATUS.hasStatus(EC, 'bleed') && hpWhirl - dummy.hp > 5, 'Combo BLEED + wind: SCHNITT-WIRBEL — cutting gust, the bleeding spreads');
  fresh(dummy); fresh(EC); STATUS.applyStatus(dummy, 'paralysis'); const hpGround = dummy.hp; const hpGroundE = EC.hp;
  withSource(['terra'], () => dummy.takeDamage(5, 0, 0, 0, false, 'spell'));
  assert(!STATUS.hasStatus(dummy, 'paralysis') && hpGround - dummy.hp > 5 && EC.hp < hpGroundE, 'Combo PARALYSIS + earth: ERDUNG — the charge discharges into a shock ring');
  // Damage over time does not stagger the AI Wizard every tick.
  fresh(EC); EC.passive = false; EC.state = 'idle'; EC.stateTimer = 0; STATUS.applyStatus(EC, 'burn'); const hpBurnE = EC.hp; let hurtFrames = 0;
  for (let i = 0; i < 90; i++) { spells.update(1 / 60, game); if (EC.state === 'hurt') hurtFrames++; }
  assert(EC.hp < hpBurnE && hurtFrames === 0, 'Burn / poison / bleed chip the AI Wizard without putting it into the hurt state');
  // Overlays sit on a floating foe (y already includes the lift — no double offset).
  fresh(EC); EC.elevation = 60; STATUS.applyStatus(EC, 'burn'); let iconY = null;
  const rec = new Proxy({}, { get: (t, k) => k === 'fillRect' ? (x, y, w, h) => { if (w === 10 && h === 10) iconY = y; } : k === 'canvas' ? undefined : () => {}, set: () => true });
  for (const e of STATUS.statusDepthEntries()) e.render(rec);
  assert(iconY != null && Math.abs(iconY - (EC.y - 78 - 30 - 5)) < 2, 'Status icons sit above a floating foe at the right height');
  STATUS.clearStatuses(EC); EC.elevation = 0; EC.passive = false; EC.x = 900;
  spells.clearRuntime(); environment.clear(); EC.x = 900; EC.passive = false; dummy.homeX = dummy.x = 900;
}

// While drawing, JUMP (button or Space) locks the rune in like LOCK — no jump.
{
  const { guideStrokes } = await import('./public/src/rune_guides.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch();
  const P = game.player; P.mp = P.maxMp; P.slottedSpells.length = 0;
  const card = P.runeHand[0]; game.startRuneDrawing(card.cardId);
  game.drawing.strokes = guideStrokes(card.id, 400, 300, 120); game.input.justPressedKeys = {};
  const btn = { preventDefault() {}, stopPropagation() {} };
  elements.get('action-jump-btn').listeners.pointerdown(btn);
  assert(!game.drawing.active && P.slottedSpells.some((sl) => sl.runes?.[0]?.id === card.id) && !game.input.justPressedKeys.Space, 'While drawing, the JUMP button locks the rune in (slotted) instead of jumping');
  const card2 = P.runeHand[0]; game.startRuneDrawing(card2.cardId);
  game.drawing.strokes = guideStrokes(card2.id, 400, 300, 120);
  windowListeners.keydown({ code: 'Space', repeat: false, target: null, preventDefault() {} });
  assert(!game.drawing.active && P.slottedSpells.some((sl) => sl.runes?.[0]?.id === card2.id) && !game.input.keys.Space, 'While drawing, Space locks the rune in too');
  game.input.keys = {}; game.input.justPressedKeys = {};
  // A hit interrupts a charge; outside an action the Wizard can always attack again.
  const neutralC = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true; P.chargeTimer = 0; P.formCharge = null;
  P.beginCharge('forward', 'key'); P.invulnerableTimer = 0; P.takeDamage(10, -100, 0, .3, false, 'melee');
  assert(P.chargeTimer === 0 && !P.formCharge, 'A hit interrupts the charge (no delayed release, not rooted afterwards)');
  for (let i = 0; i < 40; i++) P.update(1 / 60, neutralC, game.battlefield, game);
  P.state = 'idle'; P.canAttack = false; for (let i = 0; i < 20; i++) P.update(1 / 60, neutralC, game.battlefield, game);
  assert(P.canAttack, 'Safety net: a stuck attack lock outside an action clears itself');
}

// Air combat (20 Oct 2026): air attacks keep momentum, a hit latches onto the foe, then both fall;
// sprint jump + down swipe is a diagonal dive.
{
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy; spells.clearRuntime();
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const air = (h = 70) => { P.state = 'jump'; P.stateTimer = 0; P.canAttack = true; P.grounded = false; P.elevation = h; P.vElevation = 120; P.comboStep = 0; P.airLatch = null; P.airLatchCount = 0; P.sprintDive = null; P.isSprintJump = false; P.kbVelX = 0; };
  const step = (sec) => { for (let i = 0; i < sec * 60; i++) P.update(1 / 60, neutral, game.battlefield, game); };
  P.equipWeapon(null); P.equipClassWeapon(null);
  P.x = 300; P.z = .5; P.facing = 1; game.battlefield.placeOnSurface(P); dummy.homeX = dummy.x = 900; dummy.homeZ = dummy.z = .5;
  // Whiff in the air: the jump momentum continues.
  air(); P.vx = 200; P.executeAttack(neutral, 'normal');
  assert(Math.abs(P.vx - 170) < 1 && !P.airLatch, 'An air attack keeps the jump momentum (no abrupt stop)');
  const xBefore = P.x; step(.1);
  assert(P.x - xBefore > 12, 'The Wizard keeps travelling in the jump direction while swinging');
  // Air hit: latch onto the foe, little drift, low gravity — then both fall.
  air(80); P.x = 300; P.vx = 220; dummy.x = 340; dummy.z = .5; dummy.elevation = 80; dummy.vElevation = 0; dummy.hp = dummy.maxHp;
  P.executeAttack(neutral, 'normal');
  assert(dummy.hp < dummy.maxHp && P.airLatch?.target === dummy, 'An air hit latches the Wizard onto the foe');
  const hLatch = P.elevation; step(.2);
  assert(P.airLatch && Math.abs(P.x - (dummy.x - 40)) < 12 && hLatch - P.elevation < 25 && Math.abs(P.vx) < 60, 'While latched the Wizard hangs in front of the foe: damped drift, low gravity');
  step(.25);
  assert(!P.airLatch && P.vElevation < 0, 'After the exchange both fall from the hit point');
  // Latches per jump are capped.
  air(80); P.airLatchCount = 3; P.x = 300; dummy.x = 340; dummy.elevation = 80; P.executeAttack(neutral, 'normal');
  assert(!P.airLatch, 'At most three latches per jump (no infinite air combo)');
  dummy.elevation = 0; dummy.vElevation = 0;
  // Sprint jump + down swipe: diagonal dive that sweeps through a foe on the path.
  air(90); P.isSprintJump = true; P.x = 300; P.vx = 300; dummy.x = 360; dummy.z = .5; dummy.hp = dummy.maxHp;
  assert(P.executeAttack(neutral, 'dive') && P.sprintDive && P.vx > 300 && P.vElevation < -500, 'Sprint jump + down swipe starts a fast diagonal dive (aimed at the foe on the ground)');
  const diveX = P.x; step(.6);
  assert(P.grounded && P.x - diveX > 60 && dummy.hp < dummy.maxHp && !P.sprintDive && P.state !== 'dive', 'The diagonal dive travels forward, strikes on the way and ends cleanly on landing');
  // Height matters: an air swing high above a foe on the ground misses; low or diving it hits.
  dummy.elevation = 0; dummy.vElevation = 0;
  air(60); P.vx = 0; P.x = 300; dummy.x = 330; dummy.z = .5; dummy.hp = dummy.maxHp; P.executeAttack(neutral, 'normal');
  const highMiss = dummy.hp === dummy.maxHp;
  air(25); P.vx = 0; P.x = 300; dummy.hp = dummy.maxHp; P.executeAttack(neutral, 'normal');
  const lowHit = dummy.hp < dummy.maxHp;
  air(60); P.vx = 0; P.x = 300; dummy.hp = dummy.maxHp; P.executeAttack(neutral, 'dive');
  assert(highMiss && lowHit && dummy.hp < dummy.maxHp, 'Air swings only hit foes at a similar height (jumping over a grounded foe misses); dives still strike downward');
  step(.6); dummy.x = 900;
  // A normal jump + down swipe stays the vertical drop.
  air(90); P.vx = 0; P.x = 300; dummy.x = 900; P.executeAttack(neutral, 'dive');
  assert(!P.sprintDive && Math.abs(P.vx) < 1, 'A normal jump + down swipe stays a vertical dive');
  step(.6); spells.clearRuntime();
}

// Movement after the Unity original: rooted attacks, full combos on a target in front, long sprint jump, auto-run.
{
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy; spells.clearRuntime();
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const idle = () => { P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.vx = 0; P.vz = 0; P.kbVelX = 0; P.grounded = true; P.elevation = 0; P.sprintActive = false; P.comboStep = 0; };
  P.equipWeapon(null); P.equipClassWeapon(null);
  P.x = 300; P.z = .5; P.facing = 1; game.battlefield.placeOnSurface(P); dummy.homeX = dummy.x = 700; idle();
  const x0 = P.x; P.executeAttack(neutral, 'normal'); for (let i = 0; i < 20; i++) P.update(1 / 60, neutral, game.battlefield, game);
  assert(Math.abs(P.x - x0) < 1, 'A whiffed attack no longer lunges forward (rooted like in Unity)');
  // Repeated attacks on a target in front: every chain hit lands, nobody walks through.
  idle(); dummy.homeX = dummy.x = P.x + 14; dummy.homeZ = dummy.z = P.z; dummy.hp = dummy.maxHp; let hits = 0; let last = dummy.hp;
  for (let k = 0; k < 3; k++) { idle(); P.comboStep = k; P.executeAttack(neutral, 'normal'); if (dummy.hp < last) hits++; last = dummy.hp; for (let i = 0; i < 18; i++) P.update(1 / 60, neutral, game.battlefield, game); }
  assert(hits === 3 && P.x < dummy.x, 'Mashing attack keeps hammering the enemy in front (all three chain hits land, no walking through)');
  // Sprint jump carries much further than a walking jump.
  const jumpDistance = (sprint) => { idle(); P.x = 300; P.facing = 1; if (sprint) { P.sprintActive = true; P.sprintDir = 1; P.vx = P.moveSpeed * 1.65; } else P.vx = P.moveSpeed; P.performJump(); const s0 = P.x; for (let i = 0; i < 90 && (i < 3 || !P.grounded); i++) P.update(1 / 60, neutral, game.battlefield, game); return P.x - s0; };
  const walkJ = jumpDistance(false); const sprintJ = jumpDistance(true);
  assert(sprintJ > walkJ * 1.45, 'Sprint + jump is a much longer jump (' + Math.round(sprintJ) + ' vs ' + Math.round(walkJ) + ' px)');
  // Keyboard auto-run: the sprint keeps going after releasing the key; a depth input ends it.
  idle(); P.x = 300; P.activateSprint(1); for (let i = 0; i < 20; i++) P.update(1 / 60, neutral, game.battlefield, game);
  assert(P.sprintActive && P.vx > P.moveSpeed, 'Auto-run: the sprint continues without holding the direction');
  P.update(1 / 60, { ...neutral, keys: { KeyS: true }, move: { x: 0, z: 1 } }, game.battlefield, game);
  assert(!P.sprintActive, 'A different movement input (depth) ends the auto-run');
  idle(); dummy.homeX = dummy.x = 512;
}

// All weapons of the class concept, including ranged and magic weapons that fire real projectiles.
{
  const W = await import('./public/src/weapons.js');
  const need = ['sword_shield', 'mace_shield', 'great_axe', 'great_hammer', 'dual_swords', 'twinblade', 'katana', 'odachi', 'spear', 'glaive', 'daggers', 'throwing_blades', 'bow', 'crossbow', 'gauntlets', 'quarterstaff', 'scythe', 'chain_scythe', 'spellblade', 'rune_greatsword', 'arcane_staff', 'orb_focus', 'warlock_rod', 'rod_grimoire', 'scepter_shield', 'sacred_staff', 'harp', 'battle_zither', 'spirit_glaive', 'spirit_sword', 'claws', 'beast_staff', 'chakrams', 'magic_cards', 'talisman', 'ritual_fan'];
  assert(need.every((id) => W.WEAPONS[id] && W.WEAPON_MOTIONS[id]) && W.WEAPON_IDS.length >= 37, 'All 36 class-concept weapons (A + B of 18 classes) exist with their own motion set');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy; spells.clearRuntime();
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const ready = () => { P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.vx = 0; P.grounded = true; P.sprintActive = false; P.comboStep = 0; };
  P.x = 300; P.z = .5; P.facing = 1; game.battlefield.placeOnSurface(P);
  dummy.homeX = dummy.x = 520; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp;
  // Slot model: tap = melee on the lane, ranged only on the castle; HOLD = the weapon's ranged move everywhere.
  const { HOLD_MANA } = await import('./public/src/hold_actions.js');
  P.mp = P.maxMp; P.reservedMana = 0;
  P.equipClassWeapon('bow'); ready(); P.executeAttack(neutral, 'normal');
  assert(!spells.activeSpells.some((s) => s.isWeaponShot), 'On the lane a bow tap is melee (no arrow)');
  spells.clearRuntime(); ready(); let mp0 = P.mp; P.surfaceId = 'blueCastleUpperPlatform'; P.executeAttack(neutral, 'normal');
  assert(spells.activeSpells.some((s) => s.isWeaponShot && s.kind === 'arrow') && mp0 - P.mp === 1, 'On the castle the bow tap fires an arrow for 1 mana');
  spells.clearRuntime(); P.surfaceId = null; ready(); mp0 = P.mp; P.beginCharge('hold', 'key'); P.chargeTimer = P.chargeMaxTime * .5; P.releaseCharge();
  assert(spells.activeSpells.some((s) => s.isWeaponShot && s.kind === 'arrow' && s.pierce) && mp0 - P.mp === HOLD_MANA.lane && P.lastHoldAction === 'REACH', 'HOLD on the lane: the bow shoots its charged piercing arrow (2 mana)');
  for (let i = 0; i < 40; i++) spells.update(1 / 60, game);
  assert(dummy.hp < dummy.maxHp, 'The arrow hits a target at range');
  spells.clearRuntime(); P.surfaceId = 'blueCastleUpperPlatform'; ready(); mp0 = P.mp; P.holdAttack();
  assert(spells.activeSpells.filter((s) => s.isWeaponShot).length >= 3 && mp0 - P.mp === HOLD_MANA.castle && P.lastHoldAction === 'CASTLE SHOT', 'HOLD on the castle: the bigger ranged attack (volley, 4 mana)');
  P.surfaceId = null;
  spells.clearRuntime(); P.equipClassWeapon('sword_shield'); ready(); P.holdAttack();
  assert(spells.activeSpells.some((s) => s.isWeaponShot && s.kind === 'wave'), 'HOLD with a sword: an air slash flies out');
  spells.clearRuntime(); P.equipClassWeapon('daggers'); ready(); P.holdAttack();
  assert(spells.activeSpells.filter((s) => s.isWeaponShot && s.kind === 'knife').length === 3, 'HOLD with daggers: three thrown knives');
  spells.clearRuntime(); ready(); P.mp = 1; assert(!P.holdAttack() && !spells.activeSpells.length, 'HOLD without mana fizzles');
  P.mp = P.maxMp; P.equipClassWeapon('bow');
  P.chargeTimer = 1; P.chargeSource = 'key'; P.update(1 / 60, neutral, game.battlefield, game); const holdDir = P.chargeDir;
  P.update(1 / 60, { ...neutral, keys: { KeyD: true } }, game.battlefield, game); const fwdDir = P.chargeDir; P.chargeTimer = 0; P.formCharge = null;
  assert(holdDir === 'hold' && fwdDir === 'forward', 'K alone charges the HOLD slot, K + toward the facing the forward charge');
  {
    // The HOLD charge has its own look (glowing weapon hand + arrow) — never the normal melee aura.
    const m = { arcs: 0, glow: 0 };
    const hctx = new Proxy({}, { get: (t, k) => k === 'arc' ? (x, y, r) => { if (r < 0) throw new Error('IndexSizeError'); m.arcs++; } : k === 'canvas' ? undefined : () => {}, set: (t, k, v) => { if (k === 'globalCompositeOperation' && v === 'lighter') m.glow++; return true; } });
    ready(); P.beginCharge('hold', 'key'); P.chargeDir = 'hold'; P.chargeTimer = P.chargeMaxTime * .4; P.renderChargeAura(hctx, P.y);
    const normalArcs = m.arcs; P.chargeTimer = 0; P.formCharge = null;
    assert(normalArcs >= 3 && m.glow >= 1, 'HOLD charge shows a glowing weapon hand instead of the melee aura');
    P.chargeTimer = 99; P.formCharge = { elapsed: .5 }; m.arcs = 0;
    let ok = true; try { P.renderChargeAura(hctx, P.y); } catch { ok = false; }
    P.chargeTimer = 0; P.formCharge = null;
    assert(ok && m.arcs === 0, 'In form mode the normal-aura path skips the HOLD look (no negative radii)');
    // The weapon itself pulses while HOLD charges; bare hands glow instead.
    const W = await import('./public/src/weapons.js');
    const count = () => { const c = { lighter: 0, arcs: 0 }; return { c, ctx: new Proxy({}, { get: (tt, k) => k === 'arc' ? (x, y, r) => { if (r < 0) throw new Error('IndexSizeError'); c.arcs++; } : k === 'canvas' ? undefined : () => {}, set: (tt, k, v) => { if (k === 'globalCompositeOperation' && v === 'lighter') c.lighter++; return true; } }) }; };
    P.equipClassWeapon('sword_shield'); P.chargeTimer = 0; P.formCharge = null;
    const idleW = count(); W.drawHeldWeapon(idleW.ctx, P, P.y, 'front'); W.drawHeldWeapon(idleW.ctx, P, P.y, 'back');
    ready(); P.beginCharge('hold', 'key'); P.chargeDir = 'hold'; P.chargeTimer = P.chargeMaxTime * .5;
    const holdW = count(); W.drawHeldWeapon(holdW.ctx, P, P.y, 'front'); W.drawHeldWeapon(holdW.ctx, P, P.y, 'back');
    assert(P.holdChargeLevel() > .4 && holdW.c.lighter > idleW.c.lighter, 'While HOLD charges the held weapon itself pulses (extra glow pass)');
    P.equipClassWeapon(null); P.equipWeapon?.(null);
    const hands = count(); P.renderHoldHands(hands.ctx, P.y, P.holdChargeLevel(), '#7fd8ff');
    P.chargeTimer = 0; P.formCharge = null;
    assert(hands.c.arcs >= 6 && P.holdChargeLevel() === null, 'Without a weapon both hands glow while charging; no charge → no glow');
    P.equipClassWeapon('bow');
  }
  spells.clearRuntime(); ready(); P.beginCharge('up', 'key'); P.chargeTimer = P.chargeMaxTime * .2; P.chargeDir = 'up'; P.releaseCharge();
  const skyArrow = spells.activeSpells.filter((s) => s.isWeaponShot);
  assert(skyArrow.length === 1 && skyArrow[0].kind === 'arrow' && skyArrow[0].shot.lift > 400 && P.lastWeaponUp === 'HIMMELSPFEIL', 'Charged UP with the bow: the sky arrow that lifts the target');
  spells.clearRuntime(); P.equipClassWeapon('chakrams'); ready(); P.surfaceId = 'blueCastleUpperPlatform'; P.executeAttack(neutral, 'normal'); P.surfaceId = null;
  assert(spells.activeSpells.some((s) => s.isWeaponShot && s.ricochet > 0), 'Chakrams ricochet');
  // Every weapon attacks without errors (melee hitbox or projectiles) and renders.
  const strict = new Proxy({}, { get: (t, k) => (k === 'canvas' ? undefined : (k === 'measureText' ? () => ({ width: 10 }) : () => {})), set: () => true });
  const broken = [];
  for (const id of need) { try { spells.clearRuntime(); P.equipClassWeapon(id); for (const kind of ['normal', 'normal', 'normal', 'heavy']) { ready(); P.executeAttack(neutral, kind); for (let i = 0; i < 6; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); } W.drawHeldWeapon(strict, P, P.y, 'front'); W.drawHeldWeapon(strict, P, P.y, 'back'); for (const s of spells.activeSpells) s.render?.(strict); } } catch (e) { broken.push(id + ': ' + e.message); } }
  assert(!broken.length, 'Every weapon attacks and renders without errors ' + broken.slice(0, 3).join(' | '));
  // Weapon kits: every weapon has its own ground charge-down buff / debuff (mana), launcher and dive.
  {
    const K = await import('./public/src/weapon_kits.js');
    const ids = Object.keys(W.WEAPONS);
    assert(ids.every((id) => K.WEAPON_KITS[id]?.down?.mana > 0 && K.WEAPON_KITS[id].up && K.WEAPON_KITS[id].dive), 'Every weapon has a kit: charge-down buff / debuff, launcher, dive');
    assert(new Set(ids.map((id) => K.WEAPON_KITS[id].down.name)).size === ids.length, 'Every weapon names its own charge-down move');
    const kitBroken = []; const strictKit = new Proxy({}, { get: (t, k) => (k === 'ellipse' || k === 'arc') ? (x, y, rx, ry) => { if (rx < 0 || (k === 'ellipse' && ry < 0)) throw new Error('IndexSizeError ' + k); } : (k === 'canvas' ? undefined : (k === 'measureText' ? () => ({ width: 10 }) : () => {})), set: () => true });
    for (const id of ids) {
      try {
        spells.clearRuntime(); P.weaponBuff = null; P.equipClassWeapon(id); P.mp = P.maxMp; P.reservedMana = 0;
        dummy.homeX = dummy.x = 360; dummy.homeZ = dummy.z = .5; dummy.hp = dummy.maxHp; P.x = 300; P.z = .5; P.facing = 1; game.battlefield.placeOnSurface(P);
        ready(); const mp0 = P.mp; P.beginCharge('down', 'key'); P.chargeTimer = P.chargeMaxTime * .5; P.chargeDir = 'down';
        if (!P.releaseCharge() || mp0 - P.mp !== K.WEAPON_KITS[id].down.mana) kitBroken.push(id + ': down');
        ready(); P.beginCharge('up', 'key'); P.chargeTimer = P.chargeMaxTime * .5; P.chargeDir = 'up'; P.releaseCharge();
        if (P.lastWeaponUp !== K.WEAPON_KITS[id].up.name) kitBroken.push(id + ': up');
        ready(); P.grounded = false; P.elevation = 60; P.vElevation = 0; P.executeAttack(neutral, 'dive');
        if (P.lastWeaponDive !== K.WEAPON_KITS[id].dive.name) kitBroken.push(id + ': dive');
        for (let i = 0; i < 90; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); if (i % 15 === 0) for (const sp of spells.activeSpells) sp.render?.(strictKit); }
      } catch (e) { kitBroken.push(id + ': ' + e.message); }
    }
    P.weaponBuff = null; P.grounded = true; P.elevation = 0;
    assert(!kitBroken.length, 'Every weapon kit (down / up / dive) runs, costs mana and renders ' + kitBroken.slice(0, 4).join(' | '));
    // Mechanics spot checks.
    spells.clearRuntime(); P.equipClassWeapon('sword_shield'); ready(); P.mp = P.maxMp; K.castWeaponDown(P, game, spells);
    const attacker = { x: P.x + 40, z: P.z, hp: 100, took: 0, takeDamage(d) { this.took += d; } };
    const { setHitContext } = await import('./public/src/signature_runes.js');
    setHitContext(attacker); const hp0 = P.hp; const parry = P.takeDamage(30, -200, 0, .3, false, 'melee'); setHitContext(null);
    assert(parry?.parried && P.hp === hp0 && attacker.took > 0 && !P.weaponBuff, 'Sword & shield KONTERHALTUNG: the next melee hit is parried and riposted');
    spells.clearRuntime(); P.equipClassWeapon('bow'); ready(); P.mp = P.maxMp; dummy.homeX = dummy.x = 420; dummy.hp = dummy.maxHp; K.castWeaponDown(P, game, spells);
    assert(K.targetDamageMult(P, dummy) > 1.3, 'Bow JÄGERMAL: the marked prey takes more damage from you');
    spells.clearRuntime(); P.equipClassWeapon('warlock_rod'); ready(); P.mp = P.maxMp; dummy.homeX = dummy.x = 420; dummy.hp = dummy.maxHp; K.castWeaponDown(P, game, spells);
    for (let i = 0; i < 40; i++) spells.update(1 / 60, game);
    assert(dummy.hp < dummy.maxHp && spells.activeSpells.some((s) => s.kind === 'circle'), 'Warlock FANGZIRKEL: a binding circle rises under the foe and traps it');
    spells.clearRuntime(); P.equipClassWeapon('claws'); ready(); P.mp = P.maxMp; K.castWeaponDown(P, game, spells); P.hp = P.maxHp - 50; const before = P.hp; K.onWeaponMeleeHit(P, dummy, 40, spells);
    assert(P.hp > before && P.weaponBuff?.kind === 'frenzy', 'Claws BLUTRAUSCH: melee hits heal (life steal)');
    P.weaponBuff = null; P.equipClassWeapon(null); ready(); assert(!P.beginCharge('down', 'key'), 'Without a weapon there is no ground charge-down');
    P.chargeTimer = 0; P.state = 'idle';
  }
  P.equipClassWeapon(null); spells.clearRuntime(); dummy.homeX = dummy.x = 512;
}

// Mastery system (GDD build system adapted to GRIMGE): the two reference builds come out
// of general rules — shields are the Ward principle, masteries change concrete parameters.
{
  const M = await import('./public/src/mastery.js');
  const { Minion } = await import('./public/src/entities.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const E = game.enemyChampion; const dummy = game.trainingDummy;
  const tiers = (id, upTo) => [1, 2, 3, 4].slice(0, upTo).map((n) => id + '.' + n);
  const reset = () => {
    spells.clearRuntime(); game.minions = []; P.x = 300; P.z = .5; P.facing = 1; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true; P.elevation = 0;
    P.isGuarding = false; P.invulnerableTimer = 0; P.hp = P.maxHp; P.mp = P.maxMp; P.arcaneShield = 0; P.arcaneShieldTimer = 0; P.wardCharge = 0; P.convertBonus = 0; P._retaliateAt = -9;
    game.battlefield.placeOnSurface(P); dummy.homeX = dummy.x = 1600; E.x = 2200; M.resetMasteryRuntime(P);
  };
  const foe = (x, hp = 500) => { const m = new Minion(x, .5, 'red', 'melee', 0); m.maxHp = m.hp = hp; game.battlefield.placeOnSurface(m); game.minions.push(m); return m; };
  const hitFrom = (attacker, amount, kx = -120) => { const prev = STATUS.setStatusSource({ team: attacker.team, statusElements: [], castBy: attacker }); try { return P.takeDamage(amount, kx, 0, .2, false, 'melee'); } finally { STATUS.setStatusSource(prev); } };

  // Build 1 — Lebenssturm-Wächter (Witcher Quen): Fulgur + Natura + Terra shield.
  reset();
  P.masteries = new Set([...tiers('ward.retaliate', 4), ...tiers('ward.sustain', 3), ...tiers('fulgur.chain', 2), ...tiers('fulgur.discharge', 3), ...tiers('natura.leech', 4)]);
  const ward = spells.resolveSpell([{ id: 'fulgur' }, { id: 'natura' }, { id: 'ward' }]);
  assert(ward?.id === 'storm_ward' && spells.resolveSpell([{ id: 'terra' }, { id: 'umbra' }, { id: 'ward' }])?.id === 'sacrifice_bulwark', 'Shield recipes with the SCHUTZ rune: Fulgur+Natura+Schutz = LEBENSSTURM-SCHILD, Terra+Umbra+Schutz = OPFERBOLLWERK');
  spells.cast(P, ward, game);
  assert(P.arcaneShield > 0 && ['fulgur', 'natura', 'ward'].every((el) => P.shieldTags.includes(el)), 'The shield carries the element tags of its recipe (Ward principle)');
  const a = foe(340); const b = foe(430); const c = foe(540);
  P.hp = P.maxHp - 60; const hp0 = P.hp; const timer0 = P.arcaneShieldTimer; const cap0 = P.arcaneShield;
  hitFrom(a, 20);
  assert(P.arcaneShield === cap0 - 20 && a.hp < 500, 'Witcher build: a shield hit triggers an electric retaliation on the attacker');
  assert(b.hp < 500 && c.hp < 500, 'Witcher build: the retaliation chains on to the next foes (Fulgur Kette, allowed by Vergeltung IV)');
  assert(P.hp > hp0 && P.hp - hp0 < 8, 'Witcher build: every target hit heals a little, diminishing (Natura Lebensentzug IV)');
  assert(P.arcaneShieldTimer > timer0 && P.arcaneShieldTimer - timer0 <= .2501, 'Witcher build: the hits extend the shield — capped per event (Aufrechterhalten III)');
  const chainA = 500 - a.hp; const chainB = 500 - b.hp;
  assert(chainB < chainA, 'Chain jumps lose damage (50 % per jump before tier IV)');
  // Without masteries the same shield only absorbs.
  reset(); P.masteries = new Set(); spells.cast(P, ward, game); const plain = foe(340); hitFrom(plain, 20);
  assert(plain.hp === 500 && P.hp === P.maxHp, 'Without masteries a shield just absorbs (no build-specific code)');
  // Proc control: 100 shield hits in a row — budget, depth, heal cap, max shield duration hold.
  reset();
  P.masteries = new Set([...tiers('ward.retaliate', 4), ...tiers('ward.sustain', 4), ...tiers('fulgur.chain', 4), ...tiers('fulgur.discharge', 4), ...tiers('natura.leech', 4), ...tiers('aqua.soak', 4)]);
  spells.cast(P, ward, game); const pack = [340, 380, 420, 460, 500, 540].map((x) => foe(x, 1e6));
  let hitsThisEvent = 0; let worst = 0; for (const f of pack) { const orig = f.takeDamage.bind(f); f.takeDamage = (...args) => { hitsThisEvent++; return orig(...args); }; }
  P.hp = P.maxHp - 100; const hpStress = P.hp; let crashed = null;
  try {
    for (let i = 0; i < 100; i++) { P.arcaneShield = 1e5; P._retaliateAt = -9; P.invulnerableTimer = 0; hitsThisEvent = 0; hitFrom(pack[i % 6], 5); worst = Math.max(worst, hitsThisEvent); }
  } catch (err) { crashed = err; }
  assert(!crashed, 'Proc stress: 100 shield hits with every reactive mastery run without an endless loop ' + (crashed?.message ?? ''));
  assert(worst > 1 && worst <= M.PROC.budget, 'Proc stress: one hit causes at most PROC.budget follow-up hits (' + worst + ')');
  assert(P.hp - hpStress <= M.PROC.healPerSecond + 1e-6, 'Proc stress: healing stays under the heal cap per second');
  assert(P.arcaneShieldTimer <= M.PROC.shieldMaxLife + 1e-6, 'Proc stress: the shield never lasts longer than the max duration');

  // Build 2 — Gefallener Koloss (Exiled Heavy Knight).
  reset(); P.buildModifiers = { ...P.buildModifiers, lastStand: .5 };
  P.masteries = new Set([...tiers('terra.fortify', 4), ...tiers('ward.absorb', 3), ...tiers('umbra.sacrifice', 4), ...tiers('ignis.burn', 3)]);
  const bulwark = spells.resolveSpell([{ id: 'terra' }, { id: 'umbra' }, { id: 'ward' }]);
  spells.cast(P, bulwark, game);
  const paid = P.maxHp - P.hp;
  assert(paid === Math.floor(P.maxHp * .2) && P.sacrificedHp === paid && P.arcaneShield > 110 * 1.7 + paid, 'Knight build: Opfer sacrifices 20 % HP into shield capacity (an HP sacrifice is no enemy hit)');
  const brute = foe(340, 3000); const bx = brute.x;
  hitFrom(brute, 30);
  assert(P.wardCharge > 0, 'Knight build: absorbed damage charges a reaction (Absorbieren III)');
  assert((brute.kbVelX ?? 0) > 0 || brute.x > bx, 'Knight build: a melee attacker bounces off the shield (Befestigen III)');
  // Difference counter: a perfect block releases the stored reaction at the attacker.
  P.isGuarding = true; P.guardHoldTime = .05; P.facing = 1; const charge = P.wardCharge; const bhp = brute.hp;
  hitFrom(brute, 10, -120);
  assert(P.wardCharge < charge && bhp - brute.hp >= charge, 'Knight build: a perfect block fires the stored reaction back (difference counter)');
  P.isGuarding = false; P.guardHoldTime = 0;
  // Glass cannon + DEF→ATK: low HP, then a charged hit converts the shield into a one-shot.
  P.wardCharge = 12; P.hp = Math.floor(P.maxHp * .2); P.invulnerableTimer = 0; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true;
  const shieldLeft = P.arcaneShield; brute.hp = brute.maxHp = 3000; brute.x = P.x + 40; brute.kbVelX = 0; game.battlefield.placeOnSurface(brute);
  P.beginCharge('forward'); P.chargeTimer = P.chargeMaxTime * .05; P.releaseCharge();
  const burst = 3000 - brute.hp;
  assert(P.arcaneShield === 0 && burst >= shieldLeft * .8 + 12, 'Knight build: a charged hit consumes the shield — 80 % of it + the stored charge land as burst (Befestigen IV)');
  assert(STATUS.hasStatus(brute, 'burn'), 'Knight build: Ignis Brand gives the converted blow fire');
  // Letztes Gefecht: below 25 % HP the same swing hits 50 % harder.
  const swing = (hp) => { P.hp = hp; P.state = 'idle'; P.canAttack = true; brute.hp = 3000; brute.x = P.x + 40; P.convertBonus = 0; P.triggerMeleeHitbox(20, 0, 0, 0, false, {}); return 3000 - brute.hp; };
  const full = swing(P.maxHp); const low = swing(Math.floor(P.maxHp * .2));
  assert(Math.abs(low - full * 1.5) < 1.01, 'Letztes Gefecht: melee hits deal +50 % below 25 % HP');
  // Opfer III: a shield that expires unbroken returns part of the sacrifice.
  reset(); P.masteries = new Set(tiers('umbra.sacrifice', 3)); spells.cast(P, bulwark, game); const after = P.hp; const sac = P.sacrificedHp;
  P.arcaneShieldTimer = 0; M.masteryTickShield(P);
  assert(P.hp === after + Math.round(sac * .3), 'Opfer III: an unbroken shield gives 30 % of the sacrificed HP back');
  // Build analysis spells the chains out.
  const chains = M.analyzeBuild(new Set([...tiers('ward.retaliate', 4), ...tiers('fulgur.chain', 1), ...tiers('fulgur.discharge', 3), ...tiers('natura.leech', 4), ...tiers('ward.sustain', 2)])).join(' | ');
  assert(/Blitz-Vergeltung/.test(chains) && /Kette/.test(chains) && /Heilung/.test(chains) && /verlängert/.test(chains), 'Build analysis explains the Witcher chain: ' + chains);
  // Every element has its own tree (Ventus, Lux, Void, Konstrukt, Bestia too).
  const hitAs = (target, tags, amount = 20) => { const prev = STATUS.setStatusSource({ team: P.team, statusElements: tags, castBy: P, statusChance: 0 }); try { return target.takeDamage(amount, 0, 0, .1, false, 'spell'); } finally { STATUS.setStatusSource(prev); } };
  const only = (...ids) => { P.masteries = new Set(ids.flatMap(([id, n]) => tiers(id, n))); };
  reset(); only(['ventus.displace', 4]); { const v1 = foe(360); const v2 = foe(400); const vx0 = v1.x; hitAs(v1, ['ventus']); assert(v1.x > vx0 && v1.slowTimer > 0 && v2.hp < 500, 'Ventus Verdrängen: harder push, slow, the pushed foe hurts the one behind it'); }
  reset(); only(['ventus.spread', 2]); { const s1 = foe(360); const s2 = foe(420); const s3 = foe(300 + 110); STATUS.applyStatus(s1, 'poison', { force: true }); hitAs(s1, ['ventus']); assert(STATUS.hasStatus(s2, 'poison') && STATUS.hasStatus(s3, 'poison'), 'Ventus Ausbreiten: the wind carries poison to two neighbours'); }
  reset(); only(['lux.blessing', 4]); { const l1 = foe(360); P.hp = P.maxHp - 20; const h = P.hp; hitAs(l1, ['lux']); assert(P.arcaneShield === 5 && P.hp > h, 'Lux Segen: light hits build shield points and heal'); }
  reset(); only(['lux.purify', 4]); { const l1 = foe(360); P._purifyAt = -9; STATUS.applyStatus(P, 'burn', { force: true }); P.hp = P.maxHp - 30; const h = P.hp; hitAs(l1, ['lux']); assert(!STATUS.hasStatus(P, 'burn') && P.hp > h && l1.hp < 500 - 20, 'Lux Reinigung: a light hit cleanses your burn, heals and sends a light pulse'); }
  reset(); only(['void.collapse', 3]); { const c1 = foe(360); const c2 = foe(460); const x0 = c2.x; hitAs(c1, ['void']); assert(c2.x < x0 && c2.hp < 500, 'Void Kollaps: foes nearby are pulled to the target and hurt'); }
  reset(); only(['void.nullify', 4]); { E.x = P.x + 80; E.z = P.z; E.lifeState = 'Alive'; E.hp = E.maxHp; E.mp = 4; E.spellCooldown = 0; P.mp = 10; hitAs(E, ['void']); assert(E.mp === 0 && P.mp === 12 && E.spellCooldown >= 1.5, 'Void Annullieren: mana drained (half to you), an empty foe is silenced'); E.x = 2200; }
  reset(); only(['construct.durability', 4]); { spells.cast(P, spells.resolveSpell([{ id: 'aqua' }, { id: 'terra' }]), game); const cap = P.arcaneShield; const k1 = foe(340); hitFrom(k1, cap + 5); assert(P.arcaneShield === Math.round(cap * .25) && P.arcaneShieldTimer > 0, 'Konstrukt Haltbarkeit III: a broken shield rebuilds once at 25 %'); P.mp = 0; P.arcaneShieldTimer = 0; M.masteryTickShield(P); assert(P.mp === 15, 'Konstrukt Haltbarkeit IV: a shield running out returns 15 mana'); }
  reset(); only(['construct.forge', 4]); { const f1 = foe(360); const f2 = foe(420); hitAs(f1, ['construct']); const after1 = f1.hp; hitAs(f1, ['construct']); assert(STATUS.hasStatus(f1, 'bleed') && STATUS.hasStatus(f2, 'bleed') && after1 - f1.hp > 20, 'Konstrukt Schmieden: guaranteed bleeding, it spreads, bleeding foes take more'); }
  reset(); only(['bestia.instinct', 2]); { const b1 = foe(360, 2000); P._instinct = 0; const dmg = []; for (let i = 0; i < 3; i++) { const h = b1.hp; hitAs(b1, ['bestia']); dmg.push(h - b1.hp); } assert(dmg[2] > dmg[0] && dmg[0] === dmg[1], 'Bestia Instinkt: every third beast hit is critical'); }
  reset(); only(['bestia.pack', 4]); { const r1 = foe(360); P.hp = P.maxHp - 20; hitAs(r1, ['bestia']); const h = r1.hp; const ph = P.hp; hitAs(r1, ['ignis']); assert(h - r1.hp > 20 && P.hp > ph && !r1.packMark, 'Bestia Rudel: the mark is cashed in by your next other hit (+bonus, heal)'); }
  assert(Object.keys(M.MASTERY_TREES).filter((k) => k !== 'ward').length === 11 && M.masteryRequirement('ward.absorb.1').rune === 'ward', 'Every one of the 11 elements has its own mastery tree; the Schutz tree belongs to the SCHUTZ rune');
  { reset(); const ally = foe(330); ally.team = 'blue'; const ga = spells.resolveSpell([{ id: 'ward' }, { id: 'ward' }]); spells.cast(P, ga, game);
    assert(ga?.id === 'great_aegis' && spells.resolveSpell([{ id: 'ward' }])?.id === 'arcane_aegis' && P.arcaneShield > 0 && spells.activeSpells.some((s) => s.constructor.name === 'ShieldBubbleSpell' && s.target === ally), 'SCHUTZ rune: alone the Aegis; Schutz + Schutz = GROSSE AEGIS shields you and every ally nearby'); }
  // Three branches per element (21 Oct 2026): every new branch does what it says.
  assert(Object.values(M.MASTERY_TREES).every((tr) => Object.keys(tr.branches).length === 3), 'Every mastery tree has three branches');
  const hitK = (target, tags, kind = 'spell', amount = 20) => { const prev = STATUS.setStatusSource({ team: P.team, statusElements: tags, castBy: P, statusChance: 0 }); try { const h = target.hp; target.takeDamage(amount, 0, 0, .1, false, kind); return h - target.hp; } finally { STATUS.setStatusSource(prev); } };
  reset(); only(['fulgur.overload', 4]); { const o1 = foe(360, 3000); P.mp = 10; for (let i = 0; i < 4; i++) hitK(o1, ['fulgur']); const d5 = hitK(o1, ['fulgur']); assert(STATUS.hasStatus(o1, 'paralysis') && P.mp === 15 && d5 > 20, 'Fulgur Überladung: every 4th lightning hit paralyses (+5 mana), paralysed foes take more'); }
  reset(); only(['natura.thorns', 4]); { const n1 = foe(360, 3000); const d1 = hitK(n1, ['natura']); const d2 = hitK(n1, ['natura']); assert(STATUS.hasStatus(n1, 'poison') && n1.slowTimer > 0 && d2 > d1, 'Natura Dornen: guaranteed poison, slowed, poisoned foes take more'); }
  reset(); only(['natura.growth', 4]); { const ally = foe(330); ally.team = 'blue'; ally.hp = 300; const g1 = foe(400); hitK(g1, ['natura']); assert(ally.hp === 305 && ally.arcaneShield === 8, 'Natura Wachstum: a nature hit heals the nearest ally and shields it'); }
  reset(); only(['aqua.tide', 3]); { const w1 = foe(360); STATUS.applyStatus(w1, 'wet', { force: true }); P.mp = 10; hitK(w1, ['aqua']); assert(P.mp === 16, 'Aqua Flut: water hits restore mana, double on wet foes'); }
  reset(); only(['aqua.frost', 4]); { const f1 = foe(360, 3000); STATUS.applyStatus(f1, 'wet', { force: true }); for (let i = 0; i < 3; i++) hitK(f1, ['aqua']); const df = hitK(f1, ['ignis']); assert(f1.freezeTimer > 0 && f1.slowTimer > 0 && df > 20, 'Aqua Frost: wet foes slow down, every 3rd hit freezes, the frozen take +30 %'); }
  reset(); only(['ignis.inferno', 4]); { const i1 = foe(360, 3000); const i2 = foe(410); STATUS.applyStatus(i1, 'burn', { force: true }); const di = hitK(i1, ['ignis']); assert(di >= 25 && i2.hp < 500 && STATUS.hasStatus(i2, 'burn'), 'Ignis Feuersbrunst: burning foes take +25 % and explode, the blast sets neighbours on fire'); }
  reset(); only(['ignis.burn', 1], ['ignis.ember', 4]); { const e1 = foe(360, 3000); hitK(e1, ['ignis']); P.mp = 0; P.focus = 0; P.hp = P.maxHp - 20; const hp1 = P.hp; for (let i = 0; i < 60; i++) STATUS.updateStatuses(1 / 60); assert(P.mp >= 2 && P.hp > hp1 && P.focus >= 1, 'Ignis Glut: ticks of your burn give mana, heal and Focus'); }
  reset(); only(['terra.quake', 3]); { const q1 = foe(360, 3000); const q2 = foe(420); for (let i = 0; i < 3; i++) hitK(q1, ['terra']); assert(q2.hp < 500, 'Terra Beben: every 3rd earth hit quakes around the target'); }
  reset(); only(['terra.stoneskin', 4]); { const s1 = foe(360, 3000); hitK(s1, ['terra']); const sh = s1.hp; P.invulnerableTimer = 0; hitFrom(s1, 20); assert(P.maxHp - P.hp === 17 && s1.hp < sh, 'Terra Steinhaut: after an earth hit you take 15 % less and melee bounces back'); M.masteryTick(P, 2.1); P.hp = P.maxHp; P.invulnerableTimer = 0; hitFrom(s1, 20); assert(P.maxHp - P.hp === 20, 'Terra Steinhaut lasts 2 s'); }
  reset(); only(['umbra.curse', 4]); { const c1 = foe(360, 3000); const c2 = foe(420, 3000); hitK(c1, ['umbra']); P.hp = P.maxHp - 20; const ph = P.hp; const dc = hitK(c1, ['ignis']); const dn = hitK(c2, ['ignis']); hitK(c1, ['umbra']); assert(dc > dn && P.hp > ph && c2.curse?.by === P, 'Umbra Fluch: your hits on the cursed bite harder and heal, shadow hits pass the curse on'); }
  reset(); only(['umbra.veil', 4]); { const v1 = foe(360, 3000); hitK(v1, ['umbra']); const vh = v1.hp; P.mp = 0; P.invulnerableTimer = 0; const res = hitFrom(v1, 20); assert(res?.dodged && P.hp === P.maxHp && v1.hp < vh && P.mp === 8, 'Umbra Nachtschleier: the next melee hit is dodged, struck back, +8 mana'); P.invulnerableTimer = 0; hitK(v1, ['umbra']); assert(!hitFrom(v1, 20)?.dodged, 'Umbra Nachtschleier has a cooldown'); }
  reset(); only(['ventus.gale', 4]); { const g1 = foe(360, 3000); assert(M.masteryMoveMult(P) === 1, 'no haste before'); hitK(g1, ['ventus']); const dm = hitK(g1, [], 'melee'); assert(Math.abs(M.masteryMoveMult(P) - 1.2) < 1e-9 && dm > 20, 'Ventus Rückenwind: wind hits give +20 % tempo and harder melee'); M.masteryTick(P, 1.6); assert(M.masteryMoveMult(P) === 1, 'Rückenwind fades after 1.5 s'); }
  reset(); only(['lux.radiance', 4]); { const r1 = foe(360, 3000); const r2 = foe(420, 3000); hitK(r1, ['lux']); const dr = hitK(r1, ['ignis']); assert(r1.freezeTimer > 0 && r2.freezeTimer > 0 && dr > 20, 'Lux Strahlen: light blinds (and jumps on), the blinded take more'); }
  reset(); only(['void.rift', 4]); { const x1 = foe(360, 3000); const x2 = foe(410, 3000); x1.mp = x2.mp = 10; hitK(x1, ['void']); const a1 = x1.hp; M.masteryTick(P, .5); assert(x1.hp === a1, 'the echo waits'); M.masteryTick(P, .6); assert(x1.hp < a1 && x2.hp < 3000 && x1.mp === 7, 'Void Riss: an echo of the hit lands a second later, on neighbours too, draining mana'); }
  reset(); only(['construct.arsenal', 4]); { const k1 = foe(360, 3000); const k2 = foe(430, 3000); const dk = hitK(k1, ['construct'], 'melee'); for (let i = 0; i < 4; i++) hitK(k1, ['construct'], 'melee'); assert(dk === 23 && k2.hp < 3000 && STATUS.hasStatus(k2, 'bleed'), 'Konstrukt Arsenal: forged melee +15 %, every 5th hit throws a bleeding blade'); }
  reset(); only(['bestia.frenzy', 4]); { const b1 = foe(360, 3000); const d0 = hitK(b1, ['bestia']); let dl = 0; for (let i = 0; i < 8; i++) dl = hitK(b1, ['bestia']); assert(P._frenzy === 8 && dl > d0 && Math.abs(M.masteryMoveMult(P) - 1.15) < 1e-9, 'Bestia Raserei: frenzy stacks (up to 8) raise the damage, full stacks haste'); M.masteryTick(P, 3.1); assert(P._frenzy === 0, 'Raserei fades without beast hits'); }
  P.masteries = new Set(); P.buildModifiers = { ...P.buildModifiers, lastStand: 0 }; reset(); game.minions = [];
}

// Air dive by swipe (user, 20 Oct 2026): diagonal swipes dive too and aim at the foe below.
{
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy; spells.clearRuntime();
  const air = () => { P.x = 300; P.z = .5; P.facing = 1; game.battlefield.placeOnSurface(P); P.elevation = 120; P.grounded = false; P.vElevation = 0; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.attackCooldown = 0; P.sprintDive = null; P.isSprintJump = false; };
  dummy.homeX = dummy.x = 420; dummy.homeZ = dummy.z = .5;
  air(); game.performTouchAttackGesture(60, 60);
  assert(P.state === 'dive' && P.vx > 0, 'Air: a diagonal down-forward swipe dives (no longer a heavy) and slants toward the foe below');
  air(); P.isSprintJump = true; game.performTouchAttackGesture(50, 70);
  const vAim = P.vx; assert(P.sprintDive && vAim > 0, 'Sprint jump + diagonal swipe: the sprint dive starts');
  air(); P.isSprintJump = true; dummy.homeX = dummy.x = 340; game.performTouchAttackGesture(50, 70);
  assert(P.sprintDive && P.vx > 0 && P.vx < vAim, 'The sprint dive is aimed: a closer foe gets a steeper dive');
  air(); P.facing = 1; game.performTouchAttackGesture(-60, 60);
  assert(P.state === 'dive' && P.facing === -1, 'A diagonal down-back swipe turns around and dives that way');
  air(); game.performTouchAttackGesture(0, 70);
  assert(P.state === 'dive', 'A straight down swipe still dives');
  P.elevation = 0; P.grounded = true; P.state = 'idle'; P.sprintDive = null; P.isSprintJump = false; dummy.homeX = dummy.x = 512;
}

// Domains really bite (user, 20 Oct 2026): sure-hit potency, the trapped cannot cast, a trapped Wizard loses mana.
{
  const D = await import('./public/src/signature_abilities_g.js'); const core = await import('./public/src/signature_core.js'); const { Minion } = await import('./public/src/entities.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const E = game.enemyChampion; spells.clearRuntime(); game.minions = [];
  P.x = 400; P.z = .5; game.battlefield.placeOnSurface(P); E.lifeState = 'Alive'; E.hp = E.maxHp; E.passive = true; E.x = 470; E.z = .5; E.spellCooldown = 0; E.beamCooldown = 0;
  const m = new Minion(360, .5, 'red', 'melee', 0); game.battlefield.placeOnSurface(m); game.minions.push(m); const interval = m.attackCooldown;
  const dom = D.openDomain(P, null, core.SIGNATURES.S53, 'S53');
  for (let i = 0; i < 90; i++) spells.update(1 / 60, game);
  assert(dom.power >= D.DOMAIN.potency - 1e-9 && dom.trapped.has(E) && E.spellCooldown >= .5 && E.beamCooldown >= .5, 'Domain: sure-hit potency, a trapped foe Wizard cannot cast spells or beams');
  assert(m.attackCooldown === interval, 'Domain: minions are slowed in attacking without breaking their attack interval');
  spells.clearRuntime(); game.minions = [];
  P.mp = 80; const foeDom = D.openDomain(E, null, core.SIGNATURES.S53, 'S53');
  for (let i = 0; i < 90; i++) spells.update(1 / 60, game);
  assert(foeDom.trapped.has(P) && P.mp < 80 - 2, 'Domain: a Wizard trapped in a hostile domain loses mana (only an own domain breaks free)');
  spells.clearRuntime(); E.passive = false; E.x = 900;
}

// Weapon sprint attacks (user, 20 Oct 2026): every class weapon has its own sprint move.
{
  const WS = await import('./public/src/weapon_sprint.js'); const { Minion } = await import('./public/src/entities.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy; dummy.homeX = dummy.x = 1600;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  // The foes stand still (no AI swings that could interrupt the sprint attack: deterministic).
  const step = (n) => { for (let i = 0; i < n; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); } };
  const sprintAt = (weapon, foeX) => {
    spells.clearRuntime(); game.minions = []; P.equipClassWeapon(weapon); P.x = 300; P.z = .5; P.facing = 1; P.grounded = true; P.elevation = 0; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.sprintStrike = null; game.battlefield.placeOnSurface(P);
    const m = new Minion(foeX, .5, 'red', 'melee', 0); m.maxHp = m.hp = 3000; m.passive = true; game.battlefield.placeOnSurface(m); game.minions.push(m);
    P.sprintActive = true; P.vx = 320; P.startSprintAttack(); return m;
  };
  assert(Object.keys(WS.WEAPON_SPRINTS).length >= 36, 'Every class weapon has its own sprint attack');
  let m = sprintAt('daggers', 340); let hits = 0; const orig = m.takeDamage.bind(m); m.takeDamage = (...args) => { hits++; return orig(...args); }; step(40);
  assert(P.lastSprintAttack === 'DOLCHWIRBEL' && hits >= 3, 'Daggers DOLCHWIRBEL: the Wizard spins like a vortex — several hits (' + hits + ')');
  m = sprintAt('gauntlets', 345); step(6); const dragX = m.x; step(4);
  const carried = m.x > 345 + 5; step(14);
  assert(P.lastSprintAttack === 'DURCHSCHLAG' && carried && m.hp < 3000 && Math.abs(P.vx) < 1 && (m.kbVelX > 300 || m.x > dragX + 60), 'Gauntlets DURCHSCHLAG: the punch carries the foe along, then the impulse launches it while the Wizard stops dead');
  m = sprintAt('katana', 360); step(14); const passHp = m.hp; step(20);
  assert(P.x > m.x && m.hp < passHp, 'Katana IAI-DURCHZUG: a draw-cut dash THROUGH the foe, the cut lands a moment later');
  m = sprintAt('rune_greatsword', 620); step(45);
  assert(P.lastSprintAttack === 'RUNENSICHEL' && m.hp < 3000, 'Greatsword RUNENSICHEL: a giant crescent wave carries the impulse far down the lane (320 px)');
  m = sprintAt('scythe', 420); step(30);
  assert(m.hp < 3000, 'Scythe ERNTEKREIS: the wide sweep drags the foe in and reaps it');
  // Sprint jump + down: the weapon's own dive.
  spells.clearRuntime(); game.minions = []; P.equipClassWeapon('great_hammer'); P.x = 300; P.facing = 1; P.elevation = 100; P.grounded = false; P.isSprintJump = true; P.sprintDive = null; P.state = 'idle'; P.canAttack = true; P.lastWeaponDive = null;
  P.executeAttack(neutral, 'dive');
  assert(P.lastWeaponDive === 'HAMMERFALL' && P.vx > 0, 'Sprint jump + down with a class weapon: the weapon dive (HAMMERFALL), slanted forward');
  P.equipClassWeapon(null); P.elevation = 0; P.grounded = true; P.isSprintJump = false; P.state = 'idle'; spells.clearRuntime(); game.minions = []; dummy.homeX = dummy.x = 512;
}

// The user's pixel characters (21 Oct 2026): Thesen switches to its cape-and-spear sprite in the
// Focus transformation; Xame's two images are its idle animation.
{
  const { sprites } = await import('./public/src/sprites.js');
  const P = game.player; const keep = { hero: P.heroKey, focus: P.focusTransformTimer, a: sprites.sprites.thesen, b: sprites.sprites.thesen_focus };
  assert(sprites.heroDefs.thesen?.prepared && sprites.heroDefs.thesen_focus?.prepared && sprites.heroDefs.xame?.prepared?.length === 2, 'Thesen (base + focus variant) and Xame (two idle frames) are hero sprites');
  sprites.sprites.thesen = sprites.sprites.thesen ?? { canvas: {} }; sprites.sprites.thesen_focus = sprites.sprites.thesen_focus ?? { canvas: {} };
  P.heroKey = 'thesen'; P.focusTransformTimer = 0; const plain = P.renderKey; P.focusTransformTimer = 2; const focus = P.renderKey;
  assert(plain === 'thesen' && focus === 'thesen_focus', 'Thesen: the Focus transformation shows the cape-and-spear sprite (v2), otherwise the base (v1)');
  const f0 = { canvas: 'v1', width: 1, height: 1 }; const f1 = { canvas: 'v2', width: 1, height: 1 };
  const xame = { canvas: 'v1', frames: { idle: [f0, f1] }, hold: { idle: 28 } };
  assert(sprites.resolveFrame(xame, 'idle', 0, 0).canvas === 'v1' && sprites.resolveFrame(xame, 'idle', .5, 0).canvas === 'v2' && sprites.resolveFrame(xame, 'idle', 1, 0).canvas === 'v1', 'Xame: v1 and v2 alternate as a calm idle animation (about half a second each)');
  P.heroKey = keep.hero; P.focusTransformTimer = keep.focus; sprites.sprites.thesen = keep.a; sprites.sprites.thesen_focus = keep.b;
}

// Breathing styles for every element (user, 21 Oct 2026): every charged direction, the sprint
// attack and the air dive are moves of the style; charge down awakens the spreading mark;
// a second breathing derives a new style.
{
  const BR = await import('./public/src/breathing.js'); const core = await import('./public/src/signature_core.js'); const { Minion } = await import('./public/src/entities.js'); const { environment } = await import('./public/src/environment.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy; dummy.homeX = dummy.x = 1600;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const step = (n) => { for (let i = 0; i < n; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); } };
  const ready = () => { P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true; P.elevation = 0; P.vElevation = 0; P.invulnerableTimer = 0; P.sprintStrike = null; };
  const setup = (id, style = null) => {
    spells.clearRuntime(); game.minions = []; if (P.signature) core.endStance(P, 'replaced'); P.equipClassWeapon(null); P.equipWeapon(null);
    P.x = 300; P.z = .5; P.facing = 1; P.hp = P.maxHp; ready(); game.battlefield.placeOnSurface(P);
    spells.cast(P, spells.resolveSpell([{ id: 'sig_' + id }]), game);
    if (style) P.signature.style = style;
  };
  const foeAt = (x, z = .5) => { const m = new Minion(x, z, 'red', 'melee', 0); m.maxHp = m.hp = 3000; m.passive = true; game.battlefield.placeOnSurface(m); game.minions.push(m); return m; };
  const charged = (dir) => { ready(); P.beginCharge(dir); P.chargeTimer = P.chargeMaxTime * .1; P.chargeDir = dir; return P.releaseCharge(); };
  let bad = 0; const strict = new Proxy({}, { get: (t, k) => (k === 'arc' || k === 'ellipse') ? (x, y, r1, r2) => { if (r1 < 0 || (k === 'ellipse' && r2 < 0)) bad++; } : k === 'canvas' ? undefined : k === 'measureText' ? () => ({ width: 10 }) : () => {}, set: () => true });
  const renderAll = () => { for (const sp of spells.activeSpells) sp.render?.(strict); core.SIGNATURES && P.signature?.impl.stance.render?.(strict, P, P.signature, P.y, 'front'); };
  assert(Object.keys(BR.BREATH_STYLES).length === 18 && Object.keys(BR.BREATH_RUNES).length === 13 && ['ventus', 'terra', 'natura', 'lux', 'umbra', 'void', 'bestia', 'construct', 'ward'].length === 9, 'Every element has its breathing rune (12 base styles)');
  const broken = [];
  const styles = Object.keys(BR.BREATH_STYLES);
  for (const style of styles) {
    const id = Object.entries(BR.BREATH_RUNES).find(([, v]) => v === style)?.[0] ?? 'S40';
    for (const move of ['forward', 'up', 'sprint', 'dive']) {
      setup(id, style); const m = foeAt(move === 'up' ? 360 : 400); if (move === 'dive') { m.x = 300; }
      try {
        if (move === 'forward' || move === 'up') charged(move);
        else if (move === 'sprint') { P.sprintActive = true; P.vx = 320; P.startSprintAttack(); }
        else { P.elevation = 90; P.grounded = false; P.executeAttack(neutral, 'dive'); }
        step(130); renderAll();
        if (m.hp >= 3000) broken.push(style + ':' + move);
      } catch (err) { broken.push(style + ':' + move + ' ' + err.message); }
    }
  }
  assert(!broken.length && !bad, 'All 18 breathing styles: charge forward / up, sprint attack and air dive each hit and render cleanly ' + broken.slice(0, 6).join(' | '));
  // Wind sprint: spin into a whirlwind, then burst forward — foes fly away in depth too.
  setup('S75'); const w = foeAt(420, .52); const z0 = w.z; let windHits = 0; const wOrig = w.takeDamage.bind(w); w.takeDamage = (...args) => { windHits++; return wOrig(...args); };
  P.sprintActive = true; P.vx = 320; P.executeAttack(neutral, 'normal'); const hidden = P.tornadoT > 0; step(60);
  assert(P.lastSprintAttack === 'DOPPELTORNADO' && hidden && windHits >= 3 && Math.abs(w.z - z0) > .01 && !(P.tornadoT > 0), 'Wind sprint DOPPELTORNADO (real sprint + attack input): the Wizard becomes a horizontal twin tornado, drills through the foe several times and throws it away in depth too (' + windHits + ' hits)');
  // Fire sprint: a trail of fire behind, the cut foe bursts into flames after you are through.
  setup('S41'); const fz = foeAt(380); P.sprintActive = true; P.vx = 320; P.startSprintAttack(); step(10); const passHp = fz.hp; step(20);
  assert(P.x > fz.x && fz.hp < passHp && STATUS.hasStatus(fz, 'burn') && environment.effects.some((e) => e.type === 'scorch'), 'Fire sprint GLUTSCHNITT: through the foe, a fire trail behind — the cut foe bursts into flames');
  // Charge down: the mark awakens (damage / speed up, blade hot) and spreads to allies nearby.
  setup('S40'); const ally = new Minion(330, .5, 'blue', 'melee', 0); game.battlefield.placeOnSurface(ally); game.minions.push(ally); const allySpeed = ally.speed;
  ready(); assert(!P.weapon && !P.classWeapon && P.beginCharge('down', 'touch'), 'In a breathing the charge-down works with bare hands too'); P.chargeTimer = P.chargeMaxTime * .1; P.releaseCharge();
  assert(P.signature.mark && P.signature.impl.stance.meleeMult(P, P.signature) > 1 && P.signature.impl.stance.moveMult(P, P.signature) > 1 && ally.breathMark && ally.speed > allySpeed, 'Charge down: MAL ERWACHT — stronger and faster, and the mark spreads to the ally next to you');
  const hpMark = P.hp; step(60); assert(P.hp < hpMark, 'The mark burns a little HP (the racing heart)');
  // Combos: a second breathing derives a new style along the family tree.
  setup('S40'); spells.cast(P, spells.resolveSpell([{ id: 'sig_S81' }]), game);
  const serpent = P.signature?.style; setup('S41'); spells.cast(P, spells.resolveSpell([{ id: 'sig_S77' }]), game); const love = P.signature?.style;
  setup('S77'); spells.cast(P, spells.resolveSpell([{ id: 'sig_S79' }]), game); const insect = P.signature?.style; setup('S42'); spells.cast(P, spells.resolveSpell([{ id: 'sig_S82' }]), game); const sound = P.signature?.style;
  setup('S40'); P.signature.timer = 1.2; spells.cast(P, spells.resolveSpell([{ id: 'sig_S41' }]), game); const steam = P.signature?.style;
  assert(P.signature.timer > 14, 'A combo starts its timer from the beginning (cast the second breathing just before the first runs out for the most time)');
  setup('S40'); spells.cast(P, spells.resolveSpell([{ id: 'sig_S78' }]), game); const plain = P.signature?.style;
  assert(serpent === 'serpent' && love === 'love' && insect === 'insect' && sound === 'sound' && steam === 'steam' && plain === 'sun', 'Breathing combos: water + beast = serpent, flame + flower = love, flower + moon = insect, thunder + forge = sound, water + flame = steam (unrelated pairs just switch)');
  // A combo always costs both runes: each breathing binds its own mana when it is drawn.
  { const { runeManaCost } = await import('./public/src/spell_catalog.js'); assert(runeManaCost('sig_S40') > 0 && runeManaCost('sig_S41') > 0, 'A combo costs the mana of both breathing runes (each is drawn and paid on its own)'); }
  // Combo traits: what only a derived breathing can do.
  const traitHit = (style, id, n = 1) => { setup(id, style); const m = foeAt(360); for (let i = 0; i < n; i++) { ready(); P.executeAttack(neutral, 'normal'); step(18); } return m; };
  { const m = traitHit('steam', 'S40'); STATUS.applyStatus(m, 'wet'); assert(STATUS.hasStatus(m, 'burn') && STATUS.hasStatus(m, 'wet'), 'Steam trait VERBRÜHEN: the burn survives water and the foe is wet too (lightning follow-ups → SCHOCK)'); }
  { setup('S40', 'serpent'); const a1 = foeAt(360); const a2 = foeAt(420); ready(); P.executeAttack(neutral, 'normal'); step(150); assert(STATUS.hasStatus(a1, 'poison') && STATUS.hasStatus(a2, 'poison'), 'Serpent trait KRIECHENDES GIFT: the poison jumps to the foe nearby'); }
  { const m = traitHit('love', 'S41', 3); assert(m.slowTimer > 0, 'Love trait BEZAUBERN: struck foes slow down, every third hit charms'); }
  { setup('S77', 'insect'); const m = foeAt(360); STATUS.applyStatus(m, 'poison', { force: true }); const before = m.statuses.poison.dur; ready(); P.executeAttack(neutral, 'normal'); step(18); assert(m.statuses.poison.dur > before, 'Insect trait GIFTSTAPEL: a sting on a poisoned foe adds to the venom'); }
  { setup('S42', 'sound'); const m = foeAt(360); const n2 = foeAt(400); for (let i = 0; i < 4; i++) { ready(); P.executeAttack(neutral, 'normal'); step(18); } assert(n2.hp < 3000 && m._resonance === 0, 'Sound trait RESONANZ: every fourth hit on a foe rings out as a blast around it'); }
  // The Sun is the origin: it hits harder than the Flame (and costs more).
  { setup('S41'); const f1 = foeAt(400); charged('forward'); step(60); const flameDmg = 3000 - f1.hp;
    setup('S78'); const s1 = foeAt(400); charged('forward'); step(60); const sunDmg = 3000 - s1.hp;
    const { runeManaCost } = await import('./public/src/spell_catalog.js');
    assert(sunDmg > flameDmg * 1.3 && runeManaCost('sig_S78') > runeManaCost('sig_S41'), 'Sun breathing is the strongest (origin of all styles) and costs more mana (' + sunDmg + ' vs ' + flameDmg + ')'); }
  // Ward: still sea — every hit is turned away for a moment.
  setup('S83'); charged('forward'); const hpCalm = P.hp; P.invulnerableTimer = 0; P.takeDamage(30, -100, 0, .2, false, 'melee');
  assert(P.hp === hpCalm, 'Ward breathing STILLE SEE: in total calm every hit is turned away');
  // With a weapon the breathing overrides the weapon moves (user, 21 Oct 2026).
  const moveOf = (weapon, field, act) => {
    setup('S41'); if (field) { P.equipClassWeapon(null); P.equipWeapon(weapon); } else P.equipClassWeapon(weapon); foeAt(400); P.lastBreathMove = null; P.lastWeaponDive = null; P.weaponBuff = null;
    if (act === 'sprint') { P.sprintActive = true; P.vx = 320; P.executeAttack(neutral, 'normal'); }
    else if (act === 'dive') { P.elevation = 90; P.grounded = false; P.isSprintJump = true; P.executeAttack(neutral, 'dive'); }
    else charged(act);
    return P.lastBreathMove;
  };
  const results = {
    classSprint: moveOf('katana', false, 'sprint'), classUp: moveOf('bow', false, 'up'), classDown: moveOf('sword_shield', false, 'down'),
    classForward: moveOf('great_hammer', false, 'forward'), classDive: moveOf('great_hammer', false, 'dive'), fieldSprint: moveOf('great_axe', true, 'sprint')
  };
  const fieldKept = P.weapon === 'great_axe';
  assert(results.classSprint === 'GLUTSCHNITT' && results.classUp === 'STEIGENDE GLUT' && results.classForward === 'FLAMMENSCHLANGE' && results.classDive === 'FALLENDES FEUER' && P.lastWeaponDive == null,
    'With a class weapon the breathing overrides the weapon moves (sprint, charge up / forward, dive) ' + JSON.stringify(results));
  assert(results.fieldSprint === 'GLUTSCHNITT' && fieldKept, 'A picked-up field weapon is not thrown in a breathing: the sprint attack is the breathing move');
  setup('S41'); P.equipClassWeapon('sword_shield'); P.weaponBuff = null; charged('down');
  assert(P.signature.mark && !P.weaponBuff, 'Charge down with a weapon awakens the mark (not the weapon buff)');
  // The weapon delivers the breathing move in its style — same effect (bow: a piercing fire shot, the archer stays).
  const WD = await import('./public/src/breathing_weapons.js');
  assert(WD.deliveryOf({ classWeapon: 'bow' }).projectile === 'arrow' && WD.deliveryOf({ classWeapon: 'katana' }).kind === 'iai' && WD.deliveryOf({ classWeapon: 'great_hammer' }).kind === 'heavy' && WD.deliveryOf({ classWeapon: 'harp' }).kind === 'caster' && WD.deliveryOf({}).kind === 'none', 'Weapon delivery kinds: bow = arrow shot, katana = iai, hammer = heavy, harp = caster, bare hands = none');
  setup('S41'); P.equipClassWeapon('bow'); const shotFoe = foeAt(470); const xBow = P.x; P.sprintActive = true; P.vx = 320; P.executeAttack(neutral, 'normal'); step(10); const shotHp = shotFoe.hp; step(25);
  assert(Math.abs(P.x - xBow) < 30 && shotFoe.hp < 3000 && shotFoe.hp < shotHp && STATUS.hasStatus(shotFoe, 'burn'), 'Bow + fire sprint: the archer stays, a piercing fire shot covers the lane — the foe still bursts into flames');
  setup('S41'); P.equipClassWeapon('bow'); const dragonFoe = foeAt(560); charged('forward'); step(60); renderAll();
  assert(dragonFoe.hp < 3000 && STATUS.hasStatus(dragonFoe, 'burn') && !bad, 'Bow + flame forward: the fire dragon flies as the tail of a fire arrow — same burn and reach');
  // Every move kind is delivered in the weapon's style (bow: arrow rain from above on charge up / dive, volleys, a carrying shot …).
  setup('S41'); P.equipClassWeapon('bow'); const rainFoe = foeAt(520); charged('up');
  const above = Math.abs(P.x - rainFoe.x) < 40 && P.elevation > 100; step(70);
  assert(above && rainFoe.hp < 3000, 'Bow + charge up: the archer appears high above the foe and rains fire arrows down (no launcher from a bow)');
  const weaponBroken = [];
  for (const weapon of ['bow', 'great_hammer', 'harp', 'gauntlets', 'spear', 'katana']) for (const style of styles) for (const move of weapon === 'bow' ? ['forward', 'up', 'sprint', 'dive'] : ['up', 'sprint', 'dive']) {
    const id = Object.entries(BR.BREATH_RUNES).find(([, v]) => v === style)?.[0] ?? 'S40';
    setup(id, style); P.equipClassWeapon(weapon); const m = foeAt(move === 'up' ? 380 : 420); if (move === 'dive') m.x = 330;
    try {
      if (move === 'forward' || move === 'up') charged(move);
      else if (move === 'sprint') { P.sprintActive = true; P.vx = 320; P.executeAttack(neutral, 'normal'); }
      else { P.elevation = 90; P.grounded = false; P.executeAttack(neutral, 'dive'); }
      step(130); renderAll();
      if (m.hp >= 3000) weaponBroken.push(weapon + ':' + style + ':' + move);
    } catch (err) { weaponBroken.push(weapon + ':' + style + ':' + move + ' ' + err.message); }
  }
  assert(!weaponBroken.length && !bad, 'Every breathing move hits and renders cleanly with every weapon style (bow, hammer, harp, fists, spear, katana) ' + weaponBroken.slice(0, 6).join(' | '));
  P.equipWeapon(null); P.equipClassWeapon(null);
  if (P.signature) core.endStance(P, 'replaced'); spells.clearRuntime(); game.minions = []; ready(); dummy.homeX = dummy.x = 512;
}

// Guard per weapon, class choice, own rises / crashes, the Sun's light, infusions breathe, the ray crown (21 Oct 2026).
{
  const WG = await import('./public/src/weapon_guard.js'); const BR = await import('./public/src/breathing.js'); const core = await import('./public/src/signature_core.js'); const { Minion } = await import('./public/src/entities.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch(); game.selectTrainingMap('waterfalls');
  const P = game.player; const dummy = game.trainingDummy; dummy.homeX = dummy.x = 1600;
  const neutral = { keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false };
  const step = (n) => { for (let i = 0; i < n; i++) { P.update(1 / 60, neutral, game.battlefield, game); spells.update(1 / 60, game); } };
  const ready = () => { P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.grounded = true; P.elevation = 0; P.vElevation = 0; P.invulnerableTimer = 0; };
  const foeAt = (x, z = .5) => { const m = new Minion(x, z, 'red', 'melee', 0); m.maxHp = m.hp = 3000; game.battlefield.placeOnSurface(m); game.minions.push(m); return m; };
  const setup = (id, style = null) => { spells.clearRuntime(); game.minions = []; if (P.signature) core.endStance(P, 'replaced'); P.equipWeapon(null); P.equipClassWeapon(null); P.x = 300; P.z = .5; P.facing = 1; P.hp = P.maxHp; ready(); game.battlefield.placeOnSurface(P); if (id) spells.cast(P, spells.resolveSpell([{ id: 'sig_' + id }]), game); if (style) P.signature.style = style; };
  const charged = (dir) => { ready(); P.beginCharge(dir); P.chargeTimer = P.chargeMaxTime * .1; P.chargeDir = dir; return P.releaseCharge(); };
  let bad = 0; const strict = new Proxy({}, { get: (tt, k) => (k === 'arc' || k === 'ellipse') ? (x, y, r1, r2) => { if (r1 < 0 || (k === 'ellipse' && r2 < 0)) bad++; } : k === 'canvas' ? undefined : k === 'measureText' ? () => ({ width: 10 }) : () => {}, set: () => true });
  // Guard per weapon.
  const kinds = ['sword_shield', 'katana', 'dual_swords', 'great_hammer', 'spear', 'bow', 'harp', 'gauntlets', null].map((w) => { P.equipClassWeapon(w); return WG.guardKindOf(P); });
  for (const w of ['sword_shield', 'katana', 'great_hammer', 'spear', 'bow', 'harp', 'gauntlets', null]) { P.equipClassWeapon(w); WG.drawWeaponGuard(strict, P, P.x, P.y, 1, true, .5); WG.drawWeaponGuard(strict, P, P.x, P.y, -1, false, 1.2); }
  assert(kinds.join() === 'shield,sheath,blade,heavy,pole,bow,barrier,fist,arcane' && !bad, 'Guard per weapon: shield, katana sheath block, crossed blade, haft bar, spinning shaft, bow brace, rune barrier, crossed fists, bare hands (all render)');
  P.equipClassWeapon('great_hammer'); ready(); P.isGuarding = true; P.render(strict); assert(P.lastGuardKind === 'heavy', 'The Wizard draws the guard of the weapon he holds'); P.isGuarding = false; P.equipClassWeapon(null);
  // Class choice (technical; the hub UI follows).
  const opts = game.classOptions();
  assert(opts.length >= 35 && !opts.some((o) => o.id === 'ice_sword') && game.setClassWeapon('katana') && game.profile.classWeapon === 'katana' && P.classWeapon === 'katana' && game.classOptions().find((o) => o.id === 'katana').selected && !game.setClassWeapon('no_such_weapon'), 'Class choice API: options (name, family, weapon level, Bankai state), choosing saves and equips, unknown weapons are refused');
  game.setClassWeapon(null);
  // Every style rises its own way.
  setup('S40'); const xw = P.x; foeAt(400); charged('up'); step(25); assert(P.x > xw + 40, 'Water WASSERRAD: the rise rolls forward as a water wheel');
  setup('S83'); const behind = foeAt(240); charged('up'); step(30); assert(behind.hp < 3000, 'Ward SCHATTENPFLAUME: the guard dome turns out all around (also hits behind)');
  setup('S80'); const mistFoe = foeAt(360); let mistHits = 0; const mo = mistFoe.takeDamage.bind(mistFoe); mistFoe.takeDamage = (...a) => { mistHits++; return mo(...a); }; charged('up'); step(30); assert(mistHits >= 3, 'Mist MONDNEBEL: a somersault with three cuts');
  // Crash extras.
  setup('S79'); const side = foeAt(300, .78); P.elevation = 90; P.grounded = false; P.executeAttack(neutral, 'dive'); step(50); assert(side.hp < 3000, 'Moon NEUMOND: crescents fly out in every direction on landing');
  setup('S81'); const wild = foeAt(330); P.elevation = 160; P.grounded = false; let wildHits = 0; const wo = wild.takeDamage.bind(wild); wild.takeDamage = (...a) => { wildHits++; return wo(...a); }; P.executeAttack(neutral, 'dive'); step(50); assert(wildHits >= 2, 'Beast WILDES ZERREISSEN: it cuts all around while still falling');
  // The Sun's light blinds.
  setup('S78'); const sunFoe = foeAt(380); P.sprintActive = true; P.vx = 320; P.executeAttack(neutral, 'normal'); step(8); assert(sunFoe.freezeTimer > 0 || STATUS.hasStatus(sunFoe, 'burn'), 'Sun SONNENSPUR: the light blinds (and burns)');
  // The ray crown: Sun breathing and light spells.
  setup('S78'); assert(spells.activeSpells.some((s) => s.constructor.name === 'RayCrownFx'), 'Sun breathing raises the golden ray crown');
  setup(null); spells.cast(P, spells.resolveSpell([{ id: 'lux' }]), game); assert(spells.activeSpells.some((s) => s.constructor.name === 'RayCrownFx'), 'Light (Lux) spells raise the golden ray crown');
  for (const sp of spells.activeSpells) sp.render?.(strict); assert(!bad, 'The ray crown renders cleanly');
  // Infusion: the blade breathes.
  setup(null); spells.cast(P, spells.resolveSpell([{ id: 'construct' }, { id: 'ignis' }]), game);
  assert(P.weaponInfusion?.element === 'fire' && P.signature?.style === 'flame' && P.signature.timer <= 8.01, 'Konstrukt + Ignis: the flame blade also breathes — a short flame breathing (8 s)');
  if (P.signature) core.endStance(P, 'replaced'); P.weaponInfusion = null; spells.clearRuntime(); game.minions = []; dummy.homeX = dummy.x = 512;
}

// Pixel heroes (Thesen, Xame) are drawn crisp: no smoothing, scale snapped to whole screen pixels.
{
  const { sprites } = await import('./public/src/sprites.js');
  const frame = { canvas: {}, width: 82, height: 123, anchorX: 41, anchorY: 121 };
  sprites.sprites.__pixelTest = { ...frame, pixel: true, procFull: true };
  sprites.sprites.__smoothTest = { ...frame };
  const draw = (key, zoom) => { const log = { scale: [] }; const ctx = { getTransform: () => ({ a: zoom }), save() {}, restore() {}, translate() {}, rotate() {}, drawImage() {}, scale(x, y) { log.scale.push(y); }, set imageSmoothingEnabled(v) { log.smooth = v; }, get imageSmoothingEnabled() { return log.smooth; } }; sprites.renderEntity(ctx, key, 0, 0, { state: 'land', procScaleY: 1, procScaleX: 1 }); return log; };
  const px = draw('__pixelTest', 1.25); const sm = draw('__smoothTest', 1.25); const tiny = draw('__pixelTest', .5);
  assert(px.smooth === false && Math.abs(px.scale[0] * 1.25 - 1) < 1e-9 && sm.smooth === true && tiny.smooth === true, 'Pixel heroes are drawn crisp (no smoothing, snapped to one screen pixel per art pixel); smooth sprites and strong downscales keep smoothing');
  delete sprites.sprites.__pixelTest; delete sprites.sprites.__smoothTest;
}

// The body moves with the weapon (character animation per weapon, 21 Oct 2026).
{
  const WB = await import('./public/src/weapon_body.js'); const W = await import('./public/src/weapons.js');
  const at = (weapon, motion, prog, facing = 1) => WB.weaponBodyPose({ weapon, facing, state: 'attack1', stateTimer: .3 * (1 - prog), _weaponSwingTime: .3, _weaponMotion: motion, grounded: true, animTime: 0 });
  const raise = at('great_hammer', 'slam', .25); const crash = at('great_hammer', 'slam', .5);
  assert(raise.rot < 0 && raise.oy < 0 && crash.oy > 0 && crash.sy < 1, 'Hammer: the body rises with the weapon raised, then crashes down into a crouch');
  const drawn = at('bow', 'draw', .45); const drawnL = at('bow', 'draw', .45, -1);
  assert(drawn.rot < 0 && drawn.ox < 0 && drawnL.rot > 0 && drawnL.ox > 0, 'Bow: the archer leans back into the draw (mirrored when facing left)');
  assert(at('spear', 'lunge', .45).ox > 10 && at('spear', 'lunge', .1).ox <= 0, 'Spear: a step back, then the lunge carries the body forward');
  const crouch = at('katana', 'iaido', .1); const dash = at('katana', 'iaido', .3);
  assert(crouch.oy > 3 && crouch.sy < 1 && dash.ox > 10, 'Katana: crouch low, then dash through the iai draw');
  const signs = new Set([.05, .3, .5, .7, .95].map((k) => Math.sign(at('great_axe', 'whirl', k).sx)));
  assert(signs.has(1) && signs.has(-1), 'Whirl: the body turns once with the weapon');
  assert(at('gauntlets', 'upper', .4).oy < -6, 'Fists: the uppercut rises');
  assert(WB.weaponBodyPose({ facing: 1, state: 'attack1', stateTimer: .2, grounded: true }) === null, 'Bare hands keep the default motion');
  const idleH = WB.weaponBodyPose({ weapon: 'great_hammer', facing: 1, state: 'idle', grounded: true, animTime: 0 }); const runH = WB.weaponBodyPose({ weapon: 'great_hammer', facing: 1, state: 'run', grounded: true, animTime: .3 });
  const idleB = WB.weaponBodyPose({ weapon: 'bow', facing: 1, state: 'idle', grounded: true, animTime: 0 });
  assert(idleH.rot > 0 && idleH.sy < 1 && runH.cadence < 1 && idleB.rot < 0, 'Stances: heavy weapons hunch and run heavier, the archer stands back');
  // Every weapon, every motion it uses: finite, sane poses.
  let insane = [];
  for (const id of Object.keys(W.WEAPONS)) for (const kind of ['normal', 'heavy', 'uppercut']) for (let st = 1; st <= 4; st++) { const mo = W.weaponMotion(id, kind, st); for (let k = 0; k <= 1.001; k += .1) { const b = at(id, mo, k); if (![b.rot, b.ox, b.oy, b.sx, b.sy].every(Number.isFinite) || Math.abs(b.rot) > 40 || Math.abs(b.ox) > 30 || Math.abs(b.sx) > 1.3 || b.sy < .7 || b.sy > 1.3) insane.push(id + ':' + mo); } }
  assert(!insane.length, 'Every weapon motion gives a sane body pose' + (insane.length ? ' (' + [...new Set(insane)].slice(0, 6).join(',') + ')' : ''));
  // The player's render really uses it.
  const { sprites } = await import('./public/src/sprites.js');
  game.returnToHub(); game.setMatchMode('training'); game.startMatch();
  const P = game.player; P.equipWeapon(null); P.equipClassWeapon('great_hammer'); P.isGuarding = false; P.hitFlash = 0;
  P.state = 'attack1'; P._weaponMotion = 'slam'; P._weaponSwingTime = .3; P.stateTimer = .3 * .75;
  const orig = sprites.renderEntity; let seen = null; sprites.renderEntity = function (ctx, key, x, y, opt) { if (key === P.renderKey && !seen) seen = opt; return orig.call(this, ctx, key, x, y, opt); };
  const strictB = new Proxy({}, { get: (tt, k) => k === 'canvas' ? undefined : k === 'measureText' ? () => ({ width: 10 }) : () => {}, set: () => true });
  try { P.render(strictB); } finally { sprites.renderEntity = orig; }
  assert(seen && seen.procRot < 0 && seen.procOffsetY < 0, 'The sprite of the Wizard leans back with the hammer raised');
  P.equipClassWeapon(null); P.state = 'idle'; P.stateTimer = 0;
}

const frameCallback = nextFrame;
frameCallback(game.lastFrameTime + 16);
game.debugVisible = true;
game.render();
assert(typeof nextFrame === 'function', 'Complete 2.5D update/render frame schedules a successor');
game.running = false;
console.log(`\nRuntime results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
