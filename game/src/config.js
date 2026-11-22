// Velvet Vault — A Midnight Heist: tuning constants.
// One clear job: every number the game balances on lives here, so a
// designer can retune the heist without touching the engine or renderer.

export const CANVAS_W = 1280;
export const CANVAS_H = 800;
export const HUD_H = 64;

export const PLAYER_RADIUS = 14;
export const PLAYER_WALK_SPEED = 168;
export const PLAYER_SNEAK_SPEED = 88;
export const PLAYER_SNEAK_VISION_FACTOR = 0.62; // guards see a sneaking thief much later

export const GUARD_RADIUS = 15;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_INVESTIGATE_SPEED = 96;
export const GUARD_CHASE_SPEED = 148;
export const GUARD_VIEW_RANGE = 265;
export const GUARD_VIEW_HALF_ANGLE = 0.61; // ~35 degrees each side
export const GUARD_HEAR_RADIUS = 150; // running footsteps heard this far
export const GUARD_LOSE_SIGHT_SECONDS = 3.0;
export const GUARD_SEARCH_SECONDS = 2.4;

export const CAMERA_VIEW_RANGE = 250;
export const CAMERA_VIEW_HALF_ANGLE = 0.5;
export const CAMERA_SWEEP_SPEED = 0.55; // radians per second

export const ALARM_RISE_PER_SECOND = 34; // while any eye is on Wren
export const ALARM_RISE_CLOSE_BONUS = 26; // extra when the watcher is near
export const ALARM_RISE_CAMERA = 22; // cameras raise it more slowly
export const ALARM_FALL_PER_SECOND = 11; // cools down while unseen
export const ALARM_CAUGHT = 100;
export const ALARM_GHOST_LIMIT = 40; // never above this and the level is a Ghost

export const COIN_COUNT_PER_LEVEL = 3;
export const COIN_NOISE_RADIUS = 330; // guards inside this ring investigate the clink
export const COIN_THROW_RANGE = 420; // coins only fly this far from Wren

export const EMP_COUNT_PER_LEVEL = 1;
export const EMP_DISABLE_SECONDS = 10;

export const SAPPHIRE_CHANNEL_SECONDS = 2.0;
export const SAPPHIRE_RADIUS = 46;

export const LOOT_VALUES = { gold: 150, emerald: 300, painting: 250, sapphire: 1000 };
export const GHOST_BONUS = 500;
export const TIME_BONUS_PER_SECOND = 10;

export const LEVEL_SEEDS = [41022, 77031, 99117];
