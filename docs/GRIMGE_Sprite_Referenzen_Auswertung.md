# GRIMGE – Auswertung der Beispiel-Sprites (26.10.2026)

Quelle: `C:\Users\fahrendholzheiermann\Downloads\sprites` (34 Bilder, vom User generiert). Die Bilder liegen nicht im Repo.

**Regel:** Die Bilder sind nur Inspiration. Mehrere zeigen erkennbar fremde Figuren (Ninja-Stirnband, Wolkenmantel, Strohhut-Gummikörper, Haarfarben-Aufstiege). Daraus übernehmen wir nur die **Idee** mit eigenem Namen, eigener Form und eigener Farbe, nie das Design 1:1.

## Was schon umgesetzt ist

| Bild | Umsetzung |
| --- | --- |
| (11), (12) dunkle Rüstung mit Gold, grüne Blitze, goldene Sichel mit Smaragden | **T06 Ionspindel** als Rüstungsverwandlung (v32) |
| (5), (6) Schildkröten-Tech-Panzer, Armkanone, Kugel-Angriff | **A10 Konstruktpanzer** (v33) |

**Neue Technik dafür:** `form_recolors.js` färbt die eigenen Pixel des Helden pro Frame um (Panzer, Goldkanten, Helm, Augen, Plattenfugen). Die Animation bleibt die des Helden. Damit lassen sich viele der folgenden Ideen günstig umsetzen: Haarfarbe, Hautfarbe, Tattoos, Rüstungen.

## Verwandlungen und Arcane States

| Bild | Idee (eigener Name) | Wo im Spiel | Umsetzung | Aufwand |
| --- | --- | --- | --- | --- |
| (29)–(32) weißer Gi, goldene Aura mit Blitzen, dann weißes Haar, dann blaue Flammen-Aura | **Aufstiegsstufen**: Aura Stufe 1 gold mit Blitzfunken, Stufe 2 weißes Haar, Stufe 3 blaue Flammenaura | Fokus-Verwandlung (`focusTransform`) oder ein Arcane State mit 3 Stufen | Umfärben: dunkle Haarpixel im Kopfbereich werden weiß bzw. blau; Aura-Sheets je Stufe | S |
| (8), (9) rote Haut, rote Kugeln in der Hand, brennende Blutsense, Siegelkreis am Boden | **Oni-Blut**: Ausbau von **Blutfinsternis** | Blutfinsternis (gibt es) | Haut rot umfärben, glühende Augen, Blutkugeln kreisen, Siegelkreis als Boden-Sheet, Sense mit Blutflamme | M |
| (20) weißer Gi, gehörnter Drachengeist-Kopf hinter dem Rücken, Feueraura | **Drachengeist** | neuer Ignis-Arcane-State oder Ausbau T40 | Drachen-Kit gibt es (`vfx_dragon`): gehörnter Kopf als Rücken-Manifestation, Feuer-Aura-Sheet | M |
| (23) Feuer-Siegel-Tattoos auf dem Oberkörper, brennende Arme, Feuerkugel | **Feuersiegel**: Körper-Modus | Ignis-Arcane-State oder Fokus | Umfärben: Siegelmuster auf die Haut malen (pulsierend), Flammen an den Händen | S–M |
| (10) lila Verderbnis, Stacheln aus dem Körper, lila Rauch | **Schattenbruch** | Umbra/Void, Ausbau T23 Nullfeldträger | Umfärben ins Lila-Schwarze, Stacheln an der Kontur, Rauch-Sheet | M |
| (13), (14) schwarze Samurai-Rüstung mit Federbusch, Totenmaske | **Totenmasken-Rüstung** | Umbra-Rüstungsverwandlung | Umfärben schwarz-rot mit Goldkanten, Helm mit Totenmaske, Federbusch als Rücken-Sheet | M |
| (15), (16) Jade-Samurai-Rüstung, zwei rosa Energieschwerter über Kreuz, schwebende Steine | **Jadeklingen-Aufstieg** | Bankai für Doppelschwerter | Umfärben jadegrün, zwei Energieklingen, Steinbrocken schweben ums Kampffeld | M |
| (17) goldener Ring mit Trommeln hinter dem Kopf, Blitze, weiße Augen | **Donnerkranz** | Fulgur-Arcane-State | Kranz-Sheet hinter dem Rücken, Blitze springen von Trommel zu Trommel, Augen weiß umfärben | M |
| (19) grüne Geisterflammen mit Totenschädel, Katana | **Seelenschädel** | Mortis/Umbra: Technik oder Begleiter | grünes Seelenfeuer-Sheet mit Schädel, Klinge mit grüner Flamme | S–M |
| (21) schwarzer Dämon mit zerrissenem Umhang und Speer | **Schattenlanzer** | Umbra-Verwandlung für Speer/Glefe | Umfärben schwarz, glühende rote Augen, Umhang-Sheet, Speer dunkel | M |
| (24), (25) goldene bzw. schwarz-goldene Ritterrüstung, blau brennendes Schwert, Runenschild | **Runenritter** | Bankai der Wächter (Schwert & Schild) | Umfärben gold bzw. schwarz-gold, Klinge mit blauer Flamme, Runenschild-Sheet | M |
| (27), (28) wuchtige dunkelrote Arme und Beine, weiße Dampfwolken | **Dampfstufe**: zweite Stufe von **Dehnleib** (A05) | A05 (gibt es) | Arme und Beine dunkelrot umfärben, Dampfwolken-Sheet, Schläge schwerer | M |

## Waffen (als Sprite oder Waffen-Skin)

| Bild | Waffe | Im Spiel | Vorschlag |
| --- | --- | --- | --- |
| (.jpg) | Speer, Großschwert, Rundschild mit Fell | Speer, Runen-Großschwert, Schwert & Schild | Look-Upgrade „Fellkrieger“ (Fell am Schild, verzierte Klinge) |
| (.png), (1), (2) | Mondsichel-Hellebarde (Klinge wie ein Halbmond) | Glefe | neuer Glefen-Skin „Mondsichel“ |
| (3) | Gewehrgestell auf dem Rücken, Anzug mit blauen Leuchtpunkten | – | Tech-Rüstung für eine spätere Klasse „Runenschmied“ |
| (5), (6) | Armkanone | jetzt in A10 | als eigene Klassenwaffe „Handkanone“ für den Runenschmied |
| (7), (8) | Kettensense mit Blutflamme | Kettensense | Blutflammen-Skin für Blutfinsternis |
| (13), (14) | Katana mit roter Scheide auf dem Rücken | Katana, Odachi | Skin „Rotscheide“ (Scheide sichtbar auf dem Rücken) |
| (15), (16) | zwei Energieschwerter | Doppelschwerter | Energie-Variante für den Bankai (siehe oben) |
| (18) | gezackte blaue Geisterklinge | Geisterschwert | Look-Upgrade: gezackte, blau leuchtende Klinge |
| (17) | kurze Klinge + Nunchaku-artige Kette | – | eventuell Mönchswaffe „Kettenstab“ |
| (21) | schwarzer, gezackter Speer | Speer | Skin „Schattenspeer“ |
| (24), (25) | blau brennendes Schwert, Runen-Rundschild | Schwert & Schild, Zauberklinge | Runenritter-Skin |
| (26) | Eiskristall-Speer mit Zacken | Speer, Eisschwert | Skin „Frostspeer“ |
| (4) | Spiral-Armschiene | Panzerhandschuhe | Skin „Spiralschiene“ |

## Effekte für Zauber

| Bild | Effekt | Wofür |
| --- | --- | --- |
| (6) | cyanfarbene Energieringe um eine Kugel | umgesetzt (Schalenrolle, Handkanone) |
| (7), (8) | rote Energiekugeln, die in der Hand kreisen | Blut-Zauber, Blutfinsternis |
| (8) | goldener Siegelkreis mit Runen am Boden | Wirk-Kreise für Verwandlungen (statt einfacher Ringe) |
| (10) | lila Rauchschwaden | Umbra/Void-Zauber |
| (15) | schwebende Steinbrocken | Aufstiegs- und Terra-Effekte |
| (17) | Blitze, die einen Ring entlanglaufen | Fulgur-Domäne, Donnerkranz |
| (19) | grünes Seelenfeuer mit Schädel | Mortis-Rune, Seelensucher |
| (20) | Feueraura mit Flammenzungen am Rücken | Ignis-Verwandlungen |
| (24) | blaue Flamme an einer Klinge | Waffen-Infusion mit Eis/Licht |
| (27) | weiße, verschnörkelte Dampfwolken | Dampf-Stufe, Wasser+Feuer-Kombo |
| (29)–(32) | Aura-Stufen gold → weiß → blau mit Funken | Aufladen, Fokus-Stufen |

## Ausrüstung in Schichten

Die Bilder (.png), (1)–(4) zeigen jeweils „UNCLAD BASE“ und „FULLY EQUIPPED“, Bild (26) sogar einzelne Teile (Hut, Armschiene, Beinschienen). Das spricht für Kleidung und Rüstung als eigene Schichten über einem Grundkörper. Mit dem Umfärben geht das nur für Farben. Echte Kleidungsschichten müssten pro Frame des Helden gezeichnet werden, also in der Sprite-Pipeline des Charakters. Das ist ein größeres eigenes Thema.

## Empfohlene Reihenfolge

1. **Aufstiegsstufen** (Haarfarbe + Aura, sehr günstig mit dem neuen Umfärben)
2. **Oni-Blut** als Ausbau von Blutfinsternis
3. **Drachengeist** (das Drachen-Kit gibt es schon)
4. **Feuersiegel** (Tattoos auf der Haut)
5. **Runenritter** als Wächter-Bankai
6. **Totenmasken-Rüstung**, **Dampfstufe**, **Donnerkranz**
7. Waffen-Skins nach Bedarf
