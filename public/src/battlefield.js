// GRIMGE Prototype — authored 2.5D arena battlefield.
import { Castle, Minion, Tower } from './entities.js';
import { ARENA_LAYOUT, clampToArena, groundYForDepth, surfaceContains, surfaceHeight } from './world.js';

export class Battlefield {
  constructor() {
    this.width = ARENA_LAYOUT.width;
    this.height = ARENA_LAYOUT.height;
    this.playableBounds = ARENA_LAYOUT.playableBounds;
    this.platforms = ARENA_LAYOUT.decorativePlatforms;
    this.surfaces = ARENA_LAYOUT.surfaces;

    this.bgImage = new Image();
    this.bgImage.src = 'assets/arena_bg.jpg';
    this.bgLoaded = false;
    this.bgImage.onload = () => { this.bgLoaded = true; };
    this.bgImage.onerror = () => console.error('Failed to load clean arena background.');

    this.blueCastle = new Castle(ARENA_LAYOUT.spawns.blueCastle.x, ARENA_LAYOUT.spawns.blueCastle.z, 'blue', (castle) => this.onCastleDestroyed?.(castle), (castle) => this.onProtectedCastleHit?.(castle));
    this.redCastle = new Castle(ARENA_LAYOUT.spawns.redCastle.x, ARENA_LAYOUT.spawns.redCastle.z, 'red', (castle) => this.onCastleDestroyed?.(castle), (castle) => this.onProtectedCastleHit?.(castle));
    this.blueTower = new Tower(ARENA_LAYOUT.towers.blue.x, ARENA_LAYOUT.towers.blue.z, 'blue', (tower) => this.unlockCastle(tower.team));
    this.redTower = new Tower(ARENA_LAYOUT.towers.red.x, ARENA_LAYOUT.towers.red.z, 'red', (tower) => this.unlockCastle(tower.team));
    // Castle objective cores sit at their lower gate/structure. They remain
    // distinct from the elevated battlement surfaces used by Wizard spawns.
    [this.blueCastle, this.redCastle].forEach((castle) => { castle.surfaceId = 'mainArena'; castle.surfaceHeight = 0; });
    [this.blueTower, this.redTower].forEach((tower) => this.placeOnSurface(tower));
    this.decorativeBeacons = ARENA_LAYOUT.decorativeBeacons;
    this.waveInterval = 18;
    this.waveTimer = 18;
    this.waveNumber = 0;
  }

  update(dt, gameWorld) {
    this.blueTower.update(dt, gameWorld);
    this.redTower.update(dt, gameWorld);
    this.blueCastle.update(dt);
    this.redCastle.update(dt);
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.waveTimer = this.waveInterval;
      this.spawnWave(gameWorld);
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
  getSpawn(team) { return team === 'blue' ? ARENA_LAYOUT.spawns.blueCastle : ARENA_LAYOUT.spawns.redCastle; }
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
    return [...this.surfaces].reverse().find((surface) => surfaceContains(surface, x, z)) ?? this.surfaces[0];
  }

  placeOnSurface(entity) {
    entity.elevation = 0; entity.grounded = true;
    const surface = this.getSurfaceAt(entity.x, entity.z, entity);
    entity.surfaceId = surface.id;
    entity.surfaceHeight = surfaceHeight(surface, entity.x);
  }

  renderBackground(ctx, camera, viewW, viewH) {
    if (this.bgLoaded) ctx.drawImage(this.bgImage, 0, 0, viewW, viewH);
    else {
      ctx.fillStyle = '#1c2838';
      ctx.fillRect(0, 0, viewW, viewH);
    }
  }

  renderForeground(ctx) {
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
    if (!this.blueTower.isDead) this.blueTower.render(ctx);
    if (!this.redTower.isDead) this.redTower.render(ctx);
    this.blueCastle.render(ctx);
    this.redCastle.render(ctx);
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
