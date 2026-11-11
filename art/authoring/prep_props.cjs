// GRIMGE — cut a generated props sheet into game props (Campaign Alpha, 11 Nov 2026).
//   node art/authoring/prep_props.cjs <raw.png> <theme> <name1,name2,…>
// The sheet is one row of separate props on a (nearly) transparent background. Generated sheets carry a soft haze, so
// alpha is cut hard (pixel art has no half-transparent edges); the row is split at empty column gaps, every prop is
// cropped to its box, halved (nearest neighbour → the scenes' pixel density) and written to
// public/assets/scenes/props/<theme>_<name>.png. The raw sheet stays unchanged in art/generated/scenes/.
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const [raw, theme, namesArg] = process.argv.slice(2);
if (!raw || !theme || !namesArg) { console.error('usage: prep_props.cjs <raw.png> <theme> <names,comma>'); process.exit(1); }
const names = namesArg.split(','); const ALPHA = 200; const GAP = 10;
const src = PNG.sync.read(fs.readFileSync(raw)); const W = src.width; const H = src.height;
const solid = (x, y) => src.data[(y * W + x) * 4 + 3] >= ALPHA;
// Columns with content → runs separated by gaps.
const col = new Array(W).fill(0); for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (solid(x, y)) col[x]++;
const runs = []; let start = -1; let empty = 0;
for (let x = 0; x <= W; x++) {
  const has = x < W && col[x] > 1;
  if (has) { if (start < 0) start = x; empty = 0; } else if (start >= 0) { empty++; if (empty >= GAP || x === W) { runs.push([start, x - empty]); start = -1; empty = 0; } }
}
const big = runs.filter(([a, b]) => b - a >= 24);
if (big.length !== names.length) console.warn(`found ${big.length} props for ${names.length} names — check the sheet`);
const dir = path.resolve(__dirname, '../../public/assets/scenes/props'); fs.mkdirSync(dir, { recursive: true });
big.slice(0, names.length).forEach(([x0, x1], i) => {
  let y0 = H; let y1 = 0; for (let x = x0; x <= x1; x++) for (let y = 0; y < H; y++) if (solid(x, y)) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const w = Math.ceil((x1 - x0 + 1) / 2); const h = Math.ceil((y1 - y0 + 1) / 2); const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(x1, x0 + x * 2); const sy = Math.min(y1, y0 + y * 2); const si = (sy * W + sx) * 4; const oi = (y * w + x) * 4;
    if (src.data[si + 3] >= ALPHA) { out.data[oi] = src.data[si]; out.data[oi + 1] = src.data[si + 1]; out.data[oi + 2] = src.data[si + 2]; out.data[oi + 3] = 255; }
  }
  fs.writeFileSync(path.join(dir, `${theme}_${names[i]}.png`), PNG.sync.write(out));
  console.log(`${theme}_${names[i]}: ${w}x${h}`);
});
