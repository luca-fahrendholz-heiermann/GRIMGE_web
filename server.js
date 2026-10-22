// GRIMGE Prototype — Zero-dependency HTTP Server (ES Module)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

const UI_SPEC_DIR = path.join(__dirname, 'docs', 'ui_spec');
function handleUiSpec(req, res) {
  const json = path.join(UI_SPEC_DIR, 'ui_editor_spec.json');
  if (req.method === 'GET') {
    fs.readFile(json, 'utf8', (err, data) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('null'); return; }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' }); res.end(data);
    });
    return;
  }
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  let body = ''; let tooBig = false;
  req.on('data', (chunk) => { body += chunk; if (body.length > 5e6) { tooBig = true; req.destroy(); } });
  req.on('end', () => {
    if (tooBig) return;
    try {
      const { spec, markdown } = JSON.parse(body);
      if (!spec || !Array.isArray(spec.screens)) throw new Error('no spec');
      fs.mkdirSync(UI_SPEC_DIR, { recursive: true });
      fs.writeFileSync(json, JSON.stringify(spec, null, 1));
      if (typeof markdown === 'string') fs.writeFileSync(path.join(UI_SPEC_DIR, 'UI_EDITOR_SPEC.md'), markdown);
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}');
    } catch (err) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: String(err.message) })); }
  });
}

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  try {
    // Browser URLs encode spaces and punctuation. Decode before resolving the
    // local static file so supplied UI assets keep working in development.
    reqUrl = decodeURIComponent(reqUrl);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }
  if (reqUrl === '/') reqUrl = '/index.html';

  // UI editor (public/editor.html): the layout spec is saved into the repo so it can be carried into the code.
  if (reqUrl === '/api/ui-spec') { handleUiSpec(req, res); return; }

  const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${reqUrl}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} in use, trying ${PORT + 1}...`);
    PORT++;
    server.listen(PORT);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`⚔️  GRIMGE Prototype Server running at:`);
  console.log(`👉  http://localhost:${PORT}`);
  console.log(`===================================================`);
});
