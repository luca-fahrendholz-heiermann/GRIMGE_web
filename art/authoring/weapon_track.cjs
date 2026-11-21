// GRIMGE — weapon tracking for the base character's weapon clips (user, 21 Nov 2026: weapon attacks + correct front/back of
// sword and shield). The clips are generated with placeholders: a straight MAGENTA rod in the sword hand and a small CYAN
// patch on the rear forearm (where a shield is strapped), kept through anim_body.cjs with MARKERS=1.
//   node art/authoring/weapon_track.cjs <inDir with w_<clip>.png + .json> <clip> [<clip> …]
// Per frame: the rod's line (principal axis) → grip = the end next to the hand (more body pixels around it), angle = grip
// → tip; the patch's centre → shield anchor. A marker that is not visible means that piece is hidden behind the body in
// that frame (→ drawn in the back layer, position interpolated from the neighbouring frames). The markers are then removed
// and their thin gaps filled with the most common neighbouring colour; the clean sheet goes to
// public/assets/sprites/sheets/base_<clip>.png and the per-frame data into public/src/weapon_frames.js.
const fs = require('fs'); const path = require('path'); const { PNG } = require('pngjs');
const ROOT = path.resolve(__dirname, '../..'); const OUT_JS = path.join(ROOT, 'public/src/weapon_frames.js');
const [inDir, ...clips] = process.argv.slice(2);
const isMag = (r, g, b) => r > 200 && b > 200 && g < 90; const isCyan = (r, g, b) => g > 200 && b > 200 && r < 90;
// for cleaning: also the marker's blends with the outline / background (dark magenta, muted cyan) that the snap produced
const isMagish = (r, g, b) => r > 70 && b > 60 && g < Math.min(r, b) * .55; const isCyanish = (r, g, b) => g > 70 && b > 70 && r < Math.min(g, b) * .55;
const src = fs.existsSync(OUT_JS) ? fs.readFileSync(OUT_JS, 'utf8') : ''; const all = JSON.parse(/\/\*META\*\/([\s\S]*?)\/\*END\*\//.exec(src)?.[1] ?? '{}');
for (const clip of clips) {
  const meta = JSON.parse(fs.readFileSync(path.join(inDir, `${clip}.json`), 'utf8')); const im = PNG.sync.read(fs.readFileSync(path.join(inDir, `${clip}.png`)));
  const n = meta.frames, fw = meta.fw, fh = meta.fh; const at = (k, x, y) => (y * im.width + k * fw + x) * 4;
  const rows = [];
  for (let k = 0; k < n; k++) {
    const M = [], C = [];
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const i = at(k, x, y); if (!im.data[i + 3]) continue; const r = im.data[i], g = im.data[i + 1], b = im.data[i + 2]; if (isMag(r, g, b)) M.push([x, y]); else if (isCyan(r, g, b)) C.push([x, y]); }
    let sword = null;
    if (M.length >= 3) {
      const mx = M.reduce((a, p) => a + p[0], 0) / M.length, my = M.reduce((a, p) => a + p[1], 0) / M.length;
      let sxx = 0, syy = 0, sxy = 0; for (const [x, y] of M) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
      const th = .5 * Math.atan2(2 * sxy, sxx - syy); const dx = Math.cos(th), dy = Math.sin(th);
      let t0 = Infinity, t1 = -Infinity; for (const [x, y] of M) { const t = (x - mx) * dx + (y - my) * dy; t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
      const e0 = [mx + dx * t0, my + dy * t0], e1 = [mx + dx * t1, my + dy * t1];
      const bodyNear = ([ex, ey]) => { let c = 0; for (let y = Math.round(ey) - 3; y <= Math.round(ey) + 3; y++) for (let x = Math.round(ex) - 3; x <= Math.round(ex) + 3; x++) { if (x < 0 || y < 0 || x >= fw || y >= fh) continue; const i = at(k, x, y); if (im.data[i + 3] && !isMag(im.data[i], im.data[i + 1], im.data[i + 2]) && !isCyan(im.data[i], im.data[i + 1], im.data[i + 2])) c++; } return c; };
      const [grip, tip] = bodyNear(e0) >= bodyNear(e1) ? [e0, e1] : [e1, e0];
      sword = { gx: Math.round(grip[0]), gy: Math.round(grip[1]), angle: +Math.atan2(tip[1] - grip[1], tip[0] - grip[0]).toFixed(3) };
    }
    const shield = C.length ? { sx: Math.round(C.reduce((a, p) => a + p[0], 0) / C.length), sy: Math.round(C.reduce((a, p) => a + p[1], 0) / C.length) } : null;
    rows.push({ sword, shield });
    // remove the markers, then fill the gaps they leave inside the figure (palette-true: the commonest neighbour colour)
    const holes = []; const mark = new Set();
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const i = at(k, x, y); if (im.data[i + 3] && (isMagish(im.data[i], im.data[i + 1], im.data[i + 2]) || isCyanish(im.data[i], im.data[i + 1], im.data[i + 2]))) { holes.push([x, y]); mark.add(y * fw + x); } }
    // the marker's own dark outline (the AI drew the patch / rod with a border): dark pixels touching ≥ 2 marker pixels
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const i = at(k, x, y); if (!im.data[i + 3] || mark.has(y * fw + x) || im.data[i] + im.data[i + 1] + im.data[i + 2] > 120) continue; let c = 0; for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (mark.has((y + ay) * fw + x + ax)) c++; if (c >= 2) holes.push([x, y]); }
    for (const [x, y] of holes) im.data[at(k, x, y) + 3] = 0;
    for (let pass = 0; pass < 6; pass++) for (const [x, y] of holes) {
      const i = at(k, x, y); if (im.data[i + 3]) continue; const cnt = new Map(); let opp = 0;
      for (const [ax, ay] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const a = [x + ax, y + ay], b = [x - ax, y - ay]; const ok = (p) => p[0] >= 0 && p[1] >= 0 && p[0] < fw && p[1] < fh && im.data[at(k, p[0], p[1]) + 3]; if (ok(a) && ok(b)) opp++; }
      const onPatch = C.some(([cx, cy]) => Math.abs(cx - x) <= 2 && Math.abs(cy - y) <= 2); /* the shield patch lies ON the forearm: fill it even at the edge */
      let around = 0; for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (xx >= 0 && yy >= 0 && xx < fw && yy < fh && im.data[at(k, xx, yy) + 3]) around++;
      if (!opp && around < 4 && !(onPatch && around >= 3)) continue; /* the rod out in the air: leave it open (a thick rod band across the body closes from its edges: ≥ 4 opaque neighbours) */
      let lit = 0; for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) { if (xx < 0 || yy < 0 || xx >= fw || yy >= fh) continue; const j = at(k, xx, yy); if (im.data[j + 3] && im.data[j] + im.data[j + 1] + im.data[j + 2] > 150) lit++; }
      if (!onPatch && lit < 2) continue; /* only the rod's own dark edges around it (the rod in the air): no fill — it would turn into a dark stick */
      for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) { if (xx < 0 || yy < 0 || xx >= fw || yy >= fh) continue; const j = at(k, xx, yy); if (!im.data[j + 3]) continue; const key = (im.data[j] << 16) | (im.data[j + 1] << 8) | im.data[j + 2]; cnt.set(key, (cnt.get(key) ?? 0) + 1); }
      const best = [...cnt].sort((p, q) => q[1] - p[1])[0]; if (!best) continue; im.data[i] = best[0] >> 16; im.data[i + 1] = (best[0] >> 8) & 255; im.data[i + 2] = best[0] & 255; im.data[i + 3] = 255;
    }
    // the snap had already turned the markers' blends into body-palette colours (dark red / brown specks along the rod, a
    // dark ring where the patch was): a majority filter within 2 px of the markers replaces lone pixels by the clearly
    // dominant neighbour colour (≥ 5 of 8) — real contours, which have no such majority, stay
    const near = new Set(); for (const [x, y] of [...M, ...C]) for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (xx >= 0 && yy >= 0 && xx < fw && yy < fh) near.add(yy * fw + xx);
    for (let pass = 0; pass < 2; pass++) for (const p of near) {
      const x = p % fw, y = (p / fw) | 0; const i = at(k, x, y); if (!im.data[i + 3]) continue; const own = (im.data[i] << 16) | (im.data[i + 1] << 8) | im.data[i + 2]; const cnt = new Map();
      for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) { if ((xx === x && yy === y) || xx < 0 || yy < 0 || xx >= fw || yy >= fh) continue; const j = at(k, xx, yy); if (!im.data[j + 3]) continue; const key = (im.data[j] << 16) | (im.data[j + 1] << 8) | im.data[j + 2]; cnt.set(key, (cnt.get(key) ?? 0) + 1); }
      const best = [...cnt].sort((a, b) => b[1] - a[1])[0]; if (best && best[1] >= 5 && best[0] !== own) { im.data[i] = best[0] >> 16; im.data[i + 1] = (best[0] >> 8) & 255; im.data[i + 2] = best[0] & 255; }
    }
    // the rod's dark outline left standing in the air: peel it away — only right beside the rod (≤ 1 px), only pixels with
    // no bright neighbour AND open to the air (≥ 3 transparent neighbours); the dark training shorts the rod crossed have
    // no open side inside and stay (a looser rule tore a hole across the waist)
    const rodNear = new Set(); for (const [x, y] of M) for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (xx >= 0 && yy >= 0 && xx < fw && yy < fh) rodNear.add(yy * fw + xx);
    for (let pass = 0; pass < 3; pass++) for (const p of rodNear) {
      const x = p % fw, y = (p / fw) | 0; const i = at(k, x, y); if (!im.data[i + 3] || im.data[i] + im.data[i + 1] + im.data[i + 2] > 150) continue; let lit = 0, open = 0;
      for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) { if (xx === x && yy === y) continue; if (xx < 0 || yy < 0 || xx >= fw || yy >= fh) { open++; continue; } const j = at(k, xx, yy); if (!im.data[j + 3]) open++; else if (im.data[j] + im.data[j + 1] + im.data[j + 2] > 150) lit++; }
      if (!lit && open >= 3) im.data[i + 3] = 0;
    }
  }
  // hidden pieces: position from the nearest visible frames, flagged as behind the body
  const fill = (key) => { for (let k = 0; k < n; k++) if (!rows[k][key]) { let a = null, b = null; for (let d = 1; d < n && !(a && b); d++) { a ??= rows[(k - d + n) % n][key]; b ??= rows[(k + d) % n][key]; } const s = a ?? b; if (s) rows[k][key] = { ...s, hidden: true }; } };
  fill('sword'); fill('shield');
  // outliers the generator leaves (user, 21 Nov 2026: "Arm tauscht plötzlich"): a shield anchor that jumps far from both
  // neighbours (the patch painted on the wrong arm for a frame), and a grip sitting at the shield patch while the
  // neighbouring grips do not (the rod floating at the rear arm) — both take the mean of their neighbours (angle kept)
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  for (let k = 0; k < n; k++) {
    const pv = rows[(k - 1 + n) % n], nx = rows[(k + 1) % n], r = rows[k];
    const S = (q) => q.shield && { x: q.shield.sx, y: q.shield.sy }, G = (q) => q.sword && { x: q.sword.gx, y: q.sword.gy };
    if (S(r) && S(pv) && S(nx) && d(S(r), S(pv)) > 25 && d(S(r), S(nx)) > 25) r.shield = { ...r.shield, sx: Math.round((pv.shield.sx + nx.shield.sx) / 2), sy: Math.round((pv.shield.sy + nx.shield.sy) / 2) };
    const atShield = (q) => G(q) && S(q) && d(G(q), S(q)) < 27;
    if (atShield(r) && G(pv) && G(nx) && !atShield(pv) && !atShield(nx)) r.sword = { ...r.sword, gx: Math.round((pv.sword.gx + nx.sword.gx) / 2), gy: Math.round((pv.sword.gy + nx.sword.gy) / 2) };
  }
  const frames = rows.map(({ sword: s, shield: h }) => [s?.gx ?? 0, s?.gy ?? 0, s?.angle ?? 0, s?.hidden ? 1 : 0, h?.sx ?? 0, h?.sy ?? 0, h?.hidden ? 1 : 0]);
  const name = clip.replace(/^w_/, 'w_');
  fs.writeFileSync(path.join(ROOT, `public/assets/sprites/sheets/base_${name}.png`), PNG.sync.write(im));
  all[name] = { fw, fh, anchorX: meta.anchorX, anchorY: meta.anchorY, frames };
  console.log(name, frames.map((f) => `${f[3] ? 'B' : 'F'}${f[6] ? 'b' : 'f'}${Math.round(f[2] * 57.3)}`).join(' '));
}
fs.writeFileSync(OUT_JS, `// GRIMGE Prototype — traced weapon clips of the base character (art/authoring/weapon_track.cjs): per clip the frame size,\n// anchor and per frame [gripX, gripY, bladeAngle, swordBehind, shieldX, shieldY, shieldBehind] in frame pixels.\nexport const WEAPON_FRAMES = Object.freeze(/*META*/${JSON.stringify(all)}/*END*/);\n`);
