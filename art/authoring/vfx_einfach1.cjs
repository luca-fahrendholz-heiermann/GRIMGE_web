// GRIMGE — EINFACH special runes, redrawn round 1 (user, 4 Nov 2026: "die einfach spells sehen immer noch nicht gut
// aus … bitte neu zeichnen"). Hand-drawn quality with vfx_brush.cjs at final density; each effect has a life (birth →
// body → edge → death) and the material behaves like itself. Own designs.
//   stasis_dome     8-frame loop, 232×156 (base): S09 Stillfuge — a dome of faceted time-glass on a gold clock ring:
//                   offset glass panels with lit seams, a sheen on the light side, a teal time ripple climbing the
//                   facets, sand motes hanging almost still inside, an hourglass crown.
//   stasis_rise     6 frames: the ring flares, the facets grow upward row by row (bright growth front).
//   stasis_shatter  6 frames: the panels crack and fall as glass shards, the ring dies out.
//   flood_channel   8-frame loop, 64×40, TILEABLE (flows right 8 px / frame): S15 Flutschiene — a water channel with
//                   depth (dark bottom → bright surface), flowing streaks, two travelling crests with foam lips,
//                   spray drops, a foamy lower edge.
//   flood_spring    6-frame loop, 48×52 (base): the source — water welling up out of a cracked ring and spilling.
//   flood_head      6-frame loop, 44×48 (faces right): the breaking front while the channel rolls out.
//   hunt_bell       8-frame loop, 76×108 (base): S30 Jägerglocke — a bronze bell hanging from an antler gallows on a
//                   dark post, swinging; teal hunting band, clapper, sound arcs at the swing ends.
//   hunt_wave       6 frames, 220×60 (center): the ground ripple of the toll (double ring with sound texture).
//   hunt_mark       4-frame loop, 24×24 (center): the antler sigil over a marked summon.
//   fate_needle2    4-frame loop, 22×76 (center): S12 Schicksalsnadel — a large rose-gold needle, its eye trailing a
//                   glowing blue thread that flows, sparkles along the shaft.
//   fate_thrust     6 frames, 184×44 (faces right): the release — a ghost needle shoots forward, thread trailing,
//                   an impact star at the point.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;

const C = B.pal({
  glass: ['#2a2440', '#4a4d6e', '#7a8aa8', '#b4c8da', '#e2f0f8', '#ffffff'],
  gold: ['#3a2306', '#7a4e10', '#b9832a', '#e8bd58', '#fbe6a0', '#fffbe0'],
  time: ['#0b343a', '#127068', '#25b3a4', '#7beedd', '#d8fff8'],
  water: ['#06223f', '#0c447c', '#1a72c4', '#38a6e6', '#86d6ff', '#d4f4ff', '#ffffff'],
  bronze: ['#2a1606', '#5e3410', '#94561c', '#c88a34', '#eec070', '#fff1c8'],
  wood: ['#1c120c', '#3a2618', '#5c3e26', '#7e5a3a'],
  bone: ['#4a3e30', '#8a7a62', '#c8b896', '#efe4c8', '#ffffff'],
  hunt: ['#0a3a34', '#137a6a', '#2fd0b4', '#a6ffec'],
  rose: ['#3a1220', '#7a2a3a', '#c05a5a', '#e89878', '#ffd2b0', '#ffffff'],
  thread: ['#0a2a6a', '#1a5ad0', '#4aa0ff', '#b4e0ff', '#ffffff'],
  out: '#140f22', wout: '#041a33', bout: '#1a0c04', rout: '#200810'
});
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(Math.round(x), Math.round(y), fv - lo) ? 1 : 0))]); };
const dot = (s, f, x, y, c, r = 1) => { for (let dy = -r + 1; dy < r; dy++) for (let dx = -r + 1; dx < r; dx++) s.set(f, x + dx, y + dy, c); };

// ── S09 STILLFUGE ─────────────────────────────────────────────────────────
const DW = 232; const DH = 166; const DCX = 116; const DBY = 132; const DR = 100; const DRY = .3;
// A point on the dome: theta around the vertical (front = sin > 0), phi elevation 0 … π/2.
const domePt = (th, ph) => [DCX + DR * Math.cos(ph) * Math.cos(th), DBY - DR * .86 * Math.sin(ph) + DR * DRY * Math.cos(ph) * Math.sin(th)];
const ROWS = [0, .3, .62, .95, 1.25, Math.PI / 2];
// Glass panel seams: latitude rings and meridians offset per row (a brick / hex-like pattern of facets).
function domeGlass(s, f, { maxPh = Math.PI / 2, ripple = -1, crack = -1, seed = 1 } = {}) {
  // Dense sampling of the FRONT surface: every facet filled (lit from the top left, its own tone offset), bright seams
  // between facets, diagonal reflection bands, the teal time ripple tinting the facets it passes.
  const r = rng(seed); const offs = Array.from({ length: 80 }, () => (r() - .5) * .16);
  const rowOf = (ph) => { for (let i = 0; i < ROWS.length - 1; i++) if (ph < ROWS[i + 1]) return i; return ROWS.length - 2; };
  for (let ph = 0; ph <= maxPh; ph += .0045) {
    const ri = rowOf(ph); const cells = [12, 11, 9, 7, 4][ri]; const off = ri % 2 ? .5 : 0;
    const rowSeam = Math.min(Math.abs(ph - ROWS[ri]), Math.abs(ROWS[ri + 1] - ph)) * DR < 1.3;
    for (let th = 0; th <= Math.PI; th += .0045) {
      const [x, y] = domePt(th, ph);
      const cu = th / TAU * cells - off; const ci = Math.floor(cu); const cellSeam = Math.abs(cu - Math.round(cu)) / cells * TAU * DR * Math.cos(ph) < 1.1;
      const nx = Math.cos(ph) * Math.cos(th); const ny = -Math.sin(ph);
      const lit = clamp01(.5 - nx * .5 - ny * .3);
      const pid = (ri * 13 + ((ci % cells) + cells) % cells) % 80;
      if ((rowSeam && ri > 0) || cellSeam) {
        if (crack >= 0 && ((pid * 7 + Math.round(ph * 40)) % 5) < crack * 3) continue;
        tone(s, f, C.glass, x, y, .82 + lit * .18); continue;
      }
      const band = ((x - y * .8 + 600) % 34) < 5 ? .22 : ((x - y * .8 + 600) % 34) < 7 ? .1 : 0;
      const rip = ripple >= 0 ? Math.max(0, 1 - Math.abs(ph - ripple) * 6) : 0;
      if (rip > .15) { tone(s, f, C.time, x, y, .35 + rip * .55 + band * .5); continue; }
      tone(s, f, C.glass, x, y, .18 + lit * .42 + band + offs[pid]);
    }
  }
  // The growth front (birth): a bright teal ring at maxPh.
  if (maxPh < Math.PI / 2) for (let i = 0; i <= 260; i++) { const th = i / 260 * Math.PI; const [x, y] = domePt(th, maxPh); tone(s, f, C.time, x, y, .95); tone(s, f, C.time, x, y - 1, .75); }
}
function clockRing(s, f, glow = 1, spin = 0, frontOnly = false) {
  // A gold band: ellipse with volume across its width, twelve notches, teal rune pips turning slowly.
  for (let i = 0; i < 360; i++) {
    const a = i / 360 * TAU; const front = Math.sin(a) > 0; if (frontOnly && !front) continue;
    for (let w = -3; w <= 3; w++) { const x = DCX + Math.cos(a) * (DR + w); const y = DBY + Math.sin(a) * (DR + w) * DRY; tone(s, f, C.gold, x, y, (front ? .55 : .3) + (-w / 3) * .25 + (Math.cos(a) < 0 ? .1 : 0)); }
  }
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; if (frontOnly && Math.sin(a) <= 0) continue; const x = DCX + Math.cos(a) * DR; const y = DBY + Math.sin(a) * DR * DRY; dot(s, f, x, y, k % 3 ? C.gold[1] : C.gold[5], k % 3 ? 1 : 2); }
  if (glow > 0) for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + spin; if (frontOnly && Math.sin(a) <= 0) continue; const x = DCX + Math.cos(a) * (DR - 9); const y = DBY + Math.sin(a) * (DR - 9) * DRY; dot(s, f, x, y, C.time[glow > .6 ? 4 : 3], 2); s.set(f, x + 2, y, C.time[2]); s.set(f, x - 2, y, C.time[2]); }
}
function hourglass(s, f, cx, cy, sand) {
  const g = (y, w) => { for (let x = -w; x <= w; x++) tone(s, f, C.glass, cx + x, cy + y, .55 + (x < 0 ? .3 : 0)); };
  for (let y = -9; y <= 9; y++) g(y, Math.max(1, Math.round(Math.abs(y) * .55)));
  for (let x = -6; x <= 6; x++) { tone(s, f, C.gold, cx + x, cy - 10, .8); tone(s, f, C.gold, cx + x, cy + 10, .5); }
  for (let y = 1; y <= 8; y++) if (y > 8 - sand * 7) for (let x = -Math.round(y * .45); x <= Math.round(y * .45); x++) s.set(f, cx + x, cy + y, C.gold[4]);
  s.set(f, cx, cy, C.gold[5]);
}
function motes(s, f, n, seed, drift) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const th = r() * TAU; const ph = r() * 1.2; const rr = .25 + r() * .6; const x = DCX + Math.cos(th) * DR * rr * Math.cos(ph); const y = DBY - 14 - r() * 80 + Math.sin(f / 8 * TAU + i) * drift; s.set(f, x, y, r() < .5 ? C.gold[4] : C.time[3]); if (r() < .3) s.set(f, x + 1, y, C.gold[2]); }
}
function stasisDome() {
  const s = new Sheet('stasis_dome', DW, DH, 8, { anchor: 'base' });
  for (let f = 0; f < 8; f++) { clockRing(s, f, 1, f / 8 * TAU / 6); domeGlass(s, f, { ripple: (f / 8) * 1.9 - .2, seed: 11 }); clockRing(s, f, 1, f / 8 * TAU / 6, true); hourglass(s, f, DCX, DBY - DR * .86 - 6, .3 + (f % 4) * .05); B.selOutline(s, f, C.out); motes(s, f, 26, 5, 1); }
  return s;
}
function stasisRise() {
  const s = new Sheet('stasis_rise', DW, DH, 6, { anchor: 'base' });
  for (let f = 0; f < 6; f++) { const k = (f + 1) / 6; clockRing(s, f, k, f * .3); if (f > 0) { domeGlass(s, f, { maxPh: Math.PI / 2 * Math.min(1, (f) / 5), seed: 11 }); clockRing(s, f, k, f * .3, true); } if (f === 5) hourglass(s, f, DCX, DBY - DR * .86 - 6, .3); B.selOutline(s, f, C.out); }
  return s;
}
function stasisShatter() {
  const s = new Sheet('stasis_shatter', DW, DH, 6, { anchor: 'base' }); const r0 = rng(77);
  const shards = Array.from({ length: 300 }, () => { const th = r0() * Math.PI; const ph = r0() * 1.45; return { th, ph, sz: 3 + r0() * 4, spin: r0() * TAU, vx: (r0() - .5) * 30, vy: -r0() * 10 }; });
  for (let f = 0; f < 6; f++) {
    const k = f / 5; clockRing(s, f, Math.max(0, .6 - k), 0);
    if (f === 0) domeGlass(s, f, { crack: .6, seed: 11 });
    for (const sh of shards) {
      const [x0, y0] = domePt(sh.th, sh.ph); const x = x0 + sh.vx * k; const y = Math.min(DBY + 8, y0 + sh.vy * k + 120 * k * k * (1 - sh.ph * .3));
      if (k > .2 && B.dither(x, y, k * .6)) continue;
      const a = sh.spin + k * 4; const w = sh.sz * (1 - k * .4);
      s.poly(f, [[x + Math.cos(a) * w, y + Math.sin(a) * w], [x + Math.cos(a + 2.2) * w * .6, y + Math.sin(a + 2.2) * w * .6], [x + Math.cos(a + 4) * w * .8, y + Math.sin(a + 4) * w * .8]], C.glass[(Math.round(sh.spin * 3) % 3) + 2]);
      s.set(f, x, y, C.glass[5]);
    }
    if (f < 3) motes(s, f, 18, 6, 4);
    B.selOutline(s, f, C.out);
  }
  return s;
}

// ── S15 FLUTSCHIENE ───────────────────────────────────────────────────────
const FW = 64; const FH = 40;
function floodChannel() {
  const s = new Sheet('flood_channel', FW, FH, 8, { anchor: 'center' });
  for (let f = 0; f < 8; f++) {
    const sh = f * 8;
    const surf = (x) => { const u = ((x - sh) % FW + FW) % FW / FW; const crest = Math.max(0, Math.cos((u * 2 - .25) * TAU)); return 15 - Math.pow(crest, 3) * 6 + Math.sin(u * TAU * 4) * .8; };
    const bottom = (x) => 31 + Math.sin((((x - sh) % FW) + FW) / FW * TAU * 3) * .9;
    // Body: depth ramp, flowing streak texture (wraps every 64 px).
    for (let x = 0; x < FW; x++) {
      const top = surf(x); const bot = bottom(x);
      for (let y = Math.floor(top); y <= Math.ceil(bot); y++) {
        const d = (y - top) / (bot - top); const r = rng(((x - sh + 640) % FW) * 31 + y * 7);
        let v = .78 - d * .55 + (r() - .5) * .12;
        if (((x - sh + 640 + y * 3) % 19) < 6 && d > .15 && d < .8) v += .14; // a flow streak
        tone(s, f, C.water, x, y, v);
      }
      // Surface lip: bright line, foam where a crest is high.
      const lipY = Math.round(top); const crestK = 15 - top;
      tone(s, f, C.water, x, lipY, .9); tone(s, f, C.water, x, lipY + 1, .8);
      if (crestK > 3) { tone(s, f, C.water, x, lipY - 1, 1); if (crestK > 4.5) s.set(f, x, lipY - 2, C.water[6]); }
      // Foamy lower edge.
      if ((x + f * 3) % 7 < 3) tone(s, f, C.water, x, Math.round(bot) + 1, .7);
    }
    // Spray drops flung up-forward from each crest.
    for (let c = 0; c < 2; c++) for (let d = 0; d < 4; d++) { const cx = ((c * 32 + sh + 10 + d * 3) % FW); const k = ((f + d * 2) % 8) / 8; const x = (cx + k * 8) % FW; const y = 8 - Math.sin(k * Math.PI) * 6 + d; if (k < .9) { s.set(f, x, y, C.water[5]); if (d % 2) s.set(f, x, y + 1, C.water[4]); } }
    B.selOutline(s, f, C.wout);
  }
  return s;
}
function floodSpring() {
  const s = new Sheet('flood_spring', 48, 52, 6, { anchor: 'base' }); const cx = 24; const by = 46;
  for (let f = 0; f < 6; f++) {
    const k = f / 6; const h = 16 + Math.sin(k * TAU) * 5;
    // Cracked stone ring.
    for (let i = 0; i < 80; i++) { const a = i / 80 * TAU; const x = cx + Math.cos(a) * 15; const y = by + Math.sin(a) * 4.5; if (i % 13 === 4) continue; tone(s, f, C.glass, x, y, Math.sin(a) > 0 ? .3 : .5); }
    // The welling dome of water and the spill over the rim.
    const m = (x, y) => { const dx = (x - cx) / 13; const dy = (by - y) / h; return dy >= -.1 && dx * dx + dy * dy <= 1 + Math.sin(x * .8 + f) * .05; };
    B.volume(s, f, cx - 14, by - h - 2, cx + 14, by + 2, m, C.water, { reach: 8 });
    for (let x = cx - 12; x <= cx + 12; x++) { const y = Math.round(by - h * Math.sqrt(Math.max(0, 1 - ((x - cx) / 13) ** 2))); if ((x + f) % 4 === 0) s.set(f, x, y, C.water[6]); }
    // A jet on top, drops falling around.
    for (let y = 0; y < h * .7; y++) { const w = Math.max(1, 3 - y / 6); for (let x = -w; x <= w; x++) tone(s, f, C.water, cx + x + Math.sin(y * .4 + f) * 1, by - h - y, .7 + (x < 0 ? .2 : 0)); }
    const r = rng(f + 3); for (let d = 0; d < 8; d++) { const a = d / 8 * TAU + k; const u = (k + d * .13) % 1; const x = cx + Math.cos(a) * (6 + u * 16); const y = by - h - 10 + u * u * 40 - Math.sin(u * Math.PI) * 10; s.set(f, x, y, C.water[r() < .5 ? 5 : 4]); }
    B.selOutline(s, f, C.wout);
  }
  return s;
}
function floodHead() {
  const s = new Sheet('flood_head', 44, 48, 6, { anchor: 'center' });
  for (let f = 0; f < 6; f++) {
    const k = f / 6; const sw = Math.sin(k * TAU);
    // The breaker: a water body rising from the back to a crest that rolls forward and tips down (a lip with foam).
    const crest = [[2, 44], [10, 38], [17, 26], [24, 15 + sw], [31, 10 + sw], [37, 12], [40, 18 + sw * .5], [37, 24]];
    const P = B.smooth(crest);
    const under = (x, y) => { if (y > 44 || x < 2) return false; let top = 99; for (const [px, py] of P) if (Math.abs(px - x) < .8 && py < top) top = py; return x <= 33 && y >= top + 2; };
    B.volume(s, f, 0, 8, 40, 46, under, C.water.slice(0, 6), { reach: 10 });
    B.stroke(s, f, crest, { max: 8, swell: .55, ramp: C.water.slice(2, 7), seed: 40 + f, dry: .15, headBias: .6 });
    // Foam along the lip and a curl of white at the tip.
    for (let i = Math.floor(P.length * .45); i < P.length; i++) { const [x, y] = P[i]; if ((i + f) % 3) s.set(f, x, y - 2, C.water[6]); }
    // Spray ahead of the lip, falling.
    const r = rng(f * 9 + 1); for (let d = 0; d < 10; d++) { const u = (k + d / 10) % 1; const x = 36 + u * 7 + r() * 1.5; const y = 12 + u * u * 28 - Math.sin(u * Math.PI) * 5 + (d % 3) * 2; s.set(f, x, y, C.water[r() < .5 ? 6 : 4]); }
    B.selOutline(s, f, C.wout);
  }
  return s;
}

// ── S30 JÄGERGLOCKE ───────────────────────────────────────────────────────
function huntBell() {
  const W = 76; const H = 108; const s = new Sheet('hunt_bell', W, H, 8, { anchor: 'base' }); const px = 38; const by = 104;
  for (let f = 0; f < 8; f++) {
    const swing = Math.sin(f / 8 * TAU) * .28;
    // Post and the antler gallows arching over.
    for (let y = 30; y <= by; y++) for (let x = -3; x <= 3; x++) tone(s, f, C.wood, px - 20 + x, y, .35 + (x < 0 ? .4 : 0) + ((y * 7 + x) % 11 === 0 ? .2 : 0));
    B.stroke(s, f, [[px - 20, 34], [px - 14, 18], [px, 12], [px + 14, 14], [px + 22, 22]], { max: 6, swell: .6, ramp: C.bone, seed: 3, dry: .1 });
    for (const [x0, y0, x1, y1] of [[px - 12, 17, px - 18, 6], [px + 4, 12, px + 6, 2], [px + 16, 15, px + 26, 8]]) B.stroke(s, f, [[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 - 1], [x1, y1]], { max: 3, swell: .9, ramp: C.bone, seed: x0, dry: 0 });
    // The bell: a flared bronze shape rotated by the swing around the hang point.
    const hx = px + 4; const hy = 16; const rot = (x, y) => [hx + (x * Math.cos(swing) - y * Math.sin(swing)), hy + (x * Math.sin(swing) + y * Math.cos(swing))];
    const prof = (v) => 7 + Math.pow(v, 1.8) * 13; // half width at depth v (0 top … 1 rim)
    const bellMask = (x, y) => { const dx = x - hx; const dy = y - hy; const lx = dx * Math.cos(-swing) - dy * Math.sin(-swing); const ly = dx * Math.sin(-swing) + dy * Math.cos(-swing); const v = (ly - 6) / 30; if (v < 0 || v > 1) return Math.hypot(lx, ly - 6) < 6.5; return Math.abs(lx) <= prof(v); };
    B.volume(s, f, hx - 30, hy - 2, hx + 30, hy + 44, bellMask, C.bronze, { reach: 9 });
    // Rim band, hunting band (teal) and the clapper swinging opposite.
    for (let lx = -20; lx <= 20; lx++) { const [x, y] = rot(lx, 36); tone(s, f, C.bronze, x, y, .95 - Math.abs(lx) / 40); const [x2, y2] = rot(lx * .78, 26); if (Math.abs(lx) < 17 && (lx + 40) % 4 < 2) s.set(f, x2, y2, C.hunt[lx % 8 === 0 ? 3 : 2]); }
    const cl = rot(-swing * 22, 41); for (let d = 0; d < 6; d++) { const [x, y] = rot(-swing * 22 * d / 6, 30 + d * 2); s.set(f, x, y, C.bronze[1]); } dot(s, f, cl[0], cl[1], C.bronze[2], 2); s.set(f, cl[0] - 1, cl[1] - 1, C.bronze[4]);
    // Sound arcs at the swing ends.
    if (Math.abs(swing) > .2) { const side = Math.sign(swing); for (let w = 0; w < 2; w++) for (let i = -6; i <= 6; i++) { const a = i / 6 * .9; const R = 26 + w * 6; s.set(f, hx + side * Math.cos(a) * R, hy + 30 + Math.sin(a) * R, C.hunt[3 - w]); } }
    B.selOutline(s, f, C.bout);
  }
  return s;
}
function huntWave() {
  const W = 220; const H = 60; const s = new Sheet('hunt_wave', W, H, 6, { anchor: 'center' }); const cx = 110; const cy = 30;
  for (let f = 0; f < 6; f++) {
    const k = (f + 1) / 6; const R = 20 + k * 88;
    for (let ring = 0; ring < 2; ring++) { const rr = R - ring * 9; for (let i = 0; i < 400; i++) { const a = i / 400 * TAU; if ((i + f * 7) % 9 < 2 + ring) continue; const x = cx + Math.cos(a) * rr; const y = cy + Math.sin(a) * rr * .26; for (const w of [-1, 0, 1]) tone(s, f, ring ? C.bronze : C.hunt, x, y + w, (ring ? .7 : .85) - k * .3 + (w < 0 ? .1 : w > 0 ? -.15 : 0)); if (Math.sin(a) > 0 && !ring) tone(s, f, C.hunt, x, y + 1, .6 - k * .3); } }
    B.selOutline(s, f, C.bout);
  }
  return s;
}
function huntMark() {
  const s = new Sheet('hunt_mark', 24, 24, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const p = f % 2;
    B.stroke(s, f, [[12, 20], [12, 9]], { max: 3, ramp: C.hunt, seed: 1, dry: 0 });
    for (const sd of [-1, 1]) { B.stroke(s, f, [[12, 14], [12 + sd * 5, 9], [12 + sd * 7, 3]], { max: 3, ramp: C.hunt, seed: 2 + sd, dry: 0 }); B.stroke(s, f, [[12 + sd * 5, 9], [12 + sd * 9, 8]], { max: 2, ramp: C.hunt, seed: 5 + sd, dry: 0 }); }
    s.set(f, 12, 8, C.hunt[3]); if (p) { s.set(f, 5, 3, C.hunt[3]); s.set(f, 19, 3, C.hunt[3]); }
    B.selOutline(s, f, C.out);
  }
  return s;
}

// ── S12 SCHICKSALSNADEL ───────────────────────────────────────────────────
function fateNeedle2() {
  const s = new Sheet('fate_needle2', 30, 76, 4, { anchor: 'center' }); const cx = 11;
  for (let f = 0; f < 4; f++) {
    // Shaft: rose-gold, volume across, tapering to a point at the bottom; the eye at the top.
    B.stroke(s, f, [[cx, 14], [cx, 40], [cx, 72]], { max: 7, swell: .45, ramp: C.rose, seed: 2, dry: 0, headBias: .2 });
    for (let y = 6; y <= 13; y++) for (let x = -3; x <= 3; x++) { const e = Math.hypot(x / 3, (y - 9.5) / 4); if (e > 1 || e <= .55) continue; s.set(f, cx + x, y, C.rose[x < 0 ? 4 : 2]); }
    // The thread through the eye: a glowing blue wave flowing up and to the side.
    for (let i = 0; i < 70; i++) { const u = i / 70; const x = cx + 4 + u * 10 + Math.sin(u * 10 - f * 1.6) * 3 * u; const y = 9 + u * 58; for (const dx of [0, 1]) tone(s, f, C.thread, x + dx, y, .95 - u * .45 - dx * .2); }
    // Sparkles travelling down the shaft.
    const sy = 18 + ((f * 14) % 48); s.set(f, cx - 1, sy, C.rose[5]); s.set(f, cx, sy - 1, C.rose[5]); s.set(f, cx, sy + 1, C.rose[4]);
    B.selOutline(s, f, C.rout);
  }
  return s;
}
function fateThrust() {
  const W = 184; const H = 44; const s = new Sheet('fate_thrust', W, H, 6, { anchor: 'center' }); const cy = 22;
  for (let f = 0; f < 6; f++) {
    const k = f / 5; const tip = 30 + Math.min(1, k * 2.2) * 140; const fade = Math.max(0, (k - .5) * 2);
    // Ghost needle: a long tapered rose streak with a thread trailing behind.
    if (fade < 1) B.stroke(s, f, [[Math.max(4, tip - 130), cy], [tip - 50, cy], [tip - 6, cy]], { max: 16 * (1 - fade * .6), swell: .6, ramp: C.rose.slice(2, 5), seed: 70 + f, dry: .9, headBias: .7 });
    if (fade < 1) B.stroke(s, f, [[Math.max(4, tip - 110), cy], [tip - 40, cy], [tip, cy]], { max: 9 * (1 - fade * .7), swell: .5, ramp: C.rose, seed: 7 + f, dry: .6, headBias: .75 });
    for (let x = 4; x < tip - 20; x += 1) { const y = cy + Math.sin(x * .12 - f) * 4 * (1 - x / tip); if (B.dither(x, y, fade * .9)) continue; tone(s, f, C.thread, x, y, .5 + x / tip * .4); tone(s, f, C.thread, x, y + 1, .4 + x / tip * .3); }
    // Impact star at the point once it arrives.
    if (k >= .4) { const r = 4 + (k - .4) * 16; for (let a = 0; a < 8; a++) { const ang = a / 8 * TAU; const len = r * (a % 2 ? .55 : 1); for (let d = 0; d < len; d++) { const x = tip + Math.cos(ang) * d; const y = cy + Math.sin(ang) * d * .8; if (B.dither(x, y, fade)) continue; s.set(f, x, y, d < len * .5 ? C.rose[5] : C.thread[3]); } } }
    B.selOutline(s, f, C.rout);
  }
  return s;
}

module.exports = { einfach1Sheets: () => [stasisDome(), stasisRise(), stasisShatter(), floodChannel(), floodSpring(), floodHead(), huntBell(), huntWave(), huntMark(), fateNeedle2(), fateThrust()] };
