// Guards: patrol a waypoint loop, pause at each stop, and watch the room
// through a vision cone. A guard who sees the thief gives chase and raises
// the alarm; a noise or a thrown coin sends them to investigate the point
// before they walk back to their route.

import { angleDiff, angleTo, circleHitsRect, dist, inVisionCone, lineBlocked } from './geometry.js';
import { GUARD } from './config.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_CHASE = 'chase';
export const GUARD_RETURN = 'return';

export class Guard {
  constructor(def, walls) {
    this.walls = walls;
    this.waypoints = def.waypoints;
    this.speed = def.speed ?? GUARD.patrolSpeed;
    this.x = def.waypoints[0][0];
    this.y = def.waypoints[0][1];
    this.targetIndex = 1 % def.waypoints.length;
    this.facing = 0;
    this.state = GUARD_PATROL;
    this.pauseTimer = 0;
    /** Seconds the thief has been continuously visible. */
    this.seenTimer = 0;
    /** Where the guard is walking to investigate. */
    this.investigateX = 0;
    this.investigateY = 0;
    this.investigateTimer = 0;
    this.lastSeenX = 0;
    this.lastSeenY = 0;
    /** Seconds spent stuck against a wall; skips a waypoint if it grows. */
    this.stuckTimer = 0;
    this.facing = angleTo(this.x, this.y, this.waypoints[this.targetIndex][0], this.waypoints[this.targetIndex][1]);
  }

  /** True when the thief is inside this guard's cone right now. */
  seesThief(thief, sneaking) {
    const range = sneaking ? GUARD.visionRange * 0.72 : GUARD.visionRange;
    return inVisionCone(
      thief.x, thief.y, this.x, this.y, this.facing,
      GUARD.visionHalfAngle, range, this.walls,
    );
  }

  /** Send this guard to look at a point (a noise or a thrown coin). */
  investigate(x, y) {
    if (this.state === GUARD_CHASE) return;
    this.state = GUARD_SUSPICIOUS;
    this.investigateX = x;
    this.investigateY = y;
    this.investigateTimer = 6;
  }

  step(dt, thief, sneaking) {
    const seen = this.seesThief(thief, sneaking);
    if (seen) {
      this.seenTimer += dt;
      this.lastSeenX = thief.x;
      this.lastSeenY = thief.y;
      if (this.seenTimer >= GUARD.spotSeconds && this.state !== GUARD_CHASE) {
        this.state = GUARD_CHASE;
      }
    } else {
      this.seenTimer = Math.max(0, this.seenTimer - dt * 2);
      if (this.state === GUARD_CHASE) {
        this.state = GUARD_SUSPICIOUS;
        this.investigateX = this.lastSeenX;
        this.investigateY = this.lastSeenY;
        this.investigateTimer = 5;
      }
    }

    if (this.state === GUARD_CHASE) {
      this.moveToward(this.lastSeenX, this.lastSeenY, GUARD.chaseSpeed, dt);
      if (dist(this.x, this.y, this.lastSeenX, this.lastSeenY) < 24) {
        this.state = GUARD_SUSPICIOUS;
        this.investigateX = this.lastSeenX;
        this.investigateY = this.lastSeenY;
        this.investigateTimer = 4;
      }
      return;
    }

    if (this.state === GUARD_SUSPICIOUS) {
      this.investigateTimer -= dt;
      const arrived = this.moveToward(this.investigateX, this.investigateY, this.speed * 1.25, dt);
      if (arrived || this.investigateTimer <= 0) {
        this.state = GUARD_RETURN;
      }
      return;
    }

    if (this.state === GUARD_RETURN) {
      const [wx, wy] = this.nearestWaypoint();
      const arrived = this.moveToward(wx, wy, this.speed, dt);
      if (arrived) {
        this.state = GUARD_PATROL;
        this.pauseTimer = 0;
      }
      return;
    }

    // Patrol: walk the loop, pausing at each waypoint.
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      return;
    }
    const [wx, wy] = this.waypoints[this.targetIndex];
    const arrived = this.moveToward(wx, wy, this.speed, dt);
    if (arrived) {
      this.targetIndex = (this.targetIndex + 1) % this.waypoints.length;
      this.pauseTimer = GUARD.pauseSeconds;
    }
  }

  nearestWaypoint() {
    let best = this.waypoints[0];
    let bestD = Infinity;
    for (const [wx, wy] of this.waypoints) {
      const d = dist(this.x, this.y, wx, wy);
      if (d < bestD) {
        bestD = d;
        best = [wx, wy];
      }
    }
    return best;
  }

  /** Walk toward (tx, ty) with wall sliding; returns true on arrival. */
  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) return true;
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step;
    const ny = this.y + (dy / d) * step;
    const beforeX = this.x;
    const beforeY = this.y;
    if (!this.hitsWall(nx, this.y)) this.x = nx;
    if (!this.hitsWall(this.x, ny)) this.y = ny;
    this.facing = angleTo(this.x, this.y, tx, ty);
    const moved = Math.hypot(this.x - beforeX, this.y - beforeY);
    if (moved < step * 0.25) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 1.0) {
        this.stuckTimer = 0;
        if (this.state === GUARD_PATROL) {
          this.targetIndex = (this.targetIndex + 1) % this.waypoints.length;
        } else {
          this.state = GUARD_RETURN;
        }
      }
    } else {
      this.stuckTimer = 0;
    }
    return Math.hypot(tx - this.x, ty - this.y) < 6;
  }

  hitsWall(x, y) {
    for (const wall of this.walls) {
      if (circleHitsRect(x, y, GUARD.radius, wall)) return true;
    }
    return false;
  }

  /** How suspicious this guard looks: 0 calm, 1 fully alert. */
  alertness() {
    if (this.state === GUARD_CHASE) return 1;
    if (this.state === GUARD_SUSPICIOUS) return 0.6;
    return Math.min(1, this.seenTimer / GUARD.spotSeconds) * 0.6;
  }
}
