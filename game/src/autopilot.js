// The screenshot autopilot: it plays the real rules forward, one fixed
// step at a time. It plans a route with Dijkstra over a grid of the room,
// where cells inside (or near) a vision cone cost far more than safe ones,
// so it walks around patrols instead of through them, and it waits rather
// than stepping into a cone that is sweeping across its path. Cracking the
// Sapphire is timed: the pilot waits at a staging point until no guard is
// close and no camera is about to sweep the case, channels for two seconds,
// and runs the moment anything spots it. A reckless pilot charges straight
// at the nearest guard's front, which is how the caught scene happens.
// Only the ?shot= scenes use this; the game itself is played by a human.

import { CAMERA, GUARD } from './config.js';
import { angleDiff, circleHitsRect, dist, lineBlocked } from './geometry.js';

const CELL = 24;
const COLS = Math.ceil(1280 / CELL);
const ROWS = Math.ceil(800 / CELL);
const REPLAN_EVERY = 20;
const STAGE_REPLAN_EVERY = 30;
const CONE_COST = 120;
const NEAR_COST = 15;
/** The pathfinder treats cones as this much wider, to keep a berth. */
const CONE_BERTH = 0.45;
/** A guard this far away is too close to start cracking the case. */
const CHANNEL_GUARD_DISTANCE = 200;
/** A camera that will sweep the case within this many seconds blocks it. */
const CHANNEL_CAMERA_SECONDS = 2.1;

/** Binary min-heap of [cost, cellIndex], for Dijkstra. */
class Heap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(cost, index) {
    const items = this.items;
    items.push([cost, index]);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent][0] <= items[i][0]) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }

  pop() {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < items.length && items[left][0] < items[smallest][0]) smallest = left;
        if (right < items.length && items[right][0] < items[smallest][0]) smallest = right;
        if (smallest === i) break;
        [items[smallest], items[i]] = [items[i], items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

function cellCenter(index) {
  const cx = index % COLS;
  const cy = Math.floor(index / COLS);
  return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 };
}

function cellIndex(x, y) {
  const cx = Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL)));
  const cy = Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL)));
  return cy * COLS + cx;
}

function walkable(world, index) {
  const { x, y } = cellCenter(index);
  // A 16px margin (the thief's radius is 12) keeps the planned route from
  // grazing a wall's corner, where the continuous movement would wedge.
  for (const wall of world.walls) {
    if (circleHitsRect(x, y, 16, wall)) return false;
  }
  return true;
}

/**
 * Extra travel cost of a cell, from the seers' current cones (widened by a
 * berth) and from standing too close to a seer.
 */
function dangerCost(world, x, y) {
  let cost = 0;
  const probe = { x, y };
  for (const guard of world.guards) {
    if (dist(guard.x, guard.y, x, y) > GUARD.visionRange + 60) continue;
    const inCone = guard.seesThief(probe, false);
    const wide = !inCone && dist(guard.x, guard.y, x, y) <= GUARD.visionRange + 30 &&
      angleDiff(Math.atan2(y - guard.y, x - guard.x), guard.facing) <= GUARD.visionHalfAngle + CONE_BERTH &&
      !lineBlocked(guard.x, guard.y, x, y, world.walls);
    if (inCone || wide) cost += CONE_COST;
    else if (dist(guard.x, guard.y, x, y) < 70) cost += NEAR_COST;
  }
  for (const camera of world.cameras) {
    if (camera.offline) continue;
    if (dist(camera.x, camera.y, x, y) > CAMERA.range + 40) continue;
    const inCone = camera.seesThief(probe, false);
    const wide = !inCone && dist(camera.x, camera.y, x, y) <= CAMERA.range + 30 &&
      angleDiff(Math.atan2(y - camera.y, x - camera.x), camera.angle) <= CAMERA.halfAngle + 0.3 &&
      !lineBlocked(camera.x, camera.y, x, y, world.walls);
    if (inCone || wide) cost += CONE_COST + 10;
    else if (dist(camera.x, camera.y, x, y) < 70) cost += NEAR_COST;
  }
  return cost;
}

/** One danger value per cell, computed once per replan. */
function dangerGrid(world) {
  const total = COLS * ROWS;
  const grid = new Float32Array(total);
  for (let index = 0; index < total; index += 1) {
    const { x, y } = cellCenter(index);
    grid[index] = dangerCost(world, x, y);
  }
  return grid;
}

function nearestWalkable(world, gx, gy) {
  const start = cellIndex(gx, gy);
  if (walkable(world, start)) return start;
  for (let r = 1; r <= 6; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const cx = (start % COLS) + dx;
        const cy = Math.floor(start / COLS) + dy;
        if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
        const index = cy * COLS + cx;
        if (walkable(world, index)) return index;
      }
    }
  }
  return start;
}

/**
 * Cheapest route from the player's cell to (gx, gy) as a list of cell
 * centres, or null when no route exists.
 */
function findPath(world, gx, gy) {
  const start = nearestWalkable(world, world.player.x, world.player.y);
  const goal = nearestWalkable(world, gx, gy);
  const total = COLS * ROWS;
  const danger = dangerGrid(world);
  const cost = new Float64Array(total).fill(Infinity);
  const prev = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const heap = new Heap();
  cost[start] = 0;
  heap.push(0, start);
  while (heap.size > 0) {
    const [c, index] = heap.pop();
    if (closed[index]) continue;
    closed[index] = 1;
    if (index === goal) break;
    const cx = index % COLS;
    const cy = Math.floor(index / COLS);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const next = ny * COLS + nx;
        if (closed[next] || !walkable(world, next)) continue;
        const step = (dx !== 0 && dy !== 0) ? 1.41 : 1;
        const nextCost = c + step + danger[next];
        if (nextCost < cost[next]) {
          cost[next] = nextCost;
          prev[next] = index;
          heap.push(nextCost, next);
        }
      }
    }
  }
  if (!closed[goal]) return null;
  const path = [];
  let at = goal;
  while (at !== start && at !== -1) {
    path.push(cellCenter(at));
    at = prev[at];
  }
  path.reverse();
  return path;
}

function nearestGuardDistance(world, x, y) {
  let best = Infinity;
  for (const guard of world.guards) {
    best = Math.min(best, dist(guard.x, guard.y, x, y));
  }
  return best;
}

function anyGuardChasing(world) {
  return world.guards.some((guard) => guard.state === 'chase');
}

function pointInAnyCone(world, x, y) {
  const probe = { x, y };
  for (const guard of world.guards) {
    if (guard.seesThief(probe, false)) return true;
  }
  for (const camera of world.cameras) {
    if (camera.seesThief(probe, false)) return true;
  }
  return false;
}

/**
 * Seconds until a camera's sweeping cone covers (x, y), or Infinity when
 * it never does within the next five seconds (or the camera is offline).
 */
function cameraTimeToSpot(camera, x, y, walls) {
  if (camera.offline) return Infinity;
  if (dist(camera.x, camera.y, x, y) > CAMERA.range) return Infinity;
  if (lineBlocked(camera.x, camera.y, x, y, walls)) return Infinity;
  const bearing = Math.atan2(y - camera.y, x - camera.x);
  for (let t = 0; t <= 5; t += 0.1) {
    const phase = camera.phase + t * camera.speed;
    const angle = camera.baseAngle + Math.sin(phase) * camera.sweep;
    if (angleDiff(angle, bearing) <= CAMERA.halfAngle) return t;
  }
  return Infinity;
}

function soonestCameraSpot(world, x, y) {
  let best = Infinity;
  for (const camera of world.cameras) {
    best = Math.min(best, cameraTimeToSpot(camera, x, y, world.walls));
  }
  return best;
}

/** True when the case can be cracked right now without being seen. */
function safeToChannel(world, target) {
  if (anyGuardChasing(world)) return false;
  if (nearestGuardDistance(world, target.x, target.y) < CHANNEL_GUARD_DISTANCE) return false;
  if (pointInAnyCone(world, target.x, target.y)) return false;
  if (soonestCameraSpot(world, target.x, target.y) < CHANNEL_CAMERA_SECONDS) return false;
  return true;
}

/**
 * A quiet spot near the target to wait at: out of every cone, far from the
 * guards, and not about to be swept by a camera.
 */
function stagingPoint(world, tx, ty) {
  let best = null;
  let bestScore = -Infinity;
  for (const radius of [80, 120, 170]) {
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const x = tx + Math.cos(angle) * radius;
      const y = ty + Math.sin(angle) * radius;
      if (x < 30 || x > 1250 || y < 80 || y > 770) continue;
      if (world.hitsWall(x, y)) continue;
      let score = nearestGuardDistance(world, x, y);
      if (pointInAnyCone(world, x, y)) score -= 1000;
      score += Math.min(5, soonestCameraSpot(world, x, y)) * 20;
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return best;
}

/** Per-world autopilot memory (path, staging point, timers), off the world. */
const memory = new WeakMap();

function getMemory(world) {
  let mem = memory.get(world);
  if (!mem) {
    mem = {
      path: [], ticks: 0, goalKey: '', stage: null, stageTicks: 0,
      lastX: null, lastY: null, stillTicks: 0, unstuckUntil: 0, lastMove: null,
    };
    memory.set(world, mem);
  }
  return mem;
}

function getStage(world, mem, target) {
  if (!mem.stage || mem.ticks - mem.stageTicks >= STAGE_REPLAN_EVERY) {
    mem.stage = stagingPoint(world, target.x, target.y);
    mem.stageTicks = mem.ticks;
  }
  return mem.stage;
}

/**
 * Follow the planned route toward `goal`. Returns a unit move, null when
 * the route is blocked right now (wait), or {x:0,y:0} when already there.
 * With waitForCones off (the reckless pilot), it steps into cones.
 */
function followPath(world, mem, goal, goalKey, waitForCones = true) {
  if (goalKey !== mem.goalKey || mem.path.length === 0 || mem.ticks % REPLAN_EVERY === 0) {
    mem.goalKey = goalKey;
    mem.path = findPath(world, goal.x, goal.y) ?? [];
  }
  if (mem.path.length === 0) return { x: 0, y: 0 };
  const next = mem.path[0];
  const dx = next.x - world.player.x;
  const dy = next.y - world.player.y;
  const d = Math.hypot(dx, dy);
  if (d < 10) {
    mem.path.shift();
    return followPath(world, mem, goal, goalKey, waitForCones);
  }
  // Never step into a cone that is sweeping across the path: wait for it.
  if (waitForCones && pointInAnyCone(world, next.x, next.y)) return null;
  const probeX = world.player.x + (dx / d) * 26;
  const probeY = world.player.y + (dy / d) * 26;
  if (world.hitsWall(probeX, probeY)) {
    mem.path = findPath(world, goal.x, goal.y) ?? [];
    if (mem.path.length === 0) return { x: 0, y: 0 };
    const retry = mem.path[0];
    if (waitForCones && pointInAnyCone(world, retry.x, retry.y)) return null;
    const rdx = retry.x - world.player.x;
    const rdy = retry.y - world.player.y;
    const rd = Math.hypot(rdx, rdy) || 1;
    return { x: rdx / rd, y: rdy / rd };
  }
  return { x: dx / d, y: dy / d };
}

/**
 * Pick the next move for `world`. Returns {x, y, sneaking}.
 * Options: {reckless: true} charges the nearest guard (caught scene).
 */
function decide(world, options, mem) {
  const player = world.player;
  if (world.status !== 'playing') return { x: 0, y: 0, sneaking: false };
  const chasing = anyGuardChasing(world);
  const sneak = !chasing && world.alarm < 50 &&
    nearestGuardDistance(world, player.x, player.y) < 200;

  if (options.reckless) {
    // Hunt the nearest guard down by the planned route: the patrol walks
    // into the thief, and a guard who touches the thief catches them.
    let nearest = null;
    let best = Infinity;
    for (const guard of world.guards) {
      const d = dist(guard.x, guard.y, player.x, player.y);
      if (d < best) {
        best = d;
        nearest = guard;
      }
    }
    if (!nearest) return { x: 0, y: 0, sneaking: false };
    const dir = followPath(world, mem, nearest, 'reckless', false);
    if (dir) return { x: dir.x, y: dir.y, sneaking: false };
    return { x: 0, y: 0, sneaking: false };
  }

  mem.ticks += 1;

  // The Sapphire comes first: time the crack, wait when it is watched.
  const target = world.targetLoot;
  if (target && !target.taken) {
    const dTarget = dist(player.x, player.y, target.x, target.y);
    if (dTarget <= 36) {
      if (world.channel > 0) {
        // Mid-crack: bail the moment the window closes.
        const remaining = (1 - world.channel) * 2;
        if (nearestGuardDistance(world, player.x, player.y) < 130 ||
            soonestCameraSpot(world, target.x, target.y) < remaining || chasing) {
          mem.path = [];
          const stage = getStage(world, mem, target);
          if (stage) {
            const dir = followPath(world, mem, stage, 'stage');
            if (dir) return { x: dir.x, y: dir.y, sneaking: true };
          }
          return { x: 0, y: 0, sneaking: true };
        }
        return { x: 0, y: 0, sneaking: false };
      }
      if (safeToChannel(world, target)) return { x: 0, y: 0, sneaking: false };
      // Watched: wait it out at a staging point instead of on the case.
      const stage = getStage(world, mem, target);
      if (stage && dist(player.x, player.y, stage.x, stage.y) > 24) {
        const dir = followPath(world, mem, stage, 'stage');
        if (dir) return { x: dir.x, y: dir.y, sneaking: true };
        if (dir === null) return { x: 0, y: 0, sneaking: true };
      }
      return { x: 0, y: 0, sneaking: true };
    }
    // Not at the case yet: go there when it looks crackable, else stage.
    if (safeToChannel(world, target)) {
      const dir = followPath(world, mem, target, 'target');
      if (dir) return { x: dir.x, y: dir.y, sneaking: sneak };
      if (dir === null) return { x: 0, y: 0, sneaking: true };
    }
    const stage = getStage(world, mem, target);
    if (stage) {
      const dir = followPath(world, mem, stage, 'stage');
      if (dir) return { x: dir.x, y: dir.y, sneaking: true };
      if (dir === null) return { x: 0, y: 0, sneaking: true };
    }
    const dir = followPath(world, mem, target, 'target');
    if (dir) return { x: dir.x, y: dir.y, sneaking: sneak };
    return { x: 0, y: 0, sneaking: true };
  }

  // Then the nearest bonus loot, then the exit.
  let goal = null;
  let goalKey = '';
  let best = Infinity;
  for (const item of world.loot) {
    if (item.taken) continue;
    const d = dist(player.x, player.y, item.x, item.y);
    if (d < best) {
      best = d;
      goal = item;
      goalKey = `loot-${item.kind}-${item.x}-${item.y}`;
    }
  }
  if (!goal) {
    goal = { x: world.exit.x + world.exit.w / 2, y: world.exit.y + world.exit.h / 2 };
    goalKey = 'exit';
  }
  const dir = followPath(world, mem, goal, goalKey);
  if (dir) return { x: dir.x, y: dir.y, sneaking: sneak };
  return { x: 0, y: 0, sneaking: true };
}

/**
 * The autopilot entry point: decide the next move, and watch for the thief
 * getting wedged on a wall corner (a commanded move that moves nobody).
 * When wedged, push off the nearest wall for a while, then replan.
 */
export function autopilot(world, options = {}) {
  const mem = getMemory(world);
  const player = world.player;
  const wasMoving = mem.lastMove && (mem.lastMove.x !== 0 || mem.lastMove.y !== 0);
  const moved = mem.lastX === null ? 1 : dist(player.x, player.y, mem.lastX, mem.lastY);
  if (wasMoving && moved < 0.5) mem.stillTicks += 1;
  else mem.stillTicks = 0;
  mem.lastX = player.x;
  mem.lastY = player.y;
  if (mem.stillTicks > 45 && mem.ticks > mem.unstuckUntil) {
    mem.unstuckUntil = mem.ticks + 45;
    mem.stillTicks = 0;
    mem.path = [];
  }
  let move;
  if (mem.ticks < mem.unstuckUntil) {
    let bestWall = null;
    let bestD = Infinity;
    for (const wall of world.walls) {
      const nx = Math.max(wall.x, Math.min(player.x, wall.x + wall.w));
      const ny = Math.max(wall.y, Math.min(player.y, wall.y + wall.h));
      const d = dist(player.x, player.y, nx, ny);
      if (d < bestD) {
        bestD = d;
        bestWall = { x: nx, y: ny };
      }
    }
    if (bestWall && bestD < 60) {
      const dx = player.x - bestWall.x;
      const dy = player.y - bestWall.y;
      const d = Math.hypot(dx, dy) || 1;
      move = { x: dx / d, y: dy / d, sneaking: false };
    } else {
      mem.unstuckUntil = 0;
      move = decide(world, options, mem);
    }
  } else {
    move = decide(world, options, mem);
  }
  mem.lastMove = move;
  return move;
}
