// GRIMGE Prototype — weapon sprint attacks (user, 20 Oct 2026: "Waffen haben noch keine
// unique Sprint-Attacke … Breitschwert: mächtiger Hieb mit riesiger Sichel, die den Impuls
// zeigt; zwei Dolche: dreht sich wie ein Wirbel; Fäuste: der Punch zieht den Gegner ein
// Stück mit, dann kommt der Impuls, der Gegner fliegt, der Spieler bleibt stehen — man
// merkt, die ganze Laufenergie steckt drin").
// Sprint + attack with a class weapon is the weapon's own move. Each one is a variant for
// Player.startSprintAttack (wind-up / active / recovery / lunge / reach …) plus a kind
// with its own behaviour and look:
//   crescent  a mighty slash that throws a giant crescent wave down the lane
//   whirl     the Wizard spins like a vortex through the foes (several hits)
//   drive     the punch carries the foe along, then all the run-up energy explodes into it
//   iai       a draw-cut dash THROUGH the foes; the cut lands a moment later
//   lance     a far-reaching piercing lunge
//   bash      a shield ram that shoves everything in front along
//   reap      the blade sweeps wide and drags the foes in
//   volley    sliding shot: a fan of the weapon's projectiles
//   wave      the focus releases a travelling force wave (sound, wind, seal, arcane)
//   pounce    a leaping strike from above
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { WEAPONS, astralHue, makeWeaponShots } from './weapons.js';

const TAU = Math.PI * 2;
const DEPTH = 150;
const S = (name, kind, extra = {}) => Object.freeze({ name, kind, ...extra });
export const WEAPON_SPRINTS = Object.freeze({
  sword_shield: S('SCHILDRAMME', 'bash'), mace_shield: S('BOLLWERKSTOSS', 'bash', { recoilMult: 1.6 }), scepter_shield: S('LICHTRAMME', 'bash'),
  great_axe: S('AXTORKAN', 'whirl', { spins: 3, radius: 74, heavy: true }), great_hammer: S('HAMMERWIRBEL', 'whirl', { spins: 3, radius: 80, heavy: true }),
  dual_swords: S('KLINGENWIRBEL', 'whirl', { spins: 5, radius: 60 }), twinblade: S('KLINGENRAD', 'whirl', { spins: 5, radius: 66 }), daggers: S('DOLCHWIRBEL', 'whirl', { spins: 6, radius: 54 }),
  quarterstaff: S('STABWIRBEL', 'whirl', { spins: 4, radius: 70 }),
  katana: S('IAI-DURCHZUG', 'iai'), odachi: S('LANGER DURCHZUG', 'iai', { reachBonus: 30 }), spirit_sword: S('SEELENDURCHZUG', 'iai'),
  spear: S('STURMLANZE', 'lance'), glaive: S('GLEVENSTOSS', 'lance'), spirit_glaive: S('GEISTERLANZE', 'lance'),
  scythe: S('ERNTEKREIS', 'reap'), chain_scythe: S('KETTENERNTE', 'reap', { pull: 190 }),
  gauntlets: S('DURCHSCHLAG', 'drive'),
  rune_greatsword: S('RUNENSICHEL', 'crescent', { size: 1.25 }), spellblade: S('KLINGENSICHEL', 'crescent'), ice_sword: S('FROSTSICHEL', 'crescent', { size: .9 }),
  bow: S('GLEITSCHUSS', 'volley'), crossbow: S('BOLZENGLEITEN', 'volley'), throwing_blades: S('KLINGENFÄCHER', 'volley', { count: 5 }), chakrams: S('RINGWURF', 'volley'), magic_cards: S('KARTENFÄCHER', 'volley', { count: 5 }),
  arcane_staff: S('ARKANSTOSS', 'wave', { look: 'arcane' }), orb_focus: S('ORBSTOSS', 'wave', { look: 'arcane' }), sacred_staff: S('LICHTWELLE', 'wave', { look: 'arcane' }),
  warlock_rod: S('HEXENWELLE', 'wave', { look: 'sigil' }), rod_grimoire: S('FLUCHWELLE', 'wave', { look: 'sigil' }), talisman: S('SIEGELFLUT', 'wave', { look: 'sigil' }),
  harp: S('KLANGWELLE', 'wave', { look: 'sound' }), battle_zither: S('AKKORDWELLE', 'wave', { look: 'sound' }), ritual_fan: S('STURMFÄCHER', 'wave', { look: 'gust' }),
  claws: S('RAUBTIERSATZ', 'pounce'), beast_staff: S('PRANKENSATZ', 'pounce')
});
// Screen feedback tied to the impact (user, 20 Oct 2026: "Shaking passend, nicht
// willkürlich"): only on a real hit, scaled by how heavy the blow is.
const IMPACT = Object.freeze({ whirl: [2, .08, 1], heavyWhirl: [4, .1, 2], crescent: [6, .22, 4], wave: [3, .15, 2], lance: [4, .15, 3], bash: [7, .2, 4], reap: [5, .18, 3], pounce: [6, .2, 4], iai: [6, .2, 5], drive: [14, .35, 8], volley: [0, 0, 0] });
export function impact(kind) { const [amp, dur, stop] = IMPACT[kind] ?? [3, .15, 2]; if (amp) combat.shakeCamera?.(amp, dur); if (stop) combat.triggerHitstop?.(stop); }

// Timing / lunge per kind (seconds, multipliers of the plain sprint attack).
const KIND = Object.freeze({
  crescent: { windup: .1, active: .14, recovery: .3, lungeSpeed: .9, damageMult: 1.1, recoilMult: 1.3, pitch: .62 },
  whirl: { windup: 0, active: .5, recovery: .22, lungeSpeed: .85, damageMult: .45, pierce: true, pitch: 1.2 },
  drive: { windup: .05, active: .16, recovery: .35, lungeSpeed: 1.05, damageMult: .55, pitch: .6 },
  iai: { windup: .08, active: .14, recovery: .34, lungeSpeed: 2.4, damageMult: .35, pierce: true, recoilMult: .01, pitch: 1.5 }, // the pass does not shove: the Wizard goes THROUGH
  lance: { windup: .06, active: .2, recovery: .26, lungeSpeed: 1.5, damageMult: 1.1, pierce: true, reach: 150, pitch: .95 },
  bash: { windup: .04, active: .22, recovery: .28, lungeSpeed: 1.15, damageMult: .9, recoilMult: 1.4, carryMult: 1.8, pitch: .7 },
  reap: { windup: .1, active: .16, recovery: .28, lungeSpeed: .8, damageMult: 1, reach: 120, pitch: .75 },
  volley: { windup: .04, active: .12, recovery: .26, lungeSpeed: .95, damageMult: .6, pitch: 1.3 },
  wave: { windup: .08, active: .12, recovery: .3, lungeSpeed: .8, damageMult: .7, pitch: .9 },
  pounce: { windup: .04, active: .3, recovery: .26, lungeSpeed: 1.3, damageMult: 1.15, leap: 230, pitch: 1.1 }
});
export const DRIVE = Object.freeze({ drag: .18, launch: 1050, lift: 300, bonus: 1.1 });

export const weaponSprintOf = (player) => WEAPON_SPRINTS[player?.classWeapon] ?? null;
// The variant for Player.startSprintAttack (null without a class weapon).
export function weaponSprintVariant(player) {
  const ws = weaponSprintOf(player); if (!ws) return null;
  const k = KIND[ws.kind];
  return { ...k, ...ws, weapon: true, weaponId: player.classWeapon, reach: (k.reach ?? 90) + (ws.reachBonus ?? 0), recoilMult: ws.recoilMult ?? k.recoilMult, color: astralHue(player.classWeapon) };
}

const foesOf = (player, game) => (game?.getHostileTargets?.(player.team) ?? []).filter((t) => t && !t.isDead && t.lifeState !== 'Dead' && (t.hp ?? 1) > 0 && !t.isObjective && !t.isProp && !t.isStoneWall && !t.isCastle);
const fxOf = (spells, fx) => { spells?.addSpell?.(fx, 'B'); return fx; };

// Called once when the sprint attack starts.
export function weaponSprintStart(player, strike, spells) {
  const v = strike.variant;
  strike.fx = fxOf(spells, new WeaponSprintFx(player, v));
  combat.spawnDust?.(player.x, player.y, 8);
}

// Per frame; returns true when the weapon's move handled the frame (the plain hit is skipped).
export function weaponSprintTick(player, strike, dt, spells, game) {
  const v = strike.variant; const f = player.facing || 1; const heavy = strike.heavy;
  const activeEnd = strike.windup + strike.active;
  if (strike.elapsed < strike.windup) return false;
  // Projectile moves fire at the launch.
  if (!strike.fired && (v.kind === 'crescent' || v.kind === 'wave' || v.kind === 'volley')) {
    strike.fired = true;
    if (v.kind === 'volley') {
      const shot = WEAPONS[v.weaponId]?.heavy?.shot ?? WEAPONS[v.weaponId]?.ranged ?? { kind: 'knife', speed: 720, damage: 16, life: .7 };
      const n = v.count ?? 3;
      for (let i = 0; i < n; i++) for (const sh of makeWeaponShots(player, { ...shot, count: 1, damage: (shot.damage ?? 18) * .75, life: .7 }, v.weaponId)) { sh.vz = (i - (n - 1) / 2) * .22; spells?.addSpell?.(sh, 'B'); }
    } else {
      const size = v.size ?? 1;
      fxOf(spells, new WeaponWave(player, { look: v.kind === 'crescent' ? 'crescent' : v.look, damage: heavy.damage * (v.kind === 'crescent' ? .95 : .8), range: v.kind === 'crescent' ? 400 : 340, size, color: v.color }));
    }
  }
  // Reap: the sweep drags the foes in front toward the blade.
  if (v.kind === 'reap' && !strike.pulled) {
    strike.pulled = true;
    for (const t of foesOf(player, game)) { const ahead = (t.x - player.x) * f; if (ahead > -30 && ahead < (v.pull ?? 150) && Math.abs(((t.z ?? player.z) - player.z) * DEPTH) < 44) { t.x += (player.x + f * 46 - t.x) * .75; if ('kbVelX' in t) t.kbVelX = 0; } }
  }
  // Iai: the cut lands on everyone passed a moment after the draw.
  if (v.kind === 'iai' && !strike.cut && strike.elapsed >= activeEnd + .18) {
    strike.cut = true;
    for (const t of strike.hits) if (t && !t.isDead && (t.hp ?? 1) > 0) { t.takeDamage?.(heavy.damage * 1.15, f * 260, 120, .55, true, 'melee'); combat.spawnHitSparks?.(t.x, (t.y ?? 0) - 40, f, '#ffffff', 16); }
    if (strike.hits.size) { impact('iai'); audio.playSlash?.(1.7); }
    if (strike.fx) strike.fx.cutAt = strike.fx.t;
  }
  if (v.kind === 'whirl') {
    // A vortex: several hits on everyone around while sliding on.
    if (strike.elapsed <= activeEnd) {
      strike.next = (strike.next ?? 0) - dt;
      if (strike.next <= 0) {
        strike.next = strike.active / (v.spins ?? 4);
        strike.hits.clear();
        const spun = player.triggerMeleeHitbox(heavy.damage * strike.variant.damageMult * (v.heavy ? 1.3 : 1), f * (v.heavy ? 200 : 110), 40, .25, false, { reach: v.radius ?? 64, behind: true, hitSet: strike.hits, sprintAttack: true, hitstopTicks: 1 });
        audio.playSlash?.(v.heavy ? .8 : 1.3);
        if (spun) impact(v.heavy ? 'heavyWhirl' : 'whirl');
      }
      player.vx *= Math.pow(.25, dt);
    } else player.vx *= Math.pow(.02, dt);
    return true;
  }
  if (v.kind === 'drive') {
    // 1) contact: the punch lands and carries the foe along with the run.
    if (!strike.drag && !strike.done && strike.elapsed <= activeEnd) {
      const hit = player.triggerMeleeHitbox(heavy.damage * v.damageMult, f * 30, 0, .6, true, { reach: 84, hitSet: strike.hits, sprintAttack: true, hitstopTicks: 2 });
      if (hit) { strike.drag = { t: DRIVE.drag, targets: [...strike.hits] }; player.vx = f * strike.speed * .75; audio.playImpact?.(false); }
      return true;
    }
    if (strike.drag) {
      strike.drag.t -= dt;
      for (const t of strike.drag.targets) { t.x = player.x + f * 34; if ('kbVelX' in t) t.kbVelX = 0; }
      if (strike.drag.t <= 0) {
        // 2) the impulse: all the run-up energy goes into the foe — it flies, the Wizard stops dead.
        const momentum = Math.max(.8, Math.min(1.4, strike.speed / 300));
        for (const t of strike.drag.targets) {
          t.takeDamage?.(heavy.damage * DRIVE.bonus * momentum, f * DRIVE.launch * momentum, DRIVE.lift, .8, true, 'melee');
          if ('kbVelX' in t) t.kbVelX = f * DRIVE.launch * momentum;
        }
        player.vx = 0; strike.drag = null; strike.done = true; strike.connected = true; strike.carry = 0;
        impact('drive'); audio.playImpact?.(true);
        combat.spawnShockwave?.(player.x + f * 40, player.y - 34, 70, '#ffe0b2');
        if (strike.fx) strike.fx.impactAt = strike.fx.t;
      }
      return true;
    }
    player.vx = 0;
    return true;
  }
  return false;
}

// A plain-hit move connected (bash / lance / pounce / crescent / reap / iai pass).
export function weaponSprintHit(player, strike) {
  const v = strike.variant; const f = player.facing || 1;
  if (strike.impacted) return; // feedback once per move
  strike.impacted = true;
  if (v.kind === 'bash') combat.spawnShockwave?.(player.x + f * 30, player.y - 30, 54, '#fff6c8');
  if (v.kind === 'pounce') combat.spawnHitSparks?.(player.x + f * 30, player.y - 30, f, v.color, 14);
  if (v.kind !== 'iai') impact(v.kind); // the iai pass is quiet — the cut brings the impact
}

// ── The travelling wave (crescent / sound / gust / sigil / arcane) ───────
export class WeaponWave {
  constructor(player, { look = 'crescent', damage = 30, range = 380, size = 1, color = '#ffffff' } = {}) {
    this.owner = player; this.team = player.team; this.f = player.facing || 1; this.x0 = player.x + this.f * 30; this.x = this.x0; this.z = player.z;
    this.look = look; this.damage = damage; this.range = range; this.size = size; this.color = color; this.speed = 760; this.t = 0; this.hits = new Set(); this.isFinished = false;
  }
  get y() { return groundYForDepth(this.z); }
  update(dt, game) {
    this.t += dt; this.x += this.f * this.speed * dt;
    const half = 34 * this.size;
    for (const t of foesOf(this.owner, game)) {
      if (this.hits.has(t) || Math.abs(t.x - this.x) > 26 * this.size || Math.abs(((t.z ?? this.z) - this.z) * DEPTH) > half) continue;
      this.hits.add(t);
      t.takeDamage?.(this.damage, this.f * (this.look === 'gust' ? 520 : 300), this.look === 'crescent' ? 160 : 80, .45, true, 'spell');
      combat.spawnHitSparks?.(t.x, (t.y ?? this.y) - 40, this.f, this.color, 14);
      if (this.hits.size === 1) impact(this.look === 'crescent' ? 'crescent' : 'wave');
    }
    if (Math.abs(this.x - this.x0) > this.range) this.isFinished = true;
  }
  render(ctx) {
    const y = this.y - 38; const k = Math.abs(this.x - this.x0) / this.range; const a = Math.min(1, (1 - k) * 3); const s = this.size; const f = this.f; const x = this.x;
    ctx.save(); ctx.globalAlpha = a;
    if (this.look === 'crescent') {
      // A giant sickle of light standing upright, the impulse made visible.
      const H = 62 * s; const W = 26 * s;
      for (const [col, sh] of [[this.color, 1], ['#ffffff', .55]]) {
        ctx.fillStyle = col; ctx.beginPath();
        ctx.moveTo(x - f * 4, y - H * sh); ctx.quadraticCurveTo(x + f * W * 1.6 * sh, y, x - f * 4, y + H * sh * .9);
        ctx.quadraticCurveTo(x + f * W * .5 * sh, y, x - f * 4, y - H * sh); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = a * .45; ctx.fillStyle = this.color; for (let i = 1; i <= 3; i++) ctx.fillRect(Math.round(x - f * (i * 16 + 10)), Math.round(y - H * .6 + i * 6), Math.round(f * -10), Math.round(H * 1.1 - i * 12));
    } else if (this.look === 'sound') {
      ctx.strokeStyle = this.color; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.globalAlpha = a * (1 - i * .28); ctx.beginPath(); ctx.ellipse(x - f * i * 14, y, 10 + i * 4, (30 + i * 8) * s, 0, f > 0 ? -1.2 : Math.PI - 1.2, f > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke(); }
      ctx.fillStyle = '#ffffff'; ctx.font = '12px monospace'; ctx.fillText('♪', x - f * 20, y - 30); ctx.fillText('♫', x - f * 34, y + 16);
    } else if (this.look === 'gust') {
      ctx.strokeStyle = this.color; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { ctx.globalAlpha = a * (1 - i * .2); ctx.beginPath(); ctx.arc(x - f * i * 18, y - 10 + i * 8, (14 + i * 3) * s, this.t * 14 + i, this.t * 14 + i + 4.2); ctx.stroke(); }
    } else if (this.look === 'sigil') {
      for (let i = 0; i < 3; i++) { const yy = y - 24 + i * 22; const ang = this.t * 8 + i; ctx.save(); ctx.translate(x - f * i * 12, yy); ctx.rotate(ang); ctx.fillStyle = '#f6e7b8'; ctx.fillRect(-7, -9, 14, 18); ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.strokeRect(-7, -9, 14, 18); ctx.restore(); }
    } else {
      // Arcane: a glowing orb with a tail of rings.
      ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(x, y, 14 * s, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 7 * s, 0, TAU); ctx.fill();
      ctx.strokeStyle = this.color; ctx.lineWidth = 2; for (let i = 1; i <= 3; i++) { ctx.globalAlpha = a * (1 - i * .25); ctx.beginPath(); ctx.ellipse(x - f * i * 18, y, 6, 18 - i * 3, 0, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
  }
}

// ── The move's own look on the Wizard (vortex, draw line, fist impact …) ─
export class WeaponSprintFx {
  constructor(player, variant) { this.owner = player; this.team = player.team; this.v = variant; this.t = 0; this.isFinished = false; this.f = player.facing || 1; this.cutAt = null; this.impactAt = null; this.trail = []; }
  get x() { return this.owner.x; } get z() { return this.owner.z; } get y() { return groundYForDepth(this.owner.z); }
  update(dt) {
    this.t += dt; const p = this.owner;
    this.trail.push({ x: p.x, y: p.y, t: this.t }); this.trail = this.trail.filter((q) => this.t - q.t < .25);
    const end = (this.v.windup ?? 0) + (this.v.active ?? .2) + (this.v.recovery ?? .3) + .5;
    if (this.t > end || (p.state !== 'heavyStrike' && this.t > .1 && this.cutAt == null && this.impactAt == null)) this.isFinished = true;
  }
  render(ctx) {
    const p = this.owner; const f = this.f; const c = this.v.color ?? '#ffffff'; const kind = this.v.kind; const cy = p.y - 38;
    ctx.save(); ctx.lineCap = 'round';
    if (kind === 'whirl' && this.t < (this.v.windup ?? 0) + (this.v.active ?? .5) + .05) {
      // The vortex: blade arcs circling the Wizard, wider for heavy weapons.
      const R = this.v.radius ?? 60;
      for (let i = 0; i < 3; i++) { const ang = this.t * 28 + i * TAU / 3; ctx.globalAlpha = .9; ctx.strokeStyle = i ? c : '#ffffff'; ctx.lineWidth = this.v.heavy ? 6 : 4; ctx.beginPath(); ctx.ellipse(p.x, cy + 8, R, R * .34, 0, ang, ang + 1.6); ctx.stroke(); }
      ctx.globalAlpha = .25; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(p.x, p.y, R * .9, R * .28, 0, 0, TAU); ctx.fill();
    }
    if (kind === 'iai') {
      // The draw: one thin bright line along the path; the cut flashes on the foes later.
      if (this.trail.length > 1) { ctx.globalAlpha = .9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.trail[0].x, this.trail[0].y - 40); ctx.lineTo(p.x, p.y - 40); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.globalAlpha = .4; ctx.stroke(); }
      if (this.cutAt != null) { const k = (this.t - this.cutAt) / .3; if (k < 1) { ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - f * 220, cy - 30 + 40 * k); ctx.lineTo(p.x - f * 20, cy + 20 - 40 * k); ctx.stroke(); } }
    }
    if (kind === 'drive') {
      // Speed lines while carrying, then a burst of impact lines when the energy releases.
      if (this.impactAt == null) for (let i = 0; i < 4; i++) { ctx.globalAlpha = .6; ctx.strokeStyle = c; ctx.lineWidth = 2; const yy = cy - 14 + i * 9; ctx.beginPath(); ctx.moveTo(p.x - f * 18, yy); ctx.lineTo(p.x - f * (40 + i * 8), yy); ctx.stroke(); }
      else { const k = (this.t - this.impactAt) / .35; if (k < 1) { const x = p.x + f * 40; for (let i = 0; i < 10; i++) { const ang = (i / 10 - .5) * 2.4 + (f > 0 ? 0 : Math.PI); ctx.globalAlpha = 1 - k; ctx.strokeStyle = i % 2 ? '#ffffff' : c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * 14, cy + Math.sin(ang) * 14); ctx.lineTo(x + Math.cos(ang) * (30 + 50 * k), cy + Math.sin(ang) * (30 + 50 * k)); ctx.stroke(); } } }
    }
    if (kind === 'lance' && this.t < (this.v.windup ?? 0) + (this.v.active ?? .2)) { ctx.globalAlpha = .8; ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x - f * 30, cy); ctx.lineTo(p.x + f * (this.v.reach ?? 150), cy - 2); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(p.x + f * ((this.v.reach ?? 150) + 14), cy - 2); ctx.lineTo(p.x + f * (this.v.reach ?? 150), cy - 8); ctx.lineTo(p.x + f * (this.v.reach ?? 150), cy + 4); ctx.closePath(); ctx.fill(); }
    if (kind === 'bash' && this.t < (this.v.windup ?? 0) + (this.v.active ?? .22)) { ctx.globalAlpha = .8; ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x + f * 22, cy - 6, 28, f > 0 ? -1.2 : Math.PI - 1.2, f > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke(); }
    if (kind === 'reap' && this.t < (this.v.windup ?? 0) + (this.v.active ?? .16) + .1) { const k = Math.min(1, this.t / .26); ctx.globalAlpha = .85 * (1 - k * .5); ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(p.x, cy + 10, 120 * k, 36 * k, 0, 0, TAU); ctx.stroke(); }
    if (kind === 'crescent' && this.t < .3) { ctx.globalAlpha = .9 * (1 - this.t / .3); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(p.x + f * 10, cy, 60 * (this.v.size ?? 1), f > 0 ? -1.4 : Math.PI - 1.4, f > 0 ? 1.4 : Math.PI + 1.4); ctx.stroke(); }
    ctx.restore();
  }
}
