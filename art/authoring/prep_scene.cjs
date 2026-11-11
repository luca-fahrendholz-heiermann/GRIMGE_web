// GRIMGE — prepare a generated campaign scene for the game (Campaign Alpha, 11 Nov 2026).
//   node art/authoring/prep_scene.cjs <raw.png> <id> <floorY>
// raw.png   the generated wide scene (kept unchanged in art/generated/scenes/)
// id        scene id → public/assets/scenes/campaign/<id>.png
// floorY    pixel row in the raw image where the back wall meets the floor
// The game's far ground line sits at 54 % of the stage height, so the top of the image is cropped until the wall / floor
// edge lands there. The colours are reduced to a fixed-size palette (median cut) so the scene reads as flat pixel art
// next to the characters instead of soft, noisy shading.
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const [raw, id, floorArg, colorsArg] = process.argv.slice(2);
if (!raw || !id || !floorArg) { console.error('usage: prep_scene.cjs <raw.png> <id> <floorY> [colors]'); process.exit(1); }
const FLOOR_LINE = .54; const COLORS = Number(colorsArg) || 56;
const src = PNG.sync.read(fs.readFileSync(raw)); const floorY = Number(floorArg);
const crop = Math.max(0, Math.round((floorY - FLOOR_LINE * src.height) / (1 - FLOOR_LINE)));
const W = src.width; const H = src.height - crop;

// Median cut over the cropped pixels.
const px = []; for (let y = crop; y < src.height; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; px.push([src.data[i], src.data[i + 1], src.data[i + 2]]); }
let boxes = [px.map((_, i) => i)];
while (boxes.length < COLORS) {
  let best = -1; let bestRange = -1; let bestCh = 0;
  boxes.forEach((b, bi) => { if (b.length < 2) return; for (let c = 0; c < 3; c++) { let lo = 255, hi = 0; for (const i of b) { const v = px[i][c]; if (v < lo) lo = v; if (v > hi) hi = v; } const r = (hi - lo) * Math.sqrt(b.length); if (r > bestRange) { bestRange = r; best = bi; bestCh = c; } } });
  if (best < 0) break;
  const b = boxes[best].sort((p, q) => px[p][bestCh] - px[q][bestCh]); const mid = b.length >> 1;
  boxes.splice(best, 1, b.slice(0, mid), b.slice(mid));
}
const out = new PNG({ width: W, height: H });
for (const b of boxes) {
  const m = [0, 0, 0]; for (const i of b) { m[0] += px[i][0]; m[1] += px[i][1]; m[2] += px[i][2]; }
  const c = m.map((v) => Math.round(v / b.length));
  for (const i of b) { const o = i * 4; out.data[o] = c[0]; out.data[o + 1] = c[1]; out.data[o + 2] = c[2]; out.data[o + 3] = 255; }
}
const dir = path.resolve(__dirname, '../../public/assets/scenes/campaign'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${id}.png`), PNG.sync.write(out));
console.log(`${id}: ${W}x${H}, cropped ${crop}px from the top, ${boxes.length} colours`);
