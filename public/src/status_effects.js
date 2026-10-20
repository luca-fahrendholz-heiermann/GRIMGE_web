// GRIMGE Prototype — element status effects (user, 20 Oct 2026, after Little
// Fighter's ice block): a damaging hit MAY leave a status, never guaranteed —
// a roll per hit like in Pokémon. Each status has a look on the character AND
// a gameplay effect:
//   frozen     trapped in an ice block (no movement / actions)
//   burn       flames on the body, fire damage over time
//   paralysis  electric arcs, the target stutters (short freezes)
//   poison     green bubbles, longer damage over time
//   bleed      dripping blood, damage over time — more while moving
//   wet        soaked (water spells, puddles): no damage, but it sets up combos
//
// Combos (user, 20 Oct 2026) — a matching hit on an existing status:
//   wet + lightning  → SCHOCK!       guaranteed paralysis (+ bonus damage)
//   wet + ice        → SCHOCKFROST!  guaranteed freeze
//   burn + wind      → FEUERSTURM!   the fire jumps to foes nearby
//   burn + water     → GELÖSCHT      steam, the burn ends, the target is wet
//   frozen + a hard hit → ZERSPLITTERT! the ice bursts for bonus damage
//   poison + fire    → GIFTGAS-EXPLOSION the poison blows up, poisons foes nearby
//   bleed + wind     → SCHNITT-WIRBEL  cutting gust, the bleeding spreads
//   paralysis + earth → ERDUNG        the charge discharges: shock ring, paralysis ends
// The hit source (a spell, a melee swing) is set as a context around its
// update, so every takeDamage in the game can roll without extra wiring.
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';

const TAU = Math.PI * 2;

export const STATUS_DEFS = Object.freeze({
  frozen: Object.freeze({ label: 'FROZEN', color: '#80deea', duration: 1.6, immune: 4 }),
  burn: Object.freeze({ label: 'BURN', color: '#ff7043', duration: 3, dps: 5, immune: 1 }),
  paralysis: Object.freeze({ label: 'PARALYSIS', color: '#fff176', duration: 3.2, immune: 2, stutterEvery: .8, stutter: .22 }),
  poison: Object.freeze({ label: 'POISON', color: '#9ccc65', duration: 6, dps: 3, immune: 1 }),
  bleed: Object.freeze({ label: 'BLEED', color: '#e53935', duration: 4, dps: 2, movingDps: 5, immune: 1 }),
  wet: Object.freeze({ label: 'WET', color: '#4fc3f7', duration: 5, immune: 0 })
});

export const COMBO = Object.freeze({ shockBonus: 8, stormRadius: 110, stormBonus: 10, shatterThreshold: 20, shatterBonus: 18, gasBonus: 14, gasSplash: 10, whirlBonus: 12, groundBonus: 16, groundSplash: 10, splashRadius: 95 });

// Which element can cause which status, and how likely per damaging hit.
export const ELEMENT_STATUS = Object.freeze({
  ignis: ['burn', .22],
  aqua: ['wet', .55],
  frost: ['frozen', .18],
  fulgur: ['paralysis', .22],
  natura: ['poison', .18],
  mortis: ['poison', .18],
  blade: ['bleed', .12],
  terra: ['bleed', .08]
});

// Ice spells are aqua / ventus fusions — recognised by their id / name.
const ICE_RE = /ice|frost|glac|freez|cryo|blizz|snow|hail|eis/i;
// Signature specials with an elemental bite (the rest causes no status).
const SIGNATURE_ELEMENTS = Object.freeze({ S42: ['fulgur'], S50: ['frost'], S51: ['blade'], S53: ['blade'] });

// Elements of a cast spell definition (recipe runes + ice detection + signatures).
export function statusElementsOf(def) {
  if (!def) return null;
  const out = new Set(def.elements ?? []);
  if (ICE_RE.test(`${def.id ?? ''} ${def.name ?? ''}`)) out.add('frost');
  for (const el of SIGNATURE_ELEMENTS[def.signatureId ?? def.sigId ?? ''] ?? []) out.add(el);
  return out.size ? [...out] : null;
}

// Blade weapons can cause bleeding.
const BLADE_LOOKS = new Set(['sword', 'katana', 'axe', 'scythe', 'daggers', 'dual', 'spear', 'twinblade', 'spirit_sword', 'spirit_glaive', 'spellblade', 'odachi', 'knife', 'greatsword', 'glaive', 'claw', 'chakram', 'chain_scythe']);
export const isBladeLook = (look) => BLADE_LOOKS.has(look);

// ── hit context ──
let source = null;
export function setStatusSource(src) { const prev = source; source = src; return prev; }
let rng = Math.random;
export function setStatusRandom(fn) { rng = fn ?? Math.random; }

const nowS = () => (globalThis.performance?.now?.() ?? Date.now()) / 1000;
const active = new Set();

export function hasStatus(target, kind) { return !!target?.statuses?.[kind] && !target.statuses[kind].isFinished; }

// Called from every takeDamage after real damage: rolls the source's statuses.
export function onStatusHit(target, amount, hitKind = 'melee') {
  if (hitKind === 'status' || !(amount > 0) || !target) return null;
  if (target.isObjective || target.isStoneWall || target.isProp || target.isCastle) return null;
  // Frozen + a hard hit: the ice shatters (any source, also bare fists and summons).
  if (hasStatus(target, 'frozen') && amount >= COMBO.shatterThreshold) return comboShatter(target);
  if (!source) return null;
  if (source.team && target.team === source.team) return null;
  const elements = source.statusElements;
  if (!elements?.length) return null;
  const combo = tryCombo(target, elements);
  if (combo) return combo;
  const mult = (source.statusChance ?? 1) * (source.quality?.power ?? 1);
  for (const el of elements) {
    const entry = ELEMENT_STATUS[el];
    if (!entry) continue;
    if (rng() < Math.min(.95, entry[1] * mult)) return applyStatus(target, entry[0]);
  }
  return null;
}

// ── combos ──
function comboText(t, text, color) { combat.spawnDamageText?.(t.x, (t.y ?? 0) - 104, text, { color, isCrit: true }); }
// Foes around a target (for spreading combos).
function foesAround(t, radius) {
  const gw = globalThis.window?.gameWorld;
  return (gw?.getHostileTargets?.(source?.team) ?? []).filter((o) => o !== t && !o.isObjective && !o.isProp && !o.isStoneWall && !o.isCastle && Math.hypot(o.x - t.x, ((o.z ?? 0) - (t.z ?? 0)) * 150) < radius);
}
function tryCombo(t, elements) {
  const has = (el) => elements.includes(el);
  if (has('ignis') && hasStatus(t, 'poison')) {
    // The poison cloud ignites.
    t.statuses.poison.end(); statusDamage(t, COMBO.gasBonus);
    for (const o of foesAround(t, COMBO.splashRadius)) { statusDamage(o, COMBO.gasSplash); applyStatus(o, 'poison', { force: true, quiet: true }); }
    combat.spawnShockwave?.(t.x, (t.y ?? 0) - 30, COMBO.splashRadius, '#9ccc65'); combat.spawnShockwave?.(t.x, (t.y ?? 0) - 30, 50, '#ff7043');
    comboText(t, 'GIFTGAS-EXPLOSION!', '#c6ff00');
    return null;
  }
  if (has('ventus') && hasStatus(t, 'bleed')) {
    const bleed = t.statuses.bleed; bleed.dur = Math.max(bleed.dur, bleed.t + STATUS_DEFS.bleed.duration);
    statusDamage(t, COMBO.whirlBonus);
    for (const o of foesAround(t, COMBO.splashRadius)) applyStatus(o, 'bleed', { force: true, quiet: true });
    comboText(t, 'SCHNITT-WIRBEL!', '#ef5350');
    return bleed;
  }
  if (has('terra') && hasStatus(t, 'paralysis')) {
    // Earth grounds the charge: it discharges into a shock ring.
    t.statuses.paralysis.end(); statusDamage(t, COMBO.groundBonus);
    for (const o of foesAround(t, COMBO.splashRadius)) statusDamage(o, COMBO.groundSplash);
    combat.spawnShockwave?.(t.x, (t.y ?? 0) + 2, COMBO.splashRadius, '#fff176');
    comboText(t, 'ERDUNG!', '#fff176');
    return null;
  }
  if (has('fulgur') && hasStatus(t, 'wet')) {
    t.statuses.wet.end();
    const fx = applyStatus(t, 'paralysis', { force: true, quiet: true });
    statusDamage(t, COMBO.shockBonus); comboText(t, 'SCHOCK!', '#fff176');
    combat.spawnHitSparks?.(t.x, (t.y ?? 0) - 40, 1, '#fff59d', 16);
    return fx;
  }
  if (has('frost') && hasStatus(t, 'wet')) {
    t.statuses.wet.end();
    const fx = applyStatus(t, 'frozen', { force: true, quiet: true });
    comboText(t, 'SCHOCKFROST!', '#80deea');
    return fx;
  }
  if (has('ventus') && hasStatus(t, 'burn')) {
    // The wind fans the fire onto every foe nearby.
    const burn = t.statuses.burn; burn.dur = Math.max(burn.dur, burn.t + STATUS_DEFS.burn.duration);
    statusDamage(t, COMBO.stormBonus);
    const gw = globalThis.window?.gameWorld;
    for (const o of gw?.getHostileTargets?.(source.team) ?? []) {
      if (o === t || o.isObjective || o.isProp || o.isStoneWall || o.isCastle) continue;
      if (Math.hypot(o.x - t.x, ((o.z ?? 0) - (t.z ?? 0)) * 150) < COMBO.stormRadius) applyStatus(o, 'burn', { force: true });
    }
    comboText(t, 'FEUERSTURM!', '#ff7043');
    return burn;
  }
  if (has('aqua') && hasStatus(t, 'burn')) {
    const fx = applyStatus(t, 'wet', { quiet: true }); // wet puts the fire out (see applyStatus)
    comboText(t, 'GELÖSCHT', '#b3e5fc');
    return fx;
  }
  return null;
}
function comboShatter(t) {
  t.statuses.frozen.end();
  statusDamage(t, COMBO.shatterBonus);
  comboText(t, 'ZERSPLITTERT!', '#e0f7fa');
  combat.spawnHitSparks?.(t.x, (t.y ?? 0) - 40, 1, '#e0f7fa', 22);
  combat.shakeCamera?.(6, .2);
  return null;
}

// Apply (or refresh) a status. Respects a short immunity after it ended (force = combos ignore it).
export function applyStatus(target, kind, { duration = null, force = false, quiet = false } = {}) {
  const def = STATUS_DEFS[kind];
  if (!def || !target || target.isDead || (target.hp ?? 1) <= 0) return null;
  target.statuses ??= {};
  if (kind === 'burn' && hasStatus(target, 'wet') && !force) return null;
  const current = target.statuses[kind];
  if (current && !current.isFinished) { current.dur = Math.max(current.dur, current.t + (duration ?? def.duration)); return current; }
  if (!force && (target.statusImmuneUntil?.[kind] ?? 0) > nowS()) return null;
  // Water puts out the fire: steam instead of flames.
  if (kind === 'wet' && hasStatus(target, 'burn')) { target.statuses.burn.end(); combat.spawnShockwave?.(target.x, (target.y ?? 0) - 40, 26, '#eceff1'); }
  const fx = new StatusEffectFx(target, kind, duration ?? def.duration);
  target.statuses[kind] = fx; active.add(fx);
  if (kind === 'frozen') target.freeze?.(fx.dur);
  if (!quiet) combat.spawnDamageText?.(target.x, (target.y ?? 0) - 92, def.label, { color: def.color });
  return fx;
}

export function clearStatuses(target = null) {
  for (const fx of [...active]) if (!target || fx.target === target) fx.end();
}

export function updateStatuses(dt) {
  for (const fx of [...active]) { fx.update(dt); if (fx.isFinished) active.delete(fx); }
}

// Painter-order entries: each overlay draws right after (in front of) its target.
export function statusDepthEntries() {
  const out = [];
  for (const fx of active) if (!fx.isFinished && fx.target) out.push({ y: (fx.target.y ?? groundYForDepth(fx.target.z ?? .5)) + .01, render: (ctx) => fx.render(ctx) });
  return out;
}

function statusDamage(t, amount) {
  if (!(amount > 0)) return;
  if (typeof t.takeHazardDamage === 'function') t.takeHazardDamage(amount);
  else t.takeDamage?.(amount, 0, 0, 0, false, 'status');
}

const heightOf = (t) => t.visualHeight ?? (t.isTrainingDummy ? 84 : t.heroKey ? 78 : 56);

export class StatusEffectFx {
  constructor(target, kind, dur) {
    this.target = target; this.kind = kind; this.def = STATUS_DEFS[kind]; this.t = 0; this.dur = dur;
    this.tick = 0; this.stutterT = 0; this.isFinished = false; this.lastX = target.x; this.lastZ = target.z; this.seed = Math.floor(rng() * 1000);
  }
  end() {
    if (this.isFinished) return;
    this.isFinished = true; active.delete(this);
    const t = this.target;
    if (t?.statuses?.[this.kind] === this) delete t.statuses[this.kind];
    if (t) { t.statusImmuneUntil ??= {}; t.statusImmuneUntil[this.kind] = nowS() + this.def.immune; }
    if (this.kind === 'frozen' && t) {
      // The ice bursts into shards.
      combat.spawnHitSparks?.(t.x, (t.y ?? 0) - 40, 1, '#e0f7fa', 14);
      if ((t.freezeTimer ?? 0) > 0) t.freezeTimer = 0;
    }
  }
  update(dt) {
    const t = this.target;
    if (!t || t.isDead || t.lifeState === 'Dead' || t.lifeState === 'Dying' || (t.hp ?? 1) <= 0) { this.end(); return; }
    this.t += dt;
    const def = this.def;
    if (def.dps) {
      this.tick += dt;
      if (this.tick >= .5) {
        this.tick -= .5;
        const moved = Math.hypot(t.x - this.lastX, ((t.z ?? 0) - (this.lastZ ?? 0)) * 150) > 6;
        statusDamage(t, (moved && def.movingDps ? def.movingDps : def.dps) * .5);
        this.lastX = t.x; this.lastZ = t.z;
      }
    }
    if (this.kind === 'paralysis') {
      this.stutterT += dt;
      if (this.stutterT >= def.stutterEvery) { this.stutterT = 0; t.freeze?.(def.stutter); this.flash = .15; }
      this.flash = Math.max(0, (this.flash ?? 0) - dt);
    }
    if (this.kind === 'frozen') { t.vx = 0; t.vz = 0; t.kbVelX = 0; }
    if (this.t >= this.dur) this.end();
  }
  render(ctx) {
    const t = this.target; if (!t || this.isFinished) return;
    const x = t.x; const base = (t.y ?? 0); const h = heightOf(t); const time = this.t;
    const fadeIn = Math.min(1, this.t / .12); const fadeOut = Math.min(1, (this.dur - this.t) / .25);
    ctx.save(); ctx.globalAlpha = fadeIn * fadeOut;
    if (this.kind === 'frozen') drawIceBlock(ctx, x, base, 50, h + 12, time);
    else if (this.kind === 'burn') drawBurn(ctx, x, base, h, time, this.seed);
    else if (this.kind === 'paralysis') drawParalysis(ctx, x, base, h, time, this.seed, this.flash ?? 0);
    else if (this.kind === 'poison') drawPoison(ctx, x, base, h, time, this.seed);
    else if (this.kind === 'bleed') drawBleed(ctx, x, base, h, time, this.seed);
    else if (this.kind === 'wet') drawWet(ctx, x, base, h, time, this.seed);
    ctx.restore();
    // One icon row per target: drawn by its first active status only.
    if (Object.values(t.statuses ?? {}).find((fx) => fx && !fx.isFinished) === this) drawStatusIcons(ctx, t, x, base - h - 30);
  }
}

// ── looks ──
// Little-Fighter-style ice block: a jagged translucent crystal around the whole body.
export function drawIceBlock(ctx, x, base, w, h, time = 0) {
  const l = x - w / 2; const r = x + w / 2; const top = base - h;
  const outline = [[l, base], [l - 3, base - h * .35], [l + 2, top + 10], [l + w * .25, top + 2], [x - 2, top - 6], [x + w * .2, top + 4], [r - 2, top - 2], [r + 3, base - h * .45], [r, base]];
  const path = (pts) => { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); };
  ctx.save();
  ctx.globalAlpha *= .55; ctx.fillStyle = '#4dd0e1'; path(outline); ctx.fill();
  ctx.globalAlpha /= .55; ctx.globalAlpha *= .35; ctx.fillStyle = '#e0f7fa'; path([[l + 4, base - 4], [l + 2, top + 14], [x - 4, top + 2], [x - 10, base - 4]]); ctx.fill();
  ctx.globalAlpha /= .35;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; path(outline); ctx.stroke();
  // Facets.
  ctx.strokeStyle = 'rgba(178,235,242,.9)'; ctx.lineWidth = 1;
  for (const [a, b] of [[[l + 2, top + 10], [x + 4, base - h * .45]], [[x - 2, top - 6], [x + 6, base - h * .45]], [[r + 3, base - h * .45], [x + 6, base - h * .45]], [[x + 6, base - h * .45], [x - 4, base]]]) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  // Glint sweeping over the block.
  const g = (time * .8) % 1; ctx.globalAlpha *= .7; ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(l + 4 + g * (w - 10)), Math.round(top + 8 + g * h * .3), 3, 10);
  // Frost at the base.
  for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(l - 4 + i * (w + 8) / 6), Math.round(base - 2 - (i % 2) * 2), 4, 2);
  ctx.restore();
}

function drawBurn(ctx, x, base, h, time, seed) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const ox = (i - 2) * 9 + Math.sin(time * 9 + i * 1.7 + seed) * 3; const oy = base - h * (.15 + .16 * ((i * 37 + seed) % 5) / 4);
    const fh = 16 + 8 * Math.sin(time * 14 + i * 2.3) ** 2; const fw = 6 + (i % 2) * 2;
    for (const [s, c, a] of [[1, '#ff6d00', .75], [.6, '#ffd54f', .9]]) {
      ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath();
      ctx.moveTo(x + ox - fw * s, oy); ctx.quadraticCurveTo(x + ox - fw * s * .4, oy - fh * s * .6, x + ox + Math.sin(time * 12 + i) * 3, oy - fh * s);
      ctx.quadraticCurveTo(x + ox + fw * s * .4, oy - fh * s * .6, x + ox + fw * s, oy); ctx.closePath(); ctx.fill();
    }
  }
  // Embers.
  for (let i = 0; i < 6; i++) { const ph = (time * 1.4 + i / 6) % 1; ctx.globalAlpha = 1 - ph; ctx.fillStyle = i % 2 ? '#ffab40' : '#fff3e0'; ctx.fillRect(Math.round(x + Math.sin(i * 2.1 + seed) * 16), Math.round(base - h * .4 - ph * h * .9), 2, 2); }
  ctx.restore();
}

function drawParalysis(ctx, x, base, h, time, seed, flash) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const step = Math.floor(time * 20);
  for (let a = 0; a < 3; a++) {
    let s = (step * 31 + a * 97 + seed) % 233; const rnd = () => ((s = (s * 73 + 41) % 233) / 233);
    const cx = x + (rnd() - .5) * 30; const cy = base - h * (.2 + rnd() * .7);
    ctx.strokeStyle = a % 2 ? '#fff59d' : '#4fc3f7'; ctx.lineWidth = 2; ctx.globalAlpha = .9;
    ctx.beginPath(); ctx.moveTo(cx - 12, cy);
    for (let k = 1; k <= 4; k++) ctx.lineTo(cx - 12 + k * 6, cy + (rnd() - .5) * 14);
    ctx.stroke();
  }
  if (flash > 0) { ctx.globalAlpha = flash / .15 * .55; ctx.fillStyle = '#fffde7'; ctx.beginPath(); ctx.ellipse(x, base - h * .5, 22, h * .55, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

function drawPoison(ctx, x, base, h, time, seed) {
  ctx.save();
  ctx.globalAlpha *= .3; ctx.fillStyle = '#558b2f'; ctx.beginPath(); ctx.ellipse(x, base - 2, 22, 6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha /= .3;
  for (let i = 0; i < 7; i++) {
    const ph = (time * .9 + i / 7) % 1; const bx = x + Math.sin(i * 2.4 + seed + time * 2) * 14; const by = base - h * .25 - ph * h * .8; const r = 2 + (i % 3);
    ctx.globalAlpha = (1 - ph) * .9; ctx.fillStyle = i % 2 ? '#76ff03' : '#9ccc65'; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#33691e'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
}

function drawBleed(ctx, x, base, h, time, seed) {
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const ph = (time * 1.3 + i / 5) % 1; const dx = x + ((i * 29 + seed) % 22) - 11; const dy = base - h * .55 + ph * h * .55;
    ctx.globalAlpha = .95; ctx.fillStyle = '#d50000';
    ctx.beginPath(); ctx.moveTo(dx, dy - 4); ctx.quadraticCurveTo(dx + 3, dy + 1, dx, dy + 3); ctx.quadraticCurveTo(dx - 3, dy + 1, dx, dy - 4); ctx.fill();
  }
  ctx.globalAlpha = .6; ctx.fillStyle = '#8e0000';
  for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(x - 10 + i * 9), Math.round(base - 1), 4, 2);
  ctx.restore();
}

function drawWet(ctx, x, base, h, time, seed) {
  ctx.save();
  // A cool sheen over the body and drops running down.
  ctx.globalAlpha *= .18; ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(x, base - h * .5, 17, h * .5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha /= .18;
  for (let i = 0; i < 6; i++) {
    const ph = (time * 1.6 + i / 6) % 1; const dx = x + ((i * 23 + seed) % 26) - 13; const dy = base - h * .85 + ph * h * .85;
    ctx.globalAlpha = .9 * (1 - ph * .5); ctx.fillStyle = i % 2 ? '#81d4fa' : '#e1f5fe'; ctx.fillRect(Math.round(dx), Math.round(dy), 2, 3);
  }
  ctx.globalAlpha = .45; ctx.strokeStyle = '#4fc3f7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, base - 1, 16, 4, 0, 0, TAU); ctx.stroke();
  ctx.restore();
}

// Small status icons above the head.
function drawStatusIcons(ctx, t, x, y) {
  const kinds = Object.keys(t.statuses ?? {}).filter((k) => t.statuses[k] && !t.statuses[k].isFinished);
  if (!kinds.length) return;
  ctx.save();
  kinds.forEach((k, i) => {
    const cx = x - (kinds.length - 1) * 6 + i * 12; const c = STATUS_DEFS[k].color;
    ctx.fillStyle = 'rgba(10,8,18,.8)'; ctx.fillRect(cx - 5, y - 5, 10, 10);
    ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 1.5;
    if (k === 'frozen') { for (let a = 0; a < 3; a++) { const ang = a * Math.PI / 3; ctx.beginPath(); ctx.moveTo(cx - Math.cos(ang) * 4, y - Math.sin(ang) * 4); ctx.lineTo(cx + Math.cos(ang) * 4, y + Math.sin(ang) * 4); ctx.stroke(); } }
    else if (k === 'burn') { ctx.beginPath(); ctx.moveTo(cx, y - 4); ctx.lineTo(cx + 3, y + 3); ctx.lineTo(cx - 3, y + 3); ctx.closePath(); ctx.fill(); }
    else if (k === 'paralysis') { ctx.beginPath(); ctx.moveTo(cx + 1, y - 4); ctx.lineTo(cx - 2, y); ctx.lineTo(cx + 2, y); ctx.lineTo(cx - 1, y + 4); ctx.stroke(); }
    else if (k === 'poison') { ctx.beginPath(); ctx.arc(cx, y + 1, 3, 0, TAU); ctx.fill(); }
    else if (k === 'wet') { ctx.beginPath(); ctx.moveTo(cx, y - 4); ctx.quadraticCurveTo(cx + 4, y + 2, cx, y + 4); ctx.quadraticCurveTo(cx - 4, y + 2, cx, y - 4); ctx.fill(); ctx.fillStyle = '#e1f5fe'; ctx.fillRect(cx - 1, y, 1, 2); }
    else if (k === 'bleed') { ctx.beginPath(); ctx.moveTo(cx, y - 4); ctx.quadraticCurveTo(cx + 4, y + 2, cx, y + 4); ctx.quadraticCurveTo(cx - 4, y + 2, cx, y - 4); ctx.fill(); }
  });
  ctx.restore();
}
