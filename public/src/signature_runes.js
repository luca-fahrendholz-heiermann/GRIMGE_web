// GRIMGE Prototype — SIGNATURE SPECIALS: entry point and game hooks.
//
// The 36 signature special runes of the research atlas (S01–S36) are special
// runes: each has its own complex multi-stroke glyph (more drawing time, no
// combination needed), may be in a deck once, and they are NOT Arcane States
// — they never transform the Wizard or replace his sprite.
// Shared runtime: signature_core.js; mechanics: signature_abilities_*.js.
import { combat } from './combat.js';
import {
  SIGNATURES, signatureImpl, setSignatureSink, sigSink, DebrisLayer, endStance, startStance,
  isSignatureRuneId, SIGNATURE_RUNE_IDS, SIG_PREFIX, setHitContext
} from './signature_core.js';
import './signature_abilities_a.js';
import './signature_abilities_b.js';
import './signature_abilities_c.js';

export { SIGNATURES, isSignatureRuneId, SIGNATURE_RUNE_IDS, SIG_PREFIX, setHitContext, startStance, endStance };

let world = null;
const listeners = new Set();
// World effects that react to the combat events of their owner (needles,
// echoes, seed seals …) register here; finished ones drop out.
export function listen(fx) { listeners.add(fx); return fx; }

// Cast a signature special (from SpellSystem.cast).
export function castSignature(system, caster, definition, quality, target, gameWorld) {
  setSignatureSink(system); world = gameWorld ?? world;
  const id = definition.signatureId; const impl = signatureImpl(id); const sig = SIGNATURES[id];
  if (!impl || !sig) return false;
  if (!system.activeSpells.some((s) => s.isSignatureDebris)) system.addSpell(new DebrisLayer(), 'B');
  combat.spawnShockwave(caster.x, (caster.y ?? 0) - 40, 40, sig.mat.vein);
  gameWorld?.showAnnouncement?.(`✦ ${sig.name.toUpperCase()}`, 1.1);
  impl.cast({ system, caster, gw: gameWorld, quality: quality ?? { power: 1, area: 1, duration: 1, particles: 1, grade: 'B' }, target, sig, id, listen });
  return true;
}

// ── Player hooks (entities.js) ───────────────────────────────────────────
export function updateSignatureStance(player, dt, gameWorld) {
  world = gameWorld ?? world;
  const st = player.signature;
  if (!st) { player.isHovering = false; return; }
  st.t += dt; st.timer -= dt;
  st.impl.stance.update?.(player, st, dt, gameWorld);
  if (!player.signature) return;
  player.isHovering = signatureHover(player) > 4;
  if (st.timer <= 0 || !player.isAlive) endStance(player, player.isAlive ? 'expired' : 'down');
}
export function renderSignatureStance(ctx, player, renderY, layer) {
  const st = player.signature;
  if (st?.impl.stance.render) st.impl.stance.render(ctx, player, st, renderY, layer);
}
export function signatureHover(player) { const st = player.signature; return st?.impl.stance.hover ? Math.max(0, st.impl.stance.hover(player, st)) : 0; }
export function signatureMoveMult(player) {
  const m = player.signature?.impl.stance.moveMult;
  return typeof m === 'function' ? m(player, player.signature) : (m ?? 1);
}
export const signatureMoveset = (player) => player.signature?.impl.stance.moveset ?? null;
export function signatureDamageTaken(player, amount, kx, kind) {
  const st = player.signature;
  return st?.impl.stance.damageTaken ? st.impl.stance.damageTaken(player, st, amount, kx, kind) : amount;
}
// Combat event bus: 'attack' (normal attack started), 'hit' (melee hits,
// info.hits = [{ target, blocked }]), 'heavy' (charged heavy released),
// 'projectile' (the player's own projectile spawned, info.p).
export function signatureEvent(player, type, info = {}) {
  if (!player) return;
  const st = player.signature;
  st?.impl.stance.onEvent?.(player, st, type, info, world);
  for (const fx of listeners) {
    if (fx.isFinished) { listeners.delete(fx); continue; }
    if (fx.owner === player) fx.onSigEvent?.(type, info, world);
  }
}

// ── SpellSystem hooks (spells.js) ────────────────────────────────────────
export function signatureProjectileSpawned(spell) {
  const player = world?.player;
  if (!player || spell.team !== player.team || spell.isSigProjectile) return;
  if (Math.abs(spell.x - player.x) > 90) return;
  signatureEvent(player, 'projectile', { p: spell });
}
// Per frame: lateral drift of steered projectiles that do not move in depth themselves.
export function updateSignatureWorld(dt, gameWorld) {
  world = gameWorld ?? world;
  for (const p of gameWorld?.projectiles ?? []) if (p._vz) { p.z = Math.max(.02, Math.min(.98, p.z + p._vz * dt)); if (p.type === 'bolt') p.targetZ = p.z; }
  for (const s of sigSink()?.activeSpells ?? []) if (s._vz && !s.isSigProjectile && !s.isFinished) s.z = Math.max(.02, Math.min(.98, s.z + s._vz * dt));
}
