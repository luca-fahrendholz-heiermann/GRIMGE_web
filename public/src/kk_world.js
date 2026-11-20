// GRIMGE Prototype — Kronenkrieg in play, part 1: the world (GRIMGE_KRONENKRIEG.md §3). A generated map (kk_map.js) of
// wide bands; the figure walks one band at a time (a normal 2.5D stage), the bands above and below are drawn as the
// same endless ground, and walking off the back or front edge glides the camera into the neighbouring band. The map
// reveals itself while exploring (fog on the minimap). No painted background: the ground itself is the world.
import { generateKKMap, BIOME_OF, biomeAt, spanAt, KK, LEVEL_NAMES, roadZi, roadXi, ROADS_H, ROADS_V } from './kk_map.js';
import { drawKKSite, buildDecor } from './kk_art.js';
import { drawNode, updateResources } from './kk_resources.js';
import { castleActors, updateCastles } from './kk_castle.js';
import { updateWorldMap } from './kk_worldmap.js';
import { updatePortals, portalActors } from './kk_portal.js';
import { updateEvents, eventActors, bossDrop } from './kk_events.js'; // the places and the landscape in the game's pixel style
import { groundYForDepth, getGroundProjection, setGroundProjection } from './world.js';

export const KK_PROJECTION = Object.freeze({ farY: 214, nearY: 512, depth: KK.depth }); /* a deep floor: the plane should feel wide in depth too */
export const SEAT_COLORS = Object.freeze(['#4fc3f7', '#ef5350', '#7bd66b', '#ffca28']);
export const SEAT_NAMES = Object.freeze(['DU', 'ROT', 'GRÜN', 'GOLD']);
const LIFT_TIME = 1.2; /* s standing on a lift until it rises */ const SHAFT_R = 38;
const PAN_SPEED = 5.5;             // how fast the camera glides into the new band
const REVEAL_CELL = 240; const REVEAL_SAME = 900; export const REVEAL_ZCELL = .8; const REVEAL_DEPTH = 3.2; /* the fog lies on 240 px × .8 depth cells; one sees ~900 px and ~3 depth units around */

export const kkOn = (game) => game?.activeMode?.id === 'kronenkrieg' && !!game?.modeState?.kk;
export const kkState = (game) => game?.modeState?.kk ?? null;
const bandH = () => { const p = getGroundProjection(); return p.nearY - p.farY; };

// Teams: 'ffa' (every one for himself) or '2v2' (the player and the rival whose main castle shares the player's band
// against the other two). Allies share the team name, so the game treats them as friends everywhere.
export function setupKronenkrieg(game, seed = null, teamMode = game.kkTeamMode ?? 'ffa') {
  setGroundProjection(KK_PROJECTION);
  const s = Number.isFinite(seed) ? seed : (Date.now() % 1e9);
  const map = generateKKMap(s);
  const hq = map.hqs.find((h) => h.seat === 0);
  const ally = teamMode === '2v2' ? [...map.hqs].filter((h) => h.seat !== 0).sort((a, b) => Math.abs(a.x - hq.x) - Math.abs(b.x - hq.x))[0]?.seat ?? null : null; /* the neighbour on the plane */
  map.seed = s;
  const kk = { decor: buildDecor(map), map, seed: s, row: hq.row, pan: 0, liftT: 0, reveal: new Set(), time: 0, teamMode: ally != null ? '2v2' : 'ffa', allies: ally != null ? [0, ally] : [0] };
  game.modeState.kk = kk;
  const P = game.player; P.x = hq.x + 190; P.z = hq.z + .3; /* in front of the castle stair */ applyBounds(game, kk); game.battlefield.placeOnSurface(P);
  revealAround(kk, P);
  return kk;
}

// ── fog ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const cellKey = (row, x, z) => row + ':' + Math.floor(x / REVEAL_CELL) + ':' + Math.floor(z / REVEAL_ZCELL);
// Exploring (2D): the cells around the figure are revealed for the rest of the round (only the level one stands on).
export function revealAround(kk, P, rx = REVEAL_SAME, rz = REVEAL_DEPTH) {
  const D = kk.map.depth ?? KK.depth; const z0 = P.z ?? D / 2; const row = P.row ?? kk.row; /* a place reveals its own level (an event, a shrine), the player the one he stands on */
  for (let x = P.x - rx; x <= P.x + rx; x += REVEAL_CELL) for (let z = z0 - rz; z <= z0 + rz; z += REVEAL_ZCELL) kk.reveal.add(cellKey(row, Math.max(0, Math.min(kk.map.width - 1, x)), Math.max(0, Math.min(D - .01, z))));
}
export const isRevealed = (kk, row, x, z = (kk.map.depth ?? KK.depth) / 2) => kk.reveal.has(cellKey(row, x, z));

// ── levels: one huge main plane, sections above and below, joined by shafts and lifts ─────────────────────────────
// The walkable stretch of the level one stands on: the whole main plane, or the section one is in (hard edges).
export function applyBounds(game, kk = kkState(game)) {
  const P = game.player; const sp = spanAt(kk.map, kk.row, P.x) ?? kk.map.spans[kk.row]?.[0] ?? [0, kk.map.width];
  Object.assign(game.battlefield.boundsOverride, { left: sp[0] + 60, right: sp[1] - 60, farZ: .03, nearZ: KK.depth - .03 });
}
// Changes the level at x (the figure lands beside the connector, not on it); dir +1 = down, −1 = up.
export function switchLevel(game, to, x, z = null) {
  const kk = kkState(game); const P = game.player; if (to < 0 || to >= kk.map.rows || to === kk.row) return false;
  const dir = to > kk.row ? 1 : -1; kk.row = to; P.x = x; if (z != null) P.z = z; P.vz = 0; P.vx = 0;
  applyBounds(game, kk); P.x = Math.max(game.battlefield.boundsOverride.left, Math.min(game.battlefield.boundsOverride.right, P.x));
  kk.pan = dir < 0 ? -bandH() : bandH(); /* the world drops or rises one level, the camera glides after it */
  game.modeState.dungeonCameraX = game.dungeonCameraTarget?.() ?? game.modeState.dungeonCameraX;
  kk.onSwitch?.(dir); for (const fn of kk.switchHooks ?? []) fn(dir);
  revealAround(kk, P); return true;
}
// Kept for tools and tests: the level above / below at the same x (snapped into its section).
export function switchBand(game, dir) {
  const kk = kkState(game); const to = kk.row + dir; const spans = kk.map.spans[to]; if (!spans) return false;
  const x = game.player.x; const sp = spans.find(([x0, x1]) => x >= x0 && x <= x1) ?? spans.sort((p, q) => Math.abs((p[0] + p[1]) / 2 - x) - Math.abs((q[0] + q[1]) / 2 - x))[0];
  return switchLevel(game, to, Math.max(sp[0] + 80, Math.min(sp[1] - 80, x)), .55);
}
export const connectorsOf = (kk, row) => kk.map.sites.filter((s) => (s.kind === 'shaft' || s.kind === 'lift') && s.row === row);

export function updateKronenkrieg(game, dt) {
  const kk = kkState(game); if (!kk) return;
  kk.time += dt;
  updateResources(game, dt); updateCastles(game, dt); updateWorldMap(game); updatePortals(game, dt); updateEvents(game, dt); kk.onBossDeath ??= (rec) => bossDrop(game, rec);
  const P = game.player;
  if (P.isAlive) { /* a rider steps off at a shaft or lift (the mount follows if it is part of the squad) */
    // a shaft: walking into the hole drops one level down, beside the lift that leads back up
    const shaft = connectorsOf(kk, kk.row).find((s) => s.kind === 'shaft' && Math.abs(P.x - s.x) < SHAFT_R && Math.abs(P.z - s.z) < .12 && P.grounded !== false);
    if (shaft) { P.dismount?.(); switchLevel(game, shaft.to, shaft.x + 80, .6); game.showAnnouncement?.(`HINAB — ${LEVEL_NAMES[shaft.to]}`, 1.2); kk.liftT = 0; }
    // a lift: standing on its platform for a moment rises one level up, beside the shaft
    const lift = connectorsOf(kk, kk.row).find((s) => s.kind === 'lift' && Math.abs(P.x - s.x) < 46 && Math.abs(P.z - s.z) < .14);
    kk.liftT = lift ? kk.liftT + dt : 0; kk.liftAt = lift?.id ?? null;
    if (lift && kk.liftT >= LIFT_TIME) { kk.liftT = 0; P.dismount?.(); switchLevel(game, lift.to, lift.x + 110, .66); game.showAnnouncement?.(`HINAUF — ${LEVEL_NAMES[lift.to]}`, 1.2); }
  } else kk.liftT = 0;
  kk.pan += (0 - kk.pan) * Math.min(1, dt * PAN_SPEED); if (Math.abs(kk.pan) < .5) kk.pan = 0;
  revealAround(kk, P);
}
export const kkPanY = (game) => (kkOn(game) ? kkState(game).pan : 0);

// ── drawing: the endless ground ────────────────────────────────────────────────────────────────────────────────────
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const tileBiome = new Map();
function drawBandGround(ctx, kk, row, off, x0, x1, y0 = -Infinity, y1 = Infinity) {
  const p = getGroundProjection(); const top = p.farY + off; const Hz = p.nearY - p.farY; const H = Hz * KK.depth; /* Hz: one depth unit; H: the whole deep floor */
  const ya = Math.max(top, Math.floor((y0 - top) / 32) * 32 + top); const yb = Math.min(top + H, y1); const T = 32;
  if (tileBiome.size > 60000) tileBiome.clear();
  for (let ty = ya; ty < yb; ty += T) for (let tx = Math.floor(x0 / T) * T; tx < x1; tx += T) {
    const key = `${kk.seed}:${row}:${tx}:${ty - top}`; let el = tileBiome.get(key); if (!el) { el = biomeAt(kk.map, row, tx + T / 2, (ty - top + T / 2) / Hz).element; tileBiome.set(key, el); }
    const b = BIOME_OF[el]; ctx.fillStyle = b.ground; ctx.fillRect(tx, Math.floor(ty), T + 1, T + 1);
    // soft blotches, then crisp pixel speckle and the biome accent
    const h0 = hash(tx * .7 + row * 31, (ty - top) * 1.3); if (h0 > .62) { ctx.fillStyle = h0 > .86 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.07)'; for (let k = -2; k <= 2; k++) { const ww = 26 * (1 - Math.abs(k) / 3); ctx.fillRect(Math.floor(tx + (T - ww) / 2), Math.floor(ty + 14 + k * 3), Math.floor(ww), 3); } }
    for (let k = 0; k < 4; k++) { const h = hash(tx + row * 9973 + k * 17, ty - top + k * 5); if (h < .55) continue; ctx.fillStyle = h > .96 ? b.accent : h > .82 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.16)'; ctx.fillRect(tx + Math.floor(hash(ty, tx + k) * (T - 3)), Math.floor(ty + hash(tx + k, ty) * (T - 2)), h > .96 ? 2 : 3, 2); }
  }
  // the roads: three across, three along the board (a little wavy), stones at their edges
  ctx.fillStyle = 'rgba(176,150,108,.55)';
  for (let i = 0; i < ROADS_H.length; i++) for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) { const y = top + roadZi(i, x, row) * Hz; if (y < y0 - 20 || y > y1 + 20) continue; ctx.fillRect(x, Math.floor(y - 9), 16, 18); }
  for (let i = 0; i < ROADS_V.length; i++) for (let y = Math.max(top, Math.floor(y0 / 8) * 8); y < Math.min(top + H, y1); y += 8) { const x = roadXi(i, (y - top) / Hz, row); if (x < x0 - 40 || x > x1 + 40) continue; ctx.fillRect(Math.floor(x - 22), y, 44, 9); }
  ctx.fillStyle = 'rgba(0,0,0,.22)'; if (top >= y0 && top <= y1) ctx.fillRect(Math.floor(x0), Math.floor(top), Math.ceil(x1 - x0), 2);
}
// Static look of every site kind (drawn on the ground at its depth; neighbour bands dimmed).
export function drawSite(ctx, site, y, t = 0, opts = {}) {
  if (drawKKSite(ctx, site, y, t, opts)) return; /* painted castles, props and pixel sprites (kk_art.js); the plain shapes below are the fallback */
  const x = site.x; const own = opts.ownerColor ?? null; ctx.save();
  const px = (X, Y, W, Hh, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(X), Math.round(Y), Math.round(W), Math.round(Hh)); };
  const shadow = (w) => { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 2, w, w * .18, 0, 0, Math.PI * 2); ctx.fill(); };
  switch (site.kind) {
    case 'hq': case 'castle': {
      const big = site.kind === 'hq'; const W = big ? 300 : 230; const Hh = big ? 150 : 110; const stone = big ? ['#8d8f99', '#6c6e78', '#4c4e58'][0] : '#7d7a72';
      const tier = big ? (site.level ?? 0) : (site.level ?? 0); const mat = ['#8a6a42', '#8d8f99', '#9fb4c4', '#2b2235'][Math.min(3, tier)];
      shadow(W * .55); px(x - W / 2, y - Hh, W, Hh, big ? mat : stone); px(x - W / 2, y - Hh, W, 6, 'rgba(255,255,255,.18)');
      for (let i = 0; i < 7; i++) px(x - W / 2 + i * W / 7 + 4, y - Hh - 12, W / 7 - 8, 12, big ? mat : stone);
      for (const s of [-1, 1]) { px(x + s * W / 2 - (s > 0 ? 44 : 0), y - Hh - 50, 44, Hh + 50, big ? mat : stone); px(x + s * W / 2 - (s > 0 ? 44 : 0) - 4, y - Hh - 58, 52, 10, 'rgba(0,0,0,.25)'); }
      px(x - 26, y - 64, 52, 64, '#2a1d14'); px(x - 22, y - 60, 44, 60, '#3a2a1e');
      const banner = own ?? '#9e9e9e'; px(x - 3, y - Hh - 96, 4, 50, '#3b2b1b'); px(x + 1, y - Hh - 96, 34, 22, banner);
      if (site.label) { ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(site.label, x + 18, y - Hh - 81); }
      if (big && site.element) px(x - W / 2 + 10, y - 20, W - 20, 4, opts.elementColor ?? '#fff');
      break;
    }
    case 'building': {
      const W = 150; const Hh = 70 + (site.floors ?? 1) * 26; shadow(80);
      px(x - W / 2, y - Hh, W, Hh, '#6b5a48'); px(x - W / 2, y - Hh, W, 4, 'rgba(255,255,255,.15)');
      ctx.fillStyle = '#4a2f22'; ctx.beginPath(); ctx.moveTo(x - W / 2 - 10, y - Hh); ctx.lineTo(x, y - Hh - 46); ctx.lineTo(x + W / 2 + 10, y - Hh); ctx.closePath(); ctx.fill();
      for (let f = 0; f < (site.floors ?? 1); f++) for (const wx of [-44, 24]) px(x + wx, y - 52 - f * 26, 18, 14, opts.looted ? '#1d1712' : '#f2c46a');
      px(x - 14, y - 40, 28, 40, '#2a1d14');
      break;
    }
    case 'goldvein': {
      shadow(46); ctx.fillStyle = '#5c5048'; ctx.beginPath(); ctx.moveTo(x - 44, y); ctx.lineTo(x - 30, y - 40); ctx.lineTo(x + 6, y - 52); ctx.lineTo(x + 40, y - 26); ctx.lineTo(x + 46, y); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 7; i++) px(x - 30 + hash(i, site.x) * 60, y - 8 - hash(site.x, i) * 36, 5, 4, (t * 3 + i) % 4 < 1 ? '#fff6c2' : '#ffcf3a');
      break;
    }
    case 'prison': {
      shadow(80); px(x - 70, y - 70, 140, 70, 'rgba(60,46,36,.4)');
      for (let i = 0; i < 9; i++) px(x - 68 + i * 17, y - 74, 4, 74, '#3b2b1b'); px(x - 72, y - 76, 144, 6, '#3b2b1b');
      for (let i = 0; i < 3; i++) px(x - 40 + i * 30, y - 34, 12, 30, opts.freed ? 'rgba(0,0,0,0)' : '#c9b38a');
      break;
    }
    case 'source': {
      const c = opts.elementColor ?? '#9be6ff'; shadow(54); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y - 4, 50, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c; ctx.globalAlpha = .75 + .2 * Math.sin(t * 3 + x); ctx.beginPath(); ctx.ellipse(x, y - 5, 42, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .35 + .15 * Math.sin(t * 2); px(x - 3, y - 60 - (site.pure ? 40 : 0), 6, 56 + (site.pure ? 40 : 0), c); ctx.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; px(x + Math.cos(a) * 52, y - 6 + Math.sin(a) * 12, 7, 6, '#6d6a66'); }
      break;
    }
    case 'lair': {
      shadow(120); ctx.fillStyle = '#2b2522'; ctx.beginPath(); ctx.moveTo(x - 120, y); ctx.quadraticCurveTo(x - 80, y - 120, x, y - 130); ctx.quadraticCurveTo(x + 90, y - 120, x + 120, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0d0a09'; ctx.beginPath(); ctx.ellipse(x, y - 30, 46, 34, 0, Math.PI, 0); ctx.fill(); px(x - 46, y - 30, 92, 30, '#0d0a09');
      for (let i = 0; i < 5; i++) px(x - 80 + i * 38, y - 4 - hash(i, x) * 6, 14, 4, '#e8e0d0');
      break;
    }
    case 'camp': {
      shadow(90); for (const [dx, c] of [[-54, '#7a3b2e'], [10, '#5d4a2e'], [62, '#7a3b2e']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + dx - 34, y); ctx.lineTo(x + dx, y - 54); ctx.lineTo(x + dx + 34, y); ctx.closePath(); ctx.fill(); }
      px(x - 6, y - 14, 12, 8, '#ff9a3c'); px(x - 3, y - 22, 6, 8, '#ffd27a'); px(x - 2, y - 90, 3, 44, '#3b2b1b'); px(x + 1, y - 90, 26, 16, '#2b2b2b');
      break;
    }
    case 'stable': {
      shadow(80); px(x - 70, y - 60, 140, 60, '#7a5a3a'); ctx.fillStyle = '#5a3a24'; ctx.beginPath(); ctx.moveTo(x - 80, y - 60); ctx.lineTo(x, y - 92); ctx.lineTo(x + 80, y - 60); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 4; i++) px(x - 62 + i * 34, y - 20, 4, 20, '#4a3020'); px(x - 64, y - 22, 128, 4, '#4a3020');
      break;
    }
    case 'trial': {
      // a crowning trial: a dark obelisk with a ring of light in the colour of the chosen path
      const c = opts.elementColor ?? '#ffe9a8'; shadow(70); px(x - 18, y - 120, 36, 120, '#2b2235'); px(x - 24, y - 126, 48, 8, '#3d3150');
      ctx.globalAlpha = site.won ? .25 : .55 + .35 * Math.sin(t * 3); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 70, 16, 0, 0, Math.PI * 2); ctx.stroke(); px(x - 4, y - 110, 8, 90, c); ctx.globalAlpha = 1;
      ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff3c8'; ctx.fillText(site.won ? 'PRÜFUNG BESTANDEN' : `PRÜFUNG ${site.stage === 8 ? 'I' : 'II'}`, x, y - 134);
      break;
    }
    case 'shrine': {
      shadow(24); px(x - 10, y - 70, 20, 70, '#9a9a9a'); px(x - 14, y - 74, 28, 6, '#bdbdbd'); ctx.globalAlpha = .5 + .4 * Math.sin(t * 2.5 + x); px(x - 4, y - 66, 8, 8, '#bfe6ff'); ctx.globalAlpha = 1;
      break;
    }
    default: break;
  }
  ctx.restore();
}
const ELEMENT_COLOR = Object.freeze({ ignis: '#ff7a3c', ventus: '#bfe6d0', fulgur: '#ffe066', terra: '#c49a5c', aqua: '#5fd0e6', frost: '#d8f4ff', bestia: '#c98a4a', construct: '#c0b8a8', void: '#9b6bff', lux: '#fff3a8', natura: '#9be564', ward: '#cfe7ff', umbra: '#8a8aaa' });
export const elementColor = (el) => ELEMENT_COLOR[el] ?? '#ffffff';
export function siteOpts(kk, site) {
  const o = {};
  if (site.kind === 'hq') o.ownerColor = SEAT_COLORS[site.seat];
  if (site.kind === 'castle' && site.owner != null) o.ownerColor = SEAT_COLORS[site.owner];
  if (site.element) o.elementColor = elementColor(site.element);
  o.biome = biomeAt(kk.map, site.row, site.x, site.z).element;
  o.friendly = site.kind === 'hq' ? kk.allies?.includes(site.seat) : site.owner != null && kk.allies?.includes(site.owner);
  if (site.looted) o.looted = true; if (site.freed) o.freed = true;
  if (site.kind === 'building') { o.inside = kk.inside === site; o.fadeFront = !!kk.inside && !o.inside && site.z > kk.inside.z && Math.abs(site.x - kk.inside.x) < 220; } /* a house in front of the one you are in turns see-through */
  if (site.kind === 'lift') o.liftK = kk.liftAt === site.id ? Math.min(1, kk.liftT / LIFT_TIME) : 0;
  return o;
}

// The ground of the level one stands on (world space, before the actors). x0/x1: the visible world span. Above the
// floor each level has its own air: dusk sky over the plateaus, night over the main plane, a rock ceiling in the depths.
const SITE_W = Object.freeze({ building: 200, goldvein: 90, prison: 170, source: 120, stable: 150, shrine: 60, shaft: 140, lift: 140, lair: 260, camp: 200, trial: 200 });
export function renderKKGround(ctx, game, x0, x1, y0 = -Infinity, y1 = Infinity) {
  const kk = kkState(game); if (!kk) return; const p = getGroundProjection(); const H = bandH(); const row = kk.row; const t = kk.time; const nearEdge = groundYForDepth(KK.depth); /* the near edge of the deep floor */
  const above = row === 0 ? ['#2a3350', '#141a2c'] : row === KK.main ? ['#11141f', '#090b12'] : ['#140d0a', '#0a0605'];
  ctx.fillStyle = above[1]; ctx.fillRect(Math.floor(x0), p.farY - H * 3, Math.ceil(x1 - x0), H * 3);
  ctx.fillStyle = above[0]; ctx.fillRect(Math.floor(x0), p.farY - 70, Math.ceil(x1 - x0), 70);
  if (row === 2) { ctx.fillStyle = '#20150f'; for (let x = Math.floor(x0 / 46) * 46; x < x1; x += 46) { const hh = 26 + hash(x, 7) * 60; ctx.beginPath(); ctx.moveTo(x, p.farY - H); ctx.lineTo(x + 23, p.farY - H + hh + 60); ctx.lineTo(x + 46, p.farY - H); ctx.closePath(); ctx.fill(); } }
  if (row === 0) { ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 40; i++) { const sx = Math.floor(x0 / 400) * 400 + hash(i, 3) * 4000; if (sx > x0 && sx < x1) ctx.fillRect(Math.floor(sx), Math.floor(p.farY - 40 - hash(3, i) * 200), 2, 2); } }
  drawBandGround(ctx, kk, row, 0, x0, x1, y0, y1);
  // outside the sections of this level: solid rock (the walls of the plateau / the cave)
  if (row !== KK.main) { ctx.fillStyle = '#17120f'; let cx = x0; const spans = [...(kk.map.spans[row] ?? [])].sort((a, b) => a[0] - b[0]); for (const [s0, s1] of spans) { if (s0 > cx) ctx.fillRect(Math.floor(cx), p.farY - 4, Math.ceil(Math.min(s0, x1) - cx), H + 8); cx = Math.max(cx, s1); } if (cx < x1) ctx.fillRect(Math.floor(cx), p.farY - 4, Math.ceil(x1 - cx), H + 8);
    ctx.fillStyle = '#2a201a'; for (const [s0, s1] of spans) for (const e of [s0, s1]) if (e > x0 - 20 && e < x1 + 20) for (let y = Math.max(p.farY, Math.floor(y0 / 12) * 12); y < Math.min(nearEdge, y1); y += 12) ctx.fillRect(Math.floor(e - 6 + hash(e, y) * 6), y, 8, 10); }
  // under the floor: the cliff face of the level
  ctx.fillStyle = row === 2 ? '#120c09' : '#1a1410'; ctx.fillRect(Math.floor(x0), nearEdge, Math.ceil(x1 - x0), H * 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let x = Math.floor(x0 / 24) * 24; x < x1; x += 24) ctx.fillRect(x + Math.floor(hash(x, 1) * 10), nearEdge + 6 + Math.floor(hash(1, x) * 30), 10, 3);
  void t;
}
// Inside a house or a castle hall (user, 20 Nov 2026: "Goldadern etc. dürfen nicht in Innenräume ragen — klare Ebenen"):
// a world piece overlapping the room is hidden when it stands at the room's depth or behind it, and faded in front of it.
export function roomClip(kk, x, z, half = 40) {
  const r = kk?.inside; if (!r) return null;
  const house = r.kind === 'building'; const rHalf = house ? 148 : (r.kind === 'hq' ? 258 : 208); const front = house ? r.z + .02 : r.z - .01;
  if (Math.abs(x - r.x) >= rHalf + half) return null;
  return z < front + .015 ? 'hide' : 'fade';
}
const clipped = (kk, x, z, half, render) => { const c = roomClip(kk, x, z, half); if (c === 'hide') return null; if (c !== 'fade') return render; return (ctx) => { ctx.save(); ctx.globalAlpha *= .28; render(ctx); ctx.restore(); }; };
// The places of the current band take part in the depth order (a figure behind a castle is hidden by it).
export function kkActors(game) {
  const kk = kkState(game); if (!kk) return [];
  const out = [];
  const P0 = game.player; const nearP = (s) => Math.abs(s.x - P0.x) < 1900 && Math.abs(s.z - P0.z) < 7; /* only what can be on screen */
  for (const s of [...kk.map.hqs, ...kk.map.sites]) { if (s.row !== kk.row || s.kind === 'castle' || s.kind === 'hq' || s.kind === 'event' || !nearP(s)) continue; /* events: kk_events.js */ const r = kk.inside === s ? (ctx) => drawSite(ctx, s, groundYForDepth(s.z), kk.time, siteOpts(kk, s)) : clipped(kk, s.x, s.z, (SITE_W[s.kind] ?? 120) / 2, (ctx) => drawSite(ctx, s, groundYForDepth(s.z), kk.time, siteOpts(kk, s))); if (r) out.push({ y: groundYForDepth(s.z), render: r }); }
  const P = game.player; for (const d of kk.decor ?? []) { if (d.row !== kk.row || Math.abs(d.x - P.x) > 1400 || Math.abs(d.z - P.z) > 6) continue; const r = clipped(kk, d.x, d.z, 34, (ctx) => drawNode(ctx, d, groundYForDepth(d.z))); if (r) out.push({ y: groundYForDepth(d.z), render: r }); } /* resource nodes: kk_resources.js */
  out.push(...castleActors(game), ...portalActors(game), ...eventActors(game)); /* the castles: solid wall blocks with rampart and stairs (kk_castle.js) */
  return out;
}

// ── minimap (screen space, top right) ──────────────────────────────────────────────────────────────────────────────
const KIND_ICON = Object.freeze({ castle: '♜', lair: '☠', camp: '⚑', building: '⌂', goldvein: '◆', prison: '⛓', source: '◉', stable: '♞', shrine: '✧', trial: '✪', event: '✹', shaft: '⇩', lift: '⇧' });
export function renderKKMinimap(ctx, game, viewW, opts = {}) {
  const kk = kkState(game); if (!kk) return; const map = kk.map; const D = map.depth ?? KK.depth; const row = kk.row;
  const S = opts.size ?? 150; const x0 = opts.x ?? viewW - S - 14; const y0 = opts.y ?? 14; const sx = S / map.width; const sz = S / D;
  ctx.save(); ctx.fillStyle = 'rgba(6,6,12,.85)'; ctx.fillRect(x0 - 3, y0 - 3, S + 6, S + 6);
  ctx.fillStyle = 'rgba(30,24,20,.95)'; ctx.fillRect(x0, y0, S, S); /* rock where the level does not exist */
  const cw = REVEAL_CELL * sx; const ch = REVEAL_ZCELL * sz;
  for (const [s0, s1] of map.spans?.[row] ?? [[0, map.width]]) for (let x = Math.floor(s0 / REVEAL_CELL) * REVEAL_CELL; x < s1; x += REVEAL_CELL) for (let z = 0; z < D; z += REVEAL_ZCELL) {
    if (!isRevealed(kk, row, x, z)) { ctx.fillStyle = 'rgba(10,10,16,1)'; ctx.fillRect(x0 + x * sx, y0 + z * sz, cw + .6, ch + .6); continue; }
    ctx.fillStyle = BIOME_OF[biomeAt(map, row, x + REVEAL_CELL / 2, z + REVEAL_ZCELL / 2).element].ground; ctx.fillRect(x0 + x * sx, y0 + z * sz, cw + .6, ch + .6);
  }
  if (opts.flood) opts.flood(ctx, x0, y0, sx, sz);
  for (const s of map.sites) { if (s.row !== row || !isRevealed(kk, s.row, s.x, s.z)) continue; ctx.fillStyle = s.kind === 'castle' ? (s.owner != null ? SEAT_COLORS[s.owner] : '#b8ae9e') : s.kind === 'source' ? elementColor(s.element) : 'rgba(232,226,208,.7)'; const r = s.kind === 'castle' ? 3 : 1.5; ctx.fillRect(x0 + s.x * sx - r, y0 + s.z * sz - r, r * 2, r * 2); }
  for (const h of map.hqs) { if (h.row !== row || (!kk.allies.includes(h.seat) && !isRevealed(kk, h.row, h.x, h.z))) continue; ctx.fillStyle = SEAT_COLORS[h.seat]; ctx.fillRect(x0 + h.x * sx - 4, y0 + h.z * sz - 4, 8, 8); ctx.strokeStyle = '#000'; ctx.strokeRect(x0 + h.x * sx - 4, y0 + h.z * sz - 4, 8, 8); }
  for (const extra of opts.dots ?? []) { if (extra.row !== row) continue; ctx.fillStyle = extra.color; ctx.fillRect(x0 + extra.x * sx - 2, y0 + (extra.z ?? D / 2) * sz - 2, 4, 4); }
  const P = game.player; const blink = Math.sin(kk.time * 8) > 0; ctx.fillStyle = blink ? '#ffffff' : SEAT_COLORS[0]; ctx.fillRect(x0 + P.x * sx - 3, y0 + P.z * sz - 3, 6, 6);
  ctx.restore();
}
