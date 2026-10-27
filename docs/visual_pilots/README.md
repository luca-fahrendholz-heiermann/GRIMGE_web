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

## v26 — Spezialrunen Runde 5 (26.10.2026)

`art/authoring/vfx_runes5.cjs`:
- **Schwebende Bastion:** genietete Schildschollen aus Petrol-Stahl mit Goldrand, die bei Abnutzung einen Riss bekommen.
- **Nachhallarchiv:** goldversiegelte Archiv-Rollen.
- **Glutpumpe:** gerippte Pumpe mit glühenden Nähten, Hitzeanzeige, Dampf und Glut.
- **Raumfalter:** halbdurchsichtige Raumfalten mit violettem Sternenlicht und goldener Naht.
- **Klingenchor:** knochenweiße Zierklingen mit rotem Kernschlitz, geladen golden umrandet.

- `v26_runde5.png`

## v27 — Spezialrunen Runde 6 (26.10.2026)

`art/authoring/vfx_runes6.cjs`:
- **Sekundenpfand:** offenes Siegel mit Sekunden-Strichen und wanderndem Lichtpunkt, Lichtsäulen auf den Marken.
- **Stillfuge:** sechseckige Glaskuppel mit beinweißen Rippen über einem Holzring, langsame Glassplitter.
- **Rücksprungnadel:** schlanker Jade-Dolch mit grünem Kern und Klingenring.
- **Seismischer Steg:** Basaltplatten mit goldener Naht.
- **Flutschiene:** kachelbarer Wasserkanal mit Platin-Wellenkämmen.

- `v27_runde6.png`

## v28 — Arcane States Runde 1 (26.10.2026)

`art/authoring/vfx_arcane1.cjs` — handgezeichnete Manifestations-Sheets `as_<id>_back/_front` (128×128, Brust in der Mitte).
`buff_vfx.renderManifestation` zeichnet sie vor dem prozeduralen bzw. V3.2-Look, beim Blocken bleibt der Form-Renderer aktiv.
- **Schlackenkern:** Keramik-Ofen an der Hüfte mit brennender Ofenöffnung, Rippenbänder um Taille und Schulter, Glutrisse, Rauch.
- **Korallenschild:** zwei Fächersegel aus Korallen-Lamellen mit Membranen und türkisem Saum.
- **Bruchflug:** drei facettierte Kristallflügel aus den Schulterblättern, in Scherben gebrochen und von pinken Nähten gehalten.
- **Ionspindel:** Spindelachse hinter dem Rücken mit pulsierenden Ionenknoten, drei Kupferspulen auf weiten Bahnen, Zickzack-Bögen.

- `v28_arcane_states_r1.png`

## v29 — Fadenschlag schwingt (26.10.2026)

Wunsch: „mehr spiderman mäßig … dass man sich auch rumschwingen kann“ (gemeint war Fadenschlag). Eigene Umsetzung ohne Netze aus dem Handgelenk:
eine Garnspule fliegt hoch, eine Nadel heftet sie in die Luft, und der Held schwingt am Seidenfaden (`public/src/arcane_fadenschlag.js`).
- **Fadenschwung (Sprung in der Luft):** Die Spule haftet vorne oben, der Held pendelt durch den Tiefpunkt und wird am Ende nach vorne oben geschleudert. Erneut springen lässt früher los. Danach kann sofort der nächste Faden kommen. Gegner auf der Bahn bekommen einen Schwungtritt (verlangsamt mit 35 % Chance).
- **Fadenhaken (vorwärts kurz):** Die Spule hakt den ersten Gegner an, der Faden reißt ihn heran, dann folgt ein Aufwärtshaken.
- **Fadenzug (hoch kurz):** Die Spule haftet hoch oben und zieht den Held hinauf, von dort kann er weiterschwingen.
- **Seidennetz (runter voll):** Ein Netz aus Seidenfäden, gehalten von sechs Nadeln (`silk_web`), zieht Gegner heran und schnappt dann zu (Wurzeln).
- Neue Sheets in `vfx_arcane1.cjs`: `silk_anchor` (Garnspule an einer Nadel) und `silk_web`.

- `v29_fadenschlag_swing.png` (Haken, Netz, Schwung)

## v30 — Fadenschlag: Optik nachgezogen, keine Spulen mehr (26.10.2026)

Wunsch: „bitte optik nachziehen, obwohl ich spulen auch ein wenig lahm finde“.
- **Fadenharfe (`as_T13_back/_front`):** Drei gebogene, gezahnte Sichel-Beine aus Stahl fächern aus den Schulterblättern, ein kleineres vorn an der Schulter. Dazwischen sind Seidenfäden wie Harfensaiten gespannt, auf denen pinke Glanzpunkte laufen. Lose Seidenenden wehen von den Spitzen.
- **Anker:** Statt der Garnspule beißt sich eine Haken-Kunai (Klinge mit Blutrinne, Widerhaken, umwickelter Griff, Ring für den Faden, pinke Quaste) in die Luft (`silk_anchor`).
- **Seidennetz:** Das Netz wird von sechs Kunai gehalten, die im Boden stecken.

- `v30_fadenschlag_look.png`

## v31 — Nichts mehr übers Gesicht, Schlackenkern-Rückenofen (26.10.2026)

- Bruchflug und Fadenschlag: Die kleine vordere Flosse bzw. das vordere Sichelbein liegen jetzt hinter dem Sprite. Der Charakter ist über ihnen zu sehen.
- Schlackenkern: Der Ofen schwebt nicht mehr neben der Hüfte. Er ist an den Rücken geschnallt (die Rippenbänder sind die Gurte), ein Kamin ragt über die Schulter und raucht, und die Ofenöffnung brennt nach hinten.

- `v31_layer_fix.png`

## v32 — Ionspindel als Rüstungsverwandlung (26.10.2026)

Nach den Referenzbildern des Users (dunkle Rüstung mit Goldkanten, grüne Blitze, goldene Sichel mit Smaragden), eigene Umsetzung.
- **Neu: Umfärben der eigenen Sprite-Pixel** (`form_recolors.js`, `sprites.recoloredCanvas`). Jede Frame des Helden wird zu Panzer: Die Helligkeit wird auf eine Navy-Stahl-Rampe abgebildet, die Pixel direkt an der dunklen Kontur auf eine Goldrampe. Die Gesichtshaut im obersten Fünftel bleibt (offener Helm). Die Animation bleibt die des Helden, das Ergebnis wird pro Frame gecacht.
- Die Kontur-Aura der Form ist grün (`registerFormCloak`).
- Rückenteile (`as_T06`): eine goldene Spindel-Sichel mit drei Smaragden in Goldfassungen und gezackte grüne Blitze, die neben dem Körper hochsteigen. Die Kupferspulen sind weg.

- `v32_ionspindel_armor.png`

## v33 — A10 Konstruktpanzer (26.10.2026)

Wunsch: „als iron man verwandlung passt auch die schildkröten variante die sich zur kugel machen kann um gegner anzugreifen“. Eigene Umsetzung nach den Referenzbildern, verbunden mit dem Konzept „Konstruktpanzer“ aus dem Fähigkeiten-Atlas II.
- **Rüstung:** Der Held selbst wird zu grünen Panzerplatten mit cyanfarbenen Kanten, Plattenfugen, geschlossenem Helm und roten Augenschlitzen (`form_recolors.js`). Die Aura ist cyan.
- **Rückenschale** (`as_A10`): gewölbte Hex-Schale mit glühendem Kernstück, Metallrand mit Leuchtstreifen und zwei Schubdüsen.
- **Techniken** (`public/src/arcane_konstrukt.js`): Handkanone (drei Energieringe) / Kernstrahl · Schubstoß / Raketenfächer (auf bis zu drei Gegner) · Schalenschild (Hex-Kuppel, fängt Schaden ab) / **Schalenrolle**: Der Held rollt sich zur Panzerkugel ein, Energieringe kreisen um sie, und sie prallt von Gegner zu Gegner (bis zu 8 Treffer). Der Körper ist während der Rolle ausgeblendet.
- **Passiv:** Alle 6 s lädt sich der Schild um 30 auf (höchstens 60).
- Freischalten: Boss-Drop oder Konstrukt-Rune Lv. 8. Sprint: Panzerramme, Sturz: Schalensturz mit Krater.
- Neue Sheets in `vfx_konstrukt.cjs`: `as_A10`, `kp_cannon`, `kp_shell`, `kp_ring`, `kp_shield`.

- `v33_konstruktpanzer.png`

## v34 — Rüstung legt sich Stück für Stück an (26.10.2026)

Wunsch: Varianten für die Verwandlungsanimation, ohne Helm zu zeichnen (muss für jede Frisur und Animation passen).
- Nach der Lichtsäule schließen sich die Platten in 8 Bändern von den Füßen bis zum Kopf (gut 1 s). Die Kante des neuesten Bandes blitzt hell auf.
- Konstruktpanzer: Danach klappt das Visier in zwei Stufen zu, zuerst über die Augen (rote Schlitze), dann über das ganze Gesicht. Ionspindel bleibt offen.
- Beim Ablegen laufen die Stufen rückwärts: Das Visier öffnet sich, dann lösen sich die Platten von oben nach unten.
- Alles wird aus den Pixeln der jeweiligen Frame berechnet (Umriss oben und unten, Kopfbereich), ohne gezeichnete Teile. Jede Stufe wird pro Frame gecacht.
- Zurück zum vorigen Stand: Commit vor v34 (`2cf7af4`).

- `v34_armor_on.png` (oben Ionspindel, unten Konstruktpanzer)

## v35 — Rüstungsformen passen auf jeden Helden (26.10.2026)

Hinweis des Users: Die erste Umfärbung passte nur zu einem Sprite. Bei anderen Klassen blieb nur der Leuchteffekt robust. Vorbild ist Blutarsenal: eine Aura, die sich dem Sprite anpasst, und Waffen an festen Körperpunkten.
- `form_recolors.js`: nur noch ein gleichmäßiger Materialton ohne Schwellen (keine Haut-, Augen- oder Kontur-Erkennung). Die Details jedes Sprites bleiben, und das Anlegen in Bändern funktioniert weiter.
- `armor_extras.js` (neu): Rüstungsteile an den Körperpunkten, wie die Waffen von Blutarsenal. Ionspindel: Hörner und Schulterstacheln hinter dem Sprite, Klauenhand. Konstruktpanzer: Armkanone am Unterarm (verschwindet, solange eine Technik sie benutzt), rote Visier-Augen.
- Getestet mit Thesen, Xame, Paladin, Nyx und John.

- `v35_armor_all_heroes.png`

## v36 — Thesen behält die angepasste Rüstung, Schalenrolle lenkbar (26.10.2026)

- **Pro-Held-Profil** (`form_recolors.js`, `TAILORED_HEROES = ['thesen']`): Für den Helden, auf den die Rüstung abgestimmt war, bleibt die angepasste Umfärbung mit Goldkanten bzw. Cyan-Kanten, Plattenfugen, zuklappendem Visier und roten Augenschlitzen, ohne Zusatzteile. Alle anderen Helden bekommen den robusten Materialton und die Anbauteile. Spätere Helden mit derselben Sprite-Basis kommen einfach in die Liste.
- **Schalenrolle steuerbar:** Die Kugel rollt etwa 2,8 s und wird mit der Bewegungseingabe gelenkt (Tastatur, Stick, Touch). Ohne Eingabe rollt sie weiter. Gegner auf dem Weg werden überrollt: Je schneller die Kugel, desto mehr Schaden und desto weiter fliegen sie. Wände lassen sie abprallen, ab hoher Geschwindigkeit zieht sie Tempostreifen.

- `v36_tailored_and_roll.png` (Thesen: Ionspindel, Konstruktpanzer · Nyx: Ionspindel, Konstruktpanzer)

## v37 — Erste gezeichnete Waffen statt Astral-Form (26.10.2026)

Nach den Beispiel-Sprites des Users (eigene Entwürfe). `art/authoring/vfx_weapons.cjs` zeichnet die Sheets, `public/src/weapon_sheets.js` legt die Griffpunkte fest. `drawHeldWeapon` zeichnet für diese Waffen das Sheet statt der Astral-Form. Schwungbahnen, Treffer-Effekte, Nachbilder und das Pulsieren beim Halten bleiben.
- **Glefe → Mondsichel-Hellebarde:** dunkler Holzschaft mit Messingringen und Griffwicklung, große Halbmondklinge mit wanderndem Glanzpunkt, Rückendorn, rote Quaste.
- **Katana:** schwarz-goldene Rautenwicklung, goldenes Stichblatt, gebogene Klinge mit Härtelinie; die **rote Scheide** hängt an der Hüfte.
- **Speer → Frostspeer:** heller Schaft mit Eiswicklungen, Kristallspitze mit gezackten Eisdornen, Frostpartikel.
- **Schwert & Schild → Runenritter:** Klinge mit blauen Flammenzungen und Runenpunkten, goldene Parierstange; runder Runenschild mit Goldrand, leuchtendem Runenkreis und Schildbuckel.
- **Geisterschwert → Geisterklinge:** gezackte, blau leuchtende Klinge mit weißem Kern.
- Noch als Astral-Form: Block-Haltung (`weapon_guard.js`), geworfene Waffen und Waffen am Boden.

- `v37_weapons_r1.png` (oben im Stand, unten im Schlag), `v37_weapon_sheets.png`

## v38 — Waffen v2: größer, detaillierter, Schild hinter dem Arm (26.10.2026)

Hinweis des Users: Schwert & Schild sah unrealistisch aus (der Arm, der den Schild hält, muss davor zu sehen sein), und die Waffen hatten nicht die Qualität der Beispiel-Sprites.
- Der Schild hängt jetzt hinter dem Körper, der Arm des Sprites liegt darüber. Nur beim Schildstoß kommt er nach vorn. Das gilt für alle Schild-Waffen.
- Alle fünf Waffen neu gezeichnet: etwa doppelt so groß im Verhältnis zum Helden. Saubere, flache Facetten ohne Dithering, Klingen mit Mittelgrat, hellen Kanten und Gravur, verzierte Fassungen mit Edelsteinen, Wicklungen am Griff, stärkere Effekte (Flammenzungen, Kristalldornen, Splitter, wandernde Glanzpunkte).
- Fehler behoben: Die Griffpunkte wurden bei halber Sheet-Auflösung doppelt versetzt.

- `v38_weapons_v2.png` (oben im Stand, unten im Schlag), `v38_weapon_sheets_v2.png`

## v39 — Waffen v3: wieder kleiner (26.10.2026)

Hinweis des Users: „viel zu groß die Waffen“. Alle fünf Waffen neu in kleinerer Größe gezeichnet (etwa 1,15 × die erste Version, gut ein Drittel kleiner als v2), mit denselben Details: Facetten, Grat, Gravur, Edelsteine, Wicklungen und Effekte. Die Griffpunkte sind angepasst.

- `v39_weapons_v3.png` (oben im Stand, unten im Schlag)

## v40 — Gezeichnete Waffen überall, Blutsense (27.10.2026)

- Block-Haltung mit den gezeichneten Waffen (`drawGuardSheet`): Der Runenschild ist groß vorn, die Katana-Scheide steht senkrecht, die Geisterklinge ist schräg gekreuzt, Glefe, Speer und Sense wirbeln als Scheibe.
- Geworfene Waffen und Waffen am Boden nutzen ebenfalls die Sheets (`drawWeaponShape`).
- Neue Waffe **Sense → Blutsense** (nach den Oni-Bildern): schwarzer Stahl mit roter Schneide und Glanzlinie am Rücken, eine Mähne aus Blutflammen, Tropfen, Schaft mit roter Wicklung.

- `v40_weapon_guards.png` (Blocken: Schild, Katana, Glefe, Geisterklinge, Sense · Sense im Stand)

## v41 — Oni-Blut: Blutfinsternis neu (27.10.2026)

Nach den Beispiel-Sprites 7–9, eigene Umsetzung. Der schwache dunkle Halo hinter dem Kopf ist weg.
- **Blutsiegel** (`oni_seal`): ein rot-goldener Runenkreis am Boden mit wandernden Runenzeichen, drei Speichen und einem gegenläufigen Innenring. Er wird größer und heller, je weniger HP der Held hat.
- **Blutkugeln** (`oni_orb`): dunkler Kern, rote Spirale, zwei Ringe. Sie kreisen auf Brusthöhe um den Körper (hinten hinter dem Sprite, vorne davor): eine bei voller HP, bis zu drei bei wenig HP.
- **Blutdampf** steigt vom Rücken auf, die **Augen** glühen gelb, und es gibt eine **blutrote Kontur-Aura**. Haltungen können jetzt allgemein eine Aura setzen (`stance.cloak`).

- `v41_oni_blut.png` (Thesen bei voller HP, Thesen bei 20 % HP, Nyx bei 20 % HP)

## v42 — A11 Drachengeist (27.10.2026)

Nach dem Beispiel-Sprite 20, eigene Umsetzung. Neuer Arcane State (Feuer, Boss-Drop oder Ignis-Rune Lv. 8).
- **Optik:** Der Hals eines gehörnten Feuerdrachen steigt hinter dem Rücken auf, sein Kopf thront nach vorn gerichtet über dem Helden. Dafür gibt es ein neues Drachen-Kit **ember** mit rot-orangen Feuerschuppen, Flammenmähne und Hörnern in Elfenbein-Gold. Hinter dem Körper lodert eine zusammenhängende Feueraura (`as_A11`), die Kontur glüht orange. Alles hängt an Körperpunkten oder liegt hinter dem Sprite und passt so auf jeden Helden.
- **Techniken** (`arcane_drachengeist.js`): Drachenbiss / Drachenatem (Feuerkegel aus dem Maul) · Aufstieg (der Drache schießt vor dem Helden aus dem Boden) / Himmelssturz (der ganze Drache stürzt herab, ein brennender Krater bleibt) · Schweifring / Drachenwacht (er windet sich 1,5 s um den Helden).
- **Passiv:** Nahkampftreffer setzen Gegner zu 30 % in Brand. Sprint: Drachensprung, Sturz: Drachensturz mit Glutring.

- `v42_drachengeist.png` (Thesen und Nyx im Stand, Drachenatem · Himmelssturz, Drachenwacht)

## v43 — Aufstiegsstufen der Fokus-Verwandlung (27.10.2026)

Nach den Beispiel-Sprites 29–32, eigene Umsetzung. Die Fokus-Verwandlung (Ascendant) steigt jetzt in drei Stufen auf:
- **Stufe 1** sofort: goldene Energieaura mit Blitzfunken, goldene Kontur.
- **Stufe 2** nach 10 s: blaue Flammenaura, blaue Kontur, **blaue Haare**. Kraft ×1,15.
- **Stufe 3 (Gottmodus)** nach 20 s: die höchste, hellste weiße Aura mit dichten Blitzen, weiße Kontur, **weiße Haare**. Kraft ×1,3. (Reihenfolge vom User korrigiert: gelb, blau, dann weiß als Gottmodus.)
- Jeder Aufstieg gibt eine Druckwelle, ein Kamerawackeln und die Ansage „AUFSTIEG II“ bzw. „AUFSTIEG III — GOTTMODUS“.
- Die Haarfarbe gibt es nur für Thesen (`TAILORED_HEROES`), weil die Haare dort sicher erkannt werden. Alle anderen Helden bekommen Aura und Kontur.

- `v43_aufstiegsstufen.png` (Thesen Stufe 1, 2, 3 · Nyx Stufe 3)

## v44 — Arcane States Runde 2 (27.10.2026)

`art/authoring/vfx_arcane2.cjs`: neue Rückenteile in Pixelqualität. Nichts liegt übers Gesicht, alles hängt am Körper; vorne nur kleine Funken an den Seiten. Getestet mit Thesen und Nyx.
- **T08 Ossuarium:** ein Knochenjoch über den Schultern mit schwingenden glasierten Glocken (Jaderisse, Klangringe) und zwei gesprungenen Grabplatten.
- **T23 Nullfeldträger:** drei schwarze Negativräume mit Säurerand und Verzerrungsringen, Partikel werden hineingezogen.
- **T24 Fadenregent:** ein goldenes Führungskreuz über dem Rücken, zwei flache Schatten-Marionetten an Lichtfäden schwingen an den Seiten.
- **T35 Kältestillstand:** gebrochene Frostglasbänder um Rücken und Hüfte, Eisflocken stehen still in der Luft.
- **T37 Säuregerüst:** wieder der vorherige Look (dem User gefiel er besser).
- **A05 Dehnleib:** große, verschnörkelte Dampfwolken steigen um den Körper auf.
- **A06 Beben:** ein Netz aus Glasrissen hinter dem Helden, schwebende Splitter.
- **A08 Sprengleib:** Rauchsäulen, ein Funkenring und glühende Sprengmarken.
- Bei A05, A06 und A08 bleibt der eigene Look, der auf die Angriffe reagiert (Gummiarme, Faustrisse, Faustrauch). Das Sheet kommt dazu (`SHEET_AND_RENDERER`).

- `v44_arcane_states_r2.png`
- Nachtrag: Die Sheets der Formen holen beim Angriff nach vorn aus (bis 12 px, bei voller Ladung mehr). Der Silhouetten-Test misst jetzt auch gezeichnete Sheets.

## v45 — Waffen Runde 2 (27.10.2026)

Sechs weitere gezeichnete Waffen statt Astral-Form (`vfx_weapons.cjs`):
- **Großaxt:** bärtiges Eisenblatt mit Goldrand und heller Schneide, Rückendorn, umwickelter Schaft.
- **Großhammer:** kantiger Kopf mit Stahlbändern und glühender Rune, kurzer Dorn oben.
- **Doppelschwerter → Säbel:** gebogene Klinge mit goldenem Handschutz und blauer Schneidenlinie.
- **Dolche → Schattendolche:** gewellte Kris-Klinge mit violettem Glanz.
- **Bogen:** Recurve-Bogen mit Hornspitzen, Griffwicklung und Goldringen. Beim Schuss senkrecht, im Stand quer getragen. Die Block-Haltung bleibt prozedural.
- **Kampfstab → Runenstab:** Hartholz mit Stahlkappen, zwei abwechselnd glühende Runenbänder, rote Mittelwicklung.
- `drawWeaponSheet` kann ein Sheet vorab drehen (`preRotation`).

- `v45_weapons_r2.png`
