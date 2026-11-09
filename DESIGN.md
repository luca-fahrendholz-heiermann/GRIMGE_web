# GRIMGE — Spielkonzept (Stand 9. Nov 2026)

Leitbild: ein Action-Brawler mit **Runenzeichnen** als einzigartigem Aufhänger. Wer besser zeichnet, spielt besser
(Note C–S). Kurze, lesbare Spektakel-Momente (Beam-Clash, „ich gegen die Armee“, Sphären-Duell) tragen das Spiel
viral; Deckbau, Klassen und Masteries tragen den Langzeit-Fortschritt.

## 1. Referenzen für Szenen und Level: Castle Crashers, Dragon's Crown

- **Seitenansicht in 2,5D** mit Tiefe (wie jetzt), keine freien Blickrichtungen: Erkunden über verzweigte Wege,
  Ebenen und eine Weltkarte statt einer offenen Draufsicht.
- **Kamera folgt der Figur** und ist näher dran: Figuren wirken größer, ein Level ist länger als der Bildschirm und
  wird erkundet — nicht alles ist sofort zu sehen.
- **Mehrere Ebenen** (Castle Crashers): Höhenstufen, Plattformen, Vordergrund- und Hintergrund-Parallax, Wege hinter
  und vor der Kampflinie, versteckte Ecken.
- **Szenen erzählen** (Dragon's Crown): handgemalte, detailreiche Hintergründe mit Tiefe, Bosse und Burgen als
  Szenenmittelpunkt, Schätze und Geheimnisse in der Umgebung.
- Konsequenz für die Technik: Kamera-Zoom und Scrolling-Level, größere und detailliertere Figuren-Sprites,
  Animations-Pipeline in Seitenansicht (Körperteile oder Mischform).

## 2. Deck-System

### Grundbegriffe
- Das Deck sind **Runenkarten**. Immer verfügbar ist das **Grund-Moveset** jeder Figur: Nahkampf-Combo, Sprint,
  Ausweichen, Aufladen und Klassen-Waffenkit — das entspricht den festen Attacken anderer Spiele. Das Deck liefert
  die Spezialfähigkeiten obendrauf.
- **Zieh-Rotation wie Clash Royale:** 3 Karten auf der Hand; eine gespielte Karte geht ans Ende des Stapels. Man kann
  planen („in zwei Karten kommt mein Meteor“) statt auf Zufall zu hoffen.

### Punktebudget + Mindestgröße

| Kartentyp | Punkte | Limit |
|---|---|---|
| Element-Rune (Feuer, Wasser, …) | 1 | 2× je Rune |
| Konter / Falle / Schnellzauber | 2 | 1× je Karte |
| EINFACH-Spezialrune / Beschwörung | 2 | 1× |
| Haltung / Atmung | 3 | 1× |
| Sphäre | 5 | genau 1 pro Deck |
| Arcane State | 5 | genau 1 pro Deck |

- **Deckgröße 10–14 Karten**, Budget **höchstens 20 Punkte** (erste Werte, im Playtest feinjustieren).
- Damit gibt es **kein Mini-Deck** nur aus Sphäre + Transformation: mindestens 10 Karten heißt, der Rest (mindestens
  8 Karten, z. B. Sphäre 5 + Arcane State 5 + 8 Element-Runen = 18 Punkte) wird mit
  Element-Runen, Kontern oder Spezialrunen aufgefüllt.

### Warum ein „starkes“ Deck nicht dauernd starke Karten spielt
Gebalanced wird **nur über zwei Ressourcen** (Entscheidung 9. Nov 2026) — keine Rundenlimits, keine Extra-Abklingzeiten:
- **Mana** für alles, was gezeichnet wird: Runen, Spezialrunen, Sphären und Arcane States. Starke Karten kosten viel
  (Sphäre / Arcane State 30–46+), Element-Runen 10–18; Regeneration 5,5/s + Mana bei Treffern. Wer das Mana für die
  Sphäre aufbringt, darf sie wirken — so oft das Mana reicht. Das hält das Zeichnen planbar: eine Rune geht genau
  dann, wenn ihr Mana da ist.
- **Fokus** für Transformation und Beam-Clash: der Balken füllt sich durch Kampf; mit guten Combos lädt er schneller
  — wer gut spielt, transformiert auch im PvP öfter. Techniken in der Transformation kosten Fokus (Spells gegen
  Formzeit getauscht).
- **Transformation und Arcane State schließen sich gegenseitig aus:** beide belegen die aufgeladenen schweren
  Angriffe mit ihren Techniken; während eine aktiv ist, lässt sich die andere nicht starten (im Spiel umgesetzt).
- Schnelle Rotation beschleunigt damit nur, *wie oft eine Karte auf die Hand kommt* — ob man sie wirken kann,
  entscheidet das Mana.

### Der Ausgleich zwischen den Stilen
- **Viele Element-Runen:** jede Hand ergibt etwas Brauchbares, weil zwei oder drei Runen zu Fusionen verschmelzen
  (Feuer + Wind = Feuersturm …). Konsistent, flexibel, hoher Schaden über Zeit, viele Combos — dafür keine Spitzen.
- **Wenige starke Karten:** hohe Spitzen (Sphäre, Arcane State) zu planbaren Zeitpunkten, dazwischen mehr Grund-Moveset.
- **Konter-lastig:** reagiert auf den Gegner, gewinnt durch Lesen statt durch Masse.

## 3. Konter-Ebene (Yu-Gi-Oh-Gefühl)

Das **Zeichnen ist sichtbar**: der Zauberkreis vor der Figur zeigt, welche Rune entsteht. Daraus entsteht ein
Ketten-Gefühl — „ich sehe deine Rune und antworte“:
- **Schnellzauber:** dürfen während der gegnerischen Zeichnung gewirkt werden (Nullklinge-Schnitt, Spiegel, Gegenstoß).
- **Fallen:** verdeckt auf dem Feld, lösen bei einer Bedingung aus (wenn der Gegner beschwört, sich verwandelt, ein
  Geschoss die Zone betritt).
- **Handfallen:** eine Karte von der Hand abwerfen und damit das gegnerische Zeichnen unterbrechen („RUNE ZERBROCHEN“).
- **Verstecken:** Nebel verbirgt das eigene Zeichnen — die Nebelatmung kontert Leser.

## 4. Spielmodi

| Modus | Fantasie | Kern |
|---|---|---|
| **Feldzug** (Hauptmodus, PvE) | Castle Crashers × Dynasty Warriors | Erkunden in Ebenen, Geheimnisse, Burgen als Zwischenbosse (erst weiter, wenn die Burg fällt), Endboss, Armee rekrutieren |
| **Dungeon** (Roguelite) | Glück + Wissen | Rune 1 aus 3 wählen, Geheimrouten, Drops |
| **Arena** (PvP) | Deck-Duell | Konter, Fallen, Ranked |
| **Castle Siege** (PvP-Strategie) | Clash Royale | Kommandant auf der Burg: Beschwörung und Unterstützung stärker, Buff-Zonen auf der Lane, gezieltes Absetzen als Druck-Moment |

- **Invasion** geht im Feldzug auf (Massenschlacht-Level, Endschlacht gegen die große Armee).
- **Armee im Feldzug:** nach gewonnenen Gefechten Einheiten auswählen und rekrutieren; sie begleiten den Spieler
  durch die nächsten Ebenen und können sterben. Wer gut kämpft und gut unterstützt, hat im nächsten Level eine
  Riesenarmee — und Geschichten zum Teilen („mein Golem hat drei Ebenen überlebt“).

## 5. Fortschritt

1. **Eigenes Können:** die Runen-Note (C–S) belohnt sauberes Zeichnen — man wird durch Übung wirklich besser.
2. **Build:** Klasse (Spieltyp, Waffenkit) → Mastery-Bäume (Passivwerte, Synergien) → Waffenmeisterschaft → Bankai.
3. **Sammeln:** Boss-Drops für späte Runen (Sphären, Arcane States), Geheimnisse, Truhen, Freischaltungen.

- Späte, starke Karten kommen **spät im Fortschritt** und sind auch dann nicht übermächtig: in PvP über
  Budget, Sperren und Mana gebalanced; in PvE wachsen Gegner und Bosse mit.

## 6. Geheimnisse: Glück + Erfahrung

Beispiel: Im Dungeon lässt eine **Wasser**-Rune einen Setzling zum Baum wachsen — über ihn geht es in eine
**Geheimebene** mit einem besonderen Boss, der eine Truhe bewacht; die Truhe öffnet nur ein **Natura**-Zauber.
- Beim ersten Lauf ist es Glück (die richtige Rune im richtigen Moment).
- Beim nächsten Lauf ist es Wissen: aus den drei Angeboten gezielt Wasser wählen und Natura für die Truhe aufheben.
- Bausteine existieren schon (Setzling → Baum, Schlösser an Truhen, Szenen-Objekte, Element-Reaktionen); es fehlt
  die Kampagnen-Struktur darum herum.

## 7. Was das Spiel schon trägt

Element-Reaktionen in der Welt (Brand, Wind verbreitet Brand, Wasser + Feuer → Rauch/Nebel, Wasser vereist),
Beschwörungen und Mounts, Szenen-Objekte mit eigener Lebensleiste, Beam-Clash, Sphären-Duell, menschliche KI mit
sichtbarer Zeichenphase, Atmungen mit Körperverwandlung, Arcane States, Bankai, Mastery-System.
