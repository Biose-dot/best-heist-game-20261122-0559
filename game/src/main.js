// Velvet Vault — boot and the fixed-step loop.
// One clear job: wire the canvas, the input, the sound board and the
// engine together, and run the game at a steady 60 steps a second.
// With ?shot= in the URL it renders one frozen, deterministic frame
// instead of playing — that is how the entry's screenshots are taken.

import { createGame, stepGame } from './engine.js';
import { createInput } from './input.js';
import { createSoundBoard } from './audio.js';
import { renderGame } from './render.js';
import { stateForShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const sound = createSoundBoard();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotState = shotName ? stateForShot(shotName) : null;

let state = createGame(0, 0);
state.screen = 'title';

function playEvents(events) {
  for (const event of events) {
    if (event === 'footstep') sound.footstep();
    else if (event === 'coin') sound.coinClink();
    else if (event === 'pickup') sound.pickup();
    else if (event === 'sapphire') sound.sapphire();
    else if (event === 'emp') sound.emp();
    else if (event === 'caught') sound.caught();
    else if (event === 'win') sound.win();
    else if (event === 'levelClear') sound.levelClear();
    else if (event === 'spotted') sound.spotted();
    else if (event === 'toggleMute') sound.toggleMute();
  }
}

if (shotState) {
  // Screenshot mode: one frozen frame, no loop, no sound — and no page
  // furniture, so the canvas fills the 1280x800 viewport exactly.
  const note = document.getElementById('note');
  if (note) note.style.display = 'none';
  renderGame(ctx, shotState);
  document.title = 'Velvet Vault — ' + shotName;
} else {
  const STEP = 1 / 60;
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += elapsed;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      const snap = input.snapshot();
      if (snap.anyKey) sound.unlock();
      stepGame(state, snap, STEP);
      playEvents(state.events);
      sound.setAlarmLevel(state.screen === 'play' ? state.alarm / 100 : 0);
      acc -= STEP;
      guard += 1;
    }
    renderGame(ctx, state);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
