// GRIMGE Prototype — sky spheres (field spells).
//
// A sky sphere is summoned into the sky for a while and changes the whole
// battlefield, a little like a field spell: light, shadow length, element
// strength and a few periodic events. Exactly one sphere rules the sky; a
// new one replaces the old. Element multipliers apply to every caster —
// a Lunar Orb also strengthens the enemy's ice — so the choice is tactical.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';
import { spellRunes } from './spell_catalog.js';
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
import { SPELL_SPRITE_SHEETS } from './spell_sprite_sheets.js';
// Hand-drawn sky spheres (art/authoring/vfx_sky.cjs), drawn for a radius of 34; aurora stays procedural.
const SKY_SHEETS = Object.freeze({ sun: 'sky_sun', moon: 'sky_moon', bloodmoon: 'sky_bloodmoon', eclipse: 'sky_eclipse', cloud: 'sky_cloud', stars: 'sky_stars' });

const DEFAULT_SHADOW = Object.freeze({ scale: 1, alpha: 1, color: '0,0,0', stretch: 1 });

export const SKY_FIELDS = Object.freeze({
  solar_orb: Object.freeze({
    name: 'SOLAR ORB', body: 'sun', color: '#ffca28', duration: 16,
    shadow: { scale: .75, alpha: .9, color: '20,10,0', stretch: .9 },
    overlay: { color: '255,214,120', alpha: .12, mode: 'lighter' },
    elements: { ignis: 1.25, lux: 1.3, aqua: .85, umbra: .75 },
    env: { fireLife: 1.3, iceLife: .55 }, bindRange: .85
  }),
  lunar_orb: Object.freeze({
    name: 'LUNAR ORB', body: 'moon', color: '#b3c7ff', duration: 16,
    shadow: { scale: 1.45, alpha: 1.15, color: '8,8,36', stretch: 1.35 },
    overlay: { color: '16,24,70', alpha: .38 },
    elements: { aqua: 1.25, umbra: 1.3, fulgur: 1.1, ignis: .8 },
    env: { shockMult: 1.4, waterSlow: .72, iceLife: 1.4, fireLife: .8 },
    tide: { interval: 2.4, radius: 48 }, bindBonus: 1, bindRange: 1.25
  }),
  eclipse: Object.freeze({
    name: 'ECLIPSE', body: 'eclipse', color: '#ffd54f', duration: 14,
    shadow: { scale: 1.8, alpha: 1.3, color: '0,0,0', stretch: 1.6 },
    overlay: { color: '8,6,20', alpha: .42 },
    elements: { lux: 1.35, umbra: 1.35, void: 1.1, ignis: .9, aqua: .9, fulgur: .9, terra: .9, ventus: .9 },
    bindBonus: 1, bindRange: 1.15
  }),
  thunderhead: Object.freeze({
    name: 'THUNDERHEAD', body: 'cloud', color: '#90a4ae', duration: 15,
    shadow: { scale: 1.15, alpha: .95, color: '0,0,0', stretch: 1 },
    overlay: { color: '28,34,46', alpha: .34 },
    elements: { fulgur: 1.25, ignis: .85 },
    env: { fireLife: .55, shockMult: 1.2 },
    strike: { interval: 1.7, telegraph: .6, damage: 26, radius: 40 }
  }),
  blood_moon: Object.freeze({
    name: 'BLOOD MOON', body: 'bloodmoon', color: '#e53935', duration: 15,
    shadow: { scale: 1.4, alpha: 1.1, color: '80,0,0', stretch: 1.3 },
    overlay: { color: '90,0,12', alpha: .28 },
    globalPower: 1.2, heal: .5, summonPower: 1.25
  }),
  starfall: Object.freeze({
    name: 'STARFALL', body: 'stars', color: '#e1f5fe', duration: 14,
    shadow: { scale: 1.2, alpha: .9, color: '10,10,40', stretch: 1.1 },
    overlay: { color: '14,16,52', alpha: .3 },
    elements: { lux: 1.15 },
    star: { interval: .85, telegraph: .7, damage: 22, radius: 46 }
  }),
  aurora_veil: Object.freeze({
    name: 'AURORA VEIL', body: 'aurora', color: '#69f0ae', duration: 18,
    shadow: { scale: 1.1, alpha: .85, color: '0,24,28', stretch: 1 },
    overlay: { color: '8,40,48', alpha: .22 },
    elements: { aqua: 1.15 },
    regen: { hp: 5, mp: 4 }
  })
});

export function isSkyField(spellId) { return !!SKY_FIELDS[spellId]; }

export class SkySystem {
  constructor() {
    this.active = null;
    this.columns = [];
    this.events = [];
  }

  clear() {
    this.active = null; this.columns = []; this.events = [];
    environment.skyMods = null;
  }

  get def() { return this.active?.def ?? null; }

  // Summon (or replace) the sphere. Returns the active field.
  cast(caster, spellId, quality = { duration: 1 }, gameWorld = null) {
    const def = SKY_FIELDS[spellId];
    if (!def) return null;
    const duration = def.duration * (quality.duration ?? 1) * (caster?.buildModifiers?.skyDuration ?? 1);
    const replaced = this.active?.id ?? null;
    this.active = { id: spellId, def, team: caster?.team ?? null, owner: caster ?? null, timer: duration, maxTimer: duration, t: 0, eventTimer: 1, tideTimer: 1 };
    this.events = [];
    environment.skyMods = def.env ?? null;
    // A pillar of light carries the sphere into the sky.
    if (caster) this.columns.push({ x: caster.x, z: caster.z, surfaceHeight: caster.surfaceHeight ?? 0, color: def.color, t: 0 });
    combat.shakeCamera(6, .35);
    audio.playRuneChime?.(880);
    gameWorld?.showAnnouncement?.(replaced && replaced !== spellId ? `${def.name} REPLACES ${SKY_FIELDS[replaced].name}` : `${def.name} RISES`, 1.2);
    return this.active;
  }

  // ── gameplay hooks ───────────────────────────────────────────────────
  // Element multiplier for a spell (average over its distinct runes).
  powerMultiplier(spellDef) {
    const def = this.def;
    if (!def) return 1;
    let multiplier = def.globalPower ?? 1;
    const runes = [...new Set(spellRunes(spellDef?.id))];
    if (def.elements && runes.length) multiplier *= runes.reduce((sum, rune) => sum + (def.elements[rune] ?? 1), 0) / runes.length;
    return multiplier;
  }

  healMultiplier() { return this.def?.heal ?? 1; }
  summonPower(team) { return this.def?.summonPower && this.active.team === team ? this.def.summonPower : 1; }
  bindBonus() { return this.def?.bindBonus ?? 0; }
  bindRange() { return this.def?.bindRange ?? 1; }
  shadowStyle() {
    const def = this.def;
    if (!def) return DEFAULT_SHADOW;
    // Fade the shadow change in and out with the sphere.
    const k = this.visibility();
    const s = def.shadow;
    const mix = (a, b) => a + (b - a) * k;
    return { scale: mix(1, s.scale), alpha: mix(1, s.alpha), color: k > .5 ? s.color : DEFAULT_SHADOW.color, stretch: mix(1, s.stretch) };
  }

  visibility() {
    const a = this.active;
    if (!a) return 0;
    return Math.max(0, Math.min(1, a.t / .8, a.timer / .8));
  }

  update(dt, gameWorld) {
    for (const column of this.columns) column.t += dt;
    this.columns = this.columns.filter((column) => column.t < 1.1);
    for (const event of this.events) event.t += dt;
    const a = this.active;
    if (!a) { this.events = []; return; }
    a.t += dt; a.timer -= dt;
    if (a.timer <= 0) {
      gameWorld?.showAnnouncement?.(`${a.def.name} FADES`, .9);
      this.active = null; this.events = [];
      environment.skyMods = null;
      return;
    }
    const def = a.def;
    const foes = () => (gameWorld?.getHostileMobileTargets?.(a.team) ?? []).filter((actor) => !actor.isDead && actor.lifeState !== 'Dead' && !actor.burrowed);
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    // Periodic strikes: storm lightning or falling stars on an enemy.
    const periodic = def.strike ?? def.star;
    if (periodic) {
      a.eventTimer -= dt;
      if (a.eventTimer <= 0) {
        a.eventTimer = periodic.interval;
        const target = pick(foes());
        if (target) this.events.push({ kind: def.strike ? 'strike' : 'star', x: target.x + (Math.random() - .5) * 30, z: target.z, t: 0, hit: false, ...periodic });
      }
    }
    for (const event of this.events) {
      if (event.hit || event.t < event.telegraph) continue;
      event.hit = true;
      this.resolveImpact(event, a, gameWorld);
    }
    this.events = this.events.filter((event) => event.t < event.telegraph + .5);
    // Lunar tide: water wells up beneath the enemies.
    if (def.tide) {
      a.tideTimer -= dt;
      if (a.tideTimer <= 0) {
        a.tideTimer = def.tide.interval;
        const target = pick(foes());
        if (target) environment.add('water', target.x, target.z, { radius: def.tide.radius });
      }
    }
    // Aurora: the owner's side regenerates.
    if (def.regen) {
      for (const ally of this.alliesOf(gameWorld, a.team)) {
        if (Number.isFinite(ally.hp) && ally.hp < ally.maxHp) ally.hp = Math.min(ally.maxHp, ally.hp + def.regen.hp * this.healMultiplier() * dt);
        if (Number.isFinite(ally.mp)) ally.mp = Math.min(ally.maxMp ?? 100, ally.mp + def.regen.mp * dt);
      }
    }
  }

  alliesOf(gameWorld, team) {
    if (!gameWorld) return [];
    const list = [gameWorld.player, gameWorld.enemyChampion, ...(gameWorld.minions ?? [])];
    return list.filter((actor) => actor && actor.team === team && !actor.isDead && actor.lifeState !== 'Dead' && !actor.isTrainingDummy);
  }

  resolveImpact(event, field, gameWorld) {
    const y = groundYForDepth(event.z);
    if (event.kind === 'strike') {
      environment.spawnFx('fx_lightning', event.x, event.z, { duration: .5, scale: 2 });
      environment.electrify(event.x, event.z, event.radius, field.team, event.damage * .6, gameWorld);
      combat.shakeCamera(7, .25);
      audio.playImpact?.(true);
    } else {
      combat.spawnShockwave(event.x, y, event.radius * 1.2, '#e1f5fe');
      combat.spawnHitSparks(event.x, y - 6, 1, '#fff9c4', 10);
      audio.playImpact?.(false);
    }
    for (const target of gameWorld?.getHostileTargets?.(field.team) ?? []) {
      if (target.isDead || target.lifeState === 'Dead' || target.isObjective) continue;
      if (Math.hypot(target.x - event.x, ((target.z ?? event.z) - event.z) * 150) > event.radius + (target.radius ?? 14)) continue;
      target.takeDamage(event.damage, Math.sign(target.x - event.x || 1) * 90, 120, .3, false, 'spell');
    }
  }

  // ── rendering ────────────────────────────────────────────────────────
  // World space: light pillars and telegraphed strikes / stars.
  renderWorld(ctx) {
    const now = performance.now() * .001;
    ctx.save();
    for (const column of this.columns) {
      const k = column.t / 1.1;
      const groundY = groundYForDepth(column.z) - column.surfaceHeight;
      const w = 26 * (1 - k * .6);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexToRgba(column.color, .5 * (1 - k));
      ctx.fillRect(column.x - w / 2, groundY - 900, w, 900);
      ctx.fillStyle = `rgba(255,255,255,${.6 * (1 - k)})`;
      ctx.fillRect(column.x - w / 6, groundY - 900, w / 3, 900);
      ctx.globalCompositeOperation = 'source-over';
    }
    for (const event of this.events) {
      const y = groundYForDepth(event.z);
      if (!event.hit) {
        const k = event.t / event.telegraph;
        ctx.strokeStyle = event.kind === 'strike' ? `rgba(255,235,59,${.4 + k * .5})` : `rgba(225,245,254,${.4 + k * .5})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(event.x, y, event.radius, event.radius * .3, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(event.x, y, event.radius * k, event.radius * .3 * k, 0, 0, Math.PI * 2); ctx.stroke();
        if (event.kind === 'star') {
          // The star streaks down along a slanted path.
          const sx = event.x - 220 * (1 - k); const sy = y - 520 * (1 - k);
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(179,229,252,${.7 * k})`; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(sx - 60, sy - 140); ctx.lineTo(sx, sy); ctx.stroke();
          ctx.fillStyle = '#fffde7';
          ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
      } else if (event.kind === 'star') {
        const k = Math.min(1, (event.t - event.telegraph) / .5);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,253,231,${.8 * (1 - k)})`;
        ctx.beginPath(); ctx.ellipse(event.x, y, event.radius * (1 + k), event.radius * .3 * (1 + k), 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    void now;
    ctx.restore();
  }

  // Screen space: tint the battlefield, then draw the sphere in the sky.
  renderScreen(ctx, viewW, viewH, worldY = 0) {
    const a = this.active;
    if (!a) return;
    const k = this.visibility();
    const def = a.def;
    const t = a.t;
    ctx.save();
    if (def.overlay) {
      ctx.globalCompositeOperation = def.overlay.mode ?? 'source-over';
      ctx.fillStyle = `rgba(${def.overlay.color},${def.overlay.alpha * k})`;
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.globalCompositeOperation = 'source-over';
    }
    // Lightning flashes under the storm cloud.
    if (def.strike && this.events.some((event) => event.hit && event.t - event.telegraph < .12)) {
      ctx.fillStyle = `rgba(255,255,240,${.25 * k})`;
      ctx.fillRect(0, 0, viewW, viewH);
    }
    ctx.globalAlpha = k;
    // Right-hand sky above the arena wall, clear of the top HUD.
    const cx = viewW * .86; const cy = worldY + 175; const r = 34;
    // Chunky pixel look: snap the sphere to a coarse grid.
    const px = Math.max(2, Math.round(Math.min(viewW, 1600) / 400));
    drawSkyBody(ctx, def.body, cx, cy, r, t, viewW, px);
    // A thin remaining-time arc under the sphere.
    ctx.globalAlpha = .55 * k;
    ctx.strokeStyle = def.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (a.timer / a.maxTimer)); ctx.stroke();
    ctx.restore();
  }
}

function hexToRgba(hex, alpha) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Filled disc snapped to `px` blocks (pixel-art sphere).
function pixelDisc(ctx, cx, cy, r, px, fill) {
  ctx.fillStyle = fill;
  for (let y = -r; y <= r; y += px) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)) / px) * px;
    if (half <= 0) continue;
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, px);
  }
}

// A halo in three hard steps (pixel style, no soft gradient — user, 27 Oct 2026: "alles in Optik verbessern").
function glow(ctx, cx, cy, r, color, alpha) {
  for (const [k, a] of [[1, .25], [.72, .5], [.45, .8]]) { ctx.fillStyle = hexToRgba(color, alpha * a); ctx.beginPath(); ctx.arc(Math.round(cx), Math.round(cy), Math.round(r * k), 0, Math.PI * 2); ctx.fill(); }
}

function drawSkyBody(ctx, body, cx, cy, r, t, viewW, px) {
  const sheet = SKY_SHEETS[body];
  if (sheet && spellSheetReady(sheet)) { const frames = SPELL_SPRITE_SHEETS[sheet]?.frames ?? 1; drawSpellSprite(ctx, sheet, Math.floor(t * 8) % frames, cx, cy, { anchor: 'center', scale: r / 34 }); return; }
  switch (body) {
    case 'sun': {
      glow(ctx, cx, cy, r * 3.2, '#ffca28', .55);
      ctx.fillStyle = '#ffe082';
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2 + t * .4;
        const len = r * (1.45 + (i % 2) * .3);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        ctx.fillRect(r * .9, -px, len - r * .9, px * 2);
        ctx.restore();
      }
      pixelDisc(ctx, cx, cy, r, px, '#ffb300');
      pixelDisc(ctx, cx - px, cy - px, r * .8, px, '#ffe082');
      pixelDisc(ctx, cx - r * .25, cy - r * .25, r * .35, px, '#fff8e1');
      break;
    }
    case 'moon':
    case 'bloodmoon': {
      const blood = body === 'bloodmoon';
      glow(ctx, cx, cy, r * 2.8, blood ? '#e53935' : '#b3c7ff', .45);
      pixelDisc(ctx, cx, cy, r, px, blood ? '#8e1b1b' : '#9fa8da');
      pixelDisc(ctx, cx - px, cy - px, r * .9, px, blood ? '#c62828' : '#e8eaf6');
      for (const [ox, oy, cr] of [[-.3, -.2, .22], [.25, .15, .28], [-.05, .45, .14], [.38, -.35, .12]]) pixelDisc(ctx, cx + ox * r, cy + oy * r, r * cr, px, blood ? '#7f0000' : '#c5cae9');
      break;
    }
    case 'eclipse': {
      glow(ctx, cx, cy, r * 3, '#ffe082', .5);
      pixelDisc(ctx, cx, cy, r * 1.18, px, '#fff3c4');
      ctx.fillStyle = '#ffd54f';
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + Math.sin(t * 1.3 + i) * .1;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        ctx.fillRect(r * 1.1, -px / 2, r * (.35 + .25 * Math.abs(Math.sin(t * 2 + i))), px);
        ctx.restore();
      }
      pixelDisc(ctx, cx + px, cy, r, px, '#0b0614');
      break;
    }
    case 'cloud': {
      for (const [ox, oy, cr, col] of [[-1.6, .25, .7, '#263238'], [1.5, .3, .75, '#263238'], [-.7, -.15, .95, '#37474f'], [.6, -.25, 1.05, '#37474f'], [0, .3, .9, '#455a64']]) {
        pixelDisc(ctx, cx + ox * r + Math.sin(t * .5 + ox) * 3, cy + oy * r, r * cr, px, col);
      }
      if (Math.sin(t * 9) > .93) {
        ctx.fillStyle = '#fff59d';
        let x = cx; let y = cy + r * .8;
        for (let i = 0; i < 5; i++) { const nx = x + (i % 2 ? px * 3 : -px * 2); ctx.fillRect(Math.min(x, nx), y, Math.abs(nx - x) + px, px * 3); x = nx; y += px * 3; }
      }
      break;
    }
    case 'stars': {
      for (let i = 0; i < 46; i++) {
        const sx = (i * 137.5) % viewW; const sy = cy - 50 + ((i * 53) % 110);
        const tw = .4 + .6 * Math.abs(Math.sin(t * 2 + i));
        ctx.fillStyle = `rgba(255,253,231,${tw})`;
        ctx.fillRect(Math.round(sx), Math.round(sy), px, px);
      }
      glow(ctx, cx, cy, r * 2, '#b3e5fc', .4);
      ctx.fillStyle = '#e1f5fe';
      for (const [ox, oy] of [[0, 0], [-.6, .3], [.55, .35], [-.2, -.55], [.3, -.4]]) {
        ctx.fillRect(Math.round(cx + ox * r - px), Math.round(cy + oy * r - px * 3), px * 2, px * 6);
        ctx.fillRect(Math.round(cx + ox * r - px * 3), Math.round(cy + oy * r - px), px * 6, px * 2);
      }
      break;
    }
    case 'aurora': {
      // Pixel curtains: each column has a bright crest, a solid body and two hard fade steps below (no thin wash).
      const bands = [['105,240,174', '#e8fff2', 0], ['64,196,255', '#e0f6ff', 1.7], ['179,136,255', '#f2e8ff', 3.1]];
      for (const [color, crest, phase] of bands) {
        for (let x = 0; x < viewW; x += px * 2) {
          const y = Math.round(cy - 30 + Math.sin(x * .008 + t * .8 + phase) * 18 + phase * 6);
          const h = Math.round(26 + Math.sin(x * .02 + t * 1.6 + phase) * 10); const fold = Math.sin(x * .05 + t * 2 + phase) > .6;
          ctx.fillStyle = crest; ctx.globalAlpha = .75; ctx.fillRect(x, y, px * 2, px);
          ctx.fillStyle = `rgb(${color})`; ctx.globalAlpha = fold ? .55 : .4; ctx.fillRect(x, y + px, px * 2, Math.round(h * .45));
          ctx.globalAlpha = .25; ctx.fillRect(x, y + px + Math.round(h * .45), px * 2, Math.round(h * .3));
          ctx.globalAlpha = .12; ctx.fillRect(x, y + px + Math.round(h * .75), px * 2, Math.round(h * .25));
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    default: break;
  }
}

export const sky = new SkySystem();
