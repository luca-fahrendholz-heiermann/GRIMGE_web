// GRIMGE UI editor (user, 22 Oct 2026): the real game screens exactly as deployed, in an iframe at
// the target resolution; an edit layer on top lets the user move / resize / hide UI elements,
// hand an element's function to another one, add new elements, link them to a screen or comment
// what they should do, and create new screens (their id exists right away). Saving writes
// docs/ui_spec/ui_editor_spec.json + UI_EDITOR_SPEC.md through the local dev server, so the
// layout can be carried into the game code exactly. Open it at /editor.html.
import {
  VIEWPORTS, emptySpec, screenOf, ensureScreen, addCustomScreen, removeScreen, changeOf, ensureChange,
  pruneScreen, addElement, specToMarkdown, sanitizeSpec, describeFunction
} from './ui_editor_spec.js';

// ── the game's own screens and how to open them (code runs inside the game iframe) ──
const BUILTIN = [
  { id: 'hub_character', name: 'Hub · Hauptmenü', group: 'Hub', setup: "await hub('character');" },
  { id: 'hub_heroes', name: 'Hub · Heldenauswahl', group: 'Hub', setup: "await hub('character', 'heroes');" },
  { id: 'hub_companions', name: 'Hub · Primal-Auswahl', group: 'Hub', setup: "await hub('character', 'companions');" },
  { id: 'hub_modes', name: 'Hub · Spielmodi', group: 'Hub', setup: "await hub('modes');" },
  { id: 'hub_freeplay', name: 'Hub · Freies Spiel', group: 'Hub', setup: "await hub('freeplay');" },
  { id: 'hub_deck', name: 'Hub · Grimoire-Seite', group: 'Hub', setup: "await hub('deck');" },
  { id: 'hub_skills', name: 'Hub · Skills-Seite', group: 'Hub', setup: "await hub('skills');" },
  { id: 'hub_settings', name: 'Hub · Einstellungen', group: 'Hub', setup: "await hub('settings');" },
  { id: 'deck_builder', name: 'Deck-Builder', group: 'Menüs', setup: "await hub('character'); ui.toggleDeckBuilder(true); ui.renderDeckBuilder(gw.profile); await sleep(200);" },
  { id: 'skill_tree', name: 'Skill-Baum / Masteries', group: 'Menüs', setup: "await hub('character'); ui.toggleSkillTree(true); ui.renderSkillTree(gw.profile); await sleep(200);" },
  { id: 'grimoire', name: 'Grimoire (Runen-Übersicht)', group: 'Menüs', setup: "await hub('character'); ui.toggleGrimoire(true); await sleep(200);" },
  { id: 'training_hud', name: 'Training · HUD', group: 'Match', setup: "await match('training');" },
  { id: 'training_maps', name: 'Training · Kartenwahl', group: 'Match', setup: "await match('training'); ui.toggleTrainingMaps(true); await sleep(200);" },
  { id: 'siege_hud', name: 'Belagerung · HUD', group: 'Match', setup: "await match('siege');" },
  { id: 'ingame_menu', name: 'Pausemenü', group: 'Match', setup: "await match('training'); ui.toggleIngameMenu(true); await sleep(200);" },
  { id: 'run_choice', name: 'Dungeon · Runenwahl', group: 'Match', setup: "await match('dungeon'); gw.queueRunRuneChoice(); await sleep(250);" },
  { id: 'results', name: 'Ergebnis-Bildschirm', group: 'Match', setup: "await match('training'); ui.showResults(true, { winner: 'blue', elapsed: 154, stats: gw.stats }); await sleep(250);" }
];
const BUILTIN_BY_ID = Object.fromEntries(BUILTIN.map((s) => [s.id, s]));
const PRELUDE = `const gw = window.gameWorld; const { ui } = await import(new URL('./src/ui.js', document.baseURI).href);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const closeAll = () => { for (const f of [() => ui.toggleDeckBuilder(false), () => ui.toggleSkillTree(false), () => ui.toggleGrimoire(false), () => ui.toggleTrainingMaps(false), () => ui.toggleIngameMenu(false), () => ui.showResults(false), () => ui.hideRunRuneChoice?.()]) { try { f(); } catch (e) { /* screen not open */ } } };
const home = () => { if (gw.matchState !== 'Menu') gw.returnToHub(); };
const hub = async (page, sel) => { closeAll(); home(); ui.setHubPage(page); ui.toggleHubSelection(null); if (sel) ui.toggleHubSelection(sel); await sleep(300); };
const match = async (mode) => { closeAll(); home(); gw.setMatchMode(mode); gw.startMatch(); await sleep(800); };`;

// What counts as an element: everything you can press, plus the big HUD / hub blocks.
const INTERACTIVE = 'button, a[href], input, select, textarea, [role="button"], [data-hub-action], [data-hub-tab], [data-deck-action], [data-deck-cat], [data-mastery-id], [data-map-id], .card-overlay, [onclick]';
const BLOCKS = '#top-hud-bar > *, #bottom-hud-bar > *, #objective-hud, #training-controls, #announcement-banner:not(:empty), #touch-joystick, #rune-cards-row, #bottom-right-actions, #match-clock-box, .hub-art-header, .hub-art-actions, .hub-art-hero, .hub-art-logo, .hub-topbar, .run-rune-options, .deck-categories, .deck-presets';
const FN_SKIP = new Set(['data-hub-page', 'data-uied']);
// Single pieces inside a block (user, 23 Oct 2026: the hub's sprite and the name under it were ONE element):
// images and text fields count on their own — but never inside a button (a button moves as one unit).
const LEAVES = '#ui-layer img, #ui-layer [id], #ui-layer b, #ui-layer strong, #ui-layer span, #ui-layer small, #ui-layer em, #ui-layer h1, #ui-layer h2, #ui-layer h3, #ui-layer h4, #ui-layer p, #ui-layer label';
const isLeaf = (el) => el.tagName === 'IMG' || !!el.id || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0); // own text (also with nested values)

// ── state ──
const $ = (id) => document.getElementById(id);
const frame = $('frame'); const stage = $('stage'); const overlay = $('overlay'); const wrap = $('stage-wrap');
let spec = emptySpec(); let preset = 'desktop'; let current = 'hub_character'; let selected = null; // { kind: 'change' | 'added', target | id }
// Ctrl / Cmd + click builds a multi-selection (user, 23 Oct 2026): dragging, arrow keys and Delete act on all of them.
let multi = [];
const sameSel = (a, b) => !!a && !!b && a.kind === b.kind && (a.kind === 'change' ? a.target === b.target : a.id === b.id);
const isSelected = (sel) => multi.some((m) => sameSel(m, sel));
const clearSelection = () => { selected = null; multi = []; };
let scanned = []; // [{ el, target, label, fn }]
const registry = new Map(); // fn key → { key, label, screen }
const touched = new Map(); // element → its original inline styles (restored on screen switch)
let scale = 1; let busy = false; let mode = 'edit';
const vp = () => VIEWPORTS[preset];
const status = (t) => { $('status').textContent = t; };
const win = () => frame.contentWindow; const doc = () => frame.contentDocument;
const runInGame = (code) => new (win().Function)(`return (async () => { ${PRELUDE}\n${code} })()`)();

// ── persistence ──
const LS = 'grimge-ui-editor-spec';
function autosave() { spec.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' '); try { localStorage.setItem(LS, JSON.stringify(spec)); } catch { /* storage full */ } renderScreenList(); }
async function load() {
  try { const r = await fetch('/api/ui-spec', { cache: 'no-store' }); if (r.ok) { const raw = await r.json(); if (raw?.screens) return sanitizeSpec(raw); } } catch { /* static hosting: no API */ }
  try { const raw = JSON.parse(localStorage.getItem(LS) ?? 'null'); if (raw) return sanitizeSpec(raw); } catch { /* broken local copy */ }
  return emptySpec();
}
async function save() {
  for (const s of spec.screens) pruneScreen(s);
  spec.viewport = { w: vp().w, h: vp().h, preset }; autosave();
  const names = Object.fromEntries(BUILTIN.map((b) => [b.id, b.name]));
  try {
    const r = await fetch('/api/ui-spec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spec, markdown: specToMarkdown(spec, names) }) });
    if (!r.ok) throw new Error(r.status);
    status('Gespeichert: docs/ui_spec/ui_editor_spec.json + UI_EDITOR_SPEC.md');
  } catch { download(); status('Kein lokaler Server – als Datei heruntergeladen'); }
}
function download() {
  const blob = new Blob([JSON.stringify(spec, null, 1)], { type: 'application/json' }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'ui_editor_spec.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ── stage layout ──
function fit() {
  const { w, h } = vp(); const W = wrap.clientWidth - 24; const H = wrap.clientHeight - 24;
  scale = Math.min(W / w, H / h, 1.6); stage.style.width = w + 'px'; stage.style.height = h + 'px';
  stage.style.transform = `scale(${scale})`; stage.style.left = Math.round((wrap.clientWidth - w * scale) / 2) + 'px'; stage.style.top = Math.round((wrap.clientHeight - h * scale) / 2) + 'px';
}
const stagePoint = (e) => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; };

// ── element discovery ──
function selectorFor(el) {
  const d = doc();
  if (el.id) return '#' + CSS.escape(el.id);
  for (const a of el.attributes) if (a.name.startsWith('data-') && !FN_SKIP.has(a.name) && a.value) { const s = `${el.tagName.toLowerCase()}[${a.name}="${a.value}"]`; if (d.querySelectorAll(s).length === 1) return s; }
  const parts = []; let cur = el;
  while (cur && cur !== d.body) {
    if (cur.id) { parts.unshift('#' + CSS.escape(cur.id)); break; }
    const tag = cur.tagName.toLowerCase(); const same = cur.parentElement ? [...cur.parentElement.children].filter((s) => s.tagName === cur.tagName) : [cur];
    const cls = [...cur.classList].find((c) => !['active', 'is-open', 'hidden', 'selected'].includes(c));
    let part = tag + (cls ? '.' + CSS.escape(cls) : ''); if (same.length > 1) part += `:nth-of-type(${same.indexOf(cur) + 1})`;
    parts.unshift(part); cur = cur.parentElement;
  }
  return parts.join(' > ');
}
function functionOf(el) {
  for (const a of el.attributes) if (a.name.startsWith('data-') && !FN_SKIP.has(a.name) && a.value) return `${a.name}=${a.value}`;
  if (el.id && (el.matches('button, a, [role="button"], input, select') || /-btn$/.test(el.id))) return '#' + el.id;
  if (el.getAttribute('onclick')) return 'onclick';
  return null;
}
function labelOf(el) {
  const t = el.getAttribute('aria-label') || el.getAttribute('title') || el.querySelector?.('img[alt]:not([alt=""])')?.alt || el.textContent || el.id || el.className;
  return String(t).replace(/\s+/g, ' ').trim().slice(0, 42);
}
const LAYERS = '#hub-overlay, #results-overlay, #skill-tree-modal, #training-map-modal, #deck-builder-modal, #game-menu-modal, #grimoire-modal, #drawing-hud, #run-rune-choice, #rotate-overlay';
const layerOf = (n) => n.closest?.(LAYERS) ?? null;
const visCache = new WeakMap();
function seenVisible(el, w) {
  if (visCache.has(el)) return visCache.get(el);
  let ok = true; for (let a = el; a && a.nodeType === 1; a = a.parentElement) { const cs = w.getComputedStyle(a); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .05) { ok = false; break; } }
  visCache.set(el, ok); return ok;
}
function scan() {
  const d = doc(); const w = win(); if (!d?.body) return [];
  const { w: W, h: H } = vp();
  const probe = d.createElement('style'); probe.textContent = '* { pointer-events: auto !important; }'; d.head.appendChild(probe);
  const out = []; const seen = new Set();
  try {
    const blocks = new Set(d.querySelectorAll(INTERACTIVE + ', ' + BLOCKS));
    const leaves = [...d.querySelectorAll(LEAVES)].filter((el) => !blocks.has(el) && isLeaf(el) && !el.parentElement?.closest(INTERACTIVE));
    for (const el of [...blocks, ...leaves]) {
      if (seen.has(el) || el.closest('#safe-area-probe, #rotate-overlay')) continue; seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.right <= 0 || r.bottom <= 0 || r.left >= W || r.top >= H || r.width * r.height > W * H * .8) continue;
      let gone = false; for (let a = el; a && a !== d.documentElement; a = a.parentElement) { const cs = w.getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || (+cs.opacity < .05 && !a.dataset.uiedHidden)) { gone = true; break; } }
      if (gone) continue;
      // Really on screen: some point of it is not covered by something else.
      let top = false;
      for (const [fx, fy] of [[.5, .5], [.25, .3], [.75, .7], [.3, .75], [.7, .25]]) {
        const x = r.left + r.width * fx; const y = r.top + r.height * fy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        // The first VISIBLE element under the point (closed panels with opacity 0 do not count as covering).
        // Covered only by a visible element of ANOTHER layer (a menu / overlay in front); overlaps inside the same menu are fine.
        const hits = d.elementsFromPoint(x, y); const at = hits.findIndex((h) => h === el || el.contains(h)); if (at < 0) continue;
        const mine = layerOf(el); if (!hits.slice(0, at).some((h) => !h.contains(el) && layerOf(h) !== mine && seenVisible(h, w))) { top = true; break; }
      }
      if (!top) continue;
      const fn = functionOf(el); const label = labelOf(el);
      out.push({ el, target: selectorFor(el), label, fn, area: r.width * r.height });
      if (fn && !registry.has(fn)) registry.set(fn, { key: fn, label, screen: current });
    }
  } finally { probe.remove(); }
  // Big blocks first, so the small buttons inside lie on top of them.
  return out.sort((a, b) => b.area - a.area);
}

// ── live preview of the changes inside the game ──
function remember(el) { if (!touched.has(el)) touched.set(el, { translate: el.style.translate, width: el.style.getPropertyValue('width'), wp: el.style.getPropertyPriority('width'), height: el.style.getPropertyValue('height'), hp: el.style.getPropertyPriority('height'), opacity: el.style.opacity, outline: el.style.outline }); }
function restoreAll() {
  for (const [el, o] of touched) { el.style.translate = o.translate; el.style.setProperty('width', o.width, o.wp); el.style.setProperty('height', o.height, o.hp); el.style.opacity = o.opacity; el.style.outline = o.outline; delete el.dataset.uiedHidden; }
  touched.clear();
}
function applyChange(c) {
  const el = doc()?.querySelector(c.target); if (!el) return false;
  remember(el); const { w, h } = vp();
  // The game scales its menus (CSS transforms): the spec stores SCREEN fractions, the element's own px are
  // screen px divided by its scale (measured once, a translate does not change it).
  const o0 = touched.get(el); if (!o0.k) { const r = el.getBoundingClientRect(); o0.k = { x: el.offsetWidth ? r.width / el.offsetWidth : 1, y: el.offsetHeight ? r.height / el.offsetHeight : 1 }; }
  const kx = o0.k.x || 1; const ky = o0.k.y || 1;
  el.style.translate = (c.move.dx || c.move.dy) ? `${(c.move.dx * w / kx).toFixed(2)}px ${(c.move.dy * h / ky).toFixed(2)}px` : touched.get(el).translate;
  if (c.size) { el.style.setProperty('width', `${(c.size.w * w / kx).toFixed(2)}px`, 'important'); el.style.setProperty('height', `${(c.size.h * h / ky).toFixed(2)}px`, 'important'); el.style.boxSizing = 'border-box'; }
  else { const o = touched.get(el); el.style.setProperty('width', o.width, o.wp); el.style.setProperty('height', o.height, o.hp); }
  if (c.hidden) { el.dataset.uiedHidden = '1'; el.style.opacity = '.25'; el.style.outline = '2px dashed #ff5252'; }
  else { delete el.dataset.uiedHidden; el.style.opacity = touched.get(el).opacity; el.style.outline = touched.get(el).outline; }
  return true;
}
const screenSpec = () => screenOf(spec, current);
function applyScreen() { const s = screenSpec(); if (!s) return []; return s.changes.filter((c) => !applyChange(c)).map((c) => c.target); }

// ── drawing the edit layer ──
function drawOverlay() {
  overlay.innerHTML = ''; const s = screenSpec(); const { w: W, h: H } = vp();
  const builtin = !!BUILTIN_BY_ID[current] || !!s?.base;
  if (builtin && BUILTIN_BY_ID[current]) for (const it of scanned) {
    const r = it.el.getBoundingClientRect(); const c = s ? changeOf(s, it.target) : null;
    const box = document.createElement('div'); box.className = 'box' + (c && !isPlain(c) ? ' changed' : '') + (c?.hidden ? ' hiddenEl' : '') + (isSelected({ kind: 'change', target: it.target }) ? ' sel' : '');
    Object.assign(box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    box.innerHTML = `<span class="tag">${esc(it.label || it.target)}${it.fn ? ' · ' + esc(it.fn) : ''}</span><i class="grip"></i>`;
    box.addEventListener('pointerdown', (e) => startDrag(e, { kind: 'change', target: it.target }, e.target.classList.contains('grip')));
    overlay.appendChild(box);
  }
  for (const a of s?.added ?? []) {
    const d = document.createElement('div'); d.className = `added k-${a.kind}` + (isSelected({ kind: 'added', id: a.id }) ? ' sel' : '');
    Object.assign(d.style, { left: a.rect.x * W + 'px', top: a.rect.y * H + 'px', width: a.rect.w * W + 'px', height: a.rect.h * H + 'px', background: a.style.bg, color: a.style.color });
    d.innerHTML = `${esc(a.text)}<i class="grip"></i>`; d.title = a.id;
    d.addEventListener('pointerdown', (e) => startDrag(e, { kind: 'added', id: a.id }, e.target.classList.contains('grip')));
    overlay.appendChild(d);
  }
}
const isPlain = (c) => !c.hidden && !c.size && !c.comment && (!c.function || c.function.type === 'keep') && !c.move.dx && !c.move.dy;
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

// ── dragging / resizing ──
// The spec entry behind a selection (created on demand for page elements).
function itemOf(sel) {
  const s = ensureScreen(spec, current, screenMeta(current));
  if (sel.kind === 'change') { const it = scanned.find((x) => x.target === sel.target); return ensureChange(s, sel.target, { label: it?.label ?? '', fn: it?.fn ?? null }); }
  return s.added.find((a) => a.id === sel.id) ?? null;
}
// Current on-screen box of a selection (px in the viewport).
function rectOf(sel) {
  const { w: W, h: H } = vp();
  if (sel.kind === 'change') { const r = scanned.find((x) => x.target === sel.target)?.el.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null; }
  const a = itemOf(sel); return a ? { x: a.rect.x * W, y: a.rect.y * H, w: a.rect.w * W, h: a.rect.h * H } : null;
}
function moveBy(sel, dxPx, dyPx) {
  const { w: W, h: H } = vp(); const item = itemOf(sel); if (!item) return;
  if (sel.kind === 'change') { item.move = { dx: item.move.dx + dxPx / W, dy: item.move.dy + dyPx / H }; applyChange(item); }
  else { item.rect.x += dxPx / W; item.rect.y += dyPx / H; }
}
function startDrag(e, sel, resize) {
  if (mode !== 'edit') return;
  e.preventDefault(); e.stopPropagation();
  // Ctrl / Cmd + click: add to / remove from the selection (no drag when removing).
  if (e.ctrlKey || e.metaKey) {
    if (isSelected(sel)) { multi = multi.filter((m) => !sameSel(m, sel)); selected = multi[multi.length - 1] ?? null; renderInspector(); drawOverlay(); return; }
    multi.push(sel);
  } else if (!isSelected(sel)) multi = [sel];
  selected = sel;
  const group = multi.length > 1; if (group) resize = false; // a group only moves together
  const p0 = stagePoint(e); const { w: W, h: H } = vp();
  const items = multi.map((m) => { const item = itemOf(m); const r = m.kind === 'change' ? scanned.find((x) => x.target === m.target)?.el.getBoundingClientRect() : null;
    return { m, item, start: m.kind === 'change' ? { dx: item.move.dx, dy: item.move.dy, w: item.size?.w ?? (r ? r.width / W : .1), h: item.size?.h ?? (r ? r.height / H : .05) } : { ...item.rect } }; }).filter((x) => x.item);
  renderInspector(); drawOverlay();
  const move = (ev) => {
    const p = stagePoint(ev); const fx = (p.x - p0.x) / W; const fy = (p.y - p0.y) / H; const snap = (v, unit) => (ev.altKey ? v : Math.round(v * unit) / unit);
    for (const { m, item, start } of items) {
      if (m.kind === 'change') {
        if (resize) item.size = { w: Math.max(.01, snap(start.w + fx, W)), h: Math.max(.01, snap(start.h + fy, H)) };
        else item.move = { dx: snap(start.dx + fx, W), dy: snap(start.dy + fy, H) };
        applyChange(item);
      } else if (resize) { item.rect.w = Math.max(.01, start.w + fx); item.rect.h = Math.max(.01, start.h + fy); }
      else { item.rect.x = start.x + fx; item.rect.y = start.y + fy; }
    }
    drawOverlay();
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); autosave(); renderInspector(); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay && mode === 'edit' && !e.ctrlKey && !e.metaKey) { clearSelection(); drawOverlay(); renderInspector(); } });

// ── screens ──
function screenMeta(id) { const b = BUILTIN_BY_ID[id]; return b ? { name: b.name, builtin: true } : { name: screenOf(spec, id)?.name ?? id, builtin: false }; }
async function openScreen(id) {
  if (busy) return; busy = true; current = id; clearSelection(); restoreAll(); renderScreenList(); renderInspector();
  const s = screenOf(spec, id); const b = BUILTIN_BY_ID[id]; const base = b ? b : (s?.base ? BUILTIN_BY_ID[s.base] : null);
  $('blank').style.display = base ? 'none' : 'block'; frame.style.visibility = base ? 'visible' : 'hidden';
  status(`öffne ${b?.name ?? s?.name ?? id} …`);
  try { if (base) await runInGame(base.setup); } catch (err) { status('Fehler beim Öffnen: ' + err.message); }
  scanned = base && b ? scan() : [];
  const missing = b ? applyScreen() : [];
  drawOverlay(); renderInspector(missing);
  status(`${b?.name ?? s?.name ?? id}: ${scanned.length} Elemente${missing.length ? ` · ${missing.length} Änderung(en) ohne Ziel` : ''}`);
  busy = false;
}
async function scanAll() {
  if (busy) return; busy = true; const back = current; /* no screen switch while collecting */
  for (const b of BUILTIN) { status(`sammle Funktionen: ${b.name} …`); current = b.id; restoreAll(); try { await runInGame(b.setup); } catch { /* skip */ } scan(); }
  current = back; busy = false; await openScreen(back); status(`${registry.size} Funktionen gesammelt`);
}
function renderScreenList() {
  const list = $('screen-list'); const groups = {};
  for (const b of BUILTIN) (groups[b.group] ??= []).push({ id: b.id, name: b.name, builtin: true });
  const custom = spec.screens.filter((s) => !s.builtin).map((s) => ({ id: s.id, name: s.name, builtin: false }));
  const row = (it) => { const s = screenOf(spec, it.id); const edited = s && (s.changes.some((c) => !isPlain(c)) || s.added.length || s.description); return `<div class="screen-item ${it.id === current ? 'active' : ''}" data-screen="${it.id}"><span class="dot ${it.builtin ? 'builtin' : ''}"></span>${esc(it.name)}${edited ? ' <span class="edited">●</span>' : ''}<small>${it.id}</small></div>`; };
  list.innerHTML = Object.entries(groups).map(([g, items]) => `<div class="group-title">${g.toUpperCase()}</div>${items.map(row).join('')}`).join('') + `<div class="group-title">NEUE SCREENS</div>${custom.map(row).join('') || '<p class="muted">noch keine</p>'}`;
  for (const el of list.querySelectorAll('[data-screen]')) el.onclick = () => openScreen(el.dataset.screen);
}

// ── inspector ──
function allScreens() { return [...BUILTIN.map((b) => ({ id: b.id, name: b.name })), ...spec.screens.filter((s) => !s.builtin).map((s) => ({ id: s.id, name: s.name }))]; }
function functionEditor(fnObj) {
  const f = fnObj ?? { type: 'keep' };
  const opts = [['keep', 'unverändert'], ['none', 'keine Funktion'], ['from', 'Funktion eines anderen Elements'], ['navigate', 'zu Screen wechseln'], ['custom', 'eigene (im Kommentar beschreiben)']];
  const reg = [...registry.values()].sort((a, b) => a.key.localeCompare(b.key));
  return `<label>Funktion</label><select id="fn-type">${opts.map(([v, t]) => `<option value="${v}" ${f.type === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    ${f.type === 'from' ? `<select id="fn-from" style="margin-top:4px">${reg.length ? reg.map((r) => `<option value="${esc(r.key)}" ${f.key === r.key ? 'selected' : ''}>${esc(r.label || r.key)} — ${esc(r.key)}</option>`).join('') : '<option value="">(erst Screens öffnen oder „Alle Funktionen sammeln“)</option>'}</select>` : ''}
    ${f.type === 'navigate' ? `<select id="fn-screen" style="margin-top:4px">${allScreens().map((s) => `<option value="${s.id}" ${f.screen === s.id ? 'selected' : ''}>${esc(s.name)} (${s.id})</option>`).join('')}<option value="__new">＋ neuer Screen …</option></select>` : ''}
    <div class="muted" style="margin-top:4px">${esc(describeFunction(f, spec))}</div>`;
}
function bindFunctionEditor(target) {
  const t = $('fn-type'); if (!t) return;
  t.onchange = () => { const v = t.value; target.function = v === 'from' ? { type: 'from', key: [...registry.keys()][0] ?? '', label: [...registry.values()][0]?.label ?? '', screen: [...registry.values()][0]?.screen } : v === 'navigate' ? { type: 'navigate', screen: allScreens()[0].id } : { type: v }; autosave(); renderInspector(); drawOverlay(); };
  const fr = $('fn-from'); if (fr) fr.onchange = () => { const r = registry.get(fr.value); target.function = { type: 'from', key: fr.value, label: r?.label ?? '', screen: r?.screen }; autosave(); renderInspector(); };
  const sc = $('fn-screen'); if (sc) sc.onchange = () => {
    if (sc.value === '__new') { const ns = addCustomScreen(spec); /* named later in the screen panel */ target.function = { type: 'navigate', screen: ns.id }; }
    else target.function = { type: 'navigate', screen: sc.value };
    autosave(); renderInspector();
  };
}
function renderInspector(missing = []) {
  // Screen properties.
  const s = screenOf(spec, current); const b = BUILTIN_BY_ID[current];
  $('screen-props').innerHTML = `<div class="code">${current}</div>
    <label>Name</label><input id="sc-name" value="${esc(b ? b.name : s?.name ?? '')}" ${b ? 'disabled' : ''}>
    <label>Beschreibung</label><textarea id="sc-desc" placeholder="Wofür ist dieser Screen? Was soll passieren?">${esc(s?.description ?? '')}</textarea>
    ${b ? '' : `<label>Hintergrund</label><select id="sc-base"><option value="">leer</option>${BUILTIN.map((x) => `<option value="${x.id}" ${s?.base === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><button id="sc-del" style="margin-top:8px;width:100%">Screen löschen</button>`}
    ${missing.length ? `<p class="muted" style="color:#ff8a80">Nicht gefunden: ${missing.map(esc).join(', ')}</p>` : ''}`;
  $('sc-desc').oninput = (e) => { ensureScreen(spec, current, screenMeta(current)).description = e.target.value; autosave(); };
  if (!b) {
    $('sc-name').oninput = (e) => { const sc = ensureScreen(spec, current, screenMeta(current)); sc.name = e.target.value; autosave(); };
    $('sc-base').onchange = (e) => { ensureScreen(spec, current, screenMeta(current)).base = e.target.value || null; autosave(); openScreen(current); };
    $('sc-del').onclick = () => { if (confirm(`Screen ${current} löschen?`)) { removeScreen(spec, current); autosave(); openScreen('hub_character'); } };
  }
  // Selection.
  const box = $('element-props'); const { w: W, h: H } = vp();
  if (!selected) { box.innerHTML = '<p class="muted">Ein Element im Bild anklicken. Mit <b>Strg</b> + Klick mehrere auswählen.</p>'; return; }
  if (multi.length > 1) {
    const label = (m) => (m.kind === 'change' ? (scanned.find((x) => x.target === m.target)?.label || m.target) : (itemOf(m)?.text || m.id));
    box.innerHTML = `<b>${multi.length} Elemente ausgewählt</b><div class="muted">${multi.map((m) => esc(label(m))).join(' · ')}</div>
      <div class="row"><div><label>Δ x (px)</label><input id="g-dx" type="number" value="0"></div><div><label>Δ y (px)</label><input id="g-dy" type="number" value="0"></div></div>
      <button id="g-move" style="margin-top:6px;width:100%">Alle verschieben</button>
      ${alignBlock(true)}
      <button id="g-clear" style="margin-top:8px;width:100%">Auswahl aufheben</button>`;
    $('g-move').onclick = () => { const dx = +$('g-dx').value || 0; const dy = +$('g-dy').value || 0; for (const m of multi) moveBy(m, dx, dy); autosave(); drawOverlay(); renderInspector(); };
    $('g-clear').onclick = () => { clearSelection(); drawOverlay(); renderInspector(); };
    bindAlign(box);
    return;
  }
  const sc = ensureScreen(spec, current, screenMeta(current));
  if (selected.kind === 'change') {
    const it = scanned.find((x) => x.target === selected.target); const c = ensureChange(sc, selected.target, { label: it?.label ?? '', fn: it?.fn ?? null });
    box.innerHTML = `<b>${esc(c.label || '—')}</b><div class="code">${esc(c.target)}</div><div class="muted">bisherige Funktion: ${esc(c.fn ?? 'keine')}</div>
      <div class="row"><div><label>Δ x (px)</label><input id="c-dx" type="number" value="${Math.round(c.move.dx * W)}"></div><div><label>Δ y (px)</label><input id="c-dy" type="number" value="${Math.round(c.move.dy * H)}"></div></div>
      <div class="row"><div><label>Breite (px)</label><input id="c-w" type="number" placeholder="original" value="${c.size ? Math.round(c.size.w * W) : ''}"></div><div><label>Höhe (px)</label><input id="c-h" type="number" placeholder="original" value="${c.size ? Math.round(c.size.h * H) : ''}"></div></div>
      <label><input id="c-hidden" type="checkbox" style="width:auto" ${c.hidden ? 'checked' : ''}> ausblenden</label>
      ${functionEditor(c.function)}
      <label>Kommentar (was genau soll passieren?)</label><textarea id="c-comment">${esc(c.comment)}</textarea>
      ${alignBlock(false)}
      <button id="c-reset" style="margin-top:8px;width:100%">Änderungen zurücksetzen</button>`;
    bindAlign(box);
    const upd = () => { c.move = { dx: (+$('c-dx').value || 0) / W, dy: (+$('c-dy').value || 0) / H }; const w = +$('c-w').value; const h = +$('c-h').value; c.size = w > 0 && h > 0 ? { w: w / W, h: h / H } : null; c.hidden = $('c-hidden').checked; applyChange(c); autosave(); drawOverlay(); };
    for (const id of ['c-dx', 'c-dy', 'c-w', 'c-h']) $(id).onchange = upd; $('c-hidden').onchange = upd;
    $('c-comment').oninput = (e) => { c.comment = e.target.value; autosave(); };
    $('c-reset').onclick = () => { c.move = { dx: 0, dy: 0 }; c.size = null; c.hidden = false; c.function = null; c.comment = ''; applyChange(c); pruneScreen(sc); autosave(); renderInspector(); drawOverlay(); };
    bindFunctionEditor(c);
  } else {
    const a = sc.added.find((x) => x.id === selected.id); if (!a) { selected = null; renderInspector(); return; }
    box.innerHTML = `<div class="code">${esc(a.id)}</div>
      <label>Art</label><select id="a-kind">${['button', 'text', 'panel', 'icon'].map((k) => `<option ${a.kind === k ? 'selected' : ''}>${k}</option>`).join('')}</select>
      <label>Text</label><input id="a-text" value="${esc(a.text)}">
      <div class="row"><div><label>x (px)</label><input id="a-x" type="number" value="${Math.round(a.rect.x * W)}"></div><div><label>y (px)</label><input id="a-y" type="number" value="${Math.round(a.rect.y * H)}"></div></div>
      <div class="row"><div><label>Breite</label><input id="a-w" type="number" value="${Math.round(a.rect.w * W)}"></div><div><label>Höhe</label><input id="a-h" type="number" value="${Math.round(a.rect.h * H)}"></div></div>
      <div class="row"><div><label>Hintergrund</label><input id="a-bg" value="${esc(a.style.bg)}"></div><div><label>Schrift</label><input id="a-color" value="${esc(a.style.color)}"></div></div>
      ${functionEditor(a.function)}
      <label>Kommentar (was genau soll passieren?)</label><textarea id="a-comment">${esc(a.comment)}</textarea>
      ${alignBlock(false)}
      <button id="a-del" style="margin-top:8px;width:100%">Element löschen</button>`;
    bindAlign(box);
    const upd = () => { a.kind = $('a-kind').value; a.text = $('a-text').value; a.rect = { x: (+$('a-x').value || 0) / W, y: (+$('a-y').value || 0) / H, w: Math.max(4, +$('a-w').value || 0) / W, h: Math.max(4, +$('a-h').value || 0) / H }; a.style = { bg: $('a-bg').value, color: $('a-color').value }; autosave(); drawOverlay(); };
    for (const id of ['a-kind', 'a-x', 'a-y', 'a-w', 'a-h', 'a-bg', 'a-color']) $(id).onchange = upd; $('a-text').oninput = upd;
    $('a-comment').oninput = (e) => { a.comment = e.target.value; autosave(); };
    $('a-del').onclick = () => { sc.added = sc.added.filter((x) => x !== a); selected = null; autosave(); renderInspector(); drawOverlay(); };
    bindFunctionEditor(a);
  }
}

// The align buttons (PowerPoint-like): edges / centres, distribute, relative to the selection or the screen.
function alignBlock(group) {
  return `<label>Ausrichten ${group ? '' : '(am Bildschirm)'}</label>
    <div class="row"><button data-align="left" title="linksbündig">⇤ Links</button><button data-align="hcenter" title="horizontal zentrieren">↔ Mitte</button><button data-align="right" title="rechtsbündig">Rechts ⇥</button></div>
    <div class="row" style="margin-top:4px"><button data-align="top" title="oben ausrichten">⤒ Oben</button><button data-align="vcenter" title="vertikal zentrieren">↕ Mitte</button><button data-align="bottom" title="unten ausrichten">Unten ⤓</button></div>
    ${group ? `<label>Gleichmäßig verteilen</label><div class="row"><button data-align="hdist">⟷ Waagerecht</button><button data-align="vdist">⟷ Senkrecht</button></div>
    <label><input id="g-screen" type="checkbox" style="width:auto" ${alignToScreen ? 'checked' : ''}> am Bildschirm ausrichten (statt an der Auswahl)</label>` : ''}`;
}
function bindAlign(box) {
  for (const b of box.querySelectorAll('[data-align]')) b.onclick = () => { alignSelection(b.dataset.align); autosave(); drawOverlay(); renderInspector(); };
  const scr = box.querySelector('#g-screen'); if (scr) scr.onchange = (e) => { alignToScreen = e.target.checked; };
}
// Align / distribute the multi-selection (edges and centres of the group's bounding box).
let alignToScreen = false;
function alignSelection(kind, toScreen = alignToScreen) {
  const list = (multi.length ? multi : selected ? [selected] : []).map((m) => ({ m, r: rectOf(m) })).filter((x) => x.r); if (!list.length) return;
  const screen = toScreen || list.length === 1; const { w: W, h: H } = vp();
  let L = Math.min(...list.map((x) => x.r.x)); let R = Math.max(...list.map((x) => x.r.x + x.r.w)); let T = Math.min(...list.map((x) => x.r.y)); let B = Math.max(...list.map((x) => x.r.y + x.r.h));
  if (screen) { L = 0; R = W; T = 0; B = H; }
  const cx = (L + R) / 2; const cy = (T + B) / 2;
  if (kind === 'hdist' || kind === 'vdist') {
    if (list.length < 2) return;
    const hor = kind === 'hdist'; const sorted = [...list].sort((a, b) => (hor ? a.r.x + a.r.w / 2 - b.r.x - b.r.w / 2 : a.r.y + a.r.h / 2 - b.r.y - b.r.h / 2));
    let c0 = hor ? sorted[0].r.x + sorted[0].r.w / 2 : sorted[0].r.y + sorted[0].r.h / 2; let c1 = hor ? sorted.at(-1).r.x + sorted.at(-1).r.w / 2 : sorted.at(-1).r.y + sorted.at(-1).r.h / 2;
    if (screen) { const span = hor ? W : H; c0 = span / (sorted.length + 1); c1 = span - c0; }
    sorted.forEach((x, i) => { const want = c0 + (c1 - c0) * i / (sorted.length - 1); const have = hor ? x.r.x + x.r.w / 2 : x.r.y + x.r.h / 2; moveBy(x.m, hor ? want - have : 0, hor ? 0 : want - have); });
    return;
  }
  for (const { m, r } of list) {
    const dx = kind === 'left' ? L - r.x : kind === 'right' ? R - (r.x + r.w) : kind === 'hcenter' ? cx - (r.x + r.w / 2) : 0;
    const dy = kind === 'top' ? T - r.y : kind === 'bottom' ? B - (r.y + r.h) : kind === 'vcenter' ? cy - (r.y + r.h / 2) : 0;
    moveBy(m, dx, dy);
  }
}

// ── toolbar ──
function setMode(m) { mode = m; overlay.classList.toggle('pass', m === 'play'); $('mode-edit').classList.toggle('on', m === 'edit'); $('mode-play').classList.toggle('on', m === 'play'); if (m === 'edit') { scanned = BUILTIN_BY_ID[current] ? scan() : []; drawOverlay(); } }
$('mode-edit').onclick = () => setMode('edit'); $('mode-play').onclick = () => setMode('play');
$('rescan').onclick = () => { restoreAll(); scanned = BUILTIN_BY_ID[current] ? scan() : []; applyScreen(); drawOverlay(); status(`${scanned.length} Elemente erfasst`); };
$('scan-all').onclick = () => scanAll();
$('save').onclick = () => save(); $('export').onclick = () => download();
$('import').onclick = () => $('import-file').click();
$('import-file').onchange = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { spec = sanitizeSpec(JSON.parse(await f.text())); autosave(); openScreen(current); status('importiert'); } catch (err) { status('Import fehlgeschlagen: ' + err.message); } };
$('new-screen').onclick = async () => { const s = addCustomScreen(spec); autosave(); await openScreen(s.id); $('sc-name')?.select(); };
for (const btn of document.querySelectorAll('[data-add]')) btn.onclick = () => { const s = ensureScreen(spec, current, screenMeta(current)); const a = addElement(s, btn.dataset.add); selected = { kind: 'added', id: a.id }; autosave(); drawOverlay(); renderInspector(); };
$('viewport').innerHTML = Object.entries(VIEWPORTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
$('viewport').onchange = (e) => { preset = e.target.value; fit(); setTimeout(() => openScreen(current), 500); };
window.addEventListener('resize', () => { fit(); drawOverlay(); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mode === 'edit') { clearSelection(); drawOverlay(); renderInspector(); return; }
  if (!selected || mode !== 'edit' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName ?? '')) return;
  const { w: W, h: H } = vp(); const step = e.shiftKey ? 10 : 1; const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  const s = ensureScreen(spec, current, screenMeta(current));
  if (d) {
    e.preventDefault();
    for (const m of (multi.length ? multi : [selected])) moveBy(m, d[0], d[1]);
    autosave(); drawOverlay(); renderInspector();
  } else if (e.key === 'Delete') {
    for (const m of (multi.length ? multi : [selected])) {
      if (m.kind === 'added') s.added = s.added.filter((x) => x.id !== m.id);
      else { const c = changeOf(s, m.target); if (c) { c.move = { dx: 0, dy: 0 }; c.size = null; c.hidden = false; applyChange(c); } }
    }
    clearSelection(); pruneScreen(s); autosave(); drawOverlay(); renderInspector();
  }
});

// ── boot ──
(async () => {
  spec = await load(); preset = spec.viewport?.preset in VIEWPORTS ? spec.viewport.preset : 'desktop'; $('viewport').value = preset;
  fit(); renderScreenList(); renderInspector();
  try { localStorage.setItem('grimge-selected-companion', localStorage.getItem('grimge-selected-companion') ?? 'none'); } catch { /* optional */ }
  frame.src = 'index.html?editor=1';
  await new Promise((r) => frame.addEventListener('load', r, { once: true }));
  for (let i = 0; i < 80 && !win()?.gameWorld?.canvas; i++) await new Promise((r) => setTimeout(r, 150));
  status('Spiel geladen'); await openScreen('hub_character');
})();
// For headless checks.
window.__uiEditor = { get spec() { return spec; }, get scanned() { return scanned; }, get registry() { return registry; }, openScreen, scan: () => (scanned = scan()), select: (s) => { selected = s; multi = s ? [s] : []; renderInspector(); drawOverlay(); }, selectMany: (list) => { multi = [...list]; selected = list[list.length - 1] ?? null; renderInspector(); drawOverlay(); }, get multi() { return multi; }, align: (k) => { alignSelection(k); drawOverlay(); }, nudge: (dx, dy) => { for (const m of multi) moveBy(m, dx, dy); drawOverlay(); }, rectOf, get current() { return current; } };
