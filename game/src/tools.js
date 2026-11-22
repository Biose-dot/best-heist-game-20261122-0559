// The thief's tools. A thrown coin clinks where it lands and pulls every
// guard in earshot over to look; an EMP blacks out every camera for a
// while. Both are scarce: coins and EMP charges are counted per level, and
// spending one is a real decision.

import { dist } from './geometry.js';
import { CAMERA, TOOLS } from './config.js';

export class Tools {
  constructor() {
    this.coins = TOOLS.coinsPerLevel;
    this.emp = TOOLS.empPerLevel;
    /** Flying coins: {x, y, tx, ty, t} travelling to their landing point. */
    this.flying = [];
    /** Landed coins still ringing: {x, y, t}. */
    this.ringing = [];
    /** Seconds of camera blackout left after an EMP. */
    this.empTimer = 0;
  }

  resetForLevel() {
    this.coins = TOOLS.coinsPerLevel;
    this.emp = TOOLS.empPerLevel;
    this.flying = [];
    this.ringing = [];
    this.empTimer = 0;
  }

  /** Throw a coin from (fx, fy) toward (tx, ty). Returns false with no coin left. */
  throwCoin(fx, fy, tx, ty) {
    if (this.coins <= 0) return false;
    this.coins -= 1;
    this.flying.push({ x: fx, y: fy, tx, ty, t: 0 });
    return true;
  }

  /** Fire the EMP: returns false with no charge left. */
  fireEmp(cameras) {
    if (this.emp <= 0) return false;
    this.emp -= 1;
    this.empTimer = CAMERA.empSeconds;
    for (const camera of cameras) camera.emp();
    return true;
  }

  step(dt, guards) {
    if (this.empTimer > 0) this.empTimer -= dt;
    for (let i = this.flying.length - 1; i >= 0; i -= 1) {
      const coin = this.flying[i];
      coin.t += dt * 2.4;
      const k = Math.min(1, coin.t);
      coin.x = coin.x + (coin.tx - coin.x) * k * 0.35;
      coin.y = coin.y + (coin.ty - coin.y) * k * 0.35;
      if (k >= 1 || dist(coin.x, coin.y, coin.tx, coin.ty) < 6) {
        this.flying.splice(i, 1);
        this.ringing.push({ x: coin.tx, y: coin.ty, t: 2.5 });
        for (const guard of guards) {
          if (dist(guard.x, guard.y, coin.tx, coin.ty) <= TOOLS.coinHearRadius) {
            guard.investigate(coin.tx, coin.ty);
          }
        }
      }
    }
    for (let i = this.ringing.length - 1; i >= 0; i -= 1) {
      this.ringing[i].t -= dt;
      if (this.ringing[i].t <= 0) this.ringing.splice(i, 1);
    }
  }
}
