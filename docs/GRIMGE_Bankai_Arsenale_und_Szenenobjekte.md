# GRIMGE — Bankai-Arsenale und reaktive Szenenobjekte (23. Okt 2026)

## 1. Bankai folgt der gehaltenen Waffe

Bankai (A04) bleibt EINE Rune. Bisher wechselten je Waffe nur Farben und die Form der Schwarmteile. Jetzt bestimmt die Waffe das ganze Aussehen und alle sechs Techniken (`public/src/bankai_arsenal.js`).

Jedes Arsenal hat:
- eine eigene Formation am Körper, 1,5-fach groß um die Brust;
- eine Reaktion auf Angriffe (die Formation neigt sich mit) und auf Blocken (die Teile bilden eine Wand vor dem Wizard);
- sechs eigene Techniken: Aufladen vorwärts, hoch und runter, jeweils kurz und voll.

Treffer hinterlassen weiterhin die Wunde der Klasse (`bankai.js`).

| Arsenal | Waffen | Formation | Techniken (→ kurz/voll · ↑ kurz/voll · ↓ kurz/voll) |
|---|---|---|---|
| Schwarm | Schwerter, Doppelschwerter, Katana, Odachi, Eisschwert | Klingenblüten-Ring | Blütenstrom / Tausend Klingen · Blütenwirbel / Klingensäule · Klingenteppich / Blütengrab |
| Koloss | Große Axt, Großer Hammer | Titanenwaffe über der Schulter | Titanenhieb / Bergspalter · Himmelsschwung / Titanenrad · Erdbrecher / Meteorfall (Krater) |
| Speerkrone | Speer, Gleve | Fächer aus 6 Speeren | Speerstoß / Speersturm · Speersäule / Speerwald · Speerkreis / Himmelsspeer |
| Schildlegion | Schwert & Schild, Streitkolben & Schild | 4 kreisende Turmschilde | Schildramme / Phalanx · Schildheber / Schildkäfig · Schildbeben / Bastion (+Schild) |
| Sensenmond | Sense, Kettensense | Mondsense hinter dem Rücken | Mondsichel / Dreifacher Mond · Aufsteigender Mond / Mondrad · Ernte (zieht heran) / Fallender Mond |
| Schattenschwingen | Dolche, Wurfklingen (Krallen: Fangsturm) | Flügel aus Klingen | Klingenfächer / Schattenhagel (zielsuchend) · Aufwärtsschnitt / Klingenwirbel · Schattenkreis / Tausend Schatten |
| Sternenbogen | Bogen, Armbrust | Großer Bogen über dem Kopf | Dreifachschuss / Sternpfeil · Pfeilfontäne / Himmelsfeuer · Pfeilregen / Sternenfall |
| Faustfeuer | Panzerhandschuhe, Kampfstab | Zwei Riesenfäuste | Doppelfaust / Feuerkomet · Aufwärtshaken / Faustsäule · Bodenfaust / Himmelsfaust |
| Klingenkranz | Runenklingen, Geisterklingen | Kranz aus 5 Großschwertern | Klingenwurf / Klingenkaskade · Klingenaufstieg / Klingenkranz · Klingenring / Richtschwert |
| Siegel | Arkaner Stab, Kugel, Ruten, Zepter | Zwei Runenkreise | Siegelstrahl / Großer Siegelstrahl · Siegelsäule / Siegelturm · Siegelbann / Siegelgericht |
| Wurfrad | Karten, Chakrams, Talismane, Harfe, Zither | Rad aus Wurfteilen | Fächerwurf / Flutwurf · Wirbelsäule / Wirbelturm · Ringwurf / Siegelfalle |

Die Techniken sind aus wiederverwendbaren Mustern gebaut: Schwung, laufende Front, Geschosse, Aufsteigen, Jonglieren, Ring, Absturz, Reihe, Strahl, Regen, Einkreisen, Fausthiebe. Jedes Muster wird mit dem Teil des jeweiligen Arsenals gezeichnet.

Die Trainingsliste im Grimoire zeigt die Bankai-Techniken der gehaltenen Waffe.

## 2. Reaktive Szenenobjekte

Szenenobjekte sind neutrale, zerstörbare Props mit eigener Lebensleiste (`public/src/scene_objects.js`). Sie spüren Elemente aus drei Quellen:
- die Element-Tags jedes Treffers;
- den Boden unter ihnen (Pfützen, Feuer, Eis, Kartenbecken, Regen);
- Element-Zauber, die in ihrer Nähe vorbeifliegen.

**Pflanze: Setzling → Jungbaum → Baum**
- Wasser und Natur lassen sie wachsen und heilen sie, statt ihr zu schaden; Licht lässt sie ein wenig wachsen. Ein blauer Balken unter der Lebensleiste zeigt das Wachstum.
- Ein Setzling ist knöchelhoch: Schüsse fliegen über ihn hinweg. Jungbaum und Baum fangen Schüsse ab (Deckung). Nur der Baum blockiert den Weg.
- Feuer setzt die Pflanze in Brand. Ein brennender Baum setzt den Boden und die Nachbarobjekte in Brand. Wasser löscht ihn samt Brandboden; danach ist er kurz nass und fängt nicht sofort wieder Feuer.
- Frost friert sie ein: kein Wachstum, spröde (Nahkampf ×1,5).
- Blitz spaltet einen Baum und schockt alle in der Nähe.
- Ein gesunder Baum trägt ab und zu eine Heilfrucht.
- Gefällt fällt der Baum in Schlagrichtung, trifft alles entlang des Stamms und hinterlässt einen Baumstamm. Verbrannt bleibt nur Asche.

**Baumstamm**
- Niedrige Deckung, die den Weg blockiert.
- Brennt gut.
- Mit Natur getroffen treibt er einen neuen Setzling aus.

**Felsbrocken**
- Ein schwerer Schlag oder Wind lässt ihn rollen; er überrollt alles in der Bahn und stößt gegen andere Objekte.
- Feuer macht ihn zum Glutfels, der bei Berührung brennt.
- Wasser auf dem Glutfels lässt ihn reißen (Thermoschock).

**Natur-Zauber** legen mit 30 % Chance einen wilden Setzling ab, höchstens 6 gleichzeitig. Die Test-Suite schaltet das über `sceneConfig.seedChance` ab, damit die Läufe deterministisch bleiben.

**Karten** können Szenenobjekte über `props` setzen: `seedling`, `sapling`, `tree`, `log`, `boulder`. Die Waterfall-Arena hat zwei Setzlinge und einen Felsbrocken am Rand.

Das System ist erweiterbar: Eine neue Objektart erbt von `SceneObject` und überschreibt `react(element)`, `update()`, `onBreak()` und `render()`.

## 3. Interaktive Objekte, Paket 2 (23. Okt 2026, „alles umsetzen“)

**Element-Objekte** (`public/src/scene_pack_elements.js`):

| Objekt | Reaktionen |
|---|---|
| Ranke | Wasser/Natur → Plattform (90 px); Feuer brennt sie samt Plattform weg |
| Pilzkreis | Schlag → Giftwolke; Feuer → Sporenexplosion; Schatten → giftiger, schneller nachwachsend |
| Riesenblüte | Licht lädt; Schlag → Heilpollen für das Team des Schlägers; Schatten → Fleischfresser |
| Bienennest | Schlag → Schwarm jagt den nächsten Kämpfer; Rauch/Feuer beruhigt |
| Eiszapfen | Frost wächst; Feuer → Pfütze; harter Schlag → Splitter; werfbar |
| Wasserfass | Schlag → Leck, wachsende Pfütze; Frost → Eisfläche; werfbar |
| Kohlebecken | Wind → Glut fliegt; Wasser → Dampfwolke (Schüsse treffen schlechter); umgestoßen → Feuer |
| Pulverfass | Feuer/Blitz/Bruch → Explosion mit Kettenreaktion; in der Luft oder blockend = Schleuder; werfbar |
| Kristallsäule | 3 Blitztreffer → Kettenblitz + Signal |
| Gong | Schlag → betäubende Schallwelle + Signal; Blitz → Summen (Paralyse) |
| Sprungplatte | Schlag oder Landung von oben → schleudert hoch |
| Stalagmit | Erde → Säulen-Plattform; harter Schlag → Steinbrücke |
| Windrad | Wind → Aufwind-Säule + lenkt Schüsse ab; Blitz → Mana-Generator |
| Banner | Feuer → fällt; das Tuch schluckt Schüsse |
| Spiegel | wirft Schüsse zurück; Licht → Strahl; zwei Schattenportale = Teleporter |
| Laterne | Licht-Zone (Geisterplattformen); Schatten → Dunkelheit, Minions sehen dich erst aus nächster Nähe |
| Grabstein | Schatten → Skelett für das Team des Zaubernden; Licht bannt |
| Kronleuchter | Seil treffen → fällt auf alle darunter |
| Truhe | nur ihr Element öffnet das Schloss (Beute) |
| Elementschrein | Schlag → 4 Element-Ladungen für Nahkampftreffer; Zauber seines Elements → Buff-Zone |

**Kletter- und Rätselbausteine** (`public/src/scene_pack_puzzles.js`):
- Sims, Liane (Schwung), Geysir (Feuer + Wasser), gefrierbarer Wasserfall mit Eisstufen.
- Netz, Rankenvorhang und brüchige Wand als Sperren über die ganze Lane (Axt/Hammer ×3).
- Hebel, Eis-Hebel, Druckplatte, Tor und Fallgitter, verbunden über Signale.
- Brüchiger Boden (Sturzangriff), Seilbrücke (kappen → Rampe), Floß, Magnet.
- Geisterplattform (nur im Licht), Wasserbecken-Lift, Staub (Inschrift/Luke), Kletterwand (Speertreffer setzen Stufen).

**Systeme** (`public/src/scene_systems.js` u. a.):
- Ausgewachsene Bäume haben Ast-Plattformen.
- Nehmen: Block + runter (Waffe vom Boden, werfbares Objekt über den Kopf); werfen: Sprint + Wischen (Sprint + Tippen bleibt der Sprint-Angriff).
- Die KI zündet Pulverfässer neben dem Helden; Fernkämpfer ducken sich beim Nachladen hinter Deckung.
- Licht-Zauber setzen Laternen, Erd-Zauber Stalagmiten.
- Training und Debug-Ansicht zeigen Labels mit der Lösung.

**Trainingskarten:** RÄTSELHOF (Klettern), ELEMENTGARTEN (Element-Objekte), BURGTOR (Schalter, Tore, Sperren).

## 4. Dungeon-Geheimnisse (`public/src/dungeon_secrets.js`)

Ein Geheimnis besteht aus vier Teilen:
1. **Hinweis:** etwas Auffälliges im Raum.
2. **Schlüssel:** Element oder Fähigkeit, aus dem Deck, dem Runenangebot oder einem Schrein.
3. **Weg:** eine neue Ebene.
4. **Belohnung:** ein Geheimraum mit Geheimboss, der eine späte Rune droppt, plus Truhe und Rückweg.

Geheimräume liegen weit rechts der Dungeon-Räume (eigene Grenzen, eigenes Ambiente). Ein Portal bringt hinein und zurück an die Stelle, an der man den Dungeon verlassen hat. Luken, brüchige Böden und Staub mit `link` öffnen ebenfalls Geheimräume.

**Der verdorrte Hain (Raum 2):**
- Ein zäher, welker Setzling (braucht doppelt so viel Wasser) steht am Fuß eines 205 px hohen Simses.
- Schlüssel: Wasser- oder Natur-Zauber, die Ladungen des Wasserschreins oder das leckende Fass.
- Der gewachsene Baum hat Äste auf 70, 118 und 165 px. Von der Krone erreicht man das Sims mit einem kurzen Sprung mit Anlauf.
- Auf dem Sims wartet das Portal in den **Dornenhain**.
- Dort kämpft der **Dornen-Treant**:
  - 900 LP; Feuer ×1,6, Wasser/Natur ×0,4.
  - Dornenlinien, Wurzelring, Setzlinge und Wasser heilen ihn.
  - Ab der Hälfte zornig: schneller, mit Pilzen.
- Besiegt droppt er eine späte Rune, eine Natur-Truhe erscheint, und das Ausgangsportal führt zurück.
