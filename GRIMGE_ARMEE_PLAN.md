# GRIMGE – Armee, Rekrutierung und Truppenausbau nach dem Vorbild von Heroes of Might and Magic

Stand: 20. Nov 2026. Wunsch des Nutzers: „Truppen, Rekrutieren und Armee erweitern sollte ein wenig sein wie bei Heroes of Might and Magic.“
Dieses Dokument analysiert, was HoMM (vor allem Teil III, das Vorbild der Reihe) ausmacht, und plant, wie GRIMGE das im Kronenkrieg umsetzt. Übernommen werden **Systeme**, keine Inhalte: keine Namen, Kreaturen oder Grafiken.

## 1. Was HoMM ausmacht

| Säule | So funktioniert es in HoMM | Warum es Spaß macht |
|---|---|---|
| **Stapel statt Einzelfiguren** | Ein Held führt bis zu 7 Plätze. Jeder Platz ist ein Stapel einer Kreaturenart in beliebiger Anzahl („34 Speerkämpfer“). Gleiche Arten verschmelzen, Stapel lassen sich teilen. | Die Armee wächst sichtbar in Zahlen, nicht nur in Figuren; Entscheidungen bleiben übersichtlich (7 Plätze). |
| **Behausungen und Wochenwachstum** | Jede Stadt hat 7 Kreaturenbehausungen (Stufe 1–7). Jede Woche kommt pro Behausung ein fester Zuwachs dazu, der sich ansammelt, bis man ihn rekrutiert. Bessere Stadtbauten (Zitadelle, Burg) erhöhen das Wachstum. | Ein Rhythmus: Man kehrt regelmäßig zurück, um die Armee aufzufüllen. Wer früh baut, wächst schneller. |
| **Aufwertungen** | Jede Behausung lässt sich zu einer verbesserten Version ausbauen (stärkere Kreaturen, oft mit neuer Fähigkeit). Hohe Stufen kosten seltene Rohstoffe (Kristall, Edelsteine, Schwefel, Quecksilber). | Rohstoffe der Karte bekommen einen Sinn; Ausbau ist eine Strategieentscheidung. |
| **Externe Behausungen** | Auf der Karte stehen Behausungen, die man beansprucht (Flagge). Sie bieten wöchentlich Kreaturen zum Anwerben, auch fremder Fraktionen. | Erkunden lohnt sich; man kann die Armee auch fern der Stadt verstärken. |
| **Der Held prägt die Armee** | Primärwerte (Angriff, Verteidigung) wirken auf alle Stapel. Sekundärfähigkeiten: *Führung* (Moral), *Glück*, *Logistik* (Reichweite), *Pfadfinder*, *Taktik*, *Bogenschießen* und andere. | Die eigene Figur ist der Verstärker der Armee. |
| **Zauber auf die ganze Armee** | Segen, Hast, Steinhaut und weitere wirken auf einen Stapel; mit Expertenwissen auf alle eigenen Stapel. | Ein Zauber im richtigen Moment dreht die Schlacht. |
| **Tempo** | Wie weit ein Held pro Tag zieht, hängt am langsamsten Stapel. Stallungen und Logistik helfen. | Die Armee zieht gemeinsam. |
| **Reise** | Stadtportal, Dimensionstor und Flug als Zauber; Monolithen als feste Portale. | Lange Wege werden zur Entscheidung, nicht zur Strafe. |
| **Moral und Glück** | Moral kann eine Extrarunde geben, Glück doppelten Schaden. Gemischte Fraktionen senken die Moral. | Kleine Zufallsspitzen ohne Kontrollverlust. |
| **Wochenereignisse** | „Woche des X“ verdoppelt das Wachstum einer Art; Kartenereignisse geben Schätze oder Wächter. | Abwechslung über die ganze Partie. |

## 2. Abgleich mit GRIMGE heute

| HoMM-Säule | GRIMGE Kronenkrieg (Stand dieses Commits) |
|---|---|
| Stapel | Einheiten sind Einzelfiguren (Klasse + Element + Stufe). Seit heute bringt eine Ausbildung einen **3er-Trupp**. Drei gleiche verschmelzen zu Stufe 2/3. |
| Behausungen | Jede eroberte Mittelburg bildet ihre Klasse aus (Waffe + Gold + Stein). Es gibt noch kein Wochenwachstum. |
| Aufwertung | Verschmelzen (3 → 1 höhere Stufe) und die Walzen (Bonus: Veteran / Doppelelement / Elite). |
| Externe Behausungen | Gefangenenlager (befreite Gefangene schließen sich an), Kreaturen bändigen, Eier ausbrüten. |
| Held prägt Armee | **Neu:** Runensegen. Jede gewirkte Rune stärkt den Trupp in der Nähe 10 s lang (+20 % Schaden, +10 % Tempo, Element auf den Schlägen). |
| Tempo | **Neu:** Der Trupp hält das Tempo des Spielers (zu Fuß; beritten nur Kreaturen). |
| Reise | **Neu:** Portalsteine an allen eigenen Burgen und ein Feldportal (🌀). Fliegen lernt man am Himmelsschrein. |
| Moral / Glück | Die Walzen beim Ausbilden; die Zeichennote erhöht das Glück. |
| Ereignisse | **Neu:** Weltereignisse alle ~2,5 min: Runentruhe, Banditenfürst (Boss), Nachschub in Häusern. |

## 3. Umsetzungsplan

### Phase A – Stapel (Kern)
- **Trupp in 7 Plätzen:** Jeder Platz ist ein Stapel einer Art (Klasse + Element + Stufe) mit einer Zahl. Eine Ausbildung erhöht den Stapel, statt eine neue Figur anzulegen.
- **Live-Darstellung:** Pro Stapel kämpfen bis zu 3 Figuren sichtbar. Weitere Mitglieder sind „Reserve“: Fällt eine Figur, rückt die nächste nach, bis der Stapel leer ist. Damit bleibt die Leistung auf dem Handy stabil (höchstens ~21 Truppfiguren), und die Armee wächst trotzdem in Zahlen.
- **Burg-Garnison:** ebenfalls 7 Plätze. Im Flaggenmenü verschiebt man Stapel zwischen Trupp und Burg und teilt sie (½, 1, alle).
- **Schaden und Leben skalieren pro Figur;** die Stapelgröße zählt über die Reserve.
- **Akzeptanztest:** Dreimal Ausbilden ergibt einen Stapel „9 × Speerkämpfer“. Drei Figuren kämpfen; fallen sie, rücken nacheinander alle neun nach.

### Phase B – Wachstum und Behausungen
- **„Woche“ = 3 Minuten Spielzeit.** Jede eigene Mittelburg füllt ihren Rekrutierungspool um +3 ihrer Klasse auf. Er sammelt sich bis zu einem Deckel an.
- **Ausbilden** kostet Gold pro Figur; Elementvarianten zusätzlich einen Stein pro 3 Figuren. Ohne Pool kein Ausbilden: das ist der HoMM-Rhythmus.
- **Hauptburg-Stufen erhöhen das Wachstum:** Holz +0, Stein +1, Stahl +2, Obsidian +4 pro Woche und Burg.
- **Burg-Ausbau „Kaserne II/III“:** Stufe 2 bzw. 3 direkt ausbilden (Stahl bzw. Obsidian als seltene Rohstoffe). Verschmelzen bleibt als zweiter Weg.
- **Söldnerlager** (neue Ortsart, 6 pro Karte): Mit Flagge beansprucht, bietet es wöchentlich einen Stapel einer zufälligen Klasse an (teurer, ohne Waffe).
- **Akzeptanztest:** Nach 3 Minuten hat eine eroberte Burg +3 im Pool. Mit Steinburg sind es +4.

### Phase C – Der Held als Verstärker
- **Feldherr-Fähigkeiten** im Meisterschaftsbaum (siehe `project_mastery_system`):
  - *Führung*: +Schaden für den Trupp
  - *Logistik*: Truppentempo, Portal-Abklingzeit
  - *Taktik*: Formation vor dem Kampf
  - *Bannerträger*: Burg-Wachstum +1
- **Runensegen nach Element:** Feuer gibt Schaden, Frost Rüstung, Wind Tempo, Erde Leben, Licht Heilung, Schatten Ausweichen. Höhere Runenstufen wirken auf mehr Stapel (wie Expertenzauber in HoMM).
- **Moral:** Gemischte Elemente im Trupp senken sie leicht; ein Ein-Element-Trupp bekommt einen kleinen Bonus. Glück bleibt bei den Walzen.

### Phase D – Karte und Rhythmus
- **Wochenereignis zu jeder „Woche“**, zum Beispiel: Woche des Bogens (doppeltes Bogenwachstum), Woche der Wildnis (Kreaturen stärker, bessere Eier), Woche des Goldes.
- **Externe Behausungen** auf der Karte. Rivalen kämpfen um dieselben Lager; die Bots beanspruchen sie abstrakt mit.
- **Bosse aus Phase „Ereignisse“** bewachen ein seltenes Lager (Stufe-3-Kreaturen).

### Phase E – Oberfläche
- **Armee-Leiste** (7 kleine Symbole mit Zahl) im Beutel-Fenster, nicht dauerhaft auf dem Bildschirm (die rechte Seite bleibt frei).
- **Flaggenmenü:** Reiter „Ausbilden / Garnison / Ausbau“, kompakt, schließt beim Weggehen (seit heute so).

## 4. Reihenfolge und Aufwand
1. Phase A, Stapel und Reserve: der größte Hebel gegen „eine Einheit und sie ist sofort tot“. Etwa 1 Tag.
2. Phase B, Wachstum und Ausbau. Etwa 1 Tag.
3. Phase E, Oberfläche für Stapel. Etwa ½ Tag.
4. Phase C, Feldherr-Fähigkeiten und elementarer Segen. Etwa 1 Tag, zusammen mit dem Meisterschaftsbaum.
5. Phase D, Wochenereignisse und Söldnerlager. Etwa ½ Tag.

Offene Fragen an den Nutzer:
- Soll die „Woche“ 3 Minuten dauern?
- Soll es 7 Plätze geben wie in HoMM, oder weniger für das Handy?
