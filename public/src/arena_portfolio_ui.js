// GRIMGE Prototype — Arena Rune Portfolio screen (user spec 16 Nov 2026). Before a duel each player picks up to six
// distinct runes within 12 points; the picks of both fighters form the contested spawn pool (arena_runes.js). The screen
// lists the owned runes with their point cost and rarity, shows the budget and says why a pick is refused.
// Opened from the Grimoire / deck window; the portfolio is saved in the profile.
import { recognizer } from './recognizer.js';
import { arenaRuneInfo, ALL_RUNE_IDS, RUNE_CATEGORIES, runeCategory } from './progression.js';
import { ARENA_RULES, validatePortfolio, PORTFOLIO_REASON_TEXT } from './arena_runes.js';

const css = `
#ap-overlay{position:fixed;inset:0;z-index:8960;background:#0b0810;font-family:Cinzel,serif;color:#e8dcc4;display:grid;grid-template-rows:auto auto 1fr;overflow:hidden;touch-action:manipulation;user-select:none;-webkit-user-select:none}
#ap-overlay button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;color:#e8dcc4;background:#2a2234;border:2px solid #4a3e5a}
#ap-overlay .ap-top{display:flex;align-items:center;gap:1.2vw;padding:1vh 1.2vw;border-bottom:2px solid #3a3048}
#ap-overlay .ap-top h2{margin:0;font-size:clamp(13px,2vw,22px);letter-spacing:.12em;color:#f0d890}
#ap-overlay .ap-top button{font-size:clamp(10px,1.3vw,14px);padding:.5em 1em;min-height:36px}
#ap-overlay .ap-meter{display:flex;align-items:center;gap:1.4vw;padding:.8vh 1.2vw;font-size:clamp(11px,1.5vw,16px);border-bottom:2px solid #2a2234;flex-wrap:wrap}
#ap-overlay .ap-meter b{color:#ffd24a}
#ap-overlay .ap-bar{flex:1 1 120px;height:10px;border:2px solid #4a3e5a;background:#17121e;min-width:90px}
#ap-overlay .ap-bar i{display:block;height:100%;background:#f0d890}
#ap-overlay .ap-bar.over i{background:#ff6a5a}
#ap-overlay .ap-msg{color:#ff9a8a;min-height:1.2em}
#ap-overlay .ap-body{min-height:0;overflow:auto;padding:1.4vh 1.2vw;display:grid;grid-template-columns:repeat(auto-fill,minmax(clamp(120px,15vw,190px),1fr));gap:.9vw;align-content:start}
#ap-overlay .ap-sec{grid-column:1/-1;font-size:clamp(9px,1.1vw,12px);letter-spacing:.16em;color:#9a8eaa;margin-top:.6vh}
#ap-overlay .ap-card{border:2px solid #3a3048;background:#17121e;padding:.9vh .7vw;display:flex;flex-direction:column;gap:.3vh;min-width:0;text-align:left;min-height:56px}
#ap-overlay .ap-card.on{border-color:#f0d890;background:#2a2230;box-shadow:0 0 12px #f0d89055}
#ap-overlay .ap-name{font-size:clamp(11px,1.4vw,16px);letter-spacing:.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ap-overlay .ap-sub{font-size:clamp(8px,1vw,11px);letter-spacing:.12em;color:#b8ac98;display:flex;justify-content:space-between}
`;
const RARITY_LABEL = { common: 'GEWÖHNLICH', uncommon: 'UNGEWÖHNLICH', rare: 'SELTEN', epic: 'EPISCH', legendary: 'LEGENDÄR' };
const RARITY_COLOR = { common: '#b8c0c8', uncommon: '#7bd88f', rare: '#5aa0ff', epic: '#b46cff', legendary: '#ffb43a' };
let open = null;
export const isArenaPortfolioOpen = () => !!open;
export function closeArenaPortfolio() { if (!open) return; open.root.remove(); const done = open.onClose; open = null; done?.(); }

// The runes one can bring: everything owned that has a card and a rarity in the Arena.
export function portfolioCandidates(profile) {
  const recognised = new Set(recognizer.runes.map((r) => r.id));
  return ALL_RUNE_IDS.filter((id) => recognised.has(id) && arenaRuneInfo(id) && profile.isRuneUnlocked(id));
}

export function openArenaPortfolio(game, { onClose = null } = {}) {
  const doc = globalThis.document; if (open || typeof doc?.createElement !== 'function' || typeof doc.body?.appendChild !== 'function') return false;
  const profile = game.profile;
  if (!doc.getElementById('ap-style')) { const st = doc.createElement('style'); st.id = 'ap-style'; st.textContent = css; doc.head.appendChild(st); }
  const root = doc.createElement('div'); root.id = 'ap-overlay'; doc.body.appendChild(root); open = { root, onClose };
  let picks = [...profile.effectiveArenaPortfolio()]; let message = '';
  const tap = (el, fn) => el?.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  const render = () => {
    const report = validatePortfolio(picks, arenaRuneInfo);
    const cands = portfolioCandidates(profile);
    root.innerHTML = `<div class="ap-top"><button class="ap-back" type="button">◀ FERTIG</button><h2>ARENA-PORTFOLIO</h2><button class="ap-clear" type="button">LEEREN</button></div>
      <div class="ap-meter"><span>PUNKTE <b>${report.cost}/${ARENA_RULES.budget}</b></span><span>RUNEN <b>${report.count}/${ARENA_RULES.maxRunes}</b></span>
        <div class="ap-bar${report.cost > ARENA_RULES.budget ? ' over' : ''}"><i style="width:${Math.min(100, report.cost / ARENA_RULES.budget * 100)}%"></i></div><span class="ap-msg">${message}</span></div>
      <div class="ap-body"></div>`;
    const body = root.querySelector('.ap-body');
    if (!cands.length) { body.innerHTML = '<div class="ap-sec">Noch keine Rune im Besitz. Wähle bei der Charaktererstellung deine Start-Rune.</div>'; }
    for (const cat of RUNE_CATEGORIES) {
      const ids = cands.filter((id) => runeCategory(id) === cat.id); if (!ids.length) continue;
      const head = doc.createElement('div'); head.className = 'ap-sec'; head.textContent = `${cat.icon} ${cat.label} · ${ARENA_RULES.points[cat.id] ?? 3} PUNKT${(ARENA_RULES.points[cat.id] ?? 3) > 1 ? 'E' : ''}`; body.appendChild(head);
      for (const id of ids) {
        const info = arenaRuneInfo(id); const rune = recognizer.runes.find((r) => r.id === id); const on = picks.includes(id);
        const card = doc.createElement('button'); card.type = 'button'; card.className = `ap-card${on ? ' on' : ''}`;
        card.innerHTML = `<div class="ap-name" style="color:${rune?.color ?? '#e8dcc4'}">${rune?.name ?? id.toUpperCase()}</div><div class="ap-sub"><span style="color:${RARITY_COLOR[info.rarity]}">${RARITY_LABEL[info.rarity]}</span><span>${info.cost} P</span></div>`;
        tap(card, () => {
          const next = on ? picks.filter((q) => q !== id) : [...picks, id]; const check = validatePortfolio(next, arenaRuneInfo);
          if (!check.ok) { message = check.reasons.map((r) => PORTFOLIO_REASON_TEXT[r] ?? r).join(' · '); render(); return; }
          const res = profile.setArenaPortfolio(next); if (!res.ok) { message = res.reasons.join(' · '); render(); return; }
          picks = next; message = ''; render();
        });
        body.appendChild(card);
      }
    }
    tap(root.querySelector('.ap-back'), () => closeArenaPortfolio());
    tap(root.querySelector('.ap-clear'), () => { profile.setArenaPortfolio([]); picks = []; message = ''; render(); });
  };
  render(); return true;
}
