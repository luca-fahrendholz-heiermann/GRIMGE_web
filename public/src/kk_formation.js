// GRIMGE Prototype — Kronenkrieg squad formations (user, 22 Nov 2026: "Einheiten sollten folgendermaßen aufstellbar sein als
// Modi: entweder mein Charakter vorn und alle hinter ihm, mit gleichem Abstand radial angeordnet — Fernkämpfer in der Mitte,
// Nahkämpfer umranden sie zum Schutz, die Schilde ganz außen; oder das gleiche Prinzip mit dem Charakter in der Mitte, für
// Leute, die selbst Fernkampf machen und geschützt werden müssen. Die Formationen sind in jeder seiner Burgen änderbar, in
// der Vorkammer.")
//   front  — the leader ahead; the squad a round block behind him (against his facing)
//   center — the leader in the middle of the rings
// Slots lie on concentric rings with one spacing (centre point, then 6, 12, 18 … places): ranged fighters on the inner
// rings, melee around them, the shield bearers on the outermost; every group starts on a ring of its own and spreads
// evenly over it. Depth is foreshortened like the 2.5D view. Only a unit without a foe walks to its slot — fighting is unchanged.
import { clampZ } from './world.js';

export const FORMATIONS = Object.freeze({
  front: { id: 'front', label: 'ANFÜHRER VORNE', hint: 'Du gehst voran, die Truppe folgt als Rundblock' },
  center: { id: 'center', label: 'ANFÜHRER MITTE', hint: 'Du stehst geschützt in der Mitte (für Fernkämpfer)' }
});
export const FORMATION = Object.freeze({ spacing: 34, depthScale: .45, gap: 46, turnHold: .35 });
const GROUP_ORDER = ['ranged', 'melee', 'shield'];
const RANGED = new Set(['Ranger', 'Arcanist']); const SHIELD = new Set(['Guardian']);
// ranged in the middle, shields outside, everything else (melee classes, creatures, dino-dragons) the ring between
export function formationRole(rec) { if (!rec || rec.dino || rec.creature) return 'melee'; if (RANGED.has(rec.cls)) return 'ranged'; if (SHIELD.has(rec.cls)) return 'shield'; return 'melee'; }
export const formationOf = (kk) => (FORMATIONS[kk?.formation] ? kk.formation : 'front');
export function setFormation(kk, id) { if (!kk || !FORMATIONS[id]) return false; kk.formation = id; return true; }

// Slot offsets for a list of records: Map(rec → { dx, dy, ring }) in pixels around the formation centre (dy = depth pixels,
// already foreshortened), plus the outer radius and where that centre sits relative to the leader.
export function formationSlots(kind, recs, facing = 1) {
  const S = FORMATION.spacing; const groups = Object.fromEntries(GROUP_ORDER.map((g) => [g, []]));
  for (const r of [...recs].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))) groups[formationRole(r)].push(r); /* stable: no slot swapping */
  const slots = new Map(); let ring = kind === 'center' ? 1 : 0; let outer = 0;
  for (const g of GROUP_ORDER) {
    const list = groups[g]; let i = 0;
    while (i < list.length) {
      const left = list.length - i;
      if (ring === 0 && left > 1 && left < 7) ring = 1; /* the centre point only for a lone unit or a group that fills it and ring 1 */
      const cap = ring === 0 ? 1 : 6 * ring; const take = Math.min(cap, left); const r = ring * S; const phase = ring % 2 ? Math.PI / take : 0;
      for (let k = 0; k < take; k++) { const a = phase + (2 * Math.PI * k) / take; slots.set(list[i + k], { dx: Math.cos(a) * r * facing, dy: Math.sin(a) * r * FORMATION.depthScale, ring }); }
      outer = Math.max(outer, r); i += take; ring++;
    }
  }
  const centerDx = kind === 'center' ? 0 : -facing * (outer + FORMATION.gap); /* behind the leader */
  return { slots, outer, centerDx };
}

// The facing a formation keeps: the leader's walking direction once it has held for a moment (a swing backwards in a fight
// does not send the whole squad round him).
function formationFacing(leader, dt) {
  const st = leader._formFace ?? (leader._formFace = { dir: leader.facing || 1, want: leader.facing || 1, t: 0 });
  const vx = leader.vx ?? 0; const want = Math.abs(vx) > 20 ? Math.sign(vx) : st.want;
  if (want !== st.want) { st.want = want; st.t = 0; } else st.t += dt;
  if (st.want !== st.dir && st.t >= FORMATION.turnHold) st.dir = st.want;
  return st.dir;
}

// Every frame: each squad (grouped by its leader) gets a slot per live unit — unit.formationTarget = { x, z } (entities.js
// walks there while it has no foe). The player's squad uses the formation chosen in a castle's antechamber; bot squads
// lead from the front.
export function updateFormations(game, dt, { isOwnSquad, isSquad, kindFor }) {
  const byLeader = new Map();
  for (const m of game.minions) {
    if (!m.isKKUnit || m.isDead || !isSquad(m.rec)) { if (m.formationTarget) m.formationTarget = null; continue; }
    const L = m.followLeader; if (!L) continue; if (!byLeader.has(L)) byLeader.set(L, []); byLeader.get(L).push(m);
  }
  for (const [L, units] of byLeader) {
    const kind = isOwnSquad(units[0].rec) ? kindFor() : 'front'; const facing = formationFacing(L, dt);
    const { slots, centerDx } = formationSlots(kind, units.map((u) => u.rec), facing);
    for (const u of units) { const s = slots.get(u.rec); if (!s) continue; const x = L.x + centerDx + s.dx; const z = clampZ((L.z ?? 0) + s.dy / 150); u.formationTarget = { x, z, kind }; }
  }
}
