// GRIMGE — outfits on animation frames (user, 21 Nov 2026: "die Animationen im selben Stil"): base-character frames are laid
// into a 3×3 grid, the AI dresses all nine figures at once like a reference outfit, and every cell is snapped back onto the
// frame's own pixels and cut against the base frame → one outfit layer per frame, pixel-exact on the base animation.
//   grid:    node art/authoring/frame_dress.cjs grid <sheet.png> <frames: 8 | 0,1,2…> <out.png>
//   extract: node art/authoring/frame_dress.cjs extract <sheet.png> <frames> <grid.png> <aiOut.png> <outLayerSheet.png>
// The base frames get a dark body suit in the grid (bare torsos are flagged by the generator); the cut compares against
// exactly that suited frame. Cells are 341×341, every frame scaled by one common factor (nearest), so the snap-back cell
// is known.
const fs = require('fs'); const path = require('path'); const cp = require('child_process');
const { snapAuto, mergePalette } = require('./pixel_snap.cjs');
const [mode, sheet, framesArg, a3, a4, a5] = process.argv.slice(2);
const meta = (() => { const [W, H] = cp.execFileSync('magick', [sheet, '-format', '%w %h', 'info:']).toString().split(' ').map(Number); return { W, H }; })();
const raw = cp.execFileSync('magick', [sheet, '-alpha', 'on', '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 26 });
const N = /^\d+$/.test(framesArg) ? Number(framesArg) : null;
const nFrames = Number(process.env.FRAMES ?? 8); const fw = meta.W / nFrames, fh = meta.H; const picks = N ? [...Array(N).keys()] : framesArg.split(',').map(Number);
const CELL = 341; const S = Math.min((CELL - 8) / fw, (CELL - 8) / fh); /* one scale for all cells */
function frame(k) { const b = Buffer.alloc(fw * fh * 4); for (let y = 0; y < fh; y++) raw.copy(b, y * fw * 4, (y * meta.W + k * fw) * 4, (y * meta.W + (k + 1) * fw) * 4); return b; }
// dark suit: skin-coloured pixels below the head become greys of the same lightness
function suit(b) {
  let top = fh; for (let y = 0; y < fh && top === fh; y++) for (let x = 0; x < fw; x++) if (b[(y * fw + x) * 4 + 3]) { top = y; break; }
  const neck = top + 30; const o = Buffer.from(b);
  for (let y = neck; y < fh; y++) for (let x = 0; x < fw; x++) { const i = (y * fw + x) * 4; if (!o[i + 3]) continue; const r = o[i], g = o[i + 1], bl = o[i + 2]; if (!(r > g && g > bl && r - bl > 40 && r > 80)) continue; const l = (r + g + bl) / 3; const d = Math.round(30 + l * .28); o[i] = d; o[i + 1] = d; o[i + 2] = d + 8; }
  return o;
}
const toPng = (buf, w, h, f) => cp.execFileSync('magick', ['-size', `${w}x${h}`, '-depth', '8', 'rgba:-', `PNG32:${f}`], { input: buf });
const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'fdress-'));
const cellPos = (i) => [(i % 3) * CELL, Math.floor(i / 3) * CELL];
const offset = () => [Math.round((CELL - fw * S) / 2), Math.round((CELL - fh * S) / 2)];
if (mode === 'grid') {
  const out = a3; const args = ['-size', `${CELL * 3}x${CELL * 3}`, 'xc:rgb(22,210,5)'];
  picks.forEach((k, i) => { const f = path.join(tmp, `f${i}.png`); toPng(suit(frame(k)), fw, fh, f); const [cx, cy] = cellPos(i); const [ox, oy] = offset(); args.push('(', f, '-filter', 'point', '-resize', `${Math.round(fw * S)}x${Math.round(fh * S)}!`, ')', '-geometry', `+${cx + ox}+${cy + oy}`, '-composite'); });
  args.push('-background', 'rgb(22,210,5)', '-gravity', 'northwest', '-extent', '1024x1024', out); cp.execFileSync('magick', args);
  console.log(JSON.stringify({ grid: out, frames: picks, scale: +S.toFixed(3), frame: [fw, fh] }));
} else if (mode === 'extract' || mode === 'extractfull') { const FULL = mode === 'extractfull'; /* extractfull (user, 21 Nov 2026): the whole dressed figure — outfit AND the bare body it shows — instead of the difference to the base frame; the skin is then locked to the body palette and the reference head goes back on (dress_full.cjs) */
  const aiOut = a4, outSheet = a5;
  cp.execFileSync('magick', [aiOut, '-alpha', 'set', '-fuzz', '9%', '-fill', 'none', '-draw', 'color 0,0 floodfill', path.join(tmp, 'clean.png')]);
  const layers = Buffer.alloc(fw * picks.length * fh * 4);
  picks.forEach((k, i) => {
    const [cx, cy] = cellPos(i); const [ox, oy] = offset(); const c = path.join(tmp, `c${i}.png`);
    cp.execFileSync('magick', [path.join(tmp, 'clean.png'), '-crop', `${Math.round(fw * S)}x${Math.round(fh * S)}+${cx + ox}+${cy + oy}`, '+repage', `PNG32:${c}`]);
    const [cw, ch] = cp.execFileSync('magick', [c, '-format', '%w %h', 'info:']).toString().split(' ').map(Number);
    const r = snapAuto({ w: cw, h: ch, buf: cp.execFileSync('magick', [c, '-alpha', 'on', '-depth', '8', 'rgba:-']) }, { cell: S });
    const orig = frame(k); const base = suit(orig); const L = Buffer.alloc(fw * fh * 4); let top = fh;
    for (let y = 0; y < fh && top === fh; y++) for (let x = 0; x < fw; x++) if (base[(y * fw + x) * 4 + 3]) { top = y; break; }
    for (let y = 0; y < Math.min(fh, r.h); y++) for (let x = 0; x < Math.min(fw, r.w); x++) {
      const ri = (y * r.w + x) * 4, bi = (y * fw + x) * 4; if (!r.buf[ri + 3]) continue; const g = r.buf[ri + 1] > 150 && r.buf[ri] < 110 && r.buf[ri + 2] < 110; if (g) continue;
      const d = Math.abs(r.buf[ri] - base[bi]) + Math.abs(r.buf[ri + 1] - base[bi + 1]) + Math.abs(r.buf[ri + 2] - base[bi + 2]);
      const suited = base[bi] !== orig[bi] || base[bi + 1] !== orig[bi + 1]; /* skin the grid suit covered: the AI's pixel there is kept, so no bare skin shows through the armour */ if (!FULL && base[bi + 3] && !suited && d < (y < top + 22 ? 150 : 80)) continue; /* the base shows through (the face more strictly — only the head itself: bone pauldrons and horns at the shoulders lost pixels when this zone reached 30 rows, user 21 Nov 2026) */
      r.buf.copy(L, bi, ri, ri + 4); L[bi + 3] = 255;
    }
    mergePalette(L, 60);
    for (let y = 0; y < fh; y++) L.copy(layers, (y * fw * picks.length + i * fw) * 4, y * fw * 4, (y + 1) * fw * 4);
  });
  toPng(layers, fw * picks.length, fh, outSheet); console.log(JSON.stringify({ layers: outSheet, frames: picks.length }));
}
fs.rmSync(tmp, { recursive: true, force: true });
