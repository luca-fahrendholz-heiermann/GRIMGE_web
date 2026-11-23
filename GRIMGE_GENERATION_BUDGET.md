# GRIMGE – Budget für bezahlte Erzeugung

**Obergrenze: 20 USD.** Das ist eine Vorgabe an die Arbeitsweise, **keine technische Sperre** beim Anbieter. Ob bei
Higgsfield ein Ausgabenlimit oder automatisches Nachkaufen eingestellt ist, wurde nicht geprüft und nicht verändert –
bitte im Higgsfield-Konto selbst kontrollieren.

## Stand

| | Wert |
|---|---|
| Bestätigte Ausgaben | **0,00 USD** |
| Geschätzte offene Ausgaben | 0,00 USD |
| Restbudget | **20,00 USD** |
| Higgsfield-Guthaben (geprüft 11. Nov 2026, vor dem ersten Auftrag) | 10 Credits (Registrierungs-Guthaben), Plan laut Konto: `ultra` |
| Verbrauchte Credits aus dem Guthaben | **8,25** (33 Bilder); Kontostand geprüft: 1,75 Credits |

## Was geprüft wurde

- `balance`: 10 Credits. `transactions`: ein Eintrag, „Registration Credits +10“ vom 10. Nov 2026. Keine Ausgaben.
- `models_explore`: Für GRIMGE passt vor allem **AutoSprite Animation** (`autosprite`): macht aus einem Figurenbild ein
  Sprite-Sheet (Vorlagen `idle`, `walk`, `run`, `attack`, `jump` oder eigene; Stufen `turbo` / `pro` / `max`;
  Bildgröße 32–512 px; 2–64 Bilder). Außerdem Bildmodelle mit transparentem Hintergrund (z. B. Seedream 5.5).

## Preise

- Preise lassen sich vor jedem Auftrag in Credits abfragen (Parameter `get_cost`). Der Wert eines Credits in USD ist nicht
  bestätigt; solange nur das vorhandene Guthaben verbraucht wird, entstehen keine zusätzlichen Kosten.
- Der erste spielbare Meilenstein kam ohne Erzeugung aus.

## Plan für den Einsatz (erster Test vom Nutzer freigegeben am 11. Nov 2026: „kostenloses 3-Tage-Abo“)

| Vorhaben | Nutzen | Kosten |
|---|---|---|
| 1 Test mit AutoSprite, Stufe `turbo`: Xame `idle` oder `walk`, 8–12 Bilder | zeigt, ob Stil und Figur erhalten bleiben, bevor mehr ausgegeben wird | läuft: Xame `walk`, 8 Bilder, 2 Credits |
| danach, falls brauchbar: Xame `walk`, `attack`; ein Gegner-Champion | größte sichtbare Lücke im Spiel | nach dem Testergebnis schätzen |

Nicht vorgesehen: Trailer, Werbevideos, Konzeptbilder für ungebaute Kapitel.

## Protokoll

| Datum | Vorgang | Geschätzt | Bestätigt | Rest |
|---|---|---|---|---|
| 11. Nov 2026 | Kontostand, Transaktionen und Modellliste abgefragt (kostenlos) | 0 | 0 | 20,00 USD |
| 11. Nov 2026 | Preis abgefragt: AutoSprite, Xame „walk“, Stufe turbo, 8 Bilder à 256 px = **2 Credits** | 2 Credits | – | 20,00 USD |
| 11. Nov 2026 | AutoSprite-Auftrag gestartet (Job 6b691ed5…) – **fehlgeschlagen**, nichts abgebucht (Kontostand danach 10) | 2 Credits | 0 | 20,00 USD |
| 11. Nov 2026 | Preise abgefragt: Hintergrund 21:9 mit `gpt_image_2_6` = 0,25 Credits; `z_image` 16:9 = 0,15; `seedream_5_5` 2k = 3,5 | – | – | 20,00 USD |
| 11. Nov 2026 | Szene „Kareth“ (Ruinenhalle, Mission 1), `gpt_image_2_6`, 1 Versuch | 0,25 Credits | 0,25 Credits | 20,00 USD |
| 11. Nov 2026 | Szene „Abgrund-Arena“ (Mission 3), 1 Versuch | 0,25 Credits | 0,25 Credits | 20,00 USD |
| 11. Nov 2026 | Szene „Gluttiefe“ (Mission 5), 1 Versuch | 0,25 Credits | 0,25 Credits | 20,00 USD |

| 11. Nov 2026 | Szene „Aschenfeste“ (Mission 4) – das Burg-Bild umgestaltet, Aufbau erhalten | 0,25 Credits | 0,25 Credits | 20,00 USD |
| 11. Nov 2026 | Szene „Halvar“ (Mission 2) – das Burg-Bild als Sturmnacht | 0,25 Credits | 0,25 Credits | 20,00 USD |
| 11. Nov 2026 | Kapitel-Karte | 0,25 Credits | 0,25 Credits | 20,00 USD |
| 11. Nov 2026 | Requisiten-Bogen „Kareth“ (6 Stück, transparent) | 0,25 Credits | 0,25 Credits | 20,00 USD |
| 11. Nov 2026 | Requisiten-Bogen „Gluttiefe“ (6 Stück, transparent) | 0,25 Credits | 0,25 Credits | 20,00 USD |

| 11. Nov 2026 | Xame „Gehen“ (6 Posen) mit `gpt_image_2_6` und seinem Sprite als Vorlage | 0,25 Credits | 0,25 Credits | 20,00 USD |
| 11. Nov 2026 | Xame „Speerangriff“ (5 Posen), ebenso | 0,25 Credits | 0,25 Credits | 20,00 USD |

| 11. Nov 2026 | Vier Gegner-Bögen (Leerenritter, Leerenräuber, Leerenhexer, Glutfürst), je 7 Posen, Thesen als Stilvorlage | 1,0 Credits | 1,0 Credits | 20,00 USD |

| 11. Nov 2026 | Fünf Invasions-Gegner (Leerenkoloss, -schütze, -fechter, Glutakolyth, Frostschamane) und zwei Verbündete (Wächter, Späherin), je 7 Posen | 1,75 Credits | 1,75 Credits | 20,00 USD |
| 11. Nov 2026 | Xame: Sprung, Blocken, Treffer, Zaubern, Niederlage (5 Posen) | 0,25 Credits | 0,25 Credits | 20,00 USD |
| 11. Nov 2026 | Thesen: Gehen (6), Faustkampf (6), Sprint / Sprung / Blocken / Treffer / Zeichnen / Niederlage (6) | 0,75 Credits | 0,75 Credits | 20,00 USD |

| 11. Nov 2026 | Thesen: sechs Waffenschwung-Posen mit leerer Faust (die Waffe setzt das Spiel an die Hand) | 0,25 Credits | 0,25 Credits | 20,00 USD |

| 11. Nov 2026 | Fokus-Form: Gehen (6), Waffenschwung-Posen (6), Einzelposen (6) | 0,75 Credits | 0,75 Credits | 20,00 USD |

| 11. Nov 2026 | Basis: hoher Saal, sechs Stationen (Dummy, Runen-Altar, Kartentisch, Spiegel, Lesepult, Tor), sechs Rüstungs-Ständer | 0,75 Credits | 0,75 Credits | 20,00 USD |
| 12. Nov 2026 | Basis: neuer Saal mit tiefem Boden (ersetzt das erste Saalbild) | 0,25 Credits | 0,25 Credits | 20,00 USD |

Alle Credits stammen aus dem Registrierungs-Guthaben; es ist kein zusätzliches Geld geflossen. Rest: 1,75 Credits (im Konto nachgeprüft).

## Erzeugte Assets

| Asset | Rohbild (unverändert) | Im Spiel | Zweck |
|---|---|---|---|
| Kareth | `art/generated/scenes/kareth_raw.png` | `public/assets/scenes/campaign/kareth.png` | Hintergrund Mission 1 |
| Abgrund-Arena | `art/generated/scenes/abyss_raw.png` | `public/assets/scenes/campaign/abyss.png` | Hintergrund Mission 3 |
| Gluttiefe | `art/generated/scenes/glut_raw.png` | `public/assets/scenes/campaign/glut.png` | Hintergrund Mission 5 |
| Aschenfeste | `art/generated/scenes/ash_raw.png` | `public/assets/scenes/campaign/ash.png` | Hintergrund Mission 4 (ersetzt das Burg-Bild) |
| Halvar | `art/generated/scenes/halvar_raw.png` | `public/assets/scenes/campaign/halvar.png` | Hintergrund Mission 2 (ersetzt das Burg-Bild) |
| Kapitel-Karte | `art/generated/scenes/map_raw.png` | `public/assets/scenes/campaign/map_c1.png` | Kapitelbildschirm mit Missions-Pins |
| Requisiten Kareth | `art/generated/scenes/props_kareth_raw.png` | `public/assets/scenes/props/kareth_*.png` (6) | Dekoration an der Rückwand, Vordergrund-Säule |
| Requisiten Gluttiefe | `art/generated/scenes/props_glut_raw.png` | `public/assets/scenes/props/glut_*.png` (6) | Dekoration an der Rückwand, Vordergrund-Säule |

| Xame Gehen | `art/generated/characters/xame_walk_raw.png` | `public/assets/sprites/sheets/xame_walk.png` | Gehen / Laufen / Sprint |
| Xame Angriff | `art/generated/characters/xame_attack_raw.png` | `public/assets/sprites/sheets/xame_attack.png` | alle Schläge |
| Leerenritter | `art/generated/characters/knight_raw.png` | `public/assets/sprites/sheets/void_knight.png` | Gegner (ersetzt den alten Ritter-Bogen) |
| Leerenräuber | `art/generated/characters/raider_raw.png` | `public/assets/sprites/sheets/void_raider.png` | Gegner (ersetzt den alten Banditen-Bogen) |
| Leerenhexer | `art/generated/characters/cultist_raw.png` | `public/assets/sprites/sheets/void_cultist.png` | Fernkampf-Gegner (ersetzt den alten Zauberer-Bogen) |
| Glutfürst | `art/generated/characters/emberlord_raw.png` | `public/assets/sprites/sheets/ember_lord.png` | Boss (ersetzt den alten Boss-Bogen) |
| Invasions-Gegner (5) | `art/generated/characters/{brute,archer,acolyte,shaman,duelist}_raw.png` | `public/assets/sprites/sheets/{void_brute,void_archer,ember_acolyte,frost_shaman,void_duelist}.png` | Gegner der späteren Invasions-Level |
| Verbündete (2) | `art/generated/characters/{guard,scout}_raw.png` | `public/assets/sprites/sheets/{watch_guard,watch_scout}.png` | befreite Gefangene / Begleiter |
| Xame Zusatzposen | `art/generated/characters/xame_misc_raw.png` | `public/assets/sprites/sheets/xame_misc.png` | Sprung, Blocken, Treffer, Zaubern, Niederlage |
| Thesen (3 Bögen) | `art/generated/characters/thesen_{walk,attack,misc}_raw.png` | `public/assets/sprites/sheets/thesen_{walk,attack,misc}.png` | Bewegungen ohne Waffe |
| Thesen Waffenposen | `art/generated/characters/thesen_armed_raw.png` | `public/assets/sprites/sheets/thesen_armed.png` | Schläge mit Waffe (alle Waffen) |
| Fokus-Form (3 Bögen) | `art/generated/characters/focus_{walk,armed,misc}_raw.png` | `public/assets/sprites/sheets/focus_{walk,armed,misc}.png` | alle Bewegungen der Fokus-Form, mit und ohne Waffe |
| Basis-Saal (tiefer Boden, 12. Nov; das erste Bild `base_hall_raw.png` ist abgelöst) | `art/generated/scenes/base_hall2_raw.png` | `public/assets/scenes/campaign/base_hall.png` | Hintergrund der Basis |
| Basis-Stationen | `art/generated/scenes/props_base_raw.png` | `public/assets/scenes/props/base_stations.png` (6 Zellen) | Stationen der Basis |
| Rüstungs-Ständer | `art/generated/scenes/props_stands_raw.png` | `public/assets/scenes/props/stand_0…5.png` | Klassen-Ständer in der Basis |

Figuren-Bögen werden mit `art/authoring/prep_frames.cjs` in Einzelbilder geschnitten und auf die Pixelgröße der Figur gebracht.
Requisiten werden mit `art/authoring/prep_props.cjs` freigestellt (harter Alpha-Schnitt), getrennt und halbiert.
Szenen-Aufbereitung: `art/authoring/prep_scene.cjs` (oben beschneiden, bis die Boden-Kante auf der Spiel-Bodenlinie liegt; Palette auf 56 Farben).

## 21. Nov 2026: Dino-Drachen-Animationen (vom Nutzer gekauftes Guthaben)

Der Nutzer hat selbst Guthaben gekauft (Plan `starter`, Stand vor dem Auftrag 271,75 Credits) und will es nutzen. Der Schwerpunkt liegt auf Mobile.

| Auftrag | Modell | Anzahl | Credits |
|---|---|---|---|
| Lauf-Animation je Dino-Drache (GIF, 8 Bilder, 384×288, transparent) | `gpt_image_2_6` | 13 | 13 |
| Angriffs-Animation je Dino-Drache (dto.) | `gpt_image_2_6` | 13 | 13 |
| Magmarax-Angriff neu (der erste wich vom Lauf-Design ab) | `gpt_image_2_6` | 1 | 1 |
| 4 Aufträge mit Job-IDs als Vorlage: **fehlgeschlagen**, nichts abgebucht | – | 4 | 0 |

**Kontostand danach: 244,75 Credits (27 verbraucht).**

- Die Vorlagen waren die freigestellten Bestiarium-Sprites, für die Angriffe zusätzlich das erste Lauf-Frame als PNG.
- Higgsfield nimmt nur etwa 4 Aufträge gleichzeitig an.
- Umwandlung: `%TEMP%\grimge_tools\hf\build_sheets.cjs`. Gemeinsame Schnittbox für Lauf und Angriff, gespiegelt, 2/3 Größe, PNG8.
- Ergebnis: `public/assets/creatures/dinodragons/anim/<element>_{walk,attack}.png`, eingebunden über `public/src/kk_dino_anim.js`.

## 21. Nov 2026: Pilot Referenz-Body → Klassen-Ebenen

| Auftrag | Modell | Anzahl | Credits |
|---|---|---|---|
| Guardian auf dem Referenz-Body (1024×1024, high, Stilvorlage `heavy_knight_v1`) | `gpt_image_2_6` | 2 | 2,5 |

**Kontostand danach: 242,25 Credits.**

- Der Body liegt nativ in 184×184 vor. Die 1024er Fassung lässt sich mit dem Filter `point` verlustfrei zurückrechnen (0 abweichende Pixel).
- `art/authoring/prep_layers.cjs` schneidet daraus die Ebenen Outfit und Haare. Die Figur wird aus dem unveränderten Body plus den Ebenen zusammengesetzt.
- Body und Ergebnisse liegen in `art_source/body/` und werden nicht committet.
| 8 eigene Klassen-Stile (Anime / altes Japan) auf dem Referenz-Body: Guardian (Samurai-Lamellenrüstung), Berserker (Oni-Brecher), Lancer (Weißer Kranich), Monk (Bergasket), Beastborn (Wolfsgeist-Jäger), Shadow (Nacht-Shinobi), Ranger (Reiterbogenschütze), Arcanist (Runen-Exorzist) | `gpt_image_2_6` | 8 | 10 |

**Kontostand danach: 232,25 Credits.** Alle 8 sind mit `prep_layers.cjs` in Outfit- und Haar-Ebenen zerlegt (`art_source/body/layers/`).

## 21. Nov 2026: Charakter-Erstellung, Transformationen, Primals

| Auftrag | Modell | Anzahl | Credits |
|---|---|---|---|
| 12 eigene Stile des Nutzers auf dem Referenz-Body: Astral mit und ohne Kapuze, Runescribe, Leder, Sturmarm, Wanderer, Oni-Mönch, dunkler Samurai, Runenritter, Ronin, Karmesin-Robe, weißer Mönch | `gpt_image_2_6` high | 12 | 15 |
| 8 Klassen-Transformationen (Look- und VFX-Vorlage, mit Haar und Effekten) | dto. | 8 | 10 |
| Primal-Sheets (3 Stufen), erste Fassung (zu weich, zu lieb) | dto. | 4 | 5 |
| Primal-Sheets, zweite Fassung: harte Pixel, gefährlich (**vom Nutzer freigegeben**) | dto. | 4 | 5 |
| Transformations-Kleidung ohne Haar und ohne VFX (passt zu jeder Frisur) | dto. | 8 | 10 |
| Primal-Animationen: 4 Primals × 3 Stufen × Laufen/Fliegen und Angriff | `gpt_image_2_6` GIF | 24 | 24 |
| Primal-Transformation Stufe 2: Fusions-Rüstung | `gpt_image_2_6` high | 4 | 5 |
| Primal-Transformation Stufe 3: volle Bestienkrieger-Form | dto. | 4 | 5 |
| Primal-Transformation Stufe 1: Geist-Auren als VFX | `gpt_image_2_6` GIF | 4 | 4 |

**Zusammen 83 Credits.**
- Am 21. Nov um 02:33 hat der Nutzer ein Credit-Paket mit +230 Credits gekauft.
- **Kontostand danach: 379,25 Credits.**
- Gewonnen: PNG-Ergebnisse lassen sich per Job-ID direkt als Vorlage nutzen. GIF-Job-IDs gehen nicht; die 4 Fehlschläge wurden erstattet.
- Higgsfield nimmt nur etwa 4 Aufträge gleichzeitig an.
- Die Ergebnisse liegen in `art_source/body/` (`sty_*`, `tf_*`, `tfc_*`, `pf2_*`, `layers/pf3`, `layers/pf1`, `primals/`); das wird nicht committet.
- Im Spiel sind: `public/assets/creatures/primals/` (12 Standbilder und 24 Animations-Sheets).

## 21. Nov 2026: Base-Animationen und Haar-Formwandlung

| Auftrag | Modell | Anzahl | Credits |
|---|---|---|---|
| Base-Body mit Trainingshose als Vorlage (der nackte Body wird beim Animieren als NSFW markiert) | `gpt_image_2_6` high | 1 | 1,25 |
| Base-Animationen 768², 8 Bilder. Erste Fassung: Laufen, Jab, Sprint, schwerer Schlag, Idle, Cross, Uppercut, Dive, Dash, Sprung, Block, Treffer, Rune zeichnen, K.o. | `gpt_image_2_6` GIF high | 14 | 17,5 |
| Dynamisch neu (Anime/Shōnen): Sprung, Uppercut, schwerer Schlag, Dive | dto. | 4 | 5 |
| Spirit-Kugel: Aufladen, über dem Kopf halten, Wurf; Handflächen-Stoß/Beam | dto. | 4 | 5 |
| Haar-Formwandlung: 4 Raster à 6 Frisuren × 8 Transformationen | `gpt_image_2_6` high | 32 | 40 |

**Zusammen 68,75 Credits; Kontostand danach: 310,50.**
- Markierte oder fehlgeschlagene Aufträge wurden erstattet. Das betraf den nackten Body, die Raster mit nacktem Oberkörper und GIFs in 1024².
- Die Raster bekommen deshalb ein schlichtes dunkles Oberteil.
- Nachtrag: Rune-zeichnen-Pose neu als senkrechtes Zwei-Finger-Zeichen (die alte Pose mit vorgestrecktem Arm war ungeeignet), 1 GIF für 1,25 Credits. **Kontostand: 309,25.**

## 21. Nov 2026: Waffen, Klassen-Stile, Bärte/Gesicht, animierte Outfits (Test)

| Auftrag | Anzahl | Credits |
|---|---|---|
| Waffen-Bögen à 6 im Stil von Thesen/Xame (Monster-Hunter-artig, eigene Designs) → 44 Waffenteile im Spiel | 8 | 10 |
| Klassen-Outfits im rauen Thesen-Stil (`cl2_*`) | 8 | 10 |
| Bärte (6) und Gesichts-Assets (6) als Raster | 2 | 2,5 |
| Transformations-Rüstungen im rauen Stil (`tf2_*`: Guardian, Lancer, Monk, Shadow, Ranger) | 5 | 6,25 |
| Retro-Klassen-Outfits (`cl3_*`, alle 8) | 8 | 10 |
| Umfärbungen in Klassenfarben bei gleicher Zeichnung (`rc_*`: Guardian, Lancer, Monk, Ranger); Berserker und Beastborn lokal umgefärbt | 4 | 5 |
| Beastborn und Ranger neu und klar verschieden (`rc2_*` rau, `cl4_*` glatt) | 4 | 5 |
| Test: Lauf-Animation im Guardian-Outfit (9 Frames in einem Raster) | 1 | 1,25 |

**Kontostand: 259,25.**
- Markierte Aufträge wurden erstattet: Bilder mit nacktem Oberkörper und eine Stangenwaffen-Formulierung.

## 21. Nov 2026: Reiten, Beschwörung, Flug, Stall-Reittiere, Klassen-Rüstungen neu, Haare Thesen/Xame

| Auftrag | Modell | Anzahl | Credits |
|---|---|---|---|
| Base-Clips (GIF 768², 8 Bilder): Beschwörung mit Hand am Boden, Schweben, Fliegen, Reiten (stehend, Galopp, auf Flugtier) | `gpt_image_2_6` GIF high | 6 | 7,5 |
| Die 6 neuen Clips für alle 8 Klassen anziehen (erster Durchlauf, Referenz = löchrige Outfit-Ebenen) | `gpt_image_2_6` high | 53 | 66,25 |
| Neu mit den vollständigen Klassen-Quellbildern (keine Löcher → keine springenden Details): 6 neue Clips × Guardian/Monk/Beastborn/Ranger/Arcanist + die 18 Original-Clips × Guardian/Lancer/Monk | dto. | 84 | 105 |
| Stall-Reittiere als Lauf-/Flug-Loops (Knochenross, Hauereber, Kirin, Wyvern), roter Sattel für die Sitz-Erkennung | `gpt_image_2_6` GIF high | 4 | 5 |
| Haare Thesen und Xame (+ Xame-Bart) auf dem Referenzkörper im Anzug | `gpt_image_2_6` high | 2 | 2,5 |

**Zusammen 186,25 Credits; Kontostand danach: 50,50** (das Konto wird auch von anderen Sitzungen genutzt).
- Markiert und daher nicht genutzt: die Klassen-Quelle Berserker (nackter Oberkörper); die angezogenen Idle-Raster von Guardian, Monk und Beastborn als Referenz.
- Lehre: Referenzen für das Anziehen müssen vollständig sein. Ausgeschnittene Outfit-Ebenen haben Löcher, die KI erfindet die Lücken in jedem Frame anders.

## 21. Nov 2026: Waffen-Angriffe des Base-Charakters

| Auftrag | Modell | Anzahl | Credits |
|---|---|---|---|
| 10 Schwert-Clips mit Platzhaltern (magenta Stab = Schwert, cyan Fleck = Schild): Angriff 1–3, Finisher, Aufladen vorwärts/hoch/runter, Aufladen, Laufangriff, Luftangriff | `gpt_image_2_6` GIF high | 10 | 12,5 |
| Neu, weil das Schwert in einzelnen Frames die Hand wechselte (strengere Regel, dann geänderte Bewegungen) | dto. | 7 | 8,75 |
| Guardian-Rüstung für die 10 Waffen-Clips (vollständige Klassen-Quelle als Referenz) | `gpt_image_2_6` high | 10 | 12,5 |

**Zusammen 33,75 Credits; Kontostand danach: 16,75.**
- Prüfung: In allen 80 Frames ist der Griff mindestens 28 px vom Schildarm entfernt.

## 21 Nov 2026 – 2k-Test (scharfe Pixel)

| Job | Modell | Bilder | Credits |
|---|---|---|---|
| Arcanist-Hover als 2k-Raster (2048², Frames in Körper-Pixelgröße 1024/184) – Test, ob die KI echte Pixel zeichnet | `gpt_image_2_6` low, 2k | 1 | 1,25 |

**Kontostand danach: 15,5.** Ergebnis: echte Pixelblöcke, scharf; 2k kostet dasselbe wie 1k.

## 23 Nov 2026 – Frisuren allein auf dem Referenzkörper (exakt ausschneiden)

| Job | Modell | Bilder | Credits |
|---|---|---|---|
| 4 Frisuren (Berserker, Lancer, Arcanist, Beastborn) auf 4 nackten Referenzkörpern, 2k | `gpt_image_2_6` low, 2k | 1 | 0 (als NSFW blockiert, erstattet) |
| dasselbe im lila Anzug (Haut unterhalb des Halses als Stoff) | `gpt_image_2_6` low, 2k | 1 | 1,25 |

**Kontostand danach: 5,5** (dazwischen 7,5 Credits für eigene Generierungen außerhalb dieser Sitzung, 22.–23. Nov).
