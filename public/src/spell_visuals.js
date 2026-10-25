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
export function drawSpellSprite(ctx, name, frame, x, y, { anchor = 'base', flip = false, alpha = 1, sink = 0, scale = 1 } = {}) {
  const sheet = SPELL_SPRITE_SHEETS[name]; const image = images[name];
  if (!sheet || !image || VISUAL_FLAGS.legacy) return false;
  const f = Math.max(0, Math.min(sheet.frames - 1, Math.floor(frame)));
  // res: the image holds res× the logical frame size (hi-res refinement) — same world size, finer pixels.
  const res = sheet.res ?? 1; const sw = sheet.w * res; const sh = sheet.h * res;
  const w = Math.round(sheet.w * SCALE * scale); const h = Math.round(sheet.h * SCALE * scale);
  const dx = Math.round(x - w / 2);
  const dy = Math.round(anchor === 'center' ? y - h / 2 : y - h + ((sheet.baseOffset ?? 0) + sink) * SCALE * scale);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (alpha < 1) ctx.globalAlpha *= Math.max(0, alpha);
  if (flip) { ctx.translate(dx + w, dy); ctx.scale(-1, 1); ctx.drawImage(image, f * sw, 0, sw, sh, 0, 0, w, h); }
  else ctx.drawImage(image, f * sw, 0, sw, sh, dx, dy, w, h);
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
  constructor({ sheet, x, y = null, z, fps = 18, flip = false, vx = 0, vy = 0, gravity = 0, owner = null, scale = 1, anchor = 'center' }) {
    this.sheet = sheet; this.x = x; this.yFixed = y; this.z = z ?? .5; this.fps = fps; this.flip = flip; this.vx = vx; this.vy = vy; this.gravity = gravity; this.scale = scale; this.anchor = anchor;
    this.t = 0; this.isFinished = false; this.isVisualOnly = true; this.owner = owner; this.team = owner?.team;
    this.dur = (SPELL_SPRITE_SHEETS[sheet]?.frames ?? 1) / fps;
    this.dy = 0;
  }
  get y() { return this.yFixed ?? groundYForDepth(this.z); }
  update(dt) { this.t += dt; this.x += this.vx * dt; this.vy += this.gravity * dt; this.dy += this.vy * dt; if (this.t >= this.dur) this.isFinished = true; }
  render(ctx) { if (VISUAL_FLAGS.legacy || (!secondary() && this.sheet !== 'ice_hit')) return; drawSpellSprite(ctx, this.sheet, this.t * this.fps, this.x, this.y + this.dy, { anchor: this.anchor, flip: this.flip, scale: this.scale }); }
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
// st.jets [{ angle, t }]. Rotor back half behind the Wizard, front half in front; nozzles and jets
// on the side of the ring they belong to (a jet from the back half starts behind the Wizard).
// v2 (user, 25 Oct 2026: natural water, a real transition from the ring into the jets): a jet swells out
// of the ring at its nozzle and leaves along the ring's flow before it straightens; it runs with wavy edges
// and flow streaks that travel outward, fans into spray at its head, and when it ends it tears off at
// the root and breaks into irregular falling drops. Drawn in 1-world-px steps (the res-2 sprite density).
const TIDE = { out: '#082a4d', mantle: '#0B3D73', body: '#1F7FD1', mid: '#2FB4EA', light: '#7FDCFF', foam: '#D6F6FF', core: '#FFFFFF' };
const TIDE_RING = { rx: 40, ry: 18 }; // world px (rotor sprite RX 20 / RY 9 at scale 2)
const TIDE_JET = Object.freeze({ grow: .08, hold: .14, end: .22 }); // seconds (signature_abilities_d.js drops jets at .22)
const hash01 = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function tideJetGeometry(p, cy, angle, t) {
  const dx = Math.cos(angle); const dz = Math.sin(angle) * .35; const len = 210 * Math.min(1, t / TIDE_JET.grow);
  return { x0: p.x + dx * TIDE_RING.rx, y0: cy + Math.sin(angle) * TIDE_RING.ry, x1: p.x + dx * len, y1: cy + dz * len * .32 * 150 / 100, dx, len };
}
const tpx = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
// The jet's centre line: it leaves the ring along the spin (the water still moves with the ring), then
// straightens into the shot direction within ~26 px. Returns points 1 px apart with their arc length.
function tideJetPath(g, angle) {
  const ex = g.x1 - g.x0; const ey = g.y1 - g.y0; const L = Math.hypot(ex, ey);
  if (L < 2) return [];
  const Dx = ex / L; const Dy = ey / L;
  let Tx = -Math.sin(angle) * TIDE_RING.rx; let Ty = Math.cos(angle) * TIDE_RING.ry; const tl = Math.hypot(Tx, Ty) || 1; Tx /= tl; Ty /= tl;
  const pts = []; let x = g.x0; let y = g.y0;
  for (let s = 0; s <= L; s++) {
    pts.push({ x, y, s });
    const k = .85 * Math.max(0, 1 - s / 26) ** 2; let vx = Dx + Tx * k; let vy = Dy + Ty * k; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
    x += vx; y += vy;
  }
  return pts;
}
function drawTideJet(ctx, g, j) {
  const pts = tideJetPath(g, j.angle); if (!pts.length) return;
  const seed = Math.round(j.angle * 1000); const L = pts[pts.length - 1].s;
  const tearing = j.t > TIDE_JET.hold; const tk = tearing ? Math.min(1, (j.t - TIDE_JET.hold) / (TIDE_JET.end - TIDE_JET.hold)) : 0;
  const s0 = tk * L * .85; // torn off up to here
  // Width: a swell at the root (the bulge out of the ring), a slim pressure stream, widening into spray.
  const width = (s) => { const root = 8 - 3 * Math.min(1, s / 12); const head = s > L * .7 ? 1.5 * (s - L * .7) / (L * .3) : 0; const wob = Math.sin(s / 6.5 - j.t * 55) * .9; return Math.max(2, Math.round(root + head + wob - tk * 2)); };
  // Layered vertical spans per column (the jets run nearly level): dark rim, body, lit top, foam rim.
  // The last stretch breaks up: toward the head more and more single columns drop out and the rest scatter
  // up and down — the stream tears into ragged pieces and spray instead of ending in a cut.
  const brk = L * .82;
  const cols = [];
  for (const q of pts) {
    if (q.s < s0) continue;
    if (q.s <= brk) { cols.push(q); continue; }
    const fr = (q.s - brk) / (L - brk); const piece = Math.floor(q.s / 3);
    if (hash01(piece + seed) < fr * .85) continue;
    cols.push({ x: q.x, y: q.y + (hash01(piece * 7 + seed) - .5) * 7 * fr, s: q.s });
  }
  for (const pass of [0, 1, 2, 3]) for (const q of cols) {
    const w = width(q.s); const top = Math.round(q.y - w / 2); const x = Math.round(q.x);
    if (pass === 0) tpx(ctx, x, top - 1, 1, w + 2, TIDE.out);
    else if (pass === 1) tpx(ctx, x, top, 1, w, TIDE.body);
    else if (pass === 2) { tpx(ctx, x, top, 1, Math.max(1, Math.round(w * .45)), TIDE.mid); tpx(ctx, x, top + w - 1, 1, 1, TIDE.mantle); }
    else {
      tpx(ctx, x, top, 1, 1, TIDE.light);
      // Flow streaks travelling outward (foam dashes with a white heart), irregular spacing.
      const f = (q.s - j.t * 620) / 15; const ph = f - Math.floor(f); const len = .3 + hash01(Math.floor(f) + seed) * .25;
      if (ph < len && w >= 4) tpx(ctx, x, top + 1, 1, 1, ph < len * .5 ? TIDE.core : TIDE.foam);
    }
  }
  // Root: while attached, the ring swells into the jet (a bulge of the ring's own water).
  if (!tearing) {
    const r = pts[Math.min(4, pts.length - 1)];
    for (let yy = -4; yy <= 4; yy++) { const hw = Math.round(Math.sqrt(Math.max(0, 1 - (yy / 4.4) ** 2)) * 5); if (!hw) continue; tpx(ctx, g.x0 - hw, g.y0 + yy, hw * 2, 1, yy < -2 ? TIDE.light : yy < 1 ? TIDE.mid : TIDE.body); }
    tpx(ctx, g.x0 - 3, g.y0 - 4, 4, 1, TIDE.foam); tpx(ctx, Math.round((g.x0 + r.x) / 2), Math.round((g.y0 + r.y) / 2) - 2, 2, 1, TIDE.core);
  }
  // Head: the stream fans into spray (clusters thrown ahead in a cone) — never a solid ball.
  const end = pts[pts.length - 1]; const Dx = (end.x - pts[Math.max(0, pts.length - 8)].x) / 7 || 1; const Dy = (end.y - pts[Math.max(0, pts.length - 8)].y) / 7;
  const base = Math.atan2(Dy, Dx); const life = Math.min(1, j.t / TIDE_JET.end);
  for (let i = 0; i < 11; i++) {
    const a = base + (hash01(seed + i * 7) - .5) * 1.3; const d = 3 + hash01(seed + i * 13) * 12 + life * 26 * (.5 + hash01(seed + i));
    const x = end.x + Math.cos(a) * d; const y = end.y + Math.sin(a) * d * .7 + life * life * 30 * hash01(seed + i * 3);
    const sz = d < 10 ? 3 : d < 20 ? 2 : 1; const c = i % 3 === 0 ? TIDE.foam : i % 3 === 1 ? TIDE.light : TIDE.mid;
    tpx(ctx, x - 1, y - 1, sz + 1, sz + 1, TIDE.out); tpx(ctx, x, y, sz, sz, c); if (sz === 3) tpx(ctx, x, y, 1, 1, TIDE.core);
  }
  // Torn off: the detached part of the stream breaks into drops of irregular size and spacing that fall.
  if (tearing && secondary() && VISUAL_FLAGS.lod !== 'low') {
    const fall = (j.t - TIDE_JET.hold); let s = 4 + hash01(seed) * 6; let i = 0;
    while (s < s0 && i < 18) {
      const q = pts[Math.min(pts.length - 1, Math.round(s))]; const r1 = hash01(seed + i * 17); const sz = r1 < .3 ? 1 : r1 < .8 ? 2 : 3;
      const x = q.x + (hash01(seed + i * 5) - .5) * 4; const y = q.y + (r1 - .5) * 4 + fall * fall * (500 + 600 * r1) + fall * 40;
      tpx(ctx, x - 1, y - 1, sz + 1, sz + 1 + (sz > 1 ? 1 : 0), TIDE.out); tpx(ctx, x, y, sz, sz + (sz > 1 ? 1 : 0), sz > 1 ? TIDE.mid : TIDE.light); if (sz > 1) tpx(ctx, x, y, 1, 1, TIDE.foam);
      s += 7 + hash01(seed + i * 23) * 14; i++;
    }
  }
}
registerSpellVisual('tide_drill', (ctx, v) => {
  const { p, st, ry, layer } = v;
  if (!spellSheetReady('tide_rotor_back')) return false;
  const cy = ry - 44; const period = Math.PI * 2 / 3;
  const frame = Math.floor(((((st.spin % period) + period) % period) / period) * 8);
  const nozzleFrame = Math.floor(st.t * 16) % 4;
  const opening = st.t < .3; const closing = st.timer < .3;
  const back = layer === 'back'; const onSide = (a) => (Math.sin(a) < 0) === back;
  if (back) {
    if (opening) { drawSpellSprite(ctx, 'tide_gather', st.t / .3 * 6, p.x, cy, { anchor: 'center' }); return true; }
    if (closing) return true;
    drawSpellSprite(ctx, 'tide_rotor_back', frame, p.x, cy, { anchor: 'center' });
  } else {
    if (closing) { drawSpellSprite(ctx, 'tide_burst', (1 - st.timer / .3) * 6, p.x, cy, { anchor: 'center' }); return true; }
    if (opening) return true;
    drawSpellSprite(ctx, 'tide_rotor_front', frame, p.x, cy, { anchor: 'center' });
  }
  for (let k = 0; k < 4; k++) { const a = st.spin + k * Math.PI / 2; if (onSide(a)) drawSpellSprite(ctx, 'tide_nozzle', nozzleFrame, p.x + Math.cos(a) * TIDE_RING.rx, cy + Math.sin(a) * TIDE_RING.ry, { anchor: 'center' }); }
  for (const j of st.jets) if (onSide(j.angle)) drawTideJet(ctx, tideJetGeometry(p, cy, j.angle, j.t), j);
  return true;
});
export function tideHitBurst(target) {
  // The hand-drawn water crown when available (art/authoring/vfx_water.cjs), else the pilot hit sprite.
  const sheet = spellSheetReady('water_splash') ? 'water_splash' : 'tide_hit';
  return Object.assign(new SpriteBurst({ sheet, x: target.x, y: (target.y ?? groundYForDepth(target.z ?? .5)) - 24, fps: 18 }), { fineVfx: true });
}

// ── Hand-drawn beams (art/authoring/vfx_fire.cjs, vfx_water.cjs) ──────────
// A beam body is built from a tileable strip (<name>) laid along the beam (rotated for clash angles,
// clipped at the tip), with <name>_root at the hand and <name>_head at the front.
const BEAM_SHEETS = Object.freeze({ fire: 'fire_jet', ice: 'ice_ray', lightning: 'bolt', light: 'light_ray', void: 'void_ray' });
export function drawSheetBeam(ctx, material, x0, y0, x1, y1, t, k = 1) {
  const name = BEAM_SHEETS[material]; if (!name || !spellSheetReady(name)) return false;
  return drawJetSheets(ctx, name, x0, y0, x1, y1, t, k);
}
function drawJetSheets(ctx, name, x0, y0, x1, y1, t, k) {
  const L = Math.hypot(x1 - x0, y1 - y0); const ang = Math.atan2(y1 - y0, x1 - x0); const frame = Math.floor(t * 15) % 6;
  ctx.save(); ctx.translate(Math.round(x0), Math.round(y0)); ctx.rotate(ang);
  ctx.beginPath(); ctx.rect(4, -40, Math.max(0, L - 10), 80); ctx.clip();
  const scale = .7 + .3 * k;
  // Lightning tiles all enter / leave on the centre line, so each tile may show its own frame (no visible
  // repetition); flowing jets (fire, ice) keep one frame so their tiles join seamlessly.
  const vary = name === 'bolt' || name === 'light_ray'; let i = 0;
  for (let d = 4; d < L; d += 48 * scale) drawSpellSprite(ctx, name, vary ? (frame + i++ * 4 + (i * i) % 5) % 6 : frame, d + 24 * scale, 0, { anchor: 'center', scale, flip: vary && (i % 2 === 0) });
  ctx.restore();
  ctx.save(); ctx.translate(Math.round(x1), Math.round(y1)); ctx.rotate(ang); drawSpellSprite(ctx, name + '_head', frame, 4, 0, { anchor: 'center', scale }); ctx.restore();
  ctx.save(); ctx.translate(Math.round(x0), Math.round(y0)); ctx.rotate(ang); drawSpellSprite(ctx, name + '_root', frame, 2, 0, { anchor: 'center' }); ctx.restore();
  return true;
}
