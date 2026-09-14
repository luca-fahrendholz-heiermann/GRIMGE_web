# GRIMGE Web Prototype Status

## Implemented

- Browser Canvas prototype with fixed 1024×576 simulation and DPR-aware backing buffers.
- 2.5D state is `x`, continuous `z`, `surfaceHeight`, and independent `elevation`; render `y` is projected only.
- Main arena depth is z=.06–.94. Minion preferences use broad z=.20/.52/.84 lanes; the player remains unrestricted across the ground plane.
- Castle gameplay is split intentionally: lower Castle gate/objective cores at ground height, plus upper battlement surfaces for Wizard spawn/combat.
  - Blue upper battlement: x=94–204, z=.30–.68, base height 145; access x=204–292.
  - Red upper battlement: x=820–930, z=.30–.68, base height 145; access x=732–820.
  - Spawns: blue `(146,.48)`, red `(878,.48)`.
  - Leaving an upper surface preserves height and falls rather than snapping.
- Objective flow is authoritative: Tower → Castle → final Wizard. Castles are protected until their Tower falls, have permanent HP, and disable their team's future respawns once destroyed.
- Towers target only hostile mobile combatants (Wizards and minions), never Towers or Castles. A destroyed Tower neither targets nor fires.
- Minions retain target locks, light separation, lane preferences, and objective progression without player lane locking.
- Match lifecycle is separate from objective phase: `Menu → Running → Ending (0.9s) → Results`; `Rematch` reconstructs match state without reload; `Return to Hub` reaches the minimal menu.
- Results display victory/defeat, final match time, objective state, Wizard kills, Rematch, and Hub controls. Enter rematches; Escape returns to Hub.
- Rune drawing has no fixed timeout. Tapping the mobile arcane circle opens persistent Arcane Focus; the circle may be released before drawing. Unrecognized strokes keep the mode open, recognition closes it immediately, and a second circle tap (or Escape) cancels. Simultaneous left-thumb joystick input cannot corrupt the rune touch.
- Mobile attack, jump, dash, and cast use `pointerdown` rather than delayed click input. A top-right fullscreen button requests browser fullscreen and landscape orientation where the browser permits it.

## Automated Validation Complete

- `npm test` passes: 13 rune/spell checks, 6 world checks, 53 runtime checks.
- Runtime coverage includes upper battlement spawn/access/fall, depth/dash/jump, melee recovery, death/respawn, depth-aware spells, Tower target filtering, objectives, ending/results, Rematch, and Hub return.
- All browser modules pass `node --check`; local HTTP checks return 200 for `/` and `/src/main.js`.

## Requires Manual Gameplay / Visual Validation

- Exact visual registration and possible foreground occlusion of upper-battlement actors against the single flattened arena background.
- Subjective arcade feel: diagonal/joystick movement, jump/dash, hit impact, Tower pressure, minion crowd readability, and full-depth comfort.
- Full manual siege match flow and touch UI confirmation still require an attached browser.
