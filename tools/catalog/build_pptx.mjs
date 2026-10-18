// Builds the GRIMGE visual catalog: every Arcane State (idle + forward / up / down
// techniques) and every spell, captured in-game with the Astral Wizard.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pptxgen from 'pptxgenjs';

const [shotDir, outFile, projectSrc] = process.argv.slice(2);
const imp = (f) => import(pathToFileURL(path.join(projectSrc, f)).href);
const { SPELL_RECIPES, SPELL_DEFINITIONS } = await imp('spell_catalog.js');
const { BUFF_FORM_DATA } = await imp('buff_forms_data.js');
const { SIGNATURE_RUNE_DATA } = await imp('signature_runes_data.js');
const manifest = JSON.parse(fs.readFileSync(path.join(shotDir, 'manifest.json'), 'utf8'));
const img = (name) => path.join(shotDir, name + '.jpg');
const RUNE_NAME = { ignis: 'Ignis', ventus: 'Ventus', fulgur: 'Fulgur', terra: 'Terra', aqua: 'Aqua', bestia: 'Bestia', construct: 'Konstrukt', void: 'Void', lux: 'Lux', umbra: 'Umbra', natura: 'Natura', doppel: 'Doppel', mortis: 'Mortis' };
const recipeOf = {};
for (const [key, id] of Object.entries(SPELL_RECIPES)) (recipeOf[id] ??= []).push(key.split('+').map((r) => RUNE_NAME[r] ?? r).join(' + '));

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
pres.title = 'GRIMGE - Arcane States & Spells (visueller Katalog)';
const BG = '14161C'; const FG = 'F2F2F2'; const SUB = 'A9B4C2'; const ACC = 'FFD25D';
const FONT = 'Segoe UI';
const ratio = 701 / 1806; // screenshot aspect (h / w)
const W = 6.15; const H = W * ratio; const XS = [0.4, 6.75];

function base(title, subtitle = '') {
  const s = pres.addSlide(); s.background = { color: BG };
  s.addText(title, { x: 0.4, y: 0.12, w: 12.5, h: 0.55, fontSize: 24, bold: true, color: FG, fontFace: FONT });
  if (subtitle) s.addText(subtitle, { x: 0.4, y: 0.62, w: 12.5, h: 0.45, fontSize: 11, color: SUB, fontFace: FONT });
  return s;
}
function section(title, text) {
  const s = pres.addSlide(); s.background = { color: '0E1014' };
  s.addText(title, { x: 0.6, y: 2.6, w: 12, h: 1, fontSize: 40, bold: true, color: ACC, fontFace: FONT });
  s.addText(text, { x: 0.6, y: 3.6, w: 12, h: 1.2, fontSize: 16, color: SUB, fontFace: FONT });
}

// Title slide.
{
  const s = pres.addSlide(); s.background = { color: '0E1014' };
  s.addText('GRIMGE', { x: 0.6, y: 1.6, w: 12, h: 1.2, fontSize: 60, bold: true, color: ACC, fontFace: FONT });
  s.addText('Visueller Katalog: Arcane States & Spells', { x: 0.6, y: 2.8, w: 12, h: 0.7, fontSize: 28, color: FG, fontFace: FONT });
  s.addText(`Im Spiel aufgenommen (Training, Held: Astral) - ${manifest.forms.length} Arcane States x 4 Bilder - ${manifest.spells.length} Spells - Stand ${new Date().toISOString().slice(0, 10)}`, { x: 0.6, y: 3.6, w: 12, h: 0.5, fontSize: 14, color: SUB, fontFace: FONT });
  s.addText('Jedes Bild ist ein Standbild aus dem laufenden Prototyp (Canvas, Pixel-Art-VFX). Effekte bewegen sich im Spiel - die Bilder zeigen einen typischen Moment.', { x: 0.6, y: 4.4, w: 12, h: 0.8, fontSize: 12, color: SUB, fontFace: FONT });
}

// Arcane States: one slide each, 2 x 2 grid (idle, forward full, up full, down full).
section('Arcane States', `${manifest.forms.length} kuratierte Transformationen (Spezialrune, max. 1 pro Deck). Pro Form: Erscheinung im Stand und die drei vollen Techniken (vorwaerts / hoch / runter).`);
for (const f of manifest.forms) {
  const data = BUFF_FORM_DATA.find((d) => d.id === f.id) ?? {};
  const t = data.tech ?? {};
  const sil = data.silhouette ?? '';
  const subtitle = (data.morphCategory ?? data.morphologyLabel ?? '') + (sil ? ' - ' + sil.slice(0, 160) + (sil.length > 160 ? '...' : '') : '');
  const s = base(`${f.id} - ${f.name}${data.title ? ' (' + data.title + ')' : ''}`, subtitle);
  const ys = [1.15, 1.15 + H + 0.55];
  const label = {
    idle: 'Erscheinung (Idle)',
    forward: `Vorwaerts voll: ${t.forward?.full?.name ?? ''}`,
    up: `Hoch voll: ${t.up?.full?.name ?? ''}`,
    down: `Runter voll: ${t.down?.full?.name ?? ''}`
  };
  ['idle', 'forward', 'up', 'down'].forEach((k, i) => {
    const x = XS[i % 2]; const y = ys[Math.floor(i / 2)];
    s.addImage({ path: img(`form_${f.id}_${k}`), x, y, w: W, h: H });
    s.addText(label[k], { x, y: y + H + 0.02, w: W, h: 0.3, fontSize: 11, color: ACC, fontFace: FONT });
  });
}

// Spells, grouped.
const sigIds = new Set(SIGNATURE_RUNE_DATA.map((d) => 'sig_' + d.id));
const NATURE = ['heal_bloom', 'great_bloom', 'healing_spring', 'blessing_circle', 'thorn_growth', 'poison_swamp', 'pollen_storm', 'wildfire_seeds', 'world_tree'];
const INFUSION = ['flame_edge', 'frost_edge', 'storm_edge', 'venom_edge', 'blood_edge', 'rending_edge'];
const SOLO = ['shadow_doppelganger', 'revenant_call'];
const arity = (sp) => (recipeOf[sp.id] ?? []).map((r) => r.split('+').length);
const groups = [
  ['Elementar-Runen (einzeln)', 'Ein Runensymbol = ein Spell.', (sp) => arity(sp).includes(1) && !NATURE.includes(sp.id) && !SOLO.includes(sp.id)],
  ['Zweier-Kombinationen', 'Zwei Runen in einem Slot-Chord fusionieren zu einem neuen Spell.', (sp) => arity(sp).includes(2) && !NATURE.includes(sp.id) && !INFUSION.includes(sp.id)],
  ['Dreier-Kombinationen', 'Drei Runen - die staerksten Fusionen.', (sp) => arity(sp).includes(3) && !NATURE.includes(sp.id)],
  ['NATURA & Heilung', 'Neue Elementar-Rune Natura: Heilkreise, Dornen, Gift, Weltenbaum.', (sp) => NATURE.includes(sp.id)],
  ['Waffen-Infusionen', 'Konstrukt + Element: Element-Effekte auf der Waffe (12 s).', (sp) => INFUSION.includes(sp.id)],
  ['Solo-Spezialrunen', 'Komplexe Glyphe, keine Kombination noetig.', (sp) => SOLO.includes(sp.id)],
  ['Signatur-Spezialrunen', 'Eigene Mehrstrich-Glyphe, eigene Mechanik (S01-S44).', (sp) => sigIds.has(sp.id)]
];
const used = new Set();
function spellSlides(title, list) {
  for (let i = 0; i < list.length; i += 4) {
    const chunk = list.slice(i, i + 4);
    const s = base(`${title}${list.length > 4 ? ` (${Math.floor(i / 4) + 1}/${Math.ceil(list.length / 4)})` : ''}`);
    const ys = [0.85, 0.85 + H + 0.95];
    chunk.forEach((sp, k) => {
      const x = XS[k % 2]; const y = ys[Math.floor(k / 2)];
      s.addImage({ path: img(`spell_${sp.id}`), x, y, w: W, h: H });
      const def = SPELL_DEFINITIONS[sp.id] ?? {};
      const recipe = recipeOf[sp.id]?.[0];
      const sig = sigIds.has(sp.id) ? SIGNATURE_RUNE_DATA.find((d) => 'sig_' + d.id === sp.id) : null;
      const head = `${def.name ?? sp.name}${recipe ? '  -  ' + recipe : ''}${sig ? '  -  ' + sig.id : ''}`;
      const desc = String(sig?.howTo ?? def.desc ?? sp.desc ?? '').slice(0, 200);
      s.addText([{ text: head, options: { bold: true, color: ACC, fontSize: 11, breakLine: true } }, { text: desc, options: { color: SUB, fontSize: 9 } }], { x, y: y + H + 0.02, w: W, h: 0.85, fontFace: FONT, valign: 'top' });
    });
  }
}
for (const [title, text, pick] of groups) {
  const list = manifest.spells.filter((sp) => !used.has(sp.id) && pick(sp));
  if (!list.length) continue;
  list.forEach((sp) => used.add(sp.id));
  section(title, `${text} (${list.length})`);
  spellSlides(title, list);
}
const rest = manifest.spells.filter((sp) => !used.has(sp.id));
if (rest.length) { section('Weitere Spells', `Ohne Runen-Rezept (z. B. von Transformationen gewaehrt): ${rest.length}`); spellSlides('Weitere Spells', rest); }

await pres.writeFile({ fileName: outFile });
console.log('wrote', outFile, (fs.statSync(outFile).size / 1e6).toFixed(1), 'MB', 'slides', pres.slides.length);
