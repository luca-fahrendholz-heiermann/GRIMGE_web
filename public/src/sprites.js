// GRIMGE Prototype — Sprite Pipeline & Procedural Animation Engine
import { ENTITY_VISUALS } from './world.js';

export class SpriteManager {
  constructor() {
    this.sprites = {};
    this.summonSprites = {};
    this.loaded = false;
    this.heroDefs = {
      paladin: { name: 'Valerius the Vanguard', file: 'char_paladin.png', weapon: 'Greatsword & Shield', role: 'Balanced / Heavy Impact' },
      berserker: { name: 'Torin the Marauder', file: 'char_berserker.png', weapon: 'Dual Axes', role: 'Aggressive / High Speed' },
      mage: { name: 'Ignis the Archmage', file: 'char_mage.png', weapon: 'Grimoire of Runes', role: 'Spellcaster / High Mana' },
      warlord: { name: 'Aurelius the Sovereign', file: 'char_warlord.png', weapon: 'Runic Broadsword', role: 'Commander / Sweeping Strikes' },
      fighter: { name: 'Kaen the Unbroken', file: 'char_fighter.png', weapon: 'Bare Fists & Ki', role: 'Martial Artist / Rapid Hits' },
      darklord: { name: 'The Dark Lord', file: 'char_dark_lord.png', weapon: 'Blood Crown & Blacksteel', role: 'Dark Vanguard / Control' }
    };
    this.shadowCanvas = this.createShadowCanvas();
  }

  async loadAll() {
    const promises = Object.entries(this.heroDefs).map(([key, def]) => {
      return this.loadAndProcessSprite(key, `assets/sprites/${def.file}`);
    });

    await Promise.all(promises);
    // The reference asset can be dropped in as char_dark_lord.png.  Until it
    // is present, retain a visible, code-owned fallback rather than leaving
    // a selectable hero invisible due to a missing image request.
    if (!this.sprites.darklord) this.sprites.darklord = this.createDarkLordFallback();
    await Promise.all([
      // The imported wolf is one transparent character sprite, not the
      // earlier reference-sheet layout. Treat it as one source image so no
      // arbitrary 128px crop window can reveal a moving rectangle.
      this.loadSummonSprite('spirit_wolf', 'assets/sprites/summon_spirit_wolf.png'),
      this.loadSummonSprite('storm_wolf', 'assets/sprites/summon_storm_wolf.png'),
      this.loadSummonSprite('siege_golem', 'assets/sprites/summon_siege_golem.png'),
      this.loadSummonSprite('dragon', 'assets/sprites/summon_fire_dragon.png'),
      this.loadSummonSprite('void_spider', 'assets/sprites/summon_void_spider.png'),
      this.loadSummonSprite('rune_snake', 'assets/sprites/summon_rune_snake.png')
    ]);
    this.createMinionSprites();
    this.loaded = true;
    console.log('⚔️ All GRIMGE character sprites processed & cached.');
  }

  loadAndProcessSprite(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const processed = this.chromaKeyAndCrop(img);
        this.sprites[key] = processed;
        resolve(processed);
      };
      img.onerror = () => {
        console.error(`Failed to load sprite: ${src}`);
        resolve(null);
      };
      img.src = src;
    });
  }

  chromaKeyAndCrop(img) {
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = img.width;
    rawCanvas.height = img.height;
    const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
    rawCtx.imageSmoothingEnabled = false; // source-sized copy: never resample before chroma keying
    rawCtx.drawImage(img, 0, 0);

    const imgData = rawCtx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;
    const w = img.width;
    const h = img.height;

    // Sample background green from corner
    const bgR = data[0];
    const bgG = data[1];
    const bgB = data[2];

    let minX = w, maxX = 0, minY = h, maxY = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Color distance to background
        const dr = r - bgR;
        const dg = g - bgG;
        const db = b - bgB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        // Check if green screen pixel
        const isChroma = (dist < 48) || (g > 135 && g > r * 1.5 && g > b * 1.5 && dist < 95);

        if (isChroma) {
          data[idx + 3] = 0; // Transparent
        } else {
          // De-fringe slight green spill on outer edges
          if (g > 110 && g > r * 1.2 && g > b * 1.2) {
            data[idx + 1] = Math.round((r + b) * 0.5);
          }

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    rawCtx.putImageData(imgData, 0, 0);

    // Crop to bounding box with small padding
    const pad = 4;
    const cropW = Math.max(1, (maxX - minX + 1));
    const cropH = Math.max(1, (maxY - minY + 1));

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW + pad * 2;
    croppedCanvas.height = cropH + pad * 2;
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.imageSmoothingEnabled = false;

    croppedCtx.drawImage(
      rawCanvas,
      minX, minY, cropW, cropH,
      pad, pad, cropW, cropH
    );

    // Create White Hit-Flash Canvas
    const flashCanvas = document.createElement('canvas');
    flashCanvas.width = croppedCanvas.width;
    flashCanvas.height = croppedCanvas.height;
    const flashCtx = flashCanvas.getContext('2d');
    flashCtx.imageSmoothingEnabled = false;
    flashCtx.drawImage(croppedCanvas, 0, 0);
    flashCtx.globalCompositeOperation = 'source-in';
    flashCtx.fillStyle = '#ffffff';
    flashCtx.fillRect(0, 0, flashCanvas.width, flashCanvas.height);

    // Create Red Hurt Canvas
    const hurtCanvas = document.createElement('canvas');
    hurtCanvas.width = croppedCanvas.width;
    hurtCanvas.height = croppedCanvas.height;
    const hurtCtx = hurtCanvas.getContext('2d');
    hurtCtx.imageSmoothingEnabled = false;
    hurtCtx.drawImage(croppedCanvas, 0, 0);
    hurtCtx.globalCompositeOperation = 'source-in';
    hurtCtx.fillStyle = '#ff2222';
    hurtCtx.fillRect(0, 0, hurtCanvas.width, hurtCanvas.height);

    return {
      canvas: croppedCanvas,
      flashCanvas: flashCanvas,
      hurtCanvas: hurtCanvas,
      width: croppedCanvas.width,
      height: croppedCanvas.height,
      anchorX: croppedCanvas.width * 0.5,
      anchorY: croppedCanvas.height - pad // Feet level
    };
  }

  createShadowCanvas() {
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 18;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(24, 9, 2, 24, 9, 22);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(24, 9, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  // Retained for a future true animated wolf-sheet export. The current wolf
  // asset is static and deliberately goes through loadSummonSprite instead.
  loadWolfSheet(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // The supplied sheet is an 8-column greenscreen layout. These rows
        // intentionally crop above the embedded labels: idle, run and melee.
        const makeFrames = (y, h, count) => Array.from({ length: count }, (_, i) => {
          const cell = document.createElement('canvas');
          cell.width = 128; cell.height = h;
          const cctx = cell.getContext('2d', { willReadFrequently: true });
          cctx.imageSmoothingEnabled = false;
          cctx.drawImage(img, i * 128, y, 128, h, 0, 0, 128, h);
          return this.chromaKeyAndCrop(cell);
        });
        this.summonSprites.spirit_wolf = {
          idle: makeFrames(0, 148, 7),
          run: makeFrames(312, 126, 8),
          attack: makeFrames(586, 126, 6)
        };
        console.log('🐺 Spirit Wolf sprite sheet processed & cached.');
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  // Static summon art follows the exact same source-resolution chroma-key
  // and feet-anchor pipeline as heroes.  Animated sheets (the wolf) keep
  // their own frame processing above.
  loadSummonSprite(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.summonSprites[key] = { static: this.chromaKeyAndCrop(img) };
        console.log(`✦ ${key} summon sprite processed & cached.`);
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  createDarkLordFallback() {
    const c = document.createElement('canvas');
    c.width = 72; c.height = 104;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // Red crown/spikes, white hair, black armour and a torn crimson mantle:
    // a compact pixel-art homage to the supplied Dark Lord reference.
    ctx.fillStyle = '#250f16'; ctx.fillRect(20, 28, 32, 44);
    ctx.fillStyle = '#4a2529'; ctx.fillRect(16, 36, 40, 26);
    ctx.fillStyle = '#7d1d2e'; ctx.fillRect(12, 58, 48, 30);
    ctx.fillStyle = '#b71c1c'; ctx.fillRect(19, 63, 34, 27);
    ctx.fillStyle = '#2e2023'; ctx.fillRect(22, 72, 12, 26); ctx.fillRect(39, 72, 12, 26);
    ctx.fillStyle = '#141216'; ctx.fillRect(18, 92, 18, 8); ctx.fillRect(37, 92, 18, 8);
    ctx.fillStyle = '#c78354'; ctx.fillRect(26, 21, 20, 17);
    ctx.fillStyle = '#f4edf0'; ctx.fillRect(22, 16, 28, 13); ctx.fillRect(19, 24, 8, 19); ctx.fillRect(45, 24, 8, 19);
    ctx.fillStyle = '#6f1025';
    ctx.fillRect(24, 8, 4, 12); ctx.fillRect(32, 3, 5, 17); ctx.fillRect(42, 8, 4, 12);
    ctx.fillRect(15, 13, 6, 8); ctx.fillRect(51, 13, 6, 8);
    ctx.fillStyle = '#ff5252'; ctx.fillRect(29, 27, 4, 3); ctx.fillRect(39, 27, 4, 3);
    ctx.fillStyle = '#a68a8c'; ctx.fillRect(25, 39, 22, 5); ctx.fillRect(29, 48, 14, 4);
    const flash = document.createElement('canvas'); flash.width = c.width; flash.height = c.height;
    const fctx = flash.getContext('2d'); fctx.drawImage(c, 0, 0); fctx.globalCompositeOperation = 'source-in'; fctx.fillStyle = '#fff'; fctx.fillRect(0, 0, c.width, c.height);
    const hurt = document.createElement('canvas'); hurt.width = c.width; hurt.height = c.height;
    const hctx = hurt.getContext('2d'); hctx.drawImage(c, 0, 0); hctx.globalCompositeOperation = 'source-in'; hctx.fillStyle = '#ff1744'; hctx.fillRect(0, 0, c.width, c.height);
    return { canvas: c, flashCanvas: flash, hurtCanvas: hurt, width: c.width, height: c.height, anchorX: c.width * .5, anchorY: 100 };
  }

  createMinionSprites() {
    // Generate Blue and Red Melee & Ranged minion sprites programmatically with pixel art
    this.sprites['minion_blue_melee'] = this.drawMinionCanvas('blue', 'melee');
    this.sprites['minion_red_melee'] = this.drawMinionCanvas('red', 'melee');
    this.sprites['minion_blue_ranged'] = this.drawMinionCanvas('blue', 'ranged');
    this.sprites['minion_red_ranged'] = this.drawMinionCanvas('red', 'ranged');
  }

  drawMinionCanvas(team, type) {
    const c = document.createElement('canvas');
    c.width = 44;
    c.height = 54;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const primaryColor = team === 'blue' ? '#2196f3' : '#f44336';
    const darkColor = team === 'blue' ? '#0d47a1' : '#b71c1c';
    const trimColor = '#ffd700';

    ctx.save();
    // Body / Armor
    ctx.fillStyle = darkColor;
    ctx.fillRect(14, 22, 16, 22);

    // Tunic / Cloak
    ctx.fillStyle = primaryColor;
    ctx.fillRect(16, 24, 12, 18);

    // Head / Helmet
    ctx.fillStyle = '#616161';
    ctx.fillRect(14, 10, 16, 14);
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(16, 8, 12, 4);

    // Visor / Eyes
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(18, 14, 10, 4);

    // Boots
    ctx.fillStyle = '#37474f';
    ctx.fillRect(13, 44, 7, 8);
    ctx.fillRect(24, 44, 7, 8);

    if (type === 'melee') {
      // Shield
      ctx.fillStyle = '#78909c';
      ctx.fillRect(6, 22, 8, 18);
      ctx.fillStyle = trimColor;
      ctx.fillRect(8, 26, 4, 10);

      // Sword
      ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(32, 14, 4, 22);
      ctx.fillStyle = trimColor;
      ctx.fillRect(30, 28, 8, 3);
    } else {
      // Staff / Wand
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(32, 8, 4, 34);
      // Magic Gem
      ctx.fillStyle = team === 'blue' ? '#00e5ff' : '#ff9100';
      ctx.beginPath();
      ctx.arc(34, 8, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // White flash
    const flash = document.createElement('canvas');
    flash.width = c.width;
    flash.height = c.height;
    const fctx = flash.getContext('2d');
    fctx.drawImage(c, 0, 0);
    fctx.globalCompositeOperation = 'source-in';
    fctx.fillStyle = '#ffffff';
    fctx.fillRect(0, 0, c.width, c.height);

    return {
      canvas: c,
      flashCanvas: flash,
      width: c.width,
      height: c.height,
      anchorX: c.width * 0.5,
      anchorY: c.height - 2
    };
  }

  // Draw character with full procedural animation state
  renderEntity(ctx, spriteKey, x, y, opt = {}) {
    const spr = this.sprites[spriteKey];
    if (!spr) return;

    const {
      facing = 1,
      state = 'idle',
      animTime = 0,
      hitFlash = 0,
      alpha = 1.0,
      visualHeight = ENTITY_VISUALS.heroHeight,
      targetScale = null,
      tint = null
    } = opt;
    const renderScale = targetScale ?? (visualHeight / spr.height);

    ctx.save();
    ctx.globalAlpha = alpha;
    // Render straight from the full-resolution chroma-keyed crop. The only
    // resample is this final DPR-backed draw, avoiding cached low-res sprites.
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';

    // 1. Draw Ground Shadow
    if (state !== 'dive') {
      const shadowW = 32;
      const shadowH = 10;
      ctx.drawImage(this.shadowCanvas, x - shadowW * 0.5, y - shadowH * 0.5, shadowW, shadowH);
    }

    // 2. Procedural Animation Math
    let sx = 1.0;
    let sy = 1.0;
    let rot = 0;
    let offsetY = 0;

    switch (state) {
      case 'idle':
        // Breathing bob & subtle scale
        sy = 1.0 + Math.sin(animTime * 3) * 0.025;
        sx = 1.0 - Math.sin(animTime * 3) * 0.015;
        offsetY = Math.sin(animTime * 3) * 2;
        break;

      case 'run':
        // Fast running bounce & tilt
        sy = 1.0 + Math.abs(Math.sin(animTime * 14)) * 0.08;
        sx = 1.0 - Math.abs(Math.sin(animTime * 14)) * 0.05;
        rot = facing * 0.08; // Lean forward
        offsetY = -Math.abs(Math.sin(animTime * 14)) * 6;
        break;

      case 'jump':
        // Stretch vertically
        sy = 1.18;
        sx = 0.86;
        rot = facing * 0.05;
        break;

      case 'fall':
        sy = 1.1;
        sx = 0.92;
        break;

      case 'land':
        // Squash on impact
        sy = 0.8;
        sx = 1.25;
        break;

      case 'dash':
        // Horizontal stretch + speed lean
        sy = 0.75;
        sx = 1.35;
        rot = facing * 0.18;
        offsetY = 4;
        break;

      case 'attack1':
        // Quick slash thrust
        sy = 0.95;
        sx = 1.15;
        rot = facing * -0.12;
        break;

      case 'attack2':
        // Cross slash
        sy = 1.05;
        sx = 1.1;
        rot = facing * 0.15;
        break;

      case 'attack3':
        // Heavy finisher slam
        sy = 1.2;
        sx = 0.9;
        rot = facing * -0.25;
        offsetY = -8;
        break;

      case 'uppercut':
        sy = 1.3;
        sx = 0.8;
        rot = facing * -0.1;
        offsetY = -12;
        break;

      case 'dive':
        // Dive plunge downwards
        sy = 1.25;
        sx = 0.85;
        rot = facing * 0.45;
        break;

      case 'hurt':
        // Flinch knockback
        sy = 0.9;
        sx = 1.1;
        rot = -facing * 0.25;
        offsetY = -Math.sin(animTime * 20) * 3;
        break;

      case 'dead':
        sy = 0.5;
        sx = 1.3;
        rot = -facing * 1.4;
        offsetY = 12;
        break;
    }

    // 3. Apply Transformations
    ctx.translate(x, y + offsetY);
    ctx.scale(facing * renderScale * sx, renderScale * sy);
    ctx.rotate(rot);

    // 4. Draw Sprite or Hit Flash
    const drawCanvas = (hitFlash > 0) ? spr.flashCanvas : spr.canvas;

    ctx.drawImage(
      drawCanvas,
      -spr.anchorX,
      -spr.anchorY,
      spr.width,
      spr.height
    );

    ctx.restore();
  }

  renderSummon(ctx, summonKey, x, y, opt = {}) {
    const sheet = this.summonSprites[summonKey];
    if (!sheet) return false;
    const state = sheet[opt.state] ? opt.state : 'idle';
    const frames = sheet[state];
    const frame = sheet.static ?? frames?.[Math.floor((opt.animTime ?? 0) * (state === 'attack' ? 10 : 8)) % frames.length];
    if (!frame) return false;
    const height = opt.visualHeight ?? 54;
    const scale = height / frame.height;
    ctx.save();
    ctx.globalAlpha = opt.alpha ?? 1;
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.translate(x, y);
    ctx.scale((opt.facing ?? 1) * scale, scale);
    ctx.drawImage(frame.canvas, -frame.anchorX, -frame.anchorY);
    ctx.restore();
    return true;
  }
}

export const sprites = new SpriteManager();
