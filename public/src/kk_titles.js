// GRIMGE Prototype — Kronenkrieg titles (user, 20 Nov 2026: "während des Spiels Titel bekommen wie bei Animes, die Rollenspiele
// nachbilden — wenn man viel Material sammelt, Banditen tötet, Gegner tötet, viele Burgen eingenommen hat oder viele Armeen
// besitzt; das motiviert"). The round counts deeds; each step of a deed earns a title (announced, shown under the level), and
// every title gives a small lasting edge: +1 % damage for the player and +1 % life for his army.
import { kkState, kkOn } from './kk_world.js';
import { audio } from './audio.js';
import { combat } from './combat.js';

// deed → steps [count, title]
export const TITLES = Object.freeze({
  mats: [[50, 'Sammler'], [200, 'Schatzhorter'], [500, 'Herr der Vorräte']],
  bandits: [[10, 'Banditenschreck'], [30, 'Geißel der Abtrünnigen'], [80, 'Schattenrichter']],
  kills: [[25, 'Klingenwanderer'], [75, 'Schlachtenwolf'], [150, 'Der Unbezwingbare']],
  heroes: [[1, 'Kronenbrecher'], [3, 'Königsmörder']],
  castles: [[1, 'Burgherr'], [3, 'Eroberer'], [6, 'Herrscher der Mark']],
  army: [[15, 'Kommandant'], [30, 'Feldherr'], [50, 'Kriegsfürst']],
  dinos: [[1, 'Drachenzähmer'], [3, 'Herr der Urdrachen']],
  nodes: [[30, 'Holzfäller und Steinbrecher'], [100, 'Bezwinger der Wildnis']],
  events: [[3, 'Abenteurer'], [8, 'Legende der Lande']]
});
export const TITLE_BONUS = .01;
// Counts a deed (+n) and grants the titles that were reached; returns the new titles.
export function addDeed(game, deed, n = 1) {
  const kk = kkState(game); if (!kk || !TITLES[deed]) return []; kk.deeds ??= {}; kk.titles ??= [];
  kk.deeds[deed] = (kk.deeds[deed] ?? 0) + n; return grantTitles(game, deed);
}
// For counts that are a size (army), not a sum: keeps the highest value.
export function setDeedMax(game, deed, v) {
  const kk = kkState(game); if (!kk || !TITLES[deed]) return []; kk.deeds ??= {}; kk.titles ??= [];
  if (v > (kk.deeds[deed] ?? 0)) { kk.deeds[deed] = v; return grantTitles(game, deed); } return [];
}
function grantTitles(game, deed) {
  const kk = kkState(game); const got = [];
  for (const [need, name] of TITLES[deed]) if (kk.deeds[deed] >= need && !kk.titles.includes(name)) { kk.titles.push(name); got.push(name); }
  for (const name of got) {
    game.showAnnouncement?.(`TITEL ERHALTEN: »${name.toUpperCase()}«`, 2.4); audio.playRuneChime?.(1320);
    const P = game.player; combat.spawnShockwave?.(P.x, P.y - 50, 90, '#ffd24a');
  }
  return got;
}
export const titleBonus = (kk) => 1 + (kk?.titles?.length ?? 0) * TITLE_BONUS;
export const currentTitle = (kk) => kk?.titles?.[kk.titles.length - 1] ?? null;
// Each second: the army size (a size, not a sum).
export function updateTitles(game) {
  if (!kkOn(game)) return; const kk = kkState(game); kk.titleTick = (kk.titleTick ?? 0) + 1; if (kk.titleTick % 30) return;
  setDeedMax(game, 'army', kk.units.filter((u) => u.team === 'blue' && u.seat === 0 && (u.role === 'squad' || u.role === 'garrison')).length);
}
