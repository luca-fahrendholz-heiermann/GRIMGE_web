# GRIMGE — Runen- & Spell-Katalog (Stand Web-Prototyp)

> Automatisch aus den Spieldaten erzeugt (`public/src/recognizer.js`, `rune_guides.js`, `spell_catalog.js`). Glyphen-Bilder: `docs/runes/*.svg` (Startpunkt = nummerierter weißer Punkt, Strichreihenfolge = Nummer).
> Zweck: Grundlage für einen Research-Agenten, der weitere Spells entwerfen bzw. aus anderen Spielen/Animes recherchieren soll (siehe Abschnitt 8).

## Inhalt
1. [Grundsystem](#1-grundsystem) · 2. [Runen](#2-runen) · 3. [Spells](#3-spells) · 4. [Kombinationsmatrix](#4-kombinationsmatrix) · 5. [Transformationen & Form-Techniken](#5-transformationen--form-techniken) · 6. [Glossar](#6-glossar-delivery-zielmodi-tags) · 7. [Statistik](#7-statistik) · 8. [Hinweise für den Research-Agenten](#8-hinweise-für-den-research-agenten)

## 1. Grundsystem

- **Runen zeichnen:** Der Spieler zeichnet eine Rune aus seiner Hand (Deck aus 10 Karten, Hand = 3, verbrauchte Runen gehen ans Deckende). Der Erkenner bewertet die Zeichnung mit einer **Qualität C/B/A/S**.
- **Mana** wird beim Zeichnen **gebunden** (nicht beim Wirken). Fusionierte Spells kosten die Summe ihrer Runen.
- **3 Spell-Slots:** Jede gezeichnete Rune liegt als fertiger 1-Runen-Spell in einem Slot (Tasten Z/X/C, Gamepad LB/RB/RT, Touch: Slot antippen).
- **Fusion:** Zwei oder drei Slots gleichzeitig halten (bzw. von Slot zu Slot wischen) → Rezept-Lookup (reihenfolgeunabhängig, Schlüssel = sortierte Rune-IDs). Gibt es kein Rezept, bleibt im Match nur **ein zufälliger** der Slots übrig (Training: nichts geht verloren). Fusionierte Spells und Spezial-Runen können **nicht erneut** fusioniert werden.
- **Solo-Spezialrunen** (`doppel`, `mortis`): schwere Glyphe, sind allein ein vollständiger Spell, nie fusionierbar.
- **Transformations-Runen** (`transform_*`): Altbestand — werden nicht mehr vergeben. ANNIHILATION BEAM kommt als Form-Technik (Focus Ascendant, Heavy-Charge vorwärts voll); VOID IMPLOSION (Bestia+Terra+Void) und INFERNO RAMPAGE (Bestia+Ignis+Void) sind jetzt 3-Runen-Kombinationen.
- **Castle Siege:** Runen werden nur auf der eigenen Burg-Plattform gezeichnet; geslottete Spells wirken überall.

**Qualitätsstufen** (`RUNE_GRADE_PROFILES`):

| Grade | Power | Area | Duration | Partikel |
|---|---|---|---|---|
| C | ×0.80 | ×0.86 | ×0.84 | ×0.78 |
| B | ×1.00 | ×1.00 | ×1.00 | ×1.00 |
| A | ×1.10 | ×1.08 | ×1.08 | ×1.15 |
| S | ×1.25 | ×1.20 | ×1.20 | ×1.40 |

## 2. Runen

| Glyphe | Rune | Element | Icon | Farbe | Mana | Zeichnen | Allein ergibt |
|---|---|---|---|---|---|---|---|
| <img src="runes/ignis.svg" width="48" alt="ignis"> | **IGNIS** `ignis` | Fire | 🔥 | `#ff4b1f` | 10 | Upward Triangle or Chevron | IGNIS FIREBALL |
| <img src="runes/ventus.svg" width="48" alt="ventus"> | **VENTUS** `ventus` | Wind | 💨 | `#00d2ff` | 10 | Horizontal Slash / Dash | GALE SHOCKWAVE |
| <img src="runes/fulgur.svg" width="48" alt="fulgur"> | **FULGUR** `fulgur` | Lightning | ⚡ | `#ffd000` | 12 | Zig-Zag Shape (Z) | ARC LIGHTNING |
| <img src="runes/terra.svg" width="48" alt="terra"> | **TERRA** `terra` | Earth | 🪨 | `#43a047` | 10 | Square / U-Box | STONE SPIKES |
| <img src="runes/aqua.svg" width="48" alt="aqua"> | **AQUA** `aqua` | Frost | ❄️ | `#00e5ff` | 10 | Circular Glyph | FROST NOVA |
| <img src="runes/bestia.svg" width="48" alt="bestia"> | **BESTIA** `bestia` | Beast | 🐺 | `#b388ff` | 18 | Three-Peak Claw / M | BEAST FAMILIAR |
| <img src="runes/construct.svg" width="48" alt="construct"> | **KONSTRUKT** `construct` | Construct | ⚙️ | `#b0bec5` | 16 | Tall Pillar / Tower Stroke | CONSTRUCT BULWARK |
| <img src="runes/void.svg" width="48" alt="void"> | **VOID** `void` | Void | 🕳️ | `#8e24aa` | 16 | Open Spiral / Void Eye | VOID BOLT |
| <img src="runes/lux.svg" width="48" alt="lux"> | **LUX** `lux` | Light | ☀ | `#ffe082` | 12 | Star: four crossing lines (+ then ×) | HALO PULSE |
| <img src="runes/umbra.svg" width="48" alt="umbra"> | **UMBRA** `umbra` | Shadow | ☾ | `#7e57c2` | 12 | Open crescent arc (C shape) | SHADOW STEP |
| <img src="runes/doppel.svg" width="48" alt="doppel"> | **DOPPEL** `doppel` | Shadow | ♊ | `#5e35b1` | 22 | Special: one closed figure-eight (∞) — your shadow double | SHADOW DOPPELGANGER |
| <img src="runes/mortis.svg" width="48" alt="mortis"> | **MORTIS** `mortis` | Death | ☠ | `#9ccc65` | 26 | Special: a five-pointed star in one stroke — raise the fallen | REVENANT CALL |
| ★ | **ANNIHILATION BEAM** `transform_beam` | Transformation | ★ | `#ff4cff` | 0 | Any gesture while Focus Ascendant | ANNIHILATION BEAM |
| ◉ | **VOID IMPLOSION** `transform_implode` | Transformation | ◉ | `#b668ff` | 0 | Any gesture while Eidolon Mantle | — |
| ⚡ | **INFERNO RAMPAGE** `transform_rampage` | Transformation | ⚡ | `#ff6f3b` | 0 | Any gesture while Ninefold Beast | — |
| <img src="runes/buff_sigil.svg" width="48" alt="buff"> | **ARCANE-STATE-SIEGEL** `buff_*` (42 Runen) | Arcane State | ⧗ | je Form | 30 | Sanduhr ⧗ in einem geschlossenen Strich — **Tag: arcane-state · max-1-per-deck** | der Arcane State der Rune (Abschnitt 3.7) |

### Glyphen als ASCII (Ziffer = Startpunkt des Strichs)

**⧗ ARCANE-STATE-SIEGEL** — Sanduhr in einem geschlossenen Strich (gilt für alle Arcane-State-Runen)
```

   1##########
     ##   ##
      ## ##
       ###
      ## ##
     ##   ##
   ###########

```
**🔥 IGNIS** — Upward Triangle or Chevron
```

       ###
      ## ##
     ##   ##
    ##     ##
   ##       ##
  ##         ##
  1############

```
**💨 VENTUS** — Horizontal Slash / Dash
```




1################




```
**⚡ FULGUR** — Zig-Zag Shape (Z)
```

  1############
           ###
         ###
       ###
     ###
   ###
  #############

```
**🪨 TERRA** — Square / U-Box
```

  1############
  #           #
  #           #
  #           #
  #           #
  #           #
  #############

```
**❄️ AQUA** — Circular Glyph
```

    ####1####
  ###       ###
  #           #
  #           #
  #           #
  ###       ###
    #########

```
**🐺 BESTIA** — Three-Peak Claw / M
```

        #
   ##  ###  ##
  ###  # #  ###
  # #### #### #
 ##  ##   ##  ##
 #   ##   ##   #
 1             #

```
**⚙️ KONSTRUKT** — Tall Pillar / Tower Stroke
```
        1
        #
        #
        #
        #
        #
        #
        #
        #
```
**🕳️ VOID** — Open Spiral / Void Eye
```


      ######
     ##    ###
 #   #   1   #
 ##   ####   #
  ###      ##
    ########

```
**☀ LUX** — Star: four crossing lines (+ then ×)
```
        2
   3    #    4
   ###  #  ###
     #######
 1##############
     #######
   ###  #  ###
   #    #    #
        #
```
**☾ UMBRA** — Open crescent arc (C shape)
```

    #########
   ##
  #
  #
  #
   ##
    ########1

```
**♊ DOPPEL** — Special: one closed figure-eight (∞) — your shadow double
```


 ####       ####
 #  #### ####  #
#      #1#      #
 #  #### ####  #
 ####       ####


```
**☠ MORTIS** — Special: a five-pointed star in one stroke — raise the fallen
```

        1
       # #
  #############
   ####   ####
     #######
    #### ####
    ##     ##

```

## 3. Spells

### Übersicht

| Spell | Rezept | Delivery | Zielmodus | Kurzbeschreibung |
|---|---|---|---|---|
| **IGNIS FIREBALL** | 🔥 IGNIS | `projectile` | `direction` | Explosive projectile burning enemies. |
| **GALE SHOCKWAVE** | 💨 VENTUS | `area` | `direction` | High-velocity wind wave knocking enemies back. |
| **ARC LIGHTNING** | ⚡ FULGUR | `area` | `direction` | Crackling bolt leaping between targets. |
| **STONE SPIKES** | 🪨 TERRA | `area` | `direction` | Erupts jagged stone spikes from the ground. |
| **FROST NOVA** | ❄️ AQUA | `area` | `self` | Freezes surrounding foes solid. |
| **BEAST FAMILIAR** | 🐺 BESTIA | `summon` | `direction` | Summons a short-lived hunter familiar. |
| **CONSTRUCT BULWARK** | ⚙️ KONSTRUKT | `wall` | `placement` | Raises a short physical barrier in front of the caster. |
| **VOID BOLT** | 🕳️ VOID | `projectile` | `direction` | Fires a void projectile that slows the first target hit. |
| **HALO PULSE** | ☀ LUX | `area` | `self` | A ring of sunlight: heals you and nearby allies, sears and dazzles nearby enemies. |
| **SHADOW STEP** | ☾ UMBRA | `dash` | `direction` | Sink into your shadow and rise behind the nearest enemy ahead and strike it from its shadow. |
| **SHADOW DOPPELGANGER** | ♊ DOPPEL | `summon` | `self` | Your shadow rises as a weaker double with its own health and fights beside you. Casting again replaces the oldest double (Shadow passives keep more at once). |
| **REVENANT CALL** | ☠ MORTIS | `summon` | `self` | A forbidden seal raises the nearest fallen fighter as a bound revenant; when its borrowed body breaks it bursts. Casting again replaces the oldest revenant. |
| **STORM WOLF** | 🐺 BESTIA + ⚡ FULGUR | `summon` | `direction` | A lightning Hunter that bypasses the minion line to chase the Wizard. |
| **VOID SPIDER** | 🐺 BESTIA + 🕳️ VOID | `summon` | `direction` | A Control summon that entangles nearby enemies in slowing void webs. |
| **RUNE GOLEM** | ⚙️ KONSTRUKT + 🪨 TERRA | `summon` | `direction` | A durable Vanguard that binds defenders and marches on objectives. |
| **FIRESTORM VORTEX** | 🔥 IGNIS + 💨 VENTUS | `zone` | `ground` | Raging flame tornado that pulls enemies in, burns, and launches them! |
| **METEOR CATACLYSM** | ⚡ FULGUR + 🔥 IGNIS | `heavy_object` | `ground` | Calls down a blazing meteor that creates an explosive magma crater! A strong beam can shatter it mid-fall. |
| **TEMPEST BLITZ** | ⚡ FULGUR + 💨 VENTUS | `dash` | `direction` | Transforms into lightning, dashing forward and slashing all enemies! |
| **MAGMA FISSURE** | 🔥 IGNIS + 🪨 TERRA | `zone` | `ground` | Ruptures the earth with geysers of molten lava! |
| **SANDSTORM BASTION** | 🪨 TERRA + 💨 VENTUS | `self` | `self` | Swirling wall of stone and wind deflecting enemy attacks. |
| **BLIZZARD SURGE** | ❄️ AQUA + 💨 VENTUS | `zone` | `direction` | Freezing gale freezing minions and drastically slowing enemy lane push. |
| **AURA SHOCK** | ❄️ AQUA + ⚡ FULGUR | `area` | `self` | Frost-lightning pulse blasting surrounding enemies away. |
| **ARCANE AEGIS** | ❄️ AQUA + 🪨 TERRA | `self` | `ally` | A temporary protective aura that absorbs incoming damage. |
| **STONE WALL** | 🪨 TERRA + 🪨 TERRA | `wall` | `placement` | Raises a temporary earth wall that stops hostile movement and projectiles. |
| **INFERNO BEAM** | 🔥 IGNIS + 🔥 IGNIS | `beam` | `direction` | A sustained straight fire beam. Meets an enemy beam tip-to-tip for a Beam Clash. |
| **GLACIAL RAY** | ❄️ AQUA + ❄️ AQUA | `beam` | `direction` | A freezing ray that slows everything it touches. Clashable. |
| **THUNDER LANCE** | ⚡ FULGUR + ⚡ FULGUR | `beam` | `direction` | A very fast, short-lived lightning beam. Clashable. |
| **NULL RAY** | 🕳️ VOID + 🕳️ VOID | `beam` | `direction` | A void beam that drags its targets toward the caster. Clashable. |
| **MIRROR WARD** | ⚙️ KONSTRUKT + 💨 VENTUS | `capture` | `self` | A ward that captures up to five hostile projectiles, then fires them back as a volley. |
| **GRAVITY LIFT** | 💨 VENTUS + 🕳️ VOID | `telekinesis` | `ground` | Telekinesis: lifts up to four nearby enemies, holds them in the air, then slams them down. |
| **SEISMIC SLAM** | ⚡ FULGUR + 🪨 TERRA | `slam` | `direction` | A travelling ground shockwave that launches enemies and leaves short-lived rock pillars. |
| **TITAN STOMP** | 🐺 BESTIA + 🪨 TERRA | `stomp` | `direction` | Leap up and crash down: hits grounded and airborne enemies around the landing point. |
| **DRAGON BREATH** | 🐺 BESTIA + 🔥 IGNIS | `cone` | `direction` | A wide cone of chunky flame that widens with distance and burns everything inside. |
| **BURROW STRIKE** | 🪨 TERRA + 🕳️ VOID | `burrow` | `self` | Dig underground: untouchable and fast for a moment, then erupt and launch everything around you. |
| **SHADOW STOMPER** | 🪨 TERRA + ☾ UMBRA | `stomp` | `aim` | Aim, then stomp: your shadow races to the nearest enemy in that cone and holds its shadow — the target cannot move. Guarding targets slip free. |
| **RADIANT LANCE** | ☀ LUX + ☀ LUX | `beam` | `direction` | A blinding beam of light that dazzles what it touches. Clashable. |
| **FROST MIRROR GATE** | ❄️ AQUA + 🕳️ VOID | `zone` | `dual` | Set two points: an ice mirror rises at each. Step into one to come out of the other — an escape route back to the entrance of a long Dungeon room, or a sudden flank. |
| **SOUL SEEKERS** | 🔥 IGNIS + 🕳️ VOID | `homing` | `direction` | A salvo of three homing void flames that steer toward enemies within a turn limit. |
| **SOLAR ORB** | 🔥 IGNIS + ☀ LUX | `self` | `self` | Summons a sun: bright light, short shadows. Fire and light grow stronger, ice melts fast, shadow magic weakens. |
| **LUNAR ORB** | ❄️ AQUA + ☾ UMBRA | `self` | `self` | Summons a moon: long shadows and a rising tide. Water, ice and shadow grow stronger, puddles slow and conduct harder, fire weakens. |
| **ECLIPSE** | ☀ LUX + ☾ UMBRA | `self` | `self` | Sun and moon meet: light and shadow magic surge, every other element dims, shadows grow huge. |
| **THUNDERHEAD** | ⚡ FULGUR + ☾ UMBRA | `self` | `self` | A black storm cloud strikes your enemies and their puddles with lightning. Fire burns out quickly. |
| **BLOOD MOON** | 🔥 IGNIS + ☾ UMBRA | `self` | `self` | A red moon: all spells hit harder, healing is halved, shadows turn red. Your doubles and revenants grow savage. |
| **STARFALL** | ☀ LUX + 💨 VENTUS | `self` | `self` | A night sky of falling stars that rain down on your enemies. |
| **AURORA VEIL** | ❄️ AQUA + ☀ LUX | `self` | `self` | Northern lights: your side slowly regenerates health and mana, ice grows stronger. |
| **VOID IMPLOSION** | 🐺 BESTIA + 🪨 TERRA + 🕳️ VOID | `zone` | `ground` | Creates a void singularity that pulls enemies in and crushes them with dimensional collapse. |
| **INFERNO RAMPAGE** | 🐺 BESTIA + 🔥 IGNIS + 🕳️ VOID | `dash` | `direction` | Blazing fire dash that scorches everything in its path across the lane. |
| **ARKENGESTELL** |  | `self` | `self` | An open arcane force frame around the Wizard: damage resistance, knockback resistance and empowered melee. |
| **RISSWILD** |  | `self` | `self` | Three cracked molten energy bands: faster movement, savage melee and light damage resistance. |
| **DRAGON INVOCATION** | 🐺 BESTIA + 🔥 IGNIS + 💨 VENTUS / ⚡ FULGUR + 🔥 IGNIS + 🪨 TERRA | `area` | `direction` | Calls a temporary fire dragon to scorch a battlefield zone. |
| **WORLD RUNE SERPENT** | 🐺 BESTIA + 🪨 TERRA + 💨 VENTUS | `summon` | `direction` | A mountable lane-control serpent that slithers through the fight and launches enemies upward. |
| **SPIRIT WOLF** | ❄️ AQUA + 🪨 TERRA + 💨 VENTUS | `summon` | `direction` | Summons a quick frost spirit that hunts nearby enemies. |
| **SIEGE GOLEM** | ⚡ FULGUR + 🪨 TERRA + 🪨 TERRA | `summon` | `direction` | Summons a slow, durable golem that presses objectives. |
| **APOCALYPTIC HEAVENSURGE** | ⚡ FULGUR + 🔥 IGNIS + 💨 VENTUS | `area` | `direction` | Cataclysmic storm of Fire, Wind, and Thunder engulfing the battlefield! |
| **ANNIHILATION BEAM** | ★ ANNIHILATION BEAM | `beam` | `direction` | Charges a massive energy sphere then fires a devastating beam across half the lane. |

### 3.1 Fundamental — eine Rune

#### IGNIS FIREBALL `fireball`

| | |
|---|---|
| **Rezept** | <img src="runes/ignis.svg" width="32" alt="ignis"> 🔥 IGNIS |
| **Tier** | 1 | 
| **Mana (gebunden)** | 10 |
| **Delivery** | `projectile` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | reflectable, capturable, blockable |
| **Farbe** | `#ff5722` |
| **Beschreibung** | Explosive projectile burning enemies. |
| **Visualisierung** | A glowing orb with a white core, orange middle and red-orange edge flies straight ahead trailing fire particles, then bursts in an orange shockwave with sparks. |

#### GALE SHOCKWAVE `gale_blast`

| | |
|---|---|
| **Rezept** | <img src="runes/ventus.svg" width="32" alt="ventus"> 💨 VENTUS |
| **Tier** | 1 | 
| **Mana (gebunden)** | 10 |
| **Delivery** | `area` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#00bcd4` |
| **Beschreibung** | High-velocity wind wave knocking enemies back. |
| **Visualisierung** | A thin cyan crescent arc flies fast along the lane, shedding wind particles and leaving a gust trail behind it. |

#### ARC LIGHTNING `chain_lightning`

| | |
|---|---|
| **Rezept** | <img src="runes/fulgur.svg" width="32" alt="fulgur"> ⚡ FULGUR |
| **Tier** | 1 | 
| **Mana (gebunden)** | 12 |
| **Delivery** | `area` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ffeb3b` |
| **Beschreibung** | Crackling bolt leaping between targets. |
| **Visualisierung** | Pale-yellow zig-zag bolts with a gold glow flash briefly from target to target (or straight ahead), with yellow hit sparks. |

#### STONE SPIKES `stone_spikes`

| | |
|---|---|
| **Rezept** | <img src="runes/terra.svg" width="32" alt="terra"> 🪨 TERRA |
| **Tier** | 1 | 
| **Mana (gebunden)** | 10 |
| **Delivery** | `area` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#795548` |
| **Beschreibung** | Erupts jagged stone spikes from the ground. |
| **Visualisierung** | Four dark-brown triangular rock spikes shoot up from the ground one after another, each taller than the last, over a ground crack. |

#### FROST NOVA `frost_nova`

| | |
|---|---|
| **Rezept** | <img src="runes/aqua.svg" width="32" alt="aqua"> ❄️ AQUA |
| **Tier** | 1 | 
| **Mana (gebunden)** | 10 |
| **Delivery** | `area` |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#00e5ff` |
| **Beschreibung** | Freezes surrounding foes solid. |
| **Visualisierung** | A cyan ring expands quickly around the caster's feet and leaves an icy ground patch; frozen enemies get a translucent cyan ice block. |

#### BEAST FAMILIAR `summon_lesser_beast`

| | |
|---|---|
| **Rezept** | <img src="runes/bestia.svg" width="32" alt="bestia"> 🐺 BESTIA |
| **Tier** | 1 | 
| **Mana (gebunden)** | 18 |
| **Delivery** | `summon` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#b388ff` |
| **Beschreibung** | Summons a short-lived hunter familiar. |
| **Beschwörung** | Summons fight on their own. Mountable ones can be ridden with the MOUNT button when you stand next to them. |
| **Visualisierung** | The untinted spirit-wolf sprite (about 58px) appears in a lilac shockwave with particles and runs around with a small lilac health bar. |

#### CONSTRUCT BULWARK `construct_bulwark`

| | |
|---|---|
| **Rezept** | <img src="runes/construct.svg" width="32" alt="construct"> ⚙️ KONSTRUKT |
| **Tier** | 1 | 
| **Mana (gebunden)** | 16 |
| **Delivery** | `wall` |
| **Zielmodus** | `placement` |
| **Interaktions-Tags** | — |
| **Farbe** | `#b0bec5` |
| **Beschreibung** | Raises a short physical barrier in front of the caster. |
| **Wirkung im Spiel** | A short, low wall along your swipe — quick cover against shots. |
| **Visualisierung** | A row of blue-grey stone blocks with lit top faces and masonry lines rises along the swiped line, with construct particles around it. |

#### VOID BOLT `void_bolt`

| | |
|---|---|
| **Rezept** | <img src="runes/void.svg" width="32" alt="void"> 🕳️ VOID |
| **Tier** | 1 | 
| **Mana (gebunden)** | 16 |
| **Delivery** | `projectile` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | reflectable, capturable, blockable |
| **Farbe** | `#d500f9` |
| **Beschreibung** | Fires a void projectile that slows the first target hit. |
| **Visualisierung** | A smaller, faster orb with a pale-pink core, magenta middle and deep-purple edge, trailing void particles and bursting in a magenta shockwave. |

#### HALO PULSE `halo_pulse`

| | |
|---|---|
| **Rezept** | <img src="runes/lux.svg" width="32" alt="lux"> ☀ LUX |
| **Tier** | 1 | 
| **Mana (gebunden)** | 12 |
| **Delivery** | `area` |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ffe082` |
| **Beschreibung** | A ring of sunlight: heals you and nearby allies, sears and dazzles nearby enemies. |
| **Wirkung im Spiel** | A ring of sunlight: heals you and nearby allies, sears and slows nearby enemies. |
| **Visualisierung** | A warm golden-white elliptical ring spreads across the ground with a faint gold fill and ten short light rays rising from it, then fades. |

#### SHADOW STEP `shadow_step`

| | |
|---|---|
| **Rezept** | <img src="runes/umbra.svg" width="32" alt="umbra"> ☾ UMBRA |
| **Tier** | 1 | 
| **Mana (gebunden)** | 12 |
| **Delivery** | `dash` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#7e57c2` |
| **Beschreibung** | Sink into your shadow and rise behind the nearest enemy ahead and strike it from its shadow. |
| **Wirkung im Spiel** | You sink into your shadow and rise behind the nearest enemy ahead, striking it from behind. |
| **Visualisierung** | No dedicated visual: the caster teleports instantly, with small dark-purple shockwave rings where they leave and where they appear. |

### 3.2 Solo-Spezialrunen

#### SHADOW DOPPELGANGER `shadow_doppelganger`

| | |
|---|---|
| **Rezept** | <img src="runes/doppel.svg" width="32" alt="doppel"> ♊ DOPPEL |
| **Tier** | 2 | 
| **Mana (gebunden)** | 22 |
| **Delivery** | `summon` · Spezial (nicht fusionierbar) |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#5e35b1` |
| **Beschreibung** | Your shadow rises as a weaker double with its own health and fights beside you. Casting again replaces the oldest double (Shadow passives keep more at once). |
| **Wirkung im Spiel** | A shadow double of you appears and fights on its own (40 % of your health). Casting again replaces the oldest double; Shadow passives keep more at once. |
| **Visualisierung** | A copy of the caster's own sprite, tinted dark violet and slightly see-through, rises behind them giving off purple void motes. |

#### REVENANT CALL `revenant_call`

| | |
|---|---|
| **Rezept** | <img src="runes/mortis.svg" width="32" alt="mortis"> ☠ MORTIS |
| **Tier** | 2 | 
| **Mana (gebunden)** | 26 |
| **Delivery** | `summon` · Spezial (nicht fusionierbar) |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#9ccc65` |
| **Beschreibung** | A forbidden seal raises the nearest fallen fighter as a bound revenant; when its borrowed body breaks it bursts. Casting again replaces the oldest revenant. |
| **Wirkung im Spiel** | Raises the nearest fallen fighter (soul wisp on the ground) as your revenant; without one a fallen soldier rises. It bursts when destroyed. Casting again replaces the oldest. |
| **Visualisierung** | A pale green-tinted body of a fallen fighter rises out of the ground through a green seal ellipse, kicking up dust, and later bursts in a green shockwave. |

### 3.3 Compound — zwei Runen

#### STORM WOLF `summon_storm_wolf`

| | |
|---|---|
| **Rezept** | <img src="runes/bestia.svg" width="32" alt="bestia"> <img src="runes/fulgur.svg" width="32" alt="fulgur"> 🐺 BESTIA + ⚡ FULGUR |
| **Tier** | 2 | 
| **Mana (gebunden)** | 30 (Katalogwert 26) |
| **Delivery** | `summon` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ffd54f` |
| **Beschreibung** | A lightning Hunter that bypasses the minion line to chase the Wizard. |
| **Beschwörung** | Summons fight on their own. Mountable ones can be ridden with the MOUNT button when you stand next to them. |
| **Visualisierung** | The storm-wolf sprite (about 58px) appears in a yellow shockwave with lightning particles and has a small yellow health bar. |

#### VOID SPIDER `summon_void_spider`

| | |
|---|---|
| **Rezept** | <img src="runes/bestia.svg" width="32" alt="bestia"> <img src="runes/void.svg" width="32" alt="void"> 🐺 BESTIA + 🕳️ VOID |
| **Tier** | 2 | 
| **Mana (gebunden)** | 34 |
| **Delivery** | `summon` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#d500f9` |
| **Beschreibung** | A Control summon that entangles nearby enemies in slowing void webs. |
| **Beschwörung** | Summons fight on their own. Mountable ones can be ridden with the MOUNT button when you stand next to them. |
| **Visualisierung** | The void-spider sprite appears in a magenta shockwave with void particles; its bites leave small magenta shockwaves. |

#### RUNE GOLEM `summon_rune_golem`

| | |
|---|---|
| **Rezept** | <img src="runes/construct.svg" width="32" alt="construct"> <img src="runes/terra.svg" width="32" alt="terra"> ⚙️ KONSTRUKT + 🪨 TERRA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 26 (Katalogwert 38) |
| **Delivery** | `summon` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#b0bec5` |
| **Beschreibung** | A durable Vanguard that binds defenders and marches on objectives. |
| **Beschwörung** | Summons fight on their own. Mountable ones can be ridden with the MOUNT button when you stand next to them. |
| **Visualisierung** | The siege-golem sprite, untinted and about 84px tall, appears in a pale-grey shockwave and lumbers forward with a grey health bar. |

#### FIRESTORM VORTEX `firestorm`

| | |
|---|---|
| **Rezept** | <img src="runes/ignis.svg" width="32" alt="ignis"> <img src="runes/ventus.svg" width="32" alt="ventus"> 🔥 IGNIS + 💨 VENTUS |
| **Tier** | 2 | 
| **Mana (gebunden)** | 20 |
| **Delivery** | `zone` |
| **Zielmodus** | `ground` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ff6d00` |
| **Beschreibung** | Raging flame tornado that pulls enemies in, burns, and launches them! |
| **Wirkung im Spiel** | A flame tornado at the chosen spot pulls enemies in, burns them and finally launches them. |
| **Visualisierung** | A swirling tornado of seven stacked ellipse rings that alternate orange and yellow and widen toward the top, drifting across the lane with fire and wind particles. |

#### METEOR CATACLYSM `meteor_cataclysm`

| | |
|---|---|
| **Rezept** | <img src="runes/fulgur.svg" width="32" alt="fulgur"> <img src="runes/ignis.svg" width="32" alt="ignis"> ⚡ FULGUR + 🔥 IGNIS |
| **Tier** | 2 | 
| **Mana (gebunden)** | 22 |
| **Delivery** | `heavy_object` |
| **Zielmodus** | `ground` |
| **Interaktions-Tags** | beamDamageable |
| **Farbe** | `#d50000` |
| **Beschreibung** | Calls down a blazing meteor that creates an explosive magma crater! A strong beam can shatter it mid-fall. |
| **Wirkung im Spiel** | A meteor falls on the chosen spot and leaves a burning crater. An enemy beam can shatter it while it falls. |
| **Visualisierung** | A glowing red-orange ball with a yellow glow streaks down at an angle, hits in a big red shockwave with sparks, and leaves a translucent red molten crater. |

#### TEMPEST BLITZ `tempest_blitz`

| | |
|---|---|
| **Rezept** | <img src="runes/fulgur.svg" width="32" alt="fulgur"> <img src="runes/ventus.svg" width="32" alt="ventus"> ⚡ FULGUR + 💨 VENTUS |
| **Tier** | 2 | 
| **Mana (gebunden)** | 22 |
| **Delivery** | `dash` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#00e5ff` |
| **Beschreibung** | Transforms into lightning, dashing forward and slashing all enemies! |
| **Wirkung im Spiel** | You become lightning and dash forward, slashing every enemy on your way. |
| **Visualisierung** | The caster blinks forward along a glowing cyan straight line, with cyan shockwave rings at the start and end points. |

#### MAGMA FISSURE `magma_fissure`

| | |
|---|---|
| **Rezept** | <img src="runes/ignis.svg" width="32" alt="ignis"> <img src="runes/terra.svg" width="32" alt="terra"> 🔥 IGNIS + 🪨 TERRA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 20 |
| **Delivery** | `zone` |
| **Zielmodus** | `ground` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ff3d00` |
| **Beschreibung** | Ruptures the earth with geysers of molten lava! |
| **Wirkung im Spiel** | The ground at the chosen spot splits open with lava geysers; standing in it burns. |
| **Visualisierung** | A flat glowing red-orange ellipse of molten ground sits on the lane with fire particles bubbling up from it. |

#### SANDSTORM BASTION `sandstorm_bastion`

| | |
|---|---|
| **Rezept** | <img src="runes/terra.svg" width="32" alt="terra"> <img src="runes/ventus.svg" width="32" alt="ventus"> 🪨 TERRA + 💨 VENTUS |
| **Tier** | 2 | 
| **Mana (gebunden)** | 20 |
| **Delivery** | `self` |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ffd600` |
| **Beschreibung** | Swirling wall of stone and wind deflecting enemy attacks. |
| **Wirkung im Spiel** | A whirl of sand and stone around you deflects incoming shots for a while. |
| **Visualisierung** | A dashed golden-yellow circle with a pale-cyan glow surrounds the caster, with sand and wind particles swirling inside. |

#### BLIZZARD SURGE `blizzard_surge`

| | |
|---|---|
| **Rezept** | <img src="runes/aqua.svg" width="32" alt="aqua"> <img src="runes/ventus.svg" width="32" alt="ventus"> ❄️ AQUA + 💨 VENTUS |
| **Tier** | 2 | 
| **Mana (gebunden)** | 20 |
| **Delivery** | `zone` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#80d8ff` |
| **Beschreibung** | Freezing gale freezing minions and drastically slowing enemy lane push. |
| **Wirkung im Spiel** | A freezing gale in front of you freezes minions and slows everything it hits. |
| **Visualisierung** | A pale icy-blue ring outline drifts slowly forward, shedding water and ice particles and leaving ice patches on the ground. |

#### AURA SHOCK `aura_shock`

| | |
|---|---|
| **Rezept** | <img src="runes/aqua.svg" width="32" alt="aqua"> <img src="runes/fulgur.svg" width="32" alt="fulgur"> ❄️ AQUA + ⚡ FULGUR |
| **Tier** | 2 | 
| **Mana (gebunden)** | 22 (Katalogwert 20) · Cooldown 3.5 s |
| **Delivery** | `area` |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#b388ff` |
| **Beschreibung** | Frost-lightning pulse blasting surrounding enemies away. |
| **Wirkung im Spiel** | A frost-lightning pulse blasts nearby enemies away from you (short cooldown). |
| **Visualisierung** | A violet shockwave ring bursts out from the caster with lightning particles and electrified ground; lilac sparks fly off hit enemies. |

#### ARCANE AEGIS `arcane_aegis`

| | |
|---|---|
| **Rezept** | <img src="runes/aqua.svg" width="32" alt="aqua"> <img src="runes/terra.svg" width="32" alt="terra"> ❄️ AQUA + 🪨 TERRA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 20 (Katalogwert 30) · Cooldown 8 s |
| **Delivery** | `self` |
| **Zielmodus** | `ally` |
| **Interaktions-Tags** | — |
| **Farbe** | `#b388ff` |
| **Beschreibung** | A temporary protective aura that absorbs incoming damage. |
| **Wirkung im Spiel** | The chosen ally gets a shield that absorbs damage for a while. |
| **Visualisierung** | A glowing violet translucent oval bubble surrounds the caster (or a smaller pulsing violet circle forms around an ally), with a violet shockwave on cast. |

#### STONE WALL `stone_wall`

| | |
|---|---|
| **Rezept** | <img src="runes/terra.svg" width="32" alt="terra"> <img src="runes/terra.svg" width="32" alt="terra"> 🪨 TERRA + 🪨 TERRA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 20 (Katalogwert 25) |
| **Delivery** | `wall` |
| **Zielmodus** | `placement` |
| **Interaktions-Tags** | — |
| **Farbe** | `#8d6e63` |
| **Beschreibung** | Raises a temporary earth wall that stops hostile movement and projectiles. |
| **Wirkung im Spiel** | Raises a wall along your swipe. It blocks enemies and their projectiles until it is broken or expires; you cannot walk through it either. |
| **Visualisierung** | A row of dark-brown stone blocks with lighter top faces and masonry lines rises up, cracks as it is damaged, and collapses into dust and rubble. |

#### INFERNO BEAM `inferno_beam`

| | |
|---|---|
| **Rezept** | <img src="runes/ignis.svg" width="32" alt="ignis"> <img src="runes/ignis.svg" width="32" alt="ignis"> 🔥 IGNIS + 🔥 IGNIS |
| **Tier** | 2 | 
| **Mana (gebunden)** | 20 |
| **Delivery** | `beam` (Beam-Profil `inferno`) |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | clashable, blockable |
| **Farbe** | `#ff6d00` |
| **Beschreibung** | A sustained straight fire beam. Meets an enemy beam tip-to-tip for a Beam Clash. |
| **Wirkung im Spiel** | A sustained fire beam. If an enemy beam meets it tip to tip, a Beam Clash starts: mash CAST to push your beam forward. |
| **Visualisierung** | After a short charge orb, a layered orange beam with a white-hot core shoots out, with flickering flame blobs licking along its top. |

#### GLACIAL RAY `glacial_ray`

| | |
|---|---|
| **Rezept** | <img src="runes/aqua.svg" width="32" alt="aqua"> <img src="runes/aqua.svg" width="32" alt="aqua"> ❄️ AQUA + ❄️ AQUA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 20 |
| **Delivery** | `beam` (Beam-Profil `glacial`) |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | clashable, blockable |
| **Farbe** | `#80deea` |
| **Beschreibung** | A freezing ray that slows everything it touches. Clashable. |
| **Wirkung im Spiel** | A sustained freezing ray that slows what it touches. Meeting an enemy beam starts a Beam Clash: mash CAST to win it. |
| **Visualisierung** | After a short charge orb, a layered pale-cyan beam with a white core shoots out, with small crystal shard spikes along its upper edge. |

#### THUNDER LANCE `thunder_lance`

| | |
|---|---|
| **Rezept** | <img src="runes/fulgur.svg" width="32" alt="fulgur"> <img src="runes/fulgur.svg" width="32" alt="fulgur"> ⚡ FULGUR + ⚡ FULGUR |
| **Tier** | 2 | 
| **Mana (gebunden)** | 24 |
| **Delivery** | `beam` (Beam-Profil `thunder`) |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | clashable, blockable |
| **Farbe** | `#ffeb3b` |
| **Beschreibung** | A very fast, short-lived lightning beam. Clashable. |
| **Wirkung im Spiel** | A very fast, short lightning beam. Meeting an enemy beam starts a Beam Clash: mash CAST to win it. |
| **Visualisierung** | After a short charge orb, three jittering yellow and white lightning strands crackle over a faint gold glow along a long line. |

#### NULL RAY `null_ray`

| | |
|---|---|
| **Rezept** | <img src="runes/void.svg" width="32" alt="void"> <img src="runes/void.svg" width="32" alt="void"> 🕳️ VOID + 🕳️ VOID |
| **Tier** | 2 | 
| **Mana (gebunden)** | 32 |
| **Delivery** | `beam` (Beam-Profil `null`) |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | clashable, blockable |
| **Farbe** | `#d500f9` |
| **Beschreibung** | A void beam that drags its targets toward the caster. Clashable. |
| **Wirkung im Spiel** | A void beam that drags its targets toward you. Meeting an enemy beam starts a Beam Clash: mash CAST to win it. |
| **Visualisierung** | After a short charge orb, a magenta-edged beam with a nearly black center and a thin pale core shoots out, with pink motes drifting back toward the caster. |

#### MIRROR WARD `mirror_ward`

| | |
|---|---|
| **Rezept** | <img src="runes/construct.svg" width="32" alt="construct"> <img src="runes/ventus.svg" width="32" alt="ventus"> ⚙️ KONSTRUKT + 💨 VENTUS |
| **Tier** | 2 | 
| **Mana (gebunden)** | 26 |
| **Delivery** | `capture` |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#b2ebf2` |
| **Beschreibung** | A ward that captures up to five hostile projectiles, then fires them back as a volley. |
| **Wirkung im Spiel** | A ward appears in front of you and catches up to five enemy projectiles. After a moment it fires all of them back as a volley. |
| **Visualisierung** | A pulsing pale-cyan ellipse ring surrounds the caster, with captured shots orbiting it as colored dots until they fire back as glowing bolts. |

#### GRAVITY LIFT `gravity_lift`

| | |
|---|---|
| **Rezept** | <img src="runes/ventus.svg" width="32" alt="ventus"> <img src="runes/void.svg" width="32" alt="void"> 💨 VENTUS + 🕳️ VOID |
| **Tier** | 2 | 
| **Mana (gebunden)** | 26 |
| **Delivery** | `telekinesis` |
| **Zielmodus** | `ground` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ce93d8` |
| **Beschreibung** | Telekinesis: lifts up to four nearby enemies, holds them in the air, then slams them down. |
| **Wirkung im Spiel** | Up to four enemies near the chosen spot are lifted and held in the air (Telekinetic Grip: more, longer). While they hang: ATTACK FORWARD to throw them away, ATTACK WHILE HOLDING BACK to pull them to you — or wait and they are slammed into the ground. |
| **Visualisierung** | Thin lilac curved threads run from the caster's hand to each enemy hovering in the air, with a lilac ring under each one, then they are slammed down. |

#### SEISMIC SLAM `seismic_slam`

| | |
|---|---|
| **Rezept** | <img src="runes/fulgur.svg" width="32" alt="fulgur"> <img src="runes/terra.svg" width="32" alt="terra"> ⚡ FULGUR + 🪨 TERRA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 22 |
| **Delivery** | `slam` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#a1887f` |
| **Beschreibung** | A travelling ground shockwave that launches enemies and leaves short-lived rock pillars. |
| **Wirkung im Spiel** | A shockwave travels along the ground in front of you, launches enemies and leaves short rock pillars that block for a moment. |
| **Visualisierung** | A line of brown triangular ground spikes and cracks travels forward with earth particles, leaving short-lived brown rock pillars behind. |

#### TITAN STOMP `titan_stomp`

| | |
|---|---|
| **Rezept** | <img src="runes/bestia.svg" width="32" alt="bestia"> <img src="runes/terra.svg" width="32" alt="terra"> 🐺 BESTIA + 🪨 TERRA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 28 |
| **Delivery** | `stomp` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#8d6e63` |
| **Beschreibung** | Leap up and crash down: hits grounded and airborne enemies around the landing point. |
| **Wirkung im Spiel** | You leap up and crash down: everything around the landing point is hit — also enemies in the air. |
| **Visualisierung** | The caster leaps and crashes down; a wide brownish ellipse shockwave spreads and fades on landing, leaving a crater and earth particles. |

#### DRAGON BREATH `dragon_breath`

| | |
|---|---|
| **Rezept** | <img src="runes/bestia.svg" width="32" alt="bestia"> <img src="runes/ignis.svg" width="32" alt="ignis"> 🐺 BESTIA + 🔥 IGNIS |
| **Tier** | 2 | 
| **Mana (gebunden)** | 28 |
| **Delivery** | `cone` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | blockable |
| **Farbe** | `#ff8f00` |
| **Beschreibung** | A wide cone of chunky flame that widens with distance and burns everything inside. |
| **Wirkung im Spiel** | A wide cone of fire in front of you that widens with distance and burns everything inside. |
| **Visualisierung** | A widening cone of chunky dark-outlined flame blobs streams forward, going from yellow to orange to red and ending as grey smoke. |

#### BURROW STRIKE `burrow_strike`

| | |
|---|---|
| **Rezept** | <img src="runes/terra.svg" width="32" alt="terra"> <img src="runes/void.svg" width="32" alt="void"> 🪨 TERRA + 🕳️ VOID |
| **Tier** | 2 | 
| **Mana (gebunden)** | 26 |
| **Delivery** | `burrow` |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#a1887f` |
| **Beschreibung** | Dig underground: untouchable and fast for a moment, then erupt and launch everything around you. |
| **Wirkung im Spiel** | You dig in: untouchable and faster for a moment. Move under your enemies — you erupt automatically and launch everyone around you. |
| **Visualisierung** | A wobbling brown dirt mound with pebbles marks the buried caster, then six brown rock shards burst outward in an arc when they come up. |

#### SHADOW STOMPER `shadow_stomper`

| | |
|---|---|
| **Rezept** | <img src="runes/terra.svg" width="32" alt="terra"> <img src="runes/umbra.svg" width="32" alt="umbra"> 🪨 TERRA + ☾ UMBRA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 22 |
| **Delivery** | `stomp` |
| **Zielmodus** | `aim` |
| **Interaktions-Tags** | — |
| **Farbe** | `#7e57c2` |
| **Beschreibung** | Aim, then stomp: your shadow races to the nearest enemy in that cone and holds its shadow — the target cannot move. Guarding targets slip free. |
| **Wirkung im Spiel** | You hop and stomp; your shadow runs to the nearest enemy in the cone and holds it in place (no walking, jumping or dashing). Enemies who guard in time slip free. Walk too far away and the hold breaks. |
| **Visualisierung** | After a hop and a stomp, a wavy dark-violet ribbon of shadow races over the ground to the target, forming a dark pool with clutching shadow fingers under it. |

#### RADIANT LANCE `radiant_lance`

| | |
|---|---|
| **Rezept** | <img src="runes/lux.svg" width="32" alt="lux"> <img src="runes/lux.svg" width="32" alt="lux"> ☀ LUX + ☀ LUX |
| **Tier** | 2 | 
| **Mana (gebunden)** | 24 |
| **Delivery** | `beam` (Beam-Profil `radiant`) |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | clashable, blockable |
| **Farbe** | `#ffe082` |
| **Beschreibung** | A blinding beam of light that dazzles what it touches. Clashable. |
| **Wirkung im Spiel** | A blinding light beam that slows what it touches. Meeting an enemy beam starts a Beam Clash: mash CAST to win it. |
| **Visualisierung** | After a short charge orb, a bright golden beam with a pulsing glow and a white core shoots out, with tiny glinting motes drifting along it. |

#### FROST MIRROR GATE `mirror_gate`

| | |
|---|---|
| **Rezept** | <img src="runes/aqua.svg" width="32" alt="aqua"> <img src="runes/void.svg" width="32" alt="void"> ❄️ AQUA + 🕳️ VOID |
| **Tier** | 2 | 
| **Mana (gebunden)** | 26 |
| **Delivery** | `zone` |
| **Zielmodus** | `dual` |
| **Interaktions-Tags** | — |
| **Farbe** | `#80deea` |
| **Beschreibung** | Set two points: an ice mirror rises at each. Step into one to come out of the other — an escape route back to the entrance of a long Dungeon room, or a sudden flank. |
| **Wirkung im Spiel** | Two ice mirrors appear at your points. Step into one to come out of the other (step off before it works again). Lasts 30 s, twice as long in the Dungeon. |
| **Visualisierung** | Two standing ice mirrors appear, each with a teal frame, a glassy gradient face, moving shine streaks, ice crystals on top and a frosty ground ring. |

#### SOUL SEEKERS `soul_seekers`

| | |
|---|---|
| **Rezept** | <img src="runes/ignis.svg" width="32" alt="ignis"> <img src="runes/void.svg" width="32" alt="void"> 🔥 IGNIS + 🕳️ VOID |
| **Tier** | 2 | 
| **Mana (gebunden)** | 26 |
| **Delivery** | `homing` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | reflectable, capturable, blockable |
| **Farbe** | `#ea80fc` |
| **Beschreibung** | A salvo of three homing void flames that steer toward enemies within a turn limit. |
| **Wirkung im Spiel** | Three homing flames fan out and steer toward the nearest enemies. They can be reflected, captured or blocked. |
| **Visualisierung** | Three small glowing pink-violet orbs with white cores fan out a moment apart and curve toward enemies, trailing void particles. |

### 3.4 Himmelsfelder (Compound, nur eines gleichzeitig aktiv)

#### SOLAR ORB `solar_orb`

| | |
|---|---|
| **Rezept** | <img src="runes/ignis.svg" width="32" alt="ignis"> <img src="runes/lux.svg" width="32" alt="lux"> 🔥 IGNIS + ☀ LUX |
| **Tier** | 2 | 
| **Mana (gebunden)** | 22 (Katalogwert 24) |
| **Delivery** | `self` · Himmelsfeld |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ffca28` |
| **Beschreibung** | Summons a sun: bright light, short shadows. Fire and light grow stronger, ice melts fast, shadow magic weakens. |
| **Wirkung im Spiel** | A sun rises for a while: fire and light grow stronger, ice and shadow weaker, shadows get short. Only one sky sphere at a time. |
| **Visualisierung** | A golden light pillar rises; a pixel-art sun with rotating rays appears in the sky's top right, and the field gets a warm golden tint. |

#### LUNAR ORB `lunar_orb`

| | |
|---|---|
| **Rezept** | <img src="runes/aqua.svg" width="32" alt="aqua"> <img src="runes/umbra.svg" width="32" alt="umbra"> ❄️ AQUA + ☾ UMBRA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 22 (Katalogwert 24) |
| **Delivery** | `self` · Himmelsfeld |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#b3c7ff` |
| **Beschreibung** | Summons a moon: long shadows and a rising tide. Water, ice and shadow grow stronger, puddles slow and conduct harder, fire weakens. |
| **Wirkung im Spiel** | A moon rises: water, ice and shadow grow stronger, puddles appear under enemies and slow them, fire weakens. Only one sky sphere at a time. |
| **Visualisierung** | A light pillar rises; a pale-blue cratered pixel moon appears in the sky, the field darkens to deep blue and shadows grow longer. |

#### ECLIPSE `eclipse`

| | |
|---|---|
| **Rezept** | <img src="runes/lux.svg" width="32" alt="lux"> <img src="runes/umbra.svg" width="32" alt="umbra"> ☀ LUX + ☾ UMBRA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 24 (Katalogwert 28) |
| **Delivery** | `self` · Himmelsfeld |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ffd54f` |
| **Beschreibung** | Sun and moon meet: light and shadow magic surge, every other element dims, shadows grow huge. |
| **Wirkung im Spiel** | Light and shadow magic surge, every other element dims. Only one sky sphere at a time. |
| **Visualisierung** | A light pillar rises; a black disc covering a glowing yellow corona with flickering rays appears in the sky, and the field turns very dark. |

#### THUNDERHEAD `thunderhead`

| | |
|---|---|
| **Rezept** | <img src="runes/fulgur.svg" width="32" alt="fulgur"> <img src="runes/umbra.svg" width="32" alt="umbra"> ⚡ FULGUR + ☾ UMBRA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 24 (Katalogwert 26) |
| **Delivery** | `self` · Himmelsfeld |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#90a4ae` |
| **Beschreibung** | A black storm cloud strikes your enemies and their puddles with lightning. Fire burns out quickly. |
| **Wirkung im Spiel** | A storm cloud strikes your enemies and their puddles with lightning every few seconds. Only one sky sphere at a time. |
| **Visualisierung** | A light pillar rises; dark grey pixel storm clouds with flickering lightning appear in the sky, yellow rings mark strikes and lightning sprites hit with screen flashes. |

#### BLOOD MOON `blood_moon`

| | |
|---|---|
| **Rezept** | <img src="runes/ignis.svg" width="32" alt="ignis"> <img src="runes/umbra.svg" width="32" alt="umbra"> 🔥 IGNIS + ☾ UMBRA |
| **Tier** | 2 | 
| **Mana (gebunden)** | 22 (Katalogwert 26) |
| **Delivery** | `self` · Himmelsfeld |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#e53935` |
| **Beschreibung** | A red moon: all spells hit harder, healing is halved, shadows turn red. Your doubles and revenants grow savage. |
| **Wirkung im Spiel** | All spells hit harder (for everyone!), healing is halved. Only one sky sphere at a time. |
| **Visualisierung** | A light pillar rises; a dark-red cratered pixel moon with a red glow appears in the sky, the field takes a crimson tint and shadows turn red. |

#### STARFALL `starfall`

| | |
|---|---|
| **Rezept** | <img src="runes/lux.svg" width="32" alt="lux"> <img src="runes/ventus.svg" width="32" alt="ventus"> ☀ LUX + 💨 VENTUS |
| **Tier** | 2 | 
| **Mana (gebunden)** | 22 (Katalogwert 26) |
| **Delivery** | `self` · Himmelsfeld |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#e1f5fe` |
| **Beschreibung** | A night sky of falling stars that rain down on your enemies. |
| **Wirkung im Spiel** | Stars rain down on your enemies for a while. Only one sky sphere at a time. |
| **Visualisierung** | A light pillar rises; twinkling pixel stars fill the sky, and shooting stars streak down onto pale ground rings, flashing white on impact. |

#### AURORA VEIL `aurora_veil`

| | |
|---|---|
| **Rezept** | <img src="runes/aqua.svg" width="32" alt="aqua"> <img src="runes/lux.svg" width="32" alt="lux"> ❄️ AQUA + ☀ LUX |
| **Tier** | 2 | 
| **Mana (gebunden)** | 22 (Katalogwert 24) |
| **Delivery** | `self` · Himmelsfeld |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#69f0ae` |
| **Beschreibung** | Northern lights: your side slowly regenerates health and mana, ice grows stronger. |
| **Wirkung im Spiel** | Your side slowly regenerates health and mana. Only one sky sphere at a time. |
| **Visualisierung** | A light pillar rises; wavy green, blue and violet aurora bands ripple across the sky, and the field gets a teal tint. |

### 3.5 Advanced — drei Runen

#### VOID IMPLOSION `void_implosion`

| | |
|---|---|
| **Rezept** | <img src="runes/bestia.svg" width="32" alt="bestia"> <img src="runes/terra.svg" width="32" alt="terra"> <img src="runes/void.svg" width="32" alt="void"> 🐺 BESTIA + 🪨 TERRA + 🕳️ VOID |
| **Tier** | 3 | 
| **Mana (gebunden)** | 44 |
| **Delivery** | `zone` |
| **Zielmodus** | `ground` |
| **Interaktions-Tags** | — |
| **Farbe** | `#b668ff` |
| **Beschreibung** | Creates a void singularity that pulls enemies in and crushes them with dimensional collapse. |
| **Wirkung im Spiel** | A void singularity at the chosen spot pulls enemies in and crushes them. |
| **Visualisierung** | A pulsing dark sphere with a black center fading to violet, with dashed rotating violet arcs and orbiting lilac dots, then a solid violet flash that shrinks away. |

#### INFERNO RAMPAGE `inferno_rampage`

| | |
|---|---|
| **Rezept** | <img src="runes/bestia.svg" width="32" alt="bestia"> <img src="runes/ignis.svg" width="32" alt="ignis"> <img src="runes/void.svg" width="32" alt="void"> 🐺 BESTIA + 🔥 IGNIS + 🕳️ VOID |
| **Tier** | 3 | 
| **Mana (gebunden)** | 44 |
| **Delivery** | `dash` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ff6f3b` |
| **Beschreibung** | Blazing fire dash that scorches everything in its path across the lane. |
| **Wirkung im Spiel** | A blazing dash across the lane that scorches everything on the way. |
| **Visualisierung** | A big pulsing fireball head races along the ground trailing alternating orange and yellow fire blobs, orbiting yellow sparks and scorch marks. |

#### ARKENGESTELL `eidolon_mantle`

| | |
|---|---|
| **Rezept** | — |
| **Tier** | 3 | 
| **Mana (gebunden)** | — · Cooldown 18 s |
| **Delivery** | `self` |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#8e67f0` |
| **Beschreibung** | An open arcane force frame around the Wizard: damage resistance, knockback resistance and empowered melee. |
| **Wirkung im Spiel** | A spectral guardian forms around you: you take less damage and knockback and your melee hits harder for a while. |
| **Visualisierung** | A huge see-through violet skeletal guardian forms behind the caster: void flames, a horned skull helm, purple armor and a crystal greatsword, plus a violet glow around them. |

#### RISSWILD `ninefold_beast_form`

| | |
|---|---|
| **Rezept** | — |
| **Tier** | 3 | 
| **Mana (gebunden)** | — · Cooldown 22 s |
| **Delivery** | `self` |
| **Zielmodus** | `self` |
| **Interaktions-Tags** | — |
| **Farbe** | `#f29b35` |
| **Beschreibung** | Three cracked molten energy bands: faster movement, savage melee and light damage resistance. |
| **Wirkung im Spiel** | A flame fox spirit surrounds you: you move faster, your melee becomes savage and you take a little less damage. |
| **Visualisierung** | Nine flame tails in orange, amber and yellow fan out behind the caster, with a fiery fox-spirit head above them and an orange glow around the body. |

#### DRAGON INVOCATION `dragon_invocation`

| | |
|---|---|
| **Rezept** | <img src="runes/bestia.svg" width="32" alt="bestia"> <img src="runes/ignis.svg" width="32" alt="ignis"> <img src="runes/ventus.svg" width="32" alt="ventus"> 🐺 BESTIA + 🔥 IGNIS + 💨 VENTUS<br>oder <img src="runes/fulgur.svg" width="32" alt="fulgur"> <img src="runes/ignis.svg" width="32" alt="ignis"> <img src="runes/terra.svg" width="32" alt="terra"> ⚡ FULGUR + 🔥 IGNIS + 🪨 TERRA |
| **Tier** | 3 | 
| **Mana (gebunden)** | 38 (Katalogwert 70) |
| **Delivery** | `area` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ff7043` |
| **Beschreibung** | Calls a temporary fire dragon to scorch a battlefield zone. |
| **Visualisierung** | A large fire-dragon sprite (about 170px) appears above the field, breathes a glowing yellow-orange flame line at the ground, then fades out with a big orange shockwave. |

#### WORLD RUNE SERPENT `summon_rune_snake`

| | |
|---|---|
| **Rezept** | <img src="runes/bestia.svg" width="32" alt="bestia"> <img src="runes/terra.svg" width="32" alt="terra"> <img src="runes/ventus.svg" width="32" alt="ventus"> 🐺 BESTIA + 🪨 TERRA + 💨 VENTUS |
| **Tier** | 3 | 
| **Mana (gebunden)** | 38 (Katalogwert 48) |
| **Delivery** | `summon` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#b668ff` |
| **Beschreibung** | A mountable lane-control serpent that slithers through the fight and launches enemies upward. |
| **Beschwörung** | Summons fight on their own. Mountable ones can be ridden with the MOUNT button when you stand next to them. |
| **Visualisierung** | The world-rune-serpent sprite (about 90px) appears in a violet shockwave with void particles; its attacks give off violet shockwaves. |

#### SPIRIT WOLF `summon_spirit_wolf`

| | |
|---|---|
| **Rezept** | <img src="runes/aqua.svg" width="32" alt="aqua"> <img src="runes/terra.svg" width="32" alt="terra"> <img src="runes/ventus.svg" width="32" alt="ventus"> ❄️ AQUA + 🪨 TERRA + 💨 VENTUS |
| **Tier** | 3 | 
| **Mana (gebunden)** | 30 (Katalogwert 32) |
| **Delivery** | `summon` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#80d8ff` |
| **Beschreibung** | Summons a quick frost spirit that hunts nearby enemies. |
| **Beschwörung** | Summons fight on their own. Mountable ones can be ridden with the MOUNT button when you stand next to them. |
| **Visualisierung** | The spirit-wolf sprite (about 58px) appears in a light-blue shockwave with water particles and has a light-blue health bar. |

#### SIEGE GOLEM `summon_siege_golem`

| | |
|---|---|
| **Rezept** | <img src="runes/fulgur.svg" width="32" alt="fulgur"> <img src="runes/terra.svg" width="32" alt="terra"> <img src="runes/terra.svg" width="32" alt="terra"> ⚡ FULGUR + 🪨 TERRA + 🪨 TERRA |
| **Tier** | 3 | 
| **Mana (gebunden)** | 32 (Katalogwert 46) |
| **Delivery** | `summon` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#a1887f` |
| **Beschreibung** | Summons a slow, durable golem that presses objectives. |
| **Beschwörung** | Summons fight on their own. Mountable ones can be ridden with the MOUNT button when you stand next to them. |
| **Visualisierung** | The siege-golem sprite (about 84px) appears in a brown shockwave with earth particles and has a brown health bar. |

#### APOCALYPTIC HEAVENSURGE `apocalyptic_heavensurge`

| | |
|---|---|
| **Rezept** | <img src="runes/fulgur.svg" width="32" alt="fulgur"> <img src="runes/ignis.svg" width="32" alt="ignis"> <img src="runes/ventus.svg" width="32" alt="ventus"> ⚡ FULGUR + 🔥 IGNIS + 💨 VENTUS |
| **Tier** | 3 | 
| **Mana (gebunden)** | 32 |
| **Delivery** | `area` |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | — |
| **Farbe** | `#ff3d00` |
| **Beschreibung** | Cataclysmic storm of Fire, Wind, and Thunder engulfing the battlefield! |
| **Visualisierung** | No unique visual: it plays the Firestorm vortex, a falling Meteor with its crater and the Blizzard Surge ring together, with a heavy camera shake. |

### 3.6 Transformations-Spells

#### ANNIHILATION BEAM `annihilation_beam`

| | |
|---|---|
| **Rezept** | ★ ★ ANNIHILATION BEAM |
| **Tier** | 3 | 
| **Mana (gebunden)** | 0 |
| **Delivery** | `beam` (Beam-Profil `annihilation`) · Spezial (nicht fusionierbar) |
| **Zielmodus** | `direction` |
| **Interaktions-Tags** | clashable, blockable |
| **Farbe** | `#ff4cff` |
| **Beschreibung** | Charges a massive energy sphere then fires a devastating beam across half the lane. |
| **Wirkung im Spiel** | Charges a sphere, then fires a huge beam across half the lane. Wins most Beam Clashes. |
| **Visualisierung** | A long charge into a glowing magenta orb, then a thick pulsing magenta-pink beam with a white core and a flare at the hand, plus a camera shake. |

### 3.7 Arcane States — Buff-Transformationen (Spezialrunen · Tag: arcane-state · max. 1 pro Deck)

Quelle: `docs/GRIMGE_Transformations_Atlas_V3_1_Sonnenwyrm.md`. Jede Form ist eine Spezialrune mit dem gemeinsamen Sanduhr-Siegel ⧗, läuft 16 s (× Runenqualität), ist mit der primären Fokus-Transformation kombinierbar und verändert den Charakter-Sprite nie (nur VFX/Attachments). Es ist immer nur ein Arcane State aktiv und nur eine Arcane-State-Rune im Deck erlaubt.

| ID | Form | Archetyp der Manifestation | Palette | Sprint + Heavy | Forward kurz / voll | Up kurz / voll | Down kurz / voll | Defense · Grab · Jump |
|---|---|---|---|---|---|---|---|---|
| B01 | **Risswild**<br><sub>Drei ungleich breite, kantige Energiebänder entstehen versetzt an Hüfte und Schulter; keine Fuchsohren und keine neun Schweife. Die Bänder fließen wie zähe, in Platten brechende Flüssigkeit.</sub> | `risswild` ×3 | `#241623` `#f29b35` `#ffd774` `#ff5b25` | Beast Pounce | Rissimpuls (`cone`) / Verdichteter Risskern (`bomb`) | Bruchheber (`burst`) / Doppelter Rissaufstieg (`pillar`) | Scherfeger (`ring`) / Rissfeld-Einschlag (`sequence`) | Scherhaut · Plattenzunge · Risssprung |
| B02 | **Arkengestell**<br><sub>Vier große modulare Träger und sechs isolierte Panzerplatten formen ein offenes, asymmetrisches Kraftgestell um den Avatar. Kein riesiger Geister-Samurai, kein Schädel und keine Rippen.</sub> | `arkengestell` ×4 | `#30205d` `#8e67f0` `#d6a7ff` `#e994f2` | Kolossstoß | Glyphenbolzen (`arrow`) / Belagerungspfeil (`arrow`) | Trägerheber (`burst`) / Lichtspalter (`wall`) | Ankerstampfer (`ring`) / Gericht des Gestells (`ring`) | Schildtrichter · Greifzange · Trägersprung |
| T01 | **Kammwacht**<br><sub>Vier gestaffelte, breitkantige Rückenlamellen aus Porzellanmetall statt Drachenstacheln.</sub> | `fins/blade` ×4 | `#222c32` `#5c988e` `#e9b777` | Horn Break | Cinder Hook (`cone`) / Drake Maw (`beam`) | Spine Jab (`burst`) / Draconic Eruption (`pillar`) | Ash Heel (`ring`) / Molten Mantle (`sequence`) | Scale Aegis · Jaw Clamp · Drake Hop |
| T02 | **Schlackenkern**<br><sub>Schwebender Keramikofen als asymmetrisches Rippenband um Taille und Schulter; glühende Öffnung an der linken Hüfte.</sub> | `girdle/rib` ×4 | `#292c33` `#e4a357` `#ab78c0` | Melt Ram | Cinder Spit (`projectile`) / Volcano Lance (`beam`) | Ash Vent (`burst`) / Eruption Crown (`pillar`) | Soot Stomp (`ring`) / Crater Heart (`sequence`) | Basalt Shell · Furnace Grip · Magma Bound |
| T03 | **Reliktkiefer**<br><sub>Drei freischwebende, winkelige Kieferbögen aus Fossilglas bilden einen offenen Greifapparat neben dem Avatar.</sub> | `jaws` ×3 | `#556261` `#e0d2aa` `#36a49c` | Snap Maw | Drake Claw (`cone`) / Ancestral Breath (`projectile`) | Wyrm Horn (`burst`) / Sky Maw (`pillar`) | Tail Crook (`ring`) / Primal Coil (`ring`) | Scale Veil · Jaw Seize · Wyrm Leap |
| T04 | **Korallenschild**<br><sub>Zwei fächerförmige Schutzsegel aus Korallenlamellen stehen seitlich statt klassischer Drachenflügel.</sub> | `fins/sail` ×2 | `#345a65` `#f0a89e` `#e4d78d` | Wing Embrace | Life Spark (`projectile`) / Queenfire Stream (`beam`) | Winglift (`burst`) / Crown Ascent (`pillar`) | Bloom Step (`ring`) / Sanctuary Bloom (`sequence`) | Queen Mantle · Mercy Lift · Bloom Flight |
| T05 | **Bruchflug**<br><sub>Drei gebrochene, schwebende Gravitätsfinnen statt zwei biologischer Flügel; keine Hörner.</sub> | `fins/blade` ×3 | `#161d29` `#2fa89c` `#d77d9d` | Hell Dive | Rift Scratch (`cone`) / Annihilation Ray (`beam`) | Wing Barb (`burst`) / Infernal Ascent (`pillar`) | Claw Rake (`ring`) / Abyss Crash (`sequence`) | Fiend Wings · Talon Snare · Double Vault |
| T06 | **Ionspindel**<br><sub>Drei schmale Magnetspulen rotieren diagonal um Hüfte, Ellbogen und Schulter.</sub> | `orbit/coil` ×3 | `#254e59` `#b6d46b` `#f29a70` | Volt Lunge | Spark Needle (`projectile`) / Tempest Chain (`projectile`) | Static Lift (`burst`) / Storm Spire (`pillar`) | Thunder Step (`ring`) / Cyclone Ground (`sequence`) | Faraday Veil · Lightning Bind · Ion Hop |
| T07 | **Dämmerlauf**<br><sub>Vier asymmetrische Rauchsicheln entlang Unterarmen und Waden verlängern die Körperkontur; kein Fell, kein Wolfsmaul.</sub> | `limbs/sickle` ×4 | `#414d51` `#a7ba87` `#e6af8c` | Predator Break | Crescent Swipe (`cone`) / Moon Howl (`cone`) | Rising Fang (`burst`) / Silver Ascension (`pillar`) | Low Pounce (`ring`) / Lunar Ravage (`sequence`) | Hide Guard · Jaw Takedown · Moonbound |
| T08 | **Ossuarium**<br><sub>Hängende Keramikglocken und geknickte Grabplatten bilden ein bewegliches, hohles Rüstungskarussell.</sub> | `girdle/bell` ×4 | `#323c40` `#f2e7cc` `#8ebf97` | Sepulcher Rush | Bone Dart (`projectile`) / Sarcophagus Lance (`projectile`) | Rib Hook (`burst`) / Ossuary Bloom (`pillar`) | Grave Nail (`ring`) / Bone Cathedral (`sequence`) | Ossified Ward · Rib Lock · Skeletal Hop |
| T09 | **Prismabruch**<br><sub>Ein einseitig schwebendes Prisma aus fünf ungleichen Spiegelplatten; keine Dämonenhörner und keine vollständigen Doppelgänger.</sub> | `orbit/mirror` ×5 | `#21343a` `#e6a36d` `#84c9ae` | False Entry | Glass Thorn (`projectile`) / Fractured Volley (`cone`) | Mirror Flick (`burst`) / Prism Ascension (`pillar`) | Shard Sweep (`ring`) / Reflection Rift (`sequence`) | Refractive Guard · Mirror Theft · Split Leap |
| T10 | **Aderarchon**<br><sub>Vier hohle Wurzelröhren verlaufen außen um Torso und Arme, ohne Fledermausflügel.</sub> | `girdle/tube` ×4 | `#543544` `#c07a78` `#e8cfbd` | Crimson Hook | Blood Needle (`projectile`) / Eclipse Lance (`projectile`) | Feather Flick (`burst`) / Crimson Ascension (`pillar`) | Scarlet Circle (`ring`) / Demonflare (`sequence`) | Wing Cocoon · Heart Tether · Bloodborne Jump |
| T11 | **Polartrick**<br><sub>Drei flache Kometenbänder aus Frostpapier mit fächerartigen Enden; keine Fuchsohren oder biologischen Schweife.</sub> | `bands` ×3 | `#e8e5db` `#9c9aca` `#eaaa8c` | Fox Feint | Frost Kiss (`cone`) / Aurora Foxfire (`cone`) | Snowfang (`burst`) / Nine-Star Leap (`pillar`) | Ice Brush (`ring`) / Whiteout Veil (`sequence`) | Frost Tail Guard · Vulpine Snare · Foxbound |
| T12 | **Stratospalter**<br><sub>Vier offene Prankenbügel schweben als externe Exoskelett-Stützen um Hüfte und Schultern.</sub> | `frame/brace` ×4 | `#285060` `#e7e9dd` `#eead6b` | Sky Pounce | Feral Swipe (`cone`) / Tiger Roar (`cone`) | Upward Claw (`burst`) / Heaven Prowl (`pillar`) | Ground Paw (`ring`) / Imperial Roar (`ring`) | Paw Bastion · Tiger Hold · Prowler Leap |
| T13 | **Fadenschlag**<br><sub>Sichtbare metallische Fadenspule nahe der Schulter; vier Spannseile führen zu der vorhandenen Waffe.</sub> | `limbs/thread` ×4 | `#193e53` `#d7a856` `#e77b62` | Silk Strike | Thread Needle (`projectile`) / Hundred Filaments (`projectile`) | Sky Pin (`burst`) / Heaven Loom (`pillar`) | Ground Stitch (`ring`) / Thunder Weave (`sequence`) | Silk Parry · Wire Snare · Loom Jump |
| T14 | **Glyphenschmied**<br><sub>Drei schiefe, gestanzte Glyphenplatten hängen an einer zentralen Klemme statt generischer Magiekreise.</sub> | `orbit/glyph` ×3 | `#25383d` `#d4b482` `#8ad1be` | Rune Spear | Quick Sigil (`projectile`) / Grand Script (`projectile`) | Arc Notch (`burst`) / Runic Obelisk (`pillar`) | Seal Drop (`ring`) / Circle Codex (`ring`) | Script Ward · Binding Diagram · Glyph Step |
| T15 | **Spektralweiche**<br><sub>Vier verflochtene Leitbänder verlaufen von Rücken zur Hand und wechseln ihre Reihenfolge beim Elementwechsel.</sub> | `bands` ×4 | `#244358` `#f29b75` `#a3d5c1` | Flux Pierce | Heat Bolt (`projectile`) / Quadra Torrent (`projectile`) | Shock Lift (`burst`) / Prismatic Rise (`pillar`) | Cold Foot (`ring`) / Flux Basin (`sequence`) | Wave Guard · Element Clamp · Prism Jump |
| T16 | **Vierknoten**<br><sub>Vier mechanische Pendelknoten hängen in asymmetrischem Orbit um den Rücken statt kleiner humanoider Dschinn.</sub> | `orbit/knot` ×4 | `#5f596b` `#d1ba84` `#8faeaa` | Crown Pierce | Spirit Flick (`projectile`) / Conclave Burst (`projectile`) | Djinn Upper (`burst`) / Ascendant Choir (`pillar`) | Spirit Tap (`ring`) / Summoners Ring (`sequence`) | Djinn Halo · Crown Lariat · Summoner Hop |
| T17 | **Glutmauser**<br><sub>Asymmetrische Streifen aus verkohlter Lichtkeramik lösen sich vom Rücken wie mausernde Schindeln.</sub> | `fins/shingle` ×3 | `#413b36` `#d9b08c` `#fae3b4` | Phoenix Lunge | Feather Shot (`projectile`) / Phoenix Beak (`projectile`) | Rising Wing (`burst`) / Solar Ascension (`pillar`) | Cinder Sweep (`ring`) / Ash Rebirth (`sequence`) | Feather Veil · Talon Rescue · Phoenix Bound |
| T18 | **Morphgitter**<br><sub>Ein offenes Gitter aus beweglichen Prismenzellen verbindet vorhandene Gliedmaßen mit temporären Werkzeugformen.</sub> | `girdle/cell` ×4 | `#4d6052` `#e3bb85` `#6d97a4` | Beast Lever | Horn Shot (`projectile`) / Soul Cannon (`projectile`) | Horn Rise (`burst`) / Manticore Crown (`pillar`) | Tail Slap (`ring`) / Ancient Shellbreak (`sequence`) | Chimera Shell · Tail Clamp · Soul Morph Hop |
| T19 | **Schwuranker**<br><sub>Drei schwere U-förmige Klammern schweben um Schulter, Hüfte und Unterarm; kein klassischer Schildritter.</sub> | `frame/clamp` ×3 | `#303940` `#bd986a` `#a6c2b0` | Oath Breaker | Shield Ram (`cone`) / Bastion Beam (`beam`) | Steel Uplift (`burst`) / Citadel Rise (`pillar`) | Knee Check (`ring`) / Fortress Quake (`sequence`) | Oath Shield · Grapple Lock · Armor Vault |
| T20 | **Taktklinge**<br><sub>Kurze Messerkanten aus leuchtenden Notenstrichen liegen an den Unterarmen; Fußspuren sind abstrakte Taktmarken.</sub> | `limbs/notes` ×3 | `#244451` `#efba7a` `#87c7b0` | Cross Tempo | Pulse Cut (`cone`) / Grand Pirouette (`projectile`) | Tempo Lift (`burst`) / Rhapsody Rise (`pillar`) | Low Rhythm (`ring`) / Falling Cadence (`sequence`) | Counter Stance · Bind and Turn · Dance Vault |
| T21 | **Orbitpranke**<br><sub>Winzige scharfkantige Orbitkörper kreisen um die Hände und Ellbogen; Haare und Gesicht bleiben unverändert.</sub> | `orbit/shard` ×6 | `#1e3853` `#f2b16f` `#b9cfd6` | Meteor Knuckle | Ki Flash (`cone`) / Nova Beam (`beam`) | Astral Upper (`burst`) / Comet Ascend (`pillar`) | Ki Foot (`ring`) / Supernova Pulse (`ring`) | Aura Brace · Ki Grip · Star Jump |
| T22 | **Zündschuppe**<br><sub>Mattgrüne keramische Schuppenkacheln sitzen in unregelmäßigen Reihen nur an Gelenken, ohne Drachenkopf.</sub> | `limbs/scale` ×3 | `#4b4b45` `#c0d0a0` `#d66f52` | Dragon Fang | Cinder Fist (`cone`) / King Roar (`cone`) | Ember Ascend (`burst`) / Sky Dragon Coil (`pillar`) | Dragon Heel (`ring`) / Scales of Ruin (`ring`) | Fire Scale Guard · Burning Maw · Dragon Leap |
| T23 | **Nullfeldträger**<br><sub>Drei offene, farblose Negativräume schweben über Schulter und Hand. Licht und Partikel verschwinden innerhalb ihrer Kontur.</sub> | `orbit/void` ×3 | `#333743` `#e8e2d9` `#a9d77f` | Null Cleave | Mute Slash (`cone`) / Spell Eater (`projectile`) | Null Rising (`burst`) / Eclipse Pillar (`pillar`) | Mute Heel (`ring`) / Silence Rift (`sequence`) | Negation Guard · Counter Bind · Eclipse Jump |
| T24 | **Fadenregent**<br><sub>Zwei flache, gelenkige Schatten-Marionetten hängen an sichtbaren diagonalen Lichtfäden; keine Geistersoldaten-Armee.</sub> | `puppets` ×2 | `#293d5b` `#e0cba5` `#ce945e` | Vanguard Order | Shadow Dart (`projectile`) / Legion Spear (`beam`) | Warden Rise (`burst`) / Kingdom Ascends (`pillar`) | Shade Sweep (`ring`) / March of Shades (`sequence`) | Royal Guard · Phantom Seize · King Step |
| T25 | **Hämolith**<br><sub>Dünne keramische Kapillaren liegen offen um die Unterarme und formen raue Mineralkanten.</sub> | `limbs/capillary` ×3 | `#5a4551` `#b88483` `#d4b0a7` | Blood Saw | Blood Needle (`projectile`) / Hemal Lance (`beam`) | Scarlet Hook (`burst`) / Crimson Gallows (`pillar`) | Blood Stomp (`ring`) / Red Thorn Garden (`sequence`) | Hemo Shell · Scarlet Bind · Blood Leap |
| T26 | **Resonanzwache**<br><sub>Drei versetzte, halbtransparente Armaturelemente aus geflochtenen Schnüren folgen mit Zeitversatz, keine zweite humanoide Riesengestalt.</sub> | `frame/braid` ×3 | `#4a554f` `#d4b78d` `#739f9b` | Warrior Thrust | Spirit Cut (`cone`) / Ancestor Blade (`wall`) | Guardian Lift (`burst`) / Ancestor Ascension (`pillar`) | Spirit Heel (`ring`) / Grave Oath (`sequence`) | Ancestor Brace · Spirit Wrestle · Ancestor Leap |
| T27 | **Faltspur**<br><sub>Rechteckige Raumfalze wie gefaltete Papierkanten liegen um beide Ellbogen, ohne Körper-Tattoos.</sub> | `limbs/fold` ×3 | `#273b57` `#9fcdbd` `#e9ab7e` | Rift Entry | Seam Dart (`projectile`) / Dimension Spear (`beam`) | Split Rise (`burst`) / Rift Pillar (`pillar`) | Seam Foot (`ring`) / Broken Compass (`sequence`) | Seam Shield · Rift Clamp · Portal Hop |
| T28 | **Rasterdom**<br><sub>Drei offene bauliche Rasterbögen setzen auf der Lane auf; keine geschlossene Anime-Domäne.</sub> | `arches` ×3 | `#314a57` `#e8ca9c` `#99d2bc` | Gate Entry | Rule Needle (`projectile`) / Edict Lance (`cone`) | Keystone Lift (`burst`) / Judgment Column (`pillar`) | Ground Seal (`ring`) / Court of Lines (`sequence`) | Rule Aegis · Constraint Grip · Threshold Leap |
| T29 | **Werkgestalt**<br><sub>Drei eigenwillige Apparate, Pendel, Zange und Spindel, kreisen um die Hüfte; keine Krone oder Edelsteinreliquien.</sub> | `orbit/apparatus` ×3 | `#515852` `#d2a06d` `#a8c7b9` | Chain Crown | Gold Shard (`projectile`) / Kingmaker Spear (`beam`) | Crown Uprise (`burst`) / Ascendant Vault (`pillar`) | Anchor Drop (`ring`) / Relic Convergence (`sequence`) | Antique Ward · Royal Chain · Artifact Leap |
| T30 | **Leisefaden**<br><sub>Nur ein einzelnes versetztes Schattenband löst sich beim Bewegen vom Körper; keine Katzenohren, kein Tierkopf.</sub> | `bands` ×1 | `#293434` `#ced0b0` `#d59a7e` | Night Pounce | Shadow Claw (`cone`) / Nine Lives Lash (`wall`) | Catapult Claw (`burst`) / Night Chimera Rise (`pillar`) | Paw Sweep (`ring`) / Dark Prowl (`ring`) | Cat Veil · Familiar Snatch · Cat Jump |
| T31 | **Klingenherbarium**<br><sub>Ein Fächer aus flachen, dreieckigen Glimmer-Samen statt Blütenblättern umkreist ein leeres Waffenlager.</sub> | `orbit/seed` ×6 | `#2d5a52` `#d7bb99` `#c06f66` | Blossom Pierce | Petal Fang (`cone`) / Thousand-Petal Wave (`sequence`) | Petal Hook (`burst`) / Blooming Vault (`pillar`) | Falling Blossom (`ring`) / Royal Bloom (`ring`) | Petal Dome · Blossom Bind · Petal Jump |
| T32 | **Taktfunke**<br><sub>Abstrakte, rechteckige Akzentzeichen blitzen nur an den Fußgelenken bei tatsächlich getroffenen Schritten.</sub> | `limbs/accent` ×3 | `#363b42` `#d8bc6b` `#78baaf` | Flash Cut | Lightning Notch (`cone`) / Sixfold Flash (`beam`) | Vertical Draw (`burst`) / Heaven Tempo (`pillar`) | Heel Flash (`ring`) / Storm Cantata (`sequence`) | Thunder Guard · Sword Hilt Lock · Flash Jump |
| T33 | **Nachtmaß**<br><sub>Zwei schmale schwenkbare Messzirkel-Bügel an Schultern und Knien bilden die Stealth-Silhouette.</sub> | `frame/compass` ×2 | `#3b4359` `#c1b6a1` `#94b8b7` | Assassin Step | Moon Knife (`projectile`) / Crescent Chain (`beam`) | Rising Shade (`burst`) / Midnight Split (`pillar`) | Dust Sweep (`ring`) / Shadow Wheel (`ring`) | Counter Veil · Ninja Grapple · Moon Vault |
| T34 | **Sternwerk**<br><sub>Ein schwebender Projektionsapparat aus drei nach außen klappenden Segmenten trägt eine leere Werkzeugfassung.</sub> | `arches` ×3 | `#2d4766` `#cbaa77` `#b5c4ba` | Guardian Ram | Arcane Pellet (`projectile`) / Sentinel Volley (`projectile`) | Sky Sprite (`burst`) / Constellation Lift (`pillar`) | Rune Mine (`ring`) / Orbit Fortress (`sequence`) | Ward Sentinel · Warden Hand · Star Hop |
| T35 | **Kältestillstand**<br><sub>Drei gebrochene, halbtransparente Kondensationsbänder liegen an Arm, Rücken und Hüfte; keine Zifferblätter.</sub> | `bands` ×3 | `#66757a` `#d6e5d6` `#d9a99a` | Chrono Brake | Icy Tick (`cone`) / Frozen Hour (`cone`) | Frost Hand (`burst`) / Winter Pendulum (`pillar`) | Cold Stamp (`ring`) / Clockwork Blizzard (`sequence`) | Frozen Clock · Second Hand · Clock Hop |
| T36 | **Bollwerklicht**<br><sub>Drei geknickte, segelartige Paneele strahlen seitlich vom Rücken ab, ohne Federn oder Halo.</sub> | `fins/sail` ×3 | `#344d69` `#cbdea2` `#e9d9ba` | Anchor Rush | Beacon Spark (`cone`) / Dawn Ray (`beam`) | Wing Lift (`burst`) / Ascension Chorus (`pillar`) | Beacon Pulse (`ring`) / Sanctuary Anchor (`sequence`) | Halo Guard · Guardian Turn · Radiant Hop |
| T37 | **Säuregerüst**<br><sub>Durchsichtige Katalysatorrohre und sechseckige Dosierkammern ziehen sich um die Unterarme; kein Drachenkopf.</sub> | `saeuregeruest/tube` ×3 | `#385a58` `#cfb76c` `#9c9c87` | Venom Jab | Acid Pellet (`projectile`) / Corrosion Breath (`cone`) | Wyrm Fang (`burst`) / Pestilent Pillar (`pillar`) | Mire Tail (`ring`) / Blight Crater (`sequence`) | Toxic Hide · Caustic Grip · Venom Jump |
| T38 | **Asterglied**<br><sub>Fünf frei schwebende Stein-Gelenkbügel bilden eine offene Architektur um Arme und Beine.</sub> | `asterglied/brace` ×5 | `#5e5b55` `#9ca992` `#d8b68c` | Meteor Shoulder | Stone Splinter (`projectile`) / Crystal Boulder (`projectile`) | Rock Upper (`burst`) / Mountain Crown (`pillar`) | Granite Heel (`ring`) / Faultline (`sequence`) | Stonewall · Granite Clamp · Crag Hop |
| T39 | **Vorausschnitt**<br><sub>Vier dünne schwebende Bildrahmen zeigen nur abstrakte Bewegungsvektoren; keine Sternenkrone oder Himmelszeichen.</sub> | `vorausschnitt/frame` ×4 | `#4c4a5f` `#e8cfb1` `#97bd9e` | Atlas Break | Star Dot (`projectile`) / Convergence Formula (`projectile`) | Compass Up (`burst`) / Zodiac Ascent (`pillar`) | Atlas Foot (`ring`) / Nebula Equation (`sequence`) | Script Guard · Compass Capture · Atlas Leap |
| T40 | **Sonnenwyrm** — Eid der Drachenlanze<br><sub>verwobene, unterschiedlich breite Schuppenband-Segmente auf zwei gegenläufigen Bewegungsachsen. Jedes Segment hat dunklen Grund, matte Innenfacette, gravierte Schneidkerbe, goldene gefaste Lichtkante und einzelne orange Schmelznähte.</sub> | `wyrm` ×2 | `#f6cb6a` `#ed7b32` `#29212b` `#69d0c2` | Drachenlanzenstoß | Sonnenstich (`beam`) / Zwillingswyrm-Jagd (`wyrms`) | Himmelszahn (`burst`) / Himmelswendel (`pillar`) | Glutkreis (`ring`) / Wyrmportal-Ritual (`portals`) | Drachengrat · Wyrmfang · Himmelslauf und konturtreue Air-Aura |

## 4. Kombinationsmatrix

Zwei-Runen-Kombinationen der 10 Basisrunen (symmetrisch, Diagonale = doppelte Rune). **— = noch frei** (kein Rezept → Designraum für neue Spells).

| | 🔥 IGNIS | 💨 VENTUS | ⚡ FULGUR | 🪨 TERRA | ❄️ AQUA | 🐺 BESTIA | ⚙️ KONSTRUKT | 🕳️ VOID | ☀ LUX | ☾ UMBRA |
|---|---|---|---|---|---|---|---|---|---|---|
| **🔥 IGNIS** | INFERNO BEAM | FIRESTORM VORTEX | METEOR CATACLYSM | MAGMA FISSURE | — | DRAGON BREATH | — | SOUL SEEKERS | SOLAR ORB | BLOOD MOON |
| **💨 VENTUS** | FIRESTORM VORTEX | — | TEMPEST BLITZ | SANDSTORM BASTION | BLIZZARD SURGE | — | MIRROR WARD | GRAVITY LIFT | STARFALL | — |
| **⚡ FULGUR** | METEOR CATACLYSM | TEMPEST BLITZ | THUNDER LANCE | SEISMIC SLAM | AURA SHOCK | STORM WOLF | — | — | — | THUNDERHEAD |
| **🪨 TERRA** | MAGMA FISSURE | SANDSTORM BASTION | SEISMIC SLAM | STONE WALL | ARCANE AEGIS | TITAN STOMP | RUNE GOLEM | BURROW STRIKE | — | SHADOW STOMPER |
| **❄️ AQUA** | — | BLIZZARD SURGE | AURA SHOCK | ARCANE AEGIS | GLACIAL RAY | — | — | FROST MIRROR GATE | AURORA VEIL | LUNAR ORB |
| **🐺 BESTIA** | DRAGON BREATH | — | STORM WOLF | TITAN STOMP | — | — | — | VOID SPIDER | — | — |
| **⚙️ KONSTRUKT** | — | MIRROR WARD | — | RUNE GOLEM | — | — | — | — | — | — |
| **🕳️ VOID** | SOUL SEEKERS | GRAVITY LIFT | — | BURROW STRIKE | FROST MIRROR GATE | VOID SPIDER | — | NULL RAY | — | — |
| **☀ LUX** | SOLAR ORB | STARFALL | — | — | AURORA VEIL | — | — | — | RADIANT LANCE | ECLIPSE |
| **☾ UMBRA** | BLOOD MOON | — | THUNDERHEAD | SHADOW STOMPER | LUNAR ORB | — | — | — | ECLIPSE | — |

**Freie Zwei-Runen-Kombinationen (22):** IGNIS+AQUA, IGNIS+KONSTRUKT, VENTUS+VENTUS, VENTUS+BESTIA, VENTUS+UMBRA, FULGUR+KONSTRUKT, FULGUR+VOID, FULGUR+LUX, TERRA+LUX, AQUA+BESTIA, AQUA+KONSTRUKT, BESTIA+BESTIA, BESTIA+KONSTRUKT, BESTIA+LUX, BESTIA+UMBRA, KONSTRUKT+KONSTRUKT, KONSTRUKT+VOID, KONSTRUKT+LUX, KONSTRUKT+UMBRA, VOID+LUX, VOID+UMBRA, UMBRA+UMBRA

### Drei-Runen-Rezepte

| Rezept | Spell |
|---|---|
| 🐺 BESTIA + 🪨 TERRA + 🕳️ VOID | **VOID IMPLOSION** |
| 🐺 BESTIA + 🔥 IGNIS + 🕳️ VOID | **INFERNO RAMPAGE** |
| 🐺 BESTIA + 🔥 IGNIS + 💨 VENTUS | **DRAGON INVOCATION** (als „INFERNO DRAGON INVOCATION“) |
| 🐺 BESTIA + 🪨 TERRA + 💨 VENTUS | **WORLD RUNE SERPENT** |
| ❄️ AQUA + 🪨 TERRA + 💨 VENTUS | **SPIRIT WOLF** |
| ⚡ FULGUR + 🪨 TERRA + 🪨 TERRA | **SIEGE GOLEM** |
| ⚡ FULGUR + 🔥 IGNIS + 🪨 TERRA | **DRAGON INVOCATION** |
| ⚡ FULGUR + 🔥 IGNIS + 💨 VENTUS | **APOCALYPTIC HEAVENSURGE** |

Hinweis: `DRAGON INVOCATION` hat zwei Rezepte (Bestia+Ignis+Ventus und Fulgur+Ignis+Terra). Von den 220 möglichen Drei-Runen-Kombinationen der Basisrunen (mit Wiederholung) sind nur wenige belegt.

## 5. Transformationen & Form-Techniken

Transformationen geben kein zusätzliches Rune-Deck; ihre Techniken liegen auf **Heavy-Charge + Richtung** (kurz = antippen/kurz laden, voll = 1,2 s laden). Fokus-Transformation verbraucht die Focus-Leiste (1,5/s, Unity-Wert).

| Form | Quelle | Forward kurz / voll | Up kurz / voll | Down kurz / voll | Sprint + Angriff |
|---|---|---|---|---|---|
| **B01 Risswild** (drei gebrochene Schmelzbänder, Splitterkrone; ehem. Ninefold) | Arcane-State-Rune `buff_B01` (⧗, max. 1 pro Deck, 16 s) | Rissimpuls / Verdichteter Risskern | Bruchheber / Doppelter Rissaufstieg | Scherfeger / Rissfeld-Einschlag | Beast Pounce |
| **B02 Arkengestell** (offenes Kristall-Kraftgestell mit Halo und Bogen; ehem. Eidolon) | Arcane-State-Rune `buff_B02` (⧗, max. 1 pro Deck, 16 s) | Glyphenbolzen / Belagerungspfeil (Bogen) | Trägerheber / Lichtspalter | Ankerstampfer / Gericht des Gestells | Kolossstoß |
| **T01–T40** (40 weitere Arcane States, siehe 3.7) | je eine Arcane-State-Rune `buff_Txx` | aus dem Atlas | aus dem Atlas | aus dem Atlas | aus dem Atlas |
| **Focus Ascendant** | Focus 100 % → T / Tippen auf den Wizard (ohne Primal) | Radiant Wave / Annihilation Beam | Ascending Strike / Heaven Pillar | Light Nova / Starfall Crash | Radiant Lunge (goldener Durchstoß) |
| **Primal Bond** (Wolf / Schildkröte) | Focus 100 % → T mit Primal in der Nähe | — (Buff-Form: Tempo bzw. Panzerung) | — | — | Primal Pounce / Shell Rush |

Ehemalige Transformations-Spells: ANNIHILATION BEAM (über Focus Ascendant Forward voll); VOID IMPLOSION = Bestia+Terra+Void, INFERNO RAMPAGE = Bestia+Ignis+Void (normale Kombinationen).

## 6. Glossar: Delivery, Zielmodi, Tags

**Delivery-Klassen** (mechanische Klasse, unabhängig vom Look — jede Klasse hat einen gemeinsamen Controller):

| Delivery | Spells |
|---|---|
| `projectile` | IGNIS FIREBALL, VOID BOLT |
| `salvo` | — (noch ungenutzt) |
| `homing` | SOUL SEEKERS |
| `beam` | ANNIHILATION BEAM, INFERNO BEAM, GLACIAL RAY, THUNDER LANCE, NULL RAY, RADIANT LANCE |
| `cone` | DRAGON BREATH |
| `burrow` | BURROW STRIKE |
| `area` | GALE SHOCKWAVE, ARC LIGHTNING, STONE SPIKES, FROST NOVA, HALO PULSE, AURA SHOCK, DRAGON INVOCATION, APOCALYPTIC HEAVENSURGE |
| `zone` | VOID IMPLOSION, FIRESTORM VORTEX, MAGMA FISSURE, BLIZZARD SURGE, FROST MIRROR GATE |
| `wall` | CONSTRUCT BULWARK, STONE WALL |
| `telekinesis` | GRAVITY LIFT |
| `capture` | MIRROR WARD |
| `slam` | SEISMIC SLAM |
| `stomp` | TITAN STOMP, SHADOW STOMPER |
| `summon` | BEAST FAMILIAR, SHADOW DOPPELGANGER, REVENANT CALL, STORM WOLF, VOID SPIDER, RUNE GOLEM, WORLD RUNE SERPENT, SPIRIT WOLF, SIEGE GOLEM |
| `dash` | SHADOW STEP, INFERNO RAMPAGE, TEMPEST BLITZ |
| `heavy_object` | METEOR CATACLYSM |
| `self` | SANDSTORM BASTION, ARCANE AEGIS, SOLAR ORB, LUNAR ORB, ECLIPSE, THUNDERHEAD, BLOOD MOON, STARFALL, AURORA VEIL, ARKENGESTELL, RISSWILD, RISSWILD, ARKENGESTELL, KAMMWACHT, SCHLACKENKERN, RELIKTKIEFER, KORALLENSCHILD, BRUCHFLUG, IONSPINDEL, DÄMMERLAUF, OSSUARIUM, PRISMABRUCH, ADERARCHON, POLARTRICK, STRATOSPALTER, FADENSCHLAG, GLYPHENSCHMIED, SPEKTRALWEICHE, VIERKNOTEN, GLUTMAUSER, MORPHGITTER, SCHWURANKER, TAKTKLINGE, ORBITPRANKE, ZÜNDSCHUPPE, NULLFELDTRÄGER, FADENREGENT, HÄMOLITH, RESONANZWACHE, FALTSPUR, RASTERDOM, WERKGESTALT, LEISEFADEN, KLINGENHERBARIUM, TAKTFUNKE, NACHTMASS, STERNWERK, KÄLTESTILLSTAND, BOLLWERKLICHT, SÄUREGERÜST, ASTERGLIED, VORAUSSCHNITT, SONNENWYRM |

**Zielmodi** (gleiche Regeln für Touch, Maus/Tastatur, Gamepad):

| Modus | Bedienung |
|---|---|
| `direction` | Tap its slot (Z/X/C): it fires the way you face. Mouse: toward the cursor. Touch: drag the slot onto the field to aim. |
| `ground` | Tap its slot, then tap the spot where it should land (mouse: click; gamepad: right stick + A). Esc / B cancels. |
| `placement` | Tap its slot, then swipe a line on the ground — the wall is built exactly along it, in any direction. Cleaner runes give more blocks. |
| `ally` | Tap its slot, then tap the ally to protect (yourself, a minion or a summon). |
| `aim` | Tap its slot, then drag / point the direction (depth included). The cone shows the enemy it will catch; release to cast. |
| `dual` | Tap its slot, then set the first point and the second point. |
| `self` | Tap its slot: it takes effect around you at once. |

**Interaktions-Tags:** `reflectable` (Parry/Spiegel wirft zurück), `capturable` (Mirror Ward fängt), `blockable` (Block reduziert), `clashable` (Beam Clash: zwei Beams treffen sich Spitze an Spitze, Mashen entscheidet), `beamDamageable` (kann von Beams zerstört werden, z. B. Meteor).

**Weitere Systeme, mit denen Spells interagieren:** Bodeneffekte (Eis, Feuer, Lava, Pfützen, Krater — Umgebungsschicht), Himmelsfelder verstärken/schwächen ganze Elemente (Sonne: Feuer/Licht +, Eis/Schatten −; Mond: Wasser/Eis/Schatten +, Feuer −; Eclipse; Thunderhead; Blood Moon; Starfall; Aurora), Schatten (Shadow Stomper hält Schatten fest), Steinwände (Kollision für alle), Gräber/Seelen (Revenant Call), Mounts (reitbare Beschwörungen).

## 7. Statistik

- Runen: 57 (davon 10 Basis, 2 Solo-Spezial, 3 Transformation)
- Spells: 97 — Fundamental 10, Solo 2, Compound 26, Himmelsfelder 7, Advanced 9, Transformation 1
- Rezepte: 96 · freie Zwei-Runen-Paare: 22 von 55

## 8. Hinweise für den Research-Agenten

**Kontext:** GRIMGE ist ein 2,5D-Fantasy-Brawler (Little-Fighter-artige Tiefe, Lane-/Burgen-Modus „Castle Siege“, Training, Arena, Dungeon). Spells entstehen durch gezeichnete Runen + Fusion. Es gibt Nahkampf, Transformationen, Primals (Begleiter) und Waffen.

**Regeln für neue Spells:**
- Eigene, originale Namen und Looks (keine geschützten Namen aus anderen Spielen/Animes übernehmen; Inspiration ja, Kopie nein).
- Jede Idee einer **bestehenden Delivery-Klasse** zuordnen (oder begründet eine neue vorschlagen) und einen **Zielmodus** wählen.
- Ein **Rezept** angeben — bevorzugt eines der freien Paare aus Abschnitt 4 bzw. eine freie Drei-Runen-Kombination; Element-Logik der Runen respektieren (Ignis Feuer, Ventus Wind, Fulgur Blitz, Terra Erde, Aqua Frost/Wasser, Bestia Tier, Konstrukt Bau/Mechanik, Void Leere/Gravitation, Lux Licht, Umbra Schatten).
- Interaktionen nennen: Tags, Wechselwirkung mit Bodeneffekten, Himmelsfeldern, Beam Clash, Wänden, Mounts.
- 2,5D bedenken: Lane-Tiefe (z), Höhe (Launcher, Luftziele), Reichweiten in px (Bühne 1024 × 576, Held ≈ 88 px hoch).
- Visualisierung beschreiben (Formen, Farben, Bewegung, Partikel) — im Stil der Spalte „Visualisierung“.

**Vorlage pro Vorschlag:**
```
Name:            (original)
Rezept:          RUNE + RUNE (+ RUNE)        # bevorzugt freies Paar
Tier / Mana:     2 / Summe der Runen
Delivery:        projectile | salvo | homing | beam | cone | burrow | area | zone | wall | telekinesis | capture | slam | stomp | summon | dash | heavy_object | self
Zielmodus:       direction | ground | placement | ally | aim | dual | self
Tags:            reflectable, capturable, blockable, clashable, beamDamageable
Wirkung:         (Mechanik, Zahlen grob: Schaden, Radius, Dauer)
Visualisierung:  (was man sieht)
Interaktionen:   (Boden, Himmel, Clash, Wände, Elemente)
Inspiration:     (Spiel/Anime + was übernommen wird — nur als Idee)
```
