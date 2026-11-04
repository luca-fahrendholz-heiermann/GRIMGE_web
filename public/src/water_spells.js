// GRIMGE Prototype — WATER rune spells (user, 4 Nov 2026: "das runen element wasser ist gerade eigentlich eis …
// ein weiteres runen element wasser hinzufügen (kreis oder tropfen) natürlich mit kombo spells wie doppelt wasser").
// AQUA is real water now (the circle); the old single / double AQUA spells moved to the new ICE rune (GLACIES).
//   WASSERKUGEL (aqua)        a heavy water orb: it bursts on the first foe — splash push, everyone around wet, a puddle
//   SPRINGFLUT  (aqua + aqua) a rolling wave down the lane: it washes foes along, soaks them, leaves puddles behind
// Wet foes take lightning harder (status combos) — water sets up FULGUR, while ICE freezes.
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';
import { applyStatus } from './status_effects.js';
import { spellSheetReady, drawSpellSprite, drawSpellSpriteTinted, drawFineFromLayer } from './spell_visuals.js';

const DEPTH = 150;
// Grey-ramp sheets (bp_water, bw_wave_*) recoloured: outline, dark, mid, light, core.
export const WATER_PAL = Object.freeze(['#04152e', '#0b3c8c', '#2f8fff', '#9fdcff', '#ffffff']);
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && !t.isFinished;
const sprite = (ctx, sheet, frame, x, y, opts) => { if (!spellSheetReady(sheet)) return false; drawFineFromLayer(ctx, (c) => drawSpellSpriteTinted(c, sheet, WATER_PAL, frame, x, y, opts)); return true; };

export class WaterOrbSpell {
  constructor(x, z, facing, team, height = 0) {
    this.x = x; this.z = z; this.height = height; this.facing = facing; this.team = team;
    this.vx = facing * 600; this.radius = 18; this.life = 1.3; this.damage = 30;
    this.isCapturableProjectile = true; this.fineVfx = true; this.age = 0; this.burst = null; this.isFinished = false;
    this.element = 'aqua'; // water for every reaction (Glutpumpe steam, scene objects …)
  }
  get y() { return groundYForDepth(this.z) - this.height - 30; }
  update(dt, gw) {
    this.age += dt;
    if (this.burst) { this.burst.t += dt; if (this.burst.t > .45) this.isFinished = true; return; }
    const px = this.x; this.x += this.vx * dt; this.life -= dt;
    for (const t of gw.getHostileTargets(this.team)) {
      if (!alive(t)) continue;
      const sx = Math.max(Math.min(px, this.x), Math.min(Math.max(px, this.x), t.x));
      if (Math.hypot(sx - t.x, ((t.z ?? this.z) - this.z) * DEPTH) < this.radius + (t.radius || t.hitRadiusX || 20) && Math.abs((t.worldHeight ?? t.elevation ?? 0) - this.height) < 90) { this.x = sx; this.pop(gw); return; }
    }
    if (this.life <= 0) this.pop(gw);
  }
  pop(gw) {
    this.burst = { t: 0 }; this.vx = 0;
    const R = 70 * (this.quality?.area ?? 1);
    for (const t of gw.getHostileTargets(this.team)) {
      if (!alive(t)) continue;
      const d = Math.hypot(t.x - this.x, ((t.z ?? this.z) - this.z) * DEPTH);
      if (d > R + (t.isObjective ? (t.hitRadiusX ?? 0) * .5 : 0)) continue;
      t.takeDamage?.(this.damage, (Math.sign(t.x - this.x) || this.facing) * 320, 120, .35, false, 'spell');
      if (!t.isObjective && !t.isStoneWall) applyStatus(t, 'wet', { force: true });
    }
    environment.add('water', this.x, this.z, { radius: 52 * (this.quality?.area ?? 1), team: this.team });
    combat.spawnElementalParticles?.(this.x, this.y, 'aqua', 14); combat.shakeCamera?.(4, .15);
  }
  render(ctx) {
    if (this.burst) {
      const k = this.burst.t / .45;
      if (!spellSheetReady('water_splash') || !drawFineFromLayer(ctx, (c) => drawSpellSprite(c, 'water_splash', Math.min(5, Math.floor(k * 6)), this.x, this.y + 18, { anchor: 'center', scale: 1.3 }))) {
        ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = WATER_PAL[3]; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(this.x, this.y + 20, 20 + 50 * k, (20 + 50 * k) * .3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      return;
    }
    // The orb: the water piece sheet large, wobbling, with drops trailing behind.
    const f = Math.sign(this.vx) || 1;
    for (let i = 1; i <= 3; i++) { ctx.save(); ctx.globalAlpha = .7 - i * .18; sprite(ctx, 'bp_water', (Math.floor(this.age * 12) + i) % 4, this.x - f * i * 14, this.y + Math.sin(this.age * 20 + i) * 2, { anchor: 'center', scale: .9 - i * .15, flip: f < 0 }); ctx.restore(); }
    if (!sprite(ctx, 'bp_water', Math.floor(this.age * 12) % 4, this.x, this.y, { anchor: 'center', scale: 1.7 + Math.sin(this.age * 18) * .08, flip: f < 0 })) {
      ctx.save(); ctx.fillStyle = WATER_PAL[2]; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = WATER_PAL[3]; ctx.beginPath(); ctx.arc(this.x - 4, this.y - 4, this.radius * .45, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
}

export class TidalWaveSpell {
  constructor(x, z, facing, team) {
    this.x0 = x; this.x = x; this.z = z; this.facing = facing; this.team = team;
    this.length = 420; this.speed = 470; this.width = 44; this.damage = 34; this.life = 1.35; this.age = 0;
    this.hit = new Set(); this.puddleAt = 0; this.fineVfx = true; this.isFinished = false; this.element = 'aqua';
  }
  get head() { return Math.min(this.length, this.age * this.speed); }
  update(dt, gw) {
    this.age += dt; this.life -= dt;
    if (this.life <= 0) { this.isFinished = true; return; }
    // A wall in the lane stops the wave at its face (any side's wall).
    for (const w of this.system?.activeSpells ?? []) {
      if (!w.isStoneWall || w.isDead || Math.abs(w.z - this.z) > (w.halfZ ?? .2) + .04) continue;
      const d = (w.x - this.x0) * this.facing - (w.halfX ?? 16);
      if (d > 0 && d < this.length && d >= this.head - 10) { this.length = d; this.wall = w; }
    }
    const head = this.head; const front = this.x0 + this.facing * head; this.x = front;
    // It breaks on the own side's wall too and wears it down (a hostile wall is already one of its targets).
    if (this.wall?.team === this.team && head >= this.length - 1 && !this.wallHit) { this.wallHit = true; if (!this.wall.isDead) this.wall.takeDamage?.(this.damage); }
    if (this.age < this.length / this.speed) {
      // The breaking front carries what it meets; everyone it passes is soaked.
      for (const t of gw.getHostileTargets(this.team)) {
        if (!alive(t)) continue;
        const dx = (t.x - this.x0) * this.facing;
        if (dx < -10 || dx > head + 20 || Math.abs(((t.z ?? this.z) - this.z) * DEPTH) > this.width) continue;
        if (!this.hit.has(t)) {
          this.hit.add(t); t.takeDamage?.(this.damage, this.facing * 360, 110, .45, false, 'spell');
          if (!t.isObjective && !t.isStoneWall) applyStatus(t, 'wet', { force: true });
          if (this.hit.size === 1) combat.shakeCamera?.(5, .25);
        } else if (!t.isObjective && !t.isStoneWall && dx > head - 40 && 'kbVelX' in t) t.kbVelX = Math.max(t.kbVelX * this.facing, 260) * this.facing; // washed along
      }
      if (head - this.puddleAt > 60) { this.puddleAt = head; environment.add('water', front - this.facing * 20, this.z, { radius: 46 * (this.quality?.area ?? 1), team: this.team }); }
    }
  }
  render(ctx) {
    const f = this.facing; const head = this.head; const gy = groundYForDepth(this.z) + 2;
    const fade = Math.min(1, this.life / .3); const fr = Math.floor(this.age * 14) % 4;
    ctx.save(); ctx.globalAlpha = fade;
    if (spellSheetReady('bw_wave_body')) {
      drawFineFromLayer(ctx, (c) => {
        let dd = 0;
        while (dd < head) { const sc = .7 + .9 * dd / Math.max(1, head); drawSpellSpriteTinted(c, 'bw_wave_body', WATER_PAL, fr, this.x0 + f * (20 + dd + 16 * sc), gy, { scale: sc, flip: f < 0 }); dd += 32 * sc - 1; }
        if (spellSheetReady('bw_wave_crest')) drawSpellSpriteTinted(c, 'bw_wave_crest', WATER_PAL, fr, this.x0 + f * (20 + head + 14), gy, { scale: 1.7, flip: f < 0 });
      });
    } else {
      ctx.fillStyle = WATER_PAL[2]; ctx.beginPath(); ctx.moveTo(this.x0, gy); ctx.lineTo(this.x0 + f * head, gy - 50); ctx.lineTo(this.x0 + f * (head + 20), gy); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}
