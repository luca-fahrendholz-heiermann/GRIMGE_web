-- Create seamless tiling floor from LF2 ground tiles.
-- Uses mid-content color fills and bright-only overlay to hide dark tile edges.

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

local function fillCanvas(r, g, b)
  for y = 0, canvasH - 1 do
    for x = 0, canvasW - 1 do
      img:drawPixel(x, y, app.pixelColor.rgba(r, g, b, 255))
    end
  end
end

local function sampleColor(path, sx, sy)
  local tile = app.open(path)
  if not tile then return 0, 0, 0 end
  if tile.colorMode ~= ColorMode.RGB then
    app.command.ChangePixelFormat { format = "rgb" }
  end
  local timg = tile.cels[1].image
  local px = math.min(sx, timg.width - 1)
  local py = math.min(sy, timg.height - 1)
  local c = timg:getPixel(px, py)
  local r = app.pixelColor.rgbaR(c)
  local g = app.pixelColor.rgbaG(c)
  local b = app.pixelColor.rgbaB(c)
  tile:close()
  return r, g, b
end

local function tileAcross(path, destY)
  local tile = app.open(path)
  if not tile then return end
  if tile.colorMode ~= ColorMode.RGB then
    app.command.ChangePixelFormat { format = "rgb" }
  end
  local timg = tile.cels[1].image
  local tw = timg.width; local th = timg.height
  for sx = 0, canvasW - 1, tw do
    for ty = 0, th - 1 do
      local py = destY + ty
      if py >= 0 and py < canvasH then
        for tx = 0, tw - 1 do
          local px = sx + tx
          if px < canvasW then
            img:drawPixel(px, py, timg:getPixel(tx, ty))
          end
        end
      end
    end
  end
  tile:close()
end

-- Tile but only draw non-dark pixels
local function tileBright(path, destY, minBright)
  minBright = minBright or 30
  local tile = app.open(path)
  if not tile then return end
  if tile.colorMode ~= ColorMode.RGB then
    app.command.ChangePixelFormat { format = "rgb" }
  end
  local timg = tile.cels[1].image
  local tw = timg.width; local th = timg.height
  for sx = 0, canvasW - 1, tw do
    for ty = 0, th - 1 do
      local py = destY + ty
      if py >= 0 and py < canvasH then
        for tx = 0, tw - 1 do
          local px = sx + tx
          if px < canvasW then
            local c = timg:getPixel(tx, ty)
            local r = app.pixelColor.rgbaR(c)
            local g = app.pixelColor.rgbaG(c)
            local b = app.pixelColor.rgbaB(c)
            if r + g + b > minBright then
              img:drawPixel(px, py, c)
            end
          end
        end
      end
    end
  end
  tile:close()
end

local function drawTile(path, destX, destY)
  local tile = app.open(path)
  if not tile then return end
  if tile.colorMode ~= ColorMode.RGB then
    app.command.ChangePixelFormat { format = "rgb" }
  end
  local timg = tile.cels[1].image
  local tw = timg.width; local th = timg.height
  for ty = 0, th - 1 do
    local py = destY + ty
    if py >= 0 and py < canvasH then
      for tx = 0, tw - 1 do
        local px = destX + tx
        if px >= 0 and px < canvasW then
          img:drawPixel(px, py, timg:getPixel(tx, ty))
        end
      end
    end
  end
  tile:close()
end

if bgType == "dungeon" then
  -- Stone dungeon floor: sp/wall (277x180) overlapping rows
  local bgR, bgG, bgB = sampleColor(base .. "sp/wall.bmp", 138, 90)
  fillCanvas(bgR, bgG, bgB)
  tileAcross(base .. "sp/wall.bmp", 0)
  local x = 138
  while x < canvasW do
    drawTile(base .. "sp/wall.bmp", x, 90)
    x = x + 277
  end

elseif bgType == "invasion" then
  -- Forest ground: fill with mid-content green, overlay bright pixels only
  local r, g, b = sampleColor(base .. "lf/forestm1.bmp", 400, 52)
  fillCanvas(r, g, b)
  tileBright(base .. "lf/forestm1.bmp", 0, 35)
  tileBright(base .. "lf/forestm1.bmp", 50, 35)
  tileBright(base .. "lf/forestm1.bmp", 100, 35)

else
  -- Arena: stone wall overlapping rows
  local bgR, bgG, bgB = sampleColor(base .. "sp/wall.bmp", 138, 90)
  fillCanvas(bgR, bgG, bgB)
  tileAcross(base .. "sp/wall.bmp", 0)
  local x = 138
  while x < canvasW do
    drawTile(base .. "sp/wall.bmp", x, 90)
    x = x + 277
  end
end

local hue, sat, light = 0, 0, 0
if bgType == "dungeon" then hue, sat, light = 10, -5, -25
elseif bgType == "invasion" then hue, sat, light = 5, 5, -15
else hue, sat, light = -5, 5, -20 end

app.command.HueSaturation {
  ui = false, mode = "hsv",
  hue = hue, saturation = sat, lightness = light
}

spr:saveCopyAs(outputPath)
spr:close()
print("Seamless floor: " .. outputPath)
