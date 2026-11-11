# GRIMGE – Changelog

Neueste Einträge oben. Details stehen in den Commit-Nachrichten (`git log`).

## 11. Nov 2026 – Restliche Figuren ersetzt, Xame vollständig, Thesen mit erzeugten Bildern

- Die Invasions-Gegner der späteren Level und die Verbündeten sind eigene Figuren (Leerenkoloss, Leerenschütze,
  Leerenfechter, Glutakolyth, Frostschamane; Wächter und Späherin von Kareth). Damit nutzt kein Gegner und kein
  Verbündeter mehr die alten Bögen mit fremdem Layout; die alten Schlüssel `deep`, `henry`, `firen`, `freeze`, `woody`
  sind aus den Invasions-Pools entfernt.
- Xame hat eigene Bilder für Sprung, Blocken, Treffer, Zaubern und Niederlage.
- Thesen: Gehen, Sprint, Faustschläge, Sprung, Blocken, Treffer, Zeichnen und Niederlage kommen aus erzeugten Bildern,
  solange er unbewaffnet ist. Mit Waffe bleiben die Gerüst-Animationen, weil dort die Waffe der Hand folgt.
- Kosten: 2,75 Credits (insgesamt 6,25 von 10), 0 USD.

## 11. Nov 2026 – Eigene Gegner im Stil der Helden

- Vier neue Figuren ersetzen die alten Gegner-Bögen: Leerenritter, Leerenräuber, Leerenhexer und der Glutfürst als
  Boss – eigene Entwürfe, mit Thesen als Stilvorlage erzeugt (1,0 Credits), je sieben Posen (Stand, drei Gehschritte,
  Ausholen, Schlag, Treffer). Rollen und Werte der Gegner sind unverändert.
- Gegner spielen ihre Schläge jetzt von vorn ab (Ausholen → Schlag) statt auf dem letzten Bild zu stehen.
- Offen: Verbündete und die zusätzlichen Invasions-Gegner nutzen noch die alten Bögen.

## 11. Nov 2026 – Xame ist animiert

- Xame hat eigene Bilder für Gehen (6) und Speerangriff (5), erzeugt mit seinem Sprite als Vorlage (0,5 Credits);
  Größe, Pixeldichte und Aussehen stimmen mit dem Standbild überein. Sie gelten als Spieler-Figur und als Rivale im Duell.
- Noch ohne eigene Bilder: Sprung, Treffer, Blocken, Zeichnen, Tod (dort bleibt das Standbild).

## 11. Nov 2026 – Alle fünf Missionen mit eigener Szene, Kapitel-Karte, Requisiten

- Mission 2 (Halvar, Sturmnacht) und Mission 4 (Aschenfeste) haben eigene Szenen: das vorhandene Burg-Bild wurde
  umgestaltet, Burgen, Türme und Hof stehen an denselben Stellen.
- Der Kapitelbildschirm zeigt eine Pixel-Art-Karte mit den fünf Schauplätzen und anklickbaren Missions-Pins.
- Zwölf Requisiten (Säulen, Trümmer, Fackeln, Banner, Statuen, Käfig, Kette) in zwei Themen: sie stehen als Dekoration
  an der Rückwand der Dungeon-Räume; die schwarze Vordergrund-Säule ist durch die Themen-Säule ersetzt.
- Kosten: 1,25 Credits aus dem Guthaben (insgesamt 2,0), 0 USD.

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
