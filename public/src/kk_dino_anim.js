// GRIMGE Prototype — animated dino-dragons (Kronenkrieg tier 4 / wild). Walk and attack sheets made from the user's
// bestiary sprites (Higgsfield, 21 Nov 2026): 8 frames side by side, facing left like the stills, one shared crop box per
// creature so walk and attack line up. DINO_ANIM holds per element the frame size and the walking body's box inside a
// frame: the renderer scales the body to the unit's height and stands it on its feet at the unit's position.
import { ART_PX } from './world.js';
export const DINO_ANIM = Object.freeze(/*META*/{"ignis":{"frames":8,"fw":246,"fh":156,"bx":6,"by":1,"bw":240,"bh":155},"ventus":{"frames":8,"fw":236,"fh":130,"bx":2,"by":0,"bw":231,"bh":125},"fulgur":{"frames":8,"fw":240,"fh":162,"bx":7,"by":15,"bw":233,"bh":131},"terra":{"frames":8,"fw":245,"fh":154,"bx":5,"by":0,"bw":238,"bh":145},"aqua":{"frames":8,"fw":244,"fh":154,"bx":1,"by":1,"bw":240,"bh":152},"frost":{"frames":8,"fw":242,"fh":154,"bx":0,"by":0,"bw":242,"bh":154},"bestia":{"frames":8,"fw":244,"fh":168,"bx":1,"by":0,"bw":243,"bh":168},"construct":{"frames":8,"fw":249,"fh":159,"bx":0,"by":5,"bw":249,"bh":147},"void":{"frames":8,"fw":240,"fh":173,"bx":0,"by":8,"bw":240,"bh":158},"lux":{"frames":8,"fw":244,"fh":176,"bx":1,"by":15,"bw":239,"bh":161},"natura":{"frames":8,"fw":244,"fh":176,"bx":7,"by":6,"bw":237,"bh":168},"ward":{"frames":8,"fw":249,"fh":177,"bx":5,"by":0,"bw":244,"bh":177},"umbra":{"frames":8,"fw":241,"fh":157,"bx":2,"by":0,"bw":239,"bh":157}}/*END*/);
export const DINO_ATTACK_TIME = .6; /* seconds the strike sheet plays */
const WALK_FPS = 10;
const SHEETS = new Map();
function sheet(el, kind) {
  const key = el + '_' + kind; if (SHEETS.has(key)) return SHEETS.get(key);
  const I = globalThis.Image; const im = typeof I === 'function' ? new I() : null;
  if (im) im.src = `assets/creatures/dinodragons/anim/${key}.png`; SHEETS.set(key, im); return im;
}
const ready = (im) => !!im && im.complete && (im.naturalWidth || im.width) > 0;
// Which sheet and frame a dino-dragon shows now: the strike after an attack or its signature, the walk while it moves,
// the first walk frame while it stands.
export function dinoPose(u) {
  const since = (u.animTime ?? 0) - (u.atkStart ?? -99);
  if (since >= 0 && since < DINO_ATTACK_TIME) return { kind: 'attack', frame: Math.min(7, Math.floor(since / DINO_ATTACK_TIME * 8)) };
  if (u.state === 'run') return { kind: 'walk', frame: Math.floor((u.animTime ?? 0) * WALK_FPS) % 8 };
  return { kind: 'walk', frame: 0 };
}
// Draws the body (shadow included) with h = the body height on screen, f = facing. False while the sheets load or for
// a creature without sheets — the caller then draws the still.
export function drawDinoAnim(ctx, u, h, f) {
  const el = u.rec?.dino; const M = DINO_ANIM[el]; if (!M) return false;
  const pose = dinoPose(u); let im = sheet(el, pose.kind);
  if (!ready(im)) { im = sheet(el, 'walk'); pose.frame = 0; if (!ready(im)) return false; }
  const k = ART_PX * (h >= 150 ? 1.25 : 1); /* the one art-pixel size (world.js); wild / boss dino-dragons a quarter bigger */ const bob = pose.kind === 'walk' && u.state !== 'run' ? Math.sin((u.animTime ?? 0) * 2.5) * 1.5 : 0;
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(u.x, u.y + 2, M.bw * k * .4, 9, 0, 0, Math.PI * 2); ctx.fill();
  if (u.hitFlash > 0) ctx.globalAlpha = .7;
  ctx.translate(Math.round(u.x), Math.round(u.y + bob)); if (f > 0) ctx.scale(-1, 1); ctx.imageSmoothingEnabled = false; /* hard pixels (user: nothing soft) */
  ctx.drawImage(im, pose.frame * M.fw, 0, M.fw, M.fh, -(M.bx + M.bw / 2) * k, -(M.by + M.bh) * k, M.fw * k, M.fh * k);
  ctx.restore(); return true;
}
