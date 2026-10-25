// GRIMGE — WIND, hand-drawn quality (vfx_brush.cjs; authored at final density). Own design — the LF2
// whirlwind and the user's tornado / gust references are inspiration only.
//   wind_whirl  12-frame loop, 112×150 px: a streaky cone core wrapped by orbiting calligraphic sweeps
//               (back sweeps dark behind the core, front sweeps bright before it), a dark mouth with a lit rim,
//               a dust skirt rolling at the foot, leaves / pebbles carried round, wisps flung off the top.
//   wind_gust   8 frames, 128×72 px (faces right): forming → rolling (frames 2-5 loop) → dispersing. A sideways
//               streak body (round head, long frayed tail), rolling sweeps around the head, torn wisps and
//               dust dragged inside.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;

const C = B.pal({
  ramp: ['#27335c', '#43558f', '#6c82c3', '#a3b7ea', '#e4ecff'],
  back: ['#1d2648', '#2f3d70', '#4a5d9a'],
  core: ['#34447c', '#5d72b4', '#93a9e2', '#cfdcfb', '#ffffff'],
  dust: ['#4e3c2c', '#7c6449', '#a98d6b', '#d6c19e'],
  leaf: ['#2f4a17', '#5b8a2c', '#9ccc65'],
  out: '#151b36'
});

function whirl() {
  const W = 112; const H = 150; const N = 12; const s = new Sheet('wind_whirl', W, H, N, { anchor: 'base', baseOffset: 2 });
  const cx = 56; const top = 20; const foot = 146;
  for (let f = 0; f < N; f++) {
    const ph = f / N; const r = rng(500 + f);
    const u = (y) => clamp01((y - top) / (foot - top));
    const sway = (y) => Math.sin(u(y) * 3.1 + ph * TAU) * 6 * (1 - u(y) * .35) + Math.sin(u(y) * 7 + ph * TAU * 2) * 1.5;
    const hw = (y) => 3 + 37 * Math.pow(1 - u(y), 1.35);
    // Orbits: sweeps at 9 heights, each its own speed (integer turns per loop → seamless) and arc length.
    const orbits = Array.from({ length: 9 }, (_, i) => {
      const rr = rng(40 + i); const y = top + 6 + i * 13 + rr() * 6; const rx = hw(y) + 7 + rr() * 9; const turns = 1 + (i % 2);
      const a0 = rr() * TAU + ph * TAU * turns; const len = 1.5 + rr() * 1.4;
      return { y, rx, ry: rx * .27, a0, a1: a0 + len, w: 3 + rx * .09, seed: 70 + i * 11 + f };
    });
    const mid = (o) => Math.sin((o.a0 + o.a1) / 2);
    // 1 — back sweeps (behind the core), in the dark ramp.
    for (const o of orbits) if (mid(o) < 0) B.crescent(s, f, cx + sway(o.y), o.y, o.rx, o.ry, o.a0, o.a1, { max: o.w * .8, ramp: C.back, seed: o.seed, dry: .6 });
    // 2 — the mouth's dark inside.
    for (let y = top - 9; y <= top + 3; y++) for (let x = cx - 44; x <= cx + 44; x++) { const dx = (x - cx - sway(top)) / 38; const dy = (y - top + 3) / 9; if (dx * dx + dy * dy <= 1) s.set(f, x, y, C.back[0]); }
    // 3 — the core: a solid shaded body first (lit left, shadow right, dark inside the top), then streak
    // texture over it; only the outer rim is left ragged (gaps there, not in the middle).
    const coreTone = (x, y) => { const c = cx + sway(y); const w = hw(y); const v = (x - c) / w; if (Math.abs(v) > 1) return null; const lit = clamp01(.62 - v * .55 - v * v * .25 - (y < top + 10 ? .3 : 0)); return { lit, edge: Math.abs(v) }; };
    for (let y = top - 2; y <= foot; y++) for (let x = cx - 46; x <= cx + 46; x++) { const t = coreTone(x, y); if (!t || t.edge > .86) continue; const fv = t.lit * 3; const lo = Math.floor(fv); s.set(f, x, y, C.core[Math.min(3, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); }
    B.streakFill(s, f, cx - 46, top - 2, cx + 46, foot, (x, y) => {
      if (y < top - 2 || y > foot) return null; const t = coreTone(x + (r() - .5) * 2, y); if (!t) return null;
      return clamp01(t.lit + .12);
    }, C.core, { seed: 900 + f * 7, minLen: 3, maxLen: 16, gap: 3 });
    // 4 — the mouth rim: a thick lit sweep round the front, a thin dark one round the back.
    B.crescent(s, f, cx + sway(top), top, 42, 10, 0, Math.PI, { max: 6, ramp: C.ramp, seed: 300 + f, dry: .2, headBias: .5 });
    B.crescent(s, f, cx + sway(top), top, 42, 10, Math.PI, TAU, { max: 3, ramp: C.back, seed: 310 + f, dry: .4 });
    // 5 — front sweeps (before the core), in the lit ramp.
    for (const o of orbits) if (mid(o) >= 0) B.crescent(s, f, cx + sway(o.y), o.y, o.rx, o.ry, o.a0, o.a1, { max: o.w, ramp: C.ramp, seed: o.seed, dry: .5 });
    // 6 — carried debris: leaves and pebbles riding the orbits (front ones only — the back ones are hidden).
    for (let q = 0; q < 7; q++) {
      const rq = rng(800 + q); const y = top + 20 + rq() * 100; const a = rq() * TAU + ph * TAU * 2; if (Math.sin(a) < 0) continue;
      const x = cx + sway(y) + Math.cos(a) * (hw(y) + 10); const yy = y + Math.sin(a) * (hw(y) + 10) * .27;
      if (q % 3) { s.set(f, x, yy, C.leaf[1]); s.set(f, x + 1, yy, C.leaf[2]); s.set(f, x - 1, yy + 1, C.leaf[0]); s.set(f, x, yy + 1, C.leaf[1]); }
      else { s.set(f, x, yy, C.dust[2]); s.set(f, x + 1, yy, C.dust[1]); s.set(f, x, yy + 1, C.dust[0]); }
    }
    // 7 — wisps flung off near the top, tangentially (short tapered strokes).
    for (let q = 0; q < 4; q++) {
      const rq = rng(600 + q); const side = q % 2 ? 1 : -1; const life = (ph + rq()) % 1; const y = top + 4 + rq() * 30 - life * 8;
      const x0 = cx + side * (hw(y) + 10 + life * 22);
      B.stroke(s, f, [[x0, y], [x0 + side * (8 + life * 6), y - 2 - life * 3], [x0 + side * (14 + life * 10), y - 1 - life * 6]], { max: 3 * (1 - life * .6), ramp: C.ramp, seed: 650 + q + f, dry: .7, headBias: .3 });
    }
    // 8 — the dust skirt at the foot: lumpy puffs rolling out both ways, volume-shaded.
    for (let q = 0; q < 6; q++) {
      const rq = rng(700 + q); const side = q % 2 ? 1 : -1; const life = (ph * 2 + rq()) % 1; const rad = 4 + life * 6 + rq() * 2;
      const bx = cx + sway(foot) + side * (5 + life * 26); const by = foot - rad * .7;
      const m = B.noisyBlob(bx, by, rad, 710 + q + f, .22, .7);
      B.volume(s, f, bx - rad * 1.6, by - rad * 1.4, bx + rad * 1.6, by + rad * 1.4, (x, y) => m(x, y) && y <= foot, C.dust, { reach: 5 });
    }
    B.selOutline(s, f, C.out);
  }
  return s;
}

function gust() {
  const W = 128; const H = 72; const N = 8; const s = new Sheet('wind_gust', W, H, N, { anchor: 'center' });
  const cy = 36;
  for (let f = 0; f < N; f++) {
    const life = f < 2 ? (f + 1) / 3 : f > 5 ? 1 - (f - 5) / 3 : 1; const ph = (f % 4) / 4;
    const headX = 92 + (f < 2 ? -14 + f * 7 : 0); const len = 84 * (.55 + .45 * life); const thick = 30 * (.5 + .5 * life);
    // 1 — the streak body: round head, long tapering tail, slight wave.
    const yAt = (x) => cy + Math.sin((headX - x) / 18 + ph * TAU) * 3 * clamp01((headX - x) / len);
    const halfAt = (x) => { const v = (headX - x) / len; if (v < -.12 || v > 1) return 0; if (v < 0) return thick * .5 * Math.sqrt(1 - (v / .12) ** 2); return thick * .5 * Math.pow(1 - v, .8); };
    // Solid shaded body (lit top, shadow underside, cooler toward the tail) with streaks running over it; the
    // tail and the rim stay ragged.
    const bodyTone = (x, y) => { const h = halfAt(x); if (h < .5) return null; const v = (y - yAt(x)) / h; if (Math.abs(v) > 1) return null; const tail = clamp01((headX - x) / len); return { lit: clamp01(.66 - v * .5 - v * v * .2 - tail * .35), edge: Math.max(Math.abs(v), tail) }; };
    for (let y = Math.floor(cy - thick); y <= cy + thick; y++) for (let x = Math.floor(headX - len); x <= headX + 12; x++) { const t = bodyTone(x, y); if (!t || t.edge > .82) continue; const fv = t.lit * 3; const lo = Math.floor(fv); s.set(f, x, y, C.core[Math.min(3, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); }
    B.streakFill(s, f, headX - len - 2, cy - thick, headX + 12, cy + thick, (x, y) => { const t = bodyTone(x, y); return t ? clamp01(t.lit + .12) : null; }, C.core, { seed: 1200 + f * 5, minLen: 4, maxLen: 22, gap: 4 });
    // 2 — rolling sweeps around the head (open toward the tail), turning forward.
    for (let i = 0; i < 3; i++) {
      const rr = rng(1300 + i); const rx = (14 + i * 6) * (.6 + .4 * life); const ry = (19 + i * 5) * (.6 + .4 * life);
      const a0 = -1.3 + ph * TAU * .5 + rr() * .6 - i * .25; const a1 = a0 + 2.2 + rr() * .5;
      B.crescent(s, f, headX - 4 - i * 7, cy, rx, ry, a0, a1, { max: (6.5 - i * 1.2) * (.5 + .5 * life), ramp: C.ramp, seed: 1310 + i * 7 + f, dry: .4 });
    }
    // 3 — torn wisps behind and around the tail.
    for (let q = 0; q < 5; q++) {
      const rq = rng(1400 + q); const x0 = headX - len * (.4 + rq() * .6) - life * 6; const y0 = cy + (rq() - .5) * thick * 2.2;
      B.stroke(s, f, [[x0, y0], [x0 - 8 - rq() * 8, y0 + (rq() - .5) * 3], [x0 - 16 - rq() * 10, y0 + (rq() - .5) * 4]], { max: 2.5 * life + .5, ramp: C.ramp, seed: 1410 + q + f, dry: .7, headBias: .25 });
    }
    // 4 — dust and a leaf dragged inside the head.
    for (let q = 0; q < 6; q++) { const rq = rng(1500 + q + f * 3); const x = headX - 10 - rq() * 40; const y = yAt(x) + (rq() - .5) * thick; if (q === 0) { s.set(f, x, y, C.leaf[1]); s.set(f, x + 1, y, C.leaf[2]); s.set(f, x, y + 1, C.leaf[0]); } else { s.set(f, x, y, C.dust[q % 2 ? 2 : 1]); s.set(f, x + 1, y, C.dust[1]); } }
    B.selOutline(s, f, C.out);
  }
  return s;
}

module.exports = { windSheets: () => [whirl(), gust()] };
