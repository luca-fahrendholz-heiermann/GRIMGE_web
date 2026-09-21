-- Convert a single LF2 BMP sprite sheet to a transparent PNG preview
-- The LF2 BMPs use 8bpp indexed color with a specific background color
-- that needs to be removed (typically the color at pixel 0,0)

local inputPath = app.params["input"]
local outputPath = app.params["output"]

local spr = app.open(inputPath)
if not spr then
  print("ERROR: Could not open " .. inputPath)
  return
end

-- Convert to RGB if indexed
if spr.colorMode ~= ColorMode.RGB then
  app.command.ChangePixelFormat { format = "rgb" }
end

-- Get the background color from top-left corner
local img = spr.cels[1].image
local bgColor = img:getPixel(0, 0)

-- Extract RGBA components from the background pixel
local bgR = app.pixelColor.rgbaR(bgColor)
local bgG = app.pixelColor.rgbaG(bgColor)
local bgB = app.pixelColor.rgbaB(bgColor)

-- Replace background color with transparency
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
    if dist < 20 then
      img:drawPixel(x, y, app.pixelColor.rgba(0, 0, 0, 0))
    end
  end
end

spr:saveCopyAs(outputPath)
spr:close()
print("Converted: " .. outputPath)
