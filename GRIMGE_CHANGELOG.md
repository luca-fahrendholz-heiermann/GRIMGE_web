# GRIMGE – Changelog

Neueste Einträge oben. Details stehen in den Commit-Nachrichten (`git log`).

## 20. Nov 2026 – Kronenkrieg: Feedback-Liste, Teil 2 — Gegenstände, Beutel, Walzen-Fenster

- Beute fällt als einzelne Gegenstände auf den Boden, jeder mit eigenem Pixel-Icon (Münzen, Holz, Stein, Stahlbarren, Obsidian, Elementstein in seiner Farbe, Waffe, Heil-/Manatrank, Runenrolle); sie hüpfen heraus und werden durch Darüberlaufen eingesammelt (Truhen, besiegte Gegner, Kreaturen).
- Voller Beutel: es wird nur genommen, was passt, der Rest bleibt liegen (mit Hinweis). Gold, Tränke und Runen passen immer.
- Beutel-Menü (Knopf „BEUTEL“ oder Taste I): zeigt den Inhalt mit Icons; einzelne Stücke oder ganze Stapel lassen sich gezielt ablegen, um Platz zu machen.
- Ausbilden mit Walzen: ein 3×3-Walzenfenster dreht sich sichtbar, hält Spalte für Spalte an, leuchtet die Gewinnlinien auf und nennt den Bonus.
- Rechte Bildschirmspalte neu geordnet (Tränke, Beutel, Burg-Knopf, Burg-Menü unter der Anzeige); Münzen ferner Kämpfe verschwinden nach 3 Minuten.

## 19. Nov 2026 – Kronenkrieg: Feedback-Liste, Teil 1 (Rückmeldung des Nutzers, PDF)

- Blocken hält Zauber auf: wer zum Zauber hin blockt, schützt die Verbündeten hinter sich (gleiche Tiefe, weiter vom Zaubernden weg) — in allen Modi.
- Hauptburg-Bau: Baustoffe lassen sich in Teilen einzahlen (z. B. 2/30 Holz verbaut), der Beutel wird sofort frei.
- Das Burg-Menü öffnet nur noch auf Wunsch: Knopf am Rand oder Taste F.
- Gefallen: Mitte des Bildes zeigt die Rückkehr-Zeit (solange die Hauptburg steht und bis Minute 20) bzw. dass keine Rückkehr mehr möglich ist. Die Runde endet absichtlich nicht beim Tod — die verlorene Beute ist die Strafe; erst ohne Hauptburg ist der Tod endgültig.
- Häuser: die Rückwand wird nie mehr vor der Figur auf der Galerie gezeichnet; Häuser stehen nicht mehr am hinteren Rand, so ist die Treppe immer erreichbar.

## 19. Nov 2026 – Kronenkrieg: Banditen patrouillieren und greifen erst aus der Nähe an (Rückmeldung des Nutzers)

- Wachen an Burgen, Lagern und Gefangenenlagern gehen langsam ihre Runde um den Posten, Patrouillen ziehen ihre Wege. Sie bemerken dich erst aus der Nähe (etwa 230–260 px) oder wenn du sie triffst, alarmieren dann ihre Kameraden am selben Posten, verfolgen dich nur bis gut 500 px vom Posten und kehren dann zurück. Das gilt auch für Kreaturen und die Besatzungen der Rivalen; dein eigener Trupp kämpft weiter in deiner Nähe.

## 19. Nov 2026 – Kronenkrieg: Häuser, ruhiger Start, einzigartige Runen (Rückmeldung des Nutzers)

- Häuser sind feste Dinge der Welt: niemand läuft mehr durch sie hindurch (Spieler, Einheiten, Rivalen gleiten an den Wänden entlang); hinein geht es nur durch die Tür.
- Innen deutlich breiter und höher als von außen; die Treppe steht frei von der Wand (mit Geländer) und lässt sich hinauflaufen.
- Im Haus ist man geschützt: Gegner kommen nicht mehr von der Seite herein, sie müssen zur Tür (Einheiten und Rivalen-Champions laufen sie gezielt an) und stehen dann mit im Haus; der eigene Trupp in der Nähe kommt mit hinein.
- Ruhiger Start: Einheiten greifen nur noch in der Nähe ihres Postens, ihres Weges oder ihres Anführers an (vorher stürmte jede Wache im Umkreis auf dich los); Banditen-Patrouillen meiden die Hauptburgen.
- Spezialrunen gibt es nur einmal im Deck, Element-Runen höchstens zweimal; eine Truhe gibt statt einer Rune, die du schon hast, eine andere ihrer Art oder Gold.

## 19. Nov 2026 – Kronenkrieg: Abgleich mit simulierten Runden

- Ganze Runden simuliert und ausgewertet. Gefunden und behoben: Rivalen blieben auf der großen Hauptebene ab Minute 1–5 an Gefangenenlagern und Burgen hängen (sie warteten auf einen echten Kampf, den ihr Champion nie führt) — Kämpfe um Burgen und Lager werden jetzt immer aufgelöst, ein Trupp in der Nähe kämpft zusätzlich echt; vorbeiziehende Rivalen-Trupps „belagerten“ die eigene Hauptburg nach 2 Minuten — als Belagerer zählen nur der eigene Trupp und Rivalen, deren Auftrag genau diese Burg ist.
- Rivalen wachsen langsamer (Erfahrung ×0,55, Kampfkraft je Stufe kleiner): Stufe 8–10 um Minute 15 statt Stufe 10 nach 5 Minuten.
- Ohne Spieler-Eingriff hält eine Runde jetzt bis zur Grimmflut (Hauptburgen fallen ab Minute 19 in der Flut).

## 19. Nov 2026 – Kronenkrieg: Transformationen je Weg

- Die Fokus-Transformation aus Krönung II folgt jetzt dem gewählten Weg: ELEMENT — Übergang und Aura in den Farben des Elements, dazu für die ganze Dauer die Klinge des Elements (Feuer: Flammenklinge, Eis/Wasser: Frostklinge, Blitz/Wind: Sturmklinge, Natur/Schatten: Giftklinge …); KLASSE — goldene Erweckung der Klassenwaffe mit 30 % mehr Kraft; PRIMAL — die Verschmelzung mit dem eigenen Primal (seine Bindungsform je Stufe).

## 19. Nov 2026 – Kronenkrieg: mehrere Rivalen gleichzeitig

- Stehen mehrere Rivalen in deiner Nähe, kämpfen bis zu drei gleichzeitig als echte Gegner (je eine eigene Champion-KI); alle sind für dich und deine Einheiten Ziele, ihre Trupps folgen ihnen, jeder Sieg zählt.

## 19. Nov 2026 – Kronenkrieg: begehbare Häuser, Tränke von Hand

- Häuser sind von außen geschlossen (jetzt groß genug zum Hineingehen). An der Tür nach hinten laufen führt hinein: die Vorderwand fällt für die Sicht weg, man sieht Rückwand, Dielen, Laterne, und ab zwei Etagen eine Holztreppe zu einer Galerie (die Treppen- und Galerie-Flächen des Spiels). Jede Etage hat eine Truhe (davor stehen öffnet sie); manche Häuser verbergen Banditen. Nach vorn hinauslaufen verlässt das Haus; ein Haus davor wird solange durchsichtig.
- Tränke werden jetzt von Hand getrunken: Knöpfe ♥ / ✦ am rechten Rand oder Tasten 1 / 2; AUTO schaltet das selbständige Trinken bei wenig Leben / Mana ein.

## 19. Nov 2026 – Kronenkrieg: eine riesige Ebene mit Sektionen, Schächte und Aufzüge (Rückmeldung des Nutzers)

- Statt drei gleich breiter Streifen, zwischen denen man am Rand einfach wechselte, gibt es jetzt EINE riesige 2,5D-Hauptebene (doppelt so breit, tiefer im Bild), auf der die vier Hauptburgen und der Großteil der Orte verteilt sind. Am Rand ist eine feste Grenze.
- Darüber zwei Hochebenen, darunter zwei Tiefen als begrenzte Sektionen (eigene Gebiete, Kreaturen-Reviere, die reine Quelle, bessere Beute). Wechsel nur an SCHÄCHTEN (hineinlaufen = hinab) und AUFZÜGEN (auf der Plattform stehen = hinauf), je ein Paar an beiden Enden jeder Sektion; die Übergänge liegen nie an einer Hauptburg.
- Jede Ebene hat ihre Stimmung: Dämmerungshimmel über den Hochebenen, Nacht über der Hauptebene, eine Höhlendecke mit Stalaktiten in der Tiefe; außerhalb einer Sektion Fels. Die Übersichtskarte zeigt Sektionen nur, wo es sie gibt, mit Pfeilen für Schacht und Aufzug.
- Kleine Orte (Häuser, Goldadern, Schreine) dürfen hintereinander in der Tiefe stehen; Bots, Patrouillen und Rückkehr folgen den neuen Ebenen; im 2 gegen 2 ist der Verbündete der Nachbar auf der Ebene.

## 19. Nov 2026 – Kronenkrieg: Kreaturen reiten, Pferd

- Gezähmte und geschlüpfte Kreaturen tragen ihren Helden ab Rundenstufe 5 (Aufsteigen wie bei anderen Reittieren, Reitangriffe je nach Art; flinke Kreaturen sind schneller, ein Glutkoloss langsamer).
- Der Stall gibt jetzt ein echtes Pferd (eigenes Pixel-Pferd mit Sattel und Trab) statt der geliehenen Reitbestie, ohne Beschwörungszirkel.

## 19. Nov 2026 – Kronenkrieg: Grafik

- Haupt- und Zwischenburgen sind jetzt die gemalten Burgtürme aus Castle Siege, je nach Gebiet im passenden Stil (Vulkan, Gletscher, Wasserfall, Sturm, Canyon, Ruinen, Arkan, Regen), blau für die eigene Seite und Verbündete, rot sonst, verbunden durch eine gezeichnete Mauer mit Tor; die Hauptburg-Mauer zeigt ihre Stufe (Holz, Stein, Stahl, Obsidian).
- Gefangenenlager (Käfige, Fackeln), Banditenlager (Zelte, Feuerschale, Banner), Wegschrein (Runensäule), Prüfung (Ritterstatue mit Lichtring) und Kreaturen-Höhle (Felsbogen, Dämonenstatue, Trümmer) nutzen die gemalten Requisiten.
- Fachwerkhaus (1–3 Etagen), Stall, Zelte, Goldader und Quellbecken (in der Farbe des Elements) sind neue Pixel-Sprites mit Umriss, Schatten und Lichtkante.
- Jedes Gebiet hat seine Landschaft (Kiefern, verschneite Kiefern, Eichen, tote Bäume, Felsen, Kristalle, Schilf, Grasbüschel, Lavapfützen); der Boden hat weiche Flecken und Sprenkel, die Gebiete gehen gerastert ineinander über.
- Einheiten tragen die gemalten Figuren: eigene und verbündete die Wache, Banditen Ritter / Räuber / Hexer, Rivalen die Leere-Krieger; Bogenschützen und Magier je nach Klasse.
- Neue Bilder per KI waren nicht möglich: das Gratis-Guthaben (1,75 Credits) reicht im kostenlosen Plan für kein Modell mehr; es wurde nichts gekauft.

## 19. Nov 2026 – Kronenkrieg: Dauertest einer ganzen Runde

- Neuer Test: eine ganze Runde im echten Spiel-Loop bis zum Ende ohne Fehler (rund 20 Minuten Spielzeit).
- Fix (durch den Dauertest gefunden): Banditen und Kreaturen „belagerten“ Hauptburgen schon in den ersten Sekunden (Wachen eines nahen Gefangenenlagers, vorbeiziehende Patrouillen). Jetzt belagern nur Rivalen; bewachte Gefangenenlager halten Abstand zu den Startplätzen.

## 19. Nov 2026 – Kronenkrieg: Jagd auf Ei-Träger

- Ein starker Rivale lässt seinen Plan fallen und jagt dich, solange du ein Ei trägst oder eine Krönungs-Prüfung bestreitest; Banditen-Patrouillen in der Nähe wenden sich gegen einen Ei-Träger. Der Ei-Lauf ist damit wirklich gefährlich.

## 19. Nov 2026 – Kronenkrieg: 2 gegen 2

- Auf der Kronenkrieg-Karte im Hub: JEDER GEGEN JEDEN oder 2 GEGEN 2. Im 2 gegen 2 ist der Rivale, dessen Hauptburg im selben Streifen liegt, dein Verbündeter (gleiches Team: eure Einheiten kämpfen nie gegeneinander), die beiden anderen sind ein Team.
- Verbündete erobern keine Burgen voneinander, belagern nur gegnerische Hauptburgen, sehen sich immer auf der Übersichtskarte; dein Verbündeter wird nie zum gegnerischen Champion. Ihr gewinnt gemeinsam, wenn das andere Team keine Krone mehr hat.

## 19. Nov 2026 – Kronenkrieg, Meilenstein 6: Krönung

- Auf Stufe 8 fragt das Spiel: Klasse (Bankai) oder eines der drei Elemente, die du in der Runde am meisten gezeichnet hast (dessen Arcane State). Auf Stufe 10 noch einmal: Klasse, Element oder Primal (Fokus-Transformation). „Später wählen“ ist möglich.
- Die Wahl lässt eine Prüfung auf der Karte erscheinen (Obelisk mit Wächter, für alle sichtbar). Der Sieg gibt die Karte seelengebunden (fällt beim Tod nicht) bzw. schaltet die Fokus-Transformation frei; vorher ist sie im Kronenkrieg gesperrt.
- Im Deck steht nur ein Arcane State oder Bankai; ein erkämpfter kommt sonst in die Reserve und lässt sich im Hauptburg-Menü tauschen.

## 19. Nov 2026 – Kronenkrieg, Meilenstein 5: Kreaturen, Eier, Reittiere

- Epische Kreaturen in ihren Revieren (Glutkoloss, Sturmwolf, Flutschlange, Frostwolf je nach Element). Besiegt lassen sie genau eines fallen: reiche Beute, eine seltene Rune oder ihr Ei.
- Neue Rune BÄNDIGUNG (Bestia + Bestia), in allen Modi: eine gegnerische Beschwörung unter halbem Leben wechselt die Seite; im Kronenkrieg schließt sich eine geschwächte epische Kreatur deiner Armee an (eine zur Zeit).
- Eier: durch Darüberlaufen aufheben (schwer: langsamer, auf der Übersichtskarte für alle sichtbar, ein harter Treffer lässt es fallen), in einer eigenen Burg ablegen (still stehen) und im Burg-Menü wieder mitnehmen. Es schlüpft nur an einer Quelle seines Elements (10 s); das Ei pulsiert stärker, je näher die Quelle ist, und die Quelle antwortet mit einem Lichtstrahl. Brut-Walzen bestimmen Größe (Kümmerling / normal / prächtig), Wesen (flink / zäh / wild) und ein mögliches Zusatzelement, selten leuchtend; Elementsteine, eine reine Quelle und die Zeichennote verbessern die Chancen.
- Stall: ein Reittier ab Stufe 3 (vorerst die vorhandene Reitbestie). Der Primal ist immer dabei, wächst mit der Rundenstufe (Stufe 2 ab 5 und reitbar, Stufe 3 ab 8; ein Drache fliegt ab 8) und wird nach einem Sturz nur in der Hauptburg wiederbelebt.
- Fix: das Reittier aus dem Stall wurde ohne Qualitätsprofil beschworen (Absturz verhindert).

## 19. Nov 2026 – Kronenkrieg, Meilenstein 4: Rivalen, Hauptburgen, Grimmflut, Sieg

- Drei Bot-Rivalen spielen dieselbe Karte: sie plündern, befreien Gefangene, bilden in ihren Burgen aus, erobern Zwischenburgen (auch deine) und belagern spät die schwächste Hauptburg. Steht ein Rivale in deinem Streifen, kämpft er als echter Gegner (die Champion-KI) mit seinem Trupp; besiegt lässt er Gold und Beute fallen und kehrt später an seiner Hauptburg zurück. Außerhalb deines Streifens laufen Kämpfe als Simulation.
- Hauptburg: vier Stufen (Holz 30, Stein 40, Stahl 30, Obsidian 20) mit mehr Leben; ab Stein schießt ein Turm auf Angreifer; Obsidian hält der Grimmflut länger stand. Element-Resistenzen aus Elementsteinen (3 / 6 / 10 / 15, höchstens eine Stufe je Burgstufe) senken den Schaden von Einheiten dieses Elements an der Besatzung. Belagerung: ohne Verteidiger verliert die Burg Leben, bei 0 fällt sie — dann keine Rückkehr mehr.
- Grimmflut ab Minute 16 von den Rändern zur Mitte (Schaden für alles darin, Burgen verfallen); ab Minute 20 keine Rückkehr; spätestens bei Minute 25 gewinnt die größte Armee. Sonst gewinnt die letzte Seite mit lebendem Helden oder stehender Hauptburg.
- Rivalen erscheinen auf der Übersichtskarte, wo sie aufgedeckt ist.

## 19. Nov 2026 – Kronenkrieg, Meilenstein 3: Armee

- Einheiten aus Klasse und Element (8 Klassen der Zwischenburgen × 13 Elemente): eigene Werte je Klasse, ihre Treffer lösen die Statuseffekte ihres Elements aus; Wimpel in der Farbe der Seite, Edelstein fürs Element, Sterne für die Stufe.
- Abtrünnige: Besatzungen in Zwischenburgen, Banditenlagern und bei Gefangenenlagern; Patrouillen ziehen aus den Lagern über die Straßen und werden mit der Zeit stärker. Besiegte Gegner geben Gold und Erfahrung.
- Gefangene befreien (Wachen besiegen, Käfig berühren): sie folgen als Trupp. Der Trupp geht beim Streifenwechsel mit.
- Zwischenburg erobern: Besatzung besiegen, 3 s in der Burg stehen. Burg-Menü am rechten Rand: Ausbilden aus Gold + Waffe der Burg + Elementstein, optional mit Walzen-Dreh (Bonus Veteran / Doppelelement / Elite, die letzte Zeichennote verschiebt die Chancen), Stationieren ▲ und Mitnehmen ▼, Verschmelzen von drei gleichen zu einer stärkeren Stufe. Die Übersichtskarte zeigt die Zahl der Stationierten an eigenen Burgen.
- Nur Einheiten im aktuellen Streifen sind lebendig, der Rest läuft als Liste weiter (Leistung).

## 19. Nov 2026 – Schwert & Schild: Schwert vorne in der Hand (Rückmeldung des Nutzers)

- Das Schwert zeigte nach hinten und lag hinter dem Körper. Jetzt hält die vordere Hand das Schwert, vor dem Körper gezeichnet und schräg nach vorn oben; der Schild sitzt am hinteren Arm hinter dem Körper und kommt beim Blocken und beim Schildstoß nach vorn. Gilt auch für Streitkolben & Schild. Im Browser in beiden Blickrichtungen und beim Blocken geprüft.

## 19. Nov 2026 – Kronenkrieg, Meilenstein 2: Beute und Rundenstufe

- Gebäude durchsuchen (an der Tür stehen, Ring füllt sich): je Etage eine Truhe mit Gold, Baustoffen (Holz, Stein, Stahl, Obsidian), Elementsteinen des Gebiets, Waffen, Tränken und manchmal einer Rune. Was eine Truhe enthalten kann, hängt von Spielzeit und Ort ab (Mitte und weit weg von den Hauptburgen = besser).
- Goldadern abbauen (mit Abklingzeit), Wegschreine decken eine große Gegend auf, entdeckte Orte geben etwas Erfahrung.
- Rundenstufe 1–10 mit Erfahrung; Deckplätze 4 → 8; Runen nach Stufe: Beschwörungen/Haltungen 3, Atmung 4, Mehrfach 5, Sphären 6, Arcane State 8. Zu früh gefundene Runen sind versiegelt, belegen aber einen Deckplatz, und brechen beim Aufstieg auf. Fusion ab Stufe 2, Dreier-Fusion ab 6.
- Rucksack mit 40 Plätzen, an der Hauptburg wird automatisch eingelagert; Tränke werden bei wenig Leben/Mana selbst getrunken.
- Tod: Gold, Rucksack und alle Runen der Runde fallen als Beutehaufen; Rückkehr an der Hauptburg nach wachsender Wartezeit. Anzeige unter der Übersichtskarte.

## 19. Nov 2026 – Kronenkrieg, Meilenstein 1: die Karte (Konzept GRIMGE_KRONENKRIEG.md)

- Neuer Modus KRONENKRIEG (Karte auf der Spielmodus-Seite im Hub).
- Jede Runde eine neue Karte aus Bausteinen: 4 Hauptburgen, 12 Zwischenburgen (je eine Kämpferklasse), Gebäude, Goldadern, Gefangenenlager, 14 Quellen (eine reine in der Mitte), Kreaturen-Reviere, Banditenlager, Ställe, Wegschreine; 13 Element-Gebiete. Fairness-Prüfung für jede Hauptburg, nichts Gutes geballt an einem Start (60 Karten im Test).
- Die Welt besteht aus breiten Streifen (je eine 2,5D-Bühne): gegen den hinteren oder vorderen Rand laufen führt in den Nachbarstreifen, die Kamera gleitet hinterher. Die Nachbarstreifen sind als gleicher Boden zu sehen, kein gemalter Hintergrund.
- Übersichtskarte oben rechts mit Nebel, der sich beim Erkunden aufdeckt.
- Noch Platzhalter-Grafik für Burgen und Orte; Beute, Armee, Bots folgen.

## 19. Nov 2026 – Spell-Galerie im Training (Wunsch des Nutzers)

- Neue Karte SPELL-GALERIE in der Trainings-Kartenauswahl (erste Karte): eine lange, seitlich scrollende Reihe. Klone deiner Figur stehen hintereinander, jeder mit einem Dummy rechts daneben, abwechselnd in zwei Tiefen, und jeder Klon zaubert immer wieder einen Zauber des Spiels auf seinen Dummy.
- 201 Stationen, eine je Zauber (Basisrunen, Kombinationen, Spezialrunen, Arcane States), über jedem Klon stehen Name, Nummer und Runen. Die Kamera folgt beim Entlanglaufen.
- Fix (Rückmeldung: Karte da, aber nicht wählbar, schwarzes Bild): der Wechsel klappt jetzt aus dem laufenden Training (vorher lehnte das Spiel den Moduswechsel ab, solange ein Match läuft), die Karte hat ein eigenes Vorschaubild, und in der Galerie bleibt der MAP-Knopf, um zu einer Trainingskarte zurückzukehren.
- Nur die Stationen in deiner Nähe leben (Klon und Dummy entstehen beim Herankommen und verschwinden hinter dir), damit es flüssig bleibt. Kein Gegner, keine Uhr, keine Belohnungen; zurück über das Menü.

## 18. Nov 2026 – Arena: längere Duelle, Transformation slotten, Gegner transformiert (Rückmeldung des Nutzers)

- Duelle halten länger: der Runenschild reißt langsamer (0,38 statt 0,6 je Schaden), der Bannrand bricht erst bei härterem Wurf (430 statt 380 px/s), 4 statt 3 Seelenfunken.
- Das Transformations-Relikt zündet nicht mehr sofort: der Spieler bekommt die Transformation als Runenkarte (RISSWILD oder ARKENGESTELL), slottet sie und aktiviert sie selbst. Über dem Relikt steht ihr Name.
- Der Gegner darf sich verwandeln: holt er das Relikt, behält er es kurz und transformiert, sobald er nah am Spieler ist. Risswild: härtere Schläge, Arkengestell: Panzerung; die Form ist hinter ihm sichtbar (vorher bewirkte das Relikt beim Gegner praktisch nichts).

## 18. Nov 2026 – Beschwörung langsamer (Rückmeldung des Nutzers)

- Die Kreatur steigt jetzt in ca. 1,7 s langsam aus dem Zauberzirkel (erst schließt sich der Ring, dann taucht sie auf, an der Bodenlinie abgeschnitten) und ist währenddessen unverwundbar.
- Der Beschwörer hält die Hand so lange am Boden, bis das Wesen heraufgestiegen ist (Pose 2 s, die Schlag-Pose wird gehalten statt nach einer halben Sekunde aufzustehen).
- Pose nach einer Kniestand-Referenz (drei Auflagepunkte) neu gebaut (Rückmeldung: der Körper ging nach hinten): hinteres Knie und Schienbein am Boden, vorderer Fuß steht, Oberkörper 34° nach vorn (in diesem Rig neigt ein negativer Rumpfwinkel nach vorn), Kopf zum Zirkel, der vordere Arm greift schräg nach vorn unten zum Boden; der Körper sinkt dadurch tiefer; im Browser gerendert geprüft.
- Der Zirkel liegt nicht mehr unter dem Beschwörer (Rückmeldung: zu nah): das Wesen erscheint einen Zirkel-Radius plus 30 px vor ihm statt 34 px.
- Der Zirkel glüht entsprechend länger (2,8 s). Gilt für alle Beschwörungen, auch Elementartor und Gegner.

## 17. Nov 2026 – Fokus nur aus Kämpfen gegen Gegner (Rückmeldung des Nutzers)

- Nahkampftreffer auf Kisten, Fässer, Szenenobjekte und Wände füllen den Fokus nicht mehr; Treffer, Trefferstopp und Rückstoß bleiben. Nur ein Treffer auf einen lebenden Gegner
  (auch Türme, Burg und der Trainingsdummy) bringt Fokus.

## 17. Nov 2026 – Fehler „t.freeze is not a function“ im Siege-Modus (Diagnose-Anzeige des Nutzers)

- Das Wasserfass merkte sich nach Frost-Einwirkung ein Flag mit dem Namen `freeze` (true). Jeder Eiszauber, der es danach traf, rief `t.freeze(...)` auf und warf einen Fehler
  (die Anzeige „Menü-Sprung“ kam vom abgefangenen Frame-Fehler). Das Flag heißt jetzt `freezeNow`; ein Test sichert ab, dass kein Objekt ein Nicht-Funktions-`freeze` hat.

## 17. Nov 2026 – Training ist eine Spielwiese (Rückmeldung des Nutzers)

- Der Klassen-Knopf im Training (und die Taste V) schrieb die ausprobierte Waffe **dauerhaft ins Profil** und überschrieb damit die im Hub gewählte Klasse: man hatte danach in
  jedem Modus „das Setup vom Training“. Jetzt wechselt nur die Waffe der laufenden Sitzung; Training startet mit der Klasse aus dem Hub, und der nächste Match trägt sie wieder.
- Geblieben: Die Klasse wird in der Charaktererstellung, in der Garderobe und auf der Klassenseite gewählt und gespeichert.

## 17. Nov 2026 – Rückmeldungen: Geheimraum-Pfeil, ruhigerer Fokus, Beschwörungszirkel (Nutzer)

- **Geheimraum:** Im Geheimraum erscheint kein „GO“-Pfeil nach rechts mehr (dort ging es nicht weiter). Ist der Boss besiegt, zeigt ein Pfeil „AUS“ zum
  Ausgangsportal (nach links, wenn man am hinteren Ende steht) und verschwindet neben dem Portal.
- **Fokus:** Aus Nahkampftreffern füllt er sich etwa halb so schnell (höchstens 8 statt 16 je Treffer). Die Aura, der Ring und der Text „zum Verwandeln drücken“ sind weg:
  ab 25 % heben sich nur ein paar Haarsträhnen vom Kopf, mehr und länger je voller; bei vollem Fokus nur noch die kurze Meldung „FOKUS VOLL“.
- **Arcane State:** Aura und Effekte um 28 % zurückgenommen, das Namensschild über dem Kopf entfällt (die Leiste mit der Restzeit bleibt).
- **Beschwörungen:** Unter jeder beschworenen Kreatur erscheint ein **Beschwörungszirkel** (dunkle Siegellinien laufen von der Hand des Zauberers über den Boden, schließen
  sich zu Ring und Stern, weiße Funken springen an den Ecken auf, der Ring leuchtet in der Farbe des Wesens und verblasst nach etwa 2 s). Der Zauberer geht dabei in die
  **Hocke und legt die Hand auf den Boden** (neuer Rig-Clip „summon“); wer sich bewegt oder handelt, beendet die Pose. Gilt auch für das Elementartor und die KI.
- Grenze der Pose: Die Figur kann nicht tiefer sinken, die Hand erreicht den Boden nicht ganz; ein echter Hand-auf-Boden-Frame bräuchte eine gezeichnete Animation.

## 17. Nov 2026 – Elementartor: Element hineinschießen (Idee des Nutzers)

- Das Tor **bleibt nach dem Öffnen etwa 2,8 s offen** und zeigt „ELEMENT HINEINSCHIESSEN“. Ein Elementzauber (Feuerball, Eisgeschoss …), der hindurchfliegt, wird
  **geschluckt**, das Tor nimmt seine Farbe an, und wenn der Begleiter dieses Elements heraustritt, **verlässt der Zauber das Tor mit ihm wieder**
  (etwas schneller und 25 % stärker). Schießt niemand etwas hinein, öffnet sich das Tor am Ende mit dem zuletzt gewirkten Element (die KI macht immer das).
- **Auch ein Zauber des Gegners** lädt das offene Tor: das Wesen kommt in dem Element, das hineinflog, und der Zauber wird zum Zauber des Torbesitzers und fliegt
  auf den Gegner zurück. Strahlen, Flächen und Wände zählen nicht, nur fliegende Elementgeschosse.
- Bekannte Einschränkung: Der Glut-Familiar benutzt noch das Bild des Geisterwolfs (blau); nur Farbe und Partikel sind feuerfarben.

## 17. Nov 2026 – Dungeon-Zweige, keine Permadeath (Vorgabe des Nutzers)

- **Optionale Zweige als Daten** (`DUNGEON_BRANCHES` in `dungeon_secrets.js`): Raum 1 versteckt einen brüchigen Boden (Sturzflug), der in die neue
  **Glutkammer** führt. Welche **Variante** dahinter wartet, entscheidet ein Seed pro Lauf — ein anderer Versuch kann einen anderen Boss oder ein
  anderes Ereignis bringen: **Glut-Brute** (Boss, Feuer ×0,5, Wasser ×1,5, Truhe + später Runenfund) oder **Kammer** (kein Kampf: ein Gefangener
  als Begleiter für diesen Versuch und eine Truhe). Der Weg durch drei Räume und den Boss ist unverändert.
- Gerettete Mitstreiter gelten nur für den aktuellen Versuch: ein neuer Lauf beginnt auf Stufe 0 ohne Deck, ohne Begleiter und mit neuem Seed.
- **Keine Permadeath belegt:** Nach einer Niederlage bleiben Charakter, Klassen, Runen und Masteries; die Mission zählt nicht als erledigt, startet
  sauber neu, und gewonnene Missionen bleiben wiederholbar.
- Noch nicht: weitere Zweige in Raum 2 und 3, mehrere Reittiere und scripted Verbündete in den Großschlachten, Schwierigkeit älterer Level.

## 17. Nov 2026 – Bankai-Bodeneinschlag (Vorgabe des Nutzers)

- Der voll geladene **Nach-unten-Zug** jedes Bankai wird zum großen Bodeneinschlag (`bankai_impact.js`); die anderen fünf Techniken bleiben.
  Name: Klassen-Requisit · Element, z. B. „STABRAMME · FEUER“, „ERDBRECHER · ERDE“, „SCHILDRING · EIS“.
- **Ablauf:** 0–0,35 s Waffe wird in den Boden getrieben (Figur gesperrt) · 0,35–0,65 s Material wird eingezogen · 0,65 s Haupteruption: ein
  Haupttreffer und ein Haupt-Hitstop, gerichtetes Kamerabeben, tiefer Schlag · 0,95–1,35 s expandierender Ring (nur Status, kein Schaden) ·
  bis 2,5 s elementare Nachwirkung (Tickzeiten ohne Hitstop).
- **Klasse = Requisit:** Stab/Siegel (Stab senkrecht in den Boden), Speerkrone, Schildring, Axt/Hammer, Schwert + Klingenwirbel (auch Fallback),
  Sternenpfeil, Fäuste, Siegel, Sense, Dolchfächer. **Element = Material:** Feuer (Säulen, Brandboden), Erde (Platten, Schleudern), Wasser (Wirbel,
  Nässe), Eis (Kristalle, Einfrieren), Blitz (Bodenblitze, Leitung über Pfützen), Wind (Wirbel, starker Auftrieb), Natur (Wurzeln, Heilung),
  Licht (Siegel, kurzer Schild), Schatten/Leere (Einsturz, dann Riss), Bestie (Klauen, Blutung), Konstrukt (Platten), sonst arkaner Stoß.
- **Elementquelle:** die zuletzt während dieses Bankai gewirkte normale Elementrune, sonst das Startelement des Spielers, sonst arkan.
- Kamera: gerichtetes Beben (neuer dritter Parameter an `shakeCamera`); ein Zoom-Impuls wurde nicht eingebaut, weil die Kamera dafür keine saubere
  Schnittstelle hat.

## 17. Nov 2026 – Vier kinematische Zauber (Vorgabe des Nutzers)

- Neue Spezialrunen S96–S99, jede mit eigener Aufladung, Einschlag und Nachwirkung; Stufe 3, episch, Arena-Wert 3 Punkte;
  Daten in `cinematic_spells_data.js`, Wirkung in `cinematic_spells.js`, Glyphen in `rune_guides.js`.
  - **Infernoausbruch** (48 Mana): 0,5 s glühender, reißender Boden; weißer Kern bricht aus; ein Haupttreffer mit Rückstoß und
    Brennen, ein Haupt-Hitstop, kreisförmige Feuerfront, danach Rauch, Glut und brennender Boden; Fässer und Kisten fangen Feuer.
  - **Arkanstrudel** (46 Mana): schwebender violetter Kern, Ringe in verschiedenen Tempi, Blitze; zieht Gegner zur Mitte und hält sie
    nahe dem Kern fast still; die Entladung schleudert nach außen (ein Treffer); Felsbrocken rollen über ihre eigene Reaktion weg.
  - **Grünes Erwachen** (44 Mana): Energieadern, Wurzeln und Ranken (Gegner im Kreis werden verwurzelt, ein Treffer), grüner Puls mit
    Blättern und Sporen, danach ein lebendes Feld: heilt Verbündete, verlangsamt Gegner, lässt Setzlinge wachsen.
  - **Elementartor** (42 Mana): Ring, wandernde Zeichen, drehende Fläche, Lichtpuls — beschwört je nach Element: Wasser/Eis Geisterwolf,
    Blitz/Wind Sturmwolf, Schatten/Leere Leerenspinne, Erde/Konstrukt Runengolem, Natur/Bestie Bestienfamiliar, Feuer Glut-Familiar,
    Licht/Schutz Wächter, ohne Element ein Arkan-Familiar. Ein Treffer vor dem Öffnen bricht den Zauber ab. Kein Teleport.
- Das Element des Zauberers ist die zuletzt gewirkte Elementrune (neu am Zauber-System gemerkt), sonst das Startelement des Spielers.
- Testanpassung: 99 statt 95 Spezialrunen-Glyphen, Mana-Spanne bis 48.
- Hinweis: Die KI-Tests „Schatten bindet den Zauberer“ und „zweite Stufe“ schlugen einmal in einem Lauf fehl und liefen sonst durch
  (zeitabhängig, nicht durch diese Änderung verursacht, aber nicht untersucht).

## 16. Nov 2026 – Spezifikation „Fortschritt, Modi, Arena-Runen, Einschlag-Zauber“: Klassen und Arena (Vorgabe des Nutzers)

- **Klassen:** Fünf Startklassen (Guardian, Berserker, Bladedancer, Ranger, Arcanist); die anderen 13 nach Profilstufe
  (Lancer 2, Monk 3, Ronin 4, Shadow 5, Reaper 7, Runeblade 8, Oracle 9, Occultist 10, Resonant 12, Spiritbound 14,
  Beastborn 16, Trickster 18, Fateweaver 20) oder früh über Boss-, Secret- und Missionsbelohnungen (Mission 3 öffnet den
  Occultist). Das Profil speichert die frühen Freischaltungen; alte Spielstände behalten ihre gewählte Klasse. Gesperrte
  Klassen zeigen ihre Bedingung und sind nicht wählbar; der Test-Schalter im Runen-Tresor öffnet alle.
- **Arena-Runen nach neuen Regeln** (`arena_runes.js` rein, `arena_play.js` im Spiel):
  - Portfolio je Spieler: höchstens 6 verschiedene Runen und 12 Punkte (Element 1, taktisch/Falle 2, Spezial/Beschwörung 3,
    Sphäre 4, Arcane State 5; höchstens ein Arcane State). Auswahlbildschirm „ARENA-PORTFOLIO“ im Deck-Fenster, im Profil gespeichert.
  - Beide Portfolios bilden einen gemeinsamen Spawn-Pool; wählen beide dieselbe Rune, hat sie zwei Einträge. Gewichte nach
    Seltenheit (1,0 / 0,7 / 0,4 / 0,22 / 0,1).
  - Runen erscheinen aus zerstörten Kisten und Fässern und aus angekündigten Ereignissen in der Mitte (bevorzugt seltene
    Runen); bei zu langer Flaute kommt ein Ereignis früher. Beide Kämpfer können jede Rune aufnehmen.
  - Drei Slots je Kämpfer, beide starten leer. Bei vollen Slots ersetzt 0,35 s Stehen auf dem Relikt den markierten Slot
    (sonst den ältesten); die ersetzte Rune landet neutral. Neue und herausgeschlagene Relikte springen 0,5 s.
  - Einmalverwendung: ein bestätigter Zauber leert seinen Slot, eine Fusion alle beteiligten Runen; ein unterbrochener
    Zauber behält die Rune.
  - Voll geladener Heavy, Heavy-Konter und Guard Break schlagen höchstens eine Rune heraus (nie Leichte Treffer, DoT, Zauber);
    Sperre gegen Mehrfachtreffer. Der Gegner hat dafür einen angekündigten Heavy bekommen.
  - KO (verlorener Seelenfunke) leert alle Slots ohne Drop und ohne Geschenk an den Gegner.
  - Spieler und KI nutzen dieselben Regeln: kein Kartenbonus für den Spieler und keine drei Anwendungen für den Gegner mehr;
    die KI wirkt nur, was sie trägt, und verbraucht genau die Runen ihres Zaubers.
  - Zu Beginn liegen keine Relikte mehr herum.

## 14. Nov 2026 – Kampagne: viel längere Runden (Vorgabe des Nutzers)

- **Mission 1 (Dungeon):** drei Hallen statt einer – Treppenhalle, Halle mit Gefangenem, Elite-Halle.
- **Mission 2 (Verteidigung):** drei Angriffe statt einem (3, 4 und 5 Wellen, jeder mit eigenem Anführer); die Burg
  erholt sich zwischen den Angriffen um ein Viertel.
- **Mission 5 (Boss):** zwei Hallen der Garde vor dem Glutfürsten statt einer.
- Zeitvorgaben für den dritten Stern angepasst (7, 12 und 8 Minuten). Belohnungen unverändert.
- Nicht durchgespielt: Länge und Schwierigkeit der längeren Missionen sind ungeprüft.

## 14. Nov 2026 – iPhone: Spiel wurde nach einiger Zeit in den Hub neu geladen (Diagnose des Nutzers)

- **Ursache gemessen:** Das Spiel hielt schon im Hub 213 MB Grafikspeicher in 1562 Zeichenflächen (dazu zwei
  bildschirmgroße). iPhone-Safari lädt eine Seite neu, wenn ihre Zeichenflächen zu viel Speicher belegen – das
  erscheint als Navigation „back_forward“.
- **Jetzt 56 MB:** Die weiße Treffer- und die rote Schadens-Kopie jedes Figurenbilds entstehen erst, wenn sie
  gebraucht werden (vorher zwei Drittel des Speichers, meist nie gezeigt). Die Beschwörungs-Bilder lagen in
  Quellgröße (rund 1200 Pixel) vor und werden auf 512 Pixel Höhe gehalten.
- Auf Touch-Geräten ist die Auflösung der Zeichenfläche auf das Doppelte begrenzt (vorher 2,5-fach): ein Drittel
  weniger Pixel je Bild.
- **Basis:** In der Nahsicht reagiert auf Antippen nur noch die Station, an der die Figur steht. Vorher warf ein
  Finger auf einer entfernten Station (etwa beim Steuern) den Spieler in den Hub. In „Ganzer Raum“ bleibt jede
  Station antippbar.
- Nicht auf einem iPhone geprüft; die Messung lief im Browser im iPhone-Format.

## 13. Nov 2026 – Die Basis: Stufe mit Kollision, Vollbild-Zuschnitt, gleichmäßige Kamera (Screenshots und Video des Nutzers)

- **Unterkörper unter dem Rand – Ursache gefunden:** Auf breiten Handys zoomt die Einstellung „Vollbild“ die Bühne
  auf die volle Breite und schneidet oben und unten Zeilen ab (auf dem iPhone des Nutzers unten rund 13 %). Die
  Kamera der Basis rechnete mit der ganzen Bühne. Jetzt rahmt sie den Raum in den wirklich sichtbaren Zeilen; die
  Lauffläche reicht wieder bis ganz nach vorne (die Kürzung auf Tiefe 0,84 ist zurückgenommen).
- Bei wenig sichtbarer Höhe zoomt die Nahsicht nur so weit heran, dass der Boden von der Rückwand bis zur Vorderkante
  ins Bild passt – sonst müsste die Kamera bei jedem Schritt in die Tiefe wippen.
- **Stufe mit Kollision:** Von unten bleibt die Figur eine Körperbreite vor der Stufe stehen (auch im Sprung und beim
  Herunterfallen), oben steht sie nicht mehr über der Kante – wer weitergeht, fällt hinunter.
- **Ruckeln:** Die Kamera gleitet wieder ohne Pixel-Stufen. Das Einrasten auf ganze Pixel ließ bei Lauftempo das
  ganze Bild ungleichmäßig springen (1–3 Pixel je Bild); das war schlimmer als das frühere Zittern.

## 13. Nov 2026 – Die Basis: drei Fehler aus dem Spieltest (Rückmeldung des Nutzers)

- **Ruckelnder Hintergrund beim Laufen und Sprinten:** Die Kamera rastete auf Bildschirm-Pixeln ein, die Figur auf
  Welt-Pixeln – beide zitterten gegeneinander. Jetzt bewegt sich die Kamera in ganzen Welt-Pixeln wie die Figur und
  zieht straffer nach. Das Hallenbild wird beim Scrollen gefiltert (kein Pixel-Kriechen bei krummem Zoom), nur
  sichtbare Kacheln werden gezeichnet und das Licht der Rüstkammer ist einmalig eingerechnet statt pro Bild.
- **Schatten auf beiden Ebenen:** Schatten werden je Ebene an der Stufe abgeschnitten.
- **Unterkörper ganz vorne verdeckt:** Die Lauffläche endet etwas vor dem unteren Bildrand (Tiefe bis 0,84 statt
  0,94), damit die Beine nicht unter den Bildschirmrand oder eine System-Leiste geraten. Am PC war die Verdeckung
  nicht nachzustellen; die Ursache auf dem Handy ist nicht gesichert.

## 13. Nov 2026 – Die Basis: eine durchgehende Welt, Figur immer im Bild (Rückmeldung des Nutzers, Castle-Crashers-Video 1:37–1:42)

- **Nahtloser Übergang statt Tür:** Halle und Rüstkammer sind eine zusammenhängende Welt. Die Treppe am Ende der
  Halle führt auf eine erhöhte Ebene, und diese Ebene ist die Rüstkammer; die Kamera fährt einfach mit hoch und
  weiter. Von der Kante kann man wieder in die Halle hinunterspringen. Der Tür-Sprung ist entfernt.
- **Figur nie außerhalb des Bildes:** Die Kamera hält Kopf und Füße immer im Bild – auf der Treppe, auf der oberen
  Ebene und im Sprung.
- „Ganzer Raum“ zeigt den Raum, in dem die Figur steht, und schwenkt beim Wechsel.
- Vorgaben zu Mastery durch Nutzung (Waffenbuff-Stufen, Atmung, Transformation, Bankai, PvP-Balance) in Design-Bibel
  und Roadmap aufgenommen; noch nicht gebaut.

## 13. Nov 2026 – Die Basis: ruhige Kamera (Rückmeldung des Nutzers: beim Laufen im Zoom wird einem schwummrig)

- Die Nahsicht wippt nicht mehr mit, wenn man in die Tiefe läuft; sie hebt sich nur noch mit der Treppe.
- Entlang des Raums hat die Figur einen Ruhebereich (46 Pixel nach jeder Seite), erst danach zieht die Kamera weich nach.
- Die Kamera ruht auf ganzen Bildschirm-Pixeln, damit die Pixelgrafik beim Laufen nicht flimmert.
- Zoom der Nahsicht 1,28 statt 1,45 (vorher 1,15); der kleine Stations-Knopf sitzt am rechten Rand.

## 12. Nov 2026 – Die Basis: Treppe in den nächsten Raum, näher heran, Sprung-Reihenfolge (Rückmeldung des Nutzers)

- **Treppe und zweiter Raum:** Am Ende der Halle führt eine Treppe auf ein Podest mit Tür. Wer oben durch die Tür
  geht, kommt in die **Rüstkammer** und steht dort wieder auf einem Podest mit Treppe nach unten; derselbe Weg führt
  zurück. Ein Tipp auf die Tür wechselt den Raum sofort.
- Die Halle hält jetzt nur die sechs Stationen, die Rüstkammer die 18 Klassen-Ständer in zwei Reihen mit mehr Abstand
  und eigenem warmem Licht.
- **Näher heran:** Nahsicht mit Zoom 1,45 statt 1,15; die Kamera folgt der Figur jetzt auch nach oben und unten
  (Treppe, Rückwand) und ruckt bei Sprüngen nicht.
- **Fehler behoben:** Im Sprung rutschte die Figur hinter Gegenstände, vor denen sie stand. Die Tiefen-Reihenfolge
  richtet sich jetzt nach dem Boden unter der Figur, nicht nach ihrer Höhe in der Luft (gilt in allen Modi).
- Noch einfach: Treppe und Tür sind gezeichnete Formen, kein eigenes Bild.

## 12. Nov 2026 – Die Basis: tiefer Saal und zwei Ansichten (Vorgabe des Nutzers)

- **Mehr Tiefe, mehr Lauffläche:** neues Saalbild mit großem Boden; die Bodentiefe ist fast doppelt so groß
  (234 statt 118 Pixel begehbar). Die Stationen stehen an der Rückwand, die Rüstkammer in zwei versetzten Reihen
  mit Gang dazwischen; Figur und Ständer verdecken sich nach Tiefe.
- **Zwei Ansichten:** „Nah“ mit Kamera, die der Figur folgt, und „Ganzer Saal“ herausgezoomt von Wand zu Wand
  (Knopf oben links oder Taste V, weicher Übergang). In der Gesamtansicht lassen sich Stationen direkt antippen.
- In Reichweite ist nur, was in der eigenen Tiefen-Bahn steht. Kampf-Knöpfe (Zeichnen, Slots, Block) und das
  Ziel-Banner sind in der Basis ausgeblendet.

## 12. Nov 2026 – Kein Schlag während eines Dauerzaubers (Vorgabe des Nutzers)

- Solange ein Zauber aus der Figur strömt (alle Strahlen samt Aufladen, der Kegel-Atem), löst ein Angriffsdruck
  keinen Schlag aus und wird auch nicht vorgemerkt. Nach dem Ende des Zaubers schlägt man sofort wieder.
- Allgemeine Regel über ein Merkmal am Zauber (`isBeam` / `channel`), weitere Dauerzauber lassen sich so kennzeichnen.

## 11. Nov 2026 – Automatische Aktualisierung (Wunsch des Nutzers)

- Das Spiel lädt eine neue Version von selbst: Die Veröffentlichung schreibt den Commit in `version.json`; das laufende
  Spiel vergleicht beim Start, bei der Rückkehr in die App und alle fünf Minuten.
- Neu geladen wird nur im Hub ohne offenen Bildschirm, nie in einem Match.
- Ein Service Worker (`sw.js`) fragt jede Datei zuerst beim Server ab (kein veralteter Browser-Cache) und hält die
  letzte Kopie für den Fall ohne Verbindung.

## 11. Nov 2026 – Hub-Figur: der eigene Charakter, ausgerüstet (Vorgabe des Nutzers)

- Der Hub bleibt der Startpunkt. Statt des Standbilds läuft dort der eigene Charakter auf der Stelle: seine Figur,
  sein Aussehen und die Waffe der ausgerüsteten Klasse in der Hand. Name und Klasse stehen darüber und im Profil-Schild.
- Mit genau diesem Charakter betritt man die Basis („Basis betreten“).

## 11. Nov 2026 – Die Basis, erste Version (Idee des Nutzers)

- Ein hoher, breiter Saal als Hauptquartier, betretbar über „Basis betreten“ im Hub. Reine Kulisse zur Geschichte,
  ohne Wirkung auf Castle Siege.
- **Stationen statt Menüs:** Tor (zurück zum Hub), Garderobe, Deck, Runen-Altar, Kartentisch (Kampagne),
  Trainings-Dummy. In Reichweite erscheint ein großer Knopf; Antippen der Station oder E / Enter geht auch.
- **Rüstkammer:** ein Rüstungs-Ständer je Klasse (18) mit Klassenname und Stufe darüber, die getragene Klasse ist
  markiert; ein Ständer öffnet „Klasse ausrüsten“ auf dieser Klasse.
- Eigene tiefe Bodenlinie, damit die Halle über der Figur aufragt; kein Kampf-HUD, keine Uhr, keine Gegner.
- Noch nicht: freies Platzieren, herumlaufende Primals, eigene Ständer-Bilder je Klasse (sechs Bilder für 18 Klassen).

## 11. Nov 2026 – Verdienter Fortschritt, erster Durchgang (Vorgabe des Nutzers)

- **Start mit einer Runenkarte:** Bei der Charaktererstellung wählt man eines der sechs Grundelemente; das Deck besteht
  anfangs nur aus dieser Karte. Decks dürfen kleiner als 10 Karten sein.
- **Finden, dann freischalten:** Eine Rune muss zuerst als Fund fallen (Missionsbelohnung, Boss), danach schaltet man
  sie im neuen Runen-Bildschirm mit Skillpunkten und Gold frei. Eine zweite Karte braucht einen zweiten Fund.
- **Seltenheiten:** gewöhnlich (Grundelemente) 1 SP / 50 Gold · selten (übrige Elemente) 1 SP / 150 Gold, ab Stufe 3 ·
  episch (Spezialrunen) 2 SP / 400 Gold, ab Stufe 6 · legendär (Sphären, Arcane States) 3 SP / 1000 Gold, ab Stufe 10.
- **Gold** als neue Währung: aus Missionen (60–320) und jedem beendeten Match (30 Sieg / 10 Niederlage).
- **Geltung:** Castle Siege, Invasion und die Kampagnen-Missionen dieser Modi. Ausgenommen: Training (Sandkasten),
  Dungeon (eigene Lauf-Runen) und das Arena-Duell (dort sammelt man wie bisher Runen-Relikte). Gegner-Decks unverändert.
- **Spielstand:** alte Stände beginnen neu (Sicherung unter `grimge-mage-profile-v1-backup-v3`; Name, Aussehen und
  Klasse bleiben). Test-Schalter „Alles freischalten“ im Runen-Bildschirm, jederzeit zurückschaltbar.
- **Noch offen aus der Vorgabe:** Mastery-Stufe als Vorbedingung, Transformation am Ende jedes Mastery-Baums und je
  Klasse mit drei Modi, gewichtete Runen-Auswahl im Dungeon, Funde aus Burgen und Geheimtruhen.

## 11. Nov 2026 – Bildschirme ohne Scrollen, Sterne-Fortschritt, Klassen-Knopf (Wünsche des Nutzers)

- **Kampagne:** ein Bildschirm ohne Scrollen – Titelleiste oben (Zurück, Kapitel, Stufe mit XP-Leiste, Sterne), die
  Karte mit großen Missions-Pins und Namen in der Mitte, unten eine Missions-Karte mit einem großen START-Knopf.
- **Charaktererstellung:** Vorschau links, rechts drei Reiter (Aussehen, Element, Klasse), Bestätigen-Knopf fest unten.
  Texte auf Deutsch.
- **Klassen-Knopf im Hub:** öffnet jetzt „Klasse ausrüsten“ (nur die Klassen-Seite) statt der Figurenauswahl. Die
  Figur wählt man in der Garderobe bzw. bei der Erstellung; die Garderobe zeigt nur Aussehen und Element.
- **Sterne:** jede gewonnene Mission bekommt 1–3 Sterne (geschafft / mindestens halbes Leben, in der Arena zwei
  Seelenfunken / in der Zielzeit). Die beste Wertung bleibt, je 5 Sterne gibt es einmalig einen Bonus-Skillpunkt.
  Sterne stehen an den Pins, die Bedingungen in der Missions-Karte, die Wertung in der Sieg-Meldung.

## 11. Nov 2026 – Drücken = Treffer (Wunsch des Nutzers)

- Ein Druck außerhalb des Kombo-Takts bricht den laufenden Schlag ab und schlägt sofort als Schlag 1; die Kombo beginnt
  neu. Vorher wurde ein verpasster Finisher bis zum Ende des Schlags geparkt und kam nach 0,2 s Pause, und Drücke
  mitten im Schlag wurden verschluckt.
- Im Takt bleibt alles wie gehabt: Druck im letzten Stück des Schlags führt zum nächsten Kombo-Schritt, Druck im
  Finisher-Fenster zum Finisher.
- Abbrechen geht ab der Hälfte des laufenden Schlags (`STRIKE_CUT`); ein früherer Druck feuert genau dort. Solche
  Schläge machen den Grundschaden ohne den Tempo-Bonus, damit Dauerdrücken eine Kombo im Takt nicht schlägt.

## 11. Nov 2026 – Schlagtempo: langsamer, Schaden angepasst (Entscheidung des Nutzers)

- Jeder Kombo-Schlag (Grund-Kombo und alle Waffen-Kombos) dauert das 1,6-Fache und macht das 1,6-Fache an Schaden;
  der Schaden pro Sekunde bleibt gleich. Schlag 1 / 2 / 3: 0,35 / 0,38 / 0,56 s (vorher 0,22 / 0,24 / 0,35 s);
  Aufwärtshieb 0,45 s, schwerer Hieb 0,54 s. Eine Stellschraube: `STRIKE_PACE` in `entities.js`.
- Der Treffer fällt weiterhin beim Tastendruck; die zusätzliche Zeit ist Schlagpose und Nachschwung. Das Kombo-Fenster
  nach dem Schlag ist so breit wie vorher.
- Sturzangriff, Gegner-Angriffe und Zauber sind unverändert.

## 11. Nov 2026 – Fokus-Form und Waffen-Einzelposen auf erzeugten Bildern

- Die Fokus-Form (Umhang, Speer auf dem Rücken) hat eigene Bögen für Gehen, Schläge und Einzelposen; sie gelten mit
  und ohne Waffe, die Waffe sitzt an den hinterlegten Handpunkten.
- Thesen mit Waffe nutzt jetzt auch für Sprung, Blocken, Treffer, Rückwärtssprung, Zeichnen und Niederlage die
  erzeugten Bilder (Handpunkte ergänzt, keine neue Erzeugung).
- Noch Gerüst-Animation: Stehen, Aufladen, Landen sowie die Atemtechnik- und Schwebe-Posen.
- Kosten: 0,75 Credits (insgesamt 7,25 von 10), 0 USD.

## 11. Nov 2026 – Thesen mit Waffe auf erzeugten Bildern

- Sechs Waffenschwung-Posen mit leerer Faust (Bereit, Ausholen, Hieb, Überkopf, Niederschlag, Stoß). Pro Bild ist die
  Handposition hinterlegt, und das Spiel setzt die jeweilige Waffe dorthin – ein Satz Posen für alle Waffen.
- Gehen, Laufen und Sprint mit Waffe nutzen den erzeugten Gehzyklus mit Handpunkten. Sprung, Blocken, Treffer,
  Aufladen und Zeichnen mit Waffe bleiben vorerst Gerüst-Animationen.
- Kosten: 0,25 Credits (insgesamt 6,5 von 10), 0 USD.

## 11. Nov 2026 – Restliche Figuren ersetzt, Xame vollständig, Thesen mit erzeugten Bildern

- Die Invasions-Gegner der späteren Level und die Verbündeten sind eigene Figuren (Leerenkoloss, Leerenschütze,
  Leerenfechter, Glutakolyth, Frostschamane; Wächter und Späherin von Kareth). Damit nutzt kein Gegner und kein
  Verbündeter mehr die alten Bögen mit fremdem Layout; die alten Schlüssel `deep`, `henry`, `firen`, `freeze`, `woody`
  sind aus den Invasions-Pools entfernt.
- Xame hat eigene Bilder für Sprung, Blocken, Treffer, Zaubern und Niederlage.
- Thesen: Gehen, Sprint, Faustschläge, Sprung, Blocken, Treffer, Zeichnen und Niederlage kommen aus erzeugten Bildern,
  solange er unbewaffnet ist. Mit Waffe bleiben die Gerüst-Animationen, weil dort die Waffe der Hand folgt.
- Kosten: 2,75 Credits (insgesamt 6,25 von 10), 0 USD.

## 11. Nov 2026 – Eigene Gegner im Stil der Helden

- Vier neue Figuren ersetzen die alten Gegner-Bögen: Leerenritter, Leerenräuber, Leerenhexer und der Glutfürst als
  Boss – eigene Entwürfe, mit Thesen als Stilvorlage erzeugt (1,0 Credits), je sieben Posen (Stand, drei Gehschritte,
  Ausholen, Schlag, Treffer). Rollen und Werte der Gegner sind unverändert.
- Gegner spielen ihre Schläge jetzt von vorn ab (Ausholen → Schlag) statt auf dem letzten Bild zu stehen.
- Offen: Verbündete und die zusätzlichen Invasions-Gegner nutzen noch die alten Bögen.

## 11. Nov 2026 – Xame ist animiert

- Xame hat eigene Bilder für Gehen (6) und Speerangriff (5), erzeugt mit seinem Sprite als Vorlage (0,5 Credits);
  Größe, Pixeldichte und Aussehen stimmen mit dem Standbild überein. Sie gelten als Spieler-Figur und als Rivale im Duell.
- Noch ohne eigene Bilder: Sprung, Treffer, Blocken, Zeichnen, Tod (dort bleibt das Standbild).

## 11. Nov 2026 – Alle fünf Missionen mit eigener Szene, Kapitel-Karte, Requisiten

- Mission 2 (Halvar, Sturmnacht) und Mission 4 (Aschenfeste) haben eigene Szenen: das vorhandene Burg-Bild wurde
  umgestaltet, Burgen, Türme und Hof stehen an denselben Stellen.
- Der Kapitelbildschirm zeigt eine Pixel-Art-Karte mit den fünf Schauplätzen und anklickbaren Missions-Pins.
- Zwölf Requisiten (Säulen, Trümmer, Fackeln, Banner, Statuen, Käfig, Kette) in zwei Themen: sie stehen als Dekoration
  an der Rückwand der Dungeon-Räume; die schwarze Vordergrund-Säule ist durch die Themen-Säule ersetzt.
- Kosten: 1,25 Credits aus dem Guthaben (insgesamt 2,0), 0 USD.

## 11. Nov 2026 – Erste erzeugte Szenen

- Drei Kampagnen-Hintergründe mit Higgsfield erzeugt (0,75 Credits aus dem Registrierungs-Guthaben, 0 USD): Ruinenhalle
  Kareth (Mission 1), Abgrund-Arena (Mission 3), Gluttiefe (Mission 5).
- Missionen können eine eigene Szene angeben (`scene` in `campaign_data.js`); sie ersetzt den Standard-Hintergrund,
  scrollt im Dungeon mit Parallax und steht in der Arena mittig.
- Aufbereitung über `art/authoring/prep_scene.cjs`; Rohbilder liegen unverändert in `art/generated/scenes/`.
- Der AutoSprite-Test für Xame schlug fehl (nichts abgebucht).

## 11. Nov 2026 – Campaign Alpha 0.1, erste spielbare Schleife

- **Kampagne:** Kapitel 1 „Der gebrochene Bann“ mit fünf verbundenen Missionen (Dungeon-Halle, Burgverteidigung,
  Riss-Duell gegen Xame, Castle Siege, Boss-Lauf zum Glutfürsten), jeweils mit Einsatzbesprechung, Ziel, Intro- und
  Outro-Dialog und Belohnung.
- **Fortschritt:** Missionen schalten sich der Reihe nach frei, Belohnungen einmalig, alles im Profil gespeichert,
  Missionen wiederholbar.
- **Bildschirme:** Kapitel-Übersicht und Dialog mit Sprecher-Porträt (Platzhalter-Layout); Kampagnen-Knopf im Hub.
- **Modi mit Parametern:** Dungeon-Start- und Endraum, Invasions-Levelgrenze, Arena-Rivale.
- **Dokumente:** Audit, Design Bible (Geschichte als Vorschlag), Art Bible, Roadmap, Budget-Protokoll, Changelog.
- **Entscheidung:** Der Web-Prototyp ist das maßgebliche Projekt; Unity bleibt Lesereferenz.
- **Budget:** 0 USD ausgegeben; Higgsfield-Preise ungeklärt, daher noch keine Erzeugung.

## 10. Nov 2026

- **Arena „Riss + Leben“:** Riss-Schild statt Lebenspunkte, Bannrand-KO, Abgrund, 3 Seelenfunken.
- **Charaktererstellung:** Name, Grundfigur, Haar- und Rüstungsfarbe, Startelement, 18 Klassen (Waffenfamilien) mit
  Startwaffe; animierte Vorschau.
- **Animation:** Teile-Gerüst für Thesen und die Fokus-Form, Grund-Clips, Schläge als Schlüsselposen mit Schliere,
  Waffe in der Hand, Staub-Sprites, Raubtier- und Schwebe-Clips.
- **Level:** Möbel als Plattformen, Vordergrund-Säulen und -Ketten; Zauber zielen auf Ebenen (Treppe, Galerie).

## Davor

Siehe `PROJECT_STATUS.md` und `git log` (Folgekamera, Treppen, Atemtechniken, Zauber-Neuzeichnungen, KI, Modi …).
