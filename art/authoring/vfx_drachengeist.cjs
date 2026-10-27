// GRIMGE — A11 DRACHENGEIST fire aura (user, 27 Oct 2026, after example sprite 20: a horned dragon spirit behind
// the hero with a fire aura; own design). The dragon itself is the dragon kit (vfx_dragon.cjs) drawn at the sockets
// by arcane_drachengeist.js; these sheets add the aura (128×128, chest at the centre, facing right):
//   as_A11_back   8-frame loop: tall flame tongues rising behind the body, hotter at the base, sparks above.
//   as_A11_front  8-frame loop: embers drifting at the sides only (never over the body).
const B = require('./vfx_brush.cjs');
const F = require('./vfx_fire.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const ember = B.pal({ r: ['#8a1a00', '#ff5a1f', '#ffd27a', '#fff3c4'] }).r;
const tone = (s, f, r, x, y, v) => s.set(f, x, y, r[Math.round(clamp01(v) * (r.length - 1))]);

function aura() {
  const bk = new Sheet('as_A11_back', 128, 128, 8, { anchor: 'center' }); const fr = new Sheet('as_A11_front', 128, 128, 8, { anchor: 'center' });
  const CX = 64; const CY = 64;
  for (let f = 0; f < 8; f++) {
    const ph = f / 8;
    // Flame tongues behind the body: a ring of bases around the silhouette, leaning outward, phases staggered.
    // Each tongue starts inside the previous one so the aura reads as one connected blaze (no cut-off bases).
    const bases = [];
    for (const side of [-1, 1]) for (let i = 0; i < 7; i++) { const u = i / 6; bases.push([side * (20 + Math.sin(u * Math.PI) * 8), 60 - u * 84, side * (.18 + u * .2), 30 + (1 - u) * 22]); }
    bases.push([0, -28, 0, 26], [-8, -24, -.1, 22], [8, -24, .1, 22]);
    bases.forEach(([ox, oy, lean, h], i) => { const flick = Math.sin((ph + i * .37) * TAU) * .2; F.flame(bk, f, CX + ox, CY + oy + 10, h * (1 + flick), 16 + (i % 3) * 3, { dir: -Math.PI / 2 + lean, lean: lean * 8, ph: (ph * 2 + i * .3) * TAU, cool: .04 + (i % 4) * .04 }); });
    // Sparks rising above the flames.
    for (let q = 0; q < 8; q++) { const r = rng(60 + q); const life = (ph + r()) % 1; tone(bk, f, ember, CX - 30 + r() * 60, CY - 20 - life * 40, 1 - life * .5); }
    B.selOutline(bk, f, B.pal({ o: '#1a0400' }).o);
    for (const sx of [CX - 40, CX + 38]) { const r = rng(120 + f + sx); for (let q = 0; q < 3; q++) { const life = (ph + r()) % 1; const x = sx + (r() - .5) * 10; const y = CY + 30 - life * 70; tone(fr, f, ember, x, y, 1 - life * .4); } }
  }
  return [bk, fr];
}
module.exports = { drachengeistSheets: () => [...aura()] };
