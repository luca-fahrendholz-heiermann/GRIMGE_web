# GRIMGE – Entwicklungs-Roadmap

Stand: 11. Nov 2026. Ziel: **Campaign Alpha 0.1** – ein spielbares, zusammenhängendes Kapitel. Die langfristige
Reihenfolge der Systeme steht in `AGENDA.md`; dieses Dokument verfolgt den Weg zur Alpha.

Legende: ✔ umgesetzt und geprüft · ◐ teilweise · ○ geplant

## Meilenstein 1 – Spielbare Kampagnen-Schleife (ohne bezahlte Erzeugung)

| Punkt | Stand | Anmerkung |
|---|---|---|
| Kapitel 1 als Daten (5 Missionen, Dialoge, Belohnungen) | ✔ | `campaign_data.js` |
| Fortschritt speichern, Missionen der Reihe nach freischalten, wiederholbar | ✔ | im Profil |
| Kapitel-Bildschirm und Dialog-Bildschirm | ◐ | Kapitel-Bildschirm im Handyspiel-Aufbau ohne Scrollen (Karte, Pins, Missions-Karte, Sterne); Dialog noch schlicht |
| Missionen auf vorhandenen Modi mit Parametern | ✔ | Dungeon-Start / -Ende, Invasions-Level, Arena-Rivale |
| Kampagnen-Knopf im Hub | ✔ | |
| Rivale Xame im Duell | ✔ | eigene Bilder für Gehen, Angriff, Sprung, Blocken, Treffer, Zaubern, Niederlage |
| Bosskampf Glutfürst | ◐ | nutzt den vorhandenen Dungeon-Boss; keine eigenen Phasen |
| Automatischer Test + Durchlauf im Browser | ✔ | Mission 1 im Browser durchlaufen (Start → Dialog → Dungeon → Sieg per Testbefehl → Outro → Mission 2 offen); Missionen 2–5 im Browser gestartet und Modus / Parameter geprüft, aber nicht bis zum Ende gespielt |

**→ Kontrollpunkt:** hier ansehen und entscheiden, wie es weitergeht.

## Meilenstein 2 – Kampagne fühlt sich wie ein Spiel an

| Punkt | Stand |
|---|---|
| Arena-HUD: Schild und Seelenfunken statt HP-Balken | ○ |
| Missions-eigene Ziele im HUD („Räume die Halle“) und Sieg- / Niederlage-Bildschirm mit Missionsbezug | ○ |
| Glutfürst mit eigenen Phasen und Ankündigungen (Telegraphs) | ○ |
| Xame animiert (eigene Bögen) | ✔ |
| Eigene Szene je Mission, Kapitel-Karte, Themen-Requisiten | ✔ |
| Dungeon-Gegner und Glutfürst als eigene Pixel-Figuren | ✔ |
| Verbündete und Invasions-Zusatzgegner als eigene Pixel-Figuren | ✔ |
| Arena- / Invasions-Champions außerhalb der Kampagne (gemalte Bilder) ersetzen | ○ |
| Thesen mit Waffe: erzeugte Posen mit Handpunkten für Gehen und Schläge | ✔ |
| Thesen mit Waffe und Fokus-Form: Sprung, Blocken, Treffer, Zeichnen auf erzeugten Bildern | ✔ |
| Stehen, Aufladen, Landen, Atemtechnik- und Schwebe-Posen noch Gerüst-Animation | ○ |
| Runen-Fund / Mastery als Missionsbelohnung | ○ |
| Dungeon: Räume mit Türen, Fortschrittsleiste | ○ |

## Meilenstein 2b – Verdienter Fortschritt

| Punkt | Stand |
|---|---|
| Start mit einer Rune, Funde, Freischalten mit Skillpunkten und Gold, Seltenheiten, Runen-Bildschirm, Test-Schalter | ✔ |
| Mastery-Stufe als Vorbedingung für seltene Runen | ○ |
| Transformation je Mastery-Baum und Klasse mit drei Modi | ○ |
| Dungeon: nach Seltenheit gewichtete Runen-Auswahl; starke Runen aus Burgen, Bossen, Geheimtruhen | ○ |
| Deck-Bildschirm (Grimoire) an die neuen Regeln anpassen und ohne Scrollen gestalten | ○ |
| Findbare Begleiter / Reittiere in großen Leveln | ○ |

## Meilenstein 3 – Oberfläche

| Punkt | Stand |
|---|---|
| Endgültige Layouts für Erstellung, Kampagne, Dialog (aus `/editor.html`) | ○ |
| Hauptmenü, Pause, Einstellungen im einheitlichen Stil | ◐ (Hub vorhanden) |
| Mastery-Bildschirm | ○ |

## Meilenstein 4 – Danach (siehe `AGENDA.md`)

Deck-System mit Punktebudget und Konter-Karten · Kapitel 2 · PvP gegen Menschen · Mastery-Ausbau.

## Was ohne zusätzliches Geld geht

Alles in Meilenstein 1, das HUD, Missionsziele, Boss-Phasen, Türen, Runen-Belohnungen und die Layouts. Bezahlte
Erzeugung lohnt sich vor allem für **Figuren-Animationen** (Xame, Champions, bessere Thesen-Clips).
