// GRIMGE Prototype — Kronenkrieg factions (user, 20 Nov 2026, after Heroes of Might and Magic: "Fraktionen können die Elemente sein —
// bei jeder Fraktion gibt es unterschiedliche Einheiten und Kreaturen, mystische Wesen und beliebte Kreaturen wie Dinos als
// Drache + bekannter Dino + Element"). The player's class stays what it is; the castles of the map belong to element factions.
//   • every mid castle belongs to the faction of the land it stands in; taking it opens that faction's units (a conquest must open a
//     new option — the central HoMM rule);
//   • four tiers per faction: 1 the castle's own fighters, 2 the faction's signature fighters, 3 a mystic creature, 4 the faction's
//     dino-dragon (sprites: assets/creatures/dinodragons/<element>.png);
//   • a "week" (3 minutes) fills every own castle's recruiting pool; a Beast Lair (tier 3) and a Dragon Lair (tier 4) are built at the
//     castle — the castle shows them;
//   • veterans: a unit with kills gets a name and grows (the army tells a story).
import { groundYForDepth } from './world.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { kkState, kkOn, elementColor } from './kk_world.js';
import { biomeAt } from './kk_map.js';

export const WEEK = 180;
// name, trait (all units of the faction), tier 2 class, tier 3 creature, tier 4 dino-dragon (from the user's bestiary)
export const FACTIONS = Object.freeze({
  ignis: { name: 'GLUTREICH', trait: 'dmg', t2: ['Arcanist', 'Glutrufer'], t3: ['siege_golem', 'Glutkoloss'], dino: ['Magmarax', 'der Vulkantyrann', 'Tyrannosaurus', 'MAGMAODEM'] },
  ventus: { name: 'STURMBUND', trait: 'speed', t2: ['Ranger', 'Windschütze'], t3: ['storm_wolf', 'Sturmwolf'], dino: ['Zephyraptor', 'der Sturmgleiter', 'Gallimimus', 'STURMLAUF'] },
  fulgur: { name: 'DONNERKREIS', trait: 'speed', t2: ['Lancer', 'Blitzlanze'], t3: ['storm_wolf', 'Donnerwolf'], dino: ['Voltraptor', 'der Donnerjäger', 'Velociraptor', 'KETTENJAGD'] },
  terra: { name: 'STEINWACHT', trait: 'hp', t2: ['Guardian', 'Felsschild'], t3: ['siege_golem', 'Felskoloss'], dino: ['Terrankyl', 'der Gebirgswächter', 'Ankylosaurus', 'GEBIRGSSCHLAG'] },
  aqua: { name: 'GEZEITENHOF', trait: 'regen', t2: ['Arcanist', 'Flutrufer'], t3: ['rune_snake', 'Flutschlange'], dino: ['Thalasspin', 'der Gezeitendrache', 'Spinosaurus', 'GEZEITENRUF'] },
  frost: { name: 'FROSTMARK', trait: 'hp', t2: ['Ranger', 'Frostschütze'], t3: ['spirit_wolf', 'Frostwolf'], dino: ['Cryoceratops', 'der Frostbrecher', 'Triceratops', 'FROSTANSTURM'] },
  bestia: { name: 'WILDRUDEL', trait: 'dmg', t2: ['Beastborn', 'Rudelkrieger'], t3: ['storm_wolf', 'Wildwolf'], dino: ['Ravagerox', 'der Urzeitberserker', 'Carnotaurus', 'BLUTRAUSCH'] },
  construct: { name: 'ZAHNRADORDEN', trait: 'hp', t2: ['Lancer', 'Bolzenträger'], t3: ['siege_golem', 'Uhrwerkkoloss'], dino: ['Mechanosteg', 'die wandelnde Festung', 'Stegosaurus', 'FESTUNGSMODUS'] },
  void: { name: 'RISSKULT', trait: 'dmg', t2: ['Shadow', 'Rissklinge'], t3: ['rune_snake', 'Leerenschlange'], dino: ['Nihilzinos', 'der Weltenreißer', 'Therizinosaurus', 'WELTENRISS'] },
  lux: { name: 'SONNENHOF', trait: 'regen', t2: ['Monk', 'Lichtmönch'], t3: ['spirit_wolf', 'Lichtwolf'], dino: ['Luminara', 'der Sonnenrufer', 'Parasaurolophus', 'SONNENRESONANZ'] },
  natura: { name: 'HAINBUND', trait: 'regen', t2: ['Ranger', 'Hainläufer'], t3: ['spirit_wolf', 'Hainwolf'], dino: ['Sylvadrakon', 'der Weltenbaum', 'Brachiosaurus', 'LEBENSHAIN'] },
  ward: { name: 'AEGISWACHT', trait: 'hp', t2: ['Guardian', 'Schildträger'], t3: ['siege_golem', 'Wächterkoloss'], dino: ['Aegisaurus', 'der Schildbrecher', 'Pachycephalosaurus', 'AEGISKUPPEL'] },
  umbra: { name: 'SCHATTENZIRKEL', trait: 'dmg', t2: ['Shadow', 'Schattenläufer'], t3: ['rune_snake', 'Schattenschlange'], dino: ['Noctivenom', 'der Schattenjäger', 'Dilophosaurus', 'NACHTSPIEGEL'] }
});
export const TRAIT_DE = Object.freeze({ dmg: '+15 % Schaden', speed: '+15 % Tempo', hp: '+25 % Leben', regen: 'heilt sich langsam' });
// Costs per unit, growth per week, the lairs (paid from bag + main castle store).
export const TIERS = Object.freeze({
  1: { gold: 15, grow: 4, cap: 12 },
  2: { gold: 25, grow: 3, cap: 9 },
  3: { gold: 70, stones: 2, grow: 1, cap: 3, needs: 'hort' },
  4: { gold: 220, mats: { steel: 6, obsidian: 4 }, grow: .5, cap: 2, needs: 'dragon' }
});
export const LAIRS = Object.freeze({ hort: { name: 'BESTIENHORT', gold: 40, mats: { wood: 6, stone: 8 } }, dragon: { name: 'DRACHENHORT', gold: 120, mats: { steel: 10, obsidian: 5 } } });

// ── the dino-dragon sprites ─────────────────────────────────────────────────────────────────────────────────────────
const IMG = new Map();
export function dinoImage(el) {
  if (IMG.has(el)) return IMG.get(el);
  const I = globalThis.Image; if (typeof I !== 'function') { IMG.set(el, null); return null; }
  const im = new I(); im.src = `assets/creatures/dinodragons/${el}.png`; IMG.set(el, im); return im;
}
export const dinoName = (el) => FACTIONS[el]?.dino?.[0] ?? 'Urdrache';

// The faction of a castle: the land it stands in (decided once).
export function factionOf(kk, site) { if (!site.faction) site.faction = biomeAt(kk.map, site.row, site.x, site.z).element; return site.faction; }
// What a castle of a faction recruits per tier.
export function tierUnit(site, tier) {
  const f = FACTIONS[site.faction] ?? FACTIONS.terra; const el = site.faction;
  if (tier === 1) return { cls: site.cls, element: el, label: null };
  if (tier === 2) return { cls: f.t2[0], element: el, label: f.t2[1] };
  if (tier === 3) return { creature: true, kind: f.t3[0], element: el, label: f.t3[1], cls: 'Berserker' };
  return { dino: el, element: el, cls: 'Berserker', label: f.dino[0] };
}

const stockOf = (kk, m) => (kk.inv[m] ?? 0) + (kk.store[m] ?? 0);
const stoneOf = (kk, el) => (kk.inv.stones[el] ?? 0) + (kk.store.stones[el] ?? 0);
function payMat(kk, m, n) { const a = Math.min(n, kk.inv[m] ?? 0); kk.inv[m] -= a; kk.store[m] = (kk.store[m] ?? 0) - (n - a); }
function payStone(kk, el, n) { const a = Math.min(n, kk.inv.stones[el] ?? 0); kk.inv.stones[el] -= a; kk.store.stones[el] = (kk.store.stones[el] ?? 0) - (n - a); }
export function canAfford(kk, cost, el, n = 1) {
  if (kk.gold < (cost.gold ?? 0) * n) return `${(cost.gold ?? 0) * n}◉ NÖTIG`;
  for (const [m, k] of Object.entries(cost.mats ?? {})) if (stockOf(kk, m) < k * n) return `${k * n} ${m.toUpperCase()} NÖTIG`;
  if (cost.stones && stoneOf(kk, el) < cost.stones * n) return `${cost.stones * n} ${String(el).toUpperCase()}-STEINE NÖTIG`;
  return null;
}
function pay(kk, cost, el, n = 1) { kk.gold -= (cost.gold ?? 0) * n; for (const [m, k] of Object.entries(cost.mats ?? {})) payMat(kk, m, k * n); if (cost.stones) payStone(kk, el, cost.stones * n); }

// A castle comes under the player: its faction is known, a first pool waits.
export function initCastleRecruits(kk, site) { factionOf(kk, site); site.pool ??= { 1: 4, 2: 2, 3: 0, 4: 0 }; site.lairs ??= {}; }
// Builds a lair at an own castle (true = built).
export function buildLair(game, site, key) {
  const kk = kkState(game); const L = LAIRS[key]; site.lairs ??= {}; if (!L || site.lairs[key]) return { ok: false, why: 'SCHON GEBAUT' };
  if (key === 'dragon' && !site.lairs.hort) return { ok: false, why: 'ERST DER BESTIENHORT' };
  const why = canAfford(kk, L, null); if (why) return { ok: false, why };
  pay(kk, L, null); site.lairs[key] = true; site.pool[key === 'hort' ? 3 : 4] = Math.max(site.pool[key === 'hort' ? 3 : 4] ?? 0, 1);
  combat.spawnShockwave?.(site.x, groundYForDepth(site.z) - 80, 160, elementColor(site.faction)); audio.playRuneChime?.(900);
  game.showAnnouncement?.(`${L.name} GEBAUT — ${key === 'hort' ? 'STUFE 3' : dinoName(site.faction).toUpperCase()} ANWERBBAR`, 2); return { ok: true };
}
// Recruits n units of a tier from the pool into the castle (returns how many).
export function recruit(game, site, tier, n, addRecord, garrisonRoom) {
  const kk = kkState(game); const T = TIERS[tier]; initCastleRecruits(kk, site);
  if (T.needs && !site.lairs[T.needs]) return { ok: false, why: `${LAIRS[T.needs].name} FEHLT` };
  const k = Math.min(n, Math.floor(site.pool[tier] ?? 0), garrisonRoom); if (k <= 0) return { ok: false, why: (site.pool[tier] ?? 0) < 1 ? 'POOL LEER — NÄCHSTE WOCHE' : 'BURG VOLL' };
  const why = canAfford(kk, T, site.faction, k); if (why) return { ok: false, why };
  pay(kk, T, site.faction, k); site.pool[tier] -= k; const u = tierUnit(site, tier);
  for (let i = 0; i < k; i++) addRecord(kk, { team: 'blue', cls: u.cls, element: u.element, creature: u.creature, kind: u.kind, dino: u.dino, size: u.creature ? 1 : undefined, tier: tier >= 3 ? 3 : tier, faction: site.faction, row: site.row, x: site.x + (i - k / 2) * 34, z: site.z + .3, role: 'garrison', siteId: site.id });
  audio.playRuneChime?.(700 + tier * 80); return { ok: true, n: k };
}
// Each week: every own castle's pool grows (more with a stronger main castle).
export function updateFactions(game, dt) {
  if (!kkOn(game)) return; const kk = kkState(game);
  for (const s of kk.map.sites) if (s.kind === 'castle' && s.owner === 0) initCastleRecruits(kk, s);
  kk.nextWeekAt ??= WEEK; if (kk.time < kk.nextWeekAt) return; kk.nextWeekAt = kk.time + WEEK; kk.week = (kk.week ?? 1) + 1;
  const hqBonus = Math.max(0, ((kk.map.hqs.find((h) => h.seat === 0)?.level) ?? 0) - 1);
  let n = 0;
  for (const s of kk.map.sites) {
    if (s.kind !== 'castle' || s.owner !== 0) continue; n++;
    for (const t of [1, 2, 3, 4]) { const T = TIERS[t]; if (T.needs && !s.lairs?.[T.needs]) continue; s.pool[t] = Math.min(T.cap, (s.pool[t] ?? 0) + T.grow + (t <= 2 ? hqBonus : 0)); }
  }
  // upkeep: every unit above twelve costs 1 gold a week, a dino-dragon 10 — unpaid, morale drops for a week
  const army = kk.units.filter((u) => u.team === 'blue' && u.seat === 0 && (u.role === 'squad' || u.role === 'garrison'));
  const cost = Math.max(0, army.length - UPKEEP.free) * UPKEEP.perUnit + army.filter((u) => u.dino).length * UPKEEP.perDino;
  if (cost > 0) { if (kk.gold >= cost) { kk.gold -= cost; kk.unpaid = false; } else { kk.gold = 0; kk.unpaid = true; } }
  if (n || cost) game.showAnnouncement?.(`WOCHE ${kk.week}${n ? ` — ${n} ${n === 1 ? 'BURG HAT' : 'BURGEN HABEN'} NEUE REKRUTEN` : ''}${cost ? ` · SOLD ${cost}◉${kk.unpaid ? ' (NICHT BEZAHLT — MORAL SINKT)' : ''}` : ''}`, 2);
}

// ── morale and upkeep (HoMM: mixed factions lower morale; against runaway snowballing: upkeep) ─────────────────────
// Morale of the own squad: one faction +10 % damage, more than three factions −5 %; the factions without one (bandits freed etc.) do not count.
export function squadMorale(kk) {
  const facs = new Set(kk.units.filter((u) => u.team === 'blue' && u.seat === 0 && u.role === 'squad' && u.faction).map((u) => u.faction));
  return facs.size === 1 ? 1.1 : facs.size > 3 ? .95 : 1;
}
// The army roster (for the bag): stacks of equal units with their number.
export function armyRoster(kk) {
  const m = new Map(); for (const u of kk.units) { if (u.team !== 'blue' || u.seat !== 0 || (u.role !== 'squad' && u.role !== 'garrison')) continue; const name = u.dino ? dinoName(u.dino) : u.creature ? (FACTIONS[u.faction ?? u.element]?.t3?.[1] ?? u.kind) : `${u.cls}${u.element ? '·' + u.element.slice(0, 4) : ''}`; const k = name + (u.role === 'squad' ? '' : ' (Burg)'); const e = m.get(k) ?? { name: k, n: 0, el: u.faction ?? u.element, vets: 0 }; e.n++; if (u.vet) e.vets++; m.set(k, e); }
  return [...m.values()].sort((a, b) => b.n - a.n);
}
export const UPKEEP = Object.freeze({ free: 12, perUnit: 1, perDino: 10 });
// ── veterans ────────────────────────────────────────────────────────────────────────────────────────────────────────
const NAMES = ['Brann', 'Ysolde', 'Kael', 'Mirja', 'Torvin', 'Asha', 'Rurik', 'Elva', 'Dagan', 'Selin', 'Varek', 'Liora', 'Hakon', 'Nyra', 'Joren', 'Tamsin'];
export const VET = Object.freeze({ veteran: 4, elite: 10 });
// A foe fell: the nearest own unit counts the kill; at 4 it becomes a named veteran, at 10 an elite.
export function creditKill(game, at) {
  const kk = kkState(game); let best = null; let bd = 150;
  for (const m of game.minions) { if (!m.isKKUnit || m.isDead || m.team !== game.player.team || !m.rec) continue; const d = Math.hypot(m.x - at.x, (m.z - at.z) * 150); if (d < bd) { bd = d; best = m; } }
  if (!best) return null; const r = best.rec; r.kills = (r.kills ?? 0) + 1;
  if (r.kills === VET.veteran) { r.vet = 1; r.name ??= NAMES[(r.id * 7) % NAMES.length]; best.maxHp = Math.round(best.maxHp * 1.2); best.hp = Math.min(best.maxHp, best.hp + best.maxHp * .2); best.damage = Math.round(best.damage * 1.2); game.showAnnouncement?.(`${r.name.toUpperCase()} IST JETZT VETERAN`, 1.4); }
  else if (r.kills === VET.elite) { r.vet = 2; best.maxHp = Math.round(best.maxHp * 1.25); best.damage = Math.round(best.damage * 1.25); game.showAnnouncement?.(`${r.name?.toUpperCase() ?? 'EINE EINHEIT'} IST JETZT ELITE`, 1.6); }
  return best;
}
