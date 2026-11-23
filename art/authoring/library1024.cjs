// GRIMGE — the whole character library in 1024×1024 (user, 22 Nov 2026: "die Frisuren etc. sind aber nicht 1024×1024").
// The 1024 reference body is the 184 body upscaled (every body pixel identical at its cell centre), so every library layer
// gets the same names as public/assets/character/** but on the 1024 grid:
//   • a 1024 extraction (extract1024.cjs → art/layers1024/<source>/{hair,outfit}.png) where one matches — found by
//     measuring, not by name: each extraction is sampled at the 184 cell centres and compared with the library file;
//   • otherwise the 184 file upscaled exactly like the reference (nearest, 1024/184 px per pixel) — pixel-exact on it;
//   • hair transformation variants that are pure recolours of their hair (same shape at 184) are recoloured again at 1024
//     with hair_transform's own gradient map; shape-changed variants are upscaled.
//   node art/authoring/library1024.cjs   → art/layers1024/library/<category>/<file>.png + manifest_1024.json + MATCHES.md
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs'); const { TF, mapHair } = require('./hair_transform.cjs');
const ROOT = path.resolve(__dirname, '../..'); const LIB = path.join(ROOT, 'public/assets/character'); const L1K = path.join(ROOT, 'art/layers1024'); const OUT = path.join(L1K, 'library');
const W = 1024, N = 184, S = W / N;
const read = (f) => PNG.sync.read(fs.readFileSync(f));
const save = (png, rel) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, PNG.sync.write(png)); };
function upscale(src) { const o = new PNG({ width: W, height: W }); for (let y = 0; y < W; y++) { const sy = Math.min(N - 1, Math.floor((y + .5) / S)); for (let x = 0; x < W; x++) { const sx = Math.min(N - 1, Math.floor((x + .5) / S)); src.data.copy(o.data, (y * W + x) * 4, (sy * N + sx) * 4, (sy * N + sx) * 4 + 4); } } return o; }
const alpha184 = (png) => { const a = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) a[i] = png.data[i * 4 + 3] > 127 ? 1 : 0; return a; };
const sample184 = (png) => { const a = new Uint8Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) a[y * N + x] = png.data[(Math.floor((y + .5) * S) * W + Math.floor((x + .5) * S)) * 4 + 3] > 127 ? 1 : 0; return a; };
const bodyA = alpha184(read(path.join(LIB, 'body/body.png')));
// score: how much of the library layer the candidate covers × how much of the candidate's clothing OFF the body the library has
// (the 1024 outfits include the bare body, the 184 ones do not — body pixels are left out of the second term)
function score(lib, cand, outfitMode) { let li = 0, l = 0, ci = 0, c = 0; for (let i = 0; i < N * N; i++) { if (lib[i]) { l++; if (cand[i]) li++; } const cc = cand[i] && (!outfitMode || !bodyA[i]); if (cc) { c++; if (lib[i]) ci++; } } return l && c ? (li / l) * (ci / c) : 0; }
const sources = fs.readdirSync(L1K).filter((d) => fs.existsSync(path.join(L1K, d, 'hair.png')));
const cand = { hair: {}, outfit: {} }; for (const s of sources) for (const k of ['hair', 'outfit']) cand[k][s] = sample184(read(path.join(L1K, s, `${k}.png`)));
// which sources may stand for a library file — the naming scheme of the sources (shape alone mixed up similar silhouettes)
const CLASSES = ['guardian', 'berserker', 'lancer', 'monk', 'beastborn', 'shadow', 'ranger', 'arcanist'];
function allowed(rel) {
  const f = path.basename(rel, '.png'); let m;
  if ((m = /^outfit\/(\w+?)_(gritty_tinted|gritty|anime|retro_signature|retro|signature|(\w+))$/.exec(rel.replace(/\.png$/, '')))) {
    const [, c, skin] = m; return { gritty: [`cl2_${c}`, `rc_${c}`], gritty_tinted: [`rc_${c}`, `cl2_${c}`], anime: [`cls_${c}`], retro: [`cl3_${c}`], signature: [`rc2_${c}`], retro_signature: [`cl4_${c}`] }[skin] ?? [`sty_${skin}`];
  }
  if ((m = /^(\w+)_tf_(gritty|anime)$/.exec(f))) return [m[2] === 'gritty' ? `tf2_${m[1]}` : `tf_${m[1]}`];
  if (rel.startsWith('hair/')) return CLASSES.includes(f) ? [`cls_${f}`] : [`sty_${f}`];
  return [];
}
// colour agreement on the shared pixels off the body (a recoloured "tinted" skin must not take the untinted source)
function colourOk(libPng, src) { const p = read(path.join(L1K, src, libPng.kind + '.png')); let d = 0, n = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (libPng.data[i * 4 + 3] < 128 || bodyA[i]) continue; const j = (Math.floor((y + .5) * S) * W + Math.floor((x + .5) * S)) * 4; if (p.data[j + 3] < 128) continue; d += Math.abs(p.data[j] - libPng.data[i * 4]) + Math.abs(p.data[j + 1] - libPng.data[i * 4 + 1]) + Math.abs(p.data[j + 2] - libPng.data[i * 4 + 2]); n++; } return n ? d / n : 999; }
function best(kind, libPng, rel) { const a = alpha184(libPng); let b = null, bv = 0; for (const s of allowed(rel)) { const c = cand[kind][s]; if (!c) continue; const v = score(a, c, kind === 'outfit'); if (v > bv) { bv = v; b = s; } } if (b) { libPng.kind = kind; const cd = colourOk(libPng, b); if (cd > 90) return { src: null, v: bv, why: `${b} shape ${bv.toFixed(2)}, colours differ (${cd | 0})` }; return { src: b, v: bv, cd }; } return { src: null, v: 0 }; }
const man = JSON.parse(fs.readFileSync(path.join(LIB, 'manifest.json'), 'utf8')); const log = []; const m2hair = {}; const MIN = .3;
function layer(rel, kind) { // one library file → 1024
  const lib = read(path.join(LIB, rel)); const m = kind ? best(kind, lib, rel) : { src: null, v: 0 };
  if (m.src && m.v >= MIN) { save(read(path.join(L1K, m.src, `${kind}.png`)), rel); log.push(`| ${rel} | ${m.src} | shape ${m.v.toFixed(2)}, colour Δ ${m.cd | 0} |`); return { from: m.src, png: read(path.join(L1K, m.src, `${kind}.png`)) }; }
  save(upscale(lib), rel); log.push(`| ${rel} | upscaled from 184${m.why ? ` (${m.why})` : ''} | — |`); return { from: null };
}
layer(man.body, null);
for (const c of Object.values(man.classes)) for (const s of c.skins ?? []) layer(s.file, 'outfit');
for (const t of Object.values(man.transformations)) { for (const f of t.clothing ?? []) layer(f, 'outfit'); if (t.eyes) layer(t.eyes, null); }
for (const e of Object.values(man.eyes ?? {})) { const f = typeof e === 'string' ? e : e?.file; if (f && !fs.existsSync(path.join(OUT, f))) layer(f, null); }
for (const k of ['beard', 'face']) for (const e of Object.values(man[k] ?? {})) { const f = typeof e === 'string' ? e : e?.file; if (f) layer(f, null); }
for (const [id, h] of Object.entries(man.hair)) {
  // hairstyles generated alone on the bare reference (hair_from_bare.cjs) are cut by their exact shape: they take
  // precedence, with their back hair (hair/<id>_back.png — drawn behind the armour)
  const bareDir = path.join(L1K, 'hair', id); let base;
  if (fs.existsSync(path.join(bareDir, 'hair.png'))) { const png = read(path.join(bareDir, 'hair.png')); save(png, h.file); base = { from: `bare ${id}`, png }; log.push(`| ${h.file} | generated alone on the bare body (${id}) | exact |`);
    if (fs.existsSync(path.join(bareDir, 'hair_back.png'))) { const bp = read(path.join(bareDir, 'hair_back.png')); const bf = `hair/${id}_back.png`; save(bp, bf); base.back = bp; m2hair[id] = { back: bf, backTransformations: {} }; log.push(`| ${bf} | back hair of ${id} | exact |`); } }
  else base = layer(h.file, 'hair');
  const base184 = alpha184(read(path.join(LIB, h.file)));
  for (const [tf, f] of Object.entries(h.transformations ?? {})) {
    const v = read(path.join(LIB, f)); const va = alpha184(v); let d = 0, n = 0; for (let i = 0; i < N * N; i++) { if (va[i] !== base184[i]) d++; if (base184[i]) n++; }
    if (base.from && d <= n * .02 && TF[tf]) { const p = new PNG({ width: W, height: W }); p.data = mapHair(base.png.data, TF[tf].ramp); save(p, f); log.push(`| ${f} | ${base.from}, recoloured (${TF[tf].name}) | — |`);
      if (base.back) { const bp = new PNG({ width: W, height: W }); bp.data = mapHair(base.back.data, TF[tf].ramp); const bf = f.replace(/.png$/, '_back.png'); save(bp, bf); m2hair[id].backTransformations[tf] = bf; } }
    else { save(upscale(v), f); log.push(`| ${f} | upscaled from 184${base.from ? ' (shape-changed variant)' : ''} | — |`); }
  }
  void id;
}
const m2 = JSON.parse(JSON.stringify(man)); for (const [id, x] of Object.entries(m2hair)) Object.assign(m2.hair[id], x); m2.grid = { ...man.grid, size: W, note: 'every layer is 1024×1024 on reference_body.png (= the 184 body × 1024/184); compose in order hair back, body, outfit, beard, face, hair, eyes' };
fs.writeFileSync(path.join(OUT, 'manifest_1024.json'), JSON.stringify(m2, null, 1));
fs.writeFileSync(path.join(OUT, 'MATCHES.md'), `# 1024 library — where every layer comes from\n\n| file | source | match |\n|---|---|---|\n${log.join('\n')}\n`);
console.log(`${log.length} layers; from 1024 sources: ${log.filter((l) => !/upscaled/.test(l)).length}, upscaled: ${log.filter((l) => /upscaled/.test(l)).length}`);
