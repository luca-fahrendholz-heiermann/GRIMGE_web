// GRIMGE Prototype — transformation and focus visuals drawn as bodies.
//
//  • Focus charge: a rising aura that grows with the Focus meter. Flame
//    tongues stream upward, sparks rise and, near a full meter, spiky
//    flame "hair" flickers higher and lightning crackles. When the meter is
//    full a pulsing ring and a hint show how to transform.
//  • Eidolon Mantle: an original spectral void guardian built up around the
//    Wizard — spine, ribcage, horned skull helm, armoured pauldrons,
//    gauntleted arms and a crystal greatsword. The skeleton forms first, the
//    armour plates follow.
//  • Ninefold Beast Form: an original flame fox spirit — nine full tapered
//    tails, a fox head with tall ears and burning eyes, a flame cloak and
//    claw marks.
// Everything is drawn through a coarse pixel layer so it matches the sprites.
import { renderPixelated } from './abilities.js';

const TAU = Math.PI * 2;
const pixelSize = (ctx) => Math.max(1, Math.round(2 * (ctx.getTransform?.()?.a || 1)));
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

function rgba(rgb, a) { return `rgba(${rgb},${Math.max(0, Math.min(1, a))})`; }

// ── Focus charge / ascendant aura ─────────────────────────────────────────
// intensity: 0 (no aura) … 1 (full meter) … 1.3 (transformed).
export function drawFocusAura(ctx, x, feetY, t, intensity, { height = 88, ready = false, hint = '' } = {}) {
  if (intensity <= 0) return;
  const k = Math.min(1.3, intensity);
  const vis = Math.min(1.25, .6 + .6 * k);
  renderPixelated(ctx, pixelSize(ctx), (c) => {
    c.save();
    c.globalCompositeOperation = 'lighter';
    // Flame tongues rising from the body outline.
    const tongues = Math.round(8 + 14 * k);
    for (let i = 0; i < tongues; i++) {
      const side = i % 2 ? 1 : -1;
      const f = (i / tongues);
      const rise = ((t * (1.6 + k) + hash(i) * 3) % 1);
      const bx = x + side * (10 + 13 * Math.sin(f * Math.PI)) + Math.sin(t * 6 + i) * 2;
      const by = feetY - 6 - f * height * .9;
      const len = (14 + 30 * k) * (.6 + .4 * hash(i + 9)) * (1 - rise * .5);
      const top = by - len - rise * 26 * k;
      const w = 5 + 4 * k;
      c.fillStyle = rgba('179,136,255', .4 * vis * (1 - rise));
      c.beginPath(); c.moveTo(bx - w, by); c.quadraticCurveTo(bx - w * .4, by - len * .6, bx + Math.sin(t * 9 + i) * 4, top); c.quadraticCurveTo(bx + w * .4, by - len * .6, bx + w, by); c.closePath(); c.fill();
      c.fillStyle = rgba('255,213,79', .55 * vis * (1 - rise));
      c.beginPath(); c.moveTo(bx - w * .5, by); c.quadraticCurveTo(bx, by - len * .5, bx + Math.sin(t * 9 + i) * 3, top + len * .25); c.quadraticCurveTo(bx, by - len * .5, bx + w * .5, by); c.closePath(); c.fill();
    }
    // Rising sparks.
    const sparks = Math.round(4 + 16 * k);
    for (let i = 0; i < sparks; i++) {
      const p = (t * (0.6 + hash(i) * .8) + hash(i + 3)) % 1;
      const sx = x + (hash(i + 7) - .5) * 52;
      const sy = feetY - p * (height + 50 * k);
      c.fillStyle = rgba(i % 3 ? '255,241,118' : '234,128,252', (1 - p) * .9 * Math.min(1, k));
      c.fillRect(Math.round(sx), Math.round(sy), 2 + (i % 2), 2 + (i % 2));
    }
    // Spiky flame "hair" that flutters ever higher near a full meter.
    if (k > .75) {
      const h = clamp01((k - .75) / .55);
      for (let i = 0; i < 6; i++) {
        const ox = (i - 2.5) * 6;
        const flick = .7 + .3 * Math.sin(t * 22 + i * 1.7) + .2 * hash(Math.floor(t * 12) + i);
        const len = (16 + 26 * h) * flick;
        const baseY = feetY - height + 10;
        c.fillStyle = rgba('255,236,140', .55 + .35 * h);
        c.beginPath(); c.moveTo(x + ox - 5, baseY); c.lineTo(x + ox + (i - 2.5) * 2.2, baseY - len); c.lineTo(x + ox + 5, baseY); c.closePath(); c.fill();
      }
    }
    // Crackling lightning when ready or transformed.
    if (k >= 1) {
      c.strokeStyle = rgba('255,253,231', .9); c.lineWidth = 2;
      const seed = Math.floor(t * 14);
      for (let b = 0; b < 2; b++) {
        if (hash(seed + b * 31) < .45) continue;
        let px = x + (hash(seed + b) - .5) * 40; let py = feetY - height * (.2 + hash(seed + b + 5) * .7);
        c.beginPath(); c.moveTo(px, py);
        for (let s = 0; s < 4; s++) { px += (hash(seed + s + b * 7) - .5) * 16; py -= 7 + hash(seed + s) * 6; c.lineTo(px, py); }
        c.stroke();
      }
    }
    c.restore();
  });
  if (ready) {
    // Pulsing ring at the feet and a hint how to transform.
    const pulse = .6 + .4 * Math.sin(t * 6);
    ctx.save();
    ctx.strokeStyle = rgba('255,213,79', .55 + .4 * pulse); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, feetY, 26 + 4 * pulse, 8 + 1.5 * pulse, 0, 0, TAU); ctx.stroke();
    if (hint) {
      ctx.font = 'bold 9px Cinzel, serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10,6,24,.75)';
      const w = ctx.measureText?.(hint)?.width ?? hint.length * 6;
      ctx.fillRect(x - w / 2 - 5, feetY - height - 58, w + 10, 14);
      ctx.fillStyle = rgba('255,236,140', .75 + .25 * pulse);
      ctx.fillText(hint, x, feetY - height - 48);
    }
    ctx.restore();
  }
}

// ── Eidolon Mantle: spectral armoured void guardian ──────────────────────
// age: seconds since the mantle formed; fade: 0…1 overall visibility.
// motion: { lean: -1…1 speed along facing (smoothed), bob: -1…1 step phase }
export function drawEidolonGuardian(ctx, x, feetY, facing, t, age, fade, layer = 'back', { drawingBow = false, lean = 0, bob = 0 } = {}) {
  if (fade <= 0) return;
  const bones = clamp01(age / .35) * fade;
  const armour = clamp01((age - .25) / .4) * fade;
  const breathe = 1 + Math.sin(t * 2.4) * .018;
  renderPixelated(ctx, pixelSize(ctx), (c) => {
    c.save();
    // The guardian trails slightly behind a running Wizard, leans into the
    // run and rises and falls with the steps.
    c.translate(x - facing * (6 + lean * 10), feetY - Math.abs(bob) * 3 * Math.abs(lean));
    c.scale(facing * breathe, breathe);
    c.rotate(lean * .1);
    const bone = 'rgba(232,214,255,';
    const boneEdge = 'rgba(120,60,200,';
    if (layer === 'front') {
      // Front ribs enclose the Wizard (translucent so the body stays readable).
      c.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const y = -70 - i * 13;
        const span = 34 + Math.sin(i * .7) * 6;
        c.strokeStyle = rgba('232,214,255', .38 * bones); c.lineWidth = 4;
        c.beginPath(); c.moveTo(-span, y + 4); c.quadraticCurveTo(0, y + 18, span, y + 4); c.stroke();
      }
      c.restore();
      return;
    }
    // Ethereal void flame body behind everything.
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = rgba('124,58,237', .22 * fade);
    c.beginPath();
    c.moveTo(-70, -30);
    for (let i = 0; i <= 14; i++) {
      const f = i / 14; const xx = -70 + f * 140;
      const flame = Math.sin(t * 6 + i * 1.3) * 8 + Math.sin(t * 9 + i) * 4;
      c.lineTo(xx, -170 - Math.sin(f * Math.PI) * 40 - flame);
    }
    c.lineTo(70, -30); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.lineCap = 'round'; c.lineJoin = 'round';
    // Spine.
    for (let i = 0; i < 9; i++) {
      c.fillStyle = bone + (.85 * bones) + ')';
      c.fillRect(-4, -48 - i * 12, 8, 8);
    }
    // Back ribs.
    for (let i = 0; i < 5; i++) {
      const y = -70 - i * 13; const span = 40 + Math.sin(i * .7) * 6;
      c.strokeStyle = boneEdge + (.7 * bones) + ')'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(-span * .8, y - 10, -span, y + 6); c.moveTo(0, y); c.quadraticCurveTo(span * .8, y - 10, span, y + 6); c.stroke();
      c.strokeStyle = bone + (.85 * bones) + ')'; c.lineWidth = 3;
      c.stroke();
    }
    // Clavicles and pelvis.
    c.strokeStyle = bone + (.9 * bones) + ')'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-58, -142); c.lineTo(0, -132); c.lineTo(58, -142); c.stroke();
    c.beginPath(); c.moveTo(-26, -42); c.quadraticCurveTo(0, -30, 26, -42); c.stroke();
    // Arms: rear arm hangs, front arm grips the crystal greatsword.
    const swing = Math.sin(t * 1.8) * .06 + bob * .12 * Math.abs(lean);
    const arm = (sx, ex, ey, hx, hy) => {
      c.strokeStyle = boneEdge + (.7 * bones) + ')'; c.lineWidth = 8;
      c.beginPath(); c.moveTo(sx, -140); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
      c.strokeStyle = bone + (.9 * bones) + ')'; c.lineWidth = 4; c.stroke();
    };
    // Arms swing with the stride.
    const stride = bob * 10 * Math.abs(lean);
    arm(-60, -82 - stride * .5, -96, -74 - stride, -58);
    arm(60, 84 + stride * .5, -100, 92 + stride, -70);
    // Crystal greatsword in the front hand (put away while the spirit bow is drawn).
    if (!drawingBow) {
    c.save();
    c.translate(92, -70); c.rotate(-.95 + swing);
    c.fillStyle = rgba('206,147,216', .55 * armour);
    c.beginPath(); c.moveTo(-6, 0); c.lineTo(0, -150); c.lineTo(6, 0); c.closePath(); c.fill();
    c.fillStyle = rgba('255,240,255', .75 * armour);
    c.beginPath(); c.moveTo(-1.5, -6); c.lineTo(0, -140); c.lineTo(1.5, -6); c.closePath(); c.fill();
    c.fillStyle = rgba('123,63,214', .9 * armour); c.fillRect(-14, -4, 28, 6); c.fillRect(-3, 0, 6, 16);
    c.restore();
    }
    // Armour: pauldrons, breastplate, gauntlets.
    const plate = (px, py, w, h, flip) => {
      c.fillStyle = rgba('110,56,200', .78 * armour);
      c.strokeStyle = rgba('214,180,255', .95 * armour); c.lineWidth = 2;
      c.beginPath(); c.moveTo(px - w * flip * .2, py - h); c.quadraticCurveTo(px + w * flip, py - h * .9, px + w * flip, py); c.lineTo(px - w * flip * .3, py + 2); c.closePath(); c.fill(); c.stroke();
    };
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) plate(side * (54 + i * 4), -146 + i * 11, 26 - i * 3, 18, side);
    c.fillStyle = rgba('92,40,180', .7 * armour); c.strokeStyle = rgba('214,180,255', .9 * armour); c.lineWidth = 2;
    c.beginPath(); c.moveTo(-34, -148); c.lineTo(34, -148); c.lineTo(26, -112); c.lineTo(0, -104); c.lineTo(-26, -112); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = rgba('234,128,252', .85 * armour); c.fillRect(-4, -140, 8, 22);
    for (const [hx, hy] of [[-74, -58], [92, -70]]) { c.fillStyle = rgba('110,56,200', .85 * armour); c.fillRect(hx - 9, hy - 9, 18, 16); c.strokeRect(hx - 9, hy - 9, 18, 16); }
    // Skull helm with horns and burning eyes.
    c.fillStyle = bone + (.92 * bones) + ')';
    c.beginPath(); c.ellipse(0, -176, 22, 24, 0, 0, TAU); c.fill();
    c.fillRect(-14, -160, 28, 14);
    c.fillStyle = rgba('40,8,70', .9 * bones);
    c.fillRect(-13, -182, 9, 8); c.fillRect(4, -182, 9, 8);
    c.fillStyle = rgba('255,236,255', bones * (.8 + .2 * Math.sin(t * 10)));
    c.fillRect(-10, -180, 4, 4); c.fillRect(7, -180, 4, 4);
    c.strokeStyle = rgba('40,8,70', .8 * bones); c.lineWidth = 1.5;
    for (let i = -10; i <= 10; i += 5) { c.beginPath(); c.moveTo(i, -158); c.lineTo(i, -148); c.stroke(); }
    // Helm plates and horns (armour stage).
    c.fillStyle = rgba('110,56,200', .8 * armour); c.strokeStyle = rgba('214,180,255', .95 * armour); c.lineWidth = 2;
    c.beginPath(); c.moveTo(-24, -184); c.quadraticCurveTo(0, -214, 24, -184); c.lineTo(18, -176); c.lineTo(-18, -176); c.closePath(); c.fill(); c.stroke();
    for (const side of [-1, 1]) {
      c.beginPath(); c.moveTo(side * 18, -194); c.quadraticCurveTo(side * 44, -206, side * 40, -236); c.quadraticCurveTo(side * 34, -210, side * 12, -200); c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
  });
}

// ── Ninefold Beast Form: flame fox spirit ────────────────────────────────
export function drawNinefoldSpirit(ctx, x, feetY, facing, t, age, fade, layer = 'back', { lean = 0, bob = 0 } = {}) {
  if (fade <= 0) return;
  const grow = clamp01(age / .45);
  renderPixelated(ctx, pixelSize(ctx), (c) => {
    c.save();
    c.translate(x, feetY);
    c.scale(facing, 1);
    if (layer === 'front') {
      // Claw marks of flame in front of the leading hand.
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = rgba('255,213,79', .7 * fade); c.lineWidth = 3; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const y = -52 + i * 6; const swipe = Math.sin(t * 8) * 3;
        c.beginPath(); c.moveTo(18, y - 8); c.quadraticCurveTo(30 + swipe, y - 2, 26, y + 10); c.stroke();
      }
      c.restore();
      return;
    }
    // Nine tapered flame tails fanning out behind (solid, outlined).
    for (let i = 0; i < 9; i++) {
      // Fan from straight up-back (95°) to back-down (191°), y pointing up.
      // Running streams the tails back and flat behind the Wizard.
      const run = Math.max(0, lean);
      const base = (62 + i * 16.5 + run * (30 - i * 2)) * Math.PI / 180;
      const len = (92 + (i % 3) * 16) * (.35 + .65 * grow);
      const pts = [];
      const segs = 12;
      let px = -10; let py = -38;
      for (let s = 0; s <= segs; s++) {
        const f = s / segs;
        // Each tail curls upward towards its tip and sways on its own beat.
        const ang = base - .55 * f * (1 - run * .6) + Math.sin(t * (3 + run * 5) + i * .8 + f * 3) * (.25 + run * .2) * f + bob * .08 * f;
        if (s) { px += Math.cos(ang) * len / segs; py -= Math.sin(ang) * len / segs; }
        pts.push({ x: px, y: py, w: (15 * (1 - f) + 2) * (.6 + .4 * grow) });
      }
      // Build the tail outline from both sides of the centre line.
      const left = []; const right = [];
      for (let s = 0; s < pts.length; s++) {
        const a = pts[Math.max(0, s - 1)]; const b = pts[Math.min(pts.length - 1, s + 1)];
        const dx = b.x - a.x; const dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l; const ny = dx / l;
        left.push({ x: pts[s].x + nx * pts[s].w, y: pts[s].y + ny * pts[s].w });
        right.push({ x: pts[s].x - nx * pts[s].w, y: pts[s].y - ny * pts[s].w });
      }
      const outline = [...left, ...right.reverse()];
      const tip = pts[pts.length - 1];
      const g = c.createLinearGradient?.(pts[0].x, pts[0].y, tip.x, tip.y);
      if (g) { g.addColorStop(0, rgba('230,74,25', .82 * fade)); g.addColorStop(.55, rgba('255,160,0', .85 * fade)); g.addColorStop(1, rgba('255,241,118', .9 * fade)); c.fillStyle = g; }
      else c.fillStyle = rgba('255,152,0', .8 * fade);
      c.beginPath(); outline.forEach((p, k) => (k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill();
      c.strokeStyle = rgba('120,30,10', .75 * fade); c.lineWidth = 2; c.stroke();
      // A bright inner streak gives each tail volume.
      c.strokeStyle = rgba('255,236,179', .6 * fade); c.lineWidth = 2;
      c.beginPath(); pts.slice(2).forEach((p, k) => (k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
      // Flickering flame at the tip.
      c.fillStyle = rgba('255,253,231', .8 * fade);
      c.beginPath(); c.moveTo(tip.x - 4, tip.y); c.lineTo(tip.x + Math.sin(t * 14 + i) * 4, tip.y - 10 - hash(Math.floor(t * 10) + i) * 6); c.lineTo(tip.x + 4, tip.y); c.closePath(); c.fill();
    }
    // Flame cloak around the shoulders and back.
    c.fillStyle = rgba('255,112,67', .32 * fade);
    c.beginPath(); c.moveTo(-26, -8);
    for (let i = 0; i <= 10; i++) { const f = i / 10; c.lineTo(-26 + f * 44 - lean * 10 * (1 - f), -78 - Math.sin(f * Math.PI) * 10 - Math.sin(t * 10 + i) * 5); }
    c.lineTo(18, -8); c.closePath(); c.fill();
    // Fox spirit head above the Wizard: ears, snout, burning eyes.
    const hy = -118 - Math.sin(t * 2.2) * 3 - Math.abs(bob) * 4 * Math.abs(lean); const hs = .55 + .45 * grow;
    c.save(); c.translate(-2 - lean * 14, hy); c.scale(hs, hs); c.rotate(-lean * .12);
    c.fillStyle = rgba('255,138,61', .5 * fade);
    c.beginPath();
    c.moveTo(-26, 4); c.lineTo(-22, -26); c.lineTo(-30, -60); c.lineTo(-8, -32); c.lineTo(8, -32); c.lineTo(28, -62); c.lineTo(22, -24); c.lineTo(46, -6); c.lineTo(52, 2); c.lineTo(30, 10); c.lineTo(0, 16); c.closePath(); c.fill();
    c.strokeStyle = rgba('150,40,10', .7 * fade); c.lineWidth = 2; c.stroke();
    c.fillStyle = rgba('255,224,130', .55 * fade);
    c.beginPath(); c.moveTo(-24, -30); c.lineTo(-27, -52); c.lineTo(-13, -33); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(14, -32); c.lineTo(25, -54); c.lineTo(21, -28); c.closePath(); c.fill();
    c.fillStyle = rgba('255,253,231', (.8 + .2 * Math.sin(t * 9)) * fade);
    c.beginPath(); c.moveTo(4, -14); c.lineTo(20, -18); c.lineTo(14, -10); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-14, -14); c.lineTo(-2, -16); c.lineTo(-6, -9); c.closePath(); c.fill();
    c.restore();
    c.restore();
  });
}
