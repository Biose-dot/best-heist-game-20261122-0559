// Keyboard and mouse input. Tracks held keys, the mouse position over the
// canvas, and single-frame click events the game consumes. No game logic
// lives here: the world reads this state each step.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    /** Clicks queued since the last step: {x, y} in canvas pixels. */
    this.clickQueue = [];
    /** Keys pressed since the last step, for one-shot actions. */
    this.pressedQueue = [];
    this.canvas = canvas;
    this.onKey = null;
    this.onClick = null;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) {
        this.pressedQueue.push(event.key);
        if (this.onKey) this.onKey(event.key);
      }
      this.keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    });
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', (event) => {
      this.mouseDown = true;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      this.clickQueue.push({ x, y });
      if (this.onClick) this.onClick(x, y);
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  /** True while any of the given keys is held. */
  held(...keys) {
    return keys.some((key) => this.keys.has(key));
  }

  /** Movement vector from WASD / arrow keys, normalised. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.held('a', 'ArrowLeft')) x -= 1;
    if (this.held('d', 'ArrowRight')) x += 1;
    if (this.held('w', 'ArrowUp')) y -= 1;
    if (this.held('s', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  get sneaking() {
    return this.held('Shift');
  }

  /** Drain the queued clicks (called once per step). */
  takeClicks() {
    const clicks = this.clickQueue;
    this.clickQueue = [];
    return clicks;
  }

  /** Drain the queued key presses (called once per step). */
  takePressed() {
    const pressed = this.pressedQueue;
    this.pressedQueue = [];
    return pressed;
  }
}
