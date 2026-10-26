// GRIMGE Prototype — Arcane States that turn the hero's OWN pixels into armour (user, 26 Oct 2026: Ionspindel as a
// full armour transformation after reference art — own adaptation). A recolour maps every frame of the sprite
// (cached per frame by sprites.js) — the animation stays the hero's, only the material changes. Attachments
// (sheets) are drawn around it as before.
//   recolorFor(formId) → { key, fn(data, w, h) } or null; fn rewrites RGBA in place.

const RECOLORS = {};
export const registerFormRecolor = (id, fn) => { RECOLORS[id] = { key: 'recolor_' + id, fn }; };
export const recolorFor = (id) => RECOLORS[id] ?? null;
// The contour aura of an armour form follows its reference colours (not the generated material).
const CLOAKS = {};
export const registerFormCloak = (id, edge, inner) => { CLOAKS[id] = { edge, inner }; };
export const cloakFor = (id) => CLOAKS[id] ?? null;

// Shared armour mapper: luminance → plate ramp, 1-px trims next to the dark outline → trim ramp; face skin in the
// top fifth stays (open helmet) unless `visor` is set.
function armour(plate, trim, { visor = false } = {}) {
  const outline = plate[0].map((v) => Math.round(v * .5));
  return (d, w, h) => {
    const n = w * h; if (!(d?.length >= n * 4)) return; // no pixel data (headless canvas)
    const L = new Float32Array(n); const solid = new Uint8Array(n);
    let top = h; let bot = 0;
    for (let i = 0; i < n; i++) { if (!(d[i * 4 + 3] >= 128)) continue; solid[i] = 1; L[i] = (.3 * d[i * 4] + .59 * d[i * 4 + 1] + .11 * d[i * 4 + 2]) / 255; const y = (i / w) | 0; if (y < top) top = y; if (y > bot) bot = y; }
    const head = top + (bot - top) * .2;
    const dark = (i) => solid[i] && L[i] < .16;
    const out = new Uint8ClampedArray(d);
    for (let i = 0; i < n; i++) {
      if (!solid[i]) continue;
      const x = i % w; const y = (i / w) | 0; const r = d[i * 4]; const g = d[i * 4 + 1]; const b = d[i * 4 + 2];
      if (!visor && y < head && r > g && g > b && r - b > 38 && r > 80) continue; // face skin stays
      let c;
      if (L[i] < .16) c = outline;
      else {
        const nearLine = (x > 0 && dark(i - 1)) || (x < w - 1 && dark(i + 1)) || (y > 0 && dark(i - w)) || (y < h - 1 && dark(i + w));
        if (nearLine && L[i] > .42) c = trim[Math.min(trim.length - 1, Math.floor((L[i] - .42) / .58 * trim.length))];
        else c = plate[Math.min(plate.length - 1, Math.floor(L[i] * 1.2 * plate.length))];
      }
      out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2];
    }
    d.set(out);
  };
}
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const ramp = (...c) => c.map(hex);

// T06 Ionspindel: dark navy plate, gold trims, a green aura.
registerFormRecolor('T06', armour(ramp('#0b0f1a', '#141c2e', '#1f2c44', '#2f4262', '#4a6488'), ramp('#7a5418', '#b8862e', '#e6c062', '#fff0b8')));
registerFormCloak('T06', '#2fd070', '#a8ffc8');
