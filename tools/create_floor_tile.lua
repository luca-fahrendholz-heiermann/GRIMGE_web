-- Create a tiling ground floor strip from LF2 background tiles.
-- Usage: aseprite -b --script-param input=... --script-param output=...
--        --script-param hue=N --script-param sat=N --script-param light=N
--        --script-param tileWidth=N --script-param canvasW=N --script-param canvasH=N
--        --script create_floor_tile.lua

local inputPath = app.params["input"]
local outputPath = app.params["output"]
local hue = tonumber(app.params["hue"] or "0")
local sat = tonumber(app.params["sat"] or "0")
local light = tonumber(app.params["light"] or "0")
local canvasW = tonumber(app.params["canvasW"] or "800")
local canvasH = tonumber(app.params["canvasH"] or "200")

local tile = app.open(inputPath)
if not tile then print("ERROR: cannot open " .. inputPath); return end
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

-- Remove near-black background pixels from tile
for y = 0, th - 1 do
  for x = 0, tw - 1 do
    local c = timg:getPixel(x, y)
    local r = app.pixelColor.rgbaR(c)
    local g = app.pixelColor.rgbaG(c)
    local b = app.pixelColor.rgbaB(c)
    if r < 20 and g < 20 and b < 20 then
      timg:drawPixel(x, y, app.pixelColor.rgba(0, 0, 0, 0))
    end
  end
end

local spr = Sprite(canvasW, canvasH, ColorMode.RGB)
app.activeLayer = spr.layers[1]
if spr.layers[1].isBackground then
  app.command.LayerFromBackground()
end

local img = spr.cels[1].image
-- Fill with dark base
for y = 0, canvasH - 1 do
  for x = 0, canvasW - 1 do
    img:drawPixel(x, y, app.pixelColor.rgba(12, 16, 24, 255))
  end
end

-- Tile the source image across the canvas, vertically centered
local oy = math.max(0, math.floor((canvasH - th) / 2))
for dx = 0, canvasW - 1, tw do
  for ty = 0, th - 1 do
    for tx = 0, tw - 1 do
      local px = dx + tx
      if px < canvasW then
        local py = oy + ty
        if py < canvasH then
          local c = timg:getPixel(tx, ty)
          local a = app.pixelColor.rgbaA(c)
          if a > 10 then
            img:drawPixel(px, py, c)
          end
        end
      end
    end
  end
end

-- Apply color shift
if hue ~= 0 or sat ~= 0 or light ~= 0 then
  app.command.HueSaturation {
    ui = false, mode = "hsv",
    hue = hue, saturation = sat, lightness = light
  }
end

spr:saveCopyAs(outputPath)
spr:close()
tile:close()
print("Floor tile: " .. outputPath)
