// GRIMGE — cut swappable layers (outfit, hair) from an AI-dressed version of the reference body.
// node art/authoring/prep_layers.cjs <dressed.png (1024, green bg)> <outDir> <name> [headRows=58]
// The reference body (art_source/body/body_184.png, native 184x184, green #16D205) is never altered: the dressed image is
// snapped to the 184 grid (pixel_snap.cjs), aligned to the body (best shift), and every pixel that differs from the body becomes a layer pixel.
// Rows above `headRows` go to the hair layer, the rest to the outfit layer. The preview composites body + outfit + hair.
const fs = require('fs'); const path = require('path'); const cp = require('child_process');
const [src, outDir, name, headArg] = process.argv.slice(2); const HEAD = Number(headArg ?? 58);
const ROOT = path.resolve(__dirname, '../..'); const BODY = path.join(ROOT, 'art_source/body/body_184.png');
const N = 184; fs.mkdirSync(outDir, { recursive: true });
const raw = (file, filter) => cp.execFileSync('magick', [file, ...(filter ? ['-filter', filter, '-resize', `${N}x${N}!`] : []), '-alpha', 'on', '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 26 });
const { readRaw, snap, mergePalette } = require('./pixel_snap.cjs');
const B = raw(BODY); const R = snap(readRaw(src), N); /* pixel-perfect: each cell's dominant colour (the user's Pixel Snapper step) */
const GREEN = [22, 210, 5];
const dist = (a, i, b, j) => Math.abs(a[i] - b[j]) + Math.abs(a[i + 1] - b[j + 1]) + Math.abs(a[i + 2] - b[j + 2]);
const isGreen = (a, i) => (a[i + 1] > 150 && a[i] < 110 && a[i + 2] < 110 && a[i + 1] - Math.max(a[i], a[i + 2]) > 70) || (a[i + 1] > 80 && a[i + 1] - Math.max(a[i], a[i + 2]) > 40); /* the key green and its blends with the outline */
// best shift: the body's outline should sit where the dressed figure's is (the AI may nudge the figure a few pixels)
let best = { dx: 0, dy: 0, s: Infinity };
for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
  let s = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const sx = x + dx, sy = y + dy; if (sx < 0 || sy < 0 || sx >= N || sy >= N) continue;
    const bi = (y * N + x) * 4, ri = (sy * N + sx) * 4; if (isGreen(B, bi)) continue; /* only body pixels: are they covered by figure? */
    if (isGreen(R, ri)) s += 3; else s += Math.min(1, dist(B, bi, R, ri) / 200);
  }
  if (s < best.s) best = { dx, dy, s };
}
const L = Buffer.alloc(N * N * 4); let count = 0;
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const sx = x + best.dx, sy = y + best.dy; const o = (y * N + x) * 4; if (sx < 0 || sy < 0 || sx >= N || sy >= N) continue;
  const ri = (sy * N + sx) * 4; if (isGreen(R, ri)) continue;
  const bodyHere = !isGreen(B, o); const skin = (a, i) => a[i] > a[i + 1] && a[i + 1] > a[i + 2] && a[i] - a[i + 2] > 50 && a[i] > 90; if (bodyHere && dist(B, o, R, ri) < (y < HEAD ? 150 : 90)) continue; /* the body shows through unchanged (the face more strictly) */ if (bodyHere && y < HEAD && skin(B, o) && skin(R, ri)) continue; /* the AI's retouched face: keep the body's own */
  L[o] = R[ri]; L[o + 1] = R[ri + 1]; L[o + 2] = R[ri + 2]; L[o + 3] = 255; count++;
}
// drop lone pixels (resampling noise along the outline)
const keep = Buffer.from(L);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const o = (y * N + x) * 4; if (!L[o + 3]) continue; let n = 0;
  for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + ax, Y = y + ay; if (X >= 0 && Y >= 0 && X < N && Y < N && L[(Y * N + X) * 4 + 3]) n++; }
  if (n === 0) { keep[o + 3] = 0; count--; }
}
const colours = mergePalette(keep, Number(process.env.MERGE ?? 36)); /* fold the AI's near-duplicate shades — no dithering, every pixel stays one solid colour */
const split = (top) => { const out = Buffer.alloc(N * N * 4); for (let y = 0; y < N; y++) if ((y < HEAD) === top) keep.copy(out, y * N * 4, y * N * 4, (y + 1) * N * 4); return out; };
const write = (buf, file) => cp.execFileSync('magick', ['-size', `${N}x${N}`, '-depth', '8', 'rgba:-', `PNG32:${file}`], { input: buf });
const fHair = path.join(outDir, `${name}_hair.png`), fOut = path.join(outDir, `${name}_outfit.png`), fBody = path.join(outDir, 'body.png');
write(split(true), fHair); write(split(false), fOut);
cp.execFileSync('magick', [BODY, '-fuzz', '8%', '-transparent', 'rgb(22,210,5)', `PNG32:${fBody}`]); /* the key green (8 %: two off-key background pixels between arm and torso); skin, outline and eyes are far from it and stay untouched */
cp.execFileSync('magick', [fBody, fOut, '-composite', fHair, '-composite', `PNG32:${path.join(outDir, `${name}_composite.png`)}`]);
cp.execFileSync('magick', ['-size', `${N}x${N}`, 'xc:rgb(58,96,64)', path.join(outDir, `${name}_composite.png`), '-composite', '-filter', 'point', '-resize', '400%', path.join(outDir, `${name}_preview.png`)]);
console.log(JSON.stringify({ shift: [best.dx, best.dy], layerPixels: count, colours }));
