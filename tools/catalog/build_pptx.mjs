// Builds the GRIMGE visual catalog: every Arcane State (idle + forward / up / down
// techniques), every spell (three moments: cast, flight / build-up, effect) and
// every weapon (combo, hold, charge down / up, air dive), captured in-game with
// the Astral Wizard (tools/catalog/capture_all.mjs).
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
pres.title = 'GRIMGE - Arcane States, Spells & Waffen (visueller Katalog)';
const BG = '14161C'; const FG = 'F2F2F2'; const SUB = 'A9B4C2'; const ACC = 'FFD25D';
const FONT = 'Segoe UI';
const ratio = 701 / 1806; // screenshot aspect (h / w)
const W = 6.15; const H = W * ratio; const XS = [0.4, 6.75];
const FW = 4.1; const FH = FW * ratio; const FX = [0.4, 4.6, 8.8];
// Two-stage spells: five frames per row (stage 1 + stage 2).
const FW5 = 2.46; const FH5 = FW5 * ratio; const FX5 = [0.4, 2.92, 5.44, 7.96, 10.48];

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
const tag = (s, text, x, y) => s.addText(text, { x: x + 0.05, y: y + 0.03, w: 1.7, h: 0.25, fontSize: 9, bold: true, color: 'FFFFFF', fontFace: FONT, fill: { color: '000000', transparency: 45 } });

// Title slide.
{
  const s = pres.addSlide(); s.background = { color: '0E1014' };
  s.addText('GRIMGE', { x: 0.6, y: 1.6, w: 12, h: 1.2, fontSize: 60, bold: true, color: ACC, fontFace: FONT });
  s.addText('Visueller Katalog: Arcane States, Spells & Waffen', { x: 0.6, y: 2.8, w: 12, h: 0.7, fontSize: 28, color: FG, fontFace: FONT });
  s.addText(`Im Spiel aufgenommen (Training, Held: Astral) - ${manifest.forms.length} Arcane States x 4 Bilder - ${manifest.spells.length} Spells (je 3 Momente, Zweistufer 5) - ${manifest.statuses?.length ?? 0} Statuseffekte, ${manifest.combos?.length ?? 0} Kombos - ${manifest.weapons?.length ?? 0} Waffen x 5 Bilder - Stand ${new Date().toISOString().slice(0, 10)}`, { x: 0.6, y: 3.6, w: 12, h: 0.5, fontSize: 14, color: SUB, fontFace: FONT });
  s.addText('Spells und Waffen in Zeitlupe aufgenommen, damit der Zauber selbst sichtbar ist und nicht nur sein Einschlag: 1 Wirken - 2 Flug / Aufbau - 3 Wirkung.', { x: 0.6, y: 4.4, w: 12, h: 0.8, fontSize: 12, color: SUB, fontFace: FONT });
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

// Spells, grouped; two spells per slide, each a filmstrip of three moments.
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
  ['Signatur-Spezialrunen', 'Eigene Mehrstrich-Glyphe, eigene Mechanik (S01-S54). Zweistufige Runen zeigen zusaetzlich Stufe 2 (erneut tippen).', (sp) => sigIds.has(sp.id)]
];
const FRAME_LABEL = ['1 Wirken', '2 Flug / Aufbau', '3 Wirkung', '4 Stufe 2', '5 Stufe 2: Wirkung'];
function spellSlides(title, list) {
  const ROWS = [0.9, 4.15];
  for (let i = 0; i < list.length; i += 2) {
    const chunk = list.slice(i, i + 2);
    const s = base(`${title}${list.length > 2 ? ` (${Math.floor(i / 2) + 1}/${Math.ceil(list.length / 2)})` : ''}`);
    chunk.forEach((sp, k) => {
      const y = ROWS[k];
      const frames = sp.frames ?? ['a', 'b', 'c']; const five = frames.length > 3;
      frames.forEach((fr, j) => {
        const x = five ? FX5[j] : FX[j];
        s.addImage({ path: img(`spell_${sp.id}_${fr}`), x, y, w: five ? FW5 : FW, h: five ? FH5 : FH });
        tag(s, FRAME_LABEL[j], x, y);
      });
      const def = SPELL_DEFINITIONS[sp.id] ?? {};
      const recipe = recipeOf[sp.id]?.[0];
      const sig = sigIds.has(sp.id) ? SIGNATURE_RUNE_DATA.find((d) => 'sig_' + d.id === sp.id) : null;
      const head = `${def.name ?? sp.name}${recipe ? '  -  ' + recipe : ''}${sig ? '  -  ' + sig.id : ''}`;
      const desc = String(sig?.howTo ?? def.desc ?? sp.desc ?? '').slice(0, 260);
      s.addText([{ text: head, options: { bold: true, color: ACC, fontSize: 12, breakLine: true } }, { text: desc, options: { color: SUB, fontSize: 10 } }], { x: 0.4, y: y + FH + 0.04, w: 12.5, h: 0.95, fontFace: FONT, valign: 'top' });
    });
  }
}
const used = new Set();
for (const [title, text, pick] of groups) {
  const list = manifest.spells.filter((sp) => !used.has(sp.id) && pick(sp));
  if (!list.length) continue;
  list.forEach((sp) => used.add(sp.id));
  section(title, `${text} (${list.length})`);
  spellSlides(title, list);
}
const rest = manifest.spells.filter((sp) => !used.has(sp.id));
if (rest.length) { section('Weitere Spells', `Ohne Runen-Rezept (z. B. von Transformationen gewaehrt): ${rest.length}`); spellSlides('Weitere Spells', rest); }

// Status effects (6 per slide) and combos (6 per slide).
function grid(title, cells) {
  for (let i = 0; i < cells.length; i += 6) {
    const s = base(`${title}${cells.length > 6 ? ` (${i / 6 + 1}/${Math.ceil(cells.length / 6)})` : ''}`);
    cells.slice(i, i + 6).forEach(([image, label, text], k) => {
      const x = FX[k % 3]; const y = k < 3 ? 1.0 : 1.0 + FH + 1.05;
      s.addImage({ path: img(image), x, y, w: FW, h: FH });
      s.addText([{ text: label, options: { bold: true, color: ACC, fontSize: 12, breakLine: true } }, { text: text ?? '', options: { color: SUB, fontSize: 10 } }], { x, y: y + FH + 0.03, w: FW, h: 0.8, fontFace: FONT, valign: 'top' });
    });
  }
}
if (manifest.statuses?.length) {
  section('Statuseffekte & Kombos', 'Ein Treffer KANN einen Status hinterlassen (Zufall pro Treffer, wie bei Pokemon). Trifft ein passendes Element auf einen Status, loest eine Kombo garantiert aus.');
  const STATUS_TEXT = { frozen: 'Eisblock: keine Bewegung (Eis-Spells)', burn: 'Flammen, Schaden ueber Zeit (Ignis)', paralysis: 'Blitzboegen, stockt immer wieder (Fulgur)', poison: 'Giftblasen, laengerer Schaden ueber Zeit (Natura, Mortis)', bleed: 'Blutstropfen, mehr Schaden in Bewegung (Klingen, Terra)', wet: 'Nass: kein Schaden, bereitet Kombos vor (Wasser, Pfuetzen)' };
  grid('Statuseffekte', manifest.statuses.map((st) => [`status_${st.kind}`, st.label, STATUS_TEXT[st.kind]]));
  grid('Status-Kombos', (manifest.combos ?? []).map((c) => [`combo_${c.id}`, c.name, c.text]));
}
if (manifest.duel?.length) {
  const s = base('Sphaeren-Duell (S53)', 'Treffen zwei gegnerische Sphaerenentfaltungen aufeinander, tippen beide 3 s um die Wette - die schwaechere Kuppel bricht zusammen. Die KI antwortet auf eine Kuppel mit ihrer eigenen.');
  manifest.duel.forEach((name, i) => s.addImage({ path: img(name), x: XS[i], y: 1.4, w: W, h: H }));
}

// Weapons: one slide each — combo, hold, charge down, charge up, air dive.
if (manifest.weapons?.length) {
  section('Waffen', `${manifest.weapons.length} Waffen der Klassen: Kombo (auf der Lane Nahkampf), Halten = Fernangriff der Waffe, Charge runter = waffenspezifischer Buff / Debuff, Charge hoch = Launcher, in der Luft runter = Sturzangriff.`);
  for (const w of manifest.weapons) {
    const s = base(`${w.name}${w.family ? '  (' + w.family + ')' : ''}`, w.desc);
    const cells = [['combo', 'Kombo'], ['hold', 'Halten: Fernangriff'], ['down', 'Charge runter: ' + w.downName], ['up', 'Charge hoch: ' + w.upName], ['dive', 'Luft runter: ' + w.diveName]];
    cells.forEach(([key, label], i) => {
      const x = FX[i % 3]; const y = i < 3 ? 1.15 : 1.15 + FH + 0.55;
      s.addImage({ path: img(`weapon_${w.id}_${key}`), x, y, w: FW, h: FH });
      s.addText(label, { x, y: y + FH + 0.02, w: FW, h: 0.3, fontSize: 11, color: ACC, fontFace: FONT });
    });
  }
}

await pres.writeFile({ fileName: outFile });
console.log('wrote', outFile, (fs.statSync(outFile).size / 1e6).toFixed(1), 'MB', 'slides', pres.slides.length);
