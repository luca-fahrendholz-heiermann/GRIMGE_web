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
// Schattenlanzer (user's example sprite 21; A13 Totenmaske skin): a black jagged spear, red runes, torn cloth.
function shadowSpear() {
  const s = new Sheet('w_shadow_spear', 138, 40, 4, { anchor: 'center' }); const cy = 20;
  for (let f = 0; f < 4; f++) {
    shaft(s, f, P.black, 4, 100, cy, 1); wrap(s, f, P.red, 28, 40, cy, 1);
    for (let x = 4; x < 100; x += 9) tone(s, f, P.red, x + (f % 3), cy, (x + f * 9) % 27 < 9 ? 1 : .6); // rune glints along the shaft
    // Jagged head: a long black leaf with barbs on both sides and a red edge line.
    for (let x = 0; x <= 34; x++) { const u = x / 34; const w = Math.round(6 * Math.sin(Math.PI * Math.min(1, u * 1.5 + .1)) * (1 - u * .4)) + ((x % 6) < 2 && u < .7 ? 2 : 0); for (let d = -w; d <= w; d++) tone(s, f, Math.abs(d) === w ? P.red : P.black, 100 + x, cy + d, Math.abs(d) === w ? .7 : d < 0 ? .55 : .3); tone(s, f, P.red, 100 + x, cy, .9); }
    // Torn black cloth hanging from the socket.
    for (let j = 0; j < 12; j++) for (let k = 0; k < 4 - (j >> 2); k++) tone(s, f, P.black, 98 - k + Math.round(Math.sin(j * .5 + f * 1.5) * (j / 6)), cy + 3 + j, .45 + (k === 0 ? .2 : 0));
    B.selOutline(s, f, P.out);
  }
  return s;
}
// ── Batch 3 (27 Oct 2026): the remaining 25 weapons. Sizes / grips follow each astral piece (sheet px = ½ world). ──
const Q = {
  green: ramp('#0a2a0a', '#1e6a1a', '#4cc02a', '#a8ff6a', '#eaffd0'), violet: ramp('#160a2a', '#3a1a6a', '#6a3ac0', '#b388ff', '#ece0ff'),
  paper: ramp('#6a5a3a', '#c8b48a', '#efe2c0', '#fffaf0'), pink: ramp('#4a0a2a', '#a81a5a', '#ff4081', '#ffb0d0', '#fff0f6'),
  teal: ramp('#042a2a', '#0a6a62', '#26c6b0', '#9affea', '#ffffff'), orange: ramp('#4a1a00', '#a84a00', '#ff7a1a', '#ffc080'),
  cyan: ramp('#04283a', '#0a6a8a', '#1ac0e0', '#9af0ff', '#ffffff'), white: ramp('#8a8a8e', '#c8c8cc', '#eeeef2', '#ffffff')
};
const disc = (s, f, r, cx, cy, rx, ry, shade) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) tone(s, f, r, cx + x, cy + y, shade(x, y, e)); } };
const lineP = (s, f, r, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) tone(s, f, r, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n + k, typeof v === 'function' ? v(i / n, k) : v); };
const quadP = (s, f, r, a, c, b, v, w = 1) => { for (let i = 0; i <= 80; i++) { const u = i / 80; const x = (1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0]; const y = (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]; for (let k = 0; k < w; k++) tone(s, f, r, x, y + k, typeof v === 'function' ? v(u, k) : v); } };
const facet = (rr) => (x, y, t, b) => (y === t ? [rr, .98] : y === b ? [rr, .45] : [rr, y - t <= (b - t) / 2 ? .78 : .55]);
const sheetOf = (name, w, h, n = 4) => new Sheet(name, w, h, n, { anchor: 'center' });
const done = (s, f) => B.selOutline(s, f, P.out);

function gauntlet() { const s = sheetOf('w_fist', 44, 30); const cy = 15; for (let f = 0; f < 4; f++) {
  for (let x = 0; x <= 12; x++) for (let d = -5; d <= 5; d++) tone(s, f, P.steel, x, cy + d, (d < -2 ? .8 : d < 2 ? .55 : .35) + (x % 4 === 0 ? -.15 : 0)); // forearm plates
  for (let x = 12; x <= 26; x++) for (let d = -7; d <= 7; d++) tone(s, f, (x - 12) % 4 === 3 ? P.black : P.steel, x, cy + d, d < -3 ? .85 : d < 3 ? .6 : .4); // knuckle block
  for (let k = 0; k < 4; k++) for (let j = 0; j < 5; j++) tone(s, f, P.steel, 27 + j, cy - 6 + k * 4, .95 - j * .1); // knuckle spikes
  for (let x = 2; x <= 10; x += 4) for (let d = -5; d <= 5; d++) tone(s, f, Q.orange, x, cy + d, (f + x) % 8 < 4 ? .9 : .6); done(s, f); } return s; }
function iceSword() { const s = sheetOf('w_ice_sword', 96, 26); const cy = 13; for (let f = 0; f < 4; f++) {
  wrap(s, f, P.frostwood, 3, 11, cy, 1); for (let y = -6; y <= 6; y++) tone(s, f, P.ice, 13 + (Math.abs(y) > 3 ? 1 : 0), cy + y, .85);
  blade(s, f, 15, 92, (x) => cy - (x > 86 ? 3 - (x - 86) * .5 : 3), (x) => cy + (x > 86 ? 3 - (x - 86) * .5 : 3), facet(P.ice));
  for (let k = 0; k < 6; k++) { const bx = 22 + k * 11; for (let j = 0; j < 4; j++) tone(s, f, P.ice, bx - j * .6, cy - 4 - j, .95 - j * .1); } // crystal spurs
  tone(s, f, P.ice, 20 + ((f * 17) % 66), cy - 1, 1); done(s, f); } return s; }
function mace() { const s = sheetOf('w_mace', 96, 36); const cy = 18; for (let f = 0; f < 4; f++) {
  shaft(s, f, P.wood, 2, 64, cy, 2); wrap(s, f, P.leather, 6, 20, cy, 2); ring(s, f, P.gold, 62, cy, 3, 4);
  disc(s, f, P.steel, 76, cy, 9, 9, (x, y) => (x + y < -4 ? .85 : .5));
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; for (let r = 8; r < 14; r++) for (let w = 0; w < 2; w++) tone(s, f, P.steel, 76 + Math.cos(a) * r - Math.sin(a) * w, cy + Math.sin(a) * r + Math.cos(a) * w, w ? .45 : .85); }
  gem(s, f, P.gold, 76, cy, 2, (f % 2) * .2); done(s, f); } return s; }
function twinblade() { const s = sheetOf('w_twinblade', 176, 28); const cy = 14; for (let f = 0; f < 4; f++) {
  shaft(s, f, P.black, 40, 136, cy, 1); wrap(s, f, Q.teal, 78, 98, cy, 1); ring(s, f, P.steel, 40, cy, 3, 4); ring(s, f, P.steel, 134, cy, 3, 4);
  for (const side of [1, -1]) { blade(s, f, side > 0 ? 137 : 2, side > 0 ? 174 : 39, (x) => { const u = side > 0 ? (x - 137) / 37 : (39 - x) / 37; return cy - 4 * (1 - u * .85); }, (x) => { const u = side > 0 ? (x - 137) / 37 : (39 - x) / 37; return cy + 4 * (1 - u * .85); }, (x, y, t, b) => (y === t ? [Q.teal, .9] : y === b ? [P.steel, .4] : [P.steel, y <= cy ? .8 : .55])); }
  done(s, f); } return s; }
function odachi() { const s = sheetOf('w_odachi', 164, 28); const cy = 14; for (let f = 0; f < 4; f++) {
  for (let x = 2; x <= 26; x++) for (let d = -1; d <= 1; d++) { const m = ((x + Math.abs(d) * 2) % 4 + 4) % 4; tone(s, f, m < 2 ? P.black : P.red, x, cy + d, .6 - d * .1); }
  for (let y = -6; y <= 6; y++) for (let x = 27; x <= 29; x++) tone(s, f, P.gold, x, cy + y, y < 0 ? .85 : .45);
  const spine = (x) => cy - 1 - ((x - 30) / 130) ** 2 * 7;
  blade(s, f, 30, 160, (x) => spine(x) - 1, (x) => spine(x) + (x > 152 ? Math.max(0, 2 - (x - 152) * .3) : 2), (x, y, t, b) => (y === t ? [P.steel, .3] : y === b ? [P.steel, .55] : y === t + 2 ? [P.steel, .98] : [P.steel, .7]));
  const gx = 34 + ((f * 29) % 120); tone(s, f, P.steel, gx, Math.round(spine(gx)), 1); done(s, f); } return s; }
function knife() { const s = sheetOf('w_knife', 48, 14); const cy = 7; for (let f = 0; f < 4; f++) {
  wrap(s, f, P.black, 1, 7, cy, 1); for (let y = -2; y <= 2; y++) tone(s, f, Q.violet, 8, cy + y, .8);
  blade(s, f, 9, 44, (x) => cy - 2 + (x > 34 ? (x - 34) * .2 : 0), (x) => cy + 1 - (x > 34 ? (x - 34) * .1 : 0), facet(P.steel)); tone(s, f, Q.violet, 12 + ((f * 7) % 28), cy - 1, 1); done(s, f); } return s; }
function crossbow() { const s = sheetOf('w_crossbow', 84, 80); const cy = 40; for (let f = 0; f < 4; f++) {
  shaft(s, f, P.wood, 2, 72, cy, 2); for (let x = 2; x <= 14; x++) for (let d = 3; d <= 7; d++) tone(s, f, P.wood, x, cy + d, .45); // stock
  for (const sg of [-1, 1]) quadP(s, f, P.steel, [58, cy], [64, cy + sg * 16], [56, cy + sg * 34], (u) => .85 - u * .3, 2);
  for (const sg of [-1, 1]) lineP(s, f, P.ivory, 56, cy + sg * 34, 40, cy + sg * 1, .7);
  lineP(s, f, P.steel, 40, cy - 3, 76, cy - 3, (u) => (u > .9 ? 1 : .7)); for (let k = 0; k < 3; k++) tone(s, f, Q.orange, 74 - k, cy - 3 - k, .9); // the bolt
  ring(s, f, P.brass, 56, cy, 3, 3); done(s, f); } return s; }
function chainScythe() { const s = sheetOf('w_chain_scythe', 76, 48); const cy = 36; for (let f = 0; f < 4; f++) {
  shaft(s, f, P.black, 2, 20, cy, 2); wrap(s, f, Q.violet, 4, 16, cy, 2);
  for (let i = 0; i <= 90; i++) { const u = i / 90; const x = 20 + u * 52; const y = cy - 2 - Math.sin(u * Math.PI * .7) * 26 - u * 4; const w = Math.max(1, Math.round(4 * (1 - u))); for (let d = 0; d <= w; d++) tone(s, f, d === w ? Q.violet : P.steel, x + d * .4, y + d, d === w ? .9 : d === 0 ? .95 : .5); }
  for (let k = 0; k < 4; k++) disc(s, f, P.steel, 2, cy + 4 + k * 3, 1, 1, () => .7); /* chain links below the grip */ done(s, f); } return s; }
function spellblade() { const s = sheetOf('w_spellblade', 96, 26); const cy = 13; for (let f = 0; f < 4; f++) {
  wrap(s, f, P.leather, 3, 11, cy, 1); for (let y = -6; y <= 6; y++) for (let x = 12; x <= 14; x++) tone(s, f, P.steel, x, cy + y, y < 0 ? .85 : .45);
  blade(s, f, 15, 90, (x) => cy - (x > 84 ? 3 - (x - 84) * .5 : 3), (x) => cy + (x > 84 ? 3 - (x - 84) * .5 : 3), facet(P.steel));
  for (let x = 20; x <= 80; x += 6) tone(s, f, Q.cyan, x, cy, ((x / 6 + f) % 4) < 1 ? 1 : .7); done(s, f); } return s; }
function focus() { const s = sheetOf('w_focus', 28, 40); for (let f = 0; f < 4; f++) {
  const b = Math.round(Math.sin(f / 4 * TAU)); for (let y = -14; y <= 14; y++) { const w = Math.round(9 * (1 - Math.abs(y) / 14)); for (let x = -w; x <= w; x++) tone(s, f, Q.cyan, 14 + x, 20 + y + b, x < 0 ? (y < 0 ? .95 : .7) : (y < 0 ? .6 : .4)); }
  for (const sg of [-1, 1]) for (let k = 0; k < 5; k++) tone(s, f, P.gold, 14 + sg * (10 - k), 20 + b + (k - 2), .8); done(s, f); } return s; }
function greatsword() { const s = sheetOf('w_greatsword', 156, 44); const cy = 22; for (let f = 0; f < 4; f++) {
  gem(s, f, Q.cyan, 2, cy, 2); wrap(s, f, P.leather, 5, 20, cy, 2);
  for (let y = -16; y <= 16; y++) for (let x = 21; x <= 26; x++) tone(s, f, P.steel, x, cy + y, (y < 0 ? .85 : .45) + (Math.abs(y) > 13 ? .1 : 0));
  blade(s, f, 27, 152, (x) => cy - (x > 142 ? 7 - (x - 142) * .7 : 7), (x) => cy + (x > 142 ? 7 - (x - 142) * .7 : 7), facet(P.steel));
  for (let x = 34; x <= 132; x += 7) { const on = ((x / 7 + f) % 4) < 1; tone(s, f, Q.cyan, x, cy, on ? 1 : .7); tone(s, f, Q.cyan, x + 1, cy, on ? .9 : .5); } done(s, f); } return s; }
function arcaneStaff() { const s = sheetOf('w_arcane_staff', 172, 40); const cy = 20; for (let f = 0; f < 4; f++) {
  shaft(s, f, P.wood, 2, 142, cy, 2); wrap(s, f, Q.violet, 44, 60, cy, 2); ring(s, f, P.gold, 140, cy, 3, 3);
  quadP(s, f, P.gold, [142, cy], [168, cy - 22], [150, cy - 4], (u) => .85 - u * .3, 2); // curled head
  disc(s, f, Q.violet, 156, cy - 6, 6, 6, (x, y) => (x + y < -3 ? 1 : .6 + (f % 2) * .1)); done(s, f); } return s; }
function orb() { const s = sheetOf('w_orb', 36, 40); for (let f = 0; f < 4; f++) {
  disc(s, f, Q.violet, 18, 20, 12, 12, (x, y, e) => { const a = Math.atan2(y, x) + Math.hypot(x, y) * .3 - f * 1.4; return e > .85 ? .45 : (Math.sin(a * 2) > .5 ? .85 : .55) + (x + y < -8 ? .2 : 0); });
  tone(s, f, Q.violet, 13, 15, 1); for (const sg of [-1, 1]) quadP(s, f, P.gold, [2, 20], [6, 20 + sg * 14], [14, 20 + sg * 12], .8); done(s, f); } return s; }
function rod(name, rr) { const s = sheetOf(name, 88, 28); const cy = 14; for (let f = 0; f < 4; f++) {
  shaft(s, f, P.black, 2, 64, cy, 1); wrap(s, f, rr, 6, 18, cy, 1); ring(s, f, P.gold, 62, cy, 3, 3);
  for (let y = -10; y <= 10; y++) { const w = Math.round(6 * (1 - Math.abs(y) / 10)); for (let x = -w; x <= w; x++) tone(s, f, rr, 76 + x, cy + y, x < 0 ? .9 : .55); }
  for (const sg of [-1, 1]) lineP(s, f, P.gold, 66, cy, 74, cy + sg * 9, .8); tone(s, f, rr, 74, cy - 4, f % 2 ? 1 : .8); done(s, f); } return s; }
function grimoire() { const s = sheetOf('w_grimoire', 36, 44); for (let f = 0; f < 4; f++) {
  for (let y = 4; y <= 40; y++) for (let x = 4; x <= 32; x++) tone(s, f, x > 29 ? Q.paper : Q.violet, x, y, x > 29 ? .8 : (x < 8 ? .7 : .45) + (y < 8 ? .15 : 0));
  for (const [cx, cyy] of [[5, 5], [28, 5], [5, 39], [28, 39]]) for (let k = 0; k < 3; k++) { tone(s, f, P.gold, cx + (cx < 10 ? k : -k), cyy, .9); tone(s, f, P.gold, cx, cyy + (cyy < 10 ? k : -k), .9); }
  for (let a = 0; a < TAU; a += .1) tone(s, f, Q.pink, 18 + Math.cos(a) * 7, 22 + Math.sin(a) * 7, (Math.floor(a * 3) + f) % 4 ? .7 : 1); lineP(s, f, Q.pink, 18, 15, 18, 29, .9); done(s, f); } return s; }
function scepter() { const s = sheetOf('w_scepter', 80, 36); const cy = 18; for (let f = 0; f < 4; f++) {
  shaft(s, f, P.gold, 2, 52, cy, 1); ring(s, f, P.gold, 20, cy, 2, 3);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + f * .08; for (let r = 6; r < 15; r++) tone(s, f, P.gold, 64 + Math.cos(a) * r, cy + Math.sin(a) * r, i % 2 ? .6 : .95); }
  disc(s, f, P.ivory, 64, cy, 6, 6, (x, y) => (x + y < 0 ? .95 : .6)); gem(s, f, P.gold, 64, cy, 2, .2); done(s, f); } return s; }
function sacredStaff() { const s = sheetOf('w_sacred_staff', 176, 36); const cy = 18; for (let f = 0; f < 4; f++) {
  shaft(s, f, Q.white, 2, 148, cy, 2); wrap(s, f, P.gold, 46, 58, cy, 2);
  for (let a = 0; a < TAU; a += .02) for (let d = 0; d < 3; d++) tone(s, f, P.gold, 160 + Math.cos(a) * (12 - d), cy + Math.sin(a) * (12 - d), d === 0 ? .95 : .55);
  gem(s, f, Q.cyan, 160, cy, 3, (f % 2) * .2); for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) tone(s, f, P.gold, 152 + k, cy + sg * (13 + k), .8); done(s, f); } return s; }
function harp() { const s = sheetOf('w_harp', 72, 84); for (let f = 0; f < 4; f++) {
  quadP(s, f, P.wood, [16, 78], [4, 40], [26, 8], (u) => .7 + (u > .9 ? .2 : 0), 3); // pillar
  quadP(s, f, P.gold, [26, 8], [50, 2], [64, 22], .85, 2); // neck
  quadP(s, f, P.wood, [64, 22], [58, 52], [24, 76], .55, 4); // soundbox
  for (let k = 0; k < 7; k++) { const x0 = 24 + k * 5.5; const top = 8 + Math.abs(k - 3) * 1.2; const bot = 72 - k * 5; lineP(s, f, Q.pink, x0, top, x0, bot, (u) => ((Math.round(u * 20) + k + f * 3) % 9 === 0 ? 1 : .6)); }
  gem(s, f, Q.pink, 26, 8, 2, .2); done(s, f); } return s; }
function zither() { const s = sheetOf('w_zither', 80, 36); for (let f = 0; f < 4; f++) {
  for (let x = 6; x <= 76; x++) { const h = 10 + (x - 6) * .03; for (let y = -h; y <= h; y++) tone(s, f, P.wood, x, 18 + y, (y < -h + 2 ? .9 : .5) + ((x - 6) % 14 === 0 ? -.2 : 0)); }
  for (let k = 0; k < 7; k++) lineP(s, f, P.ivory, 10, 10 + k * 2.6, 74, 9 + k * 2.8, (u) => ((Math.round(u * 30) + k + f * 4) % 11 === 0 ? 1 : .7));
  for (let k = 0; k < 5; k++) for (let y = 0; y < 3; y++) tone(s, f, Q.orange, 20 + k * 11, 26 + y - k * .4, .85); done(s, f); } return s; }
function spiritGlaive() { const s = sheetOf('w_spirit_glaive', 212, 40); const cy = 20; for (let f = 0; f < 4; f++) {
  for (let x = 2; x <= 148; x++) { tone(s, f, Q.teal, x, cy, (x + f * 6) % 18 < 3 ? 1 : .7); tone(s, f, Q.teal, x, cy + 1, .4); }
  for (let i = 0; i <= 120; i++) { const u = i / 120; const x = 148 + u * 62; const y = cy - Math.sin(u * Math.PI * .8) * 14; const w = Math.max(1, Math.round(5 * (1 - u * .8))); for (let d = -1; d <= w; d++) tone(s, f, Q.teal, x, y + d, d === -1 ? .95 : d === 0 ? 1 : .55); }
  for (let q = 0; q < 4; q++) tone(s, f, Q.teal, 150 + ((q * 17 + f * 9) % 56), cy - 12 + q * 3, 1); done(s, f); } return s; }
function claw() { const s = sheetOf('w_claw', 54, 30); const cy = 15; for (let f = 0; f < 4; f++) {
  for (let x = 2; x <= 18; x++) for (let d = -6; d <= 6; d++) tone(s, f, x % 5 === 0 ? P.steel : P.leather, x, cy + d, d < -2 ? .75 : .45);
  for (let k = 0; k < 3; k++) for (let i = 0; i <= 40; i++) { const u = i / 40; const x = 18 + u * 34; const y = cy - 5 + k * 5 + u * u * 6; tone(s, f, P.steel, x, y, .95 - u * .2); tone(s, f, Q.orange, x, y + 1, u > .7 ? .8 : .3); }
  done(s, f); } return s; }
function beastStaff() { const s = sheetOf('w_beast_staff', 164, 40); const cy = 20; for (let f = 0; f < 4; f++) {
  for (let x = 2; x <= 136; x++) for (let d = -2; d <= 2; d++) tone(s, f, P.wood, x, cy + d + Math.round(Math.sin(x * .15) * .6), d < 0 ? .7 : .4); // gnarled shaft
  wrap(s, f, Q.green, 46, 60, cy, 2);
  for (const sg of [-1, 1]) quadP(s, f, P.ivory, [136, cy], [150, cy + sg * 4], [160, cy + sg * 16], (u) => .9 - u * .2, 2); // antler prongs
  quadP(s, f, P.ivory, [140, cy], [152, cy], [162, cy - 2], .85, 2);
  disc(s, f, Q.green, 138, cy, 3, 3, () => (f % 2 ? 1 : .75)); done(s, f); } return s; }
function chakram() { const s = sheetOf('w_chakram', 40, 40); for (let f = 0; f < 4; f++) {
  const rot = f / 4 * TAU / 8;
  for (let a = 0; a < TAU; a += .02) for (let d = 0; d < 3; d++) tone(s, f, P.gold, 20 + Math.cos(a) * (13 - d), 20 + Math.sin(a) * (13 - d), d === 0 ? .95 : .55);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + rot; for (let r = 14; r < 19; r++) tone(s, f, P.steel, 20 + Math.cos(a) * r, 20 + Math.sin(a) * r, 1 - (r - 14) * .1); }
  lineP(s, f, P.leather, 9, 20, 31, 20, .6, 2); done(s, f); } return s; }
function card() { const s = sheetOf('w_card', 28, 32); for (let f = 0; f < 4; f++) {
  for (let y = 2; y <= 30; y++) for (let x = 2; x <= 24; x++) { const border = x < 4 || x > 22 || y < 4 || y > 28; tone(s, f, border ? Q.pink : Q.white, x, y, border ? .7 : .95 - (x + y) / 200); }
  for (let y = -6; y <= 6; y++) { const w = 4 - Math.round(Math.abs(y) * .6); for (let x = -w; x <= w; x++) tone(s, f, Q.pink, 13 + x, 16 + y, .85); } tone(s, f, Q.pink, 6, 7, 1); tone(s, f, Q.pink, 20, 25, 1); done(s, f); } return s; }
function talisman() { const s = sheetOf('w_talisman', 24, 44); for (let f = 0; f < 4; f++) {
  const sw = Math.round(Math.sin(f / 4 * TAU)); for (let y = 2; y <= 38; y++) for (let x = 4; x <= 20; x++) tone(s, f, Q.paper, x + (y > 30 ? sw : 0), y, .75 - (x - 4) / 60);
  for (let y = 6; y <= 34; y += 4) lineP(s, f, P.red, 8, y, 16, y + (y % 8 ? 1 : -1), .8); lineP(s, f, P.red, 12, 6, 12, 34, .9);
  for (let j = 0; j < 5; j++) tone(s, f, P.red, 12 + sw, 39 + j, .85); done(s, f); } return s; }
function fan() { const s = sheetOf('w_fan', 58, 94); const gx = 4; const gy = 47; const R = 52; for (let f = 0; f < 4; f++) {
  for (let r = 10; r <= R; r++) for (let a = -1; a <= 1; a += .01) { const rib = Math.abs(((a + 1) / 2 * 10) % 1 - .5) > .44; const pat = r > R - 6 ? .9 : ((Math.round(a * 30) + Math.round(r / 6) + f) % 7 === 0 ? .85 : .55); tone(s, f, rib ? P.wood : r > R - 6 ? Q.teal : Q.paper, gx + Math.cos(a) * r, gy + Math.sin(a) * r, rib ? .6 : pat); }
  for (let r = 0; r < 12; r++) for (let k = -1; k <= 1; k++) tone(s, f, P.wood, gx + r, gy + k, .6); gem(s, f, Q.teal, gx + 2, gy, 1, .2); done(s, f); } return s; }
// Own shields (27 Oct 2026): mace — an iron kite shield with a gold boss; warlock — a dark ward shield with a green eye;
// scepter — a white-gold sun shield with rays. 48×54, centred.
function kiteShield(name, body, rim, accent, kind) {
  const s = sheetOf(name, 48, 54); const cx = 24; const cy = 26;
  for (let f = 0; f < 4; f++) {
    for (let y = -24; y <= 26; y++) { const w = y < 6 ? 20 : Math.round(20 * (1 - (y - 6) / 21)); for (let x = -w; x <= w; x++) { const edge = Math.abs(x) >= w - 2 || y <= -22; const light = .55 - (x / 20 + y / 26) * .18; tone(s, f, edge ? rim : body, cx + x, cy + y, edge ? light + .15 : light * .8); } }
    if (kind === 'mace') { disc(s, f, P.gold, cx, cy - 2, 5, 5, (x, y) => (x + y < 0 ? .95 : .5)); for (let y = -18; y <= 20; y++) tone(s, f, P.gold, cx, cy + y, .6); for (let x = -14; x <= 14; x++) tone(s, f, P.gold, cx + x, cy - 8, .6); }
    if (kind === 'ward') { disc(s, f, accent, cx, cy - 2, 7, 4, (x, y, e) => (e > .6 ? .45 : .9)); disc(s, f, P.black, cx + (f % 2), cy - 2, 2, 3, () => .1); for (let k = 0; k < 6; k++) tone(s, f, accent, cx - 12 + k * 5, cy + 14, (k + f) % 3 ? .6 : 1); }
    if (kind === 'sun') { for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + f * .05; for (let r = 5; r < 13; r++) tone(s, f, accent, cx + Math.cos(a) * r, cy - 3 + Math.sin(a) * r, i % 2 ? .6 : .95); } disc(s, f, P.gold, cx, cy - 3, 5, 5, (x, y) => (x + y < 0 ? 1 : .6)); }
    B.selOutline(s, f, P.out);
  }
  return s;
}
const BATCH3 = () => [kiteShield('w_shield_mace', P.steel, P.gold, P.gold, 'mace'), kiteShield('w_shield_ward', Q.violet, P.black, Q.green, 'ward'), kiteShield('w_shield_sun', Q.white, P.gold, P.gold, 'sun'), gauntlet(), iceSword(), mace(), twinblade(), odachi(), knife(), crossbow(), chainScythe(), spellblade(), focus(), greatsword(), arcaneStaff(), orb(), rod('w_rod_warlock', Q.green), rod('w_rod_grimoire', Q.violet), grimoire(), scepter(), sacredStaff(), harp(), zither(), spiritGlaive(), claw(), beastStaff(), chakram(), card(), talisman(), fan()];
module.exports = { weaponSheets: () => [...BATCH3(), shadowSpear(), glaive(), katana(), sheath(), spear(), sword(), shield(), spiritSword(), scythe(), greatAxe(), greatHammer(), sabre(), dagger(), bow(), staff()] };
