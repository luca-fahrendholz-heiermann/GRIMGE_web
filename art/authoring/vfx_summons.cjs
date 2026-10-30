// GRIMGE — drawn summon bodies that had no sprite yet (drawn at scale 1: a sheet px is a world px). Own designs.
//   summon_void_spider 4×60×40 (base) — a void spider walking right: striped abdomen with magenta void marks,
//                       armoured head with four glowing eyes and fangs, eight jointed legs stepping in pairs
const B = require('./vfx_brush.cjs');
const { Sheet, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);
const disc = (s, f, r, cx, cy, rx, ry, sh) => { for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(rx); x <= rx; x++) { const e = (x / rx) ** 2 + (y / ry) ** 2; if (e <= 1) tone(s, f, r, cx + x, cy + y, sh(x, y, e)); } };
const line = (s, f, r, x0, y0, x1, y1, v, w = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) tone(s, f, r, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n + k, v); };

function voidSpider() {
  const s = new Sheet('summon_void_spider', 60, 40, 4, { anchor: 'base', baseOffset: 1 });
  const body = ramp('#0a0412', '#1e0b30', '#3a1656', '#6a2a8c'); const glow = ramp('#8e24aa', '#d500f9', '#f8bbff');
  for (let f = 0; f < 4; f++) {
    const ph = f / 4 * TAU; const bob = Math.round(Math.sin(ph * 2) * .8);
    // legs: four pairs, far side darker, stepping in alternation (back pairs first, under the body)
    for (let i = 0; i < 4; i++) for (const far of [true, false]) {
      const hx = 30 + i * 4 - (far ? 2 : 0); const hy = 22 + bob; const a = ph + i * Math.PI / 2 + (far ? Math.PI : 0);
      const reach = (i - 1.5) * 9; const lift = Math.max(0, Math.sin(a)) * 4;
      const kx = hx + reach * .6; const ky = 8 + bob - lift + (far ? 2 : 0); const fx = hx + reach * 1.25 + Math.cos(a) * 3; const fy = 38 - lift * .6;
      line(s, f, body, hx, hy, kx, ky, far ? .1 : .5, 2); line(s, f, body, kx, ky, fx, fy, far ? .1 : .4, far ? 1 : 2);
      if (!far) tone(s, f, body, kx, ky, 1);
    }
    disc(s, f, body, 18, 19 + bob, 15, 11, (x, y, e) => (e > .82 ? (y < 0 ? .75 : .2) : x + y < -6 ? .6 : .35)); // abdomen
    for (let k = 0; k < 3; k++) for (let x = -8 + k * 2; x <= 8 - k * 2; x++) tone(s, f, glow, 18 + x, 14 + k * 4 + bob, (x + k + f) % 3 === 0 ? 1 : .55); // void marks
    disc(s, f, body, 38, 22 + bob, 8, 6, (x, y, e) => (e > .8 ? (y < 0 ? .85 : .2) : y < -1 ? .7 : .45)); // head
    for (const [ex, ey] of [[42, 19], [44, 20], [41, 21], [43, 22]]) tone(s, f, glow, ex, ey + bob, f % 2 && ex === 44 ? .7 : 1);
    line(s, f, body, 45, 24 + bob, 47, 28 + bob, .9); line(s, f, body, 43, 25 + bob, 44, 29 + bob, .9); // fangs
    B.selOutline(s, f, B.pal({ o: '#000000' }).o);
  }
  return s;
}
module.exports = { summonSheets: () => [voidSpider()] };
