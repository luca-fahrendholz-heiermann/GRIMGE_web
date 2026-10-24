// GRIMGE — hi-res refinement of the generated spell sprites (user, 24 Oct 2026: "die Sprites müssen noch zur
// Grafik des Pixel-Charakters passen, wirken im Vergleich zur Szene fremdplatziert").
// Why they looked foreign: a spell pixel was 2 world px while a character pixel is ~0.7 world px (3× coarser),
// with thick near-black outlines and flat fills, while the hero and the painted scene are finely shaded.
// The pass (per frame, no blur, no new hues beyond light / shade steps of the existing ones):
//   1 strip the old 1-px dark outline   2 Scale2x (EPX) — twice the pixel density, crisp diagonals
//   3 light from the top left: lit rim (+), shaded rim (−) a few pixels deep — volume like the characters
//   4 a new 1-px outline in a dark MATERIAL colour (the neighbour darkened), not near-black
// The result is written at res× the frame size; the game draws it at the same world size (finer pixels).
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const lum = (c) => (c[0] * .299 + c[1] * .587 + c[2] * .114) / 255;
const shadeC = (c, k) => [0, 1, 2].map((i) => Math.max(0, Math.min(255, Math.round(k >= 0 ? c[i] + (255 - c[i]) * k : c[i] * (1 + k)))));

function frameOf(png, fw, fh, f) {
  const px = new Array(fw * fh).fill(null);
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const i = ((y * png.width) + f * fw + x) * 4; if (png.data[i + 3] > 0) px[y * fw + x] = [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]]; }
  return px;
}
const at = (px, w, h, x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : px[y * w + x]);
const same = (a, b) => (a === b) || (!!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]);

// 1 — a border pixel that is clearly darker than the pixel inside it is the old outline.
function stripOutline(px, w, h) {
  const out = px.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = at(px, w, h, x, y); if (!c) continue;
    const n4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    if (!n4.some(([dx, dy]) => !at(px, w, h, x + dx, y + dy))) continue;
    const inner = n4.map(([dx, dy]) => ({ c: at(px, w, h, x - dx, y - dy), x: x - dx, y: y - dy })).filter((o) => o.c && !n4.some(([ex, ey]) => !at(px, w, h, o.x + ex, o.y + ey))).map((o) => o.c);
    const ref = inner[0] ?? n4.map(([dx, dy]) => at(px, w, h, x + dx, y + dy)).find(Boolean);
    if (ref && lum(c) < lum(ref) * .6 && lum(c) < .3) out[y * w + x] = null;
  }
  return out;
}
// 2 — Scale2x / EPX.
function scale2x(px, w, h) {
  const W = w * 2; const out = new Array(W * h * 2).fill(null);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = at(px, w, h, x, y); const A = at(px, w, h, x, y - 1); const B = at(px, w, h, x + 1, y); const C = at(px, w, h, x - 1, y); const D = at(px, w, h, x, y + 1);
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (!same(C, B) && !same(A, D)) { if (same(C, A)) e0 = C ?? P; if (same(A, B)) e1 = B ?? P; if (same(D, C)) e2 = C ?? P; if (same(B, D)) e3 = B ?? P; }
    // Transparent pixels stay transparent (the silhouette only gets smoother diagonals, it never grows).
    const put = (ox, oy, c) => { out[(y * 2 + oy) * W + x * 2 + ox] = P ? (c ?? P) : null; };
    put(0, 0, e0); put(1, 0, e1); put(0, 1, e2); put(1, 1, e3);
  }
  return out;
}
// 3 — volume light from the top left over the WHOLE body (like the painted character shading), quantised into
// a few 1-px-precise steps so it stays pixel art: distance to the edge toward the light / away from it.
function shade(px, w, h, reach = 9, steps = .075) {
  const out = px.slice();
  const march = (x, y, dx, dy) => { for (let k = 1; k <= reach; k++) if (!at(px, w, h, x + dx * k, y + dy * k)) return k; return reach + 1; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = at(px, w, h, x, y); if (!c) continue;
    const toLight = Math.min(march(x, y, -1, -1), march(x, y, 0, -1) + 1); const toShade = Math.min(march(x, y, 1, 1), march(x, y, 0, 1) + 1);
    let k = 0;
    if (toLight <= reach) k += .3 * (1 - (toLight - 1) / reach) ** 1.4;
    if (toShade <= reach) k -= .34 * (1 - (toShade - 1) / reach) ** 1.2;
    if (toLight <= 1 && toShade > 3) k += .12; // a crisp 1-px rim light on the lit edge
    k = Math.round(k / steps) * steps;
    if (k) out[y * w + x] = [...shadeC(c, k), c[3]];
  }
  // Facet seams: where two clearly different colours meet inside the body, the darker side gets a 1-px seam.
  const seamed = out.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = at(px, w, h, x, y); if (!c) continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) { const n = at(px, w, h, x + dx, y + dy); if (!n || Math.abs(lum(c) - lum(n)) < .12) continue; if (lum(c) < lum(n)) seamed[y * w + x] = [...shadeC(out[y * w + x], -.14), c[3]]; }
  }
  return seamed;
}
// 4 — a 1-px outline in the dark material colour of the neighbour.
function outline(px, w, h) {
  const out = px.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (at(px, w, h, x, y)) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => at(px, w, h, x + dx, y + dy)).filter(Boolean);
    if (!n.length) continue;
    const c = n.reduce((a, b) => (lum(a) < lum(b) ? a : b));
    out[y * w + x] = [...shadeC(c, -.55), 255];
  }
  return out;
}

function refineSheet(sheet, { res = 2, strip = true, shading = true, line = true } = {}) {
  const fw = sheet.fw; const fh = sheet.fh; const W = fw * res; const H = fh * res;
  const png = new PNG({ width: W * sheet.frames, height: H }); png.data.fill(0);
  for (let f = 0; f < sheet.frames; f++) {
    let px = frameOf(sheet.png, fw, fh, f);
    if (strip) px = stripOutline(px, fw, fh);
    px = scale2x(px, fw, fh); // res 2
    if (shading) px = shade(px, W, H);
    if (line) px = outline(px, W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = px[y * W + x]; if (!c) continue; const i = ((y * png.width) + f * W + x) * 4; png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = c[3] ?? 255; }
  }
  return png;
}
function saveRefined(sheet, dir, opts = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const res = 2; const png = refineSheet(sheet, { ...opts, res });
  fs.writeFileSync(path.join(dir, `${sheet.name}.png`), PNG.sync.write(png));
  return { name: sheet.name, w: sheet.fw, h: sheet.fh, frames: sheet.frames, res, ...sheet.meta };
}
module.exports = { refineSheet, saveRefined };
