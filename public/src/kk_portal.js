// GRIMGE Prototype — Kronenkrieg portals (user, 20 Nov 2026: "Portale setzen, damit ich nicht immer den ganzen Weg laufen muss,
// um meine Burg verteidigen zu gehen").
//   • every own castle (the main castle and every taken mid castle) has a portal stone beside its stair;
//   • one field portal of one's own can be set anywhere (button 🌀 / key P, a short cooldown; a new one replaces the old);
//   • standing on a portal a small window on the left lists the other portals — a tap travels there, the squad near the player
//     comes along. Foes never use them.
import { groundYForDepth } from './world.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { kkState, kkOn, applyBounds, switchLevel, revealAround, SEAT_COLORS } from './kk_world.js';
import { dimsOf } from './kk_castle.js';

export const PORTAL = Object.freeze({ radius: 44, fieldCd: 45, squadRange: 420 });
// Every portal the player may use right now.
export function portalsOf(kk) {
  const out = [];
  for (const h of kk.map.hqs) if (h.seat === 0 && !h.fallen) out.push({ id: 'p_' + h.id, row: h.row, x: h.x - dimsOf(h).half - 90, z: h.z + .35, label: 'HAUPTBURG', site: h });
  for (const s of kk.map.sites) if (s.kind === 'castle' && s.owner === 0 && !s.drowned) out.push({ id: 'p_' + s.id, row: s.row, x: s.x - dimsOf(s).half - 90, z: s.z + .35, label: `${s.label}BURG`, site: s });
  if (kk.fieldPortal) out.push({ id: 'field', ...kk.fieldPortal, label: 'FELDPORTAL' });
  return out;
}
export function placeFieldPortal(game) {
  const kk = kkState(game); const P = game.player; if (!kk || !P.isAlive || kk.inside) return false;
  if ((kk.portalCd ?? 0) > 0) { game.showAnnouncement?.(`PORTAL IN ${Math.ceil(kk.portalCd)} S`, 1); return false; }
  kk.fieldPortal = { row: kk.row, x: P.x, z: P.z }; kk.portalCd = PORTAL.fieldCd; audio.playRuneChime?.(980);
  combat.spawnShockwave?.(P.x, groundYForDepth(P.z) - 20, 60, '#9be6ff'); game.showAnnouncement?.('FELDPORTAL GESETZT', 1); return true;
}
// Travels to a portal; the own squad near the player comes along.
export function travelTo(game, portal) {
  const kk = kkState(game); const P = game.player; if (!kk || !portal || !P.isAlive) return false;
  const near = game.minions.filter((m) => m.isKKUnit && !m.isDead && m.team === P.team && m.rec?.role === 'squad' && Math.hypot(m.x - P.x, (m.z - P.z) * 150) < PORTAL.squadRange);
  combat.spawnShockwave?.(P.x, groundYForDepth(P.z) - 30, 70, '#9be6ff');
  if (portal.row !== kk.row) switchLevel(game, portal.row, portal.x + 50, portal.z); else { P.x = portal.x + 50; P.z = portal.z; applyBounds(game, kk); }
  P.vx = 0; P.vz = 0; P.surfaceHeight = 0; P.elevation = 0; game.battlefield.placeOnSurface?.(P);
  for (const [i, m] of near.entries()) { m.x = P.x - 40 - (i % 4) * 26; m.z = P.z + (Math.floor(i / 4) - .5) * .12; if (m.rec) { m.rec.row = kk.row; m.rec.x = m.x; m.rec.z = m.z; } m.surfaceHeight = 0; m.elevation = 0; }
  kk.portalLock = 1.2; kk.onPortal = null; revealAround(kk, P);
  game.modeState.dungeonCameraX = game.dungeonCameraTarget?.() ?? game.modeState.dungeonCameraX;
  combat.spawnShockwave?.(P.x, groundYForDepth(P.z) - 30, 70, '#9be6ff'); audio.playRuneChime?.(1180); return true;
}

// ── each frame: the portal one stands on, the window, the button ────────────────────────────────────────────────────
let ui = null;
export function closePortalUi() { if (ui) { ui.panel.style.display = 'none'; ui.btn.style.display = 'none'; } }
function ensureUi() {
  const doc = globalThis.document; if (typeof doc?.createElement !== 'function' || typeof doc.body?.appendChild !== 'function') return null;
  if (ui) return ui;
  const btn = doc.createElement('button'); btn.type = 'button'; btn.id = 'kk-portal-btn'; btn.textContent = '🌀'; btn.title = 'Feldportal setzen (P)';
  btn.style.cssText = 'position:fixed;left:calc(50% + 170px);top:14px;z-index:61;width:40px;height:40px;font-size:20px;line-height:1;color:#fff3c8;background:#2a2234cc;border:2px solid #c9a95a;border-radius:8px;padding:0;display:none';
  const panel = doc.createElement('div'); panel.id = 'kk-portal';
  panel.style.cssText = 'position:fixed;left:max(1vw,env(safe-area-inset-left));top:27vh;z-index:64;width:min(240px,36vw);font-family:monospace;font-size:11px;color:#f1e9d2;background:#14202ae8;border:2px solid #9be6ff;padding:5px;display:none';
  const game = () => globalThis.window?.gameWorld;
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); placeFieldPortal(game()); });
  doc.addEventListener('keydown', (e) => { if (e.code === 'KeyP' && kkOn(game()) && !e.target?.closest?.('input')) placeFieldPortal(game()); });
  panel.addEventListener('pointerdown', (e) => { const b = e.target?.closest?.('[data-portal]'); if (!b) return; e.preventDefault(); e.stopPropagation(); const g = game(); const kk = kkState(g); const dest = portalsOf(kk).find((p) => p.id === b.getAttribute('data-portal')); if (dest) travelTo(g, dest); });
  doc.body.appendChild(btn); doc.body.appendChild(panel); ui = { btn, panel, html: '' }; return ui;
}
export function updatePortals(game, dt) {
  if (!kkOn(game)) return; const kk = kkState(game); const P = game.player;
  kk.portalCd = Math.max(0, (kk.portalCd ?? 0) - dt); kk.portalLock = Math.max(0, (kk.portalLock ?? 0) - dt);
  const list = portalsOf(kk);
  kk.onPortal = !kk.inside && P.isAlive && kk.portalLock <= 0 ? list.find((p) => p.row === kk.row && Math.abs(p.x - P.x) < PORTAL.radius && Math.abs(p.z - P.z) * 150 < 30) ?? null : null;
  const u = ensureUi(); if (!u) return; u.btn.style.display = 'block'; u.btn.style.opacity = kk.portalCd > 0 ? '.45' : '1';
  if (!kk.onPortal) { u.panel.style.display = 'none'; return; }
  let h = `<b style="color:#9be6ff">PORTAL · ${kk.onPortal.label}</b>`;
  for (const p of list) if (p.id !== kk.onPortal.id) h += `<div style="display:flex;align-items:center;margin-top:3px"><span style="flex:1">${p.label}${p.row !== kk.row ? ' (andere Ebene)' : ''}</span><button data-portal="${p.id}" style="min-height:28px;font:inherit;color:#fff3c8;background:#23384a;border:1px solid #9be6ff">REISEN</button></div>`;
  if (list.length < 2) h += '<div style="color:#9a8fb0;margin-top:3px">kein anderes Portal — erobere Burgen oder setze ein Feldportal (🌀)</div>';
  if (h !== u.html) { u.panel.innerHTML = h; u.html = h; } u.panel.style.display = 'block';
}
// The portals of the current level: a ring of blue light (the field portal a little smaller).
export function portalActors(game) {
  const kk = kkState(game); if (!kk) return []; const P = game.player; const t = kk.time;
  return portalsOf(kk).filter((p) => p.row === kk.row && Math.abs(p.x - P.x) < 1800 && Math.abs(p.z - P.z) < 7).map((p) => ({ y: groundYForDepth(p.z), render: (ctx) => {
    const y = groundYForDepth(p.z); const r = p.id === 'field' ? 26 : 34; ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.x, y, r + 6, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (p.id !== 'field') { ctx.fillStyle = '#5f5c56'; ctx.fillRect(Math.round(p.x - r - 6), Math.round(y - 70), 8, 70); ctx.fillRect(Math.round(p.x + r - 2), Math.round(y - 70), 8, 70); ctx.fillRect(Math.round(p.x - r - 6), Math.round(y - 76), r * 2 + 16, 8); ctx.fillStyle = SEAT_COLORS[0]; ctx.fillRect(Math.round(p.x - 6), Math.round(y - 76), 12, 8); }
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) { ctx.globalAlpha = .25 + .15 * Math.sin(t * 4 + k * 2); ctx.strokeStyle = k === 1 ? '#e4f6ff' : '#5fd0e6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, y - 34, r * (1 - k * .22), 34 * (1 - k * .22), 0, t * (1 + k) % (Math.PI * 2), t * (1 + k) % (Math.PI * 2) + Math.PI * 1.6); ctx.stroke(); }
    ctx.restore();
  } }));
}
