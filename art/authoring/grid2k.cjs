// GRIMGE — 2k dressing grids at the reference body's own pixel size (user, 21 Nov 2026, Sprite Fusion comparison: a single
// figure over 1024 px is drawn by the AI at ~5.6 px per pixel and snaps clean; nine figures in a 1024 grid get ~2.7 px and
// come back painted, so no snap can make them crisp). The 8 frames of a base sheet are laid into a 2048² key-green grid,
// every game pixel an exact block of 1024/184 px (layoutFor picks 4×2 or 3×3), skin below the head in a dark suit (bare
// torsos are flagged by the generator). The dressed result goes back through dress_full.cjs (it sees the 2048 size and
// uses the same layout).
//   node art/authoring/grid2k.cjs <sheet.png> <out.png>
const fs = require('fs'); const { PNG } = require('pngjs'); const { layoutFor, cellOrigin } = require('./grid_resample.cjs');
const [sheet, out] = process.argv.slice(2);
const im = PNG.sync.read(fs.readFileSync(sheet)); const n = 8, fw = im.width / n, fh = im.height; const L = layoutFor(fw, fh);
const g = new PNG({ width: L.W, height: L.W }); for (let i = 0; i < g.data.length; i += 4) g.data.set([22, 210, 5, 255], i);
for (let k = 0; k < n; k++) {
  let top = fh; for (let y = 0; y < fh && top === fh; y++) for (let x = 0; x < fw; x++) if (im.data[(y * im.width + k * fw + x) * 4 + 3]) { top = y; break; }
  const [cx, cy] = cellOrigin(L, fw, fh, k);
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    const si = (y * im.width + k * fw + x) * 4; if (im.data[si + 3] < 128) continue; let r = im.data[si], gg = im.data[si + 1], b = im.data[si + 2];
    if (y >= top + 30 && r > gg && gg > b && r - b > 40 && r > 80) { const l = (r + gg + b) / 3; const d = Math.round(30 + l * .28); r = d; gg = d; b = d + 8; } /* the dark suit */
    const x0 = cx + Math.round(x * L.S), x1 = cx + Math.round((x + 1) * L.S), y0 = cy + Math.round(y * L.S), y1 = cy + Math.round((y + 1) * L.S);
    for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) g.data.set([r, gg, b, 255], (py * L.W + px) * 4);
  }
}
fs.writeFileSync(out, PNG.sync.write(g)); console.log(JSON.stringify({ grid: out, layout: L, frame: [fw, fh] }));
