// GRIMGE — remove stray pixels from extracted layers (user, 21 Nov 2026: "bei jedem Asset noch überall Pixel verteilt, die
// nichts mit dem Asset zu tun haben"). Cutting AI art against the body leaves specks wherever the AI's pixel differed a
// little from the body's; they show as noise on the character, flicker between animation frames and catch the dyes.
//   node art/authoring/layer_clean.cjs [--min=6] [--frames=8] [--dry] <file.png | dir> …
// Every connected island (8-neighbourhood) smaller than --min pixels is cleared. With --frames=N a sheet is treated as N
// frames side by side (islands never join across frame borders). Directories: every .png inside. --dry only reports.
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const args = process.argv.slice(2); const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? Number(a.split('=')[1]) : d; };
const MIN = opt('min', 6); const FRAMES = opt('frames', 1); const DRY = args.includes('--dry');
// --body=<png>: first drop layer pixels (nearly) identical to the body pixel under them — copies of the body's own outline
// and skin that the cut kept (invisible, but they catch dyes and leave fragments). --box=x0,y0,x1,y1: keep only that box
// (face details live on the head). Both for 184-grid stills (same size as the body).
const strArg = (k) => args.find((x) => x.startsWith(`--${k}=`))?.split('=')[1];
const BODY = strArg('body') ? PNG.sync.read(fs.readFileSync(strArg('body'))) : null; const BOX = strArg('box')?.split(',').map(Number);
const TOL = opt('tol', 18); /* body-copy colour tolerance (sum of RGB differences) */
// --keygreen: also drop leftovers of the green key (dark or bright pure green blends no outfit uses)
const KEYGREEN = args.includes('--keygreen'); const keyGreen = (r, g, b) => g > 40 && g > r * 1.8 && g > b * 1.8 && r < 70 && b < 70;
// --noskin: drop skin-toned pixels (hue 10–32°, medium saturation) — for face details (earrings gold, scar red, mask grey,
// tattoo dark) that came with shifted copies of the head
const NOSKIN = args.includes('--noskin');
const skin = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx !== r || mx - mn < 25 || mx < 60) return false; const h = ((g - b) / (mx - mn)) * 60; const s = (mx - mn) / mx; return h >= 10 && h <= 32 && s >= .25 && s <= .78; };
const files = args.filter((a) => !a.startsWith('--')).flatMap((p) => fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter((f) => f.endsWith('.png')).map((f) => path.join(p, f)) : [p]);
let total = 0;
for (const f of files) {
  const im = PNG.sync.read(fs.readFileSync(f)); const W = im.width, H = im.height; const fw = Math.floor(W / FRAMES);
  const seen = new Uint8Array(W * H); let removed = 0, islands = 0;
  if (BODY || BOX || KEYGREEN || NOSKIN) for (let s = 0; s < W * H; s++) {
    const i = s * 4; if (!im.data[i + 3]) continue; const x = s % W, y = (s / W) | 0;
    const out = BOX && (x < BOX[0] || y < BOX[1] || x > BOX[2] || y > BOX[3]);
    const same = BODY && BODY.width === W && BODY.data[i + 3] && Math.abs(BODY.data[i] - im.data[i]) + Math.abs(BODY.data[i + 1] - im.data[i + 1]) + Math.abs(BODY.data[i + 2] - im.data[i + 2]) <= TOL;
    const green = KEYGREEN && keyGreen(im.data[i], im.data[i + 1], im.data[i + 2]);
    const sk = NOSKIN && skin(im.data[i], im.data[i + 1], im.data[i + 2]);
    if (out || same || green || sk) { removed++; if (!DRY) im.data[i + 3] = 0; else seen[s] = 1; }
  }
  for (let s = 0; s < W * H; s++) {
    if (seen[s] || !im.data[s * 4 + 3]) continue;
    const fr = Math.floor((s % W) / fw); const st = [s]; seen[s] = 1; const pts = [];
    while (st.length) {
      const p = st.pop(); pts.push(p); const x = p % W, y = (p / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || Math.floor(nx / fw) !== fr) continue;
        const q = ny * W + nx; if (!seen[q] && im.data[q * 4 + 3]) { seen[q] = 1; st.push(q); }
      }
    }
    if (pts.length < MIN) { islands++; removed += pts.length; if (!DRY) for (const p of pts) im.data[p * 4 + 3] = 0; }
  }
  total += removed; if (removed) console.log(`${f}: ${islands} islands, ${removed} px${DRY ? ' (dry)' : ' removed'}`);
  if (!DRY && removed) fs.writeFileSync(f, PNG.sync.write(im));
}
console.log(`${files.length} files, ${total} stray px${DRY ? ' found' : ' removed'} (islands < ${MIN} px)`);
