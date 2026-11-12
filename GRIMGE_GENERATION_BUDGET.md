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
