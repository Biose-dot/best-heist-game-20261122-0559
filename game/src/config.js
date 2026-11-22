// Game constants and the three levels. Every level is data: walls are
// rectangles, guards walk waypoint loops, cameras sweep from a wall mount,
// loot waits to be lifted and the exit waits at the far end. Coordinates
// live in the 1280x800 canvas; the top 56 pixels are the HUD bar and the
// playfield runs from y=56 to y=800.

export const VIEW = { width: 1280, height: 800 };
export const HUD_H = 56;
export const PLAY = { x: 0, y: HUD_H, width: 1280, height: 800 - HUD_H };

export const PLAYER = {
  radius: 12,
  walkSpeed: 178,
  sneakSpeed: 96,
  /** Seconds of standing still beside the target to crack its case. */
  channelSeconds: 2.0,
  /** Running is heard this far away by guards. */
  noiseRadius: 95,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 56,
  chaseSpeed: 122,
  visionRange: 178,
  /** Half-angle of the vision cone, radians (~35 degrees). */
  visionHalfAngle: 0.61,
  /** Seconds of being seen before a guard gives chase. */
  spotSeconds: 0.7,
  /** How long a guard waits at each waypoint. */
  pauseSeconds: 1.2,
};

export const CAMERA = {
  range: 228,
  /** Half-angle of the camera cone, radians (~30 degrees). */
  halfAngle: 0.52,
  /** Seconds a camera stays blind after an EMP. */
  empSeconds: 10,
};

export const ALARM = {
  /** Alarm points per second while a guard cone holds the thief. */
  guardRate: 55,
  /** Alarm points per second while a camera cone holds the thief. */
  cameraRate: 72,
  /** Alarm points per second while a guard is chasing the thief. */
  chaseRate: 88,
  /** Alarm points drained per second while unseen. */
  decayPerSecond: 6,
  /** Alarm level above which the run loses its Ghost bonus. */
  ghostLimit: 40,
};

export const TOOLS = {
  coinsPerLevel: 3,
  empPerLevel: 1,
  /** Guards this far from a thrown coin go to look at it. */
  coinHearRadius: 215,
};

export const LOOT_KIND = {
  sapphire: { label: 'Star Sapphire', value: 5000, color: '#7dd3fc', target: true },
  gold: { label: 'Gold Bars', value: 1000, color: '#fbbf24', target: false },
  gem: { label: 'Emerald', value: 1500, color: '#34d399', target: false },
  painting: { label: 'Velvet Portrait', value: 2000, color: '#f472b6', target: false },
};

/** Par time per level, in seconds: beat it for a time bonus. */
export const PAR_SECONDS = [90, 120, 150];

/** Fixed seed per level: the same seed always builds the same level. */
export const LEVEL_SEEDS = [1337, 4242, 9001];

function border() {
  return [
    { x: 0, y: PLAY.y, w: 1280, h: 14 },
    { x: 0, y: 800 - 14, w: 1280, h: 14 },
    { x: 0, y: PLAY.y, w: 14, h: PLAY.height },
    { x: 1280 - 14, y: PLAY.y, w: 14, h: PLAY.height },
  ];
}

export const LEVELS = [
  {
    name: 'The Gallery',
    brief: 'Lift the Star Sapphire from its case, then slip out the east door.',
    walls: [
      ...border(),
      { x: 300, y: 180, w: 40, h: 180 },
      { x: 940, y: 180, w: 40, h: 180 },
      { x: 560, y: 330, w: 160, h: 110 },
      { x: 120, y: 430, w: 220, h: 26 },
      { x: 940, y: 430, w: 220, h: 26 },
      { x: 600, y: 570, w: 80, h: 60 },
    ],
    playerStart: { x: 90, y: 700 },
    exit: { x: 1140, y: 690, w: 80, h: 56 },
    guards: [
      { waypoints: [[180, 250], [520, 250], [520, 380], [180, 380]], speed: 56 },
      { waypoints: [[1000, 200], [1180, 200], [1180, 380], [1000, 380]], speed: 56 },
    ],
    cameras: [
      { x: 300, y: 74, baseAngle: Math.PI / 2, sweep: 0.62, speed: 0.45 },
    ],
    loot: [
      { kind: 'sapphire', x: 640, y: 300 },
      { kind: 'gold', x: 220, y: 650 },
      { kind: 'painting', x: 1060, y: 150 },
    ],
  },
  {
    name: 'The Vault Hall',
    brief: 'Three guards, two cameras, one very heavy vault door. Take the Sapphire and the side loot.',
    walls: [
      ...border(),
      { x: 240, y: 160, w: 26, h: 300 },
      { x: 1014, y: 160, w: 26, h: 300 },
      { x: 420, y: 560, w: 440, h: 26 },
      { x: 420, y: 150, w: 26, h: 180 },
      { x: 834, y: 150, w: 26, h: 180 },
      { x: 560, y: 330, w: 160, h: 110 },
      { x: 180, y: 620, w: 200, h: 26 },
      { x: 900, y: 620, w: 200, h: 26 },
    ],
    playerStart: { x: 90, y: 700 },
    exit: { x: 1140, y: 690, w: 80, h: 56 },
    guards: [
      { waypoints: [[330, 250], [500, 250], [500, 500], [330, 500]], speed: 60 },
      { waypoints: [[950, 180], [950, 480], [1150, 480], [1150, 180]], speed: 60 },
      { waypoints: [[120, 600], [120, 480], [330, 480], [330, 600]], speed: 58 },
    ],
    cameras: [
      { x: 300, y: 74, baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.5 },
      { x: 1266, y: 420, baseAngle: Math.PI, sweep: 0.55, speed: 0.4 },
    ],
    loot: [
      { kind: 'sapphire', x: 640, y: 300 },
      { kind: 'gold', x: 200, y: 680 },
      { kind: 'gem', x: 1080, y: 130 },
      { kind: 'painting', x: 640, y: 700 },
    ],
  },
  {
    name: 'The Penthouse',
    brief: 'The full crew is on tonight. Four guards, three cameras, five prizes. Make it clean.',
    walls: [
      ...border(),
      { x: 200, y: 150, w: 26, h: 240 },
      { x: 1054, y: 150, w: 26, h: 240 },
      { x: 200, y: 520, w: 26, h: 200 },
      { x: 1054, y: 520, w: 26, h: 200 },
      { x: 420, y: 150, w: 440, h: 26 },
      { x: 420, y: 600, w: 440, h: 26 },
      { x: 560, y: 330, w: 160, h: 110 },
      { x: 330, y: 420, w: 120, h: 26 },
      { x: 830, y: 420, w: 120, h: 26 },
    ],
    playerStart: { x: 90, y: 700 },
    exit: { x: 1140, y: 690, w: 80, h: 56 },
    guards: [
      { waypoints: [[300, 250], [500, 250], [500, 480], [300, 480]], speed: 64 },
      { waypoints: [[980, 200], [980, 480], [1160, 480], [1160, 200]], speed: 64 },
      { waypoints: [[120, 640], [120, 460], [300, 460], [300, 640]], speed: 62 },
      { waypoints: [[880, 560], [1000, 560], [1000, 700], [880, 700]], speed: 62 },
    ],
    cameras: [
      { x: 300, y: 74, baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.55 },
      { x: 14, y: 420, baseAngle: 0, sweep: 0.55, speed: 0.45 },
      { x: 1266, y: 420, baseAngle: Math.PI, sweep: 0.55, speed: 0.45 },
    ],
    loot: [
      { kind: 'sapphire', x: 640, y: 300 },
      { kind: 'gold', x: 150, y: 680 },
      { kind: 'gem', x: 1080, y: 130 },
      { kind: 'painting', x: 120, y: 130 },
      { kind: 'gem', x: 1120, y: 660 },
    ],
  },
];
