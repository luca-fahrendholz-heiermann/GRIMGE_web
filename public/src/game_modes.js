// GRIMGE Prototype — mode contracts.
//
// These are intentionally small vertical-slice rules, not a second combat
// engine. Every mode runs through the same Player, EnemyChampion, Minion,
// spell, movement, input and Results systems as Castle Siege.

export const GAME_MODES = Object.freeze({
  siege: Object.freeze({
    id: 'siege', label: 'CASTLE SIEGE', objective: 'DESTROY ENEMY TOWER',
    objectives: true, autoWaves: true, respawn: 'castle', enemyBehavior: 'siege', world: 'siege', progression: 'profile'
  }),
  invasion: Object.freeze({
    id: 'invasion', label: 'INVASION', objective: 'DEFEND THE CASTLE — WAVE 1/6',
    // A one-sided defense: the player's blue castle lives on the left edge,
    // two nearby defense towers protect it, and monsters enter from open land.
    objectives: true, autoWaves: false, respawn: 'castle', enemyBehavior: 'disabled', world: 'invasion', progression: 'profile', waveGoal: 6
  }),
  dungeon: Object.freeze({
    id: 'dungeon', label: 'DUNGEON EXPEDITION', objective: 'CLEAR THE RUINS',
    objectives: false, autoWaves: false, respawn: 'none', enemyBehavior: 'disabled', world: 'dungeon', progression: 'run'
  }),
  arena: Object.freeze({
    id: 'arena', label: 'ARENA DUEL', objective: 'DEFEAT THE ARENA CHAMPION',
    objectives: false, autoWaves: false, respawn: 'none', enemyBehavior: 'duel', world: 'arena', progression: 'arenaCollect'
  }),
  training: Object.freeze({
    id: 'training', label: 'TRAINING', objective: 'PRACTICE — NO REWARDS',
    objectives: false, autoWaves: false, respawn: 'unlimited', enemyBehavior: 'duel', world: 'arena', progression: 'profile'
  })
});

export function getGameMode(id) {
  return GAME_MODES[id] ?? GAME_MODES.siege;
}
