// GRIMGE Prototype — placed buff zones (e.g. S44 Kriegsbanner) the combat
// code can ask about without importing the signature modules.
export const BUFF_ZONES = new Set();
// Strongest active zone effect for an entity: { dmg, move }.
export function zoneBuffOf(entity) {
  let dmg = 1; let move = 1;
  for (const z of BUFF_ZONES) {
    if (z.isFinished || z.isDead || z.team !== entity.team) continue;
    if (Math.hypot(entity.x - z.x, ((entity.z ?? z.z) - z.z) * 150) > z.radius) continue;
    dmg = Math.max(dmg, z.dmg ?? 1); move = Math.max(move, z.move ?? 1);
  }
  return { dmg, move };
}
