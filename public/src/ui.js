// GRIMGE Prototype — UI & HUD Controller matching Setup Mockup Exactly
import { spells } from './spells.js';
import { MAGE_SKILL_TREE, ALL_RUNE_IDS, runeUnlockLabel, isBuffRuneId, isSignatureRuneId, maxRuneCopies } from './progression.js';
import { recognizer } from './recognizer.js';
import { sprites } from './sprites.js';
import { runeManaCost, SPELL_RECIPES, lookupRecipe, SOLO_RUNES, spellHowTo } from './spell_catalog.js';
import { TRAINING_MAPS, trainingMapThumb } from './training_maps.js';

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
    this.hubFreePlayProfilePortrait = document.getElementById('hub-freeplay-profile-portrait');
    this.hubFreePlayProfileName = document.getElementById('hub-freeplay-profile-name');
    this.hubFreePlayProfileLevel = document.getElementById('hub-freeplay-profile-level');
    this.hubFreePlayProfileTitle = document.getElementById('hub-freeplay-profile-title');
    this.hubFreePlayProfileXpFill = document.getElementById('hub-freeplay-profile-xp-fill');
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
    this.hubTrainingModeBtn = document.getElementById('hub-training-mode-btn');
    this.hubModesBackBtn = document.getElementById('hub-modes-back-btn');
    this.hubFreePlaySiegeBtn = document.getElementById('hub-freeplay-siege-btn');
    this.hubFreePlayInvasionBtn = document.getElementById('hub-freeplay-invasion-btn');
    this.hubFreePlayDungeonBtn = document.getElementById('hub-freeplay-dungeon-btn');
    this.hubFreePlayArenaBtn = document.getElementById('hub-freeplay-arena-btn');
    this.hubFreePlayBackBtn = document.getElementById('hub-freeplay-back-btn');
    this.hubFullscreenBtn = document.getElementById('hub-fullscreen-btn');
    this.hubCustomizeBtn = document.getElementById('hub-customize-btn');
    this.hubPage = 'character';
    this.selectedMode = 'siege';
    this.hubSwipeStart = null;
    try {
      this.selectedHero = window.localStorage?.getItem?.('grimge-selected-hero') || 'astral';
      this.selectedCompanion = window.localStorage?.getItem?.('grimge-selected-companion') || 'wolf';
    } catch {
      this.selectedHero = 'astral'; this.selectedCompanion = 'wolf';
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
    this.focusActivateBtn = document.getElementById('focus-activate-btn');
    // The own profile bar (portrait + bars) also triggers the transformation.
    this.blueSidePanel = document.querySelector?.('#top-hud-bar .blue-side') ?? null;
    this.trainingSparringBtn = document.getElementById('training-sparring-btn');
    this.siegeDeployBtn = document.getElementById('siege-deploy-btn');
    this.trainingPassiveBtn = document.getElementById('training-passive-btn');
    this.trainingMinionsBtn = document.getElementById('training-minions-btn');
    this.trainingPrimalBtn = document.getElementById('training-primal-btn');
    this.trainingWeaponBtn = document.getElementById('training-weapon-btn');
    this.trainingTowersBtn = document.getElementById('training-towers-btn');
    this.trainingDeckBtn = document.getElementById('training-deck-btn');
    this.trainingMapBtn = document.getElementById('training-map-btn');
    this.trainingMapModal = document.getElementById('training-map-modal');
    this.trainingMapGrid = document.getElementById('training-map-grid');
    this.closeTrainingMapBtn = document.getElementById('close-training-map-btn');
    this.deckTargetTabs = document.getElementById('deck-target-tabs');
    this.blueMpBound = document.getElementById('blue-mp-bound');
    this.blueFocusFill = document.getElementById('blue-focus-fill');
    this.blueFocusText = document.getElementById('blue-focus-text');
    this.redFocusStrip = document.getElementById('red-focus-strip');
    this.redFocusFill = document.getElementById('red-focus-fill');
    this.redFocusText = document.getElementById('red-focus-text');

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
    this.castLabel = this.castBtn?.querySelector?.('.cast-label') ?? null;
    this.mountBtn = document.getElementById('action-mount-btn');
    // Spell triangle corners: 0 = top (SLOT 1), 1 = bottom-left, 2 = bottom-right.
    this.bottomRightActions = document.getElementById('bottom-right-actions');
    this.slotButtons = [0, 1, 2].map((position) => document.getElementById(`action-slot-${position}`));
    this.slotGlyphs = this.slotButtons.map((button) => button?.querySelector?.('.slot-glyph') ?? null);
    this.fusionPreviewLine = document.getElementById('fusion-preview-line');
    this.fusionDrag = null;
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    this.gameMenuBtn = document.getElementById('game-menu-btn');
    this.gameMenuModal = document.getElementById('game-menu-modal');
    this.closeGameMenuBtn = document.getElementById('close-game-menu-btn');
    this.resumeMatchBtn = document.getElementById('resume-match-btn');
    this.restartMatchBtn = document.getElementById('restart-match-btn');
    this.screenFitBtn = document.getElementById('screen-fit-btn');
    this.menuHubBtn = document.getElementById('menu-hub-btn');
    this.uiLayer = document.getElementById('ui-layer');

    this.drawingHud = document.getElementById('drawing-hud');
    this.recognitionResult = document.getElementById('recognition-result');
    this.runRuneChoice = document.getElementById('run-rune-choice');
    this.runRuneOptions = document.getElementById('run-rune-options');
    this.runRuneLevel = document.getElementById('run-rune-level');

    this.heroChips = document.querySelectorAll('.hero-chip');

    this.setupListeners();
    this.renderGrimoireGuides();
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
    // The Grimoire is the deck stack: it opens the deck / rune view. Spell
    // fusion is done on the right-hand triangle, never here.
    this.grimoireBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleGrimoire();
    });

    this.closeGrimoireBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGrimoire(false);
    });

    this.runRuneOptions?.addEventListener('pointerdown', (e) => {
      const option = e.target?.closest?.('[data-run-rune-id]');
      const runeId = option?.getAttribute?.('data-run-rune-id');
      if (!runeId) return;
      e.preventDefault(); e.stopPropagation();
      window.gameWorld?.chooseRunRune?.(runeId);
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
    this.screenFitBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const game = window.gameWorld;
      if (!game) return;
      game.setScreenFit(game.screenFit === 'fill' ? 'fit' : 'fill');
      this.syncScreenFitLabel(game.screenFit);
    });
    this.restartMatchBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleIngameMenu(false); window.gameWorld?.restartMatch();
    });
    this.menuHubBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleIngameMenu(false); window.gameWorld?.returnToHub();
    });
    closeFromBackdrop(this.gameMenuModal, () => this.toggleIngameMenu(false));

    // Legacy central Draw button (hidden by CSS; DRAW is the triangle centre).
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
      const gw = window.gameWorld;
      // DRAW doubles as the push / counter impulse inside a Beam Clash.
      if (gw?.player?.activeClash) gw.clashAction();
      else if (gw?.drawing?.active) gw.lockOrExitRuneDrawing();
      else gw?.startRuneDrawing();
    });
    this.setupSpellTriangle();
    this.siegeDeployBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.requestDeploy();
    });
    this.trainingSparringBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.toggleSparringPartner();
    });
    this.trainingWeaponBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.cycleClassWeapon();
    });
    this.trainingPrimalBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.cyclePrimal();
    });
    this.trainingMinionsBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.toggleTrainingMinions();
    });
    this.trainingTowersBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.toggleTrainingTowers();
    });
    this.trainingPassiveBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.toggleSparringPassive();
    });
    this.trainingDeckBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.openTrainingDeck('player');
    });
    this.trainingMapBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleTrainingMaps(true);
    });
    this.closeTrainingMapBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.toggleTrainingMaps(false);
    });
    this.trainingMapGrid?.addEventListener('pointerdown', (e) => {
      const id = e.target?.closest?.('[data-map-id]')?.getAttribute?.('data-map-id');
      if (!id) return;
      e.preventDefault(); e.stopPropagation();
      this.toggleTrainingMaps(false);
      window.gameWorld?.selectTrainingMap(id);
    });
    this.deckTargetTabs?.addEventListener('pointerdown', (e) => {
      const target = e.target?.closest?.('[data-deck-target]')?.getAttribute?.('data-deck-target');
      if (!target) return;
      e.preventDefault(); e.stopPropagation();
      window.gameWorld?.openTrainingDeck(target);
    });
    this.mountBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.toggleMount();
    });
    this.blueSidePanel?.addEventListener?.('pointerdown', (e) => {
      const game = window.gameWorld;
      if (!game?.player || game.player.focus < game.player.maxFocus || game.player.focusTransformTimer > 0) return;
      e.preventDefault(); e.stopPropagation(); game.activateFocusTransformation();
    });
    this.focusActivateBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); window.gameWorld?.activateFocusTransformation();
    });
    this.fullscreenBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.gameWorld?.enterFullscreen();
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
      this.setHubPage('freeplay');
    });
    this.hubModesBackBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); this.setHubPage('character');
    });
    this.hubFreePlaySiegeBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.setHubMode('siege');
      startMatch(e);
    });
    const startSelectedMode = (mode) => (e) => {
      e.preventDefault();
      this.setHubMode(mode);
      startMatch(e);
    };
    this.hubTrainingModeBtn?.addEventListener('pointerdown', startSelectedMode('training'));
    this.hubFreePlayInvasionBtn?.addEventListener('pointerdown', startSelectedMode('invasion'));
    this.hubFreePlayDungeonBtn?.addEventListener('pointerdown', startSelectedMode('dungeon'));
    this.hubFreePlayArenaBtn?.addEventListener('pointerdown', startSelectedMode('arena'));
    this.hubFreePlayBackBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault(); this.setHubPage('modes');
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
      const pages = ['character', 'deck', 'skills', 'modes', 'freeplay', 'settings'];
      const from = Math.max(0, pages.indexOf(this.hubPage));
      this.setHubPage(pages[Math.max(0, Math.min(pages.length - 1, from + (dx < 0 ? 1 : -1)))]);
    });
  }

  getSelectedHero() { return this.selectedHero || 'astral'; }

  setHubPage(page) {
    const valid = ['character', 'deck', 'skills', 'modes', 'freeplay', 'settings'];
    if (!valid.includes(page)) return;
    this.hubPage = page;
    this.hubShell?.classList.toggle('hub-main-active', page === 'character');
    this.hubShell?.classList.toggle('hub-game-types-active', page === 'modes');
    this.hubShell?.classList.toggle('hub-free-play-active', page === 'freeplay');
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
    if (!['siege', 'invasion', 'dungeon', 'arena', 'training'].includes(mode)) return;
    this.selectedMode = mode;
    window.gameWorld?.setMatchMode?.(mode);
    [this.hubSiegeModeBtn, this.hubFreePlaySiegeBtn, this.hubFreePlayInvasionBtn, this.hubFreePlayDungeonBtn, this.hubFreePlayArenaBtn, this.hubTrainingModeBtn]
      .forEach((button) => button?.classList.remove('active'));
    const selected = {
      siege: [this.hubSiegeModeBtn, this.hubFreePlaySiegeBtn],
      invasion: [this.hubFreePlayInvasionBtn],
      dungeon: [this.hubFreePlayDungeonBtn],
      arena: [this.hubFreePlayArenaBtn],
      training: [this.hubTrainingModeBtn]
    }[mode] ?? [];
    selected.forEach((button) => button?.classList.add('active'));
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
      fighter: { name: 'FIGHTER', title: 'ARCANE DUELIST', attack: 125, health: 190 },
      nyx: { name: 'NYX', title: 'PHANTOM ROGUE', attack: 135, health: 175 },
      deep: { name: 'DEEP', title: 'PHANTOM BLADE', attack: 140, health: 185 },
      firen: { name: 'FIREN', title: 'PHANTOM FLAME', attack: 145, health: 170 },
      freeze: { name: 'FREEZE', title: 'PHANTOM FROST', attack: 130, health: 195 },
      john: { name: 'JOHN', title: 'PHANTOM KNIGHT', attack: 128, health: 200 },
      woody: { name: 'WOODY', title: 'PHANTOM BRAWLER', attack: 142, health: 180 },
      henry: { name: 'HENRY', title: 'PHANTOM ARCHER', attack: 136, health: 178 }
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
    if (this.hubFreePlayProfilePortrait) {
      this.hubFreePlayProfilePortrait.src = details.profilePortrait
        ? `assets/ui/ui_hub_free_play_screen_concept/${details.profilePortrait}`
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
    if (this.hubFreePlayProfileName) this.hubFreePlayProfileName.textContent = details.name;
    if (this.hubFreePlayProfileLevel) this.hubFreePlayProfileLevel.textContent = `ARCANA LV. ${profileLevel}`;
    if (this.hubFreePlayProfileTitle) this.hubFreePlayProfileTitle.textContent = details.title;
    if (this.hubFreePlayProfileXpFill) this.hubFreePlayProfileXpFill.style.width = `${Math.round(Math.min(1, profileXp / profileXpMax) * 100)}%`;
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
    // Closing the training editor resumes the training with the new decks.
    const classes = this.deckBuilderModal.classList;
    const hidden = typeof classes.contains === 'function' ? classes.contains('hidden') : !!classes.values?.has?.('hidden');
    if (hidden) window.gameWorld?.closeTrainingDeck?.();
  }

  toggleTrainingMaps(open) {
    if (!this.trainingMapModal) return;
    this.trainingMapModal.classList.toggle('hidden', !open);
    this.trainingMapsOpen = !!open;
    window.gameWorld?.setMenuPaused?.(!!open);
    if (!open || !this.trainingMapGrid) return;
    const current = window.gameWorld?.trainingMapId;
    this.trainingMapGrid.innerHTML = TRAINING_MAPS.map((map) => `<button type="button" class="training-map-card ${map.id === current ? 'active' : ''}" data-map-id="${map.id}"><img src="${trainingMapThumb(map)}" alt="${map.name}" loading="lazy"><b>${map.name}</b><span>${map.desc}</span></button>`).join('');
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
    // Training passes a deck source with a target (player / opponent).
    const training = !!profile.target;
    this.deckTargetTabs?.classList.toggle('hidden', !training);
    if (training) {
      for (const tab of this.deckTargetTabs?.querySelectorAll?.('[data-deck-target]') ?? []) {
        const target = tab.getAttribute('data-deck-target');
        tab.classList.toggle('active', target === profile.target);
        tab.disabled = target === 'opponent' && !profile.trainingSparring;
      }
    }
    this.deckBuilderSummary.textContent = training
      ? `${profile.target === 'player' ? 'YOUR' : 'SPARRING PARTNER'} TRAINING DECK ${profile.matchDeck.length}/10 · DEBUG: ALL RUNES AVAILABLE`
      : `MATCH DECK ${profile.matchDeck.length}/10 · ELEMENTAL RUNES ×2 · SPECIAL RUNES ×1`;
    // Only real deck runes; transformation runes are granted in battle.
    const card = (rune) => {
      const unlocked = profile.isRuneUnlocked(rune.id);
      const copies = profile.getRuneCopies(rune.id);
      const lockedText = runeUnlockLabel(rune.id);
      // Arcane State runes: max. one of all of them in the deck.
      const buff = isBuffRuneId(rune.id);
      const buffTaken = buff && !copies && profile.matchDeck.some(isBuffRuneId);
      const sig = isSignatureRuneId(rune.id); const max = maxRuneCopies(rune.id);
      const status = !unlocked ? `LOCKED · ${lockedText}`
        : buff ? (copies ? 'IN DECK · ARCANE STATE' : buffTaken ? 'ANOTHER ARCANE STATE IS IN THE DECK' : 'ARCANE STATE · MAX 1 PER DECK')
        : sig ? (copies ? 'IN DECK · SIGNATURE SPECIAL' : `SIGNATURE SPECIAL · ONCE PER DECK · ${rune.desc.split(' — ')[1] ?? ''}`)
        : `${copies}/${max} IN DECK · RUNE LV.${profile.runeLevel(rune.id)}`;
      const blocked = !unlocked || copies >= max || profile.matchDeck.length >= 10 || buffTaken;
      return `<article class="deck-rune ${unlocked ? '' : 'locked'} ${buff ? 'is-buff' : ''} ${sig ? 'is-signature' : ''}" style="--rune-color:${rune.color}"><b>${rune.glyph} ${rune.name}${buff ? ' <i class="buff-tag">ARCANE</i>' : sig ? ' <i class="buff-tag sig-tag">SIGNATURE</i>' : ''}</b><span>${status}</span><div><button data-deck-action="remove" data-rune-id="${rune.id}" ${copies ? '' : 'disabled'}>−</button><button data-deck-action="add" data-rune-id="${rune.id}" ${blocked ? 'disabled' : ''}>+</button></div></article>`;
    };
    const deckRunes = recognizer.runes.filter((rune) => ALL_RUNE_IDS.includes(rune.id));
    this.deckBuilderContent.innerHTML = deckRunes.filter((rune) => !isBuffRuneId(rune.id) && !isSignatureRuneId(rune.id)).map(card).join('')
      + '<h4 class="deck-section-title">✦ SIGNATURE SPECIALS — SPECIAL RUNES · EACH ONCE PER DECK · OWN MULTI-STROKE GLYPH · NO COMBINATION</h4>'
      + deckRunes.filter((rune) => isSignatureRuneId(rune.id)).map(card).join('')
      + '<h4 class="deck-section-title">⧗ ARCANE STATES — SPECIAL RUNES · ONLY ONE OF ALL PER DECK · ONE HOURGLASS SIGIL</h4>'
      + deckRunes.filter((rune) => isBuffRuneId(rune.id)).map(card).join('');
  }

  // The grimoire lists every rune gesture and every recipe straight from the
  // recognizer and the spell catalog, so it can never miss or mislabel a
  // fusion. Each rune is shown with its icon AND its name.
  syncScreenFitLabel(mode) {
    if (this.screenFitBtn) this.screenFitBtn.textContent = mode === 'fill' ? 'SCREEN: FILL (ZOOM)' : 'SCREEN: FIT (SAME VIEW)';
  }

  renderGrimoireGuides() {
    const deckRunes = recognizer.runes.filter((rune) => ALL_RUNE_IDS.includes(rune.id));
    const byId = new Map(recognizer.runes.map((rune) => [rune.id, rune]));
    const chip = (id) => {
      const rune = byId.get(id);
      return rune ? `<span class="g-rune" style="--rune-color:${rune.color}">${rune.icon} ${rune.name}</span>` : id.toUpperCase();
    };
    const glyphs = document.getElementById('rune-glyph-guide');
    if (glyphs) {
      glyphs.innerHTML = deckRunes.map((rune) => `<div class="g-item"><span class="r-icon">${rune.icon}</span><strong>${rune.name} (${rune.element})</strong>: ${rune.desc}${SOLO_RUNES.includes(rune.id) ? ' <span class="g-note">· special rune, no fusion</span>' : ''}${isBuffRuneId(rune.id) ? ' <span class="g-note buff-tag">· ARCANE STATE · MAX 1 PER DECK</span>' : ''}${isSignatureRuneId(rune.id) ? ' <span class="g-note buff-tag">· SIGNATURE SPECIAL · ONCE PER DECK · NO FUSION</span>' : ''}</div>`).join('');
    }
    const fusions = document.getElementById('fusion-guide');
    if (!fusions) return;
    const groups = { 1: [], 2: [], 3: [] };
    for (const key of Object.keys(SPELL_RECIPES)) {
      const ids = key.split('+');
      if (ids.some((id) => id.startsWith('transform_'))) continue;
      const recipe = lookupRecipe(ids);
      if (recipe) groups[ids.length]?.push({ ids, recipe });
    }
    // Tap a recipe to see what it does and how to cast it.
    const line = ({ ids, recipe }) => {
      const how = spellHowTo(recipe.id);
      const detail = how ? `<div class="g-detail" data-detail="${recipe.id}"><p><b>WHAT IT DOES</b> ${how.effect}</p><p><b>HOW TO CAST</b> ${how.targeting}</p>${how.summon ? `<p><b>TIP</b> ${how.summon}</p>` : ''}</div>` : '';
      return `<div class="g-item is-recipe" data-spell="${recipe.id}" role="button" tabindex="0">${ids.map(chip).join(' + ')} = <strong>${recipe.name}</strong><span class="g-more">ⓘ</span></div>${detail}`;
    };
    if (!fusions.dataset?.bound) {
      if (fusions.dataset) fusions.dataset.bound = '1';
      fusions.addEventListener('pointerdown', (e) => {
        const row = e.target?.closest?.('[data-spell]');
        if (!row) return;
        this.toggleRecipeDetail(row.getAttribute('data-spell'));
      });
    }
    fusions.innerHTML = [
      ['SINGLE RUNES', groups[1]],
      ['DUAL FUSIONS', groups[2]],
      ['TRIPLE FUSIONS', groups[3]]
    ].map(([title, list]) => `<h4>${title}</h4>${list.map(line).join('')}`).join('');
  }

  // Open one recipe explanation in the grimoire (closes the previous one).
  toggleRecipeDetail(spellId) {
    const fusions = document.getElementById('fusion-guide');
    if (!fusions?.querySelectorAll) return null;
    let opened = null;
    for (const detail of fusions.querySelectorAll('.g-detail')) {
      const match = detail.getAttribute('data-detail') === spellId;
      const open = match && !detail.classList.contains('open');
      detail.classList.toggle('open', open);
      if (open) opened = spellId;
    }
    for (const row of fusions.querySelectorAll('[data-spell]')) row.classList.toggle('active', row.getAttribute('data-spell') === opened);
    return opened;
  }

  renderRuneProgression(profile) {
    if (!profile || !this.runeProgressList) return;
    // Only real deck runes; transformation runes are granted in battle.
    this.runeProgressList.innerHTML = recognizer.runes.filter((rune) => ALL_RUNE_IDS.includes(rune.id)).map((rune) => {
      const unlocked = profile.isRuneUnlocked(rune.id);
      const level = profile.runeLevel(rune.id);
      const xp = profile.runeXpIntoLevel(rune.id);
      const requirement = runeUnlockLabel(rune.id);
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
    if (portraitByHero[heroKey]) {
      this.playerPortraitImg.src = portraitByHero[heroKey];
    } else {
      const sprCanvas = sprites.sprites[heroKey]?.canvas;
      if (sprCanvas?.toDataURL) this.playerPortraitImg.src = sprCanvas.toDataURL();
    }
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

  showRunRuneChoice(options = [], level = 0) {
    if (!this.runRuneChoice || !this.runRuneOptions) return;
    this.runRuneLevel.textContent = String(level);
    this.runRuneOptions.innerHTML = options.map((rune) => {
      const color = rune.color || '#4ddfff';
      const glyph = rune.symbol || rune.glyph || '✦';
      return `<button type="button" class="run-rune-option" data-run-rune-id="${rune.id}" style="--rune-color:${color}"><b>${glyph} ${rune.name}</b><span>ADD TO THIS RUN</span></button>`;
    }).join('');
    this.runRuneChoice.classList.remove('hidden');
  }

  hideRunRuneChoice() { this.runRuneChoice?.classList.add('hidden'); }

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

  // Each triangle slot owns the gesture that starts on it (per pointer id):
  // a short tap casts on release, a drag across other filled slots fuses
  // exactly those slots. A touch that starts on an EMPTY slot is passed
  // through to melee, so empty slots never swallow attacks.
  setupSpellTriangle() {
    this.slotButtons.forEach((button, position) => {
      if (!button) return;
      button.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        button.setPointerCapture?.(e.pointerId);
        const filled = !!window.gameWorld?.slotAt?.(position);
        this.fusionDrag = { pointerId: e.pointerId, visited: [position], startX: e.clientX, startY: e.clientY, moved: false, filled };
        if (filled) this.updateFusionPreview(e.clientX, e.clientY);
      });
      button.addEventListener('pointermove', (e) => this.moveFusionDrag(e));
      button.addEventListener('pointerup', (e) => this.endFusionDrag(e));
      button.addEventListener('pointercancel', () => this.cancelFusionDrag());
    });
  }

  slotCenter(position) {
    const rect = this.slotButtons[position]?.getBoundingClientRect?.();
    if (!rect) return null;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, radius: rect.width * .55 };
  }

  updateFusionPreview(clientX, clientY) {
    const drag = this.fusionDrag;
    const box = this.bottomRightActions?.getBoundingClientRect?.();
    if (!this.fusionPreviewLine || !box?.width || !drag?.filled) return;
    const toLocal = (x, y) => `${((x - box.left) / box.width * 320).toFixed(1)},${((y - box.top) / box.height * 200).toFixed(1)}`;
    const points = drag.visited.map((position) => this.slotCenter(position)).filter(Boolean).map((c) => toLocal(c.x, c.y));
    if (drag.moved) points.push(toLocal(clientX, clientY));
    this.fusionPreviewLine.setAttribute('points', points.length > 1 ? points.join(' ') : '');
  }

  insideTriangle(clientX, clientY) {
    const box = this.bottomRightActions?.getBoundingClientRect?.();
    return !!box && clientX >= box.left && clientX <= box.left + box.width && clientY >= box.top && clientY <= box.top + box.height;
  }

  moveFusionDrag(e) {
    const drag = this.fusionDrag;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 14) drag.moved = true;
    if (!drag.filled) return;
    const game = window.gameWorld;
    // Dragged out of the triangle (no fusion partner yet): aim the spell.
    if (drag.moved && drag.visited.length === 1 && !this.insideTriangle(e.clientX, e.clientY)) {
      if (!drag.aiming) drag.aiming = !!game?.beginSlotAim?.(drag.visited[0]);
      if (drag.aiming) {
        game.targeting.setPointFromScreen(game.getCanvasCoords(e.clientX, e.clientY));
        this.fusionPreviewLine?.setAttribute('points', '');
        return;
      }
    }
    if (drag.aiming) return;
    for (let position = 0; position < 3; position++) {
      if (drag.visited.includes(position) || !game?.slotAt?.(position)) continue;
      const center = this.slotCenter(position);
      if (center && Math.hypot(e.clientX - center.x, e.clientY - center.y) <= center.radius) {
        drag.visited.push(position);
        this.slotButtons[position]?.classList.add('is-fusion-target');
      }
    }
    this.updateFusionPreview(e.clientX, e.clientY);
  }

  endFusionDrag(e) {
    const drag = this.fusionDrag;
    if (!drag || drag.pointerId !== e.pointerId) return;
    this.cancelFusionDrag();
    const game = window.gameWorld;
    if (!game) return;
    if (drag.aiming) {
      // Released on the battlefield: cast there. Back over the triangle: cancel.
      if (this.insideTriangle(e.clientX, e.clientY)) game.targeting.cancel();
      else {
        game.targeting.setPointFromScreen(game.getCanvasCoords(e.clientX, e.clientY));
        if (!game.targeting.confirm()) game.targeting.cancel();
      }
      return;
    }
    if (drag.filled) {
      if (!drag.moved) game.castSlotAt(drag.visited[0]);
      else if (drag.visited.length >= 2) game.fuseSlots(drag.visited);
      return;
    }
    // Empty slot: forward the gesture to melee (tap or swipe).
    const start = game.getCanvasCoords?.(drag.startX, drag.startY) ?? { x: 0, y: 0 };
    const end = game.getCanvasCoords?.(e.clientX, e.clientY) ?? start;
    game.performTouchAttackGesture(drag.moved ? end.x - start.x : 0, drag.moved ? end.y - start.y : 0);
  }

  cancelFusionDrag() {
    this.fusionDrag = null;
    this.fusionPreviewLine?.setAttribute('points', '');
    this.slotButtons.forEach((button) => button?.classList.remove('is-fusion-target'));
  }

  updateSpellTriangle(player) {
    for (let position = 0; position < 3; position++) {
      const button = this.slotButtons[position];
      if (!button) continue;
      const slot = player.slottedSpells.find((entry) => entry.position === position);
      button.classList.toggle('is-empty', !slot);
      button.classList.toggle('is-combo', !!slot?.isCombo);
      button.style.setProperty?.('--slot-color', slot ? slot.definition.color : '#4d4260');
      if (this.slotGlyphs[position]) this.slotGlyphs[position].textContent = slot ? (slot.isCombo ? '✦' : slot.runes[0].glyph) : '';
      button.title = slot ? `${slot.definition.name} — tap to cast, swipe to another slot to fuse` : `Spell slot ${position + 1} (empty)`;
    }
    if (this.castBtn) {
      const clash = !!player.activeClash;
      const drawing = !!window.gameWorld?.drawing?.active;
      const label = clash ? 'PUSH' : drawing ? 'LOCK' : 'DRAW';
      if (this.castLabel) this.castLabel.textContent = label;
      else this.castBtn.textContent = label;
      this.castBtn.classList.toggle('is-clash', clash);
    }
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

    // Mana: the hatched segment is bound to prepared slots; only the solid
    // part is free for new drawings.
    const blueMpMax = player.maxMp;
    const blueCurrentMp = Math.ceil(player.mp);
    const bound = Math.min(player.mp, (player.boundMana ?? 0) + (player.reservedMana ?? 0));
    this.blueMpFill.style.width = `${Math.max(0, (player.mp / player.maxMp) * 100)}%`;
    if (this.blueMpBound) {
      this.blueMpBound.style.left = `${Math.max(0, (player.mp - bound) / player.maxMp * 100)}%`;
      this.blueMpBound.style.width = `${Math.max(0, bound / player.maxMp * 100)}%`;
    }
    this.blueMpText.textContent = bound > 0
      ? `${blueCurrentMp}/${blueMpMax} · ${Math.floor(player.freeMana ?? 0)} FREE`
      : `${blueCurrentMp} / ${blueMpMax}`;

    // Focus sits in the top HUD with a compact transformation icon.
    const focusReady = player.focus >= player.maxFocus && player.focusTransformTimer <= 0 && !player.primalBond;
    if (this.blueFocusFill) {
      this.blueFocusFill.style.width = `${Math.max(0, Math.min(100, player.focus / player.maxFocus * 100))}%`;
      this.blueFocusFill.parentElement?.classList?.toggle('focus-ready', focusReady);
    }
    if (this.blueFocusText) {
      this.blueFocusText.textContent = player.primalBond
        ? `BOND ${Math.round(player.focus / player.maxFocus * 100)}%`
        : player.focusTransformTimer > 0
        ? `ASCENDANT ${Math.round(player.focus / player.maxFocus * 100)}%`
        : `${Math.round(player.focus / player.maxFocus * 100)}%`;
    }
    this.blueSidePanel?.classList?.toggle('focus-ready', focusReady);
    if (this.focusActivateBtn) {
      this.focusActivateBtn.classList.toggle('ready', focusReady);
      this.focusActivateBtn.disabled = !focusReady;
      this.focusActivateBtn.title = focusReady ? 'Activate transformation (T)' : `Focus ${Math.round(player.focus)}/${player.maxFocus}`;
    }
    this.updateSpellTriangle(player);
    if (this.trainingSparringBtn) {
      const sparring = !!window.gameWorld?.modeState?.sparring;
      const passive = !!window.gameWorld?.modeState?.sparringPassive;
      this.trainingSparringBtn.textContent = sparring ? '⚔ SPARRING PARTNER: ON' : '⚔ SPARRING PARTNER: OFF';
      if (this.trainingPassiveBtn) {
        this.trainingPassiveBtn.classList.toggle('hidden', !sparring);
        this.trainingPassiveBtn.classList.toggle('is-on', sparring && passive);
        this.trainingPassiveBtn.textContent = passive ? '◎ PARTNER: PASSIVE' : '◉ PARTNER: ACTIVE';
      }
      this.trainingSparringBtn.classList.toggle('is-on', sparring);
    }
    if (this.trainingWeaponBtn) {
      const id = window.gameWorld?.player?.classWeapon;
      this.trainingWeaponBtn.textContent = id ? `⚔ CLASS: ${id.replace('_', ' ').toUpperCase()}` : '⚔ CLASS: NONE';
      this.trainingWeaponBtn.classList.toggle('is-on', !!id);
    }
    if (this.trainingPrimalBtn) {
      const game = window.gameWorld;
      const choice = game?.primalChoice ?? 'none';
      this.trainingPrimalBtn.textContent = choice === 'none' ? '✧ PRIMAL: NONE' : `${choice === 'wolf' ? '🐺' : '🐢'} PRIMAL: ${choice.toUpperCase()} ${'I'.repeat(game?.primalStage ?? 1)}`;
      this.trainingPrimalBtn.classList.toggle('is-on', choice !== 'none');
    }
    const siege = window.gameWorld?.siegeMatch;
    if (this.siegeDeployBtn) {
      this.siegeDeployBtn.classList.toggle('hidden', !siege);
      if (siege) {
        const label = siege.deployLabel('blue');
        if (this.siegeDeployBtn.firstChild?.nodeValue !== label.text) {
          if (this.siegeDeployBtn.firstChild?.nodeType === 3) this.siegeDeployBtn.firstChild.nodeValue = label.text;
          else this.siegeDeployBtn.prepend?.(label.text);
        }
        this.siegeDeployBtn.dataset.state = label.state;
      }
    }
    const field = window.gameWorld?.battlefield;
    if (this.trainingMinionsBtn) {
      const on = !!field?.trainingWavesOn;
      this.trainingMinionsBtn.textContent = on ? '⚑ MINIONS: ON' : '⚑ MINIONS: OFF';
      this.trainingMinionsBtn.classList.toggle('is-on', on);
    }
    if (this.trainingTowersBtn) {
      const on = !!field?.trainingTowersOn;
      this.trainingTowersBtn.textContent = on ? '♜ TOWERS: ON' : '♜ TOWERS: OFF';
      this.trainingTowersBtn.classList.toggle('is-on', on);
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
    // Only fighters that actually have a focus resource show the bar.
    const enemyHasFocus = Number.isFinite(enemyChampion?.focus);
    this.redFocusStrip?.classList.toggle('hidden', !enemyHasFocus);
    if (enemyHasFocus) {
      const ratio = enemyChampion.focus / (enemyChampion.maxFocus ?? 100);
      if (this.redFocusFill) this.redFocusFill.style.width = `${Math.max(0, ratio * 100)}%`;
      if (this.redFocusText) this.redFocusText.textContent = `${Math.round(ratio * 100)}%`;
    }

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
        const cost = runeManaCost(rune);
        // Runes above the FREE mana are greyed out and cannot be drawn.
        cardEl.classList.toggle('unaffordable', !window.gameWorld?.drawing?.active && cost > (player.freeMana ?? Infinity));
        overlay.innerHTML = `<b class="card-cost">${cost}</b><span>${rune.glyph}</span><small>${rune.name} · LV.${runeLevel}</small><em>${rune.desc}</em>`;
      } else {
        cardEl.style.opacity = '0.55';
        cardEl.style.transform = 'none';
        cardEl.style.filter = 'grayscale(0.6)';
        cardEl.style.background = 'linear-gradient(145deg, rgba(38, 29, 70, .96), rgba(11, 9, 25, .96))';
        overlay.style.color = '#6f687a';
        overlay.style.borderColor = '#554d63';
        cardEl.classList.remove('unaffordable');
        overlay.innerHTML = '<span>·</span><small>EMPTY</small>';
      }
    }

    // Active Spell Preview
    const selectedSlot = player.slottedSpells[player.selectedSpellIndex];
    if (selectedSlot) {
      this.activeSpellPreview.textContent = selectedSlot.definition.isComponent
        ? `COMPONENT: ${selectedSlot.definition.name} — DRAW A MATCHING RUNE`
        : `READY: ${selectedSlot.definition.name} — TAP SLOT ${(selectedSlot.position ?? 0) + 1}`;
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
