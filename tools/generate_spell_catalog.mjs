// Generates docs/GRIMGE_Runes_Spells_Catalog.md (+ docs/runes/*.svg) from the
// prototype's own data modules, so the catalog matches the game exactly.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Usage: node tools/generate_spell_catalog.mjs   (from the project root)
const root = process.argv[2] ?? process.cwd();
const vfxFile = process.argv[3] ?? path.join(root, 'tools', 'spell_vfx.json');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const { RuneRecognizer } = await load('public/src/recognizer.js');
const { RUNE_GUIDES } = await load('public/src/rune_guides.js');
const cat = await load('public/src/spell_catalog.js');
const { SPELL_DEFINITIONS, SPELL_RECIPES, RUNE_MANA_COSTS, spellHowTo, SOLO_RUNES, DELIVERY, TARGETING } = cat;
const VFX = vfxFile && fs.existsSync(vfxFile) ? JSON.parse(fs.readFileSync(vfxFile, 'utf8')) : {};

const runes = new RuneRecognizer().runes;
const runeById = Object.fromEntries(runes.map((r) => [r.id, r]));
const BASE = ['ignis', 'ventus', 'fulgur', 'terra', 'aqua', 'bestia', 'construct', 'void', 'lux', 'umbra'];
const docsDir = path.join(root, 'docs');
const svgDir = path.join(docsDir, 'runes');
fs.mkdirSync(svgDir, { recursive: true });

// ── Rune glyph SVGs (from the training trace guides) ─────────────────────
function runeSvg(id) {
  const guide = RUNE_GUIDES[id];
  const rune = runeById[id];
  if (!guide) return null;
  const color = rune?.color ?? '#ffffff';
  const S = 100; const pt = ([x, y]) => `${(x * 40 + 50).toFixed(1)},${(y * 40 + 50).toFixed(1)}`;
  const strokes = guide.map((stroke) => `<polyline points="${stroke.map(pt).join(' ')}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const dots = guide.map((stroke, i) => { const [x, y] = stroke[0]; return `<circle cx="${(x * 40 + 50).toFixed(1)}" cy="${(y * 40 + 50).toFixed(1)}" r="6" fill="#ffffff"/><text x="${(x * 40 + 50).toFixed(1)}" y="${(y * 40 + 53.5).toFixed(1)}" font-size="9" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#120a1e">${i + 1}</text>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="96" height="96"><rect width="100" height="100" rx="12" fill="#14101f"/>${strokes}${dots}</svg>\n`;
}

// ASCII preview of a glyph (densified guide points on a 17 × 9 grid).
function runeAscii(id) {
  const guide = RUNE_GUIDES[id];
  if (!guide) return null;
  const W = 17; const H = 9; const grid = Array.from({ length: H }, () => Array(W).fill(' '));
  guide.forEach((stroke, si) => {
    for (let i = 1; i < stroke.length; i++) {
      const [x0, y0] = stroke[i - 1]; const [x1, y1] = stroke[i];
      const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 20));
      for (let s = 0; s <= steps; s++) {
        const x = x0 + (x1 - x0) * s / steps; const y = y0 + (y1 - y0) * s / steps;
        const cx = Math.round((x + 1) / 2 * (W - 1)); const cy = Math.round((y + 1) / 2 * (H - 1));
        if (grid[cy]?.[cx] !== undefined && grid[cy][cx] === ' ') grid[cy][cx] = '#';
      }
    }
    const [sx, sy] = stroke[0];
    const cx = Math.round((sx + 1) / 2 * (W - 1)); const cy = Math.round((sy + 1) / 2 * (H - 1));
    if (grid[cy]?.[cx] !== undefined) grid[cy][cx] = String(si + 1);
  });
  return grid.map((row) => row.join('').replace(/\s+$/, '')).join('\n');
}

for (const id of Object.keys(RUNE_GUIDES)) fs.writeFileSync(path.join(svgDir, `${id}.svg`), runeSvg(id));

// ── Spell helpers ────────────────────────────────────────────────────────
const recipesFor = (spellId) => Object.entries(SPELL_RECIPES).filter(([, s]) => s === spellId).map(([key]) => key.split('+'));
const runeLabel = (id) => `${runeById[id]?.icon ?? ''} ${runeById[id]?.name ?? id.toUpperCase()}`.trim();
const recipeLabel = (parts) => parts.map(runeLabel).join(' + ');
const runeMana = (parts) => parts.reduce((sum, id) => sum + (RUNE_MANA_COSTS[id] ?? 10), 0);
const glyphImgs = (parts) => parts.map((id) => RUNE_GUIDES[id] ? `<img src="runes/${id}.svg" width="32" alt="${id}">` : (runeById[id]?.glyph ?? id)).join(' ');
const tierName = { 1: 'Fundamental (1 Rune)', 2: 'Compound (2 Runen)', 3: 'Advanced (3 Runen)' };

function spellGroup(id) {
  const def = SPELL_DEFINITIONS[id];
  const recs = recipesFor(id);
  if (recs.some((r) => r.some((x) => x.startsWith('transform_')))) return 'transform';
  if (recs.some((r) => r.length === 1 && SOLO_RUNES.includes(r[0]))) return 'solo';
  if (def.isSkyField) return 'sky';
  const n = Math.min(...recs.map((r) => r.length));
  return n === 1 ? 't1' : n === 2 ? 't2' : 't3';
}

const groups = { t1: [], solo: [], transform: [], t2: [], sky: [], t3: [] };
for (const id of Object.keys(SPELL_DEFINITIONS)) groups[spellGroup(id)].push(id);

function spellBlock(id) {
  const def = SPELL_DEFINITIONS[id];
  const recs = recipesFor(id);
  const how = spellHowTo(id);
  const tags = def.interactionTags?.length ? def.interactionTags.join(', ') : '—';
  const lines = [];
  lines.push(`#### ${def.name} \`${id}\``);
  lines.push('');
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| **Rezept** | ${recs.map((r) => `${glyphImgs(r)} ${recipeLabel(r)}`).join('<br>oder ') || '—'} |`);
  lines.push(`| **Tier** | ${def.tier} | `);
  lines.push(`| **Mana (gebunden)** | ${recs.length ? runeMana(recs[0]) : '—'}${def.manaCost && recs.length && def.manaCost !== runeMana(recs[0]) ? ` (Katalogwert ${def.manaCost})` : ''}${def.cooldown ? ` · Cooldown ${def.cooldown} s` : ''} |`);
  lines.push(`| **Delivery** | \`${def.deliveryType}\`${def.beamProfile ? ` (Beam-Profil \`${def.beamProfile}\`)` : ''}${def.isSkyField ? ' · Himmelsfeld' : ''}${def.isSpecial ? ' · Spezial (nicht fusionierbar)' : ''} |`);
  lines.push(`| **Zielmodus** | \`${def.targetingMode}\` |`);
  lines.push(`| **Interaktions-Tags** | ${tags} |`);
  lines.push(`| **Farbe** | \`${def.color}\` |`);
  lines.push(`| **Beschreibung** | ${def.desc} |`);
  if (how?.effect && how.effect !== def.desc) lines.push(`| **Wirkung im Spiel** | ${how.effect} |`);
  if (how?.summon) lines.push(`| **Beschwörung** | ${how.summon} |`);
  lines.push(`| **Visualisierung** | ${VFX[id] ?? '—'} |`);
  lines.push('');
  return lines.join('\n');
}

// ── Document ─────────────────────────────────────────────────────────────
const out = [];
const P = (s = '') => out.push(s);
P('# GRIMGE — Runen- & Spell-Katalog (Stand Web-Prototyp)');
P('');
P('> Automatisch aus den Spieldaten erzeugt (`public/src/recognizer.js`, `rune_guides.js`, `spell_catalog.js`). Glyphen-Bilder: `docs/runes/*.svg` (Startpunkt = nummerierter weißer Punkt, Strichreihenfolge = Nummer).');
P('> Zweck: Grundlage für einen Research-Agenten, der weitere Spells entwerfen bzw. aus anderen Spielen/Animes recherchieren soll (siehe Abschnitt 8).');
P('');
P('## Inhalt');
P('1. [Grundsystem](#1-grundsystem) · 2. [Runen](#2-runen) · 3. [Spells](#3-spells) · 4. [Kombinationsmatrix](#4-kombinationsmatrix) · 5. [Transformationen & Form-Techniken](#5-transformationen--form-techniken) · 6. [Glossar](#6-glossar-delivery-zielmodi-tags) · 7. [Statistik](#7-statistik) · 8. [Hinweise für den Research-Agenten](#8-hinweise-für-den-research-agenten)');
P('');
P('## 1. Grundsystem');
P('');
P('- **Runen zeichnen:** Der Spieler zeichnet eine Rune aus seiner Hand (Deck aus 10 Karten, Hand = 3, verbrauchte Runen gehen ans Deckende). Der Erkenner bewertet die Zeichnung mit einer **Qualität C/B/A/S**.');
P('- **Mana** wird beim Zeichnen **gebunden** (nicht beim Wirken). Fusionierte Spells kosten die Summe ihrer Runen.');
P('- **3 Spell-Slots:** Jede gezeichnete Rune liegt als fertiger 1-Runen-Spell in einem Slot (Tasten Z/X/C, Gamepad LB/RB/RT, Touch: Slot antippen).');
P('- **Fusion:** Zwei oder drei Slots gleichzeitig halten (bzw. von Slot zu Slot wischen) → Rezept-Lookup (reihenfolgeunabhängig, Schlüssel = sortierte Rune-IDs). Gibt es kein Rezept, bleibt im Match nur **ein zufälliger** der Slots übrig (Training: nichts geht verloren). Fusionierte Spells und Spezial-Runen können **nicht erneut** fusioniert werden.');
P('- **Solo-Spezialrunen** (`doppel`, `mortis`): schwere Glyphe, sind allein ein vollständiger Spell, nie fusionierbar.');
P('- **Transformations-Runen** (`transform_*`): Altbestand — werden aktuell **nicht mehr vergeben** (die Erkenner-Texte „Any gesture while …“ sind veraltet). ANNIHILATION BEAM kommt jetzt als Form-Technik (Focus Ascendant, Heavy-Charge vorwärts voll); VOID IMPLOSION und INFERNO RAMPAGE sind derzeit ohne Zugang (Kandidaten für Neuzuordnung).');
P('- **Castle Siege:** Runen werden nur auf der eigenen Burg-Plattform gezeichnet; geslottete Spells wirken überall.');
P('');
P('**Qualitätsstufen** (`RUNE_GRADE_PROFILES`):');
P('');
P('| Grade | Power | Area | Duration | Partikel |');
P('|---|---|---|---|---|');
P('| C | ×0.80 | ×0.86 | ×0.84 | ×0.78 |');
P('| B | ×1.00 | ×1.00 | ×1.00 | ×1.00 |');
P('| A | ×1.10 | ×1.08 | ×1.08 | ×1.15 |');
P('| S | ×1.25 | ×1.20 | ×1.20 | ×1.40 |');
P('');
P('## 2. Runen');
P('');
P('| Glyphe | Rune | Element | Icon | Farbe | Mana | Zeichnen | Allein ergibt |');
P('|---|---|---|---|---|---|---|---|');
for (const r of runes) {
  const solo = SPELL_RECIPES[r.id] ? SPELL_DEFINITIONS[SPELL_RECIPES[r.id]]?.name : '—';
  const img = RUNE_GUIDES[r.id] ? `<img src="runes/${r.id}.svg" width="48" alt="${r.id}">` : r.glyph;
  P(`| ${img} | **${r.name}** \`${r.id}\` | ${r.element} | ${r.icon} | \`${r.color}\` | ${RUNE_MANA_COSTS[r.id] ?? 10} | ${r.desc} | ${solo} |`);
}
P('');
P('### Glyphen als ASCII (Ziffer = Startpunkt des Strichs)');
P('');
for (const r of runes) {
  const ascii = runeAscii(r.id);
  if (!ascii) continue;
  P(`**${r.icon} ${r.name}** — ${r.desc}`);
  P('```');
  P(ascii);
  P('```');
}
P('');
P('## 3. Spells');
P('');
const sections = [
  ['t1', '3.1 Fundamental — eine Rune'],
  ['solo', '3.2 Solo-Spezialrunen'],
  ['t2', '3.3 Compound — zwei Runen'],
  ['sky', '3.4 Himmelsfelder (Compound, nur eines gleichzeitig aktiv)'],
  ['t3', '3.5 Advanced — drei Runen'],
  ['transform', '3.6 Transformations-Spells']
];
P('### Übersicht');
P('');
P('| Spell | Rezept | Delivery | Zielmodus | Kurzbeschreibung |');
P('|---|---|---|---|---|');
for (const [key] of sections) for (const id of groups[key]) {
  const def = SPELL_DEFINITIONS[id];
  P(`| **${def.name}** | ${recipesFor(id).map(recipeLabel).join(' / ')} | \`${def.deliveryType}\` | \`${def.targetingMode}\` | ${def.desc} |`);
}
P('');
for (const [key, title] of sections) {
  P(`### ${title}`);
  P('');
  for (const id of groups[key]) P(spellBlock(id));
}

P('## 4. Kombinationsmatrix');
P('');
P('Zwei-Runen-Kombinationen der 10 Basisrunen (symmetrisch, Diagonale = doppelte Rune). **— = noch frei** (kein Rezept → Designraum für neue Spells).');
P('');
P(`| | ${BASE.map((id) => runeById[id].icon + ' ' + runeById[id].name).join(' | ')} |`);
P(`|---|${BASE.map(() => '---').join('|')}|`);
const freePairs = [];
for (const a of BASE) {
  const row = BASE.map((b) => {
    const key = [a, b].sort().join('+');
    const spell = SPELL_RECIPES[key];
    if (!spell && BASE.indexOf(b) >= BASE.indexOf(a)) freePairs.push([a, b]);
    return spell ? SPELL_DEFINITIONS[spell].name : '—';
  });
  P(`| **${runeById[a].icon} ${runeById[a].name}** | ${row.join(' | ')} |`);
}
P('');
P(`**Freie Zwei-Runen-Kombinationen (${freePairs.length}):** ${freePairs.map(([a, b]) => `${runeById[a].name}+${runeById[b].name}`).join(', ')}`);
P('');
P('### Drei-Runen-Rezepte');
P('');
P('| Rezept | Spell |');
P('|---|---|');
for (const [key, spell] of Object.entries(SPELL_RECIPES)) {
  const parts = key.split('+');
  if (parts.length === 3) P(`| ${recipeLabel(parts)} | **${SPELL_DEFINITIONS[spell].name}**${key === 'bestia+ignis+ventus' ? ' (als „INFERNO DRAGON INVOCATION“)' : ''} |`);
}
P('');
P('Hinweis: `DRAGON INVOCATION` hat zwei Rezepte (Bestia+Ignis+Ventus und Fulgur+Ignis+Terra). Von den 220 möglichen Drei-Runen-Kombinationen der Basisrunen (mit Wiederholung) sind nur wenige belegt.');
P('');

P('## 5. Transformationen & Form-Techniken');
P('');
P('Transformationen geben kein zusätzliches Rune-Deck; ihre Techniken liegen auf **Heavy-Charge + Richtung** (kurz = antippen/kurz laden, voll = 1,2 s laden). Fokus-Transformation verbraucht die Focus-Leiste (1,5/s, Unity-Wert).');
P('');
P('| Form | Quelle | Forward kurz / voll | Up kurz / voll | Down kurz / voll | Sprint + Angriff |');
P('|---|---|---|---|---|---|');
P('| **Ninefold Beast** (Fuchsgeist, 9 Flammenschweife) | Rezept Bestia+Ignis+Void (Manifest-Buff, eigener Timer) | Beast Pulse / Beast Bomb | Chakra Uppercut / Twin Beast Ascension | Tail Sweep / Tailed Beast Slam | Beast Pounce (springende Chakra-Klaue) |');
P('| **Eidolon Guardian** (Astralkrieger) | Rezept Bestia+Terra+Void (Manifest-Buff) | Spectral Arrow / Astral Siege Arrow (Bogen) | Rising Blade / Heaven Splitter | Titan Stomp / Titan\'s Judgment | Colossus Breaker (Astralfaust) |');
P('| **Focus Ascendant** | Focus 100 % → T / Tippen auf den Wizard (ohne Primal) | Radiant Wave / Annihilation Beam | Ascending Strike / Heaven Pillar | Light Nova / Starfall Crash | Radiant Lunge (goldener Durchstoß) |');
P('| **Primal Bond** (Wolf / Schildkröte) | Focus 100 % → T mit Primal in der Nähe | — (Buff-Form: Tempo bzw. Panzerung) | — | — | Primal Pounce / Shell Rush |');
P('');
P('Transformations-Spells (Spezial, 0 Mana): ANNIHILATION BEAM (über Focus Ascendant Forward voll). VOID IMPLOSION und INFERNO RAMPAGE sind definiert, aber aktuell ohne Zugang.');
P('');

P('## 6. Glossar: Delivery, Zielmodi, Tags');
P('');
P('**Delivery-Klassen** (mechanische Klasse, unabhängig vom Look — jede Klasse hat einen gemeinsamen Controller):');
P('');
const deliveryUse = {};
for (const [id, def] of Object.entries(SPELL_DEFINITIONS)) (deliveryUse[def.deliveryType] ??= []).push(def.name);
P('| Delivery | Spells |');
P('|---|---|');
for (const d of Object.values(DELIVERY)) P(`| \`${d}\` | ${(deliveryUse[d] ?? ['— (noch ungenutzt)']).join(', ')} |`);
P('');
P('**Zielmodi** (gleiche Regeln für Touch, Maus/Tastatur, Gamepad):');
P('');
P('| Modus | Bedienung |');
P('|---|---|');
const howByMode = {};
for (const id of Object.keys(SPELL_DEFINITIONS)) { const def = SPELL_DEFINITIONS[id]; howByMode[def.targetingMode] ??= spellHowTo(id).targeting; }
for (const mode of Object.values(TARGETING)) P(`| \`${mode}\` | ${howByMode[mode] ?? '—'} |`);
P('');
P('**Interaktions-Tags:** `reflectable` (Parry/Spiegel wirft zurück), `capturable` (Mirror Ward fängt), `blockable` (Block reduziert), `clashable` (Beam Clash: zwei Beams treffen sich Spitze an Spitze, Mashen entscheidet), `beamDamageable` (kann von Beams zerstört werden, z. B. Meteor).');
P('');
P('**Weitere Systeme, mit denen Spells interagieren:** Bodeneffekte (Eis, Feuer, Lava, Pfützen, Krater — Umgebungsschicht), Himmelsfelder verstärken/schwächen ganze Elemente (Sonne: Feuer/Licht +, Eis/Schatten −; Mond: Wasser/Eis/Schatten +, Feuer −; Eclipse; Thunderhead; Blood Moon; Starfall; Aurora), Schatten (Shadow Stomper hält Schatten fest), Steinwände (Kollision für alle), Gräber/Seelen (Revenant Call), Mounts (reitbare Beschwörungen).');
P('');

P('## 7. Statistik');
P('');
const counts = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]));
P(`- Runen: ${runes.length} (davon 10 Basis, 2 Solo-Spezial, 3 Transformation)`);
P(`- Spells: ${Object.keys(SPELL_DEFINITIONS).length} — Fundamental ${counts.t1}, Solo ${counts.solo}, Compound ${counts.t2}, Himmelsfelder ${counts.sky}, Advanced ${counts.t3}, Transformation ${counts.transform}`);
P(`- Rezepte: ${Object.keys(SPELL_RECIPES).length} · freie Zwei-Runen-Paare: ${freePairs.length} von 55`);
P('');

P('## 8. Hinweise für den Research-Agenten');
P('');
P('**Kontext:** GRIMGE ist ein 2,5D-Fantasy-Brawler (Little-Fighter-artige Tiefe, Lane-/Burgen-Modus „Castle Siege“, Training, Arena, Dungeon). Spells entstehen durch gezeichnete Runen + Fusion. Es gibt Nahkampf, Transformationen, Primals (Begleiter) und Waffen.');
P('');
P('**Regeln für neue Spells:**');
P('- Eigene, originale Namen und Looks (keine geschützten Namen aus anderen Spielen/Animes übernehmen; Inspiration ja, Kopie nein).');
P('- Jede Idee einer **bestehenden Delivery-Klasse** zuordnen (oder begründet eine neue vorschlagen) und einen **Zielmodus** wählen.');
P('- Ein **Rezept** angeben — bevorzugt eines der freien Paare aus Abschnitt 4 bzw. eine freie Drei-Runen-Kombination; Element-Logik der Runen respektieren (Ignis Feuer, Ventus Wind, Fulgur Blitz, Terra Erde, Aqua Frost/Wasser, Bestia Tier, Konstrukt Bau/Mechanik, Void Leere/Gravitation, Lux Licht, Umbra Schatten).');
P('- Interaktionen nennen: Tags, Wechselwirkung mit Bodeneffekten, Himmelsfeldern, Beam Clash, Wänden, Mounts.');
P('- 2,5D bedenken: Lane-Tiefe (z), Höhe (Launcher, Luftziele), Reichweiten in px (Bühne 1024 × 576, Held ≈ 88 px hoch).');
P('- Visualisierung beschreiben (Formen, Farben, Bewegung, Partikel) — im Stil der Spalte „Visualisierung“.');
P('');
P('**Vorlage pro Vorschlag:**');
P('```');
P('Name:            (original)');
P('Rezept:          RUNE + RUNE (+ RUNE)        # bevorzugt freies Paar');
P('Tier / Mana:     2 / Summe der Runen');
P('Delivery:        projectile | salvo | homing | beam | cone | burrow | area | zone | wall | telekinesis | capture | slam | stomp | summon | dash | heavy_object | self');
P('Zielmodus:       direction | ground | placement | ally | aim | dual | self');
P('Tags:            reflectable, capturable, blockable, clashable, beamDamageable');
P('Wirkung:         (Mechanik, Zahlen grob: Schaden, Radius, Dauer)');
P('Visualisierung:  (was man sieht)');
P('Interaktionen:   (Boden, Himmel, Clash, Wände, Elemente)');
P('Inspiration:     (Spiel/Anime + was übernommen wird — nur als Idee)');
P('```');
P('');
fs.writeFileSync(path.join(docsDir, 'GRIMGE_Runes_Spells_Catalog.md'), out.join('\n'));
console.log('written', out.length, 'lines; free pairs', freePairs.length, '; vfx entries', Object.keys(VFX).length);
