// GRIMGE Prototype — heavy-charge techniques of the buff transformations.
//
// Same hit rules as every form technique (FormStrikeSpell: SHORT before
// FULL_CHARGE_TIME, FULL after; hitboxes come from gameplay values, never
// from the size of the effect), but drawn from the form's own material:
// pressure plates, cracked shards, plate rings, shear columns, faceted
// cores, plate bands — no plain glow rings. Added kinds: a travelling core
// that implodes ('projectile'), a lane beam ('beam'), T40's twin hunting
// wyrms ('wyrms') and its portal ritual ('portals'). Statuses named by the
// atlas gameplay text are applied on hit.
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { FormStrikeSpell } from './form_moves.js';
import { plate, band, fallout, rng } from './buff_vfx.js';

const DEPTH_PX = 150;
const TAU = Math.PI * 2;
const alive = (t) => t && !t.isDead && (!t.lifeState || t.lifeState === 'Alive') && !t.isObjective && !t.isProp;

// Status effects from the gameplay text (applied once per hit).
export function applyStatuses(target, statuses, caster, facing) {
  for (const st of statuses ?? []) {
    switch (st) {
      case 'freeze': target.freeze?.(.9); break;
      case 'slow': target.slow ? target.slow(1.6, .5) : (target.slowTimer = 1.6, target.slowFactor = .5); break;
      case 'stun': case 'root': target.slow ? target.slow(st === 'root' ? 1.1 : .6, .05) : (target.slowTimer = 1, target.slowFactor = .05); break;
      case 'burn': target.takeDamage?.(5, 0, 0, .05, false, 'spell'); combat.spawnElementalParticles(target.x, (target.y ?? 0) - 26, 'ignis', 6); break;
      case 'acid': target.takeDamage?.(4, 0, 0, .05, false, 'spell'); target.slow?.(1.2, .7); break;
      case 'shock': target.slow?.(.4, .3); combat.spawnElementalParticles(target.x, (target.y ?? 0) - 30, 'fulgur', 5); break;
      case 'pull': if ('kbVelX' in target) target.kbVelX = -Math.sign(target.x - caster.x || facing) * 280; break;
      case 'heal': if (caster.hp > 0) caster.hp = Math.min(caster.maxHp, caster.hp + 6); break;
      default: break;
    }
  }
}

export class BuffStrikeSpell extends FormStrikeSpell {
  constructor(caster, config, form) {
    super(caster, config);
    this.buff = form; this.mat = form.mat; this.statuses = config.status ?? [];
    this.seed = (config.seed ?? 1) + form.id.charCodeAt(1) * 31;
    if (this.kind === 'projectile') { this.px = this.x; this.travelled = 0; }
    if (this.kind === 'wyrms') this.heads = [-.13, .13].map((dz) => ({ x: caster.x + this.facing * 20, z: Math.max(.04, Math.min(.96, caster.z + dz)), trail: [], hits: new Set() }));
    if (this.kind === 'portals') this.setupPortals();
    this.impacts = [];
  }

  onHit(target) {
    applyStatuses(target, this.statuses, this.caster, this.facing);
    this.impacts.push({ x: target.x, y: (target.y ?? this.y) - 28, t: this.t });
  }

  setupPortals() {
    const foes = (window.gameWorld?.getHostileTargets(this.team) ?? []).filter(alive)
      .filter((t) => Math.abs(t.x - this.caster.x) <= 380 && (t.x - this.caster.x) * this.facing > -40)
      .sort((a, b) => Math.abs(a.x - this.caster.x) - Math.abs(b.x - this.caster.x));
    const target = foes[0];
    this.focus = target ? { x: target.x, z: target.z ?? this.z } : { x: this.caster.x + this.facing * 200, z: this.z };
    this.portals = Array.from({ length: 4 }, (_, i) => ({ a: i * TAU / 4 + .4, at: .3 + i * .17, done: false }));
  }

  hitAt(gameWorld, x, z, radius, { damage, kx = 200, lift = 60, stun = .4, crit = false }, hitSet = null) {
    let n = 0;
    for (const target of gameWorld.getHostileTargets(this.team).filter(alive)) {
      if (hitSet?.has(target)) continue;
      if (Math.hypot(target.x - x, ((target.z ?? z) - z) * DEPTH_PX) > radius + (target.radius ?? 12)) continue;
      hitSet?.add(target);
      target.takeDamage(damage, Math.sign(target.x - x || this.facing) * kx, lift, stun, crit, 'spell');
      this.onHit(target); n++;
    }
    return n;
  }

  update(dt, gameWorld) {
    const c = this.cfg;
    switch (this.kind) {
      case 'projectile': {
        this.t += dt;
        if (!this.exploded) {
          const step = (c.speed ?? 420) * dt;
          this.px += this.facing * step; this.travelled += step;
          const hit = gameWorld.getHostileTargets(this.team).filter(alive).find((t) => Math.abs(t.x - this.px) <= 18 && Math.abs(((t.z ?? this.z) - this.z) * DEPTH_PX) <= 26 && !this.hitSet.has(t));
          if (hit) {
            this.hitSet.add(hit);
            hit.takeDamage(this.damage, this.facing * (c.kx ?? 240), c.lift ?? 60, .4, false, 'spell'); this.onHit(hit);
            if (!c.pierce) this.explode(gameWorld);
          }
          if (this.travelled >= (c.range ?? 420)) this.explode(gameWorld);
        } else if (c.explode && !this.implodeDone && this.t - this.explodedAt >= .22) {
          // A second, offset ring of the implosion (atlas: staggered pressure rings).
          this.implodeDone = true;
          this.hitAt(gameWorld, this.px, this.z, c.explode * 1.25, { damage: this.damage * .5, kx: -160, lift: 120, stun: .5 }, new Set());
        }
        if (this.exploded && this.t - this.explodedAt > .55) this.isFinished = true;
        if (this.t > 3) this.isFinished = true;
        return;
      }
      case 'beam': {
        this.t += dt;
        this.tickTimer = (this.tickTimer ?? 0) - dt;
        const len = (c.length ?? 360) * Math.min(1, this.t / .15);
        if (this.tickTimer <= 0 && this.t < this.life - .1) {
          this.tickTimer = c.tick ?? .12; const hs = new Set();
          for (const target of gameWorld.getHostileTargets(this.team).filter(alive)) {
            const dx = (target.x - this.x) * this.facing;
            if (dx < -8 || dx > len || Math.abs(((target.z ?? this.z) - this.z) * DEPTH_PX) > (c.width ?? 22)) continue;
            hs.add(target);
            target.takeDamage(this.damage * .16, this.facing * 70, 20, .25, false, 'spell'); this.onHit(target);
          }
        }
        if (this.t >= this.life) this.isFinished = true;
        return;
      }
      case 'wyrms': {
        this.t += dt;
        for (const h of this.heads) {
          h.x += this.facing * 380 * dt;
          h.trail.unshift([h.x, h.z]); if (h.trail.length > 16) h.trail.pop();
          h.tick = (h.tick ?? 0) - dt;
          if (h.tick <= 0) { h.tick = .1; h.hits = new Set(); }
          this.hitAt(gameWorld, h.x, h.z, 26, { damage: this.damage * .3, kx: 160, lift: 140, stun: .4 }, h.hits);
        }
        if (this.t >= this.life) this.isFinished = true;
        return;
      }
      case 'portals': {
        this.t += dt;
        for (const p of this.portals) {
          if (p.done || this.t < p.at) continue;
          p.done = true;
          const last = p === this.portals[this.portals.length - 1];
          this.hitAt(gameWorld, this.focus.x, this.focus.z, last ? 70 : 42, { damage: last ? this.damage : this.damage * .28, kx: last ? 320 : 90, lift: last ? 360 : 150, stun: .5, crit: last }, new Set());
          combat.spawnShockwave(this.focus.x, groundYForDepth(this.focus.z) - 6, last ? 90 : 44, this.mat.vein);
          combat.shakeCamera(last ? 10 : 4, .2);
        }
        if (this.t >= this.life) this.isFinished = true;
        return;
      }
      default: super.update(dt, gameWorld);
    }
  }

  explode(gameWorld) {
    this.exploded = true; this.explodedAt = this.t;
    if (this.cfg.explode) {
      this.hitAt(gameWorld, this.px, this.z, this.cfg.explode, { damage: this.damage * .7, kx: 300, lift: 220, stun: .55, crit: true }, new Set(this.hitSet));
      combat.spawnShockwave(this.px, groundYForDepth(this.z) - 30, this.cfg.explode, this.mat.vein);
      combat.shakeCamera(8, .25);
    }
  }

  // ── Material visuals ─────────────────────────────────────────────────
  render(ctx) {
    const c = this.cfg; const m = this.mat; const f = this.facing;
    const p = Math.min(1, this.t / this.life); const fade = 1 - p; const y = this.y;
    const r = rng(this.seed);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    switch (this.kind) {
      case 'burst': {
        // A faceted arm / claw of plates sweeping along its arc.
        const cx = this.x; const cy = y - (c.arcY ?? 50);
        const a0 = c.arcFrom ?? -1.2; const a1 = c.arcTo ?? 1.0; const reach = c.reach ?? 70;
        const sweep = a0 + (a1 - a0) * Math.min(1, p * 2.2);
        for (let k = 0; k < 5; k++) {
          const a = a0 + (sweep - a0) * (k / 4);
          const rr = reach * (.55 + k * .1);
          const P = (ang, rad) => [cx + f * Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
          plate(ctx, [P(a - .12, rr * .55), P(a, rr), P(a + .14, rr * .62)], m, this.seed + k, { alpha: fade * (.6 + k * .1), pulse: 1, core: k === 4 ? 1 : 0 });
        }
        break;
      }
      case 'cone': {
        // Pressure plates fanning out low over the ground.
        const reach = (c.range ?? 220) * Math.min(1, p * 1.6);
        for (let k = 0; k < 7; k++) {
          const u = (k + 1) / 7; if (u * (c.range ?? 220) > reach + 10) continue;
          const d = u * reach; const spread = 12 + d * .32;
          for (const sgn of [-1, 0, 1]) {
            const px = this.x + f * d; const py = y - 18 + sgn * spread * .45 - (sgn === 0 ? 4 : 0);
            plate(ctx, [[px - f * 8, py - 6], [px + f * 6, py - 9], [px + f * 10, py + 2], [px - f * 4, py + 6]], m, this.seed + k * 3 + sgn, { alpha: fade * (1 - u * .4), pulse: .5 + .5 * Math.sin(this.t * 20 + k) });
          }
        }
        const lead = []; for (let k = 0; k <= 5; k++) { const a = -.45 + k * .18; lead.push([this.x + f * Math.cos(a) * reach, y - 16 + Math.sin(a) * reach * .45]); }
        band(ctx, lead, () => 3, m, this.seed + 40, { t: this.t, alpha: fade });
        break;
      }
      case 'pillar': {
        // A shear column of stacked plates rising in front.
        const h = 210 * Math.min(1, p * 3); const w = c.width ?? 34;
        for (let k = 0; k < 9; k++) {
          const yy = y - (k / 9) * h; if (yy < y - h) continue;
          const jitter = Math.sin(this.t * 24 + k) * 3;
          plate(ctx, [[this.x - w + jitter, yy], [this.x + w * .4 + jitter, yy - 4], [this.x + w * .6 + jitter, yy - h / 9 - 2], [this.x - w * .7 + jitter, yy - h / 9]], m, this.seed + k, { alpha: .85 * fade + .15, pulse: 1 });
        }
        fallout(ctx, [[this.x, y - h * .5], [this.x, y - h]], m, this.t * 2, this.seed + 9, { count: 10, alpha: fade });
        break;
      }
      case 'wall': {
        const wx = this.wallX ?? this.x; const h = 170;
        for (let k = 0; k < 7; k++) {
          const yy = y - k * h / 7;
          plate(ctx, [[wx - 10, yy], [wx + 12, yy - 3], [wx + 10, yy - h / 7 - 2], [wx - 12, yy - h / 7 + 1]], m, this.seed + k, { alpha: .5 * fade + .4, pulse: 1 });
        }
        break;
      }
      case 'ring':
      case 'sequence': {
        for (const e of this.events) {
          const ex = this.x + (e.dx ?? 0) * f; const ez = this.z + (e.dz ?? 0); const gy = groundYForDepth(ez) - this.surfaceHeight;
          const rad = e.radius ?? 30;
          if (!e.done) {
            // Telegraph: a ring of small plates gathering where the hit lands.
            const k = Math.min(1, this.t / Math.max(.01, e.at));
            const n = Math.max(6, Math.round(rad / 6));
            for (let i = 0; i < n; i++) { const a = i / n * TAU; const x = ex + Math.cos(a) * rad * k; const yy = gy + Math.sin(a) * rad * .3 * k; plate(ctx, [[x - 3, yy - 2], [x + 3, yy - 2], [x + 2, yy + 2], [x - 2, yy + 2]], m, this.seed + i, { alpha: .35 + .5 * k, glowEdge: .5 }); }
          } else {
            // Impact: a burst of shards and a cracked plate ring.
            e.doneAt ??= this.t; const age = (this.t - e.doneAt) / .4;
            if (age < 1) {
              const n = Math.max(8, Math.round(rad / 5));
              for (let i = 0; i < n; i++) { const a = i / n * TAU + r(); const d = rad * (.4 + age * .9); const x = ex + Math.cos(a) * d; const yy = gy - 6 + Math.sin(a) * d * .35 - age * 20 * r(); plate(ctx, [[x, yy - 5], [x + 4, yy + 2], [x - 4, yy + 3]], m, this.seed + 50 + i, { alpha: 1 - age, pulse: 1 }); }
            }
          }
        }
        break;
      }
      case 'projectile': {
        const x = this.px; const yy = y - 34;
        if (!this.exploded) {
          // A faceted core of rotating plates with a trail of shards.
          for (let k = 0; k < 5; k++) { const a = this.t * 8 + k * TAU / 5; plate(ctx, [[x, yy], [x + Math.cos(a) * 13, yy + Math.sin(a) * 13], [x + Math.cos(a + .9) * 9, yy + Math.sin(a + .9) * 9]], m, this.seed + k, { alpha: 1, pulse: 1, core: 1 }); }
          fallout(ctx, [[x - f * 8, yy]], m, this.t * 3, this.seed + 7, { count: 10, driftX: -f * 60 });
        } else {
          const age = Math.min(1, (this.t - this.explodedAt) / .5);
          const rad = (c.explode ?? 40) * (age < .45 ? 1 - age : .55 + (age - .45));
          const n = 14;
          for (let i = 0; i < n; i++) { const a = i / n * TAU + age * 2; const px = x + Math.cos(a) * rad; const py = yy + Math.sin(a) * rad * .55; plate(ctx, [[px, py - 4], [px + 5, py], [px, py + 4], [px - 5, py]], m, this.seed + 20 + i, { alpha: 1 - age, pulse: 1 }); }
        }
        break;
      }
      case 'beam': {
        const len = (c.length ?? 360) * Math.min(1, this.t / .15);
        const pts = []; for (let k = 0; k <= 10; k++) pts.push([this.x + f * len * k / 10, y - 32 + Math.sin(this.t * 30 + k) * 2]);
        band(ctx, pts, (i) => (c.width ?? 22) * .45 * (1 - .3 * Math.abs(i - 5) / 5), m, this.seed, { t: this.t * 3, alpha: fade * .7 + .3, glow: 1.4 });
        break;
      }
      case 'wyrms': {
        for (const [hi, h] of this.heads.entries()) {
          const spine = h.trail.map(([x, z], i) => [x, groundYForDepth(z) - 44 - Math.sin(this.t * 10 + i * .6 + hi * 3) * 12]);
          if (spine.length > 2) band(ctx, spine, (i, nn) => 7 - (i / nn) * 4, m, this.seed + hi * 9, { t: this.t, alpha: fade * .5 + .5 });
          const [hx, hy] = spine[0] ?? [h.x, y - 44];
          plate(ctx, [[hx - f * 4, hy - 7], [hx + f * 26, hy], [hx - f * 4, hy + 7]], m, this.seed + 30 + hi, { alpha: 1, core: 1 });
        }
        break;
      }
      case 'portals': {
        const fy = groundYForDepth(this.focus.z);
        for (const pt of this.portals) {
          const px = this.focus.x + Math.cos(pt.a) * 76; const py = fy - 60 + Math.sin(pt.a) * 30;
          const k = Math.min(1, this.t / pt.at);
          for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + this.t * 3; plate(ctx, [[px + Math.cos(a) * 14 * k, py + Math.sin(a) * 20 * k], [px + Math.cos(a + .4) * 18 * k, py + Math.sin(a + .4) * 25 * k], [px + Math.cos(a + .2) * 10 * k, py + Math.sin(a + .2) * 14 * k]], m, this.seed + i, { alpha: pt.done ? .4 : .9 }); }
          if (pt.done && this.t - pt.at < .18) band(ctx, [[px, py], [(px + this.focus.x) / 2, (py + fy - 30) / 2 - 10], [this.focus.x, fy - 30]], () => 4, m, this.seed + 70, { t: this.t, alpha: 1 });
        }
        break;
      }
      default: super.render(ctx);
    }
    // Contact sparks only where a hit was confirmed.
    for (const imp of this.impacts) {
      const age = (this.t - imp.t) / .3; if (age >= 1) continue;
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + imp.t; const d = 6 + age * 18; plate(ctx, [[imp.x + Math.cos(a) * d, imp.y + Math.sin(a) * d], [imp.x + Math.cos(a) * (d + 6), imp.y + Math.sin(a) * (d + 6) - 2], [imp.x + Math.cos(a + .3) * d, imp.y + Math.sin(a + .3) * d]], m, this.seed + 90 + i, { alpha: 1 - age, pulse: 1 }); }
    }
    ctx.restore();
  }
}
