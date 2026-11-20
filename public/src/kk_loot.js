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

// The bag (user, 20 Nov 2026): slots that hold a stack of up to 64 of one kind; the main castle enlarges it (+4 slots a level).
export const STACK = 64; export const BAG_BASE = 10; export const BAG_MAX_LEVEL = 3;
export const bagSlots = (kk) => BAG_BASE + 4 * Math.min(BAG_MAX_LEVEL, kk?.bagLevel ?? 0);
export const bagUpgradeCost = (kk) => 60 + 60 * (kk?.bagLevel ?? 0);
const MINE_TIME = 2.2; const VEIN_COOLDOWN = 25; const PICK_RANGE = 44;
const MAT_NAME = Object.freeze({ wood: 'HOLZ', stone: 'STEIN', steel: 'STAHL', obsidian: 'OBSIDIAN' });
const emptyInv = () => ({ wood: 0, stone: 0, steel: 0, obsidian: 0, stones: {}, weapons: {}, potions: { hp: 0, mp: 0 } });

export function initLoot(kk) {
  Object.assign(kk, { gold: 0, inv: emptyInv(), store: emptyInv(), xp: 0, level: 1, sealed: [], items: [], progress: {}, discovered: new Set(), potionCd: 0, alive: true, nextItem: 1, log: [] });
}
export function slotsUsed(inv) { const st = (n) => Math.ceil((n ?? 0) / STACK); return MATERIALS.reduce((s, m) => s + st(inv[m]), 0) + Object.values(inv.stones).reduce((s, n) => s + st(n), 0) + Object.values(inv.weapons).reduce((s, n) => s + st(n), 0); }
// How many of one kind still fit: the rest of its open stack plus the free slots.
export function roomFor(kk, kind, key = null) { const inv = kk.inv; const c = kind === 'gem' ? (inv.stones[key] ?? 0) : kind === 'weapon' ? (inv.weapons[key] ?? 0) : (inv[kind] ?? 0); return (c % STACK ? STACK - c % STACK : 0) + Math.max(0, bagSlots(kk) - slotsUsed(inv)) * STACK; }
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
  const kk = kkState(game); const inv = kk.inv; const P = game.player; const rest = { materials: {}, stones: {}, weapons: [] }; const got = [];
  kk.gold += b.gold ?? 0; if (b.gold) got.push(`${b.gold} GOLD`);
  for (const [m, n] of Object.entries(b.materials ?? {})) { const take = Math.min(n, roomFor(kk, m)); inv[m] += take; if (take) got.push(`${take} ${MAT_NAME[m]}`); if (n > take) rest.materials[m] = n - take; }
  for (const [el, n] of Object.entries(b.stones ?? {})) { const take = Math.min(n, roomFor(kk, 'gem', el)); inv.stones[el] = (inv.stones[el] ?? 0) + take; if (take) got.push(`${take} ${el.toUpperCase()}-STEIN`); if (n > take) rest.stones[el] = n - take; }
  for (const w of b.weapons ?? []) { if (roomFor(kk, 'weapon', w) > 0) { inv.weapons[w] = (inv.weapons[w] ?? 0) + 1; got.push('WAFFE'); } else rest.weapons.push(w); }
  if (Object.values(b.potions ?? {}).some((n) => n > 0)) spawnItems(game, P.x + (P.facing || 1) * 30, P.z, { potions: b.potions }); /* potions are carried in the hand (kk_items.js) */
  const left = Object.keys(rest.materials).length + Object.keys(rest.stones).length + rest.weapons.length;
  if (left) { dropPile(game, P.x + (P.facing || 1) * 40, P.z, { gold: 0, materials: rest.materials, stones: rest.stones, weapons: rest.weapons, runes: [], lock: 2.5 }); say(game, 'BEUTEL VOLL — DER REST LIEGT AM BODEN', 1.6); }
  else if (!quiet && got.length) say(game, got.slice(0, 4).join(' · '), 1.6);
  return got;
}
export function dropPile(game, x, z, contents) {
  const items = spawnItems(game, x, z, contents, { row: contents.row ?? kkState(game).row, spread: 60 }); for (const it of items) it.lock = contents.lock ?? .8; return items; /* single items, each with its icon (no piles any more) */
}

// ── places ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const near = (P, s, dx, dz) => Math.abs(P.x - s.x) < dx && Math.abs(P.z - s.z) < dz;
const hqOf = (kk, seat = 0) => kk.map.hqs.find((h) => h.seat === seat);
function tierAt(kk, site) {
  const hq = hqOf(kk); return lootTier({ time: kk.time, middleBand: site.row !== KK.main /* the sections above and below are the rich places */, hqDistance: kkDistance(hq, site) });
}
// One chest of a house (the walk-in interior, kk_interior.js): the loot of one floor; the first chest of a house gives XP.
// A random rune of a kind (for drops of beaten foes): element runes may come twice, a special one the player holds does not.
export function randomRune(game, category = 'element', rng = Math.random) {
  const kk = kkState(game); const P = game.player; const held = new Set([...P.runeDeck, ...P.runeHand, ...P.slottedSpells.flatMap((s) => s.runes), ...(kk?.sealed ?? [])].map((x) => x.id));
  const pool = runePool(category).filter((x) => category === 'element' || !held.has(x.id)); return pool.length ? pool[Math.floor(rng() * pool.length)] : null;
}
// What a beaten foe drops (user, 20 Nov 2026: "die Gegner, die ich besiege, sollen Beute und Runen fallen lassen").
export function foeDrop(game, x, z, row, { gold = 8, tier = 1, element = null, weapon = null, runeChance = .06, champion = false } = {}) {
  const r = Math.random; const b = { gold, materials: {}, stones: {}, weapons: [], runes: [] }; const mat = ['wood', 'stone', 'steel', 'obsidian'][Math.min(3, Math.floor(r() * (1 + tier)))];
  if (champion || r() < .3) b.materials[mat] = (champion ? 6 : 1) + Math.floor(r() * (champion ? 6 : 3));
  if (champion || r() < .15) b.stones[element ?? ['ignis', 'aqua', 'frost', 'terra', 'ventus', 'fulgur'][Math.floor(r() * 6)]] = champion ? 3 : 1;
  if (weapon && r() < (champion ? 1 : .1)) b.weapons.push(weapon);
  const nr = champion ? 1 + (tier >= 3 ? 1 : 0) + (r() < .35 ? 1 : 0) : r() < runeChance ? 1 : 0;
  for (let i = 0; i < nr; i++) { const cat = champion && r() < .2 + tier * .05 ? (r() < .5 ? 'special' : 'arcane') : 'element'; const rune = randomRune(game, cat) ?? randomRune(game, 'element'); if (rune) b.runes.push(rune); }
  return spawnItems(game, x, z, b, { row, spread: champion ? 70 : 24 });
}
export function openChest(game, site, floor = 0, at = null) {
  const kk = kkState(game); const tier = tierAt(kk, site); const biome = biomeAt(kk.map, site.row, site.x, site.z).element;
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
    if (!kk.discovered.has(s.id) && isRevealed(kk, s.row, s.x, s.z) && Math.abs(P.x - s.x) < 700 && Math.abs(P.z - s.z) < 2.5) { kk.discovered.add(s.id); gainXp(game, XP.discover); }
    if (s.kind === 'goldvein') { /* houses are walked into (kk_interior.js) */
      s.cd = Math.max(0, (s.cd ?? 0) - dt); const at = s.cd <= 0 && near(P, s, 64, .13); kk.progress[s.id] = at ? (kk.progress[s.id] ?? 0) + dt : 0;
      if (kk.progress[s.id] >= MINE_TIME) { kk.progress[s.id] = 0; s.cd = VEIN_COOLDOWN; const g = 15 + Math.floor(Math.random() * 16); kk.gold += g; say(game, `+${g} GOLD`, 1.1); gainXp(game, XP.mine); audio.playRuneChime?.(820); }
    } else if (s.kind === 'shrine' && !s.used && near(P, s, 50, .14)) {
      s.used = true; gainXp(game, XP.shrine); say(game, 'WEGSCHREIN — DIE GEGEND DECKT SICH AUF', 1.6);
      revealAround(kk, s, 2600, 9); /* a wide square around the shrine */
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
    if (kk.held) { spawnItems(game, P.x + 20, P.z, { potions: { [kk.held.kind]: 1 } }); kk.held = null; } /* the potion in the hand falls */
    // everything carried falls: gold, the backpack and every rune of the round (sealed ones too)
    const all = [...P.runeDeck, ...P.runeHand, ...P.slottedSpells.flatMap((s) => s.runes)].map(({ cardId, grade, quality, runeLevel, manaCost, ...r }) => r);
    const bound = all.filter((r) => r.soulBound); /* won in a trial: never dropped */
    const runes = all.filter((r) => !r.soulBound).concat(kk.sealed.map(({ gate, ...r }) => r));
    const inv = kk.inv; dropPile(game, P.x, P.z, { gold: kk.gold, materials: { wood: inv.wood, stone: inv.stone, steel: inv.steel, obsidian: inv.obsidian }, stones: { ...inv.stones }, weapons: Object.entries(inv.weapons).flatMap(([w, n]) => Array(n).fill(w)), runes, lock: 1.2 }); /* every rune lies there with its own icon: anyone can take it */
    kk.gold = 0; kk.inv = emptyInv(); kk.sealed = []; P.configureRuneDeck(bound); kk.deathRow = kk.row;
    say(game, 'GEFALLEN — DEINE BEUTE LIEGT AM BODEN', 2);
  } else if (!kk.alive && P.isAlive) {
    kk.alive = true; const hq = hqOf(kk); const dir = hq.row - kk.row;
    kk.row = hq.row; P.x = hq.x + 190; P.z = hq.z + .3; /* in front of the castle stair */ applyBounds(game, kk); game.battlefield.placeOnSurface?.(P); if (dir) kk.pan = 0;
    game.modeState.dungeonCameraX = game.dungeonCameraTarget?.() ?? game.modeState.dungeonCameraX; revealAround(kk, P);
    say(game, 'ZURÜCK IN DER HAUPTBURG', 1.4);
  }
  // potions: drunk by hand (buttons, keys 1 / 2); AUTO drinks at low life / mana (a short cooldown between two)
  kk.potionCd = Math.max(0, kk.potionCd - dt); /* potions are carried in the hand and drunk with the attack (kk_items.js) */
}
function updateItems(game, dt) {
  const kk = kkState(game); const P = game.player; updateItemHops(kk, dt); updateBagUi(game);
  for (const it of [...kk.items]) {
    if (it.kind === 'egg') continue; /* eggs: kk_creatures.js */
    it.lock = Math.max(0, (it.lock ?? 0) - dt);
    if (it.row !== kk.row || it.lock > 0 || !P.isAlive) continue;
    if (Math.abs(P.x - it.x) < PICK_RANGE && Math.abs(P.z - it.z) * 150 < 30) {
      if (it.kind !== 'item') continue; const taken = pickupItem(game, it);
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
export function closePotionButtons() { /* no potion buttons any more: potions are carried in the hand (kk_items.js) */ }

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
  const kk = kkState(game); if (!kk) return;
  // fallen: the way back (user asked whether the round should end — it does not while the main castle stands)
  const P = game.player; if (!P.isAlive) { const hq = hqOf(kk); const back = game.canRespawn?.(P.team) !== false && Number.isFinite(P.respawnTimer); const tLeft = Math.max(0, Math.ceil(P.respawnTimer ?? 0)); ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(viewW / 2 - 260, 210, 520, 64); ctx.font = 'bold 18px monospace'; ctx.fillStyle = back ? '#ffe9a8' : '#ff6b6b'; ctx.fillText(back ? `GEFALLEN — RÜCKKEHR IN ${tLeft} S` : 'GEFALLEN — KEINE RÜCKKEHR', viewW / 2, 238); ctx.font = '11px monospace'; ctx.fillStyle = '#e8e2d0'; ctx.fillText(back ? 'solange deine Hauptburg steht · deine Beute liegt am Todesort' : 'deine Hauptburg ist gefallen oder steht in der Grimmflut — keine Rückkehr', viewW / 2, 260); ctx.restore(); }
  // a slim line under the map (top left): level, XP, gold — the rest lives in the bag (user: the right side must stay free)
  { const cx = 134; const ly = 134; ctx.save(); ctx.fillStyle = 'rgba(6,6,12,.7)'; ctx.fillRect(cx - 120, ly, 240, 16); ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffe9a8'; ctx.fillText(`STUFE ${kk.level}`, cx - 114, ly + 12); ctx.fillStyle = '#2a2234'; ctx.fillRect(cx - 52, ly + 5, 100, 6); ctx.fillStyle = '#ffd24a'; ctx.fillRect(cx - 52, ly + 5, 100 * xpProgress(kk.xp), 6); ctx.fillStyle = '#ffcf3a'; ctx.fillText(`◉ ${kk.gold}`, cx + 58, ly + 12); ctx.restore(); }
}
