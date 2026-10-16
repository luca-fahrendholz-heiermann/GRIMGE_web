// GRIMGE asset contract.
//
// Every runtime-facing art key has a stable PNG destination and an editable
// Aseprite source destination. Artists can replace an export without touching
// combat code, AI, collision or mode logic. Use only original or licensed art.
//
// Sheet entities use LF2-derived placeholder sprite sheets (hue-shifted).
// To replace with custom art: swap the sheet PNGs and update the animMap
// frame coordinates. The grid/animMap contract lets you drop in any sheet
// that follows a regular grid without touching gameplay code.

const CELL = Object.freeze({ w: 160, h: 160, cols: 10, rows: 7 });

// Standard LF2-layout frame map: [col, row] pairs in the 10×7 grid.
// Override per entity when the layout differs.
const STANDARD_ANIMS = Object.freeze({
  idle:   [[0,0], [1,0], [2,0]],
  walk:   [[3,0], [4,0], [5,0], [6,0]],
  run:    [[0,1], [1,1], [2,1]],
  attack: [[3,1], [4,1], [5,1], [6,1]],
  hurt:   [[0,3], [1,3]],
  dead:   [[3,3], [4,3]]
});

const HERO_ANIMS = Object.freeze({
  ...STANDARD_ANIMS,
  jump:     [[0,2], [1,2]],
  fall:     [[2,2]],
  dash:     [[0,4], [1,4]],
  guard:    [[0,5], [1,5]],
  uppercut: [[7,1], [8,1]],
  dive:     [[3,2], [4,2]]
});

export const ART_ASSETS = Object.freeze({
  scenes: Object.freeze({
    arena: 'assets/scenes/arena_bg.png',
    dungeon: 'assets/scenes/dungeon_bg.png',
    invasion: 'assets/scenes/invasion_bg.png'
  }),
  sceneLayers: Object.freeze({
    dungeon: Object.freeze({ far: 'assets/scenes/dungeon_far.png', floor: 'assets/scenes/dungeon_floor.png' }),
    invasion: Object.freeze({ far: 'assets/scenes/invasion_far.png', floor: 'assets/scenes/invasion_floor.png' }),
    arena: Object.freeze({ far: 'assets/scenes/arena_far.png', floor: 'assets/scenes/arena_floor.png' })
  }),
  // Original UI card tiles (kept for mode-selection menu)
  sceneCards: Object.freeze({
    arena: 'assets/ui/12_arena_tile.png',
    dungeon: 'assets/ui/11_dungeon_tile.png',
    invasion: 'assets/ui/10_invasion_tile.png'
  }),

  // Single-frame Aseprite entities (original GRIMGE art, kept as fallback)
  entities: Object.freeze({
    dungeonVoidRaider: Object.freeze({
      key: 'dungeon_void_raider',
      runtime: 'assets/sprites/dungeon_void_raider.png',
      source: 'art/authoring/dungeon_void_raider.aseprite',
      role: 'Dungeon hostile scout / room enemy'
    }),
    dungeonDawnGuard: Object.freeze({
      key: 'dungeon_dawn_guard',
      runtime: 'assets/sprites/dungeon_dawn_guard.png',
      source: 'art/authoring/dungeon_dawn_guard.aseprite',
      role: 'Dungeon rescue companion'
    })
  }),

  // Animated sprite sheet entities (placeholder art, easily replaceable).
  // Each entry carries its own grid config and animation frame map.
  // To swap custom art: replace the PNG(s) and adjust animMap if the
  // frame layout changes. Gameplay code reads only the key and role.
  sheetEntities: Object.freeze({
    enemy_knight: Object.freeze({
      key: 'enemy_knight',
      sheets: ['assets/sprites/sheets/enemy_knight_0.png', 'assets/sprites/sheets/enemy_knight_1.png'],
      grid: CELL,
      anims: STANDARD_ANIMS,
      role: 'enemy',
      label: 'Void Knight'
    }),
    enemy_bandit: Object.freeze({
      key: 'enemy_bandit',
      sheets: ['assets/sprites/sheets/enemy_bandit_0.png'],
      grid: CELL,
      anims: STANDARD_ANIMS,
      role: 'enemy',
      label: 'Rift Bandit'
    }),
    enemy_sorcerer: Object.freeze({
      key: 'enemy_sorcerer',
      sheets: ['assets/sprites/sheets/enemy_sorcerer_0.png'],
      grid: CELL,
      anims: Object.freeze({
        idle:   [[0,0], [1,0], [2,0], [3,0]],
        walk:   [[4,0], [5,0], [6,0], [7,0]],
        run:    [[0,1], [1,1], [2,1]],
        attack: [[3,1], [4,1], [5,1]],
        hurt:   [[0,3], [1,3]],
        dead:   [[3,3], [4,3]]
      }),
      role: 'enemy',
      label: 'Void Sorcerer'
    }),
    ally_fighter: Object.freeze({
      key: 'ally_fighter',
      sheets: ['assets/sprites/sheets/ally_fighter_0.png', 'assets/sprites/sheets/ally_fighter_1.png'],
      grid: CELL,
      anims: STANDARD_ANIMS,
      role: 'ally',
      label: 'Dawn Fighter'
    }),
    ally_blade: Object.freeze({
      key: 'ally_blade',
      sheets: ['assets/sprites/sheets/ally_blade_0.png', 'assets/sprites/sheets/ally_blade_1.png'],
      grid: CELL,
      anims: STANDARD_ANIMS,
      role: 'ally',
      label: 'Dawn Blade'
    }),
    boss_firelord: Object.freeze({
      key: 'boss_firelord',
      sheets: ['assets/sprites/sheets/boss_firelord_0.png', 'assets/sprites/sheets/boss_firelord_1.png'],
      grid: CELL,
      anims: Object.freeze({
        idle:   [[0,0], [1,0], [2,0]],
        walk:   [[3,0], [4,0], [5,0], [6,0], [7,0]],
        run:    [[0,1], [1,1], [2,1]],
        attack: [[3,1], [4,1], [5,1], [6,1], [7,1]],
        hurt:   [[0,3], [1,3]],
        dead:   [[3,3], [4,3]]
      }),
      role: 'boss',
      label: 'Flame Lord'
    }),
    hero_nyx: Object.freeze({
      key: 'nyx',
      sheets: ['assets/sprites/sheets/hero_nyx_sheet.png'],
      grid: CELL,
      anims: HERO_ANIMS,
      role: 'hero',
      label: 'Nyx the Phantom'
    }),
    hero_deep: Object.freeze({
      key: 'deep',
      sheets: ['assets/sprites/sheets/hero_deep_sheet.png'],
      grid: CELL,
      anims: HERO_ANIMS,
      role: 'hero',
      label: 'Deep the Phantom Blade'
    }),
    hero_firen: Object.freeze({
      key: 'firen',
      sheets: ['assets/sprites/sheets/hero_firen_sheet.png'],
      grid: CELL,
      anims: HERO_ANIMS,
      role: 'hero',
      label: 'Firen the Phantom Flame'
    }),
    hero_freeze: Object.freeze({
      key: 'freeze',
      sheets: ['assets/sprites/sheets/hero_freeze_sheet.png'],
      grid: CELL,
      anims: HERO_ANIMS,
      role: 'hero',
      label: 'Freeze the Phantom Frost'
    }),
    hero_john: Object.freeze({
      key: 'john',
      sheets: ['assets/sprites/sheets/hero_john_sheet.png'],
      grid: CELL,
      anims: HERO_ANIMS,
      role: 'hero',
      label: 'John the Phantom Knight'
    }),
    hero_woody: Object.freeze({
      key: 'woody',
      sheets: ['assets/sprites/sheets/hero_woody_sheet.png'],
      grid: CELL,
      anims: HERO_ANIMS,
      role: 'hero',
      label: 'Woody the Phantom Brawler'
    }),
    hero_henry: Object.freeze({
      key: 'henry',
      sheets: ['assets/sprites/sheets/hero_henry_sheet.png'],
      grid: CELL,
      anims: HERO_ANIMS,
      role: 'hero',
      label: 'Henry the Phantom Archer'
    })
  }),

  // Maps GRIMGE gameplay states to sheet animation keys.
  // Gameplay code sets entity.state to the left side; the renderer
  // looks up the right side in the sheet's animMap.
  stateToAnim: Object.freeze({
    idle: 'idle',
    run: 'walk',
    walk: 'walk',
    jump: 'idle',
    fall: 'idle',
    land: 'idle',
    dash: 'run',
    attack1: 'attack',
    attack2: 'attack',
    attack3: 'attack',
    uppercut: 'attack',
    heavyStrike: 'attack',
    dive: 'attack',
    hurt: 'hurt',
    dead: 'dead',
    guard: 'idle'
  }),

  // Pool assignments: which sheet entities replace the dungeon sprite keys.
  // Changing these swaps which characters appear without touching gameplay.
  dungeonPool: Object.freeze({
    enemies: ['enemy_knight', 'enemy_bandit', 'enemy_sorcerer'],
    allies: ['ally_fighter', 'ally_blade'],
    boss: 'boss_firelord',
    primaryEnemy: 'enemy_knight',
    primaryAlly: 'ally_fighter'
  }),

  // Combat archetypes derived from LF2 character specialties.
  // Each archetype modifies base Minion stats and grants a special ability.
  // hpMul/dmgMul/spdMul multiply the base Minion stats at spawn time.
  // specialCd is the cooldown in seconds between special ability uses.
  archetypes: Object.freeze({
    enemy_knight: Object.freeze({ hpMul: 1.4, dmgMul: 1.0, spdMul: 0.85, combatType: 'melee', specialCd: 6, special: 'shield_charge', color: '#78909c', renderHeight: 60 }),
    enemy_bandit: Object.freeze({ hpMul: 0.8, dmgMul: 1.3, spdMul: 1.35, combatType: 'melee', specialCd: 5, special: 'backstab', color: '#9c27b0', renderHeight: 52 }),
    enemy_sorcerer: Object.freeze({ hpMul: 0.7, dmgMul: 1.2, spdMul: 0.9, combatType: 'ranged', specialCd: 7, special: 'arcane_burst', color: '#b388ff', renderHeight: 56 }),
    ally_fighter: Object.freeze({ hpMul: 1.1, dmgMul: 1.1, spdMul: 1.0, combatType: 'melee', specialCd: 4, special: 'combo_strike', color: '#42a5f5', renderHeight: 58 }),
    ally_blade: Object.freeze({ hpMul: 0.9, dmgMul: 1.4, spdMul: 1.15, combatType: 'melee', specialCd: 5, special: 'blade_dash', color: '#66bb6a', renderHeight: 56 }),
    boss_firelord: Object.freeze({ hpMul: 3.0, dmgMul: 1.8, spdMul: 0.8, combatType: 'melee', specialCd: 4, special: 'fire_dash', color: '#ff6d00', renderHeight: 72 })
  }),

  replacementGuide: 'art/authoring/README.md'
});
