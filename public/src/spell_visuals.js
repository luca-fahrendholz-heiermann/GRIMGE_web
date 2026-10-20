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
// true when a sprite visual will draw this key (the old procedural particles can be skipped).
export const spellVisualActive = (key, sheet) => !!VISUALS[key] && spellSheetReady(sheet);
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

// ── Pilot B: METEOR CATACLYSM (meteor_cataclysm) ─────────────────────────
// Reads MeteorSpell state only: falling (x, y, heightAboveGround), landed,
// craterLife. Telegraph + body + trail while falling; LF2-style explosion,
// radial debris and a cooling crater after the impact.
const METEOR_FALL = 450; // spawn height above the target (MeteorSpell)
registerSpellVisual('meteor', (ctx, m) => {
  if (!spellSheetReady('meteor_body')) return false;
  const now = (globalThis.performance?.now?.() ?? Date.now()) / 1000;
  if (!m.isLanded) {
    const k = Math.max(0, Math.min(1, 1 - m.heightAboveGround / METEOR_FALL));
    // Telegraph on the ground: pulses brighter as the impact nears.
    drawSpellSprite(ctx, 'meteor_telegraph', Math.min(3, Math.floor(k * 4)), m.targetX, m.targetY, { anchor: 'center' });
    // Smoke / ember trail behind the body along the fall direction.
    if (secondary()) {
      const steps = VISUAL_FLAGS.lod === 'low' ? 2 : 5;
      const len = Math.hypot(m.vx, m.vy) || 1;
      for (let i = steps; i >= 1; i--) drawSpellSprite(ctx, 'meteor_trail', Math.min(3, i - 1), m.x - m.vx / len * i * 16, m.y - m.vy / len * i * 16, { anchor: 'center' });
    }
    if (secondary()) drawSpellSprite(ctx, 'meteor_flame', Math.floor(now * 16) % 4, m.x, m.y, { anchor: 'center' });
    drawSpellSprite(ctx, 'meteor_body', Math.floor(now * 14) % 4, m.x, m.y, { anchor: 'center' });
    return true;
  }
  // Landed: remember the crater length once (craterLife is scaled by the rune grade).
  m._craterMax ??= m.craterLife + 1e-6;
  const since = m._craterMax - m.craterLife;
  const cool = Math.max(0, Math.min(.999, since / m._craterMax));
  drawSpellSprite(ctx, 'meteor_crater', Math.floor(cool * 4), m.targetX, m.targetY, { anchor: 'center' });
  // Debris first (behind the fireball), thrown from its rim; then the explosion: 10 frames over 0.8 s.
  if (secondary() && since > .05 && since < .7) {
    const n = VISUAL_FLAGS.lod === 'low' ? 4 : 8;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (.1 + .8 * i / (n - 1)); const sp = 140 + (i * 37) % 90;
      drawSpellSprite(ctx, 'meteor_debris', i % 4, m.targetX + Math.cos(a) * (40 + sp * since), m.targetY - 20 + Math.sin(a) * (24 + sp * since) + 260 * since * since, { anchor: 'center' });
    }
  }
  if (since < .8) drawSpellSprite(ctx, 'meteor_explosion', since / .8 * 10, m.targetX, m.targetY + 6);
  return true;
});
// Shattered in the air by a beam: debris burst instead of the impact.
export function meteorShatterBurst(m) {
  if (!spellSheetReady('meteor_debris')) return [];
  return Array.from({ length: 6 }, (_, i) => new SpriteBurst({ sheet: 'meteor_debris', x: m.x, y: m.y, fps: 6, vx: Math.cos(i * 1.05) * 120, vy: Math.sin(i * 1.05) * 80 - 60, gravity: 420 }));
}

// ── Pilot C: TIDENBOHRER (sig_S39 stance) ─────────────────────────────────
// Reads the stance state only: st.t (since start), st.timer (left), st.spin,
// st.jets [{ angle, t }]. Rotor back half behind the Wizard, front half and
// nozzles / jets in front. Jets are layered opaque bands (dark mantle →
// saturated body → white axis) with a foam crown and dissolving droplets.
const TIDE = { mantle: '#0B3D73', body: '#1F7FD1', mid: '#2FB4EA', foam: '#D6F6FF', core: '#FFFFFF' };
const TIDE_RING = { rx: 40, ry: 18 }; // world px (rotor sprite RX 20 / RY 9 at scale 2)
function tideJetGeometry(p, cy, angle, t) {
  const dx = Math.cos(angle); const dz = Math.sin(angle) * .35; const len = 210 * Math.min(1, t / .08);
  return { x0: p.x + dx * TIDE_RING.rx, y0: cy + Math.sin(angle) * TIDE_RING.ry, x1: p.x + dx * len, y1: cy + dz * len * .32 * 150 / 100, dx, len };
}
registerSpellVisual('tide_drill', (ctx, v) => {
  const { p, st, ry, layer } = v;
  if (!spellSheetReady('tide_rotor_back')) return false;
  const cy = ry - 44; const period = Math.PI * 2 / 3;
  const frame = Math.floor(((((st.spin % period) + period) % period) / period) * 8);
  const opening = st.t < .3; const closing = st.timer < .3;
  if (layer === 'back') {
    if (opening) drawSpellSprite(ctx, 'tide_gather', st.t / .3 * 6, p.x, cy, { anchor: 'center' });
    else if (!closing) drawSpellSprite(ctx, 'tide_rotor_back', frame, p.x, cy, { anchor: 'center' });
    for (let k = 0; k < 4 && !opening && !closing; k++) { const a = st.spin + k * Math.PI / 2; if (Math.sin(a) < 0) drawSpellSprite(ctx, 'tide_nozzle', k, p.x + Math.cos(a) * TIDE_RING.rx, cy + Math.sin(a) * TIDE_RING.ry, { anchor: 'center' }); }
    return true;
  }
  if (closing) { drawSpellSprite(ctx, 'tide_burst', (1 - st.timer / .3) * 6, p.x, cy, { anchor: 'center' }); return true; }
  if (opening) return true;
  drawSpellSprite(ctx, 'tide_rotor_front', frame, p.x, cy, { anchor: 'center' });
  for (let k = 0; k < 4; k++) { const a = st.spin + k * Math.PI / 2; if (Math.sin(a) >= 0) drawSpellSprite(ctx, 'tide_nozzle', k, p.x + Math.cos(a) * TIDE_RING.rx, cy + Math.sin(a) * TIDE_RING.ry, { anchor: 'center' }); }
  // Pressure jets.
  for (const j of st.jets) {
    const g = tideJetGeometry(p, cy, j.angle, j.t); const fade = j.t > .14 ? Math.max(0, 1 - (j.t - .14) / .08) : 1;
    ctx.save(); ctx.lineCap = 'butt'; ctx.globalAlpha = fade;
    for (const [w, c] of [[10, TIDE.mantle], [7, TIDE.body], [4, TIDE.mid], [2, TIDE.core]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(Math.round(g.x0), Math.round(g.y0)); ctx.lineTo(Math.round(g.x1), Math.round(g.y1)); ctx.stroke(); }
    ctx.restore();
    drawSpellSprite(ctx, 'tide_jet_head', Math.floor(j.t * 30) % 4, g.x1, g.y1, { anchor: 'center', alpha: fade });
    // Delayed dissolve: droplets fall off the jet.
    if (secondary() && j.t > .1 && VISUAL_FLAGS.lod !== 'low') for (let i = 1; i <= 4; i++) { const u = i / 5; const fall = (j.t - .1) * 260; drawSpellSprite(ctx, 'tide_droplet', i % 2, g.x0 + (g.x1 - g.x0) * u, g.y0 + (g.y1 - g.y0) * u + fall * (.4 + u * .3), { anchor: 'center' }); }
  }
  return true;
});
export function tideHitBurst(target) {
  return new SpriteBurst({ sheet: 'tide_hit', x: target.x, y: (target.y ?? groundYForDepth(target.z ?? .5)) - 30, fps: 20 });
}
