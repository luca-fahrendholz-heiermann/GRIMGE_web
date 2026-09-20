# GRIMGE Special Runes Concept

## 1. Zweck dieses Dokuments

Dieses Dokument definiert die langfristige Special-Rune-Library für **GRIMGE**.

Special Runes sind keine normalen Rune-Spells.

Sie sind seltene, klar erkennbare Fähigkeiten, die:

- einen Kampfzustand verändern
- die Arena beeinflussen
- das Grimoire manipulieren
- starke Summons erzeugen
- den Charakter temporär empowern
- Raum, Zeit oder Position verändern
- ungewöhnliche Counter-Mechaniken ermöglichen
- extreme audiovisuelle Wow-Momente erzeugen

Die Special Runes sollen GRIMGE deutlich von klassischen Action-RPGs, MOBAs und Arena-Fightern abheben.

---

# 2. Harte Systemregel: Keine echte Transformation durch Special Runes

Special Runes dürfen **keinen neuen Character Sprite und kein neues Character Model benötigen**.

Der existierende Charakter bleibt immer erhalten.

Erlaubt sind:

- Shader
- Material Overrides
- Silhouetten
- Abdunklung
- Aufhellung
- Outline
- Glow
- Partikel
- Aura
- Rauch
- Energieeffekte
- Afterimages
- Ghost Projections
- spirituelle Projektionen
- schwebende Runen
- Weapon Trails
- VFX Wings
- VFX Armor
- gigantische Projektionen hinter dem Spieler
- Screen Effects
- kurze Camera Effects
- additive Geometrie oder Partikel, solange kein eigener Character-Rig nötig ist

Nicht erlaubt sind:

- neuer Dragon Character Sprite
- neuer Wolf Character Sprite
- Hybrid Character Sprites
- eigenes Transformations-Skeleton
- komplette alternative Character Animation Sets
- vollständige Tierformen
- echte Körpertransformationen

Echte Transformationen bleiben exklusiv für:

- Primal Bonds
- Mastery Transformations
- Class Transformations

---

# 3. Trennung zu anderen Rune-Systemen

## Basisrune

Ein magischer Baustein.

Beispiele:

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
- Invocation
- Construction
- Ward
- Control

## Rune Combination

Mehrere Basisrunen erzeugen einen normalen Spell.

Beispiel:

```text
Fire + Wind
→ Flame Tornado
```

## Special Rune

Eine eigenständige Rune mit klarer Signature Ability.

Beispiel:

```text
Chrono Vault
→ Zeitkuppel
```

Special Runes werden nicht als normale Kombination aus Basisrunen erzeugt.

Sie besitzen eine eigene Rune-Signatur.

---

# 4. Herkunftskategorien

## Primal

Uralte Naturkräfte, Wesen und elementare Urmagie.

## Ancient

Vergessene Hochmagie, Raum, Zeit, Realität und seltene Ritualtechniken.

## Boss

Von Bossen erhaltene Signature-Abilities.

## Event

Besondere zeitlich begrenzte oder Challenge-basierte Runen.

## Collaboration

Nur für reale Kooperationen mit externen IPs.

---

# 5. Funktionale Kategorien

Jede Special Rune besitzt zusätzlich einen funktionalen Typ.

- Summon
- Reality
- Counter
- Ascension
- Manifestation
- Cataclysm
- Mobility
- Forbidden
- Grimoire
- Support
- Control
- Utility

---

# 6. Designprinzipien

## 6.1 Kein einfacher Damage Upgrade

Eine Special Rune soll nicht sein:

> Fireball, aber größer.

Dafür existieren normale Spells.

Eine Special Rune soll einen neuen Zustand erzeugen.

---

## 6.2 Klare Lesbarkeit

Der Gegner muss erkennen können:

- welche Special Rune gestartet wurde
- welcher Bereich betroffen ist
- wie lange der Effekt dauert
- ob Counterplay möglich ist

---

## 6.3 Power mit Counterplay

Starke Special Runes dürfen extrem wirken.

Sie benötigen aber:

- Telegraph
- Timing Window
- Position Requirement
- Cooldown
- Resource Cost
- Gegenmechanik
- oder kurze Wirkungsdauer

---

## 6.4 Arena und System Interaktion

Die besten Special Runes interagieren mit:

- Minions
- Lane
- Towers
- Castle
- Platforms
- Summons
- Projectiles
- Grimoire
- Rune Slots
- Movement
- Battlefield States

---

# 7. Vollständige Special-Rune-Liste

# A. SUMMON RUNES

## SR-001 Elder Dragon

**Kategorie:** Primal  
**Typ:** Summon  
**Affinitäten:** Invocation / Fire / Wind

### Effekt
Ein riesiger Drache fliegt als spirituelle oder magische Projektion über die Arena.

Er führt einen großflächigen Breath Attack aus.

### Mechanik
- kurzer global sichtbarer Telegraph
- Flugbahn wird angekündigt
- Breath zieht über einen großen Bereich
- hohe Area Denial
- kein permanentes Pet

### PvP
- betroffenen Bereich verlassen
- Plattformen nutzen
- Ward vorbereiten
- Cast vor Manifestation unterbrechen

### PvE
Sehr stark gegen große Gegnergruppen, Boss Adds und Minion Waves.

### Castle Siege
Starke Lane-Clear- und Pressure-Rune.

---

## SR-002 Storm Wolf

**Kategorie:** Primal  
**Typ:** Summon  
**Affinitäten:** Invocation / Lightning / Wind

### Effekt
Ein riesiger spiritueller Wolf sprintet durch die Lane.

### Mechanik
- verfolgt kurz ein Ziel oder eine Richtung
- stößt leichte Gegner um
- erzeugt Lightning Arcs
- endet mit einem Sprung oder Bite Impact

### Counterplay
- Jump
- Plattformwechsel
- Ward
- harte Unterbrechung vor Manifestation

---

## SR-003 Rune Serpent

**Kategorie:** Primal oder Boss  
**Typ:** Summon / Control  
**Affinitäten:** Invocation / Control

### Effekt
Eine gigantische Runenschlange bewegt sich wellenartig durch die Lane.

### Mechanik
- hebt Gegner hoch
- unterbricht Minion Formations
- erzeugt kurze Launch-Zonen
- kann Plattformbereiche kreuzen

---

## SR-004 Void Spider

**Kategorie:** Boss  
**Typ:** Summon / Control  
**Affinitäten:** Invocation / Void / Binding

### Effekt
Eine große Void-Spinne erscheint auf einer Plattform oder Wand.

### Mechanik
- erzeugt Web Zones
- bindet Gegner
- zieht markierte Gegner leicht heran
- kontrolliert vertikalen Raum

### Counterplay
- Webs zerstören
- Position wechseln
- Anti-Binding-Effekt

---

## SR-005 Stone Colossus

**Kategorie:** Primal  
**Typ:** Summon  
**Affinitäten:** Invocation / Earth

### Effekt
Ein großer Golem erscheint temporär.

### Mechanik
- blockiert Projektile
- Ground Slam
- Push
- hoher Stagger
- kurze Lebensdauer
- klarer Frontline-Fokus

---

## SR-006 Phoenix

**Kategorie:** Primal  
**Typ:** Summon / Support  
**Affinitäten:** Invocation / Fire / Light

### Effekt
Ein Phoenix fliegt durch die Arena.

Danach bleibt eine leuchtende Feder beim Spieler.

### Mechanik
Wenn der Spieler kurz darauf tödlichen Schaden erleidet:
- Tod wird einmal verhindert
- Spieler kehrt mit sehr niedrigen HP zurück
- Phoenix Burst wird ausgelöst

### Balance
Kein voller Revive.

---

## SR-007 Thunderbird

**Kategorie:** Primal  
**Typ:** Summon  
**Affinitäten:** Invocation / Lightning / Wind

### Effekt
Ein riesiger Vogel beherrscht den oberen Raum.

### Mechanik
- Dive Attack
- Lightning Strike
- Air Denial
- Knockdown

---

## SR-008 Abyss Leviathan

**Kategorie:** Boss  
**Typ:** Summon / Cataclysm  
**Affinitäten:** Invocation / Water / Void

### Effekt
Ein gigantisches Wesen bewegt sich unter oder hinter der Arena.

Danach entsteht eine massive Wasserwelle.

### Mechanik
- starke Push-Wirkung
- löscht kleine Projektile
- verschiebt Minions
- kontrolliert große Lane-Bereiche

---

## SR-009 Shadow Legion

**Kategorie:** Boss  
**Typ:** Summon  
**Affinitäten:** Invocation / Shadow

### Effekt
Drei Elite-Shadows erscheinen.

### Einheiten
- Blade Shadow
- Spear Shadow
- Archer Shadow

### Mechanik
- kurze Lebensdauer
- keine große Armee
- geringe AI-Komplexität
- hohe visuelle Wirkung

---

## SR-010 Spirit Knight

**Kategorie:** Ancient  
**Typ:** Summon / Support  
**Affinitäten:** Invocation / Light / Ward

### Effekt
Ein großer Guardian Spirit begleitet den Spieler.

### Mechanik
- pariert einen starken Treffer
- führt Counter Slash aus
- kann kurz Projektile abfangen

---

# B. REALITY RUNES

## SR-011 Chrono Vault

**Kategorie:** Ancient  
**Typ:** Reality / Control  
**Affinitäten:** Control

### Effekt
Eine große Zeitkuppel entsteht.

### Innerhalb
- Gegner stark verlangsamt
- Projektile nahezu eingefroren
- Minions verlangsamt
- Caster bewegt sich normal

### Counterplay
- Bereich verlassen
- Cast unterbrechen
- Reality-Counter einsetzen

---

## SR-012 Gravity Maw

**Kategorie:** Boss oder Ancient  
**Typ:** Reality / Control  
**Affinitäten:** Void / Control

### Effekt
Eine Singularität entsteht.

### Mechanik
Sie zieht:
- Spieler
- Minions
- Summons
- kleine Projektile

zum Zentrum.

Danach folgt ein Collapse-Burst.

---

## SR-013 Duel Realm

**Kategorie:** Ancient  
**Typ:** Reality  
**Affinitäten:** Void / Control

### Effekt
Caster und Ziel werden für kurze Zeit in eine separate Duellarena versetzt.

### Mechanik
- etwa 4 bis 6 Sekunden
- Hauptbattlefield läuft weiter
- keine externe Hilfe
- danach Rückkehr an definierte Positionen

### Balance
- kein Instant Kill
- klare Aktivierungsanimation
- mögliche Resistance gegen wiederholte Nutzung

---

## SR-014 Spatial Lock

**Kategorie:** Ancient  
**Typ:** Reality / Control  
**Affinitäten:** Control / Ward

### Effekt
Ein Feld verhindert bestimmte Raumbewegungen.

### Blockiert
- Blink
- Teleport
- Position Swap
- Shift-artige Effekte

### Nicht zwingend blockiert
- normaler Dash
- Jump
- Knockback

---

## SR-015 Mirror Gate

**Kategorie:** Ancient  
**Typ:** Reality / Utility  
**Affinitäten:** Construction / Control

### Effekt
Zwei verbundene Portale erscheinen.

### Transportiert
- Spieler
- Projektile
- ausgewählte Summons

---

## SR-016 Recall Echo

**Kategorie:** Ancient  
**Typ:** Reality / Utility  
**Affinitäten:** Control / Light

### Effekt
Beim Cast werden gespeichert:
- Position
- HP
- Bewegungszustand

Nach kurzer Zeit erfolgt Rückkehr zum gespeicherten Zustand.

### Balance
Negative Status Effects können bestehen bleiben.

---

## SR-017 World Fold

**Kategorie:** Ancient  
**Typ:** Reality  
**Affinitäten:** Void / Control

### Effekt
Zwei entfernte Arena-Bereiche werden temporär räumlich verbunden.

### Mechanik
- verkürzt Wege
- erzeugt neue Angriffsachsen
- beeinflusst auch Projektile

### Status
Späte High-Complexity Rune.

---

## SR-018 Null Domain

**Kategorie:** Ancient  
**Typ:** Reality / Ward  
**Affinitäten:** Void / Ward

### Effekt
Ein Bereich schwächt aktive Magie.

### Innerhalb
- Spell Damage reduziert
- Duration reduziert
- Summon Power reduziert

### Wichtig
Keine komplette Magiesperre.

---

# C. COUNTER RUNES

## SR-019 Rampart Reversal

**Kategorie:** Boss  
**Typ:** Counter  
**Affinitäten:** Ward / Force

### Effekt
Der nächste starke Treffer wird absorbiert.

Danach wird gespeicherte Energie als Shockwave zurückgegeben.

### Skill-Komponente
Perfektes Timing erhöht Stärke.

---

## SR-020 Mirror Reprisal

**Kategorie:** Ancient  
**Typ:** Counter  
**Affinitäten:** Ward / Control

### Effekt
Der nächste reflektierbare Spell wird zurückgeschickt.

### Einschränkung
Nicht jede Special Rune kann reflektiert werden.

---

## SR-021 Phantom Substitute

**Kategorie:** Ancient  
**Typ:** Counter / Mobility  
**Affinitäten:** Shadow / Shift

### Effekt
Beim nächsten Treffer bleibt ein Schatten-Dummy zurück.

Der Spieler erscheint leicht versetzt.

---

## SR-022 Last Light

**Kategorie:** Ancient  
**Typ:** Counter / Support  
**Affinitäten:** Light / Ward

### Effekt
Ein tödlicher Treffer wird einmal verhindert.

Danach:
- HP bleibt sehr niedrig
- Light Burst
- sehr kurze Schutzphase für Spawn-Sicherheit

---

## SR-023 Nullshell

**Kategorie:** Boss  
**Typ:** Counter  
**Affinitäten:** Void / Ward

### Effekt
Eine extrem kurze Anti-Spell-Hülle entsteht.

### Perfektes Timing
Der Spell verschwindet vollständig.

### Schlechtes Timing
Rune wird verbraucht.

---

## SR-024 Spellbreak Halo

**Kategorie:** Ancient  
**Typ:** Counter  
**Affinitäten:** Ward / Control

### Effekt
Mehrere kleine Runen kreisen um den Spieler.

### Mechanik
Zerstört eine begrenzte Zahl kleiner Projektile.

---

## SR-025 Iron Soul

**Kategorie:** Primal  
**Typ:** Counter / Support  
**Affinitäten:** Earth / Ward

### Effekt
Temporär:
- hoher Knockback-Widerstand
- hoher Stagger-Widerstand
- kein vollständiger Damage Immunity

---

# D. ASCENSION RUNES

Diese Special Runes verändern den bestehenden Charakter ausschließlich durch VFX.

Keine neue Sprite- oder Model-Generation.

## SR-026 Storm Body

**Kategorie:** Primal  
**Typ:** Ascension  
**Affinitäten:** Lightning / Wind

### Visuell
- elektrische Outline
- Afterimages
- Energy Trails
- Lichtblitze

### Mechanik
- bessere Dash-Recovery
- erhöhte Movement Speed
- Dash kann leichte Gegner passieren
- Weapon Hits erzeugen kleine Lightning Bursts

---

## SR-027 Umbral Ascension

**Kategorie:** Ancient  
**Typ:** Ascension  
**Affinitäten:** Shadow / Void

### Visuell
- bestehende Silhouette stark abgedunkelt
- transparente Shadow Trails
- dunkler Edge Glow
- Rauch

### Mechanik
- Afterimage Attacks
- bessere Repositionierung
- kurz reduzierte Projektiltrefferfläche möglich

---

## SR-028 Solar Ascension

**Kategorie:** Ancient  
**Typ:** Ascension  
**Affinitäten:** Light / Fire

### Visuell
- goldene Aura
- schwebende Runen
- Light Rays
- verstärkte Weapon Trails

### Mechanik
- Treffer erzeugen kleine Solar Bursts
- leichte Heal-on-hit-Komponente möglich
- erhöhte Resistance gegen Shadow-Effekte

---

## SR-029 Spirit Armor

**Kategorie:** Ancient  
**Typ:** Ascension / Manifestation  
**Affinitäten:** Invocation / Ward

### Visuell
Eine große transparente spirituelle Rüstung liegt als VFX-Projektion um den Spieler.

### Mechanik
- Heavy Attacks erhalten spirituelle Follow-ups
- höherer Stagger-Widerstand
- einzelne Treffer können durch Spirit Guard reduziert werden

### Asset-Regel
Der Character Sprite bleibt unverändert.

---

## SR-030 Berserk Ascension

**Kategorie:** Boss  
**Typ:** Ascension  
**Affinitäten:** Fire / Force

### Visuell
- aggressive Aura
- rote Trails
- pulsierende Runen
- Screen Shake bei Heavy Hits

### Mechanik
- Attack Speed erhöht
- Cancel Windows verbessert
- Knockback erhöht
- Defense reduziert

---

## SR-031 Titan's Presence

**Kategorie:** Primal  
**Typ:** Ascension / Manifestation  
**Affinitäten:** Earth / Force

### Visuell
Eine gigantische VFX-Silhouette erscheint hinter dem Spieler.

### Mechanik
- Heavy Attacks erzeugen zusätzliche spirituelle Impacts
- Ground Slam größer
- kein tatsächliches Character Scaling

---

## SR-032 Dragon Soul

**Kategorie:** Primal  
**Typ:** Ascension / Manifestation  
**Affinitäten:** Invocation / Fire / Wind

### Visuell
- Dragon Aura
- VFX Wings
- spiritueller Drachenkopf bei Finishern
- Dragon-Eye Screen Effect

### Mechanik
- Weapon Finisher erzeugt Dragon Breath Arc
- Dash hinterlässt Fire/Wind Trail

### Wichtig
Keine echte Dragon Transformation.

---

## SR-033 Beast Spirit

**Kategorie:** Primal  
**Typ:** Ascension / Manifestation  
**Affinitäten:** Nature / Invocation

### Visuell
Ein großer Tiergeist überlagert den bestehenden Charakter.

### Mechanik
- Movement Speed
- aggressive Follow-up Hits
- kurze Spirit-Pounce-Projektionen

### Wichtig
Keine echte Tierform.

---

# E. MANIFESTATION RUNES

## SR-034 Thousand Blades

**Kategorie:** Ancient  
**Typ:** Manifestation  
**Affinitäten:** Invocation / Control

### Effekt
Viele spirituelle Klingen erscheinen im Hintergrund.

### Mechanik
- nur ein Teil besitzt echte Hitboxen
- Klingen schlagen sequenziell ein
- große visuelle Präsenz ohne hunderte echte Projectiles

---

## SR-035 Spirit Greatblade

**Kategorie:** Ancient  
**Typ:** Manifestation  
**Affinitäten:** Invocation / Force

### Effekt
Eine gigantische Energie-Klinge erscheint.

### Mechanik
Ein einzelner sehr großer Slash.

---

## SR-036 Lance Halo

**Kategorie:** Ancient  
**Typ:** Manifestation  
**Affinitäten:** Invocation

### Effekt
Mehrere Spektralspeere schweben hinter dem Spieler.

### Fire Modes
- sequenziell
- gleichzeitig
- auf mehrere Ziele verteilt

---

## SR-037 Phantom Dagger Rush

**Kategorie:** Boss  
**Typ:** Manifestation  
**Affinitäten:** Shadow / Invocation

### Effekt
Spirit-Dolche erscheinen um ein Ziel.

### Ablauf
- kurzer Telegraph
- Position Lock
- Einschlag aus mehreren Richtungen

---

## SR-038 Reaper Arc

**Kategorie:** Boss  
**Typ:** Manifestation  
**Affinitäten:** Shadow / Void

### Effekt
Eine gigantische Scythe-Projektion zieht durch einen großen Bereich.

### Mechanik
- Pull am Anfang
- Slash am Ende

---

## SR-039 World Splitter

**Kategorie:** Ancient  
**Typ:** Manifestation  
**Affinitäten:** Force / Earth

### Effekt
Ein massiver horizontaler Slash wird projiziert.

### Nachwirkung
Verzögerte Ground Shockwave.

---

## SR-040 Arcane Arsenal

**Kategorie:** Ancient  
**Typ:** Manifestation  
**Affinitäten:** Invocation / Control

### Effekt
Mehrere Waffen manifestieren sich.

Beispiele:
- Sword
- Spear
- Axe
- Bow

### Mechanik
Sie greifen in fester Sequenz an.

---

# F. CATACLYSM RUNES

## SR-041 Starfall

**Kategorie:** Ancient  
**Typ:** Cataclysm  
**Affinitäten:** Light / Fire

### Effekt
Mehrere Einschlagsmarkierungen erscheinen.

Danach schlagen Arcane Stars ein.

---

## SR-042 Meteor Crown

**Kategorie:** Primal  
**Typ:** Cataclysm  
**Affinitäten:** Fire / Earth

### Effekt
Mehrere kleinere Meteore treffen.

Danach folgt ein großer Abschlussmeteor.

---

## SR-043 Frozen Horizon

**Kategorie:** Primal  
**Typ:** Cataclysm / Field  
**Affinitäten:** Ice / Field

### Effekt
Ein großer Teil der Arena vereist.

### Mechanik
- weniger Bodenhaftung
- Sliding
- Slow
- veränderte Dash-Distanzen möglich

---

## SR-044 Tempest Judgment

**Kategorie:** Primal  
**Typ:** Cataclysm  
**Affinitäten:** Lightning / Wind

### Effekt
Eine Gewitterzelle zieht über die Arena.

### Mechanik
- lesbare Blitzmuster
- kein rein zufälliger Schaden
- Air Denial

---

## SR-045 Tidal Breaker

**Kategorie:** Primal  
**Typ:** Cataclysm  
**Affinitäten:** Water / Force

### Effekt
Eine riesige Welle zieht durch die Lane.

### Mechanik
- Push
- Minion Displacement
- kleinere Projektile werden entfernt

---

## SR-046 Verdant Colossus

**Kategorie:** Primal  
**Typ:** Cataclysm / Construction  
**Affinitäten:** Nature / Construction

### Effekt
Ein gigantischer Baum wächst temporär aus dem Battlefield.

### Mechanik
- Wurzeln verändern Wege
- Gegner werden angehoben
- temporäre Plattformen entstehen

---

## SR-047 Eclipse Zone

**Kategorie:** Ancient  
**Typ:** Cataclysm / Field  
**Affinitäten:** Light / Shadow / Field

### Effekt
Die Arena wechselt zwischen Light- und Shadow-Phase.

### Mechanik
Bestimmte Effekte reagieren auf die Phase.

---

## SR-048 Abyss Collapse

**Kategorie:** Boss  
**Typ:** Cataclysm  
**Affinitäten:** Void

### Effekt
Ein Bereich wird stark zusammengezogen.

Dann folgt eine massive Explosion.

---

## SR-049 Earthshatter Echo

**Kategorie:** Primal  
**Typ:** Cataclysm  
**Affinitäten:** Earth / Force

### Effekt
Die Stärke der Shockwave steigt mit der Zahl naher Units.

### Stärke
Perfekt für Castle Siege und Minion Waves.

---

## SR-050 Dragonstorm

**Kategorie:** Primal  
**Typ:** Cataclysm  
**Affinitäten:** Wind / Invocation

### Effekt
Ein Sturm entsteht.

Dann fliegt ein großer spiritueller Drache durch die Sturmzone.

### Abgrenzung
Elder Dragon = gezielter Summon Attack.

Dragonstorm = Battlefield Cataclysm.

---

# G. MOBILITY RUNES

## SR-051 Rift Step

**Kategorie:** Ancient  
**Typ:** Mobility  
**Affinitäten:** Shift / Void

### Effekt
Ein langer, extrem schneller Blink.

### Mechanik
- kann durch Gegner
- kann durch kleine Projektile
- kann nicht beliebig durch Arena-Grenzen

---

## SR-052 Umbral Relay

**Kategorie:** Ancient  
**Typ:** Mobility  
**Affinitäten:** Shadow / Shift

### Effekt
Positionstausch mit:
- eigenem Shadow
- Summon
- Anchor

---

## SR-053 Skybreaker

**Kategorie:** Primal  
**Typ:** Mobility  
**Affinitäten:** Wind / Force

### Effekt
Extrem starker vertikaler Launch.

Danach kann ein Dive folgen.

---

## SR-054 Phantom Rush

**Kategorie:** Ancient  
**Typ:** Mobility / Manifestation  
**Affinitäten:** Shift / Shadow

### Effekt
Mehrere kurze Dashes.

Afterimages führen verzögert Slashes aus.

---

# H. FORBIDDEN RUNES

## SR-055 Copy Sigil

**Kategorie:** Ancient  
**Typ:** Forbidden / Grimoire  
**Affinitäten:** Control

### Effekt
Kopiert die zuletzt verwendete Basisrune des Gegners.

### Einschränkung
Keine Special Rune.

---

## SR-056 Spell Echo

**Kategorie:** Ancient  
**Typ:** Forbidden  
**Affinitäten:** Control

### Effekt
Der zuletzt selbst gewirkte normale Spell wird schwächer erneut ausgeführt.

---

## SR-057 Echo Clone

**Kategorie:** Ancient  
**Typ:** Forbidden / Manifestation  
**Affinitäten:** Shadow / Invocation

### Effekt
Ein Phantom wiederholt die letzte Weapon Combo des Spielers.

---

## SR-058 Curse Link

**Kategorie:** Boss  
**Typ:** Forbidden / Control  
**Affinitäten:** Shadow / Binding

### Effekt
Zwei Ziele werden verbunden.

Ein Teil des Schadens wird zwischen ihnen geteilt.

---

## SR-059 Sealbreaker

**Kategorie:** Ancient  
**Typ:** Forbidden / Utility  
**Affinitäten:** Control / Light

### Effekt
Schwächt oder zerstört:
- Field
- Binding
- Ward
- Construction

### Rolle
Anti-Setup Rune.

---

## SR-060 Fate Engine

**Kategorie:** Ancient  
**Typ:** Forbidden  
**Affinitäten:** Control

### Effekt
Ein sichtbares magisches Rad wählt aus einem begrenzten Effektpool.

### Mögliche Ergebnisse
- Power
- Speed
- Shield
- Double Cast
- Backfire

### Regel
Kein völlig unkontrollierter Zufall.

---

## SR-061 Soul Mirror

**Kategorie:** Ancient  
**Typ:** Forbidden / Manifestation  
**Affinitäten:** Invocation / Shadow

### Effekt
Ein Spiegelbild des Gegners erscheint.

### Mechanik
Es kopiert nur:
- aktuelle Weapon Combo
- keine vollständige Klasse
- keine Special Runes

---

## SR-062 Resonance Break

**Kategorie:** Ancient  
**Typ:** Forbidden / Field  
**Affinitäten:** Control / Field

### Effekt
Aktive normale Spell-Effekte in einem Gebiet kollabieren gleichzeitig.

### Nachwirkung
Die gespeicherte Magie erzeugt eine Shockwave.

---

# I. GRIMOIRE RUNES

Diese Kategorie greift direkt in das Rune-Deck, Rune-Slots oder die verfügbaren Rune-Copies ein.

## SR-063 Rune Mimic

**Kategorie:** Ancient  
**Typ:** Grimoire / Copy  
**Affinitäten:** Control

### Effekt
Kopiert die zuletzt vom Gegner verwendete Basisrune.

### Ergebnis
Die Rune wird temporär direkt bei dir geslottet.

### Dauer
Bis:
- einmal verwendet
- oder Zeitlimit abgelaufen

---

## SR-064 Spell Mimic

**Kategorie:** Ancient  
**Typ:** Grimoire / Copy  
**Affinitäten:** Control

### Effekt
Kopiert den zuletzt gewirkten normalen Spell.

### Unterschied
Rune Mimic kopiert nur die einzelne Rune.

Spell Mimic kopiert das fertige Spell-Ergebnis.

---

## SR-065 Arcane Exile

**Kategorie:** Ancient  
**Typ:** Grimoire / Banish  
**Affinitäten:** Control / Void

### Effekt
Eine gegnerische Rune-Copy wird temporär verbannt.

### Wichtig
Keine permanente Zerstörung.

---

## SR-066 Rune Decay

**Kategorie:** Boss  
**Typ:** Grimoire / Banish  
**Affinitäten:** Void / Control

### Effekt
Reduziert temporär die Anzahl verfügbarer Copies einer Rune.

### Beispiel

```text
Shift 2/2
→
Shift 1/2
```

---

## SR-067 Grimoire Heist

**Kategorie:** Ancient  
**Typ:** Grimoire / Steal  
**Affinitäten:** Control / Shadow

### Effekt
Eine gegnerische Rune wird temporär entfernt und bei dir eingesetzt.

### Ablauf

```text
Enemy:
Fire removed

You:
Temporary Fire added
```

Nach Ablauf kehrt die gegnerische Rune zurück.

---

## SR-068 Seal of Silence

**Kategorie:** Ancient  
**Typ:** Grimoire / Seal  
**Affinitäten:** Binding / Control

### Effekt
Eine konkrete Rune des Gegners wird kurz blockiert.

### Balance
Kurze Dauer.

Klare visuelle Anzeige im gegnerischen Grimoire.

---

## SR-069 Grimoire Corruption

**Kategorie:** Boss  
**Typ:** Grimoire / Corrupt  
**Affinitäten:** Shadow / Void

### Effekt
Eine Corruption wird temporär in das gegnerische Grimoire eingefügt.

### Beim Trigger
Mögliche Effekte:
- kurze Silence
- Slow
- Draw Delay
- kleine Selbstschädigung

---

## SR-070 Arcane Lock

**Kategorie:** Ancient  
**Typ:** Grimoire / Lock  
**Affinitäten:** Binding / Control

### Effekt
Eine Slot-Position wird temporär blockiert.

### Beispiel

```text
Slot 1 Fire
Slot 2 [LOCKED]
Slot 3 Shift
```

---

## SR-071 Chaos Exchange

**Kategorie:** Event oder Ancient  
**Typ:** Grimoire / Disrupt  
**Affinitäten:** Control

### Effekt
Zwei Rune-Slots des Gegners tauschen ihre Position.

### Warnung
Nur sinnvoll, wenn Slot Muscle Memory Teil des Systems ist.

---

## SR-072 Arcane Static

**Kategorie:** Boss  
**Typ:** Grimoire / Disrupt  
**Affinitäten:** Lightning / Control

### Effekt
Die nächste Rune-Aktivierung des Gegners erhält eine kurze zusätzliche Verzögerung.

---

## SR-073 Broken Syntax

**Kategorie:** Ancient  
**Typ:** Grimoire / Disrupt  
**Affinitäten:** Control

### Effekt
Der Gegner kann für kurze Zeit keine Multi-Rune-Kombinationen erzeugen.

### Weiterhin möglich
Einzelne Basisrunen funktionieren normal.

---

## SR-074 Inverse Sigil

**Kategorie:** Ancient  
**Typ:** Grimoire / Corrupt  
**Affinitäten:** Control / Void

### Effekt
Die nächste Basisrune des Gegners wird abgeschwächt oder invertiert.

### Beispiele
- Fire verursacht kleine Rückstoßexplosion am Caster
- Shift hat reduzierte Distanz
- Ward hat reduzierte Stärke

---

## SR-075 Echo Thief

**Kategorie:** Ancient  
**Typ:** Grimoire / Copy  
**Affinitäten:** Control / Shadow

### Effekt
Der nächste normale Spell des Gegners wird nach seinem Cast automatisch von dir wiederholt.

### Balance
Kopie kann leicht schwächer sein.

---

## SR-076 Arcane Parasite

**Kategorie:** Boss  
**Typ:** Grimoire / Parasite  
**Affinitäten:** Shadow / Control

### Effekt
Eine gegnerische Rune wird markiert.

Jedes Mal, wenn diese Rune verwendet wird, erhältst du einen Vorteil.

### Mögliche Vorteile
- Energie
- kleine Heilung
- Cooldown Reduction
- Special Charge

---

## SR-077 Mind Fracture

**Kategorie:** Ancient  
**Typ:** Grimoire / Disrupt  
**Affinitäten:** Control / Shadow

### Effekt
Die aktuell vorbereitete Rune wird verworfen.

### Nutzung
Starker Interrupt gegen Telegraphed Combos.

---

## SR-078 Third Eye

**Kategorie:** Ancient  
**Typ:** Grimoire / Reveal  
**Affinitäten:** Light / Control

### Effekt
Zeigt temporär zusätzliche Informationen über das gegnerische Grimoire.

### Sichtbar
- Rune Slots
- verbleibende Copies
- gesperrte Runen
- temporäre Grimoire Effects

---

## SR-079 Forbidden Script

**Kategorie:** Ancient  
**Typ:** Grimoire / Steal / Seal  
**Affinitäten:** Control / Void

### Effekt
Die zuletzt verwendete Rune des Gegners wird:
1. beim Gegner versiegelt
2. bei dir temporär eingesetzt

### Beispiel

```text
Enemy uses:
Void

Forbidden Script

Enemy:
Void [SEALED]

You:
Void [TEMP]
```

---

## SR-080 Reclaim

**Kategorie:** Ancient  
**Typ:** Grimoire / Recycle  
**Affinitäten:** Light / Control

### Effekt
Stellt eine verbrauchte Rune-Copy wieder her.

### Beispiel

```text
Fire 0/2
→
Fire 1/2
```

---

## SR-081 Replication

**Kategorie:** Ancient  
**Typ:** Grimoire / Duplicate  
**Affinitäten:** Control / Invocation

### Effekt
Erzeugt eine temporäre zusätzliche Copy einer eigenen Rune.

### Beispiel

```text
Void 1/1
→
Void 2/1 TEMP
```

---

## SR-082 Perfect Reflection

**Kategorie:** Ancient  
**Typ:** Grimoire / Copy  
**Affinitäten:** Control

### Effekt
Kopiert die vollständige zuletzt verwendete normale Rune-Kombination.

### Einschränkung
- einmaliger Cast
- keine Special Runes
- hohe Kosten

---

## SR-083 Rune Parasite Seed

**Kategorie:** Boss  
**Typ:** Grimoire / Corrupt  
**Affinitäten:** Nature / Shadow / Control

### Effekt
Ein gegnerischer Rune-Slot wird infiziert.

### Mechanik
Nach mehrfacher Verwendung derselben Rune wächst der Parasite-Effekt.

### Stufen
1. kleine Verzögerung
2. geringe Energy Drain
3. einmaliger Lockout

### Counterplay
Rune wechseln oder reinigen.

---

## SR-084 Rune Anchor

**Kategorie:** Ancient  
**Typ:** Grimoire / Utility  
**Affinitäten:** Ward / Control

### Effekt
Eine eigene Rune wird temporär gegen:
- Steal
- Banish
- Seal

geschützt.

---

## SR-085 Purge Script

**Kategorie:** Ancient  
**Typ:** Grimoire / Cleanse  
**Affinitäten:** Light / Control

### Effekt
Entfernt einen negativen Grimoire-Effekt.

### Entfernt
- Lock
- Corruption
- Parasite
- Seal
- Static

---

## SR-086 Hidden Script

**Kategorie:** Ancient  
**Typ:** Grimoire / Defense  
**Affinitäten:** Shadow / Control

### Effekt
Ein oder mehrere eigene Rune-Slots werden vor Reveal-Effekten verborgen.

### Zusatz
Kann Copy-Rune-Zielauswahl erschweren.

---

# J. SUPPORT AND UTILITY RUNES

## SR-087 Sanctuary Field

**Kategorie:** Ancient  
**Typ:** Support / Field  
**Affinitäten:** Light / Ward

### Effekt
Innerhalb der Zone kann ein tödlicher Treffer nicht sofort töten.

### Mechanik
HP wird minimal gehalten.

### Balance
Sehr kurze Dauer.

---

## SR-088 Arcane Convergence

**Kategorie:** Ancient  
**Typ:** Utility / Control  
**Affinitäten:** Control / Void

### Effekt
Aktive kleine Projektile werden in einen Punkt gezogen.

Danach wird ihre gespeicherte Energie freigesetzt.

---

## SR-089 Mana Well

**Kategorie:** Ancient  
**Typ:** Support / Field  
**Affinitäten:** Water / Light / Control

### Effekt
Erzeugt ein temporäres Regenerationsfeld.

### Regeneriert
- Rune Energy
- Class Resource reduziert
- keine massive HP-Heilung

---

## SR-090 Ward Nexus

**Kategorie:** Ancient  
**Typ:** Support / Construction  
**Affinitäten:** Ward / Construction

### Effekt
Erzeugt einen Nexus.

Solange er lebt:
- kleine Wards werden stärker
- defensive Fields halten länger
- Verbündete erhalten leichte Protection

---

# 8. Empfohlenes Core Set für frühen Content

Nicht alle 90 Special Runes sollten sofort verfügbar sein.

Ein sinnvoller früher Pool wäre:

## Summon
- Elder Dragon
- Storm Wolf
- Rune Serpent
- Stone Colossus

## Reality
- Chrono Vault
- Gravity Maw
- Mirror Gate

## Counter
- Rampart Reversal
- Phantom Substitute
- Nullshell

## Ascension
- Storm Body
- Umbral Ascension
- Spirit Armor

## Manifestation
- Thousand Blades
- Spirit Greatblade
- World Splitter

## Cataclysm
- Meteor Crown
- Tidal Breaker
- Earthshatter Echo

## Mobility
- Rift Step
- Phantom Rush

## Grimoire
- Rune Mimic
- Arcane Exile
- Rune Decay
- Forbidden Script
- Reclaim
- Replication
- Broken Syntax

Das ergibt einen frühen Pool von ungefähr 28 deutlich unterschiedlichen Special Runes.

---

# 9. Grimoire Manipulation als eigene Meta-Ebene

GRIMGE besitzt dadurch drei gleichzeitig laufende Combat-Ebenen.

```text
PHYSICAL COMBAT
Class + Weapon
↓
Movement
Position
Combos

SPELL COMBAT
Basisrunen + Rune Combinations
↓
Normal Spells

GRIMOIRE WARFARE
Special Runes
↓
Copy
Steal
Seal
Banish
Corrupt
Protect
Recycle
Reveal
```

Diese dritte Ebene kann ein wesentliches Alleinstellungsmerkmal werden.

---

# 10. Balance-Regeln für Grimoire Runes

Grimoire Manipulation kann sehr schnell frustrierend werden.

Deshalb gelten harte Regeln.

## Keine permanente Zerstörung
Keine gegnerische Rune wird innerhalb eines Matches dauerhaft gelöscht.

## Keine langen Komplett-Lockouts
Eine gesamte Rune sollte nur sehr kurz vollständig gesperrt werden.

## Copies bevorzugt beeinflussen
Wenn möglich:

```text
2/2
→
1/2
```

statt:

```text
Rune vollständig deaktiviert
```

## Klare UI
Der Spieler muss sofort sehen:
- welche Rune betroffen ist
- welcher Effekt aktiv ist
- wie lange er dauert

## Direkte Counter
Rune Anchor und Purge Script sorgen dafür, dass Grimoire Manipulation nicht einseitig wird.

## Special Runes dürfen nicht normal kopiert werden
Normale Copy-Effekte gelten nur für:
- Basisrunen
- normale Rune Combinations

Nicht für Special Runes.

---

# 11. Rune Complexity

Jede Special Rune kann eine Zeichnungskomplexität besitzen.

## Complexity I
Schnell.

Geeignet für:
- Counter
- Mobility
- Utility

## Complexity II
Mittlere Zeichnungsdauer.

Geeignet für:
- Summons
- Grimoire Effects
- Manifestations

## Complexity III
Komplexe Rune.

Geeignet für:
- Cataclysms
- Reality Runes
- sehr starke Ancient Runes

Ein mächtiger Effekt kann dadurch bereits über das Zeichnen ein Risiko besitzen.

---

# 12. Cast Types

## Instant
Effekt startet direkt nach erfolgreicher Rune.

## Targeted
Spieler wählt Ziel.

## Directional
Effekt folgt einer Richtung.

## Field
Bereich wird platziert.

## Channel
Spieler muss kurz weiter casten.

## Reactive
Rune wartet auf einen Trigger.

Beispiel:
Rampart Reversal.

## Grimoire Target
Zielt auf Rune, Slot oder Spell State.

---

# 13. Telegraph-Regel

Je stärker eine Rune, desto deutlicher der Telegraph.

Beispiel:

## Chrono Vault
- große Rune auf Boden
- Audio Cue
- kurze Verzögerung

## Rift Step
- sehr kurzer Telegraph

## Elder Dragon
- Himmel verändert sich
- Schatten zieht über die Lane
- Breath folgt

---

# 14. Special Rune Slots

Mögliche Struktur:

```text
Grimoire

10 Normal Rune Slots
+
2 Special Rune Slots
```

Alternativ:

```text
10 Total Slots
max. 2 Special Runes
```

Die zweite Variante erzeugt härtere Build-Entscheidungen.

---

# 15. Special Rune Charges

Special Runes sollten nicht beliebig oft gespammt werden.

Mögliche Systeme:

- 1 Charge pro Match
- langer Cooldown
- Focus Cost
- Kill/Objective Charge
- Rune Energy Meter
- Special Meter

Die konkrete Lösung sollte später im Match-Balance-Dokument definiert werden.

---

# 16. Castle Siege Interaction

Die Special Runes sollen nicht nur für 1v1 entwickelt werden.

Beispiele:

## Gravity Maw
zieht eine ganze Minion Wave zusammen.

## Earthshatter Echo
wird stärker, je mehr Units vorhanden sind.

## Tidal Breaker
verschiebt eine komplette Lane.

## Mirror Gate
kann Castle-Projectiles umlenken.

## Rune Serpent
zerstört Formationen.

## Stone Colossus
erzeugt temporäre Frontline.

## Broken Syntax
kann einen gegnerischen Rune-Combo-Push verhindern.

## Forbidden Script
kann eine zentrale gegnerische Setup-Rune temporär stehlen.

---

# 17. PvE Interaction

Special Runes können im PvE andere Skalierungen besitzen.

Beispiel:

## Arcane Exile
Boss besitzt kein echtes Grimoire.

Stattdessen kann die Rune:
- eine Boss Ability temporär sperren

## Rune Mimic
kann bestimmte Boss-Spells temporär kopieren.

## Curse Link
kann Adds mit Boss verbinden.

## Earthshatter Echo
profitiert stark von Add Waves.

---

# 18. Boss Rune Design

Boss-Rune-Regel:

> Wenn ein Boss eine ikonische Signature Ability besitzt, sollte geprüft werden, ob eine spielbare Version davon als Boss Rune freigeschaltet werden kann.

Dadurch entsteht:

```text
Boss zeigt Fähigkeit
↓
Spieler lernt Counterplay
↓
Boss wird besiegt
↓
Rune wird freigeschaltet
↓
Spieler kann Fähigkeit selbst benutzen
```

---

# 19. Primal Rune Design

Primal Runes sollen sich anfühlen wie:

- Naturgewalten
- uralte Kreaturen
- primitive Magie
- elementare Archetypen

Sie dürfen spektakulär sein.

Sie dürfen aber keine echten Character Transformations übernehmen.

Diese gehören zu Primal Bonds.

---

# 20. Ancient Rune Design

Ancient Runes dürfen komplizierter sein.

Typische Themen:

- Raum
- Zeit
- Rune Manipulation
- Grimoire Manipulation
- Reality
- Echo
- Reflection
- Sealing

Ancient Runes sind ideal für High-Skill-Gameplay.

---

# 21. Visuelle Identität

## Primal
- organisch
- rohe Energie
- Tiermotive
- natürliche Runenformen

## Ancient
- geometrisch
- komplex
- konzentrische Kreise
- mathematische Formen
- präzise Linien

## Boss
- visuell an Boss angelehnt
- aggressive Formen
- charakteristische Signatur

## Event
- freiere Designsprache

---

# 22. Sound Design

Special Runes benötigen starke Audio-Signaturen.

Beispiele:

## Chrono Vault
Audio wird gedämpft.

## Gravity Maw
tiefer Sub-Bass.

## Elder Dragon
Flügelschlag und Breath Charge.

## Forbidden Script
Papier-, Schreib- oder Rune-Seal-Sound.

## Rune Mimic
kurzer Reverse-Sound.

---

# 23. Performance-Regeln

VFX müssen spektakulär wirken, ohne reale Systemlast unnötig zu erhöhen.

## Thousand Blades
100 sichtbare Klingen.

Aber nur:
- 6 bis 10 echte Hitboxes

## Shadow Legion
3 echte AI-Einheiten.

Keine 30.

## Elder Dragon
kein komplexes NavMesh.

Nur definierte Flugbahn.

## Spirit Armor
VFX-Projektion.

Kein zweites vollwertiges Character Rig.

---

# 24. Priorisierung nach Entwicklungsaufwand

## Niedrig
- Rampart Reversal
- Last Light
- Iron Soul
- Rift Step
- Rune Mimic
- Reclaim
- Replication
- Arcane Static

## Mittel
- Storm Wolf
- Stone Colossus
- Spirit Greatblade
- Meteor Crown
- Arcane Exile
- Forbidden Script
- Echo Clone

## Hoch
- Chrono Vault
- Duel Realm
- Mirror Gate
- World Fold
- Verdant Colossus
- Grimoire Corruption
- Perfect Reflection

---

# 25. Gesamtzielbild

Special Runes sollen GRIMGE nicht einfach mehr Schaden geben.

Sie sollen neue Spielsituationen erzeugen.

Ein guter Special-Rune-Moment sieht so aus:

```text
Enemy starts a push.

Gravity Maw
↓
Minion wave collapses into one point.

Enemy casts Chrono Vault
↓
Projectiles freeze.

Player activates Forbidden Script
↓
Enemy Void rune is sealed and stolen.

Rune Serpent
↓
Entire lane launches into the air.

World Splitter
↓
Fight ends in a huge physical impact.
```

Das ist das gewünschte GRIMGE-Gefühl.

---

# 26. Aktueller Umfang

Dieses Dokument definiert **90 Special Runes**.

Die Library deckt ab:

- Summons
- Reality Manipulation
- Counters
- VFX-only Ascensions
- Manifestations
- Cataclysms
- Mobility
- Forbidden Magic
- Grimoire Warfare
- Support
- Utility

Die Library ist bewusst größer als der geplante Launch-Umfang.

Sie dient als langfristiger Design-Pool für:

- Launch
- Seasons
- Boss Rewards
- Events
- Mastery Content
- Endgame
- PvP Meta
- Co-op
- Castle Siege
