// GRIMGE Prototype — Kronenkrieg map generator (GRIMGE_KRONENKRIEG.md §3.2). Pure (no game imports), so it is tested in
// node. The world is ONE huge 2.5D plane (the main level, row MAIN) where everything is spread out, plus a few SECTIONS
// on an upper level (plateaus) and a lower level (depths). Levels are only changed at SHAFTS (jump in to go down) and
// LIFTS (ride up) — two pairs at the ends of every section (user, 19 Nov 2026). A new map every round, built from modular
// SITES, with a fairness check (the value reachable from every main castle) and a value cap around each main castle so
// nothing good is ever clustered at one start.

export const KK = Object.freeze({
  rows: 3, width: 19200, edgeX: 180, main: 1,
  hqInset: 1250, hqJitter: 260,
  sectionsPerLevel: 2, sectionLen: [2600, 3600], connectorInset: 320,
  bandCost: 2400,          // how far (in x px) a band switch "counts" for distances
  hqKeepOut: 1500,         // no mid castle / lair / camp this close to a main castle (same band)
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
  castle: { w: 300, value: 6, big: true }, lair: { w: 260, value: 5, big: true }, camp: { w: 200, value: 2, big: true },
  building: { w: 170, value: 1 }, goldvein: { w: 90, value: 3 }, prison: { w: 170, value: 3 }, source: { w: 120, value: 2 },
  stable: { w: 150, value: 1 }, shrine: { w: 60, value: 1 },
  shaft: { w: 140, value: 0 }, lift: { w: 140, value: 0 }
});
export const LEVEL_NAMES = Object.freeze(['HOCHEBENE', 'HAUPTEBENE', 'TIEFE']);
// Placement order matters: big and rare places first, the many buildings last (they fill what is left).
const COUNTS = Object.freeze({ castle: 14, camp: 8, lair: 4, prison: 8, stable: 5, goldvein: 14, shrine: 8, building: 30 });

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

// Where a level exists: the main plane everywhere, the upper and lower level only in their sections.
export const spanAt = (map, row, x) => (map.spans[row] ?? []).find(([x0, x1]) => x >= x0 && x <= x1) ?? null;
function attempt(rng) {
  const W = KK.width; const rows = KK.rows; const M = KK.main;
  // 1. main castles: all on the main plane, evenly spread (fair by construction), jittered; seats shuffled
  const seats = shuffle(rng, [0, 1, 2, 3]);
  const hqs = [.1, .36, .64, .9].map((f, i) => ({ id: 'hq' + i, kind: 'hq', row: M, x: Math.round(W * f + (rng() * 2 - 1) * KK.hqJitter), z: .5, seat: seats[i], level: 0 }));
  // 2. sections of the upper and lower level; their shafts and lifts keep away from every main castle
  const spans = { [M]: [[0, W]] }; const clearOfHQ = (x) => hqs.every((h) => Math.abs(h.x - x) > 900);
  for (const row of [0, 2]) {
    spans[row] = []; const slots = KK.sectionsPerLevel; const slotW = W / slots;
    for (let i = 0; i < slots; i++) {
      let best = null;
      for (let n = 0; n < 40 && !best; n++) { const len = KK.sectionLen[0] + rng() * (KK.sectionLen[1] - KK.sectionLen[0]); const x0 = i * slotW + 600 + rng() * (slotW - len - 1200); if (clearOfHQ(x0 + KK.connectorInset) && clearOfHQ(x0 + len - KK.connectorInset)) best = [Math.round(x0), Math.round(x0 + len)]; }
      spans[row].push(best ?? [Math.round(i * slotW + 2200), Math.round(i * slotW + 2200 + KK.sectionLen[0])]);
    }
  }
  // 3. biomes inside every span, every element at least once
  const biomes = []; let pool = shuffle(rng, ELEMENTS);
  for (let row = 0; row < rows; row++) for (const [sx0, sx1] of spans[row] ?? []) {
    let x = sx0;
    while (x < sx1) { const len = Math.min(sx1 - x, 1300 + Math.floor(rng() * 900)); if (!pool.length) pool = shuffle(rng, ELEMENTS); biomes.push({ row, x0: x, x1: x + len, element: pool.pop() }); x += len; }
  }
  const sites = []; const occupied = Array.from({ length: rows }, () => []);
  for (const hq of hqs) occupied[hq.row].push({ x0: hq.x - 220, x1: hq.x + 220, big: true });
  // 4. the connectors: at both ends of every section a shaft above and a lift below, at the same x
  for (const row of [0, 2]) for (const [sx0, sx1] of spans[row]) for (const x of [sx0 + KK.connectorInset, sx1 - KK.connectorInset]) {
    const upper = row === 0 ? 0 : M; const lower = row === 0 ? M : 2;
    sites.push({ id: 'shaft' + sites.length, kind: 'shaft', row: upper, x, z: .5, to: lower }); sites.push({ id: 'lift' + sites.length, kind: 'lift', row: lower, x, z: .5, to: upper });
    occupied[upper].push({ x0: x - 90, x1: x + 90, big: true }); occupied[lower].push({ x0: x - 90, x1: x + 90, big: true });
  }
  const inSpan = (row, x, w) => (spans[row] ?? []).some(([x0, x1]) => x - w / 2 > x0 + KK.edgeX * .5 && x + w / 2 < x1 - KK.edgeX * .5);
  // small places may stand one behind the other (different depth); big ones claim the whole depth of their stretch
  const free = (row, x, w, big, z = .5) => inSpan(row, x, w) && x - w / 2 > KK.edgeX && x + w / 2 < W - KK.edgeX && occupied[row].every((o) => (big || o.big ? x + w / 2 + 50 < o.x0 || x - w / 2 - 50 > o.x1 : x + w / 2 + 10 < o.x0 || x - w / 2 - 10 > o.x1 || Math.abs((o.z ?? .5) - z) > .34));
  const nearHQ = (row, x) => hqs.some((h) => h.row === row && Math.abs(h.x - x) < KK.hqKeepOut);
  // a row by its area: the main plane carries most, the sections the rest
  const area = (row) => (spans[row] ?? []).reduce((sum, [x0, x1]) => sum + x1 - x0, 0); const totalArea = [0, 1, 2].reduce((sum, r) => sum + area(r), 0);
  const pickRow = () => { let r = rng() * totalArea; for (const row of [0, 1, 2]) { if ((r -= area(row)) <= 0) return row; } return M; };
  const pickX = (row) => { const sp = spans[row]; const [x0, x1] = sp[Math.floor(rng() * sp.length)]; return x0 + rng() * (x1 - x0); };
  const place = (kind, props = {}, pick = null) => {
    const def = SITE_KINDS[kind];
    for (let n = 0; n < 160; n++) {
      const row = pick?.row ?? pickRow(); const x = pick?.x0 != null ? pick.x0 + rng() * (pick.x1 - pick.x0) : pickX(row);
      if ((def.big || kind === 'prison') && nearHQ(row, x)) continue; /* guarded places keep away from a start too */
      const z = def.big ? .42 + rng() * .16 : .2 + rng() * .62;
      if (!free(row, x, def.w, def.big, z)) continue;
      const site = { id: kind + sites.length, kind, row, x: Math.round(x), z: +z.toFixed(3), ...props };
      sites.push(site); occupied[row].push({ x0: x - def.w / 2, x1: x + def.w / 2, big: !!def.big, z }); return site;
    }
    return null;
  };
  // 5. important places: mid castles (classes spread), lairs in the sections, camps, sources in their biomes
  const classes = shuffle(rng, [...CASTLE_CLASSES, ...CASTLE_CLASSES]).slice(0, COUNTS.castle);
  classes.forEach((c) => place('castle', { cls: c.cls, weapon: c.weapon, label: c.label, owner: null }));
  for (let i = 0; i < COUNTS.camp; i++) place('camp');
  for (let i = 0; i < COUNTS.lair; i++) { const row = i % 2 ? 0 : 2; place('lair', { element: BASE_ELEMENTS[Math.floor(rng() * BASE_ELEMENTS.length)] }, { row, ...(() => { const sp = spans[row][Math.floor(i / 2) % spans[row].length]; return { x0: sp[0] + 500, x1: sp[1] - 500 }; })() }) ?? place('lair', { element: BASE_ELEMENTS[Math.floor(rng() * BASE_ELEMENTS.length)] }); }
  // a source lies in a biome of its element (the longest one); if that is full, anywhere
  for (const el of ELEMENTS) { const seg = biomes.filter((bb) => bb.element === el).sort((p2, q) => (q.x1 - q.x0) - (p2.x1 - p2.x0))[0]; (seg ? place('source', { element: el }, { row: seg.row, x0: seg.x0 + 60, x1: Math.max(seg.x0 + 61, seg.x1 - 60) }) : null) ?? place('source', { element: el }); }
  // the pure source: deep down, in the middle of a lower section
  const pureEl = BASE_ELEMENTS[Math.floor(rng() * BASE_ELEMENTS.length)];
  const pureTries = [...shuffle(rng, spans[2]).map((sp) => ({ row: 2, x0: sp[0] + 600, x1: sp[1] - 600 })), ...spans[2].map((sp) => ({ row: 2, x0: sp[0] + 200, x1: sp[1] - 200 })), ...spans[0].map((sp) => ({ row: 0, x0: sp[0] + 200, x1: sp[1] - 200 })), { row: M, x0: W * .4, x1: W * .6 }];
  for (const pk of pureTries) if (place('source', { element: pureEl, pure: true }, pk)) break; /* deep down if there is room, else the next best place */
  // 6. filling
  for (const [kind, n] of Object.entries(COUNTS)) { if (kind === 'castle' || kind === 'lair' || kind === 'camp') continue; for (let i = 0; i < n; i++) place(kind, kind === 'building' ? { floors: 1 + Math.floor(rng() * 3) } : {}); }
  return { width: W, rows, hqs, biomes, sites, spans };
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
