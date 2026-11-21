// GRIMGE — stable-mount sheet meta for public/src/mounts.js (MOUNT_META).
//   node art/authoring/mount_meta.cjs <id> [<id> …]
// Reads public/assets/creatures/mounts/<id>_run.png (8 frames side by side, from gif_sheets.cjs) and finds per frame the
// SEAT: the mounts are drawn with a crimson saddle, so the top of the crimson pixels (and their centre x) is where the
// rider's seat goes. Also the body box over all frames (the renderer stands the body on its feet). Writes the result
// into the /*META*/…/*END*/ block of public/src/mounts.js.
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const ROOT = path.resolve(__dirname, '../..'); const SRC = path.join(ROOT, 'public/src/mounts.js');
const crimson = (r, g, b) => r > 120 && r > g * 2.2 && r > b * 1.8 && g < 90; /* saddle red, not orange fire or brown leather */
const ids = process.argv.slice(2); const src = fs.readFileSync(SRC, 'utf8'); const meta = JSON.parse(/\/\*META\*\/([\s\S]*?)\/\*END\*\//.exec(src)[1]);
for (const id of ids) {
  const im = PNG.sync.read(fs.readFileSync(path.join(ROOT, `public/assets/creatures/mounts/${id}_run.png`))); const n = 8; const fw = im.width / n; const fh = im.height;
  let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1; const seat = [];
  for (let k = 0; k < n; k++) {
    const red = new Uint8Array(fw * fh);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const i = (y * im.width + k * fw + x) * 4; if (!im.data[i + 3]) continue;
      bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
      if (crimson(im.data[i], im.data[i + 1], im.data[i + 2])) red[y * fw + x] = 1;
    }
    // the saddle = the largest connected crimson patch (red tassels, eyes or straps are small)
    const lab = new Int32Array(fw * fh); let best = null;
    for (let s = 0; s < red.length; s++) {
      if (!red[s] || lab[s]) continue; const st = [s]; lab[s] = 1; const pts = [];
      while (st.length) { const p = st.pop(); pts.push(p); const x = p % fw, y = (p / fw) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= fw || ny >= fh) continue; const q = ny * fw + nx; if (red[q] && !lab[q]) { lab[q] = 1; st.push(q); } } }
      if (!best || pts.length > best.length) best = pts;
    }
    if (!best || best.length < 6) { seat.push(null); continue; }
    const top = Math.min(...best.map((p) => (p / fw) | 0)); const xs = best.filter((p) => ((p / fw) | 0) <= top + 2).map((p) => p % fw);
    seat.push([Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), top]);
  }
  const found = seat.filter(Boolean); if (!found.length) { console.error(`${id}: no crimson saddle found`); continue; }
  const fill = found[0]; for (let k = 0; k < n; k++) seat[k] ??= fill; /* a frame without visible saddle borrows one */
  // a seat far off the clip's median (a reddish flame patch won) takes the mean of its neighbours — no rider jumps
  const med = (a) => [...a].sort((p, q) => p - q)[a.length >> 1]; const my = med(seat.map((s) => s[1])), mx = med(seat.map((s) => s[0]));
  const bad = seat.map((s) => Math.abs(s[1] - my) > 8 || Math.abs(s[0] - mx) > 30);
  for (let k = 0; k < n; k++) if (bad[k]) { const nb = [seat[(k + n - 1) % n], seat[(k + 1) % n]].filter((_, j) => !bad[(k + (j ? 1 : n - 1)) % n]); const src = nb.length ? nb : [[mx, my]]; seat[k] = [Math.round(src.reduce((a, s) => a + s[0], 0) / src.length), Math.round(src.reduce((a, s) => a + s[1], 0) / src.length)]; }
  meta[id] = { fw, fh, bx: bx0, by: by0, bw: bx1 - bx0 + 1, bh: by1 - by0 + 1, seat };
  console.log(id, JSON.stringify(meta[id]));
}
fs.writeFileSync(SRC, src.replace(/\/\*META\*\/[\s\S]*?\/\*END\*\//, `/*META*/${JSON.stringify(meta)}/*END*/`));
