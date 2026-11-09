// GRIMGE Prototype — parts rig (AGENDA 1, stage 2: "Mischform zum Testen"; user, 10 Nov 2026).
// The hero is one standing pixel image. The rig cuts it into parts (head, torso, arms, legs) along polygons, each with a
// pivot and a parent, poses the parts per keyframe (rig_clips.js) and bakes whole frames at load: crisp nearest-neighbour
// pixels, a finite set of frames, so every existing frame path (tint, recolour, contour paint, flash) keeps working.
// Placeholder for testing: the final animations will be made by the user (drawn / AI-generated sheets replace these).
// Everything here works on plain RGBA arrays ({ w, h, data }), so the same code runs in the browser and in node tools.

// Thesen (char_thesen.png, 82×123). Coordinates in source pixels; parts claim pixels in `claim` order (first polygon
// that contains a pixel wins), are drawn in `draw` order. Angles: positive = the limb's far end swings forward
// (toward the facing direction); the baker turns that into canvas rotation.
export const RIGS = Object.freeze({
  thesen: Object.freeze({
    w: 82, h: 123,
    parts: Object.freeze({
      head: { parent: 'torso', pivot: [42, 44], poly: [[28, 4], [57, 4], [57, 27], [51, 33], [50, 46], [34, 46], [32, 33], [28, 27]] },
      padF: { parent: 'torso', pivot: [52, 44], poly: [[49, 16], [70, 16], [70, 47], [56, 47], [49, 40]] },
      torso: { parent: 'pelvis', pivot: [42, 64], poly: [[2, 16], [35, 16], [35, 40], [56, 40], [56, 47], [54, 47], [54, 64], [27, 64], [27, 50], [2, 53]] },
      armFU: { parent: 'torso', pivot: [57, 51], poly: [[53.5, 46], [66, 46], [66, 64], [53.5, 64]] },
      armFL: { parent: 'armFU', pivot: [59, 64], poly: [[55.5, 64], [67, 64], [67, 84], [55.5, 84]] },
      armBU: { parent: 'torso', pivot: [24, 53], poly: [[9, 50], [27.5, 50], [27.5, 63], [9, 63]] },
      armBL: { parent: 'armBU', pivot: [19, 63], poly: [[9, 63], [26.5, 63], [26.5, 88], [9, 88]] },
      pelvis: { parent: null, pivot: [42, 80], poly: [[22, 60], [63, 60], [63, 85], [53, 85], [53, 90], [32, 90], [32, 85], [22, 85]] },
      legBU: { parent: 'pelvis', pivot: [33, 86], poly: [[14, 82], [42.5, 82], [42.5, 101], [14, 101]] },
      legBL: { parent: 'legBU', pivot: [31, 101], poly: [[12, 101], [42.5, 101], [42.5, 123], [12, 123]] },
      legFU: { parent: 'pelvis', pivot: [51, 86], poly: [[42.5, 82], [68, 82], [68, 100], [42.5, 100]] },
      legFL: { parent: 'legFU', pivot: [52, 100], poly: [[42.5, 100], [68, 100], [68, 123], [42.5, 123]] }
    }),
    claim: Object.freeze(['head', 'padF', 'armFU', 'armFL', 'armBU', 'armBL', 'torso', 'pelvis', 'legBU', 'legBL', 'legFU', 'legFL']),
    draw: Object.freeze(['armBL', 'armBU', 'legBL', 'legBU', 'legFL', 'legFU', 'pelvis', 'torso', 'head', 'armFU', 'armFL', 'padF']),
    hand: Object.freeze({ part: 'armFL', at: [60, 79] }),
    handBack: Object.freeze({ part: 'armBL', at: [21, 80] })
  }),
  // Thesen's Focus form (char_thesen_focus.png, same frame): the spear on the back rides with the torso, the cape is its
  // own part behind everything (it claims every pixel no other part does) and trails behind the motion (clip.cape).
  thesen_focus: Object.freeze({
    w: 82, h: 123,
    parts: Object.freeze({
      cape: { parent: 'torso', pivot: [42, 48], poly: [[0, 0], [82, 0], [82, 123], [0, 123]] },
      head: { parent: 'torso', pivot: [42, 44], poly: [[28, 4], [57, 4], [57, 27], [51, 33], [50, 46], [34, 46], [32, 33], [28, 27]] },
      padF: { parent: 'torso', pivot: [52, 44], poly: [[49, 16], [70, 16], [70, 47], [56, 47], [49, 40]] },
      torso: { parent: 'pelvis', pivot: [42, 64], poly: [[0, 0], [27, 0], [27, 16], [35, 16], [35, 40], [56, 40], [56, 47], [54, 47], [54, 64], [27, 64], [27, 50], [0, 50]] },
      armFU: { parent: 'torso', pivot: [57, 51], poly: [[53.5, 46], [64, 46], [64, 64], [53.5, 64]] },
      armFL: { parent: 'armFU', pivot: [59, 64], poly: [[55.5, 64], [65.5, 64], [65.5, 84], [55.5, 84]] },
      armBU: { parent: 'torso', pivot: [24, 53], poly: [[13, 48], [27.5, 48], [27.5, 63], [13, 63]] },
      armBL: { parent: 'armBU', pivot: [19, 63], poly: [[14, 63], [26.5, 63], [26.5, 84], [14, 84]] },
      pelvis: { parent: null, pivot: [42, 80], poly: [[22, 60], [63, 60], [63, 85], [53, 85], [53, 90], [32, 90], [32, 85], [22, 85]] },
      legBU: { parent: 'pelvis', pivot: [33, 86], poly: [[20, 82], [42.5, 82], [42.5, 101], [20, 101]] },
      legBL: { parent: 'legBU', pivot: [31, 101], poly: [[20, 101], [42.5, 101], [42.5, 123], [16, 123], [16, 108], [20, 108]] },
      legFU: { parent: 'pelvis', pivot: [51, 86], poly: [[42.5, 82], [62, 82], [62, 100], [42.5, 100]] },
      legFL: { parent: 'legFU', pivot: [52, 100], poly: [[42.5, 100], [62, 100], [62, 123], [42.5, 123]] }
    }),
    claim: Object.freeze(['head', 'padF', 'armFU', 'armFL', 'armBU', 'armBL', 'torso', 'pelvis', 'legBU', 'legBL', 'legFU', 'legFL', 'cape']),
    draw: Object.freeze(['cape', 'armBL', 'armBU', 'legBL', 'legBU', 'legFL', 'legFU', 'pelvis', 'torso', 'head', 'armFU', 'armFL', 'padF']),
    hand: Object.freeze({ part: 'armFL', at: [60, 77] }),
    handBack: Object.freeze({ part: 'armBL', at: [21, 78] })
  })
});

function inPoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Part id per source pixel (index into rig.claim, -1 = transparent / unclaimed).
export function claimMap(src, rig) {
  const map = new Int8Array(src.w * src.h).fill(-1);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    if (src.data[(y * src.w + x) * 4 + 3] < 8) continue;
    for (let k = 0; k < rig.claim.length; k++) if (inPoly(rig.parts[rig.claim[k]].poly, x + .5, y + .5)) { map[y * src.w + x] = k; break; }
  }
  return map;
}

// 2×3 affine helpers ([a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f).
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const inv = (m) => { const det = m[0] * m[3] - m[1] * m[2]; return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det]; };
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// World matrix per part for a pose { a: { part: degrees forward }, o: { part: [dx, dy] } } (o.pelvis moves the body).
export function partMatrices(rig, pose = {}) {
  const out = {};
  const get = (id) => {
    if (out[id]) return out[id];
    const p = rig.parts[id]; const [px, py] = p.pivot; const deg = -(pose.a?.[id] ?? 0); const r = deg * Math.PI / 180;
    const [ox, oy] = pose.o?.[id] ?? [0, 0]; const c = Math.cos(r); const s = Math.sin(r);
    // translate(pivot + offset) · rotate · translate(-pivot)
    const local = [c, s, -s, c, px + ox - (c * px - s * py), py + oy - (s * px + c * py)];
    out[id] = p.parent ? mul(get(p.parent), local) : local;
    return out[id];
  };
  for (const id of Object.keys(rig.parts)) get(id);
  return out;
}

// Bake one posed frame into a padded RGBA frame: nearest-neighbour inverse mapping keeps the pixel art crisp.
export function bakePose(src, rig, map, pose, pad = 24) {
  const W = src.w + pad * 2; const H = src.h + pad * 2; const data = new Uint8ClampedArray(W * H * 4);
  const mats = partMatrices(rig, pose);
  for (const id of rig.draw) {
    const k = rig.claim.indexOf(id); const m = mats[id]; const im = inv(m); const poly = rig.parts[id].poly;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [px, py] of poly) { const [qx, qy] = apply(m, px, py); x0 = Math.min(x0, qx); y0 = Math.min(y0, qy); x1 = Math.max(x1, qx); y1 = Math.max(y1, qy); }
    for (let y = Math.max(0, Math.floor(y0 + pad) - 1); y <= Math.min(H - 1, Math.ceil(y1 + pad) + 1); y++) {
      for (let x = Math.max(0, Math.floor(x0 + pad) - 1); x <= Math.min(W - 1, Math.ceil(x1 + pad) + 1); x++) {
        const [sx, sy] = apply(im, x - pad + .5, y - pad + .5); const ix = Math.floor(sx); const iy = Math.floor(sy);
        if (ix < 0 || iy < 0 || ix >= src.w || iy >= src.h || map[iy * src.w + ix] !== k) continue;
        const si = (iy * src.w + ix) * 4; const di = (y * W + x) * 4;
        data[di] = src.data[si]; data[di + 1] = src.data[si + 1]; data[di + 2] = src.data[si + 2]; data[di + 3] = src.data[si + 3];
      }
    }
  }
  const handAt = (h) => { if (!h) return null; const [hx, hy] = apply(mats[h.part], h.at[0], h.at[1]); return { x: hx + pad, y: hy + pad }; };
  return { w: W, h: H, data, pad, hand: handAt(rig.hand), handBack: handAt(rig.handBack) };
}

// Linear blend of two poses (angles and offsets).
export function blendPose(p, q, u) {
  const out = { a: {}, o: {} };
  for (const id of new Set([...Object.keys(p.a ?? {}), ...Object.keys(q.a ?? {})])) out.a[id] = (p.a?.[id] ?? 0) * (1 - u) + (q.a?.[id] ?? 0) * u;
  for (const id of new Set([...Object.keys(p.o ?? {}), ...Object.keys(q.o ?? {})])) { const a = p.o?.[id] ?? [0, 0]; const b = q.o?.[id] ?? [0, 0]; out.o[id] = [Math.round(a[0] * (1 - u) + b[0] * u), Math.round(a[1] * (1 - u) + b[1] * u)]; }
  return out;
}

// Frame i of a clip: keys [{ t: 0..1, pose }] sampled at i / frames (loops wrap the last key into the first).
export function sampleClip(clip, i) {
  const keys = clip.keys; const t = clip.loop ? i / clip.frames : (clip.frames > 1 ? i / (clip.frames - 1) : 0);
  if (keys.length === 1) return blendPose(keys[0].pose, keys[0].pose, 0);
  for (let k = 0; k < keys.length; k++) {
    const a = keys[k]; const b = keys[k + 1] ?? (clip.loop ? { t: 1, pose: keys[0].pose } : null);
    if (!b) return blendPose(a.pose, a.pose, 0);
    if (t >= a.t && t <= b.t) return blendPose(a.pose, b.pose, b.t > a.t ? (t - a.t) / (b.t - a.t) : 0);
  }
  return blendPose(keys[0].pose, keys[0].pose, 0);
}

function lowestRow(f) { for (let y = f.h - 1; y >= 0; y--) for (let x = 0; x < f.w; x++) if (f.data[(y * f.w + x) * 4 + 3] >= 8) return y; return -1; }

// All clips of a rig baked: { clipName: [{ w, h, data, pad, hand }] } plus per-clip hold ticks and loop flags.
export function bakeClips(src, rig, clips, pad = 24) {
  const map = claimMap(src, rig); const frames = {}; const hold = {};
  // Grounded clips keep the feet on the floor: each frame is shifted so its lowest pixel sits where the standing image's
  // does (a simple foot lock — the leg angles alone sink or lift the body). Air clips (clip.air) keep their offsets.
  const floor = lowestRow(bakePose(src, rig, map, { a: {}, o: {} }, pad));
  for (const [name, clip] of Object.entries(clips)) {
    frames[name] = Array.from({ length: clip.frames }, (_, i) => {
      const pose = sampleClip(clip, i);
      if (rig.parts.cape && pose.a.cape === undefined) pose.a.cape = (clip.cape ?? -2) + (clip.loop ? Math.sin(i / clip.frames * Math.PI * 2) * 2.5 : -i * .8);
      let f = bakePose(src, rig, map, pose, pad);
      const d = clip.air ? 0 : floor - lowestRow(f);
      if (d) { const [ox, oy] = pose.o.pelvis ?? [0, 0]; pose.o.pelvis = [ox, oy + d]; f = bakePose(src, rig, map, pose, pad); }
      return f;
    });
    hold[name] = clip.hold;
  }
  return { frames, hold, map };
}
