// GRIMGE Prototype — special-rune buff transformations (runtime).
//
// docs/GRIMGE_Transformations_Atlas_V3_1_Sonnenwyrm.md §1.9: the 42 forms
// (B01 Risswild, B02 Arkengestell, T01–T40) are BUFF TRANSFORMATIONS. At
// most ONE buff rune may be in a deck; it is cast like a spell, lasts a
// limited time, never changes the character sprite and may run together
// with the primary Focus transformation. Only one buff is active at a time.
//
// While a buff is active its moveset owns the charged heavy (forward / up /
// down × short / full), the sprint attack, the guard and grab visuals and
// the manifestation around the Wizard. B01 and B02 keep their established
// combat engines (the former Ninefold / Eidolon manifests) and get the
// atlas look and names; T01–T40 run on the generic engine below.
import { BUFF_FORM_DATA } from './buff_forms_data.js';
import { FORM_MOVESETS, registerFormPalette, FormStrikeSpell } from './form_moves.js';
import { FORM_SPRINT_ATTACKS, FORM_FX_HOOKS } from './form_actions.js';
import { materialFor, renderManifestation, contourVeinPainter, plate, band, rgba } from './buff_vfx.js';
import { BuffStrikeSpell } from './buff_techniques.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';

export const BUFF_RUNE_PREFIX = 'buff_';
export const BUFF_DURATION = 16;            // seconds at grade B (× rune quality)
export const BUFF_TAG = 'BUFF TRANSFORMATION · MAX 1 PER DECK';
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
    case 'projectile': return { ...base, kind: 'projectile', speed: short ? 520 : 400, range: short ? 320 : 460, damage: short ? 32 : 60, kx: 240, lift: lift ?? 60, explode: short ? 0 : 92, pierce: st.includes('pull') };
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

// ── Runtime ─────────────────────────────────────────────────────────────
// The buff form currently shaping the Wizard (B01/B02 via their engines).
export function currentBuffForm(player) {
  if (player.ninefoldTimer > 0) return BUFF_FORMS.B01;
  if (player.eidolonTimer > 0) return BUFF_FORMS.B02;
  if (player.buffForm?.timer > 0) return BUFF_FORMS[player.buffForm.id] ?? null;
  return null;
}

// Fade of the manifestation: assemble on transform-in, dissolve on the way out.
export function buffFade(player) {
  const form = currentBuffForm(player);
  if (!form) return 0;
  const timer = form.id === 'B01' ? player.ninefoldTimer : form.id === 'B02' ? player.eidolonTimer : player.buffForm.timer;
  const age = player.buffForm?.age ?? 1;
  return Math.max(0, Math.min(1, age * 2.2, timer * 2));
}

// Cast the buff rune. Returns false when another buff is still active.
export function activateBuffForm(player, id, quality = { duration: 1, power: 1, area: 1, particles: 1 }, spells = null) {
  const form = BUFF_FORMS[id];
  if (!form || !player) return false;
  const active = currentBuffForm(player);
  if (active && active.id !== id) {
    window.gameWorld?.showAnnouncement?.(`${active.name.toUpperCase()} IS STILL ACTIVE — ONE BUFF TRANSFORMATION AT A TIME`, 1.4);
    return false;
  }
  const duration = BUFF_DURATION * (quality.duration ?? 1);
  if (id === 'B01') { spells?.castNinefoldBeast?.(player, quality); player.ninefoldTimer = duration; }
  else if (id === 'B02') { spells?.castEidolonMantle?.(player, quality); player.eidolonTimer = duration; }
  else {
    player.ninefoldTimer = 0; player.eidolonTimer = 0;
  }
  player.buffForm = { id, timer: duration, total: duration, age: active ? (player.buffForm?.age ?? 1) : 0, power: quality.power ?? 1 };
  combat.spawnShockwave(player.x, player.y - 40, 80 * (quality.area ?? 1), form.mat.vein);
  combat.spawnShockwave(player.x, player.y - 4, 50, form.mat.edge);
  window.gameWorld?.showAnnouncement?.(`${form.name.toUpperCase()}${form.title ? ' — ' + form.title.toUpperCase() : ''} · ${Math.round(duration)} S`, 1.6);
  return true;
}

export function updateBuffForm(player, dt) {
  const b = player.buffForm;
  if (!b) return;
  b.age += dt;
  if (b.id === 'B01') b.timer = player.ninefoldTimer;
  else if (b.id === 'B02') b.timer = player.eidolonTimer;
  else b.timer = Math.max(0, b.timer - dt);
  if (b.timer <= 0 || !player.isAlive) endBuffForm(player);
}

export function endBuffForm(player) {
  if (!player.buffForm) return;
  const form = BUFF_FORMS[player.buffForm.id];
  if (form && player.isAlive) combat.spawnShockwave(player.x, player.y - 40, 46, form.mat.edge);
  if (player.buffForm.id === 'B01') player.ninefoldTimer = 0;
  if (player.buffForm.id === 'B02') player.eidolonTimer = 0;
  player.buffForm = null;
}

// Combat modifiers of the generic T forms (B01/B02 keep their engines').
export const isGenericBuff = (player) => !!(player.buffForm?.timer > 0 && player.buffForm.id !== 'B01' && player.buffForm.id !== 'B02');

// ── Rendering hooks ─────────────────────────────────────────────────────
export function renderBuffManifestation(ctx, player, renderY, layer) {
  const form = currentBuffForm(player);
  if (!form) return false;
  renderManifestation(ctx, player, form, layer, renderY, buffFade(player));
  if (layer === 'front') renderBuffTimer(ctx, player, form, renderY);
  return true;
}

export function buffVeinPainter(player) {
  const form = currentBuffForm(player);
  return form ? contourVeinPainter(form, player.animTime ?? 0) : null;
}

export function buffCloakColor(player) {
  const form = currentBuffForm(player);
  if (!form) return null;
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
  const ry = p.y - (p.elevation ?? 0) - 44;
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
