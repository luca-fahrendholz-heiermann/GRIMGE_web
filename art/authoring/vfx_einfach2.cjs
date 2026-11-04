// GRIMGE — EINFACH special runes, redrawn round 2 (user, 4 Nov 2026: "optik bitte umsetzen"). vfx_brush.cjs, final
// density, own designs.
//   prism_weaver   6-frame loop, 68×108 (base): S19 Strahlenweber — a tall faceted light crystal hovering over a bronze
//                  tripod; facets catch the light in turn, a white seam pulses inside, motes rise.
//   prism_flare    4 frames, 56×56 (center): the split — a star flare at the crystal when a beam passes through.
//   rift_seam      6-frame loop, 40×32, TILEABLE (along +x): S36 Weltnaht — a jagged crack of black volcanic glass with
//                  an emerald core light, splinters on both lips, sparks drifting up.
//   puppet_cross   6-frame loop, 48×34 (center): S26 Marionettenfaden — a floating marionette control cross of pale wood
//                  and gold, swaying, thread rings at its ends.
//   puppet_knot2   6-frame loop, 28×28 (center): the glowing thread knot binding the pulled object.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = B.pal({
  crystal: ['#1a2350', '#2f4a9a', '#5a86d8', '#9cc6f8', '#d8f0ff', '#ffffff'],
  bronze: ['#2a1606', '#5e3410', '#94561c', '#c88a34', '#eec070'],
  rift: ['#05040a', '#141022', '#2a2440', '#463e66'],
  emerald: ['#0a3a24', '#14774a', '#2fd08a', '#9bffd0', '#ffffff'],
  wood: ['#3a2a1a', '#6e5236', '#a8875e', '#dcc29a', '#fff4dc'],
  gold: ['#4a2e08', '#8a5a12', '#c8902a', '#f0c860', '#fff0b0'],
  silk: ['#3a2a6a', '#7a5ad0', '#c4a8ff', '#ffffff'],
  out: '#0c0a1a', bout: '#1a0c04'
});
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(Math.round(x), Math.round(y), fv - lo) ? 1 : 0))]); };

function prismWeaver() {
  const W = 68; const H = 108; const s = new Sheet('prism_weaver', W, H, 6, { anchor: 'base' }); const cx = 34;
  for (let f = 0; f < 6; f++) {
    const bob = Math.round(Math.sin(f / 6 * TAU) * 2);
    // Tripod: three bronze legs to a ring.
    for (const [x1, y1] of [[cx - 22, H - 2], [cx + 22, H - 2], [cx + 3, H - 6]]) B.stroke(s, f, [[cx, H - 34], [(cx + x1) / 2, (H - 34 + y1) / 2 - 2], [x1, y1]], { max: 4, swell: .7, ramp: C.bronze, seed: x1, dry: 0 });
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; tone(s, f, C.bronze, cx + Math.cos(a) * 11, H - 34 + Math.sin(a) * 3, Math.sin(a) > 0 ? .75 : .45); }
    // The crystal: a tall hexagonal bipyramid, faces lit in turn (the light walks round as it turns).
    const top = 6 + bob; const mid = 44 + bob; const bot = 70 + bob; const hw = 15;
    const faces = [[-1, -.45], [-.45, .45], [.45, 1]];
    faces.forEach(([u0, u1], k) => {
      const lit = ((k + f) % 3) / 2; const v = .35 + lit * .5 + (k === 0 ? .1 : 0);
      s.poly(f, [[cx + u0 * hw, mid], [cx, top], [cx + u1 * hw, mid]], C.crystal[Math.min(5, Math.round(v * 5))]);
      s.poly(f, [[cx + u0 * hw, mid], [cx + u1 * hw, mid], [cx, bot]], C.crystal[Math.max(0, Math.round(v * 5) - 1)]);
    });
    for (const u of [-.45, .45]) { s.line(f, cx + u * hw, mid, cx, top, C.crystal[5]); s.line(f, cx + u * hw, mid, cx, bot, C.crystal[3]); }
    s.line(f, cx - hw, mid, cx + hw, mid, C.crystal[4]);
    // Inner light seam, pulsing.
    const pulse = [0, 1, 2, 3, 2, 1][f];
    for (let y = top + 8; y < bot - 6; y++) { s.set(f, cx, y, C.crystal[5]); if (pulse > 1) { s.set(f, cx - 1, y, C.crystal[4]); s.set(f, cx + 1, y, C.crystal[4]); } }
    // Motes rising off the tip.
    const r = rng(9); for (let m = 0; m < 6; m++) { const u = (f / 6 + r()) % 1; s.set(f, cx + (r() - .5) * 20, top - 2 - u * 10 + 10, C.crystal[r() < .5 ? 5 : 4]); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function prismFlare() {
  const s = new Sheet('prism_flare', 56, 56, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const R = [10, 22, 26, 18][f];
    for (let a = 0; a < 8; a++) { const ang = a / 8 * TAU + .2; const len = R * (a % 2 ? .55 : 1); for (let d = 0; d < len; d++) { const x = 28 + Math.cos(ang) * d; const y = 28 + Math.sin(ang) * d; tone(s, f, C.crystal, x, y, 1 - d / len * .6); if (a % 2 === 0 && d < len * .6) { tone(s, f, C.crystal, x + Math.sin(ang), y - Math.cos(ang), .8 - d / len * .5); } } }
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) s.set(f, 28 + x, 28 + y, C.crystal[x * x + y * y <= 2 ? 5 : 4]);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function riftSeam() {
  const W = 40; const H = 32; const s = new Sheet('rift_seam', W, H, 6, { anchor: 'center' }); const cy = 16;
  const r0 = rng(31); const jag = Array.from({ length: W }, (_, x) => Math.sin(x / W * TAU * 2) * 2 + (r0() - .5) * 2);
  for (let f = 0; f < 6; f++) {
    const glow = [.7, .85, 1, .9, .75, .65][f];
    for (let x = 0; x < W; x++) {
      const c = cy + jag[x]; const half = 3.5 + Math.sin(x / W * TAU) * 1.2;
      // Black glass lips, emerald light in the gap.
      for (let d = -half - 3; d <= half + 3; d++) { const y = c + d; const ad = Math.abs(d); if (ad <= half * .45) tone(s, f, C.emerald, x, y, glow - ad / half * .5); else if (ad <= half) tone(s, f, C.emerald, x, y, glow * .45); else tone(s, f, C.rift, x, y, .25 + (d < 0 ? .45 : 0) + ((x * 7 + Math.round(d) * 3) % 11 === 0 ? .3 : 0)); }
    }
    // Splinters on the lips and sparks drifting up out of the light.
    const r = rng(f + 3); for (let k = 0; k < 4; k++) { const x = Math.floor(r() * W); const y = cy + jag[x] - 7 - r() * 3; s.line(f, x, y, x + (r() < .5 ? -2 : 2), y - 3, C.rift[3]); }
    for (let k = 0; k < 5; k++) { const x = (k * 9 + f * 3) % W; const y = cy - 6 - ((f * 4 + k * 5) % 12); s.set(f, x, y, C.emerald[k % 2 ? 3 : 4]); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function puppetCross() {
  const s = new Sheet('puppet_cross', 48, 34, 6, { anchor: 'center' });
  for (let f = 0; f < 6; f++) {
    const sw = Math.sin(f / 6 * TAU) * 2;
    B.stroke(s, f, [[6, 14 + sw], [24, 14], [42, 14 - sw]], { max: 5, swell: .9, ramp: C.wood, seed: 1, dry: 0 });
    B.stroke(s, f, [[24, 3], [24, 14], [24, 28]], { max: 5, swell: .9, ramp: C.wood, seed: 2, dry: 0 });
    for (const [x, y] of [[6, 14 + sw], [42, 14 - sw], [24, 3], [24, 28]]) { for (let a = 0; a < 12; a++) { const ang = a / 12 * TAU; s.set(f, x + Math.cos(ang) * 2.5, y + Math.sin(ang) * 2.5, C.gold[a < 6 ? 3 : 2]); } s.set(f, x, y, C.silk[3]); }
    for (let y = 12; y <= 16; y++) for (let x = 22; x <= 26; x++) tone(s, f, C.gold, x, y, .5 + (x < 24 ? .3 : 0));
    B.selOutline(s, f, C.out);
  }
  return s;
}
function puppetKnot() {
  const s = new Sheet('puppet_knot2', 28, 28, 6, { anchor: 'center' });
  for (let f = 0; f < 6; f++) {
    for (let l = 0; l < 3; l++) { const ph = l / 3 * TAU + f / 6 * TAU / 3; for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; const x = 14 + Math.cos(a) * 9 * Math.cos(ph) - Math.sin(a) * 4 * Math.sin(ph); const y = 14 + Math.sin(a) * 9 * .5 + Math.cos(a + ph) * 3; tone(s, f, C.silk, x, y, .45 + (Math.sin(a) < 0 ? .45 : 0)); } }
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4) s.set(f, 14 + x, 14 + y, C.silk[x * x + y * y <= 1 ? 3 : 2]);
    B.selOutline(s, f, C.out);
  }
  return s;
}

module.exports = { einfach2Sheets: () => [prismWeaver(), prismFlare(), riftSeam(), puppetCross(), puppetKnot()] };
