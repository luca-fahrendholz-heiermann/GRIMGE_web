// GRIMGE Prototype — ARCANE STATES: the special-rune buff transformations (runtime).
//
// docs/GRIMGE_Transformations_Atlas_V3_1_Sonnenwyrm.md §1.9: the 42 forms
// (B01 Risswild, B02 Arkengestell, T01–T40) are buff transformations — in
// GRIMGE called ARCANE STATES. At
// most ONE buff rune may be in a deck; it is cast like a spell, lasts a
// limited time, never changes the character sprite and may run together
// with the primary Focus transformation. Only one buff is active at a time.
//
// While a buff is active its moveset owns the charged heavy (forward / up /
// down × short / full), the sprint attack, the guard and grab visuals and
// the manifestation around the Wizard. B01 and B02 keep their established
// combat engines (the former Ninefold / Eidolon manifests) and get the
// atlas look and names; T01–T40 run on the generic engine below.
import { bankaiStyleOf } from './bankai.js';
import { RayCrownFx } from './cast_circle.js';
// The holy Arcane States: their transformation is crowned by golden rays (Göttlicher Riese, Sonnenwyrm).
const HOLY_STATES = new Set(['A01', 'T40']);
import { BUFF_FORM_DATA } from './buff_forms_data.js';
import { FORM_MOVESETS, registerFormPalette, FormStrikeSpell } from './form_moves.js';
import { FORM_SPRINT_ATTACKS, FORM_FX_HOOKS } from './form_actions.js';
import { materialFor, renderManifestation, contourVeinPainter, plate, band, rgba, hasFormRenderer } from './buff_vfx.js';
import { BuffStrikeSpell, applyStatuses } from './buff_techniques.js';
import './buff_signatures.js'; // signature renderers (T37–T40)
import { ARCANE_MOVES, ARCANE_CHARGE } from './arcane_moves.js';
import './buff_v32_a.js'; // V3.2 individual morphologies T01–T12
import './buff_v32_b.js'; // T13–T24
import './buff_v32_c.js'; // T25–T36
import './buff_v32_extra.js'; // A01 / A02 from user reference art
import './buff_v32_hands.js'; // A03 Tausendhand
import './buff_v32_bloom.js'; // A04 Klingenblüte
import { installBankaiArsenal } from './bankai_arsenal.js';
import { devilTick } from './arcane_devil.js';
import { recolorFor, recolorStages, cloakFor } from './form_recolors.js';
import './armor_extras.js'; // socket-anchored armour pieces (horns, claws, cannon, visor eyes) // armour transformations recolour the hero's own pixels
import './arcane_fadenschlag.js'; // T13 Fadenschlag: swing + thread techniques (must patch ARCANE_MOVES before the movesets are built)
import { konstruktTick, isShellRolled } from './arcane_konstrukt.js'; // A10 Konstruktpanzer (armour, shell roll, shield passive)
import { drachengeistTick } from './arcane_drachengeist.js'; // A11 Drachengeist (dragon spirit, burn passive)
import { arcanePassivesTick } from './arcane_passives.js'; // T08 / T23 / T24 / T35 signature passives
import { arsenalTick } from './arcane_bloodarsenal.js'; // A09 Blutarsenal (weapon fusion: techniques, look, bleed passive) // A05–A08 body powers (techniques, looks, water weakness, passives) // A04: the held weapon's arsenal (look + techniques)
import { combat } from './combat.js';
import { TransformationFx, transitionStyleOf, TRANSFORM_TIMING } from './transform_fx.js';
import { groundYForDepth } from './world.js';

export const BUFF_RUNE_PREFIX = 'buff_';
export const BUFF_DURATION = 16;            // seconds at grade B (× rune quality)
export const BUFF_TAG = 'ARCANE STATE · MAX 1 PER DECK';
export const isBuffRuneId = (id) => String(id ?? '').startsWith(BUFF_RUNE_PREFIX);
export const buffIdOfRune = (id) => (isBuffRuneId(id) ? String(id).slice(BUFF_RUNE_PREFIX.length) : null);

export const BUFF_FORMS = {};
export const BUFF_FORM_IDS = [];

// ── Moveset from the atlas data ─────────────────────────────────────────
const slamPoints = (count, radius, startAt, gap) => Array.from({ length: count }, (_, i) => {
  const a = (i / count) * Math.PI * 2;
  return { at: startAt + i * gap, dx: Math.cos(a) * radius, dz: Math.sin(a) * radius / 150 * .8, radius: 34 };
});

function techniqueConfig(form, dir, variant, tech) {
  const short = variant === 'short';
  const st = tech.status ?? [];
  const lift = st.includes('launch') ? 520 : st.includes('knockdown') ? 240 : null;
  const base = { form: form.id, status: st, seed: (dir.length * 7 + (short ? 1 : 2)) * 13 };
  switch (tech.kind) {
    case 'burst': return { ...base, kind: 'burst', reach: short ? 74 : 92, damage: short ? 30 : 58, kx: 60, lift: lift ?? 520, stun: .55, arcFrom: -2.2, arcTo: .2, arcY: 60, life: .3 };
    case 'ring': return short
      ? { ...base, kind: 'ring', life: .38, events: [{ at: .06, radius: 92, damage: 26, kx: st.includes('pull') ? -200 : 300, lift: lift ?? 90 }] }
      : { ...base, kind: 'ring', life: 1.0, events: [{ at: .15, radius: 110, damage: 40, kx: 160, lift: 200 }, { at: .65, radius: 185, damage: 68, kx: st.includes('pull') ? -260 : 420, lift: lift ?? 220, shake: 12, crit: true }] };
    case 'pillar': return { ...base, kind: 'pillar', width: short ? 28 : 38, damage: short ? 40 : 74, life: short ? .7 : 1.0, offset: 48, tick: .14 };
    case 'sequence': return { ...base, kind: 'sequence', damage: short ? 46 : 82, life: short ? .8 : 1.3, events: short ? [...slamPoints(4, 70, .1, .08), { at: .55, dx: 0, dz: 0, radius: 90, final: true }] : [...slamPoints(7, 100, .1, .09), { at: 1.0, dx: 0, dz: 0, radius: 175, final: true }] };
    case 'wall': return { ...base, kind: 'wall', speed: 260, travel: short ? .45 : .7, damage: short ? 44 : 76, life: short ? .75 : 1.0, offset: 40 };
    case 'projectile': return { ...base, kind: 'projectile', speed: short ? 520 : 400, range: short ? 320 : 460, damage: short ? 32 : 60, kx: 240, lift: lift ?? 60, explode: short ? 0 : 92, pierce: !!tech.pierce || st.includes('pull') };
    case 'beam': return { ...base, kind: 'beam', length: short ? 260 : 400, width: 22, damage: short ? 40 : 76, life: short ? .55 : .95, tick: .12 };
    case 'wyrms': return { ...base, kind: 'wyrms', damage: 70, life: 1.5 };
    case 'portals': return { ...base, kind: 'portals', damage: 92, life: 1.2 };
    default: return { ...base, kind: 'cone', range: short ? 210 : 290, damage: short ? 32 : 62, kx: st.includes('pull') ? -220 : 300, lift: lift ?? 50, life: .45, offset: 20 };
  }
}

function buildMoveset(form) {
  const set = { name: form.name.toUpperCase() };
  for (const dir of ['forward', 'up', 'down']) {
    const t = form.tech[dir];
    if (!t) continue;
    set[dir] = {};
    for (const variant of ['short', 'full']) {
      const tech = t[variant];
      const cfg = techniqueConfig(form, dir, variant, tech);
      set[dir][variant] = {
        name: tech.name.toUpperCase(),
        make: (p) => {
          // Shield statuses act on the caster at release.
          if (tech.status?.includes('shield')) { p.arcaneShield = Math.max(p.arcaneShield ?? 0, 40); p.arcaneShieldTimer = Math.max(p.arcaneShieldTimer ?? 0, 4); }
          return new BuffStrikeSpell(p, cfg, form);
        }
      };
    }
  }
  return set;
}

// Sprint + heavy variant from the atlas text.
function sprintVariant(form) {
  const text = `${form.tech.sprintHeavy?.text ?? ''}`.toLowerCase();
  const name = (form.tech.sprintHeavy?.name ?? 'Buff Rush').toUpperCase();
  if (/sprung|springt|satz|pounce|sturz|dive|hechtet/.test(text)) return { name, windup: .12, windupSpeed: .55, active: .22, lungeSpeed: 1.25, recovery: .30, leap: 240, damageMult: 1.15, reach: 108, carryMult: 1.4, recoilMult: 1.2, lift: -60, stun: .7, hitstopTicks: 7, pitch: .9 };
  if (/durch|alle|mehrere|kette|reihe|linie/.test(text)) return { name, windup: .06, windupSpeed: .8, active: .24, lungeSpeed: 1.45, recovery: .26, damageMult: 1.1, reach: 84, carryMult: 1, recoilMult: 1.2, lift: 20, stun: .5, hitstopTicks: 5, pierce: true, pitch: 1.1 };
  if (/ramm|bruch|schwer|break|schmett|wucht|stampf|crash/.test(text)) return { name, windup: .24, windupSpeed: .3, active: .16, lungeSpeed: 1.1, recovery: .45, damageMult: 1.3, reach: 104, carryMult: 1, recoilMult: 1.55, lift: 30, stun: .6, hitstopTicks: 9, chainPush: true, pitch: .65 };
  return { name, windup: .1, windupSpeed: .6, active: .2, lungeSpeed: 1.3, recovery: .3, damageMult: 1.15, reach: 96, carryMult: 1.2, recoilMult: 1.3, lift: 40, stun: .55, hitstopTicks: 6, pitch: .95 };
}

// Atlas names on the established B01 / B02 engines (Ninefold / Eidolon).
function renameMoveset(key, form) {
  const set = FORM_MOVESETS[key];
  if (!set) return;
  set.name = form.name.toUpperCase();
  for (const dir of ['forward', 'up', 'down']) {
    const t = form.tech[dir]; if (!t || !set[dir]) continue;
    for (const variant of ['short', 'full']) {
      const entry = set[dir][variant]; if (!entry) continue;
      entry.name = t[variant].name.toUpperCase();
      // Strike primitives of the old engines are redrawn in the atlas material.
      const make = entry.make;
      if (make && !entry._buffWrapped) {
        entry._buffWrapped = true;
        entry.make = (p) => { const spell = make(p); return spell instanceof FormStrikeSpell && !(spell instanceof BuffStrikeSpell) ? new BuffStrikeSpell(p, { ...spell.cfg, form: key }, form) : spell; };
      }
    }
  }
}

for (const data of BUFF_FORM_DATA) {
  const form = { ...data, mat: null, runeId: BUFF_RUNE_PREFIX + data.id, spellId: BUFF_RUNE_PREFIX + data.id };
  form.mat = materialFor(form);
  form.moveset = data.id === 'B01' ? 'ninefold' : data.id === 'B02' ? 'eidolon' : data.id;
  BUFF_FORMS[data.id] = form;
  BUFF_FORM_IDS.push(data.id);
  const main = form.mat.kind === 'crystal' ? form.mat.edge : form.mat.vein;
  const palette = { core: form.mat.core, main, edge: form.mat.dark, glow: rgba(main, 1).replace(/,1\)$/, ',') };
  registerFormPalette(form.moveset, palette);
  if (form.moveset === form.id) {
    FORM_MOVESETS[form.id] = buildMoveset(form);
    FORM_SPRINT_ATTACKS[form.id] = sprintVariant(form);
  } else {
    renameMoveset(form.moveset, form);
    if (FORM_SPRINT_ATTACKS[form.moveset]) FORM_SPRINT_ATTACKS[form.moveset] = { ...FORM_SPRINT_ATTACKS[form.moveset], name: (form.tech.sprintHeavy?.name ?? FORM_SPRINT_ATTACKS[form.moveset].name).toUpperCase() };
  }
}

// Unique techniques of the curated roster (arcane_moves.js) replace the generic
// strike primitives: [fs, ff, us, uf, ds, df] for T forms, { up, down } for the
// B01 / B02 engines (their forward techniques stay: rift core / beam, astral bow).
for (const [id, moves] of Object.entries(ARCANE_MOVES)) {
  const form = BUFF_FORMS[id]; if (!form) continue;
  const set = FORM_MOVESETS[form.moveset]; if (!set) continue;
  const slots = Array.isArray(moves) ? [['forward', 'short'], ['forward', 'full'], ['up', 'short'], ['up', 'full'], ['down', 'short'], ['down', 'full']].map((d, i) => [d, moves[i]])
    : [...['up', 'down'].flatMap((dir) => (moves[dir] ?? []).map((m, i) => [[dir, i ? 'full' : 'short'], m]))];
  for (const [[dir, variant], make] of slots) if (make && set[dir]?.[variant]) set[dir][variant].make = (p) => make(form, p);
}
// Bankai: every technique slot follows the caster's held weapon (the petal techniques stay for sword families).
installBankaiArsenal(FORM_MOVESETS.A04);

// Charge-up ritual of the active Arcane State (direction-aware); true when drawn.
export function renderBuffCharge(ctx, player, renderY, dir, k, full) {
  const form = currentBuffForm(player); const draw = form && ARCANE_CHARGE[form.id];
  if (!draw) return false;
  const s = { x: player.x, y: renderY, f: player.facing || 1 };
  ctx.save(); draw(ctx, s, form.mat, dir, k, player.animTime ?? 0); ctx.restore();
  if (full) {
    // FULL threshold: a clear switch flash in the form's own colours.
    const pulse = .5 + .5 * Math.sin((player.animTime ?? 0) * 14);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = form.mat.edge; ctx.globalAlpha = .6 + .4 * pulse; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(player.x, renderY, 28 + 6 * pulse, 8 + 2 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = form.mat.vein; ctx.beginPath(); ctx.ellipse(player.x, renderY, 18, 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  return true;
}

// ── Runtime ─────────────────────────────────────────────────────────────
// The buff form currently shaping the Wizard (B01/B02 via their engines).
export function currentBuffForm(player) {
  if (player.ninefoldTimer > 0) return BUFF_FORMS.B01;
  if (player.eidolonTimer > 0) return BUFF_FORMS.B02;
  if (player.buffForm?.timer > 0) return formFor(player, player.buffForm.id);
  return null;
}
// Bankai (A04) takes the colours of the held weapon's swarm everywhere (aura, veins, shockwaves),
// not only in the swarm pieces — one form variant per weapon style, cached.
const bankaiForms = new Map();
function formFor(player, id) {
  const form = BUFF_FORMS[id] ?? null; if (id !== 'A04' || !form) return form;
  const style = bankaiStyleOf(player); let v = bankaiForms.get(style);
  if (!v) { v = Object.freeze({ ...form, mat: style.mat, title: style.name }); bankaiForms.set(style, v); }
  return v;
}

// Fade of the manifestation: assemble on transform-in, dissolve on the way out.
export function buffFade(player) {
  const form = currentBuffForm(player);
  if (!form) return 0;
  const timer = form.id === 'B01' ? player.ninefoldTimer : form.id === 'B02' ? player.eidolonTimer : player.buffForm.timer;
  const age = player.buffForm?.age ?? 1;
  // A fresh transformation first plays its transition (charge → flash → pillar);
  // the form steps out of the pillar after the flash.
  const reveal = player.buffForm?.intro ? Math.max(0, (age - TRANSFORM_TIMING.reveal) * 3) : age * 2.2;
  return Math.max(0, Math.min(1, reveal, timer * 2));
}

// Cast the buff rune. Returns false when another buff is still active.
export function activateBuffForm(player, id, quality = { duration: 1, power: 1, area: 1, particles: 1 }, spells = null) {
  const form = formFor(player, id);
  if (!form || !player) return false;
  setBuffSpellSink(spells);
  const active = currentBuffForm(player);
  if (active && active.id !== id) {
    window.gameWorld?.showAnnouncement?.(`${active.name.toUpperCase()} IS STILL ACTIVE — ONE ARCANE STATE AT A TIME`, 1.4);
    return false;
  }
  const duration = BUFF_DURATION * (quality.duration ?? 1);
  if (id === 'B01') { spells?.castNinefoldBeast?.(player, quality); player.ninefoldTimer = duration; }
  else if (id === 'B02') { spells?.castEidolonMantle?.(player, quality); player.eidolonTimer = duration; }
  else {
    player.ninefoldTimer = 0; player.eidolonTimer = 0;
  }
  player.buffForm = { id, timer: duration, total: duration, age: active ? (player.buffForm?.age ?? 1) : 0, power: quality.power ?? 1, intro: !active };
  if (!active) { emit(new TransformationFx(player, transitionStyleOf(form))); buffTransformFx(player, form, 'in'); if (HOLY_STATES.has(id)) emit(new RayCrownFx(player, { life: 1.6, size: 1.4, color: form.mat?.edge ?? '#ffd54f' })); }
  combat.spawnShockwave(player.x, player.y - 40, 80 * (quality.area ?? 1), form.mat.vein);
  combat.spawnShockwave(player.x, player.y - 4, 50, form.mat.edge);
  const title = id === 'A04' ? bankaiStyleOf(player).name : form.title?.toUpperCase(); // Bankai: the class decides
  window.gameWorld?.showAnnouncement?.(`${form.name.toUpperCase()}${title ? ' — ' + title : ''} · ${Math.round(duration)} S`, 1.6);
  return true;
}

export function updateBuffForm(player, dt) {
  const b = player.buffForm;
  if (!b) return;
  b.age += dt;
  if (b.id === 'B01') b.timer = player.ninefoldTimer;
  else if (b.id === 'B02') b.timer = player.eidolonTimer;
  else b.timer = Math.max(0, b.timer - dt);
  updateMorphology(player, formFor(player, b.id), dt);
  devilTick(player, dt, formFor(player, b.id)); // body powers: water weakness, tremors, blast marks
  arsenalTick(player, formFor(player, b.id));
  konstruktTick(player, dt, formFor(player, b.id));
  drachengeistTick(player, formFor(player, b.id));
  arcanePassivesTick(player, dt, formFor(player, b.id));
  if (b.timer <= 0 || !player.isAlive) endBuffForm(player);
}

export function endBuffForm(player) {
  if (!player.buffForm) return;
  const form = formFor(player, player.buffForm.id);
  if (form && player.isAlive) { combat.spawnShockwave(player.x, player.y - 40, 46, form.mat.edge); buffTransformFx(player, form, 'out'); }
  if (player.buffForm.id === 'B01') player.ninefoldTimer = 0;
  if (player.buffForm.id === 'B02') player.eidolonTimer = 0;
  player.buffForm = null;
  player._timeTrail = null; // no stale echoes in the next Arcane State
}

// Combat modifiers of the generic T forms (B01/B02 keep their engines').
export const isGenericBuff = (player) => !!(player.buffForm?.timer > 0 && player.buffForm.id !== 'B01' && player.buffForm.id !== 'B02');

// ── Rendering hooks ─────────────────────────────────────────────────────
export function renderBuffManifestation(ctx, player, renderY, layer) {
  const form = currentBuffForm(player);
  if (!form) return false;
  if (isShellRolled(player)) return true; // A10 rolled up: only the ball is drawn (by the technique)
  // Temporal projections (other than Vorausschnitt's planes) trail echoes of the last moments.
  if (layer === 'back' && form.morphology === 'temporal_projection' && form.id !== 'T39' && !hasFormRenderer(form.id)) {
    for (const d of [10, 20]) { const past = player._timeTrail?.[d]; if (past) ghostOf(ctx, player, past.x, past.y, past.state, past.animTime, past.facing, .3 * buffFade(player), form.mat.edge); }
  }
  renderManifestation(ctx, player, form, layer, renderY, buffFade(player), peakOf(player));
  if (layer === 'front') renderBuffTimer(ctx, player, form, renderY);
  return true;
}

// Armour on / off durations (s) of the staged recolour.
const ARMOR_ON = 1.1; const ARMOR_OFF = .6;
export function buffVeinPainter(player) {
  const form = currentBuffForm(player);
  if (!form) return null;
  const b = player.buffForm;
  // Armour forms put the armour on stage by stage (plates close from the feet up, then the visor) and take it off
  // backward; they skip the generic light sweep.
  const stages = recolorStages(form.id, player.heroKey);
  if (stages) {
    let stage = stages;
    // After a full transformation the plates start closing once the light pillar has opened (visible to the player).
    const start = b?.intro ? TRANSFORM_TIMING.pillarEnd : 0;
    if (b && b.age < start + ARMOR_ON) stage = Math.floor(Math.max(0, b.age - start) / ARMOR_ON * (stages + 1));
    else if (b && b.timer < ARMOR_OFF) stage = Math.floor(b.timer / ARMOR_OFF * (stages + 1));
    const paint = contourVeinPainter(form, player.animTime ?? 0, null);
    const rc = recolorFor(form.id, stage, player.heroKey); if (rc) paint.recolor = rc;
    return paint;
  }
  let sweep = null;
  if (b && b.age < .6) sweep = { pos: b.age / .6, alpha: 1 };
  else if (b && b.timer < .5) sweep = { pos: b.timer / .5, alpha: 1 };
  return contourVeinPainter(form, player.animTime ?? 0, sweep);
}

export function buffCloakColor(player) {
  const form = currentBuffForm(player);
  if (!form) return null;
  const own = cloakFor(form.id); if (own) return { edge: own.edge, inner: own.inner, fade: buffFade(player) };
  return { edge: rgba(form.mat.kind === 'crystal' ? form.mat.edge : form.mat.vein, 1), inner: rgba(form.mat.edge, 1), fade: buffFade(player) };
}

// Remaining buff time: a thin material bar with the form's name over the head.
function renderBuffTimer(ctx, player, form, renderY) {
  const b = player.buffForm; if (!b) return;
  const k = Math.max(0, Math.min(1, b.timer / (b.total || BUFF_DURATION)));
  const x = player.x - 22; const y = renderY - 108;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 1, y - 1, 46, 5);
  ctx.fillStyle = form.mat.vein; ctx.fillRect(x, y, 44 * k, 3);
  ctx.fillStyle = form.mat.core; ctx.fillRect(x + 44 * k - 1, y, 1, 3);
  ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = form.mat.edge;
  ctx.fillText(form.name.toUpperCase(), player.x, y - 3);
  ctx.restore();
}

// Guard: material plates fold in front of the facing side (atlas: Defense).
export function renderBuffGuard(ctx, player, renderY) {
  const form = currentBuffForm(player);
  if (!form || !player.isGuarding) return false;
  if (form.id === 'T38') { asterShield(ctx, player, renderY); return true; }
  // V3.2: the form's own parts fold into its defense (drawn by its renderer).
  if (hasFormRenderer(form.id)) return true;
  const m = form.mat; const f = player.facing || 1; const t = player.animTime ?? 0;
  const cx = player.x + f * 22; const cy = renderY - 46;
  const hold = Math.min(1, (player.guardHoldTime ?? 0) * 6 + .3);
  for (let i = 0; i < 6; i++) {
    const a = -1.1 + i * .44; const r = 28 * hold;
    const x = cx + f * Math.cos(a) * 6; const y = cy + Math.sin(a) * r;
    const wob = Math.sin(t * (3 + i * .4) + i) * 1.5;
    plate(ctx, [[x - f * 3, y - 9 + wob], [x + f * 7, y - 7 + wob], [x + f * 8, y + 8 + wob], [x - f * 2, y + 10 + wob]], m, 600 + i, { alpha: .9 * buffFade(player), pulse: player.perfectBlockFlash > 0 ? 1 : .5 });
  }
  return true;
}

// Grab FX hook: the form's material reaches out as a gripping band.
FORM_FX_HOOKS.grab = (ctx, fx) => {
  const form = BUFF_FORMS[fx.form] ?? (fx.form === 'ninefold' ? BUFF_FORMS.B01 : fx.form === 'eidolon' ? BUFF_FORMS.B02 : null);
  if (!form) return false;
  // V3.2: the form's own part reaches the target (its renderer); only a contact flash here.
  if (hasFormRenderer(form.id)) { if (fx.target && fx.t > .28 && fx.t < .36) plate(ctx, [[fx.target.x - 4, (fx.target.y ?? 0) - 40], [fx.target.x + 4, (fx.target.y ?? 0) - 40], [fx.target.x + 4, (fx.target.y ?? 0) - 32], [fx.target.x - 4, (fx.target.y ?? 0) - 32]], form.mat, 720, { alpha: 1, core: 1 }); return true; }
  const p = fx.player; const m = form.mat;
  const hx = p.x + fx.facing * 12; const hy = p.y - 48;
  const k = Math.min(1, fx.t / .18);
  const tx = fx.target ? fx.target.x : hx + fx.facing * 40; const ty = fx.target ? (fx.target.y ?? groundYForDepth(fx.target.z)) - 36 : hy;
  const ex = hx + (tx - hx) * k; const ey = hy + (ty - hy) * k;
  band(ctx, [[hx, hy], [(hx + ex) / 2, Math.min(hy, ey) - 16], [ex, ey]], (i) => 5 - i, m, 700, { t: fx.t, alpha: fx.target ? 1 : 1 - fx.t / fx.life });
  for (let i = 0; i < 3; i++) { const a = -0.8 + i * .8; plate(ctx, [[ex, ey], [ex + fx.facing * Math.cos(a) * 12, ey + Math.sin(a) * 12], [ex + fx.facing * Math.cos(a + .3) * 8, ey + Math.sin(a + .3) * 8]], m, 710 + i, { alpha: 1 }); }
  return true;
};

// Sprint attack FX hook: a lance / claw of plates along the dash.
FORM_FX_HOOKS.sprint = (ctx, fx) => {
  const form = BUFF_FORMS[fx.form];
  if (!form || !fx.strike) return false;
  const p = fx.player; const m = form.mat; const f = fx.facing; const s = fx.strike;
  const ry = p.y - 44; // y already includes the elevation
  const strikeT = Math.max(0, s.elapsed - s.windup);
  const k = s.elapsed < s.windup ? s.elapsed / Math.max(.01, s.windup) * .3 : Math.min(1, .3 + strikeT / Math.max(.01, s.active));
  const len = 30 + 60 * k;
  plate(ctx, [[p.x - f * 6, ry - 6], [p.x + f * len, ry - 3], [p.x + f * (len + 14), ry], [p.x + f * len, ry + 3], [p.x - f * 6, ry + 6]], m, 800, { alpha: 1, core: 1, pulse: 1 });
  for (let i = 0; i < 3; i++) plate(ctx, [[p.x - f * (10 + i * 12), ry - 8 + i * 6], [p.x - f * (22 + i * 12), ry - 4 + i * 6], [p.x - f * (12 + i * 12), ry + i * 6]], m, 810 + i, { alpha: .7 - i * .2 });
  return true;
};

// How-to text for the grimoire: every technique of the form.
export function buffHowTo(id) {
  const form = BUFF_FORMS[id];
  if (!form) return null;
  const t = form.tech;
  const line = (label, x) => (x ? `${label}: ${x.name} — ${x.text}` : null);
  return [
    `${BUFF_TAG}. Lasts ${BUFF_DURATION} s, stacks with the Focus transformation; the sprite stays unchanged.`,
    `Silhouette: ${form.silhouette}`,
    line('Sprint', t.sprint), line('Sprint + Heavy', t.sprintHeavy),
    ...['forward', 'up', 'down'].map((d) => t[d] ? `${d.toUpperCase()} + Heavy: ${t[d].short.name} (short) — ${t[d].short.text} / ${t[d].full.name} (full) — ${t[d].full.text}` : null),
    line('Defense', t.defense), line('Grab (Defense + Down)', t.grab), line('Jump', t.jump)
  ].filter(Boolean).join('\n');
}

// ── Per-form choreography: perfect-block counter, grab throw, jump, in/out ──
// All derived from the atlas text of each form (generator: counter / throw /
// landing). Effects are short material instances; damage only comes from the
// explicit gameplay checks below, never from the size of the effect.
let spellSink = null; // the spell system (registered on the first buff cast)
export function setBuffSpellSink(spells) { if (spells?.addSpell) spellSink = spells; }
const emit = (fx) => { spellSink?.addSpell?.(fx, 'B'); return fx; };

export class BuffBurstFx {
  constructor(form, x, y, kind, { facing = 1, life = .45, size = 1, z = null } = {}) {
    this.form = form; this.mat = form.mat; this.x = x; this.baseY = y; this.kind = kind;
    this.facing = facing; this.life = life; this.size = size; this.t = 0; this.isFinished = false;
    this.z = z; this.team = 'fx'; this.seed = form.id.charCodeAt(1) * 7 + kind.length * 13;
  }
  get y() { return this.baseY; }
  update(dt) { this.t += dt; if (this.t >= this.life) this.isFinished = true; }
  render(ctx) {
    const k = Math.min(1, this.t / this.life); const fade = 1 - k; const m = this.mat; const f = this.facing; const s = this.size;
    const x = this.x; const y = this.baseY;
    ctx.save();
    switch (this.kind) {
      case 'ring': case 'stomp': {
        const n = this.kind === 'stomp' ? 14 : 10; const r = (14 + 46 * k) * s;
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const px = x + Math.cos(a) * r; const py = y + Math.sin(a) * r * .3; plate(ctx, [[px - 4, py - 3], [px + 4, py - 4], [px + 3, py + 2], [px - 3, py + 2]], m, this.seed + i, { alpha: fade, pulse: 1 }); }
        break;
      }
      case 'spike': {
        const len = (40 + 70 * Math.min(1, k * 2.5)) * s;
        for (let i = 0; i < 3; i++) { const oy = (i - 1) * 9; plate(ctx, [[x, y + oy - 4], [x + f * len * (1 - Math.abs(i - 1) * .25), y + oy], [x, y + oy + 4]], m, this.seed + i, { alpha: fade, pulse: 1, core: i === 1 ? 1 : 0 }); }
        break;
      }
      case 'slash': {
        for (let i = 0; i < 5; i++) { const a = -1.2 + (2.2 * Math.min(1, k * 2)) * (i / 4); const r = 46 * s; plate(ctx, [[x + f * Math.cos(a) * r * .5, y + Math.sin(a) * r * .5], [x + f * Math.cos(a) * r, y + Math.sin(a) * r], [x + f * Math.cos(a + .2) * r * .6, y + Math.sin(a + .2) * r * .6]], m, this.seed + i, { alpha: fade, pulse: 1 }); }
        break;
      }
      case 'flash': {
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const r = (10 + 40 * k) * s; plate(ctx, [[x, y], [x + Math.cos(a - .12) * r, y + Math.sin(a - .12) * r], [x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 1.4], [x + Math.cos(a + .12) * r, y + Math.sin(a + .12) * r]], m, this.seed + i, { alpha: fade, pulse: 1, glowEdge: 1.4 }); }
        break;
      }
      case 'assemble': case 'scatter': {
        const inward = this.kind === 'assemble';
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + this.seed; const d = (inward ? 1 - k : k) * 70 * s + 6; const px = x + Math.cos(a) * d; const py = y + Math.sin(a) * d * .8; const rot = a + k * 4; plate(ctx, [[px + Math.cos(rot) * 5, py + Math.sin(rot) * 5], [px + Math.cos(rot + 2.2) * 4, py + Math.sin(rot + 2.2) * 4], [px + Math.cos(rot + 4.2) * 4, py + Math.sin(rot + 4.2) * 4]], m, this.seed + i, { alpha: inward ? .4 + .6 * k : fade, pulse: 1 }); }
        break;
      }
      case 'fan': {
        for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; const r = (12 + 50 * k) * s; plate(ctx, [[x, y - 2], [x + Math.cos(a - .1) * r, y + Math.sin(a - .1) * r * .5 - 2], [x + Math.cos(a + .1) * r, y + Math.sin(a + .1) * r * .5 - 2]], m, this.seed + i, { alpha: fade }); }
        break;
      }
      case 'crystal': {
        for (let i = 0; i < 5; i++) { const px = x + (i - 2) * 12 * s; const h = (10 + 20 * Math.sin(Math.min(1, k * 2) * Math.PI / 2)) * (1 - Math.abs(i - 2) * .2); plate(ctx, [[px - 4, y], [px, y - h], [px + 4, y]], m, this.seed + i, { alpha: fade, core: 1 }); }
        break;
      }
      default: break;
    }
    ctx.restore();
  }
}

const formOfKey = (key) => BUFF_FORMS[key] ?? (key === 'ninefold' ? BUFF_FORMS.B01 : key === 'eidolon' ? BUFF_FORMS.B02 : null);
const aliveFoe = (t) => t && !t.isDead && (!t.lifeState || t.lifeState === 'Alive') && !t.isObjective && !t.isProp;

// Perfect block: the form's own counter (atlas: "Perfect Block ...").
FORM_FX_HOOKS.counter = (player, gameWorld, key) => {
  const form = formOfKey(key);
  if (!form || !gameWorld) return false;
  const f = player.facing || 1; const kind = form.tech.defense?.counter ?? 'shove'; const st = form.tech.defense?.status ?? [];
  const foes = gameWorld.getHostileTargets(player.team).filter(aliveFoe);
  const front = (t, reach, depth = 34) => { const dx = (t.x - player.x) * f; return dx > -6 && dx <= reach && Math.abs(((t.z ?? player.z) - player.z) * 150) <= depth; };
  const around = (t, r) => Math.hypot(t.x - player.x, ((t.z ?? player.z) - player.z) * 150) <= r;
  const hit = (t, dmg, kx, lift, stun, extra = []) => { t.takeDamage(dmg, kx, lift, stun, false, 'melee'); applyStatuses(t, [...st, ...extra], player, f); };
  const cy = player.y - 46;
  switch (kind) {
    case 'spike': { const t = foes.filter((x) => front(x, 130)).sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0]; if (t) hit(t, 16, f * 260, 60, .5); emit(new BuffBurstFx(form, player.x + f * 10, cy, 'spike', { facing: f })); break; }
    case 'riposte': { for (const t of foes) if (front(t, 95)) hit(t, 22, f * 200, 80, .5); emit(new BuffBurstFx(form, player.x + f * 14, cy, 'slash', { facing: f })); break; }
    case 'shock': { for (const t of foes) if (around(t, 90)) hit(t, 10, Math.sign(t.x - player.x || f) * 200, 40, .5, ['shock']); emit(new BuffBurstFx(form, player.x, player.y - 2, 'ring', { size: 1.4 })); break; }
    case 'flash': { for (const t of foes) if (around(t, 90)) hit(t, 6, Math.sign(t.x - player.x || f) * 120, 20, .6, ['stun']); emit(new BuffBurstFx(form, player.x + f * 12, cy, 'flash')); break; }
    case 'frost': { for (const t of foes) if (around(t, 90)) hit(t, 8, Math.sign(t.x - player.x || f) * 120, 20, .5, ['slow']); emit(new BuffBurstFx(form, player.x, player.y - 2, 'crystal', { size: 1.4 })); break; }
    case 'ward': { player.arcaneShield = Math.max(player.arcaneShield ?? 0, 40); player.arcaneShieldTimer = Math.max(player.arcaneShieldTimer ?? 0, 3); emit(new BuffBurstFx(form, player.x, player.y - 40, 'assemble', { life: .4 })); break; }
    case 'weaken': { for (const t of foes) if (front(t, 120)) applyStatuses(t, ['slow'], player, f); emit(new BuffBurstFx(form, player.x + f * 12, cy, 'flash', { size: .7 })); break; }
    default: { for (const t of foes) if (front(t, 110)) hit(t, 10, f * (kind === 'reflect' ? 380 : 460), 80, .5); emit(new BuffBurstFx(form, player.x + f * 8, cy, 'spike', { facing: f, size: 1.3 })); }
  }
  return true;
};

// Grab: the form's own throw (atlas grab sentence).
FORM_FX_HOOKS.grabSlam = (fx) => {
  const form = formOfKey(fx.form);
  if (!form || !fx.target) return false;
  const f = fx.facing; const t = fx.target; const kind = form.tech.grab?.throw ?? 'forward';
  const throws = {
    side: [20, f * 180, 140, .6], over: [24, -f * 320, 260, .7], slam: [26, f * 60, -200, .9], pull: [22, f * 380, 120, .6],
    spin: [22, f * 300, 200, .6], lift: [22, f * 120, 420, .7], forward: [20, f * 280, 120, .6]
  };
  const [dmg, kx, lift, stun] = throws[kind] ?? throws.forward;
  t.takeDamage?.(dmg, kx, lift, stun, true, 'grab');
  if (kind === 'side' && 'z' in t) t.z = Math.max(.04, Math.min(.96, t.z + (t.z > .5 ? -.12 : .12)));
  applyStatuses(t, form.tech.grab?.status ?? [], fx.player, f);
  const ty = (t.y ?? groundYForDepth(t.z ?? fx.player.z));
  emit(new BuffBurstFx(form, t.x, kind === 'slam' ? ty - 2 : ty - 36, kind === 'slam' ? 'stomp' : 'scatter', { facing: f, size: kind === 'slam' ? 1.3 : .8 }));
  combat.shakeCamera(kind === 'slam' ? 9 : 5, .22);
  return true;
};

// Jump: takeoff burst and the form's own landing (no damage).
FORM_FX_HOOKS.jump = (player, phase, key) => {
  const form = formOfKey(key);
  if (!form) return false;
  const y = groundYForDepth(player.z) - (player.surfaceHeight ?? 0);
  if (phase === 'takeoff') { emit(new BuffBurstFx(form, player.x, y - 1, 'ring', { size: .7, life: .3 })); return true; }
  const landing = form.tech.jump?.landing ?? 'dust';
  const kind = landing === 'stomp' ? 'stomp' : landing === 'fan' ? 'fan' : landing === 'crystal' ? 'crystal' : 'ring';
  emit(new BuffBurstFx(form, player.x, y - 1, kind, { size: landing === 'stomp' ? 1.3 : 1 }));
  if (landing === 'spring') emit(new BuffBurstFx(form, player.x, y - 1, 'ring', { size: .6, life: .3 }));
  if (landing === 'stomp') combat.shakeCamera(4, .15);
  return true;
};

// Transform-in / -out instances (called from activate / end).
export function buffTransformFx(player, form, phase) {
  emit(new BuffBurstFx(form, player.x, player.y - 46, phase === 'in' ? 'assemble' : 'scatter', { life: phase === 'in' ? .5 : .55, size: 1.2 }));
}

// ── Morphology runtime: time echoes (T39), peak manifestation, levitation ──
import { ghostOf, stoneRing, STONE } from './buff_signatures.js';

const ATTACK_STATE = /^(attack[123]|heavyStrike|uppercut)$/;

// Vorausschnitt: an echo leaves its time plane and strikes a moment later.
export class EchoStrikeFx {
  constructor(player, form, delay, fromDx, damage = 6) {
    this.damage = damage;
    this.player = player; this.form = form; this.mat = form.mat; this.team = player.team;
    this.delay = delay; this.fromDx = fromDx; this.t = 0; this.life = delay + .42; this.isFinished = false;
    this.facing = player.facing || 1; this.state = player.state; this.struck = false;
    this.x0 = player.x + fromDx * this.facing; this.z = player.z;
    this.x1 = player.x + this.facing * 34;
  }
  get x() { return this.x0 + (this.x1 - this.x0) * Math.min(1, Math.max(0, (this.t - this.delay) / .14)); }
  get y() { return groundYForDepth(this.z); }
  update(dt, gameWorld) {
    this.t += dt;
    if (!this.struck && this.t >= this.delay + .14) {
      this.struck = true;
      for (const t of gameWorld?.getHostileTargets(this.team) ?? []) {
        if (!t || t.isDead || t.isObjective || t.isProp || (t.lifeState && t.lifeState !== 'Alive')) continue;
        const dx = (t.x - this.x1) * this.facing;
        if (dx < -10 || dx > 60 || Math.abs(((t.z ?? this.z) - this.z) * 150) > 30) continue;
        t.takeDamage(this.damage, this.facing * 120, 30, .2, false, 'melee');
      }
    }
    if (this.t >= this.life) this.isFinished = true;
  }
  render(ctx) {
    if (this.t < this.delay) return;
    const k = (this.t - this.delay) / (this.life - this.delay);
    if (this.form.id !== 'T39') {
      // Resonanzwache (V3.2): no humanoid echo — a travelling sound notch from the string frames.
      for (let r = 0; r < 3; r++) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = this.mat.edge; ctx.lineWidth = 2 - r * .5; ctx.globalAlpha = (1 - k) * (1 - r * .25); ctx.beginPath(); ctx.ellipse(this.x + this.facing * (10 + r * 8), this.y - 44, 6 + r * 6, 16 + r * 8, 0, -1.2, 1.2); ctx.stroke(); ctx.restore(); }
      return;
    }
    ghostOf(ctx, this.player, this.x, this.y, this.state, this.t * 3, this.facing, .55 * (1 - k * .8), '#d6f5e2');
    if (this.struck && k < .8) {
      const sx = this.x1 + this.facing * 26; const sy = this.y - 44;
      for (let i = 0; i < 4; i++) { const a = -1 + i * .6; plate(ctx, [[sx, sy], [sx + this.facing * Math.cos(a) * 26, sy + Math.sin(a) * 26], [sx + this.facing * Math.cos(a + .25) * 18, sy + Math.sin(a + .25) * 18]], this.mat, 950 + i, { alpha: 1 - k, pulse: 1 }); }
    }
  }
}

// Per frame from updateBuffForm: trail, echoes, peak flag.
export function updateMorphology(player, form, dt) {
  const b = player.buffForm; if (!b || !form) return;
  if (form.morphology === 'temporal_projection') {
    player._timeTrail ??= [];
    player._timeTrail.unshift({ x: player.x, y: player.y, z: player.z, state: player.state, animTime: player.animTime, facing: player.facing });
    if (player._timeTrail.length > 60) player._timeTrail.length = 60;
  }
  if (form.morphology === 'temporal_projection') {
    // Echoes strike delayed on every fresh attack: Vorausschnitt's three
    // planes, Resonanzwache's two resonance echoes.
    const attacking = ATTACK_STATE.test(player.state) && player.stateTimer > 0;
    const fresh = attacking && (b.lastState !== player.state || b.lastCombo !== player.comboStep);
    if (fresh) (form.id === 'T39' ? [-150, -75, 70] : [-60, -30]).forEach((dx, i) => emit(new EchoStrikeFx(player, form, .08 + i * .08, dx, form.id === 'T39' ? 6 : 5)));
    b.lastState = attacking ? player.state : null; b.lastCombo = player.comboStep;
  }
  // Smoothed action weights the morphology renderers blend between.
  const approach = (v, target, rate) => v + (target - v) * Math.min(1, dt * rate);
  const acting = /^(attack|heavyStrike|uppercut|dive)/.test(player.state ?? '') && player.stateTimer > 0;
  b.act = approach(b.act ?? 0, acting ? 1 : 0, acting ? 18 : 5);
  b.guardK = approach(b.guardK ?? 0, player.isGuarding ? 1 : 0, 12);
  b.sprintK = approach(b.sprintK ?? 0, player.sprintActive ? 1 : 0, 7);
  // Landing marker for the jump phases of the V3.2 morphologies.
  if (b.wasAir && player.grounded) b.landAt = b.age;
  b.wasAir = player.grounded === false;
  // Peak manifestation: a full release makes the form flare to its maximum.
  const wasFull = b.wasFull; const isFull = !!(player.formCharge && player.formCharge.elapsed >= 1.2);
  if (wasFull && !player.formCharge) b.peakAt = b.age;
  b.wasFull = isFull;
}

export const peakOf = (player) => { const b = player.buffForm; return b?.peakAt != null && b.age - b.peakAt < .7 ? 1 - (b.age - b.peakAt) / .7 : 0; };

// Levitation state: the Wizard hovers a little above his shadow.
export function levitationOffset(player) {
  const form = currentBuffForm(player);
  if (!form || form.morphology !== 'levitation' || !player.grounded) return 0;
  return (10 + Math.sin((player.animTime ?? 0) * 2.2) * 3) * buffFade(player);
}

// Asterglied guard: the rings stack in front as a stone shield.
export function asterShield(ctx, player, renderY) {
  const f = player.facing || 1; const t = player.animTime ?? 0;
  for (let i = 0; i < 4; i++) stoneRing(ctx, player.x + f * (30 + i * 3), renderY - 30 - i * 16, 18 - i, .95, Math.PI / 2, t * (i % 2 ? .8 : -.8), 10, 5900 + i * 30, buffFade(player));
}
