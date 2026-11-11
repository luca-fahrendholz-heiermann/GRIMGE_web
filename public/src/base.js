// GRIMGE Prototype — the base (user, 11 Nov 2026): the player's headquarters, a big tall hall to walk through — the
// story's home, with no effect on Castle Siege (there only the look of castle and minions is customised later). The menu
// points stand in it as stations (wardrobe, deck, rune altar, war table = campaign, training dummy, the gate back to the
// hub), and an armoury wing shows one armour stand per class with the class level above it; tapping a stand opens the
// class page for that class. First version: fixed stations, no free placing yet, no wandering Primals yet.
import { groundYForDepth } from './world.js';
import { CLASSES, classWeapons } from './classes.js';
import { openRuneVault, isRuneVaultOpen } from './rune_vault.js';
import { openCampaign, isCampaignOpen } from './campaign.js';
import { isCharacterCreationOpen } from './character_creation.js';
import { ui } from './ui.js';

export const BASE_SCENE = 'base_hall';
const LEFT = 104; const STAND_GAP = 170; const ARMOURY_X = 2150;
// Which of the six stand sprites a class wears.
const STAND_OF = { Guardian: 0, Oracle: 0, Runeblade: 0, Berserker: 1, Beastborn: 1, Monk: 1, Ronin: 2, Bladedancer: 2, Lancer: 2, Spiritbound: 2, Ranger: 3, Trickster: 3, Resonant: 3, Arcanist: 4, Occultist: 4, Fateweaver: 4, Shadow: 5, Reaper: 5 };
const STATIONS = Object.freeze([
  // cell = the station's picture in base_stations.png (six cells of 153 × 186, cut by prep_frames.cjs).
  { id: 'gate', x: 190, cell: 5, label: 'ZUM HUB', scale: .8 },
  { id: 'wardrobe', x: 520, cell: 3, label: 'GARDEROBE', scale: .8 },
  { id: 'deck', x: 880, cell: 4, label: 'DECK', scale: .8 },
  { id: 'runes', x: 1230, cell: 1, label: 'RUNEN', scale: .8 },
  { id: 'campaign', x: 1560, cell: 2, label: 'KAMPAGNE', scale: .8 },
  { id: 'training', x: 1880, cell: 0, label: 'TRAINING', scale: .8 }
]);
export const baseWidth = () => ARMOURY_X + CLASSES.length * STAND_GAP + 120;
export const baseBounds = () => ({ left: LEFT, right: LEFT + baseWidth() });

const images = {};
function img(name) {
  let e = images[name];
  if (!e) { e = images[name] = { image: typeof Image === 'function' ? new Image() : null, loaded: false }; if (e.image) { e.image.onload = () => { e.loaded = true; }; e.image.src = `assets/scenes/props/${name}.png`; } }
  return e.loaded ? e.image : null;
}
// Every thing one can walk up to: the stations, then one stand per class.
export function baseSpots(profile) {
  const spots = STATIONS.map((s) => ({ ...s, x: LEFT + s.x, kind: 'station' }));
  CLASSES.forEach((c, i) => {
    const level = Math.max(1, ...classWeapons(c.id).map((w) => profile?.weaponLevel?.(w) ?? 1));
    spots.push({ id: `class:${c.id}`, kind: 'class', classId: c.id, x: LEFT + ARMOURY_X + i * STAND_GAP, img: `stand_${STAND_OF[c.id] ?? 0}`, label: c.name, sub: `STUFE ${level}`, worn: profile?.character?.classId === c.id, scale: .75 });
  });
  return spots;
}
const baseY = () => groundYForDepth(.07);
const CELL = { w: 153, h: 186 };
const sizeOf = (s) => { if (s.cell != null) { const im = img('base_stations'); return { w: CELL.w * s.scale, h: CELL.h * s.scale, im, sx: s.cell * CELL.w }; } const im = img(s.img); return im ? { w: im.width * s.scale, h: im.height * s.scale, im } : { w: 70, h: 110, im: null }; };
export function nearestSpot(game, range = 70) {
  let best = null; let bd = range;
  for (const s of baseSpots(game.profile)) { const d = Math.abs(game.player.x - s.x); if (d < bd) { bd = d; best = s; } }
  return best;
}

export function renderBase(ctx, game) {
  const y = baseY(); const near = nearestSpot(game); const t = performance.now() / 1000;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.textAlign = 'center';
  for (const s of baseSpots(game.profile)) {
    const { w, h, im, sx } = sizeOf(s); const on = near?.id === s.id;
    if (im && sx != null) ctx.drawImage(im, sx, 0, CELL.w, CELL.h, Math.round(s.x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
    else if (im) ctx.drawImage(im, Math.round(s.x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
    else { ctx.fillStyle = '#3a3048'; ctx.fillRect(s.x - 30, y - 100, 60, 100); }
    // Name plate above (the class level under it, the worn class marked); the one in reach bobs and glows.
    const ty = y - h - 16 - (on ? Math.sin(t * 5) * 2 + 2 : 0);
    ctx.font = '700 11px Cinzel, serif'; const tw = Math.max(ctx.measureText(s.label).width, s.sub ? ctx.measureText(s.sub).width : 0) + 14;
    ctx.fillStyle = on ? 'rgba(74,58,30,.95)' : 'rgba(12,9,18,.82)'; ctx.fillRect(Math.round(s.x - tw / 2), Math.round(ty - 12), Math.round(tw), s.sub ? 28 : 16);
    ctx.strokeStyle = s.worn ? '#8fd08a' : on ? '#f0d890' : '#4a3e5a'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(s.x - tw / 2) + .5, Math.round(ty - 12) + .5, Math.round(tw), s.sub ? 28 : 16);
    ctx.fillStyle = on ? '#fff3c8' : '#e8dcc4'; ctx.fillText(s.label, s.x, ty);
    if (s.sub) { ctx.font = '600 9px Cinzel, serif'; ctx.fillStyle = s.worn ? '#8fd08a' : '#b8a070'; ctx.fillText(s.worn ? `${s.sub} · AKTIV` : s.sub, s.x, ty + 12); }
  }
  ctx.restore();
}

// What a spot does. Screens that start a match leave the base first (a mode cannot change while one runs).
export function activateSpot(game, s) {
  if (!s) return false;
  if (s.kind === 'class') return !!ui.openCharacterScreen?.({ tabs: ['class'], focusClass: s.classId });
  if (s.id === 'gate') { game.returnToHub('base'); return true; }
  if (s.id === 'runes') return openRuneVault(game);
  if (s.id === 'wardrobe') return !!ui.openCharacterScreen?.({});
  if (s.id === 'deck') { game.returnToHub('base'); ui.setHubPage?.('deck'); return true; }
  if (s.id === 'campaign') { game.returnToHub('base'); return openCampaign(game); }
  if (s.id === 'training') { game.returnToHub('base'); game.setMatchMode('training'); game.startMatch(); return true; }
  return false;
}
// A tap on a spot in the world (world pixels).
export function baseTap(game, pt) {
  const y = baseY();
  for (const s of baseSpots(game.profile)) { const { w, h } = sizeOf(s); if (Math.abs(pt.x - s.x) <= w / 2 + 8 && pt.y <= y + 10 && pt.y >= y - h - 34) return activateSpot(game, s); }
  return false;
}

// The prompt button at the bottom (works with touch, mouse and E / Enter): it names the spot in reach.
let prompt = null;
export function closeBasePrompt() { if (prompt) { prompt.el.remove(); globalThis.document?.removeEventListener?.('keydown', prompt.key); prompt = null; } }
export function updateBase(game) {
  const doc = globalThis.document; const busy = isRuneVaultOpen() || isCharacterCreationOpen() || isCampaignOpen();
  if (game.input) game.input.gameplayBlocked = busy;
  if (typeof doc?.createElement !== 'function' || typeof doc.body?.appendChild !== 'function') return;
  if (!prompt) {
    const el = doc.createElement('button'); el.type = 'button'; el.id = 'base-prompt';
    el.style.cssText = 'position:fixed;left:50%;bottom:16vh;transform:translateX(-50%);z-index:60;font-family:Cinzel,serif;font-size:clamp(14px,2vw,22px);letter-spacing:.08em;color:#fff3c8;background:#6a4e1e;border:3px solid #f0d890;padding:.6em 1.4em;min-height:48px;box-shadow:0 3px 0 #2a1e0a;cursor:pointer;display:none';
    const fire = (e) => { e?.preventDefault?.(); e?.stopPropagation?.(); if (prompt?.spot) activateSpot(game, prompt.spot); };
    el.addEventListener('pointerdown', fire);
    const key = (e) => { if ((e.code === 'KeyE' || e.code === 'Enter') && prompt?.spot && !isRuneVaultOpen() && !isCharacterCreationOpen() && !isCampaignOpen() && !e.target?.closest?.('input')) fire(e); };
    doc.addEventListener('keydown', key); doc.body.appendChild(el); prompt = { el, key, spot: null };
  }
  const s = busy ? null : nearestSpot(game); prompt.spot = s;
  prompt.el.style.display = s ? 'block' : 'none';
  if (s) prompt.el.textContent = s.kind === 'class' ? `▶ ${s.label} AUSRÜSTEN` : `▶ ${s.label}`;
}
