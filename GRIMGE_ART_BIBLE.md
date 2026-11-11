# GRIMGE – Art Bible

Stand: 11. Nov 2026. Aus den vorhandenen Assets und dem Code abgeleitet. Ergänzende Dokumente:
`docs/GRIMGE_VFX_Pixel_Style.md` (Zauber), `docs/GRIMGE_Sprite_Referenzen_Auswertung.md` (deine Beispiel-Sprites).

**Grundsatz:** GRIMGE bleibt Pixel-Art. Neue Assets sollen aussehen, als kämen sie vom selben Pixel-Künstler.
Bestehende Figuren werden nicht ohne Freigabe umgestaltet.

## Maßgebliche Referenzen

| Asset | Datei | Rolle |
|---|---|---|
| Thesen | `public/assets/sprites/char_thesen.png` (82×123) | Maßstab für alle Figuren |
| Thesen, Fokus-Form | `char_thesen_focus.png` (82×123) | Umhang, Speer |
| Xame | `char_xame_0.png`, `_1.png` (81×117) | zweite Pixel-Figur |
| Zauber-Sheets | `public/assets/sprites/spells/*.png` (363 Stück) | VFX-Stil |

## Figuren

- **Auflösung:** etwa 82×123 Pixel pro Figur, stehend, Dreiviertel-Ansicht nach rechts.
- **Darstellung im Spiel:** Heldenhöhe 88,8 Welt-Pixel (ein Bildpixel ≈ 0,72 Welt-Pixel), im Dungeon mit Zoom 1,3.
  Skalierung ohne Glättung; Maßstäbe nahe einer ganzen Zahl rasten ein, damit jedes Pixel gleich groß ist.
- **Proportionen:** gedrungen, etwa 3,5 Köpfe hoch; breite Schultern, große Hände und Füße.
- **Silhouette:** ein klares Erkennungsmerkmal je Figur (Thesen: Hörner an den Schultern; Xame: Schädel, Flammenhand).
- **Kontur:** 1 Pixel, sehr dunkles Braun bis Schwarz (Helligkeit unter 8 %), außen durchgehend, innen nur an
  Formgrenzen.
- **Schattierung:** 3 bis 5 Töne pro Material, Licht von oben links, harte Kanten, kein Verlauf, sparsames Dithering.
- **Paletten:** erdige Grundtöne (Haut warm braun, Leder / Knochen beige-braun), **ein** gesättigter Akzent pro Figur
  (Thesen: grüner Edelstein; Xame: violette Flammen).
- **Aussehen-Varianten:** Haar und Rüstung werden umgefärbt (`character_look.js`); Haut, Hörner und gesättigte
  Akzente bleiben.

## Animation

- **Einzelbilder, kein Tweening im Spiel:** Clips werden zu festen Bildern gebacken (`rig.js`).
- **Taktung:** 60-Hz-Ticks. Stehen 12 Ticks pro Bild, Gehen 6, Sprint 4.
- **Schläge als Schlüsselposen:** kurzes Ausholen (3–5 Ticks, der Treffer fällt beim Tastendruck) → Schlag (2 Ticks,
  mit Schliere) → Durchschwung (4–6) → Halten (6–10) → Zurück (6–11). Die Summe passt in die Angriffszeit
  (0,35–0,56 s, Schlagtempo 1,6).
- **Füße stehen auf einer festen Bodenzeile;** der Ankerpunkt liegt unten in der Mitte.
- **Schlieren:** helle, flache Farbflächen, die dem Bogen der Hand oder Klinge folgen; Ende läuft dünn aus.
- **Ersetzbar:** Jeder Clip hat einen festen Namen (`idle`, `walk`, `attack1` …); gezeichnete oder erzeugte Sheets
  ersetzen den Platzhalter unter demselben Namen.

## Umgebung

- 2,5D: eine Bodenfläche mit Tiefe (z), dahinter Parallax-Hintergrund, davor dunkle Vordergrund-Silhouetten.
- Stein in kühlen Grau-Violett-Tönen, Holz warm braun; Fackeln als warme Lichtpunkte.
- Bausteine statt ganzer Bilder: Treppe, Galerie, Tisch, Etagenbett, Kisten, Säule, Kette (`level_structures.js`).

## VFX

- Auf der Pixeldichte der Figuren gezeichnet (kein Hochskalieren), mit Volumen und Materialkontur.
- Jedes Element sieht in jeder Form nach sich selbst aus (Feuer, Wasser, Eis, Blitz …).
- Lebenszyklus: Entstehen → fließender Körper → brechende Kante → Zerfall.
- Bildschirmwackeln nur bei Einschlägen. Effekte dürfen Figuren nicht verdecken.

## UI

- Dunkles Violett-Schwarz als Grund, Goldrahmen, Schrift **Cinzel** in Versalien für Titel.
- HP grün, Mana blau, Fokus als Prozentleiste – diese Anzeige bleibt.
- Neue Bildschirme (Erstellung, Kampagne, Dialog) sind bewusst schlichte Platzhalter im selben Farbklang; das
  endgültige Layout kommt aus deinem UI-Editor (`/editor.html`).

## Stilkonflikte (bekannt)

| Konflikt | Vorschlag |
|---|---|
| Gegner-Champions sind gemalte 1024-px-Bilder, der Held ist Pixel-Art | Champions durch Pixel-Figuren im Thesen-Maßstab ersetzen |
| Hub-Hintergründe und Knöpfe sind hochaufgelöste Konzeptbilder | bei der UI-Umsetzung auf Pixel-Raster bringen oder bewusst als gemalte Menü-Ebene behalten – deine Entscheidung |
| Ältere Effekte sind geometrisch („Programmierer-Art“) | nach und nach mit dem Pinsel-Werkzeug neu zeichnen |

## Prüfliste für neue oder erzeugte Assets

1. Pixelraster einheitlich, keine Glättung, keine halbtransparenten Ränder.
2. Maßstab passt zu Thesen (82×123 für Figuren).
3. Palette: erdig plus ein Akzent; Kontur 1 Pixel dunkel.
4. Licht von oben links.
5. Transparenter Hintergrund, Füße auf der Bodenzeile, Anker unten Mitte.
6. Im Spiel bei Zoom 1 und 1,3 lesbar.
