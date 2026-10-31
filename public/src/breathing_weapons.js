// GRIMGE Prototype — breathing × weapon (user, 21 Oct 2026: "die Stile der Waffen fusionieren mit
// den Atmungs-Spells — gleicher Effekt, nur im Stil der Waffe: beim Bogen ein Pfeil im
// Feuerdrachen, beim Katana der Iai-Durchzug mit Feuer … nicht nur durchsichtige VFX").
// The breathing move keeps its effect (damage, status, reach, ground effects); the weapon decides
//   • the DELIVERY flourish at the start (draw the bow, unsheathe, overhead smash, thrust, circle, punch),
//   • the HEAD of travelling moves (fire arrow with the dragon as its tail, blade crescent, spear tip,
//     fissure of rock spikes, sigil orb, fist blast),
//   • for ranged weapons: dashes become a piercing shot along the same lane (the archer stays).
// Everything is drawn from opaque plates in the element's ramp (crisp, gets the pixel contour).
import { WEAPONS } from './weapons.js';
import { plate, TAU } from './signature_core.js';

const FAMILY_KIND = Object.freeze({
  Guardian: 'blade', Bladedancer: 'blade', Runeblade: 'blade', Conjured: 'blade', Spiritbound: 'blade',
  Ronin: 'iai', Berserker: 'heavy', Lancer: 'polearm', Reaper: 'polearm', Ranger: 'ranged', Trickster: 'ranged',
  Monk: 'fist', Beastborn: 'fist', Arcanist: 'caster', Occultist: 'caster', Oracle: 'caster', Resonant: 'caster', Fateweaver: 'caster', Shadow: 'blade'
});
const LOOK_KIND = Object.freeze({ mace: 'heavy', knife: 'ranged', staff: 'polearm', spirit_glaive: 'polearm', beast_staff: 'caster' });
const PROJECTILE = Object.freeze({ bow: 'arrow', crossbow: 'bolt', knife: 'knife', chakram: 'chakram', card: 'card' });

// How the Wizard's weapon delivers a breathing move.
export function deliveryOf(p) {
  const id = p?.weapon ?? p?.classWeapon; const w = WEAPONS[id];
  if (!w) return { kind: 'none', look: null, projectile: null };
  const kind = LOOK_KIND[w.look] ?? FAMILY_KIND[w.family] ?? 'blade';
  return { kind, look: w.look, projectile: kind === 'ranged' ? (PROJECTILE[w.look] ?? 'arrow') : null, id };
}

const solid = (ctx, pts, fill, stroke = null, w = 1.5) => { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.stroke(); } };

// The Wizard's own weapon motion for a breathing move (user's plan, 21 Oct: "every weapon type animates these
// moves its own way"): the move kind picks a phase (travelling shot, rising, dash, crash), the weapon the swing —
// the katana draws from the sheath, the axe cleaves / slams, the spear lunges, the bow is drawn, the staff casts,
// fists punch / uppercut. Motions are the weapon motions of weapons.js (MOTIONS / EXT_MOTION_FNS).
const PHASE = Object.freeze({ torrent: 'shot', crescents: 'shot', blasts: 'shot', boomerang: 'shot', rising: 'rise', pillar: 'rise', orbit: 'rise', flash: 'dash', charge: 'dash', flurry: 'dash', crash: 'crash', calm: 'guard' });
const KIND_MOTION = Object.freeze({
  iai: { shot: 'iaido', rise: 'rising', dash: 'iaido', crash: 'overhead', guard: 'iaido' },
  blade: { shot: 'slash', rise: 'rising', dash: 'thrust', crash: 'overhead', guard: 'backhand' },
  heavy: { shot: 'cleave', rise: 'rising', dash: 'whirl', crash: 'slam', guard: 'slam' },
  polearm: { shot: 'lunge', rise: 'rising', dash: 'lunge', crash: 'overhead', guard: 'whirl' },
  caster: { shot: 'cast', rise: 'cast', dash: 'cast', crash: 'overhead', guard: 'cast' },
  fist: { shot: 'smash', rise: 'upper', dash: 'punch', crash: 'slam', guard: 'punch' }
});
const LOOK_MOTION = Object.freeze({ bow: 'draw', crossbow: 'aim', knife: 'throw', card: 'throw', chakram: 'throw', harp: 'strum', zither: 'strum', fan: 'fan', claw: 'rake', chain_scythe: 'whip', scythe: 'reap', daggers: 'flurry', dual: 'cross' });
const PHASE_TIME = Object.freeze({ shot: .5, rise: .45, dash: .36, crash: .45, guard: .4 });
export function breathMotion(d, moveKind) {
  if (!d || d.kind === 'none' || moveKind === 'drill') return null;
  const phase = PHASE[moveKind] ?? 'shot';
  const motion = (phase !== 'crash' && LOOK_MOTION[d.look]) || KIND_MOTION[d.kind]?.[phase] || (d.kind === 'ranged' ? 'draw' : 'slash');
  return { motion, dur: PHASE_TIME[phase] };
}

// The head of a travelling breathing move, per weapon (x, y = head position, f = direction).
export function drawHead(ctx, d, x, y, s, t, R, f) {
  if (!d || d.kind === 'none') return false;
  ctx.save();
  switch (d.kind) {
    case 'ranged': {
      if (d.projectile === 'chakram') { ctx.lineWidth = 5 * s; ctx.strokeStyle = R.dark; ctx.beginPath(); ctx.arc(x, y, 11 * s, 0, TAU); ctx.stroke(); ctx.lineWidth = 3 * s; ctx.strokeStyle = R.light; ctx.beginPath(); ctx.arc(x, y, 11 * s, t * 20, t * 20 + 4.4); ctx.stroke(); break; }
      if (d.projectile === 'card') { ctx.translate(x, y); ctx.rotate(t * 16); solid(ctx, [[-7 * s, -10 * s], [7 * s, -10 * s], [7 * s, 10 * s], [-7 * s, 10 * s]], '#f5f0e6', R.mid, 2); solid(ctx, [[0, -5 * s], [4 * s, 0], [0, 5 * s], [-4 * s, 0]], R.mid); break; }
      // Arrow / bolt / knife: dark shaft, element-forged head, fletching — the breathing body trails behind.
      const L = (d.projectile === 'bolt' ? 30 : d.projectile === 'knife' ? 16 : 40) * s;
      ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x - f * L, y); ctx.lineTo(x, y); ctx.stroke();
      plate(ctx, [[x + f * 16 * s, y], [x - f * 2 * s, y - 7 * s], [x + f * 2 * s, y], [x - f * 2 * s, y + 7 * s]], R.mat, 7701, { alpha: 1, glowEdge: 1 });
      if (d.projectile !== 'knife') { solid(ctx, [[x - f * L, y], [x - f * (L + 9 * s), y - 7 * s], [x - f * (L - 5 * s), y]], R.light, R.dark, 1); solid(ctx, [[x - f * L, y], [x - f * (L + 9 * s), y + 7 * s], [x - f * (L - 5 * s), y]], R.light, R.dark, 1); }
      ctx.fillStyle = R.core; ctx.fillRect(Math.round(x + f * 8 * s) - 1, Math.round(y) - 1, 3, 3);
      break;
    }
    case 'blade': case 'iai': {
      // A flying blade crescent of the element (opaque, white cutting edge).
      const H = (d.kind === 'iai' ? 34 : 40) * s; const W = (d.kind === 'iai' ? 16 : 22) * s;
      solid(ctx, [[x - f * 6 * s, y - H], [x + f * W, y - H * .4], [x + f * W * 1.1, y], [x + f * W, y + H * .4], [x - f * 6 * s, y + H], [x + f * W * .35, y]], R.mid, R.dark, 2);
      solid(ctx, [[x + f * W * .35, y - H * .7], [x + f * W * .95, y], [x + f * W * .35, y + H * .7], [x + f * W * .65, y]], R.light);
      ctx.strokeStyle = R.core; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + f * W * .9, y - H * .45); ctx.lineTo(x + f * W * 1.08, y); ctx.lineTo(x + f * W * .9, y + H * .45); ctx.stroke();
      break;
    }
    case 'polearm': {
      // A long spear tip forged from the element.
      ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(x - f * 50 * s, y); ctx.lineTo(x - f * 8 * s, y); ctx.stroke();
      plate(ctx, [[x + f * 26 * s, y], [x - f * 6 * s, y - 9 * s], [x - f * 12 * s, y], [x - f * 6 * s, y + 9 * s]], R.mat, 7702, { alpha: 1, glowEdge: 1 });
      solid(ctx, [[x - f * 8 * s, y - 12 * s], [x - f * 4 * s, y], [x - f * 8 * s, y + 12 * s], [x - f * 14 * s, y]], R.dark);
      break;
    }
    case 'heavy': {
      // The ground splits: element-tinted rock spikes burst up at the head.
      const gy = y + 26 * s;
      for (let i = 0; i < 3; i++) { const sx = x - f * i * 14 * s; const h = (30 - i * 7) * s * (.8 + .2 * Math.sin(t * 20 + i)); plate(ctx, [[sx - 9 * s, gy], [sx - 3 * s, gy - h], [sx + 4 * s, gy - h * 1.1], [sx + 9 * s, gy]], R.mat, 7710 + i, { alpha: 1, glowEdge: .5 }); }
      ctx.fillStyle = R.dark; ctx.fillRect(Math.round(x - f * 44 * s), Math.round(gy), Math.round(f * 50 * s), 3);
      break;
    }
    case 'caster': {
      // A turning sigil orb.
      ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(x, y, 14 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = R.mid; ctx.beginPath(); ctx.arc(x, y, 10 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = R.core; ctx.beginPath(); ctx.arc(x, y, 4 * s, 0, TAU); ctx.fill();
      ctx.strokeStyle = R.light; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 20 * s, 7 * s, t * 4, 0, TAU); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a = t * 6 + i * TAU / 4; ctx.fillStyle = R.light; ctx.fillRect(Math.round(x + Math.cos(a) * 17 * s) - 1, Math.round(y + Math.sin(a) * 17 * s) - 1, 3, 3); }
      break;
    }
    case 'fist': {
      // A fist of the element punching forward, impact rings ahead.
      const fx = x; const fy = y;
      solid(ctx, [[fx - f * 12 * s, fy - 9 * s], [fx + f * 8 * s, fy - 11 * s], [fx + f * 14 * s, fy - 4 * s], [fx + f * 14 * s, fy + 6 * s], [fx + f * 6 * s, fy + 11 * s], [fx - f * 12 * s, fy + 9 * s]], R.mid, R.dark, 2);
      ctx.strokeStyle = R.dark; ctx.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(fx + f * 6 * s, fy + i * 5 * s); ctx.lineTo(fx + f * 13 * s, fy + i * 5 * s); ctx.stroke(); }
      ctx.strokeStyle = R.light; ctx.lineWidth = 2; for (let i = 0; i < 2; i++) { const r = (14 + ((t * 4 + i * .5) % 1) * 14) * s; ctx.beginPath(); ctx.ellipse(fx + f * 20 * s, fy, r * .45, r, 0, 0, TAU); ctx.stroke(); }
      break;
    }
    default: ctx.restore(); return false;
  }
  ctx.restore();
  return true;
}

// The weapon's delivery at the start of a move (k: 0 → 1 over its short life).
export function drawFlourish(ctx, d, x, y, k, t, R, f) {
  if (!d || d.kind === 'none') return;
  const a = Math.min(1, (1 - k) * 2.5); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
  const hx = x + f * 18; const hy = y - 44;
  switch (d.kind) {
    case 'blade': case 'iai': {
      // The cut: a thick opaque crescent sweeping through, white edge (iai: a flat draw line + glint).
      if (d.kind === 'iai') {
        const L = 40 + 120 * Math.min(1, k * 3);
        solid(ctx, [[x - f * 20, hy - 3], [x + f * L, hy - 1], [x + f * (L + 10), hy + 1], [x - f * 20, hy + 4]], R.mid, R.dark, 1.5);
        ctx.strokeStyle = R.core; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - f * 10, hy); ctx.lineTo(x + f * L, hy); ctx.stroke();
        ctx.fillStyle = R.core; ctx.fillRect(Math.round(x + f * L) - 2, hy - 6, 4, 12);
        break;
      }
      const sweep = Math.min(1, k * 3); const a0 = -1.5; const a1 = a0 + 2.8 * sweep; const pts = []; const pts2 = [];
      for (let i = 0; i <= 10; i++) { const u = a0 + (a1 - a0) * i / 10; pts.push([x + f * Math.cos(u) * 58, y - 38 + Math.sin(u) * 46]); pts2.unshift([x + f * Math.cos(u) * 40, y - 38 + Math.sin(u) * 30]); }
      solid(ctx, [...pts, ...pts2], R.mid, R.dark, 1.5);
      ctx.strokeStyle = R.core; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      break;
    }
    case 'ranged': {
      // The bow drawn: limbs bend, the string snaps forward, element sparks at the nock.
      const draw = k < .4 ? k / .4 : Math.max(0, 1 - (k - .4) * 5);
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx - f * 4, hy, 22, f > 0 ? -1.2 : Math.PI - 1.2, f > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke();
      const top = [hx - f * 4 + f * Math.cos(1.2) * 22, hy - Math.sin(1.2) * 22]; const bot = [top[0], hy + Math.sin(1.2) * 22];
      ctx.strokeStyle = R.light; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(...top); ctx.lineTo(hx - f * (4 + 18 * draw), hy); ctx.lineTo(...bot); ctx.stroke();
      for (let i = 0; i < 5; i++) { const ang = t * 18 + i * 1.3; ctx.fillStyle = i % 2 ? R.core : R.mid; ctx.fillRect(Math.round(hx + Math.cos(ang) * 8) - 1, Math.round(hy + Math.sin(ang) * 8) - 1, 3, 3); }
      break;
    }
    case 'heavy': {
      // Overhead smash: the arc comes down and the ground cracks open at the weapon.
      const sweep = Math.min(1, k * 3); const ang = -2.4 + 2.6 * sweep; const ex = x + f * Math.cos(ang) * 62; const ey = y - 30 + Math.sin(ang) * 58;
      ctx.strokeStyle = R.mid; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(x, y - 30, 60, f > 0 ? -2.4 : Math.PI + 2.4, f > 0 ? ang : Math.PI - ang, f < 0); ctx.stroke();
      ctx.strokeStyle = R.core; ctx.lineWidth = 2; ctx.stroke();
      if (sweep >= 1) { for (let i = 0; i < 5; i++) { const sx = x + f * (40 + i * 10); plate(ctx, [[sx - 6, y], [sx, y - 14 - (i % 2) * 8], [sx + 6, y]], R.mat, 7720 + i, { alpha: 1, glowEdge: .4 }); } }
      else { ctx.fillStyle = R.core; ctx.fillRect(Math.round(ex) - 3, Math.round(ey) - 3, 6, 6); }
      break;
    }
    case 'polearm': {
      // The thrust: the shaft shoots forward with an element-forged tip.
      const L = 30 + 90 * Math.min(1, k * 4);
      ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - f * 30, hy + 4); ctx.lineTo(x + f * L, hy + 2); ctx.stroke();
      plate(ctx, [[x + f * (L + 22), hy + 2], [x + f * L, hy - 6], [x + f * (L - 4), hy + 2], [x + f * L, hy + 10]], R.mat, 7730, { alpha: 1, glowEdge: 1 });
      break;
    }
    case 'caster': {
      // A magic circle opens upright in front of the focus.
      const r = 26 * Math.min(1, k * 4);
      ctx.strokeStyle = R.mid; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x + f * 34, hy, r * .35, r, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = R.light; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + f * 34, hy, r * .22, r * .7, 0, 0, TAU); ctx.stroke();
      for (let i = 0; i < 6; i++) { const ang = t * 5 + i * TAU / 6; ctx.fillStyle = R.core; ctx.fillRect(Math.round(x + f * 34 + Math.cos(ang) * r * .3) - 1, Math.round(hy + Math.sin(ang) * r * .9) - 1, 3, 3); }
      break;
    }
    case 'fist': {
      // The punch: rings burst at the fist, speed lines behind the arm.
      const r = 8 + 26 * k;
      ctx.strokeStyle = R.mid; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(hx + f * 20, hy + 4, r * .45, r, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = R.core; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(hx + f * 20, hy + 4, r * .25, r * .6, 0, 0, TAU); ctx.stroke();
      for (let i = 0; i < 4; i++) { ctx.strokeStyle = R.light; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - f * 8, hy - 8 + i * 6); ctx.lineTo(hx - f * (26 + i * 6), hy - 8 + i * 6); ctx.stroke(); }
      break;
    }
    default: break;
  }
  ctx.restore();
}
