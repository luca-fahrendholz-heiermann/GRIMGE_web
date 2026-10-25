# GRIMGE — VFX-Referenzanalyse (25.10.2026)

Studienmaterial, nicht im Repo: Kopieren und Weiterverbreiten sind nicht erlaubt, Prinzipien werden adaptiert.
- **kiddolink „VFX Energy Beam“:** vier Vorschau-GIFs von itch.io, Frames analysiert in `%TEMP%/grimge_tools/ref_kiddolink`. Lizenz: nutzen und verändern ja, weiterverbreiten nein.
- **Wind-Vorlagen des Projektinhabers:** ein Pixel-Tornado und ein Streifen weißer Windböen.

## Prinzipien aus den Strahl-Animationen
Jeder Strahl ist auf einem 96-px-Raster gezeichnet, kachelbar und läuft 12 bis 26 Frames.

1. **Wenige flache Farben** pro Effekt (3 bis 4 plus Hintergrund), harte Stufenkanten, keine Verläufe. Der Körper hat keine Kontur, Kontur-Linien sind nur Akzente (Energie-Haken, Blitzränder).
2. **Rotation durch Umwicklung:** Haken, Sicheln und „C“-Ringe laufen um die Strahlachse. Feuer wird zum Beispiel als verdrillte Bänder mit großen Flammenhaken gezeigt.
3. **Lebenszyklus:** Linie (Aufladen), flackernde Strichlinie, voller Strahl, dünne Linie mit Knoten, Funken-Sicheln fliegen weg.
4. **Turbulente Körper** (weiße Energie, Blitz) als gefüllte, wolkige Formen mit ausfransenden Kontur-Fetzen.
5. **Lesbarkeit aus der Ferne:** große klare Silhouetten statt vieler feiner Linien.

## Wind (Rückmeldung: „Wind sieht eher aus wie Elektrizität“)
- Dünne 1-px-Linien lesen sich als Elektrizität. **Wind ist Volumen.**
- **Böe** (`drawWisp`, `drawWindGust`):
  - wenige gedrungene Wischer, Länge etwa 4 × Dicke, runder Kopf, Körper bis zur Hälfte, spitz zulaufender Schweif;
  - oben weiß, Lavendel-Hellblau, dunkle Unterkante;
  - gerissene Fetzen dahinter;
  - in Bogenform angeordnet, die Mitte führt.
- **Trichter** (`drawFunnel`; Tornado, Feuersturm, Sandsturm, Pollensturm) — gemeinsame Grundform, Material je Element (siehe visual_pilots v6):
  - wenige dicke, klumpige, schräge Bänder, die sich überlappen;
  - oben breit, schlängelnd, unten ein Hakenschweif;
  - helle Oberkante, umlaufende Glanzlicht-Blöcke (die Drehung), dunkle Unterkante;
  - oben das dunkle Innere.
- **Wind-Partikel:** kleine gefüllte Wischer statt Linien.

## Umsetzung
- `public/src/element_fx.js` (WIND, FUNNEL_LOOKS: wind, fire, sand, pollen)
- `public/src/element_particles.js` (ventus)
- Feuersturm = Feuertrichter
