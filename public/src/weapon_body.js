// GRIMGE Prototype — the body moves with the weapon (user, 21 Oct 2026: "Charakter-Animation je
// Waffe": the figure itself should move differently per weapon, not only the effects / the weapon).
// The heroes are single pixel sprites, so the motion is a procedural body pose (lean, shift,
// squash) layered on top of the weapon's swing motion (weapons.js MOTIONS):
//   hammer / slam   raise high on the toes, then crash down into a crouch
//   blade arcs      wind back, then twist through the cut
//   spear thrusts   step back, then lunge forward with the reach
//   katana iai      crouch low, then dash through the draw
//   whirl / spin    the body turns once (the sprite flips through)
//   bow draw        lean back into the draw, a kick on release; crossbow recoil
//   caster          rise on the cast, lean into the point; harp sways
//   fists           shoulder into the punch, the uppercut rises
// Idle / run stances per weapon weight: heavy weapons hunch and run heavier, bows stand back,
// polearms lean in. Returns { rot (degrees), ox, oy, sx, sy, cadence } or null (bare hands).
import { WEAPONS, weaponSwing } from './weapons.js';

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const span = (p, a, b) => clamp01((p - a) / (b - a));
const TAU = Math.PI * 2;

// Weight class of a weapon for the idle / run stance.
const HEAVY_LOOKS = new Set(['hammer', 'greataxe', 'greatsword', 'maul', 'odachi']);
const POLE_LOOKS = new Set(['spear', 'glaive', 'halberd', 'staff', 'scythe', 'twinblade', 'trident']);
const RANGED_LOOKS = new Set(['bow', 'crossbow', 'knife']);
export function weaponStanceOf(id) {
  const w = WEAPONS[id]; if (!w) return null;
  const look = w.look ?? id;
  if (HEAVY_LOOKS.has(look) || /hammer|axe|great|maul|odachi/.test(id)) return 'heavy';
  if (w.family && /Arcanist|Occultist|Oracle|Resonant|Fateweaver/.test(w.family)) return 'caster';
  if (POLE_LOOKS.has(look) || /spear|glaive|halberd|scythe|lance|staff/.test(id)) return 'pole';
  if (RANGED_LOOKS.has(look) || /bow/.test(id)) return 'ranged';
  if (w.family && /Monk|Beastborn/.test(w.family)) return 'fist';
  return 'blade';
}

// Body pose for one swing motion at progress p (f = facing).
function motionPose(motion, p, pose, f) {
  const o = { rot: 0, ox: 0, oy: 0, sx: 1, sy: 1 };
  switch (motion) {
    case 'overhead': case 'slam': {
      // Raise the weapon high (lean back, up on the toes), then crash down into a crouch.
      const up = span(p, 0, .35); const down = span(p, .35, .55); const settle = span(p, .7, 1);
      if (down <= 0) { o.rot = -f * 12 * up; o.oy = -6 * up; o.sy = 1 + .06 * up; o.sx = 1 - .04 * up; }
      else { const d = ease(down) * (1 - settle); o.rot = f * (-12 + 26 * ease(down)) * (1 - settle); o.oy = (-6 + 14 * ease(down)) * (1 - settle); o.sy = 1 + .06 - .16 * d - .06 * (1 - settle) * (1 - d); o.sx = 1 + .12 * d; o.ox = f * 6 * d; }
      break;
    }
    case 'smash': {
      // Heavy forward smash: weight back, then the whole body drives in.
      const back = span(p, 0, .3); const out = span(p, .3, .5); const ret = span(p, .75, 1);
      o.ox = f * (-6 * back * (1 - out) + 14 * ease(out) * (1 - ret)); o.rot = f * (-8 * back * (1 - out) + 12 * ease(out) * (1 - ret)); o.sx = 1 + .1 * ease(out) * (1 - ret); o.sy = 1 - .06 * ease(out) * (1 - ret);
      break;
    }
    case 'slash': case 'backhand': case 'rising': case 'cleave': case 'reap': case 'fan': case 'rake': case 'cross': {
      // Wind back, then twist the torso through the cut.
      const k = ease(p * 1.3); const wide = motion === 'cleave' || motion === 'reap';
      o.rot = f * (-8 + 18 * k) * (wide ? 1.4 : 1); o.ox = f * (-3 + 9 * k); o.sx = 1 + .05 * Math.sin(p * Math.PI); o.oy = motion === 'rising' ? -6 * k : 0;
      break;
    }
    case 'thrust': case 'lunge': case 'stab': case 'whip': case 'pull': {
      // Step back, then lunge with the reach of the weapon.
      const reach = pose?.reach ?? 0; const long = motion === 'lunge';
      o.ox = f * reach * (long ? .45 : .35); o.rot = f * Math.max(-6, Math.min(10, reach * .25)); o.sx = 1 + Math.max(0, reach) * .002; o.oy = Math.max(0, reach) * .06;
      break;
    }
    case 'iaido': {
      // Crouch low with the hand on the hilt, then dash through the draw.
      const crouch = span(p, 0, .12); const dash = span(p, .12, .3); const rise = span(p, .5, 1);
      o.oy = 7 * crouch * (1 - dash * .6) * (1 - rise); o.sy = 1 - .1 * crouch * (1 - rise); o.sx = 1 + .08 * crouch * (1 - rise);
      o.ox = f * 16 * ease(dash) * (1 - rise); o.rot = f * 16 * ease(dash) * (1 - rise);
      break;
    }
    case 'whirl': case 'spin': {
      // The body turns once with the weapon: the sprite flips through its edge.
      const turns = motion === 'whirl' ? 1.2 : .8; const c = Math.cos(clamp01(p * 1.1) * TAU * turns); // even turn speed: the flip is visible mid-swing
      o.sx = Math.sign(c || 1) * Math.max(.2, Math.abs(c)); o.oy = -3 * Math.sin(p * Math.PI);
      break;
    }
    case 'draw': {
      // Lean back into the draw, square the shoulders; a kick on the release.
      const pull = span(p, 0, .55); const loose = span(p, .55, .7); const ret = span(p, .7, 1);
      o.rot = -f * 8 * pull * (1 - loose); o.ox = -f * (5 * pull * (1 - loose) + 7 * loose * (1 - ret)); o.sx = 1 + .05 * pull * (1 - loose); o.sy = 1 + .02 * pull * (1 - loose);
      break;
    }
    case 'aim': { const kick = span(p, .3, .5); const ret = span(p, .5, 1); o.ox = -f * 7 * kick * (1 - ret); o.rot = -f * 6 * kick * (1 - ret); break; }
    case 'throw': { const wind = span(p, 0, .3); const out = span(p, .3, .5); const ret = span(p, .7, 1); o.rot = f * (-12 * wind * (1 - out) + 14 * ease(out) * (1 - ret)); o.ox = f * (-4 * wind * (1 - out) + 8 * ease(out) * (1 - ret)); break; }
    case 'cast': { const raise = span(p, 0, .35); const point = span(p, .35, .55); const ret = span(p, .75, 1); o.oy = -5 * raise * (1 - ret); o.sy = 1 + .05 * raise * (1 - ret); o.rot = f * 8 * ease(point) * (1 - ret); o.ox = f * 4 * ease(point) * (1 - ret); break; }
    case 'strum': o.rot = Math.sin(p * TAU * 1.5) * 5; o.oy = -2 * Math.sin(p * Math.PI); break;
    case 'flick': { const out = span(p, .2, .45); o.rot = f * 7 * ease(out) * (1 - span(p, .6, 1)); break; }
    case 'punch': case 'flurry': {
      const reach = pose?.reach ?? 0; o.ox = f * reach * .3; o.rot = f * Math.min(8, reach * .3); o.sx = 1 + reach * .002;
      break;
    }
    case 'upper': { const out = span(p, 0, .4); o.oy = -12 * ease(out); o.rot = -f * 12 * ease(out); o.sy = 1 + .08 * ease(out); o.sx = 1 - .04 * ease(out); break; }
    case 'bash': { const reach = pose?.shieldReach ?? 0; o.ox = f * reach * .45; o.rot = f * reach * .3; o.sx = 1 + reach * .003; break; }
    default: { const k = ease(p * 1.3); o.rot = f * (-6 + 12 * k); break; }
  }
  return o;
}

// The weapon stance while idle / running (t = anim time). The idle breathing bob is kept.
function stancePose(stance, state, t, f) {
  const breathe = Math.sin(t * 3);
  const o = { rot: 0, ox: 0, oy: breathe * 2, sx: 1 - breathe * .015, sy: 1 + breathe * .025 };
  if (state === 'run') {
    o.oy = 0; o.sx = 1; o.sy = 1;
    if (stance === 'heavy') { o.rot = f * 8; o.oy = Math.abs(Math.sin(t * 7)) * 3; o.sy = .97; o.cadence = .85; }
    else if (stance === 'pole') o.rot = f * 6;
    else if (stance === 'ranged') o.rot = f * 3;
    else o.rot = f * 4;
    return o;
  }
  if (state !== 'idle') return null;
  if (stance === 'heavy') { o.rot = f * 3; o.sy *= .975; o.sx *= 1.02; o.oy += 1; }
  else if (stance === 'pole') { o.rot = f * 3; o.ox = -f * 2; }
  else if (stance === 'ranged') { o.rot = -f * 2; o.ox = -f * 2; }
  else if (stance === 'caster') { o.oy -= 1.5 + Math.sin(t * 1.6) * 1.5; } // a faint hover
  else if (stance === 'fist') { o.sy *= .985; o.rot = f * 2; }
  return o;
}

export function weaponBodyPose(p) {
  const id = p?.weapon ?? p?.classWeapon; if (!id || !WEAPONS[id]) return null;
  const f = p.facing || 1;
  const sw = weaponSwing(p, id);
  if (sw.swinging) return motionPose(sw.motion, clamp01(sw.progress), sw.pose, f);
  if (!p.grounded) return null;
  return stancePose(weaponStanceOf(id), p.state, p.animTime ?? 0, f);
}
