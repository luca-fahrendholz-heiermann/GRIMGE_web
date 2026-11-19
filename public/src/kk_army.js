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
import { groundYForDepth } from './world.js';
import { CASTLE_CLASSES, mulberry32, spanAt } from './kk_map.js';
import { squadBonus, XP } from './kk_progress.js';
import { kkState, kkOn, SEAT_COLORS, elementColor } from './kk_world.js';
import { gainXp } from './kk_loot.js';

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
export const TRAIN = Object.freeze({ gold: 20, time: 6, spinGold: 10, mergeCount: 3, maxTier: 3, garrisonCap: 12, squadBase: 6 });
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
    this.team = rec.team; this.rec = rec; this.isKKUnit = true;
    const tierMul = 1 + (rec.tier - 1) * .55; const vet = rec.bonus?.includes('veteran') ? 1.25 : 1; const elite = rec.bonus?.includes('elite') ? 1.3 : 1;
    this.maxHp = Math.round(this.maxHp * stats.hp * tierMul * vet * (rec.bandit ? .9 : 1)); this.hp = Math.min(this.maxHp, rec.hp ?? this.maxHp);
    this.damage = Math.round(this.damage * stats.dmg * tierMul * elite); this.speed *= stats.spd; this.renderHeight = 54 + (rec.tier - 1) * 6;
    { const key = unitLook(rec); const arch = ART_ASSETS.archetypes?.[key]; if (ART_ASSETS.entities?.[key] || arch) { this.spriteKey = key; this.renderHeight = (arch?.renderHeight ?? 56) * (key === 'void_brute' ? .8 : 1) + (rec.tier - 1) * 6; } } /* painted sheets instead of the plain minions */
    this.statusElements = rec.element ? (rec.bonus?.includes('double') ? [rec.element, rec.element === 'frost' ? 'aqua' : 'ignis'] : [rec.element]) : null;
    this.runXpValue = 0;
  }
  performAttack(target, gameWorld) {
    if (!this.statusElements) return super.performAttack(target, gameWorld);
    const prev = setStatusSource({ team: this.team, statusElements: this.statusElements, castBy: this }); attackingElement = this.rec.element;
    try { return super.performAttack(target, gameWorld); } finally { setStatusSource(prev); attackingElement = null; }
  }
  takeDamage(amount, ...rest) {
    const kk = kkState(globalThis.window?.gameWorld); if (attackingElement && kk?.resistFn) amount *= kk.resistFn(this.rec, attackingElement);
    return super.takeDamage(amount, ...rest);
  }
  render(ctx) {
    super.render(ctx);
    const r = this.rec; const vh = this.renderHeight; const y = this.y - vh - 9; ctx.save();
    // the side's colour as a small pennant, the element as a gem, stars for the tier
    ctx.fillStyle = r.bandit ? '#5a4632' : SEAT_COLORS[r.seat ?? 0]; ctx.fillRect(Math.round(this.x - 9), Math.round(y - 3), 6, 5);
    if (r.element) { ctx.fillStyle = elementColor(r.element); ctx.fillRect(Math.round(this.x - 1), Math.round(y - 3), 5, 5); }
    if (r.tier > 1) { ctx.fillStyle = '#ffe066'; for (let i = 0; i < r.tier - 1; i++) ctx.fillRect(Math.round(this.x + 6 + i * 4), Math.round(y - 3), 3, 3); }
    ctx.restore();
  }
}

// ── records ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function initArmy(game) {
  const kk = kkState(game); const rng = mulberry32(kk.seed ^ 0x5eed);
  Object.assign(kk, { units: [], nextUnit: 1, castleQueue: {}, alerts: {}, rng, panelFor: null, lastGrade: null, lastGradeAt: -99, patrolTimer: 30 });
  const bandit = (site, n, extra = {}) => { for (let i = 0; i < n; i++) addRecord(kk, { team: 'red', bandit: true, cls: ['Guardian', 'Ranger', 'Berserker', 'Shadow', 'Lancer'][Math.floor(rng() * 5)], element: null, tier: 1, row: site.row, x: site.x + (rng() - .5) * 180, z: Math.max(.08, Math.min(.92, site.z + (rng() - .5) * .3)), role: 'guard', siteId: site.id, ...extra }); };
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
  if (site && rec.role !== 'patrol') { a.x = site.x + ((rec.id * 53) % 160) - 80; a.z = Math.max(.08, Math.min(.92, site.z + (((rec.id * 31) % 30) - 15) / 100)); }
  return a;
}
function spawnLive(game, rec) {
  const kk = kkState(game); const u = rec.creature && kk.creatureClass ? new kk.creatureClass(rec) : new KKUnit(rec); rec.live = u; /* creatures: kk_creatures.js */ u.x = rec.x; u.z = rec.z;
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
      if (rec.row !== kk.row || (rec.role !== 'squad' && Math.abs(rec.x - game.player.x) > 3000)) { despawn(game, rec); }
    } else if (rec.row === kk.row && rec.role !== 'prisoner' && Math.abs(rec.x - game.player.x) < 2600) spawnLive(game, rec); /* far parts of the band stay records too */
  }
}
function despawn(game, rec) { const u = rec.live; if (!u) return; const i = game.minions.indexOf(u); if (i >= 0) game.minions.splice(i, 1); rec.live = null; }
function onUnitDeath(game, rec) {
  const kk = kkState(game); kk.units.splice(kk.units.indexOf(rec), 1); rec.live = null;
  if (rec.creature && rec.team !== 'blue') { kk.onCreatureDeath?.(rec); return; }
  if (rec.team !== 'blue') { const g = 6 + Math.floor(Math.random() * 7); kk.gold += g; gainXp(game, XP.kill); combat.spawnDamageText?.(rec.x, groundYForDepth(rec.z) - 60, `+${g}◉`, { color: '#ffcf3a' }); }
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
      for (let i = 0; i < Math.min(6, strength); i++) addRecord(kk, { team: 'red', bandit: true, cls: ['Guardian', 'Ranger', 'Berserker', 'Shadow'][i % 4], element: null, tier: kk.time > 600 ? 2 : 1, row: camp.row, x: camp.x + dir * 120 + i * 14, z: .5, role: 'patrol', siteId: camp.id, dir, legEnd: camp.x + dir * (1400 + kk.rng() * 1600) });
    }
  }
  // a patrol walks its leg along the band (off-band ones move abstractly), then turns home
  for (const rec of kk.units) {
    if (rec.role !== 'patrol') continue;
    const a = rec._anchor ?? (rec._anchor = { isAlive: true, x: rec.x, z: .5 });
    if (!rec.live) { rec.x += rec.dir * 50 * dt; a.x = rec.x; }
    else if (kk.carry && Math.abs(game.player.x - a.x) < 1500) { a.x += Math.sign(game.player.x - a.x) * 70 * dt; a.z = game.player.z; } /* bandits smell an egg carrier */
    else { a.x += rec.dir * 55 * dt; a.z = .5 + Math.sin((a.x + rec.id * 40) * .002) * .12; }
    if ((rec.dir > 0 && a.x >= rec.legEnd) || (rec.dir < 0 && a.x <= rec.legEnd)) { rec.dir *= -1; const camp = siteById(kk, rec.siteId); rec.legEnd = camp ? camp.x : rec.x; }
    { const camp = siteById(kk, rec.siteId); const sp = spanAt(kk.map, rec.row, camp?.x ?? a.x) ?? [0, kk.map.width]; a.x = Math.max(sp[0] + 80, Math.min(sp[1] - 80, a.x)); if (!rec.live) rec.x = a.x; rec.legEnd = Math.max(sp[0] + 80, Math.min(sp[1] - 80, rec.legEnd)); } /* patrols stay in their stretch */
  }
}

// ── capturing, prisoners ───────────────────────────────────────────────────────────────────────────────────────────
const CAPTURE_TIME = 3;
function updateSites(game, dt) {
  const kk = kkState(game); const P = game.player; if (!P.isAlive) return;
  for (const s of kk.map.sites) {
    if (s.row !== kk.row) continue;
    const close = Math.abs(P.x - s.x) < 120 && Math.abs(P.z - s.z) < .2;
    if (s.kind === 'castle' && s.owner !== 0 && !sameTeam(kk, s.owner, 0)) { /* an ally's castle is not taken */
      const guards = hostileGuards(kk, s).length + kk.units.filter((u) => u.role === 'garrison' && u.siteId === s.id && u.team !== 'blue').length;
      kk.progress[s.id] = close && !guards ? (kk.progress[s.id] ?? 0) + dt : 0;
      if (close && guards && Math.floor(kk.time * 2) % 6 === 0) s.blockedHint = true;
      if (kk.progress[s.id] >= CAPTURE_TIME) {
        kk.progress[s.id] = 0; s.owner = 0; s.garrison = 0; gainXp(game, XP.capture);
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
  (kk.castleQueue[site.id] ??= []).push({ cls: site.cls, element, t: TRAIN.time, bonus: reels?.bonus ?? [] });
  return { ok: true, reels };
}
function updateQueues(game, dt) {
  const kk = kkState(game);
  for (const [id, q] of Object.entries(kk.castleQueue)) {
    if (!q.length) continue; const site = siteById(kk, id); if (!site || site.owner !== 0) { q.length = 0; continue; }
    q[0].t -= dt; if (q[0].t > 0) continue; const job = q.shift();
    if (garrisonOf(kk, id).length >= TRAIN.garrisonCap) { game.showAnnouncement?.('BURG VOLL — EINHEIT WARTET', 1.2); q.unshift({ ...job, t: 2 }); continue; }
    addRecord(kk, { team: 'blue', cls: job.cls, element: job.element, tier: 1, bonus: job.bonus, row: site.row, x: site.x, z: site.z + .1, role: 'garrison', siteId: id });
    if (site.row === kk.row) game.showAnnouncement?.(`AUSGEBILDET: ${unitName({ cls: job.cls, element: job.element, tier: 1 })}${job.bonus.length ? ' · ' + job.bonus.map((b) => BONUS_LABEL[b]).join(' + ') : ''}`, 1.4);
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
  el.style.cssText = 'position:fixed;right:max(1vw,env(safe-area-inset-right));top:34vh;z-index:61;width:min(340px,40vw);max-height:60vh;overflow:auto;font-family:monospace;font-size:12px;color:#f1e9d2;background:#1a1424ee;border:2px solid #c9a95a;padding:8px;display:none';
  el.addEventListener('pointerdown', (e) => { const b = e.target?.closest?.('[data-kk]'); if (!b) return; e.preventDefault(); e.stopPropagation(); onPanelAction(game, b.getAttribute('data-kk'), b.getAttribute('data-arg')); });
  doc.body.appendChild(el); panel = { el, siteId: null, html: '', spin: false, msg: '' }; return panel;
}
function onPanelAction(game, act, arg) {
  const kk = kkState(game); const site = siteById(kk, panel.siteId); if (!site) return;
  let res = true;
  if (act === 'train') { const r = trainUnit(game, site, arg || null, { spin: panel.spin }); res = r.ok; panel.msg = r.ok ? (r.reels ? `WALZEN: ${r.reels.grid.map((g) => REEL_SYMBOLS[g]).join('')} ${r.reels.bonus.length ? '→ ' + r.reels.bonus.map((b) => BONUS_LABEL[b]).join(' + ') : '→ kein Bonus'}` : 'IN AUSBILDUNG') : r.why; }
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
  const btn = (act, arg, label, on = true) => `<button data-kk="${act}" data-arg="${arg ?? ''}" ${on ? '' : 'disabled'} style="margin:2px;padding:4px 7px;min-height:30px;font:inherit;color:#fff3c8;background:${on ? '#3a2a4e' : '#2a2430'};border:1px solid #c9a95a">${label}</button>`;
  let h = `<b style="color:#ffe9a8">${isHQ ? 'HAUPTBURG' : site.label + 'BURG'}</b>`;
  if (!isHQ) {
    const els = [...new Set([...Object.keys(kk.inv.stones), ...Object.keys(kk.store.stones)].filter((e) => (kk.inv.stones[e] ?? 0) + (kk.store.stones[e] ?? 0) > 0))];
    const hasW = (kk.inv.weapons[site.weapon] ?? 0) + (kk.store.weapons[site.weapon] ?? 0);
    h += `<div style="margin:4px 0;color:#cbb8ff">AUSBILDEN (${TRAIN.gold}◉ + Waffe ${site.label} [${hasW}] + Stein) · Gold ${kk.gold}</div>`;
    h += btn('train', '', `${CLASS_LABEL[site.cls]} ohne Element`, hasW > 0);
    for (const e of els) h += btn('train', e, `${unitName({ cls: site.cls, element: e, tier: 1 })}`, hasW > 0);
    h += `<div>${btn('spin', '', panel.spin ? `WALZEN AN (+${TRAIN.spinGold}◉)` : 'WALZEN AUS')} ${kk.lastGrade && kk.time - kk.lastGradeAt < 90 ? 'Zeichennote ' + kk.lastGrade : 'zeichne eine Rune für bessere Walzen'}</div>`;
    const q = kk.castleQueue[site.id] ?? []; if (q.length) h += `<div style="color:#9fd">Warteschlange: ${q.length} · nächste in ${Math.ceil(q[0].t)} s</div>`;
  }
  if (isHQ && kk.hqHooks) {
    const x = kk.hqHooks.extras();
    h += `<div style="margin:4px 0;color:#cbb8ff">${['UNBEFESTIGT', 'HOLZBURG', 'STEINBURG', 'STAHLBURG', 'OBSIDIANBURG'][x.hq.level ?? 0]} · Leben ${Math.max(0, Math.round(x.hq.hp))}</div>`;
    if (kk.reserve && kk.crownHooks) h += btn('swap', '', `RESERVE: ${kk.reserve.name} ⇄ DECK`);
    if (x.next) h += btn('upgrade', '', `AUFRÜSTEN → ${x.next.name} (${x.next.cost} ${x.matName}, du hast ${x.have})`, x.have >= x.next.cost);
    for (const e of x.stones) { const c = x.resCost(e); h += btn('resist', e, `RESISTENZ ${e.toUpperCase()} ${x.hq.res?.[e] ?? 0}${c ? ' (+' + c + ' Steine)' : ''}`, !!c && (x.hq.res?.[e] ?? 0) < (x.hq.level ?? 0)); }
  }
  h += `<div style="margin-top:6px;color:#ffe9a8">STATIONIERT (${garrison.reduce((s, g) => s + g.units.length, 0)}/${TRAIN.garrisonCap})</div>`;
  for (const g of garrison) h += `<div>${g.units.length}× ${unitName(g.sample)} ${btn('down', g.key, '▼ mitnehmen')} ${g.units.length >= TRAIN.mergeCount && g.sample.tier < TRAIN.maxTier ? btn('merge', g.key, '✦ verschmelzen') : ''}</div>`;
  h += `<div style="margin-top:6px;color:#ffe9a8">TRUPP (${squadRecords(kk).length}/${squadCap(kk)})</div>`;
  for (const g of squad) h += `<div>${g.units.length}× ${unitName(g.sample)} ${btn('up', g.key, '▲ stationieren')}</div>`;
  if (site.egg) h += `<div style="margin-top:6px;color:#ffe9a8">EI (${site.egg.element.toUpperCase()}) LIEGT HIER ${btn('egg', '', 'MITNEHMEN', !kk.carry)}</div>`;
  if (p.msg) h += `<div style="margin-top:6px;color:#ffd27a">${p.msg}</div>`;
  if (h !== p.html) { p.el.innerHTML = h; p.html = h; }
  p.el.style.display = 'block'; p.siteId = site.id;
}
function updatePanel(game) {
  const kk = kkState(game); const P = game.player;
  const own = [...kk.map.sites.filter((s) => s.kind === 'castle' && s.owner === 0), ...kk.map.hqs.filter((h) => h.seat === 0)].find((s) => s.row === kk.row && Math.abs(P.x - s.x) < 170 && Math.abs(P.z - s.z) < .35);
  if (!own || !P.isAlive) { if (panel?.siteId) { closeKKPanel(); if (panel) panel.msg = ''; } return; }
  if (panel?.siteId !== own.id && panel) panel.msg = '';
  if (Math.floor(kk.time * 4) !== kk._panelTick || panel?.siteId !== own.id) { kk._panelTick = Math.floor(kk.time * 4); refreshPanel(game, own); }
}

export function updateArmy(game, dt) {
  if (!kkOn(game)) return;
  const kk = kkState(game); if (!kk.units) return;
  if (!kk._switchHooked) { (kk.switchHooks ??= []).push(() => onBandSwitch(game)); kk._switchHooked = true; }
  updatePatrols(game, dt); syncLive(game); updateSites(game, dt); updateQueues(game, dt); updatePanel(game);
}
// Capture rings over a castle being taken.
export function armyActors(game) {
  const kk = kkState(game); if (!kk?.units) return [];
  return kk.map.sites.filter((s) => s.row === kk.row && s.kind === 'castle' && kk.progress[s.id] > 0).map((s) => ({ y: groundYForDepth(s.z) + .6, render: (ctx) => { const k = Math.min(1, kk.progress[s.id] / CAPTURE_TIME); const y = groundYForDepth(s.z) - 170; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(s.x, y, 20, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = SEAT_COLORS[0]; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.x, y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); } }));
}
