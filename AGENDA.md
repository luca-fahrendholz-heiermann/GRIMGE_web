# GRIMGE — Agenda (Stand 5. Nov 2026)

Reihenfolge, in der die offenen Punkte angegangen werden. Erledigtes steht in der Git-Historie.

## 1. Animations-Pipeline für die Figuren  ← als Nächstes
- **Entscheidung offen:** Körperteil-Animation (Kopf / Rumpf / Arme / Beine / Waffe per Keyframes), Einzelbilder (gezeichnet wie LF2) oder Mischform (Teile + gezeichnete Schlüsselmomente).
- Grund: Der Hauptheld ist ein einziges Standbild (82×123); alle Posen sind nur gedreht/gestaucht. Animationen werten alle bestehenden Mechaniken auf (Trefferwucht, Lesbarkeit, Atmungen, Transformationen).
- Grundsatz an Animationen: Stehen, Laufen, Sprint, Sprung / Fall, Angriff 1–3, Aufladen / Loslassen, **Zeichnen** (Platz für die Handzeichen), Blocken, Treffer, Ausweichen, Tod.
- Die Pipeline muss die Charaktererstellung tragen (tauschbare Teile: Rüstung, Haare, Waffe).

## 2. Charaktererstellung am Anfang
- Aussehen (auf Basis der Pipeline aus Punkt 1), Name, Startelement.

## 3. Klassenwahl
- Klassenwaffen und Bankai über die Klassenwaffe existieren schon; es fehlt die Wahl am Anfang mit eigener Klassen-Identität.

## 4. Mastery
- Grundsystem steht (Baum je Element, 24-Knoten-Fertigkeitenbaum, Skillpunkte).
- Offen: die restlichen Zweige aus dem Konzeptdokument und eine richtige Baum-Oberfläche.

## 5. Kampagne
- Sobald die UI dafür im Editor (`/editor.html`, `docs/ui_spec/`) erstellt ist.

## 6. Von dir geliefert / später
- Handzeichen-Animation beim Runenzeichnen (Naruto-artig) — ersetzt den magischen Zauberkreis vor der Figur (Platzhalter bei Spieler und Gegner).
- Eigene Animationen der Atemtechnik-Moves je Waffentyp.

## 7. Feedback-Schleifen
- Neue Atmungs-Optik (Körperverwandlung, echte Blitze, Effekte hinter der Figur) im Spiel prüfen und nachschärfen.
- Zurück-Navigation auf dem Handy: neuer Schutz (Navigation API + zwei Fallen-Einträge) — melden, falls es noch einmal auftritt (Diagnose-Zeile im Hauptmenü).

## Optional / irgendwann
- Stärke-Schalter für den Trainingsgegner (Anfänger … Meister; intern vorhanden).
- Alte Aura-Sheets `bra_*` aus dem Generator entfernen (ungenutzt).
- Multiplayer (Mechaniken sind bereits darauf ausgelegt, z. B. keine Zeitlupe beim Zeichnen).
