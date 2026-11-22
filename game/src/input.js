// Velvet Vault — keyboard and mouse input.
// One clear job: turn raw DOM events into one clean input snapshot per
// frame. WASD or arrows move, Shift sneaks, Q fires the EMP, P pauses,
// M mutes, and a mouse click throws a coin at that point in the room.

export function createInput(canvas) {
  const keys = new Set();
  let coinTarget = null; // {x, y} in canvas pixels, consumed by the engine
  let empPressed = false;
  let pausePressed = false;
  let mutePressed = false;
  let anyKeyPressed = false;
  let confirmPressed = false;

  function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!e.repeat) {
      anyKeyPressed = true;
      if (k === 'q') empPressed = true;
      if (k === 'p' || k === 'escape') pausePressed = true;
      if (k === 'm') mutePressed = true;
      if (k === 'enter' || k === ' ') confirmPressed = true;
    }
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    coinTarget = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
    anyKeyPressed = true;
  });

  return {
    snapshot() {
      const snap = {
        up: keys.has('w') || keys.has('arrowup'),
        down: keys.has('s') || keys.has('arrowdown'),
        left: keys.has('a') || keys.has('arrowleft'),
        right: keys.has('d') || keys.has('arrowright'),
        sneak: keys.has('shift'),
        coin: coinTarget,
        emp: empPressed,
        pause: pausePressed,
        mute: mutePressed,
        confirm: confirmPressed,
        anyKey: anyKeyPressed,
      };
      coinTarget = null;
      empPressed = false;
      pausePressed = false;
      mutePressed = false;
      confirmPressed = false;
      anyKeyPressed = false;
      return snap;
    },
  };
}
