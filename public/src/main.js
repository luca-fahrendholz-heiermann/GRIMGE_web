// GRIMGE Prototype — Main Game Loop & Coordinator (Mockup Framing & High-Precision Touch/Mouse)
import { audio } from './audio.js';
import { sprites } from './sprites.js';
import { recognizer } from './recognizer.js';
import { combat } from './combat.js';
import { spells } from './spells.js';
import { Player, EnemyChampion } from './entities.js';
import { Battlefield } from './battlefield.js';
import { ui } from './ui.js';
import { VIEWPORT, ARENA_LAYOUT, groundDistance, groundYForDepth } from './world.js';

export class GameWorld {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.runeCanvas = document.getElementById('rune-canvas');
    this.runeCtx = this.runeCanvas.getContext('2d');
    this.uiLayer = document.getElementById('ui-layer');

    this.logicalWidth = VIEWPORT.width;
    this.logicalHeight = VIEWPORT.height;
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

    this.lastFrameTime = performance.now();
    this.running = false;
  }

  configureCanvas(canvas, context) {
    canvas.width = Math.round(this.logicalWidth * this.deviceScale);
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
    const width = this.canvas.getBoundingClientRect().width;
    if (width > 0 && this.uiLayer) {
      const scale = String(width / this.logicalWidth);
      // Custom CSS properties must be written through setProperty in a real
      // CSSStyleDeclaration. Bracket assignment happened to work in the test
      // stub but is ignored by browsers, leaving a 1024px HUD over a scaled
      // Canvas.
      if (this.uiLayer.style.setProperty) this.uiLayer.style.setProperty('--hud-scale', scale);
      else this.uiLayer.style['--hud-scale'] = scale;
    }
  }

  async init() {
    this.setupInputs();
    this.syncHudScale();
    // The first script turn can run before the final responsive layout has
    // settled. Re-read the Canvas rectangle on the next paint as well.
    requestAnimationFrame(() => this.syncHudScale());
    window.addEventListener('resize', () => this.syncHudScale());
    window.visualViewport?.addEventListener?.('resize', () => this.syncHudScale());

    // Load character sprites
    await sprites.loadAll();

    this.resetMatch();
    this.matchState = 'Menu';
    ui.showHub(true);

    window.gameWorld = this;

    this.running = true;
    requestAnimationFrame((t) => this.loop(t));
    console.log('⚔️ GRIMGE Game Loop running at 1024x576.');
  }

  getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.logicalWidth / rect.width;
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
      if (!this.input.keys[e.code]) {
        this.input.justPressedKeys[e.code] = true;
      }
      this.input.keys[e.code] = true;
      audio.ensureContext();

      // Hero Swapping (Keys 1-5)
      if (e.code === 'Digit1') { this.player.setHero('paladin'); ui.updateActiveHeroBtn('paladin'); }
      if (e.code === 'Digit2') { this.player.setHero('berserker'); ui.updateActiveHeroBtn('berserker'); }
      if (e.code === 'Digit3') { this.player.setHero('mage'); ui.updateActiveHeroBtn('mage'); }
      if (e.code === 'Digit4') { this.player.setHero('warlord'); ui.updateActiveHeroBtn('warlord'); }
      if (e.code === 'Digit5') { this.player.setHero('fighter'); ui.updateActiveHeroBtn('fighter'); }

      // Cast Spell (E)
      if (e.code === 'KeyE') this.castPreparedSpell();

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
      if (pt.x > this.logicalWidth * 0.48 || this.drawing.active || !this.isMatchRunning()) return false;
      pointerId = event.pointerId;
      joystickOrigin = pt;
      joystickMoved = false;
      joystick.style.left = `${Math.max(0, Math.min(this.logicalWidth - JOYSTICK_RADIUS * 2, pt.x - JOYSTICK_RADIUS))}px`;
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
      if (pt.x < this.logicalWidth * 0.48) return;
      attackPointerId = event.pointerId;
      attackStart = pt;
      this.canvas.setPointerCapture?.(attackPointerId);
    };
    const handleLeftDoubleTap = (event) => {
      if (event.pointerType && event.pointerType !== 'touch') return false;
      const pt = this.getCanvasCoords(event.clientX, event.clientY);
      if (pt.x > this.logicalWidth * 0.48 || !this.isMatchRunning()) return false;
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
    const result = recognizer.recognize(this.drawing.strokes);
    if (!result?.rune || result.confidence < 0.70) {
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
    const result = recognizedResult ?? recognizer.recognize(this.drawing.strokes);

    if (result && result.rune) {
      const added = this.player.playRuneCard(result.rune.id, expectedCardId);
      if (added) {
        this.slotRuneSpell(added);
        audio.playRuneSuccess();
        ui.showRecognitionBadge(result.rune, result.confidence);
        combat.spawnShockwave(this.player.x, this.player.y - 30, 70, result.rune.color);
        combat.spawnElementalParticles(this.player.x, this.player.y - 30, result.rune.id, 20);
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
      if (this.player.mp < (resolved.manaCost ?? 0)) {
        this.showAnnouncement('NOT ENOUGH MANA');
        audio.playRuneFail();
        return false;
      }
      this.player.mp -= resolved.manaCost ?? 0;
      if (resolved.id === 'aura_shock') this.player.auraShockCooldown = resolved.cooldown;
      if (resolved.id === 'arcane_aegis') this.player.arcaneShieldCooldown = resolved.cooldown;
      spells.cast(this.player, resolved, this);
      this.showAnnouncement(`CAST: ${resolved.name}!`);
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
    const definition = spells.resolveSpell([rune]);
    const slot = { runes: [rune], definition, isCombo: false };
    slots.push(slot);
    this.player.selectedSpellIndex = slots.length - 1;
    return slot;
  }

  castSpellSlot(slot, consumeSelected = false) {
    const resolved = slot?.definition;
    if (!resolved) return false;
    if (resolved.id === 'aura_shock' && this.player.auraShockCooldown > 0) {
      this.showAnnouncement('AURA SHOCK IS RECHARGING'); audio.playRuneFail(); return false;
    }
    if (resolved.id === 'arcane_aegis' && this.player.arcaneShieldCooldown > 0) {
      this.showAnnouncement('ARCANE AEGIS IS RECHARGING'); audio.playRuneFail(); return false;
    }
    if (this.player.mp < (resolved.manaCost ?? 0)) {
      this.showAnnouncement('NOT ENOUGH MANA'); audio.playRuneFail(); return false;
    }
    this.player.mp -= resolved.manaCost ?? 0;
    if (resolved.id === 'aura_shock') this.player.auraShockCooldown = resolved.cooldown;
    if (resolved.id === 'arcane_aegis') this.player.arcaneShieldCooldown = resolved.cooldown;
    spells.cast(this.player, resolved, this);
    this.showAnnouncement(`CAST: ${resolved.name}!`);
    if (consumeSelected) {
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

  castGrimoireSpells() {
    const slots = this.player.slottedSpells;
    if (!this.isMatchRunning() || !this.player.isAlive || !slots.length) {
      this.showAnnouncement('NO SLOTTED SPELLS'); audio.playRuneFail(); return false;
    }
    const existingCombo = slots.find((slot) => slot.isCombo);
    if (existingCombo) {
      this.player.selectedSpellIndex = slots.indexOf(existingCombo);
      this.showAnnouncement(`COMBO READY: ${existingCombo.definition.name} — PRESS CAST`);
      audio.playRuneChime(720);
      return true;
    }

    const components = slots.flatMap((slot) => slot.runes);
    const combined = components.length >= 2 ? spells.resolveSpell(components) : null;
    if (combined?.tier > 1) {
      const comboSlot = { runes: components, definition: combined, isCombo: true };
      slots.splice(0, slots.length, comboSlot);
      this.player.selectedSpellIndex = 0;
      this.player.preparedRunes = [...components];
      combat.spawnShockwave(this.player.x, this.player.y - 36, 48, combined.color);
      audio.playRuneChime(720);
      this.showAnnouncement(`GRIMOIRE FUSED: ${combined.name} — PRESS CAST`);
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

  getHostileTargets(myTeam, includeProtectedCastle = false) {
    const targets = [];
    for (const m of this.minions) {
      if (m.team !== myTeam && !m.isDead) targets.push(m);
    }
    if (myTeam === 'red' && this.player.isAlive) targets.push(this.player);
    if (myTeam === 'blue' && this.enemyChampion.isAlive) targets.push(this.enemyChampion);

    const enemyTower = this.battlefield.getTower(myTeam === 'blue' ? 'red' : 'blue');
    if (!enemyTower.isDead) targets.push(enemyTower);
    const enemyCastle = this.battlefield.getCastle(myTeam === 'blue' ? 'red' : 'blue');
    if (!enemyCastle.isDestroyed && (includeProtectedCastle || enemyCastle.isVulnerable)) targets.push(enemyCastle);

    return targets;
  }

  // Towers use this deliberately narrower query. Objectives remain valid
  // player/minion/spell targets, but are never valid Tower targets.
  getHostileMobileTargets(myTeam) {
    const targets = [];
    for (const minion of this.minions) {
      if (minion.team !== myTeam && !minion.isDead && minion.isMobileCombatant) targets.push(minion);
    }
    if (myTeam === 'red' && this.player.isAlive && this.player.isMobileCombatant) targets.push(this.player);
    if (myTeam === 'blue' && this.enemyChampion.isAlive && this.enemyChampion.isMobileCombatant) targets.push(this.enemyChampion);
    return targets;
  }

  findMinionTarget(minion) {
    const targetIsValid = (target) => {
      if (!target || target.team === minion.team || target.isDead || target.isDestroyed) return false;
      if (target.isObjective && target.isVulnerable === false) return false;
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
    if (wizard.isAlive) {
      const wizardDistance = Math.hypot(wizard.x - minion.x, (wizard.z - minion.z) * 150);
      if (wizardDistance < 180) return commit(wizard);
    }
    const enemyTeam = minion.team === 'blue' ? 'red' : 'blue';
    const tower = this.battlefield.getTower(enemyTeam);
    if (!tower.isDead) return commit(tower);
    const castle = this.battlefield.getCastle(enemyTeam);
    return commit(castle.isVulnerable && !castle.isDestroyed ? castle : null);
  }

  isMatchRunning() { return this.matchState === 'Running'; }

  setObjectivePhase(phase) {
    this.objectivePhase = phase;
    this.matchPhase = phase;
  }

  canRespawn(team) { return this.isMatchRunning() && !this.battlefield.getCastle(team).isDestroyed; }

  onTowerDestroyed(tower, castle) {
    this.showAnnouncement(`${tower.team.toUpperCase()} TOWER FALLEN — CASTLE VULNERABLE`, 2.5);
    this.setObjectivePhase('CastlePhase');
    this.stats.towersDestroyed[tower.team] = true;
  }

  onCastleDestroyed(castle) {
    this.setObjectivePhase('FinalWizardPhase');
    this.stats.castlesDestroyed[castle.team] = true;
    this.showAnnouncement(`${castle.team.toUpperCase()} CASTLE DESTROYED — DEFEAT THE WIZARD`, 3);
  }

  onFinalWizardDeath(team) {
    if (!this.isMatchRunning()) return;
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
  }

  getObjectiveStatus() {
    if (this.matchState === 'Ending' || this.matchState === 'Results') return this.winnerTeam === 'blue' ? 'VICTORY' : 'DEFEAT';
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
    // Ordered prototype deck. Exactly three rune cards form the hand; each
    // correctly drawn card cycles itself to the deck back and is replaced.
    const ids = ['fulgur', 'terra', 'ignis', 'ventus', 'aqua', 'ignis'];
    const deck = ids.map((id) => recognizer.runes.find((candidate) => candidate.id === id)).filter(Boolean);
    this.player.configureRuneDeck(deck);
  }

  resetMatch() {
    spells.activeSpells = [];
    combat.resetEffects();
    this.battlefield = new Battlefield();
    this.attachBattlefieldCallbacks();
    this.player = new Player(ARENA_LAYOUT.spawns.blueCastle.x, ARENA_LAYOUT.spawns.blueCastle.z);
    this.enemyChampion = new EnemyChampion(ARENA_LAYOUT.spawns.redCastle.x, ARENA_LAYOUT.spawns.redCastle.z, 'warlord');
    this.battlefield.placeOnSurface(this.player);
    this.battlefield.placeOnSurface(this.enemyChampion);
    this.minions = [];
    this.projectiles = [];
    this.setObjectivePhase('LanePhase');
    this.winnerTeam = null;
    this.endingTimer = 0;
    this.matchTime = this.matchDuration;
    this.stats = { wizardKills: { blue: 0, red: 0 }, playerDeaths: 0, towersDestroyed: { blue: false, red: false }, castlesDestroyed: { blue: false, red: false } };
    this.drawing.active = false;
    this.drawing.strokes = [];
    this.drawing.currentStroke = [];
    this.targetTimeScale = this.timeScale = 1;
    this.input.gameplayBlocked = false;
    this.prepareDefaultRunes();
    this.battlefield.spawnWave(this);
  }

  startMatch() {
    // Pointer controls emit pointerdown followed by click. Do not let the
    // follow-up click rebuild a just-started match and do not restart an
    // already live game through an accidental overlay tap.
    if (this.matchState === 'Running' || this.matchState === 'Ending') return;
    this.resetMatch();
    this.matchState = 'Running';
    ui.showHub(false);
    ui.showResults(false);
    this.showAnnouncement('DESTROY ENEMY TOWER', 1.5);
  }

  completeResults() {
    if (this.matchState !== 'Ending') return;
    this.matchState = 'Results';
    this.projectiles = [];
    spells.activeSpells = [];
    ui.showResults(true, { winner: this.winnerTeam, elapsed: this.matchDuration - this.matchTime, stats: this.stats });
  }

  returnToHub() {
    this.matchState = 'Menu';
    this.input.gameplayBlocked = true;
    this.projectiles = [];
    spells.activeSpells = [];
    this.drawing.active = false;
    this.targetTimeScale = this.timeScale = 1;
    ui.setDrawingMode(false);
    ui.showResults(false);
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
      this.input.gameplayBlocked = this.drawing.active;
      this.refreshMovement();

      this.player.update(scaledDt, this.input, this.battlefield, this);
      this.enemyChampion.update(scaledDt, this, this.battlefield);

      if (this.isMatchRunning()) {
        for (let i = this.minions.length - 1; i >= 0; i--) {
          const m = this.minions[i];
          m.update(scaledDt, this, this.battlefield);
          if (m.isDead) this.minions.splice(i, 1);
        }

        this.updateProjectiles(scaledDt);

        spells.update(scaledDt, this);
      }
    }

    // Ending deliberately does not run combat AI, spawns, projectiles, or
    // player input. It still receives real dt so feedback can resolve and the
    // game always reaches a usable Results screen.
    if (this.matchState === 'Ending') {
      this.endingTimer -= dt;
      if (this.endingTimer <= 0) this.completeResults();
    }

    ui.update(dt, this.player, this.enemyChampion, this.battlefield);

    this.input.justPressedKeys = {};
    this.input.justPressedMouse = {};

    this.render();

    requestAnimationFrame((t) => this.loop(t));
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
          if (Math.abs(t.x - p.x) < 22 && Math.abs((t.z ?? p.z) - p.z) < 0.15 && Math.abs((t.worldHeight ?? 0) - p.height) < heightReach) {
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
    const viewW = this.logicalWidth;
    const viewH = this.logicalHeight;
    const cam = combat.camera;

    ctx.clearRect(0, 0, viewW, viewH);

    // 1. Scene Backdrop (High-Def Waterfalls & Fortress Arena)
    this.battlefield.renderBackground(ctx, cam, viewW, viewH);

    // 2. World Space Layer (with Camera Shake)
    ctx.save();
    ctx.translate(cam.shakeX, cam.shakeY);

    // Foreground Crystal Glows on Beacons
    this.battlefield.renderForeground(ctx);

    const actors = [...this.minions];
    if (this.enemyChampion.lifeState !== 'Dead') actors.push(this.enemyChampion);
    if (this.player.lifeState !== 'Dead') actors.push(this.player);
    actors.sort((a, b) => a.y - b.y);
    for (const actor of actors) actor.render(ctx);

    // Projectiles
    this.renderProjectiles(ctx);

    // Spells
    spells.render(ctx);

    // Combat VFX
    combat.render(ctx);

    if (this.debugVisible) this.battlefield.renderDebug(ctx, this);

    ctx.restore();

    // 3. Screen Space Rune Drawing
    if (this.drawing.active) {
      this.renderRuneStrokes();
    }
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
    rctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

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
