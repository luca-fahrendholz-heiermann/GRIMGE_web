// GRIMGE — collects every character-creation layer (art_source/body/layers, all on the 184×184 reference-body grid) into
// public/assets/character/<category>/ and writes manifest.json — the data the character creator / renderer composes from.
// Everything is a separate swappable piece (user, 21 Nov 2026: "alles modular austauschbar und anpassbar"):
//   body → outfit (a class skin) → beard / face → hair (or its transformation variant) → eyes; a transformation swaps the
//   outfit for its transformation clothing and every hair / the eyes for their variant of that transformation.
//   node art/authoring/build_character_assets.cjs
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '../..'); const SRC = path.join(ROOT, 'art_source/body/layers'); const OUT = path.join(ROOT, 'public/assets/character');
const CLASSES = ['guardian', 'berserker', 'lancer', 'monk', 'beastborn', 'shadow', 'ranger', 'arcanist'];
// class → skins: [id, source layer file (without _outfit.png), label]
const STYLE_SKINS = {
  guardian: [['rune_knight', 'Runenritter'], ['dark_samurai', 'Dunkler Samurai']],
  berserker: [['stormarm', 'Sturmarm'], ['oni_monk', 'Oni-Kämpfer']],
  lancer: [['ronin', 'Ronin']],
  monk: [['white_monk', 'Weißer Mönch']],
  beastborn: [['leather', 'Lederjäger']],
  shadow: [['astral_hood', 'Astral (Kapuze)'], ['astral', 'Astral']],
  ranger: [['wanderer', 'Wanderer']],
  arcanist: [['runescribe', 'Runenschreiber'], ['crimson_robe', 'Karmesin-Robe']]
};
const TF_NAMES = { guardian: 'Karmesin-Bastion', berserker: 'Oni-Erwachen', lancer: 'Himmelskranich', monk: 'Tausend Hände', beastborn: 'Wolfsgeist', shadow: 'Nachtphantom', ranger: 'Sturmfalke', arcanist: 'Runenkaiser' };
const copy = (from, cat, name) => { const src = path.join(SRC, from); if (!fs.existsSync(src)) return null; fs.mkdirSync(path.join(OUT, cat), { recursive: true }); fs.copyFileSync(src, path.join(OUT, cat, name)); return `${cat}/${name}`; };
const manifest = { grid: { size: 184, bodyHeight: 116, note: 'every layer is 184×184 on the reference body grid; compose in order body, outfit, beard, face, hair, eyes' }, body: copy('body.png', 'body', 'body.png'), classes: {}, hair: {}, beard: {}, face: {}, eyes: {}, transformations: {}, primalForms: {} };
for (const c of CLASSES) {
  const skins = [];
  const add = (id, file, label) => { const p = copy(`${file}_outfit.png`, 'outfit', `${c}_${id}.png`); if (p) skins.push({ id, label, file: p }); };
  add('signature', `rc2_${c}`, 'Klassen-Design'); add('gritty_tinted', `rc_${c}`, 'Klassenfarben'); add('gritty', `cl2_${c}`, 'Knochen & Fell'); add('anime', c, 'Altes Japan'); add('retro', `cl3_${c}`, 'Retro'); add('retro_signature', `cl4_${c}`, 'Retro Klassen-Design');
  for (const [id, label] of STYLE_SKINS[c] ?? []) add(id, id, label);
  manifest.classes[c] = { skins, defaultSkin: skins[0]?.id ?? null, defaultHair: fs.existsSync(path.join(SRC, `${c}_hair.png`)) ? c : null };
  const tfc = copy(`tfc_${c}_outfit.png`, 'transform', `${c}_tf_anime.png`); const tf2 = copy(`tf2_${c}_outfit.png`, 'transform', `${c}_tf_gritty.png`);
  manifest.transformations[c] = { name: TF_NAMES[c], clothing: [tf2, tfc].filter(Boolean), eyes: copy(`hair_tf/eyes_${c}.png`, 'eyes', `eyes_${c}.png`) };
}
for (const f of fs.readdirSync(SRC).filter((f) => /_hair\.png$/.test(f) && !/^(tf|tfc|tf2|cl2|cl3|cl4|rc|rc2|pf2|guardian_a|guardian_b)_/.test(f) && !/^guardian_[ab]_/.test(f))) {
  const id = f.replace('_hair.png', ''); const variants = {};
  for (const c of CLASSES) { const v = copy(`hair_tf/${id}_hair_${c}.png`, 'hair', `${id}_${c}.png`); if (v) variants[c] = v; }
  manifest.hair[id] = { file: copy(f, 'hair', `${id}.png`), transformations: variants };
}
for (const f of fs.existsSync(path.join(SRC, 'beard')) ? fs.readdirSync(path.join(SRC, 'beard')) : []) manifest.beard[f.replace('.png', '')] = copy(`beard/${f}`, 'beard', f);
for (const f of fs.existsSync(path.join(SRC, 'face')) ? fs.readdirSync(path.join(SRC, 'face')) : []) manifest.face[f.replace('.png', '')] = copy(`face/${f}`, 'face', f);
for (const p of ['wolf', 'turtle', 'ape', 'dragon']) manifest.primalForms[p] = { stage2: copy(`pf2_${p}_outfit.png`, 'primal', `${p}_stage2.png`), stage3: copy(`pf3/pf3_${p}.png`, 'primal', `${p}_stage3.png`) };
// dye channels per outfit / transformation clothing (public/src/armor_dye.js — the same code the game dyes with)
(async () => {
  const { findChannels } = await import('../../public/src/armor_dye.js'); const cp = require('child_process');
  const chOf = (rel) => findChannels(cp.execFileSync('magick', [path.join(OUT, rel), '-alpha', 'on', '-depth', '8', 'rgba:-']));
  for (const c of CLASSES) { for (const sk of manifest.classes[c].skins) sk.dye = chOf(sk.file); manifest.transformations[c].dye = manifest.transformations[c].clothing.map(chOf); }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(JSON.stringify({ files: count(manifest), classes: Object.fromEntries(Object.entries(manifest.classes).map(([k, v]) => [k, v.skins.length])), hair: Object.keys(manifest.hair).length, beard: Object.keys(manifest.beard).length, face: Object.keys(manifest.face).length }));
})();
function count(o) { return JSON.stringify(o).match(/.png/g)?.length ?? 0; }
