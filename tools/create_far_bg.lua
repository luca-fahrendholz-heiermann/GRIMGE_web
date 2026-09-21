-- Create a wide far background layer from LF2 tiles for parallax scrolling.
-- Tiles bc1-bc5 for dungeon, gw/hill+sky for invasion, qi tiles for arena.

local outputPath = app.params["output"]
local bgType = app.params["type"]
local base = "C:/Dev/LittleFighter/bg/sys/"

local w = 2400
local h = 350

local spr = Sprite(w, h, ColorMode.RGB)
if spr.layers[1].isBackground then
  app.activeLayer = spr.layers[1]
  app.command.LayerFromBackground()
end
local img = spr.cels[1].image

-- Fill with mode base color
local baseR, baseG, baseB = 7, 12, 22
if bgType == "invasion" then baseR, baseG, baseB = 14, 10, 24
elseif bgType == "arena" then baseR, baseG, baseB = 12, 8, 18 end

for y = 0, h - 1 do
  for x = 0, w - 1 do
    img:drawPixel(x, y, app.pixelColor.rgba(baseR, baseG, baseB, 255))
  end
end

local function placeTile(path, destX, destY)
  local tile = app.open(path)
  if not tile then print("WARN: " .. path); return end
  if tile.colorMode ~= ColorMode.RGB then
    app.command.ChangePixelFormat { format = "rgb" }
  end
  if tile.layers[1].isBackground then
    app.activeLayer = tile.layers[1]
    app.command.LayerFromBackground()
  end
  local timg = tile.cels[1].image
  local tw = timg.width
  local th = timg.height
  local bgc = timg:getPixel(0, 0)
  local br = app.pixelColor.rgbaR(bgc)
  local bg = app.pixelColor.rgbaG(bgc)
  local bb = app.pixelColor.rgbaB(bgc)

  for ty = 0, th - 1 do
    for tx = 0, tw - 1 do
      local c = timg:getPixel(tx, ty)
      local r = app.pixelColor.rgbaR(c)
      local g = app.pixelColor.rgbaG(c)
      local b = app.pixelColor.rgbaB(c)
      local dr = r - br; local dg = g - bg; local db = b - bb
      if math.sqrt(dr*dr + dg*dg + db*db) > 18 then
        local px = destX + tx
        local py = destY + ty
        if px >= 0 and px < w and py >= 0 and py < h then
          img:drawPixel(px, py, app.pixelColor.rgba(r, g, b, 255))
        end
      end
    end
  end
  tile:close()
end

if bgType == "dungeon" then
  -- Cave rock walls: bc1-bc5 are 800x231 each, tile 3 across for 2400
  placeTile(base .. "bc/bc1.bmp", 0, 50)
  placeTile(base .. "bc/bc2.bmp", 800, 50)
  placeTile(base .. "bc/bc3.bmp", 1600, 50)
  -- Add bottom detail
  placeTile(base .. "bc/bc4.bmp", 200, 140)
  placeTile(base .. "bc/bc5.bmp", 1000, 140)
  placeTile(base .. "bc/bc1.bmp", 1800, 140)

elseif bgType == "invasion" then
  -- Sky layer across top
  placeTile(base .. "gw/sky.bmp", 0, 0)
  placeTile(base .. "gw/sky.bmp", 800, 0)
  placeTile(base .. "gw/sky.bmp", 1600, 0)
  -- Hills
  placeTile(base .. "gw/hill1.bmp", 0, 100)
  placeTile(base .. "gw/hill2.bmp", 800, 100)
  placeTile(base .. "gw/hill1.bmp", 1200, 100)
  placeTile(base .. "gw/hill2.bmp", 2000, 100)
  -- Road
  placeTile(base .. "gw/road1.bmp", 0, 210)
  placeTile(base .. "gw/road1.bmp", 235, 210)
  placeTile(base .. "gw/road1.bmp", 470, 210)

else
  -- Qi tiles for arena
  placeTile(base .. "qi/qi1.bmp", 0, 40)
  placeTile(base .. "qi/qi2.bmp", 0, 190)
  placeTile(base .. "qi/qi1.bmp", 800, 40)
  placeTile(base .. "qi/qi2.bmp", 800, 190)
  placeTile(base .. "qi/qi1.bmp", 1600, 40)
  placeTile(base .. "qi/qi2.bmp", 1600, 190)
end

-- Color shift per mode
local hue, sat, light = 0, 0, 0
if bgType == "dungeon" then hue, sat, light = 200, 15, -30
elseif bgType == "invasion" then hue, sat, light = 30, 10, -15
else hue, sat, light = 0, 20, -20 end

app.command.HueSaturation {
  ui = false, mode = "hsv",
  hue = hue, saturation = sat, lightness = light
}

spr:saveCopyAs(outputPath)
spr:close()
print("Far BG: " .. outputPath)
