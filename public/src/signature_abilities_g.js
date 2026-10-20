// GRIMGE Prototype — SPHÄRENENTFALTUNG (domain expansions; user, 20 Oct 2026,
// after Jujutsu Kaisen — own looks, no copied designs). Domains are a family
// like the Arcane States: the SAME glyph, but every domain has its own ability
// inside — and only ONE domain is allowed per deck.
//
// Shared: a hand sign, a blackout flash, then a dome of an inner world unfolds
// around the caster for 6 s. Foes inside are TRAPPED (the wall holds them in).
// Tap the slot again to close it early with the domain's finale (stronger the
// more time was left). Two hostile domains meeting → DOMAIN DUEL: both sides
// tap for 3 s, the weaker dome collapses.
//
//   S53 ABGRUNDSCHREIN  sure-hit slashes through any guard; caster mana regen
//   S56 STILLSTAND      time stands still: foes in slow motion, clock-hand strikes
//   S57 GLUTKESSEL      a magma floor: foes burn, fire geysers erupt under them
//   S58 LEBENSHAIN      allies heal and shake off statuses; foes are poisoned
//   S59 SPIEGELWELT     mirror images strike from every side, foes lose their bearings
//   S60 SCHWERKRAFT     no jumping, flyers torn down, pulls to the centre
//   S61 STURM           rain soaks, lightning strikes (wet + lightning = shock)
//   S62 SCHATTENMEER    foes sink, shadow hands grab and hold
// Only the caster sees the domain's name — the opponent has to find out by playing.
import { defineSignature, emit, foesOf, hit, plate, sparks, sigSink, TAU, DEPTH } from './signature_core.js';
import { offerRecast } from './recast.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';
import { applyStatus, hasStatus } from './status_effects.js';
import { ghostOf } from './buff_signatures.js';

export const DOMAIN = Object.freeze({ radius: 190, height: 175, duration: 6, sign: .35, unfold: .6, slashEvery: .45, slashDamage: 7, duelTime: 3, aiTapRate: 4.5 });
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;
const mat = (dark, body, facet, vein, edge, spark) => ({ kind: 'crystal', dark, body, facet, vein, edge, spark, core: '#ffffff', glow: 'rgba(255,255,255,', edgeGlow: 'rgba(255,255,255,' });

// ── the domain rules ─────────────────────────────────────────────────────
// Each rule: palette, per-foe effect, caster effect, finale and its own interior art.
export const DOMAIN_RULES = Object.freeze({
  S53: {
    name: 'ABGRUNDSCHREIN', finaleLabel: 'SCHLIESSEN: FINALER SCHNITT', slow: .6,
    pal: { bands: ['#05020a', '#0b0516', '#140823', '#1d0b30'], floor: '#0d0714', crack: '#ff3d6e', wall: '#6a2c91', rim: '#ff3d6e', rimLight: '#ffd1dc', shell: '#ff8fab', mat: mat('#07030d', '#2a0f3d', '#6a2c91', '#ff3d6e', '#ffd1dc', '#ff8fab') },
    caster(d, dt, p) { if (d.inside(p)) p.mp = Math.min(p.maxMp ?? 100, (p.mp ?? 0) + 6 * dt); },
    foe(d, dt, t) {
      // Sure hit: unseen slashes without a direction — a guard cannot catch them.
      if (!d.every(t, DOMAIN.slashEvery)) return;
      hit(t, Math.round(DOMAIN.slashDamage * d.power), 0, 0, .12);
      d.slashes.push({ t: 0, x: t.x, y: (t.y ?? d.y) - 40, a: ((d.t * 7.3 + d.seed) % 3.14) - 1.57 });
    },
    finale(d, gw, left) { for (const t of d.foesInside(gw)) hit(t, Math.round((14 + left * 6) * d.power), Math.sign(t.x - d.cx || 1) * 220, 160, .5, true); },
    interior(ctx, d, x, y, rx, ry, h, k, fade) {
      ctx.fillStyle = '#e9d7ff';
      for (let i = 0; i < 40; i++) { const sx = x - rx + ((i * 97 + d.seed) % 1000) / 1000 * rx * 2; const sy = y - h + ((i * 53 + d.seed * 3) % 1000) / 1000 * h * .8; ctx.globalAlpha = fade * (.4 + .6 * Math.abs(Math.sin(d.t * 2 + i))); ctx.fillRect(Math.round(sx), Math.round(sy), i % 5 ? 1 : 2, i % 5 ? 1 : 2); }
      ctx.globalAlpha = fade;
      const ey = y - h * .8; const er = 24 * k; // the crimson eclipse above the caster
      ctx.fillStyle = '#ff3d6e'; ctx.beginPath(); ctx.arc(x, ey, er + 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#05020a'; ctx.beginPath(); ctx.arc(x + 3, ey + 1, er, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd1dc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, ey, er + 9 + Math.sin(d.t * 3) * 2, 0, TAU); ctx.stroke();
      for (let i = 0; i < 3; i++) { const a = d.t * (.6 + i * .25) + i * 2.1; ctx.strokeStyle = i % 2 ? '#6a2c91' : '#ff8fab'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * rx * .55, ey + 30 + Math.sin(a) * 20, 14, 5, 0, 0, TAU); ctx.stroke(); }
    }
  },
  S56: {
    name: 'STILLSTAND', finaleLabel: 'SCHLIESSEN: ZEITBRUCH', slow: .25,
    pal: { bands: ['#03141a', '#052430', '#083544', '#0c4858'], floor: '#06202a', crack: '#ffd54f', wall: '#1e6b7d', rim: '#ffd54f', rimLight: '#fff8e1', shell: '#80deea', mat: mat('#03141a', '#0c4858', '#4db6ac', '#ffd54f', '#fff8e1', '#ffe082') },
    caster() {},
    foe(d, dt, t) {
      // Time stands still for them; the clock hand strikes everyone inside every 1.5 s.
      if (!d.every(t, 1.5)) return;
      hit(t, Math.round(12 * d.power), 0, 0, .3);
      d.slashes.push({ t: 0, x: t.x, y: (t.y ?? d.y) - 40, a: -Math.PI / 2 + ((d.t * 1.3) % 1) * Math.PI });
    },
    finale(d, gw, left) { for (const t of d.foesInside(gw)) { hit(t, Math.round((10 + left * 5) * d.power), 0, 0, .4); t.freeze?.(.8); } },
    interior(ctx, d, x, y, rx, ry, h, k, fade) {
      // A giant clock face behind the caster with slow hands; sand grains frozen in the air.
      const cy = y - h * .6; const R = 52 * k;
      ctx.globalAlpha = fade * .85; ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, cy, R, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, cy, R * .82, 0, TAU); ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * .82, cy + Math.sin(a) * R * .82); ctx.lineTo(x + Math.cos(a) * R * (i % 3 ? .74 : .66), cy + Math.sin(a) * R * (i % 3 ? .74 : .66)); ctx.stroke(); }
      ctx.lineWidth = 3; const ha = -Math.PI / 2 + d.t * .4; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + Math.cos(ha) * R * .7, cy + Math.sin(ha) * R * .7); ctx.stroke();
      ctx.lineWidth = 2; const ma = -Math.PI / 2 + d.t * 1.6; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + Math.cos(ma) * R * .5, cy + Math.sin(ma) * R * .5); ctx.stroke();
      // Gears drifting at the edges.
      for (const [gx, gy, gr, dir] of [[x - rx * .6, y - h * .45, 16, 1], [x + rx * .62, y - h * .5, 12, -1], [x + rx * .4, y - h * .25, 9, 1]]) {
        ctx.globalAlpha = fade * .6; ctx.strokeStyle = '#4db6ac'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gx, gy, gr * k, 0, TAU); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + d.t * .5 * dir; ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * gr * k, gy + Math.sin(a) * gr * k); ctx.lineTo(gx + Math.cos(a) * (gr + 4) * k, gy + Math.sin(a) * (gr + 4) * k); ctx.stroke(); }
      }
      ctx.fillStyle = '#ffe082';
      for (let i = 0; i < 30; i++) { const sx = x - rx + ((i * 131 + d.seed) % 1000) / 1000 * rx * 2; const sy = y - h * .9 + ((i * 71 + d.seed) % 1000) / 1000 * h * .85; ctx.globalAlpha = fade * .7; ctx.fillRect(Math.round(sx + Math.sin(d.t * .3 + i) * 1.5), Math.round(sy), 2, 2); }
    }
  },
  S57: {
    name: 'GLUTKESSEL', finaleLabel: 'SCHLIESSEN: ERUPTION', slow: .7,
    pal: { bands: ['#1a0503', '#2e0904', '#461006', '#5e1808'], floor: '#3a0a02', crack: '#ffab00', wall: '#bf360c', rim: '#ff6d00', rimLight: '#ffe0b2', shell: '#ff8a65', mat: mat('#1a0503', '#5e1808', '#bf360c', '#ff6d00', '#ffe0b2', '#ffab40') },
    caster() {},
    foe(d, dt, t) {
      // The magma floor sets everyone inside on fire; a geyser erupts under a foe every 1.2 s.
      applyStatus(t, 'burn', { force: true, quiet: true, duration: 1.5 });
      if (!d.every(t, 1.2)) return;
      hit(t, Math.round(18 * d.power), 0, 280, .45);
      d.geysers.push({ t: 0, x: t.x, z: t.z ?? d.cz });
    },
    finale(d, gw, left) { for (const t of d.foesInside(gw)) { hit(t, Math.round((16 + left * 5) * d.power), Math.sign(t.x - d.cx || 1) * 120, 420, .6, true); d.geysers.push({ t: 0, x: t.x, z: t.z ?? d.cz, big: true }); } },
    interior(ctx, d, x, y, rx, ry, h, k, fade) {
      // Embers rising, lava falls at the dome edges, a bubbling magma floor.
      for (let i = 0; i < 26; i++) { const ph = (d.t * .5 + i / 26) % 1; const sx = x - rx + ((i * 89 + d.seed) % 1000) / 1000 * rx * 2; const sy = y - ph * h; ctx.globalAlpha = fade * (1 - ph); ctx.fillStyle = i % 3 ? '#ffab40' : '#fff3e0'; ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2); }
      for (const side of [-1, 1]) { ctx.globalAlpha = fade * .8; ctx.fillStyle = '#ff6d00'; ctx.fillRect(Math.round(x + side * rx * .78 - 4), Math.round(y - h * .7), 8, Math.round(h * .7)); ctx.fillStyle = '#ffe0b2'; ctx.fillRect(Math.round(x + side * rx * .78 - 1), Math.round(y - h * .7), 2, Math.round(h * .7)); }
      ctx.globalAlpha = fade; ctx.fillStyle = '#ff6d00'; ctx.beginPath(); ctx.ellipse(x, y, rx * .96, ry * .96, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a0a02'; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + .4; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * rx * .55, y + Math.sin(a) * ry * .55, rx * .16, ry * .14, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffd180'; for (let i = 0; i < 8; i++) { const ph = (d.t * 1.2 + i / 8) % 1; const bx = x + Math.cos(i * 2.3) * rx * .7 * ((i * 37 % 10) / 10); const by = y + Math.sin(i * 2.3) * ry * .6 * ((i * 53 % 10) / 10); ctx.globalAlpha = fade * (1 - ph); ctx.beginPath(); ctx.arc(bx, by, 2 + ph * 4, 0, TAU); ctx.fill(); }
    }
  },
  S58: {
    name: 'LEBENSHAIN', finaleLabel: 'SCHLIESSEN: BLÜTENSEGEN', slow: .75,
    pal: { bands: ['#0b1f0e', '#123017', '#1a4220', '#23552a'], floor: '#14321a', crack: '#c6ff00', wall: '#558b2f', rim: '#aeea00', rimLight: '#f1f8e9', shell: '#ccff90', mat: mat('#0b1f0e', '#23552a', '#558b2f', '#aeea00', '#f1f8e9', '#ccff90') },
    caster(d, dt, p, gw) {
      // Allies inside regenerate and shake off their ailments.
      for (const a of d.alliesInside(gw)) {
        if (Number.isFinite(a.hp) && Number.isFinite(a.maxHp)) a.hp = Math.min(a.maxHp, a.hp + 8 * dt);
        if (a.statuses) for (const k of ['burn', 'poison', 'bleed', 'paralysis', 'frozen']) if (hasStatus(a, k)) a.statuses[k].end();
      }
    },
    foe(d, dt, t) { applyStatus(t, 'poison', { force: true, quiet: true, duration: 2 }); },
    finale(d, gw, left) {
      for (const a of d.alliesInside(gw)) if (Number.isFinite(a.hp)) a.hp = Math.min(a.maxHp ?? a.hp, a.hp + 20 + left * 4);
      for (const t of d.foesInside(gw)) hit(t, Math.round((10 + left * 4) * d.power), 0, 120, .4);
    },
    interior(ctx, d, x, y, rx, ry, h, k, fade) {
      // A tree crown behind the caster, sunbeams, drifting petals, flowers on a mossy floor.
      ctx.globalAlpha = fade * .25; ctx.fillStyle = '#fff59d';
      for (let i = 0; i < 4; i++) { const bx = x - rx * .5 + i * rx * .33; ctx.beginPath(); ctx.moveTo(bx, y - h); ctx.lineTo(bx + 10, y - h); ctx.lineTo(bx + 34, y); ctx.lineTo(bx + 14, y); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = fade; ctx.fillStyle = '#4e342e'; ctx.fillRect(Math.round(x - 5), Math.round(y - h * .55), 10, Math.round(h * .55 - 6));
      for (const [ox, oy, r, c] of [[0, -.72, 46, '#2e7d32'], [-34, -.6, 34, '#388e3c'], [36, -.6, 32, '#43a047'], [0, -.82, 30, '#66bb6a']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + ox * k, y + oy * h, r * k, 0, TAU); ctx.fill(); }
      for (let i = 0; i < 22; i++) { const ph = (d.t * .35 + i / 22) % 1; const px = x - rx * .8 + ((i * 113 + d.seed) % 1000) / 1000 * rx * 1.6 + Math.sin(d.t * 2 + i) * 6; const py = y - h * .9 + ph * h * .85; ctx.globalAlpha = fade * (1 - ph * .5); ctx.fillStyle = i % 2 ? '#f8bbd0' : '#fff9c4'; ctx.fillRect(Math.round(px), Math.round(py), 3, 2); }
      ctx.globalAlpha = fade; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + .3; const fx = x + Math.cos(a) * rx * .7; const fy = y + Math.sin(a) * ry * .7; ctx.fillStyle = i % 3 ? '#ffeb3b' : '#f48fb1'; ctx.fillRect(Math.round(fx) - 2, Math.round(fy) - 2, 4, 4); }
    }
  },
  // S59 — mirror world: images of the caster strike from every side, foes lose their bearings.
  S59: {
    name: 'SPIEGELWELT', finaleLabel: 'SCHLIESSEN: SPLITTER', slow: .7,
    pal: { bands: ['#0e1116', '#161b24', '#1f2733', '#2a3444'], floor: '#11161e', crack: '#e0f7fa', wall: '#90a4ae', rim: '#e0f7fa', rimLight: '#ffffff', shell: '#b0bec5', mat: mat('#0e1116', '#2a3444', '#90a4ae', '#e0f7fa', '#ffffff', '#b2ebf2') },
    caster() {},
    foe(d, dt, t) {
      if (!d.every(t, 1.3)) return;
      const side = (d.fx.length % 2 ? 1 : -1);
      hit(t, Math.round(11 * d.power), -side * 120, 40, .35);
      if (Math.random() < .5) t.facing = -(t.facing || 1); // confused: which one is real?
      d.fx.push({ type: 'mirror', t: 0, x: t.x, z: t.z ?? d.cz, side });
    },
    finale(d, gw, left) { for (const t of d.foesInside(gw)) { hit(t, Math.round((10 + left * 5) * d.power), 0, 160, .5, true); d.fx.push({ type: 'mirror', t: 0, x: t.x, z: t.z ?? d.cz, side: 1, big: true }, { type: 'mirror', t: 0, x: t.x, z: t.z ?? d.cz, side: -1, big: true }); } },
    interior(ctx, d, x, y, rx, ry, h, k, fade) {
      // Tall mirror shards all around, each holding a reflection of the caster.
      for (let i = 0; i < 7; i++) {
        const sx = x - rx * .8 + i * rx * .27; const sh = h * (.55 + (i % 3) * .12); const sy = y - ry * .2;
        ctx.globalAlpha = fade * .5; ctx.fillStyle = '#b0bec5'; ctx.beginPath(); ctx.moveTo(sx - 10, sy); ctx.lineTo(sx - 7, sy - sh); ctx.lineTo(sx + 9, sy - sh + 8); ctx.lineTo(sx + 10, sy); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = fade * .9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
        if (d.owner?.heroKey && i % 2) ghostOf(ctx, d.owner, sx, sy - 4, 'idle', d.owner.animTime ?? 0, i % 4 ? 1 : -1, .25 * fade, '#e0f7fa', .6);
      }
    }
  },
  // S60 — gravity: nobody leaves the ground, flyers are torn down, a pull to the centre.
  S60: {
    name: 'SCHWERKRAFT', finaleLabel: 'SCHLIESSEN: KOLLAPS', slow: .5,
    pal: { bands: ['#08060f', '#120d22', '#1c1433', '#271c45'], floor: '#0f0b1c', crack: '#b388ff', wall: '#5e35b1', rim: '#b388ff', rimLight: '#ede7f6', shell: '#9575cd', mat: mat('#08060f', '#271c45', '#5e35b1', '#b388ff', '#ede7f6', '#d1c4e9') },
    caster() {},
    foe(d, dt, t) {
      // Pressed down: no jumping; whoever is in the air is slammed to the ground.
      if ((t.elevation ?? 0) > 2) { t.vElevation = Math.min(t.vElevation ?? 0, -900); if (d.every(t, 1, 'slam')) hit(t, Math.round(14 * d.power), 0, -300, .4); }
      else if ((t.vElevation ?? 0) > 0) t.vElevation = 0;
      if (!d.every(t, 2)) return;
      // Gravity pulse: a pull toward the centre.
      t.x += (d.cx - t.x) * .3; if (Number.isFinite(t.z)) t.z += (d.cz - t.z) * .3;
      hit(t, Math.round(8 * d.power), 0, 0, .25);
      d.fx.push({ type: 'pulse', t: 0, x: d.cx, z: d.cz });
    },
    finale(d, gw, left) { for (const t of d.foesInside(gw)) { t.x += (d.cx - t.x) * .8; if (Number.isFinite(t.z)) t.z += (d.cz - t.z) * .8; hit(t, Math.round((14 + left * 6) * d.power), 0, -400, .7, true); } d.fx.push({ type: 'pulse', t: 0, x: d.cx, z: d.cz, big: true }); },
    interior(ctx, d, x, y, rx, ry, h, k, fade) {
      // A black hole above the centre with an accretion disc; rings sink toward the floor.
      const cy = y - h * .62;
      ctx.globalAlpha = fade * .8; ctx.strokeStyle = '#b388ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, cy, 44 * k, 12 * k, Math.sin(d.t) * .1, 0, TAU); ctx.stroke();
      ctx.globalAlpha = fade; ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(x, cy, 18 * k, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ede7f6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, cy, 20 * k, 0, TAU); ctx.stroke();
      for (let i = 0; i < 4; i++) { const ph = (d.t * .5 + i / 4) % 1; ctx.globalAlpha = fade * (1 - ph) * .6; ctx.strokeStyle = '#7e57c2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, rx * (1 - ph * .85), ry * (1 - ph * .85), 0, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#d1c4e9'; for (let i = 0; i < 18; i++) { const ph = (d.t * .8 + i / 18) % 1; const sx = x - rx * .8 + ((i * 97 + d.seed) % 1000) / 1000 * rx * 1.6; ctx.globalAlpha = fade * .7; ctx.fillRect(Math.round(sx), Math.round(y - h * .9 + ph * h * .85), 2, 3); }
    }
  },
  // S61 — storm: rain soaks everyone, lightning strikes (wet + lightning = shock).
  S61: {
    name: 'STURM', finaleLabel: 'SCHLIESSEN: DONNERKEIL', slow: .75,
    pal: { bands: ['#0b1118', '#121c27', '#1a2836', '#233446'], floor: '#0f1922', crack: '#81d4fa', wall: '#546e7a', rim: '#4fc3f7', rimLight: '#e1f5fe', shell: '#90caf9', mat: mat('#0b1118', '#233446', '#546e7a', '#4fc3f7', '#e1f5fe', '#b3e5fc') },
    caster() {},
    foe(d, dt, t) {
      applyStatus(t, 'wet', { quiet: true, duration: 1.5 });
      if (!d.every(t, 1.1)) return;
      hit(t, Math.round(12 * d.power), 0, 60, .3); // the domain carries 'fulgur': wet + lightning → SCHOCK
      d.fx.push({ type: 'bolt', t: 0, x: t.x, z: t.z ?? d.cz });
    },
    finale(d, gw, left) { for (const t of d.foesInside(gw)) { hit(t, Math.round((16 + left * 5) * d.power), 0, 200, .6, true); d.fx.push({ type: 'bolt', t: 0, x: t.x, z: t.z ?? d.cz, big: true }); } },
    interior(ctx, d, x, y, rx, ry, h, k, fade) {
      // Heavy clouds, slanted rain, lightning flickering in the sky.
      ctx.globalAlpha = fade * .9; ctx.fillStyle = '#2b3a4d';
      for (let i = 0; i < 6; i++) { const cx = x - rx * .75 + i * rx * .3; ctx.beginPath(); ctx.ellipse(cx, y - h * .82 + (i % 2) * 8, 34 * k, 14 * k, 0, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#90caf9'; ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) { const ph = (d.t * 2.2 + i / 40) % 1; const sx = x - rx + ((i * 61 + d.seed) % 1000) / 1000 * rx * 2; const sy = y - h * .75 + ph * h * .8; ctx.globalAlpha = fade * .6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 3, sy + 8); ctx.stroke(); }
      if (Math.sin(d.t * 5.3) > .92) { ctx.globalAlpha = fade * .25; ctx.fillStyle = '#e1f5fe'; ctx.fillRect(x - rx, y - h, rx * 2, h); }
    }
  },
  // S62 — shadow sea: foes sink, shadow hands grab and hold them.
  S62: {
    name: 'SCHATTENMEER', finaleLabel: 'SCHLIESSEN: SCHATTENFLUT', slow: .5,
    pal: { bands: ['#030305', '#07070c', '#0c0b14', '#12101e'], floor: '#050409', crack: '#7e57c2', wall: '#311b92', rim: '#7e57c2', rimLight: '#d1c4e9', shell: '#5e35b1', mat: mat('#030305', '#12101e', '#311b92', '#7e57c2', '#d1c4e9', '#b39ddb') },
    caster() {},
    foe(d, dt, t) {
      if (!d.every(t, 1.4)) return;
      hit(t, Math.round(12 * d.power), 0, 0, .3); t.freeze?.(.5);
      d.fx.push({ type: 'hands', t: 0, x: t.x, z: t.z ?? d.cz });
    },
    finale(d, gw, left) { for (const t of d.foesInside(gw)) { hit(t, Math.round((12 + left * 5) * d.power), 0, 0, .6, true); t.freeze?.(1); d.fx.push({ type: 'hands', t: 0, x: t.x, z: t.z ?? d.cz, big: true }); } },
    interior(ctx, d, x, y, rx, ry, h, k, fade) {
      // A black sea; silhouettes of shadow beasts peek out, pale eyes blink.
      for (let i = 0; i < 4; i++) {
        const bx = x - rx * .6 + i * rx * .4; const by = y - ry * .1; const bob = Math.sin(d.t * 1.5 + i) * 4;
        ctx.globalAlpha = fade * .9; ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.ellipse(bx, by - 18 + bob, 16 * k, 20 * k, 0, Math.PI, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx - 12 * k, by - 30 + bob); ctx.lineTo(bx - 8 * k, by - 44 * k + bob); ctx.lineTo(bx - 4 * k, by - 32 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx + 12 * k, by - 30 + bob); ctx.lineTo(bx + 8 * k, by - 44 * k + bob); ctx.lineTo(bx + 4 * k, by - 32 + bob); ctx.fill();
        if (Math.sin(d.t * 2 + i * 1.7) > -.6) { ctx.fillStyle = '#d1c4e9'; ctx.fillRect(Math.round(bx - 6), Math.round(by - 26 + bob), 3, 2); ctx.fillRect(Math.round(bx + 3), Math.round(by - 26 + bob), 3, 2); }
      }
      ctx.strokeStyle = '#311b92'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + d.t * .3; ctx.globalAlpha = fade * .7; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rx * .3, y + Math.sin(a) * ry * .3); ctx.quadraticCurveTo(x + Math.cos(a + .4) * rx * .6, y + Math.sin(a + .4) * ry * .6 - 10, x + Math.cos(a) * rx * .9, y + Math.sin(a) * ry * .9); ctx.stroke(); }
    }
  }
});
export const DOMAIN_IDS = Object.freeze(Object.keys(DOMAIN_RULES));
export const isDomainSigId = (id) => DOMAIN_IDS.includes(String(id).replace(/^sig_/, ''));

const active = new Set();
// Only domains still running in the spell system (a cleared runtime drops them).
export const activeDomains = () => { for (const d of [...active]) if (d.isFinished || (d.system && !d.system.activeSpells.includes(d))) active.delete(d); return [...active]; };

export class Domain {
  constructor(sig, owner, quality, ruleId = 'S53') {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.quality = quality; this.ruleId = DOMAIN_RULES[ruleId] ? ruleId : 'S53'; this.rule = DOMAIN_RULES[this.ruleId];
    this.cx = owner.x; this.cz = owner.z; this.R = DOMAIN.radius; this.t = 0; this.life = DOMAIN.duration * (quality?.duration ?? 1);
    this.tickT = new Map(); this.trapped = new Set(); this.slashes = []; this.geysers = []; this.fx = []; this.collapseT = null; this.finale = 0; this.clash = null; this.isFinished = false;
    this.isGroundDecal = true; // the inner world lies under every actor
    this.seed = Math.floor(Math.random() * 1000);
    active.add(this);
    emit(new DomainShell(this), quality);
  }
  get x() { return this.cx; } get z() { return this.cz; } get y() { return groundYForDepth(this.cz); }
  get power() { return this.quality?.power ?? 1; }
  // Screen half-height of the floor ellipse (depth → screen).
  get ry() { return Math.max(18, Math.abs(groundYForDepth(Math.min(.98, this.cz + this.R / DEPTH)) - groundYForDepth(this.cz)) * .9); }
  get unfoldK() { const k = Math.max(0, Math.min(1, (this.t - DOMAIN.sign) / DOMAIN.unfold)); return 1 - (1 - k) * (1 - k); }
  get open() { return this.collapseT == null && this.t >= DOMAIN.sign + DOMAIN.unfold * .5; }
  inside(t) { return Math.hypot(t.x - this.cx, ((t.z ?? this.cz) - this.cz) * DEPTH) < this.R * this.unfoldK; }
  foesInside(gw) { return foesOf(gw, this.team).filter((t) => !t.isProp && this.inside(t)); }
  alliesInside(gw) {
    const out = [this.owner];
    for (const s of sigSink()?.getSummons?.(this.team) ?? []) if (alive(s) && this.inside(s)) out.push(s);
    return out.filter((a) => alive(a) && this.inside(a));
  }
  // Per-target interval timer (true once every `sec` seconds); a tag keeps separate timers per target.
  every(t, sec, tag = 'main') { let m = this.tickT.get(t); if (!m) this.tickT.set(t, (m = new Map())); const last = m.get(tag); if (last != null && this.t - last < sec) return false; m.set(tag, this.t); return true; }
  update(dt, gw) {
    this.t += dt;
    const p = this.owner;
    for (const g of this.geysers) g.t += dt; this.geysers = this.geysers.filter((g) => g.t < .6);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < .7);
    for (const s of this.slashes) s.t += dt; this.slashes = this.slashes.filter((s) => s.t < .22);
    if (this.collapseT != null) { if (this.t - this.collapseT > .6) { this.isFinished = true; active.delete(this); } return; }
    if (this.t < DOMAIN.sign) { p.state = 'heavyStrike'; p.stateTimer = .1; p.vx = 0; p.vz = 0; return; }
    if (!this.flashed) { this.flashed = true; combat.triggerHitstop?.(6); combat.shakeCamera(12, .5); audio.playImpact?.(true); combat.spawnShockwave(this.cx, this.y, 160, this.rule.pal.rim); }
    if (!alive(p)) { this.collapse(); return; }
    if (this.clash) return; // the duel decides — the rules pause
    if (this.t - DOMAIN.sign > this.life) { this.collapse(); return; }
    if (!this.open) return;
    this.rule.caster(this, dt, p, gw);
    for (const t of foesOf(gw, this.team)) {
      if (t.isProp) continue;
      // Trapped: whoever was inside once is held in by the dome wall (also against knockback).
      if (this.inside(t)) this.trapped.add(t);
      if (!this.trapped.has(t)) continue;
      const dx = t.x - this.cx; const dz = ((t.z ?? this.cz) - this.cz) * DEPTH; const dd = Math.hypot(dx, dz); const lim = this.R - 16;
      if (dd > lim) { t.x = this.cx + dx / dd * lim; if (Number.isFinite(t.z)) t.z = this.cz + dz / dd * lim / DEPTH; t.kbVelX = 0; }
      t.slow?.(.3, this.rule.slow);
      this.rule.foe(this, dt, t, gw);
    }
  }
  // Stage 2: close early with the domain's finale (more time left → stronger).
  closeWithFinale(gw) {
    if (this.collapseT != null || this.clash) return false;
    const left = Math.max(0, this.life - (this.t - DOMAIN.sign)); this.finale = left;
    this.rule.finale(this, gw, left);
    combat.shakeCamera(14, .4);
    this.collapse();
    return true;
  }
  collapse() {
    if (this.collapseT != null) return;
    this.collapseT = this.t; this.clash = null;
    audio.playImpact?.(false);
  }
  // ── drawing ──
  silhouette(ctx, k) {
    const x = this.cx; const y = this.y; const rx = this.R * k; const ry = this.ry * k; const h = DOMAIN.height * k;
    ctx.beginPath(); ctx.ellipse(x, y, rx, h, 0, Math.PI, TAU); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI); ctx.closePath();
  }
  // Back layer (under the actors): the domain's inner world.
  render(ctx) {
    const k = this.unfoldK; if (k <= 0) { this.renderSign(ctx); return; }
    const gone = this.collapseT != null ? Math.min(1, (this.t - this.collapseT) / .6) : 0; const fade = 1 - gone;
    const x = this.cx; const y = this.y; const rx = this.R * k; const ry = this.ry * k; const h = DOMAIN.height * k; const pal = this.rule.pal;
    ctx.save(); ctx.globalAlpha = fade;
    this.silhouette(ctx, k); ctx.save(); ctx.clip();
    // Sky in layered bands (no gradients: pixel look), the domain's own art, the floor.
    pal.bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x - rx, y - h + i * h / pal.bands.length, rx * 2, h / pal.bands.length + 1); });
    ctx.fillStyle = pal.floor; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    this.rule.interior(ctx, this, x, y, rx, ry, h, k, fade);
    ctx.strokeStyle = pal.crack; ctx.lineWidth = 1.5; ctx.globalAlpha = fade * (.45 + .25 * Math.sin(this.t * 4));
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + .2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rx * .12, y + Math.sin(a) * ry * .12); ctx.lineTo(x + Math.cos(a + .1) * rx * .55, y + Math.sin(a + .1) * ry * .55); ctx.lineTo(x + Math.cos(a - .05) * rx * .92, y + Math.sin(a - .05) * ry * .92); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = pal.wall; ctx.lineWidth = 2; ctx.globalAlpha = fade * .9;
    ctx.beginPath(); ctx.ellipse(x, y, rx, h, 0, Math.PI, TAU); ctx.stroke();
    ctx.restore();
  }
  // Before the dome: the hand sign — a dark ring gathering at the caster's feet.
  renderSign(ctx) {
    const p = this.owner; const k = Math.min(1, this.t / DOMAIN.sign);
    ctx.save(); ctx.globalAlpha = .7 * k; ctx.fillStyle = this.rule.pal.bands[0]; ctx.beginPath(); ctx.ellipse(p.x, this.y, 20 + 30 * k, (20 + 30 * k) * .32, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = this.rule.pal.rim; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
}

// Front layer (over the actors): near shell, rim, strikes / geysers, duel seam, blackout.
class DomainShell {
  constructor(domain) { this.domain = domain; this.isFinished = false; this.x = domain.cx; }
  update() { if (this.domain.isFinished) this.isFinished = true; }
  render(ctx) {
    const d = this.domain; const k = d.unfoldK; const x = d.cx; const y = d.y; const pal = d.rule.pal;
    if (d.t < DOMAIN.sign) { const p = d.owner; const hy = (p.y ?? y) - 50; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .9; ctx.fillStyle = pal.rim; ctx.beginPath(); ctx.arc(p.x + (p.facing || 1) * 6, hy, 4 + 8 * (d.t / DOMAIN.sign), 0, TAU); ctx.fill(); ctx.restore(); return; }
    const ft = d.t - DOMAIN.sign;
    if (ft < .18) { ctx.save(); ctx.globalAlpha = .85 * (1 - ft / .18); ctx.fillStyle = '#000000'; ctx.fillRect(x - 3000, y - 3000, 6000, 6000); ctx.restore(); }
    const gone = d.collapseT != null ? Math.min(1, (d.t - d.collapseT) / .6) : 0;
    const rx = d.R * k; const ry = d.ry * k; const h = DOMAIN.height * k;
    ctx.save();
    // Geysers (Glutkessel) and strikes stay visible during the collapse too.
    for (const g of d.geysers) {
      const gk = Math.min(1, g.t / .12); const ga = 1 - Math.max(0, g.t - .2) / .4; const gy = groundYForDepth(g.z); const gh = (g.big ? 150 : 100) * gk;
      ctx.globalAlpha = Math.max(0, ga); ctx.fillStyle = '#ff6d00'; ctx.fillRect(Math.round(g.x - 9), Math.round(gy - gh), 18, Math.round(gh));
      ctx.fillStyle = '#ffd180'; ctx.fillRect(Math.round(g.x - 4), Math.round(gy - gh), 8, Math.round(gh));
      ctx.fillStyle = '#fff3e0'; ctx.beginPath(); ctx.arc(g.x, gy - gh, 10 * gk, 0, TAU); ctx.fill();
    }
    for (const f of d.fx) {
      const fk = Math.min(1, f.t / .12); const fa = Math.max(0, 1 - Math.max(0, f.t - .25) / .45); const fy = groundYForDepth(f.z);
      ctx.globalAlpha = fa;
      if (f.type === 'mirror' && d.owner?.heroKey) {
        // A mirror image of the caster dashes in from the side and strikes.
        const sx = f.x + f.side * (60 - 50 * fk); ghostOf(ctx, d.owner, sx, fy, 'attack1', d.owner.animTime ?? 0, -f.side, .7 * fa, '#e0f7fa', f.big ? 1.1 : 1);
        if (fk >= 1) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x - 18, fy - 56); ctx.lineTo(f.x + 18, fy - 30); ctx.stroke(); }
      } else if (f.type === 'pulse') {
        ctx.strokeStyle = pal.rim; ctx.lineWidth = f.big ? 5 : 3; const pr = (f.big ? 1 : .8) * d.R * (1 - fk * .8);
        ctx.beginPath(); ctx.ellipse(f.x, fy, pr, pr * .32, 0, 0, TAU); ctx.stroke();
      } else if (f.type === 'bolt') {
        ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = f.big ? 5 : 3; ctx.beginPath(); let bx = f.x; ctx.moveTo(bx, fy - DOMAIN.height);
        for (let i = 1; i <= 7; i++) { bx = f.x + (i % 2 ? 8 : -8) * (1 - i / 8); ctx.lineTo(bx, fy - DOMAIN.height + i * DOMAIN.height / 7); } ctx.stroke();
        ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(f.x, fy, 20 * fk, 6 * fk, 0, 0, TAU); ctx.fill();
      } else if (f.type === 'hands') {
        for (const side of [-1, 1]) { const hh = (f.big ? 70 : 50) * fk; plate(ctx, [[f.x + side * 6 - 4, fy], [f.x + side * 10, fy - hh], [f.x + side * 16, fy - hh - 6], [f.x + side * 6 + 4, fy]], pal.mat, 5450 + (side > 0 ? 1 : 0), { alpha: fa, glowEdge: 1.1 }); }
      }
    }
    for (const s of d.slashes) {
      const kk = Math.min(1, s.t / .06); const a = 1 - Math.max(0, s.t - .08) / .14; const L = 34 * kk;
      ctx.globalAlpha = Math.max(0, a); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x - Math.cos(s.a) * L, s.y - Math.sin(s.a) * L); ctx.lineTo(s.x + Math.cos(s.a) * L, s.y + Math.sin(s.a) * L); ctx.stroke();
      ctx.strokeStyle = pal.rim; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x - Math.cos(s.a) * L * .7, s.y - Math.sin(s.a) * L * .7 + 2); ctx.lineTo(s.x + Math.cos(s.a) * L * .7, s.y + Math.sin(s.a) * L * .7 + 2); ctx.stroke();
    }
    if (gone > 0) {
      for (let i = 0; i < 16; i++) { const a = Math.PI + i / 15 * Math.PI; const sx = x + Math.cos(a) * rx; const sy = y + Math.sin(a) * h + gone * gone * 120; plate(ctx, [[sx - 6, sy], [sx, sy - 9], [sx + 6, sy + 2]], pal.mat, 5300 + i, { alpha: 1 - gone }); }
      ctx.restore(); return;
    }
    ctx.globalAlpha = .1; ctx.fillStyle = pal.shell; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI); ctx.ellipse(x, y, rx, h * .25, 0, Math.PI, 0, true); ctx.fill();
    ctx.globalAlpha = .9; ctx.strokeStyle = pal.rim; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, rx, h, 0, Math.PI, TAU); ctx.stroke();
    ctx.strokeStyle = pal.rimLight; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx - 3), Math.max(0, h - 3), 0, Math.PI, TAU); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = pal.rim; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = Math.PI + ((d.t * .35 + i / 6) % 1) * Math.PI; ctx.fillStyle = pal.rimLight; ctx.fillRect(Math.round(x + Math.cos(a) * rx) - 1, Math.round(y + Math.sin(a) * h) - 1, 3, 3); }
    // Domain name over the dome while it is fresh.
    if (ft < 1.6 && d.owner?.isPlayerControlled) { ctx.globalAlpha = Math.min(1, (1.6 - ft) / .4); ctx.font = '900 15px Cinzel, serif'; ctx.textAlign = 'center'; ctx.fillStyle = pal.rimLight; ctx.strokeStyle = pal.bands[0]; ctx.lineWidth = 3; ctx.strokeText(d.rule.name, x, y - h - 8); ctx.fillText(d.rule.name, x, y - h - 8); }
    if (d.clash && d.clash.a === d) {
      const c = d.clash; const sx = c.seamX(); const top = y - DOMAIN.height;
      ctx.globalAlpha = .95; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 12; i++) { const yy = y - i / 12 * DOMAIN.height; const xx = sx + Math.sin(d.t * 30 + i * 1.7) * 4; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
      sparks(ctx, [[sx, (y + top) / 2]], pal.mat, d.t, 5390, 10, 1);
      ctx.font = '900 16px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#05020a'; ctx.lineWidth = 3;
      const label = `SPHÄREN-DUELL  ${c.powerA} : ${Math.round(c.powerB)}`; ctx.strokeText(label, sx, top - 26); ctx.fillText(label, sx, top - 26);
    }
    ctx.restore();
  }
}

// Two hostile domains meet: both owners tap for DOMAIN.duelTime seconds (the AI at
// a fixed rate). The weaker dome collapses; the stronger keeps its remaining time.
export class DomainClash {
  constructor(a, b) { this.a = a; this.b = b; this.t = 0; this.powerA = 0; this.powerB = 0; this.isFinished = false; this.x = (a.cx + b.cx) / 2; a.clash = this; b.clash = this; }
  seamX() { const mid = (this.a.cx + this.b.cx) / 2; const diff = this.powerA - this.powerB; const dir = Math.sign(this.b.cx - this.a.cx) || 1; return mid + dir * Math.max(-60, Math.min(60, diff * 6)); }
  tapFor(domain) { if (this.isFinished) return; if (domain === this.a) this.powerA++; else this.powerB++; }
  update(dt) {
    if (this.isFinished) return;
    this.t += dt;
    if (!this.a.owner.isPlayerControlled) this.powerA += DOMAIN.aiTapRate * dt;
    if (!this.b.owner.isPlayerControlled) this.powerB += DOMAIN.aiTapRate * dt;
    if (this.t >= DOMAIN.duelTime) this.resolve();
  }
  resolve() {
    this.isFinished = true;
    const { a, b } = this; a.clash = null; b.clash = null;
    if (Math.abs(this.powerA - this.powerB) < 1) { a.collapse(); b.collapse(); }
    else (this.powerA > this.powerB ? b : a).collapse();
    combat.shakeCamera(14, .45); audio.playImpact?.(true);
  }
  render() {}
}

// Opens a domain (of a rule) for any owner (player or AI). Returns the domain.
export function openDomain(owner, quality = null, sig = null, ruleId = 'S53') {
  // One domain per caster: a new one replaces the caster's previous dome.
  for (const old of activeDomains()) if (old.owner === owner && old.collapseT == null) old.collapse();
  const domain = emit(new Domain(sig, owner, quality, ruleId), quality);
  const rival = activeDomains().find((d) => d !== domain && d.team !== domain.team && d.collapseT == null && !d.clash && Math.hypot(d.cx - domain.cx, (d.cz - domain.cz) * DEPTH) < d.R + domain.R);
  if (rival) domain.duel = emit(new DomainClash(domain, rival), quality);
  return domain;
}

// Every domain rune shares the same cast flow (stage 2 = finale, or tapping in a duel).
for (const ruleId of DOMAIN_IDS) {
  defineSignature(ruleId, {
    cast(c) {
      const p = c.caster; p.isPlayerControlled ??= p === globalThis.window?.gameWorld?.player;
      const domain = openDomain(p, c.quality, c.sig, ruleId);
      const finaleLabel = domain.rule.finaleLabel;
      let duelAnnounced = false;
      offerRecast(p, {
        window: DOMAIN.sign + DOMAIN.unfold + domain.life, label: finaleLabel,
        valid: () => !domain.isFinished && domain.collapseT == null,
        poll: () => (domain.clash && !duelAnnounced ? (duelAnnounced = true, { window: DOMAIN.duelTime, label: 'SPHÄREN-DUELL: TIPPEN!' }) : (!domain.clash && duelAnnounced && domain.collapseT == null ? (duelAnnounced = false, { window: Math.max(.5, domain.life - (domain.t - DOMAIN.sign)), label: finaleLabel }) : null)),
        stage2: (gw) => {
          if (domain.clash) { domain.clash.tapFor(domain); return { again: true, label: `SPHÄREN-DUELL: ${domain.clash.a === domain ? domain.clash.powerA : domain.clash.powerB} TIPPS` }; }
          return domain.closeWithFinale(gw);
        },
        expire: () => {}
      });
    }
  });
}
