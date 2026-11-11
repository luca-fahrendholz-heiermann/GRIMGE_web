// GRIMGE Prototype — rune vault (earned progression; user, 11 Nov 2026). The runes the player has found or owns: each
// card shows its rarity, the copies owned and found, and unlocks a further copy for skill points and gold when a drop
// is waiting. One screen in the mobile layout of the campaign; the grid only scrolls when the collection outgrows it.
// It also carries the test switch between the earned rules and full access.
import { recognizer } from './recognizer.js';
import { RUNE_RARITIES, runeRarity, maxRuneCopies, ALL_RUNE_IDS } from './progression.js';

const css = `
#rv-overlay{position:fixed;inset:0;z-index:8950;background:#0b0810;font-family:Cinzel,serif;color:#e8dcc4;display:grid;grid-template-rows:auto 1fr;overflow:hidden;touch-action:manipulation;user-select:none;-webkit-user-select:none}
#rv-overlay button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;color:#e8dcc4;background:#2a2234;border:2px solid #4a3e5a}
#rv-overlay .rv-top{display:flex;align-items:center;gap:1.2vw;padding:1vh 1.2vw;border-bottom:2px solid #3a3048}
#rv-overlay .rv-top h2{margin:0;font-size:clamp(13px,2vw,22px);letter-spacing:.12em;color:#f0d890}
#rv-overlay .rv-top button{font-size:clamp(10px,1.3vw,14px);padding:.5em 1em;min-height:36px}
#rv-overlay .rv-res{margin-left:auto;display:flex;gap:1.4vw;font-size:clamp(11px,1.5vw,16px);white-space:nowrap}
#rv-overlay .rv-res b{color:#ffd24a}
#rv-overlay .rv-test.on{border-color:#ff8a5a;color:#ffb89a}
#rv-overlay .rv-body{min-height:0;overflow:auto;padding:1.4vh 1.2vw;display:grid;grid-template-columns:repeat(auto-fill,minmax(clamp(130px,17vw,210px),1fr));gap:1vw;align-content:start}
#rv-overlay .rv-card{border:2px solid #3a3048;background:#17121e;padding:1vh .8vw;display:flex;flex-direction:column;gap:.5vh;min-width:0}
#rv-overlay .rv-card.ready{box-shadow:0 0 0 2px #0a080e,0 0 14px #f0d89066}
#rv-overlay .rv-name{font-size:clamp(11px,1.5vw,17px);letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rv-overlay .rv-rar{font-size:clamp(8px,1vw,11px);letter-spacing:.14em}
#rv-overlay .rv-cnt{font-size:clamp(9px,1.1vw,13px);color:#b8ac98}
#rv-overlay .rv-pips{letter-spacing:.2em;color:#f0d890}
#rv-overlay .rv-pips s{color:#4a3e5a;text-decoration:none}
#rv-overlay .rv-card button{margin-top:auto;font-size:clamp(9px,1.15vw,13px);padding:.6em .4em;min-height:38px}
#rv-overlay .rv-card button.go{border-color:#f0d890;background:#6a4e1e;color:#fff3c8}
#rv-overlay .rv-card button:disabled{opacity:.55;cursor:default}
#rv-overlay .rv-empty{grid-column:1/-1;font-size:clamp(11px,1.4vw,15px);color:#9a8eaa;line-height:1.5}
`;
const WHY = { max: 'ALLE KARTEN FREI', drop: 'NOCH KEIN FUND', level: 'STUFE ZU NIEDRIG', points: 'SKILLPUNKTE FEHLEN', gold: 'GOLD FEHLT' };
let open = null;
export const isRuneVaultOpen = () => !!open;
export function closeRuneVault() { if (!open) return; open.root.remove(); const done = open.onClose; open = null; done?.(); }
// How many runes could be unlocked right now (badge on the campaign screen).
export const readyRunes = (profile) => Object.keys(profile?.runeDrops ?? {}).filter((id) => profile.copyBlocker(id) === null).length;

export function openRuneVault(game, { onClose = null } = {}) {
  const doc = globalThis.document; if (open || typeof doc?.createElement !== 'function' || typeof doc.body?.appendChild !== 'function') return false;
  const profile = game.profile;
  if (!doc.getElementById('rv-style')) { const st = doc.createElement('style'); st.id = 'rv-style'; st.textContent = css; doc.head.appendChild(st); }
  const root = doc.createElement('div'); root.id = 'rv-overlay'; doc.body.appendChild(root); open = { root, onClose };
  const tap = (el, fn) => el?.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  const render = () => {
    const ids = ALL_RUNE_IDS.filter((id) => (profile.runeDrops[id] ?? 0) > 0 || (profile.runeCopies[id] ?? 0) > 0);
    root.innerHTML = `<div class="rv-top"><button class="rv-back" type="button">◀ ZURÜCK</button><h2>RUNEN</h2>
      <div class="rv-res"><span>GOLD <b>${profile.gold}</b></span><span>SKILLPUNKTE <b>${profile.skillPoints}</b></span><span>STUFE <b>${profile.level}</b></span></div>
      <button class="rv-test${profile.earned ? '' : ' on'}" type="button">${profile.earned ? 'TEST: ALLES FREISCHALTEN' : 'TEST AKTIV · ZURÜCK ZUM FORTSCHRITT'}</button></div>
      <div class="rv-body"></div>`;
    const body = root.querySelector('.rv-body');
    if (!profile.earned) body.innerHTML = '<div class="rv-empty">Der Test-Schalter ist an: alle Grundrunen und ein volles Deck sind verfügbar, Funde und Freischaltungen ruhen. Mit dem Knopf oben geht es zurück zu deinem verdienten Stand.</div>';
    else if (!ids.length) body.innerHTML = '<div class="rv-empty">Noch keine Rune. Wähle bei der Charaktererstellung deine Start-Rune.</div>';
    else for (const id of ids) {
      const rune = recognizer.runes.find((r) => r.id === id); const rar = RUNE_RARITIES[runeRarity(id)]; const have = profile.runeCopies[id] ?? 0; const found = profile.runeDrops[id] ?? 0; const max = maxRuneCopies(id);
      const why = profile.copyBlocker(id); const card = doc.createElement('div'); card.className = `rv-card${why === null ? ' ready' : ''}`; card.style.borderColor = have ? rar.color : '#3a3048';
      card.innerHTML = `<div class="rv-name" style="color:${rune?.color ?? '#e8dcc4'}">${rune?.name ?? id.toUpperCase()}</div><div class="rv-rar" style="color:${rar.color}">${rar.label}</div>
        <div class="rv-cnt">KARTEN <span class="rv-pips">${'◆'.repeat(have)}<s>${'◆'.repeat(Math.max(0, max - have))}</s></span> · FUNDE ${Math.min(found, max)}/${max}</div>
        <button type="button" class="${why === null ? 'go' : ''}" ${why === null ? '' : 'disabled'}>${why === null ? `FREISCHALTEN · ${rar.skillPoints} SP · ${rar.gold} G` : why === 'level' ? `AB STUFE ${rar.level}` : why === 'points' ? `${rar.skillPoints} SP NÖTIG` : why === 'gold' ? `${rar.gold} GOLD NÖTIG` : WHY[why]}</button>`;
      if (why === null) tap(card.querySelector('button'), () => { if (profile.unlockCopy(id)) { game.applyProfile?.(); game.showAnnouncement?.(`${rune?.name ?? id} FREIGESCHALTET — IM DECK`, 1.6); render(); } });
      body.appendChild(card);
    }
    tap(root.querySelector('.rv-back'), () => closeRuneVault());
    tap(root.querySelector('.rv-test'), () => { profile.setRules(profile.earned ? 'open' : 'earned'); game.applyProfile?.(); render(); });
  };
  render();
  return true;
}
