// Acceptance captures for a visual-upgrade pilot (docs/GRIMGE_Visual_Upgrade_Plan.md §4 step 3):
// identical camera / scene for legacy (before), new (after), main-body-only and hitbox overlay,
// 0.25x slow-motion frame sequences, both facings, two heroes, an airborne cast and a render-time
// measurement with five simultaneous instances.
// Usage: node tools/catalog/capture_pilot.mjs <baseUrl> <outDir> <pilot>   (pilot: S37 | METEOR | S39)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [base, outDir, pilot = 'S37'] = process.argv.slice(2);
// Per pilot: spell id, target, slow-motion shot times (real ms at 0.25x), then a fast-forward and late shots.
const PILOTS = {
  S37: { spell: 'sig_S37', early: [80, 200, 420, 760, 1200, 2000], skip: 2200, late: [250, 350, 350] },
  METEOR: { spell: 'meteor_cataclysm', target: true, early: [150, 700, 1400, 2080, 2350, 2800, 3400], skip: 900, late: [500, 900] },
  S39: { spell: 'sig_S39', early: [100, 300, 600, 1000, 1500, 2100], skip: 4000, late: [250, 400, 400, 320] }
};
const P0 = PILOTS[pilot];
fs.mkdirSync(outDir, { recursive: true });
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'grimge-pilot-'));
const port = 9341;
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets; for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch { /* starting */ } await sleep(200); }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description; };
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.enable'); await send('Runtime.enable');

const open = async (query) => {
  await send('Page.navigate', { url: base + 'index.html' + query });
  await sleep(1500);
  await evaluate("localStorage.setItem('grimge-selected-companion', 'none'); 1");
  await send('Page.navigate', { url: base + 'index.html' + query });
  await sleep(3200);
};
const setup = (hero, weapon) => `(async () => {
  const g = window.gameWorld; g.setSelectedHero?.('${hero}'); g.setMatchMode('training'); g.startMatch();
  const cv = g.canvas; for (const el of document.querySelectorAll('body *')) if (el !== cv && !el.contains(cv)) el.style.visibility = 'hidden';
  window.__S = (await import('./src/spells.js')).spells; window.__C = await import('./src/spell_catalog.js');
  const P = g.player; P.equipClassWeapon?.(${weapon ? `'${weapon}'` : 'null'});
  return P.heroKey; })()`;
const cast = (facing, airborne) => `(() => { const g = window.gameWorld; const P = g.player; window.__S.clearRuntime(); g.battlefield.dynamicSurfaces = [];
  if (!P.isAlive) P.respawn(g.battlefield); P.x = ${facing > 0 ? 300 : 724}; P.z = .55; P.facing = ${facing}; P.state = 'idle'; P.stateTimer = 0; P.mp = P.maxMp; g.battlefield.placeOnSurface(P);
  ${airborne ? 'P.grounded = false; P.elevation = 70; P.vElevation = 0;' : ''}
  const d = g.trainingDummy; d.homeX = d.x = ${facing > 0 ? 470 : 554}; d.homeZ = d.z = .55; d.hp = d.maxHp;
  g.targetTimeScale = g.timeScale = .25;
  const def = window.__S.resolveSpell([{ id: '${P0.spell}' }]) ?? (window.__C?.SPELL_DEFINITIONS ?? {})['${P0.spell}'];
  window.__S.cast(P, def, g, null, ${P0.target ? '{ x: d.x, z: d.z }' : 'null'}); return 1; })()`;
const clip = { x: 64, y: 150, width: 1152, height: 400, scale: 1 };
const shoot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png', clip }); fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(r.result.data, 'base64')); };
// Frame times (real ms at 0.25x): crack → first spike → row growing → hold; then fast-forward to the break.
const EARLY = P0.early;
async function sequence(prefix, facing = 1, airborne = false) {
  await evaluate(cast(facing, airborne));
  let tPrev = 0; let n = 0;
  for (const t of EARLY) { await sleep(t - tPrev); tPrev = t; await shoot(`${prefix}_${n++}`); }
  // Run to just before the break (game time ≈ 2.95 s of the 3.2 s life), then slow again.
  await evaluate('(() => { const g = window.gameWorld; g.targetTimeScale = g.timeScale = 1; return 1; })()');
  await sleep(P0.skip);
  await evaluate('(() => { const g = window.gameWorld; g.targetTimeScale = g.timeScale = .25; return 1; })()');
  for (const t of P0.late) { await sleep(t); await shoot(`${prefix}_${n++}`); }
  await evaluate('(() => { const g = window.gameWorld; g.targetTimeScale = g.timeScale = 1; return 1; })()');
}
const results = {};
for (const [mode, query] of [['legacy', '?vfx=legacy'], ['new', ''], ['main', '?vfx=main'], ['hitbox', '?hitbox=1']]) {
  await open(query); await evaluate(setup('astral', null));
  await sequence(`${pilot}_${mode}_R`, 1);
  if (mode === 'new') { await sequence(`${pilot}_${mode}_L`, -1); await sequence(`${pilot}_${mode}_air`, 1, true); }
  // Render cost: five simultaneous casts, 120 full frames.
  if (mode === 'legacy' || mode === 'new') {
    results[mode] = await evaluate(`(() => { const g = window.gameWorld; const P = g.player; window.__S.clearRuntime(); g.battlefield.dynamicSurfaces = []; g.targetTimeScale = g.timeScale = 1;
      for (let k = 0; k < 5; k++) { P.x = 240 + k * 40; P.z = .3 + k * .12; P.facing = 1; P.mp = P.maxMp; const def = window.__S.resolveSpell([{ id: '${P0.spell}' }]) ?? window.__C.SPELL_DEFINITIONS['${P0.spell}']; if (P.signature) P.signature.timer = 0; window.__S.cast(P, def, g, null, { x: 480 + k * 60, z: .3 + k * .12 }); }
      for (let i = 0; i < 40; i++) window.__S.update(1 / 60, g);
      const t0 = performance.now(); for (let i = 0; i < 120; i++) g.render(); const ms = (performance.now() - t0) / 120;
      return { msPerFrame: +ms.toFixed(3), spells: window.__S.activeSpells.length }; })()`);
  }
}
await open(''); await evaluate(setup('paladin', 'sword_shield'));
await sequence(`${pilot}_new_paladin`, 1);
fs.writeFileSync(path.join(outDir, `${pilot}_perf.json`), JSON.stringify(results, null, 1));
console.log('perf', JSON.stringify(results));
ws.close(); proc.kill();
