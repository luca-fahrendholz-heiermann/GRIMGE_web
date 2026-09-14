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
    this.announcementTimer = 0;

    this.cards = [
      document.getElementById('card-0'),
      document.getElementById('card-1'),
      document.getElementById('card-2')
    ];
    this.activeSpellPreview = document.getElementById('active-spell-preview');
    this.manaBarFill = document.getElementById('mana-bar-fill');
    this.manaBarText = document.getElementById('mana-bar-text');

    this.grimoireBtn = document.getElementById('grimoire-btn');
    this.grimoireModal = document.getElementById('grimoire-modal');
    this.closeGrimoireBtn = document.getElementById('close-grimoire-btn');

    this.arcaneCircle = document.getElementById('arcane-circle-trigger');
    this.attackBtn = document.getElementById('action-attack-btn');

    this.drawingHud = document.getElementById('drawing-hud');
    this.drawingTimerFill = document.getElementById('drawing-timer-fill');
    this.recognitionResult = document.getElementById('recognition-result');

    this.heroChips = document.querySelectorAll('.hero-chip');

    this.setupListeners();
  }

  setupListeners() {
    this.grimoireBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGrimoire();
    });

    this.closeGrimoireBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGrimoire(false);
    });

    this.arcaneCircle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (window.gameWorld) window.gameWorld.startRuneDrawing();
    });

    this.arcaneCircle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.gameWorld) window.gameWorld.startRuneDrawing();
    }, { passive: false });

    this.attackBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.gameWorld && window.gameWorld.player) {
        window.gameWorld.player.executeAttack(window.gameWorld.input);
      }
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
  }

  showAnnouncement(text, duration = 2.4) {
    this.announcementBanner.textContent = text;
    this.announcementBanner.classList.add('show');
    this.announcementTimer = duration;
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

  update(dt, player, battlefield) {
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

    // Match Clock
    if (window.gameWorld) {
      const mins = Math.floor(window.gameWorld.matchTime / 60);
      const secs = Math.floor(window.gameWorld.matchTime % 60);
      this.clockDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Card highlight states
    for (let i = 0; i < 3; i++) {
      const cardEl = this.cards[i];
      const rune = player.preparedRunes[i];
      if (rune) {
        cardEl.style.opacity = '1.0';
        cardEl.style.transform = 'translateY(-4px)';
        cardEl.style.filter = 'drop-shadow(0 0 10px #00e5ff)';
      } else {
        cardEl.style.opacity = '0.55';
        cardEl.style.transform = 'none';
        cardEl.style.filter = 'grayscale(0.6)';
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
