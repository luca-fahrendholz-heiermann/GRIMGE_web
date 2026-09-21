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

  replacementGuide: 'art/authoring/README.md'
});
