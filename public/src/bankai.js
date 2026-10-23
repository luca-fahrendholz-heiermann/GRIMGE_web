// GRIMGE Prototype — Bankai (user, 20 Oct 2026: "bankai soll sich je nach Klasse
// automatisch vom Effekt anpassen … es gibt quasi nur eine Rune"). ONE rune (the
// Arcane State A04): the class weapon is unleashed as a swarm whose pieces, colours,
// name and wound come from the chosen class. It is unlocked per class (class weapon
// level 8 or a boss drop while that class is chosen).
import { WEAPONS } from './weapons.js';

// Per class family: name, swarm piece shape (charge ritual / swarm), wound status and the
// ARSENAL (bankai_arsenal.js, user 23 Oct 2026: the whole look and every technique follow
// the weapon — a titanic axe, a spear crown, tower shields, a star bow …; swarm = blade petals).
const FAMILY_STYLE = Object.freeze({
  Guardian: { name: 'SCHILDLEGION', shape: 'shard', status: 'bleed', arsenal: 'bulwark' },
  Bladedancer: { name: 'KLINGENBLÜTE', shape: 'petal', status: 'bleed', arsenal: 'swarm' },
  Ronin: { name: 'KLINGENBLÜTE', shape: 'petal', status: 'bleed', pink: true, arsenal: 'swarm' },
  Lancer: { name: 'SPEERKRONE', shape: 'arrow', status: 'bleed', arsenal: 'lances' },
  Shadow: { name: 'SCHATTENSCHWINGEN', shape: 'fang', status: 'bleed', arsenal: 'shadow' },
  Reaper: { name: 'SENSENMOND', shape: 'fang', status: 'bleed', arsenal: 'crescent' },
  Runeblade: { name: 'RUNENKLINGEN', shape: 'rune', status: 'paralysis', arsenal: 'swordring' },
  Spiritbound: { name: 'GEISTERKLINGEN', shape: 'fang', status: 'bleed', arsenal: 'swordring' },
  Berserker: { name: 'TITANENWAFFE', shape: 'shard', status: 'paralysis', arsenal: 'colossus' },
  Ranger: { name: 'STERNENBOGEN', shape: 'arrow', status: 'bleed', arsenal: 'archer' },
  Monk: { name: 'FAUSTFEUER', shape: 'ember', status: 'burn', arsenal: 'fists' },
  Arcanist: { name: 'RUNENKREIS', shape: 'rune', status: 'paralysis', arsenal: 'sigils' },
  Occultist: { name: 'FLUCHSIEGEL', shape: 'rune', status: 'poison', arsenal: 'sigils' },
  Oracle: { name: 'LICHTSIEGEL', shape: 'rune', status: 'paralysis', arsenal: 'sigils' },
  Resonant: { name: 'KLANGRAD', shape: 'note', status: 'paralysis', arsenal: 'deck' },
  Beastborn: { name: 'FANGSTURM', shape: 'fang', status: 'bleed', arsenal: 'shadow' },
  Trickster: { name: 'KARTENWIRBEL', shape: 'card', status: 'bleed', arsenal: 'deck' },
  Fateweaver: { name: 'TALISMANFLUT', shape: 'talisman', status: 'burn', arsenal: 'deck' },
  Conjured: { name: 'FROSTBLÜTE', shape: 'petal', status: 'frozen', arsenal: 'swarm' }
});
const DEFAULT_STYLE = { name: 'KLINGENBLÜTE', shape: 'petal', status: 'bleed', pink: true, arsenal: 'swarm' };
export const PINK_MAT = Object.freeze({ kind: 'crystal', dark: '#4a1530', body: '#ec407a', facet: '#f8bbd0', vein: '#ad1457', edge: '#fce4ec', spark: '#fff0f5', core: '#ffffff', glow: 'rgba(236,64,122,', edgeGlow: 'rgba(255,255,255,' });

const hex = (h) => { const n = parseInt(String(h).replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * k));
// The swarm material from the weapon's accent colour.
function matFrom(accent) {
  const [r, g, b] = hex(accent);
  return Object.freeze({ kind: 'crystal', dark: mix(accent, '#000000', .65), body: accent, facet: mix(accent, '#ffffff', .35), vein: mix(accent, '#000000', .35), edge: mix(accent, '#ffffff', .45), spark: mix(accent, '#ffffff', .7), core: '#ffffff', glow: `rgba(${r},${g},${b},`, edgeGlow: 'rgba(255,255,255,' });
}
const cache = new Map();
export function bankaiStyleFor(weaponId) {
  const key = weaponId ?? '';
  if (cache.has(key)) return cache.get(key);
  const w = WEAPONS[weaponId];
  const base = (w && FAMILY_STYLE[w.family]) || DEFAULT_STYLE;
  const style = Object.freeze({ ...base, weaponId: weaponId ?? null, family: w?.family ?? null, mat: base.pink || !w ? PINK_MAT : matFrom(w.accent ?? w.color ?? '#ec407a') });
  cache.set(key, style);
  return style;
}
// The style that is drawn right now: the weapon the Wizard HOLDS (user, 21 Oct 2026: "je nach
// Waffe die man trägt") — a picked-up weapon first, else the class weapon; bare hands: blade petals.
export const bankaiStyleOf = (actor) => bankaiStyleFor(actor?.weapon ?? actor?.classWeapon ?? null);
export const activeBankaiStyle = () => bankaiStyleOf(globalThis.window?.gameWorld?.player);
