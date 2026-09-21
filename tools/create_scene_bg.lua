-- Compose a GRIMGE scene background from LF2 background tiles.
-- Args: output, type (dungeon|invasion|arena), and source BMP paths

local outputPath = app.params["output"]
local bgType = app.params["type"]

local w = 1200
local h = 600

local spr = Sprite(w, h, ColorMode.RGB)
local img = spr.cels[1].image

-- Fill with base color
local baseR, baseG, baseB = 0, 0, 0
if bgType == "dungeon" then baseR, baseG, baseB = 7, 19, 30
elseif bgType == "invasion" then baseR, baseG, baseB = 11, 16, 32
else baseR, baseG, baseB = 8, 10, 20 end

for y = 0, h - 1 do
  for x = 0, w - 1 do
    img:drawPixel(x, y, app.pixelColor.rgba(baseR, baseG, baseB, 255))
  end
end

spr.layers[1].name = "Base"

-- Load and place a tile layer
local function placeTile(path, destX, destY, tileAlpha)
  local tile = app.open(path)
  if not tile then print("WARN: Could not open " .. path); return end
  if tile.colorMode ~= ColorMode.RGB then
    app.command.ChangePixelFormat { format = "rgb" }
  end
  local timg = tile.cels[1].image
  local tw = timg.width
  local th = timg.height
  -- Remove background color (sample top-left)
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
      local dr = r - br
      local dg = g - bg
      local db = b - bb
      if math.sqrt(dr*dr + dg*dg + db*db) > 20 then
        local px = destX + tx
        local py = destY + ty
        if px >= 0 and px < w and py >= 0 and py < h then
          img:drawPixel(px, py, app.pixelColor.rgba(r, g, b, tileAlpha or 255))
        end
      end
    end
  end
  tile:close()
end

local base = "C:/Dev/LittleFighter/bg/sys/"

if bgType == "dungeon" then
  -- Cave rocks tiles composited into a dark cavern
  placeTile(base .. "bc/bc1.bmp", 0, 150, 255)
  placeTile(base .. "bc/bc2.bmp", 460, 150, 255)
  placeTile(base .. "bc/bc3.bmp", 0, 300, 255)
  placeTile(base .. "bc/bc4.bmp", 460, 300, 255)
  placeTile(base .. "bc/bc5.bmp", 740, 150, 255)
  -- Repeat for width coverage
  placeTile(base .. "bc/bc1.bmp", 920, 300, 255)

elseif bgType == "invasion" then
  -- Great Wall/hills as fortress backdrop
  placeTile(base .. "gw/hill1.bmp", 0, 80, 255)
  placeTile(base .. "gw/hill2.bmp", 800, 80, 255)
  placeTile(base .. "gw/road1.bmp", 0, 250, 255)
  placeTile(base .. "gw/road2.bmp", 800, 250, 255)
  -- Forest foreground elements
  placeTile(base .. "lf/forestm1.bmp", 0, 370, 255)
  placeTile(base .. "lf/forestm2.bmp", 800, 370, 255)

else
  -- Volcano/ice for arena
  placeTile(base .. "qi/qi1.bmp", 0, 80, 255)
  placeTile(base .. "qi/qi2.bmp", 0, 250, 255)
  placeTile(base .. "qi/qi3.bmp", 190, 250, 255)
  placeTile(base .. "qi/qi4.bmp", 380, 250, 255)
  placeTile(base .. "qi/qi1.bmp", 400, 80, 255)
end

-- Apply mode-specific color shift
local hue, sat, light = 0, 0, 0
if bgType == "dungeon" then hue, sat, light = 200, 15, -25
elseif bgType == "invasion" then hue, sat, light = 30, 10, -10
else hue, sat, light = 0, 20, -15 end

app.command.HueSaturation {
  ui = false, mode = "hsv",
  hue = hue, saturation = sat, lightness = light
}

spr:saveCopyAs(outputPath)
spr:close()
print("Scene created: " .. outputPath)
