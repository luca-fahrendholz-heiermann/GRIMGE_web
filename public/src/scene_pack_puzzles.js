// GRIMGE Prototype — traversal and puzzle pieces (user, 23 Oct 2026: secrets in dungeons that
// "nur erreichbar sind wenn man den passenden Spell hat" — jump-and-run to other levels).
// Elements are the keys; signals (scene_objects.js) wire levers / plates / gongs / pylons to gates.
//   ledge            a fixed high rock ledge (standable top) — the goal of a climb
//   liana            hangs from above; nature / water grow it; touching it in the air swings you on (boost)
//   geyser           fire + water build steam pressure; at full it erupts and throws up whoever stands on it
//   waterfall        frost freezes it into an ice wall with three steps (fire melts it back)
//   web / curtain    a barrier across the whole lane; fire burns it (a curtain grows back with nature)
//   ice_lever        a lever frozen in ice — fire frees it
//   lever            a hit flips its signal
//   pressure_plate   pressed while anyone (or something heavy: boulder, keg, icicle) stands on it
//   gate             opens while its signal is on (latch: stays open)
//   portcullis       a hit (or its signal) opens it for 3 s, then it slams down
//   cracked_floor    a fast landing (dive) breaks through — a way down (link) or a crater
//   cracked_wall     only heavy blows break it (axes / hammers ×3)
//   rope_bridge      a high bridge; cut the rope (blade / shot) and it drops into a ramp
//   raft             a floating platform; wind or blows push it — it carries you over lava / water
//   magnet           lightning charges it: it pulls foes and metal objects (kegs, chests) in
//   ghost_platform   solid only in light (a lit lantern / brazier close by, or light on it)
//   basin            a water tank: water raises, fire lowers the level — its float platform rides on it
//   dust             wind blows it away and reveals an inscription or a hatch (link)
//   climb_wall       a rock face; spear hits (spear / glaive, Bankai spear crown) leave steps in it
import { SceneObject, registerSceneKind, SCENE_KINDS, actorsOf, groundDist, px, blob, flames, makeSurface, moveSurface, setSignal, signalOn, sceneSpells, DEPTH, TAU } from './scene_objects.js';
import { Fixture, burnTick, launchActor, lightAt, LOCK_COLORS } from './scene_pack_elements.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { getStatusSource } from './status_effects.js';

const isHero = (a, gw) => a === gw?.player || !!a.heroKey;
// Secret links (dungeon_secrets.js sets enterLink): a hatch / floor / portal leads somewhere else.
export const puzzleHooks = { enterLink: null, revealText: null };
const heavyWeapon = (w) => /axe|hammer/.test(w ?? '');
const spearWeapon = (w) => /spear|glaive/.test(w ?? '');

class Ledge extends Fixture {
  constructor(x, z, o = {}) { super('ledge', x, z, { half: o.w ?? 60, tol: 10, blocks: false }); this.h = o.h ?? 180; this.w = o.w ?? 60; this.surfaces = [makeSurface('Ledge', x, z, this.w, o.d ?? .08, () => this.h)]; }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const top = y - this.h; const w = this.w;
    px(ctx, x - w, top, w * 2, this.h, '#4e443a');
    for (let yy = top + 10; yy < y; yy += 16) px(ctx, x - w + 4, yy, w * 2 - 8, 2, '#3a322a');
    px(ctx, x - w, top - 4, w * 2, 6, '#8f8371'); px(ctx, x - w + 4, top - 6, w * 2 - 8, 2, '#5f9e3c');
  }
}
class Liana extends SceneObject {
  constructor(x, z, o = {}) { super('liana', x, z, { hp: 60, half: 10, tol: 400, blocks: false, barColor: '#7cb342' }); this.top = o.top ?? 220; this.growth = o.grown ? 40 : 6; this.cool = new Map(); }
  get len() { return (this.top - 40) * Math.min(1, this.growth / 40); }
  elementDamage(el) { return el === 'aqua' || el === 'natura' ? 0 : el === 'ignis' ? 2 : 1; }
  react(el, amount) { if ((el === 'aqua' || el === 'natura') && this.burning <= 0) this.growth = Math.min(40, this.growth + amount * (el === 'natura' ? 1.4 : 1)); if (el === 'ignis' && (this.exposure.ignis ?? 0) >= 5) this.burning = 3; }
  update(dt, gw) {
    burnTick(this, dt, 14);
    if (this.growth < 40) return;
    // Touch it in the air: swing on — a boost forward and up.
    for (const a of [gw?.player, gw?.enemyChampion]) {
      if (!a || a.grounded || (this.cool.get(a) ?? 0) > this.age || Math.abs(a.x - this.x) > 16 || Math.abs(((a.z ?? this.z) - this.z) * DEPTH) > 20) continue;
      const hgt = (a.elevation ?? 0) + (a.surfaceHeight ?? 0); if (hgt < this.top - this.len || hgt > this.top) continue;
      this.cool.set(a, this.age + 1); this.swing = .5; a.vElevation = Math.max(a.vElevation ?? 0, 470); a.vx = (a.facing || 1) * 320; if ('kbVelX' in a) a.kbVelX = (a.facing || 1) * 260;
      combat.spawnDamageText?.(a.x, (a.y ?? this.y) - 90, 'SCHWUNG', { color: '#9be36a' });
    }
    this.swing = Math.max(0, (this.swing ?? 0) - dt);
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const top = y - this.top; const sw = this.swing > 0 ? Math.sin(this.age * 12) * 8 : Math.sin(this.age) * 2;
    px(ctx, x - 20, top - 6, 40, 6, '#4e342e');
    for (let i = 0; i < this.len; i += 6) { const k = i / Math.max(1, this.len); px(ctx, Math.round(x + sw * k) - 1, top + i, 3, 6, this.burning > 0 ? '#6d4c2a' : '#33691e'); if (i % 18 === 0) px(ctx, Math.round(x + sw * k) + 2, top + i + 2, 4, 2, '#7cb342'); }
    if (this.burning > 0) flames(ctx, x, top + this.len, 12, this.age, 1);
    this.renderBars(ctx, top - 14, this.growth < 40 ? this.growth / 40 : null);
  }
}
class Geyser extends Fixture {
  constructor(x, z, o = {}) { super('geyser', x, z, { half: 20, tol: 40, blocks: false }); this.pressure = 0; this.erupt = 0; this.key = o.key ?? null; this.height = o.h ?? 230; }
  react(el, amount) {
    const both = (this.exposure.aqua ?? 0) > 0 && (this.exposure.ignis ?? 0) > 0;
    if ((el === 'aqua' || el === 'ignis') && both && this.erupt <= 0) this.pressure = Math.min(100, this.pressure + amount * .9);
  }
  update(dt, gw) {
    if (this.pressure >= 100 && this.erupt <= 0) { this.pressure = 0; this.erupt = 1.6; if (this.key) setSignal(this.key, true, 4); combat.spawnShockwave(this.x, this.y - 10, 40, '#e0f7fa'); audio.playImpact?.(true); }
    if (this.erupt > 0) {
      this.erupt -= dt;
      for (const a of actorsOf(gw)) {
        if (Math.abs(a.x - this.x) > 22 || Math.abs(((a.z ?? this.z) - this.z) * DEPTH) > 18 || (a.elevation ?? 0) + (a.surfaceHeight ?? 0) > 40) continue;
        if (isHero(a, gw)) launchActor(a, gw, this.height); else if ((a._geyserT ?? 0) < this.age) { a._geyserT = this.age + .8; a.takeDamage(8, 0, 600, .4, false, 'spell'); }
      }
    } else this.pressure = Math.max(0, this.pressure - dt * 2);
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y);
    px(ctx, x - 20, y - 4, 40, 6, '#5d4037'); blob(ctx, x, y - 2, 10, '#263238', .4);
    if (this.erupt > 0) { for (let i = 0; i < this.height; i += 6) { const w = 6 + Math.round(Math.sin(i * .2 + this.age * 20) * 3); px(ctx, x - w, y - i - 6, w * 2, 6, i % 12 ? '#e0f7fa' : '#ffffff'); } }
    else if (this.pressure > 0) for (let i = 0; i < 3; i++) { const ph = (this.age * 1.5 + i / 3) % 1; ctx.save(); ctx.globalAlpha = (1 - ph) * .6; blob(ctx, x + (i - 1) * 6, y - 8 - ph * 30, 4, '#eceff1', .8); ctx.restore(); }
    px(ctx, x - 13, y - 14, 26, 3, '#000000'); px(ctx, x - 12, y - 13, Math.round(24 * this.pressure / 100), 1, '#4fc3f7');
  }
}
class Waterfall extends Fixture {
  constructor(x, z, o = {}) {
    super('waterfall', x, z, { half: 24, tol: 300, blocks: false }); this.frozen = 0; this.top = o.h ?? 230;
    this.surfaces = [[0, 55], [26, 110], [0, 165]].map(([dx, h]) => makeSurface('Ice step', x + dx, z, 18, .07, () => (this.iced > 0 ? h : 0)));
    this.iced = 0;
  }
  react(el) { if (el === 'frost' && (this.exposure.frost ?? 0) >= 15) { this.iced = 25; this.exposure.frost = 0; } if (el === 'ignis' && this.iced > 0) this.iced = 0; }
  update(dt) { this.iced = Math.max(0, this.iced - dt); }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const top = y - this.top;
    if (this.iced > 0) { px(ctx, x - 22, top, 44, this.top, '#81d4fa'); for (let yy = top; yy < y; yy += 9) px(ctx, x - 20 + (yy % 18 ? 4 : 0), yy, 36, 3, '#e1f5fe'); for (const s of this.surfaces) { const h = s.heightAt(); px(ctx, s.xMin, y - h - 2, s.xMax - s.xMin, 5, '#ffffff'); } }
    else { px(ctx, x - 22, top, 44, this.top, '#1e88e5'); for (let i = 0; i < 12; i++) { const yy = top + ((this.age * 220 + i * 37) % this.top); px(ctx, x - 18 + (i * 7) % 36, yy, 2, 10, '#bbdefb'); } blob(ctx, x, y, 26, '#64b5f6', .3); }
  }
}
// A barrier across the whole lane: it follows the depth of the Wizard so every swing reaches it.
class Barrier extends SceneObject {
  constructor(kind, x, z, o = {}) { super(kind, x, z, { hp: kind === 'curtain' ? 140 : kind === 'cracked_wall' ? 160 : 50, half: 12, tol: 300, blocks: true, barColor: kind === 'cracked_wall' ? '#bcaaa4' : '#c5e1a5' }); this.halfZ = .5; this.onOpen = o.onOpen ?? null; this.link = o.link ?? null; }
  update(dt, gw) { const p = gw?.player; if (p) this.z = Math.max(.08, Math.min(.92, p.z)); this.tick2?.(dt, gw); }
  onBreak(gw, env) { combat.spawnDust(this.x, this.y, 12); this.onOpen?.(gw, this); if (this.link) puzzleHooks.enterLink?.(this.link, this, gw, 'reveal'); }
  drawBand(ctx, fn) { const yTop = groundYForDepth(.06); const yBot = groundYForDepth(.94); fn(Math.round(this.x), Math.round(yTop), Math.round(yBot)); }
}
class Web extends Barrier {
  constructor(x, z, o) { super('web', x, z, o); }
  elementDamage(el) { return el === 'ignis' ? 4 : 1; }
  react(el) { if (el === 'ignis' && this.burning <= 0) this.burning = 1.5; }
  tick2(dt) { burnTick(this, dt, 40); }
  render(ctx) { this.drawBand(ctx, (x, t, b) => { for (let yy = t - 40; yy < b; yy += 10) px(ctx, x - 12 + ((yy / 10) % 2 ? 4 : 0), yy, 20, 1, this.burning > 0 ? '#ff9800' : '#eeeeee'); for (let i = -12; i <= 12; i += 8) px(ctx, x + i, t - 40, 1, b - t + 40, '#e0e0e0'); if (this.burning > 0) flames(ctx, x, b - 20, 24, this.age, 3); this.renderBars(ctx, t - 52); }); }
}
class Curtain extends Barrier {
  constructor(x, z, o) { super('curtain', x, z, o); }
  elementDamage(el) { return el === 'ignis' ? 4 : el === 'natura' || el === 'aqua' ? 0 : .5; }
  react(el, amount) { if (el === 'ignis' && this.burning <= 0) this.burning = 3; if (el === 'natura') this.hp = Math.min(this.maxHp, this.hp + amount); }
  tick2(dt) { burnTick(this, dt, 30); }
  render(ctx) { this.drawBand(ctx, (x, t, b) => { for (let i = -12; i <= 12; i += 4) for (let yy = t - 46; yy < b; yy += 6) px(ctx, x + i + Math.round(Math.sin(yy * .1 + i) * 2), yy, 3, 6, (yy + i) % 12 ? '#33691e' : '#558b2f'); if (this.burning > 0) flames(ctx, x, b - 20, 24, this.age, 3); this.renderBars(ctx, t - 58); }); }
}
class CrackedWall extends Barrier {
  constructor(x, z, o) { super('cracked_wall', x, z, o); }
  takeDamage(amount, kx = 0, lift, stun, crit, hitKind) {
    const w = getStatusSource()?.castBy?.weapon ?? getStatusSource()?.castBy?.classWeapon; const heavy = Math.abs(kx) >= 300;
    return super.takeDamage(amount * (heavy ? (heavyWeapon(w) ? 3 : 1) : heavyWeapon(w) ? 1 : .1), kx, lift, stun, crit, hitKind);
  }
  render(ctx) { this.drawBand(ctx, (x, t, b) => { for (let yy = t - 50; yy < b; yy += 12) for (let i = -14; i < 14; i += 14) px(ctx, x + i + ((yy / 12) % 2 ? 7 : 0) - 7, yy, 13, 11, (yy + i) % 24 ? '#6d6253' : '#5d5245'); const cr = Math.round((1 - this.hp / this.maxHp) * 6); for (let i = 0; i < 2 + cr; i++) px(ctx, x - 6 + (i * 7) % 14, t - 40 + i * 30, 2, 22, '#2f2a24'); this.renderBars(ctx, t - 62); }); }
}
class Lever extends Fixture {
  constructor(x, z, o = {}) { super('lever', x, z, { half: 10, tol: 80, blocks: false }); this.key = o.key ?? 'lever'; this.on = !!o.on; this.cd = 0; if (this.on) setSignal(this.key, true); }
  onHit() { if (this.cd > 0) return; this.cd = .5; this.on = !this.on; setSignal(this.key, this.on); audio.playImpact?.(false); }
  update(dt) { this.cd = Math.max(0, this.cd - dt); if (this.on && !signalOn(this.key)) setSignal(this.key, true); }
  render(ctx) { const x = Math.round(this.x); const y = Math.round(this.y); px(ctx, x - 10, y - 8, 20, 8, '#616161'); const a = this.on ? .7 : -.7; for (let i = 0; i < 22; i += 2) px(ctx, x + Math.sin(a) * i - 1, y - 8 - Math.cos(a) * i, 3, 2, '#8d6e63'); blob(ctx, x + Math.sin(a) * 22, y - 8 - Math.cos(a) * 22, 4, this.on ? '#66bb6a' : '#ef5350', 1); }
}
class IceLever extends Fixture {
  constructor(x, z, o = {}) { super('ice_lever', x, z, { half: 14, tol: 80, blocks: true }); this.o = o; }
  react(el) { if (el === 'ignis' && (this.exposure.ignis ?? 0) >= 12 && !this.freed) this.freed = true; }
  update(dt, gw, env) { if (this.freed && !this.isDead) { this.isDead = true; env.add('water', this.x, this.z, { radius: 28 }); env.props.push(new Lever(this.x, this.z, this.o)); } }
  takeDamage(amount, kx, lift, stun, crit, hitKind) { const out = super.takeDamage(amount, kx, lift, stun, crit, hitKind); if (this.freed) this.isDead = true; return out; }
  render(ctx) { const x = Math.round(this.x); const y = Math.round(this.y); px(ctx, x - 10, y - 8, 20, 8, '#616161'); px(ctx, x - 1, y - 28, 3, 20, '#8d6e63'); ctx.save(); ctx.globalAlpha = .8; px(ctx, x - 14, y - 36, 28, 36, '#b3e5fc'); ctx.restore(); px(ctx, x - 10, y - 32, 3, 20, '#ffffff'); }
}
class PressurePlate extends Fixture {
  constructor(x, z, o = {}) { super('pressure_plate', x, z, { half: 20, tol: 10, blocks: false }); this.key = o.key ?? 'plate'; this.pressed = false; }
  update(dt, gw, env) {
    const on = (o) => Math.abs(o.x - this.x) < this.halfX && Math.abs(((o.z ?? this.z) - this.z) * DEPTH) < 14;
    this.pressed = actorsOf(gw).some((a) => on(a) && (a.elevation ?? 0) + (a.surfaceHeight ?? 0) < 8) || env.props.some((o) => o !== this && o.heavy && !o.isDead && !o.flight && !o.carriedBy && on(o));
    setSignal(this.key, this.pressed);
  }
  render(ctx) { const x = Math.round(this.x); const y = Math.round(this.y); const d = this.pressed ? 1 : 3; px(ctx, x - 20, y - 2, 40, 3, '#424242'); px(ctx, x - 17, y - 2 - d, 34, d, this.pressed ? '#66bb6a' : '#9e9e9e'); }
}
class Gate extends Barrier {
  constructor(x, z, o = {}) { super('gate', x, z, o); this.key = o.key ?? 'gate'; this.latch = !!o.latch; this.openK = 0; this.indestructible = true; }
  takeDamage() { return { ignored: true }; }
  tick2(dt) { const open = this.latched || signalOn(this.key); if (open && this.latch) this.latched = true; this.openK = Math.max(0, Math.min(1, this.openK + (open ? dt * 2 : -dt * 3))); this.noBlock = this.openK > .7; }
  renderBars() {}
  render(ctx) { this.drawBand(ctx, (x, t, b) => { const lift = Math.round(this.openK * 60); for (let i = -10; i <= 10; i += 5) px(ctx, x + i, t - 46 - lift, 2, b - t + 46, '#455a64'); for (let yy = t - 46 - lift; yy < b - lift; yy += 18) px(ctx, x - 12, yy, 25, 2, '#37474f'); px(ctx, x - 14, t - 52, 29, 6, '#263238'); }); }
}
class Portcullis extends Gate {
  constructor(x, z, o = {}) { super(x, z, { ...o, key: o.key ?? null }); this.kind = 'portcullis'; this.openT = 0; }
  takeDamage() { if (this.openT <= 0) this.openT = 3; return {}; }
  tick2(dt, gw) {
    const sig = this.key && signalOn(this.key); if (sig && this.openT <= 0) this.openT = 3;
    const was = this.openT > 0; this.openT = Math.max(0, this.openT - dt); this.openK = Math.max(0, Math.min(1, this.openK + (this.openT > 0 ? dt * 3 : -dt * 8))); this.noBlock = this.openK > .5;
    if (was && this.openT <= 0) { combat.shakeCamera(5, .15); for (const a of actorsOf(gw)) if (Math.abs(a.x - this.x) < 18) a.takeDamage(30, Math.sign(a.x - this.x || 1) * 260, 80, .5, false, 'spell'); }
  }
}
class CrackedFloor extends Fixture {
  constructor(x, z, o = {}) { super('cracked_floor', x, z, { half: 30, tol: 10, blocks: false }); this.link = o.link ?? null; this.lastVE = 0; this.broken = false; }
  update(dt, gw, env) {
    const p = gw?.player; if (!p || this.broken) return;
    const inside = Math.abs(p.x - this.x) < this.halfX && Math.abs(((p.z ?? this.z) - this.z) * DEPTH) < 18;
    if (p.grounded && this.lastVE < -420 && inside) {
      this.broken = true; combat.shakeCamera(6, .2); combat.spawnDust(this.x, this.y, 14); audio.playImpact?.(true);
      if (this.link) puzzleHooks.enterLink?.(this.link, this, gw, 'fall'); else env.add('crater', this.x, this.z, { radius: 40 });
    }
    this.lastVE = p.grounded ? 0 : p.vElevation ?? 0;
  }
  render(ctx) { const x = Math.round(this.x); const y = Math.round(this.y); if (this.broken) { blob(ctx, x, y, 30, '#0d0a08', .3); return; } px(ctx, x - 30, y - 2, 60, 4, '#6d6253'); for (let i = 0; i < 5; i++) px(ctx, x - 24 + i * 12, y - 3 + (i % 2) * 2, 8, 1, '#2f2a24'); }
}
class RopeBridge extends SceneObject {
  constructor(x, z, o = {}) {
    super('rope_bridge', x, z, { hp: 30, half: 10, tol: 300, blocks: false, barColor: '#d7ccc8' });
    this.len = o.len ?? 160; this.h = o.h ?? 120; this.cut = false; this.dir = o.dir ?? 1;
    this.deck = makeSurface('Rope bridge', x + this.dir * this.len / 2, z, this.len / 2, .07, () => (this.cut ? 0 : this.h));
    this.steps = [1, 2, 3, 4].map((i) => makeSurface('Fallen bridge', x + this.dir * (this.len - i * this.len / 4 + this.len / 8), z, this.len / 8, .07, () => (this.cut ? this.h * i / 4 : 0)));
    this.surfaces = [this.deck, ...this.steps];
  }
  takeDamage(amount, kx, lift, stun, crit, hitKind) {
    // The rope post: a blade or a shot cuts it.
    const els = getStatusSource()?.statusElements ?? []; if (this.cut || !(hitKind === 'spell' || els.includes('blade'))) return { ignored: true };
    this.cut = true; this.fall = .5; combat.spawnDamageText?.(this.x, this.y - this.h - 20, 'SEIL GEKAPPT', { color: '#d7ccc8' }); return {};
  }
  update(dt, gw) {
    if (this.fall > 0) { this.fall -= dt; if (this.fall <= 0) { combat.shakeCamera(6, .2); for (const a of actorsOf(gw)) { const dx = (a.x - this.x) * this.dir; if (dx > 0 && dx < this.len && Math.abs(((a.z ?? this.z) - this.z) * DEPTH) < 20 && !isHero(a, gw)) a.takeDamage(20, 0, 60, .4, false, 'spell'); } } }
  }
  renderBars() {}
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const d = this.dir;
    px(ctx, x - 3, y - this.h - 30, 6, this.h + 30, '#5d4037'); px(ctx, x + d * this.len - 3, y - this.h - 30, 6, this.h + 30, '#5d4037');
    if (!this.cut) { for (let i = 0; i < this.len; i += 8) px(ctx, x + d * i - (d < 0 ? 6 : 0), y - this.h - 2 + Math.round(Math.sin(i / this.len * Math.PI) * 6), 6, 4, '#8d6e63'); px(ctx, Math.min(x, x + d * this.len), y - this.h - 24, this.len, 1, '#d7ccc8'); }
    else for (const s of this.steps) { const h = s.heightAt(); px(ctx, s.xMin, y - h - 2, s.xMax - s.xMin, 4, '#8d6e63'); }
  }
}
class Raft extends SceneObject {
  constructor(x, z) { super('raft', x, z, { hp: 120, half: 30, tol: 40, blocks: false, barColor: '#a1887f' }); this.vx = 0; this.surfaces = [makeSurface('Raft', x, z, 30, .07, () => (this.isDead ? 0 : 16))]; }
  onHit(amount, kx, els) { if (els.has('ventus') || Math.abs(kx) >= 200) this.vx = Math.sign(kx || this.lastHitDir) * 130; }
  react(el, amount) { if (el === 'ventus' && amount > 2) this.vx = this.lastHitDir * 130; }
  update(dt, gw) {
    if (Math.abs(this.vx) < 1) return;
    const b = gw?.battlefield?.boundsOverride ?? gw?.battlefield?.playableBounds ?? { left: 30, right: 994 };
    const dx = this.vx * dt; const nx = Math.max((b.left ?? 30) + 30, Math.min((b.right ?? 994) - 30, this.x + dx)); const moved = nx - this.x; this.x = nx;
    this.vx -= Math.sign(this.vx) * 60 * dt; if (Math.abs(this.vx) < 10 || !moved) this.vx = 0;
    moveSurface(this.surfaces[0], this.x, this.z, 30, .07);
    for (const a of actorsOf(gw)) if (a.surfaceId === this.surfaces[0].id) a.x += moved;
  }
  onBreak(gw) { this.dropSurfaces(gw); }
  render(ctx) { const x = Math.round(this.x); const y = Math.round(this.y); for (let i = -30; i < 30; i += 8) px(ctx, x + i, y - 18, 7, 6, (i / 8) % 2 ? '#8d6e63' : '#6d4c41'); px(ctx, x - 30, y - 14, 60, 2, '#4e342e'); this.renderBars(ctx, y - 30); }
}
class Magnet extends Fixture {
  constructor(x, z) { super('magnet', x, z, { half: 14, tol: 100, blocks: true }); this.charge = 0; }
  react(el) { if (el === 'fulgur') this.charge = 4; }
  update(dt, gw, env) {
    if (this.charge <= 0) return; this.charge -= dt;
    for (const a of actorsOf(gw)) { if (isHero(a, gw) || a.team === this.lastSourceTeam) continue; const d = groundDist(a, this.x, this.z); if (d > 170 || d < 20) continue; if ('kbVelX' in a) a.kbVelX = -Math.sign(a.x - this.x) * 160; a.z += ((this.z - a.z) * dt * 2); }
    for (const o of env.props) if (o.metal && !o.isDead && o !== this && groundDist(o, this.x, this.z) < 200 && groundDist(o, this.x, this.z) > 30) { o.x -= Math.sign(o.x - this.x) * 80 * dt; }
  }
  render(ctx) { const x = Math.round(this.x); const y = Math.round(this.y); px(ctx, x - 14, y - 40, 10, 40, '#c62828'); px(ctx, x + 4, y - 40, 10, 40, '#1565c0'); px(ctx, x - 14, y - 44, 28, 8, '#9e9e9e'); if (this.charge > 0) for (let i = 0; i < 6; i++) { const a = this.age * 6 + i; px(ctx, x + Math.cos(a) * 24, y - 24 + Math.sin(a) * 10, 2, 2, '#ffee58'); } }
}
class GhostPlatform extends Fixture {
  constructor(x, z, o = {}) { super('ghost_platform', x, z, { half: o.w ?? 30, tol: 10, blocks: false }); this.h = o.h ?? 110; this.w = o.w ?? 30; this.solid = false; this.surfaces = [makeSurface('Ghost platform', x, z, this.w, .07, () => (this.solid ? this.h : 0))]; }
  update(dt, gw, env) { this.solid = lightAt(env, this.x, this.z, 30) || (this.exposure.lux ?? 0) > 0; }
  render(ctx) { const x = Math.round(this.x); const y = Math.round(this.y) - this.h; ctx.save(); ctx.globalAlpha = this.solid ? 1 : .22; px(ctx, x - this.w, y - 4, this.w * 2, 6, '#b39ddb'); px(ctx, x - this.w + 3, y - 6, this.w * 2 - 6, 2, '#ede7f6'); ctx.restore(); }
}
class Basin extends Fixture {
  constructor(x, z, o = {}) { super('basin', x, z, { half: 34, tol: 200, blocks: false }); this.level = o.level ?? .1; this.span = o.h ?? 150; this.surfaces = [makeSurface('Float', x, z, 28, .07, () => 18 + this.level * this.span)]; }
  react(el, amount) { if (el === 'aqua') this.level = Math.min(1, this.level + amount / 80); if (el === 'ignis') this.level = Math.max(0, this.level - amount / 60); }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const top = y - this.span - 30; const wl = Math.round(y - 12 - this.level * this.span);
    px(ctx, x - 36, top, 4, y - top, '#78909c'); px(ctx, x + 32, top, 4, y - top, '#78909c'); px(ctx, x - 36, y - 4, 72, 4, '#78909c');
    ctx.save(); ctx.globalAlpha = .7; px(ctx, x - 32, wl, 64, y - 4 - wl, '#1e88e5'); ctx.restore(); px(ctx, x - 32, wl, 64, 2, '#bbdefb');
    const fh = Math.round(18 + this.level * this.span); px(ctx, x - 28, y - fh - 4, 56, 6, '#8d6e63');
  }
}
class DustPile extends Fixture {
  constructor(x, z, o = {}) { super('dust', x, z, { half: 26, tol: 20, blocks: false }); this.text = o.text ?? null; this.link = o.link ?? null; this.revealed = false; }
  react(el) { if (el === 'ventus' && (this.exposure.ventus ?? 0) >= 8 && !this.revealed) this.reveal = true; }
  update(dt, gw) {
    if (!this.reveal) return; this.reveal = false; this.revealed = true; combat.spawnDust(this.x, this.y, 16);
    if (this.text) { puzzleHooks.revealText?.(this.text, this, gw); gw?.showAnnouncement?.(this.text, 3); }
    if (this.link) puzzleHooks.enterLink?.(this.link, this, gw, 'reveal');
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y);
    if (!this.revealed) { blob(ctx, x, y - 4, 26, '#a1887f', .35); blob(ctx, x - 6, y - 7, 14, '#bcaaa4', .35); return; }
    if (this.link) { px(ctx, x - 16, y - 4, 32, 6, '#4e342e'); px(ctx, x - 14, y - 3, 28, 4, '#2e1d14'); px(ctx, x - 2, y - 3, 4, 4, '#ffd54f'); }
    else for (let i = 0; i < 5; i++) px(ctx, x - 20 + i * 9, y - 3, 6, 3, '#ffe082');
  }
}
class ClimbWall extends Fixture {
  constructor(x, z, o = {}) { super('climb_wall', x, z, { half: 20, tol: 300, blocks: false }); this.top = o.h ?? 220; this.face = o.face ?? -1; this.steps = []; this.used = new Set(); }
  addStep() {
    const n = this.steps.length; if (n >= 4) return;
    const h = [50, 95, 140, 185][n]; const dx = this.face * (24 + (n % 2) * 18);
    const s = makeSurface('Spear step', this.x + dx, this.z, 12, .06, () => h); s.until = this.age + 30; this.steps.push(s); this.surfaces.push(s);
    combat.spawnHitSparks(this.x + dx, this.y - h, 1, '#d7ccc8', 6);
  }
  onHit() { const by = getStatusSource()?.castBy; if (spearWeapon(by?.weapon ?? by?.classWeapon)) this.addStep(); }
  update(dt, gw) {
    for (const sp of sceneSpells()) if (sp?.spearTag && !this.used.has(sp) && Math.abs(sp.x - this.x) < 26 && Math.abs(((sp.z ?? this.z) - this.z) * DEPTH) < 30) { this.used.add(sp); sp.isFinished = true; this.addStep(); }
    const before = this.surfaces.length; this.surfaces = this.surfaces.filter((s) => (s.until ?? Infinity) > this.age); this.steps = this.steps.filter((s) => this.surfaces.includes(s));
    if (this.surfaces.length !== before) { const bf = gw?.battlefield; if (bf?.dynamicSurfaces) bf.dynamicSurfaces = bf.dynamicSurfaces.filter((s) => !(s.label === 'Spear step' && (s.until ?? Infinity) <= this.age)); }
  }
  render(ctx) {
    const x = Math.round(this.x); const y = Math.round(this.y); const top = y - this.top;
    px(ctx, x - 20, top, 40, this.top, '#5d5245'); for (let yy = top + 6; yy < y; yy += 14) px(ctx, x - 18 + (yy % 28 ? 6 : 0), yy, 28, 2, '#463d33');
    for (const s of this.steps) { const h = s.heightAt(); const sx = (s.xMin + s.xMax) / 2; px(ctx, Math.min(x, sx) , y - h - 1, Math.abs(sx - x) + 12, 3, '#8d6e63'); px(ctx, sx + this.face * 10, y - h - 3, 4, 6, '#cfd8dc'); }
  }
}

registerSceneKind('ledge', (x, z, o) => new Ledge(x, z, o));
registerSceneKind('liana', (x, z, o) => new Liana(x, z, o));
registerSceneKind('geyser', (x, z, o) => new Geyser(x, z, o));
registerSceneKind('waterfall', (x, z, o) => new Waterfall(x, z, o));
registerSceneKind('web', (x, z, o) => new Web(x, z, o));
registerSceneKind('curtain', (x, z, o) => new Curtain(x, z, o));
registerSceneKind('cracked_wall', (x, z, o) => new CrackedWall(x, z, o));
registerSceneKind('lever', (x, z, o) => new Lever(x, z, o));
registerSceneKind('ice_lever', (x, z, o) => new IceLever(x, z, o));
registerSceneKind('pressure_plate', (x, z, o) => new PressurePlate(x, z, o));
registerSceneKind('gate', (x, z, o) => new Gate(x, z, o));
registerSceneKind('portcullis', (x, z, o) => new Portcullis(x, z, o));
registerSceneKind('cracked_floor', (x, z, o) => new CrackedFloor(x, z, o));
registerSceneKind('rope_bridge', (x, z, o) => new RopeBridge(x, z, o));
registerSceneKind('raft', (x, z) => new Raft(x, z));
registerSceneKind('magnet', (x, z) => new Magnet(x, z));
registerSceneKind('ghost_platform', (x, z, o) => new GhostPlatform(x, z, o));
registerSceneKind('basin', (x, z, o) => new Basin(x, z, o));
registerSceneKind('dust', (x, z, o) => new DustPile(x, z, o));
registerSceneKind('climb_wall', (x, z, o) => new ClimbWall(x, z, o));
export const PUZZLE_KINDS = Object.freeze(['ledge', 'liana', 'geyser', 'waterfall', 'web', 'curtain', 'cracked_wall', 'lever', 'ice_lever', 'pressure_plate', 'gate', 'portcullis', 'cracked_floor', 'rope_bridge', 'raft', 'magnet', 'ghost_platform', 'basin', 'dust', 'climb_wall']);
void SCENE_KINDS; void TAU; void LOCK_COLORS;
