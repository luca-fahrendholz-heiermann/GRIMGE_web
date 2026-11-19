// GRIMGE Prototype — Kronenkrieg map generator (GRIMGE_KRONENKRIEG.md §3.2). Pure (no game imports), so it is tested in
// node. The map is a grid of wide BANDS: every band is a normal 2.5D stage (depth z 0..1) that runs far to the left and
// right; walking off its back or front edge leads into the neighbouring band. A new map every round, built from modular
// SITES, with a fairness check (the value reachable from every main castle) and a value cap around each main castle so
// nothing good is ever clustered at one start.

export const KK = Object.freeze({
  rows: 3, width: 9600, edgeX: 180,
  hqInset: 1250, hqJitter: 260,
  bandCost: 2400,          // how far (in x px) a band switch "counts" for distances
  hqKeepOut: 1500,         // no mid castle / lair / camp this close to a main castle (same band)
  hqValueCap: 20,          // value allowed within hqCapRange of a main castle (same band)
  hqCapRange: 1600,
  nearSpread: 6,           // the four surroundings may differ by at most this much value
  fairRatio: 1.12, tries: 80
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
  castle: { w: 300, value: 6, big: true }, lair: { w: 260, value: 5, big: true }, camp: { w: 200, value: 2, big: true },
  building: { w: 170, value: 2 }, goldvein: { w: 90, value: 3 }, prison: { w: 170, value: 3 }, source: { w: 120, value: 2 },
  stable: { w: 150, value: 1 }, shrine: { w: 60, value: 1 }
});
// Placement order matters: big and rare places first, the many buildings last (they fill what is left).
const COUNTS = Object.freeze({ castle: 12, camp: 6, lair: 4, prison: 6, stable: 4, goldvein: 10, shrine: 6, building: 26 });

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (rng, arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Distance as the map counts it: along x plus a fixed cost per band switch.
export const kkDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.row - b.row) * KK.bandCost;
const weight = (d) => (d < 2600 ? 1 : d < 5200 ? .6 : .3);
export function hqValues(map) {
  return map.hqs.map((hq) => map.sites.reduce((sum, s) => sum + SITE_KINDS[s.kind].value * weight(kkDistance(hq, s)), 0));
}
export function fairness(map) { const v = hqValues(map); return Math.max(...v) / Math.max(1e-6, Math.min(...v)); }
export function valueNear(map, hq, range = KK.hqCapRange) {
  return map.sites.filter((s) => s.row === hq.row && Math.abs(s.x - hq.x) < range).reduce((sum, s) => sum + SITE_KINDS[s.kind].value, 0);
}

function attempt(rng) {
  const W = KK.width; const rows = KK.rows;
  // 1. main castles: bands 0 and rows-1, left and right, jittered; seats shuffled
  const spots = [[0, KK.hqInset], [0, W - KK.hqInset], [rows - 1, KK.hqInset], [rows - 1, W - KK.hqInset]];
  const seats = shuffle(rng, [0, 1, 2, 3]);
  const hqs = spots.map(([row, x], i) => ({ id: 'hq' + i, kind: 'hq', row, x: Math.round(x + (rng() * 2 - 1) * KK.hqJitter), z: .5, seat: seats[i], level: 0 }));
  // 2. biomes: segments of 1300–2200 px per band, every element at least once
  const biomes = []; let pool = shuffle(rng, ELEMENTS);
  for (let row = 0; row < rows; row++) {
    let x = 0;
    while (x < W) { const len = Math.min(W - x, 1300 + Math.floor(rng() * 900)); if (!pool.length) pool = shuffle(rng, ELEMENTS); biomes.push({ row, x0: x, x1: x + len, element: pool.pop() }); x += len; }
  }
  const sites = []; const occupied = rows === 0 ? [] : Array.from({ length: rows }, () => []);
  for (const hq of hqs) occupied[hq.row].push({ x0: hq.x - 220, x1: hq.x + 220, big: true });
  const free = (row, x, w, big) => x - w / 2 > KK.edgeX && x + w / 2 < W - KK.edgeX && occupied[row].every((o) => (big || o.big ? x + w / 2 + 50 < o.x0 || x - w / 2 - 50 > o.x1 : x + w / 2 + 10 < o.x0 || x - w / 2 - 10 > o.x1));
  const nearHQ = (row, x) => hqs.some((h) => h.row === row && Math.abs(h.x - x) < KK.hqKeepOut);
  const place = (kind, props = {}, pick = null) => {
    const def = SITE_KINDS[kind];
    for (let n = 0; n < 140; n++) {
      const row = pick?.row ?? Math.floor(rng() * rows); const x = pick?.x0 != null ? pick.x0 + rng() * (pick.x1 - pick.x0) : KK.edgeX + rng() * (W - 2 * KK.edgeX);
      if (def.big && nearHQ(row, x)) continue;
      if (!free(row, x, def.w, def.big)) continue;
      const z = def.big ? .42 + rng() * .16 : .22 + rng() * .56;
      const site = { id: kind + sites.length, kind, row, x: Math.round(x), z: +z.toFixed(3), ...props };
      sites.push(site); occupied[row].push({ x0: x - def.w / 2, x1: x + def.w / 2, big: !!def.big }); return site;
    }
    return null;
  };
  // 3. important places: mid castles (one class each, classes spread), lairs (the middle band first), sources
  const classes = shuffle(rng, [...CASTLE_CLASSES, ...CASTLE_CLASSES]).slice(0, COUNTS.castle);
  classes.forEach((c) => place('castle', { cls: c.cls, weapon: c.weapon, label: c.label, owner: null }));
  for (let i = 0; i < COUNTS.camp; i++) place('camp');
  for (let i = 0; i < COUNTS.lair; i++) place('lair', { element: BASE_ELEMENTS[Math.floor(rng() * BASE_ELEMENTS.length)] }, i < 2 ? { row: Math.floor(rows / 2) } : null);
  // a source lies in a biome of its element (the longest one); if that is full, anywhere
  for (const el of ELEMENTS) { const seg = biomes.filter((b) => b.element === el).sort((p, q) => (q.x1 - q.x0) - (p.x1 - p.x0))[0]; (seg ? place('source', { element: el }, { row: seg.row, x0: seg.x0 + 60, x1: Math.max(seg.x0 + 61, seg.x1 - 60) }) : null) ?? place('source', { element: el }); }
  // the pure source: the middle of the middle band
  const mid = Math.floor(rows / 2); const pureEl = BASE_ELEMENTS[Math.floor(rng() * BASE_ELEMENTS.length)];
  for (const span of [.06, .12, .2, .3]) if (place('source', { element: pureEl, pure: true }, { row: mid, x0: W * (.5 - span), x1: W * (.5 + span) })) break;
  // 4. filling
  for (const [kind, n] of Object.entries(COUNTS)) { if (kind === 'castle' || kind === 'lair' || kind === 'camp') continue; for (let i = 0; i < n; i++) place(kind, kind === 'building' ? { floors: 1 + Math.floor(rng() * 3) } : {}); }
  return { width: W, rows, hqs, biomes, sites };
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

export const biomeAt = (map, row, x) => map.biomes.find((b) => b.row === row && x >= b.x0 && x < b.x1) ?? map.biomes[0];
