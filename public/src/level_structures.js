// GRIMGE Prototype — level structures (AGENDA 1; user, 10 Nov 2026, Castle Crashers video: "auch das mit der treppe"):
// stairs up to an upper floor and galleries in the back depth band, so a level grows upward as well as sideways.
//   stairs   a ramp: its height rises (or falls) with x; walked onto at its foot, never from the side
//   gallery  an upper floor at one height; walked onto from the stairs at the same height, left by jumping down
// Both are "levelWalk" surfaces (battlefield.js): entered only at the same height (no teleport up from the ground),
// and the ground under them is blocked like a wall. They are drawn behind every actor (they stand in the far band).
import { groundYForDepth } from './world.js';

// defs: [{ type: 'stairs', x0, x1, zMin, zMax, from, to } | { type: 'gallery', x0, x1, zMin, zMax, h }], x relative to left.
export function structureSurfaces(defs = [], left = 0) {
  return defs.map((d, i) => {
    const xMin = left + d.x0; const xMax = left + d.x1; const base = { id: `structure${i}`, xMin, xMax, zMin: d.zMin, zMax: d.zMax, landingOnly: true, levelWalk: true, structure: d.type };
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
