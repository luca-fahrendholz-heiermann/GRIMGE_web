// Batch PNG → JPEG (scaled) in one headless Chrome session.
// Usage: node batch_jpg.mjs <inDir> <outDir> [width] [quality]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [inDir, outDir, width = '1280', quality = '0.82'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const html = path.join(os.tmpdir(), 'grimge_batchjpg.html');
fs.writeFileSync(html, `<!doctype html><canvas id="c"></canvas><script>window.conv = (src) => new Promise((r) => { const i = new Image(); i.onload = () => { const c = document.getElementById('c'); const w = ${Number(width)}; c.width = w; c.height = Math.round(i.naturalHeight * w / i.naturalWidth); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, c.width, c.height); r(c.toDataURL('image/jpeg', ${Number(quality)})); }; i.onerror = () => r(''); i.src = src; });</script>`);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'grimge-bjpg-'));
const port = 9336;
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--allow-file-access-from-files', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets; for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch {} await sleep(200); }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.navigate', { url: pathToFileURL(html).href }); await sleep(800);
let n = 0;
for (const f of fs.readdirSync(inDir).filter((f) => f.endsWith('.png'))) {
  const src = pathToFileURL(path.join(inDir, f)).href;
  const r = await send('Runtime.evaluate', { expression: `window.conv(${JSON.stringify(src)})`, awaitPromise: true, returnByValue: true });
  const data = String(r.result?.result?.value ?? ''); if (!data.includes(',')) { console.log('fail', f); continue; }
  fs.writeFileSync(path.join(outDir, f.replace(/\.png$/, '.jpg')), Buffer.from(data.split(',')[1], 'base64')); n++;
}
console.log('converted', n);
ws.close(); proc.kill();
