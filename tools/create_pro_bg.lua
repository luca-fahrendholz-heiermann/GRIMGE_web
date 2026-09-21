-- Create professional layered backgrounds from LF2 tiles.
-- Composes seamless panoramic far backgrounds with proper tile placement.

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
  for y = math.max(0, y1), math.min(h-1, y2) do
    for x = math.max(0, x1), math.min(w-1, x2) do
      img:drawPixel(x, y, app.pixelColor.rgba(r, g, b, 255))
    end
  end
end

local function placeTile(path, destX, destY, removeBlack)
  local tile = app.open(path)
  if not tile then print("WARN: " .. path); return 0, 0 end
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
  local threshold = removeBlack and 30 or 22

  for ty = 0, th - 1 do
    for tx = 0, tw - 1 do
      local c = timg:getPixel(tx, ty)
      local r = app.pixelColor.rgbaR(c)
      local g = app.pixelColor.rgbaG(c)
      local b = app.pixelColor.rgbaB(c)
      local dr = r - br; local dg = g - bg; local db = b - bb
      local dist = math.sqrt(dr*dr + dg*dg + db*db)
      if dist > threshold then
        local px = destX + tx
        local py = destY + ty
        if px >= 0 and px < w and py >= 0 and py < h then
          img:drawPixel(px, py, app.pixelColor.rgba(r, g, b, 255))
        end
      end
    end
  end
  tile:close()
  return tw, th
end

-- Tile a source across full width at destY
local function tileAcross(path, destY, removeBlack)
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
  local br = app.pixelColor.rgbaR(bgc)
  local bg = app.pixelColor.rgbaG(bgc)
  local bb = app.pixelColor.rgbaB(bgc)
  local threshold = removeBlack and 30 or 22

  for startX = 0, w - 1, tw do
    for ty = 0, th - 1 do
      for tx = 0, tw - 1 do
        local px = startX + tx
        if px < w then
          local py = destY + ty
          if py >= 0 and py < h then
            local c = timg:getPixel(tx, ty)
            local r = app.pixelColor.rgbaR(c)
            local g = app.pixelColor.rgbaG(c)
            local b = app.pixelColor.rgbaB(c)
            local dr = r - br; local dg = g - bg; local db = b - bb
            if math.sqrt(dr*dr + dg*dg + db*db) > threshold then
              img:drawPixel(px, py, app.pixelColor.rgba(r, g, b, 255))
            end
          end
        end
      end
    end
  end
  tile:close()
end

if bgType == "dungeon" then
  -- Dark forest theme: sky -> forest mid -> forest trees
  fillRect(0, 0, w, h, 5, 10, 22)
  -- Sky strip across top
  tileAcross(base .. "lf/forests.bmp", 0, true)
  -- Forest mid-ground: tile forestm1 (800x104) across full width
  tileAcross(base .. "lf/forestm1.bmp", 65, true)
  -- Second mid layer slightly lower with forestm2 variants
  for x = 0, w - 1, 300 do
    placeTile(base .. "lf/forestm2.bmp", x, 130, true)
  end
  -- Tree details scattered
  for x = 100, w - 300, 450 do
    placeTile(base .. "lf/forestt.bmp", x, 100, true)
  end
  -- Land/ground fill the bottom
  local landFiles = {"land1.bmp", "land2.bmp", "land3.bmp", "land4.bmp"}
  local lx = 0
  while lx < w do
    local idx = ((lx / 232) % 4) + 1
    placeTile(base .. "lf/" .. landFiles[math.floor(idx)], lx, 260, true)
    lx = lx + 230
  end
  -- Additional forest ground layer
  for x = 0, w - 1, 300 do
    placeTile(base .. "lf/forestm3.bmp", x, 290, true)
  end

elseif bgType == "invasion" then
  -- Great Wall fortress: sky -> hills -> road structures
  fillRect(0, 0, w, h, 8, 12, 28)
  -- Sky across top
  tileAcross(base .. "gw/sky.bmp", 0, true)
  -- Hills behind
  tileAcross(base .. "gw/hill1.bmp", 80, true)
  -- Second hill layer for depth
  for x = 200, w - 1, 404 do
    placeTile(base .. "gw/hill2.bmp", x, 140, true)
  end
  -- Road / great wall structures
  local rx = 0
  while rx < w do
    placeTile(base .. "gw/road1.bmp", rx, 220, true)
    rx = rx + 233
  end
  -- Smaller road details
  rx = 50
  while rx < w do
    placeTile(base .. "gw/road2.bmp", rx, 310, true)
    rx = rx + 102
  end
  -- Ground strip
  rx = 0
  while rx < w do
    placeTile(base .. "gw/road3.bmp", rx, 360, true)
    rx = rx + 102
  end

else
  -- Arena: cave rocks with fire atmosphere
  fillRect(0, 0, w, h, 8, 6, 16)
  -- Cave walls across
  tileAcross(base .. "bc/bc1.bmp", 20, true)
  -- Second cave layer
  for x = 0, w - 1, 800 do
    placeTile(base .. "bc/bc4.bmp", x, 170, true)
  end
  -- Stone wall details for arena floor area
  local sx = 0
  while sx < w do
    placeTile(base .. "sp/wall.bmp", sx, 220, true)
    sx = sx + 275
  end
  -- Fire elements for atmosphere
  for x = 200, w - 1, 600 do
    placeTile(base .. "sp/fire1.bmp", x, 100, true)
  end
end

-- Apply mode color shift
local hue, sat, light = 0, 0, 0
if bgType == "dungeon" then hue, sat, light = 160, -10, -30
elseif bgType == "invasion" then hue, sat, light = 15, 5, -8
else hue, sat, light = -10, 10, -20 end

app.command.HueSaturation {
  ui = false, mode = "hsv",
  hue = hue, saturation = sat, lightness = light
}

spr:saveCopyAs(outputPath)
spr:close()
print("Pro BG: " .. outputPath)
