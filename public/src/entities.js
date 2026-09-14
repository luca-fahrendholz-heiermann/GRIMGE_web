// GRIMGE Prototype — Entities: Player, Minions, Towers & Enemy Champion AI
import { sprites } from './sprites.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { spells } from './spells.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 24;
    this.height = 54;
    this.facing = 1; // 1 = right, -1 = left
    this.team = 'blue';

    // Current hero selection: 'paladin', 'berserker', 'mage', 'warlord', 'fighter'
    this.heroKey = 'paladin';

    // Stats
    this.maxHp = 200;
    this.hp = 200;
    this.maxMp = 100;
    this.mp = 100;
    this.maxSp = 100;
    this.sp = 100;

    // Movement attributes
    this.moveSpeed = 340;
    this.jumpForce = 580;
    this.grounded = false;
    this.jumpsLeft = 2;
    this.isFastFalling = false;

    // State machine
    this.state = 'idle';
    this.animTime = 0;
    this.stateTimer = 0;
    this.hitFlash = 0;
    this.invulnerableTimer = 0;
    this.freezeTimer = 0;
    this.slowTimer = 0;
    this.slowFactor = 1.0;

    // Combat combo state
    this.comboStep = 0;
    this.comboResetTimer = 0;
    this.canAttack = true;

    // Prepared Runes (up to 3)
    this.preparedRunes = [];

    // Ghost trail for dashing
    this.ghosts = [];
  }

  setHero(heroKey) {
    if (sprites.sprites[heroKey]) {
      this.heroKey = heroKey;
      audio.playSlash(1.3);
      combat.spawnShockwave(this.x, this.y - 25, 40, '#ffd700');
    }
  }

  update(dt, input, battlefield) {
    this.animTime += dt;

    // Update status timers
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      this.vx = 0;
      return;
    }

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1.0;
    }

    // Regain MP & SP over time
    this.mp = Math.min(this.maxMp, this.mp + dt * 14);
    this.sp = Math.min(this.maxSp, this.sp + dt * 25);

    // Combo reset timer
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) this.comboStep = 0;
    }

    // Update ghost trail
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      this.ghosts[i].alpha -= dt * 3.5;
      if (this.ghosts[i].alpha <= 0) this.ghosts.splice(i, 1);
    }

    // Handle Attack States
    if (this.state.startsWith('attack') || this.state === 'uppercut' || this.state === 'dive' || this.state === 'dash') {
      this.stateTimer -= dt;
      if (this.state === 'dash') {
        if (Math.random() < 0.6) {
          this.ghosts.push({ x: this.x, y: this.y, facing: this.facing, alpha: 0.5, state: this.state, animTime: this.animTime });
        }
      }
      if (this.stateTimer <= 0) {
        this.state = this.grounded ? 'idle' : 'fall';
        this.canAttack = true;
      }
    }

    // Movement Inputs
    const isAttacking = this.state.startsWith('attack') || this.state === 'uppercut' || this.state === 'dive';
    const isDashing = this.state === 'dash';

    if (!isAttacking && !isDashing) {
      let moveDir = 0;
      if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveDir -= 1;
      if (input.keys['KeyD'] || input.keys['ArrowRight']) moveDir += 1;

      if (moveDir !== 0) {
        this.facing = moveDir;
        const targetVx = moveDir * this.moveSpeed * this.slowFactor;
        this.vx += (targetVx - this.vx) * Math.min(1, dt * 18);
        if (this.grounded) {
          this.state = 'run';
          if (Math.random() < 0.25) combat.spawnDust(this.x, this.y, 1);
        }
      } else {
        this.vx *= Math.pow(0.001, dt); // Snappy friction
        if (Math.abs(this.vx) < 10) this.vx = 0;
        if (this.grounded && this.state === 'run') this.state = 'idle';
      }

      // Jump (W or Space)
      if (input.justPressed('KeyW') || input.justPressed('ArrowUp')) {
        if (this.jumpsLeft > 0) {
          this.jumpsLeft--;
          this.vy = -this.jumpForce;
          this.grounded = false;
          this.state = 'jump';
          audio.playJump();
          combat.spawnDust(this.x, this.y, 3);
        }
      }

      // Fast fall (S)
      if (input.keys['KeyS'] || input.keys['ArrowDown']) {
        if (!this.grounded) {
          this.vy += 1200 * dt;
          this.isFastFalling = true;
        }
      } else {
        this.isFastFalling = false;
      }

      // Dodge Roll / Dash (Shift)
      if ((input.justPressed('ShiftLeft') || input.justPressed('ShiftRight')) && this.sp >= 25) {
        this.sp -= 25;
        this.state = 'dash';
        this.stateTimer = 0.26;
        this.invulnerableTimer = 0.28;
        this.vx = this.facing * 720;
        this.vy = 0;
        audio.playDash();
        combat.spawnShockwave(this.x, this.y - 25, 30, '#ffd700');
      }

      // Melee Attack Input (Left Click or J)
      if (input.justPressed('KeyJ') || input.justPressed('Mouse0')) {
        this.executeAttack(input);
      }
    }

    // Apply Gravity
    const gravity = this.isFastFalling ? 1600 : 1100;
    this.vy += gravity * dt;

    // Integrate Physics Position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Platform & Floor Collisions
    battlefield.resolveEntityCollision(this);

    // Fall state detection
    if (!this.grounded && !isAttacking && !isDashing) {
      this.state = this.vy < 0 ? 'jump' : 'fall';
    }
  }

  // Melee Attack Moveset
  executeAttack(input) {
    if (!this.canAttack) return;
    this.canAttack = false;

    // Up-Tilt Launcher
    if (input.keys['KeyW'] || input.keys['ArrowUp']) {
      this.state = 'uppercut';
      this.stateTimer = 0.28;
      this.vy = -280;
      audio.playSlash(1.2);
      combat.spawnSlashArc(this.x, this.y - 25, this.facing, {
        radius: 46, angleStart: -1.2, angleEnd: 0.6, color: '#ffea00', glow: '#ff9800'
      });
      this.triggerMeleeHitbox(40, this.facing * 140, -480, 0.5);
      return;
    }

    // Down-Air Dive Strike
    if (!this.grounded && (input.keys['KeyS'] || input.keys['ArrowDown'])) {
      this.state = 'dive';
      this.stateTimer = 0.35;
      this.vy = 850;
      audio.playSlash(0.9);
      combat.spawnSlashArc(this.x, this.y - 15, this.facing, {
        radius: 50, angleStart: 0.8, angleEnd: 2.2, color: '#ff5722', glow: '#d50000'
      });
      this.triggerMeleeHitbox(55, this.facing * 200, 300, 0.6);
      return;
    }

    // 3-Hit Melee Combo Chain
    this.comboStep = (this.comboStep % 3) + 1;
    this.comboResetTimer = 0.65;

    if (this.comboStep === 1) {
      this.state = 'attack1';
      this.stateTimer = 0.22;
      this.vx = this.facing * 180;
      audio.playSlash(1.0);
      combat.spawnSlashArc(this.x + this.facing * 20, this.y - 28, this.facing, {
        radius: 40, angleStart: -0.6, angleEnd: 0.8, color: '#ffffff', glow: '#ffd54f'
      });
      this.triggerMeleeHitbox(28, this.facing * 220, -100, 0.35);
    } else if (this.comboStep === 2) {
      this.state = 'attack2';
      this.stateTimer = 0.24;
      this.vx = this.facing * 220;
      audio.playSlash(1.15);
      combat.spawnSlashArc(this.x + this.facing * 22, this.y - 28, this.facing, {
        radius: 44, angleStart: 0.6, angleEnd: -0.8, color: '#ffffff', glow: '#ff9800'
      });
      this.triggerMeleeHitbox(34, this.facing * 260, -140, 0.4);
    } else {
      // Finisher!
      this.state = 'attack3';
      this.stateTimer = 0.35;
      this.vx = this.facing * 320;
      audio.playSlash(0.85);
      combat.spawnSlashArc(this.x + this.facing * 25, this.y - 32, this.facing, {
        radius: 54, angleStart: -1.0, angleEnd: 1.2, color: '#ffd700', glow: '#ff3d00', width: 7
      });
      this.triggerMeleeHitbox(52, this.facing * 480, -320, 0.6, true);
    }
  }

  triggerMeleeHitbox(dmg, kx, ky, stunDuration, isFinisher = false) {
    // Check collision against opposing entities in frontline arc
    const hitW = 75;
    const hitH = 65;
    const hitX = this.x + (this.facing > 0 ? 10 : -hitW - 10);
    const hitY = this.y - 55;

    // Connect to window gameWorld
    const targets = window.gameWorld.getHostileTargets(this.team);
    let hitAny = false;

    for (const t of targets) {
      if (t.x >= hitX && t.x <= hitX + hitW && t.y >= hitY && t.y <= hitY + hitH + 40) {
        hitAny = true;
        t.takeDamage(dmg, kx, ky, stunDuration, isFinisher);
        combat.spawnHitSparks(t.x, t.y - 25, this.facing, isFinisher ? '#ffea00' : '#ffffff', isFinisher ? 16 : 8);
      }
    }

    if (hitAny) {
      audio.playImpact(isFinisher);
      combat.triggerHitstop(isFinisher ? 6 : 4);
      combat.shakeCamera(isFinisher ? 8 : 4, 0.2);
    }
  }

  takeDamage(amount, kx = 0, ky = 0, stun = 0.3, isCrit = false) {
    if (this.invulnerableTimer > 0) return;

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.15;
    this.vx = kx;
    this.vy = ky;
    this.state = 'hurt';
    this.stateTimer = stun;
    this.grounded = false;

    audio.playImpact(isCrit);
    combat.spawnDamageText(this.x, this.y - 45, amount, { isCrit, color: '#ff5252' });
    combat.shakeCamera(isCrit ? 9 : 5, 0.25);

    if (this.hp <= 0) {
      this.state = 'dead';
      combat.spawnShockwave(this.x, this.y - 25, 60, '#ff1744');
    }
  }

  freeze(duration) {
    this.freezeTimer = duration;
    combat.spawnDamageText(this.x, this.y - 45, 0, { text: 'FROZEN!', color: '#00e5ff' });
  }

  slow(duration, factor) {
    this.slowTimer = duration;
    this.slowFactor = factor;
  }

  // Prepared Runes methods
  addPreparedRune(rune) {
    if (this.preparedRunes.length < 3) {
      this.preparedRunes.push(rune);
      return true;
    }
    return false;
  }

  clearPreparedRunes() {
    this.preparedRunes = [];
  }

  render(ctx) {
    // Render Dash Ghosts
    for (const g of this.ghosts) {
      sprites.renderEntity(ctx, this.heroKey, g.x, g.y, {
        facing: g.facing,
        state: g.state,
        animTime: g.animTime,
        alpha: g.alpha,
        hitFlash: 1
      });
    }

    // Render Entity
    sprites.renderEntity(ctx, this.heroKey, this.x, this.y, {
      facing: this.facing,
      state: this.state,
      animTime: this.animTime,
      hitFlash: this.hitFlash > 0 ? 1 : 0
    });

    // Frozen Ice Block Overlay
    if (this.freezeTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.45)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(this.x - 24, this.y - 75, 48, 75);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ----------------------------------------------------
// LANE MINIONS (Melee & Ranged)
// ----------------------------------------------------

export class Minion {
  constructor(x, y, team, type = 'melee') {
    this.x = x;
    this.y = y;
    this.team = team;
    this.type = type;
    this.spriteKey = `minion_${team}_${type}`;
    this.facing = team === 'blue' ? 1 : -1;

    this.maxHp = type === 'melee' ? 90 : 55;
    this.hp = this.maxHp;
    this.speed = type === 'melee' ? 75 : 60;
    this.attackRange = type === 'melee' ? 32 : 180;
    this.attackCooldown = type === 'melee' ? 1.4 : 2.0;
    this.attackTimer = Math.random() * 0.8;
    this.damage = type === 'melee' ? 14 : 18;

    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.width = 20;
    this.height = 36;
    this.state = 'run';
    this.animTime = Math.random() * 10;
    this.hitFlash = 0;
    this.isDead = false;
    this.freezeTimer = 0;
    this.slowTimer = 0;
    this.slowFactor = 1.0;
  }

  update(dt, gameWorld, battlefield) {
    this.animTime += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      this.vx = 0;
      return;
    }
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1.0;
    }

    if (this.attackTimer > 0) this.attackTimer -= dt;

    // Find nearest hostile target (minions, player, enemy hero, or tower)
    const targets = gameWorld.getHostileTargets(this.team);
    let nearestTarget = null;
    let nearestDist = Infinity;

    for (const t of targets) {
      const dist = Math.abs(t.x - this.x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestTarget = t;
      }
    }

    if (nearestTarget && nearestDist <= this.attackRange) {
      // In range: stop and attack
      this.vx = 0;
      this.facing = Math.sign(nearestTarget.x - this.x) || this.facing;
      this.state = 'idle';

      if (this.attackTimer <= 0) {
        this.attackTimer = this.attackCooldown;
        this.performAttack(nearestTarget, gameWorld);
      }
    } else {
      // March forward along lane
      this.facing = this.team === 'blue' ? 1 : -1;
      this.vx = this.facing * this.speed * this.slowFactor;
      this.state = 'run';
    }

    // Apply gravity
    this.vy += 1000 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    battlefield.resolveEntityCollision(this);
  }

  performAttack(target, gameWorld) {
    audio.playSlash(1.4);
    if (this.type === 'melee') {
      combat.spawnSlashArc(this.x + this.facing * 14, this.y - 16, this.facing, {
        radius: 22, color: this.team === 'blue' ? '#42a5f5' : '#ef5350'
      });
      target.takeDamage(this.damage, this.facing * 100, -50, 0.2);
    } else {
      // Ranged projectile bolt
      gameWorld.spawnMinionBolt(this.x + this.facing * 12, this.y - 18, this.facing, this.team, this.damage);
    }
  }

  takeDamage(amount, kx = 0, ky = 0, stun = 0.25) {
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.15;
    this.vx = kx;
    this.vy = ky;
    this.grounded = false;

    combat.spawnDamageText(this.x, this.y - 25, amount, {
      color: this.team === 'blue' ? '#90caf9' : '#ffab91'
    });

    if (this.hp <= 0) {
      this.isDead = true;
      combat.spawnHitSparks(this.x, this.y - 16, this.facing, '#ffffff', 8);
    }
  }

  freeze(duration) {
    this.freezeTimer = duration;
    combat.spawnDamageText(this.x, this.y - 25, 0, { text: 'ICE', color: '#80d8ff' });
  }

  slow(duration, factor) {
    this.slowTimer = duration;
    this.slowFactor = factor;
  }

  render(ctx) {
    sprites.renderEntity(ctx, this.spriteKey, this.x, this.y, {
      facing: this.facing,
      state: this.state,
      animTime: this.animTime,
      hitFlash: this.hitFlash > 0 ? 1 : 0,
      targetScale: 0.72 // Proportional minion scale (~40px tall)
    });

    // Health bar above minion
    if (this.hp < this.maxHp) {
      const barW = 22;
      const barH = 3;
      const barX = this.x - barW * 0.5;
      const barY = this.y - 42;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = this.team === 'blue' ? '#42a5f5' : '#e53935';
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
    }
  }
}

// ----------------------------------------------------
// TOWER / DEFENSIVE STRONGHOLD
// ----------------------------------------------------

export class Tower {
  constructor(x, y, team) {
    this.x = x;
    this.y = y;
    this.team = team;
    this.maxHp = 800;
    this.hp = 800;
    this.range = 280;
    this.shootCooldown = 1.8;
    this.shootTimer = 0;
    this.isDead = false;
    this.corePulse = 0;
    this.hitFlash = 0;
    this.crystalY = y - 95;
  }

  update(dt, gameWorld) {
    this.corePulse += dt * 3;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.shootTimer > 0) this.shootTimer -= dt;

    // Detect invading hostiles
    const targets = gameWorld.getHostileTargets(this.team);
    let nearestTarget = null;
    let nearDist = this.range;

    for (const t of targets) {
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d < nearDist) {
        nearDist = d;
        nearestTarget = t;
      }
    }

    if (nearestTarget && this.shootTimer <= 0) {
      this.shootTimer = this.shootCooldown;
      this.fireDefenseOrb(nearestTarget, gameWorld);
    }
  }

  fireDefenseOrb(target, gameWorld) {
    audio.playTowerShot();
    combat.spawnShockwave(this.x, this.crystalY, 20, this.team === 'blue' ? '#00e5ff' : '#ff1744');
    gameWorld.spawnTowerOrb(this.x, this.crystalY, target, this.team, 42);
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.15;
    combat.spawnDamageText(this.x, this.crystalY - 15, amount, {
      isCrit: true,
      color: this.team === 'blue' ? '#4fc3f7' : '#e57373'
    });
    combat.shakeCamera(4, 0.2);

    if (this.hp <= 0 && !this.isDead) {
      this.isDead = true;
      combat.shakeCamera(15, 0.8);
      combat.spawnShockwave(this.x, this.crystalY, 80, '#ff9100');
      combat.spawnHitSparks(this.x, this.crystalY, 1, '#ffd700', 30);
    }
  }

  render(ctx) {
    ctx.save();
    // Floating Radiant Magical Defense Crystal Core (Seamless with stage background)
    const floatY = this.crystalY + Math.sin(this.corePulse) * 5;
    const crystalColor = this.team === 'blue' ? '#00e5ff' : '#ff1744';
    const glowColor = this.team === 'blue' ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 23, 68, 0.35)';

    // Crystal Glow Corona
    ctx.beginPath();
    ctx.arc(this.x, floatY, 18 + Math.sin(this.corePulse * 2) * 3, 0, Math.PI * 2);
    ctx.fillStyle = glowColor;
    ctx.fill();

    // Crystal Rhombus
    ctx.beginPath();
    ctx.moveTo(this.x, floatY - 15);
    ctx.lineTo(this.x + 9, floatY);
    ctx.lineTo(this.x, floatY + 15);
    ctx.lineTo(this.x - 9, floatY);
    ctx.closePath();
    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : crystalColor;
    ctx.shadowColor = crystalColor;
    ctx.shadowBlur = 12;
    ctx.fill();

    // Perimeter Circle (faint defense boundary)
    ctx.beginPath();
    ctx.arc(this.x, this.y - 30, this.range, 0, Math.PI * 2);
    ctx.strokeStyle = this.team === 'blue' ? 'rgba(33, 150, 243, 0.12)' : 'rgba(244, 67, 54, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }
}

// ----------------------------------------------------
// AUTONOMOUS ENEMY CHAMPION AI
// ----------------------------------------------------

export class EnemyChampion {
  constructor(x, y, heroKey = 'warlord') {
    this.x = x;
    this.y = y;
    this.heroKey = heroKey;
    this.team = 'red';
    this.facing = -1;

    this.maxHp = 280;
    this.hp = 280;
    this.mp = 100;

    this.speed = 260;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.state = 'idle';
    this.animTime = 0;
    this.hitFlash = 0;
    this.invulnerableTimer = 0;
    this.freezeTimer = 0;
    this.slowTimer = 0;
    this.slowFactor = 1.0;

    this.aiTimer = 0;
    this.attackCooldown = 0;
    this.spellCooldown = 3.0;
    this.retreating = false;
  }

  update(dt, gameWorld, battlefield) {
    this.animTime += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.spellCooldown > 0) this.spellCooldown -= dt;

    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      this.vx = 0;
      return;
    }
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1.0;
    }

    // AI Evaluation Loop (every 0.15s)
    this.aiTimer -= dt;
    if (this.aiTimer <= 0) {
      this.aiTimer = 0.15;
      this.evaluateTactics(gameWorld);
    }

    // Apply gravity
    this.vy += 1050 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    battlefield.resolveEntityCollision(this);

    // State update
    if (this.grounded) {
      if (Math.abs(this.vx) > 20) this.state = 'run';
      else if (!this.state.startsWith('attack')) this.state = 'idle';
    } else {
      this.state = this.vy < 0 ? 'jump' : 'fall';
    }
  }

  evaluateTactics(gameWorld) {
    const player = gameWorld.player;
    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

    // Health low: retreat to red tower
    if (this.hp < this.maxHp * 0.3) {
      this.retreating = true;
      this.facing = 1; // Move right towards base
      this.vx = this.speed * 0.9 * this.slowFactor;
      return;
    }
    this.retreating = false;

    // Spell Cast AI (Fireball or Stone Spikes)
    if (this.spellCooldown <= 0 && distToPlayer < 450 && distToPlayer > 120) {
      this.spellCooldown = 4.5;
      this.facing = Math.sign(player.x - this.x) || -1;
      this.vx = 0;
      audio.playSpell('ignis');
      spells.cast(this, { id: 'fireball', tier: 1 }, gameWorld);
      return;
    }

    // Melee Range Engagement
    if (distToPlayer <= 65) {
      this.facing = Math.sign(player.x - this.x) || -1;
      this.vx = 0;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 1.1;
        this.executeAIAttack(player);
      }
      return;
    }

    // Move toward player or forward lane
    if (distToPlayer < 600) {
      this.facing = Math.sign(player.x - this.x) || -1;
      this.vx = this.facing * this.speed * this.slowFactor;
      // Jump over obstacles if player is higher
      if (player.y < this.y - 50 && this.grounded && Math.random() < 0.3) {
        this.vy = -540;
        this.grounded = false;
        audio.playJump();
      }
    } else {
      // March toward blue base
      this.facing = -1;
      this.vx = -this.speed * 0.6 * this.slowFactor;
    }
  }

  executeAIAttack(target) {
    this.state = 'attack1';
    audio.playSlash(1.1);
    combat.spawnSlashArc(this.x + this.facing * 20, this.y - 28, this.facing, {
      radius: 42, color: '#f44336', glow: '#b71c1c'
    });

    target.takeDamage(24, this.facing * 240, -100, 0.3);
    combat.spawnHitSparks(target.x, target.y - 25, this.facing, '#f44336', 10);
    combat.triggerHitstop(4);
  }

  takeDamage(amount, kx = 0, ky = 0, stun = 0.35, isCrit = false) {
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.15;
    this.vx = kx;
    this.vy = ky;
    this.state = 'hurt';
    this.grounded = false;

    combat.spawnDamageText(this.x, this.y - 45, amount, { isCrit, color: '#ff7043' });
    combat.shakeCamera(isCrit ? 8 : 4, 0.2);

    if (this.hp <= 0) {
      this.state = 'dead';
      combat.spawnShockwave(this.x, this.y - 30, 80, '#ff5252');
      combat.spawnHitSparks(this.x, this.y - 30, 1, '#ffd700', 25);
    }
  }

  freeze(duration) {
    this.freezeTimer = duration;
    combat.spawnDamageText(this.x, this.y - 45, 0, { text: 'FROZEN', color: '#80d8ff' });
  }

  slow(duration, factor) {
    this.slowTimer = duration;
    this.slowFactor = factor;
  }

  render(ctx) {
    sprites.renderEntity(ctx, this.heroKey, this.x, this.y, {
      facing: this.facing,
      state: this.state,
      animTime: this.animTime,
      hitFlash: this.hitFlash > 0 ? 1 : 0
    });

    // Boss / Champion Health Bar
    const barW = 54;
    const barH = 6;
    const barX = this.x - barW * 0.5;
    const barY = this.y - 82;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#f44336';
    ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
  }
}
