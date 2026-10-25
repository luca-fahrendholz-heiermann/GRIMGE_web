// GRIMGE — quick preview of authored sheets: all frames side by side, scaled up (nearest), on an arena-like
// floor colour, written to a PNG for review.  node art/authoring/preview_sheet.cjs <module> <exportFn> <out.png> [scale]
const path = require('path'); const fs = require('fs'); const { PNG } = require('pngjs');
const [mod, fn, out, scaleArg] = process.argv.slice(2); const S = Number(scaleArg) || 3;
const sheets = require(path.resolve(mod))[fn]();
const rows = sheets.map((sh) => ({ sh, w: sh.fw * sh.frames * S + (sh.frames - 1) * 4, h: sh.fh * S }));
const W = Math.max(...rows.map((r) => r.w)) + 8; const H = rows.reduce((a, r) => a + r.h + 8, 8);
const png = new PNG({ width: W, height: H });
for (let i = 0; i < W * H; i++) { const x = i % W; const y = Math.floor(i / W); const c = ((x >> 4) + (y >> 4)) % 2 ? [150, 112, 62] : [138, 102, 55]; png.data.set([...c, 255], i * 4); }
let oy = 8;
for (const { sh, h } of rows) {
  for (let f = 0; f < sh.frames; f++) for (let y = 0; y < sh.fh; y++) for (let x = 0; x < sh.fw; x++) {
    const si = ((y * sh.png.width) + f * sh.fw + x) * 4; if (!sh.png.data[si + 3]) continue;
    for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) { const X = 4 + f * (sh.fw * S + 4) + x * S + dx; const Y = oy + y * S + dy; png.data.set([sh.png.data[si], sh.png.data[si + 1], sh.png.data[si + 2], sh.png.data[si + 3]], (Y * W + X) * 4); }
  }
  oy += h + 8;
}
fs.writeFileSync(out, PNG.sync.write(png)); console.log('preview', out, W, H);
