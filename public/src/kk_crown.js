// GRIMGE Prototype — Kronenkrieg in play, part 6: the crowning (GRIMGE_KRONENKRIEG.md §4c/§4d). Nothing is handed out:
// at round level 8 one chooses the CLASS (Bankai) or one of the three elements one used most (its Arcane State); at
// level 10 again the class, an element or the PRIMAL (the Focus transformation). Each choice raises a trial on the
// map — a guardian everyone can see — and beating it wins the card (soul-bound: never dropped, never stolen) or the
// Focus transformation. Found Arcane States stay a shortcut; a deck holds ONE Arcane State or Bankai.
import { recognizer } from './recognizer.js';
import { runeCategory } from './progression.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { ELEMENTS, KK } from './kk_map.js';
import { kkState, kkOn, elementColor } from './kk_world.js';
import { giveRune, gainXp } from './kk_loot.js';
import { addRecord } from './kk_army.js';
import { CREATURE_OF } from './kk_creatures.js';
import { XP } from './kk_progress.js';

// The Arcane State an element's crowning gives (one per element).
export const ELEMENT_ARCANE = Object.freeze({
  ignis: 'buff_B01', void: 'buff_B02', aqua: 'buff_T04', terra: 'buff_T05', fulgur: 'buff_A12', construct: 'buff_A10', umbra: 'buff_A13',
  natura: 'buff_T37', lux: 'buff_T39', bestia: 'buff_A02', frost: 'buff_T35', ventus: 'buff_T05', ward: 'buff_T04'
});
export const BANKAI_ID = 'buff_A04';
const runeById = (id) => recognizer.runes.find((r) => r.id === id) ?? null;

export function initCrown(game) {
  const kk = kkState(game); kk.crown = { 8: null, 10: null, trial: null, focusUnlocked: null, asked: {} }; kk.elementUse = {}; kk.reserve = null;
  kk.onTrialWon = (rec) => trialWon(game, rec); kk.onRuneDrawn = (id) => countElementUse(game, id); kk.crownHooks = { swap: () => swapReserve(game) };
  return kk;
}
// Counted per drawn element rune (kk_army.recordGrade forwards the rune id).
export function countElementUse(game, runeId) { const kk = kkState(game); if (!kk?.elementUse || !ELEMENTS.includes(runeId)) return; kk.elementUse[runeId] = (kk.elementUse[runeId] ?? 0) + 1; }
export function topElements(kk, n = 3) { return Object.entries(kk.elementUse ?? {}).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([e]) => e); }
export function crownOptions(game, stage) {
  const kk = kkState(game); const opts = [{ path: 'class', label: stage === 8 ? 'KLASSE — BANKAI' : 'KLASSE — KLASSEN-TRANSFORMATION' }];
  for (const e of topElements(kk)) opts.push({ path: 'element:' + e, label: `${e.toUpperCase()} — ${stage === 8 ? (runeById(ELEMENT_ARCANE[e])?.name ?? 'ARCANE STATE') : 'ELEMENT-TRANSFORMATION'}` });
  if (stage === 10 && game.primal && game.primal.hp > 0) opts.push({ path: 'primal', label: `PRIMAL — ${game.primal.info?.name ?? 'PRIMAL'}-TRANSFORMATION` });
  return opts;
}

// A choice raises the trial: a marked place on the map with its guardian, a little away toward the middle.
export function chooseCrown(game, stage, path) {
  const kk = kkState(game); const P = game.player; if (kk.crown[stage] || kk.crown.trial) return null;
  const W = kk.map.width; const dir = P.x < W / 2 ? 1 : -1; const x = Math.max(300, Math.min(W - 300, P.x + dir * 1300));
  const el = path.startsWith('element:') ? path.slice(8) : null;
  const site = { id: 'trial' + stage, kind: 'trial', row: KK.main, /* always on the main plane: everyone can come */ x, z: .5, stage, path, element: el ?? (path === 'primal' ? 'natura' : 'lux') };
  kk.map.sites.push(site); kk.crown.trial = site; kk.crown[stage] = { path, done: false };
  const kind = path === 'class' ? 'siege_golem' : path === 'primal' ? 'spirit_wolf' : (CREATURE_OF[el] ?? 'storm_wolf');
  addRecord(kk, { team: 'beast', creature: true, trialGuardian: true, kind, element: site.element, size: stage === 8 ? 2 : 3, cls: 'Berserker', tier: 3, row: site.row, x: site.x, z: site.z + .1, role: 'guard', siteId: site.id });
  for (let r = Math.max(0, site.row - 1); r <= Math.min(kk.map.rows - 1, site.row + 1); r++) kk.reveal.add(r + ':' + Math.floor(x / 240));
  game.showAnnouncement?.(`PRÜFUNG ${stage === 8 ? 'I' : 'II'} ERSCHEINT — BESIEGE DEN WÄCHTER (ALLE SEHEN ES)`, 2.4);
  combat.spawnShockwave?.(x, groundYForDepth(site.z) - 60, 140, elementColor(site.element)); audio.playRuneChime?.(420);
  closeCrownPanel(); return site;
}
// The guardian fell: the reward of the trial.
export function trialWon(game, rec) {
  const kk = kkState(game); const site = kk.crown.trial; if (!site || rec.siteId !== site.id) return false;
  const stage = site.stage; const path = site.path; kk.crown[stage].done = true; kk.crown.trial = null; site.won = true; gainXp(game, XP.trial);
  if (stage === 8) {
    const rune = runeById(path === 'class' ? BANKAI_ID : ELEMENT_ARCANE[site.element]);
    if (rune) {
      const card = { ...rune, soulBound: true };
      if (hasBigForm(game)) { kk.reserve = card; game.showAnnouncement?.(`${rune.name} ERKÄMPFT — IN DER RESERVE (NUR EIN ARCANE STATE IM DECK)`, 2.4); }
      else if (giveRune(game, card) === 'full') { kk.reserve = card; game.showAnnouncement?.(`${rune.name} ERKÄMPFT — DECK VOLL, IN DER RESERVE`, 2.2); }
      else game.showAnnouncement?.(`KRÖNUNG I: ${rune.name} — SEELENGEBUNDEN`, 2.4);
    }
  } else {
    kk.crown.focusUnlocked = path;
    game.showAnnouncement?.(`KRÖNUNG II: DIE FOKUS-TRANSFORMATION (${path === 'class' ? 'KLASSE' : path === 'primal' ? 'PRIMAL' : site.element.toUpperCase()}) IST DEIN`, 2.6);
  }
  combat.spawnShockwave?.(site.x, groundYForDepth(site.z) - 60, 200, '#ffe9a8'); combat.shakeCamera?.(8, .5); audio.playRuneChime?.(1200);
  return true;
}
const allCards = (P) => [...P.runeDeck, ...P.runeHand, ...P.slottedSpells.flatMap((s) => s.runes)];
export const hasBigForm = (game) => allCards(game.player).some((c) => runeCategory(c.id) === 'arcane');
// Swapping the reserve card with the Arcane State in the deck (from the main castle panel or outside a fight).
export function swapReserve(game) {
  const kk = kkState(game); const P = game.player; if (!kk.reserve) return false;
  const inDeck = P.runeDeck.find((c) => runeCategory(c.id) === 'arcane') ?? P.runeHand.find((c) => runeCategory(c.id) === 'arcane');
  const next = kk.reserve; kk.reserve = null;
  if (inDeck) { P.runeDeck = P.runeDeck.filter((c) => c !== inDeck); P.runeHand = P.runeHand.filter((c) => c !== inDeck); const { cardId, ...rest } = inDeck; kk.reserve = rest; }
  P.runeDeck.push(P.makeRuneCard(next)); P.drawRunesToHand(); game.showAnnouncement?.(`${next.name} IM DECK`, 1.4); return true;
}
export function kkFocusLocked(game) { const kk = kkState(game); return kkOn(game) && !kk.crown?.focusUnlocked; }

// ── the choice panel (DOM, top centre) ─────────────────────────────────────────────────────────────────────────────
let panel = null;
export function closeCrownPanel() { if (panel?.el) panel.el.style.display = 'none'; if (panel) panel.stage = null; }
function openChoice(game, stage) {
  const doc = globalThis.document; if (typeof doc?.createElement !== 'function' || typeof doc.body?.appendChild !== 'function') return;
  if (!panel) {
    const el = doc.createElement('div'); el.id = 'kk-crown-panel';
    el.style.cssText = 'position:fixed;left:50%;top:12vh;transform:translateX(-50%);z-index:62;width:min(460px,80vw);font-family:Cinzel,serif;color:#fff3c8;background:#1e1430f2;border:2px solid #f0d890;padding:12px;text-align:center;display:none';
    el.addEventListener('pointerdown', (e) => { const b = e.target?.closest?.('[data-crown]'); if (!b) return; e.preventDefault(); e.stopPropagation(); if (b.getAttribute('data-crown') === 'later') { closeCrownPanel(); return; } chooseCrown(game, panel.stage, b.getAttribute('data-crown')); });
    doc.body.appendChild(el); panel = { el, stage: null };
  }
  const opts = crownOptions(game, stage);
  panel.el.innerHTML = `<div style="font-size:18px;margin-bottom:6px">♛ KRÖNUNG ${stage === 8 ? 'I' : 'II'}</div><div style="font-size:12px;margin-bottom:8px;color:#cbb8ff">Wähle deinen Weg — danach erscheint eine Prüfung auf der Karte.</div>` +
    opts.map((o) => `<button data-crown="${o.path}" style="display:block;width:100%;margin:4px 0;min-height:40px;font:inherit;color:#fff3c8;background:#3a2a4e;border:1px solid #c9a95a">${o.label}</button>`).join('') +
    `<button data-crown="later" style="margin-top:6px;font:inherit;font-size:11px;color:#bba;background:none;border:none">später wählen</button>`;
  panel.el.style.display = 'block'; panel.stage = stage;
}
export function updateCrown(game, dt) {
  if (!kkOn(game)) return; const kk = kkState(game); if (!kk.crown) return;
  for (const stage of [8, 10]) {
    if ((kk.level ?? 1) < stage || kk.crown[stage] || kk.crown.trial) continue;
    if (!kk.crown.asked[stage] || (kk.time - kk.crown.asked[stage] > 60 && !panel?.stage)) { kk.crown.asked[stage] = kk.time; openChoice(game, stage); }
    break;
  }
}
