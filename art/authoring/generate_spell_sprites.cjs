#!/usr/bin/env node
// GRIMGE — spell sprite sheets for the visual upgrade pilots (deterministic,
// TEST ASSETS: functional pixel art to prove the pipeline and readability —
// "Finales Artwork fehlt"). See docs/GRIMGE_Visual_Upgrade_Plan.md §2.
//
// Output: public/assets/sprites/spells/<name>.png (runtime strips) and
// public/src/spell_sprite_sheets.js (generated metadata). With Aseprite
// installed, editable .aseprite copies are written to art/authoring/spells/.
//
//   node art/authoring/generate_spell_sprites.cjs
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { Sheet, hex, rng } = require('./pixel_sheet.cjs');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'sprites', 'spells');
const SRC_DIR = path.join(__dirname, 'spells');
const ASEPRITE = 'C:/Program Files/Aseprite/Aseprite.exe';

// ── Pilot A: EISZACKEN (sig_S37) ─────────────────────────────────────────
// Palette (plan §2.1): outline · shadow side · body · mid tone · facet · hotspot.
// Brighter after the LF2 reference study (near-white core, saturated cyan rims);
// the dark outline stays so the ice reads on the brown arena floor.
const ICE = { out: hex('#0B2A4A'), shadow: hex('#2A7FD0'), body: hex('#4FC3F7'), mid: hex('#9BE7FF'), facet: hex('#E3FAFF'), hot: hex('#FFFFFF'), crack: hex('#1A4F8C'), clod: hex('#2A3B4F'), clodHi: hex('#4A6078') };
const SPIKE_W = 28; const SPIKE_H = 50; const BASE = SPIKE_H - 3; // bottom anchor row (ground contact)
// World heights of the seven spikes (IceSpike: 34 + 7·i px) → sprite px at scale 2.
const SPIKE_HEIGHTS = Array.from({ length: 7 }, (_, i) => Math.round((34 + 7 * i) / 2));

// One faceted ice rib (plan §2.1): two broad faces split by a ridge — the
// left face in deep body blue, the right face in saturated cyan — a bright cut
// edge on the ridge and the right rim, a darker shadow band at the base. The
// main rib breaks off flat at height h (the standable plateau); side ribs are pointed.
function rib(s, f, cx, h, bw, lean, seed, { pointed = false, dark = false } = {}) {
  const top = BASE - h; const r = rng(seed);
  const tx = cx + lean; // top centre
  const pts = pointed
    ? [[cx - bw, BASE], [tx, top], [cx + bw, BASE]]
    : [[cx - bw, BASE], [tx - 2, top + 1], [tx - 1, top], [tx + 1, top], [tx + 2, top + 1 + Math.round(r())], [cx + bw, BASE]];
  s.poly(f, pts, dark ? ICE.shadow : ICE.body);
  // Ridge from the top to the base, offset towards the light (right).
  const ridgeBase = cx - Math.round(bw * .12);
  const ridge = (y) => tx + (ridgeBase - tx) * ((y - top) / Math.max(1, h));
  for (let y = top; y <= BASE; y++) {
    const rx = Math.round(ridge(y));
    for (let x = rx; x < cx + bw + 2; x++) { if (!s.get(f, x, y)) break; s.set(f, x, y, dark ? ICE.body : ICE.mid); }
    if (s.get(f, rx, y)) s.set(f, rx, y, dark ? ICE.mid : ICE.facet);
    // Bright rim on the right edge (last opaque pixel of the row).
    let edge = rx; while (s.get(f, edge + 1, y)) edge++;
    if (!dark && edge > rx + 1 && y > top + 1) s.set(f, edge, y, ICE.facet);
    // Shadow band at the base of the left face.
    if (y > BASE - Math.max(2, h * .18)) for (let x = Math.round(cx - bw); x < rx; x++) if (s.get(f, x, y)) s.set(f, x, y, ICE.shadow);
  }
  // One hotspot on the ridge near the top (rare near-white highlight).
  if (!dark) s.set(f, Math.round(ridge(top + 2)), top + 2, ICE.hot);
  // Crystal cluster: small sub-facets and short fracture lines inside the body.
  if (h >= 8) for (let k = 0; k < Math.round(h / 5); k++) {
    const y = top + 3 + Math.floor(r() * (h - 5)); const x = Math.round(ridge(y) + (r() - .6) * bw * 1.1);
    if (!s.get(f, x, y) || !s.get(f, x + 2, y + 2)) continue;
    const light = r() < .55;
    s.poly(f, [[x, y], [x + 2 + Math.round(r() * 2), y + 1], [x + 1, y + 3]], light ? (dark ? ICE.mid : ICE.facet) : ICE.shadow);
    if (!light) s.set(f, x + 1, y + 1, ICE.crack);
  }
}
// LF2-style emergence: a spiky burst of white-cyan energy before the crystal forms.
function burst(s, f, cx, seed, size) {
  const r = rng(seed);
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI / 2 + (k - 4) * .32 + (r() - .5) * .15; const L = size * (.55 + r() * .6);
    const x1 = cx + Math.cos(a) * L; const y1 = BASE + Math.sin(a) * L;
    s.poly(f, [[cx - 2, BASE], [x1, y1], [cx + 2, BASE]], k % 3 ? ICE.facet : ICE.mid);
  }
  s.poly(f, [[cx - 4, BASE], [cx, BASE - size * .45], [cx + 4, BASE]], ICE.hot);
  s.outline(f, ICE.body);
}
function clods(s, f, cx, seed, spread = 1) {
  const r = rng(seed);
  for (let k = 0; k < 4; k++) {
    const x = cx + (k < 2 ? -1 : 1) * (6 + r() * 5) * spread; const y = BASE + 1 - Math.round(r() * 2);
    s.poly(f, [[x - 2, y + 1], [x - 1, y - 2], [x + 2, y - 1], [x + 2, y + 1]], ICE.clod);
    s.set(f, Math.round(x), y - 1, ICE.clodHi);
  }
}
function spikeShape(s, f, i, h, glint) {
  const cx = 13; const r = rng(900 + i * 37);
  const bw = 7 + (i % 3) + Math.round(i / 3); const lean = (i % 2 ? 1 : 2);
  // Back shard (taller, pointed, darker), then the main rib, then a small front shard.
  rib(s, f, cx - bw + 3, Math.max(4, Math.round(h * (.66 + r() * .2))), 4, -2, i * 11 + 1, { pointed: true, dark: true });
  rib(s, f, cx, h, bw, lean, i * 11 + 2);
  rib(s, f, cx + bw - 1, Math.max(3, Math.round(h * (.38 + r() * .12))), 4, 2, i * 11 + 3, { pointed: true });
  clods(s, f, cx, i * 11 + 4, Math.min(1, h / 12));
  s.outline(f, ICE.out);
  if (glint) { const top = BASE - h; s.set(f, cx + lean, top - 1, ICE.hot); s.set(f, cx + lean - 1, top - 2, ICE.hot); s.set(f, cx + lean + 1, top - 2, ICE.facet); }
}
function iceSpike(i) {
  const H = SPIKE_HEIGHTS[i];
  // Frames: 0 energy burst · 1 half · 2 full (glint) · 3 hold · 4 cracked · 5 split · 6 shards.
  const s = new Sheet(`ice_spike_v${i}`, SPIKE_W, SPIKE_H, 7, { anchor: 'bottom', baseOffset: SPIKE_H - 1 - BASE, plateau: H, worldHeight: 34 + 7 * i, phases: { emerge: [0, 1, 2], hold: [3], break: [4, 5, 6] } });
  burst(s, 0, 13, 400 + i, Math.max(8, Math.round(H * .55)));
  spikeShape(s, 1, i, Math.round(H * .64), false);
  spikeShape(s, 2, i, H, true);
  spikeShape(s, 3, i, H, false);
  // 4: cracks run through the body.
  s.copy(3, 4);
  const r = rng(700 + i);
  for (let k = 0; k < 3; k++) {
    let x = 9 + k * 3 + Math.round(r() * 2); let y = BASE - Math.round(H * (.25 + k * .22));
    for (let n = 0; n < 5; n++) { if (s.get(4, x, y)) s.set(4, x, y, ICE.crack); x += r() < .5 ? 1 : -1; y += 1; }
    s.set(4, x + 1, y - 3, ICE.hot);
  }
  // 5: split — halves slide apart and sink, the top piece drops.
  s.copy(4, 5, -2, 2, (x, y) => x < 13 && y > BASE - H * .7);
  s.copy(4, 5, 2, 3, (x, y) => x >= 13 && y > BASE - H * .7);
  s.copy(4, 5, 1, 5, (x, y) => y <= BASE - H * .7);
  // 6: only shards on the ground.
  for (let k = 0; k < 7; k++) { const x = 3 + r() * 22; const y = BASE - r() * 6; const sz = 1 + Math.round(r() * 2); s.poly(6, [[x, y], [x + sz + 1, y - sz], [x + sz, y + 1]], k % 2 ? ICE.mid : ICE.facet); }
  s.outline(6, ICE.out);
  return s;
}
function iceCrack() {
  // A ground crack segment that opens in 4 frames (tiled along the attack line).
  const s = new Sheet('ice_crack', 16, 6, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const len = 4 + f * 4; const r = rng(31);
    let y = 3;
    for (let x = 0; x < len; x++) { y = Math.max(1, Math.min(4, y + (r() < .33 ? -1 : r() < .5 ? 1 : 0))); s.set(f, x, y, ICE.crack); if (f >= 2 && x % 3 === 0) s.set(f, x, y - 1, ICE.mid); if (f === 3 && x % 5 === 2) { s.set(f, x, y - 2, ICE.facet); s.set(f, x + 1, y - 2, ICE.facet); } }
  }
  return s;
}
function iceShards() {
  const s = new Sheet('ice_shard', 6, 6, 4, { anchor: 'center' });
  const shapes = [[[1, 5], [3, 0], [5, 4]], [[0, 3], [5, 1], [4, 5]], [[1, 1], [5, 2], [2, 5]], [[2, 0], [4, 3], [1, 5]]];
  shapes.forEach((pts, f) => { s.poly(f, pts, ICE.mid); s.set(f, pts[1][0], pts[1][1], ICE.hot); s.outline(f, ICE.out); });
  return s;
}
function iceHit() {
  const s = new Sheet('ice_hit', 16, 16, 4, { anchor: 'center' });
  const c = 8;
  for (let f = 0; f < 4; f++) {
    const R = 2 + f * 2;
    if (f < 3) { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + f * .3; s.line(f, c, c, c + Math.cos(a) * R, c + Math.sin(a) * R, f === 0 ? ICE.hot : ICE.facet); } s.set(f, c, c, ICE.hot); }
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + .4; const x = c + Math.cos(a) * (R + 1); const y = c + Math.sin(a) * (R + 1); if (f > 0) s.poly(f, [[x - 1, y], [x, y - 2], [x + 1, y + 1]], f === 3 ? ICE.body : ICE.mid); }
    s.outline(f, ICE.out);
  }
  return s;
}
function iceCast() {
  const s = new Sheet('ice_cast', 10, 10, 3, { anchor: 'center' });
  for (let f = 0; f < 3; f++) {
    const R = 1 + f * 1.5;
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; s.line(f, 5, 5, 5 + Math.cos(a) * R, 5 + Math.sin(a) * R, k % 2 ? ICE.mid : ICE.facet); }
    s.set(f, 5, 5, ICE.hot);
    s.outline(f, ICE.out);
  }
  return s;
}

const { meteorSheets } = require('./spell_sprites_meteor.cjs');
const { tideSheets } = require('./spell_sprites_tide.cjs');
const sheets = [...SPIKE_HEIGHTS.map((_, i) => iceSpike(i)), iceCrack(), iceShards(), iceHit(), iceCast(), ...meteorSheets(), ...tideSheets()];
// Hi-res refinement (refine_hires.cjs): twice the pixel density, light / shade rims, a thin material outline —
// so the spells match the finely drawn characters and the painted scene. Thin line motifs only get Scale2x.
const { saveRefined } = require('./refine_hires.cjs');
const LINE_ONLY = new Set(['ice_crack', 'meteor_telegraph', 'meteor_trail']);
const meta = sheets.map((sheet) => saveRefined(sheet, OUT_DIR, LINE_ONLY.has(sheet.name) ? { strip: false, shading: false, line: false } : {}));
// Hand-drawn quality sheets (vfx_brush.cjs) are authored at the final density and saved as they are.
const { saveFinal } = require('./vfx_brush.cjs');
const { windSheets } = require('./vfx_wind.cjs');
const { fireSheets } = require('./vfx_fire.cjs');
const { waterSheets } = require('./vfx_water.cjs');
const { lightningSheets } = require('./vfx_lightning.cjs');
const { earthSheets } = require('./vfx_earth.cjs');
const { arcaneSheets } = require('./vfx_arcane.cjs');
const { natureSheets } = require('./vfx_nature.cjs');
const { groundSheets } = require('./vfx_ground.cjs');
const { skySheets } = require('./vfx_sky.cjs');
const { dragonSheets } = require('./vfx_dragon.cjs');
const { bloodArmSheets } = require('./vfx_bloodarms.cjs');
const { runes1Sheets } = require('./vfx_runes1.cjs');
const { runes2Sheets } = require('./vfx_runes2.cjs');
const { runes3Sheets } = require('./vfx_runes3.cjs');
const { runes4Sheets } = require('./vfx_runes4.cjs');
const { runes5Sheets } = require('./vfx_runes5.cjs');
const { runes6Sheets } = require('./vfx_runes6.cjs');
const { arcane1Sheets } = require('./vfx_arcane1.cjs');
const { konstruktSheets } = require('./vfx_konstrukt.cjs');
for (const sheet of [...windSheets(), ...fireSheets(), ...waterSheets(), ...lightningSheets(), ...earthSheets(), ...arcaneSheets(), ...natureSheets(), ...groundSheets(), ...skySheets(), ...dragonSheets(), ...bloodArmSheets(), ...runes1Sheets(), ...runes2Sheets(), ...runes3Sheets(), ...runes4Sheets(), ...runes5Sheets(), ...runes6Sheets(), ...arcane1Sheets(), ...konstruktSheets()]) meta.push(saveFinal(sheet, OUT_DIR));
const js = `// GENERATED by art/authoring/generate_spell_sprites.cjs — do not edit by hand.
// Spell sprite sheets (TEST ASSETS for the visual upgrade pilots; final artwork missing).
// Each sheet is a horizontal strip; w / h are LOGICAL frame sizes (drawn at scale 2); the image holds res× as many
// pixels per frame (hi-res refinement), so the spells are drawn with the pixel density of the characters.
export const SPELL_SPRITE_SHEETS = Object.freeze(${JSON.stringify(Object.fromEntries(meta.map((m) => [m.name, m])), null, 1)});
`;
fs.writeFileSync(path.join(ROOT, 'public', 'src', 'spell_sprite_sheets.js'), js);
console.log(`wrote ${meta.length} spell sheets to ${OUT_DIR}`);
// Editable Aseprite copies (optional).
if (fs.existsSync(ASEPRITE)) {
  fs.mkdirSync(SRC_DIR, { recursive: true });
  for (const m of meta) { try { execFileSync(ASEPRITE, ['-b', path.join(OUT_DIR, m.name + '.png'), '--save-as', path.join(SRC_DIR, m.name + '.aseprite')], { stdio: 'ignore' }); } catch { /* optional */ } }
  console.log('wrote .aseprite copies to', SRC_DIR);
}
