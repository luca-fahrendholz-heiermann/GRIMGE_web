// GRIMGE Prototype — weapon kits: the weapon-specific charge slots of the
// normal (non-transformed) mode (user, 18 Oct 2026).
//
//  • Charge DOWN on the ground = a weapon-specific buff or debuff that costs
//    mana — never an element (fire blades etc. come from rune spells). The
//    Warlock lays a binding circle, the sword & shield holds a counter
//    stance, the bow marks its prey, the claws enter a blood frenzy …
//  • Charge UP = the weapon's own launcher (the bow shoots an arrow that
//    lifts, the harp plucks a melody that floats the foe up, staffs erupt a
//    pillar under the foe, melee weapons cut a rising strike).
//  • Air DOWN = the weapon's own dive (plunge, meteor slam, spinning drop,
//    arrow rain, orb drop, pounce, seal, downdraft).
// The mechanic of every slot stays clear (the player knows what to expect);
// the look and the details belong to the weapon.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { WEAPONS, astralHue, makeWeaponShots } from './weapons.js';
import { projectilesOf, currentAttacker } from './signature_core.js';
import { infusionOnHit, updateInfusion } from './nature_spells.js';
import { zoneBuffOf } from './zone_buffs.js';

const TAU = Math.PI * 2;
const D = (name, kind, mana, extra = {}) => Object.freeze({ name, kind, mana, ...extra });
const U = (name, style, extra = {}) => Object.freeze({ name, style, ...extra });
const V = (name, style, extra = {}) => Object.freeze({ name, style, ...extra });

// ── Kit table: down (buff / debuff), up (launcher), dive ─────────────────
export const WEAPON_KITS = Object.freeze({
  sword_shield: { down: D('KONTERHALTUNG', 'counter', 8, { dur: 1.5, riposte: 34 }), up: U('AUFSTEIGENDER SCHNITT', 'rising'), dive: V('STURZSTICH', 'plunge') },
  mace_shield: { down: D('SCHILDWALL', 'counter', 8, { dur: 1.8, riposte: 28, stun: 1 }), up: U('SCHILDHEBER', 'rising', { lift: 1.1 }), dive: V('SCHILDSTURZ', 'meteor', { radius: 70 }) },
  scepter_shield: { down: D('LICHTKONTER', 'counter', 9, { dur: 1.5, riposte: 26, blind: true }), up: U('LICHTSÄULE', 'geyser'), dive: V('LICHTSTURZ', 'orbDrop') },
  great_axe: { down: D('BERSERKERWUT', 'rage', 10, { dur: 6 }), up: U('SPALTHEBER', 'rising', { lift: 1.15, dmg: 1.2 }), dive: V('AXTMETEOR', 'meteor', { radius: 90 }) },
  great_hammer: { down: D('ERDBRECHER', 'shatter', 10, { dur: 5, radius: 95 }), up: U('HAMMERSCHLEUDER', 'rising', { lift: 1.3, dmg: 1.1 }), dive: V('HAMMERFALL', 'meteor', { radius: 110 }) },
  dual_swords: { down: D('KLINGENTANZ', 'haste', 9, { dur: 6, speed: .72 }), up: U('KLINGENWIRBEL', 'rising', { hits: 2 }), dive: V('WIRBELSTURZ', 'spin') },
  katana: { down: D('IAI-HALTUNG', 'iai', 8, { dur: 3, mult: 2 }), up: U('TSUBAME-SCHNITT', 'rising', { crit: true }), dive: V('FALLENDER MOND', 'plunge', { dmg: 1.2 }) },
  odachi: { down: D('SAMMLUNG', 'iai', 9, { dur: 3, mult: 1.6, reach: 30 }), up: U('HIMMELSSCHNITT', 'rising', { lift: 1.1, reach: 1.3 }), dive: V('KLINGENFALL', 'plunge', { dmg: 1.3 }) },
  spear: { down: D('SPEERWALL', 'brace', 9, { dur: 3, reach: 120, every: .45, dmg: 14 }), up: U('HEBELSTOSS', 'hook'), dive: V('PFÄHLER', 'plunge') },
  glaive: { down: D('SICHELKREIS', 'brace', 9, { dur: 3, reach: 105, every: .6, dmg: 12, slow: true }), up: U('SICHELHEBER', 'hook'), dive: V('GLEVENWIRBEL', 'spin') },
  daggers: { down: D('SCHATTENSCHRITT', 'vanish', 8, { dur: 2.5, mult: 2 }), up: U('KEHLSCHNITT', 'rising'), dive: V('SCHATTENSPRUNG', 'pounce') },
  throwing_blades: { down: D('KLINGENFALLE', 'trap', 9, { count: 3, dmg: 18, root: 1 }), up: U('STEIGENDE KLINGE', 'shotLift', { kind: 'knife' }), dive: V('KLINGENREGEN', 'rain') },
  gauntlets: { down: D('CHI-FOKUS', 'chi', 9, { dur: 4, heal: 18 }), up: U('DRACHENFAUST', 'rising', { lift: 1.2 }), dive: V('FAUSTMETEOR', 'meteor', { radius: 75 }) },
  quarterstaff: { down: D('WIRBELABWEHR', 'spinGuard', 9, { dur: 2.2 }), up: U('STABHEBEL', 'rising', { lift: 1.25 }), dive: V('STABWIRBEL', 'spin') },
  twinblade: { down: D('KLINGENRAD', 'spinGuard', 9, { dur: 2, cut: 8 }), up: U('DOPPELHEBER', 'rising', { hits: 2 }), dive: V('RADSTURZ', 'spin') },
  scythe: { down: D('SEELENMAL', 'reap', 10, { dur: 6, heal: 7 }), up: U('ERNTEHEBER', 'hook'), dive: V('SENSENFALL', 'plunge', { behind: true }) },
  chain_scythe: { down: D('KETTENFESSEL', 'snare', 9, { range: 240, root: 1.6 }), up: U('KETTENSCHWUNG', 'hook', { reach: 1.5 }), dive: V('KETTENSTURZ', 'spin') },
  ice_sword: { down: D('NEUSCHMIEDEN', 'reforge', 8, { hits: 3 }), up: U('FROSTHEBER', 'rising'), dive: V('EISSTURZ', 'plunge') },
  spellblade: { down: D('RUNENSIEGEL', 'sigil', 10, { hits: 4 }), up: U('RUNENHEBER', 'rising'), dive: V('RUNENSTURZ', 'orbDrop') },
  rune_greatsword: { down: D('RUNENPANZER', 'ward', 10, { shield: 45, dur: 6 }), up: U('RUNENSPALTER', 'rising', { lift: 1.15, dmg: 1.2 }), dive: V('RUNENFALL', 'meteor', { radius: 90 }) },
  bow: { down: D('JÄGERMAL', 'mark', 8, { dur: 6, mult: 1.35, range: 520 }), up: U('HIMMELSPFEIL', 'shotLift', { kind: 'arrow' }), dive: V('PFEILREGEN', 'rain') },
  crossbow: { down: D('ZIELMARKE', 'mark', 9, { dur: 6, mult: 1.3, range: 520, slow: true }), up: U('STEILBOLZEN', 'shotLift', { kind: 'bolt' }), dive: V('BOLZENSALVE', 'rain') },
  arcane_staff: { down: D('MANAQUELLE', 'well', 10, { dur: 5, mana: 4 }), up: U('ARKANSÄULE', 'geyser'), dive: V('ARKANSTURZ', 'orbDrop') },
  orb_focus: { down: D('ORBWÄCHTER', 'sentry', 10, { dur: 5, every: .6, dmg: 10 }), up: U('ORBSÄULE', 'geyser'), dive: V('ORBFALL', 'orbDrop') },
  sacred_staff: { down: D('SEGENSKREIS', 'well', 10, { dur: 5, heal: 5 }), up: U('HEILIGE SÄULE', 'geyser'), dive: V('SEGENSSTURZ', 'orbDrop') },
  warlock_rod: { down: D('FANGZIRKEL', 'circle', 11, { radius: 64, root: 1.8, dmg: 12 }), up: U('HÖLLENSÄULE', 'geyser', { hex: true }), dive: V('HEXENSTURZ', 'orbDrop') },
  rod_grimoire: { down: D('SCHWÄCHEFLUCH', 'curse', 10, { dur: 6, mult: .7, range: 200 }), up: U('FLUCHSÄULE', 'geyser', { hex: true }), dive: V('FLUCHSTURZ', 'orbDrop') },
  harp: { down: D('WIEGENLIED', 'lullaby', 10, { radius: 150, sleep: 1.1 }), up: U('SCHWEBEMELODIE', 'melody'), dive: V('KLANGSTURZ', 'orbDrop') },
  battle_zither: { down: D('KRIEGSAKKORD', 'warcry', 10, { dur: 6, mult: 1.25, radius: 160 }), up: U('BEBENAKKORD', 'melody', { chord: true }), dive: V('AKKORDSCHLAG', 'meteor', { radius: 80 }) },
  spirit_glaive: { down: D('GEISTERREICHWEITE', 'phantom', 9, { dur: 6, reach: 40 }), up: U('GEISTERHEBER', 'hook', { reach: 1.4 }), dive: V('GEISTERSTURZ', 'spin') },
  spirit_sword: { down: D('SEELENECHO', 'echo', 10, { dur: 6, mult: .6 }), up: U('ECHOHEBER', 'rising', { hits: 2 }), dive: V('ECHOSTURZ', 'plunge') },
  claws: { down: D('BLUTRAUSCH', 'frenzy', 9, { dur: 6, steal: .25 }), up: U('REISSENDER SPRUNG', 'pounceUp'), dive: V('RAUBTIERSPRUNG', 'pounce') },
  beast_staff: { down: D('TIERGEIST', 'beast', 11, { dur: 6, bites: 4, dmg: 14 }), up: U('PRANKENHEBER', 'rising', { lift: 1.15 }), dive: V('TIERSTURZ', 'pounce') },
  chakrams: { down: D('RINGWACHE', 'orbit', 9, { dur: 5, dmg: 8 }), up: U('STEIGRING', 'shotLift', { kind: 'chakram' }), dive: V('RINGREGEN', 'rain') },
  magic_cards: { down: D('GEZINKTE KARTEN', 'stacked', 9, { uses: 3 }), up: U('KARTENSÄULE', 'shotLift', { kind: 'card' }), dive: V('KARTENREGEN', 'rain') },
  talisman: { down: D('BANNSIEGEL', 'trap', 10, { count: 3, dmg: 22, burst: true }), up: U('SIEGELSÄULE', 'geyser'), dive: V('SIEGELSTURZ', 'seal') },
  ritual_fan: { down: D('RÜCKENWIND', 'tailwind', 8, { dur: 6, move: 1.3 }), up: U('AUFWIND', 'melody', { gust: true }), dive: V('FALLWIND', 'gust') }
});
export const kitOf = (player) => WEAPON_KITS[player?.weapon ?? player?.classWeapon] ?? null;
export const hasWeaponDown = (player) => !!kitOf(player)?.down;
const hueOf = (player) => astralHue(player.weapon ?? player.classWeapon);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
const foes = (player, game, objectives = false) => (game?.getHostileTargets?.(player.team, objectives) ?? []).filter((t) => t && !t.isDead && (t.hp ?? 1) > 0 && t.lifeState !== 'Dead');
const distOf = (a, b) => Math.hypot(a.x - b.x, ((a.z ?? 0) - (b.z ?? 0)) * 150);
const nearestAhead = (player, game, range) => foes(player, game).filter((t) => !t.isProp && (t.x - player.x) * (player.facing || 1) > -10 && distOf(t, player) < range).sort((a, b) => distOf(a, player) - distOf(b, player))[0] ?? null;
// Allies of the player's team (heroes, minions, the Primal) — the hostile list of the other team.
const alliesOf = (player, game) => (game?.getHostileTargets?.(player.team === 'red' ? 'blue' : 'red') ?? []).filter((t) => t && t.team === player.team && !t.isObjective);
const noMana = (player) => { combat.spawnDamageText(player.x, player.y - 70, 'NO MANA', { color: '#64b5f6' }); return false; };

// ── Target marks (debuffs on enemies) ────────────────────────────────────
function mark(target, key, dur, data = {}) { target._wkMarks ??= {}; target._wkMarks[key] = { until: now() + dur, ...data }; }
const marked = (target, key) => { const m = target?._wkMarks?.[key]; return m && m.until > now() ? m : null; };

// ── The visual: one FX object per kit action, drawn by its kind ──────────
export class KitFx {
  constructor(player, kind, data = {}) {
    this.owner = player; this.player = player; this.team = player.team; this.kind = kind; this.t = 0; this.dur = data.dur ?? .6;
    this.hue = data.hue ?? hueOf(player); this.x = data.x ?? player.x; this.z = data.z ?? player.z; this.f = player.facing || 1; this.isFinished = false;
    Object.assign(this, data);
  }
  update(dt, game) { this.t += dt; this.tick?.(this, dt, game); if (this.t >= this.dur) this.isFinished = true; }
  render(ctx) {
    const k = Math.min(1, this.t / this.dur); const a = Math.min(1, k * 6, (1 - k) * 4); const y = groundYForDepth(this.z);
    ctx.save(); ctx.lineCap = 'round';
    (KIT_PAINTERS[this.kind] ?? KIT_PAINTERS.ring)(ctx, this, k, a, y);
    ctx.restore();
  }
}
const ring = (ctx, x, y, r, color, w, a, sq = .32) => { if (a <= 0 || r <= 0) return; ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, r, r * sq, 0, 0, TAU); ctx.stroke(); };
const poly = (ctx, pts, fill, a, stroke = null) => { ctx.globalAlpha = a; ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } };
const KIT_PAINTERS = {
  ring: (ctx, fx, k, a, y) => ring(ctx, fx.x, y, 20 + 60 * k, fx.hue, 3, a),
  // Warlock binding circle: demonic sigil with rotating runes and teeth.
  circle: (ctx, fx, k, a, y) => {
    const R = fx.radius * Math.min(1, k * 3);
    ring(ctx, fx.x, y, R, '#ff3d6e', 3, a); ring(ctx, fx.x, y, R * .72, '#7a1030', 2, a);
    for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU + fx.t * 1.5; const px = fx.x + Math.cos(ang) * R * .86; const py = y + Math.sin(ang) * R * .86 * .32; poly(ctx, [[px - 4, py], [px, py - 7], [px + 4, py]], '#ff3d6e', a); }
    if (fx.t > .45) for (let i = 0; i < 5; i++) { const ang = i / 5 * TAU; const px = fx.x + Math.cos(ang) * R * .5; const py = y + Math.sin(ang) * R * .16; const h = 26 * Math.min(1, (fx.t - .45) * 6); poly(ctx, [[px - 3, py], [px + (i % 2 ? 4 : -4), py - h], [px + 3, py]], '#2a0612', a, '#ff3d6e'); }
  },
  // Counter stance: a shield glint and a parry arc in front.
  counter: (ctx, fx, k, a) => { const p = fx.player; const x = p.x + fx.f * 22; const y = p.y - 46; ctx.globalAlpha = a * (.6 + .4 * Math.sin(fx.t * 18)); ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 26, fx.f > 0 ? -1.1 : Math.PI - 1.1, fx.f > 0 ? 1.1 : Math.PI + 1.1); ctx.stroke(); poly(ctx, [[x + fx.f * 4, y - 6], [x + fx.f * 10, y], [x + fx.f * 4, y + 6], [x - fx.f * 2, y]], '#ffffff', a); },
  riposte: (ctx, fx, k, a) => { const p = fx.player; ctx.globalAlpha = a; ctx.strokeStyle = fx.hue; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(p.x, p.y - 40); ctx.lineTo(p.x + fx.f * 90 * Math.min(1, k * 3), p.y - 46); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); },
  // Rage: jagged red aura spikes around the Wizard.
  rage: (ctx, fx, k, a) => { const p = fx.player; for (let i = 0; i < 9; i++) { const ang = -Math.PI / 2 + (i - 4) * .32; const L = 30 + 12 * Math.sin(fx.t * 14 + i); poly(ctx, [[p.x + Math.cos(ang) * 14 - 3, p.y - 46 + Math.sin(ang) * 14], [p.x + Math.cos(ang) * L, p.y - 46 + Math.sin(ang) * L], [p.x + Math.cos(ang) * 14 + 3, p.y - 46 + Math.sin(ang) * 14]], i % 2 ? '#ff1744' : '#ff8a65', a * .8); } },
  // Earthbreaker: cracked ground plates bursting up in a ring.
  shatter: (ctx, fx, k, a, y) => { for (let i = 0; i < 10; i++) { const ang = i / 10 * TAU; const r = fx.radius * Math.min(1, k * 2.5); const px = fx.x + Math.cos(ang) * r; const py = y + Math.sin(ang) * r * .32; const h = 16 * Math.sin(Math.min(1, k * 2) * Math.PI); poly(ctx, [[px - 7, py], [px - 4, py - h], [px + 5, py - h * .8], [px + 7, py]], '#6d5a48', a, '#ffd180'); } ring(ctx, fx.x, y, fx.radius * Math.min(1, k * 2.5), '#ffd180', 2, a); },
  // Marks over an enemy (hunter mark / curse / soul mark / shatter).
  mark: (ctx, fx, k, a) => { const t = fx.target; if (!t) return; const x = t.x; const y = (t.y ?? 0) - (t.heroKey ? 104 : 70) + Math.sin(fx.t * 5) * 2; ctx.globalAlpha = a; ctx.strokeStyle = fx.hue; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 14); ctx.stroke(); poly(ctx, [[x - 3, y], [x, y - 3], [x + 3, y], [x, y + 3]], fx.hue, a); },
  // Haste / tailwind: speed streaks behind the Wizard.
  streaks: (ctx, fx, k, a) => { const p = fx.player; for (let i = 0; i < 4; i++) { const ph = (fx.t * 3 + i / 4) % 1; const yy = p.y - 20 - i * 14; ctx.globalAlpha = a * (1 - ph); ctx.strokeStyle = fx.hue; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - fx.f * (14 + ph * 40), yy); ctx.lineTo(p.x - fx.f * (34 + ph * 40), yy); ctx.stroke(); } },
  // Iai: the blade drawn back, a thin bright line of focus.
  iai: (ctx, fx, k, a) => { const p = fx.player; ctx.globalAlpha = a * (.5 + .5 * Math.sin(fx.t * 10)); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x - fx.f * 30, p.y - 36); ctx.lineTo(p.x + fx.f * 60, p.y - 36); ctx.stroke(); poly(ctx, [[p.x + fx.f * 60, p.y - 39], [p.x + fx.f * 70, p.y - 36], [p.x + fx.f * 60, p.y - 33]], fx.hue, a); },
  // Spear wall / sickle circle: braced points ahead.
  brace: (ctx, fx, k, a) => { const p = fx.player; for (let i = 0; i < 3; i++) { const yy = p.y - 30 - i * 10; poly(ctx, [[p.x + fx.f * 20, yy - 2], [p.x + fx.f * (fx.reach - 10), yy - 1], [p.x + fx.f * fx.reach, yy], [p.x + fx.f * (fx.reach - 10), yy + 1], [p.x + fx.f * 20, yy + 2]], fx.hue, a * .8); } },
  vanish: (ctx, fx, k, a) => { const p = fx.player; for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU + fx.t * 3; poly(ctx, [[p.x + Math.cos(ang) * 22, p.y - 40 + Math.sin(ang) * 30], [p.x + Math.cos(ang) * 28 + 3, p.y - 40 + Math.sin(ang) * 36], [p.x + Math.cos(ang) * 28 - 3, p.y - 40 + Math.sin(ang) * 36 + 4]], '#3a2a5a', a * .7); } },
  // Blade trap / ward seal on the ground.
  trap: (ctx, fx, k, a, y) => { const armed = fx.armed !== false; if (fx.burst) { poly(ctx, [[fx.x - 8, y - 12], [fx.x + 8, y - 12], [fx.x + 8, y + 4], [fx.x - 8, y + 4]], '#f6e7b8', a, '#d84315'); ring(ctx, fx.x, y, 14, '#d84315', 1.5, a); } else for (let i = 0; i < 3; i++) poly(ctx, [[fx.x - 8 + i * 8, y + 2], [fx.x - 6 + i * 8, y - 9], [fx.x - 4 + i * 8, y + 2]], '#cfd8dc', a, armed ? fx.hue : null); },
  chi: (ctx, fx, k, a) => { const p = fx.player; ctx.globalAlpha = a * .8; ctx.strokeStyle = '#fff59d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y - 44, 24 + 3 * Math.sin(fx.t * 8), 46, 0, 0, TAU); ctx.stroke(); ring(ctx, p.x, p.y, 26, '#fff59d', 2, a); },
  // Spinning guard: a whirling blade disc in front.
  spinGuard: (ctx, fx, k, a) => { const p = fx.player; const x = p.x + fx.f * 14; const y = p.y - 44; for (let i = 0; i < 2; i++) { const ang = fx.t * 22 + i * Math.PI; ctx.globalAlpha = a; ctx.strokeStyle = i ? '#ffffff' : fx.hue; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * 30, y - Math.sin(ang) * 30); ctx.lineTo(x + Math.cos(ang) * 30, y + Math.sin(ang) * 30); ctx.stroke(); } ring(ctx, x, y, 32, fx.hue, 1.5, a * .6, 1); },
  reforge: (ctx, fx, k, a) => { const p = fx.player; for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU; const r = 40 * (1 - k); poly(ctx, [[p.x + fx.f * 20 + Math.cos(ang) * r, p.y - 50 + Math.sin(ang) * r - 4], [p.x + fx.f * 20 + Math.cos(ang) * r + 4, p.y - 50 + Math.sin(ang) * r], [p.x + fx.f * 20 + Math.cos(ang) * r, p.y - 50 + Math.sin(ang) * r + 4]], '#b3f0ff', a, '#ffffff'); } },
  // Chain snare: a chain from the hand to the rooted foe.
  chain: (ctx, fx, k, a) => { const p = fx.player; const t = fx.target; if (!t) return; const n = 10; for (let i = 0; i < n; i++) { const u = i / n; const x = p.x + fx.f * 14 + (t.x - p.x - fx.f * 14) * u; const y = p.y - 44 + ((t.y ?? p.y) - 30 - p.y + 44) * u; ctx.globalAlpha = a; ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 4, 2.5, i % 2 ? 0 : 1.57, 0, TAU); ctx.stroke(); } ring(ctx, t.x, groundYForDepth(t.z ?? p.z), 18, '#b0bec5', 2, a); },
  sigil: (ctx, fx, k, a) => { const p = fx.player; const x = p.x + fx.f * 18; const y = p.y - 50; ctx.globalAlpha = a; ctx.strokeStyle = fx.hue; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 5; i++) { const ang = -Math.PI / 2 + i * TAU * 2 / 5 + fx.t; const px = x + Math.cos(ang) * 12; const py = y + Math.sin(ang) * 12; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke(); },
  ward: (ctx, fx, k, a) => { const p = fx.player; for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU + fx.t * .8; const x = p.x + Math.cos(ang) * 28; const y = p.y - 44 + Math.sin(ang) * 40; poly(ctx, [[x - 5, y - 7], [x + 5, y - 7], [x + 6, y + 7], [x - 6, y + 7]], '#90caf9', a * .65, '#e3f2fd'); } },
  // Mana well / blessing circle at the feet.
  well: (ctx, fx, k, a, y) => { ring(ctx, fx.x, y, 46, fx.heal ? '#fff59d' : '#82b1ff', 3, a); ring(ctx, fx.x, y, 30, fx.heal ? '#ffffff' : '#448aff', 1.5, a); for (let i = 0; i < 5; i++) { const ph = (fx.t * .9 + i / 5) % 1; const ang = i / 5 * TAU; ctx.globalAlpha = a * (1 - ph); ctx.fillStyle = fx.heal ? '#fffde7' : '#bbdefb'; ctx.fillRect(fx.x + Math.cos(ang) * 30, y + Math.sin(ang) * 10 - ph * 50, 3, 5); } },
  sentry: (ctx, fx, k, a) => { const p = fx.player; const x = p.x - fx.f * 24; const y = p.y - 92 + Math.sin(fx.t * 3) * 4; ctx.globalAlpha = a; ctx.fillStyle = fx.hue; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke(); ring(ctx, x, y, 12, fx.hue, 1, a * .6, 1); },
  curse: (ctx, fx, k, a, y) => { const p = fx.player; for (let i = 0; i < 6; i++) { const u = i / 5; const x = p.x + fx.f * (30 + u * fx.range * Math.min(1, k * 2)); ctx.globalAlpha = a * (1 - u * .5); ctx.fillStyle = '#4a148c'; ctx.beginPath(); ctx.arc(x, y - 30 - Math.sin(fx.t * 6 + i) * 8, 6 + u * 4, 0, TAU); ctx.fill(); } },
  lullaby: (ctx, fx, k, a, y) => { for (let i = 0; i < 3; i++) ring(ctx, fx.x, y - 20, fx.radius * ((k + i / 3) % 1), '#f8bbd0', 2, a * (1 - ((k + i / 3) % 1)), .5); for (let i = 0; i < 4; i++) { ctx.globalAlpha = a; ctx.fillStyle = '#fce4ec'; ctx.font = '10px monospace'; ctx.fillText('♪', fx.x + Math.cos(i * 1.7 + fx.t) * fx.radius * .6, y - 40 - i * 8 - k * 20); } },
  warcry: (ctx, fx, k, a, y) => { ring(ctx, fx.x, y - 30, fx.radius * Math.min(1, k * 2), '#ffab40', 4, a, .6); ring(ctx, fx.x, y - 30, fx.radius * .6 * Math.min(1, k * 2), '#fff3e0', 2, a, .6); },
  phantom: (ctx, fx, k, a) => { const p = fx.player; ctx.globalAlpha = a * .5; ctx.strokeStyle = fx.hue; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(p.x + fx.f * 20, p.y - 40); ctx.lineTo(p.x + fx.f * (80 + fx.reach), p.y - 48); ctx.stroke(); },
  echo: (ctx, fx, k, a) => { const t = fx.target; if (!t) return; ctx.globalAlpha = a; ctx.strokeStyle = fx.hue; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(t.x - 20, (t.y ?? 0) - 50); ctx.lineTo(t.x + 20, (t.y ?? 0) - 20); ctx.stroke(); },
  frenzy: (ctx, fx, k, a) => { const p = fx.player; for (let i = 0; i < 3; i++) { const x = p.x + fx.f * (8 + i * 6); poly(ctx, [[x, p.y - 60], [x + fx.f * 6, p.y - 30], [x + fx.f * 2, p.y - 30]], '#d50000', a * .8); } },
  beast: (ctx, fx, k, a) => { const x = fx.bx ?? fx.player.x; const y = (fx.by ?? fx.player.y) - 20; poly(ctx, [[x - 18 * fx.f, y], [x - 4 * fx.f, y - 12], [x + 14 * fx.f, y - 10], [x + 22 * fx.f, y - 2], [x + 10 * fx.f, y + 6], [x - 10 * fx.f, y + 8]], '#a5d6a7', a * .85, '#e8f5e9'); poly(ctx, [[x + 10 * fx.f, y - 10], [x + 13 * fx.f, y - 20], [x + 17 * fx.f, y - 9]], '#a5d6a7', a * .85); },
  orbit: (ctx, fx, k, a) => { const p = fx.player; for (let i = 0; i < 2; i++) { const ang = fx.t * 8 + i * Math.PI; const x = p.x + Math.cos(ang) * 40; const y = p.y - 40 + Math.sin(ang) * 14; ctx.globalAlpha = a; ctx.strokeStyle = fx.hue; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.stroke(); } },
  stacked: (ctx, fx, k, a) => { const p = fx.player; for (let i = 0; i < 3; i++) { const x = p.x + (i - 1) * 9; const y = p.y - 92 - Math.abs(i - 1) * 3; poly(ctx, [[x - 4, y - 6], [x + 4, y - 6], [x + 4, y + 6], [x - 4, y + 6]], '#ffffff', a, '#d50000'); } },
  // Launchers and dives.
  geyser: (ctx, fx, k, a, y) => { const h = 120 * Math.sin(Math.min(1, k * 1.6) * Math.PI / 2); const w = 16 * (1 - k * .4); poly(ctx, [[fx.x - w, y], [fx.x - w * .6, y - h], [fx.x + w * .6, y - h], [fx.x + w, y]], fx.hex ? '#4a0e2a' : fx.hue, a * .85, fx.hex ? '#ff3d6e' : '#ffffff'); ring(ctx, fx.x, y, 24 + 20 * k, fx.hex ? '#ff3d6e' : fx.hue, 2, a); },
  rising: (ctx, fx, k, a) => { const p = fx.player; ctx.globalAlpha = a; ctx.strokeStyle = fx.hue; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x + fx.f * 10, p.y - 30, 44 * (fx.reach ?? 1), fx.f > 0 ? .9 : Math.PI - .9, fx.f > 0 ? -1.6 : Math.PI + 1.6, fx.f < 0); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); },
  hook: (ctx, fx, k, a) => { const p = fx.player; const L = 90 * (fx.reach ?? 1); ctx.globalAlpha = a; ctx.strokeStyle = fx.hue; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, p.y - 20); ctx.lineTo(p.x + fx.f * L, p.y - 20 - 50 * k); ctx.stroke(); poly(ctx, [[p.x + fx.f * L, p.y - 20 - 50 * k], [p.x + fx.f * (L - 12), p.y - 30 - 50 * k], [p.x + fx.f * (L - 6), p.y - 14 - 50 * k]], '#ffffff', a); },
  melody: (ctx, fx, k, a, y) => { for (let i = 0; i < 5; i++) { const u = (k * 1.4 + i / 5) % 1; const x = fx.player.x + fx.f * (20 + u * 160); ctx.globalAlpha = a * (1 - u); ctx.fillStyle = fx.gust ? '#e0f7fa' : '#fce4ec'; ctx.font = '13px monospace'; ctx.fillText(fx.gust ? '≋' : fx.chord ? '♫' : '♪', x, y - 30 - u * 60 - Math.sin(u * 9) * 6); } },
  meteor: (ctx, fx, k, a, y) => { for (let r = 0; r < 2; r++) ring(ctx, fx.x, y, fx.radius * Math.min(1, k * 2.4) * (1 - r * .35), r ? '#ffffff' : fx.hue, 4 - r * 2, a); for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; const r = fx.radius * Math.min(1, k * 2.4); poly(ctx, [[fx.x + Math.cos(ang) * r * .6, y + Math.sin(ang) * r * .2], [fx.x + Math.cos(ang) * r, y + Math.sin(ang) * r * .32 - 10 * (1 - k)], [fx.x + Math.cos(ang + .12) * r, y + Math.sin(ang + .12) * r * .32]], '#8d6e63', a); } },
  spin: (ctx, fx, k, a) => { const p = fx.player; for (let i = 0; i < 3; i++) { const ang = fx.t * 26 + i * TAU / 3; ctx.globalAlpha = a; ctx.strokeStyle = i ? fx.hue : '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y - 30, 40, 14, 0, ang, ang + 1.4); ctx.stroke(); } },
  plunge: (ctx, fx, k, a, y) => { const p = fx.player; ctx.globalAlpha = a; ctx.strokeStyle = fx.hue; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x + fx.f * 10, p.y - 60); ctx.lineTo(p.x + fx.f * 16, p.y + 2); ctx.stroke(); if (fx.landed) ring(ctx, p.x + fx.f * 16, y, 30 + 30 * k, fx.hue, 2, a); },
  pounce: (ctx, fx, k, a) => { const p = fx.player; for (let c = 0; c < 3; c++) poly(ctx, [[p.x + fx.f * 6, p.y - 40 + c * 6], [p.x + fx.f * 40, p.y - 20 + c * 7], [p.x + fx.f * 36, p.y - 17 + c * 7]], fx.hue, a); },
  orbDrop: (ctx, fx, k, a, y) => { ring(ctx, fx.x, y, 20 + 70 * k, fx.hue, 3, a); ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(fx.x, y - 10 * (1 - k), 8 * (1 - k) + 2, 0, TAU); ctx.fill(); },
  seal: (ctx, fx, k, a, y) => { poly(ctx, [[fx.x - 10, y - 16], [fx.x + 10, y - 16], [fx.x + 10, y + 6], [fx.x - 10, y + 6]], '#f6e7b8', a, '#d84315'); if (k > .6) ring(ctx, fx.x, y, 80 * (k - .6) / .4 + 10, '#d84315', 3, a); },
  gust: (ctx, fx, k, a, y) => { for (let i = 0; i < 4; i++) { const ph = (k + i / 4) % 1; ring(ctx, fx.player.x, y, 20 + ph * 70, '#e0f7fa', 2, a * (1 - ph)); } }
};
const fx = (spells, player, kind, data) => { const f = new KitFx(player, kind, { ...data, spells }); spells?.addSpell?.(f, 'B'); return f; };

// ── Charge DOWN: weapon-specific buff / debuff ───────────────────────────
export function castWeaponDown(player, game, spells) {
  const kit = kitOf(player); const d = kit?.down; if (!d) return false;
  if (player.freeMana < d.mana) return noMana(player);
  player.mp -= d.mana;
  const f = player.facing || 1;
  player.state = 'heavyStrike'; player.stateTimer = .32; player._weaponSwingTime = .32; player.vx = 0; player.vz = 0; player.canAttack = false;
  player.setWeaponMotion?.('heavy');
  player.lastWeaponDown = d.name;
  const buff = (extra = {}) => { player.weaponBuff = { kind: d.kind, name: d.name, t: d.dur ?? 6, def: d, ...extra }; };
  combat.spawnDamageText(player.x, player.y - 92, d.name, { color: hueOf(player) });
  switch (d.kind) {
    case 'counter': buff({ t: d.dur }); fx(spells, player, 'counter', { dur: d.dur }); break;
    case 'rage': buff(); fx(spells, player, 'rage', { dur: d.dur }); break;
    case 'shatter': {
      for (const t of foes(player, game)) if (distOf(t, player) < d.radius) { mark(t, 'shatter', d.dur); t.takeDamage?.(10, Math.sign(t.x - player.x || f) * 120, 80, .5, false, 'melee'); fx(spells, player, 'mark', { target: t, dur: d.dur, hue: '#ffd180' }); }
      fx(spells, player, 'shatter', { radius: d.radius, dur: .6 }); combat.shakeCamera(8, .25); break;
    }
    case 'haste': buff(); fx(spells, player, 'streaks', { dur: d.dur }); break;
    case 'tailwind': buff(); fx(spells, player, 'streaks', { dur: d.dur, hue: '#e0f7fa' }); break;
    case 'iai': buff({ t: d.dur, armed: true }); fx(spells, player, 'iai', { dur: d.dur }); break;
    case 'brace': buff({ t: d.dur, next: 0 }); fx(spells, player, 'brace', { dur: d.dur, reach: d.reach }); break;
    case 'vanish': buff({ t: d.dur, armed: true }); player.invulnerableTimer = Math.max(player.invulnerableTimer ?? 0, .4); fx(spells, player, 'vanish', { dur: d.dur }); break;
    case 'trap': for (let i = 0; i < d.count; i++) fx(spells, player, 'trap', { x: player.x + f * (50 + i * 34), z: player.z + (i - 1) * .06, dur: 8, burst: d.burst, armed: true, tick: trapTick(d) }); break;
    case 'chi': buff(); player.hp = Math.min(player.maxHp, player.hp + d.heal); fx(spells, player, 'chi', { dur: d.dur }); break;
    case 'spinGuard': buff({ t: d.dur, next: 0 }); fx(spells, player, 'spinGuard', { dur: d.dur }); break;
    case 'reap': {
      for (const t of foes(player, game)) if ((t.x - player.x) * f > -10 && distOf(t, player) < 160) { mark(t, 'reap', d.dur, { heal: d.heal, by: player }); fx(spells, player, 'mark', { target: t, dur: d.dur, hue: '#b2ff59' }); }
      break;
    }
    case 'snare': { const t = nearestAhead(player, game, d.range); if (t) { t.slow ? t.slow(d.root, .02) : null; t.takeDamage?.(8, 0, 0, d.root, false, 'melee'); fx(spells, player, 'chain', { target: t, dur: d.root }); } break; }
    case 'reforge': if (player.weaponDurability != null) player.weaponDurability = WEAPONS[player.weapon]?.durability ?? Math.max(player.weaponDurability, 12); buff({ t: 12, hits: d.hits }); fx(spells, player, 'reforge', { dur: .5 }); break;
    case 'sigil': buff({ t: 10, hits: d.hits }); fx(spells, player, 'sigil', { dur: 10 }); break;
    case 'ward': buff(); player.arcaneShield = Math.max(player.arcaneShield ?? 0, d.shield); player.arcaneShieldTimer = Math.max(player.arcaneShieldTimer ?? 0, d.dur); fx(spells, player, 'ward', { dur: d.dur }); break;
    case 'mark': { const t = nearestAhead(player, game, d.range); if (t) { mark(t, 'hunt', d.dur, { mult: d.mult, by: player }); if (d.slow) t.slow?.(d.dur * .5, .7); fx(spells, player, 'mark', { target: t, dur: d.dur }); } break; }
    case 'well': fx(spells, player, 'well', { dur: d.dur, heal: d.heal, tick: wellTick(d) }); break;
    case 'sentry': buff(); fx(spells, player, 'sentry', { dur: d.dur, next: 0, tick: sentryTick(d) }); break;
    case 'circle': { const t = nearestAhead(player, game, 260); fx(spells, player, 'circle', { x: t?.x ?? player.x + f * 120, z: t?.z ?? player.z, radius: d.radius, dur: 2.4, tick: circleTick(d) }); break; }
    case 'curse': {
      for (const t of foes(player, game)) if ((t.x - player.x) * f > -10 && distOf(t, player) < d.range) { mark(t, 'curse', d.dur, { mult: d.mult }); fx(spells, player, 'mark', { target: t, dur: d.dur, hue: '#9c27b0' }); }
      fx(spells, player, 'curse', { dur: .7, range: d.range }); break;
    }
    case 'lullaby': for (const t of foes(player, game)) if (distOf(t, player) < d.radius) { t.slow?.(3, .4); t.takeDamage?.(1, 0, 0, d.sleep, false, 'spell'); } fx(spells, player, 'lullaby', { radius: d.radius, dur: 1 }); break;
    case 'warcry': { player.weaponBuff = { kind: 'warcry', name: d.name, t: d.dur, def: d }; for (const ally of alliesOf(player, game)) if (ally !== player && distOf(ally, player) < d.radius) ally.weaponBuff ??= { kind: 'warcry', name: d.name, t: d.dur, def: d }; fx(spells, player, 'warcry', { radius: d.radius, dur: .8 }); break; }
    case 'phantom': buff(); fx(spells, player, 'phantom', { dur: d.dur, reach: d.reach }); break;
    case 'echo': buff(); break;
    case 'frenzy': buff(); fx(spells, player, 'frenzy', { dur: d.dur }); break;
    case 'beast': fx(spells, player, 'beast', { dur: d.dur, bites: d.bites, next: .2, bx: player.x - f * 20, by: player.y, tick: beastTick(d) }); break;
    case 'orbit': buff(); fx(spells, player, 'orbit', { dur: d.dur, hits: new Map(), tick: orbitTick(d) }); break;
    case 'stacked': buff({ t: 20, uses: d.uses }); fx(spells, player, 'stacked', { dur: 2 }); break;
    default: break;
  }
  audio.playSpell?.('aura_shock');
  return true;
}
function trapTick(d) {
  return (s, dt, game) => {
    if (!s.armed) return;
    for (const t of foes(s.player, game)) {
      if (Math.hypot(t.x - s.x, ((t.z ?? s.z) - s.z) * 150) > 22) continue;
      s.armed = false; s.t = Math.max(s.t, s.dur - .4);
      t.takeDamage?.(d.dmg, 0, d.burst ? 160 : 0, d.root ?? .6, false, 'spell'); if (d.root) t.slow?.(d.root, .05);
      combat.spawnShockwave(s.x, groundYForDepth(s.z) - 6, 30, d.burst ? '#d84315' : s.hue); break;
    }
  };
}
function wellTick(d) {
  return (s, dt, game) => {
    const p = s.player; if (Math.hypot(p.x - s.x, (p.z - s.z) * 150) > 52) return;
    if (d.mana) p.mp = Math.min(p.maxMp, p.mp + d.mana * dt);
    if (d.heal) for (const ally of [p, ...alliesOf(p, game)]) if (ally?.hp > 0 && Math.hypot(ally.x - s.x, ((ally.z ?? s.z) - s.z) * 150) < 52) ally.hp = Math.min(ally.maxHp, ally.hp + d.heal * dt);
  };
}
function sentryTick(d) {
  return (s, dt, game) => {
    s.next -= dt; if (s.next > 0) return; s.next = d.every;
    const p = s.player; const t = nearestAhead(p, game, 420) ?? foes(p, game).filter((o) => !o.isProp && distOf(o, p) < 420).sort((a, b) => distOf(a, p) - distOf(b, p))[0];
    if (!t) return;
    const shots = makeWeaponShots(p, { kind: 'orb', speed: 520, damage: d.dmg, homing: 5, life: 1, size: .8 }, p.weapon ?? p.classWeapon);
    for (const sh of shots) { sh.x = p.x - (p.facing || 1) * 24; sh.height = (p.worldHeight ?? 0) + 92; sh.vx = Math.sign(t.x - sh.x || 1) * 520; s.spells?.addSpell?.(sh, 'B'); }
  };
}
function circleTick(d) {
  return (s, dt, game) => {
    if (s.done || s.t < .45) return; s.done = true;
    for (const t of foes(s.player, game)) if (Math.hypot(t.x - s.x, ((t.z ?? s.z) - s.z) * 150) < d.radius) { t.takeDamage?.(d.dmg, 0, 0, d.root, false, 'spell'); t.slow?.(d.root, .02); mark(t, 'bound', d.root); }
    combat.shakeCamera(4, .15);
  };
}
function beastTick(d) {
  return (s, dt, game) => {
    s.next -= dt; const p = s.player;
    const t = foes(p, game).filter((o) => !o.isProp && distOf(o, p) < 300).sort((a, b) => distOf(a, p) - distOf(b, p))[0];
    const goal = t ? t.x - Math.sign(t.x - p.x || 1) * 20 : p.x - (p.facing || 1) * 24;
    s.bx += (goal - s.bx) * Math.min(1, dt * 8); s.by = t?.y ?? p.y; s.f = t ? Math.sign(t.x - s.bx || 1) : p.facing || 1;
    if (t && s.next <= 0 && s.bites > 0 && Math.abs(t.x - s.bx) < 40) { s.next = .7; s.bites--; t.takeDamage?.(d.dmg, s.f * 160, 40, .3, false, 'melee'); combat.spawnHitSparks(t.x, (t.y ?? 0) - 26, s.f, '#a5d6a7', 8); }
  };
}
function orbitTick(d) {
  return (s, dt, game) => {
    const p = s.player;
    for (const t of foes(p, game)) {
      if (Math.abs(t.x - p.x) > 48 || Math.abs(((t.z ?? p.z) - p.z) * 150) > 22) continue;
      const last = s.hits.get(t) ?? -9; if (s.t - last < .35) continue;
      s.hits.set(t, s.t); t.takeDamage?.(d.dmg, Math.sign(t.x - p.x || 1) * 90, 20, .15, false, 'melee');
    }
  };
}

// ── Per-frame upkeep and hooks used by the Player ────────────────────────
export function updateWeaponKit(player, dt, game) {
  updateInfusion(player, dt, game); // rune weapon infusions + venom / bleed on foes
  const b = player.weaponBuff; if (!b) return;
  b.t -= dt;
  if (b.t <= 0 || (b.kind !== 'warcry' && kitOf(player)?.down?.kind !== b.kind && !(b.kind === 'stacked'))) { player.weaponBuff = null; return; }
  if (b.kind === 'brace') {
    b.next -= dt; if (b.next > 0) return; b.next = b.def.every;
    const f = player.facing || 1;
    for (const t of foes(player, game)) if ((t.x - player.x) * f > 0 && Math.abs(t.x - player.x) < b.def.reach && Math.abs(((t.z ?? player.z) - player.z) * 150) < 24) { t.takeDamage?.(b.def.dmg, f * (b.def.slow ? 60 : 260), 20, .25, false, 'melee'); if (b.def.slow) t.slow?.(1, .5); }
  }
  if (b.kind === 'spinGuard') {
    for (const pr of projectilesOf(game)) {
      if (pr.team === player.team) continue;
      const py = pr.y ?? groundYForDepth(pr.z ?? player.z);
      if (Math.abs(pr.x - player.x) < 54 && Math.abs(py - (player.y - 44)) < 70 && Math.abs(((pr.z ?? player.z) - player.z) * 150) < 30) { pr.isFinished = true; if ('life' in pr) pr.life = 0; combat.spawnHitSparks(pr.x, py, player.facing, '#ffffff', 6); }
    }
    if (b.def.cut) { b.next -= dt; if (b.next <= 0) { b.next = .3; for (const t of foes(player, game)) if (Math.abs(t.x - player.x) < 46 && Math.abs(((t.z ?? player.z) - player.z) * 150) < 22) t.takeDamage?.(b.def.cut, Math.sign(t.x - player.x || 1) * 80, 10, .1, false, 'melee'); } }
  }
}
export const weaponMoveMult = (player) => (player.weaponBuff?.kind === 'tailwind' ? player.weaponBuff.def.move : 1) * zoneBuffOf(player).move;
export const weaponAttackSpeed = (player) => (player.weaponBuff?.kind === 'haste' ? player.weaponBuff.def.speed : 1);
// Outgoing melee: global multipliers for this swing.
export function meleeBuffMods(player) {
  const b = player.weaponBuff; const m = { dmg: zoneBuffOf(player).dmg, kx: 1, reach: 0, guardBreak: 0, crit: false }; // Kriegsbanner zone
  if (!b) return m;
  if (b.kind === 'rage') { m.dmg *= 1.3; m.guardBreak += 25; }
  if (b.kind === 'warcry') m.dmg *= b.def.mult;
  if (b.kind === 'phantom') m.reach += b.def.reach;
  if ((b.kind === 'iai' || b.kind === 'vanish') && b.armed) { m.dmg *= b.def.mult; m.reach += b.def.reach ?? 0; m.crit = true; }
  return m;
}
// Per target: marks on the enemy (hunter mark, shatter).
export function targetDamageMult(player, target) {
  let k = 1;
  const hunt = marked(target, 'hunt'); if (hunt && hunt.by === player) k *= hunt.mult;
  if (marked(target, 'shatter')) k *= 1.3;
  return k;
}
// After a melee hit landed on a target.
export function onWeaponMeleeHit(player, target, damage, spells) {
  infusionOnHit(player, target, damage);
  const b = player.weaponBuff;
  const reap = marked(target, 'reap'); if (reap && reap.by === player) player.hp = Math.min(player.maxHp, player.hp + reap.heal);
  if (!b) return;
  if (b.kind === 'frenzy') player.hp = Math.min(player.maxHp, player.hp + damage * b.def.steal);
  if (b.kind === 'echo') fx(spells, player, 'echo', { target, dur: .3, tick: (s) => { if (!s.done && s.t > .22) { s.done = true; if (!target.isDead) target.takeDamage?.(damage * b.def.mult, (player.facing || 1) * 80, 10, .15, false, 'spell'); } } });
  if (b.kind === 'sigil' && b.hits > 0) { b.hits--; for (const sh of makeWeaponShots(player, { kind: 'rune', speed: 700, damage: 14, life: .6 }, player.weapon ?? player.classWeapon)) spells?.addSpell?.(sh, 'B'); if (!b.hits) player.weaponBuff = null; }
  if (b.kind === 'reforge' && b.hits > 0) { b.hits--; target.freeze?.(.7); if (!b.hits) player.weaponBuff = null; }
}
// After a swing (hit or miss): one-shot buffs are spent.
export function afterWeaponSwing(player, hitAny) {
  const b = player.weaponBuff; if (!b) return;
  if ((b.kind === 'iai' || b.kind === 'vanish') && b.armed && hitAny) player.weaponBuff = null;
}
// Incoming damage on the Player: counter stance, chi super armour, curse on the attacker.
export function weaponIncoming(player, amount, kx, stun, hitKind, spells) {
  const b = player.weaponBuff; const out = { amount, kx, stun, parried: false };
  const attacker = currentAttacker();
  const curse = marked(attacker, 'curse'); if (curse) out.amount *= curse.mult;
  if (player._blessT > 0) out.amount *= .75; // Segenskreis
  if (!b) return out;
  if (b.kind === 'counter' && hitKind === 'melee') {
    out.parried = true; player.weaponBuff = null;
    const a = attacker ?? null;
    if (a?.takeDamage) { a.takeDamage(b.def.riposte, (player.facing || 1) * 320, 60, b.def.stun ?? .7, true, 'melee'); if (b.def.blind) a.slow?.(1.2, .4); }
    fx(spells, player, 'riposte', { dur: .3 });
    combat.spawnHitSparks(player.x + (player.facing || 1) * 24, player.y - 44, player.facing, '#fff6c8', 16);
    audio.playImpact?.(true);
  }
  if (b.kind === 'chi') { out.stun = 0; out.kx *= .3; }
  if (b.kind === 'rage') out.amount *= 1.15;
  return out;
}
// Cards: a stacked deck turns every card of the next fans into a joker.
export function stackedShot(player, shot) {
  const b = player.weaponBuff;
  if (b?.kind !== 'stacked' || b.uses <= 0 || shot?.kind !== 'card') return shot;
  b.uses--; if (!b.uses) player.weaponBuff = null;
  return { ...shot, allJokers: true };
}

// ── Charge UP: the weapon's own launcher ─────────────────────────────────
export function weaponUp(player, charge, spells, game) {
  const up = kitOf(player)?.up; if (!up) return false;
  const f = player.facing || 1; const hue = hueOf(player);
  const heavy = WEAPONS[player.weapon ?? player.classWeapon]?.uppercut ?? { damage: 34, knockback: 120, lift: 460 };
  const dmg = heavy.damage * (1 + charge * .8) * (up.dmg ?? 1); const lift = (heavy.lift ?? 460) * (up.lift ?? 1) * (1 + charge * .3);
  player.lastWeaponUp = up.name; player.canAttack = false; player.vx = 0;
  const swing = (state = 'uppercut', time = .38) => { player.state = state; player.stateTimer = time; player._weaponSwingTime = time; player.setWeaponMotion?.(state === 'uppercut' ? 'uppercut' : 'heavy'); };
  switch (up.style) {
    case 'rising': case 'pounceUp': {
      swing(); if (up.style === 'pounceUp') player.vElevation = 260;
      const hits = up.hits ?? 1;
      for (let i = 0; i < hits; i++) player.triggerMeleeHitbox(dmg / hits, f * heavy.knockback * .3, lift, .55, charge > .7 || up.crit, { hitReaction: 'launch', reach: 80 * (up.reach ?? 1), hitstopTicks: 5, isCharged: true, crit: up.crit ? 1 : 0 });
      fx(spells, player, 'rising', { dur: .35, reach: up.reach, hue }); break;
    }
    case 'hook': {
      swing('heavyStrike');
      player.triggerMeleeHitbox(dmg, -f * 140, lift * .9, .55, charge > .7, { hitReaction: 'launch', reach: 120 * (up.reach ?? 1), hitstopTicks: 5, isCharged: true });
      fx(spells, player, 'hook', { dur: .35, reach: up.reach, hue }); break;
    }
    case 'geyser': {
      // A pillar erupts under the nearest foe ahead (or ahead of the Wizard).
      swing('heavyStrike', .34);
      const t = nearestAhead(player, game, 300); const x = t?.x ?? player.x + f * 120; const z = t?.z ?? player.z;
      fx(spells, player, 'geyser', { x, z, dur: .6, hex: up.hex, hue, tick: (s, dt, g) => { if (s.done || s.t < .12) return; s.done = true; for (const o of foes(player, g)) if (Math.hypot(o.x - x, ((o.z ?? z) - z) * 150) < 30) o.takeDamage?.(dmg * .9, 0, lift, .6, false, 'spell'); } });
      break;
    }
    case 'shotLift': {
      swing('heavyStrike', .32);
      const base = WEAPONS[player.weapon ?? player.classWeapon]?.heavy?.shot ?? { speed: 700, damage: 24, life: .8 };
      for (const sh of makeWeaponShots(player, { ...base, kind: up.kind ?? base.kind, count: 1, damage: dmg * .8, lift, knock: 60, pierce: false }, player.weapon ?? player.classWeapon)) { sh._vz = 0; spells?.addSpell?.(sh, 'B'); }
      break;
    }
    case 'melody': {
      swing('heavyStrike', .34);
      fx(spells, player, 'melody', { dur: .8, gust: up.gust, chord: up.chord, hue, hit: new Set(), tick: (s, dt, g) => { const reach = 20 + Math.min(1, s.t / .55) * 170; for (const o of foes(player, g)) { if (s.hit.has(o)) continue; const dx = (o.x - player.x) * f; if (dx > 0 && dx < reach && Math.abs(((o.z ?? player.z) - player.z) * 150) < 34) { s.hit.add(o); o.takeDamage?.(dmg * .7, f * (up.chord ? 220 : 40), lift * (up.chord ? .7 : 1), .6, false, 'spell'); } } } });
      break;
    }
    default: return false;
  }
  audio.playSlash(1.05);
  return true;
}

// ── Air DOWN: the weapon's own dive ──────────────────────────────────────
export function weaponDive(player, spells, game) {
  const dive = kitOf(player)?.dive; if (!dive) return false;
  const f = player.facing || 1; const hue = hueOf(player);
  player.lastWeaponDive = dive.name;
  const base = { damage: 55, knockback: 200, lift: -300 };
  const land = (s, cb) => { if (!s.landed && player.grounded) { s.landed = true; s.t = 0; s.dur = .4; cb?.(); } };
  switch (dive.style) {
    case 'plunge': {
      player.state = 'dive'; player.stateTimer = .35; player.vElevation = -900;
      player.triggerMeleeHitbox(base.damage * (dive.dmg ?? 1), f * 120, -340, .6, false, { hitstopTicks: 5, hitReaction: 'strong', behind: dive.behind });
      fx(spells, player, 'plunge', { dur: 2, hue, tick: (s) => land(s, () => player.triggerMeleeHitbox(18, f * 160, 120, .3, false, { reach: 60 })) });
      break;
    }
    case 'meteor': {
      player.state = 'dive'; player.stateTimer = .35; player.vElevation = -1100;
      fx(spells, player, 'meteor', { dur: 2, radius: dive.radius, hue, tick: (s, dt, g) => { s.x = player.x; s.z = player.z; land(s, () => { for (const o of foes(player, g)) if (distOf(o, player) < dive.radius) o.takeDamage?.(base.damage * .9, Math.sign(o.x - player.x || f) * 320, 180, .6, false, 'melee'); combat.shakeCamera(9, .25); }); } });
      break;
    }
    case 'spin': {
      player.state = 'dive'; player.stateTimer = .45; player.vElevation = -520;
      fx(spells, player, 'spin', { dur: .5, hue, next: 0, tick: (s, dt) => { s.next -= dt; if (s.next <= 0) { s.next = .12; player.triggerMeleeHitbox(14, f * 60, 30, .2, false, { reach: 64, behind: true, hitstopTicks: 2 }); } } });
      break;
    }
    case 'rain': {
      // A volley angled down; the shooter hops back a little.
      player.state = 'dive'; player.stateTimer = .3; player.vElevation = 120; player.vx = -f * 120;
      const shot = WEAPONS[player.weapon ?? player.classWeapon]?.heavy?.shot ?? { kind: 'knife', speed: 700, damage: 16, life: .7 };
      for (let i = 0; i < 3; i++) for (const sh of makeWeaponShots(player, { ...shot, count: 1, damage: (shot.damage ?? 18) * .6, life: .5, lift: -200, drop: 420 }, player.weapon ?? player.classWeapon)) { sh.vx *= .55 + i * .15; spells?.addSpell?.(sh, 'B'); }
      break;
    }
    case 'orbDrop': {
      player.state = 'dive'; player.stateTimer = .35; player.vElevation = -900;
      fx(spells, player, 'orbDrop', { dur: 2, hue, tick: (s, dt, g) => { s.x = player.x; s.z = player.z; land(s, () => { for (const o of foes(player, g)) if (distOf(o, player) < 90) o.takeDamage?.(32, Math.sign(o.x - player.x || f) * 260, 140, .5, false, 'spell'); }); } });
      break;
    }
    case 'pounce': {
      player.state = 'dive'; player.stateTimer = .4; player.vElevation = -600; player.vx = f * 420;
      player.triggerMeleeHitbox(base.damage * .8, f * 260, -120, .5, false, { reach: 70, hitstopTicks: 4, hitReaction: 'strong' });
      fx(spells, player, 'pounce', { dur: .35, hue });
      break;
    }
    case 'seal': {
      player.state = 'dive'; player.stateTimer = .3; player.vElevation = -700;
      const x = player.x + f * 30; const z = player.z;
      fx(spells, player, 'seal', { x, z, dur: 1.1, hue, tick: (s, dt, g) => { if (s.done || s.t < .7) return; s.done = true; for (const o of foes(player, g)) if (Math.hypot(o.x - x, ((o.z ?? z) - z) * 150) < 80) o.takeDamage?.(36, Math.sign(o.x - x || f) * 260, 200, .5, false, 'spell'); } });
      break;
    }
    case 'gust': {
      // A downdraft: pushes everything below away and stalls the fall.
      player.state = 'dive'; player.stateTimer = .35; player.vElevation = 160;
      for (const o of foes(player, game)) if (distOf(o, player) < 110) o.takeDamage?.(16, Math.sign(o.x - player.x || f) * 420, -100, .4, false, 'spell');
      fx(spells, player, 'gust', { dur: .5, hue });
      break;
    }
    default: return false;
  }
  audio.playSlash(.9);
  return true;
}
