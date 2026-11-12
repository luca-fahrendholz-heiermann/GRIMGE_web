// GRIMGE Prototype — the base (user, 11 Nov 2026): the player's headquarters, a big tall hall to walk through — the
// story's home, with no effect on Castle Siege (there only the look of castle and minions is customised later). The menu
// points stand in it as stations (wardrobe, deck, rune altar, war table = campaign, training dummy, the gate back to the
// hub), and an armoury wing shows one armour stand per class with the class level above it; tapping a stand opens the
// class page for that class. First version: fixed stations, no free placing yet, no wandering Primals yet.
// 12 Nov 2026 (user): a deeper hall with more floor to walk on — the stations stand along the back wall, the armoury in
// two rows one can walk between — and two views: close with a following camera, and the whole hall zoomed out.
import { groundYForDepth } from './world.js';
import { CLASSES, classWeapons } from './classes.js';
import { openRuneVault, isRuneVaultOpen } from './rune_vault.js';
import { openCampaign, isCampaignOpen } from './campaign.js';
import { isCharacterCreationOpen } from './character_creation.js';
import { ui } from './ui.js';

export const BASE_SCENE = 'base_hall';
// The hall picture is the hall itself: two tiles side by side (the second mirrored), drawn in world pixels with its
// bottom edge on the bottom of the stage. Its wall / floor edge sits at 60 % of the height.
export const HALL = Object.freeze({ tileW: 1280, h: 716, tiles: 2, bottom: 576 });
export const HALL_W = HALL.tileW * HALL.tiles;
// The floor band of the hall in stage pixels (battlefield.js sets it for the mode): more than twice the old depth.
export const BASE_PROJECTION = Object.freeze({ farY: 300, nearY: 566 });
export const BASE_VIEWS = Object.freeze({ near: 1.15 });
const BACK_Z = .05; const FRONT_Z = .52;
const STAND_GAP = 124; const ARMOURY_X = 1420;
// Which of the six stand sprites a class wears.
const STAND_OF = { Guardian: 0, Oracle: 0, Runeblade: 0, Berserker: 1, Beastborn: 1, Monk: 1, Ronin: 2, Bladedancer: 2, Lancer: 2, Spiritbound: 2, Ranger: 3, Trickster: 3, Resonant: 3, Arcanist: 4, Occultist: 4, Fateweaver: 4, Shadow: 5, Reaper: 5 };
const STATIONS = Object.freeze([
  // cell = the station's picture in base_stations.png (six cells of 153 × 186, cut by prep_frames.cjs).
  { id: 'gate', x: 200, cell: 5, label: 'ZUM HUB', scale: .8 },
  { id: 'wardrobe', x: 410, cell: 3, label: 'GARDEROBE', scale: .8 },
  { id: 'deck', x: 620, cell: 4, label: 'DECK', scale: .8 },
  { id: 'runes', x: 830, cell: 1, label: 'RUNEN', scale: .8 },
  { id: 'campaign', x: 1040, cell: 2, label: 'KAMPAGNE', scale: .8 },
  { id: 'training', x: 1250, cell: 0, label: 'TRAINING', scale: .8 }
]);
export const baseWidth = () => HALL_W;
export const baseBounds = () => ({ left: 90, right: HALL_W - 90 });

const images = {};
function img(name, dir = 'props') {
  let e = images[name];
  if (!e) { e = images[name] = { image: typeof Image === 'function' ? new Image() : null, loaded: false }; if (e.image) { e.image.onload = () => { e.loaded = true; }; e.image.src = `assets/scenes/${dir}/${name}.png`; } }
  return e.loaded ? e.image : null;
}
// Every thing one can walk up to: the stations along the back wall, then the armoury — one stand per class in two
// staggered rows (back wall and mid floor) with a walkway between them.
export function baseSpots(profile) {
  const spots = STATIONS.map((s) => ({ ...s, z: BACK_Z, kind: 'station' }));
  const perRow = Math.ceil(CLASSES.length / 2);
  CLASSES.forEach((c, i) => {
    const front = i >= perRow; const col = front ? i - perRow : i;
    const level = Math.max(1, ...classWeapons(c.id).map((w) => profile?.weaponLevel?.(w) ?? 1));
    spots.push({ id: `class:${c.id}`, kind: 'class', classId: c.id, x: ARMOURY_X + col * STAND_GAP + (front ? STAND_GAP / 2 : 0), z: front ? FRONT_Z : BACK_Z, img: `stand_${STAND_OF[c.id] ?? 0}`, label: c.name, sub: `STUFE ${level}`, worn: profile?.character?.classId === c.id, scale: .75 });
  });
  return spots;
}
const spotY = (s) => groundYForDepth(s.z);
const CELL = { w: 153, h: 186 };
const sizeOf = (s) => { if (s.cell != null) { const im = img('base_stations'); return { w: CELL.w * s.scale, h: CELL.h * s.scale, im, sx: s.cell * CELL.w }; } const im = img(s.img); return im ? { w: im.width * s.scale, h: im.height * s.scale, im } : { w: 70, h: 110, im: null }; };
// The spot in reach: close along the hall and in the same depth lane (a stand in the other row does not count).
export function nearestSpot(game, range = 70) {
  let best = null; let bd = Infinity; const p = game.player;
  for (const s of baseSpots(game.profile)) { const dx = Math.abs(p.x - s.x); const dz = Math.abs((p.z ?? 0) - s.z); if (dx > range || dz > .3) continue; const d = dx + dz * 220; if (d < bd) { bd = d; best = s; } }
  return best;
}

// The hall behind everything: the picture in world pixels, so zooming out shows the whole room.
export function renderBaseHall(ctx) {
  const im = img(BASE_SCENE, 'campaign'); const top = HALL.bottom - HALL.h;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (!im) { ctx.fillStyle = '#1c1826'; ctx.fillRect(0, top, HALL_W, HALL.h); ctx.restore(); return; }
  for (let k = 0; k < HALL.tiles; k++) {
    const x = k * HALL.tileW;
    if (k % 2) { ctx.save(); ctx.translate(x + HALL.tileW, 0); ctx.scale(-1, 1); ctx.drawImage(im, 0, top, HALL.tileW, HALL.h); ctx.restore(); } else ctx.drawImage(im, x, top, HALL.tileW, HALL.h);
  }
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
// The spots as depth-sorted actors: the figure walks behind the front row and in front of the back row.
export function baseActors(game) {
  const near = nearestSpot(game); const t = performance.now() / 1000;
  return baseSpots(game.profile).map((s) => ({ y: spotY(s) - 4, render: (ctx) => drawSpot(ctx, s, near?.id === s.id, t) }));
}

// Views: 'near' follows the figure; 'hall' shows the whole room. The zoom glides between them.
let view = 'near';
export const baseView = () => view;
export function setBaseView(v) { view = v === 'hall' ? 'hall' : 'near'; return view; }
// Zoom that shows the whole hall on this screen.
export const hallFitZoom = (w, h) => Math.min(w / HALL_W, h / HALL.h);
// Pure camera rule (tested): zoom z on a w × h screen → the scroll x and the vertical shift that keep the hall in
// view: centred when it fits, otherwise on the figure and clamped to the hall's edges, its floor on the bottom edge.
export function baseCameraFor({ z, w, h, playerX, pivotY, worldY = 0, offX = 0 }) {
  const span = w / z; const left = w / 2 - span / 2;
  const x = span >= HALL_W ? HALL_W / 2 + offX - w / 2 : Math.max(offX - left, Math.min(HALL_W + offX - (left + span), playerX + offX - w / 2));
  const top = HALL.bottom - HALL.h;
  const y = h / z >= HALL.h ? (h / 2 - pivotY) / z + pivotY - (top + HALL.h / 2) - worldY : (h - pivotY) / z + pivotY - HALL.bottom - worldY;
  return { x, y };
}
export function updateBaseCamera(game, dt) {
  const w = game.renderWidth; const h = game.renderHeight; const state = game.modeState;
  const target = view === 'hall' ? hallFitZoom(w, h) : BASE_VIEWS.near;
  const now = game._zoomNow ?? target; game._zoomNow = Math.abs(target - now) < .002 ? target : now + (target - now) * Math.min(1, dt * 4);
  const cam = baseCameraFor({ z: game._zoomNow, w, h, playerX: game.player.x, pivotY: game.zoomPivot().y, worldY: game.worldOffsetY ?? 0, offX: game.cameraOffsetX ?? 0 });
  game._camY = cam.y;
  if (state) state.dungeonCameraX = view === 'hall' || !Number.isFinite(state.dungeonCameraX) ? cam.x : state.dungeonCameraX + (cam.x - state.dungeonCameraX) * Math.min(1, 6 * dt);
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
// the whole-hall view doubles as a map.
export function baseTap(game, pt) {
  const spots = baseSpots(game.profile).sort((a, b) => b.z - a.z);
  for (const s of spots) { const y = spotY(s); const { w, h } = sizeOf(s); if (Math.abs(pt.x - s.x) <= w / 2 + 8 && pt.y <= y + 10 && pt.y >= y - h - 34) return activateSpot(game, s); }
  return false;
}

// The prompt button at the bottom (works with touch, mouse and E / Enter) names the spot in reach; the view button
// at the top right switches between the close view and the whole hall (also V).
let prompt = null;
export function closeBasePrompt() {
  if (!prompt) return;
  prompt.el.remove(); prompt.viewEl.remove(); globalThis.document?.removeEventListener?.('keydown', prompt.key);
  if (prompt.game) { prompt.game._camY = 0; prompt.game._zoomNow = undefined; }
  prompt = null; view = 'near';
}
export function updateBase(game) {
  const doc = globalThis.document; const busy = isRuneVaultOpen() || isCharacterCreationOpen() || isCampaignOpen();
  if (game.input) game.input.gameplayBlocked = busy;
  if (typeof doc?.createElement !== 'function' || typeof doc.body?.appendChild !== 'function') return;
  if (!prompt) {
    const el = doc.createElement('button'); el.type = 'button'; el.id = 'base-prompt';
    el.style.cssText = 'position:fixed;left:50%;bottom:16vh;transform:translateX(-50%);z-index:60;font-family:Cinzel,serif;font-size:clamp(14px,2vw,22px);letter-spacing:.08em;color:#fff3c8;background:#6a4e1e;border:3px solid #f0d890;padding:.6em 1.4em;min-height:48px;box-shadow:0 3px 0 #2a1e0a;cursor:pointer;display:none';
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
    doc.addEventListener('keydown', key); doc.body.appendChild(el); doc.body.appendChild(viewEl); prompt = { el, viewEl, key, spot: null, game };
  }
  const s = busy ? null : nearestSpot(game); prompt.spot = s;
  prompt.el.style.display = s ? 'block' : 'none';
  if (s) prompt.el.textContent = s.kind === 'class' ? `▶ ${s.label} AUSRÜSTEN` : `▶ ${s.label}`;
  prompt.viewEl.style.display = busy ? 'none' : 'block';
  prompt.viewEl.textContent = view === 'hall' ? '⌕ NAH' : '⛶ GANZER SAAL';
}
