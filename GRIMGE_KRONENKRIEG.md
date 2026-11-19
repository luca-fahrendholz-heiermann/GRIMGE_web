# GRIMGE — Kronenkrieg (Konzept, Stand 19. Nov 2026)

Ein neuer Spielmodus nach der Idee des Nutzers: **Krieg / Survival auf einer riesigen, offenen Karte**. Vier
Hauptburgen, dazwischen Zwischenburgen, verlassene Gebäude voller Beute, gefangene Kämpfer, epische Kreaturen und ihre
Eier. Man startet nur mit seiner Klasse und baut sich in rund 20 Minuten Held, Deck, Armee und Reittier auf — am Ende
bleibt eine Armee übrig.

Vorbilder als *Gefühl*, nicht als Vorlage: Aufbau und Warenwege (Siedler), Waren sicher von A nach B bringen, während
andere es verhindern wollen (Karawanen-Läufe aus MMOs), das Einkreisen und Überleben von Survival-Spielen, und GRIMGE
selbst (Runen zeichnen, Klassen, Beschwörungen, 2,5D-Kämpfe). Namen, Regeln im Detail und Optik sind eigen.

---

## 1. Das Versprechen in einem Satz

> **„Ich habe als Niemand angefangen, eine Frostschützen-Burg erobert, ein Drachenei quer über die Karte zur
> Feuerquelle geschmuggelt — und bin am Ende auf meinem eigenen Drachen in die letzte Schlacht geflogen.“**

Jede Runde soll so eine Geschichte erzeugen. Daran wird jede Regel gemessen.

### Die fünf Säulen (warum Leute es lieben)
1. **Vom Nichts zur Armee.** Der Aufstieg ist in 20 Minuten spürbar: allein → Trupp → Burgen → Heer → Reittier.
2. **Entdecken belohnt.** Die Karte ist unbekannt und deckt sich beim Erkunden auf. Wer Gebäude durchsucht, Quellen
   kennt und Regeln selbst herausfindet (Ei → Quelle), spielt stärker. Wissen ist eine Waffe.
3. **Eigene Kombinationen.** Waffe + Elementstein = Einheitentyp. Jede Armee sieht anders aus, jede Runde baut man
   anders.
4. **Gier gegen Sicherheit.** Das Ei bringt die größte Beute, macht einen aber zum Ziel. Lohnt sich der Weg quer
   über die Karte, oder lege ich es in meiner Burg ab und hoffe?
5. **Lesbare Bedrohung.** An jeder Burg zeigt die Karte, wie viele Kämpfer dort stehen. Fällt die Zahl, wird gerade
   angegriffen. Man sieht Krieg kommen und kann reagieren.

---

## 2. Eine Runde im Überblick

| | |
|---|---|
| **Spieler** | 4 Hauptburgen = 4 Plätze: jeder gegen jeden (4 Spieler) oder 2 gegen 2. Leere Plätze füllen Bots. |
| **Dauer** | Ziel 20 Minuten, harte Grenze 25 Minuten (siehe Grimmflut). |
| **Start** | Jeder beginnt an seiner Hauptburg, nur mit Klasse und Klassenwaffe — keine Runen, keine Armee. |
| **Sieg** | Die letzte Seite mit lebendem Helden **oder** stehender Hauptburg gewinnt. Im 2-gegen-2 zählt das Team. |
| **Tod** | Der Held lässt seine gesammelten Runen und Ressourcen fallen und kehrt an der Hauptburg zurück — solange sie steht. |

### Die vier Phasen (vom Spiel getaktet, nicht starr)
1. **Aufbruch (0–5 min):** Gebäude in der Nähe plündern, erste Runen und Waffen finden, Gefangene befreien.
   Wenig Kampf zwischen Spielern, weil sich noch keiner kennt.
2. **Ausdehnung (5–12 min):** die ersten Zwischenburgen erobern und Truppen ausbilden. Epische Kreaturen
   erwachen, die ersten Eier tauchen auf. Erste Grenzgefechte.
3. **Krieg (12–18 min):** Burgen wechseln die Besitzer, Ei-Läufe, Angriffe auf Hauptburgen, Reittiere sind im Spiel.
4. **Grimmflut (ab 16–18 min):** Von den Kartenrändern zieht eine dunkle Flut nach innen (siehe §11). Sie zwingt
   alle Überlebenden in eine Endschlacht.

---

## 3. Die Karte

### 3.1 Gefühl und Kamera
- **Riesig und offen**: eine scheinbar endlose Fläche ohne gemalten Hinter- und Vordergrund. Die Kamera folgt dem
  Helden in alle Richtungen. Die Darstellung bleibt **2,5D** wie überall in GRIMGE: Seitenansicht mit Tiefe. Die
  Welt geht aber nach links, rechts, vorne und hinten weiter.
- Orientierung geben **Boden und Infrastruktur**: Straßen, Brücken, Flüsse, Felder, Ruinen, Wegsteine, Biome mit
  eigener Bodenfarbe.
- **Nebel und Kartenaufdeckung:** Die Übersichtskarte (Minimap und Vollbild) zeigt nur, was man gesehen hat.
  Eroberte Burgen leuchten in der eigenen Farbe und decken ihre Umgebung dauerhaft auf.

### 3.2 Aufbau (prozedural, aber fair)
- **4 Hauptburgen**, bei jeder Runde zufällig platziert, aber gleich weit voneinander entfernt. Die Karte wird in
  vier gleichwertige Sektoren geteilt (gedreht, nicht gespiegelt, damit es nicht künstlich wirkt). Jeder Sektor
  hat die gleiche Zahl von Zwischenburgen, Gebäuden und Quellen in vergleichbarer Entfernung.
- **Mitte:** das reichste Gebiet mit epischen Kreaturen, seltenen Quellen und den letzten sicheren Flächen der
  Grimmflut. Hier treffen sich alle.
- **Biome folgen den Elementen:** Vulkanfeld (Ignis), Sturmklippen (Ventus), Gewitterheide (Fulgur), Felsland
  (Terra), Seen (Aqua), Gletscher (Glacies), Wildwald (Natura / Bestia), Ruinenfeld (Konstrukt), Lichtung (Lux),
  Schattensenke (Umbra), Riss (Void). Im passenden Biom liegen die passenden **Quellen** und **Elementsteine**.

### 3.3 Was auf der Karte steht

| Objekt | Was es ist | Warum man hingeht |
|---|---|---|
| **Hauptburg** (4) | Heimat, Rückkehrpunkt, Lager | Respawn, Truppen stationieren, sie darf nicht fallen |
| **Zwischenburg** (≈ 12–16) | bildet **eine** Kämpferklasse aus | Armee bauen, Gebiet halten |
| **Gebäude** (viele) | Türme, Höfe, Krypten, Ruinen mit **mehreren Ebenen** | Truhen: Tränke, Runen, Waffen, Steine |
| **Gefangenenlager** | befreibare Kämpfer, von kleinen Armeen bewacht | kostenlose Truppen, sofort im Trupp |
| **Quellen** (≈ 1–2 je Element) | Feuerquelle, Wasserquelle, … | Eier ausbrüten, Elementsteine verdichten |
| **Lager epischer Kreaturen** | Bossgegner, wandern im Revier | seltene Drops, Eier, Zähmen |
| **Wegschreine** | Aussichtspunkte | decken einen großen Kartenbereich auf |

---

## 4. Der Held

- **Start:** nur Klasse und Klassenwaffe (das vorhandene Klassen- und Waffensystem: Guardian, Ranger, Arcanist …).
  Keine Runen, kein Deck. Die Klasse prägt den ganzen Spielstil, von Anfang an.
- **Runen im Spiel sammeln:** Truhen, Kreaturen und eroberte Burgen geben Runenkarten. Sie bilden das **Deck dieser
  Runde**, mit begrenzter Größe (Vorschlag: 8 Karten, Fusion wie gewohnt). So entsteht der eigene Aufbau beim Spielen.
- **Tränke:** Leben, Mana und kurze Stärkungen (Geschwindigkeit, Rüstung), als Gürtel mit wenigen Plätzen.
- **Tod:** Das gesammelte Deck und alle getragenen Ressourcen fallen als Beutehaufen an den Todesort. Wer den
  Mörder verfolgt oder den Haufen zuerst erreicht, holt sie sich. Die Rückkehr geschieht an der Hauptburg nach
  einer Wartezeit, die mit der Spielzeit wächst (z. B. 8 s → 25 s). Ist die Hauptburg gefallen, gibt es keine
  Rückkehr mehr.
- **Klasse und Armee passen zusammen:** Der Held führt die Armee als Kommandant (§6.4). Seine Kampfkraft bleibt
  der Kern: Ein guter Zeichner mit wenigen Truppen schlägt einen schlechten mit vielen — aber nicht beliebig viele.

---

## 5. Ressourcen (bewusst wenige)

| Ressource | Woher | Wofür |
|---|---|---|
| **Waffen** (die vorhandenen Waffen-Kits: Bogen, Schwert & Schild, Speer, Zauberstab, Klauen …) | Truhen, Gebäude, besiegte Armeen, Waffenkisten | bestimmen die **Klasse** einer Einheit |
| **Elementsteine** (13, je Element-Rune einer: Ignis, Ventus, Fulgur, Terra, Aqua, Glacies, Bestia, Konstrukt, Void, Lux, Natura, Schutz, Umbra) | Biome, Quellen, Kreaturen, Truhen | bestimmen das **Element** einer Einheit, öffnen Eier |
| **Kronsilber** (allgemeines Material) | überall ein wenig, Burgen erzeugen es langsam | bezahlt Ausbildung, Ausbau und Stationierung |

- Waffen und Steine trägt der Held im Rucksack mit **begrenzten Plätzen**. Die Hauptburg ist das sichere Lager.
  Wer mit vollem Rucksack stirbt, verliert viel. Das schafft eine Entscheidung: zurück zum Lager oder weiter
  ziehen.
- Elementsteine kommen in drei Stufen (Splitter → Stein → Kern). An einer passenden Quelle lassen sich
  Splitter zu Steinen verdichten.

---

## 6. Armee

### 6.1 Einheiten entstehen aus Waffe + Element
Eine Einheit hat **Klasse (aus der Waffe)** und **Element (aus dem Stein)**. Beispiele:

| Waffe | + Element | = Einheit | Rolle |
|---|---|---|---|
| Bogen | Glacies | **Frostschützen** | Fernkampf, verlangsamt |
| Bogen | Ignis | **Brandschützen** | Fernkampf, Flächenbrand |
| Zauberstab | Bestia | **Rufer** | beschwören kleine Bestien |
| Zauberstab | Lux | **Lichtweber** | heilen, blenden |
| Schwert & Schild | Terra | **Steinwacht** | Frontlinie, hält Stellungen |
| Speer | Fulgur | **Blitzlanzer** | Sturmangriff, Kettenschaden |
| Dolche | Umbra | **Schattenklingen** | Flanken, Hinterhalt |
| Sense | Void | **Leerschnitter** | gegen große Gegner |
| Faustwaffen | Ventus | **Sturmfäuste** | schnell, stoßen zurück |
| Klauen | Natura | **Wildläufer** | schnell, Verfolgung |
| Harfe | Schutz | **Schildsänger** | Schild für den Trupp |
| Großaxt | Ignis | **Glutbrecher** | Belagerung, gegen Mauern |

- Jede Klasse (Waffenfamilie) hat eine **Grundrolle**, das Element fügt **einen Effekt** hinzu. Damit genügt eine
  Tabelle (Klasse × Element) mit Regeln statt hunderter Handarbeiten. Bei 18 Klassen und 13 Elementen ergibt das
  sehr viele Kombinationen.
- **Gegenseitige Stärken** (Fels-Papier-Schere, lesbar): Fernkampf schlägt Langsame, Reiter schlagen Fernkampf,
  Frontlinie schlägt Reiter. Elemente bringen die bekannten Reaktionen mit (Wasser löscht Feuer, Blitz in Wasser …).

### 6.2 Zwischenburgen
- **Jede Zwischenburg gehört zu einer Kämpferklasse** (die Fahne zeigt die Waffe). Eine Bogenburg bildet nur
  Schützen aus. Welches **Element** sie bekommen, entscheidet der Stein, den der Besitzer investiert.
- **Erobern:** Verteidiger besiegen, danach den Burgstein in der Mitte halten (Kanalisieren mit Fortschrittsring,
  ein Treffer bricht ab). Wer eine Burg hält, sieht ihre Umgebung.
- **Ausbilden:** Waffe + Stein + Kronsilber in die Warteschlange legen, die Einheiten entstehen nach Zeit. Ausbau
  in drei Stufen: mehr gleichzeitige Ausbildung, stärkere Einheiten, Mauern.
- **Verlieren:** Andere Spieler können sie wegnehmen. Stationierte Truppen verteidigen sie. Die laufende
  Warteschlange geht an den neuen Besitzer, das ist der Anreiz für Überfälle.

### 6.3 Gefangene befreien
- Auf der Karte stehen Lager mit gefangenen Kämpfern (schon fertige Einheiten, manchmal seltene Klassen), bewacht
  von einer kleinen Armee. Besiegt man die Wachen und öffnet den Käfig, schließen sie sich sofort dem Trupp an.
- Frühe Lager sind leicht, späte stark bewacht. So bekommt man schon vor der ersten Burg eine kleine Armee.

### 6.4 Trupp, Stationieren und die Karte
- **Der Trupp** folgt dem Helden, mit einer Obergrenze (Kommandostufe, wächst mit eroberten Burgen). Einfache
  Befehle: *folgen*, *halten*, *angreifen* (Ziel antippen).
- **Stationieren:** An jeder Haupt- und Zwischenburg öffnet sich ein Feld mit den **Profilbildern der Kämpfertypen**.
  Mit **Pfeil hoch** stationiert man eine Einheit dort, mit **Pfeil runter** nimmt man sie wieder in den Trupp. Jede
  Burg hat eine Höchstzahl.
- **Karte:** An jeder eigenen Burg steht ein Pfeil mit der **Gesamtzahl** der stationierten Kämpfer, ohne ihre Art.
  Sinkt die Zahl, blinkt der Pfeil: Die Burg wird angegriffen. Fremde Burgen zeigen ihre Zahl nur, solange man sie
  sieht.

---

## 7. Gebäude erkunden

- Gebäude sind betretbare Orte mit **mehreren Ebenen**. Die Technik dafür gibt es schon in GRIMGE: Treppen, Galerien
  und Dungeon-Räume aus der Basis und dem Dungeon. Drinnen wechselt die Ansicht in einen kleinen 2,5D-Raum.
- **Truhen** enthalten Tränke, Runen, Waffen oder Steine. Manche sind verschlossen und öffnen sich nur mit einem
  Element (bekannt aus dem Dungeon: z. B. Natura öffnet die Rankentruhe).
- **Geheimnisse:** Rissige Böden, Hebel und ein Setzling, der mit Wasser zur Leiter wächst. Wer die Tricks kennt,
  findet mehr.
- Gebäude werden **einmal pro Runde** geplündert. Wer zuerst kommt, gewinnt. Das erzeugt früh kleine Rennen.

---

## 8. Epische Kreaturen

- Große Gegner mit eigenem Revier (Feuerdrache im Vulkanfeld, Frostwyrm am Gletscher, Donnerhirsch in der
  Gewitterheide …). Sie wandern, greifen Armeen an, die durch ihr Revier ziehen, und erwachen ab der zweiten Phase.
- **Besiegt** lassen sie **eines** fallen:
  - gute Ressourcen (viele Steine, Kronsilber) **oder**
  - eine **seltene Rune** **oder**
  - als **einzigen** Drop ihr **Ei** (§9).
- **Zähmen statt töten:** Mit der neuen Runen-Kombination **Bändigung (Bestia + Bestia)** wirkt man auf eine
  geschwächte Kreatur, ihr Leben muss unter einer Schwelle liegen. Gelingt es, wechselt sie die Seite und kämpft in
  der eigenen Armee (eine Kreatur pro Held).
  - **Auch in den anderen Modi:** Dieselbe Rune übernimmt eine **beschworene Kreatur des Gegners**. Die Beschwörung
    wechselt für den Rest ihrer Dauer die Seite. Das ist ein neuer Konter im Deck-Spiel (Arena, Siege). Balance:
    teuer, kurze Reichweite, erst ab halbem Leben der Kreatur.

---

## 9. Eier und Quellen — die große Beute

Der Kern-Moment des Modus. Er soll **entdeckt** werden, nicht erklärt.

- **Das Ei** ist schwer und leuchtet in der Farbe seines Elements. Mit Greifen hebt man es auf (das vorhandene
  Aufheben über Blocken + unten), mit Sprint + Wischen wirft man es. Wer es trägt, läuft langsamer, kann nicht
  sprinten, nicht reiten und nicht zaubern, nur leichte Angriffe.
- **Ausbrüten:** Das Ei schlüpft nur an einer **Quelle seines Elements** (Feuerei → Feuerquelle). Kommt es dort an,
  folgt eine kurze Brutzeit von 10 s. Wer in der Zeit den Träger wegschlägt, unterbricht sie. Danach schlüpft die
  Kreatur, gehört zur eigenen Armee und ist später **reitbar oder fliegend**.
- **Ablegen:** Man kann das Ei in einer eigenen Burg einlagern. Es ist sicher, solange die Burg hält, und wandert
  mit, wenn sie fällt. So kann man erst die richtige Quelle suchen.
- **Entdecken statt Tutorial:**
  - Das Ei pulsiert stärker, je näher man einer passenden Quelle kommt. Die Quelle antwortet mit einem Lichtstrahl.
  - Inschriften an Ruinen deuten es an („Was im Feuer gelegt wurde, erwacht im Feuer“).
  - Die erste erfolgreiche Brut eines Spielers wird allen angesagt („EIN DRACHE IST ERWACHT“). Ab dann wissen es
    alle, und beim nächsten Mal ist es Wissen statt Glück.
- **Sichtbarkeit:** Ein getragenes Ei ist für **alle** auf der Karte als Leuchtpunkt zu sehen. Jeder Ei-Lauf wird
  so zum Ereignis.

### 9.1 Geleit, Träger, Plünderer (eigene Rollen, keine Kopie)
- **Träger:** wer das Ei trägt, langsam und verwundbar.
- **Geleit:** Mitspieler (im 2-gegen-2) oder der eigene Trupp schützen den Träger. **In jeder-gegen-jeden** kann ein
  anderer Spieler einen **Geleitpakt** anbieten. Nimmt der Träger an, sind beide bis zum Schlüpfen Verbündete, und
  das Geleit erhält einen Anteil der Beute (Steine und Kronsilber, plus eine Rune des Schlupfs).
- **Plünderer:** jeder, der das Ei will. Zusätzlich jagen **wilde Banditen** (neutrale Gegner) Ei-Träger. So ist
  jeder Weg gefährlich, auch ohne andere Spieler in der Nähe.
- Das erzeugt die Spannung eines Warentransports: große Beute, langer Weg, und alle wissen, wo du bist.

---

## 10. Reiten und Fliegen

- Gezähmte und geschlüpfte Kreaturen sind **Reittiere**. Reiten gibt es in GRIMGE schon (Geisterwolf,
  Runenschlange).
- **Fliegende Kreaturen** (Drache, Sturmvogel …) überqueren Flüsse und Klippen und sind die schnellste Reise.
  Ausgleich: Im Flug kann man keine Burg erobern, kein Ei tragen und nicht zeichnen. Fernkämpfer und Blitze holen
  einen herunter. Eine Flug-Ausdauer zwingt zur Landung.
- Reittiere kämpfen mit, wenn man absteigt, und sterben nicht endgültig, solange der Held lebt (Rückkehr nach
  Abklingzeit).

---

## 11. Grimmflut — das Ende jeder Runde

Damit jede Runde ein Ende findet und nicht in Verstecken versandet:
- Ab **Minute 16** zieht von den Kartenrändern eine dunkle Flut nach innen, in Wellen mit Vorwarnung auf der Karte.
  Burgen in der Flut hören auf zu produzieren und verlieren langsam Verteidiger. Helden in der Flut nehmen
  steigenden Schaden.
- Ab **Minute 20** gibt es keine Rückkehr nach dem Tod mehr, und die sichere Fläche ist nur noch die Mitte.
- Die Endschlacht findet in der Mitte statt. Wer übrig bleibt, gewinnt. Mit 25 Minuten ist die Flut überall,
  danach entscheidet die größere verbleibende Armee.

---

## 12. Spielarten

- **PvE:** gegen 3 Bots (oder 2 gegen 2 mit Bot-Partner). Bots haben Persönlichkeiten, ableitbar aus der
  vorhandenen KI:
  - *Baumeister:* erobert Burgen, verteidigt viel.
  - *Räuber:* jagt Ei-Träger und überfällt Burgen.
  - *Jäger:* zähmt Kreaturen und fliegt früh.
  Drei Schwierigkeitsstufen.
- **Online-PvP:** jeder gegen jeden oder 2 gegen 2. Im Team teilt man Sicht und Karte, kann sich Ressourcen geben
  und gemeinsam Ei-Läufe machen.
- **Fairness:** Alle starten gleich, nur mit Klasse. Fortschritt außerhalb der Runde schaltet **Auswahl** frei
  (Kosmetik, Start-Klassen, Burgfahnen), keine Stärke.

---

## 13. Warum es sich gut anfühlt — die Momente

- Die erste befreite Truppe nach zwei Minuten: „Ich bin nicht mehr allein.“
- Die eigene Bogenburg mit Frostschützen, die den Gegner an der Mauer einfrieren.
- Der Pfeil an der Lieblingsburg zählt herunter: 12 … 9 … 5. Man reitet hin, und es wird knapp.
- Das Ei pulsiert stärker, man ist auf der richtigen Spur zur Quelle.
- Ein Geleitpakt mit einem Fremden, der einen am Ende doch verrät (oder eben nicht).
- Der Drache schlüpft, alle bekommen die Ansage, und alle wissen, wer jetzt gefährlich ist.
- Die Grimmflut drückt alle zusammen, letzte Schlacht in der Mitte.

---

## 14. Was GRIMGE schon mitbringt und was fehlt

| Vorhanden | Fehlt |
|---|---|
| 2,5D-Kämpfe, Klassen und Waffen-Kits, Runen zeichnen, Fusion | **große Welt** in alle Richtungen mit Nachladen der Umgebung (Streaming), ohne gemalte Kulisse |
| Kamera folgt (Basis, Dungeon, Galerie), Zoom | **Übersichtskarte mit Nebel**, Burg-Pfeile mit Truppenzahl |
| Treppen, Ebenen, Dungeon-Räume, Truhen mit Element-Schlössern | **betretbare Gebäude** auf der Weltkarte |
| Minion-KI, Armeen in Invasion, Beschwörungen, Reiten | **Trupp-Befehle**, Stationieren, Ausbildung in Burgen |
| Waffenkisten, Aufheben und Werfen von Gegenständen | **Ei-Mechanik**, Quellen, Brutzeit |
| Arena-Runenslots (Sammeln, Ersetzen, Verlieren beim Tod) | **Rundendeck** aus gesammelten Runen, Beutehaufen beim Tod |
| Champion-KI, Bosse | **Bot-Persönlichkeiten** für Strategie |
| — | **Online-Netzcode** (größter Brocken, ganz am Ende) |

---

## 15. Bau-Reihenfolge (jeder Schritt spielbar)

1. **Weite Fläche:** eine große Testkarte, auf der die Kamera in alle Richtungen folgt. Dazu Bodenobjekte, Straßen
   und die Übersichtskarte mit Aufdeckung. *Ziel: Erkunden fühlt sich gut an.*
2. **Beute:** Gebäude mit Ebenen und Truhen, Tränke, Rundendeck und Rucksack, Tod mit Beutehaufen. *Ziel: der
   eigene Aufbau beim Spielen.*
3. **Armee:** Gefangenenlager, Trupp-Befehle, Zwischenburgen erobern, Ausbildung aus Waffe + Stein,
   Stationieren mit Pfeilen. *Ziel: vom Helden zum Kommandanten.*
4. **Hauptburgen und Sieg:** 4 faire Startplätze, Bots (zuerst eine Persönlichkeit), Grimmflut, Siegbedingung.
   *Ziel: eine komplette 20-Minuten-Runde gegen Bots.*
5. **Kreaturen:** epische Kreaturen, Drops, die Rune Bändigung (auch für die anderen Modi), Eier, Quellen, Brut,
   Reiten und Fliegen. *Ziel: der Ei-Lauf als Höhepunkt.*
6. **Teams und Online:** 2 gegen 2 mit Bots, danach Netzcode für Online-PvP, Geleitpakt.

---

## 16. Offene Fragen (mit Empfehlung)

| Frage | Empfehlung |
|---|---|
| Wie groß ist die Karte? | Start mit ca. 4 × 4 Bildschirmbreiten pro Sektor (gesamt ≈ 8 × 8), im Playtest anpassen |
| Wie viele Einheiten gleichzeitig? | Trupp anfangs 6, maximal 20; insgesamt ≈ 120 Einheiten auf der Karte (Leistung am Handy prüfen) |
| Deckgröße der Runde? | 8 Karten, Fusion erlaubt; beim Tod fällt alles |
| Bändigung in Arena / Siege? | ja, teuer und nur auf Beschwörungen unter halbem Leben |
| Name des Modus? | **Kronenkrieg** (vier Kronen = vier Hauptburgen); Alternativen: Reichsfall, Vier Thronen |
