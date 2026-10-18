// GRIMGE Prototype — heavy charge movesets of transformations and manifests.
//
// While a transformation (Focus Ascendant) or a manifest (Ninefold Beast,
// Eidolon Guardian) is active, the charged heavy attack becomes one of six
// form-specific techniques: FORWARD / UP / DOWN, each as a SHORT version
// (released before the threshold) and a FULL version (charge held for
// FULL_CHARGE_TIME). No extra rune card is ever added to the deck or hand.
// A manifest's moveset overrides the transformation's while it lasts;
// afterwards the transformation's moveset returns.
//
// Techniques are built from a few primitives (cone wave, ring, pillar,
// explosion sequence, energy wall, close burst) plus the projectile
// techniques in form_attacks.js.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { BeastBombSpell, SpiritArrowSpell } from './form_attacks.js';

export const FULL_CHARGE_TIME = 1.2;
const DEPTH_PX = 150;

// Extensible: the buff transformations register their palettes at load.
export const FORM_PALETTES = {
  ninefold: Object.freeze({ core: '#fff3c4', main: '#ff7a1a', edge: '#b3260b', glow: 'rgba(255,110,20,' }),
  eidolon: Object.freeze({ core: '#f3e5ff', main: '#a66bff', edge: '#4a1d96', glow: 'rgba(150,80,255,' }),
  ascendant: Object.freeze({ core: '#fffde7', main: '#ffd54f', edge: '#b8860b', glow: 'rgba(255,214,80,' })
};
export function registerFormPalette(id, palette) { FORM_PALETTES[id] = Object.freeze({ ...palette }); }

const targetable = (t) => t && !t.isDead && (!t.lifeState || t.lifeState === 'Alive') && !t.isObjective && !t.isProp;

// Hit every hostile target matching `inside(target, dx, dzPx)` once per hit set.
function hitTargets(spell, gameWorld, inside, { damage, kx = 0, lift = 0, stun = .3, crit = false }) {
  let hits = 0;
  for (const target of gameWorld.getHostileTargets(spell.team).filter(targetable)) {
    if (spell.hitSet.has(target)) continue;
    const dx = target.x - spell.x; const dz = ((target.z ?? spell.z) - spell.z) * DEPTH_PX;
    if (!inside(target, dx, dz)) continue;
    spell.hitSet.add(target);
    const dir = Math.sign(dx) || spell.facing;
    target.takeDamage(damage, typeof kx === 'function' ? kx(dir, target) : kx * dir, lift, stun, crit, 'spell');
    spell.onHit?.(target);
    hits++;
  }
  return hits;
}

// One generic technique: `kind` selects behaviour and look.
export class FormStrikeSpell {
  constructor(caster, config) {
    this.caster = caster; this.team = caster.team; this.facing = caster.facing || 1;
    this.form = config.form; this.palette = FORM_PALETTES[config.form] ?? FORM_PALETTES.ascendant;
    this.kind = config.kind; this.cfg = config;
    this.x = caster.x + this.facing * (config.offset ?? 0); this.z = caster.z;
    this.surfaceHeight = caster.surfaceHeight ?? 0;
    this.t = 0; this.life = config.life ?? .6; this.isFinished = false;
    this.hitSet = new Set(); this.events = config.events ? config.events.map((e) => ({ ...e, done: false })) : [];
    this.damage = config.damage ?? 30;
  }
  get y() { return groundYForDepth(this.z) - this.surfaceHeight; }

  update(dt, gameWorld) {
    this.t += dt;
    const c = this.cfg; const p = this.t / this.life;
    switch (this.kind) {
      case 'burst': {
        // A close strike (claw / blade / fist) right in front: hits once.
        if (!this.done) {
          this.done = true;
          hitTargets(this, gameWorld, (t, dx, dz) => dx * this.facing > -12 && Math.abs(dx) <= c.reach && Math.abs(dz) <= (c.depth ?? 26) && Math.abs((t.worldHeight ?? 0) - (this.caster.worldHeight ?? 0)) < (c.height ?? 130),
            { damage: this.damage, kx: c.kx ?? 200, lift: c.lift ?? 0, stun: c.stun ?? .35, crit: !!c.crit });
        }
        break;
      }
      case 'cone': {
        // A wide cone wave travelling low over the ground.
        const reach = c.range * Math.min(1, p * 1.6);
        hitTargets(this, gameWorld, (t, dx, dz) => dx * this.facing > 0 && Math.hypot(dx, dz) <= reach && Math.abs(dz) <= Math.abs(dx) * .75 + 16,
          { damage: this.damage, kx: c.kx ?? 260, lift: c.lift ?? 40, stun: .3 });
        break;
      }
      case 'ring': {
        // Expanding rings around the point; each ring event hits once.
        for (const e of this.events) {
          if (e.done || this.t < e.at) continue;
          e.done = true; this.hitSet = new Set();
          combat.spawnShockwave(this.x, this.y - 6, e.radius, this.palette.main);
          combat.shakeCamera(e.shake ?? 4, .2);
          hitTargets(this, gameWorld, (t, dx, dz) => Math.hypot(dx, dz) <= e.radius + (t.radius ?? 12),
            { damage: e.damage ?? this.damage, kx: e.kx ?? 220, lift: e.lift ?? 60, stun: e.stun ?? .35, crit: !!e.crit });
        }
        break;
      }
      case 'pillar': {
        // A vertical column in front: holds targets in the air (multi-hit),
        // then a final launch.
        const px = this.x; const inPillar = (t, dx, dz) => Math.abs(dx) <= c.width && Math.abs(dz) <= 30;
        this.tickTimer = (this.tickTimer ?? 0) - dt;
        if (this.tickTimer <= 0 && this.t < this.life - .2) {
          this.tickTimer = c.tick ?? .14; this.hitSet = new Set();
          hitTargets(this, gameWorld, inPillar, { damage: this.damage * .22, kx: 0, lift: 140, stun: .3 });
        }
        if (!this.launched && this.t >= this.life - .2) {
          this.launched = true; this.hitSet = new Set();
          hitTargets(this, gameWorld, inPillar, { damage: this.damage, kx: 120, lift: 520, stun: .7, crit: true });
          combat.spawnShockwave(px, this.y - 120, 60, this.palette.core);
          combat.shakeCamera(9, .3);
        }
        break;
      }
      case 'sequence': {
        // Several small explosions on points (e.g. tails slamming around the
        // caster), then a final large ring.
        for (const e of this.events) {
          if (e.done || this.t < e.at) continue;
          e.done = true;
          const ex = this.x + (e.dx ?? 0) * this.facing; const ez = this.z + (e.dz ?? 0);
          combat.spawnShockwave(ex, groundYForDepth(ez) - 6, e.radius, e.final ? this.palette.core : this.palette.main);
          combat.spawnHitSparks(ex, groundYForDepth(ez) - 12, this.facing, this.palette.main, e.final ? 16 : 6);
          combat.shakeCamera(e.final ? 10 : 3, .2);
          const hitNow = new Set();
          for (const target of gameWorld.getHostileTargets(this.team).filter(targetable)) {
            const d = Math.hypot(target.x - ex, ((target.z ?? ez) - ez) * DEPTH_PX);
            if (d > e.radius + (target.radius ?? 12) || hitNow.has(target)) continue;
            hitNow.add(target);
            target.takeDamage(e.final ? this.damage : this.damage * .2, Math.sign(target.x - ex || this.facing) * (e.final ? 360 : 60), e.final ? 300 : 110, .4, !!e.final, 'spell');
            this.onHit?.(target);
          }
        }
        break;
      }
      case 'wall': {
        // A vertical energy wall rolling forward: multi-hit, then a burst on top.
        this.wallX = this.x + this.facing * c.speed * Math.min(this.t, c.travel);
        this.tickTimer = (this.tickTimer ?? 0) - dt;
        const inWall = (t) => Math.abs(t.x - this.wallX) <= 24 && Math.abs(((t.z ?? this.z) - this.z) * DEPTH_PX) <= 34;
        if (this.tickTimer <= 0 && this.t < this.life - .18) {
          this.tickTimer = .12; this.hitSet = new Set();
          hitTargets(this, gameWorld, (t) => inWall(t), { damage: this.damage * .18, kx: 80, lift: 90, stun: .3 });
        }
        if (!this.burst && this.t >= this.life - .18) {
          this.burst = true; this.hitSet = new Set();
          hitTargets(this, gameWorld, (t) => inWall(t), { damage: this.damage, kx: 200, lift: 480, stun: .6, crit: true });
          combat.spawnShockwave(this.wallX, this.y - 150, 54, this.palette.core);
        }
        break;
      }
      default: break;
    }
    if (this.t >= this.life) this.isFinished = true;
  }

  render(ctx) {
    const pal = this.palette; const c = this.cfg; const p = Math.min(1, this.t / this.life);
    const y = this.y; const fade = 1 - p;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    switch (this.kind) {
      case 'burst': {
        // Giant claw / blade / fist arc in front of the caster.
        ctx.translate(this.x, y - (c.arcY ?? 50)); ctx.scale(this.facing, 1);
        ctx.strokeStyle = pal.glow + (.7 * fade) + ')'; ctx.lineWidth = 16 * fade + 4;
        ctx.beginPath(); ctx.arc(0, 0, c.reach * .7, c.arcFrom ?? -1.2, c.arcTo ?? 1.0); ctx.stroke();
        ctx.strokeStyle = pal.core; ctx.globalAlpha = fade; ctx.lineWidth = 3;
        for (let i = 0; i < (c.claws ?? 1); i++) { ctx.beginPath(); ctx.arc(0, 0, c.reach * (.55 + i * .1), c.arcFrom ?? -1.2, c.arcTo ?? 1.0); ctx.stroke(); }
        break;
      }
      case 'cone': {
        const reach = c.range * Math.min(1, p * 1.6);
        ctx.translate(this.x, y); ctx.scale(this.facing, 1);
        ctx.fillStyle = pal.glow + (.35 * fade) + ')';
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(reach, -20 - reach * .35); ctx.lineTo(reach, 10 + reach * .12); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = pal.core; ctx.globalAlpha = fade; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(-10, -8, reach, -.38, .2); ctx.stroke();
        break;
      }
      case 'pillar': {
        const h = 210 * Math.min(1, p * 3);
        const w = c.width * (1 + Math.sin(this.t * 30) * .08);
        const g = ctx.createLinearGradient?.(0, y, 0, y - h);
        if (g) { g.addColorStop(0, pal.glow + '.7)'); g.addColorStop(1, pal.glow + '0)'); ctx.fillStyle = g; } else ctx.fillStyle = pal.glow + '.5)';
        ctx.fillRect(this.x - w, y - h, w * 2, h);
        ctx.fillStyle = pal.core; ctx.globalAlpha = .8 * fade + .2;
        ctx.fillRect(this.x - w * .25, y - h, w * .5, h);
        break;
      }
      case 'wall': {
        const wx = this.wallX ?? this.x; const h = 180;
        ctx.fillStyle = pal.glow + (.45 * fade + .15) + ')';
        ctx.beginPath(); ctx.moveTo(wx - 8, y); ctx.lineTo(wx - 14, y - h); ctx.lineTo(wx + 14, y - h); ctx.lineTo(wx + 8, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = pal.core; ctx.fillRect(wx - 3, y - h, 6, h);
        break;
      }
      case 'ring':
      case 'sequence': {
        // Telegraph: glowing marks where hits will land.
        for (const e of this.events) {
          if (e.done) continue;
          const ex = this.x + (e.dx ?? 0) * this.facing; const ez = this.z + (e.dz ?? 0);
          const k = Math.min(1, this.t / Math.max(.01, e.at));
          ctx.strokeStyle = pal.glow + (.3 + .5 * k) + ')'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(ex, groundYForDepth(ez) - this.surfaceHeight, (e.radius ?? 30) * k, (e.radius ?? 30) * .3 * k, 0, 0, Math.PI * 2); ctx.stroke();
        }
        break;
      }
      default: break;
    }
    ctx.restore();
  }
}

// Ring of points around the caster (for tail slams).
function slamPoints(count, radius, startAt, gap) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return { at: startAt + i * gap, dx: Math.cos(a) * radius, dz: Math.sin(a) * radius / DEPTH_PX * .8, radius: 34 };
  });
}

// The six techniques of each form: [direction][tier] → spell factory.
// Extensible: buff transformations add their movesets at load.
export const FORM_MOVESETS = {
  ninefold: {
    name: 'NINEFOLD BEAST',
    forward: {
      // Risswild: short = the exploding rift core, full = the broad rift beam.
      short: { name: 'RIFT CORE', recoil: 90, make: (p) => new BeastBombSpell(p, .45) },
      full: { name: 'RIFT BEAM', beam: 'rift_beam' }
    },
    up: {
      short: { name: 'CHAKRA UPPERCUT', make: (p) => new FormStrikeSpell(p, { form: 'ninefold', kind: 'burst', reach: 70, damage: 30, kx: 60, lift: 520, stun: .55, arcFrom: -2.2, arcTo: .2, arcY: 60, claws: 3, life: .3 }) },
      full: { name: 'TWIN BEAST ASCENSION', make: (p) => new FormStrikeSpell(p, { form: 'ninefold', kind: 'pillar', width: 34, damage: 70, life: 1.0, offset: 46, tick: .14 }) }
    },
    down: {
      short: { name: 'TAIL SWEEP', make: (p) => new FormStrikeSpell(p, { form: 'ninefold', kind: 'ring', life: .35, events: [{ at: .06, radius: 90, damage: 26, kx: 300, lift: 90 }] }) },
      full: { name: 'TAILED BEAST SLAM', make: (p) => new FormStrikeSpell(p, { form: 'ninefold', kind: 'sequence', damage: 80, life: 1.35, events: [...slamPoints(8, 95, .1, .09), { at: .9, dx: 70, dz: 0, radius: 48 }, { at: 1.08, dx: 0, dz: 0, radius: 170, final: true }] }) }
    }
  },
  eidolon: {
    name: 'EIDOLON GUARDIAN',
    forward: {
      short: { name: 'SPECTRAL ARROW', make: (p) => new SpiritArrowSpell(p, .25, { pierce: false }) },
      full: { name: 'ASTRAL SIEGE ARROW', make: (p) => new SpiritArrowSpell(p, 1, { pierce: true, explodeAtEnd: true }) }
    },
    up: {
      short: { name: 'RISING BLADE', make: (p) => new FormStrikeSpell(p, { form: 'eidolon', kind: 'burst', reach: 84, damage: 32, kx: 50, lift: 500, stun: .55, arcFrom: -2.4, arcTo: .3, arcY: 70, life: .3 }) },
      full: { name: 'HEAVEN SPLITTER', make: (p) => new FormStrikeSpell(p, { form: 'eidolon', kind: 'wall', speed: 260, travel: .7, damage: 78, life: 1.0, offset: 40 }) }
    },
    down: {
      short: { name: 'TITAN STOMP', make: (p) => new FormStrikeSpell(p, { form: 'eidolon', kind: 'ring', life: .35, events: [{ at: .05, radius: 80, damage: 22, kx: 140, lift: 30, stun: .5 }] }) },
      full: { name: "TITAN'S JUDGMENT", make: (p) => new FormStrikeSpell(p, { form: 'eidolon', kind: 'ring', life: 1.1, events: [{ at: .18, radius: 110, damage: 45, kx: 120, lift: 260, shake: 9 }, { at: .75, radius: 185, damage: 70, kx: 420, lift: 220, shake: 13, crit: true }] }) }
    }
  },
  ascendant: {
    name: 'FOCUS ASCENDANT',
    forward: {
      short: { name: 'RADIANT WAVE', make: (p) => new FormStrikeSpell(p, { form: 'ascendant', kind: 'cone', range: 260, damage: 36, kx: 280, lift: 50, life: .45, offset: 20 }) },
      full: { name: 'ANNIHILATION BEAM', beam: 'annihilation_beam' }
    },
    up: {
      short: { name: 'ASCENDING STRIKE', make: (p) => new FormStrikeSpell(p, { form: 'ascendant', kind: 'burst', reach: 76, damage: 32, kx: 60, lift: 520, stun: .55, arcFrom: -2.3, arcTo: .2, arcY: 60, life: .3 }) },
      full: { name: 'HEAVEN PILLAR', make: (p) => new FormStrikeSpell(p, { form: 'ascendant', kind: 'pillar', width: 38, damage: 74, life: 1.0, offset: 50, tick: .14 }) }
    },
    down: {
      short: { name: 'LIGHT NOVA', make: (p) => new FormStrikeSpell(p, { form: 'ascendant', kind: 'ring', life: .35, events: [{ at: .05, radius: 100, damage: 26, kx: 260, lift: 80 }] }) },
      full: { name: 'STARFALL CRASH', make: (p) => new FormStrikeSpell(p, { form: 'ascendant', kind: 'sequence', damage: 84, life: 1.25, events: [...slamPoints(6, 110, .12, .1), { at: 1.0, dx: 0, dz: 0, radius: 180, final: true }] }) }
    }
  }
};

// Which moveset is active: a manifest overrides the transformation.
export function activeMoveset(player) {
  // A signature stance with its own heavies (Himmelsregent) leads while it lasts.
  const sigSet = player.signature?.impl?.stance?.moveset;
  if (sigSet && FORM_MOVESETS[sigSet]) return sigSet;
  // A generic buff transformation (T01–T40) owns the moveset while it lasts.
  if (player.buffForm?.timer > 0 && FORM_MOVESETS[player.buffForm.id]) return player.buffForm.id;
  if (player.ninefoldTimer > 0) return 'ninefold';
  if (player.eidolonTimer > 0) return 'eidolon';
  if (player.focusTransformTimer > 0) return 'ascendant';
  return null;
}

// Release a form technique. Returns the technique name or null.
export function releaseFormTechnique(player, gameWorld, spellSystem, direction, full) {
  const formId = activeMoveset(player);
  if (!formId) return null;
  const dir = FORM_MOVESETS[formId][direction] ? direction : 'forward';
  const technique = FORM_MOVESETS[formId][dir][full ? 'full' : 'short'];
  if (technique.beam) {
    spellSystem.cast(player, { id: technique.beam, tier: 3, name: technique.name }, gameWorld);
  } else {
    spellSystem.addSpell(technique.make(player), 'B');
  }
  if (technique.recoil) player.kbVelX = -(player.facing || 1) * technique.recoil;
  audio.playSpell?.(formId === 'ninefold' ? 'ignis' : formId === 'eidolon' ? 'void_bolt' : 'focus_ascendant');
  gameWorld?.showAnnouncement?.(technique.name, .8);
  return technique.name;
}
