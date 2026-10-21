# GRIMGE – Atemtechniken (Stand 21.10.2026)

Recherche: Kimetsu-no-Yaiba-Wiki („Atemtechniken“, alle 14 Atmungs-Artikel, „Demon Slayer Mark“). Übernommen sind die **Verhaltensmuster** der Formen, Aussehen und Namen sind eigene Adaptionen. Code: `public/src/breathing.js`.

## Belegung (jede Atmung, 15 s Haltung)

| Eingabe | Wirkung |
|---|---|
| Normalangriff | Element-Spur am Hieb, jeder 3. Treffer setzt den Status des Stils |
| Kombo-Finisher | kurze Fassung der Vorwärts-Technik |
| Aufladen **vorwärts** | Signatur-Technik |
| Aufladen **hoch** | aufsteigende Technik (Launcher) |
| Aufladen **runter** | **Mal erwacht** (siehe unten), funktioniert auch ohne Waffe |
| **Sprint-Angriff** | Ansturm des Stils |
| **Sprint-Sprung / Luft runter** | Einschlag des Stils mit Bodeneffekt (Krater, Glut, Pfützen, Strom, Blüten …) |

Später bekommt jeder Waffentyp eigene Animationen. Die Techniken bleiben dabei gleich.

**Mit Waffe:** Die Atmung hat Vorrang. Sprint-Angriff, alle Aufladerichtungen und der Sturz sind die Atmungstechniken, nicht die Waffen-Techniken. Eine aufgehobene Feldwaffe wird in einer Atmung nicht geworfen.

## Atmung × Waffe (breathing_weapons.js)

Die Wirkung bleibt gleich (Schaden, Status, Reichweite, Bodeneffekt). Die Waffe bestimmt die Ausführung, deckend gezeichnet:

| Waffenart | Auftakt | Kopf der Technik | Besonderheit |
|---|---|---|---|
| Klingen (Schwert, Doppelklingen, Runenklinge, Dolche) | dicke Element-Sichel mit weißer Schneide | fliegende Klingen-Sichel | Kreuzschnitte auf den Getroffenen |
| Katana / Odachi | flacher Ziehschnitt mit Glanzpunkt | schmale Sichel | ein Iai-Schnitt auf den Getroffenen |
| Bogen, Armbrust, Wurfklingen, Chakram, Karten | Bogen spannen, Sehne schnappt | Pfeil / Bolzen / Klinge / Ring / Karte vorn, das Element ist der Schweif | Durchzüge werden zum durchschlagenden Schuss, der Schütze bleibt stehen |
| Axt, Hammer, Streitkolben | Überkopf-Schmetterschlag, Boden bricht | Felsspalt mit Element-Stacheln, Körper am Boden | – |
| Speer, Glefe, Sense, Stab | Stoß mit Element-Spitze | lange Speerspitze, gerader Körper | – |
| Stäbe, Orb, Ruten, Harfe, Fächer, Talisman | aufrechter Zauberkreis | rotierende Siegelkugel | – |
| Fäuste, Klauen | Faustschlag mit Ringen | Element-Faust mit Schockringen | – |

### Jede Technik in Waffenform

| Technik | Bogen / Fernkampf | Hammer / Axt | Stab / Instrument | Faust | Speer | Klinge / Katana |
|---|---|---|---|---|---|---|
| Aufladen hoch | Teleport hoch über den Gegner, **Pfeilregen** nach unten | Element-Säule unter dem Gegner | Säule aus dem Zauberkreis | hoher Aufwärtshaken mit Element-Spirale | Stabhochsprung-Stoß | Aufwärts-Sichel, Katana: senkrechter Ziehschnitt |
| Hiebfolge | Pfeilsalve, der Schütze bleibt stehen | marschierende Erdstöße mit Rissen | Siegelkugel-Salve | Faust-Hagel | weite Stiche | deckende Klingen-Sicheln |
| Ansturm | Riesenpfeil trägt die Gegner mit | Felsspalt vorneweg | Siegel vorneweg | Faust vorneweg | Lanze vorneweg | Sichel vorneweg |
| Sturz | Pfeilregen aus der Luft | Meteor-Einschlag mit größerem Radius | Siegel im Einschlag | Meteor-Faust | Speer rammt in den Boden | fallende Klinge |
| Sicheln / Säule / Explosionen | Pfeile statt Sicheln, ein Pfeil fliegt auf die Säulen-Stelle, Pfeile vor jeder Explosion | – | Kugeln statt Sicheln | Fäuste statt Sicheln | Spitzen statt Sicheln | Sicheln |


## Die Atmungen (Vorbild → Adaption)

| Rune | Atmung | Vorwärts | Hoch | Sprint | Sturz |
|---|---|---|---|---|---|
| S40 Aqua | Wasser | Flutwelle (Strom) | Wasserrad | Gezeitenschnitt (Hiebfolge mit Drehungen) | Wasserfallbecken (Pfützen) |
| S41 Ignis | Flamme | Flammenschlange (rollt weit, Glutspur) | Steigende Glut mit Feuersäule | **Glutschnitt:** durch den Gegner, Feuerspur dahinter, der Getroffene geht hinter dir in Flammen auf | Fallendes Feuer (Glut) |
| S42 Fulgur | Donner | Donnerschlag (ein Blitz durch alle in der Linie, „Hekireki Issen“) | Himmelsblitz auf den nächsten Gegner | Blitzschritt (durchbohrender Ausfall) | Donnerfall (Strom am Boden) |
| S75 Ventus | Wind | Sturmsicheln (Wind-Sicheln fächern aus) | Staubsturm (wirft hoch) | **Doppeltornado:** du wirst zum waagerechten Bohr-Tornado, ein zweiter Wirbel verflicht sich mit dir (nach Kibas „Fang over Fang“, adaptiert), mehrere Treffer, am Ende fliegen alle in alle Richtungen | Taifun (radialer Windstoß) |
| S76 Terra | Stein | Serpentinwurf (Steinwaffe fliegt hin und zurück, Kettenwaffe des Vorbilds) | Felssäule unter dem Gegner | Bergrutsch (unaufhaltsam, schiebt mit und wirft) | Kraterschlag (Krater, Risse, Geröll) |
| S77 Natura | Blume | Purpurgewand (geschwungener Hieb, Blütensturm) | Wirbelnder Pfirsich | Neun Pfingstrosen (Hiebfolge) | Blütenfall (heilt) – Treffer heilen dich etwas |
| S78 Lux | Sonne (Ursprung) | Sonnendrache (größter Strom) | Untergehende Sonne (Salto rückwärts) | Sonnenspur (wie Glutschnitt) | Sonnensturz |
| S79 Umbra | Mond | Nachtpalast (chaotischer Sichelsturm) | Mondwall | Mondschatten (Sicheln schneiden nach) | Neumond |
| S80 Void | Nebel | Wolkenmeer (Zickzack-Hiebfolge mit Nachbildern) | Mondnebel (Salto-Hiebe) | Dunstschnitt (Getroffene kurz geblendet) | Nebelfall |
| S81 Bestia | Biest | Reißzahnschlitz (X-Hiebe) | Reißen | Wilder Ansturm („ignoriert Angriffe“) | Wildes Zerreißen |
| S82 Konstrukt | Schmiede (Adaption von Klang) | Funkenkette (Explosionen marschieren) | Essensäule | Hammersturm | Ambossfall (Krater) |
| S83 Schutz | Schutz (Wasser-„Nagi“ + Blumen-Abwehr) | **Stille See:** völlige Ruhe, jeder Treffer prallt ab, danach eine Schildwelle | Schattenpflaume (Drehabwehr wirft hoch) | Schildsturm | Kuppelfall (gibt Schild) |
| S84 Eis (nach Hyōrinmaru, Bleach) | Eisdrache (friert alles ein, was er berührt) | Eiskokon (schließt den Gegner ein, zersplittert dann) | Drachenschweif (durch die Gegner, Eisspur, friert ein) | Frostthron (Eisboden) |

## Kombos (zweite Atmung wirken, während eine läuft)

Nach dem Stammbaum: Wasser → Schlange, Flamme → Liebe, Blume → Insekt, Donner → Klang.

| Kombination | Abgeleitete Atmung | Besonderheit |
|---|---|---|
| Wasser + Biest | **Schlange** | Giftzahn: hinter den Gegner und von hinten zubeißen. Hoch: Spulendrossel (umkreist den Gegner). |
| Flamme + Blume | **Liebe** | peitschenartige, gewundene Hiebe mit großer Breite |
| Blume + Mond | **Insekt** | Bienenstich (Stoß mit Gift), Facettenauge (6 Stiche) |
| Donner + Schmiede | **Klang** | Donnergrollen-Explosionen mit Schallringen |
| Wasser + Feuer | **Dampf** | heißer Druck statt Nebel: Druckstrahl (schiebt weit, verbrüht), Dampfgeysir, Zischwolke (verbrüht und blendet kurz), Druckexplosion mit Dampfwolke |

Andere Paare wechseln einfach zur neuen Atmung. Eine Kombo kostet das Mana beider Atmungs-Runen, denn jede wird einzeln gezeichnet und bezahlt.

**Kombo-Eigenheiten** (der Grund, zwei Runen zu bezahlen; wirken bei Techniken und Normalangriffen):

| Kombo | Eigenheit |
|---|---|
| Dampf | **Verbrühen:** Der Brand lässt sich nicht durch Wasser löschen, das Ziel ist zusätzlich nass. Blitz-Folgetreffer lösen damit direkt SCHOCK aus. |
| Schlange | **Kriechendes Gift:** Das Gift springt alle 1,5 s auf einen Gegner in der Nähe über, bis zu 3 Generationen. |
| Insekt | **Giftstapel:** Jeder Stich auf ein vergiftetes Ziel macht Bonusschaden und verlängert das Gift. |
| Liebe | **Bezaubern:** Treffer verlangsamen, jeder 3. Treffer lässt den Gegner kurz bezaubert erstarren. |
| Klang | **Resonanz:** Jeder 4. Treffer auf denselben Gegner löst eine Schallexplosion um ihn aus. |

**Timing:** Mit der zweiten Atmung beginnt die abgeleitete Atmung bei vollen 15 s, die Restzeit der ersten verfällt. Am besten wirkst du die zweite kurz bevor die erste endet.

**Sonnenatmung = Ursprung:** wie im Anime die stärkste Atmung. Alle Techniken wirken 1,45-mal so stark, dafür kostet sie 46 Mana (die anderen 32–34).

**Nebel ≠ Dampf:** Nebel (Void) ist kalt und still. Er versteckt dich und täuscht die Gegner. Dampf (Wasser + Feuer) ist heiß und laut. Er drückt die Gegner weg und verbrüht sie.

## Mal erwacht (Aufladen runter)

Angelehnt an das Demon-Slayer-Mal, adaptiert:
- **Aussehen:** Ein Mal in der Form des Stils (Flammen, Wellen, Blitze, Sicheln …) leuchtet auf Gesicht und Körper.
- **Wirkung, 10 s:**
  - +25 % Nahkampfschaden und +20 % Tempo
  - Die Klinge ist heiß, Treffer verbrennen.
- **Preis:** 1,5 HP pro Sekunde, das rasende Herz.
- **Resonanz:** Das Mal breitet sich auf Verbündete in der Nähe aus. Sie werden schneller und heilen etwas.
- **Abklingzeit:** 14 s.

## Eigener Aufstieg und Absturz ohne Waffe

Ohne Waffe steigt jede Atmung auf ihre eigene Art auf (Aufladen hoch):

| Atmung | Aufstieg |
| --- | --- |
| Wasser | WASSERRAD: rollt als Wasserrad nach vorn, 2 Treffer |
| Wind | hoher Wirbel, schleudert weit nach oben |
| Blume | Blütenkreis rundherum, 2 Treffer |
| Mond | stehende Sichelwand |
| Nebel | Salto mit 3 Schnitten |
| Bestie | 2 Klauenhiebe |
| Schutz | Schutzkuppel rundherum, trifft auch hinten |
| Liebe / Insekt | Vorstoß mit 3 Treffern |
| Klang | Klangring rundherum, 3 Treffer |

Der Absturz (Sprung + Angriff nach unten):

- Beim Fallen zieht ein Kometenschweif in der Farbe der Atmung hinter der Figur her. Die graue Säule bei Stein ist weg.
- Bestie, Liebe, Klang und Insekt schneiden schon im Fall rundherum.
- Bei der Landung:
  - Mond: Sicheln fliegen in alle Richtungen.
  - Nebel und Sonne: blenden (kurzes Einfrieren).
  - Wasser: Fontänen, die nass machen.
  - Stein: Felsspitzen im Ring.
  - Sonne: Lichtsäulen.

## Sonne: Licht statt nur Feuer

Die Sonne blendet. Die Sonnenspur (Sprint-Angriff) verbrennt und friert kurz ein. Beim Start und beim Mal erscheint der goldene Strahlenkranz.

## Waffen-Infusion → kurze Atmung

Konstrukt + Element (Waffen-Infusion) startet beim Spieler zusätzlich eine kurze Atmung von höchstens 8 s:

| Infusion | Atmung |
| --- | --- |
| Flammenklinge | Flamme |
| Frostklinge | Eis |
| Sturmklinge | Donner |
| Giftklinge | Insekt |
| Blutklinge | Mond |
| Reißklinge | Bestie |
