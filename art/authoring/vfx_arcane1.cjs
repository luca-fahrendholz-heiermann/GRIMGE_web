// GRIMGE — Arcane States, round 1 (hand-drawn quality; vfx_brush.cjs; final density). Manifestations drawn
// around the hero: every sheet is 128×128 with the hero's CHEST at (64, 64), facing right; each has a back
// layer (behind the sprite) and a front layer (before it). Own designs from the forms' silhouettes.
//   as_T02_back / _front  Schlackenkern — a ceramic kiln strapped to the back (rib bands round waist and shoulder as
//                         straps), glowing cracks, a chimney over the shoulder smoking, the kiln mouth burning backward.
//   as_T04_back / _front  Korallenschild — two fan-shaped protective sails of coral lamellae at the sides.
//   as_T05_back / _front  Bruchflug — three faceted crystal fins fanning from the shoulder blades, each cracked into
//                         drifting shards held together by glowing pink seams; gravity motes rising.
//   as_T06_back / _front  Ionspindel — armour form: the sprite itself becomes navy plate with gold trims
//                         (form_recolors.js); behind it a gold spindle crescent with three emerald orbs and crisp green
//                         zigzag lightning climbing beside the body.
//   as_T13_back / _front  Fadenschlag — Fadenharfe: curved steel blade-legs fan from the shoulder blades (one small at the
//                         front shoulder), silk strung between them like a harp with rose glints running along.
//   silk_anchor           T13 swing anchor: a hook kunai biting into the air, silk tied to its ring (4 frames, 32×48).
//   silk_web              T13 Seidennetz: a ground web of silk threads pinned by six kunai (6 frames, 288×96).
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
    // Waist band (ribs of ceramic with glowing cracks) and a slanted shoulder band — the straps of the back oven.
    const rib = (s, ff, x, y, u, a) => { const crack = ((Math.round(a * 30) + f) % 11) === 0; tone(s, ff, crack ? C.glow : C.kiln, x, y, crack ? .7 : (u < .35 ? .85 : .45) + (s === fr ? .1 : -.1)); };
    bandRing(bk, fr, f, CX, CY + 22, 34, 10, -4, 12, rib);
    bandRing(bk, fr, f, CX - 4, CY - 6, 26, 8, 10, 9, rib, Math.PI * .6, Math.PI * 2.1);
    for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + .3; const s = Math.sin(a) < 0 ? bk : fr; const x = CX + Math.cos(a) * 30; const y0 = CY + 22 + Math.sin(a) * 9 - Math.cos(a) * 4; for (let y = -6; y <= 6; y++) tone(s, f, C.kiln, x, y0 + y, .3); }
    // The back oven: a domed ceramic kiln strapped to the back (behind the sprite), ribbed, with glowing cracks.
    const kx = CX - 27; const ky = CY + 2;
    for (let y = -22; y <= 22; y++) for (let x = -18; x <= 18; x++) { const dome = y < -8 ? Math.hypot(x / 18, (y + 8) / 14) : Math.abs(x) / (18 - Math.max(0, y - 16) * .9); if (dome > 1) continue; tone(bk, f, C.kiln, kx + x, ky + y, .82 - (x + 18) / 60 - (y + 22) / 95); }
    for (let y = -16; y <= 20; y += 6) for (let x = -17; x <= 17; x++) if (Math.abs(x) <= 17 - Math.max(0, -y - 8)) tone(bk, f, C.kiln, kx + x, ky + y, .22);
    for (let k = 0; k < 10; k++) tone(bk, f, C.glow, kx - 8 + k * 1.4 + (k % 2), ky - 12 + k * 2.6, (k + f) % 3 ? .8 : 1);
    // Chimney rising behind the shoulder: a tapering ceramic stack with an iron cap, smoke and embers from its top.
    const cx0 = kx + 2;
    for (let y = 0; y < 30; y++) { const w = 4 - Math.floor(y / 12); for (let x = -w; x <= w; x++) tone(bk, f, (y % 7 === 0) ? C.kiln : C.kiln, cx0 + x, ky - 20 - y, (x < 0 ? .75 : .4) + (y % 7 === 0 ? -.2 : 0)); }
    for (let x = -5; x <= 5; x++) for (let y = 0; y < 2; y++) tone(bk, f, C.kiln, cx0 + x, ky - 50 - y, x < 0 ? .6 : .3);
    for (let x = -2; x <= 2; x++) tone(bk, f, C.glow, cx0 + x, ky - 52, .85);
    for (let q = 0; q < 3; q++) { const life = (ph + q / 3) % 1; F.smokePuff(bk, f, cx0 - life * 10, ky - 56 - life * 22, 3 + life * 5, 100 + q + f, life > .7 ? (life - .7) * 2 : 0); }
    for (let q = 0; q < 5; q++) { const rr = rng(140 + q); const life = (ph + rr()) % 1; tone(bk, f, C.glow, cx0 - 4 + rr() * 8 - life * 6, ky - 54 - life * 24, .9); }
    // The kiln mouth on the back side, glowing, flames licking backward out of it.
    const mx = kx - 15; const my = ky + 8;
    for (let y = -7; y <= 7; y++) for (let x = -5; x <= 5; x++) { const d = (x / 5) ** 2 + (y / 7) ** 2; if (d <= 1) tone(bk, f, d > .65 ? C.kiln : C.glow, mx + x, my + y, d > .65 ? .15 : .95 - d * .5); }
    F.flame(bk, f, mx - 3, my + 2, 12 + (f % 3) * 3, 6, { dir: -Math.PI / 2 - .9, lean: -3, ph: ph * TAU * 2 });
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
    const fins = [[-10, 4, -2.6, 60, 24, bk], [-6, 0, -2.1, 68, 26, bk], [6, 2, -1.5, 44, 17, bk]];
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
// Ionspindel armour attachments (the plate itself is the recoloured sprite, form_recolors.js).
const IO = { gold: ramp('#4a3010', '#8a6020', '#c89a3e', '#ecc96a', '#fff2c0'), em: ramp('#0a2a18', '#127a40', '#2fd070', '#a8ffc8', '#ffffff'), bolt: ramp('#0e3a20', '#2fae5a', '#7af0a0', '#e0ffe8') };
function t06() {
  const [bk, fr] = pair('T06', 8);
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    // The spindle crescent: a gold blade-arc behind the back, from above the shoulder down to the hip, spiked on its
    // outer edge, with three emerald orbs in gold bezels (top, middle, bottom).
    const ccx = CX + 2; const ccy = CY + 2; const R = 36; const a0 = Math.PI * .62; const a1 = Math.PI * 1.42;
    for (let a = a0; a <= a1; a += .004) {
      const u = (a - a0) / (a1 - a0); const w = 2 + 5 * Math.sin(Math.PI * u);
      for (let d = -w; d <= w; d += .5) tone(bk, f, IO.gold, ccx + Math.cos(a) * (R + d), ccy - Math.sin(a) * (R + d) * .95, d > w * .4 ? .95 : d > -w * .3 ? .62 : .32);
    }
    for (const u of [.28, .5, .72]) { const a = a0 + (a1 - a0) * u; for (let k = 0; k < 7; k++) for (let e = -(3 - k * .4); e <= 3 - k * .4; e += .5) { const aa = a + e * .012; tone(bk, f, IO.gold, ccx + Math.cos(aa) * (R + 7 + k), ccy - Math.sin(aa) * (R + 7 + k) * .95, .78); } }
    const orb = (u, r) => { const a = a0 + (a1 - a0) * u; const ox = ccx + Math.cos(a) * R; const oy = ccy - Math.sin(a) * R * .95; for (let y = -r - 2; y <= r + 2; y++) for (let x = -r - 2; x <= r + 2; x++) { const dd = Math.hypot(x, y); if (dd > r + 2) continue; if (dd > r) tone(bk, f, IO.gold, ox + x, oy + y, y < 0 ? .9 : .5); else tone(bk, f, IO.em, ox + x, oy + y, (x < 0 && y < 0 ? .75 : .45) + ((f + Math.round(u * 8)) % 4 === 0 ? .15 : 0)); } tone(bk, f, IO.em, ox - Math.round(r / 2), oy - Math.round(r / 2), 1); };
    orb(0, 5); orb(.5, 4); orb(1, 5);
    // Green lightning: crisp zigzag bolts climbing beside the body (behind it), re-jagged every frame, with barbs.
    const bolt = (x0, seed, H) => { const r = rng(seed + f * 31); let x = x0; let y = CY + 52; const st = 9; let side = r() < .5 ? -1 : 1;
      while (y > CY + 52 - H) { const nx = x + side * (2 + r() * 5); const ny = y - (6 + r() * 7); const n = Math.ceil(Math.hypot(nx - x, ny - y)); for (let i = 0; i <= n; i++) { const xx = x + (nx - x) * i / n; const yy = y + (ny - y) * i / n; tone(bk, f, IO.bolt, xx, yy, .6); tone(bk, f, IO.bolt, xx + 1, yy, .95); } tone(bk, f, IO.bolt, nx - side * 2, ny + 1, .6); tone(bk, f, IO.bolt, nx - side * 3, ny + 2, .5); x = nx; y = ny; side = -side; } };
    bolt(CX - 36, 700, 96); bolt(CX + 32, 720, 88); if (f % 2 === 0) bolt(CX - 22, 740, 60); if (f % 3 !== 1) bolt(CX + 20, 760, 54);
    B.selOutline(bk, f, C.out);
    // A few loose sparks on the front layer only at the sides (never over the body).
    for (const sx of [CX - 40, CX + 38]) { const rr = rng(780 + f + sx); for (let q = 0; q < 2; q++) { const x = sx + (rr() - .5) * 10; const y = CY - 30 + rr() * 70; tone(fr, f, IO.bolt, x, y, 1); tone(fr, f, IO.bolt, x + 1, y + 1, .7); } }
  }
  return [bk, fr];
}
// A curved steel blade-leg along a quadratic curve (root → ctrl → tip): tapering, lit edge, plum wraps, rose tip.
function bladeLeg(sh, f, P0, P1, P2, w0) {
  const at = (u) => [(1 - u) ** 2 * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0], (1 - u) ** 2 * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1]];
  const n = 140;
  for (let i = 0; i <= n; i++) {
    const u = i / n; const [x, y] = at(u); const [x2, y2] = at(Math.min(1, u + .01)); const L = Math.hypot(x2 - x, y2 - y) || 1; const nx = -(y2 - y) / L; const ny = (x2 - x) / L;
    const w = w0 * (1 - u) ** .8 + .3; const wrap = Math.abs(u - .22) < .03 || Math.abs(u - .5) < .025;
    for (let d = -w; d <= w; d += .5) tone(sh, f, wrap ? S.wood : S.steel, x + nx * d, y + ny * d, wrap ? (d < 0 ? .8 : .45) : d < -w * .3 ? .95 : d < w * .3 ? .62 : .36);
    // Saw teeth along the inner edge (every few px between the wraps and the tip).
    if (u > .28 && u < .9 && i % 9 === 0) for (let k = 0; k < 3; k++) for (let e = -(2 - k) * .5; e <= (2 - k) * .5; e += .5) tone(sh, f, S.steel, x + nx * (w + k + .5) + (x2 - x) / L * e, y + ny * (w + k + .5) + (y2 - y) / L * e, .55);
  }
  const [tx, ty] = at(1); for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (Math.abs(x) + Math.abs(y) <= 2) tone(sh, f, S.rose, tx + x, ty + y, Math.abs(x) + Math.abs(y) ? .55 : .95);
  return { tip: at(1), mid: at(.55) };
}
// A taut silk string with a glint travelling along it.
function silkString(sh, f, A, Bp, ph) {
  const n = Math.max(1, Math.ceil(Math.hypot(Bp[0] - A[0], Bp[1] - A[1])));
  for (let i = 0; i <= n; i++) { const u = i / n; tone(sh, f, S.silk, A[0] + (Bp[0] - A[0]) * u, A[1] + (Bp[1] - A[1]) * u, .62); }
  const g = ph % 1; for (let k = -2; k <= 2; k++) { const u = clamp01(g + k / n); tone(sh, f, k ? S.rose : S.silk, A[0] + (Bp[0] - A[0]) * u, A[1] + (Bp[1] - A[1]) * u, k ? .7 : 1); }
}
function t13() {
  const [bk, fr] = pair('T13', 6);
  for (let f = 0; f < 6; f++) {
    const ph = f / 6; const sw = (i) => Math.round(Math.sin(ph * TAU + i * 1.7) * 2);
    // Three blade-legs fanning back from the shoulder blades (like a harp frame), one smaller at the front shoulder.
    const A = bladeLeg(bk, f, [CX - 8, CY - 8], [CX - 46, CY - 32], [CX - 34 + sw(0), CY - 62], 4);
    const Bl = bladeLeg(bk, f, [CX - 10, CY - 2], [CX - 56, CY - 2], [CX - 60, CY - 34 + sw(1)], 3.6);
    const Cl = bladeLeg(bk, f, [CX - 10, CY + 6], [CX - 46, CY + 28], [CX - 62 + sw(2), CY + 4], 3.2);
    const D = bladeLeg(bk, f, [CX + 6, CY - 12], [CX + 30, CY - 34], [CX + 16, CY - 56 + sw(3)], 2.4);
    // Silk strung like a harp: from a knot at the back to every tip, between the tips, and over the head to the front leg.
    const K = [CX - 7, CY - 5];
    [[K, A.tip], [K, Bl.tip], [K, Cl.tip], [K, A.mid], [K, Bl.mid], [A.tip, Bl.tip], [Bl.tip, Cl.tip], [A.tip, D.tip]].forEach(([p0, p1], i) => silkString(bk, f, p0, p1, ph + i * .29));
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4) tone(bk, f, S.rose, K[0] + x, K[1] + y, .8);
    // Loose silk ends drifting off the tips.
    for (const [tx, ty] of [A.tip, Bl.tip, Cl.tip]) for (let j = 0; j < 10; j++) tone(bk, f, S.silk, tx - j, ty + 2 + Math.round(Math.sin(j * .6 + ph * TAU * 2) * 2), .7 - j * .03);
    B.selOutline(bk, f, C.out); B.selOutline(fr, f, C.out);
  }
  return [bk, fr];
}
// A 2-px pixel line (the brush outline later gives it the dark contour).
function pline(sh, f, x0, y0, x1, y1, paint) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) { const u = i / n; paint(sh, f, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, u, i); } }
// T13 Fadenschlag palette: plum spool wood, peach silk, rose glints, needle steel.
const S = {
  wood: ramp('#1c1420', '#3a2430', '#6a3a3a', '#9a5a48'), silk: ramp('#5a2a3a', '#ff7a3d', '#ffd0a8', '#fff4ea'),
  rose: ramp('#7a1030', '#ff3d6e', '#ffc0d0'), steel: ramp('#2a2c34', '#6a6e7a', '#b8bcc8', '#f2f4f8')
};
// A hook kunai: leaf blade pointing at angle ang from its ring at (x, y), length L, a barb on one side.
function kunai(sh, f, x, y, ang, L) {
  const dx = Math.cos(ang); const dy = Math.sin(ang); const nx = -dy; const ny = dx;
  for (let u = 4; u <= L; u += .5) { const t = (u - 4) / (L - 4); const w = Math.max(.5, 4.4 * Math.sin(Math.PI * Math.min(1, t * 1.25 + .1)) * (1 - t * .3)); for (let d = -w; d <= w; d += .5) tone(sh, f, S.steel, x + dx * u + nx * d, y + dy * u + ny * d, (d < -.5 ? .95 : d < .5 ? .7 : .4) - t * .1); }
  for (let u = 4; u <= L - 2; u += .5) tone(sh, f, S.steel, x + dx * u, y + dy * u, .25); // the fuller (blood groove)
  for (let k = 0; k < 6; k++) for (let e = -.5; e <= .5; e += .5) tone(sh, f, S.steel, x + dx * (L * .4 - k * .9 + e) + nx * (4 + k), y + dy * (L * .4 - k * .9 + e) + ny * (4 + k), .75 - k * .05); // barb
  for (let u = 1; u < 4; u += .5) for (let d = -1.5; d <= 1.5; d += .5) tone(sh, f, S.wood, x + dx * u + nx * d, y + dy * u + ny * d, .7); // wrapped grip
  for (let a = 0; a < TAU; a += .2) tone(sh, f, S.rose, x + Math.cos(a) * 2, y + Math.sin(a) * 2, .75); // the ring the silk ties to
}
// T13 swing anchor: a hook kunai biting into the air, blade up, the silk tied to its ring at the centre,
// a rose tassel fluttering below and a bite spark round the tip on the first frames.
function silkAnchor() {
  const s = new Sheet('silk_anchor', 32, 48, 4, { anchor: 'center' }); const cx = 16; const cy = 24;
  for (let f = 0; f < 4; f++) {
    kunai(s, f, cx, cy, -Math.PI / 2 + .12, 19);
    for (let k = 0; k < 2; k++) for (let j = 0; j < 9; j++) tone(s, f, S.rose, cx - 1 + k * 2 + Math.round(Math.sin(j * .5 + f * 1.4 + k * 2) * (j / 5)), cy + 3 + j, .6);
    if (f < 2) { const tx = cx + Math.cos(-Math.PI / 2 + .12) * 19; const ty = cy + Math.sin(-Math.PI / 2 + .12) * 19; for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .4; for (let r = 2; r < 4 + f; r++) tone(s, f, S.silk, tx + Math.cos(a) * r, ty + Math.sin(a) * r, .95); } }
    B.selOutline(s, f, C.out);
  }
  return s;
}
// T13 Seidennetz: a web of silk threads pinned by six kunai stuck in the ground, rose knots at the crossings, a pulse running out.
function silkWeb() {
  const W = 288; const H = 96; const s = new Sheet('silk_web', W, H, 6, { anchor: 'center' }); const cx = W / 2; const cy = H / 2; const R = 136; const k = .32;
  const at = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r * k];
  const A = Array.from({ length: 6 }, (_, i) => i / 6 * TAU + .26); const rings = [46, 92, R];
  const silk = (sh, f, x, y) => tone(sh, f, S.silk, x, y, .62);
  for (let f = 0; f < 6; f++) {
    for (const a of A) pline(s, f, cx, cy, ...at(a, R), silk);
    for (const r of rings) for (let i = 0; i < 6; i++) { const p0 = at(A[i], r); const p1 = at(A[(i + 1) % 6], r); const m = at((A[i] + A[(i + 1) % 6] + (i === 5 ? TAU : 0)) / 2, r * .9); pline(s, f, ...p0, ...m, silk); pline(s, f, ...m, ...p1, silk); }
    // Rose knots where the rings cross the radials.
    for (const a of A) for (const r of rings.slice(0, 2)) { const [x, y] = at(a, r); for (let d = -1; d <= 1; d++) { tone(s, f, S.rose, x + d, y, .6); tone(s, f, S.rose, x, y + d, .6); } }
    // A bright pulse running out along each radial, and the six pinning needles at the rim.
    A.forEach((a, i) => { const u = (f / 6 + i * .37) % 1; const [x, y] = at(a, R * u); for (let d = -1; d <= 1; d++) { tone(s, f, S.silk, x + d, y, 1); tone(s, f, S.silk, x, y + d, 1); }
      const [px, py] = at(a, R); kunai(s, f, px, py - 14, Math.PI / 2, 15); });
    for (let y = -3; y <= 3; y++) for (let x = -(3 - Math.abs(y)); x <= 3 - Math.abs(y); x++) tone(s, f, S.rose, cx + x, cy + y, f % 2 ? .95 : .7);
    B.selOutline(s, f, C.out);
  }
  return s;
}
module.exports = { arcane1Sheets: () => [...t02(), ...t04(), ...t05(), ...t06(), ...t13(), silkAnchor(), silkWeb()] };
