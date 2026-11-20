// GRIMGE Prototype — Kronenkrieg in play, part 1: the world (GRIMGE_KRONENKRIEG.md §3). A generated map (kk_map.js) of
// wide bands; the figure walks one band at a time (a normal 2.5D stage), the bands above and below are drawn as the
// same endless ground, and walking off the back or front edge glides the camera into the neighbouring band. The map
// reveals itself while exploring (fog on the minimap). No painted background: the ground itself is the world.
import { generateKKMap, BIOME_OF, biomeAt, spanAt, KK, LEVEL_NAMES } from './kk_map.js';
import { drawKKSite, buildDecor } from './kk_art.js';
import { drawNode, updateResources } from './kk_resources.js';
import { castleActors, updateCastles } from './kk_castle.js'; // the places and the landscape in the game's pixel style
import { groundYForDepth, getGroundProjection, setGroundProjection } from './world.js';

export const KK_PROJECTION = Object.freeze({ farY: 214, nearY: 512 }); /* a deep floor: the plane should feel wide in depth too */
export const SEAT_COLORS = Object.freeze(['#4fc3f7', '#ef5350', '#7bd66b', '#ffca28']);
export const SEAT_NAMES = Object.freeze(['DU', 'ROT', 'GRÜN', 'GOLD']);
const LIFT_TIME = 1.2; /* s standing on a lift until it rises */ const SHAFT_R = 38;
const PAN_SPEED = 5.5;             // how fast the camera glides into the new band
const REVEAL_CELL = 240; const REVEAL_SAME = 900;

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
  const P = game.player; P.x = hq.x + 190; P.z = .6; applyBounds(game, kk); game.battlefield.placeOnSurface(P);
  revealAround(kk, P);
  return kk;
}

// ── fog ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const cellKey = (row, x) => row + ':' + Math.floor(x / REVEAL_CELL);
export function revealAround(kk, P) {
  /* only the level one stands on: the others are seen when one goes there */
  for (let x = P.x - REVEAL_SAME; x <= P.x + REVEAL_SAME; x += REVEAL_CELL) kk.reveal.add(cellKey(kk.row, Math.max(0, Math.min(kk.map.width - 1, x))));
}
export const isRevealed = (kk, row, x) => kk.reveal.has(cellKey(row, x));

// ── levels: one huge main plane, sections above and below, joined by shafts and lifts ─────────────────────────────
// The walkable stretch of the level one stands on: the whole main plane, or the section one is in (hard edges).
export function applyBounds(game, kk = kkState(game)) {
  const P = game.player; const sp = spanAt(kk.map, kk.row, P.x) ?? kk.map.spans[kk.row]?.[0] ?? [0, kk.map.width];
  Object.assign(game.battlefield.boundsOverride, { left: sp[0] + 60, right: sp[1] - 60, farZ: .03, nearZ: .97 });
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
  updateResources(game, dt); updateCastles(game, dt);
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
function drawBandGround(ctx, kk, row, off, x0, x1) {
  const p = getGroundProjection(); const top = p.farY + off; const H = p.nearY - p.farY;
  for (const bio of kk.map.biomes) {
    if (bio.row !== row || bio.x1 < x0 || bio.x0 > x1) continue;
    const b = BIOME_OF[bio.element]; const a = Math.max(bio.x0, x0); const e = Math.min(bio.x1, x1);
    ctx.fillStyle = b.ground; ctx.fillRect(Math.floor(a), Math.floor(top), Math.ceil(e - a) + 1, Math.ceil(H) + 1);
    // soft patches (darker and lighter blotches, 64 px tiles), then crisp pixel speckle and the biome accent (16 px tiles)
    for (let tx = Math.floor(a / 64) * 64; tx < e; tx += 64) for (let ty = 0; ty < H; ty += 40) {
      const h = hash(tx * .7 + row * 31, ty * 1.3); if (h < .45) continue;
      ctx.fillStyle = h > .8 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.07)'; const bw = 30 + h * 34; const bx = tx + hash(ty, tx) * 30; const by = top + ty + hash(tx, ty) * 20;
      /* a soft pixel blob: a few stacked rows, widest in the middle */ for (let k = -3; k <= 3; k++) { const ww = bw * (1 - Math.abs(k) / 4); ctx.fillRect(Math.floor(bx + (bw - ww) / 2), Math.floor(by + k * 3), Math.floor(ww), 3); }
    }
    for (let tx = Math.floor(a / 16) * 16; tx < e; tx += 16) for (let ty = 0; ty < H; ty += 14) {
      const h = hash(tx + row * 9973, ty); if (h < .5) continue;
      ctx.fillStyle = h > .95 ? b.accent : h > .8 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.16)'; ctx.fillRect(tx + Math.floor(hash(ty, tx) * 12), Math.floor(top + ty + hash(tx, ty + 3) * 10), h > .95 ? 2 : 3, 2);
    }
    // a dithered seam into the previous biome instead of a hard edge
    const prev = kk.map.biomes.find((o) => o.row === row && o.x1 === bio.x0);
    if (prev && bio.x0 >= x0 - 40 && bio.x0 <= x1 + 40) { ctx.fillStyle = BIOME_OF[prev.element].ground; for (let dx = 0; dx < 28; dx += 4) for (let ty = 0; ty < H; ty += 4) if (hash(bio.x0 + dx, ty) < (1 - dx / 28) * .8) ctx.fillRect(bio.x0 + dx, Math.floor(top + ty), 4, 4); }
  }
  // the road along the band (a little wavy), stones at its edges
  ctx.fillStyle = 'rgba(176,150,108,.55)';
  for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) { const z = .5 + Math.sin(x * .0013 + row * 2.1) * .12; const y = top + z * H; ctx.fillRect(x, Math.floor(y - 9), 16, 18); if (hash(x, row) > .7) { ctx.fillStyle = 'rgba(90,76,58,.6)'; ctx.fillRect(x + 4, Math.floor(y + 9), 5, 3); ctx.fillStyle = 'rgba(176,150,108,.55)'; } }
  // the seam to the next band: a line of tufts so the bands read as one surface with gentle steps
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(Math.floor(x0), Math.floor(top), Math.ceil(x1 - x0), 2);
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
  o.biome = biomeAt(kk.map, site.row, site.x).element;
  o.friendly = site.kind === 'hq' ? kk.allies?.includes(site.seat) : site.owner != null && kk.allies?.includes(site.owner);
  if (site.looted) o.looted = true; if (site.freed) o.freed = true;
  if (site.kind === 'building') { o.inside = kk.inside === site; o.fadeFront = !!kk.inside && !o.inside && site.z > kk.inside.z && Math.abs(site.x - kk.inside.x) < 220; } /* a house in front of the one you are in turns see-through */
  if (site.kind === 'lift') o.liftK = kk.liftAt === site.id ? Math.min(1, kk.liftT / LIFT_TIME) : 0;
  return o;
}

// The ground of the level one stands on (world space, before the actors). x0/x1: the visible world span. Above the
// floor each level has its own air: dusk sky over the plateaus, night over the main plane, a rock ceiling in the depths.
export function renderKKGround(ctx, game, x0, x1) {
  const kk = kkState(game); if (!kk) return; const p = getGroundProjection(); const H = bandH(); const row = kk.row; const t = kk.time;
  const above = row === 0 ? ['#2a3350', '#141a2c'] : row === KK.main ? ['#11141f', '#090b12'] : ['#140d0a', '#0a0605'];
  ctx.fillStyle = above[1]; ctx.fillRect(Math.floor(x0), p.farY - H * 3, Math.ceil(x1 - x0), H * 3);
  ctx.fillStyle = above[0]; ctx.fillRect(Math.floor(x0), p.farY - 70, Math.ceil(x1 - x0), 70);
  if (row === 2) { ctx.fillStyle = '#20150f'; for (let x = Math.floor(x0 / 46) * 46; x < x1; x += 46) { const hh = 26 + hash(x, 7) * 60; ctx.beginPath(); ctx.moveTo(x, p.farY - H); ctx.lineTo(x + 23, p.farY - H + hh + 60); ctx.lineTo(x + 46, p.farY - H); ctx.closePath(); ctx.fill(); } }
  if (row === 0) { ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 40; i++) { const sx = Math.floor(x0 / 400) * 400 + hash(i, 3) * 4000; if (sx > x0 && sx < x1) ctx.fillRect(Math.floor(sx), Math.floor(p.farY - 40 - hash(3, i) * 200), 2, 2); } }
  drawBandGround(ctx, kk, row, 0, x0, x1);
  // outside the sections of this level: solid rock (the walls of the plateau / the cave)
  if (row !== KK.main) { ctx.fillStyle = '#17120f'; let cx = x0; const spans = [...(kk.map.spans[row] ?? [])].sort((a, b) => a[0] - b[0]); for (const [s0, s1] of spans) { if (s0 > cx) ctx.fillRect(Math.floor(cx), p.farY - 4, Math.ceil(Math.min(s0, x1) - cx), H + 8); cx = Math.max(cx, s1); } if (cx < x1) ctx.fillRect(Math.floor(cx), p.farY - 4, Math.ceil(x1 - cx), H + 8);
    ctx.fillStyle = '#2a201a'; for (const [s0, s1] of spans) for (const e of [s0, s1]) if (e > x0 - 20 && e < x1 + 20) for (let y = p.farY; y < p.nearY; y += 12) ctx.fillRect(Math.floor(e - 6 + hash(e, y) * 6), y, 8, 10); }
  // under the floor: the cliff face of the level
  ctx.fillStyle = row === 2 ? '#120c09' : '#1a1410'; ctx.fillRect(Math.floor(x0), p.nearY, Math.ceil(x1 - x0), H * 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let x = Math.floor(x0 / 24) * 24; x < x1; x += 24) ctx.fillRect(x + Math.floor(hash(x, 1) * 10), p.nearY + 6 + Math.floor(hash(1, x) * 30), 10, 3);
  void t;
}
// The places of the current band take part in the depth order (a figure behind a castle is hidden by it).
export function kkActors(game) {
  const kk = kkState(game); if (!kk) return [];
  const out = [...kk.map.hqs, ...kk.map.sites].filter((s) => s.row === kk.row && s.kind !== 'castle' && s.kind !== 'hq').map((s) => ({ y: groundYForDepth(s.z), render: (ctx) => drawSite(ctx, s, groundYForDepth(s.z), kk.time, siteOpts(kk, s)) }));
  const P = game.player; for (const d of kk.decor ?? []) if (d.row === kk.row && Math.abs(d.x - P.x) < 1400) out.push({ y: groundYForDepth(d.z), render: (ctx) => drawNode(ctx, d, groundYForDepth(d.z)) }); /* resource nodes: kk_resources.js */
  out.push(...castleActors(game)); /* the castles: solid wall blocks with rampart and stairs (kk_castle.js) */
  return out;
}

// ── minimap (screen space, top right) ──────────────────────────────────────────────────────────────────────────────
const KIND_ICON = Object.freeze({ castle: '♜', lair: '☠', camp: '⚑', building: '⌂', goldvein: '◆', prison: '⛓', source: '◉', stable: '♞', shrine: '✧', trial: '✪', shaft: '⇩', lift: '⇧' });
export function renderKKMinimap(ctx, game, viewW, opts = {}) {
  const kk = kkState(game); if (!kk) return;
  const W = opts.w ?? 300; const rowH = opts.rowH ?? 22; const x0 = opts.x ?? viewW - W - 14; const y0 = opts.y ?? 14; const map = kk.map; const sx = W / map.width;
  ctx.save(); ctx.fillStyle = 'rgba(6,6,12,.82)'; ctx.fillRect(x0 - 4, y0 - 4, W + 8, rowH * map.rows + 8);
  for (let r = 0; r < map.rows; r++) {
    ctx.fillStyle = 'rgba(30,24,20,.9)'; ctx.fillRect(x0, y0 + r * rowH, W, rowH - 1); /* rock where a level does not exist */
    for (const bio of map.biomes) if (bio.row === r) { ctx.fillStyle = BIOME_OF[bio.element].ground; ctx.fillRect(x0 + bio.x0 * sx, y0 + r * rowH, (bio.x1 - bio.x0) * sx + 1, rowH - 1); }
    // fog over every unrevealed cell
    ctx.fillStyle = 'rgba(4,4,8,.92)';
    for (const [s0, s1] of map.spans?.[r] ?? [[0, map.width]]) for (let x = Math.floor(s0 / REVEAL_CELL) * REVEAL_CELL; x < s1; x += REVEAL_CELL) if (!isRevealed(kk, r, x)) ctx.fillRect(x0 + Math.max(s0, x) * sx, y0 + r * rowH, REVEAL_CELL * sx + .6, rowH - 1);
  }
  ctx.font = '9px monospace'; ctx.textAlign = 'center';
  for (const s of map.sites) {
    if (!isRevealed(kk, s.row, s.x)) continue;
    ctx.fillStyle = s.kind === 'castle' && s.owner != null ? SEAT_COLORS[s.owner] : s.kind === 'source' ? elementColor(s.element) : '#e8e2d0';
    ctx.fillText(KIND_ICON[s.kind] ?? '·', x0 + s.x * sx, y0 + s.row * rowH + rowH * .5 + 3);
    if (s.kind === 'castle' && s.owner != null && Number.isFinite(s.garrison)) { ctx.fillStyle = '#fff'; ctx.fillText(String(s.garrison), x0 + s.x * sx + 8, y0 + s.row * rowH + 8); }
  }
  for (const h of map.hqs) {
    if (!kk.allies.includes(h.seat) && !isRevealed(kk, h.row, h.x)) continue; /* allies always see each other's main castle */
    ctx.fillStyle = SEAT_COLORS[h.seat]; ctx.fillRect(x0 + h.x * sx - 4, y0 + h.row * rowH + 4, 8, rowH - 9);
    if (Number.isFinite(h.garrison)) { ctx.fillStyle = '#fff'; ctx.fillText(String(h.garrison), x0 + h.x * sx, y0 + h.row * rowH - 1); }
  }
  // the player
  const P = game.player; const blink = Math.sin(kk.time * 8) > 0;
  ctx.fillStyle = blink ? '#ffffff' : SEAT_COLORS[0]; ctx.fillRect(x0 + P.x * sx - 2, y0 + kk.row * rowH + 2 + P.z * (rowH - 7), 4, 4);
  for (const extra of opts.dots ?? []) { ctx.fillStyle = extra.color; ctx.fillRect(x0 + extra.x * sx - 2, y0 + extra.row * rowH + 2 + (extra.z ?? .5) * (rowH - 7), 4, 4); }
  ctx.restore();
}
