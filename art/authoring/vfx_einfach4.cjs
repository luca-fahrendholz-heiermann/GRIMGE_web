// GRIMGE — EINFACH special runes, redrawn round 4. vfx_brush.cjs, final density, own designs.
//   wind_anchor   6-frame loop, 36×68 (base): S06 Luftnähte — a stake of compressed air: a narrow whirl spinning up from
//                 a scuffed ground ring to a blue wind eye at the top (the seam is tied there).
//   rule_stele    4 frames, 34×64 (base): S31 Runengericht — a stone stele with a glowing judge's glyph (0-1 intact,
//                 pulsing; 2-3 cracked, the light leaking).
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = B.pal({
  wind: ['#1a3a5a', '#3a7aa8', '#7ab8e0', '#c8ecff', '#ffffff'],
  dust: ['#4a3a28', '#7a6448', '#a88c68'],
  stone: ['#1e1c26', '#3a3646', '#5e586c', '#8a8498', '#b8b2c4'],
  rune: ['#0a2a5a', '#1a5ab0', '#4a9aff', '#b8e0ff', '#ffffff'],
  out: '#0a0c18'
});
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(Math.round(x), Math.round(y), fv - lo) ? 1 : 0))]); };

function windAnchor() {
  const W = 36; const H = 68; const s = new Sheet('wind_anchor', W, H, 6, { anchor: 'base' }); const cx = 18; const by = H - 4;
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 50; i++) { const a = i / 50 * TAU; tone(s, f, C.dust, cx + Math.cos(a) * 13, by + Math.sin(a) * 3.5, Math.sin(a) > 0 ? .5 : .9); }
    // The whirl: crescent strokes spiralling up and narrowing.
    for (let k = 0; k < 4; k++) { const y = by - 6 - k * 12; const r = 11 - k * 1.8; const a0 = f / 6 * TAU + k * 1.3; B.crescent(s, f, cx, y, r, r * .35, a0, a0 + 3.6, { max: 3, swell: .7, ramp: C.wind, seed: k + f, dry: .3 }); }
    for (let y = 12; y < by - 4; y++) { if ((y + f * 3) % 6 < 2) tone(s, f, C.wind, cx + Math.sin(y * .4 + f) * 2, y, .7); }
    // The wind eye on top.
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y); if (d <= 5) tone(s, f, C.wind, cx + x, 9 + y, d < 2 ? 1 : d < 3.5 ? .7 : .4); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function ruleStele() {
  const W = 34; const H = 64; const s = new Sheet('rule_stele', W, H, 4, { anchor: 'base' }); const cx = 17; const by = H - 2;
  for (let f = 0; f < 4; f++) {
    const cracked = f >= 2; const glow = [.8, 1, .55, .7][f];
    // A tapering stele with a rounded top, lit from the left; a stepped foot.
    B.volume(s, f, cx - 12, 6, cx + 12, by, (x, y) => { const half = 9 + (y - 6) / (by - 6) * 3; if (y < 14) return Math.hypot(x - cx, (y - 14) * 1.2) <= 9.5; return Math.abs(x - cx) <= half && y <= by - 5; }, C.stone, { reach: 7 });
    for (let y = by - 5; y <= by; y++) for (let x = cx - 14; x <= cx + 14; x++) tone(s, f, C.stone, x, y, y === by - 5 ? .75 : .35 + (x < cx ? .15 : 0));
    // The judge's glyph: a scale-beam sigil (a vertical bar, a beam, two hanging pans), lit from within.
    const g = (x, y, v) => tone(s, f, C.rune, x, y, v * glow);
    for (let y = 18; y <= 40; y++) g(cx, y, .9);
    for (let x = -7; x <= 7; x++) g(cx + x, 22, .85);
    for (const sd of [-1, 1]) { for (let y = 22; y <= 30; y++) g(cx + sd * 7 - (y - 22) * .2 * sd, y, .7); for (let x = -3; x <= 3; x++) g(cx + sd * 6 + x, 31, .8); }
    for (let x = -4; x <= 4; x++) g(cx + x, 41, .8);
    if (cracked) { const r = rng(5); let x = cx + 6; let y = 10; for (let k = 0; k < 14; k++) { x += (r() - .6) * 3; y += 3; s.set(f, x, y, C.stone[0]); if (k % 3 === 0) s.set(f, x + 1, y, C.rune[2]); } }
    B.selOutline(s, f, C.out);
  }
  return s;
}

module.exports = { einfach4Sheets: () => [windAnchor(), ruleStele()] };
