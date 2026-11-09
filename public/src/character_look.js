// GRIMGE Prototype — character look (AGENDA 2: character creation; placeholder until the user's UI design, 10 Nov 2026).
// A look recolours the hero's standing image BEFORE the parts rig bakes it (sprites.js lookKey), so every animation frame
// carries the same colours. Hair: the dark, non-skin pixels in the head band; armour: every other non-skin pixel moves
// toward a ramp of its own luminance (outline, skin and saturated gems / flames stay).

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ramp = (...c) => c.map(hex);

// Options (id → label + ramp, dark → light). The first entry of each list is the hero's own colours.
export const LOOK_HAIR = Object.freeze({
  natural: { label: 'NATURAL', swatch: '#2a1e18', ramp: null },
  ash: { label: 'ASH', swatch: '#c4ccdc', ramp: ramp('#5a6070', '#8a92a8', '#c4ccdc', '#eef2fa') },
  ember: { label: 'EMBER', swatch: '#c43a1a', ramp: ramp('#4a1208', '#8a2410', '#c43a1a', '#f07a3a') },
  frost: { label: 'FROST', swatch: '#2a62d8', ramp: ramp('#14308a', '#2a62d8', '#5a9cff', '#b0d4ff') },
  gold: { label: 'GOLD', swatch: '#d8a83a', ramp: ramp('#5a3a10', '#9a6a1e', '#d8a83a', '#f6dc8a') },
  violet: { label: 'VIOLET', swatch: '#7a3ac4', ramp: ramp('#2a1048', '#4e2286', '#7a3ac4', '#b88af0') }
});
export const LOOK_ARMOUR = Object.freeze({
  natural: { label: 'NATURAL', swatch: '#8a7a62', ramp: null },
  steel: { label: 'STEEL', swatch: '#8aa0b8', ramp: ramp('#1a2230', '#34465c', '#5a7290', '#8aa0b8', '#cfdcea') },
  shadow: { label: 'SHADOW', swatch: '#3a3248', ramp: ramp('#0e0c14', '#1e1a28', '#3a3248', '#5e5470', '#8e84a0') },
  ember: { label: 'EMBER', swatch: '#a8502a', ramp: ramp('#2a0e08', '#5a1e10', '#8a3418', '#c8642e', '#f0a466') },
  verdant: { label: 'VERDANT', swatch: '#4a8a4a', ramp: ramp('#0e2010', '#1e3e20', '#346a36', '#5a9a52', '#a0d08a') },
  royal: { label: 'ROYAL', swatch: '#3a5ab8', ramp: ramp('#0c1438', '#1a2a6a', '#2e48a0', '#5a7ad0', '#b0c4f4') }
});
export const DEFAULT_LOOK = Object.freeze({ hair: 'natural', armour: 'natural' });

export function normalizeLook(look) {
  return { hair: LOOK_HAIR[look?.hair] ? look.hair : 'natural', armour: LOOK_ARMOUR[look?.armour] ? look.armour : 'natural' };
}
export const isDefaultLook = (look) => { const l = normalizeLook(look); return l.hair === 'natural' && l.armour === 'natural'; };
export const lookId = (look) => { const l = normalizeLook(look); return `${l.hair}-${l.armour}`; };

const lum = (r, g, b) => (.3 * r + .59 * g + .11 * b) / 255;
const isSkin = (r, g, b) => r > g && g > b && r - b > 38 && r > 80;
// Strongly saturated pixels (gems, magic flames) keep their colour.
const isGem = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) > 95;

// Where the hair is per base figure (source pixels x0, y0, x1, y1) — keeps horns and shoulder fur out of the hair colour.
const HAIR_BOX = Object.freeze({ thesen: [29, 4, 56, 46], thesen_focus: [29, 4, 56, 46], xame: [28, 4, 55, 38] });

// Recolour RGBA data of a standing image in place (heroKey picks the hair box; unknown figures use the head band).
export function applyLook(data, w, h, look, heroKey = null) {
  const l = normalizeLook(look); const hair = LOOK_HAIR[l.hair].ramp; const arm = LOOK_ARMOUR[l.armour].ramp;
  if (!hair && !arm) return;
  const n = w * h; let top = h; let bot = 0;
  for (let i = 0; i < n; i++) { if (data[i * 4 + 3] < 128) continue; const y = (i / w) | 0; if (y < top) top = y; if (y > bot) bot = y; }
  const head = top + (bot - top) * .3;
  for (let i = 0; i < n; i++) {
    if (data[i * 4 + 3] < 128) continue;
    const r = data[i * 4]; const g = data[i * 4 + 1]; const b = data[i * 4 + 2]; const L = lum(r, g, b); const y = (i / w) | 0;
    if (L < .08 || isSkin(r, g, b) || isGem(r, g, b)) continue;
    let c = null; let k = 1;
    // Hair: dark, non-skin pixels in the hair box (or the head band); light horns / bone stay armour.
    const x = i % w; const box = HAIR_BOX[heroKey];
    const inHair = box ? x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] && L <= .3 : y < head && L <= .42;
    if (inHair) { if (hair) c = hair[Math.min(hair.length - 1, Math.floor((L - .08) / (box ? .22 : .34) * hair.length))]; else continue; }
    else if (arm) { c = arm[Math.min(arm.length - 1, Math.floor(L * arm.length))]; k = .6; }
    if (!c) continue;
    data[i * 4] = r + (c[0] - r) * k; data[i * 4 + 1] = g + (c[1] - g) * k; data[i * 4 + 2] = b + (c[2] - b) * k;
  }
}
