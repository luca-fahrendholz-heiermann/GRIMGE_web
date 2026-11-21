// GRIMGE Prototype — which class armour the modular base character wears (user, 21 Nov 2026: every class armour with the
// base character's animations). The outfit is a set of per-frame layers (public/assets/character/anim/<class>/<clip>.png,
// drawn by sprites.outfitCanvas over the base frame); the class follows the chosen class weapon. ?outfit=<class> picks one
// for testing, ?dye=<hue> dyes its main material (armor_dye.js, deterministic in every frame).
import { WEAPON_FAMILY_OF } from './class_unlocks.js';
import { dyeRecolor } from './armor_dye.js';

export const OUTFIT_CLASSES = Object.freeze(['guardian', 'berserker', 'lancer', 'monk', 'beastborn', 'shadow', 'ranger', 'arcanist']);
// the dye channels of the animated skin per class (filled from public/assets/character/manifest.json when it loads)
const CHANNELS = {};
export function loadOutfitChannels() {
  if (typeof fetch !== 'function') return Promise.resolve(false);
  return fetch('assets/character/manifest.json').then((r) => r.json()).then((m) => { for (const c of OUTFIT_CLASSES) { const sk = m.classes?.[c]?.skins?.find((x) => x.id === m.classes[c].animatedSkin) ?? m.classes?.[c]?.skins?.[0]; if (sk?.dye) CHANNELS[c] = sk.dye; } return true; }).catch(() => false);
}
const query = () => { try { return new URLSearchParams(globalThis.location?.search ?? ''); } catch { return new URLSearchParams(''); } };
// Head layers of the modular look (character creation): manifest-relative files in the order beard → face → hair → eyes
// (sprites.outfitCanvas draws them at each frame's head anchor). look = { hair, beard, face, eyes, dye } — ids from the
// manifest; ?hair= / ?beard= / ?face= / ?eyes= override them for testing.
export function headLayers(look = {}) {
  const q = query(); const pick = (k) => q.get(k) ?? look[k] ?? null;
  const hair = pick('hair'), beard = pick('beard'), face = pick('face'), eyes = pick('eyes');
  return [beard && `beard/${beard}.png`, face && `face/${face}.png`, hair && `hair/${hair}.png`, eyes && `eyes/${eyes}.png`].filter(Boolean);
}
export function outfitFor(heroKey, classWeapon, look = null) {
  if (heroKey !== 'grimge_base') return null;
  const q = query(); const forced = q.get('outfit');
  const c = OUTFIT_CLASSES.includes(forced) ? forced : String(WEAPON_FAMILY_OF[classWeapon] ?? '').toLowerCase();
  const cls = OUTFIT_CLASSES.includes(c) ? c : null; const head = headLayers(look ?? {});
  if (!cls && !head.length) return null;
  const hueArg = q.get('dye') ?? look?.dye; const hue = Number(hueArg);
  const dye = cls && hueArg !== null && hueArg !== undefined && Number.isFinite(hue) && CHANNELS[cls] ? dyeRecolor(cls, CHANNELS[cls], { primary: { hue, sat: .6 }, secondary: { hue: hue + 10, sat: .5 } }) : null;
  return { cls, dye, head };
}
loadOutfitChannels();
