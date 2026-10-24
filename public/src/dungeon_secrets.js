// GRIMGE Prototype — dungeon secrets (user, 23 Oct 2026: "secrets in den Dungeons, die nur
// erreichbar sind, wenn man den passenden Spell hat … durch Wachsen eines Baums hochspringen auf
// eine andere Ebene, die dann wiederum ein Portal zu einem anderen Boss hat").
//
// A secret = HINT (something odd in the room) → KEY (an element / ability: the deck, a dungeon rune
// offer or a shrine in the room) → WAY (a new level: up a grown tree, through a floor, behind a
// wall) → REWARD (a secret room with its own boss that drops a late rune, a chest, the way back).
// Secret rooms are separate rooms far to the right of the dungeon (own bounds, own ambience);
// a portal brings the Wizard in and back to the spot it left.
//
// First secret — DER VERDORRTE HAIN (dungeon room 2): a withered seedling at the foot of a high
// rock wall. Watered long enough (water / nature spells, the water shrine's charges, a leaking
// barrel) it grows into a GIANT TREE whose branches are the way up (user, 24 Oct 2026: "der Baum kann
// ruhig groß wachsen und die Äste als Plateau bilden"); in its crown the portal into the DORNENHAIN
// opens, where the THORN TREANT (secret boss) guards a late rune.
import { Minion } from './entities.js';
import { environment } from './environment.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { getStatusSource } from './status_effects.js';
import { puzzleHooks } from './scene_pack_puzzles.js';
import { actorsOf, groundDist, px, blob, DEPTH, TAU } from './scene_objects.js';

export const SECRET_BASE_X = 40000;

// ── the portal (not a target; environment.sceneFx) ─────────────────────────
export class SecretPortal {
  constructor(x, z, h, link, { label = 'PORTAL', color = '#9be36a', exit = false, when = null } = {}) { Object.assign(this, { x, z, h, link, label, color, exit, when, t: 0, isFinished: false, isSecretPortal: true }); }
  get y() { return groundYForDepth(this.z); }
  // A portal with a condition (the grown tree crown) stays closed and invisible until it holds.
  get open() { return !this.when || this.when(); }
  update(dt, gw) {
    if (!this.open) { this.t = 0; return; }
    this.t += dt; const p = gw?.player; if (!p || p.lifeState === 'Dead' || this.t < .6) return;
    const hgt = (p.elevation ?? 0) + (p.surfaceHeight ?? 0);
    if (Math.abs(p.x - this.x) < 20 && Math.abs(((p.z ?? this.z) - this.z) * DEPTH) < 14 && Math.abs(hgt - this.h) < 34) {
      this.t = 0;
      if (this.exit) leaveSecret(gw); else enterSecret(gw, this.link, this);
    }
  }
  render(ctx) {
    if (!this.open) return;
    const x = Math.round(this.x); const y = Math.round(this.y - this.h);
    for (let i = 0; i < 3; i++) { const r = 14 - i * 4; ctx.save(); ctx.globalAlpha = .55 + i * .15; ctx.strokeStyle = i === 2 ? '#ffffff' : this.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 26, r, r * 1.7, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    for (let i = 0; i < 6; i++) { const a = this.t * 3 + i * 1.05; px(ctx, x + Math.cos(a) * 16, y - 26 + Math.sin(a) * 26, 2, 2, this.color); }
  }
}

// ── the secret rooms ──────────────────────────────────────────────────────
export const SECRET_ROOMS = {
  thorn_grove: {
    name: 'DORNENHAIN', width: 1300, tint: 'rgba(20,60,20,.32)', color: '#9be36a',
    build(gw, env, left) {
      // Overgrown clearing: thorn curtains at the sides, mushrooms, a beehive, a lantern; the Treant waits.
      env.addProp('mushrooms', left + 330, .82); env.addProp('beehive', left + 560, .16); env.addProp('lantern', left + 250, .2);
      env.addProp('bloom', left + 420, .3); env.addProp('mushrooms', left + 760, .2); env.addProp('sapling', left + 640, .84);
      const boss = new ThornTreant(left + 900, .55); gw.battlefield.placeOnSurface(boss); gw.minions.push(boss);
      return { boss };
    },
    reward(gw, env, left) { env.addProp('chest', left + 1000, .5, { lock: 'natura', loot: 3 }); }
  }
};
export const SECRET_IDS = Object.freeze(Object.keys(SECRET_ROOMS));
const roomIndex = (id) => Math.max(0, SECRET_IDS.indexOf(id));
export const secretBounds = (id) => { const left = SECRET_BASE_X + roomIndex(id) * 4000; return { left, right: left + SECRET_ROOMS[id].width }; };
export const isInSecret = (gw) => !!gw?.modeState?.secret;

export function enterSecret(gw, id, from = null) {
  const def = SECRET_ROOMS[id]; const state = gw?.modeState; if (!def || !state || state.secret) return false;
  const P = gw.player; const bounds = secretBounds(id);
  state.secret = { id, returnX: from?.x ?? P.x, returnZ: from?.z ?? P.z, returnBounds: { ...gw.battlefield.boundsOverride }, bossDefeated: false };
  Object.assign(gw.battlefield.boundsOverride, bounds);
  P.x = bounds.left + 120; P.z = .58; P.elevation = 0; P.vElevation = 0; gw.battlefield.placeOnSurface(P);
  for (const m of gw.minions) if (m.followLeader === P) { m.x = P.x - 30; m.z = P.z; gw.battlefield.placeOnSurface(m); }
  if (!state.secretsVisited) state.secretsVisited = [];
  const fresh = !state.secretsVisited.includes(id);
  if (fresh) { state.secretsVisited.push(id); state.secret.content = def.build(gw, environment, bounds.left) ?? {}; }
  else state.secret.bossDefeated = true;
  if (!fresh || !state.secret.content?.boss) openSecretExit(gw);
  state.dungeonCameraX = gw.dungeonCameraTarget?.() ?? state.dungeonCameraX;
  combat.spawnShockwave(P.x, P.y - 40, 70, def.color); audio.playImpact?.(true);
  gw.showAnnouncement?.(`GEHEIMNIS — ${def.name}`, 2.2);
  return true;
}
function openSecretExit(gw) {
  const s = gw.modeState.secret; const def = SECRET_ROOMS[s.id]; const b = secretBounds(s.id);
  if (s.exitOpen) return; s.exitOpen = true;
  environment.addSceneFx(new SecretPortal(b.left + 70, .5, 0, null, { exit: true, color: def.color }));
}
export function leaveSecret(gw) {
  const state = gw?.modeState; const s = state?.secret; if (!s) return false;
  Object.assign(gw.battlefield.boundsOverride, s.returnBounds);
  const P = gw.player; P.x = s.returnX; P.z = s.returnZ; P.elevation = 0; P.vElevation = 0; gw.battlefield.placeOnSurface(P);
  for (const m of gw.minions) if (m.followLeader === P) { m.x = P.x - 30; m.z = P.z; gw.battlefield.placeOnSurface(m); }
  state.secret = null; state.dungeonCameraX = gw.dungeonCameraTarget?.() ?? state.dungeonCameraX;
  gw.showAnnouncement?.('ZURÜCK IM DUNGEON', 1.4);
  return true;
}
// Per frame while inside a secret room: the boss falls → late rune drop, reward, way back.
export function updateDungeonSecret(gw) {
  const s = gw?.modeState?.secret; if (!s || s.bossDefeated) return;
  const boss = s.content?.boss; if (boss && !boss.isDead && boss.hp > 0) return;
  s.bossDefeated = true; const def = SECRET_ROOMS[s.id]; const b = secretBounds(s.id);
  let text = `${def.name} BEZWUNGEN`;
  if (gw.activeMode?.id !== 'training' && gw.profile?.rollBossDrop) {
    const drop = gw.profile.rollBossDrop();
    if (drop) { text += ` · ${drop.title}`; gw.modeState.secretDrops = [...(gw.modeState.secretDrops ?? []), drop]; gw.applyProfile?.(); }
  }
  def.reward?.(gw, environment, b.left);
  openSecretExit(gw);
  gw.showAnnouncement?.(text, 3);
}
// Screen-space ambience of the secret room (drawn over the backdrop, under the world).
export function renderSecretTint(ctx, gw) {
  const s = gw?.modeState?.secret; if (!s) return;
  ctx.save(); ctx.fillStyle = SECRET_ROOMS[s.id]?.tint ?? 'rgba(0,0,0,.3)'; ctx.fillRect(0, 0, 4096, 4096); ctx.restore();
}

// Hatches / broken floors / blown-away dust with a link: a portal appears (or the fall takes you in).
puzzleHooks.enterLink = (link, obj, gw, how) => {
  if (!SECRET_ROOMS[link]) return;
  if (how === 'fall') enterSecret(gw, link, obj);
  else environment.addSceneFx(new SecretPortal(obj.x, obj.z, 0, link, { color: SECRET_ROOMS[link].color }));
};

// ── DER VERDORRTE HAIN (dungeon room 2) ────────────────────────────────────
// The giant tree's limbs alternate left / right like a spiral stair: each reaches from just past the trunk's
// middle ~70 px outward, so neighbours overlap by ~28 px at the trunk and a straight jump up (or a short hop)
// reaches the next one. 56 px apart in height (a jump peaks at ~100 px): one limb per jump, never two at
// once. The last board lies in the crown, the portal on it.
export const WITHERED_GROVE = Object.freeze({ stage: 2, seedX: 1650, z: .26, shrineX: 1480, barrelX: 1560,
  branches: Object.freeze([[-28, 56, 42], [28, 112, 42], [-28, 168, 42], [5, 224, 40]]) });
export function setupDungeonSecrets(gw, stage, bounds) {
  if (stage !== WITHERED_GROVE.stage) return null;
  const L = bounds.left; const g = WITHERED_GROVE;
  const seed = environment.addProp('withered_seedling', L + g.seedX, g.z, { branches: g.branches.map((b) => [...b]), giant: true });
  seed.hpMult = 6; seed.setStage(0); seed.isSecretKey = true;
  seed.devHint = 'GEHEIMNIS: gießen (Wasser/Natur, Schrein, Fass) → Riesenbaum → über die Äste in die Krone → Portal';
  environment.addProp('shrine', L + g.shrineX, .5, { element: 'aqua' });
  environment.addProp('water_barrel', L + g.barrelX, g.z + .05);
  const [cdx, ch] = g.branches[g.branches.length - 1];
  const portal = environment.addSceneFx(new SecretPortal(L + g.seedX + cdx, g.z, ch, 'thorn_grove', { color: '#9be36a', when: () => !seed.isDead && seed.stage === 2 && seed.growK() >= 1 }));
  return { seed, portal };
}

// ── the secret boss: THORN TREANT ──────────────────────────────────────────
// Slow, heavy, rooted: thorn lines along the lane, a root ring, saplings that heal it. Fire hurts
// it (×1.6), water and nature barely (×0.4); from half life on it attacks faster and grows mushrooms.
class ThornLine {
  constructor(boss, target) { this.x = boss.x; this.z = boss.z; this.dir = Math.sign(target.x - boss.x) || -1; this.dz = ((target.z ?? boss.z) - boss.z); this.t = 0; this.n = 0; this.spikes = []; this.isFinished = false; this.hit = new Set(); }
  get y() { return groundYForDepth(this.z); }
  update(dt, gw) {
    this.t += dt;
    while (this.n < 7 && this.t > this.n * .09) { const k = (this.n + 1) / 7; this.spikes.push({ x: this.x + this.dir * (50 + this.n * 42), z: this.z + this.dz * k, t: 0 }); this.n++; }
    for (const s of this.spikes) { s.t += dt; if (s.t < .12) for (const a of actorsOf(gw)) if (a.team !== 'red' && !this.hit.has(a) && groundDist(a, s.x, s.z) < 22) { this.hit.add(a); a.takeDamage(18, this.dir * 120, 320, .5, false, 'spell'); } }
    if (this.t > 1.2) this.isFinished = true;
  }
  render(ctx) { for (const s of this.spikes) { const y = groundYForDepth(s.z); const h = Math.round(Math.min(1, s.t / .1) * 34 * Math.max(0, 1 - Math.max(0, s.t - .6) / .4)); if (h <= 0) continue; px(ctx, s.x - 3, y - h, 6, h, '#33691e'); px(ctx, s.x - 1, y - h - 4, 2, 4, '#dce775'); px(ctx, s.x - 7, y - h * .6, 4, 2, '#33691e'); px(ctx, s.x + 3, y - h * .4, 4, 2, '#33691e'); } }
}
export class ThornTreant extends Minion {
  constructor(x, z) {
    super(x, z, 'red', 'melee', 1);
    Object.assign(this, { isBoss: true, isSecretBoss: true, maxHp: 900, hp: 900, speed: 36, attackRange: 70, damage: 20, attackCooldown: 1.8, radius: 30, hitRadiusX: 30, hitHeightTolerance: 170, renderHeight: 120, specialT: 3, phase: 1, healT: 0, runXpValue: 120 });
    this.name = 'DORNEN-TREANT';
  }
  takeDamage(amount, kx = 0, lift = 0, stun = 0, crit = false, kind = 'melee') {
    const els = getStatusSource()?.statusElements ?? [];
    const mult = els.includes('ignis') || kind === 'fire' ? 1.6 : (els.includes('aqua') || els.includes('natura')) ? .4 : 1;
    return super.takeDamage(amount * mult, kx * .2, lift * .1, stun * .3, crit, kind);
  }
  update(dt, gw, bf) {
    super.update(dt, gw, bf);
    if (this.isDead || this.hp <= 0) return;
    if (this.phase === 1 && this.hp < this.maxHp / 2) { this.phase = 2; combat.spawnShockwave(this.x, this.y - 60, 120, '#9be36a'); gw.showAnnouncement?.('DER TREANT WÄCHST ZORNIG', 1.4); }
    // Saplings close by and water under it heal it.
    if ((this.healT -= dt) <= 0) {
      this.healT = 1;
      const saplings = environment.props.filter((o) => o.kind === 'plant' && !o.isDead && o.stage >= 1 && groundDist(o, this.x, this.z) < 160).length;
      const wet = environment.effects.some((e) => e.type === 'water' && e.contains(this.x, this.z, 10));
      const heal = saplings * 8 + (wet ? 10 : 0); if (heal) { this.hp = Math.min(this.maxHp, this.hp + heal); combat.spawnDamageText?.(this.x, this.y - 130, `+${heal}`, { color: '#9be36a' }); }
    }
    if ((this.specialT -= dt) > 0) return;
    const P = gw.player; this.specialT = this.phase === 2 ? 2.4 : 3.6;
    const roll = Math.random();
    if (P && groundDist(P, this.x, this.z) < 110) {
      // Root ring: roots burst out all around.
      combat.spawnShockwave(this.x, this.y - 6, 110, '#558b2f'); combat.shakeCamera(5, .2);
      for (const a of actorsOf(gw)) if (a.team !== 'red' && groundDist(a, this.x, this.z) < 110) { a.takeDamage(14, Math.sign(a.x - this.x || 1) * 220, 120, .4, false, 'spell'); a.slow?.(1.5, .4); }
    } else if (roll < .65 && P) environment.addSceneFx(new ThornLine(this, P));
    else {
      // Grows helpers: saplings (heal it) — in the second phase mushrooms as well.
      const L = gw.modeState?.secret ? secretBounds(gw.modeState.secret.id).left : this.x - 400;
      environment.addProp('sapling', Math.max(L + 60, this.x - 90), Math.min(.9, this.z + .2));
      if (this.phase === 2) environment.addProp('mushrooms', Math.max(L + 60, this.x - 160), Math.max(.1, this.z - .25));
      combat.spawnDamageText?.(this.x, this.y - 140, 'WURZELN!', { color: '#9be36a' });
    }
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const f = this.facing || -1; const sway = Math.round(Math.sin(this.animTime * 2) * 2); const flash = this.hitFlash > 0;
    const bark = flash ? '#ffffff' : '#5d4037'; const dark = flash ? '#eeeeee' : '#3e2723';
    ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y, 40, 10, 0, 0, TAU); ctx.fill(); ctx.restore();
    // Root legs, trunk body, branch arms.
    for (const s of [-1, 1]) { px(ctx, x + s * 10 - 5, y - 22, 10, 22, dark); px(ctx, x + s * 18 - 6, y - 6, 14, 6, dark); }
    px(ctx, x - 20, y - 92, 40, 72, dark); px(ctx, x - 17, y - 90, 34, 68, bark); for (let yy = y - 86; yy < y - 24; yy += 10) px(ctx, x - 12, yy, 24, 2, dark);
    const reach = this.state === 'attack' || this.attackTimer > this.attackCooldown - .3 ? 18 : 0;
    for (const s of [-1, 1]) { const ax = x + s * 20; px(ctx, ax + (s > 0 ? 0 : -26) + (s === f ? f * reach : 0), y - 80 + sway, 26, 7, dark); px(ctx, ax + s * 24 + (s === f ? f * reach : 0) - 2, y - 92 + sway, 5, 14, dark); }
    // Glowing eyes and the leaf crown.
    px(ctx, x - 9 + f * 3, y - 74, 5, 4, '#dce775'); px(ctx, x + 4 + f * 3, y - 74, 5, 4, '#dce775');
    blob(ctx, x - 18 + sway, y - 104, 20, this.phase === 2 ? '#827717' : '#2e6b22'); blob(ctx, x + 18 + sway, y - 102, 20, this.phase === 2 ? '#827717' : '#2e6b22'); blob(ctx, x + sway, y - 118, 24, this.phase === 2 ? '#9e9d24' : '#4c9a35');
    for (let i = 0; i < 5; i++) px(ctx, x - 24 + i * 12 + sway, y - 128 + (i % 2) * 6, 3, 6, '#dce775');
    // Boss bar.
    const w = 70; px(ctx, x - w / 2 - 1, y - 150, w + 2, 6, '#000000'); px(ctx, x - w / 2, y - 149, Math.round(w * this.hp / this.maxHp), 4, '#9be36a');
    ctx.save(); ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#dce775'; ctx.fillText(this.name, x, y - 154); ctx.restore();
  }
}
