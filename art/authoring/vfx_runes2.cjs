// GRIMGE — special runes, round 2 (hand-drawn quality; vfx_brush.cjs; final density). Own designs.
//   ice_mirror        4-frame loop, 44×124 (base): a mirror of ice — a faceted glass pane (lit / shaded facets),
//                     a frame of ice crystals growing up its sides and crown, a sheen sweeping across.
//   ice_mirror_break  5 frames, 64×124 (base): the pane cracks, splits and falls apart into shards.
//   ice_shard_bolt    2 frames, 56×20 (faces right): the flying mirror shard with a frost trail.
//   time_dome         8-frame loop, 248×168 (base): a time-stop dome — pale glass shell with hour runes along
//                     the rim, a ground dial with ticks, a huge clock face floating above with frozen hands,
//                     motes hanging still in the air.
//   shadow_slash      6 frames, 80×80: a dark crescent slash with a violet edge and ink splatter.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = B.pal({
  ice: ['#0b2a44', '#1d5c8a', '#3f93c8', '#7fcfee', '#c2ecfb', '#effbff', '#ffffff'],
  time: ['#1f2630', '#3a4656', '#62728a', '#93a3bb', '#c7d3e3', '#eef3fa', '#ffffff'],
  gold: ['#5a3a00', '#b8860b', '#e8c25a', '#fff0b3'],
  shadow: ['#06020c', '#160a2c', '#2e1656', '#552a96', '#8f5ad8', '#d2b8ff'],
  out: '#06121e', outT: '#0c1016', outS: '#030106'
});
const tone = (s, f, ramp, x, y, v) => { const fv = clamp01(v) * (ramp.length - 1); const lo = Math.floor(fv); s.set(f, x, y, ramp[Math.min(ramp.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };
function crystalTuft(s, f, x, y, h, dir) { for (let k = 0; k < 3; k++) { const len = h * (1 - k * .25); const a = dir + (k - 1) * .4; for (let t = 0; t < len; t++) { const w = Math.max(0, Math.round(2 * (1 - t / len))); for (let j = -w; j <= w; j++) tone(s, f, C.ice, x + Math.cos(a) * t - Math.sin(a) * j, y + Math.sin(a) * t + Math.cos(a) * j, .55 + t / len * .4 + (j < 0 ? .1 : 0)); } } }

function mirror() {
  const W = 44; const H = 124; const s = new Sheet('ice_mirror', W, H, 4, { anchor: 'base', baseOffset: 2 });
  for (let f = 0; f < 4; f++) {
    const x0 = 8; const x1 = 36; const top = 14; const bot = 120;
    // Pane: two facets split diagonally, lit upper-left, shaded lower-right, a few cut lines.
    for (let y = top; y <= bot; y++) for (let x = x0; x <= x1; x++) { const u = (y - top) / (bot - top); const diag = (x - x0) / (x1 - x0) + u * .6; tone(s, f, C.ice, x, y, diag < .7 ? .62 - u * .15 : .38 - u * .1); }
    for (const [ax, ay, bx, by] of [[x0, 40, x1, 64], [x0 + 6, 90, x1, 76], [20, top, 26, 50]]) { const n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let k = 0; k <= n; k++) tone(s, f, C.ice, ax + (bx - ax) * k / n, ay + (by - ay) * k / n, .85); }
    // Sheen: a bright diagonal band sweeping across with the frame.
    const sweep = x0 - 6 + f * 10; for (let y = top; y <= bot; y++) { const xs = sweep + (bot - y) * .25; for (let k = 0; k < 3; k++) { const x = Math.round(xs + k); if (x >= x0 && x <= x1) tone(s, f, C.ice, x, y, 1 - k * .1); } }
    // Frame: crystal tufts up the sides and a crown on top.
    for (let y = bot; y > top; y -= 14) { crystalTuft(s, f, x0 - 1, y, 7, Math.PI + .4); crystalTuft(s, f, x1 + 1, y - 7, 7, -.4); }
    crystalTuft(s, f, 22, top + 1, 13, -Math.PI / 2); crystalTuft(s, f, 14, top + 3, 9, -Math.PI / 2 - .5); crystalTuft(s, f, 30, top + 3, 9, -Math.PI / 2 + .5);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function mirrorBreak() {
  const W = 64; const H = 124; const s = new Sheet('ice_mirror_break', W, H, 5, { anchor: 'base', baseOffset: 2 });
  for (let f = 0; f < 5; f++) {
    const k = f / 4; const r = rng(500);
    for (let i = 0; i < 9; i++) {
      const cx0 = 22 + (r() - .5) * 18; const cy0 = 20 + i * 11; const side = cx0 < 22 ? -1 : 1; const x = cx0 + side * k * (6 + r() * 14); const y = cy0 + k * k * 60 * (.6 + r() * .6); const sz = 6 + r() * 6; const rot = k * (r() - .5) * 4;
      const pts = [[0, -sz], [sz * .6, sz * .3], [-sz * .5, sz * .5]].map(([px, py]) => [x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)]);
      s.poly(f, pts, C.ice[3 + (i % 2)]); s.line(f, pts[0][0], pts[0][1], pts[1][0], pts[1][1], C.ice[6]);
    }
    if (f === 0) for (let k2 = 0; k2 < 6; k2++) { const a = k2 / 6 * TAU; for (let t = 0; t < 30; t++) tone(s, f, C.ice, 22 + Math.cos(a) * t * .5, 64 + Math.sin(a) * t, .95); }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function shardBolt() {
  const s = new Sheet('ice_shard_bolt', 56, 20, 2, { anchor: 'center' });
  for (let f = 0; f < 2; f++) {
    for (let x = 0; x < 30; x++) if ((x + f * 3) % 4) tone(s, f, C.ice, x, 10 + Math.sin(x / 4 + f) * 1.5, .4 + x / 60);
    s.poly(f, [[30, 10], [40, 4], [54, 10], [40, 16]], C.ice[4]); s.poly(f, [[40, 4], [54, 10], [40, 10]], C.ice[5]); s.line(f, 40, 10, 54, 10, C.ice[6]);
    B.selOutline(s, f, C.out);
  }
  return s;
}
function timeDome() {
  const W = 248; const H = 168; const s = new Sheet('time_dome', W, H, 8, { anchor: 'base', baseOffset: 8 }); const cx = 124; const gy = 158; const R = 120; const ry = R * .3;
  for (let f = 0; f < 8; f++) {
    // Ground dial: an ellipse ring with tick marks (hour runes).
    for (let i = 0; i < 160; i++) { const a = i / 160 * TAU; tone(s, f, C.time, cx + Math.cos(a) * R, gy + Math.sin(a) * ry, Math.sin(a) > 0 ? .85 : .55); tone(s, f, C.time, cx + Math.cos(a) * (R - 6), gy + Math.sin(a) * (ry - 2), .45); }
    for (let h = 0; h < 12; h++) { const a = h / 12 * TAU; const x = cx + Math.cos(a) * (R - 3); const y = gy + Math.sin(a) * (ry - 1); for (let k = -2; k <= 2; k++) tone(s, f, C.time, x, y + k, .95); }
    // The glass shell: a dithered pale dome with a lit rim on the left, hour runes riding round it.
    for (let y = gy - R * .9; y <= gy; y++) for (let x = cx - R; x <= cx + R; x++) { const dx = (x - cx) / R; const dy = (gy - y) / (R * .9); const e = dx * dx + dy * dy; if (e > 1) continue; const rim = e > .9; if (!rim) continue; tone(s, f, C.time, x, y, rim ? (dx < 0 ? .95 : .7) : .8); }
    for (let k = 0; k < 6; k++) { const a = Math.PI + (k + f / 8) / 6 * Math.PI; const x = cx + Math.cos(a) * R * .97; const y = gy + Math.sin(a) * R * .87; for (let j = -2; j <= 2; j++) { tone(s, f, C.gold, x + j, y, .9); tone(s, f, C.gold, x, y + j, .9); } }
    // Motes frozen in the air (they do not move between frames — time stands still), a faint glint pulse.
    const mr = rng(600); for (let q = 0; q < 18; q++) { const x = cx + (mr() - .5) * R * 1.6; const y = gy - 10 - mr() * R * .7; tone(s, f, C.time, x, y, q % 4 === f % 4 ? 1 : .8); }
    // The clock face above: a gold rim, roman tick marks, frozen hands, a cracked glass glint.
    const fx = cx; const fy = gy - R * .9 - 4; const fr = 20;
    for (let y = -fr - 2; y <= fr + 2; y++) for (let x = -fr - 2; x <= fr + 2; x++) { const d = Math.hypot(x, y); if (d > fr + 2) continue; if (d > fr - 1) tone(s, f, C.gold, fx + x, fy + y, y < 0 ? .9 : .55); else tone(s, f, C.time, fx + x, fy + y, .85 - (x + y) / 80); }
    for (let h = 0; h < 12; h++) { const a = h / 12 * TAU; for (let k = 0; k < (h % 3 ? 2 : 4); k++) tone(s, f, C.time, fx + Math.cos(a) * (fr - 3 - k), fy + Math.sin(a) * (fr - 3 - k), .1); }
    for (let k = 0; k < 13; k++) tone(s, f, C.time, fx, fy - k, 0); for (let k = 0; k < 9; k++) tone(s, f, C.time, fx + k * .8, fy + k * .4, 0);
    for (let k = 0; k < 6; k++) tone(s, f, C.time, fx - 9 + k, fy - 12 + k, 1);
    B.selOutline(s, f, C.outT);
    // Glass glare after the outline (no dark rims): two curved pale streaks on the shell.
    for (const [a0, a1, rr] of [[Math.PI * 1.15, Math.PI * 1.45, .9], [Math.PI * 1.55, Math.PI * 1.7, .8]]) for (let a = a0; a < a1; a += .01) { const x = cx + Math.cos(a) * R * rr; const y = gy + Math.sin(a) * R * .9 * rr; s.set(f, x, y, C.time[6]); s.set(f, x + 1, y, C.time[5]); }
  }
  return s;
}
function shadowSlash() {
  const s = new Sheet('shadow_slash', 80, 80, 6, { anchor: 'center' }); const c = 40;
  for (let f = 0; f < 6; f++) {
    const k = f / 5; const a0 = -2.2 + k * 1.2; const a1 = a0 + 1.8 + k * .6;
    B.crescent(s, f, c, c, 30, 26, a0, a1, { max: 10 * (1 - k * .6) + 1, ramp: C.shadow.slice(0, 5), seed: 700 + f, dry: .3 + k * .4 });
    B.crescent(s, f, c, c, 34, 30, a0 + .2, a1 - .1, { max: 2.5 * (1 - k * .5) + .5, ramp: C.shadow.slice(3), seed: 710 + f, dry: .3 });
    const r = rng(720 + f); for (let q = 0; q < 8; q++) { const a = a0 + r() * (a1 - a0); const d = 36 + r() * 8 + k * 10; const sz = 1 + Math.round(r() * 2); for (let yy = 0; yy < sz; yy++) for (let xx = 0; xx < sz; xx++) s.set(f, c + Math.cos(a) * d + xx, c + Math.sin(a) * d + yy, C.shadow[q % 3 ? 1 : 3]); }
    B.selOutline(s, f, C.outS);
  }
  return s;
}
module.exports = { runes2Sheets: () => [mirror(), mirrorBreak(), shardBolt(), timeDome(), shadowSlash()] };
