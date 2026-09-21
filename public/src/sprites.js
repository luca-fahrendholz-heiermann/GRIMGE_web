// GRIMGE Prototype — Sprite Pipeline & Procedural Animation Engine
import { ENTITY_VISUALS } from './world.js';
import { ART_ASSETS } from './art_assets.js';

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
      darklord: { name: 'The Dark Lord', file: 'char_dark_lord.png', weapon: 'Blood Crown & Blacksteel', role: 'Dark Vanguard / Control' },
      astral: { name: 'Astral', file: 'char_astral.png', weapon: 'Starbound Arcana', role: 'Starborn / Arcane Balance' },
      astral_v2: { name: 'Astral Unhooded', file: 'char_astral_v2.png', weapon: 'Starbound Arcana', role: 'Starborn / Arcane Balance' }
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
    await this.loadDungeonUnitSprites();
    await this.loadSheetSprites();
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

    // Sample background green from corner. Newly authored source sprites can
    // already contain a transparent alpha channel; those must retain their
    // black/dark pixels instead of treating transparent black as chroma.
    const bgR = data[0];
    const bgG = data[1];
    const bgB = data[2];
    const sourceHasAlpha = data[3] === 0;

    let minX = w, maxX = 0, minY = h, maxY = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (sourceHasAlpha && data[idx + 3] === 0) continue;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Color distance to background
        const dr = r - bgR;
        const dg = g - bgG;
        const db = b - bgB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        // Chroma-key the flat source background plus the darker green edge
        // spill left by some supplied character exports.  The second clause
        // is intentionally gated by a strongly green corner sample, so a
        // normal green costume/weapon is not removed from non-keyed art.
        const sourceIsGreenScreen = bgG > bgR * 1.45 && bgG > bgB * 1.45 && bgG > 100;
        const greenSpill = sourceIsGreenScreen && g > 72 && g > r * 1.32 && g > b * 1.28 && (g - Math.max(r, b)) > 36;
        const isChroma = !sourceHasAlpha && ((dist < 48) || greenSpill || (g > 135 && g > r * 1.5 && g > b * 1.5 && dist < 95));

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

  // Load editable Aseprite exports if an artist has supplied them. The
  // fallback remains available for a missing file, but it never overwrites a
  // real export. Replacing art is therefore a file-only operation.
  loadOptionalSprite(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.sprites[key] = this.chromaKeyAndCrop(img);
        console.log(`✦ ${key} authored export processed & cached.`);
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

  // Original code-owned pixel units for the current Dungeon vertical slice.
  // The matching editable Aseprite source lives under art/authoring. Keeping
  // the runtime fallback procedural means the prototype stays playable if a
  // PNG export has not yet been made on the art workstation.
  async loadDungeonUnitSprites() {
    const { dungeonVoidRaider, dungeonDawnGuard } = ART_ASSETS.entities;
    const [raiderLoaded, guardLoaded] = await Promise.all([
      this.loadOptionalSprite(dungeonVoidRaider.key, dungeonVoidRaider.runtime),
      this.loadOptionalSprite(dungeonDawnGuard.key, dungeonDawnGuard.runtime)
    ]);
    if (!raiderLoaded) this.sprites[dungeonVoidRaider.key] = this.drawDungeonUnitCanvas('raider');
    if (!guardLoaded) this.sprites[dungeonDawnGuard.key] = this.drawDungeonUnitCanvas('guard');
  }

  async loadSheetSprites() {
    const { sheetEntities, dungeonPool } = ART_ASSETS;
    if (!sheetEntities) return;
    const entries = Object.values(sheetEntities);
    await Promise.all(entries.map(ent => this.loadOneSheet(ent)));
    if (dungeonPool) {
      const pe = dungeonPool.primaryEnemy;
      const pa = dungeonPool.primaryAlly;
      if (pe && this.sprites[pe]) this.sprites['dungeon_void_raider'] = this.sprites[pe];
      if (pa && this.sprites[pa]) this.sprites['dungeon_dawn_guard'] = this.sprites[pa];
    }
  }

  loadOneSheet(ent) {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const { grid, anims } = ent;
        const cellW = grid.w;
        const cellH = grid.h;
        const frameMap = {};
        for (const [animName, coords] of Object.entries(anims)) {
          frameMap[animName] = coords.map(([col, row]) => {
            const cell = document.createElement('canvas');
            cell.width = cellW;
            cell.height = cellH;
            const cctx = cell.getContext('2d', { willReadFrequently: true });
            cctx.imageSmoothingEnabled = false;
            cctx.drawImage(img, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);
            return this.cropTransparent(cell);
          }).filter(f => f !== null);
        }
        const idle = frameMap.idle?.[0];
        if (!idle) { resolve(false); return; }
        const sprite = {
          canvas: idle.canvas,
          flashCanvas: idle.flashCanvas,
          hurtCanvas: idle.hurtCanvas,
          width: idle.width,
          height: idle.height,
          anchorX: idle.anchorX,
          anchorY: idle.anchorY,
          frames: frameMap
        };
        this.sprites[ent.key] = sprite;
        console.log(`✦ ${ent.key} sheet sprite loaded (${Object.keys(frameMap).length} anims).`);
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = ent.sheets[0];
    });
  }

  cropTransparent(cellCanvas) {
    const w = cellCanvas.width;
    const h = cellCanvas.height;
    const ctx = cellCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let hasContent = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          hasContent = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!hasContent) return null;
    const pad = 2;
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const cropped = document.createElement('canvas');
    cropped.width = cropW + pad * 2;
    cropped.height = cropH + pad * 2;
    const cctx = cropped.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(cellCanvas, minX, minY, cropW, cropH, pad, pad, cropW, cropH);
    const flash = document.createElement('canvas');
    flash.width = cropped.width; flash.height = cropped.height;
    const fctx = flash.getContext('2d');
    fctx.drawImage(cropped, 0, 0);
    fctx.globalCompositeOperation = 'source-in';
    fctx.fillStyle = '#ffffff';
    fctx.fillRect(0, 0, flash.width, flash.height);
    const hurt = document.createElement('canvas');
    hurt.width = cropped.width; hurt.height = cropped.height;
    const hctx = hurt.getContext('2d');
    hctx.drawImage(cropped, 0, 0);
    hctx.globalCompositeOperation = 'source-in';
    hctx.fillStyle = '#ff2222';
    hctx.fillRect(0, 0, hurt.width, hurt.height);
    return {
      canvas: cropped,
      flashCanvas: flash,
      hurtCanvas: hurt,
      width: cropped.width,
      height: cropped.height,
      anchorX: cropped.width * 0.5,
      anchorY: cropped.height - pad
    };
  }

  makeCanvasSprite(canvas, anchorY = canvas.height - 2) {
    const flash = document.createElement('canvas');
    flash.width = canvas.width; flash.height = canvas.height;
    const flashCtx = flash.getContext('2d');
    flashCtx.drawImage(canvas, 0, 0);
    flashCtx.globalCompositeOperation = 'source-in';
    flashCtx.fillStyle = '#ffffff';
    flashCtx.fillRect(0, 0, flash.width, flash.height);
    return {
      canvas,
      flashCanvas: flash,
      width: canvas.width,
      height: canvas.height,
      anchorX: canvas.width * 0.5,
      anchorY
    };
  }

  drawDungeonUnitCanvas(kind) {
    const c = document.createElement('canvas');
    c.width = 48; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
    if (kind === 'raider') {
      // Void Raider: an original hooded scout silhouette with a violet shard.
      rect(12, 24, 24, 26, '#24203b'); rect(9, 31, 30, 19, '#24203b');
      rect(11, 28, 8, 26, '#56316f'); rect(29, 28, 8, 26, '#56316f');
      rect(15, 10, 18, 17, '#111525'); rect(17, 8, 14, 4, '#24203b'); rect(14, 13, 20, 12, '#24203b');
      rect(18, 15, 12, 9, '#b97655'); rect(17, 21, 14, 5, '#111525');
      rect(19, 18, 3, 2, '#57eeff'); rect(27, 18, 3, 2, '#57eeff');
      rect(10, 27, 11, 8, '#69758e'); rect(28, 27, 11, 8, '#69758e'); rect(17, 27, 14, 20, '#111525');
      rect(19, 29, 10, 13, '#24203b'); rect(22, 31, 4, 8, '#9d5cff');
      rect(9, 34, 7, 17, '#111525'); rect(32, 34, 7, 16, '#111525'); rect(38, 25, 3, 22, '#69758e'); rect(36, 39, 7, 3, '#d9c4ff');
      rect(17, 47, 6, 13, '#151b2c'); rect(26, 47, 6, 13, '#151b2c'); rect(14, 58, 11, 4, '#111525'); rect(25, 58, 11, 4, '#111525');
      rect(39, 14, 3, 4, '#9d5cff'); rect(40, 13, 1, 1, '#d9c4ff');
    } else {
      // Dawn Guard: a rescued companion with warm armour and a cyan banner.
      rect(39, 7, 2, 49, '#ffe18b'); rect(34, 10, 6, 12, '#31547b'); rect(35, 11, 4, 9, '#66f2ff');
      rect(11, 27, 26, 25, '#182848'); rect(14, 30, 20, 21, '#31547b'); rect(17, 48, 6, 12, '#101827'); rect(26, 48, 6, 12, '#101827');
      rect(14, 58, 11, 4, '#182848'); rect(25, 58, 11, 4, '#182848');
      rect(16, 11, 16, 15, '#cf8d64'); rect(14, 9, 20, 6, '#e7edf5'); rect(16, 7, 6, 5, '#e7edf5'); rect(26, 7, 6, 5, '#e7edf5');
      rect(18, 17, 3, 2, '#66f2ff'); rect(27, 17, 3, 2, '#66f2ff');
      rect(16, 27, 16, 15, '#9db2c7'); rect(18, 29, 12, 11, '#182848'); rect(22, 31, 4, 6, '#66f2ff'); rect(16, 42, 16, 3, '#a66b20');
      rect(8, 30, 8, 18, '#9db2c7'); rect(10, 33, 4, 11, '#66f2ff'); rect(32, 31, 6, 18, '#182848');
    }
    return this.makeCanvasSprite(c);
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

  resolveFrame(spr, state, animTime, hitFlash) {
    if (!spr.frames) {
      return {
        canvas: (hitFlash > 0) ? spr.flashCanvas : spr.canvas,
        width: spr.width, height: spr.height,
        anchorX: spr.anchorX, anchorY: spr.anchorY
      };
    }
    const animKey = ART_ASSETS.stateToAnim?.[state] ?? 'idle';
    const frames = spr.frames[animKey] ?? spr.frames.idle;
    if (!frames || frames.length === 0) {
      return {
        canvas: (hitFlash > 0) ? spr.flashCanvas : spr.canvas,
        width: spr.width, height: spr.height,
        anchorX: spr.anchorX, anchorY: spr.anchorY
      };
    }
    const fps = (animKey === 'attack') ? 10 : (animKey === 'walk' || animKey === 'run') ? 8 : 4;
    const idx = Math.floor(Math.abs(animTime) * fps) % frames.length;
    const f = frames[idx];
    return {
      canvas: (hitFlash > 0) ? (f.flashCanvas ?? f.canvas) : f.canvas,
      width: f.width, height: f.height,
      anchorX: f.anchorX, anchorY: f.anchorY
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

    const frame = this.resolveFrame(spr, state, animTime, hitFlash);
    const renderScale = targetScale ?? (visualHeight / frame.height);

    ctx.save();
    ctx.globalAlpha = alpha;
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

    // Sheet sprites get reduced procedural transforms (frames carry the pose)
    const proc = spr.frames ? 0.4 : 1.0;

    switch (state) {
      case 'idle':
        sy = 1.0 + Math.sin(animTime * 3) * 0.025 * proc;
        sx = 1.0 - Math.sin(animTime * 3) * 0.015 * proc;
        offsetY = Math.sin(animTime * 3) * 2 * proc;
        break;

      case 'run':
        sy = 1.0 + Math.abs(Math.sin(animTime * 14)) * 0.08 * proc;
        sx = 1.0 - Math.abs(Math.sin(animTime * 14)) * 0.05 * proc;
        rot = facing * 0.08 * proc;
        offsetY = -Math.abs(Math.sin(animTime * 14)) * 6 * proc;
        break;

      case 'jump':
        sy = 1.0 + 0.18 * proc;
        sx = 1.0 - 0.14 * proc;
        rot = facing * 0.05 * proc;
        break;

      case 'fall':
        sy = 1.0 + 0.1 * proc;
        sx = 1.0 - 0.08 * proc;
        break;

      case 'land':
        sy = 1.0 - 0.2 * proc;
        sx = 1.0 + 0.25 * proc;
        break;

      case 'dash':
        sy = 1.0 - 0.25 * proc;
        sx = 1.0 + 0.35 * proc;
        rot = facing * 0.18 * proc;
        offsetY = 4 * proc;
        break;

      case 'attack1':
        sy = 1.0 - 0.05 * proc;
        sx = 1.0 + 0.15 * proc;
        rot = facing * -0.12 * proc;
        break;

      case 'attack2':
        sy = 1.0 + 0.05 * proc;
        sx = 1.0 + 0.1 * proc;
        rot = facing * 0.15 * proc;
        break;

      case 'attack3':
        sy = 1.0 + 0.2 * proc;
        sx = 1.0 - 0.1 * proc;
        rot = facing * -0.25 * proc;
        offsetY = -8 * proc;
        break;

      case 'uppercut':
        sy = 1.0 + 0.3 * proc;
        sx = 1.0 - 0.2 * proc;
        rot = facing * -0.1 * proc;
        offsetY = -12 * proc;
        break;

      case 'dive':
        sy = 1.0 + 0.25 * proc;
        sx = 1.0 - 0.15 * proc;
        rot = facing * 0.45 * proc;
        break;

      case 'hurt':
        sy = 1.0 - 0.1 * proc;
        sx = 1.0 + 0.1 * proc;
        rot = -facing * 0.25 * proc;
        offsetY = -Math.sin(animTime * 20) * 3 * proc;
        break;

      case 'dead':
        sy = 1.0 - 0.5 * proc;
        sx = 1.0 + 0.3 * proc;
        rot = -facing * 1.4 * proc;
        offsetY = 12 * proc;
        break;
    }

    // 3. Apply Transformations
    ctx.translate(x, y + offsetY);
    ctx.scale(facing * renderScale * sx, renderScale * sy);
    ctx.rotate(rot);

    // 4. Draw Sprite or Hit Flash
    ctx.drawImage(
      frame.canvas,
      -frame.anchorX,
      -frame.anchorY,
      frame.width,
      frame.height
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
