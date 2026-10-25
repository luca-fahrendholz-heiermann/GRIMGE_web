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

## v4 — Elemente in Material-Qualität (25.10.2026)

Nach der Freigabe des Tidenbohrers v3 als Detail-Referenz werden alle Elemente und Angriffe umgestellt.

- **Feine Zeichenebene:**
  - Material-Effekte und die verfeinerten Sprites (Eiszacken, Meteor) zeichnen jetzt in Charakter-Pixeldichte.
  - Vorher lief alles über eine grobe 2,5-px-Ebene.
- **Material-Partikel** (`v4_material_partikel.png`) — alle Element-Partikel verhalten sich wie ihr Material:
  - Feuer-Zungen steigen auf und werden zu Rauch;
  - Tropfen fallen und spritzen;
  - Eis glitzert, Blitzbögen zucken, Wind zieht Schlieren;
  - Steine springen, Blätter taumeln, Void kreist ein, Licht funkelt, Schatten kräuselt sich.
- **Feuerball** (`v4_feuerball.png`): eine brodelnde Feuerkugel mit nachwehenden Zungen und Glutspur; beim Einschlag eine echte Explosion.
- **Strahlen** (`v4_strahlen.png`) sammeln sich an der Hand und wachsen aus ihr heraus:
  - Inferno: spitze, unregelmäßige Flammenzungen;
  - Gletscher: facettierte Kristallprismen mit Eisnadeln;
  - Donner: zuckender Zackenblitz mit Gabelungen;
  - Null: dunkle, einströmende Röhre;
  - Licht: gleißender Schaft mit flackernden Goldstrahlen.
- **Windstoß, Kettenblitz, Steinstacheln, Frostnova** (`v4_wind_blitz_erde_frost.png`):
  - eine Luftsichel mit Wirbeln;
  - Zackenblitze von Ziel zu Ziel;
  - Felsspitzen, die aus dem Boden brechen und zerbröckeln;
  - Reif, der über den Boden kriecht, mit zerspringenden Kristallen.

## v5 — Wind als Volumen (25.10.2026)

Rückmeldung: Wind sah aus wie Elektrizität. Neu nach den Vorlagen (Pixel-Tornado, Windböen-Streifen):
- Böe aus gedrungenen weißen Wischern;
- Trichter aus dicken, gestuften Bändern (Wind, Feuer, Sand);
- Feuersturm als Flammentornado.

- `v5_wind_boee_trichter.png` — oben die Böe, unten Trichter in Wind, Feuer und Sand
- `v5_feuersturm.png` — Feuersturm im Spiel

## v6 — Trichter je Material (25.10.2026)

Rückmeldung: Die Trichter sahen gleich aus, nur in anderer Farbe. Jetzt verhält sich jeder wie sein Material:
- Wind: glatte Bänder, abreißende Wischer, Staub am Fuß.
- Feuer: lodernde Bänder mit spitzen Zungen, glühender Kern in den Lücken, Rauchkrone, Flammenring, Glut.
- Sand: körnig, rau, matt, kreisende Steine vorne und hinten, Staubwolke am Fuß.
- Pollen: kein fester Körper, wirbelnde Blätter und Blüten auf den Bahnen, grüner Windschleier.

- `v6_trichter_material.png` — von links: Wind, Feuer, Sand, Pollen

## v7 — Handgezeichnete Strich-Technik (Richtungsvorschlag, 25.10.2026)

Rückmeldung: Das Art Design ist zu simpel. Ursache: Die Effekte sind aus geometrischen Grundformen gerechnet (gleichmäßige Bänder, glatte Kanten). Handgezeichnete Pixel-Effekte (Studie der LF2-Sheets) sind anders gebaut:
- aus kalligrafischen Pinsel-Strichen, in der Mitte dick, spitz zulaufend, an den Enden ausgefranst;
- mit Strich-Textur aus vielen unterschiedlich langen Strichen in 3 bis 4 Tönen statt flacher Füllung;
- mit einem Lebenszyklus über mehrere Phasen.

- `v7_wirbel_alt_neu.png` — links der alte Bänder-Trichter, Mitte und rechts der neue Wirbel (entstehend, voll)

## v8 — Wind in Handzeichen-Qualität (25.10.2026)

Neuer Werkzeugkasten `art/authoring/vfx_brush.cjs`:
- Pinsel-Striche, die anschwellen und spitz zulaufen, quer schattiert, mit trockenen Enden;
- Sicheln auf Ellipsenbahnen;
- Strich-Textur;
- Volumen-Schattierung mit Dithering an den Tonstufen;
- selektive Konturen;
- organische Klumpen.

Gezeichnet wird direkt in Charakter-Pixeldichte. `art/authoring/vfx_wind.cjs`:
- `wind_whirl`: 12-Frame-Schleife. Streifiger, schattierter Kern; hintere Sicheln dunkel, vordere hell; Mund mit Lichtrand; Blätter und Steine auf den Bahnen; abgeschleuderte Fetzen; Staubschürze.
- `wind_gust`: 8 Frames (entstehen, rollen, zerfallen). Fester Windkörper mit Strichen, rollende Sicheln am Kopf, gerissene Fetzen, mitgerissener Staub.

Vorschau: `node art/authoring/preview_sheet.cjs art/authoring/vfx_wind.cjs windSheets out.png 3`

- `v8_wind_handgezeichnet.png` — links der Windstoß im Spiel, rechts der Wirbel neben dem Helden
