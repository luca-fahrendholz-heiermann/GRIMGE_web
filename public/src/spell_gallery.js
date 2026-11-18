// GRIMGE Prototype — the Spell Gallery (user, 19 Nov 2026): a Training map that runs on and on to the side. Along it stand
// clones of the player's own character, one after another, each with a straw dummy to its right, and every clone casts
// one spell of the game again and again — so one can walk along the row and watch every spell.
//   • one station per distinct spell of the recipe book (spell_catalog.js), in recipe order (base runes first);
//   • stations alternate between two depths so the row reads in 2.5D;
//   • only stations near the player are alive (clone + dummy are created when one comes close and removed behind) —
//     two hundred casting clones at once would be far too much;
//   • the clones are real Player instances, so every spell (Arcane States included) runs exactly as for the player.
import { Player, TrainingDummy } from './entities.js';
import { spells } from './spells.js';
import { SPELL_RECIPES, lookupRecipe, TARGETING } from './spell_catalog.js';
import { recognizer } from './recognizer.js';
import { takeOfferedRecast } from './recast.js';
import { endBuffForm } from './buff_forms.js';
import { groundYForDepth, ENTITY_VISUALS } from './world.js';

export const GALLERY = Object.freeze({ startX: 460, spacing: 340, dummyGap: 190, every: 3.4, maxEvery: 9, activeRange: 820, depths: Object.freeze([.36, .64]), endPad: 420 });
// What a clone copies from the player so it looks like it.
const LOOK = ['heroKey', 'weapon', 'classWeapon', 'armorId', 'armorLook', 'formRecolor', 'gear', 'cosmetics'];
const IDLE_INPUT = Object.freeze({ keys: {}, justPressedKeys: {}, mouse: { x: 0, y: 0, isDown: false, rightDown: false }, justPressedMouse: {}, gameplayBlocked: true, guardHeld: false, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false });

export const galleryOn = (game) => game?.activeMode?.id === 'gallery' && !!game?.modeState?.gallery;

// One entry per distinct spell: { id, key, runes, def }.
export function galleryEntries() {
  const seen = new Set(); const out = [];
  for (const [key, id] of Object.entries(SPELL_RECIPES)) {
    if (seen.has(id)) continue;
    const runes = key.split('+').map((rid) => recognizer.runes.find((r) => r.id === rid) ?? { id: rid });
    const def = lookupRecipe(runes); if (!def || def.isComponent) continue;
    seen.add(id); out.push({ id, key, runes, def });
  }
  return out;
}
export const galleryWidth = (count) => GALLERY.startX + count * GALLERY.spacing + GALLERY.endPad;
// How often a station casts: at least every 3.4 s, long spells get their time first (at most 9 s).
const intervalFor = (def) => Math.min(GALLERY.maxEvery, Math.max(GALLERY.every, (Number(def.duration) || 0) + 1));

export function setupGallery(game) {
  const entries = galleryEntries();
  const stations = entries.map((e, i) => ({ ...e, index: i, x: GALLERY.startX + i * GALLERY.spacing, z: GALLERY.depths[i % 2], clone: null, dummy: null, timer: .6 + (i % 3) * .4, every: intervalFor(e.def) }));
  game.modeState.gallery = { stations };
  Object.assign(game.battlefield.boundsOverride, { left: 104, right: galleryWidth(stations.length) });
  game.player.x = 240; game.player.z = .5; game.battlefield.placeOnSurface(game.player);
  return stations.length;
}

function spawnStation(game, s) {
  const P = game.player; const clone = new Player(s.x, s.z);
  for (const k of LOOK) if (P[k] !== undefined) clone[k] = P[k];
  clone.team = P.team ?? 'blue'; clone.facing = 1; clone.isGalleryClone = true; clone.mp = clone.maxMp;
  game.battlefield.placeOnSurface(clone);
  const dummy = new TrainingDummy(s.x + GALLERY.dummyGap, s.z); dummy.isGalleryDummy = true;
  game.battlefield.placeOnSurface(dummy); game.minions.push(dummy);
  s.clone = clone; s.dummy = dummy;
}
function despawnStation(game, s) {
  if (s.dummy) { const i = game.minions.indexOf(s.dummy); if (i >= 0) game.minions.splice(i, 1); }
  // Its summons go with it.
  for (const m of spells.activeSummons ?? []) if (m.owner === s.clone && !m.isDead) m.dismiss?.();
  s.clone = null; s.dummy = null;
}

// The target each kind of spell needs (as the player's targeting would build it), aimed at the station's dummy.
function targetFor(s) {
  const mode = s.def.targetingMode; const d = s.dummy; const c = s.clone;
  if (mode === TARGETING.GROUND) return { x: d.x, z: d.z };
  if (mode === TARGETING.AIM) return { x: d.x, z: d.z, aim: true };
  if (mode === TARGETING.PLACEMENT) return { x: c.x + 90, z: c.z };
  if (mode === TARGETING.ALLY) return { entity: c };
  if (mode === TARGETING.DUAL) return { a: { x: c.x + 60, z: c.z }, b: { x: d.x + 40, z: d.z } };
  return null;
}
function castStation(game, s) {
  const c = s.clone; c.mp = c.maxMp; c.facing = 1;
  if (s.def.isBuffForm) endBuffForm(c); /* an Arcane State starts again from its transformation */
  try { spells.cast(c, s.def, game, spells.qualityForRunes(s.runes), targetFor(s)); }
  catch (e) { s.error = String(e?.message ?? e); }
  takeOfferedRecast(null); /* a clone's two-stage spell never offers its second stage to the player */
}

export function updateGallery(game, dt) {
  const st = game.modeState?.gallery; if (!st) return;
  const px = game.player?.x ?? 0;
  for (const s of st.stations) {
    const near = Math.abs(s.x - px) < GALLERY.activeRange;
    if (near && !s.clone) spawnStation(game, s);
    else if (!near && s.clone) { despawnStation(game, s); continue; }
    if (!s.clone) continue;
    const c = s.clone;
    if (!s.manual) { try { c.update(dt, IDLE_INPUT, game.battlefield, game); } catch (e) { s.manual = true; s.error = String(e?.message ?? e); } }
    if (s.manual) c.animTime = (c.animTime ?? 0) + dt;
    c.x = s.x; c.z = s.z; c.facing = 1; c.vx = 0; /* the clone stays at its post */
    s.timer -= dt;
    if (s.timer <= 0) { s.timer = s.every; castStation(game, s); }
  }
}

export const galleryActors = (game) => (game.modeState?.gallery?.stations ?? []).filter((s) => s.clone).map((s) => s.clone);

// The spell's name over each clone (and its runes), so one knows what one is watching.
export function renderGalleryLabels(ctx, game) {
  const st = game.modeState?.gallery; if (!st) return;
  ctx.save(); ctx.textAlign = 'center';
  for (const s of st.stations) {
    if (!s.clone) continue;
    const y = groundYForDepth(s.z) - ENTITY_VISUALS.heroHeight - 30;
    const name = String(s.def.name ?? s.id).toUpperCase(); const runes = s.key.split('+').map((r) => r.replace(/^sig_|^buff_/, '')).join(' + ').toUpperCase();
    ctx.font = 'bold 10px monospace'; const w = Math.max(ctx.measureText(name).width, 40) + 12;
    ctx.fillStyle = 'rgba(8,6,16,.78)'; ctx.fillRect(Math.round(s.x - w / 2), Math.round(y - 12), Math.round(w), 24);
    ctx.fillStyle = s.def.color ?? '#e8dcff'; ctx.fillText(name, s.x, y);
    ctx.font = '8px monospace'; ctx.fillStyle = '#a99cc4'; ctx.fillText(`${s.index + 1}/${st.stations.length} · ${runes}`, s.x, y + 9);
  }
  ctx.restore();
}
