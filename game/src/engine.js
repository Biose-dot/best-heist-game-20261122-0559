// Velvet Vault — the game engine.
// One clear job: the rules of the heist, with no DOM and no canvas in
// sight. Guards patrol, investigate noises and chase; cameras sweep;
// the alarm rises while Wren is seen and cools while she hides; loot,
// the Sapphire channel and the exit decide the score. Pure logic, so a
// headless test can drive it step by step from Node.

import {
  ALARM_CAUGHT,
  ALARM_FALL_PER_SECOND,
  ALARM_GHOST_LIMIT,
  ALARM_RISE_CAMERA,
  ALARM_RISE_CLOSE_BONUS,
  ALARM_RISE_PER_SECOND,
  CAMERA_VIEW_HALF_ANGLE,
  CAMERA_VIEW_RANGE,
  CANVAS_H,
  CANVAS_W,
  COIN_NOISE_RADIUS,
  COIN_THROW_RANGE,
  EMP_DISABLE_SECONDS,
  GHOST_BONUS,
  GUARD_CHASE_SPEED,
  GUARD_HEAR_RADIUS,
  GUARD_INVESTIGATE_SPEED,
  GUARD_LOSE_SIGHT_SECONDS,
  GUARD_PATROL_SPEED,
  GUARD_RADIUS,
  GUARD_SEARCH_SECONDS,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_VIEW_RANGE,
  HUD_H,
  LEVEL_SEEDS,
  LOOT_VALUES,
  PLAYER_RADIUS,
  PLAYER_SNEAK_SPEED,
  PLAYER_SNEAK_VISION_FACTOR,
  PLAYER_WALK_SPEED,
  SAPPHIRE_CHANNEL_SECONDS,
  SAPPHIRE_RADIUS,
  TIME_BONUS_PER_SECOND,
} from './config.js';
import { LEVELS } from './levels.js';
import { makeRng, pickInRange } from './rng.js';

const TWO_PI = Math.PI * 2;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TWO_PI;
  while (d < -Math.PI) d += TWO_PI;
  return d;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Segment AB against one axis-aligned rectangle. True when they touch.
function segmentHitsRect(ax, ay, bx, by, r) {
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minY = Math.min(ay, by);
  const maxY = Math.max(ay, by);
  if (maxX < r.x || minX > r.x + r.w || maxY < r.y || minY > r.y + r.h) return false;
  if (ax >= r.x && ax <= r.x + r.w && ay >= r.y && ay <= r.y + r.h) return true;
  if (bx >= r.x && bx <= r.x + r.w && by >= r.y && by <= r.y + r.h) return true;
  const dx = bx - ax;
  const dy = by - ay;
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [x1, y1, x2, y2] of edges) {
    const denom = dx * (y2 - y1) - dy * (x2 - x1);
    if (Math.abs(denom) < 1e-9) continue;
    const t = ((x1 - ax) * (y2 - y1) - (y1 - ay) * (x2 - x1)) / denom;
    const u = ((x1 - ax) * dy - (y1 - ay) * dx) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}

export function blocksSight(obstacle) {
  return obstacle.kind === 'wall' || obstacle.kind === 'crate';
}

export function hasLineOfSight(ax, ay, bx, by, obstacles) {
  for (const o of obstacles) {
    if (blocksSight(o) && segmentHitsRect(ax, ay, bx, by, o)) return false;
  }
  return true;
}

function inCone(eyeX, eyeY, eyeAngle, halfAngle, range, tx, ty, obstacles) {
  const d = dist(eyeX, eyeY, tx, ty);
  if (d > range) return false;
  const ang = Math.atan2(ty - eyeY, tx - eyeX);
  if (Math.abs(angleDiff(ang, eyeAngle)) > halfAngle) return false;
  return hasLineOfSight(eyeX, eyeY, tx, ty, obstacles);
}

export function guardSeesPlayer(guard, player, obstacles) {
  const range = GUARD_VIEW_RANGE * (player.sneaking ? PLAYER_SNEAK_VISION_FACTOR : 1);
  return inCone(guard.x, guard.y, guard.angle, GUARD_VIEW_HALF_ANGLE, range, player.x, player.y, obstacles);
}

function cameraSeesPlayer(camera, time, player, obstacles) {
  if (time < camera.disabledUntil) return false;
  const angle = camera.baseAngle + Math.sin(time * 0.55 + camera.phase) * camera.sweep;
  return inCone(camera.x, camera.y, angle, CAMERA_VIEW_HALF_ANGLE, CAMERA_VIEW_RANGE, player.x, player.y, obstacles);
}

// Circle vs rectangle: push the circle out and say whether it hit.
function collideCircle(body, radius, obstacles) {
  let hit = false;
  for (const o of obstacles) {
    const cx = clamp(body.x, o.x, o.x + o.w);
    const cy = clamp(body.y, o.y, o.y + o.h);
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        body.x = cx + (dx / d) * radius;
        body.y = cy + (dy / d) * radius;
      } else {
        body.y = o.y - radius; // centre inside the rect: push up out of it
      }
    }
  }
  return hit;
}

function moveBody(body, radius, dx, dy, obstacles) {
  body.x += dx;
  body.x = clamp(body.x, radius + 8, CANVAS_W - radius - 8);
  collideCircle(body, radius, obstacles);
  body.y += dy;
  body.y = clamp(body.y, HUD_H + radius + 8, CANVAS_H - radius - 8);
  collideCircle(body, radius, obstacles);
}

function makeGuard(def, rng) {
  const [sx, sy] = def.waypoints[0];
  return {
    x: sx,
    y: sy,
    angle: 0,
    state: 'patrol',
    waypointIndex: 1 % def.waypoints.length,
    waitTimer: 0,
    waitSeconds: def.waitSeconds,
    targetX: sx,
    targetY: sy,
    lastSeenX: sx,
    lastSeenY: sy,
    loseTimer: 0,
    searchTimer: 0,
    scanPhase: rng() * TWO_PI,
    jitter: pickInRange(rng, 0.8, 1.2),
  };
}

export function createGame(levelIndex, totalScore = 0) {
  const level = LEVELS[levelIndex];
  const rng = makeRng(LEVEL_SEEDS[levelIndex]);
  return {
    screen: 'intro',
    levelIndex,
    level,
    rng,
    player: {
      x: level.entry.x,
      y: level.entry.y,
      angle: -Math.PI / 2,
      moving: false,
      sneaking: false,
      stepAcc: 0,
    },
    guards: level.guards.map((g) => makeGuard(g, rng)),
    cameras: level.cameras.map((c) => ({ ...c, angle: c.baseAngle, disabledUntil: 0 })),
    loot: level.loot.map((l) => ({ ...l, taken: false })),
    sapphireTaken: false,
    channelProgress: 0,
    channeling: false,
    coins: 3,
    emps: 1,
    thrownCoins: [],
    alarm: 0,
    maxAlarm: 0,
    score: 0,
    levelScore: 0,
    timeBonus: 0,
    ghostBonus: 0,
    ghost: true,
    time: 0,
    totalScore,
    exitOpen: false,
    wasSeen: false,
    events: [],
    message: '',
    messageTimer: 0,
  };
}

function setMessage(state, text, seconds = 2.5) {
  state.message = text;
  state.messageTimer = seconds;
}

function investigatePoint(guard, x, y) {
  if (guard.state === 'chase') return;
  guard.state = 'investigate';
  guard.targetX = x;
  guard.targetY = y;
  guard.searchTimer = GUARD_SEARCH_SECONDS;
}

function nearestWaypointIndex(guard, def) {
  let best = 0;
  let bestD = Infinity;
  def.waypoints.forEach(([wx, wy], i) => {
    const d = dist(guard.x, guard.y, wx, wy);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function updateGuard(state, guard, def, dt) {
  const player = state.player;
  const obstacles = state.level.obstacles;
  const seen = guardSeesPlayer(guard, player, obstacles);

  if (seen) {
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
    guard.loseTimer = 0;
    if (guard.state !== 'chase') {
      guard.state = 'chase';
      state.events.push('spotted');
    }
  } else if (guard.state === 'chase') {
    guard.loseTimer += dt;
    if (guard.loseTimer >= GUARD_LOSE_SIGHT_SECONDS) {
      guard.state = 'investigate';
      guard.targetX = guard.lastSeenX;
      guard.targetY = guard.lastSeenY;
      guard.searchTimer = GUARD_SEARCH_SECONDS;
    }
  }

  // Footsteps: a running thief is heard up close.
  if (player.moving && !player.sneaking && guard.state !== 'chase') {
    if (dist(guard.x, guard.y, player.x, player.y) < GUARD_HEAR_RADIUS) {
      investigatePoint(guard, player.x, player.y);
    }
  }

  if (guard.state === 'patrol') {
    const [wx, wy] = def.waypoints[guard.waypointIndex];
    if (guard.waitTimer > 0) {
      guard.waitTimer -= dt;
      guard.angle += Math.sin(state.time * 0.9 + guard.scanPhase) * 0.55 * dt;
      return;
    }
    const d = dist(guard.x, guard.y, wx, wy);
    if (d < 8) {
      guard.waitTimer = guard.waitSeconds * guard.jitter;
      guard.waypointIndex = (guard.waypointIndex + 1) % def.waypoints.length;
      return;
    }
    const ang = Math.atan2(wy - guard.y, wx - guard.x);
    guard.angle = ang;
    moveBody(guard, GUARD_RADIUS, Math.cos(ang) * GUARD_PATROL_SPEED * dt, Math.sin(ang) * GUARD_PATROL_SPEED * dt, obstacles);
  } else if (guard.state === 'investigate') {
    const d = dist(guard.x, guard.y, guard.targetX, guard.targetY);
    if (d < 10) {
      guard.searchTimer -= dt;
      guard.angle += 1.6 * dt; // look around while searching
      if (guard.searchTimer <= 0) {
        guard.state = 'patrol';
        guard.waypointIndex = nearestWaypointIndex(guard, def);
      }
      return;
    }
    const ang = Math.atan2(guard.targetY - guard.y, guard.targetX - guard.x);
    guard.angle = ang;
    moveBody(guard, GUARD_RADIUS, Math.cos(ang) * GUARD_INVESTIGATE_SPEED * dt, Math.sin(ang) * GUARD_INVESTIGATE_SPEED * dt, obstacles);
  } else if (guard.state === 'chase') {
    const tx = seen ? player.x : guard.lastSeenX;
    const ty = seen ? player.y : guard.lastSeenY;
    const d = dist(guard.x, guard.y, tx, ty);
    if (d > 26) {
      const ang = Math.atan2(ty - guard.y, tx - guard.x);
      guard.angle = ang;
      moveBody(guard, GUARD_RADIUS, Math.cos(ang) * GUARD_CHASE_SPEED * dt, Math.sin(ang) * GUARD_CHASE_SPEED * dt, obstacles);
    }
    // A guard that reaches the thief ends the run.
    if (dist(guard.x, guard.y, player.x, player.y) < GUARD_RADIUS + PLAYER_RADIUS + 2) {
      state.alarm = ALARM_CAUGHT;
    }
  }
}

function updatePlay(state, input, dt) {
  const player = state.player;
  const level = state.level;
  state.time += dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;

  // --- movement -------------------------------------------------------
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const mag = Math.hypot(mx, my);
  player.moving = mag > 0;
  // Holding Shift is a crouch: Wren stays low and hard to spot even
  // while standing still behind a case.
  player.sneaking = !!input.sneak;
  if (player.moving) {
    mx /= mag;
    my /= mag;
    const speed = player.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    player.angle = Math.atan2(my, mx);
    moveBody(player, PLAYER_RADIUS, mx * speed * dt, my * speed * dt, level.obstacles);
    player.stepAcc += speed * dt;
    if (player.stepAcc > 30) {
      player.stepAcc = 0;
      state.events.push('footstep');
    }
  }

  // --- coin toss ------------------------------------------------------
  if (input.coin && state.coins > 0) {
    let dx = input.coin.x - player.x;
    let dy = input.coin.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > COIN_THROW_RANGE) {
      dx = (dx / d) * COIN_THROW_RANGE;
      dy = (dy / d) * COIN_THROW_RANGE;
    }
    const cx = player.x + dx;
    const cy = player.y + dy;
    state.coins -= 1;
    state.thrownCoins.push({ x: cx, y: cy, ttl: 2.2 });
    state.events.push('coin');
    for (const guard of state.guards) {
      if (dist(guard.x, guard.y, cx, cy) < COIN_NOISE_RADIUS) investigatePoint(guard, cx, cy);
    }
  }
  for (const c of state.thrownCoins) c.ttl -= dt;
  state.thrownCoins = state.thrownCoins.filter((c) => c.ttl > 0);

  // --- EMP ------------------------------------------------------------
  if (input.emp && state.emps > 0) {
    state.emps -= 1;
    for (const cam of state.cameras) cam.disabledUntil = state.time + EMP_DISABLE_SECONDS;
    state.events.push('emp');
    setMessage(state, 'EMP fired — cameras dark for 10 seconds');
  }

  // --- guards and cameras ---------------------------------------------
  for (let i = 0; i < state.guards.length; i++) {
    updateGuard(state, state.guards[i], level.guards[i], dt);
  }
  for (const cam of state.cameras) {
    cam.angle = cam.baseAngle + Math.sin(state.time * 0.55 + cam.phase) * cam.sweep;
  }

  // --- vision and the alarm -------------------------------------------
  let seen = false;
  let closeSeen = false;
  for (const guard of state.guards) {
    if (guardSeesPlayer(guard, player, level.obstacles)) {
      seen = true;
      if (dist(guard.x, guard.y, player.x, player.y) < 120) closeSeen = true;
    }
  }
  let cameraSeen = false;
  for (const cam of state.cameras) {
    if (cameraSeesPlayer(cam, state.time, player, level.obstacles)) cameraSeen = true;
  }
  if (seen) {
    state.alarm += (ALARM_RISE_PER_SECOND + (closeSeen ? ALARM_RISE_CLOSE_BONUS : 0)) * dt;
    if (!state.wasSeen) state.events.push('spotted');
  } else if (cameraSeen) {
    state.alarm += ALARM_RISE_CAMERA * dt;
  } else {
    state.alarm -= ALARM_FALL_PER_SECOND * dt;
  }
  state.alarm = clamp(state.alarm, 0, ALARM_CAUGHT);
  state.maxAlarm = Math.max(state.maxAlarm, state.alarm);
  if (state.maxAlarm > ALARM_GHOST_LIMIT) state.ghost = false;
  state.wasSeen = seen || cameraSeen;

  if (state.alarm >= ALARM_CAUGHT) {
    state.screen = 'caught';
    state.events.push('caught');
    return;
  }

  // --- bonus loot ------------------------------------------------------
  for (const loot of state.loot) {
    if (!loot.taken && dist(player.x, player.y, loot.x, loot.y) < 32) {
      loot.taken = true;
      state.score += LOOT_VALUES[loot.kind];
      state.events.push('pickup');
    }
  }

  // --- the Star Sapphire: hold still and channel ----------------------
  const sapphire = level.sapphire;
  const nearSapphire = dist(player.x, player.y, sapphire.x, sapphire.y) < SAPPHIRE_RADIUS;
  if (!state.sapphireTaken && nearSapphire && !player.moving) {
    state.channeling = true;
    state.channelProgress += dt;
    if (state.channelProgress >= SAPPHIRE_CHANNEL_SECONDS) {
      state.sapphireTaken = true;
      state.score += LOOT_VALUES.sapphire;
      state.exitOpen = true;
      state.events.push('sapphire');
      setMessage(state, 'Star Sapphire secured — reach the exit door!', 4);
    }
  } else {
    state.channeling = false;
    if (!state.sapphireTaken) state.channelProgress = Math.max(0, state.channelProgress - dt * 2);
  }

  // --- the exit ---------------------------------------------------------
  if (state.exitOpen) {
    const ex = level.exit;
    if (player.x > ex.x && player.x < ex.x + ex.w && player.y > ex.y && player.y < ex.y + ex.h) {
      state.timeBonus = Math.max(0, Math.round((level.parSeconds - state.time) * TIME_BONUS_PER_SECOND));
      state.ghostBonus = state.ghost ? GHOST_BONUS : 0;
      state.levelScore = state.score + state.timeBonus + state.ghostBonus;
      state.totalScore += state.levelScore;
      if (state.levelIndex + 1 >= LEVELS.length) {
        state.screen = 'win';
        state.events.push('win');
      } else {
        state.screen = 'levelClear';
        state.events.push('levelClear');
      }
    }
  }
}

export function stepGame(state, input, dt) {
  state.events.length = 0;
  if (input.mute) state.events.push('toggleMute');
  if (state.screen === 'title') {
    if (input.confirm || input.anyKey) {
      Object.assign(state, createGame(0, 0));
      state.screen = 'intro';
    }
    return state;
  }
  if (state.screen === 'intro') {
    if (input.confirm || input.anyKey) state.screen = 'play';
    return state;
  }
  if (state.screen === 'play') {
    if (input.pause) {
      state.screen = 'paused';
      return state;
    }
    updatePlay(state, input, dt);
    return state;
  }
  if (state.screen === 'paused') {
    if (input.pause || input.confirm) state.screen = 'play';
    return state;
  }
  if (state.screen === 'caught') {
    if (input.confirm || input.anyKey) {
      const kept = state.totalScore;
      Object.assign(state, createGame(state.levelIndex, kept));
      state.screen = 'intro';
    }
    return state;
  }
  if (state.screen === 'levelClear') {
    if (input.confirm || input.anyKey) {
      const next = createGame(state.levelIndex + 1, state.totalScore);
      Object.assign(state, next);
      state.screen = 'intro';
    }
    return state;
  }
  if (state.screen === 'win') {
    if (input.confirm || input.anyKey) {
      Object.assign(state, createGame(0, 0));
      state.screen = 'title';
    }
    return state;
  }
  return state;
}
