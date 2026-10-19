// GRIMGE Prototype — temporary arena geometry from spells (user, 18 Oct
// 2026: "wenn eine Säule unter einem gespawnt wird, kriegt er Schaden, kann
// aber auch darauf stehen wie auf einer Plattform").
//
// A GeoPlatform has three phases:
//  1. EMERGE — it rises; foes inside its footprint are hit and launched;
//     heroes standing in it (Wizards, champions) are carried up on top.
//  2. SOLID  — a landing-only surface (Arena-platform rules): walk under or
//     past it freely, land on its top while falling, stand on it.
//  3. DECAY  — it sinks / breaks; whoever stands on it comes down with it.
// Surfaces are registered on the battlefield's dynamicSurfaces while alive.
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { plate } from './buff_vfx.js';

let nextId = 1;
const ease = (k) => k * k * (3 - 2 * k);
export const GEO_LOOKS = Object.freeze({
  stone: { kind: 'crust', dark: '#2f2a24', body: '#6d6253', facet: '#8f8371', vein: '#d9b77a', edge: '#efe0bd', spark: '#f6d58a', core: '#fff6d8', glow: 'rgba(217,183,122,', edgeGlow: 'rgba(239,224,189,' },
  ice: { kind: 'crystal', dark: '#1c3c52', body: '#8fd8ff', facet: '#d9f6ff', vein: '#bff0ff', edge: '#ffffff', spark: '#e6fbff', core: '#ffffff', glow: 'rgba(143,216,255,', edgeGlow: 'rgba(255,255,255,' },
  root: { kind: 'crust', dark: '#2a1c10', body: '#6b4a2b', facet: '#8a6640', vein: '#9be36a', edge: '#d8f5b0', spark: '#c6ff7a', core: '#f4ffe0', glow: 'rgba(155,227,106,', edgeGlow: 'rgba(216,245,176,' },
  bark: { kind: 'crust', dark: '#24180e', body: '#5a3d22', facet: '#7a5634', vein: '#7ddc5a', edge: '#c8e8a0', spark: '#b6ff7a', core: '#f0ffe0', glow: 'rgba(125,220,90,', edgeGlow: 'rgba(200,232,160,' }
});

const battlefieldOf = (game) => game?.battlefield ?? null;
export function registerSurface(game, surface) { const bf = battlefieldOf(game); if (!bf) return; bf.dynamicSurfaces ??= []; bf.dynamicSurfaces.push(surface); }
export function unregisterSurface(game, surface) { const bf = battlefieldOf(game); if (!bf?.dynamicSurfaces) return; const i = bf.dynamicSurfaces.indexOf(surface); if (i >= 0) bf.dynamicSurfaces.splice(i, 1); }

export class GeoPlatform {
  constructor(caster, game, { x, z, halfW = 34, halfD = .07, height = 70, life = 6, emerge = .25, decay = .45, delay = 0, look = 'stone', damage = 22, lift = 360, stun = .5, label = 'Spell platform', onEmerge = null } = {}) {
    this.caster = caster; this.owner = caster; this.team = caster?.team; this.game = game;
    this.x = x; this.z = z; this.halfW = halfW; this.halfD = halfD; this.height = height;
    this.life = life; this.emerge = emerge; this.decay = decay; this.delay = delay; this.t = -delay;
    this.mat = GEO_LOOKS[look] ?? GEO_LOOKS.stone; this.look = look; this.damage = damage; this.lift = lift; this.stun = stun; this.onEmerge = onEmerge;
    this.hit = new Set(); this.isFinished = false; this.isGeoPlatform = true; this.seed = nextId * 37;
    this.surface = Object.freeze({
      id: `geo_${nextId++}`, label, xMin: x - halfW, xMax: x + halfW, zMin: z - halfD, zMax: z + halfD,
      baseHeight: height, landingOnly: true, isGeo: true, heightAt: () => this.currentHeight
    });
    this.registered = false;
  }
  get y() { return groundYForDepth(this.z); }
  get currentHeight() {
    if (this.t <= 0) return 0;
    if (this.t < this.emerge) return this.height * ease(this.t / this.emerge);
    if (this.t > this.life - this.decay) return this.height * Math.max(0, (this.life - this.t) / this.decay);
    return this.height;
  }
  inside(e) { return Math.abs(e.x - this.x) <= this.halfW && Math.abs((e.z ?? this.z) - this.z) <= this.halfD; }
  update(dt, game = this.game) {
    this.t += dt;
    if (this.t <= 0) return;
    if (!this.registered) { this.registered = true; registerSurface(game, this.surface); }
    if (this.t < this.emerge + .02) {
      // Emerging: hit foes in the footprint once; carry heroes (not minions) up on top.
      for (const t of game?.getHostileTargets?.(this.team) ?? []) {
        if (this.hit.has(t) || t.isDead || !this.inside(t)) continue;
        this.hit.add(t);
        if (this.damage) t.takeDamage?.(this.damage, 0, t.isMinion || !t.heroKey ? this.lift : 0, this.stun, false, 'spell');
        this.onEmerge?.(t);
      }
      for (const e of [game?.player, game?.enemyChampion]) if (e && !e.isMinion && e.isAlive !== false && e.grounded && this.inside(e)) { e.surfaceId = this.surface.id; }
    }
    if (this.t >= this.life) { this.isFinished = true; unregisterSurface(game, this.surface); }
  }
  // Debug overlay (?hitbox=1): the real gameplay footprint and the standable top.
  renderHitbox(ctx) {
    const y = this.y; const d = this.halfD * 150 * .32; const top = y - this.currentHeight;
    ctx.save(); ctx.globalAlpha = .9; ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(this.x - this.halfW) + .5, Math.round(y - d) + .5, Math.round(this.halfW * 2), Math.max(1, Math.round(d * 2)));
    ctx.strokeStyle = '#39ff14'; ctx.beginPath(); ctx.moveTo(Math.round(this.x - this.halfW), Math.round(top) + .5); ctx.lineTo(Math.round(this.x + this.halfW), Math.round(top) + .5); ctx.stroke();
    ctx.restore();
  }
  // Destroy early (e.g. a breakable pillar was smashed).
  shatter() { if (this.t < this.life - this.decay) this.t = this.life - this.decay; }
  render(ctx) {
    const h = this.currentHeight; if (h <= .5) return;
    const m = this.mat; const yb = this.y; const top = yb - h; const w = this.halfW; const d = this.halfD * 150 * .32;
    // Front face (towards the camera), then the top face on it.
    // The front face keeps its cracks subtle (seams, not a bright scar across the pillar).
    plate(ctx, [[this.x - w, yb + d], [this.x + w, yb + d], [this.x + w, top + d], [this.x - w, top + d]], { ...m, vein: m.kind === 'crystal' ? m.vein : m.dark }, this.seed, { alpha: 1, lit: .5, glowEdge: .4 });
    // Horizontal seams / growth rings.
    ctx.save(); ctx.strokeStyle = m.dark; ctx.globalAlpha = .55; ctx.lineWidth = 1;
    for (let yy = top + d + 10; yy < yb + d - 4; yy += 14) { ctx.beginPath(); ctx.moveTo(this.x - w + 3, yy); ctx.lineTo(this.x + w - 3, yy + (this.look === 'root' || this.look === 'bark' ? 2 : 0)); ctx.stroke(); }
    ctx.restore();
    plate(ctx, [[this.x - w, top + d], [this.x - w + 6, top - d], [this.x + w - 6, top - d], [this.x + w, top + d]], { ...m, body: m.facet, facet: m.edge }, this.seed + 1, { alpha: 1, lit: 1, glowEdge: .8 });
    if (this.look === 'ice') for (let i = 0; i < 3; i++) plate(ctx, [[this.x - w + 6 + i * w * .6, top - d], [this.x - w + 10 + i * w * .6, top - d - 12 - i * 3], [this.x - w + 14 + i * w * .6, top - d]], m, this.seed + 5 + i, { alpha: 1, glowEdge: 1 });
    if (this.look === 'root' || this.look === 'bark') for (let i = 0; i < 2; i++) plate(ctx, [[this.x + (i ? w : -w), top + d + 6], [this.x + (i ? w + 12 : -w - 12), top + d - 2], [this.x + (i ? w : -w), top + d - 6]], { ...m, body: '#5fae3e', facet: '#9be36a' }, this.seed + 9 + i, { alpha: 1 });
    // Dust at the base while it rises.
    if (this.t < this.emerge + .15) { ctx.save(); ctx.globalAlpha = .5 * (1 - this.t / (this.emerge + .15)); ctx.fillStyle = '#c8b89a'; ctx.beginPath(); ctx.ellipse(this.x, yb + d, w * 1.4, d * 2 + 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
}

// Spawn helper: adds the platform to the spell system.
export function spawnPlatform(spells, caster, game, opts) {
  const p = new GeoPlatform(caster, game, opts);
  spells?.addSpell?.(p, 'B');
  combat.spawnDust?.(opts.x, groundYForDepth(opts.z), 6);
  return p;
}
