// GRIMGE Prototype — hard colour steps for the pixel VFX layer (user, 21 Oct 2026: older effects
// should get hard colour steps and small white cores instead of soft glows). Rather than rewriting
// every old effect by hand, the low-res VFX layer's 2D context is hardened once:
//   • alpha snaps to a few levels (faint washes vanish, half-transparent bodies turn opaque)
//   • rgba() fill / stroke colours snap their alpha the same way
//   • radial / linear gradients become 2–3 flat colour bands (a ramp, not a blur);
//     a gradient that starts white keeps only a SMALL white core
// Pure helpers are exported for the tests; hardenContext() is applied by renderPixelated.

// Alpha levels: below .16 → gone, up to .55 → .5, above → opaque.
export function stepAlpha(a) {
  if (!(a > .16)) return 0;
  return a < .55 ? .5 : 1;
}

// ── colours ──
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0], red: [255, 0, 0, 1], yellow: [255, 255, 0, 1], cyan: [0, 255, 255, 1], magenta: [255, 0, 255, 1], orange: [255, 165, 0, 1], gold: [255, 215, 0, 1] };
export function parseColor(c) {
  if (typeof c !== 'string') return null;
  const s = c.trim().toLowerCase();
  if (NAMED[s]) return [...NAMED[s]];
  if (s[0] === '#') {
    const h = s.slice(1);
    if (h.length === 3 || h.length === 4) { const v = [...h].map((ch) => parseInt(ch + ch, 16)); return [v[0], v[1], v[2], h.length === 4 ? v[3] / 255 : 1]; }
    if (h.length === 6 || h.length === 8) { const v = [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2), 16)); return [v[0], v[1], v[2], h.length === 8 ? v[3] / 255 : 1]; }
    return null;
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/); if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((v) => !Number.isFinite(v))) return null;
  return [parts[0], parts[1], parts[2], Number.isFinite(parts[3]) ? parts[3] : 1];
}
const css = ([r, g, b, a]) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const nearWhite = (c) => c && c[0] > 232 && c[1] > 232 && c[2] > 232;

// rgba() colour with its alpha snapped (other colours pass unchanged); cached.
const cache = new Map();
export function stepColor(c) {
  if (typeof c !== 'string' || !c.includes('rgba') && !(c[0] === '#' && (c.length === 5 || c.length === 9))) return c;
  let out = cache.get(c); if (out !== undefined) return out;
  const p = parseColor(c); out = p ? css([p[0], p[1], p[2], stepAlpha(p[3])]) : c;
  if (cache.size > 4000) cache.clear(); cache.set(c, out);
  return out;
}

// Stepped stops of a gradient: [[offset, color]] → flat bands with hard edges.
export function steppedStops(stops) {
  const sorted = [...stops].sort((a, b) => a[0] - b[0]); if (sorted.length < 2) return sorted.map(([o, c]) => [o, stepColor(c)]);
  const parsed = sorted.map(([o, c]) => [o, parseColor(c), c]);
  if (parsed.some((p) => !p[1])) return sorted.map(([o, c]) => [o, stepColor(c)]); // unknown colour: keep the stops
  const out = []; const eps = 1e-4;
  for (let i = 0; i < parsed.length - 1; i++) {
    const [o0, c0] = parsed[i]; const [o1, c1] = parsed[i + 1]; const len = o1 - o0; if (len <= 0) continue;
    // A white start keeps only a small core; otherwise two even bands.
    const cuts = i === 0 && nearWhite(c0) && !nearWhite(c1) ? [0, .22, .6, 1] : [0, .5, 1];
    for (let k = 0; k < cuts.length - 1; k++) {
      const mid = k === 0 && cuts.length === 4 ? 0 : (cuts[k] + cuts[k + 1]) / 2;
      const col = lerp(c0, c1, mid); col[3] = stepAlpha(col[3]);
      const a = o0 + len * cuts[k]; const b = o0 + len * cuts[k + 1];
      out.push([Math.max(0, a), css(col)], [Math.min(1, Math.max(a, b - eps)), css(col)]);
    }
  }
  return out;
}

// Harden a 2D context in place (applied once to the pixel VFX layer).
export function hardenContext(ctx) {
  if (!ctx || ctx.__hardened) return ctx;
  const proto = Object.getPrototypeOf(ctx);
  const desc = (k) => { for (let o = proto; o; o = Object.getPrototypeOf(o)) { const d = Object.getOwnPropertyDescriptor(o, k); if (d) return d; } return null; };
  const alphaD = desc('globalAlpha'); const fillD = desc('fillStyle'); const strokeD = desc('strokeStyle');
  if (!alphaD?.set || !fillD?.set || !strokeD?.set) return ctx;
  const realGrad = (g) => {
    if (!g || !g.__stops) return g;
    const fresh = g.__make(); for (const [o, c] of steppedStops(g.__stops)) { try { fresh.addColorStop(o, c); } catch { /* invalid stop: skip */ } }
    return fresh;
  };
  try {
    Object.defineProperty(ctx, 'globalAlpha', { configurable: true, get() { return alphaD.get.call(this); }, set(v) { alphaD.set.call(this, stepAlpha(v)); } });
    Object.defineProperty(ctx, 'fillStyle', { configurable: true, get() { return fillD.get.call(this); }, set(v) { fillD.set.call(this, typeof v === 'string' ? stepColor(v) : realGrad(v)); } });
    Object.defineProperty(ctx, 'strokeStyle', { configurable: true, get() { return strokeD.get.call(this); }, set(v) { strokeD.set.call(this, typeof v === 'string' ? stepColor(v) : realGrad(v)); } });
    for (const kind of ['createRadialGradient', 'createLinearGradient']) {
      const orig = ctx[kind]; if (typeof orig !== 'function') continue;
      ctx[kind] = function (...args) {
        const g = orig.apply(this, args); const stops = [];
        // Record the stops; the stepped gradient is built when it is assigned as a style.
        return { __stops: stops, __make: () => orig.apply(ctx, args), addColorStop: (o, c) => { stops.push([o, c]); g.addColorStop?.(o, c); } };
      };
    }
    ctx.__hardened = true;
  } catch { /* some engines refuse own accessors on the context: leave it soft */ }
  return ctx;
}
