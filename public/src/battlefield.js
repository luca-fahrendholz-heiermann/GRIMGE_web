// GRIMGE Prototype — Battlefield using High-Definition Arena Backdrop & Exact Mockup Stage Layout
import { Minion, Tower, EnemyChampion } from './entities.js';

export class Battlefield {
  constructor() {
    this.width = 1024;
    this.height = 576;
    this.groundY = 415; // Exact bridge walkway level in 1024x576 coordinates

    // High-Definition Arena Backdrop matching Mockup
    this.bgImage = new Image();
    this.bgImage.src = 'assets/arena_bg.jpg';
    this.bgLoaded = false;
    this.bgImage.onload = () => {
      this.bgLoaded = true;
    };

    // Platforms matching clean stage architecture
    this.platforms = [
      // Main Bridge Stone Walkway (Solid base)
      { x: 0, y: this.groundY, width: 1024, height: 161, isSolid: true },

      // Left Blue Castle Balcony (Where blue guardian stands / reachable via jump)
      { x: 55, y: 215, width: 105, height: 12, isSolid: false },

      // Right Red Castle Balcony (Where red guardian stands / reachable via jump)
      { x: 865, y: 215, width: 105, height: 12, isSolid: false }
    ];

    // Towers / Strongholds (Inside Castle Gates)
    this.blueTower = new Tower(135, this.groundY, 'blue');
    this.redTower = new Tower(890, this.groundY, 'red');

    // Central Obelisk Beacons (Matching clean stage crystal pillars)
    this.centerBlueBeacon = { x: 466, y: 252 };
    this.centerRedBeacon = { x: 556, y: 252 };

    // Wave Spawning
    this.waveInterval = 18.0;
    this.waveTimer = 18.0;
    this.waveNumber = 1;
  }

  update(dt, gameWorld) {
    this.blueTower.update(dt, gameWorld);
    this.redTower.update(dt, gameWorld);

    // Wave Spawner
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.waveTimer = this.waveInterval;
      this.spawnWave(gameWorld);
    }
  }

  spawnWave(gameWorld) {
    // Blue Wave emerging from Left Castle Gate (x ~ 125, staggered lanes)
    gameWorld.minions.push(new Minion(135, this.groundY + 6, 'blue', 'melee'));
    gameWorld.minions.push(new Minion(115, this.groundY - 8, 'blue', 'melee'));
    gameWorld.minions.push(new Minion(95, this.groundY, 'blue', 'ranged'));

    // Red Wave emerging from Right Castle Gate (x ~ 895, staggered lanes)
    gameWorld.minions.push(new Minion(885, this.groundY + 6, 'red', 'melee'));
    gameWorld.minions.push(new Minion(905, this.groundY - 8, 'red', 'melee'));
    gameWorld.minions.push(new Minion(925, this.groundY, 'red', 'ranged'));

    this.waveNumber++;
    gameWorld.showAnnouncement(`WAVE ${this.waveNumber} ADVANCES!`);
  }

  resolveEntityCollision(entity) {
    const feetY = entity.y;
    const prevFeetY = entity.y - entity.vy * 0.016;

    // Physical Castle Walls / Gates Bounds (prevents falling off or walking through castle walls)
    if (entity.x < 110) { entity.x = 110; entity.vx = 0; }
    if (entity.x > this.width - 110) { entity.x = this.width - 110; entity.vx = 0; }

    let landed = false;

    for (const plat of this.platforms) {
      const withinX = (entity.x >= plat.x - 12) && (entity.x <= plat.x + plat.width + 12);

      if (withinX) {
        if (plat.isSolid) {
          if (feetY >= plat.y) {
            entity.y = plat.y;
            entity.vy = 0;
            landed = true;
            break;
          }
        } else {
          if (!entity.isFastFalling && entity.vy >= 0 && prevFeetY <= plat.y + 12 && feetY >= plat.y) {
            entity.y = plat.y;
            entity.vy = 0;
            landed = true;
            break;
          }
        }
      }
    }

    entity.grounded = landed;
    if (landed && entity.jumpsLeft !== undefined) {
      entity.jumpsLeft = 2;
    }
  }

  // Draw the high-definition scene backdrop
  renderBackground(ctx, camera, viewW, viewH) {
    if (this.bgLoaded) {
      ctx.drawImage(this.bgImage, 0, 0, viewW, viewH);
    } else {
      ctx.fillStyle = '#1c2838';
      ctx.fillRect(0, 0, viewW, viewH);
    }
  }

  // Draw subtle active beacon glows on center crystal pillars
  renderForeground(ctx) {
    const time = performance.now() * 0.003;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Blue Pillar Crystal Pulse (Center Left Pillar)
    const blueGlow = ctx.createRadialGradient(466, 252, 2, 466, 252, 20 + Math.sin(time * 3) * 4);
    blueGlow.addColorStop(0, '#ffffff');
    blueGlow.addColorStop(0.35, '#00e5ff');
    blueGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = blueGlow;
    ctx.beginPath();
    ctx.arc(466, 252, 22, 0, Math.PI * 2);
    ctx.fill();

    // Red Pillar Crystal Pulse (Center Right Pillar)
    const redGlow = ctx.createRadialGradient(556, 252, 2, 556, 252, 20 + Math.cos(time * 3) * 4);
    redGlow.addColorStop(0, '#ffffff');
    redGlow.addColorStop(0.35, '#ff1744');
    redGlow.addColorStop(1, 'rgba(255, 23, 68, 0)');
    ctx.fillStyle = redGlow;
    ctx.beginPath();
    ctx.arc(556, 252, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
