// GRIMGE Prototype — all signature special runes: the 95 generated ones (signature_runes_data.js, produced by
// tools/generate_signature_runes.mjs from the design atlas — not edited by hand) plus the hand-written cinematic ones
// (cinematic_spells_data.js). Everything that lists signature runes imports this, so a regenerated atlas file cannot
// drop the cinematic spells.
import { SIGNATURE_RUNE_DATA as GENERATED } from './signature_runes_data.js';
import { CINEMATIC_RUNE_DATA, CINEMATIC_ARENA_COST } from './cinematic_spells_data.js';

export const SIGNATURE_RUNE_DATA = Object.freeze([...GENERATED, ...CINEMATIC_RUNE_DATA.map((d) => ({ ...d, arenaCost: CINEMATIC_ARENA_COST }))]);
