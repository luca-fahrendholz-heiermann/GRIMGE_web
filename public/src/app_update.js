// GRIMGE Prototype — automatic updates (user, 11 Nov 2026: no manual reload on the phone). The deployment writes the
// commit into version.json; the running game compares it when it starts, when the app comes back to the front and
// every few minutes. A new version reloads the page by itself — only in the hub with no screen open, never during a
// match. The service worker (sw.js) makes sure the reload really fetches the new files.
const CHECK_EVERY = 5 * 60 * 1000; const RETRY_EVERY = 3000; const KEY = 'grimge-update-reloaded-for';
let loaded = null; let pending = null; let timer = 0;

// Pure rule (tested): a reload is due when the server's version differs from the loaded one and was not already
// reloaded for (no reload loop when a file stays stale).
export function updateDue(loadedVersion, serverVersion, reloadedFor = null) {
  return !!loadedVersion && !!serverVersion && serverVersion !== loadedVersion && serverVersion !== reloadedFor;
}
// Safe moment: the hub, with no character, vault or campaign screen open.
export function canReloadNow(game, doc = globalThis.document) {
  return game?.matchState === 'Menu' && !doc?.querySelector?.('#cc-overlay, #rv-overlay, #cp-overlay');
}

async function serverVersion() {
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const v = (await res.json())?.v;
    return typeof v === 'string' && v && v !== 'dev' ? v : null;
  } catch { return null; }
}
function tryReload() {
  if (!pending) return;
  if (!canReloadNow(globalThis.window?.gameWorld)) { clearTimeout(timer); timer = setTimeout(tryReload, RETRY_EVERY); return; }
  try { globalThis.sessionStorage?.setItem(KEY, pending); } catch { /* private mode */ }
  globalThis.window?.gameWorld?.showAnnouncement?.('NEUE VERSION – WIRD GELADEN', 1.2);
  setTimeout(() => globalThis.location?.reload(), 700);
}
async function check() {
  const v = await serverVersion();
  if (!v) return;
  if (!loaded) { loaded = v; return; }
  let reloadedFor = null; try { reloadedFor = globalThis.sessionStorage?.getItem(KEY); } catch { /* private mode */ }
  if (updateDue(loaded, v, reloadedFor)) { pending = v; tryReload(); }
}

export function startAppUpdates() {
  const doc = globalThis.document; const nav = globalThis.navigator;
  if (typeof doc?.addEventListener !== 'function' || typeof fetch !== 'function' || !globalThis.location?.protocol?.startsWith('http')) return false;
  nav?.serviceWorker?.register?.('./sw.js').catch(() => {});
  check();
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') check(); });
  setInterval(check, CHECK_EVERY);
  return true;
}
