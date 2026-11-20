// GRIMGE Prototype — Kronenkrieg graphics. The places of the map in the game's pixel style instead of flat shapes:
//   • main and mid castles are the painted castle towers of Castle Siege (themed by the biome they stand in: volcano,
//     glacier, waterfalls …; blue for the own side, red otherwise) joined by a drawn wall and gate;
//   • prison, camp, waystone, trial and lair use the painted scene props (cage, braziers, torches, banner, rune pillar,
//     knight statue, demon statue, rubble);
//   • house, stable, tents, gold vein and source basins are pixel sprites drawn ONCE at low resolution (outline, base,
//     shade, highlight) into small offscreen canvases and scaled up crisp;
//   • every biome scatters its own landscape pieces (pines, oaks, dead trees, rocks, crystals, reeds, tufts).
// When an image is not loaded yet (or in node tests) drawKKSite returns false and the plain drawing in kk_world is used.
import { mulberry32, BIOME_OF } from './kk_map.js';

const S = 2; // pixel scale of the drawn sprites (one sprite pixel = 2 world pixels)
const images = {};
function img(path) {
  let e = images[path];
  if (!e) { e = images[path] = { image: typeof Image === 'function' ? new Image() : null, loaded: false }; if (e.image) { e.image.onload = () => { e.loaded = true; }; e.image.src = path; } }
  return e.loaded ? e.image : null;
}
const prop = (name) => img(`assets/scenes/props/${name}.png`);
const tower = (skin, team) => img(`assets/castles/${skin}_${team}.png`);
export const castleTowerImage = (biome, friendly) => tower(CASTLE_SKIN_OF[biome] ?? 'ruins', friendly ? 'blue' : 'red'); /* kk_castle.js */
export const CASTLE_SKIN_OF = Object.freeze({ ignis: 'volcano', frost: 'frozen', aqua: 'waterfalls', fulgur: 'storm', ventus: 'canyon', terra: 'canyon', natura: 'ruins', bestia: 'ruins', construct: 'ruins', void: 'arcane', lux: 'arcane', umbra: 'arcane', ward: 'rain' });

// ── pixel sprites ──────────────────────────────────────────────────────────────────────────────────────────────────
const sprites = new Map();
function sprite(key, w, h, paint) {
  if (sprites.has(key)) return sprites.get(key);
  const doc = globalThis.document; const c = typeof doc?.createElement === 'function' ? doc.createElement('canvas') : null;
  if (!c || typeof c.getContext !== 'function') { sprites.set(key, null); return null; }
  c.width = w; c.height = h; const g = c.getContext('2d'); if (!g) { sprites.set(key, null); return null; }
  const p = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x | 0, y | 0, ww | 0, hh | 0); };
  paint(p, g, w, h); sprites.set(key, c); return c;
}
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
// A timber-frame house: plaster between dark beams, a slate roof with a ridge, warm windows, a door, a chimney.
function houseSprite(floors) {
  const w = 64; const wallH = 16 + floors * 13; const h = wallH + 26;
  return sprite('house' + floors, w, h, (p) => {
    const top = h - wallH;
    p(4, top, 56, wallH, '#2a1d14'); p(5, top + 1, 54, wallH - 2, '#d8c9a8'); p(5, top + 1, 54, 3, '#efe3c4'); p(5, h - 6, 54, 4, '#b9a882');
    for (let f = 0; f <= floors; f++) p(5, top + 1 + f * 13, 54, 2, '#4a3324');
    for (const bx of [5, 18, 31, 44, 57]) p(bx, top + 1, 2, wallH - 2, '#4a3324');
    for (let f = 0; f < floors; f++) for (const wx of [9, 37]) { const wy = top + 5 + f * 13; p(wx - 1, wy - 1, 10, 9, '#2a1d14'); p(wx, wy, 8, 7, '#f6c56a'); p(wx, wy, 8, 2, '#ffe6a8'); p(wx + 3, wy, 2, 7, '#4a3324'); }
    p(25, h - 16, 12, 14, '#2a1d14'); p(26, h - 15, 10, 13, '#6b4428'); p(26, h - 15, 10, 2, '#8a5a34'); p(33, h - 9, 2, 2, '#e0c060');
    // roof
    for (let r = 0; r < 24; r++) { const inset = Math.round(r * 1.25); p(inset, top - 1 - r, w - inset * 2, 1, r % 4 === 0 ? '#2e3442' : '#465066'); }
    for (let r = 0; r < 24; r += 4) { const inset = Math.round(r * 1.25); for (let x = inset + 2; x < w - inset - 2; x += 6) p(x, top - 2 - r, 1, 3, '#384055'); }
    p(0, top - 1, w, 2, '#1f2330'); p(30, top - 25, 4, 2, '#1f2330');
    p(46, top - 22, 6, 12, '#3a2a20'); p(45, top - 23, 8, 2, '#2a1d14'); p(47, top - 21, 4, 2, '#6a4a3a');
  });
}
function stableSprite() {
  return sprite('stable', 72, 46, (p) => {
    p(4, 18, 64, 28, '#2a1d14'); p(5, 19, 62, 26, '#8a5a34'); for (let x = 5; x < 67; x += 5) p(x, 19, 1, 26, '#6b4428'); p(5, 19, 62, 2, '#a8723f');
    p(18, 24, 36, 21, '#1d140e'); p(18, 24, 36, 2, '#2a1d14');
    for (let i = 0; i < 18; i++) { const inset = Math.round(i * 2); p(inset, 17 - i, 72 - inset * 2, 1, i % 3 === 0 ? '#5a3a22' : '#7a4a2a'); }
    p(0, 17, 72, 2, '#3a2416');
    for (const hx of [20, 30, 41]) { p(hx, 36, 10, 8, '#c9a64a'); p(hx, 36, 10, 2, '#e6c66a'); p(hx + 2, 38, 1, 5, '#a4833a'); }
    for (let x = 58; x < 72; x += 6) p(x, 34, 2, 12, '#5a3a22'); p(56, 36, 16, 2, '#6b4428'); p(56, 41, 16, 2, '#6b4428');
  });
}
function tentSprite(col) {
  return sprite('tent' + col, 40, 30, (p) => {
    for (let r = 0; r < 26; r++) { const half = Math.round(r * .75) + 1; p(20 - half, 4 + r, half * 2, 1, r % 5 === 0 ? '#2a1d14' : col); }
    for (let r = 0; r < 26; r += 3) { const half = Math.round(r * .75); p(20 + half - 4, 4 + r, 3, 1, 'rgba(0,0,0,.25)'); }
    p(17, 18, 6, 12, '#1d140e'); p(19, 0, 2, 6, '#5a3a22'); p(10, 12, 4, 3, '#d8c08a'); p(27, 20, 4, 3, '#b08a5a');
  });
}
function goldSprite() {
  return sprite('gold', 48, 32, (p) => {
    const rows = [[14, 34], [10, 38], [7, 41], [5, 43], [3, 45], [2, 46], [1, 47]];
    for (let r = 0; r < 32; r++) { const [a, b] = rows[Math.min(rows.length - 1, Math.floor(r / 4))]; p(a, r, b - a, 1, r < 3 ? '#8a7d70' : r < 14 ? '#6d6258' : '#574e46'); p(a, r, 2, 1, '#2a2420'); p(b - 2, r, 2, 1, '#2a2420'); }
    p(1, 31, 46, 1, '#2a2420');
    for (let i = 0; i < 14; i++) { const x = 8 + Math.floor(hash(i, 3) * 32); const y = 6 + Math.floor(hash(3, i) * 22); p(x, y, 3, 2, '#ffcf3a'); p(x, y, 1, 1, '#fff6c2'); p(x + 1, y + 2, 2, 1, '#a57a10'); }
  });
}
function sourceSprite(color) {
  return sprite('src' + color, 64, 22, (p) => {
    p(4, 6, 56, 14, '#3a3632'); p(6, 4, 52, 16, '#5a5650'); p(8, 6, 48, 10, '#2a2a30');
    p(9, 7, 46, 8, color); p(12, 8, 18, 2, 'rgba(255,255,255,.55)'); p(36, 11, 12, 1, 'rgba(255,255,255,.35)');
    for (let i = 0; i < 9; i++) { const x = 3 + i * 7; p(x, 14 + (i % 2), 6, 6, '#6e6a62'); p(x, 14 + (i % 2), 6, 1, '#8e8a80'); p(x, 19 + (i % 2), 6, 1, '#3a3632'); }
  });
}
function lairSprite() {
  return sprite('lair', 110, 64, (p) => {
    for (let r = 0; r < 64; r++) { const half = Math.round(Math.sqrt(Math.max(0, 1 - ((64 - r) / 64) ** 2)) * 54); p(55 - half, r, half * 2, 1, r % 7 === 0 ? '#2a2420' : r < 20 ? '#4a423c' : '#3a332e'); }
    for (let r = 26; r < 64; r++) { const half = Math.round(Math.sqrt(Math.max(0, 1 - ((64 - r) / 38) ** 2)) * 20); p(55 - half, r, half * 2, 1, r < 32 ? '#141010' : '#0a0808'); }
    for (let i = 0; i < 8; i++) { const x = 10 + i * 12; p(x, 60, 7, 2, '#e8e0d0'); p(x + 2, 58, 2, 2, '#e8e0d0'); }
    p(40, 28, 3, 6, '#d8d0c0'); p(66, 30, 3, 5, '#d8d0c0');
  });
}
// Landscape pieces per biome.
const DECOR = Object.freeze({
  pine: [16, 34, (p) => { for (let r = 0; r < 28; r++) { const half = Math.round((r % 9) * .7 + r * .25) + 1; p(8 - half, r, half * 2, 1, r % 9 === 8 ? '#14301e' : '#24512e'); p(8 - half, r, 1, 1, '#14301e'); } p(7, 28, 3, 6, '#4a3020'); }],
  snowpine: [16, 34, (p) => { for (let r = 0; r < 28; r++) { const half = Math.round((r % 9) * .7 + r * .25) + 1; p(8 - half, r, half * 2, 1, r % 9 < 2 ? '#e8f4ff' : '#2e5a4a'); } p(7, 28, 3, 6, '#4a3020'); }],
  oak: [26, 32, (p) => { for (let i = 0; i < 40; i++) { const a = hash(i, 1) * Math.PI * 2; const rr = hash(1, i) * 11; p(13 + Math.cos(a) * rr - 3, 11 + Math.sin(a) * rr * .8 - 3, 6, 5, i % 3 ? '#3f7a30' : '#2c5a22'); } p(12, 18, 3, 14, '#4a3020'); p(10, 30, 7, 2, '#3a2418'); }],
  dead: [22, 30, (p) => { p(10, 8, 3, 22, '#3a2e28'); p(4, 10, 7, 2, '#3a2e28'); p(12, 6, 8, 2, '#3a2e28'); p(3, 7, 2, 4, '#3a2e28'); p(18, 3, 2, 4, '#3a2e28'); p(8, 28, 7, 2, '#241c18'); }],
  rock: [22, 14, (p) => { p(2, 5, 18, 9, '#5e564e'); p(4, 2, 13, 4, '#766d62'); p(4, 2, 6, 1, '#8e8478'); p(2, 13, 18, 1, '#2e2924'); p(1, 6, 1, 7, '#2e2924'); }],
  crystal: [16, 22, (p) => { p(6, 2, 4, 18, '#9b6bff'); p(6, 2, 2, 18, '#d8c4ff'); p(2, 8, 3, 12, '#7a4fd8'); p(11, 6, 3, 14, '#b48cff'); p(1, 20, 14, 2, '#2a1f3d'); }],
  reeds: [18, 18, (p) => { for (let i = 0; i < 7; i++) { const x = 2 + i * 2; const hh = 9 + Math.round(hash(i, 5) * 8); p(x, 18 - hh, 1, hh, i % 2 ? '#7a9a4a' : '#5a7a3a'); if (i % 3 === 0) p(x, 18 - hh, 2, 3, '#6a4a2a'); } }],
  tuft: [12, 8, (p) => { for (let i = 0; i < 5; i++) p(1 + i * 2, 8 - 3 - (i % 2) * 2, 1, 3 + (i % 2) * 2, '#5a8a3a'); }],
  // resource rocks (kk_resources.js): an ore vein (steel) and a block of obsidian (the hardest)
  ore: [24, 16, (p) => { p(2, 6, 20, 10, '#4e4842'); p(4, 3, 15, 5, '#6a6258'); p(4, 3, 6, 1, '#857c70'); p(2, 15, 20, 1, '#2e2924'); for (const [x, y] of [[6, 8], [12, 6], [16, 10], [9, 12], [18, 7]]) { p(x, y, 3, 2, '#a9c4d6'); p(x, y, 1, 1, '#eef8ff'); } }],
  obsidian: [22, 22, (p) => { p(4, 8, 15, 13, '#160c20'); p(7, 3, 8, 7, '#1f1430'); p(8, 1, 4, 3, '#2b1d3a'); p(8, 3, 2, 14, '#5a3a8a'); p(13, 8, 1, 9, '#9b6bff'); p(5, 12, 1, 6, '#3a2a50'); p(2, 20, 19, 2, '#0c0612'); p(9, 2, 1, 2, '#d8c4ff'); }],
  lava: [20, 10, (p) => { p(2, 4, 16, 5, '#2a1410'); p(4, 5, 12, 3, '#ff6a1f'); p(6, 5, 5, 1, '#ffd24a'); }]
});
const BIOME_DECOR = Object.freeze({
  ignis: ['dead', 'rock', 'lava', 'rock'], frost: ['snowpine', 'snowpine', 'rock'], aqua: ['reeds', 'reeds', 'rock', 'tuft'], fulgur: ['dead', 'rock', 'tuft'],
  ventus: ['rock', 'tuft', 'tuft'], terra: ['rock', 'rock', 'tuft'], bestia: ['oak', 'pine', 'tuft', 'oak'], construct: ['rock', 'tuft'],
  void: ['crystal', 'rock', 'crystal'], lux: ['oak', 'tuft', 'tuft'], natura: ['oak', 'oak', 'tuft', 'pine'], ward: ['pine', 'crystal', 'tuft'], umbra: ['dead', 'rock', 'dead']
});
const decorSprite = (kind) => { const d = DECOR[kind]; return d ? sprite('decor_' + kind, d[0], d[1], d[2]) : null; };
// Deterministic landscape pieces per band (away from the places and the road band).
export function buildDecor(map) {
  const rng = mulberry32(map.seed * 7 + 11); const out = [];
  for (const bio of map.biomes) {
    const kinds = BIOME_DECOR[bio.element] ?? ['tuft']; const n = Math.round((bio.x1 - bio.x0) / 120);
    for (let i = 0; i < n; i++) {
      const x = bio.x0 + rng() * (bio.x1 - bio.x0); let z = rng() < .5 ? .06 + rng() * .28 : .72 + rng() * .24;
      if ([...map.hqs, ...map.sites].some((s) => s.row === bio.row && (s.kind === 'castle' || s.kind === 'hq' ? Math.abs(s.x - x) < (s.kind === 'hq' ? 400 : 340) && z > s.z - .24 && z < s.z + .12 : Math.abs(s.x - x) < 170 && Math.abs(s.z - z) < .25))) continue; /* castles: wall block plus stairs */
      let kind = kinds[Math.floor(rng() * kinds.length)]; const roll = rng();
      // some rocks are resources of the stronger materials: ore veins (steel), and obsidian in the deep and in fire / void / shadow land
      if (kind === 'rock' && roll < .24) kind = 'ore'; else if ((kind === 'rock' || kind === 'crystal' || kind === 'lava') && roll > (bio.row === 2 || ['ignis', 'void', 'umbra'].includes(bio.element) ? .72 : .93)) kind = 'obsidian';
      out.push({ row: bio.row, x, z: +z.toFixed(3), kind, flip: rng() < .5 });
    }
  }
  return out;
}
export function drawDecor(ctx, d, y) {
  const s = decorSprite(d.kind); if (!s) return;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(d.x, y, s.width * S * .45, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (d.flip) { ctx.translate(d.x, 0); ctx.scale(-1, 1); ctx.translate(-d.x, 0); }
  ctx.drawImage(s, Math.round(d.x - s.width * S / 2), Math.round(y - s.height * S + 2), s.width * S, s.height * S); ctx.restore();
}

// ── places ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const blit = (ctx, im, x, yBottom, scale, flip = false) => { if (!im) return false; const w = (im.naturalWidth || im.width) * scale; const h = (im.naturalHeight || im.height) * scale; ctx.save(); ctx.imageSmoothingEnabled = false; if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); } ctx.drawImage(im, Math.round(x - w / 2), Math.round(yBottom - h), Math.round(w), Math.round(h)); ctx.restore(); return true; };
const shadow = (ctx, x, y, w) => { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 2, w, w * .16, 0, 0, Math.PI * 2); ctx.fill(); };
function flag(ctx, x, y, color, t) { ctx.fillStyle = '#3b2b1b'; ctx.fillRect(Math.round(x), Math.round(y), 3, 46); const wave = Math.sin(t * 3 + x) * 2; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + 3, y + 2); ctx.lineTo(x + 34, y + 6 + wave); ctx.lineTo(x + 30, y + 14 + wave); ctx.lineTo(x + 34, y + 22 + wave); ctx.lineTo(x + 3, y + 20); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(Math.round(x + 4), Math.round(y + 3), 26, 3); }
// A stone wall with a gate between two towers (drawn): coursed stones, a dark arch, a wooden door.
function wall(ctx, x0, x1, yB, h, tier) {
  const mats = [['#7d7a72', '#5f5c56', '#9a968c'], ['#8a6a42', '#6b4f30', '#a8845a'], ['#8d8f99', '#6c6e78', '#aeb0ba'], ['#9fb4c4', '#7890a2', '#c8d8e4'], ['#3b2f4a', '#2b2235', '#5a4a70']][Math.min(4, tier + (tier > 0 ? 0 : 0))];
  const [base, dark, light] = mats; ctx.fillStyle = dark; ctx.fillRect(Math.round(x0), Math.round(yB - h), Math.round(x1 - x0), Math.round(h));
  ctx.fillStyle = base; for (let y = yB - h + 2; y < yB - 2; y += 9) for (let x = x0 + ((Math.floor(y / 9) % 2) * 9); x < x1 - 4; x += 18) ctx.fillRect(Math.round(x + 1), Math.round(y), 16, 7);
  ctx.fillStyle = light; ctx.fillRect(Math.round(x0), Math.round(yB - h), Math.round(x1 - x0), 3);
  for (let x = x0; x < x1 - 8; x += 20) { ctx.fillStyle = base; ctx.fillRect(Math.round(x + 2), Math.round(yB - h - 10), 12, 10); ctx.fillStyle = light; ctx.fillRect(Math.round(x + 2), Math.round(yB - h - 10), 12, 2); }
  const gx = (x0 + x1) / 2; ctx.fillStyle = '#1a120c'; ctx.beginPath(); ctx.moveTo(gx - 24, yB); ctx.lineTo(gx - 24, yB - 46); ctx.quadraticCurveTo(gx, yB - 70, gx + 24, yB - 46); ctx.lineTo(gx + 24, yB); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(Math.round(gx - 20), Math.round(yB - 44), 40, 44); ctx.fillStyle = '#3a2416'; for (let x = gx - 20; x < gx + 20; x += 8) ctx.fillRect(Math.round(x), Math.round(yB - 44), 1, 44); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(Math.round(gx - 20), Math.round(yB - 30), 40, 3); ctx.fillRect(Math.round(gx - 20), Math.round(yB - 14), 40, 3);
}
export function drawKKSite(ctx, site, y, t, opts = {}) {
  const x = site.x; const own = opts.ownerColor; const friendly = !!opts.friendly;
  switch (site.kind) {
    case 'hq': case 'castle': {
      const skin = CASTLE_SKIN_OF[opts.biome] ?? 'ruins'; const team = friendly ? 'blue' : 'red';
      const im = tower(skin, team); if (!im) return false;
      const big = site.kind === 'hq'; const sc = big ? .4 : .32; const tw = 265 * sc; const half = big ? 150 : 96;
      shadow(ctx, x, y, half + tw * .5);
      wall(ctx, x - half + tw * .35, x + half - tw * .35, y, big ? 92 : 70, big ? (site.level ?? 0) : 0);
      blit(ctx, im, x - half, y + 4, sc); if (big) blit(ctx, im, x + half, y + 4, sc, true); else blit(ctx, im, x + half, y + 4, sc * .8, true);
      flag(ctx, x - 2, y - (big ? 200 : 150), own ?? '#9e9e9e', t);
      if (site.label) { ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(Math.round(x - 26), Math.round(y - (big ? 214 : 164)), 52, 13); ctx.fillStyle = '#fff3c8'; ctx.fillText(site.label, x, y - (big ? 204 : 154)); }
      return true;
    }
    case 'building': { if (opts.inside) return true; /* drawn cut away from inside (kk_interior.js) */ const s = houseSprite(Math.max(1, Math.min(3, site.floors ?? 1))); if (!s) return false; const hs = 2.9; /* houses are big enough to walk into */ shadow(ctx, x, y, 100); if (opts.fadeFront) ctx.globalAlpha = .3; blit(ctx, s, x, y + 2, hs); ctx.globalAlpha = 1; if (opts.looted) { ctx.fillStyle = 'rgba(10,8,6,.3)'; ctx.fillRect(Math.round(x - 93), Math.round(y - s.height * hs), 186, s.height * hs); } return true; }
    case 'stable': { const s = stableSprite(); if (!s) return false; shadow(ctx, x, y, 76); blit(ctx, s, x, y + 2, S); return true; }
    case 'goldvein': { const s = goldSprite(); if (!s) return false; shadow(ctx, x, y, 48); blit(ctx, s, x, y + 2, S); for (let i = 0; i < 3; i++) { const k = (t * .8 + i * .33) % 1; ctx.globalAlpha = 1 - k; ctx.fillStyle = '#fff6c2'; ctx.fillRect(Math.round(x - 20 + i * 18), Math.round(y - 30 - k * 20), 2, 2); } ctx.globalAlpha = 1; return true; }
    case 'source': {
      const c = opts.elementColor ?? '#9be6ff'; const s = sourceSprite(c); if (!s) return false; shadow(ctx, x, y, 66); blit(ctx, s, x, y + 2, S);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .18 + .12 * Math.sin(t * 2.4 + x); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y - 18, 50, 12, 0, 0, Math.PI * 2); ctx.fill(); if (site.pure) { ctx.globalAlpha = .25 + .15 * Math.sin(t * 3); ctx.fillRect(Math.round(x - 3), Math.round(y - 140), 6, 120); } ctx.restore();
      for (let i = 0; i < 4; i++) { const k = (t * .5 + i * .25) % 1; ctx.globalAlpha = (1 - k) * .8; ctx.fillStyle = c; ctx.fillRect(Math.round(x - 30 + i * 18 + Math.sin(t + i) * 4), Math.round(y - 22 - k * 34), 3, 3); } ctx.globalAlpha = 1; return true;
    }
    case 'lair': { const s = lairSprite(); if (!s) return false; shadow(ctx, x, y, 120); blit(ctx, s, x, y + 2, S); blit(ctx, prop('glut_statue'), x + 120, y + 4, .7); blit(ctx, prop('glut_rubble'), x - 120, y + 4, .7); return true; }
    case 'prison': { const cage = prop('glut_cage'); if (!cage) return false; shadow(ctx, x, y, 90); blit(ctx, prop('kareth_torch'), x - 86, y + 2, .55); for (const dx of [-42, 0, 42]) blit(ctx, cage, x + dx, y + 2, .62); blit(ctx, prop('kareth_torch'), x + 86, y + 2, .55); if (!opts.freed) { ctx.fillStyle = '#c9b38a'; for (const dx of [-42, 0, 42]) { ctx.fillRect(Math.round(x + dx - 4), Math.round(y - 40), 8, 12); ctx.fillStyle = '#8a6a4a'; ctx.fillRect(Math.round(x + dx - 5), Math.round(y - 28), 10, 18); ctx.fillStyle = '#c9b38a'; } } return true; }
    case 'camp': { const tent = tentSprite('#7a3b2e'); const tent2 = tentSprite('#6a5a3a'); if (!tent) return false; shadow(ctx, x, y, 110); blit(ctx, tent, x - 70, y + 2, S); blit(ctx, tent2, x + 66, y + 2, S, true); blit(ctx, prop('glut_torch'), x, y + 4, .5); blit(ctx, prop('kareth_banner'), x + 120, y + 4, .55); return true; }
    case 'shrine': { const pil = prop('kareth_pillar'); if (!pil) return false; shadow(ctx, x, y, 30); blit(ctx, pil, x, y + 3, .6); if (!site.used) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35 + .25 * Math.sin(t * 2.5 + x); ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(x, y - 72, 10, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } return true; }
    case 'trial': {
      const st = prop('kareth_statue'); if (!st) return false; const c = opts.elementColor ?? '#ffe9a8'; shadow(ctx, x, y, 70);
      ctx.save(); ctx.globalAlpha = site.won ? .25 : .55 + .35 * Math.sin(t * 3); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 76, 17, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      blit(ctx, st, x, y + 4, .62); ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff3c8'; ctx.fillText(site.won ? 'PRÜFUNG BESTANDEN' : `PRÜFUNG ${site.stage === 8 ? 'I' : 'II'}`, x, y - 172); return true;
    }
    case 'shaft': {
      // a shaft: a dark hole with a stone rim and a rope ladder going down
      ctx.fillStyle = '#4e4840'; ctx.beginPath(); ctx.ellipse(x, y, 58, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#6a635a'; ctx.beginPath(); ctx.ellipse(x, y - 2, 54, 13, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#050403'; ctx.beginPath(); ctx.ellipse(x, y + 1, 44, 11, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; ctx.fillStyle = i % 2 ? '#7a7268' : '#5a534a'; ctx.fillRect(Math.round(x + Math.cos(a) * 52 - 5), Math.round(y + Math.sin(a) * 14 - 3), 10, 6); }
      ctx.fillStyle = '#6b4428'; ctx.fillRect(Math.round(x - 14), Math.round(y - 4), 2, 14); ctx.fillRect(Math.round(x + 12), Math.round(y - 4), 2, 14); for (let r = 0; r < 3; r++) ctx.fillRect(Math.round(x - 14), Math.round(y - 2 + r * 5), 28, 2);
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#e8dcc0'; ctx.fillText('⇩ SCHACHT', x, y - 22); return true;
    }
    case 'lift': {
      // a lift: a timber frame with a pulley, ropes and a plank platform (it rises when one stands on it)
      const rise = opts.liftK ?? 0;
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 52, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a2e1a'; ctx.fillRect(Math.round(x - 48), Math.round(y - 170), 7, 172); ctx.fillRect(Math.round(x + 41), Math.round(y - 170), 7, 172); ctx.fillRect(Math.round(x - 52), Math.round(y - 176), 104, 8);
      ctx.fillStyle = '#8a8a8a'; ctx.beginPath(); ctx.arc(x, y - 166, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3a3a3a'; ctx.fillRect(Math.round(x - 2), Math.round(y - 168), 4, 4);
      const py = y - 6 - rise * 60; ctx.fillStyle = '#c9b38a'; ctx.fillRect(Math.round(x - 30), Math.round(y - 166), 1, Math.round(py - (y - 166))); ctx.fillRect(Math.round(x + 30), Math.round(y - 166), 1, Math.round(py - (y - 166)));
      ctx.fillStyle = '#2a1d14'; ctx.fillRect(Math.round(x - 40), Math.round(py), 80, 10); ctx.fillStyle = '#8a5a34'; for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x - 39 + i * 16), Math.round(py + 1), 14, 7);
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#e8dcc0'; ctx.fillText('⇧ AUFZUG', x, y - 184); return true;
    }
    default: return false;
  }
}
// The stable horse: a brown pixel horse with mane, saddle and a two-frame trot (drawn for the summon, see kk_creatures).
function horseSprite(frame) {
  return sprite('horse' + frame, 50, 36, (p) => {
    const leg = (x, lift) => { p(x, 24 - lift, 3, 11, '#4a2e1a'); p(x, 34 - lift, 3, 2, '#1d140e'); };
    if (frame) { leg(10, 2); leg(16, 0); leg(32, 0); leg(38, 2); } else { leg(10, 0); leg(16, 2); leg(32, 2); leg(38, 0); }
    p(8, 12, 34, 14, '#2a1a10'); p(9, 13, 32, 12, '#8d5a34'); p(9, 13, 32, 3, '#a8703f'); p(9, 22, 32, 2, '#6b4428');
    p(38, 4, 8, 14, '#2a1a10'); p(39, 5, 6, 12, '#8d5a34'); p(43, 2, 6, 7, '#2a1a10'); p(44, 3, 5, 5, '#8d5a34'); p(47, 5, 2, 1, '#1d140e');
    for (let i = 0; i < 6; i++) p(36 - i % 2, 4 + i * 2, 3, 2, '#2a1610'); p(40, 1, 2, 3, '#2a1610');
    p(4, 13, 5, 2, '#2a1610'); p(2, 15, 4, 8, '#2a1610');
    p(18, 10, 12, 5, '#5a1f1f'); p(18, 10, 12, 1, '#8a3030'); p(22, 15, 4, 5, '#3a1a10');
  });
}
export function drawHorse(ctx, s) {
  const running = s.state === 'run' || (s.rider && Math.abs(s.vx ?? 0) > 5); const fr = running ? Math.floor((s.animTime ?? 0) * 8) % 2 : 0; const im = horseSprite(fr);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 1, 44, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (!im) { ctx.fillStyle = '#8d5a34'; ctx.fillRect(s.x - 40, s.y - 50, 80, 30); return; }
  ctx.save(); ctx.imageSmoothingEnabled = false; if ((s.facing || 1) < 0) { ctx.translate(s.x, 0); ctx.scale(-1, 1); ctx.translate(-s.x, 0); }
  ctx.drawImage(im, Math.round(s.x - im.width * S / 2), Math.round(s.y - im.height * S + (running ? -fr : 0)), im.width * S, im.height * S); ctx.restore();
}
export const biomeColor = (el) => BIOME_OF[el]?.ground;
