// GRIMGE — EINFACH special runes, redrawn round 3. vfx_brush.cjs, final density, own designs.
//   chrono_dial     8-frame loop, 280×100 (base): S73 Zeitstopp — a clock face lying on the ground: a bronze rim with
//                   twelve hour bars, a minute ring, two long hands frozen on it, cogwheels at the rim that tick and stall.
//   chrono_watch    6-frame loop, 56×68 (center): a pocket watch frozen in the air, its hands twitching on the spot.
//   gravity_column  6-frame loop, 40×96 (base): S24 Schwerelosband — a violet anti-gravity column over a ground sigil:
//                   motes streaming up, pebbles floating and bobbing.
//   exile_veil      6-frame loop, 44×76 (base): S32 Exilkorridor — a crimson banishing curtain: rising light streaks,
//                   a tattered top edge, runes glinting in it.
//   harvest_ring    6-frame loop, 236×84 (center): S33 Erntezirkel — a golden rune circle with sickle crescents and vines.
//   harvest_seed2   4 frames, 20×24 (center): a seed pod (0-1 dormant, 2-3 charged and glowing).
//   harvest_lance   6 frames, 34×100 (base): a golden wheat-spear bursting out of the ground (0-2), standing (3), withering (4-5).
//   pledge_seal2    6-frame loop, 208×72 (center): S08 Sekundenpfand — a thick ring of blue stone segments with notches
//                   and runes (the sweeping second hand is drawn in code: the countdown).
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = B.pal({
  bronze: ['#2a1606', '#5e3410', '#94561c', '#c88a34', '#eec070', '#fff4d0'],
  ivory: ['#5a5040', '#9a8c70', '#d6caa8', '#f4ecd4', '#ffffff'],
  steel: ['#22262e', '#4a5262', '#7c889c', '#b8c4d4', '#eef4ff'],
  violet: ['#1e0e3a', '#40207a', '#7040c8', '#a880f0', '#e0d0ff', '#ffffff'],
  stone: ['#2a2430', '#4e4658', '#7a7084', '#aaa0b4'],
  crimson: ['#1a0408', '#4a0a14', '#8a1424', '#d02a38', '#ff7a7a', '#ffe0e0'],
  gold: ['#3a2606', '#7a5410', '#b8862a', '#e8c050', '#fff0a0', '#ffffff'],
  vine: ['#14280c', '#2a5418', '#4a8a2a', '#8ac850'],
  blue: ['#0a1838', '#18366e', '#2e64b0', '#5aa0e8', '#b8e0ff', '#ffffff'],
  out: '#0c0a14', bout: '#1a0c04'
});
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(Math.round(x), Math.round(y), fv - lo) ? 1 : 0))]); };
const ell = (cx, cy, rx, ry, a) => [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];

// ── S73 ZEITSTOPP ─────────────────────────────────────────────────────────
function cog(s, f, cx, cy, r, teeth, rot, ramp) {
  for (let i = 0; i < 160; i++) { const a = i / 160 * TAU; const tooth = ((a + rot) / TAU * teeth % 1) < .5 ? 1.25 : 1; for (let d = r * .55; d <= r * tooth; d += .5) { const [x, y] = ell(cx, cy, d, d * .4, a); tone(s, f, ramp, x, y, .45 + (Math.sin(a) < 0 ? .3 : 0) + (d > r ? .15 : 0)); } }
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; const [x, y] = ell(cx, cy, r * .3, r * .12, a); tone(s, f, ramp, x, y, .9); }
}
function chronoDial() {
  const W = 280; const H = 100; const s = new Sheet('chrono_dial', W, H, 8, { anchor: 'base' }); const cx = 140; const cy = 54; const rx = 128; const ry = 38;
  for (let f = 0; f < 8; f++) {
    // Face: ivory, a slightly darker inner disc, the rim band in bronze with volume.
    for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) { const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (e > 1) continue; if (e > .86) tone(s, f, C.bronze, x, y, .45 + (y < cy ? .35 : 0) + (e > .95 ? -.2 : 0)); else if (e > .8) tone(s, f, C.bronze, x, y, .25); else tone(s, f, C.ivory, x, y, .62 + (y < cy ? .15 : 0) - e * .3); }
    // Hour bars and minute ticks.
    for (let h = 0; h < 12; h++) { const a = h / 12 * TAU - Math.PI / 2; for (let d = .62; d < .78; d += .008) for (const da of (h % 3 === 0 ? [-.025, 0, .025] : [-.01, .01])) { const [x, y] = ell(cx, cy, rx * d, ry * d, a + da); s.set(f, x, y, C.steel[0]); } }
    for (let m = 0; m < 60; m++) { const a = m / 60 * TAU; const [x, y] = ell(cx, cy, rx * .79, ry * .79, a); s.set(f, x, y, C.steel[1]); }
    // The frozen hands (they shiver by a pixel on odd frames).
    const jit = f % 2 ? .01 : 0;
    for (const [len, ang, w] of [[.6, -2.2 + jit, 3], [.42, .6 - jit, 5]]) { for (let d = 0; d < len; d += .004) { const [x, y] = ell(cx, cy, rx * d, ry * d, ang); const ww = w * (1 - d / len * .6); for (let k = -ww; k <= ww; k++) s.set(f, x, y + k * .5, k < 0 ? C.steel[2] : C.steel[0]); } }
    for (let y = -3; y <= 3; y++) for (let x = -5; x <= 5; x++) if ((x / 5) ** 2 + (y / 3) ** 2 <= 1) tone(s, f, C.bronze, cx + x, cy + y, .7 + (y < 0 ? .25 : 0));
    // Cogwheels on the rim: they tick one notch and stall (time keeps trying).
    const tick = [0, 0, .12, .12, .12, .24, .24, .24][f];
    [[-.82, -.6], [.86, -.5], [-.5, .9], [.6, .88]].forEach(([u, v], i) => cog(s, f, cx + u * rx, cy + v * ry, 15 - i % 2 * 3, 10, tick * (i % 2 ? -1 : 1), C.bronze));
    B.selOutline(s, f, C.bout);
  }
  return s;
}
function chronoWatch() {
  const s = new Sheet('chrono_watch', 56, 68, 6, { anchor: 'center' }); const cx = 28; const cy = 38;
  for (let f = 0; f < 6; f++) {
    // Chain loop and crown on top.
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI; const [x, y] = ell(cx, 10, 9, 7, Math.PI + a); tone(s, f, C.gold, x, y, i % 4 < 2 ? .8 : .45); }
    for (let y = 14; y <= 18; y++) for (let x = -3; x <= 3; x++) tone(s, f, C.gold, cx + x, y, .6 + (x < 0 ? .3 : 0));
    // Case and glass.
    B.volume(s, f, cx - 22, cy - 22, cx + 22, cy + 22, (x, y) => Math.hypot(x - cx, y - cy) <= 21, C.gold, { reach: 6 });
    for (let y = cy - 17; y <= cy + 17; y++) for (let x = cx - 17; x <= cx + 17; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= 17) tone(s, f, C.ivory, x, y, .75 - d / 40); }
    for (let h = 0; h < 12; h++) { const a = h / 12 * TAU; for (let d = 13; d <= 16; d++) s.set(f, cx + Math.cos(a) * d, cy + Math.sin(a) * d, C.steel[h % 3 ? 2 : 0]); }
    const tw = [0, .06, 0, -.05, 0, .04][f];
    for (const [len, ang] of [[13, -1.2 + tw], [9, .5 - tw]]) for (let d = 0; d < len; d += .5) { s.set(f, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, C.steel[0]); }
    s.set(f, cx, cy, C.bronze[4]);
    // A glint across the glass.
    for (let k = 0; k < 6; k++) s.set(f, cx - 10 + k, cy - 8 + k * .4 - (f % 3), C.ivory[4]);
    B.selOutline(s, f, C.bout);
  }
  return s;
}

// ── S24 SCHWERELOSBAND ────────────────────────────────────────────────────
function gravityColumn() {
  const W = 40; const H = 96; const s = new Sheet('gravity_column', W, H, 6, { anchor: 'base' }); const cx = 20; const by = H - 6;
  for (let f = 0; f < 6; f++) {
    // Ground sigil (hex) lit from within.
    for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU; const a1 = (i + 1) / 6 * TAU; const [x0, y0] = ell(cx, by, 14, 4.5, a0); const [x1, y1] = ell(cx, by, 14, 4.5, a1); s.line(f, x0, y0, x1, y1, C.violet[3]); }
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; s.set(f, cx + Math.cos(a) * 7, by + Math.sin(a) * 2, C.violet[4]); }
    [[-7, 30], [6, 52], [-3, 70]].forEach(([dx, h], i) => { const y = by - h - Math.sin(f / 6 * TAU + i * 2) * 3; B.volume(s, f, cx + dx - 4, y - 3, cx + dx + 4, y + 3, (x, yy) => ((x - cx - dx) / 3.5) ** 2 + ((yy - y) / 2.6) ** 2 <= 1, C.stone, { reach: 3 }); });
    B.selOutline(s, f, C.out);
    // The column (after the outline: a light without a dark rim): thinning upward, streaks rising.
    for (let y = 8; y < by; y++) { const u = 1 - (by - y) / (by - 8); const w = 9 + Math.sin(y * .15 + f) * 1.5; for (let x = -w; x <= w; x++) { const e = Math.abs(x) / w; if (B.dither(cx + x, y + f * 3, u * .35 * (1 - e))) tone(s, f, C.violet, cx + x, y, .45 + (1 - e) * .3); } }
    for (let k = 0; k < 5; k++) { const x = cx - 8 + k * 4; const y0 = by - ((f * 10 + k * 17) % 80); for (let d = 0; d < 7; d++) tone(s, f, C.violet, x, y0 - d, .85 - d * .07); }
  }
  return s;
}

// ── S32 EXILKORRIDOR ──────────────────────────────────────────────────────
function exileVeil() {
  const W = 44; const H = 76; const s = new Sheet('exile_veil', W, H, 6, { anchor: 'base' }); const by = H - 3;
  for (let f = 0; f < 6; f++) {
    const topY = (x) => 10 + Math.sin(x * .5 + f * .9) * 3 + ((x * 7) % 5);
    // The tattered top edge, the runes and the foot line carry the outline; the curtain itself is light without a rim.
    for (let x = 2; x < W - 2; x++) { const top = Math.floor(topY(x)); tone(s, f, C.crimson, x, top, .8); tone(s, f, C.crimson, x, top + 1, .6); tone(s, f, C.crimson, x, by, .9); }
    for (let k = 0; k < 3; k++) { const x = 8 + k * 13; const y = 26 + ((f + k * 2) % 6) * 6; s.line(f, x, y, x + 3, y - 4, C.crimson[5]); s.line(f, x + 3, y - 4, x + 5, y, C.crimson[5]); s.line(f, x + 1, y - 2, x + 4, y - 2, C.crimson[4]); }
    B.selOutline(s, f, C.out);
    for (let x = 2; x < W - 2; x++) { const top = topY(x) + 2; for (let y = Math.floor(top); y < by; y++) { if (s.alpha(f, x, y) > 0) continue; const u = (y - top) / (by - top); const streak = ((x * 5 + Math.floor((y + f * 8) / 9)) % 11) < 1; if (streak) tone(s, f, C.crimson, x, y, .55 + u * .2); else if (B.dither(x, y, .1 + u * .2)) tone(s, f, C.crimson, x, y, .3 + u * .2); } }
  }
  return s;
}

// ── S33 ERNTEZIRKEL ───────────────────────────────────────────────────────
function harvestRing() {
  const W = 236; const H = 84; const s = new Sheet('harvest_ring', W, H, 6, { anchor: 'center' }); const cx = 118; const cy = 42; const rx = 110; const ry = 34;
  for (let f = 0; f < 6; f++) {
    // Double gold ring with runes between.
    for (let i = 0; i < 700; i++) { const a = i / 700 * TAU; for (const [k, w] of [[1, 3], [.86, 2]]) for (let d = 0; d < w; d++) { const [x, y] = ell(cx, cy, rx * k - d, ry * k - d * .3, a); tone(s, f, C.gold, x, y, .5 + (Math.sin(a) < 0 ? .3 : 0) - d * .12); } }
    for (let k = 0; k < 18; k++) { const a = k / 18 * TAU + f * .04; const [x, y] = ell(cx, cy, rx * .93, ry * .93, a); s.line(f, x - 2, y, x + 2, y - 1, C.gold[(k + f) % 3 ? 3 : 5]); }
    // Three sickle crescents turning slowly, vines winding along the outer ring.
    for (let c = 0; c < 3; c++) { const a0 = c / 3 * TAU + f / 6 * TAU / 3; const pts = []; for (let i = 0; i <= 10; i++) { const a = a0 + i / 10 * .9; pts.push(ell(cx, cy, rx * (.62 + i * .012), ry * (.62 + i * .012), a)); } B.stroke(s, f, pts, { max: 5, swell: .6, ramp: C.gold, seed: 5 + c, dry: .1, headBias: .3 }); }
    for (let i = 0; i < 260; i++) { const a = i / 260 * TAU; const [x, y] = ell(cx, cy, rx + 4 + Math.sin(a * 14 + f) * 2.5, ry + 1.5 + Math.sin(a * 14 + f) * 1, a); tone(s, f, C.vine, x, y, .55 + (i % 9 === 0 ? .4 : 0)); }
    B.selOutline(s, f, C.bout);
  }
  return s;
}
function harvestSeed() {
  const s = new Sheet('harvest_seed2', 20, 24, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const lit = f >= 2; const ramp = lit ? C.gold : C.vine;
    B.volume(s, f, 3, 3, 17, 21, (x, y) => ((x - 10) / 6) ** 2 + ((y - 13) / 8) ** 2 <= 1 && !(y < 8 && Math.abs(x - 10) > 6 - (8 - y)), ramp, { reach: 4 });
    B.stroke(s, f, [[10, 6], [11, 3], [13, 1]], { max: 2, ramp: C.vine, seed: 1, dry: 0 });
    if (lit) { s.set(f, 10, 13, C.gold[5]); s.set(f, 9, 12, C.gold[5]); if (f === 3) for (const [x, y] of [[3, 6], [17, 8], [4, 20], [16, 19]]) s.set(f, x, y, C.gold[4]); }
    B.selOutline(s, f, C.bout);
  }
  return s;
}
function harvestLance() {
  const W = 34; const H = 100; const s = new Sheet('harvest_lance', W, H, 6, { anchor: 'base' }); const cx = 17; const by = H - 2;
  for (let f = 0; f < 6; f++) {
    const rise = [.35, .75, 1, 1, .9, .7][f]; const wither = f >= 4 ? (f - 3) / 2 : 0; const h = 88 * rise;
    // Ground burst.
    for (let k = 0; k < 7; k++) { const a = Math.PI + k / 6 * Math.PI; s.line(f, cx, by, cx + Math.cos(a) * (8 + f * 1.5), by + Math.sin(a) * 4, C.stone[2 + (k % 2)]); }
    // The spear: a golden stalk swelling into a wheat-ear blade at the top.
    const ramp = wither ? [C.vine[0], C.gold[1], C.gold[2], C.gold[3]] : C.gold;
    B.stroke(s, f, [[cx, by], [cx + (wither ? 3 : 0), by - h * .5], [cx + (wither ? 6 : 0), by - h]], { max: 6, swell: .5, ramp, seed: 3 + f, dry: .1, headBias: .75 });
    for (let k = 0; k < 6; k++) { const y = by - h * (.62 + k * .06); for (const sd of [-1, 1]) B.stroke(s, f, [[cx + (wither ? k : 0), y], [cx + sd * 6 + (wither ? k : 0), y - 5]], { max: 3, swell: .9, ramp, seed: k * 2 + sd, dry: 0 }); }
    if (!wither) { s.set(f, cx, by - h - 1, C.gold[5]); s.set(f, cx, by - h - 2, C.gold[5]); }
    B.selOutline(s, f, C.bout);
  }
  return s;
}

// ── S08 SEKUNDENPFAND ─────────────────────────────────────────────────────
function pledgeSeal() {
  const W = 208; const H = 72; const s = new Sheet('pledge_seal2', W, H, 6, { anchor: 'center' }); const cx = 104; const cy = 36; const rx = 96; const ry = 30;
  for (let f = 0; f < 6; f++) {
    // Twelve stone segments with notches between, volume on each; runes glowing in turn.
    for (let seg = 0; seg < 12; seg++) {
      const a0 = seg / 12 * TAU + .04; const a1 = (seg + 1) / 12 * TAU - .04;
      for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; for (let d = 0; d < 8; d++) { const [x, y] = ell(cx, cy, rx - d, ry - d * .3, a); tone(s, f, C.blue, x, y, .25 + (d < 3 ? .35 : 0) + (Math.sin(a) < 0 ? .2 : 0)); } }
      const am = (a0 + a1) / 2; const [x, y] = ell(cx, cy, rx - 4, ry - 1.2, am); const on = (seg + f * 2) % 6 === 0;
      s.line(f, x - 2, y - 1, x + 2, y + 1, C.blue[on ? 5 : 3]); s.line(f, x - 2, y + 1, x + 2, y - 1, C.blue[on ? 5 : 3]);
    }
    // Inner ring of fine ticks.
    for (let m = 0; m < 60; m++) { const a = m / 60 * TAU; const [x, y] = ell(cx, cy, rx * .82, ry * .82, a); s.set(f, x, y, C.blue[m % 5 ? 2 : 4]); }
    B.selOutline(s, f, C.out);
  }
  return s;
}

module.exports = { einfach3Sheets: () => [chronoDial(), chronoWatch(), gravityColumn(), exileVeil(), harvestRing(), harvestSeed(), harvestLance(), pledgeSeal()] };
