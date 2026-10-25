// GRIMGE — Pilot C: TIDENBOHRER (sig_S39) sprite sheets (TEST ASSETS, final artwork missing).
// Plan §2.3: a saturated water rotor around the Wizard, four nozzles, water hits,
// a gather (opening) and a burst (closing) animation.
// v2 (user, 25 Oct 2026: "Tidenbohrer könnte natürlicher aussehen, auch im Übergang des Rings und der
// Wasserstrahlen"): the ring is a flowing water tube (travelling swell crests, foam streaks along the flow,
// spray peeling off the crests) instead of three blade-like sickles; the nozzles are small whirlpools instead
// of stone knobs. The jets themselves are drawn at runtime (spell_visuals.js) so they can grow out of the ring.
const { Sheet, hex, rng } = require('./pixel_sheet.cjs');

const W = { out: hex('#061A2E'), deep: hex('#0B3D73'), body: hex('#1F7FD1'), mid: hex('#2FB4EA'), light: hex('#7FDcff'), foam: hex('#D6F6FF'), white: hex('#FFFFFF') };
const TAU = Math.PI * 2;
const RW = 72, RH = 40, CX = 36, CY = 20, RX = 20, RY = 9; // rotor frame / ellipse (sprite px)

// One rotor frame; half: 'back' (upper half of the ellipse, behind the Wizard) or 'front'.
// The ring is a tube of water seen from the side: per point on the ellipse a short column, lit foam rim on top,
// saturated body, a darker underside. Three swell crests travel along it (8 frames = one third of a turn);
// foam streaks run with the flow, and thin spray peels off behind each crest.
function rotorFrame(s, f, half) {
  const phase = f / 8 * (TAU / 3);
  const inHalf = (a) => (half === 'back') === (Math.sin(a) < 0);
  for (let i = 0; i < 520; i++) {
    const a = i / 520 * TAU; if (!inHalf(a)) continue;
    const crest = Math.sin(a * 3 - phase * 3);                       // −1 … 1, three crests
    const h = 3 + Math.max(0, crest) * 2.2;                           // tube height in sprite px
    const x = CX + Math.cos(a) * RX; const yc = CY + Math.sin(a) * RY;
    const top = Math.round(yc - h / 2); const bot = Math.round(yc + h / 2);
    const flow = ((((a * 6 - phase * 6) / TAU) % 1) + 1) % 1;         // six streaks per turn, moving with the spin
    for (let y = top; y <= bot; y++) {
      const v = (y - top) / Math.max(1, bot - top);
      let c = v < .18 ? W.light : v < .5 ? W.mid : v < .85 ? W.body : W.deep;
      if (y === top && crest > .55) c = W.foam;                       // foam on the crest
      if (v > .25 && v < .6 && flow < .14) c = W.foam;                 // a streak along the flow
      s.set(f, x, y, c);
    }
  }
  // Spray: behind each crest a thin wisp peels off outward and breaks into two drops.
  for (let k = 0; k < 3; k++) {
    const a0 = phase + (k + .25) * TAU / 3 - .25;
    for (let u = 0; u <= 1; u += .04) {
      const a = a0 - u * .9; if (!inHalf(a)) continue;
      const r = 1.08 + u * .3; const x = CX + Math.cos(a) * RX * r; const y = CY + Math.sin(a) * RY * r - 2 - u * 2;
      if (u < .7) s.set(f, x, y, u < .3 ? W.foam : W.light);
      else if (Math.round(u * 25) % 3 === 0) s.set(f, x, y, W.mid);
    }
  }
}
function rotor(half) {
  const s = new Sheet(`tide_rotor_${half}`, RW, RH, 8, { anchor: 'center' });
  for (let f = 0; f < 8; f++) rotorFrame(s, f, half);
  return s;
}
function nozzle() {
  // A nozzle is a small whirlpool in the band where the ring pushes water out (4 frames, the spiral turns):
  // barely thicker than the tube, mostly the band's own blue — a swirl, not an orb on the ring.
  const s = new Sheet('tide_nozzle', 7, 6, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    for (let y = 0; y < 6; y++) for (let x = 0; x < 7; x++) { const d = Math.hypot((x - 3) / 3.2, (y - 2.6) / 2.6); if (d <= 1) s.set(f, x, y, y < 2 ? W.mid : d > .7 ? W.deep : W.body); }
    for (let u = 0; u <= 1; u += .08) { const a = u * 4 + f * TAU / 4; const r = .85 - u * .7; s.set(f, 3 + Math.cos(a) * 3 * r, 2.6 + Math.sin(a) * 2.2 * r, u < .6 ? W.light : W.foam); }
  }
  return s;
}
function tideHit() {
  const s = new Sheet('tide_hit', 18, 18, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const R = 2 + f * 2.2;
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + .2; const x0 = 9 + Math.cos(a) * R * .5; const y0 = 9 + Math.sin(a) * R * .5; s.line(f, x0, y0, 9 + Math.cos(a) * R, 9 + Math.sin(a) * R, f < 2 ? W.foam : W.mid); }
    if (f < 2) for (let yy = 7; yy <= 11; yy++) for (let xx = 7; xx <= 11; xx++) if (Math.hypot(xx - 9, yy - 9) < 1.6 + f) s.set(f, xx, yy, W.white);
    s.outline(f, W.out);
  }
  return s;
}
function gather() {
  // Water spirals inward and closes into the ring (6 frames).
  const s = new Sheet('tide_gather', RW, RH, 6, { anchor: 'center' });
  for (let f = 0; f < 6; f++) {
    const k = f / 5;
    for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 26; i++) {
      const u = i / 25; const a = arm * TAU / 3 + u * 2.4 + k * 1.5; const R = (1.8 - .8 * k) - u * (.9 - .1 * k);
      const x = CX + Math.cos(a) * RX * Math.max(.8, R); const y = CY + Math.sin(a) * RY * Math.max(.8, R);
      s.set(f, x, y, u < .3 ? W.foam : W.mid); s.set(f, x + 1, y, W.body);
    }
    if (f >= 4) { rotorFrame(s, f, 'front'); rotorFrame(s, f, 'back'); }
    s.outline(f, W.out);
  }
  return s;
}
function burst() {
  // The ring bursts outward into spray and droplets (6 frames).
  const s = new Sheet('tide_burst', RW + 8, RH + 8, 6, { anchor: 'center' });
  const cx = CX + 4, cy = CY + 4;
  for (let f = 0; f < 6; f++) {
    const R = 1 + f * .22; const r = rng(120 + f);
    for (let k = 0; k < 18; k++) {
      const a = k / 18 * TAU + r() * .2; const x = cx + Math.cos(a) * RX * R; const y = cy + Math.sin(a) * RY * R;
      if (r() < f / 7) continue;
      const sz = f < 3 ? 2 : 1;
      for (let yy = 0; yy < sz; yy++) for (let xx = 0; xx < sz + 1; xx++) s.set(f, x + xx, y + yy, k % 3 ? W.mid : W.foam);
    }
    s.outline(f, W.out);
  }
  return s;
}

module.exports = { tideSheets: () => [rotor('back'), rotor('front'), nozzle(), tideHit(), gather(), burst()] };
