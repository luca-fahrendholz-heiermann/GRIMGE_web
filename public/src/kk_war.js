// GRIMGE Prototype — Kronenkrieg in play, part 4: the war (GRIMGE_KRONENKRIEG.md §2, §6.5, §11, §12).
// Three bot rivals play the same map: an abstract strategist each (loot, train, capture, siege) that becomes a real
// fighter — the game's champion AI — whenever it stands in the player's band. Main castles grow in four tiers (wood →
// stone → steel → obsidian) and take element resistances; they can be besieged and fall. The Grimmflut closes in from
// minute 16; the last side with a living hero or a standing main castle wins.
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { CASTLE_CLASSES, kkDistance, biomeAt } from './kk_map.js';
import { rollChest, levelForXp, lootTier, XP, heroKillXp } from './kk_progress.js';
import { kkState, kkOn, SEAT_COLORS, SEAT_NAMES, elementColor } from './kk_world.js';
import { gainXp, dropPile } from './kk_loot.js';
import { addRecord, teamOfSeat, sameTeam } from './kk_army.js';

export const HQ_TIERS = Object.freeze([
  null, { mat: 'wood', cost: 30, name: 'HOLZBURG' }, { mat: 'stone', cost: 40, name: 'STEINBURG' }, { mat: 'steel', cost: 30, name: 'STAHLBURG' }, { mat: 'obsidian', cost: 20, name: 'OBSIDIANBURG' }
]);
export const RES_COST = Object.freeze([3, 6, 10, 15]);
export const MAT_DE = Object.freeze({ wood: 'HOLZ', stone: 'STEIN', steel: 'STAHL', obsidian: 'OBSIDIAN' });
export const FLOOD = Object.freeze({ start: 960, full: 1500, noReturn: 1200 });
const HQ_HP = 1500; const HQ_HP_MUL = [1, 1.5, 2.2, 3, 4];
const BOT_HEROES = ['warlord', 'mage', 'darklord'];
const BOT_SPEED = 150; const BAND_TIME = 2.2; const THINK = 1;

export const hqMaxHp = (hq) => Math.round(HQ_HP * HQ_HP_MUL[hq.level ?? 0]);
export function initWar(game) {
  const kk = kkState(game);
  for (const hq of kk.map.hqs) { hq.level = 0; hq.hp = hqMaxHp(hq); hq.res = {}; hq.fallen = false; hq.siegeT = 0; }
  kk.bots = kk.map.hqs.filter((h) => h.seat !== 0).map((h, i) => ({
    seat: h.seat, team: teamOfSeat(h.seat, kk), ally: kk.allies.includes(h.seat), heroKey: BOT_HEROES[i % BOT_HEROES.length], row: h.row, x: h.x + 160, z: .55,
    level: 1, xp: 0, gold: 0, alive: true, respawnT: 0, hpFrac: 1, task: null, think: i * .3, travel: 0, stones: {}, weapons: {}, kills: 0
  }));
  kk.over = false; kk.towerT = 0;
  // hooks for kk_army.js (it may not import this module: kk_war imports kk_army)
  kk.resistFn = (rec, el) => resistMul(kk, rec, el);
  kk.hqHooks = { extras: () => hqPanelExtras(game), upgrade: () => upgradeHQ(game), resist: (el) => addResistance(game, el) };
  kk.botLeader = (seat) => { const bot = kk.bots.find((b) => b.seat === seat); if (!bot) return null; if (kk.championBot === bot) return game.enemyChampion; return bot.anchor ?? (bot.anchor = { isBotAnchor: true, isAlive: true, x: bot.x, z: bot.z }); };
  game.enemyChampion.lifeState = 'Dead'; game.enemyChampion.respawnTimer = Infinity; kk.championBot = null;
  return kk;
}
const hqOfSeat = (kk, seat) => kk.map.hqs.find((h) => h.seat === seat);
const botSquad = (kk, bot) => kk.units.filter((u) => u.role === 'squad' && u.seat === bot.seat);
const strength = (list) => list.reduce((s, u) => s + u.tier * (u.tier > 1 ? 1.4 : 1), 0);
const siteById = (kk, id) => kk.map.sites.find((s) => s.id === id) ?? kk.map.hqs.find((h) => h.id === id);

// ── main castle: tiers and resistances (bought from the store + backpack) ──────────────────────────────────────────
const haveMat = (kk, m) => (kk.store[m] ?? 0) + (kk.inv[m] ?? 0);
const spendMat = (kk, m, n) => { const fromStore = Math.min(n, kk.store[m]); kk.store[m] -= fromStore; kk.inv[m] -= n - fromStore; };
export function upgradeHQ(game) {
  const kk = kkState(game); const hq = hqOfSeat(kk, 0); const next = HQ_TIERS[(hq.level ?? 0) + 1]; if (!next) return { ok: false, why: 'HÖCHSTE STUFE' };
  if (haveMat(kk, next.mat) < next.cost) return { ok: false, why: `${next.cost} ${MAT_DE[next.mat]} NÖTIG` };
  spendMat(kk, next.mat, next.cost); const frac = hq.hp / hqMaxHp(hq); hq.level++; hq.hp = Math.round(hqMaxHp(hq) * Math.max(frac, .5));
  combat.spawnShockwave?.(hq.x, groundYForDepth(hq.z) - 80, 160, '#ffe9a8'); audio.playRuneChime?.(900);
  game.showAnnouncement?.(`HAUPTBURG: ${next.name}`, 1.8); return { ok: true };
}
export const resLevel = (hq, el) => hq.res?.[el] ?? 0;
export function addResistance(game, el) {
  const kk = kkState(game); const hq = hqOfSeat(kk, 0); const lvl = resLevel(hq, el);
  if (lvl >= (hq.level ?? 0)) return { ok: false, why: 'JE BURGSTUFE EINE RESISTENZSTUFE' };
  const cost = RES_COST[lvl]; const have = (kk.store.stones[el] ?? 0) + (kk.inv.stones[el] ?? 0);
  if (have < cost) return { ok: false, why: `${cost} ${el.toUpperCase()}-STEINE NÖTIG` };
  let left = cost; const fromStore = Math.min(left, kk.store.stones[el] ?? 0); kk.store.stones[el] = (kk.store.stones[el] ?? 0) - fromStore; left -= fromStore; kk.inv.stones[el] = (kk.inv.stones[el] ?? 0) - left;
  hq.res[el] = lvl + 1; game.showAnnouncement?.(`RESISTENZ ${el.toUpperCase()} STUFE ${lvl + 1}`, 1.5); return { ok: true };
}
// How much of an element hit a fighter stationed at a main castle still takes (12 % less per resistance level).
export function resistMul(kk, rec, element) {
  if (!rec || !element || rec.role !== 'garrison') return 1; const hq = kk.map.hqs.find((h) => h.id === rec.siteId); return hq ? 1 - .12 * resLevel(hq, element) : 1;
}

// ── bots ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function pickTask(kk, bot) {
  const hq = hqOfSeat(kk, bot.seat); const mine = botSquad(kk, bot); const str = strength(mine);
  if (hq.siegeT > 0 && !hq.fallen) return { kind: 'defend', id: hq.id };
  // the big prize: a visible egg carrier or a player fighting a crowning trial is hunted by a strong rival (§9.1)
  if (!bot.ally && (kk.carry || kk.crown?.trial) && str >= 3 && kk.rng() < .6) return { kind: 'hunt', id: null };
  const owned = kk.map.sites.filter((s) => s.kind === 'castle' && s.owner === bot.seat);
  if (owned.length && bot.gold >= 25 && mine.length < 6) return { kind: 'train', id: owned.sort((a, b) => kkDistance(bot, a) - kkDistance(bot, b))[0].id };
  const guardStr = (s) => strength(kk.units.filter((u) => (u.siteId === s.id && u.role === 'guard' && u.team !== bot.team) || (u.siteId === s.id && u.role === 'garrison' && u.team !== bot.team)));
  const castles = kk.map.sites.filter((s) => s.kind === 'castle' && s.owner !== bot.seat && !sameTeam(kk, s.owner, bot.seat) && guardStr(s) * 1.1 <= str + bot.level * .8).sort((a, b) => kkDistance(bot, a) - kkDistance(bot, b));
  if (castles.length) return { kind: 'capture', id: castles[0].id };
  if (kk.time > 720 && str >= 8) { const foes = kk.map.hqs.filter((h) => !sameTeam(kk, h.seat, bot.seat) && !h.fallen).sort((a, b) => (a.garrison ?? 0) - (b.garrison ?? 0)); if (foes.length) return { kind: 'siege', id: foes[0].id }; }
  const loot = kk.map.sites.filter((s) => (s.kind === 'building' && !s.looted) || (s.kind === 'goldvein' && !(s.cd > 0)) || (s.kind === 'prison' && !s.freed)).sort((a, b) => kkDistance(bot, a) - kkDistance(bot, b));
  if (loot.length) return { kind: 'loot', id: loot[0].id };
  return { kind: 'idle', id: hq.id };
}
function moveBot(kk, bot, target, dt) {
  if (bot.travel > 0) { bot.travel -= dt; if (bot.travel <= 0) bot.row += Math.sign(target.row - bot.row); return false; }
  if (bot.row !== target.row) { bot.travel = BAND_TIME; return false; }
  const dx = target.x - bot.x; if (Math.abs(dx) < 90) return true;
  bot.x += Math.sign(dx) * Math.min(Math.abs(dx), BOT_SPEED * dt); return false;
}
function botGain(kk, bot, xp) { bot.xp += xp; bot.level = levelForXp(bot.xp); }
// Abstract fight at a site (outside the player's band): both sides lose units in proportion to the other's strength.
function abstractBattle(kk, bot, foes, dt) {
  const mine = botSquad(kk, bot); const sMine = strength(mine) + bot.level * .8; const sFoe = strength(foes);
  if (!foes.length) return true;
  if (kk.rng() < dt * sMine * .12) { const v = foes[Math.floor(kk.rng() * foes.length)]; kk.units.splice(kk.units.indexOf(v), 1); bot.gold += 8; botGain(kk, bot, XP.kill); }
  if (mine.length && kk.rng() < dt * sFoe * .08) { const v = mine[Math.floor(kk.rng() * mine.length)]; kk.units.splice(kk.units.indexOf(v), 1); }
  if (!mine.length && sFoe > bot.level * 1.5 && kk.rng() < dt * .05) bot.hpFrac -= .2;
  return false;
}
function actBot(game, bot, dt) {
  const kk = kkState(game); const t = bot.task; const site = t && siteById(kk, t.id); if (!site) { bot.task = null; return; }
  const inBand = bot.row === kk.row;
  if (t.kind === 'loot') {
    if (site.kind === 'building' && !site.looted) { site.looted = true; const c = rollChest(kk.seed * 13 + site.x, lootTier({ time: kk.time, middleBand: site.row === 1 }), { biomeElement: biomeAt(kk.map, site.row, site.x).element, weapons: CASTLE_CLASSES.map((x) => x.weapon) }); bot.gold += c.gold; for (const [e, n] of Object.entries(c.stones)) bot.stones[e] = (bot.stones[e] ?? 0) + n; for (const w of c.weapons) bot.weapons[w] = (bot.weapons[w] ?? 0) + 1; botGain(kk, bot, XP.search); }
    else if (site.kind === 'goldvein' && !(site.cd > 0)) { site.cd = 25; bot.gold += 20; botGain(kk, bot, XP.mine); }
    else if (site.kind === 'prison' && !site.freed) {
      const guards = kk.units.filter((u) => u.siteId === site.id && u.role === 'guard'); if (!inBand && !abstractBattle(kk, bot, guards, dt)) return; if (guards.length) return;
      site.freed = true; for (const p of site.prisoners ?? []) addRecord(kk, { team: bot.team, seat: bot.seat, cls: p.cls, element: null, tier: 1, row: site.row, x: site.x, z: site.z, role: 'squad' }); botGain(kk, bot, XP.free);
    }
    bot.task = null;
  } else if (t.kind === 'train') {
    while (bot.gold >= 20 && botSquad(kk, bot).length < 8) { bot.gold -= 20; const el = Object.keys(bot.stones).find((e) => bot.stones[e] > 0) ?? null; if (el) bot.stones[el]--; addRecord(kk, { team: bot.team, seat: bot.seat, cls: site.cls, element: el, tier: 1, row: site.row, x: site.x, z: site.z + .1, role: 'squad' }); }
    bot.task = null;
  } else if (t.kind === 'capture') {
    const foes = kk.units.filter((u) => u.siteId === site.id && (u.role === 'guard' || u.role === 'garrison') && u.team !== bot.team);
    if (!inBand && !abstractBattle(kk, bot, foes, dt)) return; if (foes.length) return;
    const was = site.owner; site.owner = bot.seat; botGain(kk, bot, XP.capture);
    for (const u of botSquad(kk, bot).slice(0, 2)) { u.role = 'garrison'; u.siteId = site.id; }
    if (was === 0) game.showAnnouncement?.(`${SEAT_NAMES[bot.seat]} HAT DEINE ${site.label}BURG EROBERT!`, 2.2);
    else if (bot.ally) game.showAnnouncement?.(`DEIN VERBÜNDETER ${SEAT_NAMES[bot.seat]} EROBERT DIE ${site.label}BURG`, 1.6);
    bot.task = null;
  } else if (t.kind === 'siege' || t.kind === 'defend') {
    if (site.seat === bot.seat || sameTeam(kk, site.seat, bot.seat)) { bot.task = null; return; }
    const defenders = kk.units.filter((u) => u.role === 'garrison' && u.siteId === site.id && u.team !== bot.team);
    if (!inBand && !abstractBattle(kk, bot, defenders, dt)) { site.siegeT = 3; return; }
    if (defenders.length) { site.siegeT = 3; return; }
    if (!inBand) { site.siegeT = 3; site.hp -= (strength(botSquad(kk, bot)) * 6 + bot.level * 4) * dt * (site.level >= 4 ? .7 : 1); if (site.hp <= 0) fallHQ(game, site, bot.seat); }
    if (!botSquad(kk, bot).length) bot.task = null;
  } else bot.task = null;
}
function updateBots(game, dt) {
  const kk = kkState(game);
  for (const bot of kk.bots) {
    const hq = hqOfSeat(kk, bot.seat);
    if (!bot.alive) { if (hq.fallen) continue; bot.respawnT -= dt; if (bot.respawnT <= 0 && kk.time < FLOOD.noReturn) { bot.alive = true; bot.hpFrac = 1; bot.row = hq.row; bot.x = hq.x + 160; } continue; }
    if (bot === kk.championBot) continue; /* the live champion moves by itself */
    bot.think -= dt; if (!bot.task || bot.think <= 0) { bot.think = THINK * 3; if (!bot.task) bot.task = pickTask(kk, bot); }
    if (bot.task?.kind === 'hunt') { const P = game.player; if (!(kk.carry || kk.crown?.trial) || !P.isAlive) { bot.task = null; continue; } moveBot(kk, bot, { row: kk.row, x: P.x }, dt); for (const u of botSquad(kk, bot)) if (!u.live) { u.row = bot.row; u.x += (bot.x - u.x) * Math.min(1, dt * 2); } continue; }
    const site = bot.task && siteById(kk, bot.task.id); if (!site) { bot.task = null; continue; }
    if (moveBot(kk, bot, site, dt)) actBot(game, bot, dt);
    if (bot.hpFrac <= 0) killBot(game, bot, null);
    // the squad follows (abstractly)
    for (const u of botSquad(kk, bot)) { if (!u.live) { u.row = bot.row; u.x += (bot.x - u.x) * Math.min(1, dt * 2); u.z = .5; } else if (u.live.followLeader?.isBotAnchor) { u.live.followLeader.x = bot.x; u.live.followLeader.z = bot.z; } }
  }
}
function killBot(game, bot, killer) {
  const kk = kkState(game); bot.alive = false; bot.respawnT = Math.min(25, 8 + kk.time / 60); bot.task = null;
  if (bot.gold > 0) dropPile(game, bot.x, bot.z, { gold: bot.gold, materials: {}, stones: { ...bot.stones }, weapons: Object.entries(bot.weapons).flatMap(([w, n]) => Array(n).fill(w)), runes: [], row: bot.row });
  bot.gold = 0; bot.stones = {}; bot.weapons = {};
  if (killer === 'player') { gainXp(game, heroKillXp(kk.level, bot.level)); game.showAnnouncement?.(`${SEAT_NAMES[bot.seat]} BESIEGT`, 1.8); }
}

// The bot in the player's band fights as the champion (the game's duel AI); only one at a time.
function updateChampion(game, dt) {
  const kk = kkState(game); const E = game.enemyChampion; const P = game.player;
  const cb = kk.championBot;
  if (cb) {
    if (E.lifeState !== 'Alive') { killBot(game, cb, 'player'); kk.championBot = null; E.lifeState = 'Dead'; E.respawnTimer = Infinity; return; }
    cb.x = E.x; cb.z = E.z; cb.hpFrac = E.hp / E.maxHp;
    if (cb.row !== kk.row) { kk.championBot = null; E.lifeState = 'Dead'; E.respawnTimer = Infinity; }
    return;
  }
  const bot = kk.bots.filter((b) => b.alive && !b.ally && b.row === kk.row && b.travel <= 0) /* an ally never becomes the enemy champion */.sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x))[0];
  if (!bot || Math.abs(bot.x - P.x) > 1100) return;
  kk.championBot = bot; E.team = bot.team; E.heroKey = bot.heroKey; E.maxHp = 600 + bot.level * 60; E.hp = Math.max(1, E.maxHp * bot.hpFrac);
  E.x = bot.x; E.z = bot.z; E.lifeState = 'Alive'; E.respawnTimer = Infinity; E.isDead = false; E.state = 'idle'; game.battlefield.placeOnSurface?.(E);
  for (const u of botSquad(kk, bot)) if (u.live) u.live.followLeader = E;
}
export function kkEnemyHome(game) { const kk = kkState(game); const cb = kk?.championBot; if (!cb) return null; const site = cb.task && siteById(kk, cb.task.id); return site && site.row === kk.row ? { x: site.x, z: site.z } : { x: cb.x, z: cb.z }; }

// ── sieges on the player's band, the HQ tower, falling ─────────────────────────────────────────────────────────────
function fallHQ(game, hq, by) {
  if (hq.fallen) return; hq.fallen = true; hq.hp = 0;
  game.showAnnouncement?.(hq.seat === 0 ? 'DEINE HAUPTBURG IST GEFALLEN — KEINE RÜCKKEHR MEHR' : `DIE HAUPTBURG VON ${SEAT_NAMES[hq.seat]} IST GEFALLEN`, 2.6);
  combat.spawnShockwave?.(hq.x, groundYForDepth(hq.z) - 80, 200, SEAT_COLORS[hq.seat]); combat.shakeCamera?.(10, .6);
}
function updateSieges(game, dt) {
  const kk = kkState(game);
  for (const hq of kk.map.hqs) {
    hq.siegeT = Math.max(0, (hq.siegeT ?? 0) - dt); if (hq.fallen || hq.row !== kk.row) continue;
    const myTeam = teamOfSeat(hq.seat, kk);
    const attackers = game.minions.filter((m) => m.isKKUnit && !m.isDead && m.team !== myTeam && Math.abs(m.x - hq.x) < 220);
    const defenders = game.minions.filter((m) => m.isKKUnit && !m.isDead && m.team === myTeam && m.rec?.role === 'garrison' && m.rec.siteId === hq.id);
    if (attackers.length) hq.siegeT = 3;
    if (attackers.length && !defenders.length) { hq.hp -= attackers.length * 7 * dt * (hq.level >= 4 ? .7 : 1); if (hq.hp <= 0) fallHQ(game, hq, attackers[0].rec?.seat); }
    // stone tier and up: a tower shoots at hostile units near the castle
    if (hq.level >= 2 && attackers.length) { hq.towerT = (hq.towerT ?? 0) - dt; if (hq.towerT <= 0) { hq.towerT = hq.level >= 3 ? .8 : 1.2; const t = attackers[0]; t.takeDamage(22 + hq.level * 6, Math.sign(t.x - hq.x) * 90, 30, .15); combat.spawnShockwave?.(t.x, t.y - 20, 22, SEAT_COLORS[hq.seat]); } }
  }
}

// ── Grimmflut and the end ──────────────────────────────────────────────────────────────────────────────────────────
export function floodFront(kk) { const f = Math.max(0, Math.min(1, (kk.time - FLOOD.start) / (FLOOD.full - FLOOD.start))); return f * kk.map.width / 2; }
export const inFlood = (kk, x) => { const f = floodFront(kk); return f > 0 && (x < f || x > kk.map.width - f); };
function updateFlood(game, dt) {
  const kk = kkState(game); if (kk.time < FLOOD.start) return;
  if (!kk.floodWarned) { kk.floodWarned = true; game.showAnnouncement?.('DIE GRIMMFLUT KOMMT — VON DEN RÄNDERN ZUR MITTE', 2.6); }
  const P = game.player; if (P.isAlive && inFlood(kk, P.x)) { P.takeHazardDamage?.(P.maxHp * .03 * dt * (1 + (kk.time - FLOOD.start) / 300)); }
  for (const u of [...kk.units]) if (inFlood(kk, u.x) && kk.rng() < dt * .05) { if (u.live) u.live.takeDamage(30); else kk.units.splice(kk.units.indexOf(u), 1); }
  for (const hq of kk.map.hqs) if (!hq.fallen && inFlood(kk, hq.x)) { hq.hp -= dt * (hq.level >= 4 ? 4 : 15); if (hq.hp <= 0) fallHQ(game, hq, null); }
  for (const b of kk.bots) if (b.alive && inFlood(kk, b.x) && b !== kk.championBot) { b.hpFrac -= dt * .02; if (b.hpFrac <= 0) killBot(game, b, null); }
}
export function kkCanRespawn(game) { const kk = kkState(game); return !!kk && !hqOfSeat(kk, 0).fallen && kk.time < FLOOD.noReturn; }
function sideAlive(game, seat) {
  const kk = kkState(game); const hq = hqOfSeat(kk, seat);
  if (seat === 0) return game.player.isAlive || (!hq.fallen && kk.time < FLOOD.noReturn);
  const bot = kk.bots.find((b) => b.seat === seat); return bot.alive || (!hq.fallen && kk.time < FLOOD.noReturn);
}
function checkEnd(game) {
  const kk = kkState(game); if (kk.over) return;
  const alive = [0, 1, 2, 3].filter((s) => sideAlive(game, s)); const teams = [...new Set(alive.map((s) => teamOfSeat(s, kk)))]; const mineTeam = teamOfSeat(0, kk);
  const armyOf = (team) => kk.units.filter((u) => u.team === team).length + alive.filter((s) => teamOfSeat(s, kk) === team).length;
  let winner = null;
  if (!teams.includes(mineTeam)) winner = -1;
  else if (teams.length === 1) winner = 0;
  else if (kk.time >= FLOOD.full) { const all = [...new Set([0, 1, 2, 3].map((s) => teamOfSeat(s, kk)))]; const best = all.sort((a, b) => armyOf(b) - armyOf(a))[0]; winner = best === mineTeam ? 0 : -1; }
  if (winner === null) return;
  kk.over = true;
  game.finishMode?.(winner === 0 ? 'blue' : 'red', winner === 0 ? 'SIEG — DEINE KRONE STEHT ALS LETZTE' : 'NIEDERLAGE — DEINE KRONE IST GEFALLEN');
}

export function updateWar(game, dt) {
  if (!kkOn(game)) return; const kk = kkState(game); if (!kk.bots) return;
  updateBots(game, dt); updateChampion(game, dt); updateSieges(game, dt); updateFlood(game, dt);
  if (Math.floor(kk.time) !== kk._endTick) { kk._endTick = Math.floor(kk.time); checkEnd(game); }
}

// ── drawing ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function warActors(game) {
  const kk = kkState(game); if (!kk?.bots) return []; const out = [];
  // HQ life bars when damaged
  for (const hq of kk.map.hqs) { if (hq.row !== kk.row || hq.hp >= hqMaxHp(hq)) continue; const y = groundYForDepth(hq.z) - 230; out.push({ y: groundYForDepth(hq.z) + .7, render: (ctx) => { ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(hq.x - 80, y, 160, 8); ctx.fillStyle = SEAT_COLORS[hq.seat]; ctx.fillRect(hq.x - 80, y, 160 * Math.max(0, hq.hp) / hqMaxHp(hq), 8); } }); }
  return out;
}
// The flood over the ground (world space), drawn after the ground.
export function renderFlood(ctx, game, x0, x1, top, bottom) {
  const kk = kkState(game); if (!kk || kk.time < FLOOD.start) return; const f = floodFront(kk); const W = kk.map.width; const t = kk.time;
  ctx.save(); ctx.fillStyle = 'rgba(40,6,60,.62)';
  if (f > x0) ctx.fillRect(x0, top, Math.min(f, x1) - x0, bottom - top);
  if (W - f < x1) ctx.fillRect(Math.max(W - f, x0), top, x1 - Math.max(W - f, x0), bottom - top);
  ctx.fillStyle = 'rgba(180,90,255,.5)'; for (const edge of [f, W - f]) if (edge > x0 && edge < x1) for (let y = top; y < bottom; y += 12) ctx.fillRect(edge - 3 + Math.sin(t * 3 + y * .05) * 4, y, 6, 8);
  ctx.restore();
}
// Bots on the minimap (only where the map is revealed) and the flood edges.
export function warMinimapDots(game) {
  const kk = kkState(game); if (!kk?.bots) return [];
  return kk.bots.filter((b) => b.alive && b !== kk.championBot && (b.ally || kk.reveal.has(b.row + ':' + Math.floor(b.x / 240)))).map((b) => ({ row: b.row, x: b.x, z: .5, color: SEAT_COLORS[b.seat] }));
}
export function hqPanelExtras(game) {
  const kk = kkState(game); const hq = hqOfSeat(kk, 0); const next = HQ_TIERS[(hq.level ?? 0) + 1];
  const stones = [...new Set([...Object.keys(kk.store.stones), ...Object.keys(kk.inv.stones)])].filter((e) => (kk.store.stones[e] ?? 0) + (kk.inv.stones[e] ?? 0) > 0);
  return { hq, next, matName: next ? MAT_DE[next.mat] : '', have: next ? haveMat(kk, next.mat) : 0, stones, resCost: (el) => RES_COST[resLevel(hq, el)] ?? null };
}
