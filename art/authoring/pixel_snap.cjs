// GRIMGE — pixel snapping for AI-generated pixel art (the user's step, done with Sprite Fusion's Pixel Snapper by hand).
// AI images are never on the true pixel grid: a "pixel" is a 5–6 px blob with blended edges. When the grid is known (the
// reference body: 184 cells over 1024 px), every cell takes its DOMINANT colour (counted on the cell's inner part, the
// blended border ignored) — real colours only, no blends. mergePalette then folds near-identical colours together.
//   node art/authoring/pixel_snap.cjs <in.png> <out.png> <cells=184> [mergeDistance=36]
const cp = require('child_process');
function readRaw(file) {
  const [w, h] = cp.execFileSync('magick', [file, '-format', '%w %h', 'info:']).toString().trim().split(' ').map(Number);
  const buf = cp.execFileSync('magick', [file, '-alpha', 'on', '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 28 }); return { w, h, buf };
}
// Snaps a w×h RGBA buffer to an n×n grid; returns an n*n*4 buffer.
function snap({ w, h, buf }, n) {
  const out = Buffer.alloc(n * n * 4);
  for (let cy = 0; cy < n; cy++) for (let cx = 0; cx < n; cx++) {
    let x0 = Math.floor(cx * w / n), x1 = Math.floor((cx + 1) * w / n), y0 = Math.floor(cy * h / n), y1 = Math.floor((cy + 1) * h / n);
    if (x1 - x0 >= 4) { x0++; x1--; } if (y1 - y0 >= 4) { y0++; y1--; } /* the inner part: the borders are where the AI blends */
    const bins = new Map();
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4; const key = ((buf[i] >> 3) << 10) | ((buf[i + 1] >> 3) << 5) | (buf[i + 2] >> 3);
      const b = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0, a: 0 }; b.n++; b.r += buf[i]; b.g += buf[i + 1]; b.b += buf[i + 2]; b.a += buf[i + 3]; bins.set(key, b);
    }
    let best = null; for (const b of bins.values()) if (!best || b.n > best.n) best = b;
    const o = (cy * n + cx) * 4; out[o] = Math.round(best.r / best.n); out[o + 1] = Math.round(best.g / best.n); out[o + 2] = Math.round(best.b / best.n); out[o + 3] = Math.round(best.a / best.n);
  }
  return out;
}
// Folds colours closer than `d` (sum of channel differences) into the more frequent one; only pixels with alpha > 0 and
// passing `use(i)` take part. Returns the palette size.
function mergePalette(buf, d = 36, use = () => true) {
  const count = new Map();
  for (let i = 0; i < buf.length; i += 4) if (buf[i + 3] && use(i)) { const k = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2]; count.set(k, (count.get(k) ?? 0) + 1); }
  const pal = []; const map = new Map();
  for (const [k] of [...count].sort((a, b) => b[1] - a[1])) {
    const r = k >> 16, g = (k >> 8) & 255, b = k & 255;
    const hit = pal.find((p) => Math.abs(p[0] - r) + Math.abs(p[1] - g) + Math.abs(p[2] - b) <= d);
    if (hit) map.set(k, hit); else { const p = [r, g, b]; pal.push(p); map.set(k, p); }
  }
  for (let i = 0; i < buf.length; i += 4) if (buf[i + 3] && use(i)) { const p = map.get((buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2]); buf[i] = p[0]; buf[i + 1] = p[1]; buf[i + 2] = p[2]; }
  return pal.length;
}
module.exports = { readRaw, snap, mergePalette };
if (require.main === module) {
  const [src, dst, cellsArg, dArg] = process.argv.slice(2); const n = Number(cellsArg ?? 184);
  const out = snap(readRaw(src), n); const colours = mergePalette(out, Number(dArg ?? 36));
  cp.execFileSync('magick', ['-size', `${n}x${n}`, '-depth', '8', 'rgba:-', `PNG32:${dst}`], { input: out });
  console.log(JSON.stringify({ cells: n, colours }));
}
