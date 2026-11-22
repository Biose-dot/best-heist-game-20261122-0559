// Security cameras: wall-mounted, sweeping a red cone back and forth.
// A camera that holds the thief in its cone raises the alarm fast. An EMP
// blacks them out for a while; while offline they draw grey and see
// nothing.

import { inVisionCone } from './geometry.js';
import { CAMERA } from './config.js';

export class Camera {
  constructor(def, walls) {
    this.walls = walls;
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.speed = def.speed;
    this.phase = 0;
    this.angle = def.baseAngle;
    /** Seconds of EMP blackout left. */
    this.offlineTimer = 0;
    /** Seconds the thief has been continuously visible. */
    this.seenTimer = 0;
  }

  get offline() {
    return this.offlineTimer > 0;
  }

  emp() {
    this.offlineTimer = CAMERA.empSeconds;
  }

  seesThief(thief, sneaking) {
    if (this.offline) return false;
    const range = sneaking ? CAMERA.range * 0.75 : CAMERA.range;
    return inVisionCone(
      thief.x, thief.y, this.x, this.y, this.angle,
      CAMERA.halfAngle, range, this.walls,
    );
  }

  step(dt, thief, sneaking) {
    if (this.offlineTimer > 0) this.offlineTimer -= dt;
    this.phase += dt * this.speed;
    this.angle = this.baseAngle + Math.sin(this.phase) * this.sweep;
    if (this.seesThief(thief, sneaking)) {
      this.seenTimer += dt;
    } else {
      this.seenTimer = Math.max(0, this.seenTimer - dt * 2);
    }
  }
}
