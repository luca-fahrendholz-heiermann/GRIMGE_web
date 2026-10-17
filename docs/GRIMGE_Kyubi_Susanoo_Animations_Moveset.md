# GRIMGE: Kyūbi und Susanoo

## Vollständiges Moveset und Animationskonzept für 2.5D

**Dokumenttyp:** Game-Design- und Animationsspezifikation  
**Status:** Konzept. Balancing-Werte sind Vorschläge, keine bereits implementierten Eigenschaften.  
**Geltungsbereich:** Transformation, Sprint, Sprint + Heavy, Heavy Charge Forward / Up / Down, Defense, Perfect Block, Guard Break, Grab und Jump.  
**Wichtiger Bestand:** Der **Susanoo-Bogen für Forward Heavy ist bereits implementiert**. Die vorhandene Bogen-Spannanimation bleibt erhalten und wird um zwei Release-Varianten erweitert.

---

## 1. Übergreifendes Design

### 1.1 Identität der beiden Transformationen

| Merkmal | Kyūbi | Susanoo |
|---|---|---|
| Kampfgefühl | Schnell, animalisch, explosiv | Schwer, monumental, präzise |
| Sichtbare Transformation | Rot-orangefarbene Chakra-Aura mit beweglichen Schweifen | Violetter, halbtransparenter Astralkrieger um den Charakter |
| Sprint | Beast Rush, flache und aggressive Körperhaltung | Astral Charge, schwere und lange Schritte |
| Sprint + Heavy | Beast Pounce, springende Energieklaue | Colossus Breaker, verstärkter Faustschlag |
| Forward Heavy | Chakra-Schockwelle oder komprimierte Energiekugel | **Bereits implementierter Bogen**, schneller oder verstärkter Pfeil |
| Up Heavy | Chakra-Uppercut oder doppelte Arm-Energiesäule | Aufwärtshieb oder vertikale Energieklinge |
| Down Heavy | Schweiffeger oder massiver Schweif-Bodenschlag | Fußstampfer oder beidhändiger Bodenschlag |
| Defense | Lebendiger, elastischer Kokon aus Chakra-Schweifen | Feste Rippenstruktur mit gewaltiger Schutzhand |
| Grab | Chakra-Schweife greifen und werfen den Gegner | Gigantische Astralhand greift und schleudert ihn |
| Jump | Sprung des Spielers mit sich streckender, nachziehender Aura | Sprung des Spielers mit synchronem, schwerem Sprung des Astralkörpers |

### 1.2 Steuerung und Prioritäten

| Eingabe | Aktion | Voraussetzung |
|---|---|---|
| Sprint | Transformationsspezifischer Sprint | Bewegung möglich |
| Sprint + Heavy | Transformationsspezifischer Sprint-Angriff | Aktiver Sprint |
| Forward + Heavy, kurz halten und loslassen | Forward Short | Heavy noch nicht voll aufgeladen |
| Forward + Heavy, vollständig aufladen und loslassen | Forward Full | Volle Ladung erreicht |
| Up + Heavy, kurz halten und loslassen | Up Short | Heavy noch nicht voll aufgeladen |
| Up + Heavy, vollständig aufladen und loslassen | Up Full | Volle Ladung erreicht |
| Down + Heavy, kurz halten und loslassen | Down Short | Heavy noch nicht voll aufgeladen |
| Down + Heavy, vollständig aufladen und loslassen | Down Full | Volle Ladung erreicht |
| Defense halten | Guard | Guard möglich |
| Defense im richtigen Timing | Perfect Block | Treffer innerhalb des Perfect-Block-Fensters |
| **Defense halten + Down drücken** | **Grab** | **Gültiger Gegner in unmittelbarer Reichweite** |
| Jump | Transformationsspezifischer Sprung | Sprung möglich |

**Wichtig für Grab:** `Defense + Down` hat Vorrang vor `Down + Heavy`, sofern Defense aktiv ist. Ein Grab ist **keine Heavy-Charge-Attacke** und besitzt **keine zwei Charge-Varianten**.

### 1.3 Heavy Charge: genau zwei Attacken, keine mittlere Stufe

Jede Richtung hat genau **zwei Release-Aktionen**:

1. **Short Attack:** Der Spieler lädt kurz auf und lässt vor dem Full-Charge-Schwellenwert los. Es startet eine eigenständige schnelle Attacke mit eigener Animation, eigener Trefferzone und eigener Wirkung.
2. **Full Attack:** Der Spieler hält Heavy bis zum Full-Charge-Schwellenwert. Die vorbereitende Animation verändert sich sichtbar. Beim Loslassen startet eine **andere**, stärkere Attacke mit eigenem Bewegungsablauf, eigener Trefferzone und eigener Wirkung.

Es gibt **keine dritte Charge-Stufe** und keine kontinuierliche Skalierung durch Zwischenstufen. Die Ladung darf nach Erreichen des Maximums gehalten werden. Ein sichtbarer Energieimpuls signalisiert die Einsatzbereitschaft.

**Vorgeschlagener Startwert:** Full Charge nach etwa **1,2 Sekunden**. Die genaue Schwelle wird im Playtesting abgestimmt. Für Susanoo sind etwas längere Animationen möglich, ohne eine neue Charge-Stufe einzuführen.

### 1.4 Animationsphasen und Trigger

Für jede Attacke gelten möglichst einheitliche Zustände:

1. **Anticipation / Charge Start:** Der Körper nimmt eine erkennbare Haltung ein.
2. **Charge Loop:** Charakter und Aura beziehungsweise Astralkörper bauen die Aktion auf.
3. **Full Ready (nur bei voller Ladung):** Klare optische Bestätigung der vollen Ladung.
4. **Release / Active Frames:** Angriff wird beim Loslassen ausgeführt. Die aktive Trefferzone folgt der sichtbaren Bewegung.
5. **Hit Reaction:** Gegner reagieren entsprechend dem jeweiligen Angriff.
6. **Recovery:** Charakter und Transformation gehen in Bewegung oder Kampfhaltung zurück.

Die tatsächliche Schadensprüfung wird über definierte Animationsereignisse ausgelöst. Dauerhafte VFX dürfen nicht automatisch eine dauerhaft aktive Trefferzone erzeugen.

---

# 2. Kyūbi: Beast Transformation

## 2.1 Visuelle Grundform und Idle

Der Charakter ist von einer rot-orangefarbenen Chakra-Aura umgeben. Ihre Kontur wirkt wie flackerndes Feuer und gleichzeitig wie eine lebendige, leicht zähflüssige Energie. Mehrere lange Schweife wachsen aus dem Rückenbereich. Sie bewegen sich unabhängig voneinander, folgen aber der Gesamtbewegung des Spielers.

**Idle-Animation:**

1. Der Charakter steht leicht nach vorne geneigt. Hände und Schultern sind angespannt.
2. Die Aura pulsiert unregelmäßig entlang von Armen, Beinen und Oberkörper.
3. Einzelne Schweife heben sich, rollen sich ein und richten sich wieder auf. Ihre Spitzen reagieren leicht verzögert.
4. Kurze Energiepartikel lösen sich von der äußeren Kontur. Sie verschwinden, bevor sie den Bildschirm überladen.
5. Bei Richtungswechseln schwanken die Schweife kurz entgegen der Bewegung. Dann nehmen sie ihre neue Position ein.

**Lesbarkeit:** Gesicht, Kopfkontur und Körperhaltung des Spielers bleiben erkennbar. Die Schweife liegen teils hinter und teils neben der Spielfigur. Der Vordergrund darf den Charakter nicht dauerhaft verdecken.

## 2.2 Sprint: Beast Rush

**Funktion:** Extrem schnelle, aggressive Fortbewegung mit leichtem Kontaktschaden.

**Animationsablauf:**

1. **Aktivierung:** Der Charakter senkt abrupt den Oberkörper. Knie und Hüfte gehen tief. Seine Hände wandern seitlich nach hinten. Die Aura hellt sich auf.
2. **Beschleunigung:** Alle Chakra-Schweife schnellen nach hinten. Unter den Füßen entstehen kurze Staubstöße. Die Energie wird zu langen, flammenartigen Bewegungsspuren gezogen.
3. **Sprint-Loop:** Der Charakter läuft mit kurzen, explosiven Schritten in einer animalischen Haltung. Die Schultern bleiben tief. Die Schweife schwingen wellenförmig nach hinten und oben.
4. **Energieverhalten:** Die Aurakontur liegt eng am Körper an der Vorderseite an. Hinter dem Rücken reißt sie in flackernde Streifen auf. Kleine orange Partikel bleiben kurz in der Laufbahn zurück.
5. **Gegnerkontakt:** Beim ersten Kontakt mit einem Gegner verdichtet sich die Energie an der Schulter. Ein kurzer Chakra-Impuls stößt den Gegner leicht weg. Die Sprintbewegung wird dadurch nicht automatisch abgebrochen.
6. **Sprint-Ende:** Der Charakter gleitet kurz über den Boden. Die Schweife schwingen durch ihre Trägheit nach vorne und richten sich dann hinter dem Körper auf. Die Aura kehrt in das normale Pulsieren zurück.

**Gameplay:** Beast Rush dient primär der Mobilität. Der Kontaktschaden bleibt gering und trifft einen Gegner nur einmal je durchgehender Sprintphase. So ersetzt Sprint keine eigentlichen Angriffe.

## 2.3 Sprint + Heavy: Beast Pounce

**Funktion:** Schneller Gap-Closer mit einer riesigen Chakra-Klaue und Knockdown.

**Animationsablauf:**

1. **Vorbereitung:** Im Beast Rush zieht der Charakter beide Arme näher an den Körper. Die Schweife bündeln sich hinter ihm und werden wie eine gespannte Feder kürzer.
2. **Absprung:** Der Charakter stößt sich explosiv vom Boden ab. Die Knie ziehen an. Die Schweife peitschen nach hinten und erzeugen einen konzentrierten Vorwärtsschub.
3. **Klaue entsteht:** Um den rechten Arm materialisiert sich eine überdimensionale Chakra-Klaue. Die Finger spreizen sich weit. Die Kanten leuchten gelb-orange.
4. **Angriff:** Im Flug führt der Charakter einen diagonalen Hieb von oben nach unten aus. Die Chakra-Klaue folgt mit deutlich größerer Reichweite.
5. **Impact:** Beim Treffer erscheint eine kurze, halbmondförmige Kratzspur aus Energie. Auf dem Boden entstehen Funken und Staub. Der Treffer schleudert das Ziel nach hinten und unten.
6. **Landung:** Der Charakter landet tief auf einer Hand und beiden Füßen. Die Schweife federn den Aufprall optisch ab.
7. **Recovery:** Die Klaue zerfällt in Partikel. Der Körper richtet sich auf. Sprint oder normale Angriffe können nach der Recovery wieder übernommen werden.

**Gameplay:** Guter Übergang vom Sprint in den Nahkampf. Der Treffer hat mehr Knockdown als Beast Rush, aber eine erkennbare Recovery. Die Ausrichtung folgt der Sprint-Richtung, nicht automatisch einem Gegner hinter dem Charakter.

## 2.4 Forward Heavy: Beast Pulse / Tailed Beast Bomb

### Gemeinsamer Charge Start

1. Der Charakter stellt einen Fuß zurück und richtet beide Hände nach vorne.
2. Zwei Chakra-Schweife krümmen sich über die Schultern. Ihre Spitzen zeigen zwischen die Handflächen.
3. Ein kleiner rot-orangefarbener Energiekern erscheint. Energie zieht sich aus der Aura zum Kern.
4. Solange die volle Ladung nicht erreicht ist, kann der Spieler mit **Short** auslösen.
5. Bei erreichter Full Charge wachsen weitere Schweife um die Energieformation. Der Kern verändert sichtbar seine Form. Ab jetzt führt Loslassen ausschließlich zu **Full**.

### Short: Beast Pulse

**Funktion:** Breite frontale Chakra-Schockwelle mit moderatem Knockback.

**Animationsablauf:**

1. **Release:** Der Charakter stößt beide Hände ruckartig nach vorne. Die beiden oberen Schweife schnellen parallel mit.
2. **Energieform:** Der kleine Energiekern platzt nicht kugelförmig. Er streckt sich zu einem kurzen, breiten Druckwellenkegel.
3. **Flug:** Eine halbtransparente orangefarbene Welle läuft dicht über dem Boden in Blickrichtung. Der Rand besteht aus flammenartigen Wirbeln.
4. **Treffer:** Gegner im vorderen Fächer werden gleichzeitig erfasst. Am Kontaktpunkt erscheinen kurze Energieblitze.
5. **Reaktion:** Getroffene Gegner werden zurückgestoßen. Der Angriff schafft Distanz, hat aber keine große Explosion.
6. **Recovery:** Die Hände gehen zur Brust zurück. Die Schweife falten sich hinter den Schultern ein. Die Aura stabilisiert sich.

**Gameplay:** Schnell und breit. Gut gegen mehrere dicht vor dem Spieler stehende Gegner. Begrenzte Reichweite.

### Full: Tailed Beast Bomb

**Funktion:** Weitreichendes, komprimiertes Energieprojektil mit großer Explosion.

**Animationsablauf:**

1. **Fortgesetztes Aufladen:** Der Energiekern wächst zu einer großen rot-violetten Kugel. Vier Schweife krümmen sich darum.
2. **Energiezufluss:** Rot-orangefarbene und violette Partikel spiralen in die Kugel. Kleine Entladungen springen zwischen den Schweifspitzen über.
3. **Full-Ready-Kompression:** Die große Kugel schrumpft abrupt zu einer kleinen, fast schwarzen Sphäre. Nur ein intensiver violetter Leuchtrand bleibt sichtbar. Ein heller kurzer Ring bestätigt die volle Ladung.
4. **Release:** Hände und Schweifspitzen stoßen gleichzeitig nach vorne. Die Sphäre wird mit hoher Geschwindigkeit horizontal abgefeuert.
5. **Flugphase:** Das Projektil hinterlässt eine dünne spiralförmige Lichtspur. Seine Kompression bleibt bis zum Einschlag sichtbar.
6. **Impact-Pause:** Bei Kollision stoppt die Kugel für einen sehr kurzen visuellen Moment. Sie wirkt, als würde sie noch weiter in sich zusammenfallen.
7. **Explosion:** Anschließend expandiert sie schlagartig zu einer großen, kugelförmigen Energieexplosion. Eine ringförmige Druckwelle zieht über den Boden.
8. **Gegnerreaktion:** Hoher Schaden im Zentrum. Gegner am Rand werden stark zurückgeschleudert.
9. **Recovery:** Der Rückstoß drückt den Charakter leicht nach hinten. Die Schweife entspannen sich und kehren in ihre normale Bewegung zurück.

**Gameplay:** Mächtiger Distanz-Finisher mit hoher Verwundbarkeit während der Aufladung. Anders als Beast Pulse ist er ein eigenständiges Projektil mit einem Explosionsereignis.

## 2.5 Up Heavy: Chakra Uppercut / Twin Beast Ascension

### Gemeinsamer Charge Start

1. Der Charakter geht in eine leichte Hocke.
2. Chakra fließt sichtbar in seine Schultern und Arme.
3. Die Fäuste ziehen neben den Oberkörper. Die Schweife stellen sich hinter dem Rücken auf.
4. Bei Full Charge tritt zusätzlich ein zweiter großer Chakra-Arm hervor. Ein heller Energieimpuls zeigt die volle Ladung.

### Short: Chakra Uppercut

**Funktion:** Schneller Launcher gegen einen Gegner vor oder über dem Spieler.

**Animationsablauf:**

1. **Armbildung:** Ein großer Chakra-Arm legt sich um den rechten Arm. Die überdimensionale Faust schließt sich.
2. **Release:** Der Charakter stößt seine rechte Faust explosiv nach oben.
3. **Verlängerung:** Der Chakra-Arm wächst während der Bewegung über den echten Arm hinaus. Die Faust beschreibt einen steilen Bogen.
4. **Hit:** Gegner vor beziehungsweise über dem Charakter werden an der aufwärtsbewegten Faust getroffen.
5. **Reaktion:** Das Ziel wird nach oben geschleudert. Ein kurzer orangefarbener Lichtstreifen bleibt entlang der Schlagbahn.
6. **Recovery:** Der Chakra-Arm löst sich von der Faust aus auf. Der echte Arm sinkt zurück.

**Gameplay:** Einzelner schneller Anti-Air. Gut als Combo-Starter.

### Full: Twin Beast Ascension

**Funktion:** Mehrfachtreffer mit zwei riesigen Chakra-Armen und einer aufsteigenden Energiesäule.

**Animationsablauf:**

1. **Verstärkung:** Aus beiden Schultern entstehen riesige Chakra-Arme. Der Charakter geht tiefer in die Knie und ballt beide Fäuste.
2. **Schweifstellung:** Mehrere Schweife richten sich hinter dem Körper steil nach oben. Der Boden beginnt orange zu leuchten.
3. **Release:** Der Spieler reißt beide Fäuste hoch. Beide Chakra-Arme führen synchron einen gewaltigen Uppercut aus.
4. **Folgebewegung:** Weitere Schweife schnellen spiralförmig nach oben und verlängern die Angriffsbahn.
5. **Energiesäule:** Zwischen den hochgestreckten Chakra-Armen entsteht eine vertikale, flammenartige Chakra-Säule.
6. **Mehrfachtreffer:** Zuerst treffen die Fäuste. Danach halten Wirbel und Energiesäule die Gegner kurz in der Luft.
7. **Finaler Launcher:** Der letzte Impuls schleudert die Ziele besonders hoch.
8. **Recovery:** Die Säule zerfällt in aufsteigende Funken. Die Arme ziehen sich zurück und lösen sich in Partikel auf.

**Gameplay:** Große vertikale Trefferzone mit mehreren Trefferphasen. Deutlich stärker als der kurze Uppercut, aber langsamer.

## 2.6 Down Heavy: Tail Sweep / Tailed Beast Slam

### Gemeinsamer Charge Start

1. Der Charakter senkt die Hüfte. Die Schultern gehen leicht nach vorne.
2. Alle Chakra-Schweife spreizen sich seitlich.
3. Ihre Spitzen verdichten sich und leuchten heller.
4. Bei Full Charge wachsen die Schweife deutlich nach oben. Ihre Spitzen verharren bedrohlich über dem Boden.

### Short: Tail Sweep

**Funktion:** Schneller kreisförmiger Nahbereichshieb, ideal gegen umstehende Gegner.

**Animationsablauf:**

1. **Vorbereitung:** Zwei große Schweife bewegen sich knapp über den Boden nach außen.
2. **Release:** Der Charakter dreht seinen Oberkörper. Die beiden Schweife peitschen in einer flachen, fast kreisförmigen Bahn um ihn herum.
3. **Energiespur:** Ein kurzer sichelförmiger Leuchtstreifen markiert den Weg der Schweifspitzen.
4. **Treffer:** Gegner in Bodennähe werden an den umlaufenden Schweifen getroffen.
5. **Reaktion:** Leichte Gegner werden seitlich weggeschleudert. Andere geraten kurz ins Wanken.
6. **Recovery:** Die Schweife schwingen aus. Die Partikelspur verblasst. Der Charakter stabilisiert seinen Stand.

**Gameplay:** Schneller 360°-Nahbereichsangriff mit leichter Crowd-Control.

### Full: Tailed Beast Slam

**Funktion:** Mehrere Bodeneinschläge und eine große finale Druckwelle.

**Animationsablauf:**

1. **Aufladung:** Der Charakter stemmt beide Hände zum Boden. Bis zu neun massive Chakra-Schweife stellen sich auf.
2. **Energiedichte:** Die Schweifspitzen werden breiter und schwerer. Der Boden unter dem Charakter beginnt zu vibrieren.
3. **Release:** Der Charakter schlägt beide Hände nach unten. Die Schweife peitschen nacheinander auf mehrere Punkte um ihn herum.
4. **Einschlagsfolge:** An jedem Trefferpunkt entstehen eine kleine Chakra-Explosion, Staub und kurz aufleuchtende Bodenrisse.
5. **Finaler Einschlag:** Der letzte Schweif trifft direkt vor dem Charakter. Die zuvor getrennten Energiewellen verbinden sich.
6. **Große Druckwelle:** Eine breite ringförmige Schockwelle läuft nach außen.
7. **Gegnerreaktion:** Nahe Gegner werden mehrfach getroffen und kurz angehoben. Die finale Welle schleudert sie weg.
8. **Recovery:** Die Schweife lösen sich vom Boden, rollen sich hinter dem Rücken auf und kehren in den Idle-Loop zurück.

**Gameplay:** Flächenschaden und Crowd-Control gegen Gruppen. Die schweren Einschläge haben klar definierte Trefferframes.

## 2.7 Defense: Chakra Tail Guard

**Funktion:** Lebendiger, federnder Schild aus Chakra-Schweifen.

**Animationsablauf:**

1. **Guard Start:** Der Charakter kreuzt seine Unterarme vor der Brust.
2. **Schweifreaktion:** Zwei Schweife schnellen sofort von hinten nach vorne. Weitere folgen seitlich.
3. **Guard Formation:** Die Schweife umschlingen den Körper und bilden einen halbgeschlossenen Schutzkokon. Gesicht und zentrale Körpersilhouette bleiben erkennbar.
4. **Guard Hold:** Die Schweife bewegen sich ständig leicht. Ihre Spitzen richten sich unruhig auf nahe Gefahren. Energie pulsiert zwischen den einzelnen Schweifen.
5. **Block Impact:** Beim Treffer werden die betroffenen Schweife lokal nach innen gedrückt. Orangefarbene Funken spritzen heraus. Die Energie federt nach außen zurück.
6. **Perfect Block:** Ein Schweif fängt den Treffer präzise ab. Ein zweiter stößt unmittelbar nach vorne und erzeugt einen schnellen kurzen Konter.
7. **Guard Break:** Bei einem übermächtigen Treffer reißen die Schweife auseinander. Aura-Partikel sprühen nach außen. Der Charakter stolpert zurück.
8. **Guard Release:** Der Schutzkokon entfaltet sich spiralförmig. Die Schweife kehren in ihre normalen Rückenkurven zurück.

**Gameplay:** Reaktive, bewegliche Verteidigung. Der Perfect Block ist schnell und hat eher einen kurzen Unterbrechungseffekt als hohen Schaden.

## 2.8 Grab: Beast Tail Seize

**Eingabe:** **Defense halten + Down drücken**.  
**Bedingung:** Ein greifbarer Gegner befindet sich im nahen frontalen Bereich.  
**Funktion:** Gegner mit Chakra-Schweifen packen, heranziehen und mit einer Klaue zu Boden schlagen.

**Animationsablauf bei gültigem Ziel:**

1. **Target Confirm:** Während Defense gehalten wird, ist der Schweifkokon teilweise aktiv. Bei Down richten sich zwei Schweifspitzen abrupt auf den nächsten greifbaren Gegner vor dem Charakter.
2. **Guard-Übergang:** Der Charakter öffnet die verschränkten Unterarme leicht und senkt den Schwerpunkt. Zwei schützende Schweife lösen sich aus dem Guard. Die übrigen bleiben am Körper.
3. **Schweif-Ausstoß:** Die beiden gelösten Schweife schnellen nach vorne wie lebendige Seile. Ihre Spitzen spreizen sich zu greifenden Chakra-Klauen.
4. **Kontakt und Fixierung:** Ein Schweif legt sich um den Oberkörper des Gegners, ein zweiter fixiert seinen Arm- oder Schulterbereich. Ein kurzer orangefarbener Impuls signalisiert den bestätigten Grab.
5. **Heranziehen:** Der Charakter reißt einen Arm zurück. Die Schweife ziehen das Ziel vor ihn und heben es leicht vom Boden. Die Beine des Gegners schwingen nach vorne.
6. **Finisher-Vorbereitung:** Um den freien Arm des Charakters bildet sich eine große Chakra-Klaue. Der Charakter dreht seine Schulter nach oben.
7. **Finisher:** Er schlägt das gepackte Ziel mit der Chakra-Klaue schräg auf den Boden. Ein kompakter Energieausbruch und eine kleine Staubwolke markieren den Einschlag.
8. **Gegnerreaktion:** Das Ziel erleidet Schaden und einen kurzen Knockdown. Es landet unmittelbar vor dem Charakter oder leicht versetzt in Wurfrichtung.
9. **Release und Recovery:** Die Schweife lassen los, rollen sich zurück und bilden für einen Moment erneut den Defense-Kokon. Danach steht der Charakter wieder in Guard, solange Defense gehalten wird.

**Fehlschlag ohne Ziel:** Der Charakter löst nur einen sehr kurzen Schweif-Suchimpuls aus. Es gibt **keine** automatische Vorwärtsbewegung, **keinen** Teleport und **keinen** Gegnerzugriff außerhalb der Reichweite. Danach bleibt die Figur im Guard.

**Gameplay und Fairness:** Der Grab benötigt eine begrenzte Nahdistanz, eine gültige frontale Ausrichtung und ein greifbares Ziel. Sehr große Bosse oder ungreifbare Gegner können eine eigene Immunität beziehungsweise eine andere Reaktion erhalten. Ein erfolgreicher Grab sollte während der kurzen synchronisierten Animation nicht durch andere Eingaben unkontrolliert überschrieben werden.

## 2.9 Jump: Beast Leap mit animierter Kyūbi-Aura

**Grundprinzip:** Der eigentliche Spieler **springt wirklich**. Die Kyūbi-Aura und alle Chakra-Schweife werden **parallel dazu** animiert. Die Schweife folgen der vertikalen Beschleunigung mit leichter Verzögerung. Sie sind keine starre Grafik, die einfach mit dem Character-Transform nach oben verschoben wird.

**Animationsablauf:**

1. **Jump Anticipation:** Der Charakter geht schnell in die Hocke. Schultern und Hände sinken. Die Chakra-Schweife ziehen sich kurz zusammen und richten ihre Spitzen nach unten, als würde sich Energie in ihnen sammeln.
2. **Takeoff:** Die Füße verlassen den Boden. Gleichzeitig schießt Chakra aus den Beinen nach unten. Eine kleine rote Energieexplosion erscheint unter den Füßen. Die Schweife schnellen zuerst nach unten und hinten, dann folgen sie dem Aufstieg.
3. **Aufstieg:** Der Charakter streckt Beine und Rumpf dynamisch. Zwei Schweife verlaufen längs hinter ihm. Die anderen fächern sich wie ein flammenartiger Kranz auf. Die Aura wird unten am Körper länger, weil sie der Bewegung nachzieht.
4. **Luftbewegung:** Steuert der Spieler horizontal, neigen sich Oberkörper und Kopf in Bewegungsrichtung. Die Schweife werden entgegen der horizontalen Bewegung ausgelenkt. Ihre Spitzen folgen mit Verzögerung, damit Geschwindigkeit sichtbar bleibt.
5. **Apex / Scheitelpunkt:** Kurz vor dem höchsten Punkt verlangsamt sich die vertikale Bewegung. Der Charakter zieht die Knie etwas an. Die Schweife holen ihn ein und beginnen für einen Augenblick um den Körper zu schweben. Die Aura wirkt kompakter.
6. **Beginn des Falls:** Die Figur kippt leicht nach vorne. Die Chakra-Schweife richten sich nun eher nach oben. Der untere Rand der Aura wandert ebenfalls nach oben, weil die Energie dem fallenden Körper nachfolgt.
7. **Fall-Loop:** Die Beine werden auf die Landung vorbereitet. Die Schweife bilden eine nach oben aufgefächerte Kontur. Kleine Energiepartikel bleiben oberhalb der Figur zurück.
8. **Landing Anticipation:** Kurz über dem Boden werden die Knie angezogen. Zwei Schweife schwenken nach unten und außen, als würden sie den Aufprall abfedern.
9. **Landung:** Die Füße treffen den Boden. Der Charakter geht tief in die Knie und berührt optional mit einer Hand kurz den Boden. Eine kompakte rote Chakra-Welle und Staub breiten sich ringförmig aus.
10. **Follow-through:** Die Schweife schlagen verzögert nach unten und anschließend hoch. Erst danach kehrt ihre Idle-Bewegung zurück. Bei direktem Anschluss an Sprint fließen die Schweife stattdessen nahtlos in Beast Rush über.

**Visuelle Details:**

- Der Spieler bewegt sich physisch mit seinem normalen Jump-System. Die Aura ist eine separate animierte Ebene.
- Die Chakra-Schweife besitzen eigene Kurven oder Bones für Root, Mittelteil und Spitze.
- Beim Absprung ziehen die Schweife nach unten. Beim Fallen zeigen sie nach oben. Dieser Richtungswechsel macht die Luftbewegung glaubhaft.
- Der VFX-Effekt unter den Füßen ist eine rein visuelle Start- beziehungsweise Landeentladung. Der normale Jump verursacht **keinen automatischen Flächenschaden**, sofern das nicht ausdrücklich als Mechanik ergänzt wird.
- Ein späterer Air-Attack kann dieselben Airborne-States nutzen. Er ist nicht Bestandteil dieses Movesets.

---

# 3. Susanoo: Astral Guardian Transformation

## 3.1 Visuelle Grundform und Idle

Um den Charakter erscheint ein gewaltiger, halbtransparenter Astralkrieger aus violetten Knochenstrukturen, Rüstungsteilen und leuchtender spiritueller Energie. Der Spieler bleibt im zentralen Brustbereich sichtbar. Der Astralkörper bildet seine Bewegungen vergrößert und mit leicht verzögerter Masse nach.

**Idle-Animation:**

1. Der Charakter steht kontrolliert und aufrecht.
2. Die Schultern des Astralkriegers heben und senken sich minimal.
3. Rüstungsteile schwimmen mit geringer Verzögerung an ihrer Grundposition. Leuchtende Impulse wandern entlang der Rippen und Arme.
4. Die äußeren Konturen pulsieren sanft. Violette Partikel lösen sich besonders an Schulterplatten und Unterarmen.
5. Beim Richtungswechsel dreht sich der Astralkörper sichtbar mit. Kopf und Oberkörper folgen etwas früher als die großen Rüstungsteile.

**Lesbarkeit:** Der innere Spieler bleibt stets gut zu sehen. Brustpanzer und zentrale Rüstungsteile sind transparenter als äußere Konturen, Hände, Waffen und Angriffseffekte.

## 3.2 Sprint: Astral Charge

**Funktion:** Kraftvoller Vorwärtssturm mit schweren Schritten und Knockback bei Kontakt.

**Animationsablauf:**

1. **Aktivierung:** Der Charakter verlagert sein Gewicht nach vorne. Der Astralkrieger senkt seinen Oberkörper und nimmt eine stabile Schulterhaltung ein.
2. **Erster Schritt:** Ein massiver Astralfuß setzt nach vorne. Beim Aufsetzen erscheinen Staub und ein kurzer violetter Ring am Boden.
3. **Beschleunigung:** Die Schritte werden länger. Arme und Schulterplatten schwingen sichtbar verzögert. Die Energiekontur zieht eine breite Spur hinter sich.
4. **Sprint-Loop:** Der Astralkrieger bewegt sich mit schweren, rhythmischen Schritten. Sein Körper schwebt nicht einfach horizontal. Die Schultern bewegen sich leicht auf und ab.
5. **Gegnerkontakt:** Der Gegner prallt gegen Schulter oder Brustbereich. Ein konzentrierter violetter Stoßimpuls markiert den Treffer. Kleinere Gegner werden beiseitegedrückt.
6. **Abbremsen:** Der Susanoo stemmt einen Fuß in den Boden. Die Rüstung schwingt nach. Eine kleine Staubwolke zeigt die Massenträgheit.

**Gameplay:** Langsamer als Beast Rush, aber mit stärkerem Kontakt-Knockback. Keine automatische vollständige Unverwundbarkeit beim Sprint.

## 3.3 Sprint + Heavy: Colossus Breaker

**Funktion:** Schwerer Durchbruch-Faustschlag aus der Bewegung.

**Animationsablauf:**

1. **Vorbereitung:** Der Astralkrieger zieht seinen rechten Arm weit zurück. Der Charakter im Inneren führt denselben Bewegungsimpuls aus.
2. **Verstärkung:** Energie konzentriert sich in der Astralfaust. Weitere Rüstungsplatten legen sich um die Knöchel.
3. **Schritt und Schlag:** Der Susanoo macht einen letzten kräftigen Schritt. Der Oberkörper rotiert. Die Faust schießt geradlinig nach vorne.
4. **Impact:** Beim Treffer erscheint hinter der Faust eine kurze kegelförmige Druckwelle. Kleine violette Splitter fliegen seitlich davon.
5. **Gegnerreaktion:** Das Ziel wird weit zurückgestoßen. Bei entsprechendem Kollisionssystem kann es weitere Gegner hinter sich anstoßen.
6. **Follow-through:** Der Arm bleibt einen Moment ausgestreckt. Die Schulterplatten schwingen nach und die Energie verliert an Helligkeit.
7. **Recovery:** Der Susanoo zieht die Faust zurück und nimmt seine Kampfhaltung ein.

**Gameplay:** Schwerer Gap-Closer. Spürbar längere Recovery als Beast Pounce.

## 3.4 Forward Heavy: Spectral Arrow / Astral Siege Arrow

> **Bestandsvorgabe:** Susanoo **spannt bei Forward Heavy bereits einen Bogen**. Die existierende Bogenanimation wird beibehalten. Keine Umstellung auf einen Schwertangriff.

### Gemeinsamer Charge Start mit vorhandenem Bogen

1. Der Susanoo hebt seinen Bogenarm. Die bekannte Bogenanimation startet.
2. Die andere Hand greift die Bogensehne und zieht sie zurück.
3. Ein violetter Energiepfeil bildet sich zwischen Fingern und Sehne.
4. Die gespannte Pose bleibt sichtbar, solange Heavy gedrückt wird.
5. Wird vor Full Charge losgelassen, startet der kurze Pfeilschuss.
6. Bei Full Charge verlängert und verdichtet sich **derselbe** Pfeil zu einer massiven Belagerungsform. Ein klarer visueller Impuls bestätigt die volle Ladung.

### Short: Spectral Arrow

**Funktion:** Schneller, präziser Pfeil mit leichter Unterbrechung.

**Animationsablauf:**

1. **Pfeilformation:** Der kurze Pfeil besitzt einen schmalen violetten Kern und eine leicht kristalline Außenkontur.
2. **Release:** Die Sehne schnellt nach vorne. Die rechte Hand federt sichtbar nach. Der Susanoo bleibt stabil.
3. **Flugphase:** Der Pfeil fliegt schnell und geradlinig. Eine dünne violette Lichtspur zeichnet seine Flugbahn.
4. **Treffer:** Am ersten getroffenen Gegner erscheint ein kleiner konzentrierter Energieimpuls.
5. **Gegnerreaktion:** Das Ziel wird leicht zurückgedrückt. Unterbrechbare Aktionen werden kurz gestört.
6. **Recovery:** Die Sehne schwingt aus. Der Bogen bleibt einen Augenblick sichtbar und löst sich dann bei Bedarf auf.

**Gameplay:** Schneller Distanz-Poke und Interrupt. Keine große Explosion und keine Durchdringung mehrerer Gegner.

### Full: Astral Siege Arrow

**Funktion:** Großer Belagerungspfeil, der Gegner durchdringt und am Ende explodiert.

**Animationsablauf:**

1. **Weiteres Spannen:** Der Susanoo zieht die Sehne weiter zurück. Sein Oberkörper dreht sich leicht. Die Rüstung am Rücken und an den Schultern pulsiert.
2. **Pfeilwachstum:** Der schmale Pfeil wird länger und breiter. Seine Spitze verwandelt sich in eine große kristalline Speerspitze.
3. **Energieringe:** Mehrere violette Ringe rotieren um den Pfeilschaft. Energieströme laufen aus der Rüstung des Susanoo in die gespannte Sehne.
4. **Full-Ready:** Die Ringe ziehen sich zusammen. Der Pfeil erhält einen fast weißen Energiekern. Ein heller Impuls signalisiert die abgeschlossene Aufladung.
5. **Release:** Die Finger öffnen sich. Die Bogensehne schnellt mit einem kräftigen Energieausbruch nach vorne.
6. **Flugphase:** Der massive Pfeil fliegt horizontal. Eine breite spiralförmige violette Spur bleibt hinter ihm zurück.
7. **Durchdringung:** Kleine Gegner werden durchstoßen. Bei jeder Durchdringung entsteht ein kurzer Energieblitz.
8. **Finale Explosion:** An einem massiven Hindernis oder am Ende der Reichweite detoniert der Pfeil. Mehrere strahlenförmige Energieklingen schießen vom Einschlagspunkt nach außen.
9. **Gegnerreaktion:** Durchdrungene Ziele erleiden hohen Schaden. Ziele im Explosionsbereich werden zusätzlich weggestoßen.
10. **Recovery:** Der Susanoo senkt den Bogenarm. Energie läuft noch kurz über die Sehne. Danach endet die Bogenanimation und der Astralkrieger geht in Idle über.

**Gameplay:** Lane-Piercing und große finale Explosion. Deutlich andere Funktion als der kurze Spectral Arrow.

## 3.5 Up Heavy: Rising Blade / Heaven Splitter

### Gemeinsamer Charge Start

1. Ein spirituelles Schwert entsteht in der rechten Hand des Susanoo.
2. Der Astralkrieger senkt seinen Oberkörper und führt die Klinge nahe am Boden nach hinten.
3. Energie sammelt sich entlang der Schneide.
4. Bei Full Charge greift die zweite Hand an den Griff. Die Klinge wird länger und erhält eine helle zusätzliche Kontur.

### Short: Rising Blade

**Funktion:** Schneller Aufwärtshieb mit Launcher.

**Animationsablauf:**

1. **Waffenbildung:** Das kurze, breite Energieschwert stabilisiert sich in der rechten Hand.
2. **Release:** Der Charakter im Inneren führt seinen Arm nach oben. Der Susanoo setzt die Bewegung zu einem vertikalen Hieb um.
3. **Schlagbahn:** Eine dünne violette Sichel folgt der Klinge von unten nach oben.
4. **Hit:** Gegner im Aufwärtsbereich werden von der Klinge getroffen.
5. **Reaktion:** Das Ziel fliegt nach oben und kann durch Luftkombos weiter angegriffen werden.
6. **Recovery:** Der Susanoo bremst die Klinge über seinem Kopf ab. Die zusätzliche Energiespur löst sich auf.

**Gameplay:** Schneller Anti-Air und Combo-Launcher.

### Full: Heaven Splitter

**Funktion:** Großer beidhändiger Aufwärtshieb mit vertikaler Energiewand.

**Animationsablauf:**

1. **Verstärkung:** Der Susanoo packt die Waffe mit beiden Händen. Die Klinge verlängert sich stark.
2. **Energieaufbau:** Entlang der Schneide laufen violette Blitze. Unter den Füßen des Astralkriegers schweben Partikel auf.
3. **Full-Ready:** Die Klinge wird hellviolett. Ein fast weißer Streifen markiert die Schneide.
4. **Release:** Der Astralkrieger führt einen mächtigen beidhändigen Hieb von unten nach oben aus. Sein ganzer Oberkörper folgt.
5. **Energiewand:** Eine breite vertikale Klinge löst sich vom Schwert. Sie steigt wie eine leuchtende Wand auf.
6. **Mehrfachtreffer:** Gegner innerhalb der vertikalen Trefferzone werden von mehreren aufsteigenden Energieströmen erfasst.
7. **Finaler Stoß:** Am oberen Ende der Energiewand entsteht eine kleine Entladung. Gegner werden hochgeschleudert.
8. **Recovery:** Das Schwert bleibt kurz über dem Kopf und senkt sich dann. Die Energiewand zerfällt in Partikel.

**Gameplay:** Größere Reichweite nach oben, mehrere Treffer, längere Recovery.

## 3.6 Down Heavy: Titan Stomp / Titan's Judgment

### Gemeinsamer Charge Start

1. Der Susanoo verlagert sein Gewicht nach unten und macht sich stabil.
2. Energie strömt aus dem Oberkörper in die Gliedmaßen.
3. Für den kurzen Release verlagert sich die Energie auf einen Fuß.
4. Bei Full Charge richtet der Astralkrieger sich auf. Beide Arme heben sich zum großen Bodenschlag.

### Short: Titan Stomp

**Funktion:** Schneller Fußstampfer mit kleiner Bodenwelle.

**Animationsablauf:**

1. **Fuß anheben:** Der Astralkrieger verlagert Gewicht auf das linke Bein und hebt den rechten Fuß.
2. **Energiefokus:** Violette Energie konzentriert sich an Fuß und Unterschenkel.
3. **Release:** Der Fuß schlägt mit Kraft auf den Boden.
4. **Impact:** Eine kompakte Staubexplosion und ein flacher violetter Ring breiten sich aus.
5. **Gegnerreaktion:** Nahe Gegner verlieren kurz das Gleichgewicht oder werden unterbrochen.
6. **Recovery:** Das Gewicht verlagert sich zurück. Der Susanoo nimmt eine stabile Grundhaltung ein.

**Gameplay:** Schneller Nahbereichs-Stagger ohne großen Schaden.

### Full: Titan's Judgment

**Funktion:** Gewaltiger Doppelfaust-Bodenschlag mit zwei Druckwellen.

**Animationsablauf:**

1. **Armhebung:** Der Susanoo stemmt die Beine fest in den Boden. Beide Arme heben sich langsam über den Kopf.
2. **Energiedichte:** Die Astralrüstung um die Fäuste verdichtet sich. Kleine Steine schweben unter dem Körper auf.
3. **Full-Ready:** Die Fäuste berühren sich über dem Kopf. Zwischen ihnen erscheint ein heller Energiekern.
4. **Release:** Der gesamte Oberkörper fällt nach vorne. Beide Fäuste schlagen mit hoher Wucht auf den Boden.
5. **Erster Impact:** Staub, Steinfragmente und violette Bodenrisse entstehen. Nahe Gegner werden kurz angehoben.
6. **Zweite Entladung:** Der Energiekern detoniert nach einer kurzen Verzögerung. Eine breite ringförmige Schockwelle läuft nach außen.
7. **Gegnerreaktion:** Ziele im Bereich des ersten Einschlags erhalten hohen Schaden. Die zweite Welle schleudert sie weg.
8. **Recovery:** Der Susanoo hebt die Fäuste aus dem Einschlagsbereich. Steinfragmente fallen zurück. Die Energie verblasst.

**Gameplay:** Hoher Flächenschaden und Crowd-Control. Schwer und risikoreich, aber visuell sehr mächtig.

## 3.7 Defense: Susanoo Ribcage

**Funktion:** Fester Schutz durch Rippenpanzer und eine riesige Astralhand.

**Animationsablauf:**

1. **Guard Start:** Der Charakter hebt den linken Unterarm vor die Brust. Die Astralrüstung reagiert darauf.
2. **Rippenformation:** Die äußeren Rüstungsteile werden transparenter. Große leuchtende Rippen bilden sich um den Spieler.
3. **Handformation:** Aus dem Brustkorb wächst ein gigantischer Skelettarm. Die geöffnete Handfläche stellt sich schützend vor den Körper.
4. **Guard Hold:** Die Hand bleibt beinahe unbeweglich. Kleine Energieströme fließen zwischen den Rippen. Die starre Haltung vermittelt große Masse.
5. **Block Impact:** Beim Treffer krümmen sich die Finger nur leicht. Ein heller Energieimpuls läuft durch die Hand und in den Rippenkäfig.
6. **Perfect Block:** Die Hand schließt sich abrupt beim Einschlag und stößt den Gegner unmittelbar danach mit einem kräftigen Impuls zurück.
7. **Guard Break:** Bei übermächtigem Treffer entstehen leuchtende Risse. Einige Rippen zerbrechen in violette Energiefragmente. Der Spieler taumelt nach hinten.
8. **Guard Release:** Die Hand zieht sich zurück. Die Rippen lösen sich von oben nach unten auf. Die äußere Astralrüstung erscheint wieder.

**Gameplay:** Stabiler Guard mit schwerem Perfect-Block-Konter. Die zentrale Spielfigur bleibt trotz Rippen und Schutzhand sichtbar.

## 3.8 Grab: Astral Hand Seizure

**Eingabe:** **Defense halten + Down drücken**.  
**Bedingung:** Ein greifbarer Gegner befindet sich im nahen frontalen Bereich.  
**Funktion:** Mit der riesigen Astralhand packen, anheben und kraftvoll zu Boden schlagen.

**Animationsablauf bei gültigem Ziel:**

1. **Target Confirm:** Während der Susanoo im Ribcage-Guard steht, dreht sich seine Schutzhand kurz zum nächsten greifbaren Gegner vor ihm. Die Finger spreizen sich.
2. **Guard-Übergang:** Der innere Charakter streckt eine Hand in Richtung des Ziels. Die Astralhand löst sich aus ihrer defensiven Position. Der Rippenpanzer bleibt teilweise um den Spieler bestehen.
3. **Greifbewegung:** Der große Astralarm stößt nach vorne. Die Handfläche öffnet sich weit. Die Finger bewegen sich einzeln um den Zielkörper.
4. **Kontakt und Fixierung:** Die Finger schließen sich um Oberkörper beziehungsweise Schulterpartie des Gegners. Die Hand leuchtet beim erfolgreichen Kontakt kurz intensiv violett.
5. **Anheben:** Der Astralkrieger hebt das Ziel mit einem Arm an. Die Beine des Gegners verlassen den Boden. Der innere Charakter führt eine deutlich kleinere, passende Hebebewegung aus.
6. **Finisher-Vorbereitung:** Der Susanoo rotiert den Oberkörper leicht zurück. Die Greifhand wird mit dem Gegner über die Schulter gehoben. Energie sammelt sich entlang des Unterarms.
7. **Finisher:** Der Astralkrieger schlägt den Gegner mit einer gewaltigen Bewegung nach vorne auf den Boden. Ein ringförmiger violetter Impuls und eine kompakte Staubwolke entstehen.
8. **Gegnerreaktion:** Hoher einzelner Grab-Treffer und Knockdown. Der Gegner liegt kurz vor dem Charakter.
9. **Release und Recovery:** Die Astralfinger öffnen sich. Die Hand kehrt an die Schutzposition vor dem Rippenpanzer zurück. Solange Defense gehalten wird, geht der Spieler wieder in Guard.

**Fehlschlag ohne Ziel:** Die Astralhand führt nur eine kurze Greif- beziehungsweise Suchbewegung in der Nähe des Körpers aus. Es entsteht **kein Treffer** und kein unfreiwilliger Fernzugriff. Danach kehrt sie in die Schutzposition zurück.

**Gameplay und Fairness:** Der Grab hat nur Nahreichweite. Er kann gegen normale Gegner sehr stark sein, sollte aber nicht ohne zusätzliche Regeln große Bosse, Luftziele oder geschützte Sonderzustände greifen. Der Rippenpanzer schützt während der Greifanimation nicht automatisch vollständig.

## 3.9 Jump: Astral Leap mit synchron animiertem Susanoo

**Grundprinzip:** Der **eigentliche Spieler springt**. Der gewaltige Astralkörper führt den Sprung synchron mit aus. Die Rüstung besitzt sichtbare Trägheit. Arme, Schulterplatten, Rippen und Energiefragmente erhalten separate Animationen. Es soll **nicht** so aussehen, als würde eine starre Susanoo-Grafik mit dem Spieler nach oben verschoben.

**Animationsablauf:**

1. **Jump Anticipation:** Der Charakter beugt seine Knie. Gleichzeitig senkt der Susanoo den Oberkörper, zieht beide Arme leicht zurück und beugt seine riesigen Beine. Schulter- und Hüftplatten schieben sich ineinander.
2. **Energieansammlung:** Unter den Astralfüßen sammelt sich violette Energie. Die Rippen leuchten kurz heller. Kleine Partikel werden vom Boden zu den Beinen gezogen.
3. **Takeoff:** Der Charakter stößt sich ab. Der Astralkrieger setzt zeitgleich zu einem schweren, aber übernatürlich kraftvollen Absprung an. Unter den Füßen erscheint ein breiter violetter Stoßring mit wenig Staub.
4. **Nachziehen der Rüstung:** Der zentrale Astralkörper steigt sofort auf. Große Schulterplatten und äußere Rüstungselemente folgen einige Animationsframes später. Transparente Energiefäden verbinden die verschobenen Elemente kurz sichtbar.
5. **Aufstieg:** Der innere Charakter streckt die Beine. Der Susanoo nimmt eine kontrollierte Flughaltung ein. Seine Knie sind leicht angewinkelt, Arme bleiben seitlich stabilisierend.
6. **Luftbewegung:** Bei horizontaler Eingabe neigen sich Charakter und Astralkörper in Bewegungsrichtung. Die großen Rüstungsteile schwingen entgegen der Bewegung aus. Der Effekt bleibt moderat, damit der Krieger nicht wie ein flatterndes Tuch wirkt.
7. **Apex / Scheitelpunkt:** Am höchsten Punkt endet die Aufwärtsbewegung fast vollständig. Der Astralkrieger zieht seine Knie etwas an. Schultern und Rüstung holen ihre Trägheit auf und ordnen sich kurz symmetrisch um den Spieler.
8. **Fallbeginn:** Die Beine gehen nach unten. Die Arme öffnen sich leicht zur Stabilisierung. Violette Energie streicht nach oben an den Rüstungskanten vorbei.
9. **Fall-Loop:** Der Susanoo richtet seinen Oberkörper auf und bereitet eine schwere Landung vor. Außenkonturen flackern durch den Luftstrom. Einzelne Partikel ziehen oberhalb des Körpers nach.
10. **Landing Anticipation:** Kurz über dem Boden werden beide Beine zum Abfedern gebeugt. Die Arme gehen nach vorn. Die Rüstung verdichtet sich an Knien und Füßen.
11. **Landung:** Charakter und Astralkörper berühren synchron den Boden. Der Spieler geht in eine Kniebeuge. Der Susanoo macht die gleiche Bewegung in großem Maßstab. Ein violetter Bodenring und eine kleine Staubwolke breiten sich aus.
12. **Follow-through:** Die Rüstung schwingt sichtbar nach. Oberkörper und Schulterplatten stabilisieren sich. Bei fortgesetztem Sprint geht der Bewegungsablauf direkt in Astral Charge über.

**Visuelle Details:**

- Der Spieler erhält weiterhin seine reguläre, physische Sprungbewegung. Susanoo ist eine synchronisierte visuelle Transformation.
- Große Rüstungsteile benötigen Follow-through, damit Gewicht und Trägheit erkennbar sind.
- Der Astralkrieger darf sich optisch nicht so weit vom inneren Spieler lösen, dass unklar wird, wo sich die eigentliche Hitbox befindet.
- Der Landeeffekt zeigt Gewicht. Ein normaler Sprung verursacht aber **keinen zusätzlichen Flächenschaden**, solange keine separate Jump-Slam-Mechanik definiert wird.
- Sprunghöhe und Flugbahn müssen nicht verändert werden. Die Transformation kann allein durch Animation und VFX schwerer wirken.

---

# 4. Grab-System: Gemeinsame Logik für beide Transformationen

## 4.1 Eingabe und Zielprüfung

Die Eingabe ist **Defense halten und Down drücken**. Die Zielerfassung prüft in einem kleinen Bereich vor der Figur einen greifbaren Gegner.

**Vorgeschlagene Prüfungen:**

1. Defense ist aktiv und die Figur kann eine Grab-Aktion beginnen.
2. Down wird neu gedrückt. Dauerhaftes Halten von Down löst nicht wiederholt Grab aus.
3. Der Gegner liegt innerhalb der definierten **Grab-Reichweite** und des zulässigen **Frontwinkels**.
4. Der Gegner ist greifbar: nicht bereits von einer anderen Grab-Aktion gehalten, nicht außerhalb der erlaubten Höhenzone, nicht immun.
5. Bei mehreren Zielen wird zuerst die kurze Distanz bewertet. Bei ähnlicher Distanz gewinnt das Ziel, das am nächsten zur Blickrichtung liegt.
6. Nach erfolgreicher Prüfung startet die zugehörige synchrone Grab-Animation. Sonst wird die kurze Miss-Animation abgespielt.

**Startvorschlag:** Greifbereich rund um die vordere Körperbreite des Spielers und nur geringe zusätzliche Reichweite. Die genauen Werte müssen von Maßstab, Kamera und Collider-Geometrie der 2.5D-Lane abgeleitet werden. Keine unsichtbare Fernmagnetisierung.

## 4.2 Synchronisation mit dem Gegner

- Grab besitzt die Zustände `grab_start`, `grab_contact`, `grab_hold`, `grab_finisher`, `grab_release` und `grab_recovery`.
- Beim bestätigten Kontakt werden Angreifer und Opfer an einem gemeinsamen relativen Grab-Anker ausgerichtet. Der Versatz bleibt begrenzt und folgt der sichtbaren Hand beziehungsweise den Schweifen.
- Das Opfer spielt passende Zustände wie `victim_caught`, `victim_lifted`, `victim_slammed`, `victim_knockdown` ab.
- Der finale Schaden wird am Impact-Event ausgelöst. Nicht schon beim bloßen Starten des Grab.
- Bei Unterbrechung vor dem Kontakt kehren beide in einen gültigen Zustand zurück. Nach Kontakt gelten definierte Unterbrechungs- und Immunitätsregeln.
- Im PvP sollten Grab-Reichweite, Startzeit und Counterplay eindeutig telegraphiert werden.

## 4.3 Priority und Konflikte

1. `Defense + Down` löst Grab aus, falls diese Kombination in einem gültigen Zustand gedrückt wird.
2. `Down + Heavy` bleibt der normale Down-Heavy-Charge, wenn Defense **nicht** aktiv ist.
3. Während eines laufenden Grabs darf Down nicht erneut als Heavy-Start interpretiert werden.
4. Ohne Ziel gibt es einen kurzen Grab-Fehlversuch und anschließend weiter Defense. Keine versehentliche Down-Heavy-Attacke.
5. Ein Grab benötigt eine begrenzte Recovery beziehungsweise eine andere Spam-Begrenzung. Das genaue Timing ist Balancing-Sache.

---

# 5. Jump-System: Gemeinsame Regeln und Unterschiede

## 5.1 Jump ist eine eigene Bewegungsanimation

Der Sprung besteht aus `jump_anticipation`, `jump_takeoff`, `jump_ascend`, `jump_apex`, `jump_fall`, `jump_land` und `jump_recover`.

**Der Charakter springt selbst.** Die Transformation ist keine separate Figur mit unabhängiger Physik. Aura oder Astralkörper bekommen aber ein eigenes, synchronisiertes Animationssystem.

| Phase | Kyūbi | Susanoo |
|---|---|---|
| Anticipation | Tiefe Hocke, Schweife ziehen sich zusammen | Tiefe Kniebeuge, Rüstung verdichtet sich |
| Takeoff | Explosiver Chakra-Impuls unter den Füßen | Breiter violetter Stoßring unter Astralfüßen |
| Ascend | Schweife zeigen nach unten und hinten | Rüstungsteile ziehen dem aufsteigenden Körper nach |
| Apex | Schweife holen den Spieler ein und schweben kurz | Rüstung stabilisiert sich um den Spieler |
| Fall | Schweife zeigen nach oben, Aura zieht nach | Arme öffnen sich, Energie streicht nach oben |
| Landing | Elastische Landung, Schweife federn nach | Schwere Landung, Rüstung wackelt verzögert |
| Übergang in Sprint | Direkter Übergang in Beast Rush | Direkter Übergang in Astral Charge |

## 5.2 Bewegung und VFX voneinander trennen

**Gameplay-Seite:** Die Spielfigur steuert ihre vertikale Position, Geschwindigkeit, Kollision und Landung wie gewohnt.

**Animationsseite:** Der innere Character-Skeleton wechselt die Sprungpose. Die Transformation erhält dazu passende Zusatzanimationen. VFX folgen Hand-, Fuß-, Rücken- und Körper-Ankern, nicht nur einer einzigen Weltposition.

**In der 2.5D-Lane:** Die vertikale Spielbewegung und eine eventuelle Tiefenbewegung der Lane müssen auch in den Schweifen beziehungsweise im Astralkörper lesbar sein. Die Sprite- oder Mesh-Sortierung wird dynamisch geprüft. Bei der Landung sollte der sichtbare Kontaktpunkt am Boden mit dem tatsächlichen Character-Collider übereinstimmen.

## 5.3 Technische Animationsparameter

Die folgenden Werte sind **Vorschläge zur Animation**, keine Aussagen über die bereits vorhandene Sprungphysik:

- **Kyūbi:** kurze Anticipation, weicher Follow-through und stärkere Schweifverformung.
- **Susanoo:** längere optische Vorbereitung, massiver Bodeneffekt und stärkeres Nachschwingen der Rüstung.
- Der eigentliche Jump-Impuls kann für beide Transformationen identisch bleiben, falls die Spielbalance das erfordert.
- Animationsgeschwindigkeit wird an die reale vertikale Geschwindigkeit gekoppelt. Apex beginnt idealerweise nahe `vertical_velocity = 0`.
- Beim Übergang von Aufstieg zu Fall werden **nicht alle VFX hart umgeschaltet**. Schweife und Rüstung gehen über einen kurzen Blend in die neue Ausrichtung.
- Eine Landung auf einer erhöhten Plattform benötigt dieselbe Landepose, aber an der tatsächlichen Kontaktfläche und nicht am Weltboden.

---

# 6. Technische Implementierung

## 6.1 Mögliche State-Machine

```text
TRANSFORMED
├── IDLE / WALK / TURN
├── SPRINT
│   ├── BEAST_RUSH / ASTRAL_CHARGE
│   └── SPRINT_HEAVY
│       └── BEAST_POUNCE / COLOSSUS_BREAKER
├── JUMP
│   ├── ANTICIPATION
│   ├── TAKEOFF
│   ├── ASCEND
│   ├── APEX
│   ├── FALL
│   └── LAND
├── HEAVY_CHARGE
│   ├── FORWARD
│   ├── UP
│   └── DOWN
│       [pro Richtung: START -> CHARGING -> RELEASE_SHORT oder FULL_READY -> RELEASE_FULL]
├── DEFENSE
│   ├── GUARD_START
│   ├── GUARD_HOLD
│   ├── BLOCK_HIT
│   ├── PERFECT_BLOCK
│   ├── GUARD_BREAK
│   └── GRAB
│       ├── GRAB_START
│       ├── GRAB_CONTACT
│       ├── GRAB_HOLD
│       ├── GRAB_FINISHER
│       ├── GRAB_RELEASE
│       └── GRAB_MISS
└── RECOVERY / INTERRUPTED
```

Die Reihenfolge der Eingabeprioritäten muss ausdrücklich festgelegt werden. Grab darf nicht als Down Heavy oder als Jump fehlinterpretiert werden.

## 6.2 Datengetriebene Definition: Beispiel

```yaml
transformation: kyubi

inputs:
  sprint: beast_rush
  sprint_heavy: beast_pounce
  defense: chakra_tail_guard
  defense_down: beast_tail_seize
  jump: beast_leap

heavy:
  full_charge_time_seconds: 1.2
  tiers: 2
  cast_on_release: true
  forward:
    charge_animation: kyubi_forward_charge
    short:
      name: beast_pulse
      animation: kyubi_forward_short_release
      vfx: frontal_chakra_wave
      hit_shape: frontal_cone
      effect: knockback
    full:
      ready_animation: kyubi_forward_full_ready
      name: tailed_beast_bomb
      animation: kyubi_forward_full_release
      vfx: compressed_energy_orb
      hit_shape: projectile_plus_explosion
      effect: area_damage_and_knockback
  up:
    short: chakra_uppercut
    full: twin_beast_ascension
  down:
    short: tail_sweep
    full: tailed_beast_slam

grab:
  input: defense_down
  requires_valid_close_target: true
  require_front_arc: true
  miss_animation: kyubi_grab_miss
  contact_event: grab_contact
  damage_event: grab_finisher_impact
  return_to_guard_if_defense_held: true

jump:
  physics_source: player_controller
  character_animation: player_jump
  transformation_animation: kyubi_aura_jump
  phases: [anticipation, takeoff, ascend, apex, fall, land]
  tail_follow_through: true
  automatic_landing_damage: false
```

```yaml
transformation: susanoo

inputs:
  sprint: astral_charge
  sprint_heavy: colossus_breaker
  defense: susanoo_ribcage
  defense_down: astral_hand_seizure
  jump: astral_leap

heavy:
  full_charge_time_seconds: 1.2
  tiers: 2
  cast_on_release: true
  forward:
    # Bestehende Bogenanimation wiederverwenden.
    charge_animation: existing_susanoo_bow_draw
    short:
      name: spectral_arrow
      release_animation: susanoo_bow_short_release
      hit_shape: single_arrow
      effect: damage_and_interrupt
    full:
      ready_animation: susanoo_bow_full_ready
      name: astral_siege_arrow
      release_animation: susanoo_bow_full_release
      hit_shape: piercing_arrow_plus_explosion
      effect: pierce_damage_and_knockback
  up:
    short: rising_blade
    full: heaven_splitter
  down:
    short: titan_stomp
    full: titans_judgment

grab:
  input: defense_down
  requires_valid_close_target: true
  require_front_arc: true
  miss_animation: susanoo_grab_miss
  contact_event: grab_contact
  damage_event: grab_finisher_impact
  return_to_guard_if_defense_held: true

jump:
  physics_source: player_controller
  character_animation: player_jump
  transformation_animation: susanoo_armor_jump
  phases: [anticipation, takeoff, ascend, apex, fall, land]
  armor_follow_through: true
  automatic_landing_damage: false
```

## 6.3 Layering und Ankerpunkte

### Kyūbi

- `player_body`: sichtbarer eigentlicher Charakter.
- `aura_body_back`: Chakra-Kontur hinter dem Charakter.
- `tail_01 ... tail_N`: separate Schweif-Bones oder Partikel-Splines.
- `aura_body_front`: dünne Energieebene vor dem Körper.
- `hand_l / hand_r`: Ausgangspunkte für Chakra-Arme, Klauen und Energieprojektil.
- `foot_l / foot_r`: Takeoff- und Landing-Impulse.
- `grab_anchor`: Zielposition bei bestätigtem Grab.

### Susanoo

- `player_body`: Spieler im Zentrum.
- `astral_core`: Becken, Wirbelsäule und zentrale Bindung an den Spieler.
- `ribcage`: transparente Brust- und Defensestruktur.
- `arm_l / arm_r`, `hand_l / hand_r`: schwere Arm- und Handanimationen.
- `leg_l / leg_r`, `foot_l / foot_r`: Sprint- und Sprunganimationen.
- `armor_shoulder_l / armor_shoulder_r`: verzögert nachziehende Rüstung.
- `bow_grip / bow_string / arrow_socket`: **bestehende Bogen-Animation** und zwei Projektilvarianten.
- `grab_anchor`: Position des Gegners in der greifenden Astralhand.

## 6.4 Trefferzonen und Synchronität

- Trefferzonen werden am **Aktivframe** freigegeben und am Ende des sichtbaren Angriffs geschlossen.
- Short und Full können komplett unterschiedliche Hitbox-Geometrien nutzen.
- Grab verwendet eine **Zielprüfung vor der Animation** und ein gesondertes Kontakt-Ereignis. Der Charakter darf nicht durch ein VFX außerhalb der Grab-Reichweite treffen.
- Der Susanoo-Bogen nutzt Projektil-Collider. Die kurze Variante trifft ein Ziel. Die volle Variante hat Durchdringung und ein abschließendes Explosionsereignis.
- Sprung und Landung sind Bewegung. Staub und Energiestöße haben ohne explizite Attackenregel keine Hitbox.
- Trefferreaktionen und Animationen dürfen im Netzwerkspiel nicht allein aus clientseitigen Partikeln abgeleitet werden.

---

# 7. Empfohlene erste Balancing-Werte

**Alle Zeitangaben sind unverbindliche Prototypwerte.** Die Werte werden nach Steuerungsgefühl und Kollisionsverhalten angepasst.

| Parameter | Kyūbi | Susanoo |
|---|---|---|
| Full-Charge-Schwelle | 1,2 s | 1,2 s |
| Sprint-Anlauf-Optik | ca. 0,10 s | ca. 0,20 s |
| Sprint + Heavy Anticipation | ca. 0,12 s | ca. 0,28 s |
| Kurzer Heavy Recovery | ca. 0,15 bis 0,25 s | ca. 0,20 bis 0,35 s |
| Voller Heavy Recovery | ca. 0,35 bis 0,50 s | ca. 0,45 bis 0,65 s |
| Defense Start | ca. 0,10 s | ca. 0,16 s |
| Grab Start | ca. 0,16 s | ca. 0,25 s |
| Grab Finisher | Schnell, schwungvoll | Langsamer, schwerer |
| Jump-Gefühl | Explosiv, federnd | Schwer, kontrolliert |

Für die Charge-Varianten ist **keine mittlere Stufe** vorgesehen. Eine längere Aufladung bedeutet die andere Attacke, nicht nur eine größere Zahl.

---

# 8. Checkliste für Implementierung und Animation Review

- [ ] Kyūbi und Susanoo haben je eine eigene Idle-, Sprint- und Jump-Silhouette.
- [ ] Die eigentliche Spielfigur springt sichtbar. Aura und Astralkörper animieren dazu synchron.
- [ ] Jump hat klar lesbare Anticipation, Takeoff, Ascend, Apex, Fall und Landing.
- [ ] Kyūbi-Schweife zeigen beim Aufstieg nach unten und beim Fall nach oben.
- [ ] Susanoo-Rüstung besitzt Trägheit beim Aufstieg und deutliches Nachschwingen bei der Landung.
- [ ] Sprint + Heavy führt zu einer eigenen Attacke, nicht einfach zu einer stärkeren Sprintbewegung.
- [ ] Jede Heavy-Richtung besitzt genau eine Short- und eine Full-Attacke.
- [ ] Short und Full haben getrennte Release-Animationen, Trefferzonen und Effekte.
- [ ] Der Full-Charge-Zustand ist bereits vor dem Loslassen visuell erkennbar.
- [ ] **Susanoo Forward Heavy verwendet den bereits vorhandenen Bogen.**
- [ ] Kurzer Susanoo-Pfeil und voller Belagerungspfeil haben unterschiedliche Trefferlogik.
- [ ] `Defense + Down` startet Grab nur mit gültigem Ziel in Nahreichweite.
- [ ] Grab besitzt eine kurze, klar erkennbare Miss-Animation.
- [ ] Grab-Animation von Spieler, Aura beziehungsweise Astralkörper und Gegner ist synchron.
- [ ] Grab-Konflikt mit `Down + Heavy` ist durch Eingabepriorität gelöst.
- [ ] Defense hat Guard Start, Hold, Block Impact, Perfect Block, Guard Break und Release.
- [ ] VFX verdecken den eigentlichen Spieler nicht dauerhaft.
- [ ] Jump-Landeeffekte verursachen ohne extra Mechanik keinen Schaden.
- [ ] Alle Angriffseffekte respektieren die Tiefen- und Sortierlogik der 2.5D-Lane.

---

## 9. Kompakte Abschlussübersicht

| Eingabe | Kyūbi | Susanoo |
|---|---|---|
| Sprint | Beast Rush | Astral Charge |
| Sprint + Heavy | Beast Pounce | Colossus Breaker |
| Forward Short | Beast Pulse | Spectral Arrow (Bogen) |
| Forward Full | Tailed Beast Bomb | Astral Siege Arrow (Bogen) |
| Up Short | Chakra Uppercut | Rising Blade |
| Up Full | Twin Beast Ascension | Heaven Splitter |
| Down Short | Tail Sweep | Titan Stomp |
| Down Full | Tailed Beast Slam | Titan's Judgment |
| Defense | Chakra Tail Guard | Susanoo Ribcage |
| **Defense + Down, Gegner nah** | **Beast Tail Seize** | **Astral Hand Seizure** |
| **Jump** | **Beast Leap, Aura und Schweife folgen dynamisch** | **Astral Leap, Astralkörper springt synchron und federt schwer nach** |

**Leitprinzip:** Kyūbi bewegt und verteidigt sich wie ein Raubtier. Susanoo kämpft wie eine lebendige Festung. Short und Full sind pro Heavy-Richtung bewusst **unterschiedliche Aktionen**. Grab ist ein eigener naher Defense-Move. Jump verändert nicht nur die Pose der Spielfigur, sondern animiert die gesamte Transformation mit.
