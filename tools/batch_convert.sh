#!/bin/bash
# Batch convert all LF2 character sheets with proper transparency + 2x scale
ASE="C:/Program Files/Aseprite/Aseprite.exe"
SCRIPT="C:/Users/fahrendholzheiermann/.gemini/antigravity/scratch/grimge_prototype/tools/convert_lf2_v2.lua"
SRC="C:/Dev/LittleFighter/sprite/sys"
DST="C:/Users/fahrendholzheiermann/.gemini/antigravity/scratch/grimge_prototype/public/assets/sprites/sheets"

convert() {
  local lf2name=$1 grimge=$2 hue=$3 sat=$4 light=$5
  echo "Converting $lf2name -> $grimge (hue=$hue sat=$sat light=$light)"
  "$ASE" -b \
    --script-param "input=$SRC/${lf2name}.bmp" \
    --script-param "output=$DST/${grimge}.png" \
    --script-param "hue=$hue" \
    --script-param "sat=$sat" \
    --script-param "light=$light" \
    --script-param "scale=2" \
    --script "$SCRIPT"
}

# enemy_knight <- knight (hue=160, sat=-10, light=-15)
convert knight_0 enemy_knight_0 160 -10 -15
convert knight_1 enemy_knight_1 160 -10 -15
convert knight_2 enemy_knight_2 160 -10 -15

# enemy_bandit <- bandit (hue=200, sat=-5, light=-10)
convert bandit_0 enemy_bandit_0 200 -5 -10
convert bandit_1 enemy_bandit_1 200 -5 -10

# enemy_sorcerer <- sorcerer (hue=270, sat=5, light=-10)
convert sorcerer_0 enemy_sorcerer_0 270 5 -10
convert sorcerer_1 enemy_sorcerer_1 270 5 -10

# ally_fighter <- davis (hue=30, sat=10, light=5)
convert davis_0 ally_fighter_0 30 10 5
convert davis_1 ally_fighter_1 30 10 5
convert davis_2 ally_fighter_2 30 10 5

# ally_blade <- deep (hue=-60, sat=15, light=5)
convert deep_0 ally_blade_0 -60 15 5
convert deep_1 ally_blade_1 -60 15 5
convert deep_2 ally_blade_2 -60 15 5

# boss_firelord <- firen (hue=40, sat=15, light=-8)
convert firen_0 boss_firelord_0 40 15 -8
convert firen_1 boss_firelord_1 40 15 -8
convert firen_2 boss_firelord_2 40 15 -8

echo "Done! All 16 sheets converted."
