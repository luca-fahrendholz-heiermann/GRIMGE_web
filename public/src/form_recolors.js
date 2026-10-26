// GRIMGE Prototype — Arcane States that turn the hero's OWN pixels into armour (user, 26 Oct 2026: Ionspindel as a
// full armour transformation after reference art — own adaptation). A recolour maps every frame of the sprite
// (cached per frame by sprites.js) — the animation stays the hero's, only the material changes. Attachments
// (sheets) are drawn around it as before. Everything is derived from the frame's own pixels (luminance, outline,
// bounds), so it fits every character, hairstyle and animation.
//
// Putting the armour on is staged (user: "Varianten für die Transformationsanimation"): stage 1…ARMOR_BANDS plates
// close band by band from the feet up, the newest band flashes; forms with a visor then close the face in two
// more stages (upper face with the eye slits, then all). Taking it off runs the stages backward.
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

// Shared armour mapper: luminance → plate ramp, 1-px trims next to the dark outline → trim ramp; face skin in the
// top fifth stays (open helmet) unless `visor` is set; `eyes` lights the brightest helmet pixels (eye slits), `seams`
// cuts a darker panel line every n rows so the body reads as plates.
function armour(plate, trim, { visor = false, eyes = null, seams = 0 } = {}) {
  const eye = eyes ? hex(eyes) : null;
  const outline = plate[0].map((v) => Math.round(v * .5));
  const flash = trim[trim.length - 1];
  const stages = ARMOR_BANDS + (visor ? 2 : 0);
  const fn = (d, w, h, stage) => {
    const n = w * h; if (!(d?.length >= n * 4)) return; // no pixel data (headless canvas)
    const L = new Float32Array(n); const solid = new Uint8Array(n);
    let top = h; let bot = 0;
    for (let i = 0; i < n; i++) { if (!(d[i * 4 + 3] >= 128)) continue; solid[i] = 1; L[i] = (.3 * d[i * 4] + .59 * d[i * 4 + 1] + .11 * d[i * 4 + 2]) / 255; const y = (i / w) | 0; if (y < top) top = y; if (y > bot) bot = y; }
    const head = top + (bot - top) * .2;
    // Body plates close from the feet up: everything at or below `line` is armour; the newest band flashes.
    const body = Math.min(stage, ARMOR_BANDS); const line = body >= ARMOR_BANDS ? top - 1 : bot + 1 - (bot - top + 1) * body / ARMOR_BANDS;
    const flashTo = body < ARMOR_BANDS ? line + 2 : -1;
    // Visor: closed over the upper face (eye slits) at the first visor stage, over the whole face at the second.
    const faceShut = !visor ? -1 : stage >= ARMOR_BANDS + 2 ? head : stage >= ARMOR_BANDS + 1 ? top + (head - top) * .62 : -1;
    const dark = (i) => solid[i] && L[i] < .16;
    const out = new Uint8ClampedArray(d);
    for (let i = 0; i < n; i++) {
      if (!solid[i]) continue;
      const x = i % w; const y = (i / w) | 0; if (y < line) continue;
      const r = d[i * 4]; const g = d[i * 4 + 1]; const b = d[i * 4 + 2];
      if (y < head && y >= faceShut && r > g && g > b && r - b > 38 && r > 80) continue; // face skin stays (open visor)
      let c;
      if (y <= flashTo && L[i] >= .16) c = flash;
      else if (L[i] < .16) c = outline;
      else if (eye && y < head && y < faceShut && L[i] > .7) c = eye;
      else {
        const nearLine = (x > 0 && dark(i - 1)) || (x < w - 1 && dark(i + 1)) || (y > 0 && dark(i - w)) || (y < h - 1 && dark(i + w));
        if (nearLine && L[i] > .42) c = trim[Math.min(trim.length - 1, Math.floor((L[i] - .42) / .58 * trim.length))];
        else c = plate[Math.max(0, Math.min(plate.length - 1, Math.floor(L[i] * 1.2 * plate.length) - (seams && y > head && (y - top) % seams === 0 ? 2 : 0)))];
      }
      out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2];
    }
    d.set(out);
  };
  return { fn, stages, memo: [] };
}

// T06 Ionspindel: dark navy plate, gold trims, a green aura; the face stays open.
registerFormRecolor('T06', armour(ramp('#0b0f1a', '#141c2e', '#1f2c44', '#2f4262', '#4a6488'), ramp('#7a5418', '#b8862e', '#e6c062', '#fff0b8')));
registerFormCloak('T06', '#2fd070', '#a8ffc8');
// A10 Konstruktpanzer: green armour plate, cyan trims, a visor that closes over the face (red eye slits), a cyan aura.
registerFormRecolor('A10', armour(ramp('#0c1a10', '#16301c', '#24502c', '#3a7a40', '#62a860'), ramp('#1a8aa0', '#3ad0e0', '#a8f6ff', '#ffffff'), { visor: true, eyes: '#ff2a2a', seams: 9 }));
registerFormCloak('A10', '#3ad0e0', '#a8f6ff');
