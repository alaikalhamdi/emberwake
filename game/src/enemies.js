// The gloom: five kinds of shadow creature that come for the Heartbloom, each with its own
// way of moving and attacking. `ENEMY_TYPES` holds their stats; `updateEnemy` runs one
// creature's behaviour for a step, talking to the world only through the `world` facade.
import { BLOOM, FIELD } from './config.js';

export const ENEMY_TYPES = {
  // Drifts toward the Heartbloom on a lazy wave and bites it on arrival.
  moth: { radius: 12, health: 2, speed: 72, bloomDamage: 6, playerDamage: 1, score: 10, color: '#9b7bff' },
  // Small fragments left behind when a husk bursts.
  mite: { radius: 8, health: 1, speed: 118, bloomDamage: 3, playerDamage: 1, score: 5, color: '#c3a6ff' },
  // Hunts the firefly: freezes, flashes, then lunges in a straight line.
  darter: { radius: 11, health: 2, speed: 95, bloomDamage: 4, playerDamage: 1, score: 20, color: '#ff5d8f' },
  // Slow and heavy; bursts into three mites when it dies.
  husk: { radius: 21, health: 7, speed: 42, bloomDamage: 14, playerDamage: 1, score: 30, color: '#6a4bc4' },
  // Circles at range and lobs spores at whichever light is closer.
  spitter: { radius: 14, health: 3, speed: 80, bloomDamage: 5, playerDamage: 1, score: 25, color: '#7fd65a' },
  // The final wave's boss: rings of spores, summons, and charges.
  warden: { radius: 46, health: 230, speed: 55, bloomDamage: 30, playerDamage: 2, score: 1000, color: '#3b1f6e' },
};

/** A new creature of `type` at (x, y). */
export function createEnemy(type, x, y, random) {
  const spec = ENEMY_TYPES[type];
  return {
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: spec.radius,
    health: spec.health,
    maxHealth: spec.health,
    timer: random.range(0, 2),
    phase: random.range(0, Math.PI * 2),
    mode: 'approach',
    flash: 0,
    alive: true,
  };
}

/** A point just outside a random edge of the field. */
export function edgePoint(random) {
  const side = random.int(0, 3);
  const margin = 40;
  if (side === 0) return { x: random.range(0, FIELD.width), y: -margin };
  if (side === 1) return { x: FIELD.width + margin, y: random.range(0, FIELD.height) };
  if (side === 2) return { x: random.range(0, FIELD.width), y: FIELD.height + margin };
  return { x: -margin, y: random.range(0, FIELD.height) };
}

function steer(enemy, tx, ty, speed) {
  const dx = tx - enemy.x;
  const dy = ty - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  enemy.vx = (dx / length) * speed;
  enemy.vy = (dy / length) * speed;
  return length;
}

function updateMoth(enemy, world, dt, speed) {
  enemy.phase += dt * 3;
  steer(enemy, BLOOM.x, BLOOM.y, speed);
  // A sideways sway so moths flutter rather than march.
  const sway = Math.sin(enemy.phase) * speed * 0.6;
  const length = Math.hypot(enemy.vx, enemy.vy) || 1;
  enemy.vx += (-enemy.vy / length) * sway;
  enemy.vy += (enemy.vx / length) * sway * 0.2;
}

function updateDarter(enemy, world, dt) {
  const player = world.player;
  enemy.timer -= dt;
  if (enemy.mode === 'approach') {
    const distance = steer(enemy, player.x, player.y, ENEMY_TYPES.darter.speed);
    if (distance < 300 && enemy.timer <= 0) { enemy.mode = 'aim'; enemy.timer = 0.55; }
  } else if (enemy.mode === 'aim') {
    enemy.vx *= 0.85;
    enemy.vy *= 0.85;
    if (enemy.timer <= 0) {
      steer(enemy, player.x, player.y, 560);
      enemy.mode = 'lunge';
      enemy.timer = 0.38;
      world.sound('lunge');
    }
  } else if (enemy.timer <= 0) {
    enemy.mode = 'approach';
    enemy.timer = 1.4;
  }
}

function updateSpitter(enemy, world, dt) {
  enemy.phase += dt * 0.45;
  const orbit = 270;
  const tx = BLOOM.x + Math.cos(enemy.phase) * orbit;
  const ty = BLOOM.y + Math.sin(enemy.phase) * orbit * 0.62;
  steer(enemy, tx, ty, ENEMY_TYPES.spitter.speed);
  enemy.timer -= dt;
  if (enemy.timer <= 0) {
    enemy.timer = 2.3;
    const player = world.player;
    const toPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    const toBloom = Math.hypot(BLOOM.x - enemy.x, BLOOM.y - enemy.y);
    const target = toPlayer < toBloom ? player : BLOOM;
    world.fireSpore(enemy.x, enemy.y, Math.atan2(target.y - enemy.y, target.x - enemy.x), 230);
  }
}

function updateWarden(enemy, world, dt) {
  enemy.timer -= dt;
  enemy.phase += dt * 0.6;
  const enraged = enemy.health < enemy.maxHealth * 0.45;
  if (enemy.mode === 'approach') {
    // Hover in a slow figure-eight around the Heartbloom.
    const tx = BLOOM.x + Math.cos(enemy.phase) * 330;
    const ty = BLOOM.y + Math.sin(enemy.phase * 2) * 170;
    steer(enemy, tx, ty, ENEMY_TYPES.warden.speed * (enraged ? 1.6 : 1));
    if (enemy.timer <= 0) {
      const roll = world.random.next();
      if (roll < 0.45) {
        const count = enraged ? 22 : 16;
        const spin = world.random.range(0, Math.PI);
        for (let i = 0; i < count; i += 1) world.fireSpore(enemy.x, enemy.y, spin + (i / count) * Math.PI * 2, 170);
        world.sound('roar');
        enemy.timer = enraged ? 1.6 : 2.4;
      } else if (roll < 0.75) {
        for (let i = 0; i < (enraged ? 4 : 3); i += 1) world.summon('moth', enemy.x + world.random.range(-40, 40), enemy.y + world.random.range(-40, 40));
        world.sound('roar');
        enemy.timer = 2.6;
      } else {
        enemy.mode = 'windup';
        enemy.timer = 0.9;
      }
    }
  } else if (enemy.mode === 'windup') {
    enemy.vx *= 0.9;
    enemy.vy *= 0.9;
    if (enemy.timer <= 0) {
      steer(enemy, world.player.x, world.player.y, 470);
      enemy.mode = 'charge';
      enemy.timer = 0.8;
      world.sound('lunge');
    }
  } else if (enemy.timer <= 0) {
    enemy.mode = 'approach';
    enemy.timer = 1.8;
  }
}

/** Advance one creature by `dt`. `world` offers player, random, fireSpore, summon and sound. */
export function updateEnemy(enemy, world, dt) {
  const spec = ENEMY_TYPES[enemy.type];
  if (enemy.type === 'moth' || enemy.type === 'mite' || enemy.type === 'husk') updateMoth(enemy, world, dt, spec.speed);
  else if (enemy.type === 'darter') updateDarter(enemy, world, dt);
  else if (enemy.type === 'spitter') updateSpitter(enemy, world, dt);
  else if (enemy.type === 'warden') updateWarden(enemy, world, dt);
  const slow = world.slowAt(enemy.x, enemy.y);
  enemy.x += enemy.vx * dt * slow;
  enemy.y += enemy.vy * dt * slow;
  enemy.flash = Math.max(0, enemy.flash - dt);
}
