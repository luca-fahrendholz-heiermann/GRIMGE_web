// GRIMGE Prototype — scene-object systems (user, 23 Oct 2026):
//   * the AI uses objects: a melee minion lights a powder keg the hero stands next to; a ranged
//     minion ducks behind cover (log, boulder, stalagmite, tree) while it reloads;
//   * dev hints: in Training (and with the debug view) every scene object shows its name and the
//     element that changes it — the solution text of dungeon secrets as well.
import { environment } from './environment.js';
import { timeNow, groundDist, DEPTH } from './scene_objects.js';

const COVER = new Set(['log', 'boulder', 'stalagmite', 'cracked_wall']);
const heroFoes = (m, gw) => [gw?.player, gw?.enemyChampion].filter((h) => h && h.team !== m.team && h.isAlive !== false && h.lifeState !== 'Dead' && !h.isDead);

// A short movement goal for a minion (Minion.update follows it), or null.
export function sceneAiHint(m, gw) {
  if (!m || m.isTrainingDummy || m.followLeader || m.isSkeleton || m.freezeTimer > 0) return null;
  const now = timeNow(); const h = m._aiHint;
  if (h) { if (h.until > now && h.valid()) return h; m._aiHint = null; }
  if ((m._aiNext ?? 0) > now) return null;
  m._aiNext = now + .5 + Math.random() * .3;
  const foe = heroFoes(m, gw).sort((a, b) => groundDist(a, m.x, m.z) - groundDist(b, m.x, m.z))[0];
  if (!foe) return null;
  const props = environment.props.filter((o) => o.isSceneObject && !o.isDead && !o.flight);
  // Light the keg next to the hero (melee minions, the keg must be close to both).
  if (m.type === 'melee') {
    const keg = props.find((o) => o.kind === 'powder_keg' && o.fuse < 0 && groundDist(o, m.x, m.z) < 120 && groundDist(foe, o.x, o.z) < 90);
    if (keg) return (m._aiHint = { kind: 'keg', x: keg.x - Math.sign(foe.x - keg.x || 1) * 24, z: keg.z, until: now + 3, valid: () => !keg.isDead && keg.fuse < 0, arrive: () => { keg.feed('ignis', 10); } });
  }
  // Duck behind cover while reloading (ranged minions).
  if (m.type === 'ranged' && m.attackTimer > .6 && groundDist(foe, m.x, m.z) > 110) {
    const cover = props.filter((o) => (COVER.has(o.kind) || (o.kind === 'plant' && o.stage === 2)) && groundDist(o, m.x, m.z) < 150).sort((a, b) => groundDist(a, m.x, m.z) - groundDist(b, m.x, m.z))[0];
    if (cover) { const side = Math.sign(cover.x - foe.x || 1); return (m._aiHint = { kind: 'cover', x: cover.x + side * ((cover.halfX ?? 16) + 16), z: cover.z, until: now + Math.min(1.4, m.attackTimer), valid: () => !cover.isDead, arrive: null, hold: true }); }
  }
  return null;
}
// Minion.update: move toward the hint; true while the hint owns the movement.
export function followSceneHint(m, hint, dt) {
  const dx = hint.x - m.x; const dz = (hint.z - m.z) * DEPTH; const d = Math.hypot(dx, dz);
  if (d < 14) { m.vx = m.vz = 0; m.state = 'idle'; if (hint.arrive) { hint.arrive(); m._aiHint = null; } return true; }
  const sp = m.speed * (m.slowFactor ?? 1); m.facing = Math.sign(dx) || m.facing; m.vx = dx / d * sp; m.vz = dz / d * sp / DEPTH; m.state = 'run';
  void dt; return true;
}

// ── dev hints (Training / debug) ─────────────────────────────────────────
export const SCENE_HINTS = Object.freeze({
  plant: 'Wasser/Natur: wächst · Feuer · Frost · Blitz spaltet', log: 'Feuer · Natur: treibt aus', boulder: 'Schlag/Wind: rollt · Feuer: Glut · Wasser: Riss',
  withered_seedling: 'viel Wasser/Natur → Baum (Äste = Plattformen)',
  vine: 'Wasser/Natur → Plattform · Feuer brennt sie weg', mushrooms: 'Schlag: Giftwolke · Feuer: Explosion · Schatten: giftig',
  bloom: 'Licht lädt · Schlag: Heilpollen · Schatten: beißt', beehive: 'Schlag: Schwarm · Rauch/Feuer beruhigt', icicle: 'Frost wächst · Feuer schmilzt · harter Schlag: Splitter · werfbar',
  water_barrel: 'Schlag: Leck · Frost: Eisfläche · werfbar', brazier: 'Wind: Glut · Wasser: Dampf · umstoßen', powder_keg: 'Feuer/Blitz: Explosion · in der Luft = Schleuder · werfbar',
  crystal_pylon: '3× Blitz: Kettenblitz', gong: 'Schlag: Schallwelle · Blitz: Summen', jump_pad: 'Schlag/Landung: schleudert hoch', stalagmite: 'Erde wächst · harter Schlag: Brücke',
  stone_bridge: 'Steinbrücke', windmill: 'Wind: Aufwind + lenkt Schüsse · Blitz: Mana', banner: 'Feuer: fällt, verdeckt Schüsse', mirror: 'spiegelt Schüsse · Licht: Strahl · Schatten: Portal',
  lantern: 'Licht-Zone · Schatten: Dunkelheit (versteckt)', grave: 'Schatten: Skelett · Licht bannt', chandelier: 'Seil treffen: fällt', chest: 'Element-Schloss', shrine: 'Schlag: Element-Ladungen · Element-Zauber: Buff-Zone',
  ledge: 'Sims', liana: 'Wasser/Natur wächst · in der Luft berühren: Schwung', geyser: 'Feuer + Wasser: Druck → Ausbruch', waterfall: 'Frost: Eiswand mit Stufen',
  web: 'Feuer brennt es weg', curtain: 'Feuer brennt ihn weg (Natur heilt)', cracked_wall: 'nur harte Schläge (Axt/Hammer ×3)', lever: 'Schlag: Schalter', ice_lever: 'Feuer befreit den Hebel',
  pressure_plate: 'draufstellen / Schweres drauf', gate: 'öffnet mit Signal', portcullis: 'Schlag: 3 s offen', cracked_floor: 'Sturzangriff bricht durch', rope_bridge: 'Klinge/Schuss kappt das Seil → Rampe',
  raft: 'Wind/Schlag schiebt es', magnet: 'Blitz: zieht Gegner/Metall', ghost_platform: 'nur im Licht fest', basin: 'Wasser hebt, Feuer senkt', dust: 'Wind bläst ihn weg', climb_wall: 'Speertreffer: Stufen'
});
export const sceneDev = { hints: false };
export function renderSceneHint(ctx, o) {
  if (!sceneDev.hints || !o?.isSceneObject) return;
  const text = o.devHint ?? (o.withered ? SCENE_HINTS.withered_seedling : SCENE_HINTS[o.kind]); if (!text) return;
  ctx.save(); ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
  const w = Math.ceil(ctx.measureText?.(text)?.width ?? text.length * 4) + 6; const x = Math.round(o.x); const y = Math.round(o.y) + 12;
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - w / 2, y - 7, w, 9); ctx.fillStyle = '#ffe082'; ctx.fillText(text, x, y);
  ctx.restore();
}
