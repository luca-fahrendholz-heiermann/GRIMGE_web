// GRIMGE Prototype — a more human AI Wizard (user, 3 Nov 2026: "ballert alle spell hintereinander ab … tracest mich
// direkt und man hat gar keine zeit zu reagieren … sie sollte nicht direkt jede rune perfekt zeichnen können, bzw so
// lange wie ein geskillter mensch benötigen und adaptiv auf die situationen reagieren, strategisch").
//   perception  the AI acts on a snapshot of the player that is refreshed after its reaction time (with an aim error
//               that grows with distance and with fog / concealment) — it chases where you WERE, not where you are.
//   drawing     every rune is drawn like a player draws it: the time follows the glyph's stroke length at a skilled
//               hand's speed (+ a pause per rune), the glyph appears stroke by stroke in front of the Wizard (a
//               visible tell), a hit breaks it, and the result gets a grade (C–S) or misfires now and then.
//   mana        the player's regeneration (5.5/s) instead of double; a reserve is kept unless a kill is near.
//   plans       every few seconds the AI picks a plan for the moment: PRESS (close in for melee), KITE (keep spell
//               range, side-step out of the lane), RECOVER (back off to regain mana / when hurt), PUNISH (rush a
//               player who is drawing or out of mana). Incoming shots are dodged in depth now and then.
import { RUNE_GUIDES, guideStrokes } from './rune_guides.js';
import { combat } from './combat.js';
import { drawCastTell } from './cast_circle.js';

// Skill profiles. reaction: s until a new snapshot; speed: drawing px/s on a 60 px glyph; pause: s per rune;
// aim: px error at 300 px; grades: chances of S / A / B (rest C); fail: misfire chance; dodge: chance to side-step.
export const AI_SKILL = Object.freeze({
  novice: Object.freeze({ reaction: .55, speed: 330, pause: .26, aim: 50, grades: [.03, .15, .45], fail: .12, dodge: .2, aggression: .4 }),
  normal: Object.freeze({ reaction: .4, speed: 430, pause: .18, aim: 34, grades: [.08, .27, .42], fail: .07, dodge: .35, aggression: .55 }),
  skilled: Object.freeze({ reaction: .3, speed: 540, pause: .14, aim: 22, grades: [.15, .35, .38], fail: .04, dodge: .5, aggression: .7 }),
  master: Object.freeze({ reaction: .22, speed: 650, pause: .1, aim: 14, grades: [.25, .4, .3], fail: .02, dodge: .65, aggression: .8 })
});
export const AI_MANA_REGEN = 5.5; // = the player's MANA_BALANCE.regen
export const AI_MANA_RESERVE = 14;
const GLYPH_SIZE = 60; // the size the drawing time is measured at (a player's rune is drawn about this large)

export function aiSkill(ai, gw) {
  if (ai.aiSkill && AI_SKILL[ai.aiSkill]) return AI_SKILL[ai.aiSkill];
  const lvl = gw?.modeState?.invasionLevel ?? gw?.modeState?.level ?? 0;
  if (gw?.modeState?.bossActive || ai.isBoss) return lvl >= 4 ? AI_SKILL.master : AI_SKILL.skilled;
  if (lvl >= 4) return AI_SKILL.skilled;
  return AI_SKILL.normal;
}

// ── perception ───────────────────────────────────────────────────────────
// The snapshot of the target the AI acts on (refreshed after the reaction time, never more often).
export function perceive(ai, target, dt, gw) {
  if (!target) return null;
  const sk = aiSkill(ai, gw); const s = ai.seen;
  ai.seenT = (ai.seenT ?? 0) - dt;
  if (!s || s.ref !== target || ai.seenT <= 0) {
    const conceal = Math.max(0, Math.min(1, target.concealment ?? 0));
    const d = Math.hypot(target.x - ai.x, ((target.z ?? 0) - (ai.z ?? 0)) * 150);
    // In a fog bank the AI sees the target late and badly (and right next to it only roughly).
    const err = sk.aim * (d / 300) * (1 + conceal * 3) + conceal * 25;
    const lost = conceal > .35 && d > 70 && Math.random() < conceal * .6;
    ai.seen = lost && s ? { ...s, t: 0, lost: true } : { ref: target, x: target.x + (Math.random() - .5) * 2 * err, z: (target.z ?? 0) + (Math.random() - .5) * 2 * err / 150, vx: target.vx ?? 0, vz: target.vz ?? 0, t: 0, lost: false };
    ai.seenT = sk.reaction * (.75 + Math.random() * .5) * (1 + conceal * 1.5);
  } else s.t += dt;
  return ai.seen;
}
// Where to aim a ground spell: the snapshot, led a little along the seen movement (imperfectly).
export function aimPoint(ai, gw, lead = .35) {
  const s = ai.seen; if (!s) return null;
  const k = lead * (.5 + Math.random() * .7);
  return { x: s.x + (s.vx ?? 0) * (k + s.t), z: Math.max(.04, Math.min(.96, s.z + (s.vz ?? 0) * (k + s.t))) };
}

// ── drawing a rune ───────────────────────────────────────────────────────
const guideLen = (id) => {
  const g = RUNE_GUIDES[String(id).startsWith('buff_') ? 'buff_sigil' : id]; if (!g) return 3.2;
  let n = 0; for (const st of g) for (let i = 1; i < st.length; i++) n += Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]);
  return n;
};
// Seconds a hand of this skill needs for these runes.
export function drawTime(runes, sk) { return runes.reduce((sum, id) => sum + sk.pause + guideLen(id) * GLYPH_SIZE / sk.speed, 0) + .12; }
function rollGrade(sk) {
  const r = Math.random(); const [s, a, b] = sk.grades;
  return r < s ? 'S' : r < s + a ? 'A' : r < s + a + b ? 'B' : 'C';
}
// Start drawing. run(grade) performs the cast when the glyph is done (it re-checks mana / aim itself).
export function beginAIDraw(ai, gw, { runes, run, label = '', color = '#ff5252' }) {
  if (ai.aiDraw) return false;
  const sk = aiSkill(ai, gw); const list = runes?.length ? runes : ['ignis'];
  ai.aiDraw = { runes: list, run, label, color, t: 0, dur: drawTime(list, sk) * (ai.drawTimeMult ?? 1), grade: rollGrade(sk), fail: Math.random() < sk.fail };
  return true;
}
export function cancelAIDraw(ai, why = 'RUNE ZERBROCHEN') {
  if (!ai.aiDraw) return false;
  ai.aiDraw = null; ai.spellCooldown = Math.max(ai.spellCooldown ?? 0, .5);
  combat.spawnDamageText?.(ai.x, (ai.y ?? 0) - 96, why, { color: '#bdbdbd' });
  return true;
}
// Advance the drawing; true while the Wizard is busy drawing (it stands still).
export function updateAIDraw(ai, dt, gw) {
  const d = ai.aiDraw; if (!d) return false;
  d.t += dt;
  if (d.t < d.dur) return true;
  ai.aiDraw = null;
  if (d.fail) { combat.spawnDamageText?.(ai.x, (ai.y ?? 0) - 96, 'RUNE MISSLUNGEN', { color: '#9e9e9e' }); ai.spellCooldown = Math.max(ai.spellCooldown ?? 0, .4); return false; }
  d.run(d.grade);
  ai.lastAIGrade = d.grade;
  return false;
}
// The tell (user, 4 Nov 2026: "mit einem magischen kreis vor einem visualisieren, sodass man weiß der gegner zeichnet
// gerade etwas" — later hand signs will animate it): an upright magic circle in front of the hand with turning rings,
// rune ticks and a progress arc on the rim; the glyph is traced inside stroke by stroke, a circle grows at the feet.
// Readable from afar, so a player can punish it (a hit breaks the rune).
export function renderAIDraw(ctx, ai) {
  const d = ai.aiDraw; if (!d) return;
  const per = d.dur / d.runes.length; const i = Math.min(d.runes.length - 1, Math.floor(d.t / per)); const k = Math.min(1, (d.t - i * per) / per);
  const open = Math.min(1, d.t / .15); const f = ai.facing || 1;
  const cx = Math.round(ai.x + f * 36); const cy = Math.round((ai.y ?? 0) - 56);
  // The guide of the current rune, traced up to the drawing progress.
  const guide = guideStrokes(d.runes[i], cx, cy, 13 * open); let left = Math.round(guide.reduce((n, s) => n + s.length, 0) * k); const strokes = [];
  for (const st of guide) { if (left <= 1) break; const pts = st.slice(0, left); left -= pts.length; strokes.push(pts); }
  drawCastTell(ctx, { x: ai.x, y: ai.y ?? 0, facing: f, t: d.t, color: d.color, open, progress: d.t / d.dur, pips: d.runes.map((_, j) => (j < i ? 'done' : j === i ? 'now' : 'todo')), strokes, groundY: ai.y ?? 0, groundGrow: d.t / d.dur });
}

// ── mana discipline ──────────────────────────────────────────────────────
// Can the AI afford this now? It keeps a reserve unless the target is nearly beaten.
export function canAfford(ai, cost, target) {
  const finish = target && Number.isFinite(target.hp) && target.hp / (target.maxHp || 1) < .25;
  return (ai.mp ?? 0) >= cost + (finish ? 0 : AI_MANA_RESERVE * (cost < 20 ? .5 : 1));
}

// ── plans ────────────────────────────────────────────────────────────────
// The player is drawing a rune (main.js drawing mode) — a window to punish.
export const playerDrawing = (player, gw) => !!(player && player === gw?.player && gw?.drawing?.active);
// Re-think every 1.5–3 s (or at once when the situation flips).
export function choosePlan(ai, player, gw) {
  const sk = aiSkill(ai, gw); const hp = ai.hp / ai.maxHp; const mp = (ai.mp ?? 0) / (ai.maxMp || 100);
  const php = player.hp / (player.maxHp || 1); const pmp = (player.mp ?? 50) / (player.maxMp || 100);
  const drawing = playerDrawing(player, gw);
  let plan = 'KITE';
  if (drawing || pmp < .15) plan = 'PUNISH';
  else if (hp < .3 || (mp < .2 && hp < .7)) plan = 'RECOVER';
  else if (mp < .25 || php < .3 || Math.random() < sk.aggression * .45) plan = 'PRESS';
  ai.aiPlan = plan; ai.aiPlanT = 1.5 + Math.random() * 1.5;
  // A preferred depth offset while kiting (out of the player's lane, but not too far).
  ai.aiLaneOffset = (Math.random() < .5 ? -1 : 1) * (.06 + Math.random() * .08);
  return plan;
}
export function updatePlan(ai, player, dt, gw) {
  ai.aiPlanT = (ai.aiPlanT ?? 0) - dt;
  const flip = ai.aiPlan !== 'PUNISH' && playerDrawing(player, gw);
  if (!ai.aiPlan || ai.aiPlanT <= 0 || flip) choosePlan(ai, player, gw);
  return ai.aiPlan;
}
// Where to walk for the plan: { x, z, speed (0..1) } toward the snapshot s.
export function planMove(ai, s, home, plan) {
  const dx = s.x - ai.x; const d = Math.abs(dx); const side = Math.sign(dx) || ai.facing || 1;
  if (plan === 'RECOVER') return { x: home.x, z: home.z, speed: .8, face: side };
  if (plan === 'PRESS' || plan === 'PUNISH') return { x: s.x - side * 50, z: s.z, speed: plan === 'PUNISH' ? 1 : .95, face: side };
  // KITE: hold 200–320 px, a little off the target's lane.
  const want = d < 190 ? s.x - side * 260 : d > 330 ? s.x - side * 280 : ai.x;
  return { x: want, z: Math.max(.06, Math.min(.94, s.z + (ai.aiLaneOffset ?? .08))), speed: d < 190 ? .85 : .6, face: side };
}
// Incoming hostile shot in the AI's lane → step aside in depth (chance by skill, once per shot).
export function dodgeShot(ai, gw, shots) {
  const sk = aiSkill(ai, gw);
  for (const p of shots) {
    if (p.team === ai.team || p.aiSeen?.has?.(ai) || !Number.isFinite(p.vx) || !Number.isFinite(p.x)) continue;
    const toward = Math.sign(ai.x - p.x) === Math.sign(p.vx) && Math.abs(ai.x - p.x) < 220 && Math.abs(((p.z ?? ai.z) - ai.z) * 150) < 26;
    if (!toward) continue;
    (p.aiSeen = p.aiSeen ?? new Set()).add(ai);
    if (Math.random() < sk.dodge) { ai.aiDodge = { t: .28, dir: ai.z > .5 ? -1 : 1 }; return true; }
  }
  return false;
}
