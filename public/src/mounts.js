// GRIMGE Prototype — stable mounts (user, 21 Nov 2026: "coole Reittiere für den Stall … mit Animation wenn der Base-
// Charakter drauf ist"). Fierce riding beasts in the Skyrim × old-Japan mix, hard pixel art: two ground mounts and two
// flyers. Each is summoned like any summon — the rider kneels, palm on the ground, the seal circle answers (summon pose).
// Sheets (art/authoring/gif_sheets.cjs hNNN, facing left like the Primals): assets/creatures/mounts/<id>_run.png, 8 frames.
// MOUNT_META (art/authoring/mount_meta.cjs): frame size, the body box and per frame the SEAT — the top of the crimson
// saddle — so the rider (seated clips, anchor = seat) rides every bob of the gait.
import { ART_PX } from './world.js';
import { spells, SUMMON_DEFINITIONS } from './spells.js';
import { drawHorse } from './kk_art.js';

export const MOUNT_META = Object.freeze(/*META*/{"knochenross":{"fw":165,"fh":115,"bx":0,"by":0,"bw":165,"bh":115,"seat":[[92,43],[91,42],[83,46],[83,46],[95,40],[92,41],[83,46],[82,47]]},"hauereber":{"fw":148,"fh":95,"bx":0,"by":0,"bw":148,"bh":95,"seat":[[89,26],[92,29],[105,21],[87,19],[85,18],[82,17],[104,25],[92,32]]},"kirin":{"fw":167,"fh":115,"bx":0,"by":0,"bw":167,"bh":115,"seat":[[91,50],[93,48],[95,47],[92,46],[89,44],[85,45],[91,51],[91,50]]},"wyvern":{"fw":230,"fh":170,"bx":0,"by":0,"bw":230,"bh":170,"seat":[[70,87],[65,92],[64,87],[64,87],[75,87],[75,88],[75,88],[81,85]]}}/*END*/);

// unlock = Kronenkrieg round level (the stable opens at 3; flyers follow the flight gate at 8)
export const MOUNT_DEFS = Object.freeze({
  knochenross: Object.freeze({ id: 'knochenross', name: 'KNOCHENROSS', color: '#d8c9a3', speed: 470, hp: 160, unlock: 3, flying: false, fps: 12 }),
  hauereber: Object.freeze({ id: 'hauereber', name: 'HAUEREBER', color: '#9a5a32', speed: 410, hp: 240, unlock: 4, flying: false, fps: 11 }),
  kirin: Object.freeze({ id: 'kirin', name: 'KIRIN', color: '#ffb347', speed: 500, hp: 150, unlock: 8, flying: true, fps: 12 }),
  wyvern: Object.freeze({ id: 'wyvern', name: 'WYVERN', color: '#7fa05a', speed: 540, hp: 170, unlock: 8, flying: true, fps: 8 }),
});
export const MOUNT_ORDER = Object.freeze(['knochenross', 'hauereber', 'kirin', 'wyvern']);

const SHEETS = new Map();
function sheet(id) {
  if (SHEETS.has(id)) return SHEETS.get(id); const I = globalThis.Image; const im = typeof I === 'function' ? new I() : null;
  if (im) im.src = `assets/creatures/mounts/${id}_run.png`; SHEETS.set(id, im); return im;
}
const ready = (im) => !!im && im.complete && (im.naturalWidth || im.width) > 0;
const median = (a) => { const s = [...a].sort((p, q) => p - q); return s[s.length >> 1]; };

// The gait plays while moving (flyers always beat their wings / run on air); standing, a ground mount holds frame 0.
export function mountFrame(s) {
  const def = MOUNT_DEFS[s.definition?.mountId]; const fps = def?.fps ?? 10;
  const moving = s.state === 'run' || Math.abs(s.vx ?? 0) > 5 || Math.abs(s.vz ?? 0) > .02;
  return def?.flying || moving ? Math.floor((s.animTime ?? 0) * fps) % 8 : 0;
}

// Draws the mount with its saddle on the entity's x and sets s.seatOffset (screen px from s.y up to the seat) for the rider.
export function drawMount(ctx, s) {
  const id = s.definition?.mountId; const M = MOUNT_META[id]; const im = M && sheet(id);
  if (!M || !ready(im)) { s.seatOffset = undefined; drawHorse(ctx, s); return; } /* fallback while loading / before the art exists */
  const k = ART_PX; const fr = mountFrame(s); const f = s.facing || 1; const [seatX, seatY] = M.seat[fr] ?? M.seat[0];
  const sx = median(M.seat.map((p) => p[0])); /* one fixed horizontal saddle point: no sideways jitter */
  const ground = s.y + (s.elevation ?? 0);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(s.x, ground + 1, M.bw * k * .42, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); if (s.hitFlash > 0) ctx.globalAlpha = .7;
  ctx.translate(Math.round(s.x), Math.round(s.y)); if (f > 0) ctx.scale(-1, 1); ctx.imageSmoothingEnabled = false; /* sheets face left; hard pixels */
  ctx.drawImage(im, fr * M.fw, 0, M.fw, M.fh, -sx * k, -(M.by + M.bh) * k, M.fw * k, M.fh * k);
  ctx.restore();
  s.seatOffset = (M.by + M.bh - seatY) * k;
  return true;
}

// The summon definition of a stable mount (a lesser beast's AI and stats, the mount's own body, speed and flight).
export function mountSummonDef(id) {
  const d = MOUNT_DEFS[id]; if (!d) return null;
  // role 'mount': its own summon slot (does not push out the rider's wolves) and no hunting AI (spells.js follows the owner)
  return { ...SUMMON_DEFINITIONS.lesser_beast, id: `mount_${id}`, role: 'mount', mountId: id, name: d.name, color: d.color, hp: d.hp, duration: 1e6, rise: .6, speed: Math.round(d.speed * .7), mountable: true, mountSpeed: d.speed, flying: d.flying, riderOffsetY: 46, customRender: drawMount };
}

// Summons a mount next to the player — with the summon pose (palm on the ground) and the seal circle.
export function summonMount(player, game, id, at = {}) {
  const def = mountSummonDef(id); if (!def || !player) return null;
  return spells.summon(player, def, game, spells.qualityForRunes([]), { x: at.x ?? player.x + (player.facing || 1) * 70, z: at.z ?? player.z }) ?? null;
}

// Test hook: ?mount=<id> summons that mount once at the start of any mode.
export function updateTestMount(game) {
  if (game._testMountDone || !game.player) return; game._testMountDone = true;
  let id = null; try { id = new URLSearchParams(globalThis.location?.search ?? '').get('mount'); } catch { id = null; }
  if (id && MOUNT_DEFS[id]) summonMount(game.player, game, id);
}
