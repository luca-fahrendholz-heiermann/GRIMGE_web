// GRIMGE — writes the slots of re-drawn weapons (weapon_cut.cjs → new_slots.json) into the game data:
// weapon_sheets.js entries [name, gx, gy, w, h, …] get the new grip / size, spell_sprite_sheets.js metas become one
// native-resolution frame (res 1, w × h). Same-named entries in FORM_SKINS are patched too.
//   node art/authoring/weapon_patch.cjs <new_slots.json>
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '../..'); const slots = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const wsP = path.join(ROOT, 'public/src/weapon_sheets.js'); let ws = fs.readFileSync(wsP, 'utf8');
const ssP = path.join(ROOT, 'public/src/spell_sprite_sheets.js'); let ss = fs.readFileSync(ssP, 'utf8');
for (const [name, s] of Object.entries(slots)) {
  const re = new RegExp(`\\['${name}', \\d+, \\d+, \\d+, \\d+`, 'g'); const n = (ws.match(re) || []).length;
  ws = ws.replace(re, `['${name}', ${s.gx}, ${s.gy}, ${s.w}, ${s.h}`);
  const mre = new RegExp(`("${name}": \\{\\s*"name": "${name}",\\s*"w": )\\d+(,\\s*"h": )\\d+(,\\s*"frames": )\\d+(,\\s*"res": )\\d+(,\\s*"hd": )(true|false)`);
  if (!mre.test(ss)) { console.log('no meta', name); continue; }
  ss = ss.replace(mre, `$1${s.w}$2${s.h}$31$41$5false`);
  console.log(name, 'slots', n);
}
fs.writeFileSync(wsP, ws); fs.writeFileSync(ssP, ss);
