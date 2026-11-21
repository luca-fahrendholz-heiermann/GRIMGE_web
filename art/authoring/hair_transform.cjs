// GRIMGE — transformation variants for every hair asset (user, 21 Nov 2026: "Haare muss man am Ende mit transformieren,
// aber für jedes Haar-Asset alle Transformations-Varianten haben"). Pixel-exact gradient map: the hair's own shading
// (luminance ranks) is mapped onto the transformation's colour ramp, so every hairstyle keeps its shape and pixel
// clusters and fits every transformation; shape changes (flame tips, floating hair) come later as VFX layers.
// Also writes the glowing eyes of each transformation (the body's own eye pixels, recoloured) as a tiny overlay layer.
//   node art/authoring/hair_transform.cjs <layersDir> [outDir=<layersDir>/hair_tf]
const fs = require('fs'); const path = require('path'); const cp = require('child_process');
const ROOT = path.resolve(__dirname, '../..'); const BODY = process.env.BODY_184 ?? path.join(ROOT, 'art_source/body/body_184.png'); const N = 184; /* BODY_184: art_source is untracked — point at the main checkout's copy from a worktree */
// transformation → [ramp dark … light], eye colour (the class transformations, art_source/body/tf_*.png)
const TF = Object.freeze({
  guardian: { name: 'Crimson Bastion', ramp: ['#2a0a06', '#7a1408', '#d0390c', '#ff8a1c', '#ffe06a'], eye: '#ffd23c' },
  berserker: { name: 'Oni Awakening', ramp: ['#1a0505', '#4f0a0a', '#9a1414', '#e0301e', '#ff7a4a'], eye: '#ff2a1a' },
  lancer: { name: 'Heavenly Crane', ramp: ['#4a4a5e', '#a0a4c0', '#e4e6f2', '#fff3c8', '#ffffff'], eye: '#bfe8ff' },
  monk: { name: 'Thousand Hands', ramp: ['#3a2206', '#8a5a0c', '#d79a14', '#ffd23c', '#fff6b0'], eye: '#ffd23c' },
  beastborn: { name: 'Wolf Spirit', ramp: ['#0a1a3a', '#1f4f9a', '#4aa0e6', '#a8e6ff', '#ffffff'], eye: '#9ff0ff' },
  shadow: { name: 'Night Phantom', ramp: ['#0b0612', '#2a0f45', '#5a1f8f', '#9a3fe0', '#d9a6ff'], eye: '#c46bff' },
  ranger: { name: 'Storm Falcon', ramp: ['#0f2a12', '#2f6a1f', '#6aa82a', '#c8d84a', '#fff6a0'], eye: '#7dffb0' },
  arcanist: { name: 'Rune Emperor', ramp: ['#050a1a', '#0f2050', '#1f5aa0', '#3fd8e8', '#c8ffff'], eye: '#5ff6ff' }
});
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const raw = (f) => cp.execFileSync('magick', [f, '-alpha', 'on', '-depth', '8', 'rgba:-'], { maxBuffer: 1 << 24 });
const write = (buf, f) => cp.execFileSync('magick', ['-size', `${N}x${N}`, '-depth', '8', 'rgba:-', `PNG32:${f}`], { input: buf });
const lum = (b, i) => .299 * b[i] + .587 * b[i + 1] + .114 * b[i + 2];
// Gradient map by luminance RANK (not absolute value): dark hair and white hair both use the whole ramp; the darkest
// pixels (the outline) stay outline-dark.
function mapHair(buf, ramp) {
  const L = []; for (let i = 0; i < buf.length; i += 4) if (buf[i + 3]) L.push(lum(buf, i)); if (!L.length) return Buffer.from(buf);
  L.sort((a, b) => a - b); const q = (t) => L[Math.min(L.length - 1, Math.floor(t * L.length))]; const cuts = [.12, .35, .62, .88].map(q);
  const R = ramp.map(hex); const out = Buffer.from(buf);
  for (let i = 0; i < buf.length; i += 4) {
    if (!buf[i + 3]) continue; const l = lum(buf, i); let k = cuts.findIndex((c) => l < c); if (k < 0) k = 4;
    if (l < 40) k = 0; /* outline */ out[i] = R[k][0]; out[i + 1] = R[k][1]; out[i + 2] = R[k][2]; out[i + 3] = 255;
  }
  return out;
}
// The body's eye pixels: clearly blue pixels inside the face rows.
function eyeLayer(colour) {
  const b = raw(BODY); const out = Buffer.alloc(N * N * 4); const [r, g, bl] = hex(colour);
  for (let y = 45; y < 60; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4; if (b[i + 2] > b[i] + 30 && b[i + 2] > 90) { out[i] = r; out[i + 1] = g; out[i + 2] = bl; out[i + 3] = 255; } }
  return out;
}
if (require.main === module) {
  const [dir, outArg] = process.argv.slice(2); const out = outArg ?? path.join(dir, 'hair_tf'); fs.mkdirSync(out, { recursive: true });
  const hairs = fs.readdirSync(dir).filter((f) => /_hair\.png$/.test(f) && !/^(tf|tfc)_/.test(f));
  for (const [tf, def] of Object.entries(TF)) {
    write(eyeLayer(def.eye), path.join(out, `eyes_${tf}.png`));
    for (const f of hairs) write(mapHair(raw(path.join(dir, f)), def.ramp), path.join(out, f.replace('_hair.png', `_hair_${tf}.png`)));
  }
  console.log(JSON.stringify({ hairs: hairs.length, transformations: Object.keys(TF).length, files: hairs.length * 8 + 8 }));
}
module.exports = { TF, mapHair, eyeLayer };
