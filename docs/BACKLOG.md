# GRIMGE Backlog

Stand 20.10.2026. Reihenfolge = Vorschlag; der Projektinhaber entscheidet.

## 3 · Visual-Upgrade-Rollout (nach Freigabe der Piloten A–C)
Plan: `docs/GRIMGE_Visual_Upgrade_Plan.md` §4 Schritt 4. Testassets → später finales Artwork.
1. **Gemeinsame Bausteine ableiten** aus den Piloten: Sequenz-Player (Phasen aus Spell-Timern), Anker-Auflösung (Hand / Boden / Ziel), Material-Paletten je Element, Standard-Impact (Flash + Hitstop + Ring), Strahl-Renderer (dunkler Mantel → Farbe → weiße Achse).
2. **Basis-Spells** (je Element ein Hauptkörper-Sprite + Impact): Fireball, Gale Shockwave, Arc Lightning, Stone Spikes, Frost Nova, Void Bolt, Halo Pulse, Shadow Step, NATURA-Heilblüte.
3. **Strahlen** (eine Klasse, 7 Looks): Inferno, Glacial, Thunder, Null, Radiant, Rift, Annihilation — mehrlagiger Kern + Austritts- und Einschlags-Sprites.
4. **Fusionen** nach Sichtbarkeit: Firestorm, Magma Fissure, Tempest Blitz, Blizzard Surge, Dragon Breath, Seismic Slam, Titan Stomp, Soul Seekers, Weltenbaum.
5. **Spezialrunen** S01–S52: zuerst Objekt-Runen (Banner, Sanktuarium, Kunai, Falle, Schächte), dann Haltungen.
6. **Arcane States** (18): Rig-Teile als Sprites statt Plates; Lieblinge zuerst (Arkengestell, Sonnenwyrm, Vorausschnitt, Göttlicher Riese).
7. **Waffen** (37): Waffen-Sprites + Bewegungs-Animationen, Kit-Effekte als Sprites — und **jede Waffe bekommt ihre eigene Verteidigungs-Animation** (Schild hochreißen, Klinge quer, Stab-Drehung, Fächer-Wand …; Nutzerwunsch 20.10.).
8. Optional: Konzeptentwürfe per Codex ImageGen (über das OpenAI-Konto, nur nach Freigabe) → Cleanup in Aseprite.

## Anime-Mechaniken — Ideen für weitere Spezialrunen / Arcane States
Umgesetzt: Spiralkugel (S46), Spiegelkerker (S50), Blutkreuz (S51), Herausforderung (S52). Jede neue Mechanik mit eigenem Stil, nicht alles gleich krachend.
- **Sphären-Entfaltung (Domain Expansion, Jujutsu Kaisen):** eine Kuppel umschließt einen Bereich der Arena für ~6 s; darin gilt eine eigene Regel (z. B. jeder eigene Treffer trifft garantiert / Gegner verlangsamt / Boden wird zur Element-Fläche). Wenn beide eine Domäne öffnen: Kuppel-Duell (Tippen wie beim Beam-Clash).
- **Schattenbindung (Shikamaru):** ein Schatten kriecht über den Boden; erreicht er den Gegner, spiegelt der Gegner 3 s lang jede Bewegung des Zauberers.
- **Gedankenspiegelung / Illusion (Genjutsu):** der Gegner sieht für 2 s falsche Positionen (Doppelbilder); Treffer auf die Illusion zerplatzen.
- **Chidori-/Raikiri-Ansturm:** gerade Blitzlinie durch alle in der Linie, mit Nachleuchten der Bahn (zweistufig: Rückweg-Schlag).
- **Hollow-/Cero-Strahl mit Aufladung:** je länger gehalten, desto breiter; beim Loslassen Rückstoß für den Zauberer.
- **Kekkai/Bannwürfel (Kekkaishi):** ein Würfel um den Gegner, zweiter Tipp „Metsu“: Würfel zieht sich zusammen.
- **Zeitstopp-Feld:** Projektile im Feld frieren in der Luft ein; beim Ende fliegen sie weiter (auch die eigenen).
- **Beschwörungs-Kette (Summoning Contract):** Blut auf eine Schriftrolle — eine riesige Kreatur erscheint kurz und führt EINEN Angriff aus.
- **Bankai-artige Waffen-Entfesselung** als Arcane State: die Klassenwaffe verwandelt sich (z. B. Schwert → Klingenblüten-Schwarm).
- **Statuseffekt-Kombos:** nass + Blitz = Paralyse garantiert, brennend + Wind = Feuer springt über, gefroren + schwerer Treffer = Eis zersplittert mit Bonusschaden.

## Weitere offene Punkte
- **Statuseffekte balancieren:** Chancen (aktuell 8–22 % pro Treffer, × Grade-Power), Dauer, Immunitätsfenster; weitere Quellen (Gift-Waffen, Eis-Fusionen, Blutungs-Kits).
- **Aggro im Mehrspieler:** S52 zwingt bisher Minions und den Gegner-Zauberer; Begleiter/Summons der Gegenseite fehlen noch.
- **Spielgefühl & Balance** im echten Spiel prüfen: Mana-Kosten, Zeitfenster der Zweistufer (Blitzmarke 5 s, Spiralkugel 2,5 s, Bannfalle 6 s, Schachtwuchs 6 s, Steinwall 5 s, Flutstrahl 5 s), Waffen-Kits, Halte-Slot (Touch-Schwelle 0,3 s).
- **Performance auf Mobilgeräten** messen (Partikel-Budget 500, Sprite-Pfade).
- **Visueller Katalog (PowerPoint)** neu aufbauen (`tools/catalog/`): Piloten, S45–S49, Tausendhand, Übergänge fehlen.
- **Nutzer-Dateien in `docs/`** (Visual Guide PDF, Prompt, Referenzbilder): committen oder ignorieren?
- Glyphen-Erkennung: stark verrauschte S35-Zeichnung wurde einmal als Fulgur erkannt.
- Weitere Zweistufer nach Bedarf (Slot-Funktion `recast.js` ist allgemein).
