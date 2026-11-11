# GRIMGE – Design Bible

Stand: 11. Nov 2026. Spielmechanik und Entscheidungen stehen ausführlich in `DESIGN.md`, `AGENDA.md`,
`RUNE_SPELL_MASTERY_CANON.md` und `TRANSFORMATION_SYSTEM_CANON.md`. Dieses Dokument bündelt Welt, Geschichte und
Kampagne.

> **Wichtig:** Vor diesem Dokument gab es keine festgelegte Geschichte. Alles unter „Welt“ und „Geschichte“ ist ein
> **Vorschlag**, der zu dem passt, was im Spiel schon existiert (Figuren, Runen, Bannrand, Abgrund, Burgen,
> Glutfürst). Nichts davon ist Kanon, bevor du es freigibst.

## Kern des Spiels (feststehend)

- 2,5D-Pixel-Art-Kampfspiel: Nahkampf-Combos plus **Runen zeichnen** für Zauber.
- Drei Ressourcen: **HP, Mana, Fokus**. Balance nur über Mana und Fokus.
- Deck aus Runenkarten, Klassen = Waffenfamilien, Mastery-Bäume, Transformationen (Fokus-Form, Arcane States,
  Primal-Bund, Bankai).
- Modi: Castle Siege, Invasion, Dungeon, Arena (Riss + Leben), Training – und jetzt die Kampagne, die sie verbindet.

## Welt (Vorschlag)

- **Die Runenlande:** Reiche, deren Macht auf gezeichneten Runen beruht. Jede Rune ist ein Stück gebundener
  Naturkraft; wer sie sauber zeichnet, ruft sie.
- **Der Abgrund:** eine Wunde in der Welt, aus der Wesen ohne feste Gestalt kriechen (Leerenräuber).
- **Der Bannrand:** ein Runenkreis, der den Abgrund seit dem Runenkrieg verschließt. Derselbe Bann begrenzt die
  Arenen – dort wird er zum Regelwerk („Riss“, „Bannrand“, „Seelenfunken“).
- **Wachfesten:** Burgen entlang des Bannrands (Kareth, Halvar). Ihre Türme speisen den Bann.
- **Siegelsplitter:** Bruchstücke des Banns. Wer drei besitzt, kann ihn neu schmieden – oder ganz öffnen.

## Figuren

| Figur | Rolle | Motivation (Vorschlag) |
|---|---|---|
| **Thesen**, der Gehörnte Krieger | Held | Letzter Wächter von Kareth; will den Bann schließen und wissen, wer ihn brach |
| **Xame**, der Schädelhexer | Rivale | Hält den Bann für einen Käfig; will sehen, was dahinter liegt – kein reiner Feind |
| **Der Glutfürst** | Boss Kapitel 1 | Brach den Bann von innen; war aber nur „der, der geantwortet hat“ |
| **Die Stimme im Abgrund** | Antagonist ab Kapitel 2 | Das, was gerufen hat – bisher nur ein Auge in der Tiefe |

## Geschichte

**Zentraler Konflikt:** Der Bann bricht. Schließen (Thesen) oder öffnen (Xame) – und wer hat ihn wirklich gebrochen?

### Kapitel 1 – Der gebrochene Bann (spielbar, Campaign Alpha 0.1)

| # | Mission | Modus | Was der Spieler lernt | Erzählung |
|---|---|---|---|---|
| 1 | Asche über Kareth | Dungeon (erste Halle) | Bewegung, Nahkampf, Runen finden, Treppen | Kareth ist gefallen; der Bann wurde von innen gebrochen; erster Siegelsplitter |
| 2 | Die Mauer hält | Invasion (Level 1) | Deck, Türme, Wellen, erster Anführer | Die Wellen folgen einem Befehl; ein Beobachter am Rand |
| 3 | Der Schädelhexer | Arena (Riss-Regeln) | Duell, Riss, Bannrand, Abgrund | Rivale Xame; er nennt den Glutfürsten |
| 4 | Sturm auf die Aschenfeste | Castle Siege | Lane, Türme, Burg | Der Weg in die Tiefe; dritter Splitter |
| 5 | Der Glutfürst | Dungeon (Garde + Boss) | Alles zusammen, Bosskampf | Sieg – und der Haken: etwas im Abgrund öffnet ein Auge |

Jede Mission hat Einleitung, Ziel, Abschluss und eine Belohnung (XP, Skillpunkte). Die Texte stehen in
`public/src/campaign_data.js`.

### Ausblick (nicht gebaut, keine Assets dafür erzeugen)

- **Kapitel 2 – Die Stimme:** hinab in den Abgrund; neue Gegner (formlose Wesen), Xame als unsicherer Verbündeter.
- **Kapitel 3 – Der Runenkrieg:** warum der Bann geschmiedet wurde; Fraktionen der Runenlande.
- **Kapitel 4 – Neu schmieden oder öffnen:** die Entscheidung; zwei Enden möglich.

## Dialog-Grundsätze

- Kurz: zwei bis drei Sätze pro Sprecher, zwei bis vier Zeilen pro Szene.
- Thesen spricht knapp und konkret; Xame spöttisch, aber ehrlich; der Erzähler sachlich.
- Jede Szene liefert einen Grund für die nächste Mission.

## Fortschritt in der Kampagne

- Missionen schalten sich der Reihe nach frei und bleiben wiederholbar.
- Belohnungen einmalig: XP und Skillpunkte; Boss-Drops für späte Runen laufen über das bestehende System.
- **Sterne:** 1–3 pro Mission (geschafft · mindestens halbes Leben bzw. zwei Seelenfunken · in der Zielzeit); die beste
  Wertung zählt; je 5 Sterne ein Bonus-Skillpunkt. Stufe und XP-Leiste stehen auf dem Kampagnen-Bildschirm.
- Geplant: Runen-Funde und Mastery-Freischaltungen als Missionsbelohnung, Geheimnisse (siehe `DESIGN.md` §6).
