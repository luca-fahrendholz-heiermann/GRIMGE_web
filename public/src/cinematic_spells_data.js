// GRIMGE Prototype — the four cinematic special runes (user spec 16 Nov 2026): S96 INFERNOAUSBRUCH, S97 ARKANSTRUDEL,
// S98 GRÜNES ERWACHEN, S99 ELEMENTARTOR. Hand-written in the schema of the generated signature_runes_data.js (which is
// not edited); signature_data.js appends them. Original GRIMGE designs from the described effect categories — no copies of
// names, visuals or behaviour of other games. Mana, tier 3 and epic rarity follow the spec: 48 / 46 / 44 / 42.
export const CINEMATIC_RUNE_DATA = Object.freeze([
  {
    id: 'S96', name: 'Infernoausbruch', group: 'Z · Kinematische Zauber', systemType: 'Flächenzauber', duration: 3, targeting: 'ground', mana: 48,
    palette: ['#2a0a05', '#ff5a1f', '#ffd24a', '#fff4c2'],
    howTo: 'Tap its slot, then the spot where it should erupt. The ground glows and cracks for half a second while sparks are pulled in, then a white-hot core bursts upward: one heavy hit with knockback and burning for everyone in the circle, a ring of fire races outward, and embers, smoke and burning ground remain for a few seconds.',
    roles: 'Alle Klassen.', inspiration: 'Eigene Umsetzung der beschriebenen Eruptions-Kategorie.',
    identity: 'Magma-Orange mit weißem Kern, schwarze Risse, Asche und Glut; kein gerader Strahl.',
    anim: [
      'Der Boden glimmt orange auf und reißt in Strahlen; Funken und kleine Flammen werden zur Mitte gezogen.',
      'Ein weißglühender Kern bricht in gelben und orangen Flammenmassen nach oben.',
      'Eine kreisförmige Feuerfront läuft über den Boden nach außen.',
      'Rauch, Glut und verbrannter Boden bleiben zurück; der Boden brennt noch kurz.'
    ],
    arena: 'Entzündet Fässer und Kisten, lässt Pflanzen verbrennen und hinterlässt brennenden Boden.',
    synergy: 'Wasser löscht den brennenden Boden; Wind trägt die Glut weiter.',
    counterplay: 'Eine halbe Sekunde sichtbares Aufglühen vor dem Treffer: aus dem Kreis laufen oder springen. Der Hauptschaden fällt genau einmal.',
    contract: 'Eigene Zauber-Entität mit Phasen Aufladen / Einschlag / Nachwirkung; ein Haupt-Hitstop; Brennen und Boden über status_effects und environment.'
  },
  {
    id: 'S97', name: 'Arkanstrudel', group: 'Z · Kinematische Zauber', systemType: 'Kontrollzauber', duration: 3.2, targeting: 'ground', mana: 46,
    palette: ['#150a2e', '#5b2bd6', '#b98cff', '#f1e4ff'],
    howTo: 'Tap its slot, then the target spot. A violet core forms above it, rings turn at different speeds and bolts spiral inward while enemies in reach are pulled toward the centre and held nearly still near the core. The core compresses and releases one pulse that hurls the survivors outward.',
    roles: 'Alle Klassen.', inspiration: 'Eigene Umsetzung der beschriebenen Strudel-Kategorie.',
    identity: 'Tiefes Violett mit hellen Ringen, kein Loch im Boden, sondern ein schwebender Kern.',
    anim: [
      'Ein violetter Kern entsteht über dem Zielpunkt.',
      'Mehrere Ringe drehen sich unterschiedlich schnell; Partikel und Blitze werden eingezogen.',
      'Der Kern verdichtet sich — kurz still.',
      'Eine Pulsentladung schleudert alles nach außen; Ringe verblassen.'
    ],
    arena: 'Bewegliche Szenenobjekte rutschen mit zur Mitte und werden von der Entladung weggestoßen.',
    synergy: 'Gegner in der Mitte sind ein Ziel für Flächenzauber.',
    counterplay: 'Gut sichtbare Anziehung: gegen die Zugrichtung laufen oder springen; die Entladung trifft nur, wer nahe am Kern bleibt.',
    contract: 'Eigene Zauber-Entität; Zug und Verlangsamung deterministisch, ein Haupttreffer bei der Entladung.'
  },
  {
    id: 'S98', name: 'Grünes Erwachen', group: 'Z · Kinematische Zauber', systemType: 'Feldzauber', duration: 7, targeting: 'ground', mana: 44,
    palette: ['#0e2410', '#2f8f3a', '#9be564', '#eaffc8'],
    howTo: 'Tap its slot, then the target spot. Green veins run through the ground, then roots and vines burst out: enemies caught are rooted. A green pulse follows with leaves and spores and leaves a living field behind that heals allies, slows enemies and makes plants nearby grow.',
    roles: 'Alle Klassen.', inspiration: 'Eigene Umsetzung der beschriebenen Erwachens-Kategorie.',
    identity: 'Leuchtende grüne Energieadern, Wurzeln und Ranken, Blätter und Sporen; kein Weltenbaum.',
    anim: [
      'Grüne Energieadern laufen über den Boden zur Mitte.',
      'Wurzeln und Ranken brechen hervor.',
      'Ein heller grüner Impuls breitet sich mit Blättern und Sporen aus.',
      'Ein lebendes Feld bleibt einige Sekunden bestehen.'
    ],
    arena: 'Setzlinge und Jungbäume in der Nähe wachsen; das Feld verlangsamt jeden Gegner darin.',
    synergy: 'Mit Feuer brennt das Feld nicht ab, aber Pflanzen darin verdorren.',
    counterplay: 'Das Verwurzeln trifft nur, wer beim Ausbruch im Kreis steht; das Feld lässt sich verlassen.',
    contract: 'Eigene Zauber-Entität mit Ausbruch → Feld; Wurzeln über slow, Heilung als begrenzte Ticks.'
  },
  {
    id: 'S99', name: 'Elementartor', group: 'Z · Kinematische Zauber', systemType: 'Beschwörung', duration: 14, targeting: 'self', mana: 42,
    palette: ['#101a2e', '#3d6fb5', '#cfe7ff', '#ffffff'],
    howTo: 'Cast it and a gateway ring materialises in front of you, glyphs circle it, a spinning plane fills it — and it opens with a pulse of light. Out comes one familiar that fits your element: wolf of spirit or storm, void spider, rune golem, beast, an ember familiar or a ward guardian. A hit on you before it opens breaks the cast.',
    roles: 'Alle Klassen.', inspiration: 'Eigene Umsetzung der beschriebenen Tor-Kategorie.',
    identity: 'Ein schlanker Ring aus Licht mit wandernden Zeichen und einer drehenden Fläche; die Farbe folgt dem Element.',
    anim: [
      'Ein durchsichtiger Ring materialisiert sich.',
      'Zeichen laufen über den Ring.',
      'Eine rotierende Energiefläche füllt ihn.',
      'Mit einem Lichtimpuls öffnet sich das Tor und entlässt ein Wesen.'
    ],
    arena: 'Kein Teleport: das Tor beschwört ein zeitlich begrenztes Wesen, das nach den normalen Beschwörungsregeln kämpft.',
    synergy: 'Elementrunen kurz vorher bestimmen, welches Wesen erscheint.',
    counterplay: 'Wird der Zauberer vor dem Öffnen getroffen, bricht das Tor ab. Das Wesen ist begrenzt und sterblich.',
    contract: 'Beschwörungs-Entität mit expliziter Elementtabelle; unterbrechbar; keine dauerhafte Freischaltung.'
  }
]);
// The arena point cost of each (strong special runes: 3 points, user spec).
export const CINEMATIC_ARENA_COST = 3;
