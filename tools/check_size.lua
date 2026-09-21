local spr = app.open(app.params["input"])
print(app.params["input"] .. ": " .. spr.width .. "x" .. spr.height)
spr:close()
