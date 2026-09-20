# GRIMGE – Rune, Spell & Mastery System
## Canonical Design Knowledge

Dieses Dokument definiert den aktuellen verbindlichen Designstand des Runen-, Spell- und Mastery-Systems von GRIMGE.

WICHTIG:
Die konkreten Spell-Rezepte aus 2 oder 3 Runen sind noch NICHT final definiert.

Dieses Dokument definiert:
- die grundlegende Magie-Architektur
- Standard Base Runes
- Concept Runes
- Mastery-Zuordnung
- Rune Progression
- Spell Combination Rules
- Special Runes
- grundlegende Designregeln für zukünftige Spells

Es soll NICHT eigenständig eine vollständige Kombinationstabelle erzeugt oder implementiert werden.

Konkrete 2-Rune- und 3-Rune-Spells werden separat designt und anschließend als Daten ergänzt.


# 1. CORE PHILOSOPHY

GRIMGE besitzt ein kombinatorisches Runen-Magiesystem.

Runen sind keine bloßen Spell-Icons.

Sie bilden eine magische Sprache.

Ein Spieler stellt ein begrenztes Set von Runen in seinem Grimoire zusammen und zeichnet diese während des Kampfes.

Aus einzelnen oder mehreren nacheinander verwendeten Runen entstehen Spells.

Die grundlegende Hierarchie lautet:

RUNE
↓
RUNE SEQUENCE
↓
RECIPE RESOLUTION
↓
SPELL
↓
GAMEPLAY EFFECTS

Ein Spell kann dabei beispielsweise folgende Gameplay-Eigenschaften besitzen:

- Projectile
- AoE
- Damage
- DoT
- Heal
- Buff
- Debuff
- Crowd Control
- Shield
- Summon
- Construct
- World Object
- Temporary Weapon
- Mobility
- Battlefield Control

Diese Begriffe sind SPELL RESULT TYPES.

Sie sind grundsätzlich keine eigenen Runen.


# 2. FUNDAMENTAL DESIGN RULE

Jede Standard Base Rune muss alleine sinnvoll verwendbar sein.

Eine Rune darf niemals nur deshalb existieren, um eine andere Rune zu modifizieren.

Das bedeutet:

1 Rune
→ eigener Fundamental Spell

2 Runen
→ Compound Spell

3 Runen
→ Advanced Spell

Dadurch bleibt jede Rune im Grimoire auch dann wertvoll, wenn der Spieler gerade keine passende Kombination ausführen kann.


# 3. STANDARD BASE RUNES

Aktuell existieren 17 Standard Base Runes.

Sie sind in Element Runes und Concept Runes unterteilt.


## 3.1 ELEMENT RUNES

### Fire
Mastery: Fire

Bedeutung:
- Feuer
- Hitze
- Verbrennung
- explosive thermische Energie


### Water
Mastery: Water

Bedeutung:
- Wasser
- Flüssigkeit
- Strömung
- fluides Verhalten


### Ice
Mastery: Ice

Bedeutung:
- Kälte
- Frost
- Gefrieren
- Eis


### Wind
Mastery: Wind

Bedeutung:
- Luft
- Wind
- Strömung
- aerodynamische Bewegung


### Lightning
Mastery: Lightning

Bedeutung:
- Elektrizität
- elektrische Entladung
- leitende Energie


### Earth
Mastery: Earth

Bedeutung:
- Erde
- Stein
- Masse
- mineralische Materie


### Nature
Mastery: Nature

Bedeutung:
- Pflanzen
- Wachstum
- natürliche Lebensenergie
- organische Natur


### Light
Mastery: Light

Bedeutung:
- Licht
- Strahlung
- Reinigung
- positive/lichte magische Energie


### Shadow
Mastery: Shadow

Bedeutung:
- Schatten
- Dunkelheit
- Flüche
- zehrende/dunkle Magie


### Void
Mastery: Void

Bedeutung:
- Leere
- Raum
- Dimension
- Rifts
- Verzerrung
- außerweltliche Energie


# 4. CONCEPT RUNES

Concept Runes beschreiben grundlegende magische Operationen.

Sie sind NICHT ausschließlich Modifier.

Auch jede Concept Rune muss alleine einen sinnvollen Fundamental Spell besitzen.

Concept Runes können kombiniert werden mit:

- Element Runes
- anderen Concept Runes
- ausgewählten weiteren Runen

Concept Runes bestimmen häufig die grundlegende mechanische Richtung eines Spells.


## Invocation

Mastery:
Invocation

Semantische Regel:
Manifestiere eine autonome Entität.

Typische Ergebnisfamilien:
- Summons
- Spirits
- Creatures
- Guardians
- magical entities

Invocation ist NICHT auf Tiere beschränkt.

Beasts, Demons, Spirits, Elementals, Dragons, Undead usw. sind mögliche Entity-/Creature-Typen und keine eigenen grundlegenden Invocation-Kategorien.


## Construction

Mastery:
Construction

Semantische Regel:
Erschaffe ein persistentes physisches oder magisches Objekt in der Spielwelt.

Typische Ergebnisfamilien:
- Walls
- Totems
- Turrets
- Platforms
- Traps
- physical constructs
- magical constructs
- temporary weapons
- interactable world objects

WICHTIG:

Construction und Ward sind klar voneinander zu unterscheiden.

Construction:
→ erschafft ein eigenständiges World Object.

Ward:
→ schützt eine Entität bzw. erzeugt einen direkt gebundenen Schutz.


## Ward

Mastery:
Ward

Semantische Regel:
Schütze oder verstärke defensiv eine Entität.

Typische Ergebnisfamilien:
- Shields
- Armor
- Damage Absorption
- defensive magical effects
- Reflection
- reactive protection

Ward soll grundsätzlich NICHT als generische Rune für Mauern oder andere eigenständige World Objects verwendet werden.

Solche Effekte gehören normalerweise zu Construction.


## Force

Mastery:
Control

Semantische Regel:
Übertrage Kraft, Impuls oder Bewegung.

Typische Ergebnisfamilien:
- Push
- Pull
- Launch
- Knockback
- acceleration
- Shockwaves
- physical displacement through force


## Binding

Mastery:
Control

Semantische Regel:
Schränke Bewegung oder Handlungsfreiheit ein.

Typische Ergebnisfamilien:
- Root
- Bind
- Chains
- immobilization
- movement restriction
- action restriction


## Field

Mastery:
Control

Semantische Regel:
Übertrage oder verteile einen Effekt auf einen räumlichen Bereich.

Typische Ergebnisfamilien:
- Zones
- environmental effects
- persistent areas
- battlefield control
- weather-like effects
- area manipulation


## Shift

Mastery:
Control

Semantische Regel:
Verändere Position oder räumliche Beziehung.

Typische Ergebnisfamilien:
- Blink
- Teleport
- Swap
- repositioning
- spatial manipulation
- portal-like movement


# 5. CURRENT BASE RUNE LIST

The canonical current Standard Base Rune list is:

ELEMENT RUNES

1. Fire
2. Water
3. Ice
4. Wind
5. Lightning
6. Earth
7. Nature
8. Light
9. Shadow
10. Void

CONCEPT RUNES

11. Invocation
12. Construction
13. Ward
14. Force
15. Binding
16. Field
17. Shift

Total:

17 Standard Base Runes


# 6. ONE-RUNE SPELLS

Every Standard Base Rune MUST have its own useful one-rune spell.

This includes Concept Runes.

Example direction only:

Fire
→ simple offensive fire spell

Ice
→ simple offensive ice spell

Ward
→ basic Arcane Shield

Force
→ basic Force Push

Binding
→ basic magical Bind

Shift
→ short basic repositioning spell

Invocation
→ basic neutral magical entity

Construction
→ basic neutral construct

Field
→ basic neutral area effect

IMPORTANT:

The exact one-rune spell list is not yet final.

Do not hardcode the example names or exact mechanics without a separate design decision.


# 7. TWO-RUNE SPELLS

Two-rune combinations are the primary way the player learns the grammar of GRIMGE's magic system.

The player should gradually understand statements such as:

Ward
≈ protection

Construction
≈ create world object

Invocation
≈ manifest entity

Field
≈ affect area

Force
≈ apply impulse

Binding
≈ restrict

Shift
≈ reposition

This allows experimentation.

A player who understands a Concept Rune should be able to form a reasonable expectation of what combining it with an Element Rune might do.

However:

PREDICTABLE DOES NOT MEAN IDENTICAL.


# 8. MECHANICALLY TRANSFORMATIVE COMBINATIONS

Elemental combinations must NEVER be designed as simple recolors or damage-type substitutions.

BAD DESIGN:

Fire Barrier
= red barrier + fire damage

Ice Barrier
= blue barrier + ice damage

Lightning Barrier
= yellow barrier + lightning damage

GOOD DESIGN:

The underlying Concept remains understandable, but the element changes the actual gameplay behavior.

For example, an element could influence:

- collision behavior
- durability
- movement
- knockback
- status buildup
- terrain interaction
- projectile interaction
- duration
- destruction behavior
- secondary effects
- pickup behavior
- chain effects
- environmental effects

The exact implementation depends on the individual spell.


# 9. THREE-RUNE SPELLS

GRIMGE supports combinations of up to three Standard Base Runes.

Three-rune recipes are NOT simply stronger versions of two-rune spells.

Their primary purpose is to create:

- unusual interactions
- hybrid mechanics
- advanced battlefield effects
- complex summons
- advanced constructs
- transformations of existing spell concepts
- high-skill utility
- spectacular but counterable effects

Conceptually:

1 Rune
→ fundamental expression

2 Runes
→ understandable combination

3 Runes
→ advanced magical expression

Three-rune spells may generally have:

- higher mana requirements
- greater casting commitment
- more complex tactical application
- stronger telegraphing
- more opportunity for interruption

They must NOT automatically provide superior DPS or unconditional power.


# 10. CONCEPT + CONCEPT COMBINATIONS

Concept Runes may be combined with other Concept Runes.

They are NOT merely modifiers for Element Runes.

Concept + Concept combinations are an important part of the magic system.

For example, the semantic interaction between concepts such as:

Ward + Force

Construction + Ward

Invocation + Ward

Field + Binding

Shift + Force

may produce completely valid spells.

These examples establish that Concept + Concept recipes are allowed.

They do NOT define the final resulting spells.

The actual recipe database will be designed separately.


# 11. NOT EVERY COMBINATION EXISTS

This is a fundamental rule.

There is NO requirement that every mathematically possible combination of the 17 Base Runes has a unique Spell Recipe.

Only combinations that:

- make semantic sense
- create meaningful gameplay
- provide sufficient mechanical distinction
- fit the balance
- fit the world/lore
- justify their implementation complexity

should become real recipes.

Empty combinations are intentionally allowed.

Do NOT generate filler spells merely to complete the combination matrix.


# 12. INVALID COMBINATION RESOLUTION

The game must never leave the player with a dead input simply because the currently queued/slotted runes do not form a valid recipe.

When multiple runes are queued for combination:

1. Check whether the complete queued rune sequence corresponds to a valid Spell Recipe.

2. If a valid recipe exists:
   → cast the combined spell.

3. If no valid combination exists:
   → resolve the appropriate rune as its standalone one-rune spell according to the game's queue-resolution rules.

4. Clear the remaining incompatible queued runes.

The exact ordering/priority behavior should follow the existing implemented queue system unless explicitly changed by a later design specification.

The important invariant is:

NO VALID COMBINATION
≠
NO SPELL

Every Base Rune remains independently castable.


# 13. WORLD OBJECTS AND PICKUPS

Spells may create actual objects in the game world.

These objects should use general gameplay systems rather than spell-specific hacks.

Examples of possible World Object behavior:

- spawned into arena
- picked up
- dropped
- thrown
- destroyed
- used as temporary weapon
- used by another player
- interact with physics
- possess durability
- expire after time
- contain special attack properties

Example design direction:

An Ice-based Construction spell could potentially create an Ice Sword.

The Ice Sword is NOT:

- a permanent class weapon
- merely a visual buff on the player's equipped weapon

Instead it may be:

SPELL
→ WORLD OBJECT
→ PICKUP
→ TEMPORARY WEAPON

A player could pick it up and use the normal attack system.

Its temporary moveset or attack properties may differ from the player's normal class weapon.

For example, a completed attack sequence/finisher could potentially apply Freeze.

The weapon may then:

- lose durability
- break
- be thrown
- be dropped
- be picked up by another character

IMPORTANT:

This is an example of the general system philosophy.

Do NOT hardcode Ice + Construction = Ice Sword yet.

The final recipe has not been decided.


# 14. GENERAL SYSTEM ARCHITECTURE

Do not implement separate isolated systems such as:

IceSwordSystem
FireTotemSystem
EarthWallSystem

when these can be expressed through reusable systems.

Prefer general abstractions such as:

Spell
SpellRecipe
SpellEffect
WorldObject
Pickup
TemporaryWeapon
Construct
Summon
StatusEffect
FieldEffect
ShieldEffect

Specific spells should primarily be compositions/configurations of reusable gameplay systems.

This is especially important because many future spells will reuse the same mechanics.


# 15. MASTERIES

Standard Base Runes are assigned to Mastery Trees.

There are currently 14 Mastery Trees.


## ELEMENTAL MASTERIES

1. Fire Mastery
2. Water Mastery
3. Ice Mastery
4. Wind Mastery
5. Lightning Mastery
6. Earth Mastery
7. Nature Mastery
8. Light Mastery
9. Shadow Mastery
10. Void Mastery


## DISCIPLINE MASTERIES

11. Invocation Mastery
12. Construction Mastery
13. Ward Mastery
14. Control Mastery


# 16. BASE RUNE → MASTERY MAPPING

Fire
→ Fire Mastery

Water
→ Water Mastery

Ice
→ Ice Mastery

Wind
→ Wind Mastery

Lightning
→ Lightning Mastery

Earth
→ Earth Mastery

Nature
→ Nature Mastery

Light
→ Light Mastery

Shadow
→ Shadow Mastery

Void
→ Void Mastery

Invocation
→ Invocation Mastery

Construction
→ Construction Mastery

Ward
→ Ward Mastery

Force
→ Control Mastery

Binding
→ Control Mastery

Field
→ Control Mastery

Shift
→ Control Mastery


# 17. SPELL AFFINITIES

Spells inherit the relevant Mastery Affinities from their recipe.

Example:

Fire + Wind
→ Spell has Fire + Wind affinities.

Invocation + Nature
→ Spell has Invocation + Nature affinities.

A three-rune recipe could therefore possess three Mastery Affinities.

Special Runes also receive Mastery Affinities even though they are not Standard Base Runes.


# 18. MASTERY XP

Using runes and spells grants experience toward their associated Masteries.

The purpose is:

USE MAGIC
→ GAIN EXPERIENCE IN THAT MAGIC
→ INCREASE MASTERY

For combination spells, XP should be distributed between the involved Masteries rather than multiplying total XP simply because more runes were used.

Exact XP formulas are NOT yet final.

Do not hardcode:

1 Rune = 100 %
2 Runes = 50/50
3 Runes = 33/33/33

unless explicitly defined later.

The design requirement is simply:

Multi-rune spells must not become an exploit for generating disproportionately more total Mastery XP.


# 19. ARCANE MASTERY

In addition to the 14 Mastery Trees, the player possesses an overarching:

ARCANE MASTERY

Arcane Mastery represents overall progress and understanding of rune magic.

It is NOT considered a normal 15th Mastery Tree.

It may later be calculated from:

- total Mastery progression
- unlocked runes
- discoveries
- other progression milestones

Exact calculation is not yet final.

Arcane Mastery may serve as an unlock requirement for advanced content.


# 20. RUNE PROGRESSION

Not every Standard Base Rune must be available immediately.

The intended progression loop is:

USE RUNES / SPELLS
↓
GAIN MASTERY XP
↓
INCREASE MASTERY LEVEL
↓
FULFILL REQUIREMENTS
↓
OBTAIN REQUIRED MATERIAL / ITEM
↓
PAY GOLD
↓
UNLOCK NEW BASE RUNE
↓
GAIN ACCESS TO NEW POSSIBLE SPELL COMBINATIONS

Possible unlock requirements include:

- specific Mastery Level
- multiple Mastery Levels
- Arcane Mastery Level
- Character progression
- Gold
- boss material
- dungeon material
- quest item
- discovery item

The exact progression paths are NOT yet final.

Do not currently hardcode assumptions such as:

Water Mastery 5 → Ice

or:

Shadow Mastery 10 → Void

These were design examples, not finalized progression requirements.


# 21. MASTERY TREE PHILOSOPHY

Mastery must NOT simply create unlimited vertical power growth.

Avoid progression such as:

Fire Mastery 5
→ +5 % damage

Fire Mastery 10
→ +10 % damage

Fire Mastery 20
→ +20 % damage

This creates problematic power creep, especially for competitive PvP.

Mastery progression should primarily unlock:

- new options
- specialization
- traits
- alternative behaviors
- Rune unlock requirements
- cosmetic mastery rewards
- visual effects
- titles
- advanced build choices

Where gameplay modifiers exist, they should preferably behave as:

SIDEGRADES

rather than unconditional upgrades.

Example philosophy:

larger area
↔ lower direct damage

faster cast
↔ higher mana cost

stronger crowd control
↔ shorter duration / lower damage

longer duration
↔ greater mana commitment

Exact Mastery Traits are not yet defined.


# 22. ACTIVE MASTERY TRAITS

Long-term Mastery progression may unlock more possible Traits than a player can equip simultaneously.

This enables:

MORE PROGRESSION
→ MORE BUILD OPTIONS

without necessarily causing:

MORE PROGRESSION
→ MORE RAW MATCH POWER

A future system may therefore limit the number of active/attuned Mastery Traits.

Exact slot counts and Trait rules are not yet final.


# 23. SPECIAL RUNES

Special Runes exist separately from Standard Base Runes.

They are typically:

- significantly more complex glyphs
- complete spells
- individually drawable
- higher mana commitment
- longer drawing/casting commitment
- more specialized
- rarer

A Special Rune does NOT require a normal multi-rune recipe to produce its primary spell.


Possible Special Rune categories include:

ANCIENT RUNES

BOSS RUNES

PRIMAL RUNES

EVENT RUNES

CROSSOVER / COLLABORATION RUNES


Special Runes are NOT exclusively reserved for collaborations.

GRIMGE should contain its own original Special Runes.

Collaborations with external IP may use Crossover Special Runes where appropriate and legally licensed.


# 24. SPECIAL RUNE AFFINITIES

Special Runes still participate in the Mastery system.

Example conceptual structure:

Special Rune:
Infernal Dragon Seal

Possible affinities:
- Fire
- Invocation

Using the Special Rune could therefore contribute toward:

Fire Mastery
Invocation Mastery

The exact Special Runes and affinities will be defined separately.


# 25. SPECIAL RUNE BALANCE

Special Rune does NOT mean:

objectively stronger than Standard Runes.

Their greater impact can be balanced through:

- higher mana cost
- longer drawing time
- greater commitment
- interruptibility
- recovery
- telegraphing
- positioning requirements
- Grimoire slot opportunity cost
- cooldown
- counterplay

A complex Special Rune may produce a spectacular effect while still remaining competitively balanced.


# 26. GRIMOIRE RELATIONSHIP

The player's Grimoire determines which runes are available during combat.

Standard Base Runes and eligible Special Runes may occupy Grimoire slots.

Current existing design constraint:

A player may own multiple copies of a rune, but a maximum of 2 copies of the same rune may be slotted in the Grimoire.

The exact total number of Grimoire slots should follow the current game implementation/configuration and must not be changed solely based on this document.


# 27. CODEX RELATIONSHIP

The Codex is responsible for knowledge and discovery.

The Grimoire is NOT intended to become a giant recipe encyclopedia.

As the player discovers valid combinations, they may be recorded in:

CODEX
→ SPELLS / DISCOVERIES

The intended discovery loop is:

UNLOCK / EQUIP RUNES
↓
EXPERIMENT IN COMBAT
↓
DISCOVER VALID COMBINATION
↓
CAST NEW SPELL
↓
RECORD DISCOVERY IN CODEX

The exact Codex UX will be specified separately.


# 28. BALANCE PRINCIPLE

GRIMGE progression should emphasize:

HORIZONTAL PROGRESSION
+
PLAYER KNOWLEDGE
+
MECHANICAL EXECUTION
+
BUILD SPECIALIZATION

rather than unrestricted numerical power growth.

A veteran may possess:

- more unlocked runes
- more Special Runes
- more discovered recipes
- more Mastery options
- more cosmetics
- greater game knowledge

but competitive balance must not simply reduce to:

older account = higher damage.


# 29. DESIGN TEST FOR EVERY BASE RUNE

Before a Base Rune becomes permanently canonical, it must pass three tests.


## TEST A – SOLO VALUE

Does this rune produce a meaningful and useful spell by itself?

If not, it risks becoming a dead Grimoire slot.


## TEST B – GRAMMAR VALUE

Does the rune create understandable and interesting two-rune interactions?

Can players learn what this rune generally means?


## TEST C – DEPTH VALUE

Does the rune contribute to interesting selected three-rune combinations and/or Concept + Concept interactions?

If a rune fails these tests across most of the system, reconsider whether it should remain a Base Rune.


# 30. SPELL DESIGN RULE

Future spell design should follow this principle:

SEMANTICALLY PREDICTABLE
BUT
MECHANICALLY TRANSFORMATIVE

The player should increasingly understand the language of rune combinations.

However, discovering a new combination should still create moments of surprise.

The goal is NOT:

memorize hundreds of arbitrary recipes.

The goal is:

learn the rules of magic
→ form hypotheses
→ experiment
→ discover surprising applications.


# 31. CURRENT CANONICAL SUMMARY

Current Standard Base Runes:

ELEMENTS
- Fire
- Water
- Ice
- Wind
- Lightning
- Earth
- Nature
- Light
- Shadow
- Void

CONCEPTS
- Invocation
- Construction
- Ward
- Force
- Binding
- Field
- Shift


Current Mastery Trees:

ELEMENTAL
- Fire
- Water
- Ice
- Wind
- Lightning
- Earth
- Nature
- Light
- Shadow
- Void

DISCIPLINES
- Invocation
- Construction
- Ward
- Control

Force, Binding, Field and Shift all contribute to:
→ Control Mastery


Additional progression:
→ Arcane Mastery as overarching overall magic progression.


Spell hierarchy:

1 Standard Base Rune
→ Fundamental Spell

2 Standard Base Runes
→ Compound Spell

3 Standard Base Runes
→ Advanced Spell

1 Special Rune
→ Complex standalone Special Spell


Not every 2-rune or 3-rune combination must exist.

Every Base Rune must remain independently useful.

Concept Runes may combine with Element Runes AND other Concept Runes.

Construction creates independent World Objects.

Ward provides entity-bound protection.

Invocation manifests autonomous entities.

Force applies impulse.

Binding restricts.

Field affects an area.

Shift manipulates position/space.

Elements must mechanically transform resulting spells rather than merely recolor them.

Mastery comes from actual usage.

Mastery progression unlocks options and may serve as a requirement for unlocking additional Base Runes.

Rune unlocks may additionally require Gold, materials, discoveries or progression requirements.

Special Runes exist outside the Standard Base Rune set but still receive normal Mastery Affinities.

Concrete spell recipes, exact Mastery Traits, exact unlock requirements, exact XP formulas and the complete 2-rune/3-rune combination matrix are intentionally NOT defined yet.