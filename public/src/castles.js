// GRIMGE Prototype — castle modules (skins) in the training arenas.
//
// A castle is a separate, team-coloured image placed on top of the painted
// scene (art_compsitum.pptx shows the intended composition). Every skin
// shares one silhouette, so one geometry describes all of them: the front
// base line, the gate side's base line and the gate. The blue castle stands
// on the left; the red one is the same kind of image mirrored on the right.
// Each team may later choose its own skin (setCastleSkin); by default a map
// uses the castle painted for it.
import { TRAINING_IMAGE, TRAINING_PROJECTION } from './training_maps.js';

// Castles only exist in the training arenas, so their ground mapping always
// uses the training projection (independent of the active mode).
const groundY = (z) => TRAINING_PROJECTION.farY + (TRAINING_PROJECTION.nearY - TRAINING_PROJECTION.farY) * z;
const depthOf = (y) => (y - TRAINING_PROJECTION.farY) / (TRAINING_PROJECTION.nearY - TRAINING_PROJECTION.farY);

export const CASTLE_SKINS = Object.freeze({
  waterfalls: 'CLASSIC KEEP', frozen: 'FROST KEEP', arcane: 'ARCANE KEEP', volcano: 'VOLCANIC KEEP',
  canyon: 'DESERT KEEP', rain: 'RAINSTONE KEEP', storm: 'STORM KEEP', ruins: 'RUINED KEEP'
});

// Footprint of the shared castle silhouette, as fractions of the castle
// image (measured from the alpha channel of the 793×1983 sources).
export const CASTLE_GEOMETRY = Object.freeze({
  frontLeft: Object.freeze({ u: 72 / 793, v: 1935 / 1983 }),
  frontRight: Object.freeze({ u: 528 / 793, v: 1932 / 1983 }),
  rearRight: Object.freeze({ u: 750 / 793, v: 1150 / 1983 }),
  // Ground point under the middle of the gate (inner side face).
  gate: Object.freeze({ u: .80, v: .785 }),
  // The rampart walkway on top is the footprint raised by the wall height:
  // its corners sit ≈ 52 % of the image height above the base corners.
  deckRise: .52
});
// The walkway lies a little inside the crenellations.
const DECK_INSET = 7;

// Placement of the LEFT castle on the scene image (percent of the image).
// Based on the pptx composition (11.81 × 52.49 %): raised so the middle of
// the gate opens exactly at the arena's middle depth (z = 0.5), nudged
// outward so its rear edge clears the painted corner brazier. Maps may
// override it.
export const CASTLE_PLACEMENT = Object.freeze({ x: .2, y: 13.56, w: 11.81, h: 52.49 });

// The painted side wall in front of a castle (left side, image percent):
// its centre line runs from the brazier pillar at (5.8 %, 56.8 %) to the
// front corner pillar at (3.5 %, 69 %). The part of that wall that meets
// the castle front is drawn again on top of the castle, so the wall visibly
// butts against the castle instead of the castle sitting on it.
const WALL_LINE = Object.freeze({ x0: 5.8, y0: 56.8, slope: -.18, halfWidth: 1.05, height: 3.2, below: 2.6 });
const PLACEMENT_BY_MAP = Object.freeze({});

const skinOverride = { blue: null, red: null };
const imageCache = new Map();

export function setCastleSkin(team, skinId) {
  skinOverride[team] = CASTLE_SKINS[skinId] ? skinId : null;
}

export function castleSkinFor(team, mapId) {
  return skinOverride[team] ?? (CASTLE_SKINS[mapId] ? mapId : 'waterfalls');
}

export function castleImageSrc(skinId, team) { return `assets/castles/${skinId}_${team}.png`; }

function castleImage(skinId, team) {
  const key = `${skinId}_${team}`;
  if (imageCache.has(key)) return imageCache.get(key);
  const entry = { image: null, loaded: false };
  imageCache.set(key, entry);
  if (typeof globalThis.Image === 'function') {
    const image = new Image();
    image.onload = () => { entry.loaded = true; };
    image.src = castleImageSrc(skinId, team);
    entry.image = image;
  }
  return entry;
}

// Start loading both castles of a map (called when the map is selected).
export function preloadCastles(mapId) {
  for (const team of ['blue', 'red']) castleImage(castleSkinFor(team, mapId), team);
}

// Where the scene image sits on the logical view (same as the background).
function sceneRect() {
  const w = TRAINING_IMAGE.width * TRAINING_IMAGE.scale;
  const h = TRAINING_IMAGE.height * TRAINING_IMAGE.scale;
  return { x: 512 - w / 2, y: TRAINING_IMAGE.anchorY - TRAINING_IMAGE.floorFrontV * h, w, h };
}

// Screen-space box of one castle (logical px) and whether it is mirrored.
export function castleBox(mapId, team, rect = sceneRect()) {
  const p = PLACEMENT_BY_MAP[mapId] ?? CASTLE_PLACEMENT;
  const w = p.w / 100 * rect.w; const h = p.h / 100 * rect.h;
  const y = rect.y + p.y / 100 * rect.h;
  const mirrored = team === 'red';
  const x = mirrored ? rect.x + rect.w - (p.x / 100 * rect.w) - w : rect.x + p.x / 100 * rect.w;
  return { x, y, w, h, mirrored };
}

// A point of the castle image (u, v fractions) in screen space.
function castlePoint(box, u, v) {
  return { x: box.mirrored ? box.x + box.w * (1 - u) : box.x + box.w * u, y: box.y + box.h * v };
}

// Ground footprint (screen space): front edge, gate-side edge, rear edge.
export function castleFootprint(mapId, team, rect = sceneRect()) {
  const box = castleBox(mapId, team, rect);
  const g = CASTLE_GEOMETRY;
  const fl = castlePoint(box, g.frontLeft.u, g.frontLeft.v);
  const fr = castlePoint(box, g.frontRight.u, g.frontRight.v);
  const rr = castlePoint(box, g.rearRight.u, g.rearRight.v);
  const rl = { x: fl.x + (rr.x - fr.x), y: fl.y + (rr.y - fr.y) };
  return [fl, fr, rr, rl];
}

// The gate on the inner side face: where minions leave the castle (world).
export function castleGatePoint(mapId, team) {
  const box = castleBox(mapId, team);
  // Ground under the middle of the gate, one step into the arena.
  const gate = castlePoint(box, CASTLE_GEOMETRY.gate.u, CASTLE_GEOMETRY.gate.v);
  return { x: gate.x + (team === 'red' ? -24 : 24), z: depthOf(gate.y) };
}

function insidePolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]; const b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function distanceToSegment(pt, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / Math.max(1e-6, dx * dx + dy * dy)));
  return Math.hypot(a.x + dx * t - pt.x, a.y + dy * t - pt.y);
}

// Does a castle stand on this ground point (world x / z)? `pad` keeps an
// actor's body outside the walls.
export function castleBlocksAt(mapId, x, z, pad = 10) {
  if (!mapId) return false;
  const pt = { x, y: groundY(z) };
  for (const team of ['blue', 'red']) {
    const poly = castleFootprint(mapId, team);
    if (insidePolygon(pt, poly)) return true;
    for (let i = 0; i < poly.length; i++) if (distanceToSegment(pt, poly[i], poly[(i + 1) % poly.length]) < pad) return true;
  }
  return false;
}

// ── Rampart deck ────────────────────────────────────────────────────────
// A walkable plane on top of each castle reaching back into the depth.
// Standing on it, an actor never falls through; its edges are walls except
// the gate side facing the arena, where one may drop down (if allowed).
export function castleDeckHeight(mapId, team) {
  return castleBox(mapId, team).h * CASTLE_GEOMETRY.deckRise;
}

const deckSurfaces = new Map();
function deckSurface(mapId, team) {
  const key = mapId + team;
  if (!deckSurfaces.has(key)) {
    deckSurfaces.set(key, Object.freeze({
      id: team + 'CastleDeck', label: (team === 'blue' ? 'Blue' : 'Red') + ' castle rampart',
      team, isCastleDeck: true, baseHeight: castleDeckHeight(mapId, team),
      xMin: -Infinity, xMax: Infinity, zMin: -Infinity, zMax: Infinity
    }));
  }
  return deckSurfaces.get(key);
}

// The deck surface over this ground point (world x / z), or null.
export function castleDeckAt(mapId, x, z) {
  if (!mapId) return null;
  const pt = { x, y: groundY(z) };
  for (const team of ['blue', 'red']) {
    const poly = castleFootprint(mapId, team);
    if (!insidePolygon(pt, poly)) continue;
    let edge = Infinity;
    for (let i = 0; i < poly.length; i++) edge = Math.min(edge, distanceToSegment(pt, poly[i], poly[(i + 1) % poly.length]));
    if (edge >= DECK_INSET) return deckSurface(mapId, team);
  }
  return null;
}

// x of the castle's gate-side edge (front-right → rear-right) at a depth.
function gateEdgeX(mapId, team, z) {
  const [, fr, rr] = castleFootprint(mapId, team);
  const y = groundY(z);
  const t = (y - fr.y) / ((rr.y - fr.y) || 1);
  return fr.x + (rr.x - fr.x) * t;
}

// Is a ground point beyond the deck's gate side, i.e. over the arena?
export function castleArenaSide(mapId, team, x, z) {
  const dir = team === 'red' ? -1 : 1;
  const deckEdge = gateEdgeX(mapId, team, z) - dir * DECK_INSET;
  return (x - deckEdge) * dir > 0;
}

// Middle of a castle's rampart (world).
export function castleDeckCenter(mapId, team) {
  const poly = castleFootprint(mapId, team);
  const y = poly.reduce((sum, p) => sum + p.y, 0) / poly.length;
  return { x: poly.reduce((sum, p) => sum + p.x, 0) / poly.length, z: depthOf(y) };
}

// Where someone walking in through the gate comes out on the rampart.
export function castleDeckEntry(mapId, team) {
  const gate = castleGatePoint(mapId, team);
  const edge = gateEdgeX(mapId, team, gate.z);
  return { x: edge + (team === 'red' ? 1 : -1) * (DECK_INSET + 12), z: gate.z };
}

// The doorway on the gate side face (world), for walking in.
export function castleGateDoor(mapId, team) {
  const gate = castleGatePoint(mapId, team);
  return { x: gateEdgeX(mapId, team, gate.z), z: gate.z };
}

// The wall piece in front of a castle (screen polygon), from just above the
// castle's front base down below it.
export function castleWallOverlay(mapId, team, rect = sceneRect()) {
  const box = castleBox(mapId, team, rect);
  const baseV = (box.y + box.h * CASTLE_GEOMETRY.frontLeft.v - rect.y) / rect.h * 100;
  const w = WALL_LINE;
  const xc = (y) => w.x0 + (y - w.y0) * w.slope;
  const top = baseV - w.height; const bottom = baseV + w.below;
  const pts = [[xc(top) - w.halfWidth, top], [xc(top) + w.halfWidth, top], [xc(bottom) + w.halfWidth, bottom], [xc(bottom) - w.halfWidth, bottom]];
  return pts.map(([px, py]) => ({ x: team === 'red' ? rect.x + rect.w * (1 - px / 100) : rect.x + rect.w * px / 100, y: rect.y + rect.h * py / 100 }));
}

// Draw both castles onto the scene: a soft contact shadow first so they sit
// on the ground, then the (mirrored) castle image, then the painted wall in
// front of it again so the wall overlaps the castle where they meet.
export function renderCastles(ctx, mapId, rect = sceneRect(), sceneImage = null) {
  if (!mapId) return;
  for (const team of ['blue', 'red']) {
    const entry = castleImage(castleSkinFor(team, mapId), team);
    if (!entry.loaded) continue;
    const box = castleBox(mapId, team, rect);
    const [fl, fr, rr, rl] = castleFootprint(mapId, team, rect);
    ctx.save();
    // Contact shadow / ambient occlusion along the base.
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath();
    ctx.moveTo(fl.x - 4, fl.y + 3); ctx.lineTo(fr.x + (box.mirrored ? -6 : 6), fr.y + 4);
    ctx.lineTo(rr.x + (box.mirrored ? -6 : 6), rr.y + 2); ctx.lineTo(rl.x, rl.y);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (box.mirrored) {
      ctx.translate(box.x + box.w, box.y);
      ctx.scale(-1, 1);
      ctx.drawImage(entry.image, 0, 0, box.w, box.h);
    } else {
      ctx.drawImage(entry.image, box.x, box.y, box.w, box.h);
    }
    ctx.restore();
    if (sceneImage) {
      const wall = castleWallOverlay(mapId, team, rect);
      ctx.save();
      ctx.beginPath();
      wall.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(sceneImage, rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
  }
}
