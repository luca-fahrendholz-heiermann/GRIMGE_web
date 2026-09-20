# GRIMGE — Rune, Spell & Mastery System

## Canonical status

This document is the authoritative design contract for future Rune, Spell,
Mastery, Grimoire and Codex work. It intentionally does **not** define a
complete two-rune or three-rune recipe table. No implementation may invent
filler recipes merely to fill a combination matrix.

The current browser prototype contains an earlier, deliberately small spell
vertical slice. Its concrete legacy recipes remain working prototype content
until a separately approved recipe-data migration is made. They must not be
mistaken for the final canonical recipe set.

## Core magic grammar

```text
RUNE → RUNE SEQUENCE → RECIPE RESOLUTION → SPELL → GAMEPLAY EFFECTS
```

Runes are a magical language, not spell icons. Result types such as Projectile,
AoE, Damage, DoT, Heal, Buff, Debuff, Crowd Control, Shield, Summon,
Construct, World Object, Temporary Weapon, Mobility and Battlefield Control
describe spell effects; they are not automatically separate Runes.

Every Standard Base Rune must have standalone value:

```text
1 Base Rune  → Fundamental Spell
2 Base Runes → Compound Spell
3 Base Runes → Advanced Spell
1 Special Rune → Complex standalone Special Spell
```

## Standard Base Runes — 17 total

### Element Runes

| Rune | Mastery | Core semantic space |
|---|---|---|
| Fire | Fire | Heat, burning, explosive thermal energy |
| Water | Water | Liquids, currents, fluid behaviour |
| Ice | Ice | Cold, frost, freezing, ice |
| Wind | Wind | Air, flow, aerodynamic movement |
| Lightning | Lightning | Electrical discharge, conductive energy |
| Earth | Earth | Stone, mass, mineral matter |
| Nature | Nature | Plants, growth, organic life energy |
| Light | Light | Radiation, cleansing, positive light magic |
| Shadow | Shadow | Darkness, curses, draining dark magic |
| Void | Void | Space, dimensions, rifts, distortion |

### Concept Runes

| Rune | Mastery | Semantic rule | Typical direction |
|---|---|---|---|
| Invocation | Invocation | Manifest an autonomous entity | summons, spirits, guardians, creatures |
| Construction | Construction | Create an independent world object | walls, traps, platforms, turrets, weapons |
| Ward | Ward | Defend or strengthen an entity | shields, armour, absorption, reflection |
| Force | Control | Transfer force, impulse or movement | push, pull, launch, shockwave |
| Binding | Control | Restrict movement or actions | roots, chains, immobilisation |
| Field | Control | Distribute an effect through an area | zones, weather, area manipulation |
| Shift | Control | Change position or spatial relation | blink, swap, teleport, portal movement |

`Construction` and `Ward` are intentionally distinct: Construction creates an
independent World Object; Ward is directly bound to a protected entity.
Invocation is not limited to animals. Beasts, demons, spirits, elementals,
dragons and undead are possible entity types, not additional base categories.

## Recipe rules

- Concept + Element and Concept + Concept recipes are both valid design space.
- Not every mathematically possible two- or three-rune sequence has a recipe.
- Elements must mechanically transform a concept; recolouring the same spell
  is invalid design.
- Three-rune spells create unusual hybrid or advanced interactions, not merely
  a stronger two-rune damage value. They may cost more, telegraph more and
  offer counterplay.
- An invalid queued sequence must never result in a dead input. Resolve an
  appropriate queued rune as its standalone spell, clear incompatible queued
  runes, and preserve the prototype's queue-priority behavior until a later
  specification changes it.

The exact one-rune spell list, recipe database, resolution priority, mana
formulae and casting timings remain intentionally undecided.

## Reusable gameplay systems

Future recipes should compose reusable systems rather than spawn isolated
spell-specific subsystems:

```text
Spell, SpellRecipe, SpellEffect, WorldObject, Pickup, TemporaryWeapon,
Construct, Summon, StatusEffect, FieldEffect, ShieldEffect
```

World Objects may be spawned, picked up, dropped, thrown, destroyed, used as
temporary weapons, carried by another character, have durability, and expire.
The Ice Sword example is a system direction only; it does **not** define an
Ice + Construction recipe.

## Masteries

There are fourteen Mastery Trees:

```text
Fire, Water, Ice, Wind, Lightning, Earth, Nature, Light, Shadow, Void,
Invocation, Construction, Ward, Control
```

Force, Binding, Field and Shift contribute to Control Mastery. A spell inherits
the affinities of the runes in its recipe. Special Runes also have normal
Mastery affinities despite not being Standard Base Runes.

`Arcane Mastery` is an overarching magic-progression value, not a fifteenth
normal Mastery Tree. Its exact calculation and use as an unlock gate are not
yet defined.

Multi-rune casts distribute their Mastery XP between involved affinities; they
must not become a disproportionate total-XP exploit. Exact distribution is
intentionally undecided.

## Progression and balance

Rune progression is primarily horizontal:

```text
use magic → gain mastery XP → meet requirements → obtain material/item
→ pay gold → unlock Base Rune → access new grammar possibilities
```

Future unlocks may require Mastery, Arcane Mastery, character progress, gold,
boss/dungeon materials, quest items or discoveries. No fixed unlock chain is
canonical yet.

Masteries should unlock options, traits, specialization, discovery, cosmetics
and build choices — not unlimited unconditional damage inflation. Potential
active Mastery Traits are future build slots, not confirmed raw power bonuses.

## Special Runes

Special Runes are separate from Standard Base Runes: individually drawable,
rarer, more complex, more committed and usually more specialized. Categories
can include Ancient, Boss, Primal, Event and legally licensed Crossover Runes.
They are not automatically stronger; cost, commitment, interruption,
telegraphing, cooldown, positioning and Grimoire opportunity cost provide
balance.

## Grimoire and Codex

The Grimoire determines combat availability. The existing implementation's
deck size remains authoritative until separately changed; a maximum of two
copies of the same Rune may be slotted. The Codex records discoveries. The
Grimoire must not become a full recipe encyclopedia.

```text
unlock/equip → experiment → discover valid combination → cast → record in Codex
```

## Mandatory design tests for every Base Rune

1. **Solo value:** meaningful standalone spell.
2. **Grammar value:** understandable and interesting two-rune interaction.
3. **Depth value:** meaningful selected three-rune and/or Concept + Concept use.

The governing spell-design rule is:

```text
SEMANTICALLY PREDICTABLE
BUT
MECHANICALLY TRANSFORMATIVE
```
