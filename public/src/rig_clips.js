// GRIMGE Prototype — base animation clips for the parts rig (rig.js). Test placeholders (AGENDA 1, stage 2): the final
// animations are the user's (drawn / AI-generated sheets replace these by clip name).
// A clip: { frames, hold (60 Hz ticks per frame), loop, air?, keys: [{ t: 0..1, pose }] } — grounded clips get their feet
// locked to the floor by the baker (rig.js), so o.pelvis there only matters for air clips.
// Pose: a = degrees per part (positive: the far end swings forward, toward the facing side), o = pixel offset per part
// (o.pelvis moves the whole body); cape = how far a cape trails (negative = behind; rigs with a cape part only). Parts: pelvis, torso, head, padF, armFU/armFL (front arm), armBU/armBL (back arm),
// legFU/legFL (front leg), legBU/legBL (back leg); the lower segments are relative to the upper ones.

const P = (a = {}, o = {}) => ({ a, o });
const crouch = (d = 1) => ({ legFU: 24 * d, legFL: -46 * d, legBU: 18 * d, legBL: -42 * d });

export const BASE_CLIPS = Object.freeze({
  idle: { cape: -2, frames: 4, hold: 12, loop: true, keys: [
    { t: 0, pose: P({ armFU: 1, armBU: -1 }) },
    { t: .5, pose: P({ armFU: 3, armBU: -3, armFL: 2 }, { torso: [0, 1] }) }
  ] },
  walk: { cape: -7, frames: 8, hold: 6, loop: true, keys: [
    { t: 0, pose: P({ legFU: 22, legFL: -4, legBU: -18, legBL: -16, armFU: -18, armBU: 18, armBL: 8 }, { pelvis: [0, 2] }) },
    { t: .25, pose: P({ legFU: 2, legFL: 0, legBU: 6, legBL: -38, armFU: 0, armBU: 0 }, { pelvis: [0, 0] }) },
    { t: .5, pose: P({ legFU: -16, legFL: -20, legBU: 22, legBL: -4, armFU: 18, armFL: 8, armBU: -18 }, { pelvis: [0, 0] }) },
    { t: .75, pose: P({ legFU: 6, legFL: -38, legBU: 2, legBL: 0, armFU: 0, armBU: 0 }, { pelvis: [0, 0] }) }
  ] },
  sprint: { cape: -18, frames: 6, hold: 4, loop: true, keys: [
    { t: 0, pose: P({ torso: 7, head: -3, legFU: 38, legFL: -10, legBU: -34, legBL: -30, armFU: -40, armFL: 50, armBU: 40, armBL: 40 }, { pelvis: [0, 3] }) },
    { t: .25, pose: P({ torso: 8, head: -3, legFU: 5, legFL: -20, legBU: 10, legBL: -70, armFU: 0, armFL: 50, armBU: 0, armBL: 50 }, { pelvis: [0, 0] }) },
    { t: .5, pose: P({ torso: 7, head: -3, legFU: -34, legFL: -30, legBU: 38, legBL: -10, armFU: 40, armFL: 40, armBU: -40, armBL: 50 }, { pelvis: [0, 3] }) },
    { t: .75, pose: P({ torso: 8, head: -3, legFU: 10, legFL: -70, legBU: 5, legBL: -20, armFU: 0, armFL: 50, armBU: 0, armBL: 50 }, { pelvis: [0, 0] }) }
  ] },
  jump: { cape: 6, air: true, frames: 2, hold: 8, loop: false, keys: [
    { t: 0, pose: P({ ...crouch(.6), armFU: -20, armBU: -25 }, { pelvis: [0, 1] }) },
    { t: 1, pose: P({ legFU: 32, legFL: -48, legBU: -6, legBL: -40, armFU: 45, armFL: 25, armBU: -40, armBL: 10, head: -3 }) }
  ] },
  fall: { cape: 16, air: true, frames: 2, hold: 10, loop: true, keys: [
    { t: 0, pose: P({ legFU: 14, legFL: -20, legBU: -14, legBL: -12, armFU: 62, armFL: 18, armBU: -52, armBL: -8, head: 2 }) },
    { t: .5, pose: P({ legFU: 16, legFL: -24, legBU: -12, legBL: -14, armFU: 68, armFL: 22, armBU: -58, armBL: -10, head: 2 }) }
  ] },
  land: { cape: -4, frames: 1, hold: 8, loop: false, keys: [{ t: 0, pose: P({ ...crouch(1), torso: 6, armFU: 25, armBU: -25 }, { pelvis: [0, 6] }) }] },
  dash: { cape: 14, frames: 3, hold: 5, loop: false, keys: [
    { t: 0, pose: P({ torso: -6, armFU: 20, armBU: 15, legFU: 15, legBU: -15 }) },
    { t: .5, pose: P({ torso: -14, head: -6, armFU: 40, armFL: 20, armBU: 30, armBL: 20, legFU: 30, legFL: -12, legBU: -28, legBL: -10 }, { pelvis: [0, 1] }) },
    { t: 1, pose: P({ torso: -8, armFU: 25, armBU: 15, legFU: 18, legBU: -16 }) }
  ] },
  attack1: { cape: -10, frames: 4, hold: 3, loop: false, keys: [
    { t: 0, pose: P({ torso: -6, armFU: -38, armFL: 25, armBU: 10, legFU: 8, legBU: -8 }) },
    { t: .34, pose: P({ torso: 9, head: 2, armFU: 88, armFL: 8, armBU: -25, legFU: 18, legFL: -6, legBU: -16 }, { pelvis: [1, 1] }) },
    { t: .67, pose: P({ torso: 8, armFU: 82, armFL: 4, armBU: -22, legFU: 18, legBU: -16 }, { pelvis: [1, 1] }) },
    { t: 1, pose: P({ torso: 3, armFU: 35, armFL: 20, armBU: -8, legFU: 10, legBU: -8 }) }
  ] },
  attack2: { cape: -10, frames: 4, hold: 3, loop: false, keys: [
    { t: 0, pose: P({ torso: -4, armBU: -35, armBL: 30, armFU: 30, armFL: 40 }) },
    { t: .34, pose: P({ torso: 12, head: 3, armBU: 98, armBL: 5, armFU: -35, armFL: 30, legFU: 20, legFL: -8, legBU: -18 }, { pelvis: [2, 1] }) },
    { t: .67, pose: P({ torso: 11, armBU: 92, armBL: 5, armFU: -30, legFU: 20, legBU: -18 }, { pelvis: [2, 1] }) },
    { t: 1, pose: P({ torso: 4, armBU: 30, armBL: 20, armFU: 0, legFU: 10, legBU: -8 }) }
  ] },
  attack3: { cape: -6, frames: 5, hold: 3, loop: false, keys: [
    { t: 0, pose: P({ torso: -12, head: -4, armFU: 160, armFL: 20, armBU: 150, armBL: 20, legFU: 8, legBU: -8 }, { pelvis: [0, -2] }) },
    { t: .4, pose: P({ torso: 16, head: 4, armFU: 55, armFL: 10, armBU: 45, armBL: 10, ...crouch(.7) }, { pelvis: [2, 4] }) },
    { t: 1, pose: P({ torso: 14, armFU: 45, armFL: 10, armBU: 40, armBL: 10, ...crouch(.6) }, { pelvis: [2, 3] }) }
  ] },
  uppercut: { cape: 8, frames: 4, hold: 4, loop: false, keys: [
    { t: 0, pose: P({ torso: 8, armFU: -40, armFL: 70, armBU: 20, ...crouch(.9) }, { pelvis: [0, 5] }) },
    { t: .5, pose: P({ torso: -8, head: -6, armFU: 172, armFL: 0, armBU: -30, legFU: 10, legBU: -20, legBL: -10 }, { pelvis: [0, -3] }) },
    { t: 1, pose: P({ torso: -6, head: -5, armFU: 165, armFL: 5, armBU: -25, legFU: 12, legBU: -18 }, { pelvis: [0, -2] }) }
  ] },
  heavyStrike: { cape: -14, frames: 5, hold: 4, loop: false, keys: [
    { t: 0, pose: P({ torso: -12, head: -3, armFU: -60, armFL: 35, armBU: -20, legFU: 10, legBU: -6 }) },
    { t: .35, pose: P({ torso: 16, head: 3, armFU: 92, armFL: 0, armBU: -40, armBL: 20, legFU: 36, legFL: -26, legBU: -36, legBL: 6 }, { pelvis: [3, 4] }) },
    { t: 1, pose: P({ torso: 14, armFU: 85, armFL: 4, armBU: -35, armBL: 20, legFU: 34, legFL: -24, legBU: -34, legBL: 6 }, { pelvis: [3, 4] }) }
  ] },
  dive: { cape: 20, air: true, frames: 2, hold: 6, loop: true, keys: [
    { t: 0, pose: P({ torso: 20, head: 6, armFU: 50, armFL: -10, armBU: 42, armBL: -10, legFU: 45, legFL: -72, legBU: 30, legBL: -70 }) },
    { t: .5, pose: P({ torso: 22, head: 6, armFU: 54, armFL: -12, armBU: 46, armBL: -12, legFU: 47, legFL: -74, legBU: 32, legBL: -72 }) }
  ] },
  guard: { cape: -3, frames: 2, hold: 14, loop: true, keys: [
    { t: 0, pose: P({ torso: -4, armFU: 55, armFL: 78, armBU: 35, armBL: 72, legFU: 12, legFL: -16, legBU: -12, legBL: -4 }, { pelvis: [0, 2] }) },
    { t: .5, pose: P({ torso: -5, armFU: 57, armFL: 80, armBU: 36, armBL: 74, legFU: 12, legFL: -16, legBU: -12, legBL: -4 }, { pelvis: [0, 2] }) }
  ] },
  hurt: { cape: 10, frames: 2, hold: 6, loop: false, keys: [
    { t: 0, pose: P({ torso: -14, head: -10, armFU: -30, armFL: -20, armBU: -38, armBL: -10, legFU: 10, legBU: -6 }, { pelvis: [-2, 1] }) },
    { t: 1, pose: P({ torso: -8, head: -5, armFU: -15, armFL: -10, armBU: -20, legFU: 6, legBU: -4 }) }
  ] },
  dead: { cape: 6, frames: 4, hold: 10, loop: false, keys: [
    { t: 0, pose: P({ torso: -14, head: -10, armFU: -30, armBU: -38 }) },
    { t: .5, pose: P({ torso: -22, head: -14, armFU: -45, armFL: -20, armBU: -50, legFU: 45, legFL: -80, legBU: 35, legBL: -80 }, { pelvis: [-2, 14] }) },
    { t: 1, pose: P({ torso: -30, head: -18, armFU: -60, armFL: -25, armBU: -65, legFU: 60, legFL: -110, legBU: 50, legBL: -110 }, { pelvis: [-3, 22] }) }
  ] },
  // Drawing a rune: the front hand raised with the palm forward (room for the hand signs later), the back hand at the chest.
  draw: { cape: -3, frames: 2, hold: 16, loop: true, keys: [
    { t: 0, pose: P({ torso: 3, armFU: 78, armFL: 52, armBU: 42, armBL: 82 }) },
    { t: .5, pose: P({ torso: 3, armFU: 80, armFL: 58, armBU: 44, armBL: 86 }, { torso: [0, 1] }) }
  ] },
  // Charging a heavy: arms drawn back, knees bent, the body coiled.
  charge: { cape: -5, frames: 2, hold: 8, loop: true, keys: [
    { t: 0, pose: P({ torso: -6, head: 2, armFU: -42, armFL: 52, armBU: -30, armBL: 40, ...crouch(.5) }, { pelvis: [0, 3] }) },
    { t: .5, pose: P({ torso: -7, head: 2, armFU: -46, armFL: 56, armBU: -33, armBL: 44, ...crouch(.55) }, { pelvis: [0, 4] }) }
  ] }
});

// State names that play another clip.
export const CLIP_ALIASES = Object.freeze({ run: 'walk' });
