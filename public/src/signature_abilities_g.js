// GRIMGE Prototype — S53 SPHÄRENENTFALTUNG (user, 20 Oct 2026, after the domain
// expansions of Jujutsu Kaisen; own look, no copied design).
//
// A hand sign, a blackout flash — then a dome of an inner world unfolds around
// the caster: an abyss sky with a crimson eclipse, an obsidian floor with
// glowing cracks, floating rune rings. For 6 s the dome has its own rules:
//   • SURE HIT — every foe inside is cut by unseen slashes (no guard helps)
//   • TRAPPED  — foes inside cannot leave the dome and are slowed
//   • the caster regains mana faster inside
// Tap the slot again to close it early with a final slash storm (stronger the
// more time was left). When two hostile domains meet, a DOMAIN DUEL starts:
// both sides tap for 3 s — the weaker dome collapses, the stronger one stays.
import { defineSignature, emit, foesOf, hit, plate, sparks, TAU, DEPTH } from './signature_core.js';
import { offerRecast } from './recast.js';
import { combat } from './combat.js';
import { audio } from './audio.js';
import { groundYForDepth } from './world.js';

export const DOMAIN = Object.freeze({ radius: 190, height: 175, duration: 6, sign: .35, unfold: .6, slashEvery: .45, slashDamage: 7, duelTime: 3, aiTapRate: 4.5 });
const ABYSS = { kind: 'crystal', dark: '#07030d', body: '#2a0f3d', facet: '#6a2c91', vein: '#ff3d6e', edge: '#ffd1dc', spark: '#ff8fab', core: '#ffffff', glow: 'rgba(255,61,110,', edgeGlow: 'rgba(255,209,220,' };
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;
const active = new Set();
// Only domains still running in the spell system (a cleared runtime drops them).
export const activeDomains = () => { for (const d of [...active]) if (d.isFinished || (d.system && !d.system.activeSpells.includes(d))) active.delete(d); return [...active]; };

export class Domain {
  constructor(sig, owner, quality) {
    this.sig = sig; this.owner = owner; this.team = owner.team; this.quality = quality;
    this.cx = owner.x; this.cz = owner.z; this.R = DOMAIN.radius; this.t = 0; this.life = DOMAIN.duration * (quality?.duration ?? 1);
    this.slashT = new Map(); this.trapped = new Set(); this.slashes = []; this.collapseT = null; this.finale = 0; this.clash = null; this.isFinished = false;
    this.isGroundDecal = true; // the inner world lies under every actor
    this.seed = Math.floor(Math.random() * 1000);
    active.add(this);
    emit(new DomainShell(this), quality);
  }
  get x() { return this.cx; } get z() { return this.cz; } get y() { return groundYForDepth(this.cz); }
  // Screen half-height of the floor ellipse (depth → screen).
  get ry() { return Math.max(18, Math.abs(groundYForDepth(Math.min(.98, this.cz + this.R / DEPTH)) - groundYForDepth(this.cz)) * .9); }
  get unfoldK() { const k = Math.max(0, Math.min(1, (this.t - DOMAIN.sign) / DOMAIN.unfold)); return 1 - (1 - k) * (1 - k); }
  get open() { return this.collapseT == null && this.t >= DOMAIN.sign + DOMAIN.unfold * .5; }
  inside(t) { return Math.hypot(t.x - this.cx, ((t.z ?? this.cz) - this.cz) * DEPTH) < this.R * this.unfoldK; }
  update(dt, gw) {
    this.t += dt;
    const p = this.owner;
    if (this.collapseT != null) { if (this.t - this.collapseT > .6) { this.isFinished = true; active.delete(this); } return; }
    if (this.t < DOMAIN.sign) { p.state = 'heavyStrike'; p.stateTimer = .1; p.vx = 0; p.vz = 0; return; }
    if (!this.flashed) { this.flashed = true; combat.triggerHitstop?.(6); combat.shakeCamera(12, .5); audio.playImpact?.(true); combat.spawnShockwave(this.cx, this.y, 160, ABYSS.vein); }
    if (!alive(p)) { this.collapse(); return; }
    if (this.clash) return; // the duel decides — the rules pause
    if (this.t - DOMAIN.sign > this.life) { this.collapse(); return; }
    if (!this.open) return;
    // The caster draws on the domain: faster mana.
    if (this.inside(p)) p.mp = Math.min(p.maxMp ?? 100, (p.mp ?? 0) + 6 * dt);
    for (const t of foesOf(gw, this.team)) {
      if (t.isProp) continue;
      // Trapped: whoever was inside once is held in by the dome wall (also against knockback); slowed inside.
      if (this.inside(t)) this.trapped.add(t);
      if (!this.trapped.has(t)) continue;
      const dx = t.x - this.cx; const dz = ((t.z ?? this.cz) - this.cz) * DEPTH; const d = Math.hypot(dx, dz); const lim = this.R - 16;
      if (d > lim) { t.x = this.cx + dx / d * lim; if (Number.isFinite(t.z)) t.z = this.cz + dz / d * lim / DEPTH; t.kbVelX = 0; }
      t.slow?.(.3, .6);
      // Sure hit: unseen slashes, no direction → a guard cannot catch them.
      const since = this.slashT.get(t);
      if (since == null || this.t - since >= DOMAIN.slashEvery) {
        this.slashT.set(t, this.t);
        hit(t, Math.round(DOMAIN.slashDamage * (this.quality?.power ?? 1)), 0, 0, .12);
        this.slashes.push({ t: 0, x: t.x, y: (t.y ?? this.y) - (t.elevation ?? 0) - 40, a: ((this.t * 7.3 + this.seed) % 3.14) - 1.57 });
      }
    }
    for (const s of this.slashes) s.t += dt;
    this.slashes = this.slashes.filter((s) => s.t < .22);
  }
  // Stage 2: close early with a final slash storm (more left → harder).
  closeWithFinale(gw) {
    if (this.collapseT != null || this.clash) return false;
    const left = Math.max(0, this.life - (this.t - DOMAIN.sign)); this.finale = left;
    for (const t of foesOf(gw, this.team)) if (!t.isProp && this.inside(t)) hit(t, Math.round((14 + left * 6) * (this.quality?.power ?? 1)), Math.sign(t.x - this.cx || 1) * 220, 160, .5, true);
    combat.shakeCamera(14, .4);
    this.collapse();
    return true;
  }
  collapse() {
    if (this.collapseT != null) return;
    this.collapseT = this.t; this.clash = null;
    audio.playImpact?.(false);
  }
  // ── drawing helpers ──
  silhouette(ctx, k, grow = 1) {
    const x = this.cx; const y = this.y; const rx = this.R * k * grow; const ry = this.ry * k * grow; const h = DOMAIN.height * k * grow;
    ctx.beginPath(); ctx.ellipse(x, y, rx, h, 0, Math.PI, TAU); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI); ctx.closePath();
  }
  // Back layer (under the actors): the inner world.
  render(ctx) {
    const k = this.unfoldK; if (k <= 0) { this.renderSign(ctx); return; }
    const gone = this.collapseT != null ? Math.min(1, (this.t - this.collapseT) / .6) : 0;
    const x = this.cx; const y = this.y; const rx = this.R * k; const ry = this.ry * k; const h = DOMAIN.height * k;
    ctx.save();
    ctx.globalAlpha = 1 - gone;
    this.silhouette(ctx, k); ctx.save(); ctx.clip();
    // Abyss sky in layered bands (no gradients: pixel look).
    const bands = ['#05020a', '#0b0516', '#140823', '#1d0b30'];
    bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x - rx, y - h + i * h / bands.length, rx * 2, h / bands.length + 1); });
    // Stars.
    ctx.fillStyle = '#e9d7ff';
    for (let i = 0; i < 40; i++) { const sx = x - rx + ((i * 97 + this.seed) % 1000) / 1000 * rx * 2; const sy = y - h + ((i * 53 + this.seed * 3) % 1000) / 1000 * h * .8; ctx.globalAlpha = (1 - gone) * (.4 + .6 * Math.abs(Math.sin(this.t * 2 + i))); ctx.fillRect(Math.round(sx), Math.round(sy), i % 5 ? 1 : 2, i % 5 ? 1 : 2); }
    ctx.globalAlpha = 1 - gone;
    // The crimson eclipse behind the caster.
    const ey = y - h * .8; const er = 24 * k; // above the caster's head
    ctx.fillStyle = '#ff3d6e'; ctx.beginPath(); ctx.arc(x, ey, er + 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#05020a'; ctx.beginPath(); ctx.arc(x + 3, ey + 1, er, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffd1dc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, ey, er + 9 + Math.sin(this.t * 3) * 2, 0, TAU); ctx.stroke();
    // Floating rune rings orbiting the eclipse.
    for (let i = 0; i < 3; i++) { const a = this.t * (.6 + i * .25) + i * 2.1; ctx.strokeStyle = i % 2 ? '#6a2c91' : '#ff8fab'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * rx * .55, ey + 30 + Math.sin(a) * 20, 14, 5, 0, 0, TAU); ctx.stroke(); }
    // Obsidian floor with glowing cracks.
    ctx.fillStyle = '#0d0714'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ff3d6e'; ctx.lineWidth = 1.5; ctx.globalAlpha = (1 - gone) * (.55 + .25 * Math.sin(this.t * 4));
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + .2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rx * .12, y + Math.sin(a) * ry * .12); ctx.lineTo(x + Math.cos(a + .1) * rx * .55, y + Math.sin(a + .1) * ry * .55); ctx.lineTo(x + Math.cos(a - .05) * rx * .92, y + Math.sin(a - .05) * ry * .92); ctx.stroke(); }
    ctx.restore();
    // The back half of the dome wall.
    ctx.strokeStyle = '#6a2c91'; ctx.lineWidth = 2; ctx.globalAlpha = (1 - gone) * .9;
    ctx.beginPath(); ctx.ellipse(x, y, rx, h, 0, Math.PI, TAU); ctx.stroke();
    ctx.restore();
  }
  // Before the dome: the hand sign — a dark ring gathering at the caster's feet.
  renderSign(ctx) {
    const p = this.owner; const k = Math.min(1, this.t / DOMAIN.sign);
    ctx.save(); ctx.globalAlpha = .7 * k; ctx.fillStyle = '#05020a'; ctx.beginPath(); ctx.ellipse(p.x, this.y, 20 + 30 * k, (20 + 30 * k) * .32, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ff3d6e'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
}

// Front layer (over the actors): the near half of the dome shell, its glowing rim,
// the sure-hit slashes, the duel seam and the blackout flash.
class DomainShell {
  constructor(domain) { this.domain = domain; this.isFinished = false; this.x = domain.cx; }
  update() { if (this.domain.isFinished) this.isFinished = true; }
  render(ctx) {
    const d = this.domain; const k = d.unfoldK; const x = d.cx; const y = d.y;
    // Hand sign glow at the caster's hands.
    if (d.t < DOMAIN.sign) { const p = d.owner; const hy = (p.y ?? y) - (p.elevation ?? 0) - 50; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .9; ctx.fillStyle = '#ff3d6e'; ctx.beginPath(); ctx.arc(p.x + (p.facing || 1) * 6, hy, 4 + 8 * (d.t / DOMAIN.sign), 0, TAU); ctx.fill(); ctx.restore(); return; }
    // Blackout flash right as it unfolds.
    const ft = d.t - DOMAIN.sign;
    if (ft < .18) { ctx.save(); ctx.globalAlpha = .85 * (1 - ft / .18); ctx.fillStyle = '#000000'; ctx.fillRect(x - 3000, y - 3000, 6000, 6000); ctx.restore(); }
    const gone = d.collapseT != null ? Math.min(1, (d.t - d.collapseT) / .6) : 0;
    const rx = d.R * k; const ry = d.ry * k; const h = DOMAIN.height * k;
    ctx.save();
    if (gone > 0) {
      // Collapse: the shell cracks into falling shards.
      for (let i = 0; i < 16; i++) { const a = Math.PI + i / 15 * Math.PI; const sx = x + Math.cos(a) * rx; const sy = y + Math.sin(a) * h + gone * gone * 120; plate(ctx, [[sx - 6, sy], [sx, sy - 9], [sx + 6, sy + 2]], ABYSS, 5300 + i, { alpha: 1 - gone }); }
      ctx.restore(); return;
    }
    // Faint near shell and a bright rim.
    ctx.globalAlpha = .1; ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI); ctx.ellipse(x, y, rx, h * .25, 0, Math.PI, 0, true); ctx.fill();
    ctx.globalAlpha = .9; ctx.strokeStyle = '#ff3d6e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, rx, h, 0, Math.PI, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffd1dc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx - 3), Math.max(0, h - 3), 0, Math.PI, TAU); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ff3d6e'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI); ctx.stroke();
    // Sparks running along the rim.
    for (let i = 0; i < 6; i++) { const a = Math.PI + ((d.t * .35 + i / 6) % 1) * Math.PI; ctx.fillStyle = '#ffd1dc'; ctx.fillRect(Math.round(x + Math.cos(a) * rx) - 1, Math.round(y + Math.sin(a) * h) - 1, 3, 3); }
    // Sure-hit slashes: thin white cuts across the foes.
    for (const s of d.slashes) {
      const kk = Math.min(1, s.t / .06); const a = 1 - Math.max(0, s.t - .08) / .14; const L = 34 * kk;
      ctx.globalAlpha = Math.max(0, a); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x - Math.cos(s.a) * L, s.y - Math.sin(s.a) * L); ctx.lineTo(s.x + Math.cos(s.a) * L, s.y + Math.sin(s.a) * L); ctx.stroke();
      ctx.strokeStyle = '#ff3d6e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x - Math.cos(s.a) * L * .7, s.y - Math.sin(s.a) * L * .7 + 2); ctx.lineTo(s.x + Math.cos(s.a) * L * .7, s.y + Math.sin(s.a) * L * .7 + 2); ctx.stroke();
    }
    // Domain duel: the seam where both domes push against each other.
    if (d.clash && d.clash.a === d) {
      const c = d.clash; const sx = c.seamX(); const top = y - DOMAIN.height;
      ctx.globalAlpha = .95; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 12; i++) { const yy = y - i / 12 * DOMAIN.height; const xx = sx + Math.sin(d.t * 30 + i * 1.7) * 4; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
      sparks(ctx, [[sx, (y + top) / 2]], ABYSS, d.t, 5390, 10, 1);
      ctx.font = '900 16px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd1dc'; ctx.strokeStyle = '#05020a'; ctx.lineWidth = 3;
      const label = `SPHÄREN-DUELL  ${c.powerA} : ${Math.round(c.powerB)}`; ctx.strokeText(label, sx, top - 10); ctx.fillText(label, sx, top - 10);
    }
    ctx.restore();
  }
}

// Two hostile domains meet: both owners tap for DOMAIN.duelTime seconds (the AI at
// a fixed rate). The weaker dome collapses; the stronger keeps its remaining time.
export class DomainClash {
  constructor(a, b) { this.a = a; this.b = b; this.t = 0; this.powerA = 0; this.powerB = 0; this.isFinished = false; this.x = (a.cx + b.cx) / 2; a.clash = this; b.clash = this; }
  // Seam position: pushed toward the weaker side.
  seamX() { const mid = (this.a.cx + this.b.cx) / 2; const diff = this.powerA - this.powerB; const dir = Math.sign(this.b.cx - this.a.cx) || 1; return mid + dir * Math.max(-60, Math.min(60, diff * 6)); }
  tapFor(domain) { if (this.isFinished) return; if (domain === this.a) this.powerA++; else this.powerB++; }
  update(dt) {
    if (this.isFinished) return;
    this.t += dt;
    // A side without a human tapper (the AI) taps at a steady rate.
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

// Opens a domain for any owner (player or AI). Returns the domain.
export function openDomain(owner, quality = null, sig = DOMAIN_SIG()) {
  const domain = emit(new Domain(sig, owner, quality), quality);
  // A hostile domain within reach → duel.
  const rival = activeDomains().find((d) => d !== domain && d.team !== domain.team && d.collapseT == null && !d.clash && Math.hypot(d.cx - domain.cx, (d.cz - domain.cz) * DEPTH) < d.R + domain.R);
  if (rival) domain.duel = emit(new DomainClash(domain, rival), quality);
  return domain;
}
let sigRef = null; const DOMAIN_SIG = () => sigRef;

defineSignature('S53', {
  cast(c) {
    sigRef = c.sig;
    const p = c.caster; p.isPlayerControlled ??= p === globalThis.window?.gameWorld?.player;
    const domain = openDomain(p, c.quality, c.sig);
    let duelAnnounced = false;
    offerRecast(p, {
      window: DOMAIN.sign + DOMAIN.unfold + domain.life, label: 'SCHLIESSEN: FINALER SCHNITT',
      valid: () => !domain.isFinished && domain.collapseT == null,
      poll: () => (domain.clash && !duelAnnounced ? (duelAnnounced = true, { window: DOMAIN.duelTime, label: 'SPHÄREN-DUELL: TIPPEN!' }) : (!domain.clash && duelAnnounced && domain.collapseT == null ? (duelAnnounced = false, { window: Math.max(.5, domain.life - (domain.t - DOMAIN.sign)), label: 'SCHLIESSEN: FINALER SCHNITT' }) : null)),
      stage2: (gw) => {
        if (domain.clash) { domain.clash.tapFor(domain); return { again: true, label: `SPHÄREN-DUELL: ${domain.clash.a === domain ? domain.clash.powerA : domain.clash.powerB} TIPPS` }; }
        return domain.closeWithFinale(gw);
      },
      expire: () => {}
    });
  }
});
