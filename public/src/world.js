// GRIMGE Prototype — fixed logical arena and 2.5D ground-plane projection.
// x is horizontal position, z is depth across the bridge, elevation is jump height.

export const VIEWPORT = Object.freeze({ width: 1024, height: 576 });

export const ENTITY_VISUALS = Object.freeze({
  // Rendering is deliberately independent of the tuned gameplay collider.
  // This gives player cosmetics, armour, auras and transformations more
  // presence without changing movement, feet anchoring or hit validation.
  heroBaseHeight: 74,
  heroVisualScale: 1.20,
  heroHeight: 74 * 1.20,
  minionHeight: 40,
  heroColliderWidth: 24,
  heroColliderHeight: 54,
  minionColliderWidth: 20,
  minionColliderHeight: 36
});

export const ARENA_LAYOUT = Object.freeze({
  width: VIEWPORT.width,
  height: VIEWPORT.height,
  // The paved combat plane visible in arena_bg.jpg. z=0 is far (near the rear
  // wall); z=1 is near (the foreground parapet).
  groundProjection: Object.freeze({ farY: 306, nearY: 455 }),
  playableBounds: Object.freeze({ left: 104, right: 920, farZ: 0.06, nearZ: 0.94 }),
  spawns: Object.freeze({
    // Upper battlement spawn points, authored against the left/right castle
    // walkways rather than the lower gate approach.
    blueCastle: Object.freeze({ x: 146, z: 0.48 }),
    redCastle: Object.freeze({ x: 878, z: 0.48 }),
    player: Object.freeze({ x: 178, z: 0.55 }),
    enemyChampion: Object.freeze({ x: 846, z: 0.55 }),
    // Minions enter from the ground plane outside the battlement ramps.
    // Castle tops belong to the Wizards' spell-duel space, not lane traffic.
    blueWave: Object.freeze([304, 328, 352]),
    redWave: Object.freeze([720, 696, 672]),
    laneZ: Object.freeze([0.20, 0.52, 0.84])
  }),
  towers: Object.freeze({
    // Registered to the two crystal towers painted along the rear wall of
    // arena_bg.jpg (1376x768 source projected into this 1024x576 world).
    blue: Object.freeze({ x: 468, z: 0.11 }),
    red: Object.freeze({ x: 556, z: 0.11 })
  }),
  surfaces: Object.freeze([
    Object.freeze({ id: 'mainArena', label: 'Main arena', xMin: 104, xMax: 920, zMin: 0.06, zMax: 0.94, baseHeight: 0 }),
    // These are the upper battlement walkways in arena_bg.jpg, not the lower
    // Castle gate. The access ramps model the visible inner stair approaches.
    Object.freeze({ id: 'blueCastleUpperPlatform', label: 'Blue upper battlement', xMin: 94, xMax: 204, zMin: 0.30, zMax: 0.68, baseHeight: 145 }),
    Object.freeze({ id: 'blueCastleAccessRamp', label: 'Blue battlement access', xMin: 204, xMax: 292, zMin: 0.30, zMax: 0.68, baseHeight: 0, heightAt: (x) => 145 * (1 - (x - 204) / 88) }),
    Object.freeze({ id: 'redCastleAccessRamp', label: 'Red battlement access', xMin: 732, xMax: 820, zMin: 0.30, zMax: 0.68, baseHeight: 0, heightAt: (x) => 145 * ((x - 732) / 88) }),
    Object.freeze({ id: 'redCastleUpperPlatform', label: 'Red upper battlement', xMin: 820, xMax: 930, zMin: 0.30, zMax: 0.68, baseHeight: 145 })
  ]),
  // Battlements remain scenery for this brawler pass. They are intentionally
  // not classic platform colliders: the immediate playable space is one arena plane.
  decorativePlatforms: Object.freeze([
    Object.freeze({ id: 'blue-balcony', label: 'Decorative blue battlement', x: 55, y: 215, width: 105, height: 12 }),
    Object.freeze({ id: 'red-balcony', label: 'Decorative red battlement', x: 865, y: 215, width: 105, height: 12 })
  ]),
  decorativeBeacons: Object.freeze([
    Object.freeze({ id: 'blue-beacon', x: 466, y: 193, color: '#00e5ff' }),
    Object.freeze({ id: 'red-beacon', x: 556, y: 193, color: '#ff1744' })
  ])
});

export function groundYForDepth(z) {
  const { farY, nearY } = ARENA_LAYOUT.groundProjection;
  return farY + (nearY - farY) * z;
}

export function projectPosition(x, z, elevation = 0) {
  return { x, y: groundYForDepth(z) - elevation };
}

export function surfaceContains(surface, x, z) {
  return x >= surface.xMin && x <= surface.xMax && z >= surface.zMin && z <= surface.zMax;
}

export function surfaceHeight(surface, x) {
  return Math.max(0, surface.heightAt ? surface.heightAt(x) : surface.baseHeight);
}

export function groundDistance(a, b) {
  // Keep depth distances in the same broad gameplay scale as horizontal pixels.
  return Math.hypot(a.x - b.x, ((a.z ?? 0.65) - (b.z ?? 0.65)) * 150);
}

export function clampToArena(entity) {
  const bounds = ARENA_LAYOUT.playableBounds;
  entity.x = Math.max(bounds.left, Math.min(bounds.right, entity.x));
  entity.z = Math.max(bounds.farZ, Math.min(bounds.nearZ, entity.z));
  return entity;
}

// Compatibility-friendly spatial base. y is always the projected screen foot
// position; it never stores physical jump state.
export class GroundEntity {
  constructor(x, z, elevation = 0) {
    this.x = x;
    this.z = z;
    this.elevation = elevation;
    this.surfaceId = 'mainArena';
    this.surfaceHeight = 0;
    this.vx = 0;
    this.vz = 0;
    this.vElevation = 0;
    this.grounded = elevation <= 0;
  }

  get y() {
    return groundYForDepth(this.z) - this.surfaceHeight - this.elevation;
  }

  // Retained for small test/debug helpers. Gameplay code must write elevation.
  set y(screenY) {
    this.elevation = groundYForDepth(this.z) - this.surfaceHeight - screenY;
    this.grounded = this.elevation <= 0;
  }

  get worldHeight() { return this.surfaceHeight + this.elevation; }

  integrateElevation(dt, gravity = 1250) {
    this.vElevation -= gravity * dt;
    this.elevation += this.vElevation * dt;
    if (this.elevation <= 0) {
      this.elevation = 0;
      this.vElevation = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
  }
}
