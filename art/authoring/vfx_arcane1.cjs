// GRIMGE — Arcane States, round 1 (hand-drawn quality; vfx_brush.cjs; final density). Manifestations drawn
// around the hero: every sheet is 128×128 with the hero's CHEST at (64, 64), facing right; each has a back
// layer (behind the sprite) and a front layer (before it). Own designs from the forms' silhouettes.
//   as_T02_back / _front  Schlackenkern — a floating ceramic kiln: asymmetric rib band round waist and shoulder,
//                         glowing cracks, a burning kiln mouth at the left hip, embers and smoke rising.
//   as_T04_back / _front  Korallenschild — two fan-shaped protective sails of coral lamellae at the sides.
//   as_T05_back / _front  Bruchflug — three faceted crystal fins fanning from the shoulder blades, each cracked into
//                         drifting shards held together by glowing pink seams; gravity motes rising.
//   as_T06_back / _front  Ionspindel — a tall spindle axis behind the back with pulsing ion nodes, three spindle-shaped
//                         copper coils on wide tilted orbits (always behind the body), zigzag arcs to the axis and
//                         between the coils.
const B = require('./vfx_brush.cjs');
const F = require('./vfx_fire.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const ramp = (...c) => B.pal({ r: c }).r;
const C = {
  kiln: ramp('#140806', '#2a1210', '#4a2418', '#6e3a26', '#9a5a3a'), glow: ramp('#8a1a00', '#ff2a00', '#ff5a1f', '#ffd27a', '#fff3c4'),
  coral: ramp('#3a1420', '#a84a5e', '#ff8fa3', '#ffc8d2', '#fff0f3'), teal: ramp('#0e2630', '#1d3c48', '#3f8a8a', '#5ff0d8', '#bff6ff'),
  fin: ramp('#0a0614', '#2a1846', '#6a2fb0', '#b04dff', '#e9c8ff'), pink: ramp('#6a1060', '#ff4fd8', '#ffc8f2'),
  coil: ramp('#0a1418', '#10222a', '#2e5560', '#7a9aa0', '#c8e0e4'), copper: ramp('#5a2a10', '#b86a2a', '#e8a05a', '#ffd8a8'), ion: ramp('#5a7a10', '#d4ff3a', '#f6ffd0', '#ffffff'), cyan: ramp('#2a8a9a', '#7af7ff', '#e0ffff'),
  out: B.pal({ o: '#08060a' }).o
};
const tone = (s, f, r, x, y, v) => { const fv = clamp01(v) * (r.length - 1); const lo = Math.floor(fv); s.set(f, x, y, r[Math.min(r.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };
const pair = (id, n) => [new Sheet(`as_${id}_back`, 128, 128, n, { anchor: 'center' }), new Sheet(`as_${id}_front`, 128, 128, n, { anchor: 'center' })];
const CX = 64; const CY = 64;

// A tilted elliptical band split into back (sin<0) and front halves; fn(x, y, u, along) paints one pixel column.
function bandRing(back, front, f, cx, cy, rx, ry, tilt, thick, paint, a0 = 0, a1 = TAU) {
  for (let a = a0; a < a1; a += .006) {
    const x = cx + Math.cos(a) * rx; const y = cy + Math.sin(a) * ry + Math.cos(a) * tilt; const s = Math.sin(a) < 0 ? back : front;
    for (let k = 0; k < thick; k++) paint(s, f, x, y - thick / 2 + k, k / Math.max(1, thick - 1), a);
  }
}

function t02() {
  const [bk, fr] = pair('T02', 6);
  for (let f = 0; f < 6; f++) {
    const ph = f / 6;
    // Smoke and embers rising behind (back layer).
    for (let q = 0; q < 3; q++) { const life = (ph + q / 3) % 1; F.smokePuff(bk, f, CX - 22 + q * 6, CY + 10 - life * 40, 4 + life * 4, 100 + q + f, life > .7 ? (life - .7) * 2 : 0); }
    // Waist band (ribs of ceramic with glowing cracks) and a slanted shoulder band.
    const rib = (s, ff, x, y, u, a) => { const crack = ((Math.round(a * 30) + f) % 11) === 0; tone(s, ff, crack ? C.glow : C.kiln, x, y, crack ? .7 : (u < .35 ? .85 : .45) + (s === fr ? .1 : -.1)); };
    bandRing(bk, fr, f, CX, CY + 22, 34, 10, -4, 12, rib);
    bandRing(bk, fr, f, CX - 4, CY - 6, 26, 8, 10, 9, rib, Math.PI * .6, Math.PI * 2.1);
    // The kiln body: a squat ceramic oven hanging at the back hip (domed top, ribs, glowing cracks).
    { const kx = CX - 36; const ky = CY + 18; for (let y = -16; y <= 14; y++) for (let x = -14; x <= 14; x++) { const top = y < -6 ? Math.hypot(x / 14, (y + 6) / 10) : Math.abs(x) / 14; if (top > 1) continue; tone(fr, f, C.kiln, kx + x, ky + y, .78 - (x + 14) / 50 - (y + 16) / 80); }
      for (let y = -12; y <= 12; y += 5) for (let x = -12; x <= 12; x++) if (Math.abs(x) <= 13 - Math.max(0, -y - 6)) tone(fr, f, C.kiln, kx + x, ky + y, .25);
      for (let k = 0; k < 8; k++) tone(fr, f, C.glow, kx - 6 + k * 1.5, ky - 10 + k * 2.5, (k + f) % 3 ? .8 : 1); }
    // Ribs crossing the waist band (vertical slats).
    for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + .3; const s = Math.sin(a) < 0 ? bk : fr; const x = CX + Math.cos(a) * 30; const y0 = CY + 22 + Math.sin(a) * 9 - Math.cos(a) * 4; for (let y = -6; y <= 6; y++) tone(s, f, C.kiln, x, y0 + y, .3); }
    // The kiln mouth at the left (back) hip: a glowing oval opening with flames licking out.
    const mx = CX - 36; const my = CY + 22;
    for (let y = -8; y <= 8; y++) for (let x = -7; x <= 7; x++) { const d = (x / 7) ** 2 + (y / 8) ** 2; if (d <= 1) tone(fr, f, d > .7 ? C.kiln : C.glow, mx + x, my + y, d > .7 ? .2 : .95 - d * .5); }
    F.flame(fr, f, mx - 2, my - 2, 14 + (f % 3) * 3, 7, { dir: -Math.PI / 2 - .6, lean: -2, ph: ph * TAU * 2 });
    for (let q = 0; q < 5; q++) { const rr = rng(140 + q); const life = (ph + rr()) % 1; tone(fr, f, C.glow, mx - 6 + rr() * 12, my - 12 - life * 30, .9); }
    B.selOutline(bk, f, C.out); B.selOutline(fr, f, C.out);
  }
  return [bk, fr];
}
function t04() {
  const [bk, fr] = pair('T04', 6);
  for (let f = 0; f < 6; f++) {
    const sway = Math.sin(f / 6 * TAU) * .06;
    // Two fan sails pivoting near the shoulders (one each side), lamellae radiating, a teal rim.
    for (const side of [-1, 1]) {
      const px = CX + side * 10; const py = CY - 8; const s = side < 0 ? bk : fr;
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + side * (.25 + i * .19) + sway * side; const L = 54 + (i % 2) * 6 - Math.abs(i - 3.5) * 2;
        // Membrane wedge toward the next lamella (translucent coral, opaque pixels).
        if (i < 7) for (let r = 8; r < L - 4; r++) for (let u = 0; u <= 1; u += .08) { const aa = a + side * .19 * u; tone(s, f, C.coral, px + Math.cos(aa) * r, py + Math.sin(aa) * r, .35 + r / L * .25); }
        B.stroke(s, f, [[px, py], [px + Math.cos(a) * L * .5, py + Math.sin(a) * L * .5], [px + Math.cos(a) * L, py + Math.sin(a) * L]], { max: 7, swell: .6, ramp: C.coral, seed: 200 + i * 3 + side, dry: .1, headBias: .7, light: [-.6, -.8] });
        // Coral polyps along each lamella.
        for (let k = 3; k < L; k += 7) tone(s, f, C.coral, px + Math.cos(a) * k, py + Math.sin(a) * k, .95);
      }
      // Teal web between the lamellae tips (the sail membrane edge).
      for (let i = 0; i < 7; i++) { const a0 = -Math.PI / 2 + side * (.25 + i * .19) + sway * side; const a1 = a0 + side * .19; const L = 54; for (let u = 0; u <= 1; u += .05) { const a = a0 + (a1 - a0) * u; tone(s, f, C.teal, px + Math.cos(a) * L, py + Math.sin(a) * L, .8); } }
    }
    B.selOutline(bk, f, C.out); B.selOutline(fr, f, C.out);
  }
  return [bk, fr];
}
// Fill a convex polygon; fn(x, y) paints one pixel.
function fillPoly(pts, fn) {
  const ys = pts.map((q) => q[1]); const xs = pts.map((q) => q[0]); const n = pts.length;
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
    let c = false; for (let m = 0, k = n - 1; m < n; k = m++) { const [xi, yi] = pts[m]; const [xj, yj] = pts[k]; if ((yi > y + .5) !== (yj > y + .5) && x + .5 < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi) c = !c; }
    if (c) fn(x, y);
  }
}
function t05() {
  const [bk, fr] = pair('T05', 6);
  for (let f = 0; f < 6; f++) {
    const ph = f / 6;
    // Three crystal fins rooted at the shoulder blades, fanning up and back like a broken wing. Each fin is a
    // faceted blade (lit leading facet, dark trailing facet) cracked into three shards that drift apart slightly,
    // held together by glowing pink seams across the breaks. The third, smallest fin sits at the front shoulder.
    const fins = [[-10, 4, -2.6, 60, 24, bk], [-6, 0, -2.1, 68, 26, bk], [6, 2, -1.5, 44, 17, fr]];
    fins.forEach(([ox, oy, a, L, W, sh], i) => {
      const bob = Math.sin(ph * TAU + i * 2.1); const rx = CX + ox; const ry = CY + oy;
      const dx = Math.cos(a); const dy = Math.sin(a); const nx = -dy; const ny = dx;
      const side = a < -Math.PI / 2 ? -1 : 1; // the trailing edge sweeps away from the body
      const at = (u, w, drift) => [rx + dx * (L * u + drift) + nx * w * side, ry + dy * (L * u + drift) + ny * w * side + drift * .3 * bob];
      const cuts = [0, .36, .7, 1]; const prof = (u) => W * (u < .45 ? .55 + u : 1 - (u - .45) * 1.5);
      for (let k = 0; k < 3; k++) {
        const u0 = cuts[k] + (k ? .03 : 0); const u1 = cuts[k + 1] - (k < 2 ? .03 : 0); const drift = k * (2.5 + bob);
        const lead0 = at(u0, 0, drift); const lead1 = at(u1, 0, drift); const tr0 = at(u0 + .05, prof(u0), drift); const tr1 = at(u1 - .05, prof(u1), drift);
        const mid0 = at(u0, prof(u0) * .45, drift); const mid1 = at(u1, prof(u1) * .45, drift);
        fillPoly([lead0, lead1, mid1, mid0], (x, y) => tone(sh, f, C.fin, x, y, .78 - k * .04));
        fillPoly([mid0, mid1, tr1, tr0], (x, y) => tone(sh, f, C.fin, x, y, .42 - k * .04));
        // Facet ridge and a bright leading edge.
        B.stroke(sh, f, [lead0, lead1], { max: 2, ramp: C.fin, light: [-.6, -.8] });
        for (let u = 0; u <= 1; u += .04) tone(sh, f, C.fin, mid0[0] + (mid1[0] - mid0[0]) * u, mid0[1] + (mid1[1] - mid0[1]) * u, .9);
        // Glowing seam across the break above this shard.
        if (k < 2) { const c0 = at(cuts[k + 1], 0, drift + 1.5); const c1 = at(cuts[k + 1], prof(cuts[k + 1]) * .9, drift + 1.5); for (let u = 0; u <= 1; u += .07) { const jx = (Math.floor(u * 14) % 2) * 1.2; tone(sh, f, C.pink, c0[0] + (c1[0] - c0[0]) * u + jx, c0[1] + (c1[1] - c0[1]) * u, (Math.floor(u * 8) + f) % 3 ? .75 : 1); } }
      }
      // Root socket: a small violet knot where the fin leaves the shoulder.
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) tone(sh, f, C.fin, rx + x, ry + y, .3 + (x < 0 ? .15 : 0));
      tone(sh, f, C.pink, rx, ry, 1);
    });
    // Gravity motes falling UPWARD past the fins, plus a few loose crystal chips.
    for (let q = 0; q < 8; q++) { const rr = rng(300 + q); const life = (ph + rr()) % 1; const x = CX - 34 + rr() * 52; const y = CY + 20 - life * 70; tone(bk, f, q % 3 ? C.fin : C.pink, x, y, .95); if (q % 3 === 0) { tone(bk, f, C.fin, x + 1, y, .7); tone(bk, f, C.fin, x, y + 1, .5); } }
    B.selOutline(bk, f, C.out); B.selOutline(fr, f, C.out);
  }
  return [bk, fr];
}
function t06() {
  const [bk, fr] = pair('T06', 8);
  for (let f = 0; f < 8; f++) {
    const ph = f / 8 * TAU;
    // The spindle: a tall dark axis behind the back with copper collars and lime ion nodes pulsing up it.
    const sx = CX - 18;
    for (let y = CY - 52; y <= CY + 38; y++) for (let x = -3; x <= 3; x++) tone(bk, f, C.coil, sx + x, y, x < -1 ? .85 : x < 1 ? .55 : .3);
    for (const cy of [CY - 40, CY - 8, CY + 24]) for (let y = -3; y <= 3; y++) for (let x = -7; x <= 7; x++) tone(bk, f, (y + 3) % 3 === 0 ? C.coil : C.copper, sx + x, cy + y, (x < -2 ? .85 : x < 2 ? .6 : .35) + (y === -3 ? .1 : 0));
    for (let k = 0; k < 3; k++) { const y = CY + 36 - ((f * 11 + k * 30) % 90); for (let d = -2; d <= 2; d++) tone(bk, f, C.ion, sx + d, y, Math.abs(d) < 2 ? 1 : .8); for (let d = -1; d <= 1; d++) { tone(bk, f, C.ion, sx + d, y - 1, .85); tone(bk, f, C.ion, sx + d, y + 1, .85); } }
    for (let y = -8; y <= 0; y++) for (let x = -Math.max(0, 4 + y * .5); x <= Math.max(0, 4 + y * .5); x++) tone(bk, f, C.ion, sx + x, CY - 53 + y, .7 + (x < 0 ? .2 : 0));
    // Three coils on wide tilted orbits round the spindle level (hip, chest, crown) so they frame the body.
    const orbits = [[CY + 22, 44, .5], [CY - 2, 46, -.5], [CY - 30, 36, .35]];
    const coils = orbits.map(([oy, r, tilt], i) => { const a = ph * (i % 2 ? -1 : 1) + i * 2.1; return { x: CX - 6 + Math.cos(a) * r, y: oy + Math.sin(a) * r * .28 + Math.cos(a) * tilt * 10, back: Math.sin(a) < 0, a }; });
    // Coils: a spindle-shaped winding (thick middle, tapered ends), copper bands over a dark core, lime caps.
    // They always pass BEHIND the body (never cover the chest); the near half of the orbit is just brighter.
    for (const c of coils) {
      const s = bk;
      for (let y = -12; y <= 12; y++) { const w = Math.round(7 - Math.abs(y) * .3); for (let x = -w; x <= w; x++) tone(s, f, (y + 12) % 3 === 0 ? C.coil : C.copper, c.x + x, c.y + y, (x < -2 ? .9 : x < 2 ? .62 : .38) + (c.back ? -.15 : 0)); }
      for (const e of [-14, 14]) for (let y = -1; y <= 1; y++) for (let x = -2 + Math.abs(y); x <= 2 - Math.abs(y); x++) tone(s, f, C.ion, c.x + x, c.y + e + y, 1);
    }
    // Arcs from each coil to the spindle and to the next coil: thin zigzags with a white core pixel at the kinks.
    const arc = (a, b, seed, sh) => { const r = rng(seed); let px = a[0]; let py = a[1]; const n = 7; for (let j = 1; j <= n; j++) { const off = (j % 2 ? 1 : -1) * (2 + r() * 4); const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const nx = a[0] + (b[0] - a[0]) * j / n + (j < n ? -(b[1] - a[1]) / L * off : 0); const ny = a[1] + (b[1] - a[1]) * j / n + (j < n ? (b[0] - a[0]) / L * off : 0); const st = Math.ceil(Math.hypot(nx - px, ny - py)); for (let t = 0; t <= st; t++) tone(sh, f, C.ion, px + (nx - px) * t / st, py + (ny - py) * t / st, .85); if (j < n) tone(sh, f, C.ion, nx, ny, 1); px = nx; py = ny; } };
    coils.forEach((c, i) => { if (c.back && (f + i) % 2 === 0) arc([c.x, c.y], [sx, orbits[i][0]], 500 + i * 7 + f, bk); });
    for (let k = 0; k < 2; k++) { const a = coils[k]; const b = coils[k + 1]; if ((f + k) % 3 === 2) continue; arc([a.x, a.y - 14 * Math.sign(a.y - b.y || 1)], [b.x, b.y], 400 + k + f * 3, bk); }
    B.selOutline(bk, f, C.out); B.selOutline(fr, f, C.out);
  }
  return [bk, fr];
}
module.exports = { arcane1Sheets: () => [...t02(), ...t04(), ...t05(), ...t06()] };
