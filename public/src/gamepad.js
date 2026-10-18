// GRIMGE Prototype — gamepad support (Gamepad API, "standard" mapping).
//
//   Left stick   move (double-flick = sprint / backdash, like the keyboard)
//   A            jump                      B   block (hold)
//   X            melee: tap (stick up = uppercut, forward = heavy, air+down = dive);
//                hold = charged heavy, stick up / down / neutral = UP / DOWN / FORWARD
//                (in a form: its six techniques, release after 1.2 s = FULL)
//   Y            DRAW / lock rune
//   LB / RB / RT spell slot 1 / 2 / 3  — tap casts, hold two or three = fuse
//   LT           transformation            D-pad down  mount   D-pad up  deploy (Siege)
//   Back/View    Grimoire                  Start/Menu  match menu
// Targeting:  right stick moves the reticle, A confirms, B cancels, X turns walls.
// Drawing:    right stick moves the pen, hold RT to ink, Y locks, B cancels.
// Beam Clash: A, X or Y push / counter.
import { SlotChord } from './targeting.js';
import { ui } from './ui.js';

const BUTTON = Object.freeze({ A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13 });
const SLOT_BUTTONS = Object.freeze([[BUTTON.LB, 0], [BUTTON.RB, 1], [BUTTON.RT, 2]]);
const DEADZONE = .22;
const RETICLE_SPEED = 560; // ground px per second at full tilt
const PEN_SPEED = 900;     // screen px per second at full tilt

const axis = (value) => (Math.abs(value) < DEADZONE ? 0 : (value - Math.sign(value) * DEADZONE) / (1 - DEADZONE));

export class GamepadController {
  constructor(game) {
    this.game = game;
    this.previous = [];
    this.pen = null;
    this.penDown = false;
    this.chord = new SlotChord((position) => game.castSlotAt(position), (positions) => game.fuseSlots(positions));
  }

  pad() {
    const pads = globalThis.navigator?.getGamepads?.() ?? [];
    for (const pad of pads) if (pad?.connected) return pad;
    return null;
  }

  poll(dt) {
    const pad = this.pad();
    const game = this.game;
    if (!pad) { game.input.padMove = { x: 0, z: 0 }; return; }
    const pressed = pad.buttons.map((button) => !!(button?.pressed || button?.value > .5));
    const previous = this.previous;
    const down = (b) => pressed[b] && !previous[b];
    const up = (b) => !pressed[b] && previous[b];
    const lx = axis(pad.axes[0] ?? 0); const ly = axis(pad.axes[1] ?? 0);
    const rx = axis(pad.axes[2] ?? 0); const ry = axis(pad.axes[3] ?? 0);
    if (pressed.some(Boolean) || lx || ly || rx || ry) game.setInputMode?.('gamepad');
    this.previous = pressed;

    if (down(BUTTON.START) && game.isMatchRunning?.()) ui.toggleIngameMenu?.(!game.menuPaused);
    if (!game.isMatchRunning?.() || !game.player?.isAlive) { game.input.padMove = { x: 0, z: 0 }; this.chord.reset(); return; }
    game.input.padMove = { x: lx, z: ly };

    // Rune drawing: the right stick is a pen; holding RT inks.
    if (game.drawing.active) {
      this.pen ??= { x: game.renderWidth / 2, y: game.renderHeight / 2 };
      this.pen.x = Math.max(0, Math.min(game.renderWidth, this.pen.x + rx * PEN_SPEED * dt));
      this.pen.y = Math.max(0, Math.min(game.renderHeight, this.pen.y + ry * PEN_SPEED * dt));
      game.drawing.gamepadPen = this.pen;
      const inking = pressed[BUTTON.RT];
      if (inking) game.addRunePoint(this.pen.x, this.pen.y);
      else if (this.penDown) game.completeRuneStroke();
      this.penDown = inking;
      if (down(BUTTON.Y)) game.lockOrExitRuneDrawing();
      if (down(BUTTON.B)) game.cancelRuneDrawing();
      this.chord.reset();
      return;
    }
    this.pen = null; this.penDown = false; game.drawing.gamepadPen = null;

    // Beam Clash: any face button pushes / counters.
    if (game.player.activeClash) {
      if (down(BUTTON.A) || down(BUTTON.X) || down(BUTTON.Y)) game.clashAction();
      return;
    }

    // Targeting: right stick moves the reticle.
    if (game.targeting?.isActive) {
      if (rx || ry) game.targeting.nudge(rx * RETICLE_SPEED * dt, ry * RETICLE_SPEED * dt);
      if (down(BUTTON.X)) game.targeting.toggleOrientation();
      if (down(BUTTON.A)) game.targeting.confirm();
      if (down(BUTTON.B)) game.targeting.cancel();
      return;
    }
    // Outside targeting a right-stick push aims direction spells.
    if (Math.abs(rx) > .5) game.player.facing = Math.sign(rx);

    if (down(BUTTON.A)) game.input.justPressedKeys.Space = true;
    if (down(BUTTON.B)) game.setGuardHeld(true);
    if (up(BUTTON.B)) game.setGuardHeld(false);
    // X: in the air it strikes at once; on the ground a tap attacks on release,
    // holding it past 0.2 s charges the heavy (direction from the stick, live until release).
    const player = game.player;
    const tapKind = () => { const forward = lx * (player.facing || 1); return ly < -.6 ? 'uppercut' : forward > .6 ? 'heavy' : 'normal'; };
    if (down(BUTTON.X)) {
      if (!player.grounded) player.executeAttack(game.input, ly > .6 ? 'dive' : 'normal');
      else this.xHeld = { t: 0, charging: false };
    }
    if (this.xHeld && pressed[BUTTON.X]) {
      this.xHeld.t += dt;
      if (!this.xHeld.charging && this.xHeld.t > .2) this.xHeld.charging = player.beginCharge(ly < -.6 ? 'up' : ly > .6 ? 'down' : 'forward', 'pad') || 'failed';
    }
    if (up(BUTTON.X) && this.xHeld) {
      const held = this.xHeld; this.xHeld = null;
      if (held.charging === true && player.chargeTimer > 0) player.releaseCharge();
      else if (held.charging !== true) player.executeAttack(game.input, tapKind());
    }
    if (down(BUTTON.Y)) game.startRuneDrawing();
    if (down(BUTTON.LT)) game.activateFocusTransformation();
    if (down(BUTTON.DOWN)) game.toggleMount();
    if (down(BUTTON.UP)) game.requestDeploy?.();
    if (down(BUTTON.BACK)) ui.toggleGrimoire?.();
    for (const [button, position] of SLOT_BUTTONS) {
      if (down(button)) this.chord.press(position);
      if (up(button)) this.chord.release(position);
    }
  }
}
