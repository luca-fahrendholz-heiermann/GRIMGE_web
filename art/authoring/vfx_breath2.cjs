// GRIMGE — breathing surroundings (user, 4 Nov 2026: "ich will nicht die typische aura nur in anderen farben sondern
// quasi umgebung um den charakter herum elementweise affektiert"). Grey-ramp sheets (outline / dark / mid / light /
// core), recoloured at runtime to the breathing style; drawn around the Wizard, split into a layer behind the body and
// one in front of it. Own designs, hand-drawn quality with vfx_brush.cjs at final density.
//   br_flame_tongue           8-frame loop, 22×44 (base): a flame tongue licking up from the body (flame / sun / forge)
//   br_snow_back / _front     8-frame loop, 184×124 (base): a blizzard vortex round the Wizard — tangential snow streaks
//                             on rings that narrow upward, flakes, small ice shards (ice)
//   br_water_back / _front    8-frame loop, 152×96 (base): a flowing water ribbon orbiting at the waist, crests travelling
//                             round it, drops flung off (water / steam)
//   br_wind_back / _front     8-frame loop, 152×144 (base): three wind sickles spiralling up round the body, dust (wind)
//   br_serpent_back / _front  8-frame loop, 132×136 (base): a spectral snake coiled round the Wizard, head at the shoulder
//   br_beast_spirit           6-frame loop, 148×100 (base, faces right): a crouched spectral predator behind the Wizard
//   br_petal_drone            6-frame loop, 22×22: a blossom drone — five petals turning round a glowing core (flower)
//   br_butterfly              4-frame loop, 22×18: a butterfly drone flapping (insect / love)
const B = require('./vfx_brush.cjs');
const { Sheet, rng, TAU, clamp01 } = B;
// Grey ramp → tinted per style (spell_visuals.js tintedImage buckets: <40 / <90 / <150 / <210 / else).
const G = B.pal({ r: ['#404040', '#787878', '#b4b4b4', '#f0f0f0'] }).r; const OUT = B.pal({ o: '#141414' }).o;
const tone = (s, f, x, y, v) => { const fv = clamp01(v) * (G.length - 1); const lo = Math.floor(fv); s.set(f, x, y, G[Math.min(G.length - 1, lo + (B.dither(Math.round(x), Math.round(y), fv - lo) ? 1 : 0))]); };

function flameTongue() {
  const W = 22; const H = 44; const s = new Sheet('br_flame_tongue', W, H, 8, { anchor: 'base' });
  for (let f = 0; f < 8; f++) {
    const ph = f / 8 * TAU; const h = 30 + Math.sin(ph) * 4 + (f % 3);
    const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([11 + Math.sin(u * 4 - ph) * 3 * u + Math.sin(ph * 2) * u * 2, H - 2 - u * h]); }
    B.stroke(s, f, pts, { max: 10, swell: .5, ramp: G, seed: 3 + f, dry: .35, headBias: .22 });
    B.stroke(s, f, pts.slice(0, 6).map(([x, y]) => [x + .5, y + 1]), { max: 4, swell: .6, ramp: [G[2], G[3], G[3]], seed: 9 + f, dry: .2, headBias: .3 });
    // A detached wisp above the tip.
    const wy = H - 2 - h - 4 - (f % 4) * 2; if (f % 4 !== 3) { tone(s, f, 11 + Math.sin(ph) * 3, wy, .8); tone(s, f, 11 + Math.sin(ph) * 3, wy - 1, .55); }
    B.selOutline(s, f, OUT);
  }
  return s;
}
// Ring-shaped effects split into back / front sheets: draw(set, f) calls set(x, y, v, depthSin).
function ringPair(name, W, H, frames, draw) {
  const bk = new Sheet(`${name}_back`, W, H, frames, { anchor: 'base' }); const fr = new Sheet(`${name}_front`, W, H, frames, { anchor: 'base' });
  for (let f = 0; f < frames; f++) {
    draw(f, (x, y, v, sinA) => tone(sinA > 0 ? fr : bk, f, x, y, sinA > 0 ? v : v * .8));
    B.selOutline(bk, f, OUT); B.selOutline(fr, f, OUT);
  }
  return [bk, fr];
}
function snow() {
  const W = 184; const H = 124; const cx = W / 2; const by = H - 6;
  return ringPair('br_snow', W, H, 8, (f, set) => {
    const r = rng(41);
    for (let ring = 0; ring < 8; ring++) {
      const y0 = by - 6 - ring * 13; const rx = 84 - ring * 6.5; const ry = rx * .24;
      for (let k = 0; k < 22; k++) {
        const a0 = k / 16 * TAU + f / 8 * TAU / 4 * (ring % 2 ? -1 : 1) + r() * .3; const len = .18 + r() * .22;
        for (let i = 0; i <= 14; i++) { const a = a0 + len * i / 14; const sinA = Math.sin(a); const yy = y0 + sinA * ry + Math.sin(a * 3 + ring) * 2; set(cx + Math.cos(a) * rx, yy, .55 + (i / 14) * .45 + (sinA > 0 ? .1 : 0), sinA); if (i > 3 && i < 12) set(cx + Math.cos(a) * rx, yy + 1, .35 + (i / 14) * .3, sinA); }
      }
    }
    // Flakes and small ice shards riding the vortex.
    for (let i = 0; i < 46; i++) {
      const a = r() * TAU + f / 8 * TAU / 3; const yy = by - 4 - r() * 104; const rr = (82 - (by - yy) * .45) * (.7 + r() * .3); const x = cx + Math.cos(a) * rr; const y = yy + Math.sin(a) * rr * .24; const sinA = Math.sin(a);
      if (i % 5 === 0) { set(x, y - 1, 1, sinA); set(x, y + 1, .7, sinA); set(x - 1, y, .85, sinA); set(x + 1, y, .85, sinA); set(x, y, 1, sinA); }
      else set(x, y, .95, sinA);
    }
  });
}
function water() {
  const W = 152; const H = 96; const cx = W / 2; const y0 = H - 46;
  return ringPair('br_water', W, H, 8, (f, set) => {
    const rx = 58; const ry = 15; const ph = f / 8 * TAU;
    for (let i = 0; i < 1400; i++) {
      const a = i / 1400 * TAU; const sinA = Math.sin(a); const crest = Math.max(0, Math.cos(a * 3 - ph * 3));
      const th = 4 + Math.pow(crest, 3) * 4; const yc = y0 + sinA * ry - Math.sin(a * 2 + ph) * 3;
      for (let d = -th; d <= th * .6; d++) set(cx + Math.cos(a) * rx, yc + d, .32 + (-d / th) * .35 + crest * .2, sinA);
      if (crest > .92) set(cx + Math.cos(a) * rx, yc - th - 1, 1, sinA);
    }
    const r = rng(7 + f); for (let dI = 0; dI < 18; dI++) { const a = r() * TAU; const u = (f / 8 + r()) % 1; const x = cx + Math.cos(a) * (rx + u * 18); const y = y0 + Math.sin(a) * ry - 10 - Math.sin(u * Math.PI) * 14 + u * 20; set(x, y, .9, Math.sin(a)); }
  });
}
function wind() {
  const W = 152; const H = 144; const cx = W / 2; const by = H - 6;
  return ringPair('br_wind', W, H, 8, (f, set) => {
    for (let k = 0; k < 3; k++) {
      const a0 = f / 8 * TAU + k * TAU / 3;
      for (let i = 0; i <= 420; i++) {
        const u = i / 420; const a = a0 + u * 2.4; const yy = by - 10 - u * 110 - k * 8; const rx = 62 - u * 26; const sinA = Math.sin(a);
        const w = Math.sin(u * Math.PI) * 7 + 2;
        for (let d = 0; d < w; d++) set(cx + Math.cos(a) * rx, yy + Math.sin(a) * rx * .22 + d, .3 + (d < 2 ? .65 : (1 - d / w) * .4) + u * .05, sinA);
        if (u > .15 && u < .85 && (i / 4 | 0) % 3) set(cx + Math.cos(a - .12) * (rx + 4), yy + Math.sin(a - .12) * (rx + 4) * .22 + w + 3, .6, Math.sin(a - .12));
      }
    }
    const r = rng(5 + f); for (let i = 0; i < 26; i++) { const a = r() * TAU + f * .4; const yy = by - r() * 120; const rr = 60 - (by - yy) * .2; set(cx + Math.cos(a) * rr, yy + Math.sin(a) * rr * .22, .7, Math.sin(a)); }
  });
}
function serpent() {
  const W = 132; const H = 136; const cx = W / 2; const by = H - 8;
  const pair = ringPair('br_serpent', W, H, 8, (f, set) => {
    const ph = f / 8 * TAU;
    // A tube along a rising helix: 2.6 loops from the feet to the shoulder, scale bands, a lit back.
    const N = 2600; let head = null;
    for (let i = 0; i <= N; i++) {
      const u = i / N; const a = u * 2.6 * TAU + ph * .25; const rx = 46 - u * 16; const yy = by - 6 - u * 96 + Math.sin(u * 30 - ph) * 1.5; const sinA = Math.sin(a);
      const th = 3 + Math.sin(u * Math.PI) * 3.5; const x = cx + Math.cos(a) * rx; const y = yy + sinA * rx * .26;
      for (let d = -th; d <= th; d++) { const dia = Math.abs((((i / 5) | 0) % 14) - 7) + Math.abs(d) * 1.4 < 3.5; set(x, y + d, .32 + (-d / th) * .4 + (dia ? .22 : 0), sinA); }
      if (i === N) head = [x, y, sinA];
    }
    // The head (wedge) with an eye and a forked tongue flicking.
    const [hx, hy, hs] = head;
    for (let dy = -9; dy <= 9; dy++) for (let dx = -3; dx <= 18; dx++) { if (Math.abs(dy) > 9 - dx * .42) continue; set(hx + dx, hy + dy, .45 + (-dy / 9) * .35, 1); }
    set(hx + 8, hy - 3, 1, 1); set(hx + 9, hy - 3, 1, 1); set(hx + 9, hy - 2, .9, 1);
    if (f % 4 < 2) for (let t = 0; t < 7; t++) { set(hx + 19 + t, hy + (t > 3 ? (t - 3) * (f % 2 ? 1 : -1) : 0), .9, 1); }
  });
  return pair;
}
function beastSpirit() {
  const W = 148; const H = 100; const s = new Sheet('br_beast_spirit', W, H, 6, { anchor: 'base' });
  for (let f = 0; f < 6; f++) {
    const br = Math.sin(f / 6 * TAU); const jaw = (f % 3) * 1.5; const tail = Math.sin(f / 6 * TAU + 1) * 4;
    // A spirit predator drawn like ink: a translucent energy body, then flowing strokes for spine, head and legs.
    const spine = [[28, 54], [44, 49], [62, 50 + br], [80, 46], [94, 40 - br], [106, 48], [114, 56]];
    const belly = [[34, 64], [52, 70], [72, 70], [88, 64], [100, 60]];
    const inBody = (x, y) => { const sp = B.smooth(spine); const bl = B.smooth(belly); let top = null; let bot = null; for (const [px, py] of sp) if (Math.abs(px - x) < .7) top = top == null ? py : Math.min(top, py); for (const [px, py] of bl) if (Math.abs(px - x) < .7) bot = bot == null ? py : Math.max(bot, py); return top != null && bot != null && y > top && y < bot; };
    for (let y = 30; y < 80; y++) for (let x = 26; x < 110; x++) if (inBody(x, y) && B.dither(x + f, y, .55)) tone(s, f, x, y, .3 + (y < 52 ? .15 : 0));
    // Head: a lowered skull with an open, snarling jaw.
    B.volume(s, f, 104, 46, 140, 70, (x, y) => Math.hypot((x - 120) / 12, (y - 58) / 9) <= 1 || (x >= 124 && x <= 142 && y >= 54 && y <= 62 - (x - 124) * .12), G, { reach: 6 });
    B.stroke(s, f, [[118, 66 + jaw], [128, 68 + jaw], [138, 70 + jaw]], { max: 4, swell: .7, ramp: G, seed: 11, dry: 0 });
    for (const [x0, y0, x1, y1] of [[112, 50, 106, 38], [119, 49, 120, 38]]) B.stroke(s, f, [[x0, y0], [(x0 + x1) / 2 - 1, (y0 + y1) / 2], [x1, y1]], { max: 5, swell: .8, ramp: G, seed: x0, dry: 0, headBias: .3 });
    // Spine / belly strokes, legs (front reaching forward, the hind ones coiled), a tail of smoke.
    B.stroke(s, f, spine, { max: 7, swell: .6, ramp: G, seed: 21 + f, dry: .4, headBias: .65 });
    B.stroke(s, f, belly, { max: 4, swell: .7, ramp: G, seed: 31, dry: .5 });
    B.stroke(s, f, [[94, 44], [98, 66], [112, 92], [120, 94]], { max: 8, swell: .5, ramp: G, seed: 41, dry: .1, headBias: .25 });
    B.stroke(s, f, [[84, 52], [82, 74], [90, 94], [97, 95]], { max: 7, swell: .5, ramp: G, seed: 42, dry: .1, headBias: .25 });
    B.stroke(s, f, [[34, 56], [48, 74], [32, 86], [42, 95], [50, 95]], { max: 9, swell: .5, ramp: G, seed: 43, dry: .1, headBias: .2 });
    B.stroke(s, f, [[30, 54], [16, 46 + tail], [6, 36 - tail * .5], [10, 24 + tail]], { max: 6, swell: .5, ramp: G, seed: 44 + f, dry: .7, headBias: .2 });
    // Eye, fangs, claws.
    tone(s, f, 124, 56, 1); tone(s, f, 125, 56, 1); tone(s, f, 126, 55, .9);
    for (const fx of [128, 134]) { tone(s, f, fx, 63, 1); tone(s, f, fx, 64 + jaw * .5, .9); }
    for (const cx of [116, 119, 122]) tone(s, f, cx, 95, 1);
    B.selOutline(s, f, OUT);
  }
  return s;
}
function petalDrone() {
  const s = new Sheet('br_petal_drone', 22, 22, 6, { anchor: 'center' });
  for (let f = 0; f < 6; f++) {
    for (let p = 0; p < 5; p++) {
      const a = p / 5 * TAU + f / 6 * TAU / 5; const pm = (x, y) => { const dx = x - 11 - Math.cos(a) * 5; const dy = y - 11 - Math.sin(a) * 5; const lx = dx * Math.cos(-a) - dy * Math.sin(-a); const ly = dx * Math.sin(-a) + dy * Math.cos(-a); return (lx / 5.5) ** 2 + (ly / 3.2) ** 2 <= 1; };
      B.volume(s, f, 0, 0, 21, 21, pm, G, { reach: 4 });
    }
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) tone(s, f, 11 + x, 11 + y, x * x + y * y <= 1 ? 1 : .8);
    B.selOutline(s, f, OUT);
  }
  return s;
}
function butterfly() {
  const s = new Sheet('br_butterfly', 22, 18, 4, { anchor: 'center' });
  for (let f = 0; f < 4; f++) {
    const open = [1, .6, .2, .6][f];
    for (const sd of [-1, 1]) {
      const up = (x, y) => { const dx = (x - 11) * sd; const dy = y - 7; return dx > 0 && (dx / (8 * open + 1)) ** 2 + (dy / 6) ** 2 <= 1; };
      const lo = (x, y) => { const dx = (x - 11) * sd; const dy = y - 12; return dx > 0 && (dx / (6 * open + 1)) ** 2 + (dy / 4) ** 2 <= 1; };
      B.volume(s, f, 0, 0, 21, 17, up, G, { reach: 4 }); B.volume(s, f, 0, 0, 21, 17, lo, G, { reach: 3 });
    }
    for (let y = 4; y <= 14; y++) tone(s, f, 11, y, .15);
    tone(s, f, 10, 2, .9); tone(s, f, 12, 2, .9);
    B.selOutline(s, f, OUT);
  }
  return s;
}

module.exports = { breath2Sheets: () => [flameTongue(), ...snow(), ...water(), ...wind(), ...serpent(), beastSpirit(), petalDrone(), butterfly()] };
