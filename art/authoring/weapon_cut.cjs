// GRIMGE — weapon sheets (Higgsfield, 6 weapons in a 2×3 grid) → one native-pixel sprite per weapon piece, in its slot.
//   node art/authoring/weapon_cut.cjs <sheet.png> <name1,…,name6> <spellsDir> <out.json>
// Each cell's weapon is cut out (connected regions, hard alpha), brought to the characters' pixel density by taking each
// cell's dominant colour (pixel_snap snapAuto with a fixed cell size): its native length is half the old hd sheet width
// (the old sheets were drawn at res 2), so the weapon keeps its on-screen size and shows the same art-pixel size as the
// characters (drawn at the weapon size factor .75 ≈ ART_PX). The grip keeps the old slot's relative position along the
// weapon; for long weapons its height is put onto the shaft (the middle of the opaque pixels in that column).
// Writes <spellsDir>/<name>.png (one frame) and merges { name: { gx, gy, w, h } } into out.json.
const fs = require('fs'); const path = require('path'); const cp = require('child_process'); const os = require('os');
const { snapAuto } = require('./pixel_snap.cjs');
const [sheet, namesArg, spellsDir, outJson] = process.argv.slice(2); const names = namesArg.split(',');
const ROOT = path.resolve(__dirname, '../..');
const WS = fs.readFileSync(path.join(ROOT, 'public/src/weapon_sheets.js'), 'utf8');
const slot = (name) => { const m = WS.match(new RegExp(`\\['${name}', (\\d+), (\\d+), (\\d+), (\\d+)`)); return m ? m.slice(1).map(Number) : null; };
const UPRIGHT = new Set(['w_shield', 'w_shield_mace', 'w_shield_ward', 'w_shield_sun', 'w_grimoire', 'w_orb', 'w_focus', 'w_talisman', 'w_bow', 'w_chakram', 'w_card', 'w_fan', 'w_harp']);
const [W, H] = cp.execFileSync('magick', [sheet, '-format', '%w %h', 'info:']).toString().split(' ').map(Number);
const b = cp.execFileSync('magick', [sheet, '-alpha', 'on', '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 26 });
// connected regions (8-neighbour, alpha >= 128)
const lab = new Int32Array(W * H).fill(-1); const regs = [];
for (let s = 0; s < W * H; s++) {
  if (lab[s] >= 0 || b[s * 4 + 3] < 128) continue; const r = { n: 0, sx: 0, sy: 0, px: [] }; const st = [s]; lab[s] = regs.length;
  while (st.length) { const p = st.pop(); const x = p % W, y = (p / W) | 0; r.n++; r.sx += x; r.sy += y; r.px.push(p);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X; if (lab[q] < 0 && b[q * 4 + 3] >= 128) { lab[q] = regs.length; st.push(q); } } }
  regs.push(r);
}
const cellOf = (r) => { const cx = r.sx / r.n, cy = r.sy / r.n; return Math.min(1, Math.floor(cx / (W / 2))) + 2 * Math.min(2, Math.floor(cy / (H / 3))); };
const out = fs.existsSync(outJson) ? JSON.parse(fs.readFileSync(outJson, 'utf8')) : {};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wcut-'));
names.forEach((name, k) => {
  if (!name || name === '-') return; const old = slot(name); if (!old) { console.log('no slot', name); return; }
  const mine = regs.filter((r) => r.n > 6 && cellOf(r) === k); if (!mine.length) { console.log('empty cell', k, name); return; }
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (const r of mine) for (const p of r.px) { const x = p % W, y = (p / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1; const crop = Buffer.alloc(cw * ch * 4);
  for (const r of mine) for (const p of r.px) { const x = p % W, y = (p / W) | 0; b.copy(crop, ((y - y0) * cw + (x - x0)) * 4, p * 4, p * 4 + 4); }
  const [ogx, ogy, oW, oH] = old; const up = UPRIGHT.has(name);
  const cell = up ? ch / Math.max(8, Math.round(oH / 2)) : cw / Math.max(8, Math.round(oW / 2));
  const r = snapAuto({ w: cw, h: ch, buf: crop }, { cell });
  // trim the snapped sprite
  let tx0 = 1e9, ty0 = 1e9, tx1 = -1, ty1 = -1; for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.buf[(y * r.w + x) * 4 + 3]) { tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); ty0 = Math.min(ty0, y); ty1 = Math.max(ty1, y); }
  const w = tx1 - tx0 + 1, h = ty1 - ty0 + 1; const img = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) r.buf.copy(img, y * w * 4, ((y + ty0) * r.w + tx0) * 4, ((y + ty0) * r.w + tx0 + w) * 4);
  let gx = Math.round(ogx / oW * w), gy = Math.round(ogy / oH * h);
  if (!up) { for (let d = 0; d < w; d++) for (const X of [gx - d, gx + d]) { if (X < 0 || X >= w) continue; const ys = []; for (let y = 0; y < h; y++) if (img[(y * w + X) * 4 + 3]) ys.push(y); if (ys.length) { gx = X; gy = Math.round((ys[0] + ys[ys.length - 1]) / 2); d = w; break; } } }
  cp.execFileSync('magick', ['-size', `${w}x${h}`, '-depth', '8', 'rgba:-', `PNG32:${path.join(spellsDir, name + '.png')}`], { input: img });
  out[name] = { gx, gy, w, h }; console.log(name, JSON.stringify(out[name]));
});
fs.writeFileSync(outJson, JSON.stringify(out, null, 1)); fs.rmSync(tmp, { recursive: true, force: true });
