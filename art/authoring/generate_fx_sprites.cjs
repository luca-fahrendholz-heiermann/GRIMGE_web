#!/usr/bin/env node
// GRIMGE — original pixel-art FX / prop sprite sheets (deterministic).
//
// Every sheet is a horizontal strip of equally sized frames, drawn pixel by
// pixel with a small per-effect palette, cluster shading and a 1px dark
// outline so the effects match the hand-pixelled characters and scenes.
// Output: public/assets/sprites/fx/<name>.png (runtime) — the matching
// editable .aseprite sources live next to this script in fx/.
//
//   node art/authoring/generate_fx_sprites.cjs
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'sprites', 'fx');

// ── tiny pixel canvas ──────────────────────────────────────────────────
function hex(color, alpha = 255) {
  const v = parseInt(color.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, alpha];
}

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

class Sheet {
  constructor(name, fw, fh, frames) {
    this.name = name; this.fw = fw; this.fh = fh; this.frames = frames;
    this.png = new PNG({ width: fw * frames, height: fh });
    this.png.data.fill(0);
  }
  idx(f, x, y) { return ((y * this.png.width) + f * this.fw + x) * 4; }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.fw && y < this.fh; }
  set(f, x, y, color) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inside(x, y)) return;
    const i = this.idx(f, x, y);
    this.png.data[i] = color[0]; this.png.data[i + 1] = color[1]; this.png.data[i + 2] = color[2]; this.png.data[i + 3] = color[3] ?? 255;
  }
  alpha(f, x, y) { return this.inside(x, y) ? this.png.data[this.idx(f, x, y) + 3] : 0; }
  rect(f, x, y, w, h, color) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(f, xx, yy, color); }
  disc(f, cx, cy, r, color, squash = 1) {
    for (let y = Math.floor(cy - r * squash) - 1; y <= cy + r * squash + 1; y++) {
      for (let x = Math.floor(cx - r) - 1; x <= cx + r + 1; x++) {
        if (((x - cx) / r) ** 2 + ((y - cy) / (r * squash)) ** 2 <= 1) this.set(f, x, y, color);
      }
    }
  }
  line(f, x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) { this.set(f, x0, y0, color); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  // 1px outline around every opaque pixel (4-neighbourhood).
  outline(f, color) {
    const marks = [];
    for (let y = 0; y < this.fh; y++) for (let x = 0; x < this.fw; x++) {
      if (this.alpha(f, x, y) > 0) continue;
      if (this.alpha(f, x + 1, y) > 120 || this.alpha(f, x - 1, y) > 120 || this.alpha(f, x, y + 1) > 120 || this.alpha(f, x, y - 1) > 120) marks.push([x, y]);
    }
    for (const [x, y] of marks) this.set(f, x, y, color);
  }
  // Recolour every opaque pixel of a frame (used for charred / glowing variants).
  tint(f, fn) {
    for (let y = 0; y < this.fh; y++) for (let x = 0; x < this.fw; x++) {
      const i = this.idx(f, x, y);
      if (!this.png.data[i + 3]) continue;
      const [r, g, b] = fn(this.png.data[i], this.png.data[i + 1], this.png.data[i + 2], x, y);
      this.png.data[i] = r; this.png.data[i + 1] = g; this.png.data[i + 2] = b;
    }
  }
  save(dir) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${this.name}.png`), PNG.sync.write(this.png));
    return { name: this.name, frameWidth: this.fw, frameHeight: this.fh, frames: this.frames };
  }
}

// ── effects ───────────────────────────────────────────────────────────
function flame() {
  const s = new Sheet('fx_flame', 16, 24, 6);
  const C = { red: hex('#c62828'), orange: hex('#ff6d00'), amber: hex('#ffb300'), yellow: hex('#ffe57f'), core: hex('#fffde7'), out: hex('#4a0f00') };
  for (let f = 0; f < 6; f++) {
    const height = [21, 23, 20, 22, 23, 21][f];
    for (let y = 23; y >= 24 - height; y--) {
      const t = (23 - y) / height; // 0 at base, 1 at tip
      const sway = Math.sin(t * 3.2 + f * 1.1) * 2.2 * t;
      const half = 6.2 * Math.pow(1 - t, .75) * (t < .12 ? .75 + t * 2 : 1);
      for (let x = 0; x < 16; x++) {
        const d = Math.abs(x - (7.5 + sway)) / Math.max(.6, half);
        if (d > 1) continue;
        const heat = (1 - d) * (1 - t * .9);
        const color = heat > .62 && t < .55 ? C.core : heat > .42 ? C.yellow : heat > .26 ? C.amber : heat > .12 ? C.orange : C.red;
        s.set(f, x, y, color);
      }
    }
    // A detached flicker near the tip.
    s.set(f, 7 + Math.round(Math.sin(f * 2) * 3), 24 - height - 2 - (f % 2), C.amber);
    s.outline(f, C.out);
  }
  return s;
}

function lightning() {
  const s = new Sheet('fx_lightning', 32, 128, 5);
  const C = { core: hex('#ffffff'), glow: hex('#82b1ff'), deep: hex('#304ffe'), flash: hex('#fff59d'), spark: hex('#ffd740') };
  const r = rng(7);
  const points = [[16, 0]];
  for (let y = 10; y < 122; y += 10) points.push([16 + (r() - .5) * 16, y]);
  points.push([16, 122]);
  const forks = [[3, 1], [6, -1], [8, 1]].map(([i, dir]) => ({ i, dir, len: 10 + r() * 8 }));
  const bolt = (f, width, dashed = false) => {
    for (let i = 0; i < points.length - 1; i++) {
      if (dashed && i % 2) continue;
      const [x0, y0] = points[i]; const [x1, y1] = points[i + 1];
      if (width > 1) { s.line(f, x0 - 1, y0, x1 - 1, y1, C.glow); s.line(f, x0 + 1, y0, x1 + 1, y1, C.glow); }
      if (width > 2) { s.line(f, x0 - 2, y0, x1 - 2, y1, C.deep); s.line(f, x0 + 2, y0, x1 + 2, y1, C.deep); }
      s.line(f, x0, y0, x1, y1, C.core);
    }
    for (const fork of forks) {
      const [x0, y0] = points[fork.i];
      s.line(f, x0, y0, x0 + fork.dir * fork.len, y0 + fork.len * .8, width > 1 ? C.glow : C.deep);
    }
  };
  const burst = (f, radius, color) => {
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      s.line(f, 16, 122, 16 + Math.cos(ang) * radius, 122 + Math.sin(ang) * radius * .5, color);
    }
    s.disc(f, 16, 122, radius * .45, C.core, .5);
  };
  // 0: faint leader, 1–2: full strike with impact, 3: fading, 4: sparks only.
  for (let i = 0; i < points.length - 1; i += 2) s.line(0, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], C.glow);
  bolt(1, 3); burst(1, 9, C.flash);
  bolt(2, 3); burst(2, 13, C.flash);
  bolt(3, 2, true); burst(3, 6, C.glow);
  for (let k = 0; k < 9; k++) s.set(4, 16 + (r() - .5) * 20, 122 - r() * 10, k % 2 ? C.spark : C.glow);
  return s;
}

function spark() {
  const s = new Sheet('fx_spark', 16, 16, 4);
  const C = { core: hex('#ffffff'), yellow: hex('#ffeb3b'), cyan: hex('#80d8ff') };
  for (let f = 0; f < 4; f++) {
    const r = rng(30 + f);
    for (let arc = 0; arc < 2; arc++) {
      let x = 2 + r() * 4, y = 8 + (r() - .5) * 6;
      for (let step = 0; step < 4; step++) {
        const nx = x + 2 + r() * 3, ny = y + (r() - .5) * 7;
        s.line(f, x, y, nx, ny, step % 2 ? C.cyan : C.yellow);
        x = nx; y = ny;
      }
    }
    s.set(f, 8, 8, C.core);
  }
  return s;
}

function splash() {
  const s = new Sheet('fx_splash', 40, 24, 6);
  const C = { hi: hex('#e3f2fd'), mid: hex('#64b5f6'), dark: hex('#1565c0'), out: hex('#0d2c54') };
  for (let f = 0; f < 6; f++) {
    const ring = 4 + f * 3;
    const fade = f >= 4;
    for (let a = 0; a < 28; a++) {
      const ang = a / 28 * Math.PI * 2;
      if (fade && a % 3) continue;
      s.set(f, 20 + Math.cos(ang) * ring, 20 + Math.sin(ang) * ring * .3, a % 4 ? C.mid : C.hi);
    }
    // Droplets on parabolic arcs (rise, then fall back).
    for (let d = 0; d < 7; d++) {
      const dir = (d - 3) / 3;
      const t = f / 5;
      const x = 20 + dir * 15 * t;
      const y = 19 - (14 * t - 16 * t * t) * (1.2 - Math.abs(dir) * .4) * 1.6;
      if (y > 21) continue;
      s.disc(f, x, y, f < 3 ? 1.3 : .8, d % 2 ? C.mid : C.hi);
      s.set(f, x + 1, y + 1, C.dark);
    }
    if (f < 3) s.disc(f, 20, 18 - f * 2, 2.2 - f * .4, C.hi, 1.4);
    s.outline(f, C.out);
  }
  return s;
}

function ice() {
  const s = new Sheet('fx_ice', 32, 32, 5);
  const C = { light: hex('#e1f5fe'), mid: hex('#81d4fa'), dark: hex('#0288d1'), out: hex('#01579b'), star: hex('#ffffff') };
  const shards = [[16, 30, 6, 24], [9, 30, 4, 15], [23, 30, 4, 17], [12, 31, 3, 9], [21, 31, 3, 10]];
  for (let f = 0; f < 5; f++) {
    const grow = Math.min(1, .3 + f * .25);
    for (const [cx, base, half, height] of shards) {
      const h = Math.round(height * grow);
      for (let y = 0; y < h; y++) {
        const t = y / h;
        const w = half * (t < .7 ? 1 - t * .25 : (1 - t) * 2.5);
        for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) {
          if (Math.abs(x) > w) continue;
          const color = x < -w * .25 ? C.light : x > w * .35 ? C.dark : C.mid;
          s.set(f, cx + x, base - y, color);
        }
      }
    }
    s.outline(f, C.out);
    if (f === 4) { s.line(f, 14, 5, 14, 11, C.star); s.line(f, 11, 8, 17, 8, C.star); }
  }
  return s;
}

function lavaBubble() {
  const s = new Sheet('fx_lava_bubble', 12, 12, 6);
  const C = { core: hex('#ffe082'), hot: hex('#ff9100'), rim: hex('#d84315'), out: hex('#3e0b00') };
  for (let f = 0; f < 6; f++) {
    if (f < 4) {
      const r = 1.2 + f * .9;
      s.disc(f, 6, 10 - f * .6, r, C.rim, .8);
      s.disc(f, 6, 10 - f * .6, r - .8, C.hot, .8);
      s.set(f, 5, 9 - f * .6 - r * .3, C.core);
    } else {
      for (let d = 0; d < 5; d++) s.set(f, 6 + (d - 2) * (f - 2), 8 - (f === 4 ? 3 : 1) + Math.abs(d - 2), d % 2 ? C.core : C.hot);
    }
    s.outline(f, C.out);
  }
  return s;
}

function smoke() {
  const s = new Sheet('fx_smoke', 32, 32, 6);
  const C = { light: hex('#cfd8dc'), mid: hex('#9e9e9e'), shade: hex('#757575'), out: hex('#37474f') };
  for (let f = 0; f < 6; f++) {
    const grow = 1 + f * .22; const rise = f * 2.2;
    const puffs = [[12, 22, 5], [19, 21, 5.5], [16, 16, 6]];
    for (const [x, y, r] of puffs) {
      s.disc(f, x, y - rise, r * grow, C.mid);
      s.disc(f, x - 1, y - rise - 1, r * grow * .55, C.light);
    }
    for (const [x, y, r] of puffs) s.disc(f, x + r * grow * .5, y - rise + r * grow * .45, r * grow * .35, C.shade);
    // Fade out with an ordered dither in the last frames.
    if (f >= 4) for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if ((x + y + f) % (f === 4 ? 3 : 2) === 0) s.set(f, x, y, [0, 0, 0, 0]);
    s.outline(f, C.out);
  }
  return s;
}

function crate() {
  const s = new Sheet('prop_crate', 32, 32, 3);
  const C = { top: hex('#c8b49a'), face: hex('#a1887f'), plank: hex('#8d6e63'), dark: hex('#5d4037'), nail: hex('#424242'), out: hex('#2b1b14'), char: hex('#3e2a20') };
  for (let f = 0; f < 3; f++) {
    // Top face (slanted parallelogram) and front face.
    for (let y = 4; y < 10; y++) for (let x = 6 + (9 - y); x < 28 - (y - 4) * 0 && x < 30 - (9 - y) * 0; x++) s.set(f, x - (9 - y), y, C.top);
    s.rect(f, 4, 10, 24, 20, C.face);
    for (let y = 10; y < 30; y += 5) s.rect(f, 4, y, 24, 1, C.plank);
    s.rect(f, 4, 10, 2, 20, C.dark); s.rect(f, 26, 10, 2, 20, C.dark);
    s.line(f, 6, 12, 25, 28, C.dark); s.line(f, 6, 13, 25, 29, C.plank);
    for (const [x, y] of [[5, 11], [26, 11], [5, 28], [26, 28]]) s.set(f, x, y, C.nail);
    if (f >= 1) { s.line(f, 12, 10, 15, 18, C.out); s.line(f, 15, 18, 13, 24, C.out); s.rect(f, 20, 15, 3, 3, [0, 0, 0, 0]); }
    s.outline(f, C.out);
    // Charred: darkened wood with a few glowing ember pixels.
    if (f === 2) s.tint(f, (r, g, b, x, y) => ((x * 13 + y * 7) % 23 === 0 && y > 12 ? [255, 120, 30] : [r * .38, g * .32, b * .3]));
  }
  return s;
}

function barrel() {
  const s = new Sheet('prop_barrel', 24, 32, 3);
  const C = { wood: hex('#b0602e'), woodDark: hex('#7a3e1c'), woodLight: hex('#d0874e'), hoop: hex('#616161'), hoopHi: hex('#bdbdbd'), top: hex('#8d4a22'), mark: hex('#ffb300'), out: hex('#2a1206'), hot: hex('#ff5722') };
  for (let f = 0; f < 3; f++) {
    for (let y = 6; y < 30; y++) {
      const bulge = Math.sin((y - 6) / 24 * Math.PI) * 2;
      const half = 8 + bulge;
      for (let x = -Math.round(half); x <= Math.round(half); x++) {
        const t = (x + half) / (half * 2);
        const color = t < .25 ? C.woodDark : t > .7 ? C.woodLight : C.wood;
        s.set(f, 12 + x, y, color);
      }
    }
    for (const y of [9, 26]) { s.rect(f, 3, y, 19, 2, C.hoop); s.rect(f, 6, y, 4, 1, C.hoopHi); }
    s.disc(f, 12, 6, 8, C.top, .35); s.disc(f, 12, 6, 6, C.woodDark, .3);
    // Hazard mark: a small flame.
    s.rect(f, 11, 15, 3, 5, C.mark); s.set(f, 12, 14, C.mark); s.set(f, 12, 18, C.out);
    if (f >= 1) { s.line(f, 7, 12, 9, 20, C.out); s.rect(f, 15, 21, 2, 2, C.woodDark); }
    s.outline(f, C.out);
    // About to burst: the wood glows from the bottom up.
    if (f === 2) s.tint(f, (r, g, b, x, y) => { const heat = Math.max(0, (y - 6) / 26); return [Math.min(255, r + 90 * heat), g * (1 - .35 * heat) + 20 * heat, b * (1 - .6 * heat)]; });
  }
  return s;
}

function weather() {
  // 0 snow, 1 rain, 2 ember, 3 leaf A, 4 leaf B, 5 sand mote, 6 mana mote A, 7 mana mote B
  const s = new Sheet('fx_weather', 8, 8, 8);
  const W = hex('#ffffff'), ICE = hex('#b3e5fc');
  s.line(0, 4, 1, 4, 7, W); s.line(0, 1, 4, 7, 4, W); s.set(0, 2, 2, ICE); s.set(0, 6, 6, ICE); s.set(0, 6, 2, ICE); s.set(0, 2, 6, ICE);
  s.line(1, 5, 0, 3, 7, hex('#bbdefb', 220)); s.set(1, 3, 7, W);
  s.disc(2, 4, 4, 2, hex('#ff6d00')); s.set(2, 4, 4, hex('#fff59d')); s.set(2, 3, 4, hex('#ffd54f'));
  for (const [f, flip] of [[3, 1], [4, -1]]) {
    for (let i = 0; i < 6; i++) { s.set(f, 4 + flip * (i - 3), 2 + i * .8, hex('#e65100')); s.set(f, 4 + flip * (i - 2), 2 + i * .8, hex('#ff9800')); }
    s.line(f, 1, 6, 6, 1, hex('#6d2c00'));
  }
  s.rect(5, 3, 3, 2, 2, hex('#e0c48c')); s.set(5, 5, 5, hex('#bfa06a'));
  s.set(6, 4, 1, hex('#e0f7fa')); s.rect(6, 3, 2, 3, 3, hex('#4dd0e1')); s.set(6, 4, 3, W); s.set(6, 4, 5, hex('#4dd0e1'));
  s.rect(7, 3, 3, 2, 2, hex('#80deea')); s.set(7, 3, 3, W);
  return s;
}

function rubble() {
  const s = new Sheet('fx_rubble', 12, 10, 4);
  const C = { hi: hex('#bcaaa4'), mid: hex('#8d6e63'), dark: hex('#5d4037'), out: hex('#2b1b14') };
  for (let f = 0; f < 4; f++) {
    const r = rng(90 + f);
    for (let k = 0; k < 3; k++) {
      const cx = 3 + r() * 6, cy = 5 + r() * 3, rad = 1.5 + r() * 1.8;
      s.disc(f, cx, cy, rad, C.mid, .75);
      s.set(f, cx - 1, cy - 1, C.hi);
      s.set(f, cx + rad * .6, cy + rad * .4, C.dark);
    }
    s.outline(f, C.out);
  }
  return s;
}

const sheets = [flame(), lightning(), spark(), splash(), ice(), lavaBubble(), smoke(), crate(), barrel(), weather(), rubble()];
const manifest = sheets.map((sheet) => sheet.save(OUT_DIR));
fs.writeFileSync(path.join(OUT_DIR, 'fx_manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`wrote ${manifest.length} sheets to ${OUT_DIR}`);
for (const entry of manifest) console.log(` - ${entry.name}: ${entry.frames} x ${entry.frameWidth}x${entry.frameHeight}`);
