# GRIMGE — Transformation System

## Canonical target-system status

This is the authoritative long-term transformation design contract. It is a
**target system**, not a command to retrofit every transformation now. Before
any implementation, audit the existing architecture, preserve working systems,
identify partial work, and extend the smallest compatible system instead of
creating a parallel transformation framework.

Concrete transformations, statistics, balance, VFX, animation, activation,
duration, cooldowns and unlock thresholds are intentionally undecided.

## Three separate progression sources

```text
CLASS TREE          → CLASS TRANSFORMATION
PRIMAL BOND / LEVEL  → PRIMAL TRANSFORMATION (Stages I–III)
MASTERY TREE         → MASTERY TRANSFORMATION
```

They may interact, but remain conceptually distinct:

```text
Class   = how the character fights
Primal  = the supernatural being the character is bound to
Mastery = the school of magic the character has mastered
```

No assumption is currently permitted about whether full transformations stack,
blend, are mutually exclusive, or share an activation resource.

## Class Transformations

Every playable class eventually receives at least one Class Transformation,
unlocked through that class's Class Tree. It is the highest expression of the
class, not a generic aura or global stat bonus.

It must respect the class's weapon family and combat identity. It may evolve,
energise or extend that identity, but must not casually replace it. Gameplay
should strengthen, extend or temporarily alter existing class mechanics rather
than create an unrelated combat system.

## Primal Transformations

Primal Bond/Level progression unlocks three visually and mechanically distinct
stages for each appropriate Primal:

| Stage | Name | Required visual identity |
|---|---|---|
| I | Manifestation | The Primal appears around the existing character as aura, spirit form, silhouette or VFX. The base sprite mostly remains. |
| II | Hybrid | Character plus physical Primal traits: horns, claws, wings, scales, fur, altered eyes, etc. |
| III | Fusion | A strongly new fused silhouette and integrated Primal identity; may need bespoke sprite/animation work. |

The progression must be qualitatively readable, not merely three increasingly
large aura effects. Exact bond thresholds and individual Primal designs remain
open.

## Mastery Transformations

Each of the fourteen canonical Masteries is intended to receive a High-
Mastery/Endgame transformation:

```text
Fire, Water, Ice, Wind, Lightning, Earth, Nature, Light, Shadow, Void,
Invocation, Construction, Ward, Control
```

Arcane Mastery is overarching progression and has no separate fifteenth
Mastery Transformation planned. Mastery forms should visibly express their
school and eventually alter rules, interactions or affinity spell behavior —
not simply add large unconditional damage/health/mana multipliers.

Examples of directions only: Fire uses heat/ash/distortion; Void uses rifts and
spatial fragments; Invocation manifests companion spirits; Construction uses
dynamic geometric constructs; Ward uses shield segments and protective rings;
Control visibly manipulates local space and objects. These are directions, not
final designs.

## Visual and asset philosophy

Transformations are character-fantasy and prestige systems. Stage I can rely
primarily on VFX; Class forms, Primal II/III and Mastery forms must go beyond
recolors, particle swaps and generic aura skins.

The future character visual pipeline should support base body, class/equipment
layers, hair, armour, weapon, transformation overlays, aura/VFX and additional
Primal features. Strong forms may still require bespoke sprites/animations;
modularity must never make them visually generic.

## Balance and progression rules

Transformation power must remain compatible with controlled horizontal
progression and competitive readability. Potential balance levers include
meter, temporary duration, costs, telegraphing, counterplay, cooldown,
activation conditions, opportunity cost and exclusive choices. None is final.

Special Runes are not automatically Transformations. A Special Rune is a
complex standalone spell; it only causes a form if a future explicit design
defines it as such.

## Existing prototype boundary

The current prototype's Focus Ascendant, Eidolon Mantle and Ninefold Beast
Form are experimental rune/focus vertical-slice effects. They must not be
treated as final Class, Primal or Mastery Transformations, and must not dictate
the final activation, stacking, balance or asset architecture.

## Non-final items

The following require separate design decisions before implementation:

- individual Class, Primal and Mastery form designs
- all transformation stats, skills and affinities
- activation input/resource/meter, duration, cooldown, interruption and death behavior
- unlock/bond/mastery requirements
- stacking/exclusivity/priority rules
- ranked/PvP rules and counterplay
- final sprite, animation, equipment and cosmetics integration

## Governing principle

Transformations are not simple power-up skins. They are visibly distinct,
mechanically relevant, balanceable expressions of:

```text
CLASS   → mastery of combat identity
PRIMAL  → mastery of bond and fusion
MAGIC   → mastery of a rune school
```
