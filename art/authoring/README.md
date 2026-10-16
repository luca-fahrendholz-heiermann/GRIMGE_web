# GRIMGE editable pixel-art sources

This folder contains editable, original or properly licensed `.aseprite`
sources. Export their matching runtime PNGs to `public/assets/sprites/` using
the names below. Runtime code resolves the PNG path through
`public/src/art_assets.js`; do not hardcode a different path in gameplay code.

## Static entity sprites (Aseprite exports)

| Runtime key | Editable source | Exported PNG | Required role |
| --- | --- | --- | --- |
| `dungeon_void_raider` | `dungeon_void_raider.aseprite` | `public/assets/sprites/dungeon_void_raider.png` | hostile Dungeon scout / room enemy |
| `dungeon_dawn_guard` | `dungeon_dawn_guard.aseprite` | `public/assets/sprites/dungeon_dawn_guard.png` | rescuable Dungeon ally |

## Animated sprite sheet entities (placeholder art)

These are temporary, hue-shifted LF2-derived sprite sheets stored as
1600x1120 transparent PNGs (2x scaled) in `public/assets/sprites/sheets/`. They are
**dev placeholders** and must be replaced with original GRIMGE art.

| Runtime key | Sheet PNG | Role | LF2 source |
| --- | --- | --- | --- |
| `enemy_knight` | `sheets/enemy_knight_0.png` | Dungeon armored enemy | knight (hue +160) |
| `enemy_bandit` | `sheets/enemy_bandit_0.png` | Dungeon light enemy | bandit (hue +200) |
| `enemy_sorcerer` | `sheets/enemy_sorcerer_0.png` | Dungeon magic enemy | sorcerer (hue +270) |
| `ally_fighter` | `sheets/ally_fighter_0.png` | Dungeon melee ally | davis (hue +30) |
| `ally_blade` | `sheets/ally_blade_0.png` | Dungeon sword ally | deep (hue -60) |
| `boss_firelord` | `sheets/boss_firelord_0.png` | Dungeon end boss | firen (hue +40) |

### How to replace a sheet sprite with your own art

1. Create a sprite sheet PNG with a regular grid (default: 160x160 cells,
   10 columns x 7 rows = 1600x1120). Transparent background.
2. Place animation frames in the grid following this layout:
   - Row 0: idle (cols 0-2), walk (cols 3-6)
   - Row 1: run (cols 0-2), attack (cols 3-6)
   - Row 3: hurt (cols 0-1), death (cols 3-4)
3. Replace the PNG at the same path (e.g. `sheets/enemy_knight_0.png`).
4. If your grid differs from 160x160 or frame positions differ, update the
   entity's `grid` and `anims` in `public/src/art_assets.js`.
5. No gameplay code changes needed — the sprite key and role stay the same.

The `dungeonPool` in `art_assets.js` controls which sheet entities map to
the dungeon sprite keys (`dungeon_void_raider` → `primaryEnemy`,
`dungeon_dawn_guard` → `primaryAlly`).

## Scene backgrounds

| Mode | Background PNG | Description |
| --- | --- | --- |
| Dungeon | `public/assets/scenes/dungeon_bg.png` | Dark cave/ruin path |
| Invasion | `public/assets/scenes/invasion_bg.png` | Fortress/hills defense |
| Arena | `public/assets/scenes/arena_bg.png` | Volcano/ice arena |

Replace any scene PNG at its path. Images larger than 700x400 are used
as full backgrounds; smaller images are treated as legacy UI cards with
the bottom third cropped.

## Export contract

- RGBA/transparent background; do **not** bake a green background into new art.
- Pixel dimensions can change, but all animation frames for one entity must use
  one canvas size and keep the feet on the same bottom baseline.
- Preserve the source file and overwrite only its matching PNG export.
- Use only GRIMGE-original or assets licensed for this project for final art.
  The current LF2-derived placeholders must be replaced before distribution.

## Pixel-art FX and props (original GRIMGE art)

Generated deterministically by `generate_fx_sprites.cjs` (fixed palettes,
cluster shading, 1px outlines). Each runtime PNG is a horizontal strip of
equal frames in `public/assets/sprites/fx/`; the editable Aseprite sources
are in `art/authoring/fx/` (one strip layer — slice by the frame width below).
Re-run `node art/authoring/generate_fx_sprites.cjs` after changing the
generator, or edit the `.aseprite` and export over the PNG.

| Sheet | Frame (w×h) | Frames | Used for |
| --- | --- | --- | --- |
| `fx_flame` | 16×24 | 6 | burning ground, burning hay, burning props |
| `fx_lightning` | 32×128 | 5 | storm strikes into puddles |
| `fx_spark` | 16×16 | 4 | electrified water / mana pools |
| `fx_splash` | 40×24 | 6 | stepping / wading into water |
| `fx_ice` | 32×32 | 5 | freezing (growth) and ice crystals |
| `fx_lava_bubble` | 12×12 | 6 | lava pools (terrain and spells) |
| `fx_smoke` | 32×32 | 6 | doused fire, steam, barrel bursts |
| `prop_crate` | 32×32 | 3 | intact / damaged / charred crate |
| `prop_barrel` | 24×32 | 3 | intact / dented / about-to-burst oil barrel |
| `fx_weather` | 8×8 | 8 | snow, rain, ember, leaf ×2, sand, mana mote ×2 |
| `fx_rubble` | 12×10 | 4 | rubble / splinter variants |

## Training map scenes

Runtime scenes `public/assets/scenes/training/<id>.jpg` (+ `_thumb.jpg`) are
converted from `C:\Dev\GRIMGE\Docs\References\02_levels\scenes\*.png`. Their
painted terrain zones are registered in `public/src/training_maps.js` (image
percentages); press F3 in Training to see the gameplay zone outlines.
