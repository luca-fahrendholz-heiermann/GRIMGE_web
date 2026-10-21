# GRIMGE – VFX-Pixelstil (Stand 21.10.2026)

Vorlage: die Charakter-Designs des Users (vier Referenzbilder vom 20.10.2026):
- muskulöse Grundfigur
- Barbar mit Hörnerpanzer
- Totenkopf-Krieger mit violetten Flammen und Klinge
- grün-goldene Rüstung mit Zauberkreis und Lichtstrahlen

Die Zauber müssen optisch zu diesem Pixel-Art-Stil passen.

## Merkmale der Vorlagen → Regeln für jeden Effekt

| Vorlage | Regel im Code |
|---|---|
| Jede Form hat eine **dunkle, farbig getönte Kontur** (die lila Flamme einen dunkellila Rand) | Automatisch: `renderPixelated` (abilities.js) legt um alles in der Effekt-Ebene eine 1-Pixel-Kontur in abgedunkelter Eigenfarbe (`PIXEL_OUTLINE`). Neue Effekte zeichnen deshalb **keine eigenen schwarzen Ränder**. |
| **Harte Pixelkanten**, keine weichen Verläufe | Effekte laufen durch die Pixel-Ebene (`addSpell` → `renderBatch`). Keine `createRadialGradient`-Glows und keine großen `shadowBlur`-Flächen. |
| **3–4 Farbstufen** je Effekt: dunkel, Grundton, hell, **kleiner** weißer Kern | Paletten als Ramp angeben (z. B. Feuer `#b71c1c → #ff5a1f → #ffb300 → #fff1c2`). Weiß nur für Kern, Funken und Kanten, nie als große Fläche. Additive (`lighter`) Überlagerung sparsam einsetzen, sonst wird alles weiß. |
| **Funken als Pixel-Cluster** und Strahlenkränze | Kleine Quadrate von 2–4 px und kurze Striche statt runder Partikel. |
| **Zauberkreis** am Boden beim Wirken | Automatisch: Jeder gewirkte Zauber zeigt `CastCircleFx` (cast_circle.js) in der Zauberfarbe. Große Sonderrunen bekommen einen größeren Kreis mit Hexagramm. |
| Figuren sind **scharf**, nie verpixelt | Was wie eine Figur aussieht (Doppelgänger, Beschwörungen), wird als Akteur gezeichnet (`actorEntries`), nicht in der Effekt-Ebene. |
| Effekte sitzen **am Körper** (Flamme an der Hand, Aura an den Füßen) | Ladeeffekte an der Hand bzw. Waffe, Auren am Boden unter der Figur, gut lesbar vor dem Sprite. |

## Bildschirm-Feedback

Wackeln und Hitstop gibt es nur beim **echten Aufprall** und skaliert mit der Wucht: leichter Wirbel wenig, Durchschlag oder Meteor viel.

Beim reinen Wirken gibt es kein pauschales Wackeln mehr. Nur große Sonderrunen bekommen einen kleinen Ruck.

## Kein weiches Leuchten

In der Pixel-Ebene der Effekte ist `shadowBlur` abgeschaltet. Jeder Effekt behält harte Kanten, und der Konturpass umrandet ihn.

## Goldener Strahlenkranz (Vorlage 4)

`RayCrownFx` in `cast_circle.js` zeigt 14 Strahlen hinter der Figur, abwechselnd lang in Gold und kurz in Weiß, dazu kreisende Funken. Er erscheint:

- bei Licht-Zaubern (Lux)
- beim Start der Sonnenatmung und beim Sonnen-Mal
- bei den heiligen Arcane States A01 und T40

## Pixel-Helden

Thesen und Xame stammen aus Pixel-Snapper-Exporten (1 Pixel = 1 Art-Pixel). Aufbereitet werden sie mit `node tools/prepare_pixel_characters.cjs --snapped [Ordner]`: harte Alpha-Kante, ein gemeinsamer Ausschnitt, die Varianten werden automatisch aufeinander ausgerichtet.

Im Spiel werden sie ohne Glättung gezeichnet, sobald ein Art-Pixel mindestens einen Bildschirm-Pixel abdeckt. Liegt die Skalierung nahe an einer ganzen Zahl, rastet sie darauf ein, damit jeder Art-Pixel gleich groß ist. Im Hub werden sie mit `image-rendering: pixelated` angezeigt.

## Noch offen

- Bestehende ältere Effekte nach und nach auf Farbstufen und kleine weiße Kerne umstellen.
