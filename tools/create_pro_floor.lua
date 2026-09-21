-- Create a professional tiling floor from multiple LF2 ground tiles.

local outputPath = app.params["output"]
local bgType = app.params["type"]
local base = "C:/Dev/LittleFighter/bg/sys/"
local canvasW = 928
local canvasH = 200

local spr = Sprite(canvasW, canvasH, ColorMode.RGB)
if spr.layers[1].isBackground then
  app.activeLayer = spr.layers[1]
  app.command.LayerFromBackground()
end
local img = spr.cels[1].image

-- Fill base
local br, bg, bb = 10, 14, 22
if bgType == "invasion" then br, bg, bb = 14, 16, 12
elseif bgType == "arena" then br, bg, bb = 12, 8, 14 end
for y = 0, canvasH - 1 do
  for x = 0, canvasW - 1 do
    img:drawPixel(x, y, app.pixelColor.rgba(br, bg, bb, 255))
  end
end

local function tileAcross(path, destY)
  local tile = app.open(path)
  if not tile then return end
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
  local bgR = app.pixelColor.rgbaR(bgc)
  local bgG = app.pixelColor.rgbaG(bgc)
  local bgB = app.pixelColor.rgbaB(bgc)

  for startX = 0, canvasW - 1, tw do
    for ty = 0, th - 1 do
      for tx = 0, tw - 1 do
        local px = startX + tx
        local py = destY + ty
        if px < canvasW and py >= 0 and py < canvasH then
          local c = timg:getPixel(tx, ty)
          local r = app.pixelColor.rgbaR(c)
          local g = app.pixelColor.rgbaG(c)
          local b = app.pixelColor.rgbaB(c)
          local dr = r - bgR; local dg = g - bgG; local db = b - bgB
          if math.sqrt(dr*dr + dg*dg + db*db) > 24 then
            img:drawPixel(px, py, app.pixelColor.rgba(r, g, b, 255))
          end
        end
      end
    end
  end
  tile:close()
end

if bgType == "dungeon" then
  -- Forest ground: land tiles tiled as natural dirt/grass floor
  tileAcross(base .. "lf/land1.bmp", 0)
  tileAcross(base .. "lf/land2.bmp", 100)
  -- Thin grass strips on top
  tileAcross(base .. "lf/forestm3.bmp", 10)

elseif bgType == "invasion" then
  -- Great wall road surface
  tileAcross(base .. "gw/road1.bmp", 0)
  -- Road detail strips
  tileAcross(base .. "gw/road2.bmp", 130)
  tileAcross(base .. "gw/road3.bmp", 164)

else
  -- Stone arena floor
  tileAcross(base .. "sp/wall.bmp", 0)
  tileAcross(base .. "sp/wall2.bmp", 100)
  tileAcross(base .. "sp/wall3.bmp", 140)
end

-- Color shift
local hue, sat, light = 0, 0, 0
if bgType == "dungeon" then hue, sat, light = 160, -10, -35
elseif bgType == "invasion" then hue, sat, light = 15, 0, -15
else hue, sat, light = -10, 5, -25 end

app.command.HueSaturation {
  ui = false, mode = "hsv",
  hue = hue, saturation = sat, lightness = light
}

spr:saveCopyAs(outputPath)
spr:close()
print("Pro floor: " .. outputPath)
