# GRIMGE Visual Quality Upgrade — Audit, Pilot-Specs, Asset-Plan, Implementierungsplan

Stand 19.10.2026 · Grundlage: `GRIMGE_Visual_Guide.pdf` (Visual Quality Bible) + `CLAUDE_GRIMGE_VISUAL_UPGRADE_PROMPT.md` + der reale Code in `public/src`.
Status: **Planungsdokument, noch keine Codeänderung.** Alle Zahlen (Pixelgrößen, Frames, Zeiten) sind Startwerte und werden im laufenden Spiel kalibriert.

---

## 1. Repository-Audit

### 1.1 Technische Basis
| Bereich | Ist-Zustand | Datei(en) |
|---|---|---|
| Engine | Vanilla JS, Canvas 2D, eigener Game-Loop, 1024×576 logische Welt, adaptive Kamera | `main.js` |
| Tiefe / 2.5D | `groundYForDepth(z)`, 150 px Tiefe pro z-Einheit; Akteure **und** Spells mit Bodenposition werden gemeinsam nach `y` sortiert (`spells.depthEntries()`), Rest als Top-Layer | `world.js`, `main.js` (render), `spells.js` (`render`, `renderBatch`) |
| Höhe / Plattformen | `surfaceHeight`/`elevation`/`worldHeight`; temporäre Spell-Geometrie über `battlefield.dynamicSurfaces` (landing-only) | `battlefield.js`, `geometry.js` |
| Charakter-Sprites | Hand-gepixelte Sheets (`assets/sprites/char_*.png`, `sheets/hero_*`), `sprites.renderEntity` mit Tint/Alpha | `sprites.js` |
| **Sprite-Pipeline für FX** | Existiert: deterministischer Pixel-Generator + editierbare `.aseprite`-Quellen → PNG-Strips (`FX_SHEETS`, `drawFx`, smoothing aus, Integer-Scale) | `art/authoring/generate_fx_sprites.cjs`, `art/authoring/fx/*.aseprite`, `fx_sprites.js` |
| Nutzung dieser Pipeline | **nur** Bodeneffekte, Wetter, Requisiten (`environment.js`, 11 Aufrufe). **Kein einziger Spell, Arcane State oder Waffen-Move nutzt Sprites.** | `environment.js` |
| Spell-/State-/Waffen-VFX | 100 % prozedural: Material-Painter (`plate`, `band`, `fallout`, `shard`), Canvas-Primitive (Ringe, Linien, Ellipsen, additive Kreise mit `shadowBlur`) | `buff_vfx.js`, `buff_v32_kit.js`, `abilities.js`, `spells.js`, `signature_core.js` … |
| Pixel-Look | `renderPixelated()` rendert einzelne Formen über einen Offscreen-Layer grob; Haupt-Canvas hat `imageSmoothingEnabled = true` (für skalierte Hintergründe) | `abilities.js`, `main.js` |
| Hitstop / Kamera | `combat.triggerHitstop(frames)`, `entityHitstop`, `combat.shakeCamera` | `combat.js`, `entities.js` |
| Cast-Anker | `sockets()` liefert head/chest/back/handF/handB/elbow/hip/knee/foot – genutzt von Arcane States, nicht von Rune-Spells | `buff_vfx.js` |
| Netcode | keiner (Einzelspieler + KI) → kein Netcode-Risiko | – |
| Tests | Node-Headless mit Proxy-Canvas (kein `Image`) → jeder Sprite-Pfad braucht einen Fallback | `test_runtime.js` |

### 1.2 Registrierung & Übergang Logik → Visuals
- **Spells:** `SPELL_DEFINITIONS` / `SPELL_RECIPES` (`spell_catalog.js`) → `SpellSystem.cast()` (`spells.js`, großer `switch`) → je Spell eine Klasse mit **`update()` (Logik) und `render()` (Optik) im selben Objekt**. Visuelle Phasen werden aus denselben Timern abgeleitet (z. B. `MeteorSpell.isLanded`, `craterLife`).
- **Signatur-Spezialrunen S01–S44:** `defineSignature(id, impl)` (`signature_core.js`), Mechanik in `signature_abilities_a–d.js`; Zeitsteuerung über `SigSequence` (steps + `draw`), Objekte als `SigProp`/`GeoPlatform`, Stances mit `stance.render`.
- **NATURA / Infusionen:** `nature_spells.js` (eigene Klassen mit `update`/`render`).
- **Arcane States:** Daten `buff_forms_data.js`, Renderer `registerFormRenderer` (`buff_v32_*.js`, `buff_signatures.js`), Techniken `arcane_moves.js` (`strike`/`ticking`/`volley` + Painter), Sprint/Dive `form_specials.js`, Pull `pull_looks.js`.
- **Waffen:** `weapons.js`/`weapons_ext.js` (Waffe als prozedurale „Astral-Pieces“, `drawAstralPiece`), Kits `weapon_kits.js` (`KitFx`-Painter).
- **Folge:** Es gibt keine getrennte Visual-Schicht. Ein Upgrade kann risikoarm erfolgen, wenn ein **Visual-Renderer pro Spell den bestehenden Logik-Zustand nur liest** und bei fehlendem Asset auf das heutige `render()` zurückfällt.

### 1.3 Mehrfach genutzte generische Renderpfade (Hauptursache „sieht ähnlich aus“)
| Generischer Pfad | Wird genutzt von |
|---|---|
| `combat.spawnShockwave` / `spawnHitSparks` / `spawnElementalParticles` | Einschläge fast aller Spells, Waffen, Kits |
| `groundRing`, `channel`, `column` (`buff_v32_kit.js`) | Ringe/Strahlen/Säulen in Arcane-Techniken, Dives, Kits |
| `plate`/`band`/`fallout` (Material-Painter) | alle Arcane States, Signatur-Specials, Pull-Looks, Form-Specials, Geometrie |
| `BeamSpell` + `BEAM_PROFILES`/`BEAM_VFX` | alle Strahlen (Inferno, Glacial, Thunder, Null, Radiant, Rift, Annihilation) — eine Klasse, wenige Looks |
| `WeaponShot` + `drawAstralPiece` | alle Waffenprojektile |
| `GeoPlatform`-Renderer | S37 Eiszacken, S38 Schachtwuchs, Weltenbaum-Äste (Kastenform) |
| `KitFx`-Painter | 37 Waffen-Kits (einfache Vektorformen) |
| additive Kreise + `shadowBlur` | Fireball-Familie, Meteor, diverse Orbs |

### 1.4 Klassifizierung & Defizit (Familienebene)
Alle 114 Spells, 17 Arcane States und 37 Waffen sind **prozedural ohne Sprite-Sheet**; die Sprite-Spalte wäre pro ID identisch („keins“), daher hier nach Visual-Klasse (Bible Phase 1). Eine ID-genaue Inventur wird in Phase 0 automatisch aus `SPELL_DEFINITIONS` erzeugt.

| Visual-Klasse | Beispiele | Ist | Asset-Defizit | Schwierigkeit |
|---|---|---|---|---|
| Projectile | Fireball, Void Bolt, Soul Seekers, Waffenschüsse | Kreis/Glow + Partikel | Projektil-Sprite + Trail + Impact | mittel |
| Beam | 7 Strahlen | eine Beam-Klasse, Farb-/Muster-Varianten | mehrlagiger Strahlkörper, Austritt, Einschlag | mittel |
| Elemental formation | Stone Spikes, Frost Nova, Magma Fissure, Eiszacken | Plates/Ringe/Kegel | Material-Segment-Sprites + Wachstum/Zerfall | mittel–hoch |
| Heavy object | Meteor Cataclysm | additiver Kreis | mehrteiliger Körper, Telegraph, Impact, Krater | hoch |
| Summon / Creature | Beasts, Golem, Dragon Invocation | teils Sprites (`summon_*.png`) | Animationsframes fehlen | hoch |
| World object | Wände, Säulen, Banner, Sanktuarium, Weltenbaum | Vektorformen | Prop-Sprites inkl. Bruchstufen | mittel |
| Player-attached state | Arcane States, Tidenbohrer, Atmungen, Infusionen | Plate-Rigs am Socket | Rig-Teile als Sprites, Rotations-/Spin-Frames | hoch |
| Temporal/space | Vorausschnitt, Void-Zauber | transparent (gewollt) | gering, Kanten schärfen | niedrig |

### 1.5 Risiken
- **Kamera-Skalierung:** Adaptive Kamera skaliert nicht ganzzahlig → Pixel-Sprites werden unscharf oder flimmern. Gegenmaßnahme: Sprites mit `imageSmoothingEnabled = false` zeichnen (wie `drawFx`), Positionen runden, Spell-Sprites in Welt-Pixeln (Scale 2) authoren.
- **Kollision:** Bei Plattform-Spells (S37/S38/Weltenbaum) muss die sichtbare Oberkante exakt `GeoPlatform.currentHeight` entsprechen → Sprite-Höhen datengetrieben an die bestehenden Höhen binden, nicht umgekehrt.
- **Tiefe:** Bodengebundene Sprites müssen über `depthEntries` sortiert bleiben (heutige Klassen liefern `x/z/y`) — neue Visuals dürfen das nicht umgehen.
- **Tests:** Headless ohne `Image` → Visual-Layer muss ohne geladene Sheets lautlos auf den alten Renderer zurückfallen.
- **Performance:** Heute pro Frame viele Pfad-/Füll-Operationen; Sprites sind günstiger, aber Offscreen-`renderPixelated` pro Effekt ist teuer → für Pilot-Spells nicht nötig.
- **Netcode:** keiner. **LOD:** existiert nicht → Qualitätsstufe neu einführen (nur Sekundär-Partikel betroffen).

---

## 2. Visual-Specs der drei Pilot-Spells

Figurenhöhe H ≈ 88 Welt-px. Sprites werden in Welt-Pixeln authored (1 Sprite-Pixel = 2 Welt-px, wie die bestehenden FX-Sheets mit `scale: 2`).

### 2.1 Eiszacken (S37) — Linien-Attacke / Elemental formation
**Bestehende Mechanik (bleibt):** 7 `IceSpike` (= `GeoPlatform`), Abstand 32 px ab 46 px vor dem Wirker, Höhe `34 + 7·i` px, `halfW 13`, `emerge 0,12 s`, `life 3,2 s`, `decay 0,3 s`, Startversatz `0,07 s · i`; Treffer beim Auftauchen: 22 Schaden, Lift 280, Freeze 0,5 s; Spitzen sind landing-only Plattformen.

| Punkt | Spezifikation |
|---|---|
| Palette | Kontur `#0A1A2E` · Schattenseite `#123A6B` · Körper `#1F7FD1` · Mittelton `#35B8F0` · Facette `#8FE3FF` · Hotspot `#FFFFFF` (selten) · Bodenriss `#0B2238` |
| Hauptsilhouette | Ungleich hohe, leicht nach vorn geneigte Eisrippen mit 2–3 Facettenflächen, dunkle Kontur, eine helle Schnittkante je Spitze; kleine flache Bruch-„Plattform“ oben (8–10 px), damit Draufstehen glaubwürdig ist |
| Sprites | `ice_spike_v1…v6` (6 Varianten, 12–20 × 18–40 Sprite-px, passend zu den 7 Höhenstufen) · je 3 Wachstumsframes (Riss → Stummel → voll) + 1 Hold + 3 Bruchframes · `ice_crack_strip` (Bodenriss, 16×4, 4 Frames) · `ice_shard_s/m` (4 Splitter-Varianten 2–4 px) · `ice_hit` (12×12, 4 Frames) · `ice_cast_hand` (8×8, 3 Frames am `handF`) |
| Phasen | Anticipation: Hand-Frostpuff + Riss läuft vom Fuß zur Spawnlinie (vorhandener Delay) → Release: 1. Zacke bricht heraus (Frame „Stummel“, 1 Lichtspitze) → Growth: versetzte Folge, Höhe wächst → Hold: kristallin, leises Facettenblitzen → Decay: harter Splitterzerfall (keine Fade-Ausblendung) |
| Datenbindung | Frame = f(`t/emerge`), Hold solange `t < life − decay`, Bruch = f(`(t − (life − decay))/decay`); Variante = Höhenindex `i` |
| Anker | `feet_world` je Spike (x, z), Cast an `handF` des Wirkers, Richtung = `facing` |
| Impact | `ice_hit` am Ziel + kurzer Frost-Tint am Ziel (vorhandenes `freeze`) |
| Layer | Spikes über `depthEntries` (Bodenobjekt), Riss als Bodendecal unter Akteuren, Splitter Top-Layer |
| LOD | niedrig: keine Splitter/Dust, Riss statisch |

### 2.2 Meteor Cataclysm (Fulgur + Ignis) — Heavy object / Großzauber
**Bestehende Mechanik (bleibt):** `MeteorSpell` startet 160 px hinter / 450 px über dem Zielpunkt, fällt mit (320, 850) px/s (≈ 0,52 s), Schaden beim Landen (120 × power, Radius 150 × area, Knockback 450, Lift 350), danach Krater 3,5 s (`craterLife`) + Umwelt `crater` (r 72) und `lava` (r 42). **Heavy Object:** Strahlen bremsen ihn (`beamSlow`) und zerstören ihn bei `structureHp ≤ 0` — muss erhalten bleiben. Heute: additiver Kreis r 24 mit `shadowBlur`, Krater als halbtransparente Ellipse, **kein Telegraph**.

| Punkt | Spezifikation |
|---|---|
| Palette | Kontur `#120A08` · Schale dunkel `#2B1D18` · Schale mittel `#4A332A` · Schale hell `#6E5242` · Lava tief `#B3260B` · Lava `#FF5A1F` · Lava heiß `#FFB347` · Kern `#FFF1C2` · Rauch `#3A2F2F`/`#5C4D4A` |
| Hauptsilhouette | Ein massiver, gebrochener Gesteinskörper mit dunkler Schale und leuchtenden Lavaspalten (Y-/Riss-Muster), leicht gedreht in Flugrichtung |
| Sprites | `meteor_body` (32×32 Sprite-px, 4 Rotationsframes) + `meteor_cracks` (Glow-Overlay, 4 Frames, darf `lighter` sein) · `meteor_trail_smoke` (8×8, 4 Frames) · `meteor_telegraph` (48×16, 4 Frames: dunkler Ring + orange Rune, pulsiert) · `meteor_impact_flash` (32×32, 2 Frames) · `meteor_impact_ring` (64×20, 4 Frames) · `meteor_debris` (4 Brocken-Varianten 6×5, auch für Beam-Zerstörung) · `meteor_crater` (48×16, 4 Abkühlframes: glühend → dunkel) |
| Phasen | Anticipation: Telegraph am Zielpunkt ab Cast (neu, rein visuell, Dauer = vorhandene Fallzeit) + Wirker-Arm zum Himmel → Release: Meteor erscheint oben mit kurzem Flash → Travel: beschleunigter Fall, Rauch-/Glut-Trail, Rotation → Impact: 1–2 Ticks Flash + `triggerHitstop` + Impact-Ring + radiale Brocken → Decay: Krater kühlt in 3,5 s von Orange zu Dunkelbraun ab, Lava-Pool nutzt vorhandenen Umwelt-Effekt |
| Datenbindung | Fallphase = `!isLanded` (Position aus `x/y`), Impact = Übergang `isLanded`, Kraterframe = f(`craterLife`); Beam-Zerstörung (`structureHp ≤ 0`) → Brocken-Burst statt Impact |
| Anker | Telegraph `feet_world` am Ziel (targetX, targetZ); Wirker-Cast an `handF`/oberhalb des Kopfes |
| Impact | eigener Kontaktframe, Hitstop, Kamera-Impuls (vorhanden), keine Partikelwolke als Hauptbild |
| Layer | Telegraph + Krater als Bodendecal; Meteor Top-Layer (in der Luft); Brocken über `depthEntries` |
| LOD | niedrig: kein Trail-Rauch, 2 statt 4 Brocken-Sprites |

### 2.3 Tidenbohrer (S39) — Player-attached state / Rotationspanzer
**Bestehende Mechanik (bleibt):** Stance 6 s; eingehender Schaden × 0,67; alle 0,3 s feuert eine von 4 Düsen einen Hitscan-Strahl (210 px lang, 22 px breit, 9 Schaden, Push 260) entlang `spin + nozzle·90°`; Heavy feuert alle 4 Strahlen × 1,6. Heute: 10 halbtransparente Platten auf einer Ellipse (r 34) + Strahlen als dünne Bänder; Drehrichtung schwer lesbar.

| Punkt | Spezifikation |
|---|---|
| Palette | Kontur `#061A2E` · tief `#0B3D73` · Körper `#1F7FD1` · Mittelton `#2FB4EA` · Schaum `#D6F6FF` · Hotspot `#FFFFFF` |
| Hauptsilhouette | Ein satter Wasser-Rotorring mit 3 asymmetrischen, gekrümmten „Wasserarmen“ (Spirale zeigt die Drehrichtung) und 4 deutlichen Düsenköpfen; der Wirker bleibt in der Mitte sichtbar |
| Sprites | `tide_rotor_back` + `tide_rotor_front` (je 48×24 Sprite-px, 8 Rotationsframes, getrennt für Vorder-/Hinterlage) · `tide_nozzle` (6×6, 4 Winkel) · `tide_jet_body` (16×6, 3 Scroll-Frames, kachelbar) · `tide_jet_head` (8×8 Schaumkrone, 4 Frames) · `tide_hit` (12×12, 4 Frames) · `tide_droplet` (2×2, 2 Varianten) · `tide_gather` (Schließen, 6 Frames) · `tide_burst` (Aufplatzen am Ende, 6 Frames) |
| Phasen | Anticipation: Wasser zieht sich spiralig zusammen (`tide_gather`) → Release: Ring schließt mit kurzem Schaumblitz → Travel: Spin beschleunigt (Frame-Rate steigt in den ersten 0,5 s) → Impact: Düsenstoß = Jet-Kopf + Körper bis Treffpunkt, `tide_hit` am Ziel → Decay: Strahl löst sich verzögert in Tropfen auf; am Stance-Ende `tide_burst` |
| Datenbindung | Rotorframe = f(`st.spin`), Düsen-Stoß = vorhandenes `st.jets[]` (Winkel, Alter), Ende = `st.timer < 0,3` |
| Anker | Rotormitte = `chest` (y − 44), Düsen auf Ringradius, Strahlen in Weltrichtung (Tiefenkomponente wie heute) |
| Layer | `tide_rotor_back` hinter, `tide_rotor_front` vor dem Sprite (vorhandene `back`/`front`-Layer der Stance) |
| LOD | niedrig: keine Tropfen, 4 statt 8 Rotationsframes |

---

## 3. Asset-Plan

| Asset-Gruppe | Vorhanden | Selbst erzeugbares Test-Asset | Finales Artwork |
|---|---|---|---|
| Sekundär-FX (Funken, Rauch, Splash, Eis-Puff, Geröll, Flamme) | ja (`fx_spark`, `fx_smoke`, `fx_splash`, `fx_ice`, `fx_rubble`, `fx_flame`, `fx_lava_bubble`) | – | bei Bedarf überarbeiten |
| Eiszacken: Spikes v1–v6, Riss, Splitter, Hit, Cast-Puff | nein | ja — Pixel-Generator (`generate_fx_sprites.cjs`-Stil) + `.aseprite`-Quellen über Aseprite-MCP | **Finales Artwork fehlt** |
| Meteor: Körper, Risse, Trail, Telegraph, Flash, Ring, Brocken, Krater | nein | ja (wie oben) | **Finales Artwork fehlt** |
| Tidenbohrer: Rotor vorn/hinten, Düsen, Jet-Körper/-Kopf, Hit, Tropfen, Gather, Burst | nein | ja (wie oben) | **Finales Artwork fehlt** |
| Wirker-Cast-Posen | nein (nur bestehende Sheet-States) | additive Arm-/Waffen-Offsets + Hand-Sprites | optional später |

**Ehrlich zur Qualität:** Selbst erzeugte Test-Assets (programmatisch gepixelt, Aseprite) erreichen saubere, konturierte, opake Formen mit klarer Licht-Hierarchie — damit lässt sich die Pipeline und die Lesbarkeit beweisen. Sie ersetzen **kein** professionelles Pixel-Art-Artwork. Optional: Konzeptentwürfe per Bildgenerator (z. B. Codex ImageGen über die lokal installierte Codex-CLI) als Referenz-Ebene → Cleanup in Aseprite. Jeder Generator-Aufruf läuft über das OpenAI-Konto des Projektinhabers (nur nach Freigabe).

---

## 4. Implementierungsplan (risikoarm)

**Schritt 0 — Infrastruktur (klein, ohne Verhaltensänderung)**
1. `spell_visuals.js`: Registry `registerSpellVisual(key, { sheets, render(ctx, spell, opts) })`; Schlüssel = Spell-ID / Signatur-ID. In den drei betroffenen `render()`-Methoden ein Einzeiler `if (renderSpellVisual(ctx, this)) return;` → sonst unveränderter alter Renderer (Fallback).
2. Sheet-Loader erweitern (`fx_sprites.js`): neue Sheets + Metadaten (`pivot`, `anchor`, `frameDuration`, `events`) aus einer Manifest-Datei; ohne geladenes Bild → `false` (Tests bleiben grün).
3. Debug-Schalter: `?vfx=main` (nur Hauptkörper, Sekundär-FX aus), `?hitbox=1` (zeichnet für die Piloten die echten Trefferflächen aus der Logik), Qualitätsstufe `low/high`.

**Schritt 1 — Asset-Erzeugung**
4. `art/authoring/generate_spell_sprites.cjs` (gleiches Verfahren wie der FX-Generator) + `.aseprite`-Quellen je Pilot unter `art/authoring/spells/`; Export nach `public/assets/sprites/spells/` + `spell_sprites_manifest.json`. Alle als „Testasset“ markiert.

**Schritt 2 — Drei Vertical Slices (je ein Commit, je mit Abnahme-Material)**
5. A Eiszacken → 6. B Meteor → 7. C Tidenbohrer. Jeweils nur Visual-Code, der vorhandene Timer/Zustände liest; keine Änderung an Schaden, Timing, Hitbox, Plattformhöhe (Ausnahme Meteor: rein visueller Telegraph + `triggerHitstop` beim Impact — wird separat zur Freigabe vorgelegt).

**Schritt 3 — Abnahme je Pilot**
8. Vorher/Nachher aus identischer Kamera (Katalog-Werkzeug `tools/catalog`, gleiche Szene), 0,25×-Zeitlupen-Bildfolge bzw. GIF (CDP-Screencast → Aseprite `export_gif`), Render „nur Hauptkörper“, Hitbox-Overlay, zwei Klassen/Waffen, beide Richtungen, Boden + Sprung, 5 gleichzeitige Instanzen mit Frame-Time-Messung; bestehende Tests + neue Tests (Fallback ohne Sheets, Phasen-Mapping).

**Schritt 4 — erst nach Freigabe**
9. Gemeinsame Komponenten ableiten (Sequenz-Player, Anker-Auflösung, Material-Paletten), dann Rollout nach Visual-Klasse und Priorität: Basisspells → Fusionen → Spezialrunen → Arcane States → Waffen. Keine Massenumstellung vor Freigabe der Referenzqualität.

**Offene Entscheidungen für den Projektinhaber**
- Meteor: darf der rein visuelle Telegraph + Impact-Hitstop dazukommen? (ändert kein Schadensverhalten, aber das Spielgefühl)
- Test-Assets selbst pixeln vs. zusätzlich Konzeptentwürfe per Codex ImageGen erzeugen lassen.
- Zielauflösung der Spell-Sprites: Welt-Scale 2 (wie bestehende FX) — bestätigen.
