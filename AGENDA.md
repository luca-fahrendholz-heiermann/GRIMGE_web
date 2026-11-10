# GRIMGE — Agenda (Stand 9. Nov 2026)

Reihenfolge, in der die offenen Punkte angegangen werden. Das Spielkonzept dahinter steht in [DESIGN.md](DESIGN.md);
Erledigtes steht in der Git-Historie.

## 1. Grundlage: Kamera, Maßstab, Animations-Pipeline  ✔ (Etappen 1–3 erledigt)
- **Seitenansicht in 2,5D** (Vorbild Castle Crashers / Dragon's Crown), keine freien Blickrichtungen.
- **Kamera folgt der Figur** und zoomt näher; Figuren größer und detailreicher; Level länger als der Bildschirm, mit
  mehreren Höhenebenen und Vorder-/Hintergrund-Parallax (siehe DESIGN.md §1).
- **Animations-Pipeline** in Seitenansicht: **Mischform** (Körperteile per Keyframes + gezeichnete Schlüsselmomente) —
  zum Testen; die finalen Animationen erstellt der Nutzer später selbst.
- Etappen: (1) Kamera-Prototyp (folgt der Figur, Zoom, Level breiter als der Bildschirm, Höhenebene, Parallax),
  (2) Teile-Gerüst + Grund-Animationen, (3) Bestehendes daran anschließen.
- Stand Etappe 1 (erledigt): Folgekamera mit Zoom (passt sich an Gegnerzahl / Boss an), Pfeile am Rand, Treppe + Galerie
  mit vertikaler Kamera, Möbel als Plattformen (Tisch, Etagenbett, Kisten), Vordergrund-Säulen / -Ketten mit Parallax.
  Räume mit Türen und Fortschrittsleiste kommen mit der Kampagnen-UI.
- Stand Etappe 2 (begonnen): Teile-Gerüst für Thesen (public/src/rig.js: Körperteile per Polygon geschnitten, Drehpunkte,
  Fuß-Lock) und Grund-Clips (rig_clips.js: Stehen, Gehen, Sprint, Sprung/Fall, Angriff 1–3, Aufwärtshieb, schwerer
  Hieb, Sturz, Blocken, Treffer, Tod, Zeichnen, Aufladen, Rückwärtssprung), beim Laden zu Einzelbildern gebacken.
  Platzhalter: eigene / KI-Sheets ersetzen die Clips über den Clip-Namen. Erledigt: Waffe an der Hand, Focus-Form mit
  eigenem Umhang-Teil, Schläge als Schlüsselposen (Ausholen → Schlag mit eingebackener Schliere → Durchschwung →
  Halten → Zurück; Tipps aus Videos/GRIMGE/animation_tips.mp4), spitz zulaufende Waffenschliere, Staub bei Sprintstart
  und Landung.
- Stand Etappe 3 (erledigt): Bestien-Atmung mit Raubtier-Clips (Lauern / Springen), Schwebe-Clip für Levitation, alte
  Ganzkörper-Kippungen bei Rig-Helden abgeschwächt, Champions mit Rig-Sprite bekommen Clip-Timing und Zeichen-Clip.
  Offen: Xame braucht eigene Animationen (Speer quer über den Körper, kein Auto-Rig); Gegner-Champions nutzen noch alte
  Platzhalterbilder.
- Grund: Der Hauptheld ist ein einziges Standbild (82×123); alle Posen sind nur gedreht/gestaucht.
- Grundsatz an Animationen: Stehen, Laufen, Sprint, Sprung / Fall, Angriff 1–3, Aufladen / Loslassen, **Zeichnen**
  (Platz für die Handzeichen), Blocken, Treffer, Ausweichen, Tod.
- Die Pipeline muss die Charaktererstellung tragen (tauschbare Teile: Rüstung, Haare, Waffe).

## 2. Charaktererstellung und Klassen  ← als Nächstes
- Aussehen (auf Basis von Punkt 1), Name, Startelement.
- Klassenwahl am Anfang mit eigener Identität (Klassenwaffen und Bankai existieren schon).
- Stand (erster Durchgang, Platzhalter-Bildschirm): Name, Grundfigur (Thesen, Xame), Haar- und Rüstungsfarbe (vor dem
  Rig-Backen umgefärbt), Klasse = Klassenwaffe, laufende Vorschau; öffnet über WARDROBE und vor dem ersten Kampf.
  Offen: Startelement, Klassen mit eigener Identität (Beschreibung, Spielstil, Startwerte), endgültiges Layout aus
  /editor.html, weitere Grundfiguren (deine Sprites), Xame-Animationen.

## 3. Deck-System nach Budget (DESIGN.md §2–3)
- Punktebudget (≤ 20), Deckgröße 10–14 Karten, Zieh-Rotation wie Clash Royale.
- Balance nur über Mana (alles Gezeichnete, starke Karten teuer) und Fokus (Transformation, Beam-Clash); Transformation und Arcane State schließen sich aus (umgesetzt).
- Neue Kartentypen der Konter-Ebene: Schnellzauber, Fallen, Handfallen.

## 4. Feldzug (Hauptmodus)
- Sobald die UI dafür im Editor (`/editor.html`, `docs/ui_spec/`) erstellt ist.
- Level in Ebenen zum Erkunden, Geheimnisse, Burgen als Zwischenbosse, Endboss, Armee rekrutieren (Einheiten
  begleiten und können sterben); die Invasion geht darin auf.
- Dungeon-Geheimrouten nach dem Prinzip „Glück + Erfahrung“ (DESIGN.md §6).

## 5. PvP-Modi schärfen
- Arena mit der Konter-Ebene, später Ranked; Regeln: Riss + Leben in eigener Ausprägung (DESIGN.md §4a).
- Castle Siege als Kommandanten-Modus: Beschwörung und Unterstützung von der Burg stärker, Buff-Zonen, gezieltes Absetzen.

- Stand Arena (vorgezogen, 10. Nov 2026): Riss + Leben umgesetzt (arena_rift.js) — Riss-Schild statt HP, Bannrand-KO
  an den Seiten, Abgrund unter der Mittelplattform, 3 Seelenfunken; HP-Duell bleibt als Regel 'hp'. Offen: HUD oben
  zeigt noch HP-Balken (wird durch Schild/Funken ersetzt), Feinabstimmung der Riss-Werte im Playtest, PvP gegen Menschen.
## 6. Mastery
- Grundsystem steht (Baum je Element, 24-Knoten-Fertigkeitenbaum, Skillpunkte).
- Offen: die restlichen Zweige aus dem Konzeptdokument und eine richtige Baum-Oberfläche.

## 7. Von dir geliefert / später
- Handzeichen-Animation beim Runenzeichnen (Naruto-artig) — ersetzt den magischen Zauberkreis vor der Figur.
- Eigene Animationen der Atemtechnik-Moves je Waffentyp.

## 8. Feedback-Schleifen
- Neue Atmungs-Optik (Körperverwandlung, echte Blitze, Effekte hinter der Figur) im Spiel prüfen und nachschärfen.
- Zurück-Navigation auf dem Handy: neuer Schutz (Navigation API + zwei Fallen-Einträge) — melden, falls es noch
  einmal auftritt (Diagnose-Zeile im Hauptmenü).

## Optional / irgendwann
- Stärke-Schalter für den Trainingsgegner (Anfänger … Meister; intern vorhanden).
- Alte Aura-Sheets `bra_*` aus dem Generator entfernen (ungenutzt).
- Multiplayer (Mechaniken sind bereits darauf ausgelegt, z. B. keine Zeitlupe beim Zeichnen).
