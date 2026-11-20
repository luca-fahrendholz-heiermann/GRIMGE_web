// GRIMGE Prototype — Kronenkrieg world map (user, 20 Nov 2026: "eine aufrufbare Weltkarte mit eigenem Kartenbutton: die ganze
// Welt maßstabsgetreu, die Spielerposition, eigene und bekannte feindliche Burgen, erkundete Gebiete hervorgehoben, unerkundete
// verdeckt, bekannte Ressourcen und Orte, der Bereich der Todeszone; Zoomen und Verschieben; Desktop und Mobile").
//   • a 🗺 button next to the clock (or key M) opens a full-screen map of a level; drag to move, wheel / pinch / + − to zoom;
//   • explored cells show their biome, unexplored ones stay dark (the fog of kk_world.js — kept for the whole round);
//   • lasting knowledge (places, castles, ore / obsidian once seen) is drawn solid; rivals only as fading "last seen" marks;
//   • the Grimmflut: the board outside the safe square.
import { kkState, kkOn, isRevealed, REVEAL_ZCELL, SEAT_COLORS, elementColor } from './kk_world.js';
import { BIOME_OF, biomeAt, KK, LEVEL_NAMES, roadZi, roadXi, ROADS_H, ROADS_V } from './kk_map.js';
import { renderMinimapFlood } from './kk_war.js';

const CELL = 240; const SEEN_FADE = 90;
const ICON = Object.freeze({ castle: '♜', lair: '☠', camp: '⚑', building: '⌂', goldvein: '◆', prison: '⛓', source: '◉', stable: '♞', shrine: '✧', trial: '✪', event: '✹', shaft: '⇩', lift: '⇧' });
// What the map knows (pure: also used by the tests): lasting places, resources once seen, rivals last seen, the player.
export function worldMapModel(game, row = kkState(game)?.row) {
  const kk = kkState(game); if (!kk) return null; const map = kk.map; const D = map.depth ?? KK.depth;
  const known = (s) => isRevealed(kk, s.row, s.x, s.z);
  const places = map.sites.filter((s) => s.row === row && known(s)).map((s) => ({ kind: s.kind, x: s.x, z: s.z, owner: s.owner, element: s.element, label: s.label }));
  const castles = map.hqs.filter((h) => h.row === row && (kk.allies.includes(h.seat) || known(h))).map((h) => ({ seat: h.seat, x: h.x, z: h.z, fallen: !!h.fallen, own: h.seat === 0 }));
  const resources = (kk.decor ?? []).filter((d) => d.row === row && (d.kind === 'ore' || d.kind === 'obsidian') && !d.gone && isRevealed(kk, d.row, d.x, d.z)).map((d) => ({ kind: d.kind, x: d.x, z: d.z }));
  const rivals = Object.values(kk.seenRivals ?? {}).filter((r) => r.row === row && kk.time - r.t < SEEN_FADE).map((r) => ({ ...r, age: kk.time - r.t }));
  return { row, width: map.width, depth: D, places, castles, resources, rivals, player: { x: game.player.x, z: game.player.z, here: kk.row === row } };
}
// Rivals seen near the player are remembered with the time (dynamic knowledge, it fades on the map).
export function noteRivals(game) {
  const kk = kkState(game); if (!kk?.bots) return; const P = game.player; kk.seenRivals ??= {};
  for (const b of kk.bots) { if (!b.alive || b.ally) continue; if (b.row === kk.row && Math.hypot(b.x - P.x, ((b.z ?? 0) - P.z) * KK.zPx) < 1400) kk.seenRivals[b.seat] = { seat: b.seat, row: b.row, x: b.x, z: b.z ?? P.z, t: kk.time }; }
}

// ── the overlay (DOM) ───────────────────────────────────────────────────────────────────────────────────────────────
let ui = null;
export function closeWorldMap() { if (ui) { ui.open = false; ui.el.style.display = 'none'; ui.btn.style.display = 'none'; } }
function ensure() {
  const doc = globalThis.document; if (typeof doc?.createElement !== 'function' || typeof doc.body?.appendChild !== 'function') return null;
  if (ui) return ui;
  const btn = doc.createElement('button'); btn.type = 'button'; btn.id = 'kk-map-btn'; btn.textContent = '🗺'; btn.title = 'Weltkarte (M)';
  btn.style.cssText = 'position:fixed;left:calc(50% + 124px);top:14px;z-index:61;width:40px;height:40px;font-size:20px;line-height:1;color:#fff3c8;background:#2a2234cc;border:2px solid #c9a95a;border-radius:8px;padding:0;display:none';
  const el = doc.createElement('div'); el.id = 'kk-worldmap';
  el.style.cssText = 'position:fixed;inset:0;z-index:70;background:rgba(6,5,10,.92);display:none;touch-action:none;font-family:monospace;color:#f1e9d2';
  el.innerHTML = '<canvas id="kk-wm-canvas" style="position:absolute;inset:0;width:100%;height:100%"></canvas>'
    + '<div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px" id="kk-wm-tabs"></div>'
    + '<div style="position:absolute;right:12px;top:10px;display:flex;gap:6px"><button data-wm="in" style="width:44px;height:44px;font-size:22px">＋</button><button data-wm="out" style="width:44px;height:44px;font-size:22px">－</button><button data-wm="me" style="height:44px;padding:0 10px">ICH</button><button data-wm="close" style="width:44px;height:44px;font-size:20px">✕</button></div>'
    + '<div style="position:absolute;left:12px;bottom:10px;font-size:11px;line-height:1.5;background:rgba(0,0,0,.55);padding:6px 8px;border:1px solid #4a3e5e">♜ Burg (Farbe = Besitzer) · ■ Hauptburg · ◆ Erz / Obsidian · ○ Rivale zuletzt gesehen (verblasst) · lila: Grimmflut · dunkel: unerkundet</div>';
  for (const b of el.querySelectorAll?.('button') ?? []) b.style.cssText += ';color:#fff3c8;background:#2a2234;border:2px solid #c9a95a;border-radius:6px;font-family:monospace';
  doc.body.appendChild(btn); doc.body.appendChild(el);
  ui = { btn, el, canvas: el.querySelector?.('#kk-wm-canvas'), tabs: el.querySelector?.('#kk-wm-tabs'), open: false, zoom: 1, cx: null, cz: null, row: null, pointers: new Map(), pinch: null };
  const game = () => globalThis.window?.gameWorld;
  const toggle = (e) => { e?.preventDefault?.(); e?.stopPropagation?.(); ui.open ? hide() : show(game()); };
  btn.addEventListener('pointerdown', toggle);
  doc.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && kkOn(game()) && !e.target?.closest?.('input')) toggle(e); else if (e.code === 'Escape' && ui.open) hide(); });
  el.addEventListener('pointerdown', (e) => {
    const b = e.target?.closest?.('[data-wm]'); const t = e.target?.closest?.('[data-row]');
    if (b) { e.preventDefault(); e.stopPropagation(); const a = b.getAttribute('data-wm'); if (a === 'close') hide(); else if (a === 'in') zoomBy(1.4); else if (a === 'out') zoomBy(1 / 1.4); else if (a === 'me') center(game()); return; }
    if (t) { e.preventDefault(); ui.row = Number(t.getAttribute('data-row')); return; }
    e.preventDefault(); ui.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    const prev = ui.pointers.get(e.pointerId); if (!prev) return; e.preventDefault(); const s = scaleNow();
    if (ui.pointers.size >= 2) { /* pinch */ const pts = [...ui.pointers.values()]; const d0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); ui.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); const q = [...ui.pointers.values()]; const d1 = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y); if (d0 > 0) zoomBy(d1 / d0); return; }
    ui.cx -= (e.clientX - prev.x) / s; ui.cz -= (e.clientY - prev.y) / s / KK.zPx; ui.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  const up = (e) => { ui.pointers.delete(e.pointerId); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  return ui;
}
const fitScale = () => { const c = ui.canvas; const g = globalThis.window?.gameWorld; const kk = kkState(g); const W = kk?.map.width ?? KK.width; const D = (kk?.map.depth ?? KK.depth) * KK.zPx; return Math.min((c?.clientWidth || 800) / W, (c?.clientHeight || 600) / D) * .92; };
const scaleNow = () => fitScale() * ui.zoom;
function zoomBy(k) { ui.zoom = Math.max(.6, Math.min(12, ui.zoom * k)); }
function center(game) { if (!game) return; ui.cx = game.player.x; ui.cz = game.player.z; ui.row = kkState(game).row; }
function show(game) { if (!kkOn(game)) return; ui.open = true; ui.el.style.display = 'block'; if (ui.cx == null || ui.row !== kkState(game).row) { ui.zoom = 1; const kk = kkState(game); ui.cx = kk.map.width / 2; ui.cz = (kk.map.depth ?? KK.depth) / 2; } ui.row = kkState(game).row; loop(); }
function hide() { ui.open = false; ui.el.style.display = 'none'; }
function loop() { if (!ui?.open) return; draw(globalThis.window?.gameWorld); globalThis.requestAnimationFrame?.(loop); }

// The map each frame while open.
function draw(game) {
  const kk = kkState(game); const c = ui.canvas; if (!kk || !c?.getContext) return; const ctx = c.getContext('2d'); if (!ctx) return;
  const dpr = globalThis.window?.devicePixelRatio || 1; const w = c.clientWidth || 800; const h = c.clientHeight || 600; if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const row = ui.row ?? kk.row; const m = worldMapModel(game, row); const s = scaleNow(); const ox = w / 2 - ui.cx * s; const oy = h / 2 - ui.cz * KK.zPx * s;
  const X = (x) => ox + x * s; const Y = (z) => oy + z * KK.zPx * s; const D = m.depth;
  // the level: rock where it does not exist, explored cells in their biome, unexplored dark
  ctx.fillStyle = '#17120f'; ctx.fillRect(X(0), Y(0), m.width * s, D * KK.zPx * s);
  const cw = CELL * s; const ch = REVEAL_ZCELL * KK.zPx * s;
  for (const [s0, s1] of kk.map.spans?.[row] ?? [[0, m.width]]) for (let x = Math.floor(s0 / CELL) * CELL; x < s1; x += CELL) {
    const px = X(x); if (px > w || px + cw < 0) continue;
    for (let z = 0; z < D; z += REVEAL_ZCELL) { const py = Y(z); if (py > h || py + ch < 0) continue; ctx.fillStyle = isRevealed(kk, row, x, z) ? BIOME_OF[biomeAt(kk.map, row, x + CELL / 2, z + REVEAL_ZCELL / 2).element].ground : '#0b0b12'; ctx.fillRect(px, py, cw + .7, ch + .7); }
  }
  // roads where explored
  ctx.fillStyle = 'rgba(200,175,130,.55)';
  for (let i = 0; i < ROADS_H.length; i++) for (let x = 0; x < m.width; x += 60) { const z = roadZi(i, x, row); if (isRevealed(kk, row, x, z)) ctx.fillRect(X(x), Y(z) - 1, 60 * s + 1, Math.max(2, 18 * s)); }
  for (let i = 0; i < ROADS_V.length; i++) for (let z = 0; z < D; z += .2) { const x = roadXi(i, z, row); if (isRevealed(kk, row, x, z)) ctx.fillRect(X(x) - 1, Y(z), Math.max(2, 40 * s), .2 * KK.zPx * s + 1); }
  renderMinimapFlood(ctx, game, X(0), Y(0), s, KK.zPx * s);
  ctx.strokeStyle = '#c9a95a'; ctx.lineWidth = 2; ctx.strokeRect(X(0), Y(0), m.width * s, D * KK.zPx * s); /* the edge of the board */
  // lasting knowledge
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const fs = Math.max(10, Math.min(22, 120 * s));
  for (const r of m.resources) { ctx.fillStyle = r.kind === 'ore' ? '#c8dae6' : '#9b6bff'; ctx.fillRect(X(r.x) - 2, Y(r.z) - 2, 4, 4); }
  ctx.font = `bold ${fs}px monospace`;
  for (const p of m.places) { ctx.fillStyle = p.kind === 'castle' ? (p.owner != null ? SEAT_COLORS[p.owner] : '#c8bca8') : p.kind === 'source' ? elementColor(p.element) : '#e8e2d0'; ctx.fillText(ICON[p.kind] ?? '·', X(p.x), Y(p.z)); }
  for (const c2 of m.castles) { const sz = Math.max(10, 260 * s); ctx.fillStyle = c2.fallen ? '#555' : SEAT_COLORS[c2.seat]; ctx.fillRect(X(c2.x) - sz / 2, Y(c2.z) - sz / 2, sz, sz); ctx.strokeStyle = c2.own ? '#ffe9a8' : '#000'; ctx.lineWidth = c2.own ? 3 : 1.5; ctx.strokeRect(X(c2.x) - sz / 2, Y(c2.z) - sz / 2, sz, sz); }
  // rivals: last seen (hollow, fading) — not lasting knowledge
  for (const r of m.rivals) { ctx.globalAlpha = Math.max(.15, 1 - r.age / SEEN_FADE); ctx.strokeStyle = SEAT_COLORS[r.seat]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(r.x), Y(r.z), 9, 0, Math.PI * 2); ctx.stroke(); ctx.font = '10px monospace'; ctx.fillStyle = '#fff'; ctx.fillText(`${Math.round(r.age)} s`, X(r.x), Y(r.z) + 18); ctx.globalAlpha = 1; }
  // the player: a pulsing ring
  if (m.player.here) { const t = kk.time; const R = 10 + 4 * Math.sin(t * 6); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(m.player.x), Y(m.player.z), R, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = SEAT_COLORS[0]; ctx.beginPath(); ctx.arc(X(m.player.x), Y(m.player.z), 5, 0, Math.PI * 2); ctx.fill(); }
  // level tabs
  const tabs = LEVEL_NAMES.map((n, i) => `<button data-row="${i}" style="height:36px;padding:0 10px;font-family:monospace;color:#fff3c8;background:${i === row ? '#5a4a70' : '#2a2234'};border:2px solid #c9a95a;border-radius:6px">${n}</button>`).join('');
  if (ui.tabs && ui.tabsHtml !== tabs) { ui.tabs.innerHTML = tabs; ui.tabsHtml = tabs; }
}

// Each frame (kk update): the button is shown, rivals in sight are noted.
export function updateWorldMap(game) {
  if (!kkOn(game)) return; noteRivals(game); const u = ensure(); if (u) u.btn.style.display = 'block';
}
export const worldMapOpen = () => !!ui?.open;
