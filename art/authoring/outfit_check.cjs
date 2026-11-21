// GRIMGE — find animation frames whose outfit drifted (user, 21 Nov 2026: errors in the detail comparison of the class
// armours, e.g. the monk's robe turning brown in two walk frames). For every clip of every class in character/anim: per
// frame a colour histogram of the outfit layer (hue × lightness bins, weighted by pixel count), compared with the clip's
// per-bin median; frames whose distance exceeds the limit are listed, plus frames whose outfit area is far off the median
// (pieces missing / extra).
//   node art/authoring/outfit_check.cjs [limit=0.35] [class …]
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const ROOT = path.resolve(__dirname, '../..'); const A = path.join(ROOT, 'public/assets/character/anim');
const args = process.argv.slice(2); const LIM = Number(args[0]) > 0 ? Number(args.shift()) : .35;
const classes = args.length ? args : fs.readdirSync(A).filter((d) => fs.statSync(path.join(A, d)).isDirectory());
const bin = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 510; const s = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255) || 1);
  if (s < .18) return 12 * 3 + Math.min(2, Math.floor(l * 3)); let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; h = (h * 60 + 360) % 360;
  return Math.floor(h / 30) * 3 + Math.min(2, Math.floor(l * 3)); };
const NB = 39; const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
let flagged = 0;
for (const cls of classes) for (const f of fs.readdirSync(path.join(A, cls)).filter((x) => x.endsWith('.png'))) {
  const im = PNG.sync.read(fs.readFileSync(path.join(A, cls, f))); const fw = im.width / 8; const H = []; const area = [];
  for (let k = 0; k < 8; k++) { const h = new Float64Array(NB); let n = 0; for (let y = 0; y < im.height; y++) for (let x = 0; x < fw; x++) { const i = (y * im.width + k * fw + x) * 4; if (!im.data[i + 3]) continue; const r = im.data[i], g = im.data[i + 1], b = im.data[i + 2]; if (r + g + b < 90) continue; /* outlines */ h[bin(r, g, b)]++; n++; } for (let j = 0; j < NB; j++) h[j] /= n || 1; H.push(h); area.push(n); }
  const med = Array.from({ length: NB }, (_, j) => median(H.map((h) => h[j]))); const s = med.reduce((a, b) => a + b, 0) || 1; const mA = median(area);
  const bad = []; H.forEach((h, k) => { let d = 0; for (let j = 0; j < NB; j++) d += Math.abs(h[j] - med[j] / s); const da = mA ? Math.abs(area[k] - mA) / mA : 0; if (d > LIM || da > .35) bad.push(`f${k + 1}(farbe ${d.toFixed(2)}${da > .35 ? `, fläche ${Math.round(da * 100)}%` : ''})`); });
  if (bad.length) { flagged++; console.log(`${cls}/${f.slice(0, -4)}: ${bad.join(' ')}`); }
}
console.log(`${flagged} clips with drifting frames (limit ${LIM})`);
