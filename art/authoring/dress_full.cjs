// GRIMGE — full-figure class animations (user, 21 Nov 2026: "Outfits werden am besten samt Körper extrahiert, sodass nur
// noch der Kopf wieder drauf muss und die Körperfarbe gleich sein muss"). Instead of an outfit layer cut against the base
// frame (gaps, stray pixels, skin through holes), the whole dressed figure the AI drew is taken per frame; then
//   1. every colour is locked to the class still's palette + the reference body's palette (skin = the body's own skin),
//   2. the reference head goes back on, pixel-exact, at the frame's head anchor (skull, eyes, nose; jaw kept),
//   3. stray islands are removed.
//   node art/authoring/dress_full.cjs <class> <outfitStill> <clip> <aiGrid.png> [<clip> <aiGrid.png> …]
// Output: public/assets/character/anim_full/<class>/<clip>.png (same frame geometry as public/assets/sprites/sheets/base_<clip>.png).
const fs = require('fs'); const path = require('path'); const cp = require('child_process'); const os = require('os'); const { PNG } = require('pngjs'); const { resampleGrid, layoutFor } = require('./grid_resample.cjs');
const ROOT = path.resolve(__dirname, '../..');
const [cls, still, ...pairs] = process.argv.slice(2);
const lin = (c) => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const oklab = (r, g, b) => { const R = lin(r), G = lin(g), B = lin(b); const l = Math.cbrt(.4122 * R + .5363 * G + .0514 * B), m = Math.cbrt(.2119 * R + .6807 * G + .1074 * B), s = Math.cbrt(.0883 * R + .2817 * G + .6300 * B); return [.2105 * l + .7936 * m - .0041 * s, 1.978 * l - 2.4286 * m + .4506 * s, .0259 * l + .7828 * m - .8087 * s]; };
const body = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public/assets/character/body/body.png')));
const st = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public/assets/character/outfit', `${still}.png`)));
const pal = new Map(); for (const im of [st, body]) for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3] > 127) { const k = (im.data[i] << 16) | (im.data[i + 1] << 8) | im.data[i + 2]; if (!pal.has(k)) pal.set(k, { rgb: [im.data[i], im.data[i + 1], im.data[i + 2]], lab: oklab(im.data[i], im.data[i + 1], im.data[i + 2]) }); }
const P = [...pal.values()]; const memo = new Map();
const nearest = (r, g, b) => { const k = (r << 16) | (g << 8) | b; let v = memo.get(k); if (v) return v; const L = oklab(r, g, b); let d0 = 1e9; for (const p of P) { const d = (p.lab[0] - L[0]) ** 2 * 1.4 + (p.lab[1] - L[1]) ** 2 + (p.lab[2] - L[2]) ** 2; if (d < d0) { d0 = d; v = p.rgb; } } memo.set(k, v); return v; };
const anchorsSrc = fs.readFileSync(path.join(ROOT, 'public/src/head_anchors.js'), 'utf8'); const A = JSON.parse(/\/\*META\*\/([\s\S]*?)\/\*END\*\//.exec(anchorsSrc)[1]);
const HEAD = { x0: 80, y0: 30, x1: 108, y1: 55 }; const MINQ = .6;
const outDir = path.join(ROOT, 'public/assets/character/anim_full', cls); fs.mkdirSync(outDir, { recursive: true });
for (let p = 0; p < pairs.length; p += 2) {
  const clip = pairs[p], ai = pairs[p + 1]; const base = path.join(ROOT, `public/assets/sprites/sheets/base_${clip}.png`);
  if (!fs.existsSync(base) || !fs.existsSync(ai)) { console.log(`${cls}/${clip}: missing base or AI grid`); continue; }
  const bs = PNG.sync.read(fs.readFileSync(base)); const n = 8, fw = bs.width / n, fh = bs.height;
  // 1. resample the AI grid by palette vote: colours are the class still + the body (skin = the body's own skin colours)
  const aiW = Number(cp.execFileSync('magick', [ai, '-format', '%w', 'info:']).toString()); const big = aiW > 1500; /* 2k grids (grid2k.cjs): frames at the body's own pixel size */
  const r = resampleGrid({ ai, fw, fh, picks: [...Array(n).keys()], palette: P.map((p) => p.rgb), layout: big ? layoutFor(fw, fh) : null, phase: big, base: big ? bs : null }); const im = { width: r.width, height: r.height, data: r.buf };
  // 2. the reference head (only if ≥ 6 of 8 frames show it clearly — no switching between two faces mid-clip)
  const anchors = A[`base_${clip}`] ?? []; const good = anchors.filter((a) => a[2] >= MINQ).length; let heads = 0;
  if (good >= 6) anchors.forEach(([ox, oy, q], k) => { if (q < MINQ) return; heads++; for (let y = HEAD.y0; y <= HEAD.y1; y++) for (let x = HEAD.x0; x <= HEAD.x1; x++) { const bi = (y * 184 + x) * 4; if (body.data[bi + 3] < 128) continue; const fx = x + ox, fy = y + oy; if (fx < 0 || fy < 0 || fx >= fw || fy >= fh) continue; const di = (fy * im.width + k * fw + fx) * 4; im.data.set([body.data[bi], body.data[bi + 1], body.data[bi + 2], 255], di); } });
  // 3. stray islands (< 10 px, per frame)
  const seen = new Uint8Array(im.width * fh); let removed = 0;
  for (let s = 0; s < im.width * fh; s++) { if (seen[s] || !im.data[s * 4 + 3]) continue; const fr = Math.floor((s % im.width) / fw); const stck = [s]; seen[s] = 1; const pts = [];
    while (stck.length) { const q = stck.pop(); pts.push(q); const x = q % im.width, y = (q / im.width) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= im.width || ny >= fh || Math.floor(nx / fw) !== fr) continue; const t = ny * im.width + nx; if (!seen[t] && im.data[t * 4 + 3]) { seen[t] = 1; stck.push(t); } } }
    if (pts.length < 10) { removed += pts.length; for (const q of pts) im.data[q * 4 + 3] = 0; } }
  const png = new PNG({ width: im.width, height: im.height }); im.data.copy(png.data); fs.writeFileSync(path.join(outDir, `${clip}.png`), PNG.sync.write(png));
  console.log(`${cls}/${clip}: full figure, ${heads}/8 reference heads, ${removed} stray px`);
}
