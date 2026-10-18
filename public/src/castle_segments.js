// GRIMGE Prototype — segmented castles and structural collapse (port of
// Unity GRIMGE Code/Gameplay/Structures/Tower.cs + tower_player.asset).
//
// A castle has global health AND seven segments. A hit subtracts from the
// struck segment and passes the SAME amount to the global health (segments
// add detail, not durability). The castle collapses — once, by whichever
// route comes first — when
//   • its global health reaches zero, or
//   • at least 60 % of its load-bearing segments are destroyed (2 of 3:
//     A3, B1, B2 — Unity's collapseThreshold 0.6).
// A collapse takes every remaining segment down with it: the staggered fall
// is presentation only; the castle is gone the moment it collapses.
//
// Unity durabilities scaled by 1800 / 750 (the prototype's castle health).
// The Siege castles are painted into arena_bg.jpg, so the segments are
// screen regions of that painting (blue castle; red mirrored): C = the two
// tower tops, B = the keep with the battlement, A = the front wall, A1 at
// the lane edge (lane units strike it first), A3 the outer load-bearing wall.
import { audio } from './audio.js';
import { combat } from './combat.js';

const SCALE = 1800 / 750;
export const COLLAPSE_THRESHOLD = 0.6;
export const SEGMENT_SPECS = Object.freeze([
  Object.freeze({ id: 'A1', row: 'A', durability: 180 * SCALE, loadBearing: false, rect: Object.freeze({ x: 150, y: 250, w: 62, h: 140 }) }),
  Object.freeze({ id: 'A2', row: 'A', durability: 220 * SCALE, loadBearing: false, rect: Object.freeze({ x: 78, y: 250, w: 72, h: 140 }) }),
  Object.freeze({ id: 'A3', row: 'A', durability: 220 * SCALE, loadBearing: true, rect: Object.freeze({ x: 0, y: 250, w: 78, h: 140 }) }),
  Object.freeze({ id: 'B1', row: 'B', durability: 200 * SCALE, loadBearing: true, rect: Object.freeze({ x: 0, y: 118, w: 100, h: 132 }) }),
  Object.freeze({ id: 'B2', row: 'B', durability: 200 * SCALE, loadBearing: true, rect: Object.freeze({ x: 100, y: 118, w: 106, h: 132 }) }),
  Object.freeze({ id: 'C1', row: 'C', durability: 120 * SCALE, loadBearing: false, rect: Object.freeze({ x: 72, y: 0, w: 86, h: 118 }) }),
  Object.freeze({ id: 'C2', row: 'C', durability: 120 * SCALE, loadBearing: false, rect: Object.freeze({ x: 0, y: 8, w: 72, h: 112 }) })
]);
// Which rows a hit reaches first: lane strikes hit the front wall, spells
// and projectiles arc onto the keep and the tower tops.
const ROW_ORDER = { ground: ['A', 'B', 'C'], spell: ['B', 'C', 'A'] };
const COLLAPSE_ORDER = ['C', 'B', 'A'];

const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

export function createSegments(team) {
  return SEGMENT_SPECS.map((spec) => {
    const r = spec.rect;
    const rect = team === 'red' ? { x: 1024 - r.x - r.w, y: r.y, w: r.w, h: r.h } : { ...r };
    return { id: spec.id, row: spec.row, loadBearing: spec.loadBearing, max: spec.durability, hp: spec.durability, destroyed: false, rect, cracks: [], fallAt: null };
  });
}

// Pick the segment a hit lands on (lane edge first within a row).
export function segmentForHit(castle, hitKind) {
  const order = ROW_ORDER[hitKind === 'spell' ? 'spell' : 'ground'];
  for (const row of order) {
    const alive = castle.segments.filter((s) => s.row === row && !s.destroyed);
    if (alive.length) return alive[0];
  }
  return null;
}

// Apply a hit: the segment loses it locally, the castle globally (same amount).
export function damageSegments(castle, amount, hitKind) {
  const seg = segmentForHit(castle, hitKind);
  if (seg) {
    seg.hp = Math.max(0, seg.hp - amount);
    // Cracks spread with the damage taken.
    const want = Math.floor((1 - seg.hp / seg.max) * 9);
    const r = rng(seg.id.charCodeAt(0) * 31 + seg.id.charCodeAt(1) + seg.cracks.length * 7);
    while (seg.cracks.length < want) {
      const x0 = seg.rect.x + r() * seg.rect.w; const y0 = seg.rect.y + r() * seg.rect.h * .5;
      const pts = [[x0, y0]]; let x = x0; let y = y0;
      for (let i = 0; i < 4; i++) { x += (r() - .5) * 18; y += 6 + r() * 14; pts.push([x, y]); }
      seg.cracks.push(pts);
    }
    if (seg.hp <= 0 && !seg.destroyed) {
      destroySegment(castle, seg, true);
      if (seg.loadBearing) {
        castle.loadBearingLost = (castle.loadBearingLost ?? 0) + 1;
        const total = castle.segments.filter((s) => s.loadBearing).length;
        if (!castle.isDestroyed && castle.loadBearingLost / total + 1e-4 >= COLLAPSE_THRESHOLD) collapseCastle(castle, true);
      }
    }
  }
  castle.hp = Math.max(0, castle.hp - amount);
  if (castle.hp <= 0 && !castle.isDestroyed) collapseCastle(castle, false);
  return seg;
}

function destroySegment(castle, seg, report) {
  seg.destroyed = true; seg.hp = 0; seg.fallAt = castle.age ?? 0;
  const r = rng(seg.id.charCodeAt(0) * 97 + seg.id.charCodeAt(1));
  castle.debris ??= [];
  const n = report ? 16 : 10;
  for (let i = 0; i < n; i++) {
    castle.debris.push({ x: seg.rect.x + r() * seg.rect.w, y: seg.rect.y + r() * seg.rect.h * .6, vx: (r() - .5) * 70, vy: -40 - r() * 60, rot: r() * 6, vr: (r() - .5) * 8, size: 4 + r() * 7, life: 1.4 + r() * .8, t: 0 });
  }
  combat.spawnHitSparks(seg.rect.x + seg.rect.w / 2, seg.rect.y + seg.rect.h / 2, 1, '#b0a080', 14);
  combat.shakeCamera(report ? 8 : 5, .3);
  if (report) audio.playImpact(true);
}

// The castle falls: once, by whichever route got there first. Every segment
// still standing comes down; the visual fall is staggered (C → B → A).
export function collapseCastle(castle, structural) {
  if (castle.isDestroyed) return;
  castle.isDestroyed = true; castle.isVulnerable = false; castle.collapsedStructurally = structural;
  castle.hpAtCollapse = castle.hp; castle.hp = 0;
  castle.collapseStart = castle.age ?? 0;
  castle.segments.forEach((seg) => {
    if (seg.destroyed) return;
    const delay = COLLAPSE_ORDER.indexOf(seg.row) * .45 + Math.random() * .2;
    seg.pendingFall = delay;
  });
  audio.playImpact(true); combat.shakeCamera(20, 1.2);
  castle.onDestroyed?.(castle);
}

// Per frame: staggered fall of the remaining segments, debris physics, smoke.
export function updateSegments(castle, dt) {
  castle.age = (castle.age ?? 0) + dt;
  for (const seg of castle.segments) {
    if (seg.pendingFall === undefined || seg.destroyed) continue;
    seg.pendingFall -= dt;
    if (seg.pendingFall <= 0) { delete seg.pendingFall; destroySegment(castle, seg, false); }
  }
  if (castle.debris) {
    for (const d of castle.debris) { d.t += dt; d.vy += 260 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; }
    castle.debris = castle.debris.filter((d) => d.t < d.life);
  }
}

// Draw cracks, broken segments, falling debris and (after a collapse) the ruin.
export function renderSegments(ctx, castle) {
  const t = castle.age ?? 0;
  ctx.save();
  for (const seg of castle.segments) {
    const { x, y, w, h } = seg.rect;
    if (!seg.destroyed && seg.hp < seg.max) {
      // Darkening grows with the damage taken.
      ctx.fillStyle = `rgba(20,14,12,${.35 * (1 - seg.hp / seg.max)})`; ctx.fillRect(x, y, w, h);
    }
    if (!seg.destroyed && seg.cracks.length) {
      ctx.strokeStyle = 'rgba(14,10,8,.95)'; ctx.lineWidth = 3;
      for (const c of seg.cracks) { ctx.beginPath(); c.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,170,90,.35)'; ctx.lineWidth = 1;
      for (const c of seg.cracks) { ctx.beginPath(); c.forEach(([px, py], i) => (i ? ctx.lineTo(px + 1, py) : ctx.moveTo(px + 1, py))); ctx.stroke(); }
    }
    if (seg.destroyed) {
      // The broken segment: dark hollow with jagged edges and a rubble base.
      const k = Math.min(1, (t - (seg.fallAt ?? t)) / .5);
      const r = rng(seg.id.charCodeAt(0) * 13 + seg.id.charCodeAt(1));
      ctx.fillStyle = `rgba(12,10,12,${.94 * k})`;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      for (let i = 0; i <= 6; i++) ctx.lineTo(x + (i / 6) * w, y + h * (.05 + r() * .35));
      ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
      // Lit broken stone along the fracture line.
      ctx.strokeStyle = `rgba(150,132,110,${.8 * k})`; ctx.lineWidth = 2; ctx.stroke();
      // Rubble heap at the foot.
      for (let i = 0; i < 18; i++) {
        const bx = x + r() * w; const by = y + h - 4 - r() * 26 * k; const s = 5 + r() * 10;
        ctx.fillStyle = r() < .5 ? '#3b3530' : '#5a5148';
        ctx.fillRect(bx - s / 2, by - s / 2, s, s * .7);
      }
      // Smoke curling up.
      for (let i = 0; i < 3; i++) {
        const phase = (t * .35 + i / 3 + r()) % 1;
        ctx.fillStyle = `rgba(60,58,62,${.35 * (1 - phase)})`;
        ctx.beginPath(); ctx.arc(x + w * (.3 + i * .2), y + h * .3 - phase * 50, 8 + phase * 14, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  for (const d of castle.debris ?? []) {
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
    ctx.globalAlpha = Math.max(0, 1 - d.t / d.life);
    ctx.fillStyle = '#5c5246'; ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size * .75);
    ctx.fillStyle = '#7d7062'; ctx.fillRect(-d.size / 2, -d.size / 2, d.size, 2);
    ctx.restore();
  }
  if (castle.isDestroyed) {
    // The ruin: smoke haze and rubble mounds over the lower castle.
    const k = Math.min(1, ((castle.age ?? 0) - (castle.collapseStart ?? 0)) / 1.6);
    const xs = castle.segments.map((sg) => sg.rect.x); const x0 = Math.min(...xs); const x1 = Math.max(...castle.segments.map((sg) => sg.rect.x + sg.rect.w));
    ctx.fillStyle = `rgba(30,26,28,${.45 * k})`; ctx.fillRect(x0, 0, x1 - x0, 390);
    const rr = rng(castle.team === 'red' ? 77 : 33);
    for (let i = 0; i < 7; i++) {
      const mx = x0 + (i + .5) / 7 * (x1 - x0); const mh = (40 + rr() * 60) * k;
      ctx.fillStyle = i % 2 ? '#3a332d' : '#4a4038';
      ctx.beginPath(); ctx.moveTo(mx - 34, 392); ctx.lineTo(mx - 10, 392 - mh); ctx.lineTo(mx + 14, 392 - mh * .8); ctx.lineTo(mx + 36, 392); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(140,124,104,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx - 10, 392 - mh); ctx.lineTo(mx + 14, 392 - mh * .8); ctx.stroke();
    }
    // Embers glowing in the ruin.
    for (let i = 0; i < 6; i++) {
      const seg = castle.segments[i % castle.segments.length];
      const px = seg.rect.x + ((i * 37) % seg.rect.w); const py = seg.rect.y + seg.rect.h - 10;
      ctx.fillStyle = `rgba(255,${120 + (i * 20) % 80},40,${.4 + .3 * Math.sin(t * 3 + i)})`;
      ctx.fillRect(px, py, 2, 2);
    }
  }
  ctx.restore();
}

// Status line for HUD / debug.
export function segmentStatus(castle) {
  const lost = castle.segments.filter((s) => s.destroyed).length;
  const lb = castle.segments.filter((s) => s.loadBearing);
  return `${castle.segments.length - lost}/${castle.segments.length} SEGMENTS · LOAD-BEARING ${lb.length - lb.filter((s) => s.destroyed).length}/${lb.length}`;
}
