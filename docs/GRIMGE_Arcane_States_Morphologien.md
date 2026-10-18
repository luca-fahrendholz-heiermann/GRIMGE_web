# GRIMGE — Arcane States: Morphologien und drei visuelle Zustände

> Generiert von `tools/generate_buff_forms.mjs` aus dem Transformations-Atlas V3.1, der Design-Notiz vom 18.10.2026 und dem **V3.2 Morphologie-Overhaul** (individuelle Morphologie je Form: Kategorie, Anker, drei Zustände, eigene Animationen, Heavy-Abbildung).
> **Regel:** Nur **Arkengestell** ist eine riesige humanoide Manifestation (Astral Avatar). Alle anderen Arcane States unterscheiden sich schon an der Silhouette — durch die Art, wie sich die Effekte zum Charakter und zur Welt verhalten. Umsetzung weiterhin ausschließlich mit VFX/Attachments, der Charakter-Sprite bleibt unverändert.

> **Nicht jeder State braucht eine große permanente Manifestation.** Jeder hat drei Zustände: **Idle-Silhouette** (Erkennungsbild während der Aktivierung), **Action-Silhouette** (Sprint, Jump, Defense, Heavy) und **Peak Manifestation** (maximale Ausprägung, z. B. Full Charge).

## Morphologie-Typen

| Morphologie | Aufbau | Formen |
|---|---|---|
| **Astral Avatar** | riesige externe Kampfgestalt | B02 Arkengestell |
| **Energy Extension** | bewegliche Schweife, Bänder und Peitschen aus der Körperkontur | B01 Risswild, T01 Kammwacht, T04 Korallenschild, T11 Polartrick, T15 Spektralweiche, T17 Glutmauser, T30 Leisefaden, T36 Bollwerklicht |
| **Body Augmentation** | Strukturen direkt am Körper, zusätzliche Glieder und Leitungen | T07 Dämmerlauf, T10 Aderarchon, T12 Stratospalter, T13 Fadenschlag, T18 Morphgitter, T19 Schwuranker, T20 Taktklinge, T22 Zündschuppe, T25 Hämolith, T27 Faltspur, T32 Taktfunke, T33 Nachtmaß, T37 Säuregerüst |
| **Orbital Construct** | freischwebende Ringe, Objekte und Fragmente | T02 Schlackenkern, T06 Ionspindel, T08 Ossuarium, T09 Prismabruch, T14 Glyphenschmied, T16 Vierknoten, T21 Orbitpranke, T23 Nullfeldträger, T29 Werkgestalt, T31 Klingenherbarium, T38 Asterglied |
| **Temporal Projection** | versetzte Abbilder und Bewegungsechos | T26 Resonanzwache, T39 Vorausschnitt |
| **Creature Manifestation** | unabhängige Energiegeschöpfe | T03 Reliktkiefer, T24 Fadenregent, T40 Sonnenwyrm |
| **Levitation State** | schwebender Spieler mit kontrollierten Projektilen | T05 Bruchflug, T34 Sternwerk |
| **Environmental State** | der Spieler verändert einen größeren Bereich der Arena | T28 Rasterdom, T35 Kältestillstand |

## Alle 42 Arcane States

### B01 Risswild · *Energy Extension* · V3.2: Dynamische Bruchbänder, asymmetrischer Dreifach-Streamer

- **Anker:** `back_left`, `hip_right`, `shoulder_right`, `sprite_alpha`
- **Idle-Silhouette:** Drei grobe obsidiangoldene Zungen bilden keine Schulterbreite, sondern eine S-förmige Diagonale vom linken Becken bis deutlich über die rechte Schulter; Größenfolge 0,7/1,5/2,4 H, keine Kopf- oder Armsilhouette.
- **Action-Silhouette:** Bei Sprint werden alle drei Zungen stromlinienförmig nach hinten gezogen; beim Richtungswechsel bricht ihre Mitte und heilt mit zeitversetztem Goldlauf; bei Schlägen schnalzt nur ein Band zielwärts.
- **Peak Manifestation:** Full Charge ordnet die drei Bänder zum asymmetrischen gebrochenen Trichter, danach zerreißt die Spitze in kantige Risskerne; kein vollständiger Tierkörper.
- **Transform-In / Out:** Eine dünne Glutnaht rast die echte Spritekontur ab, drei dunkle Plattenbänder platzen nacheinander am Rücken auf, werden durch goldene Schmelzkanten zusammengehalten und schwingen auseinander. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Die drei Bänder falten sich als versetzte, keilförmige Panzerschichten vor die Blickrichtung; Blockwucht läuft als helle Rissader nach außen. · Ein einziger dünner Rissfaden schießt aus der unteren Bandkante zum nahen Ziel und verhakt sich nur beim bestätigten Kontakt. · Beim Absprung sacken die breiten Platten erst nach unten, folgen dann federnd; am Scheitelpunkt stehen sie horizontal, bei Landung schlagen die Enden auf den Boden.
- **Heavies (V3.2-Abbildung):** Forward — Short: eine einzelne spitze Bruchzunge schnellt geradlinig vor; Full: die Zungen verdichten ihre Rissadern zum explodierenden dunklen Projektilkern. · Up — Short: eine schmale Kante hebelt ein Ziel hoch; Full: zwei gegenläufige Risssäulen spiralen über dem Avatar und stoßen nach oben. · Down — Short: bodennaher Kreisschlag aus einer Zunge; Full: versetzte Scherbenanker schlagen über mehrere Bodenpunkte ein und entladen ein Rissfeld.
- **Ausschlüsse:** Keine Füchse, neun Schweife, symmetrischen Schultergelenke oder großen Fäuste.
- Palette: `#241623` `#f29b35` `#ffd774` `#ff5b25` · Material: schwarzglasige, glühende Risskruste.

### B02 Arkengestell · *Astral Avatar* · V3.2: Einziger großer humanoid lesbarer Außenavatar: offenes astrales Kraftgestell

- **Anker:** `shoulder_left/right`, `hand_left/right`, `chest`, `weapon_tip`, `sprite_alpha`
- **Idle-Silhouette:** Über dem normalen Charakter schwebt ein 2,8–3,8 H hohes, offenes violettes Skelett aus Plattenträgern, schwebenden Schultermodulen und zwei klar artikulierten Konstruktarmen; Zentrum und Gesicht des Spielers bleiben frei.
- **Action-Silhouette:** Hände haben echte Fingerblock-Gelenke; Ellbogenplatten tragen Gewicht nach, der Bogen bleibt zusammengefaltet im rechten Segment; bei Bewegung werden Träger über verschobene Sekundäranker nachgeführt.
- **Peak Manifestation:** Full Charge klappt den bereits implementierten Konstruktbogen auf; die Pfeilführung findet zwischen den Konstruktarmen statt. Bei anderen Heavy-Richtungen lösen sich Arme oder Träger einzeln zur Angriffsbahn.
- **Transform-In / Out:** Sechs Kristallplatten fahren aus getrennten Raumpositionen zum Grundgerüst, verriegeln mit blassvioletten Stromadern und erzeugen erst dann die großen Arme; kein Geisterkopf. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Die vordere Hand klappt zu einem facettierten Schirm auf; nicht erneut einen vollständigen zusätzlichen Rippenkäfig erzeugen. · Eine segmentierte Greifhand packt im nahen, validierten Bereich, während die zweite die freie Mitte stabilisiert. · Beim echten Sprung fährt das Gestell leicht zusammen, Füße des Avatars springen normal; die beiden riesigen Arme folgen mit deutlichem Gelenknachlauf.
- **Heavies (V3.2-Abbildung):** Forward — Short: kurzer präziser Glyphenpfeil vom vorhandenen Bogen; Full: vollständig ausgefahrener Konstruktbogen mit gefasstem Belagerungspfeil und Einzel-Release. · Up — Short: eine offene Trägerhand hebt vor dem Charakter; Full: Gelenkplatten fügen sich zur aufsteigenden Lichtschneide. · Down — Short: ein schwerer Bodenanker des Gestells; Full: beide Träger drücken auf getrennte Bodenkontaktpunkte und erzeugen gerichtete Druckwellen.
- **Ausschlüsse:** Kein Schädel, Samurai, Rippenkäfig, Avatarersatz. Nur diese Form darf im Idle wie ein riesiger zweihändiger Kämpfer wirken.
- Palette: `#30205d` `#8e67f0` `#d6a7ff` `#e994f2` · Material: violetter Arkankristall und semi-transparente Keramikpanzer.

### T01 Kammwacht · *Energy Extension* · V3.2: Vertikaler Rückenfächer aus Schindellamellen

- **Anker:** `back_left`, `back_right`, `hip`, `sprite_alpha`
- **Idle-Silhouette:** Vier breitkantige Porzellanmetall-Lamellen ragen wie versetzte Schiffskielfinnen hinter einer Körperseite auf, 1,2–2,1 H; keinerlei Arme oder Helm.
- **Action-Silhouette:** Die Lamellen öffnen sich im Atemrhythmus minimal, Oxidadern wandern nur auf echten Oberflächen; beim Laufen neigen sie sich wie eine flexible Rückenfeder nach hinten.
- **Peak Manifestation:** Bei Peak rasten die Lamellen als steile scharfkantige Wand oder gezahnter Vorwärtskamm ineinander; Impact lässt Platten abbrechen und reproduzierbar nachwachsen.
- **Transform-In / Out:** Vom unteren Rücken steigen gerissene Emailleplättchen auf, sortieren sich zu vier versetzten Rippen und schließen mit dumpfem Keramik-Klick. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Lamellen scheren seitlich nach vorn und bilden einen halb offenen schrägen Schutzkamm. · Zwei Lamellenenden verschränken sich kurz um das nahestehende Ziel, ohne separaten riesigen Greifarm. · Beim Sprung legen sich die Lamellen dachziegelartig flach; beim Landen fahren sie über die Schultern wieder aus.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein einzelner Emaillezahn schlägt nach vorn; Full: der ganze Kamm öffnet sich in einen glühenden, nach vorne gerichteten Plattenkanal. · Up — Short: oberste Lamelle stößt aufwärts; Full: vier Platten klappen nacheinander zu einer steilen Aufstiegsbahn. · Down — Short: Lamellenende wischt Bodenstaub auf; Full: Schindeln stemmen eine breite Hitzewand aus dem Bodenkontakt.
- **Ausschlüsse:** Kein Drachenkopf, Hörner, geschuppter Körper oder externes humanoides Gerüst.
- Palette: `#222c32` `#5c988e` `#e9b777` · Material: patiniertes Porzellanmetall.

### T02 Schlackenkern · *Orbital Construct* · V3.2: Ortsnaher asymmetrischer Schwebeofen, keine Körperstatue

- **Anker:** `hip_left`, `back_left`, `feet_world`, `sprite_alpha`
- **Idle-Silhouette:** Eine einzige bauchige Ofenkammer hängt links hinter der Hüfte, mit drei gebrochenen Keramik-Düsenbändern und leuchtendem Ofenmund; Größenbereich 1,0–2,0 H.
- **Action-Silhouette:** Heiße Asche fällt nach unten, die Ventile atmen gegeneinander; bei Bewegung schaukelt die Kammer wie schweres Gepäck und bleibt asymmetrisch.
- **Peak Manifestation:** Full Charge lässt die Ofenkammer als großes schräges Düsenaggregat aufreißen, das Raum und Boden überstrahlt; keine künstlichen Beine, kein Torso.
- **Transform-In / Out:** Poröse Glasur wächst als kleiner Ring am Boden, hebt eine hohle Keramikglocke zur Hüfte und öffnet seitlich zwei ungleiche Glutventile. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Keramikblenden schließen sich um die blickseitige Flanke und verteilen Treffer in kurzen Glutstößen. · Ein Ofenhaken greift im Nahbereich aus dem seitlichen Ventil und zieht das Ziel zum Hitframe. · Im Sprung hängt die Kammer tiefer als der Körper und gibt eine vertikale Funkenfahne ab; bei Landung stampft sie als Gewichts-Nachlauf.
- **Heavies (V3.2-Abbildung):** Forward — Short: kurzer Funkenausstoß aus einer Düse; Full: Ofentür klappt auf und presst eine konzentrierte Lava-Lanze vorwärts. · Up — Short: ein Ascherohr hustet aufwärts; Full: mehrere Ventile schichten einen eruptiven vertikalen Fächer. · Down — Short: Rußkranz an den Füßen; Full: Kammer senkt sich über einen Bodenpunkt und gießt einen breiten Kraterkern aus.
- **Ausschlüsse:** Kein Magmariese, keine Lava-Ganzkörpertätowierung.
- Palette: `#292c33` `#e4a357` `#ab78c0` · Material: verglaste Ofenkeramik.

### T03 Reliktkiefer · *Creature Manifestation* · V3.2: Seitlicher dreiteiliger fossiler Greifapparat

- **Anker:** `shoulder_left/right`, `hip`, `hand_right`, `sprite_alpha`
- **Idle-Silhouette:** Drei einzelne Kieferbögen schweben rechts und links der Figur, nicht über dem Kopf; ihre offenen Innenräume bleiben sichtbar, einer hängt deutlich tiefer als die anderen.
- **Action-Silhouette:** Die Bögen gleiten wie schwebende Scheren gegeneinander und zeigen in den Innenfacetten kleine türkisfarbene Fossileinschlüsse, keine Zähne eines Tiergesichts.
- **Peak Manifestation:** Bei Full gruppieren sich die Bögen vorübergehend zu einer weit nach vorne reichenden Zange oder einem steilen Aufwärtskegel, der sofort wieder in drei unabhängige Teile zerfällt.
- **Transform-In / Out:** Sedimentstreifen steigen aus drei kleinen Glasstaub-Wirbeln auf und setzen sich zu gebogenen fossilen Greifspangen zusammen; das Zentrum der Figur bleibt frei. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Zwei Bögen kreuzen vor dem Rumpf als Schutzklemmung; nur sichtbare Kontaktkanten leuchten. · Die untere Fossilspange umfasst ein nahegelegenes Ziel im Trefferframe, ohne Monstermaul direkt am Avatar. · Alle drei Spangen verzögern im Aufstieg; bei Fall strecken sie sich vertikal und klappen auf Landung zusammen.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein einzelner Kieferbogen schnappt waagerecht; Full: alle Bögen fächern zu einem breiten sedimental leuchtenden Strahlfächer auf. · Up — Short: hohe Spange stößt nach oben; Full: drei Bogenachsen bilden eine offene sich schließende Himmelsschere. · Down — Short: untere Spange zieht im Halbkreis; Full: mehrere Fossilbögen windet sich bodennah zu einer großen, nicht biologischen Spirale.
- **Ausschlüsse:** Keine Drachenfratze, kein Schnauzenkopf, kein halbhumanoides Rippenskelett.
- Palette: `#556261` `#e0d2aa` `#36a49c` · Material: mineralisches Fossilglas.

### T04 Korallenschild · *Energy Extension* · V3.2: Zweiflügeliger Schutzfächer aus korallinen Segeln

- **Anker:** `hip_left/right`, `back_left/right`, `sprite_alpha`
- **Idle-Silhouette:** Zwei breite fächerförmige Segel schweben seitlich auf Hüfthöhe, eines deutlich höher, mit salzweiß gesprenkelter Porzellanoberfläche, 1,5–2,4 H Spannweite.
- **Action-Silhouette:** Die Fächer öffnen und schließen sich langsamer als die Figur atmet; bei Sprint falten sie sich nach hinten und hinterlassen einen zweigeteilten salzigen Partikelstreifen.
- **Peak Manifestation:** Full Charge breitet die Segel zu einem raumgreifenden seitlichen Schutz-/Heilungsfeld aus; sie formen ausdrücklich keinen fliegenden Drachen.
- **Transform-In / Out:** Winzige Kalkplättchen strömen seitlich vom Sprite und falten sich wie Segellatten auf, dabei werden rosige Innenperlen sichtbar. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Beide Segel stellen ihre gefassten Kanten wie einen V-Schild vor den Avatar. · Ein Segelrand schiebt sich auf das unmittelbar benachbarte Ziel und lenkt es nur nach Trefferbestätigung um. · Die Fächer ziehen sich beim Sprung unter den Avatar und steigen als verzögerte Gleiter nach, ohne eigenständiges Flugmodell zu benötigen.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelner rosiger Perlstrahl; Full: die geöffneten Fächer weben einen breiten schimmernden Strom nach vorn. · Up — Short: ein Fächer kippt hoch; Full: beide Segel heben eine gebogene perlmuttfarbene Schutzaufwindbahn. · Down — Short: heller Kreidekreis am Fuß; Full: Segel setzen mehrere Salzpunkte zu einer ausgedehnten Schutzblüte zusammen.
- **Ausschlüsse:** Keine biologischen Flügel oder Engelsflügel, kein rotgoldenes Reptil.
- Palette: `#345a65` `#f0a89e` `#e4d78d` · Material: halbtransparente Korallenkeramik.

### T05 Bruchflug · *Levitation State* · V3.2: Asymmetrische Gravitätsfinnen als richtungsabhängiger Schwebeversatz

- **Anker:** `hip`, `back_left`, `feet_world`, `velocity`, `sprite_alpha`
- **Idle-Silhouette:** Drei voneinander getrennte dunkle Bruchfinnen hängen diagonal hinter und unter dem Avatar, ohne symmetrische Flügelpaarung; der Raum zwischen ihnen verzerrt die Hintergrundpixel.
- **Action-Silhouette:** Die Finnen kippen bei Beschleunigung auf unterschiedliche Winkel und scheinen nach dem Stoppen kurz nachzurutschen, weil ihre Positionsanker nicht identisch sind.
- **Peak Manifestation:** Peak bildet einen einzelnen langen räumlichen Scherkeil oder einen kurzen freien Fallkanal; die Finnen bleiben drei unterscheidbare Teile, nie Riesenarme.
- **Transform-In / Out:** Je ein Schwerkraftfeld knickt aus dem Schatten des Sprites, zieht drei schwarzgläserne Blätter aus unterschiedlichen Höhen und setzt helle Polknoten an die Spitze. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Die vordere Finne deckt einen schmalen Raumkorridor ab und biegt feindliche Lichtspuren sichtbar seitlich weg. · Eine Finne arretiert nahe Ziele kurz mit einem richtungsgebundenen Schwerkraftkeil. · Aufstieg: Finnen strecken sich wie drei unterseitige Jets; Apex: Schwerelosigkeit und Gegenrotation; Landung: versetzte Druckringe am Boden.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein Scherkeil zerkratzt Luft vor der Hand; Full: die Finnen öffnen einen langgestreckten leeren Strahlkanal. · Up — Short: kurze Aufwärtsfinne; Full: drei nacheinander ausfahrende Druckflügel treiben eine vertikale Scherkante. · Down — Short: eine Bodenfinne streift über den Boden; Full: das gesamte Feld fällt als breiter räumlicher Drucksturz auf eine Lanezone.
- **Ausschlüsse:** Keine Fledermausflügel, Hörner oder Dämonenjäger-Silhouette.
- Palette: `#161d29` `#2fa89c` `#d77d9d` · Material: dunkler Gravitätsstein.

### T06 Ionspindel · *Orbital Construct* · V3.2: Drei diagonal gesetzte elektromagnetische Spulen

- **Anker:** `shoulder_right`, `elbow_right`, `hip_left`, `hand_right`, `sprite_alpha`
- **Idle-Silhouette:** Die Spulen umlaufen nicht den ganzen Körper als Käfig, sondern sind versetzt bei Schulter, Ellbogen und linker Hüfte angeordnet; dünne Kupferfäden verbinden sie, sichtbar 0,8–1,5 H.
- **Action-Silhouette:** Spulen drehen gegensinnig in verschiedenen Geschwindigkeiten; zwischen den Rotoren springen haarfeine gelbgrüne Funken, während das Zentrum der Figur unverdeckt bleibt.
- **Peak Manifestation:** Bei Full richten sich die drei Spulen zu einer langen schrägen Induktionsschiene aus und entladen eine gerichtete Lichtfaserbahn; keine Körpergröße-Erhöhung.
- **Transform-In / Out:** Ein kurzer Stromblitz zieht längs der wahren Spritekontur, drei ringartige Isoliergehäuse schnappen aus unterschiedlichen Richtungen an die Außenanker. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Spulen schieben sich vor die Verteidigungsseite und erzeugen ein engmaschiges Netz wechselnder Feldlinien. · Magnetischer Kupferfaden schnürt die nahe Zielkontur für den kurzen Nah-Griff ein. · Im Sprung laufen elektrische Funken entlang der Trajektorie; Rotoren drehen am Scheitelpunkt gegensinnig und schwingen nach Landung zurück.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelne dünne Nadelentladung; Full: Spulen bilden eine hintereinander geschaltete Kettenblitz-Schiene. · Up — Short: Funkenimpuls entlang eines Unterarmankers nach oben; Full: mehrere Induktionskerne setzen eine steile Stromsäule frei. · Down — Short: kurzer Sohlenpuls; Full: Rotoren koppeln den Boden zu einer wandernden elektromagnetischen Wirbelzone.
- **Ausschlüsse:** Keine Vollrüstung aus Blitzen, keine ewig gleichen Blitzkringel.
- Palette: `#254e59` `#b6d46b` `#f29a70` · Material: elektrisch leitendes Glasfasergeflecht.

### T07 Dämmerlauf · *Body Augmentation* · V3.2: Vier körpernahe Rauch-Sichelverlängerungen

- **Anker:** `hand_left/right`, `shin_left/right`, `feet_world`, `sprite_alpha`
- **Idle-Silhouette:** Zwei schmale Sichelfahnen an den Unterarmen und zwei an den Waden, jeweils asymmetrisch und rau ausgefranst; Silhouette bleibt auf höchstens 1,5 H.
- **Action-Silhouette:** Während Idle zittert jede Sichel unabhängig; beim Sprint zieht sie eine zackige tiefe Spur dicht über die Lane und vergrößert nicht die Körperbreite.
- **Peak Manifestation:** Full lässt nur kurz eine weite, einseitige Halbmond-Schnittbahn entstehen, die wieder in vier schmale Sichelfahnen zusammenfällt.
- **Transform-In / Out:** Der Schatten an realen Unterarm- und Wadenkanten löst sich in vier dünne Rußschnitte, deren metallischer Kern erst am Rand aufblitzt. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Unterarmsicheln kreuzen kurz blickseitig und erzeugen eine matt-rauchige Gegenkante. · Ein Wadenstreifen zieht das nahe Ziel mit einem tiefen Schattenhaken aus dem Gleichgewicht. · Sprung: Wadenfahnen hängen deutlich nach unten; Apex: Schneiden liegen parallel zur Bewegung; Landung: Ruß schlägt am Fuß aus.
- **Heavies (V3.2-Abbildung):** Forward — Short: knapper Sichelstreich; Full: Rauch-Sicheln verbinden sich zu einer durchlaufenden, breiten Bogenfront. · Up — Short: obere Sichel winkelt hoch; Full: vier rauchmetallene Schneiden steigen nacheinander in einem hohen Versatzbogen. · Down — Short: tiefer Jagdschnitt; Full: die Sicheln rennen über den Boden als kreisendes Schatten-Scherfeld.
- **Ausschlüsse:** Kein Wolf, kein Tierkopf, keine humanoide Schattenbestie.
- Palette: `#414d51` `#a7ba87` `#e6af8c` · Material: halbtransparentes Rauchmetall.

### T08 Ossuarium · *Orbital Construct* · V3.2: Akustisches Glockenmobile aus Keramik, keine Rüstung

- **Anker:** `back_left`, `back_right`, `feet_world`, `sprite_alpha`
- **Idle-Silhouette:** Drei unterschiedlich große Hohlglocken und zwei hängende Grabplatten bilden eine vertikale, seitlich versetzte Mobile-Silhouette hinter dem Rücken, 1,6–2,6 H.
- **Action-Silhouette:** Bei Idle kollidieren die Hohlglocken nie, sondern schwingen phasenverschoben; aus jedem Schallrand läuft eine zarte, schraffierte Resonanzkante.
- **Peak Manifestation:** Full Charge fügt die Glockenöffnungen zu einer gewaltigen offenen Resonanzgasse zusammen; das Bild einer Menschengestalt bleibt aus.
- **Transform-In / Out:** Staubige Glasurscherben schweben aus der Bodenspur, fügen sich zu hängenden Glocken; unsichtbare Zugachsen lassen die schweren Teile allmählich ausschwingen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Eine tiefe Glocke schwenkt zwischen Angriff und Figur, sodass die Schallfront den Treffer dämpft. · Der unterste Grabplattenhaken schwingt zum validierten Nahziel und arretiert kurz vor dem Opfer. · Während der Sprungphase hängen Glocken nach unten, bei Landung schwingen sie gegeneinander und klingeln stumm durch Lichtpulse.
- **Heavies (V3.2-Abbildung):** Forward — Short: scharfer Scherben-Tonpfeil; Full: die Glocken in Linie setzen einen schweren sarkophagartigen Schallkeil frei. · Up — Short: oberes Plättchen zieht hoch; Full: alle Glocken schweben öffnend zur mehrlagigen Resonanzblüte. · Down — Short: Grabplatte prallt auf Bodenmarke; Full: Glocken öffnen ein rechteckig-hohles Schallfeld auf dem Boden.
- **Ausschlüsse:** Keine Knochenrüstung, Totenschädelkrone oder Nekromantenkörper.
- Palette: `#323c40` `#f2e7cc` `#8ebf97` · Material: antike Glockenkeramik.

### T09 Prismabruch · *Orbital Construct* · V3.2: Einseitiges Fünfplatten-Spiegelprisma

- **Anker:** `shoulder_left`, `hip_left`, `facing`, `sprite_alpha`
- **Idle-Silhouette:** Fünf ungleiche Spiegelplatten schweben nur an einer Flanke, als schräg gestapelter, prismatischer Schirm; die Gegenseite des Avatars bleibt optisch fast frei.
- **Action-Silhouette:** Jede Platte reflektiert einen anderen Ausschnitt aus Bewegung und Boden; die Reflexe rutschen unabhängig von der realen Pose über zerkratztes Glas.
- **Peak Manifestation:** Bei Full spreizen sich die fünf Spiegel zu einer gerichteten Reflexionslinse und geben mehrfach gebrochene Bahnen frei, niemals ein Doppelgänger-Heer.
- **Transform-In / Out:** Ein dünner Reflex tastet die echte Spritekontur ab, bricht dann in fünf isolierte Spiegelteile, die sich seitlich versetzt einrasten. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Für Defense dreht sich das einseitige Prisma wie eine Jalousie vor die Blickrichtung und verteilt Projektilreflexe. · Eine Spiegelkante markiert das nahe Ziel mit kurz verzögertem Kontakt-Nachbild statt eines Greifarms. · Im Sprung kippt der ganze Seitenstapel nach hinten, einzelne Platten bleiben kurz in World-Space und schnappen zurück.
- **Heavies (V3.2-Abbildung):** Forward — Short: eine schmale Glasnadel aus vorderster Platte; Full: fünf Platten fächern als gebrochene Projektilsalve auf. · Up — Short: eine Spiegelkante hebt; Full: die Spiegel staffeln einen aufwärts wandernden Reflexionskorridor. · Down — Short: scharfes Splitter-Sweep; Full: breiter Reflektionsriss mit gestaffelten Projektilkopien nur als Effekt.
- **Ausschlüsse:** Keine Dämonenhörner, symmetrischen Flügel, zweite Person oder starrer Spiegelrahmen.
- Palette: `#21343a` `#e6a36d` `#84c9ae` · Material: alteriertes Spiegelglas.

### T10 Aderarchon · *Body Augmentation* · V3.2: Externes pulsierendes Kapillarnetzwerk

- **Anker:** `back_left`, `arm_left/right`, `hip_left`, `sprite_alpha`
- **Idle-Silhouette:** Vier hohle Wurzelglasröhren rahmen Arme und Rippenraum nur von außen; die stärkste Pumpe sitzt deutlich seitlich hinter der Hüfte, nicht in einer Brustplatte.
- **Action-Silhouette:** Die Flüssigkeit pulsiert mit eigener Frequenz; auf jeder Röhrenwand läuft eine helle Front; die gesamte Struktur zieht sich bei schnellen Moves kurz zusammen.
- **Peak Manifestation:** Full fächert die vier Kapillarröhren zur gerichteten Aderlanze oder zu einem bodennahen Saugkreislauf auf; die Körperkleidung wird nicht überzogen.
- **Transform-In / Out:** Eine matte Flüssigkeit steigt in schmalen Außenadern auf und zieht vier elastische Rohrbögen aus Lichtglas; sie verbinden sich an einer asymmetrischen Pumpe. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Kapillarbögen schließen als beweglicher V-förmiger Absorber über der Angriffsseite. · Ein einzelner röhrenförmiger Saugfinger greift nur kurze Distanzen und zieht den Gegner in den bestätigten Kontakt. · Beim Springen hängen Flüssigkeitstropfen hinter der Bewegung; am Apex steigen Blasen in den Röhren auf, bei Landung pulsieren sie sichtbar.
- **Heavies (V3.2-Abbildung):** Forward — Short: schmale Kapillarnadel; Full: vier Röhren entleeren konzentriert in eine vorwärts schießende Aderlanze. · Up — Short: eine Röhre schlägt als Haken hoch; Full: das Rohrnetz richtet mehrere leuchtende Schläuche in eine steile Saugsäule. · Down — Short: kurzer Flüssigkeitskreis; Full: der gesamte Kreislauf entlädt sich in eine flache radial pumpende Bodenblüte.
- **Ausschlüsse:** Keine Fledermausflügel, rote Dämonenaura oder vollständige Blutpanzerung.
- Palette: `#543544` `#c07a78` `#e8cfbd` · Material: organisches Wurzelglas.

### T11 Polartrick · *Energy Extension* · V3.2: Gefalteter Frostpapier-Kometenschwarm

- **Anker:** `back_left`, `hip_right`, `shoulder_left`, `sprite_alpha`
- **Idle-Silhouette:** Drei flache lange Papierkometen schweben in ungleicher Höhe schräg hinter dem Charakter, jeder mit gefrorenen Faltkanten und kleinen freien Blattzipfeln.
- **Action-Silhouette:** Papierblätter knicken ungleichmäßig, die Spitzen brechen zu Schneeclustern; Laufbewegung macht aus ihnen flache Schleppfahnen.
- **Peak Manifestation:** Full Charge faltet die drei Kometen zu einer flächigen nichtbiologischen Frost-Lichtwelle, die wie eine geknickte Scherenschnittbahn aufreißt.
- **Transform-In / Out:** Reif zeichnet drei diagonale Linien von Arm zur Hüfte, die sich wie Papierstreifen aus dem Raum lösen und kristalline Falzkanten bekommen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Drei gefaltete Bahnen legen sich versetzt vor den Avatar und leiten Einschläge entlang der Faltkanten ab. · Ein frostiger Papierstreifen schnellt wie ein Band zur nahen Zielkontur, legt sich nur im gültigen Grab-Fenster an. · Im Jump falten die Kometen zu langen vertikalen Bahnen auf; Apex: kurz flache Querstellung; Landing: gefrorene Papierfetzen prasseln ab.
- **Heavies (V3.2-Abbildung):** Forward — Short: frostiger Faltpunkt; Full: drei Komenten spucken einen geschichteten Aurora-Fächer vorwärts. · Up — Short: eine Papierkante richtet sich hoch; Full: alle Streifen falten zu einem gestuften Aufwärtssturm. · Down — Short: Bodenstrich aus Reifpapier; Full: offene Papierflächen blenden den Bereich in eine kurzlebige frostige Weißzone.
- **Ausschlüsse:** Keine Fuchsgeister, Schneeschweife aus Tierkörpern oder Tierohren.
- Palette: `#e8e5db` `#9c9aca` `#eaaa8c` · Material: gefaltetes Frostpapier.

### T12 Stratospalter · *Body Augmentation* · V3.2: Vier externe Luftdruck-Prankenbügel ohne Tierkörper

- **Anker:** `shoulder_left/right`, `hip_left/right`, `velocity`, `sprite_alpha`
- **Idle-Silhouette:** Vier scharf polierte Druckstützen stehen schräg in der Luft, zwei unterhalb der Schultern und zwei bei der Hüfte; innen offen, ohne sichtbare Hände oder Schulterpanzer.
- **Action-Silhouette:** Die Bügel arbeiten wie nicht synchronisierte pneumatische Federbeine, sie stützen sich nie dauerhaft auf den Avatar selbst ab.
- **Peak Manifestation:** Peak bringt die vorderen Bügel kurz in einen aufprallenden Druckkeil und die hinteren in einen hochdrückenden Luftkanal; keinerlei Tigerkopf.
- **Transform-In / Out:** Kondensierende Luft zeichnet vier schmale Spuren um den Avatar, aus denen harte, federnde Druckbügel mit eingeritzten Pufferkammern treten. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Zwei Bügel federn einen Angriff ab und pressen durch Luftgegendruck in die Ursprungsrichtung. · Ein Bügel schnappt über die kurze Nähe des validierten Ziels, der andere drückt unterstützend hinterher. · Beim Aufstieg stellen hintere Druckstützen senkrecht; Apex: Ventile öffnen; Landung: alle vier Bügel stoßen nach außen und federn nach.
- **Heavies (V3.2-Abbildung):** Forward — Short: seitlicher pneumatischer Wischer; Full: Druckstützen formen einen breiten horizontalen Schallstoß. · Up — Short: eine Druckstütze hebelt hoch; Full: alle vier Bügel schieben eine gestufte Luftdrucksäule aufwärts. · Down — Short: kleiner Pfoten-Puff ohne Tierpfote; Full: Stützen kreuzen am Boden einen weiten Luftdruckring.
- **Ausschlüsse:** Kein Katzen-/Tigerkörper, keine großen biologischen Krallen, kein Exoskelett-Torso.
- Palette: `#285060` `#e7e9dd` `#eead6b` · Material: poliertes Luftdruck-Exometall.

### T13 Fadenschlag · *Body Augmentation* · V3.2: Fadenspule und vier gespannte sichtbare Waffenleitungen

- **Anker:** `shoulder_right`, `weapon_grip`, `hand_left/right`, `sprite_alpha`
- **Idle-Silhouette:** Eine einzelne grob geätzte Spule hängt an einer Schulter; vier dünne Metalldrahtzüge laufen zur aktuell sichtbaren Waffe oder ersatzweise zu Hand-/Focusankern.
- **Action-Silhouette:** Idle: der Spulenrand zittert mit unterschiedlichen Drahtschwingungen; bei Sprüngen und Angriffen läuft eine Materialwelle entlang der Leitungen.
- **Peak Manifestation:** Full lädt alle Fäden auf Spannung und webt vorübergehend ein breites Kampfgeflecht nach vorne; keine zusätzliche Körpermasse.
- **Transform-In / Out:** Vier leuchtende Fäden ziehen die Spule als Paket aus scharfkantigen Metallfasern von der Schulter weg, dann spannen sie sich zur Waffe. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Fäden spannen ein fein graviertes Schutznetz vor die Blickrichtung, das sich bei Hit als Schwingmuster entlädt. · Zwei Drähte verhaken sich im nahen Ziel und werden nur bei bestätigtem Grab kurz eingezogen. · Aufstieg: Fäden strecken hinterher; Apex: Schwingung stoppt kurz; Landung: sichtbares mehrstufiges Zurückschnalzen.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelne gezielte Drahtnadel; Full: gleichzeitig gespannte Filamente schießen als gerichteter Fadenteppich nach vorn. · Up — Short: ein gespannter Faden hakt oben ein; Full: sämtliche Leitungen schlagen als hochgezogenes Gewebe um den Aufwärtsbereich. · Down — Short: kurzer Bodenstich mit einer Drahtspitze; Full: Fäden vernähen mehrere Bodenpunkte zu einem flächigen Impulsfeld.
- **Ausschlüsse:** Keine Puppenarme, keine Riesenschwerter, keine gleichmäßige Spinnennetzkugel.
- Palette: `#193e53` `#d7a856` `#e77b62` · Material: gesponnene Metallfäden.

### T14 Glyphenschmied · *Orbital Construct* · V3.2: Hängendes Glyphenblech-Pendel mit Klammerapparat

- **Anker:** `shoulder_left`, `back_left`, `hand_right`, `sprite_alpha`
- **Idle-Silhouette:** Drei schiefe gestanzte Metallglyphen hängen in einer vertikalen Staffelung an einer einzigen mechanischen Klemme über einer Schulter; keine konzentrischen Zauberkreise.
- **Action-Silhouette:** Die Platten bewegen sich in kleinen Stop-Motion-Rastschritten, dunkle Stanzlöcher bleiben sichtbar; nur geprägte Kerben beginnen langsam zu leuchten.
- **Peak Manifestation:** Full klappt die Glyphenplatten zur großen einmaligen Schriftstanze auf und prägt ein effektvolles Siegel in den Raum; anschließend fährt alles zurück.
- **Transform-In / Out:** Die Kontur projiziert kurze Pressmarkierungen, dann stanzen sich drei getrennte Platten von innen nach außen aus Lichtblech und rasten klickend ein. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Ein Schutzblech dreht sich vor den Charakter und schließt an den gestanzten Rändern. · Die Klammer fährt für einen sehr kurzen mechanischen Halt zu einem Ziel in Grab-Reichweite. · Beim Sprung geraten die Platten aus ihrer gerasterten Lage; oben klicken sie neu und bei Landung rasten sie stufenweise zusammen.
- **Heavies (V3.2-Abbildung):** Forward — Short: schnelles Einzelstempel-Siegel; Full: drei Bleche bilden eine mächtige frontale Schriftwalze. · Up — Short: ein Blech schiebt aufwärts; Full: ganze Rasterstanze stülpt ein gestaffeltes Säulensiegel hoch. · Down — Short: ein Siegelstempel auf Bodenhöhe; Full: mehrschichtiger Druckcodex legt sich über ein großes Bodenfeld.
- **Ausschlüsse:** Keine Runenkrone, kein Standard-Magiekreis, kein symmetrischer Astralkörper.
- Palette: `#25383d` `#d4b482` `#8ad1be` · Material: gestanzte Glyphenbleche.

### T15 Spektralweiche · *Energy Extension* · V3.2: Vier leitende Spektralbänder als kreuzender Flussverteiler

- **Anker:** `back_left/right`, `hand_right`, `weapon_grip`, `sprite_alpha`
- **Idle-Silhouette:** Vier halbtransparente Lichtleitstreifen laufen von unterschiedlichen Rückenpunkten zu Hand, Waffe oder Focus; sie wechseln ihre Reihenfolge bei Farbwechseln, bilden aber keine Flügel.
- **Action-Silhouette:** Farbkerne wandern in unterschiedlicher Geschwindigkeit durch die Innenröhren; Bänder dürfen sich kreuzen, ohne zu verschmelzen.
- **Peak Manifestation:** Full ordnet den Verteiler in eine große Schaltgabel, die mehrere elementare Effektbahnen gleichzeitig freigibt, ohne einen Geisterkörper zu erzeugen.
- **Transform-In / Out:** Ein Prisma bricht als kurzes Lichtsignal an der Schulterkontur auf; aus vier Spaltwinkeln schießen separate leuchtende Leitbänder zur Angriffshand. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Die Bänder legen sich als schräg verschachtelte Leiterbahn vor den Guard und leiten Stoßenergie seitlich weg. · Ein Leitstreifen schnappt zum Nahziel, wobei nur der verankerte Endpunkt bei erfolgreichem Kontakt Halt bietet. · Beim Jump hängen Leitbahnen nach und rücken am Scheitelpunkt nach oben; Landung: Farbstrom verteilt sich erst verzögert wieder gleichmäßig.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein heißer Leitstreifen sendet ein Projektil; Full: alle vier Bahnen bündeln sich zum mehrfarbigen Frontstrom. · Up — Short: elektrischer Hebeimpuls; Full: Leiterbahnen entfalten eine gestaffelte Prisma-Aufwärtsspur. · Down — Short: kalte Sohlenentladung; Full: vier Leitfarben kippen in einen breiten bodennahen Flussverteiler.
- **Ausschlüsse:** Keine komplett ummantelte Ganzkörperaura oder Vierer-Flügelpakete.
- Palette: `#244358` `#f29b75` `#a3d5c1` · Material: transluzente Spektralleitbänder.

### T16 Vierknoten · *Orbital Construct* · V3.2: Vier ungleich gewichtete Pendelknoten im asymmetrischen Orbit

- **Anker:** `back_left`, `back_right`, `root`, `sprite_alpha`
- **Idle-Silhouette:** Statt Körperrüstung schweben vier Pendelgewichte in unterschiedlichen Tiefen und Entfernungen um den Rücken, ihre Aufhängungen sind kurze gewundene Lichtachsen, Größenmaß 0,5–1,6 H.
- **Action-Silhouette:** Jedes Pendel besitzt andere Phase und Eigendrehung; Bewegungen lassen die Gewichte als schweres vierteiliges Mobile nachschwingen.
- **Peak Manifestation:** Full Charge bündelt die Knoten nie zu einem Riesenleib, sondern lässt sie vier verschiedene Stoßachsen im Zielbereich erzeugen.
- **Transform-In / Out:** Vier schmale Lichtlotlinien werden von der Avatarposition aus in den Raum gespannt, an denen metallische Knoten aus Sandpartikeln und Kratzmetall zusammenlaufen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Ein Gewicht dreht als Pendelblock vor die Blickrichtung, die anderen bleiben auf verschiedenen Bahnen verteilt. · Zwei Gewichte kreuzen sich am Nahziel als temporäre Fessel, nach bestätigtem Treffer wird zurückgeschwenkt. · Beim Sprung pendeln Gewichte deutlich nach unten, beim Apex schwingen sie über die Flugbahn, bei Landung folgen vier zeitversetzte Rückstöße.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein Pendel gibt einen konzentrierten Knall frei; Full: alle vier Stoßgewichte detonieren in getrennten Frontintervallen. · Up — Short: oberes Pendel schlägt hoch; Full: Gewichte werden zeitversetzt wie eine aufsteigende Schallleiter geschwungen. · Down — Short: tiefer Pendelhieb; Full: alle Gewichte entladen sich kreisförmig an vier Bodenmarken.
- **Ausschlüsse:** Keine kleinen Dschinnwesen, Kronen oder identischen Satellitenkugeln.
- Palette: `#5f596b` `#d1ba84` `#8faeaa` · Material: mineralische Pendelmetalle.

### T17 Glutmauser · *Energy Extension* · V3.2: Abfallende Glutschindeln als diagonal wandernder Mauserstreifen

- **Anker:** `back_left`, `shoulder_left`, `feet_world`, `sprite_alpha`
- **Idle-Silhouette:** Verkohlte Ofenschindeln hängen nicht als Flügel, sondern reißen in schrägen, gestuften Bahnen vom Rücken ab, unterschiedliche Breite, 1,1–2,0 H.
- **Action-Silhouette:** Idle schälen sich an der höchsten Stufe kleine Glutkacheln ab und wachsen am unteren Ende neu; das Schuppengerüst ist niemals statisch.
- **Peak Manifestation:** Full breitet die aufsteigenden Schindeln zu einem großen gerichteten Wärmesegel aus und löst es kontrolliert in Aschenschauer auf.
- **Transform-In / Out:** Ein Ascheriss läuft über den Oberkörperrand, daraus werden Keramikschindeln nach hinten ausgestoßen, die in der Luft neue heiße Kanten ausbilden. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Schindeln legen sich als gestaffelter Hitzeschild vor die aktuelle Blickrichtung und splittern beim Kontakt. · Ein Schindelhaken hält das Nahziel nur kurz genug für den Treffer. · Aufstieg: Ascheschindeln fallen nach unten; Apex: kurze langsame Schwebe; Landung: entflammtes Neuverglasen von unten nach oben.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein Schindelspan schlägt als Glutnadel vorwärts; Full: viele Schindeln bilden einen länglichen, schnabelfreien glühenden Frontkeil. · Up — Short: Wärmestich nach oben; Full: aufgerissene Schindelschichten ziehen einen großen senkrechten Lichtstrom. · Down — Short: Asche fegt am Boden; Full: die Schindeln veraschen und verglasen in einem großen Boden-Neubildungsfeld.
- **Ausschlüsse:** Kein Phönixkörper, keine Vogelflügel, keine glühende Ganzkörperrüstung.
- Palette: `#413b36` `#d9b08c` `#fae3b4` · Material: verkohlte Lichtkeramik.

### T18 Morphgitter · *Body Augmentation* · V3.2: Offenes Werkzeug-Raster ohne stabile Kreatursilhouette

- **Anker:** `hand_left/right`, `shoulder_left/right`, `hip`, `sprite_alpha`
- **Idle-Silhouette:** Bewegliche Prismenzellen schalten zwischen freien Körperankerpunkten und separaten Werkzeug-Enden; der Spieler steht in einer unvollständigen, flacheren technischen Gitterstruktur.
- **Action-Silhouette:** Idle zeigt unregelmäßige Modulverschiebungen, manche Rasterzellen bleiben transparent; keine aufgesetzte vollständige Tier- oder Menschenfigur.
- **Peak Manifestation:** Full lässt das Gitter nur für den betreffenden Angriff zu einer Kanone, Hebeschiene oder Bodenpresse umstecken; danach öffnen sich wieder alle Verbindungen.
- **Transform-In / Out:** Kleine Prismenzellen klicken zuerst an zwei Armnähten auf, schweben dann nach außen und bauen ein elastisches Raster zwischen vier freien Endpunkten. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Das Gitter faltet sich zu einem kurzen Schildbogen aus freien Zellen, nie zu einem durchgehenden Körperpanzer. · Eine Rasterzange entsteht kurz aus zwei frei gekoppelten Stäben beim validierten Grab. · Im Sprung lösen zwei Verbindungen ihre Spannung, Zellen schweben nach; im Landing schließen die Stecknasen wieder zusammen.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelne Zelle schießt als pfeilartige Spitze; Full: Gitter richtet eine mehrlagige modulare Frontkanone aus. · Up — Short: eine Zelle fährt wie Hebel hoch; Full: viele Module bilden eine offen gelassene Aufwärtsschiene. · Down — Short: kurze Rasterklappe nach unten; Full: Gitterplatte verankert sich als breite Bodenpresse und zerbricht in Module.
- **Ausschlüsse:** Keine Chimärenhörner, kein Drachenkörper, kein Susanoo mit Rasterplatten.
- Palette: `#4d6052` `#e3bb85` `#6d97a4` · Material: prismatische Rasterzellen.

### T19 Schwuranker · *Body Augmentation* · V3.2: Drei schwere hufeisenförmige Ankerklammern

- **Anker:** `shoulder_left`, `hip_right`, `forearm_right`, `feet_world`, `sprite_alpha`
- **Idle-Silhouette:** Eine Klammer hängt über der linken Schulter, eine tiefer an der rechten Hüfte, eine vor dem Unterarm; deutlich negative Innenräume ohne riesigen Brustpanzer.
- **Action-Silhouette:** Idle: die drei Bügel stehen schwer und nahezu still; beim Losrennen schleppen sie eine sichtbare verzögerte Bronze-Bewegung hinterher.
- **Peak Manifestation:** Full rasten die Bügel kurz zu einer gerichteten Ramme oder einem Bodenanker im Raum ein; außerhalb von Angriffen bleiben sie getrennt.
- **Transform-In / Out:** Bronzene Klammerhälften steigen langsam von drei Richtungen auf und schließen im Leerlauf nicht vollständig, nur kurze Lichtnieten verbinden ihre Enden. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Die oberste Klammer schnappt vor den Körper, die untere stabilisiert den Aufprall wie ein Gewicht. · Ein U-Bügel setzt nur beim bestätigten Nah-Grab an der gegnerischen Flanke an und zieht dann kurz zurück. · Beim Sprung bleiben Klammern tief, sie reagieren schwerfällig und schlagen beim Landen versetzt auf gedachte Anschläge.
- **Heavies (V3.2-Abbildung):** Forward — Short: eine Bronzeklammer stößt nach vorne; Full: drei Klammern rasten zur langen belichteten Rammschiene ein. · Up — Short: obere Klammer hebt; Full: zwei U-Bügel werden senkrecht wie ein offenes Burgtor hochgefahren. · Down — Short: tiefer Knie-Ankerstoß; Full: schwere Klammern verankern drei Bodenpunkte und verursachen eine wandernde Erschütterung.
- **Ausschlüsse:** Kein kompletter goldener Schildritter oder externer Giant-Torso.
- Palette: `#303940` `#bd986a` `#a6c2b0` · Material: schweres Ankerbronze-Glas.

### T20 Taktklinge · *Body Augmentation* · V3.2: Rhythmische Klingenkanten direkt an Bewegungsachsen

- **Anker:** `hand_left/right`, `feet_world`, `velocity`, `sprite_alpha`
- **Idle-Silhouette:** Kein großer statischer Avatar: zwei kurze facettierte Klingenränder markieren Unterarme, mehrere kleine Taktkerben blitzen ausschließlich an tatsächlichen Bewegungsenden der Füße.
- **Action-Silhouette:** Im Idle fast unsichtbar, nur zwei wechselnde Nadelleuchten; Bewegung erzeugt taktgenaue Scherlicht-Konturen mit klar getrennten Nachleuchtfenstern.
- **Peak Manifestation:** Full Charge erweitert die existierende Angriffsbewegung um eine große rhythmische Folge aus gestaffelten Schnittwellen; keine Riesenmanifestation nötig.
- **Transform-In / Out:** Bei Aktivierung laufen metallische Lichtstriche über den echten Körperrand; nur an Hand- und Fußregionen lösen sich zeitlich versetzte Kanten ab. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Zwei Klingenkanten schließen sich als kurze X-Barriere direkt vor dem Guard. · Der bestätigte Grab löst einen einzigen harten Taktimpuls aus dem Unterarm aus und unterstützt den normalen Nahgriff. · Jump hat kleine Lichtimpulse beim Takeoff, Apex und Landing, keine schwebende Gestalt.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelner akzentuierter Pulse Cut; Full: mehrere rhythmisch versetzte Schneidbahnen begleiten die originale Vorwärtsaktion. · Up — Short: markierte Aufwärtsklinge; Full: mehrere zeitlich versetzte höhere Kanten treten nacheinander auf. · Down — Short: Bodentakt an einem Schritt; Full: eine gestufte Kaskade von Schritt-Schnittlinien läuft durch die Lane.
- **Ausschlüsse:** Keine große Figur, keine schwebenden Schulterpanzer, keine Dauerpartikelwolke.
- Palette: `#244451` `#efba7a` `#87c7b0` · Material: geschliffene Takt-Schneiden.

### T21 Orbitpranke · *Orbital Construct* · V3.2: Kompakter Schwarm aus porösen Orbitklauen

- **Anker:** `hand_left/right`, `elbow_left/right`, `sprite_alpha`
- **Idle-Silhouette:** Nur einige scharfkantige Keramikbrocken umkreisen Hände und Ellenbogen in getrennten engen Bahnen; keine zweite Körperkontur, Höhe höchstens 1,4 H.
- **Action-Silhouette:** Die Teilchen springen bei jedem Nahkampftreffer kurz auf, stehen danach wieder in zwei ungleichen Rotationsbahnen.
- **Peak Manifestation:** Full bündelt die kleinen Orbitkörper zu einer großen reinen Angriffsprojektion, beispielsweise einem Beam-Trichter, aber niemals einer permanenten großen Körperform.
- **Transform-In / Out:** Porenlichter an den Handkanten treiben fünf kleine Kristallbrocken heraus, die sich zu einem offenen Orbit gruppieren. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Handnahe Kristallklauen schieben sich als dichte Schale auf die Angriffsseite, nach Treffer fliegen sie wieder auseinander. · Zwei orbitale Splitter greifen nur den Nahbereich an und verriegeln um das validierte Ziel. · Beim Sprung ziehen die Orbitkörper elliptische Spuren hinter den Händen und werden am Apex kurz langsam.
- **Heavies (V3.2-Abbildung):** Forward — Short: kompakter Ki-Splitterstoß; Full: orbitale Klauen ordnen sich kurz zur facettierten Beam-Düse. · Up — Short: einzelne Kristallklaue schießt hoch; Full: Orbitkörper folgen einer gekrümmten Kometenbahn nach oben. · Down — Short: kurzer Sohlenpuls; Full: alle Partikel dehnen sich schlagartig zu einem radialen Keramikimpuls aus.
- **Ausschlüsse:** Keine Aura-Dragonball-Faustgestalt, kein permanentes riesiges Humanoid.
- Palette: `#1e3853` `#f2b16f` `#b9cfd6` · Material: poröse Orbitkeramik.

### T22 Zündschuppe · *Body Augmentation* · V3.2: Lokal gezündete Gelenkplättchen, keine Schuppenhaut

- **Anker:** `shoulder_left`, `hand_right`, `knee_left/right`, `sprite_alpha`
- **Idle-Silhouette:** Fünf bis sieben matte Schuppenkacheln sitzen mit Abstand an Knie, Handrücken und Schulter; jede besitzt eine sichtbare dünne Brandkerbe, aber kein durchgehendes Oberkörperkostüm.
- **Action-Silhouette:** Idle: kleine Brandfunken bewegen sich wie Sicherungsdrähte von Kachel zu Kachel; die Kleidung bleibt klar sichtbar.
- **Peak Manifestation:** Full nimmt die lokalen Kacheln als Ausgang für großflächige Feuerbahnen; nur während Release bilden sich externe Angriffskonstrukte.
- **Transform-In / Out:** Einzelne Zündpunkte laufen entlang der Sprite-Alphakontur und lassen nacheinander wenige grüne Keramik-Kacheln an Kontaktpunkten auskragen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Gelenkkacheln heben sich zu einer dreiteiligen gedämpften Stoßschicht unmittelbar vor dem Avatar. · Zwei Zündplatten verhaken für den Trefferframe eine nahe Zielkontur, ohne lange zusätzliche Gliedmaßen. · Beim Sprung brennen die Kacheln jeweils versetzt und der Landeimpuls zündet zuletzt die Sohlenplatten.
- **Heavies (V3.2-Abbildung):** Forward — Short: Knöchelglut beim einzelnen Schlag; Full: mehrere Kacheln entladen eine breite brennende Frontbahn. · Up — Short: glimmende Schulterkante schlägt aufwärts; Full: Kachelketten werfen eine schraubige vertikale Energiefräse. · Down — Short: kurzer Feuertritt; Full: Gelenkkacheln trennen sich und detonieren in einem weiten Bodenmuster.
- **Ausschlüsse:** Keine Drachenrüstung, kein Reptilienkopf, kein biologisches Schuppenkostüm.
- Palette: `#4b4b45` `#c0d0a0` `#d66f52` · Material: geprägte Zündschuppen.

### T23 Nullfeldträger · *Orbital Construct* · V3.2: Negativräume und echter Lichtentzug

- **Anker:** `shoulder_left`, `hand_right`, `hip`, `sprite_alpha`, `scene_color`
- **Idle-Silhouette:** Drei geometrisch ungleiche Löcher im Bildraum schweben neben Hand und Schulter; ihre Innenflächen zeigen Auslöschung von hinteren VFX-Layern und einen dünnen dithernden Lichtrand.
- **Action-Silhouette:** Innen fehlt Inhalt, statt schwarz gefülltem Shader; minimale Randverzeichnung und vorbeiziehende Löschpunkte machen die Leere lesbar.
- **Peak Manifestation:** Full verbindet die Löcher nur als temporären breiten Auslöschungskorridor über der Angriffsbahn; keine Person entsteht daraus.
- **Transform-In / Out:** Entlang einzelner Konturpixel geht der Glanz aus, aus dieser Auslöschung falten sich drei offene, unregelmäßige Negativräume. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Ein Negativraum deckt die Blickseite ab und verschluckt auftreffende Effektpartikel nach Gameplay-Freigabe. · Ein enger Negativfeldkragen erscheint nur am erreichbaren gegnerischen Kontaktpunkt; der Avatar selbst behält freie Kontur. · Beim Sprung zieht ein Loch nach unten, ein anderes läuft über den Kopf, bei Landung kollabieren beide zu kurzen Ditherpunkten.
- **Heavies (V3.2-Abbildung):** Forward — Short: dünner Löschschnitt direkt vor dem Angriff; Full: mehrere offene Löcher wachsen zu einem kurzlebigen gerichteten Zauberverzehrer. · Up — Short: schmale Nullkante nach oben; Full: ein Bildraumstreifen wird vertikal sichtbar ausgelöscht. · Down — Short: kleiner stiller Bodentritt; Full: die drei Negativräume verbinden sich zu einem flachen Störfeld entlang der Lane.
- **Ausschlüsse:** Kein schwarzer Dämonenpanzer, keine invertierten Vollkörper-Flügel, kein reiner Schwarzkreis.
- Palette: `#333743` `#e8e2d9` `#a9d77f` · Material: lichtabsorbierendes Negativfeld.

### T24 Fadenregent · *Creature Manifestation* · V3.2: Zwei gelenkige Schattenmarionetten an sichtbaren Zugfäden

- **Anker:** `back_left/right`, `shadow_contact`, `sprite_alpha`
- **Idle-Silhouette:** Zwei flache Schattenbühnen-Körper hängen versetzt links und rechts hinter dem Avatar an deutlich sichtbaren diagonalen Lichtfäden; nur flache Gelenkplatten, keine vollständigen Geistersoldaten.
- **Action-Silhouette:** Idle: Die Figuren rucken wie von Schnüren gezogen, klappen ungleichmäßig und bleiben klar kleiner als der Spieler, nicht überlebensgroß.
- **Peak Manifestation:** Full mobilisiert temporär mehrere Schattenabzüge als Projektion auf den Boden, keine eigenständigen kompletten kämpfenden Riesenwesen.
- **Transform-In / Out:** Aus zwei schmalen Schattenflecken wachsen diagonale Zugfäden nach oben; ihre kurzen Gelenkplatten klappen zu zwei getrennten, flachen Silhouetten aus. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Eine der flachen Bühnenfiguren klappt vor den Guard und absorbiert mit ihrem breiten, matten Schattenrücken. · Die vordere Marionette fährt zum validierten Nahziel und klemmt es mit einem kurzen Scherengelenk fest. · Beim Springen bleiben die Lichtfäden hinter dem Charakter hängen und straffen sich bei Landung sichtbar.
- **Heavies (V3.2-Abbildung):** Forward — Short: eine Marionette wirft ein Schattenplättchen; Full: beide Figuren spannen ihre Fäden zu einem breiten Speerprojektil. · Up — Short: kleiner hochgezogener Gelenkhieb; Full: Zugfäden ziehen eine mehrteilige aufsteigende Schattenkulisse. · Down — Short: tiefer Schattenwischer; Full: Schattenabdrücke laufen wie marschierende Bühnenfiguren über mehrere Bodenpunkte.
- **Ausschlüsse:** Keine Armee vollwertiger Schattenritter oder riesigen Susanoo-Schattenkörper.
- Palette: `#293d5b` `#e0cba5` `#ce945e` · Material: schattengefärbte Fadenmarionetten.

### T25 Hämolith · *Body Augmentation* · V3.2: Mineralisierte Kapillarstacheln an Unterarmen

- **Anker:** `forearm_left/right`, `hand_left/right`, `sprite_alpha`
- **Idle-Silhouette:** Dünne blutrote Glasadern umranken nur Unterarm- und Handkonturen, von denen unregelmäßige kristalline Stacheln nach außen wachsen; geringe Idle-Breite.
- **Action-Silhouette:** Idle pulsiert Flüssigkeit in den Kapillaren, doch keine Klingen schweben als riesiges Handpaar; die Adern härten periodisch zu matter Steinoberfläche aus.
- **Peak Manifestation:** Full treibt aus den Kapillararmen einzelne große extern entstehende Lanzen, Haken oder Bodenpflanzen und zerbricht diese nach dem Impact.
- **Transform-In / Out:** Eine einzelne rote Glasader zeichnet sich auf der wahren Armkontur nach, verästelt sich zu schmalen Kanälen und bildet abgeknickte Mineralkanten. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Rotmineralisierte Stacheln werden zu einer kurzen konischen Armbarriere vorgeschoben. · Kurze Kristallhaken greifen die Nähe, die Spielfigur verwendet weiterhin ihre vorhandene Grab-Pose. · Im Sprung folgen einzelne Glasstacheln der Armbewegung; beim Landen zerplatzen verschlissene Kristallkerben in Staub.
- **Heavies (V3.2-Abbildung):** Forward — Short: Kapillarnadel aus der Hand; Full: minerale Adern formen eine schwere lineare Blutglaslanze. · Up — Short: kurzer hochschnellender Glasbogen; Full: mehrere Stacheln schließen sich zu einer hängenden kristallinen Fangstruktur. · Down — Short: Stacheltritt; Full: rote Mineraladern schießen unter mehreren Bodenzielen als Dornenbeet hervor.
- **Ausschlüsse:** Keine dämonische rote Rüstung und keine doppelten Riesenarme.
- Palette: `#5a4551` `#b88483` `#d4b0a7` · Material: mineralisiertes Aderglas.

### T26 Resonanzwache · *Temporal Projection* · V3.2: Klangarmatur aus drei frei versetzten Schnurflächen

- **Anker:** `back_left/right`, `shoulder_left/right`, `sprite_alpha`
- **Idle-Silhouette:** Drei halbtransparente, unterschiedlich lange Schnurrahmen hängen leicht seitlich hinter dem Avatar und reagieren wie gespannte Instrumentensaiten; keiner besitzt Hände, Schulter oder Kopf.
- **Action-Silhouette:** Idle: langsame Schwebewellen über die Schnüre; bei Bewegung werden daraus kurze, nicht synchrone Wellenzüge mit staubigem Klanglicht.
- **Peak Manifestation:** Full spannt die Schnurflächen breit zu einer einmaligen vertikalen oder horizontalen Klangklinge und löst sie sofort wieder.
- **Transform-In / Out:** Kurze Lichtschläge auf der Spritekontur setzen drei hohlkeramische Stimmstege frei, zwischen denen gewobene Schnurflächen zu schwingen beginnen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Die vordere Schnurfläche wird gespannt wie ein schräges Membranschild, Hit erzeugt kurz eine konzentrische Klangkerbe auf der Fläche. · Eine kurz ausgezogene Schnur greift nur in Nahreichweite; die Zielreaktion wird als Druckstoß und nicht als Riesenhand sichtbar. · Jump: die Schnüre hängen elastisch nach, am Apex laufen umgekehrte Schwingwellen, bei Landung erklingt eine sichtbare Drucklinie.
- **Heavies (V3.2-Abbildung):** Forward — Short: eine scharfe Klangkerbe sticht nach vorne; Full: alle Schnurflächen vereinigen sich zur großen messerscharfen Welle. · Up — Short: Einzelmembran hebt sich; Full: gestaffelte Klangstege steigen als resonierende Säule. · Down — Short: kurzer Resonanztritt; Full: ein schweres tiefes Klangfeld breitet sich aus der Membran über den Boden aus.
- **Ausschlüsse:** Keine zweite Geisterperson und keine vollständig umhüllende Klangkuppel.
- Palette: `#4a554f` `#d4b78d` `#739f9b` · Material: resonierende Stimmkeramik.

### T27 Faltspur · *Body Augmentation* · V3.2: Bewegliche Raumfalten wie gestapelte Papierkanten

- **Anker:** `elbow_left/right`, `hip`, `root`, `sprite_alpha`
- **Idle-Silhouette:** Mehrere rechteckige räumliche Knicklinien schweben nah an Ellenbogen und Hüfte; sie zeigen Hintergrundstreifen auf verschiedenen Tiefen, ohne Rahmenbildschirm.
- **Action-Silhouette:** Bei Idle wechseln die Raumfalz-Streifen diskret ihre Tiefe; bei Sprint bleibt eine kurze umgeknickte Etappe im Weltkoordinatensystem zurück, bevor sie nachzieht.
- **Peak Manifestation:** Full legt eine breite Faltnaht zwischen Spieler und Angriffspunkt, über die Wirkung umgeleitet oder kurz versetzt abgegeben wird.
- **Transform-In / Out:** Ein kurzer Avatarumriss erscheint versetzt, klappt wie ein Papierfalz nach innen und hinterlässt drei zerknickte Wegmarken in verschiedenen Winkeln. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Eine Falzkante dreht in die Blickrichtung und biegt sichtbare Projektile um die Außenfläche. · Die erste Papierfalte verbindet den Spieler mit einem nahen Gegner, aber die tatsächliche Versetzung erfolgt nur nach bestätigtem Grab. · Beim Sprung schiebt sich eine Falte kurz unter den Player-Root wie eine Stufe; sichtbare Sprunghöhe stammt weiter aus Physik.
- **Heavies (V3.2-Abbildung):** Forward — Short: kleiner räumlicher Nadelstich; Full: ein langer gefalteter Raumspalt richtet die Vorwärtswirkung neu aus. · Up — Short: kurze Faltstufe hebt; Full: gestapelte Raumlaschen lassen einen vertikalen Spalt entstehen. · Down — Short: Falzlinie am Boden; Full: mehrere Richtungsmarken knicken die Bodenkoordinaten optisch auseinander.
- **Ausschlüsse:** Kein Zeitportal mit Standardring, kein riesiges Bildfenster, keine humanoide Projektion.
- Palette: `#273b57` `#9fcdbd` `#e9ab7e` · Material: gefaltete Wegmarkenfolie.

### T28 Rasterdom · *Environmental State* · V3.2: Lokale Bodenarchitektur aus drei Rasterbögen

- **Anker:** `feet_world`, `root`, `world_ground`, `sprite_alpha`
- **Idle-Silhouette:** Drei zerbrochene bauliche Bögen sitzen auf tatsächlichen Lane-Kontaktpunkten rund um den Spieler, nicht an Schultern oder Armen; sie stehen im Idle nur bis etwa 1,6 H hoch.
- **Action-Silhouette:** Die Rasterbögen stehen weltverankert; bei Bewegung werden hintere Segmente abgebaut und vor der aktuellen Position neu gesetzt, ohne am Spieler wie eine Rüstung mitzuschweben.
- **Peak Manifestation:** Full baut aus den drei Bögen kurz einen dominanten begehbaren Regelkorridor mit klaren Zieltelegraphen, nie eine riesige schwebende Figur.
- **Transform-In / Out:** Schraffierte Grundrisse zeichnen sich um die Fußpunkte, aus ihnen wachsen drei unvollständige geometrische Bögen mit gebrochenen Gitterrippen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Ein Rasterbogen klappt auf der Angriffsseite zu einem lokalen Wall-Paneel, mit korrekt sortierten Projektildurchgängen. · Ein Bodenraster arretiert nahes Ziel kurz per kleinem Fangpolygon statt externem Arm. · Beim echten Jump bleiben Bögen auf World-Ground; nur eine feine Rasterlotlinie folgt der Höhe; neue Bögen entstehen erst nach Landung.
- **Heavies (V3.2-Abbildung):** Forward — Short: kleiner Regelstich entlang eines einzelnen Gitters; Full: ein mehrteiliger Rune-Edikt-Korridor fährt nach vorne. · Up — Short: Rasterecke schiebt nach oben; Full: eine echte bauliche Säule wächst aus dem Boden und fällt nach Ablauf zusammen. · Down — Short: lokal gesetztes Bodensiegel; Full: drei Bögen schließen für eine begrenzte Zeit ein größeres Feld mit neuen Regeln ein.
- **Ausschlüsse:** Keine Anime-Domänenkugel, keine Schultermechanik, kein bodenloser Riesenkäfig.
- Palette: `#314a57` `#e8ca9c` `#99d2bc` · Material: schraffiertes Domraster.

### T29 Werkgestalt · *Orbital Construct* · V3.2: Drei autonome Werkzeugreliquien im ungleichen Orbit

- **Anker:** `hip_left/right`, `hand_right`, `root`, `sprite_alpha`
- **Idle-Silhouette:** Eine Zange, ein freies Pendel und eine Spindel schweben unterhalb Brusthöhe um unterschiedliche Seiten des Avatars; sie bilden sichtbar keine Gliedmaßen.
- **Action-Silhouette:** Jede Reliquie führt eigene langsame Prüfbewegungen aus: Zange klickt, Spindel rotiert, Pendel lotet; das Spieler-Sprite bleibt unverändert.
- **Peak Manifestation:** Full klicken die drei Werkzeuge zeitweilig zu einer externen Lanze oder einem Bodenbohrer zusammen und lösen sich danach wieder.
- **Transform-In / Out:** Aus schimmernden Abriebspuren steigen drei mechanische Werkzeuge frei auf; ihre abgesetzten Kanten schließen sich mit kleinen magnetartigen Impulsen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Die Zange greift vor den Guard, Pendel und Spindel bleiben frei und reagieren sekundär. · Bei Nahgrab schließt die Zange um ein Ziel in Reach; das Pendel verstärkt den Zugmoment. · Jump: alle drei Werkzeuge schweben mit verzögerten Bahnen hinter dem Spieler, ohne eine Rüstung zu ergeben.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein kurzer Abriebsplitter aus der Spindel; Full: Werkzeuge verbinden ihre Schneiden zu einer geraden externen Speerlänge. · Up — Short: Pendel stößt hoch; Full: die Spindel bohrt einen hohen vertikalen Werkzeugschacht frei. · Down — Short: schwere Zange tippt auf Boden; Full: drei Apparate rasten um ein Bodenziel in eine konvergente Arbeitseinheit ein.
- **Ausschlüsse:** Keine Reliquienkrone, keine schwebenden Riesenarme oder gerüstartiger Rumpf.
- Palette: `#515852` `#d2a06d` `#a8c7b9` · Material: wandernde Werkzeugkeramik.

### T30 Leisefaden · *Energy Extension* · V3.2: Extrem reduzierte Stealth-Saumform mit einem Schattenband

- **Anker:** `shoulder_right`, `hip`, `sprite_alpha`, `velocity`
- **Idle-Silhouette:** Nur ein schmales, nicht permanent sichtbares Band löst sich aus der Körperkontur und läuft mit einigen Pixeln Abstand neben ihr; der größte Teil des Sprites bleibt unbeeinflusst.
- **Action-Silhouette:** Idle nahezu unsichtbar, sporadisch wird eine versetzte Konturstrecke sichtbar; beim schnellen Lauf reißt diese mehrfach ab.
- **Peak Manifestation:** Full bringt nur für eine kurze Aktion eine große Schatten-Schnittfläche aus der losen Saumspur hervor, niemals ein dauerhaft großes Monster.
- **Transform-In / Out:** Eine einzelne dunkle Fuge öffnet an der Schulter, ein loser Faden löst sich und erscheint erst bei Bewegungsbeginn hinter dem Körper. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Band verdichtet sich für einen Augenblick zu einem schmalen Gegenlichtschutz vor den Armen. · Die Schattennaht verhakt sich auf kurze Distanz am Zielschatten nach normalem Grab-Treffer. · Jump: das Band läuft ein Stück unter dem Originalsprite weiter und trifft erst später in der Luft wieder an ihm ein.
- **Heavies (V3.2-Abbildung):** Forward — Short: kurzes Ausfransen der Handkontur; Full: die eine Schattennaht wird für einen weiten, verzögerten Peitschenschnitt vervielfältigt. · Up — Short: kleiner Schattenhaken; Full: mehrere zeitversetzte Konturstreifen steigen über dem Avatar hoch. · Down — Short: bodennahe Fadenspur; Full: Schattenfaden zieht eine weitläufige, dunkle Laufbahn durch die Bodenebene.
- **Ausschlüsse:** Kein Katzensprite, keine neun Tierleben-Schweife, keine Riesen-Schattenkonstrukte.
- Palette: `#293434` `#ced0b0` `#d59a7e` · Material: getarnte Fadenmaterie.

### T31 Klingenherbarium · *Orbital Construct* · V3.2: Asymmetrischer Schwarm mineralischer Klingenkeime

- **Anker:** `back_left`, `shoulder_left`, `weapon_grip`, `sprite_alpha`
- **Idle-Silhouette:** Ein offener Fächer aus flachen dreieckigen Glimmersamen kreist nicht gleichmäßig, sondern in zwei versetzten Gruppen um eine leere Waffenfassung hinter der Schulter.
- **Action-Silhouette:** Bei Idle flattern die Samen mit unterschiedlich schweren Kanten, stellen sich zur Kamera und kippen wieder weg; die Mitte bleibt durchsichtig.
- **Peak Manifestation:** Full sammeln sich mehrere Samen nur für den Impact zu einer weiten Klingenwelle oder einer großen aufsteigenden Blätterfontäne.
- **Transform-In / Out:** Kristallstiele brechen aus wenigen Schulterpartikeln hervor; daraus lösen sich zehn unterschiedliche Glimmersamen und ziehen zwei separate Umlaufbahnen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Einige Samen drehen ihre breiten Facetten zur Angriffsseite und bilden einen löchrigen, mehrschichtigen Messerschild. · Zwei Klingenkeime greifen als kurze Scheren gegen ein nahes, korrekt validiertes Ziel. · Im Sprung ziehen die Samen in einer gegenläufigen Schleppe hinterher, an der Landung wirbeln sie um die Füße zurück.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelner mineralischer Samenstich; Full: beide Schwärme lösen sich als tausendfach geschichtete Klingenwelle nach vorne. · Up — Short: ein Keim steigt hoch; Full: gefächerte Samenbahnen schrauben sich als breite aufsteigende Säule. · Down — Short: einige Klingenkeime fallen senkrecht; Full: Schwarmspitze bildet eine bodennahe sternförmige Angriffsblüte.
- **Ausschlüsse:** Keine Kirschblütenkopie, kein Ganzkörper-Pflanzenkostüm, keine starren Kreisschwärme.
- Palette: `#2d5a52` `#d7bb99` `#c06f66` · Material: mineralisierte Pflanzenklingen.

### T32 Taktfunke · *Body Augmentation* · V3.2: Fuß- und handgebundener Impulsrhythmus statt Aurafigur

- **Anker:** `feet_world`, `hand_left/right`, `weapon_tip`, `sprite_alpha`
- **Idle-Silhouette:** Nur bei echten Bewegungsereignissen erscheinen kurze, scharfkantige Akzentpixel an Knöcheln und Waffenkontakt, die sonst leer bleiben.
- **Action-Silhouette:** Idle: minimaler Fußpuls alle paar Takte; Sprint: kurze kantige Fußkometen; jeder Treffer erzeugt anders gerichtete Notch-Lichter.
- **Peak Manifestation:** Full verdichtet mehrere zeitlich getrennte Attack-Akzente zu einer einzigen hohen Entladung oder Staffelblitzfront.
- **Transform-In / Out:** Ein silbriggelber Taktfunke durchläuft die Körperkontur, teilt sich in drei Impulsknoten und verschwindet wieder nahezu vollständig. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Block erzeugt ein einzelnes hartes Impulskreuz unmittelbar am Kontaktpunkt, ohne zusätzlichen Schildkörper. · Ein gültiger Grab lässt einen rhythmischen Unterarmimpuls die Griffhaltung verstärken. · Jump: nur Takeoff-/Apex-/Landing-Akzente, keine Flügel, keine schwebenden Zusatzkörper.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelner seitlicher Blitzkerb-Schnitt; Full: eine rhythmisch geteilte Serie von sechs Lichtblitzen vorwärts. · Up — Short: einzelner senkrechter Tracer; Full: nacheinander höher tönende Kanten bilden eine vertikale Blitzstaffel. · Down — Short: Fuß-Knackpunkt; Full: die Taktimpulse fließen als flache gewitterartige Bodenpartitur aus.
- **Ausschlüsse:** Keine Dauer-Elektrorüstung und kein riesiger humanoider Blitzavatar.
- Palette: `#363b42` `#d8bc6b` `#78baaf` · Material: rhythmische Funkenmetallkanten.

### T33 Nachtmaß · *Body Augmentation* · V3.2: Messzirkel-Stealth aus zwei frei schwenkbaren Bügeln

- **Anker:** `shoulder_right`, `knee_left`, `facing`, `sprite_alpha`
- **Idle-Silhouette:** Ein kleiner Zirkelbogen schwebt nah an der Schulter, der zweite am gegenüberliegenden Knie; zwischen beiden flackern unregelmäßige matte Schattenfolien.
- **Action-Silhouette:** Idle: feine Messbewegungen und kurze unscharfe Randverschiebungen; beim Sprint zeichnen die Zirkel abstrakte Zielbahnen, keine Personen-Doppelung.
- **Peak Manifestation:** Full spreizen die zwei Zirkel einen weiten sichelartigen Dunkel-Schnittkanal über eine Angriffsrichtung, der sofort wieder verschwindet.
- **Transform-In / Out:** Von zwei realen Konturstellen fahren Messspitzen aus, schlagen ungleiche Winkel an und ziehen nur an ihren Rändern dunkle Kurzfäden. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Zirkel schieben sich vor die Arme, verbinden sich mit einer dünnen Schattenmesslinie zur Parry-Kante. · Der untere Zirkel klappt an einem nahen Ziel für einen präzisen Spannkontakt zu. · Im Sprung wandert der Kniezirkel nach unten, der Schulterzirkel zeichnet versetzte Winkel und beide rasten nach Landung ein.
- **Heavies (V3.2-Abbildung):** Forward — Short: eine schmale Schattenmesserkante; Full: beide Messzirkel schneiden nacheinander über eine größere horizontale Bahn. · Up — Short: steigende Messlinie; Full: zwei Schattenebenen reißen einen breiten Vertikalspalt. · Down — Short: bodennaher Zirkelstreich; Full: Messlinien drehen sich zu einer flachen gezackten Schattenbahn.
- **Ausschlüsse:** Keine Ninja-Stirnbänder, keine Schattenklonperson, keine dauerhafte Ganzkörperverschattung.
- Palette: `#3b4359` `#c1b6a1` `#94b8b7` · Material: gedämpfte Schattenfolien.

### T34 Sternwerk · *Levitation State* · V3.2: Externer Werkprojektor statt Geisterbegleiter

- **Anker:** `shoulder_left`, `back_left`, `hand_right`, `sprite_alpha`
- **Idle-Silhouette:** Drei angewinkelte Keramiksegmente bilden einen unvollständigen Projektor hinter einer Schulter; in seinem Mittelpunkt schwebt eine leere, frei sichtbare Werkzeugfassung.
- **Action-Silhouette:** Idle: kleine Justierschritte der drei Segmente, sternartige Einschlüsse drehen sich im Innenraum; ohne eigene Riesenarme und ohne separate Pet-Animationen.
- **Peak Manifestation:** Full stellt die Projektion temporär als mehrere kleine Effekte, Volleys oder Mine-Symbole ins Feld, nicht als Körperpanzer.
- **Transform-In / Out:** Aus drei Lichtpunkten entfalten sich Porzellanarme nach außen, schließen sich um ein offenes Werkzeugloch, das bei Idle leer bleibt. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Die offenen Segmente neigen sich zur Guard-Seite und projizieren einen lokalen facettierten Abwehrschirm. · Für bestätigten Grab rastet kurz ein instrumentenartiger Fangbügel aus der offenen Projektoröffnung zum Nahziel. · Beim Sprung schwenkt der Werkprojektor nach unten, richtet sich am Apex neu aus und schließt bei Landung kurz sein leeres Zentrum.
- **Heavies (V3.2-Abbildung):** Forward — Short: kleines Projektorgeschoss; Full: die drei Segmente richten mehrere diskrete Frontsalven mit eigener Zielbahn aus. · Up — Short: ein Projektionsteil wirft ein Lichtstück hoch; Full: der Projektor baut eine gestaffelte Aufwärtsleiter aus Einzellichtern. · Down — Short: einzeln gesetzte Keramikmine; Full: alle drei Segmente bauen temporär eine orbitale kleine Festungszone auf dem Boden.
- **Ausschlüsse:** Keine autonome Geisterarmee, keine zweite riesige Person, keine Sternenkrone.
- Palette: `#2d4766` `#cbaa77` `#b5c4ba` · Material: stellare Werkkeramik.

### T35 Kältestillstand · *Environmental State* · V3.2: Frostbeschlagene Kondensationsbänder mit Zeitstottern

- **Anker:** `hand_left`, `hip_right`, `back_left`, `sprite_alpha`
- **Idle-Silhouette:** Drei unterschiedlich lange gebrochene Glasbahnen liegen nah an Arm, Hüfte und Rücken, getrennt durch ruhige leere Bildräume; kein großer Zeitchronometer.
- **Action-Silhouette:** Idle: jedes Band hält sporadisch für wenige Frames an und springt an seine physikalisch geglättete Position zurück, langsamer als echte Bewegung.
- **Peak Manifestation:** Full zieht die Bänder zu einer stotternden frostigen Zeitspur, die gegnerische Zonen verlangsamt; kein Stop-Time-Effekt ohne Gameplay-Mechanik.
- **Transform-In / Out:** Frostkondensat beginnt an ausgewählten echten Kanten, zieht drei geknickte Zeitglasbahnen aus dem Hintergrund und hinterlässt kurze unbewegliche Ditherpartikel. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Kondensationsbänder schichten sich kurz vor der Blickseite als frostige Verzögerungsfläche. · Ein Frostband fängt ein nahes Ziel bei bestätigtem Grab mit verzögerter Release-Geste. · Im Jump bleiben Bildreststreifen auf mehreren Höhen für kurze Zeit zurück, ohne den eigentlichen Player-Root einzufrieren.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelner frostiger Zeitimpuls; Full: eine breite gefrorene Standbildspur läuft in Blickrichtung. · Up — Short: kurzer Glashaken nach oben; Full: mehrere Zeitglasstreifen fahren als verspätete Eis-Aufstiegsbahn hoch. · Down — Short: kleiner kalter Fußstopp; Full: frostige Zeitbahnen verwirbeln zur flachen Bodennebel-Verzögerungszone.
- **Ausschlüsse:** Keine Uhrzeiger, Stop-Time-Kugel oder Eisplatten-Humanoid.
- Palette: `#66757a` `#d6e5d6` `#d9a99a` · Material: frostbeschlagene Chronokeramik.

### T36 Bollwerklicht · *Energy Extension* · V3.2: Drei seitliche Lichtsegel als ortsgebundene Stützen

- **Anker:** `back_left/right`, `shoulder_left`, `feet_world`, `sprite_alpha`
- **Idle-Silhouette:** Drei geknickte Leuchtsegel ragen in unterschiedlichen Winkeln von Rückenankern seitlich nach außen, mit deutlich offenen Zwischenräumen; sie tragen keine Federn oder Flügelarchitektur.
- **Action-Silhouette:** Idle: jedes Segel hebt sich geringfügig mit anderem Rhythmus; beim Rennen rücken ihre Enden hinter den Avatar und nehmen den lokalen Schattenwurf mit.
- **Peak Manifestation:** Full richten sich die Segel zu einem breit ausgefächerten Lichtanker aus, der klare Angriffs- oder Schutzbahnen in die Lane zeichnet.
- **Transform-In / Out:** Dünne seidig helle Linien laufen über die eigene Schulterkontur und werden zu drei abgenutzten Metallsegeln, deren matte Innenflächen nacheinander Licht tragen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Zwei Paneele stellen sich als asymmetrische Schirme vor den Avatar, das dritte bleibt als Seitenanker. · Der kleinste Lichtanker fixiert kurz den Nahkontaktpunkt des Grab, bevor die Paneele wieder auseinandergehen. · Jump: Segel kippen nach unten, leiten nur VFX-Trails nach, sie verleihen keine neue Flugphysik.
- **Heavies (V3.2-Abbildung):** Forward — Short: schmaler Ankerfunke nach vorn; Full: Segel richten einen breiten, seidigen Lichtstrahl aus. · Up — Short: kleine hochschlagende Lichtkante; Full: drei Paneele synchronisieren eine gestaffelte lichtdurchzogene Aufwärtsbahn. · Down — Short: kurzer Lichtpuls an den Füßen; Full: Segel verankern eine große temporäre Schutzzone im Boden.
- **Ausschlüsse:** Keine Engelsflügel, Heiligenschein oder goldene Rittergestalt.
- Palette: `#344d69` `#cbdea2` `#e9d9ba` · Material: abgenutztes Leuchtanker-Metall.

### T37 Säuregerüst · *Body Augmentation* · V3.2: Asymmetrisches Alchemie-Netzwerk mit Körperrohren und Weltbehältern

- **Anker:** `hand_left/right`, `elbow_left/right`, `hip_right`, `feet_world`, `sprite_alpha`
- **Idle-Silhouette:** Kein Oberkörper: Zwei durchsichtige Unterarm-Katalysatorrohre und drei sechseckige Dosierkammern auf ungleichen Höhen, eine große seitliche Sammelblase hinter dem Avatar, insgesamt 1,3–2,6 H, viel negativer Raum.
- **Action-Silhouette:** Flüssigkeit pulsiert vom linken in den rechten Arm; Luftblasen hängen und lösen sich an korrodierten Innenkanten; Tropfen fallen ausschließlich von tiefen Rohröffnungen, nicht vom ganzen Sprite.
- **Peak Manifestation:** Full öffnet den Kreislauf und baut einen großen horizontalen chemischen Dosierfächer oder ein bodenverankertes Ätzbecken, niemals einen humanoiden Körper.
- **Transform-In / Out:** Konturgenaue grünliche Adern bilden sich nur an Händen und Unterarmen, drei Hexkammern ploppen nacheinander wie Glasblasen auf und werden durch dünne Schlauchleitungen mit der Sammelblase verbunden. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Kammern drehen ihre dicksten Glaswände blickseitig, Blasen im Inneren kollabieren und bilden eine kurzzeitige ätzende Schutzschicht. · Ein vorderes Rohr saugt den nahen Trefferkontakt an; der Anschluss wickelt sich nicht als großer Arm um das Ziel. · Beim Sprung bleiben Tropfen kurz unterhalb der Hand zurück, Sammelblase folgt schwer, Hexkammern federn auf Landung und stoßen Dunst nach unten aus.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein scharfer Ätzglas-Tropfen; Full: Dosierkammern öffnen einen breiten mehrlagigen korrosiven Frontnebel. · Up — Short: eine Rohrdüse drückt Flüssigkeit hoch; Full: das Netzwerk zündet eine lange unregelmäßige Ätzsäule am Zielpunkt. · Down — Short: bodennaher Säuretropfenbogen; Full: Sammelblase entleert mehrere Hexkammern in ein weit geöffnetes Ätzbecken mit Randblasen.
- **Ausschlüsse:** Kein Drachenkopf, grüner Riesen-Susanoo, symmetrisches Schulter-Flaschenrigg oder Chemie-Mecha.
- Palette: `#385a58` `#cfb76c` `#9c9c87` · Material: korrodiertes Ätzglas.

### T38 Asterglied · *Orbital Construct* · V3.2: Orbitale Steinarchitektur aus fünf ungeschlossenen Fragmentringen

- **Anker:** `root`, `feet_world`, `hip`, `shoulder_left/right`, `sprite_alpha`
- **Idle-Silhouette:** Keine Gelenkarme: Fünf verschieden große Bruchring-Abschnitte hängen um eine schräg geneigte vertikale Achse auf Schulter-, Hüft- und Bodenniveau, mit völlig offenen Innenräumen, insgesamt bis etwa 3,1 H.
- **Action-Silhouette:** Schwere Fragmente folgen ihren eigenen langsamen Orbitalbahnen; Kristalladern laufen über die Bruchkanten, während Steinbrocken mit Trägheit nachkippen.
- **Peak Manifestation:** Full richten sich kurz mehrere Ringsegmente zu einer riesigen radialen Mühle, Fallpresse oder Steinkrone über dem Ziel, anschließend fallen sie in offene Orbits zurück.
- **Transform-In / Out:** Einzelne mineralische Brocken steigen von den Fußpunkten und setzen sich nicht zum Torso, sondern zu fünf unvollständigen Kreisbahnen mit sichtbaren Lücken zusammen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Zwei Ringschnitte rücken überlappend vor die Blickrichtung und stoppen an ihren massiven Bruchkanten, andere Ringe orbitieren weiter. · Ein einziges Ringsegment klammert beim bestätigten Nahkontakt an den Gegner, ohne riesige Hand nachzubauen. · Im Aufstieg bleiben die unteren Bruchringe tiefer, Apex: Orbit kippt horizontal; Landung: Brocken federn in drei unterschiedlichen schweren Einschlagtakten.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein konzentrierter Steinsplitter verlässt den Orbit; Full: mehrere Ringbrocken verdichten sich zum schweren freifliegenden Kristallkörper. · Up — Short: ein Segment führt einen Uppercut-ähnlichen Steinhub aus; Full: Orbit kippt vertikal und wirft eine gewaltige kristalline Zackenkrone hoch. · Down — Short: ein schweres Bruchstück stampft; Full: untere Ringe koppeln sich an Bodenfugen und erzeugen eine durchlaufende Bruchlinie.
- **Ausschlüsse:** Kein gigantischer Steinmensch, kein Golem-Oberkörper, keine fünf Stein-Gelenkbügel in humanoider Haltung.
- Palette: `#5e5b55` `#9ca992` `#d8b68c` · Material: schwebende Gesteinskristalle.

### T39 Vorausschnitt · *Temporal Projection* · V3.2: Räumlich gestaffelte Zeitprojektion mit vier großen gebrochenen Bildflächen

- **Anker:** `back_left/right`, `root`, `facing`, `sprite_alpha`, `cached_pose_frames`, `world_to_screen`
- **Idle-Silhouette:** Vier große asymmetrische Zeitglasebenen stehen versetzt hinter, vor und neben dem Avatar; die höchste misst 2,7–3,5 H, die breiteste steht seitlich. Ihre Konturen ergeben zusammen eine imposante temporale Architektur, aber niemals einen humanoiden Torso mit Armen.
- **Action-Silhouette:** In jeder Fläche laufen unterschiedlich zeitversetzte Bewegungsränder des realen Charakters. Eine Fläche liegt um wenige Frames voraus, eine zurück, zwei zeigen geknickte Momentaufnahmen; Platten schwanken nicht wie Gelenkarme.
- **Peak Manifestation:** Bei Full legen sich alle vier Ebenen hintereinander entlang der Angriffsrichtung und öffnen einen großen mehrlagigen Zeitkanal aus versetzten Trefferzeitpunkten. Die Projektion wirkt dann wie ein 3,5 H hoher Zeitfächer, nicht wie vier kleine Monitore.
- **Transform-In / Out:** Eine goldmintfarbene Registriernaht wandert konturgenau über Sprite und Schatten, projiziert nacheinander vier gebrochene Standbildflächen in unterschiedliche Raumtiefen. In ihnen blitzen Teile früherer und folgender Posen auf, nicht dekorative Bedienoberflächen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Eine Bildfläche schiebt sich frontal als kurze Zeitversatzblende vor den Angriff; Gegner sieht klare Parry-/Blocktelegraphen. · Nur bei bestätigtem Grab bildet sich ein enger Standbildrahmen am Nahziel, der dessen Position kurz registriert, keine Riesenhand. · Im Jump zeigen die Flächen Takeoff/Ascend/Apex/Fall als vier gestaffelte Echo-Stellungen, ohne weitere Körper-Spritesheets zu verlangen: aktuelle Spriteframe-Textur temporär in VFX-Replays verwenden.
- **Heavies (V3.2-Abbildung):** Forward — Short: eine schmale zeitversetzte Projektionsmarke sticht frontal; Full: vier Zeitflächen schießen eine phasenverschobene Konvergenzbahn nach vorne. · Up — Short: ein Registriervektor hebt den Treffer; Full: vier aufeinanderfolgende Standbild-Ränder steigen in einer vertikalen, zeitlich versetzten Schichtfolge. · Down — Short: kleines Standbild am Boden; Full: die vier Ebenen senken ein umfassendes zeitliches Koordinatenfeld über das Areal.
- **Ausschlüsse:** Keine vier UI-Karten im Leerraum, keine große humanoide Zeitgestalt, keine Uhrkrone, keine stillen rechteckigen Buff-Anzeigen.
- Palette: `#4c4a5f` `#e8cfb1` `#97bd9e` · Material: schichtweise registriertes Zeitglas.

### T40 Sonnenwyrm — Eid der Drachenlanze · *Creature Manifestation* · V3.2: Zwei unabhängig animierte aurobsidianene Wyrmbänder, keine Körpergestalt

- **Anker:** `weapon_tip`, `weapon_grip`, `hand_right`, `back_left/right`, `sprite_alpha`
- **Idle-Silhouette:** Nur zwei verschieden lange Drachen-Lanzen-Konstrukte aus geschichtetem Schuppenglas schweben geschwungen hinter dem Avatar. Sie kreuzen sich dynamisch, lassen Brust und Kopf sichtbar; Idle 1,7–2,8 H.
- **Action-Silhouette:** Die Bänder schwingen phasenversetzt, Schuppenfacetten drehen nach Kurvenkrümmung; beim Sprint strecken sie sich als lange zweiarmige Flugspur nach hinten.
- **Peak Manifestation:** Full: Forward entlässt zwei separat jagende Wyrmkonstrukte über die Lane; Down setzt mehrere weltverankerte Portale um ein Ziel, aus denen nacheinander eigenständige Wyrmangriffe kommen. Peak ist groß, aber niemals humanoid.
- **Transform-In / Out:** Zwei dünne champagnergoldene Konturnähte steigen von Hüfte und Schulter zu kleinen Schuppenkeilen auf, die sich zu zwei langen, gelenkig nachschwingenden Bändern verbinden, erst bei schweren Angriffen entstehen erkennbare Wyrmköpfe. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Schuppenbänder verschränken sich als gerichteter Schildbogen vor dem Charakter und teilen Einschlagsenergie entlang der Segmentadern auf. · Eine einzelne dünne Wyrmschlinge greift ein bestätigtes Nahziel und löst sich beim Kontaktende. · Jump: Körper springt normal; beide Bänder ziehen unterhalb nach, drehen sich am Apex auseinander und schlagen bei Landung leicht gegen den Boden.
- **Heavies (V3.2-Abbildung):** Forward — Short: schmaler Lanzenimpuls aus nächstem Waffen-/Handanker; Full: beide Wyrme lösen sich separat und treffen mehrere Lanegegner auf unabhängigen Bahnen. · Up — Short: einzelne himmelwärts gerichtete Schneide; Full: ein geschichteter Wyrm steigt als spiralförmige vertikale Angriffskonstruktion auf. · Down — Short: flacher Glutring an den Füßen; Full: mehrlagige Portale um ein gültiges Ziel entlassen nacheinander mehrere Wyrmstoßbahnen.
- **Ausschlüsse:** Keine Drachenflügel am Avatar, keine tierische Ganzkörperform, keine orange Allover-Aura.
- Palette: `#f6cb6a` `#ed7b32` `#29212b` `#69d0c2` · Material: geschichtetes aurisches Schuppenglas und glühende Lanzenschneiden mit dunklen Obsidianzwischenräumen. Die Drachen sind energiegefertigte Angriffskonstrukte, keine vorgerenderten 2D-Kreaturen.
