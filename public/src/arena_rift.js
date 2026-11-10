// GRIMGE Prototype — Arena rules "Riss + Leben" (DESIGN.md §4a, decided 10 Nov 2026; user: "bitte umsetzen").
// An own take on the percent principle, with own names and look:
//   Riss          hits no longer take life — they crack the fighter's rune shield; the more cracked, the farther a hit
//                 throws (knockback × (1 + crack · KNOCK_PER_CRACK)). Shown as a shield with cracks, no big number.
//   Bannrand      a rune circle closes the arena at its left and right edges: thrown into it hard enough it breaks —
//                 knocked out. A softer impact only makes it flare.
//   Abgrund       a chasm in the middle under the floating centre platform: whoever is knocked into it falls (walking or
//                 jumping into it on purpose only pushes back to the edge — the AI never stumbles in).
//   Seelenfunken  3 lives per side; a knock-out costs one, the fighter returns from above with a whole shield and a short
//                 grace; the last spark lost ends the duel.
// The old life-bar duel stays available (GAME_MODES.arena.rules = 'hp') for ranked duels later.
import { ARENA_LAYOUT, groundYForDepth, ENTITY_VISUALS } from './world.js';
import { combat } from './combat.js';

export const RIFT = Object.freeze({
  lives: 3,
  crackPerDamage: .6,
  knockPerCrack: 1 / 70,
  rimBreakSpeed: 380,        // px/s of knockback when touching the rim → it breaks
  respawnGrace: 2,           // s of invulnerability after a return
  pit: Object.freeze({ x0: 470, x1: 554, z0: .36, z1: .66 })
});

export const riftOn = (game) => game?.activeMode?.id === 'arena' && !!game?.modeState?.rift;
const fighters = (game) => [game.player, game.enemyChampion].filter(Boolean);

// Called once when an arena duel starts (main.js applyModeLayout).
export function setupRift(game) {
  game.modeState.rift = { spawns: new Map(), flashes: [] };
  for (const f of fighters(game)) { f.crack = 0; f.soulSparks = RIFT.lives; f.riftGrace = 0; game.modeState.rift.spawns.set(f, { x: f.x, z: f.z }); }
}

// A hit on a fighter in rift mode: the shield cracks instead of life being lost.
// Returns null outside rift mode, { ignored } during the return grace, else { mult } for the knockback.
export function riftAbsorb(entity, amount) {
  const game = globalThis.window?.gameWorld; if (!riftOn(game) || !fighters(game).includes(entity)) return null;
  if ((entity.riftGrace ?? 0) > 0) return { ignored: true };
  entity.crack = (entity.crack ?? 0) + Math.max(0, amount) * RIFT.crackPerDamage;
  return { mult: 1 + entity.crack * RIFT.knockPerCrack };
}
// Status / hazard damage only cracks (no knockback).
export function riftAbsorbHazard(entity, amount) {
  const r = riftAbsorb(entity, amount); return !!r;
}

const inPit = (f) => f.x >= RIFT.pit.x0 && f.x <= RIFT.pit.x1 && f.z >= RIFT.pit.z0 && f.z <= RIFT.pit.z1;

// Per frame (after the physics): rim break, chasm fall, return grace.
export function updateRift(game, dt) {
  if (!riftOn(game)) return;
  const st = game.modeState.rift; const b = ARENA_LAYOUT.playableBounds;
  st.flashes = st.flashes.filter((fl) => (fl.t -= dt) > 0);
  for (const f of fighters(game)) {
    if (f.riftGrace > 0) f.riftGrace = Math.max(0, f.riftGrace - dt);
    if (!(f.soulSparks > 0) || f.lifeState === 'Dead') continue;
    const kb = f.kbVelX ?? 0;
    const atLeft = f.x <= b.left + 3 && kb < 0; const atRight = f.x >= b.right - 3 && kb > 0;
    if (atLeft || atRight) {
      if (Math.abs(kb) >= RIFT.rimBreakSpeed) { knockOut(game, f, 'rim', atLeft ? -1 : 1); continue; }
      if (Math.abs(kb) > 120 && !st.flashes.some((fl) => fl.f === f)) st.flashes.push({ f, side: atLeft ? -1 : 1, z: f.z, t: .35 });
    }
    if (inPit(f) && (f.surfaceHeight ?? 0) <= 0 && (f.elevation ?? 0) <= 1) {
      const thrown = f.state === 'hurt' || Math.abs(kb) > 120;
      if (thrown) { knockOut(game, f, 'pit', 0); continue; }
      // Walked or hopped in on purpose: back to the nearest edge.
      const p = RIFT.pit; const d = [[f.x - p.x0, 'x0'], [p.x1 - f.x, 'x1'], [(f.z - p.z0) * 150, 'z0'], [(p.z1 - f.z) * 150, 'z1']].sort((a, c) => a[0] - c[0])[0][1];
      if (d === 'x0') f.x = p.x0 - 1; else if (d === 'x1') f.x = p.x1 + 1; else if (d === 'z0') f.z = p.z0 - .01; else f.z = p.z1 + .01;
      f.vx = 0; f.vz = 0;
    }
  }
}

function knockOut(game, f, how, side) {
  const st = game.modeState.rift; const y = groundYForDepth(f.z) - (f.surfaceHeight ?? 0) - (f.elevation ?? 0);
  f.soulSparks -= 1;
  combat.shakeCamera(16, .6); combat.triggerHitstop?.(8);
  combat.spawnShockwave(f.x, y - 30, 120, how === 'pit' ? '#7c4dff' : '#ffd740');
  combat.spawnHitSparks(f.x, y - 30, side || 1, '#fff3c8', 30);
  if (how === 'rim') st.flashes.push({ f, side, z: f.z, t: .9, broken: true });
  const mine = f === game.player;
  game.showAnnouncement?.(`${how === 'pit' ? 'IN DEN ABGRUND' : 'BANNRAND GEBROCHEN'} · ${mine ? 'DU' : 'CHAMPION'}: ${Math.max(0, f.soulSparks)} SEELENFUNKEN`, 2);
  if (f.soulSparks <= 0) {
    game.finishMode(mine ? 'red' : 'blue', mine ? 'DEFEAT — YOUR LAST SOUL SPARK IS GONE' : 'VICTORY — THE CHAMPION IS OUT OF SOUL SPARKS');
    return;
  }
  // Return from above at the start point with a whole shield and a short grace.
  const s = st.spawns.get(f) ?? { x: 512, z: .58 };
  f.x = s.x; f.z = s.z; f.crack = 0; f.riftGrace = RIFT.respawnGrace;
  f.kbVelX = 0; f.vx = 0; f.vz = 0; f.elevation = 160; f.vElevation = 0; f.grounded = false; f.surfaceHeight = 0; f.surfaceId = null;
  if (f.state === 'hurt') { f.state = 'idle'; f.stateTimer = 0; }
  if ('canAttack' in f) f.canAttack = true;
}

// ── visuals ─────────────────────────────────────────────────────────────────────────────────────────────────────
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

// Under the actors: the chasm and the two rim walls of runes.
export function renderRiftGround(ctx, game) {
  if (!riftOn(game)) return;
  const p = RIFT.pit; const yF = groundYForDepth(p.z0); const yN = groundYForDepth(p.z1); const t = performance.now() / 1000;
  // Chasm: a dark cut through the floor — broken, jagged edges, depth bands falling away, a lit rune lip on the far edge.
  const jag = (x, k) => Math.round(Math.abs(Math.sin(x * .7 + k) * 2.4 + Math.sin(x * 1.9 + k * 3)));
  for (let x = p.x0; x < p.x1; x++) {
    const top = yF + jag(x, 1); const bot = yN - jag(x, 4); const edge = Math.min(x - p.x0, p.x1 - 1 - x);
    const inset = edge < 4 ? 4 - edge : 0; px(ctx, x, top + inset, 1, bot - top - inset * 2, '#07050b');
    // Depth bands: the far wall steps down into the dark.
    for (let k = 0; k < 4; k++) { const yy = top + 3 + k * 5 + jag(x, 7 + k); if (yy < bot - 4) px(ctx, x, yy, 1, 2, ['#241c30', '#1a1424', '#120e1a', '#0c0a12'][k]); }
    px(ctx, x, top - 1, 1, 2, '#5a4c6a'); px(ctx, x, bot - 1, 1, 2, '#2e2638');
    if (x % 7 === 0) { const a = .35 + .35 * Math.sin(t * 3 + x * .3); ctx.globalAlpha = a; px(ctx, x, top - 2, 3, 1, '#b388ff'); ctx.globalAlpha = 1; }
  }
  ctx.globalAlpha = 1;
}
// Over the actors: rim flares, the shield with cracks and the soul sparks above each fighter (the knock-out is announced).
export function renderRiftOverlay(ctx, game) {
  if (!riftOn(game)) return;
  const st = game.modeState.rift; const b = ARENA_LAYOUT.playableBounds; const t = performance.now() / 1000;
  // The rim: a column of runes at each side, faint; flaring where a fighter hits it, shattering when it breaks.
  for (const side of [-1, 1]) {
    const x = side < 0 ? b.left - 6 : b.right + 4; const y0 = groundYForDepth(b.farZ) - 120; const y1 = groundYForDepth(b.nearZ) + 6;
    for (let y = y0; y < y1; y += 9) { ctx.globalAlpha = .18 + .1 * Math.sin(t * 2 + y * .2); px(ctx, x, y, 2, 5, '#9fe0ff'); }
    for (const fl of st.flashes.filter((f) => f.side === side)) {
      const yc = groundYForDepth(fl.z) - 30; const k = fl.broken ? fl.t / .9 : fl.t / .35;
      for (let i = -6; i <= 6; i++) { ctx.globalAlpha = Math.max(0, k * (1 - Math.abs(i) / 7)); px(ctx, x - 2 + (fl.broken ? (i % 2) * 6 * (1 - k) * side : 0), yc + i * 8, 6, 5, fl.broken ? '#ffd740' : '#e0f7ff'); }
    }
  }
  ctx.globalAlpha = 1;
  for (const f of fighters(game)) {
    if (!(f.soulSparks > 0) || f.lifeState === 'Dead') continue;
    const y = f.y - ENTITY_VISUALS.heroHeight - 24; drawShield(ctx, f.x, y, f.crack ?? 0, (f.riftGrace ?? 0) > 0, t);
    for (let i = 0; i < RIFT.lives; i++) { const on = i < f.soulSparks; const sx = f.x - 12 + i * 12; px(ctx, sx - 2, y + 14, 5, 5, on ? '#ffe9a8' : '#3a3048'); if (on) px(ctx, sx - 1, y + 15, 3, 3, '#fffbe8'); }
  }
}
// The rune shield: whole and blue-white when fresh, more cracks and a warmer, flickering colour the more it is cracked.
function drawShield(ctx, x, y, crack, grace, t) {
  const stage = crack < 25 ? 0 : crack < 60 ? 1 : crack < 100 ? 2 : crack < 150 ? 3 : 4;
  const body = ['#cfeaff', '#ffe7a8', '#ffc061', '#ff8a3a', '#ff4a3a'][stage]; const rim = ['#5aa0d8', '#c89a3a', '#c8742a', '#b84a1e', '#8a1e14'][stage];
  if (stage === 4 && Math.sin(t * 30) > .3) return;
  if (grace && Math.sin(t * 20) > 0) return;
  // Kite shield, 13 × 15.
  for (let r = 0; r < 15; r++) { const half = r < 9 ? 6 : Math.max(0, 6 - (r - 8)); px(ctx, x - half - 1, y + r, half * 2 + 3, 1, rim); if (half > 0) px(ctx, x - half, y + r, half * 2 + 1, 1, body); }
  px(ctx, x, y + 2, 1, 9, rim);
  const cracks = [[[-3, 2], [-1, 6], [-4, 9]], [[3, 3], [1, 7], [4, 10]], [[0, 11], [-2, 13]], [[-5, 5], [-2, 4]]];
  for (let k = 0; k < Math.min(stage, cracks.length); k++) {
    const c = cracks[k]; for (let i = 1; i < c.length; i++) { const [ax, ay] = c[i - 1]; const [bx, by] = c[i]; const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); for (let j = 0; j <= n; j++) px(ctx, x + Math.round(ax + (bx - ax) * j / n), y + Math.round(ay + (by - ay) * j / n), 1, 1, '#2a1a10'); }
  }
}
