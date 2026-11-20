// GRIMGE Prototype — Kronenkrieg items (user feedback, 19 Nov 2026: "Itemsystem fehlt", "man sieht den Inhalt des Beutels
// nicht", "pro Item ein eigenes Icon, als Loot zu sehen, aktiv einsammeln", "wenn der Beutel voll ist, selektiv
// austauschen", "komplette UI fehlt für die Slotmachine").
//   • loot falls as single items on the ground, each with its own pixel icon (coins, log, stone, steel bar, obsidian,
//     element gem, weapon, red / blue potion, rune scroll); walking over one picks it up while the bag has room;
//   • a full bag leaves the item lying (with a hint); the bag menu (button / key I) shows the contents with icons and
//     drops single pieces or a whole stack to make room;
//   • the reel spin of the castle training is shown as a 3 × 3 reel window that spins, stops and lights the winning lines.
import { groundYForDepth, clampZ } from './world.js';
import { audio } from './audio.js';
import { kkState, kkOn, elementColor, roomClip } from './kk_world.js';
import { BACKPACK, invUnits, giveRune } from './kk_loot.js';
import { MATERIALS } from './kk_progress.js';

const ICON_S = 2;
const MAT_DE = Object.freeze({ wood: 'HOLZ', stone: 'STEIN', steel: 'STAHL', obsidian: 'OBSIDIAN' });
const icons = new Map();
function icon(key, paint) {
  if (icons.has(key)) return icons.get(key);
  const doc = globalThis.document; const c = typeof doc?.createElement === 'function' ? doc.createElement('canvas') : null;
  if (!c || typeof c.getContext !== 'function') { icons.set(key, null); return null; }
  c.width = 16; c.height = 16; const g = c.getContext('2d'); if (!g) { icons.set(key, null); return null; }
  const p = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }; paint(p); icons.set(key, c); return c;
}
// The pixel icon of an item (16 × 16, drawn once).
export function itemIcon(it) {
  const t = it.type;
  if (t === 'gold') return icon('gold', (p) => { for (const [x, y] of [[3, 9], [8, 10], [5, 5], [10, 6]]) { p(x, y, 5, 4, '#7a5a10'); p(x, y, 5, 3, '#ffcf3a'); p(x + 1, y, 2, 1, '#fff6c2'); } });
  if (t === 'wood') return icon('wood', (p) => { p(1, 6, 14, 6, '#4a2e1a'); p(1, 6, 14, 2, '#8a5a34'); p(2, 8, 12, 3, '#6b4428'); p(12, 6, 3, 6, '#c9a064'); p(13, 7, 1, 4, '#8a6a3a'); });
  if (t === 'stone') return icon('stone', (p) => { p(2, 5, 12, 9, '#4e4842'); p(3, 4, 10, 8, '#8a8378'); p(3, 4, 5, 2, '#b0a89c'); p(9, 9, 4, 2, '#5e574f'); });
  if (t === 'steel') return icon('steel', (p) => { p(2, 7, 12, 6, '#3c4a56'); p(3, 6, 10, 5, '#a9c4d6'); p(3, 6, 10, 1, '#e4f2fb'); p(4, 9, 8, 1, '#7d95a6'); });
  if (t === 'obsidian') return icon('obsidian', (p) => { p(6, 2, 4, 12, '#1a1024'); p(4, 5, 8, 7, '#2b1d3a'); p(6, 3, 2, 8, '#7a4fb0'); p(9, 6, 1, 4, '#b48cff'); });
  if (t === 'gem') return icon('gem' + it.el, (p) => { const c = elementColor(it.el); p(5, 3, 6, 2, '#1d1a22'); p(3, 5, 10, 4, '#1d1a22'); p(5, 9, 6, 3, '#1d1a22'); p(7, 12, 2, 2, '#1d1a22'); p(6, 4, 4, 1, c); p(4, 6, 8, 2, c); p(6, 9, 4, 2, c); p(5, 5, 2, 1, '#ffffff'); });
  if (t === 'weapon') return icon('weapon', (p) => { for (let i = 0; i < 9; i++) p(3 + i, 11 - i, 2, 2, i < 7 ? '#d8e2ea' : '#ffffff'); p(2, 12, 3, 2, '#8a5a34'); p(3, 10, 4, 1, '#c9a64a'); });
  if (t === 'potion') return icon('potion' + it.kind, (p) => { const c = it.kind === 'hp' ? '#e5395a' : '#3d7ae5'; p(6, 2, 4, 3, '#c9b38a'); p(4, 5, 8, 9, '#2a2230'); p(5, 6, 6, 7, c); p(5, 6, 2, 3, '#ffffff'); });
  if (t === 'rune') return icon('rune', (p) => { p(2, 3, 12, 10, '#6b4a2e'); p(3, 4, 10, 8, '#efe3c4'); p(5, 6, 6, 1, '#7a4fb0'); p(7, 5, 2, 6, '#7a4fb0'); p(5, 9, 6, 1, '#7a4fb0'); });
  return null;
}
export const itemLabel = (it) => it.type === 'gold' ? `${it.n} GOLD` : it.type === 'gem' ? `${it.n} ${it.el.toUpperCase()}-STEIN` : it.type === 'weapon' ? 'WAFFE' : it.type === 'potion' ? (it.kind === 'hp' ? 'HEILTRANK' : 'MANATRANK') : it.type === 'rune' ? `RUNE: ${it.rune?.name ?? ''}` : `${it.n} ${MAT_DE[it.type] ?? it.type}`;
const unitsOf = (it) => (it.type === 'gold' || it.type === 'potion' || it.type === 'rune' ? 0 : it.type === 'weapon' ? 1 : it.n);

// A bundle of loot falls as single items around x / z (they hop out and can be collected after a moment).
export function spawnItems(game, x, z, b, { row = null, spread = 70 } = {}) {
  const kk = kkState(game); if (!kk) return [];
  const list = [];
  if (b.gold) list.push({ type: 'gold', n: b.gold });
  for (const m of MATERIALS) if (b.materials?.[m]) list.push({ type: m, n: b.materials[m] });
  for (const [el, n] of Object.entries(b.stones ?? {})) if (n) list.push({ type: 'gem', el, n });
  for (const w of b.weapons ?? []) list.push({ type: 'weapon', weapon: w, n: 1 });
  for (const [k, n] of Object.entries(b.potions ?? {})) for (let i = 0; i < n; i++) list.push({ type: 'potion', kind: k, n: 1 });
  for (const r of b.runes ?? []) list.push({ type: 'rune', rune: r, n: 1 });
  const out = list.map((it, i) => { const a = (i / Math.max(1, list.length)) * Math.PI * 2 + kk.time; const item = { id: kk.nextItem++, kind: 'item', row: row ?? kk.row, x: x + Math.cos(a) * spread * (.4 + .6 * ((i % 3) / 2)), z: clampZ(z + Math.sin(a) * .08, .05, .95), lock: .5, hop: .5, born: kk.time, ...it }; kk.items.push(item); return item; });
  return out;
}
// Walking over an item: gold, potions and runes always fit; goods take bag room (what does not fit stays).
export function pickupItem(game, it) {
  const kk = kkState(game); const inv = kk.inv;
  if (it.type === 'gold') { kk.gold += it.n; audio.playRuneChime?.(880); return true; }
  if (it.type === 'potion') { inv.potions[it.kind] = (inv.potions[it.kind] ?? 0) + 1; audio.playRuneChime?.(700); return true; }
  if (it.type === 'rune') { const got = giveRune(game, it.rune); if (got === 'double') { kk.gold += 15; return true; } return got !== 'full'; }
  const room = BACKPACK - invUnits(inv); if (room <= 0) { bagFullHint(game); return false; }
  if (it.type === 'weapon') { inv.weapons[it.weapon] = (inv.weapons[it.weapon] ?? 0) + 1; audio.playRuneChime?.(640); return true; }
  const take = Math.min(room, it.n);
  if (it.type === 'gem') inv.stones[it.el] = (inv.stones[it.el] ?? 0) + take; else inv[it.type] += take;
  it.n -= take; audio.playRuneChime?.(620);
  if (it.n > 0) { bagFullHint(game); return false; }
  return true;
}
function bagFullHint(game) { const kk = kkState(game); if ((kk.time - (kk.bagHintAt ?? -9)) < 3) return; kk.bagHintAt = kk.time; game.showAnnouncement?.('BEUTEL VOLL — IM BEUTEL (I) ETWAS ABLEGEN', 1.6); }

export function itemActors(game) {
  const kk = kkState(game); if (!kk) return []; const t = kk.time; const out = [];
  for (const it of kk.items) {
    if (it.kind !== 'item' || it.row !== kk.row) continue; const y = groundYForDepth(it.z); if (kk.inside && roomClip(kk, it.x, it.z, 10) === 'hide' && it.z < kk.inside.z - (kk.inside.kind === 'building' ? .3 : .15) - .01) continue; /* items outside behind the room */
    out.push({ y, render: (ctx) => {
      const hop = it.hop > 0 ? Math.sin(Math.PI * (1 - it.hop / .5)) * 22 : Math.sin(t * 3 + it.x) * 1.5; const im = itemIcon(it);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(it.x, y, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      if (im) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(im, Math.round(it.x - 8 * ICON_S), Math.round(y - 16 * ICON_S - hop), 16 * ICON_S, 16 * ICON_S); ctx.restore(); }
      else { ctx.fillStyle = '#ffcf3a'; ctx.fillRect(Math.round(it.x - 6), Math.round(y - 14 - hop), 12, 10); }
      if (it.n > 1) { ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(String(it.n), it.x + 12, y - 4 - hop); }
    } });
  }
  return out;
}
export function updateItemHops(kk, dt) {
  for (const it of kk.items) if (it.kind === 'item' && it.hop > 0) it.hop = Math.max(0, it.hop - dt);
  if (kk.items.some((it) => it.type === 'gold' && kk.time - (it.born ?? kk.time) > 180)) kk.items = kk.items.filter((it) => !(it.type === 'gold' && kk.time - (it.born ?? kk.time) > 180)); /* coins of far fights do not pile up for ever */
}

// ── the bag menu (DOM) ─────────────────────────────────────────────────────────────────────────────────────────────
let bag = null;
export function closeBag() { if (bag?.el) bag.el.style.display = 'none'; if (bag) bag.open = false; if (bag?.btn) bag.btn.style.display = 'none'; }
const iconUrl = (it) => { const c = itemIcon(it); try { return c?.toDataURL?.() ?? ''; } catch { return ''; } };
function dropFromBag(game, type, key, all) {
  const kk = kkState(game); const inv = kk.inv; const P = game.player; let n = 0; const b = { materials: {}, stones: {}, weapons: [] };
  if (MATERIALS.includes(type)) { n = all ? inv[type] : Math.min(inv[type], 1); inv[type] -= n; b.materials[type] = n; }
  else if (type === 'gem') { n = all ? inv.stones[key] : Math.min(inv.stones[key] ?? 0, 1); inv.stones[key] -= n; b.stones[key] = n; }
  else if (type === 'weapon') { n = all ? inv.weapons[key] : Math.min(inv.weapons[key] ?? 0, 1); inv.weapons[key] -= n; for (let i = 0; i < n; i++) b.weapons.push(key); }
  if (n > 0) for (const it of spawnItems(game, P.x + (P.facing || 1) * 34, P.z, b, { spread: 16 })) it.lock = 2.5; /* not picked straight back up */
  refreshBag(game);
}
function refreshBag(game) {
  const kk = kkState(game); if (!bag || !kk) return; const inv = kk.inv;
  const rows = [];
  for (const m of MATERIALS) if (inv[m] > 0) rows.push({ type: m, key: m, n: inv[m], label: MAT_DE[m] });
  for (const [el, n] of Object.entries(inv.stones)) if (n > 0) rows.push({ type: 'gem', key: el, el, n, label: `${el.toUpperCase()}-STEIN` });
  for (const [w, n] of Object.entries(inv.weapons)) if (n > 0) rows.push({ type: 'weapon', key: w, n, label: `WAFFE (${w.replace(/_/g, ' ').toUpperCase()})` });
  const btn = (act, row, label) => `<button data-bag="${act}" data-type="${row.type}" data-key="${row.key}" style="margin-left:4px;min-height:30px;font:inherit;color:#fff3c8;background:#3a2a4e;border:1px solid #c9a95a">${label}</button>`;
  let h = `<b style="color:#ffe9a8">BEUTEL ${invUnits(inv)}/${BACKPACK}</b> <span style="color:#cbb8ff">· Gold ${kk.gold} · Tränke ♥${inv.potions.hp} ✦${inv.potions.mp}</span>`;
  if (!rows.length) h += '<div style="margin-top:6px;color:#9a8fb0">leer — Beute liegt am Boden und wird durch Darüberlaufen eingesammelt</div>';
  for (const r of rows) { const url = iconUrl({ type: r.type, el: r.el }); h += `<div style="display:flex;align-items:center;margin-top:4px">${url ? `<img src="${url}" width="24" height="24" style="image-rendering:pixelated;margin-right:6px">` : ''}<span style="flex:1">${r.n}× ${r.label}</span>${btn('one', r, 'ABLEGEN')}${r.n > 1 ? btn('all', r, 'ALLE') : ''}</div>`; }
  if (h !== bag.html) { bag.el.innerHTML = h; bag.html = h; }
}
export function updateBagUi(game) {
  const doc = globalThis.document; if (typeof doc?.createElement !== 'function' || typeof doc.body?.appendChild !== 'function') return;
  if (!bag) {
    const btnEl = doc.createElement('button'); btnEl.type = 'button'; btnEl.id = 'kk-bag-btn'; btnEl.textContent = '🎒 BEUTEL (I)';
    btnEl.style.cssText = 'position:fixed;right:max(1vw,env(safe-area-inset-right));top:36.5vh;z-index:61;min-height:40px;font-family:monospace;font-size:13px;color:#fff3c8;background:#2a2234ee;border:2px solid #c9a95a;padding:.2em .7em';
    const el = doc.createElement('div'); el.id = 'kk-bag';
    el.style.cssText = 'position:fixed;right:calc(max(1vw,env(safe-area-inset-right)) + 190px);top:30vh;z-index:62;width:min(340px,42vw);max-height:62vh;overflow:auto;font-family:monospace;font-size:12px;color:#f1e9d2;background:#1a1424f2;border:2px solid #c9a95a;padding:8px;display:none';
    const toggle = (e) => { e?.preventDefault?.(); e?.stopPropagation?.(); bag.open = !bag.open; bag.el.style.display = bag.open ? 'block' : 'none'; bag.html = ''; if (bag.open) refreshBag(globalThis.window?.gameWorld); };
    btnEl.addEventListener('pointerdown', toggle);
    doc.addEventListener('keydown', (e) => { if (e.code === 'KeyI' && kkOn(globalThis.window?.gameWorld) && !e.target?.closest?.('input')) toggle(e); });
    el.addEventListener('pointerdown', (e) => { const b = e.target?.closest?.('[data-bag]'); if (!b) return; e.preventDefault(); e.stopPropagation(); dropFromBag(globalThis.window?.gameWorld, b.getAttribute('data-type'), b.getAttribute('data-key'), b.getAttribute('data-bag') === 'all'); });
    doc.body.appendChild(btnEl); doc.body.appendChild(el); bag = { el, btn: btnEl, open: false, html: '' };
  }
  bag.btn.style.display = 'block'; if (bag.open) refreshBag(game);
}

// ── the reel window (screen space) ─────────────────────────────────────────────────────────────────────────────────
const SYM = Object.freeze({ weapon: ['⚔', '#d8e2ea'], element: ['◆', '#9be6ff'], rune: ['✦', '#d8b4ff'], blank: ['·', '#5a5468'] });
const LINES = Object.freeze([[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]);
export function showReels(game, reels, label = '') { const kk = kkState(game); if (kk && reels) kk.reelShow = { ...reels, t: 0, label }; }
export function renderReels(ctx, game, viewW, viewH) {
  const kk = kkState(game); const r = kk?.reelShow; if (!r) return; r.t += 1 / 60; if (r.t > 4) { kk.reelShow = null; return; }
  const W = 230; const H = 230; const x0 = Math.round(viewW / 2 - W / 2); const y0 = Math.round(viewH / 2 - H / 2 - 20); const cs = 64; const stopAt = [1.0, 1.35, 1.7];
  ctx.save(); ctx.fillStyle = 'rgba(8,6,14,.9)'; ctx.fillRect(x0 - 10, y0 - 34, W + 20, H + 70); ctx.strokeStyle = '#c9a95a'; ctx.lineWidth = 3; ctx.strokeRect(x0 - 10, y0 - 34, W + 20, H + 70);
  ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9a8'; ctx.fillText(`RUNEN-WALZEN${r.label ? ' · ' + r.label : ''}`, viewW / 2, y0 - 14);
  const keys = Object.keys(SYM);
  for (let c = 0; c < 3; c++) for (let row = 0; row < 3; row++) {
    const stopped = r.t >= stopAt[c]; const sym = stopped ? r.grid[row * 3 + c] : keys[Math.floor((r.t * 14 + row * 3 + c * 5)) % keys.length];
    const x = x0 + c * (cs + 19); const y = y0 + row * (cs + 19); ctx.fillStyle = stopped ? '#2a2234' : '#1d1828'; ctx.fillRect(x, y, cs, cs); ctx.strokeStyle = '#4a3e5e'; ctx.lineWidth = 2; ctx.strokeRect(x, y, cs, cs);
    ctx.font = 'bold 34px monospace'; ctx.fillStyle = SYM[sym][1]; ctx.fillText(SYM[sym][0], x + cs / 2, y + cs / 2 + 12 + (stopped ? 0 : Math.sin(r.t * 40 + c) * 6));
  }
  if (r.t >= stopAt[2]) {
    for (const line of LINES) { const v = line.map((i) => r.grid[i]); if (v[0] === 'blank' || !v.every((s) => s === v[0])) continue; const pts = line.map((i) => [x0 + (i % 3) * (cs + 19) + cs / 2, y0 + Math.floor(i / 3) * (cs + 19) + cs / 2]); ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 5; ctx.globalAlpha = .6 + .4 * Math.sin(r.t * 10); ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[2]); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.font = 'bold 13px monospace'; ctx.fillStyle = r.bonus?.length ? '#ffe066' : '#9a8fb0';
    ctx.fillText(r.bonus?.length ? `BONUS: ${r.bonus.map((b) => ({ veteran: 'VETERAN', double: 'DOPPELELEMENT', elite: 'ELITE' }[b])).join(' + ')}` : 'KEIN BONUS', viewW / 2, y0 + H + 22);
  }
  ctx.restore();
}
