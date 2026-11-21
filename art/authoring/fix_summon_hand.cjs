// GRIMGE — summon clip: the palm on the ground had 6–7 finger spikes (user, 21 Nov 2026: "Anzahl an Finger ist auch ein
// Problem"). Redraws the hand below the palm in the frames where it rests on the ground (base_summon frames 3–7, the hand
// does not move there): thumb back-left, four fingers ahead, 2 px wide, outlined — in the body's own skin ramp.
//   node art/authoring/fix_summon_hand.cjs [sheet=public/assets/sprites/sheets/base_summon.png] [layer sheets …]
// Layer sheets (class outfits for the summon clip) lose their skin-coloured pixels in the hand box so the base hand shows;
// armour pixels (gauntlets) stay.
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const ROOT = path.resolve(__dirname, '../..');
const [sheetArg, ...layers] = process.argv.slice(2); const SHEET = path.resolve(ROOT, sheetArg ?? 'public/assets/sprites/sheets/base_summon.png');
const C = { o: [0, 0, 0], L: [0xda, 0x98, 0x65], M: [0xcf, 0x87, 0x55], S: [0xb8, 0x6a, 0x3d], D: [0xa6, 0x59, 0x32] };
const X0 = 28, Y0 = 111; // template origin (frame pixels)
const T = [
  '...oSMLLLLLLLLLLLLLLLMS', // palm's lower edge (x 28–50)
  '..oMSoLMooLMooLMooLMSo.', // thumb root, four finger roots
  '.oMSooLMooLMooLMooLSo..',
  '.oDo.oSDooSDooSDooSDo..', // tips
  '..o...oo..oo..oo..oo...',
  '.......................',
];
const CLEAR = { x0: 51, x1: 56, y0: 112, y1: 116 }; // old finger stubs right of the template
const FRAMES = [3, 4, 5, 6, 7];
const im = PNG.sync.read(fs.readFileSync(SHEET)); const fw = im.width / 8;
const at = (k, x, y) => (y * im.width + k * fw + x) * 4;
for (const k of FRAMES) {
  T.forEach((row, dy) => [...row].forEach((ch, dx) => { const i = at(k, X0 + dx, Y0 + dy); if (ch === '.') { if (dy > 0) im.data[i + 3] = 0; return; } im.data.set([...C[ch], 255], i); }));
  for (let y = CLEAR.y0; y <= CLEAR.y1; y++) for (let x = CLEAR.x0; x <= CLEAR.x1; x++) im.data[at(k, x, y) + 3] = 0;
}
fs.writeFileSync(SHEET, PNG.sync.write(im)); console.log('hand redrawn in frames', FRAMES.join(','));
// outfit layers: no own fingers in the hand box
const skinish = (r, g, b) => r > g && g > b && r - b > 40 && r > 80;
for (const f of layers) {
  const L = PNG.sync.read(fs.readFileSync(path.resolve(ROOT, f))); let n = 0;
  for (const k of FRAMES) for (let y = Y0; y < Y0 + T.length; y++) for (let x = X0; x <= CLEAR.x1; x++) { const i = (y * L.width + k * fw + x) * 4; if (L.data[i + 3] && (skinish(L.data[i], L.data[i + 1], L.data[i + 2]) || L.data[i] + L.data[i + 1] + L.data[i + 2] < 60)) { L.data[i + 3] = 0; n++; } }
  fs.writeFileSync(path.resolve(ROOT, f), PNG.sync.write(L)); console.log(f, n, 'hand pixels cleared');
}
