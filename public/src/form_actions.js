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
      const extra = this.form === 'eidolon' ? 30 : this.form === 'ninefold' ? 22 : 18;
      this.target.takeDamage?.(extra, this.facing * (this.form === 'eidolon' ? 260 : 180), 120, .6, true, 'grab');
      combat.spawnShockwave(this.target.x, groundYForDepth(this.target.z ?? this.player.z) - 4, this.form === 'eidolon' ? 70 : 50, this.palette.main);
      combat.shakeCamera(this.form === 'eidolon' ? 9 : 6, .25);
      audio.playImpact?.(true);
    }
    if (this.t >= this.life) this.isFinished = true;
  }
  render(ctx) {
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
