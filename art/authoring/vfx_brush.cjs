// GRIMGE — hand-drawn pixel-VFX toolkit (user, 25 Oct 2026: "grundlegend detailreich … bitte das beste
// qualitativ machen"; references are inspiration only, never copied).
//
// Sheets made with this toolkit are authored at the FINAL pixel density (1 sheet pixel = 1 world pixel, the
// density of the characters) — no Scale2x upsampling — and use the techniques of hand-drawn pixel effects:
//   stroke()      calligraphic brush strokes: smooth path, width swells and tapers, shaded ACROSS the stroke
//                 (lit rim on the light side, shadow on the far side), dry-brush breakup at the ends
//   crescent()    a stroke along an elliptical arc (orbiting sweeps of wind, flame hooks, energy rings)
//   streakFill()  streak texture inside a mask: rows of dashes of varied length in several tones
//   volume()      volume shading of a mask (light from the top left) with ordered dithering on tone borders
//   selOutline()  selective outline: dark on the shadow side (bottom / right), the material's mid tone on the
//                 lit side — never a uniform black line
//   noisyBlob()   organic, lumpy silhouettes (smoke, dust, fire bodies)
const { Sheet, hex, rng } = require('./pixel_sheet.cjs');
const fs = require('fs');
const path = require('path');

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const dither = (x, y, t) => (BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + .5) / 16 < t;
const pal = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Array.isArray(v) ? v.map((c) => hex(c)) : hex(v)]));

// Catmull-Rom smoothing of a control polyline → dense points (≈1 px apart).
function smooth(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 1.5));
    for (let j = 0; j < n; j++) {
      const t = j / n; const t2 = t * t; const t3 = t2 * t;
      out.push([0, 1].map((k) => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// A calligraphic stroke. ramp: array of colours from shadow to light (≥3). width(u) or {max, taper}.
// light: unit vector pointing TOWARD the light (default top left). dry: 0 … 1 breakup at the ends.
function stroke(s, f, pts, { max = 4, swell = .75, ramp, light = [-.6, -.8], dry = .5, seed = 1, minW = 1, headBias = .5 } = {}) {
  const P = smooth(pts); const r = rng(seed); const n = P.length;
  for (let i = 0; i < n; i++) {
    const u = i / Math.max(1, n - 1);
    // Width: swell toward the middle (headBias moves the thickest point), taper to points.
    const peak = headBias; const d = u < peak ? u / peak : (1 - u) / (1 - peak);
    const w = Math.max(minW, max * Math.pow(clamp01(d), swell));
    if ((u < .1 || u > .9) && r() < dry * .7) continue;
    const a = P[Math.max(0, i - 1)]; const b = P[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0]; let ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty; const ny = tx; // normal
    const facing = nx * light[0] + ny * light[1]; // >0: the +normal side faces the light
    const steps = Math.max(1, Math.round(w * 1.4));
    for (let k = 0; k <= steps; k++) {
      const v = k / steps - .5; // −.5 … .5 across
      const x = P[i][0] + nx * v * w; const y = P[i][1] + ny * v * w;
      const lit = clamp01(.5 + v * Math.sign(facing || 1) * 1.6 * Math.min(1, Math.abs(facing) + .35));
      const fv = lit * (ramp.length - 1); const lo = Math.floor(fv);
      s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (dither(Math.round(x), Math.round(y), fv - lo) ? 1 : 0))]);
    }
  }
}
// A stroke along an elliptical arc.
function crescent(s, f, cx, cy, rx, ry, a0, a1, opts) {
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 3));
  const pts = Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  stroke(s, f, pts, opts);
}
// Streak texture inside mask(x, y) → tone 0 … 1 (or null outside). Dashes run along dir (default horizontal).
function streakFill(s, f, x0, y0, x1, y1, mask, ramp, { seed = 1, shift = 0, minLen = 3, maxLen = 14, gap = 3 } = {}) {
  const r = rng(seed);
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    let x = Math.floor(x0) - Math.floor(r() * maxLen) + (shift % (maxLen + gap));
    while (x <= x1) {
      const len = minLen + Math.floor(r() * (maxLen - minLen)); const g = 1 + Math.floor(r() * gap);
      const tone = r();
      for (let xx = x; xx < x + len; xx++) {
        const m = mask(xx, y); if (m == null) continue;
        const v = clamp01(m * .85 + (tone - .5) * .35);
        s.set(f, xx, y, ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))]);
      }
      x += len + g;
    }
  }
}
// Volume shading of mask(x, y) → boolean: tone from the distance to the edge facing the light vs the far edge,
// dithered on tone borders (2-step ordered dither), so a flat shape gets a round, painted body.
function volume(s, f, x0, y0, x1, y1, mask, ramp, { reach = 10, light = [-1, -1] } = {}) {
  const L = Math.hypot(light[0], light[1]); const lx = light[0] / L; const ly = light[1] / L;
  const dist = (x, y, dx, dy) => { for (let k = 1; k <= reach; k++) if (!mask(Math.round(x + dx * k), Math.round(y + dy * k))) return k; return reach + 1; };
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    if (!mask(x, y)) continue;
    const toLight = dist(x, y, lx, ly); const toShade = dist(x, y, -lx, -ly);
    const v = clamp01(.5 + (toShade - toLight) / (2 * reach) * 1.4 + (toLight <= 1 ? .25 : 0));
    const fv = v * (ramp.length - 1); const lo = Math.floor(fv); const fr = fv - lo;
    s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (dither(x, y, fr) ? 1 : 0))]);
  }
}
// Selective outline around every opaque pixel: shadow side (below / right) dark, lit side in `litColor`.
function selOutline(s, f, dark, litColor = null) {
  const marks = [];
  for (let y = 0; y < s.fh; y++) for (let x = 0; x < s.fw; x++) {
    if (s.alpha(f, x, y) > 0) continue;
    const below = s.alpha(f, x, y - 1) > 120; const right = s.alpha(f, x - 1, y) > 120; const above = s.alpha(f, x, y + 1) > 120; const left = s.alpha(f, x + 1, y) > 120;
    if (below || right) marks.push([x, y, dark]); else if ((above || left) && litColor) marks.push([x, y, litColor]);
  }
  for (const [x, y, c] of marks) s.set(f, x, y, c);
}
// Lumpy organic blob test: radius modulated by a few seeded harmonics.
function noisyBlob(cx, cy, r, seed = 1, rough = .18, squash = 1) {
  const rr = rng(seed); const h = [1, 2, 3, 5].map((k) => [k, rr() * TAU, (rr() * .5 + .5) * rough / k * 2]);
  return (x, y) => { const dx = x - cx; const dy = (y - cy) / squash; const a = Math.atan2(dy, dx); let m = 1; for (const [k, p, amp] of h) m += Math.sin(a * k + p) * amp; return Math.hypot(dx, dy) <= r * m; };
}
// Final-density save: logical w / h are half the image size (the game draws sheets at scale 2), res 2.
function saveFinal(sheet, dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${sheet.name}.png`), require('pngjs').PNG.sync.write(sheet.png));
  return { name: sheet.name, w: sheet.fw / 2, h: sheet.fh / 2, frames: sheet.frames, res: 2, hd: true, ...sheet.meta };
}

module.exports = { Sheet, hex, rng, pal, TAU, clamp01, dither, smooth, stroke, crescent, streakFill, volume, selOutline, noisyBlob, saveFinal };
