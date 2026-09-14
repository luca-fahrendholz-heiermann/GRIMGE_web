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
- Tower/Castle HP is shown above a damaged objective. Player melee and Fireball both use the ordinary combat/spell path against Towers; Fireball's structural explosion radius now matches its valid objective contact volume.
- Minions retain target locks, light separation, lane preferences, and objective progression without player lane locking. When pushing a structure they converge tightly enough for both melee and ranged attacks to connect, then continue to the unlocked Castle.
- Match lifecycle is separate from objective phase: `Menu → Running → Ending (0.9s) → Results`; `Rematch` reconstructs match state without reload; `Return to Hub` reaches the minimal menu.
- `PLAY` and `REMATCH` use immediate pointer input with an accessible click fallback. A duplicate browser click cannot reset an already running match.
- Results display victory/defeat, final match time, objective state, Wizard kills, Rematch, and Hub controls. Enter rematches; Escape returns to Hub.
- Rune drawing is constrained to the current three-card `runeHand`. Tapping the mobile arcane circle opens Arcane Focus; a second tap locks in immediately, or a completed stroke auto-locks after two seconds. Non-hand or unrecognised gestures leave the mode active but clear the old drawing through a DPR-safe physical-canvas clear; Escape cancels.
- Rune deck foundation: exactly three physical rune cards are drawn into `runeHand`. A correctly drawn hand card moves immediately to the deck back and a replacement is drawn. Recognition is restricted to those current hand cards.
- Correctly drawn runes create `slottedSpells` rather than an unlimited prepared list. A compatible second rune upgrades the last slot into a combination; the selected slot glows in front of the Wizard while the remaining slots trail behind. `SWAP` rotates the selected slot and `CAST` fires only that slot. Grimoire fires every slot when a combination is present; otherwise it fires one random slot, then clears the remaining slots. The Grimoire explanation now belongs to the player portrait rather than the Grimoire action.
- Center rune cards, Grimoire, and Arcane Circle are now code-rendered controls instead of card/book/circle screenshot assets. CSS blocks iOS/WebKit image callouts and drag behavior on UI controls.
- Mobile viewport is locked to the game surface (`maximum-scale=1`, `user-scalable=no`, `touch-action:none`); double-click, gesture-start, drag, and context-menu gestures are prevented by the game input layer.
- The runtime viewport uses a single 16:9 container bounded by dynamic viewport height (`dvh` where supported). The HUD now renders as one logical 1024×576 layer and is scaled from actual Canvas width on viewport/visual-viewport resize, keeping scene and UI proportions intact across browser sizes/orientations.
- Mobile attack, jump, dash, and cast use `pointerdown` rather than delayed click input. A top-right fullscreen button requests browser fullscreen and landscape orientation where the browser permits it.
- Aura Shock is the `AQUA + FULGUR` rune combination: 20 mana, 3.5s cooldown, short radial damage and true x/z knockback. It has no standalone hotkey or mobile button and does not damage objectives.
- Arcane Shield is available through `F` or the mobile `SHIELD` button: 30 mana, 8s cooldown, 90 absorption for up to 5 seconds; it breaks cleanly and is reset on respawn.
- The mobile action cluster is triangular: Jump at the upper point, Shield lower-left, Cast lower-right, Draw in the centre, and a compact `SWAP` action beneath it. No standalone Shock/Dash/Attack action buttons remain there.

## Automated Validation Complete

- `npm test` passes: 14 rune/spell checks, 6 world checks, 69 runtime checks (89 total).
- Runtime coverage includes upper battlement spawn/access/fall, depth/dash/jump, melee recovery, death/respawn, rune-hand cycling, selected-card validation, 2-second auto-lock, selected-slot casting, slot swapping, Grimoire combination/random resolution, Aura Shock, Arcane Shield, depth-aware spells, Tower target filtering, and an input-driven siege chain (player melee/Fireball → Tower → Castle → final Wizard → Results → Rematch/Hub).
- All browser modules pass `node --check`; local HTTP checks return 200 for `/` and `/src/main.js`.

## Requires Manual Gameplay / Visual Validation

- Exact visual registration and possible foreground occlusion of upper-battlement actors against the single flattened arena background.
- Subjective arcade feel: diagonal/joystick movement, jump/dash, hit impact, Tower pressure, minion crowd readability, and full-depth comfort.
- Full manual siege match flow and touch UI confirmation still require an attached browser.
- The exact visual placement/readability of floating spell slots, the triangular mobile controls, and Grimoire/portrait interactions requires manual device validation.
