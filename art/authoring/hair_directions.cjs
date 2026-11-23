// GRIMGE — hair variants per head direction (user, 22 Nov 2026: "bei den Haaren sind Varianten pro Animation nötig, wo der
// Kopf sich mitbewegt (nach oben schaut etc.)" — "mach die Haar-Varianten pro Kopfrichtung mit Aseprite"). The clips keep
// one head per direction (head_lock.cjs): the reference head, and for a phase that looks elsewhere ONE direction head
// (orb_hold: looking up, dead: falling back). For every direction head:
//   1. its outline is taken from the finished base frame (in head-layer coordinates, at the frame's anchor),
//   2. its bend (turn, scale, shift — chosen by eye per direction, see DIRS),
//   3. every hair layer (and its transformation variants) is bent along: hair on the skull turns fully with the head,
//      hair hanging away from it turns less and less (it still falls down), holes closed, palette kept,
//   4. written to public/assets/character/hair_dir/<hair file>__<dir>.png (drawn at the frame's anchor, no extra turn);
//      the frames of that phase get the direction name in head_anchors.js ([ox, oy, q, deg, scale, 'up' | 'fall']).
// The Aseprite working files (direction head + one layer per hairstyle, for drawing over by hand) are built by
// hair_dir_aseprite steps from the previews this writes to <previewDir>.
//   node art/authoring/hair_directions.cjs [previewDir]
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const { template } = require('./head_lock.cjs');
const ROOT = path.resolve(__dirname, '../..'); const LIB = path.join(ROOT, 'public/assets/character'); const N = 184; const CX = 94, CY = 48;
const previewDir = process.argv[2] ?? null;
// the bend per direction: chosen by eye on the direction heads (an automatic fit by colour or outline came out at small
// angles — the skin overlap dominates; the heads really tilt far back): turn (°, negative = back for a right-facing head),
// scale, shift on the 184 grid
const DIRS = [{ id: 'up', clip: 'base_orb_hold', label: 'Blick nach oben', bend: { d: -55, s: .95, tx: -6, ty: 5 } }, { id: 'fall', clip: 'base_dead', label: 'Fallen nach hinten', bend: { d: -62, s: 1, tx: -2, ty: 1 } }];
const anchorsFile = path.join(ROOT, 'public/src/head_anchors.js'); const src = fs.readFileSync(anchorsFile, 'utf8'); const A = JSON.parse(/\/\*META\*\/([\s\S]*?)\/\*END\*\//.exec(src)[1]);
const body = PNG.sync.read(fs.readFileSync(path.join(LIB, 'body/body.png')));
const refHead = new Uint8Array(N * N); for (let y = 30; y <= 61; y++) for (let x = 76; x <= 112; x++) if (body.data[(y * N + x) * 4 + 3] > 127 && (y <= 56 || x >= 86 + (y - 56) * 3)) refHead[y * N + x] = 1;
const read = (f) => PNG.sync.read(fs.readFileSync(f));
// similarity transform about the head centre: p' = R(a)·S·(p − C) + C + t
const fwd = (x, y, a, s, tx, ty) => { const dx = (x - CX) * s, dy = (y - CY) * s, c = Math.cos(a), si = Math.sin(a); return [CX + dx * c - dy * si + tx, CY + dx * si + dy * c + ty]; };
const report = [];
for (const D of DIRS) {
  const an = A[D.clip]; if (!an) continue; const ks = an.map((a, k) => (a[5] ? k : -1)).filter((k) => k >= 0); if (!ks.length) { console.log(D.id, 'no direction frames'); continue; }
  // 1. the direction head's shape in head-layer coordinates (from the first frame of the phase)
  const sheet = read(path.join(ROOT, `public/assets/sprites/sheets/${D.clip}.png`)); const fw = sheet.width / an.length; const k0 = ks[0]; const [ox, oy, , deg, sc] = an[k0];
  const dirMask = new Uint8Array(N * N); const dirImg = new PNG({ width: N, height: N });
  for (const t of template(deg, sc)) { const fx = t.x + ox, fy = t.y + oy; if (fx < 0 || fy < 0 || fx >= fw || fy >= sheet.height || t.x < 0 || t.y < 0 || t.x >= N || t.y >= N) continue; const i = (fy * sheet.width + k0 * fw + fx) * 4; if (sheet.data[i + 3] < 128) continue; dirMask[t.y * N + t.x] = 1; sheet.data.copy(dirImg.data, (t.y * N + t.x) * 4, i, i + 4); }
  // 2. the bend of this direction
  const best = { ...D.bend, q: 1 };
  console.log(`${D.id}: frames ${ks.join(',')}, bend ${best.d}° ×${best.s} (${best.tx},${best.ty})`);
  // 3. bend every hair file along: weight 1 on / over the skull, falling off for hanging hair (gravity keeps it down)
  const skullNear = new Uint8Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!refHead[y * N + x] || y > 52) continue; for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < N && Y < N) skullNear[Y * N + X] = 1; } }
  const weight = (x, y) => { if (skullNear[y * N + x] || y < 34) return 1; const dy = Math.max(0, y - 52); return Math.max(.15, 1 - dy / 22); };
  const outDir = path.join(LIB, 'hair_dir'); fs.mkdirSync(outDir, { recursive: true });
  const man = JSON.parse(fs.readFileSync(path.join(LIB, 'manifest.json'), 'utf8')); const files = new Set(); for (const h of Object.values(man.hair)) { files.add(h.file); for (const f of Object.values(h.transformations ?? {})) files.add(f); }
  let n = 0;
  for (const rel of files) {
    const hp = read(path.join(LIB, rel)); const out = new PNG({ width: N, height: N }); const set = new Uint8Array(N * N); const a0 = best.d * Math.PI / 180;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4; if (hp.data[i + 3] < 128) continue; const w = weight(x, y);
      for (const [sx, sy] of [[-.33, -.33], [.33, -.33], [-.33, .33], [.33, .33], [0, 0]]) { const [px, py] = fwd(x + sx, y + sy, a0 * w, 1 + (best.s - 1) * w, best.tx * w, best.ty * w); const X = Math.round(px), Y = Math.round(py); if (X < 0 || Y < 0 || X >= N || Y >= N) continue; const o = (Y * N + X) * 4; if (!set[Y * N + X] || (sx === 0 && sy === 0)) { hp.data.copy(out.data, o, i, i + 4); set[Y * N + X] = 1; } } }
    // single holes: an empty pixel mostly surrounded by hair takes the majority colour around it
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { if (set[y * N + x]) continue; const cnt = new Map(); let k = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const j = (y + dy) * N + x + dx; if (!set[j]) continue; k++; const key = out.data.readUInt32BE(j * 4); cnt.set(key, (cnt.get(key) ?? 0) + 1); } if (k >= 6) { let bk = 0, bn = 0; for (const [key, c] of cnt) if (c > bn) { bn = c; bk = key; } out.data.writeUInt32BE(bk >>> 0, (y * N + x) * 4); } }
    fs.writeFileSync(path.join(outDir, `${path.basename(rel, '.png')}__${D.id}.png`), PNG.sync.write(out)); n++;
    if (previewDir && !/_(guardian|berserker|lancer|monk|beastborn|shadow|ranger|arcanist)\.png$/.test(rel)) { fs.mkdirSync(previewDir, { recursive: true }); fs.writeFileSync(path.join(previewDir, `${D.id}__${path.basename(rel)}`), PNG.sync.write(out)); }
  }
  if (previewDir) fs.writeFileSync(path.join(previewDir, `${D.id}__HEAD.png`), PNG.sync.write(dirImg));
  for (const k of ks) an[k][5] = D.id; /* the frames of this phase use the variant */
  report.push({ dir: D.id, frames: ks, fit: best, files: n });
}
fs.writeFileSync(anchorsFile, src.replace(/\/\*META\*\/[\s\S]*?\/\*END\*\//, `/*META*/${JSON.stringify(A)}/*END*/`));
console.log(JSON.stringify(report.map((r) => ({ dir: r.dir, files: r.files, fit: `${r.fit.d}° ×${r.fit.s.toFixed(2)}` }))));
