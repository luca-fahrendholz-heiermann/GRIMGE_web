// GRIMGE Prototype — individual sprint attacks and air dives of the Arcane
// States / transformations (user, 18 Oct 2026: "vor allem Sprint-Punch sehr
// ähnlich", "im Air nach unten wischen … das fehlt gerade bei den Arcane
// States und Transformationen").
//
// Every form gets
//  • its own SPRINT ATTACK — own timing / mechanic (leap, pierce, chain push,
//    trail, echo …), own look along the dash and own impact;
//  • its own AIR DIVE — an attack straight down whose landing does the form's
//    thing (magma pool, coral spikes, gravity well, lightning column …).
// In an Arcane State both cost mana like every special of the state.
import { audio } from './audio.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { environment } from './environment.js';
import { FORM_SPRINT_ATTACKS, FORM_FX_HOOKS } from './form_actions.js';
import { FORM_PALETTES } from './form_moves.js';
import { BUFF_FORMS } from './buff_forms.js';
import { applyStatuses } from './buff_techniques.js';
import { applyStatus } from './status_effects.js';
import { plate, band, fallout, shard, orbitItem, TAU, lerp, line, specks, groundRing } from './buff_v32_kit.js';
import { drawWyrmHead, stoneRing, ACID_GLASS, ghostOf } from './buff_signatures.js';
import { giantHand } from './buff_v32_extra.js';
import { spiritArm } from './buff_v32_hands.js';
import { petal } from './buff_v32_bloom.js';
import { rubberArm, cracks, dome, boom, explode } from './arcane_devil.js';
import { bloodSpear, bloodWeapon } from './arcane_bloodarsenal.js';

export const FORM_SPECIAL_MANA = Object.freeze({ sprint: 4, dive: 4 });
// Delayed follow-up hits in game time (puppets, echoes); ticked from Player.update.
const pending = [];
const later = (delay, fn) => pending.push({ t: delay, fn });
export function tickFormSpecials(dt) { for (let i = pending.length - 1; i >= 0; i--) { pending[i].t -= dt; if (pending[i].t <= 0) { const { fn } = pending.splice(i, 1)[0]; fn(); } } }
const DEPTH = 150;
const foes = (p, game) => (game?.getHostileTargets?.(p.team) ?? []).filter((t) => t && !t.isDead && (t.hp ?? 1) > 0 && t.lifeState !== 'Dead');
const crystal = (m) => ({ ...m, kind: 'crystal' });

// Material of a form key: Arcane State id / moveset, or a Focus transformation palette.
export function formMat(key) {
  const byMoveset = Object.values(BUFF_FORMS).find((f) => f.id === key || f.moveset === key);
  if (byMoveset) return byMoveset.mat;
  const pal = FORM_PALETTES[key] ?? FORM_PALETTES.ascendant;
  return { kind: 'crystal', dark: pal.edge, body: pal.main, facet: pal.core, vein: pal.main, edge: pal.core, spark: pal.core, core: '#ffffff', glow: pal.glow, edgeGlow: pal.glow };
}
const formIdOf = (key) => Object.values(BUFF_FORMS).find((f) => f.id === key || f.moveset === key)?.id ?? key;

// ── Sprint attacks: mechanics (merged into FORM_SPRINT_ATTACKS) + looks + impacts ──
// Base timings: quick lunge / heavy ram / leap / piercing dash.
const LUNGE = { windup: .08, windupSpeed: .7, active: .22, lungeSpeed: 1.35, recovery: .28, damageMult: 1.15, reach: 92, carryMult: 1.2, recoilMult: 1.3, lift: 30, stun: .55, hitstopTicks: 6, pitch: 1 };
const RAM = { windup: .24, windupSpeed: .3, active: .16, lungeSpeed: 1.1, recovery: .45, damageMult: 1.3, reach: 104, carryMult: 1, recoilMult: 1.6, lift: 30, stun: .6, hitstopTicks: 9, pitch: .7 };
const LEAP = { windup: .12, windupSpeed: .55, active: .22, lungeSpeed: 1.25, recovery: .3, leap: 240, damageMult: 1.15, reach: 108, carryMult: 1.4, recoilMult: 1.2, lift: -60, stun: .7, hitstopTicks: 7, pitch: .9 };
const PIERCE = { windup: .05, windupSpeed: .8, active: .26, lungeSpeed: 1.5, recovery: .26, damageMult: 1.05, reach: 84, carryMult: 1, recoilMult: 1.1, lift: 20, stun: .45, hitstopTicks: 4, pierce: true, pitch: 1.15 };

export const FORM_SPRINTS = {
  T02: { ...RAM, impact: 'magma' },                 // Schlackenkern: magma ram, a lava trail
  T04: { ...RAM, chainPush: true, impact: 'coral' }, // Korallenschild: coral shield bash, heals
  T05: { ...LEAP, impact: 'gravity' },              // Bruchflug: gravity leap, pulls foes into the landing
  T06: { ...PIERCE, impact: 'shock' },              // Ionspindel: lightning step through everyone
  T08: { ...RAM, impact: 'bell' },                  // Ossuarium: bell ram, ringing stun
  T13: { ...PIERCE, impact: 'wires' },              // Fadenschlag: silk cut, wires slow
  T23: { ...PIERCE, windup: .02, lungeSpeed: 1.8, active: .18, impact: 'void' }, // Nullfeldträger: blink through
  T24: { ...LUNGE, impact: 'puppets' },             // Fadenregent: puppets strike along
  T35: { ...LUNGE, lungeSpeed: 1.55, carryMult: 1.6, impact: 'frost' }, // Kältestillstand: ice slide, freeze
  T37: { ...LUNGE, impact: 'acid' },                // Säuregerüst: acid splash cone
  T38: { ...RAM, chainPush: true, recoilMult: 1.8, impact: 'ring' }, // Asterglied: rolling stone ring
  T39: { ...LUNGE, impact: 'echo' },                // Vorausschnitt: the hit repeats from the past
  T40: { ...LEAP, leap: 200, impact: 'wyrm' },      // Sonnenwyrm: wyrm heads lunge, burn
  A01: { ...RAM, recoilMult: 1.9, damageMult: 1.4, impact: 'giant' }, // Göttlicher Riese: giant shoulder
  A02: { ...RAM, lift: 120, impact: 'ape' },        // Mystischer Affe: two-fist charge, quake
  A03: { ...LUNGE, impact: 'hands' },               // Tausendhand: fists strike along the dash
  A04: { ...LUNGE, impact: 'petals' },              // Klingenblüte: the swarm cuts through the lane
  A05: { ...LUNGE, lungeSpeed: 1.7, reach: 120, impact: 'rubber' }, // Dehnleib: a stretched ram, the foe bounces away
  A06: { ...RAM, impact: 'quake' },                 // Beben: a quake ram, everything around wobbles
  A07: { ...PIERCE, windup: .02, lungeSpeed: 1.9, impact: 'room' }, // Raum: a cut through everything on the line
  A08: { ...LEAP, leap: 180, impact: 'blast' },     // Sprengleib: a blast-driven leap, the impact explodes
  A09: { ...LEAP, leap: 200, impact: 'bayonet' }    // Blutarsenal: a bayonet charge, the struck foe bleeds
};
for (const [id, mech] of Object.entries(FORM_SPRINTS)) {
  const form = BUFF_FORMS[id]; if (!form) continue;
  FORM_SPRINT_ATTACKS[form.moveset] = Object.freeze({ ...mech, name: (form.tech.sprintHeavy?.name ?? id).toUpperCase() });
}

// Impacts on the first hit of the sprint attack.
const IMPACTS = {
  magma: (p, struck, game) => { environment.add('lava', struck.x, struck.z ?? p.z, { radius: 46, team: p.team }); applyStatuses(struck, ['burn'], p, p.facing); },
  coral: (p) => { p.hp = Math.min(p.maxHp, p.hp + 8); },
  gravity: (p, struck, game) => { for (const t of foes(p, game)) { const d = Math.hypot(t.x - struck.x, ((t.z ?? p.z) - (struck.z ?? p.z)) * DEPTH); if (t !== struck && d < 130) { t.kbVelX = -Math.sign(t.x - struck.x || 1) * 300; t.takeDamage?.(8, 0, 0, .3, false, 'spell'); } } },
  shock: (p, struck) => applyStatuses(struck, ['shock'], p, p.facing),
  bell: (p, struck, game) => { for (const t of foes(p, game)) if (Math.hypot(t.x - struck.x, ((t.z ?? p.z) - (struck.z ?? p.z)) * DEPTH) < 110) applyStatuses(t, ['stun'], p, p.facing); },
  wires: (p, struck) => applyStatuses(struck, ['slow'], p, p.facing),
  void: (p) => { p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, .25); },
  puppets: (p, struck) => { for (const delay of [.12, .24]) later(delay, () => { if (!struck.isDead) struck.takeDamage?.(10, (p.facing || 1) * 80, 20, .2, false, 'melee'); }); },
  frost: (p, struck) => { struck.freeze?.(.8); environment.add('ice', struck.x, struck.z ?? p.z, { radius: 40 }); },
  acid: (p, struck, game) => { for (const t of foes(p, game)) if ((t.x - p.x) * (p.facing || 1) > 0 && Math.hypot(t.x - struck.x, ((t.z ?? p.z) - (struck.z ?? p.z)) * DEPTH) < 90) applyStatuses(t, ['acid'], p, p.facing); },
  ring: () => {},
  echo: (p, struck) => later(.3, () => { if (!struck.isDead) struck.takeDamage?.(18, (p.facing || 1) * 200, 60, .3, false, 'melee'); }),
  wyrm: (p, struck) => applyStatuses(struck, ['burn'], p, p.facing),
  giant: () => combat.shakeCamera(10, .3),
  petals: (p, struck) => { for (const delay of [.06, .12, .18, .24]) later(delay, () => { if (!struck.isDead) struck.takeDamage?.(5, (p.facing || 1) * 60, 10, .1, false, 'melee'); }); },
  hands: (p, struck) => { for (const delay of [.08, .16, .24]) later(delay, () => { if (!struck.isDead) struck.takeDamage?.(7, (p.facing || 1) * 90, 20, .15, false, 'melee'); }); },
  rubber: (p, struck) => { if ('kbVelX' in struck) struck.kbVelX = (p.facing || 1) * 520; },
  quake: (p, struck, game) => { for (const t of foes(p, game)) if (t !== struck && Math.hypot(t.x - struck.x, ((t.z ?? p.z) - (struck.z ?? p.z)) * DEPTH) < 120) applyStatuses(t, ['stun'], p, p.facing); for (const o of environment.props) if (o.isSceneObject && !o.isDead && Math.hypot(o.x - struck.x, (o.z - (struck.z ?? p.z)) * DEPTH) < 110) o.takeDamage(20, (p.facing || 1) * 340, 0, 0, false, 'melee'); },
  room: (p, struck) => { struck.slow?.(1, .3); },
  bayonet: (p, struck) => applyStatus(struck, 'bleed'),
  blast: (p, struck, game) => explode(game, { team: p.team, caster: p, facing: p.facing || 1, power: 1 }, struck.x, struck.z ?? p.z, 70, 20),
  ape: (p, struck, game) => { for (const t of foes(p, game)) if (Math.hypot(t.x - struck.x, ((t.z ?? p.z) - (struck.z ?? p.z)) * DEPTH) < 90) t.takeDamage?.(10, Math.sign(t.x - struck.x || 1) * 220, 120, .3, false, 'spell'); combat.shakeCamera(7, .2); }
};
FORM_FX_HOOKS.impact = (player, formKey, hits, game) => {
  const mech = FORM_SPRINTS[formIdOf(formKey)]; const struck = [...hits].at(-1);
  if (!mech || !struck) return false;
  IMPACTS[mech.impact]?.(player, struck, game);
  return false; // the generic sparks still play
};

// Looks along the dash: q = { p, f, x, y (chest), k (0 wind-up … 1 struck), fade, t, mat }.
const SPRINT_LOOKS = {
  A05: (ctx, q) => rubberArm(ctx, q.x - q.f * 30, q.y, q.x + q.f * (20 + 50 * q.k), q.y - 2, q.mat, q.fade, 9),
  A06: (ctx, q) => cracks(ctx, q.x + q.f * (20 + 20 * q.k), q.y, 16 + 20 * q.k, 4, q.fade, '#ffffff', 7),
  A07: (ctx, q) => { line(ctx, [[q.x - q.f * 60, q.y + 10], [q.x + q.f * 40, q.y - 10]], '#ffffff', 3, q.fade); line(ctx, [[q.x - q.f * 60, q.y + 10], [q.x + q.f * 40, q.y - 10]], q.mat.body, 1.5, q.fade); },
  A08: (ctx, q) => boom(ctx, q.x - q.f * 24, q.y + 20, 20, q.k, 3),
  A09: (ctx, q) => bloodWeapon(ctx, 'blood_rifle', q.k > .6 ? 2 : 0, q.x + q.f * 6, q.y + 12, q.f, 0, q.fade),
  T02: (ctx, q) => { const m = { ...q.mat, kind: 'crust' }; plate(ctx, [[q.x + q.f * 8, q.y - 22], [q.x + q.f * 34, q.y - 14], [q.x + q.f * 38, q.y + 14], [q.x + q.f * 8, q.y + 22]], m, 9401, { alpha: q.fade, lit: 1, glowEdge: 1.2 }); fallout(ctx, [[q.x - q.f * 10, q.y + 30]], q.mat, q.t, 9402, { count: 8, alpha: q.fade }); },
  T04: (ctx, q) => { const c = crystal(q.mat); for (let i = -2; i <= 2; i++) plate(ctx, [[q.x + q.f * 18, q.y + i * 9 - 4], [q.x + q.f * (34 + (i % 2 ? 8 : 0)), q.y + i * 9], [q.x + q.f * 18, q.y + i * 9 + 4]], c, 9410 + i, { alpha: q.fade, glowEdge: 1 }); band(ctx, [[q.x + q.f * 16, q.y - 24], [q.x + q.f * 22, q.y], [q.x + q.f * 16, q.y + 24]], () => 4, c, 9415, { t: q.t, alpha: q.fade }); },
  T05: (ctx, q) => { ctx.save(); ctx.globalAlpha = q.fade; ctx.fillStyle = '#05040a'; ctx.beginPath(); ctx.arc(q.x + q.f * 20, q.y, 8 + 6 * q.k, 0, TAU); ctx.fill(); ctx.restore(); for (let i = 0; i < 6; i++) shard(ctx, q.x + q.f * 20 + Math.cos(q.t * 9 + i) * 22, q.y + Math.sin(q.t * 9 + i) * 14, 5, q.t * 9 + i, q.mat, 9420 + i, q.fade); },
  T06: (ctx, q) => { const roll = Math.floor(q.t * 30); const pts = Array.from({ length: 7 }, (_, i) => [q.x - q.f * (90 - i * 18), q.y + (i && i < 6 ? Math.sin(roll + i * 2.3) * 9 : 0)]); line(ctx, pts, q.mat.spark, 3, q.fade); line(ctx, pts, '#ffffff', 1, q.fade); orbitItem(ctx, 'coil', q.x + q.f * 20, q.y, 6, q.t * 20, q.mat, 9430, q.fade, q.t); },
  T08: (ctx, q) => { orbitItem(ctx, 'bell', q.x + q.f * (24 + 10 * q.k), q.y - 4, 14, Math.PI / 2 * -q.f, q.mat, 9440, q.fade, q.t); for (let r = 0; r < 2; r++) groundRing(ctx, q.x + q.f * 30, q.y + 8, 10 + r * 10 + 20 * q.k, q.mat, 0, q.fade * (1 - q.k * .5), 8, 9441 + r * 8, 2); },
  T13: (ctx, q) => { for (let w = -1; w <= 1; w++) line(ctx, [[q.x - q.f * 80, q.y + w * 10], [q.x + q.f * 30, q.y + w * 3]], w ? q.mat.vein : q.mat.edge, 1.5, q.fade); plate(ctx, [[q.x + q.f * 22, q.y - 3], [q.x + q.f * 44, q.y], [q.x + q.f * 22, q.y + 3]], q.mat, 9450, { alpha: q.fade, core: 1 }); },
  T23: (ctx, q) => { ctx.save(); ctx.globalAlpha = q.fade; ctx.fillStyle = '#050608'; for (const ox of [-70, 30]) { ctx.beginPath(); ctx.ellipse(q.x + q.f * ox, q.y, 8, 30, 0, 0, TAU); ctx.fill(); } ctx.strokeStyle = q.mat.spark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(q.x - q.f * 70, q.y); ctx.lineTo(q.x + q.f * 30, q.y); ctx.stroke(); ctx.restore(); },
  T24: (ctx, q) => { for (const [ox, oy] of [[-10, -40], [20, 30]]) { const x = q.x + q.f * (ox + 20 * q.k); const y = q.y + oy * .5; plate(ctx, [[x - 5, y - 14], [x + 5, y - 14], [x + 6, y + 10], [x - 6, y + 10]], { ...q.mat, kind: 'crust' }, 9460 + ox, { alpha: q.fade, lit: 1 }); line(ctx, [[x, y - 14], [x, y - 70]], q.mat.edge, 1, q.fade * .7); plate(ctx, [[x + q.f * 6, y - 4], [x + q.f * 22, y - 2], [x + q.f * 6, y]], q.mat, 9465 + ox, { alpha: q.fade }); } },
  T35: (ctx, q) => { const c = crystal(q.mat); for (let i = 0; i < 5; i++) { const x = q.x - q.f * (14 + i * 16); plate(ctx, [[x - 6, q.y + 40], [x, q.y + 26 - (i % 2) * 6], [x + 6, q.y + 40]], c, 9470 + i, { alpha: q.fade * (1 - i * .15), glowEdge: .9 }); } plate(ctx, [[q.x + q.f * 14, q.y - 16], [q.x + q.f * 30, q.y], [q.x + q.f * 14, q.y + 16]], c, 9476, { alpha: q.fade, glowEdge: 1.2 }); },
  T37: (ctx, q) => { band(ctx, [[q.x, q.y], [q.x + q.f * 20, q.y - 6], [q.x + q.f * 40, q.y + 4 * q.k]], () => 5, ACID_GLASS, 9480, { t: q.t, alpha: q.fade }); if (q.k > .5) fallout(ctx, [[q.x + q.f * 40, q.y]], ACID_GLASS, q.t, 9481, { count: 8, alpha: q.fade }); },
  T38: (ctx, q) => stoneRing(ctx, q.x + q.f * 30, q.y + 12, 18, .1, 0, q.t * 14 * q.f, 6, 9490, q.fade, null, 2),
  T39: (ctx, q) => { const p = q.p; for (let i = 1; i <= 3; i++) ghostOf(ctx, p, q.x - q.f * i * 22, p.y, p.state, p.animTime, q.f, .35 / i, q.mat.edge); },
  T40: (ctx, q) => { for (const oy of [-14, 14]) { const pts = [[q.x - q.f * 20, q.y + oy], [q.x + q.f * 6, q.y + oy * .6 - 6], [q.x + q.f * (26 + 14 * q.k), q.y + oy * .4]]; band(ctx, pts, (i, n) => 5 - i, { ...q.mat, kind: 'crust' }, 9500 + oy, { t: q.t, alpha: q.fade }); drawWyrmHead(ctx, pts[2][0], pts[2][1], q.f, 0, 10, q.mat, .5, q.fade, 9502 + oy); } },
  A01: (ctx, q) => giantHand(ctx, [q.x + q.f * (26 + 16 * q.k), q.y - 6], 0, q.f, 30, 1, crystal(q.mat), 9510, q.fade),
  A04: (ctx, q) => { for (let i = 0; i < 12; i++) { const u = (q.k * 2 + i / 12) % 1; petal(ctx, q.x + q.f * (10 + 60 * u), q.y - 6 + Math.sin(u * 10 + i) * 10, q.f > 0 ? 0 : Math.PI, 6, q.fade, 10220 + i); } },
  A03: (ctx, q) => { for (let i = 0; i < 3; i++) spiritArm(ctx, [q.x - q.f * 6, q.y - 10 + i * 8], [q.x + q.f * (30 + 18 * q.k + i * 8), q.y - 8 + i * 9], q.f, 1, q.fade, 9510 + i * 10, 10); },
  A02: (ctx, q) => { const FUR = { kind: 'crust', dark: '#3d2f5c', body: '#dcd6ec', facet: '#f4f1fb', vein: '#9c7ae0', edge: '#efeaff', spark: '#c9a8ff', core: '#ffffff', glow: 'rgba(176,108,255,', edgeGlow: 'rgba(239,234,255,' }; for (const oy of [-12, 14]) { const x = q.x + q.f * (28 + 14 * q.k); const y = q.y + oy; plate(ctx, Array.from({ length: 8 }, (_, i) => [x + Math.cos(i / 8 * TAU) * 12, y + Math.sin(i / 8 * TAU) * 10]), FUR, 9520 + oy, { alpha: q.fade, lit: 1, glowEdge: .5 }); } }
};
const prevSprint = FORM_FX_HOOKS.sprint;
FORM_FX_HOOKS.sprint = (ctx, fx) => {
  const id = formIdOf(fx.form); const look = SPRINT_LOOKS[id];
  if (!look || !fx.strike) return prevSprint?.(ctx, fx) ?? false;
  const p = fx.player; const s = fx.strike; const strikeT = Math.max(0, s.elapsed - s.windup);
  const total = s.windup + s.active + (s.variant?.recovery ?? 0);
  const fade = s.elapsed < s.windup + s.active ? 1 : Math.max(0, 1 - (s.elapsed - s.windup - s.active) / Math.max(.01, total - s.windup - s.active));
  const k = s.elapsed < s.windup ? 0 : Math.min(1, strikeT / Math.max(.01, s.active));
  ctx.save(); look(ctx, { p, f: fx.facing, x: p.x, y: p.y - 44, k, fade, t: p.animTime ?? 0, mat: formMat(id) }); ctx.restore();
  return true;
};

// ── Air dives ────────────────────────────────────────────────────────────
// impact: radius, damage, lift, st (statuses), plus a per-form extra on landing.
const DIVE = (style, radius, damage, extra = {}) => ({ style, radius, damage, lift: 160, ...extra });
export const FORM_DIVES = {
  B01: DIVE('tails', 100, 46), ninefold: DIVE('tails', 100, 46),
  B02: DIVE('crystalFist', 90, 52), eidolon: DIVE('crystalFist', 90, 52),
  ascendant: DIVE('light', 90, 40),
  T02: DIVE('magma', 90, 44, { st: ['burn'], ground: 'lava' }),
  T04: DIVE('coral', 95, 40, { lift: 320 }),
  T05: DIVE('gravity', 130, 36, { pull: true }),
  T06: DIVE('thunder', 80, 50, { st: ['shock'] }),
  T08: DIVE('bell', 120, 34, { st: ['stun'] }),
  T13: DIVE('net', 110, 30, { st: ['root'] }),
  T23: DIVE('void', 90, 44, { ground: 'hole' }),
  T24: DIVE('puppets', 100, 40),
  T35: DIVE('ice', 100, 36, { freeze: true, ground: 'ice' }),
  T37: DIVE('acid', 100, 34, { st: ['acid'], ground: 'water' }),
  T38: DIVE('ring', 100, 52, { lift: 240 }),
  T39: DIVE('echo', 90, 26, { repeats: 2 }),
  T40: DIVE('wyrm', 100, 48, { st: ['burn'] }),
  A01: DIVE('giantPalm', 120, 56),
  A02: DIVE('apeSlam', 115, 50, { lift: 260 }),
  A03: DIVE('palms', 105, 46, { st: ['stun'] }),
  A04: DIVE('petalStorm', 108, 46, { st: ['bleed'] }),
  A05: DIVE('rubberDrop', 110, 44, { lift: 300 }),
  A06: DIVE('quakeDrop', 130, 48, { st: ['stun'], ground: 'crack' }),
  A07: DIVE('roomDrop', 120, 42),
  A08: DIVE('blastDrop', 120, 52, { st: ['burn'], ground: 'scorch' }),
  A09: DIVE('spearDrop', 110, 48, { st: ['bleed'], ground: 'blood' })
};

export class FormDiveFx {
  constructor(player, key, def) {
    this.player = player; this.owner = player; this.team = player.team; this.key = key; this.def = def; this.mat = formMat(key);
    this.f = player.facing || 1; this.t = 0; this.landed = false; this.landT = 0; this.isFinished = false; this.x = player.x; this.z = player.z;
  }
  update(dt, game) {
    this.t += dt;
    const p = this.player;
    if (!this.landed) {
      this.x = p.x; this.z = p.z;
      if (p.grounded || this.t > 1.6) { this.landed = true; this.land(game); }
      return;
    }
    this.landT += dt;
    if (this.def.repeats && this.repeatsLeft > 0 && this.landT >= (this.def.repeats - this.repeatsLeft + 1) * .25) { this.repeatsLeft--; this.hitAround(game, .6); }
    if (this.landT > .6) this.isFinished = true;
  }
  hitAround(game, mult = 1) {
    const d = this.def; const p = this.player;
    for (const t of foes(p, game)) {
      const dist = Math.hypot(t.x - this.x, ((t.z ?? this.z) - this.z) * DEPTH); if (dist > d.radius) continue;
      const out = d.pull ? -Math.sign(t.x - this.x || 1) * 260 : Math.sign(t.x - this.x || this.f) * 300;
      t.takeDamage?.(d.damage * mult, out, d.lift, .5, false, 'spell');
      if (d.st) applyStatuses(t, d.st, p, this.f);
      if (d.freeze) t.freeze?.(.9);
    }
  }
  land(game) {
    this.repeatsLeft = this.def.repeats ?? 0;
    this.hitAround(game);
    if (this.def.ground) environment.add(this.def.ground, this.x, this.z, { radius: this.def.radius * .6, team: this.team });
    combat.shakeCamera(8, .25); audio.playImpact?.(true);
  }
  render(ctx) {
    const p = this.player; const y = groundYForDepth(this.z); const m = this.mat; const f = this.f;
    ctx.save();
    if (!this.landed) {
      // The descent: the form's shape drives down under the Wizard.
      const ry = p.y; // y already includes the elevation
      (DIVE_FALL[this.def.style] ?? DIVE_FALL.default)(ctx, { x: p.x, y: ry, f, t: this.t, m, p });
    } else {
      const k = Math.min(1, this.landT / .5); const a = 1 - k;
      (DIVE_LAND[this.def.style] ?? DIVE_LAND.default)(ctx, { x: this.x, y, f, k, a, R: this.def.radius, t: this.t, m });
    }
    ctx.restore();
  }
}
const DIVE_FALL = {
  rubberDrop: (ctx, q) => { for (const sg of [-1, 1]) rubberArm(ctx, q.x, q.y - 40, q.x + sg * 16, q.y + 10, q.m, 1, 8); },
  quakeDrop: (ctx, q) => cracks(ctx, q.x, q.y + 6, 18, q.t * 10, 1, '#ffffff', 6),
  roomDrop: (ctx, q) => dome(ctx, q.x, q.y + 20, 40, q.m, .8, q.t),
  blastDrop: (ctx, q) => boom(ctx, q.x, q.y + 10, 16, (q.t * 3) % 1, 2),
  spearDrop: (ctx, q) => bloodWeapon(ctx, 'blood_rifle', 2, q.x, q.y - 10, q.f || 1, 1.4, 1),
  default: (ctx, q) => plate(ctx, [[q.x - 8, q.y - 20], [q.x + 8, q.y - 20], [q.x, q.y + 18]], q.m, 9600, { alpha: 1, glowEdge: 1.2 }),
  tails: (ctx, q) => { for (let i = 0; i < 5; i++) { const ang = Math.PI / 2 + (i - 2) * .35; band(ctx, [[q.x, q.y - 50], [q.x + Math.cos(ang) * 20, q.y - 20], [q.x + Math.cos(ang) * 30, q.y + 10]], (j, n) => 6 - j * 2, formMat('ninefold'), 9610 + i, { t: q.t, alpha: .9 }); } },
  crystalFist: (ctx, q) => plate(ctx, Array.from({ length: 6 }, (_, i) => [q.x + Math.cos(i / 6 * TAU) * 16, q.y + 10 + Math.sin(i / 6 * TAU) * 14]), crystal(q.m), 9620, { alpha: 1, glowEdge: 1.3 }),
  giantPalm: (ctx, q) => giantHand(ctx, [q.x, q.y - 70], 1.57, q.f, 34, 0, crystal(q.m), 9630, .85),
  apeSlam: (ctx, q) => { const FUR = { kind: 'crust', dark: '#3d2f5c', body: '#dcd6ec', facet: '#f4f1fb', vein: '#9c7ae0', edge: '#efeaff', spark: '#c9a8ff', core: '#ffffff', glow: 'rgba(176,108,255,', edgeGlow: 'rgba(239,234,255,' }; for (const ox of [-18, 18]) plate(ctx, Array.from({ length: 8 }, (_, i) => [q.x + ox + Math.cos(i / 8 * TAU) * 12, q.y - 60 + Math.sin(i / 8 * TAU) * 10]), FUR, 9640 + ox, { alpha: 1, lit: 1 }); },
  wyrm: (ctx, q) => drawWyrmHead(ctx, q.x, q.y + 6, 0, 1, 12, q.m, .5, 1, 9650),
  petalStorm: (ctx, q) => { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + q.t * 10; petal(ctx, q.x + Math.cos(a) * 16, q.y - 20 + Math.sin(a) * 8, a, 6, 1, 10240 + i); } },
  palms: (ctx, q) => { for (const sg of [-1, 1]) spiritArm(ctx, [q.x + sg * 10, q.y - 40], [q.x + sg * 16, q.y + 10], q.f, 0, 1, 9655 + sg, 11); },
  ring: (ctx, q) => stoneRing(ctx, q.x, q.y - 10, 22, .9, 0, q.t * 8, 6, 9660, 1, null, 2),
  bell: (ctx, q) => orbitItem(ctx, 'bell', q.x, q.y - 4, 14, 0, q.m, 9670, 1, q.t),
  thunder: (ctx, q) => line(ctx, [[q.x, q.y - 120], [q.x + 8, q.y - 70], [q.x - 6, q.y - 30], [q.x, q.y]], q.m.spark, 3, 1)
};
const DIVE_LAND = {
  rubberDrop: (ctx, q) => { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; rubberArm(ctx, q.x, q.y - 20, q.x + Math.cos(a) * q.R * .7 * q.k, q.y - 20 + Math.sin(a) * q.R * .22 * q.k, q.m, q.a, 7); } },
  quakeDrop: (ctx, q) => { cracks(ctx, q.x, q.y, q.R * q.k, 6, q.a, '#ffffff', 10); groundRing(ctx, q.x, q.y, q.R * q.k, q.m, 0, q.a, 14, 9890, 3); },
  roomDrop: (ctx, q) => dome(ctx, q.x, q.y, q.R * (1.2 - q.k * .4), q.m, q.a, q.t),
  blastDrop: (ctx, q) => boom(ctx, q.x, q.y - 20, q.R * .7, q.k, 5),
  spearDrop: (ctx, q) => { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; bloodSpear(ctx, q.x + Math.cos(a) * q.R * .6 * q.k, q.y + Math.sin(a) * q.R * .2 * q.k, 26 * q.a, q.a); } },
  default: (ctx, q) => groundRing(ctx, q.x, q.y, 20 + q.R * q.k, q.m, 0, q.a, 12, 9700, 4),
  tails: (ctx, q) => { for (let i = 0; i < 9; i++) { const ang = i / 9 * TAU; band(ctx, [[q.x, q.y], [q.x + Math.cos(ang) * q.R * .5 * q.k, q.y + Math.sin(ang) * q.R * .16 * q.k - 18 * q.a], [q.x + Math.cos(ang) * q.R * q.k, q.y + Math.sin(ang) * q.R * .32 * q.k]], (j, n) => 6 - j * 2, formMat('ninefold'), 9710 + i, { t: q.t, alpha: q.a }); } },
  crystalFist: (ctx, q) => { for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; const r = q.R * q.k; plate(ctx, [[q.x + Math.cos(ang) * r * .5, q.y + Math.sin(ang) * r * .16], [q.x + Math.cos(ang) * r, q.y + Math.sin(ang) * r * .32 - 26 * q.a], [q.x + Math.cos(ang + .15) * r, q.y + Math.sin(ang + .15) * r * .32]], crystal(q.m), 9720 + i, { alpha: q.a, glowEdge: 1.2 }); } },
  light: (ctx, q) => { groundRing(ctx, q.x, q.y, q.R * q.k, q.m, 0, q.a, 16, 9730, 3); line(ctx, [[q.x, q.y - 140 * q.a], [q.x, q.y]], '#ffffff', 6 * q.a, q.a); },
  magma: (ctx, q) => { groundRing(ctx, q.x, q.y, q.R * q.k, { ...q.m, kind: 'crust' }, 0, q.a, 12, 9740, 6, .8); fallout(ctx, [[q.x, q.y - 6]], q.m, q.t, 9741, { count: 14, alpha: q.a }); },
  coral: (ctx, q) => { for (let i = 0; i < 10; i++) { const ang = i / 10 * TAU; const r = q.R * .8; const h = 40 * Math.sin(Math.min(1, q.k * 2) * Math.PI); plate(ctx, [[q.x + Math.cos(ang) * r - 5, q.y + Math.sin(ang) * r * .32], [q.x + Math.cos(ang) * r, q.y + Math.sin(ang) * r * .32 - h], [q.x + Math.cos(ang) * r + 5, q.y + Math.sin(ang) * r * .32]], crystal(q.m), 9750 + i, { alpha: q.a + .2, glowEdge: 1 }); } },
  gravity: (ctx, q) => { ctx.globalAlpha = q.a; ctx.fillStyle = '#05040a'; ctx.beginPath(); ctx.ellipse(q.x, q.y, 30 * (1 - q.k * .5), 10, 0, 0, TAU); ctx.fill(); for (let i = 0; i < 10; i++) { const ang = i / 10 * TAU + q.t * 4; const r = q.R * (1 - q.k); shard(ctx, q.x + Math.cos(ang) * r, q.y + Math.sin(ang) * r * .32 - 10, 5, ang, q.m, 9760 + i, q.a); } },
  thunder: (ctx, q) => { const roll = Math.floor(q.t * 30); for (let b = 0; b < 3; b++) line(ctx, Array.from({ length: 6 }, (_, i) => [q.x + (b - 1) * 20 + Math.sin(roll + i * 2 + b) * 8, q.y - 160 + i * 32]), b === 1 ? '#ffffff' : q.m.spark, 3, q.a); groundRing(ctx, q.x, q.y, q.R * q.k, q.m, 0, q.a, 10, 9770, 3); },
  bell: (ctx, q) => { for (let r = 0; r < 3; r++) groundRing(ctx, q.x, q.y, q.R * ((q.k + r / 3) % 1), q.m, 0, q.a * (1 - ((q.k + r / 3) % 1)), 12, 9780 + r * 12, 2); },
  net: (ctx, q) => { for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; line(ctx, [[q.x, q.y], [q.x + Math.cos(ang) * q.R * q.k, q.y + Math.sin(ang) * q.R * .32 * q.k]], q.m.edge, 1.5, q.a); } groundRing(ctx, q.x, q.y, q.R * q.k * .7, q.m, 0, q.a, 16, 9790, 1, .9); },
  void: (ctx, q) => { ctx.globalAlpha = q.a; ctx.fillStyle = '#050608'; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.R * .6 * q.k, q.R * .2 * q.k, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = q.m.spark; ctx.lineWidth = 2; ctx.stroke(); },
  puppets: (ctx, q) => { for (let i = 0; i < 4; i++) { const ang = i / 4 * TAU + .4; const x = q.x + Math.cos(ang) * q.R * .6; const yy = q.y + Math.sin(ang) * q.R * .2; const drop = 60 * (1 - Math.min(1, q.k * 3)); plate(ctx, [[x - 5, yy - 22 - drop], [x + 5, yy - 22 - drop], [x + 6, yy - drop], [x - 6, yy - drop]], { ...q.m, kind: 'crust' }, 9800 + i, { alpha: q.a + .2, lit: 1 }); line(ctx, [[x, yy - 22 - drop], [x, yy - 120]], q.m.edge, 1, q.a); } },
  ice: (ctx, q) => { for (let i = 0; i < 12; i++) { const ang = i / 12 * TAU; const r = q.R * q.k; shard(ctx, q.x + Math.cos(ang) * r, q.y + Math.sin(ang) * r * .32 - 8, 9, ang, crystal(q.m), 9810 + i, q.a + .2); } },
  acid: (ctx, q) => { groundRing(ctx, q.x, q.y, q.R * q.k, ACID_GLASS, 0, q.a, 14, 9830, 5, .8); fallout(ctx, [[q.x, q.y - 4]], ACID_GLASS, q.t, 9831, { count: 12, alpha: q.a }); },
  ring: (ctx, q) => { stoneRing(ctx, q.x, q.y, 26 + 30 * q.k, 0, 0, 0, 7, 9840, q.a + .2, null, 3); groundRing(ctx, q.x, q.y, q.R * q.k, q.m, 0, q.a, 10, 9841, 3); },
  echo: (ctx, q) => { for (let r = 0; r < 3; r++) groundRing(ctx, q.x + (r - 1) * 14, q.y, q.R * q.k * (1 - r * .2), q.m, 0, q.a * (1 - r * .25), 12, 9850 + r * 12, 2); },
  wyrm: (ctx, q) => { for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; drawWyrmHead(ctx, q.x + s * q.R * .5 * q.k, q.y - 10, s, -.3, 12, q.m, .6, q.a + .2, 9860 + i); } fallout(ctx, [[q.x, q.y - 6]], q.m, q.t, 9862, { count: 10, alpha: q.a }); },
  giantPalm: (ctx, q) => { giantHand(ctx, [q.x, q.y - 20], 1.57, q.f, 38, 0, crystal(q.m), 9870, q.a + .3); groundRing(ctx, q.x, q.y, q.R * q.k, crystal(q.m), 0, q.a, 14, 9871, 4); },
  petalStorm: (ctx, q) => { for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + q.k * 5; const r = q.R * q.k; petal(ctx, q.x + Math.cos(a) * r, q.y + Math.sin(a) * r * .3, a + Math.PI / 2, 6, q.a + .2, 10260 + i); } groundRing(ctx, q.x, q.y, q.R * q.k, q.m, 0, q.a, 12, 10290, 3); },
  palms: (ctx, q) => { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; giantHand(ctx, [q.x + Math.cos(a) * q.R * .6 * q.k, q.y + Math.sin(a) * q.R * .2 * q.k - 6], 1.57, q.f, 11, 0, { kind: 'crust', dark: '#5d2e0a', body: '#ffcc80', facet: '#ffe0b2', vein: '#ffd54f', edge: '#fff8e1', spark: '#fff3c4', core: '#ffffff', glow: 'rgba(255,213,79,', edgeGlow: 'rgba(255,248,225,' }, 9660 + i, q.a + .2); } groundRing(ctx, q.x, q.y, q.R * q.k, q.m, 0, q.a, 12, 9668, 3); },
  apeSlam: (ctx, q) => { for (let r = 0; r < 2; r++) groundRing(ctx, q.x, q.y, q.R * q.k * (1 - r * .3), { kind: 'crystal', dark: '#1c1030', body: '#7f66ff', facet: '#c3b4ff', vein: '#5f86ff', edge: '#efe6ff', spark: '#b06cff', core: '#ffffff', glow: 'rgba(127,102,255,', edgeGlow: 'rgba(239,230,255,' }, 0, q.a, 14, 9880 + r * 14, 4); }
};

// Air dive of the active form (true when it took over the dive).
export function formDive(player, formKey, spells, { mana = false } = {}) {
  const id = formIdOf(formKey); const def = FORM_DIVES[id] ?? FORM_DIVES[formKey];
  if (!def) return false;
  if (mana) { if (player.freeMana < FORM_SPECIAL_MANA.dive) { combat.spawnDamageText(player.x, player.y - 70, 'NO MANA', { color: '#64b5f6' }); return false; } player.mp -= FORM_SPECIAL_MANA.dive; }
  player.state = 'dive'; player.stateTimer = .4; player.vElevation = -1000; player.canAttack = false;
  player.lastFormDive = id;
  spells.addSpell(new FormDiveFx(player, id, def), 'B');
  audio.playSlash(.85);
  return true;
}
