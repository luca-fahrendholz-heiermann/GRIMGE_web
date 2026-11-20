// GRIMGE Prototype — Kronenkrieg castles as solid places of the world (user feedback, 20 Nov 2026: "Burgen nicht
// durchlaufbar, viel breiter, man kann wie bei Castle Siege auf die Burg klettern, auf dem Dach Wache halten und kämpfen,
// Fahne auf dem Dach; rein über ein Fronttor wie bei Häusern, innen erstellt man Krieger"; "Gegner dürfen nicht in
// Burgen: erst den Lebensbalken von außen zerstören, dann einnehmen, indem man allein dort steht, bis der Kreis durch ist").
//   • a castle is a block of wall: its rampart is a walkable gallery of the game (level_structures.js), reached by a stone
//     stair on each side — the ground under it is blocked like a wall, so nobody walks through a castle;
//   • the gate in the middle of the front wall: the owner's side walks in (a cut-away hall where the castle menu opens);
//     foes can only batter the wall / the gate;
//   • every castle has a life bar; only a castle without life can be taken: stand alone in the ring at its gate until
//     the ring is full — any foe nearby or leaving the ring starts it over. Mid castles mend themselves when left alone.
import { structureSurfaces } from './level_structures.js';
import { groundYForDepth } from './world.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { kkState, kkOn, siteOpts, roomClip } from './kk_world.js';
import { castleTowerImage } from './kk_art.js';
import { hqMaxHp } from './kk_war.js';
import { sameTeam } from './kk_army.js';

export const CASTLE = Object.freeze({
  mid: { half: 200, depth: .15, h: 84, stair: 120, hp: 420 },
  hq: { half: 250, depth: .15, h: 100, stair: 130 },
  gateHalf: 30, captureTime: 4, hqCaptureTime: 8, regenDelay: 10, regen: .03
});
export const dimsOf = (s) => (s.kind === 'hq' ? CASTLE.hq : CASTLE.mid);
export const castleBox = (s) => { const d = dimsOf(s); return { x0: s.x - d.half, x1: s.x + d.half, zMin: s.z - d.depth, zMax: s.z - .01 }; };
export const castleMaxHp = (s) => (s.kind === 'hq' ? hqMaxHp(s) : CASTLE.mid.hp);
export function castleHp(s) { if (s.hp == null) s.hp = castleMaxHp(s); return s.hp; }
const castlesOf = (kk) => [...kk.map.hqs, ...kk.map.sites.filter((s) => s.kind === 'castle')];
// The player's side owns it (own or an ally's).
export function friendlyCastle(kk, s) { return s.kind === 'hq' ? (s.seat === 0 || sameTeam(kk, s.seat, 0)) : (s.owner === 0 || sameTeam(kk, s.owner, 0)); }
const ownCastle = (s) => (s.kind === 'hq' ? s.seat === 0 : s.owner === 0);

// ── the rampart and the stairs as walkable surfaces ─────────────────────────────────────────────────────────────────
function defsOf(s) {
  const d = dimsOf(s); const b = castleBox(s);
  return [
    { type: 'gallery', x0: b.x0, x1: b.x1, zMin: b.zMin, zMax: b.zMax, h: d.h, backWall: true }, /* the back parapet */
    { type: 'stairs', x0: b.x0 - d.stair, x1: b.x0, zMin: b.zMin + .02, zMax: b.zMax, from: 0, to: d.h, backWall: true },
    { type: 'stairs', x0: b.x1, x1: b.x1 + d.stair, zMin: b.zMin + .02, zMax: b.zMax, from: d.h, to: 0, backWall: true }
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
// A point inside a castle (or on its stairs) moves to the ground in front of it (spawns, guard posts).
export function outOfCastle(kk, p, row) {
  for (const s of castlesOf(kk)) {
    if (s.row !== row) continue; const d = dimsOf(s); const b = castleBox(s);
    if (p.x > b.x0 - d.stair && p.x < b.x1 + d.stair && p.z > b.zMin - .02 && p.z < b.zMax + .02) p.z = s.z + .05 + ((Math.abs(p.x * 7) % 10) / 100);
  }
  return p;
}

// ── life, damage, mending ───────────────────────────────────────────────────────────────────────────────────────────
export function damageCastle(game, s, amount, by = null) {
  const kk = kkState(game); if (!(amount > 0) || s.fallen) return;
  const was = castleHp(s); s.hp = Math.max(0, was - amount); s.lastHitT = kk.time; s.shake = .18;
  if (was > 0 && s.hp <= 0) {
    combat.spawnShockwave?.(s.x, groundYForDepth(s.z) - 50, 140, '#c9b8a0'); combat.shakeCamera?.(6, .35); audio.playExplosion?.();
    if (ownCastle(s)) game.showAnnouncement?.(`${s.kind === 'hq' ? 'DEINE HAUPTBURG' : `DEINE ${s.label}BURG`} IST OFFEN — VERTEIDIGE DEN KREIS AM TOR!`, 2.2);
    else if (by === game.player || by?.team === game.player.team) game.showAnnouncement?.('MAUER ZERSTÖRT — STELL DICH ALLEIN IN DEN KREIS AM TOR', 2);
  } else if (ownCastle(s) && kk.time - (s.warnAt ?? -99) > 12) { s.warnAt = kk.time; game.showAnnouncement?.(`${s.kind === 'hq' ? 'DEINE HAUPTBURG' : `DEINE ${s.label}BURG`} WIRD ANGEGRIFFEN`, 1.4); }
}
// The player's side hits a foe castle: its front wall is a target (marked as a prop: no auto-aim snaps to it).
class CastleWall {
  constructor(game, s) { this.game = game; this.s = s; const d = dimsOf(s); this.isProp = true; this.isCastleWall = true; this.team = 'neutral'; this.radius = 30; this.hitRadiusX = d.half; this.halfX = d.half; this.halfZ = .05; this.worldHeight = 0; this.elevation = 0; this.surfaceHeight = 0; this.hitHeightTolerance = 220; }
  get x() { const P = this.game.player; const b = castleBox(this.s); return Math.max(b.x0 + 10, Math.min(b.x1 - 10, P.x)); } /* the part of the wall in front of the player */
  get z() { return this.s.z + .005; }
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
  const s = castlesOf(kk).find((c) => c.row === kk.row && !c.fallen && !friendlyCastle(kk, c) && castleHp(c) > 0 && Math.abs(c.x - leader.x) < dimsOf(c).half + 120 && leader.z > c.z - .04 && leader.z < c.z + .3);
  return s ? wallOf(game, s) : null;
}

// ── the hall inside (own castles) ───────────────────────────────────────────────────────────────────────────────────
export function enterCastle(game, s) {
  const kk = kkState(game); const P = game.player; kk.inside = s; kk.panelOpen = true; P.x = s.x; P.z = s.z - .04;
  for (const m of game.minions) if (m.isKKUnit && m.team === P.team && !m.isDead && Math.abs(m.x - s.x) < 260) m.kkInHouse = s.id; /* the own squad comes along */
  game.showAnnouncement?.(s.kind === 'hq' ? 'HAUPTBURG — BAUEN, EINLAGERN, AUSBILDEN' : `${s.label}BURG — HIER BILDEST DU KRIEGER AUS`, 1.4);
}
export function leaveCastle(game) {
  const kk = kkState(game); const s = kk.inside; if (!s || s.kind === 'building') return; const P = game.player;
  kk.inside = null; kk.panelOpen = false; P.x = s.x; P.z = s.z + .05;
  for (const m of game.minions) if (m.kkInHouse === s.id) { m.kkInHouse = null; m.x = s.x + (Math.random() - .5) * 60; m.z = s.z + .06; }
}
function pushOutBox(e, b) {
  if (e.x <= b.x0 || e.x >= b.x1 || e.z <= b.zMin || e.z >= b.zMax + .01) return;
  const d = [[b.x0 - 1 - e.x, 0], [b.x1 + 1 - e.x, 0], [0, (b.zMin - .004 - e.z) * 150], [0, (b.zMax + .014 - e.z) * 150]].sort((p, q) => Math.abs(p[0]) + Math.abs(p[1]) - Math.abs(q[0]) - Math.abs(q[1]))[0];
  e.x += d[0]; e.z += d[1] / 150;
}

// ── each frame: gate, hall, mending, the defence of a breached castle ───────────────────────────────────────────────
export function updateCastles(game, dt) {
  if (!kkOn(game)) return; const kk = kkState(game); const P = game.player; const mz = game.input?.move?.z ?? 0;
  syncCastleSurfaces(game);
  for (const s of castlesOf(kk)) {
    s.shake = Math.max(0, (s.shake ?? 0) - dt);
    if (s.kind === 'castle' && castleHp(s) < castleMaxHp(s) && kk.time - (s.lastHitT ?? -99) > CASTLE.regenDelay) s.hp = Math.min(castleMaxHp(s), s.hp + castleMaxHp(s) * CASTLE.regen * dt);
  }
  const s = kk.inside;
  if (s && s.kind !== 'building') {
    if (!P.isAlive || s.row !== kk.row || !ownCastle(s) || s.fallen) { leaveCastle(game); return; }
    const b = castleBox(s);
    P.x = Math.max(b.x0 + 14, Math.min(b.x1 - 14, P.x)); if (P.z < b.zMin + .01) P.z = b.zMin + .01;
    if (P.z >= b.zMax + .005 && mz > .3) { leaveCastle(game); return; }
    if (P.z > b.zMax + .005) P.z = b.zMax + .005;
    for (const m of game.minions) {
      if (m.isDead || !m.isKKUnit) continue;
      if (m.kkInHouse === s.id) { m.x = Math.max(b.x0 + 14, Math.min(b.x1 - 14, m.x)); m.z = Math.max(b.zMin + .01, Math.min(b.zMax, m.z)); }
      else pushOutBox(m, b); /* nobody else comes in */
    }
    for (const e of [game.enemyChampion, ...(game.kkExtraFoes ?? [])]) if (e && e.lifeState === 'Alive') pushOutBox(e, b);
    return;
  }
  if (s || !P.isAlive || P.isMounted) return;
  // the gate of an own castle: walking into it
  const gate = castlesOf(kk).find((c) => c.row === kk.row && ownCastle(c) && !c.fallen && Math.abs(P.x - c.x) < CASTLE.gateHalf + 6 && P.z >= c.z - .012 && P.z <= c.z + .1 && (P.surfaceHeight ?? 0) + (P.elevation ?? 0) < 8);
  if (gate && mz < -.3) enterCastle(game, gate);
}
// Where the player's capture ring is (in front of the gate).
export const inGateRing = (s, e) => Math.abs(e.x - s.x) < 110 && e.z > s.z - .015 && e.z < s.z + .2 && (e.surfaceHeight ?? 0) + (e.elevation ?? 0) < 12;

// ── drawing ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const MATS = [['#7d7a72', '#5f5c56', '#9a968c', '#6a675f'], ['#8a6a42', '#6b4f30', '#a8845a', '#7a5c38'], ['#8d8f99', '#6c6e78', '#aeb0ba', '#7c7e88'], ['#9fb4c4', '#7890a2', '#c8d8e4', '#8aa2b4'], ['#3b2f4a', '#2b2235', '#5a4a70', '#33293f']];
const matOf = (s) => (s.kind === 'hq' ? MATS[Math.min(4, s.level ?? 0)] : s.owner == null ? ['#6a645c', '#4a4640', '#847d72', '#57524b'] : MATS[0]);
function flagOn(ctx, x, yFoot, color, t, tall) {
  px(ctx, x, yFoot - tall, 3, tall, '#3b2b1b'); px(ctx, x - 2, yFoot - tall - 4, 7, 4, '#c9a95a');
  const wave = Math.sin(t * 3 + x) * 3; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + 3, yFoot - tall + 2); ctx.lineTo(x + 44, yFoot - tall + 7 + wave); ctx.lineTo(x + 38, yFoot - tall + 17 + wave); ctx.lineTo(x + 44, yFoot - tall + 27 + wave); ctx.lineTo(x + 3, yFoot - tall + 25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(Math.round(x + 4), Math.round(yFoot - tall + 4), 32, 3);
}
function stairDraw(ctx, x0, x1, zMin, zMax, from, to, m) {
  const n = Math.max(3, Math.round((x1 - x0) / 15)); const w = (x1 - x0) / n; const yb = groundYForDepth(zMin); const yf = groundYForDepth(zMax);
  for (let i = 0; i < n; i++) {
    const hh = to > from ? to * (i + 1) / n : from * (1 - i / n); const sx = x0 + i * w; /* rising to the right, or falling from the left */
    px(ctx, sx, yb - hh, w + 1, yf - yb, m[2]); px(ctx, sx, yb - hh, w + 1, 2, '#d8d2c4');
    px(ctx, sx, yf - hh, w + 1, hh, m[1]); for (let y = yf - hh + 9; y < yf; y += 9) px(ctx, sx, y, w + 1, 1, m[3]);
  }
}
// The castle from outside: towers at the back, the rampart (walkable), the front wall with its gate, the stairs; the
// merlons of the front edge are a separate actor in front of the figures on the rampart.
export function castleActors(game) {
  const kk = kkState(game); if (!kk) return []; const P = game.player; const t = kk.time; const out = [];
  for (const s of castlesOf(kk)) {
    if (s.row !== kk.row || Math.abs(s.x - P.x) > 1800) continue;
    const clip = kk.inside === s ? null : roomClip(kk, s.x, s.z, dimsOf(s).half + dimsOf(s).stair); if (clip === 'hide') continue; /* nothing reaches into the room one stands in */
    const d = dimsOf(s); const b = castleBox(s); const yb = groundYForDepth(b.zMin); const yf = groundYForDepth(b.zMax); const H = d.h; const m = matOf(s); const big = s.kind === 'hq';
    const opts = siteOpts(kk, s); const color = opts.ownerColor ?? '#9e9e9e'; const inside = kk.inside === s;
    const behind = !inside && P.z < b.zMin + .005 && P.x > b.x0 - 60 && P.x < b.x1 + 60 && (P.surfaceHeight ?? 0) < 10;
    const alpha = clip === 'fade' ? .28 : behind ? .42 : 1; const sx = s.shake > 0 ? Math.sin(s.shake * 90) * 2 : 0; const broken = castleHp(s) <= 0 || s.fallen;
    // the towers at the back corners (and the keep of a main castle)
    out.push({ y: yb - .6, render: (ctx) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(sx, 0);
      const im = castleTowerImage(opts.biome, !!opts.friendly); const sc = big ? .42 : .34;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(s.x, yf + 4, d.half + 60, 16, 0, 0, Math.PI * 2); ctx.fill();
      if (im?.width || im?.naturalWidth) {
        const w = (im.naturalWidth || im.width) * sc; const h = (im.naturalHeight || im.height) * sc; ctx.imageSmoothingEnabled = false;
        if (big) ctx.drawImage(im, Math.round(s.x - w * .6), Math.round(yb + 6 - h * 1.2), Math.round(w * 1.2), Math.round(h * 1.2));
        ctx.drawImage(im, Math.round(b.x0 + 12 - w / 2), Math.round(yb + 8 - h), Math.round(w), Math.round(h));
        ctx.save(); ctx.translate(b.x1 - 12, 0); ctx.scale(-1, 1); ctx.drawImage(im, Math.round(-w / 2), Math.round(yb + 8 - h), Math.round(w), Math.round(h)); ctx.restore();
      } else { px(ctx, b.x0 - 20, yb - 220, 64, 228, m[1]); px(ctx, b.x1 - 44, yb - 220, 64, 228, m[1]); }
      ctx.restore();
    } });
    // the body: rampart top, front wall with gate and banners, stairs, the flag on the roof — or the cut-away hall
    out.push({ y: yb, render: (ctx) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(sx, 0);
      if (inside) hall(ctx, s, b, d, m, color, t);
      else {
        px(ctx, b.x0, yb - H, b.x1 - b.x0, yf - yb, m[2]); for (let y = yb - H + 5; y < yf - H; y += 6) px(ctx, b.x0, y, b.x1 - b.x0, 1, m[3]);
        for (let x = b.x0 + 26; x < b.x1; x += 52) px(ctx, x, yb - H, 1, yf - yb, m[3]);
        px(ctx, b.x0, yb - H - 12, b.x1 - b.x0, 12, m[1]); for (let x = b.x0; x < b.x1 - 10; x += 22) px(ctx, x + 3, yb - H - 22, 13, 10, m[0]); /* the back parapet */
        px(ctx, b.x0, yf - H, b.x1 - b.x0, H, m[1]);
        for (let y = yf - H + 3; y < yf - 3; y += 10) for (let x = b.x0 + ((Math.floor(y / 10) % 2) * 10); x < b.x1 - 4; x += 20) px(ctx, x + 1, y, 18, 8, m[0]);
        px(ctx, b.x0, yf - H, b.x1 - b.x0, 3, m[2]);
        for (const ax of [b.x0 + 50, b.x0 + 110, b.x1 - 116, b.x1 - 56]) px(ctx, ax, yf - H + 22, 6, 18, '#1a140f'); /* arrow slits */
        for (const bx of [s.x - 74, s.x + 54]) { px(ctx, bx, yf - H + 8, 22, 40, color); px(ctx, bx, yf - H + 8, 22, 3, '#c9a95a'); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(bx, yf - H + 48); ctx.lineTo(bx + 11, yf - H + 56); ctx.lineTo(bx + 22, yf - H + 48); ctx.fill(); }
        // the gate (a broken door once the wall has no life left)
        const gw = CASTLE.gateHalf; ctx.fillStyle = '#120c08'; ctx.beginPath(); ctx.moveTo(s.x - gw, yf); ctx.lineTo(s.x - gw, yf - 50); ctx.quadraticCurveTo(s.x, yf - 78, s.x + gw, yf - 50); ctx.lineTo(s.x + gw, yf); ctx.closePath(); ctx.fill();
        if (!broken) { px(ctx, s.x - gw + 4, yf - 50, gw * 2 - 8, 50, '#5a3a22'); for (let x = s.x - gw + 4; x < s.x + gw - 4; x += 8) px(ctx, x, yf - 50, 1, 50, '#3a2416'); px(ctx, s.x - gw + 4, yf - 34, gw * 2 - 8, 3, '#2a2a2a'); px(ctx, s.x - gw + 4, yf - 16, gw * 2 - 8, 3, '#2a2a2a'); }
        else { for (let i = 0; i < 5; i++) px(ctx, s.x - gw + 6 + i * 11, yf - 10 - (i % 2) * 8, 7, 10 + (i % 2) * 8, '#4a2e1a'); }
        stairDraw(ctx, b.x0 - d.stair, b.x0, b.zMin + .02, b.zMax, 0, H, m); stairDraw(ctx, b.x1, b.x1 + d.stair, b.zMin + .02, b.zMax, H, 0, m);
      }
      if (!s.fallen) flagOn(ctx, s.x - 2, groundYForDepth(b.zMin + .03) - H, color, t, big ? 86 : 66);
      if (s.label && !big) { ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; px(ctx, s.x - 30, yb - H - (big ? 112 : 92), 60, 13, 'rgba(0,0,0,.6)'); ctx.fillStyle = '#fff3c8'; ctx.fillText(s.label, s.x, yb - H - (big ? 102 : 82)); }
      ctx.restore();
    } });
    // merlons on the front edge: in front of the feet of whoever stands on the rampart
    if (!inside) out.push({ y: yf + .05, render: (ctx) => { ctx.save(); ctx.globalAlpha = alpha; ctx.translate(sx, 0); for (let x = b.x0; x < b.x1 - 10; x += 22) { px(ctx, x + 3, yf - H - 13, 14, 13, m[0]); px(ctx, x + 3, yf - H - 13, 14, 2, m[2]); } ctx.restore(); } });
    // life bar and capture ring
    const hp = castleHp(s); const max = castleMaxHp(s); const cap = s.kind === 'hq' ? (s.capT ?? 0) / CASTLE.hqCaptureTime : Math.max((kk.progress?.[s.id] ?? 0), s.capT ?? 0) / CASTLE.captureTime;
    if (!s.fallen && (hp < max || cap > 0)) out.push({ y: yf + 1, render: (ctx) => {
      const y = yb - H - (big ? 130 : 108); const w = big ? 200 : 150;
      px(ctx, s.x - w / 2 - 2, y - 2, w + 4, 12, 'rgba(0,0,0,.75)'); px(ctx, s.x - w / 2, y, w * Math.max(0, hp) / max, 8, hp > 0 ? color : '#ff5050');
      if (hp <= 0) { ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd0d0'; ctx.fillText('MAUER ZERSTÖRT', s.x, y - 6); }
      if (hp <= 0 || cap > 0) {
        const gy = groundYForDepth(s.z + .09); ctx.save(); ctx.strokeStyle = 'rgba(255,233,168,.5)'; ctx.lineWidth = 2; ctx.setLineDash?.([6, 5]); ctx.beginPath(); ctx.ellipse(s.x, gy, 110, 26, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash?.([]);
        if (cap > 0) { ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(s.x, gy, 110, 26, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, cap)); ctx.stroke(); }
        ctx.restore();
      }
    } });
  }
  return out;
}
// The hall inside a castle (front wall cut away): stone back wall with banners, weapon racks and a training dummy.
function hall(ctx, s, b, d, m, color, t) {
  const yb = groundYForDepth(b.zMin); const yf = groundYForDepth(b.zMax); const wallH = d.h + 70;
  px(ctx, b.x0 - 8, yb - wallH, b.x1 - b.x0 + 16, wallH, m[1]);
  for (let y = yb - wallH + 3; y < yb - 3; y += 12) for (let x = b.x0 + ((Math.floor(y / 12) % 2) * 12); x < b.x1 - 4; x += 24) px(ctx, x + 1, y, 22, 10, m[0]);
  px(ctx, b.x0 - 10, yb - wallH, 10, yf - yb + wallH, m[3]); px(ctx, b.x1, yb - wallH, 10, yf - yb + wallH, m[3]);
  for (let y = yb; y < yf; y += 7) for (let x = b.x0 + ((Math.floor(y / 7) % 2) * 16); x < b.x1; x += 32) px(ctx, x, y, 30, 6, (Math.floor(x / 32 + y / 7) % 2) ? '#5e5850' : '#544e47');
  for (const bx of [b.x0 + 40, s.x - 12, b.x1 - 64]) { px(ctx, bx, yb - wallH + 18, 24, 56, color); px(ctx, bx, yb - wallH + 18, 24, 3, '#c9a95a'); px(ctx, bx + 9, yb - wallH + 34, 6, 14, '#fff3c8'); }
  for (const rx of [b.x0 + 90, b.x1 - 130]) { px(ctx, rx, yb - 46, 44, 4, '#6b4428'); px(ctx, rx, yb - 18, 44, 4, '#6b4428'); for (let i = 0; i < 4; i++) { px(ctx, rx + 4 + i * 11, yb - 64, 2, 50, '#cfd8de'); px(ctx, rx + 2 + i * 11, yb - 30, 6, 3, '#8a6040'); } }
  const dx = s.x + 70; px(ctx, dx - 2, yb - 10, 4, 14, '#4a2e1a'); px(ctx, dx - 9, yb - 44, 18, 34, '#c9a064'); px(ctx, dx - 6, yb - 56, 12, 12, '#d8b478'); px(ctx, dx - 16, yb - 38, 32, 4, '#8a6040');
  for (const tx of [b.x0 + 20, b.x1 - 26]) { px(ctx, tx, yb - 70, 6, 14, '#3a2a1e'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .16 + .05 * Math.sin(t * 7 + tx); ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.arc(tx + 3, yb - 76, 30, 0, Math.PI * 2); ctx.fill(); ctx.restore(); px(ctx, tx + 1, yb - 80, 4, 7, '#ffd27a'); }
  ctx.fillStyle = 'rgba(255,240,200,.08)'; ctx.fillRect(Math.round(s.x - CASTLE.gateHalf), Math.round(yb), CASTLE.gateHalf * 2, Math.round(yf - yb)); /* light from the gate */
}
