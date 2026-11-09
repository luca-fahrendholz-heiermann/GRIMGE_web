// GRIMGE Prototype — level structures (AGENDA 1; user, 10 Nov 2026, Castle Crashers video: "auch das mit der treppe"):
// stairs up to an upper floor and galleries in the back depth band, so a level grows upward as well as sideways.
//   stairs   a ramp: its height rises (or falls) with x; walked onto at its foot, never from the side
//   gallery  an upper floor at one height; walked onto from the stairs at the same height, left by jumping down
// Both are "levelWalk" surfaces (battlefield.js): entered only at the same height (no teleport up from the ground),
// and the ground under them is blocked like a wall. They are drawn behind every actor (they stand in the far band).
import { groundYForDepth } from './world.js';

// defs: [{ type: 'stairs', x0, x1, zMin, zMax, from, to } | { type: 'gallery', x0, x1, zMin, zMax, h }], x relative to left.
// Furniture (below) is landing-only too, but never walked onto: you jump up. Foreground pieces have no surface.
export function structureSurfaces(defs = [], left = 0) {
  return defs.filter((d) => d.type === 'stairs' || d.type === 'gallery' || FURNITURE.has(d.type)).map((d, i) => {
    const xMin = left + d.x0; const xMax = left + d.x1; const base = { id: `structure${i}`, xMin, xMax, zMin: d.zMin, zMax: d.zMax, landingOnly: true, levelWalk: !FURNITURE.has(d.type), structure: d.type };
    if (d.type === 'stairs') { const span = Math.max(1, xMax - xMin); return { ...base, baseHeight: Math.max(d.from, d.to), heightAt: (x) => d.from + (d.to - d.from) * Math.max(0, Math.min(1, (x - xMin) / span)) }; }
    return { ...base, baseHeight: d.h };
  });
}

const STONE = { top: '#7a7280', topLine: '#5f5866', front: '#463f4f', frontLine: '#352f3d', dark: '#1e1a24', edge: '#9a92a2', wood: '#6b4a2e', woodLight: '#9a7148' };
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function gallery(ctx, x0, x1, zMin, zMax, h) {
  const yBack = groundYForDepth(zMin) - h; const yFront = groundYForDepth(zMax) - h; const yGround = groundYForDepth(zMax);
  // Top floor (planks of stone), front wall with arches down to the ground, a railing on the front edge.
  rect(ctx, x0, yBack, x1 - x0, yFront - yBack, STONE.top);
  for (let y = yBack + 6; y < yFront; y += 7) rect(ctx, x0, y, x1 - x0, 1, STONE.topLine);
  rect(ctx, x0, yFront, x1 - x0, yGround - yFront, STONE.front);
  for (let y = yFront + 10; y < yGround; y += 12) for (let x = x0 + ((y / 12) % 2 ? 0 : 14); x < x1; x += 28) rect(ctx, x, y, 1, 12, STONE.frontLine);
  for (let y = yFront + 10; y < yGround; y += 12) rect(ctx, x0, y, x1 - x0, 1, STONE.frontLine);
  for (let ax = x0 + 40; ax + 50 < x1; ax += 110) { const aw = 50; const atop = yFront + 22; rect(ctx, ax, atop + 14, aw, yGround - atop - 14, STONE.dark); for (let k = 0; k < aw; k++) { const dy = Math.sqrt(Math.max(0, (aw / 2) ** 2 - (k - aw / 2) ** 2)); rect(ctx, ax + k, atop + 14 - dy * .6, 1, dy * .6 + 1, STONE.dark); } }
  rect(ctx, x0, yFront - 2, x1 - x0, 3, STONE.edge);
  for (let px = x0 + 6; px < x1; px += 34) rect(ctx, px, yFront - 22, 4, 22, STONE.wood);
  rect(ctx, x0, yFront - 24, x1 - x0, 4, STONE.woodLight); rect(ctx, x0, yFront - 20, x1 - x0, 1, STONE.wood);
}
function stairs(ctx, x0, x1, zMin, zMax, from, to) {
  const n = Math.max(2, Math.round((x1 - x0) / 16)); const w = (x1 - x0) / n; const yBackG = groundYForDepth(zMin); const yFrontG = groundYForDepth(zMax);
  for (let i = 0; i < n; i++) {
    const u = (i + 1) / n; const h = from + (to - from) * (to > from ? u : (i / n)); const sx = x0 + i * w;
    const yBack = yBackG - h; const yFront = yFrontG - h;
    rect(ctx, sx, yBack, w + 1, yFront - yBack, STONE.top); rect(ctx, sx, yBack, 1, yFront - yBack, STONE.topLine);
    rect(ctx, sx, yFront, w + 1, yFrontG - yFront, STONE.front); rect(ctx, sx, yFront, w + 1, 2, STONE.edge);
    for (let y = yFront + 12; y < yFrontG; y += 12) rect(ctx, sx, y, w + 1, 1, STONE.frontLine);
  }
  // Handrail along the flight.
  const hy = (x) => yFrontG - (from + (to - from) * (x - x0) / (x1 - x0)) - 22;
  for (let x = x0; x <= x1; x += 2) rect(ctx, x, hy(x), 2, 3, STONE.woodLight);
  for (let x = x0 + 8; x < x1; x += 40) rect(ctx, x, hy(x), 3, 22, STONE.wood);
}
export function renderStructures(ctx, defs = [], left = 0) {
  for (const d of defs) {
    if (d.type === 'gallery') gallery(ctx, left + d.x0, left + d.x1, d.zMin, d.zMax, d.h);
    else if (d.type === 'stairs') stairs(ctx, left + d.x0, left + d.x1, d.zMin, d.zMax, d.from, d.to);
  }
}

// ── furniture platforms (Castle Crashers: bunk beds, tables, crates — jump on, fight from above) ────────────────
// { type: 'table' | 'bunk' | 'crates', x0, x1, zMin, zMax, h } stand in the middle of the field: landing-only surfaces
// (jumped onto, never walked into — the ground under them blocks like a wall), drawn in the painter's order with the
// actors (front edge), and whoever stands on / above one is drawn right after it.
export const FURNITURE = new Set(['table', 'bunk', 'crates']);
export const furnitureDefs = (defs = []) => defs.filter((d) => FURNITURE.has(d.type));
const WOOD = { top: '#9a7148', topLine: '#7a5634', front: '#6b4a2e', dark: '#3a2618', leg: '#5c3e26', cloth: '#8a8fa8', clothLight: '#b8bccf', metal: '#8c8c94' };
function furniture(ctx, d, left) {
  const x0 = left + d.x0; const x1 = left + d.x1; const yBackG = groundYForDepth(d.zMin); const yFrontG = groundYForDepth(d.zMax); const h = d.h;
  const yBack = yBackG - h; const yFront = yFrontG - h;
  if (d.type === 'table') {
    for (const lx of [x0 + 4, x1 - 9]) { rect(ctx, lx, yFront, 5, yFrontG - yFront, WOOD.leg); rect(ctx, lx, yBack + 4, 4, yBackG - yBack - 4, WOOD.dark); }
    rect(ctx, x0, yBack, x1 - x0, yFront - yBack, WOOD.top); for (let x = x0 + 12; x < x1; x += 14) rect(ctx, x, yBack, 1, yFront - yBack, WOOD.topLine);
    rect(ctx, x0, yFront, x1 - x0, 6, WOOD.front); rect(ctx, x0, yFront, x1 - x0, 1, WOOD.top);
  } else if (d.type === 'bunk') {
    // Two tiers: posts, the lower mattress, the upper bed (its top is the platform).
    for (const px of [x0 + 3, x1 - 8]) rect(ctx, px, yBack - 8, 5, yBackG - yBack + 8, WOOD.dark); /* back posts */
    for (const px of [x0, x1 - 6]) rect(ctx, px, yFront - 8, 6, yFrontG - yFront + 8, WOOD.leg);
    const mid = yFrontG - h * .45; rect(ctx, x0 + 6, mid, x1 - x0 - 12, 6, WOOD.front); rect(ctx, x0 + 6, mid - 7, x1 - x0 - 12, 7, WOOD.cloth); rect(ctx, x0 + 8, mid - 7, 14, 4, WOOD.clothLight);
    rect(ctx, x0, yBack, x1 - x0, yFront - yBack, WOOD.cloth); rect(ctx, x0 + 3, yBack + 1, 16, yFront - yBack - 2, WOOD.clothLight);
    rect(ctx, x0, yFront, x1 - x0, 7, WOOD.front); rect(ctx, x0, yFront, x1 - x0, 1, WOOD.top);
    for (let y = yFront + 10; y < mid - 8; y += 9) rect(ctx, x1 - 4, y, 8, 2, WOOD.top); /* ladder rungs */
  } else {
    // A stack of crates: front faces with planks and a cross brace, lit tops.
    const n = Math.max(1, Math.round((x1 - x0) / 34)); const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) { const cx = x0 + i * w; rect(ctx, cx, yFront, w - 2, yFrontG - yFront, WOOD.front); rect(ctx, cx, yFront, w - 2, 2, WOOD.top); rect(ctx, cx, yFront, 2, yFrontG - yFront, WOOD.dark); for (let k = 0; k < w - 4; k++) rect(ctx, cx + 2 + k, yFront + 2 + (yFrontG - yFront - 4) * k / (w - 4), 1, 2, WOOD.dark); }
    rect(ctx, x0, yBack, x1 - x0 - 2, yFront - yBack, WOOD.top); for (let x = x0 + 8; x < x1; x += 10) rect(ctx, x, yBack, 1, yFront - yBack, WOOD.topLine);
  }
}
// Painter-order entries for the furniture (sorted with the actors by their front edge).
export function furnitureEntries(defs = [], left = 0) {
  return furnitureDefs(defs).map((d) => ({ y: groundYForDepth(d.zMax) + .01, render: (c) => furniture(c, d, left) }));
}
// The furniture an actor stands on or hovers above (drawn right after it), else null.
export function furnitureUnder(defs = [], left = 0, a) {
  if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.z)) return null;
  const wh = (a.surfaceHeight ?? 0) + (a.elevation ?? 0);
  for (const d of furnitureDefs(defs)) if (a.x >= left + d.x0 - 6 && a.x <= left + d.x1 + 6 && a.z >= d.zMin - .02 && a.z <= d.zMax + .02 && wh >= d.h - 6) return { frontY: groundYForDepth(d.zMax) };
  return null;
}

// ── foreground (in front of the battle line, parallax 1.25; see-through where the Wizard is behind) ────────────
// { type: 'fg_pillar' | 'fg_chain', x } — dark silhouettes framing the scene like Castle Crashers' beds and pillars.
export function renderForeground(ctx, defs = [], left = 0, camX = 0, player = null) {
  for (const d of defs) {
    if (d.type !== 'fg_pillar' && d.type !== 'fg_chain') continue;
    const x = left + d.x - camX * .25; const behind = player && Math.abs(player.x - x) < (d.type === 'fg_pillar' ? 44 : 16);
    ctx.save(); ctx.globalAlpha = behind ? .4 : .88;
    if (d.type === 'fg_pillar') {
      const top = groundYForDepth(.3) - 330; const bot = groundYForDepth(1) + 120;
      rect(ctx, x - 26, top, 52, bot - top, '#120e16'); rect(ctx, x - 26, top, 4, bot - top, '#2a2232'); rect(ctx, x + 18, top, 3, bot - top, '#0a080c');
      for (let y = top + 30; y < bot; y += 46) rect(ctx, x - 26, y, 52, 3, '#1e1824');
      rect(ctx, x - 34, groundYForDepth(1) - 6, 68, 14, '#1a1420');
    } else {
      const top = groundYForDepth(0) - 420; const bot = groundYForDepth(.2) - 210;
      for (let y = top; y < bot; y += 9) { rect(ctx, x - 3, y, 6, 6, '#1a1620'); rect(ctx, x - 1, y + 1, 2, 4, '#3a3442'); }
      rect(ctx, x - 9, bot, 18, 10, '#141018');
    }
    ctx.restore();
  }
}
