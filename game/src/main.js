// Velvet Vault: boot, fixed-timestep loop and the screen state machine.
// Screens: title -> play <-> paused -> caught (retry) -> complete (next
// level / victory). With ?shot=start|play|caught|win the game stages one
// deterministic scene instead, for screenshots.

import { LEVELS, VIEW } from './config.js';
import { World, WORLD_CAUGHT, WORLD_COMPLETE, WORLD_PLAYING } from './world.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import {
  drawCaught,
  drawLevelComplete,
  drawPaused,
  drawTitle,
  drawWorld,
} from './render.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const BEST_KEY = 'velvet-vault-best';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const input = new Input(canvas);
const sounds = new SoundBank();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
/** In shot mode the render clock is frozen, so re-screens are identical. */
const shotMode = shotName !== null;

let screen = 'title';
let levelIndex = 0;
let world = new World(0);
let totalScore = 0;
let best = 0;
try {
  best = Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
} catch {
  best = 0;
}

if (shotMode) {
  const staged = stageShot(shotName);
  world = staged.world;
  levelIndex = staged.world.levelIndex;
  totalScore = staged.totalScore;
  screen = staged.screen;
  if (screen === 'complete' && staged.isLast) {
    totalScore = staged.totalScore;
  }
}

function saveBest() {
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Storage unavailable (private mode, file://): the score just is not kept.
  }
}

function startGame() {
  sounds.unlock();
  levelIndex = 0;
  totalScore = 0;
  world = new World(0);
  screen = 'play';
}

function nextLevel() {
  sounds.unlock();
  levelIndex += 1;
  if (levelIndex >= LEVELS.length) {
    levelIndex = 0;
    totalScore = 0;
    world = new World(0);
    screen = 'title';
    return;
  }
  world = new World(levelIndex);
  screen = 'play';
}

function retryLevel() {
  sounds.unlock();
  world = new World(levelIndex);
  screen = 'play';
}

function playSoundEvents(events) {
  for (const event of events) {
    if (event === 'pickup') sounds.pickup();
    else if (event === 'crack') sounds.crack();
    else if (event === 'coin-throw') sounds.coinThrow();
    else if (event === 'emp') sounds.emp();
    else if (event === 'spotted') sounds.spotted();
    else if (event === 'caught') {
      sounds.caught();
      sounds.stopAlarm();
    } else if (event === 'complete') sounds.win();
  }
}

input.onKey = (key) => {
  if (shotMode) return;
  const k = key.toLowerCase();
  if (screen === 'title' && (key === 'Enter' || key === ' ')) startGame();
  else if (screen === 'play' && (k === 'p' || key === 'Escape')) screen = 'paused';
  else if (screen === 'paused' && (k === 'p' || key === 'Escape')) screen = 'play';
  else if (screen === 'caught' && k === 'r') retryLevel();
  else if (screen === 'complete' && key === 'Enter') nextLevel();
  else if (screen === 'complete' && k === 'r' && levelIndex >= LEVELS.length - 1) startGame();
  else if (k === 'm') {
    sounds.muted = !sounds.muted;
    if (sounds.muted) sounds.stopAlarm();
  }
};

input.onClick = () => {
  if (shotMode) return;
  if (screen === 'title') startGame();
};

let last = performance.now();
let accumulator = 0;
let renderNow = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  renderNow = shotMode ? 1.234 : now / 1000;

  if (!shotMode && screen === 'play') {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const clicks = input.takeClicks();
      const pressed = input.takePressed();
      const move = input.moveVector();
      world.step(STEP, { move, sneaking: input.sneaking, clicks, pressed });
      playSoundEvents(world.takeEvents());
      sounds.alarm(world.alarm);
      if (world.status === WORLD_CAUGHT) {
        screen = 'caught';
      } else if (world.status === WORLD_COMPLETE) {
        totalScore += world.score;
        best = Math.max(best, totalScore);
        saveBest();
        screen = 'complete';
      }
    }
  } else {
    input.takeClicks();
    input.takePressed();
  }

  if (screen === 'title') {
    drawTitle(ctx, world, best);
  } else if (screen === 'play' || screen === 'paused') {
    drawWorld(ctx, world, renderNow);
    if (screen === 'paused') drawPaused(ctx);
  } else if (screen === 'caught') {
    drawWorld(ctx, world, renderNow);
    drawCaught(ctx, world);
  } else if (screen === 'complete') {
    drawWorld(ctx, world, renderNow);
    drawLevelComplete(ctx, world, totalScore, levelIndex >= LEVELS.length - 1);
  }
}

requestAnimationFrame(frame);
