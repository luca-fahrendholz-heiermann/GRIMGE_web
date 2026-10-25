// GRIMGE Prototype — guided chains (user, 23 Oct 2026; Fähigkeiten-Atlas II, chapter 3).
// A special rune that HITS opens a chain of scripted, heavy beats. Every beat is confirmed by
// the player: a tap (attack) or a swipe in the beat's direction, inside a short window after
// the previous beat. Confirmed beats raise the damage (up to ×1.6); a missed window ends the
// chain at once (no long recovery). Chains COMPLEMENT the manual combo (attack 1–3, finisher,
// launcher, air combo) — they are the special highlight and cost mana.
//
// Fairness: a chain lasts at most ~2.5 s, the Wizard is only invulnerable during the beat
// animations (not in the windows), and the target is released the moment the chain ends.
//
// S88 SCHATTENREIGEN (blades / ninja): a kunai — on a hit:
//   1 SCHATTENSCHRITT-SALTO  (tap)          appear in front of the foe, back-flip slash
//   2 ANSTURM                (tap / swipe →) dash through the foe
//   3 HOCHSCHLAG             (tap / swipe ↑) launch, follow it up
//   4–6 LUFTSCHNITT          (tap ×3)        three cuts in the air
//   7 ERDHAMMER              (tap / swipe ↓) both crash down, the ground shocks around
import { defineSignature, emit, SigSequence, foesOf, TAU, DEPTH } from './signature_core.js';
import { drawSpellSprite, spellSheetReady } from './spell_visuals.js';
import { combat } from './combat.js';
import { groundYForDepth, clampToArena } from './world.js';
import { setStatusSource } from './status_effects.js';
import { ghostOf } from './buff_signatures.js';

const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;
const lerp = (a, b, u) => a + (b - a) * Math.max(0, Math.min(1, u));
const ease = (u) => 1 - (1 - Math.max(0, Math.min(1, u))) ** 3;
export const CHAIN_RULES = Object.freeze({ firstWindow: .8, window: .55, bufferFrom: .55, multPerBeat: .1, maxMult: 1.6 });

// Training aid only (like the finisher ring): beat names and input hints.
const guideShown = () => globalThis.window?.gameWorld?.activeMode?.id === 'training';

export class GuidedChain {
  constructor(player, target, def, quality = null) {
    this.p = player; this.target = target; this.def = def; this.quality = quality;
    this.index = 0; this.phase = 'window'; this.t = 0; this.windowLeft = CHAIN_RULES.firstWindow; this.buffered = null;
    this.confirmed = 0; this.ghosts = []; this.slashes = []; this.ended = false; this.rot = 0;
    this.f = Math.sign(target.x - player.x) || player.facing || 1;
    this.holdTarget(CHAIN_RULES.firstWindow + .2);
    if (guideShown()) combat.spawnDamageText(target.x, (target.y ?? 0) - 100, `${def.name} · ${this.hint(0)}`, { color: '#b39ddb' });
  }
  get beat() { return this.def.beats[this.index]; }
  get mult() { return Math.min(CHAIN_RULES.maxMult, 1 + this.confirmed * CHAIN_RULES.multPerBeat); }
  hint(i) { const b = this.def.beats[i]; if (!b) return ''; return b.accept.includes('uppercut') ? 'TIPP / WISCH ↑' : b.accept.includes('dive') ? 'TIPP / WISCH ↓' : b.accept.includes('heavy') ? 'TIPP / WISCH →' : 'TIPP'; }
  holdTarget(sec) { const t = this.target; if (!alive(t)) return; t.freeze?.(sec); t.kbVelX = 0; }
  // An input during the chain (returns true: the chain owns every attack input while it runs).
  press(kind) {
    if (this.ended) return false;
    const b = this.beat; if (!b) return true;
    const ok = b.accept.includes(kind) || kind === 'normal';
    if (this.phase === 'window') { if (ok) this.startBeat(); return true; }
    // During a beat: a late press is remembered for the next beat (no stutter); early mashing is ignored.
    if (this.phase === 'beat' && this.t >= this.def.beats[this.index - 1].dur * CHAIN_RULES.bufferFrom) this.buffered = kind;
    return true;
  }
  startBeat() {
    const b = this.beat; this.phase = 'beat'; this.t = 0; this.buffered = null; this.hitDone = false; this.confirmed++;
    this.from = { x: this.p.x, h: this.p.elevation ?? 0, th: this.target.elevation ?? 0 };
    this.p.invulnerableTimer = Math.max(this.p.invulnerableTimer ?? 0, b.dur);
    this.holdTarget(b.dur + CHAIN_RULES.window + .15);
    b.start?.(this, b);
    this.index++;
  }
  // Deal the beat's hit (damage grows with the confirmed beats).
  strike(t, dmg, kx = 0, lift = 0, stun = .3, elements = ['umbra']) {
    if (!alive(t)) return;
    const prev = setStatusSource({ team: this.p.team, statusElements: elements, castBy: this.p, statusChance: .3 });
    try { t.takeDamage?.(Math.round(dmg * this.mult * (this.quality?.power ?? 1)), kx, lift, stun, false, 'melee'); } finally { setStatusSource(prev); }
    combat.spawnHitSparks?.(t.x, (t.y ?? 0) - 40 - (t.elevation ?? 0), this.p.facing || 1, '#e1bee7', 10);
    combat.triggerHitstop?.(3); combat.shakeCamera?.(3, .08);
  }
  ghost() { this.ghosts.push({ x: this.p.x, y: groundYForDepth(this.p.z) - (this.p.elevation ?? 0), t: 0, f: this.p.facing || 1, state: this.p.state }); }
  update(dt, gw) {
    if (this.ended) return;
    const p = this.p; const t = this.target;
    for (const g of this.ghosts) g.t += dt; this.ghosts = this.ghosts.filter((g) => g.t < .3);
    for (const s of this.slashes) s.t += dt; this.slashes = this.slashes.filter((s) => s.t < .22);
    if (!alive(t) || !p.isAlive) { this.end(alive(t) ? 'down' : 'done'); return; }
    // Hit in a window (the Wizard is not invulnerable there): the chain breaks.
    if (p.state === 'hurt') { this.end('interrupted'); return; }
    // The Wizard is held by the chain: no own movement, no gravity (getEffectiveGravity).
    p.vx = 0; p.vz = 0; p.vElevation = 0; p.canAttack = false;
    p.stateTimer = Math.max(p.stateTimer ?? 0, .05);
    if (this.phase === 'window') {
      if ((this.windowLeft -= dt) <= 0) this.end(this.index === 0 ? 'unused' : 'missed');
      return;
    }
    this.t += dt; const prevBeat = this.def.beats[this.index - 1]; const u = this.t / prevBeat.dur;
    prevBeat.tick?.(this, u, dt, gw);
    clampToArena(p, gw?.battlefield?.boundsOverride ?? null);
    if (u >= 1) {
      if (this.index >= this.def.beats.length) { this.end('complete'); return; }
      this.phase = 'window'; this.windowLeft = CHAIN_RULES.window; this.rot = 0;
      if (this.buffered) this.startBeat();
    }
  }
  end(reason) {
    if (this.ended) return; this.ended = true;
    const p = this.p; const t = this.target;
    p.guidedChain = null; p.canAttack = true; p.state = p.grounded ? 'idle' : 'fall'; p.stateTimer = 0; this.rot = 0;
    if (alive(t)) { t.freezeTimer = Math.min(t.freezeTimer ?? 0, .1); if ((t.elevation ?? 0) > 0) t.vElevation = Math.min(t.vElevation ?? 0, 0); }
    if (reason === 'complete') combat.spawnDamageText(p.x, (p.y ?? 0) - 120, `${this.def.name} ×${this.mult.toFixed(1)}`, { color: '#e1bee7', isCrit: true });
    else if (reason === 'missed' && guideShown()) combat.spawnDamageText(p.x, (p.y ?? 0) - 110, 'KETTE VERPASST', { color: '#9e9e9e' });
    this.reason = reason; p.lastChainResult = { reason, beats: this.confirmed };
  }
  // Drawn with the Wizard (entities.js): afterimages, slashes, the beat glint (every mode), the hint (Training).
  render(ctx, renderY) {
    const p = this.p;
    for (const g of this.ghosts) ghostOf(ctx, p, g.x, g.y, g.state, p.animTime ?? 0, g.f, .5 * (1 - g.t / .3), '#7e57c2');
    if (spellSheetReady('shadow_slash')) for (const s of this.slashes) drawSpellSprite(ctx, 'shadow_slash', Math.min(5, Math.floor(s.t / .22 * 6)), s.x, s.y, { anchor: 'center', scale: Math.max(.6, s.r / 30), flip: (p.facing || 1) < 0 });
    for (const s of spellSheetReady('shadow_slash') ? [] : this.slashes) {
      const a = 1 - s.t / .22; ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'butt';
      for (const [col, w] of [['#311b92', 6], ['#ede7f6', 2]]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(Math.round(s.x), Math.round(s.y), s.r, s.a0, s.a1); ctx.stroke(); }
      ctx.restore();
    }
    if (this.phase === 'window' && !this.ended) {
      // The weapon flashes: the moment to confirm the next beat.
      const x = Math.round(p.x + (p.facing || 1) * 16); const y = Math.round(renderY - 52); const s = 5;
      ctx.save(); ctx.fillStyle = '#ede7f6'; ctx.fillRect(x - s, y - 1, s * 2, 2); ctx.fillRect(x - 1, y - s, 2, s * 2); ctx.fillStyle = '#b39ddb'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.restore();
      if (guideShown()) {
        const b = this.beat; ctx.save(); ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.fillStyle = '#e1bee7';
        const label = `${this.index + 1}/${this.def.beats.length} ${b?.name ?? ''} · ${this.hint(this.index)}`; ctx.strokeText(label, p.x, renderY - 132); ctx.fillText(label, p.x, renderY - 132); ctx.restore();
      }
    }
  }
}

// ── S88 SCHATTENREIGEN ──
const AIR = 92; // the height of the air beats
const slashAt = (c, x, y, r, a0, a1) => c.slashes.push({ x, y, r, a0, a1, t: 0 });
export const SCHATTENREIGEN = Object.freeze({
  name: 'SCHATTENREIGEN',
  beats: [
    { name: 'SCHATTENSCHRITT-SALTO', accept: ['normal'], dur: .34,
      start(c) { c.ghost(); const t = c.target; c.p.x = t.x - c.f * 34; c.p.facing = c.f; c.p.state = 'attack1'; },
      tick(c, u) { c.rot = -c.f * Math.PI * 2 * ease(u); c.p.elevation = Math.sin(Math.min(1, u) * Math.PI) * 26; c.p.grounded = c.p.elevation <= 0;
        if (!c.hitDone && u >= .5) { c.hitDone = true; c.strike(c.target, 18, c.f * 40, 120, .3); slashAt(c, c.target.x, groundYForDepth(c.target.z) - 44, 16, -2.4, .6); } } },
    { name: 'ANSTURM', accept: ['normal', 'heavy'], dur: .22,
      start(c) { c.ghost(); c.p.state = 'dash'; c.dashFrom = c.p.x; },
      tick(c, u) { c.p.x = lerp(c.dashFrom, c.target.x + c.f * 36, ease(u)); if (Math.random() < .6) c.ghost();
        if (!c.hitDone && u >= .5) { c.hitDone = true; c.strike(c.target, 20, c.f * 30, 0, .3); slashAt(c, c.target.x, groundYForDepth(c.target.z) - 40, 20, -.4, .4); }
        if (u >= 1) { c.p.facing = -c.f; } } },
    { name: 'HOCHSCHLAG', accept: ['normal', 'uppercut'], dur: .3,
      start(c) { c.p.state = 'uppercut'; c.f = -c.f; },
      tick(c, u) {
        if (!c.hitDone && u >= .2) { c.hitDone = true; c.strike(c.target, 22, 0, 0, .4); slashAt(c, c.target.x, groundYForDepth(c.target.z) - 40, 18, -1.9, -.2); }
        const k = ease(Math.max(0, (u - .2) / .8)); c.target.elevation = lerp(c.from.th, AIR, k); c.target.vElevation = 0;
        c.p.elevation = lerp(c.from.h, AIR - 10, k); c.p.grounded = false; c.p.x = lerp(c.p.x, c.target.x - c.f * 30, .25); } },
    ...[1, 2, 3].map((n) => ({ name: `LUFTSCHNITT ${n}/3`, accept: ['normal'], dur: .2,
      start(c) { c.p.state = n % 2 ? 'attack2' : 'attack1'; c.p.grounded = false; },
      tick(c, u) { c.target.elevation = AIR; c.target.vElevation = 0; c.p.elevation = AIR - 10; c.p.x = c.target.x - c.f * 30;
        if (!c.hitDone && u >= .4) { c.hitDone = true; c.strike(c.target, 12, 0, 0, .25); const ty = groundYForDepth(c.target.z) - AIR - 40; slashAt(c, c.target.x, ty, 15, n % 2 ? -2.2 : .9, n % 2 ? .4 : 3.4); } } })),
    { name: 'ERDHAMMER', accept: ['normal', 'dive'], dur: .3,
      start(c) { c.p.state = 'dive'; },
      tick(c, u, dt, gw) {
        const k = ease(Math.min(1, u / .5)); c.target.elevation = lerp(AIR, 0, k); c.p.elevation = lerp(AIR - 10, 0, k); c.target.vElevation = 0; c.p.grounded = c.p.elevation <= 0;
        if (!c.hitDone && u >= .5) {
          c.hitDone = true; c.p.elevation = 0; c.p.grounded = true; c.target.elevation = 0;
          c.strike(c.target, 38, c.f * 260, 160, .6);
          for (const o of foesOf(gw, c.p.team)) if (o !== c.target && Math.hypot(o.x - c.target.x, ((o.z ?? 0) - (c.target.z ?? 0)) * DEPTH) < 90) c.strike(o, 18, Math.sign(o.x - c.target.x || 1) * 220, 120, .4);
          combat.spawnShockwave?.(c.target.x, groundYForDepth(c.target.z) - 4, 90, '#7e57c2'); combat.shakeCamera?.(10, .3); combat.triggerHitstop?.(6);
        } } }
  ]
});

// The rune: a kunai flies; on a hit the chain opens.
defineSignature('S88', {
  cast(c) {
    const p = c.caster; const f = p.facing || 1; const x0 = p.x + f * 20; const z0 = p.z; const hitSet = new Set();
    p.state = 'heavyStrike'; p.stateTimer = .2; p._weaponSwingTime = .2; p.vx = 0; p.vz = 0;
    emit(new SigSequence(c.sig, p, { dur: .5, x: x0, z: z0, data: { kx: x0, done: false }, tick: (s, dt, gw) => {
      if (s.done) return; s.kx += f * 900 * dt;
      const t = foesOf(gw, p.team).find((o) => !hitSet.has(o) && !o.isObjective && Math.abs(o.x - s.kx) < 18 && Math.abs(((o.z ?? z0) - z0) * DEPTH) < 32);
      if (t) {
        s.done = true; hitSet.add(t);
        if (!p.guidedChain && p.isAlive) { p.guidedChain = new GuidedChain(p, t, SCHATTENREIGEN, c.quality); combat.spawnHitSparks?.(t.x, (t.y ?? 0) - 40, f, '#b39ddb', 8); }
      }
      if (Math.abs(s.kx - x0) > 290) s.done = true;
    }, draw: (ctx, s) => {
      if (s.done) return; const y = groundYForDepth(z0) - 42; const x = Math.round(s.kx);
      ctx.save(); ctx.fillStyle = '#1b1035'; ctx.fillRect(x - f * 10, y - 1, 10, 3); ctx.fillStyle = '#d1c4e9'; ctx.beginPath(); ctx.moveTo(x + f * 6, y + .5); ctx.lineTo(x, y - 3); ctx.lineTo(x, y + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7e57c2'; ctx.fillRect(x - f * 26, y, 14, 1); ctx.restore();
    } }), c.quality);
  }
});

export const guidedChainOf = (p) => p?.guidedChain ?? null;
