// GRIMGE Prototype — signature specials C + D of the atlas:
// terrain, objects & spatial building (S13–S18), projectiles, beams &
// counter-magic (S19–S24). World objects are breakable SigProps; the
// metamagic runes act on the shared projectile pipeline.
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
import {
  defineSignature, SigBolt, SigProp, SigSequence, startStance, emit, debris, sigSink,
  foesOf, aliveFoe, groundDist, yOf, massOf, hit, projectilesOf, projKill, projSetVel, projVel, projHeight, projDamage, reflectVel,
  segRing, hexMark, groundPt, crystal, slab, thread, ribbon, sparks, plate, shard, segInfo, lineOf, TAU, DEPTH, snap
} from './signature_core.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';

const linePts = (a, b, n, lift = 0, bulge = 0) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [a.x + (b.x - a.x) * u, groundYForDepth(a.z + (b.z - a.z) * u) - lift - Math.sin(u * Math.PI) * bulge]; });
const boost = (e, k = 1.2) => { e._sigBoost = { k, t: .15 }; };
const perOwner = new Map(); // "one per player" bookkeeping: key → fx
function onePerOwner(key, owner, fx) { const prev = perOwner.get(key + owner.team); if (prev && !prev.isFinished) prev.retire?.(); perOwner.set(key + owner.team, fx); return fx; }

// ═════════════════════════════════════════════════════════════════════════
// S13 SPLITTERGARTEN — three crystal blossoms that spray splinters when hit.
// ═════════════════════════════════════════════════════════════════════════
const gardens = new Map();
class Blossom extends SigProp {
  constructor(sig, owner, x, z, h, power) { super(sig, owner, x, z, { hp: 50, size: 14, duration: 10, hittableByAll: true }); this.h = h; this.power = power; this.cool = 0; this.grow = 0; }
  update(dt) { this.tick(dt); this.cool = Math.max(0, this.cool - dt); this.grow = Math.min(1, this.grow + dt * 3); }
  spray(dir, k = 1) {
    if (this.cool > 0 || this.isDead) return; this.cool = .25;
    for (let i = -1; i <= 1; i++) emit(new SigBolt({ x: this.x + dir * 10, z: this.z, height: this.h * .6, vx: dir * 640, vz: i * .35, team: this.team, damage: 12 * this.power * k, mat: this.mat, kind: 'crystal', size: 4, life: .6, skipProps: true, seed: this.seed + i }));
    combat.spawnHitSparks(this.x, this.y - this.h * .6, dir, this.mat.edge, 8);
  }
  onFriendlyHit(by, kx) { this.spray(Math.sign(kx) || by.facing || 1); this.hp -= 8; this.hitFlash = .12; if (this.hp <= 0) this.shatter(); }
  onHostileHit(amount, kx) { this.spray(Math.sign(kx) || 1, .5); }
  retire() { this.shatter(); }
  render(ctx) {
    const mat = this.mat; const y = this.y; const g = this.grow * this.fade; const h = this.h * this.grow;
    if (spellSheetReady('blossom')) { const frame = this.grow < 1 ? Math.min(3, Math.floor(this.grow * 4)) : 4 + Math.floor(this.t * 4) % 2; drawSpellSprite(ctx, 'blossom', frame, this.x, y + 2, { scale: this.h / 62, alpha: this.fade * (this.hitFlash ? .5 : 1) }); return; }
    // Dark ribbed crystal leaves, nested transparent plates, jade core.
    for (const sg of [-1, 1]) plate(ctx, [[this.x, y], [this.x + sg * 16, y - h * .25], [this.x + sg * 10, y - h * .5]], mat, this.seed + sg, { alpha: g, lit: .6 });
    for (let i = 0; i < 3; i++) crystal(ctx, this.x + (i - 1) * 6, y, 8 - Math.abs(i - 1) * 2, h * (1 - Math.abs(i - 1) * .25), mat, this.seed + 5 + i, g * (this.hitFlash ? .6 : .9), (i - 1) * 4);
    plate(ctx, [[this.x - 4, y - h * .62], [this.x, y - h * .74], [this.x + 4, y - h * .62], [this.x, y - h * .5]], mat, this.seed + 9, { alpha: g, core: 1, glowEdge: 1.2 });
  }
}
class Garden {
  constructor(sig, owner, x, z, power) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.x = x; this.z = z; this.t = 0; this.isFinished = false; this.power = power; this.sprouted = 0; this.cores = Array.from({ length: 7 }, (_, i) => ({ a: i * 2.39, r: 18 + (i % 3) * 22 })); }
  get y() { return groundYForDepth(this.z); }
  update(dt) {
    this.t += dt;
    const heights = [34, 50, 64];
    while (this.sprouted < 3 && this.t > .3 + this.sprouted * .15) {
      const c = this.cores[this.sprouted * 2 + 1]; const b = new Blossom(this.sig, this.owner, this.x + Math.cos(c.a) * c.r, Math.max(.05, Math.min(.95, this.z + Math.sin(c.a) * c.r / DEPTH)), heights[this.sprouted], this.power);
      emit(b); this.sprouted++;
      // At most three blossoms per player: the oldest withers.
      const list = gardens.get(this.owner) ?? []; list.push(b); while (list.filter((x) => !x.isDead && !x.isFinished).length > 3) { const old = list.shift(); if (!old.isDead) old.retire(); } gardens.set(this.owner, list.filter((x) => !x.isFinished));
    }
    if (this.t > 1) this.isFinished = true;
  }
  render(ctx) { for (let i = 0; i < 7; i++) { const k = Math.min(1, Math.max(0, (this.t - i * .08) / .2)) * (1 - Math.max(0, this.t - .6) * 2.5); if (k <= 0) continue; const c = this.cores[i]; const [x, y] = groundPt(this.x, this.z, c.r, c.a); thread(ctx, [[x - 6 * k, y], [x - 1, y - 2], [x + 6 * k, y + 1]], this.mat.vein, 2, k); } }
}
defineSignature('S13', { cast(c) { emit(new Garden(c.sig, c.caster, c.target?.x ?? c.caster.x + c.caster.facing * 140, c.target?.z ?? c.caster.z, c.quality.power), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S14 SEISMISCHER STEG — a breakable basalt walkway: allies fast, foes stumble.
// ═════════════════════════════════════════════════════════════════════════
class StegPlate extends SigProp {
  constructor(sig, owner, x, z, i) { super(sig, owner, x, z, { hp: 60, size: 16, duration: 9 }); this.i = i; this.rise = 0; }
  takeDamage(amount, kx, lift, stun, crit, kind) { if (amount < 25 && kind !== 'beam') { combat.spawnHitSparks(this.x, this.y - 6, Math.sign(kx) || 1, this.mat.edge, 3); return {}; } return super.takeDamage(amount, kx, lift, stun, crit, kind); }
  update(dt) { this.tick(dt); this.rise = Math.min(1, Math.max(0, (this.t - this.i * .1) / .25)); }
  render(ctx) {
    const sink = Math.max(0, (this.t - (this.duration - .5 + this.i * .08)) / .4); const r = this.rise * (1 - sink); if (r <= 0) return;
    const y = this.y; const mat = this.mat;
    plate(ctx, [[this.x - 18, y - 2 - 7 * r], [this.x + 17, y - 3 - 7 * r], [this.x + 19, y + 3], [this.x - 18, y + 4]], mat, this.seed, { alpha: this.hitFlash ? .7 : 1, lit: .9, glowEdge: .5 });
    thread(ctx, [[this.x - 10, y - 4 * r], [this.x - 2, y - 7 * r], [this.x + 6, y - 3 * r]], mat.vein, 1.5, .9);
    plate(ctx, [[this.x + 12, y - 9 * r], [this.x + 17, y - 9 * r], [this.x + 18, y - 4 * r], [this.x + 13, y - 4 * r]], mat, this.seed + 1, { alpha: 1, glowEdge: .3, lit: 1 });
  }
}
class SeismicSteg {
  constructor(sig, owner, line) {
    this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.a = line.a; this.b = line.b; this.t = 0; this.isFinished = false; this.stumbled = new Set();
    this.plates = [0, 1, 2, 3].map((i) => { const u = (i + .5) / 4; return emit(new StegPlate(sig, owner, this.a.x + (this.b.x - this.a.x) * u, this.a.z + (this.b.z - this.a.z) * u, i)); });
    this.x = (this.a.x + this.b.x) / 2; this.z = (this.a.z + this.b.z) / 2;
  }
  get y() { return groundYForDepth(this.z); }
  onSteg(e) { const info = segInfo(this.a, this.b, e.x, e.z); if (info.dist > 20 || info.u < 0 || info.u > 1) return false; const p = this.plates[Math.min(3, Math.floor(info.u * 4))]; return p && !p.isDead; }
  update(dt, gw) {
    this.t += dt; if (this.t > 9.4) { this.isFinished = true; return; }
    if (gw.player?.team === this.team && this.onSteg(gw.player)) boost(gw.player, 1.2);
    for (const m of gw.minions ?? []) if (m.team === this.team && !m.isDead && this.onSteg(m)) m.slow?.(.15, 1.2);
    // Enemies stumble the first time they cross.
    for (const t of foesOf(gw, this.team)) if (!this.stumbled.has(t) && this.onSteg(t)) { this.stumbled.add(t); hit(t, 4, 0, 40, .35); t.slow?.(.6, .45); combat.spawnHitSparks(t.x, t.y - 10, 1, this.mat.vein, 6); }
  }
  render(ctx) { const pts = linePts(this.a, this.b, 16); thread(ctx, pts.map(([x, y], i) => [x, y + (i % 2 ? 2 : -1)]), this.mat.vein, 1.5, .6 * Math.min(1, this.t * 3) * Math.max(0, Math.min(1, 9.4 - this.t))); }
}
defineSignature('S14', { cast(c) { emit(new SeismicSteg(c.sig, c.caster, lineOf(c.target, c.caster, 240, 120)), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S15 FLUTSCHIENE — a water channel that carries projectiles and light minions.
// ═════════════════════════════════════════════════════════════════════════
class FloodRail {
  constructor(sig, owner, line) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.a = line.a; this.b = line.b; this.t = 0; this.life = 7; this.isFinished = false; this.x = (this.a.x + this.b.x) / 2; this.z = (this.a.z + this.b.z) / 2; }
  get y() { return groundYForDepth(this.z); }
  retire() { this.life = Math.min(this.life, this.t + .4); }
  inside(e, w = 22) { const info = segInfo(this.a, this.b, e.x, e.z); return info.dist < w && info.u > 0 && info.u < 1 ? info : null; }
  update(dt, gw) {
    this.t += dt; if (this.t > this.life) { this.isFinished = true; return; }
    const roll = Math.min(1, this.t / .5);
    for (const p of projectilesOf(gw)) { if (projHeight(p) > 50) continue; const info = this.inside(p); if (!info || info.u > roll) continue; const [vx, vz] = projVel(p); projSetVel(p, vx + info.tx * 260 * dt, vz + info.tz * 260 * dt / DEPTH); }
    // Light, unfixed minions drift downstream (never bosses, heroes or castles).
    for (const m of gw.minions ?? []) { if (m.isDead || m.isBoss || m.isTrainingDummy) continue; const info = this.inside(m); if (!info || info.u > roll) continue; m.x += info.tx * 70 * dt; m.z = Math.max(.05, Math.min(.95, m.z + info.tz * 70 * dt / DEPTH)); }
    const pl = gw.player; const info = pl && this.inside(pl);
    if (info && ((pl.vx ?? 0) * info.tx + (pl.vz ?? 0) * DEPTH * info.tz) > 20) boost(pl, 1.22);
  }
  render(ctx) {
    const mat = this.mat; const roll = Math.min(1, this.t / .5); const dry = Math.max(0, (this.t - (this.life - .8)) / .8);
    const b = { x: this.a.x + (this.b.x - this.a.x) * roll, z: this.a.z + (this.b.z - this.a.z) * roll };
    const pts = linePts(this.a, b, 14);
    ribbon(ctx, pts, (i, n) => (i / n < dry ? 0 : 9), { ...mat, kind: 'crystal' }, 1500, this.t, .45);
    // Platinum wave ridges travelling downstream and crystal fish markers.
    for (let k = 0; k < 4; k++) { const u = ((this.t * .6 + k / 4) % 1) * roll; if (u < dry) continue; const i = Math.floor(u * 14); const [x, y] = pts[Math.min(14, i)]; thread(ctx, [[x - 4, y - 5], [x, y - 2], [x - 4, y + 3]], mat.edge, 1.5, .9); }
    for (let k = 0; k < 3; k++) { const u = ((this.t * .35 + k / 3) % 1) * roll; const [x, y] = pts[Math.min(14, Math.floor(u * 14))]; plate(ctx, [[x - 5, y], [x, y - 2], [x + 5, y], [x, y + 2]], mat, 1510 + k, { alpha: .8, core: .8 }); }
    const s = groundPt(this.a.x, this.a.z, 10, this.t * 3); plate(ctx, [[s[0], s[1] - 4], [s[0] + 4, s[1]], [s[0], s[1] + 4], [s[0] - 4, s[1]]], mat, 1520, { alpha: 1 - dry, core: 1 });
  }
}
defineSignature('S15', { cast(c) { emit(onePerOwner('S15', c.caster, new FloodRail(c.sig, c.caster, lineOf(c.target, c.caster, 260, 120))), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S16 GLUTPUMPE — stores heat from fire, vents a steam roller on water, bursts.
// ═════════════════════════════════════════════════════════════════════════
const isFire = (s) => s.element === 'ignis' || s.profile?.vfx === 'fire';
const isWater = (s) => s.element === 'aqua' || s.profile?.vfx === 'ice' || /Frost|Blizzard|Glacial|Aqua/.test(s.constructor?.name ?? '');
class EmberPump extends SigProp {
  constructor(sig, owner, x, z, power) { super(sig, owner, x, z, { hp: 70, size: 16, duration: 16 }); this.power = power; this.hot = false; this.triggers = 0; this.surfaceCool = 0; this.valves = [0, 1, 2].map((i) => ({ a: i * TAU / 3 + .4 + (i === 1 ? .3 : 0), r: 30 + i * 4 })); }
  trigger(kind, gw) {
    this.triggers++;
    if (kind === 'heat') { this.hot = true; combat.spawnShockwave(this.x, this.y - 30, 30, this.mat.vein); }
    else this.vent(gw);
    if (this.triggers >= 3) this.burst(gw);
  }
  vent(gw) {
    // A visible steam roller pushes out sideways.
    this.hot = false; const dir = Math.sign(this.x - this.owner.x) || 1; const sig = this.sig; const x0 = this.x; const z = this.z; const power = this.power;
    emit(new SigSequence(sig, this.owner, { dur: .9, x: x0, z, tick: (s, dt, w) => { s.x = x0 + dir * 280 * Math.min(1, s.t / .9); s.strike(w, (t, dx, dz) => Math.abs(dx) < 30 && Math.abs(dz) < 34, 30 * power, dir * 320, 140, .4); if (Math.random() < dt * 8) environment.add('smoke', s.x, z, { radius: 30 }); },
      draw: (ctx, s) => { for (let i = 0; i < 6; i++) { const a = s.t * 9 + i; plate(ctx, [[s.x + Math.cos(a) * 20, s.y - 26 + Math.sin(a) * 18], [s.x + Math.cos(a + .6) * 26, s.y - 26 + Math.sin(a + .6) * 22], [s.x + Math.cos(a + .3) * 12, s.y - 26 + Math.sin(a + .3) * 10]], { ...sig.mat, kind: 'smoke', body: '#d8d4d0', facet: '#f2f0ee' }, 1600 + i, { alpha: .7 * (1 - s.t / .9) }); } } }));
  }
  burst(gw) {
    for (const t of foesOf(gw, this.team)) if (groundDist(t, this) < 95) hit(t, 50 * this.power, Math.sign(t.x - this.x || 1) * 300, 200, .5);
    environment.add('scorch', this.x, this.z, { radius: 70, team: this.team });
    combat.shakeCamera(10, .3); this.shatter();
  }
  update(dt, gw) {
    this.tick(dt); if (this.isDead) return; this.surfaceCool = Math.max(0, this.surfaceCool - dt);
    for (const s of sigSink()?.activeSpells ?? []) {
      if (s.isFinished || s._pumped) continue;
      if (s.isCapturableProjectile && s.team === this.team && groundDist(s, this) < 36) {
        if (isFire(s)) { s._pumped = true; s.detonate ? s.detonate(gw) : projKill(s); this.trigger('heat', gw); }
        else if (isWater(s) && this.hot) { s._pumped = true; projKill(s); this.trigger('water', gw); }
      } else if (!s.isCapturableProjectile && isWater(s) && s.team === this.team && this.hot && groundDist(s, this) < 110) { s._pumped = true; this.trigger('water', gw); }
    }
    if (this.surfaceCool <= 0) {
      const here = environment.effectsAt?.(this.x, this.z) ?? [];
      if (!this.hot && here.some((e) => e.type === 'lava' || e.type === 'scorch')) { this.surfaceCool = 2; this.trigger('heat', gw); }
      else if (this.hot && here.some((e) => e.type === 'water' || e.type === 'ice')) { this.surfaceCool = 2; this.trigger('water', gw); }
    }
  }
  render(ctx) {
    const mat = this.mat; const y = this.y; const t = this.t; const g = this.fade * (this.hitFlash ? .7 : 1);
    if (spellSheetReady('ember_pump')) { drawSpellSprite(ctx, 'ember_pump', Math.min(this.triggers, 2) + (this.hot ? 3 : 0) + (this.hot ? 0 : Math.floor(t * 4) % 1), this.x, y + 2, { alpha: g }); return; }
    for (const v of this.valves) { const [vx, vy] = groundPt(this.x, this.z, v.r, v.a); slab(ctx, vx, vy, 5, 14, mat, this.seed + v.r, g, 2); }
    // Narrow ribbed pressure body of porous black glass stone.
    for (let i = 0; i < 4; i++) plate(ctx, [[this.x - 11 + i, y - i * 12], [this.x + 11 - i, y - i * 12 - 1], [this.x + 10 - i, y - (i + 1) * 12], [this.x - 10 + i, y - (i + 1) * 12 + 1]], mat, this.seed + 20 + i, { alpha: g, lit: .8, pulse: this.hot ? .5 + .5 * Math.sin(t * 8 + i) : .2, glowEdge: this.hot ? 1.2 : .3 });
    // Readable pressure gauge: one lit segment per trigger, glow when hot.
    for (let k = 0; k < 3; k++) plate(ctx, [[this.x + 14, y - 14 - k * 9], [this.x + 19, y - 14 - k * 9], [this.x + 19, y - 21 - k * 9], [this.x + 14, y - 21 - k * 9]], mat, this.seed + 30 + k, { alpha: g, core: k < this.triggers ? 1 : 0, glowEdge: k < this.triggers ? 1 : .2 });
    if (this.hot) sparks(ctx, [[this.x, y - 50]], mat, t, this.seed + 40, 6, 1);
  }
}
defineSignature('S16', { cast(c) { emit(new EmberPump(c.sig, c.caster, c.target?.x ?? c.caster.x + c.caster.facing * 120, c.target?.z ?? c.caster.z, c.quality.power), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S17 RAUMFALTER — a curved space fold: narrow shots glance off, beams weaken.
// ═════════════════════════════════════════════════════════════════════════
class SpaceFold {
  constructor(sig, owner, a, b) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.a = a; this.b = b; this.t = 0; this.isFinished = false; this.uses = 0; this.sides = new WeakMap(); this.x = (a.x + b.x) / 2; this.z = (a.z + b.z) / 2; }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt;
    if (this.collapsed) { if (this.t > this.collapsed + .4) this.isFinished = true; return; }
    if (this.t > 10) { this.collapse(); return; }
    for (const p of projectilesOf(gw)) {
      if (projDamage(p) > 70) continue; // only narrow projectiles
      const info = segInfo(this.a, this.b, p.x, p.z); const prev = this.sides.get(p); this.sides.set(p, info.side);
      if (prev && prev !== info.side && info.u > 0 && info.u < 1 && info.dist < 30) {
        const [vx, vz] = projVel(p); const [rx, rz] = reflectVel(vx, vz, info.nx, info.nz);
        projSetVel(p, rx, rz); this.sides.set(p, -info.side); this.uses++;
        combat.spawnHitSparks(p.x, yOf(p.z, projHeight(p)), Math.sign(rx) || 1, this.mat.edge, 8);
        if (this.uses >= 4) { this.collapse(); return; }
      }
    }
    // Large beams only lose part of their intensity.
    for (const s of sigSink()?.activeSpells ?? []) {
      if (!s.isBeam || !s.isActive || s._folded) continue;
      const { min, max } = s.segmentBounds(); const fx = this.a.x + (this.b.x - this.a.x) * Math.max(0, Math.min(1, (s.z - this.a.z) / ((this.b.z - this.a.z) || 1e-6)));
      const zr = [Math.min(this.a.z, this.b.z) - .05, Math.max(this.a.z, this.b.z) + .05];
      if (s.z < zr[0] || s.z > zr[1] || fx < min || fx > max) continue;
      s._folded = true; s.damage *= .65; this.uses++; combat.spawnShockwave(fx, s.y, 30, this.mat.vein);
      if (this.uses >= 4) { this.collapse(); return; }
    }
  }
  collapse() { if (this.collapsed) return; this.collapsed = this.t; debris(this.x, this.y - 40, this.mat, 1700, 14, 90); }
  render(ctx) {
    const mat = this.mat; const k = this.collapsed ? 1 - (this.t - this.collapsed) / .4 : Math.min(1, this.t * 3);
    const base = linePts(this.a, this.b, 12, 0, 0); const top = linePts(this.a, this.b, 12, 70, 14);
    if (spellSheetReady('space_fold')) {
      // Panes of folded space hung along the curve (each pane tilted with the fold), then the gold seam on top.
      for (let i = 0; i < 12; i += 2) { const mx = (base[i][0] + top[i][0] + base[i + 2 > 12 ? 12 : i + 2][0] + top[i + 2 > 12 ? 12 : i + 2][0]) / 4; const my = (base[i][1] + top[i][1]) / 2; drawSpellSprite(ctx, 'space_fold', Math.floor(this.t * 6 + i) % 4, mx, my, { anchor: 'center', scale: .55, alpha: .5 * Math.max(.4, k) }); }
      thread(ctx, top, mat.edge, 2, k); return;
    }
    for (let i = 0; i < 12; i++) plate(ctx, [base[i], base[i + 1], top[i + 1], top[i]], { ...mat, kind: 'crystal' }, 1710 + i, { alpha: .22 * k, glowEdge: .6 });
    thread(ctx, top, mat.vein, 2, .8 * k); thread(ctx, base, mat.vein, 1, .5 * k);
    // Flat sails of broken mirror scraps along the fold.
    for (let i = 1; i < 12; i += 3) { const [x, y] = top[i]; plate(ctx, [[x, y], [x + 8, y + 12], [x + 2, y + 22], [x - 6, y + 10]], mat, 1730 + i, { alpha: .8 * k, glowEdge: .8 }); }
    // Entry / exit guide lines (violet / green) show the danger corridors.
    const mid = top[6]; thread(ctx, [[mid[0] - 40, mid[1] + 30], [mid[0], mid[1] + 30]], '#b07aff', 1, .5 * k); thread(ctx, [[mid[0], mid[1] + 30], [mid[0] + 40, mid[1] + 10]], '#5fe0a0', 1, .5 * k);
    for (let u = 0; u < 4 - this.uses; u++) plate(ctx, [[mid[0] - 6 + u * 5, mid[1] - 12], [mid[0] - 4 + u * 5, mid[1] - 16], [mid[0] - 2 + u * 5, mid[1] - 12]], mat, 1740 + u, { alpha: k, core: 1 });
  }
}
defineSignature('S17', { cast(c) { const f = c.caster.facing || 1; emit(new SpaceFold(c.sig, c.caster, c.target?.a ?? { x: c.caster.x + f * 110, z: Math.max(.08, c.caster.z - .3) }, c.target?.b ?? { x: c.caster.x + f * 150, z: Math.min(.92, c.caster.z + .3) }), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S18 GLASFELD — a mirror mosaic: own impacts charge tiles, enemy shots reflect.
// ═════════════════════════════════════════════════════════════════════════
class GlassField {
  constructor(sig, owner, x, z, power) {
    this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.x = x; this.z = z; this.t = 0; this.isFinished = false; this.power = power; this.tracked = new Map();
    this.tiles = []; for (let ring = 0; ring < 3; ring++) { const n = ring === 0 ? 1 : ring * 5; for (let i = 0; i < n; i++) { const a = i / n * TAU + ring * .3; const r = ring * 34; this.tiles.push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r / DEPTH, state: 'idle', seed: 1800 + ring * 10 + i }); } }
  }
  get y() { return groundYForDepth(this.z); }
  inside(x, z) { return Math.hypot(x - this.x, (z - this.z) * DEPTH) < 100; }
  charge(x, z) { const free = this.tiles.filter((t) => t.state === 'idle').sort((p, q) => Math.hypot(p.x - x, (p.z - z) * DEPTH) - Math.hypot(q.x - x, (q.z - z) * DEPTH)); if (free[0]) { free[0].state = 'charged'; combat.spawnShockwave(free[0].x, groundYForDepth(free[0].z), 16, this.mat.edge); } }
  onSigEvent(type, info) { if (type === 'hit' && info.heavy && this.inside(this.owner.x + this.owner.facing * 30, this.owner.z)) this.charge(this.owner.x + this.owner.facing * 30, this.owner.z); }
  update(dt, gw) {
    this.t += dt; if (this.t > 8) { if (!this.broken) { this.broken = true; debris(this.x, this.y - 6, this.mat, 1850, 16, 80); } this.isFinished = true; return; }
    // Own projectiles that end on the mosaic count as ground impacts.
    for (const [p, at] of this.tracked) if (p.isFinished || p.life <= 0) { this.charge(at.x, at.z); this.tracked.delete(p); }
    for (const p of projectilesOf(gw)) {
      if (p.team === this.team) { if (this.inside(p.x, p.z)) this.tracked.set(p, { x: p.x, z: p.z }); else this.tracked.delete(p); continue; }
      if (projHeight(p) > 60) continue;
      const tile = this.tiles.find((t) => t.state === 'charged' && Math.hypot(t.x - p.x, (t.z - p.z) * DEPTH) < 18);
      if (!tile) continue;
      tile.state = 'spent';
      const dir = -Math.sign(projVel(p)[0] || 1);
      emit(new SigBolt({ x: tile.x, z: tile.z, height: 20, vx: dir * 720, team: this.team, damage: 16 * this.power, mat: this.mat, kind: 'crystal', size: 5, life: .45, skipProps: true }));
    }
  }
  render(ctx) {
    const mat = this.mat; const k = Math.min(1, this.t * 3) * Math.min(1, (8 - this.t) / .5);
    for (const tile of this.tiles) {
      const y = groundYForDepth(tile.z); const r = 15;
      const pts = Array.from({ length: 6 }, (_, i) => [tile.x + Math.cos(i * TAU / 6 + .3) * r, y + Math.sin(i * TAU / 6 + .3) * r * .32]);
      const spent = tile.state === 'spent';
      plate(ctx, pts, spent ? { ...mat, body: '#1a2024', facet: '#2a3034', vein: '#2a3a3a' } : { ...mat, kind: 'crystal' }, tile.seed, { alpha: k * (spent ? .8 : .7), glowEdge: tile.state === 'charged' ? 1.4 : .3, core: tile.state === 'charged' ? 1 : 0 });
    }
  }
}
defineSignature('S18', { cast(c) { c.listen(emit(new GlassField(c.sig, c.caster, c.target?.x ?? c.caster.x + c.caster.facing * 140, c.target?.z ?? c.caster.z, c.quality.power), c.quality)); } });

// ═════════════════════════════════════════════════════════════════════════
// S19 STRAHLENWEBER — a prism splits YOUR beam into two weaker angled branches.
// ═════════════════════════════════════════════════════════════════════════
class BeamPrism extends SigProp {
  constructor(sig, owner, x, z) { super(sig, owner, x, z, { hp: 80, size: 14, duration: 14, heavyObject: true }); this.energy = 3; this.lastBeam = -9; this.beam = null; this.rot = 0; this.tickT = 0; }
  onFriendlyBeam(beam) { this.beam = beam; this.lastBeam = this.t; this.rot += (Math.atan2(0, beam.facing) - this.rot) * .2; }
  branches() { const f = this.beam?.facing ?? 1; return [-.45, .45].map((a) => ({ a: { x: this.x, z: this.z }, b: { x: this.x + f * Math.cos(a) * 170, z: Math.max(.03, Math.min(.97, this.z + Math.sin(a) * 170 / DEPTH)) } })); }
  update(dt, gw) {
    this.tick(dt); if (this.isDead) return;
    const active = this.beam && !this.beam.isFinished && this.t - this.lastBeam < .15;
    if (!active) return;
    this.energy -= dt;
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = .25;
      // Each branch: shorter reach and its own reduced damage ticks (sum < unsplit beam).
      for (const br of this.branches()) for (const t of foesOf(gw, this.team)) { const info = segInfo(br.a, br.b, t.x, t.z); if (info.dist < 18 && info.u > .02) hit(t, (this.beam.damage ?? 20) * .35, Math.sign(br.b.x - br.a.x) * 60, 20, .15); }
    }
    if (this.energy <= 0) { this.isHeavyObject = false; this.shatter(); }
  }
  render(ctx) {
    const mat = this.mat; const y = this.y - 24; const t = this.t; const active = this.beam && this.t - this.lastBeam < .15;
    // Three copper prism arms around a bright central light seam.
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + this.rot - Math.PI / 2; plate(ctx, [[this.x, y], [this.x + Math.cos(a - .25) * 18, y + Math.sin(a - .25) * 14], [this.x + Math.cos(a) * 22, y + Math.sin(a) * 18], [this.x + Math.cos(a + .25) * 18, y + Math.sin(a + .25) * 14]], mat, this.seed + i, { alpha: this.fade * (this.hitFlash ? .6 : 1), glowEdge: .8, lit: .9 }); }
    thread(ctx, [[this.x, y - 12], [this.x, y + 12]], mat.core, 2, .9);
    slab(ctx, this.x, this.y, 8, 14, mat, this.seed + 9, this.fade);
    if (active) for (const br of this.branches()) { const pts = [[br.a.x, y], [(br.a.x + br.b.x) / 2, (y + groundYForDepth(br.b.z) - 24) / 2], [br.b.x, groundYForDepth(br.b.z) - 24]]; ribbon(ctx, pts, 3 + Math.sin(t * 30) * .6, mat, this.seed + 20, t, .85); sparks(ctx, [pts[2]], mat, t, this.seed + 30, 4, 1); }
    for (let k = 0; k < Math.ceil(this.energy); k++) plate(ctx, [[this.x - 8 + k * 6, y - 26], [this.x - 6 + k * 6, y - 30], [this.x - 4 + k * 6, y - 26]], mat, this.seed + 40 + k, { alpha: .9, core: 1 });
  }
}
defineSignature('S19', { cast(c) { emit(new BeamPrism(c.sig, c.caster, c.target?.x ?? c.caster.x + c.caster.facing * 120, c.target?.z ?? c.caster.z), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S20 PRISMENHALTER — catch one enemy projectile, fire it back as a crystal salvo.
// ═════════════════════════════════════════════════════════════════════════
defineSignature('S20', {
  cast(c) { startStance(c.caster, 'S20', c.quality, { stored: null, loadedAt: 0 }); },
  stance: {
    duration: 8,
    hint: (p, st) => (st.stored ? 'GELADEN · ANGRIFF: KRISTALLSALVE' : 'FÄNGT DAS NÄCHSTE FEINDGESCHOSS VON VORN'),
    counter: (p, st) => ({ n: st.stored ? 1 : 0, max: 1 }),
    update(p, st, dt, gw) {
      const f = p.facing || 1;
      if (!st.stored) {
        for (const q of projectilesOf(gw)) {
          if (q.team === p.team) continue;
          const dx = (q.x - p.x) * f; if (dx < 0 || dx > 42 || Math.abs(q.z - p.z) * DEPTH > 26 || projHeight(q) > (p.worldHeight ?? 0) + 110) continue;
          st.stored = { damage: projDamage(q) }; st.loadedAt = st.t; projKill(q);
          combat.spawnShockwave(p.x + f * 22, p.y - 44, 28, st.sig.mat.vein); st.timer = Math.max(st.timer, 4.2); break;
        }
      } else if (st.t - st.loadedAt > 4) {
        // Unused charge discharges harmlessly into the ground.
        combat.spawnHitSparks(p.x + f * 16, p.y - 4, f, st.sig.mat.edge, 10); st.stored = null; st.timer = 0;
      }
    },
    onEvent(p, st, type) {
      if (type !== 'attack' || !st.stored) return;
      const f = p.facing || 1; const each = st.stored.damage / 3;
      for (let i = 0; i < 3; i++) emit(new SigBolt({ x: p.x + f * 20, z: p.z, height: 46, vx: f * 430, vz: (i - 1) * .22, team: p.team, damage: Math.max(6, each), mat: st.sig.mat, kind: 'crystal', size: 7, life: 1.3, delay: i * .07, seed: 2000 + i }), st.quality);
      st.stored = null; st.timer = Math.min(st.timer, .2); // the clamps break after one shot
    },
    render(ctx, p, st, ry, layer) {
      if (layer !== 'front') return;
      const mat = st.sig.mat; const f = p.facing || 1; const x = p.x + f * 22; const y = ry - 46; const open = Math.min(1, st.t / .3);
      for (const sg of [-1, 1]) plate(ctx, [[x, y + sg * 2], [x + f * 12 * open, y + sg * (4 + 10 * open)], [x + f * 9 * open, y + sg * (2 + 12 * open)]], mat, 2010 + sg, { alpha: 1, glowEdge: 1, lit: .8 });
      if (st.stored) { const sp = st.t * 3; plate(ctx, [[x + f * 8 + Math.cos(sp) * 5, y + Math.sin(sp) * 3], [x + f * 8, y - 5], [x + f * 8 - Math.cos(sp) * 5, y - Math.sin(sp) * 3], [x + f * 8, y + 5]], mat, 2015, { alpha: 1, core: 1, glowEdge: 1.4 }); }
      for (let i = 0; i < 3; i++) { const a = st.t * 2 + i * 2.1; shard(ctx, x + Math.cos(a) * 16, y + Math.sin(a) * 8, 2.5, a, mat, 2020 + i, .7); }
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S21 SCHWARMPROTOKOLL — mark by hitting, then one homing needle per hit.
// ═════════════════════════════════════════════════════════════════════════
const WINDOWS = (p, ry) => { const f = p.facing || 1; return [[p.x + f * 10, ry - 66], [p.x - f * 12, ry - 62], [p.x + f * 18, ry - 46], [p.x - f * 9, ry - 48]]; };
defineSignature('S21', {
  cast(c) {
    const p = c.caster; let mark = null; let best = 340;
    for (const t of foesOf(c.gw, p.team)) { const d = groundDist(t, p); if (d < best && (t.x - p.x) * (p.facing || 1) > -20) { best = d; mark = t; } }
    startStance(p, 'S21', c.quality, { mark, shots: 0, cool: 0 });
  },
  stance: {
    duration: 7,
    hint: 'ANGRIFF: SUCHNADEL AUFS MARKIERTE ZIEL · TREFFER MARKIERT NEU',
    counter: (p, st) => ({ n: 4 - st.shots, max: 4 }),
    update(p, st, dt) { st.cool = Math.max(0, st.cool - dt); if (st.mark && !aliveFoe(st.mark)) st.mark = null; },
    onEvent(p, st, type, info) {
      if (type === 'hit') {
        const foe = info.hits?.find((h) => !h.target.isProp)?.target;
        if (foe && foe !== st.mark) { st.mark = foe; combat.spawnShockwave(foe.x, foe.y - 50, 22, st.sig.mat.vein); }
        return;
      }
      if (type !== 'attack' && type !== 'heavy') return;
      if (!st.mark || st.shots >= 4 || st.cool > 0) return;
      const [wx] = WINDOWS(p, p.y)[st.shots];
      emit(new SigBolt({ x: wx, z: p.z, height: 60 - st.shots * 6, vx: (p.facing || 1) * 420, vz: (st.shots % 2 ? .3 : -.3), team: p.team, damage: 12, mat: st.sig.mat, size: 5, life: 1.8, turn: 3.5, homing: st.mark, seed: 2100 + st.shots }), st.quality);
      st.shots++; st.cool = .4;
      if (st.shots >= 4) st.timer = Math.min(st.timer, 1);
    },
    render(ctx, p, st, ry, layer) {
      const mat = st.sig.mat;
      if (layer === 'front') WINDOWS(p, ry).forEach(([x, y], i) => {
        const closed = i < st.shots; const s = closed ? 2 : 4;
        plate(ctx, [[x - s, y - s], [x + s, y - s], [x + s, y + s], [x - s, y + s]], mat, 2110 + i, { alpha: closed ? .5 : 1, glowEdge: closed ? .2 : 1, core: closed ? 0 : .8 });
        if (!closed) thread(ctx, [[x - 2, y + 1], [x, y - 1], [x + 2, y + 1]], mat.edge, 1, .9);
      });
      if (layer === 'front' && st.mark) { const m = st.mark; const top = m.y - (m.renderHeight ?? 70) - 10; for (let i = 0; i < 4; i++) { const a = st.t * 3 + i * TAU / 4; plate(ctx, [[m.x + Math.cos(a) * 12, top + Math.sin(a) * 4], [m.x + Math.cos(a) * 7, top + Math.sin(a) * 3 - 6], [m.x + Math.cos(a) * 9, top + Math.sin(a) * 3 + 1]], mat, 2120 + i, { alpha: .95, glowEdge: .9 }); } }
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════
// S22 RISSWEICHE — two portal edges for projectiles: in at A, out of B.
// ═════════════════════════════════════════════════════════════════════════
class RiftEdge extends SigProp {
  constructor(sig, owner, x, z, label) { super(sig, owner, x, z, { hp: 40, size: 12, duration: 10 }); this.label = label; }
  update(dt) { this.tick(dt); }
  render(ctx) {
    const mat = this.mat; const y = this.y; const g = this.fade * (this.hitFlash ? .6 : 1);
    // A half-height broken gate frame of frayed lapis splinters with a gold inner rim.
    for (const sg of [-1, 1]) for (let i = 0; i < 4; i++) plate(ctx, [[this.x + sg * (10 + (i % 2) * 2), y - i * 11], [this.x + sg * (14 + (i % 2)), y - i * 11 - 2], [this.x + sg * 13, y - (i + 1) * 11], [this.x + sg * 9, y - (i + 1) * 11 + 1]], mat, this.seed + sg * 10 + i, { alpha: g, glowEdge: .6, lit: .8 });
    thread(ctx, [[this.x - 8, y - 2], [this.x - 8, y - 42], [this.x + 8, y - 42], [this.x + 8, y - 2]], mat.vein, 1.5, g * (.6 + .3 * Math.sin(this.t * 6)));
    ctx.save(); ctx.globalAlpha = g * .35; ctx.fillStyle = mat.dark; ctx.fillRect(snap(this.x - 7), snap(y - 41), 14, 39); ctx.restore();
  }
}
class RiftSwitch {
  constructor(sig, owner, a, b) { this.sig = sig; this.owner = owner; this.team = owner.team; this.t = 0; this.isFinished = false; this.uses = 0; this.A = emit(new RiftEdge(sig, owner, a.x, a.z, 'A')); this.B = emit(new RiftEdge(sig, owner, b.x, b.z, 'B')); this.x = a.x; this.z = a.z; }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt;
    if (this.uses >= 3 || this.A.isDead || this.B.isDead || this.t > 10) { for (const e of [this.A, this.B]) e.duration = Math.min(e.duration, e.t + .3); this.isFinished = true; return; }
    const dir = Math.sign(this.B.x - this.A.x) || (this.owner.facing || 1);
    for (const p of projectilesOf(gw)) {
      if (p._rift) continue;
      for (const edge of [this.A, this.B]) {
        if (Math.abs(p.x - edge.x) > 14 || Math.abs(p.z - edge.z) * DEPTH > 16 || projHeight(p) > 70) continue;
        if (p.team === this.team && edge === this.A) {
          // Own shot: enters A, leaves B in B's direction.
          const sp = Math.max(300, Math.hypot(...projVel(p)));
          p.x = this.B.x + dir * 18; p.z = this.B.z; projSetVel(p, dir * sp, 0); p._rift = true; this.uses++;
          combat.spawnShockwave(this.A.x, this.A.y - 22, 20, this.sig.mat.vein); combat.spawnShockwave(this.B.x, this.B.y - 22, 20, this.sig.mat.vein);
        } else if (p.team !== this.team) {
          // Enemy shots glance off sideways.
          const [vx] = projVel(p); projSetVel(p, -vx * .5, (p.z > edge.z ? 1 : -1) * .9); p._rift = true;
          combat.spawnHitSparks(p.x, yOf(p.z, projHeight(p)), -Math.sign(vx) || 1, this.sig.mat.edge, 8);
        }
        break;
      }
    }
  }
  render(ctx) { for (let k = 0; k < 3 - this.uses; k++) plate(ctx, [[this.A.x - 6 + k * 6, this.A.y - 54], [this.A.x - 4 + k * 6, this.A.y - 58], [this.A.x - 2 + k * 6, this.A.y - 54]], this.sig.mat, 2200 + k, { alpha: .9, core: 1 }); }
}
defineSignature('S22', { cast(c) { const f = c.caster.facing || 1; emit(new RiftSwitch(c.sig, c.caster, c.target?.a ?? { x: c.caster.x + f * 60, z: c.caster.z }, c.target?.b ?? { x: c.caster.x + f * 60, z: Math.min(.92, c.caster.z + .3) }), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S23 POLARISATIONSWERK — a magnet rotor bends light metallic projectiles.
// ═════════════════════════════════════════════════════════════════════════
const isMetallic = (p) => p.type === 'bolt' || (p.isSigProjectile && p.kind !== 'crystal');
class PolarRotor extends SigProp {
  constructor(sig, owner, x, z, side) { super(sig, owner, x, z, { hp: 70, size: 16, duration: 10 }); this.side = side; this.load = 0; this.seen = new WeakSet(); this.R = 120; }
  update(dt, gw) {
    this.tick(dt); if (this.isDead) return;
    for (const p of projectilesOf(gw)) {
      if (!isMetallic(p) || projDamage(p) >= 40 || groundDist(p, this) > this.R) continue; // flames, void and heavy shots pass
      const [vx, vz] = projVel(p); projSetVel(p, vx * (1 - dt * .4), vz + (this.side * 1.1 - vz) * Math.min(1, dt * 4));
      if (!this.seen.has(p)) { this.seen.add(p); this.load++; }
    }
    if (this.load >= 6) {
      // Overload: the rotor springs apart in a trembling spark cloud.
      for (const t of foesOf(gw, this.team)) if (groundDist(t, this) < 60) hit(t, 15, Math.sign(t.x - this.x || 1) * 120, 60, .25);
      combat.spawnShockwave(this.x, this.y - 30, 60, this.mat.edge); this.shatter();
    }
  }
  render(ctx) {
    const mat = this.mat; const y = this.y; const t = this.t; const g = this.fade * (this.hitFlash ? .6 : 1);
    for (let i = 0; i < 3; i++) { const a = t * 3 + i * TAU / 3; const [x0, y0] = groundPt(this.x, this.z, 4, a); const [x1, y1] = groundPt(this.x, this.z, 18, a + .3); plate(ctx, [[x0, y0], [x1, y1 - 3], [x1 + 3, y1 + 2]], mat, this.seed + i, { alpha: g, lit: .9 }); }
    slab(ctx, this.x, y, 8, 34, mat, this.seed + 5, g);
    // Two counter-rotating half rings show the zone; toothed rotors float above.
    segRing(ctx, this.x, this.z, this.R, mat, t, .35 * g, { segs: 7, thick: 3, gap: .5, spin: .6, seed: this.seed + 10 });
    segRing(ctx, this.x, this.z, this.R - 10, mat, -t, .3 * g, { segs: 7, thick: 2, gap: .4, spin: .6, seed: this.seed + 20 });
    for (let k = 0; k < 2; k++) { const cy = y - 46 - k * 14; const r = 9 - k * 2; for (let i = 0; i < 8; i++) { const a = t * (k ? -4 : 4) + i * TAU / 8; plate(ctx, [[this.x + Math.cos(a) * r, cy + Math.sin(a) * r * .5], [this.x + Math.cos(a + .2) * (r + 3), cy + Math.sin(a + .2) * (r + 3) * .5], [this.x + Math.cos(a + .4) * r, cy + Math.sin(a + .4) * r * .5]], mat, this.seed + 30 + i, { alpha: g, glowEdge: .7 }); } }
    for (let i = 0; i < 6; i++) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = g * (.4 + .4 * Math.sin(t * 9 + i)); ctx.fillStyle = mat.spark; ctx.fillRect(snap(this.x + Math.cos(i * 2.2) * 20), snap(y - 20 - (i * 7) % 40), 1, 1); ctx.restore(); }
    for (let k = 0; k < 6 - this.load; k++) plate(ctx, [[this.x - 10 + k * 4, y - 72], [this.x - 8 + k * 4, y - 75], [this.x - 6 + k * 4, y - 72]], mat, this.seed + 50 + k, { alpha: .8, core: 1 });
  }
}
defineSignature('S23', { cast(c) { const x = c.target?.x ?? c.caster.x + c.caster.facing * 130; const z = c.target?.z ?? c.caster.z; emit(new PolarRotor(c.sig, c.caster, x, z, z >= c.caster.z ? 1 : -1), c.quality); } });

// ═════════════════════════════════════════════════════════════════════════
// S24 SCHWERELOSBAND — a narrow corridor: crossing foes are lifted, shots float.
// ═════════════════════════════════════════════════════════════════════════
class WeightlessBand {
  constructor(sig, owner, line) { this.sig = sig; this.mat = sig.mat; this.owner = owner; this.team = owner.team; this.a = line.a; this.b = line.b; this.t = 0; this.isFinished = false; this.lifted = new Map(); this.x = (this.a.x + this.b.x) / 2; this.z = (this.a.z + this.b.z) / 2; }
  get y() { return groundYForDepth(this.z); }
  inBand(e) { const info = segInfo(this.a, this.b, e.x, e.z); return info.dist < 16 && info.u > 0 && info.u < 1; }
  update(dt, gw) {
    this.t += dt; if (this.t > 6.4) { this.isFinished = true; return; }
    if (this.t > 6) return;
    for (const t of foesOf(gw, this.team)) {
      if (!this.inBand(t) || (this.lifted.get(t) ?? -9) > this.t - 1.5) continue;
      this.lifted.set(t, this.t); hit(t, 1, 0, 240 * massOf(t) + 40, .12);
    }
    for (const p of projectilesOf(gw)) if (p.team === this.team && !p._floated && this.inBand(p)) { p._floated = true; p.life += .35; if (Number.isFinite(p.height)) p.height += 12; }
  }
  render(ctx) {
    const mat = this.mat; const k = Math.min(1, this.t * 3) * Math.max(0, Math.min(1, (6.4 - this.t) / .4));
    const base = linePts(this.a, this.b, 10);
    thread(ctx, base, mat.dark, 3, .7 * k); thread(ctx, base, mat.vein, 1, .5 * k);
    // Curved, textured field lines rising over the narrow ground crack.
    for (let i = 0; i <= 10; i += 2) { const [x, y] = base[i]; const ph = (this.t * .8 + i * .13) % 1; const pts = [[x, y], [x + Math.sin(this.t * 2 + i) * 4, y - 20], [x - Math.sin(this.t * 2 + i) * 3, y - 44]]; thread(ctx, pts, '#d8b45a', 1, .5 * k * (i < 10 - this.t * 1.6 || this.t < 5 ? 1 : 0)); plate(ctx, [[x - 2, y - ph * 50], [x, y - ph * 50 - 3], [x + 2, y - ph * 50]], mat, 2400 + i, { alpha: k * (1 - ph), core: .8 }); }
  }
}
defineSignature('S24', { cast(c) { emit(new WeightlessBand(c.sig, c.caster, lineOf(c.target, c.caster, 220, 100)), c.quality); } });

export const SIGNATURES_B = ['S13', 'S14', 'S15', 'S16', 'S17', 'S18', 'S19', 'S20', 'S21', 'S22', 'S23', 'S24'];
