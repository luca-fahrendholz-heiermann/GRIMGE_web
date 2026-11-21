// GRIMGE — collects finished frame-dressing jobs: downloads the AI grid and cuts the outfit layer per frame into
// public/assets/character/anim/<class>/<clip>.png (same frame layout as public/assets/sprites/sheets/base_<clip>.png).
//   node art/authoring/dress_collect.cjs <class> <clip> <url> [<class> <clip> <url> …]
// Classes whose signature colours come from a local recolour get the same recolour on their frames (deterministic,
// identical to the still): berserker → crimson.
const fs = require('fs'); const path = require('path'); const cp = require('child_process');
const ROOT = path.resolve(__dirname, '../..'); const W = path.join(ROOT, 'art_source/body/framedress');
const RECOLOR = { berserker: ['8-48', '355', '1.6', '0.95'] };
const args = process.argv.slice(2);
for (let i = 0; i + 2 < args.length; i += 3) {
  const [cls, clip, url] = args.slice(i, i + 3);
  const dir = path.join(W, 'out', cls); fs.mkdirSync(dir, { recursive: true }); const ai = path.join(dir, `${clip}_ai.png`);
  cp.execFileSync('curl', ['-s', '-o', ai, url]);
  const outDir = path.join(ROOT, 'public/assets/character/anim', cls); fs.mkdirSync(outDir, { recursive: true }); const out = path.join(outDir, `${clip}.png`);
  const nine = path.join(dir, `${clip}_layers9.png`);
  cp.execFileSync('node', [path.join(__dirname, 'frame_dress.cjs'), 'extract', path.join(ROOT, `public/assets/sprites/sheets/base_${clip}.png`), '0,1,2,3,4,5,6,7,0', path.join(W, 'grids', `${clip}.png`), ai, nine], { stdio: 'ignore' });
  // keep the 8 real frames (the 9th cell repeats frame 0)
  const [w9, h] = cp.execFileSync('magick', [nine, '-format', '%w %h', 'info:']).toString().split(' ').map(Number);
  cp.execFileSync('magick', [nine, '-crop', `${(w9 / 9) * 8}x${h}+0+0`, '+repage', `PNG32:${out}`]);
  if (RECOLOR[cls]) cp.execFileSync('node', [path.join(__dirname, 'recolor_layer.cjs'), out, out, ...RECOLOR[cls]], { stdio: 'ignore' });
  console.log('ok', cls, clip);
}
