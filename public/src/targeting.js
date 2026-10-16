// GRIMGE Prototype — spell targeting (one model, three input devices).
//
// After a slot is triggered, its spell's `targetingMode` decides what
// happens next:
//   direction  fires at once (a drag / cursor / right stick may set the side)
//   ground     asks for an impact point (Meteor, Magma Fissure, Gravity Lift…)
//   placement  asks for a swiped line (walls snap to the two collision axes)
//   ally       asks for a friendly unit (player, minion, companion, summon)
//   self       never asks
//
// Touch: tap the battlefield (or drag straight out of the slot and release),
//        swipe to place walls, tap an ally.
// Mouse: the reticle follows the cursor, LMB confirms / drags walls,
//        RMB or Esc cancels.
// Gamepad: right stick moves the reticle, A confirms, B cancels, X turns walls.
import { ARENA_LAYOUT, groundYForDepth } from './world.js';
import { TARGETING, TARGET_RANGE } from './spell_catalog.js';
import { spells } from './spells.js';

const NEEDS_TARGET = new Set([TARGETING.GROUND, TARGETING.PLACEMENT, TARGETING.ALLY]);

export function needsTarget(definition) {
  return NEEDS_TARGET.has(definition?.targetingMode);
}

export class SpellTargeting {
  constructor(game) {
    this.game = game;
    this.active = null;
  }

  get isActive() { return !!this.active; }

  // ── coordinate helpers ───────────────────────────────────────────────
  screenToWorld(pt) {
    const game = this.game;
    const { farY, nearY } = ARENA_LAYOUT.groundProjection;
    const x = pt.x - (game.cameraOffsetX ?? 0) + (game.modeState?.dungeonCameraX ?? 0);
    const groundY = pt.y - (game.worldOffsetY ?? 0);
    const bounds = game.battlefield?.boundsOverride ?? ARENA_LAYOUT.playableBounds;
    const z = Math.max(bounds.farZ ?? .06, Math.min(bounds.nearZ ?? .94, (groundY - farY) / (nearY - farY)));
    return { x, z };
  }

  worldToScreen(x, z) {
    const game = this.game;
    return { x: x + (game.cameraOffsetX ?? 0) - (game.modeState?.dungeonCameraX ?? 0), y: groundYForDepth(z) + (game.worldOffsetY ?? 0) };
  }

  clampToRange(point, range) {
    const caster = this.game.player;
    const bounds = this.game.battlefield?.boundsOverride ?? ARENA_LAYOUT.playableBounds;
    const dx = point.x - caster.x;
    const dz = (point.z - caster.z) * 150;
    const distance = Math.hypot(dx, dz);
    const k = distance > range ? range / distance : 1;
    return {
      x: Math.max(bounds.left, Math.min(bounds.right, caster.x + dx * k)),
      z: Math.max(bounds.farZ ?? .06, Math.min(bounds.nearZ ?? .94, caster.z + dz * k / 150))
    };
  }

  allies() {
    const game = this.game;
    const list = [];
    if (game.player?.isAlive && !game.player.burrowed) list.push(game.player);
    for (const minion of game.minions ?? []) if (minion.team === game.player.team && !minion.isDead) list.push(minion);
    for (const summon of spells.getSummons(game.player.team)) list.push(summon);
    return list;
  }

  nearestAlly(point, maxDistance = 90) {
    let best = null; let bestD = Infinity;
    for (const ally of this.allies()) {
      const d = Math.hypot(ally.x - point.x, ((ally.z ?? point.z) - point.z) * 150);
      if (d < bestD && d <= maxDistance) { best = ally; bestD = d; }
    }
    return best;
  }

  // ── lifecycle ────────────────────────────────────────────────────────
  begin(slot, source = 'tap') {
    const definition = slot?.definition;
    if (!definition) return false;
    const player = this.game.player;
    const mode = definition.targetingMode ?? TARGETING.DIRECTION;
    const start = { x: player.x + (player.facing || 1) * 200, z: player.z };
    this.active = {
      slot, definition, mode, source, pointerId: null,
      point: mode === TARGETING.ALLY ? { x: player.x, z: player.z } : this.clampToRange(start, TARGET_RANGE[mode] ?? 460),
      lineStart: null, orientation: 'depth', length: 0, entity: mode === TARGETING.ALLY ? player : null
    };
    const hints = {
      ground: 'CHOOSE THE IMPACT POINT', placement: 'SWIPE TO PLACE THE WALL', ally: 'TAP AN ALLY TO SHIELD',
      direction: 'RELEASE TO AIM', self: 'RELEASE TO CAST'
    };
    if (source !== 'drag') this.game.showAnnouncement?.(`${definition.name}: ${hints[mode] ?? ''}`, 1.4);
    return true;
  }

  cancel() {
    if (!this.active) return false;
    this.active = null;
    return true;
  }

  setPointFromScreen(pt) {
    if (!this.active) return;
    this.setPoint(this.screenToWorld(pt));
  }

  setPoint(world) {
    const a = this.active;
    if (!a) return;
    if (a.mode === TARGETING.PLACEMENT && a.lineStart) {
      const dxPx = world.x - a.lineStart.x;
      const dzPx = (world.z - a.lineStart.z) * 150;
      a.orientation = Math.abs(dxPx) > Math.abs(dzPx) ? 'lateral' : 'depth';
      a.length = Math.hypot(dxPx, dzPx);
      a.point = this.clampToRange({ x: (world.x + a.lineStart.x) / 2, z: (world.z + a.lineStart.z) / 2 }, TARGET_RANGE.placement);
      return;
    }
    if (a.mode === TARGETING.ALLY) {
      a.point = world;
      a.entity = this.nearestAlly(world) ?? null;
      return;
    }
    a.point = this.clampToRange(world, TARGET_RANGE[a.mode] ?? 460);
  }

  // Gamepad: move the reticle by a ground-space delta (px, px/150 for z).
  nudge(dx, dz) {
    const a = this.active;
    if (!a) return;
    this.setPoint({ x: a.point.x + dx, z: a.point.z + dz / 150 });
    if (a.mode === TARGETING.ALLY && !a.entity) a.entity = this.nearestAlly(a.point, 160);
  }

  toggleOrientation() {
    const a = this.active;
    if (a?.mode !== TARGETING.PLACEMENT) return;
    a.orientation = a.orientation === 'depth' ? 'lateral' : 'depth';
  }

  // ── pointer gestures (touch + mouse share these) ─────────────────────
  pointerDown(pt, pointerId) {
    const a = this.active;
    if (!a) return false;
    a.pointerId = pointerId;
    const world = this.screenToWorld(pt);
    if (a.mode === TARGETING.PLACEMENT) {
      a.lineStart = this.clampToRange(world, TARGET_RANGE.placement);
      a.point = a.lineStart; a.length = 0;
    } else this.setPoint(world);
    return true;
  }

  pointerMove(pt, pointerId) {
    const a = this.active;
    if (!a) return false;
    // A hovering mouse (no pointer down) previews the target as well.
    if (a.pointerId !== null && a.pointerId !== pointerId) return false;
    this.setPoint(this.screenToWorld(pt));
    return true;
  }

  pointerUp(pt, pointerId) {
    const a = this.active;
    if (!a || a.pointerId !== pointerId) return false;
    this.setPoint(this.screenToWorld(pt));
    a.pointerId = null;
    if (a.mode === TARGETING.ALLY && !a.entity) return true; // keep waiting for a valid ally
    return this.confirm();
  }

  // ── resolve ──────────────────────────────────────────────────────────
  buildTarget() {
    const a = this.active;
    if (!a) return null;
    switch (a.mode) {
      case TARGETING.GROUND: return { x: a.point.x, z: a.point.z };
      case TARGETING.PLACEMENT: return { x: a.point.x, z: a.point.z, orientation: a.orientation, length: a.length };
      case TARGETING.ALLY: return a.entity ? { entity: a.entity } : null;
      default: return { x: a.point.x, z: a.point.z, aimOnly: true };
    }
  }

  confirm() {
    const a = this.active;
    if (!a) return false;
    const target = this.buildTarget();
    if (a.mode === TARGETING.ALLY && !target) return false;
    this.active = null;
    const player = this.game.player;
    // Direction / self spells released from a drag or cursor face that side.
    if (target?.aimOnly && Math.abs(target.x - player.x) > 8) player.facing = Math.sign(target.x - player.x);
    return this.game.castSpellSlot(a.slot, true, target?.aimOnly ? null : target);
  }

  // ── world-space preview ──────────────────────────────────────────────
  render(ctx) {
    const a = this.active;
    if (!a) return;
    const player = this.game.player;
    const color = a.definition.color ?? '#ffffff';
    const pulse = .6 + Math.sin(performance.now() * .01) * .2;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash?.([6, 5]);
    ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
    const groundY = (z) => groundYForDepth(z);
    if (a.mode === TARGETING.GROUND || a.mode === TARGETING.DIRECTION || a.mode === TARGETING.SELF) {
      const radius = a.mode === TARGETING.GROUND ? 70 : 18;
      ctx.beginPath(); ctx.moveTo(player.x, groundY(player.z)); ctx.lineTo(a.point.x, groundY(a.point.z)); ctx.stroke();
      ctx.setLineDash?.([]);
      ctx.strokeStyle = color; ctx.fillStyle = `${color}33`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(a.point.x, groundY(a.point.z), radius, radius * .3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.point.x - 8, groundY(a.point.z)); ctx.lineTo(a.point.x + 8, groundY(a.point.z)); ctx.moveTo(a.point.x, groundY(a.point.z) - 6); ctx.lineTo(a.point.x, groundY(a.point.z) + 6); ctx.stroke();
    } else if (a.mode === TARGETING.PLACEMENT) {
      ctx.setLineDash?.([]);
      const lateral = a.orientation === 'lateral';
      const halfX = lateral ? Math.max(30, Math.min(110, (a.length || 120) / 2)) : 16;
      const halfZ = lateral ? .06 : .24;
      const y = groundY(a.point.z);
      ctx.fillStyle = `${color}55`; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.point.x - halfX, y + halfZ * 150 * .5);
      ctx.lineTo(a.point.x - halfX, y - 60);
      ctx.lineTo(a.point.x + halfX, y - 60);
      ctx.lineTo(a.point.x + halfX, y + halfZ * 150 * .5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (a.mode === TARGETING.ALLY) {
      ctx.setLineDash?.([]);
      for (const ally of this.allies()) {
        const selected = ally === a.entity;
        ctx.strokeStyle = selected ? '#fff59d' : 'rgba(179,136,255,.7)';
        ctx.lineWidth = selected ? 3 : 1.5;
        const y = (ally.y ?? groundY(ally.z)) - 28;
        ctx.beginPath(); ctx.arc(ally.x, y, selected ? 30 : 24, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// Shared tap-or-chord logic for slot buttons on keyboard (Z/X/C) and
// gamepad (LB/RB/RT): a single press casts on release, holding two or
// three slot buttons together fuses exactly those slots (order irrelevant).
export class SlotChord {
  constructor(onCast, onFuse) {
    this.onCast = onCast; this.onFuse = onFuse;
    this.held = new Set(); this.order = [];
  }
  press(position) {
    if (this.held.has(position)) return;
    this.held.add(position);
    if (!this.order.includes(position)) this.order.push(position);
  }
  release(position) {
    if (!this.held.delete(position) || this.held.size) return;
    const order = this.order; this.order = [];
    if (order.length === 1) this.onCast(order[0]);
    else if (order.length > 1) this.onFuse(order);
  }
  reset() { this.held.clear(); this.order = []; }
}
