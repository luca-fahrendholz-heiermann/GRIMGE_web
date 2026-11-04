// GRIMGE Prototype — the casting circle (user, 21 Oct 2026: spells must fit the pixel-art
// character designs — reference: a crisp glowing magic circle at the caster's feet). A short
// ground decal in the spell's colour: two rings, a turning hexagram and rune ticks; drawn
// in the pixelated VFX layer (so it gets the sprite contour too), under the actors.
import { groundYForDepth } from './world.js';

const TAU = Math.PI * 2;
export class CastCircleFx {
  constructor(caster, color = '#b388ff', { radius = 54, life = .55, big = false } = {}) {
    this.x = caster.x; this.z = caster.z; this.surfaceHeight = caster.surfaceHeight ?? 0; this.color = color; this.R = radius * (big ? 1.5 : 1); this.life = life * (big ? 1.4 : 1);
    this.big = big; this.t = 0; this.isFinished = false; this.isGroundDecal = true; this.team = caster.team;
  }
  update(dt) { this.t += dt; if (this.t >= this.life) this.isFinished = true; }
  render(ctx) {
    const k = this.t / this.life; const grow = Math.min(1, this.t / .12); const a = Math.min(1, (1 - k) * 2.2);
    const x = this.x; const y = groundYForDepth(this.z) - this.surfaceHeight; const R = this.R * grow; const sq = .3;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = this.color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, y, R, R * sq, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, R * .7, R * .78 * sq, 0, 0, TAU); ctx.stroke();
    // A turning hexagram inside (big special runes only — small circles stay readable).
    const rot = this.t * 2.4;
    if (this.big) for (const off of [0, Math.PI / 3]) {
      ctx.beginPath();
      for (let i = 0; i <= 3; i++) { const ang = rot + off + i * TAU / 3; const px = x + Math.cos(ang) * R * .66; const py = y + Math.sin(ang) * R * .66 * sq; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
    // Rune ticks on the rim and a bright core flash at the start.
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) { const ang = -rot * .6 + i * TAU / 8; ctx.fillRect(Math.round(x + Math.cos(ang) * R * .85) - 1, Math.round(y + Math.sin(ang) * R * .85 * sq) - 1, 3, 3); }
    if (this.t < .1) { ctx.globalAlpha = a * .45 * (1 - this.t / .1); ctx.fillStyle = this.color; ctx.beginPath(); ctx.ellipse(x, y, R * .5, R * .5 * sq, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}

// The golden ray crown (user reference 4: a holy armour with light rays): rays of light fan out
// behind the caster — light (Lux) spells, the Sun breathing and the holy Arcane States.
export class RayCrownFx {
  constructor(caster, { life = 1.1, color = '#ffd54f', core = '#fffde7', size = 1 } = {}) {
    this.owner = caster; this.x = caster.x; this.z = caster.z; this.life = life; this.color = color; this.core = core; this.size = size;
    this.t = 0; this.isFinished = false; this.team = caster.team;
  }
  get y() { return groundYForDepth(this.owner.z) - .5; } // just behind the caster in the painter order
  update(dt) { this.t += dt; this.x = this.owner.x; this.z = this.owner.z - .002; if (this.t >= this.life) this.isFinished = true; } // a hair behind the caster
  render(ctx) {
    const p = this.owner; const k = this.t / this.life; const grow = Math.min(1, this.t / .18); const a = Math.min(1, (1 - k) * 2.5);
    const cx = p.x; const cy = (p.y ?? groundYForDepth(p.z)) - 50; const rot = this.t * .5;
    ctx.save(); ctx.globalAlpha = a;
    for (let i = 0; i < 14; i++) {
      const ang = rot + i * TAU / 14; const long = i % 2 === 0; const L = (long ? 96 : 62) * grow * this.size; const w = long ? .17 : .11;
      ctx.fillStyle = long ? this.color : this.core;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang - w) * 14, cy + Math.sin(ang - w) * 14); ctx.lineTo(cx + Math.cos(ang) * L, cy + Math.sin(ang) * L); ctx.lineTo(cx + Math.cos(ang + w) * 14, cy + Math.sin(ang + w) * 14); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = this.core; for (let i = 0; i < 8; i++) { const ang = -rot * 1.5 + i * TAU / 8; ctx.fillRect(Math.round(cx + Math.cos(ang) * 70 * grow) - 2, Math.round(cy + Math.sin(ang) * 70 * grow) - 2, 4, 4); }
    ctx.restore();
  }
}

// ── The drawing tell (user, 4 Nov 2026): while a Wizard draws a rune, an upright magic circle hangs in front of its
// hand and shows what is being drawn — the AI traces its rune's guide, the player sees their own strokes in it.
// Later hand-sign animations take over. strokes: point lists already in screen space (inside the circle).
// progress: 0..1 for the rim arc (null = none); pips: one entry per rune / stroke ('done' | 'now' | 'todo').
export function drawCastTell(ctx, { x, y, facing = 1, t = 0, color = '#ff5252', open = 1, progress = null, pips = [], strokes = [], groundY = null, groundGrow = 0 }) {
  const rot = t * 2.2; const cx = Math.round(x + facing * 36); const cy = Math.round(y - 56); const R = 24 * open;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Ground circle at the feet.
  if (groundY != null) {
    const gr = (26 + 18 * groundGrow) * open; ctx.globalAlpha = .55; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, groundY, gr, gr * .3, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffffff'; for (let n = 0; n < 6; n++) { const an = -rot + n * TAU / 6; ctx.fillRect(Math.round(x + Math.cos(an) * gr) - 1, Math.round(groundY + Math.sin(an) * gr * .3) - 1, 2, 2); }
  }
  // The circle: a soft fill, outer + inner ring, a turning hexagram, ticks, the progress arc.
  ctx.globalAlpha = .16; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.globalAlpha = .9; ctx.strokeStyle = 'rgba(10,6,20,.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R * .74, 0, TAU); ctx.stroke();
  ctx.globalAlpha = .3; for (const off of [0, Math.PI / 3]) { ctx.beginPath(); for (let n = 0; n <= 3; n++) { const an = rot + off + n * TAU / 3; const px = cx + Math.cos(an) * R * .74; const py = cy + Math.sin(an) * R * .74; n ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.fillStyle = color; for (let n = 0; n < 10; n++) { const an = -rot * .7 + n * TAU / 10; ctx.fillRect(Math.round(cx + Math.cos(an) * R * .87) - 1, Math.round(cy + Math.sin(an) * R * .87) - 1, 2, 2); }
  if (progress != null && progress > 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R + 3, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, progress)); ctx.stroke(); }
  for (let j = 0; j < pips.length; j++) { ctx.fillStyle = pips[j] === 'done' ? '#ffffff' : pips[j] === 'now' ? color : 'rgba(0,0,0,.6)'; ctx.fillRect(Math.round(cx - pips.length * 4 + j * 8), Math.round(cy - R - 11), 5, 5); }
  // The glyph inside.
  for (const pts of strokes) {
    if (!pts || pts.length < 2) continue;
    for (const [w, c] of [[4, 'rgba(10,6,20,.8)'], [2, '#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, n) => (n ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); }
  }
  const last = strokes[strokes.length - 1]; const tip = last?.[last.length - 1];
  if (tip) { ctx.fillStyle = color; ctx.fillRect(Math.round(tip.x) - 2, Math.round(tip.y) - 2, 4, 4); }
  ctx.restore();
  return { cx, cy, R };
}
// The player's own strokes (canvas space) fitted into the circle in front of the Wizard.
export function renderPlayerDrawTell(ctx, p, drawing, now = performance.now()) {
  if (!drawing?.active || !p) return;
  const all = [...(drawing.strokes ?? []), drawing.currentStroke ?? []].filter((s) => s.length);
  drawing.tellT = drawing.tellT ?? now;
  const t = (now - drawing.tellT) / 1000; const open = Math.min(1, t / .15);
  const cx = Math.round(p.x + (p.facing || 1) * 36); const cy = Math.round((p.y ?? 0) - 56);
  let strokes = [];
  if (all.length) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of all) for (const q of s) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
    const k = (26 * open) / Math.max(40, x1 - x0, y1 - y0); const mx = (x0 + x1) / 2; const my = (y0 + y1) / 2;
    strokes = all.map((s) => s.map((q) => ({ x: cx + (q.x - mx) * k, y: cy + (q.y - my) * k })));
  }
  // The rim fills while the auto lock-in (2 s after the last stroke) counts down.
  const lock = drawing.autoLockArmed && !(drawing.currentStroke?.length) && drawing.lastStrokeTime ? Math.min(1, (now - drawing.lastStrokeTime) / 2000) : null;
  const n = Math.min(6, all.length);
  drawCastTell(ctx, { x: p.x, y: p.y ?? 0, facing: p.facing || 1, t, color: '#82b1ff', open, progress: lock, pips: Array.from({ length: n }, (_, i) => (i < n - 1 || !drawing.currentStroke?.length ? 'done' : 'now')), strokes, groundY: p.y ?? 0, groundGrow: Math.min(1, all.length / 4) });
}
