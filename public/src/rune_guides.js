// GRIMGE Prototype — rune tracing guides.
//
// In Training, tapping a hand rune shows its glyph as a dashed template
// (start dot, stroke number and direction arrows) that the player only has
// to trace. Free drawing (DRAW) shows no template. Every guide is itself a
// valid drawing of its rune (see test_recognizer.js).
//
// Guides are authored in unit space (-1…1, y down) as lists of strokes.
const circle = (turns = 1, start = -Math.PI / 2, steps = 40) => Array.from({ length: steps + 1 }, (_, i) => {
  const a = start + i / steps * Math.PI * 2 * turns;
  return [Math.cos(a) * .8, Math.sin(a) * .8];
});

// ── Signature special glyphs (S01–S36) ───────────────────────────────────
// Special runes trade drawing time for power: each signature special has its
// own multi-stroke glyph composed of several primitives (more than one simple
// symbol), themed after its mechanic. They are recognised by point-cloud
// matching against these templates (glyph_match.js).
const L = (x0, y0, x1, y1) => [[x0, y0], [x1, y1]];
const arc = (cx, cy, r, a0, a1, steps = 16, ry = r) => Array.from({ length: steps + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / steps; return [cx + Math.cos(a) * r, cy + Math.sin(a) * ry]; });
const ring = (cx, cy, r, ry = r) => arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5, 24, ry);
const poly = (pts, closed = true) => (closed ? [...pts, pts[0]] : pts);
const ngon = (cx, cy, r, n, rot = -Math.PI / 2) => poly(Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + i * Math.PI * 2 / n) * r, cy + Math.sin(rot + i * Math.PI * 2 / n) * r]));
const zig = (x0, y0, x1, y1, n, amp) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; const dx = x1 - x0; const dy = y1 - y0; const l = Math.hypot(dx, dy) || 1; const o = (i % 2 ? 1 : -1) * amp * (i && i < n ? 1 : 0); return [x0 + dx * u - dy / l * o, y0 + dy * u + dx / l * o]; });
const wave = (x0, x1, y, amp, waves = 2, steps = 24) => Array.from({ length: steps + 1 }, (_, i) => { const u = i / steps; return [x0 + (x1 - x0) * u, y + Math.sin(u * Math.PI * 2 * waves) * amp]; });
const spiralIn = (cx, cy, r, turns = 2, steps = 36) => Array.from({ length: steps + 1 }, (_, i) => { const u = i / steps; const a = -Math.PI / 2 + u * turns * Math.PI * 2; return [cx + Math.cos(a) * r * (1 - u * .85), cy + Math.sin(a) * r * (1 - u * .85)]; });
export const SIGNATURE_GLYPHS = Object.freeze({
  // S37–S42 (design rules 18 Oct 2026): ice spikes, stepped shafts, water drill, three breathings.
  S37: [L(-.9, .65, .9, .65), [[-.8, .65], [-.55, -.1], [-.3, .65], [0, -.6], [.3, .65], [.55, -.1], [.8, .65]]],
  S38: [L(-.6, .85, -.6, .35), L(0, .85, 0, -.15), L(.6, .85, .6, -.75), L(-.85, .85, .85, .85)],
  S39: [ring(0, 0, .42), L(.3, -.3, .8, -.8), L(.3, .3, .8, .8), L(-.3, .3, -.8, .8), L(-.3, -.3, -.8, -.8)],
  S40: [wave(-.85, .85, -.3, .22, 2), wave(-.85, .85, .35, .22, 2), L(-.6, .8, .6, .8)],
  S41: [poly([[0, -.9], [.5, .1], [.3, .85], [-.3, .85], [-.5, .1]]), L(0, .55, 0, -.3)],
  S42: [[[.35, -.9], [-.25, -.05], [.2, -.05], [-.35, .9]], L(-.85, .35, .85, -.35)],
  S43: [ring(0, .45, .7, .3), L(0, .45, 0, -.85), L(-.3, -.5, .3, -.5)],
  S45: [L(0, .55, 0, -.2), poly([[0, -.95], [.32, -.2], [-.32, -.2]]), ring(0, .75, .2), L(.35, .75, .85, .55)],
  S46: [spiralIn(0, -.1, .75, 2.2), L(-.9, .9, -.35, .45)],
  S47: [ngon(0, 0, .8, 4, -Math.PI / 4), L(-.55, -.55, .55, .55), L(.55, -.55, -.55, .55), ring(0, 0, .2)],
  S49: [wave(-.85, .6, 0, .25, 2), L(.6, 0, .9, -.3), L(.6, 0, .9, .3), ngon(0, .65, .25, 6)],
  // S50 mirror prison: a crystal between two mirrors · S51 blood circle with an inverted triangle · S52 war cry: "!" between inward chevrons.
  S50: [ngon(0, 0, .55, 4), L(-.85, -.8, -.85, .8), L(.85, -.8, .85, .8)],
  S51: [ring(0, 0, .8), poly([[-.62, -.35], [.62, -.35], [0, .62]])],
  S52: [L(0, -.85, 0, .3), ring(0, .7, .13), poly([[-.9, -.5], [-.5, 0], [-.9, .5]], false), poly([[.9, -.5], [.5, 0], [.9, .5]], false)],
  S48: [arc(-.25, 0, .6, Math.PI * .55, Math.PI * 1.45), arc(.25, 0, .6, -Math.PI * .45, Math.PI * .45), L(-.15, 0, .15, 0)],
  S44: [L(-.5, .9, -.5, -.9), poly([[-.5, -.9], [.7, -.65], [.35, -.4], [.7, -.15], [-.5, -.15]], false)],
  S01: [poly([[0, -.85], [.45, -.15], [-.45, -.15]]), L(-.75, .25, .75, .25), L(-.55, .6, -.2, .5), L(.2, .5, .55, .6)],
  S02: [ring(0, .1, .55), L(-.55, -.65, -.35, -.45), L(0, -.9, 0, -.62), L(.55, -.65, .35, -.45)],
  S03: [L(0, -.85, 0, .7), L(-.4, -.55, .4, -.55), arc(0, .25, .6, Math.PI * .1, Math.PI * .9)],
  S04: [poly([[-.7, -.7], [-.15, -.7], [-.15, .55], [-.7, .55]]), poly([[.15, -.7], [.7, -.7], [.7, .55], [.15, .55]]), L(-.85, .8, .85, .8)],
  S05: [L(-.75, .75, .45, -.45), ring(.55, -.55, .25), L(-.4, .1, -.4, .45), L(-.1, -.2, -.1, .15)],
  S06: [ring(-.65, .35, .18), ring(.65, .35, .18), arc(0, .35, .47, Math.PI, Math.PI * 2, 16, .9)],
  S07: [arc(0, .1, .45, Math.PI * 1.1, Math.PI * 1.9), arc(0, .1, .8, Math.PI * 1.1, Math.PI * 1.9), L(0, -.85, 0, .85)],
  S08: [arc(0, 0, .8, Math.PI * .25, Math.PI * 1.95, 28), L(-.3, -.3, -.3, .3), L(0, -.35, 0, .35), L(.3, -.3, .3, .3)],
  S09: [ngon(0, 0, .8, 6, 0), L(-.8, 0, .8, 0), L(-.25, -.35, -.25, .35), L(.25, -.35, .25, .35)],
  S10: [L(0, -.9, 0, .5), L(-.3, -.5, .3, -.5), arc(.25, .55, .35, Math.PI, Math.PI * 2.3)],
  S11: [L(-.75, .8, -.35, -.8), L(.35, .8, .75, -.8), poly([[-.2, -.4], [0, .4], [.2, -.4]], false)],
  S12: [zig(-.85, .5, .85, .5, 6, .25), L(0, -.9, 0, .15), L(-.35, -.75, -.35, -.1)],
  S13: [L(-.85, .8, .85, .8), L(-.45, .8, -.45, .1), L(0, .8, 0, -.6), L(.45, .8, .45, -.15), poly([[-.25, -.8], [0, -.6], [.25, -.8]], false)],
  S14: [L(-.85, 0, .85, 0), L(-.6, 0, -.6, -.45), L(-.2, 0, -.2, -.45), L(.2, 0, .2, -.45), L(.6, 0, .6, -.45), zig(-.8, .45, .8, .45, 6, .15)],
  S15: [wave(-.85, .85, -.3, .18), wave(-.85, .85, .3, .18), L(.55, .65, .85, .3)],
  S16: [poly([[0, .85], [-.7, .85], [-.35, .3]], false), poly([[.35, .3], [.7, .85], [0, .85]], false), L(0, .6, 0, -.4), ring(0, -.6, .2)],
  S17: [arc(-.3, 0, .55, -Math.PI / 2, Math.PI / 2), arc(.3, 0, .55, Math.PI * 1.5, Math.PI / 2, 16), L(-.75, -.75, -.5, -.5), L(.5, .5, .75, .75)],
  S18: [L(-.85, -.3, .85, -.3), L(-.85, .3, .85, .3), L(-.3, -.85, -.3, .85), L(.3, -.85, .3, .85)],
  S19: [L(-.9, 0, -.1, 0), L(-.1, 0, .85, -.6), L(-.1, 0, .85, .6), poly([[-.25, -.18], [.05, 0], [-.25, .18]])],
  S20: [poly([[-.2, -.7], [-.75, 0], [-.2, .7]], false), poly([[.2, -.7], [.75, 0], [.2, .7]], false), ring(0, 0, .14)],
  S21: [poly([[-.8, -.8], [-.3, -.8], [-.3, -.3], [-.8, -.3]]), L(-.1, .2, .5, -.4), L(.1, .55, .7, -.05), L(.3, .85, .85, .3)],
  S22: [poly([[-.5, -.8], [-.8, -.8], [-.8, .8], [-.5, .8]], false), poly([[.5, -.8], [.8, -.8], [.8, .8], [.5, .8]], false), L(-.45, 0, .45, 0), poly([[.25, -.2], [.45, 0], [.25, .2]], false)],
  S23: [ring(0, 0, .3), arc(0, 0, .7, Math.PI * .6, Math.PI * 1.4), arc(0, 0, .7, -Math.PI * .4, Math.PI * .4), L(0, -.9, 0, -.35)],
  S24: [L(-.6, -.85, -.6, .85), L(.6, -.85, .6, .85), poly([[-.3, .35], [0, .05], [.3, .35]], false), poly([[-.3, -.15], [0, -.45], [.3, -.15]], false)],
  S25: [ring(0, 0, .28), L(-.85, -.2, -.4, -.7), L(.4, -.7, .85, -.2), L(-.25, .85, .25, .85)],
  S26: [L(-.8, -.75, .8, -.75), L(-.5, -.75, -.5, .2), L(0, -.75, 0, .7), L(.5, -.75, .5, .35)],
  S27: [poly([[-.85, .15], [.85, .15], [.5, .75], [-.5, .75]]), ring(0, -.4, .32), L(-.95, .15, -.7, -.15)],
  S28: [arc(0, .5, .85, Math.PI * 1.2, Math.PI * 1.8, 16, .9), arc(0, -.5, .85, Math.PI * .2, Math.PI * .8, 16, .9), L(0, -.6, 0, .6)],
  S29: [poly([[.2, -.45], [.85, -.45], [.85, .25], [.2, .25]]), L(-.85, .65, -.45, .35), L(-.45, .35, -.1, .2), L(-.1, .2, .2, -.1)],
  S30: [poly([[-.55, .35], [-.4, -.55], [0, -.8], [.4, -.55], [.55, .35]], false), L(-.75, .35, .75, .35), L(-.3, .55, -.35, .85), L(0, .55, 0, .9), L(.3, .55, .35, .85)],
  S31: [poly([[-.75, -.75], [.75, -.75], [.75, .75], [-.75, .75]]), L(-.75, 0, .75, 0), ring(0, 0, .2)],
  S32: [L(-.9, -.4, .9, -.4), L(-.9, .4, .9, .4), L(-.5, -.15, -.5, .15), L(0, -.15, 0, .15), L(.5, -.15, .5, .15)],
  S33: [ring(0, 0, .85), spiralIn(0, 0, .55, 1.6)],
  S34: [L(0, -.85, 0, .85), L(-.75, -.45, .75, -.45), poly([[-.75, -.45], [-.95, .1], [-.55, .1]]), poly([[.75, -.45], [.55, .1], [.95, .1]])],
  S35: [L(-.7, -.6, -.7, .6), L(-.3, -.6, -.3, .6), arc(0, 0, .45, -Math.PI / 3, Math.PI / 3), arc(0, 0, .8, -Math.PI / 3, Math.PI / 3)],
  S36: [arc(0, .9, 1.1, Math.PI * 1.2, Math.PI * 1.8, 20), zig(-.8, .45, .8, .45, 8, .12)]
});

export const RUNE_GUIDES = Object.freeze({
  ignis: [[[-.8, .7], [0, -.8], [.8, .7], [-.8, .7]]],
  ventus: [[[-1, 0], [1, 0]]],
  fulgur: [[[-.75, -.7], [.75, -.7], [-.75, .7], [.75, .7]]],
  terra: [[[-.7, -.7], [.7, -.7], [.7, .7], [-.7, .7], [-.7, -.66]]],
  aqua: [circle(1.02)],
  bestia: [[[-.9, .7], [-.6, -.6], [-.3, .45], [0, -.75], [.3, .45], [.6, -.6], [.9, .7]]],
  construct: [[[0, -1], [0, 1]]],
  void: [Array.from({ length: 41 }, (_, i) => { const a = i / 40 * Math.PI * 3; const r = .1 + i / 40 * .8; return [Math.cos(a) * r, Math.sin(a) * r]; })],
  lux: [[[-.9, 0], [.9, 0]], [[0, -.9], [0, .9]], [[-.65, -.65], [.65, .65]], [[.65, -.65], [-.65, .65]]],
  // NATURA: a leaf — closed pointed outline (bottom → right → top → left), then the midrib with its stem.
  natura: [[...Array.from({ length: 13 }, (_, i) => { const u = i / 12; return [Math.sin(u * Math.PI) * .55, .8 - u * 1.65]; }), ...Array.from({ length: 12 }, (_, i) => { const u = (i + 1) / 12; return [-Math.sin(u * Math.PI) * .55, -.85 + u * 1.65]; })], [[0, 1], [0, .45], [0, -.1], [0, -.7]]],
  umbra: [Array.from({ length: 31 }, (_, i) => { const a = Math.PI * .3 + i / 30 * Math.PI * 1.4; return [Math.cos(a) * .8, Math.sin(a) * .8]; })],
  doppel: [Array.from({ length: 61 }, (_, i) => { const t = i / 60 * Math.PI * 2; return [Math.sin(t) * .95, Math.sin(t) * Math.cos(t) * .9]; })],
  mortis: [Array.from({ length: 6 }, (_, k) => { const a = -Math.PI / 2 + k * Math.PI * 4 / 5; return [Math.cos(a) * .85, Math.sin(a) * .85]; })],
  // Buff transformation sigil: a closed hourglass in one stroke.
  buff_sigil: [[[-.6, -.85], [.6, -.85], [-.6, .85], [.6, .85], [-.6, -.85]]],
  ...Object.fromEntries(Object.entries(SIGNATURE_GLYPHS).map(([id, strokes]) => ['sig_' + id, strokes]))
});
const guideKey = (runeId) => (String(runeId).startsWith('buff_') ? 'buff_sigil' : runeId);

export function hasRuneGuide(runeId) { return !!RUNE_GUIDES[guideKey(runeId)]; }

// Strokes of a guide in screen space: dense points (every ~6 px) centred on
// (cx, cy) with half-size `size`.
export function guideStrokes(runeId, cx, cy, size) {
  const guide = RUNE_GUIDES[guideKey(runeId)];
  if (!guide) return [];
  return guide.map((stroke) => {
    const points = [];
    for (let i = 1; i < stroke.length; i++) {
      const [x0, y0] = stroke[i - 1]; const [x1, y1] = stroke[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * size / 6));
      for (let s = i === 1 ? 0 : 1; s <= steps; s++) {
        const f = s / steps;
        points.push({ x: cx + (x0 + (x1 - x0) * f) * size, y: cy + (y0 + (y1 - y0) * f) * size });
      }
    }
    return points;
  });
}

// Draw the template: wide translucent path, dashed centre line, a numbered
// start dot per stroke and arrows showing the drawing direction.
export function renderRuneGuide(ctx, runeId, cx, cy, size, color = '#ffffff') {
  const strokes = guideStrokes(runeId, cx, cy, size);
  if (!strokes.length) return false;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 26;
    ctx.beginPath(); stroke.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.strokeStyle = color; ctx.globalAlpha = .75; ctx.lineWidth = 4;
    ctx.setLineDash?.([12, 10]);
    ctx.beginPath(); stroke.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.setLineDash?.([]);
    // Direction arrows along the stroke.
    ctx.fillStyle = color;
    const every = Math.max(6, Math.floor(stroke.length / 4));
    for (let i = every; i < stroke.length - 2; i += every) {
      const p = stroke[i]; const q = stroke[Math.min(stroke.length - 1, i + 2)];
      const a = Math.atan2(q.y - p.y, q.x - p.x);
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(a) * 9, p.y + Math.sin(a) * 9);
      ctx.lineTo(p.x + Math.cos(a + 2.5) * 8, p.y + Math.sin(a + 2.5) * 8);
      ctx.lineTo(p.x + Math.cos(a - 2.5) * 8, p.y + Math.sin(a - 2.5) * 8);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Numbered start dots (stroke order).
  strokes.forEach((stroke, index) => {
    const p = stroke[0];
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#120a1e'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), p.x, p.y + 1);
  });
  ctx.restore();
  return true;
}
