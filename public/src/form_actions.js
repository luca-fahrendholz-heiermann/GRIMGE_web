// GRIMGE Prototype — guard, sprint, grab and jump of transformations and manifests.
//
// Following docs/GRIMGE_Kyubi_Susanoo_Animations_Moveset.md (own names, no
// borrowed terms):
//  • Guard: Ninefold — tails whip forward into a restless cocoon; Eidolon —
//    glowing ribs and a giant open palm in front; Ascendant — a light shield.
//    A perfect block counters: tail jab / palm shove / blinding flash.
//  • Sprint: Ninefold — low beast rush with a flame trail; Eidolon — heavy
//    steps with a violet ring each; Ascendant — golden afterimages. Shoulder
//    contact pushes enemies (once per target per sprint).
//  • Grab: Ninefold — two tails seize and slam; Eidolon — the giant hand
//    seizes, swings and slams; Ascendant — light chains. A miss shows a short
//    search pulse.
//  • Jump: takeoff burst and landing ring in the form's colour (no damage).
//  • Sprint + attack: Ninefold — Beast Pounce (leaping chakra claw,
//    knockdown, long carry); Eidolon — Colossus Breaker (slow wind-up, straight
//    astral fist, huge push that also shoves enemies behind, long recovery);
//    Ascendant — Radiant Lunge (golden lunge through every enemy on the path).
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { activeMoveset, FORM_PALETTES } from './form_moves.js';

const DEPTH_PX = 150;
const alive = (t) => t && !t.isDead && (!t.lifeState || t.lifeState === 'Alive') && !t.isObjective && !t.isProp;
const front = (p, t, reach, depth = 30) => {
  const dx = (t.x - p.x) * (p.facing || 1);
  return dx > -6 && dx <= reach && Math.abs(((t.z ?? p.z) - p.z) * DEPTH_PX) <= depth;
};

// ── Guard: perfect-block counter ─────────────────────────────────────────
export function formGuardCounter(player, gameWorld) {
  const form = activeMoveset(player);
  if (!form || !gameWorld) return false;
  // Buff transformations bring their own counter (atlas defense text).
  if (FORM_FX_HOOKS.counter?.(player, gameWorld, form)) return true;
  const foes = gameWorld.getHostileTargets(player.team).filter(alive);
  const pal = FORM_PALETTES[form];
  if (form === 'ninefold') {
    // A tail catches the hit, a second one jabs out: interrupt, little damage.
    const target = foes.filter((t) => front(player, t, 95)).sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
    if (target) target.takeDamage(10, player.facing * 160, 40, .45, false, 'melee');
    combat.spawnSlashArc(player.x + player.facing * 40, player.y - 46, player.facing, { radius: 34, color: pal.main, glow: pal.edge, width: 5 });
  } else if (form === 'eidolon') {
    // The palm snaps shut and shoves the attacker back hard.
    for (const t of foes) if (front(player, t, 110, 36)) t.takeDamage(8, player.facing * 560, 80, .5, false, 'melee');
    combat.spawnShockwave(player.x + player.facing * 40, player.y - 46, 60, pal.main);
  } else {
    // A blinding flash staggers everyone close in front.
    for (const t of foes) if (front(player, t, 90, 34)) { t.takeDamage(6, player.facing * 220, 30, .55, false, 'melee'); t.slow?.(.8, .5); }
    combat.spawnShockwave(player.x + player.facing * 30, player.y - 46, 50, pal.core);
  }
  return true;
}

// ── Sprint: contact push and trail effects ──────────────────────────────
export function updateFormSprint(player, gameWorld, dt) {
  const form = activeMoveset(player);
  if (!form || !player.sprintActive || !gameWorld) return;
  player._sprintHits ??= new Set();
  const pal = FORM_PALETTES[form];
  if (form === 'ninefold') {
    if (Math.random() < dt * 40) combat.spawnElementalParticles(player.x - player.facing * 18, player.y - 12 - Math.random() * 30, 'ignis', 1);
  } else if (form === 'eidolon') {
    player._stepTimer = (player._stepTimer ?? 0) - dt;
    if (player._stepTimer <= 0) { player._stepTimer = .3; combat.spawnShockwave(player.x, player.y - 2, 34, pal.main); combat.spawnDust(player.x, player.y, 3); }
  } else if (Math.random() < dt * 30) {
    player.ghosts?.push({ x: player.x, y: player.y, z: player.z, elevation: player.elevation, facing: player.facing, alpha: .4, state: player.state, animTime: player.animTime });
  }
  const push = form === 'eidolon' ? 420 : form === 'ninefold' ? 240 : 200;
  const damage = form === 'eidolon' ? 10 : 6;
  for (const t of gameWorld.getHostileTargets(player.team).filter(alive)) {
    if (player._sprintHits.has(t) || !front(player, t, 30, 28)) continue;
    player._sprintHits.add(t);
    t.takeDamage(damage, player.facing * push, form === 'eidolon' ? 60 : 30, .3, false, 'melee');
    combat.spawnHitSparks(t.x, (t.y ?? groundYForDepth(t.z)) - 30, player.facing, pal.main, 8);
  }
}

// ── Sprint + attack: form variants of the Sprint Attack ─────────────────
// Times in seconds. Carry/recoil multiply the Unity Sprint Attack values
// (0.6 u carry, 1.8 u target recoil): Pounce carry ×1.5 like the wolf bond
// form, the Breaker's push ×1.65 like the turtle bond's Shell Rush.
// Extensible: buff transformations add their variants at load.
export const FORM_SPRINT_ATTACKS = {
  ninefold: Object.freeze({ name: 'BEAST POUNCE', windup: .12, windupSpeed: .55, active: .22, lungeSpeed: 1.25, recovery: .30, leap: 260, damageMult: 1.15, reach: 112, carryMult: 1.5, recoilMult: 1.2, lift: -80, stun: .75, hitstopTicks: 7, pitch: .9 }),
  eidolon: Object.freeze({ name: 'COLOSSUS BREAKER', windup: .28, windupSpeed: .3, active: .16, lungeSpeed: 1.1, recovery: .50, damageMult: 1.35, reach: 108, carryMult: 1, recoilMult: 1.65, lift: 30, stun: .6, hitstopTicks: 9, chainPush: true, pitch: .6 }),
  ascendant: Object.freeze({ name: 'RADIANT LUNGE', windup: .06, windupSpeed: .8, active: .24, lungeSpeed: 1.45, recovery: .26, damageMult: 1.1, reach: 84, carryMult: 1, recoilMult: 1.2, lift: 20, stun: .5, hitstopTicks: 5, pierce: true, pitch: 1.1 })
};
// Optional render hooks (buff transformations draw grab / sprint FX in their material).
export const FORM_FX_HOOKS = {};

// Impact extras of a form sprint attack (hits = every target struck so far).
export function formSprintImpact(player, form, hits, gameWorld) {
  const pal = FORM_PALETTES[form];
  const f = player.facing || 1;
  const struck = [...hits].at(-1); // the latest target hit
  const fy = struck ? (struck.y ?? groundYForDepth(struck.z)) : player.y;
  if (form === 'ninefold') {
    // A crescent scratch of energy, sparks and dust where the claw lands.
    if (struck) {
      combat.spawnSlashArc(struck.x, fy - 30, f, { radius: 44, angleStart: -1.1, angleEnd: 1.3, color: pal.core, glow: pal.main, width: 8 });
      combat.spawnElementalParticles(struck.x, fy - 20, 'ignis', 12);
      combat.spawnDust(struck.x, fy, 6);
    }
    combat.shakeCamera(7, .2);
  } else if (form === 'eidolon') {
    // A cone of pressure behind the fist; it shoves enemies standing behind.
    combat.spawnShockwave(player.x + f * 60, player.y - 50, 70, pal.main);
    combat.spawnShockwave(player.x + f * 90, player.y - 50, 44, pal.core);
    combat.shakeCamera(10, .26);
    if (struck && gameWorld && FORM_SPRINT_ATTACKS.eidolon.chainPush) {
      for (const t of gameWorld.getHostileTargets(player.team).filter(alive)) {
        if (hits.has(t)) continue;
        const beyond = (t.x - struck.x) * f;
        if (beyond < -4 || beyond > 140 || Math.abs(((t.z ?? struck.z) - struck.z) * DEPTH_PX) > 32) continue;
        hits.add(t);
        t.takeDamage(14, f * 420, 40, .5, false, 'melee');
        combat.spawnHitSparks(t.x, (t.y ?? groundYForDepth(t.z)) - 30, f, pal.main, 10);
      }
    }
  } else {
    combat.spawnHitSparks(struck?.x ?? player.x, fy - 30, f, pal.main, 14);
    combat.spawnShockwave(struck?.x ?? player.x, fy - 30, 34, pal.core);
  }
}

// Visual of a form sprint attack; follows the Wizard through its phases.
export class FormSprintAttackFx {
  constructor(player, form) {
    this.player = player; this.form = form; this.team = player.team;
    this.strike = player.sprintStrike; this.palette = FORM_PALETTES[form];
    this.facing = player.facing || 1; this.isFinished = false;
  }
  get x() { return this.player.x; }
  get z() { return this.player.z; }
  update() {
    if (this.player.sprintStrike !== this.strike || !this.player.isAlive) this.isFinished = true;
  }
  render(ctx) {
    const s = this.strike; const p = this.player; const pal = this.palette; const f = this.facing;
    if (!s) return;
    if (FORM_FX_HOOKS.sprint?.(ctx, this)) return;
    const t = s.elapsed;
    const total = s.windup + s.active + (s.variant?.recovery ?? 0);
    const strikeT = Math.max(0, t - s.windup);
    const fade = t < s.windup + s.active ? 1 : Math.max(0, 1 - (t - s.windup - s.active) / Math.max(.01, total - s.windup - s.active));
    const ry = p.y - (p.elevation ?? 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    if (this.form === 'ninefold') {
      if (t < s.windup) {
        // The tails bundle like a drawn spring: energy gathers at the shoulder.
        const k = t / s.windup;
        ctx.fillStyle = pal.glow + (.35 + .4 * k) + ')';
        ctx.beginPath(); ctx.arc(p.x - f * 10, ry - 52, 6 + 10 * k, 0, Math.PI * 2); ctx.fill();
      } else {
        // A giant chakra claw rakes diagonally from above to below.
        const k = Math.min(1, strikeT / (s.active * .6));
        const cx = p.x + f * 46; const cy = ry - 46;
        for (let i = -1; i <= 1; i++) {
          const ox = i * 13 * f; const oy = i * 7;
          const x0 = cx + ox - f * 22; const y0 = cy + oy - 42;
          const x1 = cx + ox + f * 30 * k; const y1 = cy + oy - 42 + 84 * k;
          ctx.strokeStyle = pal.glow + (.55 * fade) + ')'; ctx.lineWidth = 11;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx + ox + f * 34, cy + oy - 20, x1, y1); ctx.stroke();
          ctx.strokeStyle = pal.core; ctx.globalAlpha = fade; ctx.lineWidth = 2.5; ctx.stroke(); ctx.globalAlpha = 1;
        }
        // The claw's palm around the arm.
        ctx.fillStyle = pal.glow + (.3 * fade) + ')';
        ctx.beginPath(); ctx.ellipse(p.x + f * 22, ry - 48, 18, 12, f * .5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (this.form === 'eidolon') {
      // The astral fist: pulled far back during the wind-up, then shot forward.
      const k = t < s.windup ? -(t / s.windup) : Math.min(1, strikeT / (s.active * .5));
      const reach = k < 0 ? -26 * -k : 30 + 66 * k;
      const fx = p.x + f * reach; const fy = ry - 54;
      ctx.strokeStyle = pal.glow + (.45 * fade) + ')'; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(p.x - f * 6, ry - 62); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = pal.glow + ((k < 0 ? .3 + .4 * -k : .6) * fade) + ')';
      ctx.beginPath(); ctx.arc(fx, fy, 15 + (k < 0 ? 4 * -k : 6), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = pal.core; ctx.globalAlpha = fade; ctx.lineWidth = 2.5; ctx.stroke();
      // Knuckle plates.
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(fx + f * 8, fy + i * 7); ctx.lineTo(fx + f * 18, fy + i * 7); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else {
      // A golden lance of light streaking with the lunge.
      const len = t < s.windup ? 20 : 40 + 80 * Math.min(1, strikeT / s.active);
      const g = ry - 44;
      ctx.strokeStyle = pal.glow + (.45 * fade) + ')'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(p.x - f * len, g); ctx.lineTo(p.x + f * 34, g); ctx.stroke();
      ctx.strokeStyle = pal.core; ctx.globalAlpha = fade; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x - f * len * .7, g); ctx.lineTo(p.x + f * 40, g); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

// ── Grab: form finisher (visual + extra damage) ─────────────────────────
export class FormGrabFx {
  constructor(player, target, form) {
    this.player = player; this.target = target; this.form = form; this.team = player.team;
    this.palette = FORM_PALETTES[form]; this.t = 0; this.life = target ? .55 : .3; this.isFinished = false;
    this.facing = player.facing || 1; this.slammed = false;
  }
  get x() { return this.player.x; }
  get z() { return this.player.z; }
  update(dt) {
    this.t += dt;
    if (this.target && !this.slammed && this.t >= .3) {
      this.slammed = true;
      if (FORM_FX_HOOKS.grabSlam?.(this)) { if (this.t >= this.life) this.isFinished = true; return; }
      const extra = this.form === 'eidolon' ? 30 : this.form === 'ninefold' ? 22 : 18;
      this.target.takeDamage?.(extra, this.facing * (this.form === 'eidolon' ? 260 : 180), 120, .6, true, 'grab');
      combat.spawnShockwave(this.target.x, groundYForDepth(this.target.z ?? this.player.z) - 4, this.form === 'eidolon' ? 70 : 50, this.palette.main);
      combat.shakeCamera(this.form === 'eidolon' ? 9 : 6, .25);
      audio.playImpact?.(true);
    }
    if (this.t >= this.life) this.isFinished = true;
  }
  render(ctx) {
    if (FORM_FX_HOOKS.grab?.(ctx, this)) return;
    const p = this.player; const pal = this.palette;
    const hx = p.x + this.facing * 10; const hy = p.y - 48;
    const k = Math.min(1, this.t / .18);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (!this.target) {
      // Miss: a short search pulse in front.
      ctx.strokeStyle = pal.glow + (.7 * (1 - this.t / this.life)) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(hx + this.facing * 26, hy, 12 + 20 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      return;
    }
    const tx = this.target.x; const ty = (this.target.y ?? groundYForDepth(this.target.z)) - 36;
    if (this.form === 'ninefold') {
      // Two tails lash out like ropes and wrap the target.
      for (const bend of [-1, 1]) {
        ctx.strokeStyle = pal.glow + '.85)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x - this.facing * 8, p.y - 40);
        ctx.quadraticCurveTo((p.x + tx) / 2, hy - 40 * bend, p.x + (tx - p.x) * k, hy + (ty - hy) * k); ctx.stroke();
        ctx.strokeStyle = pal.core; ctx.lineWidth = 2; ctx.stroke();
      }
    } else if (this.form === 'eidolon') {
      // The giant astral hand closes around the target.
      const r = 26; ctx.fillStyle = pal.glow + '.45)'; ctx.strokeStyle = pal.core; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a = -1.2 + i * .55; ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r); ctx.lineTo(tx + Math.cos(a) * (r + 14 * (1 - k)), ty + Math.sin(a) * (r + 14 * (1 - k)) - 10); ctx.stroke(); }
      ctx.strokeStyle = pal.glow + '.6)'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 60); ctx.lineTo(tx, ty); ctx.stroke();
    } else {
      // Chains of light bind the target.
      ctx.strokeStyle = pal.core; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.setLineDash?.([6, 4]); ctx.beginPath(); ctx.moveTo(hx, hy - 6 + i * 6); ctx.lineTo(hx + (tx - hx) * k, hy + (ty - hy) * k - 6 + i * 6); ctx.stroke(); }
      ctx.setLineDash?.([]);
    }
    ctx.restore();
  }
}

// ── Jump: takeoff / landing effects (never damage) ──────────────────────
export function formJumpFx(player, phase) {
  const form = activeMoveset(player);
  if (!form) return false;
  if (FORM_FX_HOOKS.jump?.(player, phase, form)) return true;
  const pal = FORM_PALETTES[form];
  const y = groundYForDepth(player.z) - (player.surfaceHeight ?? 0);
  if (phase === 'takeoff') {
    combat.spawnShockwave(player.x, y - 2, form === 'eidolon' ? 62 : 40, form === 'ninefold' ? '#ff3d00' : pal.main);
    if (form === 'ninefold') combat.spawnElementalParticles(player.x, y - 6, 'ignis', 10);
  } else {
    combat.spawnShockwave(player.x, y - 2, form === 'eidolon' ? 70 : 46, pal.main);
    combat.spawnDust(player.x, y, form === 'eidolon' ? 8 : 4);
  }
  return true;
}
