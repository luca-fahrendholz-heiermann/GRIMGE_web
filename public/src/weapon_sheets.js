// GRIMGE Prototype — hand-drawn held weapons (art/authoring/vfx_weapons.cjs) that replace the astral look for some
// weapons (user, 26 Oct 2026, after the example sprites; own designs). A sheet points right with its grip at a fixed
// pixel; drawHeldWeapon (weapons.js) has already translated / rotated to the hand, so the sheet is placed with the
// grip at the origin. Weapons without a sheet keep the astral pieces.
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
import { SPELL_SPRITE_SHEETS } from './spell_sprite_sheets.js';

// weapon id → piece → [sheet, gripX, gripY, width, height, preRotation?, scale?] — preRotation turns an upright sheet (bow) into
// the astral piece frame (pieces point along +x and are rotated by the motion angle).
export const WEAPON_SHEETS = Object.freeze({
  glaive: { glaive: ['w_glaive', 11, 11, 64, 22] },
  katana: { katana: ['w_katana', 6, 10, 42, 16] },
  spear: { spear: ['w_spear', 17, 7, 68, 18] },
  sword_shield: { sword: ['w_sword', 5, 9, 39, 17], shield: ['w_shield', 11, 14, 28, 27] },
  spirit_sword: { spirit_sword: ['w_spirit_sword', 3, 8, 41, 15] },
  scythe: { scythe: ['w_scythe', 12, 18, 75, 35] },
  great_axe: { axe: ['w_axe', 8, 16, 56, 31] },
  great_hammer: { hammer: ['w_hammer', 8, 15, 52, 29] },
  dual_swords: { blade: ['w_sabre', 3, 9, 36, 16] },
  daggers: { dagger: ['w_dagger', 3, 4, 24, 8] },
  bow: { bow: ['w_bow', 17, 25, 26, 50] },
  quarterstaff: { staff: ['w_staff', 36, 5, 76, 10] },
  gauntlets: { fist: ['w_fist', 6, 5, 22, 11] },
  ice_sword: { sword: ['w_ice_sword', 7, 10, 48, 18] },
  mace_shield: { mace: ['w_mace', 6, 10, 48, 20], shield: ['w_shield_mace', 8, 13, 21, 26] },
  twinblade: { twinblade: ['w_twinblade', 44, 10, 88, 17] },
  odachi: { odachi: ['w_odachi', 14, 22, 82, 33] },
  throwing_blades: { knife: ['w_knife', 4, 3, 24, 6] },
  crossbow: { crossbow: ['w_crossbow', 8, 12, 42, 20] },
  chain_scythe: { chain_scythe: ['w_chain_scythe', 6, 7, 38, 16] },
  spellblade: { spellblade: ['w_spellblade', 7, 8, 48, 16], focus: ['w_focus', 4, 10, 8, 20] },
  rune_greatsword: { greatsword: ['w_greatsword', 12, 15, 78, 33] },
  arcane_staff: { arcane_staff: ['w_arcane_staff', 26, 20, 86, 31] },
  orb_focus: { orb: ['w_orb', 2, 10, 15, 19], focus: ['w_focus', 4, 10, 8, 20] },
  warlock_rod: { rod: ['w_rod_warlock', 6, 9, 44, 16], shield: ['w_shield_ward', 10, 14, 27, 27] },
  rod_grimoire: { rod: ['w_rod_grimoire', 6, 6, 44, 15], grimoire: ['w_grimoire', 2, 11, 17, 22] },
  scepter_shield: { scepter: ['w_scepter', 6, 10, 40, 19], shield: ['w_shield_sun', 10, 14, 27, 27] },
  sacred_staff: { sacred_staff: ['w_sacred_staff', 26, 19, 88, 36] },
  harp: { harp: ['w_harp', 8, 21, 34, 41, 0, .7] },
  battle_zither: { zither: ['w_zither', 4, 8, 40, 14, 0, .8] },
  spirit_glaive: { spirit_glaive: ['w_spirit_glaive', 12, 29, 105, 42] },
  claws: { claw: ['w_claw', 5, 7, 27, 14] },
  beast_staff: { beast_staff: ['w_beast_staff', 26, 25, 82, 39] },
  chakrams: { chakram: ['w_chakram', 3, 10, 21, 20] },
  magic_cards: { card: ['w_card', 1, 8, 11, 16] },
  talisman: { talisman: ['w_talisman', 2, 11, 14, 22] },
  ritual_fan: { fan: ['w_fan', 4, 24, 55, 47, 0, .7] }
});
// Form skins: while an Arcane State is active, some weapons take a form-specific sheet (Schattenlanzer: the spear
// becomes a jagged shadow spear during A13 Totenmaske). setWeaponSkinForm is set per draw by drawHeldWeapon.
const FORM_SKINS = Object.freeze({ A13: { spear: { spear: ['w_shadow_spear', 17, 11, 69, 22] }, glaive: { glaive: ['w_shadow_spear', 17, 11, 69, 22] } } });
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
  const [name, gx, gy, w, h, pre = 0, sc0 = 1] = e; const meta = SPELL_SPRITE_SHEETS[name]; const n = meta?.frames ?? 1; const sc = sizeOf(w * 2 / (meta?.res ?? 2), sc0); /* native-pixel sheets (res 1, user 21 Nov 2026) count like the old hd sheets for the length cap */
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
// Crisp pixel helpers for the guards below.
const gpx = (ctx, x, y, sz, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz); };
export function drawGuardSheet(ctx, weaponId, kind, t = 0, accent = '#7fd8ff') {
  const sheets = WEAPON_SHEETS[weaponId]; if (!sheets) return false;
  const main = Object.keys(sheets).find((k) => k !== 'shield'); const e = sheets[main];
  // Bow: the bow raised upright as a brace, three crisp wind arcs in front.
  if (kind === 'bow' && e && spellSheetReady(e[0])) { const sc = sizeOf(e[3], e[6] ?? 1); drawSpellSprite(ctx, e[0], 0, -4, 0, { anchor: 'center', scale: sc }); for (let i = 0; i < 3; i++) { const r = 22 + i * 6; for (let a = -.7; a <= .7; a += .06) gpx(ctx, 4 + Math.cos(a) * r, Math.sin(a) * r * 1.2, 2, i ? accent : '#ffffff'); } return true; }
  // Casters: a turning hexagonal rune barrier — dark frame, accent rim, glyph nodes (opaque pixels, no soft fill).
  if (kind === 'barrier') { const pts = Array.from({ length: 6 }, (_, i) => { const a = t * .8 + i * Math.PI / 3; return [Math.cos(a) * 12 + 6, Math.sin(a) * 32]; });
    for (let i = 0; i < 6; i++) { const [ax, ay] = pts[i]; const [bx, by] = pts[(i + 1) % 6]; const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2); for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n; const y = ay + (by - ay) * k / n; gpx(ctx, x, y, 4, '#0e1220'); gpx(ctx, x, y, 2, accent); } }
    for (let i = 0; i < 6; i++) gpx(ctx, pts[i][0], pts[i][1], 4, '#ffffff');
    for (let y = -16; y <= 16; y += 2) gpx(ctx, 6, y, 1, accent); for (let x = 0; x <= 12; x += 2) gpx(ctx, x, 0, 1, accent); return true; }
  // Fists / claws: the two drawn gauntlets crossed in front, an accent ring.
  if (kind === 'fist' && e && spellSheetReady(e[0])) { const sc = sizeOf(e[3], e[6] ?? 1); const meta = SPELL_SPRITE_SHEETS[e[0]]; const k = (meta?.w ?? e[3]) / e[3] * sc;
    for (const sg of [1, -1]) { ctx.save(); ctx.rotate(sg * .6 - Math.PI / 2); drawSpellSprite(ctx, e[0], 0, (e[3] / 2 - e[1]) * k - 10, (e[4] / 2 - e[2]) * k, { anchor: 'center', scale: sc }); ctx.restore(); }
    for (let a = 0; a < Math.PI * 2; a += .08) gpx(ctx, Math.cos(a) * 20, -4 + Math.sin(a) * 28, 2, accent); return true; }
  if (kind === 'bow' || kind === 'fist') return false;
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
