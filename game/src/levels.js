// Velvet Vault — the three rooms of the heist.
// One clear job: hand-authored level layouts. Each level is a room Wren
// must cross: walls and crates that block sight, glass cases that do not,
// guard patrols, sweeping cameras, bonus loot, the Star Sapphire and the
// exit door that only opens once the Sapphire is taken.
//
// Coordinates are canvas pixels (1280x800, HUD occupies the top 64).
// Obstacle kinds: "wall" blocks movement and sight, "crate" blocks
// movement and sight, "case" is glass — it blocks movement, not sight.

export const LEVELS = [
  {
    name: 'The Gallery',
    subtitle: 'Midnight at the Marlowe Museum',
    intro:
      'Two guards walk the marble floor. One camera watches the Sapphire. ' +
      'Slip between the display cases, lift the bonus loot, and be gone.',
    parSeconds: 150,
    entry: { x: 90, y: 730 },
    exit: { x: 1204, y: 250, w: 56, h: 96 },
    sapphire: { x: 1140, y: 132 },
    obstacles: [
      { x: 300, y: 210, w: 180, h: 64, kind: 'case' },
      { x: 700, y: 210, w: 180, h: 64, kind: 'case' },
      { x: 300, y: 480, w: 180, h: 64, kind: 'case' },
      { x: 700, y: 480, w: 180, h: 64, kind: 'case' },
      { x: 560, y: 330, w: 120, h: 90, kind: 'crate' },
      { x: 170, y: 330, w: 60, h: 150, kind: 'wall' },
      { x: 1050, y: 330, w: 60, h: 150, kind: 'wall' },
      { x: 60, y: 130, w: 150, h: 26, kind: 'wall' },
    ],
    guards: [
      {
        // Top loop, kept clear of the central pedestal crate.
        waypoints: [
          [250, 150],
          [640, 150],
          [640, 300],
          [250, 300],
        ],
        waitSeconds: 1.2,
      },
      {
        // Bottom loop, kept clear of the pedestal and the cases.
        waypoints: [
          [640, 650],
          [1030, 650],
          [1030, 450],
          [640, 450],
        ],
        waitSeconds: 1.6,
      },
    ],
    cameras: [{ x: 1140, y: 96, baseAngle: 1.35, sweep: 0.85, phase: 0 }],
    loot: [
      { x: 320, y: 660, kind: 'gold' },
      { x: 960, y: 170, kind: 'gold' },
      { x: 640, y: 740, kind: 'emerald' },
      { x: 44, y: 210, kind: 'painting' },
      { x: 1236, y: 620, kind: 'painting' },
    ],
  },
  {
    name: 'The Vault Hall',
    subtitle: 'The Meridian Bank, after hours',
    intro:
      'Three guards, two cameras, and long corridors with nowhere to hide. ' +
      'Toss a coin to pull a patrol away, or slip through the gaps in the walls.',
    parSeconds: 180,
    entry: { x: 90, y: 730 },
    exit: { x: 1204, y: 250, w: 56, h: 96 },
    sapphire: { x: 1140, y: 132 },
    obstacles: [
      { x: 0, y: 300, w: 420, h: 26, kind: 'wall' },
      { x: 560, y: 300, w: 720, h: 26, kind: 'wall' },
      { x: 0, y: 520, w: 580, h: 26, kind: 'wall' },
      { x: 720, y: 520, w: 560, h: 26, kind: 'wall' },
      { x: 300, y: 150, w: 90, h: 90, kind: 'crate' },
      { x: 900, y: 620, w: 90, h: 90, kind: 'crate' },
      { x: 620, y: 380, w: 80, h: 80, kind: 'crate' },
      { x: 1050, y: 150, w: 26, h: 110, kind: 'wall' },
    ],
    guards: [
      {
        // Top lane, above the crate.
        waypoints: [
          [200, 120],
          [1100, 120],
        ],
        waitSeconds: 1.0,
      },
      {
        // Middle lane, below the central pillar.
        waypoints: [
          [1100, 480],
          [200, 480],
        ],
        waitSeconds: 1.4,
      },
      {
        // Bottom lane, below the crate.
        waypoints: [
          [300, 740],
          [1000, 740],
        ],
        waitSeconds: 0.8,
      },
    ],
    cameras: [
      { x: 430, y: 326, baseAngle: Math.PI / 2, sweep: 1.0, phase: 0 },
      { x: 850, y: 494, baseAngle: -Math.PI / 2, sweep: 1.0, phase: 1.6 },
    ],
    loot: [
      { x: 150, y: 700, kind: 'gold' },
      { x: 1130, y: 700, kind: 'gold' },
      { x: 640, y: 410, kind: 'emerald' },
      { x: 44, y: 150, kind: 'painting' },
      { x: 1236, y: 150, kind: 'painting' },
    ],
  },
  {
    name: 'The Penthouse',
    subtitle: 'The collector keeps the Sapphire upstairs',
    intro:
      'The last room. Three guards cross the open floor and three cameras ' +
      'sweep the terrace. Take the Sapphire, reach the service door, vanish.',
    parSeconds: 210,
    entry: { x: 90, y: 730 },
    exit: { x: 1204, y: 250, w: 56, h: 96 },
    sapphire: { x: 1140, y: 132 },
    obstacles: [
      { x: 300, y: 200, w: 200, h: 70, kind: 'crate' },
      { x: 780, y: 200, w: 200, h: 70, kind: 'crate' },
      { x: 540, y: 420, w: 200, h: 90, kind: 'crate' },
      { x: 200, y: 600, w: 100, h: 80, kind: 'crate' },
      { x: 980, y: 600, w: 100, h: 80, kind: 'crate' },
      { x: 880, y: 330, w: 26, h: 220, kind: 'wall' },
      { x: 60, y: 130, w: 150, h: 26, kind: 'wall' },
    ],
    guards: [
      {
        waypoints: [
          [250, 140],
          [1030, 140],
          [1030, 300],
          [250, 300],
        ],
        waitSeconds: 1.0,
      },
      {
        // Centre column, stopping above the dining table crate.
        waypoints: [
          [640, 760],
          [640, 560],
        ],
        waitSeconds: 1.2,
      },
      {
        // Right loop, kept below the dividing wall.
        waypoints: [
          [1100, 700],
          [1100, 560],
          [800, 560],
          [800, 700],
        ],
        waitSeconds: 1.5,
      },
    ],
    cameras: [
      { x: 150, y: 96, baseAngle: 0.9, sweep: 1.1, phase: 0 },
      { x: 1140, y: 96, baseAngle: 1.35, sweep: 0.85, phase: 2.1 },
      { x: 640, y: 764, baseAngle: -Math.PI / 2, sweep: 1.0, phase: 1.1 },
    ],
    loot: [
      { x: 200, y: 720, kind: 'gold' },
      { x: 1080, y: 720, kind: 'gold' },
      { x: 640, y: 150, kind: 'emerald' },
      { x: 44, y: 400, kind: 'painting' },
      { x: 1236, y: 400, kind: 'painting' },
    ],
  },
];
