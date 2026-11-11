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

// ── stars (progression the player can see; user, 11 Nov 2026: "progression fehlt mir noch") ───────────────────────
// Every won mission is rated: ★ won · ★ at least half the life left (arena: two soul sparks) · ★ within the par time.
// The best rating is kept; every STAR_STEP stars in total pay one bonus skill point.
export const STAR_STEP = 5;
export const STAR_RULES = Object.freeze(['Mission geschafft', 'Mindestens halbes Leben übrig', 'In der Zielzeit']);
export const starsOf = (profile, id) => profile?.campaign?.stars?.[id] ?? 0;
export const totalStars = (profile) => allMissions().reduce((n, m) => n + starsOf(profile, m.id), 0);
export function rateRun(game, m) {
  const P = game.player; const rift = !!game.modeState?.rift;
  const life = rift ? (P.soulSparks ?? 0) / 3 : (P.hp ?? 0) / (P.maxHp || 1);
  const elapsed = (game.matchDuration ?? 0) - (game.matchTime ?? 0);
  const conds = [true, life >= .5, elapsed <= (m.par ?? 180)];
  return { stars: conds.filter(Boolean).length, conds, elapsed };
}

// Marks a mission done; the reward is paid only the first time. Returns { first, reward, stars, best, bonus }.
export function completeMission(profile, id, stars = 1) {
  const m = missionById(id); if (!m || !profile) return null;
  profile.campaign ??= { done: [] }; profile.campaign.stars ??= {}; profile.campaign.starClaims ??= 0;
  const best = Math.max(starsOf(profile, id), Math.max(1, Math.min(3, stars))); profile.campaign.stars[id] = best;
  let bonus = 0; while (Math.floor(totalStars(profile) / STAR_STEP) > profile.campaign.starClaims) { profile.campaign.starClaims++; profile.skillPoints += 1; bonus++; }
  const first = !profile.campaign.done.includes(id);
  if (first) {
    profile.campaign.done.push(id);
    if (m.reward?.skillPoints) profile.skillPoints += m.reward.skillPoints;
    if (m.reward?.xp) profile.awardXp?.(m.reward.xp, { save: false });
  }
  profile.save?.();
  return { first, reward: m.reward ?? null, stars, best, bonus };
}

// ── run state (the mission being played) ─────────────────────────────────────────────────────────────────────────
// game.campaignRun = { id, result: null | 'won' | 'lost', first } — set by startMission, read by main.js.
export function beginRun(game, id) { game.campaignRun = { id, result: null, first: false }; return missionById(id); }
// Called by main.js when a match ends while a campaign run is active.
export function finishRun(game, won) {
  const run = game.campaignRun; if (!run || run.result) return null;
  run.result = won ? 'won' : 'lost';
  if (won) { const rate = rateRun(game, missionById(run.id)); const r = completeMission(game.profile, run.id, rate.stars); run.first = !!r?.first; run.stars = rate.stars; return r; }
  return null;
}

// ── screens ──────────────────────────────────────────────────────────────────────────────────────────────────────
const css = `
#cp-overlay,#cp-dialog{position:fixed;inset:0;z-index:8900;font-family:Cinzel,serif;color:#e8dcc4}
#cp-overlay{background:#07050b;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:manipulation;user-select:none;-webkit-user-select:none}
#cp-overlay .cp-stage{position:relative;width:min(100vw,calc(100dvh * 2.3333));aspect-ratio:1344/576;max-height:100dvh}
#cp-overlay .cp-stage>img{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated}
#cp-overlay .cp-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:1.2vw;padding:1.1vh 1.2vw;background:linear-gradient(#07050bee,#07050b00)}
#cp-overlay .cp-top h2{margin:0;font-size:clamp(13px,2.2vw,24px);letter-spacing:.12em;color:#f0d890;white-space:nowrap;text-shadow:0 2px 0 #000}
#cp-overlay .cp-prog{margin-left:auto;display:flex;gap:.5vw;align-items:center;font-size:clamp(10px,1.3vw,14px);color:#d8ccb4;text-shadow:0 1px 0 #000}
#cp-overlay .cp-prog i{width:clamp(10px,1.4vw,16px);height:clamp(10px,1.4vw,16px);border:2px solid #6b5a3a;background:#17121e;transform:rotate(45deg)}
#cp-overlay .cp-prog i.d{background:#8fd08a;border-color:#d8ffd0}
#cp-overlay button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
#cp-overlay .cp-back{font-size:clamp(11px,1.5vw,16px);color:#e8dcc4;background:#17121ecc;border:2px solid #6b5a3a;padding:.5em 1em;min-height:36px}
#cp-overlay .cp-pin{position:absolute;transform:translate(-50%,-50%);width:clamp(34px,4.4vw,56px);height:clamp(34px,4.4vw,56px);border-radius:50%;font-size:clamp(14px,2vw,24px);font-weight:700;color:#fff3c8;background:#2a2234;border:3px solid #6b5a3a;padding:0;line-height:1;box-shadow:0 0 0 2px #0a080e}
#cp-overlay .cp-pin.done{background:#2c4a2c;border-color:#8fd08a}
#cp-overlay .cp-pin.on{border-color:#f0d890;background:#6a4e1e;box-shadow:0 0 0 2px #0a080e,0 0 18px #f0d890;animation:cp-pulse 1.1s ease-in-out infinite}
#cp-overlay .cp-pin.locked{opacity:.6;background:#17121e;color:#8a7e98}
#cp-overlay .cp-tag{position:absolute;transform:translate(-50%,0);margin-top:clamp(20px,2.6vw,32px);padding:.15em .5em;font-size:clamp(8px,1vw,12px);letter-spacing:.06em;color:#e8dcc4;background:#07050bcc;border:1px solid #3a3048;white-space:nowrap;pointer-events:none}
#cp-overlay .cp-tag.on{color:#fff3c8;border-color:#f0d890}
@keyframes cp-pulse{50%{transform:translate(-50%,-50%) scale(1.12)}}
#cp-overlay .cp-card{position:absolute;left:1.2vw;right:1.2vw;bottom:1.4vh;display:grid;grid-template-columns:1fr auto;gap:1.4vw;align-items:center;padding:1.2vh 1.4vw;border:2px solid #6b5a3a;background:#17121eee;box-shadow:0 0 0 2px #0a080e}
#cp-overlay .cp-card small{display:block;font-size:clamp(9px,1.1vw,12px);letter-spacing:.14em;color:#b8a070}
#cp-overlay .cp-card h3{margin:.1em 0 .25em;font-size:clamp(14px,2vw,22px);letter-spacing:.06em;color:#fff3c8}
#cp-overlay .cp-card p{margin:0;font-size:clamp(10px,1.25vw,14px);line-height:1.4;color:#d8ccb4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#cp-overlay .cp-lvl{display:flex;align-items:center;gap:.5vw;font-size:clamp(10px,1.3vw,14px);color:#fff3c8;text-shadow:0 1px 0 #000;white-space:nowrap}
#cp-overlay .cp-xp{width:clamp(50px,9vw,120px);height:clamp(6px,.9vw,10px);border:2px solid #6b5a3a;background:#17121e}
#cp-overlay .cp-xp b{display:block;height:100%;background:#7ab8ff}
#cp-overlay .cp-st{color:#ffd24a;letter-spacing:.08em}
#cp-overlay .cp-st s{color:#4a3e5a;text-decoration:none}
#cp-overlay .cp-rules{display:flex;gap:1.2vw;flex-wrap:wrap;margin-top:.35em;font-size:clamp(9px,1.05vw,12px);color:#b8ac98}
#cp-overlay .cp-rules span.ok{color:#ffd24a}
#cp-overlay .cp-card .cp-rw{margin-top:.35em;font-size:clamp(9px,1.1vw,12px);color:#8fd08a}
#cp-overlay .cp-go{font-size:clamp(14px,2vw,22px);letter-spacing:.08em;color:#fff3c8;background:#6a4e1e;border:3px solid #f0d890;padding:.7em 1.4em;min-height:48px;white-space:nowrap;box-shadow:0 3px 0 #2a1e0a}
#cp-overlay .cp-go:active{transform:translateY(2px);box-shadow:0 1px 0 #2a1e0a}
#cp-dialog{background:rgba(6,4,10,.78);display:flex;align-items:flex-end;justify-content:center;cursor:pointer}
#cp-dialog .cp-say{width:min(900px,96vw);margin-bottom:3vh;display:grid;grid-template-columns:132px 1fr;gap:14px;padding:14px;border:2px solid #6b5a3a;background:#17121e;box-shadow:0 0 0 2px #0a080e}
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
  // Title bar and mission card hang on the screen edges (not on the map), so on 16:9 they use the bands the wide map leaves.
  // One screen, no scrolling (user, 11 Nov 2026: "wie richtige Mobile Games übersichtlich"): the chapter map fills the
  // stage, the missions are big pins on it, a top bar carries title and progress, a card at the bottom the chosen mission
  // and the one big START button. Everything scales with the viewport.
  const tap = (el, fn) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  const render = () => {
    const ms = chapter.missions; const k = ms.indexOf(sel); const done = isMissionDone(profile, sel.id); const r = sel.reward ?? {};
    const reward = [r.xp ? `${r.xp} XP` : '', r.skillPoints ? `${r.skillPoints} Skillpunkt${r.skillPoints > 1 ? 'e' : ''}` : ''].filter(Boolean).join(' · ');
    const star = (n) => `<span class="cp-st">${'★'.repeat(n)}<s>${'★'.repeat(3 - n)}</s></span>`;
    const got = starsOf(profile, sel.id); const total = totalStars(profile); const toNext = STAR_STEP - (total % STAR_STEP);
    const need = profile.xpToNextLevel?.() ?? 100; const xpPct = Math.max(0, Math.min(100, Math.round((profile.xp ?? 0) / need * 100)));
    const par = sel.par ? `${Math.floor(sel.par / 60)}:${String(sel.par % 60).padStart(2, '0')}` : '';
    root.innerHTML = `<div class="cp-stage">
      ${chapter.map ? `<img src="assets/scenes/campaign/${chapter.map}.png" alt="">` : ''}</div>
      <div class="cp-top"><button class="cp-back" type="button">◀ ZURÜCK</button><h2>${chapter.title}</h2>
        <div class="cp-prog"><div class="cp-lvl">STUFE ${profile.level ?? 1}<div class="cp-xp"><b style="width:${xpPct}%"></b></div></div>
          <div class="cp-lvl"><span class="cp-st">★</span> ${total}/${ms.length * 3} · noch ${toNext} bis +1 Skillpunkt</div></div></div>
      <div class="cp-card"><div><small>MISSION ${k + 1} · ${sel.kind}</small><h3>${sel.title}</h3><p>${sel.briefing}</p>
        <div class="cp-rules">${STAR_RULES.map((t, i) => `<span class="${got > i ? 'ok' : ''}">${got > i ? '★' : '☆'} ${t}${i === 2 && par ? ` (${par})` : ''}</span>`).join('')}</div>
        <div class="cp-rw">${done ? `✔ GESCHAFFT ${star(got)}` : `BELOHNUNG: ${reward || '—'}`}</div></div>
        <button class="cp-go" type="button">${done ? 'NOCHMAL' : 'START'} ▶</button></div>`;
    const stage = root.querySelector('.cp-stage');
    ms.forEach((m, i) => {
      if (!m.map) return;
      const open = isMissionUnlocked(profile, m.id); const isDone = isMissionDone(profile, m.id); const on = sel.id === m.id;
      const pin = doc.createElement('button'); pin.type = 'button'; pin.className = `cp-pin${open ? '' : ' locked'}${isDone ? ' done' : ''}${on ? ' on' : ''}`;
      pin.textContent = isDone ? '✔' : open ? String(i + 1) : '🔒'; pin.style.left = `${m.map[0]}%`; pin.style.top = `${m.map[1]}%`;
      tap(pin, () => { if (open) { sel = m; render(); } }); stage.appendChild(pin);
      const tag = doc.createElement('div'); tag.className = `cp-tag${on ? ' on' : ''}`; tag.innerHTML = `${m.title}${isDone ? ` ${star(starsOf(profile, m.id))}` : ''}`; tag.style.left = `${m.map[0]}%`; tag.style.top = `${m.map[1]}%`; stage.appendChild(tag);
    });
    tap(root.querySelector('.cp-go'), () => startMission(game, sel.id));
    tap(root.querySelector('.cp-back'), () => closeCampaign());
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
