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
  spirit_sword: { spirit_sword: ['w_spirit_sword', 7, 18, 84, 34] }
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
