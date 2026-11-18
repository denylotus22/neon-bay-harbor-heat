// The simulation: city, player on foot and in cars, traffic, pedestrians,
// police, combat, wanted level and the five-mission story. No drawing here.
import {
  WORLD, ROAD_W, VERTICAL_STREETS, HORIZONTAL_STREETS, PARK, BEACH_Y, DOCKS_X,
  PLAYER, CAR, BULLET, POLICE, WANTED_DECAY_SECONDS, MISSIONS, HIDEOUT,
} from './config.js';
import { clamp, dist, angleTo, angleDiff, pick } from './random.js';
import { ACTION_ENTER, ACTION_PUNCH } from './input.js';

export const EVENT_CRIME = 1;
export const EVENT_MISSION = 2;
export const EVENT_BUSTED = 4;
export const EVENT_WASTED = 8;
export const EVENT_CASH = 16;

const CAR_COLORS = ['#d94f4f', '#4f8fd9', '#e8e8e8', '#2e2e33', '#d9a44f', '#6fd94f', '#9a4fd9', '#4fd9c9'];
const PED_COLORS = ['#e8b04f', '#7fb069', '#c96f9a', '#6f8fc9', '#d9d9d9', '#b07f4f', '#8a6fd9'];
const CAR_NAMES = ['Comet', 'Stallion', 'Futo', 'Bison', 'Premier', 'Sultan', 'Dukes', 'Voodoo'];

function onRoad(x, y) {
  for (const sx of VERTICAL_STREETS) if (Math.abs(x - sx) < ROAD_W / 2 + 6) return true;
  for (const sy of HORIZONTAL_STREETS) if (Math.abs(y - sy) < ROAD_W / 2 + 6) return true;
  return false;
}

function circleHitsBuilding(x, y, r, buildings) {
  for (const b of buildings) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

export function createWorld(random) {
  // ---- city generation (seeded, deterministic) ----
  const buildings = [];
  const vEdges = [0, ...VERTICAL_STREETS, WORLD.width];
  const hEdges = [0, ...HORIZONTAL_STREETS, WORLD.height];
  for (let bi = 0; bi < vEdges.length - 1; bi += 1) {
    for (let bj = 0; bj < hEdges.length - 1; bj += 1) {
      const x0 = vEdges[bi] + ROAD_W / 2 + 14;
      const x1 = vEdges[bi + 1] - ROAD_W / 2 - 14;
      const y0 = hEdges[bj] + ROAD_W / 2 + 14;
      const y1 = hEdges[bj + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // Park block, beach strip and docks stay open.
      if (x0 >= PARK.x - 20 && y0 >= PARK.y - 20 && x1 <= PARK.x + PARK.w + 20 && y1 <= PARK.y + PARK.h + 20) continue;
      if (y0 >= BEACH_Y - 40) continue;
      if (x0 >= DOCKS_X - 40) continue;
      const count = 1 + Math.floor(random() * 3);
      for (let k = 0; k < count; k += 1) {
        // Clamp the footprint to the block so no building ever spills onto a road.
        const w = Math.min(90 + random() * 150, x1 - x0 - 10);
        const h = Math.min(80 + random() * 130, y1 - y0 - 10);
        const x = x0 + random() * Math.max(1, x1 - x0 - w);
        const y = y0 + random() * Math.max(1, y1 - y0 - h);
        const color = pick(random, ['#7a4a6b', '#4a6b7a', '#6b5a2e', '#3f5a44', '#5a4a7a', '#71563a']);
        buildings.push({ x, y, w, h, color, floors: 2 + Math.floor(random() * 5) });
      }
    }
  }

  // ---- entities ----
  const player = { x: 600, y: 200, angle: 0, health: PLAYER.health, inCar: null, speed: 0 };
  const cars = [];
  function addCar(x, y, angle, opts = {}) {
    const car = {
      x, y, angle, speed: 0, color: opts.color ?? pick(random, CAR_COLORS),
      name: opts.name ?? pick(random, CAR_NAMES), police: !!opts.police,
      taxi: !!opts.taxi, parked: opts.parked !== false, driver: opts.driver ?? null,
      traffic: !!opts.traffic, health: 100, targetStreet: null, turnAt: 0, dead: false,
    };
    cars.push(car);
    return car;
  }
  // Parked cars along streets.
  for (let i = 0; i < 22; i += 1) {
    const sx = pick(random, VERTICAL_STREETS);
    const sy = 120 + random() * (WORLD.height - 360);
    const along = random() < 0.5;
    addCar(along ? sx + ROAD_W / 2 - 16 : 120 + random() * (WORLD.width - 240),
      along ? sy : pick(random, HORIZONTAL_STREETS) + ROAD_W / 2 - 16,
      along ? Math.PI / 2 : 0, { parked: true });
  }
  // Traffic cars on the roads.
  for (let i = 0; i < 16; i += 1) {
    const vertical = random() < 0.5;
    const c = addCar(
      vertical ? pick(random, VERTICAL_STREETS) + (random() < 0.5 ? -14 : 14) : 150 + random() * 2900,
      vertical ? 150 + random() * 2100 : pick(random, HORIZONTAL_STREETS) + (random() < 0.5 ? -14 : 14),
      vertical ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI),
      { parked: false, traffic: true });
    c.speed = 110 + random() * 70;
    c.vertical = vertical;
  }
  // One taxi near the start, parked in the middle of the avenue so it can pull out cleanly.
  addCar(660, 200, 0, { color: '#f2c94c', taxi: true, parked: true, name: 'Taxi' });

  const peds = [];
  for (let i = 0; i < 42; i += 1) {
    peds.push({
      x: 100 + random() * (WORLD.width - 200), y: 100 + random() * (WORLD.height - 300),
      angle: random() * Math.PI * 2, speed: 34 + random() * 26, color: pick(random, PED_COLORS),
      alive: true, flee: 0, pause: random() * 3,
    });
  }
  const bullets = [];
  const enemies = [];
  const police = [];
  const pickups = [];

  const state = {
    player, cars, peds, bullets, enemies, police, pickups, buildings,
    cash: 250, wanted: 0, missionIndex: 0, missionStage: 0, missionMsg: '',
    elapsed: 0, wantedTimer: 0, bustTimer: 0, storyDone: false,
    kills: 0, carsStolen: 0, message: '', messageTimer: 0,
  };

  function showMessage(text, seconds = 3.5) {
    state.message = text;
    state.messageTimer = seconds;
  }

  function addWanted(stars) {
    state.wanted = clamp(state.wanted + stars, 0, 5);
    state.wantedTimer = 0;
  }

  function nearestCar(x, y, maxDist) {
    let best = null, bestD = maxDist;
    for (const car of cars) {
      if (car.dead) continue;
      const d = dist(x, y, car.x, car.y);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function moveCircle(e, nx, ny, r) {
    // Slide along buildings: try x then y separately.
    if (!circleHitsBuilding(nx, e.y, r, buildings)) e.x = clamp(nx, r, WORLD.width - r);
    if (!circleHitsBuilding(e.x, ny, r, buildings)) e.y = clamp(ny, r, WORLD.height - r);
  }

  function spawnPolice() {
    const want = Math.min(POLICE.maxChasers, 1 + state.wanted);
    while (police.length < want) {
      const a = random() * Math.PI * 2;
      const px = clamp(player.x + Math.cos(a) * 700, 60, WORLD.width - 60);
      const py = clamp(player.y + Math.sin(a) * 700, 60, WORLD.height - 60);
      const car = addCar(px, py, angleTo(px, py, player.x, player.y), { police: true, parked: false, color: '#2f6df6', name: 'Interceptor' });
      car.speed = 200;
      police.push(car);
    }
  }

  function spawnEnemies() {
    enemies.length = 0;
    for (let i = 0; i < 3; i += 1) {
      enemies.push({
        x: PARK.x + 60 + i * 100, y: PARK.y + 120 + (i % 2) * 120,
        angle: 0, health: 100, alive: true, punchCooldown: 0, speed: 150,
      });
    }
    showMessage('The Kestrel crew is here. Settle the debt!', 4);
  }

  function startMission(index) {
    state.missionIndex = index;
    state.missionStage = 0;
    const m = MISSIONS[index];
    if (m) showMessage(`${m.title}: ${m.brief}`, 5);
  }

  function completeMission() {
    const m = MISSIONS[state.missionIndex];
    const doneIndex = state.missionIndex;
    state.cash += m.reward;
    showMessage(`Mission complete: ${m.title} — +$${m.reward}`, 4);
    if (doneIndex >= MISSIONS.length - 1) {
      state.storyDone = true;
      showMessage('STORY COMPLETE — Neon Bay is yours, Mara.', 6);
      return EVENT_MISSION | EVENT_CASH;
    }
    startMission(doneIndex + 1);
    if (doneIndex === 2) spawnEnemies(); // mission 4 (index 3) begins
    return EVENT_MISSION | EVENT_CASH;
  }

  function reset() {
    player.x = 600; player.y = 200; player.angle = 0; player.health = PLAYER.health;
    player.inCar = null; player.speed = 0;
    state.cash = 250; state.wanted = 0; state.missionIndex = 0; state.missionStage = 0;
    state.elapsed = 0; state.wantedTimer = 0; state.bustTimer = 0; state.storyDone = false;
    state.kills = 0; state.carsStolen = 0; state.message = ''; state.messageTimer = 0;
    bullets.length = 0; enemies.length = 0; police.length = 0; pickups.length = 0;
    for (const car of cars) if (car.police) car.dead = true;
    for (const ped of peds) { ped.alive = true; ped.flee = 0; }
    startMission(0);
  }

  function step(dt, input, actions, mouseWorld) {
    let events = 0;
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;

    const p = player;
    const car = p.inCar;

    // ---- player on foot ----
    if (!car) {
      const ax = input.axisX(), ay = input.axisY();
      const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
      if (ax !== 0 || ay !== 0) {
        const len = Math.hypot(ax, ay);
        const nx = p.x + (ax / len) * speed * dt;
        const ny = p.y + (ay / len) * speed * dt;
        moveCircle(p, nx, ny, PLAYER.radius);
        p.angle = Math.atan2(ay, ax);
        p.speed = speed;
      } else p.speed = 0;
      if (actions & ACTION_ENTER) {
        const near = nearestCar(p.x, p.y, 70);
        if (near && !near.police) {
          p.inCar = near; near.parked = false; near.traffic = false; near.driver = null;
          state.carsStolen += 1;
          addWanted(1);
          events |= EVENT_CRIME;
          showMessage(`You stole the ${near.name}. The cops noticed!`, 3);
          if (state.missionIndex === 0) events |= completeMission();
        } else if (near && near.police) {
          showMessage('That is a police car — too hot to steal.', 2);
        }
      }
      if (actions & ACTION_PUNCH) {
        // Punch: hurt the nearest ped/enemy within reach.
        for (const e of enemies) {
          if (e.alive && dist(p.x, p.y, e.x, e.y) < 52) { e.health -= 40; if (e.health <= 0) { e.alive = false; state.kills += 1; addWanted(1); events |= EVENT_CRIME; } }
        }
        for (const ped of peds) {
          if (ped.alive && dist(p.x, p.y, ped.x, ped.y) < 46) {
            ped.alive = false; ped.flee = 0; addWanted(1); events |= EVENT_CRIME;
            showMessage('You hit a civilian! Wanted level up.', 2);
            break;
          }
        }
      }
      if (mouseWorld && mouseWorld.clicked) {
        const a = angleTo(p.x, p.y, mouseWorld.x, mouseWorld.y);
        bullets.push({ x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20, angle: a, traveled: 0 });
        events |= 0;
      }
    } else {
      // ---- driving ----
      const throttle = -input.axisY(); // up = accelerate
      const steer = input.axisX();
      const forward = throttle > 0;
      if (throttle !== 0) {
        car.speed += (forward ? CAR.accel : -CAR.brake) * throttle * dt * (forward ? 1 : 1);
        if (car.speed > CAR.maxSpeed) car.speed = CAR.maxSpeed;
        if (car.speed < -CAR.reverseMax) car.speed = -CAR.reverseMax;
      } else {
        car.speed *= Math.pow(0.4, dt);
        if (Math.abs(car.speed) < 4) car.speed = 0;
      }
      if (Math.abs(car.speed) > 2) car.angle += steer * CAR.turn * dt * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 160);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const hit = circleHitsBuilding(nx, ny, CAR.length / 2 - 4, buildings);
      if (hit) { car.speed *= -0.25; }
      else { car.x = clamp(nx, 30, WORLD.width - 30); car.y = clamp(ny, 30, WORLD.height - 30); }
      p.x = car.x; p.y = car.y; p.angle = car.angle;
      if (actions & ACTION_ENTER) {
        p.inCar = null; p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40; p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
        car.speed = 0; car.parked = true;
      }
      // Running over pedestrians.
      for (const ped of peds) {
        if (ped.alive && Math.abs(car.speed) > 60 && dist(car.x, car.y, ped.x, ped.y) < 34) {
          ped.alive = false; addWanted(1); events |= EVENT_CRIME;
          showMessage('You ran someone over! Wanted level up.', 2);
        }
      }
    }

    // ---- bullets ----
    for (const b of bullets) {
      b.x += Math.cos(b.angle) * BULLET.speed * dt;
      b.y += Math.sin(b.angle) * BULLET.speed * dt;
      b.traveled += BULLET.speed * dt;
      if (b.traveled > BULLET.range || b.x < 0 || b.y < 0 || b.x > WORLD.width || b.y > WORLD.height) { b.traveled = Infinity; continue; }
      for (const e of enemies) {
        if (e.alive && dist(b.x, b.y, e.x, e.y) < 20) {
          e.health -= BULLET.damage; b.traveled = Infinity;
          if (e.health <= 0) { e.alive = false; state.kills += 1; addWanted(1); events |= EVENT_CRIME; }
          break;
        }
      }
      for (const ped of peds) {
        if (ped.alive && dist(b.x, b.y, ped.x, ped.y) < 16) {
          ped.alive = false; b.traveled = Infinity; addWanted(1); events |= EVENT_CRIME;
          showMessage('You shot a civilian! Wanted level up.', 2);
          break;
        }
      }
      for (const pc of police) {
        if (!pc.dead && dist(b.x, b.y, pc.x, pc.y) < 30) {
          pc.health -= BULLET.damage; b.traveled = Infinity;
          if (pc.health <= 0) { pc.dead = true; addWanted(1); events |= EVENT_CRIME; showMessage('Police car disabled!', 2); }
          break;
        }
      }
    }
    for (let i = bullets.length - 1; i >= 0; i -= 1) if (bullets[i].traveled === Infinity) bullets.splice(i, 1);

    // ---- traffic ----
    for (const c of cars) {
      if (c.dead || c.traffic !== true) continue;
      // Drive along the current street; only turn at an intersection, so
      // traffic stays on the roads and never cuts across blocks.
      const onV = VERTICAL_STREETS.some((sx) => Math.abs(c.x - sx) < 20);
      const onH = HORIZONTAL_STREETS.some((sy) => Math.abs(c.y - sy) < 20);
      if (onV && onH && random() < dt * 0.5) {
        const options = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        const a = pick(random, options);
        c.angle = a;
      }
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      if (c.x < 80 || c.x > WORLD.width - 80 || c.y < 80 || c.y > WORLD.height - 80) c.angle += Math.PI;
      // Slow for the car ahead.
      for (const other of cars) {
        if (other === c || other.dead) continue;
        const d = dist(c.x, c.y, other.x, other.y);
        if (d < 70 && Math.abs(angleDiff(c.angle, angleTo(c.x, c.y, other.x, other.y))) < 0.5) c.speed = Math.max(40, c.speed - 200 * dt);
      }
    }

    // ---- pedestrians ----
    for (const ped of peds) {
      if (!ped.alive) continue;
      if (ped.flee > 0) {
        ped.flee -= dt;
        ped.x += Math.cos(ped.angle) * 190 * dt;
        ped.y += Math.sin(ped.angle) * 190 * dt;
        ped.x = clamp(ped.x, 40, WORLD.width - 40);
        ped.y = clamp(ped.y, 40, WORLD.height - 40);
        continue;
      }
      const threat = state.wanted > 0 && dist(ped.x, ped.y, p.x, p.y) < 220;
      if (threat) { ped.flee = 2 + random() * 2; ped.angle = angleTo(p.x, p.y, ped.x, ped.y); continue; }
      if (ped.pause > 0) { ped.pause -= dt; continue; }
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (ped.x < 60 || ped.x > WORLD.width - 60 || ped.y < 60 || ped.y > WORLD.height - 60 || onRoad(ped.x, ped.y)) {
        ped.angle = random() * Math.PI * 2;
        ped.pause = 0.5 + random() * 2;
      }
      if (random() < dt * 0.08) ped.angle += (random() - 0.5) * 1.6;
    }

    // ---- enemies (mission 4) ----
    for (const e of enemies) {
      if (!e.alive) continue;
      e.punchCooldown -= dt;
      const d = dist(e.x, e.y, p.x, p.y);
      if (d > 26) {
        e.angle = angleTo(e.x, e.y, p.x, p.y);
        moveCircle(e, e.x + Math.cos(e.angle) * e.speed * dt, e.y + Math.sin(e.angle) * e.speed * dt, 14);
      } else if (e.punchCooldown <= 0 && !p.inCar) {
        e.punchCooldown = 1.1;
        p.health -= 9;
        showMessage('A Kestrel thug hit you!', 1.5);
        if (p.health <= 0) { events |= EVENT_WASTED; }
      }
    }
    if (state.missionIndex === 3 && enemies.length > 0 && enemies.every((e) => !e.alive) && state.missionStage === 0) {
      state.missionStage = 1;
      events |= completeMission();
    }

    // ---- police ----
    if (state.wanted > 0) {
      state.wantedTimer += dt;
      spawnPolice();
      for (const pc of police) {
        if (pc.dead) continue;
        const d = dist(pc.x, pc.y, p.x, p.y);
        const target = angleTo(pc.x, pc.y, p.x, p.y);
        pc.angle += clamp(angleDiff(pc.angle, target), -2.4 * dt, 2.4 * dt);
        const targetSpeed = p.inCar ? Math.min(620, 300 + state.wanted * 60) : 260;
        pc.speed += (targetSpeed - pc.speed) * Math.min(1, dt * 0.8);
        pc.x += Math.cos(pc.angle) * pc.speed * dt;
        pc.y += Math.sin(pc.angle) * pc.speed * dt;
        if (!circleHitsBuilding(pc.x, pc.y, 20, buildings)) { /* moved freely */ }
        else { pc.x -= Math.cos(pc.angle) * pc.speed * dt; pc.y -= Math.sin(pc.angle) * pc.speed * dt; pc.speed *= 0.5; }
        if (d < 46) {
          if (p.inCar) {
            // Ram: damage the player's car (player health stands in for it).
            p.health -= POLICE.ramDamage * dt * 3;
            if (p.health <= 0) { events |= EVENT_WASTED; }
          } else {
            state.bustTimer += dt;
            if (state.bustTimer > POLICE.bustSeconds) { events |= EVENT_BUSTED; }
          }
        } else state.bustTimer = Math.max(0, state.bustTimer - dt * 2);
      }
      if (state.wantedTimer > WANTED_DECAY_SECONDS && state.wanted > 0) {
        state.wanted -= 1;
        state.wantedTimer = 0;
        showMessage(state.wanted === 0 ? 'You lost the cops. Clean.' : `Heat dropping — ${state.wanted} star${state.wanted > 1 ? 's' : ''} left.`, 3);
        if (state.wanted === 0) {
          for (const pc of police) pc.dead = true;
          police.length = 0;
        }
      }
    } else state.bustTimer = 0;

    // ---- missions (marker-based) ----
    const m = MISSIONS[state.missionIndex];
    if (m && !state.storyDone) {
      if (state.missionIndex === 1 && m.target && dist(p.x, p.y, m.target.x, m.target.y) < 90) {
        state.missionStage = 1;
        events |= completeMission();
      } else if (state.missionIndex === 2 && m.target && state.wanted === 0 && dist(p.x, p.y, m.target.x, m.target.y) < 110) {
        events |= completeMission();
      } else if (state.missionIndex === 4) {
        const target = state.missionStage === 0 ? m.target : HIDEOUT;
        if (state.missionStage === 0 && dist(p.x, p.y, m.target.x, m.target.y) < 110) {
          state.missionStage = 1;
          state.cash += 1200;
          addWanted(3);
          showMessage('Bank hit! $1,200 grabbed — now run to the hideout!', 4);
          events |= EVENT_CRIME | EVENT_CASH;
        } else if (state.missionStage === 1 && dist(p.x, p.y, HIDEOUT.x, HIDEOUT.y) < 120) {
          events |= completeMission();
        }
      }
    }

    // Slow health regen when calm.
    if (state.wanted === 0 && p.health < PLAYER.health) p.health = Math.min(PLAYER.health, p.health + 2 * dt);

    return events;
  }

  function snapshot() {
    return {
      x: Math.round(player.x), y: Math.round(player.y), cash: state.cash,
      wanted: state.wanted, missionIndex: state.missionIndex, health: Math.round(player.health),
      carsStolen: state.carsStolen, kills: state.kills, storyDone: state.storyDone,
    };
  }

  function restore(save) {
    if (!save) return false;
    player.x = clamp(save.x ?? 600, 40, WORLD.width - 40);
    player.y = clamp(save.y ?? 200, 40, WORLD.height - 40);
    state.cash = save.cash ?? 250;
    state.missionIndex = clamp(save.missionIndex ?? 0, 0, MISSIONS.length - 1);
    player.health = clamp(save.health ?? PLAYER.health, 1, PLAYER.health);
    state.carsStolen = save.carsStolen ?? 0;
    state.kills = save.kills ?? 0;
    state.storyDone = !!save.storyDone;
    state.wanted = 0;
    startMission(state.missionIndex);
    if (state.missionIndex === 3) spawnEnemies();
    return true;
  }

  reset();
  return { state, reset, step, snapshot, restore, startMission, showMessage, nearestCar };
}
