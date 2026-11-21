// GRIMGE Prototype — animated Primals (wolf, turtle, ape, dragon) in their three growth stages (user, 21 Nov 2026: Primals
// "in den 3 Entwicklungsstufen mit Animationen", fierce not cute, hard pixels). Walk/fly + attack sheets from Higgsfield,
// built with art/authoring/gif_sheets.cjs: 8 frames side by side, facing left, one shared crop box per stage so walk and
// attack line up. PRIMAL_ANIM: per <archetype><stage> the frame size and the moving body's box inside a frame.
export const PRIMAL_ANIM = Object.freeze(/*META*/{"wolf1":{"frames":{"walk":8,"attack":8},"fw":78,"fh":44,"bx":3,"by":0,"bw":75,"bh":44},"wolf2":{"frames":{"walk":8,"attack":8},"fw":112,"fh":78,"bx":2,"by":1,"bw":107,"bh":76},"wolf3":{"frames":{"walk":8,"attack":8},"fw":175,"fh":127,"bx":4,"by":2,"bw":170,"bh":125},"turtle1":{"frames":{"walk":8,"attack":8},"fw":63,"fh":39,"bx":2,"by":0,"bw":61,"bh":39},"turtle2":{"frames":{"walk":8,"attack":8},"fw":103,"fh":75,"bx":5,"by":0,"bw":97,"bh":73},"turtle3":{"frames":{"walk":8,"attack":8},"fw":175,"fh":137,"bx":7,"by":5,"bw":165,"bh":130},"ape1":{"frames":{"walk":8,"attack":8},"fw":69,"fh":52,"bx":1,"by":1,"bw":68,"bh":51},"ape2":{"frames":{"walk":8,"attack":8},"fw":117,"fh":88,"bx":0,"by":2,"bw":117,"bh":86},"ape3":{"frames":{"walk":8,"attack":8},"fw":189,"fh":152,"bx":0,"by":2,"bw":189,"bh":146},"dragon1":{"frames":{"walk":8,"attack":8},"fw":69,"fh":59,"bx":4,"by":2,"bw":65,"bh":57},"dragon2":{"frames":{"walk":8,"attack":8},"fw":126,"fh":98,"bx":2,"by":0,"bw":122,"bh":97},"dragon3":{"frames":{"walk":8,"attack":8},"fw":213,"fh":159,"bx":14,"by":0,"bw":199,"bh":157}}/*END*/);
import { ART_PX } from './world.js';
// The sheets are native art pixels (gif_sheets.cjs hNNN): drawn at ART_PX they show the characters' pixel size; a rider on
// a young Primal swells it to riding size (whole-pixel steps).
export const PRIMAL_ATTACK_TIME = .5;
const SHEETS = new Map();
function sheet(key) {
  if (SHEETS.has(key)) return SHEETS.get(key); const I = globalThis.Image; const im = typeof I === 'function' ? new I() : null;
  if (im) im.src = `assets/creatures/primals/anim/${key}.png`; SHEETS.set(key, im); return im;
}
const ready = (im) => !!im && im.complete && (im.naturalWidth || im.width) > 0;
// The pose: the strike while an attack / breath is on, the walk (fly) while moving, the first frame while standing.
export function primalPose(p) {
  const striking = !!p.attack || (p.breathT ?? 0) > 0;
  if (striking && !(p.atkStart >= 0 && p.animTime - p.atkStart < PRIMAL_ATTACK_TIME)) p.atkStart = p.animTime;
  if (!striking && p.atkStart >= 0 && p.animTime - p.atkStart >= PRIMAL_ATTACK_TIME) p.atkStart = -1;
  const since = p.atkStart >= 0 ? p.animTime - p.atkStart : -1;
  if (since >= 0 && since < PRIMAL_ATTACK_TIME) return { kind: 'attack', frame: Math.min(7, Math.floor(since / PRIMAL_ATTACK_TIME * 8)) };
  if (p.state === 'run' || p.archetype === 'dragon') return { kind: 'walk', frame: Math.floor((p.animTime ?? 0) * 10) % 8 }; /* the dragon always beats its wings */
  return { kind: 'walk', frame: 0 };
}
export const primalScale = (p) => ART_PX * (p.rider && (p.stage ?? 1) < 3 ? 1.5 : 1);
// Draws the body; false while loading or without sheets (the caller draws its fallback).
export function drawPrimalAnim(ctx, p) {
  const key = p.archetype + (p.stage ?? 1); const M = PRIMAL_ANIM[key]; if (!M) return false;
  const pose = primalPose(p); let im = sheet(key + '_' + pose.kind);
  if (!ready(im)) { im = sheet(key + '_walk'); pose.frame = 0; if (!ready(im)) return false; }
  const k = primalScale(p); const f = p.facing || 1;
  ctx.save(); if (p.hitFlash > 0) ctx.globalAlpha = .7;
  ctx.translate(Math.round(p.x), Math.round(p.y)); if (f > 0) ctx.scale(-1, 1); ctx.imageSmoothingEnabled = false; /* hard pixels */
  ctx.drawImage(im, pose.frame * M.fw, 0, M.fw, M.fh, -(M.bx + M.bw / 2) * k, -(M.by + M.bh) * k, M.fw * k, M.fh * k);
  ctx.restore(); return true;
}
