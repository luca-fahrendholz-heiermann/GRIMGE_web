// GRIMGE Prototype — UI & HUD Controller matching Setup Mockup Exactly
import { spells } from './spells.js';

export class UIManager {
  constructor() {
    this.blueHpFill = document.getElementById('blue-hp-fill');
    this.blueHpText = document.getElementById('blue-hp-text');
    this.blueMpFill = document.getElementById('blue-mp-fill');
    this.blueMpText = document.getElementById('blue-mp-text');
    this.blueCrystalCount = document.getElementById('blue-crystal-count');

    this.clockDisplay = document.getElementById('clock-display');

    this.redHpFill = document.getElementById('red-hp-fill');
    this.redHpText = document.getElementById('red-hp-text');
    this.redMpFill = document.getElementById('red-mp-fill');
    this.redMpText = document.getElementById('red-mp-text');
    this.redCrystalCount = document.getElementById('red-crystal-count');

    this.playerPortraitImg = document.getElementById('player-portrait-img');

    this.announcementBanner = document.getElementById('announcement-banner');
    this.objectiveHud = document.getElementById('objective-hud');
    this.announcementTimer = 0;
    this.hubOverlay = document.getElementById('hub-overlay');
    this.resultsOverlay = document.getElementById('results-overlay');
    this.playMatchBtn = document.getElementById('play-match-btn');
    this.rematchBtn = document.getElementById('rematch-btn');
    this.hubBtn = document.getElementById('hub-btn');
    this.resultsTitle = document.getElementById('results-title');
    this.resultsTime = document.getElementById('results-time');
    this.resultsTower = document.getElementById('results-tower');
    this.resultsCastle = document.getElementById('results-castle');
    this.resultsKills = document.getElementById('results-kills');

    this.cards = [
      document.getElementById('card-0'),
      document.getElementById('card-1'),
      document.getElementById('card-2')
    ];
    this.cardOverlays = [
      document.getElementById('card-overlay-0'),
      document.getElementById('card-overlay-1'),
      document.getElementById('card-overlay-2')
    ];
    this.activeSpellPreview = document.getElementById('active-spell-preview');
    this.manaBarFill = document.getElementById('mana-bar-fill');
    this.manaBarText = document.getElementById('mana-bar-text');

    this.grimoireBtn = document.getElementById('grimoire-btn');
    this.grimoireModal = document.getElementById('grimoire-modal');
    this.closeGrimoireBtn = document.getElementById('close-grimoire-btn');

    this.arcaneCircle = document.getElementById('arcane-circle-trigger');
    this.attackBtn = document.getElementById('action-attack-btn');
    this.jumpBtn = document.getElementById('action-jump-btn');
    this.dashBtn = document.getElementById('action-dash-btn');
    this.castBtn = document.getElementById('action-cast-btn');

    this.drawingHud = document.getElementById('drawing-hud');
    this.drawingTimerFill = document.getElementById('drawing-timer-fill');
    this.recognitionResult = document.getElementById('recognition-result');

    this.heroChips = document.querySelectorAll('.hero-chip');

    this.setupListeners();
  }

  setupListeners() {
    this.playMatchBtn.addEventListener('click', () => window.gameWorld?.startMatch());
    this.rematchBtn.addEventListener('click', () => window.gameWorld?.startMatch());
    this.hubBtn.addEventListener('click', () => window.gameWorld?.returnToHub());
    this.grimoireBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGrimoire();
    });

    this.closeGrimoireBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGrimoire(false);
    });

    // The arcane circle is the touch equivalent of holding the right mouse
    // button: press, draw with the same finger, release. Pointer capture
    // keeps the gesture alive after the thumb leaves the small control and
    // works independently of the movement joystick's other pointer.
    let runePointerId = null;
    const beginRuneGesture = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const game = window.gameWorld;
      if (!game) return;
      game.startRuneDrawing();
      if (!game.drawing.active) return;
      runePointerId = e.pointerId;
      game.drawing.inputMode = 'pointer';
      game.drawing.touchId = e.pointerId;
      this.arcaneCircle.setPointerCapture?.(e.pointerId);
      // Begin exactly where the player pressed, just like right-click.
      const point = game.getCanvasCoords(e.clientX, e.clientY);
      game.addRunePoint(point.x, point.y);
    };
    const drawRuneGesture = (e) => {
      if (e.pointerId !== runePointerId || !window.gameWorld?.drawing.active) return;
      e.preventDefault();
      const point = window.gameWorld.getCanvasCoords(e.clientX, e.clientY);
      window.gameWorld.addRunePoint(point.x, point.y);
    };
    const endRuneGesture = (e) => {
      if (e.pointerId !== runePointerId) return;
      e.preventDefault();
      runePointerId = null;
      window.gameWorld?.finishRuneDrawing();
    };
    this.arcaneCircle.addEventListener('pointerdown', beginRuneGesture);
    this.arcaneCircle.addEventListener('pointermove', drawRuneGesture);
    this.arcaneCircle.addEventListener('pointerup', endRuneGesture);
    this.arcaneCircle.addEventListener('pointercancel', endRuneGesture);

    this.attackBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.gameWorld && window.gameWorld.player) {
        window.gameWorld.player.executeAttack(window.gameWorld.input);
      }
    });

    this.jumpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.gameWorld?.player?.isAlive) window.gameWorld.input.justPressedKeys.Space = true;
    });
    this.dashBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.gameWorld?.player?.isAlive) window.gameWorld.input.justPressedKeys.ShiftLeft = true;
    });
    this.castBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.gameWorld?.castPreparedSpell();
    });

    this.heroChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const hero = chip.getAttribute('data-hero');
        if (window.gameWorld && window.gameWorld.player) {
          window.gameWorld.player.setHero(hero);
          this.updateActiveHeroBtn(hero);
        }
      });
    });

    this.cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.gameWorld) {
          if (window.gameWorld.player.preparedRunes.length > 0) {
            window.gameWorld.castPreparedSpell();
          } else {
            window.gameWorld.startRuneDrawing();
          }
        }
      });
    });
  }

  toggleGrimoire(forceState) {
    if (forceState !== undefined) {
      if (forceState) this.grimoireModal.classList.remove('hidden');
      else this.grimoireModal.classList.add('hidden');
    } else {
      this.grimoireModal.classList.toggle('hidden');
    }
  }

  updateActiveHeroBtn(heroKey) {
    this.heroChips.forEach(chip => {
      if (chip.getAttribute('data-hero') === heroKey) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    const portraitByHero = {
      paladin: 'assets/ui/portrait_hero.png',
      berserker: 'assets/ui/portrait_knight.png',
      mage: 'assets/ui/portrait_mage.png',
      warlord: 'assets/ui/portrait_warlord.png',
      fighter: 'assets/ui/portrait_hero.png'
    };
    if (portraitByHero[heroKey]) this.playerPortraitImg.src = portraitByHero[heroKey];
  }

  showAnnouncement(text, duration = 2.4) {
    this.announcementBanner.textContent = text;
    this.announcementBanner.classList.add('show');
    this.announcementTimer = duration;
  }

  showHub(visible) {
    this.hubOverlay.classList.toggle('hidden', !visible);
  }

  showResults(visible, result = null) {
    this.resultsOverlay.classList.toggle('hidden', !visible);
    if (!visible || !result) return;
    const won = result.winner === 'blue';
    const minutes = Math.floor(result.elapsed / 60);
    const seconds = Math.floor(result.elapsed % 60);
    this.resultsTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
    this.resultsTitle.style.color = won ? '#ffd66b' : '#ff6b6b';
    this.resultsTime.textContent = `MATCH TIME ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    this.resultsTower.textContent = `TOWER DESTROYED: ${result.stats.towersDestroyed[won ? 'red' : 'blue'] ? 'YES' : 'NO'}`;
    this.resultsCastle.textContent = `CASTLE DESTROYED: ${result.stats.castlesDestroyed[won ? 'red' : 'blue'] ? 'YES' : 'NO'}`;
    this.resultsKills.textContent = `WIZARD KILLS: ${result.stats.wizardKills[won ? 'blue' : 'red']}`;
  }

  showRecognitionBadge(rune, confidence) {
    if (rune) {
      this.recognitionResult.textContent = `✦ ${rune.name} (${Math.round(confidence * 100)}%) ✦`;
      this.recognitionResult.className = 'show success';
    } else {
      this.recognitionResult.textContent = '✖ UNRECOGNIZED RUNE';
      this.recognitionResult.className = 'show fail';
    }

    setTimeout(() => {
      this.recognitionResult.className = '';
    }, 1200);
  }

  update(dt, player, enemyChampion, battlefield) {
    if (this.announcementTimer > 0) {
      this.announcementTimer -= dt;
      if (this.announcementTimer <= 0) {
        this.announcementBanner.classList.remove('show');
      }
    }

    // Top Team HP & MP Bars
    const blueBaseMax = 3100;
    const blueHpRatio = (battlefield.blueTower.hp / battlefield.blueTower.maxHp);
    const blueCurrentHp = Math.round(blueHpRatio * blueBaseMax);
    this.blueHpFill.style.width = `${Math.max(0, blueHpRatio * 100)}%`;
    this.blueHpText.textContent = `${blueCurrentHp} / ${blueBaseMax}`;

    const blueMpMax = 600;
    const blueCurrentMp = Math.round((player.mp / player.maxMp) * blueMpMax);
    this.blueMpFill.style.width = `${Math.max(0, (player.mp / player.maxMp) * 100)}%`;
    this.blueMpText.textContent = `${blueCurrentMp} / ${blueMpMax}`;

    // Bottom Mana Bar
    this.manaBarFill.style.width = `${Math.max(0, (player.mp / player.maxMp) * 100)}%`;
    this.manaBarText.textContent = `${blueCurrentMp} / ${blueMpMax}`;

    // Red Team Bars
    const redBaseMax = 2400;
    const redHpRatio = (battlefield.redTower.hp / battlefield.redTower.maxHp);
    const redCurrentHp = Math.round(redHpRatio * redBaseMax);
    this.redHpFill.style.width = `${Math.max(0, redHpRatio * 100)}%`;
    this.redHpText.textContent = `${redCurrentHp} / ${redBaseMax}`;
    const redMpMax = 1000;
    const redMpRatio = enemyChampion ? enemyChampion.mp / 100 : 0;
    this.redMpFill.style.width = `${Math.max(0, redMpRatio * 100)}%`;
    this.redMpText.textContent = `${Math.round(redMpRatio * redMpMax)} / ${redMpMax}`;

    if (window.gameWorld) {
      this.blueCrystalCount.textContent = window.gameWorld.blueCrystals;
      this.redCrystalCount.textContent = window.gameWorld.redCrystals;
    }

    // Match Clock
    if (window.gameWorld) {
      const mins = Math.floor(window.gameWorld.matchTime / 60);
      const secs = Math.floor(window.gameWorld.matchTime % 60);
      this.clockDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      this.objectiveHud.textContent = window.gameWorld.getObjectiveStatus();
    }

    // Card highlight states
    for (let i = 0; i < 3; i++) {
      const cardEl = this.cards[i];
      const overlay = this.cardOverlays[i];
      const rune = player.preparedRunes[i];
      if (rune) {
        cardEl.style.opacity = '1.0';
        cardEl.style.transform = 'translateY(-4px)';
        cardEl.style.filter = `drop-shadow(0 0 10px ${rune.color})`;
        overlay.style.color = rune.color;
        overlay.style.borderColor = rune.color;
        overlay.innerHTML = `<span>${rune.glyph}</span><small>${rune.name}</small>`;
      } else {
        cardEl.style.opacity = '0.55';
        cardEl.style.transform = 'none';
        cardEl.style.filter = 'grayscale(0.6)';
        overlay.style.color = '#6f687a';
        overlay.style.borderColor = '#554d63';
        overlay.innerHTML = '<span>·</span><small>EMPTY</small>';
      }
    }

    // Active Spell Preview
    const resolved = spells.resolveSpell(player.preparedRunes);
    if (resolved) {
      this.activeSpellPreview.textContent = `READY: ${resolved.name} [PRESS E TO CAST]`;
      this.activeSpellPreview.style.color = resolved.color;
    } else {
      this.activeSpellPreview.textContent = 'HOLD RIGHT-CLICK OR TAP CIRCLE TO DRAW RUNES';
      this.activeSpellPreview.style.color = '#ffd54f';
    }
  }

  setDrawingMode(active, remainingTime = 2.5, maxTime = 2.5) {
    if (active) {
      this.drawingHud.classList.remove('hidden');
      this.drawingHud.style.display = 'flex';
      const pct = Math.max(0, (remainingTime / maxTime) * 100);
      this.drawingTimerFill.style.width = `${pct}%`;
    } else {
      this.drawingHud.classList.add('hidden');
      this.drawingHud.style.display = 'none';
    }
  }
}

export const ui = new UIManager();
