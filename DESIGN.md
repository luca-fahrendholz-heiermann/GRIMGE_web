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

### 1a. DNA-Analyse der beiden Vorbilder (Stand 10. Nov 2026)
Belegt (Quellen unten) ist markiert mit ✔; der Rest stammt aus Spielkenntnis und ist im Playtest der Vorbilder zu
verifizieren.

**Castle Crashers**
- ✔ **Weltkarte** mit wählbaren Stationen: 36 Hauptlevel in acht Abschnitten, jederzeit wieder spielbar; Shops und
  Schmied (Waffen / Tier-Begleiter wechseln) liegen auf der Karte.
- ✔ **Arenen** als eigene Stationen: Wellen gemischter Gegner, schaltet Figuren frei.
- ✔ **Geheimnisse pro Level** (z. B. Schaufel in einem bestimmten Raum → versteckte Waffe / Tier-Kugel).
- ✔ **Neues Spiel+** („Insane Mode“) als neuer Pfad auf der Weltkarte nach dem ersten Durchspielen.
- Ein Level = **kurze Strecke (≈ 3–8 min)** aus Abschnitten: Laufen → **Kamera-Sperre** („Kampfraum“: weiter erst
  wenn alle besiegt) → Laufen → Zwischenboss oder Set-Piece → Boss. Jeder Abschnitt hat **eine Idee**
  (Reitlevel, Fluss, Lava, Eisburg, Belagerung) — Abwechslung durch Szenen-Thema statt Länge.
- **Ebenen-Gefühl:** Tiefenband zum Ausweichen, Leitern / Klippen / Hintergrund-Wege, Vordergrund-Silhouetten.
- **Charakter = Element** (Feuer-, Eis-, Blitz-, Gift-Ritter …) mit eigener Magie; Level-Ups verteilen Punkte auf
  Stärke / Magie / Verteidigung / Agilität; **Tier-Begleiter** helfen passiv.
- Viraler Kern: Humor, 4-Spieler-Chaos, große Boss-Auftritte, das Wettrennen um die Prinzessin am Ende.

**Dragon's Crown**
- ✔ **9 Stages mit je zwei Routen**: zuerst Route A (leichter), danach öffnet sich Route B mit **neuen Bossen**; die
  B-Bosse bewachen Talismane, die man alle für den Endboss braucht. B-Routen in beliebiger Reihenfolge.
- ✔ **Viele versteckte Türen und Geheimnisse** in den Stages.
- ✔ **Knochen gefallener Abenteurer** im Dungeon aufsammeln → im Tempel **wiederbeleben** → optionale
  **KI-Gefährten**. ✔ Begrenzte Leben pro Quest, danach Wiederbeleben mit Gold; ✔ Gebete im Tempel geben Segen
  (Gold, Extra-Leben).
- ✔ **Runen-Magie:** Runen in der Stadt kaufen, im Dungeon **Markierungen an Wänden** finden. (Aus Spielkenntnis,
  unbelegt: zwei eigene Runen + eine Rune der Umgebung ergeben ein Wort mit Effekt — Schatz, Segen, Geheimraum.) Für GRIMGE ein Volltreffer:
  **unsere Runen reagieren schon mit der Umgebung** (Wasser → Baum, Natura → Truhe).
- ✔ **Rannie**, ein Dieb ohne Gruppenplatz. (Aus Spielkenntnis, unbelegt: er öffnet Truhen und Türen; Schätze im
  Hintergrund werden per Zeiger entdeckt — perfekt für Touch.)
- Stadt als **Hub** (Gilde, Tempel, Shop, Taverne); nach jeder Stage Beute **schätzen** lassen, Wertung, Kochen.
- **Sechs Klassen** mit klar verschiedenen Spielweisen — Vorbild für unsere Klassenwahl.

**Was GRIMGE übernimmt (Feldzug / Dungeon)**
1. **Weltkarte** mit Stationen (Level, Burg-Zwischenboss, Arena, Händler, Tempel); wiederspielbar, Neues Spiel+.
2. **Level ≈ 4–8 min**, aus Abschnitten mit Kampfräumen (Kamera-Sperre), einer Szenen-Idee pro Abschnitt, Ebenen
   (Wege oben / unten / im Hintergrund), am Ende eine **Burg als Zwischenboss** (erst weiter, wenn sie fällt).
3. **Zwei Routen pro Gebiet** (A leicht, B mit neuem Boss + Talisman / späten Runen-Drops).
4. **Armee aus Gefallenen:** besiegte Gegner / gefundene Überreste → im Lager rekrutieren (wie Knochen im
   Tempel); Einheiten können endgültig fallen.
5. **Runen + Umgebung:** Markierungen, Setzlinge, Schlösser in der Szene reagieren auf bestimmte Runen → Geheimraum,
   Schatz, Abkürzung (Glück + Erfahrung, §6).
6. **Touch-Schatzsuche:** im Hintergrund versteckte Dinge antippen (Rannie-Prinzip).

Quellen: [Castle Crashers (Wikipedia)](https://en.wikipedia.org/wiki/Castle_Crashers) ·
[Castle Crashers Guide (Steam)](https://steamcommunity.com/sharedfiles/filedetails/?id=187562643) ·
[Dragon's Crown (Giant Bomb)](https://www.giantbomb.com/games/3030-35594/) ·
[Dragon's Crown Review (CheatCC)](https://cheatcc.com/articles/dragon-s-crown-review-for-playstation-3-ps3-ps3/) ·
[Dragon's Crown Tipps (Destructoid)](https://destructoid.com/?p=129902) ·
[Talismaster-Trophäe (TrueTrophies)](https://www.truetrophies.com/t58686/talismaster-trophy)

### 1b. Ablauf der Modi im Detail
- **Feldzug:** Weltkarte → Station wählen → Level (Abschnitte, Kampfräume, Geheimnisse, Rekruten sammeln) →
  Burg-Zwischenboss (Bodentruppen und Armee zerstören die Burg) → Lager (rekrutieren, heilen, Deck anpassen) →
  nächste Station; Gebietsende: Endboss → Drops (späte Runen) → Route B öffnet sich.
- **Dungeon (Roguelite):** Start mit kleinem Deck → Raum für Raum, nach Räumen **1 aus 3 Runen** → Zwischenboss
  → Geheimrouten bei passender Rune → Endboss oder Tod → Belohnung nach Tiefe; Wissen über Geheimnisse bleibt.
- **Arena (PvP):** Regel-Entscheidung offen — siehe §4a (Empfehlung: Prozent + Leben, Rausschleudern).
- **Castle Siege (PvP):** jede Seite auf ihrer Burg → Lane mit Truppen → von oben unterstützen / beschwören →
  gezielt auf die Lane absetzen für Druck → Turm, dann Burg zerstören.

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

### 4a. Arena-Regeln (Entscheidung offen)
| Variante | Ablauf | Stärken | Schwächen |
|---|---|---|---|
| **Prozent + Leben** (Smash-Prinzip) | Treffer erhöhen den Prozentwert statt HP zu senken; je höher, desto weiter fliegt man; KO durch Rausschleudern aus der Arena (Seiten, Abgründe, Absturz von Plattformen) oder einen harten Treffer bei hohem Prozent; 2–3 Leben | spektakuläre Wegflieger (Clips!), Comebacks jederzeit möglich, nutzt das vorhandene Knockback / Launcher-System, Arena-Gestaltung wird Taktik | Umbau des Schadensmodells (Status-Schaden → Prozent), Arenen brauchen Ränder / Abgründe / Plattformen |
| **Lebensbalken, ein Leben** | klassisch HP → 0 = Ende | klar, schnell, passt zum jetzigen System | weniger Spektakel, Comebacks seltener |
| **Lebensbalken, mehrere Leben** | HP → 0 = ein Leben weg, Neustart | Comebacks | lange Matches, wenig Neues |

Empfehlung: **Prozent + Leben** als Standard der Arena (Smash-Prinzip, aber 2,5D: rausfliegen an den Seiten und in
Abgründe zwischen den Ebenen), die HP-Variante als Option für Ranked-Duelle. Melee-Prinzip: der Prozentwert ändert
auch, welche Combos funktionieren — niedrige % = lange Combos, hohe % = Finisher-Momente.

## 5. Fortschritt

1. **Eigenes Können:** die Runen-Note (C–S) belohnt sauberes Zeichnen — man wird durch Übung wirklich besser.
2. **Build:** Klasse (Spieltyp, Waffenkit) → Mastery-Bäume (Passivwerte, Synergien) → Waffenmeisterschaft → Bankai.
3. **Sammeln:** Boss-Drops für späte Runen (Sphären, Arcane States), Geheimnisse, Truhen, Freischaltungen.

- Späte, starke Karten kommen **spät im Fortschritt** und sind auch dann nicht übermächtig: in PvP über
  Deck-Budget, Mana- und Fokus-Kosten gebalanced; in PvE wachsen Gegner und Bosse mit.

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
