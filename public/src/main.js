// GRIMGE Prototype — Main Game Loop & Coordinator (Mockup Framing & High-Precision Touch/Mouse)
import { audio } from './audio.js';
import { sprites } from './sprites.js';
import { recognizer } from './recognizer.js';
import { combat } from './combat.js';
import { spells, RUNE_GRADE_PROFILES } from './spells.js';
import { Player, EnemyChampion, Minion, TrainingDummy } from './entities.js';
import { Battlefield } from './battlefield.js';
import { ui } from './ui.js';
import { VIEWPORT, ARENA_LAYOUT, ENTITY_VISUALS, groundDistance, groundYForDepth } from './world.js';
import { ART_ASSETS } from './art_assets.js';
import { MageProfile, MAGE_SKILL_TREE, applyMageProfile, DEFAULT_MATCH_DECK, MATCH_DECK_SIZE, MAX_RUNE_COPIES, ALL_RUNE_IDS, deckAccepts } from './progression.js';
import { getGameMode, DEBUG_BUILD } from './game_modes.js';
import { runeManaCost, isSpecialRune, TARGETING } from './spell_catalog.js';
import { SpellTargeting, SlotChord, needsTarget } from './targeting.js';
import { GamepadController } from './gamepad.js';
import { environment, renderProp } from './environment.js';
import { TRAINING_MAPS, getTrainingMap, zoneToWorld } from './training_maps.js';
import { loadFxSprites } from './fx_sprites.js';
import { renderPixelated } from './abilities.js';
import { sky } from './sky.js';
import { renderGroundShadows } from './shadows.js';
import { renderRuneGuide } from './rune_guides.js';
import { castleBlocksAt, castleGateDoor, castleDeckEntry, castleDeckHeight } from './castles.js';
import { WeaponArmory, WEAPONS } from './weapons.js';
import { SiegeMatch } from './siege_match.js';
import { segmentStatus } from './castle_segments.js';
import { PrimalCompanion, normalizePrimalChoice, startPrimalBond, endPrimalBond, bondForm, PRIMAL_ARCHETYPES } from './primals.js';

// LF2-style Dungeon rooms. Each room is a wide scrolling stretch: the camera
// follows the player, enemy groups enter from the right screen edge once the
// player advances past their trigger, and the player may walk back freely
// (e.g. to free a prisoner). The right exit opens only after the room is
// cleared; walking through it locks the previous room behind the player.
// Index = dungeon stage; the stage-0 scout shares room 1.
const DUNGEON_LEFT_EDGE = 104;
const DUNGEON_ROOMS = Object.freeze([
  null,
  Object.freeze({ width: 2200, encounters: [{ at: 0, count: 2 }, { at: 800, count: 2 }] }),
  Object.freeze({ width: 2400, encounters: [{ at: 0, count: 2 }, { at: 750, count: 2 }, { at: 1450, count: 2 }], rescueAt: 1150 }),
  Object.freeze({ width: 2400, encounters: [{ at: 0, count: 2 }, { at: 750, count: 3 }, { at: 1450, count: 3 }], elite: true }),
  Object.freeze({ width: 1400, boss: true })
]);

function dungeonRoomBounds(stage) {
  const index = Math.max(1, Math.min(DUNGEON_ROOMS.length - 1, stage));
  let left = DUNGEON_LEFT_EDGE;
  for (let i = 1; i < index; i++) left += DUNGEON_ROOMS[i].width;
  return { left, right: left + DUNGEON_ROOMS[index].width };
}

export class GameWorld {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.sprites = sprites;
    // Profile is deliberately independent from a Match: rematches rebuild
    // combat state while rune mastery and unlocked Mage nodes persist locally.
    this.profile = new MageProfile();

    this.runeCanvas = document.getElementById('rune-canvas');
    this.runeCtx = this.runeCanvas.getContext('2d');
    this.uiLayer = document.getElementById('ui-layer');
    // Training field weapons and weapon crates.
    this.armory = new WeaponArmory();
    // One fixed 16:9 stage on every device; the container is the screen.
    this.container = document.getElementById('game-container');
    // Soft, dark ambient copy of the scene that fills the letterbox bars.
    this.backdropCanvas = document.getElementById('stage-backdrop');
    this.backdropCtx = this.backdropCanvas?.getContext?.('2d') ?? null;
    this.backdropFrame = 0;
    this.stage = { left: 0, top: 0, width: 1024, height: 576, scale: 1 };
    this.hud = { left: 0, top: 0, width: 1024, height: 576, scale: 1 };
    // Screen option: 'fit' shows the identical 16:9 stage with soft bars,
    // 'fill' zooms wide screens to full width (a little sky / foreground cut).
    let savedFit = null;
    try { savedFit = globalThis.localStorage?.getItem?.('grimge-screen-fit'); } catch { /* storage may be disabled */ }
    this.screenFit = savedFit === 'fill' ? 'fill' : 'fit';
    this.screenSize = { width: 1024, height: 576 };

    this.logicalWidth = VIEWPORT.width;
    this.logicalHeight = VIEWPORT.height;
    // Simulation coordinates deliberately remain the authored 1024×576
    // battlefield. Rendering receives a wider *camera* on ultrawide screens;
    // this never changes spawns, ranges, collision, or travel distance.
    this.renderWidth = this.logicalWidth;
    this.cameraOffsetX = 0;
    // Displays narrower than 16:9 (iPad 4:3, 5:4 monitors) get the same
    // treatment vertically: a taller camera that only adds sky above the
    // authored battlefield. The world is drawn `worldOffsetY` lower, so the
    // ground, actors and bottom controls sit identically on every screen.
    this.renderHeight = this.logicalHeight;
    this.worldOffsetY = 0;
    this.inputMode = null;
    // Training keeps its own decks (player + sparring partner) so quick
    // experiments never change the persistent profile Grimoire.
    this.trainingDecks = null;
    this.deckEditTarget = null;
    // Selected Training map (persisted).
    let savedMap = null;
    try { savedMap = globalThis.localStorage?.getItem?.('grimge-training-map'); } catch { /* optional */ }
    this.trainingMapId = getTrainingMap(savedMap).id;
    // One targeting model for touch, mouse/keyboard and gamepad.
    this.targeting = new SpellTargeting(this);
    this.gamepad = new GamepadController(this);
    // Keyboard slot keys Z / X / C: tap casts, hold two or three to fuse.
    this.keySlotChord = new SlotChord((position) => this.castSlotAt(position), (positions) => this.fuseSlots(positions));
    this.deviceScale = Math.min(2, window.devicePixelRatio || 1);
    this.configureCanvas(this.canvas, this.ctx);
    this.configureCanvas(this.runeCanvas, this.runeCtx);

    this.battlefield = new Battlefield();
    this.player = new Player(ARENA_LAYOUT.spawns.blueCastle.x, ARENA_LAYOUT.spawns.blueCastle.z);
    this.enemyChampion = new EnemyChampion(ARENA_LAYOUT.spawns.redCastle.x, ARENA_LAYOUT.spawns.redCastle.z, 'warlord');
    this.battlefield.placeOnSurface(this.player);
    this.battlefield.placeOnSurface(this.enemyChampion);

    this.minions = [];
    this.projectiles = [];
    this.matchState = 'Menu';
    this.objectivePhase = 'LanePhase';
    // Compatibility alias retained for the existing objective/debug callers.
    this.matchPhase = this.objectivePhase;
    this.winnerTeam = null;
    this.endingTimer = 0;
    this.matchDuration = 402;
    this.matchTime = this.matchDuration;
    this.stats = null;
    this.attachBattlefieldCallbacks();
    this.blueCrystals = 2;
    this.redCrystals = 1;

    // Input state
    this.input = {
      keys: {},
      justPressedKeys: {},
      mouse: { x: 0, y: 0, isDown: false, rightDown: false },
      justPressedMouse: {},
      gameplayBlocked: false,
      guardHeld: false,
      move: { x: 0, z: 0 },
      touchMove: { x: 0, z: 0 },
      padMove: { x: 0, z: 0 },
      justPressed: (code) => {
        if (code === 'Mouse0') return !!this.input.justPressedMouse[0];
        if (code === 'Mouse2') return !!this.input.justPressedMouse[2];
        return !!this.input.justPressedKeys[code];
      }
    };

    // Rune Drawing State
    this.drawing = {
      active: false,
      strokes: [],
      currentStroke: [],
      lastPointTime: 0,
      lastStrokeTime: 0,
      autoLockArmed: false,
      lastRecognitionCheck: 0,
      // A rune gesture owns exactly one touch. This prevents the movement
      // thumb from becoming the rune stroke when the player uses two thumbs.
      touchId: null,
      inputMode: null
    };

    this.timeScale = 1.0;
    this.targetTimeScale = 1.0;
    this.debugVisible = false;
    // Portrait is presentation/input state, not match state: a siege resumes
    // exactly where it was after the device rotates back to landscape.
    this.orientationBlocked = false;
    this.menuPaused = false;
    this.mountCandidate = null;

    this.lastFrameTime = performance.now();
    this.running = false;
  }

  configureCanvas(canvas, context) {
    canvas.width = Math.round(this.renderWidth * this.deviceScale);
    canvas.height = Math.round(this.renderHeight * this.deviceScale);
    context.setTransform?.(this.deviceScale, 0, 0, this.deviceScale, 0, 0);
    context.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in context) context.imageSmoothingQuality = 'high';
  }

  clearRuneCanvas() {
    this.runeCtx.save();
    this.runeCtx.setTransform?.(1, 0, 0, 1, 0, 0);
    this.runeCtx.clearRect(0, 0, this.runeCanvas.width, this.runeCanvas.height);
    this.runeCtx.restore();
  }

  syncHudScale() {
    const hud = this.hud ?? this.stage;
    if (hud?.height > 0 && this.uiLayer) {
      // FIT: the HUD is part of the 16:9 stage (same layout everywhere).
      // FILL: the stage is cropped, so the HUD covers the visible screen.
      const scale = String(hud.scale);
      this.uiLayer.style.left = `${hud.left}px`;
      this.uiLayer.style.top = `${hud.top}px`;
      // Custom CSS properties must be written through setProperty in a real
      // CSSStyleDeclaration. Bracket assignment happened to work in the test
      // stub but is ignored by browsers, leaving a 1024px HUD over a scaled
      // Canvas.
      if (this.uiLayer.style.setProperty) this.uiLayer.style.setProperty('--hud-scale', scale);
      else this.uiLayer.style['--hud-scale'] = scale;
      this.uiLayer.style.width = `${hud.width}px`;
      this.uiLayer.style.height = `${hud.height}px`;
      const lw = String(hud.width / 100);
      if (this.uiLayer.style.setProperty) this.uiLayer.style.setProperty('--lw', `${lw}px`);
      else this.uiLayer.style['--lw'] = `${lw}px`;

      // `env(safe-area-inset-*)` values are physical CSS pixels. The HUD is
      // transformed from a fixed 1024×576 logical surface, so convert the
      // insets before using them for individual controls. The arena/canvas
      // itself deliberately remains edge-to-edge.
      const probe = document.getElementById?.('safe-area-probe');
      const computed = probe && globalThis.getComputedStyle?.(probe);
      // Insets are measured from the screen edge; the letterbox bars already
      // keep part (or all) of a notch / Home Indicator off the stage.
      const toLogical = (value, bar = 0) => Math.max(0, ((Number.parseFloat(value) || 0) - bar) / Number(scale));
      const box = { left: hud.left, top: hud.top, width: hud.width * hud.scale, height: hud.height * hud.scale };
      const bars = {
        top: Math.max(0, box.top), left: Math.max(0, box.left),
        right: Math.max(0, this.screenSize.width - box.left - box.width),
        bottom: Math.max(0, this.screenSize.height - box.top - box.height)
      };
      const safe = {
        top: toLogical(computed?.paddingTop, bars.top),
        right: toLogical(computed?.paddingRight, bars.right),
        bottom: toLogical(computed?.paddingBottom, bars.bottom),
        left: toLogical(computed?.paddingLeft, bars.left)
      };
      // Some iOS standalone launches expose the Home Indicator inset a paint
      // late. Reserve its small physical clearance immediately for installed
      // iPhone/iPad apps, then let the real env() value take precedence.
      const nav = globalThis.navigator;
      const isIOS = /iPad|iPhone|iPod/.test(nav?.userAgent || '')
        || (nav?.platform === 'MacIntel' && (nav?.maxTouchPoints || 0) > 1);
      const isStandalone = globalThis.matchMedia?.('(display-mode: standalone)')?.matches || nav?.standalone === true;
      if (isIOS && isStandalone) safe.bottom = Math.max(safe.bottom, toLogical('22px', bars.bottom));
      for (const [edge, value] of Object.entries(safe)) {
        this.uiLayer.style.setProperty?.(`--safe-${edge}`, `${value}px`);
      }
      this.uiLayer.classList?.toggle?.('has-safe-area', Object.values(safe).some(value => value > .5));
    }
  }

  updateViewport() {
    const rect = this.container?.getBoundingClientRect?.() ?? {};
    const width = rect.width || globalThis.innerWidth || this.logicalWidth;
    const height = rect.height || globalThis.innerHeight || this.logicalHeight;
    if (width <= 0 || height <= 0) return;
    this.screenSize = { width, height };

    // One identical 16:9 stage on PC, tablet and phone: scene, camera and HUD
    // are the same everywhere and scale uniformly to fit the screen. Spare
    // room becomes letterbox / pillarbox bars filled by a soft ambient copy
    // of the scene (never stretched, never repeated edge strips).
    // FILL (option) zooms screens wider than 16:9 to the full width and
    // crops a little sky / foreground; narrower screens always fit, so the
    // castles at the field edges are never cut off.
    const wider = width / height > this.logicalWidth / this.logicalHeight;
    const filling = this.screenFit === 'fill' && wider;
    const fit = filling ? width / this.logicalWidth : Math.min(width / this.logicalWidth, height / this.logicalHeight);
    const stageW = Math.round(this.logicalWidth * fit);
    const stageH = Math.round(this.logicalHeight * fit);
    const stageTop = filling ? -Math.round((stageH - height) * .55) : Math.round((height - stageH) / 2);
    this.stage = { left: Math.round((width - stageW) / 2), top: stageTop, width: stageW, height: stageH, scale: fit };
    this.hud = filling
      ? { left: 0, top: 0, width: Math.round(width / fit), height: Math.round(height / fit), scale: fit }
      : { left: this.stage.left, top: this.stage.top, width: this.logicalWidth, height: this.logicalHeight, scale: fit };
    for (const element of [this.canvas, this.runeCanvas]) {
      if (!element?.style) continue;
      element.style.left = `${this.stage.left}px`;
      element.style.top = `${this.stage.top}px`;
      element.style.width = `${stageW}px`;
      element.style.height = `${stageH}px`;
    }
    // The backing buffer matches the physical pixels of the stage (crisp on
    // high-DPI phones, capped for performance on 4K screens).
    const dpr = globalThis.window?.devicePixelRatio || globalThis.devicePixelRatio || 1;
    const nextDeviceScale = Math.max(1, Math.min(2.5, Math.round(fit * dpr * 100) / 100));
    const changed = this.renderWidth !== this.logicalWidth || this.renderHeight !== this.logicalHeight || nextDeviceScale !== this.deviceScale;
    this.renderWidth = this.logicalWidth;
    this.renderHeight = this.logicalHeight;
    this.worldOffsetY = 0;
    this.cameraOffsetX = 0;
    this.deviceScale = nextDeviceScale;
    if (changed || this.canvas.width !== Math.round(this.renderWidth * this.deviceScale)) {
      this.configureCanvas(this.canvas, this.ctx);
      this.configureCanvas(this.runeCanvas, this.runeCtx);
      this.clearRuneCanvas();
    }
    this.syncHudScale();
  }

  setScreenFit(mode) {
    this.screenFit = mode === 'fill' ? 'fill' : 'fit';
    try { globalThis.localStorage?.setItem?.('grimge-screen-fit', this.screenFit); } catch { /* optional */ }
    this.updateViewport();
    return this.screenFit;
  }

  // Canvas (stage) coordinates → HUD coordinates (they differ in FILL).
  canvasToHud(pt) {
    const hud = this.hud ?? this.stage;
    return { x: pt.x + (this.stage.left - hud.left) / hud.scale, y: pt.y + (this.stage.top - hud.top) / hud.scale };
  }

  // Ambient fill for the bars: a tiny copy of the stage, blurred by CSS.
  updateStageBackdrop() {
    if (!this.backdropCtx || (this.backdropFrame++ % 6)) return;
    const { width, height } = this.backdropCanvas;
    this.backdropCtx.drawImage?.(this.canvas, 0, 0, width, height);
  }

  async init() {
    this.setupInputs();
    this.updateViewport();
    this.syncOrientationState();
    // The first script turn can run before the final responsive layout has
    // settled. Re-read the Canvas rectangle on the next paint as well.
    requestAnimationFrame(() => { this.updateViewport(); this.syncOrientationState(); });
    const syncViewport = () => { this.updateViewport(); this.syncOrientationState(); };
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    window.visualViewport?.addEventListener?.('resize', syncViewport);

    // Load character sprites
    await Promise.all([sprites.loadAll(), loadFxSprites()]);

    window.gameWorld = this;
    // Castle Siege runs the Unity platform ↔ lane match rules (siege_match.js).
    this.siegeDeployRules = true;
    ui.syncScreenFitLabel(this.screenFit);
    this.resetMatch();
    this.matchState = 'Menu';
    // A mode changes only match rules. It never forks input, combat or spell
    // code into a separate minigame implementation.
    this.matchMode = 'siege';
    this.activeMode = getGameMode(this.matchMode);
    this.modeState = null;
    ui.showHub(true);

    this.running = true;
    requestAnimationFrame((t) => this.loop(t));
    console.log('⚔️ GRIMGE Game Loop running with a 1024×576 combat field and adaptive camera.');
  }

  getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.renderWidth / rect.width;
    const scaleY = this.renderHeight / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  // Touch vs. mouse/keyboard is detected automatically and follows the input
  // actually used, so hybrid devices (touch laptops, tablets with keyboards)
  // switch on the fly. Touch shows the joystick; desktop hides it and shows
  // keyboard hints on the action buttons instead.
  detectInputMode() {
    const media = (query) => !!globalThis.matchMedia?.(query)?.matches;
    const touchFirst = media('(pointer: coarse)') || (!media('(pointer: fine)') && (globalThis.navigator?.maxTouchPoints || 0) > 0);
    this.setInputMode(touchFirst ? 'touch' : 'desktop');
  }

  setInputMode(mode) {
    if (mode === this.inputMode) return;
    this.inputMode = mode;
    this.uiLayer?.classList?.toggle?.('input-touch', mode === 'touch');
    this.uiLayer?.classList?.toggle?.('input-desktop', mode === 'desktop');
    this.uiLayer?.classList?.toggle?.('input-gamepad', mode === 'gamepad');
  }

  setupInputs() {
    this.detectInputMode();
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') this.setInputMode('touch');
      else if (e.pointerType === 'mouse') this.setInputMode('desktop');
    }, { capture: true, passive: true });
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.setInputMode('desktop');
      if (this.matchState === 'Results') {
        if (e.code === 'Enter') this.startMatch();
        if (e.code === 'Escape') this.returnToHub();
        return;
      }
      if (this.matchState === 'Menu') {
        if (e.code === 'Enter' || e.code === 'Space') this.startMatch();
        return;
      }
      // Esc closes the training map picker first (and resumes the training).
      if (e.code === 'Escape' && ui.trainingMapsOpen) {
        ui.toggleTrainingMaps?.(false);
        e.preventDefault();
        return;
      }
      // Esc closes the training deck editor first (and resumes the training).
      if (e.code === 'Escape' && this.deckEditTarget) {
        ui.toggleDeckBuilder?.(false);
        e.preventDefault();
        return;
      }
      if (e.code === 'Escape' && this.targeting.isActive) {
        this.targeting.cancel();
        e.preventDefault();
        return;
      }
      if (e.code === 'Escape' && this.isMatchRunning()) {
        ui.toggleIngameMenu?.(!this.menuPaused);
        e.preventDefault();
        return;
      }
      if (this.orientationBlocked) {
        e.preventDefault();
        return;
      }
      if (!this.input.keys[e.code]) {
        this.input.justPressedKeys[e.code] = true;
      }
      this.input.keys[e.code] = true;
      audio.ensureContext();

      // Hero Swapping (Keys 1-0)
      if (e.code === 'Digit1') { this.player.setHero('paladin'); ui.updateActiveHeroBtn('paladin'); }
      if (e.code === 'Digit2') { this.player.setHero('berserker'); ui.updateActiveHeroBtn('berserker'); }
      if (e.code === 'Digit3') { this.player.setHero('mage'); ui.updateActiveHeroBtn('mage'); }
      if (e.code === 'Digit4') { this.player.setHero('warlord'); ui.updateActiveHeroBtn('warlord'); }
      if (e.code === 'Digit5') { this.player.setHero('fighter'); ui.updateActiveHeroBtn('fighter'); }
      if (e.code === 'Digit6') { this.player.setHero('darklord'); ui.updateActiveHeroBtn('darklord'); }
      if (e.code === 'Digit7') { this.player.setHero('nyx'); ui.updateActiveHeroBtn('nyx'); }
      if (e.code === 'Digit8') { this.player.setHero('deep'); ui.updateActiveHeroBtn('deep'); }
      if (e.code === 'Digit9') { this.player.setHero('firen'); ui.updateActiveHeroBtn('firen'); }
      if (e.code === 'Digit0') { this.player.setHero('freeze'); ui.updateActiveHeroBtn('freeze'); }

      // Cast Spell (E) — confirms an open targeting at the cursor.
      if (e.code === 'KeyE') this.castPreparedSpell();
      // Spell slots Z / X / C (chord = fusion).
      const slotKey = { KeyZ: 0, KeyX: 1, KeyC: 2 }[e.code];
      if (slotKey !== undefined && !e.repeat) this.keySlotChord.press(slotKey);

      // K (hold): charge the heavy attack — in a body form the beast bomb /
      // spirit bow. Releasing K lets it fly.
      if (e.code === 'KeyK' && !e.repeat && this.isMatchRunning() && !this.drawing.active) {
        // Direction of the charged attack: K + W = up, K + S = down.
        const keys = this.input.keys;
        const dir = keys.KeyW || keys.ArrowUp ? 'up' : keys.KeyS || keys.ArrowDown ? 'down' : 'forward';
        this.player?.beginCharge(dir);
      }

      // Earned Focus is a match-only transformation resource. It deliberately
      // stays off the rune deck so a full meter remains a fast tactical choice.
      if (e.code === 'KeyT') this.activateFocusTransformation();

      // Training: P toggles the sparring partner.
      if (e.code === 'KeyP') this.toggleSparringPartner();
      // Castle Siege: G deploys from the castle onto the lane.
      if (e.code === 'KeyG') this.requestDeploy();
      // Training: M switches minion waves, N the lane towers.
      if (e.code === 'KeyM') this.toggleTrainingMinions();
      if (e.code === 'KeyV' && this.activeMode?.id === 'training' && this.isMatchRunning()) this.cycleClassWeapon();
      if (e.code === 'KeyB' && this.activeMode?.id === 'training' && this.isMatchRunning()) this.cyclePrimal();
      if (e.code === 'KeyN') this.toggleTrainingTowers();
      // Training: O switches the present partner between active and passive.
      if (e.code === 'KeyO') this.toggleSparringPassive();

      // Own Wolves and Golems can be ridden. Mounting is deliberately a
      // proximity action, not another spell slot: R toggles on/off.
      if (e.code === 'KeyR') this.toggleMount();

      // Clear selected spell components (Q). It does not delete or cycle
      // cards from the rune hand.
      if (e.code === 'KeyQ') {
        this.player.clearPreparedRunes();
        audio.playRuneFail();
      }

      // The no-time-limit drawing mode always has an explicit cancel path.
      if (e.code === 'Escape' && this.drawing.active) {
        this.cancelRuneDrawing();
        return;
      }

      // Toggle Grimoire (H)
      if (e.code === 'KeyH') ui.toggleGrimoire();

      if (e.code === 'F3') {
        e.preventDefault();
        this.debugVisible = !this.debugVisible;
        this.showAnnouncement(this.debugVisible ? 'ARENA DEBUG ON' : 'ARENA DEBUG OFF', 1.2);
      }

      if (e.code === 'Space') e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
      if (e.code === 'KeyK' && this.player?.chargeTimer > 0) this.player.releaseCharge();
      const slotKey = { KeyZ: 0, KeyX: 1, KeyC: 2 }[e.code];
      if (slotKey !== undefined) this.keySlotChord.release(slotKey);
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
    // A canvas game owns double taps and long presses. Without these guards
    // mobile browsers may treat the controls as a webpage to zoom or save.
    document.addEventListener?.('dblclick', (e) => e.preventDefault(), { passive: false });
    document.addEventListener?.('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener?.('dragstart', (e) => e.preventDefault(), { passive: false });

    this.canvas.addEventListener('mousedown', (e) => {
      audio.ensureContext();
      const pt = this.getCanvasCoords(e.clientX, e.clientY);
      this.input.mouse.x = pt.x;
      this.input.mouse.y = pt.y;

      if (e.button === 0 && this.tryTransformByTap(pt)) return;
      // Targeting owns the mouse: LMB confirms / drags a wall, RMB cancels.
      if (this.targeting.isActive && !this.drawing.active) {
        if (e.button === 0) this.targeting.pointerDown(pt, 'mouse');
        else if (e.button === 2) { e.preventDefault(); this.targeting.cancel(); }
        return;
      }
      if (e.button === 0) {
        this.input.mouse.isDown = true;
        if (this.drawing.active) {
          this.addRunePoint(pt.x, pt.y);
        } else {
          this.input.justPressedMouse[0] = true;
        }
      } else if (e.button === 2) {
        e.preventDefault();
        this.input.mouse.rightDown = true;
        this.startRuneDrawing();
      }
    });

    window.addEventListener('mousemove', (e) => {
      const pt = this.getCanvasCoords(e.clientX, e.clientY);
      this.input.mouse.x = pt.x;
      this.input.mouse.y = pt.y;
      this.input.mouse.hasMoved = true;

      if (this.drawing.active && (this.input.mouse.isDown || this.input.mouse.rightDown)) {
        this.addRunePoint(pt.x, pt.y);
      }
      if (this.targeting.isActive && this.inputMode !== 'touch') this.targeting.pointerMove(pt, 'mouse');
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0 && this.targeting.active?.pointerId === 'mouse') {
        this.targeting.pointerUp(this.getCanvasCoords(e.clientX, e.clientY), 'mouse');
        return;
      }
      if (e.button === 0) {
        this.input.mouse.isDown = false;
        if (this.drawing.active && !this.input.mouse.rightDown) {
          this.completeRuneStroke();
        }
      } else if (e.button === 2) {
        this.input.mouse.rightDown = false;
        if (this.drawing.active) {
          this.completeRuneStroke();
        }
      }
    });

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      audio.ensureContext();
      // This is the fallback path after opening the rune mode with the
      // circle. Use changedTouches, rather than touches[0], so a left-thumb
      // joystick touch can never be mistaken for the drawing finger.
      const touch = e.changedTouches?.[0];
      if (touch && this.drawing.active && !this.drawing.inputMode) {
        this.drawing.touchId = touch.identifier;
        this.drawing.inputMode = 'touch';
        const pt = this.getCanvasCoords(touch.clientX, touch.clientY);
        this.input.mouse.x = pt.x;
        this.input.mouse.y = pt.y;
        this.addRunePoint(pt.x, pt.y);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!this.drawing.active || this.drawing.inputMode !== 'touch') return;
      e.preventDefault();
      const touch = Array.from(e.touches).find((candidate) => candidate.identifier === this.drawing.touchId);
      if (touch) {
        const pt = this.getCanvasCoords(touch.clientX, touch.clientY);
        this.input.mouse.x = pt.x;
        this.input.mouse.y = pt.y;
        this.addRunePoint(pt.x, pt.y);
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      const endedRuneTouch = this.drawing.inputMode === 'touch'
        && Array.from(e.changedTouches ?? []).some((touch) => touch.identifier === this.drawing.touchId);
      if (this.drawing.active && endedRuneTouch) {
        this.completeRuneStroke();
        // A non-recognized stroke leaves Arcane Focus open for another try.
        this.drawing.touchId = null;
        this.drawing.inputMode = null;
      }
    });

    this.setupTouchJoystick();
  }

  setupTouchJoystick() {
    const joystick = document.getElementById('touch-joystick');
    const knob = document.getElementById('touch-joystick-knob');
    if (!joystick || !knob) return;
    let pointerId = null;
    let attackPointerId = null;
    let attackStart = null;
    let attackStartTime = 0;
    let chargeArmed = false;
    // One record per left finger (concept doc §4.5.4): every touch starts as
    // PendingLeftGesture and is classified exactly once as JOYSTICK, BACKDASH
    // or SPRINT. A finger already classified as joystick is never
    // re-interpreted as a flick until it is released.
    let leftGesture = null;
    const JOYSTICK_RADIUS = 66;
    const FLICK_WINDOW_MS = 200;
    const FLICK_MIN_DISTANCE = 70;   // reference (logical) px
    const FLICK_MIN_SPEED = 700;     // reference px / s
    const FLICK_MAX_ANGLE = 25 * Math.PI / 180;
    const placeStick = (canvasPt) => {
      const pt = this.canvasToHud(canvasPt);
      const hud = this.hud ?? { width: this.renderWidth, height: this.renderHeight };
      joystick.style.left = `${Math.max(0, Math.min(hud.width - JOYSTICK_RADIUS * 2, pt.x - JOYSTICK_RADIUS))}px`;
      joystick.style.top = `${Math.max(0, Math.min(hud.height - JOYSTICK_RADIUS * 2, pt.y - JOYSTICK_RADIUS))}px`;
      joystick.style.bottom = 'auto';
    };
    const beginJoystick = (event, fromStickElement = false) => {
      if (event.pointerType && event.pointerType !== 'touch') return false;
      const pt = this.getCanvasCoords(event.clientX, event.clientY);
      // The whole left half belongs to movement; the right half remains a
      // combat gesture surface and is never stolen for movement.
      if (!fromStickElement && pt.x > this.renderWidth * 0.48) return false;
      if (this.drawing.active || !this.isMatchRunning() || pointerId !== null) return false;
      pointerId = event.pointerId;
      leftGesture = { start: pt, startTime: performance.now(), facing: this.player?.facing || 1, state: 'pending' };
      // Freeze facing until the gesture is classified, so provisional stick
      // input cannot turn the Wizard and flip the flick meaning.
      if (this.player) this.player.touchFacingLock = true;
      if (!fromStickElement) placeStick(pt);
      joystick.classList.add('is-active');
      (fromStickElement ? joystick : this.canvas).setPointerCapture?.(pointerId);
      update(event);
      return true;
    };
    const classifyFlick = (pt, now) => {
      const g = leftGesture;
      const dx = pt.x - g.start.x;
      const dy = pt.y - g.start.y;
      const elapsed = Math.max(1, now - g.startTime);
      const distance = Math.hypot(dx, dy);
      const isFlick = elapsed <= FLICK_WINDOW_MS
        && Math.abs(dx) >= FLICK_MIN_DISTANCE
        && Math.abs(dx) / elapsed * 1000 >= FLICK_MIN_SPEED
        && Math.atan2(Math.abs(dy), Math.abs(dx)) <= FLICK_MAX_ANGLE;
      if (isFlick) return Math.sign(dx) * g.facing > 0 ? 'sprint' : 'backdash';
      // Too slow, too long or not horizontal enough: this finger is a stick.
      if (elapsed > FLICK_WINDOW_MS || distance > FLICK_MIN_DISTANCE * 1.6) return 'joystick';
      return 'pending';
    };
    const settleLeftGesture = (kind, pt) => {
      const g = leftGesture;
      if (this.player) this.player.touchFacingLock = false;
      g.state = kind;
      if (!this.player?.isAlive) return;
      if (kind === 'sprint') {
        const dir = Math.sign(pt.x - g.start.x) || g.facing;
        if (this.player.startTouchSprint(dir)) {
          // Offset the virtual stick centre behind the finger, so the held
          // flick reads as a moderate forward steer, not a pinned stick.
          placeStick({ x: pt.x - dir * JOYSTICK_RADIUS * .6, y: pt.y });
        } else g.state = 'joystick';
      } else if (kind === 'backdash') {
        this.player.triggerBackdash({ source: 'touch' });
        // After the short dodge the same finger steers normally again.
        placeStick(pt);
        g.state = 'joystick';
      }
    };
    const update = (event) => {
      if (pointerId !== event.pointerId) return;
      if (leftGesture?.state === 'pending') {
        const pt = this.getCanvasCoords(event.clientX, event.clientY);
        const kind = classifyFlick(pt, performance.now());
        if (kind !== 'pending') settleLeftGesture(kind, pt);
      }
      const rect = joystick.getBoundingClientRect();
      const radius = rect.width * 0.5;
      let dx = event.clientX - (rect.left + radius);
      let dy = event.clientY - (rect.top + radius);
      const length = Math.hypot(dx, dy);
      if (length > radius) { dx = dx / length * radius; dy = dy / length * radius; }
      const deadzone = radius * 0.14;
      const normX = Math.abs(dx) < deadzone ? 0 : dx / radius;
      const normZ = Math.abs(dy) < deadzone ? 0 : dy / radius;
      this.input.touchMove.x = normX;
      this.input.touchMove.z = normZ;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const clear = (event) => {
      if (pointerId !== event.pointerId) return;
      const released = this.getCanvasCoords(event.clientX, event.clientY);
      // A very fast flick can be released before a move event classified it.
      if (leftGesture?.state === 'pending') {
        const kind = classifyFlick(released, performance.now());
        if (kind === 'sprint' || kind === 'backdash') settleLeftGesture(kind, released);
      }
      if (leftGesture?.state === 'sprint') this.player?.releaseTouchSprint?.();
      if (this.player) this.player.touchFacingLock = false;
      leftGesture = null;
      pointerId = null;
      this.input.touchMove.x = 0; this.input.touchMove.z = 0;
      knob.style.transform = 'translate(0, 0)';
      joystick.classList.remove('is-active');
      // The stick spawns under the thumb and returns to its resting spot.
      joystick.style.removeProperty?.('left');
      joystick.style.removeProperty?.('top');
      joystick.style.removeProperty?.('bottom');
    };
    const beginAttackGesture = (event) => {
      if (event.pointerType && event.pointerType !== 'touch') return;
      if (this.drawing.active || !this.isMatchRunning() || event.pointerId === pointerId) return;
      const pt = this.getCanvasCoords(event.clientX, event.clientY);
      if (pt.x < this.renderWidth * 0.48) return;
      attackPointerId = event.pointerId;
      attackStart = pt;
      attackStartTime = performance.now();
      chargeArmed = false;
      this.canvas.setPointerCapture?.(attackPointerId);
    };
    const finishAttackGesture = (event) => {
      if (attackPointerId !== event.pointerId || !attackStart) return;
      const end = this.getCanvasCoords(event.clientX, event.clientY);
      const dx = end.x - attackStart.x;
      const dy = end.y - attackStart.y;
      attackPointerId = null;
      attackStart = null;
      if (chargeArmed && this.player?.chargeTimer > 0) {
        chargeArmed = false;
        this.player.releaseCharge();
        return;
      }
      chargeArmed = false;
      this.performTouchAttackGesture(dx, dy);
    };

    // The fixed classic joystick remains a valid direct target while visible,
    // while the canvas itself creates it dynamically anywhere on the left.
    joystick.addEventListener('pointerdown', (event) => {
      if (beginJoystick(event, true)) event.preventDefault?.();
    });
    joystick.addEventListener('pointermove', update);
    joystick.addEventListener('pointerup', clear);
    joystick.addEventListener('pointercancel', clear);
    this.canvas.addEventListener('pointerdown', (event) => {
      // While a spell waits for its target, a new touch anywhere on the
      // battlefield aims it (an already held joystick finger keeps moving).
      if (event.pointerType === 'touch' && this.targeting.isActive && this.targeting.active.pointerId === null && !this.drawing.active) {
        this.targeting.pointerDown(this.getCanvasCoords(event.clientX, event.clientY), event.pointerId);
        this.canvas.setPointerCapture?.(event.pointerId);
        event.preventDefault?.();
        return;
      }
      if (event.pointerType === 'touch' && this.tryTransformByTap(this.getCanvasCoords(event.clientX, event.clientY))) {
        event.preventDefault?.();
        return;
      }
      if (beginJoystick(event)) {
        event.preventDefault?.();
        return;
      }
      beginAttackGesture(event);
    }, { passive: false });
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch' && this.targeting.active?.pointerId === event.pointerId) {
        this.targeting.pointerMove(this.getCanvasCoords(event.clientX, event.clientY), event.pointerId);
        return;
      }
      update(event);
      if (attackPointerId === event.pointerId && attackStart && !chargeArmed && this.player?.isAlive && !this.player.activeClash) {
        const pt = this.getCanvasCoords(event.clientX, event.clientY);
        const dx = pt.x - attackStart.x;
        const elapsed = performance.now() - attackStartTime;
        const facingDx = dx * this.player.facing;
        if (facingDx > 34 && Math.abs(dx) >= Math.abs(pt.y - attackStart.y) && elapsed > 180) {
          let dir = 'forward';
          if (pt.y - attackStart.y < -34) dir = 'up';
          else if (pt.y - attackStart.y > 34) dir = 'down';
          if (this.player.beginCharge(dir)) chargeArmed = true;
        }
      }
    }, { passive: false });
    window.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'touch' && this.targeting.active?.pointerId === event.pointerId) {
        this.targeting.pointerUp(this.getCanvasCoords(event.clientX, event.clientY), event.pointerId);
        return;
      }
      clear(event); finishAttackGesture(event);
    }, { passive: false });
    window.addEventListener('pointercancel', (event) => { clear(event); attackPointerId = null; attackStart = null; chargeArmed = false; }, { passive: false });
    // Exposed for headless tests of the left-half classifier.
    this.touchGestureDebug = { beginJoystick, update, clear, get leftGesture() { return leftGesture; } };
  }

  setSelectedHero(heroKey) {
    if (!sprites.sprites[heroKey]) return false;
    this.selectedHeroKey = heroKey;
    // The Hub is a loadout space: update its idle preview immediately, while
    // every new match reconstructs the selected hero cleanly below.
    if (this.matchState === 'Menu' && this.player) this.player.heroKey = heroKey;
    return true;
  }

  syncOrientationState() {
    const viewport = globalThis.window?.visualViewport;
    const width = Number(viewport?.width ?? globalThis.window?.innerWidth);
    const height = Number(viewport?.height ?? globalThis.window?.innerHeight);
    // Headless tests do not supply viewport dimensions; do not incorrectly
    // block their match flow.
    const isPortrait = Number.isFinite(width) && Number.isFinite(height) && height > width;
    const shouldBlock = this.matchState === 'Running' && isPortrait;
    if (shouldBlock === this.orientationBlocked) return;
    this.orientationBlocked = shouldBlock;
    document.body?.classList?.toggle?.('portrait-gameplay', shouldBlock);
    if (shouldBlock) this.clearGameplayInput();
  }

  clearGameplayInput() {
    this.input.keys = {};
    this.input.justPressedKeys = {};
    this.input.justPressedMouse = {};
    this.input.mouse.isDown = false;
    this.input.mouse.rightDown = false;
    this.input.move = { x: 0, z: 0 };
    this.input.touchMove = { x: 0, z: 0 };
    this.input.guardHeld = false;
    if (this.player) this.player.isGuarding = false;
  }

  performTouchAttackGesture(dx, dy) {
    if (!this.isMatchRunning() || !this.player?.isAlive || this.drawing.active) return false;
    // During a Beam Clash a right-side tap is the push / counter impulse.
    if (this.player.activeClash) return !!this.clashAction();
    // Gravity Lift hold: a swipe away from the facing side pulls the targets in.
    if (this.player.activeTelekinesis && dx * (this.player.facing || 1) < -34 && Math.abs(dx) >= Math.abs(dy)) return this.player.activeTelekinesis.release('pull');
    const threshold = 34;
    const distance = Math.hypot(dx, dy);
    let attackKind = 'normal';
    // Right-half up-swipe is an uppercut; a right-swipe is the compact heavy
    // lunge. In the air a down-swipe becomes the existing dive strike.
    const facingDx = dx * (this.player.facing || 1);
    if (!this.player.grounded && dy > threshold && Math.abs(dy) > Math.abs(dx)) attackKind = 'dive';
    else if (dy < -threshold && Math.abs(dy) > Math.abs(dx)) attackKind = 'uppercut';
    else if (facingDx > threshold && Math.abs(dx) >= Math.abs(dy)) attackKind = 'heavy';
    else if (distance > threshold) return false;
    return this.player.executeAttack(this.input, attackKind);
  }

  refreshMovement() {
    const keys = this.input.keys;
    const keyboard = {
      x: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
      z: (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0)
    };
    const pad = this.input.padMove ?? { x: 0, z: 0 };
    const x = keyboard.x || this.input.touchMove.x || pad.x;
    const z = keyboard.z || this.input.touchMove.z || pad.z;
    const magnitude = Math.hypot(x, z);
    this.input.move.x = magnitude > 1 ? x / magnitude : x;
    this.input.move.z = magnitude > 1 ? z / magnitude : z;
  }

  // Hand runes the player can currently pay for with FREE mana (mana that
  // is neither bound to a slot nor reserved by an open drawing).
  affordableHandRuneIds(extraBudget = 0) {
    const budget = this.player.freeMana + extraBudget;
    return this.player.runeHand.filter((card) => runeManaCost(card) <= budget).map((card) => card.id);
  }

  startRuneDrawing(expectedCardId = null) {
    if (!this.isMatchRunning() || this.drawing.active || !this.player.isAlive) return;
    // Siege: runes are drawn on the castle platform (casting works everywhere).
    if (this.siegeMatch && !this.siegeMatch.canPrepare('blue')) {
      this.showAnnouncement('DRAW RUNES ON YOUR CASTLE — CAST SLOTTED SPELLS HERE', 1.3); audio.playRuneFail(); return;
    }
    this.targeting.cancel();
    if (this.player.slottedSpells.length >= 3) {
      this.showAnnouncement('SPELL SLOTS FULL — CAST OR FUSE!'); audio.playRuneFail(); return;
    }
    // Mana is reserved when drawing starts and becomes bound to the slot on
    // success. A selected card must be affordable; free drawing (DRAW) is
    // limited to affordable hand runes by the recognizer.
    let reserved = 0;
    if (expectedCardId) {
      const card = this.player.runeHand.find((entry) => entry.cardId === expectedCardId);
      reserved = card ? runeManaCost(card) : 0;
      if (card && reserved > this.player.freeMana) {
        this.showAnnouncement('NOT ENOUGH FREE MANA'); audio.playRuneFail(); return;
      }
    } else if (this.player.runeHand.length && !this.affordableHandRuneIds().length) {
      this.showAnnouncement('NOT ENOUGH FREE MANA'); audio.playRuneFail(); return;
    }
    this.player.reservedMana = reserved;
    this.drawing.active = true;
    this.drawing.expectedCardId = expectedCardId;
    this.drawing.strokes = [];
    this.drawing.currentStroke = [];
    this.drawing.lastRecognitionCheck = 0;
    this.drawing.lastStrokeTime = 0;
    this.drawing.autoLockArmed = false;
    this.drawing.touchId = null;
    this.drawing.inputMode = null;
    this.targetTimeScale = 0.22;

    ui.setDrawingMode(true);
    audio.playRuneChime(392);
  }

  addRunePoint(canvasX, canvasY) {
    const now = performance.now();
    this.drawing.currentStroke.push({ x: canvasX, y: canvasY, t: now });
    this.drawing.autoLockArmed = false;

    combat.spawnElementalParticles(canvasX, canvasY, 'fulgur', 1);

    if (now - this.drawing.lastPointTime > 90) {
      this.drawing.lastPointTime = now;
      const freq = 440 + (canvasX % 300);
      audio.playRuneChime(freq);
    }

    // Deliberately no live recognition: simple gestures (especially VENTUS)
    // must not lock in while the player is still drawing a combination.
  }

  enterFullscreen() {
    const root = document.documentElement ?? document.getElementById('game-container');
    const request = root?.requestFullscreen ?? root?.webkitRequestFullscreen;
    if (!request) {
      this.showAnnouncement('FULLSCREEN NOT SUPPORTED BY THIS BROWSER');
      return;
    }
    Promise.resolve(request.call(root, { navigationUI: 'hide' }))
      .then(() => globalThis.screen?.orientation?.lock?.('landscape').catch(() => {}))
      .catch(() => this.showAnnouncement('FULLSCREEN WAS BLOCKED'));
  }

  completeRuneStroke() {
    if (!this.drawing.active || this.drawing.currentStroke.length === 0) return false;
    this.drawing.strokes.push([...this.drawing.currentStroke]);
    this.drawing.currentStroke = [];
    this.drawing.lastStrokeTime = performance.now();
    this.drawing.autoLockArmed = true;
    return true;
  }

  resetRuneSketch() {
    this.drawing.strokes = [];
    this.drawing.currentStroke = [];
    this.drawing.autoLockArmed = false;
    this.drawing.lastStrokeTime = 0;
    this.clearRuneCanvas();
  }

  confirmRuneDrawing(autoLock = false) {
    if (!this.drawing.active) return false;
    this.completeRuneStroke();
    const result = recognizer.recognize(this.drawing.strokes, this.affordableHandRuneIds(this.player.reservedMana));
    if (!result?.rune || result.confidence < 0.48) {
      this.resetRuneSketch();
      audio.playRuneFail();
      ui.showRecognitionBadge(null, 0);
      this.showAnnouncement('RUNE NOT RECOGNIZED — DRAW AGAIN');
      return false;
    }
    // Recognition is intentionally constrained to the three cards actually
    // visible in the hand. A valid global rune shape cannot consume a rune
    // that the player has not drawn into their hand.
    const availableCard = this.player.getRuneCard(this.drawing.expectedCardId, result.rune.id);
    if (!availableCard || availableCard.id !== result.rune.id) {
      this.resetRuneSketch();
      audio.playRuneFail();
      ui.showRecognitionBadge(null, 0);
      this.showAnnouncement('RUNE NOT IN HAND — DRAW ONE OF THE THREE');
      return false;
    }
    this.finishRuneDrawing(result);
    return true;
  }

  // DRAW is an explicit mode toggle: pressing it while Arcane Focus is open
  // commits a valid sketch, then always exits the drawing mode. The automatic
  // two-second check stays forgiving and leaves a failed sketch open to retry.
  lockOrExitRuneDrawing() {
    if (!this.drawing.active) return false;
    const hadInk = this.drawing.currentStroke.length > 0
      || this.drawing.strokes.some((stroke) => stroke.length > 0);
    const committed = hadInk && this.confirmRuneDrawing(false);
    if (this.drawing.active) this.cancelRuneDrawing();
    return committed;
  }

  cancelRuneDrawing() {
    if (!this.drawing.active) return;
    this.drawing.active = false;
    this.resetRuneSketch();
    this.drawing.touchId = null;
    this.drawing.inputMode = null;
    this.drawing.expectedCardId = null;
    this.drawing.autoLockArmed = false;
    this.player.reservedMana = 0;
    this.targetTimeScale = this.timeScale = 1;
    this.clearRuneCanvas();
    ui.setDrawingMode(false);
  }

  finishRuneDrawing(recognizedResult = null) {
    if (!this.drawing.active) return;

    if (this.drawing.currentStroke.length > 0) {
      this.drawing.strokes.push([...this.drawing.currentStroke]);
      this.drawing.currentStroke = [];
    }

    const expectedCardId = this.drawing.expectedCardId;
    // The reservation ends here: success turns it into bound slot mana.
    const reservedBudget = this.player.reservedMana;
    this.player.reservedMana = 0;
    this.drawing.active = false;
    this.drawing.touchId = null;
    this.drawing.inputMode = null;
    // Recognition should return immediately to full-speed combat. Do not let
    // the previous drawing slow-motion ease back in after a successful rune.
    this.targetTimeScale = 1.0;
    this.timeScale = 1.0;
    ui.setDrawingMode(false);

    if (!this.isMatchRunning() || !this.player.isAlive) {
      this.clearRuneCanvas();
      return;
    }
    const result = recognizedResult ?? recognizer.recognize(this.drawing.strokes, this.affordableHandRuneIds(reservedBudget));

    if (result && result.rune && runeManaCost(result.rune) > this.player.freeMana) {
      audio.playRuneFail();
      this.showAnnouncement('NOT ENOUGH FREE MANA');
    } else if (result && result.rune) {
      const added = this.player.playRuneCard(result.rune.id, expectedCardId);
      if (added) {
        // A card remains a reusable deck card.  Cast quality belongs to this
        // particular prepared instance, not to every future redraw of it.
        const grade = result.grade ?? recognizer.gradeForConfidence(result.confidence);
        const runeProgress = this.profile.awardRuneUse(added.id, grade);
        const prepared = { ...added, grade, quality: result.confidence, runeLevel: this.profile.runeLevel(added.id), manaCost: runeManaCost(added) };
        // A recognized rune only goes into a spell slot in every mode; it is
        // released later by tapping its slot (or E), never fired automatically.
        this.slotRuneSpell(prepared);
        if (this.activeMode?.id === 'arena') {
          const idx = this.player.runeDeck.findIndex(c => c.cardId === added.cardId);
          if (idx !== -1) this.player.runeDeck.splice(idx, 1);
          this.player.runeHand = this.player.runeHand.filter(c => c.cardId !== added.cardId);
        }
        this.player.gainFocus({ C: 4, B: 6, A: 8, S: 10 }[grade] ?? 6, 'RUNE QUALITY');
        this.applyProfile();
        this.reportProfileProgress(runeProgress, prepared);
        audio.playRuneSuccess();
        ui.showRecognitionBadge(result.rune, result.confidence, prepared.grade);
        combat.spawnShockwave(this.player.x, this.player.y - 30, 70, result.rune.color);
        combat.spawnElementalParticles(this.player.x, this.player.y - 30, result.rune.id, Math.round(14 * spells.qualityForRunes([prepared]).particles));
      } else {
        ui.showAnnouncement(this.player.slottedSpells.length >= 3 ? 'SPELL SLOTS FULL — CAST OR FUSE!' : 'DRAW A RUNE FROM YOUR HAND');
      }
    } else {
      audio.playRuneFail();
      ui.showRecognitionBadge(null, 0);
    }

    this.clearRuneCanvas();
    this.drawing.expectedCardId = null;
  }

  castPreparedSpell() {
    if (!this.isMatchRunning() || !this.player.isAlive) return false;
    // Inside a Beam Clash the cast input becomes the push / counter impulse.
    if (this.player.activeClash) return !!this.clashAction();
    if (this.targeting.isActive) return this.targeting.confirm();
    const selectedSlot = this.player.slottedSpells[this.player.selectedSpellIndex];
    if (selectedSlot) return this.castSlotAt(selectedSlot.position);
    if (this.player.preparedRunes.length === 0) {
      this.showAnnouncement('NO RUNES PREPARED! DRAW RUNES FIRST');
      audio.playRuneFail();
      return false;
    }

    const selectedRunes = [...this.player.preparedRunes];
    const resolved = spells.resolveSpell(selectedRunes);
    if (resolved) {
      if (resolved.id === 'aura_shock' && this.player.auraShockCooldown > 0) {
        this.showAnnouncement('AURA SHOCK IS RECHARGING');
        audio.playRuneFail();
        return false;
      }
      if (resolved.id === 'arcane_aegis' && this.player.arcaneShieldCooldown > 0) {
        this.showAnnouncement('ARCANE AEGIS IS RECHARGING');
        audio.playRuneFail();
        return false;
      }
      if (resolved.id === 'eidolon_mantle' && this.player.eidolonCooldown > 0) {
        this.showAnnouncement('EIDOLON MANTLE IS RECHARGING');
        audio.playRuneFail();
        return false;
      }
      if (resolved.id === 'ninefold_beast_form' && this.player.ninefoldCooldown > 0) {
        this.showAnnouncement('NINEFOLD FORM IS RECHARGING');
        audio.playRuneFail();
        return false;
      }
      if (this.player.mp < (resolved.manaCost ?? 0)) {
        this.showAnnouncement('NOT ENOUGH MANA');
        audio.playRuneFail();
        return false;
      }
      this.player.mp -= resolved.manaCost ?? 0;
      if (resolved.id === 'aura_shock') this.player.auraShockCooldown = resolved.cooldown;
      if (resolved.id === 'arcane_aegis') this.player.arcaneShieldCooldown = resolved.cooldown;
      if (resolved.id === 'eidolon_mantle') this.player.eidolonCooldown = resolved.cooldown;
      if (resolved.id === 'ninefold_beast_form') this.player.ninefoldCooldown = resolved.cooldown;
    spells.cast(this.player, resolved, this, spells.qualityForRunes(selectedRunes));
      this.player.gainFocus(resolved.tier > 1 ? 8 : 4, 'SPELL CAST');
      this.showAnnouncement(`CAST: ${resolved.name}!`);
      this.noteSpellDiscovery(resolved);
      // Drawing already recycled each physical card to the deck back and
      // refilled the hand. Casting consumes only the prepared components.
      this.player.consumePreparedRunes();
      return true;
    }
    return false;
  }

  slotAt(position) {
    return this.player.slottedSpells.find((slot) => slot.position === position) ?? null;
  }

  slotRuneSpell(rune) {
    const slots = this.player.slottedSpells;
    // A drawn rune is always visible as its own orbiting component in one of
    // the three triangle slots (0 = top, 1 = bottom-left, 2 = bottom-right).
    // Combining is a conscious slot-to-slot swipe, never an implicit side
    // effect of drawing the next card.
    // Unknown future rune families still receive a safe component record, but
    // all currently draw-able runes resolve to a real standalone effect.
    const definition = spells.resolveSpell([rune]) ?? {
      id: 'rune_component',
      name: `${rune.name} COMPONENT`,
      tier: 0,
      manaCost: 0,
      color: rune.color,
      isComponent: true,
      desc: `${rune.name} must be fused with another rune in the Grimoire.`
    };
    const taken = new Set(slots.map((entry) => entry.position));
    const position = [0, 1, 2].find((index) => !taken.has(index)) ?? slots.length;
    const slot = { runes: [rune], definition, isCombo: false, quality: spells.qualityForRunes([rune]), position, manaCost: rune.manaCost ?? runeManaCost(rune) };
    slots.push(slot);
    this.player.selectedSpellIndex = slots.length - 1;
    return slot;
  }

  castSpellSlot(slot, consumeSelected = false, target = null) {
    const resolved = slot?.definition;
    if (!resolved) return false;
    if (resolved.isComponent) {
      this.showAnnouncement(`${slot.runes[0].name} NEEDS A RUNE COMBINATION`);
      audio.playRuneFail();
      return false;
    }
    if (resolved.id === 'aura_shock' && this.player.auraShockCooldown > 0) {
      this.showAnnouncement('AURA SHOCK IS RECHARGING'); audio.playRuneFail(); return false;
    }
    if (resolved.id === 'arcane_aegis' && this.player.arcaneShieldCooldown > 0) {
      this.showAnnouncement('ARCANE AEGIS IS RECHARGING'); audio.playRuneFail(); return false;
    }
    if (resolved.id === 'eidolon_mantle' && this.player.eidolonCooldown > 0) {
      this.showAnnouncement('EIDOLON MANTLE IS RECHARGING'); audio.playRuneFail(); return false;
    }
    if (resolved.id === 'ninefold_beast_form' && this.player.ninefoldCooldown > 0) {
      this.showAnnouncement('NINEFOLD FORM IS RECHARGING'); audio.playRuneFail(); return false;
    }
    // The slot was paid when it was drawn. Casting turns its bound mana into
    // spent mana (it regenerates later) — there is no second payment gate.
    this.player.mp = Math.max(0, this.player.mp - (slot.manaCost ?? 0));
    if (resolved.id === 'aura_shock') this.player.auraShockCooldown = resolved.cooldown;
    if (resolved.id === 'arcane_aegis') this.player.arcaneShieldCooldown = resolved.cooldown;
    if (resolved.id === 'eidolon_mantle') this.player.eidolonCooldown = resolved.cooldown;
    if (resolved.id === 'ninefold_beast_form') this.player.ninefoldCooldown = resolved.cooldown;
    spells.cast(this.player, resolved, this, slot.quality, target);
    this.player.gainFocus(resolved.tier > 1 ? 8 : 4, 'SPELL CAST');
    this.showAnnouncement(`CAST: ${resolved.name}!`);
    this.noteSpellDiscovery(resolved);
    if (consumeSelected) {
      if (this.activeMode?.id === 'arena') {
        for (const rune of slot.runes) {
          const idx = this.player.runeDeck.findIndex(c => c.cardId === rune.cardId);
          if (idx !== -1) this.player.runeDeck.splice(idx, 1);
        }
      }
      this.removeSlots([slot]);
    }
    return true;
  }

  removeSlots(removed) {
    const slots = this.player.slottedSpells;
    for (const slot of removed) {
      const index = slots.indexOf(slot);
      if (index !== -1) slots.splice(index, 1);
    }
    this.player.selectedSpellIndex = Math.max(0, Math.min(this.player.selectedSpellIndex, slots.length - 1));
    this.player.preparedRunes = slots.flatMap((entry) => entry.runes);
  }

  // Tap on a triangle slot: fire exactly that prepared spell.
  castSlotAt(position) {
    if (!this.isMatchRunning() || !this.player.isAlive) return false;
    if (this.player.activeClash) return !!this.clashAction();
    const slot = this.slotAt(position);
    if (!slot) return false;
    this.player.selectedSpellIndex = this.player.slottedSpells.indexOf(slot);
    // Ground / placement / ally spells first ask for their target.
    if (needsTarget(slot.definition)) {
      this.targeting.begin(slot, 'tap');
      if (this.inputMode === 'desktop' && this.input.mouse.hasMoved) this.targeting.setPointFromScreen(this.input.mouse);
      return true;
    }
    // Mouse users aim direction spells toward the cursor side.
    if (this.inputMode === 'desktop' && this.input.mouse.hasMoved && slot.definition.targetingMode === TARGETING.DIRECTION) {
      const aimX = this.targeting.screenToWorld(this.input.mouse).x;
      if (Math.abs(aimX - this.player.x) > 12) this.player.facing = Math.sign(aimX - this.player.x);
    }
    return this.castSpellSlot(slot, true);
  }

  // Touch: a slot dragged straight out onto the battlefield aims with the
  // same finger (preview while dragging, cast on release).
  beginSlotAim(position) {
    if (!this.isMatchRunning() || !this.player.isAlive || this.player.activeClash) return false;
    const slot = this.slotAt(position);
    return slot ? this.targeting.begin(slot, 'drag') : false;
  }

  // Swipe between two (or across all three) slots. Only the selected slots
  // are ingredients; order is irrelevant. A valid recipe stays in the anchor
  // (start) slot and frees the others. Without a recipe exactly one random
  // ingredient survives, the others are lost (their bound mana is released)
  // and nothing is cast. Training mode experiments without losses.
  fuseSlots(positions) {
    if (!this.isMatchRunning() || !this.player.isAlive) return { ok: false, reason: 'inactive' };
    const unique = [...new Set(positions)];
    const chosen = unique.map((position) => this.slotAt(position));
    if (unique.length < 2 || chosen.some((slot) => !slot)) return { ok: false, reason: 'empty' };
    if (chosen.some((slot) => slot.isCombo || slot.runes.some((rune) => isSpecialRune(rune)))) {
      this.showAnnouncement('FUSED OR SPECIAL SPELLS CANNOT FUSE AGAIN'); audio.playRuneFail();
      return { ok: false, reason: 'locked' };
    }
    const components = chosen.flatMap((slot) => slot.runes);
    const recipe = spells.resolveSpell(components);
    const anchor = chosen[0];
    if (recipe) {
      const comboSlot = {
        runes: components, definition: recipe, isCombo: true, quality: spells.qualityForRunes(components),
        position: anchor.position, manaCost: chosen.reduce((sum, slot) => sum + (slot.manaCost ?? 0), 0)
      };
      const slots = this.player.slottedSpells;
      slots[slots.indexOf(anchor)] = comboSlot;
      this.removeSlots(chosen.slice(1));
      this.player.selectedSpellIndex = slots.indexOf(comboSlot);
      combat.spawnShockwave(this.player.x, this.player.y - 36, 48, recipe.color);
      audio.playRuneChime(720);
      this.showAnnouncement(`FUSED: ${recipe.name}`);
      return { ok: true, result: 'fused', slot: comboSlot };
    }
    audio.playRuneFail();
    if (this.activeMode?.id === 'training') {
      this.showAnnouncement('NO RECIPE — TRAINING: NOTHING LOST');
      return { ok: false, reason: 'norecipe', lossless: true };
    }
    const survivor = chosen[Math.floor(Math.random() * chosen.length)];
    this.removeSlots(chosen.filter((slot) => slot !== survivor));
    this.showAnnouncement(`NO RECIPE — ONLY ${survivor.definition.name} REMAINS`);
    return { ok: false, reason: 'norecipe', survivor };
  }

  clashAction() {
    const clash = spells.getClashFor(this.player);
    return clash ? clash.humanAction(this.player) : null;
  }

  // Attack while standing on a field weapon: pick it up (swap with the held one).
  tryPickupWeapon(actor) {
    const pickup = this.armory?.nearest(actor, 30);
    if (!pickup || !actor.equipWeapon) return false;
    this.armory.take(pickup);
    const previous = actor.equipWeapon(pickup.weapon, pickup.durability);
    if (previous) this.armory.drop(previous.weapon, actor.x - actor.facing * 18, actor.z, previous.durability);
    const weapon = WEAPONS[pickup.weapon];
    combat.spawnShockwave(actor.x, actor.y - 30, 34, weapon.accent);
    audio.playRuneChime?.(660);
    if (actor === this.player) this.showAnnouncement(`${weapon.name} — ${weapon.desc} SPRINT + ATTACK THROWS IT`, 2);
    return true;
  }

  // Tapping / clicking your own Wizard transforms once Focus is full.
  tryTransformByTap(pt) {
    const p = this.player;
    if (!pt || !this.isMatchRunning() || !p?.isAlive || this.drawing.active || this.targeting.isActive) return false;
    // Siege: a tap on the waiting Primal sends it to the lane alone.
    if (this.primal?.tryTapDeploy(pt, this)) return true;
    // A tap on an enemy marks it as the Primal's focus target (an armed
    // spell's targeting is handled before this and keeps priority).
    if (this.tryPrimalFocus(pt)) return true;
    if (p.focus < p.maxFocus || p.focusTransformTimer > 0) return false;
    const height = ENTITY_VISUALS.heroHeight;
    const inside = Math.abs(pt.x - p.x) <= 30 && pt.y <= p.y + 10 && pt.y >= p.y - height - 12;
    return inside ? this.activateFocusTransformation() : false;
  }

  activateFocusTransformation() {
    if (this.player?.activeClash) {
      this.showAnnouncement('TRANSFORMATION LOCKED DURING A CLASH'); return false;
    }
    // With a Primal the transformation loadout is the Primal Bond.
    if (this.primal) return this.togglePrimalBond();
    if (!this.isMatchRunning() || !this.player?.activateFocusTransformation?.()) {
      this.showAnnouncement(this.player?.focus >= this.player?.maxFocus ? 'FOCUS ALREADY ACTIVE' : `FOCUS ${Math.round(this.player?.focus ?? 0)}/${this.player?.maxFocus ?? 100}`);
      return false;
    }
    // No extra rune card: the form's techniques live on the charged heavy attack.
    this.showAnnouncement('FOCUS ASCENDANT — 8 SECONDS', 1.4);
    return true;
  }

  setGuardHeld(held) {
    if (!this.isMatchRunning() || !this.player.isAlive) return false;
    this.input.guardHeld = !!held;
    if (!held) {
      this.player.isGuarding = false;
      this.player.guardHoldTime = 0;
    }
    return true;
  }

  toggleMount() {
    if (!this.isMatchRunning() || !this.player.isAlive) return false;
    if (this.player.isMounted) {
      const name = this.player.mountedSummon.definition.name;
      this.player.dismount();
      this.showAnnouncement(`DISMOUNTED: ${name}`, 1.1);
      return true;
    }
    const mount = this.updateMountCandidate();
    if (!mount) {
      this.showAnnouncement('MOVE CLOSE TO YOUR WOLF OR GOLEM TO MOUNT', 1.25);
      return false;
    }
    if (!this.player.mount(mount)) return false;
    this.showAnnouncement(`RIDING: ${mount.definition.name}  [R TO DISMOUNT]`, 1.25);
    return true;
  }

  isValidMountCandidate(summon, range = 76) {
    return !!(summon?.definition?.mountable && !summon.isDead && !summon.rider
      && groundDistance(this.player, summon) <= range
      && Math.abs((this.player.worldHeight ?? 0) - (summon.worldHeight ?? 0)) <= 90);
  }

  updateMountCandidate() {
    if (!this.isMatchRunning() || !this.player?.isAlive || this.player.isMounted) {
      this.mountCandidate = null;
      return null;
    }
    // Preserve the current target through a small range margin. This stops
    // the contextual UI from flickering between two equally close mounts.
    if (this.isValidMountCandidate(this.mountCandidate, 84)) return this.mountCandidate;
    const candidates = spells.getSummons(this.player.team)
      .filter((summon) => this.isValidMountCandidate(summon));
    candidates.sort((a, b) => groundDistance(this.player, a) - groundDistance(this.player, b));
    this.mountCandidate = candidates[0] ?? null;
    return this.mountCandidate;
  }

  setMatchMode(mode) {
    if (this.matchState === 'Running' || this.matchState === 'Ending') return false;
    this.matchMode = getGameMode(mode).id;
    this.activeMode = getGameMode(this.matchMode);
    return true;
  }

  getEnemyHome(team, battlefield = this.battlefield) {
    if (team !== 'red') return battlefield.getSpawn(team);
    if (this.modeState?.bossHome) return this.modeState.bossHome;
    if (this.activeMode?.enemyBehavior === 'duel' || this.modeState?.bossActive) return { x: 690, z: 0.58 };
    return battlefield.getSpawn(team);
  }

  spawnModeWave(team, count, { x, z = 0.58, spread = 0.18, elite = false } = {}) {
    const laneOffsets = [-1, 0, 1];
    for (let i = 0; i < count; i++) {
      const lane = laneOffsets[i % laneOffsets.length];
      const type = i % 3 === 2 ? 'ranged' : 'melee';
      const minion = new Minion(x + (team === 'red' ? i * 7 : -i * 7), z + lane * spread, team, type, i % 3);
      this.enhanceMinionSprite(minion);
      if (elite) {
        minion.maxHp = Math.round(minion.maxHp * 1.35);
        minion.hp = minion.maxHp;
        minion.damage = Math.round(minion.damage * 1.2);
        minion.speed *= 1.05;
      }
      this.minions.push(minion);
    }
  }

  enhanceMinionSprite(minion) {
    const pool = ART_ASSETS.dungeonPool;
    const archetypes = ART_ASSETS.archetypes;
    if (!pool || !archetypes) return;
    const keys = minion.team === 'blue' ? pool.allies : pool.enemies;
    const key = keys[Math.floor(Math.random() * keys.length)];
    minion.spriteKey = key;
    minion.configureArchetype(archetypes[key]);
  }

  setupModeMatch() {
    const mode = this.activeMode;
    this.trainingDummy = null;
    this.siegeMatch = null;
    this.player.confineBounds = null;
    this.enemyChampion.confineBounds = null;
    this.uiLayer?.classList?.toggle?.('mode-training', mode.id === 'training');
    this.modeState = {
      id: mode.id, wave: 0, intermission: 0, stage: 0, announced: false,
      bossActive: false, scroll: 0, routeScroll: 0, dungeonCameraX: 0, dungeonRoom: null, bossHome: null, rescued: 0, rescue: null, runeCollectibles: [],
      // Arena is deliberately melee-first. Runes are discovered from the
      // floor and transformations arrive as a contested, temporary relic --
      // neither is inherited from the profile deck.
      transformationRelic: null, transformationRelicTimer: 8.5,
      potions: [],
      run: mode.progression === 'run' ? { level: 0, xp: 0, xpToNext: 30, deck: [], pending: false, options: [], awaitingFirstKill: true } : null
    };
    if (mode.id === 'siege') {
      if (this.siegeDeployRules) this.siegeMatch = new SiegeMatch(this);
      this.battlefield.spawnWave(this);
      return;
    }
    if (mode.id === 'invasion') {
      environment.addProp('crate', 470, .2); environment.addProp('crate', 520, .86); environment.addProp('barrel', 640, .5);
      this.player.x = 146; this.player.z = 0.48;
      this.battlefield.placeOnSurface(this.player);
      this.enemyChampion.lifeState = 'Dead';
      this.enemyChampion.respawnTimer = Infinity;
      this.spawnInvasionWave();
      return;
    }
    if (mode.id === 'dungeon') {
      this.player.x = 290; this.player.z = 0.58;
      this.player.maxHp = this.player.hp = 300;
      this.enemyChampion.lifeState = 'Dead';
      this.enemyChampion.respawnTimer = Infinity;
      Object.assign(this.battlefield.boundsOverride, dungeonRoomBounds(1));
      this.battlefield.placeOnSurface(this.player);
      this.spawnDungeonStarter();
      return;
    }
    if (mode.id === 'training') {
      // Practice yard: a stationary straw dummy in the centre. The sparring
      // partner (the Champion AI) starts switched off and is toggled from
      // the HUD (or P).
      this.player.x = 300; this.player.z = 0.58;
      this.battlefield.placeOnSurface(this.player);
      // The chosen map brings its painted terrain, weather and props.
      const map = getTrainingMap(this.trainingMapId);
      environment.setMap(map, map.zones.map(zoneToWorld));
      for (const [kind, x, z] of map.props) environment.addProp(kind, x, z);
      this.trainingDecks ??= { player: this.profile.getMatchDeck(), opponent: [...DEFAULT_MATCH_DECK] };
      this.applyTrainingDecks();
      // Field weapons: crates with a weapon inside appear now and then.
      this.armory.clear();
      this.trainingDummy = new TrainingDummy(512, 0.5);
      this.battlefield.placeOnSurface(this.trainingDummy);
      this.minions.push(this.trainingDummy);
      this.modeState.sparring = false;
      this.enemyChampion.heroKey = 'mage';
      this.enemyChampion.maxHp = this.enemyChampion.hp = 900;
      this.enemyChampion.x = 840; this.enemyChampion.z = 0.58;
      this.battlefield.placeOnSurface(this.enemyChampion);
      this.enemyChampion.lifeState = 'Dead';
      this.enemyChampion.respawnTimer = Infinity;
      return;
    }
    if (mode.id === 'arena') {
      environment.addProp('crate', 230, .86); environment.addProp('crate', 800, .18); environment.addProp('barrel', 512, .9);
      this.player.x = 355; this.player.z = 0.58;
      this.enemyChampion.x = 690; this.enemyChampion.z = 0.58;
      this.enemyChampion.heroKey = mode.id === 'arena' ? 'darklord' : 'mage';
      if (mode.id === 'arena') {
        this.enemyChampion.maxHp = this.enemyChampion.hp = 430;
      } else {
        this.enemyChampion.maxHp = this.enemyChampion.hp = 900;
      }
      this.battlefield.placeOnSurface(this.player);
      this.battlefield.placeOnSurface(this.enemyChampion);
      if (mode.id === 'arena') {
        this.enemyChampion.lifeState = 'Alive';
        this.enemyChampion.respawnTimer = Infinity;
        this.modeState.bossActive = true;
        this.spawnArenaRuneCollectibles();
      }
    }
  }

  // Switch the Training map; a running Training restarts on the new map
  // (decks are kept, the sparring partner starts switched off).
  selectTrainingMap(id) {
    const map = TRAINING_MAPS.find((entry) => entry.id === id);
    if (!map) return false;
    this.trainingMapId = map.id;
    try { globalThis.localStorage?.setItem?.('grimge-training-map', map.id); } catch { /* optional */ }
    if (this.activeMode?.id === 'training' && this.isMatchRunning()) {
      this.setMenuPaused(false);
      this.restartMatch();
      this.showAnnouncement(`TRAINING MAP: ${map.name}`, 1.4);
    }
    return true;
  }

  // A present partner can be switched between ACTIVE (fights back) and
  // PASSIVE (no actions; can be launched, lifted, pushed and frozen — for
  // testing spells on a movable target, which the anchored dummy is not).
  // Primal focus target (Unity: TrySetFocusTarget): the tapped enemy is
  // hunted until it falls or another one is tapped.
  tryPrimalFocus(pt) {
    const primal = this.primal;
    if (!primal?.isTargetable || !pt) return false;
    const height = ENTITY_VISUALS.heroHeight;
    const hit = this.getHostileTargets(primal.team, true).find((t) => !t.isProp && !t.isStoneWall && !t.isDead && t.lifeState !== 'Dead'
      && Math.abs(pt.x - t.x) <= (t.isObjective ? 40 : 28) && pt.y <= (t.y ?? 0) + 10 && pt.y >= (t.y ?? 0) - (t.heroKey ? height : 70) - 10);
    if (!hit) return false;
    primal.setFocusTarget(hit);
    return true;
  }

  // Primal Bond (Unity PrimalBondRuntime): full Focus, grounded, Primal alive
  // and within 3.5 u → 0.5 s wind-up, then merged. T again releases it.
  togglePrimalBond() {
    const p = this.player; const primal = this.primal;
    if (!this.isMatchRunning() || !p?.isAlive) return false;
    if (p.primalBond) return endPrimalBond(p, 'decouple');
    if (p.focus < p.maxFocus) { this.showAnnouncement(`FOCUS ${Math.round(p.focus)}/${p.maxFocus}`); return false; }
    if (!p.grounded || p.freezeTimer > 0) { this.showAnnouncement('PRIMAL BOND NEEDS SOLID GROUND', 1); return false; }
    if (!primal.canBond(p)) { this.showAnnouncement(primal.isAlive ? `${primal.info.name} MUST BE CLOSE` : `${primal.info.name} IS DOWN`, 1.1); return false; }
    const bond = startPrimalBond(p, primal);
    this.showAnnouncement(`PRIMAL BOND — ${bond.form.name.toUpperCase()}`, 1.4);
    return true;
  }

  // Castle Siege: from the castle platform onto the lane (timed).
  requestDeploy() {
    const match = this.siegeMatch;
    if (!match || !this.isMatchRunning()) return false;
    if (match.deploy('blue')) return true;
    const side = match.side('blue');
    if (!match.castleStands('blue')) this.showAnnouncement('LAST STAND — NO MORE DEPLOYS', 1.1);
    else if (side.presence === 'Deployed') this.showAnnouncement(`ALREADY ON THE LANE — ${Math.ceil(side.laneTimeLeft)} S LEFT`, 1);
    else if (side.cooldown > 0) this.showAnnouncement(`DEPLOY READY IN ${Math.ceil(side.cooldown)} S`, 1);
    return false;
  }

  // Training castles: a Wizard walking into a gate comes out on top.
  enterCastleGate(entity, mapId) {
    if (entity !== this.player && entity !== this.enemyChampion) return false;
    if (!entity.grounded || entity.isMounted) return false;
    for (const team of ['blue', 'red']) {
      const door = castleGateDoor(mapId, team);
      if (Math.abs(entity.x - door.x) > 22 || Math.abs((entity.z - door.z) * 150) > 18) continue;
      const entry = castleDeckEntry(mapId, team);
      const color = team === 'blue' ? '#64b5f6' : '#ef5350';
      combat.spawnShockwave(entity.x, entity.y - 30, 34, color);
      entity.x = entry.x; entity.z = entry.z; entity.vx = 0; entity.vz = 0;
      entity.cancelSprint?.();
      entity.surfaceId = team + 'CastleDeck';
      this.battlefield.placeOnSurface(entity);
      entity._deckSafe = { x: entity.x, z: entity.z };
      combat.spawnShockwave(entity.x, entity.y - 4, 44, color);
      combat.spawnDust(entity.x, entity.y, 5);
      if (entity === this.player) this.showAnnouncement('ON THE RAMPARTS — JUMP DOWN ON THE ARENA SIDE', 1.4);
      return true;
    }
    return false;
  }

  // Training: try a class weapon (fixed part of the Wizard, never thrown;
  // sprint + attack is the sprint attack). V / the CLASS WEAPON button.
  cycleClassWeapon() {
    if (this.activeMode?.id !== 'training' || !this.isMatchRunning()) return null;
    const order = [null, ...Object.keys(WEAPONS).filter((id) => id !== 'ice_sword')];
    const next = order[(order.indexOf(this.player.classWeapon ?? null) + 1) % order.length];
    this.player.equipClassWeapon(next);
    this.showAnnouncement(next ? `CLASS WEAPON: ${WEAPONS[next].name}` : 'CLASS WEAPON: NONE (BARE HANDS)', 1.2);
    return next;
  }

  // Training: minion waves from the castle gates (M) and lane towers (N).
  toggleTrainingMinions() {
    if (this.activeMode?.id !== 'training' || !this.isMatchRunning()) return false;
    const on = this.battlefield.setTrainingWaves(!this.battlefield.trainingWavesOn);
    if (!on) this.minions = this.minions.filter((m) => !m.isMinion || m.followLeader);
    this.showAnnouncement(on ? 'MINIONS ON — FIRST WAVE IN 6 S' : 'MINIONS OFF', 1.2);
    return on;
  }

  toggleTrainingTowers() {
    if (this.activeMode?.id !== 'training' || !this.isMatchRunning()) return false;
    const on = this.battlefield.setTrainingTowers(!this.battlefield.trainingTowersOn);
    this.showAnnouncement(on ? 'LANE TOWERS ON' : 'LANE TOWERS OFF', 1.2);
    return on;
  }

  toggleSparringPassive() {
    if (this.activeMode?.id !== 'training' || !this.isMatchRunning() || !this.modeState.sparring) return false;
    const state = this.modeState;
    state.sparringPassive = !state.sparringPassive;
    this.enemyChampion.passive = state.sparringPassive;
    this.enemyChampion.vx = this.enemyChampion.vz = 0;
    this.showAnnouncement(state.sparringPassive ? 'PARTNER PASSIVE — TEST YOUR SPELLS ON IT' : 'PARTNER ACTIVE — IT FIGHTS BACK', 1.4);
    return state.sparringPassive;
  }

  toggleSparringPartner() {
    if (this.activeMode?.id !== 'training' || !this.isMatchRunning()) return false;
    const state = this.modeState;
    const champion = this.enemyChampion;
    state.sparring = !state.sparring;
    state.sparringPassive = false;
    champion.passive = false;
    if (state.sparring) {
      champion.x = 840; champion.z = 0.58;
      champion.hp = champion.maxHp; champion.mp = champion.maxMp;
      champion.vx = champion.vz = 0; champion.state = 'idle';
      champion.lifeState = 'Alive';
      champion.respawnTimer = Infinity;
      this.battlefield.placeOnSurface(champion);
      combat.spawnShockwave(champion.x, champion.y - 28, 50, '#ff5252');
      this.showAnnouncement('SPARRING PARTNER JOINS', 1.2);
    } else {
      // Leaving also ends any clash or attack in progress with the partner.
      champion.lifeState = 'Dead';
      champion.respawnTimer = Infinity;
      champion.activeClash = null;
      this.showAnnouncement('SPARRING PARTNER LEFT', 1.2);
    }
    return state.sparring;
  }

  runesForIds(ids) {
    return ids.map((id) => recognizer.runes.find((rune) => rune.id === id)).filter(Boolean);
  }

  applyTrainingDecks() {
    if (!this.trainingDecks) return;
    this.player.configureRuneDeck(this.runesForIds(this.trainingDecks.player));
    this.enemyChampion.setDeck?.(this.trainingDecks.opponent);
  }

  // Deck-builder view of a training deck. In the debug build (until the
  // game is public) every rune is available here.
  trainingDeckSource(target = this.deckEditTarget ?? 'player') {
    const deck = this.trainingDecks?.[target] ?? [];
    return {
      target, matchDeck: deck, trainingSparring: !!this.modeState?.sparring,
      isRuneUnlocked: (id) => DEBUG_BUILD || this.profile.isRuneUnlocked(id),
      getRuneCopies: (id) => deck.filter((entry) => entry === id).length,
      runeLevel: (id) => this.profile.runeLevel(id)
    };
  }

  openTrainingDeck(target = 'player') {
    if (this.activeMode?.id !== 'training' || !this.isMatchRunning()) return false;
    if (target === 'opponent' && !this.modeState?.sparring) target = 'player';
    this.deckEditTarget = target;
    this.targeting.cancel();
    this.setMenuPaused(true);
    ui.toggleDeckBuilder?.(true);
    ui.renderDeckBuilder?.(this.trainingDeckSource());
    return true;
  }

  closeTrainingDeck() {
    if (!this.deckEditTarget) return false;
    this.deckEditTarget = null;
    this.applyTrainingDecks();
    this.setMenuPaused(false);
    this.showAnnouncement('TRAINING DECKS UPDATED', 1);
    return true;
  }

  editTrainingDeck(action, runeId) {
    const target = this.deckEditTarget;
    const deck = this.trainingDecks?.[target];
    if (!deck) return false;
    if (action === 'reset') deck.splice(0, deck.length, ...(target === 'player' ? this.profile.getMatchDeck() : DEFAULT_MATCH_DECK));
    else if (action === 'add') {
      if (!ALL_RUNE_IDS.includes(runeId) || !this.trainingDeckSource().isRuneUnlocked(runeId)) return false;
      if (deck.length >= MATCH_DECK_SIZE || deck.filter((id) => id === runeId).length >= MAX_RUNE_COPIES) return false;
      // Only one Arcane State rune per deck.
      if (!deckAccepts(deck, runeId)) { this.showAnnouncement('ONE ARCANE STATE PER DECK', 1.2); return false; }
      deck.push(runeId);
    } else if (action === 'remove') {
      const index = deck.lastIndexOf(runeId);
      if (index < 0) return false;
      deck.splice(index, 1);
    } else return false;
    ui.renderDeckBuilder?.(this.trainingDeckSource());
    return true;
  }

  // The red HUD side mirrors whoever the player is actually fighting.
  hudOpponent() {
    if (this.activeMode?.id === 'training' && !this.modeState?.sparring && this.trainingDummy) return this.trainingDummy;
    return this.enemyChampion;
  }

  spawnInvasionWave() {
    const state = this.modeState;
    if (!state || this.activeMode.id !== 'invasion') return;
    state.wave++;
    const count = Math.min(12, 3 + state.wave + Math.floor(state.wave / 3));
    const scale = 1 + (state.wave - 1) * .08;
    const firstNew = this.minions.length;
    this.spawnModeWave('red', count, { x: 900, z: 0.58, spread: 0.17, elite: state.wave >= 5 });
    for (const minion of this.minions.slice(firstNew)) {
      minion.modeWave = state.wave;
      minion.maxHp = Math.round(minion.maxHp * scale); minion.hp = minion.maxHp;
      minion.damage = Math.round(minion.damage * scale); minion.speed *= 1 + (state.wave - 1) * .015;
    }
    this.showAnnouncement(`INVASION WAVE ${state.wave}/${this.activeMode.waveGoal}`, 1.4);
  }

  spawnDungeonStage(stage) {
    const state = this.modeState;
    if (!state || this.activeMode.id !== 'dungeon') return;
    state.stage = stage;
    const config = DUNGEON_ROOMS[stage];
    const bounds = dungeonRoomBounds(stage);
    // Entering a room closes both walls around it. The previous room is gone
    // for good, including a prisoner the player did not free in time.
    Object.assign(this.battlefield.boundsOverride, bounds);
    const prisonerLost = !!(state.rescue && !state.rescue.rescued);
    state.rescue = config.rescueAt ? { x: bounds.left + config.rescueAt, z: 0.44, rescued: false } : null;
    // Every regular room hides a couple of crates and an oil barrel.
    if (!config.boss) {
      environment.addProp('crate', bounds.left + 520, .24);
      environment.addProp('barrel', bounds.left + 980, .82);
      environment.addProp('crate', bounds.left + 1500, .5);
    }
    state.dungeonRoom = {
      ...bounds, cleared: false,
      encounters: (config.encounters ?? []).map((encounter) => ({ ...encounter, spawned: false }))
    };
    if (!config.boss) {
      this.enemyChampion.lifeState = 'Dead'; this.enemyChampion.respawnTimer = Infinity;
      this.showAnnouncement(prisonerLost ? `DUNGEON ROOM ${stage} — THE PRISONER WAS LEFT BEHIND` : `DUNGEON ROOM ${stage} — PUSH FORWARD`, 1.9);
      this.spawnDueDungeonEncounters();
      return;
    }
    // The Warden walks in from the right screen edge and holds the far side
    // of its own room instead of the shared arena home position.
    state.bossHome = { x: bounds.left + 820, z: 0.58 };
    this.enemyChampion.x = Math.min(bounds.right - 40, this.dungeonOffscreenRightX());
    this.enemyChampion.z = 0.58;
    this.enemyChampion.heroKey = 'boss_firelord';
    this.enemyChampion.maxHp = this.enemyChampion.hp = 580;
    this.enemyChampion.lifeState = 'Alive';
    this.enemyChampion.respawnTimer = Infinity;
    this.battlefield.placeOnSurface(this.enemyChampion);
    state.bossActive = true;
    this.showAnnouncement('DUNGEON BOSS — VOID WARDEN', 2.1);
  }

  dungeonCameraTarget() {
    const bounds = this.battlefield.boundsOverride;
    const target = this.player.x - this.logicalWidth * 0.3;
    const min = Math.max(0, bounds.left - DUNGEON_LEFT_EDGE);
    const max = Math.max(min, bounds.right + DUNGEON_LEFT_EDGE - this.logicalWidth);
    return Math.max(min, Math.min(max, target));
  }

  dungeonOffscreenRightX() {
    // World x just past the visible right edge (wide screens included), so
    // new enemies walk into view instead of popping in on screen.
    const camX = Math.max(this.modeState?.dungeonCameraX ?? 0, this.dungeonCameraTarget());
    return camX - this.cameraOffsetX + this.renderWidth + 40;
  }

  spawnDueDungeonEncounters() {
    const room = this.modeState?.dungeonRoom;
    if (!room) return;
    const elite = !!DUNGEON_ROOMS[this.modeState.stage]?.elite;
    for (const encounter of room.encounters) {
      if (encounter.spawned || this.player.x < room.left + encounter.at) continue;
      encounter.spawned = true;
      const firstDungeonEnemy = this.minions.length;
      const spawnX = Math.min(room.right - 30, this.dungeonOffscreenRightX());
      this.spawnModeWave('red', encounter.count, { x: spawnX, z: 0.58, spread: 0.16, elite });
      for (let index = firstDungeonEnemy; index < this.minions.length; index++) {
        const m = this.minions[index];
        m.isDungeonRaider = true;
        m.maxHp = m.hp = m.type === 'ranged' ? 35 : 55;
        m.damage = m.type === 'ranged' ? 12 : 10;
        this.battlefield.placeOnSurface(m);
      }
    }
  }

  updateDungeonRoom() {
    const state = this.modeState;
    const room = state.dungeonRoom;
    if (!room) return;
    this.spawnDueDungeonEncounters();
    const hostilesLeft = this.minions.some((minion) => minion.team === 'red' && !minion.isDead);
    if (!room.cleared && !hostilesLeft && room.encounters.every((encounter) => encounter.spawned)) {
      room.cleared = true;
      // Open the right wall into the next room; the arrow marks the exit.
      this.battlefield.boundsOverride.right = dungeonRoomBounds(state.stage + 1).right;
      this.showAnnouncement('ROOM CLEARED — GO RIGHT', 1.6);
    }
    if (room.cleared && this.player.isAlive && this.player.x > room.right + 24) this.spawnDungeonStage(state.stage + 1);
  }

  isDungeonExitOpen() {
    const state = this.modeState;
    return this.activeMode?.id === 'dungeon' && state?.stage >= 1 && state.stage < DUNGEON_ROOMS.length - 1 && !!state.dungeonRoom?.cleared;
  }

  spawnDungeonStarter() {
    const state = this.modeState;
    if (!state || this.activeMode.id !== 'dungeon') return;
    const starter = new Minion(550, 0.58, 'red', 'melee', 1);
    starter.maxHp = starter.hp = 42;
    starter.damage = 8;
    starter.runXpValue = 30;
    starter.isDungeonStarter = true;
    this.enhanceMinionSprite(starter);
    this.battlefield.placeOnSurface(starter);
    this.minions.push(starter);
    this.showAnnouncement('DUNGEON START — DEFEAT THE SCOUT', 1.8);
  }

  spawnArenaRuneCollectibles() {
    const state = this.modeState;
    if (!state || this.activeMode.id !== 'arena') return;
    const pool = recognizer.runes.filter((rune) => rune.id !== 'special');
    const positions = [{ x: 438, z: .27 }, { x: 535, z: .80 }, { x: 625, z: .48 }];
    state.runeCollectibles = positions.map((position, index) => ({ ...position, rune: pool[(index * 3 + 1) % pool.length] }));
    this.showAnnouncement('ARENA — FIGHT FOR RUNE RELICS', 1.7);
  }

  beginModeBoss(label, hp = 760) {
    const state = this.modeState;
    state.bossActive = true;
    this.enemyChampion.x = 265; this.enemyChampion.z = 0.58;
    this.enemyChampion.heroKey = 'boss_firelord';
    this.enemyChampion.maxHp = this.enemyChampion.hp = hp;
    this.enemyChampion.lifeState = 'Alive'; this.enemyChampion.respawnTimer = Infinity;
    this.battlefield.placeOnSurface(this.enemyChampion);
    this.showAnnouncement(label, 2.1);
  }

  isRunChoicePending() { return !!this.modeState?.run?.pending; }

  queueRunRuneChoice() {
    const run = this.modeState?.run;
    if (!run) return;
    const pool = recognizer.runes.filter((rune) => rune.id !== 'special');
    const preferred = pool.filter((rune) => !run.deck.includes(rune.id));
    const source = preferred.length >= 2 ? preferred : pool;
    const firstIndex = Math.floor(Math.random() * source.length);
    let secondIndex = Math.floor(Math.random() * (source.length - 1));
    if (secondIndex >= firstIndex) secondIndex++;
    run.options = [source[firstIndex], source[secondIndex]].filter(Boolean);
    run.pending = true;
    this.input.gameplayBlocked = true;
    ui.showRunRuneChoice?.(run.options, run.level);
  }

  chooseRunRune(id) {
    const run = this.modeState?.run;
    if (!run?.pending || !run.options.some((rune) => rune.id === id)) return false;
    run.deck.push(id);
    const deck = run.deck.map((runeId) => recognizer.runes.find((rune) => rune.id === runeId)).filter(Boolean);
    this.player.configureRuneDeck(deck);
    run.pending = false; run.options = [];
    ui.hideRunRuneChoice?.();
    this.input.gameplayBlocked = false;
    this.showAnnouncement(`${recognizer.runes.find((rune) => rune.id === id)?.name ?? id} ACQUIRED`, 1.1);
    if (this.activeMode.id === 'invasion' && this.modeState.wave === 0) this.spawnInvasionWave();
    if (this.activeMode.id === 'dungeon' && this.modeState.stage === 0) this.spawnDungeonStage(1);
    return true;
  }

  awardRunXp(amount) {
    const run = this.modeState?.run;
    if (!run || run.pending) return;
    run.xp += amount;
    if (run.xp >= run.xpToNext) {
      run.xp -= run.xpToNext; run.level++;
      run.xpToNext = Math.round(run.xpToNext * 1.28 + 5);
      this.queueRunRuneChoice();
    }
  }

  updateDungeonRescue() {
    const rescue = this.modeState?.rescue;
    if (!rescue || rescue.rescued || !this.player.isAlive) return;
    if (Math.hypot(this.player.x - rescue.x, (this.player.z - rescue.z) * 150) > 48) return;
    rescue.rescued = true; this.modeState.rescued++;
    const ally = new Minion(this.player.x - 24, this.player.z + .05, 'blue', 'melee', 1);
    ally.isRescuedCompanion = true; ally.followLeader = this.player; ally.maxHp = ally.hp = 220; ally.damage = 28; ally.speed = 105; ally.attackCooldown = 1.0;
    this.enhanceMinionSprite(ally); ally.renderHeight = 78;
    this.battlefield.placeOnSurface(ally); this.minions.push(ally);
    this.showAnnouncement('COMPANION RESCUED — JOINS UNTIL DEFEATED', 2.2);
  }

  trySpawnPotion(x, z) {
    const potions = this.modeState?.potions;
    if (!potions) return;
    const mode = this.activeMode?.id;
    if (mode !== 'dungeon' && mode !== 'invasion') return;
    if (Math.random() > 0.45) return;
    const kind = Math.random() < 0.6 ? 'hp' : 'mana';
    potions.push({ x: x + (Math.random() - 0.5) * 20, z, kind, life: 15 });
  }

  updatePotions(dt) {
    const potions = this.modeState?.potions;
    if (!potions?.length || !this.player.isAlive) return;
    for (let i = potions.length - 1; i >= 0; i--) {
      const p = potions[i];
      p.life -= dt;
      if (p.life <= 0) { potions.splice(i, 1); continue; }
      if (Math.hypot(this.player.x - p.x, (this.player.z - p.z) * 150) > 38) continue;
      if (p.kind === 'hp') {
        const heal = Math.min(55, this.player.maxHp - this.player.hp);
        this.player.hp += heal;
        if (heal > 0) combat.spawnDamageText(this.player.x, this.player.y - 50, `+${heal}`, { color: '#66bb6a' });
      } else {
        const gain = Math.min(30, this.player.maxMp - this.player.mp);
        this.player.mp += gain;
        if (gain > 0) combat.spawnDamageText(this.player.x, this.player.y - 50, `+${gain}`, { color: '#42a5f5' });
      }
      potions.splice(i, 1);
    }
  }

  renderPotions(ctx) {
    const potions = this.modeState?.potions;
    if (!potions?.length) return;
    const time = performance.now() * 0.005;
    ctx.save();
    ctx.textAlign = 'center';
    for (const p of potions) {
      const y = groundYForDepth(p.z) - 12 + Math.sin(time + p.x * 0.1) * 3;
      const fade = p.life < 3 ? p.life / 3 : 1;
      ctx.globalAlpha = fade;
      const color = p.kind === 'hp' ? '#66bb6a' : '#42a5f5';
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(p.x, y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(p.kind === 'hp' ? '♥' : '★', p.x, y + 5);
    }
    ctx.restore();
  }

  updateArenaRuneCollectibles() {
    const relics = this.modeState?.runeCollectibles;
    if (this.activeMode?.id !== 'arena' || !relics?.length) return;
    for (let i = relics.length - 1; i >= 0; i--) {
      const relic = relics[i];
      if (this.player.isAlive && Math.hypot(this.player.x - relic.x, (this.player.z - relic.z) * 150) <= 42) {
        this.player.runeDeck.push(this.player.makeRuneCard(relic.rune));
        this.player.drawRunesToHand();
        relics.splice(i, 1);
        this.showAnnouncement(`${relic.rune.name} RUNE RELIC ACQUIRED`, 1.2);
        continue;
      }
      if (this.enemyChampion.isAlive && Math.hypot(this.enemyChampion.x - relic.x, (this.enemyChampion.z - relic.z) * 150) <= 42) {
        relics.splice(i, 1);
        this.showAnnouncement(`ENEMY SEIZED ${relic.rune.name} RUNE!`, 1.2);
        this.enemyChampion.spellCooldown = Math.min(this.enemyChampion.spellCooldown, 0.5);
      }
    }
  }

  spawnArenaTransformationRelic() {
    const state = this.modeState;
    if (!state || this.activeMode?.id !== 'arena' || state.transformationRelic) return false;
    const positions = [{ x: 486, z: .45 }, { x: 570, z: .70 }, { x: 650, z: .31 }];
    const position = positions[Math.floor(Math.random() * positions.length)];
    const forms = ['FOCUS ASCENDANT', 'EIDOLON MANTLE', 'NINEFOLD BEAST'];
    state.transformationRelic = { ...position, form: forms[Math.floor(Math.random() * forms.length)] };
    this.showAnnouncement('A TRANSFORMATION RELIC HAS APPEARED', 1.45);
    return true;
  }

  updateArenaTransformationRelic(dt) {
    const state = this.modeState;
    if (this.activeMode?.id !== 'arena' || !state || !this.player.isAlive) return;
    const relic = state.transformationRelic;
    if (!relic) {
      state.transformationRelicTimer -= dt;
      if (state.transformationRelicTimer <= 0) {
        state.transformationRelicTimer = 15 + Math.random() * 7;
        this.spawnArenaTransformationRelic();
      }
      return;
    }
    const playerDist = this.player.isAlive ? Math.hypot(this.player.x - relic.x, (this.player.z - relic.z) * 150) : Infinity;
    const enemyDist = this.enemyChampion.isAlive ? Math.hypot(this.enemyChampion.x - relic.x, (this.enemyChampion.z - relic.z) * 150) : Infinity;
    if (playerDist <= 44) {
      if (relic.form === 'EIDOLON MANTLE') spells.castEidolonMantle(this.player, RUNE_GRADE_PROFILES.A);
      else if (relic.form === 'NINEFOLD BEAST') spells.castNinefoldBeast(this.player, RUNE_GRADE_PROFILES.A);
      else { this.player.focus = this.player.maxFocus; this.player.activateFocusTransformation(); }
      state.transformationRelic = null;
      state.transformationRelicTimer = 17 + Math.random() * 7;
      this.showAnnouncement(`${relic.form} RELIC CLAIMED`, 1.5);
    } else if (enemyDist <= 44) {
      if (relic.form === 'EIDOLON MANTLE') spells.castEidolonMantle(this.enemyChampion, RUNE_GRADE_PROFILES.A);
      else if (relic.form === 'NINEFOLD BEAST') spells.castNinefoldBeast(this.enemyChampion, RUNE_GRADE_PROFILES.A);
      else { this.enemyChampion.hp = Math.min(this.enemyChampion.maxHp, this.enemyChampion.hp + 120); }
      state.transformationRelic = null;
      state.transformationRelicTimer = 17 + Math.random() * 7;
      this.showAnnouncement(`ENEMY CLAIMED ${relic.form}!`, 1.5);
    }
  }

  updateMode(dt) {
    const state = this.modeState;
    if (!state || !this.isMatchRunning()) return;
    if (this.isRunChoicePending()) return;
    if (this.activeMode.id === 'invasion') {
      if (this.battlefield.blueCastle.isDestroyed) {
        this.finishMode('red', 'DEFEAT — YOUR CASTLE HAS FALLEN');
        return;
      }
      if (state.bossActive) {
        if (this.enemyChampion.lifeState === 'Dead') this.finishMode('blue', 'VICTORY — THE INVASION IS REPULSED');
        return;
      }
      if (!this.minions.some((minion) => minion.team === 'red' && !minion.isDead)) {
        if (state.wave >= this.activeMode.waveGoal) {
          this.beginModeBoss('INVASION BOSS — RIFT TYRANT', 900);
        } else {
          state.intermission += dt;
          if (state.intermission >= 2.1) { state.intermission = 0; this.spawnInvasionWave(); }
        }
      }
      return;
    }
    if (this.activeMode.id === 'dungeon') {
      const targetCamX = this.dungeonCameraTarget();
      state.dungeonCameraX += (targetCamX - state.dungeonCameraX) * Math.min(1, 3.5 * dt);
      this.updateDungeonRescue();
      if (state.stage === 0) {
        // The opening scout shares room 1; its encounters start right away.
        if (!this.minions.some((minion) => minion.team === 'red' && !minion.isDead)) this.spawnDungeonStage(1);
      } else if (DUNGEON_ROOMS[state.stage]?.boss) {
        if (this.enemyChampion.lifeState === 'Dead') this.finishMode('blue', 'VICTORY — DUNGEON CLEARED');
      } else this.updateDungeonRoom();
      return;
    }
    if (this.activeMode.id === 'arena' && state.bossActive && this.enemyChampion.lifeState === 'Dead') {
      this.finishMode('blue', 'VICTORY — ARENA CHAMPION DEFEATED');
      return;
    }
    if (this.activeMode.id === 'arena') this.updateArenaTransformationRelic(dt);
    if (this.activeMode.id === 'training' && state.sparring && this.enemyChampion.lifeState === 'Dead') {
      // A practice opponent returns without rewards or a match-ending flow.
      this.enemyChampion.lifeState = 'Alive';
      this.enemyChampion.hp = this.enemyChampion.maxHp;
      this.enemyChampion.x = 690; this.enemyChampion.z = 0.58;
      this.battlefield.placeOnSurface(this.enemyChampion);
      this.showAnnouncement('TRAINING DUMMY RESET', 1);
    }
  }

  finishMode(winner, message) {
    if (!this.isMatchRunning()) return;
    this.winnerTeam = winner;
    this.matchState = 'Ending';
    this.endingTimer = 0.9;
    this.input.gameplayBlocked = true;
    this.showAnnouncement(message, 1.3);
    combat.shakeCamera(20, 1);
  }

  getHostileTargets(myTeam, includeProtectedCastle = false) {
    const targets = [];
    for (const m of this.minions) {
      if (m.team !== myTeam && !m.isDead) targets.push(m);
    }
    for (const summon of spells.getSummons()) {
      if (summon.team !== myTeam) targets.push(summon);
    }
    if (myTeam === 'red' && this.player.isAlive) targets.push(this.player);
    if (this.primal && myTeam !== this.primal.team && this.primal.isTargetable && (!this.siegeMatch || this.primal.onLane)) targets.push(this.primal);
    if (myTeam === 'blue' && this.enemyChampion.isAlive) targets.push(this.enemyChampion);

    if (this.activeMode?.objectives !== false || this.battlefield.trainingTowersOn) {
      const enemyTeam = myTeam === 'blue' ? 'red' : 'blue';
      for (const objective of this.battlefield.getObjectivesForTeam(enemyTeam)) {
        if (!objective.isDestroyed && (includeProtectedCastle || objective.isVulnerable !== false)) targets.push(objective);
      }
    }

    // Hostile walls can be worn down by melee, spells and projectiles.
    for (const spell of spells.activeSpells) {
      if (spell.isStoneWall && !spell.isDead && spell.team !== myTeam) targets.push(spell);
    }
    // Breakable crates / barrels are neutral: every team can hit them.
    for (const prop of environment.livingProps()) targets.push(prop);
    return targets;
  }

  // Towers use this deliberately narrower query. Objectives remain valid
  // player/minion/spell targets, but are never valid Tower targets.
  getHostileMobileTargets(myTeam) {
    const targets = [];
    // A Wizard sheltered on its castle platform is skipped by defence towers.
    const sheltered = (unit) => !!this.siegeMatch?.isSheltered(unit);
    for (const minion of this.minions) {
      if (minion.team !== myTeam && !minion.isDead && minion.isMobileCombatant) targets.push(minion);
    }
    for (const summon of spells.getSummons()) {
      if (summon.team !== myTeam && summon.isMobileCombatant) targets.push(summon);
    }
    if (myTeam === 'red' && this.player.isAlive && this.player.isMobileCombatant && !sheltered(this.player)) targets.push(this.player);
    if (this.primal && myTeam !== this.primal.team && this.primal.isTargetable && (!this.siegeMatch || this.primal.onLane)) targets.push(this.primal);
    if (myTeam === 'blue' && this.enemyChampion.isAlive && this.enemyChampion.isMobileCombatant && !sheltered(this.enemyChampion)) targets.push(this.enemyChampion);
    return targets;
  }

  findMinionTarget(minion) {
    const targetIsValid = (target) => {
      if (!target || target.team === minion.team || target.isDead || target.isDestroyed) return false;
      if (target.isObjective && target.isVulnerable === false) return false;
      if (target.heroKey && (target.surfaceId === 'blueCastleUpperPlatform' || target.surfaceId === 'redCastleUpperPlatform')) return false;
      if (String(target.surfaceId).endsWith('CastleDeck')) return false;
      if (this.siegeMatch?.isSheltered(target)) return false;
      return true;
    };
    // A brief lock stops the crowd from frame-by-frame target thrashing while
    // still letting nearby threats interrupt a march toward an objective.
    if (minion.targetLockTimer > 0 && targetIsValid(minion.target)) {
      const retainedDistance = groundDistance(minion, minion.target);
      if (minion.target.isObjective || retainedDistance < 225) return minion.target;
    }
    const commit = (target) => { minion.target = target; minion.targetLockTimer = target ? 0.55 : 0; return target; };
    // A hostile wall right in front of a minion is attacked instead of
    // pushing into it forever. The proxy's position is the wall's nearest
    // point, so lateral walls are reachable from any side.
    const blockingWall = spells.activeSpells.find((spell) => spell.isStoneWall && !spell.isDead && spell.team !== minion.team
      && Math.abs(spell.x - minion.x) <= spell.halfX + 34 && Math.abs(spell.z - minion.z) <= spell.halfZ + .1);
    if (blockingWall) {
      const wall = blockingWall;
      return commit({
        team: wall.team, isWallProxy: true,
        x: Math.max(wall.x - wall.halfX, Math.min(wall.x + wall.halfX, minion.x)),
        z: Math.max(wall.z - wall.halfZ, Math.min(wall.z + wall.halfZ, minion.z)),
        get y() { return wall.y; }, worldHeight: wall.surfaceHeight, radius: 6,
        get isDead() { return wall.isDead; },
        takeDamage: (amount) => wall.takeDamage(amount)
      });
    }
    const enemies = this.minions.filter((candidate) => candidate.team !== minion.team && !candidate.isDead);
    let nearest = null; let nearestDistance = Infinity;
    for (const enemy of enemies) {
      const distance = Math.hypot(enemy.x - minion.x, (enemy.z - minion.z) * 150);
      if (distance < nearestDistance) { nearest = enemy; nearestDistance = distance; }
    }
    if (nearest && nearestDistance < 150) return commit(nearest);
    const wizard = minion.team === 'blue' ? this.enemyChampion : this.player;
    if (wizard.isAlive && wizard.surfaceId !== 'blueCastleUpperPlatform' && wizard.surfaceId !== 'redCastleUpperPlatform') {
      const wizardDistance = Math.hypot(wizard.x - minion.x, (wizard.z - minion.z) * 150);
      if (wizardDistance < 180 || this.activeMode?.objectives === false) return commit(wizard);
    }
    if (this.activeMode?.objectives === false) {
      if (nearest) return commit(nearest);
      return commit(null);
    }
    const enemyTeam = minion.team === 'blue' ? 'red' : 'blue';
    const objectives = this.battlefield.getObjectivesForTeam(enemyTeam)
      .filter((objective) => !objective.isDestroyed && (objective.isVulnerable !== false));
    return commit(objectives[0] ?? null);
  }

  isMatchRunning() { return this.matchState === 'Running'; }

  setObjectivePhase(phase) {
    this.objectivePhase = phase;
    this.matchPhase = phase;
  }

  canRespawn(team) {
    if (!this.isMatchRunning()) return false;
    if (this.activeMode?.respawn === 'unlimited') return true;
    if (this.activeMode?.respawn === 'none') return false;
    return !this.battlefield.getCastle(team).isDestroyed;
  }

  onTowerDestroyed(tower, castle) {
    this.showAnnouncement(`${tower.team.toUpperCase()} TOWER FALLEN — CASTLE VULNERABLE`, 2.5);
    this.setObjectivePhase('CastlePhase');
    this.stats.towersDestroyed[tower.team] = true;
  }

  onCastleDestroyed(castle) {
    if (this.activeMode?.id === 'invasion' && castle.team === 'blue') {
      this.finishMode('red', 'DEFEAT — YOUR CASTLE HAS FALLEN');
      return;
    }
    if (this.activeMode?.objectives === false) return;
    this.setObjectivePhase('FinalWizardPhase');
    this.stats.castlesDestroyed[castle.team] = true;
    this.showAnnouncement(`${castle.team.toUpperCase()} CASTLE DESTROYED — DEFEAT THE WIZARD`, 3);
  }

  onFinalWizardDeath(team) {
    if (!this.isMatchRunning()) return;
    if (this.activeMode?.id === 'training') return;
    if (this.activeMode?.id === 'dungeon' && team === 'red') return;
    if (this.activeMode?.id === 'invasion') {
      if (team === 'blue') this.finishMode('red', 'DEFEAT — THE WIZARD HAS FALLEN');
      return;
    }
    this.winnerTeam = team === 'blue' ? 'red' : 'blue';
    this.matchState = 'Ending';
    this.endingTimer = 0.9;
    this.input.gameplayBlocked = true;
    this.showAnnouncement(this.winnerTeam === 'blue' ? 'VICTORY — ENEMY WIZARD DEFEATED' : 'DEFEAT — YOUR WIZARD HAS FALLEN', 1.1);
    combat.shakeCamera(20, 1);
  }

  recordWizardDeath(team) {
    if (!this.isMatchRunning() || !this.stats) return;
    const killer = team === 'blue' ? 'red' : 'blue';
    this.stats.wizardKills[killer]++;
    if (team === 'blue') this.stats.playerDeaths++;
    if (team === 'red' && this.activeMode?.id === 'dungeon') this.awardRunXp(65);
  }

  getObjectiveStatus() {
    if (this.matchState === 'Ending' || this.matchState === 'Results') return this.winnerTeam === 'blue' ? 'VICTORY' : 'DEFEAT';
    if (this.activeMode?.id === 'invasion') return this.modeState?.bossActive ? 'DEFEAT THE RIFT TYRANT' : `DEFEND LEFT KEEP — WAVE ${this.modeState?.wave ?? 1}/${this.activeMode.waveGoal}`;
    if (this.activeMode?.id === 'dungeon') return this.isRunChoicePending() ? 'CHOOSE A FOUND RUNE' : this.modeState?.stage === 4 ? 'DEFEAT THE VOID WARDEN' : this.modeState?.stage === 0 ? 'DEFEAT THE SCOUT WITH MELEE' : this.isDungeonExitOpen() ? `DUNGEON ROOM ${this.modeState.stage} CLEARED — GO RIGHT` : `DUNGEON ROOM ${this.modeState?.stage} — PUSH FORWARD`;
    if (this.activeMode?.id === 'arena') {
      if (this.modeState?.transformationRelic) return 'CLAIM THE TRANSFORMATION RELIC — DEFEAT THE CHAMPION';
      return this.modeState?.runeCollectibles?.length ? 'COLLECT RUNE RELICS — DEFEAT THE CHAMPION' : 'DEFEAT THE ARENA CHAMPION';
    }
    if (this.activeMode?.id === 'training') return 'PRACTICE — NO REWARDS';
    const tower = this.battlefield.redTower;
    const castle = this.battlefield.redCastle;
    if (!tower.isDead) return `DESTROY ENEMY TOWER ${Math.ceil(tower.hp)}/${tower.maxHp}`;
    if (!castle.isDestroyed) return `DESTROY ENEMY CASTLE ${Math.ceil(castle.hp)}/${castle.maxHp} · ${segmentStatus(castle)}`;
    return 'DEFEAT ENEMY WIZARD';
  }

  attachBattlefieldCallbacks() {
    this.battlefield.onTowerDestroyed = (tower, castle) => this.onTowerDestroyed(tower, castle);
    this.battlefield.onCastleDestroyed = (castle) => this.onCastleDestroyed(castle);
    this.battlefield.onProtectedCastleHit = (castle) => this.showAnnouncement(`${castle.team.toUpperCase()} CASTLE PROTECTED — DESTROY THE TOWER FIRST`, 1.5);
  }

  prepareDefaultRunes() {
    if (this.activeMode?.progression !== 'profile') {
      this.player.configureRuneDeck([]);
      return;
    }
    // Siege, Invasion and Training use the Hub-selected persistent Grimoire.
    const deck = this.profile.getMatchDeck()
      .map((id) => recognizer.runes.find((candidate) => candidate.id === id)).filter(Boolean);
    this.player.configureRuneDeck(deck);
  }

  applyProfile() {
    applyMageProfile(this.player, this.profile);
    ui.renderProfile?.(this.profile);
  }

  reportProfileProgress(progress, rune = null) {
    const unlocked = progress?.newlyUnlockedRunes ?? [];
    if (unlocked.length) {
      this.showAnnouncement(`${unlocked.map((entry) => entry.title).join(' · ')} — ADD IN DECK BUILDER`, 2.8);
    } else if (progress?.runeLevelUp && rune) {
      this.showAnnouncement(`${rune.name} RUNE LEVEL ${progress.runeLevel}`, 1.8);
    } else if (progress?.levels > 0) {
      this.showAnnouncement(`MAGE LEVEL ${this.profile.level} — SKILL POINT READY`, 2.4);
    }
  }

  addNewRuneCards(runeIds) {
    if (!this.player || !Array.isArray(runeIds) || !runeIds.length) return;
    for (const id of runeIds) {
      const rune = recognizer.runes.find((candidate) => candidate.id === id);
      if (rune) this.player.runeDeck.push(this.player.makeRuneCard(rune));
    }
  }

  updateMatchDeck(action, runeId = null) {
    if (this.deckEditTarget) return this.editTrainingDeck(action, runeId);
    let result;
    if (action === 'reset') {
      this.profile.resetMatchDeck();
      result = { ok: true, message: 'STARTER DECK RESTORED' };
    } else if (action === 'add') result = this.profile.addRuneToDeck(runeId);
    else if (action === 'remove') result = this.profile.removeRuneFromDeck(runeId);
    else return false;
    if (!result.ok) {
      this.showAnnouncement(`DECK: ${result.reason}`, 1.2);
      return false;
    }
    this.applyProfile();
    ui.renderDeckBuilder?.(this.profile);
    if (result.message) this.showAnnouncement(result.message, 1.3);
    return true;
  }

  unlockMageSkill(id) {
    if (!this.profile.unlock(id)) {
      this.showAnnouncement('SKILL LOCKED — NEED POINTS / PREREQUISITE');
      return false;
    }
    this.applyProfile();
    const node = MAGE_SKILL_TREE.find((entry) => entry.id === id);
    ui.renderSkillTree?.(this.profile);
    this.showAnnouncement(`UNLOCKED: ${node?.title ?? id}`, 1.8);
    return true;
  }

  noteSpellDiscovery(spell) {
    if (!spell || spell.tier < 2 || !this.profile.discoverSpell(spell.id)) return;
    this.showAnnouncement(`DISCOVERED: ${spell.name}`, 2.1);
  }

  resetMatch() {
    spells.clearRuntime(); environment.clear();
    combat.resetEffects();
    this.activeMode = getGameMode(this.matchMode);
    this.battlefield = new Battlefield(this.activeMode, { trainingMapId: this.trainingMapId });
    // Field weapons only live in Training.
    this.armory?.clear();
    this.attachBattlefieldCallbacks();
    const spawn = this.battlefield.getSpawn('blue');
    this.player = new Player(spawn.x, spawn.z);
    this.player.heroKey = this.selectedHeroKey ?? ui.getSelectedHero?.() ?? 'paladin';
    this.enemyChampion = new EnemyChampion(ARENA_LAYOUT.spawns.redCastle.x, ARENA_LAYOUT.spawns.redCastle.z, 'warlord');
    this.battlefield.placeOnSurface(this.player);
    this.applyProfile();
    this.battlefield.placeOnSurface(this.enemyChampion);
    this.minions = [];
    this.projectiles = [];
    this.setObjectivePhase(this.activeMode.objectives ? 'LanePhase' : 'CombatPhase');
    this.winnerTeam = null;
    this.endingTimer = 0;
    this.matchTime = this.matchDuration;
    this.menuPaused = false;
    this.stats = { wizardKills: { blue: 0, red: 0 }, playerDeaths: 0, towersDestroyed: { blue: false, red: false }, castlesDestroyed: { blue: false, red: false } };
    this.drawing.active = false;
    this.drawing.strokes = [];
    this.drawing.currentStroke = [];
    this.targetTimeScale = this.timeScale = 1;
    this.input.gameplayBlocked = false;
    this.mountCandidate = null;
    this.prepareDefaultRunes();
    this.setupModeMatch();
    this.spawnPrimal();
  }

  // ── Primals ───────────────────────────────────────────────────────────
  get primalChoice() { return normalizePrimalChoice(ui.selectedCompanion); }
  get primalStage() {
    if (this._primalStage) return this._primalStage;
    try { return Math.max(1, Math.min(3, parseInt(globalThis.localStorage?.getItem?.('grimge-primal-stage') ?? '1', 10) || 1)); } catch { return 1; }
  }

  // The Wizard's Primal joins Siege, Invasion and Training.
  spawnPrimal() {
    if (this.player?.primalBond) this.player.primalBond = null;
    this.primal = null;
    const mode = this.activeMode?.id;
    if (!['siege', 'invasion', 'training'].includes(mode) || this.primalChoice === 'none') return null;
    this.primal = new PrimalCompanion(this.player, this.primalChoice, this.primalStage);
    if (this.siegeMatch) this.primal.returnToPlatform(this);
    else this.primal.place(this, this.player.x - (this.player.facing || 1) * 24, this.player.z - .05);
    return this.primal;
  }

  // Training: cycle NONE → WOLF I–III → TURTLE I–III (B / PRIMAL button).
  cyclePrimal() {
    const order = ['none', 'wolf:1', 'wolf:2', 'wolf:3', 'turtle:1', 'turtle:2', 'turtle:3'];
    const current = this.primalChoice === 'none' ? 'none' : `${this.primalChoice}:${this.primalStage}`;
    const next = order[(order.indexOf(current) + 1) % order.length];
    const [choice, stage] = next.split(':');
    ui.setHubCompanion?.(choice);
    if (stage) {
      this._primalStage = Number(stage);
      try { globalThis.localStorage?.setItem?.('grimge-primal-stage', stage); } catch { /* optional */ }
    }
    this.spawnPrimal();
    if (choice === 'none') this.showAnnouncement('NO PRIMAL — T TRANSFORMS INTO FOCUS ASCENDANT', 1.4);
    else this.showAnnouncement(`${PRIMAL_ARCHETYPES[choice].name} ${'I'.repeat(Number(stage))} — ${bondForm(choice, Number(stage)).name.toUpperCase()}`, 1.4);
    return next;
  }

  startMatch() {
    // Pointer controls emit pointerdown followed by click. Do not let the
    // follow-up click rebuild a just-started match and do not restart an
    // already live game through an accidental overlay tap.
    if (this.matchState === 'Running' || this.matchState === 'Ending') return;
    if (this.activeMode.progression === 'profile' && !this.profile.isDeckReady()) {
      this.showAnnouncement(`BUILD A ${10}-CARD RUNE DECK FIRST`, 1.8);
      ui.showHub(true);
      return;
    }
    this.resetMatch();
    this.matchState = 'Running';
    this.syncOrientationState();
    ui.showHub(false);
    ui.showResults(false);
    this.showAnnouncement(this.activeMode.objective, 1.5);
  }

  restartMatch() {
    if (this.activeMode.progression === 'profile' && !this.profile.isDeckReady()) return false;
    this.resetMatch();
    this.matchState = 'Running';
    this.syncOrientationState();
    ui.showHub(false);
    ui.showResults(false);
    this.showAnnouncement(`${this.activeMode.label} RESTARTED`, 1.1);
    return true;
  }

  setMenuPaused(open) {
    this.menuPaused = !!open && this.isMatchRunning();
    this.clearGameplayInput();
  }

  completeResults() {
    if (this.matchState !== 'Ending') return;
    this.matchState = 'Results';
    this.projectiles = [];
    spells.clearRuntime(); environment.clear();
    // A compact match reward gives the tree a real play loop without making
    // results depend on a server or a browser reload.
    let progression = null;
    if (this.activeMode.progression === 'profile') {
      const reward = this.winnerTeam === 'blue' ? 60 : 25;
      progression = this.profile.awardXp(reward);
      this.applyProfile();
    }
    this.reportProfileProgress(progression);
    ui.showResults(true, { winner: this.winnerTeam, elapsed: this.matchDuration - this.matchTime, stats: this.stats });
  }

  returnToHub() {
    this.matchState = 'Menu';
    this.orientationBlocked = false;
    this.menuPaused = false;
    document.body?.classList?.remove?.('portrait-gameplay');
    this.input.gameplayBlocked = true;
    this.projectiles = [];
    spells.clearRuntime(); environment.clear();
    this.drawing.active = false;
    this.targetTimeScale = this.timeScale = 1;
    ui.setDrawingMode(false);
    ui.showResults(false);
    ui.hideRunRuneChoice?.();
    ui.showHub(true);
  }

  spawnMinionBolt(x, z, facing, team, damage, targetZ = z, height = 18) {
    this.projectiles.push({
      type: 'bolt',
      x, z,
      targetZ,
      height,
      vx: facing * 440,
      vy: 0,
      facing,
      team,
      damage,
      life: 1.2,
      radius: 5
    });
  }

  spawnTowerOrb(startX, startZ, target, team, damage, height = 95) {
    this.projectiles.push({
      type: 'towerOrb',
      x: startX,
      z: startZ,
      height,
      target,
      team,
      damage,
      speed: 480,
      life: 2.0,
      radius: 8
    });
  }

  showAnnouncement(msg, dur = 2.0) {
    ui.showAnnouncement(msg, dur);
  }

  loop(currentTime) {
    if (!this.running) return;

    let dt = (currentTime - this.lastFrameTime) * 0.001;
    this.lastFrameTime = currentTime;
    if (dt > 0.1) dt = 0.1;
    this.gamepad.poll(dt);
    if (this.targeting.isActive && (!this.isMatchRunning() || !this.player.isAlive)) this.targeting.cancel();

    this.syncOrientationState();
    // A portrait device gets a full rotate screen rather than a tiny live
    // landscape canvas. Keep the loop alive for orientation changes but do
    // not resolve hidden combat, timers, AI, or stale touch input.
    if (this.orientationBlocked) {
      this.input.gameplayBlocked = true;
      this.clearGameplayInput();
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    if (this.menuPaused) {
      this.input.gameplayBlocked = true;
      this.clearGameplayInput();
      this.render();
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    this.timeScale += (this.targetTimeScale - this.timeScale) * Math.min(1, dt * 10);
    const scaledDt = dt * this.timeScale;

    // 1. Rune drawing remains open for deliberate input. Once a stroke has
    // stopped for two seconds it locks in automatically; the circle still
    // provides an immediate manual lock-in.
    if (this.drawing.active) {
      ui.setDrawingMode(true);
      if (this.drawing.autoLockArmed && this.drawing.currentStroke.length === 0
        && performance.now() - this.drawing.lastStrokeTime >= 2000) {
        this.confirmRuneDrawing(true);
      }
    }

    // A rune pick is a true run-level pause: no AI, wave timer, projectiles
    // or match clock advances while the player chooses one of two runes.
    if (this.isRunChoicePending()) {
      this.input.gameplayBlocked = true;
      this.clearGameplayInput();
      this.render();
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    // 2. Match Timer — only active play contributes to the final result.
    if (this.isMatchRunning()) this.matchTime = Math.max(0, this.matchTime - dt);

    // 3. Combat Engine Update
    const normalFrame = combat.update(
      scaledDt,
      this.player.x,
      this.player.y,
      this.logicalWidth,
      this.logicalHeight,
      this.battlefield
    );

    if (normalFrame && this.isMatchRunning()) {
      this.battlefield.update(scaledDt, this);
      this.input.gameplayBlocked = this.drawing.active || this.isRunChoicePending();
      this.refreshMovement();
      this.updateMountCandidate();

      this.player.update(scaledDt, this.input, this.battlefield, this);
      this.enemyChampion.update(scaledDt, this, this.battlefield);
      this.siegeMatch?.tick(scaledDt);
      this.primal?.update(scaledDt, this);
      this.noteFallenWizards();
      this.updateArenaRuneCollectibles();

      if (this.isMatchRunning()) {
        for (let i = this.minions.length - 1; i >= 0; i--) {
          const m = this.minions[i];
          m.update(scaledDt, this, this.battlefield);
          if (m.isDead) {
            if (!m.isTrainingDummy) spells.recordGrave(m);
            if (m.team === 'red' && !m.isRescuedCompanion) {
              if (this.activeMode?.id === 'dungeon') this.awardRunXp(m.runXpValue ?? (m.type === 'ranged' ? 14 : 11));
              this.trySpawnPotion(m.x, m.z);
            }
            this.minions.splice(i, 1);
          }
        }

        this.updateProjectiles(scaledDt);

        spells.update(scaledDt, this);
        environment.update(scaledDt, this, spells.getSummons());
        if (this.activeMode?.id === 'training') this.armory.update(scaledDt, environment, this.battlefield.boundsOverride);
        this.updatePotions(scaledDt);
        this.updateMode(scaledDt);
      }
    }

    // Ending deliberately does not run combat AI, spawns, projectiles, or
    // player input. It still receives real dt so feedback can resolve and the
    // game always reaches a usable Results screen.
    if (this.matchState === 'Ending') {
      this.endingTimer -= dt;
      if (this.endingTimer <= 0) this.completeResults();
    }

    this.updateMountCandidate();
    ui.update(dt, this.player, this.hudOpponent(), this.battlefield);

    this.input.justPressedKeys = {};
    this.input.justPressedMouse = {};

    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  // A fallen Wizard leaves a grave once per death (Revenant Call).
  noteFallenWizards() {
    for (const wizard of [this.player, this.enemyChampion]) {
      if (!wizard) continue;
      if (wizard.lifeState === 'Alive') { wizard._graveNoted = false; continue; }
      if (!wizard._graveNoted) { wizard._graveNoted = true; spells.recordGrave(wizard); }
    }
  }

  // Everyone who casts a round shadow on the ground this frame.
  shadowCasters() {
    const list = [...this.minions, ...spells.activeSummons.filter((summon) => !summon.isDead && !summon.isFlying)];
    if (this.enemyChampion.lifeState !== 'Dead') list.push(this.enemyChampion);
    if (this.player.lifeState !== 'Dead' && !this.player.isMounted) list.push(this.player);
    return list;
  }

  resolveSpellObstacles(entity, previousX, previousZ) {
    if (!entity?.isMobileCombatant) return false;
    // Training castles are solid (their footprint reaches into the arena edge).
    const castleMap = this.activeMode?.id === 'training' ? this.battlefield?.trainingMap?.id : null;
    // On (or above) a rampart the castle is the floor, not a wall.
    const onRampart = castleMap && (String(entity.surfaceId).endsWith('CastleDeck') || (entity.worldHeight ?? 0) >= castleDeckHeight(castleMap, 'blue') - 8);
    if (castleMap && !onRampart && castleBlocksAt(castleMap, entity.x, entity.z) && !castleBlocksAt(castleMap, previousX, previousZ)) {
      // Walking into a gate leads up onto that castle's rampart.
      if (this.enterCastleGate(entity, castleMap)) return true;
      entity.x = previousX; entity.z = previousZ;
      entity.vx *= .15; entity.vz *= .15;
      return true;
    }
    if (environment.blocks(entity) && !environment.blocksAt(entity, previousX, previousZ)) {
      entity.x = previousX; entity.z = previousZ;
      entity.vx *= .15; entity.vz *= .15;
      return true;
    }
    for (const spell of spells.activeSpells) {
      if (!spell.isStoneWall || spell.isFinished) continue;
      // Walls are solid for every Wizard — the caster included — and for
      // hostile units. Allied minions and summons slip through their own
      // side's walls so they never get stuck behind them.
      if (spell.team === entity.team && !entity.heroKey) continue;
      if ((entity.worldHeight ?? 0) > spell.surfaceHeight + spell.wallHeight + 18) continue;
      const inside = (x, z) => Math.abs(x - spell.x) <= spell.halfX + (entity.width ?? 24) * .5 && Math.abs(z - spell.z) <= spell.halfZ + .05;
      if (!inside(entity.x, entity.z)) continue;
      // A wall raised on top of someone never traps them: they can walk out.
      if (inside(previousX, previousZ)) continue;
      entity.x = previousX;
      entity.z = previousZ;
      entity.vx *= .15;
      entity.vz *= .15;
      return true;
    }
    return false;
  }

  // Kept as a named runtime step so simulated integration tests use the
  // identical projectile collision path as the live game loop.
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;

      if (p.type === 'bolt') {
        p.x += p.vx * dt;
        p.z += (p.targetZ - p.z) * Math.min(1, dt * 6);
        const targets = this.getHostileTargets(p.team);
        for (const t of targets) {
          const heightReach = t.hitHeightTolerance ?? 90;
          // A moving Wizard/minion needs a tight depth lane hit. A large
          // structure has an authored ground footprint, so a ranged minion
          // aiming from a front lane can legitimately strike the Tower core
          // rather than threading an implausible one-pixel rear-wall line.
          const depthHitTolerance = t.isObjective ? (t.hitRadiusZ ?? .35) : .15;
          if (Math.abs(t.x - p.x) < 22 && Math.abs((t.z ?? p.z) - p.z) < depthHitTolerance && Math.abs((t.worldHeight ?? 0) - p.height) < heightReach) {
            const outcome = t.takeDamage(p.damage, p.facing * 80, 40, 0.15, false, 'spell');
            if (outcome?.perfect) {
              // Reflect into the defender's team and give it a fresh travel
              // window so a perfect block is visibly useful rather than a
              // mere damage cancel.
              p.team = t.team;
              p.facing *= -1;
              p.vx *= -1;
              p.targetZ = t.z;
              p.x = t.x + t.facing * 18;
              p.z = t.z;
              p.height = t.worldHeight + 18;
              p.life = 1.05;
              combat.spawnShockwave(p.x, groundYForDepth(p.z) - p.height, 24, '#b3e5fc');
            } else p.life = 0;
            break;
          }
        }
      } else if (p.type === 'towerOrb') {
        if (p.target && p.target.hp > 0) {
          const dx = p.target.x - p.x;
          const dz = p.target.z - p.z;
          const targetHeight = p.target.worldHeight ?? 0;
          const dist = Math.hypot(dx, dz * 150, targetHeight - p.height);
          if (dist < 18) {
            const outcome = p.target.takeDamage(p.damage, Math.sign(dx) * 160, 80, 0.2, false, 'spell');
            if (outcome?.perfect) {
              const reflectedTargets = this.getHostileMobileTargets(p.target.team).filter((candidate) => candidate !== p.target);
              p.team = p.target.team;
              p.target = reflectedTargets[0] ?? null;
              p.x = p.target ? p.target.x + (p.target.facing ?? -1) * 50 : p.x;
              p.z = p.target ? p.target.z : p.z;
              p.height = p.target ? (p.target.worldHeight ?? 0) + 28 : p.height;
              p.life = p.target ? 1.5 : 0;
              combat.spawnShockwave(p.x, groundYForDepth(p.z) - p.height, 34, '#b3e5fc');
            } else {
              combat.spawnShockwave(p.x, groundYForDepth(p.z) - p.height, 30, p.team === 'blue' ? '#00e5ff' : '#ff1744');
              p.life = 0;
            }
          } else {
            p.x += (dx / dist) * p.speed * dt;
            p.z += (dz * 150 / dist) * (p.speed / 150) * dt;
            p.height += (targetHeight - p.height) / dist * p.speed * dt;
          }
        } else {
          p.life = 0;
        }
      }

      if (p.life <= 0) this.projectiles.splice(i, 1);
    }
  }

  render() {
    const ctx = this.ctx;
    const viewW = this.renderWidth;
    const viewH = this.renderHeight;
    const worldY = this.worldOffsetY;
    const cam = combat.camera;

    ctx.clearRect(0, 0, viewW, viewH);

    // 1. Scene Backdrop (the fixed 16:9 stage).
    ctx.save();
    ctx.translate(0, worldY);
    this.battlefield.renderBackground(ctx, cam, this.logicalWidth, this.logicalHeight, viewW, this.cameraOffsetX, this.modeState);
    ctx.restore();

    // 2. World Space Layer (with Camera Shake + Dungeon Scroll)
    const dungeonCamX = this.modeState?.dungeonCameraX ?? 0;
    ctx.save();
    ctx.translate(this.cameraOffsetX + cam.shakeX - dungeonCamX, cam.shakeY + worldY);

    // Foreground Crystal Glows on Beacons
    this.battlefield.renderForeground(ctx);
    // Ground effects (ice, fire, lava, craters…) lie under every actor.
    const groundPixel = Math.max(1, Math.round(spells.pixelVfx * (ctx.getTransform?.()?.a || 1)));
    renderPixelated(ctx, groundPixel, (layer) => environment.renderGround(layer));
    environment.renderGroundDetails(ctx, this.debugVisible);
    // Round ground shadows at every actor's real depth (smaller when high),
    // then ground decals such as Shadow Stomper tethers and graves.
    renderPixelated(ctx, groundPixel, (layer) => renderGroundShadows(layer, this.shadowCasters(), sky.shadowStyle()));
    spells.renderGroundDecals(ctx);
    this.renderDungeonRescue(ctx);
    this.renderPotions(ctx);
    this.renderArenaRuneCollectibles(ctx);
    this.renderArenaTransformationRelic(ctx);

    const actors = [...this.minions, ...environment.livingProps().map((prop) => ({ y: prop.y, render: (c) => renderProp(c, prop) })), ...this.armory.pickups.map((pickup) => ({ y: pickup.y, render: (c) => pickup.render(c) }))];
    if (this.enemyChampion.lifeState !== 'Dead') actors.push(this.enemyChampion);
    if (this.player.lifeState !== 'Dead' && !this.player.isMounted) actors.push(this.player);
    if (this.primal?.isTargetable) actors.push(this.primal);
    // Spells with a ground position and summons share the painter's order
    // with the actors, so a spike behind the dummy is hidden by the dummy.
    actors.push(...spells.depthEntries());
    actors.sort((a, b) => a.y - b.y);
    let spellBatch = [];
    for (const actor of actors) {
      if (actor.spell) { spellBatch.push(actor.spell); continue; }
      spells.renderBatch(ctx, spellBatch); spellBatch = [];
      actor.render(ctx);
    }
    spells.renderBatch(ctx, spellBatch);
    this.primal?.renderFocusMarker(ctx);

    // Projectiles
    this.renderProjectiles(ctx);

    // Spells
    spells.render(ctx, { depthSorted: true });
    sky.renderWorld(ctx);
    environment.renderAir(ctx);
    this.targeting.render(ctx);

    // Summons render with the spell layer. Draw the mounted wizard afterward
    // so they visibly sit on the creature instead of being hidden behind it.
    if (this.player.lifeState !== 'Dead' && this.player.isMounted) this.player.render(ctx);

    // Combat VFX
    combat.render(ctx);

    if (this.debugVisible) this.battlefield.renderDebug(ctx, this);

    ctx.restore();

    // The sky sphere tints the battlefield and hangs in the sky.
    sky.renderScreen(ctx, viewW, viewH, worldY);
    // Map weather (snow, rain, embers, leaves, dust, mana motes) in screen space.
    environment.renderWeather(ctx, viewW, viewH);
    this.renderDungeonExitArrow(ctx, viewW);

    // 3. Screen Space Rune Drawing
    if (this.drawing.active) {
      this.renderRuneStrokes();
    }
    this.updateStageBackdrop();
  }

  renderDungeonExitArrow(ctx, viewW) {
    if (!this.isDungeonExitOpen()) return;
    // Big pulsing LF2 "GO" arrow at the right screen edge: the room is
    // cleared and walking right enters the next room (no way back).
    const t = performance.now() * 0.001;
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    const scale = 1 + pulse * 0.14;
    const cx = viewW - 96 + pulse * 10;
    const cy = this.worldOffsetY + this.logicalHeight * 0.42;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(-58, -20); ctx.lineTo(4, -20); ctx.lineTo(4, -46);
    ctx.lineTo(58, 0);
    ctx.lineTo(4, 46); ctx.lineTo(4, 20); ctx.lineTo(-58, 20);
    ctx.closePath();
    ctx.shadowColor = '#ffd54f';
    ctx.shadowBlur = 18 + pulse * 16;
    ctx.fillStyle = `rgba(255, 213, 79, ${0.72 + pulse * 0.28})`;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a2400';
    ctx.stroke();
    ctx.fillStyle = '#3a2400';
    ctx.font = 'bold 20px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GO', -14, 1);
    ctx.restore();
  }

  renderDungeonRescue(ctx) {
    const rescue = this.modeState?.rescue;
    if (this.activeMode?.id !== 'dungeon' || !rescue || rescue.rescued) return;
    const y = groundYForDepth(rescue.z);
    const pulse = 0.5 + Math.sin(performance.now() * 0.007) * 0.18;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(70, 225, 255, ${pulse})`;
    ctx.beginPath(); ctx.arc(rescue.x, y - 32, 24, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Show the same Dawn Guard sprite that will join the party when freed.
    // This replaces the old anonymous stick-figure rescue marker while the
    // interaction range remains intentionally unchanged.
    sprites.renderEntity(ctx, 'dungeon_dawn_guard', rescue.x, y, {
      facing: 1,
      state: 'idle',
      animTime: performance.now() * 0.001,
      visualHeight: 78
    });
    ctx.fillStyle = '#7eeeff'; ctx.font = '10px Georgia'; ctx.textAlign = 'center';
    ctx.fillText('RESCUE', rescue.x, y - 57);
    ctx.restore();
  }

  renderArenaRuneCollectibles(ctx) {
    const relics = this.modeState?.runeCollectibles;
    if (this.activeMode?.id !== 'arena' || !relics?.length) return;
    const time = performance.now() * .005;
    ctx.save();
    ctx.textAlign = 'center';
    for (const relic of relics) {
      const y = groundYForDepth(relic.z) - 18 + Math.sin(time + relic.x) * 3;
      ctx.fillStyle = relic.rune.color ?? '#8cf'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(relic.x, y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#07101c'; ctx.font = 'bold 14px sans-serif';
      ctx.fillText(relic.rune.symbol ?? relic.rune.glyph ?? '✦', relic.x, y + 5);
    }
    ctx.restore();
  }

  renderArenaTransformationRelic(ctx) {
    const relic = this.modeState?.transformationRelic;
    if (this.activeMode?.id !== 'arena' || !relic) return;
    const y = groundYForDepth(relic.z) - 29 + Math.sin(performance.now() * .006 + relic.x) * 4;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#d596ff'; ctx.shadowColor = '#b668ff'; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(relic.x, y, 19, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff0af'; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
    ctx.fillStyle = '#170826'; ctx.font = 'bold 19px Georgia'; ctx.fillText('✦', relic.x, y + 7);
    ctx.fillStyle = '#f2d6ff'; ctx.font = 'bold 9px Georgia'; ctx.fillText('TRANSFORM', relic.x, y - 27);
    ctx.restore();
  }

  renderProjectiles(ctx) {
    ctx.save();
    for (const p of this.projectiles) {
      if (p.type === 'bolt') {
        ctx.fillStyle = p.team === 'blue' ? '#00e5ff' : '#ff9100';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, groundYForDepth(p.z) - p.height, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'towerOrb') {
        ctx.fillStyle = p.team === 'blue' ? '#00e5ff' : '#ff1744';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(p.x, groundYForDepth(p.z) - p.height, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // The rune to pre-draw: only in Training and only for a tapped hand card
  // (free drawing via DRAW never shows a template).
  runeGuide() {
    if (this.activeMode?.id !== 'training' || !this.drawing.active || this.drawing.expectedCardId == null) return null;
    const card = this.player.getRuneCard(this.drawing.expectedCardId);
    return card ? { id: card.id, color: card.color ?? '#ffffff' } : null;
  }

  renderRuneStrokes() {
    const rctx = this.runeCtx;
    this.clearRuneCanvas();

    rctx.save();
    rctx.fillStyle = 'rgba(8, 6, 18, 0.45)';
    rctx.fillRect(0, 0, this.renderWidth, this.renderHeight);

    const allStrokes = [...this.drawing.strokes];
    if (this.drawing.currentStroke.length > 0) {
      allStrokes.push(this.drawing.currentStroke);
    }

    // Training: a tapped hand rune is pre-drawn as a template to trace.
    const guide = this.runeGuide();
    if (guide) renderRuneGuide(rctx, guide.id, this.renderWidth / 2, this.renderHeight * .56, Math.min(this.renderWidth, this.renderHeight) * .24, guide.color);

    rctx.lineCap = 'round';
    rctx.lineJoin = 'round';
    // Gamepad pen cursor (right stick; hold RT to ink).
    const pen = this.drawing.gamepadPen;
    if (pen) {
      rctx.strokeStyle = '#fff59d'; rctx.lineWidth = 2;
      rctx.beginPath(); rctx.arc(pen.x, pen.y, 9, 0, Math.PI * 2); rctx.stroke();
    }

    for (const stroke of allStrokes) {
      if (stroke.length < 2) continue;

      rctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
      rctx.lineWidth = 14;
      rctx.shadowColor = '#00e5ff';
      rctx.shadowBlur = 20;

      rctx.beginPath();
      rctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        rctx.lineTo(stroke[i].x, stroke[i].y);
      }
      rctx.stroke();

      rctx.strokeStyle = '#ffffff';
      rctx.lineWidth = 4;
      rctx.shadowBlur = 4;
      rctx.stroke();
    }

    rctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new GameWorld();
  game.init();
});
