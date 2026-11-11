// GRIMGE Prototype — character creation screen (AGENDA 2; user, 10 Nov 2026: "ja mach" — a plain placeholder until the
// user lays the screen out in /editor.html). Name, base figure, hair and armour colour (character_look.js), start element
// (an extra element rune), class (= weapon family, classes.js) with its start weapon, and a live preview that walks,
// strikes and draws with the parts-rig animations.
// Opens from the hub's WARDROBE button and before the first battle (profile.character.created).
import { sprites } from './sprites.js';
import { LOOK_HAIR, LOOK_ARMOUR, normalizeLook } from './character_look.js';
import { CLASSES, START_ELEMENTS, CLASS_UNLOCK_LEVEL, classById, classOfWeapon, classWeapons, classWeaponUnlocked } from './classes.js';
import { WEAPONS } from './weapons.js';
import { recognizer } from './recognizer.js';

const BASES = Object.freeze([
  { id: 'thesen', name: 'THESEN', title: 'HORNED WARRIOR' },
  { id: 'xame', name: 'XAME', title: 'SKULL WARLOCK' }
]);
const PREVIEW_LOOP = Object.freeze([['idle', 1.4], ['walk', 1.6], ['attack1', .5], ['attack3', .7], ['draw', 1.2], ['sprint', 1.2]]);

const css = `
#cc-overlay{position:fixed;inset:0;z-index:9000;background:#0b0810;font-family:Cinzel,serif;color:#e8dcc4;display:grid;grid-template-columns:minmax(150px,26vw) 1fr;grid-template-rows:auto 1fr auto;overflow:hidden;touch-action:manipulation;user-select:none;-webkit-user-select:none}
#cc-overlay .cc-preview{grid-row:1/4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1vh;padding:1vh 1vw;background:#120e18;border-right:2px solid #3a3048;min-height:0}
#cc-overlay canvas{background:#211a2a;border:2px solid #3a3048;image-rendering:pixelated;height:min(72dvh,30vw);aspect-ratio:240/280;max-width:100%}
#cc-overlay .cc-who{font-size:clamp(11px,1.5vw,16px);letter-spacing:.1em;color:#f0d890;text-align:center}
#cc-overlay .cc-head{display:flex;align-items:center;gap:1vw;padding:1vh 1.2vw;border-bottom:2px solid #3a3048;min-width:0}
#cc-overlay h2{margin:0;font-size:clamp(12px,1.8vw,20px);letter-spacing:.12em;color:#f0d890;white-space:nowrap}
#cc-overlay .cc-tabs{display:flex;gap:.6vw;margin-left:auto}
#cc-overlay button{font-family:inherit;font-size:clamp(10px,1.25vw,14px);color:#e8dcc4;background:#2a2234;border:2px solid #4a3e5a;padding:.5em .8em;cursor:pointer;-webkit-tap-highlight-color:transparent}
#cc-overlay button.on{border-color:#f0d890;background:#3e3222;color:#fff3c8}
#cc-overlay .cc-tabs button{min-height:36px;padding:.5em 1.1em;letter-spacing:.08em}
#cc-overlay .cc-body{min-height:0;overflow:auto;padding:1.2vh 1.2vw}
#cc-overlay .cc-tab{display:none}
#cc-overlay[data-tab="look"] .cc-tab[data-t="look"],#cc-overlay[data-tab="element"] .cc-tab[data-t="element"],#cc-overlay[data-tab="class"] .cc-tab[data-t="class"]{display:block}
#cc-overlay .cc-sec{margin-bottom:1.4vh}
#cc-overlay .cc-sec h3{margin:0 0 .6vh;font-size:clamp(9px,1.1vw,13px);letter-spacing:.14em;color:#b8a070}
#cc-overlay .cc-row{display:flex;flex-wrap:wrap;gap:.6vw}
#cc-overlay .cc-sw{width:clamp(34px,4.2vw,48px);height:clamp(34px,4.2vw,48px);padding:0}
#cc-overlay input{font-family:inherit;font-size:clamp(13px,1.6vw,17px);background:#0e0b14;color:#fff3c8;border:2px solid #4a3e5a;padding:.4em .6em;width:min(260px,40vw);user-select:text;-webkit-user-select:text}
#cc-overlay .cc-big button{min-height:44px;padding:.6em 1.2em}
#cc-overlay .cc-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:.5vw}
#cc-overlay .cc-grid button{text-align:left;padding:.35em .5em;font-size:clamp(9px,1.05vw,13px);min-width:0;overflow:hidden}
#cc-overlay .cc-grid small{display:block;font-size:clamp(7px,.8vw,10px);color:#9a8eaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cc-overlay .cc-detail{margin-top:1vh;padding:1vh 1vw;border:2px solid #3a3048;background:#120e18;display:grid;grid-template-columns:1fr auto;gap:1vw;align-items:center}
#cc-overlay .cc-detail p{margin:0;font-size:clamp(10px,1.2vw,14px);line-height:1.4;color:#d8ccb4}
#cc-overlay .cc-detail .cc-wdesc{font-size:clamp(9px,1vw,12px);color:#9a8eaa;margin-top:.4em}
#cc-overlay .cc-note{font-size:clamp(9px,1.05vw,12px);color:#9a8eaa;margin-top:.8vh;line-height:1.4}
#cc-overlay button.locked{opacity:.5}
#cc-overlay .cc-foot{display:flex;justify-content:flex-end;gap:1vw;padding:1vh 1.2vw;border-top:2px solid #3a3048}
#cc-overlay .cc-foot button{min-height:44px;font-size:clamp(13px,1.7vw,19px);padding:.5em 1.6em;letter-spacing:.08em}
#cc-overlay .cc-done{border-color:#f0d890;background:#6a4e1e;color:#fff3c8;box-shadow:0 3px 0 #2a1e0a}
`;

let open = null;

export function isCharacterCreationOpen() { return !!open; }

// game: window.gameWorld (profile, classOptions, setClassWeapon); onDone(character) after DONE.
// tabs: which pages the screen shows — creation: look, element, class; the wardrobe: look and element; the hub's
// CLASSES button: only the class page (user, 11 Nov 2026: the class in use is equipped in its own hub screen).
export function openCharacterCreation(game, { onDone = null, first = false, tabs = null } = {}) {
  tabs = tabs ?? (first ? ['look', 'element', 'class'] : ['look', 'element']);
  const doc = globalThis.document; if (open || typeof doc?.createElement !== 'function' || !doc.body) return false;
  const profile = game?.profile; const ch = profile?.character ?? {};
  const startCls = classById(ch.classId) ?? classOfWeapon(profile?.classWeapon) ?? CLASSES[0];
  const state = { name: ch.name || '', base: BASES.some((b) => b.id === ch.base) ? ch.base : 'thesen', look: normalizeLook(ch.look),
    classId: startCls.id, weapon: WEAPONS[profile?.classWeapon]?.family === startCls.id ? profile.classWeapon : classWeapons(startCls.id)[0],
    element: START_ELEMENTS.includes(ch.startElement) ? ch.startElement : START_ELEMENTS[0] };
  // After creation the class stays changeable in the wardrobe; the second weapon of a family needs the start weapon's level.
  // The start element is chosen once, at creation (re-choosing would hand out every extra rune for free).
  const elementOpen = first || !ch.startElement;
  const usable = (w) => first || state.classId !== ch.classId || classWeaponUnlocked(profile, w) || !ch.startWeapon;
  if (!doc.getElementById('cc-style')) { const st = doc.createElement('style'); st.id = 'cc-style'; st.textContent = css; doc.head.appendChild(st); }
  const root = doc.createElement('div'); root.id = 'cc-overlay';
  // One screen, no scrolling (user, 11 Nov 2026): the preview stays on the left, three tabs on the right (look, start
  // element, class), the confirm button fixed at the bottom. The body only scrolls as a fallback on very small screens.
  root.dataset.tab = 'look';
  root.innerHTML = `
    <div class="cc-preview"><canvas width="240" height="280"></canvas><div class="cc-who"></div></div>
    <div class="cc-head"><h2>${first ? 'CHARAKTER ERSTELLEN' : tabs.length === 1 && tabs[0] === 'class' ? 'KLASSE AUSRÜSTEN' : 'GARDEROBE'}</h2>
      <div class="cc-tabs"><button type="button" data-go="look">AUSSEHEN</button><button type="button" data-go="element">ELEMENT</button><button type="button" data-go="class">KLASSE</button></div></div>
    <div class="cc-body">
      <div class="cc-tab" data-t="look">
        <div class="cc-sec"><h3>NAME</h3><input maxlength="16" placeholder="Dein Name"></div>
        <div class="cc-sec"><h3>FIGUR</h3><div class="cc-row cc-big" data-k="base"></div></div>
        <div class="cc-sec"><h3>HAAR</h3><div class="cc-row" data-k="hair"></div></div>
        <div class="cc-sec"><h3>RÜSTUNG</h3><div class="cc-row" data-k="armour"></div></div>
      </div>
      <div class="cc-tab" data-t="element">
        <div class="cc-sec"><h3>STARTELEMENT</h3><div class="cc-row cc-big" data-k="element"></div>
          <div class="cc-note">Eine zusätzliche Element-Rune, die du von Anfang an besitzt und doppelt im Deck hast. ${elementOpen ? 'Die Wahl gilt dauerhaft.' : 'Bereits gewählt.'}</div></div>
      </div>
      <div class="cc-tab" data-t="class">
        <div class="cc-grid" data-k="cls"></div><div class="cc-detail" data-k="detail"></div>
      </div>
    </div>
    <div class="cc-foot">${first ? '' : '<button class="cc-cancel" type="button">ABBRECHEN</button>'}<button class="cc-done" type="button">FERTIG ▶</button></div>`;
  const setTab = (t) => { root.dataset.tab = t; root.querySelectorAll('[data-go]').forEach((b) => b.classList.toggle('on', b.dataset.go === t)); };
  root.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); setTab(b.dataset.go); }));
  root.querySelectorAll('[data-go]').forEach((b) => { if (!tabs.includes(b.dataset.go) || tabs.length === 1) b.style.display = 'none'; });
  setTab(tabs[0]);
  doc.body.appendChild(root);
  const input = root.querySelector('input'); input.value = state.name;
  input.addEventListener('input', () => { state.name = input.value; });
  const row = (k) => root.querySelector(`[data-k="${k}"]`);
  const button = (parent, label, on, pick, swatch = null) => {
    const b = doc.createElement('button'); b.type = 'button'; if (swatch) { b.className = 'cc-sw'; b.style.background = swatch; b.title = label; } else b.textContent = label;
    b.classList.toggle('on', on); b.addEventListener('pointerdown', (e) => { e.preventDefault(); pick(); render(); }); parent.appendChild(b);
  };
  function render() {
    row('base').innerHTML = ''; for (const b of BASES) button(row('base'), `${b.name} · ${b.title}`, state.base === b.id, () => { state.base = b.id; });
    row('hair').innerHTML = ''; for (const [id, o] of Object.entries(LOOK_HAIR)) button(row('hair'), o.label, state.look.hair === id, () => { state.look.hair = id; }, o.swatch);
    row('armour').innerHTML = ''; for (const [id, o] of Object.entries(LOOK_ARMOUR)) button(row('armour'), o.label, state.look.armour === id, () => { state.look.armour = id; }, o.swatch);
    row('element').innerHTML = '';
    for (const id of START_ELEMENTS) { const r = recognizer.runes.find((x) => x.id === id); button(row('element'), r?.name ?? id.toUpperCase(), state.element === id, () => { if (elementOpen) state.element = id; }); const b = row('element').lastChild; if (r?.color) b.style.borderLeft = `6px solid ${r.color}`; if (!elementOpen && state.element !== id) b.classList.add('locked'); }
    row('cls').innerHTML = '';
    for (const c of CLASSES) { button(row('cls'), c.name, state.classId === c.id, () => { state.classId = c.id; state.weapon = classWeapons(c.id)[0]; }); const b = row('cls').lastChild; const sm = doc.createElement('small'); sm.textContent = `${c.role} · ${c.range.toUpperCase()}`; b.appendChild(sm); }
    const c = classById(state.classId); const det = row('detail'); det.innerHTML = `<div><p><b>${c.name}</b> · ${c.text}</p><div class="cc-wdesc"></div></div>`;
    const wrow = doc.createElement('div'); wrow.className = 'cc-row cc-big'; det.appendChild(wrow);
    for (const w of classWeapons(c.id)) {
      const ok = usable(w); button(wrow, ok ? WEAPONS[w].name : `${WEAPONS[w].name} · WEAPON LV ${CLASS_UNLOCK_LEVEL}`, state.weapon === w, () => { if (ok) state.weapon = w; });
      if (!ok) wrow.lastChild.classList.add('locked');
    }
    det.querySelector('.cc-wdesc').textContent = `${WEAPONS[state.weapon]?.name ?? ''}: ${WEAPONS[state.weapon]?.desc ?? ''}`;
    const who = root.querySelector('.cc-who'); if (who) who.textContent = `${state.name || '—'} · ${c.name}`;
  }
  render();
  // Live preview: the chosen figure in its look runs through the base animations.
  const canvas = root.querySelector('canvas'); const ctx = canvas.getContext('2d'); let t0 = performance.now();
  const frame = () => {
    if (!open) return;
    const t = (performance.now() - t0) / 1000; const total = PREVIEW_LOOP.reduce((a, [, d]) => a + d, 0); let u = t % total; let clip = 'idle';
    for (const [name, d] of PREVIEW_LOOP) { if (u < d) { clip = name; break; } u -= d; }
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#2c2436'; ctx.fillRect(0, 232, canvas.width, 48);
    const key = sprites.lookKey(state.base, state.look);
    sprites.renderEntity(ctx, key, 120, 238, { facing: 1, state: clip, animTime: u, visualHeight: 190 });
    open.raf = requestAnimationFrame(frame);
  };
  open = { root, raf: requestAnimationFrame(frame) };
  // The wardrobe can be left unchanged; the first-run screen is completed with DONE.
  root.querySelector('.cc-cancel')?.addEventListener('pointerdown', (e) => { e.preventDefault(); closeCharacterCreation(); });
  root.querySelector('.cc-done').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const classChanged = state.classId !== ch.classId;
    profile?.setCharacter?.({ name: state.name, base: state.base, look: state.look, classId: state.classId, startWeapon: classChanged || !ch.startWeapon ? state.weapon : ch.startWeapon, startElement: state.element });
    game?.setClassWeapon?.(state.weapon);
    closeCharacterCreation();
    onDone?.(profile?.character);
  });
  return true;
}

export function closeCharacterCreation() {
  if (!open) return;
  cancelAnimationFrame(open.raf); open.root.remove(); open = null;
}
