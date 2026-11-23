// GRIMGE — one head for every frame (user, 22 Nov 2026: "die Mundveränderungen in den Animationen sind echt schrecklich,
// als würde er eine Schnute ziehen — der Kopf sollte sich am besten gar nicht verändern, nur wenn er die Richtung wechselt,
// sodass immer der gleiche Kopf verwendet werden kann"). The old transplant (head_transplant.cjs) only replaced skull, eyes
// and nose (rows 30–55) and left the AI's mouth and jaw — redrawn in every frame, hence the pout. Here:
//   • the WHOLE reference head down to the chin (rows 34–61, the neck left of the jaw line excluded) is pasted,
//   • tilted heads get the same head rotated (−24°…+24°, nearest — pixels stay pixels), found by template matching,
//   • whatever crosses the head from outside (fist, forearm, collar) stays in front: differing pixels connected to the
//     area outside the head are not overwritten,
//   • only heads that match no rotation (turned away, seen from above/behind) keep their own drawing — the direction changes.
//   node art/authoring/head_lock.cjs          → base sheets + public/src/head_anchors.js ([ox, oy, q, deg] per frame)
//   require('./head_lock.cjs').pasteHead(png, frameIndex, fw, fh, anchor)   (used by dress_full.cjs for the class sheets)
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const ROOT = path.resolve(__dirname, '../..'); const SHEETS = path.join(ROOT, 'public/assets/sprites/sheets');
const body = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public/assets/character/body/body.png'))); const N = 184;
const CX = 94, CY = 48; /* rotation centre: middle of the head */
const inHead = (x, y) => { if (x < 78 || x > 110 || y < 34 || y > 61) return false; if (body.data[(y * N + x) * 4 + 3] < 128) return false; return y <= 56 || x >= 86 + (y - 56) * 3; }; /* below row 56 only right of the jaw line (the neck is not head) */
const head = []; for (let y = 34; y <= 61; y++) for (let x = 78; x <= 110; x++) if (inHead(x, y)) { const i = (y * N + x) * 4; head.push({ x, y, c: [body.data[i], body.data[i + 1], body.data[i + 2]] }); }
// rotated template: for every target pixel the source pixel (inverse rotation, nearest) — a solid head without holes
const ANGLES = [0, -6, 6, -12, 12, -18, 18, -24, 24];
const tplCache = new Map();
const SCALES = [.88, .94, 1.06, 1.12]; /* the generator draws the head a little smaller or larger in some clips: the same head, scaled */
function template(deg, sc = 1) {
  const key = `${deg}/${sc}`; if (tplCache.has(key)) return tplCache.get(key); const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a); const map = new Map(head.map((p) => [p.y * N + p.x, p])); const out = [];
  const inv = (x, y) => { const dx = x - CX, dy = y - CY; return [CX + (dx * ca + dy * sa) / sc, CY + (-dx * sa + dy * ca) / sc]; };
  for (let y = 20; y <= 76; y++) for (let x = 64; x <= 124; x++) { const [fx, fy] = inv(x, y); const p = map.get(Math.round(fy) * N + Math.round(fx)); if (p) out.push({ x, y, c: p.c }); }
  const on = new Set(out.map((t) => t.y * 1000 + t.x)); const halo = [];
  for (let y = 16; y <= 80; y++) for (let x = 60; x <= 128; x++) { if (on.has(y * 1000 + x) || inv(x, y)[1] >= 50) continue; let near = false; for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) if (on.has((y + dy) * 1000 + x + dx)) { near = true; break; } if (near) halo.push({ x, y }); }
  out.halo = halo; tplCache.set(key, out); return out;
}
const cdist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
// match quality of a template at an offset: colour agreement over the head, missing pixels cost
// … and nothing may stand right outside the upper half of the head: a head placed too low or too small leaves the generated
// skull standing above it (the halo term; raised arms there cost a little, which the colour term outweighs)
function quality(px, tpl, ox, oy) { let s = 0; for (const t of tpl) { const p = px(t.x + ox, t.y + oy); s += p ? 1 - Math.min(1, cdist(p, t.c) / 240) : -1; } let h = 0; for (const t of tpl.halo ?? []) if (px(t.x + ox, t.y + oy)) h++; return s / tpl.length - (tpl.halo?.length ? .6 * h / tpl.halo.length : 0); }
// the head is the top of the body: a full body mass right above a head position means it slid onto the chest (a raised arm
// over the head fills well under 80 % of that band)
function bodyAbove(px, tpl, ox, oy) { let tTop = 1e9; for (const t of tpl) if (t.x === CX) tTop = Math.min(tTop, t.y); const cx0 = CX + ox, y0 = tTop + oy; let n = 0, on = 0; for (let y = y0 - 12; y <= y0 - 3; y++) for (let x = cx0 - 8; x <= cx0 + 8; x++) { n++; if (px(x, y)) on++; } return on > n * .8; }
// best rotation (and a ±3 px refinement) around a translation-only anchor; a poor match searches the whole head band
function track(px, ox0, oy0, fw, fh) {
  let best = { q: -1, ox: ox0, oy: oy0, deg: 0, sc: 1 };
  const tryAt = (deg, ox, oy, sc = 1) => { if (bodyAbove(px, template(deg, sc), ox, oy)) return; const q = quality(px, template(deg, sc), ox, oy) - Math.abs(deg) * .0015 - Math.abs(1 - sc) * .3; if (q > best.q) best = { q, ox, oy, deg, sc }; };
  for (const deg of ANGLES) for (let oy = oy0 - 3; oy <= oy0 + 3; oy++) for (let ox = ox0 - 3; ox <= ox0 + 3; ox++) tryAt(deg, ox, oy);
  if (best.q < .6 && fw) { /* wide: every column, a band below the figure's top row, every angle (step 2 px, then refine) */
    let top = fh; for (let y = 0; y < fh && top === fh; y++) for (let x = 0; x < fw; x++) if (px(x, y)) { top = y; break; }
    for (const deg of ANGLES) for (let oy = top - 34 - 8; oy <= top - 34 + 16; oy += 2) for (let ox = -100; ox <= fw - 70; ox += 2) tryAt(deg, ox, oy);
    const c = { ...best }; for (let oy = c.oy - 1; oy <= c.oy + 1; oy++) for (let ox = c.ox - 1; ox <= c.ox + 1; ox++) tryAt(c.deg, ox, oy);
  }
  if (best.q < .6 && fw) { /* still poor: the wide band once more with the scaled heads */
    let top = fh; for (let y = 0; y < fh && top === fh; y++) for (let x = 0; x < fw; x++) if (px(x, y)) { top = y; break; }
    for (const sc of SCALES) for (const deg of ANGLES) for (let oy = top - 34 - 8; oy <= top - 34 + 16; oy += 2) for (let ox = -100; ox <= fw - 70; ox += 2) tryAt(deg, ox, oy, sc);
  }
  if (best.q < .7) { const c = { ...best }; for (const sc of SCALES) for (const deg of ANGLES.filter((d) => Math.abs(d - c.deg) <= 6)) for (let oy = c.oy - 5; oy <= c.oy + 5; oy++) for (let ox = c.ox - 5; ox <= c.ox + 5; ox++) tryAt(deg, ox, oy, sc); }
  return best;
}
// paste the (rotated) head into frame k of a sheet PNG. Occluders stay in front: the frame is split into regions along its
// dark outlines; a region that is not the face and reaches well outside the head (a fist, a forearm, a collar) keeps its
// pixels and its outline inside the head. The AI's mouth, jaw, eyes lie inside the head and are replaced.
function pasteHead(png, k, fw, fh, [ox, oy, q, deg = 0, sc = 1], minQ = .55, tplOverride = null) {
  if (q < minQ) return false; const tpl = tplOverride ?? template(deg, sc); const W = png.width; const at = (x, y) => (y * W + k * fw + x) * 4;
  const inside = new Map(); for (const t of tpl) { const x = t.x + ox, y = t.y + oy; if (x >= 0 && y >= 0 && x < fw && y < fh) inside.set(y * fw + x, t); }
  const opaque = (x, y) => x >= 0 && y >= 0 && x < fw && y < fh && png.data[at(x, y) + 3] > 127;
  // the head is the top of the body: a full body mass right above it means the match slid onto the chest (a raised arm
  // over the head covers well under half of that band)
  if (bodyAbove((x, y) => opaque(x, y), tpl, ox, oy)) return false;
  const dark = (x, y) => { const i = at(x, y); return .3 * png.data[i] + .59 * png.data[i + 1] + .11 * png.data[i + 2] < 60; };
  // regions of non-outline pixels in a box around the head (4-connected)
  let x0 = fw, y0 = fh, x1 = 0, y1 = 0; for (const key of inside.keys()) { const x = key % fw, y = (key / fw) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const M = 12; x0 = Math.max(0, x0 - M); y0 = Math.max(0, y0 - M); x1 = Math.min(fw - 1, x1 + M); y1 = Math.min(fh - 1, y1 + M);
  const reg = new Map(); const regs = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const key = y * fw + x; if (reg.has(key) || !opaque(x, y) || dark(x, y)) continue; const id = regs.length; const info = { n: 0, out: 0, pts: [] }; regs.push(info); const st = [key]; reg.set(key, id);
    while (st.length) { const c = st.pop(); info.n++; info.pts.push(c); if (!inside.has(c)) info.out++; const cx = c % fw, cy = (c / fw) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < x0 || ny < y0 || nx > x1 || ny > y1) continue; const nk = ny * fw + nx; if (!reg.has(nk) && opaque(nx, ny) && !dark(nx, ny)) { reg.set(nk, id); st.push(nk); } } } }
  // the face region: the one under the head's centre (nearest non-outline pixel); it is never an occluder
  const fc = Math.round(CY + oy) * fw + Math.round(CX + ox); let faceId = reg.get(fc);
  if (faceId === undefined) { let bd = 1e9; for (const [key, id] of reg) { if (!inside.has(key)) continue; const d = Math.abs((key % fw) - (CX + ox)) + Math.abs(((key / fw) | 0) - (CY + oy)); if (d < bd) { bd = d; faceId = id; } } }
  const keep = new Set(); const occl = new Set(); regs.forEach((r, id) => { if (id === faceId || r.n < 8) return; const inn = r.n - r.out; if (inn && r.out >= Math.max(6, r.n * .25)) { occl.add(id); for (const p of r.pts) if (inside.has(p)) keep.add(p); } });
  // the occluders' own outline inside the head
  for (const key of [...keep]) { const x = key % fw, y = (key / fw) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nk = (y + dy) * fw + x + dx; if (inside.has(nk) && opaque(x + dx, y + dy) && dark(x + dx, y + dy)) keep.add(nk); } }
  for (const [key, t] of inside) { if (keep.has(key)) continue; const x = key % fw, y = (key / fw) | 0; png.data.set([t.c[0], t.c[1], t.c[2], 255], at(x, y)); }
  // what is left of the generated head around the new one (its larger skull outline, teeth below the chin) goes: a 4 px ring
  // outside the new head, over the skull and in front of the chin — never occluders (arms, collars) and never the neck
  const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const tplXY = (x, y) => { const dx = x - ox - CX, dy = y - oy - CY; return [CX + (dx * ca + dy * sa) / sc, CY + (-dx * sa + dy * ca) / sc]; };
  const nearOccl = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const id = reg.get((y + dy) * fw + x + dx); if (id !== undefined && occl.has(id)) return true; } return false; };
  const ring = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (inside.has((y + dy) * fw + x + dx)) return true; return false; };
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const key = y * fw + x; if (inside.has(key) || !opaque(x, y) || !dark(x, y) || nearOccl(x, y) || !ring(x, y)) continue; const [, ty] = tplXY(x, y); if (ty < 54) png.data[at(x, y) + 3] = 0; }
  { const seen = new Set(); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const key = y * fw + x; if (seen.has(key) || inside.has(key) || !opaque(x, y)) continue; const st = [key], pts = []; seen.add(key); let inRing = true;
      while (st.length) { const c = st.pop(); pts.push(c); const cx = c % fw, cy = (c / fw) | 0; if (!ring(cx, cy) || tplXY(cx, cy)[1] >= 54) inRing = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, ny = cy + dy; if (nx < x0 || ny < y0 || nx > x1 || ny > y1) { inRing = false; continue; } const nk = ny * fw + nx; if (!seen.has(nk) && !inside.has(nk) && opaque(nx, ny)) { seen.add(nk); st.push(nk); } } }
      if (inRing && pts.length < 40) for (const p of pts) png.data[at(p % fw, (p / fw) | 0) + 3] = 0; } }
  { /* teeth of the generated (open) mouth left in front of / below the new chin: skin is never white */
    const white = (x, y) => { const i = at(x, y); if (png.data[i + 3] < 128) return false; const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2]; return Math.min(r, g, b) > 165 || (b > r + 30 && b > 100); }; /* teeth (white) and eyes (blue) of the generated face */
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const key = y * fw + x; if (inside.has(key) || !white(x, y) || !ring(x, y)) continue; const [tx, ty] = tplXY(x, y); if (ty < 40 || tx < 92) continue;
      const cnt = new Map(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if ((!dx && !dy) || !opaque(x + dx, y + dy) || white(x + dx, y + dy)) continue; const i = at(x + dx, y + dy); const k2 = (png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]; cnt.set(k2, (cnt.get(k2) ?? 0) + 1); }
      let bk = null, bn = 0; for (const [k2, c] of cnt) if (c > bn) { bn = c; bk = k2; } if (bk === null) png.data[at(x, y) + 3] = 0; else png.data.set([bk >> 16, (bk >> 8) & 255, bk & 255, 255], at(x, y)); } }
  return true;
}
// an open mouth in a borrowed direction head (teeth = white below the eyes) becomes skin: the head keeps one closed mouth
function closeMouth(vt) {
  const at = new Map(vt.map((t) => [t.y * 1000 + t.x, t])); const white = (c) => Math.min(c[0], c[1], c[2]) > 165;
  // teeth share the eye-white colour: they are told apart by size — a white patch of 5+ pixels (an eye white has about 2)
  const teeth = new Set(); const seen = new Set();
  for (const t of vt) { const key = t.y * 1000 + t.x; if (seen.has(key) || !white(t.c)) continue; const st = [t], blob = []; seen.add(key); while (st.length) { const c = st.pop(); blob.push(c); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nk = (c.y + dy) * 1000 + c.x + dx; const nb = at.get(nk); if (nb && !seen.has(nk) && white(nb.c)) { seen.add(nk); st.push(nb); } } } if (blob.length >= 5) for (const b of blob) teeth.add(b); }
  for (let pass = 0; pass < 3; pass++) for (const t of vt) { if (!teeth.has(t) || !white(t.c)) continue; const cnt = new Map(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nb = at.get((t.y + dy) * 1000 + t.x + dx); if (!nb || white(nb.c) || cdist(nb.c, [0, 0, 0]) < 120) continue; const k = nb.c.join(','); cnt.set(k, (cnt.get(k) ?? 0) + 1); } let bk = null, bn = 0; for (const [k, c] of cnt) if (c > bn) { bn = c; bk = k; } if (bk) t.c = bk.split(',').map(Number); }
}
// a clip whose head is the reference in at least half its frames keeps that head in its weaker frames too (same direction,
// drawn a bit differently) — no face switching mid-clip; clips that mostly look elsewhere (lying, frontal) keep theirs
const clipMinQ = (anchors) => { const good = anchors.filter((a) => a[2] >= .55).length / anchors.length; return good >= .75 ? .4 : good >= .5 ? .48 : .55; };
module.exports = { pasteHead, track, template, clipMinQ, quality };
if (require.main === module) {
  const src = fs.readFileSync(path.join(ROOT, 'public/src/head_anchors.js'), 'utf8'); const A = JSON.parse(/\/\*META\*\/([\s\S]*?)\/\*END\*\//.exec(src)[1]); const out = {};
  for (const [key, anchors] of Object.entries(A)) {
    const file = path.join(SHEETS, `${key}.png`); if (!fs.existsSync(file)) { out[key] = anchors; continue; }
    const png = PNG.sync.read(fs.readFileSync(file)); const n = anchors.length; const fw = png.width / n, fh = png.height; const res = []; let pasted = 0;
    anchors.forEach(([ox, oy], k) => {
      const px = (x, y) => { if (x < 0 || y < 0 || x >= fw || y >= fh) return null; const i = (y * png.width + k * fw + x) * 4; return png.data[i + 3] > 127 ? [png.data[i], png.data[i + 1], png.data[i + 2]] : null; };
      const t = track(px, ox, oy, fw, fh); res.push([t.ox, t.oy, +Math.max(0, t.q).toFixed(2), t.deg, t.sc]);
    });
    const minQ = clipMinQ(res); const okK = res.map((a) => a[2] >= minQ); const lowQ = new Array(n).fill(minQ);
    if (okK.filter(Boolean).length * 2 >= n) res.forEach((a, k) => { if (okK[k]) return; let p = -1, q = -1; for (let d = 1; d < n && (p < 0 || q < 0); d++) { if (p < 0 && okK[(k - d + n) % n]) p = (k - d + n) % n; if (q < 0 && okK[(k + d) % n]) q = (k + d) % n; } if (p < 0) return;
      const A = res[p], B = res[q]; const pose = [Math.round((A[0] + B[0]) / 2), Math.round((A[1] + B[1]) / 2), 0, Math.round((A[3] + B[3]) / 12) * 6, Math.abs(A[4] - B[4]) < .01 ? A[4] : 1];
      const px = (x, y) => { if (x < 0 || y < 0 || x >= fw || y >= fh) return null; const i = (y * png.width + k * fw + x) * 4; return png.data[i + 3] > 127 ? [png.data[i], png.data[i + 1], png.data[i + 2]] : null; };
      let best = null; for (let oy = pose[1] - 3; oy <= pose[1] + 3; oy++) for (let ox = pose[0] - 3; ox <= pose[0] + 3; ox++) { const qv = quality(px, template(pose[3], pose[4]), ox, oy); if (!best || qv > best[2]) best = [ox, oy, qv, pose[3], pose[4]]; }
      if (best[2] >= .3) { best[2] = +best[2].toFixed(2); res[k] = best; lowQ[k] = .3; } });
    const done = res.map((a, k) => pasteHead(png, k, fw, fh, a, lowQ[k])); pasted = done.filter(Boolean).length;
    // direction heads (user: "nur wenn er die Richtung wechselt"): a run of frames without the reference head (looking up,
    // lying) gets ONE head — the run's frame closest to the reference lends its head to the others, so it does not
    // change from frame to frame inside that direction either
    let variants = 0;
    for (let k0 = 0; k0 < n;) {
      if (done[k0]) { k0++; continue; } let k1 = k0; while (k1 + 1 < n && !done[k1 + 1]) k1++; const run = []; for (let k = k0; k <= k1; k++) run.push(k); k0 = k1 + 1; if (run.length < 2) continue;
      const pxOf = (k) => (x, y) => { if (x < 0 || y < 0 || x >= fw || y >= fh) return null; const i = (y * png.width + k * fw + x) * 4; return png.data[i + 3] > 127 ? [png.data[i], png.data[i + 1], png.data[i + 2]] : null; };
      const headOf = (k) => { const [sx, sy, , sdeg, ssc] = res[k]; const foot = template(sdeg, ssc); const ps = pxOf(k); const vt = []; for (const t of foot) { const c = ps(t.x + sx, t.y + sy); if (c) vt.push({ x: t.x, y: t.y, c }); } vt.halo = foot.halo; closeMouth(vt); return vt.length >= foot.length * .6 ? vt : null; }; /* a frame's own head, in template coordinates */
      const fitIn = (vt, k) => { const pk = pxOf(k); let best = null; for (let oy = res[k][1] - 6; oy <= res[k][1] + 6; oy++) for (let ox = res[k][0] - 6; ox <= res[k][0] + 6; ox++) { const qv = quality(pk, vt, ox, oy); if (!best || qv > best[2]) best = [ox, oy, qv, 0, 1]; } return best; };
      let pick = null; for (const c of run) { const vt = headOf(c); if (!vt) continue; const fits = run.filter((k) => k !== c).map((k) => fitIn(vt, k)); const score = fits.reduce((a, b) => a + Math.max(0, b[2]), 0); if (!pick || score > pick.score) pick = { vt, src: c, fits, score }; }
      if (!pick) continue;
      { const [sx, sy, sq, sdeg, ssc] = res[pick.src]; if (pasteHead(png, pick.src, fw, fh, [sx, sy, 1, 0, 1], .3, pick.vt)) { variants++; res[pick.src] = [sx, sy, Math.max(sq, .3), sdeg, ssc, 1]; } } /* the source frame too: its mouth closed like the others */
      run.filter((k) => k !== pick.src).forEach((k, i) => { const best = pick.fits[i]; if (best[2] >= .45 && pasteHead(png, k, fw, fh, best, .45, pick.vt)) { variants++; res[k] = [best[0], best[1], Math.max(+best[2].toFixed(2), .3), res[pick.src][3], res[pick.src][4], 1]; } });
    }
    if (variants) console.log('  direction head reused in', variants, 'frames');
    fs.writeFileSync(file, PNG.sync.write(png)); out[key] = res;
    console.log(key.padEnd(20), `${pasted}/${n} frames: one head`, res.map((r) => `${r[2]}${r[3] ? `@${r[3]}°` : ''}${r[4] !== 1 ? `×${r[4]}` : ''}`).join(' '));
  }
  const js = src.replace(/\/\*META\*\/[\s\S]*?\/\*END\*\//, `/*META*/${JSON.stringify(out)}/*END*/`).replace(/\[ox, oy, q(, deg)?\]/, '[ox, oy, q, deg, scale, direction head?]');
  fs.writeFileSync(path.join(ROOT, 'public/src/head_anchors.js'), js); console.log('written public/src/head_anchors.js');
}
