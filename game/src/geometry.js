// Small 2D geometry helpers: rectangles, circles, line of sight and vision
// cones. Pure functions, no DOM, so the simulation can run headless in Node
// as well as in the browser.

/** True when point (px, py) lies inside rect {x, y, w, h}. */
export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

/** True when a circle (cx, cy, r) overlaps rect {x, y, w, h}. */
export function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/** Distance between two points. */
export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** Angle from (ax, ay) to (bx, by), in radians. */
export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Smallest absolute difference between two angles, in radians. */
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/**
 * True when the segment (x1,y1)-(x2,y2) crosses rect {x,y,w,h}.
 * Used for line of sight: a guard or camera sees the thief only when no
 * wall stands between them.
 */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
  const edges = [
    [rect.x, rect.y, rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h],
    [rect.x, rect.y + rect.h, rect.x, rect.y],
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    if (segmentsCross(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) return true;
  }
  return false;
}

function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = side(x3, y3, x4, y4, x1, y1);
  const d2 = side(x3, y3, x4, y4, x2, y2);
  const d3 = side(x1, y1, x2, y2, x3, y3);
  const d4 = side(x1, y1, x2, y2, x4, y4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function side(ax, ay, bx, by, px, py) {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

/**
 * True when the segment (x1,y1)-(x2,y2) is blocked by any wall in `walls`.
 */
export function lineBlocked(x1, y1, x2, y2, walls) {
  for (const wall of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, wall)) return true;
  }
  return false;
}

/**
 * True when point (px,py) sits inside the vision cone with apex (ox,oy),
 * facing `facing`, half-angle `halfAngle` and range `range`, with no wall
 * between apex and point.
 */
export function inVisionCone(px, py, ox, oy, facing, halfAngle, range, walls) {
  const d = dist(ox, oy, px, py);
  if (d > range) return false;
  if (d < 14) return true;
  if (angleDiff(angleTo(ox, oy, px, py), facing) > halfAngle) return false;
  return !lineBlocked(ox, oy, px, py, walls);
}
