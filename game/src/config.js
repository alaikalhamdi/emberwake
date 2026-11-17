// Every tuning number of Emberwake in one place: the field, the firefly, the Heartbloom,
// the palette and the run's length. Gameplay code reads these and never hard-codes its own.

/** The play field in logical pixels; the canvas scales it to fit the window. */
export const FIELD = { width: 1280, height: 720 };

/** Fixed simulation step in seconds. */
export const STEP = 1 / 60;

/** The run is won by clearing this many waves; the last one is the Gloomwarden. */
export const WAVE_COUNT = 10;

/** Seconds of calm between a cleared wave and the next (after a boon is chosen). */
export const INTERMISSION = 2.2;

export const PLAYER = {
  radius: 13,
  speed: 290,
  maxHealth: 5,
  fireDelay: 0.16,
  boltSpeed: 720,
  boltDamage: 1,
  boltRadius: 5,
  boltLife: 0.9,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 1.6,
  hurtGrace: 1.0,
  pickupReach: 70,
};

export const BLOOM = {
  x: FIELD.width / 2,
  y: FIELD.height / 2 + 10,
  radius: 38,
  maxHealth: 100,
};

/** Seconds a combo survives without a new kill. */
export const COMBO_WINDOW = 2.4;

/** localStorage key for the best score. */
export const BEST_KEY = 'emberwake.best';

/** A night-garden palette: deep teal ground, warm ember light, violet gloom. */
export const COLORS = {
  sky: '#071317',
  groundA: '#0c2226',
  groundB: '#0a1b1f',
  grass: '#16393a',
  grassLight: '#24594f',
  stone: '#1b2c30',
  ember: '#ffb347',
  emberCore: '#fff3c4',
  bloom: '#ff6fa8',
  bloomCore: '#ffe1ef',
  gloom: '#8b5cf6',
  gloomDark: '#2a1846',
  spore: '#b6f36b',
  nectar: '#7ef9ff',
  danger: '#ff4d5e',
  text: '#f4ead5',
  textDim: '#a9b8b0',
  panel: 'rgba(6, 16, 19, 0.82)',
};
