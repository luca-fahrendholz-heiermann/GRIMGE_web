// GRIMGE Prototype — Main Game Loop & Coordinator (Mockup Framing & High-Precision Touch/Mouse)
import { audio } from './audio.js';
import { sprites } from './sprites.js';
import { recognizer } from './recognizer.js';
import { combat } from './combat.js';
import { spells, RUNE_GRADE_PROFILES } from './spells.js';
import { Player, EnemyChampion, Minion } from './entities.js';
import { Battlefield } from './battlefield.js';
import { ui } from './ui.js';
import { VIEWPORT, ARENA_LAYOUT, groundDistance, groundYForDepth } from './world.js';
import { ART_ASSETS } from './art_assets.js';
import { MageProfile, MAGE_SKILL_TREE, applyMageProfile } from './progression.js';
import { getGameMode } from './game_modes.js';

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

    this.logicalWidth = VIEWPORT.width;
    this.logicalHeight = VIEWPORT.height;
    // Simulation coordinates deliberately remain the authored 1024×576
    // battlefield. Rendering receives a wider *camera* on ultrawide screens;
    // this never changes spawns, ranges, collision, or travel distance.
    this.renderWidth = this.logicalWidth;
    this.cameraOffsetX = 0;
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
    canvas.height = Math.round(this.logicalHeight * this.deviceScale);
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
    const rect = this.canvas.getBoundingClientRect();
    const height = rect.height;
    if (height > 0 && this.uiLayer) {
      // HUD scale follows the available height, not the width. This keeps the
      // perceived character/card size stable while an ultrawide viewport
      // exposes more horizontal world space.
      const scale = String(height / this.logicalHeight);
      // Custom CSS properties must be written through setProperty in a real
      // CSSStyleDeclaration. Bracket assignment happened to work in the test
      // stub but is ignored by browsers, leaving a 1024px HUD over a scaled
      // Canvas.
      if (this.uiLayer.style.setProperty) this.uiLayer.style.setProperty('--hud-scale', scale);
      else this.uiLayer.style['--hud-scale'] = scale;
      this.uiLayer.style.width = `${this.renderWidth}px`;
      const lw = String(this.renderWidth / 100);
      if (this.uiLayer.style.setProperty) this.uiLayer.style.setProperty('--lw', `${lw}px`);
      else this.uiLayer.style['--lw'] = `${lw}px`;

      // `env(safe-area-inset-*)` values are physical CSS pixels. The HUD is
      // transformed from a fixed 1024×576 logical surface, so convert the
      // insets before using them for individual controls. The arena/canvas
      // itself deliberately remains edge-to-edge.
      const probe = document.getElementById?.('safe-area-probe');
      const computed = probe && globalThis.getComputedStyle?.(probe);
      const toLogical = (value) => Math.max(0, (Number.parseFloat(value) || 0) / Number(scale));
      const safe = {
        top: toLogical(computed?.paddingTop),
        right: toLogical(computed?.paddingRight),
        bottom: toLogical(computed?.paddingBottom),
        left: toLogical(computed?.paddingLeft)
      };
      // Some iOS standalone launches expose the Home Indicator inset a paint
      // late. Reserve its small physical clearance immediately for installed
      // iPhone/iPad apps, then let the real env() value take precedence.
      const nav = globalThis.navigator;
      const isIOS = /iPad|iPhone|iPod/.test(nav?.userAgent || '')
        || (nav?.platform === 'MacIntel' && (nav?.maxTouchPoints || 0) > 1);
      const isStandalone = globalThis.matchMedia?.('(display-mode: standalone)')?.matches || nav?.standalone === true;
      if (isIOS && isStandalone) safe.bottom = Math.max(safe.bottom, toLogical('22px'));
      for (const [edge, value] of Object.entries(safe)) {
        this.uiLayer.style.setProperty?.(`--safe-${edge}`, `${value}px`);
      }
      this.uiLayer.classList?.toggle?.('has-safe-area', Object.values(safe).some(value => value > .5));
    }
  }

  updateViewport() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || globalThis.innerWidth || this.logicalWidth;
    const height = rect.height || globalThis.innerHeight || this.logicalHeight;
    if (width <= 0 || height <= 0) return;

    // Constant logical height, variable camera width. Keep the full authored
    // arena on narrow landscape displays, then add only visual overscan on
    // wider ones. Gameplay continues to use logicalWidth everywhere.
    const nextRenderWidth = Math.max(this.logicalWidth, Math.round(this.logicalHeight * (width / height)));
    const nextDeviceScale = Math.min(2, globalThis.window?.devicePixelRatio || globalThis.devicePixelRatio || 1);
    const changed = nextRenderWidth !== this.renderWidth || nextDeviceScale !== this.deviceScale;
    this.renderWidth = nextRenderWidth;
    this.deviceScale = nextDeviceScale;
    this.cameraOffsetX = (this.renderWidth - this.logicalWidth) * 0.5;
    if (changed || this.canvas.width !== Math.round(this.renderWidth * this.deviceScale)) {
      this.configureCanvas(this.canvas, this.ctx);
      this.configureCanvas(this.runeCanvas, this.runeCtx);
      this.clearRuneCanvas();
    }
    this.syncHudScale();
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
    await sprites.loadAll();

    window.gameWorld = this;
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
    const scaleY = this.logicalHeight / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      if (this.matchState === 'Results') {
        if (e.code === 'Enter') this.startMatch();
        if (e.code === 'Escape') this.returnToHub();
        return;
      }
      if (this.matchState === 'Menu') {
        if (e.code === 'Enter' || e.code === 'Space') this.startMatch();
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

      // Hero Swapping (Keys 1-6)
      if (e.code === 'Digit1') { this.player.setHero('paladin'); ui.updateActiveHeroBtn('paladin'); }
      if (e.code === 'Digit2') { this.player.setHero('berserker'); ui.updateActiveHeroBtn('berserker'); }
      if (e.code === 'Digit3') { this.player.setHero('mage'); ui.updateActiveHeroBtn('mage'); }
      if (e.code === 'Digit4') { this.player.setHero('warlord'); ui.updateActiveHeroBtn('warlord'); }
      if (e.code === 'Digit5') { this.player.setHero('fighter'); ui.updateActiveHeroBtn('fighter'); }
      if (e.code === 'Digit6') { this.player.setHero('darklord'); ui.updateActiveHeroBtn('darklord'); }

      // Cast Spell (E)
      if (e.code === 'KeyE') this.castPreparedSpell();

      // Earned Focus is a match-only transformation resource. It deliberately
      // stays off the rune deck so a full meter remains a fast tactical choice.
      if (e.code === 'KeyT') this.activateFocusTransformation();

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

      if (this.drawing.active && (this.input.mouse.isDown || this.input.mouse.rightDown)) {
        this.addRunePoint(pt.x, pt.y);
      }
    });

    window.addEventListener('mouseup', (e) => {
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
    let joystickOrigin = null;
    let joystickMoved = false;
    let lastLeftTap = null;
    let controlTapPointerId = null;
    let suppressControlTapRecord = false;
    const JOYSTICK_RADIUS = 66;
    const beginJoystick = (event) => {
      if (event.pointerType && event.pointerType !== 'touch') return false;
      const pt = this.getCanvasCoords(event.clientX, event.clientY);
      // A dynamic stick belongs to the left thumb.  The right half remains a
      // combat gesture surface and is never stolen for movement.
      if (pt.x > this.renderWidth * 0.48 || this.drawing.active || !this.isMatchRunning()) return false;
      pointerId = event.pointerId;
      joystickOrigin = pt;
      joystickMoved = false;
      joystick.style.left = `${Math.max(0, Math.min(this.renderWidth - JOYSTICK_RADIUS * 2, pt.x - JOYSTICK_RADIUS))}px`;
      joystick.style.top = `${Math.max(0, Math.min(this.logicalHeight - JOYSTICK_RADIUS * 2, pt.y - JOYSTICK_RADIUS))}px`;
      joystick.style.bottom = 'auto';
      joystick.classList.add('is-active');
      this.canvas.setPointerCapture?.(pointerId);
      ui.placeDrawNearJoystick(pt.x, pt.y);
      update(event);
      return true;
    };
    const update = (event) => {
      if (pointerId !== event.pointerId) return;
      const rect = joystick.getBoundingClientRect();
      const radius = rect.width * 0.5;
      let dx = event.clientX - (rect.left + radius);
      let dy = event.clientY - (rect.top + radius);
      const length = Math.hypot(dx, dy);
      if (length > radius) { dx = dx / length * radius; dy = dy / length * radius; }
      const deadzone = radius * 0.14;
      if (joystickOrigin) {
        const moved = this.getCanvasCoords(event.clientX, event.clientY);
        if (Math.hypot(moved.x - joystickOrigin.x, moved.y - joystickOrigin.y) > 16) joystickMoved = true;
      }
      this.input.touchMove.x = Math.abs(dx) < deadzone ? 0 : dx / radius;
      this.input.touchMove.z = Math.abs(dy) < deadzone ? 0 : dy / radius;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const clear = (event) => {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      this.input.touchMove.x = 0; this.input.touchMove.z = 0;
      knob.style.transform = 'translate(0, 0)';
      joystick.classList.remove('is-active');
      // Restoring classic after a touch is important: it is the original
      // fixed joystick layout, whereas only the alternate setting is meant
      // to leave the stick at a dynamic touch origin.
      if (ui.touchLayout !== 'alternate') {
        joystick.style.removeProperty?.('left');
        joystick.style.removeProperty?.('top');
        joystick.style.removeProperty?.('bottom');
      }
      const released = this.getCanvasCoords(event.clientX, event.clientY);
      if (!joystickMoved) lastLeftTap = { x: released.x, y: released.y, time: performance.now() };
      else lastLeftTap = null;
      joystickOrigin = null;
    };
    const beginAttackGesture = (event) => {
      if (event.pointerType && event.pointerType !== 'touch') return;
      if (this.drawing.active || !this.isMatchRunning() || event.pointerId === pointerId) return;
      const pt = this.getCanvasCoords(event.clientX, event.clientY);
      if (pt.x < this.renderWidth * 0.48) return;
      attackPointerId = event.pointerId;
      attackStart = pt;
      this.canvas.setPointerCapture?.(attackPointerId);
    };
    const handleLeftDoubleTap = (event) => {
      if (event.pointerType && event.pointerType !== 'touch') return false;
      const pt = this.getCanvasCoords(event.clientX, event.clientY);
      if (pt.x > this.renderWidth * 0.48 || !this.isMatchRunning()) return false;
      const now = performance.now();
      const isDoubleTap = lastLeftTap
        && now - lastLeftTap.time <= 340
        && Math.hypot(pt.x - lastLeftTap.x, pt.y - lastLeftTap.y) <= 30;
      if (isDoubleTap) {
        lastLeftTap = null;
        if (this.drawing.active) this.lockOrExitRuneDrawing();
        else {
          this.startRuneDrawing();
          // The second tap that opens Arcane Focus must not also become the
          // first ink dot of the rune gesture.
          controlTapPointerId = event.pointerId;
          suppressControlTapRecord = true;
          this.drawing.inputMode = 'left-control';
          this.drawing.touchId = event.pointerId;
          this.canvas.setPointerCapture?.(controlTapPointerId);
        }
        return true;
      }
      // While drawing, reserve the first left tap of the next double-tap so
      // it cannot be accidentally appended as an ink stroke.
      if (this.drawing.active) {
        controlTapPointerId = event.pointerId;
        this.drawing.inputMode = 'left-control';
        this.drawing.touchId = event.pointerId;
        this.canvas.setPointerCapture?.(controlTapPointerId);
        return true;
      }
      return false;
    };
    const finishLeftControlTap = (event) => {
      if (controlTapPointerId !== event.pointerId) return;
      const pt = this.getCanvasCoords(event.clientX, event.clientY);
      controlTapPointerId = null;
      if (this.drawing.inputMode === 'left-control') {
        this.drawing.inputMode = null;
        this.drawing.touchId = null;
      }
      if (suppressControlTapRecord) {
        suppressControlTapRecord = false;
        lastLeftTap = null;
      } else lastLeftTap = { x: pt.x, y: pt.y, time: performance.now() };
    };
    const finishAttackGesture = (event) => {
      if (attackPointerId !== event.pointerId || !attackStart) return;
      const end = this.getCanvasCoords(event.clientX, event.clientY);
      const dx = end.x - attackStart.x;
      const dy = end.y - attackStart.y;
      attackPointerId = null;
      attackStart = null;
      this.performTouchAttackGesture(dx, dy);
    };

    // The old fixed joystick remains a valid direct target while visible,
    // while the canvas itself creates it dynamically anywhere on the left.
    joystick.addEventListener('pointerdown', (event) => {
      pointerId = event.pointerId;
      joystick.setPointerCapture?.(pointerId);
      update(event);
    });
    joystick.addEventListener('pointermove', update);
    joystick.addEventListener('pointerup', clear);
    joystick.addEventListener('pointercancel', clear);
    this.canvas.addEventListener('pointerdown', (event) => {
      if (handleLeftDoubleTap(event)) {
        event.preventDefault?.();
        return;
      }
      if (beginJoystick(event)) {
        event.preventDefault?.();
        return;
      }
      beginAttackGesture(event);
    }, { passive: false });
    window.addEventListener('pointermove', update, { passive: false });
    window.addEventListener('pointerup', (event) => { clear(event); finishLeftControlTap(event); finishAttackGesture(event); }, { passive: false });
    window.addEventListener('pointercancel', (event) => { clear(event); controlTapPointerId = null; attackPointerId = null; attackStart = null; }, { passive: false });
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
    const threshold = 34;
    const distance = Math.hypot(dx, dy);
    let attackKind = 'normal';
    // Right-half up-swipe is an uppercut; a right-swipe is the compact heavy
    // lunge. In the air a down-swipe becomes the existing dive strike.
    if (!this.player.grounded && dy > threshold && Math.abs(dy) > Math.abs(dx)) attackKind = 'dive';
    else if (dy < -threshold && Math.abs(dy) > Math.abs(dx)) attackKind = 'uppercut';
    else if (dx > threshold && Math.abs(dx) >= Math.abs(dy)) attackKind = 'heavy';
    else if (distance > threshold) return false;
    return this.player.executeAttack(this.input, attackKind);
  }

  refreshMovement() {
    const keys = this.input.keys;
    const keyboard = {
      x: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
      z: (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0)
    };
    const x = keyboard.x || this.input.touchMove.x;
    const z = keyboard.z || this.input.touchMove.z;
    const magnitude = Math.hypot(x, z);
    this.input.move.x = magnitude > 1 ? x / magnitude : x;
    this.input.move.z = magnitude > 1 ? z / magnitude : z;
  }

  startRuneDrawing(expectedCardId = null) {
    if (!this.isMatchRunning() || this.drawing.active || !this.player.isAlive) return;
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
    const result = recognizer.recognize(this.drawing.strokes, this.player.runeHand.map((card) => card.id));
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
    const result = recognizedResult ?? recognizer.recognize(this.drawing.strokes, this.player.runeHand.map((card) => card.id));

    if (result && result.rune) {
      const added = this.player.playRuneCard(result.rune.id, expectedCardId);
      if (added) {
        // A card remains a reusable deck card.  Cast quality belongs to this
        // particular prepared instance, not to every future redraw of it.
        const grade = result.grade ?? recognizer.gradeForConfidence(result.confidence);
        const runeProgress = this.profile.awardRuneUse(added.id, grade);
        const prepared = { ...added, grade, quality: result.confidence, runeLevel: this.profile.runeLevel(added.id) };
        const slot = this.slotRuneSpell(prepared);
        this.player.gainFocus({ C: 4, B: 6, A: 8, S: 10 }[grade] ?? 6, 'RUNE QUALITY');
        this.applyProfile();
        this.reportProfileProgress(runeProgress, prepared);
        audio.playRuneSuccess();
        ui.showRecognitionBadge(result.rune, result.confidence, prepared.grade);
        combat.spawnShockwave(this.player.x, this.player.y - 30, 70, result.rune.color);
        combat.spawnElementalParticles(this.player.x, this.player.y - 30, result.rune.id, Math.round(14 * spells.qualityForRunes([prepared]).particles));
        if (slot && !slot.definition.isComponent && this.activeMode?.id === 'siege') {
          this.castSpellSlot(slot, true);
        }
      } else {
        ui.showAnnouncement(this.player.preparedRunes.length >= 3 ? 'SPELL SLOTS FULL — CAST OR CLEAR!' : 'DRAW A RUNE FROM YOUR HAND');
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
    const selectedSlot = this.player.slottedSpells[this.player.selectedSpellIndex];
    if (selectedSlot) return this.castSpellSlot(selectedSlot, true);
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

  slotRuneSpell(rune) {
    const slots = this.player.slottedSpells;
    // A drawn rune is always visible as its own orbiting component. Combining
    // is a conscious Grimoire action, never an implicit side effect of drawing
    // the next card.
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
    const slot = { runes: [rune], definition, isCombo: false, quality: spells.qualityForRunes([rune]) };
    slots.push(slot);
    this.player.selectedSpellIndex = slots.length - 1;
    return slot;
  }

  castSpellSlot(slot, consumeSelected = false) {
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
    if (this.player.mp < (resolved.manaCost ?? 0)) {
      this.showAnnouncement('NOT ENOUGH MANA'); audio.playRuneFail(); return false;
    }
    this.player.mp -= resolved.manaCost ?? 0;
    if (resolved.id === 'aura_shock') this.player.auraShockCooldown = resolved.cooldown;
    if (resolved.id === 'arcane_aegis') this.player.arcaneShieldCooldown = resolved.cooldown;
    if (resolved.id === 'eidolon_mantle') this.player.eidolonCooldown = resolved.cooldown;
    if (resolved.id === 'ninefold_beast_form') this.player.ninefoldCooldown = resolved.cooldown;
    spells.cast(this.player, resolved, this, slot.quality);
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
      this.player.slottedSpells.splice(this.player.selectedSpellIndex, 1);
      this.player.selectedSpellIndex = Math.max(0, Math.min(this.player.selectedSpellIndex, this.player.slottedSpells.length - 1));
      this.player.preparedRunes = this.player.slottedSpells.flatMap((entry) => entry.runes);
    }
    return true;
  }

  swapSlottedSpell() {
    const slots = this.player.slottedSpells;
    if (slots.length < 2) return false;
    this.player.selectedSpellIndex = (this.player.selectedSpellIndex + 1) % slots.length;
    audio.playRuneChime(660);
    return true;
  }

  activateFocusTransformation() {
    if (!this.isMatchRunning() || !this.player?.activateFocusTransformation?.()) {
      this.showAnnouncement(this.player?.focus >= this.player?.maxFocus ? 'FOCUS ALREADY ACTIVE' : `FOCUS ${Math.round(this.player?.focus ?? 0)}/${this.player?.maxFocus ?? 100}`);
      return false;
    }
    this.showAnnouncement('FOCUS ASCENDANT — 8 SECONDS', 1.4);
    return true;
  }

  castGrimoireSpells() {
    const slots = this.player.slottedSpells;
    if (!this.isMatchRunning() || !this.player.isAlive || !slots.length) {
      this.showAnnouncement('NO SLOTTED SPELLS'); audio.playRuneFail(); return false;
    }
    const existingCombo = slots.find((slot) => slot.isCombo);
    if (existingCombo) {
      this.player.selectedSpellIndex = slots.indexOf(existingCombo);
      // First Grimoire press fuses components. A second Grimoire press
      // releases that fusion; CAST stays available as an alternate control.
      return this.castSpellSlot(existingCombo, true);
    }

    const components = slots.flatMap((slot) => slot.runes);
    const combined = components.length >= 2 ? spells.resolveSpell(components) : null;
    if (combined?.tier > 1) {
      const comboSlot = { runes: components, definition: combined, isCombo: true, quality: spells.qualityForRunes(components) };
      slots.splice(0, slots.length, comboSlot);
      this.player.selectedSpellIndex = 0;
      this.player.preparedRunes = [...components];
      combat.spawnShockwave(this.player.x, this.player.y - 36, 48, combined.color);
      audio.playRuneChime(720);
      this.showAnnouncement(`GRIMOIRE FUSED: ${combined.name} — PRESS GRIMOIRE TO CAST`);
      return true;
    }

    // Without a valid combination the Grimoire remains a volatile release:
    // it fires one random orbiting spell and clears the unresolved components.
    const randomSlot = slots[Math.floor(Math.random() * slots.length)];
    const castAny = this.castSpellSlot(randomSlot, false);
    if (castAny) {
      this.player.clearPreparedRunes();
      this.showAnnouncement('GRIMOIRE: ARCANE RELEASE!');
    }
    return castAny;
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
    this.modeState = {
      id: mode.id, wave: 0, intermission: 0, stage: 0, announced: false,
      bossActive: false, scroll: 0, routeScroll: 0, rescued: 0, rescue: null, runeCollectibles: [],
      // Arena is deliberately melee-first. Runes are discovered from the
      // floor and transformations arrive as a contested, temporary relic --
      // neither is inherited from the profile deck.
      transformationRelic: null, transformationRelicTimer: 8.5,
      potions: [],
      run: mode.progression === 'run' ? { level: 0, xp: 0, xpToNext: 30, deck: [], pending: false, options: [], awaitingFirstKill: true } : null
    };
    if (mode.id === 'siege') {
      this.battlefield.spawnWave(this);
      return;
    }
    if (mode.id === 'invasion') {
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
      this.battlefield.placeOnSurface(this.player);
      this.spawnDungeonStarter();
      return;
    }
    if (mode.id === 'arena' || mode.id === 'training') {
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
    if (stage <= 3) {
      this.enemyChampion.lifeState = 'Dead'; this.enemyChampion.respawnTimer = Infinity;
      state.scroll = (stage - 1) * 1;
      state.routeScroll = 0;
      // Each cleared room advances the expedition into the next authored
      // backdrop segment. Combat distances remain unchanged; only the route
      // presentation moves forward.
      this.player.x = 290; this.player.z = 0.58;
      this.battlefield.placeOnSurface(this.player);
      const firstDungeonEnemy = this.minions.length;
      this.spawnModeWave('red', 2 + stage, { x: 745, z: 0.58, spread: 0.16, elite: stage >= 3 });
      for (let index = firstDungeonEnemy; index < this.minions.length; index++) {
        const m = this.minions[index];
        m.isDungeonRaider = true;
        m.maxHp = m.hp = m.type === 'ranged' ? 35 : 55;
        m.damage = m.type === 'ranged' ? 12 : 10;
      }
      // Every other room places a living prisoner on the forward route. A
      // player must reach the glow to turn it into a persistent ally.
      state.rescue = stage === 2 ? { x: 610, z: 0.44, rescued: false } : null;
      this.showAnnouncement(`DUNGEON ROOM ${stage} — PUSH FORWARD`, 1.7);
      return;
    }
    this.enemyChampion.x = 735; this.enemyChampion.z = 0.58;
    this.enemyChampion.heroKey = 'boss_firelord';
    this.enemyChampion.maxHp = this.enemyChampion.hp = 580;
    this.enemyChampion.lifeState = 'Alive';
    this.enemyChampion.respawnTimer = Infinity;
    this.battlefield.placeOnSurface(this.enemyChampion);
    state.bossActive = true;
    this.showAnnouncement('DUNGEON BOSS — VOID WARDEN', 2.1);
  }

  spawnDungeonStarter() {
    const state = this.modeState;
    if (!state || this.activeMode.id !== 'dungeon') return;
    const starter = new Minion(452, 0.58, 'red', 'melee', 1);
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
    ally.isRescuedCompanion = true; ally.maxHp = ally.hp = 220; ally.damage = 28; ally.speed = 105; ally.attackCooldown = 1.0;
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
    if (this.activeMode?.id !== 'arena' || !relics?.length || !this.player.isAlive) return;
    for (let i = relics.length - 1; i >= 0; i--) {
      const relic = relics[i];
      if (Math.hypot(this.player.x - relic.x, (this.player.z - relic.z) * 150) > 42) continue;
      this.player.runeDeck.push(this.player.makeRuneCard(relic.rune));
      this.player.drawRunesToHand();
      relics.splice(i, 1);
      this.showAnnouncement(`${relic.rune.name} RUNE RELIC ACQUIRED`, 1.2);
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
    if (Math.hypot(this.player.x - relic.x, (this.player.z - relic.z) * 150) > 44) return;
    // The arena relic grants one complete short form directly. It reuses the
    // same transformation implementations as normal combat, rather than
    // becoming a fourth parallel transformation system.
    if (relic.form === 'EIDOLON MANTLE') spells.castEidolonMantle(this.player, RUNE_GRADE_PROFILES.A);
    else if (relic.form === 'NINEFOLD BEAST') spells.castNinefoldBeast(this.player, RUNE_GRADE_PROFILES.A);
    else {
      this.player.focus = this.player.maxFocus;
      this.player.activateFocusTransformation();
    }
    state.transformationRelic = null;
    state.transformationRelicTimer = 17 + Math.random() * 7;
    this.showAnnouncement(`${relic.form} RELIC CLAIMED`, 1.5);
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
      // Dungeon is presented as a forward-moving route. This only moves the
      // backdrop/parallax; it deliberately never changes authored combat
      // distances, collision, or melee reach.
      state.routeScroll = Math.min(3.5, state.routeScroll + Math.max(0, this.player.vx) * dt * .008);
      this.updateDungeonRescue();
      if (state.stage <= 3 && !this.minions.some((minion) => minion.team === 'red' && !minion.isDead)) this.spawnDungeonStage(state.stage + 1);
      else if (state.stage === 4 && this.enemyChampion.lifeState === 'Dead') this.finishMode('blue', 'VICTORY — DUNGEON CLEARED');
      return;
    }
    if (this.activeMode.id === 'arena' && state.bossActive && this.enemyChampion.lifeState === 'Dead') {
      this.finishMode('blue', 'VICTORY — ARENA CHAMPION DEFEATED');
      return;
    }
    if (this.activeMode.id === 'arena') this.updateArenaTransformationRelic(dt);
    if (this.activeMode.id === 'training' && this.enemyChampion.lifeState === 'Dead') {
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
    if (myTeam === 'blue' && this.enemyChampion.isAlive) targets.push(this.enemyChampion);

    if (this.activeMode?.objectives !== false) {
      const enemyTeam = myTeam === 'blue' ? 'red' : 'blue';
      for (const objective of this.battlefield.getObjectivesForTeam(enemyTeam)) {
        if (!objective.isDestroyed && (includeProtectedCastle || objective.isVulnerable !== false)) targets.push(objective);
      }
    }

    return targets;
  }

  // Towers use this deliberately narrower query. Objectives remain valid
  // player/minion/spell targets, but are never valid Tower targets.
  getHostileMobileTargets(myTeam) {
    const targets = [];
    for (const minion of this.minions) {
      if (minion.team !== myTeam && !minion.isDead && minion.isMobileCombatant) targets.push(minion);
    }
    for (const summon of spells.getSummons()) {
      if (summon.team !== myTeam && summon.isMobileCombatant) targets.push(summon);
    }
    if (myTeam === 'red' && this.player.isAlive && this.player.isMobileCombatant) targets.push(this.player);
    if (myTeam === 'blue' && this.enemyChampion.isAlive && this.enemyChampion.isMobileCombatant) targets.push(this.enemyChampion);
    return targets;
  }

  findMinionTarget(minion) {
    const targetIsValid = (target) => {
      if (!target || target.team === minion.team || target.isDead || target.isDestroyed) return false;
      if (target.isObjective && target.isVulnerable === false) return false;
      if (target.heroKey && (target.surfaceId === 'blueCastleUpperPlatform' || target.surfaceId === 'redCastleUpperPlatform')) return false;
      return true;
    };
    // A brief lock stops the crowd from frame-by-frame target thrashing while
    // still letting nearby threats interrupt a march toward an objective.
    if (minion.targetLockTimer > 0 && targetIsValid(minion.target)) {
      const retainedDistance = groundDistance(minion, minion.target);
      if (minion.target.isObjective || retainedDistance < 225) return minion.target;
    }
    const commit = (target) => { minion.target = target; minion.targetLockTimer = target ? 0.55 : 0; return target; };
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
    if (this.activeMode?.id === 'dungeon') return this.isRunChoicePending() ? 'CHOOSE A FOUND RUNE' : this.modeState?.stage === 4 ? 'DEFEAT THE VOID WARDEN' : this.modeState?.stage === 0 ? 'DEFEAT THE SCOUT WITH MELEE' : `DUNGEON ROOM ${this.modeState?.stage} — PUSH FORWARD`;
    if (this.activeMode?.id === 'arena') {
      if (this.modeState?.transformationRelic) return 'CLAIM THE TRANSFORMATION RELIC — DEFEAT THE CHAMPION';
      return this.modeState?.runeCollectibles?.length ? 'COLLECT RUNE RELICS — DEFEAT THE CHAMPION' : 'DEFEAT THE ARENA CHAMPION';
    }
    if (this.activeMode?.id === 'training') return 'PRACTICE — NO REWARDS';
    const tower = this.battlefield.redTower;
    const castle = this.battlefield.redCastle;
    if (!tower.isDead) return `DESTROY ENEMY TOWER ${Math.ceil(tower.hp)}/${tower.maxHp}`;
    if (!castle.isDestroyed) return `DESTROY ENEMY CASTLE ${Math.ceil(castle.hp)}/${castle.maxHp}`;
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
    spells.clearRuntime();
    combat.resetEffects();
    this.activeMode = getGameMode(this.matchMode);
    this.battlefield = new Battlefield(this.activeMode);
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
    spells.clearRuntime();
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
    spells.clearRuntime();
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
      this.updateArenaRuneCollectibles();

      if (this.isMatchRunning()) {
        for (let i = this.minions.length - 1; i >= 0; i--) {
          const m = this.minions[i];
          m.update(scaledDt, this, this.battlefield);
          if (m.isDead) {
            if (m.team === 'red' && !m.isRescuedCompanion) {
              if (this.activeMode?.id === 'dungeon') this.awardRunXp(m.runXpValue ?? (m.type === 'ranged' ? 14 : 11));
              this.trySpawnPotion(m.x, m.z);
            }
            this.minions.splice(i, 1);
          }
        }

        this.updateProjectiles(scaledDt);

        spells.update(scaledDt, this);
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
    ui.update(dt, this.player, this.enemyChampion, this.battlefield);

    this.input.justPressedKeys = {};
    this.input.justPressedMouse = {};

    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  resolveSpellObstacles(entity, previousX, previousZ) {
    if (!entity?.isMobileCombatant) return false;
    for (const spell of spells.activeSpells) {
      if (!spell.isStoneWall || spell.isFinished || spell.team === entity.team) continue;
      if ((entity.worldHeight ?? 0) > spell.surfaceHeight + spell.wallHeight + 18) continue;
      const hitX = Math.abs(entity.x - spell.x) <= spell.halfX + (entity.width ?? 24) * .5;
      const hitZ = Math.abs(entity.z - spell.z) <= spell.halfZ + .05;
      if (!hitX || !hitZ) continue;
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
    const viewH = this.logicalHeight;
    const cam = combat.camera;

    ctx.clearRect(0, 0, viewW, viewH);

    // 1. Scene Backdrop (High-Def Waterfalls & Fortress Arena)
    this.battlefield.renderBackground(ctx, cam, this.logicalWidth, viewH, viewW, this.cameraOffsetX, this.modeState);

    // 2. World Space Layer (with Camera Shake)
    ctx.save();
    ctx.translate(this.cameraOffsetX + cam.shakeX, cam.shakeY);

    // Foreground Crystal Glows on Beacons
    this.battlefield.renderForeground(ctx);
    this.renderDungeonRescue(ctx);
    this.renderPotions(ctx);
    this.renderArenaRuneCollectibles(ctx);
    this.renderArenaTransformationRelic(ctx);

    const actors = [...this.minions];
    if (this.enemyChampion.lifeState !== 'Dead') actors.push(this.enemyChampion);
    if (this.player.lifeState !== 'Dead' && !this.player.isMounted) actors.push(this.player);
    actors.sort((a, b) => a.y - b.y);
    for (const actor of actors) actor.render(ctx);

    // Projectiles
    this.renderProjectiles(ctx);

    // Spells
    spells.render(ctx);

    // Summons render with the spell layer. Draw the mounted wizard afterward
    // so they visibly sit on the creature instead of being hidden behind it.
    if (this.player.lifeState !== 'Dead' && this.player.isMounted) this.player.render(ctx);

    // Combat VFX
    combat.render(ctx);

    if (this.debugVisible) this.battlefield.renderDebug(ctx, this);

    ctx.restore();

    // 3. Screen Space Rune Drawing
    if (this.drawing.active) {
      this.renderRuneStrokes();
    }
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

  renderRuneStrokes() {
    const rctx = this.runeCtx;
    this.clearRuneCanvas();

    rctx.save();
    rctx.fillStyle = 'rgba(8, 6, 18, 0.45)';
    rctx.fillRect(0, 0, this.renderWidth, this.logicalHeight);

    const allStrokes = [...this.drawing.strokes];
    if (this.drawing.currentStroke.length > 0) {
      allStrokes.push(this.drawing.currentStroke);
    }

    rctx.lineCap = 'round';
    rctx.lineJoin = 'round';

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
