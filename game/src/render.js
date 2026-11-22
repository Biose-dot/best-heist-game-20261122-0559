// Everything the eye sees: the marble floor, the walls, the vision cones,
// the loot, the thief and the guards, the HUD with its alarm meter, and
// every screen (title, pause, caught, level complete, getaway). All drawing
// is canvas 2D with flat colours and gradients — no images, no fonts from
// the network — so a screenshot is a true render of the game's own code.

import { ALARM, CAMERA, GUARD, HUD_H, LEVELS, LOOT_KIND, PAR_SECONDS, PLAY, PLAYER, VIEW } from './config.js';

const INK = '#f5e9c8';
const DIM = '#a89ec4';
const GOLD = '#d4a94e';
const PANEL = 'rgba(12, 8, 24, 0.92)';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = '600', font = 'system-ui, sans-serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function serif(ctx, str, x, y, size, color, align = 'left', weight = '700') {
  text(ctx, str, x, y, size, color, align, weight, 'Georgia, "Times New Roman", serif');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatMoney(n) {
  return `$${n.toLocaleString('en-US')}`;
}

/** The whole playfield: floor, cones, walls, loot, exit, actors. */
export function drawWorld(ctx, world, now) {
  drawFloor(ctx);
  drawCones(ctx, world);
  drawWalls(ctx, world);
  drawExit(ctx, world, now);
  drawLoot(ctx, world, now);
  drawCoins(ctx, world, now);
  drawGuards(ctx, world, now);
  drawCameras(ctx, world);
  drawPlayer(ctx, world, now);
  drawChannelRing(ctx, world);
  drawHud(ctx, world);
  drawAlarmVignette(ctx, world, now);
}

function drawFloor(ctx) {
  ctx.fillStyle = '#14101f';
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
  const tile = 64;
  for (let y = HUD_H; y < VIEW.height; y += tile) {
    for (let x = 0; x < VIEW.width; x += tile) {
      const even = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = even ? '#1c162e' : '#211a38';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.strokeStyle = 'rgba(212, 169, 78, 0.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= VIEW.width; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, HUD_H);
    ctx.lineTo(x, VIEW.height);
    ctx.stroke();
  }
  for (let y = HUD_H; y <= VIEW.height; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW.width, y);
    ctx.stroke();
  }
  // Velvet carpet runner down the middle of the hall.
  ctx.fillStyle = 'rgba(120, 20, 44, 0.35)';
  ctx.fillRect(600, HUD_H, 80, VIEW.height - HUD_H);
  ctx.strokeStyle = 'rgba(212, 169, 78, 0.35)';
  ctx.strokeRect(600, HUD_H, 80, VIEW.height - HUD_H);
}

function drawCone(ctx, x, y, facing, halfAngle, range, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCones(ctx, world) {
  for (const camera of world.cameras) {
    if (camera.offline) continue;
    drawCone(ctx, camera.x, camera.y, camera.angle, CAMERA.halfAngle, CAMERA.range, 'rgba(239, 68, 68, 0.16)');
  }
  for (const guard of world.guards) {
    const alert = guard.alertness();
    const color = guard.state === 'chase'
      ? 'rgba(239, 68, 68, 0.26)'
      : alert > 0.3
        ? 'rgba(249, 115, 22, 0.22)'
        : 'rgba(250, 204, 21, 0.17)';
    drawCone(ctx, guard.x, guard.y, guard.facing, GUARD.visionHalfAngle, GUARD.visionRange, color);
  }
}

function drawWalls(ctx, world) {
  for (const wall of world.walls) {
    ctx.fillStyle = '#2c2440';
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(wall.x + 1, wall.y + 1, wall.w - 2, wall.h - 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(wall.x, wall.y, wall.w, 4);
  }
}

function drawExit(ctx, world, now) {
  const e = world.exit;
  const open = world.targetTaken;
  const pulse = 0.55 + Math.sin(now * 3) * 0.2;
  ctx.fillStyle = open ? `rgba(34, 197, 94, ${pulse})` : 'rgba(34, 197, 94, 0.18)';
  roundRect(ctx, e.x, e.y, e.w, e.h, 8);
  ctx.fill();
  ctx.strokeStyle = open ? '#4ade80' : '#166534';
  ctx.lineWidth = 3;
  roundRect(ctx, e.x, e.y, e.w, e.h, 8);
  ctx.stroke();
  text(ctx, 'EXIT', e.x + e.w / 2, e.y + e.h / 2 - 8, 15, open ? '#dcfce7' : '#86efac', 'center', '800');
  text(ctx, open ? 'OPEN' : 'LOCKED', e.x + e.w / 2, e.y + e.h / 2 + 12, 10, open ? '#dcfce7' : '#4ade80', 'center', '700');
}

function drawLoot(ctx, world, now) {
  for (const item of world.loot) {
    if (item.taken) continue;
    const kind = LOOT_KIND[item.kind];
    const glint = 0.65 + Math.sin(now * 4 + item.sparkle) * 0.35;
    if (item.kind === 'sapphire') {
      // The prize, in a glass case on a pedestal, lit so it draws the eye.
      const glow = ctx.createRadialGradient(item.x, item.y, 4, item.x, item.y, 74);
      glow.addColorStop(0, `rgba(125, 211, 252, ${0.28 * glint + 0.1})`);
      glow.addColorStop(1, 'rgba(125, 211, 252, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 74, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b2f5e';
      ctx.fillRect(item.x - 26, item.y - 20, 52, 40);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.strokeRect(item.x - 26, item.y - 20, 52, 40);
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = kind.color;
      ctx.globalAlpha = glint;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2;
      ctx.strokeRect(-11, -11, 22, 22);
      ctx.restore();
      text(ctx, 'STAR SAPPHIRE', item.x, item.y - 34, 11, '#bae6fd', 'center', '800');
    } else if (item.kind === 'painting') {
      ctx.fillStyle = '#4a2c3a';
      ctx.fillRect(item.x - 20, item.y - 14, 40, 28);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.strokeRect(item.x - 20, item.y - 14, 40, 28);
      ctx.fillStyle = kind.color;
      ctx.globalAlpha = glint;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = kind.color;
      ctx.globalAlpha = glint;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-9, -9, 18, 18);
      ctx.restore();
    }
    text(ctx, kind.label.toUpperCase(), item.x, item.y + 28, 9, DIM, 'center', '700');
  }
}

function drawCoins(ctx, world, now) {
  for (const coin of world.tools.flying) {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y - Math.sin(Math.min(1, coin.t) * Math.PI) * 14, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const coin of world.tools.ringing) {
    const k = 1 - coin.t / 2.5;
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.8 - k * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6 + k * 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuards(ctx, world, now) {
  for (const guard of world.guards) {
    const alert = guard.alertness();
    // Body.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 10, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = guard.state === 'chase' ? '#991b1b' : '#3b4a63';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = guard.state === 'chase' ? '#f87171' : '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Cap brim in the facing direction.
    const fx = guard.x + Math.cos(guard.facing) * 10;
    const fy = guard.y + Math.sin(guard.facing) * 10;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    // Eyes.
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.facing - 0.4) * 5, guard.y + Math.sin(guard.facing - 0.4) * 5, 1.8, 0, Math.PI * 2);
    ctx.arc(guard.x + Math.cos(guard.facing + 0.4) * 5, guard.y + Math.sin(guard.facing + 0.4) * 5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Alert mark.
    if (guard.state === 'chase') {
      text(ctx, '!', guard.x, guard.y - 24, 20, '#ef4444', 'center', '900');
    } else if (guard.state === 'suspicious') {
      text(ctx, '?', guard.x, guard.y - 24, 18, '#f59e0b', 'center', '900');
    } else if (alert > 0.15) {
      text(ctx, '!', guard.x, guard.y - 24, 14, `rgba(245, 158, 11, ${alert})`, 'center', '900');
    }
    void now;
  }
}

function drawCameras(ctx, world) {
  for (const camera of world.cameras) {
    const cx = camera.x;
    const cy = camera.y;
    ctx.fillStyle = camera.offline ? '#475569' : '#991b1b';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = camera.offline ? '#64748b' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();
    const lx = cx + Math.cos(camera.angle) * 6;
    const ly = cy + Math.sin(camera.angle) * 6;
    ctx.fillStyle = camera.offline ? '#334155' : '#fca5a5';
    ctx.beginPath();
    ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (camera.offline) {
      text(ctx, 'OFFLINE', cx, cy + 22, 9, '#94a3b8', 'center', '800');
    }
  }
}

function drawPlayer(ctx, world, now) {
  const p = world.player;
  const bob = p.moving ? Math.sin(now * 12) * 1.5 : 0;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d9488';
  ctx.beginPath();
  ctx.arc(p.x, p.y + bob * 0.4, PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Domino mask.
  ctx.strokeStyle = '#f5e9c8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x - 8, p.y - 2 + bob * 0.4);
  ctx.lineTo(p.x + 8, p.y - 2 + bob * 0.4);
  ctx.stroke();
  // Facing tick.
  ctx.strokeStyle = '#ccfbf1';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + bob * 0.4);
  ctx.lineTo(p.x + Math.cos(p.facing) * 13, p.y + bob * 0.4 + Math.sin(p.facing) * 13);
  ctx.stroke();
  if (p.sneaking) {
    text(ctx, 'SNEAKING', p.x, p.y - 22, 9, '#5eead4', 'center', '800');
  }
}

function drawChannelRing(ctx, world) {
  const target = world.targetLoot;
  if (!target || target.taken || world.channel <= 0) return;
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.arc(target.x, target.y, 30, -Math.PI / 2, -Math.PI / 2 + world.channel * Math.PI * 2);
  ctx.stroke();
  text(ctx, 'CRACKING THE CASE…', target.x, target.y + 48, 11, '#bae6fd', 'center', '800');
}

/** The top bar: level, objective, alarm meter, loot, tools, timer. */
export function drawHud(ctx, world) {
  ctx.fillStyle = '#0d0819';
  ctx.fillRect(0, 0, VIEW.width, HUD_H);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, HUD_H - 2, VIEW.width, 2);

  const level = LEVELS[world.levelIndex];
  serif(ctx, level.name.toUpperCase(), 18, 17, 16, INK, 'left');
  text(ctx, world.objective, 18, 40, 12, DIM, 'left', '600');

  // Alarm meter, dead centre.
  const mw = 320;
  const mx = VIEW.width / 2 - mw / 2;
  text(ctx, 'ALARM', VIEW.width / 2, 14, 11, world.alarm > 70 ? '#fca5a5' : DIM, 'center', '800');
  ctx.fillStyle = '#1f2937';
  roundRect(ctx, mx, 24, mw, 18, 9);
  ctx.fill();
  const frac = Math.min(1, world.alarm / 100);
  const grad = ctx.createLinearGradient(mx, 0, mx + mw, 0);
  grad.addColorStop(0, '#22c55e');
  grad.addColorStop(0.5, '#eab308');
  grad.addColorStop(1, '#dc2626');
  ctx.fillStyle = grad;
  if (frac > 0.01) {
    roundRect(ctx, mx + 2, 26, Math.max(10, (mw - 4) * frac), 14, 7);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, mx, 24, mw, 18, 9);
  ctx.stroke();
  text(ctx, `${Math.round(world.alarm)}%`, VIEW.width / 2 + mw / 2 + 14, 33, 13, world.alarm > 70 ? '#ef4444' : INK, 'left', '800');

  // Right side: loot, coins, EMP, timer.
  const totalLoot = world.loot.reduce((sum, item) => sum + item.value, 0);
  text(ctx, `LOOT ${formatMoney(world.lootValue)} / ${formatMoney(totalLoot)}`, VIEW.width - 18, 17, 13, GOLD, 'right', '700');
  const tools = `COINS ${world.tools.coins}   EMP ${world.tools.emp}   ${formatTime(world.time)}`;
  text(ctx, tools, VIEW.width - 18, 40, 12, DIM, 'right', '600');
}

/** Red pulse at the edges while the alarm runs hot. */
function drawAlarmVignette(ctx, world, now) {
  if (world.alarm < 70) return;
  const k = ((world.alarm - 70) / 30) * (0.22 + Math.sin(now * 6) * 0.08);
  const grad = ctx.createRadialGradient(
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.35,
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.75,
  );
  grad.addColorStop(0, 'rgba(220, 38, 38, 0)');
  grad.addColorStop(1, `rgba(220, 38, 38, ${k})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
}

function dimBackground(ctx, world, now) {
  drawWorld(ctx, world, now);
  ctx.fillStyle = 'rgba(8, 5, 18, 0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();
}

export function drawTitle(ctx, world, best) {
  dimBackground(ctx, world, 0);
  panel(ctx, 290, 130, 700, 540);
  serif(ctx, 'VELVET VAULT', 640, 195, 58, GOLD, 'center');
  serif(ctx, 'A  M I D N I G H T   H E I S T', 640, 245, 19, INK, 'center', '600');
  text(ctx, 'You are Wren, gentleman thief. Tonight the Velvet Vault shows', 640, 300, 15, DIM, 'center', '600');
  text(ctx, 'the Star Sapphire — and a house full of guards and cameras.', 640, 324, 15, DIM, 'center', '600');
  text(ctx, 'Lift the Sapphire, grab what else you can carry, and reach', 640, 348, 15, DIM, 'center', '600');
  text(ctx, 'the east exit before the alarm hits 100%.', 640, 372, 15, DIM, 'center', '600');
  text(ctx, 'WASD / ARROWS — move          SHIFT — sneak (slow, quiet, harder to spot)', 640, 425, 14, INK, 'center', '600');
  text(ctx, 'CLICK — throw a coin to pull guards away          Q — EMP: black out cameras', 640, 452, 14, INK, 'center', '600');
  text(ctx, 'Stand still by the Sapphire to crack its case. Running makes noise.', 640, 479, 14, INK, 'center', '600');
  text(ctx, '3 levels  ·  guards with vision cones  ·  cameras  ·  alarm meter', 640, 512, 13, DIM, 'center', '600');
  if (best > 0) {
    text(ctx, `Best getaway so far: ${formatMoney(best)}`, 640, 548, 14, GOLD, 'center', '700');
  }
  const pulse = 0.7 + Math.sin(Date.now() / 350) * 0.3;
  text(ctx, 'PRESS ENTER OR CLICK TO BEGIN', 640, 610, 18, `rgba(245, 233, 200, ${pulse})`, 'center', '800');
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(8, 5, 18, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 440, 300, 400, 160);
  serif(ctx, 'PAUSED', 640, 350, 40, INK, 'center');
  text(ctx, 'Press P or ESC to keep stealing', 640, 405, 14, DIM, 'center', '600');
}

export function drawCaught(ctx, world) {
  ctx.fillStyle = 'rgba(60, 5, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 340, 240, 600, 300);
  serif(ctx, 'CAUGHT!', 640, 300, 54, '#f87171', 'center');
  text(ctx, world.caughtBy, 640, 360, 15, INK, 'center', '600');
  text(ctx, `Loot in the bag: ${formatMoney(world.lootValue)}   ·   Alarm peaked at ${Math.round(world.maxAlarm)}%`, 640, 400, 14, DIM, 'center', '600');
  text(ctx, 'The house always wins — unless you run it back.', 640, 430, 14, DIM, 'center', '600');
  text(ctx, 'PRESS R TO RETRY THIS LEVEL', 640, 485, 17, INK, 'center', '800');
}

export function drawLevelComplete(ctx, world, totalScore, isLast) {
  ctx.fillStyle = 'rgba(8, 5, 18, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 330, 180, 620, 420);
  serif(ctx, isLast ? 'CLEAN GETAWAY' : 'VAULT CRACKED', 640, 240, 44, GOLD, 'center');
  text(ctx, `${LEVELS[world.levelIndex].name} — cleared in ${formatTime(world.time)}`, 640, 295, 15, INK, 'center', '600');
  text(ctx, `Loot lifted: ${formatMoney(world.lootValue)}`, 640, 335, 16, INK, 'center', '700');
  const tb = Math.max(0, Math.round((PAR_SECONDS[world.levelIndex] - world.time) * 10));
  text(ctx, `Time bonus: ${formatMoney(tb)}`, 640, 365, 15, DIM, 'center', '600');
  text(ctx, `Ghost bonus: ${world.ghost ? formatMoney(1000) : '$0'}  (alarm never over ${ALARM.ghostLimit}%)`, 640, 393, 15, DIM, 'center', '600');
  text(ctx, `Level score: ${formatMoney(world.score)}`, 640, 425, 17, GOLD, 'center', '800');
  text(ctx, `Total so far: ${formatMoney(totalScore)}`, 640, 455, 15, INK, 'center', '700');
  if (isLast) {
    text(ctx, 'Three vaults, one clean getaway. The Sapphire is yours.', 640, 495, 14, DIM, 'center', '600');
    text(ctx, 'PRESS R TO STEAL IT ALL AGAIN', 640, 545, 17, INK, 'center', '800');
  } else {
    text(ctx, 'PRESS ENTER FOR THE NEXT VAULT', 640, 545, 17, INK, 'center', '800');
  }
}
