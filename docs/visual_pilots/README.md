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

## v9 — Feuer in Handzeichen-Qualität (25.10.2026)

`art/authoring/vfx_fire.cjs` mit eigenen Formbausteinen:
- `flame()`: Tropfenform mit breitem Fuß, S-Schwung, heißem Kern und roter Spitze.
- `fireMass()`: Blumenkohl aus mehreren glühenden Klumpen.

Sheets:
- `fire_ball`: Komet aus Flammenzungen, weißglühender Kopf, Rauch am Schweif.
- `fire_explosion`: Blitzstern, klumpiger Feuerball mit Flammenbeulen; oben quillt Rauch, dann zerfasert alles mit Glut.
- `fire_jet` (kachelbar) mit `fire_jet_root` und `fire_jet_head`: der Inferno-Strahl in beliebiger Länge.
- `fire_whirl`: wirbelnde Säule aus spiralförmig gestapelten Flammen über glühendem Kern, Rauch, Flammenring.

- `v9_feuer_sheets.png` — alle Sheets
- `v9_feuer_ingame.png` — Feuerball und Inferno-Strahl im Spiel
- `v9_feuersturm_ingame.png` — Feuersturm im Spiel

## v10 — Wasser und Eis in Handzeichen-Qualität (25.10.2026)

`art/authoring/vfx_water.cjs` mit eigener Kristallform: ein sechskantiger Splitter mit Licht- und Schattenfacette, hellem Grat und weißem Spitzenglanz.

Sheets:
- `ice_ray` (kachelbar) mit `ice_ray_root` und `ice_ray_head`: der Gletscherstrahl. Ein facettierter Kristallbalken, Raureif-Nadeln schräg nach hinten, Frostnebel, Glanzlichter, fließende Kältestreifen; an der Hand ein Kristall-Büschel, an der Spitze ein splitternder Kristallhaufen.
- `ice_nova`: Reif kriecht mit Rissen über den Boden, an der Front brechen Kristall-Büschel hervor, am Ende zersplittern sie in Bruchstücke und Nebel.
- `ice_blizzard`: eine Schneesturm-Walze mit breitem Kopf, zerfetztem Schweif, rollenden Eis-Sicheln, treibendem Hagel, taumelnden Splittern und einer Nebelschleppe. Ersetzt den Kreis-Platzhalter.
- `water_splash`: eine offene Wasserkrone; Säulen mit Tropfen an den Spitzen, die abreißen und fallen, dazu eine Ringwelle. Wird für Wasser-Treffer genutzt, auch beim Tidenbohrer.

Der Strahl-Baukasten (`drawSheetBeam`) ist jetzt allgemein: Feuer und Eis nutzen denselben Weg.

- `v10_wasser_eis_sheets.png` — alle Sheets
- `v10_wasser_eis_ingame.png` — Gletscherstrahl, Frostnova (zwei Momente) und Blizzard im Spiel

## v11 — Blitz (25.10.2026)

`art/authoring/vfx_lightning.cjs`:
- `bolt` (kachelbar, formt sich jeden Frame neu): weißer Kern, gelbe Hülle, violetter Rand, Gabelungen, Zwillingsstrang, Funken. Jede Kachel zeigt einen anderen Frame, damit nichts sichtbar wiederholt wird.
- `bolt_root`: Ladungskugel an der Hand.
- `bolt_head`: Knoten aus kurzen Bögen.
- `bolt_hit`: Blitzstern, ausstrahlende Bögen, Funken, Brandfleck.
- `shock_ring`: Entladungsring über den Boden.

Genutzt von Kettenblitz (Glieder und Einschläge), Donner-Strahl, Sturmblitz (vorher eine Glow-Linie) und Aura-Entladung.

- `v11_blitz_sheets.png`, `v11_blitz_ingame.png`

## v12 — Erde (25.10.2026)

`art/authoring/vfx_earth.cjs` mit gemeißelter Felsform: eckige Silhouette, drei flache Facetten (Licht, Mitte, Schatten), unterbrochene Gesteinsschichten, Lichtkante und abgeplatzte Ecken.

Sheets:
- `rock_spike_v0..v3`: herausbrechen mit Erdklumpen und Staub, stehen, zerbröckeln.
- `rock_burst`: Erdausbruch mit Schollen, Brocken und Staubfahne.
- `quake_ring`: aufgeworfene Schollen im Ring, Risse, rollender Staubring.
- `magma_crack`: glühende Spalte mit blubbernder Lava, Flammen und Glut.
- `sand_wall_back` / `sand_wall_front`: Sandring in zwei Ebenen, der Zaubernde steht darin.

Genutzt von Steinstacheln, Seismischem Schlag, Erdgräber, Titanen-Stampfer, Magmaspalte (vorher Glow-Ellipse) und Sandsturm-Bastion (vorher gestrichelter Kreis).

- `v12_erde_sheets.png`, `v12_erde_ingame.png`, `v12_sandwall_ingame.png`

## v13 — Licht, Void, Schatten (25.10.2026)

`art/authoring/vfx_arcane.cjs`:
- `light_ray` / `_root` / `_head`: gleißender Schaft in Goldhülle mit flackernden Lichtspeichen und Sternfunkeln; Sonnenstern an der Hand, blendender Sternausbruch vorn.
- `halo_burst`: Lichtring mit aufsteigenden Lichtsäulen.
- `void_ray` / `_root` / `_head`: schwarze Röhre mit violetten Rändern, Partikel strömen zum Zaubernden, Raumverzerrungs-Bögen.
- `void_orb`: schwarzes Loch mit Materiering und mitgezogenen Rissen.
- `shadow_burst`: Schattenpool mit Rauchranken.
- `soul_flame`: geisterhafte Flamme mit Schleier.

Genutzt von Licht-Lanze, Null-Strahl, Halo-Puls (vorher Glow-Ellipse), Void-Kugel, Seelenflammen (vorher Radialverlauf) und Schattenschritt (vorher Ringe).

- `v13_licht_void_schatten_sheets.png`, `v13_licht_void_schatten_ingame.png`

## v14 — Natur (25.10.2026)

`art/authoring/vfx_nature.cjs`:
- `bloom_ring` / `bless_ring`: Blumen- und Gold-Kranz um den Heilkreis.
- `bramble`: Dornenranken mit Dornen und Blättern.
- `swamp`: brodelnder Giftsumpf mit Dampf und Schilf.
- `spring`: Heilquelle mit Wellen, Fontäne und Seerosen.
- `seed_burst`: Feuersamen, der aufplatzt.
- `pollen_cloud`: Pollenwolke.
- `world_tree`: Weltenbaum, der heranwächst und sich wiegt.

Genutzt von Heilblüte, Großer Blüte, Segenskreis, Dornenwuchs, Giftsumpf, Heilquelle, Pollensturm, Wildfeuer-Samen und Weltenbaum.

- `v14_natur_sheets.png`, `v14_natur_ingame.png`

## v15–v16 — Drachenatem und Bodeneffekte (25.10.2026)

- Drachenatem: drei Flammenströme fächern auf, Segmente wachsen mit der Entfernung (`v15_drachenatem.png`).
- `art/authoring/vfx_ground.cjs`:
  - `gfx_scorch`: verkohlt, glühende Glut in den Rissen, Flammen;
  - `gfx_water`: Pfütze mit Lichtkante, Glanz und Ringwelle;
  - `gfx_ice`: Eisfläche mit Facettenrissen und Kristallbüscheln;
  - `gfx_lava`: Krustenrand, treibende Schollen, Blasen;
  - `gfx_crater`, `gfx_blood`, `gfx_hole`.
- Kreisförmige Bodeneffekte nutzen sie statt weicher Ellipsen und der alten Kegelflammen (`v16_boden_sheets.png`, `v16_boden_ingame.png`).

## v17–v19 — Himmel, zackige Blitze, Drachen (25.10.2026)

- Sphären: handgezeichnete Sonne, Mond, Blutmond, Eklipse, Sturmwolke, Sternbild (`v17_*`).
- Blitze v2 nach der Vorlage: dünne, scharfe Zickzack-Segmente, gefüllte Spitzen an jedem Knick, verstreute Funken; kein dicker violetter Schlauch mehr (`v18_blitz_zackig.png`).
- Drachen statt Würmer (Vorlage: Zwillings-Blutdrachen aus dem Clip, geflügelter Pixel-Drache):
  - `art/authoring/vfx_dragon.cjs` mit Kopf (Mähne, Hörner, Wangenkämme, Reißzähne, glühendes Schlitzauge, Barteln, öffnender Kiefer), Panzerschuppen-Abschnitt, Rückenstachel und Klaue, jeweils in Blut und Obsidian-Gold;
  - zur Laufzeit an einer Wirbelsäule zusammengebaut (`drawDragon`);
  - die Blutschirm-Zwillinge winden sich um das Ziel und brüllen oben seitlich;
  - der Sonnenwyrm (T40) nutzt denselben Baukasten.
- `v19_drachen_kit.png`, `v19_blutdrachen_ingame.png`

## v20–v21 — Blutwaffen und Arcane State A09 Blutarsenal (25.10.2026)

- Blutfinsternis: Waffen aus Blut, mit Strängen am Unterarm verschmolzen (Gewehr, Bogen, Klinge; `v20_*`).
- Neuer Arcane State **A09 Blutarsenal** (Körperkraft, nur als Boss-Drop), nach der Vorlage „mit Waffen verschmolzen“:
  - Look: Gewehre wachsen aus dem Rücken, Raketenwerfer auf der Schulter, Blutgewehr am Unterarm, Adern über dem Körper, glühende Augen und ein Grinsen;
  - vorwärts: Blutsalve / Gatling-Sturm;
  - hoch: Raketenhub / Raketenregen;
  - runter: Dornenbett / Volles Arsenal;
  - passiv: Nahkampftreffer lassen mit 50 % Wahrscheinlichkeit bluten;
  - Sprint: Bajonettsturm; Sturzangriff: Speerring; Heranziehen: Blutstrang.
- `v21_blutarsenal_ingame.png` — links Ruhezustand, rechts Gatling-Sturm und Volles Arsenal

## Spezialrunen — Ist-Stand (25.10.2026)

`spezialrunen_ist_1.png` bis `_4.png`: alle 94 Spezialrunen kurz nach dem Wirken, als Grundlage für die Überarbeitung.
Ein Versuch, die gemeinsamen Formteile (Platte, Band, Faden) in feiner Pixeldichte deckend neu zu zeichnen, wirkte dünner und streifiger als die grobe Ebene. Er wurde verworfen, die Überarbeitung erfolgt je Rune mit eigenen Sheets.

## v22 — Spezialrunen Runde 1 (25.10.2026)

`art/authoring/vfx_runes1.cjs`:
- **Spiralkern:** wirbelnde Energiekugel mit Spiralarmen, Windringen und weißem Kern, dazu eine violette Überladung und ein Spiral-Einschlag.
- **Wächtergeist:** Geisterkrieger mit Hornmaske, glühenden Augen, Muskeltorso und Rauchschweif; Fäuste mit Knöcheln und Daumen; Riesenfaust-Schlag.
- **Tausendstich:** Stich-Blitze und eine Durchstoß-Welle mit Kegel-Schockringen.
- **Grenzenlos:** Sog als Singularität mit blauem Lichtring und einwärts wirbelnden Streifen; Stoß als rote Druckwellen-Kuppel; Nichts als violetter Strahl mit blau-roter Doppelhelix und Verschmelzungs-Kugel.

- `v22_runde1_spiral_waechter_stich.png`, `v22_runde1_grenzenlos.png`

## v23 — Spezialrunen Runde 2 (25.10.2026)

`art/authoring/vfx_runes2.cjs`:
- **Eisspiegel-Reigen:** Spiegel aus Eis (facettiertes Glas, Rahmen aus Eiskristallen, wandernder Glanz), Zerspringen in Splitter, fliegender Spiegelsplitter.
- **Zeitstopp:** Glaskuppel mit Stunden-Runen, Boden-Zifferblatt, schwebendes Zifferblatt mit eingefrorenen Zeigern, Partikel stehen still.
- **Schattenreigen:** dunkle Sichelhiebe mit violetter Kante und Tinten-Spritzern.

- `v23_runde2_spiegel_zeitstopp.png`

## v24 — Spezialrunen Runde 3 (26.10.2026)

`art/authoring/vfx_runes3.cjs`, Farben aus den Runen-Daten:
- **Aureolenschwarm:** facettierte Granatlinsen, gedimmt oder geladen.
- **Sternenanker:** sechsstrahliger Kristallstern mit gespaltener Kernader und kupfern glühenden Nähten; Einschlag mit Sechseck-Krater, Rissen und aufblitzenden Strahlen.
- **Kometenträger:** Kometenmantel aus kreisenden Himmelssplittern mit Flammenschweif; Landung mit drei Splitter-Schockringen, Feuerball und Rauch.
- **Splittergarten:** wachsende Kristallblüten mit gerippten Blättern, verschachtelten Blütenblättern und Jade-Kern.

- `v24_runde3.png`, `v24_runde3_sheets.png`

## v25 — Spezialrunen Runde 4 (26.10.2026)

`art/authoring/vfx_runes4.cjs`:
- **Himmelsregent:** schwebende Schollen aus violettem Himmelsstein mit leuchtenden Schwerkraft-Runen an der Unterseite.
- **Luftnähte:** gestickte Windnaht mit wandernden blauen Stichen, Windknoten an den Ankern.
- **Spiegelversatz:** Tor aus violettem Glas mit umlaufendem Glanz, das Nachbild steht darin.
- **Schicksalsnadel:** schlanke roségoldene Nadeln mit blauem Glanz und rotem Faden.

Hinweis: In den Ist-Übersichtsbildern fehlten Haltungs-Runen wie Himmelsregent. Grund war ein Fehler im Aufnahme-Skript (falsches Argument für die Qualität), kein Spielfehler.

- `v25_runde4.png`
