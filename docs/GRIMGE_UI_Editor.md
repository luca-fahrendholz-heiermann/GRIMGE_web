# GRIMGE – UI-Editor

Öffnen: **`start_editor.bat`** doppelklicken. Sie startet den Server auf Port 3100 (neben dem Spiel auf 3000) und öffnet `http://localhost:3100/editor.html`. Läuft der Server schon, wird nur der Editor geöffnet. Das Schließen des Fensters beendet den Server. Alternativ: `node server.js` und `/editor.html` aufrufen.

Der Editor lädt das echte Spiel in einem Rahmen, genau in der gewählten Zielgröße (Desktop 1280×720, Handy quer 844×390, Tablet 1180×820). Er öffnet die einzelnen Screens per Code. Darüber liegt eine Bearbeitungsebene.

## Bedienung

- **Screens (links):** alle Spiel-Screens. Dazu gehören Hub-Seiten, Helden- und Primal-Auswahl, Deck-Builder, Skill-Baum, Grimoire, Training- und Belagerungs-HUD, Kartenwahl, Pausemenü, Dungeon-Runenwahl und Ergebnis. Darunter stehen die eigenen neuen Screens. ● markiert bearbeitete Screens.
- **Bearbeiten:**
  - Ein Element anklicken und ziehen verschiebt es.
  - Die Ecke unten rechts ändert die Größe.
  - Pfeiltasten verschieben um 1 px, mit Shift um 10 px.
  - Entf setzt eine Änderung zurück oder löscht ein neues Element.
  - Gezogen wird im 1-px-Raster; mit Alt geht es frei.
- **Spielen:** Das Spiel lässt sich normal bedienen, z. B. um ein Untermenü zu öffnen. Danach „Neu erfassen“.
- **Funktion je Element:**
  - unverändert
  - keine
  - **Funktion eines anderen Elements übernehmen** (Liste aller vorhandenen Funktionen; „Alle Funktionen sammeln“ füllt sie aus allen Screens)
  - **zu Screen wechseln** (auch „＋ neuer Screen“ direkt aus der Auswahl)
  - **eigene** (im Kommentar beschreiben)
- **Kommentar:** Hier steht frei, was genau passieren soll.
- **Neues Element:** Button, Text, Panel oder Icon, mit Text, Farben, Funktion und Kommentar.
- **Neuer Screen:**
  - Die ID entsteht sofort (`screen_1`, `screen_2` …).
  - Name und Beschreibung lassen sich frei eintragen.
  - Als Hintergrund dient wahlweise eine leere Fläche oder ein vorhandener Screen.
- **Speichern** schreibt `docs/ui_spec/ui_editor_spec.json` und `docs/ui_spec/UI_EDITOR_SPEC.md` (lesbar). Ohne lokalen Server wird die JSON-Datei heruntergeladen. Zusätzlich gibt es Import und Export.

Positionen und Größen werden in Prozent der Bildfläche gespeichert, damit sie auf jedes Format passen. Jedes Element ist über einen CSS-Selektor eindeutig benannt, damit die Änderungen exakt in den Spielcode übernommen werden können.

## Grenzen

- Im Canvas gezeichnete Teile, z. B. die Spielwelt, sind keine Elemente. Bearbeiten lassen sich nur die HTML-Oberflächen.
- Neue Elemente erscheinen nur im Editor. Ins Spiel kommen sie, wenn die Spezifikation umgesetzt wird.
