// GRIMGE — clean downsampling of an AI-dressed 3×3 grid back onto the frame's pixel grid (user, 21 Nov 2026: "dein pixel
// perfect spuckt keine gute Qualität aus"). The AI draws each frame at ~2.7 px per game pixel and never on the grid, so the
// old snap (dominant 5-bit colour bin of a 3×3 patch) picked nearly at random between nine different shades → speckled
// shading, frayed outlines, frames drifting in colour. Here every AI pixel is first mapped to the target palette (class
// still + reference body), then each game pixel is a weighted VOTE over palette colours (centre of the patch counts most,
// the blended borders least), transparency included. Afterwards single speckles (a colour none of the 8 neighbours has,
// while most neighbours agree) take the neighbours' colour, and the silhouette gets back the dark contour the AI drew.
//   const { resampleGrid } = require('./grid_resample.cjs'); resampleGrid({ ai, fw, fh, picks, palette, layout? }) → RGBA sheet
//   layout = layoutFor(fw, fh) for 2k grids made by grid2k.cjs (phase: true finds the AI's grid offset per cell)
const cp = require('child_process'); const fs = require('fs'); const os = require('os'); const path = require('path');
const lin = (c) => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const oklab = (r, g, b) => { const R = lin(r), G = lin(g), B = lin(b); const l = Math.cbrt(.4122 * R + .5363 * G + .0514 * B), m = Math.cbrt(.2119 * R + .6807 * G + .1074 * B), s = Math.cbrt(.0883 * R + .2817 * G + .6300 * B); return [.2105 * l + .7936 * m - .0041 * s, 1.978 * l - 2.4286 * m + .4506 * s, .0259 * l + .7828 * m - .8087 * s]; };
const CELL = 341;
// 2k layout (user, 21 Nov 2026 — Sprite Fusion's snapper is clean because a single 1024 figure is drawn at ~5.6 px per pixel,
// the reference body's own grid): frames sit at EXACTLY the body scale (1024 / 184 px per game pixel) in a 2048² grid,
// as many columns as fit, so the AI draws real pixels on a known grid instead of painting a 2.7 px miniature.
const BODY_S = 1024 / 184;
function layoutFor(fw, fh, W = 2048, n = 8) {
  for (let S = BODY_S; S > 2; S -= .25) for (let cols = 4; cols >= 2; cols--) { const rows = Math.ceil(n / cols); const cellW = Math.floor(W / cols), cellH = Math.floor(W / rows); if (fw * S + 12 <= cellW && fh * S + 12 <= cellH) return { W, cols, cellW, cellH, S }; }
  throw new Error('frame too large for the grid');
}
const LEGACY = (fw, fh) => ({ W: 1024, cols: 3, cellW: CELL, cellH: CELL, S: Math.min((CELL - 8) / fw, (CELL - 8) / fh) });
const cellOrigin = (L, fw, fh, n) => [(n % L.cols) * L.cellW + Math.round((L.cellW - fw * L.S) / 2), Math.floor(n / L.cols) * L.cellH + Math.round((L.cellH - fh * L.S) / 2)];
function makeNearest(palette) {
  const P = palette.map((rgb) => ({ rgb, lab: oklab(...rgb) })); const memo = new Map();
  return (r, g, b) => { const k = (r << 16) | (g << 8) | b; let v = memo.get(k); if (v !== undefined) return v; const L = oklab(r, g, b); let d0 = 1e9; P.forEach((p, i) => { const d = (p.lab[0] - L[0]) ** 2 * 1.4 + (p.lab[1] - L[1]) ** 2 + (p.lab[2] - L[2]) ** 2; if (d < d0) { d0 = d; v = i; } }); memo.set(k, v); return v; };
}
function resampleGrid({ ai, fw, fh, picks, palette, layout = null, phase = false, base = null, outline = null, merge = .11, chroma = .022, line = .38 }) {
  const tmp = path.join(os.tmpdir(), `gridres_${process.pid}.png`);
  cp.execFileSync('magick', [ai, '-alpha', 'set', '-fuzz', '9%', '-fill', 'none', '-draw', 'color 0,0 floodfill', `PNG32:${tmp}`]); /* the key-green background */
  const L = layout ?? LEGACY(fw, fh); const W = L.W; const raw = cp.execFileSync('magick', [tmp, '-alpha', 'on', '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 26 }); fs.rmSync(tmp, { force: true });
  const S = L.S;
  const nearest = makeNearest(palette); const dark = palette.map((c) => oklab(...c)[0] < .25);
  const darkest = palette.reduce((a, c, i) => (oklab(...c)[0] < oklab(...palette[a])[0] ? i : a), 0);
  // hard bands instead of soft gradients: shades closer than `merge` (OKLab) fold into the one the clip uses most, so the
  // AI's smooth ramps become 2–3 hard tones per material like the hand-made stills
  const labs = palette.map((c) => oklab(...c)); const use = new Float64Array(palette.length);
  picks.forEach((_, n) => { const cx = (n % L.cols) * L.cellW, cy = Math.floor(n / L.cols) * L.cellH; for (let py = cy; py < cy + L.cellH; py++) for (let px = cx; px < cx + L.cellW; px++) { const i = (py * W + px) * 4; if (raw[i + 3] < 128) continue; const r = raw[i], g = raw[i + 1], b = raw[i + 2]; if (g > 150 && r < 110 && b < 110) continue; use[nearest(r, g, b)]++; } });
  const red = palette.map((_, i) => i); const order = [...palette.keys()].filter((i) => use[i]).sort((a, b) => use[b] - use[a]); const kept = [];
  for (const i of order) { const L = labs[i]; const hit = kept.find((j) => Math.abs(labs[j][0] - L[0]) < merge && Math.hypot(labs[j][1] - L[1], labs[j][2] - L[2]) < chroma && (labs[j][0] < .25) === (L[0] < .25)); /* same hue family only: lightness steps fold, purple never becomes brown */ red[i] = hit ?? i; if (hit === undefined) kept.push(i); }
  const OUT = outline ?? darkest;
  const out = Buffer.alloc(fw * picks.length * fh * 4); const TR = -1;
  picks.forEach((_, n) => {
    let [cx, cy] = cellOrigin(L, fw, fh, n); let Sf = S;
    // registration (2k grids): the AI keeps the pose but not always the exact size and spot — the figure's head-to-feet
    // height against the base frame's gives this frame's scale, the best overlap with the base silhouette its position
    if (base) {
      const k = picks[n]; const bOp = (x, y) => base.data[(y * base.width + k * fw + x) * 4 + 3] > 127; let bT = -1, bB = -1;
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (bOp(x, y)) { if (bT < 0) bT = y; bB = y; break; }
      const X0 = (n % L.cols) * L.cellW, Y0 = Math.floor(n / L.cols) * L.cellH; const aOp = (px, py) => { if (px < X0 || py < Y0 || px >= X0 + L.cellW || py >= Y0 + L.cellH) return false; const i = (py * W + px) * 4; return raw[i + 3] >= 128 && !(raw[i + 1] > 150 && raw[i] < 110 && raw[i + 2] < 110); };
      let aT = -1, aB = -1; for (let py = Y0; py < Y0 + L.cellH; py++) { let c = 0; for (let px = X0; px < X0 + L.cellW; px++) if (aOp(px, py)) c++; if (c >= 3) { if (aT < 0) aT = py; aB = py; } }
      if (bT >= 0 && aT >= 0) {
        Sf = Math.min(S * 1.25, Math.max(S * .8, (aB + 1 - aT) / (bB + 1 - bT))); cy = aT - bT * Sf;
        let bx = cx, bv = -1; for (let ox = X0 - fw * Sf * .2; ox <= X0 + L.cellW - fw * Sf * .8; ox += 2) { let v = 0; for (let y = bT; y <= bB; y += 2) for (let x = 0; x < fw; x += 2) if (bOp(x, y) && aOp(Math.round(ox + (x + .5) * Sf), Math.round(cy + (y + .5) * Sf))) v++; if (v > bv) { bv = v; bx = ox; } }
        cx = bx;
      }
    }
    // the AI's own pixel grid may sit a few px off the one we gave it: shift to where the colour edges line up best
    if (phase) {
      const lum = (px, py) => { if (px < 0 || py < 0 || px >= W || py >= W) return -999; const i = (py * W + px) * 4; return raw[i + 3] < 128 ? -999 : raw[i] * .3 + raw[i + 1] * .59 + raw[i + 2] * .11; }; const R = Math.floor(Sf / 2); const best = [0, 0];
      for (const axis of [0, 1]) { let bo = 0, bv = -1; for (let o = -R; o <= R; o++) { let v = 0; for (let k = 1; k < (axis ? fh : fw); k++) { const g = Math.round((axis ? cy : cx) + k * Sf + o); for (let t = 0; t < (axis ? fw : fh) * Sf; t += 2) { const a = axis ? lum(Math.round(cx + t), g - 1) : lum(g - 1, Math.round(cy + t)), b = axis ? lum(Math.round(cx + t), g) : lum(g, Math.round(cy + t)); if (a > -999 && b > -999) v += Math.abs(a - b); } } if (v > bv) { bv = v; bo = o; } } best[axis] = bo; }
      cx += best[0]; cy += best[1];
    }
    const idx = new Int16Array(fw * fh).fill(TR); const edgeDark = new Float32Array(fw * fh);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const votes = new Map(); let wOp = 0, wAll = 0, wDark = 0;
      const sx0 = cx + x * Sf, sy0 = cy + y * Sf; const mx = sx0 + Sf / 2, my = sy0 + Sf / 2;
      for (let py = Math.floor(sy0 - .5); py <= Math.ceil(sy0 + Sf - .5); py++) for (let px = Math.floor(sx0 - .5); px <= Math.ceil(sx0 + Sf - .5); px++) {
        if (px < 0 || py < 0 || px >= W || py >= W) continue;
        const dx = (px + .5 - mx) / Sf, dy = (py + .5 - my) / Sf; if (Math.abs(dx) > .6 || Math.abs(dy) > .6) continue;
        const w = Math.exp(-(dx * dx + dy * dy) / (2 * .28 * .28)); wAll += w; /* centre counts most, the blended rims least */
        const i = (py * W + px) * 4; const r = raw[i], g = raw[i + 1], b = raw[i + 2];
        if (raw[i + 3] < 128 || (g > 150 && r < 110 && b < 110)) continue; /* background / leftover key green */
        wOp += w; const k0 = nearest(r, g, b); const k = red[k0]; votes.set(k, (votes.get(k) ?? 0) + w); if (dark[k0]) wDark += w;
      }
      if (!wAll || wOp < wAll * .5) continue; /* mostly background → transparent */
      let best = -1, bw = -1; for (const [k, w] of votes) if (w > bw) { bw = w; best = k; }
      idx[y * fw + x] = best; edgeDark[y * fw + x] = wDark / wOp;
    }
    // single speckles: a colour no neighbour shares, while ≥ 5 of the 8 neighbours agree on one → take theirs
    for (let pass = 0; pass < 2; pass++) { const src = idx.slice(); for (let y = 1; y < fh - 1; y++) for (let x = 1; x < fw - 1; x++) { const c = src[y * fw + x]; if (c === TR) continue; const cnt = new Map(); let same = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const v = src[(y + dy) * fw + x + dx]; if (v === c) same++; cnt.set(v, (cnt.get(v) ?? 0) + 1); } if (same) continue; let mv = TR, mn = 0; for (const [v, k] of cnt) if (k > mn) { mn = k; mv = v; } if (mn >= 5 && mv !== TR) idx[y * fw + x] = mv; } }
    // inner lines: a pixel whose patch was largely the AI's dark line work becomes the outline colour (the vote splits a
    // 2–3 px AI line between two pixels and keeps neither)
    for (let i = 0; i < fw * fh; i++) if (idx[i] !== TR && !dark[idx[i]] && edgeDark[i] > line) idx[i] = OUT;
    // the outer contour: every silhouette pixel is the outline colour — closed, 1 px, like the stills
    { const src = idx.slice(); for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const i = y * fw + x; if (src[i] === TR) continue; const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx < 0 || ny < 0 || nx >= fw || ny >= fh || src[ny * fw + nx] === TR; }); if (open) idx[i] = OUT; } }
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const k = idx[y * fw + x]; if (k === TR) continue; const o = (y * fw * picks.length + n * fw + x) * 4; out[o] = palette[k][0]; out[o + 1] = palette[k][1]; out[o + 2] = palette[k][2]; out[o + 3] = 255; }
  });
  return { buf: out, width: fw * picks.length, height: fh };
}
module.exports = { resampleGrid, layoutFor, cellOrigin, oklab, BODY_S };
