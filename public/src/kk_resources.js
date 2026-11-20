// GRIMGE Prototype — Kronenkrieg resources (user feedback, 20 Nov 2026: "Holz durch Bäume zerstören, Stein durch Felsen
// usw. — Obsidian ist das stärkste Material und dauert länger").
//   • the trees, rocks, ore veins and obsidian blocks of the landscape (kk_art.js buildDecor) are resource nodes: hitting
//     one wears it down (it shakes and shows a small bar), at zero it falls / breaks and its material drops as items;
//   • tougher material, more hits: tree < rock < ore (steel) < obsidian; weapon blows count fully, spells half
//     (harvesting is hands-on);
//   • a felled node regrows after a while (stump / rubble until then).
// Only the player's side can harvest: the nodes join the hostile targets of the player's team (main.getHostileTargets),
// marked isProp so that the AI of the squad never chases them.
import { groundYForDepth } from './world.js';
import { combat } from './combat.js';
import { drawDecor } from './kk_art.js';
import { kkState, kkOn } from './kk_world.js';
import { spawnItems } from './kk_items.js';
import { gainXp } from './kk_loot.js';
import { addDeed } from './kk_titles.js';

export const RESOURCE = Object.freeze({
  oak: { mat: 'wood', n: 4, hp: 60, chip: '#8a5a34', tree: true },
  pine: { mat: 'wood', n: 4, hp: 60, chip: '#8a5a34', tree: true },
  snowpine: { mat: 'wood', n: 4, hp: 60, chip: '#8a5a34', tree: true },
  dead: { mat: 'wood', n: 3, hp: 45, chip: '#5a463a', tree: true },
  rock: { mat: 'stone', n: 4, hp: 95, chip: '#9a9286' },
  ore: { mat: 'steel', n: 3, hp: 150, chip: '#c8dae6' },
  obsidian: { mat: 'obsidian', n: 2, hp: 280, chip: '#9b6bff' }
});
export const REGROW = 150;
const REACH = 1000;

class ResourceNode {
  constructor(game, d) {
    this.game = game; this.d = d; this.def = RESOURCE[d.kind];
    this.isProp = true; this.isResourceNode = true; this.team = 'neutral';
    this.radius = 18; this.hitRadiusX = 20; this.halfX = 20; this.halfZ = .06;
    this.worldHeight = 0; this.elevation = 0; this.surfaceHeight = 0; this.hitHeightTolerance = 160;
  }
  get x() { return this.d.x; }
  get z() { return this.d.z; }
  get y() { return groundYForDepth(this.d.z); }
  get hp() { return this.d.hp ?? this.def.hp; }
  get maxHp() { return this.def.hp; }
  get isDead() { return !!this.d.gone; }
  get isAlive() { return !this.d.gone; }
  takeDamage(amount, kx = 0, lift = 0, stun = 0, crit = false, kind = 'melee') {
    const d = this.d; if (d.gone || !(amount > 0)) return { ignored: true };
    const dmg = kind === 'spell' || kind === 'beam' ? amount * .5 : amount;
    d.hp = (d.hp ?? this.def.hp) - dmg; d.shake = .22; d.hitT = 2.5;
    combat.spawnHitSparks(d.x, this.y - (this.def.tree ? 30 : 12), Math.sign(kx) || 1, this.def.chip, 6);
    if (d.hp <= 0) fell(this.game, d, Math.sign(kx) || 1);
    return {};
  }
  takeBeamDamage(amount) { this.takeDamage(amount, 0, 0, 0, false, 'beam'); }
  slow() {}
}

function fell(game, d, dir) {
  const kk = kkState(game); const def = RESOURCE[d.kind];
  d.gone = true; d.hp = 0; d.regrowAt = kk.time + REGROW; d.fallT = 0; d.fallDir = dir;
  combat.spawnHitSparks(d.x, groundYForDepth(d.z) - 14, dir, def.chip, 16);
  spawnItems(game, d.x + dir * (def.tree ? 40 : 10), d.z + .03, { materials: { [def.mat]: def.n } }, { row: d.row, spread: 26 });
  gainXp(game, def.mat === 'obsidian' ? 6 : def.mat === 'steel' ? 3 : 1); addDeed(game, 'nodes');
}

const nodeOf = (game, d) => (d.node ??= new ResourceNode(game, d));
// The nodes the player's side may hit right now (current level, near the player).
export function kkResourceTargets(game) {
  const kk = kkState(game); if (!kk?.decor || kk.inside) return [];
  const P = game.player; const out = [];
  for (const d of kk.decor) if (RESOURCE[d.kind] && !d.gone && d.row === kk.row && Math.abs(d.x - P.x) < REACH && Math.abs(d.z - P.z) < 4) out.push(nodeOf(game, d));
  return out;
}

export function updateResources(game, dt) {
  if (!kkOn(game)) return; const kk = kkState(game);
  for (const d of kk.decor ?? []) {
    if (!RESOURCE[d.kind]) continue;
    if (d.shake > 0) d.shake = Math.max(0, d.shake - dt);
    if (d.hitT > 0) d.hitT = Math.max(0, d.hitT - dt);
    if (d.gone) { d.fallT = (d.fallT ?? 0) + dt; if (kk.time >= d.regrowAt) { d.gone = false; d.hp = RESOURCE[d.kind].hp; d.fallT = 0; } }
  }
}

const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
// Draws a landscape piece; resource nodes shake when hit, show their bar, fall (trees) or break (stone) and leave a
// stump / rubble until they regrow.
export function drawNode(ctx, d, y) {
  const def = RESOURCE[d.kind];
  if (!def) { drawDecor(ctx, d, y); return; }
  if (d.gone) {
    const t = d.fallT ?? 0;
    if (def.tree && t < .7) { /* the trunk tips over */
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - .45) / .25); ctx.translate(d.x, y); ctx.rotate((d.fallDir || 1) * Math.min(1, t / .45) ** 2 * 1.45); ctx.translate(-d.x, -y); drawDecor(ctx, d, y); ctx.restore();
    }
    if (def.tree) { px(ctx, d.x - 6, y - 8, 12, 8, '#4a3020'); px(ctx, d.x - 5, y - 9, 10, 2, '#c9a064'); px(ctx, d.x - 8, y - 1, 16, 2, '#2e1e14'); }
    else { const c = d.kind === 'obsidian' ? ['#1a1024', '#3a2a50'] : d.kind === 'ore' ? ['#3c4a56', '#6e7a84'] : ['#4e4842', '#766d62']; for (let i = 0; i < 4; i++) px(ctx, d.x - 14 + i * 8, y - 4 - (i % 2) * 2, 6, 4, c[i % 2]); }
    return;
  }
  const sx = d.shake > 0 ? Math.sin(d.shake * 70) * 3 : 0;
  drawDecor(ctx, sx ? { ...d, x: d.x + sx } : d, y);
  if (d.hitT > 0) {
    const f = Math.max(0, (d.hp ?? def.hp) / def.hp); const top = y - (def.tree ? 74 : 40);
    ctx.save(); ctx.globalAlpha = Math.min(1, d.hitT / .5); px(ctx, d.x - 21, top, 42, 6, '#140f18'); px(ctx, d.x - 20, top + 1, 40 * f, 4, def.chip); ctx.restore();
  }
}
