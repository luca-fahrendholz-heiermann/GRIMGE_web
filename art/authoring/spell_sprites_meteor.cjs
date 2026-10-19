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
  // LF2-style long explosion: 0–1 white-yellow flash, 2–4 mottled fire, 5–7 red into brown smoke, 8–9 ash.
  const s = new Sheet('meteor_explosion', 64, 56, 10, { anchor: 'base', baseOffset: 3 });
  const cx = 32, cy = 34;
  // Coarse value noise (3×3 px cells) so the mottling forms clumps, not single-pixel static.
  const cell = (f, x, y) => { const h = Math.sin((Math.floor(x / 3) * 12.9898 + Math.floor(y / 3) * 78.233 + f * 3.7)) * 43758.5453; return h - Math.floor(h); };
  for (let f = 0; f < 10; f++) {
    const r = rng(500 + f);
    const R = f < 2 ? 12 + f * 9 : Math.min(28, 22 + f * 1.5);
    const rise = f * 1.6;
    // Blobby silhouette: several overlapping circles.
    const blobs = Array.from({ length: 9 }, (_, k) => { const a = k / 9 * Math.PI * 2 + r() * .4; const rr = R * (.45 + r() * .3); return [cx + Math.cos(a) * rr * .9, cy - rise + Math.sin(a) * rr * .75 - (a > Math.PI ? 3 : 0), R * (.42 + r() * .22)]; });
    blobs.push([cx, cy - rise, R * .7]);
    for (let y = 0; y < 56; y++) for (let x = 0; x < 64; x++) {
      let inside = false; let depth = 0;
      for (const [bx, by, br] of blobs) { const d = Math.hypot(x - bx, y - by) / br; if (d < 1) { inside = true; depth = Math.max(depth, 1 - d); } }
      if (!inside) continue;
      const n = depth * .8 + (cell(f, x, y) - .5) * .55; // clumpy mottling
      let col;
      if (f <= 1) col = n > .5 ? M.white : n > .25 ? M.core : M.yellow;
      else if (f <= 4) { const o = (f - 2) * .08; col = n > .62 + o ? M.core : n > .46 + o ? M.yellow : n > .3 + o ? M.lavaH : n > .12 + o ? M.lava : M.red; }
      else if (f <= 7) { const heat = (7 - f) / 3; col = n > .5 - heat * .2 ? (heat > .3 ? M.lava : M.red) : n > .32 - heat * .1 ? (heat > 0 ? M.red : M.smokeL) : n > .1 ? M.smokeL : M.smoke; }
      else col = cell(f, x + 7, y) < (f === 8 ? .75 : .45) ? (n > .25 ? M.smoke : M.smokeD) : null;
      if (col) s.set(f, x, y, col);
    }
    // Spiky rays on the first frames.
    if (f <= 2) for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + .2; s.line(f, cx + Math.cos(a) * R * .6, cy + Math.sin(a) * R * .5, cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 6), k % 2 ? M.yellow : M.core); }
    // Dripping smoke legs on the late frames (like LF2's firen_exp).
    if (f >= 6 && f <= 8) for (let k = 0; k < 7; k++) { const x = cx - 20 + k * 6 + Math.round(r() * 3); for (let y = cy + 8 - rise; y < cy + 16 - rise + r() * 6; y++) s.set(f, x, y, M.smokeD); }
    s.outline(f, f <= 4 ? M.lavaD : M.ash);
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
