# GRIMGE – Projekt-Audit

Stand: 11. Nov 2026. Grundlage: der Code in diesem Repository (Tests, Quelltext, Screenshots aus dem laufenden Spiel).
Was hier steht, ist am Code geprüft – Design-Dokumente allein zählen nicht als „umgesetzt“.

## Welches Projekt ist maßgeblich?

- **Maßgeblich: dieser Web-Prototyp** (`public/`, Vanilla-JS, Canvas 2D, PWA). Hier liegt die gesamte aktuelle
  Entwicklung; `npm test` prüft sie (Recognizer, Arena, Progression, Runtime, PWA).
- **Unity-Projekt** (`C:\Dev\unity_projects\GRIMGE`): nur Lesereferenz (Bewegungswerte, frühe Konzepte). Wird nicht
  verändert.

## Systeme und ihr Zustand

| System | Zustand | Anmerkung |
|---|---|---|
| Architektur (Module, Spielschleife 60 Hz, Modi über `game_modes.js`) | umgesetzt, funktioniert | `main.js` und `entities.js` sind sehr groß (technische Schuld, siehe unten) |
| Bewegung (Gehen, Sprint, Sprung, Backdash, Launcher) | umgesetzt, funktioniert | Werte aus dem Unity-Projekt übernommen |
| Nahkampf (Combo 1–3, Aufwärtshieb, schwerer Hieb, Sturz, Block, Perfektblock) | umgesetzt, funktioniert | |
| Runen zeichnen + Erkennung | umgesetzt, funktioniert | eigene Tests (`test_recognizer.js`) |
| Zauber, Kombos, Spezialrunen, Sphären | umgesetzt, funktioniert | sehr großer Katalog; Balance ungeprüft |
| Mana und Fokus | umgesetzt, funktioniert | Balance nur über Mana / Fokus (Entscheidung) |
| Transformationen (Fokus-Form, Arcane States, Primal-Bund, Bankai) | umgesetzt, funktioniert | Fokus-Form und Arcane State schließen sich aus |
| Atemtechniken | umgesetzt, funktioniert | |
| Castle Siege (Türme, Burg, Wellen) | umgesetzt, funktioniert | |
| Invasion (4 Level, Wellen, Boss, große Armee) | umgesetzt, funktioniert | |
| Dungeon (Räume, Treppen, Galerie, Möbel, Geheimraum, Boss) | umgesetzt, unvollständig | 3 Räume + Boss; Türen / Fortschrittsleiste fehlen |
| Arena (Riss + Leben) | umgesetzt, unvollständig | HUD oben zeigt noch HP-Balken; Werte ungetunt |
| Gegner-KI (Champion: Pläne, Zeichnen, Ausweichen) | umgesetzt, funktioniert | |
| Fortschritt (Level, Skillpunkte, Mastery, Runen-XP, Waffenstufen) | umgesetzt, unvollständig | Mastery-UI ist Platzhalter |
| Charaktererstellung + Klassen | umgesetzt, unvollständig | Platzhalter-Bildschirm; nur Thesen ist animiert |
| Animation (Teile-Gerüst, Clips, erzeugte Bild-Bögen) | umgesetzt, unvollständig | Thesen unbewaffnet und Xame aus erzeugten Bögen; mit Waffe noch Gerüst-Animation; Champions außerhalb der Kampagne nicht animiert |
| VFX (Zauber-Sheets, Treffer-Feedback, Hitstop, Wackeln) | umgesetzt, funktioniert | 363 Sheets; ältere Effekte teils geometrisch |
| UI / HUD (Hub, Deck, Skill-Baum, Ergebnisse) | umgesetzt, unvollständig | Hub aus Konzeptbildern; mehrere Knöpfe ohne Funktion |
| Kampagne | umgesetzt, unvollständig | **neu:** Kapitel 1 mit 5 Missionen (Campaign Alpha 0.1), Platzhalter-Bildschirme |
| Speichern / Laden | umgesetzt, funktioniert | Profil im `localStorage` (ein Speicherstand, kein Export) |
| Eingabe (Touch, Tastatur, Gamepad) | umgesetzt, funktioniert | |
| Audio | umgesetzt, unvollständig | synthetische Töne, keine Musik |
| Geschichte / Lore | geplant, fehlte | Vorschlag jetzt in `GRIMGE_DESIGN_BIBLE.md` |
| PvP gegen Menschen, Online | geplant, fehlt | |

## Technische Schuld

- `main.js` (~3600 Zeilen) und `entities.js` (~3200 Zeilen) bündeln zu viel; viele sehr lange Einzeiler.
  Neue Systeme (Kampagne, Arena-Riss, Rig, Klassen) liegen deshalb bewusst in eigenen Modulen.
- Gegner-Champions nutzen alte gemalte 1024-px-Bilder statt Pixel-Art.
- In `sprites.js` stehen noch Helden-Einträge mit Namen aus einem fremden Spiel (`nyx`, `deep`, `firen` …) ohne
  Bilddatei. Sie werden nicht geladen, sollten aber vor einer Veröffentlichung entfernt werden.
- Hub-Seiten sind an Konzeptbilder gebunden; neue Bildschirme (Erstellung, Kampagne) sind schlichte Overlays.

## Größte Schwächen für das Spielgefühl

1. Mit Waffe nutzt Thesen noch die Gerüst-Animationen aus einem Standbild.
2. Champions außerhalb der Kampagne sind noch gemalte Bilder; Gegner und Verbündete sind inzwischen einheitlich.
3. Kein roter Faden zwischen den Modi – das behebt die Kampagne.
4. Arena-HUD und mehrere Menüs sind Platzhalter.

## Prioritäten

Siehe `GRIMGE_DEVELOPMENT_ROADMAP.md`.
