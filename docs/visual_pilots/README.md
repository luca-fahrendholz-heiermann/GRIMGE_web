# Visual-Piloten — Vorher/Nachher (Stand 24.10.2026)

Jeweils obere Reihe: alte Darstellung (`?vfx=legacy`), untere Reihe: neu. Gleiche Kamera, gleiche Momente.

- `eiszacken_vorher_nachher.png` — S37 Eiszacken
- `meteor_vorher_nachher.png` — Meteor Cataclysm (Fulgur + Ignis)
- `tidenbohrer_vorher_nachher.png` — S39 Tidenbohrer
- `meteor_ablauf_neu.png` — neuer Meteor-Ablauf: Blitz → Feuerball → Rauch → Krater
- `meteor_explosion_sheet_alt_neu.png` — Explosions-Sprite-Sheet, oben alt (verrauscht), unten neu (klare Formen)

Die Sprites selbst: `public/assets/sprites/spells/*.png` (Aseprite-Quellen: `art/authoring/spells/*.aseprite`, erzeugt von `art/authoring/generate_spell_sprites.cjs`).
Im Spiel ansehen: Training starten, den Spell wirken; Vergleich mit `?vfx=legacy` bzw. nur Hauptkörper mit `?vfx=main` an der URL.
TESTASSETS — finales Artwork fehlt.

## v2 — passend zum Pixel-Charakter (24.10.2026)

Grund: Spell-Pixel waren 2 Spielpixel groß, Charakter-Pixel ~0,7 → die Spells wirkten grob und fremd; dazu dicke fast schwarze Konturen und flache Flächen.
Neu (`art/authoring/refine_hires.cjs`): doppelte Pixeldichte (Scale2x, keine Weichzeichnung), Volumen-Schattierung von oben links in 1-Pixel-genauen Stufen, feine Facettennähte, dünne Kontur in dunkler Materialfarbe.

- `v2_eiszacken_tidenbohrer_ingame.png` — im Spiel neben dem Charakter
- `v2_meteor_ingame.png` — Meteor-Einschlag
- `v2_eiszacken_sheet_alt_neu.png` — Eiszacken-Sheet oben alt, unten neu

## v3 — Tidenbohrer natürlicher (25.10.2026)

Rückmeldung: Eiszacken passen, der Tidenbohrer soll natürlicher wirken, besonders im Übergang vom Ring in die Wasserstrahlen.

- **Ring:**
  - ein fließender Wasserschlauch: helle Schaumkante oben, sattes Blau, dunkle Unterseite;
  - drei wandernde Wellenkämme, Schaumschlieren in Flussrichtung, feine Gischt hinter den Kämmen;
  - vorher drei klingenartige Sicheln mit Flecken.
- **Düsen:** kleine Wasserwirbel im Band, keine Stein-Knubbel.
- **Strahlen** werden jetzt zur Laufzeit gezeichnet:
  - Sie quellen aus einer Schwellung des Rings und verlassen ihn zuerst in Drehrichtung, bevor sie gerade werden. Das ist der Übergang.
  - Welliger Rand und nach außen wandernde Strömungsstreifen.
  - Das letzte Stück bricht in versetzte Brocken und einen Sprühfächer auf.
  - Am Ende reißen sie an der Wurzel ab und zerfallen in unregelmäßige, fallende Tropfen.
  - Ein Strahl von der hinteren Ringhälfte beginnt hinter dem Wizard.
- Schaden, Rhythmus und Hitbox sind unverändert (Tests).

- `v3_tidenbohrer_ablauf.png` — sechs Momente: links von oben Ring, Ring, Strahl wächst aus dem Ring; rechts Strahl voll mit aufbrechendem Kopf, Strahl reißt ab und tropft, Ring
