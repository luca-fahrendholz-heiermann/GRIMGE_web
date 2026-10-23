// GRIMGE Prototype — selectable Training maps.
//
// Every map is a 1672x941 painted scene with the same camera, walls and
// floor layout. The painted terrain zones (water, ice, lava, hay …) are
// registered here in image percentages and converted to world coordinates,
// so they become real permanent terrain on the environment layer: water
// conducts lightning and freezes, ice is slippery, lava burns, hay catches
// fire, sand slows.

// The 16:9 scene fills the fixed 16:9 stage exactly (1672×941 → 1024×576),
// so nothing at the painted edges — like the team castles — is cut off.
// The combat plane is derived from the same image fractions, so painted
// zones always line up with gameplay. See Battlefield.renderTrainingBackground.
const SCENE_SCALE = 1024 / 1672;
const SCENE_H = 941 * SCENE_SCALE;
// Rear and front edge of the walkable floor as fractions of the image height.
const FLOOR_FAR_V = .3463;
const FLOOR_NEAR_V = .7436;
export const TRAINING_PROJECTION = Object.freeze({ farY: FLOOR_FAR_V * SCENE_H, nearY: FLOOR_NEAR_V * SCENE_H });

export const TRAINING_IMAGE = Object.freeze({
  width: 1672, height: 941, scale: SCENE_SCALE, floorFrontV: 712 / 941, anchorY: (712 / 941) * SCENE_H
});
// Walkable side edges in world x (9.33 % / 90.76 % of the image width).
export const TRAINING_FIELD = Object.freeze({ left: Math.round(.0933 * 1024), right: Math.round(.9076 * 1024) });

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
  { id: 'waterfalls', name: 'WATERFALL ARENA', desc: 'Classic yard — no special terrain.', zones: [], weather: null, props: [...DEFAULT_PROPS, ['seedling', 170, .2], ['seedling', 860, .84], ['boulder', 880, .28]] },
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
  },
  // Scene-object yards (user, 23 Oct 2026): every interactive object to try out, with dev labels.
  {
    id: 'puzzle_yard', scene: 'ruins', name: 'RÄTSELHOF', desc: 'Klettern: Baum, Liane, Geysir, Eiswand, Aufwind, Geisterplattform, Seilbrücke, Kletterwand.', zones: [], weather: null,
    props: [['withered_seedling', 690, .2], ['ledge', 790, .2, { h: 190, w: 60 }], ['shrine', 600, .3, { element: 'aqua' }], ['liana', 420, .2, { top: 220 }], ['geyser', 230, .3], ['brazier', 196, .42], ['water_barrel', 262, .18],
      ['waterfall', 150, .12], ['jump_pad', 360, .78], ['windmill', 480, .82], ['ghost_platform', 580, .86, { h: 110 }], ['lantern', 530, .92, { lit: false }], ['rope_bridge', 880, .72, { len: 100, dir: -1, h: 120 }], ['climb_wall', 905, .45, { face: -1 }], ['basin', 680, .62], ['cracked_floor', 300, .92]]
  },
  {
    id: 'element_garden', scene: 'waterfalls', name: 'ELEMENTGARTEN', desc: 'Ranke, Pilze, Blüte, Bienen, Eiszapfen, Fässer, Kohlebecken, Pulverfässer, Kristallsäule, Gong, Spiegel, Grab, Kronleuchter.', zones: [], weather: null,
    props: [['vine', 150, .2], ['mushrooms', 230, .82], ['bloom', 330, .18], ['beehive', 430, .88], ['icicle', 470, .14], ['water_barrel', 560, .18], ['brazier', 610, .86], ['powder_keg', 650, .62], ['powder_keg', 690, .66],
      ['crystal_pylon', 730, .14, { key: 'pylon' }], ['gong', 770, .86, { key: 'gong' }], ['stalagmite', 400, .34], ['banner', 190, .5], ['mirror', 250, .36], ['mirror', 800, .42], ['grave', 860, .2], ['chandelier', 580, .5, { h: 150 }], ['shrine', 140, .86, { element: 'ignis' }], ['magnet', 860, .68]]
  },
  {
    id: 'castle_gate', scene: 'canyon', name: 'BURGTOR', desc: 'Druckplatte, Fallgitter, Hebel, Tor, Rankenvorhang, brüchige Wand, Netz, brüchiger Boden, Staub, Floß, Element-Truhe.', zones: [], weather: null,
    props: [['pressure_plate', 330, .82, { key: 'pc' }], ['boulder', 250, .82], ['portcullis', 430, .5, { key: 'pc' }], ['lever', 500, .14, { key: 'gate1' }], ['gate', 560, .5, { key: 'gate1', latch: true }], ['curtain', 640, .5],
      ['cracked_wall', 720, .5], ['web', 840, .5], ['chest', 890, .5, { lock: 'fulgur' }], ['cracked_floor', 220, .3], ['dust', 380, .4, { text: 'INSCHRIFT: „WAS WÄCHST, TRÄGT DICH HÖHER.“' }], ['raft', 600, .9], ['ice_lever', 780, .14, { key: 'gate1' }]]
  }
]);

export function getTrainingMap(id) {
  return TRAINING_MAPS.find((map) => map.id === id) ?? TRAINING_MAPS[0];
}

// Scene-object yards reuse a painted scene (map.scene) instead of an own backdrop.
export function trainingMapScene(map) { return `assets/scenes/training/${map.scene ?? map.id}.jpg`; }
export function trainingMapThumb(map) { return `assets/scenes/training/${map.scene ?? map.id}_thumb.jpg`; }
