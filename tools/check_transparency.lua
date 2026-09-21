local spr = app.open(app.params["input"])
if spr.colorMode ~= ColorMode.RGB then app.command.ChangePixelFormat{format="rgb"} end
local img = spr.cels[1].image
local transparent = 0
local opaque = 0
local nearBlack = 0
for y = 0, img.height - 1 do
  for x = 0, img.width - 1 do
    local c = img:getPixel(x, y)
    local a = app.pixelColor.rgbaA(c)
    if a == 0 then transparent = transparent + 1
    else
      opaque = opaque + 1
      local r = app.pixelColor.rgbaR(c)
      local g = app.pixelColor.rgbaG(c)
      local b = app.pixelColor.rgbaB(c)
      if r < 30 and g < 30 and b < 30 then nearBlack = nearBlack + 1 end
    end
  end
end
print("Transparent: " .. transparent)
print("Opaque: " .. opaque)
print("Near-black opaque: " .. nearBlack)
print("Total: " .. (transparent + opaque))
spr:close()
