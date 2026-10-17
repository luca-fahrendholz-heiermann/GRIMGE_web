// GRIMGE Prototype — Castle Siege match rules (port of Unity MatchRunner).
//
// Source: C:\Dev\unity_projects\GRIMGE, Code/Gameplay/Match/MatchRunner.cs,
// SandboxCharacterSpawner (authored values) and Documentation/Gameplay/
// match-rules.md §7, §10–17.
//
// Each side's Wizard is either ON THE PLATFORM (its castle rampart) or
// DEPLOYED on the lane:
//  • Platform: sheltered — lane melee, minions and defence towers skip the
//    Wizard (spells and projectiles still hit). Runes can only be drawn and
//    slotted here; slotted spells may be cast everywhere.
//  • Deploy (G / D-pad up / DEPLOY button): teleports to the side's fixed
//    deploy point for 15 s. Platform and lane are not connected — there is no
//    walking or jumping between them and no voluntary retreat.
//  • When the lane time runs out the Wizard is recalled to the platform
//    (unspent slots stay) and Deploy cools down for 12 s.
//  • Death: respawn after 2.5 s on the platform with full HP, all slots
//    cleared, Focus 0 and the full deploy cooldown.
//  • A fallen castle takes respawn, shelter, deploy and recall with it: the
//    Wizard drops to the lane for good (and may prepare runes there); the
//    next death ends the match.
import { combat } from './combat.js';

export const SIEGE_RULES = Object.freeze({
  laneDuration: 15,       // _laneDuration (raised from 8 on 2026-08-04)
  deployCooldown: 12,     // _deployCooldown
  respawnDelay: 2.5,      // _respawnDelay
  botDeployDelay: 1.2     // the bot deploys shortly after it may
});

// Siege arena (arena_bg.jpg): the upper battlements are the platforms; the
// lane starts beyond the painted stair ramps, which stay scenery.
export const SIEGE_ZONES = Object.freeze({
  platform: Object.freeze({
    blue: Object.freeze({ left: 104, right: 200, farZ: 0.31, nearZ: 0.67 }),
    red: Object.freeze({ left: 824, right: 920, farZ: 0.31, nearZ: 0.67 })
  }),
  lane: Object.freeze({ left: 292, right: 732, farZ: 0.06, nearZ: 0.94 }),
  // Unity deploy point (∓10.5, −2.3): 1.2 u inside the lane, depth 0.55.
  deploy: Object.freeze({ blue: Object.freeze({ x: 318, z: 0.55 }), red: Object.freeze({ x: 706, z: 0.55 }) })
});

const TEAM_COLOR = { blue: '#64b5f6', red: '#ef5350' };

export class SiegeMatch {
  constructor(game) {
    this.game = game;
    this.sides = {};
    for (const team of ['blue', 'red']) {
      this.sides[team] = { presence: 'OnPlatform', laneTimeLeft: 0, cooldown: 0, wasAlive: true, botWait: SIEGE_RULES.botDeployDelay, lastStand: false };
      const wizard = this.wizard(team);
      if (wizard) {
        wizard.respawnDuration = SIEGE_RULES.respawnDelay;
        this.confine(team);
      }
    }
  }

  wizard(team) { return team === 'blue' ? this.game.player : this.game.enemyChampion; }
  castleStands(team) { return !this.game.battlefield.getCastle(team).isDestroyed; }
  side(team) { return this.sides[team]; }
  isDeployed(team) { return this.sides[team].presence === 'Deployed'; }

  canDeploy(team) {
    const side = this.sides[team]; const wizard = this.wizard(team);
    return this.game.isMatchRunning() && this.castleStands(team) && side.presence === 'OnPlatform'
      && side.cooldown <= 0 && !!wizard?.isAlive && wizard.lifeState !== 'Dead';
  }

  // Sheltered = on the platform of a standing castle.
  isSheltered(entity) {
    const team = entity === this.game.player ? 'blue' : entity === this.game.enemyChampion ? 'red' : null;
    return !!team && this.sides[team].presence === 'OnPlatform' && this.castleStands(team);
  }

  // Rune drawing / slotting: only on the platform — or in the last stand.
  canPrepare(team) { return this.sides[team].presence === 'OnPlatform' || !this.castleStands(team); }

  confine(team) {
    const wizard = this.wizard(team);
    if (!wizard) return;
    wizard.confineBounds = this.sides[team].presence === 'OnPlatform' ? SIEGE_ZONES.platform[team] : SIEGE_ZONES.lane;
  }

  place(wizard, x, z) {
    const battlefield = this.game.battlefield;
    wizard.x = x; wizard.z = z; wizard.vx = 0; wizard.vz = 0; wizard.kbVelX = 0;
    wizard.surfaceId = null;
    battlefield.placeOnSurface(wizard);
  }

  deploy(team) {
    if (!this.canDeploy(team)) return false;
    const side = this.sides[team]; const wizard = this.wizard(team);
    if (team === 'blue') { this.game.cancelRuneDrawing?.(); this.game.targeting?.cancel?.(); }
    wizard.cancelSprint?.(); wizard.isGuarding = false;
    combat.spawnShockwave(wizard.x, wizard.y - 30, 44, TEAM_COLOR[team]);
    side.presence = 'Deployed';
    side.laneTimeLeft = SIEGE_RULES.laneDuration;
    this.confine(team);
    const point = SIEGE_ZONES.deploy[team];
    this.place(wizard, point.x, point.z);
    // A short drop onto the lane sells the arrival.
    if ('vElevation' in wizard && 'grounded' in wizard) { wizard.elevation = 60; wizard.grounded = false; wizard.vElevation = 0; }
    combat.spawnShockwave(point.x, wizard.y, 56, TEAM_COLOR[team]);
    if (team === 'blue') this.game.showAnnouncement?.(`DEPLOYED — ${SIEGE_RULES.laneDuration} S ON THE LANE`, 1.2);
    return true;
  }

  recall(team) {
    const side = this.sides[team]; const wizard = this.wizard(team);
    side.presence = 'OnPlatform';
    side.laneTimeLeft = 0;
    side.cooldown = SIEGE_RULES.deployCooldown;
    side.botWait = SIEGE_RULES.botDeployDelay;
    this.confine(team);
    const spawn = this.game.battlefield.getSpawn(team);
    combat.spawnShockwave(wizard.x, wizard.y - 30, 40, TEAM_COLOR[team]);
    this.place(wizard, spawn.x, spawn.z);
    combat.spawnShockwave(wizard.x, wizard.y - 6, 48, TEAM_COLOR[team]);
    if (team === 'blue') this.game.showAnnouncement?.('RECALLED TO THE CASTLE', 1.1);
  }

  // The castle fell: the Wizard drops to the nearest lane point for good.
  fallToLane(team) {
    const side = this.sides[team]; const wizard = this.wizard(team);
    side.presence = 'Deployed'; side.laneTimeLeft = 0; side.lastStand = true;
    this.confine(team);
    const lane = SIEGE_ZONES.lane;
    this.place(wizard, team === 'blue' ? lane.left + 4 : lane.right - 4, Math.max(lane.farZ, Math.min(lane.nearZ, wizard.z)));
    if (team === 'blue') this.game.showAnnouncement?.('YOUR CASTLE HAS FALLEN — LAST STAND ON THE LANE', 2);
  }

  // Back on the platform after a death: slots cleared, Focus 0, full cooldown.
  onRespawn(team) {
    const side = this.sides[team]; const wizard = this.wizard(team);
    side.presence = 'OnPlatform'; side.laneTimeLeft = 0;
    side.cooldown = SIEGE_RULES.deployCooldown; side.botWait = SIEGE_RULES.botDeployDelay;
    this.confine(team);
    const spawn = this.game.battlefield.getSpawn(team);
    this.place(wizard, spawn.x, spawn.z);
    wizard.clearPreparedRunes?.();
    if ('focus' in wizard) { wizard.focus = 0; wizard.focusTransformTimer = 0; }
  }

  tick(dt) {
    if (!this.game.isMatchRunning()) return;
    for (const team of ['blue', 'red']) {
      const side = this.sides[team]; const wizard = this.wizard(team);
      if (!wizard) continue;
      const alive = wizard.lifeState === 'Alive' || (wizard.lifeState === undefined && wizard.isAlive);
      if (alive && !side.wasAlive) this.onRespawn(team);
      side.wasAlive = alive;
      if (!alive) continue;
      if (!this.castleStands(team)) {
        if (!side.lastStand) this.fallToLane(team);
        continue;
      }
      if (side.presence === 'Deployed') {
        side.laneTimeLeft = Math.max(0, side.laneTimeLeft - dt);
        if (side.laneTimeLeft <= 0) this.recall(team);
      } else {
        side.cooldown = Math.max(0, side.cooldown - dt);
        // The bot deploys on its own shortly after it may.
        if (team === 'red' && side.cooldown <= 0) {
          side.botWait -= dt;
          if (side.botWait <= 0) this.deploy('red');
        }
      }
    }
  }

  // HUD text for the DEPLOY button.
  deployLabel(team = 'blue') {
    const side = this.sides[team];
    if (!this.castleStands(team)) return { text: 'LAST STAND', state: 'laststand' };
    if (side.presence === 'Deployed') return { text: `ON LANE ${Math.ceil(side.laneTimeLeft)}s`, state: 'deployed' };
    if (side.cooldown > 0) return { text: `DEPLOY ${Math.ceil(side.cooldown)}s`, state: 'cooldown' };
    return { text: '▼ DEPLOY', state: 'ready' };
  }
}
