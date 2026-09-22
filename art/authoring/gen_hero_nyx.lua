-- Nyx the Phantom — GRIMGE Hero Sprite Sheet Generator
-- Creates a 1600x1120 sprite sheet (10 cols x 7 rows of 160x160 cells)
-- Run: aseprite -b --script gen_hero_nyx.lua

local W, H = 1600, 1120
local CELL = 160

local spr = Sprite(W, H, ColorMode.RGB)

-- Convert background to normal layer for transparency
pcall(function() app.command.LayerFromBackground() end)

local layer = spr.layers[1]
layer.name = "Nyx"
app.activeFrame = spr.frames[1]
app.activeLayer = layer

local cel = app.activeCel
if not cel then
  cel = spr:newCel(layer, spr.frames[1])
end
local img = cel.image
img:clear()

-- Color palette
local function rgb(r, g, b) return app.pixelColor.rgba(r, g, b, 255) end

local HOOD     = rgb(35, 22, 58)
local CLOAK    = rgb(60, 38, 95)
local CLOAK_LT = rgb(90, 60, 140)
local ARMOR_DK = rgb(32, 32, 50)
local ARMOR    = rgb(52, 52, 78)
local SKIN     = rgb(198, 168, 138)
local SKIN_SH  = rgb(162, 132, 108)
local EYE      = rgb(0, 240, 255)
local EYE_DIM  = rgb(0, 160, 190)
local HAIR     = rgb(188, 178, 208)
local STEEL    = rgb(158, 168, 185)
local EDGE     = rgb(0, 225, 255)
local HILT     = rgb(78, 52, 112)
local BOOT     = rgb(38, 28, 48)
local BELT     = rgb(68, 48, 105)
local GLOW     = rgb(60, 220, 240)

local function rect(x, y, w, h, c)
  local x0 = math.max(0, math.floor(x))
  local y0 = math.max(0, math.floor(y))
  local x1 = math.min(W - 1, math.floor(x + w - 1))
  local y1 = math.min(H - 1, math.floor(y + h - 1))
  for py = y0, y1 do
    for px = x0, x1 do
      img:drawPixel(px, py, c)
    end
  end
end

-- Draw Nyx at grid position (col, row) with pose offsets
-- Character is ~62px tall, centered in 160x160 cell
local function nyx(col, row, p)
  p = p or {}
  local ox = col * CELL + 80
  local oy = row * CELL + 140

  local hx  = p.hx  or 0
  local hy  = p.hy  or 0
  local bx  = p.bx  or 0
  local by  = p.by  or 0
  local lax = p.lax or 0
  local lay = p.lay or 0
  local rax = p.rax or 0
  local ray = p.ray or 0
  local llx = p.llx or 0
  local lly = p.lly or 0
  local rlx = p.rlx or 0
  local rly = p.rly or 0
  local cs  = p.cs  or 0
  local ec  = p.ec  or EYE

  -- Back cloak
  local cw = 32 + cs * 2
  rect(ox - cw/2 + bx, oy - 34 + by, cw, 30, CLOAK)
  rect(ox - cw/2 - 2 + bx, oy - 8 + by, cw + 4, 6, HOOD)

  -- Legs
  rect(ox - 7 + llx, oy - 22 + lly, 7, 18, ARMOR_DK)
  rect(ox - 8 + llx, oy - 5  + lly, 9, 5, BOOT)
  rect(ox + 1 + rlx, oy - 22 + rly, 7, 18, ARMOR_DK)
  rect(ox + 0 + rlx, oy - 5  + rly, 9, 5, BOOT)

  -- Torso
  rect(ox - 11 + bx, oy - 44 + by, 22, 22, ARMOR_DK)
  rect(ox - 9  + bx, oy - 42 + by, 18, 18, ARMOR)
  rect(ox - 10 + bx, oy - 23 + by, 20, 3, BELT)
  -- Chest emblem (glowing rune)
  rect(ox - 3  + bx, oy - 38 + by, 6, 6, CLOAK_LT)
  rect(ox - 1  + bx, oy - 36 + by, 2, 2, GLOW)

  -- Left arm
  rect(ox - 18 + bx + lax, oy - 42 + by + lay, 8, 22, CLOAK)
  rect(ox - 17 + bx + lax, oy - 22 + by + lay, 6, 5, SKIN)

  -- Right arm
  rect(ox + 10 + bx + rax, oy - 42 + by + ray, 8, 22, CLOAK)
  rect(ox + 11 + bx + rax, oy - 22 + by + ray, 6, 5, SKIN)

  -- Daggers
  if not p.noBlade then
    local ldx = ox - 19 + bx + lax
    local ldy = oy - 18 + by + lay
    local rdx = ox + 13 + bx + rax
    local rdy = oy - 18 + by + ray

    if p.bladeUp then
      -- Left dagger pointing up
      rect(ldx + 2, ldy - 16, 3, 16, STEEL)
      rect(ldx + 1, ldy - 16, 1, 16, EDGE)
      rect(ldx,     ldy - 1,  6, 3, HILT)
      -- Right dagger pointing up
      rect(rdx + 1, rdy - 16, 3, 16, STEEL)
      rect(rdx + 4, rdy - 16, 1, 16, EDGE)
      rect(rdx,     rdy - 1,  6, 3, HILT)
    elseif p.bladeFwd then
      -- Left dagger pointing forward (left)
      rect(ldx - 12, ldy + 1, 16, 3, STEEL)
      rect(ldx - 12, ldy,     16, 1, EDGE)
      rect(ldx + 2,  ldy - 1, 3, 6, HILT)
      -- Right dagger pointing forward (right)
      rect(rdx + 2, rdy + 1, 16, 3, STEEL)
      rect(rdx + 2, rdy + 4, 16, 1, EDGE)
      rect(rdx - 1, rdy - 1, 3, 6, HILT)
    else
      -- Daggers pointing down (default)
      rect(ldx + 2, ldy,     3, 16, STEEL)
      rect(ldx + 1, ldy,     1, 16, EDGE)
      rect(ldx,     ldy - 2, 6, 3, HILT)
      rect(rdx + 1, rdy,     3, 16, STEEL)
      rect(rdx + 4, rdy,     1, 16, EDGE)
      rect(rdx,     rdy - 2, 6, 3, HILT)
    end
  end

  -- Head
  local headX = ox - 10 + hx
  local headY = oy - 60 + hy
  -- Hood shape
  rect(headX + 5, headY - 5, 10, 6, HOOD)
  rect(headX + 7, headY - 8, 6, 4, HOOD)
  rect(headX - 1, headY + 1, 22, 14, HOOD)
  rect(headX + 1, headY - 1, 18, 4, HOOD)
  -- Face
  rect(headX + 3, headY + 5, 14, 8, SKIN)
  rect(headX + 3, headY + 11, 14, 3, SKIN_SH)
  -- Eyes (glowing)
  rect(headX + 5, headY + 7, 3, 3, ec)
  rect(headX + 12, headY + 7, 3, 3, ec)
  -- Eye glow highlight
  rect(headX + 6, headY + 7, 1, 1, rgb(200, 255, 255))
  rect(headX + 13, headY + 7, 1, 1, rgb(200, 255, 255))
  -- Hair strands flowing from hood
  rect(headX - 1, headY + 4, 3, 12, HAIR)
  rect(headX + 18, headY + 4, 3, 12, HAIR)
  -- Hood shadow under brim
  rect(headX + 2, headY + 3, 16, 2, rgb(25, 15, 40))
end

-- ============================================================
-- FRAME LAYOUT
-- Row 0: idle(3) + walk(4) + jump(2) + fall(1)
-- Row 1: run(3) + attack(4) + dash(2) + guard(1)
-- Row 2: uppercut(2) + dive(2)
-- Row 3: hurt(2) + [skip 1] + dead(2)
-- ============================================================

-- IDLE (0,0)-(2,0): subtle breathing sway
nyx(0, 0, {})
nyx(1, 0, { by=-2, hy=-2, lay=-1, ray=-1 })
nyx(2, 0, { by=1, hy=1 })

-- WALK (3,0)-(6,0): stride cycle
nyx(3, 0, { llx=-3, lly=-3, rlx=3, bx=1, hx=1, rax=2 })
nyx(4, 0, { llx=4, rlx=-4, rly=-3, bx=-1, lax=-2 })
nyx(5, 0, { llx=-4, lly=-2, rlx=4, bx=1, hx=1, rax=2 })
nyx(6, 0, { llx=3, lly=-3, rlx=-3, bx=-1, lax=-2 })

-- JUMP (7,0)-(8,0): airborne stretched
nyx(7, 0, { by=-8, hy=-10, lly=5, rly=5, lay=-8, ray=-8, bladeUp=true })
nyx(8, 0, { by=-6, hy=-8, lly=7, rly=4, rlx=3, lay=-4, ray=-4 })

-- FALL (9,0): descending
nyx(9, 0, { by=-2, hy=-3, lly=4, rly=6, rlx=3, lay=3, ray=3 })

-- RUN (0,1)-(2,1): aggressive forward lean
nyx(0, 1, { llx=-7, lly=-5, rlx=7, bx=5, hx=5, hy=-3, rax=6, lay=3 })
nyx(1, 1, { llx=7, rlx=-7, rly=-5, bx=4, hx=4, by=-3, lax=-5, ray=3 })
nyx(2, 1, { llx=-6, rlx=6, lly=-4, bx=5, hx=5, hy=-2, rax=5, lay=2 })

-- ATTACK (3,1)-(6,1): dual dagger slash
nyx(3, 1, { rax=3, ray=-8, bx=-2, bladeUp=true, lay=3 })
nyx(4, 1, { rax=10, ray=-12, bx=3, bladeFwd=true, hx=3, hy=-1 })
nyx(5, 1, { rax=14, ray=3, lax=-6, lay=6, bladeFwd=true, bx=5, hx=4, cs=4 })
nyx(6, 1, { rax=7, ray=5, bx=2, cs=2, lax=-2, lay=2 })

-- DASH (7,1)-(8,1): backdash blur
nyx(7, 1, { bx=-6, by=3, hx=-5, hy=2, llx=5, rlx=5, cs=6, lay=4, ray=4 })
nyx(8, 1, { bx=-8, by=5, hx=-7, hy=3, llx=7, rlx=7, cs=8, lay=6, ray=6 })

-- GUARD (9,1): defensive dagger cross
nyx(9, 1, { by=3, hy=2, lax=4, lay=-10, rax=-6, ray=-10, bladeFwd=true, llx=-3, rlx=3, cs=2 })

-- UPPERCUT (0,2)-(1,2): upward dual strike
nyx(0, 2, { by=-6, hy=-6, ray=-14, rax=5, lay=-10, lax=-3, bladeUp=true })
nyx(1, 2, { by=-12, hy=-12, ray=-18, rax=7, lay=-14, lax=-4, lly=5, bladeUp=true })

-- DIVE (2,2)-(3,2): downward plunge
nyx(2, 2, { by=6, hy=4, lay=10, ray=10, rax=6, lly=-6 })
nyx(3, 2, { by=12, hy=9, lay=14, ray=14, rax=8, lly=-8, rly=-6 })

-- HURT (0,3)-(1,3): recoil with dimmed eyes
nyx(0, 3, { bx=-5, by=4, hx=-4, hy=-2, lax=-6, rax=-4, ec=EYE_DIM })
nyx(1, 3, { bx=-8, by=6, hx=-7, hy=-1, lax=-8, rax=-6, llx=4, rlx=4, ec=EYE_DIM })

-- DEAD (3,3)-(4,3): collapsed on ground
nyx(3, 3, { bx=-5, by=12, hx=-7, hy=10, lax=-10, rax=6, llx=-4, rlx=6, cs=5, ec=EYE_DIM })
nyx(4, 3, { bx=-6, by=16, hx=-8, hy=14, lax=-12, rax=8, llx=-5, rlx=7, cs=7, ec=EYE_DIM })

-- Save files
local base = app.fs.joinPath(app.fs.filePath(spr.filename), "..")
local sheetDir = "C:/Users/fahrendholzheiermann/.gemini/antigravity/scratch/grimge_prototype/public/assets/sprites/sheets"
local artDir = "C:/Users/fahrendholzheiermann/.gemini/antigravity/scratch/grimge_prototype/art/authoring"

spr:saveAs(artDir .. "/hero_nyx.aseprite")
spr:saveCopyAs(sheetDir .. "/hero_nyx_sheet.png")

print("Nyx the Phantom sprite sheet generated successfully!")
print("Sheet: " .. sheetDir .. "/hero_nyx_sheet.png")
print("Source: " .. artDir .. "/hero_nyx.aseprite")

app.command.CloseFile()
