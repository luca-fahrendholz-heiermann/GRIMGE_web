// GRIMGE — animated GIFs (Higgsfield) → hard-pixel sprite sheets.
//   node art/authoring/gif_sheets.cjs <outDir> <name> <scale%|hNNN> <kind>=<file.gif> [<kind>=<file.gif> …]
// hNNN: scale so the first kind's body is NNN native pixels tall — with the game's one art-pixel size (ART_PX in world.js)
// every creature then shows the same pixel size as the characters (user: "dass alles denselben Look hat").
// All GIFs of one creature share ONE crop box (the union of every frame of every kind), so the kinds line up when the
// game switches between them. Frames are mirrored to face left (like the stills), scaled nearest-neighbour only, laid
// side by side and saved as PNG8 without dithering (hard pixels, user 21 Nov 2026). Prints the meta for the renderer:
// frame size and the first kind's body box inside a frame (the renderer stands the body on its feet).
const cp = require('child_process'); const path = require('path'); const fs = require('fs');
const [outDir, name, scaleArg, ...pairs] = process.argv.slice(2); fs.mkdirSync(outDir, { recursive: true });
let SCALE = `${parseFloat(scaleArg) || 100}%`;
const mg = (args) => cp.execFileSync('magick', args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
const kinds = pairs.map((p) => p.split('=')); const all = kinds.flatMap(([, f]) => [f, '-coalesce']);
const box = mg([...all, '-background', 'none', '-flatten', '-format', '%@', 'info:']);
if (/^h\d+$/.test(scaleArg)) { const raw = mg([kinds[0][1], '-coalesce', '-crop', box, '+repage', '-background', 'none', '-flatten', '-format', '%@', 'info:']).match(/(\d+)x(\d+)/); SCALE = `${(Number(scaleArg.slice(1)) / Number(raw[2]) * 100).toFixed(3)}%`; }
const frames = {};
for (const [kind, file] of kinds) {
  frames[kind] = Number(mg([file, '-format', '%n\n', 'info:']).split('\n')[0]);
  mg([file, '-coalesce', '-crop', box, '+repage', '-flop', '-filter', 'point', '-resize', SCALE, '-background', 'none', '+append', '+dither', '-colors', '255', `PNG8:${path.join(outDir, `${name}_${kind}.png`)}`]);
}
const [fw, fh] = mg([kinds[0][1] + '[0]', '-crop', box, '+repage', '-filter', 'point', '-resize', SCALE, '-format', '%w %h', 'info:']).split(' ').map(Number);
const body = mg([kinds[0][1], '-coalesce', '-crop', box, '+repage', '-flop', '-filter', 'point', '-resize', SCALE, '-background', 'none', '-flatten', '-format', '%@', 'info:']).match(/(\d+)x(\d+)\+(\d+)\+(\d+)/).slice(1).map(Number);
console.log(JSON.stringify({ [name]: { frames, fw, fh, bx: body[2], by: body[3], bw: body[0], bh: body[1] } }));
