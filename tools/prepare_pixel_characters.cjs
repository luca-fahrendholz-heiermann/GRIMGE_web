// GRIMGE — prepares the user's pixel-art character images as game sprites (21 Oct 2026).
//   node tools/prepare_pixel_characters.cjs [sourceDir]
// The sources are upscaled pixel art (one art pixel ≈ GRID source pixels, slightly noisy).
// Every character pair (base + variant / idle frame) gets ONE shared crop so swapping
// the frames never jumps; each art pixel is sampled back to its true size (majority
// colour of the cell centre), alpha becomes hard (pixel edges), and the faint light
// ground line under the feet is removed.
const path = require('path');
const io = require('./png_io.cjs');

const SRC = process.argv[2] ?? 'C:/Dev/unity_projects/GRIMGE/Docs/References/03_characters';
const OUT = path.join(__dirname, '..', 'public', 'assets', 'sprites');
const GRID = 6.5; // detected period of the art-pixel grid in all four sources
const SETS = [
  { files: ['Thesen_char_v1.png', 'Thesen_char_v2.png'], out: ['char_thesen.png', 'char_thesen_focus.png'] },
  { files: ['Xame_v1.png', 'Xame_v2.png'], out: ['char_xame_0.png', 'char_xame_1.png'] }
];

const opaque = (px, i) => px[i + 3] > 110;
function bbox(img) {
  const { w, h, px } = img; let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (opaque(px, (y * w + x) * 4) && !isGroundLine(img, x, y)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  return { minX, minY, maxX, maxY };
}
// The faint whitish ground line drawn under the feet in the sources.
function isGroundLine(img, x, y) {
  const i = (y * img.w + x) * 4; const px = img.px;
  return px[i] > 200 && px[i + 1] > 200 && px[i + 2] > 200 && y > img.h * .7;
}
// Majority colour of the 3×3 source pixels around a cell centre (removes resampling noise).
function sampleCell(img, cx, cy) {
  const { w, h, px } = img; const votes = new Map(); let alpha = 0; let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = Math.round(cx + dx); const y = Math.round(cy + dy); if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = (y * w + x) * 4; n++; if (!opaque(px, i) || isGroundLine(img, x, y)) continue; alpha++;
    const key = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
    const v = votes.get(key) ?? { c: 0, r: 0, g: 0, b: 0 }; v.c++; v.r += px[i]; v.g += px[i + 1]; v.b += px[i + 2]; votes.set(key, v);
  }
  if (alpha * 2 < n) return null; // mostly transparent → transparent art pixel
  let best = null; for (const v of votes.values()) if (!best || v.c > best.c) best = v;
  return [Math.round(best.r / best.c), Math.round(best.g / best.c), Math.round(best.b / best.c)];
}

for (const set of SETS) {
  const imgs = set.files.map((f) => io.readPng(path.join(SRC, f)));
  const boxes = imgs.map(bbox);
  const box = { minX: Math.min(...boxes.map((b) => b.minX)), minY: Math.min(...boxes.map((b) => b.minY)), maxX: Math.max(...boxes.map((b) => b.maxX)), maxY: Math.max(...boxes.map((b) => b.maxY)) };
  const cols = Math.ceil((box.maxX - box.minX + 1) / GRID); const rows = Math.ceil((box.maxY - box.minY + 1) / GRID);
  const pad = 2; const w = cols + pad * 2; const h = rows + pad * 2;
  imgs.forEach((img, k) => {
    const px = Buffer.alloc(w * h * 4);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const col = sampleCell(img, box.minX + (c + .5) * GRID, box.minY + (r + .5) * GRID); if (!col) continue;
      const i = ((r + pad) * w + c + pad) * 4; px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
    }
    io.writePng(path.join(OUT, set.out[k]), { w, h, px });
    console.log(`${set.files[k]} → ${set.out[k]} (${w}×${h})`);
  });
}
