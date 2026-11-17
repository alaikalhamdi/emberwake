// The screenshot scenes behind ?shot=play|boons|end|title. Each plays the real rules from a
// fresh night, steered by the autopilot and taking the first boon offered after each wave,
// until the moment the scene wants. The same seed always gives the same frame.
import { STEP } from './config.js';
import { autopilot } from './autopilot.js';
import { EVENT_LOST, EVENT_WAVE_CLEAR, EVENT_WON } from './world.js';
import { offerBoons } from './upgrades.js';

const LIMIT_SECONDS = 900;

/** Stop rules for each scene: the wave to reach and how far into it. */
const SCENES = {
  play: { wave: 10, seconds: 7.5, caution: 1 },
  boons: { clearWave: 4, caution: 1 },
  end: { caution: 1 },
};

/**
 * Stage scene `name` in `world` and return { screen, offer } for main.js to draw:
 * screen is 'play', 'boons', 'lost', 'won' or 'title'.
 */
export function stageShot(name, world, random) {
  world.reset();
  if (!SCENES[name]) {
    // Title: the demo guardian has been holding the first wave for a few seconds.
    world.startWave(1);
    for (let t = 0; t < 7; t += STEP) world.step(STEP, autopilot(world.state, 1));
    return { screen: 'title', offer: [] };
  }
  const scene = SCENES[name];
  world.startWave(1);
  let waveTime = 0;
  for (let t = 0; t < LIMIT_SECONDS; t += STEP) {
    const events = world.step(STEP, autopilot(world.state, scene.caution));
    waveTime += STEP;
    if (events & EVENT_LOST) return { screen: 'lost', offer: [] };
    if (events & EVENT_WON) return { screen: 'won', offer: [] };
    if (events & EVENT_WAVE_CLEAR) {
      const offer = offerBoons(world.state.taken, random);
      if (scene.clearWave === world.state.wave) return { screen: 'boons', offer };
      world.takeBoon(offer[0]);
      world.startWave(world.state.wave + 1);
      waveTime = 0;
    }
    if (scene.wave === world.state.wave && waveTime >= scene.seconds) return { screen: 'play', offer: [] };
  }
  return { screen: 'play', offer: [] };
}
