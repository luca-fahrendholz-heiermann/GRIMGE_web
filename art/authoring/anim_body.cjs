// GRIMGE — base-body animation GIF (Higgsfield) → frames at the reference body's exact pixel density and palette.
//   node art/authoring/anim_body.cjs <in.gif> <outDir> <name> [nativeHeight=116]
// The AI draws finer than the body, so its "pixels" are not the body's. Frame 0 (the stance) is measured: its figure must
// be `nativeHeight` art pixels tall (the reference body is 116) → that gives the cell size; every frame is snapped with
// that one cell (each cell's dominant colour, hard alpha) and every colour is clamped to the body's own palette (plus a
// dark ramp for the training shorts the animation wears — the bare body is flagged by the generator). Frames keep their
// facing (right, like the body), share one crop box, and are written side by side; the meta goes to <name>.json:
// frame size, frame count and the feet anchor (bottom centre of frame 0's figure).
const fs = require('fs'); const path = require('path'); const cp = require('child_process');
const { readRaw, snapAuto } = require('./pixel_snap.cjs');
const [gif, outDir, name, hArg] = process.argv.slice(2); const H = Number(hArg ?? 116); fs.mkdirSync(outDir, { recursive: true });
const ROOT = path.resolve(__dirname, '../..'); const BODY = path.join(ROOT, 'art_source/body/body_184.png');
const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'animbody-'));
cp.execFileSync('magick', [gif, '-coalesce', path.join(tmp, 'f_%02d.png')], { stdio: 'ignore' });
const files = fs.readdirSync(tmp).filter((f) => f.startsWith('f_')).sort();
const bbox = (img) => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.buf[(y * img.w + x) * 4 + 3] >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, y0, x1, y1 }; };
// the body's palette (+ the shorts' dark ramp)
const B = cp.execFileSync('magick', [BODY, '-depth', '8', 'rgba:-']); const pal = new Map();
for (let i = 0; i < B.length; i += 4) { const g = B[i + 1] > 150 && B[i] < 110 && B[i + 2] < 110; if (!g) pal.set((B[i] << 16) | (B[i + 1] << 8) | B[i + 2], [B[i], B[i + 1], B[i + 2]]); }
const PAL = [...pal.values(), [26, 26, 31], [44, 44, 51], [68, 68, 77]];
const nearest = (r, g, b) => { let best = PAL[0], d0 = 1e9; for (const p of PAL) { const d = (p[0] - r) ** 2 * 3 + (p[1] - g) ** 2 * 4 + (p[2] - b) ** 2 * 2; if (d < d0) { d0 = d; best = p; } } return best; };
const raw0 = readRaw(path.join(tmp, files[0])); const b0 = bbox(raw0); const cell = (b0.y1 - b0.y0 + 1) / H;
const frames = files.map((f) => { const r = snapAuto(readRaw(path.join(tmp, f)), { cell }); for (let i = 0; i < r.buf.length; i += 4) if (r.buf[i + 3]) { const p = nearest(r.buf[i], r.buf[i + 1], r.buf[i + 2]); r.buf[i] = p[0]; r.buf[i + 1] = p[1]; r.buf[i + 2] = p[2]; } return r; });
// shared crop box over all frames
let U = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 }; for (const r of frames) { const b = bbox(r); U = { x0: Math.min(U.x0, b.x0), y0: Math.min(U.y0, b.y0), x1: Math.max(U.x1, b.x1), y1: Math.max(U.y1, b.y1) }; }
const fw = U.x1 - U.x0 + 3, fh = U.y1 - U.y0 + 2; const sheet = Buffer.alloc(fw * frames.length * fh * 4);
frames.forEach((r, k) => { for (let y = 0; y < fh - 1; y++) for (let x = 0; x < fw - 2; x++) { const sx = U.x0 + x, sy = U.y0 + y; if (sx >= r.w || sy >= r.h) continue; const si = (sy * r.w + sx) * 4, di = (y * fw * frames.length + k * fw + x + 1) * 4; r.buf.copy(sheet, di, si, si + 4); } });
cp.execFileSync('magick', ['-size', `${fw * frames.length}x${fh}`, '-depth', '8', 'rgba:-', `PNG32:${path.join(outDir, name + '.png')}`], { input: sheet });
const f0 = bbox(frames[0]); const meta = { frames: frames.length, fw, fh, anchorX: Math.round((f0.x0 + f0.x1) / 2 - U.x0 + 1), anchorY: f0.y1 - U.y0, cell: +cell.toFixed(3), height: f0.y1 - f0.y0 + 1 };
fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(meta)); fs.rmSync(tmp, { recursive: true, force: true });
console.log(name, JSON.stringify(meta));
