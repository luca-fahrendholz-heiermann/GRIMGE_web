-- GRIMGE Dawn Guard: Dungeon rescue companion
-- 48x64 transparent sprite with idle frame + animation tag stubs

local spr = Sprite(48, 64, ColorMode.RGB)
spr.filename = app.params["output_ase"]

local cel = spr.cels[1]
local img = cel.image

local function px(x, y, r, g, b, a)
  if x >= 0 and x < 48 and y >= 0 and y < 64 then
    img:drawPixel(x, y, app.pixelColor.rgba(r, g, b, a or 255))
  end
end

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

-- === DAWN GUARD DESIGN ===
-- Warm-armoured rescuable companion with cyan banner and golden accents

-- Banner pole (on right side, behind character)
rect(38, 5, 2, 50, 0xff, 0xe1, 0x8b)   -- golden pole
rect(34, 7, 6, 14, 0x31, 0x54, 0x7b)   -- banner background
rect(35, 8, 4, 11, 0x66, 0xf2, 0xff)   -- banner cyan field
-- Banner emblem (small diamond)
px(36, 12, 0xff, 0xff, 0xff)
px(37, 11, 0xff, 0xff, 0xff)
px(37, 13, 0xff, 0xff, 0xff)
px(38, 12, 0xff, 0xff, 0xff)

-- Helmet / head
rect(16, 6, 16, 6, 0xe7, 0xed, 0xf5)   -- helmet top (bright steel)
rect(14, 10, 20, 4, 0xe7, 0xed, 0xf5)  -- helmet visor brim
rect(15, 7, 4, 5, 0xc0, 0xcc, 0xdd)    -- left wing piece
rect(29, 7, 4, 5, 0xc0, 0xcc, 0xdd)    -- right wing piece
-- Helmet crest
rect(22, 3, 4, 4, 0xff, 0xe1, 0x8b)    -- golden crest

-- Face
rect(17, 10, 14, 10, 0xcf, 0x8d, 0x64) -- face/skin
rect(16, 14, 16, 4, 0xb8, 0x7a, 0x55)  -- lower face shadow

-- Eyes (warm cyan glow)
rect(19, 12, 3, 2, 0x66, 0xf2, 0xff)   -- left eye
rect(27, 12, 3, 2, 0x66, 0xf2, 0xff)   -- right eye
px(20, 12, 0xcc, 0xff, 0xff)            -- left highlight
px(28, 12, 0xcc, 0xff, 0xff)            -- right highlight

-- Mouth/chin
rect(21, 17, 6, 2, 0xa6, 0x6b, 0x4a)

-- Shoulder armour (bright steel with gold trim)
rect(7, 20, 11, 7, 0x9d, 0xb2, 0xc7)   -- left shoulder plate
rect(30, 20, 11, 7, 0x9d, 0xb2, 0xc7)  -- right shoulder plate
rect(8, 20, 9, 2, 0xe7, 0xed, 0xf5)    -- left highlight
rect(31, 20, 9, 2, 0xe7, 0xed, 0xf5)   -- right highlight
-- Gold trim
rect(7, 25, 11, 2, 0xa6, 0x6b, 0x20)
rect(30, 25, 11, 2, 0xa6, 0x6b, 0x20)

-- Torso / chest plate (deep navy blue armour)
rect(13, 22, 22, 20, 0x18, 0x28, 0x48) -- main body
rect(15, 24, 18, 16, 0x31, 0x54, 0x7b) -- chest plate
-- Center emblem (cyan diamond)
rect(22, 28, 4, 6, 0x66, 0xf2, 0xff)   -- emblem cyan
rect(23, 27, 2, 1, 0xcc, 0xff, 0xff)   -- emblem top glow
rect(23, 34, 2, 1, 0xcc, 0xff, 0xff)   -- emblem bottom glow

-- Belt
rect(13, 40, 22, 3, 0xa6, 0x6b, 0x20)  -- golden belt
rect(22, 40, 4, 3, 0xff, 0xe1, 0x8b)   -- belt buckle highlight

-- Arms (armored gauntlets)
rect(7, 27, 6, 14, 0x9d, 0xb2, 0xc7)   -- left arm
rect(35, 27, 6, 14, 0x18, 0x28, 0x48)  -- right arm (holds banner)
-- Gauntlet details
rect(7, 34, 6, 3, 0x66, 0xf2, 0xff)    -- left gauntlet glow
rect(35, 34, 6, 3, 0x31, 0x54, 0x7b)   -- right gauntlet detail

-- Hands
rect(8, 38, 4, 3, 0xcf, 0x8d, 0x64)    -- left hand
rect(36, 38, 4, 3, 0xcf, 0x8d, 0x64)   -- right hand (gripping pole)

-- Left hand holds a shield
rect(4, 28, 8, 14, 0x31, 0x54, 0x7b)   -- shield body
rect(5, 29, 6, 12, 0x9d, 0xb2, 0xc7)   -- shield face
rect(7, 32, 2, 6, 0x66, 0xf2, 0xff)    -- shield emblem stripe
rect(4, 28, 8, 1, 0xa6, 0x6b, 0x20)    -- shield gold rim top
rect(4, 41, 8, 1, 0xa6, 0x6b, 0x20)    -- shield gold rim bottom

-- Legs / greaves
rect(16, 43, 7, 14, 0x10, 0x18, 0x27)  -- left leg
rect(25, 43, 7, 14, 0x10, 0x18, 0x27)  -- right leg
-- Knee armour
rect(17, 46, 5, 3, 0x9d, 0xb2, 0xc7)   -- left knee plate
rect(26, 46, 5, 3, 0x9d, 0xb2, 0xc7)   -- right knee plate

-- Boots (steel)
rect(14, 57, 11, 5, 0x18, 0x28, 0x48)  -- left boot
rect(25, 57, 11, 5, 0x18, 0x28, 0x48)  -- right boot
-- Boot soles
rect(14, 60, 11, 2, 0x10, 0x14, 0x22)
rect(25, 60, 11, 2, 0x10, 0x14, 0x22)

-- Rename first frame layer
spr.layers[1].name = "Character"

-- Add animation frame stubs
for i = 1, 4 do spr:newEmptyFrame() end   -- Walk
for i = 1, 2 do spr:newEmptyFrame() end   -- Attack
spr:newEmptyFrame()                         -- Hurt
spr:newEmptyFrame()                         -- Death

-- Copy idle to all frames as placeholder
local idleImg = spr.cels[1].image:clone()
for i = 2, #spr.frames do
  spr:newCel(spr.layers[1], spr.frames[i], idleImg:clone(), Point(0, 0))
end

-- Create animation tags
local function makeTag(name, from, to, aniDir)
  local tag = spr:newTag(from, to)
  tag.name = name
  if aniDir then tag.aniDir = aniDir end
end

makeTag("Idle", 1, 1)
makeTag("Walk", 2, 5, AniDir.PING_PONG)
makeTag("Attack", 6, 7)
makeTag("Hurt", 8, 8)
makeTag("Death", 9, 9)

for i = 1, #spr.frames do
  spr.frames[i].duration = 0.15
end

-- Save .aseprite source
spr:saveAs(app.params["output_ase"])

-- Export idle frame only as single PNG
-- Use Aseprite CLI export for single frame
app.command.SaveFileCopyAs {
  ui = false,
  filename = app.params["output_png"],
  fromFrame = 1,
  toFrame = 1
}

print("Dawn Guard created successfully")
