// GRIMGE Prototype — UI & HUD Controller matching Setup Mockup Exactly
import { spells } from './spells.js';
import { MAGE_SKILL_TREE } from './progression.js';
import { recognizer } from './recognizer.js';
import { sprites } from './sprites.js';

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
    this.hubShell = document.getElementById('hub-shell');
    this.hubSwipeArea = document.getElementById('hub-swipe-area');
    this.hubPages = document.querySelectorAll('.hub-page');
    this.hubTabs = document.querySelectorAll('.hub-tab');
    this.hubHeroCards = document.querySelectorAll('.hub-hero-card');
    this.hubCompanionCards = document.querySelectorAll('.hub-companion-card');
    this.hubHeroPreview = document.getElementById('hub-hero-preview');
    this.hubHeroRoster = document.getElementById('hub-hero-roster');
    this.hubCompanionRoster = document.getElementById('hub-companion-roster');
    this.hubHeroName = document.getElementById('hub-hero-name');
    this.hubHeroClass = document.getElementById('hub-hero-class');
    this.hubArtHeroName = document.getElementById('hub-art-hero-name');
    this.hubArtHeroClass = document.getElementById('hub-art-hero-class');
    this.hubArtProfilePortrait = document.getElementById('hub-art-profile-portrait');
    this.hubArtProfileLevel = document.getElementById('hub-art-profile-level');
    this.hubArtProfileXpFill = document.getElementById('hub-art-profile-xp-fill');
    this.hubModesHeroPreview = document.getElementById('hub-modes-hero-preview');
    this.hubModesProfilePortrait = document.getElementById('hub-modes-profile-portrait');
    this.hubModesProfileName = document.getElementById('hub-modes-profile-name');
    this.hubModesProfileLevel = document.getElementById('hub-modes-profile-level');
    this.hubModesProfileTitle = document.getElementById('hub-modes-profile-title');
    this.hubModesProfileXpFill = document.getElementById('hub-modes-profile-xp-fill');
    this.hubAttackStat = document.getElementById('hub-attack-stat');
    this.hubHealthStat = document.getElementById('hub-health-stat');
    this.hubSkillPoints = document.getElementById('hub-skill-points');
    this.hubDeckCount = document.getElementById('hub-deck-count');
    this.hubDeckPreview = document.getElementById('hub-deck-preview');
    this.hubSkillSummary = document.getElementById('hub-skill-summary');
    this.hubBattleBtn = document.getElementById('hub-battle-btn');
    this.hubEditDeckBtn = document.getElementById('hub-edit-deck-btn');
    this.hubOpenSkillsBtn = document.getElementById('hub-open-skills-btn');
    this.hubSiegeModeBtn = document.getElementById('hub-siege-mode-btn');
    this.hubModesBackBtn = document.getElementById('hub-modes-back-btn');
    this.hubFullscreenBtn = document.getElementById('hub-fullscreen-btn');
    this.hubCustomizeBtn = document.getElementById('hub-customize-btn');
    this.hubPage = 'character';
    this.selectedMode = 'siege';
    this.hubSwipeStart = null;
    try {
      this.selectedHero = window.localStorage?.getItem?.('grimge-selected-hero') || 'astral';
      this.selectedCompanion = window.localStorage?.getItem?.('grimge-selected-companion') || 'spirit_wolf';
    } catch {
      this.selectedHero = 'astral'; this.selectedCompanion = 'spirit_wolf';
    }
    this.resultsOverlay = document.getElementById('results-overlay');
    this.playMatchBtn = document.getElementById('play-match-btn');
    this.rematchBtn = document.getElementById('rematch-btn');
    this.hubBtn = document.getElementById('hub-btn');
    this.resultsTitle = document.getElementById('results-title');
    this.resultsTime = document.getElementById('results-time');
    this.resultsTower = document.getElementById('results-tower');
    this.resultsCastle = document.getElementById('results-castle');
    this.resultsKills = document.getElementById('results-kills');
    this.profileSummary = document.getElementById('profile-summary');
    this.skillTreeBtn = document.getElementById('skill-tree-btn');
    this.skillTreeModal = document.getElementById('skill-tree-modal');
    this.skillTreeContent = document.getElementById('skill-tree-content');
    this.closeSkillTreeBtn = document.getElementById('close-skill-tree-btn');
    this.deckBuilderBtn = document.getElementById('deck-builder-btn');
    this.deckBuilderModal = document.getElementById('deck-builder-modal');
    this.deckBuilderContent = document.getElementById('deck-builder-content');
    this.deckBuilderSummary = document.getElementById('deck-builder-summary');
    this.closeDeckBuilderBtn = document.getElementById('close-deck-builder-btn');
    this.resetDeckBtn = document.getElementById('reset-deck-btn');

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
    this.summonStatus = document.getElementById('summon-status');
    this.preparedRunesEl = document.getElementById('prepared-runes');
    this.manaBarFill = document.getElementById('mana-bar-fill');
    this.manaBarText = document.getElementById('mana-bar-text');
    this.focusReadout = document.getElementById('focus-readout');
    this.focusActivateBtn = document.getElementById('focus-activate-btn');

    this.grimoireBtn = document.getElementById('grimoire-btn');
    this.grimoireModal = document.getElementById('grimoire-modal');
    this.closeGrimoireBtn = document.getElementById('close-grimoire-btn');
    this.runeProgressList = document.getElementById('rune-progression-list');

    this.arcaneCircle = document.getElementById('arcane-circle-trigger');
    this.attackBtn = document.getElementById('action-attack-btn');
    this.jumpBtn = document.getElementById('action-jump-btn');
    this.dashBtn = document.getElementById('action-dash-btn');
    this.shieldBtn = document.getElementById('action-shield-btn');
    this.castBtn = document.getElementById('action-cast-btn');
    this.swapBtn = document.getElementById('action-swap-btn');
    this.mountBtn = document.getElementById('action-mount-btn');
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    this.gameMenuBtn = document.getElementById('game-menu-btn');
    this.gameMenuModal = document.getElementById('game-menu-modal');
    this.closeGameMenuBtn = document.getElementById('close-game-menu-btn');
    this.resumeMatchBtn = document.getElementById('resume-match-btn');
    this.restartMatchBtn = document.getElementById('restart-match-btn');
    this.menuLayoutBtn = document.getElementById('menu-layout-btn');
    this.menuFullscreenBtn = document.getElementById('menu-fullscreen-btn');
    this.menuHubBtn = document.getElementById('menu-hub-btn');
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
    this.playMatchBtn?.addEventListener('pointerdown', startMatch);
    this.playMatchBtn?.addEventListener('click', startMatch);
    this.rematchBtn?.addEventListener('pointerdown', startMatch);
    this.rematchBtn?.addEventListener('click', startMatch);
    this.hubBtn?.addEventListener('click', () => window.gameWorld?.returnToHub());
    this.skillTreeBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleSkillTree(true);
      this.renderSkillTree(window.gameWorld?.profile);
    });
    this.closeSkillTreeBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleSkillTree(false);
    });
    this.deckBuilderBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleDeckBuilder(true);
      this.renderDeckBuilder(window.gameWorld?.profile);
    });
    this.closeDeckBuilderBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleDeckBuilder(false);
    });
    this.deckBuilderContent?.addEventListener('pointerdown', (e) => {
      const button = e.target?.closest?.('[data-deck-action]');
      const action = button?.getAttribute?.('data-deck-action');
      const runeId = button?.getAttribute?.('data-rune-id');
      if (action) window.gameWorld?.updateMatchDeck(action, runeId);
    });
    this.resetDeckBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.updateMatchDeck('reset');
    });
    this.skillTreeContent?.addEventListener('pointerdown', (e) => {
      const button = e.target?.closest?.('[data-skill-id]');
      const id = button?.getAttribute?.('data-skill-id');
      if (id) window.gameWorld?.unlockMageSkill(id);
    });
    this.grimoireBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.gameWorld?.castGrimoireSpells();
    });

    this.closeGrimoireBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGrimoire(false);
    });

    // Every long-form overlay has a true backdrop. A tap beside the panel is
    // always a fast, reliable close path on touch devices.
    const closeFromBackdrop = (modal, close) => modal?.addEventListener('pointerdown', (e) => {
      if (e.target === modal) close();
    });
    closeFromBackdrop(this.grimoireModal, () => this.toggleGrimoire(false));
    closeFromBackdrop(this.skillTreeModal, () => this.toggleSkillTree(false));
    closeFromBackdrop(this.deckBuilderModal, () => this.toggleDeckBuilder(false));

    this.gameMenuBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleIngameMenu(true);
    });
    this.closeGameMenuBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleIngameMenu(false);
    });
    this.resumeMatchBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleIngameMenu(false);
    });
    this.restartMatchBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleIngameMenu(false); window.gameWorld?.restartMatch();
    });
    this.menuLayoutBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.setTouchLayout(this.touchLayout === 'classic' ? 'alternate' : 'classic');
    });
    this.menuFullscreenBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.enterFullscreen();
    });
    this.menuHubBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleIngameMenu(false); window.gameWorld?.returnToHub();
    });
    closeFromBackdrop(this.gameMenuModal, () => this.toggleIngameMenu(false));

    // Classic UI retains the original explicit Draw button. The alternative
    // touch layout hides this control and uses cards / left double-tap.
    this.arcaneCircle?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const game = window.gameWorld;
      if (!game) return;
      if (game.drawing.active) game.lockOrExitRuneDrawing();
      else game.startRuneDrawing();
    });

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
    this.mountBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.toggleMount();
    });
    this.focusActivateBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.activateFocusTransformation();
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
        const game = window.gameWorld;
        if (!game) return;
        // Rune cards open the focus layer. A second card tap is an explicit
        // commit/close action, so touch users never need a separate Draw UI.
        if (game.drawing.active) {
          game.lockOrExitRuneDrawing();
          return;
        }
        const runeCard = game.player?.runeHand?.[index];
        if (runeCard) game.startRuneDrawing(runeCard.cardId);
      });
    });

    const openSkillTree = (e) => {
      e?.preventDefault?.(); e?.stopPropagation?.();
      this.setHubPage('skills'); this.toggleSkillTree(true); this.renderSkillTree(window.gameWorld?.profile);
    };
    const openDeckBuilder = (e) => {
      e?.preventDefault?.(); e?.stopPropagation?.();
      this.setHubPage('deck'); this.toggleDeckBuilder(true); this.renderDeckBuilder(window.gameWorld?.profile);
    };
    this.hubBattleBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); this.setHubPage('modes');
    });
    this.hubSiegeModeBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.setHubMode('siege');
      startMatch(e);
    });
    this.hubModesBackBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); this.setHubPage('character');
    });
    this.hubEditDeckBtn?.addEventListener('pointerdown', openDeckBuilder);
    this.hubOpenSkillsBtn?.addEventListener('pointerdown', openSkillTree);
    this.hubFullscreenBtn?.addEventListener('pointerdown', (e) => { e.preventDefault(); window.gameWorld?.enterFullscreen(); });
    this.hubCustomizeBtn?.addEventListener('pointerdown', (e) => { e.preventDefault(); this.showAnnouncement('COSMETIC CUSTOMIZATION IS THE NEXT HUB PASS', 2); });
    this.hubTabs.forEach((tab) => tab.addEventListener('pointerdown', (e) => {
      e.preventDefault(); this.setHubPage(tab.getAttribute('data-hub-tab'));
    }));
    document.querySelectorAll('.hub-quick-action').forEach((action) => action.addEventListener('pointerdown', (e) => {
      e.preventDefault(); this.setHubPage(action.getAttribute('data-hub-route'));
    }));
    document.querySelectorAll('.hub-main-action').forEach((action) => action.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const route = action.getAttribute('data-hub-action');
      if (route === 'classes') return this.toggleHubSelection('heroes');
      if (route === 'primals') return this.toggleHubSelection('companions');
      if (route === 'grimoire') return this.setHubPage('deck');
      if (route === 'skills') return this.setHubPage('skills');
      if (route === 'settings') return this.setHubPage('settings');
      if (route === 'mastery') return this.showAnnouncement('MASTERY IS A FUTURE CANONICAL SYSTEM', 2.2);
      if (route === 'transformations') return this.showAnnouncement('TRANSFORMATION PATHS ARE IN DEVELOPMENT', 2.2);
      if (route === 'wardrobe') return this.showAnnouncement('WARDROBE & EQUIPMENT ARE IN DEVELOPMENT', 2.2);
      if (route === 'messages') return this.showAnnouncement('MESSAGES ARE NOT AVAILABLE IN THE PROTOTYPE', 2.2);
      if (route === 'friends') return this.showAnnouncement('FRIENDS WILL ARRIVE WITH CO-OP', 2.2);
    }));
    this.hubHeroCards.forEach((card) => card.addEventListener('pointerdown', (e) => {
      e.preventDefault(); this.setHubHero(card.getAttribute('data-hub-hero'));
    }));
    this.hubCompanionCards.forEach((card) => card.addEventListener('pointerdown', (e) => {
      e.preventDefault(); this.setHubCompanion(card.getAttribute('data-companion'));
    }));
    this.hubSwipeArea?.addEventListener('pointerdown', (e) => { this.hubSwipeStart = { x: e.clientX, y: e.clientY }; });
    this.hubSwipeArea?.addEventListener('pointerup', (e) => {
      if (!this.hubSwipeStart) return;
      const dx = e.clientX - this.hubSwipeStart.x;
      const dy = e.clientY - this.hubSwipeStart.y;
      this.hubSwipeStart = null;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      const pages = ['character', 'deck', 'skills', 'modes', 'settings'];
      const from = Math.max(0, pages.indexOf(this.hubPage));
      this.setHubPage(pages[Math.max(0, Math.min(pages.length - 1, from + (dx < 0 ? 1 : -1)))]);
    });
  }

  getSelectedHero() { return this.selectedHero || 'astral'; }

  setHubPage(page) {
    const valid = ['character', 'deck', 'skills', 'modes', 'settings'];
    if (!valid.includes(page)) return;
    this.hubPage = page;
    this.hubShell?.classList.toggle('hub-main-active', page === 'character');
    this.hubShell?.classList.toggle('hub-game-types-active', page === 'modes');
    this.toggleHubSelection(null);
    this.hubPages.forEach((panel) => panel.classList.toggle('active', panel.getAttribute('data-hub-page') === page));
    this.hubTabs.forEach((tab) => tab.classList.toggle('active', tab.getAttribute('data-hub-tab') === page));
  }

  toggleHubSelection(selection) {
    const openHeroes = selection === 'heroes' && !this.hubHeroRoster?.classList.contains('is-open');
    const openCompanions = selection === 'companions' && !this.hubCompanionRoster?.classList.contains('is-open');
    this.hubHeroRoster?.classList.toggle('is-open', openHeroes);
    this.hubCompanionRoster?.classList.toggle('is-open', openCompanions);
  }

  setHubMode(mode) {
    if (mode !== 'siege') return;
    this.selectedMode = mode;
    this.hubSiegeModeBtn?.classList.add('active');
  }

  setHubHero(hero) {
    const details = this.hubHeroDetails()[hero];
    if (!details) return;
    this.selectedHero = hero;
    try { window.localStorage?.setItem?.('grimge-selected-hero', hero); } catch { /* optional preference */ }
    window.gameWorld?.setSelectedHero?.(hero);
    this.toggleHubSelection(null);
    this.renderHub(window.gameWorld?.profile);
  }

  setHubCompanion(companion) {
    this.selectedCompanion = companion;
    try { window.localStorage?.setItem?.('grimge-selected-companion', companion); } catch { /* optional preference */ }
    this.toggleHubSelection(null);
    this.hubCompanionCards.forEach((card) => card.classList.toggle('active', card.getAttribute('data-companion') === companion));
    this.showAnnouncement(`PRIMAL COMPANION: ${companion.replaceAll('_', ' ').toUpperCase()}`, 1.4);
  }

  hubHeroDetails() {
    return {
      astral: { name: 'ASTRAL', title: 'STARBORN WANDERER', attack: 124, health: 192, file: 'char_astral.png', profilePortrait: 'portrait_astral.png' },
      astral_v2: { name: 'ASTRAL II', title: 'UNHOODED STARBORN', attack: 124, health: 192, file: 'char_astral_v2.png', profilePortrait: 'portrait_astral.png' },
      paladin: { name: 'PALADIN', title: 'ARCANE VANGUARD', attack: 120, health: 200 },
      mage: { name: 'MAGE', title: 'RUNE CHANNELER', attack: 112, health: 185 },
      darklord: { name: 'DARK LORD', title: 'VOID SOVEREIGN', attack: 132, health: 195 },
      berserker: { name: 'BERSERKER', title: 'BATTLE RUNE', attack: 138, health: 215 },
      warlord: { name: 'WARLORD', title: 'SIEGE COMMANDER', attack: 128, health: 210 },
      fighter: { name: 'FIGHTER', title: 'ARCANE DUELIST', attack: 125, health: 190 }
    };
  }

  renderHub(profile) {
    const details = this.hubHeroDetails()[this.selectedHero] || this.hubHeroDetails().paladin;
    const processed = sprites.sprites[this.selectedHero]?.canvas;
    if (this.hubHeroPreview) {
      // The runtime sprite cache has already chroma-keyed/cropped supplied
      // sprites. Reuse it for the Hub so green-screen hero sources never
      // appear as solid rectangles in the menu.
      this.hubHeroPreview.src = processed?.toDataURL?.() || `assets/sprites/${details.file || `char_${this.selectedHero}.png`}`;
    }
    if (this.hubModesHeroPreview) this.hubModesHeroPreview.src = processed?.toDataURL?.() || `assets/sprites/${details.file || `char_${this.selectedHero}.png`}`;
    if (this.hubHeroName) this.hubHeroName.textContent = details.name;
    if (this.hubHeroClass) this.hubHeroClass.textContent = details.title;
    if (this.hubArtHeroName) this.hubArtHeroName.textContent = details.name;
    if (this.hubArtHeroClass) this.hubArtHeroClass.textContent = details.title;
    if (this.hubArtProfilePortrait) {
      this.hubArtProfilePortrait.src = details.profilePortrait
        ? `assets/ui/ui_hub_start_screen_concept/${details.profilePortrait}`
        : processed?.toDataURL?.() || `assets/sprites/${details.file || `char_${this.selectedHero}.png`}`;
    }
    if (this.hubModesProfilePortrait) {
      this.hubModesProfilePortrait.src = details.profilePortrait
        ? `assets/ui/ui_hub_start_screen_concept/${details.profilePortrait}`
        : processed?.toDataURL?.() || `assets/sprites/${details.file || `char_${this.selectedHero}.png`}`;
    }
    const profileLevel = profile?.level ?? 1;
    const profileXp = profile?.xp ?? 0;
    const profileXpMax = Math.max(1, profile?.xpToNextLevel?.() ?? 70);
    if (this.hubArtProfileLevel) this.hubArtProfileLevel.textContent = `ARCANA LV. ${profileLevel}`;
    if (this.hubArtProfileXpFill) this.hubArtProfileXpFill.style.width = `${Math.round(Math.min(1, profileXp / profileXpMax) * 100)}%`;
    if (this.hubModesProfileName) this.hubModesProfileName.textContent = details.name;
    if (this.hubModesProfileLevel) this.hubModesProfileLevel.textContent = `ARCANA LV. ${profileLevel}`;
    if (this.hubModesProfileTitle) this.hubModesProfileTitle.textContent = details.title;
    if (this.hubModesProfileXpFill) this.hubModesProfileXpFill.style.width = `${Math.round(Math.min(1, profileXp / profileXpMax) * 100)}%`;
    if (this.hubAttackStat) this.hubAttackStat.textContent = details.attack;
    if (this.hubHealthStat) this.hubHealthStat.textContent = details.health;
    this.hubHeroCards.forEach((card) => {
      const heroKey = card.getAttribute('data-hub-hero');
      card.classList.toggle('active', heroKey === this.selectedHero);
      // The roster thumbnails use the same processed Canvas frame as the
      // large preview. This keeps green-screen source assets out of every
      // visible Hub surface, not only the central character stage.
      const portrait = card.querySelector?.('img');
      const frame = sprites.sprites[heroKey]?.canvas;
      if (portrait && frame?.toDataURL) portrait.src = frame.toDataURL();
    });
    this.hubCompanionCards.forEach((card) => card.classList.toggle('active', card.getAttribute('data-companion') === this.selectedCompanion));
    if (!profile) return;
    if (this.hubSkillPoints) this.hubSkillPoints.textContent = profile.skillPoints;
    if (this.hubDeckCount) this.hubDeckCount.textContent = profile.matchDeck.length;
    if (this.hubDeckPreview) {
      this.hubDeckPreview.innerHTML = profile.matchDeck.map((id) => {
        const rune = recognizer.runes.find((entry) => entry.id === id);
        return rune ? `<article class="hub-deck-card" style="--rune-color:${rune.color}"><b>${rune.glyph}</b><span>${rune.name}</span></article>` : '';
      }).join('');
    }
    if (this.hubSkillSummary) {
      const branches = [...new Set(MAGE_SKILL_TREE.map((node) => node.branch))];
      this.hubSkillSummary.innerHTML = branches.map((branch) => {
        const unlocked = MAGE_SKILL_TREE.filter((node) => node.branch === branch && profile.unlockedSkills.has(node.id)).length;
        const total = MAGE_SKILL_TREE.filter((node) => node.branch === branch).length;
        return `<article class="hub-skill-chip"><b>${branch.toUpperCase()}</b><span>${unlocked}/${total} UNLOCKED</span></article>`;
      }).join('');
    }
  }

  setTouchLayout(layout) {
    this.touchLayout = layout === 'alternate' ? 'alternate' : 'classic';
    this.uiLayer?.classList.toggle('touch-layout-alt', this.touchLayout === 'alternate');
    if (this.touchLayout === 'classic') {
      this.arcaneCircle?.style.removeProperty?.('left');
      this.arcaneCircle?.style.removeProperty?.('top');
      this.arcaneCircle?.style.removeProperty?.('right');
      this.arcaneCircle?.style.removeProperty?.('bottom');
      const joystick = document.getElementById('touch-joystick');
      joystick?.classList.remove('is-active');
      joystick?.style.removeProperty?.('left');
      joystick?.style.removeProperty?.('top');
      joystick?.style.removeProperty?.('bottom');
    }
    if (this.uiLayoutBtn) this.uiLayoutBtn.textContent = this.touchLayout === 'alternate' ? 'SETTINGS: ALT TOUCH UI' : 'SETTINGS: CLASSIC UI';
    if (this.menuLayoutBtn) this.menuLayoutBtn.textContent = this.touchLayout === 'alternate' ? 'TOUCH UI: ALT' : 'TOUCH UI: CLASSIC';
    try { window.localStorage?.setItem?.('grimge-touch-layout', this.touchLayout); } catch { /* preference is optional */ }
  }

  placeDrawNearJoystick() {
    if (this.touchLayout !== 'alternate' || !this.arcaneCircle) return;
    // Draw deliberately has a stable lower-left home. It must not jump under
    // the player’s thumb just because the dynamic movement stick was spawned
    // at a different left-side location.
    this.arcaneCircle.style.removeProperty?.('left');
    this.arcaneCircle.style.removeProperty?.('top');
    this.arcaneCircle.style.removeProperty?.('right');
    this.arcaneCircle.style.removeProperty?.('bottom');
  }

  toggleGrimoire(forceState) {
    if (forceState !== undefined) {
      if (forceState) this.grimoireModal.classList.remove('hidden');
      else this.grimoireModal.classList.add('hidden');
    } else {
      this.grimoireModal.classList.toggle('hidden');
    }
    this.renderRuneProgression(window.gameWorld?.profile);
  }

  toggleSkillTree(forceState) {
    if (!this.skillTreeModal) return;
    if (forceState === undefined) this.skillTreeModal.classList.toggle('hidden');
    else this.skillTreeModal.classList.toggle('hidden', !forceState);
  }

  toggleDeckBuilder(forceState) {
    if (!this.deckBuilderModal) return;
    if (forceState === undefined) this.deckBuilderModal.classList.toggle('hidden');
    else this.deckBuilderModal.classList.toggle('hidden', !forceState);
  }

  toggleIngameMenu(forceState = true) {
    if (!this.gameMenuModal) return;
    const open = forceState !== false;
    this.gameMenuModal.classList.toggle('hidden', !open);
    window.gameWorld?.setMenuPaused?.(open);
  }

  renderProfile(profile) {
    if (!profile || !this.profileSummary) return;
    const build = profile.getBuildIdentity?.().label ?? 'UNBOUND MAGE';
    this.profileSummary.textContent = `${build} · LV.${profile.level} · XP ${profile.xp}/${profile.xpToNextLevel()} · SKILL POINTS ${profile.skillPoints} · DECK ${profile.matchDeck.length}/10`;
    this.renderHub(profile);
  }

  renderDeckBuilder(profile) {
    if (!profile || !this.deckBuilderContent || !this.deckBuilderSummary) return;
    this.deckBuilderSummary.textContent = `MATCH DECK ${profile.matchDeck.length}/10 · MAX 2 COPIES PER RUNE`;
    this.deckBuilderContent.innerHTML = recognizer.runes.map((rune) => {
      const unlocked = profile.isRuneUnlocked(rune.id);
      const copies = profile.getRuneCopies(rune.id);
      const lockedText = rune.id === 'bestia' ? 'MAGE LV.2' : rune.id === 'construct' ? 'MAGE LV.3' : rune.id === 'void' ? 'MAGE LV.4' : 'STARTER';
      return `<article class="deck-rune ${unlocked ? '' : 'locked'}" style="--rune-color:${rune.color}"><b>${rune.glyph} ${rune.name}</b><span>${unlocked ? `${copies}/2 IN DECK · RUNE LV.${profile.runeLevel(rune.id)}` : `LOCKED · ${lockedText}`}</span><div><button data-deck-action="remove" data-rune-id="${rune.id}" ${copies ? '' : 'disabled'}>−</button><button data-deck-action="add" data-rune-id="${rune.id}" ${(!unlocked || copies >= 2 || profile.matchDeck.length >= 10) ? 'disabled' : ''}>+</button></div></article>`;
    }).join('');
  }

  renderRuneProgression(profile) {
    if (!profile || !this.runeProgressList) return;
    this.runeProgressList.innerHTML = recognizer.runes.map((rune) => {
      const unlocked = profile.isRuneUnlocked(rune.id);
      const level = profile.runeLevel(rune.id);
      const xp = profile.runeXpIntoLevel(rune.id);
      const requirement = rune.id === 'bestia' ? 'MAGE LV.2' : rune.id === 'construct' ? 'MAGE LV.3' : rune.id === 'void' ? 'MAGE LV.4' : 'STARTER';
      return `<div class="rune-progress ${unlocked ? '' : 'locked'}"><b style="color:${rune.color}">${rune.glyph} ${rune.name}</b><span>${unlocked ? `RUNE LV.${level} · ${xp}/60 XP` : `LOCKED · ${requirement}`}</span></div>`;
    }).join('');
  }

  renderSkillTree(profile) {
    if (!profile || !this.skillTreeContent) return;
    this.renderProfile(profile);
    const branches = [...new Set(MAGE_SKILL_TREE.map((node) => node.branch))];
    this.skillTreeContent.innerHTML = branches.map((branch) => {
      const nodes = MAGE_SKILL_TREE.filter((node) => node.branch === branch).map((node) => {
        const unlocked = profile.unlockedSkills.has(node.id);
        const ready = profile.canUnlock(node.id);
        const prerequisite = (node.prerequisites ?? []).length ? ` · needs ${node.prerequisites.join(', ')}` : '';
        return `<button class="skill-node ${unlocked ? 'unlocked' : ''}" data-skill-id="${node.id}" ${ready ? '' : 'disabled'}><b>${unlocked ? '✓ ' : ''}${node.title}</b><span>${node.desc}</span><em>${unlocked ? 'UNLOCKED' : ready ? `UNLOCK · ${node.cost} SP` : `LOCKED${prerequisite}`}</em></button>`;
      }).join('');
      return `<section class="skill-branch"><h3>${branch}</h3>${nodes}</section>`;
    }).join('');
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
    if (visible) {
      this.renderProfile(window.gameWorld?.profile);
      this.setHubPage(this.hubPage);
    }
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

  showRecognitionBadge(rune, confidence, grade = null) {
    if (rune) {
      const rank = grade ? ` · ${grade}-RANK` : '';
      this.recognitionResult.textContent = `✦ ${rune.name}${rank} (${Math.round(confidence * 100)}%) ✦`;
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
    if (this.focusActivateBtn) {
      const ready = player.focus >= player.maxFocus && player.focusTransformTimer <= 0;
      this.focusActivateBtn.textContent = ready
        ? 'ACTIVATE FOCUS'
        : `FOCUS ${Math.round(player.focus)}/${player.maxFocus}`;
      this.focusActivateBtn.classList.toggle('ready', ready);
      this.focusActivateBtn.disabled = !ready;
    }
    if (this.focusReadout) {
      this.focusReadout.textContent = player.focusTransformTimer > 0
        ? `FOCUS ASCENDANT ${player.focusTransformTimer.toFixed(1)}s`
        : `FOCUS ${Math.round(player.focus)}/${player.maxFocus}`;
    }

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
      // Mount is a contextual action, never a permanent disabled control.
      // GameWorld owns the stable nearest-candidate decision; UI only mirrors
      // that authoritative state.
      const canMount = !!window.gameWorld.mountCandidate && !player.isMounted;
      if (this.mountBtn) {
        if (canMount) this.mountBtn.classList.add('is-available');
        else this.mountBtn.classList.remove('is-available');
        this.mountBtn.disabled = !canMount;
        this.mountBtn.setAttribute('aria-hidden', canMount ? 'false' : 'true');
      }
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
        const runeLevel = window.gameWorld?.profile?.runeLevel?.(rune.id) ?? 1;
        overlay.innerHTML = `<span>${rune.glyph}</span><small>${rune.name} · LV.${runeLevel}</small><em>${rune.desc}</em>`;
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
      this.activeSpellPreview.textContent = selectedSlot.definition.isComponent
        ? `COMPONENT: ${selectedSlot.definition.name} — DRAW A MATCHING RUNE`
        : `READY: ${selectedSlot.definition.name} [CAST · SWAP]`;
      this.activeSpellPreview.style.color = selectedSlot.definition.color;
    } else {
      const hand = player.runeHand.map((rune) => rune.name).join(' · ');
      this.activeSpellPreview.textContent = hand ? `RUNE HAND: ${hand} — DRAW ONE` : 'RUNE DECK EMPTY';
      this.activeSpellPreview.style.color = '#ffd54f';
    }

    // Summons are match entities, not hidden buffs. Keep a small persistent
    // readout close to the deck so their remaining lifetime and a mounted
    // state remain legible without adding a separate HUD panel.
    if (this.summonStatus) {
      const summons = spells.getSummons(player.team);
      if (!summons.length) {
        this.summonStatus.textContent = '';
        this.summonStatus.classList.remove('visible');
      } else {
        const status = summons.map((summon) => {
          const seconds = Math.max(0, Math.ceil(summon.duration));
          const hp = Math.round((summon.hp / summon.maxHp) * 100);
          const riding = player.mountedSummon === summon ? ' · RIDING' : '';
          return `${summon.definition.name} ${seconds}s · ${hp}%${riding}`;
        }).join('  |  ');
        this.summonStatus.textContent = `SUMMON: ${status}`;
        this.summonStatus.classList.add('visible');
      }
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
