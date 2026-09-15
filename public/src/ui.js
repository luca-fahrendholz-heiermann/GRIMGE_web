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
    this.preparedRunesEl = document.getElementById('prepared-runes');
    this.manaBarFill = document.getElementById('mana-bar-fill');
    this.manaBarText = document.getElementById('mana-bar-text');

    this.grimoireBtn = document.getElementById('grimoire-btn');
    this.grimoireModal = document.getElementById('grimoire-modal');
    this.closeGrimoireBtn = document.getElementById('close-grimoire-btn');

    this.arcaneCircle = document.getElementById('arcane-circle-trigger');
    this.attackBtn = document.getElementById('action-attack-btn');
    this.jumpBtn = document.getElementById('action-jump-btn');
    this.dashBtn = document.getElementById('action-dash-btn');
    this.shieldBtn = document.getElementById('action-shield-btn');
    this.castBtn = document.getElementById('action-cast-btn');
    this.swapBtn = document.getElementById('action-swap-btn');
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    this.uiLayoutBtn = document.getElementById('ui-layout-btn');
    this.uiLayer = document.getElementById('ui-layer');
    this.touchLayout = 'classic';

    this.drawingHud = document.getElementById('drawing-hud');
    this.recognitionResult = document.getElementById('recognition-result');

    this.heroChips = document.querySelectorAll('.hero-chip');

    this.setupListeners();
    // Keep a deliberately small local UI preference; match state remains
    // entirely transient and is never stored here.
    let savedLayout = null;
    try { savedLayout = window.localStorage?.getItem?.('grimge-touch-layout'); } catch { /* storage may be disabled */ }
    this.setTouchLayout(savedLayout === 'alternate' ? 'alternate' : 'classic');
  }

  setupListeners() {
    // `click` is delayed or occasionally swallowed by mobile browser gesture
    // handling. Start/Rematch are primary game controls, so activate them on
    // the same immediate pointer path as the combat controls. Keep keyboard
    // accessibility through the click fallback; GameWorld ignores a duplicate
    // call once the match is already running.
    const startMatch = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      window.gameWorld?.startMatch();
    };
    this.playMatchBtn.addEventListener('pointerdown', startMatch);
    this.playMatchBtn.addEventListener('click', startMatch);
    this.rematchBtn.addEventListener('pointerdown', startMatch);
    this.rematchBtn.addEventListener('click', startMatch);
    this.hubBtn.addEventListener('click', () => window.gameWorld?.returnToHub());
    this.grimoireBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.gameWorld?.castGrimoireSpells();
    });

    this.closeGrimoireBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGrimoire(false);
    });

    // First press opens Arcane Focus; the second commits a valid gesture and
    // always closes it. Waiting two seconds remains the alternate auto-lock.
    const toggleRuneDrawing = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const game = window.gameWorld;
      if (!game) return;
      if (game.drawing.active) game.lockOrExitRuneDrawing();
      else game.startRuneDrawing();
    };
    this.arcaneCircle.addEventListener('pointerdown', toggleRuneDrawing);

    // Pointer-down avoids the mobile click-delay. All action input reaches
    // the same shared gameplay state as keyboard/mouse actions.
    // These two legacy mobile buttons are intentionally absent from the
    // current triangular control cluster. They stay optional so removing a
    // visual control can never abort the entire UI/module initialization.
    this.attackBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.gameWorld && window.gameWorld.player) {
        window.gameWorld.player.executeAttack(window.gameWorld.input);
      }
    });

    this.playerPortraitImg.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleGrimoire();
    });

    this.jumpBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.gameWorld?.player?.isAlive) window.gameWorld.input.justPressedKeys.Space = true;
    });
    this.dashBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.gameWorld?.player?.isAlive) window.gameWorld.input.justPressedKeys.ShiftLeft = true;
    });
    this.shieldBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.shieldBtn.setPointerCapture?.(e.pointerId);
      window.gameWorld?.setGuardHeld(true);
    });
    const releaseShield = (e) => {
      e?.preventDefault?.();
      window.gameWorld?.setGuardHeld(false);
    };
    this.shieldBtn.addEventListener('pointerup', releaseShield);
    this.shieldBtn.addEventListener('pointercancel', releaseShield);
    this.shieldBtn.addEventListener('lostpointercapture', releaseShield);
    this.castBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.gameWorld?.castPreparedSpell();
    });
    this.swapBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.swapSlottedSpell();
    });
    this.fullscreenBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.gameWorld?.enterFullscreen();
    });
    this.uiLayoutBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.setTouchLayout(this.touchLayout === 'classic' ? 'alternate' : 'classic');
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
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = this.cards.indexOf(card);
        const runeCard = window.gameWorld?.player?.runeHand?.[index];
        if (runeCard) window.gameWorld.startRuneDrawing(runeCard.cardId);
      });
    });
  }

  setTouchLayout(layout) {
    this.touchLayout = layout === 'alternate' ? 'alternate' : 'classic';
    this.uiLayer?.classList.toggle('touch-layout-alt', this.touchLayout === 'alternate');
    if (this.touchLayout === 'classic') {
      this.arcaneCircle?.style.removeProperty?.('left');
      this.arcaneCircle?.style.removeProperty?.('top');
      this.arcaneCircle?.style.removeProperty?.('right');
      this.arcaneCircle?.style.removeProperty?.('bottom');
    }
    if (this.uiLayoutBtn) this.uiLayoutBtn.textContent = this.touchLayout === 'alternate' ? 'SETTINGS: ALT TOUCH UI' : 'SETTINGS: CLASSIC UI';
    try { window.localStorage?.setItem?.('grimge-touch-layout', this.touchLayout); } catch { /* preference is optional */ }
  }

  placeDrawNearJoystick(x, y) {
    if (this.touchLayout !== 'alternate' || !this.arcaneCircle) return;
    // x/y are logical 1024×576 HUD coordinates. Keep the draw button inside
    // the left-side play area, above and slightly left of the thumb origin.
    const left = Math.max(10, Math.min(300, x - 92));
    const top = Math.max(70, Math.min(410, y - 136));
    this.arcaneCircle.style.left = `${left}px`;
    this.arcaneCircle.style.top = `${top}px`;
    this.arcaneCircle.style.right = 'auto';
    this.arcaneCircle.style.bottom = 'auto';
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

    // Top HUD is the Wizard's live state, not the lane Tower. Objectives keep
    // their own world/UI feedback, while this bar must visibly spend HP/MP.
    const blueHpRatio = player.hp / player.maxHp;
    const blueCurrentHp = Math.ceil(player.hp);
    this.blueHpFill.style.width = `${Math.max(0, blueHpRatio * 100)}%`;
    this.blueHpText.textContent = `${blueCurrentHp} / ${player.maxHp}`;

    const blueMpMax = player.maxMp;
    const blueCurrentMp = Math.ceil(player.mp);
    this.blueMpFill.style.width = `${Math.max(0, (player.mp / player.maxMp) * 100)}%`;
    this.blueMpText.textContent = `${blueCurrentMp} / ${blueMpMax}`;

    // Bottom Mana Bar
    this.manaBarFill.style.width = `${Math.max(0, (player.mp / player.maxMp) * 100)}%`;
    this.manaBarText.textContent = `${blueCurrentMp} / ${blueMpMax}`;

    // Red Team Bars
    const redHpRatio = enemyChampion ? enemyChampion.hp / enemyChampion.maxHp : 0;
    const redCurrentHp = Math.ceil(enemyChampion?.hp ?? 0);
    this.redHpFill.style.width = `${Math.max(0, redHpRatio * 100)}%`;
    this.redHpText.textContent = `${redCurrentHp} / ${enemyChampion?.maxHp ?? 0}`;
    const redMpMax = enemyChampion?.maxMp ?? 100;
    const redMpRatio = enemyChampion ? enemyChampion.mp / redMpMax : 0;
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
      const rune = player.runeHand[i];
      if (rune) {
        cardEl.style.opacity = '1.0';
        cardEl.style.transform = 'translateY(-4px)';
        cardEl.style.filter = `drop-shadow(0 0 10px ${rune.color})`;
        overlay.style.color = rune.color;
        overlay.style.borderColor = rune.color;
        cardEl.style.background = `linear-gradient(145deg, ${rune.color}38, rgba(10, 8, 25, .96) 72%)`;
        overlay.innerHTML = `<span>${rune.glyph}</span><small>${rune.name}</small><em>${rune.desc}</em>`;
      } else {
        cardEl.style.opacity = '0.55';
        cardEl.style.transform = 'none';
        cardEl.style.filter = 'grayscale(0.6)';
        cardEl.style.background = 'linear-gradient(145deg, rgba(38, 29, 70, .96), rgba(11, 9, 25, .96))';
        overlay.style.color = '#6f687a';
        overlay.style.borderColor = '#554d63';
        overlay.innerHTML = '<span>·</span><small>EMPTY</small>';
      }
    }

    // Prepared components are not cards in the hand. This makes the deck
    // cycle legible: hand card -> drawn component -> spell -> cleared.
    if (this.preparedRunesEl) {
      this.preparedRunesEl.innerHTML = player.slottedSpells.length
        ? `SLOTTED: ${player.slottedSpells.map((slot, index) => `<b style="color:${slot.definition.color};opacity:${index === player.selectedSpellIndex ? 1 : .45}">${slot.isCombo ? '✦' : slot.runes[0].glyph}</b>`).join(' ')}`
        : 'SLOTTED: —';
    }

    // Active Spell Preview
    const selectedSlot = player.slottedSpells[player.selectedSpellIndex];
    if (selectedSlot) {
      this.activeSpellPreview.textContent = `READY: ${selectedSlot.definition.name} [CAST · SWAP]`;
      this.activeSpellPreview.style.color = selectedSlot.definition.color;
    } else {
      const hand = player.runeHand.map((rune) => rune.name).join(' · ');
      this.activeSpellPreview.textContent = hand ? `RUNE HAND: ${hand} — DRAW ONE` : 'RUNE DECK EMPTY';
      this.activeSpellPreview.style.color = '#ffd54f';
    }
  }

  setDrawingMode(active) {
    if (active) {
      this.drawingHud.classList.remove('hidden');
      this.drawingHud.style.display = 'flex';
    } else {
      this.drawingHud.classList.add('hidden');
      this.drawingHud.style.display = 'none';
    }
  }
}

export const ui = new UIManager();
