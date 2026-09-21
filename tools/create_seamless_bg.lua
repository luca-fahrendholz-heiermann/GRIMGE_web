-- Create seamless far background from LF2 tiles.
-- Bright-only overlay prevents dark tile edges from creating seam bands.

local outputPath = app.params["output"]
local bgType = app.params["type"]
local base = "C:/Dev/LittleFighter/bg/sys/"

local w = 3200
local h = 400

local spr = Sprite(w, h, ColorMode.RGB)
if spr.layers[1].isBackground then
  app.activeLayer = spr.layers[1]
  app.command.LayerFromBackground()
end
local img = spr.cels[1].image

local function fillRect(x1, y1, x2, y2, r, g, b)
  for y = math.max(0, y1), math.min(h - 1, y2) do
    for x = math.max(0, x1), math.min(w - 1, x2) do
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

local function openTile(path)
  local tile = app.open(path)
  if not tile then return nil end
  if tile.colorMode ~= ColorMode.RGB then
    app.command.ChangePixelFormat { format = "rgb" }
  end
  return tile
end

local function blitAt(timg, tw, th, destX, destY)
  for ty = 0, th - 1 do
    local py = destY + ty
    if py >= 0 and py < h then
      for tx = 0, tw - 1 do
        local px = destX + tx
        if px >= 0 and px < w then
          img:drawPixel(px, py, timg:getPixel(tx, ty))
        end
      end
    end
  end
end

-- Only draw pixels brighter than threshold (skip dark tile edges)
local function blitBright(timg, tw, th, destX, destY, minBright)
  minBright = minBright or 30
  for ty = 0, th - 1 do
    local py = destY + ty
    if py >= 0 and py < h then
      for tx = 0, tw - 1 do
        local px = destX + tx
        if px >= 0 and px < w then
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

local function tileAcross(path, destY)
  local tile = openTile(path)
  if not tile then return 0 end
  local timg = tile.cels[1].image
  local tw = timg.width; local th = timg.height
  for startX = 0, w - 1, tw do
    blitAt(timg, tw, th, startX, destY)
  end
  tile:close()
  return th
end

local function tileBright(path, destY, minBright)
  local tile = openTile(path)
  if not tile then return 0 end
  local timg = tile.cels[1].image
  local tw = timg.width; local th = timg.height
  for startX = 0, w - 1, tw do
    blitBright(timg, tw, th, startX, destY, minBright or 30)
  end
  tile:close()
  return th
end

local function drawTileBright(path, destX, destY, minBright)
  local tile = openTile(path)
  if not tile then return end
  local timg = tile.cels[1].image
  blitBright(timg, timg.width, timg.height, destX, destY, minBright or 30)
  tile:close()
end

local function drawTile(path, destX, destY)
  local tile = openTile(path)
  if not tile then return end
  local timg = tile.cels[1].image
  blitAt(timg, timg.width, timg.height, destX, destY)
  tile:close()
end

local function overlayTile(path, destX, destY, threshold)
  threshold = threshold or 25
  local tile = openTile(path)
  if not tile then return end
  local timg = tile.cels[1].image
  local tw = timg.width; local th = timg.height
  local bgc = timg:getPixel(0, 0)
  local bgR = app.pixelColor.rgbaR(bgc)
  local bgG = app.pixelColor.rgbaG(bgc)
  local bgB = app.pixelColor.rgbaB(bgc)
  for ty = 0, th - 1 do
    local py = destY + ty
    if py >= 0 and py < h then
      for tx = 0, tw - 1 do
        local px = destX + tx
        if px >= 0 and px < w then
          local c = timg:getPixel(tx, ty)
          local r = app.pixelColor.rgbaR(c)
          local g = app.pixelColor.rgbaG(c)
          local b = app.pixelColor.rgbaB(c)
          local dr = r - bgR; local dg = g - bgG; local db = b - bgB
          if math.sqrt(dr*dr + dg*dg + db*db) > threshold then
            img:drawPixel(px, py, c)
          end
        end
      end
    end
  end
  tile:close()
end

if bgType == "dungeon" then
  -- Cave: fill with mid-rock color, then layer bc tiles using bright-only
  -- so dark edges never overwrite existing cave rock content.
  local bgR, bgG, bgB = sampleColor(base .. "bc/bc1.bmp", 230, 75)
  fillRect(0, 0, w, h, bgR, bgG, bgB)
  -- First row: full blit as base layer
  tileAcross(base .. "bc/bc1.bmp", 0)
  -- All subsequent rows: bright-only so dark edges don't create bands
  for x = 230, w - 1, 460 do
    drawTileBright(base .. "bc/bc2.bmp", x, 60, 40)
  end
  tileBright(base .. "bc/bc3.bmp", 130, 40)
  tileBright(base .. "bc/bc1.bmp", 200, 40)
  for x = 115, w - 1, 460 do
    drawTileBright(base .. "bc/bc2.bmp", x, 270, 40)
  end
  tileBright(base .. "bc/bc3.bmp", 310, 40)
  -- bc5 (600x231) overlays
  overlayTile(base .. "bc/bc5.bmp", 300, 80, 22)
  overlayTile(base .. "bc/bc5.bmp", 1200, 70, 22)
  overlayTile(base .. "bc/bc5.bmp", 2100, 90, 22)
  overlayTile(base .. "bc/bc5.bmp", 2900, 75, 22)
  -- Fire torches
  for x = 160, w - 80, 330 do
    overlayTile(base .. "sp/fire1.bmp", x, 45, 30)
  end

elseif bgType == "invasion" then
  -- Forest + village: zone fills + bright-only overlay
  local skyR, skyG, skyB = sampleColor(base .. "lf/forests.bmp", 400, 35)
  fillRect(0, 0, w, 120, skyR, skyG, skyB)
  local forestR, forestG, forestB = sampleColor(base .. "lf/forestm1.bmp", 400, 52)
  fillRect(0, 60, w, 280, forestR, forestG, forestB)
  local groundR, groundG, groundB = sampleColor(base .. "thv/5.bmp", 400, 74)
  fillRect(0, 220, w, h, groundR, groundG, groundB)

  tileAcross(base .. "lf/forests.bmp", 0)
  tileBright(base .. "lf/forestm1.bmp", 50, 35)
  tileBright(base .. "lf/forestm1.bmp", 110, 35)
  tileBright(base .. "lf/forestm1.bmp", 170, 35)
  tileAcross(base .. "thv/5.bmp", 250)
  tileBright(base .. "thv/1el.bmp", 200, 40)

else
  -- Arena: qi temple + stone walls
  local qiR, qiG, qiB = sampleColor(base .. "qi/qi1.bmp", 400, 75)
  fillRect(0, 0, w, h, qiR, qiG, qiB)
  tileAcross(base .. "qi/qi1.bmp", 0)
  tileAcross(base .. "qi/qi1.bmp", 148)
  local spR, spG, spB = sampleColor(base .. "sp/wall.bmp", 138, 90)
  fillRect(0, 290, w, h, spR, spG, spB)
  local sx = 0
  while sx < w do
    drawTile(base .. "sp/wall.bmp", sx, 280)
    sx = sx + 277
  end
  for x = 180, w - 80, 300 do
    overlayTile(base .. "sp/fire2.bmp", x, 85, 30)
  end
  for x = 330, w - 80, 300 do
    overlayTile(base .. "sp/fire5.bmp", x, 190, 30)
  end
end

local hue, sat, light = 0, 0, 0
if bgType == "dungeon" then hue, sat, light = 10, -5, -20
elseif bgType == "invasion" then hue, sat, light = 5, 5, -8
else hue, sat, light = -5, 10, -15 end

app.command.HueSaturation {
  ui = false, mode = "hsv",
  hue = hue, saturation = sat, lightness = light
}

spr:saveCopyAs(outputPath)
spr:close()
print("Seamless BG: " .. outputPath)
