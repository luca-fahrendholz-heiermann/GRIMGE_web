// GRIMGE Prototype — the shield shell (Schutz / Ward; user, 22 Oct 2026: the old shield was a soft
// glowing ellipse that "looked odd"). A crisp pixel-style hexagonal shell around the Wizard:
// dark contour, violet edge, a light highlight on the upper edges, a thin honeycomb inside,
// a glint that runs around the rim, and plates that crack open as the capacity runs low.
const TAU = Math.PI * 2;

// The six corners of the shell (pointy top and bottom), centred on (cx, cy).
function corners(cx, cy, rx, ry) {
  return [[cx, cy - ry], [cx + rx, cy - ry * .48], [cx + rx, cy + ry * .48], [cx, cy + ry], [cx - rx, cy + ry * .48], [cx - rx, cy - ry * .48]];
}
const path = (ctx, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };

// frac: remaining capacity 0…1; t: time in s; color / light: the shell's colours.
export function drawWardShell(ctx, x, baseY, { frac = 1, t = 0, scale = 1, color = '#b388ff', light = '#ede7f6', dark = '#1b1035' } = {}) {
  const rx = Math.round(32 * scale); const ry = Math.round(51 * scale); const cx = Math.round(x); const cy = Math.round(baseY - 44 * scale); // the head stays inside
  const pts = corners(cx, cy, rx, ry);
  ctx.save(); ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
  // Honeycomb inside (thin, half alpha — the Wizard stays readable).
  ctx.save(); path(ctx, pts); ctx.clip();
  ctx.globalAlpha = .5; ctx.strokeStyle = color; ctx.lineWidth = 1;
  const cell = 9 * scale; const drift = (t * 6) % (cell * 1.5);
  for (let row = -6; row <= 6; row++) for (let col = -4; col <= 4; col++) {
    const hx = cx + col * cell * 1.74 + (row & 1) * cell * .87; const hy = cy + row * cell * 1.5 + drift - cell;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; const px = Math.round(hx + Math.cos(a) * cell); const py = Math.round(hy + Math.sin(a) * cell); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
  // The rim: six plates; low capacity leaves gaps (cracked plates).
  const broken = Math.max(0, Math.min(5, Math.floor((1 - frac) * 6)));
  for (let i = 0; i < 6; i++) {
    const a = pts[i]; const b = pts[(i + 1) % 6];
    if (i % 2 === 1 && Math.floor(i / 2) < broken / 2) {
      // A cracked plate: only its two ends remain, with a jagged break.
      const m1 = [a[0] + (b[0] - a[0]) * .35, a[1] + (b[1] - a[1]) * .35]; const m2 = [a[0] + (b[0] - a[0]) * .65, a[1] + (b[1] - a[1]) * .65];
      for (const [p, q] of [[a, m1], [m2, b]]) { ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke(); }
      continue;
    }
    ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
    // Light on the upper edges (top-left and top-right plates).
    if (i === 0 || i === 5) { ctx.strokeStyle = light; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1] + 1); ctx.lineTo(b[0], b[1] + 1); ctx.stroke(); }
  }
  // Corner studs.
  ctx.fillStyle = light; for (const [px, py] of pts) ctx.fillRect(px - 2, py - 2, 4, 4);
  // A glint running around the rim.
  const k = (t * .45) % 1 * 6; const i0 = Math.floor(k); const u = k - i0; const a = pts[i0]; const b = pts[(i0 + 1) % 6];
  const gx = Math.round(a[0] + (b[0] - a[0]) * u); const gy = Math.round(a[1] + (b[1] - a[1]) * u);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(gx - 2, gy - 2, 4, 4); ctx.fillStyle = light; ctx.fillRect(gx - 4, gy - 1, 8, 2); ctx.fillRect(gx - 1, gy - 4, 2, 8);
  ctx.restore();
}
