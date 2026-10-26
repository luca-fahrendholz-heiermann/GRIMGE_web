// GRIMGE — hand-drawn held weapons replacing the astral look for some weapons (user, 26 Oct 2026, after the example
// sprites: "die Waffen nachbilden … statt Astral-Waffen für manche", then "nicht in der Qualität wie in meinen
// Beispielen" → v2: larger relative to the hero, faceted blades with a ridge, ornate fittings, gems, wraps, bold
// effects; own designs). Every sheet points RIGHT with the GRIP at a fixed pixel (public/src/weapon_sheets.js);
// 4-frame loops animate glints / flames / frost / shards. Sheet px are half world units (saveFinal res 2).
//   w_glaive        184×68  Mondsichel-Hellebarde
//   w_katana        124×30  katana (ito wrap, oval tsuba, curved blade with temper line)
//   w_katana_sheath 112×22  red lacquered scabbard with gold fittings and a cord knot (worn at the hip)
//   w_spear         210×60  Frostspeer (crystal head with side crystals, ice wraps, frost motes)
//   w_sword         112×44  Runenritter sword (blue flame tongues, glowing fuller runes, ornate gold guard, gem)
//   w_shield         66×76  Runenschild (round, gold rim with studs, radial plates, glowing rune circuit, gem boss)
//   w_spirit_sword  124×50  Geisterklinge (jagged spirit-glass blade, white core, floating shards, feathered hilt)
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
  const s = new Sheet('w_glaive', 184, 68, 4, { anchor: 'center' }); const cy = 34;
  for (let f = 0; f < 4; f++) {
    // Butt spike, shaft, leather grip, brass rings.
    for (let k = 0; k < 6; k++) for (let d = -(2 - (k >> 1)); d <= 2 - (k >> 1); d++) tone(s, f, P.brass, 5 - k, cy + d, d < 0 ? .85 : .45);
    shaft(s, f, P.wood, 6, 126, cy, 2); wrap(s, f, P.leather, 22, 42, cy, 2);
    for (const x of [8, 20, 44, 78, 112]) ring(s, f, P.brass, x, cy, x === 20 || x === 44 ? 2 : 3, 3);
    // Ornate socket: flared brass with a red gem and a back spike.
    for (let x = 124; x <= 136; x++) { const h = 3 + Math.round((x - 124) / 3); for (let d = -h; d <= h; d++) tone(s, f, P.brass, x, cy + d, (d < 0 ? .85 : .42) + (x === 124 ? .1 : 0)); }
    gem(s, f, P.red, 130, cy, 2, .1);
    for (let k = 0; k < 12; k++) for (let e = 0; e < 2 - (k > 7 ? 1 : 0); e++) tone(s, f, P.steel, 128 - k, cy - 6 - Math.round(k * .7) - e, .8 - k / 30);
    // Half-moon blade: outer arc (edge), inner arc offset back; facets: bright edge band, light outer facet, ridge, shade.
    const ox = 140; const R = 31; const io = 12; const ir = 27;
    for (let y = -R; y <= R; y++) for (let x = -4; x <= R + 4; x++) {
      const dO = Math.hypot(x, y * .98); const dI = Math.hypot(x + io, y); if (dO > R || dI < ir || x < -3) continue;
      const band = R - dO; const rel = band / Math.max(1, (R - (ir - io)));
      const v = band < 1.6 ? .98 : band < 3.5 ? .78 : rel < .55 ? .6 : .4;
      tone(s, f, P.steel, ox + x, cy + y, v - Math.abs(y) / 140 + (y < 0 ? .04 : 0));
      if (Math.abs(band - 6) < .5 && (Math.round(Math.atan2(y, x) * 24) % 3 === 0)) tone(s, f, P.steel, ox + x, cy + y, .2); // engraved dashes
    }
    // A glint travelling along the edge and the red tassel with a knot.
    const ga = -1.25 + f / 3 * 2.5; for (let k = -2; k <= 2; k++) tone(s, f, P.steel, ox + Math.cos(ga + k * .03) * (R - .5), cy + Math.sin(ga + k * .03) * (R - .5), 1);
    for (let y = 0; y < 3; y++) for (let x = -2; x <= 2; x++) tone(s, f, P.red, 129 + x, cy + 9 + y, .7);
    for (let j = 0; j < 14; j++) for (let k = -1; k <= 1; k++) tone(s, f, P.red, 129 + k + Math.round(Math.sin(j * .5 + f * 1.4) * (j / 6)), cy + 12 + j, j < 3 ? .75 : .55 - k * .1);
    B.selOutline(s, f, P.out);
  }
  return s;
}
function katana() {
  const s = new Sheet('w_katana', 124, 30, 4, { anchor: 'center' }); const cy = 15;
  for (let f = 0; f < 4; f++) {
    for (let d = -2; d <= 2; d++) for (let k = 0; k < 3; k++) tone(s, f, P.gold, 1 + k, cy + d, d < 0 ? .85 : .45); // kashira
    // Ito wrap: black cord crossing over ivory ray-skin diamonds.
    for (let x = 4; x <= 28; x++) for (let d = -2; d <= 2; d++) { const m = ((x + Math.abs(d) * 2) % 6 + 6) % 6; tone(s, f, m < 3 ? P.black : P.ivory, x, cy + d, m < 3 ? .6 - d * .08 : .55 - d * .08); }
    // Oval tsuba with openings, gold habaki.
    for (let y = -7; y <= 7; y++) for (let x = 0; x < 4; x++) { if ((y / 7.5) ** 2 + ((x - 1.5) / 2.5) ** 2 > 1) continue; tone(s, f, P.gold, 29 + x, cy + y, (y < 0 ? .8 : .4) + (x === 0 ? .1 : 0)); }
    tone(s, f, P.black, 30, cy - 4, 0); tone(s, f, P.black, 30, cy + 4, 0);
    ring(s, f, P.gold, 33, cy, 3, 2);
    // Blade: curved spine, mune (dark back), shinogi-ji (light facet), ridge, hamon (wavy white), ha (bright edge).
    const spine = (x) => cy - 2 - ((x - 36) / 84) ** 2 * 6;
    blade(s, f, 36, 119, (x) => spine(x) - 1, (x) => spine(x) + (x > 112 ? Math.max(0, 3 - (x - 112) * .5) : 3), (x, y, t, b) => {
      const d = y - t; const hamon = t + 2 + (Math.sin(x * .7) > .3 ? 1 : 0);
      if (d === 0) return [P.steel, .3]; if (y < hamon) return [P.steel, .62 + (d === 1 ? .1 : 0)]; if (y === hamon) return [P.steel, .98]; return [P.steel, y === b ? .5 : .85];
    });
    const gx = 40 + ((f * 21) % 76); for (let k = -1; k <= 1; k++) tone(s, f, P.steel, gx + k, Math.round(spine(gx + k)) + 1, 1);
    B.selOutline(s, f, P.out);
  }
  return s;
}
function sheath() {
  const s = new Sheet('w_katana_sheath', 112, 22, 1, { anchor: 'center' }); const cy = 10;
  const spine = (x) => cy - ((x - 6) / 100) ** 2 * 5;
  blade(s, 0, 6, 106, (x) => spine(x) - 3, (x) => spine(x) + 3, (x, y, t) => [P.red, y - t === 1 ? .95 : y - t < 3 ? .7 : y - t < 5 ? .5 : .3]);
  for (const x of [6, 26, 102]) for (let y = -4; y <= 4; y++) for (let k = 0; k < 3; k++) tone(s, 0, P.gold, x + k, Math.round(spine(x)) + y, y < 0 ? .88 : .45);
  for (let j = 0; j < 8; j++) for (let k = 0; k < 2; k++) tone(s, 0, P.purple, 28 + k + Math.round(j * .3), Math.round(spine(28)) + 4 + j, .6); // cord
  B.selOutline(s, 0, P.out); return s;
}
function spear() {
  const s = new Sheet('w_spear', 210, 60, 4, { anchor: 'center' }); const cy = 30;
  for (let f = 0; f < 4; f++) {
    // Crystal butt, frost-wood shaft, ice wraps with rune glints.
    for (let k = 0; k < 7; k++) for (let d = -(3 - (k >> 1)); d <= 3 - (k >> 1); d++) tone(s, f, P.ice, 7 - k, cy + d, d < 0 ? .8 : .5);
    shaft(s, f, P.frostwood, 8, 150, cy, 2);
    for (const [x, w] of [[30, 10], [70, 4], [110, 4], [140, 10]]) for (let k = 0; k < w; k++) for (let d = -3; d <= 3; d++) tone(s, f, P.ice, x + k, cy + d, (d < 0 ? .78 : .48) + ((k + f) % 4 === 0 && d === 0 ? .3 : 0));
    wrap(s, f, P.leather, 40, 60, cy, 2);
    // Crystal head: a long faceted leaf (light upper facet, white ridge, darker lower facet), side crystals at its base.
    const hx = 148; const L = 58;
    for (let x = 0; x <= L; x++) { const u = x / L; const w = Math.round(11 * Math.sin(Math.PI * Math.min(1, u * 1.6 + .08)) * (1 - u * .5)); for (let d = -w; d <= w; d++) tone(s, f, P.ice, hx + x, cy + d, d < 0 ? .78 - u * .1 : d === 0 ? 1 : .46); }
    for (const [bx, by, a, Ls] of [[154, -8, -2.4, 18], [156, 8, 2.4, 18], [164, -10, -2.0, 13], [165, 10, 2.0, 13]]) for (let k = 0; k < Ls; k++) { const w = Math.max(0, Math.round(3 * (1 - k / Ls))); for (let e = -w; e <= w; e++) tone(s, f, P.ice, bx + Math.cos(a) * k - Math.sin(a) * e * .5, cy + by + Math.sin(a) * k + Math.cos(a) * e * .5, e < 0 ? .85 : .5); }
    // Frost motes and a sparkle cross that wanders over the head.
    for (let q = 0; q < 7; q++) { const rr = rng(90 + q); const life = (f / 4 + rr()) % 1; tone(s, f, P.ice, 150 + rr() * 42 - life * 10, cy - 14 - life * 8 + rr() * 28, 1); }
    const sx = 158 + f * 8; for (let k = -2; k <= 2; k++) { tone(s, f, P.ice, sx + k, cy - 2, 1); tone(s, f, P.ice, sx, cy - 2 + k, 1); }
    B.selOutline(s, f, P.out);
  }
  return s;
}
function sword() {
  const s = new Sheet('w_sword', 112, 44, 4, { anchor: 'center' }); const cy = 24;
  for (let f = 0; f < 4; f++) {
    gem(s, f, P.blue, 3, cy, 3, .1); wrap(s, f, P.leather, 7, 20, cy, 2);
    // Ornate gold cross-guard with curled ends.
    for (let y = -9; y <= 9; y++) for (let x = 0; x < 4; x++) tone(s, f, P.gold, 21 + x, cy + y, (y < 0 ? .85 : .45) + (x === 0 ? .1 : 0));
    for (const sg of [-1, 1]) for (let k = 0; k < 5; k++) tone(s, f, P.gold, 25 + k, cy + sg * (9 - Math.round(Math.sin(k / 4 * Math.PI) * 3)), .8);
    gem(s, f, P.blue, 23, cy, 1, .2);
    // Blue flame tongues rising from the blade's back edge (teardrops: deep blue rim, blue, light core).
    const r = rng(300 + f * 17);
    for (let k = 0; k < 11; k++) { const bx = 30 + k * 6 + Math.round(r() * 3); const H = 7 + Math.round(r() * 8) - (k > 8 ? 4 : 0); for (let j = 0; j < H; j++) { const w = Math.max(0, Math.round(3 * Math.sin(Math.PI * (1 - j / H) * .9))); for (let e = -w; e <= w; e++) tone(s, f, P.blue, bx + e - Math.round(j * .5), cy - 5 - j, Math.abs(e) === w ? .25 : j < H * .4 && Math.abs(e) < w ? .9 : .6); } }
    // Blade: light upper facet, ridge, shaded lower facet, bright edges, glowing fuller runes.
    blade(s, f, 26, 106, (x) => cy - (x > 98 ? 4 - (x - 98) * .5 : 4), (x) => cy + (x > 98 ? 4 - (x - 98) * .5 : 4), (x, y, t, b) => {
      if (y === t || y === b) return [P.steel, .98]; if (y < cy) return [P.steel, .78]; if (y === cy) return [P.steel, .4]; return [P.steel, .55];
    });
    for (let x = 30; x <= 92; x += 5) { const on = ((x / 5 + f) % 4) === 0; tone(s, f, P.blue, x, cy, on ? 1 : .8); tone(s, f, P.blue, x + 1, cy, on ? .9 : .6); }
    B.selOutline(s, f, P.out);
  }
  return s;
}
function shield() {
  const s = new Sheet('w_shield', 66, 76, 4, { anchor: 'center' }); const cx = 33; const cy = 38; const RX = 29; const RY = 34;
  for (let f = 0; f < 4; f++) {
    for (let y = -RY; y <= RY; y++) for (let x = -RX; x <= RX; x++) {
      const e = (x / RX) ** 2 + (y / RY) ** 2; if (e > 1) continue;
      const light = .55 - (x / RX + y / RY) * .18;
      if (e > .8) { tone(s, f, P.gold, cx + x, cy + y, light + (e > .95 ? -.2 : e < .84 ? .15 : 0)); continue; }
      // Radial plates with dark seams.
      const a = Math.atan2(y, x); const seam = Math.abs(((a / TAU * 8) % 1 + 1) % 1 - .5) > .47;
      tone(s, f, P.steel, cx + x, cy + y, seam ? .12 : light * .75);
    }
    // Rim studs.
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; tone(s, f, P.gold, cx + Math.cos(a) * RX * .9, cy + Math.sin(a) * RY * .9, 1); }
    // Rune circuit: inner ring, branches with nodes, a pulse running round.
    for (let a = 0; a < TAU; a += .02) { const on = Math.floor(a / TAU * 24 + f * 6) % 24 < 4; tone(s, f, P.blue, cx + Math.cos(a) * 17, cy + Math.sin(a) * 20, on ? 1 : .72); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + .26; for (let r = 6; r <= 16; r++) tone(s, f, P.blue, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.18, .7); gem(s, f, P.blue, Math.round(cx + Math.cos(a) * 22), Math.round(cy + Math.sin(a) * 26), 1, (k + f) % 3 === 0 ? .4 : 0); }
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 25) tone(s, f, P.gold, cx + x, cy + y, x + y < 0 ? .9 : .45);
    gem(s, f, P.blue, cx, cy, 2, .2);
    B.selOutline(s, f, P.out);
  }
  return s;
}
function spiritSword() {
  const s = new Sheet('w_spirit_sword', 124, 50, 4, { anchor: 'center' }); const cy = 26;
  for (let f = 0; f < 4; f++) {
    // Feathered hilt: dark grip, red feathers at the pommel, a winged dark guard.
    for (let k = 0; k < 3; k++) for (let j = 0; j < 8; j++) tone(s, f, P.red, 2 - j * .3, cy + 2 + k * 2 + j * .6, .7 - j / 16);
    wrap(s, f, P.black, 4, 16, cy, 2);
    for (const sg of [-1, 1]) for (let k = 0; k < 10; k++) for (let e = 0; e < 3 - (k >> 2); e++) tone(s, f, P.black, 17 + k * .6, cy + sg * (3 + k) + sg * e, .55 + (sg < 0 ? .15 : 0));
    // Jagged spirit-glass blade: big saw teeth on the top edge, small on the bottom; inner gradient to a white core.
    const half = (x) => 9 * (1 - (x - 20) / 100 * .85);
    blade(s, f, 20, 120, (x) => cy - half(x) - (((x - 20) % 9) < 4 ? 3 : 0), (x) => cy + half(x) * .7 + (((x - 20) % 7) < 2 ? 1 : 0), (x, y, t, b) => {
      const span = Math.max(1, b - t); const d = Math.abs(y - cy) / span; return [P.spirit, y === cy ? 1 : d < .12 ? .88 : d < .3 ? .7 : y === t || y === b ? .3 : .52];
    });
    // Floating shards breaking off above the blade.
    for (let q = 0; q < 5; q++) { const rr = rng(400 + q); const life = (f / 4 + rr()) % 1; const x = 40 + rr() * 70; const y = cy - 14 - life * 8; for (let k = 0; k < 3; k++) tone(s, f, P.spirit, x + k * .5, y + k, .9 - k * .15); }
    B.selOutline(s, f, P.out);
  }
  return s;
}
module.exports = { weaponSheets: () => [glaive(), katana(), sheath(), spear(), sword(), shield(), spiritSword()] };
