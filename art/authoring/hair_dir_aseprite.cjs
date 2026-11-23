// GRIMGE — Aseprite working files for the hair direction variants (user, 22 Nov 2026: "mach die Haar-Varianten pro
// Kopfrichtung mit Aseprite"). One file per direction (art/hair_dir/hair_<dir>.aseprite, 184×184 like every head layer):
// the direction head as a locked bottom layer, above it one layer per hairstyle (the bent variant from hair_directions.cjs).
// Draw over a layer by hand, then export it back:  node art/authoring/hair_dir_aseprite.cjs export
//   node art/authoring/hair_dir_aseprite.cjs <dirHeadsDir>   (build; dirHeadsDir holds <dir>__HEAD.png from hair_directions)
//   node art/authoring/hair_dir_aseprite.cjs export          (every hairstyle layer → public/assets/character/hair_dir/<hair>__<dir>.png)
const fs = require('fs'); const path = require('path'); const cp = require('child_process'); const os = require('os');
const ROOT = path.resolve(__dirname, '../..'); const P = (f) => f.replace(/\\/g, '/');
const ASE = process.env.ASEPRITE ?? 'C:/Program Files/Aseprite/Aseprite.exe';
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/character/manifest.json'), 'utf8')); const DIRS = ['up', 'fall'];
const outDir = path.join(ROOT, 'art/hair_dir'); fs.mkdirSync(outDir, { recursive: true });
const run = (lua) => { const f = path.join(os.tmpdir(), `hairdir_${process.pid}.lua`); fs.writeFileSync(f, lua); try { return cp.execFileSync(ASE, ['-b', '--script', f]).toString(); } finally { fs.rmSync(f, { force: true }); } };
const arg = process.argv[2];
if (arg === 'export') {
  let lua = '';
  for (const dir of DIRS) {
    const file = P(path.join(outDir, `hair_${dir}.aseprite`)); if (!fs.existsSync(file)) continue;
    lua += `do local spr = app.open("${file}")\n for _, l in ipairs(spr.layers) do if l.name ~= "Richtungskopf (${dir})" then local cel = l:cel(1); local img = Image(spr.width, spr.height, spr.colorMode); if cel then img:drawImage(cel.image, cel.position) end; img:saveAs("${P(path.join(ROOT, 'public/assets/character/hair_dir'))}/" .. l.name .. "__${dir}.png") end end\n spr:close() end\n`;
  }
  run(lua); console.log('exported the hairstyle layers to public/assets/character/hair_dir');
} else {
  const heads = arg; if (!heads) throw new Error('usage: hair_dir_aseprite.cjs <dirHeadsDir> | export');
  let lua = '';
  for (const dir of DIRS) {
    lua += `do local spr = Sprite(184, 184); local base = spr.layers[1]; base.name = "Richtungskopf (${dir})"; spr:newCel(base, 1, Image{ fromFile = "${P(path.join(heads, `${dir}__HEAD.png`))}" }, Point(0, 0)); base.isEditable = false\n`;
    let first = true;
    for (const k of Object.keys(man.hair)) { const f = path.join(ROOT, `public/assets/character/hair_dir/${k}__${dir}.png`); if (!fs.existsSync(f)) continue; lua += ` local l = spr:newLayer(); l.name = "${k}"; spr:newCel(l, 1, Image{ fromFile = "${P(f)}" }, Point(0, 0)); l.isVisible = ${first}\n`; first = false; }
    lua += ` spr:saveAs("${P(path.join(outDir, `hair_${dir}.aseprite`))}"); spr:close() end\n`;
  }
  run(lua); console.log('built', DIRS.map((d) => `art/hair_dir/hair_${d}.aseprite`).join(', '));
}
