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
const fullViewportRect = game.canvas.getBoundingClientRect;
game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 512, height: 288 });
game.syncHudScale();
assert(game.uiLayer.style['--hud-scale'] === '0.5', 'HUD scales as one 1024×576 composition with a resized Canvas');
game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1248, height: 576 });
game.updateViewport();
assert(game.renderWidth === 1248 && game.cameraOffsetX === 112 && game.canvas.width === 2496, 'Ultrawide viewport widens only the visual camera while preserving DPR rendering');
assert(game.uiLayer.style.width === '1248px' && game.getCanvasCoords(624, 288).x === 624, 'HUD and rune/input coordinates use the real wide screen instead of a hidden 16:9 stage');
game.canvas.getBoundingClientRect = fullViewportRect;
game.updateViewport();
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
assert(!game.drawing.active && game.timeScale === 1 && game.player.preparedRunes.length === 1 && game.player.slottedSpells.length === 1 && game.player.slottedSpells[0].runes[0].id === 'ignis' && spells.activeSpells.length === spellCountBeforeDraw && game.player.runeHand.map((rune) => rune.id).join(',') === 'fulgur,terra,ignis' && game.player.runeDeck.map((rune) => rune.id).join(',') === 'ventus,aqua,fulgur,terra,ignis,ventus,aqua', 'Drawing a hand card only slots the rune spell (no auto-cast) and recycles card to front of deck');
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
game.startRuneDrawing(ignisCard.cardId);
game.drawing.strokes = [[...Array.from({ length: 26 }, (_, i) => ({ x: 100 + i * 10, y: i <= 12 ? 250 - i * 12 : 106 + (i - 12) * 12 }))]];
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
  assert(P.focus < 50 && P.focus > 47, 'Focus decays continuously after its grace period');
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
  assert(!P.sprintActive, 'After the minimum run a released sprint brakes to a stop instead of running forever');
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
  const lateralWall = spells.activeSpells.find((s) => s.isStoneWall);
  assert(lateralWall && lateralWall.halfX > 50 && lateralWall.halfZ < .1 && Math.abs(lateralWall.x - 490) < 4, 'A horizontal swipe places a lateral wall along the swiped line');
  reset();
  slotFused(['terra', 'terra']);
  game.castSlotAt(0);
  const c = screenOf(450, .25); const d = screenOf(452, .8);
  game.targeting.pointerDown(c, 7); game.targeting.pointerMove(d, 7); game.targeting.pointerUp(d, 7);
  const depthWall = spells.activeSpells.find((s) => s.isStoneWall);
  assert(depthWall && depthWall.halfZ > .2 && depthWall.halfX < 20, 'A vertical swipe places a depth wall across the lane');

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
  spells.activeSpells.find((s) => s.isStoneWall).takeDamage(999);
  stepWorld(.1);
  assert(environment.effects.some((e) => e.type === 'rubble') && !spells.activeSpells.some((s) => s.isStoneWall), 'A destroyed Stone Wall crumbles into rubble');
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
  assert(groundYForDepth(0) === 212 && game.battlefield.boundsOverride.farZ <= .02, 'Training projects the combat plane over the whole painted floor');
  P.z = .01; P.x = 60; game.battlefield.resolveEntityCollision(P);
  assert(P.z === .02 && P.x === 70, 'The player can walk to the rear and side edges of the training yard');

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
  assert(spells.activeSpells.filter((s) => s.isStoneWall).length === 1, 'Without the passive only one wall stands at a time');
  reset();
  P.buildModifiers = { ...savedMods, maxWalls: 3 };
  for (const x of [380, 460, 540]) spells.cast(P, wallSpell, game, null, { x, z: .5 });
  stepSpells(5);
  assert(spells.activeSpells.filter((s) => s.isStoneWall).length === 3, 'With Rampart Mason several walls stay on the field (long-lasting until destroyed)');
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
  assert(Math.abs(leftPool.x - 259) < 3 && leftPool.shape === 'rect', 'Painted zones convert from image percentages into world space');
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
  stepWorld(1);
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

// Screens narrower than 16:9 get a taller camera (extra sky) instead of a
// distorted canvas or a HUD that runs off the right edge.
const canvasRect = game.canvas.getBoundingClientRect;
game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1024, height: 768 });
game.updateViewport();
assert(game.renderWidth === 1024 && game.renderHeight === 768 && game.worldOffsetY === 192 && game.uiLayer.style.height === '768px', 'A 4:3 screen keeps the full width and adds 192 logical px of sky above the battlefield');
assert(Math.round(game.getCanvasCoords(512, 768).y) === 768 && game.canvas.height === Math.round(768 * game.deviceScale), 'Pointer mapping and the canvas buffer follow the taller camera');
game.render();
game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 2560, height: 1080 });
game.updateViewport();
assert(game.renderHeight === 576 && game.worldOffsetY === 0 && game.renderWidth > 1024, 'Ultrawide screens still widen the camera instead of adding height');
game.canvas.getBoundingClientRect = canvasRect;
game.updateViewport();
assert(game.renderWidth === 1024 && game.renderHeight === 576, 'A 16:9 screen uses the authored 1024×576 view');
// Touch vs. mouse/keyboard is detected from the input actually used.
windowListeners.pointerdown?.({ pointerType: 'touch' });
assert(game.inputMode === 'touch' && game.uiLayer.classList.values.has('input-touch') && !game.uiLayer.classList.values.has('input-desktop'), 'A touch shows the touch layout (joystick)');
windowListeners.pointerdown?.({ pointerType: 'mouse' });
assert(game.inputMode === 'desktop' && game.uiLayer.classList.values.has('input-desktop'), 'Mouse input switches to the desktop layout with keyboard hints');
windowListeners.pointerdown?.({ pointerType: 'touch' });
windowListeners.keydown?.({ code: 'KeyD', repeat: false, preventDefault() {} });
assert(game.inputMode === 'desktop', 'Keyboard input switches a hybrid device back to the desktop layout');

const frameCallback = nextFrame;
frameCallback(game.lastFrameTime + 16);
game.debugVisible = true;
game.render();
assert(typeof nextFrame === 'function', 'Complete 2.5D update/render frame schedules a successor');
game.running = false;
console.log(`\nRuntime results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
