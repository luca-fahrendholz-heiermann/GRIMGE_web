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

import { BUFF_FORM_DATA } from './buff_forms_data.js';
import { SIGNATURE_RUNE_DATA } from './signature_runes_data.js';

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
  bestia: 18, construct: 16, void: 16, lux: 12, umbra: 12, natura: 12,
  // Solo special runes: one hard glyph, a full spell on its own, never fused.
  doppel: 22, mortis: 26,
  // Arcane State special runes (max. one per deck) share one cost.
  // Transformation runes are granted by an active transformation.
  transform_beam: 0, transform_implode: 0, transform_rampage: 0
});

export const BUFF_RUNE_MANA = 30;
// Signature specials bind their own mana (atlas suggestion 28–46).
const SIGNATURE_MANA = Object.freeze(Object.fromEntries(SIGNATURE_RUNE_DATA.map((d) => ['sig_' + d.id, d.mana])));
export function runeManaCost(runeOrId) {
  const id = typeof runeOrId === 'string' ? runeOrId : runeOrId?.id;
  if (String(id).startsWith('buff_')) return BUFF_RUNE_MANA;
  if (SIGNATURE_MANA[id]) return SIGNATURE_MANA[id];
  return RUNE_MANA_COSTS[id] ?? 10;
}

const def = (id, fields) => Object.freeze({ id, tier: 1, interactionTags: Object.freeze([]), targetingMode: TARGETING_BY_SPELL[id] ?? TARGETING.DIRECTION, ...fields });

const SPELL_DEFINITIONS_EXT = {
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
  // Former transformation runes, now 3-rune combinations (Bestia + Terra / Ignis + Void).
  void_implosion: def('void_implosion', { name: 'VOID IMPLOSION', tier: 3, color: '#b668ff', deliveryType: DELIVERY.ZONE, desc: 'Creates a void singularity that pulls enemies in and crushes them with dimensional collapse.' }),
  inferno_rampage: def('inferno_rampage', { name: 'INFERNO RAMPAGE', tier: 3, color: '#ff6f3b', deliveryType: DELIVERY.DASH, desc: 'Blazing fire dash that scorches everything in its path across the lane.' }),

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

  // NATURA (nature) and heal circles, persistent growth (nature_spells.js).
  heal_bloom: def('heal_bloom', { name: 'HEILBLÜTE', color: '#9be36a', deliveryType: DELIVERY.SELF, targetingMode: TARGETING.SELF, desc: 'A magic circle of blossoms at your feet heals you and nearby allies over 3 s and washes slows away.' }),
  great_bloom: def('great_bloom', { name: 'GROSSE BLÜTE', tier: 2, color: '#b2ff59', deliveryType: DELIVERY.SELF, targetingMode: TARGETING.SELF, desc: 'A wide blossom circle: strong healing over 4 s and a light shield for every ally inside.' }),
  healing_spring: def('healing_spring', { name: 'HEILQUELLE', tier: 2, color: '#81d4fa', deliveryType: DELIVERY.ZONE, targetingMode: TARGETING.SELF, desc: 'A spring wells up: allies standing in it heal and regain mana for 6 s.' }),
  blessing_circle: def('blessing_circle', { name: 'SEGENSKREIS', tier: 2, color: '#ffe082', deliveryType: DELIVERY.SELF, targetingMode: TARGETING.SELF, desc: 'A golden circle: allies inside heal at once and take 25 % less damage for 5 s.' }),
  thorn_growth: def('thorn_growth', { name: 'DORNENWUCHS', tier: 2, color: '#8d6e63', deliveryType: DELIVERY.AREA, desc: 'Brambles burst out along the ground ahead: they root whoever they catch and stay as a thorny hazard for 6 s.' }),
  poison_swamp: def('poison_swamp', { name: 'GIFTSUMPF', tier: 2, color: '#7cb342', deliveryType: DELIVERY.ZONE, targetingMode: TARGETING.GROUND, desc: 'A poisonous swamp at the target point slows and poisons foes for 7 s.' }),
  pollen_storm: def('pollen_storm', { name: 'POLLENSTURM', tier: 2, color: '#f0f4c3', deliveryType: DELIVERY.CONE, desc: 'A cone of drifting spores puts foes to sleep for a moment and slows them.' }),
  wildfire_seeds: def('wildfire_seeds', { name: 'FLAMMENSAMEN', tier: 2, color: '#ff7043', deliveryType: DELIVERY.AREA, desc: 'Four seeds are planted ahead; after a moment each bursts into fire and scorches the ground.' }),
  world_tree: def('world_tree', { name: 'WELTENBAUM', tier: 3, color: '#7ddc5a', deliveryType: DELIVERY.ZONE, targetingMode: TARGETING.GROUND, desc: 'A giant tree grows and stays until it is cut down (or 25 s): it heals allies around it, swallows hostile projectiles, and its branches are platforms to stand on.' }),
  // Weapon infusions (CONSTRUCT = the weapon rune + an element).
  flame_edge: def('flame_edge', { name: 'FLAMMENKLINGE', tier: 2, color: '#ff7043', deliveryType: DELIVERY.SELF, targetingMode: TARGETING.SELF, desc: 'Your weapon (or fists) burns for 12 s: melee hits set foes on fire.' }),
  frost_edge: def('frost_edge', { name: 'FROSTKLINGE', tier: 2, color: '#80deea', deliveryType: DELIVERY.SELF, targetingMode: TARGETING.SELF, desc: 'Frost weapon for 12 s: hits slow, every third hit freezes.' }),
  storm_edge: def('storm_edge', { name: 'STURMKLINGE', tier: 2, color: '#ffee58', deliveryType: DELIVERY.SELF, targetingMode: TARGETING.SELF, desc: 'Storm weapon for 12 s: hits shock and a spark jumps to a second foe.' }),
  venom_edge: def('venom_edge', { name: 'GIFTKLINGE', tier: 2, color: '#9ccc65', deliveryType: DELIVERY.SELF, targetingMode: TARGETING.SELF, desc: 'Venom weapon for 12 s: hits poison foes for 4 s.' }),
  blood_edge: def('blood_edge', { name: 'BLUTKLINGE', tier: 2, color: '#e53935', deliveryType: DELIVERY.SELF, targetingMode: TARGETING.SELF, desc: 'Blood weapon for 12 s: every melee hit heals you for a fifth of its damage.' }),
  rending_edge: def('rending_edge', { name: 'REISSKLINGE', tier: 2, color: '#d84315', deliveryType: DELIVERY.SELF, targetingMode: TARGETING.SELF, desc: 'Rending weapon for 12 s: hits make foes bleed for 3 s.' }),

  // ── Advanced (three runes) ─────────────────────────────────────────────
  // Engines of the buff runes B02 / B01 (formerly 3-rune recipes).
  eidolon_mantle: def('eidolon_mantle', { name: 'ARKENGESTELL', tier: 3, manaCost: 45, cooldown: 18, color: '#8e67f0', deliveryType: DELIVERY.SELF, desc: 'An open arcane force frame around the Wizard: damage resistance, knockback resistance and empowered melee.' }),
  // An original GRIMGE feral transformation: its nine rune-flame tails
  // evoke a legendary beast without borrowing a named character or form.
  ninefold_beast_form: def('ninefold_beast_form', { name: 'RISSWILD', tier: 3, manaCost: 55, cooldown: 22, color: '#f29b35', deliveryType: DELIVERY.SELF, desc: 'Three cracked molten energy bands: faster movement, savage melee and light damage resistance.' }),
  dragon_invocation: def('dragon_invocation', { name: 'DRAGON INVOCATION', tier: 3, manaCost: 70, color: '#ff7043', deliveryType: DELIVERY.AREA, desc: 'Calls a temporary fire dragon to scorch a battlefield zone.' }),
  summon_rune_snake: def('summon_rune_snake', { name: 'WORLD RUNE SERPENT', tier: 3, manaCost: 48, color: '#b668ff', deliveryType: DELIVERY.SUMMON, desc: 'A mountable lane-control serpent that slithers through the fight and launches enemies upward.' }),
  summon_spirit_wolf: def('summon_spirit_wolf', { name: 'SPIRIT WOLF', tier: 3, manaCost: 32, color: '#80d8ff', deliveryType: DELIVERY.SUMMON, desc: 'Summons a quick frost spirit that hunts nearby enemies.' }),
  summon_siege_golem: def('summon_siege_golem', { name: 'SIEGE GOLEM', tier: 3, manaCost: 46, color: '#a1887f', deliveryType: DELIVERY.SUMMON, desc: 'Summons a slow, durable golem that presses objectives.' }),
  apocalyptic_heavensurge: def('apocalyptic_heavensurge', { name: 'APOCALYPTIC HEAVENSURGE', tier: 3, color: '#ff3d00', deliveryType: DELIVERY.AREA, desc: 'Cataclysmic storm of Fire, Wind, and Thunder engulfing the battlefield!' })
};

// Sorted rune-id key → spell id.
const SPELL_RECIPES_EXT = {
  ignis: 'fireball', ventus: 'gale_blast', fulgur: 'chain_lightning', terra: 'stone_spikes',
  aqua: 'frost_nova', bestia: 'summon_lesser_beast', construct: 'construct_bulwark', void: 'void_bolt',
  lux: 'halo_pulse', umbra: 'shadow_step', doppel: 'shadow_doppelganger', mortis: 'revenant_call',
  transform_beam: 'annihilation_beam',

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
  natura: 'heal_bloom', 'natura+natura': 'great_bloom', 'aqua+natura': 'healing_spring', 'lux+natura': 'blessing_circle',
  'natura+terra': 'thorn_growth', 'natura+umbra': 'poison_swamp', 'natura+ventus': 'pollen_storm', 'ignis+natura': 'wildfire_seeds',
  'construct+ignis': 'flame_edge', 'aqua+construct': 'frost_edge', 'construct+fulgur': 'storm_edge', 'construct+natura': 'venom_edge', 'construct+umbra': 'blood_edge', 'bestia+construct': 'rending_edge',

  'bestia+terra+void': 'void_implosion', 'bestia+ignis+void': 'inferno_rampage',
  'bestia+ignis+ventus': 'dragon_invocation', 'bestia+terra+ventus': 'summon_rune_snake',
  'aqua+terra+ventus': 'summon_spirit_wolf', 'fulgur+terra+terra': 'summon_siege_golem',
  'fulgur+ignis+terra': 'dragon_invocation', 'fulgur+ignis+ventus': 'apocalyptic_heavensurge',
  'aqua+natura+terra': 'world_tree'
};

// Arcane States (atlas buff transformations B01, B02, T01–T40): one special rune each.
// Every buff rune is drawn with the same hourglass sigil — only one can be
// in a deck, so the sigil always resolves to that deck's buff.
export const BUFF_SPELL_IDS = Object.freeze(BUFF_FORM_DATA.map((form) => 'buff_' + form.id));
for (const form of BUFF_FORM_DATA) {
  const id = 'buff_' + form.id;
  SPELL_DEFINITIONS_EXT[id] = def(id, {
    name: form.name.toUpperCase(), tier: 3, manaCost: 30, color: form.palette?.[1] ?? '#ffd27a',
    deliveryType: DELIVERY.SELF, targetingMode: TARGETING.SELF, isSpecial: true, isBuffForm: true, buffFormId: form.id,
    tags: Object.freeze(['arcane-state', 'max-1-per-deck']),
    desc: `Arcane State (max. 1 per deck): ${form.silhouette}`
  });
  SPELL_RECIPES_EXT[id] = id;
}

// Signature specials (research atlas S01–S36): special runes with their own
// complex glyph, no combination, once per deck — NOT Arcane States. Their
// mechanics live in signature_abilities_*.js (cast via signature_runes.js).
const SIGNATURE_DELIVERY = { self: DELIVERY.SELF, ground: DELIVERY.ZONE, placement: DELIVERY.ZONE, dual: DELIVERY.ZONE, aim: DELIVERY.CAPTURE, direction: DELIVERY.DASH };
export const SIGNATURE_SPELL_IDS = Object.freeze(SIGNATURE_RUNE_DATA.map((d) => 'sig_' + d.id));
for (const d of SIGNATURE_RUNE_DATA) {
  const id = 'sig_' + d.id;
  SPELL_DEFINITIONS_EXT[id] = def(id, {
    name: d.name.toUpperCase(), tier: 3, manaCost: d.mana, color: d.palette[2],
    deliveryType: SIGNATURE_DELIVERY[d.targeting] ?? DELIVERY.SELF, targetingMode: d.targeting, isSpecial: true, isSignature: true, signatureId: d.id,
    tags: Object.freeze(['signature-special', 'special-rune', 'max-1-copy']),
    desc: d.howTo
  });
  SPELL_RECIPES_EXT[id] = id;
}

export const SPELL_DEFINITIONS = Object.freeze(SPELL_DEFINITIONS_EXT);
export const SPELL_RECIPES = Object.freeze(SPELL_RECIPES_EXT);

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
  // The rune elements travel with the definition (status effects roll on them).
  const elements = key.split('+');
  return RECIPE_NAMES[key] ? { ...definition, name: RECIPE_NAMES[key], elements } : { ...definition, elements };
}

// How to cast a spell (shown when a recipe is tapped in the grimoire): the
// targeting step every spell of a mode shares, plus what to do for spells
// whose use is not obvious from their description.
const TARGETING_HOW_TO = Object.freeze({
  direction: 'Tap its slot (Z/X/C): it fires the way you face. Mouse: toward the cursor. Touch: drag the slot onto the field to aim.',
  ground: 'Tap its slot, then tap the spot where it should land (mouse: click; gamepad: right stick + A). Esc / B cancels.',
  placement: 'Tap its slot, then swipe a line on the ground — the wall is built exactly along it, in any direction. Cleaner runes give more blocks.',
  ally: 'Tap its slot, then tap the ally to protect (yourself, a minion or a summon).',
  aim: 'Tap its slot, then drag / point the direction (depth included). The cone shows the enemy it will catch; release to cast.',
  dual: 'Tap its slot, then set the first point and the second point.',
  self: 'Tap its slot: it takes effect around you at once.'
});

export const SPELL_HOW_TO = Object.freeze({
  gravity_lift: 'Up to four enemies near the chosen spot are lifted and held in the air (Telekinetic Grip: more, longer). While they hang: ATTACK FORWARD to throw them away, ATTACK WHILE HOLDING BACK to pull them to you — or wait and they are slammed into the ground.',
  mirror_ward: 'A ward appears in front of you and catches up to five enemy projectiles. After a moment it fires all of them back as a volley.',
  shadow_stomper: 'You hop and stomp; your shadow runs to the nearest enemy in the cone and holds it in place (no walking, jumping or dashing). Enemies who guard in time slip free. Walk too far away and the hold breaks.',
  titan_stomp: 'You leap up and crash down: everything around the landing point is hit — also enemies in the air.',
  seismic_slam: 'A shockwave travels along the ground in front of you, launches enemies and leaves short rock pillars that block for a moment.',
  burrow_strike: 'You dig in: untouchable and faster for a moment. Move under your enemies — you erupt automatically and launch everyone around you.',
  soul_seekers: 'Three homing flames fan out and steer toward the nearest enemies. They can be reflected, captured or blocked.',
  inferno_beam: 'A sustained fire beam. If an enemy beam meets it tip to tip, a Beam Clash starts: mash CAST to push your beam forward.',
  glacial_ray: 'A sustained freezing ray that slows what it touches. Meeting an enemy beam starts a Beam Clash: mash CAST to win it.',
  thunder_lance: 'A very fast, short lightning beam. Meeting an enemy beam starts a Beam Clash: mash CAST to win it.',
  null_ray: 'A void beam that drags its targets toward you. Meeting an enemy beam starts a Beam Clash: mash CAST to win it.',
  radiant_lance: 'A blinding light beam that slows what it touches. Meeting an enemy beam starts a Beam Clash: mash CAST to win it.',
  meteor_cataclysm: 'A meteor falls on the chosen spot and leaves a burning crater. An enemy beam can shatter it while it falls.',
  firestorm: 'A flame tornado at the chosen spot pulls enemies in, burns them and finally launches them.',
  magma_fissure: 'The ground at the chosen spot splits open with lava geysers; standing in it burns.',
  tempest_blitz: 'You become lightning and dash forward, slashing every enemy on your way.',
  sandstorm_bastion: 'A whirl of sand and stone around you deflects incoming shots for a while.',
  blizzard_surge: 'A freezing gale in front of you freezes minions and slows everything it hits.',
  aura_shock: 'A frost-lightning pulse blasts nearby enemies away from you (short cooldown).',
  arcane_aegis: 'The chosen ally gets a shield that absorbs damage for a while.',
  stone_wall: 'Raises a wall along your swipe. It blocks enemies and their projectiles until it is broken or expires; you cannot walk through it either.',
  construct_bulwark: 'A short, low wall along your swipe — quick cover against shots.',
  dragon_breath: 'A wide cone of fire in front of you that widens with distance and burns everything inside.',
  mirror_gate: 'Two ice mirrors appear at your points. Step into one to come out of the other (step off before it works again). Lasts 30 s, twice as long in the Dungeon.',
  shadow_step: 'You sink into your shadow and rise behind the nearest enemy ahead, striking it from behind.',
  halo_pulse: 'A ring of sunlight: heals you and nearby allies, sears and slows nearby enemies.',
  shadow_doppelganger: 'A shadow double of you appears and fights on its own (40 % of your health). Casting again replaces the oldest double; Shadow passives keep more at once.',
  revenant_call: 'Raises the nearest fallen fighter (soul wisp on the ground) as your revenant; without one a fallen soldier rises. It bursts when destroyed. Casting again replaces the oldest.',
  eidolon_mantle: 'A spectral guardian forms around you: you take less damage and knockback and your melee hits harder for a while.',
  ninefold_beast_form: 'A flame fox spirit surrounds you: you move faster, your melee becomes savage and you take a little less damage.',
  void_implosion: 'A void singularity at the chosen spot pulls enemies in and crushes them.',
  annihilation_beam: 'Charges a sphere, then fires a huge beam across half the lane. Wins most Beam Clashes.',
  inferno_rampage: 'A blazing dash across the lane that scorches everything on the way.',
  solar_orb: 'A sun rises for a while: fire and light grow stronger, ice and shadow weaker, shadows get short. Only one sky sphere at a time.',
  lunar_orb: 'A moon rises: water, ice and shadow grow stronger, puddles appear under enemies and slow them, fire weakens. Only one sky sphere at a time.',
  eclipse: 'Light and shadow magic surge, every other element dims. Only one sky sphere at a time.',
  thunderhead: 'A storm cloud strikes your enemies and their puddles with lightning every few seconds. Only one sky sphere at a time.',
  blood_moon: 'All spells hit harder (for everyone!), healing is halved. Only one sky sphere at a time.',
  starfall: 'Stars rain down on your enemies for a while. Only one sky sphere at a time.',
  aurora_veil: 'Your side slowly regenerates health and mana. Only one sky sphere at a time.'
});

// A buff transformation explains its whole moveset (atlas text).
function buffHowTo(definition) {
  const form = BUFF_FORM_DATA.find((f) => f.id === definition.buffFormId);
  if (!form) return definition.desc;
  const t = form.tech;
  const dir = (d, label) => (t[d] ? `${label} + HEAVY: ${t[d].short.name} (short) — ${t[d].short.text} · ${t[d].full.name} (full, hold 1.2 s) — ${t[d].full.text}` : '');
  return [
    `ARCANE STATE · MAX 1 PER DECK · lasts 16 s, stacks with the Focus transformation; your sprite stays unchanged. Its heavy techniques cost mana (short 5 / full 12) from your free mana — the same pool your runes bind.`,
    form.silhouette,
    t.sprint ? `SPRINT: ${t.sprint.name} — ${t.sprint.text}` : '',
    t.sprintHeavy ? `SPRINT + ATTACK: ${t.sprintHeavy.name} — ${t.sprintHeavy.text}` : '',
    dir('forward', 'FORWARD'), dir('up', 'UP'), dir('down', 'DOWN'),
    t.defense ? `DEFENSE: ${t.defense.name} — ${t.defense.text}` : '',
    t.grab ? `GRAB (DEFENSE + DOWN): ${t.grab.name} — ${t.grab.text}` : '',
    t.jump ? `JUMP: ${t.jump.name} — ${t.jump.text}` : ''
  ].filter(Boolean).join(' ¶ ');
}

export function spellHowTo(spellId) {
  const definition = SPELL_DEFINITIONS[spellId];
  if (!definition) return null;
  if (definition.isBuffForm) return { targeting: 'Draw the hourglass sigil ⧗ (the buff rune in your hand), then tap its slot: the form takes shape around you at once.', effect: buffHowTo(definition), summon: null };
  if (definition.isSignature) {
    const d = SIGNATURE_RUNE_DATA.find((x) => x.id === definition.signatureId);
    return { targeting: `SIGNATURE SPECIAL · once per deck · draw its own multi-stroke glyph (Training shows the trace guide). ${TARGETING_HOW_TO[definition.targetingMode] ?? TARGETING_HOW_TO.self}`, effect: `${d.howTo} ¶ Counterplay: ${d.counterplay}`, summon: null };
  }
  return {
    targeting: TARGETING_HOW_TO[definition.targetingMode] ?? TARGETING_HOW_TO.direction,
    effect: SPELL_HOW_TO[spellId] ?? definition.desc,
    summon: definition.deliveryType === DELIVERY.SUMMON && !SPELL_HOW_TO[spellId]
      ? 'Summons fight on their own. Mountable ones can be ridden with the MOUNT button when you stand next to them.' : null
  };
}

// Solo special runes are ordinary deck cards with a harder glyph; like the
// transformation runes they are a complete spell and never fuse.
export const SOLO_RUNES = Object.freeze(['doppel', 'mortis']);

export function isSpecialRune(rune) {
  const id = String(typeof rune === 'string' ? rune : rune?.id);
  return id.startsWith('transform_') || id.startsWith('buff_') || id.startsWith('sig_') || SOLO_RUNES.includes(id);
}
export const isSignatureRune = (rune) => String(typeof rune === 'string' ? rune : rune?.id).startsWith('sig_');
export const isBuffRune = (rune) => String(typeof rune === 'string' ? rune : rune?.id).startsWith('buff_');

// The runes a spell is made of (first recipe that forms it). Sky fields use
// this to strengthen or weaken whole elements.
const SPELL_RUNES = (() => {
  const map = {};
  for (const [key, spellId] of Object.entries(SPELL_RECIPES)) if (!map[spellId]) map[spellId] = Object.freeze(key.split('+'));
  return Object.freeze(map);
})();
export function spellRunes(spellId) { return SPELL_RUNES[spellId] ?? []; }
