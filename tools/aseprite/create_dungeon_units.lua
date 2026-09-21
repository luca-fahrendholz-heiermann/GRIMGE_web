-- GRIMGE original pixel-art dungeon units.
-- This script authors source .aseprite files and matching transparent PNG
-- exports. It intentionally contains only code-owned shapes/palette data.

-- The launcher passes this explicitly because Windows Aseprite may execute
-- batch scripts from its installation directory rather than the repository.
local projectRoot = app.params["projectRoot"]
if not projectRoot or projectRoot == "" then
  error("Missing required script parameter: projectRoot")
end
local outDir = app.fs.joinPath(projectRoot, "public", "assets", "sprites")
local sourceDir = app.fs.joinPath(projectRoot, "art", "authoring")
print("GRIMGE sprite export root: " .. projectRoot)

local function rgba(hex)
  hex = hex:gsub("#", "")
  return app.pixelColor.rgba(
    tonumber(hex:sub(1, 2), 16),
    tonumber(hex:sub(3, 4), 16),
    tonumber(hex:sub(5, 6), 16), 255)
end

local function rect(image, x, y, width, height, color)
  for py = y, y + height - 1 do
    for px = x, x + width - 1 do
      if px >= 0 and py >= 0 and px < image.width and py < image.height then
        image:drawPixel(px, py, color)
      end
    end
  end
end

local function pixel(image, x, y, color)
  if x >= 0 and y >= 0 and x < image.width and y < image.height then image:drawPixel(x, y, color) end
end

local function save(sprite, name)
  sprite:saveAs(sourceDir .. "/" .. name .. ".aseprite")
  sprite:saveCopyAs(outDir .. "/" .. name .. ".png")
  sprite:close()
end

-- Void Raider: a compact masked dungeon enemy with an original crescent
-- visor, purple mantle and a floating violet shard.
local raider = Sprite(48, 64, ColorMode.RGB)
local ri = raider.cels[1].image
local ink, deep, mantle, violet, glow = rgba("#111525"), rgba("#24203b"), rgba("#56316f"), rgba("#9d5cff"), rgba("#d9c4ff")
local steel, face, eye, boot = rgba("#69758e"), rgba("#b97655"), rgba("#57eeff"), rgba("#151b2c")
-- cape silhouette
rect(ri, 12, 24, 24, 26, deep); rect(ri, 9, 31, 30, 19, deep)
rect(ri, 11, 28, 8, 26, mantle); rect(ri, 29, 28, 8, 26, mantle)
-- hood / head
rect(ri, 15, 10, 18, 17, ink); rect(ri, 17, 8, 14, 4, deep); rect(ri, 14, 13, 20, 12, deep)
rect(ri, 18, 15, 12, 9, face); rect(ri, 17, 21, 14, 5, ink)
rect(ri, 19, 18, 3, 2, eye); rect(ri, 27, 18, 3, 2, eye)
-- asymmetric shoulder plates + body
rect(ri, 10, 27, 11, 8, steel); rect(ri, 28, 27, 11, 8, steel); rect(ri, 17, 27, 14, 20, ink)
rect(ri, 19, 29, 10, 13, deep); rect(ri, 22, 31, 4, 8, violet)
-- arms / blade
rect(ri, 9, 34, 7, 17, ink); rect(ri, 32, 34, 7, 16, ink); rect(ri, 38, 25, 3, 22, steel); rect(ri, 36, 39, 7, 3, glow)
-- boots
rect(ri, 17, 47, 6, 13, boot); rect(ri, 26, 47, 6, 13, boot); rect(ri, 14, 58, 11, 4, ink); rect(ri, 25, 58, 11, 4, ink)
-- orbit shard
pixel(ri, 40, 13, glow); rect(ri, 39, 14, 3, 4, violet); pixel(ri, 40, 18, glow)
save(raider, "enemy_void_raider")

-- Dawn Guard: a rescued ally, deliberately warm/cyan and visually distinct
-- from the void raider. The banner-spear makes the unit readable at minion
-- size without borrowing another game's silhouette.
local guard = Sprite(48, 64, ColorMode.RGB)
local gi = guard.cels[1].image
local gold, goldHi, navy, cloth, cyan = rgba("#a66b20"), rgba("#ffe18b"), rgba("#182848"), rgba("#31547b"), rgba("#66f2ff")
local skin, hair, dark, silver = rgba("#cf8d64"), rgba("#e7edf5"), rgba("#101827"), rgba("#9db2c7")
-- banner-spear
rect(gi, 39, 7, 2, 49, goldHi); rect(gi, 34, 10, 6, 12, cloth); rect(gi, 35, 11, 4, 9, cyan); pixel(gi, 40, 5, goldHi)
-- cloak and legs
rect(gi, 11, 27, 26, 25, navy); rect(gi, 14, 30, 20, 21, cloth); rect(gi, 17, 48, 6, 12, dark); rect(gi, 26, 48, 6, 12, dark)
rect(gi, 14, 58, 11, 4, navy); rect(gi, 25, 58, 11, 4, navy)
-- head / hair
rect(gi, 16, 11, 16, 15, skin); rect(gi, 14, 9, 20, 6, hair); rect(gi, 16, 7, 6, 5, hair); rect(gi, 26, 7, 6, 5, hair)
rect(gi, 18, 17, 3, 2, cyan); rect(gi, 27, 17, 3, 2, cyan)
-- breastplate, belt, arms and shield
rect(gi, 16, 27, 16, 15, silver); rect(gi, 18, 29, 12, 11, navy); rect(gi, 22, 31, 4, 6, cyan); rect(gi, 16, 42, 16, 3, gold)
rect(gi, 8, 30, 8, 18, silver); rect(gi, 10, 33, 4, 11, cyan); rect(gi, 32, 31, 6, 18, navy)
save(guard, "ally_dawn_guard")
