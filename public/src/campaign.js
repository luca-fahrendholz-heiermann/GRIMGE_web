// GRIMGE Prototype — campaign logic and screens (Campaign Alpha 0.1; user directive, 11 Nov 2026).
// Progress lives in the profile (profile.campaign.done, saved with it). A mission is unlocked when the one before it is
// done; finished missions stay replayable. Starting a mission plays its intro dialogue, sets game.campaignRun and starts
// the mission's game mode with its parameters (main.js reads them through game.campaignParams()); a win marks it done,
// pays the reward once and — back in the hub — plays the outro and reopens the chapter screen.
// The screens are plain placeholders in the style of the character creation screen until the user's UI layout exists.
import { CAMPAIGN, allMissions, missionById } from './campaign_data.js';
import { sprites } from './sprites.js';

export const isMissionDone = (profile, id) => !!profile?.campaign?.done?.includes(id);
export function isMissionUnlocked(profile, id) {
  const list = allMissions(); const i = list.findIndex((m) => m.id === id);
  return i === 0 || (i > 0 && isMissionDone(profile, list[i - 1].id));
}
export const nextMission = (profile) => allMissions().find((m) => !isMissionDone(profile, m.id)) ?? null;

// Marks a mission done; the reward is paid only the first time. Returns { first, reward }.
export function completeMission(profile, id) {
  const m = missionById(id); if (!m || !profile) return null;
  profile.campaign ??= { done: [] };
  const first = !profile.campaign.done.includes(id);
  if (first) {
    profile.campaign.done.push(id);
    if (m.reward?.skillPoints) profile.skillPoints += m.reward.skillPoints;
    if (m.reward?.xp) profile.awardXp?.(m.reward.xp, { save: false });
    profile.save?.();
  }
  return { first, reward: m.reward ?? null };
}

// ── run state (the mission being played) ─────────────────────────────────────────────────────────────────────────
// game.campaignRun = { id, result: null | 'won' | 'lost', first } — set by startMission, read by main.js.
export function beginRun(game, id) { game.campaignRun = { id, result: null, first: false }; return missionById(id); }
// Called by main.js when a match ends while a campaign run is active.
export function finishRun(game, won) {
  const run = game.campaignRun; if (!run || run.result) return null;
  run.result = won ? 'won' : 'lost';
  if (won) { const r = completeMission(game.profile, run.id); run.first = !!r?.first; return r; }
  return null;
}

// ── screens ──────────────────────────────────────────────────────────────────────────────────────────────────────
const css = `
#cp-overlay,#cp-dialog{position:fixed;inset:0;z-index:8900;font-family:Cinzel,serif;color:#e8dcc4}
#cp-overlay{background:rgba(8,6,14,.94);display:flex;align-items:center;justify-content:center}
#cp-overlay .cp-box{width:min(980px,96vw);max-height:94vh;overflow:auto;padding:18px;border:2px solid #6b5a3a;background:#17121e;box-shadow:0 0 0 2px #0a080e}
#cp-overlay h2{margin:0 0 4px;font-size:22px;letter-spacing:2px;color:#f0d890}
#cp-overlay .cp-sum{margin:0 0 14px;font-size:13px;line-height:1.5;color:#b8ac98}
#cp-overlay .cp-path{display:flex;gap:6px;align-items:stretch;margin-bottom:14px}
#cp-overlay .cp-node{flex:1;text-align:left;font-family:inherit;color:#e8dcc4;background:#2a2234;border:2px solid #4a3e5a;padding:8px 9px;cursor:pointer;min-height:74px}
#cp-overlay .cp-node small{display:block;font-size:10px;letter-spacing:1px;color:#9a8eaa;margin-bottom:3px}
#cp-overlay .cp-node b{display:block;font-size:12px;line-height:1.25}
#cp-overlay .cp-node i{display:block;font-style:normal;font-size:10px;margin-top:5px;color:#8fd08a}
#cp-overlay .cp-node.locked{opacity:.45;cursor:default}
#cp-overlay .cp-node.on{border-color:#f0d890;background:#3e3222}
#cp-overlay .cp-node.done i{color:#8fd08a}
#cp-overlay .cp-detail{border:2px solid #3a3048;background:#120e18;padding:12px 14px;margin-bottom:12px}
#cp-overlay .cp-detail h3{margin:0 0 6px;font-size:17px;color:#fff3c8;letter-spacing:1px}
#cp-overlay .cp-detail p{margin:0 0 8px;font-size:13px;line-height:1.5}
#cp-overlay .cp-detail .cp-meta{font-size:12px;color:#b8a070}
#cp-overlay .cp-row{display:flex;gap:8px}
#cp-overlay button.cp-btn{font-family:inherit;font-size:15px;color:#e8dcc4;background:#2a2234;border:2px solid #4a3e5a;padding:9px 22px;cursor:pointer}
#cp-overlay button.cp-go{border-color:#f0d890;background:#4a3a1e;color:#fff3c8}
#cp-overlay .cp-note{font-size:11px;color:#8a7e98;margin-top:10px}
#cp-dialog{background:rgba(6,4,10,.78);display:flex;align-items:flex-end;justify-content:center;cursor:pointer}
#cp-dialog .cp-say{width:min(900px,96vw);margin-bottom:5vh;display:grid;grid-template-columns:132px 1fr;gap:14px;padding:14px;border:2px solid #6b5a3a;background:#17121e;box-shadow:0 0 0 2px #0a080e}
#cp-dialog canvas{width:132px;height:132px;background:#211a2a;border:2px solid #3a3048;image-rendering:pixelated}
#cp-dialog .cp-who{font-size:14px;letter-spacing:2px;color:#f0d890;margin-bottom:6px}
#cp-dialog .cp-text{font-size:16px;line-height:1.55;min-height:76px}
#cp-dialog .cp-hint{font-size:11px;color:#8a7e98;text-align:right}
`;
const NAMES = { narrator: 'ERZÄHLER', thesen: 'THESEN', xame: 'XAME', boss_firelord: 'DER GLUTFÜRST' };
function ensureStyle(doc) { if (!doc.getElementById('cp-style')) { const st = doc.createElement('style'); st.id = 'cp-style'; st.textContent = css; doc.head.appendChild(st); } }
const canUI = () => typeof globalThis.document?.createElement === 'function' && typeof globalThis.document.body?.appendChild === 'function';

let dialogOpen = null;
// Plays dialogue lines [{ who, text }]; a tap / key advances; done() afterwards. Without a DOM it calls done() at once.
export function playDialogue(lines, done) {
  if (!canUI() || !lines?.length) { done?.(); return false; }
  const doc = document; ensureStyle(doc); closeDialogue();
  const root = doc.createElement('div'); root.id = 'cp-dialog';
  root.innerHTML = '<div class="cp-say"><canvas width="132" height="132"></canvas><div><div class="cp-who"></div><div class="cp-text"></div><div class="cp-hint">TIPPEN / LEERTASTE: WEITER</div></div></div>';
  doc.body.appendChild(root);
  const cv = root.querySelector('canvas'); const ctx = cv.getContext('2d'); let i = 0; const t0 = performance.now();
  const show = () => { const l = lines[i]; root.querySelector('.cp-who').textContent = NAMES[l.who] ?? String(l.who).toUpperCase(); root.querySelector('.cp-text').textContent = l.text; };
  const draw = () => {
    if (dialogOpen?.root !== root) return;
    const l = lines[i]; ctx.clearRect(0, 0, 132, 132);
    if (l.who !== 'narrator' && sprites.sprites[l.who]) { try { sprites.renderEntity(ctx, l.who, 66, 250, { facing: 1, state: 'idle', animTime: (performance.now() - t0) / 1000, visualHeight: 250 }); } catch { /* portrait is optional */ } }
    else { ctx.fillStyle = '#b388ff'; for (let k = 0; k < 5; k++) ctx.fillRect(40 + k * 12, 60 + Math.round(Math.sin((performance.now() - t0) / 300 + k) * 6), 6, 6); }
    dialogOpen.raf = requestAnimationFrame(draw);
  };
  const next = (e) => { e?.preventDefault?.(); i++; if (i >= lines.length) { closeDialogue(); done?.(); } else show(); };
  const key = (e) => { if (e.code === 'Space' || e.code === 'Enter') next(e); };
  root.addEventListener('pointerdown', next); doc.addEventListener('keydown', key);
  dialogOpen = { root, raf: 0, key }; show(); dialogOpen.raf = requestAnimationFrame(draw);
  return true;
}
export function closeDialogue() { if (!dialogOpen) return; cancelAnimationFrame(dialogOpen.raf); document.removeEventListener('keydown', dialogOpen.key); dialogOpen.root.remove(); dialogOpen = null; }

let screenOpen = null;
export const isCampaignOpen = () => !!screenOpen || !!dialogOpen;
export function closeCampaign() { if (!screenOpen) return; screenOpen.remove(); screenOpen = null; }

// The chapter screen: the mission path, the selected mission's briefing and START. focusId preselects a mission.
export function openCampaign(game, { focusId = null } = {}) {
  if (!canUI()) return false;
  const doc = document; ensureStyle(doc); closeCampaign();
  const profile = game.profile; const chapter = CAMPAIGN[0];
  let sel = missionById(focusId) ?? nextMission(profile) ?? chapter.missions[chapter.missions.length - 1];
  const root = doc.createElement('div'); root.id = 'cp-overlay'; doc.body.appendChild(root); screenOpen = root;
  const render = () => {
    const doneN = chapter.missions.filter((m) => isMissionDone(profile, m.id)).length;
    root.innerHTML = `<div class="cp-box"><h2>${chapter.title}</h2><p class="cp-sum">${chapter.summary} · ${doneN}/${chapter.missions.length} Missionen geschafft</p>
      <div class="cp-path"></div><div class="cp-detail"></div>
      <div class="cp-row"><button class="cp-btn cp-go" type="button">MISSION STARTEN</button><button class="cp-btn cp-back" type="button">ZURÜCK</button></div>
      <div class="cp-note">Platzhalter-Bildschirm — das endgültige Layout kommt aus dem UI-Editor.</div></div>`;
    const path = root.querySelector('.cp-path');
    chapter.missions.forEach((m, k) => {
      const open = isMissionUnlocked(profile, m.id); const done = isMissionDone(profile, m.id);
      const b = doc.createElement('button'); b.type = 'button'; b.className = `cp-node${open ? '' : ' locked'}${done ? ' done' : ''}${sel.id === m.id ? ' on' : ''}`;
      b.innerHTML = `<small>${k + 1} · ${m.kind}</small><b>${m.title}</b><i>${done ? '✔ GESCHAFFT' : open ? 'OFFEN' : 'GESPERRT'}</i>`;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (open) { sel = m; render(); } }); path.appendChild(b);
    });
    const done = isMissionDone(profile, sel.id); const r = sel.reward ?? {};
    root.querySelector('.cp-detail').innerHTML = `<h3>${sel.title}</h3><p>${sel.briefing}</p><p class="cp-meta">ZIEL: ${sel.goal}</p>
      <p class="cp-meta">BELOHNUNG${done ? ' (bereits erhalten)' : ''}: ${[r.xp ? `${r.xp} XP` : '', r.skillPoints ? `${r.skillPoints} Skillpunkt${r.skillPoints > 1 ? 'e' : ''}` : ''].filter(Boolean).join(' · ') || '—'}</p>`;
    root.querySelector('.cp-go').textContent = done ? 'NOCHMAL SPIELEN' : 'MISSION STARTEN';
    root.querySelector('.cp-go').addEventListener('pointerdown', (e) => { e.preventDefault(); startMission(game, sel.id); });
    root.querySelector('.cp-back').addEventListener('pointerdown', (e) => { e.preventDefault(); closeCampaign(); });
  };
  render();
  return true;
}

// Intro dialogue → the mission's mode starts with its parameters. Returns false when the mission is locked.
export function startMission(game, id) {
  const m = missionById(id); if (!m || !isMissionUnlocked(game.profile, id)) return false;
  closeCampaign();
  const go = () => { beginRun(game, id); game.setMatchMode(m.mode); game.startMatch(); if (game.matchState !== 'Running') game.campaignRun = null; };
  // The intro plays the first time; a replay goes straight in.
  if (!isMissionDone(game.profile, id)) playDialogue(m.intro, go); else go();
  return true;
}

// Back in the hub after a campaign match: outro on the first win, then the chapter screen again.
export function afterMatch(game) {
  const run = game.campaignRun; if (!run) return false;
  game.campaignRun = null;
  const m = missionById(run.id); if (!m) return false;
  const reopen = () => openCampaign(game, { focusId: run.result === 'won' ? (nextMission(game.profile)?.id ?? run.id) : run.id });
  if (run.result === 'won' && run.first) playDialogue(m.outro, reopen); else reopen();
  return true;
}
