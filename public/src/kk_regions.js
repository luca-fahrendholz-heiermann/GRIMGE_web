// GRIMGE Prototype — Kronenkrieg regions (user, 21 Nov 2026): beside the three levels two regions only reached through
// gates of the main plane.
//   UNDERWATER (row 3): jump / walk into a lake → under water. 2.5D look, but swimming is 2D only — left / right and up
//     / down (the depth is locked, entities.updateSwim). No spells. Under every lake there is an opening to the surface:
//     swim up below ANOTHER lake to come out there — a way across the map (room for sea creatures later).
//   SKY (row 4): stand in a cloud gate → up between the clouds. Flying is how one moves there (hover slow, superman fast;
//     no mana, no landing). Every cloud gate has a descent whirl up there: fly into one to come down at that gate.
// The regions are rows of the board (kk_map REGION_ROWS) with a full-width span, entered with kk_world.switchLevel; land
// units stay on their levels (kk_army only keeps the current row alive).
import { KK, REGION_ROWS, REGION_SWIM_TOP } from './kk_map.js';
import { kkState, switchLevel } from './kk_world.js';
import { groundYForDepth, getGroundProjection } from './world.js';

const LAKE_RX = 150, LAKE_RZ = .75;       // where stepping into a lake takes one down
const GATE_R = 55, GATE_RZ = .3, GATE_TIME = 1; // standing in a cloud gate this long lifts one up
const SURFACE_R = 150;                    // under a lake: how close (x) the opening is
const WHIRL_R = 70, WHIRL_RZ = .4;        // sky: a descent whirl
const ARRIVAL_LOCK = 2.5;                 // seconds before the gate one came through works again
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

export const inWater = (kk) => kk?.row === REGION_ROWS.water;
export const inSky = (kk) => kk?.row === REGION_ROWS.sky;
// Spells do not work under water (user: "Spells können dort erstmal nicht wirken").
export function kkSpellsBlocked(game) { const kk = kkState(game); return !!kk && inWater(kk); }
const lakes = (kk) => kk.map.sites.filter((s) => s.kind === 'lake');
const gates = (kk) => kk.map.sites.filter((s) => s.kind === 'cloudgate');
const midZ = (kk) => (kk.map.depth ?? KK.depth) / 2;

export function updateRegions(game, dt) {
  const kk = kkState(game); const P = game.player; if (!kk?.map || !P) return;
  kk.regionLock = Math.max(0, (kk.regionLock ?? 0) - dt);
  if (!inWater(kk)) P.kkSwim = false;
  if (!inSky(kk) && P.kkSky) { P.kkSky = false; P.kkFlying = false; }
  if (!P.isAlive) return;
  const say = (t) => game.showAnnouncement?.(t, 1.6);
  if (kk.row === KK.main) {
    // a lake: stepping / jumping into it dives into the underwater region at the same spot
    const lake = lakes(kk).find((l) => Math.abs(P.x - l.x) < LAKE_RX && Math.abs(P.z - l.z) < LAKE_RZ && (P.elevation ?? 0) < 8);
    if (lake && !(kk.regionLock > 0 && kk.regionFrom === lake.id)) {
      P.dismount?.(); P.kkFlying = false;
      if (switchLevel(game, REGION_ROWS.water, lake.x, midZ(kk))) { P.kkSwim = true; P.elevation = REGION_SWIM_TOP - 30; P.vElevation = 0; kk.regionFrom = lake.id; kk.regionLock = ARRIVAL_LOCK; lockDepth(game, kk); say('UNTER WASSER — TAUCHE UNTER EINEM ANDEREN SEE AUF'); }
      return;
    }
    // a cloud gate: standing in it for a moment lifts one into the sky
    const gate = gates(kk).find((g) => Math.abs(P.x - g.x) < GATE_R && Math.abs(P.z - g.z) < GATE_RZ);
    kk.gateT = gate && !(kk.regionLock > 0 && kk.regionFrom === gate.id) ? (kk.gateT ?? 0) + dt : 0; kk.gateAt = gate?.id ?? null;
    if (gate && kk.gateT >= GATE_TIME) {
      kk.gateT = 0; P.dismount?.();
      if (switchLevel(game, REGION_ROWS.sky, gate.x, gate.z)) { P.kkSky = true; P.kkFlying = true; P.kkFlyT = 1e9; P.elevation = 80; P.grounded = false; kk.regionFrom = gate.id; kk.regionLock = ARRIVAL_LOCK; say('ÜBER DEN WOLKEN — FLIEG IN EINEN WIRBEL, UM HINABZUSTEIGEN'); }
    }
    return;
  }
  if (inWater(kk)) {
    P.kkSwim = true; lockDepth(game, kk); P.z = midZ(kk);
    // right under the surface below a lake: up and out at that lake (not the one just dived into, for a moment)
    if ((P.elevation ?? 0) >= REGION_SWIM_TOP - 6) {
      const lake = lakes(kk).find((l) => Math.abs(P.x - l.x) < SURFACE_R && !(kk.regionLock > 0 && kk.regionFrom === l.id));
      if (lake && switchLevel(game, KK.main, lake.x + LAKE_RX + 60, Math.min((kk.map.depth ?? KK.depth) - .5, lake.z + .3))) {
        P.kkSwim = false; P.elevation = 0; P.vElevation = 320; P.grounded = false; kk.regionFrom = lake.id; kk.regionLock = ARRIVAL_LOCK; say('AUFGETAUCHT'); }
    }
    return;
  }
  if (inSky(kk)) {
    P.kkSky = true; if (!P.kkFlying) { P.kkFlying = true; P.kkFlyT = 1e9; P.grounded = false; P.vElevation = 220; } /* knocked out of the air: the clouds carry one up again */
    const g = gates(kk).find((q) => Math.abs(P.x - q.x) < WHIRL_R && Math.abs(P.z - q.z) < WHIRL_RZ && !(kk.regionLock > 0 && kk.regionFrom === q.id));
    if (g && switchLevel(game, KK.main, g.x + 120, g.z)) { P.kkSky = false; P.kkFlying = false; P.elevation = 120; P.grounded = false; kk.regionFrom = g.id; kk.regionLock = ARRIVAL_LOCK; say('HINAB AUS DEN WOLKEN'); }
  }
}
// under water the depth is fixed: the band shrinks to the middle depth
function lockDepth(game, kk) { const b = game.battlefield.boundsOverride; const z = midZ(kk); b.farZ = z - .01; b.nearZ = z + .01; }

// ── drawing ────────────────────────────────────────────────────────────────────────────────────────────────────────
// The gates on the main plane (after its ground): lakes and cloud columns. Returns nothing.
export function drawRegionGates(ctx, game, x0, x1) {
  const kk = kkState(game); if (!kk || kk.row !== KK.main) return; const t = kk.time ?? 0;
  for (const l of lakes(kk)) {
    if (l.x + 220 < x0 || l.x - 220 > x1) continue;
    const y = groundYForDepth(l.z); const ry = Math.max(14, groundYForDepth(l.z + LAKE_RZ) - y);
    ctx.save(); ctx.fillStyle = '#3e5a3a'; ctx.beginPath(); ctx.ellipse(l.x, y, LAKE_RX + 22, ry + 9, 0, 0, Math.PI * 2); ctx.fill(); /* the bank */
    ctx.fillStyle = '#123a5e'; ctx.beginPath(); ctx.ellipse(l.x, y, LAKE_RX + 6, ry + 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d5f8e'; ctx.beginPath(); ctx.ellipse(l.x, y - 2, LAKE_RX - 14, ry - 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fc8f0'; for (let i = 0; i < 9; i++) { const a = hash(i, l.x) * Math.PI * 2; const r = .3 + .6 * hash(l.x, i); const sx = l.x + Math.cos(a) * (LAKE_RX - 30) * r + Math.sin(t * 1.6 + i) * 6; const sy = y + Math.sin(a) * (ry - 8) * r; ctx.fillRect(Math.round(sx), Math.round(sy), 10, 2); } /* glints */
    ctx.restore();
  }
  for (const g of gates(kk)) {
    if (g.x + 120 < x0 || g.x - 120 > x1) continue;
    const y = groundYForDepth(g.z); const k = kk.gateAt === g.id ? Math.min(1, (kk.gateT ?? 0) / GATE_TIME) : 0;
    ctx.save(); ctx.fillStyle = 'rgba(200,230,255,.25)'; ctx.beginPath(); ctx.ellipse(g.x, y, GATE_R, 12, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 14; i++) { const h = ((t * 40 + i * 37) % 260); const w = 18 + 10 * Math.sin(i + t * 2); ctx.globalAlpha = (1 - h / 260) * (.55 + .4 * k); ctx.fillStyle = i % 3 ? '#e8f4ff' : '#a9cdee'; ctx.fillRect(Math.round(g.x - w / 2 + Math.sin(t * 2 + i) * 14), Math.round(y - h), Math.round(w), 8); } /* the rising cloud column */
    ctx.restore();
  }
}
// The whole look of a region row (instead of the level ground). Returns true when it drew (row 3 / 4).
export function drawRegionGround(ctx, game, x0, x1, y0 = -Infinity, y1 = Infinity) {
  const kk = kkState(game); if (!kk || !(inWater(kk) || inSky(kk))) return false;
  const p = getGroundProjection(); const H = p.nearY - p.farY; const t = kk.time ?? 0; const floor = groundYForDepth(midZ(kk)); const X0 = Math.floor(x0), W = Math.ceil(x1 - x0);
  // the board is many screens tall (48 depth units): fill the visible world span, not just the band's far edge
  const Y0 = Number.isFinite(y0) ? Math.floor(y0) - 40 : groundYForDepth(0) - H * 3; const Y1 = Number.isFinite(y1) ? Math.ceil(y1) + 40 : groundYForDepth(kk.map.depth ?? KK.depth) + H;
  if (inWater(kk)) {
    const surface = floor - REGION_SWIM_TOP - 70;
    ctx.fillStyle = '#071d33'; ctx.fillRect(X0, Y0, W, Y1 - Y0);
    const g = ctx.createLinearGradient(0, surface - H, 0, floor + H); g.addColorStop(0, '#0b2a48'); g.addColorStop(.35, '#0d3a5e'); g.addColorStop(.8, '#082640'); g.addColorStop(1, '#04121f');
    ctx.fillStyle = g; ctx.fillRect(X0, surface - H * 3, W, H * 6);
    ctx.fillStyle = '#3d7fb0'; for (let x = Math.floor(x0 / 24) * 24; x < x1; x += 24) ctx.fillRect(x, Math.round(surface + Math.sin(x * .03 + t * 2) * 3), 24, 3); /* the surface from below */
    for (const l of lakes(kk)) { if (l.x + 260 < x0 || l.x - 260 > x1) continue; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .18 + .06 * Math.sin(t * 2 + l.x); ctx.fillStyle = '#9fe0ff'; ctx.beginPath(); ctx.moveTo(l.x - SURFACE_R, surface); ctx.lineTo(l.x + SURFACE_R, surface); ctx.lineTo(l.x + SURFACE_R * 1.6, floor); ctx.lineTo(l.x - SURFACE_R * 1.6, floor); ctx.closePath(); ctx.fill(); ctx.globalAlpha = .7; ctx.fillStyle = '#d8f4ff'; ctx.fillRect(Math.round(l.x - SURFACE_R), surface - 2, SURFACE_R * 2, 4); ctx.restore(); } /* light pours through a lake: the way up */
    for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) { const h = 40 + hash(x, 9) * 110; ctx.fillStyle = hash(x, 4) > .5 ? '#1e5a3a' : '#2a6e3e'; for (let y = 0; y < h; y += 6) ctx.fillRect(Math.round(x + 30 + Math.sin(y * .05 + t * 1.5 + x) * 6), Math.round(floor - y), 6, 6); } /* kelp */
    ctx.fillStyle = '#5c5034'; ctx.fillRect(X0, floor, W, H * 2); ctx.fillStyle = '#7a6a44'; for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) ctx.fillRect(x, floor + Math.floor(hash(x, 2) * 6), 10, 3); /* sea floor */
    ctx.fillStyle = 'rgba(190,230,255,.55)'; for (let i = 0; i < 30; i++) { const bx = Math.floor(x0 / 600) * 600 + hash(i, 5) * 1800; if (bx < x0 || bx > x1) continue; const by = floor - ((t * 30 + hash(5, i) * 500) % (REGION_SWIM_TOP + 60)); ctx.fillRect(Math.round(bx + Math.sin(t * 3 + i) * 4), Math.round(by), 3, 3); } /* bubbles */
    return true;
  }
  // the sky: dusk over a floor of clouds, descent whirls at the gates
  const P = game.player; const py = groundYForDepth(P?.z ?? midZ(kk)); /* the sky is drawn around where one flies */
  const g = ctx.createLinearGradient(0, py - 700, 0, py + 260); g.addColorStop(0, '#2b3f7a'); g.addColorStop(.6, '#6a7fc0'); g.addColorStop(1, '#c9b8d8');
  ctx.fillStyle = '#2b3f7a'; ctx.fillRect(X0, Y0, W, Y1 - Y0); ctx.fillStyle = g; ctx.fillRect(X0, py - 700, W, 960); ctx.fillStyle = '#c9b8d8'; ctx.fillRect(X0, py + 260, W, Math.max(0, Y1 - py - 260));
  const cy0 = Math.max(Y0, py - 260), cy1 = Math.min(Y1, py + 900);
  for (let yy = Math.floor(cy0 / 56) * 56; yy < cy1; yy += 56) for (let x = Math.floor(x0 / 70) * 70 - 70; x < x1 + 70; x += 70) { const y = yy + hash(x, yy) * 30; ctx.fillStyle = hash(yy, x) > .5 ? '#e9e4f2' : '#d4cfe6'; ctx.beginPath(); ctx.ellipse(x + hash(yy, x) * 40, y + 40, 60, 22, 0, 0, Math.PI * 2); ctx.fill(); } /* the cloud floor under the flyer */
  for (const q of gates(kk)) { if (q.x + 140 < x0 || q.x - 140 > x1) continue; const y = groundYForDepth(q.z) - 60; ctx.save(); for (let i = 0; i < 18; i++) { const a = t * 3 + i * .7; const r = 10 + i * 4; ctx.globalAlpha = .8 - i * .035; ctx.fillStyle = i % 2 ? '#ffffff' : '#9fc4ee'; ctx.fillRect(Math.round(q.x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * .45), 8, 5); } ctx.restore(); } /* descent whirls */
  return true;
}
