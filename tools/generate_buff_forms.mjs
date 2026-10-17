// Generates public/src/buff_forms_data.js from the Transformations-Atlas
// (docs/GRIMGE_Transformations_Atlas_V3_1_Sonnenwyrm.md).
//
// Usage: node tools/generate_buff_forms.mjs   (from the project root)
//
// Every form becomes plain data: palette, material, silhouette, the VFX
// archetype of its manifestation and all techniques (sprint, sprint+heavy,
// forward/up/down × short/full, defense, grab, jump) with the gameplay text
// and a mechanic derived from it. OVERRIDES at the bottom correct the
// keyword classification where the text is ambiguous.
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? process.cwd();
const src = path.join(root, 'docs', 'GRIMGE_Transformations_Atlas_V3_1_Sonnenwyrm.md');
const text = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
const end = text.indexOf('\n## 3. Produktionsarchitektur');
const body = end > 0 ? text.slice(0, end) : text;
const blocks = body.split(/\n## (?=[BT]\d\d: )/).slice(1);

const clean = (s) => (s ?? '').replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const field = (block, label) => clean((block.match(new RegExp(`\\*\\*${label}[^*]*\\*\\*\\s*([^\\n]*?)(?=\\s*\\*\\*[A-ZÄÖÜ][^*]{2,40}:\\*\\*|\\n|$)`)) ?? [])[1]);
const sentence = (s) => { const t = clean(s).replace(/\.{2,}/g, '.'); const m = t.match(/^(.+?[.!])(\s|$)/); return m ? m[1] : t; };

function sections(block) {
  const out = {};
  const re = /\n### \S+ (Sprint \+ Heavy|Sprint|Forward \+ Heavy|Up \+ Heavy|Down \+ Heavy|Defense|Grab|Jump): ([^\n]*)\n([\s\S]*?)(?=\n### |\n---|$)/g;
  let m;
  while ((m = re.exec(block))) out[m[1]] = { title: clean(m[2]), body: m[3] };
  return out;
}

const splitNames = (title) => {
  const m = title.match(/^(.*?)\s*\(Short\)\s*\/\s*(.*?)\s*\(Full\)/);
  return m ? [clean(m[1]), clean(m[2])] : [title, title];
};

// ── Mechanics from the gameplay sentences ───────────────────────────────
const has = (s, re) => re.test(s.toLowerCase());
function statusOf(s) {
  const st = [];
  if (has(s, /frost|eis|friert|kälte|gefrier|stillstand|vereist/)) st.push('freeze');
  if (has(s, /verlangsam|slow|träg|zeitlupe|bremst|dämpf/)) st.push('slow');
  if (has(s, /brenn|glut|brand|lodern|verbrenn|schlacke|lava|magma/)) st.push('burn');
  if (has(s, /stagger|betäub|stun|taumel|blend/)) st.push('stun');
  if (has(s, /fessel|bindet|root|hält fest|festsetz|fixier|verankert|klammert|anker/)) st.push('root');
  if (has(s, /heil|regener|lebens/)) st.push('heal');
  if (has(s, /schild|barriere|schutz|panzerung|deckung|absorb/)) st.push('shield');
  if (has(s, /zieht|sog|heranzieh|pull|zusammenzieh|saugt/)) st.push('pull');
  if (has(s, /launcher|hebt|schleudert .*hoch|in die luft|nach oben|aufwärts/)) st.push('launch');
  if (has(s, /knockdown|niederwerf|zu boden/)) st.push('knockdown');
  if (has(s, /säure|ätz|gift|korrod/)) st.push('acid');
  // Whole words only: "Positionen", "Dimension" or "Punktion" are no lightning.
  if (has(s, /blitz|elektr|(^|[^a-zäöüß])ionen?([^a-zäöüß]|$)|funke|statisch|gewitter|donner/)) st.push('shock');
  return st;
}
function kindOf(s, dir, variant) {
  const t = s.toLowerCase();
  if (/strahl|laser|lichtbahn|strom |dauerstrahl/.test(t)) return 'beam';
  if (/fliegt|geschoss|projektil|bolzen|pfeil|kugel|nadel|schießt|wirft|geworfen|kern fliegt|jagd|jagen|jagt/.test(t)) return 'projectile';
  if (/säule|turm|aufstieg|vertikal|spirale|wendel/.test(t) && dir !== 'forward') return 'pillar';
  if (/rundum|ring|um sich|radial|kreis|um den avatar|umkreis/.test(t)) return 'ring';
  if (/gestaffelt|nacheinander|folge|mehrere|serie|kette|felder|einschläge|portal/.test(t)) return 'sequence';
  if (/wand|rollt|walze|front läuft|welle läuft/.test(t)) return 'wall';
  if (/kegel|fächer|druckwelle|welle|sweep|schwung|front/.test(t)) return dir === 'down' ? 'ring' : 'cone';
  if (dir === 'up') return variant === 'short' ? 'burst' : 'pillar';
  if (dir === 'down') return variant === 'short' ? 'ring' : 'sequence';
  return variant === 'short' ? 'cone' : 'projectile';
}

// ── VFX archetype of the idle manifestation ─────────────────────────────
const NUMBER = { ein: 1, eine: 1, einzelnes: 1, einzelne: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7 };
function archetypeOf(id, sil) {
  const t = sil.toLowerCase();
  const nums = (t.match(/(^|[^a-zäöüß])(ein|eine|einzelnes|einzelne|zwei|drei|vier|fünf|sechs|sieben)(?=[^a-zäöüß]|$)/g) ?? []).map((w) => NUMBER[w.replace(/^[^a-zäöüß]/, '')]);
  const count = nums.length ? Math.max(...nums) : 3;
  if (id === 'B01') return { archetype: 'risswild', count: 3 };
  if (id === 'B02') return { archetype: 'arkengestell', count: 4 };
  if (id === 'T40') return { archetype: 'wyrm', count: 2 };
  if (/marionett/.test(t)) return { archetype: 'puppets', count };
  if (/kiefer/.test(t)) return { archetype: 'jaws', count };
  if (/rasterbögen|projektionsapparat/.test(t)) return { archetype: 'arches', count };
  if (/taille|rippenband|karussell/.test(t)) return { archetype: 'girdle', count: Math.max(4, count), item: /glocken|grabplatten/.test(t) ? 'bell' : 'rib' };
  if (/bänder|band\b|leitbänder|schattenband/.test(t)) return { archetype: 'bands', count };
  if (/lamellen|segel|finnen|paneele|schindeln|streifen/.test(t)) return { archetype: 'fins', count, item: /segel|paneele/.test(t) ? 'sail' : /schindeln|streifen/.test(t) ? 'shingle' : 'blade' };
  if (/spulen|pendel|orbit|kreisen|kreist|umkreist|prisma|bildrahmen|negativräume|glyphenplatten|samen|apparate|glocken/.test(t)) {
    const item = /spulen/.test(t) ? 'coil' : /pendelknoten/.test(t) ? 'knot' : /prisma|spiegel/.test(t) ? 'mirror' : /bildrahmen/.test(t) ? 'frame' : /negativräume/.test(t) ? 'void' : /glyphenplatten/.test(t) ? 'glyph' : /samen/.test(t) ? 'seed' : /apparate/.test(t) ? 'apparatus' : /glocken/.test(t) ? 'bell' : 'shard';
    return { archetype: 'orbit', count: /orbitkörper|samen/.test(t) ? 6 : Math.max(3, count), item };
  }
  if (/röhren|gitter|wurzel/.test(t)) return { archetype: 'girdle', count: Math.max(4, count), item: /glocken|grabplatten/.test(t) ? 'bell' : /gitter|prismenzellen/.test(t) ? 'cell' : /röhren|wurzel/.test(t) ? 'tube' : 'rib' };
  if (/träger|gestell|bügel|klammern|gelenkbügel|exoskelett|zirkel|armatur/.test(t)) return { archetype: 'frame', count, item: /klammern/.test(t) ? 'clamp' : /zirkel/.test(t) ? 'compass' : /armatur|schnür/.test(t) ? 'braid' : 'brace' };
  if (/unterarm|ellbogen|fußgelenk|gelenk|waffe|kapillar|rohre|knien|händen/.test(t)) {
    const item = /sichel|rauch/.test(t) ? 'sickle' : /noten|messer/.test(t) ? 'notes' : /kapillar/.test(t) ? 'capillary' : /falz|papier/.test(t) ? 'fold' : /rohre|kammer/.test(t) ? 'tube' : /schuppen/.test(t) ? 'scale' : /akzent|rechteckig/.test(t) ? 'accent' : /faden|spule|seil/.test(t) ? 'thread' : 'mark';
    return { archetype: 'limbs', count, item };
  }
  return { archetype: 'fins', count, item: 'blade' };
}

const hex = (s) => (s.match(/#[0-9A-Fa-f]{6}/g) ?? []).map((h) => h.toLowerCase());

// Perfect-block counter, grab throw and jump landing from the atlas text.
function counterOf(text) {
  const t = (text ?? '').toLowerCase();
  if (/schutzimpuls|schild an|verbündet/.test(t)) return 'ward';
  if (/strom/.test(t)) return 'shock';
  if (/lichtblitz|blitz aus/.test(t)) return 'flash';
  if (/reiffeld|frost/.test(t)) return 'frost';
  if (/gegenstich|iai|gegenattacke|konstruktstich|wächterkonter|konterzeichen|geist|zeichen/.test(t)) return 'riposte';
  if (/dorn|rippe|horn|klinge|steinplatte|steinspäne|giftstachel|splitter|feder|funken|kruste/.test(t)) return 'spike';
  if (/reflekt|reflex|abprall|zurück|torbogen|verschiebt/.test(t)) return 'reflect';
  if (/schwächt/.test(t)) return 'weaken';
  return 'shove';
}
function throwOf(text) {
  const t = (text ?? '').toLowerCase();
  if (/über den rücken|über die hüfte|über die schulter|über das knie|hüftdrehung/.test(t)) return 'over';
  if (/zu boden|bodenspur|beine weg|zieht ziel zu boden/.test(t)) return 'slam';
  if (/heranzieh|zieht ein nahes|zieht .* an|entgegengesetzte richtung gezogen/.test(t)) return 'pull';
  if (/seitlich|abgeschüttelt/.test(t)) return 'side';
  if (/dreh|luftkreis|kettenwurf|drehmatrix/.test(t)) return 'spin';
  if (/hebt|hebewurf|angehoben/.test(t)) return 'lift';
  return 'forward';
}
function landingOf(text) {
  const t = (text ?? '').toLowerCase();
  if (/stampf|beat|takt/.test(t)) return 'stomp';
  if (/fächer|auseinander|öffnen|aufklapp|klappen .* aus/.test(t)) return 'fan';
  if (/feder|federn/.test(t)) return 'spring';
  if (/kristall|stufen/.test(t)) return 'crystal';
  return 'dust';
}

const forms = [];
for (const block of blocks) {
  const head = block.split('\n')[0];
  const [, id, rest] = head.match(/^([BT]\d\d): (.*)$/);
  const [name, title] = rest.split('|').map((x) => clean(x));
  const sec = sections('\n' + block);
  const ref = clean((block.match(/\*\*Frühere Arbeitsreferenz:\*\*\s*([^*]*)/) ?? [])[1]).replace(/\.$/, '');
  const paletteLine = (block.match(/\*\*Palette:\*\*([^\n]*)/) ?? [])[1] ?? '';
  const material = field(block, 'Typisches Material:') || field(block, 'Materialidentität:');
  const quality = field(block, 'Qualitätsmerkmale:');
  const motion = field(block, 'Bewegungsidentität:');
  const silhouette = field(block, 'Eigenständige Silhouette nach V2:') || clean((block.match(/\*\*Körper:\*\*([^\n]*)/) ?? [])[1]);
  const avoid = field(block, 'Zu vermeiden:');
  const tech = {};
  const simple = (key, label) => { const s = sec[key]; if (!s) return null; return { name: s.title.replace(/,.*$/, '').replace(/\s*\(Defense \+ Down\)/, ''), text: sentence(field(s.body, label) || clean(s.body.split('\n').find((l) => l.trim()) ?? '')) }; };
  tech.sprint = simple('Sprint', 'Funktion:');
  tech.sprintHeavy = simple('Sprint + Heavy', 'Funktion:');
  tech.defense = simple('Defense', 'Funktion:');
  tech.grab = simple('Grab', 'Gameplay:') ?? simple('Grab', 'Auslösung:');
  tech.jump = simple('Jump', 'Spezifik:') ?? simple('Jump', 'Regel:');
  for (const [key, dir] of [['Forward + Heavy', 'forward'], ['Up + Heavy', 'up'], ['Down + Heavy', 'down']]) {
    const s = sec[key];
    if (!s) continue;
    const [shortName, fullName] = splitNames(s.title);
    const shortText = field(s.body, 'Gameplay Short:') || field(s.body, 'Short:') || '';
    const fullText = field(s.body, 'Gameplay Full:') || field(s.body, 'Full:') || '';
    const shortAction = clean((s.body.match(/Hauptaktion:\*\* Die Manifestation zeichnet ([^.]*)/) ?? [])[1]);
    const fullFormation = clean((s.body.match(/aufgebaut: ([^.]*)/) ?? [])[1]);
    tech[dir] = {
      short: { name: shortName, text: sentence(shortText), action: shortAction, kind: kindOf(`${shortText} ${shortAction}`, dir, 'short'), status: statusOf(shortText) },
      full: { name: fullName, text: sentence(fullText), action: fullFormation, kind: kindOf(fullText, dir, 'full'), status: statusOf(fullText) }
    };
  }
  const shape = archetypeOf(id, silhouette);
  if (tech.defense) { tech.defense.counter = counterOf(tech.defense.text); tech.defense.status = statusOf(tech.defense.text); }
  if (tech.grab) { tech.grab.throw = throwOf(tech.grab.text); tech.grab.status = statusOf(tech.grab.text); }
  if (tech.jump) tech.jump.landing = landingOf(tech.jump.text);
  forms.push({ id, name, title: title ?? null, ref, palette: hex(paletteLine), material, quality, motion, silhouette, avoid, ...shape, tech, statusAll: statusOf([tech.forward?.full.text, tech.up?.full.text, tech.down?.full.text, tech.defense?.text].join(' ')) });
}

// ── Manual corrections where the keywords mislead ───────────────────────
// Reviewed by hand against every gameplay sentence of the atlas (kind =
// how the technique travels / hits; status = what it does to the target;
// pierce = passes through targets).
const T = (fs, ff, us, uf, ds, df) => ({ tech: { forward: { short: fs ?? {}, full: ff ?? {} }, up: { short: us ?? {}, full: uf ?? {} }, down: { short: ds ?? {}, full: df ?? {} } } });
const OVERRIDES = {
  B01: { tech: { forward: { full: { kind: 'bomb' } }, up: { full: { kind: 'pillar' } }, down: { full: { kind: 'sequence' } } } },
  B02: { tech: { forward: { short: { kind: 'arrow' }, full: { kind: 'arrow' } }, up: { full: { kind: 'wall' } } } },
  T01: T(null, { kind: 'beam', status: ['burn'] }, null, null, { status: ['stun'] }, null),
  T02: T(null, null, { status: ['launch'] }, { kind: 'pillar', status: [] }, null, { status: ['burn'] }),
  T03: T(null, { kind: 'projectile', status: ['slow'] }, null, null, { status: ['stun'] }, null),
  T04: T({ kind: 'projectile', status: ['slow'] }, { kind: 'beam', status: ['heal'] }, null, { status: ['shield'] }, { status: ['heal'] }, null),
  T05: T(null, { kind: 'beam', status: [] }),
  T06: T(null, { status: ['shock'] }, null, { status: ['shock'] }, { status: ['stun', 'shock'] }, { status: ['launch', 'shock'] }),
  T07: T(null, null, null, null, { status: ['stun'] }, { status: ['burn'] }),
  T08: T(null, { pierce: true }, null, null, { status: ['root'] }, { status: ['root'] }),
  T09: T({ kind: 'projectile' }, { kind: 'cone' }, null, null, null, { status: ['stun'] }),
  T10: T(null, null, null, null, null, { status: ['heal'] }),
  T11: T({ status: ['slow'] }, { kind: 'cone', status: ['freeze', 'slow'] }, null, { kind: 'pillar' }, null, { status: ['slow'] }),
  T12: T(null, { kind: 'cone', status: ['stun'] }, null, null, null, { status: ['stun'] }),
  T13: T(null, { pierce: true }, null, null, null, { status: ['stun'] }),
  T14: T(null, null, null, null, { status: ['stun'] }, null),
  T15: T({ kind: 'projectile' }, { status: ['burn', 'slow'] }, { status: ['launch'] }, null, null, { status: ['slow'] }),
  T16: T({ kind: 'projectile' }),
  T17: T({ kind: 'projectile' }, { status: ['burn'] }, null, null, null, { status: ['heal', 'burn'] }),
  T18: T({ kind: 'projectile' }, { status: [], pierce: true }, null, null, null, { status: ['slow'] }),
  T19: T(null, { kind: 'beam', status: [] }),
  T20: T({ kind: 'cone' }),
  T23: T({ kind: 'cone', status: ['slow'] }, { status: [] }, null, { kind: 'pillar' }, null, { status: ['stun'] }),
  T24: T(null, { kind: 'beam', status: ['slow'] }, null, null, null, { status: ['root'] }),
  T25: T({ status: [] }, { kind: 'beam', status: ['burn'] }, { status: ['pull'] }, null, { status: ['burn'] }, { status: ['burn'] }),
  T26: T(null, { kind: 'wall' }),
  T27: T(null, { kind: 'beam', status: [] }),
  T28: T(null, null, null, null, null, { status: ['root'] }),
  T29: T({ kind: 'projectile' }, { kind: 'beam' }, null, null, null, { status: ['slow'] }),
  T30: T(null, { kind: 'wall' }, null, null, { status: ['stun'] }, null),
  T31: T(null, { kind: 'sequence' }),
  T32: T(null, { kind: 'beam', status: ['shock'] }, null, null, { status: ['stun', 'shock'] }, { status: ['shock'] }),
  T33: T({ kind: 'projectile' }, { kind: 'beam' }, null, null, null, { kind: 'ring' }),
  T34: T({ kind: 'projectile' }, { pierce: true }, { status: ['launch'] }),
  T35: T({ status: ['slow'] }),
  T36: T(null, { kind: 'beam', status: ['heal'] }, null, null, { status: ['stun'] }, null),
  T37: T({ kind: 'projectile', status: ['acid'] }, { kind: 'cone', status: ['acid', 'slow'] }, null, { status: ['acid'] }, { status: ['slow', 'acid'] }, { status: ['acid'] }),
  T38: T({ kind: 'projectile' }),
  T39: T({ kind: 'projectile' }, null, null, null, null, { status: ['slow'] }),
  T40: { tech: { forward: { short: { kind: 'beam', text: 'Schneller, geradliniger Verstärkungsimpuls (Lanzenstich).' }, full: { kind: 'wyrms', text: 'Zwei unabhängig jagende Drachen treffen mehrere Ziele entlang der Lane.' } }, up: { full: { kind: 'pillar', status: ['launch'] } }, down: { short: { status: ['burn'] }, full: { kind: 'portals', text: 'Portale um einen anvisierten Gegner, aus denen Wyrme in zeitlicher Folge einschlagen.' } },
    defense: { counter: 'spike', text: 'Drachengrat: Schuppenkamm blockt; Perfect Block stößt einen Grat aus Schuppen nach vorn.' },
    grab: { throw: 'spin', text: 'Wyrmfang: nur bestätigtes Nahziel; ein Wyrmkopf packt und schleudert es im Bogen.' },
    jump: { landing: 'fan', text: 'Himmelslauf: Wyrmbänder folgen der Sprungphase und fächern bei der Landung auf.' } } }
};
const merge = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a[k] ?? {}, v) : v; return a; };
for (const f of forms) if (OVERRIDES[f.id]) merge(f, OVERRIDES[f.id]);

const banner = `// GENERATED by tools/generate_buff_forms.mjs from
// docs/GRIMGE_Transformations_Atlas_V3_1_Sonnenwyrm.md — do not edit by hand.
// ${forms.length} special-rune buff transformations (B01, B02, T01–T40).
`;
const out = `${banner}export const BUFF_FORM_DATA = Object.freeze(${JSON.stringify(forms, null, 1)});\n`;
fs.writeFileSync(path.join(root, 'public', 'src', 'buff_forms_data.js'), out);
console.log(`${forms.length} forms → public/src/buff_forms_data.js (${Math.round(out.length / 1024)} KB)`);
const tally = (fn) => forms.reduce((m, f) => { const k = fn(f); m[k] = (m[k] ?? 0) + 1; return m; }, {});
console.log('archetypes', tally((f) => f.archetype));
console.log('kinds', tally((f) => ['forward', 'up', 'down'].map((d) => `${f.tech[d]?.short.kind}/${f.tech[d]?.full.kind}`).join(' ')));
