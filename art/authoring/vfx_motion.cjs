// GRIMGE — motion key moments for the parts-rig animations (AGENDA 1 stage 2, "gezeichnete Schlüsselmomente"; user,
// 10 Nov 2026, plus the animation-tips video: anticipation, follow-through, a fading trail). Own designs, drawn with
// vfx_brush.cjs at final density, in a dusty earth palette (not tinted at runtime).
//   mv_dust_kick   6 frames, 64×28 (base, faces right = the dust flies backward to the left): the sprint start kicks up
//                  a rolling cloud behind the heel, pebbles flung back, the cloud thins out and settles
//   mv_dust_land   6 frames, 80×24 (base): a landing pushes two puffs out sideways from under the feet, low and flat,
//                  that roll outward and break up
const B = require('./vfx_brush.cjs');
const { Sheet, rng, clamp01 } = B;
const DUST = B.pal({ r: ['#5a4a3a', '#86705a', '#ab957b', '#cfbea4', '#ece0cc'] }).r; const OUT = B.pal({ o: '#2e241c' }).o;

// A cloud made of a few lumpy blobs; `thin` (0..1) dissolves it the pixel-art way: each blob shrinks, lifts and splits
// into two smaller puffs (no dither noise on the silhouette).
function cloud(s, f, blobs, thin, seed) {
  if (thin > 0) blobs = blobs.flatMap(([cx, cy, r], i) => { const k = 1 - thin * .62; const sp = r * thin * .9; return [[cx - sp, cy - thin * 3, r * k * .8], [cx + sp, cy - thin * 4 - (i % 2), r * k * .62]]; }).filter((b) => b[2] >= 1.4);
  const masks = blobs.map(([cx, cy, r], i) => B.noisyBlob(cx, cy, r, seed + i * 7, .22, .72));
  const inside = (x, y) => masks.some((m) => m(x, y));
  const xs = blobs.map((b) => b[0]); const ys = blobs.map((b) => b[1]); const R = Math.max(...blobs.map((b) => b[2])) + 3;
  B.volume(s, f, Math.min(...xs) - R, Math.min(...ys) - R, Math.max(...xs) + R, Math.max(...ys) + R, inside, DUST, { reach: 6, light: [-.4, -1] });
}

function dustKick() {
  const W = 64; const H = 28; const s = new Sheet('mv_dust_kick', W, H, 6, { anchor: 'base' });
  const by = H - 3; const r = rng(17);
  const pebbles = Array.from({ length: 7 }, () => ({ vx: -(10 + r() * 22), vy: -(6 + r() * 10), x: 44 + r() * 6 }));
  for (let f = 0; f < 6; f++) {
    const u = f / 5; const grow = .55 + u * .7; const drift = u * 18;
    // The heel point is at the right; the cloud rolls up and back (left) from it.
    const blobs = [
      [46 - drift * .4, by - 3 - u * 2, 5 * grow],
      [38 - drift * .8, by - 6 - u * 4, 7 * grow],
      [28 - drift, by - 4 - u * 3, 6 * grow],
      [20 - drift * 1.1, by - 2 - u, 4.5 * grow]
    ];
    cloud(s, f, blobs, clamp01((u - .45) * 1.4), 3 + f);
    // Flung pebbles on short arcs (gone by the end).
    if (f < 5) for (const p of pebbles) { const t = (f + 1) * .55; const x = p.x + p.vx * t; const y = by - 2 + p.vy * t + 9 * t * t; if (y < by) { s.set(f, Math.round(x), Math.round(y), DUST[1]); s.set(f, Math.round(x) + 1, Math.round(y), DUST[3]); } }
    // Ground scuff line under the cloud.
    if (f < 3) for (let x = 18 - drift; x < 52 - drift * .3; x++) if ((Math.floor(x) % 5) < 3 - f) s.set(f, Math.round(x), by, DUST[1]);
    B.selOutline(s, f, OUT, DUST[2]);
  }
  return s;
}

function dustLand() {
  const W = 80; const H = 24; const s = new Sheet('mv_dust_land', W, H, 6, { anchor: 'base' });
  const cx = W / 2; const by = H - 3;
  for (let f = 0; f < 6; f++) {
    const u = f / 5; const spread = 6 + u * 24; const grow = .6 + u * .55;
    const blobs = [];
    for (const side of [-1, 1]) {
      blobs.push([cx + side * spread, by - 3, 5.5 * grow]);
      blobs.push([cx + side * (spread - 7), by - 4 - u * 2, 4.5 * grow]);
      blobs.push([cx + side * (spread + 6), by - 2, 3.5 * grow]);
    }
    cloud(s, f, blobs, clamp01((u - .4) * 1.5), 11 + f);
    if (f < 3) for (let x = cx - spread - 8; x < cx + spread + 8; x++) if ((Math.floor(x) % 5) < 3 - f) s.set(f, Math.round(x), by, DUST[1]);
    B.selOutline(s, f, OUT, DUST[2]);
  }
  return s;
}

function motionSheets() { return [dustKick(), dustLand()]; }
module.exports = { motionSheets };
