// GRIMGE Prototype — the base (user, 11 Nov 2026): the player's headquarters, a big tall hall to walk through — the
// story's home, with no effect on Castle Siege (there only the look of castle and minions is customised later). The menu
// points stand in it as stations (wardrobe, deck, rune altar, war table = campaign, training dummy, the gate back to the
// hub), and an armoury shows one armour stand per class with the class level above it; tapping a stand opens the
// class page for that class. First version: fixed stations, no free placing yet, no wandering Primals yet.
// 12 Nov 2026 (user): a deeper hall with more floor to walk on and two views — close with a following camera, and the
// whole room zoomed out.
// 13 Nov 2026 (user, Castle Crashers video 1:37 – 1:42): the rooms are ONE continuous world, no door that drops one
// somewhere else. The hall's staircase leads up to a raised floor, and that floor is the armoury; the camera simply
// follows the figure up and along — and never lets it leave the picture.
import { groundYForDepth } from './world.js';
import { CLASSES, classWeapons } from './classes.js';
import { openRuneVault, isRuneVaultOpen } from './rune_vault.js';
import { openCampaign, isCampaignOpen } from './campaign.js';
import { isCharacterCreationOpen } from './character_creation.js';
import { structureSurfaces, renderStructures } from './level_structures.js';
import { ui } from './ui.js';

export const BASE_SCENE = 'base_hall';
// The hall picture is a room: two tiles side by side (one mirrored), drawn in world pixels with its bottom edge on the
// bottom of the stage. Its wall / floor edge sits at 60 % of the height.
export const HALL = Object.freeze({ tileW: 1280, h: 716, tiles: 2, bottom: 576 });
export const HALL_W = HALL.tileW * HALL.tiles;
// Two rooms in a row: the hall on the ground, the armoury on a floor raised by RAISE, reached by the stairs.
export const WORLD_W = HALL_W * 2; export const RAISE = 110;
// The floor band of the hall in stage pixels (battlefield.js sets it for the mode): more than twice the old depth.
export const BASE_PROJECTION = Object.freeze({ farY: 300, nearY: 566 });
// near: the close view. deadZone: the figure moves this far from the camera's middle before the camera follows.
export const BASE_VIEWS = Object.freeze({ near: 1.28, deadZone: 46 });
const BACK_Z = .05; const FRONT_Z = .52;
const STAND_GAP = 220; const ARMOURY_X = HALL_W + 300;
const STAIRS = Object.freeze({ type: 'stairs', x0: HALL_W - 270, x1: HALL_W, zMin: .04, zMax: .3, from: 0, to: RAISE });
// The step between the floors has a body-sized collision (user, 13 Nov 2026: the sprite overlapped the step from below
// and a foot hung in the air from above). BODY: from the hall the figure stops this far before the step. EDGE: on the
// raised floor it stands this far inside; past that it drops. The head of the stairs has a small landing across EDGE.
export const STEP = Object.freeze({ body: 22, edge: 16 });
const STRUCTURES = Object.freeze([STAIRS,
  Object.freeze({ type: 'gallery', x0: HALL_W, x1: HALL_W + STEP.edge, zMin: STAIRS.zMin, zMax: STAIRS.zMax, h: RAISE }),
  Object.freeze({ type: 'gallery', x0: HALL_W + STEP.edge, x1: WORLD_W + 200, zMin: 0, zMax: 1, h: RAISE })]);
const RAISED_SURFACE = 2;
// Below the raised floor's height the step is a wall for the whole body — on the ground, in a jump and while dropping
// off the edge (then the figure slides clear of the wall instead of landing inside it).
export function baseCollide(game) {
  const p = game.player; if (!p) return false;
  const height = (p.surfaceHeight ?? 0) + Math.max(0, p.elevation ?? 0); const limit = HALL_W - STEP.body;
  if (p.x <= limit || p.x >= HALL_W + STEP.edge || height >= RAISE - 14) return false;
  p.x = Math.max(limit, p.x - 6); if (p.vx > 0) p.vx = 0;
  return true;
}
// Which of the six stand sprites a class wears.
const STAND_OF = { Guardian: 0, Oracle: 0, Runeblade: 0, Berserker: 1, Beastborn: 1, Monk: 1, Ronin: 2, Bladedancer: 2, Lancer: 2, Spiritbound: 2, Ranger: 3, Trickster: 3, Resonant: 3, Arcanist: 4, Occultist: 4, Fateweaver: 4, Shadow: 5, Reaper: 5 };
const STATIONS = Object.freeze([
  // cell = the station's picture in base_stations.png (six cells of 153 × 186, cut by prep_frames.cjs).
  { id: 'gate', x: 240, cell: 5, label: 'ZUM HUB', scale: .8 },
  { id: 'wardrobe', x: 560, cell: 3, label: 'GARDEROBE', scale: .8 },
  { id: 'deck', x: 880, cell: 4, label: 'DECK', scale: .8 },
  { id: 'runes', x: 1200, cell: 1, label: 'RUNEN', scale: .8 },
  { id: 'campaign', x: 1520, cell: 2, label: 'KAMPAGNE', scale: .8 },
  { id: 'training', x: 1840, cell: 0, label: 'TRAINING', scale: .8 }
]);
export const ROOMS = Object.freeze({
  hall: Object.freeze({ id: 'hall', label: 'HALLE', x0: 0, raise: 0, flip: 0, tint: null }),
  armoury: Object.freeze({ id: 'armoury', label: 'RÜSTKAMMER', x0: HALL_W, raise: RAISE, flip: 1, tint: 'rgba(255,196,150,.82)' })
});
export const roomAt = (x) => (x >= HALL_W ? 'armoury' : 'hall');
let theGame = null;
// The room the figure stands in.
export const baseRoom = (game = theGame) => roomAt(game?.player?.x ?? 0);
export const baseWidth = () => WORLD_W;
export const baseBounds = () => ({ left: 90, right: WORLD_W - 90 });

const images = {};
function img(name, dir = 'props') {
  let e = images[name];
  if (!e) { e = images[name] = { image: typeof Image === 'function' ? new Image() : null, loaded: false }; if (e.image) { e.image.onload = () => { e.loaded = true; }; e.image.src = `assets/scenes/${dir}/${name}.png`; } }
  return e.loaded ? e.image : null;
}
// Every thing one can walk up to: the hall holds the stations along the back wall, the armoury one stand per class
// in two staggered rows (back wall and mid floor) with a walkway between them. h = the height of the floor it stands on.
export function baseSpots(profile, inRoom = null) {
  const spots = STATIONS.map((s) => ({ ...s, z: BACK_Z, h: 0, room: 'hall', kind: 'station' }));
  const perRow = Math.ceil(CLASSES.length / 2);
  CLASSES.forEach((c, i) => {
    const front = i >= perRow; const col = front ? i - perRow : i;
    const level = Math.max(1, ...classWeapons(c.id).map((w) => profile?.weaponLevel?.(w) ?? 1));
    spots.push({ id: `class:${c.id}`, kind: 'class', room: 'armoury', h: RAISE, classId: c.id, x: ARMOURY_X + col * STAND_GAP + (front ? STAND_GAP / 2 : 0), z: front ? FRONT_Z : BACK_Z, img: `stand_${STAND_OF[c.id] ?? 0}`, label: c.name, sub: `STUFE ${level}`, worn: profile?.character?.classId === c.id, scale: .75 });
  });
  return inRoom ? spots.filter((s) => s.room === inRoom) : spots;
}
const spotY = (s) => groundYForDepth(s.z) - s.h;
const CELL = { w: 153, h: 186 };
const sizeOf = (s) => { if (s.cell != null) { const im = img('base_stations'); return { w: CELL.w * s.scale, h: CELL.h * s.scale, im, sx: s.cell * CELL.w }; } const im = img(s.img); return im ? { w: im.width * s.scale, h: im.height * s.scale, im } : { w: 70, h: 110, im: null }; };
// The spot in reach: close along the room, on the same floor and in the same depth lane (a stand in the other row
// does not count, nor anything while one is on the stairs).
export function nearestSpot(game, range = 70) {
  let best = null; let bd = Infinity; const p = game.player; const ph = p.surfaceHeight ?? 0;
  for (const s of baseSpots(game.profile)) { const dx = Math.abs(p.x - s.x); const dz = Math.abs((p.z ?? 0) - s.z); if (dx > range || dz > .3 || Math.abs(ph - s.h) > 20) continue; const d = dx + dz * 220; if (d < bd) { bd = d; best = s; } }
  return best;
}

// Build the base's floors (stairs, the raised armoury floor) and place the figure in a room.
export function setBaseRoom(game, id = 'hall') {
  const R = ROOMS[id] ?? ROOMS.hall; theGame = game;
  const bf = game.battlefield; const p = game.player;
  if (bf) bf.levelSurfaces = structureSurfaces(STRUCTURES, 0);
  if (game.modeState) { game.modeState.structures = null; game.modeState.dungeonCameraX = NaN; /* the camera snaps to the figure */ }
  if (p && bf) {
    p.x = R.x0 + 380; p.z = .55; p.vx = 0; p.vz = 0;
    p.surfaceId = R.raise ? bf.levelSurfaces[RAISED_SURFACE]?.id : null; p.surfaceHeight = R.raise;
    bf.placeOnSurface(p);
  }
  return R.id;
}

const STONE = { face: '#2f2a3a', line: '#221e2b', edge: '#8d86a0', shade: 'rgba(8,6,14,.5)' };
// One room's picture at its floor height, tinted in its own light.
// A room's picture is prepared once per room: its tint is baked into a copy, so nothing is blended per frame.
const roomPics = {};
function roomPicture(im, R) {
  if (!R.tint) return im;
  let c = roomPics[R.id];
  if (!c && typeof globalThis.document?.createElement === 'function') {
    c = globalThis.document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext?.('2d');
    if (!x) return im;
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = R.tint; x.fillRect(0, 0, c.width, c.height); roomPics[R.id] = c;
  }
  return c ?? im;
}
// The world span in view (from the canvas transform), so tiles outside it are skipped.
function viewSpan(ctx) {
  const t = ctx.getTransform?.(); const w = ctx.canvas?.width;
  return t && t.a > 0 && w > 0 ? { left: -t.e / t.a, right: (w - t.e) / t.a } : { left: -Infinity, right: Infinity };
}
function drawRoom(ctx, im, R, span) {
  const top = HALL.bottom - HALL.h - R.raise;
  if (!im) { ctx.fillStyle = '#1c1826'; ctx.fillRect(R.x0, top, HALL_W, HALL.h); return; }
  const pic = roomPicture(im, R);
  for (let k = 0; k < HALL.tiles; k++) {
    const x = R.x0 + k * HALL.tileW; if (x > span.right || x + HALL.tileW < span.left) continue;
    if ((k + R.flip) % 2) { ctx.save(); ctx.translate(x + HALL.tileW, 0); ctx.scale(-1, 1); ctx.drawImage(pic, 0, top, HALL.tileW, HALL.h); ctx.restore(); } else ctx.drawImage(pic, x, top, HALL.tileW, HALL.h);
  }
}
// The world behind everything, in world pixels (so it zooms as a whole): the hall, the raised armoury with the stone
// face of its floor along the front, the step between them, the stairs.
export function renderBaseHall(ctx) {
  const im = img(BASE_SCENE, 'campaign');
  // The picture is filtered while it scrolls: unfiltered, its pixels crawl at a zoom that is not a whole number.
  const span = viewSpan(ctx);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
  drawRoom(ctx, im, ROOMS.hall, span); drawRoom(ctx, im, ROOMS.armoury, span);
  ctx.imageSmoothingEnabled = false;
  // The front face of the raised floor: stone blocks down to the bottom of the stage.
  const faceTop = HALL.bottom - RAISE;
  ctx.fillStyle = STONE.face; ctx.fillRect(HALL_W, faceTop, HALL_W, RAISE);
  ctx.fillStyle = STONE.line;
  for (let y = faceTop + 22; y < HALL.bottom; y += 22) ctx.fillRect(HALL_W, y, HALL_W, 2);
  for (let row = 0, y = faceTop; y < HALL.bottom; y += 22, row++) for (let x = HALL_W + (row % 2 ? 32 : 0) + Math.max(0, Math.floor((span.left - HALL_W) / 64)) * 64; x < Math.min(WORLD_W, span.right); x += 64) ctx.fillRect(x, y, 2, 22);
  ctx.fillStyle = STONE.edge; ctx.fillRect(HALL_W, faceTop, HALL_W, 3);
  // The step itself: the raised floor's side throws a shadow onto the hall floor.
  const stepTop = groundYForDepth(0) - RAISE; const g = ctx.createLinearGradient(HALL_W - 46, 0, HALL_W, 0); g.addColorStop(0, 'rgba(8,6,14,0)'); g.addColorStop(1, STONE.shade);
  ctx.fillStyle = g; ctx.fillRect(HALL_W - 46, groundYForDepth(0), 46, HALL.bottom - groundYForDepth(0));
  ctx.fillStyle = STONE.edge; ctx.fillRect(HALL_W - 2, stepTop, 3, HALL.bottom - stepTop);
  renderStructures(ctx, [STAIRS], 0);
  // A name plate over the head of the stairs.
  const name = ROOMS.armoury.label; const px = HALL_W - 40; const py = groundYForDepth(STAIRS.zMin) - RAISE - 150;
  ctx.font = '700 11px Cinzel, serif'; ctx.textAlign = 'center'; const tw = ctx.measureText(name).width + 16;
  ctx.fillStyle = 'rgba(12,9,18,.86)'; ctx.fillRect(Math.round(px - tw / 2), py, Math.round(tw), 17);
  ctx.strokeStyle = '#f0d890'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(px - tw / 2) + .5, py + .5, Math.round(tw), 17);
  ctx.fillStyle = '#fff3c8'; ctx.fillText(`${name} ▶`, px, py + 13);
  ctx.restore();
}
function drawSpot(ctx, s, on, t) {
  const y = spotY(s); const { w, h, im, sx } = sizeOf(s);
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.textAlign = 'center';
  if (im && sx != null) ctx.drawImage(im, sx, 0, CELL.w, CELL.h, Math.round(s.x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
  else if (im) ctx.drawImage(im, Math.round(s.x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
  else { ctx.fillStyle = '#3a3048'; ctx.fillRect(s.x - 30, y - 100, 60, 100); }
  // Name plate above (the class level under it, the worn class marked); the one in reach bobs and glows.
  const ty = y - h - 16 - (on ? Math.sin(t * 5) * 2 + 2 : 0);
  ctx.font = '700 11px Cinzel, serif'; const tw = Math.max(ctx.measureText(s.label).width, s.sub ? ctx.measureText(s.sub).width : 0) + 14;
  ctx.fillStyle = on ? 'rgba(74,58,30,.95)' : 'rgba(12,9,18,.82)'; ctx.fillRect(Math.round(s.x - tw / 2), Math.round(ty - 12), Math.round(tw), s.sub ? 28 : 16);
  ctx.strokeStyle = s.worn ? '#8fd08a' : on ? '#f0d890' : '#4a3e5a'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(s.x - tw / 2) + .5, Math.round(ty - 12) + .5, Math.round(tw), s.sub ? 28 : 16);
  ctx.fillStyle = on ? '#fff3c8' : '#e8dcc4'; ctx.fillText(s.label, s.x, ty);
  if (s.sub) { ctx.font = '600 9px Cinzel, serif'; ctx.fillStyle = s.worn ? '#8fd08a' : '#b8a070'; ctx.fillText(s.worn ? `${s.sub} · AKTIV` : s.sub, s.x, ty + 12); }
  ctx.restore();
}
// Shadows stay on their own floor (user, 13 Nov 2026: at the foot of the raised floor the shadow lay on both levels):
// the casters are split by floor, each group is drawn clipped to its floor's side of the step.
export function baseShadowGroups(casters = []) {
  const upper = (c) => (c.surfaceHeight ?? 0) >= RAISE - 1 && c.x >= HALL_W;
  return [{ x0: -1e5, x1: HALL_W, casters: casters.filter((c) => !upper(c)) }, { x0: HALL_W, x1: 1e5, casters: casters.filter(upper) }];
}
// The spots as depth-sorted actors: the figure walks behind the front row and in front of the back row.
export function baseActors(game) {
  const near = nearestSpot(game); const t = performance.now() / 1000;
  return baseSpots(game.profile).map((s) => ({ y: spotY(s) - 4, render: (ctx) => drawSpot(ctx, s, near?.id === s.id, t) }));
}

// Views: 'near' follows the figure; 'hall' shows the whole room the figure is in. The zoom glides between them.
let view = 'near';
export const baseView = () => view;
export function setBaseView(v) { view = v === 'hall' ? 'hall' : 'near'; return view; }
// Zoom that shows a whole room on this screen.
export const hallFitZoom = (w, h) => Math.min(w / HALL_W, h / HALL.h);
// The vertical camera shift that puts a world line on a screen row (larger = the world sits lower in the picture).
export const baseShiftFor = ({ z, pivotY, worldY = 0 }, screenY, line) => (screenY - pivotY) / z + pivotY - line - worldY;
// Pure camera rule (tested): zoom z on a w × h screen → the scroll x and the vertical shift.
// Along the world: a room that fits is centred (x0 = its left edge); otherwise the camera is on the figure and stops
// at the world's ends. Up and down: a room that fits is centred on its own floor height (raise); otherwise the front
// edge of the floor under the figure (footY) sits just above the bottom of the picture, so the camera climbs the
// stairs with the figure and the wall towers above — never below the stage, never above the highest ceiling.
// vTop / vBot: the rows of the stage that are on screen. On wide phones the FILL setting zooms the stage to the full
// width and crops rows at the top and bottom — the camera frames the room inside what is left (user, 13 Nov 2026: the
// lower body was under the bottom edge at the front of the hall).
export function baseCameraFor({ z, w, h, playerX, pivotY, worldY = 0, offX = 0, footY = HALL.bottom, x0 = 0, raise = 0, worldW = HALL_W, vTop = 0, vBot = h }) {
  const span = w / z; const left = w / 2 - span / 2; const S = (screenY, line) => baseShiftFor({ z, pivotY, worldY }, screenY, line);
  const x = span >= HALL_W ? x0 + HALL_W / 2 + offX - w / 2 : Math.max(offX - left, Math.min(worldW + offX - (left + span), playerX + offX - w / 2));
  const top = HALL.bottom - HALL.h;
  const vh = vBot - vTop;
  const y = vh / z >= HALL.h ? S(vTop + vh / 2, top + HALL.h / 2 - raise) : Math.max(S(vBot, HALL.bottom), Math.min(S(vTop, top - RAISE), S(vTop + vh * .955, footY)));
  return { x, y };
}
// The figure never leaves the picture (user, 13 Nov 2026): the vertical shift is held between the one that keeps the
// head under the top edge and the one that keeps the feet above the bottom edge; the feet win when both cannot be.
export function keepFigureInView(shift, { z, h, pivotY, worldY = 0, feetY, headY, marginTop = 22, marginBottom = 26, vTop = 0, vBot = h }) {
  const lo = baseShiftFor({ z, pivotY, worldY }, vTop + marginTop, headY); const hi = baseShiftFor({ z, pivotY, worldY }, vBot - marginBottom, feetY);
  return lo > hi ? hi : Math.min(Math.max(shift, lo), hi);
}
// The close zoom for the rows on screen: never so close that the floor from back wall to front edge does not fit — else
// the camera would have to bob up and down with every step into the depth.
export const nearZoom = (visibleRows) => Math.max(.8, Math.min(BASE_VIEWS.near, visibleRows / 440));
// The camera's aim along the room: it stays while the figure is inside the dead zone and is pushed by its edges.
export const calmFollowX = (mid, playerX, dead) => Math.max(playerX - dead, Math.min(playerX + dead, mid));
let camGame = null; let camMidX = null; let camXNow = NaN; let camYNow = NaN;
export function updateBaseCamera(game, dt) {
  camGame = game; theGame = game;
  const w = game.renderWidth; const h = game.renderHeight; const state = game.modeState; const p = game.player;
  const rows = game.visibleStageRows?.() ?? { top: 0, bottom: h }; const vTop = rows.top; const vBot = rows.bottom; const vh = vBot - vTop;
  const target = view === 'hall' ? hallFitZoom(w, vh) : nearZoom(vh);
  const now = game._zoomNow ?? target; game._zoomNow = Math.abs(target - now) < .002 ? target : now + (target - now) * Math.min(1, dt * 4);
  // A calm camera (user, 13 Nov 2026: walking in the close view made one dizzy): it does not move up and down with
  // the depth walked (only with the height of the floor, never with a jump), it leaves the figure a dead zone before
  // it follows along the room, and its glide is even (no pixel steps).
  const z = game._zoomNow; const offX = game.cameraOffsetX ?? 0; const pivotY = game.zoomPivot().y; const worldY = game.worldOffsetY ?? 0;
  const floorH = p.surfaceHeight ?? 0; const R = ROOMS[roomAt(p.x)];
  const footY = groundYForDepth(.94) - floorH;
  const snap = !state || !Number.isFinite(state.dungeonCameraX);
  const mid = snap ? p.x : calmFollowX(camMidX ?? p.x, p.x, BASE_VIEWS.deadZone); camMidX = mid;
  const cam = baseCameraFor({ z, w, h, playerX: mid, pivotY, worldY, offX, footY, x0: R.x0, raise: R.raise, worldW: WORLD_W, vTop, vBot });
  camYNow = snap || !Number.isFinite(camYNow) ? cam.y : camYNow + (cam.y - camYNow) * Math.min(1, 3 * dt);
  camXNow = snap || !Number.isFinite(camXNow) ? cam.x : camXNow + (cam.x - camXNow) * Math.min(1, 7 * dt);
  // Never out of the picture: head and feet stay inside, whatever the glide is doing (stairs, a jump, a fall).
  const feetY = groundYForDepth(p.z ?? .5) - floorH; const headY = feetY - Math.max(0, p.elevation ?? 0) - 104;
  if (vh / z < HALL.h) camYNow = keepFigureInView(camYNow, { z, h, pivotY, worldY, feetY, headY, vTop, vBot });
  // The camera glides without steps (the filtered hall picture scrolls evenly): stepping it in whole pixels made the
  // whole screen judder at walking speed, which is what turned the stomach (user video, 13 Nov 2026).
  game._camY = camYNow;
  if (state) state.dungeonCameraX = camXNow;
}

// What a spot does. Screens that start a match leave the base first (a mode cannot change while one runs).
export function activateSpot(game, s) {
  if (!s) return false;
  if (s.kind === 'class') return !!ui.openCharacterScreen?.({ tabs: ['class'], focusClass: s.classId });
  if (s.id === 'gate') { game.returnToHub('base'); return true; }
  if (s.id === 'runes') return openRuneVault(game);
  if (s.id === 'wardrobe') return !!ui.openCharacterScreen?.({});
  if (s.id === 'deck') { game.returnToHub('base'); ui.setHubPage?.('deck'); return true; }
  if (s.id === 'campaign') { game.returnToHub('base'); return openCampaign(game); }
  if (s.id === 'training') { game.returnToHub('base'); game.setMatchMode('training'); game.startMatch(); return true; }
  return false;
}
// A tap on a spot in the world (world pixels); the front row wins where pictures overlap. Works in both views, so
// the whole-room view doubles as a map.
export function baseTap(game, pt) {
  const spots = baseSpots(game.profile).sort((a, b) => b.z - a.z);
  for (const s of spots) { const y = spotY(s); const { w, h } = sizeOf(s); if (Math.abs(pt.x - s.x) <= w / 2 + 8 && pt.y <= y + 10 && pt.y >= y - h - 34) return activateSpot(game, s); }
  return false;
}

// The small prompt button at the right edge (works with touch, mouse and E / Enter) names the spot in reach; the view
// button at the top left switches between the close view and the whole room (also V).
let prompt = null;
export function closeBasePrompt() {
  /* The base's zoom, vertical shift and floors never leak into another mode — also when no prompt was ever built. */
  if (camGame) { camGame._camY = 0; camGame._zoomNow = undefined; camGame = null; }
  camMidX = null; camXNow = NaN; camYNow = NaN; view = 'near'; theGame = null;
  if (!prompt) return;
  prompt.el.remove(); prompt.viewEl.remove(); globalThis.document?.removeEventListener?.('keydown', prompt.key);
  prompt = null;
}
export function updateBase(game) {
  const doc = globalThis.document; const busy = isRuneVaultOpen() || isCharacterCreationOpen() || isCampaignOpen();
  if (game.input) game.input.gameplayBlocked = busy;
  baseCollide(game);
  if (typeof doc?.createElement !== 'function' || typeof doc.body?.appendChild !== 'function') return;
  if (!prompt) {
    const el = doc.createElement('button'); el.type = 'button'; el.id = 'base-prompt';
    /* A small button at the right edge (user, 12 Nov 2026: the big one in the middle was too bulky). */
    el.style.cssText = 'position:fixed;right:max(1.5vw,env(safe-area-inset-right));top:40vh;z-index:60;max-width:26vw;font-family:Cinzel,serif;font-size:clamp(11px,1.3vw,15px);letter-spacing:.06em;color:#fff3c8;background:#6a4e1eee;border:2px solid #f0d890;border-radius:6px;padding:.45em .8em;min-height:40px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;display:none';
    const fire = (e) => { e?.preventDefault?.(); e?.stopPropagation?.(); if (prompt?.spot) activateSpot(game, prompt.spot); };
    el.addEventListener('pointerdown', fire);
    const viewEl = doc.createElement('button'); viewEl.type = 'button'; viewEl.id = 'base-view';
    viewEl.style.cssText = 'position:fixed;left:max(2vw,env(safe-area-inset-left));top:max(2vh,env(safe-area-inset-top));z-index:60;font-family:Cinzel,serif;font-size:clamp(12px,1.6vw,18px);letter-spacing:.08em;color:#fff3c8;background:#2a2234ee;border:2px solid #f0d890;padding:.5em 1em;min-height:44px;cursor:pointer';
    const toggle = (e) => { e?.preventDefault?.(); e?.stopPropagation?.(); setBaseView(view === 'hall' ? 'near' : 'hall'); };
    viewEl.addEventListener('pointerdown', toggle);
    const key = (e) => {
      if (isRuneVaultOpen() || isCharacterCreationOpen() || isCampaignOpen() || e.target?.closest?.('input')) return;
      if ((e.code === 'KeyE' || e.code === 'Enter') && prompt?.spot) fire(e);
      else if (e.code === 'KeyV') toggle(e);
    };
    doc.addEventListener('keydown', key); doc.body.appendChild(el); doc.body.appendChild(viewEl); prompt = { el, viewEl, key, spot: null };
  }
  const s = busy ? null : nearestSpot(game); prompt.spot = s;
  prompt.el.style.display = s ? 'block' : 'none';
  if (s) prompt.el.textContent = `▶ ${s.label}`;
  prompt.viewEl.style.display = busy ? 'none' : 'block';
  prompt.viewEl.textContent = view === 'hall' ? '⌕ NAH' : '⛶ GANZER RAUM';
}
