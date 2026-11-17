// Keyboard and mouse, read once a frame. Movement is WASD or the arrows, the mouse aims,
// holding the left button (or Space) fires, right button or Shift dashes. Menu keys are
// reported as one-frame presses so a held key never repeats a choice.
import { FIELD } from './config.js';

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

/** Create the input reader bound to the canvas; `view()` maps screen to field pixels. */
export function createInput(canvas, view) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: FIELD.width / 2, y: FIELD.height / 2 - 120, fire: false, dash: false, clicked: false };

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    const v = view();
    mouse.x = ((event.clientX - rect.left) - v.offsetX) / v.scale;
    mouse.y = ((event.clientY - rect.top) - v.offsetY) / v.scale;
  }

  window.addEventListener('keydown', (event) => {
    if (!held.has(event.code)) pressed.add(event.code);
    held.add(event.code);
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => { held.clear(); mouse.fire = false; mouse.dash = false; });
  canvas.addEventListener('mousemove', toField);
  canvas.addEventListener('mousedown', (event) => {
    toField(event);
    if (event.button === 0) { mouse.fire = true; mouse.clicked = true; }
    if (event.button === 2) mouse.dash = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouse.fire = false;
    if (event.button === 2) mouse.dash = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  /** Snapshot this frame's intent, then clear the one-frame presses. */
  function read() {
    let mx = 0;
    let my = 0;
    for (const code of held) {
      const dir = MOVE_KEYS[code];
      if (dir) { mx += dir[0]; my += dir[1]; }
    }
    const length = Math.hypot(mx, my) || 1;
    const frame = {
      moveX: mx / length,
      moveY: my / length,
      aimX: mouse.x,
      aimY: mouse.y,
      fire: mouse.fire || held.has('Space'),
      dash: mouse.dash || held.has('ShiftLeft') || held.has('ShiftRight'),
      confirm: pressed.has('Enter') || pressed.has('Space') || mouse.clicked,
      pause: pressed.has('KeyP') || pressed.has('Escape'),
      mute: pressed.has('KeyM'),
      restart: pressed.has('KeyR'),
      choice: pressed.has('Digit1') ? 0 : pressed.has('Digit2') ? 1 : pressed.has('Digit3') ? 2 : -1,
      clickX: mouse.clicked ? mouse.x : null,
      clickY: mouse.clicked ? mouse.y : null,
    };
    pressed.clear();
    mouse.clicked = false;
    return frame;
  }

  return { read };
}
