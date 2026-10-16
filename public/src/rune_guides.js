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
  umbra: [Array.from({ length: 31 }, (_, i) => { const a = Math.PI * .3 + i / 30 * Math.PI * 1.4; return [Math.cos(a) * .8, Math.sin(a) * .8]; })],
  doppel: [Array.from({ length: 61 }, (_, i) => { const t = i / 60 * Math.PI * 2; return [Math.sin(t) * .95, Math.sin(t) * Math.cos(t) * .9]; })],
  mortis: [Array.from({ length: 6 }, (_, k) => { const a = -Math.PI / 2 + k * Math.PI * 4 / 5; return [Math.cos(a) * .85, Math.sin(a) * .85]; })]
});

export function hasRuneGuide(runeId) { return !!RUNE_GUIDES[runeId]; }

// Strokes of a guide in screen space: dense points (every ~6 px) centred on
// (cx, cy) with half-size `size`.
export function guideStrokes(runeId, cx, cy, size) {
  const guide = RUNE_GUIDES[runeId];
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
