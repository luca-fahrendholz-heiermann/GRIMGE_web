# GRIMGE — Arcane States: Morphologien und drei visuelle Zustände

> Generiert von `tools/generate_buff_forms.mjs` aus dem Transformations-Atlas V3.1, der Design-Notiz vom 18.10.2026 und dem **V3.2 Morphologie-Overhaul** (individuelle Morphologie je Form: Kategorie, Anker, drei Zustände, eigene Animationen, Heavy-Abbildung).
> **Regel:** Nur **Arkengestell** ist eine riesige humanoide Manifestation (Astral Avatar). Alle anderen Arcane States unterscheiden sich schon an der Silhouette — durch die Art, wie sich die Effekte zum Charakter und zur Welt verhalten. Umsetzung weiterhin ausschließlich mit VFX/Attachments, der Charakter-Sprite bleibt unverändert.

> **Nicht jeder State braucht eine große permanente Manifestation.** Jeder hat drei Zustände: **Idle-Silhouette** (Erkennungsbild während der Aktivierung), **Action-Silhouette** (Sprint, Jump, Defense, Heavy) und **Peak Manifestation** (maximale Ausprägung, z. B. Full Charge).

## Morphologie-Typen

| Morphologie | Aufbau | Formen |
|---|---|---|
| **Astral Avatar** | riesige externe Kampfgestalt | B02 Arkengestell |
| **Energy Extension** | bewegliche Schweife, Bänder und Peitschen aus der Körperkontur | B01 Risswild, T04 Korallenschild, A03 Tausendhand |
| **Body Augmentation** | Strukturen direkt am Körper, zusätzliche Glieder und Leitungen | T13 Fadenschlag, T37 Säuregerüst |
| **Orbital Construct** | freischwebende Ringe, Objekte und Fragmente | T02 Schlackenkern, T06 Ionspindel, T08 Ossuarium, T23 Nullfeldträger, T38 Asterglied |
| **Temporal Projection** | versetzte Abbilder und Bewegungsechos | T39 Vorausschnitt |
| **Creature Manifestation** | unabhängige Energiegeschöpfe | T24 Fadenregent, T40 Sonnenwyrm, A02 Mystischer Affe |
| **Levitation State** | schwebender Spieler mit kontrollierten Projektilen | T05 Bruchflug |
| **Environmental State** | der Spieler verändert einen größeren Bereich der Arena | T35 Kältestillstand |
| **Divine Projection** | vergrößertes Lichtbild des eigenen Körpers | A01 Göttlicher Riese |

## Die 19 aktiven Arcane States (kuratiert: je eigene Techniken, Lade-Ritual und Palette)

### B01 Risswild · *Energy Extension* · V3.2: Tiergeist (Kyubi): neun Fuchsflammen-Schweife

- **Anker:** `back_left`, `hip_right`, `shoulder_right`, `sprite_alpha`
- **Idle-Silhouette:** Kyubi-Geist: neun Fuchsflammen-Schweife fächern sich hinter dem Wizard auf, darüber ein Flammenmantel und ein Fuchskopf; beim Angriff peitschen drei Riss-Schweife nach vorn.
- **Action-Silhouette:** Bei Sprint werden alle drei Zungen stromlinienförmig nach hinten gezogen; beim Richtungswechsel bricht ihre Mitte und heilt mit zeitversetztem Goldlauf; bei Schlägen schnalzt nur ein Band zielwärts.
- **Peak Manifestation:** Full Charge ordnet die drei Bänder zum asymmetrischen gebrochenen Trichter, danach zerreißt die Spitze in kantige Risskerne; kein vollständiger Tierkörper.
- **Transform-In / Out:** Eine dünne Glutnaht rast die echte Spritekontur ab, drei dunkle Plattenbänder platzen nacheinander am Rücken auf, werden durch goldene Schmelzkanten zusammengehalten und schwingen auseinander. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Die drei Bänder falten sich als versetzte, keilförmige Panzerschichten vor die Blickrichtung; Blockwucht läuft als helle Rissader nach außen. · Ein einziger dünner Rissfaden schießt aus der unteren Bandkante zum nahen Ziel und verhakt sich nur beim bestätigten Kontakt. · Beim Absprung sacken die breiten Platten erst nach unten, folgen dann federnd; am Scheitelpunkt stehen sie horizontal, bei Landung schlagen die Enden auf den Boden.
- **Heavies (V3.2-Abbildung):** Forward — Short: eine einzelne spitze Bruchzunge schnellt geradlinig vor; Full: die Zungen verdichten ihre Rissadern zum explodierenden dunklen Projektilkern. · Up — Short: eine schmale Kante hebelt ein Ziel hoch; Full: zwei gegenläufige Risssäulen spiralen über dem Avatar und stoßen nach oben. · Down — Short: bodennaher Kreisschlag aus einer Zunge; Full: versetzte Scherbenanker schlagen über mehrere Bodenpunkte ein und entladen ein Rissfeld.
- **Ausschlüsse:** Keine abstrakten Bänder mehr als Hauptform.
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

### T02 Schlackenkern · *Orbital Construct* · V3.2: Ortsnaher asymmetrischer Schwebeofen, keine Körperstatue

- **Anker:** `hip_left`, `back_left`, `feet_world`, `sprite_alpha`
- **Idle-Silhouette:** Eine einzige bauchige Ofenkammer hängt links hinter der Hüfte, mit drei gebrochenen Keramik-Düsenbändern und leuchtendem Ofenmund; Größenbereich 1,0–2,0 H.
- **Action-Silhouette:** Heiße Asche fällt nach unten, die Ventile atmen gegeneinander; bei Bewegung schaukelt die Kammer wie schweres Gepäck und bleibt asymmetrisch.
- **Peak Manifestation:** Full Charge lässt die Ofenkammer als großes schräges Düsenaggregat aufreißen, das Raum und Boden überstrahlt; keine künstlichen Beine, kein Torso.
- **Transform-In / Out:** Poröse Glasur wächst als kleiner Ring am Boden, hebt eine hohle Keramikglocke zur Hüfte und öffnet seitlich zwei ungleiche Glutventile. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Keramikblenden schließen sich um die blickseitige Flanke und verteilen Treffer in kurzen Glutstößen. · Ein Ofenhaken greift im Nahbereich aus dem seitlichen Ventil und zieht das Ziel zum Hitframe. · Im Sprung hängt die Kammer tiefer als der Körper und gibt eine vertikale Funkenfahne ab; bei Landung stampft sie als Gewichts-Nachlauf.
- **Heavies (V3.2-Abbildung):** Forward — Short: kurzer Funkenausstoß aus einer Düse; Full: Ofentür klappt auf und presst eine konzentrierte Lava-Lanze vorwärts. · Up — Short: ein Ascherohr hustet aufwärts; Full: mehrere Ventile schichten einen eruptiven vertikalen Fächer. · Down — Short: Rußkranz an den Füßen; Full: Kammer senkt sich über einen Bodenpunkt und gießt einen breiten Kraterkern aus.
- **Ausschlüsse:** Kein Magmariese, keine Lava-Ganzkörpertätowierung.
- Palette: `#2a1210` `#ff5a1f` `#ffd27a` `#ff2a00` · Material: verglaste Ofenkeramik.

### T04 Korallenschild · *Energy Extension* · V3.2: Zweiflügeliger Schutzfächer aus korallinen Segeln

- **Anker:** `hip_left/right`, `back_left/right`, `sprite_alpha`
- **Idle-Silhouette:** Zwei breite fächerförmige Segel schweben seitlich auf Hüfthöhe, eines deutlich höher, mit salzweiß gesprenkelter Porzellanoberfläche, 1,5–2,4 H Spannweite.
- **Action-Silhouette:** Die Fächer öffnen und schließen sich langsamer als die Figur atmet; bei Sprint falten sie sich nach hinten und hinterlassen einen zweigeteilten salzigen Partikelstreifen.
- **Peak Manifestation:** Full Charge breitet die Segel zu einem raumgreifenden seitlichen Schutz-/Heilungsfeld aus; sie formen ausdrücklich keinen fliegenden Drachen.
- **Transform-In / Out:** Winzige Kalkplättchen strömen seitlich vom Sprite und falten sich wie Segellatten auf, dabei werden rosige Innenperlen sichtbar. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Beide Segel stellen ihre gefassten Kanten wie einen V-Schild vor den Avatar. · Ein Segelrand schiebt sich auf das unmittelbar benachbarte Ziel und lenkt es nur nach Trefferbestätigung um. · Die Fächer ziehen sich beim Sprung unter den Avatar und steigen als verzögerte Gleiter nach, ohne eigenständiges Flugmodell zu benötigen.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelner rosiger Perlstrahl; Full: die geöffneten Fächer weben einen breiten schimmernden Strom nach vorn. · Up — Short: ein Fächer kippt hoch; Full: beide Segel heben eine gebogene perlmuttfarbene Schutzaufwindbahn. · Down — Short: heller Kreidekreis am Fuß; Full: Segel setzen mehrere Salzpunkte zu einer ausgedehnten Schutzblüte zusammen.
- **Ausschlüsse:** Keine biologischen Flügel oder Engelsflügel, kein rotgoldenes Reptil.
- Palette: `#1d3c48` `#ff8fa3` `#bff6ff` `#5ff0d8` · Material: halbtransparente Korallenkeramik.

### T05 Bruchflug · *Levitation State* · V3.2: Asymmetrische Gravitätsfinnen als richtungsabhängiger Schwebeversatz

- **Anker:** `hip`, `back_left`, `feet_world`, `velocity`, `sprite_alpha`
- **Idle-Silhouette:** Drei voneinander getrennte dunkle Bruchfinnen hängen diagonal hinter und unter dem Avatar, ohne symmetrische Flügelpaarung; der Raum zwischen ihnen verzerrt die Hintergrundpixel.
- **Action-Silhouette:** Die Finnen kippen bei Beschleunigung auf unterschiedliche Winkel und scheinen nach dem Stoppen kurz nachzurutschen, weil ihre Positionsanker nicht identisch sind.
- **Peak Manifestation:** Peak bildet einen einzelnen langen räumlichen Scherkeil oder einen kurzen freien Fallkanal; die Finnen bleiben drei unterscheidbare Teile, nie Riesenarme.
- **Transform-In / Out:** Je ein Schwerkraftfeld knickt aus dem Schatten des Sprites, zieht drei schwarzgläserne Blätter aus unterschiedlichen Höhen und setzt helle Polknoten an die Spitze. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Die vordere Finne deckt einen schmalen Raumkorridor ab und biegt feindliche Lichtspuren sichtbar seitlich weg. · Eine Finne arretiert nahe Ziele kurz mit einem richtungsgebundenen Schwerkraftkeil. · Aufstieg: Finnen strecken sich wie drei unterseitige Jets; Apex: Schwerelosigkeit und Gegenrotation; Landung: versetzte Druckringe am Boden.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein Scherkeil zerkratzt Luft vor der Hand; Full: die Finnen öffnen einen langgestreckten leeren Strahlkanal. · Up — Short: kurze Aufwärtsfinne; Full: drei nacheinander ausfahrende Druckflügel treiben eine vertikale Scherkante. · Down — Short: eine Bodenfinne streift über den Boden; Full: das gesamte Feld fällt als breiter räumlicher Drucksturz auf eine Lanezone.
- **Ausschlüsse:** Keine Fledermausflügel, Hörner oder Dämonenjäger-Silhouette.
- Palette: `#120c1e` `#b04dff` `#e9c8ff` `#ff4fd8` · Material: dunkler Gravitätsstein.

### T06 Ionspindel · *Orbital Construct* · V3.2: Drei diagonal gesetzte elektromagnetische Spulen

- **Anker:** `shoulder_right`, `elbow_right`, `hip_left`, `hand_right`, `sprite_alpha`
- **Idle-Silhouette:** Die Spulen umlaufen nicht den ganzen Körper als Käfig, sondern sind versetzt bei Schulter, Ellbogen und linker Hüfte angeordnet; dünne Kupferfäden verbinden sie, sichtbar 0,8–1,5 H.
- **Action-Silhouette:** Spulen drehen gegensinnig in verschiedenen Geschwindigkeiten; zwischen den Rotoren springen haarfeine gelbgrüne Funken, während das Zentrum der Figur unverdeckt bleibt.
- **Peak Manifestation:** Bei Full richten sich die drei Spulen zu einer langen schrägen Induktionsschiene aus und entladen eine gerichtete Lichtfaserbahn; keine Körpergröße-Erhöhung.
- **Transform-In / Out:** Ein kurzer Stromblitz zieht längs der wahren Spritekontur, drei ringartige Isoliergehäuse schnappen aus unterschiedlichen Richtungen an die Außenanker. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Spulen schieben sich vor die Verteidigungsseite und erzeugen ein engmaschiges Netz wechselnder Feldlinien. · Magnetischer Kupferfaden schnürt die nahe Zielkontur für den kurzen Nah-Griff ein. · Im Sprung laufen elektrische Funken entlang der Trajektorie; Rotoren drehen am Scheitelpunkt gegensinnig und schwingen nach Landung zurück.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelne dünne Nadelentladung; Full: Spulen bilden eine hintereinander geschaltete Kettenblitz-Schiene. · Up — Short: Funkenimpuls entlang eines Unterarmankers nach oben; Full: mehrere Induktionskerne setzen eine steile Stromsäule frei. · Down — Short: kurzer Sohlenpuls; Full: Rotoren koppeln den Boden zu einer wandernden elektromagnetischen Wirbelzone.
- **Ausschlüsse:** Keine Vollrüstung aus Blitzen, keine ewig gleichen Blitzkringel.
- Palette: `#10222a` `#d4ff3a` `#f6ffd0` `#7af7ff` · Material: elektrisch leitendes Glasfasergeflecht.

### T08 Ossuarium · *Orbital Construct* · V3.2: Akustisches Glockenmobile aus Keramik, keine Rüstung

- **Anker:** `back_left`, `back_right`, `feet_world`, `sprite_alpha`
- **Idle-Silhouette:** Drei unterschiedlich große Hohlglocken und zwei hängende Grabplatten bilden eine vertikale, seitlich versetzte Mobile-Silhouette hinter dem Rücken, 1,6–2,6 H.
- **Action-Silhouette:** Bei Idle kollidieren die Hohlglocken nie, sondern schwingen phasenverschoben; aus jedem Schallrand läuft eine zarte, schraffierte Resonanzkante.
- **Peak Manifestation:** Full Charge fügt die Glockenöffnungen zu einer gewaltigen offenen Resonanzgasse zusammen; das Bild einer Menschengestalt bleibt aus.
- **Transform-In / Out:** Staubige Glasurscherben schweben aus der Bodenspur, fügen sich zu hängenden Glocken; unsichtbare Zugachsen lassen die schweren Teile allmählich ausschwingen. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Eine tiefe Glocke schwenkt zwischen Angriff und Figur, sodass die Schallfront den Treffer dämpft. · Der unterste Grabplattenhaken schwingt zum validierten Nahziel und arretiert kurz vor dem Opfer. · Während der Sprungphase hängen Glocken nach unten, bei Landung schwingen sie gegeneinander und klingeln stumm durch Lichtpulse.
- **Heavies (V3.2-Abbildung):** Forward — Short: scharfer Scherben-Tonpfeil; Full: die Glocken in Linie setzen einen schweren sarkophagartigen Schallkeil frei. · Up — Short: oberes Plättchen zieht hoch; Full: alle Glocken schweben öffnend zur mehrlagigen Resonanzblüte. · Down — Short: Grabplatte prallt auf Bodenmarke; Full: Glocken öffnen ein rechteckig-hohles Schallfeld auf dem Boden.
- **Ausschlüsse:** Keine Knochenrüstung, Totenschädelkrone oder Nekromantenkörper.
- Palette: `#22302c` `#e8dcc0` `#fff8e6` `#4fe0a8` · Material: antike Glockenkeramik.

### T13 Fadenschlag · *Body Augmentation* · V3.2: Fadenspule und vier gespannte sichtbare Waffenleitungen

- **Anker:** `shoulder_right`, `weapon_grip`, `hand_left/right`, `sprite_alpha`
- **Idle-Silhouette:** Eine einzelne grob geätzte Spule hängt an einer Schulter; vier dünne Metalldrahtzüge laufen zur aktuell sichtbaren Waffe oder ersatzweise zu Hand-/Focusankern.
- **Action-Silhouette:** Idle: der Spulenrand zittert mit unterschiedlichen Drahtschwingungen; bei Sprüngen und Angriffen läuft eine Materialwelle entlang der Leitungen.
- **Peak Manifestation:** Full lädt alle Fäden auf Spannung und webt vorübergehend ein breites Kampfgeflecht nach vorne; keine zusätzliche Körpermasse.
- **Transform-In / Out:** Vier leuchtende Fäden ziehen die Spule als Paket aus scharfkantigen Metallfasern von der Schulter weg, dann spannen sie sich zur Waffe. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Fäden spannen ein fein graviertes Schutznetz vor die Blickrichtung, das sich bei Hit als Schwingmuster entlädt. · Zwei Drähte verhaken sich im nahen Ziel und werden nur bei bestätigtem Grab kurz eingezogen. · Aufstieg: Fäden strecken hinterher; Apex: Schwingung stoppt kurz; Landung: sichtbares mehrstufiges Zurückschnalzen.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelne gezielte Drahtnadel; Full: gleichzeitig gespannte Filamente schießen als gerichteter Fadenteppich nach vorn. · Up — Short: ein gespannter Faden hakt oben ein; Full: sämtliche Leitungen schlagen als hochgezogenes Gewebe um den Aufwärtsbereich. · Down — Short: kurzer Bodenstich mit einer Drahtspitze; Full: Fäden vernähen mehrere Bodenpunkte zu einem flächigen Impulsfeld.
- **Ausschlüsse:** Keine Puppenarme, keine Riesenschwerter, keine gleichmäßige Spinnennetzkugel.
- Palette: `#1c1420` `#ff7a3d` `#ffd0a8` `#ff3d6e` · Material: gesponnene Metallfäden.

### T23 Nullfeldträger · *Orbital Construct* · V3.2: Negativräume und echter Lichtentzug

- **Anker:** `shoulder_left`, `hand_right`, `hip`, `sprite_alpha`, `scene_color`
- **Idle-Silhouette:** Drei geometrisch ungleiche Löcher im Bildraum schweben neben Hand und Schulter; ihre Innenflächen zeigen Auslöschung von hinteren VFX-Layern und einen dünnen dithernden Lichtrand.
- **Action-Silhouette:** Innen fehlt Inhalt, statt schwarz gefülltem Shader; minimale Randverzeichnung und vorbeiziehende Löschpunkte machen die Leere lesbar.
- **Peak Manifestation:** Full verbindet die Löcher nur als temporären breiten Auslöschungskorridor über der Angriffsbahn; keine Person entsteht daraus.
- **Transform-In / Out:** Entlang einzelner Konturpixel geht der Glanz aus, aus dieser Auslöschung falten sich drei offene, unregelmäßige Negativräume. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Ein Negativraum deckt die Blickseite ab und verschluckt auftreffende Effektpartikel nach Gameplay-Freigabe. · Ein enger Negativfeldkragen erscheint nur am erreichbaren gegnerischen Kontaktpunkt; der Avatar selbst behält freie Kontur. · Beim Sprung zieht ein Loch nach unten, ein anderes läuft über den Kopf, bei Landung kollabieren beide zu kurzen Ditherpunkten.
- **Heavies (V3.2-Abbildung):** Forward — Short: dünner Löschschnitt direkt vor dem Angriff; Full: mehrere offene Löcher wachsen zu einem kurzlebigen gerichteten Zauberverzehrer. · Up — Short: schmale Nullkante nach oben; Full: ein Bildraumstreifen wird vertikal sichtbar ausgelöscht. · Down — Short: kleiner stiller Bodentritt; Full: die drei Negativräume verbinden sich zu einem flachen Störfeld entlang der Lane.
- **Ausschlüsse:** Kein schwarzer Dämonenpanzer, keine invertierten Vollkörper-Flügel, kein reiner Schwarzkreis.
- Palette: `#050608` `#4a5266` `#e6ff8a` `#a4ff3d` · Material: lichtabsorbierendes Negativfeld.

### T24 Fadenregent · *Creature Manifestation* · V3.2: Zwei gelenkige Schattenmarionetten an sichtbaren Zugfäden

- **Anker:** `back_left/right`, `shadow_contact`, `sprite_alpha`
- **Idle-Silhouette:** Zwei flache Schattenbühnen-Körper hängen versetzt links und rechts hinter dem Avatar an deutlich sichtbaren diagonalen Lichtfäden; nur flache Gelenkplatten, keine vollständigen Geistersoldaten.
- **Action-Silhouette:** Idle: Die Figuren rucken wie von Schnüren gezogen, klappen ungleichmäßig und bleiben klar kleiner als der Spieler, nicht überlebensgroß.
- **Peak Manifestation:** Full mobilisiert temporär mehrere Schattenabzüge als Projektion auf den Boden, keine eigenständigen kompletten kämpfenden Riesenwesen.
- **Transform-In / Out:** Aus zwei schmalen Schattenflecken wachsen diagonale Zugfäden nach oben; ihre kurzen Gelenkplatten klappen zu zwei getrennten, flachen Silhouetten aus. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Eine der flachen Bühnenfiguren klappt vor den Guard und absorbiert mit ihrem breiten, matten Schattenrücken. · Die vordere Marionette fährt zum validierten Nahziel und klemmt es mit einem kurzen Scherengelenk fest. · Beim Springen bleiben die Lichtfäden hinter dem Charakter hängen und straffen sich bei Landung sichtbar.
- **Heavies (V3.2-Abbildung):** Forward — Short: eine Marionette wirft ein Schattenplättchen; Full: beide Figuren spannen ihre Fäden zu einem breiten Speerprojektil. · Up — Short: kleiner hochgezogener Gelenkhieb; Full: Zugfäden ziehen eine mehrteilige aufsteigende Schattenkulisse. · Down — Short: tiefer Schattenwischer; Full: Schattenabdrücke laufen wie marschierende Bühnenfiguren über mehrere Bodenpunkte.
- **Ausschlüsse:** Keine Armee vollwertiger Schattenritter oder riesigen Susanoo-Schattenkörper.
- Palette: `#141633` `#5a6cff` `#ffd27a` `#ff9a3d` · Material: schattengefärbte Fadenmarionetten.

### T35 Kältestillstand · *Environmental State* · V3.2: Frostbeschlagene Kondensationsbänder mit Zeitstottern

- **Anker:** `hand_left`, `hip_right`, `back_left`, `sprite_alpha`
- **Idle-Silhouette:** Drei unterschiedlich lange gebrochene Glasbahnen liegen nah an Arm, Hüfte und Rücken, getrennt durch ruhige leere Bildräume; kein großer Zeitchronometer.
- **Action-Silhouette:** Idle: jedes Band hält sporadisch für wenige Frames an und springt an seine physikalisch geglättete Position zurück, langsamer als echte Bewegung.
- **Peak Manifestation:** Full zieht die Bänder zu einer stotternden frostigen Zeitspur, die gegnerische Zonen verlangsamt; kein Stop-Time-Effekt ohne Gameplay-Mechanik.
- **Transform-In / Out:** Frostkondensat beginnt an ausgewählten echten Kanten, zieht drei geknickte Zeitglasbahnen aus dem Hintergrund und hinterlässt kurze unbewegliche Ditherpartikel. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Kondensationsbänder schichten sich kurz vor der Blickseite als frostige Verzögerungsfläche. · Ein Frostband fängt ein nahes Ziel bei bestätigtem Grab mit verzögerter Release-Geste. · Im Jump bleiben Bildreststreifen auf mehreren Höhen für kurze Zeit zurück, ohne den eigentlichen Player-Root einzufrieren.
- **Heavies (V3.2-Abbildung):** Forward — Short: einzelner frostiger Zeitimpuls; Full: eine breite gefrorene Standbildspur läuft in Blickrichtung. · Up — Short: kurzer Glashaken nach oben; Full: mehrere Zeitglasstreifen fahren als verspätete Eis-Aufstiegsbahn hoch. · Down — Short: kleiner kalter Fußstopp; Full: frostige Zeitbahnen verwirbeln zur flachen Bodennebel-Verzögerungszone.
- **Ausschlüsse:** Keine Uhrzeiger, Stop-Time-Kugel oder Eisplatten-Humanoid.
- Palette: `#1a2e3e` `#8fdcff` `#f0fcff` `#b0f0ff` · Material: frostbeschlagene Chronokeramik.

### T37 Säuregerüst · *Body Augmentation* · V3.2: Asymmetrisches Alchemie-Netzwerk mit Körperrohren und Weltbehältern

- **Anker:** `hand_left/right`, `elbow_left/right`, `hip_right`, `feet_world`, `sprite_alpha`
- **Idle-Silhouette:** Kein Oberkörper: Zwei durchsichtige Unterarm-Katalysatorrohre und drei sechseckige Dosierkammern auf ungleichen Höhen, eine große seitliche Sammelblase hinter dem Avatar, insgesamt 1,3–2,6 H, viel negativer Raum.
- **Action-Silhouette:** Flüssigkeit pulsiert vom linken in den rechten Arm; Luftblasen hängen und lösen sich an korrodierten Innenkanten; Tropfen fallen ausschließlich von tiefen Rohröffnungen, nicht vom ganzen Sprite.
- **Peak Manifestation:** Full öffnet den Kreislauf und baut einen großen horizontalen chemischen Dosierfächer oder ein bodenverankertes Ätzbecken, niemals einen humanoiden Körper.
- **Transform-In / Out:** Konturgenaue grünliche Adern bilden sich nur an Händen und Unterarmen, drei Hexkammern ploppen nacheinander wie Glasblasen auf und werden durch dünne Schlauchleitungen mit der Sammelblase verbunden. / Die einzelnen Fragmente verschwinden in umgekehrter Materiallogik der Aktivierung. Existierende Projektile und Bodenobjekte folgen ihren normalen, deterministischen Laufzeitregeln.
- **Defense · Grab · Jump:** Kammern drehen ihre dicksten Glaswände blickseitig, Blasen im Inneren kollabieren und bilden eine kurzzeitige ätzende Schutzschicht. · Ein vorderes Rohr saugt den nahen Trefferkontakt an; der Anschluss wickelt sich nicht als großer Arm um das Ziel. · Beim Sprung bleiben Tropfen kurz unterhalb der Hand zurück, Sammelblase folgt schwer, Hexkammern federn auf Landung und stoßen Dunst nach unten aus.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein scharfer Ätzglas-Tropfen; Full: Dosierkammern öffnen einen breiten mehrlagigen korrosiven Frontnebel. · Up — Short: eine Rohrdüse drückt Flüssigkeit hoch; Full: das Netzwerk zündet eine lange unregelmäßige Ätzsäule am Zielpunkt. · Down — Short: bodennaher Säuretropfenbogen; Full: Sammelblase entleert mehrere Hexkammern in ein weit geöffnetes Ätzbecken mit Randblasen.
- **Ausschlüsse:** Kein Drachenkopf, grüner Riesen-Susanoo, symmetrisches Schulter-Flaschenrigg oder Chemie-Mecha.
- Palette: `#1f3a2e` `#7dff9c` `#e9fff1` `#c6ff3d` · Material: korrodiertes Ätzglas.

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
- Palette: `#2b2a44` `#b9a8ff` `#eae4ff` `#7dffc4` · Material: schichtweise registriertes Zeitglas.

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

### A01 Göttlicher Riese — Silberner Himmelskörper · *Divine Projection* · V3.2: Vergrößertes Lichtbild des eigenen Körpers (Göttlicher Riese)

- **Anker:** `sprite_alpha`, `root`, `hand_right`, `hand_left`, `head_center`
- **Idle-Silhouette:** Eine 2,4–2,8 H große, transluzente silberblaue Lichtgestalt des eigenen Charakters steht hinter ihm und spiegelt jede Pose.
- **Action-Silhouette:** Der Riese folgt jeder Pose zeitgleich, nur größer und mit Lichtträgheit; beim Sprint ziehen silberne Nachbilder, Blitzadern laufen über die Kontur.
- **Peak Manifestation:** Bei Full tritt der Riese aus dem Hintergrund und führt die Technik mit seinen eigenen Riesenhänden aus.
- **Transform-In / Out:** Silberlicht steigt aus der Kontur auf und wächst zur riesigen Spiegelgestalt. / Die Gestalt zerfällt von außen nach innen in Silberfunken.
- **Defense · Grab · Jump:** Die Riesenhände schließen sich vor dem Körper zu einem Lichtschild. · Die riesige Lichthand packt das Ziel (wie in der Referenz) und schmettert es zu Boden. · Der Riese federt mit; bei der Landung stampft er und der Boden bebt.
- **Heavies (V3.2-Abbildung):** Forward — Short: die Riesenhand fegt flach nach vorn; Full: eine gewaltige Lichtfaust schlägt über die Lane. · Up — Short: riesiger Aufwärtshaken; Full: die Riesenhand packt das Ziel, hebt es hoch und schmettert es herunter. · Down — Short: Riesenstampfer; Full: beide Fäuste schmettern nacheinander auf den Boden.
- **Ausschlüsse:** Keine fremde Figur, keine Rüstung, kein Skelett — immer das eigene vergrößerte Lichtbild.
- Palette: `#14204a` `#8fc4ff` `#f2f8ff` `#6ad8ff` · Material: leuchtendes Silberlicht mit Gewitterkristall-Adern.

### A02 Mystischer Affe — Silberfell-Urgeist · *Creature Manifestation* · V3.2: Silberweißer Geisteraffe in Kristallflammen

- **Anker:** `back_left`, `back_right`, `root`, `feet_world`, `sprite_alpha`
- **Idle-Silhouette:** Ein riesiger silberweißer Geisteraffe erhebt sich hinter dem Spieler, umwirbelt von violett-blauen Kristallflammen.
- **Action-Silhouette:** Der Affe atmet schwer, die Flammen wirbeln; beim Sprint läuft er geduckt mit, die Fäuste schleifen über den Boden.
- **Peak Manifestation:** Bei Full schlägt der Affe selbst zu: Gebrüll, Sprung oder Trommelbeben.
- **Transform-In / Out:** Violette Kristallflammen schießen aus dem Boden, aus ihnen formt sich der weiße Geisteraffe. / Fell und Flammen zerstieben in violette Funken.
- **Defense · Grab · Jump:** Die riesigen Arme kreuzen sich vor dem Spieler. · Die Affenhand packt das Ziel und schleudert es über die Schulter. · Der Affe springt mit und trommelt bei der Landung.
- **Heavies (V3.2-Abbildung):** Forward — Short: Riesenfaust nach vorn; Full: violettes Gebrüll als Schallwelle. · Up — Short: Affenhaken; Full: Sprung mit krachender Landung vor dem Spieler. · Down — Short: Faustschlag auf den Boden; Full: Brusttrommeln mit Bebenwellen.
- **Ausschlüsse:** Kein realistischer Gorilla, keine Rüstung.
- Palette: `#1c1030` `#c9a8ff` `#ffffff` `#b06cff` · Material: silberweißes Geisterfell in violetten Kristallflammen.

### A03 Tausendhand — Schrein der hundert Arme · *Energy Extension* · V3.2: Halbkreis aus Geisterarmen (Tausendhand)

- **Anker:** `back`, `shoulder_left`, `shoulder_right`, `hand_right`, `root`
- **Idle-Silhouette:** Ein Halbkreis aus sechs langen Geisterarmen in rotem Lack mit Goldreifen ragt hinter dem Wizard auf wie ein Strahlenkranz.
- **Action-Silhouette:** Die Arme folgen den Schlägen des Wizards: bei jedem Hieb schlägt ein Geisterarm mit; im Sprint ziehen sie wie ein Fächer hinterher.
- **Peak Manifestation:** Bei Full greifen alle Arme gemeinsam an: Trommelfeuer, Säulenhände oder die Gebetsfalle.
- **Transform-In / Out:** Goldene Reifen erscheinen in der Aura, aus ihnen wachsen die Arme. / Die Arme lösen sich zu goldenen Funken auf.
- **Defense · Grab · Jump:** Die Hände legen sich zu einer Wand aus Handflächen. · Mehrere Hände packen das Ziel und schleudern es im Kreis davon. · Die Arme stemmen den Wizard hoch und schlagen bei der Landung zu.
- **Heavies (V3.2-Abbildung):** Forward — Short: drei Fäuste nacheinander; Full: Trommelfeuer aus Fäusten über die Lane. · Up — Short: Hand aus dem Boden reißt hoch; Full: vier Säulenarme jonglieren das Ziel. · Down — Short: Handflächenstoß ringsum; Full: zwei Riesenhände klatschen zusammen.
- **Ausschlüsse:** Kein Torso, keine fremde Figur.
- Palette: `#3a0d0d` `#c62828` `#ffd54f` `#fff3c4` · Material: roter Lack mit Goldspangen und Geisterlicht.

### A04 Klingenblüte — Entfesselte Waffe · *Weapon Morph* · V3.2: Waffen-Entfesselung (Klingenblüte)

- **Anker:** `hand_right`, `root`, `back`
- **Idle-Silhouette:** Nur der leuchtende Griff bleibt in der Hand; ein Ring aus rund dreißig rosa-silbernen Klingenblättern kreist um den Wizard.
- **Action-Silhouette:** Bei jedem Hieb strömt der Schwarm nach vorn und schneidet; im Sprint zieht er wie ein Schweif hinterher.
- **Peak Manifestation:** Bei Full fegt der ganze Schwarm: Sturzflut, Säule oder Blütengrab.
- **Transform-In / Out:** Die Klinge zerspringt in hunderte Blätter, die sich zu einem Ring ordnen. / Die Blätter fügen sich wieder zur Klinge.
- **Defense · Grab · Jump:** Die Blätter legen sich zu einer Wand. · Der Schwarm umhüllt das Ziel und schleudert es fort. · Die Blätter tragen den Wizard hoch und regnen herab.
- **Heavies (V3.2-Abbildung):** Forward — Short: ein Blätterstrom nach vorn; Full: Sturzflut über die Lane. · Up — Short: Blütenwirbel reißt hoch; Full: Klingensäule jongliert. · Down — Short: Klingenteppich ringsum; Full: Blütengrab schnappt zu.
- **Ausschlüsse:** Keine Kirschblüten-Kopie, keine fremde Figur.
- Palette: `#3a1a2a` `#ec407a` `#f8bbd0` `#ffffff` · Material: Klingenstahl mit rosa Blütenschimmer.


## Archiviert (aus dem Spiel genommen, im Atlas erhalten)

Für einzigartige Movesets wurde der Kader auf die obigen Formen reduziert. Diese Formen bleiben im Atlas und können über die ACTIVE-Liste in tools/generate_buff_forms.mjs zurückgeholt werden:

- **T01 Kammwacht** — Vertikaler Rückenfächer aus Schindellamellen
- **T03 Reliktkiefer** — Seitlicher dreiteiliger fossiler Greifapparat
- **T07 Dämmerlauf** — Vier körpernahe Rauch-Sichelverlängerungen
- **T09 Prismabruch** — Einseitiges Fünfplatten-Spiegelprisma
- **T10 Aderarchon** — Externes pulsierendes Kapillarnetzwerk
- **T11 Polartrick** — Gefalteter Frostpapier-Kometenschwarm
- **T12 Stratospalter** — Vier externe Luftdruck-Prankenbügel ohne Tierkörper
- **T14 Glyphenschmied** — Hängendes Glyphenblech-Pendel mit Klammerapparat
- **T15 Spektralweiche** — Vier leitende Spektralbänder als kreuzender Flussverteiler
- **T16 Vierknoten** — Vier ungleich gewichtete Pendelknoten im asymmetrischen Orbit
- **T17 Glutmauser** — Abfallende Glutschindeln als diagonal wandernder Mauserstreifen
- **T18 Morphgitter** — Offenes Werkzeug-Raster ohne stabile Kreatursilhouette
- **T19 Schwuranker** — Drei schwere hufeisenförmige Ankerklammern
- **T20 Taktklinge** — Rhythmische Klingenkanten direkt an Bewegungsachsen
- **T21 Orbitpranke** — Kompakter Schwarm aus porösen Orbitklauen
- **T22 Zündschuppe** — Lokal gezündete Gelenkplättchen, keine Schuppenhaut
- **T25 Hämolith** — Mineralisierte Kapillarstacheln an Unterarmen
- **T26 Resonanzwache** — Klangarmatur aus drei frei versetzten Schnurflächen
- **T27 Faltspur** — Bewegliche Raumfalten wie gestapelte Papierkanten
- **T28 Rasterdom** — Lokale Bodenarchitektur aus drei Rasterbögen
- **T29 Werkgestalt** — Drei autonome Werkzeugreliquien im ungleichen Orbit
- **T30 Leisefaden** — Extrem reduzierte Stealth-Saumform mit einem Schattenband
- **T31 Klingenherbarium** — Asymmetrischer Schwarm mineralischer Klingenkeime
- **T32 Taktfunke** — Fuß- und handgebundener Impulsrhythmus statt Aurafigur
- **T33 Nachtmaß** — Messzirkel-Stealth aus zwei frei schwenkbaren Bügeln
- **T34 Sternwerk** — Externer Werkprojektor statt Geisterbegleiter
- **T36 Bollwerklicht** — Drei seitliche Lichtsegel als ortsgebundene Stützen