// GRIMGE Prototype — Frost Mirror Gate (AQUA + VOID).
//
// The caster sets two points; an ice mirror rises at each. Stepping into one
// mirror brings a Wizard or allied summon out of the other, so the gate can
// open an escape route (in long Dungeon rooms back to the entrance) or a
// flank. A traveller has to step off the arrival mirror before it can be
// used again, so nobody bounces back and forth.
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';

const DEPTH_PX = 150;
const ENTRY_RADIUS = 26;

export class FrostMirror {
  constructor(x, z, team, link, life = 30) {
    this.x = x; this.z = z; this.team = team; this.link = link;
    this.surfaceHeight = 0; this.life = life; this.maxLife = life;
    this.isFrostMirror = true; this.isFinished = false; this.t = Math.random() * 6;
    link.mirrors.push(this);
  }
  get partner() { return this.link.mirrors.find((mirror) => mirror !== this) ?? null; }
  get y() { return groundYForDepth(this.z) - this.surfaceHeight; }

  // Wizards and summons of the caster's side may travel.
  travellers(gameWorld) {
    const list = [gameWorld.player, gameWorld.enemyChampion].filter((wizard) => wizard?.team === this.team && wizard.isAlive && !wizard.burrowed);
    for (const summon of this.system?.getSummons?.(this.team) ?? []) if (!summon.rider) list.push(summon);
    return list;
  }

  isOn(actor) {
    return Math.hypot(actor.x - this.x, ((actor.z ?? this.z) - this.z) * DEPTH_PX) <= ENTRY_RADIUS && (actor.elevation ?? 0) < 24;
  }

  update(dt, gameWorld) {
    this.t += dt;
    this.life -= dt;
    const partner = this.partner;
    if (this.life <= 0 || !partner || partner.isFinished) {
      this.isFinished = true;
      combat.spawnShockwave(this.x, this.y - 30, 30, '#b3e5fc');
      return;
    }
    for (const actor of this.travellers(gameWorld)) {
      const on = this.isOn(actor);
      if (actor._mirrorArrival === this) {
        // Just arrived here: the mirror wakes up once they step off.
        if (!on) actor._mirrorArrival = null;
        continue;
      }
      if (on) this.send(actor, partner, gameWorld);
    }
  }

  send(actor, partner, gameWorld) {
    combat.spawnShockwave(this.x, this.y - 30, 40, '#80deea');
    combat.spawnElementalParticles(this.x, this.y - 34, 'aqua', 10);
    actor.x = partner.x; actor.z = partner.z;
    actor.vx = 0; actor.vz = 0;
    if ('kbVelX' in actor) actor.kbVelX = 0;
    if ('kbVelZ' in actor) actor.kbVelZ = 0;
    actor.cancelSprint?.();
    actor._mirrorArrival = partner;
    // A rider takes the mount along.
    const mount = actor.mountedSummon;
    if (mount && !mount.isDead) { mount.x = partner.x; mount.z = partner.z; mount.vx = 0; mount.vz = 0; mount._mirrorArrival = partner; }
    gameWorld.battlefield?.resolveEntityCollision?.(actor);
    combat.spawnShockwave(partner.x, partner.y - 30, 46, '#e0f7fa');
    combat.spawnElementalParticles(partner.x, partner.y - 34, 'aqua', 14);
    audio.playRuneChime?.(988);
  }

  render(ctx) {
    const fade = Math.min(1, this.life / .6, (this.maxLife - this.life) / .35);
    const x = Math.round(this.x); const y = Math.round(this.y);
    const bob = Math.sin(this.t * 2) * 2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    // Frost ring on the ground marks the entry.
    ctx.strokeStyle = 'rgba(178,235,242,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, ENTRY_RADIUS + 4, (ENTRY_RADIUS + 4) * .3, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(128,222,234,.18)';
    ctx.beginPath(); ctx.ellipse(x, y, ENTRY_RADIUS + 4, (ENTRY_RADIUS + 4) * .3, 0, 0, Math.PI * 2); ctx.fill();
    // The standing ice mirror: frame, glassy face, reflection streaks.
    const top = y - 78 + bob; const w = 34; const h = 70;
    ctx.fillStyle = '#4fb3c8';
    ctx.fillRect(x - w / 2 - 3, top - 3, w + 6, h + 6);
    const glass = ctx.createLinearGradient?.(x - w / 2, top, x + w / 2, top + h);
    if (glass) {
      glass.addColorStop(0, 'rgba(225,245,254,.95)');
      glass.addColorStop(.5, 'rgba(128,222,234,.75)');
      glass.addColorStop(1, 'rgba(225,245,254,.9)');
      ctx.fillStyle = glass;
    } else ctx.fillStyle = 'rgba(178,235,242,.9)';
    ctx.fillRect(x - w / 2, top, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    const shine = (this.t * 18) % (h + 30) - 15;
    ctx.fillRect(x - w / 2 + 5, top + Math.max(0, shine), 4, 14);
    ctx.fillRect(x + 4, top + 6, 3, h - 12);
    // Ice crystals crown the frame.
    ctx.fillStyle = '#e0f7fa';
    for (const [ox, hh] of [[-14, 10], [-5, 16], [5, 12], [14, 8]]) {
      ctx.beginPath(); ctx.moveTo(x + ox - 3, top - 2); ctx.lineTo(x + ox, top - 2 - hh); ctx.lineTo(x + ox + 3, top - 2); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

// Raise both mirrors of a gate; returns them.
export function raiseMirrorGate(system, caster, target, quality, gameWorld) {
  const ahead = { x: caster.x + (caster.facing || 1) * 220, z: caster.z };
  const a = target?.a ?? { x: caster.x + (caster.facing || 1) * 40, z: caster.z };
  const b = target?.b ?? ahead;
  // Long Dungeon rooms: the gate stays open twice as long for the way back.
  const life = 30 * (quality?.duration ?? 1) * (gameWorld?.activeMode?.id === 'dungeon' ? 2 : 1);
  // One gate per caster: a new cast closes the old one.
  for (const spell of system.activeSpells) if (spell.isFrostMirror && spell.link.owner === caster) spell.life = 0;
  const link = { owner: caster, mirrors: [] };
  const mirrors = [new FrostMirror(a.x, a.z, caster.team, link, life), new FrostMirror(b.x, b.z, caster.team, link, life)];
  for (const mirror of mirrors) {
    system.activeSpells.push(mirror);
    mirror.system = system; mirror.quality = quality;
    combat.spawnShockwave(mirror.x, mirror.y - 30, 52, '#b3e5fc');
    combat.spawnElementalParticles(mirror.x, mirror.y - 30, 'aqua', 16);
  }
  // The caster stands on the first mirror when it rises: it must step off first.
  for (const mirror of mirrors) if (mirror.isOn(caster)) caster._mirrorArrival = mirror;
  return mirrors;
}
