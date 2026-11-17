// Boot and the game loop. Input is read each frame, the world advances in fixed steps, and
// the screen machine moves between title, play, boon choice, pause, defeat and victory.
// ?seed=N fixes the night; ?shot=play|boons|end|title stages a screenshot scene instead.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_LOST, EVENT_WAVE_CLEAR, EVENT_WON } from './world.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { offerBoons } from './upgrades.js';
import { autopilot } from './autopilot.js';
import { stageShot } from './shots.js';
import { boonCardRects, drawBoons, drawEnd, drawHud, drawPaused, drawTitle } from './hud.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
let seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
let random = createRandom(seed);
let world = createWorld(random);
const renderer = createRenderer(canvas);
const input = createInput(canvas, renderer.view);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage may be blocked; the best score then lasts this visit only.
  }
}

let best = readBest();
let screen = 'title';
let offer = [];
let hover = -1;
let clock = 0;

function announce(message) {
  status.textContent = message;
}

/** A fresh night: new seed (unless fixed), new garden, wave one. */
function newRun() {
  if (!Number.isInteger(seedParam)) seed = Math.floor(Math.random() * 4294967296);
  random = createRandom(seed);
  world = createWorld(random);
  renderer.garden(seed);
  world.startWave(1);
  screen = 'play';
  announce('Wave 1 begins. Protect the Heartbloom.');
}

function startDemo() {
  world.reset();
  world.startWave(1);
}

function finish(won) {
  screen = won ? 'won' : 'lost';
  if (world.state.score > best) {
    best = world.state.score;
    saveBest(best);
  }
  announce(won ? `Victory. Score ${world.state.score}.` : `Defeat on wave ${world.state.wave}. Score ${world.state.score}.`);
}

function chooseBoon(index) {
  if (index < 0 || index >= offer.length) return;
  world.takeBoon(offer[index]);
  world.startWave(world.state.wave + 1);
  screen = 'play';
  announce(`${offer[index].name} chosen. Wave ${world.state.wave} begins.`);
}

function cardAt(x, y) {
  return boonCardRects(offer.length).findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

function update(dt, intent) {
  if (intent.mute) audio.toggleMute();
  if (screen === 'title') {
    // The demo guardian plays behind the title until someone takes over.
    const events = world.step(dt, autopilot(world.state, 1));
    if (events & (EVENT_LOST | EVENT_WON | EVENT_WAVE_CLEAR)) startDemo();
    world.drainSounds();
    if (intent.confirm) { audio.ensure(); audio.play('select'); newRun(); }
    return;
  }
  if (screen === 'play') {
    if (intent.pause) { screen = 'paused'; return; }
    const events = world.step(dt, intent);
    if (events & EVENT_LOST) finish(false);
    else if (events & EVENT_WON) finish(true);
    else if (events & EVENT_WAVE_CLEAR) {
      offer = offerBoons(world.state.taken, random);
      screen = 'boons';
      announce(`Wave ${world.state.wave} cleared. Choose a boon with 1, 2 or 3.`);
    }
    for (const cue of world.drainSounds()) audio.play(cue);
    return;
  }
  if (screen === 'boons') {
    hover = cardAt(intent.aimX, intent.aimY);
    if (intent.choice >= 0) chooseBoon(intent.choice);
    else if (intent.clickX !== null) chooseBoon(cardAt(intent.clickX, intent.clickY));
    return;
  }
  if (screen === 'paused') {
    if (intent.pause) screen = 'play';
    else if (intent.restart) newRun();
    return;
  }
  // Defeat or victory.
  if (intent.restart || intent.confirm) { audio.play('select'); newRun(); }
}

function overlay(g) {
  const state = world.state;
  if (screen === 'title') drawTitle(g, best, clock);
  else if (screen === 'play') drawHud(g, state, best, audio.isMuted());
  else if (screen === 'boons') { drawHud(g, state, best, audio.isMuted()); drawBoons(g, state, offer, hover); }
  else if (screen === 'paused') { drawHud(g, state, best, audio.isMuted()); drawPaused(g); }
  else drawEnd(g, state, best, screen === 'won', clock);
}

let last = 0;
let carry = 0;
function frame(now) {
  const elapsed = Math.min(MAX_FRAME, last === 0 ? 0 : (now - last) / 1000);
  last = now;
  clock += elapsed;
  carry += elapsed;
  const intent = input.read();
  let first = true;
  while (carry >= STEP) {
    // One-frame presses apply to the first step only.
    update(STEP, first ? intent : { ...intent, confirm: false, pause: false, mute: false, restart: false, choice: -1, clickX: null, clickY: null });
    first = false;
    carry -= STEP;
  }
  if (first && (intent.confirm || intent.pause || intent.mute || intent.restart || intent.choice >= 0)) update(0, intent);
  renderer.draw(world, overlay);
  window.requestAnimationFrame(frame);
}

if (shot) {
  renderer.garden(seed);
  const staged = stageShot(shot, world, random);
  screen = staged.screen;
  offer = staged.offer;
  hover = offer.length > 1 ? 1 : -1;
  clock = 0.5;
  renderer.draw(world, overlay);
  window.requestAnimationFrame(() => {
    renderer.draw(world, overlay);
    window.__shotReady = true;
  });
} else {
  renderer.garden(seed);
  startDemo();
  announce('Emberwake. Click or press Enter to begin.');
  window.requestAnimationFrame(frame);
}
