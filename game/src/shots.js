// The screenshot scenes behind ?shot=start|play|chase|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, so the
// frame is what a short game really looks like and the same seed always gives
// the same frame.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const INPUT_IDLE = {
  axisX: () => 0, axisY: () => 0, run: () => false,
  takeActions: () => 0, takeClick: () => false, mouse: { x: 0, y: 0 },
};

function driveInput() {
  // Hold W (up) and steer gently: a real drive down the avenues.
  return {
    axisX: () => 0, axisY: () => -1, run: () => false,
    takeActions: () => 0, takeClick: () => false, mouse: { x: 0, y: 0 },
  };
}

export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'start') {
    // Title screen over a living city: traffic rolling, pedestrians out.
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, INPUT_IDLE, 0, null);
    return { screen: SCREEN_TITLE, best: 2500 };
  }
  if (name === 'play') {
    // Steal the taxi by the start, then drive for ~14 s.
    const car = state.cars.find((c) => c.taxi);
    state.player.x = car.x; state.player.y = car.y;
    world.step(STEP, INPUT_IDLE, 1, null); // ACTION_ENTER = 1
    const drive = driveInput();
    for (let i = 0; i < 14 / STEP; i += 1) world.step(STEP, drive, 0, null);
    return { screen: SCREEN_PLAY, best: 2500 };
  }
  if (name === 'chase') {
    // Steal a car, rack up heat, and let the police close in.
    const car = state.cars.find((c) => c.taxi);
    state.player.x = car.x; state.player.y = car.y;
    world.step(STEP, INPUT_IDLE, 1, null);
    state.wanted = 3;
    const drive = driveInput();
    for (let i = 0; i < 12 / STEP; i += 1) {
      world.step(STEP, drive, 0, null);
      state.wanted = Math.max(state.wanted, 3); // keep the heat on for the shot
      state.wantedTimer = 0;
    }
    return { screen: SCREEN_PLAY, best: 2500 };
  }
  // end: story complete panel over the hideout.
  state.storyDone = true;
  state.cash = 7350;
  state.carsStolen = 3;
  state.kills = 3;
  state.missionIndex = 4;
  state.player.x = 2200; state.player.y = 2200;
  for (let i = 0; i < 3 / STEP; i += 1) world.step(STEP, INPUT_IDLE, 0, null);
  return { screen: SCREEN_WIN, best: 7350 };
}
