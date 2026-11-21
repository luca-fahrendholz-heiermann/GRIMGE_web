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
// ── unknown grid (free AI images): find the pixel size from the image itself ─────────────────────────────────────────
// Edge profile along one axis (colour jumps between neighbouring columns / rows, opaque pixels only); the true pixel size
// is the period whose phase-aligned samples land on the strongest edges. Multiples of it score as high (they hit a subset
// of the same edges), fractions score lower (they also hit flat insides) → the smallest period within 88 % of the best.
function edgeProfile({ w, h, buf }, axis) {
  const n = axis === 'x' ? w : h; const P = new Float64Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; const j = axis === 'x' ? (x > 0 ? i - 4 : -1) : (y > 0 ? i - w * 4 : -1); if (j < 0 || buf[i + 3] < 128 || buf[j + 3] < 128) continue;
    P[axis === 'x' ? x : y] += Math.abs(buf[i] - buf[j]) + Math.abs(buf[i + 1] - buf[j + 1]) + Math.abs(buf[i + 2] - buf[j + 2]);
  }
  return P;
}
function detectPeriod(Ps, lo = 3, hi = 16) {
  const list = Array.isArray(Ps) ? Ps : [Ps]; const means = list.map((P) => P.reduce((a, b) => a + b, 0) / P.length || 1); const scores = [];
  for (let s = lo; s <= hi; s += .025) {
    let v = 0; const phases = [];
    list.forEach((P, a) => { let best = { v: 0, phase: 0 }; for (let ph = 0; ph < s; ph += .25) { let sum = 0, k = 0; for (let t = ph; t < P.length; t += s) { sum += P[Math.round(t)] ?? 0; k++; } const q = sum / k / means[a]; if (q > best.v) best = { v: q, phase: ph }; } v += best.v; phases.push(best.phase); });
    scores.push({ s, v, phases });
  }
  const top = Math.max(...scores.map((o) => o.v)); return scores.find((o) => o.v >= top * .7); /* pixels are square: one size for both axes */
}
// Snaps an image of unknown grid: detects the pixel size per axis, takes each cell's dominant colour, hard alpha (a cell
// is either fully there or gone). Returns { w, h, buf, cell: [sx, sy] } at native pixel size.
function snapAuto(img, opts = {}) {
  const d = opts.cell ? { s: opts.cell, phases: [0, 0] } : detectPeriod([edgeProfile(img, 'x'), edgeProfile(img, 'y')]);
  const sx = d.s, sy = d.s, ox = d.phases[0], oy = d.phases[1];
  const cols = Math.floor((img.w - ox) / sx), rows = Math.floor((img.h - oy) / sy); const out = Buffer.alloc(cols * rows * 4);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    let x0 = Math.round(ox + cx * sx), x1 = Math.round(ox + (cx + 1) * sx), y0 = Math.round(oy + cy * sy), y1 = Math.round(oy + (cy + 1) * sy);
    if (x1 - x0 >= 4) { x0++; x1--; } if (y1 - y0 >= 4) { y0++; y1--; }
    const bins = new Map(); let opaque = 0, total = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * img.w + x) * 4; total++; if (img.buf[i + 3] < 128) continue; opaque++;
      const key = ((img.buf[i] >> 3) << 10) | ((img.buf[i + 1] >> 3) << 5) | (img.buf[i + 2] >> 3);
      const b = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }; b.n++; b.r += img.buf[i]; b.g += img.buf[i + 1]; b.b += img.buf[i + 2]; bins.set(key, b);
    }
    if (opaque * 2 < total) continue; /* hard alpha: mostly empty cells vanish */
    let best = null; for (const b of bins.values()) if (!best || b.n > best.n) best = b;
    const o = (cy * cols + cx) * 4; out[o] = Math.round(best.r / best.n); out[o + 1] = Math.round(best.g / best.n); out[o + 2] = Math.round(best.b / best.n); out[o + 3] = 255;
  }
  return { w: cols, h: rows, buf: out, cell: [+sx.toFixed(2), +sy.toFixed(2)] };
}
module.exports = { readRaw, snap, mergePalette, snapAuto, edgeProfile, detectPeriod };
if (require.main === module) {
  // node pixel_snap.cjs <in> <out> <cells|auto> [mergeDistance=36] — "auto" detects the grid (free AI images)
  const [src, dst, cellsArg, dArg] = process.argv.slice(2);
  if (cellsArg === 'auto') {
    const r = snapAuto(readRaw(src)); const colours = mergePalette(r.buf, Number(dArg ?? 36));
    cp.execFileSync('magick', ['-size', `${r.w}x${r.h}`, '-depth', '8', 'rgba:-', `PNG32:${dst}`], { input: r.buf });
    console.log(JSON.stringify({ cell: r.cell, size: [r.w, r.h], colours }));
  } else {
    const n = Number(cellsArg ?? 184);
    const out = snap(readRaw(src), n); const colours = mergePalette(out, Number(dArg ?? 36));
    cp.execFileSync('magick', ['-size', `${n}x${n}`, '-depth', '8', 'rgba:-', `PNG32:${dst}`], { input: out });
    console.log(JSON.stringify({ cells: n, colours }));
  }
}
