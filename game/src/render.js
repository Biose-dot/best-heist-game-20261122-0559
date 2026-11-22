// Velvet Vault — the canvas renderer.
// One clear job: turn a game state into a picture. Floor and velvet
// carpet, vision cones in yellow (guards) and red (cameras), loot that
// glints, the Sapphire's glow, the HUD with its alarm meter, and every
// screen overlay. Nothing here changes the rules; it only shows them.

import { ALARM_GHOST_LIMIT, CANVAS_H, CANVAS_W, HUD_H } from './config.js';
import { LEVELS } from './levels.js';

function conePath(ctx, x, y, angle, halfAngle, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, time) {
  ctx.fillStyle = '#171226';
  ctx.fillRect(0, HUD_H, CANVAS_W, CANVAS_H - HUD_H);
  const tile = 64;
  for (let y = HUD_H; y < CANVAS_H; y += tile) {
    for (let x = 0; x < CANVAS_W; x += tile) {
      const checker = ((x / tile + y / tile) % 2 === 0) ? '#1b1530' : '#191329';
      ctx.fillStyle = checker;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  // Velvet carpet runners down the middle of each room.
  ctx.fillStyle = '#5d1220';
  ctx.fillRect(600, HUD_H, 80, CANVAS_H - HUD_H);
  ctx.fillStyle = '#7a1a2c';
  ctx.fillRect(608, HUD_H, 64, CANVAS_H - HUD_H);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.strokeRect(606, HUD_H, 68, CANVAS_H - HUD_H);
  // Gold skirting around the room.
  ctx.strokeStyle = '#8a6d2f';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, HUD_H + 4, CANVAS_W - 8, CANVAS_H - HUD_H - 8);
  void time;
}

function drawObstacles(ctx, obstacles) {
  for (const o of obstacles) {
    if (o.kind === 'wall') {
      ctx.fillStyle = '#2c2a3d';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
    } else if (o.kind === 'crate') {
      ctx.fillStyle = '#4a3220';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = '#7a5a34';
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4);
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(o.x + o.w, o.y + o.h);
      ctx.moveTo(o.x + o.w, o.y);
      ctx.lineTo(o.x, o.y + o.h);
      ctx.stroke();
    } else {
      // Glass display case: see-through, gold frame, soft glint.
      ctx.fillStyle = 'rgba(150, 200, 230, 0.13)';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 3;
      ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(o.x + 8, o.y + o.h - 8);
      ctx.lineTo(o.x + o.w * 0.4, o.y + 8);
      ctx.stroke();
    }
  }
}

function drawExit(ctx, level, open, time) {
  const ex = level.exit;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.fillStyle = open ? `rgba(46, 204, 113, ${0.55 + pulse * 0.3})` : '#3a2c2c';
  ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
  ctx.strokeStyle = open ? '#2ecc71' : '#8a6d2f';
  ctx.lineWidth = 3;
  ctx.strokeRect(ex.x, ex.y, ex.w, ex.h);
  ctx.fillStyle = open ? '#eafff0' : '#c9a227';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', ex.x + ex.w / 2, ex.y + ex.h / 2 - 4);
  ctx.font = '11px Georgia, serif';
  ctx.fillText(open ? 'OPEN' : 'LOCKED', ex.x + ex.w / 2, ex.y + ex.h / 2 + 14);
}

function drawSapphire(ctx, state) {
  const s = state.level.sapphire;
  if (state.sapphireTaken) return;
  const pulse = 0.6 + 0.4 * Math.sin(state.time * 4);
  const glow = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, 70);
  glow.addColorStop(0, `rgba(80, 220, 255, ${0.5 * pulse})`);
  glow.addColorStop(1, 'rgba(80, 220, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 70, 0, Math.PI * 2);
  ctx.fill();
  // Pedestal.
  ctx.fillStyle = '#3a3348';
  ctx.fillRect(s.x - 18, s.y + 6, 36, 22);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.strokeRect(s.x - 18, s.y + 6, 36, 22);
  // The Star Sapphire itself.
  ctx.fillStyle = '#4fd8ff';
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - 16);
  ctx.lineTo(s.x + 12, s.y);
  ctx.lineTo(s.x, s.y + 12);
  ctx.lineTo(s.x - 12, s.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d8f6ff';
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - 16);
  ctx.lineTo(s.x + 12, s.y);
  ctx.lineTo(s.x, s.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#bfefff';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('STAR SAPPHIRE', s.x, s.y - 26);
  if (state.channeling) {
    ctx.strokeStyle = '#4fd8ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 30, -Math.PI / 2, -Math.PI / 2 + (state.channelProgress / 2) * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#dff8ff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('LIFTING…', s.x, s.y + 46);
  }
}

function drawLoot(ctx, state) {
  for (const loot of state.loot) {
    if (loot.taken) continue;
    const twinkle = 0.7 + 0.3 * Math.sin(state.time * 3 + loot.x);
    if (loot.kind === 'gold') {
      ctx.fillStyle = `rgba(255, 210, 63, ${twinkle})`;
      ctx.fillRect(loot.x - 11, loot.y - 6, 22, 12);
      ctx.strokeStyle = '#8a6d2f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(loot.x - 11, loot.y - 6, 22, 12);
    } else if (loot.kind === 'emerald') {
      ctx.fillStyle = `rgba(46, 204, 113, ${twinkle})`;
      ctx.beginPath();
      ctx.moveTo(loot.x, loot.y - 12);
      ctx.lineTo(loot.x + 10, loot.y);
      ctx.lineTo(loot.x, loot.y + 12);
      ctx.lineTo(loot.x - 10, loot.y);
      ctx.closePath();
      ctx.fill();
    } else {
      // Painting on the wall: gilt frame, tiny landscape.
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(loot.x - 16, loot.y - 12, 32, 24);
      ctx.fillStyle = '#274b73';
      ctx.fillRect(loot.x - 12, loot.y - 8, 24, 16);
      ctx.fillStyle = '#e8d27a';
      ctx.beginPath();
      ctx.arc(loot.x - 4, loot.y - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2e7d4f';
      ctx.fillRect(loot.x - 12, loot.y + 3, 24, 5);
    }
  }
}

function drawCones(ctx, state) {
  for (const guard of state.guards) {
    conePath(ctx, guard.x, guard.y, guard.angle, 0.61, 265);
    ctx.fillStyle = guard.state === 'chase' ? 'rgba(255, 80, 60, 0.20)' : 'rgba(255, 214, 64, 0.16)';
    ctx.fill();
    ctx.strokeStyle = guard.state === 'chase' ? 'rgba(255, 80, 60, 0.5)' : 'rgba(255, 214, 64, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (const cam of state.cameras) {
    if (state.time < cam.disabledUntil) continue;
    conePath(ctx, cam.x, cam.y, cam.angle, 0.5, 250);
    ctx.fillStyle = 'rgba(255, 60, 60, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawCameras(ctx, state) {
  for (const cam of state.cameras) {
    const disabled = state.time < cam.disabledUntil;
    ctx.fillStyle = disabled ? '#555' : '#c0392b';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = disabled ? '#888' : '#ff5b4d';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 6, cam.y + Math.sin(cam.angle) * 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (disabled) {
      ctx.fillStyle = '#dff8ff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMP ' + Math.ceil(cam.disabledUntil - state.time) + 's', cam.x, cam.y - 16);
    }
  }
}

function drawGuards(ctx, state) {
  for (const guard of state.guards) {
    ctx.fillStyle = '#232a3d';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = guard.state === 'chase' ? '#ff5040' : '#c9a227';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Facing tick and cap brim.
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 19, guard.y + Math.sin(guard.angle) * 19);
    ctx.stroke();
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 5, 0, Math.PI * 2);
    ctx.fill();
    // State mark: ! chasing, ? investigating.
    if (guard.state === 'chase' || guard.state === 'investigate') {
      ctx.fillStyle = guard.state === 'chase' ? '#ff5040' : '#ffd640';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(guard.state === 'chase' ? '!' : '?', guard.x, guard.y - 22);
    }
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  const alpha = p.sneaking ? 0.85 : 1;
  ctx.globalAlpha = alpha;
  // Cloak shadow and body.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x + 3, p.y + 5, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6a3fb5';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood and face direction.
  ctx.fillStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5e6c8';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 9, p.y + Math.sin(p.angle) * 9, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e8d7ff';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('WREN', p.x, p.y - 20);
  if (p.sneaking) {
    ctx.fillStyle = '#b9a8d8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('sneaking', p.x, p.y + 28);
  }
  if (state.channeling) {
    ctx.strokeStyle = '#4fd8ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 22, -Math.PI / 2, -Math.PI / 2 + (state.channelProgress / 2) * Math.PI * 2);
    ctx.stroke();
  }
}

function drawThrownCoins(ctx, state) {
  for (const c of state.thrownCoins) {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d2f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 210, 63, 0.6)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 12 + (2.2 - c.ttl) * 14, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function alarmColor(alarm) {
  if (alarm < 40) return '#2ecc71';
  if (alarm < 70) return '#f1c40f';
  return '#e74c3c';
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#0e0b18';
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.strokeStyle = '#8a6d2f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H);
  ctx.lineTo(CANVAS_W, HUD_H);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8d7a0';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('VELVET VAULT', 16, 28);
  ctx.fillStyle = '#9d8fc0';
  ctx.font = '13px Georgia, serif';
  ctx.fillText(`Level ${state.levelIndex + 1} · ${state.level.name}`, 16, 48);

  // Alarm meter.
  const meterX = 330;
  const meterW = 300;
  ctx.fillStyle = '#c9c9c9';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('ALARM', meterX, 22);
  ctx.fillStyle = '#222';
  roundRect(ctx, meterX, 30, meterW, 20, 5);
  ctx.fill();
  const flash = state.alarm >= 70 ? 0.6 + 0.4 * Math.sin(state.time * 10) : 1;
  ctx.globalAlpha = flash;
  ctx.fillStyle = alarmColor(state.alarm);
  const fillW = Math.max(0, (state.alarm / 100) * meterW);
  if (fillW > 0) {
    roundRect(ctx, meterX, 30, fillW, 20, 5);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(state.alarm) + '%', meterX + meterW / 2, 45);
  ctx.textAlign = 'left';
  ctx.fillStyle = state.alarm > ALARM_GHOST_LIMIT ? '#e74c3c' : '#2ecc71';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(state.ghost ? 'GHOST ✓' : 'GHOST ✗', meterX + meterW + 12, 45);

  // Score, loot, tools, timer.
  const right = CANVAS_W - 16;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText('SCORE ' + (state.totalScore + state.score), right, 26);
  const taken = state.loot.filter((l) => l.taken).length;
  ctx.fillStyle = '#c9c9c9';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(
    `Loot ${taken}/${state.loot.length}   Coins ${state.coins}   EMP ${state.emps}   ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`,
    right,
    48,
  );

  if (state.messageTimer > 0 && state.message) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(14, 11, 24, 0.85)';
    const w = ctx.measureText(state.message).width + 32;
    roundRect(ctx, CANVAS_W / 2 - w / 2, HUD_H + 10, w, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(state.message, CANVAS_W / 2, HUD_H + 30);
  }
}

function drawControlsHint(ctx) {
  ctx.fillStyle = 'rgba(14, 11, 24, 0.8)';
  ctx.fillRect(0, CANVAS_H - 26, CANVAS_W, 26);
  ctx.fillStyle = '#9d8fc0';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'WASD / Arrows — move    Shift — sneak    Click — toss a coin    Q — EMP (cameras off 10s)    P — pause    M — mute',
    CANVAS_W / 2,
    CANVAS_H - 9,
  );
}

function drawPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10, 7, 18, 0.82)';
  ctx.fillRect(0, HUD_H, CANVAS_W, CANVAS_H - HUD_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, CANVAS_W / 2, 300);
  ctx.fillStyle = '#e8e0ff';
  ctx.font = '17px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, CANVAS_W / 2, 350 + i * 30));
}

function drawTitle(ctx, state) {
  drawFloor(ctx, state.time);
  ctx.fillStyle = 'rgba(10, 7, 18, 0.78)';
  ctx.fillRect(0, HUD_H, CANVAS_W, CANVAS_H - HUD_H);
  ctx.fillStyle = '#c9a227';
  ctx.font = 'bold 76px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('VELVET VAULT', CANVAS_W / 2, 250);
  ctx.fillStyle = '#b9a8d8';
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('— A Midnight Heist —', CANVAS_W / 2, 292);
  ctx.fillStyle = '#e8e0ff';
  ctx.font = '17px Georgia, serif';
  ctx.fillText('Wren the thief has one night to lift the Star Sapphire from three guarded rooms.', CANVAS_W / 2, 350);
  ctx.fillText('Guards watch in yellow cones, cameras sweep in red. Stay out of sight,', CANVAS_W / 2, 378);
  ctx.fillText('toss coins to pull patrols away, and never let the alarm reach 100%.', CANVAS_W / 2, 406);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 18px system-ui, sans-serif';
  const blink = 0.6 + 0.4 * Math.sin(state.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillText('Press ENTER or click to begin the heist', CANVAS_W / 2, 480);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#9d8fc0';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('WASD / Arrows move · Shift sneak · Click toss a coin · Q EMP · P pause · M mute', CANVAS_W / 2, 530);
  ctx.fillText('Hold still beside the Star Sapphire for 2 seconds to lift it, then reach the EXIT.', CANVAS_W / 2, 556);
}

export function renderGame(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (state.screen === 'title') {
    drawTitle(ctx, state);
    return;
  }
  drawFloor(ctx, state.time);
  drawCones(ctx, state);
  drawObstacles(ctx, state.level.obstacles);
  drawExit(ctx, state.level, state.exitOpen, state.time);
  drawSapphire(ctx, state);
  drawLoot(ctx, state);
  drawThrownCoins(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawPlayer(ctx, state);
  drawHud(ctx, state);
  drawControlsHint(ctx);

  if (state.screen === 'intro') {
    ctx.fillStyle = 'rgba(10, 7, 18, 0.72)';
    ctx.fillRect(0, HUD_H, CANVAS_W, CANVAS_H - HUD_H);
    ctx.fillStyle = '#c9a227';
    ctx.font = 'bold 46px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${state.levelIndex + 1}: ${state.level.name}`, CANVAS_W / 2, 300);
    ctx.fillStyle = '#b9a8d8';
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText(state.level.subtitle, CANVAS_W / 2, 338);
    ctx.fillStyle = '#e8e0ff';
    ctx.font = '17px Georgia, serif';
    const words = state.level.intro.split(' ');
    const lines = [''];
    for (const w of words) {
      if ((lines[lines.length - 1] + ' ' + w).trim().length > 78) lines.push(w);
      else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim();
    }
    lines.forEach((line, i) => ctx.fillText(line, CANVAS_W / 2, 400 + i * 28));
    const blink = 0.6 + 0.4 * Math.sin(state.time * 4);
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('Press ENTER to begin', CANVAS_W / 2, 500 + lines.length * 8);
    ctx.globalAlpha = 1;
  } else if (state.screen === 'paused') {
    drawPanel(ctx, 'PAUSED', ['The museum holds its breath.', 'Press P to keep moving.'], '#c9a227');
  } else if (state.screen === 'caught') {
    drawPanel(
      ctx,
      'CAUGHT!',
      [
        'A guard grabbed Wren by the collar — the Sapphire stays in its case.',
        `Level ${state.levelIndex + 1}: ${state.level.name} · alarm hit 100%`,
        'Press ENTER to try the room again.',
      ],
      '#e74c3c',
    );
  } else if (state.screen === 'levelClear') {
    drawPanel(
      ctx,
      'CLEAN GETAWAY',
      [
        `${state.level.name} cleared — loot ${state.score} · time bonus ${state.timeBonus} · ghost bonus ${state.ghostBonus}`,
        `Level score ${state.levelScore} · total ${state.totalScore}`,
        'Press ENTER for the next room.',
      ],
      '#2ecc71',
    );
  } else if (state.screen === 'win') {
    drawPanel(
      ctx,
      'THE PERFECT HEIST',
      [
        'Three rooms, one Sapphire, no alarms that mattered. Wren vanishes into the night.',
        `Final score ${state.totalScore}`,
        'Press ENTER to play again.',
      ],
      '#ffd23f',
    );
  }
}

export { LEVELS };
