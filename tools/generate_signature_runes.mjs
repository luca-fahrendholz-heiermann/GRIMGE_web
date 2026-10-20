// Generates public/src/signature_runes_data.js from
// docs/GRIMGE_Spezialrunen_Research_Designatlas_V1.md (S01–S36).
//
// SIGNATURE SPECIALS are special runes — NOT Arcane States / buff
// transformations. Like every special rune they need no combination but
// have their own, more complex multi-stroke glyph (rune_guides.js): drawing
// takes longer, the spell is complete on its own. Each may be in a deck once
// (several different ones are fine); not every one is overwhelming — some
// are simply fan-made spells adapted from other games. The atlas texts
// (identity, the four animation phases, arena effect, synergies,
// counterplay) are carried over verbatim; the hand table adds what the game
// needs: targeting mode, bound mana (atlas: 28–46), palette and a short
// English how-to line for the grimoire.
//
// Usage: node tools/generate_signature_runes.mjs   (from the project root)
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? process.cwd();
const src = fs.readFileSync(path.join(root, 'docs', 'GRIMGE_Spezialrunen_Research_Designatlas_V1.md'), 'utf8').replace(/\r\n/g, '\n');

// id: [targeting, mana, (atlas cooldown suggestion, unused), palette dark · body · accent · spark, how-to]
const TABLE = {
  S01: ['self', 44, 26, ['#24122e', '#5d3a78', '#e9dcff', '#b98cff'], 'You rise ~0.7 hero heights after a 0.7 s wind-up and hover for 9 s on six gravity floes (slower, ground hazards pass beneath you). Your charged heavies become six hover techniques: FORWARD needles / homing floes, UP repulsion / sky clamp, DOWN ground stamp / compression ring. Guard raises a segmented floe shield. Not invulnerable.'],
  S02: ['self', 34, 20, ['#3a0c14', '#9b1b30', '#ffd6dc', '#ffffff'], 'Six garnet lenses orbit at shoulder height for 8 s. Every second melee hit charges one; a normal attack fires one fast bolt per charged lens, a heavy releases up to two homing crystals.'],
  S03: ['ground', 32, 18, ['#1a1f4a', '#3b4aa0', '#e08a4a', '#ffd2a8'], 'A hexagonal warning mark (0.65 s), then a heavy star anchor drops: light enemies are pulled toward it by distance and tipped outward. Bosses and towers stand firm; the anchor can be broken before it lands.'],
  S04: ['self', 36, 22, ['#24363a', '#5f8a8c', '#e7c66a', '#fff1c4'], 'You lift a few pixels for 7 s behind two hovering armour floes: shots from the front break on them (each floe takes 4), frontal hits deal half damage. Flanks and back stay open; you glide slowly.'],
  S05: ['direction', 30, 16, ['#0f1c3d', '#24427a', '#b8d4ff', '#e5603a'], 'You leap high, fly a short diagonal comet arc dropping three shards, then dive onto the shown landing circle: three staggered cracks hit around it.'],
  S06: ['dual', 28, 15, ['#cfd6dc', '#e8edf2', '#7fb2ff', '#ffffff'], 'Set two air anchors: a taut seam spans between them. Crossing it gives a controlled push along the seam (enemies too), your projectiles bend along it. Tears after two crossings; anchors are breakable.'],
  S07: ['self', 32, 18, ['#3a3b40', '#9a9ca6', '#d8b45a', '#f4f4f8'], 'For 6 s your first two normal attacks are archived: each replays a moment later at the same spot as a brighter magic echo with half damage (no self-trigger).'],
  S08: ['ground', 30, 16, ['#1f3446', '#6f9ab5', '#eef2f4', '#ffe0a8'], 'An open seal records where enemies stand during 1.5 s; then narrow pillars strike exactly those recorded spots one after another — not where they are now.'],
  S09: ['ground', 36, 22, ['#2a2622', '#e6e2da', '#6a4a2a', '#ffffff'], 'After 0.8 s a hexagonal dome closes for 4 s: projectiles inside crawl, enemies inside attack and move slowly. Afterwards your projectiles fly on, enemy ones dissolve. Bosses resist.'],
  S10: ['self', 28, 16, ['#2c3a2a', '#cfe0c0', '#f4f7ea', '#8fe0a0'], 'A needle marks your position. Fight freely for 5 s; when it ends — or when you tap DEFENSE twice — you snap back to the needle (health, mana and timers stay as they are). Not while stunned or grabbed.'],
  S11: ['aim', 30, 16, ['#2e2a3a', '#7e7598', '#e4defa', '#bfa8ff'], 'Mark a spot beside you: a glassy afterimage of your stance stands there. Your next two melee hits are repeated from that spot a moment later (reduced damage). No health, no AI.'],
  S12: ['aim', 32, 18, ['#3a1e26', '#a8606e', '#6fb8ff', '#ffd6de'], 'Thread a single enemy: your next hit pins a needle to it, the next two hits charge it, then a follow-up thrust runs along your last attack. If the enemy blocks, the needle falls off.'],
  S13: ['ground', 38, 22, ['#163a2c', '#2f8a63', '#e59a86', '#d6ffe8'], 'Seven crack cores open and three crystal blossoms grow (max. three per player). Hitting a blossom sprays splinters in the direction of the hit; they can be destroyed and wither after 10 s.'],
  S14: ['placement', 34, 20, ['#1c1c20', '#45464e', '#f2c64a', '#c8ccd6'], 'Swipe a short line: four basalt plates rise as a walkway for 9 s. Allies move faster on it, enemies stumble the first time they cross. Heavy blows break single plates. It never blocks the lane.'],
  S15: ['placement', 32, 18, ['#1c3a5a', '#5f9ad6', '#e6eef6', '#ffffff'], 'Swipe a flow line: a water channel rolls along it for 7 s, pushing projectiles and light minions downstream and speeding you up when you run with the current. One per player.'],
  S16: ['ground', 34, 20, ['#2a1410', '#9a3a26', '#d0884a', '#ffd27a'], 'Ram in a pressure pump. Your fire (or lava under it) loads heat; water on a hot core blasts a steam roller sideways; the third trigger bursts it. Enemies can break it first.'],
  S17: ['dual', 34, 20, ['#2a2a3a', '#a89a6a', '#8a7aff', '#f4e6b8'], 'Two points span a curved space fold: narrow projectiles of both sides glance off it at a fixed angle, beams lose part of their power. Collapses after four interactions.'],
  S18: ['ground', 32, 18, ['#14262a', '#d8eef6', '#3fbf9a', '#ffffff'], 'The ground turns into a mirror mosaic for 8 s. Your impacts on it charge tiles; enemy projectiles over a charged tile throw a short reflected fragment beam back. Spent tiles go dark.'],
  S19: ['ground', 40, 24, ['#2a1408', '#c8742a', '#ffd27a', '#fff6d8'], 'Place a three-armed prism. When one of YOUR beams hits it, the beam splits into two weaker, angled branches with shorter reach. Enemy beams wear it down; spent after 3 s of beam.'],
  S20: ['self', 30, 18, ['#3a2a14', '#a8803a', '#5fe6f0', '#fff4e0'], 'Two V-clamps open in front of your hands: the next enemy projectile that hits you from the front is caught. Your next attack fires it back as a slower spinning crystal salvo (4 s window).'],
  S21: ['self', 34, 20, ['#1a1c24', '#3a3e4c', '#d8c8ff', '#ffffff'], 'Four launch windows open for 7 s. Your first hit marks a priority target; every further hit launches one homing needle at it (max. four, 0.4 s apart). Walls break the lock.'],
  S22: ['dual', 30, 16, ['#0f1f4a', '#2a4ab0', '#f2c64a', '#e6ecff'], 'Two portal edges for projectiles only: your shots entering edge A leave edge B in its direction; enemy shots glance off. Closes after three of your shots; breakable.'],
  S23: ['ground', 34, 20, ['#3a1a10', '#b0482a', '#3fe0c8', '#f6e6c8'], 'A magnetic rotor tower bends light metallic projectiles (arrows, bolts) to the side you cast from; flames and void stay unaffected. Overloads after six deflections; breakable.'],
  S24: ['placement', 30, 16, ['#14143a', '#2a2a6e', '#7fffc0', '#d8b45a'], 'Swipe a narrow corridor: for 6 s enemies crossing it are lifted briefly (not held), your projectiles passing it fly longer.'],
  S25: ['self', 36, 22, ['#2a0a10', '#7a1a26', '#f6ead2', '#ffd27a'], 'Three ornate splinter blades orbit you for 7 s. Melee hits charge them; your next heavy sends every charged blade at the target. Uncharged blades shield you from small projectiles (three blocks).'],
  S26: ['aim', 30, 16, ['#1e2024', '#4a4e56', '#6fb0e0', '#e0f0ff'], 'Light threads bind a crate, wall segment, small summon or minion near the aimed spot for 4 s: you drag it toward you and can bowl enemies over with it. Heroes only get a short push. Breaks when you are hit.'],
  S27: ['self', 36, 22, ['#2a2214', '#9a8050', '#3fe08a', '#e6ffe8'], 'A floating forge grip marks your next own wall segment or a crate in reach (8 s): it becomes a tool — wall piece = break lance, bulwark = shield, crate = throwing block. Your next heavy uses it up. Fails visibly without an object.'],
  S28: ['self', 30, 16, ['#3a2810', '#e0a85a', '#fff2d0', '#ffffff'], 'A flat projection plate with an eye mark follows your weapon hand for 5 s. After two successful actions it copies your last attack vector once as a weak thrust, then burns out.'],
  S29: ['ground', 42, 26, ['#24282c', '#4e565e', '#3fe08a', '#b07aff'], 'Building plates rise into a shoulder: three arm segments and a huge fist. After a clear 0.7 s wind-up it punches horizontally, throws enemies back and smashes props. Enemy beams can break the fist.'],
  S30: ['ground', 28, 14, ['#0f3a3a', '#1f7a7a', '#d0a050', '#e6fff8'], 'Throw a bell core: three ringing waves mark enemy summons for 8 s — your own beasts and golems hunt the marked ones first. The bell can be destroyed.'],
  S31: ['ground', 36, 22, ['#1a2240', '#e6dcc0', '#2a4ae0', '#ffffff'], 'Four tablets frame a rule zone for 8 s: the first projectiles of each team that enter it are slowed and turned aside (two per team). Team-neutral; tablets are breakable.'],
  S32: ['placement', 30, 16, ['#0f1838', '#1f2e6e', '#f2e6c8', '#ff4a4a'], 'Swipe a narrow corridor: for 6 s enemies entering it are hampered (much slower dodging) for under a second. Guarding or jumping frees them.'],
  S33: ['ground', 34, 20, ['#2a2a10', '#9a8a3a', '#d8b45a', '#a8ff7a'], 'A seed seal opens under you: your hits within its reach charge up to three seeds. At three — or when it runs out — three ground lances burst at its rim and throw enemies back.'],
  S34: ['self', 30, 16, ['#2a2410', '#b09a5a', '#4aa0ff', '#ffe8b0'], 'Scales appear over your weapon hand: your next projectile pauses for a heartbeat. GUARD in that moment melts it into a frontal shard shield; otherwise it flies normally.'],
  S35: ['placement', 34, 20, ['#2a2626', '#e6e0d8', '#e03a3a', '#fff4f0'], 'Swipe a line: three resonance plates stand along it. Hitting a plate (melee, shockwave, projectile) sends a sound pulse to the next plate, damaging enemies between — up to three relays.'],
  S36: ['placement', 36, 22, ['#0a0a0c', '#26262c', '#3fe08a', '#d6ffe8'], 'Swipe a curved line: a rift wave rolls along it. For 7 s each side acts once on everyone crossing: enemies are shoved through, projectiles are bent sideways, crates tip over. One per player.']
};

const field = (block, label) => {
  const m = block.match(new RegExp(`\\*\\*${label}[^*]*\\*\\*\\s*([^\\n]+)`));
  return m ? m[1].trim() : '';
};
const sections = src.split(/\n### (S\d\d): /).slice(1);
const runes = [];
let group = '';
for (let i = 0; i < sections.length; i += 2) {
  const id = sections[i]; const body = sections[i + 1];
  const name = body.split('\n')[0].trim();
  const block = body.split(/\n## [A-F] · |\n# \d/)[0];
  const before = src.slice(0, src.indexOf(`### ${id}:`));
  const g = [...before.matchAll(/\n## ([A-F]) · ([^\n]+)/g)].pop(); group = g ? `${g[1]} · ${g[2].trim()}` : group;
  const sys = field(block, 'Systemtyp:');
  const dur = field(block, 'Dauer / Zeitfenster:');
  const [targeting, mana, cooldown, palette, howTo] = TABLE[id];
  runes.push({
    id, name, group, systemType: sys.split('·')[0].trim(), duration: /(\d+)\s*s/.test(dur) ? Number(dur.match(/(\d+)\s*s/)[1]) : null,
    targeting, mana, palette, howTo,
    roles: field(block, 'Klassen mit besonders interessanten Builds:'),
    inspiration: field(block, 'Mechanische Inspiration, keine Kopiervorlage:'),
    identity: field(block, 'Visuelle GRIMGE-Identität:'),
    anim: [1, 2, 3, 4].map((n) => field(block, `Animation ${n} \\|`).replace(/^[^:]*:\s*/, '')),
    arena: field(block, 'Auswirkung auf Arena, Objekte oder Topologie:'),
    synergy: field(block, 'Synergien mit vorhandenen GRIMGE-Spells:'),
    counterplay: field(block, 'Counterplay / PvP-Balance:'),
    contract: field(block, 'Technischer VFX-/Combat-Vertrag:')
  });
}
if (runes.length !== 36 || runes.some((r) => !r.anim[2] || !r.identity)) throw new Error('atlas parse: ' + runes.length);

// ── Extra signature specials from the user's design rules (18 Oct 2026):
// own sprite / object identity, arena geometry, breathing stances. Not in the atlas.
const X = (id, name, systemType, targeting, mana, palette, duration, howTo, identity, anim, arena) => ({
  id, name, group: 'G · Objekte, Geometrie und Atemtechniken (Designregeln 18.10.2026)', systemType, duration, targeting, mana, palette, howTo,
  roles: '', inspiration: '', identity, anim, arena, synergy: '', counterplay: '', contract: ''
});
runes.push(
  X('S37', 'Eiszacken', 'Objekt · Bodenkontrolle', 'direction', 34, ['#10283a', '#5fc8ff', '#e9fbff', '#ffffff'], 3,
    'A row of ice spikes bursts out of the ground ahead, one after another (like a frost mage\'s ice line): each spike hits, launches and freezes briefly; they stay as obstacles for 3 s and you can stand on them.',
    'Klare, gezackte Eisspitzen mit weißen Kanten — ein eigenes Objekt, keine Säule.',
    ['Frostrisse laufen vom Fuß nach vorn.', 'Die Zacken brechen nacheinander aus, jeder höher als der vorige.', 'Getroffene frieren kurz ein; die Zacken stehen als Hindernisse.', 'Nach 3 s zerspringen sie in Splitter.'],
    'Temporäre Geometrie: jeder Zacken ist eine betretbare Plattform.'),
  X('S38', 'Schachtwuchs', 'Arena · Plattformen', 'ground', 38, ['#2a2218', '#8c7a5e', '#efe0bd', '#ffd27a'], 8,
    'Three stone shafts grow at the target point like steps (low, middle, high): a shaft rising under a foe hits and launches it, a Wizard standing on the spot is carried up. They stay 8 s as platforms.',
    'Gestufte Steinschächte mit Wachstumsringen und goldenen Fugen.',
    ['Der Boden reißt in drei Feldern auf.', 'Die Schächte wachsen gestaffelt hoch.', 'Oben kann man stehen, springen, Deckung suchen.', 'Am Ende sinken sie zurück.'],
    'Echte Höhenstufen: Mobilität, Deckung, Hochdrücken von Gegnern.'),
  X('S39', 'Tidenbohrer', 'Buff · Rotationspanzer', 'self', 40, ['#0b2440', '#3fa2ff', '#d6f0ff', '#8ff7ff'], 6,
    'A spinning shell of water closes around you for 6 s: it takes a third of every hit, and its four nozzles hammer water jets at nearby foes while it turns. Heavy attacks fire all four jets at once.',
    'Eine rotierende Wasserhülle mit vier Düsen — der Körper selbst wird zum Angriffsmodul.',
    ['Wasser zieht sich spiralförmig um den Körper.', 'Die Hülle dreht sich, vier Düsen leuchten.', 'Strahlen hämmern abwechselnd in alle Richtungen.', 'Die Hülle platzt zu Gischt auf.'],
    'Strahlen schieben Gegner weg und unterbrechen Angriffe.'),
  X('S40', 'Wasseratmung', 'Atemtechnik · Kampfstil', 'self', 32, ['#0a2a4a', '#2f8fff', '#cfe9ff', '#ffffff'], 15,
    'Water breathing for 15 s: every melee swing draws a flowing water arc, combo finishers send a water wave forward and charged attacks cut a wave across the lane.',
    'Fließende Wasserbögen mit Gischtkanten folgen jeder Klinge.',
    ['Ein tiefer Atemzug, Wasser steigt um die Klinge.', 'Jeder Schlag hinterlässt einen fließenden Bogen.', 'Der Finisher sendet eine Welle.', 'Die Atmung verebbt in Tropfen.'],
    'Wellen schieben Gegner weg.'),
  X('S41', 'Flammenatmung', 'Atemtechnik · Kampfstil', 'self', 34, ['#3a0e04', '#ff5a1f', '#ffd27a', '#fff1c2'], 15,
    'Flame breathing for 15 s: every melee swing leaves a fire arc, hits burn, combo finishers end in a rising flame wheel and charged attacks breathe a burst of fire.',
    'Lodernde Feuerbögen und Glut folgen jeder Klinge.',
    ['Glut steigt aus dem Atem.', 'Feuerbögen folgen jedem Schlag.', 'Der Finisher endet im Flammenrad.', 'Die Glut verlischt.'],
    'Brennender Boden unter dem Finisher.'),
  X('S42', 'Donneratmung', 'Atemtechnik · Kampfstil', 'self', 34, ['#1a1a08', '#ffe03d', '#fff6b0', '#ffffff'], 15,
    'Thunder breathing for 15 s: swings flash as lightning lines, the sprint attack becomes a lightning dash through everyone in line, and charged attacks drop a thunderbolt on the nearest foe.',
    'Gelbe Zickzack-Blitze und Funken folgen jeder Bewegung.',
    ['Funken knistern um die Füße.', 'Schläge blitzen als Linien.', 'Der Sprint wird zum Blitzschritt.', 'Die Ladung entlädt sich.'],
    'Blitzschritt durch Gegnerreihen.'),
  X('S43', 'Sanktuarium', 'Objekt · Heilzone', 'ground', 36, ['#1e2a1a', '#9be36a', '#fff8d6', '#ffffff'], 10,
    'A sanctuary obelisk rises at the target point inside a magic circle: allies standing in the circle heal and shake off slows for 10 s. Foes can smash the obelisk.',
    'Ein heller Obelisk mit grünem Kristall über einem rotierenden Runenkreis.',
    ['Der Kreis zeichnet sich in den Boden.', 'Der Obelisk wächst in der Mitte empor.', 'Lichtpartikel steigen über Verbündeten auf.', 'Der Obelisk zerfällt zu Staub.'],
    'Ein zerstörbares Objekt, das einen Ort auf dem Feld zum Rückzugspunkt macht.'),
  X('S44', 'Kriegsbanner', 'Objekt · Buffzone', 'ground', 32, ['#2a1010', '#e53935', '#ffd27a', '#fff1c2'], 10,
    'A war banner is planted at the target point: allies near it strike harder (+20 % melee damage) and move faster for 10 s. Foes can tear the banner down.',
    'Ein rotes Banner mit goldenem Saum an einem Speerschaft, das im Wind flattert.',
    ['Der Schaft fährt in den Boden.', 'Das Tuch entrollt sich.', 'Ein goldener Ring markiert die Zone.', 'Das Banner sinkt.'],
    'Ein zerstörbares Objekt, um das sich Kämpfe drehen.'),
  // Two-stage spells (slot stays after the first cast; tap again for stage 2) and counter charges.
  X('S45', 'Blitzmarke', 'Zweistufig · Teleport', 'direction', 30, ['#1a1a1a', '#cfd8dc', '#ffd54f', '#ffe082'], 5,
    'Stage 1: throw a marked kunai — it sticks in the first foe it hits, otherwise in the ground. Stage 2 (tap the slot again within 5 s): teleport to the mark; in a foe you appear behind it and strike.',
    'Dunkler Kunai mit Ring und flatterndem gelbem Siegel-Zettel; Teleport mit Nachbild und Lichtblitz.',
    ['Der Kunai fliegt mit Siegel-Zettel.', 'Er steckt im Gegner oder im Boden, ein Ring pulsiert.', 'Zweiter Tipp: Nachbild bleibt zurück, Blitz an der Marke.', 'Schlag aus dem Rücken.'],
    'Positionsspiel: Fluchtpunkt oder Angriff aus dem Rücken.'),
  X('S46', 'Spiralkugel', 'Zweistufig · Launcher', 'direction', 38, ['#0d47a1', '#2196f3', '#9be7ff', '#ffffff'], 3,
    'Stage 1: rush forward with a spinning energy ball — the impact launches the foe high. Stage 2 (tap again within 2.5 s): teleport above it and slam it into the ground with an explosion.',
    'Eine wirbelnde blaue Energiekugel mit weißen Spiralbahnen in der Hand.',
    ['Die Kugel wirbelt in der Hand auf.', 'Ansturm, Einschlag, der Gegner fliegt hoch.', 'Zweiter Tipp: Teleport über den Gegner.', 'Sturz mit der Kugel in den Boden, Explosionsring.'],
    'Kombo-Werkzeug: Launcher plus Abschluss nach Wahl.'),
  X('S47', 'Bannfalle', 'Zweistufig · Falle', 'ground', 28, ['#3e2723', '#d84315', '#f6e7b8', '#fff3c4'], 20,
    'Stage 1: lay a seal trap at the target point — it is always armed and goes off when a foe steps on it. Stage 2 (tap again within 6 s): detonate it yourself with a bigger blast. After the window it stays armed but can only be set off by contact.',
    'Ein Papiersiegel mit rotem Zeichen in einem doppelten Bannkreis.',
    ['Der Bannkreis zeichnet sich, das Siegel liegt.', 'Der Kreis pulsiert schnell, solange man selbst zünden kann.', 'Danach pulsiert er langsam (nur noch Berührung).', 'Explosion mit fliegenden Siegelfetzen.'],
    'Fallenstellen mit Timing-Kontrolle.'),
  X('S48', 'Schattenkonter', 'Haltung · Konter-Ladungen', 'self', 34, ['#1a0f33', '#4527a0', '#b39ddb', '#ede7f6'], 12,
    'Three counter charges for 12 s: each hit you take is negated — you vanish and reappear behind the attacker with a counter strike (without a known attacker: a sidestep).',
    'Drei dunkle Schattenkugeln kreisen um den Körper; beim Konter bleibt ein Schattenschleier zurück.',
    ['Drei Schattenkugeln erscheinen.', 'Ein Treffer: Schleier, der Körper verschwindet.', 'Er erscheint hinter dem Angreifer.', 'Konterschlag, eine Kugel weniger.'],
    'Bestraft unüberlegte Angriffe.'),
  X('S49', 'Flutstrahl', 'Zweistufig · Wasser → Eis', 'direction', 30, ['#0b3d73', '#1f7fd1', '#d6f6ff', '#e3faff'], 5,
    'Stage 1: a pressure jet of water pushes foes back, soaks them and leaves puddles. Stage 2 (tap again within 5 s): everything soaked freezes solid and the puddles turn to ice.',
    'Ein satter, mehrlagiger Wasserstrahl mit Schaumspitze; durchnässte Gegner tropfen, beim Einfrieren umschließt sie ein Eisblock.',
    ['Der Strahl schießt aus der Hand.', 'Gegner werden zurückgedrückt und tropfen.', 'Pfützen bleiben auf dem Boden.', 'Zweiter Tipp: alles Nasse gefriert.'],
    'Wasser- und Eisflächen verändern den Boden.')
);

const out = `// GENERATED by tools/generate_signature_runes.mjs from
// docs/GRIMGE_Spezialrunen_Research_Designatlas_V1.md — do not edit by hand.
// ${runes.length} SIGNATURE SPECIAL runes (S01–S36 atlas + S37–S42 design rules): own rune category, not Arcane States.
export const SIGNATURE_RUNE_DATA = Object.freeze(${JSON.stringify(runes, null, 1)});
`;
fs.writeFileSync(path.join(root, 'public', 'src', 'signature_runes_data.js'), out);
console.log(`${runes.length} signature runes → public/src/signature_runes_data.js (${Math.round(out.length / 1024)} KB)`);
