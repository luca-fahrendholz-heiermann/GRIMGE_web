// GRIMGE — stable faces (user, 21 Nov 2026: "Pixel springen im Gesicht hin und her, nichts sieht clean aus"). The base
// clips are AI GIFs: every frame redraws the face (eye shape, mouth, shading), so after the snap the face shimmers and the
// head layers (hair, beard) sit on a head that changes shape. This puts the reference body's own head — pixel-exact,
// body.png — into every frame at its tracked position (head_anchors.js): skull, eyes and nose only (rows HEAD.y0–y1, the
// jaw stays the frame's own so fists in front of the chin are not covered), and only where the head is clearly free
// (match quality ≥ MINQ; turned / covered heads keep their frame).
//   node art/authoring/head_transplant.cjs [clip …]   (no clips = every base_*.png sheet)
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const ROOT = path.resolve(__dirname, '../..'); const SHEETS = path.join(ROOT, 'public/assets/sprites/sheets');
const HEAD = { x0: 80, y0: 30, x1: 108, y1: 55 }; const MINQ = .6;
const body = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public/assets/character/body/body.png')));
const src = fs.readFileSync(path.join(ROOT, 'public/src/head_anchors.js'), 'utf8'); const A = JSON.parse(/\/\*META\*\/([\s\S]*?)\/\*END\*\//.exec(src)[1]);
const clips = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(A).map((k) => k.replace(/^base_/, ''));
for (const clip of clips) {
  const key = `base_${clip}`; const anchors = A[key]; const file = path.join(SHEETS, `${key}.png`); if (!anchors || !fs.existsSync(file)) { console.log(clip, 'skipped (no anchors / sheet)'); continue; }
  const im = PNG.sync.read(fs.readFileSync(file)); const n = anchors.length; const fw = im.width / n, fh = im.height; let done = 0;
  anchors.forEach(([ox, oy, q], k) => {
    if (q < MINQ) return; done++;
    for (let y = HEAD.y0; y <= HEAD.y1; y++) for (let x = HEAD.x0; x <= HEAD.x1; x++) {
      const bi = (y * 184 + x) * 4; if (body.data[bi + 3] < 128) continue; const fx = x + ox, fy = y + oy; if (fx < 0 || fy < 0 || fx >= fw || fy >= fh) continue;
      const di = (fy * im.width + k * fw + fx) * 4; im.data[di] = body.data[bi]; im.data[di + 1] = body.data[bi + 1]; im.data[di + 2] = body.data[bi + 2]; im.data[di + 3] = 255;
    }
  });
  fs.writeFileSync(file, PNG.sync.write(im)); console.log(clip.padEnd(14), `${done}/${n} frames got the reference head`);
}
