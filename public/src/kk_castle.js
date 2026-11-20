// GRIMGE Prototype — Kronenkrieg castles: one solid, coherent defensive building (user feedback, 20 Nov 2026).
//   "Die Burg muss ein einziges zusammenhängendes, funktionales Bauwerk sein: massive Struktur mit nachvollziehbarer
//    Kollision, begehbare obere Plattform, die Flagge auf der Plattform, seitliche Tore in die Burg, Treppen in die
//    Architektur integriert, keine frei stehenden Torbögen; Klick / Tap auf die Flagge öffnet das Burgmenü."
//   • the block: its whole roof is a walkable fighting platform (a gallery of level_structures.js with a back parapet); the
//     ground under it is blocked like a wall — nobody walks through a castle;
//   • in front of the facade a double stair with a landing leads up onto the roof (ramps with a front rail: one leaves at
//     the foot, at the top or by jumping); two gates in the front wall, left and right, lead into the hall;
//   • the flag stands in the middle of the roof: a tap / click on the own flag opens the castle menu (build, deposit, train);
//   • every castle has a life bar. Only a castle without life is taken: stand alone at its flag on the roof until the ring
//     is full — a foe nearby or stepping away starts it over. The gates open for the attacker only then. Mid castles mend
//     themselves when left alone.
import { structureSurfaces } from './level_structures.js';
import { groundYForDepth } from './world.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { kkState, kkOn, siteOpts, roomClip } from './kk_world.js';
import { hqMaxHp } from './kk_war.js';
import { sameTeam } from './kk_army.js';

export const CASTLE = Object.freeze({
  mid: { half: 260, depth: .5, h: 96, stairIn: 40, stairOut: 175, gateOff: 215, front: .13, hp: 420 },
  hq: { half: 320, depth: .55, h: 116, stairIn: 50, stairOut: 215, gateOff: 270, front: .14 },
  gateHalf: 26, captureTime: 4, hqCaptureTime: 8, regenDelay: 10, regen: .03
});
export const dimsOf = (s) => (s.kind === 'hq' ? CASTLE.hq : CASTLE.mid);
export const castleBox = (s) => { const d = dimsOf(s); return { x0: s.x - d.half, x1: s.x + d.half, zMin: s.z - d.depth, zMax: s.z - .01 }; };
const frontBand = (s) => { const d = dimsOf(s); return { z0: s.z - .01, z1: s.z + d.front }; };
export const flagZ = (s) => { const b = castleBox(s); return (b.zMin + b.zMax) / 2; };
export const gatesOf = (s) => { const d = dimsOf(s); return [s.x - d.gateOff, s.x + d.gateOff]; };
export const castleMaxHp = (s) => (s.kind === 'hq' ? hqMaxHp(s) : CASTLE.mid.hp);
export function castleHp(s) { if (s.hp == null) s.hp = castleMaxHp(s); return s.hp; }
const castlesOf = (kk) => [...kk.map.hqs, ...kk.map.sites.filter((s) => s.kind === 'castle')];
// The player's side owns it (own or an ally's).
export function friendlyCastle(kk, s) { return s.kind === 'hq' ? (s.seat === 0 || sameTeam(kk, s.seat, 0)) : (s.owner === 0 || sameTeam(kk, s.owner, 0)); }
const ownCastle = (s) => (s.kind === 'hq' ? s.seat === 0 : s.owner === 0);
const heightOf = (e) => (e.surfaceHeight ?? 0) + (e.elevation ?? 0);

// ── the walkable parts: roof, landing, the two flights ──────────────────────────────────────────────────────────────
function defsOf(s) {
  const d = dimsOf(s); const b = castleBox(s); const f = frontBand(s);
  return [
    { type: 'gallery', x0: b.x0, x1: b.x1, zMin: b.zMin, zMax: b.zMax, h: d.h, backWall: true }, /* the roof, a parapet at its back */
    { type: 'stairs', x0: s.x - d.stairOut, x1: s.x - d.stairIn, zMin: f.z0, zMax: f.z1, from: 0, to: d.h, frontRail: true },
    { type: 'gallery', x0: s.x - d.stairIn, x1: s.x + d.stairIn, zMin: f.z0, zMax: f.z1, h: d.h, frontRail: true }, /* the landing */
    { type: 'stairs', x0: s.x + d.stairIn, x1: s.x + d.stairOut, zMin: f.z0, zMax: f.z1, from: d.h, to: 0, frontRail: true }
  ];
}
function allSurfaces(kk) {
  if (kk.castleSurf) return kk.castleSurf;
  const defs = []; const owner = [];
  for (const s of castlesOf(kk)) for (const d of defsOf(s)) { defs.push(d); owner.push(s); }
  kk.castleSurf = structureSurfaces(defs, 0).map((S, i) => Object.assign(S, { id: `castle_${owner[i].id}_${i}`, siteId: owner[i].id, row: owner[i].row }));
  return kk.castleSurf;
}
// Keeps the castles of the current level walkable / solid (a house interior brings its own surfaces).
export function syncCastleSurfaces(game) {
  const kk = kkState(game); if (kk.inside?.kind === 'building') return;
  const key = `${kk.row}|${kk.inside?.id ?? ''}`;
  if (kk.surfKey === key && game.battlefield.levelSurfaces === kk.surfList) return;
  kk.surfKey = key; kk.surfList = allSurfaces(kk).filter((S) => S.row === kk.row && S.siteId !== kk.inside?.id);
  game.battlefield.levelSurfaces = kk.surfList;
}
// A point inside a castle, on its stair or in front of the facade moves onto the open ground before it (spawns, guards).
export function outOfCastle(kk, p, row) {
  for (const s of castlesOf(kk)) {
    if (s.row !== row) continue; const b = castleBox(s); const f = frontBand(s);
    if (p.x > b.x0 - 24 && p.x < b.x1 + 24 && p.z > b.zMin - .03 && p.z < f.z1 + .03) p.z = f.z1 + .06 + ((Math.abs(p.x * 7) % 10) / 100);
  }
  return p;
}

// ── life, damage, mending ───────────────────────────────────────────────────────────────────────────────────────────
export function damageCastle(game, s, amount, by = null) {
  const kk = kkState(game); if (!(amount > 0) || s.fallen) return;
  const was = castleHp(s); s.hp = Math.max(0, was - amount); s.lastHitT = kk.time; s.shake = .18;
  if (was > 0 && s.hp <= 0) {
    combat.spawnShockwave?.(s.x, groundYForDepth(s.z) - 50, 160, '#c9b8a0'); combat.shakeCamera?.(6, .35); audio.playExplosion?.();
    if (ownCastle(s)) game.showAnnouncement?.(`${s.kind === 'hq' ? 'DEINE HAUPTBURG' : `DEINE ${s.label}BURG`} IST OFFEN — VERTEIDIGE DIE FAHNE!`, 2.2);
    else if (by === game.player || by?.team === game.player.team) game.showAnnouncement?.('MAUER ZERSTÖRT — STELL DICH ALLEIN AN DIE FAHNE AUF DER BURG', 2);
  } else if (ownCastle(s) && kk.time - (s.warnAt ?? -99) > 12) { s.warnAt = kk.time; game.showAnnouncement?.(`${s.kind === 'hq' ? 'DEINE HAUPTBURG' : `DEINE ${s.label}BURG`} WIRD ANGEGRIFFEN`, 1.4); }
}
// The player's side batters a foe castle: the facade is a target (a prop: no auto-aim snaps to it).
class CastleWall {
  constructor(game, s) { this.game = game; this.s = s; const d = dimsOf(s); this.isProp = true; this.isCastleWall = true; this.team = 'neutral'; this.radius = 30; this.hitRadiusX = d.half; this.halfX = d.half; this.halfZ = .07; this.worldHeight = 0; this.elevation = 0; this.surfaceHeight = 0; this.hitHeightTolerance = 240; }
  get x() { const P = this.game.player; const b = castleBox(this.s); return Math.max(b.x0 + 10, Math.min(b.x1 - 10, P.x)); } /* the part of the facade in front of the player */
  get z() { const d = dimsOf(this.s); const onStair = Math.abs(this.x - this.s.x) < d.stairOut + 10; return onStair ? frontBand(this.s).z1 + .01 : this.s.z + .005; }
  get y() { return groundYForDepth(this.z); }
  get hp() { return castleHp(this.s); }
  get maxHp() { return castleMaxHp(this.s); }
  get isDead() { return castleHp(this.s) <= 0 || !!this.s.fallen; }
  get isAlive() { return !this.isDead; }
  takeDamage(amount, kx = 0, lift = 0, stun = 0, crit = false, kind = 'melee') { if (this.isDead) return { ignored: true }; damageCastle(this.game, this.s, kind === 'spell' || kind === 'beam' ? amount * .6 : amount, this.game.player); combat.spawnHitSparks(this.x, this.y - 40, Math.sign(kx) || 1, '#c9b8a0', 5); return {}; }
  takeBeamDamage(amount) { this.takeDamage(amount, 0, 0, 0, false, 'beam'); }
  slow() {}
}
const wallOf = (game, s) => (s.wallTarget ??= new CastleWall(game, s));
export function castleTargets(game) {
  const kk = kkState(game); if (!kk || kk.inside) return []; const P = game.player;
  return castlesOf(kk).filter((s) => s.row === kk.row && !s.fallen && !friendlyCastle(kk, s) && castleHp(s) > 0 && Math.abs(s.x - P.x) < 1200).map((s) => wallOf(game, s));
}
// A foe castle near the leader for the own squad to batter (when no foe is about).
export function squadWallTarget(game, leader) {
  const kk = kkState(game); if (!kk || kk.inside) return null;
  const s = castlesOf(kk).find((c) => c.row === kk.row && !c.fallen && !friendlyCastle(kk, c) && castleHp(c) > 0 && Math.abs(c.x - leader.x) < dimsOf(c).half + 120 && leader.z > c.z - .04 && leader.z < c.z + .4);
  return s ? wallOf(game, s) : null;
}
// Standing at the flag on the roof (the capture place).
export function inFlagRing(s, e) { const b = castleBox(s); return Math.abs(e.x - s.x) < 100 && e.z >= b.zMin && e.z <= b.zMax + .005 && heightOf(e) >= dimsOf(s).h - 12; }
export const inGateRing = inFlagRing; /* the former name (kk_army.js) */

// ── the flag: tap / click opens the castle menu (only on purpose) ───────────────────────────────────────────────────
export function flagRect(s) { const d = dimsOf(s); const fy = groundYForDepth(flagZ(s)) - d.h; const tall = s.kind === 'hq' ? 92 : 72; return { x0: s.x - 16, x1: s.x + 54, y0: fy - tall - 10, y1: fy + 8 }; }
export function tryCastleTap(game, wp) {
  const kk = kkState(game); if (!kk || !wp) return false; const P = game.player;
  for (const s of castlesOf(kk)) {
    if (s.row !== kk.row || s.fallen) continue; const r = flagRect(s);
    if (wp.x < r.x0 || wp.x > r.x1 || wp.y < r.y0 || wp.y > r.y1) continue;
    if (!ownCastle(s)) { game.showAnnouncement?.(friendlyCastle(kk, s) ? 'DIE BURG DEINES VERBÜNDETEN' : castleHp(s) > 0 ? 'FREMDE BURG — ERST DIE MAUER ZERSTÖREN' : 'STELL DICH ALLEIN AN DIE FAHNE', 1.2); return true; }
    if (Math.abs(P.x - s.x) > 900) { game.showAnnouncement?.('ZU WEIT WEG VON DER FAHNE', 1); return true; }
    const open = kk.panelOpen && kk.flagSite === s; kk.panelOpen = !open; kk.flagSite = s; audio.playRuneChime?.(open ? 520 : 760); return true;
  }
  return false;
}

// ── the hall inside (through a side gate) ───────────────────────────────────────────────────────────────────────────
export function enterCastle(game, s, gateX = gatesOf(s)[0]) {
  const kk = kkState(game); const P = game.player; kk.inside = s; P.x = gateX; P.z = castleBox(s).zMax - .04;
  for (const m of game.minions) if (m.isKKUnit && m.team === P.team && !m.isDead && Math.abs(m.x - gateX) < 220) m.kkInHouse = s.id; /* the own squad comes along */
  game.showAnnouncement?.(s.kind === 'hq' ? 'IN DER HAUPTBURG' : `IN DER ${s.label}BURG`, 1);
}
export function leaveCastle(game) {
  const kk = kkState(game); const s = kk.inside; if (!s || s.kind === 'building') return; const P = game.player;
  const gx = gatesOf(s).reduce((a, g) => (Math.abs(g - P.x) < Math.abs(a - P.x) ? g : a));
  kk.inside = null; P.x = gx; P.z = s.z + .05;
  for (const m of game.minions) if (m.kkInHouse === s.id) { m.kkInHouse = null; m.x = gx + (Math.random() - .5) * 50; m.z = s.z + .07; }
}
function pushOutBox(e, b) {
  if (e.x <= b.x0 || e.x >= b.x1 || e.z <= b.zMin || e.z >= b.zMax + .01) return;
  const d = [[b.x0 - 1 - e.x, 0], [b.x1 + 1 - e.x, 0], [0, (b.zMin - .004 - e.z) * 150], [0, (b.zMax + .014 - e.z) * 150]].sort((p, q) => Math.abs(p[0]) + Math.abs(p[1]) - Math.abs(q[0]) - Math.abs(q[1]))[0];
  e.x += d[0]; e.z += d[1] / 150;
}

// ── each frame: gates, hall, mending ────────────────────────────────────────────────────────────────────────────────
export function updateCastles(game, dt) {
  if (!kkOn(game)) return; const kk = kkState(game); const P = game.player; const mz = game.input?.move?.z ?? 0;
  syncCastleSurfaces(game);
  for (const s of castlesOf(kk)) {
    s.shake = Math.max(0, (s.shake ?? 0) - dt);
    if (s.kind === 'castle' && castleHp(s) < castleMaxHp(s) && kk.time - (s.lastHitT ?? -99) > CASTLE.regenDelay) s.hp = Math.min(castleMaxHp(s), s.hp + castleMaxHp(s) * CASTLE.regen * dt);
  }
  if (kk.flagSite && (!ownCastle(kk.flagSite) || kk.flagSite.row !== kk.row || Math.abs(P.x - kk.flagSite.x) > 1000 || !P.isAlive)) { kk.panelOpen = false; kk.flagSite = null; }
  const s = kk.inside;
  if (s && s.kind !== 'building') {
    if (!P.isAlive || s.row !== kk.row || s.fallen || (!ownCastle(s) && castleHp(s) > 0)) { leaveCastle(game); return; }
    const b = castleBox(s);
    P.x = Math.max(b.x0 + 14, Math.min(b.x1 - 14, P.x)); if (P.z < b.zMin + .01) P.z = b.zMin + .01;
    if (P.z >= b.zMax + .005 && mz > .3) { leaveCastle(game); return; }
    if (P.z > b.zMax + .005) P.z = b.zMax + .005;
    for (const m of game.minions) {
      if (m.isDead || !m.isKKUnit) continue;
      if (m.kkInHouse === s.id) { m.x = Math.max(b.x0 + 14, Math.min(b.x1 - 14, m.x)); m.z = Math.max(b.zMin + .01, Math.min(b.zMax, m.z)); }
      else if (heightOf(m) < 10) pushOutBox(m, b); /* nobody else comes in (those up on the roof stay there) */
    }
    for (const e of [game.enemyChampion, ...(game.kkExtraFoes ?? [])]) if (e && e.lifeState === 'Alive' && heightOf(e) < 10) pushOutBox(e, b);
    return;
  }
  if (s || !P.isAlive || P.isMounted || heightOf(P) > 8) return;
  // a side gate: open for the owner, for an attacker only once the castle has no life left
  for (const c of castlesOf(kk)) {
    if (c.row !== kk.row || c.fallen || Math.abs(P.x - c.x) > dimsOf(c).half + 40) continue;
    const g = gatesOf(c).find((gx) => Math.abs(P.x - gx) < CASTLE.gateHalf + 4); if (g == null) continue;
    if (P.z < c.z - .015 || P.z > c.z + .1 || mz >= -.3) continue;
    if (ownCastle(c) || castleHp(c) <= 0) { enterCastle(game, c, g); return; }
    if (kk.time - (c.gateHintAt ?? -99) > 3) { c.gateHintAt = kk.time; game.showAnnouncement?.('DAS TOR IST ZU — ERST DIE MAUER ZERSTÖREN', 1.2); }
  }
}

// ── drawing ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const MATS = [['#7d7a72', '#5f5c56', '#9a968c', '#6a675f'], ['#8a6a42', '#6b4f30', '#a8845a', '#7a5c38'], ['#8d8f99', '#6c6e78', '#aeb0ba', '#7c7e88'], ['#9fb4c4', '#7890a2', '#c8d8e4', '#8aa2b4'], ['#3b2f4a', '#2b2235', '#5a4a70', '#33293f']];
const matOf = (s) => (s.kind === 'hq' ? MATS[Math.min(4, s.level ?? 0)] : s.owner == null ? ['#6a645c', '#4a4640', '#847d72', '#57524b'] : MATS[0]);
const courses = (ctx, x0, y0, w, h, m, step = 10) => { for (let y = y0 + 3; y < y0 + h - 3; y += step) for (let x = x0 + ((Math.floor(y / step) % 2) * step); x < x0 + w - 4; x += step * 2) px(ctx, x + 1, y, step * 2 - 2, step - 2, m[0]); };
function flagOn(ctx, x, yFoot, color, t, tall) {
  px(ctx, x - 6, yFoot - 6, 15, 6, '#3b2b1b'); px(ctx, x, yFoot - tall, 3, tall, '#3b2b1b'); px(ctx, x - 2, yFoot - tall - 4, 7, 4, '#c9a95a');
  const wave = Math.sin(t * 3 + x) * 3; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + 3, yFoot - tall + 2); ctx.lineTo(x + 48, yFoot - tall + 7 + wave); ctx.lineTo(x + 41, yFoot - tall + 18 + wave); ctx.lineTo(x + 48, yFoot - tall + 29 + wave); ctx.lineTo(x + 3, yFoot - tall + 27); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(Math.round(x + 4), Math.round(yFoot - tall + 4), 34, 3);
}
function stairDraw(ctx, x0, x1, zMin, zMax, from, to, m) {
  const n = Math.max(3, Math.round((x1 - x0) / 15)); const w = (x1 - x0) / n; const yb = groundYForDepth(zMin); const yf = groundYForDepth(zMax);
  for (let i = 0; i < n; i++) {
    const hh = to > from ? to * (i + 1) / n : from * (1 - i / n); const sx = x0 + i * w; /* rising to the right, or falling from the left */
    px(ctx, sx, yb - hh, w + 1, yf - yb, m[2]); px(ctx, sx, yb - hh, w + 1, 2, '#d8d2c4');
    px(ctx, sx, yf - hh, w + 1, hh, m[1]); for (let y = yf - hh + 9; y < yf; y += 9) px(ctx, sx, y, w + 1, 1, m[3]);
  }
  const top = Math.max(from, to); const rail = (x) => yf - (to > from ? top * (x - x0) / (x1 - x0) : top * (1 - (x - x0) / (x1 - x0))) - 18; for (let x = x0; x < x1; x += 2) px(ctx, x, rail(x), 2, 3, m[3]); /* a low stone rail */
}
function tower(ctx, x, yBase, w, hTop, m, color) {
  px(ctx, x, yBase - hTop, w, hTop, m[1]); courses(ctx, x, yBase - hTop, w, hTop, m, 9);
  px(ctx, x - 3, yBase - hTop - 4, w + 6, 6, m[2]); for (let k = x - 3; k < x + w; k += 12) px(ctx, k, yBase - hTop - 14, 8, 10, m[0]);
  px(ctx, x + w / 2 - 4, yBase - hTop + 20, 8, 14, '#1a140f'); px(ctx, x + w / 2 - 6, yBase - hTop + 44, 12, 26, color); px(ctx, x + w / 2 - 6, yBase - hTop + 44, 12, 2, '#c9a95a');
}
// The castle from outside: the block (back towers, roof, back parapet, front wall with the two gates), the double stair with
// its landing, the flag on the roof; merlons of the front edge in front of the feet of whoever stands on the roof.
export function castleActors(game) {
  const kk = kkState(game); if (!kk) return []; const P = game.player; const t = kk.time; const out = [];
  for (const s of castlesOf(kk)) {
    if (s.row !== kk.row || Math.abs(s.x - P.x) > 1900 || Math.abs(s.z - P.z) > 7) continue;
    const d = dimsOf(s); const clip = kk.inside === s ? null : roomClip(kk, s.x, s.z, d.half); if (clip === 'hide') continue; /* nothing reaches into the room one stands in */
    const b = castleBox(s); const f = frontBand(s); const yb = groundYForDepth(b.zMin); const yf = groundYForDepth(b.zMax); const H = d.h; const m = matOf(s); const big = s.kind === 'hq';
    const opts = siteOpts(kk, s); const color = opts.ownerColor ?? '#9e9e9e'; const inside = kk.inside === s;
    const behind = !inside && P.z < b.zMin + .005 && P.x > b.x0 - 60 && P.x < b.x1 + 60 && heightOf(P) < 10;
    const alpha = clip === 'fade' ? .28 : behind ? .42 : 1; const sx = s.shake > 0 ? Math.sin(s.shake * 90) * 2 : 0; const broken = castleHp(s) <= 0 || s.fallen;
    // the back: two towers at the back corners (and the keep of a main castle) rising above the parapet — part of the block
    out.push({ y: yb - .6, render: (ctx) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(sx, 0);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(s.x, groundYForDepth(f.z1) + 4, d.half + 50, 18, 0, 0, Math.PI * 2); ctx.fill();
      if (!inside) { tower(ctx, b.x0 - 6, yb - H + 6, 58, 96, m, color); tower(ctx, b.x1 - 52, yb - H + 6, 58, 96, m, color); if (big) tower(ctx, s.x - 50, yb - H + 6, 100, 132, m, color); }
      ctx.restore();
    } });
    // the body: roof, parapet, front wall with gates, the double stair — or the cut-away hall
    out.push({ y: yb, render: (ctx) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(sx, 0);
      if (inside) hall(ctx, s, b, d, m, color, t);
      else {
        px(ctx, b.x0, yb - H - 16, b.x1 - b.x0, 16, m[1]); for (let x = b.x0; x < b.x1 - 10; x += 22) { px(ctx, x + 3, yb - H - 27, 13, 11, m[0]); px(ctx, x + 3, yb - H - 27, 13, 2, m[2]); } /* the back parapet */
        px(ctx, b.x0, yb - H, b.x1 - b.x0, yf - yb, m[2]); for (let y = yb - H + 6; y < yf - H; y += 7) px(ctx, b.x0, y, b.x1 - b.x0, 1, m[3]); for (let x = b.x0 + 30; x < b.x1; x += 60) px(ctx, x, yb - H, 1, yf - yb, m[3]); /* the roof */
        px(ctx, b.x0, yf - H, b.x1 - b.x0, H, m[1]); courses(ctx, b.x0, yf - H, b.x1 - b.x0, H, m); px(ctx, b.x0, yf - H, b.x1 - b.x0, 3, m[2]); /* the front wall */
        for (const cx of [b.x0, b.x1 - 22]) { px(ctx, cx, yf - H - 8, 22, H + 8, m[3]); px(ctx, cx, yf - H - 8, 22, 3, m[2]); } /* corner pilasters */
        for (const ax of [s.x - d.half * .55, s.x + d.half * .55 - 6]) px(ctx, ax, yf - H + 20, 6, 18, '#1a140f'); /* arrow slits */
        for (const gx of gatesOf(s)) { /* the two gates */
          const gw = CASTLE.gateHalf; ctx.fillStyle = '#120c08'; ctx.beginPath(); ctx.moveTo(gx - gw, yf); ctx.lineTo(gx - gw, yf - 46); ctx.quadraticCurveTo(gx, yf - 70, gx + gw, yf - 46); ctx.lineTo(gx + gw, yf); ctx.closePath(); ctx.fill();
          if (!broken) { px(ctx, gx - gw + 4, yf - 46, gw * 2 - 8, 46, '#5a3a22'); for (let x = gx - gw + 4; x < gx + gw - 4; x += 8) px(ctx, x, yf - 46, 1, 46, '#3a2416'); px(ctx, gx - gw + 4, yf - 30, gw * 2 - 8, 3, '#2a2a2a'); px(ctx, gx - gw + 4, yf - 14, gw * 2 - 8, 3, '#2a2a2a'); }
          else for (let i = 0; i < 4; i++) px(ctx, gx - gw + 6 + i * 11, yf - 10 - (i % 2) * 8, 7, 10 + (i % 2) * 8, '#4a2e1a');
          px(ctx, gx - 11, yf - H + 10, 22, 30, color); px(ctx, gx - 11, yf - H + 10, 22, 3, '#c9a95a');
        }
        // the double stair against the facade and its landing
        stairDraw(ctx, s.x - d.stairOut, s.x - d.stairIn, f.z0, f.z1, 0, H, m); stairDraw(ctx, s.x + d.stairIn, s.x + d.stairOut, f.z0, f.z1, H, 0, m);
        const lb = groundYForDepth(f.z0) - H; const lf = groundYForDepth(f.z1) - H; px(ctx, s.x - d.stairIn, lb, d.stairIn * 2, lf - lb, m[2]); px(ctx, s.x - d.stairIn, lf, d.stairIn * 2, groundYForDepth(f.z1) - lf, m[1]); courses(ctx, s.x - d.stairIn, lf, d.stairIn * 2, groundYForDepth(f.z1) - lf, m, 9); px(ctx, s.x - d.stairIn, lf - 1, d.stairIn * 2, 2, '#d8d2c4');
      }
      ctx.restore();
    } });
    // the flag in the middle of the roof (the owner's colour) and the label of a mid castle
    out.push({ y: groundYForDepth(flagZ(s)) + .01, render: (ctx) => {
      if (s.fallen || inside) return; ctx.save(); ctx.globalAlpha = alpha; const fy = groundYForDepth(flagZ(s)) - H;
      flagOn(ctx, s.x - 2, fy, color, t, big ? 92 : 72);
      if (ownCastle(s) && Math.abs(P.x - s.x) < 900) { ctx.globalAlpha = alpha * (.5 + .3 * Math.sin(t * 3)); ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2; ctx.strokeRect(Math.round(s.x - 10), Math.round(fy - (big ? 92 : 72) - 6), 62, 36); ctx.globalAlpha = alpha; } /* the own flag can be tapped */
      if (s.label && !big) { ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; px(ctx, s.x - 30, fy - 104, 60, 13, 'rgba(0,0,0,.6)'); ctx.fillStyle = '#fff3c8'; ctx.fillText(s.label, s.x, fy - 94); }
      ctx.restore();
    } });
    // merlons on the front edge of the roof (open at the landing): in front of the feet of whoever stands up there
    if (!inside) out.push({ y: yf + .05, render: (ctx) => { ctx.save(); ctx.globalAlpha = alpha; ctx.translate(sx, 0); for (let x = b.x0; x < b.x1 - 10; x += 22) { if (x + 17 > s.x - d.stairIn && x + 3 < s.x + d.stairIn) continue; px(ctx, x + 3, yf - H - 13, 14, 13, m[0]); px(ctx, x + 3, yf - H - 13, 14, 2, m[2]); } ctx.restore(); } });
    // life bar and the capture ring at the flag
    const hp = castleHp(s); const max = castleMaxHp(s); const cap = s.kind === 'hq' ? (s.capT ?? 0) / CASTLE.hqCaptureTime : Math.max((kk.progress?.[s.id] ?? 0), s.capT ?? 0) / CASTLE.captureTime;
    if (!s.fallen && (hp < max || cap > 0)) out.push({ y: groundYForDepth(flagZ(s)) + .02, render: (ctx) => {
      const y = yb - H - (big ? 160 : 130); const w = big ? 220 : 170;
      px(ctx, s.x - w / 2 - 2, y - 2, w + 4, 12, 'rgba(0,0,0,.75)'); px(ctx, s.x - w / 2, y, w * Math.max(0, hp) / max, 8, hp > 0 ? color : '#ff5050');
      if (hp <= 0) { ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd0d0'; ctx.fillText('MAUER ZERSTÖRT — DIE FAHNE IST OFFEN', s.x, y - 6); }
      if (hp <= 0 || cap > 0) {
        const gy = groundYForDepth(flagZ(s)) - H; ctx.save(); ctx.strokeStyle = 'rgba(255,233,168,.55)'; ctx.lineWidth = 2; ctx.setLineDash?.([6, 5]); ctx.beginPath(); ctx.ellipse(s.x, gy, 100, 22, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash?.([]);
        if (cap > 0) { ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(s.x, gy, 100, 22, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, cap)); ctx.stroke(); }
        ctx.restore();
      }
    } });
  }
  return out;
}
// The hall inside a castle (front wall cut away): stone back wall with banners, weapon racks and a training dummy.
function hall(ctx, s, b, d, m, color, t) {
  const yb = groundYForDepth(b.zMin); const yf = groundYForDepth(b.zMax); const wallH = d.h + 70;
  px(ctx, b.x0 - 8, yb - wallH, b.x1 - b.x0 + 16, wallH, m[1]); courses(ctx, b.x0, yb - wallH, b.x1 - b.x0, wallH, m, 12);
  px(ctx, b.x0 - 10, yb - wallH, 10, yf - yb + wallH, m[3]); px(ctx, b.x1, yb - wallH, 10, yf - yb + wallH, m[3]);
  px(ctx, b.x0, yb, b.x1 - b.x0, yf - yb + 1, '#46413b'); /* the floor is closed */
  for (let y = yb; y < yf; y += 7) for (let x = b.x0 + ((Math.floor(y / 7) % 2) * 16); x < b.x1; x += 32) px(ctx, x, y, 30, 6, (Math.floor(x / 32 + y / 7) % 2) ? '#5e5850' : '#544e47');
  for (const bx of [b.x0 + 40, s.x - 12, b.x1 - 64]) { px(ctx, bx, yb - wallH + 18, 24, 56, color); px(ctx, bx, yb - wallH + 18, 24, 3, '#c9a95a'); px(ctx, bx + 9, yb - wallH + 34, 6, 14, '#fff3c8'); }
  for (const rx of [b.x0 + 90, b.x1 - 130]) { px(ctx, rx, yb - 46, 44, 4, '#6b4428'); px(ctx, rx, yb - 18, 44, 4, '#6b4428'); for (let i = 0; i < 4; i++) { px(ctx, rx + 4 + i * 11, yb - 64, 2, 50, '#cfd8de'); px(ctx, rx + 2 + i * 11, yb - 30, 6, 3, '#8a6040'); } }
  const dx = s.x + 70; px(ctx, dx - 2, yb - 10, 4, 14, '#4a2e1a'); px(ctx, dx - 9, yb - 44, 18, 34, '#c9a064'); px(ctx, dx - 6, yb - 56, 12, 12, '#d8b478'); px(ctx, dx - 16, yb - 38, 32, 4, '#8a6040');
  for (const tx of [b.x0 + 20, b.x1 - 26]) { px(ctx, tx, yb - 70, 6, 14, '#3a2a1e'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .16 + .05 * Math.sin(t * 7 + tx); ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.arc(tx + 3, yb - 76, 30, 0, Math.PI * 2); ctx.fill(); ctx.restore(); px(ctx, tx + 1, yb - 80, 4, 7, '#ffd27a'); }
  for (const gx of gatesOf(s)) { ctx.fillStyle = 'rgba(255,240,200,.08)'; ctx.fillRect(Math.round(gx - CASTLE.gateHalf), Math.round(yb), CASTLE.gateHalf * 2, Math.round(yf - yb)); } /* light from the gates */
}
