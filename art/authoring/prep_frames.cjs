// GRIMGE — turn a generated character sprite sheet (one row of poses) into game frames (Campaign Alpha, 11 Nov 2026).
//   node art/authoring/prep_frames.cjs <raw.png> <out name> <frames> <target height | @scale> [alpha] [cut=x1,x2]
// cut=…  raw x positions where two poses touch (a bolt reaching the next pose): a 3 px gap is cleared there first.
// The poses are found as connected shapes (so a lunge that reaches into the neighbour's space still belongs to its own
// pose; small loose bits such as sparks join the nearest pose), alpha is cut hard, every pose is scaled with nearest
// neighbour to the hero's own pixel size and placed in equal cells with the feet on one line and the feet's centre in
// the middle. Writes public/assets/sprites/sheets/<name>.png and prints the cell size, anchor and scale for sprites.js.
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const [raw, name, framesArg, sizeArg, ...rest] = process.argv.slice(2);
const alphaArg = rest.find((a) => /^d+$/.test(a)); const cuts = (rest.find((a) => a.startsWith('cut=')) ?? 'cut=').slice(4).split(',').filter(Boolean).map(Number);
if (!raw || !name || !framesArg || !sizeArg) { console.error('usage: prep_frames.cjs <raw.png> <name> <frames> <height|@scale> [alpha]'); process.exit(1); }
const N = Number(framesArg); const ALPHA = Number(alphaArg) || 200;
const src = PNG.sync.read(fs.readFileSync(raw)); const W = src.width; const H = src.height;
const solid = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) solid[i] = src.data[i * 4 + 3] >= ALPHA ? 1 : 0;
for (const cx of cuts) for (let y = 0; y < H; y++) for (let x = cx - 1; x <= cx + 1; x++) if (x >= 0 && x < W) solid[y * W + x] = 0;
// Connected components (8-neighbourhood).
const label = new Int32Array(W * H).fill(-1); const comps = [];
for (let s = 0; s < W * H; s++) {
  if (!solid[s] || label[s] >= 0) continue;
  const id = comps.length; const c = { n: 0, x0: W, x1: 0, y0: H, y1: 0, sx: 0 }; const stack = [s]; label[s] = id;
  while (stack.length) {
    const p = stack.pop(); const x = p % W; const y = (p / W) | 0; c.n++; c.sx += x; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx; const ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const q = ny * W + nx; if (solid[q] && label[q] < 0) { label[q] = id; stack.push(q); } }
  }
  comps.push(c);
}
const tallest = Math.max(...comps.map((c) => c.y1 - c.y0));
const bodies = comps.map((c, id) => ({ ...c, id })).filter((c) => c.y1 - c.y0 >= tallest * .4).sort((a, b) => b.n - a.n).slice(0, N).sort((a, b) => a.sx / a.n - b.sx / b.n);
if (bodies.length !== N) { console.error(`found ${bodies.length} poses, wanted ${N}`); process.exit(1); }
// Loose bits (≥ 6 px) join the nearest pose; dust smaller than that is dropped.
const owner = new Int32Array(comps.length).fill(-1); bodies.forEach((b, k) => { owner[b.id] = k; });
comps.forEach((c, id) => { if (owner[id] >= 0 || c.n < 6) return; const cx = c.sx / c.n; let best = 0; let bd = Infinity; bodies.forEach((b, k) => { const d = cx < b.x0 ? b.x0 - cx : cx > b.x1 ? cx - b.x1 : 0; if (d < bd) { bd = d; best = k; } }); if (bd < 40) owner[id] = best; });
// Pose boxes, feet line and feet centre (the lowest 6 % of the body).
const poses = bodies.map((b, k) => {
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let i = 0; i < W * H; i++) { if (label[i] < 0 || owner[label[i]] !== k) continue; const x = i % W; const y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const footTop = b.y1 - Math.max(2, Math.round((b.y1 - b.y0) * .06)); let fx0 = W, fx1 = 0;
  for (let y = footTop; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (label[y * W + x] === b.id) { if (x < fx0) fx0 = x; if (x > fx1) fx1 = x; }
  return { k, x0, x1, y0, y1, feetY: b.y1, feetX: (fx0 + fx1) / 2, bodyH: b.y1 - b.y0 + 1 };
});
const scale = sizeArg.startsWith('@') ? Number(sizeArg.slice(1)) : Number(sizeArg) / poses[0].bodyH;
// Equal cells: room left / right of the feet centre and above the feet line for the widest pose.
const left = Math.ceil(Math.max(...poses.map((p) => p.feetX - p.x0)) * scale) + 2; const right = Math.ceil(Math.max(...poses.map((p) => p.x1 - p.feetX)) * scale) + 2;
const up = Math.ceil(Math.max(...poses.map((p) => p.feetY - p.y0)) * scale) + 2; const down = Math.ceil(Math.max(...poses.map((p) => p.y1 - p.feetY)) * scale) + 2;
const cw = left + right; const ch = up + down; const out = new PNG({ width: cw * N, height: ch });
poses.forEach((p, i) => {
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const sx = Math.round(p.feetX + (x - left + .5) / scale - .5); const sy = Math.round(p.feetY + (y - up + .5) / scale - .5);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue; const q = sy * W + sx; if (label[q] < 0 || owner[label[q]] !== p.k) continue;
    const oi = (y * out.width + i * cw + x) * 4; out.data[oi] = src.data[q * 4]; out.data[oi + 1] = src.data[q * 4 + 1]; out.data[oi + 2] = src.data[q * 4 + 2]; out.data[oi + 3] = 255;
  }
});
const dir = path.resolve(__dirname, '../../public/assets/sprites/sheets'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${name}.png`), PNG.sync.write(out));
console.log(JSON.stringify({ name, frames: N, w: cw, h: ch, anchorX: left, anchorY: up, scale: Number(scale.toFixed(4)), bodyH: poses.map((p) => p.bodyH) }));
