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
const ui = read('public/src/ui.js');
const sprites = read('public/src/sprites.js');
const manifest = JSON.parse(read('public/manifest.webmanifest'));
assert(/rel="manifest" href="\.\/manifest\.webmanifest"/.test(html), 'HTML links the relative web app manifest');
assert(/apple-mobile-web-app-capable" content="yes"/.test(html), 'iOS standalone mode is enabled');
assert(/apple-mobile-web-app-title" content="GRIMGE"/.test(html), 'iOS Home Screen title is GRIMGE');
assert(/viewport-fit=cover/.test(html), 'Viewport opts into iOS safe-area coverage');
assert(/apple-touch-icon/.test(html) && exists('public/icons/apple-touch-icon.png'), 'Apple touch icon is linked and present');
assert(/id="safe-area-probe"/.test(html), 'HTML includes the iOS safe-area measurement probe');
assert(/id="rotate-overlay"/.test(html), 'HTML includes a full-screen portrait rotate overlay');
assert(manifest.name === 'GRIMGE' && manifest.short_name === 'GRIMGE', 'Manifest exposes the concise GRIMGE app name');
assert(manifest.start_url === './' && manifest.scope === './', 'Manifest uses GitHub Pages-safe relative launch paths');
assert(manifest.display === 'standalone' && manifest.orientation === 'landscape', 'Manifest requests standalone landscape gameplay');
assert(manifest.background_color === '#050408' && manifest.theme_color === '#050408', 'Manifest suppresses a light launch flash');
assert(manifest.icons.length >= 2 && manifest.icons.every(icon => exists(`public/${icon.src}`)), 'Manifest icon assets exist in the static deployment output');
assert(pngSize('public/icons/icon-192.png').width === 192 && pngSize('public/icons/icon-192.png').height === 192, '192px PWA icon has the declared dimensions');
assert(pngSize('public/icons/icon-512.png').width === 512 && pngSize('public/icons/icon-512.png').height === 512, '512px PWA icon has the declared dimensions');
assert(pngSize('public/icons/apple-touch-icon.png').width === 180 && pngSize('public/icons/apple-touch-icon.png').height === 180, 'Apple touch icon has the declared dimensions');
assert(read('server.js').includes("'.webmanifest': 'application/manifest+json; charset=utf-8'"), 'Local server exposes the manifest with its correct MIME type');
assert(read('server.js').includes('decodeURIComponent(reqUrl)'), 'Local server resolves URL-encoded supplied asset names');
const css = read('public/css/style.css');
const main = read('public/src/main.js');
assert(css.includes('#ui-layer.has-safe-area') && css.includes('env(safe-area-inset-left)'), 'Safe-area CSS protects HUD controls without shrinking the arena');
assert(main.includes('`--safe-${edge}`') && main.includes('safe-area-probe') && main.includes("display-mode: standalone"), 'Runtime converts physical safe-area insets into logical HUD coordinates');
assert(css.includes('body.portrait-gameplay #rotate-overlay') && css.includes('body.portrait-gameplay #game-container'), 'Portrait gameplay replaces the tiny stage with a rotate screen');
assert(css.includes('position: fixed;') && css.includes('width: 100vw;') && css.includes('height: 100dvh;'), 'Outer game surface is edge-to-edge instead of a fixed 16:9 contain stage');
assert(main.includes('renderWidth') && main.includes('cameraOffsetX') && main.includes('updateViewport()'), 'Runtime uses a constant-height adaptive camera rather than stretching gameplay');
assert(css.includes("url('../assets/arena_bg.jpg')") && read('public/src/battlefield.js').includes('decorative edge continuation'), 'Wider landscape devices receive decorative world overscan instead of permanent black side bars');
assert(css.includes('aspect-ratio: 1 / 1') && css.includes('.mount-action.is-available') && css.includes('height: 132px;'), 'Cast, Block, Swap and Mount remain circular while Jump is an intentional vertical swipe rail');
assert(css.includes('left: 150px; bottom: 12px; width: 84px; height: 84px') && css.includes('left: 166px; bottom: 110px; width: 52px; height: 52px'), 'Mount is centered at 12 o’clock above the dominant Cast button');
assert(main.includes('syncOrientationState()') && main.includes('updateMountCandidate()'), 'Runtime pauses portrait gameplay and maintains an authoritative mount candidate');
assert(css.includes('#hub-overlay.hidden { display: none; pointer-events: none; }'), 'Hidden Hub removes its interactive page layer before match controls become active');
assert(html.includes('id="hub-battle-btn"') && html.includes('id="hub-siege-mode-btn"') && ui.includes("this.setHubPage('modes')") && ui.includes('startMatch(e);'), 'Hub opens Battle mode selection and Free Play starts the available Castle Siege match');
assert(
  html.includes('hub-game-types-menu')
  && html.includes('ui_hub_gametype_selection_screen_background.png')
  && ['campaign', 'ranked', 'coop', 'custom_match', 'free_play', 'training'].every((mode) => html.includes(`ui_button_gametype_${mode}.png`)),
  'Battle opens an asset-driven game type selection scene using all supplied mode artwork'
);
assert(
  css.includes('.hub-shell.hub-game-types-active')
  && ui.includes("classList.toggle('hub-game-types-active', page === 'modes')")
  && html.includes('id="hub-modes-back-btn"'),
  'Game type selection has its own full-screen shell state and a reliable return path'
);
assert(sprites.includes('astral_v2') && sprites.includes("file: 'char_astral.png'"), 'Astral hooded and unhooded sprites are registered in the shared player sprite pipeline');
assert(
  exists('public/assets/ui/ui_hub_start_screen_concept/ui_hub_start_screen_background.png')
  && exists('public/assets/ui/ui_hub_start_screen_concept/ui_logo_grimge.png')
  && exists('public/assets/ui/ui_hub_start_screen_concept/ui_button_classes.png')
  && exists('public/assets/ui/ui_hub_start_screen_concept/ui_button_mastery.png')
  && exists('public/assets/ui/ui_hub_start_screen_concept/ui_button_transformations.png')
  && exists('public/assets/ui/ui_hub_start_screen_concept/ui_button_battle.png')
  && html.includes('ui_button_mastery.png')
  && html.includes('ui_button_transformations.png')
  && html.includes('ui_button_battle.png'),
  'Asset-driven Hub scene ships its separate background, logo and interactive button art'
);
assert(html.includes('hub-art-profile-portrait') && html.includes('hub-art-profile-xp-fill'), 'Hub profile frame contains dynamic portrait, Arcana level and XP state');
assert(
  html.includes('hub-art-menu') && html.includes('hub-main-action')
  && ui.includes('toggleHubSelection') && css.includes('.hub-shell.hub-main-active')
  && ['classes', 'wardrobe', 'grimoire', 'primals', 'mastery', 'transformations'].every(action => html.includes(`data-hub-action="${action}"`)),
  'Asset-driven Hub keeps decorative art separate from all six explicit menu actions'
);

console.log(`\nPWA results: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
