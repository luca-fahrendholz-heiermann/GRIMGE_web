# GRIMGE: Spezialrunen-Atlas V1
## Deep Research, originelle Signature-Spells und interaktives 2.5D-Arena-Gameplay

**Stand:** 17. Oktober 2026  
**Status:** Recherchegestützter Designvorschlag, **keine** bereits implementierten Fähigkeiten  
**Umfang:** 36 neue eigenständige Spezialrunen + Produktionsregeln, kombinatorische Interaktionen, Build-Vorschläge und Forschungsquellen  
**Basiskatalog:** `GRIMGE_Runes_Spells_Catalog.md`  
**Ergänzende Grundlagen:** `class_concept.md` (18 Klassen) und `GRIMGE_Transformations_Atlas_V3_1_Sonnenwyrm.md` (42 temporäre VFX-Buff-Formen)

> **Abgrenzung:** Die Fähigkeiten von externen Spielen und Anime dienen als mechanische Inspiration. Die GRIMGE-Rune, ihr Name, ihre visuellen Motive, ihre Ereignisfolge und ihre Combat-Rolle sind **neue Entwürfe**. Das ist ein kreatives Designkonzept, keine urheberrechtliche Freigabe. Vor Veröffentlichung müssen finaler Look, Sound, Animationsrhythmus und gegebenenfalls Schutzrechte separat geprüft werden.

---

# 1. Ausgangslage und explizite Systemgrenzen

Der beigefügte Runen-Katalog beschreibt **10 Basisrunen**, **2 Solo-Spezialrunen** (`DOPPEL`, `MORTIS`) und **3 veraltete Transformationsglyphen**, dazu **55 Spells**, davon **7 Himmelsfelder**. Für eine neue Spezialrune sind folgende Fakten entscheidend:

1. Runen werden in einem **10-Karten-Deck** geführt; **3 Karten** befinden sich als Hand bzw. gezeichnete Spells in Slots. Die Zeichnung wird C/B/A/S bewertet.
2. Mana wird **beim Zeichnen gebunden**, nicht beim Auslösen. Ein Slot enthält bereits einen wirkbaren Spell. Fusionen haben ihre eigenen Regeln und sind reihenfolgeunabhängig.
3. Solo-Spezialrunen sind eigene Glyphen und **nicht fusionierbar**. `DOPPEL` und `MORTIS` existieren bereits und dürfen nicht durch neue Designs verdrängt werden.
4. **Fokus-Transformationen** sind ein anderes System. Der Spieler wählt **genau eine primäre Klasse- ODER Elementartransformation** und kann sie über Fokus aufrechterhalten. Diese darf den Avatar-Sprite ersetzen.
5. **Temporäre Buff-Transformationen** aus dem V3-Atlas (z. B. Risswild, Arkengestell, Sonnenwyrm) wirken nur für eine kurze Zeit, verwenden ausschließlich VFX/Attachments und dürfen die gewählte Fokusform ergänzen. **Maximal eine Buff-Transformations-Spezialrune je Deck** ist bereits als Designregel definiert.
6. **Offener Entscheidungspunkt:** Für neue **nichttransformierende Spezialrunen** ist aus dem übergebenen Katalog keine zusätzliche exklusive „eine einzige Special-Karte insgesamt“-Regel ableitbar. Dieses Dokument erfindet sie daher nicht. Empfohlen wird ein eigener Tag `signature_special` und eine überprüfbare Loadout-Regel; die bestehende Nutzung von `DOPPEL` und `MORTIS` bleibt vorerst unverändert.
7. In `Castle Siege` werden neue Runen auf der eigenen Burgplattform gezeichnet; fertig geslottete Spells dürfen danach überall verwendet werden. Diese Beschränkung gilt auch für Spezialrunen.
8. Für **Himmelsfelder** gilt bereits die Exklusivität: maximal eines zur selben Zeit. Neue lokale Zonen dürfen keinen zweiten versteckten Himmelseffekt erzeugen.

## 1.1 Schon vorhandene Mechaniken, die nicht einfach dupliziert werden dürfen

| Bestehender Spell | Bereits abgedeckt | Erwarteter Mehrwert eines neuen Specials |
|---|---|---|
| `GRAVITY LIFT` | bis vier Ziele anheben, halten, werfen oder slam | z. B. **eigener Hover-Kampfstil** oder Umwelt-Massenverhalten statt gleicher Lift |
| `SOUL SEEKERS` | eine einmalige Salve aus drei Homing-Flammen | zeitlich gesteuerte Zielmarkierung oder umlaufende Waffenobjekte |
| `MIRROR WARD` | bis zu fünf Projektile fangen und automatisch zurücksenden | gezieltes Umformen **eines** Geschosses oder kontrollierte Bahnablenkung |
| `FROST MIRROR GATE` | zwei Spieler-Portale, auch als Dungeon-Abkürzung | nur Projektile durch Risse führen oder Flächenlinien manipulieren |
| `SHADOW DOPPELGANGER` | echter kämpfender Doppelgänger mit HP | passives **Einzel-Angriffsecho ohne NPC** |
| `REVENANT CALL` | Gegnerkörper als Revenant beschwören | Signalgebung, Objektverwaltung oder lokale Kurzmanifestation |
| `CONSTRUCT BULWARK` / `STONE WALL` | physische, kollidierende Deckung | Deckung umnutzen, mobilisieren oder in Risiko-Objekte verwandeln |
| `SOLAR ORB` / `LUNAR ORB` / `ECLIPSE` | globale Himmelsfeld-/Elementregeln | kleine sichtbare, gezielt platzierte Regelzonen |
| `EIDOLON MANTLE` / `NINEFOLD BEAST FORM` | zeitweilige VFX-Manifestationsformen | andere Spielregeln ohne neue große Form- oder Fuchsoptik |
| `DRAGON INVOCATION` | temporäre Drachenbeschwörung mit Area-Breath | keine weitere bloße Drachen-Feuerattacke |

## 1.2 Typen neuer Spezialrunen

- **Signature Action:** einmaliger, sehr markanter Spezialeffekt mit eigenem Cast und Counterplay.
- **Signature Stance:** temporäre *Aktionshaltung*, die Bewegung oder Eingaben für wenige Sekunden modifiziert. Sie ist **keine** Klassen-/Elementartransformation.
- **World Instrument:** ein angreifbares oder aktives Weltobjekt, das mit Spells und Trefferereignissen interagiert.
- **Rule Zone:** eine kurze, lokal begrenzte Feldregel, die für beide Teams nachvollziehbar ist.
- **Metamagic:** ein vorhandener Schaden-/Projectile-/AttackEvent wird verlegt, gespalten, verzögert oder umgewandelt. Keine zweite volle Schadensrechnung ohne Budget.

**Balance-Vorschlag, nicht Ist-Stand:** Falls neue Solo-Glyphen eingeführt werden, liegen die initialen gebundenen Manakosten je nach Komplexität etwa bei **28–46** und die Cooldowns bei **14–28 s**. Ein zeitlich begrenzter Signature-Stance darf sehr stark aussehen, benötigt aber klare Verwundbarkeit und eine zeitliche Begrenzung. Zahlen gehören ins Balancing, nicht in die Identität des Designs.

---

# 2. Recherchebefunde und Übertragungslogik

Die folgenden Quellen belegen **Mechanikfamilien**, nicht die vollständige Animationsrekonstruktion jeder Figur:

| Referenz | Tatsächlich dokumentiertes Muster | Transfer für GRIMGE |
|---|---|---|
| Big Kid Nation, Pokémon Arena 2D | offizielles Fanprojekt bestätigt; ein konkreter Mewtu-Schwebeclip hier nicht überprüfbar | Nutzerbeschreibung als Briefing: Spieler schwebt und erhält alternative Luftangriffe |
| CrossCode | Combat Arts nach Guard, Dash, Melee, Throw sowie Halteaufladung | bestehende Heavy-Aktionslogik erweitern, keine zusätzlichen HUD-Buttons |
| Aurelion Sol | Flug, große Raumeffekte und Singularität | kurze Hover-Haltung mit lokalem Ground-Anchor und konkretem Anti-Air |
| Orianna / Syndra | persistent steuerbare Effektkörper bzw. Sphären | echte schwebende Waffen-/Projektile-Instanzen mit eigener Kollision |
| Bard / Ekko | Portale, vorhersehbare Felder, vorbereitete Zeitereignisse | sichtbare Telegraphen und geschicktes Positionieren statt „alles steht still“ |
| Sigma / Mei | bewegliche Barrieren, Gravitationswirkung, gebaute Deckung | umleitbare Geschosse, bewegliche Sperren, zerstörbare World Props |
| Divinity Original Sin 2 / BG3 | Feuer, Wasser, Eis, elektrische Fläche und Terrain reagieren aufeinander | Arena als regelbasierter Spielpartner, nicht nur Hintergrundbild |
| Taliyah / Earthshaker | Bewegung und Effekte entlang des Geländes, Fissuren und Echo-Folgen | kontrollierte Lane-Geometrie, Bewegungspfade und objektgebundene Reaktionen |

## 2.1 Der zentrale eigenständige Ansatz

**GRIMGE kann die drei bereits vorhandenen Ebenen kombinieren:**

1. **Bewegung:** die physische Klasse- oder Fokusform-Animation und echte 2.5D-Bewegungslogik.
2. **Magie:** gezeichnete, bewertete Basisrunen und ihre Fusionen.
3. **Signature-Metaspell:** eine Spezialrune, die die Regeln von Bewegung, Projektilen und Weltobjekten für wenige Sekunden sichtbar verschiebt.

So entsteht nicht bloß *mehr Schaden*, sondern eine andere Lösung für denselben Kampf. Beispiel: Ein Lancer nutzt ein kurzes Schwerelosfeld, um eine Minion-Reihe vertikal zu versetzen; ein Ranger schießt durch einen Riss-Projektilkorridor; ein Guardian schmilzt einen eigenen Bulwark in einen schweren Schild um.

---

# 3. Index aller neuen Spezialrunen

| ID | Gruppe | Name | Typ | Rollenbeispiel | Dauer / Fenster |
|---|---|---|---|---|---|
| S01 | Schwebekampf und kinetische Macht | **Himmelsregent** | Kampfstil-Buff | Arcanist | 9 s |
| S02 | Schwebekampf und kinetische Macht | **Aureolenschwarm** | Temporärer Schussmodus | Ranger | 8 s |
| S03 | Schwebekampf und kinetische Macht | **Sternenanker** | Einmaliger Kontrollspell | Guardian | Einmalig / offen |
| S04 | Schwebekampf und kinetische Macht | **Schwebende Bastion** | Defensiver Schwebe-Buff | Guardian | 7 s |
| S05 | Schwebekampf und kinetische Macht | **Kometenträger** | Sprung-Manöver | Monk | Einmalig / offen |
| S06 | Schwebekampf und kinetische Macht | **Luftnähte** | Raumlinien-Manöver | Bladedancer | Einmalig / offen |
| S07 | Zeit, Nachhall und vorbereitete Aktionen | **Nachhallarchiv** | Kampfreaktor | Runeblade | 6 s |
| S08 | Zeit, Nachhall und vorbereitete Aktionen | **Sekundenpfand** | Delayed-Area | Fateweaver | Einmalig / offen |
| S09 | Zeit, Nachhall und vorbereitete Aktionen | **Stillfuge** | Stasis-Feld | Fateweaver | Einmalig / offen |
| S10 | Zeit, Nachhall und vorbereitete Aktionen | **Rücksprungnadel** | Positionanker | Shadow | 5 s |
| S11 | Zeit, Nachhall und vorbereitete Aktionen | **Spiegelversatz** | Echoangriff | Bladedancer | Einmalig / offen |
| S12 | Zeit, Nachhall und vorbereitete Aktionen | **Schicksalsnadel** | Markierung und Finisher | Ranger | Einmalig / offen |
| S13 | Gelände, Objekte und räumliches Bauen | **Splittergarten** | Platzierte Objektfamilie | Fateweaver | Einmalig / offen |
| S14 | Gelände, Objekte und räumliches Bauen | **Seismischer Steg** | Temporäre modulare Brücke | Lancer | Einmalig / offen |
| S15 | Gelände, Objekte und räumliches Bauen | **Flutschiene** | Bewegliches Elementarfeld | Ranger | Einmalig / offen |
| S16 | Gelände, Objekte und räumliches Bauen | **Glutpumpe** | Umweltreaktor | Arcanist | Einmalig / offen |
| S17 | Gelände, Objekte und räumliches Bauen | **Raumfalter** | Räumliche Ablenkzone | Trickster | Einmalig / offen |
| S18 | Gelände, Objekte und räumliches Bauen | **Glasfeld** | Reaktive Spiegelboden-Zone | Guardian | Einmalig / offen |
| S19 | Projektile, Strahlen und Gegenzauber | **Strahlenweber** | Beam-Umleitungssetup | Arcanist | Einmalig / offen |
| S20 | Projektile, Strahlen und Gegenzauber | **Prismenhalter** | Einmaliges Projektil-Umladen | Guardian | Einmalig / offen |
| S21 | Projektile, Strahlen und Gegenzauber | **Schwarmprotokoll** | Zielmarkierter Salvenmodus | Bladedancer | 7 s |
| S22 | Projektile, Strahlen und Gegenzauber | **Rissweiche** | Projektildurchgang | Ranger | Einmalig / offen |
| S23 | Projektile, Strahlen und Gegenzauber | **Polarisationswerk** | Temporärer Magnetturm | Ranger | Einmalig / offen |
| S24 | Projektile, Strahlen und Gegenzauber | **Schwerelosband** | Vertikales Korridorfeld | Monk | Einmalig / offen |
| S25 | Gebilde, Helfer und Kampfobjekte | **Klingenchor** | Orbitale Waffenobjekte | Runeblade | 7 s |
| S26 | Gebilde, Helfer und Kampfobjekte | **Marionettenfaden** | Manipulation einer Einzelinstanz | Fateweaver | Einmalig / offen |
| S27 | Gebilde, Helfer und Kampfobjekte | **Runenschmiede** | Aktivierter Umgebungs-Forge | Guardian | Einmalig / offen |
| S28 | Gebilde, Helfer und Kampfobjekte | **Echofamulus** | Kurzlebige Aktionsprojektion | Runeblade | 5 s |
| S29 | Gebilde, Helfer und Kampfobjekte | **Bruchkoloss** | Lokales Großkonstrukt | Guardian | Einmalig / offen |
| S30 | Gebilde, Helfer und Kampfobjekte | **Jägerglocke** | AI-Priorisierungs-Signal | Beastborn | Einmalig / offen |
| S31 | Arenaregeln, Resonanz und metamagische Eingriffe | **Runengericht** | Temporäre Regelzone | Fateweaver | Einmalig / offen |
| S32 | Arenaregeln, Resonanz und metamagische Eingriffe | **Exilkorridor** | Spurförmige Kontrollzone | Lancer | Einmalig / offen |
| S33 | Arenaregeln, Resonanz und metamagische Eingriffe | **Erntezirkel** | Einmaliger Reaktor nach Treffer-Events | Berserker | Einmalig / offen |
| S34 | Arenaregeln, Resonanz und metamagische Eingriffe | **Scherbenhandel** | Offensiv-defensiver Tausch | Guardian | Einmalig / offen |
| S35 | Arenaregeln, Resonanz und metamagische Eingriffe | **Resonanzkorridor** | Schallgelenkte Arena-Kette | Resonant | Einmalig / offen |
| S36 | Arenaregeln, Resonanz und metamagische Eingriffe | **Weltnaht** | Bewegliche Risslinie | Fateweaver | Einmalig / offen |

---

# 4. Vollständige Fähigkeiten und Animationsabläufe


## A · Schwebekampf und kinetische Macht

### S01: Himmelsregent

**Systemtyp:** Kampfstil-Buff · self · 9 s  
**Dauer / Zeitfenster:** 9 s  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Arcanist, Monk, Ranger, Spiritbound; alle anderen Klassen ebenfalls verfügbar.  
**Mechanische Inspiration, keine Kopiervorlage:** Aurelion Sol, Sigma, vom Nutzer beschriebenes Mewtu-Schweben; keine konkrete Big-Kid-Nation-Animation verifiziert.

**Visuelle GRIMGE-Identität:** Tiefes Pflaumenviolett, milchige Sternenadern, sechs asymmetrische Schwerkraftschollen; kein humanoides Psi-Monster.

**Animation 1 | Antizipation und Setup:** Der Avatar stoppt, sinkt in die Knie und hebt 0,7 s später physikalisch um ungefähr 0,7 Charakterhöhen ab. Vier zerbrochene, beleuchtete Platten lagern sich schräg unter den Füßen an.

**Animation 2 | Aktivierungs- und Release-Moment:** Der Spieler bleibt für die Wirkungszeit über dem Boden. Ein halbdurchlässiger Schatten und ein telegraphierter Landepunkt zeigen die Projektion auf die Arena an.

**Animation 3 | Eigenständige Kampfwirkung:** Während des Schwebens: Forward Short schießt zwei schnelle Splitternadeln, Forward Full startet drei zeitlich gestaffelte suchende Schollen; Up Short ist ein kurzer Repulsionsimpuls, Up Full hebt Gegner in einer begrenzten Säule an; Down Short drückt ein Ziel nach unten, Down Full erzeugt eine ringförmige Bodenkompression. Guard bildet vor dem Spieler einen segmentierten Schild.

**Animation 4 | Ende, Recovery und Materialzerfall:** Bei Ablauf brechen die Trittplatten auseinander. Der Spieler sinkt mit überprüfbarer Kollision zum Boden zurück; bei Bodenfreiheit erfolgt eine kleine, schadensfreie Landestaubwelle.

**Auswirkung auf Arena, Objekte oder Topologie:** Niedrige Hindernisse können überflogen werden. Die Hover-Attacken verändern nur freigegebene World-Objekte, etwa leichte Kisten, beschworene Wandsegmente und physikalische Trümmer.

**Synergien mit vorhandenen GRIMGE-Spells:** Mit GRAVITY LIFT kann eine gemeinsame Luft-Kombo entstehen, aber die Aufhebe-Dauer wird nicht addiert; SOUL SEEKERS bleiben ein anderer Spell mit eigenem Slot und eigenem Schaden.

**Counterplay / PvP-Balance:** Deutliches 0,7-s-Startup, begrenzte horizontale Beschleunigung, sichtbarer Bodenanker. Boden-AoE können den Bodenschatten markieren; Anti-Air trifft den echten schwebenden Kollisionskörper. Keine Unverwundbarkeit.

**Technischer VFX-/Combat-Vertrag:** Neue Controller HoverMovement, AirTargeting, GroundShadow, HeightAwareHitTest. Buff überschreibt keine Klassen-/Elementartransformation und benötigt keinen neuen Avatar-Sprite.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S02: Aureolenschwarm

**Systemtyp:** Temporärer Schussmodus · self · 8 s  
**Dauer / Zeitfenster:** 8 s  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Ranger, Runeblade, Arcanist, Trickster  
**Mechanische Inspiration, keine Kopiervorlage:** Syndras verwaltbare Sphären und Oriannas ferngeführte Kugel als Interaktionsprinzip.

**Visuelle GRIMGE-Identität:** Kleine granatrote Kristalllinsen mit weißen Lichtkernen, die an unterschiedlichen Radien um Schulterhöhe schweben.

**Animation 1 | Antizipation und Setup:** Sechs Kristalllinsen treten aus dem Rücken- und Brust-Contour-Glow heraus und ordnen sich in zwei unvollkommene Halbringe.

**Animation 2 | Aktivierungs- und Release-Moment:** Eine kurze Hebebewegung der Waffenhand löst den ersten Schuss aus. Die Linsen bleiben als separate World-/Attachment-Hybride am Spieler.

**Animation 3 | Eigenständige Kampfwirkung:** Jeder zweite reguläre Treffer lädt eine Linse auf. Kurzattacken feuern einzelne schnelle Bolzen; volle Heavy-Treffer setzen höchstens zwei verfolgungsfähige Kristalle frei. Nicht alle Linsen feuern gleichzeitig.

**Animation 4 | Ende, Recovery und Materialzerfall:** Beim Ende kollabieren die Linsen nach innen und werden als feine Lichtstreifen wieder in die Silhouette eingesogen.

**Auswirkung auf Arena, Objekte oder Topologie:** Die Bolzen können brüchige Kisten treffen und schwache Eisspiegel beschädigen. Auf Wänden wird die Zielsuche begrenzt, damit sie nicht durch massive Kulissen schießt.

**Synergien mit vorhandenen GRIMGE-Spells:** FULGUR färbt nur Begleitblitze, nicht automatisch den Schaden um; MIRROR WARD kann verschossene Kristalle abfangen, sofern als capturable markiert.

**Counterplay / PvP-Balance:** Maximal sechs vorbereitete Linsen, Zielwechsel-Telegraph, kurze Umlenkgeschwindigkeit; einzelne Gegner erhalten ein Multi-Hit-Limit.

**Technischer VFX-/Combat-Vertrag:** OrbitalSpline mit realen Partikelmaterialien und kleinen Pixel-Art-Layer-Atlanten; kein simples Kreis-Particle-System.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S03: Sternenanker

**Systemtyp:** Einmaliger Kontrollspell · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Guardian, Lancer, Fateweaver, Arcanist  
**Mechanische Inspiration, keine Kopiervorlage:** Aurelion Sol Singularität und Sigma Gravitationsfluss als abstrakte Felder-Mechanik.

**Visuelle GRIMGE-Identität:** Indigo-Kupfer, ein sechsstrahliger schwerer Sternenanker mit gespaltener Zentralader.

**Animation 1 | Antizipation und Setup:** Der Spieler hebt eine Faust. Eine dünne Projektionslinie rast an die gewählte Bodenposition und verankert sich als hexagonale Vorwarnmarke.

**Animation 2 | Aktivierungs- und Release-Moment:** Ein schweres Astralgewicht fällt sichtbar aus geringer Höhe auf die Markierung.

**Animation 3 | Eigenständige Kampfwirkung:** Beim Einschlag hebt sich ein verformter Schwerkraftkegel, der leichte Gegner seitlich in Richtung des Ankers zieht und dann nach außen kippen lässt. Die Stärke hängt vom Abstand ab, nicht von einer Endlosschleife.

**Animation 4 | Ende, Recovery und Materialzerfall:** Der Anker splittert in glühende Kupferplatten und hinterlässt eine nur kurz sichtbare Bodenvertiefung.

**Auswirkung auf Arena, Objekte oder Topologie:** Leichte Kisten können gekippt werden. Massive Castle-Wände und Türme dürfen nicht gezogen werden; lose Projektile ändern kurz ihre Flugbahn.

**Synergien mit vorhandenen GRIMGE-Spells:** Kombinierbar mit STONE SPIKES und SEISMIC SLAM; nicht dieselbe Festhalte-und-Slam-Aktion wie GRAVITY LIFT.

**Counterplay / PvP-Balance:** 0,65 s Vorwarnung, Maximalmasse, Standfestigkeit von Bossen und Heavy-Tanks; der Anker selbst ist zerstörbar.

**Technischer VFX-/Combat-Vertrag:** GroundField mit ForceVector, Massekategorien und LoS-Prüfung.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S04: Schwebende Bastion

**Systemtyp:** Defensiver Schwebe-Buff · self · 7 s  
**Dauer / Zeitfenster:** 7 s  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Guardian, Oracle, Ranger, Occultist  
**Mechanische Inspiration, keine Kopiervorlage:** Sigmas bewegliche Barriere.

**Visuelle GRIMGE-Identität:** Türkisgraue Schollen wie Glassteinplatten mit vergoldeten Nietlinien; die rechte Seite bleibt geöffnet.

**Animation 1 | Antizipation und Setup:** Der Avatar steigt nur wenige Pixel an. Zwei schwere Panzerplatten drehen sich vor und neben ihn und werfen gesplittete Schatten.

**Animation 2 | Aktivierungs- und Release-Moment:** Ein feines Schutzgeflecht verbindet die Platten. Waffen und Gesicht bleiben sichtbar.

**Animation 3 | Eigenständige Kampfwirkung:** Bei Defense verschiebt die vordere Platte den Einschlagswinkel; bei Forward-Angriffen öffnet sich eine kurze Schusslücke. Der Avatar darf langsam seitlich gleiten.

**Animation 4 | Ende, Recovery und Materialzerfall:** Am Ende sinken die Schollen und zerfallen zu Bodensplittern, bevor sich die normale Laufanimation fortsetzt.

**Auswirkung auf Arena, Objekte oder Topologie:** Schützt hinter sich befindliche Minions gegen einen Teil frontaler Projektile; versperrt aber keine Laufwege.

**Synergien mit vorhandenen GRIMGE-Spells:** Mehrwert gegenüber ARCANE AEGIS: gerichtete Umlenkung und veränderliche Deckungswinkel statt schlichtem Schaden absorbieren.

**Counterplay / PvP-Balance:** Seitlich/hinten verwundbar; Sperrfeuer kann Platten einzeln brechen.

**Technischer VFX-/Combat-Vertrag:** Drei unabhängige Attachment-ShieldMeshes, keine invulnerable globale Collider-Blase.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S05: Kometenträger

**Systemtyp:** Sprung-Manöver · direction  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Monk, Berserker, Beastborn, Ronin  
**Mechanische Inspiration, keine Kopiervorlage:** Aurelion-Sol-Flugfantasie und Luftkampfprinzipien aus Action-Brawlern.

**Visuelle GRIMGE-Identität:** Dunkelblau mit blassen Saphirsplittern und kupferrotem Stoßkern; ellipsoidisches Himmelsbruchstück.

**Animation 1 | Antizipation und Setup:** Zwei schräg stehende Energiefedern unter den Füßen spannen sich; ein schmaler Kometenkern bildet sich hinter dem Rücken.

**Animation 2 | Aktivierungs- und Release-Moment:** Der Avatar springt physikalisch hoch und wird danach in eine kurze, wählbare diagonale Flugphase versetzt.

**Animation 3 | Eigenständige Kampfwirkung:** Während der Flugphase können einmalig bis zu drei kleine Splitter nach unten abgeworfen werden. Danach folgt ein lenkbarer Sturzflug zum vorher angezeigten Landepunkt.

**Animation 4 | Ende, Recovery und Materialzerfall:** Auf dem Boden zerplatzt der Kometenmantel in drei konzentrische, zeitlich versetzte Risse.

**Auswirkung auf Arena, Objekte oder Topologie:** Trifft Bodenschalter und leichtere Trümmer, jedoch nicht die komplette Castle-Geometrie.

**Synergien mit vorhandenen GRIMGE-Spells:** Synergie mit TITAN STOMP als Set-up, ohne dessen Landeschaden zu duplizieren.

**Counterplay / PvP-Balance:** Angriff im Flug erkennbar, Zielkreis vor Impact; bewegliche Gegner können ausweichen.

**Technischer VFX-/Combat-Vertrag:** Echter Höhenwert und Landepunkt, VFX folgt Animation. Keine lediglich nach oben verschobene 2D-Bounds.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S06: Luftnähte

**Systemtyp:** Raumlinien-Manöver · dual  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Bladedancer, Ranger, Trickster, Arcanist  
**Mechanische Inspiration, keine Kopiervorlage:** Taliyahs territoriale Bewegung und Bards Passage als ferne Inspirationsprinzipien.

**Visuelle GRIMGE-Identität:** Bleiche Windfäden, scharf gebrochene Perlmutt-Nähte und kleine blaue Knoten.

**Animation 1 | Antizipation und Setup:** Zwei kleine Luftanker werden nacheinander in erreichbaren Positionen gesetzt. Ein dünner Vorschaupfad spannt sich zwischen ihnen.

**Animation 2 | Aktivierungs- und Release-Moment:** Beim zweiten Input entsteht für wenige Sekunden eine straffe, gebogene Bahn mit deutlichen Endpunkten.

**Animation 3 | Eigenständige Kampfwirkung:** Der Spieler kann die Naht durchqueren und erhält einen kurzen kontrollierten Schub; eigene Projektile werden entlang der Naht leicht gebogen. Gegner werden nicht automatisch aufgesaugt.

**Animation 4 | Ende, Recovery und Materialzerfall:** Nach zwei Durchquerungen reißt die Naht mit einem hellen Zickzack-Blitz.

**Auswirkung auf Arena, Objekte oder Topologie:** Überbrückt kleine Hindernisse, darf jedoch keine Castle-Torwand und keine Sicherheitsgrenze überspringen.

**Synergien mit vorhandenen GRIMGE-Spells:** Verändert die Flugbahn von IGNIS FIREBALL, VOID BOLT und SOUL SEEKERS, aber niemals ohne Kollisionsprüfung.

**Counterplay / PvP-Balance:** Im PvP sichtbar und für den Gegner ebenfalls durchquerbar; Anker können zerstört werden.

**Technischer VFX-/Combat-Vertrag:** LineConstraint mit bezierbasiertem Bahn-Guide und beiden Richtungen, kein Teleport-Tunnel.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.


## B · Zeit, Nachhall und vorbereitete Aktionen

### S07: Nachhallarchiv

**Systemtyp:** Kampfreaktor · self · 6 s  
**Dauer / Zeitfenster:** 6 s  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Runeblade, Ronin, Bladedancer, Arcanist  
**Mechanische Inspiration, keine Kopiervorlage:** Ekkos zeitliche Nachbilder und CrossCodes aktionsgebundene Arts als Inspirationsprinzip.

**Visuelle GRIMGE-Identität:** Rauchsilber, Messingstaub und durchsichtige Viertelbogen-Fragmente, die den Avatar um einen Frame verzögert umschreiben.

**Animation 1 | Antizipation und Setup:** Zwei schmale, gesplitterte Uhrenbögen klappen hinter den Schultern auf. Eine lichtschwache Kopie der letzten Handposition bleibt zurück.

**Animation 2 | Aktivierungs- und Release-Moment:** Der erste gültige normale Angriff wird registriert. Die Rune speichert nur sein freigegebenes Hitbox-Muster und seine Richtung, nicht den vollständigen Simulationszustand.

**Animation 3 | Eigenständige Kampfwirkung:** Nach einer kurzen Verzögerung erscheint am gespeicherten Angriffsort eine rein magische Wiederholung mit reduziertem Schaden. Treffer und Zustandsänderungen aus dem Original werden nicht erneut ausgelöst.

**Animation 4 | Ende, Recovery und Materialzerfall:** Archivsplitter zerbröseln nach maximal zwei Echos; der Avatar bleibt unverändert.

**Auswirkung auf Arena, Objekte oder Topologie:** Wiederholt nur Kampfaktionen, niemals den Bau einer Wand, das Erschaffen eines Himmelsfelds, den Grab-Zwang oder eine weitere Spezialrune.

**Synergien mit vorhandenen GRIMGE-Spells:** Mit Rune Imprint des Runeblade entsteht ein Timing-Build; kopierte Spell-Rezepte bleiben ohne neue Manazahlung ausdrücklich ausgeschlossen.

**Counterplay / PvP-Balance:** Echos deutlich heller und geometrisch gestreckt; maximal zwei, kein Selbst-Trigger.

**Technischer VFX-/Combat-Vertrag:** EventRecorder speichert AttackEvent IDs, Richtung, Zielregel und DamageSnapshot, keine rekursive Spell-Kopie.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S08: Sekundenpfand

**Systemtyp:** Delayed-Area · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Fateweaver, Occultist, Ranger, Ronin  
**Mechanische Inspiration, keine Kopiervorlage:** Ekkos zeitversetzte Zonen, taktische Vorhersage statt kompletter Zeitkontrolle.

**Visuelle GRIMGE-Identität:** Kupferblau und Schieferweiß, sechs gezackte Ziffernmarken auf einer gebrochenen Bodenplatte.

**Animation 1 | Antizipation und Setup:** Am Boden bildet sich ein offenes, asymmetrisches Siegel mit einem deutlich wandernden Leuchtpunkt.

**Animation 2 | Aktivierungs- und Release-Moment:** Der Spieler setzt es frei. Das Siegel zeichnet für 1,5 s lediglich Positionen eintretender Gegner als Lichtumrisse nach.

**Animation 3 | Eigenständige Kampfwirkung:** Nach Ablauf schlagen schmale Energiesäulen nacheinander an genau diesen gespeicherten Positionen ein, nicht an den aktuellen Aufenthaltsorten.

**Animation 4 | Ende, Recovery und Materialzerfall:** Das Siegel klappt wie Papier zusammen und schmilzt in ein glühendes Relief.

**Auswirkung auf Arena, Objekte oder Topologie:** Eingesetzte Kisten hinterlassen Schatten-Positionen und können als ablenkende Gegenstände genutzt werden; Castle-Objekte sind nicht rückversetzbar.

**Synergien mit vorhandenen GRIMGE-Spells:** Mit SHADOW STOMPER kann eine Position während des Aufzeichnens fixiert werden; die eigentliche Festhaltung stammt nur aus Shadow Stomper.

**Counterplay / PvP-Balance:** Sehr deutliches Bodenwarnzeichen, Ausweichraum zwischen Säulen; kein Echtzeit-Stop.

**Technischer VFX-/Combat-Vertrag:** Positionsringpuffer mit Maximum 6 Targets und diskreter Posenspur.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S09: Stillfuge

**Systemtyp:** Stasis-Feld · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Fateweaver, Oracle, Occultist, Guardian  
**Mechanische Inspiration, keine Kopiervorlage:** Bards Stasis-Prinzip, aber deutlich abgewandelt als Projektil-Verzögerungsfeld.

**Visuelle GRIMGE-Identität:** Mattweiß mit innen schwebenden schwarzkupfernen Glasflocken und segmentiertem Warnrand.

**Animation 1 | Antizipation und Setup:** Ein kleiner sechseckiger Spalt erscheint am Boden. In ihm schweben Partikel scheinbar zu langsam.

**Animation 2 | Aktivierungs- und Release-Moment:** Nach 0,8 s schließt sich der Spalt zu einer konturierten Kuppel.

**Animation 3 | Eigenständige Kampfwirkung:** Projektile innerhalb des Felds werden stark verlangsamt und auf einen Zeitpuffer gelegt. Kleine Gegner verlieren kurz ihre Angriffsgeschwindigkeit, sind jedoch weiterhin kontrollierbar.

**Animation 4 | Ende, Recovery und Materialzerfall:** Das Feld fällt in sich zusammen; verzögerte Projektile setzen ihre Flugbahn fort oder werden kontrolliert aufgelöst.

**Auswirkung auf Arena, Objekte oder Topologie:** Verändert zeitweise bewegliche Kisten und Beschwörungsprojektile, nicht Castle, Türme, Spielerinventar oder Match-Timer.

**Synergien mit vorhandenen GRIMGE-Spells:** Kontrast zu ECLIPSE-Himmelsfeld: lokal, kurze Dauer, kein Elementarbuff.

**Counterplay / PvP-Balance:** Keine globale Zeitstopp-Logik. Innerhalb klarer Reichweite kann man den Rand verlassen; Boss-Resistenz.

**Technischer VFX-/Combat-Vertrag:** Lokaler TimeScaleAdapter nur für zugelassene Entitäten; serverautoritatives Projektil-Staging.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S10: Rücksprungnadel

**Systemtyp:** Positionanker · self · 5 s  
**Dauer / Zeitfenster:** 5 s  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Shadow, Ranger, Trickster, Ronin  
**Mechanische Inspiration, keine Kopiervorlage:** Ekkos Rückspulmechanik und Bards räumliches Vorausplanen als Vorbilder.

**Visuelle GRIMGE-Identität:** Grünliches Elfenbeinglas, vertikaler Dolch aus vier lichtgebrochenen Segmenten.

**Animation 1 | Antizipation und Setup:** Ein punktförmiger Marker wird am Boden fixiert, darunter rotiert ein dreiteiliges Positionssiegel.

**Animation 2 | Aktivierungs- und Release-Moment:** Der Spieler kann 5 s lang normal angreifen und bewegen. Die Nadel bleibt am Startort als klar sichtbare Zielmarkierung.

**Animation 3 | Eigenständige Kampfwirkung:** Beim erneuten Auslösen oder bei Ablauf springt der Avatar zur Startposition zurück, sofern diese frei und regelkonform ist. Eine zurückbleibende Lichtspur markiert den Weg.

**Animation 4 | Ende, Recovery und Materialzerfall:** Der Anker zersplittert. Verlorene Lebenspunkte, Mana, Fokus und Buff-Timer werden nicht wiederhergestellt.

**Auswirkung auf Arena, Objekte oder Topologie:** Kann aus gefährlichem Bodeneffekt zurückführen; eine inzwischen durch Mauer belegte Zielposition führt zu sicherem Fallback vor dem Hindernis.

**Synergien mit vorhandenen GRIMGE-Spells:** Keine Verwechslung mit SHADOW STEP: nicht hinter Gegner teleportieren, sondern bewusst gesetzter Rückweg.

**Counterplay / PvP-Balance:** Anker für Gegner sichtbar und zerstörbar; Rücksprung bei Stun/Grab nicht frei verfügbar.

**Technischer VFX-/Combat-Vertrag:** PositionSnapshot mit Kollisionsprüfung, kein State-Rewind.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S11: Spiegelversatz

**Systemtyp:** Echoangriff · aim  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Bladedancer, Ronin, Runeblade, Trickster  
**Mechanische Inspiration, keine Kopiervorlage:** Doppelgänger- und Täuschungsprinzip, nicht kopierte konkrete Anime-Technik.

**Visuelle GRIMGE-Identität:** Violettgraue Glas-Afterimages und zwei schmale, schräg geneigte Spiegelkanten.

**Animation 1 | Antizipation und Setup:** Der Spieler markiert eine seitlich versetzte Position in Reichweite; der Avatar wirft einen unvollständigen Schattenumriss dorthin.

**Animation 2 | Aktivierungs- und Release-Moment:** Bei Aktivierung bildet sich dort ein an den aktuellen Sprite gebundenes, verwaschenes Bild der Waffenhaltung.

**Animation 3 | Eigenständige Kampfwirkung:** Für die nächsten zwei normalen Treffer führt das Echo einen reduzierten, zeitversetzten Angriff von seiner Position aus. Das Echo besitzt keine eigenständige KI, keine echte Gesundheit und kann nicht das Ziel blockieren.

**Animation 4 | Ende, Recovery und Materialzerfall:** Der Spiegelumriss zerbricht an seiner Position und wird vom Wind verstreut.

**Auswirkung auf Arena, Objekte oder Topologie:** Eignet sich zum Umspielen einer niedrigen Deckung, aber nicht zum Schießen durch Castle-Mauern.

**Synergien mit vorhandenen GRIMGE-Spells:** Im Unterschied zu DOPPEL kein vollwertiges Begleiter-Wesen und keine dauerhafte Kampf-Kopie.

**Counterplay / PvP-Balance:** Echo verschwindet bei Verlust der LoS oder nach maximal zwei Treffern; selbst keine neuen Specials.

**Technischer VFX-/Combat-Vertrag:** Sprite-Replay auf gesondertem Mask-Layer, keine neue Sprite-Erstellung pro Klasse.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S12: Schicksalsnadel

**Systemtyp:** Markierung und Finisher · aim  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Ranger, Ronin, Shadow, Runeblade  
**Mechanische Inspiration, keine Kopiervorlage:** Hweis zweifacher Treffer als markierungsgetriggerte Detonation, nur abstraktes Prinzip.

**Visuelle GRIMGE-Identität:** Drei asymmetrische Nadeln aus dunklem Roségold, dünne blaue Herzschlaglinien.

**Animation 1 | Antizipation und Setup:** Ein schmaler Zielfaden verbindet den Cursor/Stick mit einem einzelnen Gegner. Ein nadelförmiges Zeichen dreht sich über dem Ziel.

**Animation 2 | Aktivierungs- und Release-Moment:** Der nächste Treffer heftet eine sichtbare Nadel an den Ziel-Contour.

**Animation 3 | Eigenständige Kampfwirkung:** Die zwei darauffolgenden gültigen Nah- oder Projektiltreffer laden die Nadel. Sobald zwei Ladungen erreicht sind, startet ein begrenzter Nachstich entlang des letzten Angriffsvektors; kein automatischer Execute.

**Animation 4 | Ende, Recovery und Materialzerfall:** Beim Verbrauch bricht die Nadel zu drei Lichtstrichen.

**Auswirkung auf Arena, Objekte oder Topologie:** Markierungen können auf angreifbaren Beschwörungen und Minions liegen, nicht auf neutralen unverwundbaren Weltobjekten.

**Synergien mit vorhandenen GRIMGE-Spells:** Kombiniert gut mit ARC LIGHTNING und Mehrfachtreffern, aber jeder DamageEvent benötigt eine interne Unique-ID.

**Counterplay / PvP-Balance:** Blockt der Gegner den zweiten Treffer, verfällt die Nadel; sichtbares Entladefenster.

**Technischer VFX-/Combat-Vertrag:** MarkRegistry mit targetId, hitIds, cap und expireAt.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.


## C · Gelände, Objekte und räumliches Bauen

### S13: Splittergarten

**Systemtyp:** Platzierte Objektfamilie · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Fateweaver, Ranger, Oracle, Occultist  
**Mechanische Inspiration, keine Kopiervorlage:** Reaktive Oberflächen aus Divinity Original Sin 2 und Taliyahs Geländeausnutzung.

**Visuelle GRIMGE-Identität:** Jadegrüner Kern, rauchiges Korallenglas und dunkel geriffelte Kristallblätter.

**Animation 1 | Antizipation und Setup:** Der Zielbereich erhält sieben punktförmige Risskerne, die sich nacheinander auf der Bodenebene öffnen.

**Animation 2 | Aktivierungs- und Release-Moment:** Drei unterschiedlich hohe Kristallblüten schießen versetzt aus dem Boden und wachsen aus verschachtelten transparenten Platten.

**Animation 3 | Eigenständige Kampfwirkung:** Die Blüten sind echte, angreifbare Interaktionsobjekte. Treffer lösen Splitter-Projektile in der Richtung des Angriffs aus; bei Zerstörung bricht die jeweilige Pflanze zusammen.

**Animation 4 | Ende, Recovery und Materialzerfall:** Nach begrenzter Zeit verglühen verbliebene Blüten von innen und werden zu Staub.

**Auswirkung auf Arena, Objekte oder Topologie:** Andere Spieler können die Blüten als riskante Explosivdeckung benutzen. Fire trocknet sie aus, Frost macht sie spröde, Blitz lädt ihre Splitter auf.

**Synergien mit vorhandenen GRIMGE-Spells:** Nicht einfach STONE SPIKES: persistent, hit-reactive und manipuliert durch Spielerprojekte.

**Counterplay / PvP-Balance:** Klare Blütenhitbox, maximal drei Objekte pro Spieler, abgeschwächter Schaden durch Kettenreaktion.

**Technischer VFX-/Combat-Vertrag:** InstancedWorldProp mit separaten health, elemental_tags, projectileOnHit, cap per owner.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S14: Seismischer Steg

**Systemtyp:** Temporäre modulare Brücke · placement  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Lancer, Guardian, Monk, Oracle  
**Mechanische Inspiration, keine Kopiervorlage:** Taliyahs Gelände- und Laufbahn-Ideen, Meis interaktive temporäre Wände.

**Visuelle GRIMGE-Identität:** Dunkle Basaltflächen mit gelben Bruchkernen und versetzten, metallischen Kanteneinsätzen.

**Animation 1 | Antizipation und Setup:** Der Spieler zieht eine maximal begrenzte Linie am Boden. Ein Vorschau-Mesh zeigt die zulässige Längsrichtung und rote Bereiche bei ungültiger Kollision.

**Animation 2 | Aktivierungs- und Release-Moment:** Vier flache Platten steigen entlang der Linie aus dem Boden. Zwischen ihnen entsteht ein rissiges Laufband.

**Animation 3 | Eigenständige Kampfwirkung:** Verbündete erhalten auf dem Steg kleinen Lauftempobonus; Gegner stolpern beim ersten Überqueren. Segmente können von schweren Schlägen einzeln zerbrochen werden.

**Animation 4 | Ende, Recovery und Materialzerfall:** Die Platten sinken einzeln ab und hinterlassen kleine, schnell verschwindende Steinfragmente.

**Auswirkung auf Arena, Objekte oder Topologie:** Kann eine Pfütze überbrücken und durch Magma Fissure beschädigt werden; Castle-Hauptwege bleiben passierbar.

**Synergien mit vorhandenen GRIMGE-Spells:** Alternative zu STONE WALL: keine harte Vollsperre, sondern temporäres Weg- und Tempo-Objekt.

**Counterplay / PvP-Balance:** Nie vollständige Lane-Versperrung. Angriffsflächen in der Höhe begrenzt, zerstörbar durch definierte Beam-Schadensklasse.

**Technischer VFX-/Combat-Vertrag:** NavDynamicCostField mit Segment-Slots und SafeLaneCheck.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S15: Flutschiene

**Systemtyp:** Bewegliches Elementarfeld · placement  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Ranger, Oracle, Monk, Fateweaver  
**Mechanische Inspiration, keine Kopiervorlage:** Divinity Original Sin 2 Surface-Reaktionen als Systemvorbild.

**Visuelle GRIMGE-Identität:** Seidenblau, schmale platinfarbene Wellenleisten, bewegliche Kristallfische als innere Strömungsmarker.

**Animation 1 | Antizipation und Setup:** Der Spieler zieht eine kurze Flusslinie in World-Ground. Am Anfang sammelt sich ein helles Aquasiegel.

**Animation 2 | Aktivierungs- und Release-Moment:** Ein schmaler, leicht transparenter Wasserkanal rollt entlang der eingezeichneten Linie.

**Animation 3 | Eigenständige Kampfwirkung:** Bodenprojektile, leichte Kisten und unfeste Minions werden mit moderater Geschwindigkeit in Flussrichtung verschoben. Eigenes Laufen entlang der Strömung gibt einen kleinen Bewegungsbonus.

**Animation 4 | Ende, Recovery und Materialzerfall:** Die Wasserbahn trocknet in einzelnen Segmenten ab, die Strömungsmarker zerbrechen zu Tropfen.

**Auswirkung auf Arena, Objekte oder Topologie:** FULGUR elektrifiziert nur einen Teilbereich; AQUA kann einzelne Abschnitte gefrieren; IGNIS produziert kurze Dampfschwaden; SOLAR ORB beschleunigt das Trocknen.

**Synergien mit vorhandenen GRIMGE-Spells:** Unterscheidet sich von FROST MIRROR GATE: Bewegung entlang einer gezeichneten Weltlinie statt Punkt-zu-Punkt-Teleport.

**Counterplay / PvP-Balance:** Maximal eine Schiene pro Spieler; frei bleibende Seitenausweichwege; keine Schiebung von Bossen oder massiven Burgstrukturen.

**Technischer VFX-/Combat-Vertrag:** WorldSurfaceSpline mit velocity_field und Element-Transitions.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S16: Glutpumpe

**Systemtyp:** Umweltreaktor · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Arcanist, Fateweaver, Occultist, Runeblade  
**Mechanische Inspiration, keine Kopiervorlage:** Larians Oberflächen-Chemie, nicht kopierte Spezialfähigkeit.

**Visuelle GRIMGE-Identität:** Ziegelrot, kupferne Keilventile, poröser schwarzer Glasstein und heiße Lichtadern.

**Animation 1 | Antizipation und Setup:** Drei kleine Ventilstifte werden sichtbar in den Boden gerammt; ihre Positionen bilden ein verzerrtes Dreieck.

**Animation 2 | Aktivierungs- und Release-Moment:** Im Zentrum wächst ein schmaler, gerippter Druckkörper, keine gewöhnliche Flammenpfütze.

**Animation 3 | Eigenständige Kampfwirkung:** Trifft Feuer oder eine bestehende Magmafläche das Druckgerät, wird Hitze gespeichert. Trifft Wasser den heißen Kern, stößt er eine sichtbare Dampfwalze zur Seite aus. Beim dritten Trigger platzt er.

**Animation 4 | Ende, Recovery und Materialzerfall:** Nach dem letzten Druckstoß zerfällt die Pumpe als glühender Kupfer-Schrott.

**Auswirkung auf Arena, Objekte oder Topologie:** Verwandelt vorhandene Bodenflächen temporär, manipuliert aber die Darstellung über echte Surface-Tags. Kisten können durch die Walze verschoben werden.

**Synergien mit vorhandenen GRIMGE-Spells:** IGNIS FIREBALL, MAGMA FISSURE und AQUA sind die relevanten vorhandenen Bausteine; kein neuer Basis-Feuerzauber.

**Counterplay / PvP-Balance:** Gut lesbare Druckanzeige; Gegner kann die Pumpe gezielt zerstören, bevor die Reaktion startet.

**Technischer VFX-/Combat-Vertrag:** WorldProp mit chargeEvents, typedSurfaceQuery, oneShotSteamBurst.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S17: Raumfalter

**Systemtyp:** Räumliche Ablenkzone · dual  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Trickster, Ranger, Arcanist, Fateweaver  
**Mechanische Inspiration, keine Kopiervorlage:** Orianna Positionsdenken, Vel’Koz Flugbahnänderung als abstraktes Mechanikprinzip.

**Visuelle GRIMGE-Identität:** Kühles Graugold und blauviolette Faltnähte, flache Segel aus zerbrochenen Spiegelresten.

**Animation 1 | Antizipation und Setup:** Zwei Linienpunkte erscheinen auf dem Boden. Die Grenze zeigt bereits im Telegraphraster den möglichen Ein- und Ausgang von Projektilen.

**Animation 2 | Aktivierungs- und Release-Moment:** Die Punkte werden durch eine geschwungene, halbtransparente Falte verbunden.

**Animation 3 | Eigenständige Kampfwirkung:** Schmale eigene und gegnerische Projektile treffen die Falte und werden nach definiertem Winkel abgelenkt. Größere Beams verlieren nur einen Teil ihrer Intensität und werden nicht vollständig umgeschrieben.

**Animation 4 | Ende, Recovery und Materialzerfall:** Nach maximal vier Interaktionen kollabiert die Falte und schleudert harmlose Splitter in die Umgebung.

**Auswirkung auf Arena, Objekte oder Topologie:** Faltet Projektilbahnen um Kisten und Wände, aber darf keine Angriffe direkt durch Castle-Kernwände leiten.

**Synergien mit vorhandenen GRIMGE-Spells:** Alternative zu MIRROR WARD: keine Geschosse speichern oder zurückwerfen, sondern laufende Flugbahnen im Raum verändern.

**Counterplay / PvP-Balance:** Für alle sichtbar. Eine grüne/violette Ein- und Ausrichtungslinie zeigt Gefahrenkorridore.

**Technischer VFX-/Combat-Vertrag:** ProjectileDirectionModifier; LoS und maxRedirectCount verhindern Loop-Schleifen.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S18: Glasfeld

**Systemtyp:** Reaktive Spiegelboden-Zone · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Guardian, Oracle, Ranger, Arcanist  
**Mechanische Inspiration, keine Kopiervorlage:** Larian-/BG3-Oberflächen-Systeme und geom. Projectile Splitting.

**Visuelle GRIMGE-Identität:** Weißblaue Kristallkrümel, schwarze Fugen, jadefarbene polierte Innenflächen.

**Animation 1 | Antizipation und Setup:** Ein nicht geschlossener Runenriss rollt am Boden aus und bildet mehrere polygonale Glasplättchen mit echter Pixel-Innenzeichnung.

**Animation 2 | Aktivierungs- und Release-Moment:** Der Boden verfestigt sich für wenige Sekunden in einem flachen Spiegelmosaik.

**Animation 3 | Eigenständige Kampfwirkung:** Eigene Bodeneinschläge laden einzelne Plättchen; gegnerische Projektile, die den flachen Reflexionswinkel treffen, lösen nur einen kurzen reflektierten Fragmentstrahl aus.

**Animation 4 | Ende, Recovery und Materialzerfall:** Die Plättchen reißen und werden durch gläserne Lichtstaubpartikel aufgelöst.

**Auswirkung auf Arena, Objekte oder Topologie:** Wasser erhöht Spiegelwirkung, Feuer trübt einzelne Plättchen, Terra-Explosionen zerschlagen die Oberfläche.

**Synergien mit vorhandenen GRIMGE-Spells:** Nicht Spiegel-Wand und nicht komplette Projektilreflexion von MIRROR WARD; es ist ein winkelabhängiger Bodeneffekt.

**Counterplay / PvP-Balance:** Schmale Fläche, begrenzte Reflexionsladungen, sichtbare dunkle Plättchen für bereits verbrauchte Sektoren.

**Technischer VFX-/Combat-Vertrag:** SurfacePolygonGrid mit lokalen Normalen und maximal ein reflektiertes Kindprojektil pro Treffer.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.


## D · Projektile, Strahlen und Gegenzauber

### S19: Strahlenweber

**Systemtyp:** Beam-Umleitungssetup · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Arcanist, Runeblade, Ranger, Fateweaver  
**Mechanische Inspiration, keine Kopiervorlage:** Strahl-Geometrie aus CrossCode/Vel’Koz, aber eigenständiger Verteiler mit World-Prop.

**Visuelle GRIMGE-Identität:** Rotgoldene Faseradern, kupferne Prismenarme und eine helle mittlere Lichtfuge.

**Animation 1 | Antizipation und Setup:** Ein kompaktes dreigeteiltes Prisma wird als angreifbares Objekt an der gewählten Position platziert.

**Animation 2 | Aktivierungs- und Release-Moment:** Beim ersten freundlichen Beam-Treffer dreht sich das Prisma in dessen Richtung.

**Animation 3 | Eigenständige Kampfwirkung:** Der auftreffende Beam wird in zwei schwächere abgewinkelte Ausgänge geteilt. Jeder Ausgang hat kürzere Reichweite und separate, reduzierte Schadenstakte.

**Animation 4 | Ende, Recovery und Materialzerfall:** Bei verbrauchter Energie klappen die Arme zusammen; Splitter fallen zu Boden.

**Auswirkung auf Arena, Objekte oder Topologie:** Kann um Deckung herumschießen. Eingehende gegnerische Beams beschädigen das Objekt anstatt es zu übernehmen.

**Synergien mit vorhandenen GRIMGE-Spells:** Direkte Synergie mit INFERNO BEAM, GLACIAL RAY, THUNDER LANCE, NULL RAY und RADIANT LANCE; Beam Clash bleibt nur an echten Beam-Tips möglich.

**Counterplay / PvP-Balance:** Prisma vor dem Schuss sichtbar; leicht zerstörbar; Gesamt-DPS liegt unter ungeteilter Strahlstärke.

**Technischer VFX-/Combat-Vertrag:** BeamGraph mit Split-Node, per-parent damage-budget und Clash-Edge-Handling.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S20: Prismenhalter

**Systemtyp:** Einmaliges Projektil-Umladen · self  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Guardian, Arcanist, Trickster, Oracle  
**Mechanische Inspiration, keine Kopiervorlage:** Sigma Kinetic Grasp und CrossCode Guard Arts, aber mit begrenzter bewusster Umladung.

**Visuelle GRIMGE-Identität:** Gebrochener Opalkäfig in Bronze, cyanfarbene Resonanznähte und fliegende Staubscheiben.

**Animation 1 | Antizipation und Setup:** Zwei geschlossene V-förmige Klammern falten sich vor den Händen auseinander.

**Animation 2 | Aktivierungs- und Release-Moment:** Der nächste capturable-Projektiltreffer wird beim Einschlag in das Prisma eingespannt.

**Animation 3 | Eigenständige Kampfwirkung:** Innerhalb eines kurzen Fensters wird er auf erneuten Input als neue, langsamer drehende Kristallsalve mit derselben Grundschadensfamilie abgefeuert.

**Animation 4 | Ende, Recovery und Materialzerfall:** Nicht genutzte Ladung entlädt sich schadensfrei in den Boden; die Klammern zerbrechen nach einem Schuss.

**Auswirkung auf Arena, Objekte oder Topologie:** Weltobjekte werden nur getroffen, wenn die ursprüngliche Projektilfamilie dies erlaubte.

**Synergien mit vorhandenen GRIMGE-Spells:** Anders als MIRROR WARD (bis fünf Projektile automatisch zurück): genau ein Projektil bewusst neu positionieren und umformen.

**Counterplay / PvP-Balance:** Nur reflectable/capturable, kein Beam und keine Spezialrune als gespeichertes Objekt.

**Technischer VFX-/Combat-Vertrag:** CapturedProjectileData vollständig serialisiert, ownershipwechsel mit Damage-Cap.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S21: Schwarmprotokoll

**Systemtyp:** Zielmarkierter Salvenmodus · self · 7 s  
**Dauer / Zeitfenster:** 7 s  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Bladedancer, Ranger, Ronin, Fighter-ähnliche spätere Klasse  
**Mechanische Inspiration, keine Kopiervorlage:** Homing-Projectile-Design aus Action-Arenen und CrossCodes Shock-Arts.

**Visuelle GRIMGE-Identität:** Helle Fliedernadeln auf dunklen Schieferbahnen, feine versetzte Zahlenkerben an den Projektilkörpern.

**Animation 1 | Antizipation und Setup:** Vier kleine Startfenster werden an Schulter, Rücken und Handgelenken eröffnet, ohne den Avatar zu überdecken.

**Animation 2 | Aktivierungs- und Release-Moment:** Die erste erfolgreiche eigene Waffenattacke markiert einen Gegner als Prioritätsziel.

**Animation 3 | Eigenständige Kampfwirkung:** Je erfolgreichem normalem Treffer startet höchstens ein zielsuchendes Projektil aus einem Fenster. Seine Kurve ist begrenzt; es verliert das Ziel, wenn eine massive Wand dazwischenliegt.

**Animation 4 | Ende, Recovery und Materialzerfall:** Die Fenster drehen sich zu und zerfallen nacheinander wie ablaufende Ziffern.

**Auswirkung auf Arena, Objekte oder Topologie:** Eigene Konstrukte können Sicht versperren; gegnerische Barrieren bleiben wirksam.

**Synergien mit vorhandenen GRIMGE-Spells:** Abgrenzung zu SOUL SEEKERS: Dort einmalige Drei-Projektil-Salve. Hier zeitlicher Markierungsmodus, der gutes Melee belohnt.

**Counterplay / PvP-Balance:** Maximal vier Schüsse, mindestens 0,4 s Abstand; Zielwechsel muss aktiv getroffen werden.

**Technischer VFX-/Combat-Vertrag:** Homing turnRate limit, firedOnHit, maxSpawn per duration.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S22: Rissweiche

**Systemtyp:** Projektildurchgang · dual  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Ranger, Trickster, Arcanist, Shadow  
**Mechanische Inspiration, keine Kopiervorlage:** Portalsysteme, Bards Reise nur als Fernanalogie.

**Visuelle GRIMGE-Identität:** Ausgefranste Lapislazulikanten mit goldenem Innerand, wie zwei zerbrochene Torrahmen aus Splittern.

**Animation 1 | Antizipation und Setup:** Zwei halbhohe Portalkanten werden auf kurze Distanz nacheinander an erlaubten Stellen gesetzt.

**Animation 2 | Aktivierungs- und Release-Moment:** Die Portale bleiben nur für Projektile aktiv. Der Charakter kann nicht durch sie hindurchgehen.

**Animation 3 | Eigenständige Kampfwirkung:** Ein geworfenes eigenes Projektil tritt in Kante A ein und verlässt B unter einer klar erkennbaren Ausgangsrichtung. Feindliche Geschosse prallen seitlich ab.

**Animation 4 | Ende, Recovery und Materialzerfall:** Nach drei eigenen Projektilen lösen sich beide Kanten auf.

**Auswirkung auf Arena, Objekte oder Topologie:** Ermöglicht Angriffe um Deckungen. Niemals durch das Burginnere oder außerhalb erlaubter Lane-Limits.

**Synergien mit vorhandenen GRIMGE-Spells:** Explizit nicht FROST MIRROR GATE: kein Heldentransport, keine 30-s-Verbindung, nur Projektilrouten.

**Counterplay / PvP-Balance:** Gegner darf ausweichen oder Portale zerstören. LoS der Ausgangsmündung muss zulässig bleiben.

**Technischer VFX-/Combat-Vertrag:** TypedProjectileTransit, 3D lane depth preserved and loop guard.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S23: Polarisationswerk

**Systemtyp:** Temporärer Magnetturm · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Ranger, Lancer, Arcanist, Fateweaver  
**Mechanische Inspiration, keine Kopiervorlage:** Sigmas Objektkontrolle und magnetische Action-Skill-Fantasien.

**Visuelle GRIMGE-Identität:** Kupferrot, türkis leuchtende Leitbahnen, schwebende gezahnte Rotoren und grobes Mica-Glitter.

**Animation 1 | Antizipation und Setup:** Ein dreiteiliger Rotor entsteht am Boden, darüber zeigen zwei gegensätzlich rotierende Halbringen die Wirkzone.

**Animation 2 | Aktivierungs- und Release-Moment:** Mit dem Cast wird eine bevorzugte Ablenkrichtung festgelegt.

**Animation 3 | Eigenständige Kampfwirkung:** Leichte metallische Projektile und ausgewählte Physikobjekte werden zur rechten oder linken Seite gebogen; reine Flammen- und Void-Beams bleiben unverändert.

**Animation 4 | Ende, Recovery und Materialzerfall:** Bei Überlastung springt der Rotor auseinander und hinterlässt eine kurz zitternde Funkenwolke.

**Auswirkung auf Arena, Objekte oder Topologie:** Hebt metallische Kleinkisten minimal an, beeinflusst aber keine Castle-Türme und keine gesamten Rüstungen.

**Synergien mit vorhandenen GRIMGE-Spells:** FULGUR kann die Rotation aufladen; KONSTRUKT-Bulwark bietet zusätzliche Deckung für den Rotor.

**Counterplay / PvP-Balance:** Turm ist sichtbar und zerstörbar. Große schwere Angriffe dürfen ihn trotz Richtungsänderung durchbrechen.

**Technischer VFX-/Combat-Vertrag:** Projectiles benötigen materialTags; keine universelle Magnetisierung jedes Magiespells.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S24: Schwerelosband

**Systemtyp:** Vertikales Korridorfeld · placement  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Monk, Ranger, Arcanist, Lancer  
**Mechanische Inspiration, keine Kopiervorlage:** Aurelion Sols Luftkampf und Sigmas Gravitationsprinzip.

**Visuelle GRIMGE-Identität:** Dunkelindigo mit mintgrünen Partikelmarken; feine gebogene Messinglinien zeigen das Kraftfeld.

**Animation 1 | Antizipation und Setup:** Ein rechteckig wirkender Preview-Volume wird nur als Editor-Telegraph angezeigt; finale VFX sind kurvige, texturierte Feldlinien über einem schmalen Bodenriss.

**Animation 2 | Aktivierungs- und Release-Moment:** Die Feldlinie wird am Boden geöffnet und zwei lokale Richtungsadern beginnen langsam nach oben zu laufen.

**Animation 3 | Eigenständige Kampfwirkung:** Gegner und leichte Objekte werden beim Durchqueren leicht angehoben, aber nicht festgehalten. Eigene Luft-Projektile verlängern kurz ihre Schwebezeit; Bodengeschosse können darunter hindurchfliegen.

**Animation 4 | Ende, Recovery und Materialzerfall:** Die Feldadern reißen zeitversetzt und lassen die Objekte kontrolliert zurücksinken.

**Auswirkung auf Arena, Objekte oder Topologie:** Kann eine niedrige Mauer teilweise umgehen, aber Angriffe müssen weiterhin echte Kollisionen auswerten.

**Synergien mit vorhandenen GRIMGE-Spells:** Nicht GRAVITY LIFT: dort bis vier Gegner per Telekinese halten/werfen. Hier kurze Durchgangsmechanik.

**Counterplay / PvP-Balance:** Feld schmal, kurzer Trigger pro Gegner, Bodenanker deutlich.

**Technischer VFX-/Combat-Vertrag:** VerticalMotionVolume mit GroundHeight und JumpPhysics Integration.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.


## E · Gebilde, Helfer und Kampfobjekte

### S25: Klingenchor

**Systemtyp:** Orbitale Waffenobjekte · self · 7 s  
**Dauer / Zeitfenster:** 7 s  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Runeblade, Ronin, Shadow, Monk  
**Mechanische Inspiration, keine Kopiervorlage:** Syndras Objektverwaltung und typische Anime-Schwarmwaffen als abstrahierte Mechanik.

**Visuelle GRIMGE-Identität:** Dunkelrotes Nachtglas, cremefarbene Schneidkanten, schmale ornamentierte Kernspalten.

**Animation 1 | Antizipation und Setup:** Drei asymmetrische, stark ornamentierte Splitterklingen erscheinen hinter der Waffe. Jede besitzt einen eigenen Schwerpunktschatten.

**Animation 2 | Aktivierungs- und Release-Moment:** Die Klingen schweben auf unterschiedlichen Höhen um den Avatar und folgen seiner Blickrichtung mit Trägheit.

**Animation 3 | Eigenständige Kampfwirkung:** Normale Melee-Treffer laden Klingen; beim nächsten Heavy fliegen nur geladene Exemplare auf ein Ziel. Ohne Treffer verbleiben sie rein defensiv und können einzelne geringe Projektile abschirmen.

**Animation 4 | Ende, Recovery und Materialzerfall:** Leere Klingen zerfallen in feine Querschnittsplättchen.

**Auswirkung auf Arena, Objekte oder Topologie:** Eigene Steinmauern und Kisten stoppen die Flugbahn; sie sind keine Ghost-Angriffe durch Terrain.

**Synergien mit vorhandenen GRIMGE-Spells:** Anders als Arkengestell-Buff: keine gesamte Körpermanifestation, nur drei bedingte Waffenobjekte.

**Counterplay / PvP-Balance:** Maximal drei Klingen und begrenzter Blockwert; Gegner sieht volle geladene Klingen leuchten.

**Technischer VFX-/Combat-Vertrag:** OrbitWeaponSystem mit runtime procedural ribbons, per-weapon sockets, damage budget.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S26: Marionettenfaden

**Systemtyp:** Manipulation einer Einzelinstanz · aim  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Fateweaver, Arcanist, Trickster, Occultist  
**Mechanische Inspiration, keine Kopiervorlage:** Objektmanipulation aus Physikspielen, Dota Telekinesis als allgemeines Pattern.

**Visuelle GRIMGE-Identität:** Kalter Graphit, kupferblaue Rissfäden, keine puppenartigen humanoiden Gegnerkörper.

**Animation 1 | Antizipation und Setup:** Der Spieler hebt zwei Finger. Aus Handgelenkankern schießen mehrere ultradünne Lichtfäden.

**Animation 2 | Aktivierungs- und Release-Moment:** Der Zielmarker verbindet sich mit einer gültigen Kiste, Wandplatte oder kleinen beschworenen Einheit.

**Animation 3 | Eigenständige Kampfwirkung:** Solange die Rune aktiv ist, kann das verbundene Objekt begrenzt gezogen, gedreht oder umgestoßen werden. Gegen Helden wirkt es nur als kurzer geringer Push und nie als vollständige Übernahme der Steuerung.

**Animation 4 | Ende, Recovery und Materialzerfall:** Die Fäden reißen einzeln, das Objekt übernimmt wieder seine reguläre Physik.

**Auswirkung auf Arena, Objekte oder Topologie:** Kisten als Deckung verrücken, Mirror-Gate-Sicht blockieren, Golem-Position kurz korrigieren.

**Synergien mit vorhandenen GRIMGE-Spells:** Kontrast GRAVITY LIFT: ein Objekt statt vier Gegner, kontinuierliche Positionierung statt anheben-und-schleudern.

**Counterplay / PvP-Balance:** Strenge Massengrenze und LoS; jederzeit durch Block bzw. Treffer unterbrechbar.

**Technischer VFX-/Combat-Vertrag:** Network-authoritative JointController, constrained physics, validTargetTags.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S27: Runenschmiede

**Systemtyp:** Aktivierter Umgebungs-Forge · self  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Guardian, Lancer, Runeblade, Arcanist  
**Mechanische Inspiration, keine Kopiervorlage:** Crafting- und Terrain-Interaktionsdesign, entfernt inspiriert von Action-Magie mit Konstrukten.

**Visuelle GRIMGE-Identität:** Satinbronze mit smaragdgrüner Glut im Kern, runisch strukturierte Materialschichten.

**Animation 1 | Antizipation und Setup:** Vor der Hand entsteht ein schwebender Schmiedegriff aus drei Ringen und unregelmäßigen Metallstücken.

**Animation 2 | Aktivierungs- und Release-Moment:** Die Rune markiert das nächste eigene konstruierte Objekt oder einen zulässigen, zerstörbaren Weltgegenstand.

**Animation 3 | Eigenständige Kampfwirkung:** Beim Aktivieren wird genau ein Objekt temporär in ein Werkzeug verwandelt: Bulwark-Segment wird Schild, leichte Kiste wird Wurfblock, Wall-Stück wird kurze Bruchlanze. Es wird keine dauerhafte neue Waffe in die Inventardaten geschrieben.

**Animation 4 | Ende, Recovery und Materialzerfall:** Das Werkzeug verbraucht sich beim ersten Heavy oder nach einigen Sekunden.

**Auswirkung auf Arena, Objekte oder Topologie:** Spieler können Gelände aus einem bereits vorhandenen Objekt als Ressource nutzen. Unzerstörbare Castle-Tore werden niemals verwertet.

**Synergien mit vorhandenen GRIMGE-Spells:** KONSTRUKT-BULWARK und STONE WALL werden zu Bau-Ressourcen, ohne den ursprünglichen Spell zu ersetzen.

**Counterplay / PvP-Balance:** Braucht echtes gültiges Objekt in Reichweite. Aktivierung scheitert transparent, wenn keine erlaubte Ressource vorhanden ist.

**Technischer VFX-/Combat-Vertrag:** RecipeModifier keyed by worldPropType, no asset cloning at runtime.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S28: Echofamulus

**Systemtyp:** Kurzlebige Aktionsprojektion · self · 5 s  
**Dauer / Zeitfenster:** 5 s  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Runeblade, Monk, Ranger, Bladedancer  
**Mechanische Inspiration, keine Kopiervorlage:** Echo-/Assist-Mechaniken aus Action-Spielen, nicht originalgetreue Anime-Kopie.

**Visuelle GRIMGE-Identität:** Heller rauchiger Bernstein, grob gepixelte Leuchtfäden, keine menschliche Klonfigur.

**Animation 1 | Antizipation und Setup:** Neben dem Charakter entsteht eine flache, leuchtende Umrissplatte mit einer rissigen Auge-förmigen Kernmarke.

**Animation 2 | Aktivierungs- und Release-Moment:** Die Platte ordnet sich wechselnden Arm- und Waffensockets zu, statt eine eigenständige Begleiterfigur zu bilden.

**Animation 3 | Eigenständige Kampfwirkung:** Bei zwei erfolgreichen Nahkampf- oder Projektilaktionen kopiert sie einmal nur den letzten Projektilvektor als kleinen schwachen Stich. Kein freier KI-Entscheid, kein eigenständiges HP-System.

**Animation 4 | Ende, Recovery und Materialzerfall:** Nach einmaligem Nachstich verbrennt die Projektionsplatte und hinterlässt wenige warmweiße Partikel.

**Auswirkung auf Arena, Objekte oder Topologie:** Der Famulus kann dünne Leichtobjekte treffen, aber keine Türme eigenständig fokussieren.

**Synergien mit vorhandenen GRIMGE-Spells:** Klar verschieden von DOPPEL: kein separater Avatar-Sprite, keine Begleiter-KI und kein dauerhafter Summon.

**Counterplay / PvP-Balance:** Einmalige Auslösung und reduzierte Schadensskalierung.

**Technischer VFX-/Combat-Vertrag:** SingleUseAttackProxy; kein NPC-Agent, kein vollständiger neuer Sprite.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S29: Bruchkoloss

**Systemtyp:** Lokales Großkonstrukt · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Guardian, Berserker, Lancer, Fateweaver  
**Mechanische Inspiration, keine Kopiervorlage:** Spirit-Manifestationen aus Anime als allgemeines Bildprinzip.

**Visuelle GRIMGE-Identität:** Schiefergraue Blöcke, smaragdgrüne Fugen, polierte violette Energiegelenke.

**Animation 1 | Antizipation und Setup:** An der Zielposition steigen mehrere lose Bauplatten auf und formen eine grobe Schulter-Silhouette.

**Animation 2 | Aktivierungs- und Release-Moment:** Es erscheinen nur drei externe Armsegmente und eine große Faust; kein vollständiger belebter Riesen-Sprite.

**Animation 3 | Eigenständige Kampfwirkung:** Das Konstrukt führt nach kurzer Warnung einen horizontalen Schlag aus, drückt einen Gegner zurück und stößt gegen zerbrechliche Objekte.

**Animation 4 | Ende, Recovery und Materialzerfall:** Der Arm bricht vom Handgelenk aus in große polygonale Stücke und versinkt in der Bodenrune.

**Auswirkung auf Arena, Objekte oder Topologie:** Kann feindliche Kisten aus dem Weg räumen, aber keine eigentliche Burg zerstören, außer die normale ausgewiesene Objekt-Schadensklasse erlaubt es.

**Synergien mit vorhandenen GRIMGE-Spells:** Abgrenzung SIEGE GOLEM: ein einmaliger lokaler Effekt, kein marschierender Summon. Abgrenzung Arkengestell: externe Stelle statt Körper-Buff.

**Counterplay / PvP-Balance:** 0,7 s gut sichtbarer Wind-up, Faust kann durch schweren gegnerischen Beam zerlegt werden.

**Technischer VFX-/Combat-Vertrag:** ProceduralSkeletonLite mit drei Gelenken, eigene Collider nur in Active Frames.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S30: Jägerglocke

**Systemtyp:** AI-Priorisierungs-Signal · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Beastborn, Spiritbound, Oracle, Occultist  
**Mechanische Inspiration, keine Kopiervorlage:** Objektivsteuerung aus MOBA-/RTS-Games, keine Figuren-/Skillkopie.

**Visuelle GRIMGE-Identität:** Dunkeltürkis, drei bronzene Schallzungen, feiner rissiger Schallfilm.

**Animation 1 | Antizipation und Setup:** Der Spieler wirft einen kleinen Glockenkern an einen zulässigen Bodenpunkt.

**Animation 2 | Aktivierungs- und Release-Moment:** Drei klingende Lichtwellen laufen konzentrisch am Boden aus und markieren feindliche Beschwörungen.

**Animation 3 | Eigenständige Kampfwirkung:** Eigene bereits existierende Beasts oder Golems priorisieren für wenige Sekunden markierte feindliche Summons, statt wahllos den nächsten Minion zu verfolgen.

**Animation 4 | Ende, Recovery und Materialzerfall:** Der Glockenkern sinkt ein und verschwindet, sobald die Markierung verbraucht ist.

**Auswirkung auf Arena, Objekte oder Topologie:** Gibt Summons eine neue taktische Rolle: gegnerische Siege-Objekte oder Projektilturrets abräumen.

**Synergien mit vorhandenen GRIMGE-Spells:** Ergänzt BESTIA und KONSTRUKT; beschwört selbst keinerlei neue Kreatur und zählt daher nicht gegen Summon-Caps.

**Counterplay / PvP-Balance:** Markierung sichtbar; gegnerisches Team kann Klinge/Glockenkern zerstören oder das Ziel aus Reichweite führen.

**Technischer VFX-/Combat-Vertrag:** SummonTargetingPriorityOverride mit TTL und TeamOwner-Check.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.


## F · Arenaregeln, Resonanz und metamagische Eingriffe

### S31: Runengericht

**Systemtyp:** Temporäre Regelzone · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Fateweaver, Oracle, Arcanist, Guardian  
**Mechanische Inspiration, keine Kopiervorlage:** Felder mit Spezialregeln aus MOBAs und Domains als allgemeines, stark transformiertes Prinzip.

**Visuelle GRIMGE-Identität:** Messingweiße Tafeln mit asymmetrischen Buchstaben, tiefblaue Lichtnaht; kein fertiger Anime-Domain-Dome.

**Animation 1 | Antizipation und Setup:** Vier kleine verbundene Tafeln tauchen um den Zielbereich herum aus dem Boden auf und schlagen nach innen.

**Animation 2 | Aktivierungs- und Release-Moment:** Die Zone erhält eine durch vier kurze Leuchtstreifen angezeigte Regel: erstes Projektil beim Eintritt wird verlangsamt und neu gerichtet.

**Animation 3 | Eigenständige Kampfwirkung:** Während der Gültigkeit tritt die Regel pro Team nur begrenzt auf. Weder Spielersteuerung noch Zauberinventar werden aufgehoben.

**Animation 4 | Ende, Recovery und Materialzerfall:** Die Tafeln brechen nacheinander, damit das Ende auch im Chaos lesbar ist.

**Auswirkung auf Arena, Objekte oder Topologie:** Interagiert mit fremden und eigenen Projektilen sowie zerstörbaren Konstrukten im Radius.

**Synergien mit vorhandenen GRIMGE-Spells:** Es ist keine globale Domain-Expansion und keine Wiederholung von MIRROR WARD; eine lokale öffentlich sichtbare Weltregel.

**Counterplay / PvP-Balance:** Teamneutral und begrenzte Trigger pro Runde; Gegner darf das Feld meiden oder Tafeln zerstören.

**Technischer VFX-/Combat-Vertrag:** RuleZoneController mit deterministischer precedence, TTL und per-team trigger caps.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S32: Exilkorridor

**Systemtyp:** Spurförmige Kontrollzone · placement  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Lancer, Shadow, Fateweaver, Ranger  
**Mechanische Inspiration, keine Kopiervorlage:** Raumkontrolle aus Battle-Arenas, allgemein inspirierte Domain-Ästhetik.

**Visuelle GRIMGE-Identität:** Nachtblauer geschwungener Feldrand, cremefarbene Fasertexturen und unterbrochene rote Warnschlitze.

**Animation 1 | Antizipation und Setup:** Eine schmale Linie wird über den Boden gezeichnet. Auf ihr wandern mehrere Lichtkerben abwechselnd nach links und rechts.

**Animation 2 | Aktivierungs- und Release-Moment:** Die Zone teilt sich kurz in zwei senkrechte, halbtransparente Effektebenen, die wie ein Raumriss wirken.

**Animation 3 | Eigenständige Kampfwirkung:** Eintritt von Gegnern reduziert für weniger als eine Sekunde deren seitliche Ausweichgeschwindigkeit; Beams und große Projektile können sie weiterhin treffen.

**Animation 4 | Ende, Recovery und Materialzerfall:** Der Korridor wird an seinen Enden aufgetrennt und verschwindet.

**Auswirkung auf Arena, Objekte oder Topologie:** Kann neben Kisten einen besonders gefährlichen Laufweg schaffen, ohne das Terrain unpassierbar zu machen.

**Synergien mit vorhandenen GRIMGE-Spells:** Nicht FROST MIRROR GATE und kein Bann aus dem Match.

**Counterplay / PvP-Balance:** Begrenzte Breite, Block oder Jump kann die Behinderung lösen.

**Technischer VFX-/Combat-Vertrag:** LateralDragField; nie direkte Übernahme fremder Inputs.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S33: Erntezirkel

**Systemtyp:** Einmaliger Reaktor nach Treffer-Events · ground  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Berserker, Beastborn, Guardian, Reaper  
**Mechanische Inspiration, keine Kopiervorlage:** Combo-reaktive Effekte aus Action-Spielen und Dota-ähnliche Echo-Ideen.

**Visuelle GRIMGE-Identität:** Moosgoldene Schraublinien mit schwarzen Saatkernen und kleinen warmen Messingkanten.

**Animation 1 | Antizipation und Setup:** Ein mehrgliedriges Bodensiegel wird unter dem Spieler geöffnet. Die Saatkerne bleiben getrennt sichtbar.

**Animation 2 | Aktivierungs- und Release-Moment:** Eigene Schadenstreffer in begrenzter Reichweite laden bis zu drei Kerne. Der Schaden selbst wird nicht gespeichert.

**Animation 3 | Eigenständige Kampfwirkung:** Nach drei Ladungen oder nach erneuter Aktivierung wachsen drei kurze Bodenlanzen am Siegelrand und stoßen Gegner zurück.

**Animation 4 | Ende, Recovery und Materialzerfall:** Die Samen zerplatzen und hinterlassen winzige grüne Funken.

**Auswirkung auf Arena, Objekte oder Topologie:** Funktioniert besonders gut mit vielen Minions und mit Kisten, sofern die Kiste angreifbar ist.

**Synergien mit vorhandenen GRIMGE-Spells:** Nicht BLOOD MOON und keine automatische passive DPS-Aura: Spieler muss die Fläche aktiv und sinnvoll positionieren.

**Counterplay / PvP-Balance:** Maximal drei Ladungen, keine Trigger durch DoT-Ticks oder den eigenen Final-Effekt.

**Technischer VFX-/Combat-Vertrag:** DamageEventAccumulator nach eindeutiger eventId, kein Kaskadentrigger.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S34: Scherbenhandel

**Systemtyp:** Offensiv-defensiver Tausch · self  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Guardian, Oracle, Arcanist, Runeblade  
**Mechanische Inspiration, keine Kopiervorlage:** CrossCodes Offensive-/Guard-Art-Entscheidung als Mechanikvorbild.

**Visuelle GRIMGE-Identität:** Mattgoldene Waagschalen, blaues Kernfeuer und schwach rotierende Messingfugen.

**Animation 1 | Antizipation und Setup:** Zwei Waagschalen erscheinen kurz über der Waffenhand; eine hält eine leuchtende Projektionsklinge.

**Animation 2 | Aktivierungs- und Release-Moment:** Der nächste eigene Projectile-Spawn wird als Wahl gespeichert: normal schießen oder in eine Schutzplatte einschmelzen.

**Animation 3 | Eigenständige Kampfwirkung:** Bei Defense innerhalb des Zeitfensters wird der Schuss aufgelöst und stattdessen ein kurzer, richtungsabhängiger Schild erzeugt. Sonst fliegt er normal.

**Animation 4 | Ende, Recovery und Materialzerfall:** Die Waagen kippen und zerfallen nach genau einer Entscheidung.

**Auswirkung auf Arena, Objekte oder Topologie:** Hilft bei knappen Verteidigungen ohne neue Mana-Quelle.

**Synergien mit vorhandenen GRIMGE-Spells:** Keine automatische Schildverstärkung zusätzlich zum vollen Schuss; ersetzt bewusst Offense durch Defense.

**Counterplay / PvP-Balance:** Nur gewöhnliche Projectile-Events, nie Beam oder Sonderattacke; Entscheidung vor Flugstart.

**Technischer VFX-/Combat-Vertrag:** PreSpawnProjectileDecision mit genau einem exklusiven Outcome.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S35: Resonanzkorridor

**Systemtyp:** Schallgelenkte Arena-Kette · placement  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Resonant, Bard-artige Builds, Guardian, Arcanist  
**Mechanische Inspiration, keine Kopiervorlage:** Rhythmus-Skills, Dota Echo Slam als Fernanalogie, keine Skillrekonstruktion.

**Visuelle GRIMGE-Identität:** Elfenbeinsilberne Membranen, rote Resonanzadern, gebrochene halboffene Schallmuscheln.

**Animation 1 | Antizipation und Setup:** Drei aufrechte, schmale Resonanzplatten erscheinen entlang der vom Spieler gezogenen Linie.

**Animation 2 | Aktivierungs- und Release-Moment:** Ein erster kurzer Schallstoß aktiviert die Reihenfolge der Platten.

**Animation 3 | Eigenständige Kampfwirkung:** Treffen Melee-Schläge, Schockwellen oder passend getaggte Projektile eine Platte, antwortet sie mit einem kurzen gerichteten Schallpuls zur nächsten Platte.

**Animation 4 | Ende, Recovery und Materialzerfall:** Nach höchstens drei Weiterleitungen reißen die Membranen.

**Auswirkung auf Arena, Objekte oder Topologie:** Kisten können Pulse teilweise verdecken; eine Steinwand kann die Kette unterbrechen. Auf Wasser wird der Puls breiter, aber schwächer.

**Synergien mit vorhandenen GRIMGE-Spells:** Erweitert GALE SHOCKWAVE und Sound-Waffen des Resonant, statt bereits vorhandene AoE zu duplizieren.

**Counterplay / PvP-Balance:** Alle Platten sichtbar; Gegner kann sie zerstören oder die Kette unterbrechen.

**Technischer VFX-/Combat-Vertrag:** ResonanceGraph, maximal drei Events pro Kette und eindeutige Event-IDs.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

### S36: Weltnaht

**Systemtyp:** Bewegliche Risslinie · placement  
**Dauer / Zeitfenster:** Einmalig / offen  
**Spielerkompatibilität:** Universell, unabhängig von Waffenklasse; primäre Klassen- oder Elementar-Fokusform bleibt aktiv.  
**Klassen mit besonders interessanten Builds:** Fateweaver, Lancer, Arcanist, Berserker  
**Mechanische Inspiration, keine Kopiervorlage:** BG3-/Divinity-Terrain-System, Dota-Fissure als abstrahierte Raumkontrolle.

**Visuelle GRIMGE-Identität:** Schwarzes vulkanisches Glas mit smaragdgrünem Kernlicht, doppelte gezackte Außennaht.

**Animation 1 | Antizipation und Setup:** Der Spieler zieht eine begrenzte gebogene Linie durch den Boden. Dunkle Bruchstücke wandern in entgegengesetzte Richtungen an ihren Rändern.

**Animation 2 | Aktivierungs- und Release-Moment:** Eine flache Risswelle rollt entlang der Linie, ohne eine komplette Bodenplatte aus dem Level zu entfernen.

**Animation 3 | Eigenständige Kampfwirkung:** Jede Kante wirkt nur einmal: von links kommende Gegner werden leicht nach rechts gedrückt, Projektile werden entlang der Naht kurz seitlich verformt, leichte Objekte können umkippen.

**Animation 4 | Ende, Recovery und Materialzerfall:** Das Gebiet heilt von den Enden zur Mitte und hinterlässt für eine Sekunde winzige Nachglutadern.

**Auswirkung auf Arena, Objekte oder Topologie:** Kisten, Steinpfeiler und Flüssigkeitsoberflächen reagieren auf die lokale Verschiebung. Destruktible Props erhalten nur definierte Impulse.

**Synergien mit vorhandenen GRIMGE-Spells:** Anders als SEISMIC SLAM: der Spieler gestaltet eine Weltlinie, die Richtung und Reaktion von Objekten beeinflusst, nicht bloß Schaden plus Säule.

**Counterplay / PvP-Balance:** Gut sichtbarer Verlauf vor Auslösung, maximal eine Risslinie pro Spieler.

**Technischer VFX-/Combat-Vertrag:** SplineBasedForceField mit desynchronisierter VFX-Fassade und deterministischer Physik.

**Qualitätsregel:** Der Avatar selbst wird nicht ersetzt. Wirkungen erscheinen als konturgebundene Material-Layer, ausgearbeitete Attachments oder eigenständige räumliche Effektinstanzen. Bänder, Platten, Fugen und Lichtkanten besitzen sichtbare Textur, Schattierung, perspektivische Tiefe, Animationsträgheit und getrennte Hitboxen. Ein bloßer Ring, eine Box oder eine primitive Lichtkugel genügt nicht.

---

# 5. Spotlight: Himmelsregent als vollständig spielbare Schwebe-Spezialrune

Die Rune `Himmelsregent` setzt die vom Nutzer gewünschte Fantasy am präzisesten um: **Der Spieler hebt wirklich ab, behält denselben Grundcharakter und kontrolliert vom Schwebezustand aus mehrere Kampfformen.** Sie bleibt eine zeitlich begrenzte **Signature Stance**. Sie ersetzt weder Fokus-Transformation noch die gewählte Klasse.

## 5.1 Aktivierung und physikalische Pose

1. **0,0–0,2 s:** Drücken/Auslösen der geslotteten Spezialrune. Ein gebrochener Lichtkranz entsteht nahe des Kopfankers; die Füße sind noch geerdet.
2. **0,2–0,7 s:** Der Avatar spielt seine normale Jump-/Levitate-geeignete Pose und erhält eine echte Höhe über der World-Ground. Die Höhe wird aus `feet_world` und `airborne_height` geführt, nicht durch bloßes Verschieben der Bounding Box.
3. **Ab 0,7 s:** Der Spieler schwebt relativ stabil, bewegt sich horizontal mit reduzierter Beschleunigung. Shadow-/Ground-Anchor bleibt als transparente, kleine und stets aktualisierte Projektionsmarkierung sichtbar.
4. **8–9 s später:** Energieplatten brechen unter den Füßen auseinander. Ein kontrollierter, physikalisch echter Abstieg mit eigener Fallphase und anschließendem Ground-Contact wird ausgelöst.
5. **Verbindliche Regeln:** Keine Unverwundbarkeit. Vertikale Angriffe, Luft-Hitboxen, Tower-Safety-Zonen und Grabs müssen den Höhenwert respektieren. Während des Endes dürfen Treffer Recovery oder Forced Landing auslösen.

## 5.2 Zwei, und nur zwei, Heavy-Stufen je Richtung

| Eingabe im Schwebezustand | Kurz / vorher Full-Threshold losgelassen | Voll / nach Full-Threshold losgelassen |
|---|---|---|
| **Forward Heavy** | **Sternennadeln:** Zwei sehr schnelle, wenig lenkende Kristallspitzen werden im Zickzack direkt nach vorn geschickt; sie erzeugen zwei kleine Kreuz-Einschläge. | **Wanderchor:** Drei getrennte Suchschollen steigen erst nach oben, klappen ihre Leuchtkanten aus und verfolgen nacheinander sichtbare Ziele. Die Flugbahnen dürfen Wände nicht ignorieren. |
| **Up Heavy** | **Stützstoß:** Kurze, schmale Repulsionswelle aus den Schulterschollen, die ein nahes Luftziel nach oben drückt. | **Himmelsklammer:** Zwei weit auseinandergezogene Schollen entstehen oberhalb der markierten Zone, schließen sich auf kleiner Fläche und heben einen Gegner kurz hoch, danach eigene Entladung. |
| **Down Heavy** | **Bodenstempel:** Ein schmaler Kraftstoß erreicht senkrecht unter dem tatsächlichen Schattenpunkt den Boden und bricht die Guard-Haltung eines kleinen Bodengegners an. | **Fallgericht:** Ein asymmetrischer Kompressionskreis öffnet sich um den Bodenanker, verdichtet leichte Gegner und entlädt sich in eine radiale, begrenzte Bodenwelle. |

**Grenzfall Charge:** Kein Tap-Short plus zusätzliches Full. Beim Loslassen wird genau **eine** Aktion ausgewählt. Buff bleibt weiterhin aktiv, bis seine Zeit endet.

## 5.3 Sprint, Defense, Grab und Jump während des Hover-Modus

- **Sprint:** Wechsel in einen kurzen horizontalen Gleitimpuls, dabei hängen die Schollen kurz hinter der tatsächlichen Bewegungsrichtung her. Es ist ein Dash im Luftzustand, kein Beast Rush.
- **Sprint + Heavy:** Eine vordere Scholle klappt zur breiten Stoßkante auf. Der Spieler jagt auf kurzer Flugbahn nach vorn und setzt am Ende eine impulsförmige Druckwelle frei.
- **Defense:** Drei beleuchtete Schollen schieben sich vor die Brust. Treffende Projektile kippen die Schutzplatten nach innen. Perfect Block stößt ein einziges absorbiertes Kleinprojektil als neutralisierten Lichtkeil zurück.
- **Defense + Down (Grab):** Nur bei gültigem nahegelegenem Gegner. Eine kurze, nach unten gerichtete Klammer aus zwei Schollen schließt sich um dessen Schulterraum. Die Wirkung zieht den Gegner etwas zum Bodenanker und lässt ihn fallen. Kein Grab über den ganzen Screen.
- **Jump:** Erneutes Jump-Drücken erzeugt **keinen endlosen Doppelsprung**. Es kann einen kleinen, begrenzten Höhenimpuls erzeugen, wenn im Bewegungsmodell erlaubt; sonst löst es nur eine gut erkennbare Flatterbewegung der Schollen aus.
- **Spezielle Interaktion:** Ein bereits aktivierter Klassen- oder Elementar-Fokus-Sprite darf erhalten bleiben; der Schwebe-VFX-Vertrag bindet sich an dessen aktuelle Alpha-Maske und Anchor-Sockets.

## 5.4 Technische Implementierungskontrolle

```yaml
signature_rune:
  id: himmelsregent
  category: signature_stance
  is_primary_focus_transformation: false
  replaces_character_sprite: false
  focus_meter_consumption: false
  duration_seconds_suggestion: 9
  input:
    cast: existing_spell_slot
    heavy_charge_full_threshold_seconds: 1.2
    release_selection: short_or_full
    direction: [forward, up, down]
    extra: [sprint, sprint_heavy, defense, defense_down_grab, jump]
  movement:
    enable_hover_height: true
    physical_collision: true
    ground_shadow_anchor: true
    float_is_not_invulnerable: true
    must_obey_castle_and_world_bounds: true
  visual:
    base_sprite_alpha_mask: current_frame
    attach_to: [root, head, shoulders, weapon_hand, feet_world]
    splines_and_shards: animated_textured_vfx
    world_effects: independent_instances
  combat:
    projectiles_obey_line_of_sight: true
    max_full_forward_homing_targets: 3
    max_continuous_lock_control: short_fixed_window
    no_secondary_full_attack_duplication: true
    server_authoritative_events: true
```

---

# 6. Katalog-Matrix: vorhandene Runen und neue Sondermechaniken

Diese Matrix definiert **Interaktionsideen**, nicht zusätzliche automatisch freigeschaltete Rezepte.

| Vorhandener Spell oder Weltzustand | Neue Spezialrune | Kombinationsidee | Balancing-Schutz |
|---|---|---|---|
| `IGNIS FIREBALL` | `Glutpumpe` | trifft das Druckobjekt, lädt Hitze auf | ein Fireball nur einmal pro Objektladung |
| `AQUA` / Eisfelder | `Flutschiene` | Teile des Wasserpfads frieren zu verlangsamenden Schienen | nie gesamte Karte gleichzeitig einfrieren |
| `FULGUR` / `THUNDER LANCE` | `Polarisationswerk` | Magnetreaktor wird stärker, sofern Projectile materialTag erlaubt | keine automatische Umleitung rein magischer Beams |
| `STONE WALL` | `Runenschmiede` | ein eigenes Wandsegment wird zu Schild oder Schläger | Material-Tradeoff: Wandsegment ist danach weg |
| `CONSTRUCT BULWARK` | `Runenschmiede` | für kurze Zeit Deckung als Werkzeug einsetzen | nur eine Konversion pro Rune |
| `GRAVITY LIFT` | `Himmelsregent` | angehobene Ziele können von oben getroffen werden | kein additiver Doppel-Stun; Shared CC cap |
| `SOUL SEEKERS` | `Raumfalter` | homing Flugbahn kurz über die Raumfalte biegen | turnRate und LoS bleiben beschränkt |
| `MIRROR WARD` | `Prismenhalter` | kann Gegenprojektile zurückwerfen, die aus dem Prisma stammen | erneute Capture-Ketten nach Ownership-Wechsel deckeln |
| `FROST MIRROR GATE` | `Rissweiche` | Held nutzt Gate; Projektil nutzt gesonderte kleine Risse | keine Rekursion oder sofortige Schuss-Endlosschleife |
| `SEISMIC SLAM` | `Splittergarten` | erweckt einzelne Kristallblüten, die Splitter ausstoßen | Trefferlimit pro Blüte |
| `METEOR CATACLYSM` | `Glasfeld` | großer Impact zerstört Glasfeld sektionsweise | nicht volle zweite Explosion jeder Platte |
| `SANDSTORM BASTION` | `Schwebende Bastion` | zwei unterschiedliche Defenses überlappen | nur stärkste Reduktion oder Diminishing Returns |
| `SHADOW STOMPER` | `Sekundenpfand` | hält Ziel an einer bereits gespeicherten Position | CC-Stacking-DR für wiederholte Holds |
| `SHADOW DOPPELGANGER` | `Jägerglocke` | der Doppelgänger darf markierte gegnerische Summons priorisieren | nur Gegnerpriorität, keine neue NPC-Vermehrung |
| `REVENANT CALL` | `Jägerglocke` | gebundener Revenant beschützt eine taktische Zone | Team-/Owner-Check, Summon-Cap unverändert |
| `INFERNO BEAM` | `Strahlenweber` | starker Feuerstrahl wird in zwei kurze, schwächere Strahlen aufgeteilt | Summe der Strahl-DPS gedeckelt |
| `GLACIAL RAY` | `Strahlenweber` | breitere Verlangsamung auf zwei kleinere Korridore verteilt | kein doppeltes Freeze-Stacking |
| `NULL RAY` | `Strahlenweber` | beide schwachen Ausgänge geben je nur Teil-Pull | Pull-Cap, nicht zwei Vollzugriffe |
| `SOLAR ORB` | `Splittergarten` | Solarhitze trocknet Glasblüten und verändert Lichtstreuung | Himmelsfeld-Regel bleibt nur einmal aktiv |
| `LUNAR ORB` | `Glasfeld` | kaltes Mondlicht verändert Bodenreflexionen | nur sichtbarer Material-/kleiner Regelmodifikator |
| `EIDOLON MANTLE` / V3 `Arkengestell` | `Himmelsregent` | große Manifestation bleibt hinter dem wirklich schwebenden Sprite | Overlay- und Buff-Priorität klären; nicht zwei exklusive Specials im Deck behaupten |

---

# 7. Klassen-Builds mit 18 offiziell definierten Klassen

Das beigefügte `class_concept.md` enthält **18** benannte Klassen. **Warlord** kommt darin bisher nicht als eigenständige Klasse vor; **Lancer** ist die definierte Spear-/Glaive-Klasse. Jede Rune bleibt klassenunabhängig, hier sind nur interessante Synergien aufgeführt.

| Klasse | Besonders passende Spezialrune | Warum im Kampf interessant |
|---|---|---|
| Guardian | Scherbenhandel / Schwebende Bastion | wechsel zwischen Angriff und gezielter Schutzentscheidung |
| Berserker | Erntezirkel / Weltnaht | viele Treffer laden reaktives Terrain auf; schwere Impact-Führung |
| Bladedancer | Schwarmprotokoll / Nachhallarchiv | schnelle Trefferfolgen erzeugen begrenzte Folgeaktionen |
| Ronin | Schicksalsnadel / Rücksprungnadel | Timing, präziser Treffer und vorbereitete Rückpositionierung |
| Lancer | Schwerelosband / Seismischer Steg | Sweet-Spot-Reichweiten kontrollieren und Luftziele verschieben |
| Shadow | Spiegelversatz / Rücksprungnadel | flankieren und einen kalkulierten Ausstieg halten |
| Ranger | Aureolenschwarm / Rissweiche | Projektile strukturieren, Deckung umgehen ohne LoS-Regeln zu verlieren |
| Monk | Himmelsregent / Kometenträger | erweiterte Air-Combo-Bewegung und echter 2.5D-Luftkampf |
| Reaper | Erntezirkel / Bruchkoloss | Gegner bündeln und kontrolliert in vorbereitete Impacts drücken |
| Runeblade | Nachhallarchiv / Runenschmiede | Weapon-Rune-Weaving und bewusster Trade von Deckung gegen Angriff |
| Arcanist | Strahlenweber / Himmelsregent | Strahl-Topologie und alternative Schwebeschuss-Bereiche |
| Occultist | Schicksalsnadel / Stillfuge | markierte Gegner und verzögerte Kontrolle |
| Oracle | Schwebende Bastion / Scherbenhandel | Team-Defense durch Bewegung und offensive Opferentscheidung |
| Resonant | Resonanzkorridor / Sekundenpfand | Klangpulse wandern zwischen Objekten und verzögern gegnerische Vorstöße |
| Spiritbound | Aureolenschwarm / Echofamulus | externe Manifestationen ohne zusätzliche volle Summon-AI |
| Beastborn | Kometenträger / Jägerglocke | Sprungkontrolle und taktische Summon-Priorität |
| Trickster | Raumfalter / Rissweiche | vorab sichtbare, aber ungewöhnliche Angriffsachsen |
| Fateweaver | Runengericht / Weltnaht | lokale Regeln und World-Objekte statt reine Schadensmagie |

## 7.1 Konkrete Build-Skizzen

**A: Levitation Artillery**  
Klasse Arcanist + frei gewählte primäre Klassen- oder Elementarfokusform + Special Himmelsregent + Runen `VOID`, `FULGUR`, `VENTUS`. Die Basisspells dienen weiterhin der normalen Bodenphase; Himmelsregent eröffnet ein **kurzes Fenster aus der Luft**. Gegenspiel: Anti-Air, volle LoS und riskante Landung.

**B: Geometrischer Trickshot**  
Klasse Ranger + Runen `IGNIS`, `VOID`, `LUX` + Special Rissweiche. Eigene Projektilangriffe können sichtbare Kanten wechseln, während die Gegner das Portal zerstören oder abdecken dürfen. Kein zusätzlicher Fokusverlust.

**C: Forged Fortress**  
Klasse Guardian + Runen `KONSTRUKT`, `TERRA`, `AQUA` + Special Runenschmiede. Baue eine Deckung, verwandle später ein eigenes Segment in einen einmaligen starken Schild- oder Nahkampfimpuls. Das ist ein echter Risiko-/Ressourcentradeoff.

**D: Temporal Precision**  
Klasse Ronin + Runen `UMBRA`, `FULGUR`, `LUX` + Special Schicksalsnadel oder Rücksprungnadel. Genau ein Signature-Effekt wird ins Deck gewählt; die andere Variante bleibt alternative Build-Option.

**E: Living Battlefield**  
Klasse Fateweaver + Runen `TERRA`, `IGNIS`, `AQUA` + Special Glutpumpe oder Splittergarten. Reaktion bestehender Spells mit erzeugten Objekten, statt eines weiteren generischen AoE.

**F: Sound Engineering**  
Klasse Resonant + Runen `VENTUS`, `FULGUR`, `KONSTRUKT` + Special Resonanzkorridor. Waffenrhythmus und Schockwellen verbinden sich mit drei vorbereiteten Resonanzplatten.

---

# 8. Technische Realisierung für GRIMGE ohne neue Transformations-Sprites

## 8.1 Visuelle Qualitätsabnahme

Alle **zusätzlichen** Effekte verwenden VFX-/Attachment-Systeme. Basisklassen und primäre Fokusformen dürfen gemäß vorhandener GRIMGE-Regel eigene Sprite-Animationen besitzen. Keine der **neuen Spezialrunen** erfordert jedoch einen zusätzlichen Transformations-Charaktersprite.

Verbindliche Look-Vorgaben:

- **Contour statt Rectangle:** `alphaMask(currentFrame)` und möglichst SDF-Distance-Rim. Kantenstrahlen beginnen an echten Konturstellen bzw. semantischen Ankern, nie an einem rechteckigen Sprite-Bounds-Rand.
- **Character-Sockets:** Kopf, Schultern, Arme, Waffenhand, Wirbelsäule, Füße. Für individuell anders gebaute Figuren sind kleine Anchor-Profiles ausdrücklich erlaubt.
- **World-Objekte:** Platten, Splitterblumen, Portale, Projektil-Prismen und Schallwände sind unabhängige Weltinstanzen. Sie besitzen nicht nur VFX, sondern saubere Collider und Lifecycle-Events.
- **Materialästhetik:** geschichtete Innenzeichnung, Pixel-Schattenkanten, gebrochene Lichtadern, Tiefe, perspektivische Verschiebung, kontrolliertes Glow und zeitliche Trägheit. Primitive Kreise/Rechtecke nur als **unsichtbare Berechnungsgeometrie**, nicht als fertiges Design.
- **State-Wechsel:** Idle, Run, Jump, Heavy Short, Heavy Full, Defense, Perfect Block und Grab können die Attachments steuern. Nie komplette Charakter-Spritesheets für Specials neu zeichnen.
- **VFX-Intensität:** Die Qualität der vorhandenen Risswild- und Arkengestell-Mockups ist die Zielklasse. Die Lesbarkeit von Figuren, Projektilen, Towern, Gegner-Telegraphen und HUD hat jedoch Vorrang.

## 8.2 Empfohlene Controller

```yaml
systems:
  signature_rune_manager:
    knows: [loadout, slot_inventory, drawn_glyph_quality, mana_bound, cooldown, active_signature]
    rules: [special_not_fusable, own_timer, no_primary_focus_override]
  combat_event_bus:
    event_ids: true
    dedupe: true
    supports: [AttackStart, ChargeReady, AttackRelease, Hit, Block, PerfectBlock, ObjectBreak, SurfaceChanged]
  world_prop_manager:
    supports: [destructible, owner, team, material_tags, health, expiry, world_height]
  reactive_surface_manager:
    kinds: [fire, water, frost, lava, charged, steam, shadow, glass, runic_field]
    stacking_priority: explicitly_defined
  projectile_pipeline:
    supports: [reflectable, capturable, blockable, clashable, redirectable, split_node, bounded_homing, portal_transit]
    guardrails: [max_redirects, max_children, per_parent_damage_budget, no_recursive_specials]
  height_aware_combat:
    positions: [lane_x, lane_depth_z, altitude_y]
    required_for: [hover, launcher, airborne_grab, anti_air, grounded_attack]
  visual_fx:
    uses: [current_sprite_alpha, contour_mask, sockets, layered_textured_attachments, world_vfx_instances]
    never_needs_new_special_character_sprites: true
```

## 8.3 Richtungslogik und getrennte Heavy-Stufen

- Klassische **einmalige Spezialrunen** werden über ihren bestehenden Spell-Slot ausgelöst. Sie müssen deshalb **keine sechs eigenen Heavy-Angriffe** bekommen.
- **Temporäre Signature Stances**, beispielsweise Himmelsregent, dürfen während ihrer kurzen Dauer Heavy-Richtungen modifizieren.
- Je Richtung existieren nur **Short** und **Full**. Die Entscheidung erfolgt beim Loslassen. Kein dritter Charge-Zustand.
- Hat eine Fokusform bereits eigene Full-Heavies, ersetzt ein spezieller Full-Override für seine aktive Zeit **den Treffer-/Spell-Effekt**, anstatt eine zweite vollständig schadensberechnete Fähigkeit oben drauf zu legen. Der Bewegungs-Sprite der Hauptform bleibt bestehen.
- Guard + Down als Grab erfordert echte Nähe, vorhandenen Gegner und überprüfte Reichweite und Höhe. Kein Grab über eine bloße Rechtecküberschneidung.

## 8.4 Qualitäts-, Kampf- und Netzwerk-Schutzmechanismen

1. Maximalzahl von aktiven WorldProps, homing Projectiles, Attack-Echos und Split-Beams pro Spieler definieren.
2. Crowd-Control-Diminishing-Returns und Immunitätsfenster für Boss- und PvP-Gegner vorsehen.
3. Treffer aus Auren, Spiegeln oder Echoes dürfen sich nicht gegenseitig mehrfach pro Frame triggern.
4. Pixel-Art-VFX über separate LOD-Profile auch bei vielen Minions lesbar halten: weniger Partikel, **nicht** weniger Materialdetail am Haupt-Effekt.
5. Grenzfälle mit Mauern, Castle-Toren, Türmen, Hindernissen, Mounts und Höhenunterschieden zuerst prototypisch abtesten.
6. Netzwerk: PvP-Wirkung serverautoritativ, VFX prädiktiv, Treffer und Gegenmaßnahmen deterministisch rekonstruierbar.
7. Testet man zuerst im Web-Prototyp, muss das System einen funktionalen Canvas-2D-Fallback für Alpha-Contour-Masks, Segment-VFX und Hitboxen besitzen.

---

# 9. Bewertung, Aufwand und empfohlene Reihenfolge

| Kandidat | Spielerischer Mehrwert | Implementierungsaufwand | Risiko | Empfehlung |
|---|---|---|---|---|
| Himmelsregent | sehr hoch, neue Luft-Spielweise | hoch | Anti-Air, Touch, Z-Kollision | Vertical Slice 1 |
| Splittergarten | sehr hoch, dynamische Weltobjekte | mittel | Prop-Spam | Vertical Slice 2 |
| Raumfalter | hoch, Geschossgeometrie | mittel-hoch | Loops, LoS | Vertical Slice 3 |
| Nachhallarchiv | hoch, belohnt Timing | mittel | rekursive Events | Vertical Slice 4 |
| Runenschmiede | sehr hoch, Bauelemente werden Ressourcen | hoch | viele Props | Vertical Slice 5 |
| Strahlenweber | sehr hoch, nutzt vorhandene sechs Beam-Spells | hoch | Damage-/Clash-Budget | Vertical Slice 6 |
| Jägerglocke | hoch im Castle Siege | gering-mittel | AI-Prioritäten | schneller Test |
| Rücksprungnadel | hoch für Duelle | gering-mittel | Teleportkollision | schneller Test |
| Schicksalsnadel | mittel-hoch | gering-mittel | Event-Dedup | schneller Test |
| Resonanzkorridor | hoch für Resonant | mittel | Audio/Chain | späterer Showcase |

## 9.1 Kreative Priorität

Die wirklich innovative Kombination entsteht nicht dadurch, dass 36 Specials gleichzeitig sichtbar sind. Entscheidend ist eine **kleine Menge wechselseitiger Weltregeln**, die in vielen Builds wiederverwendbar ist. Daher würde ich vor dem Content-Massenaufbau zuerst `WorldProp`, `HeightAwareCombat`, `ProjectilePipeline` und `ReactiveSurface` implementieren. Diese vier Controller tragen später den größten Teil des Katalogs.

---

# 10. Herkunft, Rechercheabdeckung und IP-Abgrenzung

**Wichtig zum Umfang:** Die Recherche ist eine gezielte mechanische Analyse exemplarischer bestätigter Systeme aus mehreren Games. Sie ist **keine vollständige Einzelprüfung aller Anime-Folgen, jedes Skills und jeder Version aller Referenzspiele**. Anime-Tropen wie „schwebender Psy-Kämpfer“, „spirituelle Zusatzarme“, „Raumdomäne“ und „Zeitnachbild“ sind an dieser Stelle kreative Abstraktionen, sofern kein konkret geprüfter Clip oder Spieltext genannt wird.

**Big Kid Nation:** Die offizielle Website bestätigt Pokémon Arena 2D als in Arbeit befindliches Fanprojekt. **Der genaue Mewtu-Moveset-Clip wurde nicht unabhängig ausgelesen und ist nicht als belegte Faktenquelle behandelt.** Die konkrete Schwebefantasie kommt aus der Nutzerbeschreibung.

**Schutz vor zu großer Nähe:** Keinen bestehenden Charakternamen, keine benannte Signature-Attack, keine unverwechselbare Kostüm-/Waffensilhouette, keine exakte Attack-Choreografie, keine Originalgrafik und keinen Originalton übernehmen. Technische Mechaniken als Grundidee sind kein Freibrief für nahezu identische audiovisuelle Gesamtgestaltung. Vor einer Vermarktung ist ein abschließender Asset- und IP-Review sinnvoll.

## 10.1 Überprüfbare öffentliche Referenzen

| Kürzel | Quelle | Aussage/Verwendungszweck | URL |
|---|---|---|---|
| `BKN` | Big Kid Nation, Pokémon Arena 2D, offizieller Projektstatus | Existenz eines laufenden Fanprojekts belegt; konkrete Mewtu-/Schwebeanimation nicht belegt. | https://www.bigkidnation.com/ |
| `XCART` | CrossCode Combat Arts | Arts nach Melee, Throw, Dash, Guard und Charge-Dauer. | https://crosscode.fandom.com/wiki/Combat_Arts |
| `XCELEM` | CrossCode Element Modes | Elementarmodi und Elemental-Load-Begrenzung. | https://crosscode.fandom.com/wiki/Elements |
| `XCGUARD` | CrossCode Guard Mechanics | Perfect Guard, Guard Counter und aktionsgebundene Effekte. | https://crosscode.fandom.com/wiki/Guarding |
| `LOLAS` | League of Legends: Aurelion Sol | Astralflug, Singularität, astronomische Raumkontrolle. | https://www.leagueoflegends.com/de-de/champions/aurelionsol/ |
| `LOLORI` | League of Legends: Orianna | Fernsteuerbarer Effektkörper mit Angriff und Schutz. | https://www.leagueoflegends.com/de-de/champions/orianna/ |
| `LOLHWEI` | League of Legends: Hwei | Mehrere Skillfamilien und Folgeeffekte nach Zaubertreffern. | https://www.leagueoflegends.com/en-us/champions/hwei/ |
| `LOLBARD` | League of Legends: Bard | Passage, Support, temporäre Stasis-Ästhetik. | https://wildrift.leagueoflegends.com/en-us/champions/bard/ |
| `LOLEKKO` | Wild Rift: Ekko | Vorbereitete Zeitfelder und konditionale Auslösung. | https://wildrift.leagueoflegends.com/de-de/champions/ekko/ |
| `LOLTALI` | Wild Rift: Taliyah | Terrain-Ausnutzung, Bewegungsachsen und gewirktes Gelände. | https://wildrift.leagueoflegends.com/en-us/champions/taliyah/ |
| `OVSIG` | Overwatch: Sigma | Projektile, bewegliche Barriere, Schwerkraftkonzept. | https://overwatch.blizzard.com/de-de/heroes/sigma/ |
| `OVMEI` | Overwatch: Mei | Temporäre Wände und Gelände als Gameplay-Objekte. | https://overwatch.blizzard.com/en-us/heroes/mei/ |
| `DIVMAN` | Divinity: Original Sin 2, Spielhandbuch | Elementarflächen beeinflussen einander; Wasser/Blitz/Feuer. | https://dlassets-ssl.xboxlive.com/public/content/6778dff3-8d6c-4615-a8a3-1f1770057d09/GameManual/9e540603-b9bb-44a0-83cd-bb98f1d40b32/nb-NO/index.html |
| `BG3SURF` | BG3 Wiki: Surfaces | Wasser, Eis, Feuer, elektrische Fläche und Zustandsreaktionen. | https://bg3.wiki/wiki/Surface |
| `DOTA` | Dota 2: Dark Seer / Rubick und Earthshaker Skillnamen | Vakuum, Spiegel, Echo sowie taktische Kontrolle, als abstrakte Muster. | https://www.dota2.com/workshop/builds/view?embedded=workshop&publishedfileid=1789299803 |
| `LOLV` | League of Legends: Vel Koz, Plasma Fission | Split-/Richtungswechselmechanik eines Projektils. | https://na.leagueoflegends.com/en/featured/mid-season-magic |

---

# 11. Schlussfolgerung

GRIMGE sollte Spezialrunen nicht nach bekannten Figuren, sondern nach **neuen Kampfhandlungen** kuratieren. Die interessantesten Signatures lassen den Spieler **schweben und kontrolliert schießen**, **einen Angriff speichern und wiedergeben**, **Deckung umbauen**, **Objekte im Feld nutzen**, **Projektile umleiten** oder **lokale Regeln für alle setzen**. Das erweitert die bestehenden 55 Spells, ohne ihre Kernmechaniken als 36 neue Farben zu duplizieren.

Der Designkatalog ist bewusst ein **Angebotsraum**. Nicht alle 36 Ideen sollten blind ins Grimoire übernommen werden. Für jedes Release müssen visuelle Abnahme, Mobile-Steuerung, Gegenwehr, Netzwerk-Konsistenz, Klassenneutralität und Synergien mit der primären Fokus-Transformation getestet werden.
