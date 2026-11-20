# GRIMGE – Was fehlt bis zum fertigen Produkt (Mobile, PC, Konsole)

Stand: 20. Nov 2026. Ehrliche Einschätzung, was der Prototyp heute ist und was ein marktreifes Spiel braucht.
Dazu steht jeweils, was davon ich (Claude Code) selbst umsetzen kann und was von dir kommen muss.

## Heute

Ein spielbarer Web-Prototyp (Canvas 2D, PWA):
- ~1270 automatische Tests
- Modi: Kronenkrieg, Arena, Dungeon, Basis, Training, Kampagne
- Runen- und Zeichensystem, Fraktionen und Dino-Drachen, Burgen, Weltkarte

Die Grafik ist eine Mischung aus programmierten Pixel-Formen, wenigen gemalten Sprite-Bögen und Einzelbildern (Dino-Drachen). Ton kommt nur aus einfachen Synth-Klängen.

## 1. Grafik und Animation (größter Hebel)

| Was | Warum | Wer |
|---|---|---|
| Einheitlicher Sprite-Stil für alle Figuren mit Animationen: idle, laufen, Angriff 1–3, getroffen, Tod, Zauber; 8–12 Bilder je Bewegung | Heute stehen viele Figuren als Standbild oder grobe Pose da; das ist der Unterschied zwischen Prototyp und Produkt | Pixel-Artist **oder** KI-Generierung mit Nachbearbeitung. Dafür braucht es Budget (Higgsfield-Bezahlplan oder Freelancer). Einbau, Schnitt und Abspiel-System übernehme ich. |
| Dino-Drachen als Animations-Bögen (alle in einheitlicher Blickrichtung und Größe) und die 12 Hybride | Die Einzelbilder wirken jetzt durch Atmen und Ausfall; echte Läufe und Signaturangriffe fehlen | wie oben |
| Burgen, Häuser und Kacheln in einem Guss; Biome mit Übergangskacheln | Heute sind Burgen programmiert gezeichnet und die Biomkanten blockig | Artist / KI. Die Kachel-Logik baue ich. |
| Effekte (VFX) je Element in der Qualität von „Tide v3“ für alle Zauber | Ist teilweise schon so, aber uneinheitlich | Ich, Stück für Stück, mit deinen Referenzen |

## 2. Ton

- **Musik:** Erkundung je Biom, Kampf, Burg, Boss, Menü. Dynamische Übergänge baue ich.
- **Geräusche:** Schlag und Treffer je Waffe, Element-Zauber, Schritte je Boden, UI-Klicks, Kreaturen (Dino-Gebrüll), Burgen.
- **Woher:** lizenzierte Bibliotheken (kommerzielle Packs), ein Sounddesigner oder KI-Audio mit Prüfung der Rechte. Die Mischung (Lautstärken, Ducking, Raumklang, Handy-Optimierung) übernehme ich.

## 3. Oberfläche (professionelle UI)

- **UI-Design** mit festem Stil (Schriften, Rahmen, Symbole, Farben): als Figma-Entwurf von einem UI-Designer oder als Vorgaben aus deinem `/editor.html`. Die Umsetzung mache ich.
- **Abläufe:** Startmenü, Charakterwahl, Burgmenü, Armee-Bildschirm (Stapel ziehen und teilen), Einstellungen, Pause, Ergebnis.
- **Drei Bedienarten:** Touch, Controller (komplette Menü-Navigation mit Fokus) und Maus/Tastatur. Controller-Navigation fehlt heute in den DOM-Menüs; das baue ich.
- **Barrierefreiheit:** Textgröße, Farbenblind-Modi, Untertitel, frei belegbare Tasten.
- **Sprache:** Deutsch und Englisch. Heute sind die Texte fest im Code; ein Sprachsystem baue ich, für Übersetzungen braucht es einen Übersetzer.
- **Einführung:** ein Tutorial, das Zeichnen, Runen, Burgen und Armee Schritt für Schritt beibringt.

## 4. Plattformen

| Plattform | Weg | Was du brauchst |
|---|---|---|
| Handy (iOS/Android) | PWA geht heute; für die Stores ein Wrapper (Capacitor) | Apple-Entwicklerkonto (99 $/Jahr), Google-Konto (25 $), Testgeräte |
| PC | Electron oder Tauri plus Steamworks | Steam-Zugang (100 $ je Spiel) |
| Konsole | Ein Browser-Spiel lässt sich nicht direkt auf Konsolen bringen: nötig ist ein Port, z. B. in die Unity-Referenz (`C:\Dev\unity_projects\GRIMGE`) oder eine native Engine | Entwickler-Lizenzen bei Nintendo/Sony/Microsoft (meist über einen Publisher), Devkits, Zertifizierung |

## 5. Online (PvP, Konten)

Server mit verbindlicher Spiellogik (autoritativ), Matchmaking, Konten, Cloud-Spielstände, Schutz gegen Betrug und Ranglisten.
Ich kann den Server und die Netzwerk-Synchronisation bauen. Du musst entscheiden, wo er läuft (Hosting-Kosten) und ob PvP zum Start gehört.

## 6. Qualität und Balancing

- Spieltests mit echten Spielern und eingebaute Messwerte: wo sterben Spieler, wie lange dauert eine Runde.
- Gerätematrix (alte Handys!), Absturzberichte, Ladezeiten.
- Das Bauen fürs Ausliefern: Code bündeln und verkleinern, Bilder komprimieren. `main.js` ist sehr groß und sollte aufgeteilt werden.

## 7. Geschäftliches und Recht

- Name und Marke prüfen, Altersfreigabe (USK/PEGI/IARC), Datenschutz (DSGVO), Bezahlmodell (Kauf, Free-to-play, Kosmetik), Store-Seiten und Trailer.
- Bei KI-Grafik und KI-Ton die Nutzungsrechte klären.

## Was ich jetzt von dir brauche, um weiterzumachen

1. **Fokus:** zuerst Handy, PC oder beides? Konsole später über einen Port?
2. **Budget für Grafik und Ton:** Bezahlplan für KI-Generierung, Freelancer oder lizenzierte Packs.
3. **Ein UI-Entwurf oder ein Stil-Referenz-Board** (Figma oder `/editor.html`), damit die Menüs einheitlich werden.
4. **PvP zum Start?** Davon hängt ab, ob ein Server gebraucht wird.
5. **Spieltests:** Videos wie heute helfen enorm. Ich kann sie jetzt Bild für Bild auswerten, auch die iPhone-Aufnahmen.
