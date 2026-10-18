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

const out = `// GENERATED by tools/generate_signature_runes.mjs from
// docs/GRIMGE_Spezialrunen_Research_Designatlas_V1.md — do not edit by hand.
// ${runes.length} SIGNATURE SPECIAL runes (S01–S36): own rune category, not Arcane States.
export const SIGNATURE_RUNE_DATA = Object.freeze(${JSON.stringify(runes, null, 1)});
`;
fs.writeFileSync(path.join(root, 'public', 'src', 'signature_runes_data.js'), out);
console.log(`${runes.length} signature runes → public/src/signature_runes_data.js (${Math.round(out.length / 1024)} KB)`);
