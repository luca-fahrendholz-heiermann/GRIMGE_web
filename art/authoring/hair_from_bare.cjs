// GRIMGE — hairstyles cut exactly by their shape (user, 23 Nov 2026: "Haare einfach abgeschnitten, statt sie akkurat vom
// Original nach Form auszuschneiden, und dann an die Rüstung anzupassen, was im Vordergrund und was im Hintergrund ist").
// From a finished image the hair cannot be told from armour or a fur cape of the same colour. So each hairstyle is
// generated ALONE on the bare 1024 reference body (a 2048 sheet of four copies, each in its own 1024 quarter — exactly the
// reference size), and the hair is what differs from the known reference:
//   • every pixel that differs clearly from reference_body.png (and is not the key green) is hair — except the face,
//     which is always the reference's own (the generated face changes);
//   • hair over the reference body is FRONT hair (hair.png: drawn over the armour), hair beside it — hanging behind the
//     shoulders and the back — is BACK hair (hair_back.png: drawn behind the armour); hair the body covers in the
//     generated image is simply not there, as it should be;
//   • stray specks go, the hair keeps the generated colours.
//   REF_1024=<suited reference.png> node art/authoring/hair_from_bare.cjs <sheet2048.png> <name_tl> <name_tr> <name_bl> <name_br>
//   (- skips a quarter; REF_1024 = the reference in the purple bodysuit the sheet was made from — bare torsos get flagged,
//   so the sheet shows the body suited: skin below the neck as purple cloth, which is never taken as hair)
// Output: art/layers1024/hair/<name>/{hair,hair_back}.png
const fs = require('fs'); const path = require('path'); const cp = require('child_process'); const { PNG } = require('pngjs');
const ROOT = path.resolve(__dirname, '../..'); const W = 1024;
const REF = process.env.REF_1024 ?? [path.join(ROOT, 'art_source/body/reference_body.png'), path.resolve(ROOT, '../../../art_source/body/reference_body.png')].find((f) => fs.existsSync(f));
const [sheet, ...names] = process.argv.slice(2);
const ref = PNG.sync.read(fs.readFileSync(REF)); const R = ref.data;
const isKey = (r, g, b) => g > 150 && r < 110 && b < 110;
const refOn = new Uint8Array(W * W); for (let i = 0; i < W * W; i++) refOn[i] = isKey(R[i * 4], R[i * 4 + 1], R[i * 4 + 2]) ? 0 : 1;
let top = 0; while (!refOn.subarray(top * W, top * W + W).some(Boolean)) top++;
const rowW = (y) => { let a = -1, b = -1; for (let x = 0; x < W; x++) if (refOn[y * W + x]) { if (a < 0) a = x; b = x; } return a < 0 ? 0 : b - a + 1; };
let neck = top + 90, nw = 1e9; for (let y = top + 90; y < top + 220; y++) { const w = rowW(y); if (w && w < nw) { nw = w; neck = y; } }
let eyeY = 0, eyeN = 0; for (let y = top; y < neck; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (refOn[y * W + x] && R[i + 2] > R[i] + 30 && R[i + 2] > 120) { eyeY += y; eyeN++; } } eyeY = eyeN ? Math.round(eyeY / eyeN) : top + 70;
const dilate = (m, r) => { const o = new Uint8Array(W * W); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { if (!m[y * W + x]) continue; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < W) o[Y * W + X] = 1; } } return o; };
const erode = (m, r) => { const inv = new Uint8Array(W * W); for (let i = 0; i < W * W; i++) inv[i] = m[i] ? 0 : 1; const d = dilate(inv, r); const o = new Uint8Array(W * W); for (let i = 0; i < W * W; i++) o[i] = d[i] ? 0 : 1; return o; };
// the face: the reference head 10 px in from its edge, from above the brows down to the neck — never hair
const headRef = new Uint8Array(W * W); for (let y = top; y < neck; y++) for (let x = 0; x < W; x++) headRef[y * W + x] = refOn[y * W + x];
const face = erode(headRef, 10); for (let i = 0; i < W * W; i++) { const y = (i / W) | 0; if (y < eyeY - 22) face[i] = 0; }
const bodyNear = dilate(refOn, 2);
const raw = cp.execFileSync('magick', [sheet, '-resize', '2048x2048!', '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 26 });
names.forEach((name, q) => {
  if (!name || name === '-') return; const ox = (q % 2) * W, oy = Math.floor(q / 2) * W;
  const px = (x, y) => { const i = ((y + oy) * 2048 + x + ox) * 4; return [raw[i], raw[i + 1], raw[i + 2]]; };
  // hair = differs from the reference AND is not the bodysuit (purple), not skin near the head (the generated face, ears,
  // neck) and not a lone outline: the generator redraws the body a pixel off here and there — that is no hair
  const suit = (r, g, b) => b > g + 20 && r > g + 10; const dark = (r, g, b) => .3 * r + .59 * g + .11 * b < 24; /* the outline is near black; dark (black, deep red) hair lies above it */
  const skin = (r, g, b) => r > g && g > b && r - b > 50 && r - g < 90 && g > 60; /* warm skin tones (red hair has r − g ≥ 90) */
  const nearHead = dilate(headRef, 10);
  const hairM = new Uint8Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; const [r, g, b] = px(x, y); if (isKey(r, g, b) || face[i] || suit(r, g, b) || dark(r, g, b)) continue;
    if (nearHead[i] && skin(r, g, b)) continue;
    if (refOn[i]) { const d = Math.abs(r - R[i * 4]) + Math.abs(g - R[i * 4 + 1]) + Math.abs(b - R[i * 4 + 2]); if (d < 90) continue; /* the body as it was */ }
    hairM[i] = 1;
  }
  // the hair's own outline: dark pixels next to at least two hair pixels
  for (let pass = 0; pass < 2; pass++) { const add = []; for (let y = 1; y < W - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (hairM[i] || face[i]) continue; const [r, g, b] = px(x, y); if (!dark(r, g, b)) continue; let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (hairM[(y + dy) * W + x + dx]) n++; if (n >= 2) add.push(i); } for (const i of add) hairM[i] = 1; }
  // only what hangs together with the hair on the head (no stray body differences elsewhere): grow from the head zone
  const keep = new Uint8Array(W * W); const st = []; for (let i = 0; i < neck * W; i++) if (hairM[i]) { keep[i] = 1; st.push(i); }
  while (st.length) { const c = st.pop(); const cx = c % W, cy = (c / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue; const n = ny * W + nx; if (hairM[n] && !keep[n]) { keep[n] = 1; st.push(n); } } }
  // specks: pieces under 60 px go
  const seen = new Uint8Array(W * W); for (let s = 0; s < W * W; s++) { if (!keep[s] || seen[s]) continue; const pts = [s]; const st2 = [s]; seen[s] = 1; while (st2.length) { const c = st2.pop(); const cx = c % W, cy = (c / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue; const n = ny * W + nx; if (keep[n] && !seen[n]) { seen[n] = 1; st2.push(n); pts.push(n); } } } if (pts.length < 60) for (const p of pts) keep[p] = 0; }
  const front = new PNG({ width: W, height: W }), back = new PNG({ width: W, height: W }); let nf = 0, nb = 0;
  for (let i = 0; i < W * W; i++) { if (!keep[i]) continue; const y = (i / W) | 0; const [r, g, b] = px(i % W, y); const isBack = y >= neck - 10 && !bodyNear[i]; const dst = isBack ? back : front; dst.data.set([r, g, b, 255], i * 4); if (isBack) nb++; else nf++; }
  const dir = path.join(ROOT, 'art/layers1024/hair', name); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'hair.png'), PNG.sync.write(front)); if (nb) fs.writeFileSync(path.join(dir, 'hair_back.png'), PNG.sync.write(back)); else fs.rmSync(path.join(dir, 'hair_back.png'), { force: true });
  console.log(`${name}: front ${nf} px, back ${nb} px`);
});
