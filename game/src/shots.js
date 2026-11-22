// Velvet Vault — deterministic screenshot scenes.
// One clear job: stage the four shots the entry submits, from the game's
// own code and no other source. A ?shot= URL picks a frozen moment:
// the title, a live room mid-heist, the caught moment, and the perfect
// heist. Every position, every alarm value and the clock are fixed, so
// the same URL always renders the same pixels.

import { createGame } from './engine.js';

function stagePlayShot() {
  // Level 1 mid-heist: Wren sneaking between the cases, a guard's cone
  // sweeping past her, the camera watching the Sapphire, alarm at 35%.
  const state = createGame(0, 0);
  state.screen = 'play';
  state.time = 42.5;
  state.player.x = 560;
  state.player.y = 440;
  state.player.sneaking = true;
  state.player.angle = Math.PI / 2;
  state.loot[0].taken = true; // one gold bar already pocketed
  state.loot[3].taken = true; // one painting already lifted
  state.score = 400;
  state.coins = 2;
  state.alarm = 35;
  state.maxAlarm = 35;
  // Freeze the patrols in readable places.
  state.guards[0].x = 420;
  state.guards[0].y = 150;
  state.guards[0].angle = 0;
  state.guards[0].state = 'patrol';
  state.guards[1].x = 830;
  state.guards[1].y = 650;
  state.guards[1].angle = Math.PI;
  state.guards[1].state = 'patrol';
  state.guards[1].waitTimer = 1.0;
  // A coin Wren just tossed, pulling the second guard's attention.
  state.thrownCoins.push({ x: 700, y: 620, ttl: 1.8 });
  state.guards[1].state = 'investigate';
  state.guards[1].targetX = 700;
  state.guards[1].targetY = 620;
  return state;
}

function stageCaughtShot() {
  // Level 2, the moment it all goes wrong: alarm at 100, a guard
  // closing in, Wren caught in the open.
  const state = createGame(1, 1650);
  state.screen = 'caught';
  state.time = 88.0;
  state.player.x = 640;
  state.player.y = 410;
  state.player.angle = -Math.PI / 2;
  state.alarm = 100;
  state.maxAlarm = 100;
  state.ghost = false;
  state.loot[0].taken = true;
  state.loot[2].taken = true;
  state.score = 450;
  state.guards[0].x = 700;
  state.guards[0].y = 150;
  state.guards[0].angle = Math.PI / 2;
  state.guards[1].x = 640;
  state.guards[1].y = 470;
  state.guards[1].angle = -Math.PI / 2;
  state.guards[1].state = 'chase';
  state.guards[2].x = 500;
  state.guards[2].y = 660;
  state.guards[2].angle = 0;
  return state;
}

function stageWinShot() {
  // The perfect heist: all three rooms cleared, Sapphire in hand.
  const state = createGame(2, 0);
  state.screen = 'win';
  state.time = 512.0;
  state.totalScore = 5840;
  state.sapphireTaken = true;
  state.exitOpen = true;
  state.loot.forEach((l) => {
    l.taken = true;
  });
  return state;
}

export function stateForShot(name) {
  if (name === 'start') {
    const state = createGame(0, 0);
    state.screen = 'title';
    state.time = 3.0;
    return state;
  }
  if (name === 'play') return stagePlayShot();
  if (name === 'caught') return stageCaughtShot();
  if (name === 'win') return stageWinShot();
  return null;
}
