// Boot and the one loop: input every frame, the world in fixed 1/60 s steps,
// the renderer paints what is there. Screens: title, play, paused, wasted,
// busted, story-complete. Progress saves to localStorage every few seconds
// and on mission completion.
// ?seed=N fixes the city. ?shot=start|play|chase|end stages that scene
// instead of running the loop and sets window.__shotReady for screenshots.
import { STEP, SAVE_KEY, BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_WASTED, EVENT_MISSION, EVENT_CRIME } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_PUNCH, ACTION_MUTE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_BUSTED, SCREEN_WIN } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage off */ }
}
function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeSave() {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.snapshot())); } catch { /* storage off */ }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  // Debug hook for headless verification (harmless in play).
  window.__game = { world, get screen() { return screen; } };
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;
  let hadSave = !!readSave();
  // One-shot presses survive until a simulation step consumes them: a
  // press that lands in a frame with no step to run must not be lost.
  let pendingActions = 0;

  function announce(message) { status.textContent = message; }

  function startGame(fresh) {
    if (fresh || !hadSave) {
      world.reset();
    } else {
      world.restore(readSave());
    }
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Neon Bay: Harbor Heat. Follow the mission banner.');
  }

  function endGame(kind) {
    screen = kind;
    if (world.state.cash > best) { best = world.state.cash; saveBest(best); }
    writeSave();
    audio.busted();
    announce(kind === SCREEN_BUSTED ? 'Busted by the police.' : 'Wasted.');
  }

  function step(actions) {
    const clicked = input.takeClick();
    const mouse = input.mouse;
    // Convert the pointer to world coordinates for shooting.
    const cam = renderer.camera;
    const mouseWorld = clicked
      ? { x: cam.x + mouse.x / cam.scale, y: cam.y + mouse.y / cam.scale, clicked: true }
      : null;
    const events = world.step(STEP, input, actions, mouseWorld);
    if (events & EVENT_WASTED) endGame(SCREEN_OVER);
    else if (events & EVENT_BUSTED) endGame(SCREEN_BUSTED);
    else if (events & EVENT_MISSION) {
      audio.chime();
      writeSave();
      if (world.state.storyDone) screen = SCREEN_WIN;
    }
    if (events & EVENT_CRIME) audio.crash();
    if (clicked && !world.state.player.inCar) audio.shot();
    if (actions & ACTION_PUNCH) audio.punch();
    // Engine + siren follow the world.
    const car = world.state.player.inCar;
    audio.setEngine(car ? Math.abs(car.speed) / 560 : 0, !!car);
    audio.setSiren(world.state.wanted > 0);
    saveTimer += STEP;
    if (saveTimer > 8) { saveTimer = 0; writeSave(); }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions() | pendingActions;
    pendingActions = 0;
    if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_BUSTED)) {
      startGame(screen !== SCREEN_TITLE);
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_WIN) {
      screen = SCREEN_PLAY;
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    // One-shot actions go to the first step only: passing them to every
    // step in this frame would toggle enter/exit twice in one frame.
    // If no step ran this frame, keep the world-bound bits for the next.
    if (screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP) {
        step(first ? actions : 0);
        first = false;
        accumulator -= STEP;
      }
      if (first) pendingActions = actions & (ACTION_ENTER | ACTION_PUNCH);
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Neon Bay: Harbor Heat. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
