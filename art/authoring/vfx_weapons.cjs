// GRIMGE — hand-drawn held weapons replacing the astral look for some weapons (user, 26 Oct 2026, after the example
// sprites: "die Waffen nachbilden … statt Astral-Waffen für manche"; own designs). Every sheet points RIGHT with the
// GRIP at a fixed pixel (see GRIPS in public/src/weapon_sheets.js); 4-frame loops animate glints / flames / frost.
//   w_glaive        108×40  Mondsichel-Hellebarde: wrapped dark-wood shaft with brass rings, a large half-moon blade,
//                           a back spike and a red tassel at the socket.
//   w_katana         68×20  katana: black diamond-wrapped hilt, gold tsuba, slightly curved blade with a temper line.
//   w_katana_sheath  64×16  the red lacquered scabbard with gold fittings (worn at the hip).
//   w_spear         108×32  Frostspeer: pale shaft with ice wraps, a crystal spearhead with jagged ice spikes.
//   w_sword          64×24  Runenritter sword: steel blade wreathed in crisp blue flame tongues, gold cross-guard.
//   w_shield         44×48  Runenschild: round dark-steel shield, gold rim, glowing blue rune circuit, a centre boss.
//   w_spirit_sword   68×28  Geisterklinge: jagged, serrated blade of blue spirit glass with a white core, dark hilt.
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01, rng } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const P = {
  wood: ramp('#1a0f0a', '#3a2214', '#5e3a22', '#8a5a36'), brass: ramp('#4a3010', '#9a7428', '#d8b04a', '#fff0a8'),
  steel: ramp('#1c2026', '#3a424c', '#6a7682', '#a8b4c0', '#e8eef4', '#ffffff'), red: ramp('#3a0408', '#8a1018', '#d02a2a', '#ff7a6a'),
  black: ramp('#0a0a0e', '#1e1e26', '#383848'), gold: ramp('#5a3a0a', '#a8781e', '#e8c048', '#fff4b0'),
  ice: ramp('#0e2a3a', '#2a6a8a', '#5ab4d8', '#a8e8ff', '#e8faff', '#ffffff'), frostwood: ramp('#2a3038', '#4a5664', '#7a8a9a', '#b0c0d0'),
  blue: ramp('#0a1a4a', '#1a4ab0', '#3a8aff', '#8ac8ff', '#e0f4ff'), spirit: ramp('#06223a', '#0e5a8a', '#2ab0e8', '#8ae8ff', '#ffffff'),
  out: B.pal({ o: '#06070a' }).o
};
const tone = (s, f, r, x, y, v) => { const fv = clamp01(v) * (r.length - 1); const lo = Math.floor(fv); s.set(f, x, y, r[Math.min(r.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };
// A horizontal shaft from x0 to x1 at cy, `w` px thick, lit on top.
const shaft = (s, f, r, x0, x1, cy, w) => { for (let x = x0; x <= x1; x++) for (let d = -w; d <= w; d++) tone(s, f, r, x, cy + d, d < 0 ? .85 : d === 0 ? .55 : .3); };

function glaive() {
  const s = new Sheet('w_glaive', 108, 40, 4, { anchor: 'center' }); const cy = 20;
  for (let f = 0; f < 4; f++) {
    shaft(s, f, P.wood, 2, 74, cy, 1);
    for (const x of [8, 26, 50, 70]) for (let d = -2; d <= 2; d++) for (let k = 0; k < 2; k++) tone(s, f, P.brass, x + k, cy + d, d < 0 ? .9 : .5); // brass rings
    for (let x = 12; x <= 24; x++) if (x % 3 !== 0) for (let d = -1; d <= 1; d++) tone(s, f, P.black, x, cy + d, d < 0 ? .7 : .35); // grip wrap
    // Socket and the half-moon blade: an outer arc (sharp edge, bright) and an inner arc, filled between.
    for (let y = -4; y <= 4; y++) for (let x = 72; x <= 77; x++) tone(s, f, P.brass, x, cy + y, y < 0 ? .85 : .45);
    const ox = 78; const R = 17;
    for (let y = -R; y <= R; y++) for (let x = 0; x <= R + 8; x++) {
      const outer = Math.hypot(x - 2, y) <= R + 1 && x >= 0; const inner = Math.hypot(x + 9, y) <= R + 1; if (!outer || inner) continue;
      const edge = Math.hypot(x - 2, y) > R - 1.5; tone(s, f, P.steel, ox + x, cy + y, edge ? .95 : (y < 0 ? .7 : .45) - x / 80);
    }
    for (let k = 0; k < 7; k++) tone(s, f, P.steel, ox - 2 - k, cy - 4 - k * .6, .75); // back spike
    // Travelling glint on the edge.
    const ga = -1.2 + ((f / 4) * 2.4); for (let k = -1; k <= 1; k++) tone(s, f, P.steel, ox + 2 + Math.cos(ga + k * .06) * R, cy + Math.sin(ga + k * .06) * R, 1);
    // Red tassel hanging from the socket.
    for (let j = 0; j < 9; j++) for (let k = 0; k < 2; k++) tone(s, f, P.red, 73 + k + Math.round(Math.sin(j * .6 + f * 1.5) * (j / 5)), cy + 5 + j, j < 2 ? .8 : .55);
    B.selOutline(s, f, P.out);
  }
  return s;
}
function katana() {
  const s = new Sheet('w_katana', 68, 20, 4, { anchor: 'center' }); const cy = 10;
  for (let f = 0; f < 4; f++) {
    for (let x = 2; x <= 13; x++) for (let d = -1; d <= 1; d++) tone(s, f, (x + d) % 3 === 0 ? P.gold : P.black, x, cy + d, d < 0 ? .7 : .35); // diamond wrap
    for (let y = -4; y <= 4; y++) for (let x = 14; x <= 15; x++) tone(s, f, P.gold, x, cy + y, y < 0 ? .9 : .5); // tsuba
    // Blade: a steady upward curve (one pixel step per few px), the edge (top) bright, a temper line, a clipped tip.
    for (let x = 16; x <= 62; x++) { const yc = cy - Math.floor((x - 16) / 16); const tipCut = x > 58 ? x - 58 : 0; for (let d = -1 + tipCut; d <= 1; d++) tone(s, f, P.steel, x, yc + d, d < 0 ? .98 : d === 0 ? ((x + f * 5) % 9 < 3 ? .92 : .7) : .45); }
    B.selOutline(s, f, P.out);
  }
  return s;
}
function sheath() {
  const s = new Sheet('w_katana_sheath', 64, 16, 1, { anchor: 'center' }); const cy = 8;
  for (let x = 4; x <= 60; x++) { const u = (x - 4) / 56; const yc = cy - Math.round(u * u * 3); for (let d = -2; d <= 2; d++) tone(s, 0, P.red, x, yc + d, d < 0 ? .85 : d === 0 ? .6 : .35); }
  for (const x of [6, 18, 58]) for (let d = -3; d <= 3; d++) for (let k = 0; k < 2; k++) tone(s, 0, P.gold, x + k, cy - (x > 50 ? 3 : 0) + d, d < 0 ? .9 : .5);
  B.selOutline(s, 0, P.out); return s;
}
function spear() {
  const s = new Sheet('w_spear', 108, 32, 4, { anchor: 'center' }); const cy = 16;
  for (let f = 0; f < 4; f++) {
    shaft(s, f, P.frostwood, 2, 76, cy, 1);
    for (const x of [10, 30, 56, 72]) for (let d = -2; d <= 2; d++) for (let k = 0; k < 3; k++) tone(s, f, P.ice, x + k, cy + d, d < 0 ? .85 : .5); // ice wraps
    // Crystal head: a long faceted blade with jagged ice spikes branching off.
    for (let x = 76; x <= 104; x++) { const u = (x - 76) / 28; const w = Math.round(5 * (1 - u) + (u < .2 ? u * 10 : 0)); for (let d = -w; d <= w; d++) tone(s, f, P.ice, x, cy + d, d < 0 ? .85 - u * .1 : .5); tone(s, f, P.ice, x, cy, .98); }
    const r = rng(77); for (let k = 0; k < 6; k++) { const bx = 78 + k * 4; const side = k % 2 ? 1 : -1; const L = 4 + Math.round(r() * 5); for (let j = 0; j < L; j++) tone(s, f, P.ice, bx - j * .4, cy + side * (5 + j - (k > 3 ? 2 : 0)), .9 - j / 14); }
    // Frost motes drifting off the head.
    for (let q = 0; q < 4; q++) { const rr = rng(90 + q); const life = (f / 4 + rr()) % 1; tone(s, f, P.ice, 80 + rr() * 22 - life * 8, cy - 8 - life * 6 + rr() * 16, 1); }
    B.selOutline(s, f, P.out);
  }
  return s;
}
function sword() {
  const s = new Sheet('w_sword', 64, 24, 4, { anchor: 'center' }); const cy = 12;
  for (let f = 0; f < 4; f++) {
    for (let x = 2; x <= 9; x++) for (let d = -1; d <= 1; d++) tone(s, f, P.black, x, cy + d, d < 0 ? .7 : .35);
    tone(s, f, P.gold, 1, cy, .9); for (let y = -5; y <= 5; y++) for (let x = 10; x <= 11; x++) tone(s, f, P.gold, x, cy + y, y < 0 ? .9 : .5); // guard
    // Blue flame tongues licking up from the blade (behind it), re-shaped every frame.
    const r = rng(300 + f * 17); for (let k = 0; k < 9; k++) { const bx = 16 + k * 5 + Math.round(r() * 2); const H = 4 + Math.round(r() * 5); for (let j = 0; j < H; j++) for (let e = -(H - j > 2 ? 1 : 0); e <= 0; e++) tone(s, f, P.blue, bx + e - Math.round(j * .4), cy - 3 - j, .45 + j / H * .5); }
    for (let x = 12; x <= 58; x++) { const w = x > 54 ? 0 : 2; for (let d = -2; d <= w; d++) tone(s, f, P.steel, x, cy + d, d < -1 ? .98 : d < 1 ? .72 : .45); }
    for (let k = 0; k < 4; k++) tone(s, f, P.steel, 58 + k, cy - (k > 1 ? 1 : 0), .95);
    for (let x = 14; x <= 52; x += 6) tone(s, f, P.blue, x + (f % 2), cy, .95); // rune glints along the fuller
    B.selOutline(s, f, P.out);
  }
  return s;
}
function shield() {
  const s = new Sheet('w_shield', 44, 48, 4, { anchor: 'center' }); const cx = 22; const cy = 24; const RX = 18; const RY = 21;
  for (let f = 0; f < 4; f++) {
    for (let y = -RY; y <= RY; y++) for (let x = -RX; x <= RX; x++) {
      const e = (x / RX) ** 2 + (y / RY) ** 2; if (e > 1) continue;
      if (e > .78) { tone(s, f, P.gold, cx + x, cy + y, (y < 0 ? .85 : .5) - x / 80); continue; }
      tone(s, f, P.steel, cx + x, cy + y, .38 - (x + y) / 120);
    }
    // Rune circuit: a ring and four branches with nodes, a pulse running round.
    for (let a = 0; a < TAU; a += .04) { const on = Math.floor((a / TAU * 16 + f * 4)) % 16 < 3; tone(s, f, P.blue, cx + Math.cos(a) * 11, cy + Math.sin(a) * 13, on ? 1 : .7); }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 4; k <= 9; k++) tone(s, f, P.blue, cx + dx * k * 1.1, cy + dy * k * 1.3, .75);
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) tone(s, f, P.gold, cx + x, cy + y, x + y < 0 ? .95 : .55); // boss
    B.selOutline(s, f, P.out);
  }
  return s;
}
function spiritSword() {
  const s = new Sheet('w_spirit_sword', 68, 28, 4, { anchor: 'center' }); const cy = 14;
  for (let f = 0; f < 4; f++) {
    for (let x = 2; x <= 10; x++) for (let d = -1; d <= 1; d++) tone(s, f, P.black, x, cy + d, d < 0 ? .75 : .4);
    for (let y = -4; y <= 4; y++) tone(s, f, P.spirit, 11, cy + y, .6);
    // Jagged blade: a wide body narrowing to the tip, saw teeth on both edges, a white core line.
    for (let x = 12; x <= 64; x++) {
      const u = (x - 12) / 52; const w = Math.round(6 * (1 - u * .85)); const tooth = (x % 6) < 3 ? 2 : 0;
      for (let d = -w - tooth; d <= w + (x % 6 < 2 ? 1 : 0); d++) tone(s, f, P.spirit, x, cy + d, Math.abs(d) > w ? .55 : d < 0 ? .75 : .5);
      tone(s, f, P.spirit, x, cy, (x + f * 4) % 10 < 3 ? 1 : .92);
    }
    B.selOutline(s, f, P.out);
  }
  return s;
}
module.exports = { weaponSheets: () => [glaive(), katana(), sheath(), spear(), sword(), shield(), spiritSword()] };
