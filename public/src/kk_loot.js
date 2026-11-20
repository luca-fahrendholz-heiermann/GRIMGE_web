// GRIMGE Prototype — Kronenkrieg in play, part 2: loot and the round level (GRIMGE_KRONENKRIEG.md §4–§5, §7).
// The backpack (gold, building materials, element stones, weapons, potions), searching buildings, mining gold veins,
// waystones, rune cards found in the round (sealed until their level — a sealed rune still takes a deck slot), the
// round level with its unlocks, the loot pile a dead hero leaves behind and the return at the own main castle.
import { recognizer } from './recognizer.js';
import { runeCategory } from './progression.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { CASTLE_CLASSES, biomeAt, kkDistance } from './kk_map.js';
import { levelForXp, xpProgress, deckSlots, gateFor, rollChest, lootTier, LEVEL_UNLOCKS, XP, MATERIALS, FUSE_GATE } from './kk_progress.js';
import { kkState, kkOn, revealAround, isRevealed, elementColor, applyBounds } from './kk_world.js';
import { KK } from './kk_map.js';
import { spawnItems, pickupItem, updateItemHops, updateBagUi } from './kk_items.js';

export const BACKPACK = 40;             // units of materials + stones + weapons one carries
const MINE_TIME = 2.2; const VEIN_COOLDOWN = 25; const PICK_RANGE = 44;
const MAT_NAME = Object.freeze({ wood: 'HOLZ', stone: 'STEIN', steel: 'STAHL', obsidian: 'OBSIDIAN' });
const MAT_COLOR = Object.freeze({ wood: '#b07a45', stone: '#9e9e9e', steel: '#b8d0e0', obsidian: '#7a4fb0' });
const emptyInv = () => ({ wood: 0, stone: 0, steel: 0, obsidian: 0, stones: {}, weapons: {}, potions: { hp: 0, mp: 0 } });

export function initLoot(kk) {
  Object.assign(kk, { gold: 0, inv: emptyInv(), store: emptyInv(), xp: 0, level: 1, sealed: [], items: [], progress: {}, discovered: new Set(), potionCd: 0, alive: true, nextItem: 1, log: [] });
}
export const invUnits = (inv) => MATERIALS.reduce((s, m) => s + (inv[m] ?? 0), 0) + Object.values(inv.stones).reduce((s, n) => s + n, 0) + Object.values(inv.weapons).reduce((s, n) => s + n, 0);
const say = (game, text, t = 1.4) => game.showAnnouncement?.(text, t);

// ── XP and level ───────────────────────────────────────────────────────────────────────────────────────────────────
export function gainXp(game, amount) {
  const kk = kkState(game); if (!kk || !(amount > 0)) return;
  const before = kk.level; kk.xp += amount; kk.level = levelForXp(kk.xp);
  for (let l = before + 1; l <= kk.level; l++) { say(game, `STUFE ${l} — ${LEVEL_UNLOCKS[l] ?? ''}`, 2.2); audio.playRuneChime?.(520 + l * 30); combat.spawnShockwave?.(game.player.x, game.player.y - 40, 80, '#ffe9a8'); }
  if (kk.level > before) unsealRunes(game);
}

// ── deck: found runes, seals, slots ────────────────────────────────────────────────────────────────────────────────
export function deckCount(game) {
  const P = game.player; const kk = kkState(game);
  return P.runeDeck.length + P.runeHand.length + P.slottedSpells.reduce((s, sl) => s + sl.runes.length, 0) + (kk?.sealed.length ?? 0);
}
const runePool = (category) => recognizer.runes.filter((r) => r.id !== 'buff_A04' && runeCategory(r.id) === category); /* the Bankai comes from the class trial, not from chests */
// A rune card enters the round deck — sealed while its level is not reached. Returns 'deck' | 'sealed' | 'full'.
export function giveRune(game, rune) {
  const kk = kkState(game); const P = game.player; if (!rune) return null;
  if (deckCount(game) >= deckSlots(kk.level)) return 'full';
  // the deck rules: a special rune only once, an element rune at most twice (user, 19 Nov 2026)
  const copies = [...P.runeDeck, ...P.runeHand, ...P.slottedSpells.flatMap((s) => s.runes), ...kk.sealed].filter((c) => c.id === rune.id).length;
  if (copies >= (runeCategory(rune.id) === 'element' ? 2 : 1)) return 'double';
  if (runeCategory(rune.id) === 'arcane' && !rune.soulBound && [...P.runeDeck, ...P.runeHand, ...P.slottedSpells.flatMap((s) => s.runes), ...kk.sealed].some((c) => runeCategory(c.id) === 'arcane')) { say(game, 'NUR EIN ARCANE STATE ODER BANKAI IM DECK', 1.6); return 'full'; }
  const gate = gateFor(runeCategory(rune.id));
  if (gate > kk.level) { kk.sealed.push({ ...rune, gate }); say(game, `${rune.name} — VERSIEGELT BIS STUFE ${gate}`, 1.8); return 'sealed'; }
  P.runeDeck.push(P.makeRuneCard(rune)); P.drawRunesToHand(); say(game, `RUNE: ${rune.name}`, 1.4); return 'deck';
}
function unsealRunes(game) {
  const kk = kkState(game); const P = game.player; const open = kk.sealed.filter((r) => r.gate <= kk.level);
  for (const r of open) { kk.sealed.splice(kk.sealed.indexOf(r), 1); const { gate, ...rune } = r; P.runeDeck.push(P.makeRuneCard(rune)); say(game, `${rune.name} ENTSIEGELT`, 2); }
  if (open.length) P.drawRunesToHand();
}
// Fusion follows the level too: two runes from level 2, three from level 6.
export function kkFuseAllowed(game, count) {
  const kk = kkState(game); if (!kkOn(game)) return true;
  const need = count >= 3 ? FUSE_GATE.three : FUSE_GATE.two;
  if (kk.level >= need) return true;
  say(game, `FUSION AB STUFE ${need}`); audio.playRuneFail?.(); return false;
}

// ── backpack ───────────────────────────────────────────────────────────────────────────────────────────────────────
// Adds a bundle; whatever does not fit in the backpack falls to the ground as a pile next to the player.
export function addBundle(game, b, { quiet = false } = {}) {
  const kk = kkState(game); const inv = kk.inv; const P = game.player; const rest = { materials: {}, stones: {}, weapons: [] }; let room = BACKPACK - invUnits(inv); const got = [];
  kk.gold += b.gold ?? 0; if (b.gold) got.push(`${b.gold} GOLD`);
  for (const [m, n] of Object.entries(b.materials ?? {})) { const take = Math.min(n, room); inv[m] += take; room -= take; if (take) got.push(`${take} ${MAT_NAME[m]}`); if (n > take) rest.materials[m] = n - take; }
  for (const [el, n] of Object.entries(b.stones ?? {})) { const take = Math.min(n, room); inv.stones[el] = (inv.stones[el] ?? 0) + take; room -= take; if (take) got.push(`${take} ${el.toUpperCase()}-STEIN`); if (n > take) rest.stones[el] = n - take; }
  for (const w of b.weapons ?? []) { if (room > 0) { inv.weapons[w] = (inv.weapons[w] ?? 0) + 1; room--; got.push('WAFFE'); } else rest.weapons.push(w); }
  for (const [k, n] of Object.entries(b.potions ?? {})) { inv.potions[k] = (inv.potions[k] ?? 0) + n; got.push(k === 'hp' ? 'HEILTRANK' : 'MANATRANK'); }
  const left = Object.keys(rest.materials).length + Object.keys(rest.stones).length + rest.weapons.length;
  if (left) { dropPile(game, P.x + (P.facing || 1) * 40, P.z, { gold: 0, materials: rest.materials, stones: rest.stones, weapons: rest.weapons, runes: [] }); say(game, 'RUCKSACK VOLL — DER REST LIEGT AM BODEN', 1.6); }
  else if (!quiet && got.length) say(game, got.slice(0, 4).join(' · '), 1.6);
  return got;
}
export function dropPile(game, x, z, contents) {
  const kk = kkState(game); const item = { id: kk.nextItem++, kind: 'pile', row: kk.row, x, z, lock: .6, ...contents }; kk.items.push(item); return item;
}
function takePile(game, item) {
  const kk = kkState(game);
  addBundle(game, { gold: item.gold, materials: item.materials, stones: item.stones, weapons: item.weapons, potions: item.potions }, { quiet: true });
  const left = []; for (const r of item.runes ?? []) { const got = giveRune(game, r); if (got === 'full') left.push(r); else if (got === 'double') kk.gold += 15; /* a rune one already holds turns into gold */ }
  if (left.length) { item.runes = left; item.gold = 0; item.materials = {}; item.stones = {}; item.weapons = []; item.potions = {}; say(game, 'DECK VOLL — RUNEN BLEIBEN LIEGEN'); return false; }
  say(game, 'BEUTE AUFGEHOBEN', 1.2); audio.playRuneChime?.(700); return true;
}

// ── places ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const near = (P, s, dx, dz) => Math.abs(P.x - s.x) < dx && Math.abs(P.z - s.z) < dz;
const hqOf = (kk, seat = 0) => kk.map.hqs.find((h) => h.seat === seat);
function tierAt(kk, site) {
  const hq = hqOf(kk); return lootTier({ time: kk.time, middleBand: site.row !== KK.main /* the sections above and below are the rich places */, hqDistance: kkDistance(hq, site) });
}
// One chest of a house (the walk-in interior, kk_interior.js): the loot of one floor; the first chest of a house gives XP.
export function openChest(game, site, floor = 0, at = null) {
  const kk = kkState(game); const tier = tierAt(kk, site); const biome = biomeAt(kk.map, site.row, site.x).element;
  const weapons = CASTLE_CLASSES.map((c) => c.weapon);
  const c = rollChest(kk.seed * 31 + site.x * 7 + floor * 131, tier, { biomeElement: biome, weapons });
  const runes = [];
  if (c.runeCategory) {
    const P = game.player; const held = new Set([...P.runeDeck, ...P.runeHand, ...P.slottedSpells.flatMap((s) => s.runes), ...kk.sealed].map((x) => x.id));
    const pool = runePool(c.runeCategory).filter((x) => c.runeCategory === 'element' || !held.has(x.id)); /* a special rune one holds does not come twice */
    const r = pool.length ? pool[Math.floor(((kk.seed + site.x + floor * 17) % 997) / 997 * pool.length)] : null;
    if (r) runes.push(r); else c.gold += 15;
  }
  // the chest's content falls out as single items to pick up (user: active collecting, an icon per item)
  spawnItems(game, at?.x ?? site.x, at?.z ?? site.z - .03, { gold: c.gold, materials: c.materials, stones: c.stones, weapons: c.weapons, potions: c.potions, runes }, { row: site.row, spread: 46 });
  if (!site.searchedOnce) { site.searchedOnce = true; gainXp(game, XP.search); }
  return c;
}
function updatePlaces(game, dt) {
  const kk = kkState(game); const P = game.player; if (!P.isAlive) return;
  for (const s of kk.map.sites) {
    if (s.row !== kk.row) continue;
    // discovering a place gives a little XP
    if (!kk.discovered.has(s.id) && isRevealed(kk, s.row, s.x) && Math.abs(P.x - s.x) < 700) { kk.discovered.add(s.id); gainXp(game, XP.discover); }
    if (s.kind === 'goldvein') { /* houses are walked into (kk_interior.js) */
      s.cd = Math.max(0, (s.cd ?? 0) - dt); const at = s.cd <= 0 && near(P, s, 64, .13); kk.progress[s.id] = at ? (kk.progress[s.id] ?? 0) + dt : 0;
      if (kk.progress[s.id] >= MINE_TIME) { kk.progress[s.id] = 0; s.cd = VEIN_COOLDOWN; const g = 15 + Math.floor(Math.random() * 16); kk.gold += g; say(game, `+${g} GOLD`, 1.1); gainXp(game, XP.mine); audio.playRuneChime?.(820); }
    } else if (s.kind === 'shrine' && !s.used && near(P, s, 50, .14)) {
      s.used = true; gainXp(game, XP.shrine); say(game, 'WEGSCHREIN — DIE GEGEND DECKT SICH AUF', 1.6);
      for (let x = s.x - 2600; x <= s.x + 2600; x += 200) revealAround(kk, { x });
    }
  }
  // the own main castle: carried goods are stored there safely
  const hq = hqOf(kk);
  if (hq.row === kk.row && near(P, hq, 280, .5) && invUnits(kk.inv) > 0) {
    const st = kk.store; for (const m of MATERIALS) { st[m] += kk.inv[m]; kk.inv[m] = 0; }
    for (const [e, n] of Object.entries(kk.inv.stones)) st.stones[e] = (st.stones[e] ?? 0) + n; kk.inv.stones = {};
    for (const [w, n] of Object.entries(kk.inv.weapons)) st.weapons[w] = (st.weapons[w] ?? 0) + n; kk.inv.weapons = {};
    say(game, 'IN DER HAUPTBURG EINGELAGERT', 1.2);
  }
}

// ── death, return, potions ─────────────────────────────────────────────────────────────────────────────────────────
export function respawnDelay(kk) { return Math.min(25, 6 + kk.time / 50); }
function updateLife(game, dt) {
  const kk = kkState(game); const P = game.player;
  if (kk.alive && !P.isAlive) {
    kk.alive = false;
    // everything carried falls: gold, the backpack and every rune of the round (sealed ones too)
    const all = [...P.runeDeck, ...P.runeHand, ...P.slottedSpells.flatMap((s) => s.runes)].map(({ cardId, grade, quality, runeLevel, manaCost, ...r }) => r);
    const bound = all.filter((r) => r.soulBound); /* won in a trial: never dropped */
    const runes = all.filter((r) => !r.soulBound).concat(kk.sealed.map(({ gate, ...r }) => r));
    const inv = kk.inv; dropPile(game, P.x, P.z, { gold: kk.gold, materials: { wood: inv.wood, stone: inv.stone, steel: inv.steel, obsidian: inv.obsidian }, stones: { ...inv.stones }, weapons: Object.entries(inv.weapons).flatMap(([w, n]) => Array(n).fill(w)), potions: { ...inv.potions }, runes, lock: 1.2 });
    kk.gold = 0; kk.inv = emptyInv(); kk.sealed = []; P.configureRuneDeck(bound); kk.deathRow = kk.row;
    say(game, 'GEFALLEN — DEINE BEUTE LIEGT AM BODEN', 2);
  } else if (!kk.alive && P.isAlive) {
    kk.alive = true; const hq = hqOf(kk); const dir = hq.row - kk.row;
    kk.row = hq.row; P.x = hq.x + 190; P.z = .6; applyBounds(game, kk); game.battlefield.placeOnSurface?.(P); if (dir) kk.pan = 0;
    game.modeState.dungeonCameraX = game.dungeonCameraTarget?.() ?? game.modeState.dungeonCameraX; revealAround(kk, P);
    say(game, 'ZURÜCK IN DER HAUPTBURG', 1.4);
  }
  // potions: drunk by hand (buttons, keys 1 / 2); AUTO drinks at low life / mana (a short cooldown between two)
  kk.potionCd = Math.max(0, kk.potionCd - dt); updatePotionButtons(game);
  if (P.isAlive && kk.potionCd <= 0 && kk.autoPotion) {
    if (P.hp < P.maxHp * .3 && kk.inv.potions.hp > 0) { kk.inv.potions.hp--; P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .45); kk.potionCd = 6; say(game, 'HEILTRANK', .9); combat.spawnShockwave?.(P.x, P.y - 30, 40, '#ff6b8a'); }
    else if (P.mp < P.maxMp * .2 && kk.inv.potions.mp > 0) { kk.inv.potions.mp--; P.mp = Math.min(P.maxMp, P.mp + P.maxMp * .5); kk.potionCd = 6; say(game, 'MANATRANK', .9); }
  }
}
function updateItems(game, dt) {
  const kk = kkState(game); const P = game.player; updateItemHops(kk, dt); updateBagUi(game);
  for (const it of [...kk.items]) {
    if (it.kind === 'egg') continue; /* eggs: kk_creatures.js */
    it.lock = Math.max(0, (it.lock ?? 0) - dt);
    if (it.row !== kk.row || it.lock > 0 || !P.isAlive) continue;
    if (Math.abs(P.x - it.x) < PICK_RANGE && Math.abs(P.z - it.z) * 150 < 30) {
      const taken = it.kind === 'item' ? pickupItem(game, it) : takePile(game, it);
      if (taken) kk.items.splice(kk.items.indexOf(it), 1); else it.lock = 1.5;
    }
  }
}

// Drinking a potion by hand: heal 45 % life or 50 % mana; 6 s between two.
export function drinkPotion(game, kind) {
  const kk = kkState(game); const P = game.player; if (!kk || !P.isAlive) return false;
  if (kk.potionCd > 0) { say(game, `TRANK IN ${Math.ceil(kk.potionCd)} S`, .8); return false; }
  if (!(kk.inv.potions[kind] > 0)) { say(game, kind === 'hp' ? 'KEIN HEILTRANK' : 'KEIN MANATRANK', .9); audio.playRuneFail?.(); return false; }
  kk.inv.potions[kind]--; kk.potionCd = 6;
  if (kind === 'hp') { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .45); combat.spawnShockwave?.(P.x, P.y - 30, 40, '#ff6b8a'); } else { P.mp = Math.min(P.maxMp, P.mp + P.maxMp * .5); combat.spawnShockwave?.(P.x, P.y - 30, 40, '#6bb8ff'); }
  audio.playRuneChime?.(kind === 'hp' ? 560 : 720); return true;
}
let potionUi = null;
export function closePotionButtons() { if (potionUi?.el) potionUi.el.style.display = 'none'; }
function updatePotionButtons(game) {
  const doc = globalThis.document; if (typeof doc?.createElement !== 'function' || typeof doc.body?.appendChild !== 'function') return;
  const kk = kkState(game);
  if (!potionUi) {
    const el = doc.createElement('div'); el.id = 'kk-potions';
    el.style.cssText = 'position:fixed;right:max(1vw,env(safe-area-inset-right));top:30vh;z-index:60;display:flex;gap:6px;font-family:monospace';
    el.addEventListener('pointerdown', (e) => { const b = e.target?.closest?.('[data-potion]'); if (!b) return; e.preventDefault(); e.stopPropagation(); const k = b.getAttribute('data-potion'); const g = globalThis.window?.gameWorld; if (k === 'auto') { const st = kkState(g); if (st) st.autoPotion = !st.autoPotion; } else drinkPotion(g, k); });
    doc.addEventListener('keydown', (e) => { const g = globalThis.window?.gameWorld; if (!kkOn(g) || e.target?.closest?.('input')) return; if (e.code === 'Digit1') drinkPotion(g, 'hp'); else if (e.code === 'Digit2') drinkPotion(g, 'mp'); });
    doc.body.appendChild(el); potionUi = { el, html: '' };
  }
  const btn = (k, label, col) => `<button data-potion="${k}" style="min-width:52px;min-height:40px;font:inherit;font-size:13px;color:#fff3c8;background:${col};border:2px solid #c9a95a">${label}</button>`;
  const h = btn('hp', `♥ ${kk.inv.potions.hp}`, '#5a1f2e') + btn('mp', `✦ ${kk.inv.potions.mp}`, '#1f2e5a') + btn('auto', kk.autoPotion ? 'AUTO AN' : 'AUTO AUS', '#2a2234');
  if (h !== potionUi.html) { potionUi.el.innerHTML = h; potionUi.html = h; } potionUi.el.style.display = 'flex';
}

export function updateLoot(game, dt) {
  if (!kkOn(game)) return;
  updateLife(game, dt); updatePlaces(game, dt); updateItems(game, dt);
}

// ── drawing ────────────────────────────────────────────────────────────────────────────────────────────────────────
function ring(ctx, x, y, k, color = '#ffe9a8') { ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); }
export function lootActors(game) {
  const kk = kkState(game); if (!kk) return []; const t = kk.time; const out = [];
  for (const it of kk.items) {
    if (it.row !== kk.row || it.kind !== 'pile') continue; const y = groundYForDepth(it.z); /* single items: kk_items.js */
    out.push({ y, render: (ctx) => { const bob = Math.sin(t * 4 + it.x) * 2; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(it.x, y, 16, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#6b4a2a'; ctx.fillRect(it.x - 12, y - 14 + bob, 24, 12); ctx.fillStyle = (it.runes?.length ? '#b388ff' : '#ffcf3a'); ctx.fillRect(it.x - 8, y - 20 + bob, 16, 7); if (it.runes?.length) { ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#e8dcff'; ctx.fillText(`${it.runes.length} RUNEN`, it.x, y - 26 + bob); } } });
  }
  // progress rings over a door being searched / a vein being mined
  for (const s of kk.map.sites) { const k = kk.progress[s.id]; if (s.row !== kk.row || !(k > 0) || s.kind !== 'goldvein') continue; const full = MINE_TIME; const y = groundYForDepth(s.z) - 70; out.push({ y: groundYForDepth(s.z) + .5, render: (ctx) => ring(ctx, s.x, y, Math.min(1, k / full), s.kind === 'goldvein' ? '#ffcf3a' : '#ffe9a8') }); }
  return out;
}
// The round panel (screen space, under the minimap): level, gold, materials, stones, deck slots and the sealed runes.
export function renderLootHud(ctx, game, viewW) {
  const kk = kkState(game); if (!kk) return; const x0 = viewW - 314; let y = 96;
  // fallen: the way back (user asked whether the round should end — it does not while the main castle stands)
  const P = game.player; if (!P.isAlive) { const hq = hqOf(kk); const back = !hq.fallen && kk.time < 1200; const tLeft = Math.max(0, Math.ceil(P.respawnTimer ?? 0)); ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(viewW / 2 - 260, 210, 520, 64); ctx.font = 'bold 18px monospace'; ctx.fillStyle = back ? '#ffe9a8' : '#ff6b6b'; ctx.fillText(back ? `GEFALLEN — RÜCKKEHR IN ${tLeft} S` : 'GEFALLEN — KEINE RÜCKKEHR', viewW / 2, 238); ctx.font = '11px monospace'; ctx.fillStyle = '#e8e2d0'; ctx.fillText(back ? 'solange deine Hauptburg steht · deine Beute liegt am Todesort' : 'deine Hauptburg ist gefallen oder die Grimmflut lässt keine Rückkehr mehr zu', viewW / 2, 260); ctx.restore(); }
  ctx.save(); ctx.fillStyle = 'rgba(6,6,12,.78)'; ctx.fillRect(x0 - 4, y - 4, 308, 70 + kk.sealed.length * 12);
  ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffe9a8'; ctx.fillText(`STUFE ${kk.level}`, x0, y + 9);
  ctx.fillStyle = '#2a2234'; ctx.fillRect(x0 + 70, y + 2, 120, 7); ctx.fillStyle = '#ffd24a'; ctx.fillRect(x0 + 70, y + 2, 120 * xpProgress(kk.xp), 7);
  ctx.fillStyle = '#ffcf3a'; ctx.fillText(`◉ ${kk.gold}`, x0 + 200, y + 9); y += 18;
  ctx.font = '10px monospace'; let x = x0;
  for (const m of MATERIALS) { ctx.fillStyle = MAT_COLOR[m]; ctx.fillRect(x, y, 8, 8); ctx.fillStyle = '#e8e2d0'; ctx.fillText(`${kk.inv[m]}/${kk.store[m]}`, x + 11, y + 8); x += 72; }
  y += 14; x = x0; const stones = Object.entries(kk.inv.stones).filter(([, n]) => n > 0);
  for (const [el, n] of stones.slice(0, 8)) { ctx.fillStyle = elementColor(el); ctx.fillRect(x, y, 7, 7); ctx.fillStyle = '#e8e2d0'; ctx.fillText(String(n), x + 9, y + 7); x += 34; }
  if (!stones.length) { ctx.fillStyle = '#7d7590'; ctx.fillText('keine Elementsteine', x0, y + 7); }
  y += 14; ctx.fillStyle = '#cbb8ff'; ctx.fillText(`DECK ${deckCount(game)}/${deckSlots(kk.level)} · RUCKSACK ${invUnits(kk.inv)}/${BACKPACK} · TRÄNKE ${kk.inv.potions.hp}♥ ${kk.inv.potions.mp}✦`, x0, y + 8);
  for (const r of kk.sealed) { y += 12; ctx.fillStyle = '#9a8fb0'; ctx.fillText(`🔒 ${r.name} — AB STUFE ${r.gate}`, x0, y + 8); }
  ctx.restore();
}
