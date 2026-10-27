// GRIMGE Prototype — the guard pose per weapon (user, 21 Oct 2026: "Abwehr-Animation je Waffe").
// The held guard is drawn in front of the Wizard in the weapon's own way (opaque, crisp):
//   shield weapons   a big shield with boss and rim
//   blades           the blade crossed in front (parry), katana: sheath block
//   heavy            the haft held across as a bar
//   polearms         the shaft spun as a disc
//   ranged           the bow raised as a brace, a wind veil in front
//   casters          a hexagonal rune barrier
//   fists / claws    crossed arms with a spirit glow
//   bare hands       the classic arcane shield
// A perfect block (first moment of the guard) flashes the pose white-gold with sparks.
import { WEAPONS } from './weapons.js';
import { drawGuardSheet } from './weapon_sheets.js'; // drawn weapons keep their own look in the guard

const TAU = Math.PI * 2;
const KIND = Object.freeze({
  sword_shield: 'shield', mace_shield: 'shield', scepter_shield: 'shield',
  katana: 'sheath', odachi: 'sheath'
});
const FAMILY = Object.freeze({
  Guardian: 'shield', Bladedancer: 'blade', Runeblade: 'blade', Conjured: 'blade', Spiritbound: 'blade', Shadow: 'blade', Ronin: 'sheath',
  Berserker: 'heavy', Lancer: 'pole', Reaper: 'pole', Ranger: 'bow', Trickster: 'bow', Monk: 'fist', Beastborn: 'fist',
  Arcanist: 'barrier', Occultist: 'barrier', Oracle: 'barrier', Resonant: 'barrier', Fateweaver: 'barrier'
});
const LOOK = Object.freeze({ staff: 'pole', knife: 'bow', beast_staff: 'barrier' });
export function guardKindOf(p) {
  const id = p?.weapon ?? p?.classWeapon; const w = WEAPONS[id];
  if (!w) return 'arcane';
  return KIND[id] ?? LOOK[w.look] ?? FAMILY[w.family] ?? 'blade';
}

const poly = (ctx, pts, fill, stroke, lw = 2) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } };

// Draw the guard of the Wizard (x, baseY = feet, f = facing).
export function drawWeaponGuard(ctx, p, x, baseY, f, perfect, t) {
  const kind = guardKindOf(p); const w = WEAPONS[p?.weapon ?? p?.classWeapon];
  const metal = perfect ? '#fff3c4' : (w?.color ?? '#cfd8dc'); const accent = perfect ? '#ffd740' : (w?.accent ?? '#4fc3f7'); const dark = '#1b1626';
  const cx = x + f * 24; const cy = baseY - 42;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.translate(cx, cy); ctx.scale(f, 1);
  const drawn = drawGuardSheet(ctx, p?.weapon ?? p?.classWeapon, kind, t);
  if (!drawn) switch (kind) {
    case 'shield': {
      // A big kite shield with rim and boss.
      poly(ctx, [[0, -30], [17, -21], [17, 14], [0, 32], [-17, 14], [-17, -21]], accent, dark, 2.5);
      poly(ctx, [[0, -24], [12, -17], [12, 11], [0, 25], [-12, 11], [-12, -17]], metal, null);
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(0, -2, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.stroke();
      break;
    }
    case 'blade': {
      // The blade crossed diagonally in front, edge out (parry).
      ctx.rotate(-.75);
      poly(ctx, [[-4, -36], [4, -36], [3, 18], [0, 24], [-3, 18]], metal, dark, 1.5);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, -30); ctx.lineTo(1.5, 16); ctx.stroke();
      poly(ctx, [[-10, 18], [10, 18], [10, 22], [-10, 22]], accent, dark, 1.2);
      poly(ctx, [[-2.5, 22], [2.5, 22], [2.5, 34], [-2.5, 34]], '#4e342e', dark, 1);
      break;
    }
    case 'sheath': {
      // Katana: the sheathed blade held up vertically, the hilt ready to draw.
      poly(ctx, [[-4, -34], [4, -34], [4, 22], [-4, 22]], '#2b1d3a', dark, 1.5);
      ctx.strokeStyle = accent; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-4, -20 + i * 14); ctx.lineTo(4, -16 + i * 14); ctx.stroke(); }
      poly(ctx, [[-8, 22], [8, 22], [8, 25], [-8, 25]], '#ffd54f', dark, 1);
      poly(ctx, [[-3, 25], [3, 25], [3, 38], [-3, 38]], '#e0e0e0', dark, 1);
      break;
    }
    case 'heavy': {
      // The great weapon held across as a bar, head up.
      ctx.rotate(-.2);
      poly(ctx, [[-4, -34], [4, -34], [4, 30], [-4, 30]], '#5d4037', dark, 1.5);
      poly(ctx, [[-14, -40], [14, -40], [14, -24], [-14, -24]], metal, dark, 2);
      poly(ctx, [[-14, -40], [-20, -32], [-14, -24]], accent, dark, 1.5);
      break;
    }
    case 'pole': {
      // The shaft spun into a disc (blurred spokes kept opaque and crisp).
      const spin = t * 22;
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(Math.cos(spin) * 30, Math.sin(spin) * 34); ctx.lineTo(-Math.cos(spin) * 30, -Math.sin(spin) * 34); ctx.stroke();
      ctx.strokeStyle = metal; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 30, 34, 0, spin, spin + 2.2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, 30, 34, 0, spin + Math.PI, spin + Math.PI + 2.2); ctx.stroke();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
      break;
    }
    case 'bow': {
      // The bow raised as a brace, a wind veil curving in front.
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-6, 0, 30, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = metal; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6 + Math.cos(-1.1) * 30, Math.sin(-1.1) * 30); ctx.lineTo(-6 + Math.cos(1.1) * 30, Math.sin(1.1) * 30); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const r = 34 + i * 6; ctx.beginPath(); ctx.arc(-10, 0, r, -.7 - Math.sin(t * 6 + i) * .1, .7); ctx.stroke(); }
      break;
    }
    case 'barrier': {
      // A hexagonal rune barrier turning slowly.
      const pts = Array.from({ length: 6 }, (_, i) => { const a = t * .8 + i * TAU / 6; return [Math.cos(a) * 12 + 6, Math.sin(a) * 32]; });
      poly(ctx, pts, perfect ? 'rgba(255,243,196,.9)' : 'rgba(30,50,90,.75)', accent, 2.5);
      ctx.fillStyle = metal; for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(pts[i][0]) - 1, Math.round(pts[i][1]) - 1, 3, 3);
      ctx.strokeStyle = metal; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(6, -18); ctx.lineTo(6, 18); ctx.moveTo(0, 0); ctx.lineTo(12, 0); ctx.stroke();
      break;
    }
    case 'fist': {
      // Crossed forearms with gauntlets / claws, a spirit glow ring around them.
      for (const s of [1, -1]) { ctx.save(); ctx.rotate(s * .6); poly(ctx, [[-5, -22], [5, -22], [5, 18], [-5, 18]], '#8d6e63', dark, 1.5); poly(ctx, [[-7, -26], [7, -26], [7, -14], [-7, -14]], metal, dark, 1.5); ctx.restore(); }
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -4, 22, 30, 0, 0, TAU); ctx.stroke();
      break;
    }
    default: {
      // Bare hands: the classic arcane shield.
      poly(ctx, [[0, -25], [14, -16], [14, 14], [0, 25], [-14, 14], [-14, -16]], perfect ? '#b4a028' : '#21689a', perfect ? '#fff176' : '#b9f4ff', perfect ? 3.5 : 2.5);
      ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 17); ctx.moveTo(-9, -2); ctx.lineTo(9, -2); ctx.stroke();
    }
  }
  // Perfect block: a star of sparks on the guard.
  if (perfect) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); ctx.stroke(); } }
  ctx.restore();
  return kind;
}
