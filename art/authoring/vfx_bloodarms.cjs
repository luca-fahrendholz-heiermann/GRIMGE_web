// GRIMGE — BLOOD WEAPONS, hand-drawn quality (user, 25 Oct 2026: the blood-pact weapon should look like the
// Tougen Anki blood rifle — a weapon made of blood, fused to the arm by blood strands; own design).
// All face right; the grip sits at (gx, gy) of the sheet so the runtime places it on the hand. The strands
// run from the grip back over the forearm (toward the left edge) and wrap it in bands.
//   blood_rifle  4 frames, 92×40: an assault rifle of glossy blood (stock, receiver, magazine, scope, barrel,
//                drips); frames 2-3 fire (muzzle flash, recoil).
//   blood_bow    4 frames, 48×72: a recurve bow of blood with a taut string, veins, drips; 2-3 drawn / loose.
//   blood_blade  4 frames, 80×40: a curved blade of blood with a serrated edge and a glowing vein; 2-3 flare.
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
const C = B.pal({ blood: ['#1a0004', '#3c000a', '#6a0612', '#9a0e1c', '#c8202a', '#ff4a44', '#ff9c90', '#ffe0da'], flash: ['#ff6a3a', '#ffc04a', '#fff3c0', '#ffffff'], out: '#0c0002' });
const tone = (s, f, x, y, v) => { const fv = clamp01(v) * (C.blood.length - 1); const lo = Math.floor(fv); s.set(f, x, y, C.blood[Math.min(C.blood.length - 1, lo + (B.dither(x, y, fv - lo) ? 1 : 0))]); };
const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
// A glossy blood part: polygon, dark underside, lit top, a specular streak along the top edge.
function part(s, f, pts, { lit = .7, dark = .25 } = {}) {
  const ys = pts.map((p) => p[1]); const xs = pts.map((p) => p[0]); const y0 = Math.min(...ys); const y1 = Math.max(...ys);
  for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
    if (!inPoly(pts, x + .5, y + .5)) continue; const u = (y - y0) / Math.max(1, y1 - y0);
    let v = lit + (dark - lit) * u; if (!inPoly(pts, x + .5, y - .5)) v = .92; if (!inPoly(pts, x + .5, y + 1.5)) v = .12;
    tone(s, f, x, y, v);
  }
}
const drip = (s, f, x, y, len) => { for (let k = 0; k < len; k++) tone(s, f, x, y + k, .55 - k / len * .3); tone(s, f, x, y + len, .35); tone(s, f, x + 1, y + len, .3); };
// Strands: blood veins from the grip back over the forearm, crossing it in wraps.
function strands(s, f, gx, gy, seed) {
  for (let k = 0; k < 5; k++) { const r = rng(seed + k); const pts = []; for (let t = 0; t <= 6; t++) { const u = t / 6; pts.push([gx - u * (gx - 2), gy + Math.sin(u * 7 + k * 1.9 + f * .6) * (3 + k % 2 * 2) + (r() - .5) * 2]); } B.stroke(s, f, pts, { max: 2.4 - (k % 2) * .6, swell: .4, ramp: [C.blood[2], C.blood[4], C.blood[5], C.blood[6]], seed: seed + 10 + k, dry: .25, headBias: .1, light: [0, -1] }); }
  for (let w = 0; w < 3; w++) { const x = gx - 6 - w * 9; for (let y = gy - 5; y <= gy + 5; y++) tone(s, f, x + Math.round((y - gy) * .4), y, y < gy ? .8 : .45); }
}

function rifle() {
  const s = new Sheet('blood_rifle', 92, 40, 4, { anchor: 'center', gx: 30, gy: 22 });
  for (let f = 0; f < 4; f++) {
    const recoil = f === 2 ? -2 : f === 3 ? -1 : 0; const o = (pts) => pts.map(([x, y]) => [x + recoil, y]);
    strands(s, f, 30, 22, 100);
    part(s, f, o([[8, 16], [26, 15], [28, 22], [12, 25], [6, 22]]));                 // stock
    part(s, f, o([[26, 13], [58, 13], [60, 20], [26, 21]]), { lit: .75 });             // receiver
    part(s, f, o([[40, 20], [48, 20], [46, 33], [39, 32]]), { lit: .6 });              // magazine (curved)
    part(s, f, o([[28, 21], [34, 21], [33, 29], [28, 28]]), { lit: .55 });             // grip
    part(s, f, o([[34, 8], [52, 8], [52, 12], [34, 12]]), { lit: .8 });                // scope
    part(s, f, o([[58, 15], [84, 15], [84, 18], [58, 19]]), { lit: .85 });             // barrel
    part(s, f, o([[58, 19], [74, 19], [74, 22], [58, 22]]), { lit: .5 });              // under-barrel
    tone(s, f, 52 + recoil, 10, 1); tone(s, f, 51 + recoil, 9, .95);                  // scope glint
    for (const [x, len] of [[14, 5], [36, 7], [45, 9], [64, 4], [78, 6]]) drip(s, f, x + recoil, x < 30 ? 24 : x < 50 ? 30 : 22, len + (f % 2));
    if (f >= 2) { const fx = 86; for (let i = 0; i < 6; i++) { const a = (i / 6 - .5) * 1.4; const l = f === 2 ? 15 : 8; for (let k = 0; k < l; k++) s.set(f, fx + Math.cos(a) * k, 16 + Math.sin(a) * k, C.flash[k < 2 ? 3 : k < 5 ? 2 : 1]); } }
    B.selOutline(s, f, C.out);
  }
  return s;
}
function bow() {
  const s = new Sheet('blood_bow', 48, 72, 4, { anchor: 'center', gx: 16, gy: 36 });
  for (let f = 0; f < 4; f++) {
    const draw = f === 2 ? 8 : f === 3 ? 0 : 2;
    strands(s, f, 16, 36, 200);
    // Limbs: recurve curve, thick at the grip, tips flicking forward.
    B.stroke(s, f, [[18, 36], [24, 22], [26, 10], [30, 3]], { max: 5, swell: .45, ramp: C.blood.slice(2, 7), seed: 210, dry: 0, headBias: .05, light: [-.6, -.8] });
    B.stroke(s, f, [[18, 36], [24, 50], [26, 62], [30, 69]], { max: 5, swell: .45, ramp: C.blood.slice(2, 7), seed: 211, dry: 0, headBias: .05, light: [-.6, -.8] });
    part(s, f, [[14, 32], [20, 32], [20, 40], [14, 40]], { lit: .6 });
    // String (drawn back on frame 2), an arrow of blood when drawn.
    for (let y = 4; y <= 68; y++) { const u = Math.abs(y - 36) / 32; s.set(f, 29 - draw * (1 - u), y, C.blood[6]); }
    if (f === 2) for (let x = 21 - draw; x < 46; x++) { tone(s, f, x, 36, x > 40 ? 1 : .7); if (x > 41) { tone(s, f, x, 35, .8); tone(s, f, x, 37, .6); } }
    for (const [x, y, len] of [[25, 14, 4], [25, 58, 5], [17, 41, 6]]) drip(s, f, x, y, len + (f % 2));
    B.selOutline(s, f, C.out);
  }
  return s;
}
function blade() {
  const s = new Sheet('blood_blade', 80, 40, 4, { anchor: 'center', gx: 22, gy: 24 });
  for (let f = 0; f < 4; f++) {
    strands(s, f, 22, 24, 300);
    part(s, f, [[16, 21], [26, 21], [26, 27], [16, 27]], { lit: .55 });               // grip
    part(s, f, [[26, 17], [30, 17], [30, 31], [26, 31]], { lit: .7 });                // guard
    // Curved blade with a serrated back edge.
    const top = []; const bot = []; for (let i = 0; i <= 10; i++) { const u = i / 10; const x = 30 + u * 46; const curve = Math.sin(u * Math.PI * .9) * 9; top.push([x, 21 - curve - (i % 2 ? 2 : 0) * (1 - u)]); bot.push([x, 31 - curve * 1.05 - u * 7]); }
    part(s, f, [...top, ...bot.reverse()], { lit: .85, dark: .35 });
    for (let i = 0; i < 40; i++) { const u = i / 40; s.set(f, 32 + u * 42, 24 - Math.sin(u * Math.PI * .9) * 9.5 - u * 1.5, C.blood[f >= 2 ? 7 : 6]); } // glowing vein
    for (const [x, y, len] of [[40, 27, 5], [52, 24, 7], [64, 21, 4]]) drip(s, f, x, y, len + (f % 2));
    B.selOutline(s, f, C.out);
  }
  return s;
}
module.exports = { bloodArmSheets: () => [rifle(), bow(), blade()] };
