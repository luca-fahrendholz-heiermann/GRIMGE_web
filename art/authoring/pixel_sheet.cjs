// GRIMGE — tiny pixel canvas for deterministic sprite strips (shared by the
// spell sprite generator). A sheet is a horizontal strip of equally sized
// frames; every pixel is set explicitly (no anti-aliasing).
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function hex(color, alpha = 255) {
  const v = parseInt(color.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, alpha];
}

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

class Sheet {
  constructor(name, fw, fh, frames, meta = {}) {
    this.name = name; this.fw = fw; this.fh = fh; this.frames = frames; this.meta = meta;
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
  get(f, x, y) { if (!this.inside(x, y)) return null; const i = this.idx(f, x, y); return this.png.data[i + 3] ? [this.png.data[i], this.png.data[i + 1], this.png.data[i + 2], this.png.data[i + 3]] : null; }
  alpha(f, x, y) { return this.inside(x, y) ? this.png.data[this.idx(f, x, y) + 3] : 0; }
  line(f, x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) { this.set(f, x0, y0, color); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  // Filled polygon (even-odd scanline), points in frame pixels.
  poly(f, pts, color) {
    const ys = pts.map((p) => p[1]); const y0 = Math.floor(Math.min(...ys)); const y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i]; const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y + .5 && by > y + .5) || (by <= y + .5 && ay > y + .5)) xs.push(ax + (y + .5 - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(f, x, y, color);
    }
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
  // Copy a frame (optionally shifted) into another frame.
  copy(from, to, dx = 0, dy = 0, filter = null) {
    const src = this.png.data.slice();
    for (let y = 0; y < this.fh; y++) for (let x = 0; x < this.fw; x++) {
      const i = ((y * this.png.width) + from * this.fw + x) * 4; if (!src[i + 3]) continue;
      if (filter && !filter(x, y)) continue;
      this.set(to, x + dx, y + dy, [src[i], src[i + 1], src[i + 2], src[i + 3]]);
    }
  }
  save(dir) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${this.name}.png`), PNG.sync.write(this.png));
    return { name: this.name, w: this.fw, h: this.fh, frames: this.frames, ...this.meta };
  }
}

module.exports = { Sheet, hex, rng };
