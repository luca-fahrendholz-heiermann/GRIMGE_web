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
#cc-overlay{position:fixed;inset:0;z-index:9000;background:rgba(8,6,14,.92);display:flex;align-items:center;justify-content:center;font-family:Cinzel,serif;color:#e8dcc4}
#cc-overlay .cc-box{width:min(960px,96vw);max-height:94vh;overflow:auto;display:grid;grid-template-columns:260px 1fr;gap:18px;padding:18px;border:2px solid #6b5a3a;background:#17121e;box-shadow:0 0 0 2px #0a080e}
#cc-overlay h2{grid-column:1/-1;margin:0;font-size:22px;letter-spacing:2px;color:#f0d890}
#cc-overlay .cc-preview{display:flex;flex-direction:column;align-items:center;gap:8px;position:sticky;top:0;align-self:start}
#cc-overlay canvas{background:#211a2a;border:2px solid #3a3048;image-rendering:pixelated;width:240px;height:280px}
#cc-overlay .cc-sec{margin-bottom:12px}
#cc-overlay .cc-sec h3{margin:0 0 6px;font-size:13px;letter-spacing:1.5px;color:#b8a070}
#cc-overlay .cc-row{display:flex;flex-wrap:wrap;gap:6px}
#cc-overlay button{font-family:inherit;font-size:12px;color:#e8dcc4;background:#2a2234;border:2px solid #4a3e5a;padding:6px 10px;cursor:pointer}
#cc-overlay button.on{border-color:#f0d890;background:#3e3222;color:#fff3c8}
#cc-overlay .cc-sw{width:34px;height:34px;padding:0}
#cc-overlay input{font-family:inherit;font-size:15px;background:#0e0b14;color:#fff3c8;border:2px solid #4a3e5a;padding:6px 8px;width:220px}
#cc-overlay .cc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
#cc-overlay .cc-grid button{text-align:left;padding:5px 8px}
#cc-overlay .cc-grid small{display:block;font-size:10px;color:#9a8eaa}
#cc-overlay .cc-detail{margin-top:8px;padding:8px 10px;border:2px solid #3a3048;background:#120e18}
#cc-overlay .cc-detail p{margin:0 0 8px;font-size:12px;line-height:1.45;color:#d8ccb4}
#cc-overlay .cc-detail .cc-wdesc{font-size:11px;color:#9a8eaa}
#cc-overlay button.locked{opacity:.5}
#cc-overlay .cc-done{font-size:16px;padding:10px 26px;border-color:#f0d890;background:#4a3a1e}
#cc-overlay .cc-note{font-size:11px;color:#8a7e98}
`;

let open = null;

export function isCharacterCreationOpen() { return !!open; }

// game: window.gameWorld (profile, classOptions, setClassWeapon); onDone(character) after DONE.
export function openCharacterCreation(game, { onDone = null, first = false } = {}) {
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
  root.innerHTML = `<div class="cc-box">
    <h2>${first ? 'CREATE YOUR CHARACTER' : 'WARDROBE'}</h2>
    <div class="cc-preview"><canvas width="240" height="280"></canvas><div class="cc-note">Placeholder screen — the final layout comes from the UI editor.</div></div>
    <div>
      <div class="cc-sec"><h3>NAME</h3><input maxlength="16" placeholder="Your name"></div>
      <div class="cc-sec"><h3>BODY</h3><div class="cc-row" data-k="base"></div></div>
      <div class="cc-sec"><h3>HAIR</h3><div class="cc-row" data-k="hair"></div></div>
      <div class="cc-sec"><h3>ARMOUR</h3><div class="cc-row" data-k="armour"></div></div>
      <div class="cc-sec"><h3>START ELEMENT · AN EXTRA ELEMENT RUNE YOU OWN FROM THE START</h3><div class="cc-row" data-k="element"></div></div>
      <div class="cc-sec"><h3>CLASS</h3><div class="cc-grid" data-k="cls"></div><div class="cc-detail" data-k="detail"></div></div>
      <div class="cc-row"><button class="cc-done" type="button">DONE</button>${first ? '' : '<button class="cc-cancel" type="button">CANCEL</button>'}</div>
    </div></div>`;
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
    const c = classById(state.classId); const det = row('detail'); det.innerHTML = `<p>${c.text}</p><h3>START WEAPON</h3>`;
    const wrow = doc.createElement('div'); wrow.className = 'cc-row'; det.appendChild(wrow);
    for (const w of classWeapons(c.id)) {
      const ok = usable(w); button(wrow, ok ? WEAPONS[w].name : `${WEAPONS[w].name} · WEAPON LV ${CLASS_UNLOCK_LEVEL}`, state.weapon === w, () => { if (ok) state.weapon = w; });
      if (!ok) wrow.lastChild.classList.add('locked');
    }
    const wd = doc.createElement('div'); wd.className = 'cc-wdesc'; wd.textContent = WEAPONS[state.weapon]?.desc ?? ''; det.appendChild(wd);
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
