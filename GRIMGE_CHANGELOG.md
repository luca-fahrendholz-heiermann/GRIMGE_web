# GRIMGE – Changelog

Neueste Einträge oben. Details stehen in den Commit-Nachrichten (`git log`).

## 11. Nov 2026 – Erste erzeugte Szenen

- Drei Kampagnen-Hintergründe mit Higgsfield erzeugt (0,75 Credits aus dem Registrierungs-Guthaben, 0 USD): Ruinenhalle
  Kareth (Mission 1), Abgrund-Arena (Mission 3), Gluttiefe (Mission 5).
- Missionen können eine eigene Szene angeben (`scene` in `campaign_data.js`); sie ersetzt den Standard-Hintergrund,
  scrollt im Dungeon mit Parallax und steht in der Arena mittig.
- Aufbereitung über `art/authoring/prep_scene.cjs`; Rohbilder liegen unverändert in `art/generated/scenes/`.
- Der AutoSprite-Test für Xame schlug fehl (nichts abgebucht).

## 11. Nov 2026 – Campaign Alpha 0.1, erste spielbare Schleife

- **Kampagne:** Kapitel 1 „Der gebrochene Bann“ mit fünf verbundenen Missionen (Dungeon-Halle, Burgverteidigung,
  Riss-Duell gegen Xame, Castle Siege, Boss-Lauf zum Glutfürsten), jeweils mit Einsatzbesprechung, Ziel, Intro- und
  Outro-Dialog und Belohnung.
- **Fortschritt:** Missionen schalten sich der Reihe nach frei, Belohnungen einmalig, alles im Profil gespeichert,
  Missionen wiederholbar.
- **Bildschirme:** Kapitel-Übersicht und Dialog mit Sprecher-Porträt (Platzhalter-Layout); Kampagnen-Knopf im Hub.
- **Modi mit Parametern:** Dungeon-Start- und Endraum, Invasions-Levelgrenze, Arena-Rivale.
- **Dokumente:** Audit, Design Bible (Geschichte als Vorschlag), Art Bible, Roadmap, Budget-Protokoll, Changelog.
- **Entscheidung:** Der Web-Prototyp ist das maßgebliche Projekt; Unity bleibt Lesereferenz.
- **Budget:** 0 USD ausgegeben; Higgsfield-Preise ungeklärt, daher noch keine Erzeugung.

## 10. Nov 2026

- **Arena „Riss + Leben“:** Riss-Schild statt Lebenspunkte, Bannrand-KO, Abgrund, 3 Seelenfunken.
- **Charaktererstellung:** Name, Grundfigur, Haar- und Rüstungsfarbe, Startelement, 18 Klassen (Waffenfamilien) mit
  Startwaffe; animierte Vorschau.
- **Animation:** Teile-Gerüst für Thesen und die Fokus-Form, Grund-Clips, Schläge als Schlüsselposen mit Schliere,
  Waffe in der Hand, Staub-Sprites, Raubtier- und Schwebe-Clips.
- **Level:** Möbel als Plattformen, Vordergrund-Säulen und -Ketten; Zauber zielen auf Ebenen (Treppe, Galerie).

## Davor

Siehe `PROJECT_STATUS.md` und `git log` (Folgekamera, Treppen, Atemtechniken, Zauber-Neuzeichnungen, KI, Modi …).
