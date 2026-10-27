// GRIMGE Prototype — hand-drawn held weapons (art/authoring/vfx_weapons.cjs) that replace the astral look for some
// weapons (user, 26 Oct 2026, after the example sprites; own designs). A sheet points right with its grip at a fixed
// pixel; drawHeldWeapon (weapons.js) has already translated / rotated to the hand, so the sheet is placed with the
// grip at the origin. Weapons without a sheet keep the astral pieces.
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
import { SPELL_SPRITE_SHEETS } from './spell_sprite_sheets.js';

// weapon id → piece → [sheet, gripX, gripY, width, height]
export const WEAPON_SHEETS = Object.freeze({
  glaive: { glaive: ['w_glaive', 22, 22, 128, 44] },
  katana: { katana: ['w_katana', 11, 10, 84, 20] },
  spear: { spear: ['w_spear', 34, 20, 138, 40] },
  sword_shield: { sword: ['w_sword', 9, 18, 78, 32], shield: ['w_shield', 18, 27, 48, 54] },
  spirit_sword: { spirit_sword: ['w_spirit_sword', 7, 18, 84, 34] },
  scythe: { scythe: ['w_scythe', 24, 70, 150, 84] }
});
const entryOf = (weaponId, piece) => WEAPON_SHEETS[weaponId]?.[piece] ?? null;
export const hasWeaponSheet = (weaponId, piece) => { const e = entryOf(weaponId, piece); return !!e && spellSheetReady(e[0]); };

// Draws the piece's sheet at the (already placed) grip; false when the weapon has no ready sheet.
export function drawWeaponSheet(ctx, weaponId, piece, time = 0) {
  const e = entryOf(weaponId, piece); if (!e || !spellSheetReady(e[0])) return false;
  const [name, gx, gy, w, h] = e; const meta = SPELL_SPRITE_SHEETS[name]; const n = meta?.frames ?? 1;
  // Grips are given in sheet pixels; the sheet is drawn at its logical size (hd sheets: half the pixels).
  const k = (meta?.w ?? w) / w;
  drawSpellSprite(ctx, name, Math.floor(time * 8) % n, (w / 2 - gx) * k, (h / 2 - gy) * k, { anchor: 'center' });
  return true;
}

// The katana's red scabbard worn at the hip, pointing back and down (behind the body).
export function drawKatanaSheath(ctx, player, renderY) {
  if (!spellSheetReady('w_katana_sheath')) return;
  const f = player.facing || 1;
  ctx.save(); ctx.translate(Math.round(player.x + f * 2), Math.round(renderY - 38)); ctx.scale(-f, 1); ctx.rotate(.38);
  const k = (SPELL_SPRITE_SHEETS.w_katana_sheath?.w ?? 76) / 76;
  drawSpellSprite(ctx, 'w_katana_sheath', 0, (38 - 4) * k, 0, { anchor: 'center' });
  ctx.restore();
}

// The guard pose with the drawn weapon (weapon_guard.js has translated to the guard centre and mirrored to the
// facing): shield held big in front, katana scabbard upright, blades crossed, polearms spun as a disc.
// Returns false when the weapon has no drawn sheet (the procedural guard is used then).
export function drawGuardSheet(ctx, weaponId, kind, t = 0) {
  const sheets = WEAPON_SHEETS[weaponId]; if (!sheets) return false;
  const main = Object.keys(sheets).find((k) => k !== 'shield'); const e = sheets[main];
  if (kind === 'shield' && sheets.shield && spellSheetReady(sheets.shield[0])) { const meta = SPELL_SPRITE_SHEETS[sheets.shield[0]]; drawSpellSprite(ctx, sheets.shield[0], Math.floor(t * 8) % (meta?.frames ?? 1), 0, 0, { anchor: 'center', scale: 1.15 }); return true; }
  if (kind === 'sheath' && spellSheetReady('w_katana_sheath')) { ctx.save(); ctx.rotate(-Math.PI / 2 + .08); drawSpellSprite(ctx, 'w_katana_sheath', 0, 0, 0, { anchor: 'center' }); ctx.restore(); return true; }
  if (!e || !spellSheetReady(e[0])) return false;
  const [name, gx, gy, w, h] = e; const meta = SPELL_SPRITE_SHEETS[name]; const k = (meta?.w ?? w) / w; const fr = Math.floor(t * 8) % (meta?.frames ?? 1);
  if (kind === 'pole') {
    // Spun around the middle of the shaft: the weapon and two fading copies a step behind.
    for (let i = 2; i >= 0; i--) { ctx.save(); ctx.globalAlpha *= i ? .25 / i : 1; ctx.rotate(t * 22 - i * .35); drawSpellSprite(ctx, name, fr, 0, 0, { anchor: 'center' }); ctx.restore(); }
    return true;
  }
  // Blades: crossed diagonally in front, edge out (parry), grip low.
  ctx.save(); ctx.translate(-8, 14); ctx.rotate(-1.05); drawSpellSprite(ctx, name, fr, (w / 2 - gx) * k, (h / 2 - gy) * k, { anchor: 'center' }); ctx.restore();
  return true;
}
