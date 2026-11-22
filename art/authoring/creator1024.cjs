// GRIMGE — a small character-creator page for checking the 1024 library (user, 22 Nov 2026: "mach mir einen kleinen HTML
// für die Charaktererstellung, wo ich Haare, Rüstung etc. ändern kann — dann sehe ich die Qualität"). Left: the game's 184
// layers (public/assets/character), right: the same choice from the 1024 library (art/layers1024/library), both composed
// body → outfit → beard → face → hair → eyes. The manifest is written into the page, so it opens straight from disk.
//   node art/authoring/creator1024.cjs   → art/layers1024/library/creator.html
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '../..'); const OUT = path.join(ROOT, 'art/layers1024/library');
const man = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest_1024.json'), 'utf8'));
const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>GRIMGE – Charakter 184 vs 1024</title>
<style>
 body{margin:0;background:#1b1b22;color:#ddd;font:14px system-ui,sans-serif;display:flex;height:100vh}
 #ui{width:270px;padding:14px;background:#24242d;overflow:auto;flex:none}
 #ui label{display:block;margin:10px 0 3px;color:#aab}
 #ui select,#ui input[type=range]{width:100%}
 #ui select{background:#30303b;color:#eee;border:1px solid #444;padding:4px}
 #view{flex:1;display:flex;gap:18px;align-items:flex-start;justify-content:center;overflow:auto;padding:14px}
 figure{margin:0;text-align:center}
 figcaption{color:#99a;margin-bottom:6px}
 canvas{image-rendering:pixelated;background:var(--bg);border:1px solid #333}
 .row{display:flex;gap:6px;align-items:center}.row input{width:auto}
 small{color:#778}
</style></head><body>
<div id="ui">
 <b>Charakter</b>
 <label>Klasse</label><select id="cls"></select>
 <label>Rüstung / Skin</label><select id="skin"></select>
 <label class="row"><input type="checkbox" id="tf"> Transformation</label>
 <label>Transformations-Kleidung</label><select id="tfc"></select>
 <label>Frisur</label><select id="hair"></select>
 <label>Bart</label><select id="beard"></select>
 <label>Gesicht</label><select id="face"></select>
 <label>Zoom</label><input type="range" id="zoom" min="0.5" max="4" step="0.25" value="1">
 <label>Ausschnitt</label><select id="crop"><option value="full">ganzer Körper</option><option value="head">Kopf</option></select>
 <label>Hintergrund</label><select id="bg"><option value="#2c2c34">dunkel</option><option value="#16d205">Key-Grün</option><option value="#ffffff">weiß</option></select>
 <p><small>Links: Spiel-Dateien (184 px, hochskaliert). Rechts: 1024er-Bibliothek. Herkunft jeder Ebene: MATCHES.md</small></p>
</div>
<div id="view">
 <figure><figcaption>184 (Spiel)</figcaption><canvas id="c184"></canvas></figure>
 <figure><figcaption>1024 (Bibliothek)</figcaption><canvas id="c1024"></canvas></figure>
</div>
<script>
const M = ${JSON.stringify(man)};
const BASE = { c184: '../../../public/assets/character/', c1024: './' };
const $ = (id) => document.getElementById(id);
const opt = (sel, items, none) => { sel.innerHTML = (none ? '<option value="">— keine —</option>' : '') + items.map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join(''); };
const fileOf = (e) => typeof e === 'string' ? e : e && e.file;
opt($('cls'), Object.keys(M.classes).map((c) => [c, c]));
opt($('hair'), Object.keys(M.hair).map((h) => [h, h]), true);
opt($('beard'), Object.keys(M.beard || {}).map((b) => [b, b.replace('beard_', '')]), true);
opt($('face'), Object.keys(M.face || {}).map((f) => [f, f.replace('face_', '')]), true);
function fillClass() { const c = $('cls').value; opt($('skin'), (M.classes[c].skins || []).map((s) => [s.file, s.label + ' (' + s.id + ')'])); const t = M.transformations[c] || {}; opt($('tfc'), (t.clothing || []).map((f) => [f, f.split('/').pop()])); }
const cache = {}; const img = (src) => cache[src] || (cache[src] = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
function layers() {
  const c = $('cls').value, tf = $('tf').checked, L = [M.body];
  L.push(tf && $('tfc').value ? $('tfc').value : $('skin').value);
  if ($('beard').value) L.push(fileOf(M.beard[$('beard').value]));
  if ($('face').value) L.push(fileOf(M.face[$('face').value]));
  const h = M.hair[$('hair').value]; if (h) L.push(tf && h.transformations && h.transformations[c] ? h.transformations[c] : h.file);
  if (tf && M.transformations[c] && M.transformations[c].eyes) L.push(M.transformations[c].eyes);
  return L.filter(Boolean);
}
async function draw() {
  const L = layers(), z = +$('zoom').value, head = $('crop').value === 'head';
  document.documentElement.style.setProperty('--bg', $('bg').value);
  for (const id of ['c184', 'c1024']) {
    const cv = $(id), g = cv.getContext('2d'); const imgs = await Promise.all(L.map((f) => img(BASE[id] + f)));
    const crop = head ? [0.33, 0.12, 0.34, 0.24] : [0.2, 0.1, 0.6, 0.8]; const size = 1024 * z; /* both shown at the same screen size */
    cv.width = Math.round(crop[2] * size); cv.height = Math.round(crop[3] * size); g.imageSmoothingEnabled = false; g.fillStyle = $('bg').value; g.fillRect(0, 0, cv.width, cv.height);
    for (const im of imgs) if (im) { const w = im.naturalWidth; g.drawImage(im, crop[0] * w, crop[1] * w, crop[2] * w, crop[3] * w, 0, 0, cv.width, cv.height); }
  }
}
for (const id of ['cls', 'skin', 'tf', 'tfc', 'hair', 'beard', 'face', 'zoom', 'crop', 'bg']) $(id).addEventListener('input', () => { if (id === 'cls') fillClass(); draw(); });
fillClass(); draw();
</script></body></html>`;
fs.writeFileSync(path.join(OUT, 'creator.html'), html); console.log('written', path.join(OUT, 'creator.html'));
