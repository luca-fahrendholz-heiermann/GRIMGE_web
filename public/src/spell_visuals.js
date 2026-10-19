// GRIMGE Prototype — visual layer for the spell upgrade (docs/GRIMGE_Visual_Upgrade_Plan.md).
//
// Rules of this layer:
//  • It only READS the existing gameplay state (timers, phases, positions) of
//    a spell and draws sprite-based main bodies; it never changes damage,
//    timing, hitboxes or platform heights.
//  • If a sheet is not loaded (headless tests, missing file) the call returns
//    false and the spell keeps drawing its old procedural visual (fallback).
//  • Debug switches (URL): ?vfx=main — main bodies only (no secondary VFX),
//    ?hitbox=1 — gameplay hit areas, ?lod=low — reduced secondary VFX,
//    ?vfx=legacy — the old procedural visuals (before / after comparisons).
import { SPELL_SPRITE_SHEETS } from './spell_sprite_sheets.js';
import { groundYForDepth } from './world.js';

const SCALE = 2; // 1 sprite pixel = 2 world pixels (same as the FX sheets)
const images = {};
const query = (() => { try { return new URLSearchParams(globalThis.location?.search ?? ''); } catch { return new URLSearchParams(''); } })();
export const VISUAL_FLAGS = {
  mainOnly: query.get('vfx') === 'main',
  legacy: query.get('vfx') === 'legacy',
  hitbox: query.get('hitbox') === '1',
  lod: query.get('lod') === 'low' ? 'low' : 'high'
};
const secondary = () => !VISUAL_FLAGS.mainOnly;

export function loadSpellSprites() {
  if (typeof globalThis.Image !== 'function') return Promise.resolve(false);
  return Promise.all(Object.keys(SPELL_SPRITE_SHEETS).map((name) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => { images[name] = image; resolve(true); };
    image.onerror = () => resolve(false);
    image.src = `assets/sprites/spells/${name}.png`;
  })));
}
export const spellSheetReady = (name) => !VISUAL_FLAGS.legacy && !!images[name];
// Tests can inject a stand-in image (headless Node has no Image).
export function __setSpellSheetImage(name, image) { if (image) images[name] = image; else delete images[name]; }

// Draws one frame. anchor 'base': the sheet's base row (ground contact) sits on y
// (baseOffset = rows below it); 'center': centred on (x, y).
export function drawSpellSprite(ctx, name, frame, x, y, { anchor = 'base', flip = false, alpha = 1, sink = 0 } = {}) {
  const sheet = SPELL_SPRITE_SHEETS[name]; const image = images[name];
  if (!sheet || !image || VISUAL_FLAGS.legacy) return false;
  const f = Math.max(0, Math.min(sheet.frames - 1, Math.floor(frame)));
  const w = sheet.w * SCALE; const h = sheet.h * SCALE;
  const dx = Math.round(x - w / 2);
  const dy = Math.round(anchor === 'center' ? y - h / 2 : y - h + ((sheet.baseOffset ?? 0) + sink) * SCALE);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (alpha < 1) ctx.globalAlpha *= Math.max(0, alpha);
  if (flip) { ctx.translate(dx + w, dy); ctx.scale(-1, 1); ctx.drawImage(image, f * sheet.w, 0, sheet.w, sheet.h, 0, 0, w, h); }
  else ctx.drawImage(image, f * sheet.w, 0, sheet.w, sheet.h, dx, dy, w, h);
  ctx.restore();
  return true;
}

// ── Registry ─────────────────────────────────────────────────────────────
const VISUALS = {};
export function registerSpellVisual(key, renderer) { VISUALS[key] = renderer; }
// true when the visual layer drew the spell (then the old renderer is skipped).
export function renderSpellVisual(ctx, spell, key) {
  const visual = VISUALS[key]; if (!visual) return false;
  const drawn = !!visual(ctx, spell);
  if (drawn && VISUAL_FLAGS.hitbox) spell.renderHitbox?.(ctx);
  return drawn;
}

// One-shot sprite animation (impacts, cast puffs). Purely visual: no gameplay.
export class SpriteBurst {
  constructor({ sheet, x, y = null, z, fps = 18, flip = false, vx = 0, vy = 0, gravity = 0, owner = null }) {
    this.sheet = sheet; this.x = x; this.yFixed = y; this.z = z ?? .5; this.fps = fps; this.flip = flip; this.vx = vx; this.vy = vy; this.gravity = gravity;
    this.t = 0; this.isFinished = false; this.isVisualOnly = true; this.owner = owner; this.team = owner?.team;
    this.dur = (SPELL_SPRITE_SHEETS[sheet]?.frames ?? 1) / fps;
    this.dy = 0;
  }
  get y() { return this.yFixed ?? groundYForDepth(this.z); }
  update(dt) { this.t += dt; this.x += this.vx * dt; this.vy += this.gravity * dt; this.dy += this.vy * dt; if (this.t >= this.dur) this.isFinished = true; }
  render(ctx) { if (VISUAL_FLAGS.legacy || (!secondary() && this.sheet !== 'ice_hit')) return; drawSpellSprite(ctx, this.sheet, this.t * this.fps, this.x, this.y + this.dy, { anchor: 'center', flip: this.flip }); }
}

// ── Pilot A: EISZACKEN (sig_S37) ─────────────────────────────────────────
// Phases come straight from the IceSpike / GeoPlatform state: emerge (t < emerge),
// hold, break (last `decay` seconds). Variant = height index i, so the sprite's
// broken-off plateau matches the platform height the Wizard can stand on.
export function iceSpikeFrame(spike) {
  const t = spike.t;
  if (t <= 0) return -1;
  if (t < spike.emerge) return Math.min(2, Math.floor((t / spike.emerge) * 3));
  if (t > spike.life - spike.decay) return 4 + Math.min(2, Math.floor(((t - (spike.life - spike.decay)) / spike.decay) * 3));
  return 3;
}
registerSpellVisual('ice_spike', (ctx, spike) => {
  const name = `ice_spike_v${Math.max(0, Math.min(6, spike.i ?? 0))}`;
  if (!spellSheetReady(name)) return false;
  const frame = iceSpikeFrame(spike);
  if (frame < 0) return true; // not risen yet (the ground crack belongs to the cast)
  const flip = (spike.caster?.facing ?? 1) < 0;
  // Base row 2 px into the ground → plateau top ≈ platform height (± 1 px).
  drawSpellSprite(ctx, name, frame, spike.x, spike.y, { flip, sink: 1 });
  if (secondary() && VISUAL_FLAGS.lod !== 'low') {
    // Emerge: ice chips kick up; break: shards fly off (deterministic per spike).
    if (frame <= 1) for (let k = 0; k < 3; k++) { const u = spike.t / spike.emerge; drawSpellSprite(ctx, 'ice_shard', k, spike.x + (k - 1) * 12 * u, spike.y - 6 - 18 * u * (1 + k % 2), { anchor: 'center' }); }
    if (frame >= 5) { const u = (spike.t - (spike.life - spike.decay)) / spike.decay; for (let k = 0; k < 4; k++) { const a = -Math.PI * (.15 + k * .23); drawSpellSprite(ctx, 'ice_shard', k, spike.x + Math.cos(a) * 30 * u * (flip ? -1 : 1), spike.y - spike.height * .5 + Math.sin(a) * 30 * u + 40 * u * u, { anchor: 'center' }); } }
  }
  return true;
});
// The ground crack that runs from the caster to the spike line during the cast.
export function drawIceCrack(ctx, x0, x1, y, k) {
  if (!spellSheetReady('ice_crack')) return false;
  const dir = Math.sign(x1 - x0) || 1; const len = Math.abs(x1 - x0) * Math.min(1, k * 2.2);
  const seg = 16 * SCALE;
  for (let d = 0; d < len; d += seg) {
    const local = Math.min(1, (len - d) / seg);
    drawSpellSprite(ctx, 'ice_crack', Math.min(3, local * 4), x0 + dir * (d + seg / 2), y, { anchor: 'center', flip: dir < 0, alpha: Math.min(1, (1 - k) * 4) });
  }
  return true;
}
