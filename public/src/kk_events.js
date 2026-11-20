// GRIMGE Prototype — Kronenkrieg world events (user, 20 Nov 2026: "die Häuser sind irgendwann alle gelootet — es sollte Events
// geben, wo man eine Chance auf epische Runen hat, oder wo Bosse spawnen und krasse Drops haben").
// Every ~2.5 minutes something happens somewhere on the board (announced, marked on the maps):
//   • RUNENSTURM — a glowing rune chest, guarded by a few bandits: stand at it to open it; good odds for special / arcane runes;
//   • BOSS — a bandit warlord with many times the life of a fighter; beaten it drops gold, obsidian, steel and runes;
//   • NACHSCHUB — looted houses fill up again.
import { groundYForDepth } from './world.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { kkState, kkOn, revealAround } from './kk_world.js';
import { KK } from './kk_map.js';
import { addRecord } from './kk_army.js';
import { spawnItems } from './kk_items.js';
import { randomRune, gainXp } from './kk_loot.js';
import { biomeAt } from './kk_map.js';
import { dinoName } from './kk_factions.js';
import { addDeed } from './kk_titles.js';

export const EVENTS = Object.freeze({ first: 120, every: 150, openTime: 1.5, bossHp: 9, kinds: ['cache', 'dragon', 'boss', 'restock'] });
const near = (a, b, r) => Math.hypot(a.x - b.x, ((a.z ?? 0) - (b.z ?? 0)) * KK.zPx) < r;
// A spot 1500–4000 px from the player on the main board, away from places.
function eventSpot(kk, P) {
  const D = kk.map.depth ?? KK.depth;
  for (let n = 0; n < 60; n++) {
    const a = kk.rng() * Math.PI * 2; const d = 1500 + kk.rng() * 2500; const x = Math.max(400, Math.min(kk.map.width - 400, P.x + Math.cos(a) * d)); const z = Math.max(1.5, Math.min(D - 1.5, P.z + Math.sin(a) * d / KK.zPx));
    if (![...kk.map.hqs, ...kk.map.sites].some((s) => s.row === KK.main && near(s, { x, z }, 420))) return { x, z };
  }
  return { x: P.x + 1600, z: P.z };
}
// Starts an event (kind given or the next in turn); returns it.
export function startEvent(game, kind = null) {
  const kk = kkState(game); const P = game.player; kk.events ??= []; kk.eventN = (kk.eventN ?? 0) + 1;
  kind ??= EVENTS.kinds[kk.eventN % EVENTS.kinds.length];
  if (kind === 'restock') {
    const looted = kk.map.sites.filter((s) => s.kind === 'building' && s.looted); for (const s of looted.slice(0, 8)) { s.looted = false; s.chests = null; s.searchedOnce = false; }
    game.showAnnouncement?.(`NACHSCHUB — ${Math.min(8, looted.length)} HÄUSER SIND NEU BEFÜLLT`, 2.2); return { kind };
  }
  const at = eventSpot(kk, P); const ev = { id: 'event' + kk.eventN, kind: 'event', ev: kind, row: KK.main, x: Math.round(at.x), z: +at.z.toFixed(2), t: 0 };
  kk.map.sites.push(ev); kk.events.push(ev); revealAround(kk, ev, 400, 1.6);
  if (kind === 'cache') { for (let i = 0; i < 3; i++) addRecord(kk, { team: 'red', bandit: true, cls: ['Guardian', 'Ranger', 'Berserker'][i], element: null, tier: kk.time > 600 ? 2 : 1, row: ev.row, x: ev.x - 60 + i * 60, z: ev.z + .3, role: 'guard', siteId: ev.id }); game.showAnnouncement?.('RUNENSTURM — EINE RUNENTRUHE IST ERSCHIENEN (SIEHE KARTE)', 2.4); }
  else if (kind === 'dragon') { /* a wild dino-dragon of the land: beaten, it leaves its egg */ const el = biomeAt(kk.map, ev.row, ev.x, ev.z).element; ev.el = el; ev.boss = addRecord(kk, { team: 'beast', wild: true, dino: el, element: el, cls: 'Berserker', tier: 3, row: ev.row, x: ev.x, z: ev.z + .2, role: 'guard', siteId: ev.id }); game.showAnnouncement?.(`EIN WILDER ${dinoName(el).toUpperCase()} WURDE GESICHTET — SEIN EI WARTET (SIEHE KARTE)`, 2.6); }
  else { ev.boss = addRecord(kk, { team: 'red', bandit: true, boss: true, cls: 'Berserker', element: ['ignis', 'fulgur', 'umbra', 'frost'][kk.eventN % 4], tier: 3, row: ev.row, x: ev.x, z: ev.z + .2, role: 'guard', siteId: ev.id }); game.showAnnouncement?.('EIN BANDITENFÜRST ZIEHT AUF — KRASSE BEUTE (SIEHE KARTE)', 2.4); }
  audio.playRuneChime?.(520); return ev;
}
// The rune chest opens: runes with a good chance of special / arcane ones, gold.
function openCache(game, ev) {
  const kk = kkState(game); ev.done = true; const runes = [];
  for (let i = 0; i < 2; i++) { const cat = kk.rng() < .55 ? (kk.rng() < .5 ? 'simple' : 'arcane') : 'element'; const r = randomRune(game, cat, kk.rng) ?? randomRune(game, 'element', kk.rng); if (r) runes.push(r); }
  spawnItems(game, ev.x, ev.z + .05, { gold: 60, runes, materials: { steel: 6 } }, { row: ev.row, spread: 50 }); gainXp(game, 40); addDeed(game, 'events');
  combat.spawnShockwave?.(ev.x, groundYForDepth(ev.z) - 30, 120, '#d8b4ff'); audio.playRuneChime?.(1200); game.showAnnouncement?.('RUNENTRUHE GEÖFFNET', 1.4);
}
// A beaten boss drops its hoard (kk_army.js onUnitDeath calls this).
export function bossDrop(game, rec) {
  const kk = kkState(game); const runes = [];
  for (let i = 0; i < 3; i++) { const cat = i === 0 ? 'arcane' : kk.rng() < .5 ? 'simple' : 'element'; const r = randomRune(game, cat, kk.rng) ?? randomRune(game, 'element', kk.rng); if (r) runes.push(r); }
  addDeed(game, 'events'); spawnItems(game, rec.x, rec.z, { gold: 150, runes, materials: { obsidian: 6, steel: 10 }, stones: { [rec.element ?? 'ignis']: 5 } }, { row: rec.row, spread: 80 }); gainXp(game, 120);
  const ev = kk.map.sites.find((s) => s.id === rec.siteId); if (ev) ev.done = true;
  combat.spawnShockwave?.(rec.x, groundYForDepth(rec.z) - 40, 180, '#ffd24a'); combat.shakeCamera?.(8, .5); game.showAnnouncement?.('DER BANDITENFÜRST IST GEFALLEN — SEINE BEUTE LIEGT AM BODEN', 2.2);
}
// A beaten wild dino-dragon leaves its egg (hatch it at a source: the dino-dragon joins the squad), runes and gold.
export function wildDinoDrop(game, rec) {
  const kk = kkState(game); kk.items.push({ id: kk.nextItem++, kind: 'egg', row: rec.row, x: rec.x, z: rec.z, lock: .8, element: rec.dino, creature: 'dino_' + rec.dino });
  addDeed(game, 'events'); const runes = [randomRune(game, kk.rng() < .5 ? 'simple' : 'element', kk.rng)].filter(Boolean); spawnItems(game, rec.x + 40, rec.z, { gold: 90, runes, stones: { [rec.dino]: 4 } }, { row: rec.row, spread: 60 }); gainXp(game, 100);
  const ev = kk.map.sites.find((s) => s.id === rec.siteId); if (ev) ev.done = true;
  combat.spawnShockwave?.(rec.x, groundYForDepth(rec.z) - 40, 200, '#ffe9a8'); combat.shakeCamera?.(8, .5); game.showAnnouncement?.(`${dinoName(rec.dino).toUpperCase()} BESIEGT — SEIN EI LIEGT AM BODEN`, 2.2);
}
export function updateEvents(game, dt) {
  if (!kkOn(game)) return; const kk = kkState(game); const P = game.player; kk.events ??= [];
  kk.nextEventAt ??= EVENTS.first; if (kk.time >= kk.nextEventAt) { kk.nextEventAt = kk.time + EVENTS.every; startEvent(game); }
  for (const ev of kk.events) {
    ev.t += dt; if (ev.done || ev.ev !== 'cache') continue;
    const guards = kk.units.some((u) => u.siteId === ev.id && u.team !== 'blue');
    const at = P.isAlive && kk.row === ev.row && Math.abs(P.x - ev.x) < 50 && Math.abs(P.z - ev.z) * 150 < 30;
    kk.progress[ev.id] = at && !guards ? (kk.progress[ev.id] ?? 0) + dt : 0;
    if (at && guards && kk.time - (ev.hintAt ?? -9) > 3) { ev.hintAt = kk.time; game.showAnnouncement?.('ERST DIE WÄCHTER BESIEGEN', 1); }
    if (kk.progress[ev.id] >= EVENTS.openTime) openCache(game, ev);
  }
  // finished events leave the map after a while
  for (const ev of kk.events.filter((e) => e.done && !e.gone)) { ev.doneT = (ev.doneT ?? 0) + dt; if (ev.doneT > 20) { ev.gone = true; kk.map.sites.splice(kk.map.sites.indexOf(ev), 1); } }
}
// The event places: a glowing rune chest, or the warlord's banner.
export function eventActors(game) {
  const kk = kkState(game); if (!kk?.events) return []; const t = kk.time;
  return kk.events.filter((ev) => !ev.gone && ev.row === kk.row && Math.abs(ev.x - game.player.x) < 1800).map((ev) => ({ y: groundYForDepth(ev.z), render: (ctx) => {
    const y = groundYForDepth(ev.z); const x = ev.x; ctx.save();
    if (ev.ev === 'cache') {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a1d14'; ctx.fillRect(x - 22, y - 30, 44, 30); ctx.fillStyle = ev.done ? '#5a4632' : '#6b3fa0'; ctx.fillRect(x - 20, y - 28, 40, 26); ctx.fillStyle = '#ffd24a'; ctx.fillRect(x - 20, y - 18, 40, 3); ctx.fillRect(x - 3, y - 24, 6, 8);
      if (!ev.done) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .3 + .2 * Math.sin(t * 4); ctx.fillStyle = '#d8b4ff'; ctx.fillRect(x - 3, y - 160, 6, 130); ctx.beginPath(); ctx.ellipse(x, y - 20, 40, 14, 0, 0, Math.PI * 2); ctx.fill(); }
      const k = Math.min(1, (kk.progress[ev.id] ?? 0) / EVENTS.openTime); if (k > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 50, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); }
    } else if (ev.ev === 'dragon') { /* a nest of stones */ if (!ev.done) { ctx.fillStyle = '#4a3e30'; for (let k = 0; k < 7; k++) ctx.fillRect(x - 60 + k * 17, y - 6 - (k % 2) * 4, 14, 8); }
    } else if (!ev.done) { ctx.fillStyle = '#3b2b1b'; ctx.fillRect(x - 70, y - 120, 4, 120); ctx.fillStyle = '#8a1f1f'; ctx.fillRect(x - 66, y - 118, 30, 40); ctx.fillStyle = '#ffd24a'; ctx.fillRect(x - 60, y - 108, 18, 4); }
    ctx.restore();
  } }));
}
export function eventMinimapDots(game) { const kk = kkState(game); return (kk?.events ?? []).filter((ev) => !ev.done && !ev.gone).map((ev) => ({ row: ev.row, x: ev.x, z: ev.z, color: ev.ev === 'boss' ? '#ff6a3d' : ev.ev === 'dragon' ? '#ffe066' : '#d8b4ff' })); }
