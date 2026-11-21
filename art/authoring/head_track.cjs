// GRIMGE — head anchors for the modular character (user, 21 Nov 2026: the game starts with character creation; hair, beard,
// face details and eyes are 184-grid stills on the reference body and must follow the head through every animation).
//   node art/authoring/head_track.cjs            → writes public/src/head_anchors.js
// For every frame of every base clip (public/assets/sprites/sheets/base_*.png) the reference body's head (body.png, the
// head box below) is searched by shape + colour; the best offset says where the 184-grid origin lies in that frame, so a
// head layer is drawn at (ox, oy). q = match quality 0..1 — below ~.45 the head is turned/flat (flight, knock-down) and
// the renderer leaves the head layers out rather than drawing them in the wrong place.
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const ROOT = path.resolve(__dirname, '../..'); const SHEETS = path.join(ROOT, 'public/assets/sprites/sheets');
const body = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public/assets/character/body/body.png')));
const BOX = { x0: 80, y0: 32, x1: 108, y1: 62 }; /* bald head + face + jaw on the 184 grid */
const tpl = []; for (let y = BOX.y0; y <= BOX.y1; y++) for (let x = BOX.x0; x <= BOX.x1; x++) { const i = (y * 184 + x) * 4; tpl.push({ x, y, a: body.data[i + 3] > 127, c: [body.data[i], body.data[i + 1], body.data[i + 2]] }); }
const nOn = tpl.filter((t) => t.a).length;
const sprites = fs.readFileSync(path.join(ROOT, 'public/src/sprites.js'), 'utf8');
const out = {};
for (const f of fs.readdirSync(SHEETS).filter((n) => /^base_.*\.png$/.test(n))) {
  const m = new RegExp(`sheets/${f.replace('.', '\\.')}', frames: (\\d+)`).exec(sprites); const n = m ? Number(m[1]) : 8;
  const im = PNG.sync.read(fs.readFileSync(path.join(SHEETS, f))); const fw = im.width / n, fh = im.height; const res = [];
  for (let k = 0; k < n; k++) {
    const px = (x, y) => { if (x < 0 || y < 0 || x >= fw || y >= fh) return null; const i = (y * im.width + k * fw + x) * 4; return im.data[i + 3] ? [im.data[i], im.data[i + 1], im.data[i + 2]] : null; };
    let best = { s: -1e9, ox: 0, oy: 0 };
    // the head is the top of the figure in every upright / flying pose: search only a band below the figure's top row
    // (without it a raised chin made the match slide onto the chest)
    let top = fh; for (let y = 0; y < fh && top === fh; y++) for (let x = 0; x < fw; x++) if (px(x, y)) { top = y; break; }
    const HEAD_TOP = 34; /* the head's first row on the 184 grid */
    for (let oy = top - HEAD_TOP - 6; oy <= top - HEAD_TOP + 14; oy++) for (let ox = -BOX.x0 - 8; ox <= fw - BOX.x0 + 8; ox++) {
      let s = 0;
      for (const t of tpl) { const p = px(t.x + ox, t.y + oy); if (t.a) s += p ? 1 - Math.min(1, (Math.abs(p[0] - t.c[0]) + Math.abs(p[1] - t.c[1]) + Math.abs(p[2] - t.c[2])) / 240) : -1; else if (p) s -= .25; }
      if (s > best.s) best = { s, ox, oy };
    }
    res.push([best.ox, best.oy, +Math.max(0, best.s / nOn).toFixed(2)]);
  }
  out[f.replace('.png', '')] = res; console.log(f, res.map((r) => r[2]).join(' '));
}
const js = `// GRIMGE Prototype — head anchors of the base character's clips (art/authoring/head_track.cjs): per sheet and frame\n// [ox, oy, q] = where the 184-grid origin of the head layers (hair, beard, face, eyes) lies in that frame; q = match quality.\nexport const HEAD_ANCHORS = Object.freeze(/*META*/${JSON.stringify(out)}/*END*/);\n`;
fs.writeFileSync(path.join(ROOT, 'public/src/head_anchors.js'), js); console.log('written public/src/head_anchors.js');
