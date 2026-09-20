# GRIMGE – Game Design Concept
## Canonical Target-System & UI Architecture

> Status: Zielsystem / Design Knowledge, Stand 16.09.2026
>
> Dieses Dokument beschreibt den aktuell abgestimmten Aufbau von GRIMGE auf Ebene von Game Structure, Spieltypen, Spielmodi, Progressionssystemen und UI. Es trennt bewusst bestätigte Zielentscheidungen von noch offenen Detailentscheidungen. Konkrete Balancewerte, vollständige Spell-Rezepte und noch nicht entschiedene Untermodi dürfen nicht aus diesem Dokument abgeleitet oder eigenmächtig ergänzt werden.

---

# 1. High-Level Vision

GRIMGE ist ein schnelles, charakterzentriertes Action-Game mit 2.5D-/Platform-Fighting-Anteilen, Castle-vs-Castle-/Lane-Gameplay, Runenmagie, Klassen, Primals und langfristiger Build-Progression.

Die unmittelbare Combat-Fantasy verbindet insbesondere:

- schnelles direktes Movement und Combat im Geist von Little Fighter 2 / Smash-artiger Lesbarkeit
- physische Klassenidentität über fest definierte Waffen und Class Combat
- Magie über ein während des Kampfes aktiv gezeichnetes Runensystem
- 1-, 2- und 3-Rune-Spells
- Summons, Constructs, Fields, Shields, CC, World Objects und weitere systemische Spell-Effekte
- PvE, PvP und Co-op als unterschiedliche Spielangebote auf derselben Character-/Combat-Basis

GRIMGE soll nicht wie eine Sammlung voneinander isolierter Minigames wirken. Movement, Combat, Class, Runes, Primals, Transformations und Progression bilden ein gemeinsames Kernsystem, das in unterschiedlichen Spieltypen und Modi verwendet wird.

---

# 2. Platform & Presentation

Zielplattformen:

- PC, insbesondere Steam
- iOS
- Android

Mobile ist ein zentraler Designfall. Die UI wird deshalb primär für Landscape gedacht und anschließend sauber auf unterschiedliche Seitenverhältnisse skaliert.

Wichtige UI-Regeln:

- Landscape-first
- große Touch Targets
- keine unnötigen Desktop-artigen Kleinstbedienelemente
- wichtige Informationen auf einen Blick
- klare Hierarchie statt vieler gleichwertiger Tabs
- Dark Cosmic Fantasy
- Gothic Ruins, Floating Islands, Nebulae und Arcane/Cosmic Motive
- dunkle Blau-/Violettbasis
- Cyan für magische/interaktive Akzente
- Gold für hochwertige Rahmen und wichtige UI-Strukturen
- Pixel-Art-inspirierte Game Assets, aber moderne, polierte UI

---

# 3. Core Character Architecture

Der Character besitzt mehrere getrennte, aber miteinander interagierende Entwicklungsachsen.

```text
CHARACTER
│
├── CLASS
│   ├── fixed weapon / weapon family
│   ├── physical combat identity
│   ├── Class Tree
│   └── Class Transformation
│
├── MAGIC
│   ├── Grimoire / Rune Deck
│   ├── Standard Base Runes
│   ├── Special Runes
│   ├── discovered Spells
│   ├── Mastery Trees
│   └── Mastery Transformations
│
├── PRIMAL
│   ├── equipped / bound Primal
│   ├── Primal Level / Bond
│   ├── Primal Growth Form I / II / III
│   └── Primal Transformation Stage I / II / III
│
├── EQUIPMENT
│   └── actual gameplay gear / power equipment
│
└── APPEARANCE
    ├── Character Customization
    └── Wardrobe / Cosmetics
```

Class, Magic und Primal sollen jeweils eine eigene Identität behalten. Ein System darf die Funktion des anderen nicht unnötig übernehmen.

---

# 4. Class System

Jede Klasse besitzt eine definierte Waffenidentität bzw. Weapon Family.

Die Klasse bestimmt primär:

- Physical Combat Style
- Weapon Identity
- Normal Attacks / Combos
- class-specific mechanics
- Class Tree
- Class Transformation

Das Grimoire ersetzt die Klasse nicht. Ein Spieler kann dieselbe Klasse mit unterschiedlichen Rune Builds spielen.

Grundsatz:

> Class defines how the character fights physically. The Grimoire defines how the character fights magically.

Klassen und konkrete Class Trees werden separat spezifiziert.

---

# 5. Rune & Spell System

## 5.1 Grimoire

Das Grimoire ist das Combat Loadout für Runen.

Aktueller Zielstand:

- zunächst 10 Rune Slots pro Deck
- mehrere Exemplare derselben Rune können besessen werden
- maximal 2 Kopien derselben Rune dürfen gleichzeitig in einem Grimoire geslottet werden
- Deck Profiles können unter frei wählbaren Namen gespeichert werden
- Profile können schnell geladen, gespeichert, als neues Profil gespeichert und gelöscht werden

Beispiel:

```text
PvP Main
Dungeon Control
Boss Summoner
Castle Defense
```

Die Namen sind Beispiele und keine vordefinierten Pflichtprofile.

## 5.2 Standard Base Runes

Aktueller kanonischer Stand: 17 Standard Base Runes.

### Elements

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

### Concepts

11. Invocation
12. Construction
13. Ward
14. Force
15. Binding
16. Field
17. Shift

Jede Base Rune muss allein einen sinnvollen 1-Rune-Spell besitzen. Eine Rune darf nicht ausschließlich als Modifier existieren.

## 5.3 Combination Hierarchy

```text
1 Rune  → Fundamental Spell
2 Runes → Compound Spell
3 Runes → Advanced Spell
```

Zwei Runen sollen dem Spieler die semantische Grammatik des Systems vermitteln. Drei Runen dürfen deutlich ungewöhnlichere und komplexere Ergebnisse erzeugen.

Concept Runes können sowohl mit Element Runes als auch untereinander kombiniert werden.

Nicht jede mathematisch mögliche Kombination muss einen Spell besitzen. Filler-Spells nur zur Vervollständigung einer Matrix sind ausdrücklich unerwünscht.

Wenn die aktuell gequeueten Runen kein gültiges Rezept bilden, darf der Input nicht tot sein. Nach der bestehenden Queue-Resolution wird ein geeigneter 1-Rune-Spell ausgelöst und die inkompatiblen übrigen Runen werden geleert.

## 5.4 Concept Semantics

- Invocation: manifestiert autonome Entitäten / Summons
- Construction: erschafft persistente World Objects, z. B. Walls, Totems, Platforms oder andere Constructs
- Ward: schützt eine Entität, z. B. Shields, Armor, Absorption oder defensive Reactions
- Force: Impuls, Push, Pull, Launch, Knockback
- Binding: Einschränkung, Root, Bind, Immobilization
- Field: räumlicher / zonaler Effekt
- Shift: Repositioning, Blink, Teleport, räumliche Manipulation

Wichtige Abgrenzung:

> Ward = entity-bound protection.
>
> Construction = independent world object.

## 5.5 Spell Design Principle

Spells sollen semantisch lernbar, aber mechanisch transformativ sein.

Ein Element darf nicht lediglich Farbe und Damage Type eines ansonsten identischen Spells austauschen. Elemente sollen Verhalten, Interaktionen, Status, Persistenz, Collision, Terrain, Projectile Interaction, Summons oder andere Mechaniken verändern.

Abgeleitete Phänomene sind grundsätzlich Spells und nicht automatisch Base Runes. Beispiele wie Storm, Blizzard, Firestorm oder Magma können aus Rune Combinations entstehen.

Konkrete Kombinationen werden in einem separaten Spell-/Recipe-Design festgelegt.

## 5.6 Special Runes

Special Runes existieren zusätzlich zu Standard Base Runes.

Sie sind typischerweise:

- komplexer zu zeichnen
- vollständige Standalone-Spells
- höherer Mana-/Commitment-Aufwand
- seltener und spezialisierter

Vorgesehene Kategorien können umfassen:

- Ancient
- Boss
- Primal
- Event
- Crossover / Collaboration

Special Runes müssen nicht Bestandteil normaler 2-/3-Rune-Rezepte sein. Ihre konkreten Interaktionsregeln werden separat festgelegt.

---

# 6. Mastery System

Es existieren aktuell 14 normale Mastery Trees:

### Elemental Masteries

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

### Discipline Masteries

- Invocation
- Construction
- Ward
- Control

Zuordnung der Control Runes:

- Force → Control
- Binding → Control
- Field → Control
- Shift → Control

Zusätzlich existiert Arcane Mastery als übergeordnete Gesamtprogression. Arcane Mastery ist kein normaler 15. Mastery Tree.

Mastery XP entsteht durch tatsächliche Nutzung entsprechender Runes/Spells. Multi-Affinity-Spells verteilen XP auf ihre Affinities, ohne durch mehr Runen automatisch unverhältnismäßig mehr Gesamt-XP zu erzeugen.

Mastery soll überwiegend horizontale Progression erzeugen:

- neue Optionen
- Traits / Sidegrades
- Spezialisierungen
- Rune Unlock Requirements
- Cosmetics / Prestige
- Mastery Transformation

Unbegrenzte reine Stat-Steigerung ist insbesondere für Competitive PvP nicht das Ziel.

Jeder der 14 Mastery Trees soll langfristig eine eigene Mastery Transformation besitzen.

---

# 7. Primal System

Primals sind eigenständige Begleiter/Wesen mit eigener langfristiger Progression.

## 7.1 Primal Growth

Der Primal selbst wächst sichtbar mit seinem Level. Das Zielprinzip orientiert sich an einer klar lesbaren Creature Evolution:

```text
YOUNG FORM
↓
MATURE FORM
↓
FINAL / ASCENDED FORM
```

Beispielhaft bei einem Wolf-Primal:

- frühe Level: kleiner Welpe / junge Form
- mittlere Level: deutlich größerer, ausgewachsener Wolf
- hohe Level: finale, imposante Form mit stärkerer Silhouette, besonderen Merkmalen und z. B. Armor/Arcane Details

Die Levelgrenzen sind noch offen. Entscheidend ist, dass die Entwicklung nicht nur über Stats erfolgt, sondern visuell sichtbar ist.

Jeder Primal soll seine eigene Evolutionslogik besitzen. Ein Dragon, Wolf, Golem, Spirit oder Void Entity muss nicht dieselben körperlichen Veränderungen verwenden.

## 7.2 Primal Transformation of the Character

Separat von der sichtbaren Entwicklung des Primals existiert die Verschmelzung zwischen Character und Primal.

### Stage I: Manifestation

- Primal Aura / Energy / Silhouette um den Character
- Base Character Sprite muss sich körperlich noch nicht wesentlich verändern
- klare visuelle Identität des Primals

### Stage II: Hybrid

- Primal nimmt stärker physische Form am Character an
- z. B. Horns, Claws, Tail, Wings, Scales, Fur, Eyes oder andere Primal-spezifische Merkmale
- Character und Primal bleiben als zwei Ursprünge erkennbar

### Stage III: Fusion

- vollständige Fusion von Character und Primal
- starke neue Silhouette möglich
- höchste visuelle Stufe der Bindung

Die Transformation Stages werden abhängig von Primal Level / Bond Progression freigeschaltet. Exakte Schwellen werden separat festgelegt.

Wichtig:

> Primal Growth und Character-Primal Transformation sind zwei verwandte, aber unterschiedliche Systeme.

Der Primal kann selbst von Young → Mature → Final wachsen, während der Character separat Manifestation → Hybrid → Fusion freischaltet.

---

# 8. Transformation System

GRIMGE besitzt drei zentrale Transformation Sources:

| Source | Progression | Fantasy |
|---|---|---|
| Class Transformation | Class Tree | Meisterschaft des Kampfstils / der Klasse |
| Primal Transformation | Primal Bond / Level | zunehmende Verschmelzung mit einem Primal |
| Mastery Transformation | Mastery Tree | Meisterschaft einer magischen Schule |

Class Transformation soll die Class-/Weapon-Identity ausdrücken.

Primal Transformation besitzt drei Stufen: Manifestation, Hybrid, Fusion.

Mastery Transformation ist ein High-Mastery-/Endgame-Ziel jedes der 14 Mastery Trees.

Noch offen ist, ob mehrere vollständige Transformationen gleichzeitig aktiviert oder kombiniert werden können. Diese Entscheidung darf wegen Balance, VFX Readability, Sprite Complexity und Asset Production nicht implizit hardcodiert werden.

---

# 9. Equipment, Cosmetics & Character Creation

## Equipment

Equipment ist echtes Gameplay Gear und kann Power/Stats/Mechanics beeinflussen. Es ist nicht mit Cosmetics gleichzusetzen.

## Wardrobe

Wardrobe ist für kosmetische Darstellung und Skins zuständig.

## Character Creation

Der Character wird grundsätzlich einmalig erstellt und anschließend in den Hub geführt.

Aktuell vorgesehene grundlegende Customization:

- Body / gender presentation
- frei wählbarer Name
- Hair
- Hair Color
- Eyebrows / Color
- Eye Color
- Skin Color

Outfit-/Armor-Customization kann später erweitert werden. Klassenidentität und Equipment müssen dabei berücksichtigt werden.

---

# 10. Game Structure

Die oberste spielerische Struktur wird in **Spieltypen / Game Categories** und darunterliegende **Game Modes** getrennt.

Der Begriff "Game Type" bzw. "Category" beschreibt die größere Aktivitätsgruppe. "Game Mode" beschreibt die konkrete spielbare Regelvariante.

Aktueller Hauptzugang:

```text
MAIN HUB
   ↓
BATTLE
   ↓
PLAY MENU
   ├── CAMPAIGN
   ├── RANKED
   ├── CO-OP
   ├── CUSTOM MATCH
   ├── FREE PLAY
   └── TRAINING
```

Diese sechs Bereiche sind die aktuell vorgesehenen Top-Level Play Categories / Spieltypen.

---

# 11. Campaign

Campaign ist der primäre strukturierte PvE-Fortschritt.

Ziele:

- Welt / Lore erleben
- Combat-System schrittweise kennenlernen
- Progression und Unlocks
- Encounter, Gegner, Bosse und unterschiedliche Level-Strukturen
- Einführung und Nutzung der zentralen Character-Systeme

Campaign ist nicht als einzelner Arena-Modus zu verstehen, sondern als strukturierter PvE-Inhalt.

Konkrete Campaign-Kapitel, Missionsarten und Rewards werden separat spezifiziert.

---

# 12. Ranked

Ranked ist der kompetitive PvP-Bereich.

Er verwendet die Kernmechaniken von GRIMGE mit klaren Competitive Rules.

Das zentrale Castle-vs-Castle-/Lane-System ist ein wichtiger PvP-Kern:

```text
Own Side
Castle
↓
Lane Tower 1
↓
Lane Tower 2
↓
Lane / Minions / Combat Space
↓
Enemy Lane Tower 1
↓
Enemy Lane Tower 2
↓
Enemy Castle
↓
Final Wizard Kill
```

Aktuell definierte Kernregeln des Castle-Siege-Zielbilds umfassen:

- Lane Tower 1 → Lane Tower 2 → Castle → finaler Wizard Kill
- Lane Towers greifen sich nicht gegenseitig an
- Tower Aggro folgt dem vorgesehenen Eintritts-/Targeting-System
- Wizard kann mehrere Tower Aggros ziehen, wenn die jeweiligen Bedingungen erfüllt sind
- Tower greifen nur innerhalb ihrer eigenen Range an
- Castle ist die stärkste Defense-Struktur
- Castle HP regeneriert nicht automatisch
- Lane Structures erhalten normalen Structure Damage
- Castle kann reduzierten Structure Damage erhalten, dieser bleibt jedoch permanent
- Transitions dürfen keinen kostenlosen Dodge erzeugen
- nach Castle Down kann Sudden Death / No Respawn greifen
- Wizard darf auf der Lane casten
- nach Castle Down und finalem Wizard Kill endet das Match

Die genaue Ranked Playlist, Matchmaking-, Season- und Rating-Struktur wird separat definiert.

---

# 13. Co-op

Co-op ist der gemeinsame PvE-Bereich für mehrere Spieler.

Er soll nicht lediglich optisch ein zweites Dungeon-Menü sein, sondern eine eigene Multiplayer-PvE-Funktion erfüllen.

Geeignete Inhalte können beispielsweise gemeinsame Wellen-/Defense- oder Encounter-Strukturen verwenden. Welche konkreten Co-op-Modi final angeboten werden, ist noch nicht vollständig festgelegt.

Bereits als langfristige Richtung vorgesehen ist ein Co-op-Wellenmodus.

Wichtig für die UI:

- Co-op ist eine Top-Level Play Category
- konkrete Co-op-Modi erscheinen erst innerhalb dieser Category
- Co-op und Dungeon dürfen in der Menüstruktur nicht als dasselbe Konzept erscheinen

---

# 14. Custom Match

Custom Match ermöglicht Matches mit selbst festgelegten bzw. privaten Regeln/Teilnehmern.

Zielrichtung:

- private Matches
- Freunde / definierte Teilnehmer
- Auswahl geeigneter PvP-Regeln / Maps / Modes

Die vollständigen Host Settings und Custom Rules sind noch nicht finalisiert.

---

# 15. Free Play

Free Play ist ein nicht-progressionsgebundener Bereich zum freien Spielen und Experimentieren.

Aktuell vorgesehene Game Modes:

### Castle Siege

Castle-vs-Castle-/Lane-Gameplay mit Structures, Minions, Wizards und dem zentralen Objective Flow.

### Invasion

Eigenständiger Free-Play-Modus. Die vollständigen Regeln werden separat spezifiziert.

### Dungeon

PvE-orientierter Dungeon-Modus. Er ist ein konkreter Game Mode innerhalb Free Play und nicht identisch mit der Top-Level Category Co-op.

### Arena

Kompakter Combat-/Arena-Modus ohne den vollständigen Campaign-Kontext.

Free Play gibt grundsätzlich keine normalen Progression Rewards.

Der Zweck ist:

- ausprobieren
- Builds testen
- Modi frei spielen
- Mechaniken kennenlernen
- ohne Progressionsdruck spielen

---

# 16. Training

Training ist für gezieltes Lernen und Testen vorgesehen.

Mögliche Funktionen:

- Movement üben
- Combos testen
- Rune Drawing testen
- Spell Interactions testen
- Dummy / Gegnerverhalten
- Damage / Hit Feedback
- Defense Mechanics üben

Training ist kein normaler Reward-Modus.

---

# 17. Tutorial / Onboarding Target Flow

Das Tutorial soll Mechaniken schrittweise und spielerisch vermitteln, nicht alle Systeme gleichzeitig erklären.

Aktuell besprochene Zielrichtung:

1. Movement oben/unten und grundlegende Bewegung
2. Jump bereits am Spawn sinnvoll einführen, z. B. über eine Rune / ein Pickup
3. Rune wird geslottet und Rune Bar hervorgehoben
4. Spieler zeichnet / castet den ersten Spell
5. einfache Gegnerphase
6. Dodge / Jump gegen gegnerische Spells
7. Minion Combat
8. Tower-/Structure-Phase
9. vollständige Siegbedingung verständlich machen

Wichtig:

> Castle Down allein ist nicht automatisch der vollständige Sieg. Das Zielsystem endet mit Castle Down + finalem Wizard Kill, sofern der konkrete Modus diese Regel verwendet.

Tutorial-Scripting und konkrete Texte werden separat festgelegt.

---

# 18. Main Navigation / Hub

Nach der einmaligen Character Creation soll der Spieler grundsätzlich in einen persistenten Main Hub / Main Menu gelangen.

Der Hub ist die zentrale Navigation zu den langfristigen Systemen und Play Activities.

Zentrale Bereiche umfassen langfristig:

- BATTLE
- Character / Class
- Skill Tree / Class Tree
- Equipment
- Grimoire
- Mastery
- Primals
- Transformations
- Wardrobe / Cosmetics
- Codex / Spell Discoveries
- Settings / Social / Messages nach Bedarf

Nicht alle Bereiche müssen gleichzeitig als gleichwertige Bottom Tabs dargestellt werden. Die Informationsarchitektur soll kontextabhängig bleiben.

---

# 19. Global Top Bar

Der etablierte visuelle Aufbau verwendet eine globale obere HUD-Zone.

Typischer Inhalt:

### Left

- Character Portrait
- Character Name, z. B. Astra
- Character Level
- Progress Bar / relevante Progress Information

### Center

- GRIMGE Logo / Screen Identity

### Right

- Gold
- Premium Currency / Gems
- Add / Purchase affordances, falls relevant
- Messages
- Social / Friends
- Settings

Die Top Bar soll über wichtige Meta-Screens konsistent bleiben, soweit dies für den jeweiligen Screen sinnvoll ist.

---

# 20. Grimoire UI

Der aktuell entwickelte Grimoire-Screen ist ein wichtiges Referenzlayout.

Header:

```text
GRIMOIRE
BUILD YOUR RUNE DECK
```

Desktop-/Wide-Landscape-Referenz nutzt drei funktionale Bereiche:

```text
┌────────────────┬──────────────────────────┬────────────────┐
│ RUNE LIBRARY   │      MY GRIMOIRE         │   RUNE INFO    │
│                │                          │                │
│ collection     │  deck profile + slots    │ selected rune  │
└────────────────┴──────────────────────────┴────────────────┘
```

Auf kleineren mobilen Seitenverhältnissen darf diese Struktur responsiv angepasst werden. Funktionale Klarheit ist wichtiger als das starre Beibehalten von drei Spalten.

---

# 21. Rune Library UI

Die Rune Library zeigt die tatsächlich verfügbaren/entdeckten Runen und deren Besitzmenge.

Wichtige Elemente:

- Search Runes
- Standard Runes
- Special Runes
- Filter innerhalb Standard Runes, mindestens All / Elements / Concepts
- Rune Icon
- Rune Name
- Owned Count direkt auf/bei der Rune, z. B. `x5`
- Locked State für noch nicht freigeschaltete Inhalte, falls relevant

Beispiel:

```text
Fire x5
Water x3
Ice x4
...
```

Die Anzahl ist wichtig, weil mehrere Kopien derselben Rune existieren können.

Ein globaler Total-Rune-Wert kann zusätzlich dargestellt werden, darf aber die per-Rune Counts nicht ersetzen.

---

# 22. My Grimoire UI

Der zentrale Bereich ist das aktuell aktive Rune Deck.

Aktueller Zielstand:

- 10 / 10 Slots
- Slots klar nummeriert
- Rune Icon + Rune Name
- Rune aus Slot entfernen
- Profile Dropdown / Profile Selection
- frei benennbare Deck Profiles
- Rename/Edit
- Load
- Save
- Save As
- Delete

Die Deck-Verwaltung soll schnelle Build-Wechsel ermöglichen.

Ein Profil ist eine gespeicherte Rune-Slot-Konfiguration, kein eigener Character Build mit automatisch allen anderen Systemen, sofern später nicht explizit erweitert.

---

# 23. Rune Info UI

Wenn eine Rune ausgewählt wird, zeigt die Detailzone kontextbezogene Informationen.

Beispiel Fire:

```text
Fire
Element
Fire Mastery
Owned: 5
Slotted: 1 / 2
```

Wichtig:

- `Owned` = wie viele Exemplare der Spieler besitzt
- `Slotted` = wie viele Kopien dieser Rune im aktuell geöffneten Deck verwendet werden
- `Slotted: 1 / 2` bedeutet hier: eine Fire Rune ist im Deck, maximal zwei dürfen geslottet werden

Zusätzliche Inhalte:

- kurze Rune Description
- Base Spell / 1-Rune-Spell
- Rune Type
- Associated Mastery
- Anzahl bereits entdeckter Kombinationen

Die Rune Info soll kein vollständiges Spell-Wiki werden.

---

# 24. Spells UI

Der frühere Gedanke eines generischen `Codex`-Buttons direkt im Grimoire wurde bewusst präzisiert.

Der relevante Zugang heißt im Grimoire:

> SPELLS

Er führt direkt in den Spell-/Combination-Inhalt des Codex und nicht auf eine generische Codex-Startseite.

Dort sieht der Spieler:

- nur bereits durch Spielen / Experimentieren entdeckte Spells
- bekannte 2-Rune-Combinations
- bekannte 3-Rune-Combinations
- ggf. bekannte Special Spells
- verwendete Runen
- Spell Icon
- Spell Name
- relevante Spell Information

Unentdeckte Kombinationen sollen nicht einfach vollständig offengelegt werden, wenn die Discovery-Fantasy dadurch verloren geht.

Discovery Loop:

```text
EQUIP RUNES
↓
EXPERIMENT
↓
DISCOVER VALID COMBINATION
↓
CAST SPELL
↓
UNLOCK SPELL ENTRY
↓
SPELLS / CODEX KNOWLEDGE
```

Der `Spells`-Button kann einen Count/Badge für relevante entdeckte Inhalte oder neue Discoveries zeigen. Exakte Badge-Semantik wird noch festgelegt.

Ein zusätzlicher `View All Spells`-Button innerhalb der Rune-Info ist redundant und soll nicht verwendet werden, wenn bereits ein globaler `Spells`-Zugang vorhanden ist.

---

# 25. Mastery Navigation in Grimoire

Mastery ist aus dem Grimoire sinnvoll direkt erreichbar, da Runen und Masteries unmittelbar zusammenhängen.

Der Bottom-/Context-Navigation-Bereich kann deshalb enthalten:

- Back
- Spells
- Mastery

`Spells` und `Mastery` sollen visuell sauber und symmetrisch um die Screen-Mitte positioniert werden.

Primals gehören nicht als direkte Navigation in diesen Grimoire-Kontext.

Es soll keine redundante zweite `Rune Categories`-Navigation auf der rechten Seite geben, wenn die Rune Library bereits Filter besitzt.

---

# 26. Codex

Der Codex ist die übergeordnete Knowledge-/Discovery-Datenbank des Spiels.

Er kann langfristig mehr als nur Spells enthalten. Im Grimoire soll der Spieler jedoch nicht erst in eine generische Codex-Startseite geschickt werden.

Deshalb gilt:

```text
GRIMOIRE → SPELLS
```

Dieser Einstieg öffnet direkt den passenden Codex-Unterbereich für entdeckte Spells / Rune Combinations.

Die UI-Bezeichnung richtet sich nach der Aufgabe des Spielers, nicht zwingend nach dem Namen des zugrunde liegenden Datenbanksystems.

---

# 27. Mastery UI

Die frühere Rune-Tree-Idee wird durch Mastery Trees ersetzt.

Der Spieler soll nicht künstlich lernen:

```text
Water → Ice → Rain
```

wenn Rain eigentlich ein Spell Result ist.

Stattdessen:

- Base Runes sind magisches Vokabular
- Mastery Trees bilden Beherrschung einer Schule ab
- Spells entstehen aus Recipes
- entdeckte Spells werden im Spells/Codex-Bereich dokumentiert

Mastery UI soll die 14 Masteries darstellen und langfristig die jeweilige Mastery Transformation als High-End-Ziel sichtbar machen.

Die genaue Node-Struktur und Traits werden separat designt.

---

# 28. Primals UI

Primals besitzen einen eigenen Bereich und gehören nicht als Unterpunkt des Grimoire-Screens in die Navigation.

Der Primal-Bereich muss langfristig mindestens vermitteln:

- vorhandene Primals
- aktuell ausgewählter / gebundener Primal
- Primal Level
- Bond / Progression
- aktuelle Growth Form
- nächste Growth Form / Evolution
- freigeschaltete Character Transformation Stage
- Stage I / II / III Progress
- Primal-spezifische Eigenschaften

Die visuelle Evolution des Primals ist ein zentraler Progressionsreiz und sollte im UI deutlich sichtbar sein.

---

# 29. Transformations UI

Transformationen können als eigener Character-/Progression-Bereich sichtbar gemacht werden, müssen aber ihre Quelle klar kennzeichnen.

Mögliche Struktur:

```text
TRANSFORMATIONS
├── CLASS
├── PRIMAL
└── MASTERY
```

Dabei dürfen Unlocks nicht so dargestellt werden, als kämen alle Transformationen aus demselben Tree.

Die genaue Aktivierungs-/Loadout-UI ist noch offen.

---

# 30. Combat HUD

Der Combat HUD muss schnell lesbar und mobile-tauglich sein.

Er benötigt abhängig vom Modus Informationen für:

- Character HP / relevante Ressourcen
- Rune Slots / aktuell verfügbare Runen
- Rune Drawing / Recognition Feedback
- Mana / Cast Cost, sofern relevant
- active Spell / Queue State
- Cooldowns / unavailable states
- Transformation State / Meter, sobald definiert
- Primal State, sofern im Match relevant
- Match Objective
- Tower / Castle State in Castle Modes
- Respawn / Sudden Death State
- Team / Enemy information nach Modus

Die endgültige HUD-Komposition wird separat spezifiziert und muss für Touch und Controller/Keyboard funktionieren.

---

# 31. Movement & Combat Feel

GRIMGE soll trotz seiner Meta-Systeme ein schnelles Spiel bleiben.

Bereits gewünschte Movement-Richtung:

- Walk über niedrigen Analog-Stick-Input
- Run als normale volle Bewegung
- Sprint über Double-Flick / Double-Tap-Richtung
- kurze, natürliche Acceleration / Deceleration statt völlig binärer Bewegung
- Sprint-Übergang sehr schnell, etwa im bisherigen gefühlten Bereich
- Backdash knackig
- kein beliebiges A-D-A-D-Dash-Spamming ohne saubere neue Eingabe
- Jump erst nach Ende eines Backdash mit kurzer Recovery
- Animation Speed soll sich sinnvoll an Movement Speed anpassen
- Depth Movement darf langsamer als horizontale Hauptbewegung sein, wenn dies für Lesbarkeit und Arena-Geometrie nötig ist

Exakte Werte folgen der aktuellen Implementierung und separaten Movement-Spezifikation.

---

# 32. World Objects & Temporary Weapons

Spells dürfen echte World Objects erzeugen.

Dafür soll ein generisches System existieren, kein Spell-spezifischer Sondercode.

Mögliche Eigenschaften:

- pickup
- drop
- throw
- durability
- expiration
- temporary attack chain
- special finisher property
- pickup by another player

Ein erzeugtes magisches Schwert wäre daher beispielsweise ein `World Object / Pickup / Temporary Weapon`, nicht automatisch eine permanente Veränderung der Class Weapon.

Dieses System unterstützt die schnelle, physische Arena-Fantasy und kann später auch unabhängig von Spells für World Items verwendet werden.

---

# 33. Rewards & Progression by Play Type

Grundsätzliche Trennung:

### Progression-oriented

- Campaign
- Ranked, mit kompetitiver/seasonaler Progression nach späterer Spezifikation
- Co-op, sofern der konkrete Modus Rewards vorsieht

### Player-controlled / non-progression oriented

- Free Play: keine normalen Rewards
- Training: keine normalen Rewards
- Custom Match: Reward-Regeln noch nicht final, standardmäßig nicht als Progressionsfarm behandeln

Die exakten Economy- und Reward-Tabellen werden separat festgelegt.

---

# 34. UX Information Architecture Principles

Jeder Screen soll eine klare Hauptaufgabe besitzen.

Beispiele:

- Grimoire = Rune Deck bauen
- Spells = entdeckte Spells verstehen
- Mastery = magische Schule entwickeln
- Primals = Primal auswählen und entwickeln
- Equipment = Gear verwalten
- Wardrobe = Aussehen ändern
- Battle = Aktivität auswählen

Vermeiden:

- denselben Inhalt an mehreren Stellen vollständig duplizieren
- kontextfremde Navigation
- viele Bottom Tabs nur weil Systeme existieren
- generische Codex-Weiterleitung, wenn der Spieler eigentlich Spells sehen möchte
- Rune Categories an mehreren Stellen desselben Screens
- Desktop-artige Überladung auf Mobile

Navigation soll den mentalen Kontext erhalten.

---

# 35. Responsive UI Principle

Die gezeigten Wide-Screen-Mockups sind Designreferenzen und keine starre Pixelvorgabe.

Für Mobile Landscape müssen berücksichtigt werden:

- Safe Areas
- unterschiedliche iPhone-/Android-Seitenverhältnisse
- Browser/PWA vs. native Fullscreen
- große Touch Targets
- keine unbedienbaren UI-Ränder
- keine künstlich angefügten grafischen Randflächen nur zum Verbergen schwarzer Balken
- UI darf nicht außerhalb interaktiver Safe Zones geraten

Panels können auf kleineren Displays:

- einklappen
- als Drawer / Sheet erscheinen
- seitenweise wechseln
- kontextuell überblendet werden

Die funktionale Hierarchie muss erhalten bleiben.

---

# 36. Current Play Structure Summary

```text
GRIMGE
│
├── META / CHARACTER
│   ├── Character
│   ├── Class / Class Tree
│   ├── Equipment
│   ├── Wardrobe
│   ├── Grimoire
│   │   ├── Rune Library
│   │   ├── 10-Slot Rune Deck
│   │   ├── Deck Profiles
│   │   ├── Rune Info
│   │   ├── Spells → discovered Codex spell section
│   │   └── Mastery shortcut
│   ├── Mastery
│   ├── Primals
│   ├── Transformations
│   └── Codex / Knowledge
│
└── BATTLE
    │
    ├── CAMPAIGN
    │   └── structured PvE content
    │
    ├── RANKED
    │   └── competitive PvP
    │       └── Castle/Lane objective gameplay as core direction
    │
    ├── CO-OP
    │   └── multiplayer PvE
    │       └── concrete modes still to be finalized
    │
    ├── CUSTOM MATCH
    │   └── private/configurable matches
    │
    ├── FREE PLAY
    │   ├── Castle Siege
    │   ├── Invasion
    │   ├── Dungeon
    │   └── Arena
    │
    └── TRAINING
        └── practice / testing
```

---

# 37. Confirmed vs Open

## Currently treated as canonical target direction

- PC + iOS + Android
- mobile-first Landscape UI
- fast action combat
- Class + fixed weapon identity
- Grimoire with 10 Rune Slots initially
- max 2 slotted copies of the same rune
- named reusable Deck Profiles
- 17 current Standard Base Runes
- Standard vs Special Runes
- 1-/2-/3-Rune spell hierarchy
- not every combination must exist
- invalid combination still resolves without dead input
- 14 Mastery Trees + overarching Arcane Mastery
- Class, Primal and Mastery Transformations
- Primal itself visually grows from young → mature → final form based on level
- Character-Primal transformation separately progresses Manifestation → Hybrid → Fusion
- Spells screen shows discovered combinations rather than exposing all recipes
- Grimoire navigation focuses on Back / Spells / Mastery, not Primals
- Campaign / Ranked / Co-op / Custom Match / Free Play / Training as top-level Play Categories
- Free Play contains Castle Siege / Invasion / Dungeon / Arena
- Free Play has no normal progression rewards

## Explicitly still open

- exact Spell Recipe matrix
- exact 1-Rune spell list
- exact 2-/3-Rune recipes
- whether rune order changes recipes
- Special Rune combination behavior
- exact mana/cast/cooldown values
- exact Mastery traits
- exact Rune unlock graph
- exact Primal level thresholds for growth/evolution
- exact Primal transformation thresholds
- exact Class roster
- exact Ranked playlists / rating system
- final Co-op mode list
- detailed Invasion rules
- detailed Dungeon rules
- detailed Arena rules
- Custom Match rule set
- exact Transformation activation mechanics
- whether Class / Primal / Mastery transformations can stack
- final Combat HUD
- final Economy / Rewards

---

# 38. Implementation Guidance for Coding Agents

Dieses Dokument ist ein Zielbild und keine Aufforderung, alle beschriebenen Systeme sofort neu zu implementieren.

Vor jeder Umsetzung:

1. bestehende Implementierung analysieren
2. vorhandene Systeme identifizieren
3. funktional gleichwertige Lösungen erkennen
4. keine parallelen Systeme erzeugen
5. bestehende funktionierende Systeme nicht unnötig ersetzen
6. Daten und Content von wiederverwendbaren Gameplay-Systemen trennen
7. Mobile/PC Input gemeinsam berücksichtigen
8. neue Systeme auf mindestens einen zweiten Use Case prüfen
9. konkrete offene Designfragen nicht eigenmächtig als final behandeln

Insbesondere dürfen aus Beispielen keine kanonischen Spell Recipes, Level-Schwellen oder Balancewerte erfunden werden.

---

# 39. Final Design Principle

GRIMGE soll gleichzeitig drei Ebenen erfüllen:

```text
MOMENT TO MOMENT
Fast, responsive combat and rune execution

BUILD CRAFTING
Class + Grimoire + Mastery + Primal + Equipment

LONG-TERM IDENTITY
Class mastery + magical mastery + Primal growth + transformations + cosmetics
```

Die Spielmodi sollen diese Kernsysteme unterschiedlich einsetzen, nicht jeweils neue isolierte Kernmechaniken erfinden.

Die UI soll dieselbe Philosophie verfolgen:

> Ein Screen, eine klare Hauptaufgabe, kontextbezogene Verbindungen zu den unmittelbar angrenzenden Systemen.

Damit bleibt GRIMGE trotz großer langfristiger Systemtiefe schnell verständlich, mobile-tauglich und erweiterbar.
