// Drawing only: the city, entities, HUD with minimap, and screens.
import {
  WORLD, VIEW, ROAD_W, VERTICAL_STREETS, HORIZONTAL_STREETS, PARK, BEACH_Y, DOCKS_X,
  CAR, PLAYER, PALETTE, MISSIONS, HIDEOUT, FONT,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WIN = 'win';

const MINIMAP = { x: 0, y: 0, w: 190, h: 143 };

function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-CAR.length / 2 + 3, -CAR.width / 2 + 4, CAR.length, CAR.width);
  ctx.fillStyle = car.police ? '#1d4ed8' : car.color;
  ctx.fillRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width);
  ctx.fillStyle = car.police ? '#f2f4f8' : 'rgba(255,255,255,0.25)';
  ctx.fillRect(-CAR.length / 2 + 10, -CAR.width / 2 + 4, 14, CAR.width - 8); // cabin
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(CAR.length / 2 - 12, -CAR.width / 2 + 3, 6, 5);
  ctx.fillRect(CAR.length / 2 - 12, CAR.width / 2 - 8, 6, 5);
  if (car.police) {
    ctx.fillStyle = '#e5534b';
    ctx.fillRect(-4, -CAR.width / 2 + 2, 8, 5);
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(-4, CAR.width / 2 - 7, 8, 5);
  }
  if (car.taxi) {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 9px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color, r = 9) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.arc(2, 3, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(r * 0.55, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const camera = { x: 0, y: 0, scale: 1 };
  const fonts = new Map();
  function text(value, x, y, size, color, align = 'left', baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    ctx.font = fonts.get(size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(value, x, y);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    camera.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
  }

  function focus(x, y) {
    const vw = canvas.width / camera.scale;
    const vh = canvas.height / camera.scale;
    camera.x = Math.max(0, Math.min(WORLD.width - vw, x - vw / 2));
    camera.y = Math.max(0, Math.min(WORLD.height - vh, y - vh / 2));
  }

  function drawCity(state) {
    // Ground: grass, then beach (south) and water, docks (east).
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, BEACH_Y, WORLD.width, WORLD.height - BEACH_Y);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, WORLD.height - 26, WORLD.width, 26);
    ctx.fillStyle = '#8a6d3b';
    ctx.fillRect(DOCKS_X, 0, WORLD.width - DOCKS_X, WORLD.height);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(WORLD.width - 14, 0, 14, WORLD.height);
    // Piers.
    ctx.fillStyle = '#6b4f2a';
    for (const py of [300, 700, 1100, 1500, 1900]) ctx.fillRect(DOCKS_X + 40, py, 180, 26);
    // Park.
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(PARK.x, PARK.y, PARK.w, PARK.h);
    ctx.fillStyle = '#3a7d4f';
    for (const [tx, ty] of [[PARK.x + 50, PARK.y + 60], [PARK.x + 240, PARK.y + 90], [PARK.x + 120, PARK.y + 230], [PARK.x + 260, PARK.y + 250]]) {
      ctx.beginPath(); ctx.arc(tx, ty, 26, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#7fb069';
    ctx.beginPath(); ctx.arc(PARK.x + 160, PARK.y + 160, 34, 0, Math.PI * 2); ctx.fill();
    // Sidewalks then roads.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const sx of VERTICAL_STREETS) ctx.fillRect(sx - ROAD_W / 2 - 12, 0, ROAD_W + 24, WORLD.height);
    for (const sy of HORIZONTAL_STREETS) ctx.fillRect(0, sy - ROAD_W / 2 - 12, WORLD.width, ROAD_W + 24);
    ctx.fillStyle = PALETTE.road;
    for (const sx of VERTICAL_STREETS) ctx.fillRect(sx - ROAD_W / 2, 0, ROAD_W, WORLD.height);
    for (const sy of HORIZONTAL_STREETS) ctx.fillRect(0, sy - ROAD_W / 2, WORLD.width, ROAD_W);
    // Lane dashes.
    ctx.fillStyle = PALETTE.lane;
    for (const sx of VERTICAL_STREETS) {
      for (let y = 20; y < WORLD.height; y += 56) ctx.fillRect(sx - 2, y, 4, 28);
    }
    for (const sy of HORIZONTAL_STREETS) {
      for (let x = 20; x < WORLD.width; x += 56) ctx.fillRect(x, sy - 2, 28, 4);
    }
    // Buildings with lit windows.
    for (const b of state.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(b.x + 4, b.y + 5, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = PALETTE.roof;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = PALETTE.window;
      const cols = Math.max(2, Math.floor(b.w / 26));
      const rows = Math.max(2, Math.floor(b.h / 26));
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          if ((i * 7 + j * 3 + b.floors) % 3 !== 0) continue;
          ctx.fillRect(b.x + 12 + i * ((b.w - 24) / cols), b.y + 12 + j * ((b.h - 24) / rows), 9, 11);
        }
      }
    }
    // Street names on the big avenues.
    ctx.save();
    text('NEON BAY', 90, 120, 30, 'rgba(242,244,248,0.5)');
    text('HARBOR', DOCKS_X - 190, 120, 26, 'rgba(242,244,248,0.45)');
    text('SOUTH BEACH', 90, BEACH_Y + 46, 26, 'rgba(20,20,20,0.55)');
    ctx.restore();
  }

  function drawMarker(x, y, label, pulse) {
    const r = 26 + Math.sin(pulse * 4) * 5;
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(242,201,76,0.25)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x + 10, y - 14); ctx.lineTo(x - 10, y - 14); ctx.closePath(); ctx.fill();
    text(label, x, y - 44, 20, PALETTE.gold, 'center');
  }

  function drawHud(state, screen) {
    const vw = canvas.width / camera.scale;
    const vh = canvas.height / camera.scale;
    ctx.save();
    ctx.setTransform(camera.scale, 0, 0, camera.scale, 0, 0);
    // Top-left: cash + health.
    ctx.fillStyle = 'rgba(16,19,26,0.72)';
    ctx.fillRect(14, 14, 250, 64);
    text(`$${state.cash.toLocaleString('en-US')}`, 28, 40, 26, state.cash >= 0 ? '#4ade80' : '#e5534b');
    ctx.fillStyle = '#333';
    ctx.fillRect(28, 52, 180, 12);
    ctx.fillStyle = state.player.health > 40 ? '#4ade80' : '#e5534b';
    ctx.fillRect(28, 52, 180 * Math.max(0, state.player.health) / PLAYER.health, 12);
    text('HP', 212, 62, 14, PALETTE.muted);
    // Top-center: wanted stars.
    const stars = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    text(stars, vw / 2, 44, 34, state.wanted > 0 ? '#ffd21f' : 'rgba(242,244,248,0.35)', 'center');
    if (state.wanted > 0) text('WANTED', vw / 2, 66, 13, '#ffd21f', 'center');
    // Mission banner (top-center below stars).
    const m = MISSIONS[state.missionIndex];
    if (m && !state.storyDone) {
      ctx.fillStyle = 'rgba(16,19,26,0.72)';
      const label = `${m.title} — ${m.brief}`;
      ctx.fillRect(vw / 2 - 330, 76, 660, 30);
      text(label, vw / 2, 97, 16, PALETTE.text, 'center');
    }
    // Bottom-left: controls / context hint.
    const hint = state.player.inCar
      ? 'W/S drive · A/D steer · E exit car · P pause · K mute'
      : 'WASD move · Shift run · E steal car · Click shoot · F punch · P pause';
    text(hint, 16, vh - 16, 14, 'rgba(242,244,248,0.75)');
    if (state.player.inCar) {
      text(`${Math.abs(Math.round(state.player.inCar.speed * 0.12))} mph`, 16, vh - 40, 22, PALETTE.text);
      text(state.player.inCar.name, 16, vh - 62, 14, PALETTE.muted);
    }
    // Message toast.
    if (state.messageTimer > 0 && state.message) {
      ctx.fillStyle = 'rgba(16,19,26,0.8)';
      ctx.fillRect(vw / 2 - 300, vh - 96, 600, 34);
      text(state.message, vw / 2, vh - 73, 17, PALETTE.gold, 'center');
    }
    drawMinimap(state, vw);
    ctx.restore();
  }

  function drawMinimap(state, vw) {
    const mx = vw - MINIMAP.w - 14;
    const my = 14;
    const sx = MINIMAP.w / WORLD.width;
    const sy = MINIMAP.h / WORLD.height;
    ctx.fillStyle = 'rgba(16,19,26,0.8)';
    ctx.fillRect(mx - 4, my - 4, MINIMAP.w + 8, MINIMAP.h + 8);
    ctx.fillStyle = '#1d4d33';
    ctx.fillRect(mx, my, MINIMAP.w, MINIMAP.h);
    ctx.fillStyle = '#3a3f4d';
    for (const s of VERTICAL_STREETS) ctx.fillRect(mx + s * sx - 1, my, 2, MINIMAP.h);
    for (const s of HORIZONTAL_STREETS) ctx.fillRect(mx, my + s * sy, MINIMAP.w, 2);
    const m = MISSIONS[state.missionIndex];
    let target = null;
    if (m && !state.storyDone) {
      target = state.missionIndex === 4 && state.missionStage === 1 ? HIDEOUT : m.target;
    }
    if (target) {
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath(); ctx.arc(mx + target.x * sx, my + target.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    }
    for (const pc of state.police) {
      if (pc.dead) continue;
      ctx.fillStyle = '#2f6df6';
      ctx.fillRect(mx + pc.x * sx - 2, my + pc.y * sy - 2, 4, 4);
    }
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath(); ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 4, 0, Math.PI * 2); ctx.stroke();
    text('NEON BAY', mx + 4, my + MINIMAP.h - 6, 11, 'rgba(242,244,248,0.8)');
  }

  function drawPanel(title, lines, prompt, accent = PALETTE.gold) {
    const vw = canvas.width / camera.scale;
    const vh = canvas.height / camera.scale;
    ctx.fillStyle = 'rgba(8,10,14,0.62)';
    ctx.fillRect(0, 0, vw, vh);
    const w = 680;
    const h = 190 + lines.length * 34;
    const x = (vw - w) / 2;
    const y = (vh - h) / 2;
    ctx.fillStyle = '#161a23';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    text(title, vw / 2, y + 74, 46, accent, 'center');
    lines.forEach((line, i) => text(line, vw / 2, y + 128 + i * 34, 20, PALETTE.muted, 'center'));
    text(prompt, vw / 2, y + h - 36, 22, PALETTE.text, 'center');
  }

  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0e13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    focus(state.player.x, state.player.y);
    ctx.setTransform(camera.scale, 0, 0, camera.scale, -camera.x * camera.scale, -camera.y * camera.scale);
    drawCity(state);
    // Mission marker.
    const m = MISSIONS[state.missionIndex];
    if (m && !state.storyDone && screen === SCREEN_PLAY) {
      const target = state.missionIndex === 4 && state.missionStage === 1 ? HIDEOUT : m.target;
      if (target) drawMarker(target.x, target.y, target.label, state.elapsed);
    }
    // Pickups (none in this build beyond mission flow; kept for extension).
    for (const pk of state.pickups) drawMarker(pk.x, pk.y, pk.label, state.elapsed);
    // Parked + traffic cars, police, then player.
    for (const car of state.cars) {
      if (car.dead) continue;
      if (car.police && !state.police.includes(car)) continue;
      drawCar(ctx, car);
    }
    for (const pc of state.police) if (!pc.dead) drawCar(ctx, pc);
    for (const ped of state.peds) if (ped.alive) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color);
    for (const e of state.enemies) {
      if (!e.alive) continue;
      drawPerson(ctx, e.x, e.y, e.angle, '#c94f4f', 11);
      ctx.fillStyle = '#111';
      ctx.fillRect(e.x - 16, e.y - 22, 32, 5);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(e.x - 16, e.y - 22, 32 * Math.max(0, e.health) / 100, 5);
    }
    for (const b of state.bullets) {
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (!state.player.inCar) {
      drawPerson(ctx, state.player.x, state.player.y, state.player.angle, PALETTE.player, 13);
      // Aim line.
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(state.player.x, state.player.y);
      ctx.lineTo(state.player.x + Math.cos(state.player.angle) * 44, state.player.y + Math.sin(state.player.angle) * 44);
      ctx.stroke();
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, screen);
    // Panels are screen-space: reset the world transform first, or a camera
    // away from the origin would push the panel off-screen.
    ctx.setTransform(camera.scale, 0, 0, camera.scale, 0, 0);
    if (screen === SCREEN_TITLE) {
      drawPanel('NEON BAY', ['Harbor Heat — an original open-world crime game', 'Steal cars. Outrun the cops. Finish Mara\u2019s five missions.', `Best cash: $${(best || 0).toLocaleString('en-US')}`], 'Press Space or click to start  ·  WASD move · E steal car', PALETTE.gold);
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The city waits for you.', 'Progress saves automatically.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('WASTED', [`Mara went down with $${state.cash.toLocaleString('en-US')} in her pocket.`, `Missions done: ${state.missionIndex} of 5 · Cars stolen: ${state.carsStolen}`], 'Press Space to try again', PALETTE.red);
    } else if (screen === SCREEN_BUSTED) {
      drawPanel('BUSTED', ['The Neon Bay PD caught up with Mara.', `Cash kept: $${state.cash.toLocaleString('en-US')}`], 'Press Space to try again', PALETTE.blue);
    } else if (screen === SCREEN_WIN) {
      drawPanel('STORY COMPLETE', ['Mara owns Neon Bay. All five missions done.', `Final cash: $${state.cash.toLocaleString('en-US')} · Cars stolen: ${state.carsStolen}`], 'Press Space to keep cruising', PALETTE.green);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, camera };
}
