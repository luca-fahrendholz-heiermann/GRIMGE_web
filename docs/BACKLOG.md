# GRIMGE Backlog

Stand 20.10.2026. Reihenfolge = Vorschlag; der Projektinhaber entscheidet.

## 3 · Visual-Upgrade-Rollout (nach Freigabe der Piloten A–C)
Plan: `docs/GRIMGE_Visual_Upgrade_Plan.md` §4 Schritt 4. Testassets → später finales Artwork.
1. **Gemeinsame Bausteine ableiten** aus den Piloten: Sequenz-Player (Phasen aus Spell-Timern), Anker-Auflösung (Hand / Boden / Ziel), Material-Paletten je Element, Standard-Impact (Flash + Hitstop + Ring), Strahl-Renderer (dunkler Mantel → Farbe → weiße Achse).
2. **Basis-Spells** (je Element ein Hauptkörper-Sprite + Impact): Fireball, Gale Shockwave, Arc Lightning, Stone Spikes, Frost Nova, Void Bolt, Halo Pulse, Shadow Step, NATURA-Heilblüte.
3. **Strahlen** (eine Klasse, 7 Looks): Inferno, Glacial, Thunder, Null, Radiant, Rift, Annihilation — mehrlagiger Kern + Austritts- und Einschlags-Sprites.
4. **Fusionen** nach Sichtbarkeit: Firestorm, Magma Fissure, Tempest Blitz, Blizzard Surge, Dragon Breath, Seismic Slam, Titan Stomp, Soul Seekers, Weltenbaum.
5. **Spezialrunen** S01–S49: zuerst Objekt-Runen (Banner, Sanktuarium, Kunai, Falle, Schächte), dann Haltungen.
6. **Arcane States** (18): Rig-Teile als Sprites statt Plates; Lieblinge zuerst (Arkengestell, Sonnenwyrm, Vorausschnitt, Göttlicher Riese).
7. **Waffen** (37): Waffen-Sprites + Bewegungs-Animationen, Kit-Effekte als Sprites.
8. Optional: Konzeptentwürfe per Codex ImageGen (über das OpenAI-Konto, nur nach Freigabe) → Cleanup in Aseprite.

## Weitere offene Punkte
- **Spielgefühl & Balance** im echten Spiel prüfen: Mana-Kosten, Zeitfenster der Zweistufer (Blitzmarke 5 s, Spiralkugel 2,5 s, Bannfalle 6 s, Schachtwuchs 6 s, Steinwall 5 s, Flutstrahl 5 s), Waffen-Kits, Halte-Slot (Touch-Schwelle 0,3 s).
- **Performance auf Mobilgeräten** messen (Partikel-Budget 500, Sprite-Pfade).
- **Visueller Katalog (PowerPoint)** neu aufbauen (`tools/catalog/`): Piloten, S45–S49, Tausendhand, Übergänge fehlen.
- **Nutzer-Dateien in `docs/`** (Visual Guide PDF, Prompt, Referenzbilder): committen oder ignorieren?
- Glyphen-Erkennung: stark verrauschte S35-Zeichnung wurde einmal als Fulgur erkannt.
- Weitere Zweistufer nach Bedarf (Slot-Funktion `recast.js` ist allgemein).
