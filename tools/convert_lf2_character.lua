-- Convert an LF2 character sprite sheet to a GRIMGE-ready transparent PNG
-- with optional hue/saturation/lightness shift.
-- Usage: aseprite -b --script-param input=... --script-param output=...
--        --script-param hue=N --script-param sat=N --script-param light=N
--        --script convert_lf2_character.lua

local inputPath = app.params["input"]
local outputPath = app.params["output"]
local hueShift = tonumber(app.params["hue"] or "0")
local satShift = tonumber(app.params["sat"] or "0")
local lightShift = tonumber(app.params["light"] or "0")

local spr = app.open(inputPath)
if not spr then
  print("ERROR: Could not open " .. inputPath)
  return
end

-- Convert indexed to RGB
if spr.colorMode ~= ColorMode.RGB then
  app.command.ChangePixelFormat { format = "rgb" }
end

-- Remove background: sample top-left pixel, remove similar colors
local img = spr.cels[1].image
local bgColor = img:getPixel(0, 0)
local bgR = app.pixelColor.rgbaR(bgColor)
local bgG = app.pixelColor.rgbaG(bgColor)
local bgB = app.pixelColor.rgbaB(bgColor)

for y = 0, img.height - 1 do
  for x = 0, img.width - 1 do
    local c = img:getPixel(x, y)
    local r = app.pixelColor.rgbaR(c)
    local g = app.pixelColor.rgbaG(c)
    local b = app.pixelColor.rgbaB(c)
    local dr = r - bgR
    local dg = g - bgG
    local db = b - bgB
    local dist = math.sqrt(dr*dr + dg*dg + db*db)
    if dist < 24 then
      img:drawPixel(x, y, app.pixelColor.rgba(0, 0, 0, 0))
    end
  end
end

-- Apply hue/saturation/lightness shift if any non-zero
if hueShift ~= 0 or satShift ~= 0 or lightShift ~= 0 then
  app.command.HueSaturation {
    ui = false,
    mode = "hsv",
    hue = hueShift,
    saturation = satShift,
    lightness = lightShift
  }
end

spr:saveCopyAs(outputPath)
spr:close()
print("OK: " .. outputPath)
