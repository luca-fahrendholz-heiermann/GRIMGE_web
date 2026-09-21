-- GRIMGE Void Raider: Dungeon hostile scout / room enemy
-- 48x64 transparent sprite with idle frame + animation tag stubs

local spr = Sprite(48, 64, ColorMode.RGB)
spr.filename = app.params["output_ase"]

-- Set up transparent background
local cel = spr.cels[1]
local img = cel.image

-- Helper: set pixel with bounds check
local function px(x, y, r, g, b, a)
  if x >= 0 and x < 48 and y >= 0 and y < 64 then
    img:drawPixel(x, y, app.pixelColor.rgba(r, g, b, a or 255))
  end
end

-- Helper: filled rect
local function rect(x0, y0, w, h, r, g, b, a)
  for dy = 0, h - 1 do
    for dx = 0, w - 1 do
      px(x0 + dx, y0 + dy, r, g, b, a or 255)
    end
  end
end

-- Clear to transparent
for y = 0, 63 do
  for x = 0, 47 do
    img:drawPixel(x, y, app.pixelColor.rgba(0, 0, 0, 0))
  end
end

-- === VOID RAIDER DESIGN ===
-- Dark hooded rift-scout with violet energy shard

-- Hood / head shape (dark purple-black)
rect(15, 6, 18, 5, 0x1a, 0x14, 0x2e)   -- hood peak
rect(13, 9, 22, 4, 0x1a, 0x14, 0x2e)   -- hood brim
rect(12, 11, 24, 6, 0x24, 0x20, 0x3b)  -- hood sides

-- Face area (tanned skin in shadow)
rect(17, 12, 14, 8, 0x6e, 0x4a, 0x35)  -- face
rect(16, 14, 16, 4, 0x5a, 0x3c, 0x2a)  -- shadow across face

-- Glowing cyan eyes
rect(19, 14, 3, 2, 0x57, 0xee, 0xff)   -- left eye
rect(27, 14, 3, 2, 0x57, 0xee, 0xff)   -- right eye
-- Eye glow highlight
px(20, 14, 0xaa, 0xff, 0xff)
px(28, 14, 0xaa, 0xff, 0xff)

-- Hood drape / chin shadow
rect(16, 18, 16, 3, 0x11, 0x15, 0x25)

-- Shoulders / pauldrons (dark steel)
rect(8, 21, 10, 6, 0x3a, 0x3a, 0x4e)   -- left shoulder
rect(30, 21, 10, 6, 0x3a, 0x3a, 0x4e)  -- right shoulder
-- Shoulder highlights
rect(9, 21, 8, 2, 0x55, 0x55, 0x6e)
rect(31, 21, 8, 2, 0x55, 0x55, 0x6e)

-- Torso / dark armour
rect(14, 21, 20, 20, 0x18, 0x14, 0x28) -- main body dark
rect(16, 23, 16, 16, 0x24, 0x20, 0x3b) -- chest plate
-- Center rift glyph (violet energy)
rect(22, 27, 4, 8, 0x9d, 0x5c, 0xff)   -- energy shard
rect(23, 26, 2, 1, 0xd9, 0xc4, 0xff)   -- shard tip glow
rect(23, 35, 2, 1, 0xd9, 0xc4, 0xff)   -- shard base glow

-- Belt
rect(14, 39, 20, 3, 0x44, 0x3a, 0x2a)  -- leather belt
rect(22, 39, 4, 3, 0x9d, 0x5c, 0xff)   -- belt buckle (void gem)

-- Arms (dark cloth wraps)
rect(8, 27, 6, 14, 0x11, 0x15, 0x25)   -- left arm
rect(34, 27, 6, 14, 0x11, 0x15, 0x25)  -- right arm
-- Forearm wraps
rect(8, 34, 6, 4, 0x56, 0x31, 0x6f)    -- left wrap
rect(34, 34, 6, 4, 0x56, 0x31, 0x6f)   -- right wrap

-- Hands (skin)
rect(9, 38, 4, 3, 0x6e, 0x4a, 0x35)    -- left hand
rect(35, 38, 4, 3, 0x6e, 0x4a, 0x35)   -- right hand

-- Right hand holds a void dagger
rect(38, 30, 3, 12, 0x69, 0x75, 0x8e)  -- blade
rect(39, 29, 1, 1, 0x99, 0xaa, 0xcc)   -- blade tip
rect(37, 38, 5, 3, 0xd9, 0xc4, 0xff)   -- crossguard glow

-- Legs / greaves
rect(16, 42, 7, 14, 0x15, 0x1b, 0x2c)  -- left leg
rect(25, 42, 7, 14, 0x15, 0x1b, 0x2c)  -- right leg
-- Knee guards
rect(17, 45, 5, 3, 0x3a, 0x3a, 0x4e)   -- left knee
rect(26, 45, 5, 3, 0x3a, 0x3a, 0x4e)   -- right knee

-- Boots (dark metal)
rect(14, 56, 11, 6, 0x11, 0x11, 0x22)  -- left boot
rect(25, 56, 11, 6, 0x11, 0x11, 0x22)  -- right boot
-- Boot soles
rect(14, 60, 11, 2, 0x08, 0x08, 0x14)
rect(25, 60, 11, 2, 0x08, 0x08, 0x14)

-- Cape / cloak hints on sides
rect(10, 24, 4, 18, 0x56, 0x31, 0x6f)  -- left cape
rect(34, 24, 4, 18, 0x56, 0x31, 0x6f)  -- right cape
-- Cape edges darker
rect(10, 24, 1, 18, 0x24, 0x20, 0x3b)
rect(37, 24, 1, 18, 0x24, 0x20, 0x3b)

-- Void particles (small glow dots)
px(6, 18, 0x9d, 0x5c, 0xff, 180)
px(42, 16, 0x9d, 0x5c, 0xff, 160)
px(4, 30, 0xd9, 0xc4, 0xff, 120)
px(44, 28, 0xd9, 0xc4, 0xff, 140)
px(7, 44, 0x9d, 0x5c, 0xff, 100)
px(41, 42, 0x9d, 0x5c, 0xff, 110)

-- Rename first frame layer
spr.layers[1].name = "Character"

-- Add animation frames stubs (duplicate idle as placeholders)
-- Frame 1 = Idle (already drawn)
-- Add 4 more frames for Walk cycle stub
for i = 1, 4 do
  spr:newEmptyFrame()
end
-- Add 2 frames for Attack stub
for i = 1, 2 do
  spr:newEmptyFrame()
end
-- Add 1 frame for Hurt stub
spr:newEmptyFrame()
-- Add 1 frame for Death stub
spr:newEmptyFrame()

-- Copy idle content to all frames as placeholder
local idleImg = spr.cels[1].image:clone()
for i = 2, #spr.frames do
  spr:newCel(spr.layers[1], spr.frames[i], idleImg:clone(), Point(0, 0))
end

-- Create animation tags
local function makeTag(name, from, to, aniDir)
  local tag = spr:newTag(from, to)
  tag.name = name
  if aniDir then tag.aniDir = aniDir end
  return tag
end

makeTag("Idle", 1, 1)
makeTag("Walk", 2, 5, AniDir.PING_PONG)
makeTag("Attack", 6, 7)
makeTag("Hurt", 8, 8)
makeTag("Death", 9, 9)

-- Set frame durations
for i = 1, #spr.frames do
  spr.frames[i].duration = 0.15
end

-- Save .aseprite source
spr:saveAs(app.params["output_ase"])

-- Export first frame (idle) as PNG for runtime
app.command.ExportSpriteSheet {
  ui = false,
  type = SpriteSheetType.NONE,
  textureFilename = app.params["output_png"],
  fromFrame = 1,
  toFrame = 1
}

-- Also do a simpler save of just the first frame
spr:saveCopyAs(app.params["output_png"])

print("Void Raider created successfully")
