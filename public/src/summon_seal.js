// GRIMGE Prototype — the summoning seal (user, 17 Nov 2026: "bei Beschwörungen soll unter der Kreatur ein Zauberzirkel
// erscheinen und der Charakter soll die Hand auf den Boden legen" — the classic palm-on-the-ground summoning). Two parts:
//   • SummonSeal: a ground decal under the creature — dark seal lines race from the caster's hand across the floor, close
//     into a ring with a star inside, white sparks pop at its corners, the ring glows in the creature's colour and fades;
//   • beginSummonPose: the caster kneels with one palm on the ground (the rig clip 'summon', rig_clips.js) for a moment.
// Pure presentation: nothing here changes a summon's rules.
import { groundYForDepth } from './world.js';

const TAU = Math.PI * 2;
const SQUASH = .32; // the ground ellipse of the 2.5D floor
export const SEAL = Object.freeze({ spread: .45, ring: .9, glow: 1.7, end: 2.3, radius: 46, pose: .8 });
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rnd = (seed, n) => { const s = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); };

export class SummonSeal {
  // x, z: where the creature stands; owner: the caster (its hand is where the lines start); color: the creature's colour.
  constructor(x, z, color, owner = null, { radius = SEAL.radius } = {}) {
    this.x = x; this.z = z; this.color = color ?? '#b388ff'; this.owner = owner; this.R = radius; this.t = 0; this.isFinished = false;
    this.isGroundDecal = true; this.fineVfx = true; this.seed = Math.round(x * 7 + z * 131);
  }
  get y() { return groundYForDepth(this.z); }
  update(dt) { this.t += dt; if (this.t >= SEAL.end) this.isFinished = true; }
  render(ctx) {
    const { x, t, R, color } = this; const y = groundYForDepth(this.z);
    const o = this.owner; const hx = o ? o.x + (o.facing || 1) * 28 : x - 60; const hy = o ? groundYForDepth(o.z ?? this.z) : y;
    const fade = 1 - clamp01((t - SEAL.glow) / (SEAL.end - SEAL.glow));
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const line = (pts, width, a) => { ctx.globalAlpha = a * fade; ctx.strokeStyle = '#0a0a12'; ctx.lineWidth = width; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); ctx.globalAlpha = a * fade * .85; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, width - 2); ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py + 0) : ctx.moveTo(px, py + 0))); ctx.stroke(); };
    // 1. seal lines race from the hand across the floor toward the creature (jagged, like drawn chains)
    const spread = clamp01(t / SEAL.spread);
    for (let l = 0; l < 5; l++) {
      const tx = x + (rnd(this.seed, l) - .5) * R * 1.5; const ty = y + (rnd(this.seed, l + 9) - .5) * R * SQUASH * 2.2; const pts = [[hx, hy]];
      const n = 7; for (let i = 1; i <= Math.round(n * spread); i++) { const u = i / n; pts.push([hx + (tx - hx) * u + (rnd(this.seed, l * 20 + i) - .5) * 8, hy + (ty - hy) * u + (rnd(this.seed, l * 30 + i) - .5) * 5]); }
      if (pts.length > 1) line(pts, 3, .8);
    }
    // 2. the ring and the star close around the creature
    const ringK = clamp01((t - SEAL.spread * .6) / (SEAL.ring - SEAL.spread * .6)); const spin = t * .5;
    if (ringK > 0) {
      const ring = []; const steps = Math.max(2, Math.round(40 * ringK)); for (let i = 0; i <= steps; i++) { const a = -Math.PI / 2 + i / 40 * TAU; ring.push([x + Math.cos(a) * R, y + Math.sin(a) * R * SQUASH]); } line(ring, 3, .9);
      const inner = []; for (let i = 0; i <= steps; i++) { const a = -Math.PI / 2 + i / 40 * TAU; inner.push([x + Math.cos(a) * R * .72, y + Math.sin(a) * R * .72 * SQUASH]); } line(inner, 2, .55);
      // a six-pointed star inside, drawn corner by corner
      const pts = Array.from({ length: 6 }, (_, i) => { const a = spin + i / 6 * TAU - Math.PI / 2; return [x + Math.cos(a) * R * .72, y + Math.sin(a) * R * .72 * SQUASH]; });
      const drawn = Math.round(6 * ringK); for (let i = 0; i < drawn; i++) { const a = pts[i]; const b = pts[(i + 2) % 6]; line([a, b], 2, .8); }
    }
    // 3. white sparks pop at the star's corners, then the ring glows in the creature's colour
    const popK = clamp01((t - SEAL.ring * .8) / .5);
    if (popK > 0) for (let i = 0; i < 6; i++) {
      const a = spin + i / 6 * TAU - Math.PI / 2; const sx = x + Math.cos(a) * R * .72; const sy = y + Math.sin(a) * R * .72 * SQUASH; const h = (10 + 8 * rnd(this.seed, i)) * Math.sin(Math.min(1, popK) * Math.PI) * fade;
      if (h < 1) continue; ctx.globalAlpha = fade; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(sx - 3, sy); ctx.lineTo(sx, sy - h); ctx.lineTo(sx + 3, sy); ctx.lineTo(sx + 1, sy - h * .3); ctx.lineTo(sx - 4, sy - 2); ctx.closePath(); ctx.fill();
    }
    if (t > SEAL.ring * .7) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (.12 + .1 * Math.sin(t * 7)) * fade; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, R, R * SQUASH, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}

// The caster kneels with a palm on the ground: the rig clip 'summon' while summonPoseT runs. Purely visual — nothing locks the
// caster; as soon as it walks or acts the pose gives way (entities.js plays it only for a standing figure).
export function beginSummonPose(caster) { if (caster) caster.summonPoseT = SEAL.pose; }
