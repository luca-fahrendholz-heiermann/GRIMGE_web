// GRIMGE — Pilot C: TIDENBOHRER (sig_S39) sprite sheets (TEST ASSETS, final artwork missing).
// Plan §2.3: a saturated water rotor around the Wizard with three asymmetric
// arms (the spiral shows the spin direction), four nozzle heads, foam crowns,
// water hits, a gather (closing) and a burst (opening) animation.
const { Sheet, hex, rng } = require('./pixel_sheet.cjs');

const W = { out: hex('#061A2E'), deep: hex('#0B3D73'), body: hex('#1F7FD1'), mid: hex('#2FB4EA'), light: hex('#7FDcff'), foam: hex('#D6F6FF'), white: hex('#FFFFFF') };
const TAU = Math.PI * 2;
const RW = 72, RH = 40, CX = 36, CY = 20, RX = 20, RY = 9; // rotor frame / ellipse (sprite px)

// One rotor frame; half: 'back' (upper half of the ellipse, behind the Wizard) or 'front'.
function rotorFrame(s, f, half) {
  const phase = f / 8 * (TAU / 3); // 3-fold symmetric arms → 8 frames cover one third of a turn
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
    const dx = (x - CX) / RX; const dy = (y - CY) / RY; const d = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx);
    if ((half === 'back') !== (dy < 0)) continue;
    // Ring band.
    if (d > .74 && d < 1.12) {
      const u = (((a - phase) * 3 / TAU) % 1 + 1) % 1; // position within one arm period
      s.set(f, x, y, u < .12 ? W.foam : u < .3 ? W.light : u < .55 ? W.mid : u < .8 ? W.body : W.deep);
    }
  }
  // Arms: three water sickles sweeping back from the crests (asymmetric lengths →
  // the spiral reads as the spin direction). Drawn parametrically, thick at the root.
  for (let k = 0; k < 3; k++) {
    const len = [1.2, .95, .75][k]; const a0 = phase + k * TAU / 3;
    for (let t = 0; t <= 1; t += .02) {
      const a = a0 - t * 1.25;                       // trailing behind the crest
      const r0 = 1.0; const r1 = 1.0 + len * .55 * (1 - t) ** .7; // outward reach shrinks along the arm
      const dyHalf = Math.sin(a); if ((half === 'back') !== (dyHalf < 0)) continue;
      for (let r = r0; r <= r1; r += .03) {
        const x = CX + Math.cos(a) * RX * r; const y = CY + Math.sin(a) * RY * r;
        const outer = (r - r0) / Math.max(.01, r1 - r0);
        s.set(f, x, y, t < .15 ? W.foam : outer > .7 ? W.light : t < .5 ? W.mid : W.body);
      }
    }
  }
  s.outline(f, W.out);
}
function rotor(half) {
  const s = new Sheet(`tide_rotor_${half}`, RW, RH, 8, { anchor: 'center' });
  for (let f = 0; f < 8; f++) rotorFrame(s, f, half);
  return s;
}
function nozzle() {
  // A nozzle head seen from 4 angles (drawn at the 4 nozzle positions on the ring).
  const s = new Sheet('tide_nozzle', 8, 8, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    s.poly(f, [[1, 2], [6, 1], [7, 6], [2, 7]], W.deep);
    s.poly(f, [[2, 3], [5, 2], [6, 5], [3, 6]], W.mid);
    const hx = [5, 5, 2, 2][f]; const hy = [2, 5, 5, 2][f];
    s.set(f, hx, hy, W.white); s.set(f, hx + (hx > 3 ? 1 : -1), hy, W.foam);
    s.outline(f, W.out);
  }
  return s;
}
function jetHead() {
  // Foam crown at the end of a pressure jet (4 frames, churning).
  const s = new Sheet('tide_jet_head', 14, 14, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const r = rng(90 + f);
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + f * .4; const R = 3 + r() * 3; const x = 7 + Math.cos(a) * R; const y = 7 + Math.sin(a) * R * .8; for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) if (xx * xx + yy * yy <= 1 + r()) s.set(f, x + xx, y + yy, k % 2 ? W.foam : W.light); }
    for (let yy = 5; yy <= 9; yy++) for (let xx = 5; xx <= 9; xx++) if (Math.hypot(xx - 7, yy - 7) < 2.2) s.set(f, xx, yy, W.white);
    s.outline(f, W.body);
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
function droplet() {
  const s = new Sheet('tide_droplet', 4, 5, 2, { anchor: 'center' });
  for (let f = 0; f < 2; f++) { s.set(f, 1, 1, W.foam); s.set(f, 2, 1, W.light); s.set(f, 1, 2, W.mid); s.set(f, 2, 2, W.mid); s.set(f, 1 + f, 3, W.body); s.outline(f, W.out); }
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
    if (f >= 4) rotorFrame(s, f, 'front');
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

module.exports = { tideSheets: () => [rotor('back'), rotor('front'), nozzle(), jetHead(), tideHit(), droplet(), gather(), burst()] };
