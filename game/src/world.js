// The world: one level's simulation. It owns the thief, the guards, the
// cameras, the loot, the tools and the alarm meter, and steps them forward
// in fixed ticks. It knows nothing about the DOM or the canvas: the game
// loop feeds it a plain input object and reads its state back to draw.
// That split is what lets the screenshot autopilot play the real rules
// headless, with a fixed seed, and always land on the same frame.

import { ALARM, CAMERA, GUARD, LEVELS, LEVEL_SEEDS, LOOT_KIND, PAR_SECONDS, PLAYER, TOOLS } from './config.js';
import { circleHitsRect, dist } from './geometry.js';
import { mulberry32 } from './random.js';
import { Guard } from './guards.js';
import { Camera } from './cameras.js';
import { Tools } from './tools.js';

export const WORLD_PLAYING = 'playing';
export const WORLD_CAUGHT = 'caught';
export const WORLD_COMPLETE = 'complete';

export class World {
  constructor(levelIndex) {
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    this.rng = mulberry32(LEVEL_SEEDS[levelIndex]);
    this.walls = this.level.walls;
    this.guards = this.level.guards.map((def) => new Guard(def, this.walls));
    this.cameras = this.level.cameras.map((def) => new Camera(def, this.walls));
    this.tools = new Tools();
    this.loot = this.level.loot.map((item) => ({
      kind: item.kind,
      x: item.x,
      y: item.y,
      value: LOOT_KIND[item.kind].value,
      target: LOOT_KIND[item.kind].target,
      taken: false,
      /** Little sparkle phase so loot glints. */
      sparkle: this.rng() * Math.PI * 2,
    }));
    this.exit = this.level.exit;
    this.player = {
      x: this.level.playerStart.x,
      y: this.level.playerStart.y,
      facing: 0,
      moving: false,
      sneaking: false,
    };
    this.alarm = 0;
    this.maxAlarm = 0;
    this.time = 0;
    this.status = WORLD_PLAYING;
    this.channel = 0;
    this.score = 0;
    this.lootTaken = 0;
    this.noiseTimer = 0;
    this.events = [];
    this.caughtBy = '';
  }

  get targetLoot() {
    return this.loot.find((item) => item.target);
  }

  get targetTaken() {
    return this.targetLoot.taken;
  }

  get lootValue() {
    return this.loot.filter((item) => item.taken).reduce((sum, item) => sum + item.value, 0);
  }

  get objective() {
    return this.targetTaken ? 'Reach the east exit — get out clean' : 'Lift the Star Sapphire from its case';
  }

  get ghost() {
    return this.maxAlarm <= ALARM.ghostLimit;
  }

  /** Score for a finished level: loot, time bonus, and a Ghost bonus. */
  levelScore() {
    const timeBonus = Math.max(0, Math.round((PAR_SECONDS[this.levelIndex] - this.time) * 10));
    const ghostBonus = this.ghost ? 1000 : 0;
    return this.lootValue + timeBonus + ghostBonus;
  }

  reset() {
    const fresh = new World(this.levelIndex);
    Object.assign(this, fresh);
  }

  step(dt, input) {
    if (this.status !== WORLD_PLAYING) return;
    this.time += dt;
    const move = input.move ?? { x: 0, y: 0 };
    const sneaking = !!input.sneaking;
    this.player.sneaking = sneaking;
    const speed = sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const moving = move.x !== 0 || move.y !== 0;
    this.player.moving = moving;
    if (moving) {
      this.player.facing = Math.atan2(move.y, move.x);
      const nx = this.player.x + move.x * speed * dt;
      const ny = this.player.y + move.y * speed * dt;
      if (!this.hitsWall(nx, this.player.y)) this.player.x = nx;
      if (!this.hitsWall(this.player.x, ny)) this.player.y = ny;
      if (!sneaking) this.makeNoise(dt);
    }

    // Tools: mouse clicks throw coins, Q fires the EMP.
    for (const click of input.clicks ?? []) {
      if (click.y < 56) continue;
      if (this.tools.throwCoin(this.player.x, this.player.y, click.x, click.y)) {
        this.events.push('coin-throw');
      }
    }
    for (const key of input.pressed ?? []) {
      if ((key === 'q' || key === 'Q') && this.tools.fireEmp(this.cameras)) {
        this.events.push('emp');
      }
    }
    this.tools.step(dt, this.guards);

    // Loot: bonus pieces lift on touch; the Sapphire needs a steady crack.
    const target = this.targetLoot;
    for (const item of this.loot) {
      if (item.taken) continue;
      const d = dist(this.player.x, this.player.y, item.x, item.y);
      if (item.target) {
        if (d <= 36 && !moving) {
          this.channel += dt / PLAYER.channelSeconds;
          if (this.channel >= 1) {
            item.taken = true;
            this.lootTaken += 1;
            this.events.push('crack');
          }
        } else {
          this.channel = Math.max(0, this.channel - dt * 1.5);
        }
      } else if (d <= 26) {
        item.taken = true;
        this.lootTaken += 1;
        this.events.push('pickup');
      }
    }

    // Guards and cameras watch the room.
    let seenByGuard = false;
    let seenByCamera = false;
    let chased = false;
    for (const guard of this.guards) {
      guard.step(dt, this.player, sneaking);
      if (guard.seesThief(this.player, sneaking)) seenByGuard = true;
      if (guard.state === 'chase') chased = true;
      if (guard.state === 'chase' && dist(guard.x, guard.y, this.player.x, this.player.y) < 26) {
        this.getCaught('A guard grabbed you in the dark.');
        return;
      }
      // A guard who walks straight into the thief catches them, chasing or not.
      if (dist(guard.x, guard.y, this.player.x, this.player.y) < 24) {
        this.getCaught('A guard walked straight into you.');
        return;
      }
    }
    for (const camera of this.cameras) {
      camera.step(dt, this.player, sneaking);
      if (camera.seesThief(this.player, sneaking)) seenByCamera = true;
    }

    // The alarm meter: seen means it climbs, unseen means it cools.
    if (chased) {
      this.alarm += ALARM.chaseRate * dt;
    } else if (seenByGuard && seenByCamera) {
      this.alarm += (ALARM.guardRate + ALARM.cameraRate * 0.6) * dt;
    } else if (seenByGuard) {
      const nearest = this.nearestGuardDistance();
      const closeness = 1.4 - Math.min(1, nearest / GUARD.visionRange) * 0.8;
      this.alarm += ALARM.guardRate * closeness * dt;
    } else if (seenByCamera) {
      this.alarm += ALARM.cameraRate * dt;
    } else {
      this.alarm = Math.max(0, this.alarm - ALARM.decayPerSecond * dt);
    }
    if (seenByGuard && this.alarm > 20 && this.events.indexOf('spotted') === -1) {
      this.events.push('spotted');
    }
    this.maxAlarm = Math.max(this.maxAlarm, this.alarm);
    if (this.alarm >= 100) {
      this.getCaught('The alarm hit the roof — the house woke up.');
      return;
    }

    // Exit: only open once the Sapphire is in the bag.
    if (this.targetTaken) {
      const e = this.exit;
      if (
        this.player.x > e.x && this.player.x < e.x + e.w &&
        this.player.y > e.y && this.player.y < e.y + e.h
      ) {
        this.status = WORLD_COMPLETE;
        this.score = this.levelScore();
        this.events.push('complete');
      }
    }
  }

  nearestGuardDistance() {
    let best = Infinity;
    for (const guard of this.guards) {
      best = Math.min(best, dist(guard.x, guard.y, this.player.x, this.player.y));
    }
    return best;
  }

  makeNoise(dt) {
    this.noiseTimer -= dt;
    if (this.noiseTimer > 0) return;
    this.noiseTimer = 0.5;
    for (const guard of this.guards) {
      if (dist(guard.x, guard.y, this.player.x, this.player.y) <= PLAYER.noiseRadius) {
        guard.investigate(this.player.x, this.player.y);
      }
    }
  }

  getCaught(reason) {
    this.status = WORLD_CAUGHT;
    this.caughtBy = reason;
    this.alarm = 100;
    this.maxAlarm = 100;
    this.events.push('caught');
  }

  hitsWall(x, y) {
    for (const wall of this.walls) {
      if (circleHitsRect(x, y, PLAYER.radius, wall)) return true;
    }
    return false;
  }

  /** Drain this step's sound events. */
  takeEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}
