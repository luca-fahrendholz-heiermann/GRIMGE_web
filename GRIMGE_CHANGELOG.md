# GRIMGE – Changelog

Neueste Einträge oben. Details stehen in den Commit-Nachrichten (`git log`).

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
