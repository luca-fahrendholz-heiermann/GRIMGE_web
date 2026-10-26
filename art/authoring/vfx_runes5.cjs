// GRIMGE — special runes, round 5 (hand-drawn quality; vfx_brush.cjs; final density). Rune palettes; own designs.
//   bastion_floe   4-frame loop, 28×64: S04 Schwebende Bastion — a hovering armour floe: a riveted teal-steel
//                  shield slab with a gold rim and glowing rivets, a cracked frame (frames 2-3) when worn.
//   echo_scroll    4-frame loop, 24×24: S07 Nachhallarchiv — a gold-sealed archive scroll orb (the stored echo).
//   ember_pump     6-frame loop, 48×80 (base): S16 Glutpumpe — a ribbed pump of black glass-stone with glowing
//                  seams, a heat gauge, valves venting steam and embers (frames 3-5 hot).
//   space_fold     4-frame loop, 48×80 (center): S17 Raumfalter — a hanging pane of folded space: gold-rimmed
//                  translucent facets with violet starlight inside (tiled along the fold).
//   chorus_blade   2 frames, 52×20 (faces right): S25 Klingenchor — an ornate splinter blade: bone-white blade with
//                  a red core slit, a crimson guard; frame 1 charged (gold glow along the edge).
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = {
  steel: B.pal({ r: ['#101a1c', '#24363a', '#3f5e62', '#5f8a8c', '#a8c8c6'] }).r, gold: B.pal({ r: ['#5a4010', '#a8822a', '#e7c66a', '#fff1c4'] }).r,
  arch: B.pal({ r: ['#1c1d22', '#3a3b40', '#9a9ca6', '#f4f4f8'] }).r, seal: B.pal({ r: ['#6a4a10', '#d8b45a', '#fff0b8'] }).r,
  pump: B.pal({ r: ['#0e0806', '#2a1410', '#4a2a20', '#7a4a3a'] }).r, heat: B.pal({ r: ['#9a3a26', '#d0884a', '#ffd27a', '#ffffff'] }).r, steam: B.pal({ r: ['#8a8a92', '#c8c8d0', '#f0f0f6'] }).r,
  fold: B.pal({ r: ['#14141e', '#2a2a3a', '#4a46a0', '#8a7aff', '#d8d0ff'] }).r, rim: B.pal({ r: ['#5a5030', '#a89a6a', '#f4e6b8'] }).r,
  bone: B.pal({ r: ['#6a5a48', '#b8a888', '#f6ead2', '#ffffff'] }).r, crimson: B.pal({ r: ['#2a0a10', '#7a1a26', '#c22a3a'] }).r, glow: B.pal({ r: ['#c8902a', '#ffd27a', '#fff3c4'] }).r,
  out: B.pal({ o: '#06060a' }).o
};
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };
const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const fillPoly = (s, f, pts, fn) => { const ys = pts.map((p) => p[1]); const xs = pts.map((p) => p[0]); for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) if (inPoly(pts, x + .5, y + .5)) fn(x, y, !inPoly(pts, x - .5, y + .5), !inPoly(pts, x + 1.5, y + .5)); };

function bastion() {
  const s = new Sheet('bastion_floe', 28, 64, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const pts = [[4, 6], [20, 2], [24, 8], [23, 58], [6, 62], [3, 54]];
    fillPoly(s, f, pts, (x, y, l, r) => tone(s, f, l ? C.gold : r ? C.gold : C.steel, x, y, l ? .9 : r ? .45 : .7 - (x - 4) / 40 - (y - 2) / 200));
    for (let y = 10; y < 58; y += 12) for (let x = 7; x < 21; x++) tone(s, f, C.steel, x, y, .2); // plate seams
    for (let k = 0; k < 4; k++) { const y = 12 + k * 12; const lit = (k + f) % 4 === 0; tone(s, f, C.gold, 8, y, lit ? 1 : .7); tone(s, f, C.gold, 19, y, lit ? 1 : .7); }
    if (f >= 2) for (let k = 0; k < 10; k++) s.set(f, 14 + Math.sin(k) * 3, 20 + k * 3, C.steel[0]); // crack when worn
    B.selOutline(s, f, C.out);
  }
  return s;
}
function scroll() {
  const s = new Sheet('echo_scroll', 24, 24, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    for (let y = 6; y <= 17; y++) for (let x = 4; x <= 19; x++) tone(s, f, C.arch, x, y, .75 - (y - 6) / 30 - (x === 4 || x === 19 ? .2 : 0));
    for (const x of [3, 20]) for (let y = 5; y <= 18; y++) tone(s, f, C.arch, x, y, .4);
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) tone(s, f, C.seal, 12 + x, 12 + y, .8 - (x + y) * .05 + (f % 2) * .1);
    for (let k = 0; k < 3; k++) for (let x = 6; x < 18; x++) if (x < 9 || x > 15) tone(s, f, C.arch, x, 9 + k * 3, .25);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function pump() {
  const s = new Sheet('ember_pump', 48, 80, 6, { anchor: 'base', baseOffset: 2 }); const cx = 22; const gy = 78;
  for (let f = 0; f < 6; f++) {
    const hot = f >= 3;
    // Ribbed body: four stacked drums tapering upward, glowing seams between them.
    for (let i = 0; i < 4; i++) { const y0 = gy - (i + 1) * 15; const hw = 12 - i * 1.5; for (let y = y0; y < y0 + 14; y++) for (let x = Math.round(cx - hw); x <= cx + hw; x++) tone(s, f, C.pump, x, y, .75 - (x - cx + hw) / (hw * 3) - (y - y0) / 50); for (let x = Math.round(cx - hw); x <= cx + hw; x++) tone(s, f, C.heat, x, y0 + 14, hot ? .9 : .4); }
    // Cap and nozzle, valves on the sides.
    for (let y = gy - 68; y < gy - 60; y++) for (let x = cx - 6; x <= cx + 6; x++) tone(s, f, C.pump, x, y, .6);
    for (const [vx, vy] of [[cx - 13, gy - 20], [cx + 13, gy - 38]]) for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) tone(s, f, C.pump, vx + x, vy + y, .9);
    // Heat gauge on the right: three segments.
    for (let k = 0; k < 3; k++) for (let y = 0; y < 6; y++) for (let x = 0; x < 4; x++) tone(s, f, C.heat, cx + 16 + x, gy - 22 - k * 8 + y, k < Math.min(3, f) ? .85 : .1);
    // Steam from the valves, embers when hot.
    for (let q = 0; q < 3; q++) { const life = ((f / 6) + q / 3) % 1; const r = 2 + life * 4; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r && !B.dither(x, y, life * .6)) tone(s, f, C.steam, cx - 16 - life * 8 + x, gy - 22 - life * 10 + y, .5 + (y < 0 ? .3 : 0)); }
    if (hot) for (let q = 0; q < 5; q++) { const rr = rng(50 + q + f); tone(s, f, C.heat, cx + (rr() - .5) * 20, gy - 70 - rr() * 8, .95); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function fold() {
  const s = new Sheet('space_fold', 48, 80, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    // Two facets folded along a vertical crease, translucent dithered starlight inside.
    for (let y = 8; y < 72; y++) for (let x = 2; x < 46; x++) { const facet = x < 24; if (B.dither(x, y, .45)) continue; tone(s, f, C.fold, x, y, (facet ? .55 : .3) + Math.sin((y + f * 6) / 9 + x / 7) * .08); }
    for (let y = 8; y < 72; y++) tone(s, f, C.rim, 24, y, .95); // the crease
    for (let x = 2; x < 46; x++) { tone(s, f, C.rim, x, 8, .8); tone(s, f, C.rim, x, 71, .5); }
    const r = rng(60 + f); for (let q = 0; q < 6; q++) { const x = 4 + Math.round(r() * 40); const y = 12 + Math.round(r() * 56); tone(s, f, C.fold, x, y, 1); tone(s, f, C.fold, x + 1, y, .8); tone(s, f, C.fold, x, y + 1, .8); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function blade() {
  const s = new Sheet('chorus_blade', 52, 20, 2, { anchor: 'center' });
  for (let f = 0; f < 2; f++) {
    const pts = [[12, 10], [18, 6], [44, 8], [50, 10], [44, 12], [18, 14]];
    if (f) fillPoly(s, f, pts.map(([x, y]) => [x + (x - 30) * .08, y + (y - 10) * .5]), (x, y) => tone(s, f, C.glow, x, y, .6));
    fillPoly(s, f, pts, (x, y, l) => tone(s, f, C.bone, x, y, y < 10 ? .8 : .5 + (l ? .2 : 0)));
    for (let x = 20; x < 42; x++) tone(s, f, C.crimson, x, 10, f ? .9 : .6); // core slit
    for (let y = 4; y <= 16; y++) for (let x = 8; x <= 12; x++) tone(s, f, C.crimson, x, y, .55 - Math.abs(y - 10) / 20); // guard
    for (let x = 1; x < 8; x++) for (let y = 9; y <= 11; y++) tone(s, f, C.crimson, x, y, .35); // grip
    B.selOutline(s, f, C.out);
  }
  return s;
}
module.exports = { runes5Sheets: () => [bastion(), scroll(), pump(), fold(), blade()] };
