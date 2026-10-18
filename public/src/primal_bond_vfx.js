// GRIMGE Prototype — Primal Bond ENERGY OVERLAY (Bond Form stage I,
// docs/PrimalCompanionSystem_concept.md: "visuell als Energy Overlay — Aura
// über dem Charakter"). Stages II / III are sprite replacements in Unity; the
// prototype has no such sprites, so they reuse this overlay at a higher
// intensity. Attachment-only: the Wizard's sprite stays unchanged.
//  • Wolf (Synchronization): green spirit-fur flames rising from the back
//    contour, a spectral wolf head over the back shoulder (jaw opens on
//    attacks), a swinging spirit tail, claw streaks at the front hand and
//    paw sparks while running; Primal Pounce projects a lunging spirit wolf.
//  • Turtle (Shell Sync): a dome of hex shell plates on the back, stone
//    bracers, a ripple ring at the feet; on guard the plates fold forward
//    into a hex shield, Fortified makes them flare, Shell Rush rams a shell
//    plate ahead.
import { plate, band, fallout, sockets } from './buff_vfx.js';

const TAU = Math.PI * 2;
const WOLF = { kind: 'crystal', dark: '#16341a', body: '#5fd36a', facet: '#c8f5b0', vein: '#73eb47', edge: '#f2d12e', spark: '#fff07a', core: '#fffde0', glow: 'rgba(115,235,71,', edgeGlow: 'rgba(242,209,46,' };
const WOLF_SMOKE = { ...WOLF, kind: 'smoke', body: '#3fae4a', facet: '#9be38a' };
const SHELL = { kind: 'crust', dark: '#0e2a33', body: '#2f6f80', facet: '#4f97a8', vein: '#57e0f0', edge: '#bff6ff', spark: '#9ff3ff', core: '#ffffff', glow: 'rgba(56,173,209,', edgeGlow: 'rgba(191,246,255,' };

const attacking = (p) => /^(attack|heavyStrike|uppercut|dive)/.test(p.state ?? '') && (p.stateTimer ?? 0) > 0;
const hex = (cx, cy, r, rot = 0, sq = 1) => Array.from({ length: 6 }, (_, i) => { const a = rot + i * TAU / 6; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * sq]; });

function wolfOverlay(ctx, p, s, k, layer, bond) {
  const f = s.f; const t = p.animTime ?? 0; const atk = attacking(p); const run = Math.min(1, Math.abs(p.vx ?? 0) / 220);
  if (layer === 'back') {
    // Spirit-fur flames licking up from the back contour.
    for (let i = 0; i < 7; i++) {
      const base = [s.back[0] - f * (2 + i * 3), s.back[1] + 30 - i * 9]; const ph = (t * 2.4 + i * .37) % 1;
      const L = (18 + (i % 3) * 8) * k * (1 + run * .4);
      const pts = [base, [base[0] - f * (6 + run * 14) + Math.sin(t * 6 + i) * 3, base[1] - L * .5], [base[0] - f * (10 + run * 24), base[1] - L]];
      band(ctx, pts, (q) => 4 - q * 1.6, WOLF_SMOKE, 9600 + i, { t, alpha: .75 * (1 - ph * .5) });
    }
    // Swinging spirit tail behind the hip.
    const sw = Math.sin(t * 3) * .4 - run * .6;
    const tail = []; for (let q = 0; q <= 7; q++) { const u = q / 7; tail.push([s.hipB[0] - f * (8 + u * 46 * k), s.hipB[1] - 4 - Math.sin(u * Math.PI) * 14 + Math.sin(sw + u * 3) * 10 * u]); }
    band(ctx, tail, (q, n) => 6 * (1 - q / n) + 1.5, WOLF, 9610, { t, alpha: .9 });
    // Spectral wolf head over the back shoulder, looking forward; the jaw opens on attacks.
    const hx = s.shoulderB[0] - f * 8; const hy = s.shoulderB[1] - 26 * k + Math.sin(t * 2) * 2; const sc = 1.1 * k; const open = atk ? 6 : 1.5;
    const P = (u, v) => [hx + f * u * sc, hy + v * sc];
    plate(ctx, [P(-12, -4), P(-4, -12), P(10, -10), P(22, -4), P(24, 0), P(8, 2), P(-10, 8)], WOLF, 9620, { alpha: .9, glowEdge: 1.2, lit: .8 });
    plate(ctx, [P(6, 3), P(24, 2 + open), P(10, 9 + open)], WOLF, 9621, { alpha: .85, glowEdge: 1 }); // lower jaw
    plate(ctx, [P(-6, -10), P(-2, -22), P(3, -11)], WOLF, 9622, { alpha: .9, glowEdge: 1 });       // ears
    plate(ctx, [P(1, -11), P(6, -21), P(9, -10)], WOLF, 9623, { alpha: .9, glowEdge: 1 });
    plate(ctx, [P(8, -6), P(12, -7), P(11, -4)], { ...WOLF, body: '#fff07a' }, 9624, { alpha: 1, core: 1 }); // eye glint
  } else {
    // Claw streaks at the front hand while attacking.
    if (atk) for (let c = 0; c < 3; c++) { const [x, y] = s.handF; plate(ctx, [[x + f * 4, y - 8 + c * 6], [x + f * 30 * k, y - 14 + c * 7], [x + f * 26 * k, y - 11 + c * 7]], WOLF, 9630 + c, { alpha: .95, glowEdge: 1.3, core: .6 }); }
    // Paw sparks while running.
    if (run > .3 && Math.sin(t * 16) > .6) for (const foot of [s.footF, s.footB]) plate(ctx, [[foot[0] - 3, foot[1]], [foot[0], foot[1] - 4], [foot[0] + 3, foot[1]]], WOLF, 9640, { alpha: .9, core: 1 });
    // Primal Pounce: a lunging spirit wolf projected ahead.
    if (bond.flash > 0) {
      const x = p.x + f * (20 + 50 * (1 - bond.flash)); const y = s.chest[1] + 6; const a = bond.flash;
      plate(ctx, [[x - f * 30, y + 4], [x - f * 6, y - 10], [x + f * 20, y - 8], [x + f * 34, y - 2], [x + f * 18, y + 6], [x - f * 10, y + 10]], WOLF, 9650, { alpha: a, glowEdge: 1.4 });
      plate(ctx, [[x + f * 20, y - 8], [x + f * 26, y - 18], [x + f * 30, y - 6]], WOLF, 9651, { alpha: a, glowEdge: 1.2 });
      for (const lx of [-20, 8]) band(ctx, [[x + f * lx, y + 6], [x + f * (lx + 8), y + 16], [x + f * (lx + 18), y + 18]], () => 2, WOLF, 9652 + lx, { t, alpha: a });
      fallout(ctx, [[x - f * 24, y]], WOLF, t, 9655, { count: 8, alpha: a, driftX: -f * 40 });
    }
  }
}

function turtleOverlay(ctx, p, s, k, layer, bond) {
  const f = s.f; const t = p.animTime ?? 0; const guard = !!p.isGuarding; const fort = bond.fortified > 0 ? 1 : 0;
  const glow = .7 + .5 * fort;
  if (layer === 'back') {
    // Ripple ring of tide water at the feet.
    for (let r = 0; r < 2; r++) { const ph = (t * .8 + r * .5) % 1; for (let i = 0; i < 10; i++) { const a0 = i / 10 * TAU; const a1 = a0 + .4; const R = 18 + ph * 22; plate(ctx, [[s.x + Math.cos(a0) * R, s.y + Math.sin(a0) * R * .3], [s.x + Math.cos(a1) * R, s.y + Math.sin(a1) * R * .3], [s.x + Math.cos(a1) * (R + 3), s.y + Math.sin(a1) * (R + 3) * .3], [s.x + Math.cos(a0) * (R + 3), s.y + Math.sin(a0) * (R + 3) * .3]], SHELL, 9700 + r * 10 + i, { alpha: (1 - ph) * .6, glowEdge: .6 }); } }
    if (guard) return;
    // Dome of hex shell plates on the back.
    const cx = s.back[0] - f * 12; const cy = s.back[1] + 2; const R = 9.5 * k;
    const cells = [[0, 0], [0, -1.7], [0, 1.7], [-1.5, -.85], [-1.5, .85], [1.1, -.85], [1.1, .85]];
    cells.forEach(([u, v], i) => plate(ctx, hex(cx - f * u * R, cy + v * R, R * .95, Math.PI / 6), SHELL, 9720 + i, { alpha: .92, glowEdge: glow, lit: .9, pulse: .5 + .5 * Math.sin(t * 2 + i) }));
  } else {
    // Stone bracers on the forearms.
    for (const [a, b] of [[s.elbowF, s.handF]]) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; plate(ctx, hex(m[0], m[1], 5 * k, 0, .8), SHELL, 9740, { alpha: .9, glowEdge: glow, lit: .9 }); }
    // Guard: the shell plates fold forward into a hex shield.
    if (guard) {
      const cx = p.x + f * 24; const cy = s.chest[1] - 2;
      [[0, 0], [0, -1.7], [0, 1.7], [0, -3.4], [0, 3.4]].forEach(([u, v], i) => plate(ctx, hex(cx + f * Math.abs(v) * -1.2, cy + v * 7 * k, 7 * k, Math.PI / 6, .9), SHELL, 9750 + i, { alpha: .9, glowEdge: glow + .3, lit: 1 }));
    }
    if (fort) fallout(ctx, [[p.x, s.chest[1]]], SHELL, t, 9760, { count: 6, alpha: .9 });
    // Shell Rush: a shell ram plate ahead.
    if (bond.flash > 0) { const x = p.x + f * (24 + 30 * (1 - bond.flash)); plate(ctx, hex(x, s.chest[1], 16 * k, Math.PI / 6, 1.1), SHELL, 9770, { alpha: bond.flash, glowEdge: 1.4, lit: 1 }); }
  }
}

// Wind-up: spirit motes spiral from the Primal into the Wizard.
function windup(ctx, p, s, bond, layer) {
  if (layer !== 'front') return;
  const mat = bond.archetype === 'wolf' ? WOLF : SHELL; const t = p.animTime ?? 0; const k = 1 - Math.max(0, bond.windup) / .5;
  for (let i = 0; i < 10; i++) { const a = t * 8 + i * TAU / 10; const r = 50 * (1 - k) + 6; plate(ctx, [[s.chest[0] + Math.cos(a) * r, s.chest[1] + Math.sin(a) * r * .6 - 3], [s.chest[0] + Math.cos(a) * r + 3, s.chest[1] + Math.sin(a) * r * .6], [s.chest[0] + Math.cos(a) * r, s.chest[1] + Math.sin(a) * r * .6 + 3]], mat, 9790 + i, { alpha: .9, core: 1 }); }
}

export function renderBondOverlay(ctx, player, renderY, layer, bond) {
  const s = sockets(player, renderY);
  if (!bond.active) { windup(ctx, player, s, bond, layer); return; }
  const k = 1 + (bond.stage - 1) * .18;
  ctx.save();
  if (bond.archetype === 'wolf') wolfOverlay(ctx, player, s, k, layer, bond);
  else turtleOverlay(ctx, player, s, k, layer, bond);
  ctx.restore();
}
