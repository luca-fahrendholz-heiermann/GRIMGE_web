#!/usr/bin/env node
// Recolor ally_fighter sprite sheet into Nyx the Phantom hero sheet.
// Hair: green/olive → white/silver
// Clothing: purple → dark teal/midnight
// Keeps skin, pants, boots, and special effects unchanged.

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SHEETS_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'sprites', 'sheets');

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
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function recolorPixel(r, g, b, a) {
  if (a < 10) return [r, g, b, a]; // transparent

  const [h, s, l] = rgb2hsl(r, g, b);

  // Green/olive hair: hue ~60-150, decent saturation, variable lightness
  // The ally_fighter has dark green/olive hair
  if (h >= 50 && h <= 165 && s > 0.15 && l > 0.08 && l < 0.65) {
    // Remap to bright white/silver hair
    const newL = Math.min(0.97, l * 1.8 + 0.42);
    const newS = s * 0.04; // almost pure white
    const newH = 220; // faint cool tint
    return [...hsl2rgb(newH, newS, newL), a];
  }

  // Purple/violet clothing: hue ~250-310, decent saturation
  if (h >= 240 && h <= 320 && s > 0.20 && l > 0.15 && l < 0.75) {
    // Remap to deep midnight blue / phantom dark
    const newH = 225; // midnight blue
    const newS = Math.min(0.7, s * 0.85);
    const newL = l * 0.65 + 0.03; // much darker
    return [...hsl2rgb(newH, newS, newL), a];
  }

  // Light purple/lavender accents (wristbands, highlights)
  if (h >= 240 && h <= 320 && s > 0.10 && l >= 0.55) {
    const newH = 210;
    const newS = Math.min(0.5, s * 0.7);
    const newL = Math.min(0.75, l * 0.8);
    return [...hsl2rgb(newH, newS, newL), a];
  }

  // Yellow skin tones, gray pants, dark boots - keep as-is
  return [r, g, b, a];
}

function recolorSheet(inputPath, outputPath) {
  const data = fs.readFileSync(inputPath);
  const png = PNG.sync.read(data);
  const { width, height } = png;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [nr, ng, nb, na] = recolorPixel(
        png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]
      );
      png.data[idx] = nr;
      png.data[idx + 1] = ng;
      png.data[idx + 2] = nb;
      png.data[idx + 3] = na;
    }
  }

  const buf = PNG.sync.write(png);
  fs.writeFileSync(outputPath, buf);
  console.log(`Recolored: ${path.basename(inputPath)} → ${path.basename(outputPath)} (${width}x${height})`);
}

// Recolor ally_fighter_0 as the Nyx hero sheet
recolorSheet(
  path.join(SHEETS_DIR, 'ally_fighter_0.png'),
  path.join(SHEETS_DIR, 'hero_nyx_sheet.png')
);

console.log('Done! Nyx sprite sheet generated from ally_fighter_0 with white hair and teal clothing.');
