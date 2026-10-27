// GRIMGE Prototype — hand-drawn held weapons (art/authoring/vfx_weapons.cjs) that replace the astral look for some
// weapons (user, 26 Oct 2026, after the example sprites; own designs). A sheet points right with its grip at a fixed
// pixel; drawHeldWeapon (weapons.js) has already translated / rotated to the hand, so the sheet is placed with the
// grip at the origin. Weapons without a sheet keep the astral pieces.
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
import { SPELL_SPRITE_SHEETS } from './spell_sprite_sheets.js';

// weapon id → piece → [sheet, gripX, gripY, width, height, preRotation?, scale?] — preRotation turns an upright sheet (bow) into
// the astral piece frame (pieces point along +x and are rotated by the motion angle).
export const WEAPON_SHEETS = Object.freeze({
  glaive: { glaive: ['w_glaive', 22, 22, 128, 44] },
  katana: { katana: ['w_katana', 11, 10, 84, 20] },
  spear: { spear: ['w_spear', 34, 20, 138, 40] },
  sword_shield: { sword: ['w_sword', 9, 18, 78, 32], shield: ['w_shield', 18, 27, 48, 54] },
  spirit_sword: { spirit_sword: ['w_spirit_sword', 7, 18, 84, 34] },
  scythe: { scythe: ['w_scythe', 24, 70, 150, 84] },
  great_axe: { axe: ['w_axe', 16, 28, 112, 56] },
  great_hammer: { hammer: ['w_hammer', 16, 26, 104, 52] },
  dual_swords: { blade: ['w_sabre', 6, 11, 72, 22] },
  daggers: { dagger: ['w_dagger', 5, 9, 48, 18] },
  bow: { bow: ['w_bow', 26, 50, 40, 100] },
  quarterstaff: { staff: ['w_staff', 72, 9, 152, 18] },
  gauntlets: { fist: ['w_fist', 12, 15, 44, 30] },
  ice_sword: { sword: ['w_ice_sword', 14, 13, 96, 26] },
  mace_shield: { mace: ['w_mace', 12, 18, 96, 36], shield: ['w_shield', 18, 27, 48, 54] },
  twinblade: { twinblade: ['w_twinblade', 88, 14, 176, 28] },
  odachi: { odachi: ['w_odachi', 28, 14, 164, 28] },
  throwing_blades: { knife: ['w_knife', 8, 7, 48, 14] },
  crossbow: { crossbow: ['w_crossbow', 16, 40, 84, 80] },
  chain_scythe: { chain_scythe: ['w_chain_scythe', 12, 36, 76, 48] },
  spellblade: { spellblade: ['w_spellblade', 14, 13, 96, 26], focus: ['w_focus', 14, 20, 28, 40] },
  rune_greatsword: { greatsword: ['w_greatsword', 24, 22, 156, 44] },
  arcane_staff: { arcane_staff: ['w_arcane_staff', 52, 20, 172, 40] },
  orb_focus: { orb: ['w_orb', 4, 20, 36, 40], focus: ['w_focus', 14, 20, 28, 40] },
  warlock_rod: { rod: ['w_rod_warlock', 12, 14, 88, 28], shield: ['w_shield', 18, 27, 48, 54] },
  rod_grimoire: { rod: ['w_rod_grimoire', 12, 14, 88, 28], grimoire: ['w_grimoire', 4, 22, 36, 44] },
  scepter_shield: { scepter: ['w_scepter', 12, 18, 80, 36], shield: ['w_shield', 18, 27, 48, 54] },
  sacred_staff: { sacred_staff: ['w_sacred_staff', 52, 18, 176, 36] },
  harp: { harp: ['w_harp', 16, 44, 72, 84, 0, .7] },
  battle_zither: { zither: ['w_zither', 8, 18, 80, 36, 0, .8] },
  spirit_glaive: { spirit_glaive: ['w_spirit_glaive', 24, 20, 212, 40] },
  claws: { claw: ['w_claw', 10, 15, 54, 30] },
  beast_staff: { beast_staff: ['w_beast_staff', 52, 20, 164, 40] },
  chakrams: { chakram: ['w_chakram', 6, 20, 40, 40] },
  magic_cards: { card: ['w_card', 2, 16, 28, 32] },
  talisman: { talisman: ['w_talisman', 4, 22, 24, 44] },
  ritual_fan: { fan: ['w_fan', 4, 47, 58, 94, 0, .7] }
});
// Form skins: while an Arcane State is active, some weapons take a form-specific sheet (Schattenlanzer: the spear
// becomes a jagged shadow spear during A13 Totenmaske). setWeaponSkinForm is set per draw by drawHeldWeapon.
const FORM_SKINS = Object.freeze({ A13: { spear: { spear: ['w_shadow_spear', 34, 20, 138, 40] }, glaive: { glaive: ['w_shadow_spear', 34, 20, 138, 40] } } });
let skinForm = null;
export const setWeaponSkinForm = (id) => { skinForm = id ?? null; };
// Drawn size (user, 27 Oct 2026: "viele Waffen sind viel zu überdimensioniert"): every weapon at 0.75 of its sheet,
// and no weapon longer than MAX_LEN world px (about half the hero) — the astral lengths were too long.
const SIZE = .75; const MAX_LEN = 50;
const sizeOf = (w, sc = 1) => { let k = sc * SIZE; const len = w / 2 * k; if (len > MAX_LEN) k *= MAX_LEN / len; return k; };
const entryOf = (weaponId, piece) => (skinForm && FORM_SKINS[skinForm]?.[weaponId]?.[piece]) ?? WEAPON_SHEETS[weaponId]?.[piece] ?? null;
export const hasWeaponSheet = (weaponId, piece) => { const e = entryOf(weaponId, piece); return !!e && spellSheetReady(e[0]); };

// Draws the piece's sheet at the (already placed) grip; false when the weapon has no ready sheet.
export function drawWeaponSheet(ctx, weaponId, piece, time = 0) {
  const e = entryOf(weaponId, piece); if (!e || !spellSheetReady(e[0])) return false;
  const [name, gx, gy, w, h, pre = 0, sc0 = 1] = e; const meta = SPELL_SPRITE_SHEETS[name]; const n = meta?.frames ?? 1; const sc = sizeOf(w, sc0);
  // Grips are given in sheet pixels; the sheet is drawn at its logical size (hd sheets: half the pixels), × scale.
  const k = (meta?.w ?? w) / w * sc;
  if (pre) { ctx.save(); ctx.rotate(pre); }
  drawSpellSprite(ctx, name, Math.floor(time * 8) % n, (w / 2 - gx) * k, (h / 2 - gy) * k, { anchor: 'center', scale: sc });
  if (pre) ctx.restore();
  return true;
}

// The katana's red scabbard worn at the hip, pointing back and down (behind the body).
export function drawKatanaSheath(ctx, player, renderY) {
  if (!spellSheetReady('w_katana_sheath')) return;
  const f = player.facing || 1;
  ctx.save(); ctx.translate(Math.round(player.x + f * 2), Math.round(renderY - 38)); ctx.scale(-f, 1); ctx.rotate(.38);
  const sc = sizeOf(76); const k = (SPELL_SPRITE_SHEETS.w_katana_sheath?.w ?? 76) / 76 * sc;
  drawSpellSprite(ctx, 'w_katana_sheath', 0, (38 - 4) * k, 0, { anchor: 'center', scale: sc });
  ctx.restore();
}

// The guard pose with the drawn weapon (weapon_guard.js has translated to the guard centre and mirrored to the
// facing): shield held big in front, katana scabbard upright, blades crossed, polearms spun as a disc.
// Returns false when the weapon has no drawn sheet (the procedural guard is used then).
export function drawGuardSheet(ctx, weaponId, kind, t = 0) {
  const sheets = WEAPON_SHEETS[weaponId]; if (!sheets || kind === 'bow' || kind === 'barrier' || kind === 'fist') return false; // bow brace, caster barrier, crossed fists stay procedural
  const main = Object.keys(sheets).find((k) => k !== 'shield'); const e = sheets[main];
  if (kind === 'shield' && sheets.shield && spellSheetReady(sheets.shield[0])) { const meta = SPELL_SPRITE_SHEETS[sheets.shield[0]]; drawSpellSprite(ctx, sheets.shield[0], Math.floor(t * 8) % (meta?.frames ?? 1), 0, 0, { anchor: 'center', scale: 1.15 * SIZE }); return true; }
  if (kind === 'sheath' && spellSheetReady('w_katana_sheath')) { ctx.save(); ctx.rotate(-Math.PI / 2 + .08); drawSpellSprite(ctx, 'w_katana_sheath', 0, 0, 0, { anchor: 'center' }); ctx.restore(); return true; }
  if (!e || !spellSheetReady(e[0])) return false;
  const [name, gx, gy, w, h, , sc0 = 1] = e; const meta = SPELL_SPRITE_SHEETS[name]; const sc = sizeOf(w, sc0); const k = (meta?.w ?? w) / w * sc; const fr = Math.floor(t * 8) % (meta?.frames ?? 1);
  if (kind === 'pole') {
    // Spun around the middle of the shaft: the weapon and two fading copies a step behind.
    for (let i = 2; i >= 0; i--) { ctx.save(); ctx.globalAlpha *= i ? .25 / i : 1; ctx.rotate(t * 22 - i * .35); drawSpellSprite(ctx, name, fr, 0, 0, { anchor: 'center', scale: sc }); ctx.restore(); }
    return true;
  }
  // Blades: crossed diagonally in front, edge out (parry), grip low.
  ctx.save(); ctx.translate(-8, 14); ctx.rotate(-1.05); drawSpellSprite(ctx, name, fr, (w / 2 - gx) * k, (h / 2 - gy) * k, { anchor: 'center', scale: sc }); ctx.restore();
  return true;
}
