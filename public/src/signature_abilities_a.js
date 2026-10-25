// GRIMGE Prototype — signature specials A + B of the atlas:
// hover combat & kinetic power (S01–S06), time, echoes & prepared actions
// (S07–S12). Every effect is textured material (plates, bands, shards) on
// sockets or as its own world instance; the Wizard's sprite never changes.
import { drawSpellSprite, spellSheetReady, SpriteBurst } from './spell_visuals.js';
import {
  defineSignature, SIGNATURES, SigBolt, SigProp, SigSequence, startStance, endStance, emit, debris,
  foesOf, aliveFoe, groundDist, yOf, massOf, hit, projectilesOf, projKill, projSetVel, projVel, projSlow, projRelease, projHeight,
  segRing, hexMark, groundPt, crystal, slab, thread, ribbon, sparks, plate, shard, segInfo, TAU, DEPTH, snap, sigWorld
} from './signature_core.js';
import { FORM_MOVESETS, registerFormPalette } from './form_moves.js';
import { ghostOf } from './buff_signatures.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';

const S = (id) => SIGNATURES[id];
const boundsOf = (gw) => gw?.battlefield?.boundsOverride ?? gw?.battlefield?.playableBounds ?? { left: 40, right: 984 };
const clampX = (gw, x) => { const b = boundsOf(gw); return Math.max((b.left ?? 40) + 10, Math.min((b.right ?? 984) - 10, x)); };
const nearestFoe = (gw, team, x, z, range = 9999, filter = () => true) => {
  let best = null; let bd = range;
  for (const t of foesOf(gw, team)) { if (!filter(t)) continue; const d = Math.hypot(t.x - x, (t.z - z) * DEPTH); if (d < bd) { bd = d; best = t; } }
  return best;
};

// ═════════════════════════════════════════════════════════════════════════
// S01 HIMMELSREGENT — hover stance with six own heavy techniques.
// ═════════════════════════════════════════════════════════════════════════
const HOVER = 62; // ≈ 0.7 hero heights
const hoverOf = (p, st) => { const rise = st.t < .2 ? 0 : Math.min(1, (st.t - .2) / .5); const fall = Math.max(0, Math.min(1, st.timer / .45)); return (HOVER + Math.sin(st.t * 2.4) * 2) * rise * fall; };
// Six asymmetric gravity floes: four as tread plates under the feet, two at the shoulders.
function floe(ctx, x, y, w, h, rot, mat, seed, alpha) {
  const c = Math.cos(rot); const s = Math.sin(rot); const P = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  plate(ctx, [P(-w, -h * .4), P(-w * .2, -h), P(w, -h * .5), P(w * .8, h * .6), P(-w * .6, h)], mat, seed, { alpha, glowEdge: .9, lit: .8, core: .3 });
}
defineSignature('S01', {
  cast(c) { startStance(c.caster, 'S01', c.quality); c.caster.cancelSprint?.(); c.caster.rootTimer = Math.max(c.caster.rootTimer ?? 0, .7); },
  stance: {
    duration: 9, moveset: 'sig_S01', moveMult: .7,
    hint: 'HEAVY ← → ↑ ↓: HOVER-TECHNIKEN · BLOCK: SCHOLLENSCHILD',
    hover: hoverOf,
    render(ctx, p, st, ry, layer) {
      const mat = st.sig.mat; const f = p.facing || 1; const t = st.t; const h = hoverOf(p, st); const fade = Math.min(1, st.t / .4, st.timer / .5 + .2);
      const feetY = ry; const groundY = ry + h;
      if (layer === 'back') {
        // Ground anchor: a translucent shadow and the telegraphed landing point.
        ctx.save(); ctx.globalAlpha = .35 * fade; ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.ellipse(snap(p.x), snap(groundY), 16, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
        segRing(ctx, p.x, p.z, 20, mat, t, .5 * fade, { segs: 6, thick: 3, seed: 110 });
        thread(ctx, [[p.x, feetY], [p.x, groundY]], mat.edge, 1, .25 * fade);
        // Shoulder floes behind the body.
        floe(ctx, p.x - f * 20, ry - 70 + Math.sin(t * 1.7) * 3, 9, 7, -.4 * f, mat, 120, fade);
      }
      if (layer === 'front') {
        // Four broken, lit tread plates slanting under the feet.
        const crack = st.timer < .45 ? (1 - st.timer / .45) : 0;
        for (let i = 0; i < 4; i++) { const u = i - 1.5; floe(ctx, p.x + u * 9 + crack * u * 12, feetY + 3 + Math.abs(u) * 2 + crack * 10, 7 - Math.abs(u), 4, u * .25 + crack * u, mat, 130 + i, fade * (1 - crack * .6)); }
        floe(ctx, p.x + f * 18, ry - 74 + Math.sin(t * 1.9 + 1) * 3, 8, 6, .35 * f, mat, 125, fade);
        if (p.isGuarding) for (let i = 0; i < 3; i++) floe(ctx, p.x + f * (24 + (i === 1 ? 4 : 0)), ry - 30 - i * 15, 6, 9, Math.PI / 2 + (i - 1) * .2, mat, 140 + i, fade);
        if (st.t < .7) sparks(ctx, [[p.x, ry - 4]], mat, t, 150, 6, fade);
      }
    },
    end(p, st) { combat.spawnShockwave(p.x, p.y - 2, 40, st.sig.mat.edge); debris(p.x, p.y - 4, st.sig.mat, 160, 10); }
  }
});
// The six hover heavies (released from the floating height).
function hoverMoveset() {
  const sig = S('S01'); const mat = sig.mat;
  const tech = (name, make) => ({ name, make });
  const from = (p) => ({ x: p.x + (p.facing || 1) * 18, z: p.z, h: (p.worldHeight ?? 0) + HOVER * .8 });
  return {
    name: 'HIMMELSREGENT',
    forward: {
      // Sternennadeln: two very fast, barely steering crystal needles in a zigzag.
      short: tech('STERNENNADELN', (p) => new SigSequence(sig, p, { dur: .3, steps: [0, .08].map((at, i) => ({ at, fn: (s) => { const o = from(p); emit(new SigBolt({ x: o.x, z: p.z, height: 44, vx: s.facing * 820, vz: (i ? -.28 : .28), team: p.team, damage: 14, mat, size: 6, life: .8, kx: 120, onHit: (tgt) => combat.spawnHitSparks(tgt.x, tgt.y - 30, s.facing, mat.edge, 10) })); } })) })),
      // Wanderchor: three floes rise, unfold and hunt visible targets one after another.
      full: tech('WANDERCHOR', (p) => new SigSequence(sig, p, { dur: .6, steps: [0, .15, .3].map((at, i) => ({ at, fn: (s, gw) => { const foes = foesOf(gw, p.team).sort((a, b) => groundDist(a, p) - groundDist(b, p)); emit(new SigBolt({ x: p.x - s.facing * 6, z: p.z, height: 70, vx: s.facing * 220, vz: (i - 1) * .4, team: p.team, damage: 22, mat, kind: 'crystal', size: 8, life: 2.2, turn: 5, homing: foes[i] ?? foes[0] ?? null, kx: 160, lift: 80 })); } })) })),
    },
    up: {
      // Stützstoß: a narrow repulsion wave from the shoulder floes.
      short: tech('STÜTZSTOSS', (p) => new SigSequence(sig, p, { dur: .35, steps: [{ at: .05, fn: (s, gw) => s.strike(gw, (t, dx, dz) => dx * s.facing > -10 && dx * s.facing < 95 && Math.abs(dz) < 30, 10, (t, dx) => Math.sign(dx || s.facing) * 60, 330, .35) }],
        draw: (ctx, s, k) => { for (let i = 0; i < 4; i++) floe(ctx, s.x + s.facing * (20 + k * 60), yOf(s.z) - HOVER - 20 - i * 10 + k * 20, 6 + k * 6, 3, -.6 * s.facing, mat, 170 + i, 1 - k); } })),
      // Himmelsklammer: two floes far apart above the zone close and lift one enemy, then discharge.
      full: tech('HIMMELSKLAMMER', (p) => { const zx = p.x + (p.facing || 1) * 120; return new SigSequence(sig, p, { dur: 1.1, x: zx, steps: [
        { at: .35, fn: (s, gw) => { const tgt = nearestFoe(gw, p.team, zx, p.z, 70); if (tgt) { s.held = tgt; hit(tgt, 12, 0, 560 * massOf(tgt) + 120, .6); } } },
        { at: .8, fn: (s, gw) => { s.strike(gw, (t, dx, dz) => Math.hypot(dx, dz) < 55, 26, (t, dx) => Math.sign(dx || 1) * 180, 160, .4, { again: true }); combat.spawnShockwave(zx, yOf(p.z) - 70, 60, mat.edge); } }],
        draw: (ctx, s, k) => { const close = Math.min(1, s.t / .35); const y = yOf(s.z) - 110; for (const sg of [-1, 1]) floe(ctx, zx + sg * (70 - close * 52), y + (1 - close) * -20, 14, 9, sg * .3, mat, 180 + sg, Math.min(1, (1.1 - s.t) * 3)); hexMark(ctx, zx, s.z, 44, mat, s.t, .5 * (1 - k), 185); } }); })
    },
    down: {
      // Bodenstempel: a narrow force strike straight down under the real shadow point.
      short: tech('BODENSTEMPEL', (p) => new SigSequence(sig, p, { dur: .4, steps: [{ at: .08, fn: (s, gw) => { s.strike(gw, (t, dx, dz) => Math.hypot(dx, dz) < 48, 18, 0, 60, .5, { onHit: (t) => { if (t.isGuarding && Number.isFinite(t.guardStability)) t.guardStability = Math.max(0, t.guardStability - 40); } }); combat.spawnShockwave(s.x, yOf(s.z) - 4, 36, mat.vein); } }],
        draw: (ctx, s, k) => { const y0 = yOf(s.z) - HOVER; const y1 = yOf(s.z); for (let i = 0; i < 5; i++) slab(ctx, s.x + (i - 2) * 3, y0 + (y1 - y0) * Math.min(1, k * 3) * (i + 1) / 5, 6, 8, mat, 190 + i, 1 - k); } })),
      // Fallgericht: an asymmetric compression ring opens around the ground anchor, pulls light foes in and bursts outward.
      full: tech('FALLGERICHT', (p) => new SigSequence(sig, p, { dur: 1.0, power: 1,
        tick: (s, dt, gw) => { if (s.t > .55) return; for (const t of foesOf(gw, p.team)) { const d = groundDist(t, s); if (d > 125 || d < 8) continue; const m = massOf(t) * 110 * dt; t.x += (s.x - t.x) / d * m; t.z += (s.z - t.z) * DEPTH / d * m / DEPTH; } },
        steps: [{ at: .55, fn: (s, gw) => { s.strike(gw, (t, dx, dz) => Math.hypot(dx, dz) < 130, 32, (t, dx) => Math.sign(dx || 1) * 300 * massOf(t), 150, .45); combat.spawnShockwave(s.x, yOf(s.z), 130, mat.vein); environment.add('crack', s.x, s.z, { radius: 90 }); } }],
        draw: (ctx, s, k) => { const r = s.t < .55 ? 125 - s.t / .55 * 70 : 55 + (s.t - .55) * 200; segRing(ctx, s.x + Math.sin(s.t * 9) * 4, s.z, r, mat, s.t * 3, 1 - Math.max(0, k - .6) * 2.5, { segs: 9, thick: 7, gap: .5 + .2 * Math.sin(s.t * 5), seed: 200 }); } }))
    }
  };
}
FORM_MOVESETS.sig_S01 = hoverMoveset();
registerFormPalette('sig_S01', { core: '#ffffff', main: S('S01').mat.vein, edge: S('S01').mat.dark, glow: S('S01').mat.glow });

// ═════════════════════════════════════════════════════════════════════════
// S02 AUREOLENSCHWARM — six garnet lenses, charged by hits, fired by attacks.
// ═════════════════════════════════════════════════════════════════════════
defineSignature('S02', {
  cast(c) { startStance(c.caster, 'S02', c.quality, { charged: 3, hits: 0, cool: 0, emerge: 0 }); },
  stance: {
    duration: 8,
    hint: 'ANGRIFF: LINSE FEUERN · HEAVY: 2 SUCHKRISTALLE · TREFFER LADEN',
    counter: (p, st) => ({ n: st.charged, max: 6 }),
    update(p, st, dt) { st.cool = Math.max(0, st.cool - dt); },
    onEvent(p, st, type, info, gw) {
      const mat = st.sig.mat; const f = p.facing || 1;
      if (type === 'hit' && info.hits?.some((h) => !h.target.isProp)) { st.hits++; st.charged = Math.min(6, st.charged + 1); }
      if (type === 'attack' && st.charged > 0 && st.cool <= 0) {
        // One lens fires one fast bolt — never all at once.
        const tgt = nearestFoe(gw, p.team, p.x + f * 120, p.z, 260, (t) => (t.x - p.x) * f > 0);
        const vz = tgt ? Math.max(-.6, Math.min(.6, (tgt.z - p.z) * 820 / Math.max(60, Math.abs(tgt.x - p.x)))) : 0;
        emit(new SigBolt({ x: p.x + f * 14, z: p.z, height: 52, vx: f * 820, vz, team: p.team, damage: 10, mat, size: 5, life: .9, seed: 210 + st.charged }), st.quality);
        st.charged--; st.cool = .18;
      }
      if (type === 'heavy' && st.charged > 0) {
        // At most two homing crystals per heavy.
        const foes = foesOf(gw, p.team).sort((a, b) => groundDist(a, p) - groundDist(b, p));
        for (let i = 0; i < Math.min(2, st.charged); i++) emit(new SigBolt({ x: p.x, z: p.z, height: 60, vx: f * 300, vz: (i ? -.3 : .3), team: p.team, damage: 18, mat, kind: 'crystal', size: 7, life: 2, turn: 4.5, homing: foes[i] ?? foes[0] ?? null, delay: i * .12 }), st.quality);
        st.charged = Math.max(0, st.charged - 2);
      }
    },
    render(ctx, p, st, ry, layer) {
      const mat = st.sig.mat; const t = st.t; const emerge = Math.min(1, st.t / .4); const collapse = st.timer < .4 ? st.timer / .4 : 1;
      for (let i = 0; i < 6; i++) {
        // Two imperfect half rings at shoulder height, different radii.
        const ring = i % 2; const a = t * (ring ? -1.1 : .9) + i * TAU / 6 + ring * .4; const back = Math.sin(a) < 0;
        if ((layer === 'back') !== back) continue;
        const r = (ring ? 30 : 22) * emerge * collapse; const x = p.x + Math.cos(a) * r; const y = ry - 66 + ring * 8 + Math.sin(a) * r * .3;
        const lit = i < st.charged;
        if (spellSheetReady('garnet_lens')) { drawSpellSprite(ctx, 'garnet_lens', lit ? 1 : 0, x, y, { anchor: 'center', alpha: (back ? .5 : 1) * Math.min(1, emerge * 2) }); continue; }
        plate(ctx, [[x, y - 5], [x + 3.5, y], [x, y + 5], [x - 3.5, y]], mat, 220 + i, { alpha: (back ? .7 : 1) * Math.min(1, emerge * 2), core: lit ? 1 : .15, glowEdge: lit ? 1.2 : .4 });
      }
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S03 STERNENANKER — telegraphed falling star anchor, pull then tip outward.
// ═════════════════════════════════════════════════════════════════════════
class StarAnchor extends SigProp {
  constructor(sig, caster, x, z, power) { super(sig, caster, x, z, { hp: 60, size: 16, duration: 2.2 }); this.power = power; this.from = [caster.x + caster.facing * 10, caster.y - 60]; this.fell = false; this.tipped = false; }
  update(dt, gw) {
    this.tick(dt);
    if (this.isDead) return;
    if (!this.fell && this.t >= .8) {
      this.fell = true;
      combat.shakeCamera(10, .3); combat.spawnShockwave(this.x, this.y, 150, this.mat.vein);
      if (spellSheetReady('star_impact')) emit(Object.assign(new SpriteBurst({ sheet: 'star_impact', x: this.x, y: this.y, z: this.z, fps: 14, anchor: 'base', scale: 1.4 }), { fineVfx: true }));
      // The pull scales with distance; heavy fighters barely move, structures never.
      for (const t of foesOf(gw, this.team)) { const d = groundDist(t, this); if (d > 150 || d < 6) continue; const k = (1 - d / 150) * 60 * massOf(t); t.x += (this.x - t.x) / d * k; t.z += (this.z - t.z) / d * k; }
      for (const prop of environment.livingProps?.() ?? []) if (groundDist(prop, this) < 120) prop.takeDamage(25, Math.sign(prop.x - this.x) * 100, 0, 0, false, 'spell');
      environment.add('crater', this.x, this.z, { radius: 44 });
    }
    if (this.fell && this.t < 1.3) for (const p of projectilesOf(gw)) { const d = groundDist(p, this); if (d < 150 && d > 10) { const [vx, vz] = projVel(p); projSetVel(p, vx, vz + Math.sign(this.z - p.z) * .8 * dt); } }
    if (this.fell && !this.tipped && this.t >= 1.05) {
      this.tipped = true;
      for (const t of foesOf(gw, this.team)) { const d = groundDist(t, this); if (d > 150) continue; hit(t, 20 * this.power, Math.sign(t.x - this.x || 1) * 260 * massOf(t), 120 * massOf(t), .35); }
    }
    if (this.t >= 1.3 && !this.splintered) { this.splintered = true; debris(this.x, this.y - 20, this.mat, this.seed, 14, 80); }
  }
  render(ctx) {
    const mat = this.mat; const t = this.t; const y = this.y;
    if (this.t < .8) {
      // Projection line from the raised fist and the hexagonal warning mark.
      thread(ctx, [this.from, [this.x, y]], mat.edge, 1, Math.min(1, t * 4) * .7);
      hexMark(ctx, this.x, this.z, 40 + Math.sin(t * 20) * 2, mat, t, .9, this.seed);
    }
    if (this.isDead && !this.fell) return;
    if (!this.splintered) {
      // The six-rayed anchor: falls from low height, split central vein.
      const drop = this.t < .65 ? 1 : this.t < .8 ? 1 - (this.t - .65) / .15 : 0;
      const ay = y - 26 - drop * 120;
      if (spellSheetReady('star_anchor')) { drawSpellSprite(ctx, 'star_anchor', Math.floor(t * 8) % 4, this.x, ay, { anchor: 'center', alpha: Math.min(1, t * 3) }); return; }
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .2; plate(ctx, [[this.x, ay], [this.x + Math.cos(a - .18) * 26, ay + Math.sin(a - .18) * 18], [this.x + Math.cos(a) * 32, ay + Math.sin(a) * 22], [this.x + Math.cos(a + .18) * 26, ay + Math.sin(a + .18) * 18]], mat, this.seed + i, { alpha: Math.min(1, t * 3), glowEdge: .8, lit: .9 }); }
      thread(ctx, [[this.x, ay - 20], [this.x - 2, ay], [this.x + 1, ay + 18]], mat.core, 2, .9);
    } else segRing(ctx, this.x, this.z, 30, mat, t, Math.max(0, (2.2 - t) / .9) * .6, { segs: 8, thick: 4, seed: this.seed });
  }
}
defineSignature('S03', { cast(c) { emit(new StarAnchor(c.sig, c.caster, c.target?.x ?? c.caster.x + c.caster.facing * 180, c.target?.z ?? c.caster.z, c.quality.power), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S04 SCHWEBENDE BASTION — two hovering armour floes block from the front.
// ═════════════════════════════════════════════════════════════════════════
defineSignature('S04', {
  cast(c) { startStance(c.caster, 'S04', c.quality, { front: 4, side: 4 }); },
  stance: {
    duration: 7, moveMult: .6,
    hint: 'PLATTEN BLOCKEN GESCHOSSE VON VORN · BLOCK LENKT AB',
    counter: (p, st) => ({ n: st.front + st.side, max: 8 }),
    hover: (p, st) => 8 * Math.min(1, st.t / .3) * Math.min(1, st.timer / .4),
    update(p, st, dt, gw) {
      const f = p.facing || 1; const attacking = /^attack|heavyStrike/.test(p.state ?? '') && p.stateTimer > 0;
      for (const q of projectilesOf(gw)) {
        if (q.team === p.team) continue;
        const dx = (q.x - p.x) * f; const dz = Math.abs(q.z - p.z) * DEPTH;
        if (dz > 28 || projHeight(q) > (p.worldHeight ?? 0) + 110) continue;
        const front = dx > 8 && dx < 44 && st.front > 0 && !attacking; // forward attacks open a firing gap
        const side = Math.abs(dx) < 16 && st.side > 0;
        if (!front && !side) continue;
        if (p.isGuarding && front) { const [vx, vz] = projVel(q); projSetVel(q, -vx * .4, (vz || .3) * 2 + (q.z > p.z ? .6 : -.6)); q.team = p.team; combat.spawnHitSparks(q.x, yOf(q.z, projHeight(q)), f, st.sig.mat.edge, 8); continue; }
        projKill(q); combat.spawnHitSparks(q.x, yOf(q.z, projHeight(q)), -f, st.sig.mat.edge, 8);
        if (front) st.front--; else st.side--;
        if (st.front === 0 || st.side === 0) debris(p.x + f * (front ? 30 : 0), p.y - 40, st.sig.mat, 300, 8);
      }
    },
    damageTaken(p, st, amount, kx) { const fromFront = Math.abs(kx) > .01 && Math.sign(-kx) === p.facing; return fromFront && st.front > 0 ? amount * .5 : amount; },
    render(ctx, p, st, ry, layer) {
      const mat = st.sig.mat; const f = p.facing || 1; const t = st.t; const fade = Math.min(1, st.t / .3) * Math.min(1, st.timer / .4 + .1);
      const open = /^attack|heavyStrike/.test(p.state ?? '') && p.stateTimer > 0 ? 1 : 0;
      const rivets = (x, y, h) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * .9; ctx.fillStyle = mat.vein; for (let i = 0; i < 4; i++) ctx.fillRect(snap(x) - 1, snap(y - h + 6 + i * (h - 10) / 3), 2, 2); ctx.restore(); };
      if (layer === 'front' && st.front > 0) {
        const x = p.x + f * (30 + open * 8); const y = ry - 16 + Math.sin(t * 2) * 2; const tilt = open ? .5 : p.isGuarding ? -.15 : 0;
        plate(ctx, [[x - f * 4, y - 56 + tilt * 20], [x + f * 6, y - 52], [x + f * 7, y], [x - f * 5, y + 3]], mat, 310, { alpha: fade, glowEdge: .7, lit: .9 });
        rivets(x + f, y, 52);
      }
      if (layer === 'back' && st.side > 0) {
        const x = p.x - f * 6; const y = ry - 10 + Math.sin(t * 2 + 1) * 2;
        plate(ctx, [[x - 10, y - 52], [x + 8, y - 54], [x + 9, y], [x - 9, y - 2]], mat, 320, { alpha: fade * .9, glowEdge: .6, lit: .8 });
        rivets(x, y, 50);
      }
      // The fine protective weave between the plates (the right flank stays open).
      if (layer === 'front' && st.front > 0 && st.side > 0) for (let i = 0; i < 3; i++) thread(ctx, [[p.x - f * 4, ry - 20 - i * 14], [p.x + f * 14, ry - 24 - i * 14 + Math.sin(t * 3 + i) * 2], [p.x + f * 28, ry - 20 - i * 14]], mat.edge, 1, .35 * fade);
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S05 KOMETENTRÄGER — leap, diagonal comet flight dropping shards, steered dive.
// ═════════════════════════════════════════════════════════════════════════
class CometFlight {
  constructor(sig, caster, gw, power) {
    this.sig = sig; this.mat = sig.mat; this.caster = caster; this.team = caster.team; this.f = caster.facing || 1; this.t = 0; this.isFinished = false; this.power = power;
    this.x0 = caster.x; this.z = caster.z; this.landX = clampX(gw, caster.x + this.f * 250); this.dropped = 0; this.landed = false;
  }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt; const c = this.caster; const T1 = .18; const T2 = .78; const T3 = .98;
    if (!c.isAlive) { this.isFinished = true; return; }
    if (this.t < T1) { c.vx = 0; return; }
    // Steerable: the landing point follows the stick a little.
    this.landX = clampX(gw, this.landX + (c.vx ?? 0) * dt * .25);
    if (this.t < T3) {
      const k = Math.min(1, (this.t - T1) / (T2 - T1)); const d = this.t < T2 ? 0 : (this.t - T2) / (T3 - T2);
      const midX = this.x0 + (this.landX - this.x0) * .7;
      c.x = this.t < T2 ? this.x0 + (midX - this.x0) * k : midX + (this.landX - midX) * d;
      c.elevation = this.t < T2 ? Math.sin(k * Math.PI * .5) * 120 : 120 * (1 - d * d);
      c.grounded = false; c.vElevation = 0; c.z = this.z;
      // Up to three small shards dropped once during the flight.
      if (this.dropped < 3 && this.t > T1 + .15 + this.dropped * .15) { this.dropped++; this.dropShard(c.x, c.elevation); }
      return;
    }
    if (!this.landed) {
      this.landed = true; c.x = this.landX; c.elevation = 0; c.grounded = true; c.vElevation = 0;
      combat.shakeCamera(9, .3);
      if (spellSheetReady('comet_crash')) emit(Object.assign(new SpriteBurst({ sheet: 'comet_crash', x: this.landX, y: this.y, z: this.z, fps: 14, anchor: 'base' }), { fineVfx: true }));
      [0, .15, .3].forEach((at, i) => emit(new SigSequence(this.sig, c, { dur: at + .4, x: this.landX, steps: [{ at, fn: (s, w) => { s.strike(w, (t, dx, dz) => { const r = Math.hypot(dx, dz); return r >= i * 34 - 10 && r < 44 + i * 34; }, [30, 16, 10][i] * this.power, (t, dx) => Math.sign(dx || 1) * 220, 180 - i * 40, .35); combat.spawnShockwave(this.landX, this.y, 44 + i * 34, this.mat.spark); } }],
        draw: (ctx, s) => { if (s.t >= at) segRing(ctx, this.landX, this.z, 40 + i * 34, this.mat, s.t * 2, Math.max(0, 1 - (s.t - at) / .4), { segs: 10 + i * 2, thick: 4, gap: .45, seed: 400 + i * 20 }); } })));
      environment.add('crack', this.landX, this.z, { radius: 80 });
    }
    this.isFinished = true;
  }
  dropShard(x, h) {
    const sig = this.sig;
    emit(new SigSequence(sig, this.caster, { dur: .45, x, data: { h0: h }, steps: [{ at: .3, fn: (s, w) => { s.strike(w, (t, dx, dz) => Math.hypot(dx, dz) < 34, 14 * this.power, 0, 120, .3); combat.spawnHitSparks(s.x, s.y, 1, sig.mat.edge, 8); } }],
      draw: (ctx, s) => { if (s.t < .3) { const h = s.h0 * (1 - s.t / .3); shard(ctx, s.x, s.y - h - 30, 5, s.t * 12, sig.mat, 430, 1); } } }));
  }
  render(ctx) {
    const c = this.caster; const mat = this.mat;
    if (!this.landed) segRing(ctx, this.landX, this.z, 38, mat, this.t * 2, .8, { segs: 10, thick: 3, seed: 440 });
    if (this.t < .18) { for (const sg of [-1, 1]) ribbon(ctx, [[c.x + sg * 6, c.y], [c.x + sg * 10, c.y - 6], [c.x + sg * 5, c.y - 12]], 2, mat, 450, this.t, 1); }
    else if (!this.landed && spellSheetReady('comet_mantle')) drawSpellSprite(ctx, 'comet_mantle', Math.floor(this.t * 14) % 6, c.x - this.f * 8, c.y - 40, { anchor: 'center', flip: this.f < 0 });
    else if (!this.landed) {
      // Ellipsoid sky fragment as comet mantle around the Wizard, core behind the back.
      const cy = c.y - 40; // y already includes the elevation
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + this.t * 4; plate(ctx, [[c.x + Math.cos(a) * 26, cy + Math.sin(a) * 34], [c.x + Math.cos(a + .5) * 22, cy + Math.sin(a + .5) * 30], [c.x + Math.cos(a + .25) * 30, cy + Math.sin(a + .25) * 40]], mat, 460 + i, { alpha: .6, glowEdge: .8 }); }
      plate(ctx, [[c.x - this.f * 12, cy - 6], [c.x - this.f * 30, cy], [c.x - this.f * 12, cy + 6]], mat, 470, { alpha: 1, core: 1, glowEdge: 1.2 });
      sparks(ctx, [[c.x - this.f * 24, cy]], mat, this.t, 471, 8, 1);
    }
  }
}
defineSignature('S05', { cast(c) { c.caster.cancelSprint?.(); emit(new CometFlight(c.sig, c.caster, c.gw, c.quality.power), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S06 LUFTNÄHTE — a taut seam between two air anchors: push and bent shots.
// ═════════════════════════════════════════════════════════════════════════
class SeamAnchor extends SigProp {
  constructor(sig, owner, x, z) { super(sig, owner, x, z, { hp: 30, size: 10, duration: 6 }); }
  update(dt) { this.tick(dt); }
  render(ctx) { const y = this.y - 34 + Math.sin(this.t * 3) * 2; plate(ctx, [[this.x, y - 7], [this.x + 6, y], [this.x, y + 7], [this.x - 6, y]], this.mat, this.seed, { alpha: this.fade * (this.hitFlash ? .6 : 1), core: 1, glowEdge: 1 }); }
}
class AirSeam {
  constructor(sig, owner, a, b, gw) {
    this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.a = a; this.b = b; this.t = 0; this.isFinished = false; this.crossings = 0; this.sides = new Map(); this.cool = new Map();
    this.anchors = [new SeamAnchor(sig, owner, a.x, a.z), new SeamAnchor(sig, owner, b.x, b.z)]; this.anchors.forEach((p) => emit(p));
    this.x = (a.x + b.x) / 2; this.z = (a.z + b.z) / 2;
  }
  get y() { return groundYForDepth(this.z); }
  tear() { if (this.torn) return; this.torn = true; this.tornAt = this.t; this.anchors.forEach((p) => { p.duration = Math.min(p.duration, p.t + .3); }); combat.spawnShockwave(this.x, this.y - 34, 60, this.mat.edge); }
  update(dt, gw) {
    this.t += dt;
    if (this.torn) { if (this.t - this.tornAt > .35) this.isFinished = true; return; }
    if (this.t > 6 || this.anchors.some((p) => p.isDead)) { this.tear(); return; }
    // Fighters crossing the seam (both sides!) get a short controlled push along it.
    for (const e of [gw.player, gw.enemyChampion].filter((e) => e?.isAlive)) {
      const info = segInfo(this.a, this.b, e.x, e.z); const prev = this.sides.get(e); this.sides.set(e, info.side);
      const cd = (this.cool.get(e) ?? 0) - dt; this.cool.set(e, cd);
      if (prev && prev !== info.side && info.dist < 30 && info.u > 0 && info.u < 1 && cd <= 0) {
        const dir = Math.sign((e.vx ?? 0) * info.tx + (e.vz ?? 0) * info.tz) || 1;
        e.kbVelX = info.tx * dir * 420; e.z = Math.max(.05, Math.min(.95, e.z + info.tz * dir * 40 / DEPTH));
        this.cool.set(e, .5); this.crossings++; combat.spawnShockwave(e.x, e.y - 30, 30, this.mat.edge);
        if (this.crossings >= 2) { this.tear(); return; }
      }
    }
    // Own projectiles near the seam bend along it.
    for (const p of projectilesOf(gw)) {
      if (p.team !== this.team || p._seamBent) continue;
      const info = segInfo(this.a, this.b, p.x, p.z); if (info.dist > 26 || info.u <= 0 || info.u >= 1) continue;
      const [vx] = projVel(p); const sp = Math.abs(vx) || 500; const dir = Math.sign(vx * info.tx) || 1;
      projSetVel(p, (vx + info.tx * dir * sp) / 2, info.tz * dir * sp / DEPTH * .5); p._seamBent = true;
    }
  }
  render(ctx) {
    const mat = this.mat; const pa = [this.a.x, groundYForDepth(this.a.z) - 34]; const pb = [this.b.x, groundYForDepth(this.b.z) - 34];
    const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([pa[0] + (pb[0] - pa[0]) * u, pa[1] + (pb[1] - pa[1]) * u - Math.sin(u * Math.PI) * 18 + Math.sin(this.t * 6 + u * 9) * (this.torn ? 6 : 1)]); }
    if (this.torn) { const k = 1 - (this.t - this.tornAt) / .35; thread(ctx, pts.map(([x, y], i) => [x, y + (i % 2 ? -6 : 6)]), mat.core, 2, k); return; }
    thread(ctx, pts, mat.body, 3, .45); ribbon(ctx, pts, 1.6, mat, 500, this.t, .9);
    for (let i = 2; i < 12; i += 3) plate(ctx, [[pts[i][0] - 3, pts[i][1]], [pts[i][0], pts[i][1] - 3], [pts[i][0] + 3, pts[i][1]], [pts[i][0], pts[i][1] + 3]], mat, 510 + i, { alpha: 1, core: 1 });
    for (let k = 0; k < 2 - this.crossings; k++) plate(ctx, [[pts[6][0] - 8 + k * 10, pts[6][1] - 14], [pts[6][0] - 4 + k * 10, pts[6][1] - 18], [pts[6][0] + k * 10, pts[6][1] - 14]], mat, 520 + k, { alpha: .9 });
  }
}
defineSignature('S06', { cast(c) { const f = c.caster.facing || 1; const a = c.target?.a ?? { x: c.caster.x + f * 50, z: c.caster.z }; const b = c.target?.b ?? { x: c.caster.x + f * 230, z: c.caster.z }; emit(new AirSeam(c.sig, c.caster, a, b, c.gw), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S07 NACHHALLARCHIV — the first two attacks replay as brighter magic echoes.
// ═════════════════════════════════════════════════════════════════════════
defineSignature('S07', {
  cast(c) { startStance(c.caster, 'S07', c.quality, { recorded: 0, played: 0 }); },
  stance: {
    duration: 6,
    hint: 'DEINE NÄCHSTEN 2 ANGRIFFE WIEDERHOLEN SICH ALS ECHO',
    counter: (p, st) => ({ n: 2 - st.recorded, max: 2 }),
    onEvent(p, st, type) {
      if (type !== 'attack' || st.recorded >= 2) return;
      st.recorded++; const sig = st.sig; const f = p.facing || 1; const x = p.x; const z = p.z; const power = st.quality?.power ?? 1;
      // Only the hitbox pattern and direction are archived — the echo is a pure magic repeat.
      emit(new SigSequence(sig, p, { dur: .75, x, z, steps: [{ at: .35, fn: (s, gw) => { s.strike(gw, (t, dx, dz) => dx * f > -10 && dx * f < 84 && Math.abs(dz) < 33, 14 * power, f * 160, 80, .25); st.played++; if (st.played >= 2 && p.signature === st) st.timer = Math.min(st.timer, .3); } }],
        draw: (ctx, s) => { if (s.t < .35) return; const k = (s.t - .35) / .4; const y = groundYForDepth(z) - 44; for (let i = 0; i < 5; i++) { const a = -1.1 + i * .55; plate(ctx, [[x + f * 18, y], [x + f * (18 + Math.cos(a) * 70), y + Math.sin(a) * 40], [x + f * (18 + Math.cos(a + .3) * 52), y + Math.sin(a + .3) * 30]], sig.mat, 600 + i, { alpha: (1 - k) * .9, glowEdge: 1.2, core: .5 }); } } }), st.quality);
    },
    render(ctx, p, st, ry, layer) {
      if (layer !== 'back') return;
      const mat = st.sig.mat; const f = p.facing || 1;
      // Two narrow splintered clock arcs open behind the shoulders.
      for (const sg of [-1, 1]) { const pts = []; for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + sg * (.3 + i * .22) + Math.sin(st.t * 2) * .05; pts.push([p.x - f * 6 + Math.cos(a) * 26 * f, ry - 64 + Math.sin(a) * 26]); } ribbon(ctx, pts, 2, mat, 610 + sg, st.t, .85); for (let i = 1; i < 6; i += 2) shard(ctx, pts[i][0], pts[i][1], 2.5, i, mat, 620 + i, .8); }
      for (let k = 0; k < 2 - st.recorded; k++) plate(ctx, [[p.x - f * 6 - 4 + k * 8, ry - 96], [p.x - f * 6 + k * 8, ry - 100], [p.x - f * 6 + 4 + k * 8, ry - 96], [p.x - f * 6 + k * 8, ry - 92]], mat, 630 + k, { alpha: .9, core: 1 });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S08 SEKUNDENPFAND — records positions for 1.5 s, then pillars strike them.
// ═════════════════════════════════════════════════════════════════════════
class SecondPledge {
  constructor(sig, owner, x, z, power) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.x = x; this.z = z; this.t = 0; this.isFinished = false; this.marks = []; this.sample = 0; this.power = power; this.R = 95; }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt;
    if (this.t < 1.5) {
      this.sample -= dt;
      if (this.sample <= 0) {
        this.sample = .22;
        for (const t of foesOf(gw, this.team)) { if (groundDist(t, this) > this.R || this.marks.length >= 6) continue; if (this.marks.some((m) => Math.hypot(m.x - t.x, (m.z - t.z) * DEPTH) < 26)) continue; this.marks.push({ x: t.x, z: t.z, state: t.state, struck: false }); }
      }
      return;
    }
    // Pillars land on the recorded spots one after another — not where enemies are now.
    this.marks.forEach((m, i) => {
      if (m.struck || this.t < 1.5 + i * .14) return;
      m.struck = true; m.at = this.t;
      for (const t of foesOf(gw, this.team)) if (Math.hypot(t.x - m.x, (t.z - m.z) * DEPTH) < 28) hit(t, 34 * this.power, 0, 220 * massOf(t) + 60, .4);
      combat.spawnShockwave(m.x, groundYForDepth(m.z) - 4, 30, this.mat.edge);
    });
    if (this.t > 1.5 + this.marks.length * .14 + .8) this.isFinished = true;
  }
  render(ctx) {
    const mat = this.mat; const t = this.t; const fold = this.t > 1.5 + this.marks.length * .14 ? Math.max(0, 1 - (this.t - 1.5 - this.marks.length * .14) / .8) : 1;
    // Open asymmetric seal with six jagged digit marks and a wandering light point.
    segRing(ctx, this.x, this.z, this.R * (fold * .5 + .5), mat, 0, .75 * fold, { segs: 6, thick: 6, gap: .5, spin: 0, seed: 700 });
    const lp = groundPt(this.x, this.z, this.R + 3, t * 4.2); plate(ctx, [[lp[0], lp[1] - 4], [lp[0] + 3, lp[1]], [lp[0], lp[1] + 4], [lp[0] - 3, lp[1]]], mat, 710, { alpha: fold, core: 1, glowEdge: 1.2 });
    for (const m of this.marks) {
      const y = groundYForDepth(m.z);
      if (!m.struck) { thread(ctx, [[m.x - 7, y - 2], [m.x - 6, y - 40], [m.x, y - 48], [m.x + 6, y - 40], [m.x + 7, y - 2]], mat.edge, 1, .7); continue; }
      const k = (this.t - m.at) / .45; if (k > 1) continue;
      slab(ctx, m.x, y, 10 * (1 - k * .5), 120 * Math.min(1, k * 4), mat, 720 + Math.round(m.x), 1 - k);
    }
  }
}
defineSignature('S08', { cast(c) { emit(new SecondPledge(c.sig, c.caster, c.target?.x ?? c.caster.x + c.caster.facing * 150, c.target?.z ?? c.caster.z, c.quality.power), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S09 STILLFUGE — a stasis dome: projectiles crawl, small foes attack slowly.
// ═════════════════════════════════════════════════════════════════════════
class StillFugue {
  constructor(sig, owner, x, z, area) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.x = x; this.z = z; this.t = 0; this.isFinished = false; this.R = 95 * area; this.held = new Set(); }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt;
    if (this.t < .8) return;
    const ending = this.t >= 4.8;
    for (const p of projectilesOf(gw)) {
      const inside = groundDist(p, this) < this.R;
      if (inside && !ending) { projSlow(p, .16, this); p.life += dt * .84; this.held.add(p); }
      else if (this.held.has(p)) { projRelease(p); this.held.delete(p); }
    }
    if (!ending) for (const t of foesOf(gw, this.team)) { if (t.isBoss || groundDist(t, this) > this.R) continue; t.slow?.(.2, .6); if (Number.isFinite(t.attackCooldown)) t.attackCooldown += dt * .6; }
    if (ending) {
      // Collapse: own projectiles fly on, hostile ones dissolve.
      for (const p of this.held) { projRelease(p); if (p.team !== this.team) { projKill(p); combat.spawnHitSparks(p.x, yOf(p.z, projHeight(p)), 1, this.mat.vein, 6); } }
      this.held.clear(); this.isFinished = true; debris(this.x, this.y - 40, this.mat, 800, 12, 90);
    }
  }
  render(ctx) {
    const mat = this.mat; const t = this.t; const close = Math.min(1, t / .8); const R = this.R;
    if (t < .8) { hexMark(ctx, this.x, this.z, 26 + close * 20, mat, t, .9, 810); for (let i = 0; i < 6; i++) { const a = i * 1.7; shard(ctx, this.x + Math.cos(a) * 14, this.y - 10 - ((t * .15 + i * .17) % 1) * 30, 2.5, t * .4 + i, mat, 820 + i, .9); } return; }
    // Contoured dome: segmented warning rim + glass flakes floating too slowly inside.
    segRing(ctx, this.x, this.z, R, mat, t, .8, { segs: 18, thick: 4, gap: .7, spin: .05, seed: 830 });
    for (let m = 0; m < 4; m++) { const a = m / 4 * Math.PI; const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10 * Math.PI; pts.push([this.x + Math.cos(u) * R * Math.cos(a), this.y + Math.cos(u) * R * .32 * Math.sin(a) - Math.sin(u) * R * .8]); } thread(ctx, pts, mat.edge, 1, .3); }
    for (let i = 0; i < 9; i++) { const a = i * 2.39; const r = R * (.2 + (i % 4) * .18); shard(ctx, this.x + Math.cos(a) * r, this.y - 20 - (i % 3) * 22 - Math.sin(t * .4 + i) * 4, 3, t * .3 + i, mat, 840 + i, .85); }
  }
}
defineSignature('S09', { cast(c) { emit(new StillFugue(c.sig, c.caster, c.target?.x ?? c.caster.x + c.caster.facing * 130, c.target?.z ?? c.caster.z, c.quality.area), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S10 RÜCKSPRUNGNADEL — a position needle; snap back at the end or on ⛨⛨.
// ═════════════════════════════════════════════════════════════════════════
class RecallNeedle extends SigProp {
  constructor(sig, owner, x, z) { super(sig, owner, x, z, { hp: 30, size: 10, duration: 99 }); }
  update(dt) { this.tick(dt); }
  render(ctx) {
    const mat = this.mat; const y = this.y; const t = this.t;
    segRing(ctx, this.x, this.z, 16, mat, t, .8, { segs: 3, thick: 4, gap: .7, spin: 1.4, seed: this.seed });
    // Vertical dagger of four light-refracting segments.
    for (let i = 0; i < 4; i++) slab(ctx, this.x, y - 6 - i * 12, 6 - i, 11, mat, this.seed + 10 + i, this.hitFlash ? .6 : 1);
    plate(ctx, [[this.x - 2, y - 54], [this.x + 2, y - 54], [this.x, y - 64]], mat, this.seed + 20, { alpha: 1, core: 1 });
  }
}
defineSignature('S10', {
  cast(c) { const n = emit(new RecallNeedle(c.sig, c.caster, c.caster.x, c.caster.z)); startStance(c.caster, 'S10', c.quality, { needle: n, anchor: { x: c.caster.x, z: c.caster.z }, guardWas: false, lastTap: -9 }); },
  stance: {
    duration: 5,
    hint: 'NACH 5 S ODER 2× BLOCK: ZURÜCK ZUR NADEL',
    update(p, st) {
      if (st.needle.isDead) { st.cancelled = true; st.timer = 0; return; }
      // Double-tap DEFENSE: jump back early.
      if (p.isGuarding && !st.guardWas) { if (st.t - st.lastTap < .35) st.timer = 0; st.lastTap = st.t; }
      st.guardWas = !!p.isGuarding;
    },
    end(p, st, reason) {
      st.needle.duration = Math.min(st.needle.duration, st.needle.t + .3);
      if (st.cancelled || reason === 'down' || reason === 'replaced') return;
      const stunned = (p.state === 'hurt' && p.stateTimer > 0) || p.freezeTimer > 0 || p.grabbedBy;
      if (stunned) { window.gameWorld?.showAnnouncement?.('RÜCKSPRUNG BLOCKIERT', .8); return; }
      const from = { x: p.x, y: p.y };
      p.x = st.anchor.x; p.z = st.anchor.z; p.elevation = 0; p.vElevation = 0; p.vx = 0; p.kbVelX = 0;
      window.gameWorld?.battlefield?.resolveEntityCollision?.(p);
      const sig = st.sig;
      emit(new SigSequence(sig, p, { dur: .5, draw: (ctx, s) => { const k = 1 - s.t / .5; thread(ctx, [[from.x, from.y - 40], [p.x, p.y - 40]], sig.mat.edge, 2, k); for (let i = 0; i < 6; i++) { const u = i / 5; shard(ctx, from.x + (p.x - from.x) * u, from.y - 40 + (p.y - from.y) * u, 3, i + s.t * 5, sig.mat, 900 + i, k); } } }));
      combat.spawnShockwave(p.x, p.y - 30, 40, sig.mat.edge);
    },
    render(ctx, p, st, ry, layer) { if (layer === 'front') thread(ctx, [[p.x, ry - 40], [st.anchor.x, groundYForDepth(st.anchor.z) - 40]], st.sig.mat.edge, 1, .18 + .1 * Math.sin(st.t * 6)); }
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S11 SPIEGELVERSATZ — an afterimage beside you repeats your next two hits.
// ═════════════════════════════════════════════════════════════════════════
class MirrorOffset {
  constructor(sig, owner, x, z, power) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.x = x; this.z = z; this.t = 0; this.isFinished = false; this.left = 2; this.power = power; this.swing = -9; }
  get y() { return groundYForDepth(this.z); }
  onSigEvent(type, info, gw) {
    if (type !== 'hit' || this.left <= 0 || !info.hits?.some((h) => !h.target.isProp)) return;
    this.left--; const f = this.owner.facing || 1;
    emit(new SigSequence(this.sig, this.owner, { dur: .2, x: this.x, z: this.z, steps: [{ at: .15, fn: (s, w) => { this.swing = this.t; s.strike(w, (t, dx, dz) => dx * f > -10 && dx * f < 82 && Math.abs(dz) < 33, 12 * this.power, f * 150, 70, .25); } }] }));
    if (this.left <= 0) this.endAt = this.t + .5;
  }
  update(dt) { this.t += dt; if (this.t > 6 || (this.endAt && this.t > this.endAt)) { if (!this.broken) { this.broken = true; debris(this.x, this.y - 40, this.mat, 950, 12, 70); } this.isFinished = true; } }
  render(ctx) {
    const o = this.owner; const f = o.facing || 1; const mat = this.mat;
    // A washed-out image of the current weapon stance, bound to the live sprite.
    ghostOf(ctx, o, this.x, this.y, this.t - this.swing < .25 ? 'attack1' : o.state, o.animTime, f, .45, mat.edge);
    for (const sg of [-1, 1]) plate(ctx, [[this.x + sg * 22, this.y - 82], [this.x + sg * 24, this.y - 82], [this.x + sg * 18, this.y - 4], [this.x + sg * 16, this.y - 4]], mat, 960 + sg, { alpha: .85, glowEdge: 1 });
    for (let k = 0; k < this.left; k++) plate(ctx, [[this.x - 4 + k * 8, this.y - 96], [this.x + k * 8, this.y - 100], [this.x + 4 + k * 8, this.y - 96]], mat, 970 + k, { alpha: .9, core: 1 });
  }
}
defineSignature('S11', {
  cast(c) {
    const o = c.caster; let x = c.target?.x ?? o.x - o.facing * 60; let z = c.target?.z ?? Math.min(.92, o.z + .25);
    const d = Math.hypot(x - o.x, (z - o.z) * DEPTH); if (d > 170) { x = o.x + (x - o.x) * 170 / d; z = o.z + (z - o.z) * 170 / d; }
    c.listen(emit(new MirrorOffset(c.sig, o, x, z, c.quality.power), c.quality));
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S12 SCHICKSALSNADEL — thread one foe, pin, charge twice, follow-up thrust.
// ═════════════════════════════════════════════════════════════════════════
class FateNeedle {
  constructor(sig, owner, target, power) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.target = target; this.t = 0; this.isFinished = false; this.pinned = false; this.charges = 0; this.power = power; this.vec = owner.facing || 1; }
  get x() { return this.target.x; } get z() { return this.target.z; } get y() { return groundYForDepth(this.z); }
  onSigEvent(type, info, gw) {
    if (type !== 'hit' || this.done) return;
    const h = info.hits?.find((e) => e.target === this.target); if (!h) return;
    this.vec = this.owner.facing || 1;
    if (!this.pinned) { this.pinned = true; combat.spawnHitSparks(this.target.x, this.target.y - 40, this.vec, this.mat.edge, 10); return; }
    if (h.blocked) { this.fail('NADEL ABGEWEHRT'); return; }
    this.charges++;
    if (this.charges >= 2) this.release(gw);
  }
  fail(msg) { this.done = true; this.endAt = this.t + .4; window.gameWorld?.showAnnouncement?.(msg, .7); }
  release(gw) {
    // A limited follow-up thrust along the last attack vector — no execute.
    this.done = true; this.endAt = this.t + .5; const f = this.vec; const x0 = this.target.x - f * 50;
    emit(new SigSequence(this.sig, this.owner, { dur: .5, x: x0, z: this.target.z, steps: [{ at: .05, fn: (s, w) => s.strike(w, (t, dx, dz) => dx * f > -6 && dx * f < 130 && Math.abs(dz) < 20, 30 * this.power, f * 260, 100, .35) }],
      draw: (ctx, s) => { const k = s.t / .5; const y = s.y - 40; plate(ctx, [[x0, y - 3], [x0 + f * 140 * Math.min(1, k * 3), y], [x0, y + 3]], this.mat, 990, { alpha: 1 - k, core: 1, glowEdge: 1.2 }); } }));
    for (let i = 0; i < 3; i++) debris(this.target.x, this.target.y - 50, this.mat, 995 + i, 2, 50);
  }
  update(dt) { this.t += dt; if (!aliveFoe(this.target)) { this.isFinished = true; return; } if (this.t > 8 && !this.done) this.fail('NADEL VERFALLEN'); if (this.endAt && this.t > this.endAt) this.isFinished = true; }
  render(ctx) {
    const tg = this.target; const mat = this.mat; const o = this.owner; const top = tg.y - (tg.renderHeight ?? 70) - 14;
    if (!this.pinned) {
      thread(ctx, [[o.x + o.facing * 14, o.y - 46], [tg.x, tg.y - 44]], mat.edge, 1, .5);
      // Three asymmetric needles spinning over the target.
      for (let i = 0; i < 3; i++) { const a = this.t * 4 + i * TAU / 3; plate(ctx, [[tg.x + Math.cos(a) * 8, top + Math.sin(a) * 3], [tg.x + Math.cos(a) * 2, top - 12 - i * 2], [tg.x - Math.cos(a) * 3, top + Math.sin(a) * 2]], mat, 1000 + i, { alpha: .95, glowEdge: .9 }); }
      return;
    }
    if (this.done) return;
    plate(ctx, [[tg.x - 8, tg.y - 50], [tg.x + 6, tg.y - 40], [tg.x + 4, tg.y - 38]], mat, 1010, { alpha: 1, core: 1, glowEdge: 1 });
    // Thin blue heartbeat lines show the charge.
    for (let k = 0; k < this.charges + 1; k++) thread(ctx, [[tg.x - 10, top + k * 5], [tg.x - 4, top + k * 5], [tg.x - 2, top - 4 + k * 5], [tg.x + 1, top + 4 + k * 5], [tg.x + 4, top + k * 5], [tg.x + 10, top + k * 5]], mat.vein, 1, .8);
  }
}
defineSignature('S12', {
  cast(c) {
    const pt = c.target ?? { x: c.caster.x + c.caster.facing * 120, z: c.caster.z };
    const tgt = nearestFoe(c.gw, c.caster.team, pt.x, pt.z, 110) ?? nearestFoe(c.gw, c.caster.team, c.caster.x, c.caster.z, 300);
    if (!tgt) { c.gw?.showAnnouncement?.('KEIN ZIEL FÜR DIE SCHICKSALSNADEL', .9); return; }
    c.listen(emit(new FateNeedle(c.sig, c.caster, tgt, c.quality.power), c.quality));
  }
});

export const SIGNATURES_A = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10', 'S11', 'S12'];
