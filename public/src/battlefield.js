// GRIMGE Prototype — authored 2.5D arena battlefield.
import { Castle, Minion, Tower } from './entities.js';
import { ARENA_LAYOUT, clampToArena, groundYForDepth, surfaceContains, surfaceHeight } from './world.js';

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
    if (this.mode?.world === 'arena' || this.mode?.world === 'dungeon' || this.mode?.world === 'invasion') {
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
    const world = this.mode?.world;
    const w = renderWidth; const h = viewH;
    const horizon = Math.round(h * 0.42);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, world === 'dungeon' ? '#07131e' : '#071021');
    sky.addColorStop(.52, world === 'invasion' ? '#20314b' : '#172a4a');
    sky.addColorStop(1, '#11141c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // Code-native scenery intentionally avoids borrowed map art. It provides
    // a readable world edge for Invasion and a castle-free 2.5D platform for
    // Arena/Dungeon while preserving the combat coordinate system.
    ctx.save();
    // The Dungeon route advances with the player inside a room and then
    // swaps to its next segment after a clear. Actors stay in their authored
    // combat coordinate space; this is visual parallax, never a balance
    // changing camera transform.
    const routeOffset = world === 'dungeon'
      ? ((modeState?.scroll ?? 0) * 73 + (modeState?.routeScroll ?? 0) * 73)
      : 0;
    for (let i = 0; i < 42; i++) {
      const x = (i * 197 + 41 - routeOffset) % w; const y = 24 + ((i * 83) % Math.max(70, horizon - 20));
      ctx.fillStyle = i % 5 === 0 ? 'rgba(129,198,255,.75)' : 'rgba(205,227,255,.36)';
      ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
    ctx.fillStyle = 'rgba(17,31,52,.92)';
    for (let x = -60 - routeOffset; x < w + 90; x += 115) {
      const peak = horizon - 24 - ((x / 115) % 3) * 13;
      ctx.beginPath(); ctx.moveTo(x, horizon + 55); ctx.lineTo(x + 65, peak); ctx.lineTo(x + 130, horizon + 55); ctx.closePath(); ctx.fill();
    }
    const floor = ctx.createLinearGradient(0, horizon, 0, h);
    floor.addColorStop(0, world === 'dungeon' ? '#1b2733' : '#28334a'); floor.addColorStop(1, '#0c1018');
    ctx.fillStyle = floor; ctx.beginPath(); ctx.moveTo(0, horizon + 38); ctx.lineTo(w, horizon + 38); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(79,217,255,.26)'; ctx.lineWidth = 1;
    for (let y = horizon + 58; y < h; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + 20); ctx.stroke(); }
    for (let x = 0; x <= w; x += 70) { ctx.beginPath(); ctx.moveTo(w * .5, horizon + 36); ctx.lineTo(x, h); ctx.stroke(); }
    if (world === 'invasion') {
      const mist = ctx.createLinearGradient(w, 0, w * .45, 0); mist.addColorStop(0, 'rgba(4,10,17,.72)'); mist.addColorStop(1, 'rgba(19,35,49,.16)');
      ctx.fillStyle = mist; ctx.fillRect(w * .48, 0, w * .52, h);
      ctx.fillStyle = 'rgba(112,158,179,.18)'; ctx.fillRect(w * .56, horizon + 30, w * .44, 50);
      ctx.fillStyle = '#101a21'; ctx.fillRect(0, horizon - 80, w * .19, h - horizon + 80);
      ctx.fillStyle = '#334658'; ctx.fillRect(w * .02, horizon - 65, w * .15, 34);
    }
    if (world === 'dungeon') {
      ctx.fillStyle = 'rgba(115,231,255,.38)';
      ctx.fillRect(w * .72, horizon - 46, 3, 86);
      ctx.fillStyle = 'rgba(9,20,30,.86)';
      ctx.fillRect(w * .72 - 27, horizon - 43, 57, 5);
    }
    ctx.restore();
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
