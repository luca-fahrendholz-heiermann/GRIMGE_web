// GRIMGE Prototype — the hub figure (user, 11 Nov 2026): the hub stays the start screen and shows the player's own
// character as it is equipped — its figure, its look and the weapon of the class in use — walking on the spot. With
// this character one then walks into the base (base.js). A small canvas at game scale replaces the still picture; it is
// scaled up without smoothing so the figure looks exactly like in a match.
import { sprites } from './sprites.js';
import { drawHeldWeapon } from './weapons.js';
import { classById, classOfWeapon } from './classes.js';

const W = 150; const H = 116; const FOOT_X = 75; const FOOT_Y = 112;
let fig = null;

// What the hub shows: the created character, otherwise the figure picked in the hub.
export function hubFigureOf(profile, selectedHero) {
  const ch = profile?.character; const created = !!ch?.created;
  /* The figure that really plays: the one picked in the hub (creation sets it to the character's own figure). */
  const base = selectedHero ?? ch?.base;
  const weapon = profile?.classWeapon ?? null;
  const cls = classById(ch?.classId) ?? classOfWeapon(weapon);
  return { base, look: created && ch.base === base ? ch.look : null, weapon, name: created && ch.name ? ch.name.toUpperCase() : null, className: created && cls ? cls.name.toUpperCase() : null };
}

function draw() {
  if (!fig) return;
  fig.raf = requestAnimationFrame(draw);
  const { canvas, ctx, who } = fig;
  if (!canvas.offsetParent) return; /* the hub is hidden (a match runs) */
  const key = who.look ? sprites.lookKey(who.base, who.look) : who.base;
  const spr = sprites.sprites[key];
  if (!spr) return;
  const t = (performance.now() - fig.t0) / 1000;
  ctx.clearRect(0, 0, W, H); ctx.imageSmoothingEnabled = false;
  // Armed rig figures have their own clips with the weapon hand (sprites.js: arm: before rig:).
  let state = 'walk';
  if (who.weapon && spr.frames?.[`arm:${state}`]) state = `arm:${state}`; else if (who.weapon && spr.frames?.[`rig:${state}`]) state = `rig:${state}`;
  const body = fig.body; body.classWeapon = who.weapon; body.animTime = t;
  const weapon = (layer) => { if (!who.weapon || fig.noWeapon) return; ctx.save(); try { drawHeldWeapon(ctx, body, FOOT_Y, layer); } catch { fig.noWeapon = true; } ctx.restore(); };
  weapon('back');
  const toHand = (pl, h) => { if (!h) return null; const lx = h.x - pl.frame.anchorX; const ly = h.y - pl.frame.anchorY; const c = Math.cos(pl.rot); const s = Math.sin(pl.rot); return { x: pl.x + pl.kx * (lx * c - ly * s) - FOOT_X, y: pl.y + pl.ky * (lx * s + ly * c) - FOOT_Y }; };
  sprites.renderEntity(ctx, key, FOOT_X, FOOT_Y, { facing: 1, state, animTime: t, onPlace: (pl) => { const front = toHand(pl, pl.frame.hand); const rear = toHand(pl, pl.frame.handBack); body._rigHands = front && rear ? { front, rear } : null; } });
  weapon('front');
}

// Called from ui.renderHub: (re)starts the figure for the current character. Returns false without a usable canvas.
export function syncHubFigure(profile, selectedHero, still = null) {
  const doc = globalThis.document;
  const host = still?.parentNode;
  if (!host || typeof doc?.createElement !== 'function' || typeof host.insertBefore !== 'function' || typeof requestAnimationFrame !== 'function') return false;
  if (!fig) {
    const canvas = doc.createElement('canvas'); const ctx = canvas.getContext?.('2d');
    if (!ctx) return false;
    canvas.id = 'hub-hero-canvas'; canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'height:100%;width:auto;max-width:none;aspect-ratio:150/116;image-rendering:pixelated;filter:drop-shadow(0 12px 7px rgba(0,0,0,.7)) drop-shadow(0 0 14px rgba(86,219,255,.22))';
    host.insertBefore(canvas, still);
    fig = { canvas, ctx, who: null, t0: performance.now(), raf: 0, noWeapon: false, body: { x: FOOT_X, facing: 1, state: 'walk', stateTimer: 0, _rigHands: null } };
    fig.raf = requestAnimationFrame(draw);
  }
  fig.who = hubFigureOf(profile, selectedHero); fig.noWeapon = false; fig.body._rigHands = null;
  if (still.style) still.style.display = 'none';
  return true;
}
