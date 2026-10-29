// GRIMGE Prototype — breathing styles (user, 21 Oct 2026; researched from the Kimetsu no
// Yaiba wiki "Atemtechniken", adapted — own looks, no copies). A breathing rune puts the
// Wizard into a 15 s stance; every input becomes a move of that style:
//   normal attack     the swing leaves the element's trail (every 3rd hit applies its status)
//   charge FORWARD    the style's signature move          charge UP   its rising move
//   charge DOWN       MAL ERWACHT — the Demon Slayer Mark: a mark in the style's shape glows on
//                     the body, damage / speed up, the blade turns hot (hits burn), a little HP
//                     is burnt each second (heart racing) — and it SPREADS to allies nearby
//   sprint attack     the style's rush                    sprint jump / air down   its crash
//                     with an effect on the ground (crater, scorch, puddles, mist, blooms …)
// Every element has a base style; casting a second breathing while one is active derives
// a new one along the family tree (water → serpent, flame → love, flower → insect,
// thunder → sound): BREATH_COMBOS.
// Later every weapon type will animate these moves its own way; the moves stay the same.
import { defineSignature, startStance, emit, SigSequence, foesOf, hit, plate, thread, ribbon, sparks, TAU, DEPTH } from './signature_core.js';
import { combat } from './combat.js';
import { environment } from './environment.js';
import { groundYForDepth, clampToArena } from './world.js';
import { applyStatus, hasStatus } from './status_effects.js';
import { deliveryOf, drawHead, drawFlourish } from './breathing_weapons.js';
import { RayCrownFx } from './cast_circle.js';
import { spellSheetReady, drawSpellSpriteTinted, drawFineFromLayer } from './spell_visuals.js';

// ── palettes (dark, mid, light, core: pixel-art ramps) ───────────────────
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const ramp = (dark, mid, light, core = '#ffffff') => { const [r, g, b] = hexRgb(mid); return { dark, mid, light, core, mat: { kind: 'crystal', dark, body: mid, facet: light, vein: mid, edge: core, spark: core, core: '#ffffff', glow: `rgba(${r},${g},${b},`, edgeGlow: 'rgba(255,255,255,' } }; };

// ── the styles ────────────────────────────────────────────────────────────
// Each move: { kind, look, …params }. Kinds are the shared building blocks below.
export const BREATH_STYLES = Object.freeze({
  water: { name: 'WASSERATMUNG', ramp: ramp('#0b3c8c', '#2f8fff', '#9fdcff'), status: 'wet', trail: 'ribbon', mark: 'waves',
    forward: { kind: 'torrent', look: 'wave', name: 'FLUTWELLE', len: 380, dmg: 26, push: 460, depth: 44 },
    up: { kind: 'rising', look: 'wheel', name: 'WASSERRAD' },
    sprint: { kind: 'flurry', look: 'wave', name: 'GEZEITENSCHNITT', hits: 4, dist: 200 },
    dive: { kind: 'crash', look: 'water', name: 'WASSERFALLBECKEN' } },
  flame: { name: 'FLAMMENATMUNG', ramp: ramp('#7a1206', '#ff5a1f', '#ffb300', '#fff1c2'), status: 'burn', trail: 'flame', mark: 'flames',
    forward: { kind: 'torrent', look: 'flame', name: 'FLAMMENSCHLANGE', len: 360, dmg: 30, push: 260, depth: 40, scorch: true },
    up: { kind: 'rising', look: 'flame', name: 'STEIGENDE GLUT', pillar: true },
    sprint: { kind: 'flash', look: 'flame', name: 'GLUTSCHNITT', dist: 230, after: 'ignite', trail: 'scorch' },
    dive: { kind: 'crash', look: 'flame', name: 'FALLENDES FEUER' } },
  thunder: { name: 'DONNERATMUNG', ramp: ramp('#6b5a00', '#ffe03d', '#fff6b0'), status: 'paralysis', trail: 'bolt', mark: 'bolts',
    forward: { kind: 'flash', look: 'bolt', name: 'DONNERSCHLAG', dist: 220, after: 'paralyze' },
    up: { kind: 'pillar', look: 'bolt', name: 'HIMMELSBLITZ' },
    dive: { kind: 'crash', look: 'bolt', name: 'DONNERFALL' } },
  wind: { name: 'WINDATMUNG', ramp: ramp('#1f5c50', '#7fe0c5', '#d7fff4'), status: null, trail: 'gust', mark: 'swirls',
    forward: { kind: 'crescents', look: 'wind', name: 'STURMSICHELN', count: 5 },
    up: { kind: 'rising', look: 'wind', name: 'STAUBSTURM', lift: 760 },
    sprint: { kind: 'drill', look: 'wind', name: 'DOPPELTORNADO' },
    dive: { kind: 'crash', look: 'wind', name: 'TAIFUN' } },
  stone: { name: 'STEINATMUNG', ramp: ramp('#3e2f22', '#8d7a66', '#d2c3ad', '#f3ead8'), status: null, trail: 'shards', mark: 'cracks',
    forward: { kind: 'boomerang', look: 'rock', name: 'SERPENTINWURF' },
    up: { kind: 'pillar', look: 'rock', name: 'FELSSÄULE' },
    sprint: { kind: 'charge', look: 'rock', name: 'BERGRUTSCH' },
    dive: { kind: 'crash', look: 'rock', name: 'KRATERSCHLAG' } },
  flower: { name: 'BLUMENATMUNG', ramp: ramp('#7a1f4a', '#f06292', '#ffc1e3'), status: null, trail: 'petals', mark: 'blossom', heals: true,
    forward: { kind: 'torrent', look: 'petal', name: 'PURPURGEWAND', len: 300, dmg: 26, push: 220, depth: 42 },
    up: { kind: 'rising', look: 'petal', name: 'WIRBELNDER PFIRSICH' },
    sprint: { kind: 'flurry', look: 'petal', name: 'NEUN PFINGSTROSEN', hits: 5, dist: 190 },
    dive: { kind: 'crash', look: 'petal', name: 'BLÜTENFALL' } },
  // The Sun is the origin of every style (as in the anime): everything it does hits 1.45× harder (it costs more mana).
  sun: { name: 'SONNENATMUNG', power: 1.45, ramp: ramp('#8a3a00', '#ff9100', '#ffd54f', '#fffde7'), status: 'burn', trail: 'flame', mark: 'sunburst',
    forward: { kind: 'torrent', look: 'sun', name: 'SONNENDRACHE', len: 420, dmg: 34, push: 300, depth: 46, scorch: true },
    up: { kind: 'rising', look: 'sun', name: 'UNTERGEHENDE SONNE', backflip: true },
    sprint: { kind: 'flash', look: 'sun', name: 'SONNENSPUR', dist: 240, after: 'solar', trail: 'scorch' },
    dive: { kind: 'crash', look: 'sun', name: 'SONNENSTURZ' } },
  moon: { name: 'MONDATMUNG', ramp: ramp('#2a1550', '#7e57c2', '#d1c4e9'), status: 'bleed', trail: 'crescent', mark: 'crescents',
    forward: { kind: 'crescents', look: 'moon', name: 'NACHTPALAST', count: 9 },
    up: { kind: 'rising', look: 'moon', name: 'MONDWALL' },
    sprint: { kind: 'flash', look: 'moon', name: 'MONDSCHATTEN', dist: 220, after: 'bleed', blades: true },
    dive: { kind: 'crash', look: 'moon', name: 'NEUMOND' } },
  mist: { name: 'NEBELATMUNG', ramp: ramp('#37474f', '#b0bec5', '#eceff1'), status: null, trail: 'mist', mark: 'clouds',
    forward: { kind: 'flurry', look: 'mist', name: 'WOLKENMEER', hits: 6, dist: 230, zigzag: true },
    up: { kind: 'rising', look: 'mist', name: 'MONDNEBEL' },
    sprint: { kind: 'flash', look: 'mist', name: 'DUNSTSCHNITT', dist: 210, after: 'blind' },
    dive: { kind: 'crash', look: 'mist', name: 'NEBELFALL' } },
  beast: { name: 'BIESTATMUNG', ramp: ramp('#3e2723', '#a1887f', '#e0d4cd'), status: 'bleed', trail: 'claw', mark: 'fangs',
    forward: { kind: 'flurry', look: 'claw', name: 'REISSZAHNSCHLITZ', hits: 5, dist: 210 },
    up: { kind: 'rising', look: 'claw', name: 'REISSEN' },
    sprint: { kind: 'charge', look: 'claw', name: 'WILDER ANSTURM' },
    dive: { kind: 'crash', look: 'claw', name: 'WILDES ZERREISSEN' } },
  forge: { name: 'SCHMIEDEATMUNG', ramp: ramp('#4a2c00', '#ffab00', '#ffe082'), status: 'burn', trail: 'shards', mark: 'rivets',
    forward: { kind: 'blasts', look: 'blast', name: 'FUNKENKETTE', count: 4 },
    up: { kind: 'pillar', look: 'blast', name: 'ESSENSÄULE' },
    sprint: { kind: 'charge', look: 'blast', name: 'HAMMERSTURM' },
    dive: { kind: 'crash', look: 'blast', name: 'AMBOSSFALL' } },
  ward: { name: 'SCHUTZATMUNG', ramp: ramp('#0d3b66', '#90caf9', '#e3f2fd'), status: null, trail: 'shield', mark: 'runes',
    forward: { kind: 'calm', look: 'shield', name: 'STILLE SEE' },
    up: { kind: 'rising', look: 'shield', name: 'SCHATTENPFLAUME' },
    sprint: { kind: 'charge', look: 'shield', name: 'SCHILDSTURM' },
    dive: { kind: 'crash', look: 'shield', name: 'KUPPELFALL', shield: 30 } },
  // Ice (user, 21 Oct 2026; after Hyōrinmaru, adapted): an ice dragon that freezes what it
  // touches, an ice cocoon that shatters, an ice dragon-tail trail, a frost throne crash.
  ice: { name: 'EISATMUNG', ramp: ramp('#0d3b5c', '#4fc3f7', '#c8f1ff'), status: 'frozen', trail: 'ice', mark: 'snow',
    forward: { kind: 'torrent', look: 'ice', name: 'EISDRACHE', len: 400, dmg: 28, push: 160, depth: 46, freeze: true },
    up: { kind: 'pillar', look: 'ice', name: 'EISKOKON', cocoon: true },
    sprint: { kind: 'flash', look: 'ice', name: 'DRACHENSCHWEIF', dist: 230, after: 'freeze', trail: 'ice' },
    dive: { kind: 'crash', look: 'ice', name: 'FROSTTHRON' } },
  // ── derived styles (combos, see BREATH_COMBOS) ──
  serpent: { name: 'SCHLANGENATMUNG', trait: 'creepingPoison', ramp: ramp('#1b3a2b', '#66bb6a', '#c8e6c9'), status: 'bleed', trail: 'ribbon', mark: 'scales', derived: true,
    forward: { kind: 'flash', look: 'serpent', name: 'GIFTZAHN', dist: 200, after: 'bleed', behind: true },
    up: { kind: 'orbit', look: 'serpent', name: 'SPULENDROSSEL' },
    sprint: { kind: 'torrent', look: 'serpent', name: 'SCHLÄNGELNDE SCHLANGE', len: 300, dmg: 24, push: 200, depth: 60 },
    dive: { kind: 'crash', look: 'serpent', name: 'SCHLANGENBISS' } },
  love: { name: 'LIEBESATMUNG', trait: 'charm', ramp: ramp('#880e4f', '#ff4081', '#ffb2dd'), status: null, trail: 'ribbon', mark: 'hearts', derived: true,
    forward: { kind: 'torrent', look: 'love', name: 'PEITSCHENHERZ', len: 340, dmg: 28, push: 240, depth: 70 },
    up: { kind: 'rising', look: 'love', name: 'KATZENSCHAUER' },
    sprint: { kind: 'flurry', look: 'love', name: 'KATZENKLAUE', hits: 6, dist: 200 },
    dive: { kind: 'crash', look: 'love', name: 'LIEBESTORNADO' } },
  insect: { name: 'INSEKTENATMUNG', trait: 'toxin', ramp: ramp('#2e1a47', '#ab47bc', '#e1bee7'), status: 'poison', trail: 'sting', mark: 'wings', derived: true,
    forward: { kind: 'flash', look: 'sting', name: 'BIENENSTICH', dist: 240, after: 'poison' },
    up: { kind: 'rising', look: 'sting', name: 'SCHMETTERLINGSTANZ' },
    sprint: { kind: 'flurry', look: 'sting', name: 'FACETTENAUGE', hits: 6, dist: 180 },
    dive: { kind: 'crash', look: 'sting', name: 'LIBELLENFALL' } },
  // Steam (water + flame; user, 21 Oct 2026): hot pressure — scalds, pushes, blinds for a moment.
  // Mist (void) hides you; steam presses and scalds.
  steam: { name: 'DAMPFATMUNG', trait: 'scald', ramp: ramp('#8d8d8d', '#eceff1', '#ffffff', '#ff7043'), status: 'burn', trail: 'steam', mark: 'steam', derived: true,
    forward: { kind: 'torrent', look: 'steam', name: 'DRUCKSTRAHL', len: 340, dmg: 26, push: 560, depth: 48 },
    up: { kind: 'pillar', look: 'steam', name: 'DAMPFGEYSIR' },
    sprint: { kind: 'flash', look: 'steam', name: 'ZISCHWOLKE', dist: 220, after: 'scald' },
    dive: { kind: 'crash', look: 'steam', name: 'DRUCKEXPLOSION' } },
  sound: { name: 'KLANGATMUNG', trait: 'resonance', ramp: ramp('#3b2a00', '#ffca28', '#fff3c4'), status: 'paralysis', trail: 'notes', mark: 'notes', derived: true,
    forward: { kind: 'blasts', look: 'sound', name: 'DONNERGROLLEN', count: 5 },
    up: { kind: 'rising', look: 'sound', name: 'HALLENDE HIEBE' },
    sprint: { kind: 'charge', look: 'sound', name: 'SAITENSPIEL' },
    dive: { kind: 'crash', look: 'sound', name: 'DONNERGROLLEN-FALL' } }
});
// Signature rune → base style.
export const BREATH_RUNES = Object.freeze({ S40: 'water', S41: 'flame', S42: 'thunder', S75: 'wind', S76: 'stone', S77: 'flower', S78: 'sun', S79: 'moon', S80: 'mist', S81: 'beast', S82: 'forge', S83: 'ward', S84: 'ice' });
// Derived styles: the active base style + the newly cast one (either order).
export const BREATH_COMBOS = Object.freeze({ 'beast+water': 'serpent', 'flame+flower': 'love', 'flower+moon': 'insect', 'forge+thunder': 'sound', 'flame+water': 'steam' });
export const comboOf = (a, b) => BREATH_COMBOS[[a, b].sort().join('+')] ?? null;
export const MARK = Object.freeze({ dur: 10, dmg: 1.25, speed: 1.2, drain: 1.5, spread: 170, allyDur: 6, cooldown: 14 });

// ── helpers ──────────────────────────────────────────────────────────────
const styleOf = (st) => BREATH_STYLES[st.style] ?? BREATH_STYLES.water;
const powerOf = (p, st) => (st.quality?.power ?? 1) * (st.mark ? MARK.dmg : 1) * (styleOf(st).power ?? 1);
const alive = (t) => t && !t.isDead && t.lifeState !== 'Dead' && t.lifeState !== 'Dying' && (t.hp ?? 1) > 0;
const foes = (gw, p) => foesOf(gw, p.team).filter((t) => !t.isProp);
const inLane = (t, x0, x1, z, depth) => t.x >= Math.min(x0, x1) - 14 && t.x <= Math.max(x0, x1) + 14 && Math.abs(((t.z ?? z) - z) * DEPTH) < depth;
const statusFor = { solar: 'burn', ignite: 'burn', paralyze: 'paralysis', poison: 'poison', bleed: 'bleed', wet: 'wet', freeze: 'frozen', scald: 'burn' };
function strike(p, st, t, dmg, kx, lift, stun, force = false) {
  hit(t, Math.round(dmg * powerOf(p, st)), kx, lift, stun);
  const s = styleOf(st).status; if (s && (force || (st.hits = (st.hits ?? 0) + 1) % 3 === 0)) applyStatus(t, s, { force });
  if (styleOf(st).heals && Number.isFinite(p.hp)) p.hp = Math.min(p.maxHp, p.hp + 3);
  applyTrait(p, st, t, dmg);
}
// Combo traits (user, 21 Oct 2026): what only a derived breathing can do — the reason to pay for two runes.
function applyTrait(p, st, t, dmg = 10) {
  if (!alive(t)) return;
  switch (styleOf(st).trait) {
    case 'scald': {
      // Steam scalds: the burn cannot be put out by water, and the foe is wet too (lightning → SCHOCK).
      const fx = applyStatus(t, 'burn', { force: true, quiet: true }); if (fx) fx.scald = true;
      applyStatus(t, 'wet', { quiet: true });
      break;
    }
    case 'creepingPoison': { const fx = applyStatus(t, 'poison', { force: true, quiet: true }); if (fx) { fx.spreads = true; fx.gen = fx.gen ?? 0; } break; }
    case 'toxin': {
      // Insect: every sting on a poisoned foe adds to the venom.
      if (hasStatus(t, 'poison')) { hit(t, Math.max(2, Math.round(dmg * .3 * powerOf(p, st))), 0, 0, .1); const fx = t.statuses.poison; fx.dur = Math.min(fx.t + 8, fx.dur + 1); combat.spawnDamageText?.(t.x, (t.y ?? 0) - 96, 'GIFT +', { color: '#ce93d8' }); }
      else applyStatus(t, 'poison', { force: true, quiet: true });
      break;
    }
    case 'charm': {
      // Love: struck foes slow down; every third hit leaves them charmed for a moment.
      t.slow?.(1.2, .6);
      if ((st.charm = (st.charm ?? 0) + 1) % 3 === 0) { t.freeze?.(.7); combat.spawnDamageText?.(t.x, (t.y ?? 0) - 96, '♥ BEZAUBERT', { color: '#ff4081' }); }
      break;
    }
    case 'resonance': {
      // Sound: every fourth hit on the same foe rings out as a blast around it.
      t._resonance = (t._resonance ?? 0) + 1;
      if (t._resonance >= 4) {
        t._resonance = 0;
        for (const o of foes(globalThis.window?.gameWorld, p)) if (Math.hypot(o.x - t.x, ((o.z ?? t.z) - (t.z ?? 0)) * DEPTH) < 75) hit(o, Math.round(14 * powerOf(p, st)), Math.sign(o.x - t.x || 1) * 220, 120, .35);
        combat.spawnShockwave?.(t.x, (t.y ?? 0) - 30, 75, styleOf(st).ramp.light); combat.spawnDamageText?.(t.x, (t.y ?? 0) - 100, '♪ RESONANZ', { color: styleOf(st).ramp.light, isCrit: true }); quake(5, .18, 2);
      }
      break;
    }
    default: break;
  }
}
// Depth-aware push (3D): away from a point in x AND z.
function blowAway(t, fromX, fromZ, power) {
  const dx = t.x - fromX; const dz = ((t.z ?? fromZ) - fromZ) * DEPTH; const d = Math.hypot(dx, dz) || 1;
  if ('kbVelX' in t) t.kbVelX = dx / d * power; else t.x += dx / d * power * .08;
  if (Number.isFinite(t.z)) { if ('kbVelZ' in t) t.kbVelZ = dz / d * power / DEPTH; t.z = Math.max(.04, Math.min(.96, t.z + dz / d * power / DEPTH * .12)); }
}
const quake = (amp, dur = .25, stop = 0) => { combat.shakeCamera?.(amp, dur); if (stop) combat.triggerHitstop?.(stop); };
function swing(p, dur = .3) { p.state = 'heavyStrike'; p.stateTimer = Math.max(p.stateTimer ?? 0, dur); p.canAttack = false; p.vx = 0; p.vz = 0; }

// ── the look of one element piece (drawn along paths, in the pixel layer) ─
// Hand-drawn piece sheets (art/authoring/vfx_breath.cjs, grey ramp recoloured to the style's ramp).
const PIECE_SHEET = { wave: 'water', water: 'water', wheel: 'water', serpent: 'serpent', flame: 'flame', sun: 'sun', love: 'love', steam: 'steam', bolt: 'bolt', wind: 'wind', mist: 'mist', rock: 'rock', petal: 'petal', moon: 'moon', claw: 'claw', blast: 'blast', shield: 'shield', sting: 'sting', sound: 'sound', ice: 'ice' };
const piecePals = new Map();
const shade = (h, k) => { const [r, g, b] = hexRgb(h); return '#' + [r, g, b].map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join(''); };
// [outline, dark, mid, light, core]; steam keeps white highlights (its core colour is the scald accent).
function piecePal(R, look) { const key = R.mid + look; let p = piecePals.get(key); if (!p) piecePals.set(key, (p = [shade(R.dark, .4), R.dark, R.mid, R.light, look === 'steam' ? '#ffffff' : R.core])); return p; }
// A large element sprite (the piece sheets scaled up) — crescent blades, moon walls, claw rips.
function bigPiece(ctx, look, x, y, sc, t, R, flip, seed = 0) {
  const sheet = 'bp_' + (PIECE_SHEET[look] ?? 'blast'); if (!spellSheetReady(sheet)) return false;
  const fr = ((Math.floor(t * 12 + seed) % 4) + 4) % 4; const pal = piecePal(R, look);
  drawFineFromLayer(ctx, (c) => drawSpellSpriteTinted(c, sheet, pal, fr, x, y, { anchor: 'center', scale: Math.max(.2, sc), flip })); return true;
}
function piece(ctx, look, x, y, s, t, R, f = 1, seed = 0) {
  const sheet = 'bp_' + (PIECE_SHEET[look] ?? 'blast');
  if (spellSheetReady(sheet)) { const fr = ((Math.floor(t * 12 + seed) % 4) + 4) % 4; const pal = piecePal(R, look); drawFineFromLayer(ctx, (c) => drawSpellSpriteTinted(c, sheet, pal, fr, x, y - 10 * s, { anchor: 'center', scale: Math.max(.2, s * .8), flip: f < 0 })); return; }
  const a = Math.sin(t * 9 + seed) * .5 + .5;
  switch (look) {
    case 'flame': case 'sun': case 'love': {
      const cols = look === 'love' ? [R.dark, R.mid, R.light, R.core] : [R.dark, R.mid, R.light, R.core];
      cols.forEach((c, i) => { const k = 1 - i * .24; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 7 * s * k, y + 4 * s * k); ctx.quadraticCurveTo(x - 3 * s * k, y - 14 * s * k, x + f * (3 + a * 3) * s * k, y - (20 + a * 8) * s * k); ctx.quadraticCurveTo(x + 4 * s * k, y - 8 * s * k, x + 7 * s * k, y + 4 * s * k); ctx.closePath(); ctx.fill(); });
      if (look === 'sun' && seed % 3 === 0) { ctx.fillStyle = R.core; ctx.beginPath(); ctx.arc(x, y - 10 * s, 4 * s, 0, TAU); ctx.fill(); }
      break;
    }
    case 'wave': case 'water': case 'wheel': case 'serpent': {
      ctx.fillStyle = R.mid; ctx.beginPath(); ctx.ellipse(x, y - 8 * s, 9 * s, 6 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = R.light; ctx.beginPath(); ctx.ellipse(x - f * 2 * s, y - 10 * s, 5 * s, 3 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = R.core; ctx.fillRect(Math.round(x + f * 3 * s), Math.round(y - 13 * s), 2, 2);
      break;
    }
    case 'steam': {
      const r = (7 + a * 4) * s;
      ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(x + 2 * s, y - 8 * s, r, 0, TAU); ctx.fill();
      ctx.fillStyle = R.mid; ctx.beginPath(); ctx.arc(x - 3 * s, y - 10 * s, r, 0, TAU); ctx.arc(x + 4 * s, y - 13 * s, r * .8, 0, TAU); ctx.fill();
      ctx.fillStyle = R.light; ctx.beginPath(); ctx.arc(x - 4 * s, y - 13 * s, r * .45, 0, TAU); ctx.fill();
      ctx.fillStyle = R.core; ctx.fillRect(Math.round(x), Math.round(y - 10 * s), 2, 2);
      break;
    }
    case 'ice': { plate(ctx, [[x - 6 * s, y], [x - 3 * s, y - 14 * s], [x + f * 2 * s, y - 22 * s], [x + 5 * s, y - 10 * s], [x + 6 * s, y]], R.mat, 950 + seed, { alpha: 1, glowEdge: .6 }); ctx.fillStyle = R.core; ctx.fillRect(Math.round(x - 1), Math.round(y - 15 * s), 2, Math.round(6 * s)); break; }
    case 'bolt': { ctx.strokeStyle = R.mid; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x - 6 * s, y - 16 * s); ctx.lineTo(x + 2 * s, y - 8 * s); ctx.lineTo(x - 2 * s, y - 6 * s); ctx.lineTo(x + 6 * s, y + 2 * s); ctx.stroke(); ctx.strokeStyle = R.core; ctx.lineWidth = 1; ctx.stroke(); break; }
    case 'wind': case 'mist': { ctx.strokeStyle = look === 'mist' ? R.light : R.mid; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x, y - 10 * s, 9 * s, t * 10 + seed, t * 10 + seed + 4); ctx.stroke(); if (look === 'mist') { ctx.fillStyle = R.mid; ctx.globalAlpha *= .8; ctx.beginPath(); ctx.arc(x + 4 * s, y - 8 * s, 7 * s, 0, TAU); ctx.fill(); } break; }
    case 'rock': { plate(ctx, [[x - 8 * s, y], [x - 5 * s, y - 12 * s], [x + 2 * s, y - 18 * s], [x + 8 * s, y - 6 * s], [x + 6 * s, y]], R.mat, 900 + seed, { alpha: 1, glowEdge: .3 }); break; }
    case 'petal': { for (let i = 0; i < 2; i++) { const ang = t * 6 + seed + i * 2.6; const px = x + Math.cos(ang) * 6 * s; const py = y - 10 * s + Math.sin(ang) * 5 * s; ctx.fillStyle = i ? R.light : R.mid; ctx.beginPath(); ctx.ellipse(px, py, 5 * s, 2.5 * s, ang, 0, TAU); ctx.fill(); } break; }
    case 'moon': { ctx.fillStyle = R.light; ctx.beginPath(); ctx.arc(x, y - 10 * s, 9 * s, -1.4, 1.4); ctx.arc(x - 4 * s, y - 10 * s, 7 * s, 1.2, -1.2, true); ctx.closePath(); ctx.fill(); break; }
    case 'claw': { ctx.strokeStyle = R.light; ctx.lineWidth = 2 * s; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x - 6 * s + i * 4 * s, y - 18 * s); ctx.lineTo(x + 6 * s + i * 4 * s, y); ctx.stroke(); } break; }
    case 'blast': { ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(x, y - 10 * s, 10 * s, 0, TAU); ctx.fill(); ctx.fillStyle = R.mid; ctx.beginPath(); ctx.arc(x, y - 10 * s, 7 * s, 0, TAU); ctx.fill(); ctx.fillStyle = R.core; ctx.beginPath(); ctx.arc(x, y - 10 * s, 3 * s, 0, TAU); ctx.fill(); break; }
    case 'shield': { ctx.strokeStyle = R.mid; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.moveTo(x - 7 * s, y - 18 * s); ctx.lineTo(x + 7 * s, y - 18 * s); ctx.lineTo(x + 7 * s, y - 8 * s); ctx.lineTo(x, y); ctx.lineTo(x - 7 * s, y - 8 * s); ctx.closePath(); ctx.stroke(); break; }
    case 'sting': { ctx.strokeStyle = R.light; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(x - f * 10 * s, y - 10 * s); ctx.lineTo(x + f * 10 * s, y - 10 * s); ctx.stroke(); ctx.fillStyle = R.mid; ctx.beginPath(); ctx.ellipse(x - f * 4 * s, y - 14 * s, 5 * s, 2 * s, -.6 * f, 0, TAU); ctx.fill(); break; }
    case 'sound': { ctx.strokeStyle = R.mid; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x, y - 10 * s, (6 + a * 6) * s, 0, TAU); ctx.stroke(); ctx.fillStyle = R.core; ctx.font = `${Math.round(10 * s)}px monospace`; ctx.fillText('♪', x - 3 * s, y - 6 * s); break; }
    default: { ctx.fillStyle = R.mid; ctx.beginPath(); ctx.arc(x, y - 10 * s, 6 * s, 0, TAU); ctx.fill(); }
  }
}
// Ground effects of an impact / trail, per look.
function groundFx(look, x, z, team, r = 60, gw = null) {
  if (look === 'flame' || look === 'sun') environment.add('scorch', x, z, { radius: r * .7, team });
  else if (look === 'water' || look === 'wave' || look === 'wheel' || look === 'serpent') environment.add('water', x, z, { radius: r * .8, team });
  else if (look === 'rock') { environment.add('crater', x, z, { radius: r * .6, team }); environment.add('crack', x, z, { radius: r, team }); environment.add('rubble', x, z, { radius: r * .7, team }); }
  else if (look === 'bolt') environment.electrify?.(x, z, r, team, 8, gw);
  else if (look === 'ice') environment.add('ice', x, z, { radius: r * .8, team });
  else if (look === 'steam') { environment.add('smoke', x, z, { radius: r, team }); environment.add('water', x, z, { radius: r * .5, team }); }
  else if (look === 'blast' || look === 'sound') { environment.add('crater', x, z, { radius: r * .5, team }); environment.add('scorch', x, z, { radius: r * .5, team }); }
  else if (look === 'claw') environment.add('crack', x, z, { radius: r * .8, team });
}

// ── building blocks ───────────────────────────────────────────────────────
// TORRENT: a body of the element rolls far down the lane (flame serpent, flood, sun dragon …).
function torrent(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const len = m.len * (.75 + .5 * k); const dmg = m.dmg * (.8 + .6 * k);
  emit(new SigSequence({ mat: R.mat, seed: 4300 }, p, { dur: .9, data: { hit: new Set(), acc: 0 }, tick: (s, dt, gw) => {
    const head = 30 + Math.min(1, s.t / .55) * len;
    for (const t of foes(gw, p)) {
      if (s.hit.has(t)) continue;
      const dx = (t.x - s.x) * f; const wob = m.look === 'serpent' || m.look === 'love' ? Math.sin(dx / 40) * 20 : 0;
      if (dx > 0 && dx < head && Math.abs(((t.z ?? s.z) - s.z) * DEPTH - wob) < (m.depth ?? 40)) { s.hit.add(t); strike(p, st, t, dmg, f * (m.push ?? 300), m.freeze ? 40 : 140, .45, true); if (m.freeze) groundFx('ice', t.x, t.z ?? s.z, p.team, 40); if (s.hit.size === 1) quake(5 + 4 * k, .25, 3); }
    }
    s.acc += dt; if (m.scorch && s.acc > .09 && s.t < .55) { s.acc = 0; groundFx(m.look, s.x + f * head, s.z, p.team, 40); }
    if (m.look === 'wave' && s.t < .02) groundFx('water', s.x + f * len * .6, s.z, p.team, 70);
  }, draw: (ctx, s) => {
    const y = groundYForDepth(s.z) - 26; const head = 30 + Math.min(1, s.t / .55) * len; const a = 1 - Math.max(0, (s.t - .55) / .35);
    ctx.save(); ctx.globalAlpha = a;
    // The weapon shapes the body: an arrow's tail (thinner), a fissure along the ground (heavy), a straight thrust (polearm).
    const d = m.delivery; const dk = d?.kind ?? 'none';
    const bodyScale = dk === 'ranged' ? .6 : dk === 'polearm' ? .75 : 1; const bodyY = dk === 'heavy' ? 18 : 0; const straight = dk === 'polearm' || dk === 'ranged';
    const n = 20; const gyW = groundYForDepth(s.z) + 2;
    // Water: one continuous wave — a rolling body growing toward a breaking crest (hand-drawn tiles, style colours).
    if (m.look === 'wave' && spellSheetReady('bw_wave_body')) { const pal = piecePal(R, 'wave'); const fr = Math.floor(s.t * 14) % 4; drawFineFromLayer(ctx, (c) => { let dd = 0; while (dd < head) { const sc = (.7 + .9 * dd / Math.max(1, head)) * bodyScale; drawSpellSpriteTinted(c, 'bw_wave_body', pal, fr, s.x + f * (20 + dd + 16 * sc), gyW, { scale: sc, flip: f < 0 }); dd += 32 * sc - 1; } drawSpellSpriteTinted(c, 'bw_wave_crest', pal, fr, s.x + f * (20 + head + 14), gyW, { scale: 1.7 * bodyScale, flip: f < 0 }); }); }
    else for (let i = 0; i < n; i++) {
      const u = i / (n - 1); const x = s.x + f * (20 + head * u);
      const wav = straight ? Math.sin(u * 20 - s.t * 30) * 4 : m.look === 'serpent' || m.look === 'love' ? Math.sin(u * 14 - s.t * 16) * 18 : Math.sin(u * 9 - s.t * 18) * 10 * u;
      piece(ctx, m.look, x, y + wav + bodyY, (.9 + 1.3 * u) * bodyScale, s.t, R, f, i);
    }
    // The head: the weapon's projectile / blade / tip — else a bigger flare of the element (the ice dragon gets jaws).
    if (!drawHead(ctx, d, s.x + f * (40 + head), y - 10, 1.3, s.t, R, f) && !(m.look === 'wave' && spellSheetReady('bw_wave_crest'))) piece(ctx, m.look, s.x + f * (26 + head), y, 2.6, s.t, R, f, 99);
    if (m.look === 'ice' && dk === 'none') { const hx = s.x + f * (40 + head); plate(ctx, [[hx, y - 30], [hx + f * 34, y - 22], [hx + f * 8, y - 14]], R.mat, 960, { alpha: 1, glowEdge: .8 }); plate(ctx, [[hx, y - 8], [hx + f * 30, y - 4], [hx + f * 6, y + 2]], R.mat, 961, { alpha: 1, glowEdge: .8 }); }
    ctx.restore();
  } }), st.quality);
}
// FLASH: one flash THROUGH every foe in line, landing behind them; an after-effect follows.
function flash(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const dist = (m.dist ?? 220) * (.85 + .5 * k); const dmg = 30 + 24 * k;
  const x0 = p.x; const z0 = p.z;
  if (m.delivery?.kind === 'ranged') swing(p, .35); // the archer plants and shoots (no sprint momentum)
  emit(new SigSequence({ mat: R.mat, seed: 4400 }, p, { dur: .75, x: x0, z: z0, data: { hit: [], x1: x0, moved: false, after: false }, steps: [{ at: .07, fn: (s, gw) => {
    let target = x0 + f * dist;
    const ranged = m.delivery?.kind === 'ranged';
    if (ranged) {
      // A bow / crossbow / thrown weapon: the Wizard stays, a piercing shot covers the same lane.
      s.x1 = x0 + f * dist; s.moved = true; s.shot = true;
      for (const t of foes(gw, p)) if (inLane(t, x0, s.x1, z0, 36)) { s.hit.push(t); strike(p, st, t, m.after === 'ignite' ? dmg * .7 : dmg, f * (m.after === 'blind' ? 60 : 180), 160, .6, m.after === 'paralyze'); if (statusFor[m.after]) applyStatus(t, statusFor[m.after], { force: true }); if (m.after === 'blind' || m.after === 'scald' || m.after === 'solar') t.freeze?.(.6); }
      if (m.trail === 'scorch' || m.trail === 'ice') for (let x = Math.min(x0, s.x1); x < Math.max(x0, s.x1); x += 46) groundFx(m.look, x, z0, p.team, 36);
      quake(s.hit.length ? 7 : 3, .25, s.hit.length ? 3 : 0);
      return;
    }
    if (m.behind) { const t = foes(gw, p).filter((o) => (o.x - x0) * f > 0 && Math.abs(((o.z ?? z0) - z0) * DEPTH) < 40).sort((a, b) => Math.abs(a.x - x0) - Math.abs(b.x - x0))[0]; if (t) target = t.x + f * 46; }
    p.x = target; clampToArena(p, gw?.battlefield?.boundsOverride ?? null); gw?.battlefield?.placeOnSurface?.(p);
    s.x1 = p.x; s.moved = true; p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, .3);
    if (m.behind) p.facing = -f; // turns to bite from behind
    for (const t of foes(gw, p)) if (inLane(t, x0, s.x1, z0, 36)) { s.hit.push(t); strike(p, st, t, m.after === 'ignite' ? dmg * .7 : dmg, f * (m.after === 'blind' ? 60 : 180), 160, .6, m.after === 'paralyze'); if (statusFor[m.after]) applyStatus(t, statusFor[m.after], { force: true }); if (m.after === 'blind' || m.after === 'scald' || m.after === 'solar') t.freeze?.(.6); }
    if (m.after === 'scald') for (let x = Math.min(x0, s.x1); x < Math.max(x0, s.x1); x += 52) groundFx('steam', x, z0, p.team, 34);
    if (m.trail === 'scorch' || m.trail === 'ice') for (let x = Math.min(x0, s.x1); x < Math.max(x0, s.x1); x += 46) groundFx(m.look, x, z0, p.team, 36);
    quake(s.hit.length ? 9 : 4, .3, s.hit.length ? 4 : 0);
  } }, { at: .32, fn: (s) => {
    // After-effect: the cut foes burst into flames / crescent blades linger / the serpent bites again.
    s.after = true;
    for (const t of s.hit) {
      if (!alive(t)) continue;
      if (m.after === 'ignite') { strike(p, st, t, dmg * .8, f * 120, 260, .5, true); applyStatus(t, 'burn', { force: true, duration: 5 }); groundFx(m.look, t.x, t.z ?? z0, p.team, 44); }
      if (m.blades) strike(p, st, t, dmg * .4, 0, 60, .3);
      if (m.behind) strike(p, st, t, dmg * .5, -f * 220, 120, .4, true);
    }
    if (s.hit.length && (m.after === 'ignite' || m.behind || m.blades)) quake(m.after === 'ignite' ? 8 : 5, .3, 3);
  } }], draw: (ctx, s, kk) => {
    const y = groundYForDepth(s.z) - 40;
    if (!s.moved) { sparks(ctx, [[x0, y]], R.mat, s.t, 4401, 14, 1); return; }
    const a = 1 - kk; const n = 11; const roll = Math.floor(s.t * 40);
    if (s.shot) {
      // The piercing shot: the weapon's projectile races down the lane, the element trailing it.
      const u = Math.min(1, Math.max(0, (s.t - .07) / .16)); const hx = x0 + (s.x1 - x0) * u;
      ctx.save(); ctx.globalAlpha = a; for (let i = 0; i < 8; i++) piece(ctx, m.look, hx - f * (16 + i * 18), y + 30, 1.1 - i * .08, s.t, R, f, i); ctx.restore();
      if (u < 1) drawHead(ctx, m.delivery, hx, y, 1.2, s.t, R, f);
    }
    const pts = Array.from({ length: n }, (_, i) => [x0 + (s.x1 - x0) * i / (n - 1), y + (m.look === 'bolt' && i && i < n - 1 ? Math.sin(i * 2.7 + roll) * 13 : m.look === 'mist' ? Math.sin(i * 1.3) * 10 : 0)]);
    if (s.shot) { /* drawn above */ }
    else if (m.look === 'bolt') { thread(ctx, pts, R.mid, 8 * a + 1, a); thread(ctx, pts, R.core, 2.5, a); }
    else { ctx.save(); ctx.globalAlpha = a; for (let i = 0; i < n; i++) piece(ctx, m.look, pts[i][0], pts[i][1] + 30, 1.2, s.t, R, f, i); ctx.restore(); ribbon(ctx, pts, (i, nn) => 3.5 * Math.sin((i / Math.max(1, nn - 1)) * Math.PI) + .5, R.mat, 4402, s.t, a * .9); }
    // The burst on the hit foes after the cut.
    if (s.after) for (const t of s.hit) { const ty = t.y ?? groundYForDepth(t.z ?? s.z); ctx.save(); ctx.globalAlpha = a; for (let i = 0; i < 5; i++) piece(ctx, m.look === 'bolt' ? 'bolt' : m.look, t.x + (i - 2) * 8, ty - 4 - (i % 2) * 14, 1.6, s.t, R, f, i + 7); ctx.restore(); }
    // Blades: the cut marks open on the foes (opaque crossing blades in the element).
    const dk = m.delivery?.kind;
    if ((dk === 'iai' || dk === 'blade') && s.moved && !s.shot && kk < .7) for (const t of s.hit) {
      const ty = (t.y ?? groundYForDepth(t.z ?? s.z)) - 40; ctx.save(); ctx.globalAlpha = Math.min(1, (.7 - kk) * 3);
      for (const dir of dk === 'iai' ? [1] : [1, -1]) { ctx.fillStyle = R.mid; ctx.strokeStyle = R.dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(t.x - 30, ty - 26 * dir); ctx.lineTo(t.x + 30, ty + 22 * dir); ctx.lineTo(t.x + 30, ty + 27 * dir); ctx.lineTo(t.x - 30, ty - 21 * dir); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = R.core; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(t.x - 30, ty - 24 * dir); ctx.lineTo(t.x + 30, ty + 24 * dir); ctx.stroke(); }
      ctx.restore();
    }
  } }), st.quality);
}
// VORTEX: spin on the spot (a whirlwind forms, foes around are cut), then burst forward —
// everyone hit flies away in x AND depth.
function vortex(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const spin = .34; const dash = .2; const dist = 220 + 100 * k;
  const startX = p.x;
  emit(new SigSequence({ mat: R.mat, seed: 4600 }, p, { dur: spin + dash + .35, data: { hitSpin: new Map(), hitDash: new Set(), next: 0 }, tick: (s, dt, gw) => {
    if (s.t < spin) {
      swing(p, .1); s.next -= dt;
      if (s.next <= 0) { s.next = .09; for (const t of foes(gw, p)) if (Math.hypot(t.x - p.x, ((t.z ?? p.z) - p.z) * DEPTH) < 78 && (s.hitSpin.get(t) ?? 0) < 3) { s.hitSpin.set(t, (s.hitSpin.get(t) ?? 0) + 1); strike(p, st, t, 6, 0, 30, .2); t.x += (p.x - t.x) * .2; } }
      return;
    }
    if (s.t < spin + dash) {
      p.state = 'dash'; p.stateTimer = .08; p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, .1);
      const prev = p.x; p.x = startX + f * dist * Math.min(1, (s.t - spin) / dash); clampToArena(p, gw?.battlefield?.boundsOverride ?? null);
      for (const t of foes(gw, p)) if (!s.hitDash.has(t) && inLane(t, prev, p.x, p.z, 60)) { s.hitDash.add(t); strike(p, st, t, 20 + 16 * k, 0, 220, .5, true); blowAway(t, p.x - f * 30, p.z, 720); if (s.hitDash.size === 1) quake(8, .3, 4); }
      return;
    }
    p.vx = 0;
  }, draw: (ctx, s) => {
    const y = (p.y ?? groundYForDepth(p.z)); const spinning = s.t < spin + dash; const a = spinning ? 1 : 1 - (s.t - spin - dash) / .35;
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
    for (let ring = 0; ring < 4; ring++) { const r = 26 + ring * 14; const ang = s.t * 26 + ring; ctx.strokeStyle = ring % 2 ? R.light : R.mid; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, y - 20 - ring * 14, r, r * .32, 0, ang, ang + 3.6); ctx.stroke(); }
    if (s.t >= spin) for (let i = 0; i < 5; i++) { ctx.strokeStyle = R.core; ctx.lineWidth = 2; const yy = y - 20 - i * 12; ctx.beginPath(); ctx.moveTo(p.x - f * 20, yy); ctx.lineTo(p.x - f * (60 + i * 10), yy); ctx.stroke(); }
    ctx.restore();
  } }), st.quality);
}
// DRILL (wind sprint; user, 21 Oct 2026: "horizontaler Wirbel wie Kibas Twin Tornado / Fang over
// Fang", adapted): the Wizard turns into a HORIZONTAL tornado drilling forward, a second tornado
// weaves around him; both drill through the foes several times, at the end everyone hit is
// thrown away in x and depth.
function drill(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const wind = .12; const run = .55; const dist = 300 + 90 * k; const x0 = p.x; const z0 = p.z;
  p.tornadoT = wind + run; // game seconds the sprite stays hidden: the Wizard IS the tornado
  emit(new SigSequence({ mat: R.mat, seed: 4650 }, p, { dur: wind + run + .4, data: { hits: new Map(), next: 0, done: false, twinZ: z0 }, tick: (s, dt, gw) => {
    if (s.t < wind) { swing(p, .1); return; }
    if (s.t < wind + run) {
      p.state = 'dash'; p.stateTimer = .08; p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, .1);
      const u = (s.t - wind) / run; p.x = x0 + f * dist * u; clampToArena(p, gw?.battlefield?.boundsOverride ?? null);
      s.twinZ = Math.max(.04, Math.min(.96, z0 + Math.sin(u * Math.PI * 4) * .09)); // the twin weaves across the lane
      s.next -= dt; if (s.next > 0) return; s.next = .07;
      let any = false;
      for (const t of foes(gw, p)) {
        const near = (zz) => Math.abs(t.x - p.x) < 52 && Math.abs(((t.z ?? zz) - zz) * DEPTH) < 40;
        if (!(near(p.z) || near(s.twinZ)) || (s.hits.get(t) ?? 0) >= 5) continue;
        s.hits.set(t, (s.hits.get(t) ?? 0) + 1); strike(p, st, t, 6 + 4 * k, f * 40, 40, .2); t.x += (p.x + f * 20 - t.x) * .35; any = true;
      }
      if (any) quake(2, .06, 1);
      return;
    }
    if (!s.done) {
      s.done = true; p.vx = 0; p.tornadoT = 0;
      for (const t of s.hits.keys()) { if (!alive(t)) continue; strike(p, st, t, 18 + 14 * k, 0, 320, .6, true); blowAway(t, p.x - f * 20, p.z, 800); }
      if (s.hits.size) quake(9, .3, 5);
    }
  }, draw: (ctx, s) => {
    if (s.t < wind) { ctx.save(); for (let i = 0; i < 3; i++) { ctx.strokeStyle = i % 2 ? R.light : R.mid; ctx.lineWidth = 2; const ang = s.t * 40 + i * 2; ctx.beginPath(); ctx.ellipse(p.x, (p.y ?? 0) - 34, 24 + i * 6, 8 + i * 2, 0, ang, ang + 3.4); ctx.stroke(); } ctx.restore(); return; }
    const after = s.t >= wind + run; const a = after ? Math.max(0, 1 - (s.t - wind - run) / .4) : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
    // A horizontal helix: narrow tip in front, widening backwards, spinning fast.
    const helix = (x, z, phase, scale) => {
      const yc = groundYForDepth(z) - 34; const L = 120 * scale; const n = 18;
      for (let strand = 0; strand < 3; strand++) {
        let prev = null;
        for (let i = 0; i <= n; i++) {
          const u = i / n; const px = x + f * 34 * scale - f * L * u; const r = (4 + 30 * u) * scale; const ang = s.t * 36 + u * 13 + strand * 2.1 + phase;
          const py = yc + Math.sin(ang) * r; const front = Math.cos(ang) > 0;
          if (prev) { ctx.strokeStyle = front ? R.core : (strand % 2 ? R.mid : R.light); ctx.lineWidth = front ? 3 : 2; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(px, py); ctx.stroke(); }
          prev = [px, py];
        }
      }
      // Dust and speed lines behind the drill.
      for (let i = 0; i < 4; i++) { ctx.strokeStyle = R.light; ctx.lineWidth = 2; const yy = yc - 20 + i * 13; ctx.beginPath(); ctx.moveTo(x - f * (L * .9), yy); ctx.lineTo(x - f * (L * .9 + 30 + i * 8), yy); ctx.stroke(); }
    };
    const z = p.z;
    if (!after) { helix(p.x, z, 0, 1); helix(p.x - f * 10, s.twinZ === z ? z + .05 : s.twinZ, Math.PI, .8); }
    else for (let i = 0; i < 10; i++) piece(ctx, 'wind', p.x + Math.cos(i * .63) * 60 * (1 - a + .4), (p.y ?? 0) - 10 + Math.sin(i * .63) * 18, 1.4, s.t, R, f, i);
    ctx.restore();
  } }), st.quality);
}
// CRESCENTS: blades of the element fan out down the lane (wind sickles, chaotic moon blades).
function crescents(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const n = m.count ?? 5; const chaos = m.look === 'moon';
  const blades = Array.from({ length: n }, (_, i) => ({ x: p.x + f * 20, z: p.z, vz: (i - (n - 1) / 2) * (chaos ? .14 : .08) + (chaos ? Math.sin(i * 3.1) * .05 : 0), v: 560 + (chaos ? (i % 3) * 120 : i * 30), s: chaos ? .7 + (i % 3) * .35 : 1.2 + i * .12, hit: new Set(), delay: i * (chaos ? .03 : .06) }));
  emit(new SigSequence({ mat: R.mat, seed: 4700 }, p, { dur: .9, data: { blades }, tick: (s, dt, gw) => {
    for (const b of s.blades) {
      if (s.t < b.delay) continue;
      b.x += f * b.v * dt; b.z = Math.max(.03, Math.min(.97, b.z + b.vz * dt));
      for (const t of foes(gw, p)) if (!b.hit.has(t) && Math.abs(t.x - b.x) < 20 * b.s && Math.abs(((t.z ?? b.z) - b.z) * DEPTH) < 24 * b.s) { b.hit.add(t); strike(p, st, t, (chaos ? 9 : 13) + 8 * k, f * 160, 80, .3); }
    }
    if (s.t < .03) quake(3, .15);
  }, draw: (ctx, s) => {
    ctx.save(); const a = 1 - Math.max(0, (s.t - .6) / .3); ctx.globalAlpha = a;
    const dk = m.delivery?.kind; const own = dk && dk !== 'none' && dk !== 'blade' && dk !== 'iai';
    for (const b of s.blades) { if (s.t < b.delay) continue; const y = groundYForDepth(b.z) - 36; if (own && drawHead(ctx, m.delivery, b.x, y, b.s * .8, s.t, R, f)) { piece(ctx, m.look, b.x - f * 26, y + 26, b.s * .7, s.t, R, f, 3); continue; } if (bigPiece(ctx, m.look, b.x, y, b.s * 1.6, s.t, R, m.look === 'moon' ? f < 0 : f > 0, b.delay * 40)) continue; ctx.fillStyle = R.mid; ctx.beginPath(); ctx.arc(b.x, y, 18 * b.s, f > 0 ? -1.3 : Math.PI - 1.3, f > 0 ? 1.3 : Math.PI + 1.3); ctx.arc(b.x - f * 8 * b.s, y, 14 * b.s, f > 0 ? 1.1 : Math.PI + 1.1, f > 0 ? -1.1 : Math.PI - 1.1, true); ctx.closePath(); ctx.fill(); ctx.strokeStyle = R.core; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
  } }), st.quality);
}
// Each style rises its own way (no weapon): hit area, forward travel, number of hits.
const RISE = Object.freeze({
  wheel: { advance: 70, hits: 2 }, wind: { lift: 780 }, petal: { around: true, hits: 2 }, moon: { wall: true }, mist: { hits: 3 },
  claw: { hits: 2 }, shield: { around: true }, love: { advance: 90, hits: 3 }, sting: { advance: 80, hits: 3 }, sound: { around: true, hits: 3 }
});
// RISING: a rising arc launches everything in front high up (plus the element shooting up).
function rising(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; swing(p, .35);
  const dk = m.delivery?.kind;
  if (m.backflip && p.grounded) { p.grounded = false; p.vElevation = 260; p.vx = -f * 120; }
  else if (p.grounded) { p.grounded = false; p.vElevation = dk === 'fist' ? 560 : dk === 'polearm' ? 480 : 300; } // fist: rising uppercut, polearm: vault
  const rs = dk && dk !== 'none' ? {} : (RISE[m.look] ?? {}); const hits = rs.hits ?? 1; const x0 = p.x;
  emit(new SigSequence({ mat: R.mat, seed: 4800 }, p, { dur: rs.wall ? 1 : .7, data: { hit: new Set(), wave: 0 }, tick: (s, dt, gw) => {
    if (rs.advance && s.t < .3) p.x = x0 + f * rs.advance * (s.t / .3);
    const window = rs.wall ? .9 : .3; if (s.t > window) return;
    const wave = Math.min(hits - 1, Math.floor(s.t / (window / hits))); if (wave !== s.wave) { s.wave = wave; s.hit.clear(); }
    const last = wave === hits - 1;
    for (const t of foes(gw, p)) {
      const dx = (t.x - p.x) * f; const near = rs.around ? Math.hypot(t.x - p.x, ((t.z ?? p.z) - p.z) * DEPTH) < 90 : rs.wall ? Math.abs(dx - 50) < 30 : dx > -20 && dx < 120;
      if (s.hit.has(t) || !near || (!rs.around && Math.abs(((t.z ?? p.z) - p.z) * DEPTH) > (rs.wall ? 60 : 40))) continue;
      s.hit.add(t); strike(p, st, t, (22 + 16 * k) / (last ? 1 : 2.4), f * 80, last ? (rs.lift ?? m.lift ?? 640) : 160, .6, last); if (s.hit.size === 1) quake(last ? 6 : 3, .2, last ? 3 : 1);
    }
  }, draw: (ctx, s) => {
    const kk = Math.min(1, s.t / .3); const a = 1 - Math.max(0, (s.t - .35) / .35); const cx = p.x + f * 30; const by = (p.y ?? groundYForDepth(p.z));
    ctx.save(); ctx.globalAlpha = a;
    for (let i = 0; i < 9; i++) { const u = i / 8 * kk; const ang = (f > 0 ? .9 : Math.PI - .9) - f * u * 2.6; piece(ctx, m.look, cx + Math.cos(ang) * 46, by - 30 + Math.sin(ang) * 54, 1.3, s.t, R, f, i); }
    if (m.pillar || m.look === 'wind' || m.look === 'mist') for (let i = 0; i < 6; i++) piece(ctx, m.look, cx + f * 30 + Math.sin(i + s.t * 9) * 8, by - i * 24 * kk, 1.5, s.t, R, f, i + 20);
    if (!dk || dk === 'none') drawRiseStyle(ctx, m.look, p, s.t, kk, R, f, by);
    // The weapon in the rise: a fist leading a spiral of the element, a spear thrust skyward, an upward iai line.
    if (dk === 'fist') { for (let i = 0; i < 6; i++) piece(ctx, m.look, p.x + Math.sin(i * 1.4 + s.t * 20) * 10, by + i * 14, 1.3 - i * .1, s.t, R, f, i + 30); ctx.save(); ctx.translate(p.x + f * 10, by - 70); ctx.rotate(-f * Math.PI / 2); drawHead(ctx, m.delivery, 0, 0, 1.2, s.t, R, 1); ctx.restore(); }
    if (dk === 'polearm' && kk < 1) { ctx.save(); ctx.translate(p.x + f * 20, by - 40); ctx.rotate(-f * .9); drawHead(ctx, m.delivery, 40 * kk, 0, 1.3, s.t, R, f); ctx.restore(); }
    if (dk === 'iai' && kk < 1) { ctx.fillStyle = R.mid; ctx.fillRect(Math.round(cx + f * 10) - 2, Math.round(by - 20 - 120 * kk), 4, Math.round(120 * kk)); ctx.fillStyle = R.core; ctx.fillRect(Math.round(cx + f * 10) - 1, Math.round(by - 20 - 120 * kk), 2, Math.round(120 * kk)); }
    ctx.restore();
  } }), st.quality);
}
// The style's own rise (drawn on top of the arc).
function drawRiseStyle(ctx, look, p, t, kk, R, f, by) {
  const px = p.x; const cy = by - 40;
  switch (look) {
    case 'wheel': for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * 14 * f; piece(ctx, 'wave', px + f * 10 + Math.cos(a) * 42, cy + Math.sin(a) * 42 + 10, 1.1, t, R, f, i); } break; // a vertical water wheel
    case 'wind': for (let i = 0; i < 10; i++) { const a = t * 18 + i * .9; piece(ctx, 'wind', px + f * 50 + Math.cos(a) * (10 + i * 3), by - i * 18 * kk, 1 + i * .08, t, R, f, i); } break; // a tornado column
    case 'petal': for (let i = 0; i < 14; i++) { const a = i * .8 + t * 10; piece(ctx, 'petal', px + Math.cos(a) * (30 + i * 3), by - 10 - i * 8 * kk + Math.sin(a) * 8, 1, t, R, f, i); } break; // a petal spiral all around
    case 'moon': { const wx = px + f * 50; const h = Math.min(1, kk * 2); for (let i = 0; i < 3; i++) bigPiece(ctx, 'moon', wx - f * Math.abs(i - 1) * 6, by - 22 - i * 30 * h, 1.9 * (i === 1 ? 1.2 : 1), t, R, f < 0, i); break; } // a standing wall of crescents
    case 'mist': for (let i = 1; i <= 3; i++) { const a = -Math.PI / 2 + f * kk * TAU * (i / 3); piece(ctx, 'mist', px + Math.cos(a) * 30, cy + Math.sin(a) * 30, 1.6, t, R, f, i); } break; // somersault afterimages
    case 'claw': { const e = Math.min(1, kk * 1.6); bigPiece(ctx, 'claw', px + f * 52, by - 20 - 50 * e, 1.9 * (.5 + .5 * e), t, R, f < 0, 1); bigPiece(ctx, 'claw', px + f * 60, by - 26 - 50 * e, 1.9 * (.5 + .5 * e), t, R, f > 0, 2); break; } // X rip upward
    case 'shield': for (let i = 0; i <= 6; i++) { const a = Math.PI + i / 6 * Math.PI; piece(ctx, 'shield', px + Math.cos(a) * 70 * kk, by - 20 + Math.sin(a) * 60 * kk, 1.3, t, R, f, i); } break; // the guard dome turning out (hex shards)
    case 'love': for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) { const a0 = f > 0 ? -2 + i * .4 : Math.PI + 2 - i * .4; const a1 = f > 0 ? .6 + i * .4 : Math.PI - .6 - i * .4; const a = a0 + (a1 - a0) * j / 4; piece(ctx, 'love', px + f * (20 + i * 22) + Math.cos(a) * 26, cy - i * 12 + Math.sin(a) * 26 + 10, .9 + j * .08, t, R, f, i * 5 + j); } break; // three leaping whip arcs of hearts
    case 'sting': for (let i = 0; i < 3; i++) { const sx = px + f * (30 + i * 16); piece(ctx, 'sting', sx, cy - 10 + i * 10, 1.1, t, R, f, i); piece(ctx, 'sting', sx + f * 18, cy + i * 10, .8, t, R, f, i + 3); } break; // butterfly stabs
    case 'sound': { for (const o of [0, Math.PI]) { const a = t * 20 + o; piece(ctx, 'sound', px + Math.cos(a) * 46, cy + Math.sin(a) * 18 + 10, 1.5, t, R, f, o); } for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 4; piece(ctx, 'sound', px + Math.cos(a) * (46 * kk + 10), cy + Math.sin(a) * (18 * kk + 5) + 10, .7, t, R, f, i + 2); } break; } // twin note blades spinning inside a ring of notes
    default: break;
  }
}
// PILLAR: the element erupts under the nearest foe ahead (rock pillar, lightning, forge eruption).
function pillar(p, st, k, m, gw) {
  const R = styleOf(st).ramp; const f = p.facing || 1; swing(p, .3);
  const t0 = foes(gw, p).filter((o) => (o.x - p.x) * f > 0 && Math.hypot(o.x - p.x, ((o.z ?? p.z) - p.z) * DEPTH) < 320).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  const x = t0 ? t0.x : p.x + f * 140; const z = t0 ? (t0.z ?? p.z) : p.z;
  emit(new SigSequence({ mat: R.mat, seed: 4900 }, p, { dur: .9, x, z, data: { done: false }, tick: (s, dt, gw2) => {
    if (s.done || s.t < .22) return; s.done = true;
    for (const t of foes(gw2, p)) if (Math.hypot(t.x - x, ((t.z ?? z) - z) * DEPTH) < 54) { if (m.cocoon) { strike(p, st, t, 16 + 10 * k, 0, 0, .7); applyStatus(t, 'frozen', { force: true, duration: 1.2 }); s.cocooned = [...(s.cocooned ?? []), t]; } else strike(p, st, t, 28 + 20 * k, 0, 760, .7, true); }
    groundFx(m.look, x, z, p.team, 50, gw2); quake(m.look === 'rock' ? 9 : 7, .3, 4);
  }, steps: m.cocoon ? [{ at: .75, fn: (s) => { for (const t of s.cocooned ?? []) if (alive(t)) { strike(p, st, t, 24 + 16 * k, 0, 320, .5); combat.spawnHitSparks?.(t.x, (t.y ?? 0) - 40, 1, '#e0f7fa', 22); } if (s.cocooned?.length) quake(7, .25, 4); } }] : [], draw: (ctx, s) => {
    const y = groundYForDepth(z); ctx.save();
    if (s.t < .22) {
      ctx.globalAlpha = .6 + .4 * Math.sin(s.t * 40); ctx.strokeStyle = R.mid; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 30, 9, 0, 0, TAU); ctx.stroke();
      if (m.delivery?.kind === 'ranged') { const u = s.t / .22; const sx = s.x0 ?? (s.x0 = p.x); const ax = sx + (x - sx) * u; const ay = (groundYForDepth(z) - 50) - Math.sin(u * Math.PI) * 90 + u * 50; ctx.globalAlpha = 1; ctx.translate(ax, ay); ctx.rotate(f * (u - .5) * 1.6); drawHead(ctx, m.delivery, 0, 0, 1.1, s.t, R, f); }
      ctx.restore(); return;
    }
    const kk = Math.min(1, (s.t - .22) / .12); const a = 1 - Math.max(0, (s.t - .6) / .3); ctx.globalAlpha = a; const H = 150 * kk;
    if (m.look === 'bolt') { const pts = Array.from({ length: 8 }, (_, i) => [x + (i && i < 7 ? Math.sin(i * 2.3 + s.t * 30) * 10 : 0), y - 260 + i * 260 / 7]); thread(ctx, pts, R.mid, 9, a); thread(ctx, pts, R.core, 3, a); }
    else if (m.look === 'rock') plate(ctx, [[x - 22, y], [x - 14, y - H], [x, y - H - 18], [x + 14, y - H], [x + 22, y]], R.mat, 4901, { alpha: a, glowEdge: .4 });
    else if (m.look === 'ice') { const hh = Math.min(H, 96); plate(ctx, [[x - 26, y], [x - 30, y - hh * .6], [x - 12, y - hh], [x + 12, y - hh * .95], [x + 30, y - hh * .55], [x + 24, y]], R.mat, 4902, { alpha: a * .85, glowEdge: .9 }); if (s.t > .75) for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; piece(ctx, 'ice', x + Math.cos(ang) * 40 * (s.t - .75) * 4, y - 40 + Math.sin(ang) * 30 * (s.t - .75) * 4, 1, s.t, R, f, i); } }
    else for (let i = 0; i < 7; i++) piece(ctx, m.look, x + Math.sin(i * 1.7) * 8, y - i * H / 6, 1.8 - i * .1, s.t, R, f, i);
    ctx.restore();
  } }), st.quality);
}
// CRASH (air down / sprint jump): straight down, the landing is the impact — radial blast,
// ground effects (crater, scorch, puddle, electrified ground, blooms …), debris, shake by weight.
function crash(p, st, m, gw) {
  const R = styleOf(st).ramp; const f = p.facing || 1;
  p.state = 'dive'; p.stateTimer = 1.2; p.vElevation = -1150; p.vx = f * 120; p.airLatch = null;
  const dk = m.delivery?.kind;
  const heavy = m.look === 'rock' || m.look === 'blast' || m.look === 'sound' || m.look === 'sun' || dk === 'heavy'; // a hammer always lands like a meteor
  emit(new SigSequence({ mat: R.mat, seed: 5000 }, p, { dur: 2, data: { landed: false, lt: 0 }, tick: (s, dt, gw2) => {
    if (!s.landed) {
      // Wild styles cut all around while still falling (beast, love, sound, insect).
      if (!p.grounded && ['claw', 'love', 'sound', 'sting'].includes(m.look) && (s.cut = (s.cut ?? 0) + dt) > .08) { s.cut = 0; for (const t of foes(gw2, p)) if (Math.hypot(t.x - p.x, ((t.z ?? p.z) - p.z) * DEPTH) < 70) strike(p, st, t, 5 + 3, 0, 20, .15); }
      if (!p.grounded && s.t < 1.4) return;
      s.landed = true; s.lt = s.t; s.x = p.x; s.z = p.z; p.vx = 0;
      const r = heavy ? 120 : 95;
      for (const t of foes(gw2, p)) { const d = Math.hypot(t.x - p.x, ((t.z ?? p.z) - p.z) * DEPTH); if (d < r) { strike(p, st, t, (heavy ? 34 : 26) * (1 - d / r * .4), 0, m.look === 'wind' ? 300 : 480, .6, true); blowAway(t, p.x, p.z, m.look === 'wind' ? 760 : 380); } }
      groundFx(m.look, p.x, p.z, p.team, r * .8, gw2);
      // Style extras on landing.
      if (m.look === 'moon') crescentRing(p, st, p.x, p.z);
      if (m.look === 'mist' || m.look === 'sun') for (const t of foes(gw2, p)) if (Math.hypot(t.x - p.x, ((t.z ?? p.z) - p.z) * DEPTH) < r) t.freeze?.(.6); // blinding mist / light
      if (m.look === 'wave' || m.look === 'water') for (const t of foes(gw2, p)) if (Math.hypot(t.x - p.x, ((t.z ?? p.z) - p.z) * DEPTH) < r) applyStatus(t, 'wet', { force: true });
      if (m.shield) { p.arcaneShield = Math.max(p.arcaneShield ?? 0, m.shield); p.arcaneShieldTimer = Math.max(p.arcaneShieldTimer ?? 0, 4); }
      if (styleOf(st).heals) for (const a of [p]) a.hp = Math.min(a.maxHp, a.hp + 10);
      quake(heavy ? 14 : 9, .35, heavy ? 6 : 4);
      combat.spawnShockwave?.(p.x, (p.y ?? 0) - 6, r, R.light);
      s.dur = s.lt + .6;
    }
  }, draw: (ctx, s) => {
    if (!s.landed) { ctx.save(); for (let i = 0; i < 4; i++) { ctx.globalAlpha = 1 - i * .22; piece(ctx, m.look, p.x - f * i * 9, (p.y ?? 0) - 52 - i * 18, .9 - i * .15, s.t, R, f, i); } ctx.restore(); return; } // a comet trail above the falling Wizard
    const kk = Math.min(1, (s.t - s.lt) / .3); const a = 1 - Math.max(0, (s.t - s.lt - .25) / .35); const y = groundYForDepth(s.z);
    ctx.save(); ctx.globalAlpha = a; const r = (heavy ? 120 : 95) * kk;
    ctx.strokeStyle = R.mid; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(s.x, y, r, r * .3, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) { const ang = i / 12 * TAU; piece(ctx, m.look, s.x + Math.cos(ang) * r * .8, y + Math.sin(ang) * r * .24, 1.4, s.t, R, f, i); }
    if (m.look === 'shield') { ctx.strokeStyle = R.light; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(s.x, y, r * .7, r * .9, 0, Math.PI, TAU); ctx.stroke(); }
    if (m.look === 'rock') for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; const sx = s.x + Math.cos(ang) * r * .7; const sy = y + Math.sin(ang) * r * .2; plate(ctx, [[sx - 7, sy], [sx - 2, sy - 22 * kk], [sx + 3, sy - 26 * kk], [sx + 7, sy]], R.mat, 5010 + i, { alpha: 1, glowEdge: .4 }); }
    if (m.look === 'wave' || m.look === 'water') for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU; const sx = s.x + Math.cos(ang) * r * .6; const sy = y + Math.sin(ang) * r * .18; for (let j = 0; j < 4; j++) piece(ctx, 'wave', sx, sy - j * 16 * kk, 1 - j * .15, s.t, R, f, i * 4 + j); }
    if (m.look === 'sun') for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU; const sx = s.x + Math.cos(ang) * r * .7; ctx.fillStyle = R.light; ctx.fillRect(Math.round(sx) - 3, Math.round(y + Math.sin(ang) * r * .2 - 90 * kk), 6, Math.round(90 * kk)); }
    // The weapon driven into the ground at the center (spear, fist, blade, sigil), pointing down.
    if (dk && dk !== 'none' && dk !== 'heavy' && kk < 1) { ctx.translate(s.x, y - 30); ctx.rotate(Math.PI / 2); drawHead(ctx, m.delivery, 0, 0, 1.4, s.t, R, 1); }
    ctx.restore();
  } }), st.quality);
}
// A ring of crescent blades flying out in every direction (moon landing).
function crescentRing(p, st, x, z) {
  const R = styleOf(st).ramp; const blades = Array.from({ length: 8 }, (_, i) => ({ a: i / 8 * TAU, r: 10, hit: new Set() }));
  emit(new SigSequence({ mat: R.mat, seed: 5050 }, p, { dur: .5, x, z, data: { blades }, tick: (s, dt, gw) => {
    for (const bl of s.blades) { bl.r += 380 * dt; const bx = x + Math.cos(bl.a) * bl.r; const bz = z + Math.sin(bl.a) * bl.r / DEPTH; for (const t of foes(gw, p)) if (!bl.hit.has(t) && Math.hypot(t.x - bx, ((t.z ?? bz) - bz) * DEPTH) < 22) { bl.hit.add(t); strike(p, st, t, 8, Math.cos(bl.a) * 200, 60, .25); } }
  }, draw: (ctx, s) => { ctx.save(); ctx.globalAlpha = 1 - s.t / .5; for (const bl of s.blades) { const bx = x + Math.cos(bl.a) * bl.r; const by = groundYForDepth(z + Math.sin(bl.a) * bl.r / DEPTH) - 30; piece(ctx, 'moon', bx, by + 10, 1.2, s.t, R, Math.cos(bl.a) >= 0 ? 1 : -1, 1); } ctx.restore(); } }), st.quality);
}
// BOOMERANG: a spinning stone weapon hurled forward drills through and comes back.
function boomerang(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; swing(p, .3); const range = 260 + 100 * k;
  emit(new SigSequence({ mat: R.mat, seed: 5100 }, p, { dur: 1.1, data: { out: new Set(), back: new Set(), bx: p.x, bz: p.z }, tick: (s, dt, gw) => {
    const u = s.t / 1.1; const d = Math.sin(Math.min(1, u) * Math.PI) * range; s.bx = p.x + f * d; s.bz = p.z;
    const set = u < .5 ? s.out : s.back;
    for (const t of foes(gw, p)) if (!set.has(t) && Math.abs(t.x - s.bx) < 26 && Math.abs(((t.z ?? s.bz) - s.bz) * DEPTH) < 30) { set.add(t); strike(p, st, t, 20 + 14 * k, f * (u < .5 ? 220 : -160), 120, .45, true); quake(5, .18, 2); }
  }, draw: (ctx, s) => {
    const y = groundYForDepth(s.bz) - 34; const ang = s.t * 24;
    ctx.save(); ctx.translate(s.bx, y); ctx.rotate(ang);
    plate(ctx, [[-16, -6], [-6, -16], [8, -14], [16, 2], [6, 14], [-10, 12]], R.mat, 5101, { alpha: 1, glowEdge: .3 });
    ctx.restore();
    thread(ctx, [[p.x + f * 12, (p.y ?? 0) - 40], [s.bx, y]], R.dark, 2, .9);
  } }), st.quality);
}
// FLURRY: a rushing flurry of cuts (fangs, nine peonies, zig-zag mist, cat claws, six stings).
function flurry(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const n = m.hits ?? 5; const dist = (m.dist ?? 200) * (.85 + .4 * k); const dur = .42; const x0 = p.x; const z0 = p.z;
  emit(new SigSequence({ mat: R.mat, seed: 5200 }, p, { dur: dur + .35, data: { count: new Map(), next: 0, marks: [] }, tick: (s, dt, gw) => {
    if (s.t > dur) { p.vx = 0; return; }
    swing(p, .08); p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, .08);
    const u = s.t / dur; p.x = x0 + f * dist * u; if (m.zigzag) p.z = Math.max(.05, Math.min(.95, z0 + Math.sin(u * Math.PI * 4) * .12));
    clampToArena(p, gw?.battlefield?.boundsOverride ?? null);
    s.next -= dt; if (s.next > 0) return; s.next = dur / n;
    s.marks.push({ x: p.x + f * 30, z: p.z, t: s.t, rot: (s.marks.length % 2 ? 1 : -1) * .8 });
    let any = false;
    const reach = m.delivery?.kind === 'polearm' ? 90 : 60;
    for (const t of foes(gw, p)) if (Math.abs(t.x - (p.x + f * 30)) < reach && Math.abs(((t.z ?? p.z) - p.z) * DEPTH) < 44 && (s.count.get(t) ?? 0) < n) { s.count.set(t, (s.count.get(t) ?? 0) + 1); strike(p, st, t, 8 + 5 * k, f * 60, 50, .25); any = true; }
    if (any) quake(2, .08, 1);
  }, draw: (ctx, s) => {
    ctx.save();
    for (const mk of s.marks) { const age = s.t - mk.t; if (age > .3) continue; const y = groundYForDepth(mk.z) - 40; ctx.globalAlpha = 1 - age / .3; if (m.delivery?.kind && m.delivery.kind !== 'none') { ctx.save(); ctx.translate(mk.x, y); ctx.rotate(mk.rot * .4); drawHead(ctx, m.delivery, 0, 0, .9, s.t, R, f); ctx.restore(); piece(ctx, m.look, mk.x, y + 14, 1, s.t, R, f, mk.t * 10); continue; } ctx.strokeStyle = R.light; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mk.x - 22 * Math.cos(mk.rot), y - 22 * Math.sin(mk.rot)); ctx.lineTo(mk.x + 22 * Math.cos(mk.rot), y + 22 * Math.sin(mk.rot)); ctx.stroke(); piece(ctx, m.look, mk.x, y + 14, 1.2, s.t, R, f, mk.t * 10); }
    if (m.zigzag && s.t < dur) for (let i = 1; i <= 3; i++) { ctx.globalAlpha = .3 / i; piece(ctx, 'mist', p.x - f * i * 22, (p.y ?? 0) - 6, 2, s.t, R, f, i); }
    ctx.restore();
  } }), st.quality);
}
// CHARGE: an unstoppable rush (invulnerable): foes are pushed along, then thrown at the end.
function charge(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const dur = .45; const dist = 240 + 80 * k; const x0 = p.x;
  emit(new SigSequence({ mat: R.mat, seed: 5300 }, p, { dur: dur + .4, data: { carried: new Set(), acc: 0, done: false }, tick: (s, dt, gw) => {
    if (s.t <= dur) {
      p.state = 'dash'; p.stateTimer = .08; p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, .1);
      p.x = x0 + f * dist * (s.t / dur); clampToArena(p, gw?.battlefield?.boundsOverride ?? null);
      for (const t of foes(gw, p)) if (!s.carried.has(t) && (t.x - p.x) * f > -10 && (t.x - p.x) * f < 50 && Math.abs(((t.z ?? p.z) - p.z) * DEPTH) < 44) { s.carried.add(t); strike(p, st, t, 10 + 6 * k, 0, 0, .5); }
      for (const t of s.carried) { t.x = p.x + f * 40; if ('kbVelX' in t) t.kbVelX = 0; }
      s.acc += dt; if (s.acc > .1) { s.acc = 0; groundFx(m.look === 'rock' ? 'claw' : m.look, p.x - f * 20, p.z, p.team, 30, gw); }
      return;
    }
    if (!s.done) {
      s.done = true; p.vx = 0;
      for (const t of s.carried) { strike(p, st, t, 22 + 16 * k, f * 900, 320, .7, true); if ('kbVelX' in t) t.kbVelX = f * 900; }
      if (s.carried.size) quake(m.look === 'rock' || m.look === 'blast' ? 13 : 10, .32, 6);
    }
  }, draw: (ctx, s) => {
    const y = (p.y ?? 0); ctx.save(); const a = s.t <= dur ? 1 : 1 - (s.t - dur) / .4; ctx.globalAlpha = a;
    for (let i = 0; i < 6; i++) piece(ctx, m.look, p.x - f * (10 + i * 16), y - 6 - (i % 2) * 18, 1.5 - i * .15, s.t, R, f, i);
    if (m.look === 'shield') { ctx.strokeStyle = R.light; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x + f * 24, y - 40, 30, f > 0 ? -1.2 : Math.PI - 1.2, f > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke(); }
    if (s.t <= dur) drawHead(ctx, m.delivery, p.x + f * 46, y - 40, 1.4, s.t, R, f);
    ctx.restore();
  } }), st.quality);
}
// BLASTS: a chain of blasts marches down the lane (forge sparks, sound booms).
function blasts(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const n = m.count ?? 4; swing(p, .3);
  const spots = Array.from({ length: n }, (_, i) => ({ x: p.x + f * (70 + i * 70 * (.9 + .3 * k)), z: p.z, at: .12 + i * .12, done: false }));
  emit(new SigSequence({ mat: R.mat, seed: 5400 }, p, { dur: .12 + n * .12 + .45, data: { spots }, tick: (s, dt, gw) => {
    for (const sp of s.spots) {
      if (sp.done || s.t < sp.at) continue; sp.done = true;
      for (const t of foes(gw, p)) if (Math.hypot(t.x - sp.x, ((t.z ?? sp.z) - sp.z) * DEPTH) < 50) { strike(p, st, t, 14 + 10 * k, f * 260, 200, .45, true); }
      groundFx(m.look, sp.x, sp.z, p.team, 40, gw); quake(5, .15, 2);
    }
  }, draw: (ctx, s) => {
    ctx.save();
    if (m.delivery?.kind === 'ranged') for (const sp of s.spots) { const u = (s.t - (sp.at - .14)) / .14; if (u < 0 || u >= 1) continue; const gy = groundYForDepth(sp.z); ctx.save(); ctx.translate(sp.x - f * 40 * (1 - u), gy - 24 - 120 * (1 - u)); ctx.rotate(f * .9); drawHead(ctx, m.delivery, 0, 0, 1, s.t, R, f); ctx.restore(); }
    for (const sp of s.spots) { if (s.t < sp.at) continue; const age = s.t - sp.at; if (age > .4) continue; const y = groundYForDepth(sp.z); const kk = age / .4; ctx.globalAlpha = 1 - kk; const r = 14 + 34 * kk;
      ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(sp.x, y - 24, r, 0, TAU); ctx.fill(); ctx.fillStyle = R.mid; ctx.beginPath(); ctx.arc(sp.x, y - 24, r * .7, 0, TAU); ctx.fill(); ctx.fillStyle = R.core; ctx.beginPath(); ctx.arc(sp.x, y - 24, r * .3, 0, TAU); ctx.fill();
      if (m.look === 'sound') { ctx.strokeStyle = R.light; ctx.lineWidth = 2; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(sp.x, y - 24, r * (1.2 + i * .4), r * (1.2 + i * .4) * .6, 0, 0, TAU); ctx.stroke(); } } }
    ctx.restore();
  } }), st.quality);
}
// CALM (ward): total stillness — for a moment every hit is turned away and answered, then a
// shield wave pushes forward.
function calm(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const dur = 1.1 + .6 * k; st.calmUntil = st.t + dur; swing(p, dur);
  emit(new SigSequence({ mat: R.mat, seed: 5500 }, p, { dur: dur + .4, data: { waved: false, hit: new Set() }, tick: (s, dt, gw) => {
    p.vx = 0;
    if (!s.waved && s.t >= dur) { s.waved = true; for (const t of foes(gw, p)) if ((t.x - p.x) * f > -20 && (t.x - p.x) * f < 160 && Math.abs(((t.z ?? p.z) - p.z) * DEPTH) < 50) strike(p, st, t, 18 + 14 * k, f * 520, 120, .5, true); quake(6, .2, 3); }
  }, draw: (ctx, s) => {
    const y = (p.y ?? 0); ctx.save(); ctx.lineWidth = 2;
    if (s.t < dur) { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + s.t * 1.5; piece(ctx, 'shield', p.x + Math.cos(a) * 40, y - 30 + Math.sin(a) * 50, 1.1, s.t, R, f, i); } }
    else { const kk = (s.t - dur) / .4; ctx.globalAlpha = 1 - kk; if (!bigPiece(ctx, 'wind', p.x + f * (30 + 120 * kk), y - 40, 3, s.t, R, f > 0)) { ctx.strokeStyle = R.light; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x + f * (30 + 120 * kk), y - 40, 40, f > 0 ? -1.2 : Math.PI - 1.2, f > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke(); } }
    ctx.restore();
  } }), st.quality);
}
// ORBIT (serpent): the Wizard coils around the nearest foe, cutting from every side.
function orbit(p, st, k, m, gw) {
  const R = styleOf(st).ramp; const f = p.facing || 1;
  const t0 = foes(gw, p).filter((o) => Math.hypot(o.x - p.x, ((o.z ?? p.z) - p.z) * DEPTH) < 260).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  if (!t0) return rising(p, st, k, { ...m, look: 'serpent' });
  const cx = t0.x; const cz = t0.z ?? p.z;
  emit(new SigSequence({ mat: R.mat, seed: 5600 }, p, { dur: .8, data: { step: 0 }, tick: (s, dt, gw2) => {
    const step = Math.floor(s.t / .14); p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, .1);
    if (step < 4 && step >= s.step) {
      s.step = step + 1; const ang = step * Math.PI / 2 + Math.PI;
      p.x = cx + Math.cos(ang) * 50; p.z = Math.max(.04, Math.min(.96, cz + Math.sin(ang) * 50 / DEPTH)); p.facing = Math.sign(cx - p.x) || f; swing(p, .1);
      if (alive(t0)) { strike(p, st, t0, 10 + 6 * k, 0, step === 3 ? 600 : 40, .3, step === 3); quake(step === 3 ? 7 : 2, .12, step === 3 ? 4 : 1); }
    }
  }, draw: (ctx, s) => {
    const y = groundYForDepth(cz); ctx.save(); ctx.globalAlpha = 1 - Math.max(0, (s.t - .55) / .25);
    for (let i = 0; i < 16; i++) { const ang = i / 16 * TAU * Math.min(1, s.t / .56); piece(ctx, 'serpent', cx + Math.cos(ang) * 50, y + Math.sin(ang) * 15 - 10, 1.3, s.t, R, f, i); }
    ctx.restore();
  } }), st.quality);
}
// ── weapon variants (breathing × weapon): same effect, the weapon's delivery ─────────────
// A projectile drawn pointing straight down (arrow rain).
function headDown(ctx, d, x, y, s, t, R) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 2); drawHead(ctx, d, 0, 0, s, t, R, 1); ctx.restore(); }
// ARROW RAIN (bow charge up: the archer appears high above the foe like the spiral sphere, then
// rains element arrows; bow dive: from where it is in the air) — the spot is hit again and again.
function arrowRain(p, st, k, m, gw, teleport) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const d = m.delivery;
  const t0 = foes(gw, p).filter((o) => (o.x - p.x) * f > -40 && Math.hypot(o.x - p.x, ((o.z ?? p.z) - p.z) * DEPTH) < 360).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  const tx = t0 ? t0.x : p.x + f * (teleport ? 150 : 40); const tz = t0 ? (t0.z ?? p.z) : p.z;
  if (teleport) { combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 30, R.mid); p.x = tx - f * 8; p.z = tz; clampToArena(p, gw?.battlefield?.boundsOverride ?? null); p.grounded = false; p.elevation = Math.max(p.elevation ?? 0, 140); /* high above the foe (user, 22 Oct 2026), still below the HUD chips */ p.invulnerableTimer = Math.max(p.invulnerableTimer ?? 0, .5); }
  p.state = 'heavyStrike'; p.stateTimer = .6; p.vx = 0; p.vz = 0; p.vElevation = 0; p.airLatch = null;
  p._weaponMotion = 'draw'; p._weaponSwingTime = .6;
  const n = 12; const arrows = Array.from({ length: n }, (_, i) => ({ at: .12 + i * .035, x: tx + Math.sin(i * 2.39) * 62, z: Math.max(.03, Math.min(.97, tz + Math.cos(i * 1.7) * .1)), done: false }));
  const end = .12 + n * .035 + .16;
  p.aerialAim = end + .15; // the archer lies flat in the air, the bow pointing down (entities.js render)
  emit(new SigSequence({ mat: R.mat, seed: 7900 }, p, { dur: end + .5, data: { arrows, fin: false }, tick: (s, dt, gw2) => {
    if (s.t < end) p.vElevation = Math.max(p.vElevation ?? 0, 0); // hover while shooting
    for (const a of s.arrows) {
      if (a.done || s.t < a.at + .16) continue; a.done = true;
      for (const t of foes(gw2, p)) if (Math.hypot(t.x - a.x, ((t.z ?? a.z) - a.z) * DEPTH) < 32) strike(p, st, t, 6 + 5 * k, 0, 60, .25);
      if (s.arrows.indexOf(a) % 4 === 0) groundFx(m.look, a.x, a.z, p.team, 26, gw2);
    }
    if (!s.fin && s.t > end) { s.fin = true; for (const t of foes(gw2, p)) if (Math.hypot(t.x - tx, ((t.z ?? tz) - tz) * DEPTH) < 84) strike(p, st, t, 10 + 8 * k, 0, 220, .4, true); quake(7, .25, 3); }
  }, draw: (ctx, s) => {
    ctx.save();
    if (s.t < end) { ctx.globalAlpha = .7; ctx.strokeStyle = R.mid; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(tx, groundYForDepth(tz), 64, 19, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    for (const a of s.arrows) {
      if (s.t < a.at) continue; const gy = groundYForDepth(a.z); const sy = (p.y ?? gy) - 30; const kk = Math.min(1, (s.t - a.at) / .16);
      if (kk < 1) { const y = sy + (gy - 10 - sy) * kk; piece(ctx, m.look, a.x, y - 26, .8, s.t, R, f, a.at * 30); headDown(ctx, d, a.x, y, 1, s.t, R); }
      else if (s.t - a.at < .5) { ctx.globalAlpha = 1 - (s.t - a.at - .16) / .34; headDown(ctx, d, a.x, gy - 12, .9, s.t, R); ctx.globalAlpha = 1; }
    }
    ctx.restore();
  } }), st.quality);
}
// VOLLEY (ranged / caster flurry): the shooter stays and fires shot after shot down the lane.
function volley(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const n = m.hits ?? 5; const range = (m.dist ?? 200) * 1.6; swing(p, .5);
  emit(new SigSequence({ mat: R.mat, seed: 7950 }, p, { dur: n * .08 + .55, data: { shots: [], next: 0, fired: 0 }, tick: (s, dt, gw) => {
    s.next -= dt; if (s.fired < n && s.next <= 0) { s.next = .08; s.fired++; s.shots.push({ x: p.x + f * 24, z: p.z, x0: p.x, done: false }); }
    for (const sh of s.shots) {
      if (sh.done) continue; sh.x += f * 950 * dt; if (Math.abs(sh.x - sh.x0) > range) { sh.done = true; continue; }
      const t = foes(gw, p).find((o) => Math.abs(o.x - sh.x) < 20 && Math.abs(((o.z ?? sh.z) - sh.z) * DEPTH) < 30);
      if (t) { sh.done = true; strike(p, st, t, 9 + 5 * k, f * 80, 40, .25); quake(2, .06, 1); }
    }
  }, draw: (ctx, s) => { for (const sh of s.shots) { if (sh.done) continue; const y = groundYForDepth(sh.z) - 42; piece(ctx, m.look, sh.x - f * 22, y + 26, .8, s.t, R, f, 2); drawHead(ctx, m.delivery, sh.x, y, 1, s.t, R, f); } } }), st.quality);
}
// PIERCING SHOT (ranged charge): one huge projectile carries every foe it meets down the lane.
function piercingShot(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const dur = .45; const dist = 260 + 80 * k; const x0 = p.x + f * 30; swing(p, .5);
  emit(new SigSequence({ mat: R.mat, seed: 7970 }, p, { dur: dur + .4, data: { carried: new Set(), done: false, sx: x0 }, tick: (s, dt, gw) => {
    if (s.t <= dur) {
      s.sx = x0 + f * dist * (s.t / dur);
      for (const t of foes(gw, p)) if (!s.carried.has(t) && Math.abs(t.x - s.sx) < 30 && Math.abs(((t.z ?? p.z) - p.z) * DEPTH) < 44) { s.carried.add(t); strike(p, st, t, 10 + 6 * k, 0, 0, .5); }
      for (const t of s.carried) { t.x = s.sx + f * 22; if ('kbVelX' in t) t.kbVelX = 0; }
      return;
    }
    if (!s.done) { s.done = true; for (const t of s.carried) { strike(p, st, t, 22 + 16 * k, f * 900, 320, .7, true); if ('kbVelX' in t) t.kbVelX = f * 900; } if (s.carried.size) quake(10, .3, 5); }
  }, draw: (ctx, s) => { if (s.t > dur + .05) return; const y = groundYForDepth(p.z) - 44; for (let i = 0; i < 6; i++) piece(ctx, m.look, s.sx - f * (30 + i * 20), y + 30, 1.4 - i * .15, s.t, R, f, i); drawHead(ctx, m.delivery, s.sx, y, 2.4, s.t, R, f); } }), st.quality);
}
// GROUND SLAMS (heavy flurry): the hammer pounds the ground, earth shocks march forward.
function groundSlams(p, st, k, m) {
  const R = styleOf(st).ramp; const f = p.facing || 1; const n = Math.max(3, Math.ceil((m.hits ?? 5) / 2)); swing(p, .2 + n * .14);
  const spots = Array.from({ length: n }, (_, i) => ({ x: p.x + f * (55 + i * 62), z: p.z, at: .1 + i * .14, done: false }));
  emit(new SigSequence({ mat: R.mat, seed: 7990 }, p, { dur: .1 + n * .14 + .4, data: { spots }, tick: (s, dt, gw) => {
    for (const sp of s.spots) { if (sp.done || s.t < sp.at) continue; sp.done = true; for (const t of foes(gw, p)) if (Math.hypot(t.x - sp.x, ((t.z ?? sp.z) - sp.z) * DEPTH) < 48) strike(p, st, t, 13 + 8 * k, f * 120, 280, .4); groundFx(m.look, sp.x, sp.z, p.team, 34, gw); environment.add('crack', sp.x, sp.z, { radius: 40, team: p.team }); quake(5, .14, 2); }
  }, draw: (ctx, s) => { for (const sp of s.spots) { if (s.t < sp.at) continue; const age = s.t - sp.at; if (age > .35) continue; const gy = groundYForDepth(sp.z); ctx.save(); ctx.globalAlpha = 1 - age / .35; drawHead(ctx, m.delivery, sp.x, gy - 26, 1.2, s.t, R, f); for (let i = 0; i < 4; i++) piece(ctx, m.look, sp.x + (i - 1.5) * 14, gy - 4 - age * 60, 1, s.t, R, f, i); ctx.restore(); } } }), st.quality);
}
const KINDS = { torrent, flash, vortex, drill, crescents, rising, pillar, boomerang, flurry, charge, blasts, calm, orbit, crash: (p, st, k, m, gw) => crash(p, st, m, gw) };
// Per weapon: moves that are delivered by a different building block (same damage, status, ground effects).
const WEAPON_KINDS = {
  ranged: { rising: (p, st, k, m, gw) => arrowRain(p, st, k, m, gw, true), crash: (p, st, k, m, gw) => arrowRain(p, st, k, m, gw, false), flurry: volley, charge: piercingShot },
  caster: { flurry: volley, rising: pillar },
  heavy: { flurry: groundSlams, rising: pillar }
};
function runMove(p, st, move, k, gw) {
  if (!move) return false;
  p.lastBreathMove = move.name;
  // The weapon delivers the move in its own style (same effect): breathing_weapons.js.
  const delivery = deliveryOf(p); const R = styleOf(st).ramp;
  combat.spawnDamageText?.(p.x, (p.y ?? 0) - 96, move.name, { color: R.light });
  if (delivery.kind !== 'none' && move.kind !== 'drill') emit(new SigSequence({ mat: R.mat, seed: 7800 }, p, { dur: .32, draw: (ctx, s, kk) => drawFlourish(ctx, delivery, p.x, p.y ?? groundYForDepth(p.z), kk, s.t, R, p.facing || 1) }), st.quality);
  (WEAPON_KINDS[delivery.kind]?.[move.kind] ?? KINDS[move.kind] ?? torrent)(p, st, k, { ...move, delivery }, gw);
  return true;
}

// ── MAL ERWACHT (the Demon Slayer Mark, adapted) ──────────────────────────
function awakenMark(p, st, gw) {
  if ((st.markCd ?? 0) > st.t) { combat.spawnDamageText?.(p.x, (p.y ?? 0) - 90, 'MAL ERSCHÖPFT', { color: '#9e9e9e' }); return true; }
  st.mark = { t: MARK.dur }; st.markCd = st.t + MARK.cooldown; swing(p, .45);
  if (st.style === 'sun') emit(new RayCrownFx(p, { life: 1.2 }), st.quality);
  combat.spawnDamageText?.(p.x, (p.y ?? 0) - 100, 'MAL ERWACHT', { color: styleOf(st).ramp.light, isCrit: true });
  combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 70, styleOf(st).ramp.mid); quake(6, .3, 3);
  // Resonance: the mark spreads to allies nearby (they grow faster and heal a little).
  const allies = [...(gw?.minions ?? []), ...(gw?.primal ? [gw.primal] : [])].filter((a) => a && a.team === p.team && alive(a) && Math.hypot(a.x - p.x, ((a.z ?? p.z) - p.z) * DEPTH) < MARK.spread);
  for (const a of allies) { a.breathMark = { t: MARK.allyDur, look: styleOf(st).mark, color: styleOf(st).ramp.mid }; if (Number.isFinite(a.hp)) a.hp = Math.min(a.maxHp ?? a.hp, a.hp + 12); if (Number.isFinite(a.speed) && !a._markSpeed) { a._markSpeed = a.speed; a.speed *= 1.25; } }
  st.markAllies = allies;
  return true;
}
// The mark on the body: element-shaped lines on face, chest and arm.
function drawMark(ctx, x, y, R, shape, t, f = 1) {
  ctx.save(); ctx.globalAlpha = .75 + .25 * Math.sin(t * 6); ctx.strokeStyle = R.mid; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const at = (px, py) => [x + f * px, y + py];
  const lines = {
    flames: [[[-4, -62], [-1, -70], [2, -64], [4, -72]], [[-6, -40], [-2, -50], [1, -42]]], waves: [[[-6, -64], [-2, -67], [2, -64], [6, -67]], [[-7, -44], [-2, -47], [3, -44]]],
    bolts: [[[-3, -72], [1, -66], [-2, -64], [3, -58]], [[6, -48], [2, -42], [6, -40]]], swirls: [[[-5, -66], [0, -70], [4, -66], [0, -62]]], cracks: [[[-6, -70], [-2, -64], [-5, -58]], [[4, -48], [0, -42]]],
    blossom: [[[-4, -66], [0, -70], [4, -66], [0, -62], [-4, -66]]], sunburst: [[[-6, -66], [6, -66]], [[0, -72], [0, -60]], [[-4, -70], [4, -62]]], crescents: [[[-5, -70], [-1, -64], [-5, -58]]],
    clouds: [[[-6, -64], [-2, -68], [2, -64], [6, -68]]], fangs: [[[-6, -68], [-3, -60]], [[0, -68], [3, -60]]], rivets: [[[-5, -66], [5, -66]], [[-5, -60], [5, -60]]], runes: [[[-4, -70], [4, -70], [0, -60], [-4, -70]]],
    scales: [[[-6, -64], [-3, -67], [0, -64], [3, -67], [6, -64]]], snow: [[[0, -72], [0, -60]], [[-5, -69], [5, -63]], [[-5, -63], [5, -69]]], steam: [[[-4, -60], [-6, -65], [-4, -70]], [[3, -60], [1, -65], [3, -70]]], hearts: [[[-4, -66], [0, -62], [4, -66], [2, -69], [0, -67], [-2, -69], [-4, -66]]], wings: [[[-6, -62], [-1, -66], [-6, -70]], [[6, -62], [1, -66], [6, -70]]], notes: [[[-3, -60], [-3, -70], [3, -72]]]
  }[shape] ?? [];
  for (const ln of lines) { ctx.beginPath(); ln.forEach(([px, py], i) => { const [qx, qy] = at(px, py); i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); }); ctx.stroke(); }
  ctx.restore();
}

// Pieces sprinkled along the swing trail.
const TRAIL_LOOK = { steam: 'steam', ice: 'ice', petals: 'petal', crescent: 'moon', gust: 'wind', mist: 'mist', claw: 'claw', shield: 'shield', sting: 'sting', notes: 'sound', flame: 'flame' };

// ── the stance ────────────────────────────────────────────────────────────
function breathStance() {
  return {
    duration: 15,
    hint: (p, st) => `${styleOf(st).name} · ↑ ${styleOf(st).up.name} · → ${styleOf(st).forward.name} · ↓ MAL`,
    moveMult: (p, st) => (st.mark ? MARK.speed : 1),
    meleeMult: (p, st) => (st.mark ? MARK.dmg : 1),
    damageTaken(p, st, amount) {
      if (st.calmUntil > st.t) {
        // Stille See: the hit is turned away and answered.
        combat.spawnHitSparks?.(p.x + (p.facing || 1) * 20, (p.y ?? 0) - 42, p.facing || 1, styleOf(st).ramp.light, 12);
        p._sigDodged = true; st.counter = (st.counter ?? 0) + 1;
        return 0;
      }
      return amount;
    },
    onEvent(p, st, type, info, gw) {
      const f = p.facing || 1;
      if (type === 'attack') st.arcs.push({ t: 0, step: info.step ?? 1, f, big: (info.step ?? 1) >= 3 });
      if (type === 'hit') for (const h of info.hits ?? []) {
        if (h.target.isProp) continue;
        const s = styleOf(st).status; if (s && (st.hits = (st.hits ?? 0) + 1) % 3 === 0) applyStatus(h.target, s);
        if (st.mark) applyStatus(h.target, 'burn'); // the marked blade is hot
        applyTrait(p, st, h.target, 8);
        if (styleOf(st).heals && Number.isFinite(p.hp)) p.hp = Math.min(p.maxHp, p.hp + 2);
      }
      // Combo finisher: a short version of the signature move.
      if (type === 'attack' && (info.step ?? 1) >= 3) { const fw = styleOf(st).forward; if (fw.kind === 'torrent') torrent(p, st, .2, { ...fw, len: fw.len * .55, dmg: fw.dmg * .7 }); else if (fw.kind === 'crescents') crescents(p, st, .2, { ...fw, count: 3 }); }
    },
    // Charged release: forward / up = the style's moves, down = the mark.
    charge(p, st, dir, ratio, gw) {
      const k = Math.max(.3, Math.min(1, ratio ?? .6)); const s = styleOf(st);
      if (dir === 'down') return awakenMark(p, st, gw);
      if (dir === 'up') return runMove(p, st, s.up, k, gw);
      if (dir === 'forward' || dir === 'back') return runMove(p, st, s.forward, k, gw);
      return false;
    },
    sprintMove(p, st, gw) { const s = styleOf(st); if (!s.sprint) return false; return runMove(p, st, s.sprint, .7, gw); },
    // Thunder keeps its lightning-step sprint (a piercing lunge variant).
    sprint: (p, st) => (styleOf(st).sprint ? null : { name: 'BLITZSCHRITT', primal: true, pierce: true, lungeSpeed: 1.8, carryMult: 1, recoilMult: 1.1, damageMult: 1.1, color: styleOf(st).ramp.mid }),
    diveMove(p, st, gw) { return runMove(p, st, { ...styleOf(st).dive, kind: 'crash' }, 1, gw) || true; },
    update(p, st, dt) {
      for (const a of st.arcs) a.t += dt; st.arcs = st.arcs.filter((a) => a.t < (a.big ? .4 : .28));
      if (st.mark) {
        st.mark.t -= dt;
        if (Number.isFinite(p.hp) && p.hp > 2) p.hp -= MARK.drain * dt; // the racing heart
        if (st.mark.t <= 0) { st.mark = null; for (const a of st.markAllies ?? []) { if (a._markSpeed) { a.speed = a._markSpeed; a._markSpeed = null; } a.breathMark = null; } }
      }
      for (const a of st.markAllies ?? []) if (a.breathMark) { a.breathMark.t -= dt; if (a.breathMark.t <= 0) { if (a._markSpeed) { a.speed = a._markSpeed; a._markSpeed = null; } a.breathMark = null; } }
    },
    end(p, st) { for (const a of st.markAllies ?? []) { if (a._markSpeed) { a.speed = a._markSpeed; a._markSpeed = null; } a.breathMark = null; } },
    render(ctx, p, st, ry, layer) {
      const s = styleOf(st); const R = s.ramp;
      if (layer !== 'front') { if (st.t < 1) { ctx.save(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + st.t * 4; piece(ctx, s.trail === 'flame' ? 'flame' : s.forward.look, p.x + Math.cos(a) * 24, ry - 30 + Math.sin(a) * 26, .8 * (1 - st.t), st.t, R, p.facing || 1, i); } ctx.restore(); } return; }
      // The swing trail of the element.
      for (const a of st.arcs) {
        const k = a.t / (a.big ? .4 : .28); const Rr = a.big ? 70 : 48; const cx = p.x + a.f * 16; const cy = ry - 40; const fade = 1 - k;
        const a0 = a.step % 2 ? -1.2 : 1.2; const a1 = -a0;
        const pts = Array.from({ length: 9 }, (_, i) => { const u = a0 + (a1 - a0) * (i / 8) * Math.min(1, k * 3); return [cx + a.f * Math.cos(u) * Rr, cy + Math.sin(u) * Rr * .8]; });
        if (s.trail === 'bolt') { thread(ctx, pts.map(([x, y], i) => [x + (i % 2 ? 4 : -4), y + (i % 2 ? -3 : 3)]), R.mid, 3, fade); thread(ctx, pts, R.core, 1.2, fade); }
        else ribbon(ctx, pts, (i, n) => (a.big ? 9 : 6) * Math.sin((i / n) * Math.PI) + 1, R.mat, 4200 + a.step, st.t, fade);
        if (s.trail !== 'bolt' && s.trail !== 'ribbon') { ctx.save(); ctx.globalAlpha = fade; const look = s.trail === 'shards' ? (st.style === 'forge' ? 'blast' : 'rock') : TRAIL_LOOK[s.trail] ?? 'flame'; for (let i = 2; i < 9; i += 3) piece(ctx, look, pts[i][0], pts[i][1] + 10, .9, st.t, R, a.f, i); ctx.restore(); }
      }
      if (st.mark) drawMark(ctx, p.x, ry, R, s.mark, st.t, p.facing || 1);
      for (const a of st.markAllies ?? []) if (a.breathMark && alive(a)) drawMark(ctx, a.x, (a.y ?? 0) + 14, R, a.breathMark.look, st.t, a.facing || 1);
    }
  };
}

// Cast: start the base style — or derive a new one from the style already running.
function castBreath(c, id) {
  const p = c.caster; const base = BREATH_RUNES[id];
  const running = p.signature && BREATH_RUNES[p.signature.id] ? p.signature.baseStyle : null;
  const derived = running && running !== base ? comboOf(running, base) : null;
  const style = derived ?? base;
  startStance(p, id, c.quality, { arcs: [], style, baseStyle: base });
  if (style === 'sun') emit(new RayCrownFx(p, { life: 1.4, size: 1.2 }), c.quality); // the origin of all styles shines
  if (derived) { c.gw?.showAnnouncement?.(`ABGELEITET: ${BREATH_STYLES[derived].name}`, 1.6); combat.spawnShockwave?.(p.x, (p.y ?? 0) - 40, 90, BREATH_STYLES[derived].ramp.mid); }
}
for (const id of Object.keys(BREATH_RUNES)) defineSignature(id, { cast(c) { castBreath(c, id); }, stance: breathStance() });
