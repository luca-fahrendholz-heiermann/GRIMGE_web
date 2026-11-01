// GRIMGE Prototype — S95 NULLKLINGE (anti-magic; user, 1 Nov 2026: "Anti-Magie — durch Schnitt die anderen Spells
// zerstören wie bei Black Clover" — own adaptation, own name and look). A stance for 12 s: a jagged obsidian blade
// wrapped in ash covers the weapon (bare hands: a broad blade appears in the hand).
//   EVERY SWING   cuts hostile magic in the swing arc: shots, beams, walls and summons are negated / broken; a cut
//                 inside a hostile domain shatters the domain. Foes hit lose their shields and active stance.
//   CHARGE →      NULLSCHNITT — a black crescent runs down the lane and erases every hostile spell it passes.
//   CHARGE ↑      NULLWIRBEL — a spin that erases hostile magic all around.
//   CHARGE ↓      ASCHENMANTEL — for 2 s every hostile shot that touches the Wizard dissolves.
import { defineSignature, startStance, emit, foesOf, hit, sigSink, TAU, DEPTH, endStance } from './signature_core.js';
import { combat } from './combat.js';
import { groundYForDepth } from './world.js';
import { activeDomains } from './signature_abilities_g.js';

export const NULL = Object.freeze({ dur: 12, reach: 78, waveLen: 440, spin: 120, mantle: 2 });
const gy = (z) => groundYForDepth(z);
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
const INK = '#050505'; const ASH = '#e0e0e0'; const DIM = '#2b2b2b'; const TEAL = '#4dd0a7';

// Where a spell is (projectiles keep their own x in px, beams span originX … tipX).
const posOf = (s) => ({ x: s.px ?? s.x, z: s.z ?? s.targetZ ?? null });
// Negate one hostile spell; true when something was erased.
function negate(s, gw) {
  if (s.isFinished) return false;
  if (s.isBeam) { s.end?.('negated'); return true; }
  if (s.isStoneWall) { s.hp = 0; s.life = 0; return true; }
  if (s.isSummon) { s.takeDamage?.(70); return true; }
  if (s.collapse && s.R) { s.collapse(); return true; } // a domain
  s.isFinished = true; if ('life' in s) s.life = 0;
  return true;
}
function burst(x, z, color = ASH) { const y = gy(z) - 40; combat.spawnHitSparks?.(x, y, 1, color, 10); combat.spawnShockwave?.(x, y, 26, INK); }
// Erase every hostile spell for which inside(x, z, spell) holds. Returns the count.
export function eraseHostileMagic(p, gw, inside) {
  const sys = sigSink(); let n = 0;
  for (const s of [...(sys?.activeSpells ?? [])]) {
    if (!s || s.team === p.team || !s.team || s.isVisualOnly || s.isFinished) continue;
    if (s.collapse && s.R) continue; // domains: handled below (a cut inside shatters them)
    if (s.isBeam) { const a = Math.min(s.originX, s.tipX); const b = Math.max(s.originX, s.tipX); const cx = Math.max(a, Math.min(b, p.x)); if (inside(cx, s.z, s) && negate(s, gw)) { burst(cx, s.z, s.profile?.color); n++; } continue; }
    const { x, z } = posOf(s); if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    if (inside(x, z, s) && negate(s, gw)) { burst(x, z, s.color ?? s.mat?.edge); n++; }
  }
  for (const s of sys?.activeSummons ?? []) if (s.team !== p.team && !s.isDead && inside(s.x, s.z, s)) { s.takeDamage?.(70); burst(s.x, s.z); n++; }
  for (const pr of gw?.projectiles ?? []) if (pr.team !== p.team && pr.life > 0 && inside(pr.x, pr.z, pr)) { pr.life = 0; burst(pr.x, pr.z); n++; }
  if (n) combat.spawnDamageText?.(p.x, (p.y ?? 0) - 96, n > 1 ? `${n}× NEGIERT` : 'NEGIERT', { color: ASH, isCrit: n > 2 });
  return n;
}
// A cut inside a hostile domain shatters it.
function shatterDomains(p) {
  let n = 0;
  for (const d of activeDomains()) if (d.team !== p.team && d.collapseT == null && d.inside?.(p)) { d.collapse(); n++; combat.spawnDamageText?.(p.x, (p.y ?? 0) - 120, 'SPHÄRE ZERSCHNITTEN', { color: TEAL, isCrit: true }); combat.shakeCamera?.(10, .3); }
  return n;
}
// Foes hit by the blade lose their shields and their running stance (anti-magic strips magic off them).
function strip(t) {
  if (t.arcaneShield > 0) t.arcaneShield = 0;
  if (t.ward > 0) t.ward = 0;
  if (t.signature) endStance(t, 'negated');
}

function swingCut(p, st, gw, big = false) {
  const f = p.facing || 1; const reach = NULL.reach * (big ? 1.3 : 1);
  const n = eraseHostileMagic(p, gw, (x, z) => { const dx = (x - p.x) * f; return dx > -14 && dx < reach && Math.abs((z - p.z) * DEPTH) < 40; });
  shatterDomains(p);
  for (const t of foesOf(gw, p.team)) { const dx = (t.x - p.x) * f; if (dx > -10 && dx < reach && Math.abs(((t.z ?? p.z) - p.z) * DEPTH) < 34) strip(t); }
  st.cuts.push({ t: 0, f, big, n });
  return n;
}

class NullWave {
  constructor(p, power) { Object.assign(this, { caster: p, owner: p, team: p.team, x: p.x, z: p.z, f: p.facing || 1, t: 0, power, isFinished: false, hit: new Set(), fineVfx: true }); }
  get y() { return gy(this.z); }
  get front() { return this.x + this.f * (24 + NULL.waveLen * Math.min(1, this.t / .55)); }
  update(dt, gw) {
    const prev = this.front; this.t += dt; const now = this.front;
    const a = Math.min(prev, now) - 20; const b = Math.max(prev, now) + 20;
    eraseHostileMagic(this.caster, gw, (x, z) => x >= a && x <= b && Math.abs((z - this.z) * DEPTH) < 46);
    for (const t of foesOf(gw, this.team)) { if (this.hit.has(t)) continue; if (t.x >= a && t.x <= b && Math.abs(((t.z ?? this.z) - this.z) * DEPTH) < 40) { this.hit.add(t); hit(t, Math.round(26 * this.power), this.f * 260, 90, .4); strip(t); if ('spellCooldown' in t) t.spellCooldown = Math.max(t.spellCooldown, 2); } }
    if (this.t > .8) this.isFinished = true;
  }
  render(ctx) {
    const x = this.front; const y = this.y - 40; const f = this.f; const a = Math.max(0, Math.min(1, (.8 - this.t) / .25));
    ctx.save(); ctx.globalAlpha = a;
    // A black crescent with an ash edge and teal cracks, a trail of black shards behind it.
    for (let i = -22; i <= 22; i += 2) { const k = 1 - Math.abs(i) / 22; const w = Math.round(4 + 10 * k); px(ctx, x - f * (6 * (1 - k)) - (f > 0 ? w : 0), y + i, w, 2, INK); px(ctx, x - f * (6 * (1 - k)) + (f > 0 ? 0 : -2), y + i, 2, 2, ASH); }
    for (let q = 0; q < 5; q++) px(ctx, x - f * (8 + q * 5), y - 14 + q * 7, 3, 1, TEAL);
    for (let q = 0; q < 8; q++) { const d = (q * 23 + this.t * 300) % 140; px(ctx, x - f * (20 + d), y + Math.sin(q * 2.1) * 16, 3, 3, q % 2 ? INK : DIM); }
    ctx.restore();
  }
}

defineSignature('S95', {
  cast(c) { startStance(c.caster, 'S95', c.quality, { cuts: [], mantle: 0 }); combat.spawnShockwave?.(c.caster.x, (c.caster.y ?? 0) - 40, 60, INK); combat.spawnDamageText?.(c.caster.x, (c.caster.y ?? 0) - 100, 'NULLKLINGE', { color: ASH, isCrit: true }); },
  stance: {
    duration: NULL.dur,
    hint: () => 'NULLKLINGE · JEDER SCHLAG NEGIERT MAGIE · → NULLSCHNITT · ↑ NULLWIRBEL · ↓ ASCHENMANTEL',
    onEvent(p, st, type, info, gw) { if (type === 'attack') swingCut(p, st, gw, (info.step ?? 1) >= 3); },
    charge(p, st, dir, ratio, gw) {
      const k = Math.max(.4, Math.min(1, ratio ?? .6)); const pow = k * (st.quality?.power ?? 1);
      if (dir === 'forward' || dir === 'back') { swingCut(p, st, gw, true); emit(new NullWave(p, pow)); combat.shakeCamera?.(6, .2); p.state = 'heavyStrike'; p.stateTimer = .35; p._weaponSwingTime = .35; return true; }
      if (dir === 'up') {
        eraseHostileMagic(p, gw, (x, z) => Math.hypot(x - p.x, (z - p.z) * DEPTH) < NULL.spin); shatterDomains(p);
        for (const t of foesOf(gw, p.team)) if (Math.hypot(t.x - p.x, ((t.z ?? p.z) - p.z) * DEPTH) < NULL.spin * .8) { hit(t, Math.round(18 * pow), (Math.sign(t.x - p.x) || 1) * 220, 160, .35); strip(t); }
        st.spin = .45; combat.shakeCamera?.(7, .25); p.state = 'uppercut'; p.stateTimer = .4; p._weaponSwingTime = .4; return true;
      }
      if (dir === 'down') { st.mantle = NULL.mantle; combat.spawnDamageText?.(p.x, (p.y ?? 0) - 100, 'ASCHENMANTEL', { color: ASH }); p.state = 'heavyStrike'; p.stateTimer = .25; p._weaponSwingTime = .25; return true; }
      return false;
    },
    update(p, st, dt) {
      for (const c of st.cuts) c.t += dt; st.cuts = st.cuts.filter((c) => c.t < .3);
      st.spin = Math.max(0, (st.spin ?? 0) - dt);
      if (st.mantle > 0) { st.mantle -= dt; const gw = window.gameWorld; eraseHostileMagic(p, gw, (x, z, s) => !s?.isStoneWall && !s?.isSummon && Math.hypot(x - p.x, (z - p.z) * DEPTH) < 46); }
    },
    cloak: (p, st) => ({ edge: '#1a1a1a', inner: st.mantle > 0 ? '#e0e0e0' : '#4dd0a7', fade: Math.min(1, st.t / .3, st.timer / .4 + .2) * .8 }),
    render(ctx, p, st, ry, layer) {
      const f = p.facing || 1; const fade = Math.min(1, st.t / .3, st.timer / .4 + .2);
      if (layer === 'back') {
        // Ash flakes drifting up off the shoulders; the mantle as a ring of black shards.
        ctx.save(); ctx.globalAlpha = fade;
        for (let q = 0; q < 7; q++) { const life = (st.t * .7 + q / 7) % 1; px(ctx, p.x - f * 8 + Math.sin(q * 2.3 + life * 6) * 12, ry - 60 - life * 50, 2, 2, life < .5 ? ASH : DIM); }
        if (st.mantle > 0) for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + st.t * 3; px(ctx, p.x + Math.cos(a) * 30, ry - 40 + Math.sin(a) * 40, 3, 3, i % 2 ? INK : ASH); }
        ctx.restore(); return;
      }
      ctx.save(); ctx.globalAlpha = fade;
      // The obsidian blade in the hand: a jagged broad blade, ash edge, teal cracks (crisp pixel plates).
      const hx = p.x + f * 14; const hy = ry - 46; const L = 46; const swing = st.cuts.length ? Math.min(1, st.cuts[st.cuts.length - 1].t / .12) : 0;
      const ang = (-1.1 + swing * 1.9) * 1; const ca = Math.cos(ang); const sa = Math.sin(ang);
      for (let i = 0; i < L; i += 2) { const w = i < 6 ? 4 : Math.round(7 - (i / L) * 4 + ((i / 4) % 2 ? 1 : 0)); const bx = hx + f * ca * i; const by = hy + sa * i; px(ctx, bx - 1, by - w / 2, 3, w, INK); px(ctx, bx - 1, by - w / 2, 3, 1, ASH); if (i % 10 === 4) px(ctx, bx, by, 2, 1, TEAL); }
      px(ctx, hx - 5, hy - 2, 10, 4, DIM); px(ctx, hx - 5, hy - 2, 10, 1, ASH);
      // Cut arcs: a black slash with an ash rim.
      for (const c of st.cuts) {
        const k = c.t / .3; const R = c.big ? 64 : 48; const a0 = -1.3; const a1 = a0 + 2.4 * Math.min(1, k * 3);
        ctx.globalAlpha = fade * (1 - k);
        for (let a = a0; a <= a1; a += .06) { const x = p.x + c.f * (12 + Math.cos(a) * R); const y = ry - 40 + Math.sin(a) * R * .8; px(ctx, x - 2, y - 2, 4, 4, INK); px(ctx, x - 2, y - 3, 4, 1, ASH); }
      }
      if (st.spin > 0) { ctx.globalAlpha = fade * (st.spin / .45); for (let a = 0; a < TAU; a += .08) { const x = p.x + Math.cos(a + st.t * 20) * NULL.spin * .6; const y = ry - 30 + Math.sin(a + st.t * 20) * NULL.spin * .2; px(ctx, x - 2, y - 2, 4, 4, a % .32 < .16 ? INK : ASH); } }
      ctx.restore();
    }
  }
});
