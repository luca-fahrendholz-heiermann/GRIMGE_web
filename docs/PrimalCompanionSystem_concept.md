# Primal Companion System — Design & Mechanics Specification

## Konzept & Lore

Der Spieler bindet sich an **uebernatuerliche Geistwesen** — tierisch inspirierte Familiare (wolfsartig, schildkroetenartig, vogelartig, baerenartg, reptilienartig/drachenartig, mythische Silhouetten). Es sind **keine domestizierten Haustiere**, sondern spirituelle Kreaturen mit eigener Natur.

**Primal Bond** = der Spieler synchronisiert sich mit der uebernatuerlichen Natur der Kreatur und verschmilzt temporaer mit ihr. Nicht "Power-Up durch Haustier", sondern eine tiefe Verbindung zweier Wesen.

Aktuell existieren zwei Archetypen: **Wolf** (aggressiv/mobil) und **Turtle** (defensiv/immovable).

---

## Drei Evolutionsstufen

Jeder Companion hat eine aktuelle Evolutionsstufe (I, II oder III). Hoehere Stufen schalten maechtigere **Bond Forms** frei — staerkere Versionen der Primal-Bond-Transformation.

| Stufe | Bedeutung |
|-------|-----------|
| **I** | Basisstufe. Zugang zur ersten Bond Form. Visuell als Energy Overlay (Aura ueber dem Charakter). |
| **II** | Mittlere Stufe. Schaltet die zweite Bond Form frei. Visuell als Full Replacement (Charakter wird komplett ersetzt). |
| **III** | Maximale Stufe. Schaltet die dritte und maechtigste Bond Form frei. Ebenfalls Full Replacement. |

### Wolf — Bond Forms pro Evolutionsstufe

| Form | Name | Evo-Stufe | Darstellung | Focus-Drain | Bewegung | Pounce-Carry |
|------|------|-----------|-------------|-------------|----------|--------------|
| 1 | Synchronization | I | Energy Overlay | 1.0x | 1.25x | 1.3x |
| 2 | Hunter | II | Full Replacement | 1.25x | 1.35x | 1.5x |
| 3 | Apex Predator | III | Full Replacement | 1.6x | 1.5x | 1.95x |

### Turtle — Bond Forms pro Evolutionsstufe

| Form | Name | Evo-Stufe | Darstellung | Focus-Drain | Shell Guard | Fortified | Fortified-Dauer | Shell Rush Push |
|------|------|-----------|-------------|-------------|-------------|-----------|-----------------|-----------------|
| 1 | Shell Sync | I | Energy Overlay | 1.0x | 0.7x | 0.4x | 0.75s | 1.35x |
| 2 | Bulwark | II | Full Replacement | 1.0x | 0.55x | 0.3x | 1.15s | 1.5x |
| 3 | Ironclad | III | Full Replacement | 1.0x | 0.4x | 0.2x | 1.5s | 1.65x |

**Darstellungsmodi:**
- **Energy Overlay** — visuelle Energie-Aura ueber dem Charakter (Stufe-I-Formen)
- **Full Replacement** — vollstaendige visuelle Ersetzung des Charaktermodells (Stufe II und III)

**Design-Spannung:** Beim Wolf steigt der Focus-Drain mit hoeherer Form (Risk/Reward). Beim Turtle bleibt der Drain bei 1.0x (Sustain-Archetyp).

---

## Companion als autonomer Battlefield-Akteur

Der Companion wird als vollwertiger **Charakter** assembliert — identisch zu Spielern, Minions und Gegnern. Er nutzt dasselbe Kampfsystem (Movement, Health, Hurtbox, Melee-Angriff). Er erbt das Team seines Besitzers.

### Zustaende (States)

```
TowerIdle -> FollowOwner -> AdvanceLane -> ApproachTarget -> Attack -> Intercepting -> Recovering -> Suspended -> Merged
```

### Praesenz-Lifecycle

| Praesenz | Bedeutung |
|----------|-----------|
| **Tower** | Wartet am freundlichen Turm, kein Lane-Teilnehmer |
| **Lane** | Unabhaengiger Lane-Kaempfer |
| **Recovering** | Besiegt, wartet Respawn-Cooldown am Turm ab |
| **Suspended** | Match ist vorbei, KI gestoppt |
| **Merged** | In den Spieler absorbiert waehrend Primal Bond |

### Betriebsmodi

| Modus | Wann | Verhalten |
|-------|------|-----------|
| **TowerIdle** | Companion am Turm | Idle, kein Kampf |
| **OwnerCentric** | Spieler UND Companion auf der Lane | Bleibt in Follow-Band beim Spieler, bekaempft nur lokale Bedrohungen in Spielernaehe |
| **AutonomousLane** | Companion auf Lane, Spieler auf Plattform oder tot | Waehlt eigenstaendig feindliche Charaktere/Minions und Turm-Ziele, rueckt vor wenn kein Ziel |

---

## Deployment & Rueckkehr

- **Klick-Deployment:** Companion am freundlichen Turm anklicken -> deployed zur Lane im Autonomous-Modus
- **Auto-Deploy mit Spieler:** Wenn der Spieler zur Lane deployed, deployed der Companion automatisch mit im Owner-Centric-Modus
- **Kein manueller Recall:** Der Companion kehrt selbstaendig zum Turm zurueck nach seiner autorisierten Lane-Dauer (24s) oder bei Niederlage
- **Unabhaengiger Lifecycle:** Spieler-Recall ruft den Companion NICHT zurueck. Companion ueberlebt Spieler-Tod und -Respawn

---

## Kampfverhalten

### Following (Owner-Centric)

- Haelt einen definierten Offset zum Besitzer (X: -0.75, Tiefe: +0.42)
- Follow-Distanz: 0.85 Einheiten mit 0.28 Dead Band
- Catch-Up bei 4.5 Einheiten, harter Reposition bei 12 Einheiten

### Zielauswahl

- Sucht im Radius von 3.5 Einheiten nach feindlichen Zielen
- **Explizites Spieler-Fokusziel** (C + Linksklick) ueberschreibt die autonome Suche — bleibt bestehen bis Ziel stirbt oder ersetzt wird
- Owner Combat Leash (5.5 Einheiten): Im Owner-Centric-Modus werden Ziele jenseits dieser Distanz fallen gelassen

### Angriff

- Bevorzugte Kampfdistanz: 0.72 Einheiten
- Standard-Melee-Angriffspfad
- Ein konservativer Angriff: "Basic Bite" (Schaden: 6, Recovery: 0.42s, Reichweite: 0.72/0.34)

### Vorruecken (Autonomous)

- Rueckt Richtung Feindseite entlang der Lane vor
- Greift feindliche Charaktere/Minions und Lane-Turm-Ziele an

---

## Intercept-System

Der Companion kann physisch **Angriffe abfangen**, die fuer seinen Besitzer bestimmt sind.

### Ablauf

1. `TryStartIntercept(target)` -> Companion bewegt sich zur Schutzposition zwischen Besitzer und Bedrohung
2. Schutzposition: `BesitzerPos + RichtungZumFeind * InterceptOffset (1.2)`
3. Sobald innerhalb der Positionstoleranz (0.5): Intercept-Fenster oeffnet sich (0.8s)
4. Waehrend des Fensters: Wenn der spezifische Feind einen Melee-Treffer auf den Besitzer landet, **absorbiert der Companion den Schaden**
5. Danach: Cooldown (6s) bevor naechster Intercept moeglich

### Intercept-Phasen

```
None -> MovingToPosition -> WindowOpen -> Consumed
```

---

## Primal Bond (Transformations-Mechanik)

### Voraussetzungen

- Spieler hat **Focus = 100** (Maximum)
- Companion ist **am Leben**, nicht merged, nicht recovering, nicht suspended
- Companion ist innerhalb von **3.5 Einheiten** zum Spieler
- Spieler ist **am Boden**, in neutralem Zustand (kein Angriff, Block, etc.)

### Aktivierung

1. Spieler loest Transform-Intent aus (Taste T oder Portrait-Button)
2. System validiert Proximitaet + Companion-Health
3. **30 Ticks / 0.5s** committed Aktivierungsanimation (nicht abbrechbar)
4. Companion geht in **Merged-State** — verschwindet vom Schlachtfeld, wird in den Spieler absorbiert
5. Archetyp-spezifische Kampfmodifikatoren werden angewendet

### Waehrend aktiv

- Focus draint mit **1.5 Focus/s x BondForm.FocusDrainMultiplier**
- Focus-Gewinne laufen weiter mit **50% Multiplikator**
- Archetyp-spezifische Kampfmodifikationen sind aktiv
- Visuelle Aura zeigt archetyp-farbige Energiestreifen (Wolf = Gruen/Gelb, Turtle = Blau/Cyan)

### Exit-Bedingungen

- Focus erreicht 0
- Spieler-Tod / Respawn
- Match-Freeze / Match-Ende
- **Manuelles Entkoppeln:** Transform-Taste erneut druecken beendet den Bond bewusst
- Companion stirbt waehrend der Aktivierungs-Windup-Phase -> erzwungenes Ende

### Nach dem Ende

- Companion wird physisch **neben dem Spieler wiederhergestellt** am Follow-Offset
- Wenn Spieler auf Lane -> Companion geht in Lane / Owner-Centric-Modus
- Wenn Spieler auf Plattform -> Companion kehrt zum Turm zurueck
- Alle Archetyp-Modifikatoren werden entfernt

---

## Archetyp-spezifische Bond-Effekte

### Wolf Bond — Identitaet: aggressiv, mobil, verfolgungsorientiert

- **Bewegungsboost:** 1.25x / 1.35x / 1.5x (je nach Form)
- **Pounce:** Sprint-Angriff wird zu "PRIMAL POUNCE" — erhoehter Carry-Multiplikator (1.3x / 1.5x / 1.95x)
- Hoeherer Focus-Drain bei Form II und III (Risk/Reward)

### Turtle Bond — Identitaet: defensiv, unbeweglich, Gegendruck

- **Shell Guard:** Eingehende Verdraengung reduziert (0.7x / 0.55x / 0.4x je nach Form)
- **Fortified State:** Nach erfolgreichem Block oder Perfect Block wird die Verdraengungsreduktion nochmals verstaerkt fuer eine Dauer (0.4x -> 0.3x -> 0.2x fuer 0.75s -> 1.15s -> 1.5s)
- **Shell Rush:** Sprint-Angriff wird zu "SHELL RUSH" — erhoehter Knockback auf Ziel (1.35x / 1.5x / 1.65x)
- Focus-Drain bleibt bei 1.0x fuer alle Formen (Sustain-Design)

### Sprint-Angriff-Varianten

| Variante | Wann | Effekt |
|----------|------|--------|
| Normal | Kein Bond aktiv | Standard Sprint Attack |
| Pounce | Wolf-Bond aktiv | "PRIMAL POUNCE" — erhoehter Carry |
| Shell Rush | Turtle-Bond aktiv | "SHELL RUSH" — erhoehter Target-Knockback |

---

## Niederlage & Erholung

- Companion bei 0 HP -> geht in **Recovering**-Praesenz
- Versteckt fuer **12 Sekunden**, respawnt dann am freundlichen Turm
- Turm muss als Respawn-Punkt gueltig sein
- Waehrend **Last Stand** (kein Turm mehr): kein sicherer Rueckkehrpunkt, lebender Companion bleibt exponiert
- Match-Ende stoppt Companion-KI sofort

---

## Datenarchitektur (fuer Implementierung)

### CompanionDefinition (ScriptableObject / Konfigurationsdatei)

Enthaelt:
- Beziehungsdistanzen, Follow-Parameter, Lane-Dauer, Defeat-Recovery-Zeit, Intercept-Parameter
- Referenz auf **CharacterDefinition** (HP, Speed, Combat — Single Source of Truth)
- **BondArchetype** (Wolf oder Turtle)
- **PrimalEvolutionStage** (I / II / III)
- Array von **BondFormDefinition[]** (die evolutionsgesteuerten Formen)

### BondFormDefinition (ScriptableObject / Konfiguration)

Pro Form:
- FormIndex, DisplayName, RequiredEvolution, PresentationMode
- Universal: FocusDrainMultiplier
- Wolf-spezifisch: MovementMultiplier, PounceCarryMultiplier
- Turtle-spezifisch: ShellGuardMultiplier, FortifiedMultiplier, FortifiedDurationSeconds, ShellRushTargetPushMultiplier

### Runtime-Komponenten

| Klasse | Verantwortung |
|--------|---------------|
| **PetCompanionRuntime** | Autonome Entscheidungsschicht (Follow, Zielwahl, Angriff, Intercept, Deployment, Recovery, Merged-State) |
| **PetCompanionController** | Input-Adapter: wandelt KI-Entscheidungen in CharacterIntents um |
| **PrimalBondRuntime** | Verbindet Companion mit dem Transformations-System, managed Merge/Restore-Lifecycle |
| **IPrimalBondProfile** | Interface fuer Archetyp-Profile |
| **WolfBondProfile** | Wendet Wolf-Modifikatoren an/entfernt sie |
| **TurtleBondProfile** | Wendet Turtle-Modifikatoren an/entfernt sie |

### Visuelle Feedback-Komponenten

| Klasse | Funktion |
|--------|----------|
| **PrimalBondFeedback** | Archetyp-farbige Aura-Streifen waehrend Bond |
| **PetCommandFeedback** | World-Space-Diamant-Marker fuer Focus-Target und Intercept-Status |

---

## Bestehende Asset-Instanzen

**Companions:** `companion_test_wolf`, `companion_test_turtle`

**Bond Forms:**
- Wolf: `bond_wolf_i` (Synchronization), `bond_wolf_ii` (Hunter), `bond_wolf_iii` (Apex Predator)
- Turtle: `bond_turtle_i` (Shell Sync), `bond_turtle_ii` (Bulwark), `bond_turtle_iii` (Ironclad)

---

## Explizit deferred / Noch nicht implementiert

- Pet Recall-Befehl
- Manuelle Befehle ueber Turm-Klick und C+Klick-Focus hinaus
- Taunt / Protect / Intercept-on-Demand
- Bedrohungssystem
- Pet Abilities / Skills / Combos / Block / Air Attacks
- Companion-Progressionssystem (wie die 3 Stufen freigeschaltet werden)
- Mehrere gleichzeitige Companions
- Revive-UI
- Navigation Mesh
- Finale Art / Audio / Animation
- Networking und Save-Persistenz
