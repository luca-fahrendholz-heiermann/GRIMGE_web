// GRIMGE Prototype — S94 BLUTFINSTERNIS (Fähigkeiten-Atlas II: a blood-weapon stance after the Oni-blood idea —
// own adaptation; user, 24 Oct 2026: "Blutfinsternis auch"). A stance for 15 s:
//   TAP          a blood shot — costs 2 HP. The blood weapon takes the form of the held weapon: bare hands = two
//                blood pistols (a quick double shot), bows / crossbows = a piercing blood arrow, blades = a flying
//                blood crescent. The lower the HP, the harder every shot (up to ×2.5). Shots can make foes bleed.
//   CHARGE ↑     ERWACHEN — a wave of blood fire rolls down the lane, stronger the less HP you have.
//   CHARGE →     BLUTSALVE — a fan of five blood shots (costs 6 HP).
//   CHARGE ↓     BLUTSTILLUNG — heals for every bleeding foe nearby and drinks the blood puddles around you
//                (S90 Blutschirm leaves them).
// Charges cost mana like every stance skill (entities.js CHARGE_SKILL_MANA).
import { defineSignature, startStance, emit, foesOf, hit, SigBolt, TAU, DEPTH } from './signature_core.js';
import { applyStatus, hasStatus } from './status_effects.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';
import { WEAPONS } from './weapons.js';

export const ECLIPSE = Object.freeze({ dur: 15, shotHp: 2, salvoHp: 6, shotDmg: 10, maxMult: 2.5 });
const BLOODMAT = { kind: 'crystal', dark: '#2a0006', body: '#b71c1c', facet: '#e53935', vein: '#7f0000', edge: '#ff8a80', spark: '#ff5252', core: '#ffebee', glow: 'rgba(183,28,28,', edgeGlow: 'rgba(255,138,128,' };
const gy = (z) => groundYForDepth(z);
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
// The lower the HP, the stronger (1 at full HP … maxMult near 0).
export const eclipseMult = (p) => 1 + (ECLIPSE.maxMult - 1) * (1 - Math.max(0, Math.min(1, p.hp / (p.maxHp || 1))));
const formOf = (p) => { const w = WEAPONS[p.weapon ?? p.classWeapon]; if (!w) return 'pistols'; if (/bow/.test(w.look ?? w.id ?? '') || w.family === 'Ranger') return 'bow'; if (w.ranged) return 'pistols'; return 'blade'; };
const payHp = (p, n) => { if (p.hp <= n + 1) { combat.spawnDamageText?.(p.x, (p.y ?? 0) - 70, 'ZU WENIG BLUT', { color: '#ff8a80' }); return false; } p.hp -= n; return true; };
const bleedChance = (t, k = .35) => { if (Math.random() < k) applyStatus(t, 'bleed'); };

function shoot(p, st, gw, { vz = 0, h = 44, delay = 0, power = 1 } = {}) {
  const form = formOf(p); const f = p.facing || 1; const m = eclipseMult(p) * power * (st.quality?.power ?? 1);
  const o = { x: p.x + f * 22, z: p.z, height: (p.worldHeight ?? 0) + h, team: p.team, mat: BLOODMAT, vx: f * (form === 'bow' ? 820 : form === 'blade' ? 520 : 680), vz, damage: ECLIPSE.shotDmg * m * (form === 'blade' ? 1.3 : form === 'bow' ? 1.2 : .8), size: form === 'blade' ? 9 : 5, life: form === 'blade' ? .5 : .8, kind: form === 'blade' ? 'block' : 'crystal', pierce: form !== 'pistols', delay, kx: 140, lift: 30, stun: .2, seed: 9400 + st.shots, onHit: (t) => bleedChance(t) };
  st.shots++; return emit(new SigBolt(o));
}
function tapShot(p, st, gw) {
  if (st.cd > 0) return true; st.cd = .16;
  if (!payHp(p, ECLIPSE.shotHp)) return true;
  if (formOf(p) === 'pistols') { shoot(p, st, gw, { h: 48 }); shoot(p, st, gw, { h: 40, delay: .06 }); } else shoot(p, st, gw);
  st.flash = .1; p.state = 'attack1'; p.stateTimer = .14; p._weaponSwingTime = .14; p.canAttack = false;
  return true;
}
class BloodFireWave {
  constructor(p, power) { Object.assign(this, { caster: p, owner: p, team: p.team, x: p.x, z: p.z, f: p.facing || 1, t: 0, power, isFinished: false, hit: new Set() }); }
  get y() { return gy(this.z); }
  update(dt, gw) {
    this.t += dt; const front = this.x + this.f * (30 + 520 * Math.min(1, this.t / .8));
    for (const t of foesOf(gw, this.team)) { if (this.hit.has(t)) continue; const dx = (t.x - this.x) * this.f; if (dx > 0 && dx < (front - this.x) * this.f && Math.abs(((t.z ?? this.z) - this.z) * DEPTH) < 40) { this.hit.add(t); hit(t, 30 * this.power, this.f * 320, 160, .45); applyStatus(t, 'burn'); bleedChance(t, .5); } }
    if (this.t > 1) this.isFinished = true;
  }
  render(ctx) {
    const k = Math.min(1, this.t / .8); const a = Math.min(1, (1 - this.t) / .25) ; const y = this.y;
    for (let i = 0; i < 16; i++) { const u = i / 16; if (u > k) break; const x = this.x + this.f * (30 + 520 * u); const h = 20 + Math.sin(u * 14 + this.t * 20) * 8 + 26 * (1 - Math.abs(u - k) * 3); ctx.save(); ctx.globalAlpha = a * (u > k - .25 ? 1 : .55); px(ctx, x - 6, y - h, 12, h, '#7f0000'); px(ctx, x - 4, y - h + 4, 8, h - 4, '#e53935'); px(ctx, x - 2, y - h + 8, 4, h * .5, '#ffab40'); ctx.restore(); }
  }
}
defineSignature('S94', {
  cast(c) { startStance(c.caster, 'S94', c.quality, { shots: 0, cd: 0, flash: 0 }); combat.spawnShockwave?.(c.caster.x, (c.caster.y ?? 0) - 40, 60, '#b71c1c'); },
  stance: {
    duration: ECLIPSE.dur,
    hint: (p) => `BLUTFINSTERNIS · TIPPEN: BLUTSCHUSS (2 HP) · ↑ ERWACHEN · → SALVE · ↓ BLUTSTILLUNG · ×${(p ? eclipseMult(p) : 1).toFixed(1)}`,
    attack(p, st, kind, gw) { return kind === 'normal' ? tapShot(p, st, gw) : false; },
    charge(p, st, dir, ratio, gw) {
      const k = Math.max(.4, Math.min(1, ratio ?? .6));
      if (dir === 'up') { emit(new BloodFireWave(p, eclipseMult(p) * k * (st.quality?.power ?? 1))); combat.shakeCamera(8, .25); p.state = 'heavyStrike'; p.stateTimer = .35; p._weaponSwingTime = .35; return true; }
      if (dir === 'down') {
        let heal = 0;
        for (const t of foesOf(gw, p.team)) if (Math.hypot(t.x - p.x, ((t.z ?? p.z) - p.z) * DEPTH) < 300 && hasStatus(t, 'bleed')) heal += 6;
        for (const e of environment.effects) if (e.type === 'blood' && Math.hypot(e.x - p.x, (e.z - p.z) * DEPTH) < 160) { heal += 8; e.life = Math.min(e.life, .3); }
        heal = Math.max(4, heal); p.hp = Math.min(p.maxHp, p.hp + heal);
        combat.spawnDamageText?.(p.x, (p.y ?? 0) - 100, `+${heal} BLUTSTILLUNG`, { color: '#ff8a80' }); combat.spawnShockwave?.(p.x, (p.y ?? 0) - 10, 70, '#7f0000');
        p.state = 'heavyStrike'; p.stateTimer = .3; p._weaponSwingTime = .3; return true;
      }
      if (dir === 'forward') { if (!payHp(p, ECLIPSE.salvoHp)) return true; for (let i = 0; i < 5; i++) shoot(p, st, gw, { vz: (i - 2) * .3, power: .9 }); p.state = 'heavyStrike'; p.stateTimer = .3; p._weaponSwingTime = .3; return true; }
      return false;
    },
    update(p, st, dt) { st.cd = Math.max(0, st.cd - dt); st.flash = Math.max(0, st.flash - dt); },
    render(ctx, p, st, ry, layer) {
      const f = p.facing || 1; const fade = Math.min(1, st.t / .3, st.timer / .4 + .2); const low = 1 - Math.max(0, Math.min(1, p.hp / (p.maxHp || 1)));
      if (layer === 'back') {
        // A dark red eclipse halo behind the head — it darkens and grows as the HP drop.
        const r = 16 + low * 10; ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = '#2a0006'; ctx.beginPath(); ctx.arc(p.x - f * 4, ry - 92, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#e53935'; ctx.lineWidth = 2 + low * 2; ctx.beginPath(); ctx.arc(p.x - f * 4, ry - 92, r, 0, TAU); ctx.stroke(); ctx.restore();
        return;
      }
      // The blood weapon in hand (form of the held weapon).
      const form = formOf(p); const hx = p.x + f * 16; const hy = ry - 48;
      ctx.save(); ctx.globalAlpha = fade;
      if (form === 'pistols') { for (const oy of [0, 8]) { px(ctx, hx, hy + oy, f * 14, 5, '#7f0000'); px(ctx, hx, hy + oy + 4, f * 4, 7, '#7f0000'); px(ctx, hx + f * 2, hy + oy + 1, f * 10, 2, '#e53935'); } }
      else if (form === 'bow') { ctx.strokeStyle = '#e53935'; ctx.lineWidth = 3; ctx.beginPath(); if (f > 0) ctx.arc(hx - 4, hy, 18, -1.2, 1.2); else ctx.arc(hx + 4, hy, 18, Math.PI - 1.2, Math.PI + 1.2); ctx.stroke(); }
      else { ctx.strokeStyle = '#7f0000'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hx, hy + 6); ctx.lineTo(hx + f * 30, hy - 20); ctx.stroke(); ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy + 6); ctx.lineTo(hx + f * 30, hy - 20); ctx.stroke(); }
      if (st.flash > 0) px(ctx, hx + f * 16, hy - 2, 6, 6, '#ffebee');
      ctx.restore();
    }
  }
});
