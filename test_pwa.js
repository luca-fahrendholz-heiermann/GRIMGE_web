import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;
const root = path.resolve('.');
const assert = (condition, name) => {
  if (condition) { console.log(`  ✅ PASS: ${name}`); passed++; }
  else { console.error(`  ❌ FAIL: ${name}`); failed++; }
};
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const pngSize = (relative) => {
  const bytes = fs.readFileSync(path.join(root, relative));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

console.log('\n📱 Starting GRIMGE PWA shell tests...\n');

const html = read('public/index.html');
const manifest = JSON.parse(read('public/manifest.webmanifest'));
assert(/rel="manifest" href="\.\/manifest\.webmanifest"/.test(html), 'HTML links the relative web app manifest');
assert(/apple-mobile-web-app-capable" content="yes"/.test(html), 'iOS standalone mode is enabled');
assert(/apple-mobile-web-app-title" content="GRIMGE"/.test(html), 'iOS Home Screen title is GRIMGE');
assert(/viewport-fit=cover/.test(html), 'Viewport opts into iOS safe-area coverage');
assert(/apple-touch-icon/.test(html) && exists('public/icons/apple-touch-icon.png'), 'Apple touch icon is linked and present');
assert(/id="safe-area-probe"/.test(html), 'HTML includes the iOS safe-area measurement probe');
assert(manifest.name === 'GRIMGE' && manifest.short_name === 'GRIMGE', 'Manifest exposes the concise GRIMGE app name');
assert(manifest.start_url === './' && manifest.scope === './', 'Manifest uses GitHub Pages-safe relative launch paths');
assert(manifest.display === 'standalone' && manifest.orientation === 'landscape', 'Manifest requests standalone landscape gameplay');
assert(manifest.background_color === '#050408' && manifest.theme_color === '#050408', 'Manifest suppresses a light launch flash');
assert(manifest.icons.length >= 2 && manifest.icons.every(icon => exists(`public/${icon.src}`)), 'Manifest icon assets exist in the static deployment output');
assert(pngSize('public/icons/icon-192.png').width === 192 && pngSize('public/icons/icon-192.png').height === 192, '192px PWA icon has the declared dimensions');
assert(pngSize('public/icons/icon-512.png').width === 512 && pngSize('public/icons/icon-512.png').height === 512, '512px PWA icon has the declared dimensions');
assert(pngSize('public/icons/apple-touch-icon.png').width === 180 && pngSize('public/icons/apple-touch-icon.png').height === 180, 'Apple touch icon has the declared dimensions');
assert(read('server.js').includes("'.webmanifest': 'application/manifest+json; charset=utf-8'"), 'Local server exposes the manifest with its correct MIME type');
const css = read('public/css/style.css');
const main = read('public/src/main.js');
assert(css.includes('#ui-layer.has-safe-area') && css.includes('env(safe-area-inset-left)'), 'Safe-area CSS protects HUD controls without shrinking the arena');
assert(main.includes('`--safe-${edge}`') && main.includes('safe-area-probe') && main.includes("display-mode: standalone"), 'Runtime converts physical safe-area insets into logical HUD coordinates');

console.log(`\nPWA results: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
