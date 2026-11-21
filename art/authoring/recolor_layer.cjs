// GRIMGE — recolours a layer's material colours without touching its drawing (every pixel keeps its place and its light
// / dark value): pixels whose hue lies in a band (e.g. the browns of hide and leather) get a new hue and saturation;
// bone (light, unsaturated), outlines (dark) and other colours stay. For class colour identities when an AI edit is not
// possible.  node art/authoring/recolor_layer.cjs <in.png> <out.png> <hueFrom-hueTo> <newHue|grey> [satMul=1.3] [lightMul=1]
const cp = require('child_process');
const [inp, out, band, target, satArg, lightArg] = process.argv.slice(2); const [h0, h1] = band.split('-').map(Number);
const SAT = Number(satArg ?? 1.3), LIGHT = Number(lightArg ?? 1);
const [w, h] = cp.execFileSync('magick', [inp, '-format', '%w %h', 'info:']).toString().split(' ').map(Number);
const b = cp.execFileSync('magick', [inp, '-alpha', 'on', '-depth', '8', 'rgba:-']);
const toHsl = (r, g, bl) => { r /= 255; g /= 255; bl /= 255; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); const l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn; const s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); let hh = mx === r ? (g - bl) / d + (g < bl ? 6 : 0) : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; return [hh * 60, s, l]; };
const toRgb = (hh, s, l) => { const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; const k = hh / 360; return [f(k + 1 / 3), f(k), f(k - 1 / 3)].map((v) => Math.round(v * 255)); };
// the body's own colours (skin the AI re-shaded leaks into outfit layers) are never recoloured
const path = require('path'); const BODY = path.resolve(__dirname, '../../art_source/body/body_184.png'); const bb = cp.execFileSync('magick', [BODY, '-depth', '8', 'rgba:-']); const skin = [];
for (let i = 0; i < bb.length; i += 4) { const g = bb[i + 1] > 150 && bb[i] < 110 && bb[i + 2] < 110; if (!g && !skin.some((c) => c[0] === bb[i] && c[1] === bb[i + 1] && c[2] === bb[i + 2])) skin.push([bb[i], bb[i + 1], bb[i + 2]]); }
const nearSkin = (i) => { const g = bb[i + 1] > 150 && bb[i] < 110 && bb[i + 2] < 110; return w === 184 && !g && bb[i + 3] > 0 && Math.abs(bb[i] - b[i]) + Math.abs(bb[i + 1] - b[i + 1]) + Math.abs(bb[i + 2] - b[i + 2]) < 75; }; /* inside the body silhouette and nearly the body's own pixel there: re-shaded skin */
let n = 0;
for (let i = 0; i < b.length; i += 4) {
  if (!b[i + 3]) continue; const [hh, s, l] = toHsl(b[i], b[i + 1], b[i + 2]);
  if (l < .1 || s < .12 || hh < h0 || hh > h1) continue; /* outlines, bone / greys and other hues stay */
  if (l > .6 && s < .45) continue; /* bone */ if (nearSkin(i)) continue; /* skin */
  const rgb = target === 'grey' ? toRgb(0, 0, Math.min(.95, l * LIGHT * 1.08)) : toRgb(Number(target), Math.min(1, s * SAT), Math.min(.9, l * LIGHT));
  b[i] = rgb[0]; b[i + 1] = rgb[1]; b[i + 2] = rgb[2]; n++;
}
cp.execFileSync('magick', ['-size', `${w}x${h}`, '-depth', '8', 'rgba:-', `PNG32:${out}`], { input: b });
console.log('recoloured', n);
