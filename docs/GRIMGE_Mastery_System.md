# GRIMGE – Mastery-System (umgesetzt, Stand 21.10.2026)

Grundlage: *GRIMGE_Mastery_Runensystem_Game_Design_Document.pdf* (modulares Runen-, Mastery- und Build-System) und die zwei Referenz-Builds (Witcher-Quen-Schild, Exiled Heavy Knight).
Die Dokumente kannten den Prototyp nicht. Sie wurden deshalb auf das bestehende System übertragen, ohne Build-spezifischen Sondercode.

Code:
- `public/src/mastery_data.js`: Bäume, Voraussetzungen, Build-Analyse (rein, ohne Kampf-Imports)
- `public/src/mastery.js`: Ereignis-Engine und Wirkungen

## 1. Übertragung GDD → GRIMGE

| GDD-Begriff | In GRIMGE |
|---|---|
| Basisrunen (Feuer, Wasser, Blitz …) | Element-Runen: ignis, aqua, ventus, fulgur, terra, natura, lux, umbra, void, construct, bestia |
| Ice | Keine eigene Rune. Frost entsteht aus Wasser- und Wind-Fusionen (Status-Tag `frost`). |
| **Ward** | Eigene Rune **SCHUTZ** (Sonder-Element wie Konstrukt und Bestia, Schild-Glyphe, 1 Skillpunkt). Der Schutz-Baum gehört zur Rune (III/IV brauchen Schutz-Runen-Level) und wirkt auf jeden Schild. Lux hat seinen eigenen Baum (Segen, Reinigung). |
| Invocation / Control | Bestia-Beschwörungen bzw. Umbra- und Void-Bindungen (noch ohne eigene Masteries) |
| Tags eines Effekts | `statusElements` jedes Zaubers (Rezept-Elemente). Schilde tragen `shieldTags`. |
| Trigger (OnHit, OnShieldHit, OnExpire …) | Hooks: `onStatusHit` (jeder `takeDamage`), Schildabsorption, Status-Kombo, Status-Tick, Schildende, perfekter Block, aufgeladener Angriff |
| Ressourcen | Nur HP, Mana und Fokus. Fokus wird weiter im Beam-Clash ausgegeben (bestehend). |
| Rune Points | Skillpunkte (1 je Stufe). Stufe III braucht Runen-Level 3, Stufe IV Runen-Level 5; das Runen-Level steigt durch Benutzung. Ward braucht Mage-Level 6 bzw. 10. Im Testbuild (`DEBUG_BUILD`) sind die Stufen gratis. |
| Klassenpassiv „Berserker Last Stand“ | **Passiver** Skill-Knoten **Letztes Gefecht** (DEFENSE, 1 Skillpunkt, kein Zauber): unter 25 % HP +50 % Nahkampf- und Charge-Schaden |
| Spezialrunen, Arcane States, Domänen | **Bekommen keine Masteries** (Entscheidung 20.10.2026). Masteries gibt es nur für Basis-Runen und Schilde. |

## 2. Neue Schild-Rezepte

| Rezept | Zauber | Wirkung |
|---|---|---|
| Aqua + Terra | ARCANE AEGIS | 90 Kapazität, 5 s, Tags aqua und terra (bestehend, läuft jetzt über die Ward-Regeln) |
| Schutz | ARCANE AEGIS (auch Aqua + Terra) |
| Schutz + Schutz | **GROSSE AEGIS** | Schild für dich und eine Schildblase für jeden Verbündeten in der Nähe |
| Fulgur + Natura + Schutz | **LEBENSSTURM-SCHILD** | 80 Kapazität, 6 s, Tags fulgur, natura und terra |
| Terra + Umbra + Schutz | **OPFERBOLLWERK** | 110 Kapazität, 5 s. Opfert 10 % HP als 150 % Kapazität (mit Umbra · Opfer mehr). |

Alle Schild-Rezepte teilen sich eine Abklingzeit.

## 3. Umgesetzte Äste (80 Stufen, jedes der 11 Elemente hat einen Baum)

Nachgezogen sind Ventus (Verdrängen, Ausbreiten), Lux (Segen, Reinigung), Void (Kollaps, Annullieren), Konstrukt (Haltbarkeit, Schmieden) und Bestia (Instinkt, Rudel), jeweils mit 4 Stufen.

- **Fulgur**
  - **Kette:**
    - I: 1 Sprung mit 50 % Schaden
    - II: 2 Sprünge, mehr Reichweite
    - III: Sprünge bevorzugen nasse Ziele
    - IV: 3 Sprünge mit 70 % Schaden
  - **Entladung:**
    - I: Eine Status-Kombo schickt einen kleinen Blitz auf ein Nachbarziel
    - II: kürzere interne Abklingzeit
    - III: Schildtreffer lösen eine elektrische Vergeltung aus
    - IV: Entladungen dürfen die Kette nutzen, lösen aber nie eine neue Entladung aus
- **Natura · Lebensentzug:**
  - I: 2 HP pro Treffer
  - II: 3 HP pro Ziel
  - III: Status-Ticks heilen halb so viel
  - IV: Folgetreffer heilen, mit abnehmendem Ertrag (×0,6 je Generation)
- **Aqua · Durchnässen:**
  - I: macht garantiert nass
  - II: Nässe hält länger
  - III: Schock und Schockfrost verbrauchen die Nässe nicht
  - IV: Nässe verbreitet sich auf Nachbarziele
- **Ignis · Brand:**
  - I: garantierter Brand
  - II: Brand hält länger
  - III: springt auf ein Nachbarziel über
  - IV: erneute Treffer verlängern den Brand, maximal auf 8 s
- **Terra · Befestigen:**
  - I: +20 % Schildkapazität
  - II: kaum Unterbrechung durch Treffer, die den Schild durchschlagen
  - III: Nahkämpfer prallen vom Schild ab
  - IV: Ein aufgeladener Angriff verbraucht den Schild, 80 % der Restkapazität werden zu Schaden
- **Umbra · Opfer:**
  - I: 15 % HP → 150 % Kapazität
  - II: 20 % HP → 175 % Kapazität
  - III: Läuft der Schild ungebrochen aus, kommen 30 % der geopferten HP zurück
  - IV: Unter 30 % HP machen Schatten-Treffer +25 %
- **Ward (alle Schilde)**
  - **Absorbieren:**
    - I: +25 % Kapazität
    - II: +50 % Kapazität
    - III: Absorbierter Schaden lädt eine Reaktion auf; ein perfekter Block oder der nächste aufgeladene Angriff entlädt sie
    - IV: Restkapazität entlädt sich beim Ablaufen als Schockwelle
  - **Vergeltung:**
    - I: kleiner Gegenschlag (6 + 25 % des absorbierten Schadens, interne Abklingzeit 0,3 s)
    - II: trifft zusätzlich Gegner in der Nähe
    - III: übernimmt die Element-Tags des Schildes
    - IV: Gegenschläge dürfen Kette und Lebensentzug nutzen
  - **Aufrechterhalten:**
    - I: +30 % Dauer
    - II: eigene Treffer verlängern den Schild um 0,15 s
    - III: höchstens 0,25 s pro Ereignis, egal wie viele Ziele
    - IV: ein neuer Schild übernimmt die halbe Restdauer

## 3b. Dritte Äste (21.10.2026): jedes Element hat jetzt 3 Äste

Alle 12 Bäume (11 Elemente + Schutz) haben jetzt je 3 Äste mit 4 Stufen, also 144 Stufen. Alle „+X %“ eines Treffers werden zu **einem** Bonus-Folgetreffer zusammengefasst; das schont das Proc-Budget.

| Element | Ast | I | II | III | IV |
|---|---|---|---|---|---|
| Fulgur | **Überladung** | jeder 5. Blitz-Treffer lähmt | jeder 4. | Gelähmte nehmen +20 % von Blitz | jede Überladung +5 Mana |
| Natura | **Dornen** | Gift garantiert | Gift hält länger | Vergiftete verlangsamt | +25 % auf Vergiftete |
| Natura | **Wachstum** | heilt den nächsten Verbündeten 3 HP | 5 HP | 2 Verbündete | Verbündete erhalten 8 Schildpunkte |
| Aqua | **Flut** | +2 Mana je Treffer | +3 Mana | doppelt auf nasse Ziele | über 80 % Mana: +20 % Schaden |
| Aqua | **Frost** | nasse Ziele verlangsamt | stärker, länger | jeder 3. Treffer friert 0,6 s ein | Eingefrorene +30 % |
| Ignis | **Feuersbrunst** | +15 % auf Brennende | +25 % | Brennende explodieren (8 ringsum, 1×/s) | Explosion entzündet Nachbarn |
| Ignis | **Glut** | Brand-Ticks +1 Mana | +2 Mana | +1 HP | +1 Fokus |
| Terra | **Beben** | jeder 4. Erd-Treffer bebt (6 ringsum) | jeder 3., größer | wirft hoch | verlangsamt |
| Terra | **Steinhaut** | nach Erd-Treffer 2 s −10 % Schaden | −15 % | kaum Rückstoß | 20 % Nahkampf zurück |
| Umbra | **Fluch** | Schatten verflucht 4 s: deine Treffer +10 % | +15 % | Schatten gibt den Fluch weiter | Treffer auf Verfluchte heilen 2 HP |
| Umbra | **Nachtschleier** | nach Schatten-Treffer nächster Nahkampftreffer ausgewichen (6 s Abklingzeit) | 4 s | Ausweichen schlägt zurück (8) | +8 Mana |
| Ventus | **Rückenwind** | 1,5 s +10 % Tempo | +20 % | +4 Ausdauer | Nahkampf +20 % mit Rückenwind |
| Lux | **Strahlen** | blendet 0,25 s (3 s je Ziel) | 0,35 s, 2 s | Geblendete +20 % | springt weiter |
| Void | **Riss** | Echo nach 1 s mit 20 % | 30 % | trifft Nachbarn | −3 Mana je Getroffenem |
| Konstrukt | **Arsenal** | Nahkampf +10 % | +15 % | jeder 5. wirft eine Klinge (40 %) | Klinge lässt bluten |
| Bestia | **Raserei** | Stapel (bis 5, 3 s): +3 % je Stapel | bis 8 | volle Stapel heilen 2 HP | volle Stapel +15 % Tempo |

Neue Hooks: `masteryIncoming` (eingehender Treffer: Ausweichen, Steinhaut), `masteryTick` (Spielzeit-Timer und Void-Echos), `masteryMoveMult` (Tempo). `onDot` kennt jetzt die Status-Art (Glut).

## 3c. Builds speichern die Masteries

Eine gespeicherte Deck-Vorlage merkt sich jetzt auch die Masteries. Beim Laden werden die aktuellen Masteries erstattet und die gespeicherten in Stufenreihenfolge neu gekauft. Was (noch) nicht erlaubt ist, wird übersprungen und angesagt („2 MASTERIES GESPERRT“). Ältere Vorlagen ohne Masteries lassen die aktuellen stehen. In der Liste zeigt „✦ N MASTERIES“, was mitgeladen wird.

## 4. Laufzeitregeln (gegen Endlosschleifen)

- **Ereignis-Kontext:** Jedes Ereignis bekommt eine Root-ID. Folgetreffer (Ketten-Sprung, Vergeltung, Entladung, Bonus) laufen eine Generation tiefer.
- **Tiefe:** höchstens `PROC.maxDepth = 3`.
- **Proc-Budget:** höchstens `PROC.budget = 14` Folgetreffer pro Wurzel-Ereignis.
- **Folgetreffer erzeugen keine eigenen Ketten:** Ein Ketten-Sprung kettet nie weiter. Vergeltung und Entladung brauchen ihre Stufe IV, um die Kette zu nutzen.
- **Heil-Obergrenze:** höchstens 14 HP pro Sekunde aus Masteries.
- **Schild:** Gesamtdauer höchstens 12 s.
- **Saubere Trennung:**
  - Ein Treffer ist nicht dasselbe wie Schaden. Ein Status-Tick zählt nicht als Treffer.
  - Schildabsorption ist kein HP-Verlust.
  - Ein HP-Opfer ist kein Gegnertreffer.

## 5. Die Referenz-Builds mit diesen Regeln

**Lebenssturm-Wächter (Witcher Quen):** Lebenssturm-Schild mit Ward Vergeltung IV, Fulgur Entladung III, Fulgur Kette II, Natura Lebensentzug IV und Ward Aufrechterhalten III.
1. Ein Schildtreffer löst eine Blitz-Vergeltung aus.
2. Die Vergeltung springt als Kette auf weitere Gegner.
3. Jedes getroffene Ziel heilt mit abnehmendem Ertrag.
4. Der Schild verlängert sich, höchstens um 0,25 s pro Ereignis.

**Gefallener Koloss (Exiled Heavy Knight):** Opferbollwerk mit Umbra Opfer IV, Terra Befestigen IV, Ward Absorbieren III, Ignis Brand III und dem Skill Letztes Gefecht.
1. **Glaskanone:** 20 % HP werden zu Schild. Du stehst danach nahe am Letzten Gefecht.
2. **Differenz-Konter:**
   - Absorbierter Schaden lädt eine Reaktion auf.
   - Ein perfekter Block schickt sie auf den Angreifer zurück.
3. **DEF→ATK:** Ein aufgeladener Angriff verbraucht den Schild. 80 % der Restkapazität und die gespeicherte Reaktion landen als Wucht und setzen in Brand.

Beide Builds sind als Tests in `test_runtime.js` nachgestellt („Witcher build …“, „Knight build …“). Dazu kommt ein Proc-Stresstest mit 100 Schildtreffern.

## 6. UI

Im Skill-Fenster (MAGE PATHS) liegt das Panel **RUNEN-MASTERIES**:
- Je Ast vier Stufen-Knöpfe, die nächste Stufe mit Text und Voraussetzung.
- Ein Knopf zum Zurücksetzen.
- Die **BUILD-ANALYSE** beschreibt die entstehenden Reaktionsketten in Klartext.

## 7. Offen / nächste Ausbaustufe

- ~~Weitere Äste~~ erledigt (3 je Element, 21.10.2026).
- ~~Mastery-Wahl im Deck-Preset speichern~~ erledigt.

## 8. Freischaltung: zuerst nur Basis-Runen (Stand 20.10.2026)

Zu Beginn spielt man nur Basis-Runen. Alles andere wird nach und nach freigeschaltet:

| Was | Wie |
|---|---|
| Basis-Runen | 5 Start-Elemente. Bestia, Konstrukt, Void, Lux, Natura und Umbra kosten je **1 Skillpunkt** (beliebige Reihenfolge, Panel RUNEN FREISCHALTEN). Doppel und Mortis kosten 2 Skillpunkte und brauchen Mage-Level 8 bzw. 10. Jeder Punkt ist eine Wahl: Rune, Passiv oder Mastery. |
| Spezialrunen (ohne Domänen) | Mage-Level (S01 ab Level 5, dann vier pro Level) |
| **Element-Domänen** (S57, S58, S61–S69) | **Boss-Drop** oder **Element-Meisterschaft**: Runen-Level 10 des Elements (durch Zeichnen dieser Rune) |
| **Spezial-Domänen** (S53, S56, S59, S60) | nur **Boss-Drop** |
| **Arcane States / Transformationen** | **Boss-Drop** oder Runen-Level 8 ihres Elements (z. B. Risswild und Schlackenkern über Ignis, Korallenschild und Kältestillstand über Aqua) |
| **Bankai** (eine Rune, A04) | Passt sich der gewählten Klasse an (Schwarm aus Klingenblättern, Pfeilen, Splittern, Runen, Noten, Karten …, eigene Wunde). Freischaltung **pro Klasse**: Boss-Drop mit dieser Klasse oder **Klassenwaffe Level 8** (ein Punkt je Nahkampftreffer, 80 Punkte pro Level). |

Boss-Drops gibt es bei besiegten Bossen (Invasion: Rift Tyrant, Dungeon: Void Warden, Arena-Champion). Es fällt jeweils eine zufällige, noch gesperrte späte Rune.
Der Testbuild (`DEBUG_BUILD`) stellt im Training weiterhin alle Runen bereit. Die Sperren gelten in den Match-Decks und im öffentlichen Build.
