# GRIMGE – Kombo und Finisher (Stand 23.10.2026)

Die Mechanik ist an die Unity-Version angelehnt (`ComboTimingGuide`, `PunchAbilityDefinition`: FollowUpPeakTick sowie die Breite des Perfect- und Good-Fensters).

## Ablauf

**Ring und Schriftzüge (PERFEKT, FINISHER, ZU FRÜH, ZU SPÄT) gibt es nur im Trainingsmodus.** In echten Matches erkennt man das Fenster am Timing und am kurzen Hitstop nach dem letzten Kettentreffer. Rückstoß, Goldwelle und Ruck des perfekten Finishers bleiben überall.

1. **Kette:** Bei jeder Waffe gibt es **genau 3 normale Angriffe**. Die Kette läuft nur weiter, wenn der Angriff trifft. Ein Fehlschlag beginnt sie von vorn.
2. **Hitstop:** Angriff 3 trifft schwerer als die ersten beiden: längerer Hitstop, ein kleiner Ring am Ziel, ein Ruck.
   - Danach holt der Held sichtbar aus (lehnt sich zurück, sammelt sich).
   - Im richtigen Moment blitzt die Waffe in der Hand auf, im perfekten Moment heller.
   - Diese Hinweise gehören zur Szene und gibt es in jedem Modus.
3. **Chance:** Über dem Kopf erscheint ein Ring.
   - Ein innerer Ring wächst auf den Zielring zu. Das grüne Band ist das GOOD-Fenster.
   - Genau auf dem Zielring wird er golden und zeigt „PERFEKT JETZT“.
4. **Finisher:**
   - Ein Druck im grünen Band löst den FINISHER aus: stärker als der Kettenangriff, mit weitem Rückstoß und Aufwurf.
   - Im goldenen Moment wird es **PERFEKT**: ×1,3 Rückstoß, +15 % Schaden, bricht die Abwehr, mit Goldwelle und Ruck.
   - Ein Druck knapp vor dem Fenster wird gemerkt und löst beim Öffnen aus.
   - Wildes Drücken direkt nach dem Treffer zählt als **ZU FRÜH**, ein Druck nach dem Band als **ZU SPÄT**. In beiden Fällen gibt es keinen Finisher. Der Druck geht aber nicht verloren: Sobald der Schwung endet, beginnt flüssig wieder **Angriff 1**, ohne Stocken.
   - **Waffen-Finisher:** Speer, Glefe und Geisterglefe machen eine **Stichsalve** (5 bis 6 schnelle Stiche, der letzte schleudert). Dolche, Klauen und Fäuste machen einen Hagel aus schnellen Treffern. Die anderen Waffen nutzen ihren verstärkten Schlag.

Alle Waffen haben 3 normale Angriffe plus Finisher. Längere Waffenkombos nehmen ihre ersten drei Schritte, kürzere wiederholen einen Schritt. Bei Fernkampfwaffen ist der Finisher ein großer, durchschlagender Schuss.

Der Finisher ist der bisherige letzte Angriff der Waffe, verstärkt. Der letzte Kettenangriff schleudert nicht mehr weg, damit der Finisher folgen kann.

## Abzweige per Wischen (umgesetzt)

| Folge | Geste | Ergebnis |
| --- | --- | --- |
| A1 (oder A2 / A3) → | **Wischen hoch** | **Hochschlag-Abzweig**: Der Gegner fliegt höher als beim normalen Hochschlag, der Held bleibt unten und kann nachsetzen. |
| A1 A2 → | **Wischen vorwärts** | **Rundumfeger**: ein weiter Schwung rundherum, trifft auch hinten. |
| A1 A2 A3 → | **Wischen vorwärts** | **Schockwelle** der Waffe (Fernwaffen: eine Salve). |
| A1 A2 A3 → | **Tippen im Takt** | **Finisher** (wie bisher) |
| aus dem Stand | Wischen | normaler schwerer Angriff (wie bisher) |

**Nachsetzen nach dem Hochschlag-Abzweig:**
- Trifft der Hochschlag, öffnet sich ein kurzes Fenster (0,45 s), in dem der Held geduckt sprungbereit steht.
- **Tippen** im Fenster: Er springt dem Gegner hinterher und schlägt sofort zu. Weiteres Tippen setzt die Luftkombo fort.
- **Springen** geht auch von Hand.
- **Ohne Tipp** passiert nichts von selbst; man muss sich aktiv entscheiden.
- **Grenzen gegen Einseitigkeit:** Der Abzweig kommt einmal pro Kette, in der Luft gibt es höchstens 3 Treffer pro Sprung (Luft-Latch). Danach fällt der Gegner.

Halten bleibt unverändert für Aufladen (Halten + Ziehen) und die HOLD-Fähigkeit (Halten ohne Ziehen). So hat keine Geste zwei Bedeutungen.

## Sturz in Laufrichtung

- Ein Wischen nach unten in der Luft folgt dem **Winkel** des Wischens. Flach gewischt stürzt flach, steil gewischt stürzt steil. Es wird nicht mehr auf den nächsten Gegner gezielt.
- Nach einem Sprint-Sprung bleibt der Sturz immer schräg (mindestens etwa 30°).
- **Aufladen in der Luft** (Halten und Ziehen, oder K mit Richtung): Vorwärts oder runter löst den schrägen Sturz in Laufrichtung aus. Nach einem normalen Sprung fällt Runter fast gerade.
