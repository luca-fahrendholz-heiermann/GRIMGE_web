// GRIMGE Prototype — signature specials E + F of the atlas:
// constructs, helpers & combat objects (S25–S30), arena rules, resonance &
// metamagic (S31–S36). No summon AI, no clone figures: constructs are
// external pieces (arm, fist, plate), helpers are projections on sockets.
import {
  defineSignature, SigBolt, SigProp, SigSequence, startStance, emit, debris, sigSink,
  foesOf, aliveFoe, groundDist, yOf, massOf, hit, projectilesOf, projKill, projSetVel, projVel, projHeight, projDamage,
  segRing, hexMark, groundPt, crystal, slab, thread, ribbon, sparks, plate, shard, segInfo, lineOf, TAU, DEPTH, snap
} from './signature_core.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';

const linePts = (a, b, n, lift = 0, bulge = 0) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [a.x + (b.x - a.x) * u, groundYForDepth(a.z + (b.z - a.z) * u) - lift - Math.sin(u * Math.PI) * bulge]; });
const nearestFoe = (gw, team, x, z, range = 9999, filter = () => true) => { let best = null; let bd = range; for (const t of foesOf(gw, team)) { if (!filter(t)) continue; const d = Math.hypot(t.x - x, (t.z - z) * DEPTH); if (d < bd) { bd = d; best = t; } } return best; };
const fromFront = (p, kx) => Math.abs(kx) > .01 && Math.sign(-kx) === (p.facing || 1);

// ═════════════════════════════════════════════════════════════════════════
// S25 KLINGENCHOR — three orbiting blades: melee charges them, a heavy sends them.
// ═════════════════════════════════════════════════════════════════════════
const bladePos = (p, st, i, ry) => { const lag = st.lag ?? 0; const a = st.t * 1.4 + i * TAU / 3; return { x: p.x + Math.cos(a) * 30 - lag * 10, y: ry - 40 - i * 14 + Math.sin(a) * 6, back: Math.sin(a) < 0, a }; };
defineSignature('S25', {
  cast(c) { startStance(c.caster, 'S25', c.quality, { blades: [0, 1, 2].map(() => ({ charged: false, gone: false })), blocks: 3, lag: 0 }); },
  stance: {
    duration: 7,
    update(p, st, dt, gw) {
      st.lag += ((p.vx ?? 0) / 300 * (p.facing || 1) - st.lag) * Math.min(1, dt * 4); // inertia behind the facing
      for (const q of projectilesOf(gw)) {
        if (q.team === p.team || projDamage(q) > 30 || st.blocks <= 0) continue;
        if (groundDist(q, p) > 34 || projHeight(q) > (p.worldHeight ?? 0) + 110) continue;
        const blade = st.blades.find((b) => !b.gone && !b.charged); if (!blade) continue;
        projKill(q); st.blocks--; combat.spawnHitSparks(q.x, yOf(q.z, projHeight(q)), 1, st.sig.mat.edge, 8);
      }
    },
    onEvent(p, st, type, info, gw) {
      if (type === 'hit' && info.hits?.some((h) => !h.target.isProp)) { const b = st.blades.find((x) => !x.gone && !x.charged); if (b) b.charged = true; }
      if (type === 'heavy') {
        // Only charged blades fly at the target.
        const tgt = info.target ?? nearestFoe(gw, p.team, p.x + (p.facing || 1) * 100, p.z, 320);
        st.blades.forEach((b, i) => { if (!b.charged || b.gone) return; b.gone = true; const bp = bladePos(p, st, i, p.y); emit(new SigBolt({ x: bp.x, z: p.z, height: p.y - bp.y, vx: (p.facing || 1) * 520, vz: (i - 1) * .3, team: p.team, damage: 20, mat: st.sig.mat, size: 9, life: 1.6, turn: 6, homing: tgt, delay: i * .08, kx: 200, lift: 90, seed: 2500 + i }), st.quality); });
        if (st.blades.every((b) => b.gone)) st.timer = Math.min(st.timer, .3);
      }
    },
    render(ctx, p, st, ry, layer) {
      const mat = st.sig.mat; const f = p.facing || 1;
      st.blades.forEach((b, i) => {
        if (b.gone) return; const bp = bladePos(p, st, i, ry); if ((layer === 'back') !== bp.back) return;
        // Ornate splinter blade with a narrow core slit and its own weight shadow.
        const L = 22; const c = Math.cos(.3 * f); const s = Math.sin(.3 * f);
        const P = (u, v) => [bp.x + (u * c - v * s) * f, bp.y + u * s + v * c];
        plate(ctx, [P(-8, 0), P(-2, -3.5), P(L, -1), P(L + 6, 0), P(L, 1.5), P(-2, 3.5)], mat, 2510 + i, { alpha: bp.back ? .75 : 1, glowEdge: b.charged ? 1.4 : .5, core: b.charged ? 1 : .2, lit: .8 });
        plate(ctx, [P(-10, -4), P(-6, -6), P(-6, 6), P(-10, 4)], mat, 2520 + i, { alpha: bp.back ? .75 : 1, lit: .9 });
        ctx.save(); ctx.globalAlpha = .2; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(snap(bp.x), snap(ry + 2), 8, 2, 0, 0, TAU); ctx.fill(); ctx.restore();
      });
    },
    end(p, st) { st.blades.forEach((b, i) => { if (!b.gone) debris(p.x + (i - 1) * 20, p.y - 50, st.sig.mat, 2530 + i, 4); }); }
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S26 MARIONETTENFADEN — light threads bind a crate, wall, minion or summon.
// ═════════════════════════════════════════════════════════════════════════
class PuppetThread {
  constructor(sig, owner, obj, kind, power) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.obj = obj; this.kind = kind; this.t = 0; this.isFinished = false; this.power = power; this.bowled = new Set(); }
  get x() { return this.obj.x; } get z() { return this.obj.z ?? this.owner.z; } get y() { return groundYForDepth(this.z); }
  snap(why) { if (this.snapped) return; this.snapped = this.t; if (why) window.gameWorld?.showAnnouncement?.(why, .6); }
  update(dt, gw) {
    this.t += dt; const o = this.owner; const obj = this.obj;
    if (this.snapped != null) { if (this.t - this.snapped > .35) this.isFinished = true; return; }
    if (this.t > 4 || obj.isDead || !o.isAlive) { this.snap(); return; }
    if ((o.state === 'hurt' && o.stateTimer > 0) || groundDist(o, obj) > 340) { this.snap('FÄDEN GERISSEN'); return; }
    if (this.kind === 'wall') return; // walls are toppled once on bind
    // Drag toward the point in front of the Wizard (strict mass limit).
    const tx = o.x + (o.facing || 1) * 60; const tz = o.z; const d = Math.hypot(tx - obj.x, (tz - obj.z) * DEPTH);
    if (d > 6) { const sp = (this.kind === 'crate' ? 160 : 110) * dt; obj.x += (tx - obj.x) / d * Math.min(d, sp); obj.z += (tz - obj.z) / d * Math.min(d, sp); }
    if (this.kind === 'crate' && d > 20) for (const t of foesOf(gw, this.team)) { if (this.bowled.has(t) || groundDist(t, obj) > 24) continue; this.bowled.add(t); hit(t, 16 * this.power, Math.sign(tx - obj.x || 1) * 220, 90, .3); obj.takeDamage?.(10, 0, 0, 0, false, 'spell'); }
  }
  render(ctx) {
    const o = this.owner; const obj = this.obj; const mat = this.mat; const k = this.snapped != null ? 1 - (this.t - this.snapped) / .35 : Math.min(1, this.t * 4);
    const oy = groundYForDepth(obj.z ?? o.z) - (obj.heroKey ? 50 : 20);
    for (let i = 0; i < 3; i++) { const sx = o.x + (o.facing || 1) * (12 + i * 3); const sy = o.y - 46 - i * 3; const mx = (sx + obj.x) / 2; const my = Math.min(sy, oy) - 18 + Math.sin(this.t * 5 + i) * 3; const cut = this.snapped != null && i * .1 < this.t - this.snapped; thread(ctx, cut ? [[sx, sy], [mx, my]] : [[sx, sy], [mx, my], [obj.x + (i - 1) * 5, oy]], i === 1 ? mat.vein : mat.edge, 1, k * .9); }
    plate(ctx, [[obj.x - 4, oy - 4], [obj.x + 4, oy - 4], [obj.x + 4, oy + 4], [obj.x - 4, oy + 4]], mat, 2600, { alpha: k, glowEdge: 1 });
  }
}
defineSignature('S26', {
  cast(c) {
    const gw = c.gw; const o = c.caster; const pt = c.target ?? { x: o.x + o.facing * 120, z: o.z };
    const near = (e) => Math.hypot(e.x - pt.x, ((e.z ?? pt.z) - pt.z) * DEPTH) < 90;
    const crate = (environment.livingProps?.() ?? []).find(near);
    const wall = (sigSink()?.activeSpells ?? []).find((s) => s.isStoneWall && !s.isDead && near(s));
    const small = [...(sigSink()?.getSummons?.() ?? []), ...(gw?.minions ?? [])].find((m) => m.team !== o.team && !m.isDead && !m.isBoss && !m.isTrainingDummy && near(m));
    const hero = gw?.enemyChampion?.isAlive && near(gw.enemyChampion) ? gw.enemyChampion : null;
    if (hero && !crate && !small) { hit(hero, 4, Math.sign(o.x - hero.x) * 160, 30, .1); emit(new PuppetThread(c.sig, o, hero, 'hero', 1)).snapped = .3; return; } // heroes: a short push only
    if (wall && !crate && !small) {
      // Toppled: the wall piece falls forward onto whoever stands behind it.
      const dir = Math.sign(wall.x - o.x) || 1; wall.takeDamage(wall.maxHp * .45);
      for (const t of foesOf(gw, o.team)) if (Math.abs(t.x - (wall.x + dir * 30)) < 34 && Math.abs(t.z - wall.z) * DEPTH < 40) hit(t, 24 * c.quality.power, dir * 260, 120, .4);
      emit(new PuppetThread(c.sig, o, wall, 'wall', c.quality.power)).snapped = .6; return;
    }
    const obj = crate ?? small;
    if (!obj) { gw?.showAnnouncement?.('KEIN OBJEKT FÜR DIE FÄDEN', .9); return; }
    emit(new PuppetThread(c.sig, o, obj, crate ? 'crate' : 'unit', c.quality.power), c.quality);
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S27 RUNENSCHMIEDE — the next own wall piece or crate in reach becomes a tool.
// ═════════════════════════════════════════════════════════════════════════
function forgeCandidate(p) {
  let best = null; let bd = 150;
  for (const s of sigSink()?.activeSpells ?? []) if (s.isStoneWall && !s.isDead && s.team === p.team) { const d = groundDist(s, p); if (d < bd) { bd = d; best = { obj: s, tool: (s.wallHeight ?? 88) < 70 ? 'shield' : 'lance' }; } }
  for (const prop of environment.livingProps?.() ?? []) { const d = groundDist(prop, p); if (d < bd) { bd = d; best = { obj: prop, tool: 'block' }; } }
  return best;
}
defineSignature('S27', {
  cast(c) { startStance(c.caster, 'S27', c.quality, { tool: null, cand: null }); },
  stance: {
    duration: 8,
    update(p, st) {
      if (st.tool) { if (st.shieldUntil && st.t > st.shieldUntil) st.timer = 0; return; }
      st.cand = forgeCandidate(p);
      if (st.cand && st.t > .5) {
        // Exactly one object is converted (it is used up — a real trade-off).
        const { obj, tool } = st.cand; st.tool = tool; st.timer = Math.max(st.timer, 6);
        if (obj.isStoneWall) { obj.hp = 0; obj.life = 0; } else obj.takeDamage?.(9999, 0, 0, 0, false, 'spell');
        combat.spawnShockwave(obj.x, groundYForDepth(obj.z) - 30, 40, st.sig.mat.vein); debris(obj.x, groundYForDepth(obj.z) - 30, st.sig.mat, 2700, 10);
        window.gameWorld?.showAnnouncement?.(tool === 'lance' ? 'BRUCHLANZE' : tool === 'shield' ? 'SCHMIEDESCHILD' : 'WURFBLOCK', .8);
      }
    },
    end(p, st, reason) { if (!st.tool && reason === 'expired') window.gameWorld?.showAnnouncement?.('KEIN OBJEKT — DIE SCHMIEDE ERLISCHT', .9); },
    onEvent(p, st, type) {
      if (type !== 'heavy' || !st.tool || st.used) return;
      st.used = true; const f = p.facing || 1; const sig = st.sig; const power = st.quality?.power ?? 1;
      if (st.tool === 'lance') emit(new SigSequence(sig, p, { dur: .4, x: p.x, steps: [{ at: .05, fn: (s, gw) => s.strike(gw, (t, dx, dz) => dx * f > 0 && dx * f < 150 && Math.abs(dz) < 22, 45 * power, f * 300, 120, .45) }], draw: (ctx, s) => { const k = s.t / .4; const y = s.y - 42; plate(ctx, [[s.x + f * 10, y - 4], [s.x + f * 160 * Math.min(1, k * 4), y - 1], [s.x + f * 168 * Math.min(1, k * 4), y], [s.x + f * 160 * Math.min(1, k * 4), y + 2], [s.x + f * 10, y + 4]], sig.mat, 2710, { alpha: 1 - k, glowEdge: 1, lit: 1 }); } }));
      else if (st.tool === 'block') emit(new SigBolt({ x: p.x + f * 20, z: p.z, height: 40, vx: f * 520, team: p.team, damage: 40 * power, mat: sig.mat, kind: 'block', size: 10, life: 1.2, kx: 380, lift: 160, stun: .5, seed: 2720 }));
      else { p.arcaneShield = Math.max(p.arcaneShield ?? 0, 70); p.arcaneShieldTimer = Math.max(p.arcaneShieldTimer ?? 0, 4); st.shieldUntil = st.t + 3; return; }
      st.timer = Math.min(st.timer, .2);
    },
    damageTaken(p, st, amount, kx) { return st.shieldUntil && st.t < st.shieldUntil && fromFront(p, kx) ? amount * .3 : amount; },
    render(ctx, p, st, ry, layer) {
      if (layer !== 'front') return;
      const mat = st.sig.mat; const f = p.facing || 1; const hx = p.x + f * 20; const hy = ry - 46;
      if (!st.tool) {
        // The floating forge grip: three rings and irregular metal pieces.
        for (let i = 0; i < 3; i++) { const r = 5 + i * 3; for (let k = 0; k < 6; k++) { const a = st.t * (i % 2 ? -3 : 3) + k * TAU / 6; plate(ctx, [[hx + Math.cos(a) * r, hy + Math.sin(a) * r * .5], [hx + Math.cos(a + .5) * r, hy + Math.sin(a + .5) * r * .5], [hx + Math.cos(a + .25) * (r + 2), hy + Math.sin(a + .25) * (r + 2) * .5]], mat, 2730 + i * 6 + k, { alpha: .9, glowEdge: .8 }); } }
        if (st.cand) thread(ctx, [[hx, hy], [st.cand.obj.x, groundYForDepth(st.cand.obj.z) - 30]], mat.vein, 1, .6);
        return;
      }
      if (st.used && st.tool !== 'shield') return;
      if (st.tool === 'lance') plate(ctx, [[hx - f * 6, hy - 2], [hx + f * 44, hy - 1], [hx + f * 52, hy], [hx + f * 44, hy + 1], [hx - f * 6, hy + 2]], mat, 2740, { alpha: 1, glowEdge: .9, lit: 1 });
      else if (st.tool === 'block') plate(ctx, [[hx - 8, hy - 16], [hx + 8, hy - 15], [hx + 9, hy - 2], [hx - 8, hy - 1]], mat, 2741, { alpha: 1, lit: 1, glowEdge: .6 });
      else plate(ctx, [[hx + f * 4, hy - 26], [hx + f * 12, hy - 20], [hx + f * 12, hy + 18], [hx + f * 4, hy + 24], [hx - f * 2, hy]], mat, 2742, { alpha: st.used ? .8 : 1, lit: 1, glowEdge: 1 });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S28 ECHOFAMULUS — a projection plate copies your last vector once as a stab.
// ═════════════════════════════════════════════════════════════════════════
defineSignature('S28', {
  cast(c) { startStance(c.caster, 'S28', c.quality, { actions: 0, vz: 0, fired: false }); },
  stance: {
    duration: 5,
    onEvent(p, st, type, info) {
      if (st.fired) return;
      if (type === 'hit' && info.hits?.some((h) => !h.target.isProp)) { st.actions++; st.vz = 0; }
      else if (type === 'projectile') { st.actions++; st.vz = info.p?._vz ?? 0; }
      else return;
      if (st.actions >= 2) {
        st.fired = true; const f = p.facing || 1; const pos = platePos(p, st, p.y);
        emit(new SigBolt({ x: pos.x, z: p.z, height: p.y - pos.y, vx: f * 700, vz: st.vz, team: p.team, damage: 10, mat: st.sig.mat, size: 6, life: .7, seed: 2800 }), st.quality);
        st.timer = Math.min(st.timer, .5);
      }
    },
    render(ctx, p, st, ry, layer) {
      if (layer !== 'front') return;
      const mat = st.sig.mat; const pos = platePos(p, st, ry); const burn = st.fired ? 1 - st.timer / .5 : 0;
      // A flat glowing outline plate with a cracked eye mark — not a clone.
      plate(ctx, [[pos.x - 9, pos.y - 6], [pos.x + 9, pos.y - 8], [pos.x + 10, pos.y + 6], [pos.x - 8, pos.y + 7]], mat, 2810, { alpha: (1 - burn) * .85, glowEdge: 1.2 });
      thread(ctx, [[pos.x - 6, pos.y], [pos.x, pos.y - 3], [pos.x + 6, pos.y], [pos.x, pos.y + 3], [pos.x - 6, pos.y]], mat.core, 1, 1 - burn);
      thread(ctx, [[pos.x, pos.y - 3], [pos.x + 1, pos.y + 1], [pos.x - 1, pos.y + 3]], mat.dark, 1, 1 - burn);
      for (let k = 0; k < Math.min(2, st.actions); k++) plate(ctx, [[pos.x - 4 + k * 8, pos.y - 13], [pos.x - 2 + k * 8, pos.y - 16], [pos.x + k * 8, pos.y - 13]], mat, 2820 + k, { alpha: 1 - burn, core: 1 });
      if (burn > 0) sparks(ctx, [[pos.x, pos.y]], mat, st.t, 2830, 6, 1 - burn);
    }
  }
});
// The plate hops between arm and weapon sockets instead of standing beside you.
function platePos(p, st, ry) { const f = p.facing || 1; const k = Math.floor(st.t / .6) % 3; return [{ x: p.x + f * 26, y: ry - 48 }, { x: p.x + f * 14, y: ry - 66 }, { x: p.x - f * 16, y: ry - 54 }][k]; }

// ═════════════════════════════════════════════════════════════════════════
// S29 BRUCHKOLOSS — three arm segments and a huge fist punch horizontally.
// ═════════════════════════════════════════════════════════════════════════
class BreakColossus extends SigProp {
  constructor(sig, owner, x, z, f, power) { super(sig, owner, x, z, { hp: 90, size: 22, duration: 2.3, heavyObject: true }); this.f = f; this.power = power; this.punched = false; this.heightAboveGround = 40; }
  update(dt, gw) {
    this.tick(dt); if (this.isDead || this.punched || this.t < 1.2) return;
    this.punched = true; const f = this.f;
    for (const t of foesOf(gw, this.team)) { const dx = (t.x - this.x) * f; if (dx > -10 && dx < 175 && Math.abs(t.z - this.z) * DEPTH < 28) hit(t, 55 * this.power, f * 420 * massOf(t), 120 * massOf(t), .5); }
    for (const prop of environment.livingProps?.() ?? []) { const dx = (prop.x - this.x) * f; if (dx > -10 && dx < 175 && Math.abs(prop.z - this.z) * DEPTH < 28) prop.takeDamage(60, f * 300, 0, 0, false, 'spell'); }
    combat.shakeCamera(10, .3); combat.spawnShockwave(this.x + f * 120, this.y - 30, 70, this.mat.vein);
  }
  render(ctx) {
    const mat = this.mat; const f = this.f; const y = this.y; const t = this.t; const g = this.hitFlash ? .65 : 1;
    const build = Math.min(1, t / .5); const wind = t < .5 ? 0 : t < 1.2 ? (t - .5) / .7 : 0; const strike = t < 1.2 ? 0 : Math.min(1, (t - 1.2) / .12); const brk = Math.max(0, (t - 1.65) / .6);
    if (brk >= 1) return;
    const sh = [this.x, y - 70 * build + brk * 40];
    plate(ctx, [[sh[0] - 22, sh[1] + 10], [sh[0] - 12, sh[1] - 16], [sh[0] + 16, sh[1] - 14], [sh[0] + 22, sh[1] + 12], [sh[0], sh[1] + 22]], mat, this.seed, { alpha: build * (1 - brk) * g, lit: .9, glowEdge: .5 });
    // Three external arm segments with polished violet energy joints, then the fist.
    const reach = -30 * wind + 150 * strike; const pts = [sh, [sh[0] + f * (20 + reach * .3), sh[1] + 8], [sh[0] + f * (36 + reach * .65), sh[1] + 16], [sh[0] + f * (50 + reach), sh[1] + 20]];
    for (let i = 0; i < 3; i++) { const [ax, ay] = pts[i]; const [bx, by] = pts[i + 1]; plate(ctx, [[ax, ay - 7], [bx, by - 6], [bx, by + 6], [ax, ay + 7]], mat, this.seed + 1 + i, { alpha: build * (1 - brk) * g, lit: .9 }); plate(ctx, [[bx - 4, by], [bx, by - 4], [bx + 4, by], [bx, by + 4]], { ...mat, vein: '#b07aff', edge: '#e0c8ff' }, this.seed + 5 + i, { alpha: build * (1 - brk), core: 1, glowEdge: 1 }); }
    const [fx, fy] = pts[3];
    plate(ctx, [[fx, fy - 18], [fx + f * 26, fy - 16], [fx + f * 30, fy + 14], [fx, fy + 18], [fx - f * 6, fy]], mat, this.seed + 9, { alpha: build * (1 - brk) * g, lit: 1, glowEdge: wind > .5 ? 1.2 : .6 });
    for (let i = 0; i < 3; i++) thread(ctx, [[fx + f * 26, fy - 10 + i * 9], [fx + f * 31, fy - 9 + i * 9]], mat.vein, 1.5, build * (1 - brk));
    if (wind > 0) segRing(ctx, this.x + f * 90, this.z, 20, mat, t * 3, .6 * wind, { segs: 6, thick: 3, seed: this.seed + 20 });
    if (brk > 0 && !this.broke) { this.broke = true; debris(fx, fy, mat, this.seed + 30, 14, 90); }
  }
}
defineSignature('S29', { cast(c) { emit(new BreakColossus(c.sig, c.caster, c.target?.x ?? c.caster.x + c.caster.facing * 60, c.target?.z ?? c.caster.z, c.caster.facing || 1, c.quality.power), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S30 JÄGERGLOCKE — a bell marks enemy summons; your summons hunt them first.
// ═════════════════════════════════════════════════════════════════════════
class HunterBell extends SigProp {
  constructor(sig, owner, x, z) { super(sig, owner, x, z, { hp: 40, size: 12, duration: 8 }); this.marked = new Set(); }
  update(dt, gw) {
    this.tick(dt);
    const summons = sigSink()?.getSummons?.() ?? [];
    if (this.t < .9) for (const s of summons) if (s.team !== this.team && !s.isDead && groundDist(s, this) < 80 + this.t * 200) this.marked.add(s);
    for (const s of [...this.marked]) if (s.isDead) this.marked.delete(s);
    // Own beasts and golems prioritise the marked summons.
    const alive = [...this.marked];
    for (const s of summons) if (s.team === this.team) s.priorityTarget = !this.isDead && alive.length ? alive.sort((a, b) => groundDist(a, s) - groundDist(b, s))[0] : null;
    if (this.t > 1 && !alive.length) this.duration = Math.min(this.duration, this.t + .4);
  }
  onExpire() { for (const s of sigSink()?.getSummons?.() ?? []) if (s.team === this.team) s.priorityTarget = null; }
  onShatter() { this.onExpire(); }
  render(ctx) {
    const mat = this.mat; const y = this.y; const t = this.t; const sinkK = this.duration - this.t < .4 ? (this.duration - this.t) / .4 : 1;
    for (let w = 0; w < 3; w++) { const k = (t - w * .3); if (k < 0 || k > .9) continue; segRing(ctx, this.x, this.z, 20 + k * 260, mat, t, (1 - k / .9) * .7, { segs: 14, thick: 3, gap: .4, seed: 3000 + w }); }
    // Bell core with three bronze sound tongues and a fine cracked sound film.
    plate(ctx, [[this.x - 7, y - 4 - 18 * sinkK], [this.x + 7, y - 4 - 18 * sinkK], [this.x + 10, y], [this.x - 10, y]], mat, this.seed, { alpha: this.fade, lit: .9, glowEdge: .7 });
    for (let i = -1; i <= 1; i++) { const sw = Math.sin(t * 8 + i) * 2; slab(ctx, this.x + i * 6 + sw, y + 4, 2.5, 8, mat, this.seed + 2 + i, this.fade); }
    for (const s of this.marked) { const top = s.y - (s.renderHeight ?? 60) - 12; plate(ctx, [[s.x - 5, top], [s.x + 5, top], [s.x + 7, top + 8], [s.x - 7, top + 8]], mat, 3010, { alpha: .9, core: .8, glowEdge: 1 }); }
  }
}
defineSignature('S30', { cast(c) { emit(new HunterBell(c.sig, c.caster, c.target?.x ?? c.caster.x + c.caster.facing * 160, c.target?.z ?? c.caster.z)); } });

// ═════════════════════════════════════════════════════════════════════════
// S31 RUNENGERICHT — four tablets frame a team-neutral projectile rule.
// ═════════════════════════════════════════════════════════════════════════
class RuleTablet extends SigProp { constructor(sig, owner, x, z, i) { super(sig, owner, x, z, { hp: 30, size: 10, duration: 8.2 + i * .15 }); this.i = i; } update(dt) { this.tick(dt); }
  render(ctx) { const y = this.y; const rise = Math.min(1, this.t / .3); const lean = Math.max(0, 1 - this.t / .4) * 6; slab(ctx, this.x + lean, y, 14, 22 * rise, this.mat, this.seed, this.fade * (this.hitFlash ? .6 : 1), lean); for (let k = 0; k < 3; k++) thread(ctx, [[this.x - 4 + (k % 2) * 3, y - 18 * rise + k * 5], [this.x + 3 - k, y - 16 * rise + k * 5]], this.mat.dark, 1, .8 * this.fade); } }
class RuneCourt {
  constructor(sig, owner, x, z) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.x = x; this.z = z; this.t = 0; this.isFinished = false; this.R = 110; this.uses = {}; this.seen = new WeakSet();
    this.tablets = [0, 1, 2, 3].map((i) => { const a = Math.PI / 4 + i * Math.PI / 2; return emit(new RuleTablet(sig, owner, x + Math.cos(a) * this.R, z + Math.sin(a) * this.R / DEPTH, i)); }); }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt; if (this.t > 8.8 || this.tablets.every((p) => p.isDead)) { this.isFinished = true; return; }
    if (this.t < .4) return;
    for (const p of projectilesOf(gw)) {
      if (this.seen.has(p) || groundDist(p, this) > this.R) continue;
      this.seen.add(p); const n = this.uses[p.team] ?? 0; if (n >= 2) continue;
      // The rule: the first projectiles of each team are slowed and turned aside.
      this.uses[p.team] = n + 1; const [vx] = projVel(p); projSetVel(p, vx * .3, (p.z >= this.z ? 1 : -1) * Math.abs(vx) * .5 / DEPTH); p.life += .4;
      combat.spawnShockwave(p.x, yOf(p.z, projHeight(p)), 22, this.mat.vein);
    }
  }
  render(ctx) {
    const k = Math.min(1, this.t * 2) * Math.max(0, Math.min(1, (8.8 - this.t) / .6)); const mat = this.mat;
    // Four short light strips announce the rule; a deep blue light seam joins the tablets.
    const pts = this.tablets.map((p) => [p.x, groundYForDepth(p.z)]);
    for (let i = 0; i < 4; i++) { const [ax, ay] = pts[i]; const [bx, by] = pts[(i + 1) % 4]; thread(ctx, [[ax, ay], [bx, by]], mat.vein, 1.5, .55 * k); const mx = (ax + bx) / 2; const my = (ay + by) / 2; plate(ctx, [[mx - 8, my - 1], [mx + 8, my - 1], [mx + 8, my + 1], [mx - 8, my + 1]], mat, 3100 + i, { alpha: k, core: 1 }); }
    const used = (this.uses.blue ?? 0) + (this.uses.red ?? 0); for (let u = 0; u < 4 - used; u++) plate(ctx, [[this.x - 8 + u * 5, this.y - 6], [this.x - 6 + u * 5, this.y - 9], [this.x - 4 + u * 5, this.y - 6]], mat, 3110 + u, { alpha: .8 * k, core: 1 });
  }
}
defineSignature('S31', { cast(c) { emit(new RuneCourt(c.sig, c.caster, c.target?.x ?? c.caster.x + c.caster.facing * 170, c.target?.z ?? c.caster.z)); } });

// ═════════════════════════════════════════════════════════════════════════
// S32 EXILKORRIDOR — enemies entering the corridor lose their dodge speed briefly.
// ═════════════════════════════════════════════════════════════════════════
class ExileCorridor {
  constructor(sig, owner, line) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.a = line.a; this.b = line.b; this.t = 0; this.isFinished = false; this.inside = new Set(); this.x = (this.a.x + this.b.x) / 2; this.z = (this.a.z + this.b.z) / 2; }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt; if (this.t > 6.3) { this.isFinished = true; return; }
    for (const t of foesOf(gw, this.team)) {
      const info = segInfo(this.a, this.b, t.x, t.z); const now = info.dist < 18 && info.u > 0 && info.u < 1;
      // Guarding or jumping frees them.
      if (now && !this.inside.has(t) && !t.isGuarding && (t.elevation ?? 0) < 10) { t.slow?.(.8, .45); t._exiled = .8; combat.spawnHitSparks(t.x, t.y - 20, 1, '#ff4a4a', 4); }
      if (now) this.inside.add(t); else this.inside.delete(t);
    }
  }
  render(ctx) {
    const mat = this.mat; const k = Math.min(1, this.t * 3) * Math.max(0, Math.min(1, (6.3 - this.t) / .3)); const open = this.t > 6 ? (this.t - 6) / .3 : 0;
    const base = linePts(this.a, this.b, 10); const top = linePts(this.a, this.b, 10, 46);
    // Two vertical, translucent effect planes like a spatial tear.
    for (let i = Math.floor(open * 5); i < 10 - Math.floor(open * 5); i++) plate(ctx, [base[i], base[i + 1], top[i + 1], top[i]], { ...mat, kind: 'crystal' }, 3200 + i, { alpha: .18 * k, glowEdge: .5 });
    thread(ctx, top, mat.edge, 1, .6 * k);
    for (let i = 0; i < 6; i++) { const u = ((this.t * (i % 2 ? .5 : -.5) + i / 6) % 1 + 1) % 1; const j = Math.floor(u * 10); const [x, y] = base[j]; plate(ctx, [[x - 4, y - 2], [x + 4, y - 2], [x + 4, y], [x - 4, y]], { ...mat, vein: '#ff4a4a', edge: '#ff9a9a' }, 3220 + i, { alpha: k, core: .6 }); }
  }
}
defineSignature('S32', { cast(c) { emit(new ExileCorridor(c.sig, c.caster, lineOf(c.target, c.caster, 240, 100))); } });

// ═════════════════════════════════════════════════════════════════════════
// S33 ERNTEZIRKEL — own hits charge three seeds, then three lances burst.
// ═════════════════════════════════════════════════════════════════════════
class HarvestCircle {
  constructor(sig, owner, power) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.x = owner.x; this.z = owner.z; this.t = 0; this.isFinished = false; this.R = 110; this.seeds = 0; this.power = power; this.released = null; }
  get y() { return groundYForDepth(this.z); }
  onSigEvent(type, info) {
    if (type !== 'hit' || this.released != null) return;
    if (!info.hits?.some((h) => !h.target.isProp && groundDist(h.target, this) < this.R + 20)) return;
    this.seeds = Math.min(3, this.seeds + 1);
  }
  release(gw) {
    this.released = this.t;
    const foes = foesOf(gw, this.team).filter((t) => groundDist(t, this) < this.R + 60);
    this.lances = [0, 1, 2].map((i) => { const tgt = foes[i]; const a = tgt ? Math.atan2((tgt.z - this.z) * DEPTH, tgt.x - this.x) : i * TAU / 3; return { a, x: this.x + Math.cos(a) * this.R, z: this.z + Math.sin(a) * this.R / DEPTH }; });
    for (const l of this.lances) for (const t of foesOf(gw, this.team)) if (Math.hypot(t.x - l.x, (t.z - l.z) * DEPTH) < 44) hit(t, 28 * this.power * (this.seeds / 3 + .34), Math.cos(l.a) * 320 * massOf(t), 160 * massOf(t), .4);
    combat.shakeCamera(6, .2);
  }
  update(dt, gw) {
    this.t += dt;
    if (this.released == null && (this.seeds >= 3 || this.t > 8)) this.release(gw);
    if (this.released != null && this.t - this.released > .7) this.isFinished = true;
  }
  render(ctx) {
    const mat = this.mat; const t = this.t; const k = this.released != null ? 1 - (t - this.released) / .7 : Math.min(1, t * 3);
    segRing(ctx, this.x, this.z, this.R, mat, t, .6 * k, { segs: 9, thick: 4, gap: .55, spin: .2, seed: 3300 });
    // Moss-gold screw lines toward the centre.
    for (let i = 0; i < 3; i++) { const pts = []; for (let s = 0; s <= 8; s++) { const u = s / 8; pts.push(groundPt(this.x, this.z, this.R * (1 - u * .8), i * TAU / 3 + u * 2 + t * .3)); } thread(ctx, pts, mat.vein, 1.5, .7 * k); }
    for (let i = 0; i < 3; i++) { const [x, y] = groundPt(this.x, this.z, this.R * .45, i * TAU / 3 + .5); plate(ctx, [[x - 4, y], [x, y - 6], [x + 4, y], [x, y + 3]], { ...mat, body: '#0c0c08', facet: '#1c1c14' }, 3310 + i, { alpha: k, core: i < this.seeds ? 1 : 0, glowEdge: i < this.seeds ? 1.3 : .4 }); }
    if (this.released != null) for (const l of this.lances) { const y = groundYForDepth(l.z); const g = Math.min(1, (t - this.released) / .1); crystal(ctx, l.x, y, 10, 54 * g, mat, 3320 + Math.round(l.x), k, Math.cos(l.a) * 10); sparks(ctx, [[l.x, y - 40 * g]], { ...mat, spark: '#a8ff7a' }, t, 3330, 5, k); }
  }
}
defineSignature('S33', { cast(c) { c.listen(emit(new HarvestCircle(c.sig, c.caster, c.quality.power))); } });

// ═════════════════════════════════════════════════════════════════════════
// S34 SCHERBENHANDEL — your next projectile: let it fly, or GUARD to melt it into a shield.
// ═════════════════════════════════════════════════════════════════════════
defineSignature('S34', {
  cast(c) { startStance(c.caster, 'S34', c.quality, { hold: null, decided: false, shieldUntil: 0 }); },
  stance: {
    duration: 8,
    onEvent(p, st, type, info) {
      if (type !== 'projectile' || st.decided || st.hold || !info.p?.isCapturableProjectile) return;
      // The decision happens before the flight starts.
      const q = info.p; st.hold = { p: q, vx: q.vx, vz: q._vz ?? 0, t: 0 }; q.held = true; q.vx = 0; q._vz = 0; q.life += .5;
    },
    update(p, st, dt, gw) {
      const f = p.facing || 1;
      if (st.hold) {
        const h = st.hold; h.t += dt; const q = h.p; q.x = p.x + f * 26; q.z = p.z;
        if (p.isGuarding && h.t > .05) {
          // Melted into a short directional shard shield.
          q.isFinished = true; q.life = 0; st.hold = null; st.decided = true; st.shieldUntil = st.t + 3; st.timer = Math.max(3.1, Math.min(st.timer, 3.2));
          combat.spawnShockwave(p.x + f * 24, p.y - 40, 34, st.sig.mat.vein);
        } else if (h.t > .45 || q.isFinished) { q.held = false; q.vx = h.vx; q._vz = h.vz; st.hold = null; st.decided = true; st.timer = Math.min(st.timer, .4); }
      }
      if (st.t < st.shieldUntil) for (const q of projectilesOf(gw)) { if (q.team === p.team) continue; const dx = (q.x - p.x) * f; if (dx > 4 && dx < 38 && Math.abs(q.z - p.z) * DEPTH < 28) { projKill(q); combat.spawnHitSparks(q.x, yOf(q.z, projHeight(q)), -f, st.sig.mat.edge, 6); } }
    },
    damageTaken(p, st, amount, kx) { return st.t < st.shieldUntil && fromFront(p, kx) ? amount * .2 : amount; },
    render(ctx, p, st, ry, layer) {
      if (layer !== 'front') return;
      const mat = st.sig.mat; const f = p.facing || 1; const x = p.x + f * 16; const y = ry - 76; const tilt = st.decided ? (st.shieldUntil > st.t ? -.5 : .5) : Math.sin(st.t * 2) * .12;
      if (!st.decided || st.t < .2) {
        // Matte gold scale pans on a slowly turning brass beam, blue core fire.
        const c = Math.cos(tilt); const s = Math.sin(tilt);
        thread(ctx, [[x - 14 * c, y - 14 * s], [x + 14 * c, y + 14 * s]], mat.body, 2, 1);
        for (const sg of [-1, 1]) { const px = x + sg * 14 * c; const py = y + sg * 14 * s + 8; plate(ctx, [[px - 7, py], [px + 7, py], [px + 4, py + 4], [px - 4, py + 4]], mat, 3400 + sg, { alpha: 1, lit: .9, glowEdge: .6 }); thread(ctx, [[px, py], [px, y + sg * 14 * s]], mat.body, 1, .8); }
        plate(ctx, [[x + 14 * c - 1, y + 14 * s - 8], [x + 14 * c + 1, y + 14 * s - 8], [x + 14 * c, y + 14 * s + 4]], mat, 3410, { alpha: 1, core: 1, glowEdge: 1.4 });
        plate(ctx, [[x - 2, y - 4], [x + 2, y - 4], [x, y + 2]], { ...mat, vein: '#4aa0ff' }, 3411, { alpha: 1, core: 1 });
      }
      if (st.t < st.shieldUntil) for (let i = 0; i < 5; i++) plate(ctx, [[p.x + f * (24 + (i % 2) * 3), ry - 12 - i * 11], [p.x + f * (30 + (i % 2) * 3), ry - 16 - i * 11], [p.x + f * (31 + (i % 2) * 3), ry - 6 - i * 11], [p.x + f * (25 + (i % 2) * 3), ry - 3 - i * 11]], mat, 3420 + i, { alpha: Math.min(1, (st.shieldUntil - st.t) * 2), glowEdge: 1, lit: .9 });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S35 RESONANZKORRIDOR — hitting a plate sends a sound pulse down the chain.
// ═════════════════════════════════════════════════════════════════════════
class ResonancePlate extends SigProp {
  constructor(sig, owner, x, z, i, chain) { super(sig, owner, x, z, { hp: 40, size: 10, duration: 10, hittableByAll: true }); this.i = i; this.chain = chain; this.ring = 0; }
  onFriendlyHit() { this.chain.pulse(this.i); }
  update(dt) { this.tick(dt); this.ring = Math.max(0, this.ring - dt * 3); }
  render(ctx) {
    const mat = this.mat; const y = this.y; const g = this.fade * (this.hitFlash ? .6 : 1); const torn = this.chain.relays >= 3;
    // Ivory-silver membrane, red resonance veins, a broken half-open sound shell.
    plate(ctx, [[this.x - 5, y], [this.x - 6, y - 48], [this.x + 1, y - 54], [this.x + 6, y - 46], [this.x + 5, y]], { ...mat, kind: 'crystal' }, this.seed, { alpha: g * (torn ? .4 : .85), glowEdge: .6 + this.ring });
    for (let k = 0; k < 3; k++) thread(ctx, [[this.x - 3 + k * 3, y - 6], [this.x - 2 + k * 2, y - 26], [this.x - 3 + k * 3, y - 44]], mat.vein, 1, g * (.5 + this.ring));
    plate(ctx, [[this.x + 6, y - 40], [this.x + 14, y - 34], [this.x + 12, y - 22], [this.x + 6, y - 26]], mat, this.seed + 1, { alpha: g, lit: .9 });
  }
}
class ResonanceCorridor {
  constructor(sig, owner, line, power) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.t = 0; this.isFinished = false; this.relays = 0; this.power = power; this.waves = []; this.a = line.a; this.b = line.b;
    this.plates = [0, .5, 1].map((u, i) => emit(new ResonancePlate(sig, owner, line.a.x + (line.b.x - line.a.x) * u, line.a.z + (line.b.z - line.a.z) * u, i, this)));
    this.x = (line.a.x + line.b.x) / 2; this.z = (line.a.z + line.b.z) / 2; this.waves.push({ from: 0, to: 2, t: 0, harmless: true }); }
  get y() { return groundYForDepth(this.z); }
  pulse(i) {
    if (this.relays >= 3) return;
    const dir = i < 2 && !this.plates[i + 1].isDead ? 1 : -1; const j = i + dir; if (!this.plates[j] || this.plates[j].isDead) return;
    this.relays++; this.waves.push({ from: i, to: j, t: 0 }); this.plates[i].ring = 1;
  }
  update(dt, gw) {
    this.t += dt; if (this.t > 10 || this.plates.every((p) => p.isDead)) { this.isFinished = true; return; }
    // Own projectiles touching a plate also make it answer.
    for (const p of projectilesOf(gw)) { if (p.team !== this.team || p._resonated) continue; const plate = this.plates.find((q) => !q.isDead && groundDist(q, p) < 18); if (plate) { p._resonated = true; this.pulse(plate.i); } }
    for (const w of this.waves) {
      w.t += dt; if (w.done || w.t < .18) continue; w.done = true; if (w.harmless) continue;
      const A = this.plates[w.from]; const B = this.plates[w.to]; this.plates[w.to].ring = 1;
      for (const t of foesOf(gw, this.team)) { const info = segInfo(A, B, t.x, t.z); if (info.dist < 20 && info.u > 0 && info.u < 1) hit(t, 22 * this.power, Math.sign(B.x - A.x || 1) * 180, 60, .3); }
      // The receiving plate passes it on down the chain while relays remain.
      if (this.relays < 3) this.pulse(w.to);
    }
    if (this.relays >= 3 && !this.torn) { this.torn = true; for (const p of this.plates) p.duration = Math.min(p.duration, p.t + .8); }
    this.waves = this.waves.filter((w) => w.t < .5);
  }
  render(ctx) {
    for (const w of this.waves) {
      const A = this.plates[w.from]; const B = this.plates[w.to]; const k = Math.min(1, w.t / .18); const fade = w.t > .18 ? 1 - (w.t - .18) / .32 : 1;
      const x = A.x + (B.x - A.x) * k; const y = groundYForDepth(A.z + (B.z - A.z) * k) - 28;
      for (let r = 0; r < 3; r++) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = r ? this.mat.edge : this.mat.vein; ctx.lineWidth = 1.5; ctx.globalAlpha = fade * (w.harmless ? .4 : .9) * (1 - r * .25); ctx.beginPath(); ctx.ellipse(snap(x), snap(y), 4 + r * 5, 8 + r * 7, 0, -1.2, 1.2); ctx.stroke(); ctx.restore(); }
    }
  }
}
defineSignature('S35', { cast(c) { emit(new ResonanceCorridor(c.sig, c.caster, lineOf(c.target, c.caster, 260, 140), c.quality.power)); } });

// ═════════════════════════════════════════════════════════════════════════
// S36 WELTNAHT — a curved rift line: each side acts once on whoever crosses.
// ═════════════════════════════════════════════════════════════════════════
let seamOf = new Map();
class WorldSeam {
  constructor(sig, owner, line, power) {
    this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.t = 0; this.isFinished = false; this.power = power; this.done = new Map(); this.sides = new Map(); this.tipped = new Set();
    const { a, b } = line; const n = segInfo(a, b, a.x, a.z); const mid = { x: (a.x + b.x) / 2 + n.nx * 30, z: (a.z + b.z) / 2 + n.nz * 30 / DEPTH };
    this.pts = Array.from({ length: 13 }, (_, i) => { const u = i / 12; const q = (1 - u) * (1 - u); const r = 2 * (1 - u) * u; const s = u * u; return { x: q * a.x + r * mid.x + s * b.x, z: q * a.z + r * mid.z + s * b.z }; });
    this.a = a; this.b = b; this.x = mid.x; this.z = mid.z;
    const prev = seamOf.get(owner); if (prev && !prev.isFinished) prev.t = Math.max(prev.t, 6.4); seamOf.set(owner, this);
  }
  get y() { return groundYForDepth(this.z); }
  near(x, z) { let best = { dist: 1e9 }; for (let i = 0; i < 12; i++) { const info = segInfo(this.pts[i], this.pts[i + 1], x, z); if (info.dist < best.dist) best = { ...info, i }; } return best; }
  update(dt, gw) {
    this.t += dt; if (this.t > 7) { this.isFinished = true; return; }
    const wave = Math.min(1, this.t / .6);
    for (const t of foesOf(gw, this.team)) {
      const info = this.near(t.x, t.z); const prev = this.sides.get(t); this.sides.set(t, info.side);
      if (!prev || prev === info.side || info.dist > 28 || info.i / 12 > wave) continue;
      // Each edge acts once per fighter: shoved on through.
      const key = prev; const set = this.done.get(t) ?? new Set(); if (set.has(key)) continue; set.add(key); this.done.set(t, set);
      hit(t, 8 * this.power, -prev * info.nx * 260 * massOf(t), 60, .2); t.z = Math.max(.05, Math.min(.95, t.z - prev * info.nz * 30 / DEPTH));
    }
    for (const p of projectilesOf(gw)) {
      if (p._seamWarp) continue; const info = this.near(p.x, p.z); if (info.dist > 14 || info.i / 12 > wave) continue;
      p._seamWarp = true; const [vx, vz] = projVel(p); projSetVel(p, vx, vz + (info.side || 1) * .7);
    }
    if (this.t < .7) for (const prop of environment.livingProps?.() ?? []) { if (this.tipped.has(prop)) continue; const info = this.near(prop.x, prop.z); if (info.dist < 26 && info.i / 12 <= wave) { this.tipped.add(prop); prop.takeDamage(20, info.nx * 100, 0, 0, false, 'spell'); } }
  }
  render(ctx) {
    const mat = this.mat; const wave = Math.min(1, this.t / .6); const heal = this.t > 6 ? (this.t - 6) : 0; const n = this.pts.length - 1;
    const sp = this.pts.map((p) => [p.x, groundYForDepth(p.z)]);
    for (let i = 0; i < n; i++) {
      const u = i / n; if (u > wave) break; const fromEnd = Math.min(u, 1 - u); if (fromEnd < heal * .5) continue;
      const [x0, y0] = sp[i]; const [x1, y1] = sp[i + 1];
      // Black volcanic glass with an emerald core light and a doubled jagged outer seam.
      plate(ctx, [[x0, y0 - 3], [x1, y1 - 3], [x1, y1 + 3], [x0, y0 + 3]], mat, 3600 + i, { alpha: .95, glowEdge: .9, core: .3 });
      thread(ctx, [[x0, y0 - 5 - (i % 2) * 2], [x1, y1 - 5 - ((i + 1) % 2) * 2]], mat.vein, 1, .7);
      thread(ctx, [[x0, y0 + 5 + (i % 2) * 2], [x1, y1 + 5 + ((i + 1) % 2) * 2]], mat.vein, 1, .7);
      // Dark fragments wander in opposite directions along the two edges.
      const ph = (this.t * .8 + i * .3) % 1; shard(ctx, x0 + (x1 - x0) * ph, y0 - 8, 2.5, i + this.t, mat, 3620 + i, .8); shard(ctx, x1 + (x0 - x1) * ph, y1 + 8, 2.5, i - this.t, mat, 3640 + i, .8);
    }
    if (wave < 1) { const i = Math.floor(wave * n); const [x, y] = sp[i]; slab(ctx, x, y + 2, 12, 22 * (1 - wave * .5), mat, 3660, .9); }
    if (heal > 0) for (let i = 0; i < n; i += 2) { const [x, y] = sp[i]; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, 1 - heal) * .7; ctx.fillStyle = mat.vein; ctx.fillRect(snap(x), snap(y) - 1, 3, 1); ctx.restore(); }
  }
}
defineSignature('S36', { cast(c) { emit(new WorldSeam(c.sig, c.caster, lineOf(c.target, c.caster, 240, 120), c.quality.power)); } });

export const SIGNATURES_C = ['S25', 'S26', 'S27', 'S28', 'S29', 'S30', 'S31', 'S32', 'S33', 'S34', 'S35', 'S36'];
