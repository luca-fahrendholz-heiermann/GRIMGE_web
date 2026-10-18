// GRIMGE Prototype — point-cloud glyph matching for the complex special-rune
// glyphs (signature specials). A drawing is compared with a template as an
// unordered cloud of points ($P recogniser idea): stroke order, stroke
// direction and the number of pen lifts do not matter, only the shape.
//
// Strokes: arrays of { x, y } (drawings) or [x, y] (guide templates).
const N = 48;

const toPts = (stroke) => stroke.map((p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y }));

// Resample all strokes together to N points (pen lifts are not bridged).
function resampleCloud(strokes) {
  const lines = strokes.map(toPts).filter((s) => s.length);
  let total = 0;
  for (const s of lines) for (let i = 1; i < s.length; i++) total += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
  if (total <= 0) return lines.flat().slice(0, N);
  const step = total / (N - 1); const out = [];
  let carry = 0;
  for (const s of lines) {
    out.push({ ...s[0] }); carry = 0;
    for (let i = 1; i < s.length; i++) {
      let ax = s[i - 1].x; let ay = s[i - 1].y; const bx = s[i].x; const by = s[i].y;
      let seg = Math.hypot(bx - ax, by - ay);
      while (carry + seg >= step && out.length < N) {
        const k = (step - carry) / seg; ax += (bx - ax) * k; ay += (by - ay) * k; out.push({ x: ax, y: ay }); seg = Math.hypot(bx - ax, by - ay); carry = 0;
      }
      carry += seg;
    }
  }
  while (out.length < N) out.push({ ...out[out.length - 1] });
  return out.slice(0, N);
}

// Uniform scale to the unit box, centroid at the origin.
function normalize(pts) {
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity; let cx = 0; let cy = 0;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); cx += p.x; cy += p.y; }
  const size = Math.max(maxX - minX, maxY - minY) || 1; cx /= pts.length; cy /= pts.length;
  return pts.map((p) => ({ x: (p.x - cx) / size, y: (p.y - cy) / size }));
}

export function cloudOf(strokes) { return normalize(resampleCloud(strokes)); }

function cloudDistance(a, b, start) {
  const matched = new Array(b.length).fill(false); let sum = 0; let i = start; const n = a.length;
  do {
    let best = -1; let bd = Infinity;
    for (let j = 0; j < b.length; j++) if (!matched[j]) { const d = (a[i].x - b[j].x) ** 2 + (a[i].y - b[j].y) ** 2; if (d < bd) { bd = d; best = j; } }
    matched[best] = true;
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * Math.sqrt(bd);
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

// Greedy point-cloud distance (smaller = more alike; ~0 for an exact trace).
export function glyphDistance(cloudA, cloudB) {
  const step = Math.floor(Math.pow(cloudA.length, .5)); let min = Infinity;
  for (let i = 0; i < cloudA.length; i += step) min = Math.min(min, cloudDistance(cloudA, cloudB, i), cloudDistance(cloudB, cloudA, i));
  return min / cloudA.length;
}
