// GRIMGE Prototype — Arcane States that turn the hero's OWN pixels into armour (user, 26 Oct 2026: Ionspindel as a
// full armour transformation after reference art — own adaptation). A recolour maps every frame of the sprite
// (cached per frame by sprites.js) — the animation stays the hero's, only the material changes. Attachments
// (sheets) are drawn around it as before. Everything is derived from the frame's own pixels (luminance, outline,
// bounds), so it fits every character, hairstyle and animation.
//
// Putting the armour on is staged (user: "Varianten für die Transformationsanimation"): stage 1…ARMOR_BANDS plates
// close band by band from the feet up, the newest band flashes. Taking it off runs the stages backward. (User,
// 26 Oct 2026: the first, threshold-based version only fitted one sprite — now a plain material tint; the armour
// pieces themselves are socket-anchored attachments in armor_extras.js, like Blutarsenal's weapons.)
//   recolorFor(formId, stage) → { key, fn(data, w, h) } or null (stage 0 = untouched)
//   recolorStages(formId) → the last stage (armour complete), 0 when the form has no recolour

export const ARMOR_BANDS = 8;
const RECOLORS = {};
export const registerFormRecolor = (id, armourDef) => { RECOLORS[id] = armourDef; };
export const recolorStages = (id) => RECOLORS[id]?.stages ?? 0;
export function recolorFor(id, stage = Infinity) {
  const r = RECOLORS[id]; if (!r) return null;
  const st = Math.max(0, Math.min(r.stages, Math.floor(stage)));
  if (st <= 0) return null;
  return r.memo[st] ??= { key: `recolor_${id}_${st}`, fn: (d, w, h) => r.fn(d, w, h, st) };
}
// The contour aura of an armour form follows its reference colours (not the generated material).
const CLOAKS = {};
export const registerFormCloak = (id, edge, inner) => { CLOAKS[id] = { edge, inner }; };
export const cloakFor = (id) => CLOAKS[id] ?? null;

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const ramp = (...c) => c.map(hex);

// Shared armour tint: every opaque pixel moves part of the way (`strength`) toward the plate ramp colour of its
// own luminance — no thresholds, no skin / eye / outline detection, so it reads the same on every character and
// keeps all of the sprite's detail. The darkest pixels (outline) stay.
function armour(plate, flashColor, { strength = .5 } = {}) {
  const flash = hex(flashColor); const stages = ARMOR_BANDS;
  const fn = (d, w, h, stage) => {
    const n = w * h; if (!(d?.length >= n * 4)) return; // no pixel data (headless canvas)
    let top = h; let bot = 0;
    for (let i = 0; i < n; i++) { if (!(d[i * 4 + 3] >= 128)) continue; const y = (i / w) | 0; if (y < top) top = y; if (y > bot) bot = y; }
    // Plates close from the feet up: everything at or below `line` is tinted; the newest band's edge flashes.
    const line = stage >= ARMOR_BANDS ? top - 1 : bot + 1 - (bot - top + 1) * stage / ARMOR_BANDS;
    const flashTo = stage < ARMOR_BANDS ? line + 2 : -1;
    for (let i = 0; i < n; i++) {
      if (!(d[i * 4 + 3] >= 128)) continue;
      const y = (i / w) | 0; if (y < line) continue;
      const R = d[i * 4]; const G = d[i * 4 + 1]; const Bc = d[i * 4 + 2]; const L = (.3 * R + .59 * G + .11 * Bc) / 255;
      if (L < .1) continue;
      const c = y <= flashTo ? flash : plate[Math.min(plate.length - 1, Math.floor(L * plate.length))]; const k = y <= flashTo ? .85 : strength;
      d[i * 4] = R + (c[0] - R) * k; d[i * 4 + 1] = G + (c[1] - G) * k; d[i * 4 + 2] = Bc + (c[2] - Bc) * k;
    }
  };
  return { fn, stages, memo: [] };
}

// T06 Ionspindel: a navy steel tint, a gold flash, a green aura.
registerFormRecolor('T06', armour(ramp('#141c2e', '#1f2c44', '#2f4262', '#4a6488', '#8aa4c8'), '#fff0b8', { strength: .55 }));
registerFormCloak('T06', '#2fd070', '#a8ffc8');
// A10 Konstruktpanzer: a green plate tint, a cyan flash, a cyan aura.
registerFormRecolor('A10', armour(ramp('#16301c', '#24502c', '#3a7a40', '#62a860', '#a0d890'), '#a8f6ff', { strength: .55 }));
registerFormCloak('A10', '#3ad0e0', '#a8f6ff');
