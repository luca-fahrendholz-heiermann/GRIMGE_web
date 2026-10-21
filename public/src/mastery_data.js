// GRIMGE Prototype — Mastery tree data (pure, no combat imports: the profile,
// the skill tree UI and the build analyzer read it). Effects: mastery.js.
// Adapted from the GDD "Modulares Runen-, Mastery- und Build-System".

// ── Trees (implemented branches; names / texts adapted from the GDD) ─────
export const MASTERY_TREES = Object.freeze({
  fulgur: { name: 'Fulgur · Blitz', color: '#fff176', branches: {
    chain: { name: 'Kette', tiers: ['Blitztreffer springen auf 1 weiteres Ziel (50 % Schaden).', '2 Sprünge, größere Sprungweite.', 'Sprünge bevorzugen nasse Ziele.', '70 % des Schadens bleiben pro Sprung erhalten, 3 Sprünge.'] },
    discharge: { name: 'Entladung', tiers: ['Status-Kombos entladen einen kleinen Blitz auf ein Nachbarziel.', 'Kürzere Abklingzeit der Entladung.', 'Schildtreffer lösen elektrische Vergeltung aus.', 'Entladungen dürfen die Kette nutzen (aber keine neue Entladung).'] },
    overload: { name: 'Überladung', tiers: ['Jeder 5. Blitz-Treffer lähmt das Ziel.', 'Jeder 4. Blitz-Treffer.', 'Gelähmte Ziele nehmen 20 % mehr von Blitz-Treffern.', 'Jede Überladung gibt dir 5 Mana.'] }
  } },
  natura: { name: 'Natura · Natur', color: '#9ccc65', branches: {
    leech: { name: 'Lebensentzug', tiers: ['Natura-Treffer heilen 2 HP.', '3 HP je getroffenem Ziel.', 'Auch periodischer Schaden deiner Status heilt (halb).', 'Ketten- und Folgetreffer heilen mit abnehmendem Ertrag.'] },
    thorns: { name: 'Dornen', tiers: ['Natura-Treffer vergiften garantiert.', 'Das Gift hält länger.', 'Vergiftete Ziele sind verlangsamt.', 'Natura-Treffer auf vergiftete Ziele +25 %.'] },
    growth: { name: 'Wachstum', tiers: ['Natura-Treffer heilen den nächsten Verbündeten um 3 HP.', '5 HP.', 'Zwei Verbündete.', 'Geheilte Verbündete erhalten 8 Schildpunkte.'] }
  } },
  aqua: { name: 'Aqua · Wasser', color: '#4fc3f7', branches: {
    soak: { name: 'Durchnässen', tiers: ['Wasser-Treffer machen garantiert nass.', 'Nässe hält länger.', 'Schock / Schockfrost verbrauchen die Nässe nicht mehr.', 'Wasser-Treffer verbreiten Nässe auf Nachbarziele.'] },
    tide: { name: 'Flut', tiers: ['Wasser-Treffer geben dir 2 Mana.', '3 Mana.', 'Treffer auf nasse Ziele geben doppelt Mana.', 'Mit über 80 % Mana treffen Wasser-Treffer 20 % härter.'] },
    frost: { name: 'Frost', tiers: ['Wasser-Treffer auf nasse Ziele verlangsamen.', 'Stärker und länger verlangsamt.', 'Jeder 3. Treffer auf ein nasses Ziel friert es 0,6 s ein.', 'Eingefrorene Ziele nehmen 30 % mehr von deinen Treffern.'] }
  } },
  ignis: { name: 'Ignis · Feuer', color: '#ff7043', branches: {
    burn: { name: 'Brand', tiers: ['Feuer-Treffer setzen garantiert in Brand.', 'Brand hält länger.', 'Brand springt beim Entzünden auf ein Nachbarziel über.', 'Erneute Feuertreffer verlängern den Brand (bis 8 s).'] },
    inferno: { name: 'Feuersbrunst', tiers: ['Feuer-Treffer auf brennende Ziele +15 %.', '+25 %.', 'Brennende Ziele explodieren beim Feuer-Treffer (8 Schaden ringsum, 1× pro Sekunde je Ziel).', 'Die Explosion setzt die Nachbarn in Brand.'] },
    ember: { name: 'Glut', tiers: ['Ticks deines Brandes geben dir 1 Mana.', '2 Mana.', 'Sie heilen dich zusätzlich um 1 HP.', 'Sie laden zusätzlich 1 Fokus.'] }
  } },
  terra: { name: 'Terra · Erde', color: '#bcaaa4', branches: {
    fortify: { name: 'Befestigen', tiers: ['Schilde erhalten +20 % Kapazität.', 'Mit Schild wirst du kaum noch unterbrochen.', 'Geblockte Treffer stoßen den Angreifer zurück.', 'Ein aufgeladener Angriff mit Schild verbraucht den Schild und wandelt ihn in Schaden um.'] },
    quake: { name: 'Beben', tiers: ['Jeder 4. Erd-Treffer löst ein Beben aus (6 Schaden ringsum).', 'Jeder 3., größerer Radius.', 'Beben werfen Gegner hoch.', 'Beben verlangsamen.'] },
    stoneskin: { name: 'Steinhaut', tiers: ['Nach einem Erd-Treffer nimmst du 2 s lang 10 % weniger Schaden.', '15 % weniger.', 'Mit Steinhaut wirst du kaum zurückgestoßen.', 'Steinhaut wirft 20 % des Nahkampfschadens zurück.'] }
  } },
  umbra: { name: 'Umbra · Schatten', color: '#b39ddb', branches: {
    sacrifice: { name: 'Opfer', tiers: ['Beim Schildwirken werden 15 % deiner HP geopfert und zu 150 % Schildkapazität.', '20 % HP → 175 % Kapazität.', 'Läuft der Schild ungebrochen aus, kehren 30 % der geopferten HP zurück.', 'Unter 30 % HP treffen deine Schatten-Treffer 25 % härter.'] },
    curse: { name: 'Fluch', tiers: ['Schatten-Treffer verfluchen das Ziel 4 s: deine Treffer darauf +10 %.', '+15 %.', 'Schatten-Treffer auf Verfluchte geben den Fluch an einen Nachbarn weiter.', 'Treffer auf Verfluchte heilen dich um 2 HP.'] },
    veil: { name: 'Nachtschleier', tiers: ['Nach einem Schatten-Treffer weichst du dem nächsten Nahkampftreffer aus (alle 6 s).', 'Alle 4 s.', 'Das Ausweichen schlägt zurück (8 Schaden).', 'Das Ausweichen gibt dir 8 Mana.'] }
  } },
  ventus: { name: 'Ventus · Wind', color: '#b2ebf2', branches: {
    displace: { name: 'Verdrängen', tiers: ['Wind-Treffer stoßen Gegner 30 % weiter.', 'Stoß 60 % weiter.', 'Weggestoßene Gegner sind 1 s verlangsamt.', 'Wer gegen einen anderen Gegner fliegt, verletzt beide (25 % des Treffers).'] },
    spread: { name: 'Ausbreiten', tiers: ['Wind-Treffer verwehen Brand, Gift oder Blutung auf 1 Nachbarziel.', '2 Nachbarziele, größerer Radius.', 'Auch Nässe und Lähmung werden verweht.', 'Verwehte Status halten voll statt 60 %.'] },
    gale: { name: 'Rückenwind', tiers: ['Wind-Treffer geben dir 1,5 s lang +10 % Tempo.', '+20 % Tempo.', 'Wind-Treffer geben 4 Ausdauer.', 'Mit Rückenwind treffen deine Nahkampftreffer 20 % härter.'] }
  } },
  lux: { name: 'Lux · Licht', color: '#ffe082', branches: {
    blessing: { name: 'Segen', tiers: ['Licht-Treffer geben dir 3 Schildpunkte (bis 30).', '5 Schildpunkte (bis 45).', 'Licht-Treffer verlängern deinen Schild leicht.', 'Licht-Treffer heilen 1,5 HP je Ziel.'] },
    purify: { name: 'Reinigung', tiers: ['Licht-Treffer lösen einen negativen Status von dir (alle 2 s).', 'Jede Reinigung heilt 5 HP.', 'Licht trifft brennende, vergiftete oder blutende Gegner 25 % härter.', 'Jede Reinigung sendet einen Lichtstoß (10 Schaden ringsum).'] },
    radiance: { name: 'Strahlen', tiers: ['Licht-Treffer blenden das Ziel 0,25 s (alle 3 s je Ziel).', 'Alle 2 s, 0,35 s lang.', 'Geblendete Ziele nehmen 20 % mehr.', 'Das Blenden springt auf ein Nachbarziel.'] }
  } },
  void: { name: 'Void · Leere', color: '#ce93d8', branches: {
    collapse: { name: 'Kollaps', tiers: ['Void-Treffer ziehen Gegner in der Nähe zum Ziel.', 'Stärkerer Sog, größerer Radius.', 'Eingesogene Gegner nehmen 4 Schaden.', 'Eingesogene Gegner sind 0,8 s verlangsamt.'] },
    nullify: { name: 'Annullieren', tiers: ['Void-Treffer entziehen 4 Mana, du erhältst die Hälfte.', '6 Mana pro Treffer.', 'Void-Treffer zerreißen 15 Schildpunkte des Ziels.', 'Ein Ziel ohne Mana kann 1,5 s nicht zaubern.'] },
    rift: { name: 'Riss', tiers: ['Void-Treffer reißen einen Riss: nach 1 s trifft ein Echo mit 20 % des Treffers.', 'Das Echo hat 30 %.', 'Das Echo trifft auch Nachbarn.', 'Das Echo entzieht jedem Getroffenen 3 Mana.'] }
  } },
  construct: { name: 'Konstrukt', color: '#b0bec5', branches: {
    durability: { name: 'Haltbarkeit', tiers: ['+10 % Schildkapazität.', '+20 % Schildkapazität.', 'Bricht dein Schild, baut er sich einmal mit 25 % neu auf.', 'Läuft dein Schild ungebrochen aus, erhältst du 15 Mana zurück.'] },
    forge: { name: 'Schmieden', tiers: ['Konstrukt-Treffer lassen garantiert bluten.', 'Blutung hält länger.', 'Blutende Ziele nehmen 20 % mehr von Konstrukt-Treffern.', 'Blutung springt auf ein Nachbarziel über.'] },
    arsenal: { name: 'Arsenal', tiers: ['Konstrukt-Treffer im Nahkampf +10 %.', '+15 %.', 'Jeder 5. Konstrukt-Treffer wirft eine Klinge auf ein Nachbarziel (40 % des Treffers).', 'Geworfene Klingen lassen bluten.'] }
  } },
  bestia: { name: 'Bestia · Tier', color: '#ffb74d', branches: {
    instinct: { name: 'Instinkt', tiers: ['Jeder 4. Bestia-Treffer ist kritisch (+50 %).', 'Jeder 3. Bestia-Treffer.', 'Kritische Treffer lassen bluten.', 'Kritische Treffer heilen 3 HP.'] },
    pack: { name: 'Rudel', tiers: ['Bestia-Treffer markieren das Ziel 3 s: dein nächster anderer Treffer darauf +20 %.', '+30 % beim Einlösen.', 'Markierte Ziele sind verlangsamt.', 'Das Einlösen der Markierung heilt 3 HP.'] },
    frenzy: { name: 'Raserei', tiers: ['Bestia-Treffer geben einen Raserei-Stapel (bis 5, 3 s): +3 % Schaden je Stapel.', 'Bis 8 Stapel.', 'Bei vollen Stapeln heilen deine Treffer 2 HP.', 'Volle Stapel geben +15 % Tempo.'] }
  } },
  ward: { name: 'Schutz · wirkt auf alle Schilde', color: '#b388ff', branches: {
    absorb: { name: 'Absorbieren', tiers: ['+25 % Schildkapazität.', '+50 % Schildkapazität.', 'Absorbierter Schaden lädt eine Reaktion auf: perfekter Block oder nächster schwerer Angriff entlädt sie.', 'Restkapazität entlädt sich beim Schildende als Schockwelle.'] },
    retaliate: { name: 'Vergeltung', tiers: ['Schildtreffer erzeugen einen kleinen Gegenschlag.', 'Der Gegenschlag trifft auch alle Gegner in deiner Nähe.', 'Der Gegenschlag übernimmt die Element-Tags des Schildes.', 'Gegenschläge dürfen Kette und Lebensentzug nutzen.'] },
    sustain: { name: 'Aufrechterhalten', tiers: ['Schilddauer +30 %.', 'Eigene Treffer verlängern den Schild leicht.', 'Verlängerung durch mehrere Ziele wird abgeschwächt (fair).', 'Ein neuer Schild übernimmt die Hälfte der Restdauer.'] }
  } }
});
// Which rune a tree belongs to (ward: none — the shield principle is open to everyone).
const TREE_RUNE = { fulgur: 'fulgur', natura: 'natura', aqua: 'aqua', ignis: 'ignis', terra: 'terra', umbra: 'umbra', ventus: 'ventus', lux: 'lux', void: 'void', construct: 'construct', bestia: 'bestia', ward: 'ward' };
export const MASTERY_NODE_IDS = Object.freeze(Object.entries(MASTERY_TREES).flatMap(([tree, t]) => Object.keys(t.branches).flatMap((b) => [1, 2, 3, 4].map((n) => `${tree}.${b}.${n}`))));
export const masteryRune = (id) => TREE_RUNE[String(id).split('.')[0]] ?? null;
export function masteryNode(id) {
  const [tree, branch, n] = String(id).split('.'); const t = MASTERY_TREES[tree]; const b = t?.branches?.[branch];
  return b ? { id, tree, branch, tier: +n, treeName: t.name, branchName: b.name, text: b.tiers[+n - 1] } : null;
}
// Requirements of a node (rune level through use for III / IV; Ward uses the Mage level).
export function masteryRequirement(id) {
  const node = masteryNode(id); if (!node) return null;
  const rune = masteryRune(id);
  return { prev: node.tier > 1 ? `${node.tree}.${node.branch}.${node.tier - 1}` : null, rune, runeLevel: node.tier >= 4 ? 5 : node.tier >= 3 ? 3 : 1, mageLevel: rune ? 1 : (node.tier >= 4 ? 10 : node.tier >= 3 ? 6 : 1), cost: 1 };
}

// Highest owned tier of a branch for an actor / profile-like object ({ masteries: Set }).
const tierOf = (a, tree, branch) => { const m = a?.masteries; if (!m?.size) return 0; let t = 0; for (let n = 1; n <= 4; n++) if (m.has(`${tree}.${branch}.${n}`)) t = n; return t; };
export const masteryTier = tierOf;

// ── Build analyzer: explains the synergy chains of the unlocked masteries ─
export function analyzeBuild(masteries, extra = {}) {
  const a = { masteries: masteries instanceof Set ? masteries : new Set(masteries ?? []) };
  const t = (tree, branch) => tierOf(a, tree, branch); const out = [];
  // Shield hit → retaliation (Ward Vergeltung, or Fulgur Entladung III as an electric one).
  const ret = t('ward', 'retaliate'); const dis = t('fulgur', 'discharge');
  if (ret || dis >= 3) {
    const electric = dis >= 3;
    const steps = ['Schildtreffer', electric ? 'Blitz-Vergeltung' : ret >= 3 ? 'Gegenschlag mit den Elementen des Schildes' : 'Gegenschlag'];
    // Follow-up hits of a retaliation may chain / leech only with Vergeltung IV.
    if (ret >= 4 && t('fulgur', 'chain') && (electric || ret >= 3)) steps.push('Kette auf weitere Gegner');
    // Retaliations are follow-up hits: they heal with Leech IV, and need the Natura tag of the shield.
    if (ret >= 4 && t('natura', 'leech') >= 4) steps.push('Heilung je getroffenem Gegner, abnehmend (Schild mit Natura-Tag, z. B. Lebenssturm-Schild)');
    if (t('ward', 'sustain') >= 2) steps.push('Schild verlängert sich');
    out.push(steps.join(' → '));
  }
  if (t('umbra', 'sacrifice') >= 1) out.push(['HP opfern', 'Schildkapazität', extra.lastStand ? 'Letztes Gefecht unter 25 % HP' : null, t('terra', 'fortify') >= 4 ? 'aufgeladener Angriff wandelt den Schild in Burst' : null].filter(Boolean).join(' → '));
  else if (t('terra', 'fortify') >= 4) out.push('Schild aufbauen → aufgeladener Angriff wandelt ihn in Burst');
  if (t('ward', 'absorb') >= 3) out.push('Absorbierter Schaden → perfekter Block / schwerer Angriff entlädt ihn');
  if (t('aqua', 'soak') >= 1 && t('fulgur', 'chain') >= 3) out.push('Nässe → Kette springt bevorzugt auf nasse Gegner' + (t('aqua', 'soak') >= 3 ? ' → Schock verbraucht die Nässe nicht' : ''));
  if (t('ventus', 'spread') && (t('ignis', 'burn') || t('construct', 'forge'))) out.push((t('ignis', 'burn') ? 'Brand' : 'Blutung') + ' setzen → Wind verweht ihn auf Nachbarn' + (t('ventus', 'spread') >= 4 ? ' (volle Dauer)' : ''));
  if (t('lux', 'blessing')) out.push('Licht-Treffer → Schildpunkte' + (t('ward', 'retaliate') ? ' → Schildtreffer lösen Vergeltung aus' : '') + (t('lux', 'blessing') >= 4 ? ' → Heilung je Ziel' : ''));
  if (t('void', 'collapse') && (t('fulgur', 'chain') || t('ventus', 'spread'))) out.push('Void zieht Gegner zusammen → ' + (t('fulgur', 'chain') ? 'Kette springt kürzer und sicher' : 'Status verweht auf alle'));
  if (t('bestia', 'pack') && t('bestia', 'instinct')) out.push('Bestia markiert → anderer Treffer löst die Markierung ein' + (t('bestia', 'pack') >= 4 ? ' → Heilung' : ''));
  if (t('ignis', 'burn') >= 3) out.push('Brand springt über' + (t('ignis', 'burn') >= 4 ? ' → Folgetreffer verlängern ihn' : ''));
  if (t('ignis', 'burn') && t('ignis', 'inferno') >= 3) out.push('Brand setzen → Feuer-Treffer lassen Brennende explodieren' + (t('ignis', 'inferno') >= 4 ? ' → die Explosion entzündet Nachbarn' : ''));
  if (t('ignis', 'ember') && (t('ignis', 'burn') || t('ventus', 'spread'))) out.push('Brand-Ticks → Mana' + (t('ignis', 'ember') >= 3 ? ' + Heilung' : '') + (t('ignis', 'ember') >= 4 ? ' + Fokus' : ''));
  if (t('aqua', 'soak') && t('aqua', 'frost') >= 3) out.push('Nässe garantiert → Frost verlangsamt und friert ein' + (t('aqua', 'frost') >= 4 ? ' → Eingefrorene nehmen +30 %' : ''));
  if (t('aqua', 'tide') >= 3 && t('aqua', 'soak')) out.push('Nasse Ziele → doppelte Mana-Flut');
  if (t('fulgur', 'overload') >= 3) out.push('Überladung lähmt → Blitz trifft Gelähmte härter' + (t('fulgur', 'chain') ? ' → die Kette trägt es weiter' : ''));
  if (t('natura', 'thorns') && t('ventus', 'spread')) out.push('Dornen vergiften → Wind verweht das Gift');
  if (t('umbra', 'curse') >= 3) out.push('Fluch → Schatten-Treffer geben ihn weiter' + (t('umbra', 'curse') >= 4 ? ' → jeder Treffer heilt' : ''));
  if (t('umbra', 'veil') >= 3) out.push('Schatten-Treffer → Nachtschleier weicht aus → Gegenschlag' + (t('umbra', 'veil') >= 4 ? ' + Mana' : ''));
  if (t('terra', 'stoneskin') && t('terra', 'fortify')) out.push('Erd-Treffer → Steinhaut + Schild' + (t('terra', 'stoneskin') >= 4 ? ' → Nahkampf prallt zurück' : ''));
  if (t('void', 'rift') && t('void', 'collapse')) out.push('Void zieht zusammen → das Riss-Echo trifft alle' + (t('void', 'rift') >= 4 ? ' und entzieht Mana' : ''));
  if (t('bestia', 'frenzy') >= 3) out.push('Raserei stapeln → volle Stapel heilen' + (t('bestia', 'frenzy') >= 4 ? ' und beschleunigen' : ''));
  if (t('lux', 'radiance') >= 3) out.push('Licht blendet → Geblendete nehmen +20 %' + (t('lux', 'radiance') >= 4 ? ' → springt weiter' : ''));
  return out;
}
