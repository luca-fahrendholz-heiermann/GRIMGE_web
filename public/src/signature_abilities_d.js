// GRIMGE Prototype — signature specials S37–S42 (user design rules, 18 Oct
// 2026): special runes need their own object / motion / arena identity.
//   S37 EISZACKEN     a row of ice spikes erupting ahead — own spike objects,
//                     each a short-lived platform you can stand on
//   S38 SCHACHTWUCHS  three stepped stone shafts at the target: launch foes,
//                     carry the Wizard up, stay as platforms
//   S39 TIDENBOHRER   a spinning water shell with four nozzles hammering jets
//   S40–S42           breathing techniques: see breathing.js. They
//                     restyle every melee swing and the charges for 15 s
import {
  defineSignature, startStance, emit, SigSequence, foesOf, groundDist, hit, plate, shard, thread, ribbon, sparks, TAU, DEPTH, sigWorld
} from './signature_core.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';
import { applyStatuses } from './buff_techniques.js';
import { GeoPlatform } from './geometry.js';
import { offerRecast } from './recast.js';
import { renderSpellVisual, drawIceCrack, SpriteBurst, tideHitBurst, spellSheetReady, drawSpellSprite } from './spell_visuals.js';

const gameOf = (c) => c.gw ?? sigWorld();

// ── S37 Eiszacken ────────────────────────────────────────────────────────
class IceSpike extends GeoPlatform {
  constructor(caster, game, x, z, i) {
    super(caster, game, { x, z, halfW: 13, halfD: .05, height: 34 + i * 7, life: 3.2, emerge: .12, decay: .3, delay: i * .07, look: 'ice', damage: 22, lift: 280, stun: .6, label: 'Ice spike', onEmerge: (t) => { t.freeze?.(.5); emit(new SpriteBurst({ sheet: 'ice_hit', x: t.x, y: (t.y ?? groundYForDepth(t.z ?? z)) - 34, owner: caster })); } });
    this.i = i;
  }
  get fineVfx() { return spellSheetReady('ice_spike_v0'); }
  render(ctx) {
    // Visual upgrade (pilot A): sprite-based ice ribs; falls back to the plates below.
    if (renderSpellVisual(ctx, this, 'ice_spike')) return;
    const h = this.currentHeight; if (h <= .5) return;
    const y = this.y; const m = this.mat; const w = this.halfW;
    // A jagged spike, not a pillar: a main blade with two side shards.
    plate(ctx, [[this.x - w, y + 3], [this.x - w * .3, y - h * .55], [this.x + w * .15, y - h], [this.x + w * .5, y - h * .45], [this.x + w, y + 3]], m, this.seed, { alpha: 1, lit: 1, glowEdge: 1.1 });
    plate(ctx, [[this.x - w - 4, y + 3], [this.x - w - 8, y - h * .45], [this.x - w * .2, y]], m, this.seed + 1, { alpha: 1, glowEdge: .9 });
    plate(ctx, [[this.x + w * .4, y + 2], [this.x + w + 9, y - h * .4], [this.x + w + 4, y + 3]], m, this.seed + 2, { alpha: 1, glowEdge: .9 });
    thread(ctx, [[this.x - w * .2, y - 4], [this.x + w * .1, y - h * .8]], '#ffffff', 1.5, .8);
    if (this.t > this.life - this.decay) for (let k = 0; k < 4; k++) shard(ctx, this.x + (k - 1.5) * 8, y - h * .5 - k * 4, 4, k, m, this.seed + 10 + k, 1);
  }
}
defineSignature('S37', {
  cast(c) {
    const p = c.caster; const f = p.facing || 1; const game = gameOf(c);
    for (let i = 0; i < 7; i++) emit(new IceSpike(p, game, p.x + f * (46 + i * 32), p.z, i), c.quality);
    // Anticipation: frost at the casting hand, a ground crack runs out along the spike line.
    emit(new SpriteBurst({ sheet: 'ice_cast', x: p.x + f * 17, y: (p.y ?? groundYForDepth(p.z)) - 46, fps: 14, owner: p, flip: f < 0 }), c.quality);
    emit(new SigSequence(c.sig, p, { dur: .5, draw: (ctx, s, k) => { const y = groundYForDepth(s.z); if (drawIceCrack(ctx, s.x + f * 14, s.x + f * 270, y + 1, k)) return; thread(ctx, [[s.x + f * 14, y], [s.x + f * (40 + 230 * Math.min(1, k * 2)), y + 1]], c.sig.mat.edge, 2, 1 - k); } }), c.quality);
  }
});

// ── S38 Schachtwuchs ─────────────────────────────────────────────────────
defineSignature('S38', {
  cast(c) {
    const p = c.caster; const f = p.facing || 1; const game = gameOf(c);
    const x0 = c.target?.x ?? p.x + f * 90; const z = c.target?.z ?? p.z;
    const shafts = [50, 92, 134].map((h, i) => emit(new GeoPlatform(p, game, { x: x0 + f * i * 54, z, halfW: 24, halfD: .06, height: h, life: 8, emerge: .3, decay: .5, delay: i * .14, look: 'stone', damage: 26, lift: 420, stun: .6, label: 'Stone shaft' }), c.quality));
    combat.shakeCamera(6, .3);
    // Stage 2 (within 6 s): the shafts burst — stone shrapnel hits everyone around and on top of them.
    offerRecast(p, { window: 6, label: 'SCHÄCHTE SPRENGEN', valid: () => shafts.some((sh) => !sh.isFinished), stage2: (gw) => {
      for (const sh of shafts) {
        if (sh.isFinished) continue;
        for (const t of foesOf(gw, p.team)) if (Math.hypot(t.x - sh.x, ((t.z ?? sh.z) - sh.z) * DEPTH) < 70) hit(t, 32, Math.sign(t.x - sh.x || f) * 320, 260, .6);
        emit(new SigSequence(c.sig, p, { dur: .5, x: sh.x, z: sh.z, draw: (ctx, s, k) => { const y = groundYForDepth(s.z) - 30; for (let i = 0; i < 9; i++) { const a = -Math.PI * (.05 + .9 * i / 8); const r = 10 + k * 70; plate(ctx, [[s.x + Math.cos(a) * r - 4, y + Math.sin(a) * r * .8 + 60 * k * k], [s.x + Math.cos(a) * r + 3, y + Math.sin(a) * r * .8 - 4 + 60 * k * k], [s.x + Math.cos(a) * r + 4, y + Math.sin(a) * r * .8 + 4 + 60 * k * k]], { kind: 'crust', dark: '#2f2a24', body: '#6d6253', facet: '#8f8371', vein: '#d9b77a', edge: '#efe0bd', spark: '#f6d58a', core: '#fff6d8', glow: 'rgba(217,183,122,', edgeGlow: 'rgba(239,224,189,' }, 3800 + i, { alpha: 1 - k }); } } }), c.quality);
        sh.shatter();
      }
      combat.shakeCamera(10, .3);
    } });
  }
});

// ── S39 Tidenbohrer ──────────────────────────────────────────────────────
const WATER = { kind: 'crystal', dark: '#0b2440', body: '#3fa2ff', facet: '#d6f0ff', vein: '#8ff7ff', edge: '#ffffff', spark: '#e6fbff', core: '#ffffff', glow: 'rgba(63,162,255,', edgeGlow: 'rgba(255,255,255,' };
function waterJet(p, st, angle, gw, power = 1) {
  // Hitscan jet along the nozzle direction (ground plane), pushes foes away.
  const dx = Math.cos(angle); const dz = Math.sin(angle) * .35; const len = 210;
  for (const t of foesOf(gw, p.team)) {
    const rx = t.x - p.x; const rz = ((t.z ?? p.z) - p.z) * DEPTH;
    const u = rx * dx + rz * dz; if (u < 10 || u > len) continue;
    if (Math.abs(rx * dz - rz * dx) > 22) continue;
    hit(t, 9 * power, Math.sign(rx || 1) * 260, 40, .25);
    emit(tideHitBurst(t)); // visual only
  }
  st.jets.push({ angle, t: 0 });
}
// Debug overlay (?hitbox=1): the real jet hit corridors (210 px long, ±22 px wide on the ground).
function tideHitboxOverlay(ctx, p, st, ry) {
  ctx.save(); ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 1;
  for (const j of st.jets) { const dx = Math.cos(j.angle); const dz = Math.sin(j.angle) * .35; const y0 = groundYForDepth(p.z); const nx = -dz; const nz = dx; const P = (u, w) => [p.x + dx * u + nx * w, y0 + (dz * u + nz * w) * (groundYForDepth(p.z + 1 / DEPTH) - y0)];
    const pts = [P(10, -22), P(210, -22), P(210, 22), P(10, 22)]; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke(); }
  ctx.restore();
}
defineSignature('S39', {
  cast(c) { startStance(c.caster, 'S39', c.quality, { spin: 0, next: 0, nozzle: 0, jets: [] }); },
  stance: {
    duration: 6,
    hint: 'WASSERHÜLLE · DÜSEN FEUERN AUTOMATISCH · HEAVY: ALLE VIER',
    damageTaken: (p, st, amount) => amount * .67,
    update(p, st, dt, gw) {
      st.spin += dt * 9; st.next -= dt;
      for (const j of st.jets) j.t += dt; st.jets = st.jets.filter((j) => j.t < .22);
      if (st.next <= 0) { st.next = .3; st.nozzle = (st.nozzle + 1) % 4; waterJet(p, st, st.spin + st.nozzle * TAU / 4, gw); }
    },
    onEvent(p, st, type, info, gw) { if (type === 'heavy') for (let k = 0; k < 4; k++) waterJet(p, st, st.spin + k * TAU / 4, gw, 1.6); },
    render(ctx, p, st, ry, layer) {
      // Visual upgrade (pilot C): sprite rotor, nozzles and layered pressure jets; else the plates below.
      if (renderSpellVisual(ctx, { p, st, ry, layer, renderHitbox: (c) => tideHitboxOverlay(c, p, st, ry) }, 'tide_drill')) return;
      const cy = ry - 44; const emerge = Math.min(1, st.t / .3); const pop = st.timer < .3 ? st.timer / .3 : 1;
      // The spinning shell: plates on an ellipse, back half behind the sprite.
      for (let i = 0; i < 10; i++) {
        const a = st.spin + i * TAU / 10; const back = Math.sin(a) < 0; if ((layer === 'back') !== back) continue;
        const r = 34 * emerge * pop; const x = p.x + Math.cos(a) * r; const y = cy + Math.sin(a) * r * .45;
        plate(ctx, [[x - 6, y - 12], [x + 6, y - 12], [x + 7, y + 12], [x - 7, y + 12]], WATER, 3900 + i, { alpha: .75, glowEdge: .9, lit: 1 });
      }
      if (layer !== 'front') return;
      // Four nozzles and the jets they fire.
      for (let k = 0; k < 4; k++) { const a = st.spin + k * TAU / 4; const x = p.x + Math.cos(a) * 36; const y = cy + Math.sin(a) * 16; plate(ctx, [[x - 4, y - 4], [x + 4, y - 4], [x + 4, y + 4], [x - 4, y + 4]], { ...WATER, body: '#ffffff' }, 3920 + k, { alpha: 1 }); }
      for (const j of st.jets) {
        const dx = Math.cos(j.angle); const dz = Math.sin(j.angle) * .35; const len = 210 * Math.min(1, j.t / .08);
        const x0 = p.x + dx * 36; const y0 = cy + Math.sin(j.angle) * 16; const x1 = p.x + dx * len; const y1 = cy + dz * len * .32 * 150 / 100;
        ribbon(ctx, [[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 - 3], [x1, y1]], (i, n) => 6 - i * 1.5, WATER, 3930, st.t, 1 - j.t / .22);
        thread(ctx, [[x0, y0], [x1, y1]], '#ffffff', 1.5, 1 - j.t / .22);
      }
    }
  }
});

// Breathing techniques (S40–S42 and every other element): breathing.js.

// ── S43 Sanktuarium (heal obelisk) / S44 Kriegsbanner (buff banner) ──────
// Both are breakable world props: foes can smash them (SigProp).
import { SigProp } from './signature_core.js';
import { BUFF_ZONES } from './zone_buffs.js';
const alliesNear = (gw, team, x, z, r) => [gw?.player, gw?.enemyChampion, ...(gw?.minions ?? [])].filter((e) => e && e.team === team && (e.hp ?? 0) > 0 && !e.isDead && !e.isTrainingDummy && Math.hypot(e.x - x, ((e.z ?? z) - z) * DEPTH) < r);
class Sanctuary extends SigProp {
  constructor(sig, owner, x, z) { super(sig, owner, x, z, { hp: 120, size: 16, duration: 10 }); this.radius = 100; this.acc = 0; }
  update(dt, gw) {
    this.tick(dt); this.acc += dt;
    if (this.acc >= .25) { for (const a of alliesNear(gw, this.team, this.x, this.z, this.radius)) { a.hp = Math.min(a.maxHp ?? a.hp, a.hp + 6 * this.acc); a.slowTimer = 0; } this.acc = 0; }
  }
  render(ctx) {
    const y = this.y; const f = this.fade; const t = this.t; const R = this.radius;
    if (spellSheetReady('sanct_obelisk') && spellSheetReady('sanct_circle')) {
      const rise = Math.min(1, this.t / .4);
      drawSpellSprite(ctx, 'sanct_circle', Math.floor(t * 6) % 6, this.x, y, { anchor: 'center', scale: R / 100, alpha: f });
      ctx.save(); ctx.beginPath(); ctx.rect(this.x - 30, y - 120, 60, 122); ctx.clip(); drawSpellSprite(ctx, 'sanct_obelisk', 0, this.x, y + 2 + (1 - rise) * 80, { alpha: this.hitFlash ? .6 : f, scale: .5 }); ctx.restore();
      for (let i = 0; i < 6; i++) { const ph = (t * .8 + i / 6) % 1; ctx.save(); ctx.globalAlpha = f * (1 - ph); ctx.fillStyle = '#e6ffd0'; ctx.fillRect(Math.round(this.x + Math.cos(i * 2.1) * R * .6), Math.round(y - ph * 50 + Math.sin(i * 2.1) * R * .18), 2, 2); ctx.restore(); }
      return;
    }
    ctx.save(); ctx.globalAlpha = f; ctx.lineWidth = 2.5; ctx.strokeStyle = '#9be36a'; ctx.beginPath(); ctx.ellipse(this.x, y, R, R * .32, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff8d6'; ctx.beginPath(); ctx.ellipse(this.x, y, R * .82, R * .26, 0, 0, TAU); ctx.stroke();
    for (const off of [0, Math.PI / 3]) { ctx.beginPath(); for (let i = 0; i <= 3; i++) { const a = off + t * .6 + i * TAU / 3; const qx = this.x + Math.cos(a) * R * .78; const qy = y + Math.sin(a) * R * .25; i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); } ctx.stroke(); }
    ctx.fillStyle = '#fff8d6'; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - t; ctx.fillRect(this.x + Math.cos(a) * R * .91 - 1, y + Math.sin(a) * R * .29 - 1, 3, 2); }
    ctx.restore();
    const rise = Math.min(1, this.t / .4); const h = 70 * rise;
    plate(ctx, [[this.x - 11, y], [this.x + 11, y], [this.x + 7, y - h], [this.x, y - h - 12], [this.x - 7, y - h]], { kind: 'crust', dark: '#3a3a30', body: this.hitFlash ? '#ffffff' : '#d8d2bc', facet: '#f2ecd6', vein: '#9be36a', edge: '#ffffff', spark: '#e6ffd0', core: '#ffffff', glow: 'rgba(155,227,106,', edgeGlow: 'rgba(255,255,255,' }, this.seed, { alpha: f, lit: .8, glowEdge: .6 });
    plate(ctx, [[this.x, y - h + 4], [this.x + 5, y - h + 14], [this.x, y - h + 24], [this.x - 5, y - h + 14]], { kind: 'crystal', dark: '#1e3a14', body: '#9be36a', facet: '#e6ffd0', vein: '#d8ffb0', edge: '#ffffff', spark: '#ffffff', core: '#ffffff', glow: 'rgba(155,227,106,', edgeGlow: 'rgba(255,255,255,' }, this.seed + 1, { alpha: f, core: .8, glowEdge: 1.2 });
    for (let i = 0; i < 6; i++) { const ph = (t * .8 + i / 6) % 1; ctx.save(); ctx.globalAlpha = f * (1 - ph); ctx.fillStyle = '#e6ffd0'; ctx.fillRect(this.x + Math.cos(i * 2.1) * R * .6, y + Math.sin(i * 2.1) * R * .18 - ph * 50, 3, 3); ctx.restore(); }
  }
}
class WarBanner extends SigProp {
  constructor(sig, owner, x, z) { super(sig, owner, x, z, { hp: 80, size: 12, duration: 10 }); this.radius = 110; this.dmg = 1.2; this.move = 1.1; BUFF_ZONES.add(this); }
  update(dt, gw) { this.tick(dt); if (this.isFinished || this.isDead) BUFF_ZONES.delete(this); }
  render(ctx) {
    const y = this.y; const f = this.fade; const t = this.t; const rise = Math.min(1, this.t / .3);
    if (spellSheetReady('war_banner')) {
      ctx.save(); ctx.globalAlpha = f * .8; ctx.fillStyle = '#ffd27a'; for (let i = 0; i < 80; i++) { if ((i + Math.floor(t * 8)) % 4 === 3) continue; const u = i / 80 * TAU; ctx.fillRect(Math.round(this.x + Math.cos(u) * this.radius), Math.round(y + Math.sin(u) * this.radius * .32), 2, 2); } ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(this.x - 40, y - 110, 80, 112); ctx.clip(); drawSpellSprite(ctx, 'war_banner', Math.floor(t * 10) % 6, this.x + 11, y + 2 + (1 - rise) * 100, { alpha: this.hitFlash ? .6 : f, scale: .5 }); ctx.restore();
      return;
    }
    ctx.save(); ctx.globalAlpha = f * .7; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.setLineDash?.([6, 4]); ctx.beginPath(); ctx.ellipse(this.x, y, this.radius, this.radius * .32, 0, 0, TAU); ctx.stroke(); ctx.setLineDash?.([]); ctx.restore();
    const top = y - 96 * rise;
    ctx.save(); ctx.globalAlpha = f; ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(this.x, y); ctx.lineTo(this.x, top); ctx.stroke();
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(this.x - 3, top); ctx.lineTo(this.x, top - 9); ctx.lineTo(this.x + 3, top); ctx.closePath(); ctx.fill();
    // The cloth flutters (a waving quad strip).
    const pts = Array.from({ length: 7 }, (_, i) => { const u = i / 6; return [this.x + 2 + u * 34 * rise, top + 4 + Math.sin(t * 6 - u * 4) * 3 * u]; });
    ctx.fillStyle = this.hitFlash ? '#ffffff' : '#c62828'; ctx.beginPath(); pts.forEach(([x, yy], i) => (i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy))); for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 26 - (i === pts.length - 1 ? 6 : 0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(this.x + 12 * rise, top + 12, 8 * rise, 8);
    ctx.restore();
  }
}
defineSignature('S43', { cast(c) { emit(new Sanctuary(c.sig, c.caster, c.target?.x ?? c.caster.x + (c.caster.facing || 1) * 90, c.target?.z ?? c.caster.z), c.quality); } });
defineSignature('S44', { cast(c) { emit(new WarBanner(c.sig, c.caster, c.target?.x ?? c.caster.x + (c.caster.facing || 1) * 60, c.target?.z ?? c.caster.z), c.quality); } });
// Hand-drawn rune objects (rounds 7–10) render at fine density, not through the coarse pixel layer.
for (const C of [Sanctuary, WarBanner]) Object.defineProperty(C.prototype, 'fineVfx', { value: true, writable: true, configurable: true });
