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
| Verbrauchte Credits aus dem Guthaben | **0,75** (drei Szenen); Kontostand geprüft: 9,25 Credits |

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

Alle Credits stammen aus dem Registrierungs-Guthaben; es ist kein zusätzliches Geld geflossen. Rest: 9,25 Credits.

## Erzeugte Assets

| Asset | Rohbild (unverändert) | Im Spiel | Zweck |
|---|---|---|---|
| Kareth | `art/generated/scenes/kareth_raw.png` | `public/assets/scenes/campaign/kareth.png` | Hintergrund Mission 1 |
| Abgrund-Arena | `art/generated/scenes/abyss_raw.png` | `public/assets/scenes/campaign/abyss.png` | Hintergrund Mission 3 |
| Gluttiefe | `art/generated/scenes/glut_raw.png` | `public/assets/scenes/campaign/glut.png` | Hintergrund Mission 5 |

Aufbereitung: `art/authoring/prep_scene.cjs` (oben beschneiden, bis die Boden-Kante auf der Spiel-Bodenlinie liegt; Palette auf 56 Farben).
