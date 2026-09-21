// GRIMGE Prototype — authored 2.5D arena battlefield.
import { Castle, Minion, Tower } from './entities.js';
import { ARENA_LAYOUT, clampToArena, groundYForDepth, surfaceContains, surfaceHeight } from './world.js';
import { ART_ASSETS } from './art_assets.js';

export class Battlefield {
  constructor(mode = null) {
    this.width = ARENA_LAYOUT.width;
    this.height = ARENA_LAYOUT.height;
    this.playableBounds = ARENA_LAYOUT.playableBounds;
    this.platforms = ARENA_LAYOUT.decorativePlatforms;
    // Castle battlements exist only in the Siege world. Invasion and Dungeon
    // intentionally use one continuous ground plane; otherwise the invisible
    // right Castle surface from Siege can make actors hover. Arena gets its
    // own visible Smash-style, landing-only intermediate platforms.
    const mainArena = ARENA_LAYOUT.surfaces[0];
    this.surfaces = mode?.world === 'arena'
      ? [mainArena, ...ARENA_LAYOUT.arenaPlatforms]
      : (mode?.world === 'invasion' || mode?.world === 'dungeon')
        ? [mainArena]
        : ARENA_LAYOUT.surfaces;

    this.bgImage = new Image();
    this.bgImage.src = 'assets/arena_bg.jpg';
    this.bgLoaded = false;
    this.bgImage.onload = () => { this.bgLoaded = true; };
    this.bgImage.onerror = () => console.error('Failed to load clean arena background.');

    this.modeBackdropImages = {};
    const modeBackdrops = ART_ASSETS.scenes;
    Object.entries(modeBackdrops).forEach(([world, src]) => {
      const image = new Image();
      this.modeBackdropImages[world] = { image, loaded: false };
      image.onload = () => { this.modeBackdropImages[world].loaded = true; };
      image.onerror = () => console.error(`Failed to load ${world} scene backdrop.`);
      image.src = src;
    });

    this.sceneLayers = {};
    const layers = ART_ASSETS.sceneLayers;
    if (layers) {
      Object.entries(layers).forEach(([world, paths]) => {
        const entry = { far: { image: new Image(), loaded: false }, floor: { image: new Image(), loaded: false } };
        entry.far.image.onload = () => { entry.far.loaded = true; };
        entry.floor.image.onload = () => { entry.floor.loaded = true; };
        entry.far.image.src = paths.far;
        entry.floor.image.src = paths.floor;
        this.sceneLayers[world] = entry;
      });
    }

    const invasion = mode?.world === 'invasion';
    // Invasion is deliberately not a mirrored Siege map. The player holds the
    // left-hand keep while hostile waves enter from the open right world.
    const blueSpawn = ARENA_LAYOUT.spawns.blueCastle;
    const redSpawn = invasion ? { x: 1120, z: 0.58 } : ARENA_LAYOUT.spawns.redCastle;
    this.blueCastle = new Castle(blueSpawn.x, blueSpawn.z, 'blue', (castle) => this.onCastleDestroyed?.(castle), (castle) => this.onProtectedCastleHit?.(castle));
    this.redCastle = new Castle(redSpawn.x, redSpawn.z, 'red', (castle) => this.onCastleDestroyed?.(castle), (castle) => this.onProtectedCastleHit?.(castle));
    this.blueTower = new Tower(ARENA_LAYOUT.towers.blue.x, ARENA_LAYOUT.towers.blue.z, 'blue', (tower) => this.unlockCastle(tower.team));
    this.redTower = new Tower(ARENA_LAYOUT.towers.red.x, ARENA_LAYOUT.towers.red.z, 'red', (tower) => this.unlockCastle(tower.team));
    this.defenseTowers = invasion
      ? [
          new Tower(210, 0.27, 'blue'),
          new Tower(210, 0.83, 'blue')
        ]
      : [];
    if (invasion) {
      this.blueCastle.isVulnerable = true;
      this.redCastle.isDestroyed = true;
      this.blueTower.isDead = true;
      this.redTower.isDead = true;
      this.defenseTowers.forEach((tower) => { tower.maxHp = tower.hp = 560; tower.range = 245; });
    }
    // Castle objective cores sit at their lower gate/structure. They remain
    // distinct from the elevated battlement surfaces used by Wizard spawns.
    [this.blueCastle, this.redCastle].forEach((castle) => { castle.surfaceId = 'mainArena'; castle.surfaceHeight = 0; });
    [this.blueTower, this.redTower, ...this.defenseTowers].forEach((tower) => this.placeOnSurface(tower));
    this.decorativeBeacons = ARENA_LAYOUT.decorativeBeacons;
    this.waveInterval = 18;
    this.waveTimer = 18;
    this.waveNumber = 0;
    this.mode = mode;
    this.objectivesActive = mode?.objectives !== false;
    this.autoWaves = mode?.autoWaves !== false;
  }

  update(dt, gameWorld) {
    if (this.objectivesActive) {
      if (this.mode?.world === 'invasion') this.defenseTowers.forEach((tower) => tower.update(dt, gameWorld));
      else {
        this.blueTower.update(dt, gameWorld);
        this.redTower.update(dt, gameWorld);
      }
      this.blueCastle.update(dt);
      if (this.mode?.world !== 'invasion') this.redCastle.update(dt);
    }
    if (this.autoWaves) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.waveTimer = this.waveInterval;
        this.spawnWave(gameWorld);
      }
    }
  }

  spawnWave(gameWorld) {
    const { blueWave, redWave, laneZ } = ARENA_LAYOUT.spawns;
    for (let i = 0; i < 3; i++) {
      const type = i === 2 ? 'ranged' : 'melee';
      gameWorld.minions.push(new Minion(blueWave[i], laneZ[i], 'blue', type, i));
      gameWorld.minions.push(new Minion(redWave[i], laneZ[i], 'red', type, i));
    }
    this.waveNumber++;
    gameWorld.showAnnouncement(`WAVE ${this.waveNumber} ADVANCES!`);
  }

  getTower(team) { return team === 'blue' ? this.blueTower : this.redTower; }
  getCastle(team) { return team === 'blue' ? this.blueCastle : this.redCastle; }
  getSpawn(team) {
    if (this.mode?.world === 'invasion') return team === 'blue' ? ARENA_LAYOUT.spawns.blueCastle : { x: 950, z: 0.58 };
    return team === 'blue' ? ARENA_LAYOUT.spawns.blueCastle : ARENA_LAYOUT.spawns.redCastle;
  }
  getObjectivesForTeam(team) {
    if (this.mode?.world === 'invasion') {
      if (team !== 'blue') return [];
      return [...this.defenseTowers.filter((tower) => !tower.isDead), ...(this.blueCastle.isDestroyed ? [] : [this.blueCastle])];
    }
    const tower = this.getTower(team);
    const castle = this.getCastle(team);
    return [...(!tower.isDead ? [tower] : []), ...(!castle.isDestroyed ? [castle] : [])];
  }
  unlockCastle(team) {
    const castle = this.getCastle(team);
    if (!castle.isDestroyed && !castle.isVulnerable) {
      castle.isVulnerable = true;
      this.onTowerDestroyed?.(this.getTower(team), castle);
    }
  }

  resolveEntityCollision(entity) {
    const worldHeight = entity.worldHeight ?? 0;
    const previousSurfaceHeight = entity.surfaceHeight ?? 0;
    const oldX = entity.x;
    const oldZ = entity.z;
    clampToArena(entity);
    if (entity.x !== oldX) entity.vx = 0;
    if (entity.z !== oldZ) entity.vz = 0;
    const surface = this.getSurfaceAt(entity.x, entity.z, entity);
    const nextSurfaceHeight = surfaceHeight(surface, entity.x);
    // Ramps are continuous ground. Leaving the side/front of a raised Castle
    // platform is a meaningful drop: preserve that height as elevation so an
    // actor visibly falls instead of snapping down to the arena.
    const steppedOffLedge = entity.grounded && nextSurfaceHeight < previousSurfaceHeight - 10;
    if (steppedOffLedge) {
      entity.elevation = previousSurfaceHeight - nextSurfaceHeight;
      entity.vElevation = Math.min(entity.vElevation, -70);
      entity.grounded = false;
    } else if (entity.grounded) entity.elevation = 0;
    else {
      entity.elevation = worldHeight - nextSurfaceHeight;
      if (entity.elevation <= 0) { entity.elevation = 0; entity.vElevation = 0; entity.grounded = true; }
    }
    entity.surfaceId = surface.id;
    entity.surfaceHeight = nextSurfaceHeight;
  }

  getSurfaceAt(x, z, entity = null) {
    // Lane units always remain on the ground plane. This intentionally makes
    // Castle battlements a Wizard-only spell-duel zone without reintroducing
    // separate rails or platformer physics for the rest of the arena.
    if (entity?.isMinion) return this.surfaces[0];
    // Main arena is the fallback; elevated authored surfaces take priority.
    // A landing-only Arena platform is never a walk-up ledge. A character
    // must be falling from at least its top height, or already stand on it.
    const candidates = [...this.surfaces].reverse().filter((surface) => surfaceContains(surface, x, z));
    for (const surface of candidates) {
      if (!surface.landingOnly || !entity) return surface;
      if (entity.surfaceId === surface.id) return surface;
      const currentHeight = (entity.surfaceHeight ?? 0) + (entity.elevation ?? 0);
      const canLand = !entity.grounded && entity.vElevation <= 0 && currentHeight >= surfaceHeight(surface, x) - 8;
      if (canLand) return surface;
    }
    return this.surfaces[0];
  }

  placeOnSurface(entity) {
    entity.elevation = 0; entity.grounded = true;
    const surface = this.getSurfaceAt(entity.x, entity.z, entity);
    entity.surfaceId = surface.id;
    entity.surfaceHeight = surfaceHeight(surface, entity.x);
  }

  renderBackground(ctx, camera, gameplayWidth, viewH, renderWidth = gameplayWidth, cameraOffsetX = 0, modeState = null) {
    if (this.mode?.world === 'arena' || this.mode?.world === 'dungeon') {
      this.renderModeBackground(ctx, gameplayWidth, viewH, renderWidth, cameraOffsetX, modeState);
      return;
    }
    // The authored arena art remains at its intended 16:9 composition.
    // Wider displays reveal decorative edge continuation rather than
    // stretching the arena, changing combat coordinates, or adding black
    // pillar bars. Game objects are translated by cameraOffsetX separately.
    const overflow = Math.max(0, renderWidth - gameplayWidth);
    ctx.fillStyle = '#101925';
    ctx.fillRect(0, 0, renderWidth, viewH);
    if (!this.bgLoaded) return;

    if (overflow > 0 && this.bgImage.naturalWidth) {
      const band = Math.max(24, Math.min(96, Math.floor(this.bgImage.naturalWidth * 0.12)));
      const leftDest = cameraOffsetX;
      const rightDest = cameraOffsetX + gameplayWidth;
      // Repeating narrow edge strips creates a decorative stone/sky
      // continuation with no anisotropic scaling of the central pixel art.
      for (let x = leftDest - band; x >= -band; x -= band) {
        ctx.drawImage(this.bgImage, 0, 0, band, this.bgImage.naturalHeight, x, 0, band, viewH);
      }
      for (let x = rightDest; x < renderWidth; x += band) {
        ctx.drawImage(this.bgImage, this.bgImage.naturalWidth - band, 0, band, this.bgImage.naturalHeight, x, 0, band, viewH);
      }
    }
    ctx.drawImage(this.bgImage, cameraOffsetX, 0, gameplayWidth, viewH);
  }

  renderModeBackground(ctx, gameplayWidth, viewH, renderWidth, cameraOffsetX, modeState = null) {
    const w = renderWidth;
    const h = viewH;
    ctx.fillStyle = '#050a12';
    ctx.fillRect(0, 0, w, h);
    this.drawModeBackdrop(ctx, w, h, this.mode?.world, modeState);
  }

  drawModeBackdrop(ctx, w, h, world, modeState) {
    const phase = world === 'dungeon'
      ? (modeState?.scroll ?? 0) * 4 + (modeState?.routeScroll ?? 0)
      : 0;

    if (world === 'dungeon') this._paintDungeonScene(ctx, w, h, phase);
    else if (world === 'invasion') this._paintInvasionScene(ctx, w, h, phase);
    else this._paintArenaScene(ctx, w, h, phase);
  }

  _paintSilhouetteRange(ctx, w, h, baseY, amp, seeds, offsetX, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 2) {
      const n = x + offsetX;
      let y = baseY;
      for (const s of seeds) y -= amp * s.a * Math.sin(n / s.w + (s.p || 0));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  _overlayFloorTiles(ctx, w, h, world, phase) {
    const layers = this.sceneLayers?.[world];
    if (!layers?.floor?.loaded) return;
    const floor = layers.floor.image;
    const flw = floor.naturalWidth || floor.width;
    const flh = floor.naturalHeight || floor.height;
    if (!flw || !flh) return;
    const floorY = Math.round(h * 0.54);
    const floorAreaH = h - floorY;
    const floorScale = floorAreaH / flh;
    const floorDrawW = flw * floorScale;
    const offset = -(phase * 0.8 * floorDrawW * 3) % floorDrawW;
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let x = offset - floorDrawW; x < w; x += floorDrawW) {
      ctx.drawImage(floor, x, floorY, floorDrawW, floorAreaH);
    }
    ctx.restore();
  }

  _paintDungeonScene(ctx, w, h, phase) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, '#030810');
    sky.addColorStop(0.35, '#0a1828');
    sky.addColorStop(0.7, '#0c2218');
    sky.addColorStop(1, '#081a10');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.55);

    const mx = w * 0.72, my = h * 0.11;
    const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 90);
    mg.addColorStop(0, 'rgba(160,190,210,.12)');
    mg.addColorStop(1, 'rgba(160,190,210,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, 90, 0, Math.PI * 2); ctx.fill();

    this._paintSilhouetteRange(ctx, w, h, h * 0.34, 42,
      [{a:.5, w:280}, {a:.3, w:120, p:1.5}, {a:.2, w:400, p:0.8}],
      phase * 120, '#0a1a28');

    this._paintSilhouetteRange(ctx, w, h, h * 0.40, 50,
      [{a:.5, w:180, p:0.4}, {a:.35, w:80, p:2.1}, {a:.15, w:320, p:1.3}],
      phase * 280, '#071512');

    this._paintSilhouetteRange(ctx, w, h, h * 0.47, 45,
      [{a:.35, w:38}, {a:.3, w:16, p:1.8}, {a:.2, w:65, p:0.5}, {a:.15, w:9, p:3.0}],
      phase * 500, '#050f0a');

    const gnd = ctx.createLinearGradient(0, h * 0.47, 0, h);
    gnd.addColorStop(0, '#081a10');
    gnd.addColorStop(0.35, '#0a1e14');
    gnd.addColorStop(1, '#040c06');
    ctx.fillStyle = gnd;
    ctx.fillRect(0, h * 0.47, w, h * 0.53);

    this._overlayFloorTiles(ctx, w, h, 'dungeon', phase);

    const fog = ctx.createLinearGradient(0, h * 0.44, 0, h * 0.58);
    fog.addColorStop(0, 'rgba(20,40,30,0)');
    fog.addColorStop(0.5, 'rgba(20,40,30,.18)');
    fog.addColorStop(1, 'rgba(20,40,30,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, h * 0.44, w, h * 0.14);

    const tv = ctx.createLinearGradient(0, 0, 0, h * 0.14);
    tv.addColorStop(0, 'rgba(2,5,3,.55)');
    tv.addColorStop(1, 'rgba(2,5,3,0)');
    ctx.fillStyle = tv;
    ctx.fillRect(0, 0, w, h * 0.14);
  }

  _paintInvasionScene(ctx, w, h, phase) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, '#140820');
    sky.addColorStop(0.2, '#2a1040');
    sky.addColorStop(0.5, '#4a1a28');
    sky.addColorStop(0.8, '#3a1820');
    sky.addColorStop(1, '#201018');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.55);

    const sx = w * 0.55, sy = h * 0.40;
    const sg = ctx.createRadialGradient(sx, sy, 15, sx, sy, 220);
    sg.addColorStop(0, 'rgba(200,90,40,.14)');
    sg.addColorStop(0.5, 'rgba(140,40,60,.06)');
    sg.addColorStop(1, 'rgba(80,20,40,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sx, sy, 220, 0, Math.PI * 2); ctx.fill();

    this._paintSilhouetteRange(ctx, w, h, h * 0.36, 48,
      [{a:.5, w:300, p:0.2}, {a:.3, w:130, p:1.7}, {a:.2, w:450, p:0.5}],
      phase * 100, '#1a0c22');

    this._paintSilhouetteRange(ctx, w, h, h * 0.43, 38,
      [{a:.5, w:200}, {a:.3, w:90, p:1.4}, {a:.2, w:50, p:2.5}],
      phase * 250, '#150a18');

    this._paintSilhouetteRange(ctx, w, h, h * 0.49, 22,
      [{a:.4, w:28, p:0.8}, {a:.25, w:14, p:2.3}, {a:.2, w:55, p:1.0}, {a:.15, w:8}],
      phase * 420, '#0e060e');

    const gnd = ctx.createLinearGradient(0, h * 0.48, 0, h);
    gnd.addColorStop(0, '#1a0e0a');
    gnd.addColorStop(0.3, '#201210');
    gnd.addColorStop(1, '#0c0806');
    ctx.fillStyle = gnd;
    ctx.fillRect(0, h * 0.48, w, h * 0.52);

    this._overlayFloorTiles(ctx, w, h, 'invasion', phase);

    const mist = ctx.createLinearGradient(w, 0, w * 0.4, 0);
    mist.addColorStop(0, 'rgba(22,3,36,.25)');
    mist.addColorStop(1, 'rgba(22,3,36,0)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, 0, w, h);

    const tv = ctx.createLinearGradient(0, 0, 0, h * 0.12);
    tv.addColorStop(0, 'rgba(8,3,12,.5)');
    tv.addColorStop(1, 'rgba(8,3,12,0)');
    ctx.fillStyle = tv;
    ctx.fillRect(0, 0, w, h * 0.12);
  }

  _paintArenaScene(ctx, w, h, phase) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, '#04060c');
    sky.addColorStop(0.35, '#0a0e1a');
    sky.addColorStop(0.7, '#0c1020');
    sky.addColorStop(1, '#0a0c16');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.55);

    this._paintSilhouetteRange(ctx, w, h, h * 0.12, 35,
      [{a:.6, w:55}, {a:.3, w:22, p:1.5}, {a:.1, w:95, p:0.8}],
      phase * 50, '#06080f');

    this._paintSilhouetteRange(ctx, w, h, h * 0.42, 30,
      [{a:.5, w:140, p:0.3}, {a:.3, w:55, p:2.0}, {a:.2, w:28, p:1.1}],
      phase * 130, '#080a14');

    const torchT = performance.now() * 0.004;
    for (let i = 0; i < 5; i++) {
      const tx = w * (0.1 + i * 0.22);
      const ty = h * 0.34;
      const fl = 0.8 + 0.2 * Math.sin(torchT + i * 2.3);
      const tg = ctx.createRadialGradient(tx, ty, 2, tx, ty, 55 * fl);
      tg.addColorStop(0, `rgba(255,180,60,${(0.1 * fl).toFixed(3)})`);
      tg.addColorStop(0.5, `rgba(200,100,20,${(0.04 * fl).toFixed(3)})`);
      tg.addColorStop(1, 'rgba(100,50,10,0)');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.arc(tx, ty, 55 * fl, 0, Math.PI * 2); ctx.fill();
    }

    const gnd = ctx.createLinearGradient(0, h * 0.48, 0, h);
    gnd.addColorStop(0, '#0c0e18');
    gnd.addColorStop(0.3, '#0e1020');
    gnd.addColorStop(1, '#060810');
    ctx.fillStyle = gnd;
    ctx.fillRect(0, h * 0.48, w, h * 0.52);

    this._overlayFloorTiles(ctx, w, h, 'arena', phase);

    const tv = ctx.createLinearGradient(0, 0, 0, h * 0.15);
    tv.addColorStop(0, 'rgba(2,3,6,.6)');
    tv.addColorStop(1, 'rgba(2,3,6,0)');
    ctx.fillStyle = tv;
    ctx.fillRect(0, 0, w, h * 0.15);
  }

  renderForeground(ctx) {
    this.renderArenaPlatforms(ctx);
    const time = performance.now() * 0.003;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.decorativeBeacons.forEach((beacon, i) => {
      const radius = 18 + Math.sin(time * 3 + i * Math.PI) * 3;
      const glow = ctx.createRadialGradient(beacon.x, beacon.y, 2, beacon.x, beacon.y, radius);
      glow.addColorStop(0, '#fff');
      glow.addColorStop(0.35, beacon.color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(beacon.x, beacon.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    if (this.objectivesActive) {
      if (this.mode?.world === 'invasion') this.defenseTowers.filter((tower) => !tower.isDead).forEach((tower) => tower.render(ctx));
      else {
        if (!this.blueTower.isDead) this.blueTower.render(ctx);
        if (!this.redTower.isDead) this.redTower.render(ctx);
      }
      this.blueCastle.render(ctx);
      if (this.mode?.world !== 'invasion') this.redCastle.render(ctx);
    }
  }

  renderArenaPlatforms(ctx) {
    if (this.mode?.world !== 'arena') return;
    ctx.save();
    for (const platform of this.surfaces.filter((surface) => surface.landingOnly)) {
      const h = surfaceHeight(platform, (platform.xMin + platform.xMax) * .5);
      const topY = groundYForDepth(platform.zMin) - h;
      const bottomY = groundYForDepth(platform.zMax) - h;
      const thickness = 11;
      const glow = ctx.createLinearGradient(0, topY, 0, bottomY + thickness);
      glow.addColorStop(0, '#5bdfff');
      glow.addColorStop(.13, '#274a73');
      glow.addColorStop(.72, '#172339');
      glow.addColorStop(1, '#0a101b');
      ctx.fillStyle = glow;
      ctx.strokeStyle = '#8af1ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(platform.xMin, topY);
      ctx.lineTo(platform.xMax, topY);
      ctx.lineTo(platform.xMax, bottomY + thickness);
      ctx.lineTo(platform.xMin, bottomY + thickness);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(platform.xMin + 8, topY + 4); ctx.lineTo(platform.xMax - 8, topY + 4); ctx.stroke();
      ctx.fillStyle = 'rgba(74,226,255,.58)';
      for (let x = platform.xMin + 18; x < platform.xMax - 8; x += 26) ctx.fillRect(x, topY + 7, 9, 2);
    }
    ctx.restore();
  }

  renderDebug(ctx, gameWorld) {
    const b = this.playableBounds;
    ctx.save();
    ctx.font = '11px monospace';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 255, 170, 0.12)';
    ctx.strokeStyle = '#00ffaa';
    const farY = groundYForDepth(b.farZ);
    const nearY = groundYForDepth(b.nearZ);
    ctx.fillRect(b.left, farY, b.right - b.left, nearY - farY);
    ctx.strokeRect(b.left, farY, b.right - b.left, nearY - farY);
    for (const surface of this.surfaces.filter((surface) => surface.id !== 'mainArena')) {
      const topLeft = groundYForDepth(surface.zMin) - surfaceHeight(surface, surface.xMin);
      const topRight = groundYForDepth(surface.zMin) - surfaceHeight(surface, surface.xMax);
      const bottomRight = groundYForDepth(surface.zMax) - surfaceHeight(surface, surface.xMax);
      const bottomLeft = groundYForDepth(surface.zMax) - surfaceHeight(surface, surface.xMin);
      ctx.fillStyle = surface.id.includes('Platform') ? 'rgba(160, 120, 255, .2)' : 'rgba(255, 210, 70, .16)';
      ctx.strokeStyle = surface.id.includes('Platform') ? '#c9a7ff' : '#ffd640';
      ctx.beginPath(); ctx.moveTo(surface.xMin, topLeft); ctx.lineTo(surface.xMax, topRight); ctx.lineTo(surface.xMax, bottomRight); ctx.lineTo(surface.xMin, bottomLeft); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.fillText(`${surface.label} h:${Math.round(surfaceHeight(surface, (surface.xMin + surface.xMax) * .5))}`, surface.xMin + 3, topLeft - 5);
    }
    ctx.fillStyle = '#ffd640';
    for (const platform of this.platforms) {
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      ctx.fillText(`${platform.label} (scenery)`, platform.x + 3, platform.y - 5);
    }
    const entities = [gameWorld.player, gameWorld.enemyChampion, ...gameWorld.minions];
    for (const entity of entities) {
      if (!entity || entity.isDead || entity.lifeState === 'Dead') continue;
      ctx.strokeStyle = entity.team === 'blue' ? '#42a5ff' : '#ff5252';
      ctx.strokeRect(entity.x - entity.width * 0.5, entity.y - entity.height, entity.width, entity.height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(entity.x - 2, entity.y - 2, 4, 4);
      const minionInfo = entity.laneIndex !== undefined ? ` lane:${entity.laneIndex + 1} target:${entity.target?.isObjective ? entity.target.team + '-objective' : entity.target?.team ?? '-'}` : '';
      ctx.fillText(`${entity.surfaceId} x:${entity.x.toFixed(0)} z:${(entity.z ?? 0).toFixed(2)} j:${(entity.elevation ?? 0).toFixed(0)} h:${(entity.worldHeight ?? 0).toFixed(0)}${minionInfo}`, entity.x + 6, entity.y - 5);
    }
    this.blueTower.renderRange(ctx);
    this.redTower.renderRange(ctx);
    for (const tower of [this.blueTower, this.redTower]) {
      ctx.strokeStyle = tower.team === 'blue' ? '#00e5ff' : '#ff5252';
      ctx.strokeRect(tower.x - tower.hitRadiusX, tower.y - 54, tower.hitRadiusX * 2, 54);
      const targetLabel = tower.currentTarget ? `${tower.currentTarget.team} ${tower.currentTarget.isObjective ? 'STRUCTURE (BLOCKED)' : 'MOBILE'}` : 'none';
      ctx.fillText(`${tower.team.toUpperCase()} TOWER ${tower.isDead ? 'DESTROYED' : `${Math.ceil(tower.hp)}/${tower.maxHp}`} target:${targetLabel}`, tower.x - 72, tower.y - 61);
    }
    for (const team of ['blue', 'red']) {
      const castle = this.getCastle(team); const spawn = this.getSpawn(team);
      ctx.strokeStyle = team === 'blue' ? '#42a5ff' : '#ff5252';
      ctx.strokeRect(castle.x - castle.hitRadiusX, castle.y - 76, castle.hitRadiusX * 2, 36);
      ctx.fillText(`${team.toUpperCase()} CASTLE ${castle.isDestroyed ? 'DESTROYED' : castle.isVulnerable ? 'VULNERABLE' : 'PROTECTED'} ${Math.ceil(castle.hp)}/${castle.maxHp}`, castle.x - 70, castle.y - 86);
      const spawnSurface = this.getSurfaceAt(spawn.x, spawn.z);
      ctx.fillRect(spawn.x - 3, groundYForDepth(spawn.z) - surfaceHeight(spawnSurface, spawn.x) - 3, 6, 6);
    }
    ARENA_LAYOUT.spawns.laneZ.forEach((z, index) => { const y = groundYForDepth(z); ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(b.left, y); ctx.lineTo(b.right, y); ctx.stroke(); ctx.fillText(`LANE ${index + 1}`, b.right - 55, y - 4); }); ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.fillText(`F3: ${gameWorld.matchState}/${gameWorld.objectivePhase} | blue respawn:${gameWorld.canRespawn('blue')} red respawn:${gameWorld.canRespawn('red')} winner:${gameWorld.winnerTeam ?? '-'}`, 12, 112);
    ctx.restore();
  }
}
