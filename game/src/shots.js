// The staged screenshot scenes behind ?shot=start|play|caught|win. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by the autopilot, so the frame is what a real game looks
// like and the same seed always gives the same frame. The win scene plays
// all three levels through to the getaway; the play scene catches the
// second vault mid-heist.

import { World, WORLD_CAUGHT, WORLD_COMPLETE, WORLD_PLAYING } from './world.js';
import { autopilot } from './autopilot.js';

const STEP = 1 / 60;
const START_SECONDS = 5;
const PLAY_SECONDS = 14;
const CAUGHT_LIMIT_SECONDS = 120;
const LEVEL_LIMIT_SECONDS = 300;

function playLevel(world, reckless, seconds) {
  const limit = Math.floor((seconds ?? LEVEL_LIMIT_SECONDS) / STEP);
  for (let i = 0; i < limit; i += 1) {
    if (world.status !== WORLD_PLAYING) break;
    const move = autopilot(world, { reckless: !!reckless });
    world.step(STEP, { move, sneaking: move.sneaking, clicks: [], pressed: [] });
  }
  return world.status;
}

/** The caught scene, staged: the thief is dropped right in front of a
 * guard with the alarm already screaming, and the patrol walks in. */
function stageCaughtFallback() {
  const world = new World(0);
  const guard = world.guards[0];
  world.player.x = guard.x + Math.cos(guard.facing) * 30;
  world.player.y = guard.y + Math.sin(guard.facing) * 30;
  world.alarm = 90;
  for (let i = 0; i < Math.floor(60 / STEP); i += 1) {
    if (world.status !== WORLD_PLAYING) break;
    world.step(STEP, { move: { x: 0, y: 0 }, sneaking: false, clicks: [], pressed: [] });
  }
  return world;
}

/**
 * Stage the named scene and return {world, screen, totalScore, isLast}
 * where screen is one of 'title' | 'play' | 'caught' | 'complete'.
 */
export function stageShot(name) {
  if (name === 'win') {
    let totalScore = 0;
    let world = new World(0);
    for (let level = 0; level < 3; level += 1) {
      world = new World(level);
      playLevel(world, false);
      if (world.status === WORLD_COMPLETE) totalScore += world.score;
    }
    return { world, screen: 'complete', totalScore, isLast: true };
  }

  if (name === 'play') {
    // The second vault, mid-heist: if the pilot clears it too fast, use a
    // shorter run so the frame still shows the room being crossed.
    for (const seconds of [PLAY_SECONDS, 12, 8, 5]) {
      const world = new World(1);
      playLevel(world, false, seconds);
      if (world.status === WORLD_PLAYING) {
        return { world, screen: 'play', totalScore: 0, isLast: false };
      }
    }
    const world = new World(1);
    playLevel(world, false, 5);
    return { world, screen: 'play', totalScore: 0, isLast: false };
  }

  if (name === 'caught') {
    const world = new World(0);
    playLevel(world, true, CAUGHT_LIMIT_SECONDS);
    if (world.status === WORLD_CAUGHT) {
      return { world, screen: 'caught', totalScore: 0, isLast: false };
    }
    const staged = stageCaughtFallback();
    return { world: staged, screen: 'caught', totalScore: 0, isLast: false };
  }

  // start (and anything else): a fresh room, guards already patrolling.
  const world = new World(0);
  for (let i = 0; i < Math.floor(START_SECONDS / STEP); i += 1) {
    world.step(STEP, { move: { x: 0, y: 0 }, sneaking: false, clicks: [], pressed: [] });
  }
  return { world, screen: 'title', totalScore: 0, isLast: false };
}
