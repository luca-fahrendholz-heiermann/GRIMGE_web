// Headless Chrome screenshot via the DevTools protocol (no extra deps).
// Usage: node shot.mjs <url> <outPng> [scenario]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [url, out, scenario = 'training'] = process.argv.slice(2);
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'grimge-chrome-'));
const port = 9333;
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch { /* starting */ }
  await sleep(200);
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description; };
const W = 1280, H = 720;
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1.5, mobile: false });
await send('Page.enable'); await send('Runtime.enable');
const problems = [];
ws.addEventListener('message', (m) => { const msg = JSON.parse(m.data); if (msg.method === 'Runtime.exceptionThrown') problems.push('EXCEPTION ' + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).slice(0, 200)); });
await send('Page.navigate', { url });
await sleep(3500);
const outDir = out; fs.mkdirSync(outDir, { recursive: true });
const shoot = async (name, clip) => { const r = await send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } }); fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(r.result.data, 'base64')); };
// Setup: Astral, Training, UI hidden (canvas only), no sparring partner.
console.log(await evaluate(`(async () => {
  const g = window.gameWorld; window.ui?.setSelectedHero?.('astral'); g.setSelectedHero?.('astral');
  g.setMatchMode('training'); g.startMatch();
  const cv = window.gameWorld.canvas;
  for (const el of document.querySelectorAll('body *')) if (el !== cv && !el.contains(cv)) el.style.visibility = 'hidden';
  window.__S = (await import('./src/spells.js')).spells; window.__C = await import('./src/spell_catalog.js'); window.__B = await import('./src/buff_forms.js'); window.__core = await import('./src/signature_core.js');
  window.__reset = (px = 330) => { const P = g.player; window.__S.clearRuntime(); window.__B.endBuffForm(P); if (P.signature) window.__core.endStance(P, 'replaced'); P.weaponInfusion = null; P.weaponBuff = null;
    P.x = px; P.z = .55; P.facing = 1; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.hp = P.maxHp; P.mp = P.maxMp; P.reservedMana = 0; P.chargeTimer = 0; P.formCharge = null; g.battlefield.placeOnSurface(P);
    const d = g.trainingDummy; d.homeX = d.x = 560; d.homeZ = d.z = .55; d.hp = d.maxHp; g.battlefield.dynamicSurfaces = []; };
  return 'hero=' + g.player.heroKey + ' canvas=' + JSON.stringify(cv.getBoundingClientRect());
})()`));
const rect = JSON.parse(await evaluate(`JSON.stringify(window.gameWorld.canvas.getBoundingClientRect())`));
// The arena band (without the top HUD and bottom hand row).
const clip = { x: rect.x + rect.width * .08, y: rect.y + rect.height * .2, width: rect.width * .84, height: rect.height * .58 };
const forms = JSON.parse(await evaluate(`JSON.stringify(Object.values(window.__B.BUFF_FORMS).map((f) => [f.id, f.name]))`));
const manifest = { forms: [], spells: [] };
for (const [id, name] of forms) {
  await evaluate(`(() => { window.__reset(300); const g = window.gameWorld; window.__S.cast(g.player, window.__S.resolveSpell([{ id: 'buff_${id}' }]), g); return 1; })()`);
  await sleep(900); await shoot(`form_${id}_idle`, clip);
  const shots = ['idle'];
  for (const dir of ['forward', 'up', 'down']) {
    await evaluate(`(() => { const g = window.gameWorld; const P = g.player; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.mp = P.maxMp; P.chargeTimer = 0; P.formCharge = null; P.beginCharge('${dir}', 'touch'); if (P.formCharge) P.formCharge.elapsed = 1.3; P.chargeDir = '${dir}'; P.releaseCharge(); return 1; })()`);
    await sleep(dir === 'forward' ? 300 : 380); await shoot(`form_${id}_${dir}`, clip); shots.push(dir);
    await sleep(700);
  }
  manifest.forms.push({ id, name, shots });
  console.log('form', id);
}
// Spells: every castable spell (recipes, nature, infusions, signature specials, solo specials).
const spellList = JSON.parse(await evaluate(`JSON.stringify(Object.values(window.__C.SPELL_DEFINITIONS).filter((d) => !d.isBuffForm && !String(d.id).startsWith('transform')).map((d) => [d.id, d.name, d.isSignature ? 'sig' : (d.tier ?? 1), d.desc ?? '']))`));
for (const [id, name, tier, desc] of spellList) {
  const r = await evaluate(`(() => { try { window.__reset(330); const g = window.gameWorld; const P = g.player; const def = window.__C.SPELL_DEFINITIONS['${id}'];
    const target = { x: 520, z: .55, a: { x: 470, z: .45 }, b: { x: 600, z: .65 }, start: { x: 470, z: .38 }, end: { x: 470, z: .72 }, orientation: 'lateral', length: 160, entity: P };
    window.__S.cast(P, def, g, null, def.targetingMode === 'ally' ? P : target); return 'ok'; } catch (e) { return 'ERR ' + e.message; } })()`);
  const isStance = await evaluate(`!!window.gameWorld.player.signature`);
  await sleep(isStance ? 350 : 550);
  if (isStance) { await evaluate(`(() => { const P = window.gameWorld.player; P.state = 'idle'; P.stateTimer = 0; P.canAttack = true; P.executeAttack({ keys: {}, justPressedKeys: {}, justPressedMouse: {}, move: { x: 0, z: 0 }, touchMove: { x: 0, z: 0 }, padMove: { x: 0, z: 0 }, justPressed: () => false }, 'normal'); return 1; })()`); await sleep(160); }
  if (id === 'world_tree' || id === 'meteor_cataclysm' || id.startsWith('summon')) await sleep(900);
  await shoot(`spell_${id}`, clip);
  manifest.spells.push({ id, name, tier, desc, status: r });
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('forms', manifest.forms.length, 'spells', manifest.spells.length, 'errors', manifest.spells.filter((s) => s.status !== 'ok').map((s) => s.id + ':' + s.status).slice(0, 8).join(' | '));
console.log('problems:', problems.length ? problems.slice(0, 6).join(' || ') : 'none');
ws.close(); proc.kill();
