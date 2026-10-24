// GRIMGE — Pilot B: METEOR CATACLYSM sprite sheets (TEST ASSETS, final artwork missing).
// Plan §2.2: one massive broken rock body with a dark shell and glowing lava
// cracks, a smoke trail, a ground telegraph, an LF2-style long explosion
// (white-yellow core → mottled red → brown smoke → ash), debris and a cooling crater.
const { Sheet, hex, rng } = require('./pixel_sheet.cjs');

const M = {
  out: hex('#120A08'), shellD: hex('#2B1D18'), shell: hex('#4A332A'), shellL: hex('#6E5242'), shellH: hex('#8A6A55'),
  lavaD: hex('#B3260B'), lava: hex('#FF5A1F'), lavaH: hex('#FFB347'), core: hex('#FFF1C2'), white: hex('#FFFFFF'),
  smokeD: hex('#3A2F2F'), smoke: hex('#5C4D4A'), smokeL: hex('#7A6A64'), ash: hex('#2A2220'), red: hex('#E53920'), yellow: hex('#FFE066')
};

// Rock outline: an irregular 9-gon, rotated per frame.
function rockPoints(cx, cy, R, angle, seed) {
  const r = rng(seed);
  // 14 vertices, alternating bulges and notches: a lumpy boulder, not a box.
  return Array.from({ length: 20 }, (_, i) => { const a = angle + i / 20 * Math.PI * 2; const rr = R * (i % 5 === 2 ? .8 : .9 + r() * .1); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .92]; });
}
function meteorBody() {
  const s = new Sheet('meteor_body', 36, 36, 4, { anchor: 'center' });
  const cx = 18, cy = 18, R = 14;
  for (let f = 0; f < 4; f++) {
    const ang = f * Math.PI / 8;
    const pts = rockPoints(cx, cy, R, ang, 77);
    s.poly(f, pts, M.shell);
    // Light from the upper left: shade by the position relative to the centre.
    for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) {
      if (!s.get(f, x, y)) continue;
      const d = ((x - cx) * .7 + (y - cy) * .7) / R; // −1 upper-left … +1 lower-right
      s.set(f, x, y, d < -.45 ? M.shellH : d < -.1 ? M.shellL : d < .35 ? M.shell : M.shellD);
    }
    // Facet edges: a few darker chips.
    const r = rng(300 + f);
    for (let k = 0; k < 6; k++) { const x = cx + (r() - .5) * R * 1.4; const y = cy + (r() - .5) * R * 1.4; if (s.get(f, x, y) && s.get(f, x + 2, y + 1)) s.poly(f, [[x, y], [x + 3, y + 1], [x + 1, y + 2]], M.shellD); }
    // Lava cracks: a branching Y from the centre, rotated with the rock.
    const crack = (a, len, w) => {
      let x = cx, y = cy;
      for (let i = 0; i < len; i++) {
        x += Math.cos(a) * 1.1; y += Math.sin(a) * 1.1; a += (r() - .5) * .5;
        if (!s.get(f, x, y)) break;
        s.set(f, x, y, i < len * .3 ? M.core : i < len * .6 ? M.lavaH : M.lava);
        if (w && s.get(f, x + 1, y)) s.set(f, x + 1, y, M.lavaD);
      }
    };
    crack(ang - .4, 14, true); crack(ang + 2.2, 12, true); crack(ang + 3.9, 10, false); crack(ang + 1.1, 7, false);
    s.set(f, cx, cy, M.white); s.set(f, cx + 1, cy, M.core); s.set(f, cx, cy + 1, M.core);
    s.outline(f, M.out);
  }
  return s;
}
// Flame tongues streaming back along the fall path (the meteor always falls down-right:
// MeteorSpell vx 320, vy 850 → the flames point up-left). Drawn behind the body.
function meteorFlame() {
  const s = new Sheet('meteor_flame', 56, 56, 4, { anchor: 'center' });
  const cx = 28, cy = 28; const back = Math.atan2(-850, -320);
  for (let f = 0; f < 4; f++) {
    const r = rng(60 + f);
    for (let k = 0; k < 7; k++) {
      const a = back + (k - 3) * .16 + (r() - .5) * .1; const L = 16 + r() * 12 + (k === 3 ? 6 : 0) + (f % 2) * 3; const w = 4 + r() * 3;
      const tip = [cx + Math.cos(a) * L, cy + Math.sin(a) * L];
      const nx = -Math.sin(a) * w; const ny = Math.cos(a) * w;
      s.poly(f, [[cx + nx, cy + ny], tip, [cx - nx, cy - ny]], k % 3 === 0 ? M.lavaD : M.lava);
      const tip2 = [cx + Math.cos(a) * L * .62, cy + Math.sin(a) * L * .62];
      s.poly(f, [[cx + nx * .55, cy + ny * .55], tip2, [cx - nx * .55, cy - ny * .55]], M.lavaH);
    }
    for (let y = 0; y < 56; y++) for (let x = 0; x < 56; x++) if (Math.hypot(x - cx, y - cy) < 7) s.set(f, x, y, M.yellow);
    for (let y = 0; y < 56; y++) for (let x = 0; x < 56; x++) if (Math.hypot(x - cx, y - cy) < 4) s.set(f, x, y, M.core);
    s.outline(f, M.lavaD);
  }
  return s;
}
function meteorTrail() {
  // Smoke puffs with ember sparks (drawn along the fall path, older = later frame).
  const s = new Sheet('meteor_trail', 12, 12, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const R = 2.5 + f * .9; const r = rng(40 + f);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const d = Math.hypot(x - 6, y - 6) + (r() - .5) * 1.2; if (d < R) s.set(f, x, y, d < R * .45 ? (f === 0 ? M.lavaH : M.smokeL) : d < R * .8 ? M.smoke : M.smokeD); }
    if (f < 2) { s.set(f, 5, 5, M.core); s.set(f, 6, 4, M.lavaH); }
    s.outline(f, M.ash);
  }
  return s;
}
function meteorTelegraph() {
  // Ground marker: dark burnt ring + orange rune ticks, pulsing; frame 3 = brightest (impact imminent).
  const s = new Sheet('meteor_telegraph', 56, 18, 4, { anchor: 'center' });
  const cx = 28, cy = 9;
  for (let f = 0; f < 4; f++) {
    const R = 26 - f * 2;
    for (let y = 0; y < 18; y++) for (let x = 0; x < 56; x++) {
      const d = Math.hypot((x - cx) / R, (y - cy) / (R * .32));
      if (d > .86 && d <= 1) s.set(f, x, y, f === 3 ? M.lava : M.lavaD);
      else if (d > .74 && d <= .86) s.set(f, x, y, M.ash);
    }
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + f * .2; const x = cx + Math.cos(a) * R * .8; const y = cy + Math.sin(a) * R * .8 * .32; s.set(f, x, y, f >= 2 ? M.lavaH : M.lava); s.set(f, x + 1, y, f >= 2 ? M.lavaH : M.lava); }
    // Inner cross rune.
    const c = f >= 2 ? M.lavaH : M.lavaD;
    s.line(f, cx - 6, cy, cx + 6, cy, c); s.line(f, cx - 3, cy - 2, cx + 3, cy + 2, c); s.line(f, cx + 3, cy - 2, cx - 3, cy + 2, c);
  }
  return s;
}
function meteorExplosion() {
  // v2 (24 Oct 2026, Visual Bible "Form zuerst"): clean shapes with a light hierarchy instead of noise.
  // 0–1 white-yellow flash with sharp rays · 2–4 layered fireball (dark-red rim → orange → yellow → white core)
  // with flame tongues rising · 5–7 solid smoke puffs (light top, dark underside) with dying embers · 8–9 ash rings.
  const s = new Sheet('meteor_explosion', 64, 56, 10, { anchor: 'base', baseOffset: 3 });
  const cx = 32, cy = 36;
  const disc = (f, x0, y0, r, col, sq = 1) => { for (let y = Math.floor(y0 - r); y <= y0 + r; y++) for (let x = Math.floor(x0 - r); x <= x0 + r; x++) { if (((x - x0) / r) ** 2 + ((y - y0) / (r * sq)) ** 2 <= 1) s.set(f, x, y, col); } };
  const ring = (f, x0, y0, r, w, col) => { for (let y = Math.floor(y0 - r - 1); y <= y0 + r + 1; y++) for (let x = Math.floor(x0 - r - 1); x <= x0 + r + 1; x++) { const d = Math.hypot(x - x0, (y - y0) * 1.15); if (d <= r && d >= r - w) s.set(f, x, y, col); } };
  const tongue = (f, x0, y0, ang, len, w, col) => s.poly(f, [[x0 + Math.cos(ang + Math.PI / 2) * w, y0 + Math.sin(ang + Math.PI / 2) * w], [x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len], [x0 + Math.cos(ang - Math.PI / 2) * w, y0 + Math.sin(ang - Math.PI / 2) * w]], col);
  for (let f = 0; f < 10; f++) {
    const r = rng(700 + f);
    if (f <= 1) {
      const R = f ? 17 : 10;
      for (let k = 0; k < 8; k++) { const ang = k / 8 * Math.PI * 2 + .2; tongue(f, cx, cy, ang, R + (k % 2 ? 8 : 14), 3, k % 2 ? M.yellow : M.core); }
      disc(f, cx, cy, R, M.yellow); disc(f, cx, cy, R * .72, M.core); disc(f, cx, cy, R * .42, M.white);
      s.outline(f, M.lavaD); continue;
    }
    if (f <= 4) {
      const k = f - 2; const R = 20 + k * 3; const up = k * 2.5; const y0 = cy - up;
      // Flame tongues rising out of the ball (crisp triangles), then the layered body.
      for (let t = 0; t < 7; t++) { const ang = -Math.PI / 2 + (t - 3) * .38 + (r() - .5) * .15; tongue(f, cx + (t - 3) * 4, y0 - R * .45, ang, R * (.8 + r() * .35) - k * 2, 4, t % 2 ? M.lava : M.red); }
      // Each colour band is a cluster of offset discs (a lumpy fireball, no bullseye).
      const band = (rad, col, ox, oy) => { for (const [dx, dy, kr] of [[0, 0, 1], [-.32, .1, .72], [.3, .14, .7], [-.12, -.3, .66], [.22, -.24, .6]]) disc(f, cx + ox + dx * rad, y0 + oy + dy * rad, rad * kr, col, .88); };
      band(R * .9, M.red, 0, 0); band(R * .7, M.lava, -1, -2); band(R * (.48 - k * .06), M.lavaH, -2, -4); band(R * (.27 - k * .05), M.core, -3, -5);
      if (k === 0) disc(f, cx - 4, y0 - 6, 4, M.white);
      s.outline(f, M.lavaD); continue;
    }
    if (f <= 7) {
      const k = f - 5; const up = 8 + k * 4; const y0 = cy - up; const heat = 1 - k / 3;
      // Five solid smoke puffs: dark underside, mid body, light top-left; a dying ember core.
      const puffs = [[0, 0, 13], [-12, 4, 10], [12, 4, 10], [-6, -9, 9], [7, -8, 9]];
      for (const [dx, dy, pr] of puffs) { const rr = pr + k * 1.5; disc(f, cx + dx, y0 + dy + 2, rr, M.smokeD, .9); disc(f, cx + dx - 1, y0 + dy, rr * .85, M.smoke, .9); disc(f, cx + dx - 3, y0 + dy - 3, rr * .45, M.smokeL, .9); }
      if (heat > .2) { disc(f, cx, y0 + 4, 7 * heat, M.red, .8); disc(f, cx, y0 + 4, 4 * heat, M.lava, .8); disc(f, cx, y0 + 4, 2 * heat, M.lavaH, .8); }
      for (let e = 0; e < 4; e++) { const ex = cx + (e - 1.5) * 9; const ey = y0 + 14 + (e % 2) * 3; s.set(f, ex, ey, M.lava); s.set(f, ex, ey + 1, M.red); }
      s.outline(f, M.ash); continue;
    }
    // Ash: thin rings of the last puffs drifting apart.
    const k = f - 8; const y0 = cy - 20 - k * 4;
    for (const [dx, dy, pr] of [[-9, 2, 9], [9, 0, 8], [0, -8, 7]]) ring(f, cx + dx * (1 + k * .3), y0 + dy, pr + k * 2, 2, k ? M.ash : M.smokeD);
  }
  return s;
}
function meteorDebris() {
  const s = new Sheet('meteor_debris', 8, 8, 4, { anchor: 'center' });
  const shapes = [[[1, 6], [2, 1], [6, 2], [7, 6]], [[0, 4], [4, 0], [7, 3], [4, 7]], [[1, 2], [6, 1], [6, 6], [2, 7]], [[2, 7], [1, 3], [5, 0], [7, 5]]];
  shapes.forEach((pts, f) => { s.poly(f, pts, M.shell); s.set(f, pts[1][0] + 1, pts[1][1] + 1, M.shellH); s.set(f, pts[2][0] - 1, pts[2][1] + 1, M.lava); s.outline(f, M.out); });
  return s;
}
function meteorCrater() {
  // Cooling crater: 0 glowing lava pool … 3 dark scorched hole.
  const s = new Sheet('meteor_crater', 64, 20, 4, { anchor: 'center' });
  const cx = 32, cy = 10;
  for (let f = 0; f < 4; f++) {
    const r = rng(800 + f);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 64; x++) {
      const d = Math.hypot((x - cx) / 30, (y - cy) / 9.5) + (r() - .5) * .08;
      if (d > 1) continue;
      const heat = 1 - f / 3;
      let col;
      if (d > .82) col = d > .92 ? M.shellD : M.shell;                     // raised rim
      else if (d > .55) col = r() < heat * .5 ? M.lavaD : M.ash;             // scorched slope
      else col = heat > .6 ? (d < .25 ? M.core : d < .4 ? M.lavaH : M.lava) : heat > .2 ? (d < .3 ? M.lava : M.lavaD) : (r() < .2 ? M.lavaD : M.ash);
      s.set(f, x, y, col);
    }
    // Rim boulders.
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + .3; const x = cx + Math.cos(a) * 28; const y = cy + Math.sin(a) * 8.5; s.poly(f, [[x - 2, y + 1], [x - 1, y - 2], [x + 2, y - 1], [x + 2, y + 1]], M.shellL); }
    s.outline(f, M.out);
  }
  return s;
}

module.exports = { meteorSheets: () => [meteorBody(), meteorFlame(), meteorTrail(), meteorTelegraph(), meteorExplosion(), meteorDebris(), meteorCrater()] };
