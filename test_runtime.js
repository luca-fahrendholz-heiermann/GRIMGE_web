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
game.player.state = 'attack1'; game.player.stateTimer = .08; game.player.canAttack = false;
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
const selectedSpellCount = spells.activeSpells.length;
const manaBeforeSlotCast = game.player.mp;
assert(game.castSlotAt(0) && game.player.slottedSpells.length === 1 && game.slotAt(1)?.runes[0].id === 'aqua' && spells.activeSpells.length === selectedSpellCount + 1, 'Tapping a slot fires exactly that spell and leaves the other slots in place');
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
  assert(P.state === 'dash' && P.backdashTimer > 0 && P.facing === 1, 'A fast flick against the facing direction triggers one backdash and keeps facing stable');
  touch.clear(ev(190, 398));
  P.backdashTimer = 0; P.state = 'idle';
  assert(!P.triggerBackdash({ source: 'touch' }), 'Touch backdash has a short cooldown');
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
  for (let t = 0; t < .7; t += 1 / 60) P.update(1 / 60, neutral, game.battlefield, game);
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
  const spikes = spells.activeSpells.find((s) => Number.isFinite(spells.spellDepth(s)));
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
  for (let i = 0; i < 20; i++) P.update(1 / 60, neutralInput, game.battlefield, game);
  assert(Math.abs(Math.abs(P.x - dashFrom) - 36) < 4, `The backdash covers 1.5 u (${Math.abs(P.x - dashFrom).toFixed(1)} px) over 15 ticks`);
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
  assert(P.executeAttack(neutral, 'normal') && P.lastSprintAttack === 'SPRINT ATTACK' && P.classWeapon === 'katana' && thrownCount() === before, 'The class weapon is never thrown: sprint + attack stays the Sprint Attack');
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
  assert(ids.length === 17 && ids[0] === 'B01' && ids[1] === 'B02' && ids.includes('T40') && ids.includes('A01') && ids.includes('A02'), 'The 17 curated Arcane States are registered (B01, B02, 13 atlas forms, A01 Göttlicher Riese, A02 Mystischer Affe)');
  const tForms = ids.filter((id) => /^[TA]/.test(id));
  assert(tForms.every((id) => ['forward', 'up', 'down'].every((d) => FORM_MOVESETS[id]?.[d]?.short?.make && FORM_MOVESETS[id][d].full?.make) && FORM_SPRINT_ATTACKS[id]?.name), 'Every T / A form has six charged techniques and its own sprint attack');
  assert(FORM_MOVESETS.T13.forward.short.name === 'THREAD NEEDLE' && FORM_MOVESETS.T13.forward.full.name === 'HUNDRED FILAMENTS' && FORM_SPRINT_ATTACKS.T13.name === 'SILK STRIKE', 'Technique names come straight from the atlas (T13 Fadenschlag)');
  assert(FORM_MOVESETS.ninefold.forward.short.name === 'VERDICHTETER RISSKERN' && FORM_MOVESETS.ninefold.forward.full.name === 'RISSSTRAHL' && FORM_MOVESETS.eidolon.up.full.name === 'LICHTSPALTER', 'B01 Risswild / B02 Arkengestell carry the atlas technique names');
  assert(ids.every((id) => { const r = recognizer.runes.find((x) => x.id === 'buff_' + id); const d = SPELL_DEFINITIONS['buff_' + id]; return r?.isBuffForm && r.tags.includes('max-1-per-deck') && d?.isBuffForm && d.tags.includes('arcane-state') && isSpecialRune('buff_' + id); }), 'Each form is an Arcane State special rune tagged "arcane-state · max-1-per-deck", never fusable');
  // Deck rule: at most one buff rune.
  const profile = new MageProfile(); profile.level = 20;
  profile.matchDeck = ['ignis', 'ventus', 'fulgur', 'terra', 'aqua', 'ignis', 'ventus', 'fulgur'];
  assert(profile.addRuneToDeck('buff_T13').ok, 'A buff rune can join the deck');
  const second = profile.addRuneToDeck('buff_B01');
  assert(!second.ok && /ONE ARCANE STATE/.test(second.reason), 'A second buff rune is refused (one per deck)');
  assert(profile.sanitizeDeck(['ignis', 'buff_T13', 'buff_T08', 'aqua']).filter((id) => id.startsWith('buff_')).length === 1, 'Loading a deck keeps only one buff rune');
  assert(BUFF_RUNE_IDS.length === 17, 'All 17 Arcane State runes are offered in the deck builder');
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
  const { MageProfile, buffUnlockLevel, runeUnlockLabel } = await import('./public/src/progression.js');
  const fresh = new MageProfile(); fresh.level = 1;
  assert(!fresh.isRuneUnlocked('buff_B01') && buffUnlockLevel('buff_B01') === 3 && buffUnlockLevel('buff_T02') === 4 && buffUnlockLevel('buff_T40') === 7 && runeUnlockLabel('buff_T40') === 'MAGE LV.7', 'Arcane State runes unlock with the Mage level (B01/B02 at 3, the rest in groups of four up to 7)');
  fresh.level = 3;
  assert(fresh.isRuneUnlocked('buff_B02') && !fresh.isRuneUnlocked('buff_T02'), 'At level 3 the first two buff runes are available');
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
  assert(ids.length === 36 && ids.every((id) => core.signatureImpl(id)?.cast) && sigMod.SIGNATURE_RUNE_IDS.every((id) => isSpecialRune(id) && runeManaCost(id) >= 28 && runeManaCost(id) <= 46), 'All 36 signature specials are special runes with their own mechanic and bound mana');
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
    assert(P.lastHoldAction === 'PULL' && before - P.mp === HOLD_MANA.pull && Math.abs(dummy.x - (P.x + 46)) < 12, 'Arcane State HOLD: the pull drags the foe in front of the Wizard (5 mana)');
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
  for (const id of ['A01', 'A02']) for (const [dir, variant] of slots) {
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
  assert(!broken.length && !missed.length, 'All twelve A01 / A02 techniques run, render and hit a foe in front ' + [...broken, ...missed].slice(0, 3).join(' | '));
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
  assert(new Set(impacts).size === impacts.length && impacts.length === 15, 'Every Arcane State (besides the B01 / B02 engines) has its own sprint impact');
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

const frameCallback = nextFrame;
frameCallback(game.lastFrameTime + 16);
game.debugVisible = true;
game.render();
assert(typeof nextFrame === 'function', 'Complete 2.5D update/render frame schedules a successor');
game.running = false;
console.log(`\nRuntime results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
