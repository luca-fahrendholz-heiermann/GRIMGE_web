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
    'Wasser- und Eisflächen verändern den Boden.'),
  // Anime mechanics (20 Oct 2026): mirror prison, blood cross (mashing), taunt.
  X('S50', 'Spiegelkerker', 'Mehrstufig · Eis-Gefängnis', 'direction', 40, ['#0d3b4f', '#7fd3ee', '#d8f6ff', '#ffffff'], 9,
    'An ice shard flies ahead. On a hit six ice mirrors rise around the foe: unguarded it is lifted and held inside (prison), guarded the mirrors only fence it in. Tap the slot again: a mirror image dashes out of a mirror through the foe (up to 4 times); the 5th tap is the mirror storm — every mirror at once.',
    'Sechs hohe Eisspiegel im Kreis, in jedem spiegelt sich der Zauberer; Spiegelbilder schießen als eisige Doppelgänger hindurch.',
    ['Ein Eissplitter fliegt nach vorn.', 'Beim Treffer wachsen sechs Spiegel um den Gegner empor, er schwebt gefangen.', 'Jeder Tipp: ein Spiegelbild prescht durch den Gegner.', 'Spiegelsturm: alle Spiegel zugleich, dann zersplittern sie.'],
    'Kombo-Gefängnis mit Rhythmus: Einzelsprünge oder der große Sturm.'),
  X('S51', 'Blutkreuz', 'Falle · Tipp-Ritual', 'ground', 36, ['#1a0306', '#5c0a14', '#d32f2f', '#ff8a80'], 12,
    'A blood circle is drawn at the target point (12 s). The first foe that steps in is bound to a cross for 3.5 s — then mash the slot: the faster you tap, the harder each blood spike hits. It ends with a burst that grows with the number of taps.',
    'Ein blutroter Kreis mit umgekehrtem Dreieck; ein dunkles Kreuz wächst hinter dem Gegner, ein schwarzer Mond mit rotem Rand steht über der Szene.',
    ['Der Blutkreis zeichnet sich und pulsiert.', 'Ein Gegner tritt hinein: das Kreuz wächst, Ketten binden ihn.', 'Jeder Tipp: ein Blutstachel sticht zu, der Zähler steigt.', 'Ausbruch, das Kreuz zerfällt.'],
    'Belohnt schnelles Tippen; eine Falle, die Gegner umgehen müssen.'),
  X('S52', 'Herausforderung', 'Tank · Spott', 'self', 28, ['#2a0d05', '#b71c1c', '#ffca28', '#fff3c4'], 4,
    'A war cry: every foe within ~280 px is taunted for 4 s — minions and the enemy Wizard go only for you — and you take 30 % less damage meanwhile.',
    'Ein goldener Kriegsschrei-Ring, ein kleines Banner-Siegel über dem Kopf; rote Linien und Ausrufezeichen über den verspotteten Gegnern.',
    ['Der Zauberer reißt die Arme hoch, ein Schrei-Ring rollt aus.', 'Über jedem Gegner erscheint ein rotes Ausrufezeichen.', 'Rote Linien ziehen sie zum Zauberer.', 'Der Ring verblasst.'],
    'Zieht die Aggro für Tanks, schützt die eigenen Verbündeten.'),
  X('S53', 'Sphäre: Abgrundschrein', 'Domäne · Spezial · Sicherer Treffer', 'self', 46, ['#05020a', '#2a0f3d', '#ff3d6e', '#ffd1dc'], 6,
    'Hand sign, blackout — a dome of your inner world unfolds around you for 6 s. Inside: SURE HIT (unseen slashes cut every foe, no guard helps), foes cannot leave and are slowed, you regain mana faster. Tap again to close it early with a final slash storm (stronger the more time is left). If two hostile domains meet: DOMAIN DUEL — tap fast for 3 s, the weaker dome collapses.',
    'Eine Kuppel aus Abgrund-Himmel mit karmesinroter Finsternis, Obsidianboden mit glühenden Rissen und schwebenden Runenringen; unsichtbare Schnitte als weiße Linien.',
    ['Fingerzeichen, ein dunkler Ring sammelt sich unter den Füßen.', 'Schwarzblende, die Kuppel entfaltet sich.', 'Innen: Sternhimmel, Finsternis, Schnitte treffen jeden Gegner.', 'Die Kuppel zerbricht in Scherben.'],
    'Ultimative Zone mit eigenen Regeln; Gegen-Domäne als Antwort.'),
  X('S54', 'Schattenbindung', 'Zweistufig · Kontrolle', 'direction', 34, ['#000000', '#0b0b12', '#5e4b8b', '#9d8bd6'], 3,
    'A shadow strip crawls from your feet along the ground (it leans toward the nearest foe; jumping dodges it). A caught foe is bound for 3 s and copies every move you make — walking, facing, jumping — without acting itself: lead it into a trap, a domain or off the battlements. Tap again: shadow hands strangle it (damage) and end the binding.',
    'Ein tintenschwarzer, welliger Schattenstreifen mit leckenden Ausläufern; unter dem Gebundenen ein Schattenteich, beim Würgen klettern Schattenhände empor.',
    ['Der Schatten löst sich von den Füßen und kriecht los.', 'Er erreicht den Gegner und verschmilzt mit dessen Schatten.', 'Der Gegner macht jede Bewegung des Zauberers nach.', 'Zweiter Tipp: Schattenhände würgen ihn.'],
    'Kontrolle statt Schaden: Positionen erzwingen, Kombos mit Fallen und Domänen.'),
  X('S55', 'Azurflamme', 'Zweistufig · Blaufeuer-Ansturm', 'direction', 34, ['#0a2a5c', '#1565c0', '#40c4ff', '#ffffff'], 3,
    'A short charge while your hand bursts into blue flame — then a straight dash THROUGH every foe in your lane (invulnerable while dashing, burning very likely). A trail of blue fire stays on the path. Tap again within ~2 s: the return strike runs back through the flames, with extra damage on burning foes.',
    'Die Hand lodert in blauem Feuer, Glut wirbelt hinein; der Ansturm hinterlässt eine Spur aus blauen Flammen.',
    ['Blaues Feuer schlägt aus der Hand.', 'Ein gerader Ansturm als blauer Flammenkomet durch alle Gegner in der Bahn.', 'Die Bahn brennt blau nach.', 'Zweiter Tipp: Rückweg-Schlag durch die Flammen.'],
    'Durchschlagender Linien-Angriff mit Timing-Rückweg.'),
  // More domains (user, 20 Oct 2026): the same glyph as every domain, an own ability inside — ONE domain per deck.
  X('S56', 'Sphäre: Stillstand', 'Domäne · Spezial · Zeitlupe', 'self', 46, ['#03141a', '#0c4858', '#ffd54f', '#fff8e1'], 6,
    'Domain (same glyph as every domain, only one per deck). For 6 s time stands still inside: foes are trapped and move in slow motion (25 %), a clock hand strikes everyone inside every 1.5 s. Tap again: ZEITBRUCH — damage and a short freeze (stronger the more time is left).',
    'Ein riesiges goldenes Ziffernblatt hinter dem Zauberer mit langsamen Zeigern, treibende Zahnräder, Sandkörner frieren in der Luft.',
    ['Fingerzeichen, ein dunkler Ring sammelt sich.', 'Die Kuppel entfaltet sich in Türkis und Gold.', 'Gegner bewegen sich wie in Zeitlupe, der Zeiger schlägt zu.', 'Zeitbruch: alles erstarrt kurz.'],
    'Kontroll-Domäne: Gegner ausbremsen, eigene Kombos durchziehen.'),
  X('S57', 'Sphäre: Glutkessel', 'Domäne · Ignis', 'self', 46, ['#1a0503', '#5e1808', '#ff6d00', '#ffe0b2'], 6,
    'Domain (same glyph as every domain, only one per deck). For 6 s the floor turns to magma: foes inside are trapped and keep burning, a fire geyser erupts under each of them every 1.2 s. Tap again: ERUPTION — every geyser at once.',
    'Ein Magmaboden mit Blasen, Lavafälle an den Kuppelrändern, aufsteigende Glut; Feuergeysire schießen unter den Gegnern hoch.',
    ['Fingerzeichen, die Luft flimmert.', 'Die Kuppel entfaltet sich, der Boden glüht zu Magma.', 'Gegner brennen, Geysire brechen unter ihnen aus.', 'Eruption: alle Geysire zugleich.'],
    'Schadens-Domäne mit Flächenbrand.'),
  X('S58', 'Sphäre: Lebenshain', 'Domäne · Natura', 'self', 46, ['#0b1f0e', '#23552a', '#aeea00', '#f1f8e9'], 6,
    'Domain (same glyph as every domain, only one per deck). For 6 s a grove of life: you and your summons inside heal and shake off burn / poison / bleed / paralysis / freeze; foes inside are trapped, poisoned and slowed. Tap again: BLÜTENSEGEN — a burst of healing and a poison blast on the foes.',
    'Eine Baumkrone hinter dem Zauberer, Sonnenstrahlen, treibende Blüten und Blumen auf moosigem Boden.',
    ['Fingerzeichen, Blätter wirbeln auf.', 'Die Kuppel entfaltet sich in Grün und Gold.', 'Verbündete heilen, Gegner werden vergiftet.', 'Blütensegen: Heilung und Giftstoß.'],
    'Unterstützungs-Domäne: heilen, reinigen, Gegner zermürben.'),
  X('S59', 'Sphäre: Spiegelwelt', 'Domäne · Spezial · Spiegelbilder', 'self', 46, ['#0e1116', '#2a3444', '#e0f7fa', '#ffffff'], 6,
    'Domain (same glyph as every domain, only one per deck). For 6 s a world of mirrors: foes are trapped, mirror images of you strike them from changing sides every 1.3 s and they lose their bearings (facing flips). Tap again: SPLITTER — every image strikes at once.',
    'Hohe Spiegelscherben ringsum, in denen sich der Zauberer spiegelt; Spiegelbilder preschen von der Seite heran.',
    ['Fingerzeichen, die Luft wird glasig.', 'Die Kuppel entfaltet sich, Spiegelscherben wachsen.', 'Spiegelbilder schlagen aus wechselnden Richtungen zu.', 'Splitter: alle Bilder zugleich.'],
    'Verwirrungs-Domäne: Gegner wissen nicht, woher der nächste Schlag kommt.'),
  X('S60', 'Sphäre: Schwerkraft', 'Domäne · Spezial · Gravitation', 'self', 46, ['#08060f', '#271c45', '#b388ff', '#ede7f6'], 6,
    'Domain (same glyph as every domain, only one per deck). For 6 s gravity crushes: foes are trapped and pressed to the ground (no jumping, flyers are slammed down), a gravity pulse drags them toward the centre every 2 s. Tap again: KOLLAPS — everything is pulled in and crushed.',
    'Ein schwarzes Loch mit Akkretionsscheibe über der Mitte, Ringe sinken zum Boden, Trümmer fallen.',
    ['Fingerzeichen, der Boden knackt.', 'Die Kuppel entfaltet sich, alles wird schwer.', 'Gegner werden zu Boden gedrückt und zur Mitte gezogen.', 'Kollaps: alles stürzt zur Mitte.'],
    'Anti-Luft-Domäne: keine Sprünge, alles in der Mitte bündeln.'),
  X('S61', 'Sphäre: Sturm', 'Domäne · Fulgur', 'self', 46, ['#0b1118', '#233446', '#4fc3f7', '#e1f5fe'], 6,
    'Domain (same glyph as every domain, only one per deck). For 6 s a storm: foes are trapped and soaked by the rain (WET), lightning strikes each of them every 1.1 s — wet + lightning becomes a SHOCK. Tap again: DONNERKEIL — a huge bolt on everyone inside.',
    'Schwere Wolken, schräger Regen, Blitze flackern am Himmel und schlagen in die Gegner ein.',
    ['Fingerzeichen, Wind kommt auf.', 'Die Kuppel entfaltet sich, Regen setzt ein.', 'Nasse Gegner werden vom Blitz getroffen und geschockt.', 'Donnerkeil: ein gewaltiger Blitz.'],
    'Kombo-Domäne: Nässe und Blitz arbeiten zusammen.'),
  X('S62', 'Sphäre: Schattenmeer', 'Domäne · Umbra', 'self', 46, ['#030305', '#12101e', '#7e57c2', '#d1c4e9'], 6,
    'Domain (same glyph as every domain, only one per deck). For 6 s a sea of shadow: foes are trapped and sink in (slowed), shadow hands grab each of them every 1.4 s and hold them. Tap again: SCHATTENFLUT — the shadows drag everyone down and hold them.',
    'Ein schwarzes Meer, aus dem Schattenbestien mit blassen Augen lugen; Schattenhände greifen aus dem Boden.',
    ['Fingerzeichen, die Schatten werden länger.', 'Die Kuppel entfaltet sich, der Boden wird schwarz.', 'Schattenhände packen und halten die Gegner.', 'Schattenflut: alle werden hinabgezogen.'],
    'Halte-Domäne: Gegner festsetzen für eigene Angriffe.'),
  // Element domains (user, 20 Oct 2026: every rune element gets its own domain, besides the special domains).
  X('S63', 'Sphäre: Auge des Orkans', 'Domäne · Ventus', 'self', 46, ['#0d1a1a','#255c56','#a7ffeb','#e0f2f1'], 6,
    'Element domain (Ventus; same glyph as every domain, only one per deck). For 6 s the eye of a hurricane: foes are trapped, swept around in a circular current and tossed up every 1.5 s. Tap again: ORKAN — everyone is launched high.',
    'Windbänder kreisen um das Auge, Blätter wirbeln; Windstöße schleudern die Gegner hoch.',
    ['Fingerzeichen, die Luft dreht sich.','Die Kuppel entfaltet sich als Wirbel.','Gegner treiben im Kreis und fliegen hoch.','Orkan: alle werden hochgeschleudert.'],
    'Wind-Domäne: Gegner in der Luft halten.'),
  X('S64', 'Sphäre: Steingrab', 'Domäne · Terra', 'self', 46, ['#1a1410','#4a3a2c','#ffcc80','#fff3e0'], 6,
    'Element domain (Terra; same glyph as every domain, only one per deck). For 6 s a stone grave: foes are trapped and slowed, stone spikes burst up under each of them every 1.3 s. Tap again: ERDGRAB — everyone is locked in rock.',
    'Eine Höhle mit Tropfsteinen und Felsbrocken; Steinstacheln brechen aus dem Boden.',
    ['Fingerzeichen, der Boden bebt.','Die Kuppel entfaltet sich als Höhle.','Steinstacheln brechen unter den Gegnern hervor.','Erdgrab: alle in Fels gefangen.'],
    'Erd-Domäne: Stacheln und Festsetzen.'),
  X('S65', 'Sphäre: Tiefsee', 'Domäne · Aqua', 'self', 46, ['#020c1a','#09305a','#40c4ff','#e1f5fe'], 6,
    'Element domain (Aqua; same glyph as every domain, only one per deck). For 6 s the deep sea: foes are trapped, slow, soaked (WET) and slowly drown. Tap again: MAHLSTROM — a whirlpool drags everyone to the centre.',
    'Lichtschächte von oben, aufsteigende Blasen, wogender Tang in tiefem Blau.',
    ['Fingerzeichen, Wasser rauscht.','Die Kuppel füllt sich mit Wasser.','Gegner sinken, werden nass und ertrinken langsam.','Mahlstrom: ein Strudel zieht alle zur Mitte.'],
    'Wasser-Domäne: bremsen, nass machen (Kombos mit Blitz / Eis).'),
  X('S66', 'Sphäre: Jagdgrund', 'Domäne · Bestia', 'self', 46, ['#0f0c08','#3c301e','#ffab40','#fff3e0'], 6,
    'Element domain (Bestia; same glyph as every domain, only one per deck). For 6 s a moonlit hunting ground: foes are trapped, spirit wolves leap at each of them every 1.2 s (bites can bleed). Tap again: RUDEL — the whole pack strikes.',
    'Ein mondheller Wald mit Baumstämmen und glühenden Augen; Geisterwölfe springen aus dem Dunkel.',
    ['Fingerzeichen, ein Heulen.','Die Kuppel entfaltet sich als nächtlicher Wald.','Geisterwölfe springen die Gegner an.','Rudel: alle Wölfe zugleich.'],
    'Bestien-Domäne: Druck durch ständige Angriffe.'),
  X('S67', 'Sphäre: Klingenschmiede', 'Domäne · Konstrukt', 'self', 46, ['#111214','#33373f','#ffca28','#fffde7'], 6,
    'Element domain (Konstrukt; same glyph as every domain, only one per deck). For 6 s a blade forge: foes are trapped, a floating blade dives at each of them every second. Tap again: KLINGENREGEN — every blade at once.',
    'Eine Schmiede mit langsam drehenden, hängenden Klingen und Funken vom Amboss.',
    ['Fingerzeichen, Metall klingt.','Die Kuppel entfaltet sich als Schmiede.','Klingen stürzen auf die Gegner.','Klingenregen: alle Klingen zugleich.'],
    'Konstrukt-Domäne: stetiger Schaden von oben.'),
  X('S68', 'Sphäre: Leere', 'Domäne · Void', 'self', 46, ['#000000','#10051e','#e040fb','#f3e5f5'], 6,
    'Element domain (Void; same glyph as every domain, only one per deck). For 6 s the void: foes are trapped, their mana drains into you, rifts tear open on them every 1.5 s. Tap again: AUSLÖSCHUNG — stronger the more mana was drained.',
    'Nichts — nur violette Risse und Lichtpunkte, die in die Mitte gesogen werden.',
    ['Fingerzeichen, alles wird still.','Die Kuppel entfaltet sich ins Nichts.','Mana fließt von den Gegnern zum Zauberer, Risse reißen auf.','Auslöschung: je mehr Mana, desto stärker.'],
    'Void-Domäne: Gegner aushungern, selbst auftanken.'),
  X('S69', 'Sphäre: Sonnenheiligtum', 'Domäne · Lux', 'self', 46, ['#2a2208','#655422','#fff176','#ffffff'], 6,
    'Element domain (Lux; same glyph as every domain, only one per deck). For 6 s a sun sanctum: foes are trapped, pillars of light strike each of them every 1.2 s, you heal slowly. Tap again: ZENIT — a blinding flash, foes freeze for a moment.',
    'Eine strahlende Sonne mit Strahlenkranz und goldene Tempelsäulen; Lichtsäulen fahren auf die Gegner nieder.',
    ['Fingerzeichen, es wird hell.','Die Kuppel entfaltet sich als Tempel.','Lichtsäulen strafen die Gegner, der Zauberer heilt.','Zenit: ein blendender Blitz.'],
    'Licht-Domäne: strafen und durchhalten.'),
  // More anime ideas, adapted (20 Oct 2026).
  X('S70', 'Bannwürfel', 'Zweistufig · Versiegeln', 'ground', 32, ['#0d2b3a', '#4fc3f7', '#e1f5fe', '#ffffff'], 5,
    'A translucent cube seals the foe nearest to the target point in — it cannot get out for 5 s. Tap again: ZERFALL — the cube collapses and crushes it (shards fly).',
    'Ein durchscheinender, hellblauer Würfel mit leuchtenden Kanten und einem pulsierenden Siegel auf der Vorderseite.',
    ['Kanten zeichnen sich um den Gegner.', 'Der Würfel schließt sich, der Gegner kommt nicht heraus.', 'Zweiter Tipp: der Würfel zieht sich zusammen.', 'Er zerbirst in Scherben.'],
    'Versiegeln und auf Ansage zerquetschen.'),
  X('S71', 'Zornstrahl', 'Aufladen · Strahl', 'direction', 38, ['#120000', '#b71c1c', '#ff5252', '#ffffff'], 3,
    'A charged beam. Touch: press and HOLD the slot — a red-black core grows in your hand and the beam gets wider (up to 2 s); release to fire. Keys: tap to charge, tap again to fire. Fires on its own when held too long. Pierces the whole lane; the recoil shoves you back. A hit while charging breaks it.',
    'Ein rot-schwarzer Kern wächst in der Hand, Streifen werden hineingesogen; der Strahl hat einen weißen Kern in dunkelrotem Mantel.',
    ['Ein dunkler Kern bildet sich in der Hand.', 'Er wächst, je länger gehalten wird.', 'Loslassen: der Strahl schießt durch die Bahn.', 'Der Rückstoß schiebt den Zauberer zurück.'],
    'Risiko gegen Belohnung: länger laden, breiter treffen.'),
  X('S72', 'Blutvertrag', 'Beschwörung · Ein Schlag', 'self', 44, ['#1a0c08', '#5d2e1f', '#ff7043', '#ffccbc'], 2,
    'A drop of blood on a seal — smoke bursts and a giant horned beast rises behind you, strikes ONE huge claw blow across the whole front (heavy damage, knockback) and sinks away again.',
    'Ein Blutsiegel am Boden, Rauchwolken; eine riesige gehörnte Bestie mit glühenden Augen erhebt sich und fegt mit einer gewaltigen Klaue über die Front.',
    ['Ein Blutstropfen fällt auf das Siegel.', 'Rauch, die Bestie erhebt sich hinter dem Zauberer.', 'Ein gewaltiger Klauenschlag fegt über die Front.', 'Sie versinkt im Rauch.'],
    'Ein riesiger Moment statt einer Dauer-Beschwörung.'),
  X('S73', 'Zeitstopp', 'Feld · Projektile', 'ground', 30, ['#263238', '#90a4ae', '#eceff1', '#ffffff'], 5,
    'A field at the target point for 5 s: every projectile inside freezes in mid-air — yours too. When the field ends, they fly on. Use it to stop a volley — or to stack your own shots for a surprise.',
    'Ein blasser, gestrichelter Halbkugel-Schleier mit einer stehengebliebenen Uhr darüber; eingefrorene Geschosse tragen einen hellen Ring.',
    ['Ein Schleier legt sich über das Feld.', 'Geschosse bleiben mitten in der Luft stehen.', 'Eigene Schüsse sammeln sich ebenfalls.', 'Das Feld endet — alles fliegt weiter.'],
    'Konter gegen Fernkampf, Falle für gestapelte Schüsse.'),
  X('S74', 'Trugbild', 'Zweistufig · Illusion', 'self', 34, ['#2a1a33', '#7b5a8c', '#e1bee7', '#ffffff'], 5,
    'Three doubles of you appear around you and look exactly like you. Foes nearby are deceived and attack a double instead — a hit double bursts into mist and its attacker is confused for a moment. Tap again: TAUSCH — swap places with the double farthest from the foes.',
    'Drei täuschend echte Doppelgänger mit gelegentlichem Flimmern; getroffene Trugbilder zerplatzen in violettem Nebel.',
    ['Der Zauberer verschwimmt, drei Doppelgänger treten heraus.', 'Gegner greifen die falschen an.', 'Getroffene Trugbilder zerplatzen in Nebel.', 'Zweiter Tipp: Platztausch mit einem Trugbild.'],
    'Täuschung: Aggro verteilen, Zeit gewinnen, entkommen.'),
  // Breathing styles for every element (user, 21 Oct 2026; breathing.js).
  X('S75', 'Windatmung', 'Atemtechnik · Kampfstil', 'self', 32, ["#0f3a33","#7fe0c5","#d7fff4","#ffffff"], 15,
    'Wind breathing for 15 s. Charge forward: storm sickles fan down the lane. Charge up: a rising dust storm launches foes high. Charge down: the mark awakens and spreads to allies. Sprint attack: you spin into a whirlwind, then burst forward and everyone hit flies away in every direction. Air down: a typhoon cuts everything below.',
    'Grüne Windsicheln und Wirbelringe um den Körper.',
    ["Ein Atemzug, Wind sammelt sich.","Wirbel um die Achse.","Vorstoß aus dem Wirbel.","Der Wind legt sich."],
    'Gegner fliegen auch in die Tiefe.'),
  X('S76', 'Steinatmung', 'Atemtechnik · Kampfstil', 'self', 32, ["#2b2118","#8d7a66","#d2c3ad","#f3ead8"], 15,
    'Stone breathing for 15 s. Charge forward: a spinning stone weapon is hurled out and drills back. Charge up: a rock pillar erupts under the nearest foe. Charge down: the mark awakens. Sprint attack: an unstoppable landslide rush carries foes along and throws them. Air down: a crater strike cracks the ground.',
    'Gesteinsplatten, Risse und Krater.',
    ["Der Boden bebt.","Fels folgt der Klinge.","Ein Krater bricht auf.","Staub legt sich."],
    'Krater, Risse und Geröll bleiben liegen.'),
  X('S77', 'Blumenatmung', 'Atemtechnik · Kampfstil', 'self', 32, ["#4a1030","#f06292","#ffc1e3","#ffffff"], 15,
    'Flower breathing for 15 s: graceful cuts with petals, your hits heal you a little. Charge forward: a crimson curving cut with a petal storm. Charge up: a whirling peach spin. Charge down: the mark awakens. Sprint attack: nine flowing peony cuts. Air down: a falling bloom that heals you.',
    'Rosa Blütenblätter folgen jeder Bewegung.',
    ["Blüten öffnen sich.","Anmutige Bögen.","Ein Blütensturm.","Die Blüten welken."],
    'Heilende Blütenkreise.'),
  X('S78', 'Sonnenatmung', 'Atemtechnik · Kampfstil', 'self', 32, ["#5a2600","#ff9100","#ffd54f","#fffde7"], 15,
    'Sun breathing for 15 s, the root of all styles. Charge forward: a sun dragon rolls far down the lane and burns. Charge up: a setting-sun backflip cut. Charge down: the mark awakens. Sprint attack: a solar trail cut, the foes burst into flames behind you. Air down: a solar crash with scorched ground.',
    'Sonnenflammen mit hellen Sonnenscheiben.',
    ["Die Klinge glüht wie die Sonne.","Ein Sonnendrache folgt.","Flammen bleiben stehen.","Das Glühen erlischt."],
    'Verbrannter Boden nach Sonnenhieben.'),
  X('S79', 'Mondatmung', 'Atemtechnik · Kampfstil', 'self', 32, ["#1a0d33","#7e57c2","#d1c4e9","#ffffff"], 15,
    'Moon breathing for 15 s. Charge forward: a chaotic storm of crescent blades. Charge up: a wall of crescents. Charge down: the mark awakens. Sprint attack: a moon-shadow cut, crescent blades linger on the foes and cut again. Air down: a new-moon burst of crescents. Hits make foes bleed.',
    'Violette Halbmondklingen in wechselnder Größe.',
    ["Mondlicht auf der Klinge.","Halbmonde splittern ab.","Ein Sturm aus Sicheln.","Der Mond verblasst."],
    'Unberechenbare Halbmond-Muster.'),
  X('S80', 'Nebelatmung', 'Atemtechnik · Kampfstil', 'self', 32, ["#263238","#b0bec5","#eceff1","#ffffff"], 15,
    'Mist breathing for 15 s. Charge forward: a sea of clouds, a zig-zag rush of cuts. Charge up: a mist somersault. Charge down: the mark awakens. Sprint attack: a low mist cut, struck foes stand blinded for a moment. Air down: a mist fall.',
    'Grauer Nebel, Nachbilder im Zickzack.',
    ["Nebel steigt auf.","Die Gestalt verschwimmt.","Zickzack durch den Dunst.","Der Nebel lichtet sich."],
    'Verwirrende Nachbilder.'),
  X('S81', 'Biestatmung', 'Atemtechnik · Kampfstil', 'self', 32, ["#2a1b17","#a1887f","#e0d4cd","#ffffff"], 15,
    'Beast breathing for 15 s: wild fang cuts. Charge forward: a rushing X-fang flurry. Charge up: a savage rip upward. Charge down: the mark awakens. Sprint attack: a wild unstoppable charge. Air down: tearing slashes in every direction. Hits make foes bleed.',
    'Krallenspuren und gezackte Reißzähne.',
    ["Ein wildes Knurren.","Krallen zerreißen die Luft.","Ein ungezähmter Ansturm.","Die Wildheit klingt ab."],
    'Krallenrisse im Boden.'),
  X('S82', 'Schmiedeatmung', 'Atemtechnik · Kampfstil', 'self', 32, ["#2e1c00","#ffab00","#ffe082","#ffffff"], 15,
    'Forge breathing for 15 s: the blade rings like a hammer on an anvil. Charge forward: a chain of spark blasts marches down the lane. Charge up: a forge eruption under the foe. Charge down: the mark awakens. Sprint attack: a hammer storm rush with blasts behind you. Air down: an anvil fall.',
    'Funken, glühendes Metall und Explosionen.',
    ["Die Esse glüht auf.","Funken sprühen bei jedem Hieb.","Explosionen marschieren voran.","Die Glut kühlt ab."],
    'Krater und Brandflecken der Explosionen.'),
  X('S83', 'Schutzatmung', 'Atemtechnik · Kampfstil', 'self', 32, ["#08263f","#90caf9","#e3f2fd","#ffffff"], 15,
    'Ward breathing for 15 s. Charge forward: still sea, total calm, for a moment every hit is turned away, then a shield wave pushes forward. Charge up: a rotating guard launches foes. Charge down: the mark awakens. Sprint attack: a shield storm rush. Air down: a dome fall that leaves you a shield.',
    'Ruhige blaue Schildbögen, Kuppeln.',
    ["Völlige Ruhe.","Jeder Schlag wird abgewiesen.","Eine Schildwelle drängt vorwärts.","Die Ruhe endet."],
    'Schildkuppel beim Aufprall.')
);

const out = `// GENERATED by tools/generate_signature_runes.mjs from
// docs/GRIMGE_Spezialrunen_Research_Designatlas_V1.md — do not edit by hand.
// ${runes.length} SIGNATURE SPECIAL runes (S01–S36 atlas + S37–S42 design rules): own rune category, not Arcane States.
export const SIGNATURE_RUNE_DATA = Object.freeze(${JSON.stringify(runes, null, 1)});
`;
fs.writeFileSync(path.join(root, 'public', 'src', 'signature_runes_data.js'), out);
console.log(`${runes.length} signature runes → public/src/signature_runes_data.js (${Math.round(out.length / 1024)} KB)`);
