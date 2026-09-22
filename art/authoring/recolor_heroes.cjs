#!/usr/bin/env node
// Batch-process LF2 hero sheets: remove black bg, upscale 2x, recolor hair→white & outfit→black.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const LF2_DIR = path.join(__dirname, '..', '..', 'tools', 'lf2_preview');
const OUT_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'sprites', 'sheets');

// ── colour helpers ──────────────────────────────────────────────────────────
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function hsl2rgb(h, s, l) {
  h /= 360;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hueIn(h, lo, hi) {
  if (lo <= hi) return h >= lo && h <= hi;
  return h >= lo || h <= hi; // wrapping (e.g. 340→20)
}

// ── per-character colour profiles ───────────────────────────────────────────
// Each profile lists ordered rules checked top-to-bottom; first match wins.
// 'type' → 'hair' (white) | 'outfit' (black) | 'keep'.

const PROFILES = {
  deep: {
    src: 'deep_0.png',
    rules: [
      // skin: narrow hue range — exclude pure yellow so shirt isn't protected
      { type: 'keep', hLo: 25, hHi: 42, sMin: 0.20, lMin: 0.56, lMax: 1 },
      // outfit: yellow/gold shirt
      { type: 'outfit', hLo: 34, hHi: 72, sMin: 0.28, lMin: 0.18, lMax: 0.86 },
      // hair: brown
      { type: 'hair', hLo: 8, hHi: 56, sMin: 0.12, lMin: 0.08, lMax: 0.54 },
    ]
  },
  firen: {
    src: 'firen_0.png',
    rules: [
      // skin
      { type: 'keep', hLo: 25, hHi: 50, sMin: 0.20, lMin: 0.58, lMax: 1 },
      // effects protection: very saturated bright → keep
      { type: 'keep', sMin: 0.80, lMin: 0.42, lMax: 1, hLo: 0, hHi: 360 },
      // hair: blond / golden (wider range to catch all strands)
      { type: 'hair', hLo: 28, hHi: 66, sMin: 0.18, lMin: 0.32, lMax: 0.92 },
      // outfit: red / maroon (slightly wider)
      { type: 'outfit', hLo: 338, hHi: 24, sMin: 0.20, lMin: 0.10, lMax: 0.64 },
    ]
  },
  freeze: {
    src: 'freeze_0.png',
    rules: [
      // skin
      { type: 'keep', hLo: 20, hHi: 55, sMin: 0.20, lMin: 0.52, lMax: 1 },
      // effects protection
      { type: 'keep', sMin: 0.75, lMin: 0.50, lMax: 1, hLo: 0, hHi: 360 },
      // outfit: purple / indigo (wider — catch lighter purples too)
      { type: 'outfit', hLo: 215, hHi: 300, sMin: 0.12, lMin: 0.06, lMax: 0.58 },
      // hair: gray-silver (low saturation blue-ish; checked after outfit)
      { type: 'hair', hLo: 185, hHi: 300, sMin: 0.02, sMax: 0.30, lMin: 0.22, lMax: 0.82 },
    ]
  },
  john: {
    src: 'john_0.png',
    rules: [
      // skin
      { type: 'keep', hLo: 20, hHi: 55, sMin: 0.20, lMin: 0.55, lMax: 1 },
      // hair: brown
      { type: 'hair', hLo: 8, hHi: 48, sMin: 0.22, lMin: 0.10, lMax: 0.52 },
      // outfit: blue (shirt, cape, armour)
      { type: 'outfit', hLo: 190, hHi: 242, sMin: 0.25, lMin: 0.15, lMax: 0.75 },
    ]
  },
  woody: {
    src: 'woody_0.png',
    rules: [
      // skin
      { type: 'keep', hLo: 20, hHi: 55, sMin: 0.20, lMin: 0.54, lMax: 1 },
      // hair: brown / tan
      { type: 'hair', hLo: 18, hHi: 58, sMin: 0.12, lMin: 0.18, lMax: 0.56 },
      // outfit: green shirt
      { type: 'outfit', hLo: 74, hHi: 158, sMin: 0.16, lMin: 0.10, lMax: 0.56 },
    ]
  },
  henry: {
    src: 'henry_0.png',
    rules: [
      // skin
      { type: 'keep', hLo: 20, hHi: 55, sMin: 0.20, lMin: 0.58, lMax: 1 },
      // outfit: orange tunic (high sat, higher L)
      { type: 'outfit', hLo: 10, hHi: 48, sMin: 0.42, lMin: 0.28, lMax: 0.74 },
      // hair: dark brown (low sat, low L)
      { type: 'hair', hLo: 5, hHi: 45, sMin: 0.10, lMin: 0.04, lMax: 0.36 },
    ]
  }
};

// ── recolour logic ──────────────────────────────────────────────────────────
function classify(r, g, b, rules) {
  const [h, s, l] = rgb2hsl(r, g, b);
  for (const rule of rules) {
    const hOk = hueIn(h, rule.hLo, rule.hHi);
    const sOk = s >= (rule.sMin ?? 0) && s <= (rule.sMax ?? 1);
    const lOk = l >= rule.lMin && l <= rule.lMax;
    if (hOk && sOk && lOk) return { type: rule.type, h, s, l };
  }
  return { type: 'keep', h, s, l };
}

function recolourPixel(r, g, b, a, rules) {
  if (a < 10) return [r, g, b, a];
  const cls = classify(r, g, b, rules);
  if (cls.type === 'hair') {
    const newL = Math.min(0.97, cls.l * 0.4 + 0.78);
    const newS = cls.s * 0.03;
    return [...hsl2rgb(220, newS, newL), a];
  }
  if (cls.type === 'outfit') {
    const newL = Math.max(0.03, cls.l * 0.20);
    const newS = cls.s * 0.08;
    return [...hsl2rgb(230, newS, newL), a];
  }
  return [r, g, b, a];
}

// ── processing pipeline ─────────────────────────────────────────────────────
function processSheet(name, profile) {
  const srcPath = path.join(LF2_DIR, profile.src);
  const src = PNG.sync.read(fs.readFileSync(srcPath));
  const sw = src.width;   // 800
  const sh = src.height;  // 560

  // Create 2x-upscaled output (nearest-neighbour)
  const dw = sw * 2;      // 1600
  const dh = sh * 2;      // 1120
  const dst = new PNG({ width: dw, height: dh });

  for (let dy = 0; dy < dh; dy++) {
    const sy = Math.floor(dy / 2);
    for (let dx = 0; dx < dw; dx++) {
      const sx = Math.floor(dx / 2);
      const si = (sy * sw + sx) * 4;
      const di = (dy * dw + dx) * 4;

      let r = src.data[si], g = src.data[si + 1], b = src.data[si + 2], a = src.data[si + 3];

      // Background removal: near-black opaque → transparent
      if (r < 8 && g < 8 && b < 8 && a > 200) {
        dst.data[di] = 0; dst.data[di + 1] = 0; dst.data[di + 2] = 0; dst.data[di + 3] = 0;
        continue;
      }

      // Recolour
      const [nr, ng, nb, na] = recolourPixel(r, g, b, a, profile.rules);
      dst.data[di] = nr; dst.data[di + 1] = ng; dst.data[di + 2] = nb; dst.data[di + 3] = na;
    }
  }

  const outPath = path.join(OUT_DIR, `hero_${name}_sheet.png`);
  fs.writeFileSync(outPath, PNG.sync.write(dst));
  console.log(`✦ ${name}: ${profile.src} (${sw}×${sh}) → hero_${name}_sheet.png (${dw}×${dh})`);
}

// ── run ─────────────────────────────────────────────────────────────────────
for (const [name, profile] of Object.entries(PROFILES)) {
  processSheet(name, profile);
}
console.log(`\nDone — ${Object.keys(PROFILES).length} hero sheets generated.`);
