// GRIMGE Prototype — Mastery tree data (pure, no combat imports: the profile,
// the skill tree UI and the build analyzer read it). Effects: mastery.js.
// Adapted from the GDD "Modulares Runen-, Mastery- und Build-System".

// ── Trees (implemented branches; names / texts adapted from the GDD) ─────
export const MASTERY_TREES = Object.freeze({
  fulgur: { name: 'Fulgur · Blitz', color: '#fff176', branches: {
    chain: { name: 'Kette', tiers: ['Blitztreffer springen auf 1 weiteres Ziel (50 % Schaden).', '2 Sprünge, größere Sprungweite.', 'Sprünge bevorzugen nasse Ziele.', '70 % des Schadens bleiben pro Sprung erhalten, 3 Sprünge.'] },
    discharge: { name: 'Entladung', tiers: ['Status-Kombos entladen einen kleinen Blitz auf ein Nachbarziel.', 'Kürzere Abklingzeit der Entladung.', 'Schildtreffer lösen elektrische Vergeltung aus.', 'Entladungen dürfen die Kette nutzen (aber keine neue Entladung).'] }
  } },
  natura: { name: 'Natura · Natur', color: '#9ccc65', branches: {
    leech: { name: 'Lebensentzug', tiers: ['Natura-Treffer heilen 2 HP.', '3 HP je getroffenem Ziel.', 'Auch periodischer Schaden deiner Status heilt (halb).', 'Ketten- und Folgetreffer heilen mit abnehmendem Ertrag.'] }
  } },
  aqua: { name: 'Aqua · Wasser', color: '#4fc3f7', branches: {
    soak: { name: 'Durchnässen', tiers: ['Wasser-Treffer machen garantiert nass.', 'Nässe hält länger.', 'Schock / Schockfrost verbrauchen die Nässe nicht mehr.', 'Wasser-Treffer verbreiten Nässe auf Nachbarziele.'] }
  } },
  ignis: { name: 'Ignis · Feuer', color: '#ff7043', branches: {
    burn: { name: 'Brand', tiers: ['Feuer-Treffer setzen garantiert in Brand.', 'Brand hält länger.', 'Brand springt beim Entzünden auf ein Nachbarziel über.', 'Erneute Feuertreffer verlängern den Brand (bis 8 s).'] }
  } },
  terra: { name: 'Terra · Erde', color: '#bcaaa4', branches: {
    fortify: { name: 'Befestigen', tiers: ['Schilde erhalten +20 % Kapazität.', 'Mit Schild wirst du kaum noch unterbrochen.', 'Geblockte Treffer stoßen den Angreifer zurück.', 'Ein aufgeladener Angriff mit Schild verbraucht den Schild und wandelt ihn in Schaden um.'] }
  } },
  umbra: { name: 'Umbra · Schatten', color: '#b39ddb', branches: {
    sacrifice: { name: 'Opfer', tiers: ['Beim Schildwirken werden 15 % deiner HP geopfert und zu 150 % Schildkapazität.', '20 % HP → 175 % Kapazität.', 'Läuft der Schild ungebrochen aus, kehren 30 % der geopferten HP zurück.', 'Unter 30 % HP treffen deine Schatten-Treffer 25 % härter.'] }
  } },
  ward: { name: 'Schutz (Ward) · alle Schilde', color: '#b388ff', branches: {
    absorb: { name: 'Absorbieren', tiers: ['+25 % Schildkapazität.', '+50 % Schildkapazität.', 'Absorbierter Schaden lädt eine Reaktion auf: perfekter Block oder nächster schwerer Angriff entlädt sie.', 'Restkapazität entlädt sich beim Schildende als Schockwelle.'] },
    retaliate: { name: 'Vergeltung', tiers: ['Schildtreffer erzeugen einen kleinen Gegenschlag.', 'Der Gegenschlag trifft auch alle Gegner in deiner Nähe.', 'Der Gegenschlag übernimmt die Element-Tags des Schildes.', 'Gegenschläge dürfen Kette und Lebensentzug nutzen.'] },
    sustain: { name: 'Aufrechterhalten', tiers: ['Schilddauer +30 %.', 'Eigene Treffer verlängern den Schild leicht.', 'Verlängerung durch mehrere Ziele wird abgeschwächt (fair).', 'Ein neuer Schild übernimmt die Hälfte der Restdauer.'] }
  } }
});
// Which rune a tree belongs to (ward: none — the shield principle is open to everyone).
const TREE_RUNE = { fulgur: 'fulgur', natura: 'natura', aqua: 'aqua', ignis: 'ignis', terra: 'terra', umbra: 'umbra', ward: null };
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
  if (t('ignis', 'burn') >= 3) out.push('Brand springt über' + (t('ignis', 'burn') >= 4 ? ' → Folgetreffer verlängern ihn' : ''));
  return out;
}
