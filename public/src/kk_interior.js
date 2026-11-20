// GRIMGE Prototype — Kronenkrieg buildings you walk into (user, 19 Nov 2026: "von außen zu, wenn man reingeht wird für
// die Sicht die Seitenwand entfernt"). Outside a house is closed; walking into its door shows the cut-away inside —
// the front wall gone — with its floors: the ground floor, and from two storeys a gallery reached by a wooden stair
// (the game's own stairs / gallery surfaces, level_structures.js). Every floor has a chest (stand in front of it to open
// it); some houses hide bandits. Walking out of the open front leaves the house. The interior bounds hold only the
// player (everyone else keeps the plane's bounds).
import { structureSurfaces } from './level_structures.js';
import { groundYForDepth } from './world.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { kkState, kkOn, applyBounds } from './kk_world.js';
import { openChest } from './kk_loot.js';
import { addRecord } from './kk_army.js';
import { damageCastle } from './kk_castle.js';

// half / depth: the inside (wider and deeper than the house looks from outside, user 19 Nov 2026); outHalf / outDepth: the
// solid footprint of the house in the world (nobody walks through a house, only through its door).
export const HOUSE = Object.freeze({ half: 140, depth: .3, floorH: 66, openTime: 1, doorHalf: 28, outHalf: 93, outDepth: .13 });
const zBack = (s) => s.z - HOUSE.depth; const zFront = (s) => s.z + .02;
const galleryBand = (s) => [zBack(s), zBack(s) + .12];
// The chests of a house: one on the ground floor, one or two on the gallery.
export function chestsOf(site) {
  if (site.chests) return site.chests;
  const f = Math.max(1, Math.min(3, site.floors ?? 1)); const [g0] = galleryBand(site);
  const list = [{ i: 0, x: site.x - 70, z: site.z - .06, h: 0 }];
  if (f >= 2) list.push({ i: 1, x: site.x - 100, z: g0 + .06, h: HOUSE.floorH });
  if (f >= 3) list.push({ i: 2, x: site.x - 30, z: g0 + .06, h: HOUSE.floorH });
  for (const c of list) c.opened = !!site.looted;
  site.chests = list; return list;
}
// Stairs (rising toward the back-left gallery) and the gallery as walkable surfaces of the game.
function houseStructures(site) {
  if ((site.floors ?? 1) < 2) return [];
  const [g0, g1] = galleryBand(site); const x0 = site.x - HOUSE.half; const x1 = site.x + HOUSE.half;
  return structureSurfaces([
    { type: 'gallery', x0, x1: site.x + 10, zMin: g0, zMax: g1, h: HOUSE.floorH, backWall: true },
    { type: 'stairs', x0: site.x + 10, x1: x1 - 46, zMin: g0, zMax: g1, from: HOUSE.floorH, to: 0, backWall: true } /* the foot stands free of the wall */
  ], 0);
}

export function enterHouse(game, site) {
  const kk = kkState(game); const P = game.player; kk.inside = site; chestsOf(site);
  game.battlefield.levelSurfaces = houseStructures(site); P.z = zFront(site) - .03;
  for (const m of game.minions) if (m.isKKUnit && m.team === P.team && Math.abs(m.x - site.x) < 200) m.kkInHouse = site.id; /* the own squad comes along */
  game.showAnnouncement?.(site.looted ? 'HAUS — SCHON DURCHSUCHT' : 'HAUS BETRETEN — TRUHEN ÖFFNEN', 1.2);
  // some houses hide renegades (decided once per house)
  if (site.guarded == null) { site.guarded = kk.rng() < .3 && !site.looted; if (site.guarded) for (let i = 0; i < 1 + Math.floor(kk.rng() * 2); i++) addRecord(kk, { team: 'red', bandit: true, cls: ['Shadow', 'Berserker'][i % 2], element: null, tier: 1, row: site.row, x: site.x - 20 + i * 30, z: site.z - .06, role: 'guard', siteId: site.id }); }
}
export function leaveHouse(game) {
  const kk = kkState(game); const P = game.player; const site = kk.inside; if (!site) return;
  kk.inside = null; game.battlefield.levelSurfaces = []; P.x = site.x; P.z = site.z + .05; applyBounds(game, kk); /* out through the door */
}

// Pushes an entity out of a box (x0..x1, z0..z1) by the shortest way (sides or front / back).
function pushOut(e, x0, x1, z0, z1) {
  if (e.x <= x0 || e.x >= x1 || e.z <= z0 || e.z >= z1) return false;
  const opts = [[x0 - 1 - e.x, 0], [x1 + 1 - e.x, 0], [0, (z0 - .004 - e.z) * 150], [0, (z1 + .004 - e.z) * 150]].sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]))[0];
  e.x += opts[0]; e.z += opts[1] / 150; return true;
}
// Houses are solid things of the world: nobody walks through one; inside, the player is safe until a foe comes in
// through the door (it then stands inside too).
function houseSolidity(game) {
  const kk = kkState(game); const P = game.player;
  for (const s of kk.map.sites) {
    if (s.kind !== 'building' || s.row !== kk.row || Math.abs(s.x - P.x) > 1600) continue;
    const inside = kk.inside === s;
    const box = inside ? [s.x - HOUSE.half, s.x + HOUSE.half, zBack(s), zFront(s)] : [s.x - HOUSE.outHalf, s.x + HOUSE.outHalf, s.z - HOUSE.outDepth, s.z + .01];
    if (!inside) pushOut(P, ...box);
    // rival champions: stopped by houses too; with the player inside they make for the door and come in there
    for (const ent of [game.enemyChampion, ...(game.kkExtraFoes ?? [])]) {
      if (!ent || ent.lifeState !== 'Alive') continue;
      if (inside && ent.kkInHouse === s.id) { ent.x = Math.max(box[0] + 8, Math.min(box[1] - 8, ent.x)); ent.z = Math.max(box[2] + .005, Math.min(box[3], ent.z)); continue; }
      if (!inside && ent.kkInHouse === s.id) ent.kkInHouse = null;
      if (inside && Math.abs(ent.x - s.x) < HOUSE.doorHalf + 8 && ent.z >= s.z - .02 && ent.z <= s.z + .14) { ent.kkInHouse = s.id; ent.z = zFront(s) - .02; ent.seen = null; continue; }
      if (inside && Math.abs(ent.x - s.x) < 700) { ent.seen = { ref: P, x: s.x, z: s.z + .08, vx: 0, vz: 0, t: 0 }; ent.seenT = .3; } /* its perception points at the door (ai_brain perceive keeps it while seenT runs) */
      pushOut(ent, ...box);
    }
    for (const m of game.minions) {
      if (m.isDead || !m.isKKUnit) continue;
      if (m.kkInHouse === s.id && inside) { m.x = Math.max(box[0] + 8, Math.min(box[1] - 8, m.x)); m.z = Math.max(box[2] + .005, Math.min(box[3], m.z)); continue; }
      if (m.kkInHouse === s.id && !inside) m.kkInHouse = null;
      // a foe at the door while the player is inside comes in
      if (inside && m.team !== P.team && Math.abs(m.x - s.x) < HOUSE.doorHalf + 6 && m.z >= s.z - .02 && m.z <= s.z + .12 && m.target?.isDoorProxy) { m.kkInHouse = s.id; m.z = zFront(s) - .02; m.target = null; continue; }
      pushOut(m, ...box);
    }
  }
}
// Where a foe aims while the player hides in a house: the door (it then follows inside).
export function doorProxy(game, unit) {
  const kk = kkState(game); const s = kk.inside; if (!s) return null;
  if (s.kind !== 'building') return { isDoorProxy: true, isCastleGate: true, team: game.player.team, x: s.x, z: s.z + .03, get y() { return groundYForDepth(s.z + .03); }, isDead: false, isAlive: true, radius: 6, takeDamage: (a) => { damageCastle(game, s, a, unit); return {}; } }; /* a castle: foes only batter its gate */
  return { isDoorProxy: true, team: game.player.team, x: s.x, z: s.z + .06, get y() { return groundYForDepth(s.z + .06); }, isDead: false, isAlive: true, radius: 6, takeDamage: () => {} };
}

export function updateInterior(game, dt) {
  if (!kkOn(game)) return; const kk = kkState(game); const P = game.player; const mz = game.input?.move?.z ?? 0;
  kk.doorProxy ??= (unit) => doorProxy(game, unit);
  houseSolidity(game);
  if (kk.inside && kk.inside.kind !== 'building') return; /* inside a castle: kk_castle.js */
  if (!kk.inside) {
    if (!P.isAlive || P.isMounted) return;
    const door = kk.map.sites.find((s) => s.kind === 'building' && s.row === kk.row && Math.abs(P.x - s.x) < HOUSE.doorHalf && P.z >= s.z - .005 && P.z <= s.z + .1);
    if (door && mz < -.3) enterHouse(game, door);
    return;
  }
  const site = kk.inside;
  if (!P.isAlive || site.row !== kk.row) { leaveHouse(game); return; }
  // the house holds the player (only the player: the plane's bounds stay for everyone else)
  P.x = Math.max(site.x - HOUSE.half + 8, Math.min(site.x + HOUSE.half - 8, P.x));
  if (P.z < zBack(site) + .005) P.z = zBack(site) + .005;
  if (P.z >= zFront(site) && mz > .3 && (P.surfaceHeight ?? 0) < 4) { leaveHouse(game); return; }
  if (P.z > zFront(site)) P.z = zFront(site);
  // chests: stand in front of one (on its floor) to open it
  for (const c of chestsOf(site)) {
    if (c.opened) continue; const onFloor = Math.abs((P.surfaceHeight ?? 0) + (P.elevation ?? 0) - c.h) < 14;
    const at = onFloor && Math.abs(P.x - c.x) < 26 && Math.abs(P.z - c.z) < .07;
    c.t = at ? (c.t ?? 0) + dt : 0;
    if (c.t >= HOUSE.openTime) { c.opened = true; openChest(game, site, c.i, { x: c.x + 24, z: c.h ? site.z - .05 : c.z + .03 }); combat.spawnShockwave?.(c.x, groundYForDepth(c.z) - c.h - 16, 34, '#f2c46a'); audio.playRuneChime?.(620); if (chestsOf(site).every((x) => x.opened)) site.looted = true; }
  }
}

// ── drawing: the cut-away house (back wall, floors, stair, gallery, chests, lamp) ──────────────────────────────────
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function chest(ctx, x, y, open, k) {
  px(ctx, x - 14, y - 16, 28, 16, '#2a1d14'); px(ctx, x - 13, y - 15, 26, 14, '#8a5a34'); px(ctx, x - 13, y - 9, 26, 2, '#c9a64a'); px(ctx, x - 2, y - 11, 4, 5, '#e6c66a');
  if (open) { px(ctx, x - 14, y - 26, 28, 10, '#6b4428'); px(ctx, x - 12, y - 17, 24, 3, '#1d140e'); }
  else if (k > 0) { ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 40, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); }
}
export function interiorActors(game) {
  const kk = kkState(game); const site = kk?.inside; if (!site || site.kind !== 'building') return [];
  const x0 = site.x - HOUSE.half; const x1 = site.x + HOUSE.half; const yb = groundYForDepth(zBack(site)); const yf = groundYForDepth(zFront(site)); const wallH = 80 + Math.min(2, site.floors ?? 1) * 62; const two = (site.floors ?? 1) >= 2;
  const [g0, g1] = galleryBand(site); const H = HOUSE.floorH; const t = kk.time;
  const out = [];
  out.push({ y: -1e6 + yb, render: (ctx) => { /* the back of the house is always behind every figure (also one on the gallery) */
    // back wall (plaster between beams), the side walls in section, the floor boards, the roof cut above
    px(ctx, x0 - 6, yb - wallH, x1 - x0 + 12, wallH, '#2a1d14'); px(ctx, x0, yb - wallH + 4, x1 - x0, wallH - 4, '#cdbd98');
    for (let bx = x0; bx < x1; bx += 24) px(ctx, bx, yb - wallH + 4, 3, wallH - 4, '#5a3d28');
    px(ctx, x0, yb - wallH + 4, x1 - x0, 3, '#5a3d28'); if (two) px(ctx, x0, yb - H - 8, x1 - x0, 4, '#5a3d28');
    for (const wx of [x0 + 18, x1 - 40]) { px(ctx, wx, yb - 52, 20, 18, '#2a1d14'); px(ctx, wx + 2, yb - 50, 16, 14, '#3a4a66'); px(ctx, wx + 9, yb - 50, 2, 14, '#2a1d14'); }
    px(ctx, x0 - 8, yb - wallH, 8, yf - yb + wallH, '#3a2a1e'); px(ctx, x1, yb - wallH, 8, yf - yb + wallH, '#3a2a1e');
    for (let y = yb; y < yf; y += 6) px(ctx, x0, y, x1 - x0, 5, (Math.floor(y / 6) % 2) ? '#7a5434' : '#6b4a2e');
    ctx.fillStyle = '#3a3f52'; ctx.beginPath(); ctx.moveTo(x0 - 14, yb - wallH); ctx.lineTo(site.x, yb - wallH - 44); ctx.lineTo(x1 + 14, yb - wallH); ctx.lineTo(x1 + 6, yb - wallH + 6); ctx.lineTo(site.x, yb - wallH - 34); ctx.lineTo(x0 - 6, yb - wallH + 6); ctx.closePath(); ctx.fill();
    // a lamp: warm light
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .08 + .03 * Math.sin(t * 4); ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.arc(site.x - 10, yb - 60, 34, 0, Math.PI * 2); ctx.fill(); ctx.restore(); px(ctx, site.x - 13, yb - 66, 6, 8, '#ffd27a');
    if (two) {
      // the gallery (a wooden floor at one storey) and the stair rising to it
      const gb = groundYForDepth(g0) - H; const gf = groundYForDepth(g1) - H; const gx1 = site.x + 10; const sx1 = x1 - 46;
      px(ctx, x0, gb, gx1 - x0, gf - gb, '#8a6040'); for (let y = gb + 3; y < gf; y += 4) px(ctx, x0, y, gx1 - x0, 1, '#6b4a2e');
      px(ctx, x0, gf, gx1 - x0, 6, '#4a2e1a'); for (let px0 = x0 + 6; px0 < gx1; px0 += 26) px(ctx, px0, gf - 18, 3, 18, '#5a3d28'); px(ctx, x0, gf - 20, gx1 - x0, 3, '#8a6040');
      /* posts under the gallery */ px(ctx, x0 + 10, gf + 6, 5, groundYForDepth(g1) - gf - 6, '#4a2e1a'); px(ctx, gx1 - 14, gf + 6, 5, groundYForDepth(g1) - gf - 6, '#4a2e1a');
      const steps = 7; for (let i = 0; i < steps; i++) { const sx = gx1 + i * (sx1 - gx1) / steps; const h = H * (1 - i / steps); px(ctx, sx, groundYForDepth(g0) - h, (sx1 - gx1) / steps + 1, groundYForDepth(g1) - groundYForDepth(g0), '#9a7048'); px(ctx, sx, groundYForDepth(g1) - h, (sx1 - gx1) / steps + 1, h, '#6b4428'); px(ctx, sx, groundYForDepth(g0) - h, 1, groundYForDepth(g1) - groundYForDepth(g0), '#4a2e1a'); }
      const rail = (x) => groundYForDepth(g1) - H * (1 - (x - gx1) / (sx1 - gx1)) - 22; for (let x = gx1; x < sx1; x += 2) px(ctx, x, rail(x), 2, 3, '#8a6040');
    }
  } });
  for (const c of chestsOf(site)) out.push({ y: groundYForDepth(c.z) - (c.h ? 0 : 0) + .2, render: (ctx) => chest(ctx, c.x, groundYForDepth(c.z) - c.h, c.opened, Math.min(1, (c.t ?? 0) / HOUSE.openTime)) });
  return out;
}
export const isInside = (game, site) => kkState(game)?.inside === site;
