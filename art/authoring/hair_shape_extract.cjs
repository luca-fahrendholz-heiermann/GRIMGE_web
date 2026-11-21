// GRIMGE — cut the shape-changed hair (transformation hair: longer, rising, burning …) out of an AI-edited hair grid.
//   node art/authoring/hair_shape_extract.cjs <out.png> <grid.txt> <tf> <outDir>
// The grid (hairgrid/grid_N.png) holds 6 cells (2×3) of the body in a plain tunic with one hairstyle each, rows 0–120 of the
// 184 body at 512×334 px; the AI changed only the hair. Each cell is snapped back onto the body grid, laid over the tunic
// body and cut with prep_layers.cjs against the tunic body → the new hair layer <hair>_hair_<tf>.png (pixel-exact on 184).
const fs = require('fs'); const path = require('path'); const cp = require('child_process'); const os = require('os');
const { readRaw, snapAuto } = require('./pixel_snap.cjs');
const [outPng, listTxt, tf, outDir] = process.argv.slice(2); fs.mkdirSync(outDir, { recursive: true });
const names = fs.readFileSync(listTxt, 'utf8').split(/\r?\n/).filter(Boolean);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hairshape-')); const TUNIC = path.join(path.dirname(listTxt), 'body_tunic.png');
// background (white or green, whatever came back) → transparent, by flood fill from the corner
cp.execFileSync('magick', [outPng, '-alpha', 'set', '-fuzz', '7%', '-fill', 'none', '-draw', 'color 0,0 floodfill', path.join(tmp, 'clean.png')]);
names.forEach((hair, k) => {
  const col = k % 2, row = Math.floor(k / 2); const cell = path.join(tmp, `c${k}.png`);
  cp.execFileSync('magick', [path.join(tmp, 'clean.png'), '-crop', `512x334+${col * 512}+${row * 334}`, '+repage', `PNG32:${cell}`]);
  const r = snapAuto(readRaw(cell), { cell: 512 / 184 }); // 184 × 120
  const full = path.join(tmp, `full${k}.png`);
  cp.execFileSync('magick', ['-size', `${r.w}x${r.h}`, '-depth', '8', 'rgba:-', `PNG32:${path.join(tmp, 'top.png')}`], { input: r.buf });
  cp.execFileSync('magick', [TUNIC, '(', path.join(tmp, 'top.png'), '-background', 'none', '-extent', '184x184', ')', '-compose', 'over', '-composite', '-filter', 'point', '-resize', '1024x1024', `PNG32:${full}`]);
  const base = hair.replace('_hair.png', '');
  cp.execFileSync('node', [path.join(__dirname, 'prep_layers.cjs'), full, tmp, `${base}_${tf}`, '200'], { env: { ...process.env, BODY_REF: TUNIC }, stdio: 'ignore' });
  fs.copyFileSync(path.join(tmp, `${base}_${tf}_hair.png`), path.join(outDir, tf === '-' ? `${base}.png` : `${base}_hair_${tf}.png`)); /* tf '-': a plain asset (beard, face detail) */
  console.log('ok', base, tf);
});
fs.rmSync(tmp, { recursive: true, force: true });
