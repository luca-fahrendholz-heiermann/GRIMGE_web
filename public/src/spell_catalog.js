// GRIMGE Prototype — data-driven spell catalog.
//
// Every castable ability is an AbilityDefinition (concept doc §7.2). The
// mechanical class (`deliveryType`) and interaction tags are independent of
// the VFX, so e.g. every beam shares one BeamSpell controller while drawing
// its own fire / ice / lightning / void look.
//
// Recipes are explicit and order independent: the key is the sorted rune id
// list joined with '+'. There is no generative fallback — an unknown
// combination simply has no recipe (a failed fusion is resolved by the slot
// rules in main.js, never by inventing a random spell).

export const DELIVERY = Object.freeze({
  PROJECTILE: 'projectile', SALVO: 'salvo', HOMING: 'homing', BEAM: 'beam', CONE: 'cone', BURROW: 'burrow',
  AREA: 'area', ZONE: 'zone', WALL: 'wall', TELEKINESIS: 'telekinesis',
  CAPTURE: 'capture', SLAM: 'slam', STOMP: 'stomp', SUMMON: 'summon',
  DASH: 'dash', HEAVY_OBJECT: 'heavy_object', SELF: 'self'
});

// How a prepared spell is aimed after its slot is triggered (concept doc
// §7.2 targetingMode). The same rules serve touch, mouse/keyboard and
// gamepad: DIRECTION fires at once (aim = facing / drag / cursor side),
// GROUND asks for an impact point, PLACEMENT for a swiped line (walls),
// ALLY for a friendly unit (player, minion, companion, summon), AIM for a
// free direction including depth (shown as a cone), DUAL for two points
// (Frost Mirror Gate), SELF never asks.
export const TARGETING = Object.freeze({ DIRECTION: 'direction', GROUND: 'ground', PLACEMENT: 'placement', ALLY: 'ally', AIM: 'aim', DUAL: 'dual', SELF: 'self' });
const TARGETING_BY_SPELL = Object.freeze({
  meteor_cataclysm: TARGETING.GROUND, magma_fissure: TARGETING.GROUND, gravity_lift: TARGETING.GROUND,
  void_implosion: TARGETING.GROUND, firestorm: TARGETING.GROUND,
  stone_wall: TARGETING.PLACEMENT, construct_bulwark: TARGETING.PLACEMENT,
  arcane_aegis: TARGETING.ALLY,
  frost_nova: TARGETING.SELF, aura_shock: TARGETING.SELF, eidolon_mantle: TARGETING.SELF, ninefold_beast_form: TARGETING.SELF,
  sandstorm_bastion: TARGETING.SELF, mirror_ward: TARGETING.SELF, burrow_strike: TARGETING.SELF,
  shadow_stomper: TARGETING.AIM, mirror_gate: TARGETING.DUAL, halo_pulse: TARGETING.SELF, shadow_doppelganger: TARGETING.SELF, revenant_call: TARGETING.SELF,
  solar_orb: TARGETING.SELF, lunar_orb: TARGETING.SELF, eclipse: TARGETING.SELF, thunderhead: TARGETING.SELF,
  blood_moon: TARGETING.SELF, starfall: TARGETING.SELF, aurora_veil: TARGETING.SELF
});
export const TARGET_RANGE = Object.freeze({ ground: 460, placement: 300, ally: 380, aim: 320, dual: 900 });
// Shadow Stomper: the reach and half-angle of its search cone.
export const SHADOW_STOMP = Object.freeze({ range: 320, halfAngle: .62 });

// Mana is paid (bound) when a rune is drawn into a slot, never again at cast.
// Values are first playtest numbers (concept doc §11 keeps them open).
export const RUNE_MANA_COSTS = Object.freeze({
  ignis: 10, ventus: 10, fulgur: 12, terra: 10, aqua: 10,
  bestia: 18, construct: 16, void: 16, lux: 12, umbra: 12,
  // Solo special runes: one hard glyph, a full spell on its own, never fused.
  doppel: 22, mortis: 26,
  // Transformation runes are granted by an active transformation.
  transform_beam: 0, transform_implode: 0, transform_rampage: 0
});

export function runeManaCost(runeOrId) {
  const id = typeof runeOrId === 'string' ? runeOrId : runeOrId?.id;
  return RUNE_MANA_COSTS[id] ?? 10;
}

const def = (id, fields) => Object.freeze({ id, tier: 1, interactionTags: Object.freeze([]), targetingMode: TARGETING_BY_SPELL[id] ?? TARGETING.DIRECTION, ...fields });

export const SPELL_DEFINITIONS = Object.freeze({
  // ── Fundamental (one rune) ─────────────────────────────────────────────
  fireball: def('fireball', { name: 'IGNIS FIREBALL', color: '#ff5722', deliveryType: DELIVERY.PROJECTILE, interactionTags: ['reflectable', 'capturable', 'blockable'], desc: 'Explosive projectile burning enemies.' }),
  gale_blast: def('gale_blast', { name: 'GALE SHOCKWAVE', color: '#00bcd4', deliveryType: DELIVERY.AREA, desc: 'High-velocity wind wave knocking enemies back.' }),
  chain_lightning: def('chain_lightning', { name: 'ARC LIGHTNING', color: '#ffeb3b', deliveryType: DELIVERY.AREA, desc: 'Crackling bolt leaping between targets.' }),
  stone_spikes: def('stone_spikes', { name: 'STONE SPIKES', color: '#795548', deliveryType: DELIVERY.AREA, desc: 'Erupts jagged stone spikes from the ground.' }),
  frost_nova: def('frost_nova', { name: 'FROST NOVA', color: '#00e5ff', deliveryType: DELIVERY.AREA, desc: 'Freezes surrounding foes solid.' }),
  summon_lesser_beast: def('summon_lesser_beast', { name: 'BEAST FAMILIAR', manaCost: 18, color: '#b388ff', deliveryType: DELIVERY.SUMMON, desc: 'Summons a short-lived hunter familiar.' }),
  construct_bulwark: def('construct_bulwark', { name: 'CONSTRUCT BULWARK', manaCost: 16, color: '#b0bec5', deliveryType: DELIVERY.WALL, desc: 'Raises a short physical barrier in front of the caster.' }),
  void_bolt: def('void_bolt', { name: 'VOID BOLT', manaCost: 16, color: '#d500f9', deliveryType: DELIVERY.PROJECTILE, interactionTags: ['reflectable', 'capturable', 'blockable'], desc: 'Fires a void projectile that slows the first target hit.' }),
  halo_pulse: def('halo_pulse', { name: 'HALO PULSE', color: '#ffe082', deliveryType: DELIVERY.AREA, desc: 'A ring of sunlight: heals you and nearby allies, sears and dazzles nearby enemies.' }),
  shadow_step: def('shadow_step', { name: 'SHADOW STEP', color: '#7e57c2', deliveryType: DELIVERY.DASH, desc: 'Sink into your shadow and rise behind the nearest enemy ahead and strike it from its shadow.' }),

  // ── Solo special runes: hard glyph, no combination needed ─────────────
  shadow_doppelganger: def('shadow_doppelganger', { name: 'SHADOW DOPPELGANGER', tier: 2, manaCost: 22, color: '#5e35b1', deliveryType: DELIVERY.SUMMON, isSpecial: true, desc: 'Your shadow rises as a weaker double with its own health and fights beside you. Casting again replaces the oldest double (Shadow passives keep more at once).' }),
  revenant_call: def('revenant_call', { name: 'REVENANT CALL', tier: 2, manaCost: 26, color: '#9ccc65', deliveryType: DELIVERY.SUMMON, isSpecial: true, desc: 'A forbidden seal raises the nearest fallen fighter as a bound revenant; when its borrowed body breaks it bursts. Casting again replaces the oldest revenant.' }),

  // ── Special (transformation) runes: standalone, never fusable ─────────
  annihilation_beam: def('annihilation_beam', { name: 'ANNIHILATION BEAM', tier: 3, manaCost: 0, color: '#ff4cff', deliveryType: DELIVERY.BEAM, interactionTags: ['clashable', 'blockable'], beamProfile: 'annihilation', isSpecial: true, desc: 'Charges a massive energy sphere then fires a devastating beam across half the lane.' }),
  void_implosion: def('void_implosion', { name: 'VOID IMPLOSION', tier: 3, manaCost: 0, color: '#b668ff', deliveryType: DELIVERY.ZONE, isSpecial: true, desc: 'Creates a void singularity that pulls enemies in and crushes them with dimensional collapse.' }),
  inferno_rampage: def('inferno_rampage', { name: 'INFERNO RAMPAGE', tier: 3, manaCost: 0, color: '#ff6f3b', deliveryType: DELIVERY.DASH, isSpecial: true, desc: 'Blazing fire dash that scorches everything in its path across the lane.' }),

  // ── Compound (two runes) ───────────────────────────────────────────────
  summon_storm_wolf: def('summon_storm_wolf', { name: 'STORM WOLF', tier: 2, manaCost: 26, color: '#ffd54f', deliveryType: DELIVERY.SUMMON, desc: 'A lightning Hunter that bypasses the minion line to chase the Wizard.' }),
  summon_void_spider: def('summon_void_spider', { name: 'VOID SPIDER', tier: 2, manaCost: 34, color: '#d500f9', deliveryType: DELIVERY.SUMMON, desc: 'A Control summon that entangles nearby enemies in slowing void webs.' }),
  summon_rune_golem: def('summon_rune_golem', { name: 'RUNE GOLEM', tier: 2, manaCost: 38, color: '#b0bec5', deliveryType: DELIVERY.SUMMON, desc: 'A durable Vanguard that binds defenders and marches on objectives.' }),
  firestorm: def('firestorm', { name: 'FIRESTORM VORTEX', tier: 2, color: '#ff6d00', deliveryType: DELIVERY.ZONE, desc: 'Raging flame tornado that pulls enemies in, burns, and launches them!' }),
  meteor_cataclysm: def('meteor_cataclysm', { name: 'METEOR CATACLYSM', tier: 2, color: '#d50000', deliveryType: DELIVERY.HEAVY_OBJECT, interactionTags: ['beamDamageable'], desc: 'Calls down a blazing meteor that creates an explosive magma crater! A strong beam can shatter it mid-fall.' }),
  tempest_blitz: def('tempest_blitz', { name: 'TEMPEST BLITZ', tier: 2, color: '#00e5ff', deliveryType: DELIVERY.DASH, desc: 'Transforms into lightning, dashing forward and slashing all enemies!' }),
  magma_fissure: def('magma_fissure', { name: 'MAGMA FISSURE', tier: 2, color: '#ff3d00', deliveryType: DELIVERY.ZONE, desc: 'Ruptures the earth with geysers of molten lava!' }),
  sandstorm_bastion: def('sandstorm_bastion', { name: 'SANDSTORM BASTION', tier: 2, color: '#ffd600', deliveryType: DELIVERY.SELF, desc: 'Swirling wall of stone and wind deflecting enemy attacks.' }),
  blizzard_surge: def('blizzard_surge', { name: 'BLIZZARD SURGE', tier: 2, color: '#80d8ff', deliveryType: DELIVERY.ZONE, desc: 'Freezing gale freezing minions and drastically slowing enemy lane push.' }),
  aura_shock: def('aura_shock', { name: 'AURA SHOCK', tier: 2, manaCost: 20, cooldown: 3.5, color: '#b388ff', deliveryType: DELIVERY.AREA, desc: 'Frost-lightning pulse blasting surrounding enemies away.' }),
  arcane_aegis: def('arcane_aegis', { name: 'ARCANE AEGIS', tier: 2, manaCost: 30, cooldown: 8, color: '#b388ff', deliveryType: DELIVERY.SELF, desc: 'A temporary protective aura that absorbs incoming damage.' }),
  stone_wall: def('stone_wall', { name: 'STONE WALL', tier: 2, manaCost: 25, color: '#8d6e63', deliveryType: DELIVERY.WALL, desc: 'Raises a temporary earth wall that stops hostile movement and projectiles.' }),
  // New beams: one mechanical class, four looks (concept doc §5).
  inferno_beam: def('inferno_beam', { name: 'INFERNO BEAM', tier: 2, color: '#ff6d00', deliveryType: DELIVERY.BEAM, interactionTags: ['clashable', 'blockable'], beamProfile: 'inferno', desc: 'A sustained straight fire beam. Meets an enemy beam tip-to-tip for a Beam Clash.' }),
  glacial_ray: def('glacial_ray', { name: 'GLACIAL RAY', tier: 2, color: '#80deea', deliveryType: DELIVERY.BEAM, interactionTags: ['clashable', 'blockable'], beamProfile: 'glacial', desc: 'A freezing ray that slows everything it touches. Clashable.' }),
  thunder_lance: def('thunder_lance', { name: 'THUNDER LANCE', tier: 2, color: '#ffeb3b', deliveryType: DELIVERY.BEAM, interactionTags: ['clashable', 'blockable'], beamProfile: 'thunder', desc: 'A very fast, short-lived lightning beam. Clashable.' }),
  null_ray: def('null_ray', { name: 'NULL RAY', tier: 2, color: '#d500f9', deliveryType: DELIVERY.BEAM, interactionTags: ['clashable', 'blockable'], beamProfile: 'null', desc: 'A void beam that drags its targets toward the caster. Clashable.' }),
  // New ability archetypes (concept doc §7 / Phase 5).
  mirror_ward: def('mirror_ward', { name: 'MIRROR WARD', tier: 2, color: '#b2ebf2', deliveryType: DELIVERY.CAPTURE, desc: 'A ward that captures up to five hostile projectiles, then fires them back as a volley.' }),
  gravity_lift: def('gravity_lift', { name: 'GRAVITY LIFT', tier: 2, color: '#ce93d8', deliveryType: DELIVERY.TELEKINESIS, desc: 'Telekinesis: lifts up to four nearby enemies, holds them in the air, then slams them down.' }),
  seismic_slam: def('seismic_slam', { name: 'SEISMIC SLAM', tier: 2, color: '#a1887f', deliveryType: DELIVERY.SLAM, desc: 'A travelling ground shockwave that launches enemies and leaves short-lived rock pillars.' }),
  titan_stomp: def('titan_stomp', { name: 'TITAN STOMP', tier: 2, color: '#8d6e63', deliveryType: DELIVERY.STOMP, desc: 'Leap up and crash down: hits grounded and airborne enemies around the landing point.' }),
  dragon_breath: def('dragon_breath', { name: 'DRAGON BREATH', tier: 2, color: '#ff8f00', deliveryType: DELIVERY.CONE, interactionTags: ['blockable'], desc: 'A wide cone of chunky flame that widens with distance and burns everything inside.' }),
  burrow_strike: def('burrow_strike', { name: 'BURROW STRIKE', tier: 2, color: '#a1887f', deliveryType: DELIVERY.BURROW, desc: 'Dig underground: untouchable and fast for a moment, then erupt and launch everything around you.' }),
  // Light & shadow (concept: sun / moon runes).
  shadow_stomper: def('shadow_stomper', { name: 'SHADOW STOMPER', tier: 2, color: '#7e57c2', deliveryType: DELIVERY.STOMP, desc: 'Aim, then stomp: your shadow races to the nearest enemy in that cone and holds its shadow — the target cannot move. Guarding targets slip free.' }),
  radiant_lance: def('radiant_lance', { name: 'RADIANT LANCE', tier: 2, color: '#ffe082', deliveryType: DELIVERY.BEAM, interactionTags: ['clashable', 'blockable'], beamProfile: 'radiant', desc: 'A blinding beam of light that dazzles what it touches. Clashable.' }),
  // Sky spheres: one field rules the sky at a time (a new one replaces it).
  solar_orb: def('solar_orb', { name: 'SOLAR ORB', tier: 2, manaCost: 24, color: '#ffca28', deliveryType: DELIVERY.SELF, isSkyField: true, desc: 'Summons a sun: bright light, short shadows. Fire and light grow stronger, ice melts fast, shadow magic weakens.' }),
  lunar_orb: def('lunar_orb', { name: 'LUNAR ORB', tier: 2, manaCost: 24, color: '#b3c7ff', deliveryType: DELIVERY.SELF, isSkyField: true, desc: 'Summons a moon: long shadows and a rising tide. Water, ice and shadow grow stronger, puddles slow and conduct harder, fire weakens.' }),
  eclipse: def('eclipse', { name: 'ECLIPSE', tier: 2, manaCost: 28, color: '#ffd54f', deliveryType: DELIVERY.SELF, isSkyField: true, desc: 'Sun and moon meet: light and shadow magic surge, every other element dims, shadows grow huge.' }),
  thunderhead: def('thunderhead', { name: 'THUNDERHEAD', tier: 2, manaCost: 26, color: '#90a4ae', deliveryType: DELIVERY.SELF, isSkyField: true, desc: 'A black storm cloud strikes your enemies and their puddles with lightning. Fire burns out quickly.' }),
  blood_moon: def('blood_moon', { name: 'BLOOD MOON', tier: 2, manaCost: 26, color: '#e53935', deliveryType: DELIVERY.SELF, isSkyField: true, desc: 'A red moon: all spells hit harder, healing is halved, shadows turn red. Your doubles and revenants grow savage.' }),
  starfall: def('starfall', { name: 'STARFALL', tier: 2, manaCost: 26, color: '#e1f5fe', deliveryType: DELIVERY.SELF, isSkyField: true, desc: 'A night sky of falling stars that rain down on your enemies.' }),
  aurora_veil: def('aurora_veil', { name: 'AURORA VEIL', tier: 2, manaCost: 24, color: '#69f0ae', deliveryType: DELIVERY.SELF, isSkyField: true, desc: 'Northern lights: your side slowly regenerates health and mana, ice grows stronger.' }),
  mirror_gate: def('mirror_gate', { name: 'FROST MIRROR GATE', tier: 2, color: '#80deea', deliveryType: DELIVERY.ZONE, desc: 'Set two points: an ice mirror rises at each. Step into one to come out of the other — an escape route back to the entrance of a long Dungeon room, or a sudden flank.' }),
  soul_seekers: def('soul_seekers', { name: 'SOUL SEEKERS', tier: 2, color: '#ea80fc', deliveryType: DELIVERY.HOMING, interactionTags: ['reflectable', 'capturable', 'blockable'], desc: 'A salvo of three homing void flames that steer toward enemies within a turn limit.' }),

  // ── Advanced (three runes) ─────────────────────────────────────────────
  eidolon_mantle: def('eidolon_mantle', { name: 'EIDOLON MANTLE', tier: 3, manaCost: 45, cooldown: 18, color: '#b668ff', deliveryType: DELIVERY.SELF, desc: 'Bestia, Earth and Void form a temporary spectral guardian around the Wizard: damage resistance, knockback resistance and empowered melee.' }),
  // An original GRIMGE feral transformation: its nine rune-flame tails
  // evoke a legendary beast without borrowing a named character or form.
  ninefold_beast_form: def('ninefold_beast_form', { name: 'NINEFOLD BEAST FORM', tier: 3, manaCost: 55, cooldown: 22, color: '#ff7a2f', deliveryType: DELIVERY.SELF, desc: 'Bestia, Fire and Void awaken a short feral rune form: faster movement, savage melee and light damage resistance.' }),
  dragon_invocation: def('dragon_invocation', { name: 'DRAGON INVOCATION', tier: 3, manaCost: 70, color: '#ff7043', deliveryType: DELIVERY.AREA, desc: 'Calls a temporary fire dragon to scorch a battlefield zone.' }),
  summon_rune_snake: def('summon_rune_snake', { name: 'WORLD RUNE SERPENT', tier: 3, manaCost: 48, color: '#b668ff', deliveryType: DELIVERY.SUMMON, desc: 'A mountable lane-control serpent that slithers through the fight and launches enemies upward.' }),
  summon_spirit_wolf: def('summon_spirit_wolf', { name: 'SPIRIT WOLF', tier: 3, manaCost: 32, color: '#80d8ff', deliveryType: DELIVERY.SUMMON, desc: 'Summons a quick frost spirit that hunts nearby enemies.' }),
  summon_siege_golem: def('summon_siege_golem', { name: 'SIEGE GOLEM', tier: 3, manaCost: 46, color: '#a1887f', deliveryType: DELIVERY.SUMMON, desc: 'Summons a slow, durable golem that presses objectives.' }),
  apocalyptic_heavensurge: def('apocalyptic_heavensurge', { name: 'APOCALYPTIC HEAVENSURGE', tier: 3, color: '#ff3d00', deliveryType: DELIVERY.AREA, desc: 'Cataclysmic storm of Fire, Wind, and Thunder engulfing the battlefield!' })
});

// Sorted rune-id key → spell id.
export const SPELL_RECIPES = Object.freeze({
  ignis: 'fireball', ventus: 'gale_blast', fulgur: 'chain_lightning', terra: 'stone_spikes',
  aqua: 'frost_nova', bestia: 'summon_lesser_beast', construct: 'construct_bulwark', void: 'void_bolt',
  lux: 'halo_pulse', umbra: 'shadow_step', doppel: 'shadow_doppelganger', mortis: 'revenant_call',
  transform_beam: 'annihilation_beam', transform_implode: 'void_implosion', transform_rampage: 'inferno_rampage',

  'bestia+fulgur': 'summon_storm_wolf', 'bestia+void': 'summon_void_spider', 'construct+terra': 'summon_rune_golem',
  'ignis+ventus': 'firestorm', 'fulgur+ignis': 'meteor_cataclysm', 'fulgur+ventus': 'tempest_blitz',
  'ignis+terra': 'magma_fissure', 'terra+ventus': 'sandstorm_bastion', 'aqua+ventus': 'blizzard_surge',
  'aqua+fulgur': 'aura_shock', 'aqua+terra': 'arcane_aegis', 'terra+terra': 'stone_wall',
  'ignis+ignis': 'inferno_beam', 'aqua+aqua': 'glacial_ray', 'fulgur+fulgur': 'thunder_lance', 'void+void': 'null_ray',
  'construct+ventus': 'mirror_ward', 'ventus+void': 'gravity_lift', 'fulgur+terra': 'seismic_slam',
  'bestia+terra': 'titan_stomp', 'ignis+void': 'soul_seekers',
  'bestia+ignis': 'dragon_breath', 'terra+void': 'burrow_strike',
  'aqua+void': 'mirror_gate', 'terra+umbra': 'shadow_stomper', 'lux+lux': 'radiant_lance',
  'ignis+lux': 'solar_orb', 'aqua+umbra': 'lunar_orb', 'lux+umbra': 'eclipse', 'fulgur+umbra': 'thunderhead',
  'ignis+umbra': 'blood_moon', 'lux+ventus': 'starfall', 'aqua+lux': 'aurora_veil',

  'bestia+terra+void': 'eidolon_mantle', 'bestia+ignis+void': 'ninefold_beast_form',
  'bestia+ignis+ventus': 'dragon_invocation', 'bestia+terra+ventus': 'summon_rune_snake',
  'aqua+terra+ventus': 'summon_spirit_wolf', 'fulgur+terra+terra': 'summon_siege_golem',
  'fulgur+ignis+terra': 'dragon_invocation', 'fulgur+ignis+ventus': 'apocalyptic_heavensurge'
});

// Recipe-specific display overrides (same mechanics, different name).
const RECIPE_NAMES = Object.freeze({ 'bestia+ignis+ventus': 'INFERNO DRAGON INVOCATION' });

export function recipeKey(runes) {
  return runes.map((rune) => (typeof rune === 'string' ? rune : rune.id)).sort().join('+');
}

export function lookupRecipe(runes) {
  if (!runes?.length) return null;
  const key = recipeKey(runes);
  const spellId = SPELL_RECIPES[key];
  if (!spellId) return null;
  const definition = SPELL_DEFINITIONS[spellId];
  return RECIPE_NAMES[key] ? { ...definition, name: RECIPE_NAMES[key] } : { ...definition };
}

// Solo special runes are ordinary deck cards with a harder glyph; like the
// transformation runes they are a complete spell and never fuse.
export const SOLO_RUNES = Object.freeze(['doppel', 'mortis']);

export function isSpecialRune(rune) {
  const id = String(typeof rune === 'string' ? rune : rune?.id);
  return id.startsWith('transform_') || SOLO_RUNES.includes(id);
}

// The runes a spell is made of (first recipe that forms it). Sky fields use
// this to strengthen or weaken whole elements.
const SPELL_RUNES = (() => {
  const map = {};
  for (const [key, spellId] of Object.entries(SPELL_RECIPES)) if (!map[spellId]) map[spellId] = Object.freeze(key.split('+'));
  return Object.freeze(map);
})();
export function spellRunes(spellId) { return SPELL_RUNES[spellId] ?? []; }
