# GRIMGE — Agenda (Stand 9. Nov 2026)

Reihenfolge, in der die offenen Punkte angegangen werden. Das Spielkonzept dahinter steht in [DESIGN.md](DESIGN.md);
Erledigtes steht in der Git-Historie.

## 1. Grundlage: Kamera, Maßstab, Animations-Pipeline  ← als Nächstes
- **Seitenansicht in 2,5D** (Vorbild Castle Crashers / Dragon's Crown), keine freien Blickrichtungen.
- **Kamera folgt der Figur** und zoomt näher; Figuren größer und detailreicher; Level länger als der Bildschirm, mit
  mehreren Höhenebenen und Vorder-/Hintergrund-Parallax (siehe DESIGN.md §1).
- **Animations-Pipeline** in Seitenansicht: Körperteil-Animation (Kopf / Rumpf / Arme / Beine / Waffe per Keyframes)
  oder Mischform (Teile + gezeichnete Schlüsselmomente) — Entscheidung beim Start dieses Punkts.
- Grund: Der Hauptheld ist ein einziges Standbild (82×123); alle Posen sind nur gedreht/gestaucht.
- Grundsatz an Animationen: Stehen, Laufen, Sprint, Sprung / Fall, Angriff 1–3, Aufladen / Loslassen, **Zeichnen**
  (Platz für die Handzeichen), Blocken, Treffer, Ausweichen, Tod.
- Die Pipeline muss die Charaktererstellung tragen (tauschbare Teile: Rüstung, Haare, Waffe).

## 2. Charaktererstellung und Klassen
- Aussehen (auf Basis von Punkt 1), Name, Startelement.
- Klassenwahl am Anfang mit eigener Identität (Klassenwaffen und Bankai existieren schon).

## 3. Deck-System nach Budget (DESIGN.md §2–3)
- Punktebudget (≤ 20), Deckgröße 10–14 Karten, Zieh-Rotation wie Clash Royale.
- Eigene Sperren für starke Karten (Fokus, einmal pro Runde, Abklingzeiten), Mana als Bremse.
- Neue Kartentypen der Konter-Ebene: Schnellzauber, Fallen, Handfallen.

## 4. Feldzug (Hauptmodus)
- Sobald die UI dafür im Editor (`/editor.html`, `docs/ui_spec/`) erstellt ist.
- Level in Ebenen zum Erkunden, Geheimnisse, Burgen als Zwischenbosse, Endboss, Armee rekrutieren (Einheiten
  begleiten und können sterben); die Invasion geht darin auf.
- Dungeon-Geheimrouten nach dem Prinzip „Glück + Erfahrung“ (DESIGN.md §6).

## 5. PvP-Modi schärfen
- Arena mit der Konter-Ebene, später Ranked.
- Castle Siege als Kommandanten-Modus: Beschwörung und Unterstützung von der Burg stärker, Buff-Zonen, gezieltes Absetzen.

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
