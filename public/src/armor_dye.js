// GRIMGE Prototype — deterministic armour dyes (user, 21 Nov 2026: "Farben der Rüstungen sollten sich deterministisch ändern
// lassen, im gleichen Stil, sowohl im einzelnen Sprite als auch in den Animationen"). An outfit's colours fall into a few
// material channels (hue bands found by art/authoring/build_character_assets.cjs and stored in the manifest; a 'metal'
// channel for the greys). A dye maps every pixel of a channel to a new hue / saturation and KEEPS ITS LIGHTNESS, so the
// drawing, shading and texture stay exactly the same. It is a pure function of the pixel colour: the same outfit dyed the
// same way looks identical in the still and in every animation frame (sprites.js caches it per frame via {key, fn}).
// Outlines (very dark), bone / highlights (light and unsaturated) and colours outside every channel stay untouched.

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l]; const d = mx - mn; const s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l];
}
export function hslToRgb(h, s, l) {
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const k = ((h % 360) + 360) % 360 / 360;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(k + 1 / 3), f(k), f(k - 1 / 3)].map((v) => Math.round(v * 255));
}
const isBoneOrSkin = (h, s, l) => h >= 12 && h <= 48 && l > .42 && s < .62;
const inBand = (h, [a, b]) => (a <= b ? h >= a && h <= b : h >= a || h <= b); /* bands may wrap around 360 */
// Which channel a pixel belongs to (or null): metal = the unsaturated mid greys, otherwise the first hue band containing it.
export function channelOf(channels, h, s, l) {
  if (l < .1) return null; /* outline */
  if (s < .14) { if (l > .82) return null; return channels.find((c) => c.metal) ?? null; } /* greys: metal, white stays */
  if (l > .74 && s < .4) return null; /* bone / pale highlights */
  if (isBoneOrSkin(h, s, l)) return null; /* bone and skin tones stay (only dark leather browns are dyed) */
  return channels.find((c) => !c.metal && inBand(h, c.band)) ?? null;
}
// dyes: { channelId: { hue, sat } } — sat is the target saturation (0…1); metal keeps a little colour (tinted steel).
export function dyePixels(data, channels, dyes) {
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue; const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const ch = channelOf(channels, h, s, l); const dye = ch && dyes[ch.id]; if (!dye) continue;
    const ns = ch.metal ? Math.min(.35, dye.sat ?? .2) : (dye.sat ?? s); const rgb = hslToRgb(dye.hue, ns, l);
    data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2];
  }
  return data;
}
const keyOf = (dyes) => Object.keys(dyes).sort().map((k) => `${k}:${Math.round(dyes[k].hue)}/${Math.round((dyes[k].sat ?? 0) * 100)}`).join(',');
// The recolour object sprites.js understands ({ key, fn(data, w, h) }), cached per frame and per dye set.
export function dyeRecolor(outfitId, channels, dyes) {
  if (!channels?.length || !dyes || !Object.keys(dyes).length) return null;
  return { key: `dye_${outfitId}_${keyOf(dyes)}`, fn: (data) => dyePixels(data, channels, dyes) };
}
// Finds an outfit's material channels from its pixels: up to `max` hue peaks (weighted by pixel count, saturated pixels
// only) as ±spread° bands, plus a metal channel when enough mid greys are present.
export function findChannels(data, max = 3, spread = 22) {
  const hist = new Float64Array(36); let greys = 0, total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue; const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]); if (l < .1) continue; total++;
    if (s < .14) { if (l <= .82) greys++; continue; } if (l > .74 && s < .4) continue; if (isBoneOrSkin(h, s, l)) continue; hist[Math.floor(h / 10) % 36] += 1;
  }
  const channels = []; const used = new Set();
  for (let n = 0; n < max; n++) {
    let best = -1; for (let b = 0; b < 36; b++) if (!used.has(b) && (best < 0 || hist[b] > hist[best])) best = b;
    if (best < 0 || hist[best] < total * .06) break;
    for (let d = -2; d <= 2; d++) used.add((best + d + 36) % 36);
    const c = best * 10 + 5; channels.push({ id: ['primary', 'secondary', 'accent'][n], band: [(c - spread + 360) % 360, (c + spread) % 360], hue: c });
  }
  if (greys > total * .08) channels.push({ id: 'metal', metal: true });
  return channels;
}
