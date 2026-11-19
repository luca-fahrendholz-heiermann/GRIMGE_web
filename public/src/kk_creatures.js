// GRIMGE Prototype — Kronenkrieg in play, part 5: creatures, eggs, mounts (GRIMGE_KRONENKRIEG.md §8–§10, §4d).
// Epic creatures guard their lairs; beaten they drop ONE thing (goods, a rare rune or their egg). A weakened creature can
// be tamed with BÄNDIGUNG (Bestia + Bestia). An egg is carried (slow, visible to all), can be stored in an own castle,
// and hatches only at a source of its element — the hatching reels decide size, temperament and an extra element. The
// stable gives a horse from level 3; the Primal is always along, grows with the round level (rides from 5, a dragon
// flies from 8) and, once down, is only revived at the own main castle.
import { combat } from './combat.js';
import { audio } from './audio.js';
import { spells, SUMMON_DEFINITIONS } from './spells.js';
import { recognizer } from './recognizer.js';
import { runeCategory } from './progression.js';
import { groundYForDepth } from './world.js';
import { kkState, kkOn, elementColor, SEAT_COLORS } from './kk_world.js';
import { gainXp, dropPile } from './kk_loot.js';
import { KKUnit, addRecord, squadCap } from './kk_army.js';
import { XP } from './kk_progress.js';

export const CREATURE_OF = Object.freeze({ ignis: 'siege_golem', terra: 'siege_golem', ventus: 'storm_wolf', fulgur: 'storm_wolf', aqua: 'rune_snake', frost: 'spirit_wolf' });
const CREATURE_NAME = Object.freeze({ siege_golem: 'GLUTKOLOSS', storm_wolf: 'STURMWOLF', rune_snake: 'FLUTSCHLANGE', spirit_wolf: 'FROSTWOLF' });
export const HATCH_TIME = 10; const STORE_TIME = 1.5; const TAME_LIMIT = 1;
export const HATCH_SIZES = Object.freeze(['KÜMMERLING', 'NORMAL', 'PRÄCHTIG']);
export const HATCH_TEMPERS = Object.freeze(['FLINK', 'ZÄH', 'WILD']);
const EXTRA_ELEMENTS = Object.freeze(['ignis', 'fulgur', 'frost', 'terra', 'aqua', 'ventus']);

// A creature: a big unit drawn with a summon body.
export class KKCreature extends KKUnit {
  constructor(rec) {
    super({ ...rec, cls: 'Berserker' }); this.rec = rec; this.isKKCreature = true;
    const size = rec.size ?? 1; const grown = rec.team === 'beast' ? 1.8 : 1;
    this.maxHp = Math.round((700 + 260 * size) * grown * (rec.temper === 'ZÄH' ? 1.3 : 1)); this.hp = Math.min(this.maxHp, rec.hp ?? this.maxHp);
    this.damage = Math.round((26 + 8 * size) * (rec.temper === 'WILD' ? 1.3 : 1)); this.speed = 70 * (rec.temper === 'FLINK' ? 1.35 : 1); this.attackRange = 54; this.renderHeight = 90 + size * 14;
    this.statusElements = [rec.element, ...(rec.extra ? [rec.extra] : [])].filter(Boolean);
  }
  render(ctx) {
    const mgr = globalThis.window?.gameWorld?.sprites; const key = this.rec.kind;
    const ok = mgr?.renderSummon?.(ctx, key, this.x, this.y, { facing: this.facing, state: this.state === 'attack1' ? 'attack' : this.state, animTime: this.animTime, visualHeight: this.renderHeight });
    if (!ok) { ctx.fillStyle = elementColor(this.rec.element); ctx.fillRect(this.x - 26, this.y - 50, 52, 50); }
    const y = this.y - this.renderHeight - 8; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(this.x - 30, y, 60, 5);
    ctx.fillStyle = this.rec.team === 'beast' ? '#ff8a65' : SEAT_COLORS[this.rec.seat ?? 0]; ctx.fillRect(this.x - 30, y, 60 * this.hp / this.maxHp, 5);
    if (this.rec.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .25 + .15 * Math.sin(this.animTime * 4); ctx.fillStyle = elementColor(this.rec.element); ctx.beginPath(); ctx.ellipse(this.x, this.y - this.renderHeight * .5, 40, this.renderHeight * .55, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(CREATURE_NAME[key] ?? 'KREATUR', this.x, y - 3);
  }
}

export function initCreatures(game) {
  const kk = kkState(game); kk.creatureClass = KKCreature; kk.carry = null; kk.hatchT = 0; kk.storeT = 0; kk.firstHatch = true;
  for (const s of kk.map.sites) if (s.kind === 'lair') addRecord(kk, { team: 'beast', creature: true, kind: CREATURE_OF[s.element] ?? 'storm_wolf', element: s.element, cls: 'Berserker', tier: 3, size: 2, row: s.row, x: s.x, z: s.z + .12, role: 'guard', siteId: s.id });
  kk.eggHooks = { take: (site) => takeStoredEgg(game, site) };
  kk.onCreatureDeath = (rec) => creatureDrop(game, rec);
  return kk;
}

// Called by kk_army when a creature record dies: it drops exactly ONE thing.
export function creatureDrop(game, rec) {
  const kk = kkState(game);
  if (rec.trialGuardian) { kk.onTrialWon?.(rec); return; } /* a trial's guardian gives the crowning, not loot (kk_crown.js) */ const r = kk.rng(); const at = { x: rec.x, z: rec.z };
  gainXp(game, XP.kill * 4);
  if (r < .4) { dropPile(game, at.x, at.z, { gold: 40, materials: { steel: 4, obsidian: 2 }, stones: { [rec.element]: 6 }, weapons: [], runes: [] }); game.showAnnouncement?.(`${CREATURE_NAME[rec.kind]} BESIEGT — REICHE BEUTE`, 1.8); }
  else if (r < .7) {
    const pool = recognizer.runes.filter((x) => ['breath', 'domain', 'arcane', 'multi'].includes(runeCategory(x.id)) && x.id !== 'buff_A04');
    const rune = pool[Math.floor(kk.rng() * pool.length)]; dropPile(game, at.x, at.z, { gold: 10, materials: {}, stones: {}, weapons: [], runes: rune ? [rune] : [] }); game.showAnnouncement?.(`${CREATURE_NAME[rec.kind]} BESIEGT — EINE SELTENE RUNE`, 1.8);
  } else { kk.items.push({ id: kk.nextItem++, kind: 'egg', row: rec.row, x: at.x, z: at.z, lock: .8, element: rec.element, creature: rec.kind }); game.showAnnouncement?.(`${CREATURE_NAME[rec.kind]} BESIEGT — ES HINTERLÄSST EIN EI`, 2); }
  combat.spawnShockwave?.(at.x, groundYForDepth(at.z) - 40, 110, elementColor(rec.element));
}

// ── taming (BÄNDIGUNG on a weakened creature) ──────────────────────────────────────────────────────────────────────
export function tameAt(game, caster, x, z) {
  const kk = kkState(game); if (!kk || caster !== game.player) return false;
  const c = game.minions.find((m) => m.isKKCreature && !m.isDead && m.team !== 'blue' && Math.abs(m.x - x) < 100 && Math.abs((m.z - z) * 150) < 50);
  if (!c) return false;
  if (c.hp > c.maxHp * .5) { game.showAnnouncement?.('ZU STARK — ERST UNTER HALBES LEBEN', 1.3); return true; }
  if (kk.units.filter((u) => u.creature && u.tamed && u.seat === 0).length >= TAME_LIMIT) { game.showAnnouncement?.('DU FÜHRST SCHON EINE GEZÄHMTE KREATUR', 1.3); return true; }
  const rec = c.rec; rec.team = 'blue'; rec.seat = 0; rec.tamed = true; rec.role = 'squad'; rec.siteId = null; c.team = 'blue'; c.followLeader = game.player; c.target = null;
  gainXp(game, XP.free * 2); game.showAnnouncement?.(`${CREATURE_NAME[rec.kind]} GEZÄHMT — SIE KÄMPFT FÜR DICH`, 2); combat.spawnShockwave?.(c.x, c.y - 40, 90, '#c98a4a'); audio.playRuneChime?.(980);
  return true;
}

// ── eggs ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const nearestSource = (kk, el, row, x) => kk.map.sites.filter((s) => s.kind === 'source' && s.element === el && s.row === row).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0] ?? null;
export function eggPulse(kk, egg, row, x) { const s = nearestSource(kk, egg.element, row, x); if (!s) return .15; return Math.max(.15, Math.min(1, 1 - Math.abs(s.x - x) / 2400)); }
export function spinHatch(rng, { stones = 0, pure = false, grade = null } = {}) {
  const luck = Math.min(.45, stones * .08 + (pure ? .2 : 0) + ({ S: .15, A: .08, B: .03 }[grade] ?? 0));
  const roll = () => rng();
  const sizeR = roll(); const size = sizeR < .3 - luck * .5 ? 0 : sizeR < .82 - luck ? 1 : 2;
  const temper = HATCH_TEMPERS[Math.floor(roll() * 3)];
  const extra = roll() < .2 + luck ? EXTRA_ELEMENTS[Math.floor(roll() * EXTRA_ELEMENTS.length)] : null;
  const glow = size === 2 && !!extra && roll() < .35 + luck;
  return { size, temper, extra, glow };
}
function hatch(game, egg, source) {
  const kk = kkState(game); const P = game.player;
  const stones = Math.min(3, kk.inv.stones[egg.element] ?? 0); kk.inv.stones[egg.element] = (kk.inv.stones[egg.element] ?? 0) - stones;
  const recent = kk.time - kk.lastGradeAt < 90 ? kk.lastGrade : null; const r = spinHatch(kk.rng, { stones, pure: !!source.pure, grade: recent });
  addRecord(kk, { team: 'blue', creature: true, kind: egg.creature, element: egg.element, extra: r.extra, temper: r.temper, size: r.size, glow: r.glow, cls: 'Berserker', tier: 1 + r.size, row: kk.row, x: source.x, z: source.z, role: 'squad', hatched: true });
  kk.carry = null; P.kkCarryMult = 1; gainXp(game, XP.hatch);
  const name = CREATURE_NAME[egg.creature] ?? 'KREATUR';
  game.showAnnouncement?.(`${kk.firstHatch ? 'EIN ' + name + ' IST ERWACHT! ' : ''}${HATCH_SIZES[r.size]} · ${r.temper}${r.extra ? ' · +' + r.extra.toUpperCase() : ''}${r.glow ? ' · LEUCHTEND!' : ''}`, 2.6);
  kk.firstHatch = false; combat.spawnShockwave?.(source.x, groundYForDepth(source.z) - 50, 160, elementColor(egg.element)); combat.shakeCamera?.(6, .4); audio.playRuneChime?.(1100);
}
function takeStoredEgg(game, site) {
  const kk = kkState(game); if (!site.egg || kk.carry) return false; kk.carry = site.egg; site.egg = null; game.player.kkCarryMult = .6; game.showAnnouncement?.('EI GENOMMEN', 1); return true;
}
function updateEggs(game, dt) {
  const kk = kkState(game); const P = game.player;
  // pick an egg up by walking onto it (only one at a time)
  if (!kk.carry && P.isAlive) { const egg = kk.items.find((it) => it.kind === 'egg' && it.row === kk.row && (it.lock ?? 0) <= 0 && Math.abs(it.x - P.x) < 40 && Math.abs(it.z - P.z) * 150 < 30); if (egg) { kk.items.splice(kk.items.indexOf(egg), 1); kk.carry = egg; P.kkCarryMult = .6; game.showAnnouncement?.('EI AUFGEHOBEN — ES IST SCHWER UND ALLE SEHEN ES', 1.8); } }
  for (const it of kk.items) if (it.kind === 'egg') it.lock = Math.max(0, (it.lock ?? 0) - dt);
  if (!kk.carry) { kk.hatchT = 0; kk.storeT = 0; return; }
  const egg = kk.carry;
  // a hard hit or death drops it
  if (!P.isAlive || P.state === 'hurt' && kk.rng() < dt * 1.5) { kk.items.push({ ...egg, id: kk.nextItem++, row: kk.row, x: P.x + (P.facing || 1) * 30, z: P.z, lock: 1.2 }); kk.carry = null; P.kkCarryMult = 1; kk.hatchT = 0; game.showAnnouncement?.('DAS EI IST GEFALLEN!', 1.4); return; }
  // hatching at a source of its element
  const src = nearestSource(kk, egg.element, kk.row, P.x);
  if (src && Math.abs(src.x - P.x) < 90 && Math.abs(src.z - P.z) < .2) { kk.hatchT += dt; if (kk.hatchT >= HATCH_TIME) { kk.hatchT = 0; hatch(game, egg, src); } }
  else kk.hatchT = 0;
  // storing it in an own castle (stand still in it)
  const castle = [...kk.map.sites.filter((s) => s.kind === 'castle' && s.owner === 0), ...kk.map.hqs.filter((h) => h.seat === 0)].find((s) => s.row === kk.row && Math.abs(s.x - P.x) < 110 && Math.abs(s.z - P.z) < .2 && !s.egg);
  if (castle && kk.hatchT === 0) { kk.storeT += dt; if (kk.storeT >= STORE_TIME) { castle.egg = egg; kk.carry = null; P.kkCarryMult = 1; kk.storeT = 0; game.showAnnouncement?.('EI IN DER BURG ABGELEGT — SICHER, SOLANGE SIE HÄLT', 1.8); } }
  else kk.storeT = 0;
}

// ── mounts and the Primal ──────────────────────────────────────────────────────────────────────────────────────────
const stageForLevel = (lvl) => (lvl >= 8 ? 3 : lvl >= 5 ? 2 : 1);
function updateMounts(game, dt) {
  const kk = kkState(game); const P = game.player; const pr = game.primal;
  // the stable: a horse from level 3 (a riding beast of the game's mount kind)
  for (const s of kk.map.sites) {
    if (s.kind !== 'stable' || s.row !== kk.row || Math.abs(s.x - P.x) > 80 || Math.abs(s.z - P.z) > .2) continue;
    if ((kk.level ?? 1) < 3) { if (!s.hinted) { s.hinted = true; game.showAnnouncement?.('STALL — REITEN AB STUFE 3', 1.4); } continue; }
    if (!kk.horse || kk.horse.isDead) { kk.horse = spells.summon(P, { ...SUMMON_DEFINITIONS.lesser_beast, id: 'kk_horse', name: 'REITTIER', duration: 1e6, rise: .01 }, game, spells.qualityForRunes([]), { x: s.x + 60, z: s.z, noPose: true }) ?? null; if (kk.horse) game.showAnnouncement?.('REITTIER AUS DEM STALL — AUFSTEIGEN MIT DER REIT-TASTE', 1.8); }
  }
  // the Primal grows with the level; once down it waits for the main castle
  if (pr) {
    const st = stageForLevel(kk.level ?? 1); if (pr.stage !== st && pr.hp > 0) { pr.stage = st; game.showAnnouncement?.(`${pr.info.name} WÄCHST — STUFE ${st}`, 1.6); combat.spawnShockwave?.(pr.x, pr.y - 30, 70, pr.info.variant); }
    if (pr.hp <= 0 && pr.recoveryTimer > 0 && pr.recoveryTimer < 1e8) { pr.recoveryTimer = 1e9; kk.primalDown = true; game.showAnnouncement?.(`${pr.info.name} IST GEFALLEN — WIEDERBELEBEN IN DER HAUPTBURG`, 2); }
    const hq = kk.map.hqs.find((h) => h.seat === 0);
    if (kk.primalDown && P.isAlive && hq.row === kk.row && Math.abs(P.x - hq.x) < 280 && !hq.fallen) { kk.primalDown = false; pr.respawn(game); pr.place?.(game, P.x - (P.facing || 1) * 30, P.z); game.showAnnouncement?.(`${pr.info.name} WIEDERBELEBT`, 1.5); }
  }
}
// Riding and flying follow the level (kk_creatures gate; the Primal's own definition asks this).
export function kkMountGate(game) { const kk = kkState(game); if (!kkOn(game)) return { ride: true, fly: true }; return { ride: (kk.level ?? 1) >= 5, fly: (kk.level ?? 1) >= 8 }; }

export function updateCreatures(game, dt) { if (!kkOn(game) || !kkState(game).units) return; updateEggs(game, dt); updateMounts(game, dt); }

// ── drawing: eggs on the ground and the carried egg; a source answers a near egg with a beam ───────────────────────
export function creatureActors(game) {
  const kk = kkState(game); if (!kk?.units) return []; const out = []; const t = kk.time; const P = game.player;
  const drawEgg = (ctx, x, y, egg, pulse) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .2 + .5 * pulse * (.6 + .4 * Math.sin(t * (3 + pulse * 6))); ctx.fillStyle = elementColor(egg.element); ctx.beginPath(); ctx.ellipse(x, y - 14, 18 + pulse * 10, 22 + pulse * 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.ellipse(x, y - 14, 10, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = elementColor(egg.element); ctx.fillRect(x - 6, y - 16, 12, 3); };
  for (const it of kk.items) if (it.kind === 'egg' && it.row === kk.row) { const y = groundYForDepth(it.z); out.push({ y, render: (ctx) => drawEgg(ctx, it.x, y, it, eggPulse(kk, it, kk.row, it.x)) }); }
  if (kk.carry) {
    const pulse = eggPulse(kk, kk.carry, kk.row, P.x); out.push({ y: P.y + .3, render: (ctx) => drawEgg(ctx, P.x, P.y - 70, kk.carry, pulse) });
    const src = nearestSource(kk, kk.carry.element, kk.row, P.x);
    if (src && Math.abs(src.x - P.x) < 700) { const y = groundYForDepth(src.z); out.push({ y: y - .1, render: (ctx) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .25 + .2 * Math.sin(t * 5); ctx.fillStyle = elementColor(src.element); ctx.fillRect(src.x - 6, y - 360, 12, 360); ctx.restore(); } }); }
    if (kk.hatchT > 0 || kk.storeT > 0) { const k = kk.hatchT > 0 ? kk.hatchT / HATCH_TIME : kk.storeT / STORE_TIME; out.push({ y: P.y + .4, render: (ctx) => { ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(P.x, P.y - 110, 16, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = elementColor(kk.carry?.element ?? 'lux'); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y - 110, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, k)); ctx.stroke(); } }); }
  }
  return out;
}
// The carried egg on the minimap (everyone sees it).
export function creatureMinimapDots(game) { const kk = kkState(game); if (!kk?.carry) return []; return [{ row: kk.row, x: game.player.x, z: game.player.z, color: elementColor(kk.carry.element) }]; }
