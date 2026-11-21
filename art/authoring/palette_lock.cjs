// GRIMGE — lock animated outfit layers to the palette of the class still (user, 21 Nov 2026: errors in the detail comparison
// of the class armours — the AI-dressed frames drift in colour from the still and from each other).
//   node art/authoring/palette_lock.cjs <class> <outfitStill.png> [clip …]   (no clips = every sheet in character/anim/<class>)
// Every opaque pixel of public/assets/character/anim/<class>/<clip>.png becomes the nearest colour (OKLab distance) of the
// still's own palette (public/assets/character/outfit/<outfitStill>.png). The armour then shows exactly the still's colours
// in every frame: the deterministic dyes (armor_dye.js) hit the same bands in still and animation, colour flicker between
// frames goes away. Shapes stay as they are.
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const ROOT = path.resolve(__dirname, '../..');
const [cls, still, ...clipArgs] = process.argv.slice(2);
const lin = (c) => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const oklab = (r, g, b) => { const R = lin(r), G = lin(g), B = lin(b); const l = Math.cbrt(.4122 * R + .5363 * G + .0514 * B), m = Math.cbrt(.2119 * R + .6807 * G + .1074 * B), s = Math.cbrt(.0883 * R + .2817 * G + .6300 * B); return [.2105 * l + .7936 * m - .0041 * s, 1.978 * l - 2.4286 * m + .4506 * s, .0259 * l + .7828 * m - .8087 * s]; };
const st = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public/assets/character/outfit', still.endsWith('.png') ? still : still + '.png')));
// the still's outfit colours + the reference body's (layers keep skin where the AI dressed over the grid suit)
const body = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public/assets/character/body/body.png')));
const pal = new Map(); for (const im of [st, body]) for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3] > 127) { const k = (im.data[i] << 16) | (im.data[i + 1] << 8) | im.data[i + 2]; if (!pal.has(k)) pal.set(k, { rgb: [im.data[i], im.data[i + 1], im.data[i + 2]], lab: oklab(im.data[i], im.data[i + 1], im.data[i + 2]) }); }
const P = [...pal.values()]; const memo = new Map();
const nearest = (r, g, b) => { const k = (r << 16) | (g << 8) | b; let v = memo.get(k); if (v) return v; const L = oklab(r, g, b); let d0 = 1e9; for (const p of P) { const d = (p.lab[0] - L[0]) ** 2 * 1.4 + (p.lab[1] - L[1]) ** 2 + (p.lab[2] - L[2]) ** 2; if (d < d0) { d0 = d; v = p.rgb; } } memo.set(k, v); return v; };
const dir = path.join(ROOT, 'public/assets/character/anim', cls);
const clips = clipArgs.length ? clipArgs : fs.readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
for (const clip of clips) {
  const f = path.join(dir, clip + '.png'); if (!fs.existsSync(f)) { console.log(`${cls}/${clip}: missing`); continue; }
  const im = PNG.sync.read(fs.readFileSync(f)); let n = 0;
  for (let i = 0; i < im.data.length; i += 4) { if (!im.data[i + 3]) continue; im.data[i + 3] = 255; const c = nearest(im.data[i], im.data[i + 1], im.data[i + 2]); if (c[0] !== im.data[i] || c[1] !== im.data[i + 1] || c[2] !== im.data[i + 2]) n++; im.data[i] = c[0]; im.data[i + 1] = c[1]; im.data[i + 2] = c[2]; }
  fs.writeFileSync(f, PNG.sync.write(im)); console.log(`${cls}/${clip}: ${n} px moved onto the still palette (${P.length} colours)`);
}
