// GRIMGE — hand-drawn held weapons replacing the astral look for some weapons (user, 26 Oct 2026, after the example
// sprites: "die Waffen nachbilden … statt Astral-Waffen für manche", then "nicht in der Qualität wie in meinen
// Beispielen" → v2: detailed; "viel zu groß" → v3: about 1.15 × the first size, faceted blades with a ridge, ornate fittings, gems, wraps, bold
// effects; own designs). Every sheet points RIGHT with the GRIP at a fixed pixel (public/src/weapon_sheets.js);
// 4-frame loops animate glints / flames / frost / shards. Sheet px are half world units (saveFinal res 2).
//   w_glaive        128×44  Mondsichel-Hellebarde
//   w_katana         84×20  katana (ito wrap, oval tsuba, curved blade with temper line)
//   w_katana_sheath  76×16  red lacquered scabbard with gold fittings and a cord (worn at the hip)
//   w_spear         138×40  Frostspeer (crystal head with side crystals, ice wraps, frost motes)
//   w_sword          78×32  Runenritter sword (blue flame tongues, glowing fuller runes, gold guard, gem)
//   w_shield         48×54  Runenschild (round, gold rim with studs, radial plates, glowing rune circuit, gem boss)
//   w_scythe        150×84  Blutsense (black steel, red edge, blood-flame tongues, red-wrapped shaft)
//   w_axe / w_hammer / w_sabre / w_dagger / w_bow / w_staff  batch 2 (see below)
//   w_spirit_sword   84×34  Geisterklinge (jagged spirit-glass blade, white core, floating shards, feathered hilt)
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01, rng } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const P = {
  wood: ramp('#160c08', '#2e1a10', '#4a2c1a', '#6e4428', '#93623c'), leather: ramp('#140a06', '#2e1a10', '#553420', '#7e5432'),
  brass: ramp('#3a2408', '#7a5418', '#b8862e', '#e6c062', '#fff2b0'), gold: ramp('#4a2e08', '#8a6416', '#c89a2e', '#f0cc5a', '#fff6c8'),
  steel: ramp('#161a20', '#2c343e', '#4a5664', '#76848f', '#a8b6c2', '#dbe4ec', '#ffffff'), red: ramp('#2a0206', '#6a0c14', '#a8182a', '#e0383a', '#ff8a7a'),
  black: ramp('#08080c', '#18181f', '#2c2c38', '#4a4a5c'), ivory: ramp('#6a6052', '#b0a690', '#e6dcc4', '#fffaf0'),
  ice: ramp('#0a2232', '#1a4a6a', '#2e7aa8', '#5ab4dc', '#a0e2ff', '#dcf6ff', '#ffffff'), frostwood: ramp('#1e242c', '#363f4a', '#566270', '#7e8c9a', '#aebccb'),
  blue: ramp('#081436', '#10308a', '#1e5ae0', '#4a9cff', '#9ad2ff', '#e8f6ff'), spirit: ramp('#041828', '#0a3a62', '#1272b0', '#2ab4ec', '#88e6ff', '#ffffff'),
  purple: ramp('#1a0a2a', '#3a1a5a', '#6a3a9a'), out: B.pal({ o: '#05060a' }).o
};
// Flat facets, no dithering (clean shading like the reference sprites): each value snaps to its nearest ramp step.
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
// A horizontal round shaft (x0…x1 at cy, radius rr): rows shaded like a cylinder, lit from above.
function shaft(s, f, r, x0, x1, cy, rr) { for (let x = x0; x <= x1; x++) for (let d = -rr; d <= rr; d++) { const k = d / (rr + .5); tone(s, f, r, x, cy + d, .62 - k * .38 + (d === -rr + 1 ? .12 : 0)); } }
// Diagonal leather / cord wrap over a shaft section.
function wrap(s, f, r, x0, x1, cy, rr) { for (let x = x0; x <= x1; x++) for (let d = -rr; d <= rr; d++) { const band = ((x + d * 2) % 6 + 6) % 6; tone(s, f, r, x, cy + d, band < 1 ? .1 : band < 3 ? .75 - (d + rr) / (rr * 6) : .45); } }
// A metal ring / collar (w wide, h half-height), bevelled.
function ring(s, f, r, x, cy, w, h) { for (let k = 0; k < w; k++) for (let d = -h; d <= h; d++) tone(s, f, r, x + k, cy + d, (d < 0 ? .85 : .45) + (k === 0 ? .12 : k === w - 1 ? -.15 : 0)); }
// A round gem with a facet highlight.
function gem(s, f, r, x, y, rad, glow = 0) { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const d = Math.hypot(dx, dy); if (d > rad + .3) continue; tone(s, f, r, x + dx, y + dy, .35 + (dx + dy < 0 ? .3 : 0) - d / (rad * 4) + glow); } tone(s, f, r, x - Math.ceil(rad / 2), y - Math.ceil(rad / 2), 1); }
// Column-filled blade: for every x the blade spans [top(x), bot(x)] around a spine; shading per row (facets).
function blade(s, f, x0, x1, top, bot, shade) { for (let x = x0; x <= x1; x++) { const t = Math.round(top(x)); const b = Math.round(bot(x)); for (let y = t; y <= b; y++) { const [r, v] = shade(x, y, t, b); tone(s, f, r, x, y, v); } } }

function glaive() {
  const s = new Sheet('w_glaive', 128, 44, 4, { anchor: 'center' }); const cy = 22;
  for (let f = 0; f < 4; f++) {
    for (let k = 0; k < 4; k++) for (let d = -(1 - (k >> 1)); d <= 1 - (k >> 1); d++) tone(s, f, P.brass, 4 - k, cy + d, d < 0 ? .85 : .45); // butt spike
    shaft(s, f, P.wood, 5, 88, cy, 1); wrap(s, f, P.leather, 15, 29, cy, 1);
    for (const x of [6, 14, 30, 56, 80]) ring(s, f, P.brass, x, cy, 2, 2);
    // Ornate socket: flared brass with a red gem and a back spike.
    for (let x = 86; x <= 94; x++) { const h = 2 + Math.round((x - 86) / 3); for (let d = -h; d <= h; d++) tone(s, f, P.brass, x, cy + d, (d < 0 ? .85 : .42) + (x === 86 ? .1 : 0)); }
    gem(s, f, P.red, 90, cy, 1, .15);
    for (let k = 0; k < 8; k++) tone(s, f, P.steel, 89 - k, cy - 4 - Math.round(k * .7), .8 - k / 24);
    // Half-moon blade: bright edge band, light outer facet, shaded inner facet, engraved dashes.
    const ox = 97; const R = 20; const io = 8; const ir = 17.5;
    for (let y = -R; y <= R; y++) for (let x = -3; x <= R + 3; x++) {
      const dO = Math.hypot(x, y * .98); const dI = Math.hypot(x + io, y); if (dO > R || dI < ir || x < -2) continue;
      const band = R - dO; const v = band < 1.2 ? .98 : band < 2.6 ? .78 : band < 5 ? .6 : .42;
      tone(s, f, P.steel, ox + x, cy + y, v - Math.abs(y) / 120 + (y < 0 ? .04 : 0));
      if (Math.abs(band - 4) < .45 && (Math.round(Math.atan2(y, x) * 18) % 3 === 0)) tone(s, f, P.steel, ox + x, cy + y, .2);
    }
    const ga = -1.25 + f / 3 * 2.5; for (let k = -1; k <= 1; k++) tone(s, f, P.steel, ox + Math.cos(ga + k * .05) * (R - .5), cy + Math.sin(ga + k * .05) * (R - .5), 1);
    for (let y = 0; y < 2; y++) for (let x = -1; x <= 1; x++) tone(s, f, P.red, 89 + x, cy + 6 + y, .7); // tassel knot
    for (let j = 0; j < 9; j++) for (let k = 0; k <= 1; k++) tone(s, f, P.red, 89 + k + Math.round(Math.sin(j * .55 + f * 1.4) * (j / 5)), cy + 8 + j, j < 2 ? .75 : .55 - k * .1);
    B.selOutline(s, f, P.out);
  }
  return s;
}
function katana() {
  const s = new Sheet('w_katana', 84, 20, 4, { anchor: 'center' }); const cy = 10;
  for (let f = 0; f < 4; f++) {
    for (let d = -1; d <= 1; d++) for (let k = 0; k < 2; k++) tone(s, f, P.gold, 1 + k, cy + d, d < 0 ? .85 : .45); // kashira
    for (let x = 3; x <= 18; x++) for (let d = -1; d <= 1; d++) { const m = ((x + Math.abs(d) * 2) % 4 + 4) % 4; tone(s, f, m < 2 ? P.black : P.ivory, x, cy + d, .58 - d * .1); } // ito wrap
    for (let y = -5; y <= 5; y++) for (let x = 0; x < 3; x++) { if ((y / 5.5) ** 2 + ((x - 1) / 2) ** 2 > 1) continue; tone(s, f, P.gold, 19 + x, cy + y, (y < 0 ? .82 : .42) + (x === 0 ? .1 : 0)); } // tsuba
    ring(s, f, P.gold, 22, cy, 2, 1);
    // Blade: mune (dark back), shinogi-ji (light), hamon (white wave), ha (bright edge), clipped tip.
    const spine = (x) => cy - 1 - ((x - 24) / 58) ** 2 * 4;
    blade(s, f, 24, 81, (x) => spine(x) - 1, (x) => spine(x) + (x > 77 ? Math.max(0, 2 - (x - 77) * .5) : 2), (x, y, t, b) => {
      const d = y - t; const hamon = t + 1 + (Math.sin(x * .8) > .5 ? 1 : 0);
      if (d === 0) return [P.steel, .3]; if (y < hamon) return [P.steel, .66]; if (y === hamon) return [P.steel, .98]; return [P.steel, y === b ? .55 : .85];
    });
    const gx = 27 + ((f * 15) % 50); tone(s, f, P.steel, gx, Math.round(spine(gx)), 1); tone(s, f, P.steel, gx + 1, Math.round(spine(gx + 1)), 1);
    B.selOutline(s, f, P.out);
  }
  return s;
}
function sheath() {
  const s = new Sheet('w_katana_sheath', 76, 16, 1, { anchor: 'center' }); const cy = 8;
  const spine = (x) => cy - ((x - 4) / 68) ** 2 * 3;
  blade(s, 0, 4, 72, (x) => spine(x) - 2, (x) => spine(x) + 2, (x, y, t) => [P.red, y - t === 1 ? .95 : y - t < 3 ? .65 : .32]);
  for (const x of [4, 18, 70]) for (let y = -3; y <= 3; y++) for (let k = 0; k < 2; k++) tone(s, 0, P.gold, x + k, Math.round(spine(x)) + y, y < 0 ? .88 : .45);
  for (let j = 0; j < 5; j++) tone(s, 0, P.purple, 20 + Math.round(j * .3), Math.round(spine(20)) + 3 + j, .6); // cord
  B.selOutline(s, 0, P.out); return s;
}
function spear() {
  const s = new Sheet('w_spear', 138, 40, 4, { anchor: 'center' }); const cy = 20;
  for (let f = 0; f < 4; f++) {
    for (let k = 0; k < 5; k++) for (let d = -(2 - (k >> 1)); d <= 2 - (k >> 1); d++) tone(s, f, P.ice, 5 - k, cy + d, d < 0 ? .8 : .5); // crystal butt
    shaft(s, f, P.frostwood, 6, 100, cy, 1);
    for (const [x, w] of [[18, 6], [50, 3], [74, 3], [94, 6]]) for (let k = 0; k < w; k++) for (let d = -2; d <= 2; d++) tone(s, f, P.ice, x + k, cy + d, (d < 0 ? .78 : .48) + ((k + f) % 4 === 0 && d === 0 ? .3 : 0));
    wrap(s, f, P.leather, 27, 41, cy, 1);
    // Crystal head: faceted leaf (light upper facet, white ridge, darker lower facet), side crystals at its base.
    const hx = 99; const L = 37;
    for (let x = 0; x <= L; x++) { const u = x / L; const w = Math.round(7 * Math.sin(Math.PI * Math.min(1, u * 1.6 + .08)) * (1 - u * .5)); for (let d = -w; d <= w; d++) tone(s, f, P.ice, hx + x, cy + d, d < 0 ? .78 - u * .1 : d === 0 ? 1 : .46); }
    for (const [bx, by, a, Ls] of [[102, -5, -2.4, 11], [103, 5, 2.4, 11], [108, -6, -2.0, 8], [109, 6, 2.0, 8]]) for (let k = 0; k < Ls; k++) { const w = Math.max(0, Math.round(2 * (1 - k / Ls))); for (let e = -w; e <= w; e++) tone(s, f, P.ice, bx + Math.cos(a) * k - Math.sin(a) * e * .5, cy + by + Math.sin(a) * k + Math.cos(a) * e * .5, e < 0 ? .85 : .5); }
    for (let q = 0; q < 5; q++) { const rr = rng(90 + q); const life = (f / 4 + rr()) % 1; tone(s, f, P.ice, 100 + rr() * 30 - life * 8, cy - 10 - life * 6 + rr() * 20, 1); }
    const sx = 104 + f * 6; for (let k = -1; k <= 1; k++) { tone(s, f, P.ice, sx + k, cy - 1, 1); tone(s, f, P.ice, sx, cy - 1 + k, 1); }
    B.selOutline(s, f, P.out);
  }
  return s;
}
function sword() {
  const s = new Sheet('w_sword', 78, 32, 4, { anchor: 'center' }); const cy = 18;
  for (let f = 0; f < 4; f++) {
    gem(s, f, P.blue, 2, cy, 2, .1); wrap(s, f, P.leather, 5, 13, cy, 1);
    for (let y = -6; y <= 6; y++) for (let x = 0; x < 3; x++) tone(s, f, P.gold, 14 + x, cy + y, (y < 0 ? .85 : .45) + (x === 0 ? .1 : 0)); // guard
    for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) tone(s, f, P.gold, 17 + k, cy + sg * (6 - Math.round(Math.sin(k / 2 * Math.PI) * 2)), .8);
    // Blue flame tongues rising from the blade's back edge (deep rim, blue body, light core).
    const r = rng(300 + f * 17);
    for (let k = 0; k < 9; k++) { const bx = 21 + k * 5 + Math.round(r() * 2); const H = 5 + Math.round(r() * 6) - (k > 7 ? 3 : 0); for (let j = 0; j < H; j++) { const w = Math.max(0, Math.round(2 * Math.sin(Math.PI * (1 - j / H) * .9))); for (let e = -w; e <= w; e++) tone(s, f, P.blue, bx + e - Math.round(j * .5), cy - 4 - j, Math.abs(e) === w ? .25 : j < H * .4 && Math.abs(e) < w ? .9 : .6); } }
    // Blade: light upper facet, dark ridge, shaded lower facet, bright edges, glowing fuller runes.
    blade(s, f, 18, 74, (x) => cy - (x > 69 ? 3 - (x - 69) * .5 : 3), (x) => cy + (x > 69 ? 3 - (x - 69) * .5 : 3), (x, y, t, b) => {
      if (y === t || y === b) return [P.steel, .98]; if (y < cy) return [P.steel, .78]; if (y === cy) return [P.steel, .4]; return [P.steel, .55];
    });
    for (let x = 21; x <= 64; x += 5) tone(s, f, P.blue, x, cy, ((x / 5 + f) % 4) < 1 ? 1 : .8);
    B.selOutline(s, f, P.out);
  }
  return s;
}
function shield() {
  const s = new Sheet('w_shield', 48, 54, 4, { anchor: 'center' }); const cx = 24; const cy = 27; const RX = 21; const RY = 25;
  for (let f = 0; f < 4; f++) {
    for (let y = -RY; y <= RY; y++) for (let x = -RX; x <= RX; x++) {
      const e = (x / RX) ** 2 + (y / RY) ** 2; if (e > 1) continue;
      const light = .55 - (x / RX + y / RY) * .18;
      if (e > .8) { tone(s, f, P.gold, cx + x, cy + y, light + (e > .95 ? -.2 : e < .85 ? .15 : 0)); continue; }
      const a = Math.atan2(y, x); const seam = Math.abs(((a / TAU * 8) % 1 + 1) % 1 - .5) > .46;
      tone(s, f, P.steel, cx + x, cy + y, seam ? .12 : light * .75);
    }
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; tone(s, f, P.gold, cx + Math.cos(a) * RX * .9, cy + Math.sin(a) * RY * .9, 1); } // rim studs
    for (let a = 0; a < TAU; a += .025) { const on = Math.floor(a / TAU * 20 + f * 5) % 20 < 3; tone(s, f, P.blue, cx + Math.cos(a) * 12, cy + Math.sin(a) * 14, on ? 1 : .72); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + .26; for (let r = 4; r <= 11; r++) tone(s, f, P.blue, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.18, .7); tone(s, f, P.blue, Math.round(cx + Math.cos(a) * 15), Math.round(cy + Math.sin(a) * 18), (k + f) % 3 === 0 ? 1 : .8); }
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 10) tone(s, f, P.gold, cx + x, cy + y, x + y < 0 ? .9 : .45);
    gem(s, f, P.blue, cx, cy, 1, .25);
    B.selOutline(s, f, P.out);
  }
  return s;
}
function spiritSword() {
  const s = new Sheet('w_spirit_sword', 84, 34, 4, { anchor: 'center' }); const cy = 18;
  for (let f = 0; f < 4; f++) {
    for (let k = 0; k < 2; k++) for (let j = 0; j < 6; j++) tone(s, f, P.red, 2 - j * .3, cy + 2 + k * 2 + j * .6, .7 - j / 14); // feathers
    wrap(s, f, P.black, 3, 11, cy, 1);
    for (const sg of [-1, 1]) for (let k = 0; k < 7; k++) for (let e = 0; e < 2 - (k >> 2); e++) tone(s, f, P.black, 12 + k * .6, cy + sg * (2 + k) + sg * e, .55 + (sg < 0 ? .15 : 0)); // winged guard
    // Jagged spirit-glass blade: saw teeth on top, small ones below, gradient to a white core.
    const half = (x) => 6 * (1 - (x - 14) / 68 * .85);
    blade(s, f, 14, 82, (x) => cy - half(x) - (((x - 14) % 7) < 3 ? 2 : 0), (x) => cy + half(x) * .7 + (((x - 14) % 6) < 2 ? 1 : 0), (x, y, t, b) => {
      const span = Math.max(1, b - t); const d = Math.abs(y - cy) / span; return [P.spirit, y === cy ? 1 : d < .14 ? .88 : d < .32 ? .7 : y === t || y === b ? .3 : .52];
    });
    for (let q = 0; q < 4; q++) { const rr = rng(400 + q); const life = (f / 4 + rr()) % 1; const x = 28 + rr() * 46; const y = cy - 10 - life * 6; for (let k = 0; k < 2; k++) tone(s, f, P.spirit, x + k * .5, y + k, .9 - k * .15); }
    B.selOutline(s, f, P.out);
  }
  return s;
}
// Blutsense: black-steel scythe with a red edge and crimson blood-flame tongues on its back, red-wrapped shaft.
function scythe() {
  const s = new Sheet('w_scythe', 150, 84, 4, { anchor: 'center' }); const cy = 70;
  for (let f = 0; f < 4; f++) {
    shaft(s, f, P.black, 4, 126, cy, 1); wrap(s, f, P.red, 16, 32, cy, 1);
    for (const x of [6, 34, 70, 104]) ring(s, f, P.steel, x, cy, 2, 2);
    for (let x = 120; x <= 130; x++) for (let d = -4; d <= 4; d++) tone(s, f, P.steel, x, cy + d, (d < 0 ? .55 : .25) + (x === 120 ? .1 : 0));
    gem(s, f, P.red, 125, cy, 1, .2);
    // The blade along a curve from the socket up and back; the inner (concave) side is the edge.
    const C = (u) => [(1 - u) ** 2 * 126 + 2 * (1 - u) * u * 122 + u * u * 44, (1 - u) ** 2 * (cy - 4) + 2 * (1 - u) * u * 6 + u * u * 12];
    const flames = [];
    for (let i = 0; i <= 220; i++) {
      const u = i / 220; const [x, y] = C(u); const [x2, y2] = C(Math.min(1, u + .004)); const L = Math.hypot(x2 - x, y2 - y) || 1; const nx = (y2 - y) / L; const ny = -(x2 - x) / L; // normal toward the concave side
      const w = 9 * (1 - u) ** .8 + .6;
      for (let d = -w * .45; d <= w; d += .5) { const e = d / w; tone(s, f, e > .78 ? P.red : P.black, x + nx * d, y + ny * d, e > .9 ? .95 : e > .78 ? .7 : e < -.3 ? .15 : Math.abs(e + .12) < .08 ? .95 : .5); }
      if (i % 11 === 5 && u < .88) flames.push([x - nx * w * .45, y - ny * w * .45, -nx, -ny, u]);
    }
    // Blood-flame tongues licking off the blade's back (re-shaped each frame).
    const r = rng(500 + f * 13);
    for (const [fx, fy, dx, dy] of flames) { const H = 5 + Math.round(r() * 6); for (let j = 0; j < H; j++) { const ww = Math.max(0, Math.round(2 * Math.sin(Math.PI * (1 - j / H) * .9))); for (let e = -ww; e <= ww; e++) tone(s, f, P.red, fx + dx * j - dy * e - j * .3, fy + dy * j + dx * e - j * .5, Math.abs(e) === ww ? .35 : j > H * .7 ? .55 : j < H * .35 ? .95 : .75); } }
    for (let q = 0; q < 3; q++) { const rr = rng(520 + q); const life = (f / 4 + rr()) % 1; const [x, y] = C(.2 + rr() * .5); tone(s, f, P.red, x + 3, y + 6 + life * 10, .8); } // drips
    B.selOutline(s, f, P.out);
  }
  return s;
}
// ── Batch 2 (27 Oct 2026): great axe, great hammer, dual sabres, shadow daggers, recurve bow, rune staff ──
// Great axe: a bearded dark-iron head with a gold rim and a bright edge, a back spike, a leather-wrapped haft.
function greatAxe() {
  const s = new Sheet('w_axe', 112, 56, 4, { anchor: 'center' }); const cy = 28;
  for (let f = 0; f < 4; f++) {
    shaft(s, f, P.wood, 2, 84, cy, 2); wrap(s, f, P.leather, 8, 26, cy, 2);
    for (const x of [4, 28, 56, 82]) ring(s, f, P.steel, x, cy, 2, 3);
    // Head: a crescent bit (bearded downward) between x 76 and 108, iron body, gold rim band, bright edge.
    for (let y = -22; y <= 24; y++) for (let x = 0; x <= 32; x++) {
      const outer = Math.hypot((x - 2) / 31, y / 23) <= 1; const inner = Math.hypot((x + 14) / 30, (y - 2) / 15) <= 1; const neck = x < 10 && Math.abs(y) <= 6;
      if (!(outer && !inner) && !neck) continue;
      const edge = Math.hypot((x - 2) / 31, y / 23) > .9; const rim = !edge && Math.hypot((x - 2) / 31, y / 23) > .8;
      tone(s, f, edge ? P.steel : rim ? P.gold : P.black, 78 + x, cy + y, edge ? (y < 0 ? .98 : .82) : rim ? (y < 0 ? .85 : .5) : (y < 0 ? .75 : .45) - x / 120);
    }
    for (let k = 0; k < 10; k++) for (let e = 0; e < 3 - (k >> 2); e++) tone(s, f, P.black, 76 - k, cy - 3 - k * .4 - e, .6); // back spike
    const gy = -18 + ((f * 9) % 38); tone(s, f, P.steel, 78 + 2 + Math.sqrt(Math.max(0, 1 - (gy / 23) ** 2)) * 30, cy + gy, 1);
    B.selOutline(s, f, P.out);
  }
  return s;
}
// Great hammer: a squared head with a rune face, steel bands, a spiked top, a banded haft.
function greatHammer() {
  const s = new Sheet('w_hammer', 104, 52, 4, { anchor: 'center' }); const cy = 26;
  for (let f = 0; f < 4; f++) {
    shaft(s, f, P.wood, 2, 74, cy, 2); wrap(s, f, P.leather, 8, 24, cy, 2);
    for (const x of [4, 26, 50, 70]) ring(s, f, P.steel, x, cy, 2, 3);
    for (let y = -20; y <= 20; y++) for (let x = 72; x <= 100; x++) { const band = x === 76 || x === 96 || Math.abs(y) === 20; tone(s, f, band ? P.steel : P.black, x, cy + y, band ? (y < 0 ? .8 : .5) : (y < 0 ? .72 : .45) + (x > 98 ? -.1 : 0) + (x === 73 ? .1 : 0)); }
    // Rune face (glowing amber glyph) and a short top spike.
    for (let k = -6; k <= 6; k++) { tone(s, f, P.brass, 86, cy + k, (k + f * 3) % 6 === 0 ? 1 : .75); tone(s, f, P.brass, 86 + Math.round(k * .5), cy - Math.abs(k), .7); }
    for (let k = 0; k < 6; k++) for (let e = -(2 - (k >> 1)); e <= 2 - (k >> 1); e++) tone(s, f, P.steel, 101 + k, cy + e, .8 - k / 12);
    B.selOutline(s, f, P.out);
  }
  return s;
}
// Dual sabre: a curved single-edged blade with a gold knuckle-guard, a blue-steel edge line.
function sabre() {
  const s = new Sheet('w_sabre', 72, 22, 4, { anchor: 'center' }); const cy = 11;
  for (let f = 0; f < 4; f++) {
    wrap(s, f, P.leather, 2, 10, cy, 1); gem(s, f, P.gold, 1, cy, 1);
    for (let k = 0; k < 7; k++) tone(s, f, P.gold, 11 + Math.round(Math.sin(k / 6 * Math.PI) * 3), cy + 1 + k * .6, .8); // knuckle guard
    for (let y = -3; y <= 3; y++) tone(s, f, P.gold, 12, cy + y, y < 0 ? .9 : .5);
    const spine = (x) => cy - 1 - ((x - 13) / 56) ** 2 * 5;
    blade(s, f, 13, 70, (x) => spine(x) - 1, (x) => spine(x) + (x > 64 ? Math.max(0, 2 - (x - 64) * .4) : 2), (x, y, t, b) => (y === t ? [P.steel, .35] : y === b ? [P.blue, .7] : [P.steel, y - t === 1 ? .88 : .62]));
    const gx = 16 + ((f * 13) % 50); tone(s, f, P.steel, gx, Math.round(spine(gx)), 1);
    B.selOutline(s, f, P.out);
  }
  return s;
}
// Shadow dagger: a wavy (kris) blade in dark steel with a violet glint, a black wrapped grip.
function dagger() {
  const s = new Sheet('w_dagger', 48, 18, 4, { anchor: 'center' }); const cy = 9;
  for (let f = 0; f < 4; f++) {
    wrap(s, f, P.black, 1, 8, cy, 1); for (let y = -3; y <= 3; y++) tone(s, f, P.purple, 9, cy + y, y < 0 ? .9 : .5);
    blade(s, f, 10, 46, (x) => cy - 2 + Math.round(Math.sin(x * .45) * 1) + (x > 40 ? (x - 40) * .3 : 0), (x) => cy + 2 + Math.round(Math.sin(x * .45) * 1) - (x > 40 ? (x - 40) * .3 : 0), (x, y, t, b) => (y === t ? [P.steel, .85] : y === b ? [P.steel, .3] : [P.steel, .5]));
    tone(s, f, P.purple, 14 + ((f * 9) % 28), cy, 1); tone(s, f, P.purple, 15 + ((f * 9) % 28), cy, .8);
    B.selOutline(s, f, P.out);
  }
  return s;
}
// Recurve bow: limbs curving away from the grip (bulging forward), horn tips, a taut string, a wrapped grip.
function bow() {
  const s = new Sheet('w_bow', 40, 100, 4, { anchor: 'center' }); const gx = 8; const cy = 50;
  for (let f = 0; f < 4; f++) {
    for (let y = -46; y <= 46; y++) {
      const u = Math.abs(y) / 46; const x = gx + 2 + Math.cos(u * Math.PI / 2) * 18 + (u > .84 ? (u - .84) * 26 : 0); const w = u < .12 ? 3 : u > .9 ? 1 : 2; // belly forward at the grip, recurved tips
      for (let d = 0; d < w; d++) tone(s, f, u < .12 ? P.leather : P.wood, x + d, cy + y, u < .12 ? .6 : d === 0 ? .8 : .45);
    }
    for (const sg of [-1, 1]) { for (let k = 0; k < 4; k++) tone(s, f, P.ivory, gx + 6 + k * .6, cy + sg * (45 + k * .4), .9); }
    for (let y = -45; y <= 45; y++) tone(s, f, P.ivory, gx, cy + y, (y + f * 8) % 30 === 0 ? 1 : .55); // string
    for (const sg of [-1, 1]) ring(s, f, P.gold, gx + 17, cy + sg * 6, 4, 0);
    B.selOutline(s, f, P.out);
  }
  return s;
}
// Rune staff: hardwood with steel caps, two rune bands that glow in turn, a cloth wrap in the middle.
function staff() {
  const s = new Sheet('w_staff', 152, 18, 4, { anchor: 'center' }); const cy = 9;
  for (let f = 0; f < 4; f++) {
    shaft(s, f, P.wood, 6, 146, cy, 2); wrap(s, f, P.red, 62, 82, cy, 2);
    for (const [x0, x1] of [[0, 7], [145, 151]]) for (let x = x0; x <= x1; x++) for (let d = -3; d <= 3; d++) tone(s, f, P.steel, x, cy + d, (d < 0 ? .85 : .45) + (x === x0 ? .1 : 0));
    for (const [x0, k] of [[24, 0], [112, 1]]) for (let x = x0; x < x0 + 14; x++) for (let d = -2; d <= 2; d++) { const glyph = (x - x0) % 4 === 1 && Math.abs(d) < 2; tone(s, f, glyph ? P.blue : P.brass, x, cy + d, glyph ? ((f + k * 2) % 4 < 2 ? 1 : .6) : d < 0 ? .8 : .45); }
    B.selOutline(s, f, P.out);
  }
  return s;
}
module.exports = { weaponSheets: () => [glaive(), katana(), sheath(), spear(), sword(), shield(), spiritSword(), scythe(), greatAxe(), greatHammer(), sabre(), dagger(), bow(), staff()] };
