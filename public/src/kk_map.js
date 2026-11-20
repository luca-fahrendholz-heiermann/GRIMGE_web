// GRIMGE Prototype — Kronenkrieg map generator (GRIMGE_KRONENKRIEG.md §3.2). Pure (no game imports), so it is tested in
// node. The world is ONE huge square 2.5D board (the main level, row MAIN) where everything is spread out, plus a few SECTIONS
// on an upper level (plateaus) and a lower level (depths). Levels are only changed at SHAFTS (jump in to go down) and
// LIFTS (ride up) — two pairs at the ends of every section (user, 19 Nov 2026). A new map every round, built from modular
// SITES, with a fairness check (the value reachable from every main castle) and a value cap around each main castle so
// nothing good is ever clustered at one start.

export const KK = Object.freeze({
  rows: 3, width: 14400, edgeX: 180, main: 1,
  // A square board (user, 20 Nov 2026: "ein großes, annähernd quadratisches Spielfeld — nach oben, unten, links und rechts"):
  // 14 400 px wide and 48 depth units deep — on screen one depth unit is ~300 px, so the board is about as tall as it is wide
  // and takes about as long to cross either way.
  depth: 48, zPx: 300,
  hqJitter: 300, hqZJitter: 1.4,
  sectionsPerLevel: 2, sectionLen: [2600, 3600], connectorInset: 320,
  bandCost: 2400,          // how far (in px) a level switch "counts" for distances
  hqKeepOut: 1500,         // no mid castle / lair / camp this close to a main castle (same level, board distance)
  hqValueCap: 30,          // value allowed within hqCapRange of a main castle (same level)
  hqCapRange: 1600,
  nearSpread: 10,          // the four surroundings may differ by at most this much value
  fairRatio: 1.15, tries: 200
});

// Fighter classes a mid castle can train (weapon family → the weapon its units carry).
export const CASTLE_CLASSES = Object.freeze([
  { cls: 'Guardian', weapon: 'sword_shield', label: 'SCHILD' }, { cls: 'Ranger', weapon: 'bow', label: 'BOGEN' },
  { cls: 'Arcanist', weapon: 'arcane_staff', label: 'STAB' }, { cls: 'Lancer', weapon: 'spear', label: 'SPEER' },
  { cls: 'Berserker', weapon: 'great_axe', label: 'AXT' }, { cls: 'Shadow', weapon: 'daggers', label: 'DOLCH' },
  { cls: 'Monk', weapon: 'gauntlets', label: 'FAUST' }, { cls: 'Beastborn', weapon: 'claws', label: 'KLAUE' }
]);
export const ELEMENTS = Object.freeze(['ignis', 'ventus', 'fulgur', 'terra', 'aqua', 'frost', 'bestia', 'construct', 'void', 'lux', 'natura', 'ward', 'umbra']);
export const BASE_ELEMENTS = Object.freeze(['ignis', 'ventus', 'fulgur', 'terra', 'aqua', 'frost']);
export const BIOME_OF = Object.freeze({
  ignis: { name: 'VULKANFELD', ground: '#4a2a1e', accent: '#c4511f' }, ventus: { name: 'STURMKLIPPEN', ground: '#56635a', accent: '#bfe6d0' },
  fulgur: { name: 'GEWITTERHEIDE', ground: '#3e3b55', accent: '#ffe066' }, terra: { name: 'FELSLAND', ground: '#5b4a36', accent: '#a58a5c' },
  aqua: { name: 'SEENLAND', ground: '#2f5a5c', accent: '#5fd0e6' }, frost: { name: 'GLETSCHER', ground: '#7d93a3', accent: '#e4f6ff' },
  bestia: { name: 'WILDWALD', ground: '#33502b', accent: '#9a6b3c' }, construct: { name: 'RUINENFELD', ground: '#56544f', accent: '#b8b0a0' },
  void: { name: 'RISS', ground: '#2a1f3d', accent: '#9b6bff' }, lux: { name: 'LICHTUNG', ground: '#6c7a3e', accent: '#fff3a8' },
  natura: { name: 'GRÜNLAND', ground: '#3f6a2e', accent: '#9be564' }, ward: { name: 'SCHUTZHAIN', ground: '#4c5e66', accent: '#cfe7ff' },
  umbra: { name: 'SCHATTENSENKE', ground: '#26262e', accent: '#6a6a8a' }
});
// The modular sites: width (x px they occupy), value (for fairness), big (keeps out of a main castle's surroundings).
export const SITE_KINDS = Object.freeze({
  castle: { w: 600, value: 6, big: true }, /* the wall block with its double stair (kk_castle.js) */ lair: { w: 260, value: 5, big: true }, camp: { w: 200, value: 2, big: true },
  building: { w: 200, value: 1 }, goldvein: { w: 90, value: 3 }, prison: { w: 170, value: 3 }, source: { w: 120, value: 2 },
  stable: { w: 150, value: 1 }, shrine: { w: 60, value: 1 },
  shaft: { w: 140, value: 0 }, lift: { w: 140, value: 0 }
});
// The roads: three across and three along the board (wavy), on every level (drawn by kk_world.js, walked by the patrols,
// kept free of decor).
export const ROADS_H = Object.freeze([.22, .5, .78]); export const ROADS_V = Object.freeze([.22, .5, .78]);
export const roadZi = (i, x, row) => KK.depth * ROADS_H[i] + Math.sin(x * .0013 + row * 2.1 + i * 1.7) * 1.3;
export const roadXi = (i, z, row) => KK.width * ROADS_V[i] + Math.sin(z * .45 + row * 1.3 + i * 2.3) * 160;
// The road across the board nearest to a depth (patrols keep to it).
export const roadZ = (x, row, zNear = KK.depth / 2) => { let best = roadZi(0, x, row); for (let i = 1; i < ROADS_H.length; i++) { const z = roadZi(i, x, row); if (Math.abs(z - zNear) < Math.abs(best - zNear)) best = z; } return best; };
// How far a point is from the nearest road (in board px).
export const roadGap = (x, z, row) => Math.min(...ROADS_H.map((_, i) => Math.abs(z - roadZi(i, x, row)) * KK.zPx), ...ROADS_V.map((_, i) => Math.abs(x - roadXi(i, z, row))));
export const LEVEL_NAMES = Object.freeze(['HOCHEBENE', 'HAUPTEBENE', 'TIEFE']);
// Placement order matters: big and rare places first, the many buildings last (they fill what is left).
const COUNTS = Object.freeze({ castle: 14, camp: 12, lair: 4, prison: 10, stable: 6, goldvein: 24, shrine: 12, building: 60 });
// How far a place reaches back (−) and forward (+) in depth (its castle block, its guards, the room behind a house front).
const Z_EXT = Object.freeze({ castle: [-.62, .42], lair: [-.6, .6], camp: [-.55, .55], building: [-.36, .18], goldvein: [-.3, .3], prison: [-.4, .4], source: [-.35, .35], stable: [-.4, .3], shrine: [-.25, .25], shaft: [-.4, .4], lift: [-.4, .4] });

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (rng, arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Distance as the map counts it: across the board (a depth unit counts zPx) plus a fixed cost per level switch.
export const kkDistance = (a, b) => Math.hypot(a.x - b.x, ((a.z ?? KK.depth / 2) - (b.z ?? KK.depth / 2)) * KK.zPx) + Math.abs(a.row - b.row) * KK.bandCost;
const weight = (d) => (d < 2600 ? 1 : d < 5200 ? .6 : .3);
export function hqValues(map) {
  return map.hqs.map((hq) => map.sites.reduce((sum, s) => sum + SITE_KINDS[s.kind].value * weight(kkDistance(hq, s)), 0));
}
export function fairness(map) { const v = hqValues(map); return Math.max(...v) / Math.max(1e-6, Math.min(...v)); }
export function valueNear(map, hq, range = KK.hqCapRange) {
  return map.sites.filter((s) => s.row === hq.row && kkDistance(s, hq) < range).reduce((sum, s) => sum + SITE_KINDS[s.kind].value, 0);
}

// Where a level exists: the main plane everywhere, the upper and lower level only in their sections (full depth).
export const spanAt = (map, row, x) => (map.spans[row] ?? []).find(([x0, x1]) => x >= x0 && x <= x1) ?? null;
function attempt(rng) {
  const W = KK.width; const D = KK.depth; const rows = KK.rows; const M = KK.main;
  // 1. main castles: one in every quarter of the board (fair by construction), jittered; seats shuffled
  const seats = shuffle(rng, [0, 1, 2, 3]);
  const hqs = [[.22, .22], [.78, .22], [.22, .78], [.78, .78]].map(([fx, fz], i) => ({ id: 'hq' + i, kind: 'hq', row: M, x: Math.round(W * fx + (rng() * 2 - 1) * KK.hqJitter), z: +(D * fz + (rng() * 2 - 1) * KK.hqZJitter).toFixed(3), seat: seats[i], level: 0 }));
  // 2. sections of the upper and lower level (the whole depth of a stretch); their shafts and lifts keep away from every main castle
  const spans = { [M]: [[0, W]] }; const clearOfHQ = (x, z) => hqs.every((h) => kkDistance(h, { x, z, row: M }) > 900);
  const cz = (i) => +(D * (.3 + .4 * ((i % 2)))).toFixed(3);
  for (const row of [0, 2]) {
    spans[row] = []; const slots = KK.sectionsPerLevel; const slotW = W / slots;
    for (let i = 0; i < slots; i++) {
      let best = null;
      for (let n = 0; n < 40 && !best; n++) { const len = KK.sectionLen[0] + rng() * (KK.sectionLen[1] - KK.sectionLen[0]); const x0 = i * slotW + 600 + rng() * Math.max(1, slotW - len - 1200); if (clearOfHQ(x0 + KK.connectorInset, cz(0)) && clearOfHQ(x0 + len - KK.connectorInset, cz(1))) best = [Math.round(x0), Math.round(x0 + len)]; }
      spans[row].push(best ?? [Math.round(i * slotW + 2200), Math.round(i * slotW + 2200 + KK.sectionLen[0])]);
    }
  }
  // 3. biomes: areas around seed points (the nearest seed decides), every element at least once
  const biomes = []; let pool = shuffle(rng, ELEMENTS);
  for (let row = 0; row < rows; row++) for (const [sx0, sx1] of spans[row] ?? []) {
    const nx = Math.max(1, Math.round((sx1 - sx0) / 1800)); const nz = Math.max(1, Math.round(D / 6));
    for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) { if (!pool.length) pool = shuffle(rng, ELEMENTS); biomes.push({ row, x: Math.round(sx0 + (ix + .2 + rng() * .6) * (sx1 - sx0) / nx), z: +((iz + .2 + rng() * .6) * D / nz).toFixed(2), element: pool.pop() }); }
  }
  const sites = []; const occupied = Array.from({ length: rows }, () => []);
  for (const hq of hqs) occupied[hq.row].push({ x0: hq.x - 380, x1: hq.x + 380, z0: hq.z - .7, z1: hq.z + .5 });
  // 4. the connectors: at both ends of every section a shaft above and a lift below, at the same spot
  for (const row of [0, 2]) for (const [sx0, sx1] of spans[row]) for (const [k, x] of [sx0 + KK.connectorInset, sx1 - KK.connectorInset].entries()) {
    const upper = row === 0 ? 0 : M; const lower = row === 0 ? M : 2; const z = cz(k);
    sites.push({ id: 'shaft' + sites.length, kind: 'shaft', row: upper, x, z, to: lower }); sites.push({ id: 'lift' + sites.length, kind: 'lift', row: lower, x, z, to: upper });
    for (const r of [upper, lower]) occupied[r].push({ x0: x - 90, x1: x + 90, z0: z - .4, z1: z + .4 });
  }
  const inSpan = (row, x, w) => (spans[row] ?? []).some(([x0, x1]) => x - w / 2 > x0 + KK.edgeX * .5 && x + w / 2 < x1 - KK.edgeX * .5);
  // a place needs its own patch of the board: x stretch and depth stretch must not overlap another place (with a margin)
  const free = (row, x, w, z, kind) => { const [a, b] = Z_EXT[kind] ?? [-.3, .3]; const z0 = z + a; const z1 = z + b; if (z0 < .25 || z1 > D - .25) return false; return inSpan(row, x, w) && x - w / 2 > KK.edgeX && x + w / 2 < W - KK.edgeX && occupied[row].every((o) => x + w / 2 + 40 < o.x0 || x - w / 2 - 40 > o.x1 || z1 + .12 < o.z0 || z0 - .12 > o.z1); };
  const nearHQ = (row, x, z) => hqs.some((h) => h.row === row && kkDistance(h, { x, z, row }) < KK.hqKeepOut);
  // a level by its area: the main plane carries most, the sections the rest
  const area = (row) => (spans[row] ?? []).reduce((sum, [x0, x1]) => sum + x1 - x0, 0); const totalArea = [0, 1, 2].reduce((sum, r) => sum + area(r), 0);
  const pickRow = () => { let r = rng() * totalArea; for (const row of [0, 1, 2]) { if ((r -= area(row)) <= 0) return row; } return M; };
  const pickX = (row) => { const sp = spans[row]; const [x0, x1] = sp[Math.floor(rng() * sp.length)]; return x0 + rng() * (x1 - x0); };
  const place = (kind, props = {}, pick = null) => {
    const def = SITE_KINDS[kind];
    for (let n = 0; n < (kind === 'castle' ? 900 : 260); n++) {
      const row = pick?.row ?? pickRow(); const x = pick?.x0 != null ? pick.x0 + rng() * (pick.x1 - pick.x0) : pickX(row);
      const z = pick?.z0 != null ? pick.z0 + rng() * (pick.z1 - pick.z0) : .8 + rng() * (D - 1.6);
      if ((def.big || kind === 'prison') && nearHQ(row, x, z)) continue; /* guarded places keep away from a start too */
      if (!free(row, x, def.w, z, kind)) continue;
      const site = { id: kind + sites.length, kind, row, x: Math.round(x), z: +z.toFixed(3), ...props };
      const [a, b] = Z_EXT[kind] ?? [-.3, .3]; sites.push(site); occupied[row].push({ x0: x - def.w / 2, x1: x + def.w / 2, z0: z + a, z1: z + b }); return site;
    }
    return null;
  };
  // 5. important places: mid castles (classes spread), lairs in the sections, camps, sources in their biomes
  const classes = shuffle(rng, [...CASTLE_CLASSES, ...CASTLE_CLASSES]).slice(0, COUNTS.castle);
  classes.forEach((c) => place('castle', { cls: c.cls, weapon: c.weapon, label: c.label, owner: null }));
  for (let i = 0; i < COUNTS.camp; i++) place('camp');
  for (let i = 0; i < COUNTS.lair; i++) { const row = i % 2 ? 0 : 2; const sp = spans[row][Math.floor(i / 2) % spans[row].length]; place('lair', { element: BASE_ELEMENTS[Math.floor(rng() * BASE_ELEMENTS.length)] }, { row, x0: sp[0] + 500, x1: sp[1] - 500 }) ?? place('lair', { element: BASE_ELEMENTS[Math.floor(rng() * BASE_ELEMENTS.length)] }); }
  // a source lies in a biome of its element (near one of its seeds); if that is full, anywhere
  for (const el of ELEMENTS) { const seeds = shuffle(rng, biomes.filter((bb) => bb.element === el)); let s = null; for (const sd of seeds) { s = place('source', { element: el }, { row: sd.row, x0: sd.x - 500, x1: sd.x + 500, z0: Math.max(.8, sd.z - 2), z1: Math.min(D - .8, sd.z + 2) }); if (s) break; } if (!s) place('source', { element: el }); }
  // the pure source: deep down, in the middle of a lower section
  const pureEl = BASE_ELEMENTS[Math.floor(rng() * BASE_ELEMENTS.length)];
  const pureTries = [...shuffle(rng, spans[2]).map((sp) => ({ row: 2, x0: sp[0] + 600, x1: sp[1] - 600, z0: D * .35, z1: D * .65 })), ...spans[2].map((sp) => ({ row: 2, x0: sp[0] + 200, x1: sp[1] - 200 })), ...spans[0].map((sp) => ({ row: 0, x0: sp[0] + 200, x1: sp[1] - 200 })), { row: M, x0: W * .4, x1: W * .6 }];
  for (const pk of pureTries) if (place('source', { element: pureEl, pure: true }, pk)) break; /* deep down if there is room, else the next best place */
  // 6. filling
  for (const [kind, n] of Object.entries(COUNTS)) { if (kind === 'castle' || kind === 'lair' || kind === 'camp') continue; for (let i = 0; i < n; i++) place(kind, kind === 'building' ? { floors: 1 + Math.floor(rng() * 3) } : kind === 'shrine' && i < 3 ? { sky: true } : {}); } /* three sky shrines teach flying */
  return { width: W, depth: D, rows, hqs, biomes, sites, spans };
}

// A whole map for a seed: the fairest of the tries that also keeps every main castle's surroundings under the cap.
export function generateKKMap(seed = 1) {
  const rng = mulberry32(seed); let best = null;
  for (let t = 0; t < KK.tries; t++) {
    const map = attempt(rng);
    const near = map.hqs.map((hq) => valueNear(map, hq));
    const capped = near.every((v) => v <= KK.hqValueCap) && Math.max(...near) - Math.min(...near) <= KK.nearSpread;
    const ratio = fairness(map);
    if (capped && (!best || ratio < best.ratio)) best = { map, ratio };
    if (best && best.ratio <= KK.fairRatio) break;
  }
  const map = best?.map ?? attempt(rng);
  return { seed, ...map, fairRatio: +(best?.ratio ?? fairness(map)).toFixed(3) };
}

// The biome at a spot: the nearest seed of that level decides (areas, not strips).
export function biomeAt(map, row, x, z = KK.depth / 2) { let best = null; let bd = Infinity; for (const b of map.biomes) { if (b.row !== row) continue; const d = (b.x - x) ** 2 + ((b.z - z) * KK.zPx) ** 2; if (d < bd) { bd = d; best = b; } } return best ?? map.biomes[0]; }
