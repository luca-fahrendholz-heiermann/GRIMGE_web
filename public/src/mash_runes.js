// GRIMGE Prototype — tap / mash runes (user, 24 Oct 2026: "Spiralkern und Hämmer-Runen"; "Tippen besser als
// Halten, Wischen wirft die Kugel"; growth costs mana, a full Focus gives an overcharge stage).
// All three run as stances that own the attack taps (stance.attack); a re-tap of the rune slot counts as a tap too.
//   S91 SPIRALKERN       a spiral core over the head. Each TAP grows it a stage (1–5, 6 mana each); with a full
//                        Focus a sixth tap OVERCHARGES it (the Focus is spent). SWIPE forward throws it straight
//                        (it drills through foes), SWIPE up lobs it high (it crashes down). Allies close by feed it.
//                        A hit while charging lets it go early at half strength — cover yourself first (walls,
//                        shields), then charge. Bigger = slower, wider, stronger; stage 5+ leaves a crater.
//   S92 WÄCHTERGEIST     a violet guardian spirit appears behind the Wizard. Mashing TAPS throws its fists: two
//                        hits per tap, the faster you tap the further they reach (up to 30 hits). It blocks shots
//                        in front while it punches. Stop tapping (or swipe) for the finishing slam.
//   S93 TAUSENDSTICH     a stab barrage with the held weapon's colour: every TAP one stab, the tempo stretches the
//                        reach (up to 24 stabs), then a long piercing thrust.
import { defineSignature, startStance, endStance, emit, foesOf, hit, TAU, DEPTH } from './signature_core.js';
import { projectilesOf } from './signature_core.js';
import { offerRecast } from './recast.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';
import { WEAPONS } from './weapons.js';

export const SPIRAL = Object.freeze({ dur: 10, maxStage: 5, growMana: 6, base: 18, perStage: 14, overcharge: 1.4 });
export const GUARDIAN = Object.freeze({ dur: 6, maxHits: 30, idle: .8, fistDmg: 4 });
export const THOUSAND = Object.freeze({ dur: 5, maxStabs: 24, idle: .7, stabDmg: 5 });
const gy = (z) => groundYForDepth(z);
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
const disc = (ctx, x, y, r, c, a = 1) => { if (r <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), r, 0, TAU); ctx.fill(); ctx.restore(); };
const ring = (ctx, x, y, r, c, w, a, sq = 1) => { if (r <= 0 || a <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), r, r * sq, 0, 0, TAU); ctx.stroke(); ctx.restore(); };
const noMana = (p) => combat.spawnDamageText?.(p.x, (p.y ?? 0) - 70, 'NO MANA', { color: '#64b5f6' });
// Tempo: taps in the last second (mashing speed).
const tempoOf = (st) => { st.taps = (st.taps ?? []).filter((t) => st.t - t < 1); return st.taps.length; };

// ── S91 SPIRALKERN ─────────────────────────────────────────────────────────
const SP = { dark: '#0d2b4a', body: '#1e88e5', ring: '#64b5f6', light: '#bbdefb', core: '#ffffff', over: '#e040fb' };
export const spiralDamage = (stage) => (SPIRAL.base + Math.min(5, stage) * SPIRAL.perStage) * (stage > 5 ? SPIRAL.overcharge : 1);
const spiralRadius = (stage) => 8 + Math.min(stage, 6) * 5;
function drawSpiral(ctx, x, y, stage, t, a = 1) {
  const r = spiralRadius(stage); const over = stage > 5;
  disc(ctx, x, y, r + 3, SP.dark, a); disc(ctx, x, y, r, over ? '#7b1fa2' : SP.body, a);
  for (let i = 0; i < 3; i++) { const ph = t * (4 + i) + i * 2; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = i === 1 ? SP.light : (over ? SP.over : SP.ring); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), r * (.95 - i * .2), r * (.35 + i * .1), ph, 0, TAU); ctx.stroke(); ctx.restore(); }
  disc(ctx, x, y, Math.max(3, r * .32), SP.core, a);
  for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU + t * 3; const ph = (t * 1.8 + i / 8) % 1; const rr = r + 16 * (1 - ph); px(ctx, x + Math.cos(ang) * rr - 1, y + Math.sin(ang) * rr - 1, 2, 2, over ? SP.over : SP.light); }
}
class SpiralBall {
  constructor(p, stage, mode, power) {
    const f = p.facing || 1; Object.assign(this, { caster: p, owner: p, team: p.team, stage, mode, power, facing: f, x: p.x + f * 10, z: p.z, h: 110, t: 0, isFinished: false, ticks: new Map(), travelled: 0, exploded: false });
    this.vx = f * (mode === 'lob' ? 260 : 440 - Math.min(stage, 6) * 35); this.vh = mode === 'lob' ? 360 : -320;
    this.r = spiralRadius(stage); this.dmg = spiralDamage(stage) * power; this.range = 360 + stage * 30;
  }
  get y() { return gy(this.z); }
  update(dt, gw) {
    this.t += dt; if (this.exploded) { if (this.t - this.exploded > .45) this.isFinished = true; return; }
    const step = this.vx * dt; this.x += step; this.travelled += Math.abs(step);
    if (this.mode === 'lob') { this.vh -= 900 * dt; this.h = Math.max(0, this.h + this.vh * dt); } else this.h = Math.max(34, this.h + this.vh * dt);
    // Drilling: every foe it overlaps takes ticking hits and is carried along.
    if (this.mode !== 'lob') for (const t of foesOf(gw, this.team)) {
      if (Math.abs(t.x - this.x) > this.r + 12 || Math.abs(((t.z ?? this.z) - this.z) * DEPTH) > this.r + 10) continue;
      const k = this.ticks.get(t) ?? { n: 0, next: 0 }; if (this.t < k.next || k.n >= 5) continue;
      k.n++; k.next = this.t + .12; this.ticks.set(t, k); hit(t, this.dmg / 5, this.facing * 120, 40, .3); if ('kbVelX' in t) t.kbVelX = this.vx * .8;
    }
    for (const o of environment.props) if (o.isSceneObject && !o.isDead && Math.abs(o.x - this.x) < this.r + o.halfX && Math.abs((o.z - this.z) * DEPTH) < this.r + 10 && !this.ticks.has(o)) { this.ticks.set(o, { n: 5 }); o.takeDamage(this.dmg * .5, this.facing * 420, 0, 0, false, 'spell'); }
    const b = gw?.battlefield?.boundsOverride ?? gw?.battlefield?.playableBounds;
    const atWall = b && (this.x < (b.left ?? -1e9) + 10 || this.x > (b.right ?? 1e9) - 10);
    if ((this.mode === 'lob' && this.h <= 0 && this.t > .2) || (this.mode !== 'lob' && this.travelled >= this.range) || atWall) this.explode(gw);
  }
  explode(gw) {
    this.exploded = this.t; const R = 40 + this.stage * 14;
    for (const t of foesOf(gw, this.team)) { const d = Math.hypot(t.x - this.x, ((t.z ?? this.z) - this.z) * DEPTH); if (d < R) hit(t, this.dmg * (this.mode === 'lob' ? .9 : .6) * (1 - d / R * .4), Math.sign(t.x - this.x || this.facing) * 380, 240, .5); }
    if (this.stage >= 5) environment.add('crater', this.x, this.z, { radius: R * .6 });
    combat.shakeCamera(4 + this.stage * 2, .3); combat.spawnShockwave(this.x, this.y - this.h * .3, R, this.stage > 5 ? SP.over : SP.ring);
  }
  render(ctx) {
    const y = this.y - this.h;
    if (this.exploded) { const k = (this.t - this.exploded) / .45; const R = 40 + this.stage * 14; for (let i = 0; i < 3; i++) ring(ctx, this.x, this.y - 10, R * (.4 + k * .8) - i * 8, i % 2 ? SP.light : SP.ring, 4 - i, 1 - k, .5); disc(ctx, this.x, this.y - 20, this.r * (1 - k), SP.core, 1 - k); return; }
    // A trail of rings behind it.
    for (let i = 1; i <= 3; i++) ring(ctx, this.x - this.facing * i * 10, y, this.r * (1 - i * .15), SP.ring, 2, .5 - i * .12, .9);
    drawSpiral(ctx, this.x, y, this.stage, this.t * 2);
  }
}
function growSpiral(p, st) {
  if (st.thrown) return false;
  if (st.stage < SPIRAL.maxStage) { if ((p.freeMana ?? p.mp) < SPIRAL.growMana) { noMana(p); return true; } p.mp -= SPIRAL.growMana; st.stage++; st.pulse = .2; }
  else if (st.stage === SPIRAL.maxStage && (p.focus ?? 0) >= (p.maxFocus ?? 100)) { p.focus = 0; st.stage = 6; st.pulse = .4; combat.spawnDamageText?.(p.x, (p.y ?? 0) - 150, 'ÜBERLADUNG', { color: SP.over }); combat.shakeCamera(5, .2); }
  else { st.pulse = .1; }
  return true;
}
function throwSpiral(p, st, mode, power = 1) {
  if (st.thrown) return false;
  st.thrown = true; emit(new SpiralBall(p, st.stage, mode, power * (st.quality?.power ?? 1)));
  p.state = 'attack3'; p.stateTimer = .3; p._weaponSwingTime = .3; p.canAttack = false;
  endStance(p, 'thrown'); return true;
}
defineSignature('S91', {
  cast(c) {
    const p = c.caster; const st = startStance(p, 'S91', c.quality, { stage: 1, prog: 0, thrown: false, pulse: .2, cd: 0 });
    offerRecast(p, { window: SPIRAL.dur, label: 'WACHSEN (TIPPEN) · WISCHEN WIRFT', valid: () => p.signature === st && !st.thrown, stage2: () => { growSpiral(p, st); return { again: true, label: `SPIRALKERN STUFE ${st.stage}` }; } });
  },
  stance: {
    duration: SPIRAL.dur,
    hint: () => 'SPIRALKERN · TIPPEN: WACHSEN · WISCHEN →: WERFEN · WISCHEN ↑: HOCHWURF',
    attack(p, st, kind) {
      if (kind === 'normal') { if (st.cd > 0) return true; st.cd = .1; return growSpiral(p, st); }
      if (kind === 'heavy') return throwSpiral(p, st, 'straight');
      if (kind === 'uppercut') return throwSpiral(p, st, 'lob');
      return false;
    },
    damageTaken(p, st, amount) { if (amount > 0 && !st.thrown) { combat.spawnDamageText?.(p.x, (p.y ?? 0) - 130, 'ZU FRÜH!', { color: SP.ring }); throwSpiral(p, st, 'straight', .5); } return amount; },
    update(p, st, dt, gw) {
      st.cd = Math.max(0, st.cd - dt); st.pulse = Math.max(0, st.pulse - dt);
      // Allies close by feed the core.
      const allies = (gw?.minions ?? []).filter((m) => m.team === p.team && !m.isDead && Math.hypot(m.x - p.x, ((m.z ?? p.z) - p.z) * DEPTH) < 120).length;
      if (allies && st.stage < SPIRAL.maxStage) { st.prog += dt * .25 * Math.min(3, allies); if (st.prog >= 1) { st.prog = 0; st.stage++; st.pulse = .2; } }
      if (st.timer <= dt && !st.thrown) throwSpiral(p, st, 'straight');
    },
    render(ctx, p, st, ry, layer) {
      if (layer !== 'front' || st.thrown) return;
      const r = spiralRadius(st.stage); const x = p.x; const y = ry - 112 - r;
      // Energy threads from the hands up into the core, the core itself, stage pips.
      for (const sx of [-10, 10]) { ctx.save(); ctx.globalAlpha = .7; ctx.strokeStyle = SP.light; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + sx, ry - 70); ctx.lineTo(x + sx * .3, y + r * .6); ctx.stroke(); ctx.restore(); }
      drawSpiral(ctx, x, y, st.stage, st.t * (2 + st.stage * .4), 1);
      if (st.pulse > 0) ring(ctx, x, y, r + 10 + (1 - st.pulse / .4) * 16, st.stage > 5 ? SP.over : SP.core, 2, st.pulse * 3);
      for (let i = 0; i < 6; i++) px(ctx, x - 17 + i * 6, y - r - 12, 4, 4, i < st.stage ? (i >= 5 ? SP.over : SP.ring) : '#263238');
    }
  }
});

// ── S92 WÄCHTERGEIST-HAGEL ─────────────────────────────────────────────────
const GS = { dark: '#1a0a33', body: '#7e57c2', light: '#d1c4e9', core: '#ffffff', fist: '#b39ddb' };
function guardianTap(p, st, gw) {
  if (st.final) return true;
  st.taps.push(st.t); st.lastTap = st.t; const tempo = tempoOf(st); const reach = Math.min(170, 70 + tempo * 14); const f = p.facing || 1;
  for (let k = 0; k < 2 && st.hits < GUARDIAN.maxHits; k++) {
    st.hits++;
    for (const t of foesOf(gw, p.team)) { const dx = (t.x - p.x) * f; if (dx > 0 && dx < reach && Math.abs(((t.z ?? p.z) - p.z) * DEPTH) < 34) hit(t, GUARDIAN.fistDmg * (st.quality?.power ?? 1), f * 60, 10, .2); }
    st.fists.push({ t: 0, d: 30 + Math.random() * (reach - 30), oy: (Math.random() - .5) * 40 });
  }
  st.reach = reach;
  if (st.hits >= GUARDIAN.maxHits) guardianFinish(p, st, gw);
  return true;
}
function guardianFinish(p, st, gw) {
  if (st.final) return; st.final = st.t; const f = p.facing || 1;
  for (const t of foesOf(gw, p.team)) { const dx = (t.x - p.x) * f; if (dx > -10 && dx < 160 && Math.abs(((t.z ?? p.z) - p.z) * DEPTH) < 40) hit(t, (20 + st.hits * 1.5) * (st.quality?.power ?? 1), f * 500, 260, .6); }
  combat.shakeCamera(10, .3); combat.spawnShockwave(p.x + f * 90, (p.y ?? 0) - 40, 60, GS.light);
  st.timer = Math.min(st.timer, .55);
}
defineSignature('S92', {
  cast(c) {
    const p = c.caster; const st = startStance(p, 'S92', c.quality, { hits: 0, taps: [], lastTap: -9, final: 0, fists: [], reach: 70 });
    offerRecast(p, { window: GUARDIAN.dur, label: 'HÄMMERN!', valid: () => p.signature === st && !st.final, stage2: (gw) => { guardianTap(p, st, gw); return { again: true, label: `HAGEL ×${st.hits}` }; } });
    combat.spawnShockwave?.(p.x - (p.facing || 1) * 20, (p.y ?? 0) - 60, 50, GS.body);
  },
  stance: {
    duration: GUARDIAN.dur,
    hint: () => 'WÄCHTERGEIST · HÄMMERN: FAUSTHAGEL · PAUSE / WISCHEN: SCHLUSSSCHLAG',
    attack(p, st, kind, gw) {
      if (kind === 'normal') return guardianTap(p, st, gw);
      if ((kind === 'heavy' || kind === 'uppercut') && st.hits > 0) { guardianFinish(p, st, gw); return true; }
      return false;
    },
    update(p, st, dt, gw) {
      for (const fi of st.fists) fi.t += dt; st.fists = st.fists.filter((fi) => fi.t < .18);
      if (st.hits > 0 && !st.final && st.t - st.lastTap > GUARDIAN.idle) guardianFinish(p, st, gw);
      // While it punches, shots in front are stopped by the spirit.
      if (st.t - st.lastTap < .5) for (const pr of projectilesOf(gw)) { const dx = (pr.x - p.x) * (p.facing || 1); if (pr.team !== p.team && dx > 0 && dx < 70 && Math.abs(((pr.z ?? p.z) - p.z) * DEPTH) < 40) { pr.isFinished = true; if ('life' in pr) pr.life = 0; } }
    },
    render(ctx, p, st, ry, layer) {
      const f = p.facing || 1; const fade = Math.min(1, st.t / .25, st.timer / .4 + .1);
      if (layer === 'back') {
        // The guardian spirit rises behind the Wizard: torso, head, two huge arms.
        const sx = p.x - f * 18; const sy = ry - 60; const bob = Math.sin(st.t * 3) * 2;
        ctx.save(); ctx.globalAlpha = .82 * fade;
        disc(ctx, sx, sy - 42 + bob, 15, GS.dark); disc(ctx, sx, sy - 42 + bob, 12, GS.body); px(ctx, sx + f * 3, sy - 46 + bob, 4, 3, GS.core);
        ctx.fillStyle = GS.body; ctx.beginPath(); ctx.moveTo(sx - 26, sy - 24 + bob); ctx.lineTo(sx + 26, sy - 24 + bob); ctx.lineTo(sx + 14, sy + 30); ctx.lineTo(sx - 14, sy + 30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = GS.dark; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
        return;
      }
      // Fist afterimages flying forward with every tap; the finishing slam.
      for (const fi of st.fists) { const k = fi.t / .18; const fx = p.x + f * (14 + fi.d * Math.min(1, k * 2)); const fy = ry - 54 + fi.oy; ctx.save(); ctx.globalAlpha = (1 - k) * fade; disc(ctx, fx, fy, 9, GS.dark); disc(ctx, fx, fy, 7, GS.fist); px(ctx, fx + f * 3, fy - 4, 3, 8, GS.light); ctx.restore(); }
      if (st.final) { const k = Math.min(1, (st.t - st.final) / .3); const fx = p.x + f * (20 + 90 * k); disc(ctx, fx, ry - 50, 22 * (1.2 - k * .2), GS.dark, 1 - k * .5); disc(ctx, fx, ry - 50, 18, GS.body, 1 - k * .5); }
      if (st.hits > 0 && !st.final) { ctx.save(); ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = GS.light; ctx.fillText(`×${st.hits}`, p.x, ry - 120); ctx.restore(); }
    }
  }
});

// ── S93 TAUSENDSTICH ───────────────────────────────────────────────────────
function stab(p, st, gw) {
  if (st.final) return true;
  st.taps.push(st.t); st.lastTap = st.t; const tempo = tempoOf(st); const reach = Math.min(230, 90 + tempo * 18); const f = p.facing || 1; st.stabs++;
  const oy = ((st.stabs * 37) % 30) - 15;
  for (const t of foesOf(gw, p.team)) { const dx = (t.x - p.x) * f; if (dx > 0 && dx < reach && Math.abs(((t.z ?? p.z) - p.z) * DEPTH) < 26) hit(t, THOUSAND.stabDmg * (st.quality?.power ?? 1), f * 50, 10, .15); }
  st.lines.push({ t: 0, reach, oy }); st.reach = reach;
  if (st.stabs >= THOUSAND.maxStabs) thousandFinish(p, st, gw);
  return true;
}
function thousandFinish(p, st, gw) {
  if (st.final) return; st.final = st.t; const f = p.facing || 1;
  for (const t of foesOf(gw, p.team)) { const dx = (t.x - p.x) * f; if (dx > -10 && dx < 320 && Math.abs(((t.z ?? p.z) - p.z) * DEPTH) < 30) hit(t, (30 + st.stabs * 1.2) * (st.quality?.power ?? 1), f * 420, 120, .5); }
  combat.shakeCamera(8, .25); st.timer = Math.min(st.timer, .5);
}
defineSignature('S93', {
  cast(c) {
    const p = c.caster; const st = startStance(p, 'S93', c.quality, { stabs: 0, taps: [], lastTap: -9, final: 0, lines: [], reach: 90 });
    offerRecast(p, { window: THOUSAND.dur, label: 'HÄMMERN!', valid: () => p.signature === st && !st.final, stage2: (gw) => { stab(p, st, gw); return { again: true, label: `STICHE ×${st.stabs}` }; } });
  },
  stance: {
    duration: THOUSAND.dur,
    hint: () => 'TAUSENDSTICH · HÄMMERN: STICHHAGEL · PAUSE / WISCHEN: DURCHSTOSS',
    attack(p, st, kind, gw) {
      if (kind === 'normal') return stab(p, st, gw);
      if ((kind === 'heavy' || kind === 'uppercut') && st.stabs > 0) { thousandFinish(p, st, gw); return true; }
      return false;
    },
    update(p, st, dt, gw) { for (const l of st.lines) l.t += dt; st.lines = st.lines.filter((l) => l.t < .16); if (st.stabs > 0 && !st.final && st.t - st.lastTap > THOUSAND.idle) thousandFinish(p, st, gw); },
    render(ctx, p, st, ry, layer) {
      if (layer !== 'front') return;
      const f = p.facing || 1; const col = WEAPONS[p.weapon ?? p.classWeapon]?.accent ?? '#ffe082';
      for (const l of st.lines) { const k = l.t / .16; const x0 = p.x + f * 14; const x1 = p.x + f * l.reach; const y = ry - 48 + l.oy; ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore(); px(ctx, x1 - 2, y - 2, 4, 4, '#fff8e1'); }
      if (st.final) { const k = Math.min(1, (st.t - st.final) / .3); ctx.save(); ctx.globalAlpha = 1 - k; px(ctx, Math.min(p.x, p.x + f * 320), ry - 52, 320, 8, col); px(ctx, Math.min(p.x, p.x + f * 320), ry - 50, 320, 3, '#ffffff'); ctx.restore(); }
      if (st.stabs > 0 && !st.final) { ctx.save(); ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.fillText(`×${st.stabs}`, p.x, ry - 120); ctx.restore(); }
    }
  }
});
