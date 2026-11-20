// GRIMGE Prototype — Kronenkrieg in play, part 3: armies (GRIMGE_KRONENKRIEG.md §6, §6.6, §12a).
// Every fighter on the map is a RECORD (class, element, tier, bonus, where it is); only the records in the band the
// player walks in — plus the own squad — are live units (KKUnit, a Minion with a class and an element). Renegades hold
// the mid castles and the bandit camps and patrol the roads; prisoners wait in camps; mid castles are captured,
// train units from gold + weapon + element stone (with an optional reel spin), and every castle keeps a garrison
// that is stationed or taken along with ▲ / ▼. Three equal units merge into one of the next tier.
import { Minion } from './entities.js';
import { ART_ASSETS } from './art_assets.js';
import { setStatusSource } from './status_effects.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth, clampZ, ENTITY_VISUALS } from './world.js';
import { CASTLE_CLASSES, mulberry32, spanAt, roadZ } from './kk_map.js';
import { squadBonus, XP } from './kk_progress.js';
import { kkState, kkOn, SEAT_COLORS, elementColor } from './kk_world.js';
import { gainXp, foeDrop, bagSlots, bagUpgradeCost, BAG_MAX_LEVEL } from './kk_loot.js';
import { spawnItems, showReels } from './kk_items.js';
import { castleHp, castleMaxHp, inGateRing, outOfCastle, squadWallTarget } from './kk_castle.js';

// Per class: melee/ranged and multipliers on the minion base values.
export const CLASS_STATS = Object.freeze({
  Guardian: { type: 'melee', hp: 1.7, dmg: .85, spd: .9 }, Ranger: { type: 'ranged', hp: .9, dmg: 1.05, spd: 1 },
  Arcanist: { type: 'ranged', hp: .85, dmg: 1.25, spd: .95 }, Lancer: { type: 'melee', hp: 1.15, dmg: 1.2, spd: 1.1 },
  Berserker: { type: 'melee', hp: 1.3, dmg: 1.4, spd: 1 }, Shadow: { type: 'melee', hp: .85, dmg: 1.15, spd: 1.35 },
  Monk: { type: 'melee', hp: 1.05, dmg: 1.05, spd: 1.25 }, Beastborn: { type: 'melee', hp: 1.1, dmg: 1.1, spd: 1.3 }
});
const CLASS_LABEL = Object.fromEntries(CASTLE_CLASSES.map((c) => [c.cls, c.label]));
const ELEMENT_LABEL = Object.freeze({ ignis: 'BRAND', ventus: 'STURM', fulgur: 'BLITZ', terra: 'STEIN', aqua: 'FLUT', frost: 'FROST', bestia: 'WILD', construct: 'RUNEN', void: 'LEERE', lux: 'LICHT', natura: 'RANKEN', ward: 'SCHILD', umbra: 'SCHATTEN' });
export const unitName = (u) => `${u.element ? ELEMENT_LABEL[u.element] + '-' : ''}${CLASS_LABEL[u.cls] ?? u.cls}${u.tier > 1 ? ' ' + '★'.repeat(u.tier - 1) : ''}`;
export const TRAIN = Object.freeze({ gold: 30, batch: 3, time: 6, spinGold: 10, mergeCount: 3, maxTier: 3, garrisonCap: 24, squadBase: 10 }); /* a recruitment is a stack of 3 (user: one unit alone was dead at once) */
// The team of a seat: the player and his ally are 'blue'; in 2v2 both rivals are 'rivals', otherwise every rival alone.
export const teamOfSeat = (seat, kk = null) => (seat === 0 || kk?.allies?.includes(seat) ? 'blue' : kk?.teamMode === '2v2' ? 'rivals' : 'seat' + seat);
export const sameTeam = (kk, a, b) => a != null && b != null && teamOfSeat(a, kk) === teamOfSeat(b, kk);
const mine = (u) => u.seat === 0; /* the player's own fighters (an ally's share the team, not the owner) */
const BONUS_LABEL = Object.freeze({ veteran: 'VETERAN', double: 'DOPPELELEMENT', elite: 'ELITE' });

// Which painted fighter sheet a unit wears: own side and allies the watch, renegades knights / bandits / hexers, rivals the void.
const LOOK = Object.freeze({
  blue: { Guardian: 'ally_fighter', Berserker: 'ally_fighter', Lancer: 'ally_fighter', Monk: 'ally_blade', Beastborn: 'ally_blade', Shadow: 'ally_blade', Ranger: 'void_archer', Arcanist: 'frost_shaman' },
  red: { Guardian: 'enemy_knight', Berserker: 'enemy_bandit', Lancer: 'enemy_knight', Monk: 'enemy_bandit', Beastborn: 'enemy_bandit', Shadow: 'enemy_bandit', Ranger: 'void_archer', Arcanist: 'enemy_sorcerer' },
  rival: { Guardian: 'void_brute', Berserker: 'void_duelist', Lancer: 'void_duelist', Monk: 'void_duelist', Beastborn: 'void_duelist', Shadow: 'void_duelist', Ranger: 'void_archer', Arcanist: 'enemy_sorcerer' }
});
export function unitLook(rec) {
  const side = rec.team === 'blue' ? 'blue' : rec.bandit || rec.team === 'red' ? 'red' : 'rival';
  if (rec.cls === 'Arcanist' && rec.element === 'ignis') return 'ember_acolyte';
  return LOOK[side][rec.cls] ?? (side === 'blue' ? 'ally_fighter' : 'enemy_knight');
}
let attackingElement = null; /* the element of the unit striking right now (main castle resistances, kk_war.js) */
// A live unit: a minion that carries its class and element (its hits roll the element's statuses).
export class KKUnit extends Minion {
  constructor(rec) {
    const stats = CLASS_STATS[rec.cls] ?? CLASS_STATS.Guardian;
    super(rec.x, rec.z, rec.team === 'blue' ? 'blue' : 'red', stats.type, 1);
    this.team = rec.team; this.rec = rec; this.isKKUnit = true; this.usesLevels = true; /* stairs and ramparts (battlefield.getSurfaceAt) */
    const tierMul = 1 + (rec.tier - 1) * .55; const vet = rec.bonus?.includes('veteran') ? 1.25 : 1; const elite = rec.bonus?.includes('elite') ? 1.3 : 1;
    this.maxHp = Math.round(this.maxHp * stats.hp * tierMul * vet * (rec.bandit ? .9 : 1) * (rec.boss ? 9 : 1)); /* an event boss: many times the life */ this.hp = Math.min(this.maxHp, rec.hp ?? this.maxHp);
    this.damage = Math.round(this.damage * stats.dmg * tierMul * elite); this.speed *= stats.spd;
    // as big as the characters (user, 20 Nov 2026): the hero height, a little more per tier; a hero-sized body to hit
    const heroH = ENTITY_VISUALS.heroHeight * (rec.boss ? 1.45 : 1); this.renderHeight = heroH * (1 + (rec.tier - 1) * .06); if (rec.boss) this.damage *= 2; this.width = ENTITY_VISUALS.heroColliderWidth; this.height = ENTITY_VISUALS.heroColliderHeight;
    { const key = unitLook(rec); const arch = ART_ASSETS.archetypes?.[key]; if (ART_ASSETS.entities?.[key] || arch) { this.spriteKey = key; this.renderHeight = heroH * ((arch?.renderHeight ?? 56) / 56) * (key === 'void_brute' ? .8 : 1) * (1 + (rec.tier - 1) * .06); } } /* painted sheets instead of the plain minions */
    this.statusElements = rec.element ? (rec.bonus?.includes('double') ? [rec.element, rec.element === 'frost' ? 'aqua' : 'ignis'] : [rec.element]) : null;
    this.runXpValue = 0; this.baseSpeed = this.speed;
  }
  // The squad keeps the player's pace (user, 20 Nov 2026) — on foot with a figure on foot; a rider only with mounted / creature units —
  // and a rune blessing (blessSquad) makes it stronger and quicker for a while.
  update(dt, gameWorld, battlefield) {
    const lead = this.followLeader; let pace = this.baseSpeed ?? this.speed;
    if (lead && lead === gameWorld?.player && this.rec?.role === 'squad') {
      const gap = Math.hypot(lead.x - this.x, (lead.z - this.z) * 150); const ridesToo = !lead.isMounted || this.rec.creature;
      const leadSpeed = Math.max(Math.hypot(lead.vx ?? 0, (lead.vz ?? 0) * 150), lead.moveSpeed ?? 0) * (lead.isMounted ? 1.6 : 1);
      if (gap > 110 && ridesToo) pace = Math.max(pace, leadSpeed * (gap > 260 ? 1.25 : 1.05));
    }
    this.blessT = Math.max(0, (this.blessT ?? 0) - dt); if (this.blessT > 0) pace *= 1.1;
    this.speed = pace; return super.update(dt, gameWorld, battlefield);
  }
  performAttack(target, gameWorld) {
    if (this.blessT > 0) { const d = this.damage; const keepEls = this.statusElements; this.damage = Math.round(d * 1.2); if (this.blessEl) this.statusElements = [this.blessEl]; try { return this.statusElements ? this.withStatus(target, gameWorld) : super.performAttack(target, gameWorld); } finally { this.damage = d; this.statusElements = keepEls; } } /* blessed: stronger, the rune's element on its strikes */
    if (!this.statusElements) return super.performAttack(target, gameWorld);
    return this.withStatus(target, gameWorld);
  }
  withStatus(target, gameWorld) {
    const prev = setStatusSource({ team: this.team, statusElements: this.statusElements, castBy: this }); attackingElement = this.rec.element;
    try { return super.performAttack(target, gameWorld); } finally { setStatusSource(prev); attackingElement = null; }
  }
  takeDamage(amount, ...rest) {
    const gw = globalThis.window?.gameWorld; const kk = kkState(gw); if (attackingElement && kk?.resistFn) amount *= kk.resistFn(this.rec, attackingElement);
    if (!this.kkEngaged && gw?.player && this.team !== gw.player.team && Math.hypot(gw.player.x - this.x, (gw.player.z - this.z) * 150) < 700) this.kkEngaged = gw.player; /* struck: it notices the player */
    return super.takeDamage(amount, ...rest);
  }
  render(ctx) {
    if (this.blessT > 0) { ctx.save(); ctx.globalAlpha = .35 + .2 * Math.sin((this.animTime ?? 0) * 6); ctx.strokeStyle = this.blessEl ? elementColor(this.blessEl) : '#ffe9a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(this.x, groundYForDepth(this.z) - (this.surfaceHeight ?? 0), 26, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } /* the blessing's aura */
    super.render(ctx);
    const r = this.rec; const vh = this.renderHeight; const y = this.y - vh - 9; ctx.save();
    // the side's colour as a small pennant, the element as a gem, stars for the tier
    ctx.fillStyle = r.bandit ? '#5a4632' : SEAT_COLORS[r.seat ?? 0]; ctx.fillRect(Math.round(this.x - 9), Math.round(y - 3), 6, 5);
    if (r.element) { ctx.fillStyle = elementColor(r.element); ctx.fillRect(Math.round(this.x - 1), Math.round(y - 3), 5, 5); }
    if (r.tier > 1) { ctx.fillStyle = '#ffe066'; for (let i = 0; i < r.tier - 1; i++) ctx.fillRect(Math.round(this.x + 6 + i * 4), Math.round(y - 3), 3, 3); }
    ctx.restore();
  }
}

// ── targets on a leash (user, 19 Nov 2026: at the start far too many foes ran at the player) ──────────────────────
// A unit only takes on foes near its post (guards / garrisons), its road (patrols) or its leader (squads); without one
// it walks back. A player inside a house is reached only through the door (kk_interior.js doorProxy).
const LEASH = Object.freeze({ guard: 380, garrison: 380, patrol: 460, squad: 440 });
// Foes of the player's side patrol and only attack when one comes too close (user, 19 Nov 2026): a unit NOTICES a foe
// within AGGRO of itself (or when it is hit), alerts its comrades of the same post, chases at most LEASH away from its
// post and then walks back. The own squad simply fights near its leader.
export const AGGRO = Object.freeze({ guard: 230, garrison: 260, patrol: 260 });
const CHASE = Object.freeze({ guard: 520, garrison: 520, patrol: 560 });
const live = (t) => t && !t.isDead && t.isAlive !== false && t.lifeState !== 'Dead' && !t.isProp && !t.isStoneWall && !t.isWorldProp;
const gap = (a, b) => Math.hypot(a.x - b.x, ((a.z ?? 0) - (b.z ?? 0)) * 150);
// A rune the player casts blesses the own squad near him (user, 20 Nov 2026: "die ganze Truppe mit Runen buffen"): +20 % damage,
// +10 % speed and the rune's element on their strikes for 10 s.
export const BLESS = Object.freeze({ time: 10, range: 520 });
export function blessSquad(game, elements = null) {
  const kk = kkState(game); if (!kk) return 0; const P = game.player; const el = (elements ?? []).find((e) => typeof e === 'string') ?? null; let n = 0;
  for (const m of game.minions) if (m.isKKUnit && !m.isDead && m.team === P.team && m.rec?.role === 'squad' && Math.hypot(m.x - P.x, (m.z - P.z) * 150) < BLESS.range) { m.blessT = BLESS.time; m.blessEl = el; n++; }
  if (n && kk.time - (kk.blessHintAt ?? -99) > 8) { kk.blessHintAt = kk.time; game.showAnnouncement?.(`RUNENSEGEN — ${n} KÄMPFER GESTÄRKT`, 1.2); }
  return n;
}
export function kkFindTarget(game, unit) {
  const kk = kkState(game); const rec = unit.rec ?? {}; const anchor = unit.followLeader ?? unit;
  let best = null;
  if (rec.role === 'squad' || unit.team === game.player.team) {
    // the own side: foes near the leader / the post
    const leash = LEASH[rec.role] ?? 420; let bestD = Infinity;
    for (const t of game.getHostileTargets(unit.team)) { if (!live(t)) continue; const d = gap(t, unit); if (gap(t, anchor) > leash || d > leash + 200) continue; if (d < bestD) { best = t; bestD = d; } }
    if (!best && rec.role === 'squad' && mine(rec)) best = squadWallTarget(game, anchor); /* no foe about: help batter the foe castle in front of the leader */
  } else {
    // renegades, creatures, rivals: notice, alert, chase on a leash, return
    let eng = unit.kkEngaged;
    if (eng && (!live(eng) || gap(eng, anchor) > (CHASE[rec.role] ?? 520) || gap(eng, unit) > 720)) eng = null;
    if (!eng) {
      const aggro = AGGRO[rec.role] ?? 240; let bestD = aggro;
      for (const t of game.getHostileTargets(unit.team)) { if (!live(t)) continue; const d = gap(t, unit); if (d < bestD) { eng = t; bestD = d; } }
      if (eng) for (const m of game.minions) if (m !== unit && m.isKKUnit && !m.isDead && m.team === unit.team && !m.kkEngaged && m.rec?.siteId != null && m.rec.siteId === rec.siteId && gap(m, unit) < 360) m.kkEngaged = eng; /* the post is alerted */
    }
    unit.kkEngaged = eng; best = eng;
  }
  if (best && best === game.player && kk.inside && unit.kkInHouse !== kk.inside.id) { const door = kk.doorProxy?.(unit) ?? null; unit.target = door; return door; }
  unit.target = best; return navPoint(game, unit, best);
}
// Stairs for the AI (user, 20 Nov 2026: "Gegner-KI muss Treppen zuverlässig verwenden"): a target up on a rampart / gallery is
// reached over the foot and the top of a stair of that structure; down again over the stair (or straight off the front edge).
const stairFoot = (s) => (s.heightAt(s.xMin) <= s.heightAt(s.xMax) ? { x: s.xMin, out: -1 } : { x: s.xMax, out: 1 });
function navPoint(game, unit, target) {
  const S = game.battlefield?.levelSurfaces; if (!target || !S?.length || !unit.usesLevels) return target;
  const uh = (unit.surfaceHeight ?? 0) + (unit.elevation ?? 0); const th = (target.surfaceHeight ?? 0) + (target.elevation ?? 0);
  const here = S.find((s) => s.id === unit.surfaceId); const there = S.find((s) => s.id === target.surfaceId);
  const nav = (x, z) => { const n = unit._nav ?? (unit._nav = { isNavPoint: true, isAlive: true, isDead: false, team: unit.team, radius: 4, takeDamage() {} }); n.x = x; n.z = z; n.y = groundYForDepth(z); return n; };
  const mid = (s) => (s.zMin + s.zMax) / 2;
  const stairsOf = (site) => S.filter((s) => s.structure === 'stairs' && (site == null || s.siteId === site));
  if (th > 20 && uh < th - 14) { /* up */
    if (here?.structure === 'stairs') { const f = stairFoot(here); return nav(f.out < 0 ? here.xMax + 6 : here.xMin - 6, mid(here)); }
    const list = stairsOf(there?.siteId ?? null); if (!list.length) return target;
    const st = list.reduce((a, b) => (Math.abs(stairFoot(a).x - unit.x) < Math.abs(stairFoot(b).x - unit.x) ? a : b)); const f = stairFoot(st);
    const ox = f.x + f.out * 26; const onIt = unit.x >= st.xMin && unit.x <= st.xMax && unit.z >= st.zMin && unit.z <= st.zMax;
    const atFoot = Math.sign(unit.x - f.x) === f.out && Math.abs(unit.x - f.x) < 44 && Math.abs(unit.z - mid(st)) * 150 < 14; /* lined up in front of the foot */
    if (!onIt && !atFoot) return nav(ox, mid(st));
    return nav(f.out < 0 ? st.xMax + 6 : st.xMin - 6, mid(st));
  }
  if (uh > 14 && th < uh - 14) { /* down */
    if (here?.structure === 'stairs') { const f = stairFoot(here); return nav(f.x + f.out * 30, mid(here)); }
    if (here && target.z < here.zMax) { const list = stairsOf(here.siteId ?? null); if (list.length) { const st = list.reduce((a, b) => (Math.abs(a.xMin - unit.x) < Math.abs(b.xMin - unit.x) ? a : b)); const f = stairFoot(st); return nav(f.out < 0 ? st.xMax - 4 : st.xMin + 4, mid(st)); } }
  }
  return target;
}

// ── records ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function initArmy(game) {
  const kk = kkState(game); const rng = mulberry32(kk.seed ^ 0x5eed);
  Object.assign(kk, { units: [], nextUnit: 1, castleQueue: {}, alerts: {}, rng, panelFor: null, lastGrade: null, lastGradeAt: -99, patrolTimer: 30 });
  const bandit = (site, n, extra = {}) => { for (let i = 0; i < n; i++) addRecord(kk, { team: 'red', bandit: true, cls: ['Guardian', 'Ranger', 'Berserker', 'Shadow', 'Lancer'][Math.floor(rng() * 5)], element: null, tier: 1, row: site.row, x: site.x + (rng() - .5) * 180, z: clampZ(site.z + (rng() - .5) * .3, .08, .92), role: 'guard', siteId: site.id, ...extra }); };
  for (const s of kk.map.sites) {
    if (s.kind === 'castle') { s.owner = null; bandit(s, 5 + Math.floor(rng() * 3)); }
    else if (s.kind === 'camp') bandit(s, 4 + Math.floor(rng() * 3));
    else if (s.kind === 'prison') { bandit(s, 3 + Math.floor(rng() * 2)); s.prisoners = Array.from({ length: 2 + Math.floor(rng() * 2) }, () => ({ cls: CASTLE_CLASSES[Math.floor(rng() * CASTLE_CLASSES.length)].cls })); }
  }
  for (const h of kk.map.hqs) h.garrison = 0;
  return kk;
}
export function addRecord(kk, rec) { const r = { id: kk.nextUnit++, hp: null, bonus: [], seat: rec.team === 'blue' ? 0 : rec.seat, ...rec }; kk.units.push(r); return r; }
const squadRecords = (kk) => kk.units.filter((u) => u.role === 'squad' && mine(u));
export const squadCap = (kk) => TRAIN.squadBase + squadBonus(kk.level ?? 1) + kk.map.sites.filter((s) => s.kind === 'castle' && s.owner === 0).length;
const garrisonOf = (kk, siteId) => kk.units.filter((u) => u.role === 'garrison' && u.siteId === siteId);
const hostileGuards = (kk, site) => kk.units.filter((u) => u.siteId === site.id && u.role === 'guard' && u.team !== 'blue');
const siteById = (kk, id) => kk.map.sites.find((s) => s.id === id) ?? kk.map.hqs.find((h) => h.id === id);

// ── live units (only the current band + the squad) ─────────────────────────────────────────────────────────────────
function anchorFor(kk, rec) {
  if (rec.role === 'squad') return null;
  const site = siteById(kk, rec.siteId); const a = rec._anchor ?? (rec._anchor = { isAlive: true, x: rec.x, z: rec.z });
  if (site && rec.role !== 'patrol') {
    const t = kk.time ?? 0; const ph = rec.id * 1.7; const walk = rec.role === 'guard' ? 1 : .4; /* guards patrol around their post, garrisons stay closer */
    a.x = site.x + ((rec.id * 53) % 160) - 80 + Math.sin(t * .45 + ph) * 130 * walk; a.z = clampZ(site.z + (((rec.id * 31) % 30) - 15) / 100 + Math.sin(t * .3 + ph * 2) * .12 * walk, .08, .92);
    if (site.kind === 'castle' || site.kind === 'hq') outOfCastle(kk, a, site.row); /* guards stand in front of the wall block */
  }
  return a;
}
function spawnLive(game, rec) {
  const kk = kkState(game); const u = rec.creature && kk.creatureClass ? new kk.creatureClass(rec) : new KKUnit(rec); rec.live = u; /* creatures: kk_creatures.js */ u.x = rec.x; u.z = rec.z; outOfCastle(kk, u, rec.row); /* never inside a wall block */
  u.followLeader = rec.role === 'squad' ? (mine(rec) ? game.player : (kk.botLeader?.(rec.seat) ?? anchorFor(kk, rec))) : anchorFor(kk, rec);
  game.battlefield.placeOnSurface?.(u); game.minions.push(u); return u;
}
function syncLive(game) {
  const kk = kkState(game);
  for (const rec of [...kk.units]) {
    const u = rec.live;
    if (u) {
      if (u.isDead || !game.minions.includes(u)) { onUnitDeath(game, rec); continue; }
      rec.x = u.x; rec.z = u.z; rec.hp = u.hp;
      if (rec.role === 'squad' && mine(rec)) rec.row = kk.row;
      if (rec.row !== kk.row || (rec.role !== 'squad' && (Math.abs(rec.x - game.player.x) > 3000 || Math.abs(rec.z - game.player.z) > 10))) { despawn(game, rec); }
    } else if (rec.row === kk.row && rec.role !== 'prisoner' && Math.abs(rec.x - game.player.x) < 2600 && Math.abs(rec.z - game.player.z) < 8.5) spawnLive(game, rec); /* only near the player (both directions): the rest of the board stays records */ /* far parts of the band stay records too */
  }
}
function despawn(game, rec) { const u = rec.live; if (!u) return; const i = game.minions.indexOf(u); if (i >= 0) game.minions.splice(i, 1); rec.live = null; }
export const unitDiesForTest = (game, rec) => onUnitDeath(game, rec); /* tests: the drop of a beaten unit */
function onUnitDeath(game, rec) {
  const kk = kkState(game); kk.units.splice(kk.units.indexOf(rec), 1); rec.live = null;
  if (rec.creature && rec.team !== 'blue') { kk.onCreatureDeath?.(rec); return; }
  if (rec.boss) { kk.onBossDeath?.(rec); return; } /* the event boss: its hoard (kk_events.js) */
  if (rec.team !== 'blue') { const g = 6 + Math.floor(Math.random() * 7); foeDrop(game, rec.x, rec.z, rec.row, { gold: g, tier: rec.tier, element: rec.element, weapon: CASTLE_CLASSES.find((c) => c.cls === rec.cls)?.weapon, runeChance: rec.tier > 1 ? .12 : .06 }); /* coins, sometimes goods, a stone, the weapon or a rune */ gainXp(game, XP.kill); /* the coins fall to the ground */ combat.spawnDamageText?.(rec.x, groundYForDepth(rec.z) - 60, `+${g}◉`, { color: '#ffcf3a' }); }
  if (rec.role === 'garrison' && mine(rec)) { kk.alerts[rec.siteId] = 4; }
}
// The squad crosses into the next band with the player (kk_world switch hook).
function onBandSwitch(game) {
  const kk = kkState(game); const P = game.player;
  for (const rec of squadRecords(kk)) { rec.row = kk.row; rec.x = P.x - (P.facing || 1) * (30 + (rec.id % 4) * 18); rec.z = P.z; if (rec.live) { rec.live.x = rec.x; rec.live.z = rec.z; } }
  for (const rec of kk.units) if (rec.live && rec.role !== 'squad' && rec.row !== kk.row) despawn(game, rec);
}

// ── renegades: patrols ─────────────────────────────────────────────────────────────────────────────────────────────
function updatePatrols(game, dt) {
  const kk = kkState(game); kk.patrolTimer -= dt;
  if (kk.patrolTimer <= 0) {
    kk.patrolTimer = 45 + kk.rng() * 30;
    const camps = kk.map.sites.filter((s) => s.kind === 'camp' && hostileGuards(kk, s).length > 0);
    const camp = camps[Math.floor(kk.rng() * camps.length)];
    if (camp && kk.units.filter((u) => u.role === 'patrol').length < 10) {
      const strength = 2 + Math.floor(kk.time / 240); const dir = kk.rng() < .5 ? -1 : 1;
      for (let i = 0; i < Math.min(6, strength); i++) addRecord(kk, { team: 'red', bandit: true, cls: ['Guardian', 'Ranger', 'Berserker', 'Shadow'][i % 4], element: null, tier: kk.time > 600 ? 2 : 1, row: camp.row, x: camp.x + dir * 120 + i * 14, z: roadZ(camp.x, camp.row, camp.z), role: 'patrol', siteId: camp.id, dir, legEnd: camp.x + dir * (1400 + kk.rng() * 1600) });
    }
  }
  // a patrol walks its leg along the band (off-band ones move abstractly), then turns home
  for (const rec of kk.units) {
    if (rec.role !== 'patrol') continue;
    const a = rec._anchor ?? (rec._anchor = { isAlive: true, x: rec.x, z: roadZ(rec.x, rec.row, rec.z) });
    if (!rec.live) { rec.x += rec.dir * 50 * dt; a.x = rec.x; }
    else if (kk.map.hqs.some((h) => h.row === rec.row && Math.abs(h.x - a.x) < 1300)) { rec.dir = Math.sign(a.x - kk.map.hqs.filter((h) => h.row === rec.row).sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0].x) || -rec.dir; a.x += rec.dir * 55 * dt; } /* renegades keep away from the main castles: a calm start */
    else if (kk.carry && Math.abs(game.player.x - a.x) < 1500) { a.x += Math.sign(game.player.x - a.x) * 70 * dt; a.z = game.player.z; } /* bandits smell an egg carrier */
    else { a.x += rec.dir * 55 * dt; a.z = roadZ(a.x, rec.row, rec.roadZ ?? (rec.roadZ = rec.z)) + Math.sin((a.x + rec.id * 40) * .002) * .1; } /* along the nearest road */
    if ((rec.dir > 0 && a.x >= rec.legEnd) || (rec.dir < 0 && a.x <= rec.legEnd)) { rec.dir *= -1; const camp = siteById(kk, rec.siteId); rec.legEnd = camp ? camp.x : rec.x; }
    { const camp = siteById(kk, rec.siteId); const sp = spanAt(kk.map, rec.row, camp?.x ?? a.x) ?? [0, kk.map.width]; a.x = Math.max(sp[0] + 80, Math.min(sp[1] - 80, a.x)); if (!rec.live) rec.x = a.x; rec.legEnd = Math.max(sp[0] + 80, Math.min(sp[1] - 80, rec.legEnd)); } /* patrols stay in their stretch */
  }
}

// ── capturing, prisoners ───────────────────────────────────────────────────────────────────────────────────────────
const CAPTURE_TIME = 4; /* = CASTLE.captureTime (kk_castle.js; a literal: the modules import each other) */
function updateSites(game, dt) {
  const kk = kkState(game); const P = game.player; if (!P.isAlive) return;
  for (const s of kk.map.sites) {
    if (s.row !== kk.row) continue;
    const close = Math.abs(P.x - s.x) < 120 && Math.abs(P.z - s.z) < .2;
    if (s.kind === 'castle' && s.owner !== 0 && !sameTeam(kk, s.owner, 0)) { /* an ally's castle is not taken */
      // only a castle without life is taken: alone in the ring at its gate until the ring is full (user, 20 Nov 2026)
      const ring = inGateRing(s, P); const open = castleHp(s) <= 0;
      const guards = hostileGuards(kk, s).length + kk.units.filter((u) => u.role === 'garrison' && u.siteId === s.id && u.team !== 'blue').length + game.minions.filter((m) => m.isKKUnit && !m.isDead && m.team !== P.team && Math.hypot(m.x - s.x, (m.z - s.z) * 150) < 280).length;
      if (ring && !open && kk.time - (s.wallHintAt ?? -99) > 4) { s.wallHintAt = kk.time; game.showAnnouncement?.('ERST DIE BURGMAUER ZERSTÖREN (SCHLÄGE, ZAUBER, DEINE TRUPPE HILFT)', 1.6); } /* the ring: alone at the flag on the roof */
      kk.progress[s.id] = ring && open && !guards ? (kk.progress[s.id] ?? 0) + dt : 0; /* any foe nearby or leaving the ring starts it over */
      if (close && guards && Math.floor(kk.time * 2) % 6 === 0) s.blockedHint = true;
      if (kk.progress[s.id] >= CAPTURE_TIME) {
        kk.progress[s.id] = 0; s.owner = 0; s.garrison = 0; s.hp = castleMaxHp(s) * .5; s.lastHitT = kk.time; gainXp(game, XP.capture);
        game.showAnnouncement?.(`${s.label}BURG EROBERT — DU BILDEST HIER ${s.label === 'BOGEN' ? 'SCHÜTZEN' : 'KÄMPFER'} AUS`, 2);
        combat.spawnShockwave?.(s.x, groundYForDepth(s.z) - 60, 120, SEAT_COLORS[0]); audio.playRuneChime?.(880);
      }
    } else if (s.kind === 'prison' && !s.freed && close && !hostileGuards(kk, s).length) {
      s.freed = true; gainXp(game, XP.free);
      for (const p of s.prisoners ?? []) { const rec = addRecord(kk, { team: 'blue', cls: p.cls, element: null, tier: 1, row: s.row, x: s.x, z: s.z, role: squadRecords(kk).length < squadCap(kk) ? 'squad' : 'garrison', siteId: kk.map.hqs.find((h) => h.seat === 0).id }); if (rec.role === 'garrison') rec.row = kk.map.hqs.find((h) => h.seat === 0).row; }
      game.showAnnouncement?.(`${s.prisoners?.length ?? 0} GEFANGENE BEFREIT — SIE FOLGEN DIR`, 1.8); audio.playRuneChime?.(760);
    }
  }
}

// ── training, garrison, merging, reels ─────────────────────────────────────────────────────────────────────────────
// Reels (§6.6): symbols come from what one invested; three in a row give a bonus; the last rune grade shifts the odds.
export const REEL_SYMBOLS = Object.freeze({ weapon: '⚔', element: '◆', rune: '✦', blank: '·' });
export function spinReels(rng, { weapons = 1, stones = 1, grade = null } = {}) {
  const shift = { S: .18, A: .1, B: .04, C: 0 }[grade] ?? 0;
  const pool = [['weapon', 2 + Math.min(4, weapons)], ['element', 2 + Math.min(4, stones)], ['rune', 1], ['blank', Math.max(1, 5 - Math.round(shift * 20))]];
  const total = pool.reduce((s, [, w]) => s + w, 0);
  const pick = () => { let r = rng() * total; for (const [k, w] of pool) { if ((r -= w) <= 0) return k; } return 'blank'; };
  const grid = Array.from({ length: 9 }, pick);
  // the grade nudges: a blank in the middle row may slide to the symbol above it
  if (shift > 0) for (let c = 0; c < 3; c++) if (grid[3 + c] === 'blank' && rng() < shift * 3) grid[3 + c] = grid[c];
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const wins = lines.map((l) => l.map((i) => grid[i])).filter((v) => v[0] !== 'blank' && v.every((x) => x === v[0])).map((v) => v[0]);
  const bonus = [...new Set(wins.map((w) => (w === 'weapon' ? 'veteran' : w === 'element' ? 'double' : 'elite')))].slice(0, 2);
  return { grid, wins, bonus };
}
export function recordGrade(game, grade, runeId = null) { const kk = kkState(game); if (kk) { kk.lastGrade = grade; kk.lastGradeAt = kk.time; if (runeId) kk.onRuneDrawn?.(runeId); } }

export function trainUnit(game, site, element, { spin = false } = {}) {
  const kk = kkState(game); const inv = kk.inv; const weapon = site.weapon;
  const cost = TRAIN.gold + (spin ? TRAIN.spinGold : 0);
  if (kk.gold < cost) return { ok: false, why: `ZU WENIG GOLD (${cost}◉)` };
  if (!((inv.weapons[weapon] ?? 0) + (kk.store.weapons[weapon] ?? 0))) return { ok: false, why: 'DAFÜR FEHLT EINE WAFFE DIESER BURG' };
  if (element && !((inv.stones[element] ?? 0) + (kk.store.stones[element] ?? 0))) return { ok: false, why: 'DAFÜR FEHLT DER ELEMENTSTEIN' };
  kk.gold -= cost; const take = (bag, key, sub) => { if ((bag[sub][key] ?? 0) > 0) { bag[sub][key]--; return true; } return false; };
  take(inv, weapon, 'weapons') || take(kk.store, weapon, 'weapons'); if (element) take(inv, element, 'stones') || take(kk.store, element, 'stones');
  let reels = null;
  if (spin) { const recent = kk.time - kk.lastGradeAt < 90 ? kk.lastGrade : null; reels = spinReels(kk.rng, { weapons: (inv.weapons[weapon] ?? 0) + 1, stones: element ? (inv.stones[element] ?? 0) + 1 : 0, grade: recent }); }
  (kk.castleQueue[site.id] ??= []).push({ cls: site.cls, element, t: TRAIN.time, bonus: reels?.bonus ?? [], count: TRAIN.batch });
  return { ok: true, reels };
}
function updateQueues(game, dt) {
  const kk = kkState(game);
  for (const [id, q] of Object.entries(kk.castleQueue)) {
    if (!q.length) continue; const site = siteById(kk, id); if (!site || site.owner !== 0) { q.length = 0; continue; }
    q[0].t -= dt; if (q[0].t > 0) continue; const job = q.shift();
    if (garrisonOf(kk, id).length >= TRAIN.garrisonCap) { game.showAnnouncement?.('BURG VOLL — EINHEIT WARTET', 1.2); q.unshift({ ...job, t: 2 }); continue; }
    const n = Math.min(job.count ?? 1, TRAIN.garrisonCap - garrisonOf(kk, id).length); for (let i = 0; i < n; i++) addRecord(kk, { team: 'blue', cls: job.cls, element: job.element, tier: 1, bonus: job.bonus, row: site.row, x: site.x + (i - 1) * 30, z: site.z + .3, role: 'garrison', siteId: id });
    if (site.row === kk.row) game.showAnnouncement?.(`AUSGEBILDET: ${n}× ${unitName({ cls: job.cls, element: job.element, tier: 1 })}${job.bonus.length ? ' · ' + job.bonus.map((b) => BONUS_LABEL[b]).join(' + ') : ''}`, 1.4);
  }
  // garrison counts for the map (and a short alert when one shrinks)
  for (const s of [...kk.map.sites, ...kk.map.hqs]) { if (s.kind === 'castle' && s.owner !== 0) continue; s.garrison = garrisonOf(kk, s.id).filter((u) => mine(u) || u.team === 'blue').length; }
  for (const k of Object.keys(kk.alerts)) { kk.alerts[k] -= dt; if (kk.alerts[k] <= 0) delete kk.alerts[k]; }
}
const typeKey = (u) => `${u.cls}|${u.element ?? ''}|${u.tier}`;
export function groupTypes(list) { const m = new Map(); for (const u of list) { const k = typeKey(u); if (!m.has(k)) m.set(k, []); m.get(k).push(u); } return [...m.entries()].map(([key, units]) => ({ key, units, sample: units[0] })); }
// ▲ station one of a type from the squad at this castle; ▼ take one of a type from the garrison into the squad.
export function station(game, site, key) {
  const kk = kkState(game); const rec = squadRecords(kk).find((u) => typeKey(u) === key); if (!rec) return false;
  if (garrisonOf(kk, site.id).length >= TRAIN.garrisonCap) { game.showAnnouncement?.('BURG VOLL'); return false; }
  rec.role = 'garrison'; rec.siteId = site.id; if (rec.live) rec.live.followLeader = anchorFor(kk, rec); return true;
}
export function takeAlong(game, site, key) {
  const kk = kkState(game); const rec = garrisonOf(kk, site.id).find((u) => typeKey(u) === key && mine(u)); if (!rec) return false;
  if (squadRecords(kk).length >= squadCap(kk)) { game.showAnnouncement?.(`TRUPP VOLL (${squadCap(kk)})`); return false; }
  rec.role = 'squad'; rec.siteId = null; if (rec.live) rec.live.followLeader = game.player; return true;
}
// Three equal units (garrison of this castle) merge into one of the next tier; a reel bonus of any of them is kept.
export function mergeUnits(game, site, key) {
  const kk = kkState(game); const same = garrisonOf(kk, site.id).filter((u) => typeKey(u) === key && mine(u));
  if (same.length < TRAIN.mergeCount || same[0].tier >= TRAIN.maxTier) return false;
  const used = same.slice(0, TRAIN.mergeCount); const bonus = [...new Set(used.flatMap((u) => u.bonus ?? []))].slice(0, 2);
  for (const u of used) { despawn(game, u); kk.units.splice(kk.units.indexOf(u), 1); }
  const r = addRecord(kk, { team: 'blue', cls: used[0].cls, element: used[0].element, tier: used[0].tier + 1, bonus, row: site.row, x: site.x, z: site.z + .1, role: 'garrison', siteId: site.id });
  game.showAnnouncement?.(`VERSCHMOLZEN: ${unitName(r)}`, 1.6); combat.spawnShockwave?.(site.x, groundYForDepth(site.z) - 40, 70, '#ffe066'); return true;
}

// ── the castle panel (DOM, right edge) ─────────────────────────────────────────────────────────────────────────────
let panel = null;
export function closeKKPanel() { if (panel?.el) panel.el.style.display = 'none'; if (panel) panel.siteId = null; }
function ensurePanel(game) {
  const doc = globalThis.document; if (typeof doc?.createElement !== 'function' || typeof doc.body?.appendChild !== 'function') return null;
  if (panel?.el) return panel;
  const el = doc.createElement('div'); el.id = 'kk-castle-panel';
  el.style.cssText = 'position:fixed;left:max(1vw,env(safe-area-inset-left));top:27vh;z-index:63;width:min(270px,36vw);max-height:46vh;overflow:auto;font-family:monospace;font-size:11px;line-height:1.35;color:#f1e9d2;background:#1a1424e6;border:2px solid #c9a95a;padding:5px;display:none'; /* compact (user: the flag menu was too bulky) */
  el.addEventListener('pointerdown', (e) => { const b = e.target?.closest?.('[data-kk]'); if (!b) return; e.preventDefault(); e.stopPropagation(); onPanelAction(game, b.getAttribute('data-kk'), b.getAttribute('data-arg')); });
  doc.body.appendChild(el); panel = { el, siteId: null, html: '', spin: false, msg: '' }; return panel;
}
function onPanelAction(game, act, arg) {
  const kk = kkState(game); if (act === 'close') { kk.panelOpen = false; closeKKPanel(); return; }
  if (act === 'bag') { const c = bagUpgradeCost(kk); if (kk.gold >= c && (kk.bagLevel ?? 0) < BAG_MAX_LEVEL) { kk.gold -= c; kk.bagLevel = (kk.bagLevel ?? 0) + 1; panel.msg = `BEUTEL: ${bagSlots(kk)} PLÄTZE`; } return; } const site = siteById(kk, panel.siteId); if (!site) return;
  let res = true;
  if (act === 'train') { const r = trainUnit(game, site, arg || null, { spin: panel.spin }); res = r.ok; if (r.reels) showReels(game, r.reels, unitName({ cls: site.cls, element: arg || null, tier: 1 })); panel.msg = r.ok ? (r.reels ? `WALZEN: ${r.reels.grid.map((g) => REEL_SYMBOLS[g]).join('')} ${r.reels.bonus.length ? '→ ' + r.reels.bonus.map((b) => BONUS_LABEL[b]).join(' + ') : '→ kein Bonus'}` : 'IN AUSBILDUNG') : r.why; }
  else if (act === 'spin') panel.spin = !panel.spin;
  else if (act === 'upgrade' && kk.hqHooks) { const r = kk.hqHooks.upgrade(); res = r.ok; panel.msg = r.ok ? '' : r.why; }
  else if (act === 'resist' && kk.hqHooks) { const r = kk.hqHooks.resist(arg); res = r.ok; panel.msg = r.ok ? '' : r.why; }
  else if (act === 'egg' && kk.eggHooks) res = kk.eggHooks.take(site);
  else if (act === 'swap' && kk.crownHooks) res = kk.crownHooks.swap();
  else if (act === 'up') res = station(game, site, arg); else if (act === 'down') res = takeAlong(game, site, arg); else if (act === 'merge') res = mergeUnits(game, site, arg);
  if (!res) audio.playRuneFail?.(); else audio.playRuneChime?.(640);
  panel.html = ''; refreshPanel(game, site);
}
function refreshPanel(game, site) {
  const kk = kkState(game); const p = ensurePanel(game); if (!p) return;
  const isHQ = site.kind === 'hq'; const garrison = groupTypes(garrisonOf(kk, site.id).filter((u) => mine(u))); const squad = groupTypes(squadRecords(kk));
  const btn = (act, arg, label, on = true) => `<button data-kk="${act}" data-arg="${arg ?? ''}" ${on ? '' : 'disabled'} style="margin:1px;padding:2px 6px;min-height:26px;font:inherit;color:#fff3c8;background:${on ? '#3a2a4e' : '#2a2430'};border:1px solid #c9a95a">${label}</button>`;
  let h = `<div style="display:flex;align-items:center"><b style="color:#ffe9a8;flex:1">${isHQ ? 'HAUPTBURG' : site.label + 'BURG'}</b>${btn('close', '', '✕')}</div>`;
  if (!isHQ) {
    const els = [...new Set([...Object.keys(kk.inv.stones), ...Object.keys(kk.store.stones)].filter((e) => (kk.inv.stones[e] ?? 0) + (kk.store.stones[e] ?? 0) > 0))];
    const hasW = (kk.inv.weapons[site.weapon] ?? 0) + (kk.store.weapons[site.weapon] ?? 0);
    h += `<div style="color:#cbb8ff">${TRAIN.batch}er-Trupp: ${TRAIN.gold}◉ + ${site.label} [${hasW}] · ◉ ${kk.gold}</div>`;
    h += btn('train', '', `+${TRAIN.batch} ${CLASS_LABEL[site.cls]}`, hasW > 0);
    for (const e of els) h += btn('train', e, `+${TRAIN.batch} ${e.toUpperCase().slice(0, 5)}`, hasW > 0);
    h += btn('spin', '', panel.spin ? `WALZEN ✓ +${TRAIN.spinGold}◉` : 'WALZEN');
    const q = kk.castleQueue[site.id] ?? []; if (q.length) h += `<div style="color:#9fd">Warteschlange: ${q.length} · nächste in ${Math.ceil(q[0].t)} s</div>`;
  }
  if (isHQ && kk.hqHooks) {
    const x = kk.hqHooks.extras();
    h += `<div style="color:#cbb8ff">${['UNBEFESTIGT', 'HOLZBURG', 'STEINBURG', 'STAHLBURG', 'OBSIDIANBURG'][x.hq.level ?? 0]} · ♥ ${Math.max(0, Math.round(x.hq.hp))}</div>`;
    if (kk.reserve && kk.crownHooks) h += btn('swap', '', `RESERVE: ${kk.reserve.name} ⇄ DECK`);
    h += (kk.bagLevel ?? 0) < BAG_MAX_LEVEL ? btn('bag', '', `🎒 ${bagSlots(kk)}→${bagSlots(kk) + 4} (${bagUpgradeCost(kk)}◉)`, kk.gold >= bagUpgradeCost(kk)) : ''; /* the bag grows at the main castle */
    if (x.next) h += btn('upgrade', '', `BAUEN ${x.next.name} ${x.built}/${x.next.cost} (+${x.have})`, x.have > 0);
    for (const e of x.stones) { const c = x.resCost(e); h += btn('resist', e, `🛡${e.slice(0, 4).toUpperCase()} ${x.hq.res?.[e] ?? 0}${c ? '+' + c : ''}`, !!c && (x.hq.res?.[e] ?? 0) < (x.hq.level ?? 0)); }
  }
  h += `<div style="margin-top:4px;color:#ffe9a8">BURG ${garrison.reduce((s, g) => s + g.units.length, 0)}/${TRAIN.garrisonCap} · TRUPP ${squadRecords(kk).length}/${squadCap(kk)}</div>`;
  for (const g of garrison) h += `<div>${g.units.length}× ${unitName(g.sample)} ${btn('down', g.key, '▼')}${g.units.length >= TRAIN.mergeCount && g.sample.tier < TRAIN.maxTier ? btn('merge', g.key, '✦') : ''}</div>`;
  for (const g of squad) h += `<div style="color:#bfe">${g.units.length}× ${unitName(g.sample)} ${btn('up', g.key, '▲')}</div>`;
  if (site.egg) h += `<div style="margin-top:6px;color:#ffe9a8">EI (${site.egg.element.toUpperCase()}) LIEGT HIER ${btn('egg', '', 'MITNEHMEN', !kk.carry)}</div>`;
  if (p.msg) h += `<div style="margin-top:6px;color:#ffd27a">${p.msg}</div>`;
  if (h !== p.html) { p.el.innerHTML = h; p.html = h; }
  p.el.style.display = 'block'; p.siteId = site.id;
}
// The castle menu opens only on purpose: a tap / click on the own castle flag (kk_castle.js tryCastleTap).
export function closeCastleOpener() { /* the former button: the flag took its place */ }
function updatePanel(game) {
  const kk = kkState(game); const P = game.player;
  const own = kk.panelOpen && kk.flagSite ? kk.flagSite : null; /* the castle menu opens from the castle's flag (kk_castle.js tryCastleTap) */
  if (!own || !P.isAlive) { kk.panelOpen = false; if (panel?.siteId) { closeKKPanel(); if (panel) panel.msg = ''; } return; }
  if (!kk.panelOpen) { if (panel?.siteId) closeKKPanel(); return; }
  if (panel?.siteId !== own.id && panel) panel.msg = '';
  if (Math.floor(kk.time * 4) !== kk._panelTick || panel?.siteId !== own.id) { kk._panelTick = Math.floor(kk.time * 4); refreshPanel(game, own); }
}

export function updateArmy(game, dt) {
  if (!kkOn(game)) return;
  const kk = kkState(game); if (!kk.units) return;
  if (!kk._switchHooked) { (kk.switchHooks ??= []).push(() => onBandSwitch(game)); kk._switchHooked = true; }
  updatePatrols(game, dt); syncLive(game);
  for (const rec of kk.units) if (rec.live && (rec.role === 'guard' || rec.role === 'garrison')) anchorFor(kk, rec); /* the round of the guards moves on */ updateSites(game, dt); updateQueues(game, dt); updatePanel(game);
}
export function armyActors(game) {
  return []; /* the capture ring is drawn at the castle gate (kk_castle.js) */
}
