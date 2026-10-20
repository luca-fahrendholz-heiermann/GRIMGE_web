# GRIMGE Backlog

Stand 20.10.2026. Reihenfolge = Vorschlag; der Projektinhaber entscheidet.

## 3 · Visual-Upgrade-Rollout (nach Freigabe der Piloten A–C)
Plan: `docs/GRIMGE_Visual_Upgrade_Plan.md` §4 Schritt 4. Testassets → später finales Artwork.
1. **Gemeinsame Bausteine ableiten** aus den Piloten: Sequenz-Player (Phasen aus Spell-Timern), Anker-Auflösung (Hand / Boden / Ziel), Material-Paletten je Element, Standard-Impact (Flash + Hitstop + Ring), Strahl-Renderer (dunkler Mantel → Farbe → weiße Achse).
2. **Basis-Spells** (je Element ein Hauptkörper-Sprite + Impact): Fireball, Gale Shockwave, Arc Lightning, Stone Spikes, Frost Nova, Void Bolt, Halo Pulse, Shadow Step, NATURA-Heilblüte.
3. **Strahlen** (eine Klasse, 7 Looks): Inferno, Glacial, Thunder, Null, Radiant, Rift, Annihilation — mehrlagiger Kern + Austritts- und Einschlags-Sprites.
4. **Fusionen** nach Sichtbarkeit: Firestorm, Magma Fissure, Tempest Blitz, Blizzard Surge, Dragon Breath, Seismic Slam, Titan Stomp, Soul Seekers, Weltenbaum.
5. **Spezialrunen** S01–S74: zuerst Objekt-Runen (Banner, Sanktuarium, Kunai, Falle, Schächte), dann Haltungen.
6. **Arcane States** (19): Rig-Teile als Sprites statt Plates; Lieblinge zuerst (Arkengestell, Sonnenwyrm, Vorausschnitt, Göttlicher Riese).
7. **Waffen** (37): Waffen-Sprites + Bewegungs-Animationen, Kit-Effekte als Sprites — und **jede Waffe bekommt ihre eigene Verteidigungs-Animation** (Schild hochreißen, Klinge quer, Stab-Drehung, Fächer-Wand …; Nutzerwunsch 20.10.).
8. Optional: Konzeptentwürfe per Codex ImageGen (über das OpenAI-Konto, nur nach Freigabe) → Cleanup in Aseprite.

## Anime-Mechaniken — Ideen für weitere Spezialrunen / Arcane States
Umgesetzt: Spiralkugel (S46), Spiegelkerker (S50), Blutkreuz (S51), Herausforderung (S52), Sphären als eigene Familie (S53 Abgrundschrein, S56 Stillstand, S57 Glutkessel, S58 Lebenshain, S59 Spiegelwelt, S60 Schwerkraft, S61 Sturm, S62 Schattenmeer, dazu je Element eine Sphäre: S63 Ventus, S64 Terra, S65 Aqua, S66 Bestia, S67 Konstrukt, S68 Void, S69 Lux (Ignis/Natura/Fulgur/Umbra = S57/S58/S61/S62); Name nur für den Besitzer sichtbar; gleiche Glyphe, eigene Fähigkeit, max. 1 pro Deck, Sphären-Duell), Schattenbindung (S54), Azurflamme (S55, Chidori-artig adaptiert: blaues Feuer), Bannwürfel (S70), Zornstrahl (S71, Slot halten zum Aufladen), Blutvertrag (S72), Zeitstopp (S73), Trugbild (S74, Illusions-Doppelgänger), Arcane State A04 Klingenblüte (Waffen-Entfesselung). Jede neue Mechanik mit eigenem Stil, nicht alles gleich krachend.
- **Weitere Sphären** nach Bedarf (gleiche Glyphe, eigene Regel).
- **Weitere Status-Kombos** (umgesetzt: Nass+Blitz, Nass+Eis, Brand+Wind, Brand+Wasser, Gefroren+harter Treffer, Gift+Feuer, Blutung+Wind, Paralyse+Erde): weitere nach Bedarf.

## Weitere offene Punkte
- **KI-Spezialrunen ausbauen:** feinere Taktik je Rune (Falle vorausplanen, Spiegelkerker-Sprünge timen), Schwierigkeitsstufen.
- **Statuseffekte balancieren:** Chancen (aktuell 8–22 % pro Treffer, × Grade-Power), Dauer, Immunitätsfenster; weitere Quellen (Gift-Waffen, Eis-Fusionen, Blutungs-Kits).
- **Aggro im Mehrspieler:** S52 zwingt bisher Minions und den Gegner-Zauberer; Begleiter/Summons der Gegenseite fehlen noch.
- **Spielgefühl & Balance** im echten Spiel prüfen: Mana-Kosten, Zeitfenster der Zweistufer (Blitzmarke 5 s, Spiralkugel 2,5 s, Bannfalle 6 s, Schachtwuchs 6 s, Steinwall 5 s, Flutstrahl 5 s), Waffen-Kits, Halte-Slot (Touch-Schwelle 0,3 s).
- **Performance auf Mobilgeräten** messen (Partikel-Budget 500, Sprite-Pfade).
- **Visueller Katalog (PowerPoint)** neu aufbauen (`tools/catalog/`): Piloten, S45–S49, Tausendhand, Übergänge fehlen.
- **Nutzer-Dateien in `docs/`** (Visual Guide PDF, Prompt, Referenzbilder): committen oder ignorieren?
- Glyphen-Erkennung: stark verrauschte S35-Zeichnung wurde einmal als Fulgur erkannt.
- Weitere Zweistufer nach Bedarf (Slot-Funktion `recast.js` ist allgemein).
