-- Convert LF2 BMP sprite sheet to transparent PNG with color shift and 2x scale.
-- Fixes: converts background layer to normal layer for alpha support,
-- removes black background properly, scales up for better resolution.

local inputPath = app.params["input"]
local outputPath = app.params["output"]
local hueShift = tonumber(app.params["hue"] or "0")
local satShift = tonumber(app.params["sat"] or "0")
local lightShift = tonumber(app.params["light"] or "0")
local scaleFactor = tonumber(app.params["scale"] or "2")

local spr = app.open(inputPath)
if not spr then
  print("ERROR: Could not open " .. inputPath)
  return
end

-- Convert indexed to RGB first
if spr.colorMode ~= ColorMode.RGB then
  app.command.ChangePixelFormat { format = "rgb" }
end

-- Convert background layer to normal layer (enables transparency)
if spr.layers[1].isBackground then
  app.activeLayer = spr.layers[1]
  app.command.LayerFromBackground()
end

-- Remove black background pixels
local img = spr.cels[1].image
local bgR, bgG, bgB = 0, 0, 0

for y = 0, img.height - 1 do
  for x = 0, img.width - 1 do
    local c = img:getPixel(x, y)
    local a = app.pixelColor.rgbaA(c)
    if a == 0 then goto continue end
    local r = app.pixelColor.rgbaR(c)
    local g = app.pixelColor.rgbaG(c)
    local b = app.pixelColor.rgbaB(c)
    local dr = r - bgR
    local dg = g - bgG
    local db = b - bgB
    local dist = math.sqrt(dr*dr + dg*dg + db*db)
    if dist < 28 then
      img:drawPixel(x, y, app.pixelColor.rgba(0, 0, 0, 0))
    end
    ::continue::
  end
end

-- Apply hue/saturation/lightness shift
if hueShift ~= 0 or satShift ~= 0 or lightShift ~= 0 then
  app.command.HueSaturation {
    ui = false,
    mode = "hsv",
    hue = hueShift,
    saturation = satShift,
    lightness = lightShift
  }
end

-- Scale up for better resolution (nearest neighbor for pixel art)
if scaleFactor > 1 then
  local newW = spr.width * scaleFactor
  local newH = spr.height * scaleFactor
  app.command.SpriteSize {
    ui = false,
    width = newW,
    height = newH,
    method = "nearest"
  }
end

spr:saveCopyAs(outputPath)
spr:close()
print("OK: " .. outputPath)
