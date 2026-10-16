// GRIMGE Prototype — selectable Training maps.
//
// Every map is a 1672x941 painted scene with the same camera, walls and
// floor layout. The painted terrain zones (water, ice, lava, hay …) are
// registered here in image percentages and converted to world coordinates,
// so they become real permanent terrain on the environment layer: water
// conducts lightning and freezes, ice is slippery, lava burns, hay catches
// fire, sand slows.

export const TRAINING_PROJECTION = Object.freeze({ farY: 212, nearY: 455 });

// How the scene image is placed on the 1024x576 logical view (fixed scale,
// so painted zones always line up with gameplay). See
// Battlefield.renderTrainingBackground.
export const TRAINING_IMAGE = Object.freeze({
  width: 1672, height: 941, scale: .65, floorFrontV: 712 / 941, anchorY: TRAINING_PROJECTION.nearY + 8
});

function imageToScreen(px, py) {
  const w = TRAINING_IMAGE.width * TRAINING_IMAGE.scale;
  const h = TRAINING_IMAGE.height * TRAINING_IMAGE.scale;
  const x0 = 512 - w / 2;
  const y0 = TRAINING_IMAGE.anchorY - TRAINING_IMAGE.floorFrontV * h;
  return { x: x0 + px / 100 * w, y: y0 + py / 100 * h };
}

function screenYToZ(y) {
  return (y - TRAINING_PROJECTION.farY) / (TRAINING_PROJECTION.nearY - TRAINING_PROJECTION.farY);
}

// Convert an image-percentage zone to a world-space terrain zone.
// ellipse: { cx, cy, rx, ry }  rect: { x0, y0, x1, y1 }  (all in %)
export function zoneToWorld(zone) {
  if (zone.shape === 'rect') {
    const a = imageToScreen(zone.x0, zone.y0); const b = imageToScreen(zone.x1, zone.y1);
    return { type: zone.type, shape: 'rect', x: (a.x + b.x) / 2, z: screenYToZ((a.y + b.y) / 2), hx: Math.abs(b.x - a.x) / 2, hz: Math.abs(screenYToZ(b.y) - screenYToZ(a.y)) / 2 };
  }
  const c = imageToScreen(zone.cx, zone.cy);
  const edge = imageToScreen(zone.cx + zone.rx, zone.cy + zone.ry);
  return { type: zone.type, shape: 'ellipse', x: c.x, z: screenYToZ(c.y), rx: edge.x - c.x, rz: screenYToZ(edge.y) - screenYToZ(c.y) };
}

const ellipse = (type, cx, cy, rx, ry) => ({ type, shape: 'ellipse', cx, cy, rx, ry });
const rect = (type, x0, y0, x1, y1) => ({ type, shape: 'rect', x0, y0, x1, y1 });

const DEFAULT_PROPS = Object.freeze([['crate', 380, .22], ['crate', 650, .84], ['crate', 700, .2], ['barrel', 340, .84]]);

export const TRAINING_MAPS = Object.freeze([
  { id: 'waterfalls', name: 'WATERFALL ARENA', desc: 'Classic yard — no special terrain.', zones: [], weather: null, props: DEFAULT_PROPS },
  {
    id: 'frozen', name: 'FROZEN ARENA', desc: 'Four ice fields: slippery footing; fire melts them.', weather: 'snow',
    zones: [rect('ice', 12, 34, 44, 50), rect('ice', 56, 34, 88, 50), rect('ice', 9, 57, 44, 75), rect('ice', 56, 57, 92, 75)],
    props: [['crate', 380, .1], ['barrel', 640, .92]]
  },
  {
    id: 'arcane', name: 'RUNE ARENA', desc: 'Mana pools: restore mana, conduct lightning, freeze.', weather: 'motes',
    zones: [ellipse('mana', 23.5, 52, 9.5, 8), ellipse('mana', 76.5, 52, 9.5, 8)],
    props: [['crate', 300, .15], ['crate', 724, .88]]
  },
  {
    id: 'volcano', name: 'VOLCANIC ARENA', desc: 'Lava pools burn everyone; ice cools them.', weather: 'embers', fireLifeMult: 1.4,
    zones: [ellipse('lava', 21.5, 41, 8, 5.5), ellipse('lava', 80.5, 65, 9.5, 6.5), ellipse('crater', 22.5, 66, 10, 6.5)],
    props: [['barrel', 600, .2], ['barrel', 420, .86], ['crate', 760, .3]]
  },
  {
    id: 'canyon', name: 'DESERT CANYON', desc: 'A soft sand pit slows movement.', weather: 'dust',
    zones: [ellipse('sand', 22, 63, 12, 7)],
    props: [['crate', 760, .25], ['crate', 800, .8], ['barrel', 640, .9]]
  },
  {
    id: 'rain', name: 'RAINY ALPINE ARENA', desc: 'Water basins conduct lightning; rain shortens fires.', weather: 'rain', fireLifeMult: .55,
    zones: [rect('water', 19.5, 45, 34, 60.5), rect('water', 66, 45, 81.5, 60.5)],
    props: [['crate', 380, .1], ['barrel', 640, .92]]
  },
  {
    id: 'storm', name: 'STORM ARENA', desc: 'Puddles draw lightning strikes; gusts spread fire.', weather: 'storm', fireLifeMult: .7, ambient: 'storm',
    zones: [ellipse('water', 23, 44, 8.5, 5.5), ellipse('water', 25, 64, 9, 6), ellipse('water', 75, 42.5, 9, 5.5), ellipse('water', 75.5, 65, 10, 6.5)],
    props: [['crate', 380, .1], ['barrel', 640, .92]]
  },
  {
    id: 'ruins', name: 'CASTLE RUINS', desc: 'Dry hay fields catch fire and spread it.', weather: 'leaves', ambient: 'breeze',
    zones: [ellipse('hay', 24, 51, 11, 10), ellipse('hay', 75, 51, 10.5, 10)],
    props: [['crate', 120, .3], ['crate', 120, .72], ['barrel', 905, .4], ['crate', 905, .78]]
  }
]);

export function getTrainingMap(id) {
  return TRAINING_MAPS.find((map) => map.id === id) ?? TRAINING_MAPS[0];
}

export function trainingMapScene(map) { return `assets/scenes/training/${map.id}.jpg`; }
export function trainingMapThumb(map) { return `assets/scenes/training/${map.id}_thumb.jpg`; }
