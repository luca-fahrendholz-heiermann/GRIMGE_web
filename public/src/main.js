// GRIMGE Prototype — Main Game Loop & Coordinator (Mockup Framing & High-Precision Touch/Mouse)
import { audio } from './audio.js';
import { sprites } from './sprites.js';
import { recognizer } from './recognizer.js';
import { combat } from './combat.js';
import { spells } from './spells.js';
import { Player, EnemyChampion, Minion, Tower } from './entities.js';
import { Battlefield } from './battlefield.js';
import { ui } from './ui.js';

export class GameWorld {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.runeCanvas = document.getElementById('rune-canvas');
    this.runeCtx = this.runeCanvas.getContext('2d');

    // 1024 x 576 Fixed Resolution matching Setup Mockup
    this.canvas.width = 1024;
    this.canvas.height = 576;
    this.runeCanvas.width = 1024;
    this.runeCanvas.height = 576;

    this.battlefield = new Battlefield();
    this.player = new Player(280, this.battlefield.groundY);
    this.enemyChampion = new EnemyChampion(740, this.battlefield.groundY, 'warlord');

    this.minions = [];
    this.projectiles = [];

    // Match Timer (06:42 like mockup)
    this.matchTime = 402;
    this.blueCrystals = 2;
    this.redCrystals = 1;

    // Input state
    this.input = {
      keys: {},
      justPressedKeys: {},
      mouse: { x: 0, y: 0, isDown: false, rightDown: false },
      justPressedMouse: {},
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
      timer: 2.5,
      maxTimer: 2.5,
      lastPointTime: 0
    };

    this.timeScale = 1.0;
    this.targetTimeScale = 1.0;

    this.lastFrameTime = performance.now();
    this.running = false;
  }

  async init() {
    this.setupInputs();

    // Load character sprites
    await sprites.loadAll();

    // Default prepared runes matching mockup cards (Fulgur, Terra, Ignis)
    const fulgurRune = recognizer.runes.find(r => r.id === 'fulgur');
    const terraRune = recognizer.runes.find(r => r.id === 'terra');
    const ignisRune = recognizer.runes.find(r => r.id === 'ignis');
    if (fulgurRune) this.player.addPreparedRune(fulgurRune);
    if (terraRune) this.player.addPreparedRune(terraRune);
    if (ignisRune) this.player.addPreparedRune(ignisRune);

    // Initial minion wave
    this.battlefield.spawnWave(this);

    window.gameWorld = this;

    this.running = true;
    requestAnimationFrame((t) => this.loop(t));
    console.log('⚔️ GRIMGE Game Loop running at 1024x576.');
  }

  getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
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

      // Clear Runes (Q)
      if (e.code === 'KeyQ') {
        this.player.clearPreparedRunes();
        audio.playRuneFail();
      }

      // Toggle Grimoire (H)
      if (e.code === 'KeyH') ui.toggleGrimoire();

      // Drawing Focus Mode with Spacebar
      if (e.code === 'Space' && !this.drawing.active && this.player.grounded) {
        this.startRuneDrawing();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
      if (e.code === 'Space' && this.drawing.active) {
        this.finishRuneDrawing();
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('mousedown', (e) => {
      audio.ensureContext();
      const pt = this.getCanvasCoords(e.clientX, e.clientY);
      this.input.mouse.x = pt.x;
      this.input.mouse.y = pt.y;

      if (e.button === 0) {
        this.input.mouse.isDown = true;
        this.input.justPressedMouse[0] = true;
        if (this.drawing.active) {
          this.addRunePoint(pt.x, pt.y);
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
          if (this.drawing.currentStroke.length > 0) {
            this.drawing.strokes.push([...this.drawing.currentStroke]);
            this.drawing.currentStroke = [];
          }
        }
      } else if (e.button === 2) {
        this.input.mouse.rightDown = false;
        if (this.drawing.active) {
          this.finishRuneDrawing();
        }
      }
    });

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      audio.ensureContext();
      if (e.touches.length > 0) {
        const pt = this.getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        this.input.mouse.x = pt.x;
        this.input.mouse.y = pt.y;
        if (this.drawing.active) this.addRunePoint(pt.x, pt.y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const pt = this.getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        this.input.mouse.x = pt.x;
        this.input.mouse.y = pt.y;
        if (this.drawing.active) this.addRunePoint(pt.x, pt.y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      if (this.drawing.active) {
        if (this.drawing.currentStroke.length > 0) {
          this.drawing.strokes.push([...this.drawing.currentStroke]);
          this.drawing.currentStroke = [];
        }
        this.finishRuneDrawing();
      }
    });
  }

  startRuneDrawing() {
    if (this.drawing.active) return;
    this.drawing.active = true;
    this.drawing.strokes = [];
    this.drawing.currentStroke = [];
    this.drawing.timer = this.drawing.maxTimer;
    this.targetTimeScale = 0.22;

    ui.setDrawingMode(true, this.drawing.timer, this.drawing.maxTimer);
    audio.playRuneChime(392);
  }

  addRunePoint(canvasX, canvasY) {
    const now = performance.now();
    this.drawing.currentStroke.push({ x: canvasX, y: canvasY, t: now });

    combat.spawnElementalParticles(canvasX, canvasY, 'fulgur', 1);

    if (now - this.drawing.lastPointTime > 90) {
      this.drawing.lastPointTime = now;
      const freq = 440 + (canvasX % 300);
      audio.playRuneChime(freq);
    }
  }

  finishRuneDrawing() {
    if (!this.drawing.active) return;

    if (this.drawing.currentStroke.length > 0) {
      this.drawing.strokes.push([...this.drawing.currentStroke]);
      this.drawing.currentStroke = [];
    }

    this.drawing.active = false;
    this.targetTimeScale = 1.0;
    ui.setDrawingMode(false);

    const result = recognizer.recognize(this.drawing.strokes);

    if (result && result.rune) {
      const added = this.player.addPreparedRune(result.rune);
      if (added) {
        audio.playRuneSuccess();
        ui.showRecognitionBadge(result.rune, result.confidence);
        combat.spawnShockwave(this.player.x, this.player.y - 30, 70, result.rune.color);
        combat.spawnElementalParticles(this.player.x, this.player.y - 30, result.rune.id, 20);
      } else {
        ui.showAnnouncement('RUNE DECK FULL — CAST OR DISCARD!');
      }
    } else {
      audio.playRuneFail();
      ui.showRecognitionBadge(null, 0);
    }

    this.runeCtx.clearRect(0, 0, this.runeCanvas.width, this.runeCanvas.height);
  }

  castPreparedSpell() {
    if (this.player.preparedRunes.length === 0) {
      this.showAnnouncement('NO RUNES PREPARED! DRAW RUNES FIRST');
      audio.playRuneFail();
      return;
    }

    const resolved = spells.resolveSpell(this.player.preparedRunes);
    if (resolved) {
      spells.cast(this.player, resolved, this);
      this.showAnnouncement(`CAST: ${resolved.name}!`);
      this.player.clearPreparedRunes();
    }
  }

  getHostileTargets(myTeam) {
    const targets = [];
    for (const m of this.minions) {
      if (m.team !== myTeam && !m.isDead) targets.push(m);
    }
    if (myTeam === 'red' && this.player.hp > 0) targets.push(this.player);
    if (myTeam === 'blue' && this.enemyChampion.hp > 0) targets.push(this.enemyChampion);

    const enemyTower = (myTeam === 'blue') ? this.battlefield.redTower : this.battlefield.blueTower;
    if (!enemyTower.isDead) targets.push(enemyTower);

    return targets;
  }

  spawnMinionBolt(x, y, facing, team, damage) {
    this.projectiles.push({
      type: 'bolt',
      x, y,
      vx: facing * 440,
      vy: 0,
      facing,
      team,
      damage,
      life: 1.2,
      radius: 5
    });
  }

  spawnTowerOrb(startX, startY, target, team, damage) {
    this.projectiles.push({
      type: 'towerOrb',
      x: startX,
      y: startY,
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

    // 1. Drawing Timer
    if (this.drawing.active) {
      this.drawing.timer -= dt;
      ui.setDrawingMode(true, this.drawing.timer, this.drawing.maxTimer);
      if (this.drawing.timer <= 0) this.finishRuneDrawing();
    }

    // 2. Match Timer
    this.matchTime = Math.max(0, this.matchTime - dt);

    // 3. Combat Engine Update
    const normalFrame = combat.update(
      scaledDt,
      this.player.x,
      this.player.y,
      this.canvas.width,
      this.canvas.height,
      this.battlefield
    );

    if (normalFrame) {
      this.battlefield.update(scaledDt, this);

      if (this.player.hp > 0) {
        this.player.update(scaledDt, this.input, this.battlefield);
      }
      if (this.enemyChampion.hp > 0) {
        this.enemyChampion.update(scaledDt, this, this.battlefield);
      }

      for (let i = this.minions.length - 1; i >= 0; i--) {
        const m = this.minions[i];
        m.update(scaledDt, this, this.battlefield);
        if (m.isDead) this.minions.splice(i, 1);
      }

      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.life -= scaledDt;

        if (p.type === 'bolt') {
          p.x += p.vx * scaledDt;
          const targets = this.getHostileTargets(p.team);
          for (const t of targets) {
            if (Math.abs(t.x - p.x) < 22 && Math.abs((t.y - 20) - p.y) < 30) {
              t.takeDamage(p.damage, p.facing * 80, -40, 0.15);
              p.life = 0;
              break;
            }
          }
        } else if (p.type === 'towerOrb') {
          if (p.target && p.target.hp > 0) {
            const dx = p.target.x - p.x;
            const dy = (p.target.y - 25) - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 18) {
              p.target.takeDamage(p.damage, Math.sign(dx) * 160, -80, 0.2);
              combat.spawnShockwave(p.x, p.y, 30, p.team === 'blue' ? '#00e5ff' : '#ff1744');
              p.life = 0;
            } else {
              p.x += (dx / dist) * p.speed * scaledDt;
              p.y += (dy / dist) * p.speed * scaledDt;
            }
          } else {
            p.life = 0;
          }
        }

        if (p.life <= 0) this.projectiles.splice(i, 1);
      }

      spells.update(scaledDt, this);
    }

    ui.update(dt, this.player, this.battlefield);

    this.input.justPressedKeys = {};
    this.input.justPressedMouse = {};

    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  render() {
    const ctx = this.ctx;
    const viewW = this.canvas.width;
    const viewH = this.canvas.height;
    const cam = combat.camera;

    ctx.clearRect(0, 0, viewW, viewH);

    // 1. Scene Backdrop (High-Def Waterfalls & Fortress Arena)
    this.battlefield.renderBackground(ctx, cam, viewW, viewH);

    // 2. World Space Layer (with Camera Shake)
    ctx.save();
    ctx.translate(cam.shakeX, cam.shakeY);

    // Foreground Crystal Glows on Beacons
    this.battlefield.renderForeground(ctx);

    // Minions
    for (const m of this.minions) m.render(ctx);

    // Enemy Champion
    if (this.enemyChampion.hp > 0) this.enemyChampion.render(ctx);

    // Player
    if (this.player.hp > 0) this.player.render(ctx);

    // Projectiles
    this.renderProjectiles(ctx);

    // Spells
    spells.render(ctx);

    // Combat VFX
    combat.render(ctx);

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
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'towerOrb') {
        ctx.fillStyle = p.team === 'blue' ? '#00e5ff' : '#ff1744';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  renderRuneStrokes() {
    const rctx = this.runeCtx;
    rctx.clearRect(0, 0, this.runeCanvas.width, this.runeCanvas.height);

    rctx.save();
    rctx.fillStyle = 'rgba(8, 6, 18, 0.45)';
    rctx.fillRect(0, 0, this.runeCanvas.width, this.runeCanvas.height);

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
