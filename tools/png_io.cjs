// Minimal PNG read / write / resample (RGBA 8-bit, also RGB / palette-free greyscale+alpha) for asset prep.
const fs = require('fs');
const zlib = require('zlib');

function paeth(a, b, c) { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }

function readPng(file) {
  const b = fs.readFileSync(file);
  let p = 8; let w = 0; let h = 0; let colorType = 6; let depth = 8; const idat = []; let palette = null; let trns = null;
  while (p < b.length) {
    const len = b.readUInt32BE(p); const type = b.toString('ascii', p + 4, p + 8); const data = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; colorType = data[9]; if (data[12]) throw new Error('interlaced PNG not supported'); }
    if (type === 'PLTE') palette = data;
    if (type === 'tRNS') trns = data;
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  if (depth !== 8) throw new Error(`bit depth ${depth} not supported`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * channels; const px = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride); const cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0; const up = prev[x]; const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) v += paeth(a, up, c);
      cur[x] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4; const s = x * channels;
      if (colorType === 6) { px[o] = cur[s]; px[o + 1] = cur[s + 1]; px[o + 2] = cur[s + 2]; px[o + 3] = cur[s + 3]; }
      else if (colorType === 2) { px[o] = cur[s]; px[o + 1] = cur[s + 1]; px[o + 2] = cur[s + 2]; px[o + 3] = 255; }
      else if (colorType === 4) { px[o] = px[o + 1] = px[o + 2] = cur[s]; px[o + 3] = cur[s + 1]; }
      else if (colorType === 0) { px[o] = px[o + 1] = px[o + 2] = cur[s]; px[o + 3] = 255; }
      else if (colorType === 3) { const i = cur[s]; px[o] = palette[i * 3]; px[o + 1] = palette[i * 3 + 1]; px[o + 2] = palette[i * 3 + 2]; px[o + 3] = trns && i < trns.length ? trns[i] : 255; }
    }
    cur.copy(prev);
  }
  return { w, h, px };
}

const crcTable = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePng(file, { w, h, px }) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4; const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    // Sub filter per row (good for pixel art).
    raw[y * (stride + 1)] = 1;
    for (let x = 0; x < stride; x++) {
      const v = px[y * stride + x]; const left = x >= 4 ? px[y * stride + x - 4] : 0;
      raw[y * (stride + 1) + 1 + x] = (v - left) & 255;
    }
  }
  const out = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(file, out);
  return out.length;
}

// Area-average resample with premultiplied alpha (clean downscaling).
function resample(img, nw, nh) {
  const { w, h, px } = img; const out = Buffer.alloc(nw * nh * 4);
  const sx = w / nw; const sy = h / nh;
  for (let ty = 0; ty < nh; ty++) {
    const y0 = ty * sy; const y1 = y0 + sy;
    for (let tx = 0; tx < nw; tx++) {
      const x0 = tx * sx; const x1 = x0 + sx;
      let r = 0; let g = 0; let b = 0; let a = 0; let area = 0;
      for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0);
        for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
          const wx = Math.min(x + 1, x1) - Math.max(x, x0);
          const k = wx * wy; const o = (y * w + x) * 4; const al = px[o + 3] / 255;
          r += px[o] * al * k; g += px[o + 1] * al * k; b += px[o + 2] * al * k; a += al * k; area += k;
        }
      }
      const o = (ty * nw + tx) * 4;
      if (a > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
      out[o + 3] = Math.round(a / area * 255);
    }
  }
  return { w: nw, h: nh, px: out };
}

module.exports = { readPng, writePng, resample };
