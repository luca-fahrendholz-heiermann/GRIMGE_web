// GRIMGE Prototype — two-stage spells (user, 20 Oct 2026: "Spell zweimal
// aktivieren, bevor er aus dem Slot entfernt wird" — Minato's kunai, a
// Rasengan follow-up, a trap you detonate yourself).
//
// A spell's first cast may OFFER a re-cast: the slot then stays in place
// (glowing, with a countdown ring) instead of being consumed. Tapping it again
// within the window runs stage 2 and frees the slot. When the window runs out
// the slot is freed and `expire` runs (e.g. a trap stays armed but can no
// longer be detonated by hand). Mana is paid once, at the first cast.
export const RECAST_WINDOW = 4; // default seconds

let offered = null;
// Called by a spell during its first cast.
export function offerRecast(caster, { window = RECAST_WINDOW, label = 'STUFE 2', stage2, expire = null, valid = null } = {}) {
  offered = { caster, window, label, stage2, expire, valid };
}
// Taken by the slot code right after the cast (null when the spell offered nothing).
export function takeOfferedRecast(caster) {
  const o = offered; offered = null;
  return o && o.caster === caster ? o : null;
}
// Per-frame countdown of the open re-casts of a player; expired slots are returned.
export function tickRecasts(player, dt) {
  const expired = [];
  for (const slot of player.slottedSpells ?? []) {
    const r = slot.recast; if (!r) continue;
    r.left -= dt;
    // A stage-2 target that vanished (e.g. the marked foe died) ends the window early.
    if (r.left <= 0 || (r.valid && !r.valid())) expired.push(slot);
  }
  for (const slot of expired) slot.recast.expire?.();
  return expired;
}
// Runs stage 2 of a slot's open re-cast (true when it fired).
export function runRecast(slot, game) {
  const r = slot?.recast; if (!r) return false;
  slot.recast = null;
  return r.stage2?.(game) !== false;
}
