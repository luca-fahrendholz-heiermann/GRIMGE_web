// GRIMGE — asset extraction at 1024×1024, no pixel snap (user, 21 Nov 2026: "statt pixel perfect erstmal die 1024×1024, um
// Rüstungen etc. rauszuextrahieren, sodass es auf die Basis passt — Gesicht etc. ist bei den Generierungen immer anders, es
// geht nur darum, die Assets, Haare etc. rauszuziehen und der Referenz im 1024-Format anzupassen").
// The 1024 sources (rc_/cl2_/cl3_/sty_ …) were generated from the 1024 reference body (reference_body.png) in the same pose
// and spot. Per source:
//   outfit.png — the whole figure below the neck WITH the bare body it shows (user: "Outfits samt Körper"), the skin taken
//                from the reference body pixel at that spot (inside the body) or the nearest reference skin colour (outside),
//                so the body colour is exactly the base's;
//   hair.png   — everything above the neck that is not skin: hair, hats, hoods, horns, ribbons; the generated face is dropped
//                (only large non-skin pieces or ones above the brow survive inside the head — eyes and mouth do not);
//   preview (only with PREVIEW_DIR set) — source | reference head + outfit + hair, for checking;
//   node art/authoring/extract1024.cjs <out dir> <source.png> [<source.png> …]   (output: <out dir>/<name>/…)
const fs = require('fs'); const path = require('path'); const cp = require('child_process'); const os = require('os'); const { PNG } = require('pngjs');
const ROOT = path.resolve(__dirname, '../..');
const REF = process.env.REF_1024 ?? [path.join(ROOT, 'art_source/body/reference_body.png'), path.resolve(ROOT, '../../../art_source/body/reference_body.png')].find((f) => fs.existsSync(f)); /* main checkout or a worktree */
const [outDir, ...sources] = process.argv.slice(2); const W = 1024;
const lin = (c) => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const oklab = (r, g, b) => { const R = lin(r), G = lin(g), B = lin(b); const l = Math.cbrt(.4122 * R + .5363 * G + .0514 * B), m = Math.cbrt(.2119 * R + .6807 * G + .1074 * B), s = Math.cbrt(.0883 * R + .2817 * G + .6300 * B); return [.2105 * l + .7936 * m - .0041 * s, 1.978 * l - 2.4286 * m + .4506 * s, .0259 * l + .7828 * m - .8087 * s]; };
const isKey = (r, g, b) => g > 150 && r < 110 && b < 110;
const ref = PNG.sync.read(fs.readFileSync(REF)); const R = ref.data;
const refOn = new Uint8Array(W * W); for (let i = 0; i < W * W; i++) refOn[i] = isKey(R[i * 4], R[i * 4 + 1], R[i * 4 + 2]) ? 0 : 1;
// reference geometry: top, neck (narrowest row between head and shoulders), eye line (the blue eyes), brow line
let top = 0; while (!refOn.subarray(top * W, top * W + W).some(Boolean)) top++;
const rowW = (y) => { let a = -1, b = -1; for (let x = 0; x < W; x++) if (refOn[y * W + x]) { if (a < 0) a = x; b = x; } return a < 0 ? 0 : b - a + 1; };
let neck = top + 90, nw = 1e9; for (let y = top + 90; y < top + 220; y++) { const w = rowW(y); if (w && w < nw) { nw = w; neck = y; } }
let eyeY = 0, eyeN = 0; for (let y = top; y < neck; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (refOn[y * W + x] && R[i + 2] > R[i] + 30 && R[i + 2] > 120) { eyeY += y; eyeN++; } } eyeY = eyeN ? Math.round(eyeY / eyeN) : top + 70;
const brow = eyeY - 14;
// the face zone: inside the reference head (10 px in from its edge), from just above the brows down to the neck — the
// generated face never survives there, whatever hair hangs around it (eyes and brows join a hair mass through its outline)
const faceZone = (() => { const m = new Uint8Array(W * W); for (let y = top; y < neck; y++) for (let x = 0; x < W; x++) m[y * W + x] = refOn[y * W + x]; const e = morph(m, 10, 0); for (let i = 0; i < W * W; i++) { const y = (i / W) | 0; if (y < brow - 8 || y >= neck) e[i] = 0; } return e; })();
// head silhouette (dilated) = where the generated face lives
const headSil = new Uint8Array(W * W); for (let y = top; y < neck; y++) for (let x = 0; x < W; x++) if (refOn[y * W + x]) for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < neck && xx >= 0 && xx < W) headSil[yy * W + xx] = 1; }
// reference skin colours (lit, warm), used for the skin test and to recolour skin outside the reference body
const skinRef = []; { const seen = new Set(); for (let i = 0; i < W * W; i++) { if (!refOn[i]) continue; const r = R[i * 4], g = R[i * 4 + 1], b = R[i * 4 + 2]; const k = (r << 16) | (g << 8) | b; if (seen.has(k)) continue; seen.add(k); const L = oklab(r, g, b); if (L[0] > .35 && r > g && g > b && L[1] > .02) skinRef.push({ rgb: [r, g, b], lab: L }); } }
console.log(`reference: top ${top}, neck ${neck}, eyes ${eyeY}, ${skinRef.length} skin colours`);
{ /* the reference head (everything above the neck) as its own layer: compose = reference_head + outfit + hair */
  const h = new PNG({ width: W, height: W }); for (let i = 0; i < neck * W; i++) if (refOn[i]) { R.copy(h.data, i * 4, i * 4, i * 4 + 4); h.data[i * 4 + 3] = 255; }
  fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, '_reference_head.png'), PNG.sync.write(h)); }
const d2 = (a, b) => (a[0] - b[0]) ** 2 * 1.2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
function morph(mask, r, dilate) { // square min (erode) / max (dilate) filter, separable
  const tmp = new Uint8Array(W * W), out = new Uint8Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { let v = dilate ? 0 : 1; for (let d = -r; d <= r; d++) { const xx = x + d; const m = xx < 0 || xx >= W ? 0 : mask[y * W + xx]; if (dilate ? m : !m) { v = dilate ? 1 : 0; break; } } tmp[y * W + x] = v; }
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { let v = dilate ? 0 : 1; for (let d = -r; d <= r; d++) { const yy = y + d; const m = yy < 0 || yy >= W ? 0 : tmp[yy * W + x]; if (dilate ? m : !m) { v = dilate ? 1 : 0; break; } } out[y * W + x] = v; }
  return out;
}
function components(mask) { // 8-connected; returns label array + sizes
  const lab = new Int32Array(W * W).fill(-1); const sizes = []; const st = [];
  for (let s = 0; s < W * W; s++) { if (!mask[s] || lab[s] >= 0) continue; const id = sizes.length; let n = 0; lab[s] = id; st.push(s);
    while (st.length) { const q = st.pop(); n++; const x = q % W, y = (q / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= W) continue; const t = yy * W + xx; if (mask[t] && lab[t] < 0) { lab[t] = id; st.push(t); } } }
    sizes.push(n); }
  return { lab, sizes };
}
for (const src of sources) {
  const name = path.basename(src, '.png'); const dir = path.join(outDir, name); fs.mkdirSync(dir, { recursive: true });
  // 1. background: flood from the four corners (key green or the dark backdrops), then only big pieces stay (no particles)
  const tmp = path.join(os.tmpdir(), `x1024_${process.pid}.png`);
  cp.execFileSync('magick', [src, '-resize', `${W}x${W}!`, '-alpha', 'set', '-fuzz', '12%', '-fill', 'none', '-draw', 'color 0,0 floodfill', '-draw', `color ${W - 1},0 floodfill`, '-draw', `color 0,${W - 1} floodfill`, '-draw', `color ${W - 1},${W - 1} floodfill`, `PNG32:${tmp}`]);
  const im = PNG.sync.read(fs.readFileSync(tmp)); fs.rmSync(tmp, { force: true }); const D = im.data;
  const on = new Uint8Array(W * W); for (let i = 0; i < W * W; i++) on[i] = D[i * 4 + 3] > 127 && !isKey(D[i * 4], D[i * 4 + 1], D[i * 4 + 2]) ? 1 : 0;
  { const { lab, sizes } = components(on); const big = Math.max(...sizes, 0); for (let i = 0; i < W * W; i++) if (on[i] && sizes[lab[i]] < Math.max(400, big * .01)) on[i] = 0; }
  // 2. skin: this source's own skin tone (sampled on the reference cheeks/forehead) + the reference skin colours
  const samples = []; for (let y = eyeY + 6; y < neck - 12; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!refOn[i] || !on[i]) continue; const r = D[i * 4], g = D[i * 4 + 1], b = D[i * 4 + 2]; if (r > g && g > b && r - b > 40) samples.push(oklab(r, g, b)); }
  samples.sort((a, b) => a[0] - b[0]); const cent = samples.length ? [.1, .3, .5, .7, .9].map((q) => samples[Math.floor(q * (samples.length - 1))]) : [];
  // skin = warm hue 28–59° with chroma ≥ .05 (the reference's own skin range; straw 68°+, dark cloth C ≈ .03 fall out), and
  // where the reference body is skin at the same spot (same pose) the colour must match it in hue/chroma — lightness is free,
  // the generator shades differently (light cloth at 60° / C .09 is otherwise as close to a skin highlight as it gets);
  // outside the reference body it must match this source's own face skin
  const ab = (a, b) => Math.hypot(a[1] - b[1], a[2] - b[2]);
  const refSkinAt = new Uint8Array(W * W); for (let i = 0; i < W * W; i++) if (refOn[i]) { const L = oklab(R[i * 4], R[i * 4 + 1], R[i * 4 + 2]); refSkinAt[i] = Math.hypot(L[1], L[2]) >= .05 && L[0] > .2 ? 1 : 0; }
  const isSkin = (i) => { const L = oklab(D[i * 4], D[i * 4 + 1], D[i * 4 + 2]); const C = Math.hypot(L[1], L[2]), h = Math.atan2(L[2], L[1]) * 180 / Math.PI; if (C < .05 || h < 28 || h > 59 || L[0] < .2) return false;
    if (refSkinAt[i]) return ab(L, oklab(R[i * 4], R[i * 4 + 1], R[i * 4 + 2])) < .02;
    return cent.length ? cent.some((m) => ab(L, m) < .02) : true; };
  const isSkinLoose = (i) => { const L = oklab(D[i * 4], D[i * 4 + 1], D[i * 4 + 2]); const C = Math.hypot(L[1], L[2]), h = Math.atan2(L[2], L[1]) * 180 / Math.PI; return C >= .05 && h >= 28 && h <= 59 && L[0] >= .2; }; /* the generated face goes anyway */
  // 3. head zone: non-skin pieces; inside the head only big ones or those above the brow (hair / hat), never eyes or mouth
  const hairCand = new Uint8Array(W * W); for (let y = 0; y < neck; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (on[i] && (!headSil[i] || !isSkinLoose(i))) hairCand[i] = 1; } /* outside the head there is no face: everything there is hair / hat */
  // holes: skin-coloured pixels inside a hat or hair mass (straw, blond hair) — mostly surrounded by hair → hair
  { const add = []; for (let y = 6; y < neck; y++) for (let x = 6; x < W - 6; x++) { const i = y * W + x; if (!on[i] || hairCand[i]) continue; let h = 0, n = 0; for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { n++; if (hairCand[(y + dy) * W + x + dx]) h++; } if (h > n * .55) add.push(i); } for (const i of add) hairCand[i] = 1; }
  // thin leftovers of the generated head (its outline ring, eyes, brows): inside the head only what survives an opening
  // (erode 3, dilate 4) stays — hair and hat masses do, with their outline; a 1–5 px line does not
  { const solid = morph(morph(hairCand, 3, 0), 4, 1); for (let i = 0; i < W * W; i++) if (hairCand[i] && headSil[i] && !solid[i]) hairCand[i] = 0; }
  const hc = components(hairCand); const nC = hc.sizes.length; const outside = new Uint8Array(nC), inHead = new Uint8Array(nC), atNeck = new Uint8Array(nC), minY = new Int32Array(nC).fill(W);
  for (let i = 0; i < W * W; i++) { if (!hairCand[i]) continue; const c = hc.lab[i], y = (i / W) | 0; if (!headSil[i]) outside[c] = 1; if (refOn[i]) inHead[c] = 1; if (y === neck - 1) atNeck[c] = 1; if (y < minY[c]) minY[c] = y; }
  // pieces rising from the shoulders (pauldron horns, collars): hang at the neck line, never touch the head, stay below the
  // crown → they belong to the outfit
  const toOutfit = new Uint8Array(nC); for (let c = 0; c < nC; c++) toOutfit[c] = atNeck[c] && !inHead[c] && minY[c] > top + 40 ? 1 : 0;
  const hair = new PNG({ width: W, height: W }); const outfit = new PNG({ width: W, height: W });
  for (let i = 0; i < W * W; i++) {
    if (!on[i]) continue; const y = (i / W) | 0;
    if (y < neck) { if (!hairCand[i] || faceZone[i]) continue; const c = hc.lab[i]; if (headSil[i] && !outside[c] && y >= brow && hc.sizes[c] < 600) continue; if (!toOutfit[c] && hc.sizes[c] < 300) continue; const dst = toOutfit[c] ? outfit : hair; D.copy(dst.data, i * 4, i * 4, i * 4 + 4); dst.data[i * 4 + 3] = 255; continue; }
    if (isSkin(i)) { /* the base's own body colour */
      if (refOn[i]) { R.copy(outfit.data, i * 4, i * 4, i * 4 + 4); outfit.data[i * 4 + 3] = 255; continue; }
      const L = oklab(D[i * 4], D[i * 4 + 1], D[i * 4 + 2]); let best = skinRef[0], bd = 1e9; for (const s of skinRef) { const d = d2(L, s.lab); if (d < bd) { bd = d; best = s; } } outfit.data.set([...best.rgb, 255], i * 4); continue;
    }
    D.copy(outfit.data, i * 4, i * 4, i * 4 + 4); outfit.data[i * 4 + 3] = 255;
  }
  fs.writeFileSync(path.join(dir, 'outfit.png'), PNG.sync.write(outfit)); fs.writeFileSync(path.join(dir, 'hair.png'), PNG.sync.write(hair));
  // 4. preview: source | reference head + outfit + hair on key green
  const pv = new PNG({ width: W * 2, height: W });
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const i = y * W + x, a = (y * W * 2 + x) * 4, b = (y * W * 2 + W + x) * 4;
    pv.data.set([D[i * 4], D[i * 4 + 1], D[i * 4 + 2], 255], a); if (!on[i]) pv.data.set([22, 210, 5, 255], a);
    let c = [22, 210, 5]; if (y < neck && refOn[i]) c = [R[i * 4], R[i * 4 + 1], R[i * 4 + 2]]; if (outfit.data[i * 4 + 3]) c = [outfit.data[i * 4], outfit.data[i * 4 + 1], outfit.data[i * 4 + 2]]; if (hair.data[i * 4 + 3]) c = [hair.data[i * 4], hair.data[i * 4 + 1], hair.data[i * 4 + 2]]; pv.data.set([...c, 255], b); }
  if (process.env.PREVIEW_DIR) { fs.mkdirSync(process.env.PREVIEW_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.PREVIEW_DIR, `${name}.png`), PNG.sync.write(pv)); } /* previews stay out of the asset folder */
  let nh = 0, no = 0; for (let i = 0; i < W * W; i++) { if (hair.data[i * 4 + 3]) nh++; if (outfit.data[i * 4 + 3]) no++; }
  console.log(`${name}: outfit ${no} px, hair ${nh} px, skin samples ${samples.length}`);
}
