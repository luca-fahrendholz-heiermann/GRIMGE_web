// GRIMGE Prototype — signature specials S37–S42 (user design rules, 18 Oct
// 2026): special runes need their own object / motion / arena identity.
//   S37 EISZACKEN     a row of ice spikes erupting ahead — own spike objects,
//                     each a short-lived platform you can stand on
//   S38 SCHACHTWUCHS  three stepped stone shafts at the target: launch foes,
//                     carry the Wizard up, stay as platforms
//   S39 TIDENBOHRER   a spinning water shell with four nozzles hammering jets
//   S40–S42           breathing techniques (water / flame / thunder): they
//                     restyle every melee swing and the charges for 15 s
import {
  defineSignature, startStance, emit, SigSequence, foesOf, groundDist, hit, plate, shard, thread, ribbon, sparks, TAU, DEPTH, sigWorld
} from './signature_core.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth } from './world.js';
import { applyStatuses } from './buff_techniques.js';
import { GeoPlatform } from './geometry.js';

const gameOf = (c) => c.gw ?? sigWorld();

// ── S37 Eiszacken ────────────────────────────────────────────────────────
class IceSpike extends GeoPlatform {
  constructor(caster, game, x, z, i) {
    super(caster, game, { x, z, halfW: 13, halfD: .05, height: 34 + i * 7, life: 3.2, emerge: .12, decay: .3, delay: i * .07, look: 'ice', damage: 22, lift: 280, stun: .6, label: 'Ice spike', onEmerge: (t) => t.freeze?.(.5) });
    this.i = i;
  }
  render(ctx) {
    const h = this.currentHeight; if (h <= .5) return;
    const y = this.y; const m = this.mat; const w = this.halfW;
    // A jagged spike, not a pillar: a main blade with two side shards.
    plate(ctx, [[this.x - w, y + 3], [this.x - w * .3, y - h * .55], [this.x + w * .15, y - h], [this.x + w * .5, y - h * .45], [this.x + w, y + 3]], m, this.seed, { alpha: 1, lit: 1, glowEdge: 1.1 });
    plate(ctx, [[this.x - w - 4, y + 3], [this.x - w - 8, y - h * .45], [this.x - w * .2, y]], m, this.seed + 1, { alpha: 1, glowEdge: .9 });
    plate(ctx, [[this.x + w * .4, y + 2], [this.x + w + 9, y - h * .4], [this.x + w + 4, y + 3]], m, this.seed + 2, { alpha: 1, glowEdge: .9 });
    thread(ctx, [[this.x - w * .2, y - 4], [this.x + w * .1, y - h * .8]], '#ffffff', 1.5, .8);
    if (this.t > this.life - this.decay) for (let k = 0; k < 4; k++) shard(ctx, this.x + (k - 1.5) * 8, y - h * .5 - k * 4, 4, k, m, this.seed + 10 + k, 1);
  }
}
defineSignature('S37', {
  cast(c) {
    const p = c.caster; const f = p.facing || 1; const game = gameOf(c);
    for (let i = 0; i < 7; i++) emit(new IceSpike(p, game, p.x + f * (46 + i * 32), p.z, i), c.quality);
    emit(new SigSequence(c.sig, p, { dur: .5, draw: (ctx, s, k) => { const y = groundYForDepth(s.z); thread(ctx, [[s.x + f * 14, y], [s.x + f * (40 + 230 * Math.min(1, k * 2)), y + 1]], c.sig.mat.edge, 2, 1 - k); } }), c.quality);
  }
});

// ── S38 Schachtwuchs ─────────────────────────────────────────────────────
defineSignature('S38', {
  cast(c) {
    const p = c.caster; const f = p.facing || 1; const game = gameOf(c);
    const x0 = c.target?.x ?? p.x + f * 90; const z = c.target?.z ?? p.z;
    [50, 92, 134].forEach((h, i) => emit(new GeoPlatform(p, game, { x: x0 + f * i * 54, z, halfW: 24, halfD: .06, height: h, life: 8, emerge: .3, decay: .5, delay: i * .14, look: 'stone', damage: 26, lift: 420, stun: .6, label: 'Stone shaft' }), c.quality));
    combat.shakeCamera(6, .3);
  }
});

// ── S39 Tidenbohrer ──────────────────────────────────────────────────────
const WATER = { kind: 'crystal', dark: '#0b2440', body: '#3fa2ff', facet: '#d6f0ff', vein: '#8ff7ff', edge: '#ffffff', spark: '#e6fbff', core: '#ffffff', glow: 'rgba(63,162,255,', edgeGlow: 'rgba(255,255,255,' };
function waterJet(p, st, angle, gw, power = 1) {
  // Hitscan jet along the nozzle direction (ground plane), pushes foes away.
  const dx = Math.cos(angle); const dz = Math.sin(angle) * .35; const len = 210;
  for (const t of foesOf(gw, p.team)) {
    const rx = t.x - p.x; const rz = ((t.z ?? p.z) - p.z) * DEPTH;
    const u = rx * dx + rz * dz; if (u < 10 || u > len) continue;
    if (Math.abs(rx * dz - rz * dx) > 22) continue;
    hit(t, 9 * power, Math.sign(rx || 1) * 260, 40, .25);
  }
  st.jets.push({ angle, t: 0 });
}
defineSignature('S39', {
  cast(c) { startStance(c.caster, 'S39', c.quality, { spin: 0, next: 0, nozzle: 0, jets: [] }); },
  stance: {
    duration: 6,
    hint: 'WASSERHÜLLE · DÜSEN FEUERN AUTOMATISCH · HEAVY: ALLE VIER',
    damageTaken: (p, st, amount) => amount * .67,
    update(p, st, dt, gw) {
      st.spin += dt * 9; st.next -= dt;
      for (const j of st.jets) j.t += dt; st.jets = st.jets.filter((j) => j.t < .22);
      if (st.next <= 0) { st.next = .3; st.nozzle = (st.nozzle + 1) % 4; waterJet(p, st, st.spin + st.nozzle * TAU / 4, gw); }
    },
    onEvent(p, st, type, info, gw) { if (type === 'heavy') for (let k = 0; k < 4; k++) waterJet(p, st, st.spin + k * TAU / 4, gw, 1.6); },
    render(ctx, p, st, ry, layer) {
      const cy = ry - 44; const emerge = Math.min(1, st.t / .3); const pop = st.timer < .3 ? st.timer / .3 : 1;
      // The spinning shell: plates on an ellipse, back half behind the sprite.
      for (let i = 0; i < 10; i++) {
        const a = st.spin + i * TAU / 10; const back = Math.sin(a) < 0; if ((layer === 'back') !== back) continue;
        const r = 34 * emerge * pop; const x = p.x + Math.cos(a) * r; const y = cy + Math.sin(a) * r * .45;
        plate(ctx, [[x - 6, y - 12], [x + 6, y - 12], [x + 7, y + 12], [x - 7, y + 12]], WATER, 3900 + i, { alpha: .75, glowEdge: .9, lit: 1 });
      }
      if (layer !== 'front') return;
      // Four nozzles and the jets they fire.
      for (let k = 0; k < 4; k++) { const a = st.spin + k * TAU / 4; const x = p.x + Math.cos(a) * 36; const y = cy + Math.sin(a) * 16; plate(ctx, [[x - 4, y - 4], [x + 4, y - 4], [x + 4, y + 4], [x - 4, y + 4]], { ...WATER, body: '#ffffff' }, 3920 + k, { alpha: 1 }); }
      for (const j of st.jets) {
        const dx = Math.cos(j.angle); const dz = Math.sin(j.angle) * .35; const len = 210 * Math.min(1, j.t / .08);
        const x0 = p.x + dx * 36; const y0 = cy + Math.sin(j.angle) * 16; const x1 = p.x + dx * len; const y1 = cy + dz * len * .32 * 150 / 100;
        ribbon(ctx, [[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 - 3], [x1, y1]], (i, n) => 6 - i * 1.5, WATER, 3930, st.t, 1 - j.t / .22);
        thread(ctx, [[x0, y0], [x1, y1]], '#ffffff', 1.5, 1 - j.t / .22);
      }
    }
  }
});

// ── Breathing techniques (S40 water, S41 flame, S42 thunder) ─────────────
const BREATH = {
  S40: { mat: WATER, color: '#2f8fff', core: '#ffffff', hint: 'WASSERATMUNG · FINISHER: WELLE · CHARGE: WELLENSCHNITT' },
  S41: { mat: { kind: 'crystal', dark: '#3a0e04', body: '#ff7a2a', facet: '#ffd27a', vein: '#ff5a1f', edge: '#fff1c2', spark: '#fff1c2', core: '#ffffff', glow: 'rgba(255,90,31,', edgeGlow: 'rgba(255,241,194,' }, color: '#ff5a1f', core: '#fff1c2', hint: 'FLAMMENATMUNG · TREFFER BRENNEN · FINISHER: FLAMMENRAD' },
  S42: { mat: { kind: 'crystal', dark: '#1a1a08', body: '#ffe03d', facet: '#fff6b0', vein: '#ffe03d', edge: '#ffffff', spark: '#ffffff', core: '#ffffff', glow: 'rgba(255,224,61,', edgeGlow: 'rgba(255,255,255,' }, color: '#ffe03d', core: '#ffffff', hint: 'DONNERATMUNG · SPRINT: BLITZSCHRITT · CHARGE: DONNERSCHLAG' }
};
// A travelling slash wave (water wave / fire burst) along the lane.
function slashWave(p, id, quality, { len = 260, damage = 22, kx = 320, lift = 80, st = [] } = {}) {
  const f = p.facing || 1; const b = BREATH[id];
  emit(new SigSequence({ mat: b.mat, seed: 4000 }, p, { dur: .55, data: { hit: new Set() }, tick: (s, dt, gw) => {
    const reach = 30 + Math.min(1, s.t / .45) * len;
    for (const t of foesOf(gw, p.team)) { if (s.hit.has(t)) continue; const dx = (t.x - s.x) * f; if (dx > 0 && dx < reach && Math.abs(((t.z ?? s.z) - s.z) * DEPTH) < 26) { s.hit.add(t); hit(t, damage, f * kx, lift, .35); applyStatuses(t, st, p, f); } }
  }, draw: (ctx, s, k) => {
    const y = groundYForDepth(s.z); const x = s.x + f * (30 + Math.min(1, s.t / .45) * len); const a = 1 - k * .7;
    if (id === 'S40') { ribbon(ctx, [[x - f * 40, y], [x - f * 14, y - 30], [x, y - 44], [x + f * 8, y - 28]], (i, n) => 9 - i * 2, b.mat, 4010, s.t, a); sparks(ctx, [[x, y - 40]], b.mat, s.t, 4011, 6, a); }
    else if (id === 'S41') { for (let i = 0; i < 3; i++) plate(ctx, [[x - f * 30, y - 10 - i * 12], [x + f * 10, y - 24 - i * 10], [x - f * 6, y - 2 - i * 12]], b.mat, 4020 + i, { alpha: a, glowEdge: 1.2 }); sparks(ctx, [[x, y - 20]], b.mat, s.t, 4023, 8, a); }
  } }), quality);
}
function breathStance(id) {
  const b = BREATH[id];
  return {
    duration: 15,
    hint: b.hint,
    onEvent(p, st, type, info, gw) {
      const f = p.facing || 1;
      if (type === 'attack') st.arcs.push({ t: 0, step: info.step ?? 1, f, big: false });
      if (type === 'hit' && id === 'S41') for (const h of info.hits ?? []) if (!h.target.isProp) applyStatuses(h.target, ['burn'], p, f);
      if (type === 'hit' && id === 'S42') for (const h of info.hits ?? []) if (!h.target.isProp) applyStatuses(h.target, ['shock'], p, f);
      // Finisher (step 3+) / charged heavy: the breathing's big move.
      const finisher = type === 'attack' && (info.step ?? 1) >= 3;
      if (finisher || type === 'heavy') {
        st.arcs.push({ t: 0, step: 3, f, big: true });
        if (id === 'S40') slashWave(p, id, st.quality, { len: type === 'heavy' ? 320 : 220, damage: type === 'heavy' ? 30 : 20 });
        if (id === 'S41') { if (type === 'heavy') slashWave(p, id, st.quality, { len: 200, damage: 28, kx: 200, st: ['burn'] }); else { environment.add('scorch', p.x + f * 40, p.z, { radius: 40, team: p.team }); for (const t of foesOf(gw, p.team)) if (groundDist(t, { x: p.x + f * 40, z: p.z }) < 60) { hit(t, 18, f * 160, 260, .4); applyStatuses(t, ['burn'], p, f); } } }
        if (id === 'S42' && type === 'heavy') { const t = foesOf(gw, p.team).filter((o) => !o.isProp && groundDist(o, p) < 320).sort((a, c) => groundDist(a, p) - groundDist(c, p))[0]; if (t) { hit(t, 34, 0, 120, .6); applyStatuses(t, ['shock'], p, f); st.bolts.push({ x: t.x, z: t.z ?? p.z, t: 0 }); combat.shakeCamera(7, .2); } }
      }
    },
    update(p, st, dt) { for (const a of st.arcs) a.t += dt; st.arcs = st.arcs.filter((a) => a.t < (a.big ? .4 : .28)); for (const bo of st.bolts) bo.t += dt; st.bolts = st.bolts.filter((bo) => bo.t < .35); },
    // Thunder: the sprint attack becomes a lightning dash through everyone in line.
    sprint: id === 'S42' ? (p) => ({ name: 'BLITZSCHRITT', primal: true, pierce: true, lungeSpeed: 1.8, carryMult: 1, recoilMult: 1.1, damageMult: 1.1, color: b.color }) : null,
    render(ctx, p, st, ry, layer) {
      if (layer !== 'front') { if (st.t < 1) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + st.t * 4; sparks(ctx, [[p.x + Math.cos(a) * 20, ry - 40 + Math.sin(a) * 26]], b.mat, st.t, 4100 + i, 2, 1 - st.t); } return; }
      for (const a of st.arcs) {
        const k = a.t / (a.big ? .4 : .28); const R = a.big ? 70 : 48; const cx = p.x + a.f * 16; const cy = ry - 40; const fade = 1 - k;
        const a0 = a.step % 2 ? -1.2 : 1.2; const a1 = -a0;
        const pts = Array.from({ length: 9 }, (_, i) => { const u = a0 + (a1 - a0) * (i / 8) * Math.min(1, k * 3); return [cx + a.f * Math.cos(u) * R, cy + Math.sin(u) * R * .8]; });
        if (id === 'S42') thread(ctx, pts.map(([x, y], i) => [x + (i % 2 ? 4 : -4), y + (i % 2 ? -3 : 3)]), b.color, 3, fade), thread(ctx, pts, '#ffffff', 1.2, fade);
        else ribbon(ctx, pts, (i, n) => (a.big ? 9 : 6) * Math.sin((i / n) * Math.PI) + 1, b.mat, 4200 + a.step, st.t, fade);
        if (id === 'S40') sparks(ctx, [pts[8]], b.mat, st.t, 4210, 3, fade);
      }
      for (const bo of st.bolts) { const y = groundYForDepth(bo.z); const roll = Math.floor(st.t * 30); thread(ctx, Array.from({ length: 7 }, (_, i) => [bo.x + (i && i < 6 ? Math.sin(roll + i * 2.2) * 9 : 0), y - 180 + i * 30]), b.color, 4, 1 - bo.t / .35); thread(ctx, [[bo.x, y - 180], [bo.x, y]], '#ffffff', 1.5, 1 - bo.t / .35); }
    }
  };
}
for (const id of ['S40', 'S41', 'S42']) defineSignature(id, { cast(c) { startStance(c.caster, id, c.quality, { arcs: [], bolts: [] }); }, stance: breathStance(id) });
