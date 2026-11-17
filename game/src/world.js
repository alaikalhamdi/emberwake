// The rules of a night in the garden: the firefly, the Heartbloom, bolts, spores, nectar,
// waves, score and combo. `step` advances everything by one fixed step and reports what
// happened as event flags; it never draws and never reads the keyboard directly.
import { BLOOM, COMBO_WINDOW, FIELD, INTERMISSION, PLAYER, WAVE_COUNT } from './config.js';
import { createEnemy, edgePoint, ENEMY_TYPES, updateEnemy } from './enemies.js';
import { buildWave } from './waves.js';
import { createParticles } from './particles.js';

export const EVENT_WAVE_CLEAR = 1;
export const EVENT_LOST = 2;
export const EVENT_WON = 4;
export const EVENT_HURT = 8;

const THORN_REACH = 170;

function createPlayer() {
  return {
    x: BLOOM.x,
    y: BLOOM.y + 110,
    radius: PLAYER.radius,
    health: PLAYER.maxHealth,
    maxHealth: PLAYER.maxHealth,
    speed: PLAYER.speed,
    fireDelay: PLAYER.fireDelay,
    fireTimer: 0,
    bolts: 1,
    boltDamage: PLAYER.boltDamage,
    pierce: 0,
    dashCooldown: PLAYER.dashCooldown,
    dashReady: 0,
    dashLeft: 0,
    dashX: 0,
    dashY: 0,
    grace: 0,
    pickupReach: PLAYER.pickupReach,
    nova: false,
    wildfire: false,
    aim: -Math.PI / 2,
  };
}

function createBloom() {
  return { x: BLOOM.x, y: BLOOM.y, radius: BLOOM.radius, health: BLOOM.maxHealth, maxHealth: BLOOM.maxHealth, thorns: false, flash: 0 };
}

/** A new world driven by the seeded `random`. */
export function createWorld(random) {
  const particles = createParticles(random);
  const state = {};
  const sounds = [];

  function reset() {
    Object.assign(state, {
      player: createPlayer(),
      bloom: createBloom(),
      enemies: [],
      bolts: [],
      spores: [],
      nectar: [],
      wave: 0,
      waveName: '',
      queue: [],
      waveTotal: 0,
      spawnGap: 1,
      spawnTimer: 0,
      calm: 0,
      fighting: false,
      time: 0,
      score: 0,
      combo: 0,
      comboTimer: 0,
      bestCombo: 0,
      kills: 0,
      shake: 0,
      taken: {},
      banner: 0,
    });
    particles.clear();
    sounds.length = 0;
  }

  // The narrow view of the world that creature behaviours use.
  const facade = {
    random,
    get player() { return state.player; },
    fireSpore(x, y, angle, speed) {
      state.spores.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 4, radius: 6 });
    },
    summon(type, x, y) { state.enemies.push(createEnemy(type, x, y, random)); },
    sound(name) { sounds.push(name); },
    slowAt(x, y) {
      return state.bloom.thorns && Math.hypot(x - BLOOM.x, y - BLOOM.y) < THORN_REACH ? 0.45 : 1;
    },
  };

  /** Queue up wave `number` after a short calm. */
  function startWave(number) {
    const wave = buildWave(number, random);
    state.wave = number;
    state.waveName = wave.name;
    state.queue = wave.queue;
    state.waveTotal = wave.total;
    state.spawnGap = wave.gap;
    state.spawnTimer = 0;
    state.calm = number === 1 ? 1.2 : INTERMISSION;
    state.fighting = true;
    state.banner = state.calm + 1.4;
  }

  function takeBoon(boon) {
    boon.apply(state.player, state.bloom);
    state.taken[boon.id] = (state.taken[boon.id] ?? 0) + 1;
    sounds.push('boon');
  }

  function fire(player) {
    const spread = 0.13;
    for (let i = 0; i < player.bolts; i += 1) {
      const angle = player.aim + (i - (player.bolts - 1) / 2) * spread;
      state.bolts.push({
        x: player.x + Math.cos(angle) * 16,
        y: player.y + Math.sin(angle) * 16,
        vx: Math.cos(angle) * PLAYER.boltSpeed,
        vy: Math.sin(angle) * PLAYER.boltSpeed,
        life: PLAYER.boltLife,
        damage: player.boltDamage,
        pierce: player.pierce,
        hit: new Set(),
      });
    }
    sounds.push('shoot');
  }

  function novaBurst(player) {
    for (let i = 0; i < 14; i += 1) {
      const angle = (i / 14) * Math.PI * 2;
      state.bolts.push({ x: player.x, y: player.y, vx: Math.cos(angle) * 520, vy: Math.sin(angle) * 520, life: 0.5, damage: player.boltDamage, pierce: 1, hit: new Set() });
    }
    particles.burst(player.x, player.y, '#ffd27a', 30, 380, 4, 0.5);
  }

  function addScore(points, x, y) {
    const multiplier = 1 + Math.min(4, Math.floor(state.combo / 6));
    const gained = points * multiplier;
    state.score += gained;
    particles.label(x, y - 14, multiplier > 1 ? `+${gained} ×${multiplier}` : `+${gained}`, multiplier > 1 ? '#ffd27a' : '#f4ead5', points >= 500 ? 2 : 1);
  }

  function damageEnemy(enemy, amount) {
    enemy.health -= amount;
    enemy.flash = 0.08;
    if (enemy.health > 0) { sounds.push('hit'); return; }
    killEnemy(enemy);
  }

  function killEnemy(enemy) {
    if (!enemy.alive) return;
    enemy.alive = false;
    const spec = ENEMY_TYPES[enemy.type];
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = COMBO_WINDOW;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    addScore(spec.score, enemy.x, enemy.y);
    particles.burst(enemy.x, enemy.y, spec.color, enemy.type === 'warden' ? 160 : 18, enemy.type === 'warden' ? 520 : 240, 4, 0.7);
    particles.burst(enemy.x, enemy.y, '#ffb347', 6, 160, 2.5, 0.4);
    sounds.push(enemy.type === 'warden' ? 'bosskill' : 'kill');
    state.shake = Math.max(state.shake, enemy.type === 'warden' ? 22 : 3);
    if (enemy.type === 'husk') {
      for (let i = 0; i < 3; i += 1) state.enemies.push(createEnemy('mite', enemy.x + random.range(-14, 14), enemy.y + random.range(-14, 14), random));
    }
    const drops = enemy.type === 'warden' ? 14 : random.next() < 0.3 ? 1 : 0;
    for (let i = 0; i < drops; i += 1) {
      state.nectar.push({ x: enemy.x + random.range(-30, 30), y: enemy.y + random.range(-30, 30), life: 9, bob: random.range(0, 6) });
    }
    if (state.player.wildfire && random.next() < 0.3) {
      particles.burst(enemy.x, enemy.y, '#ff7a3d', 26, 300, 4, 0.5);
      for (const other of state.enemies) {
        if (other.alive && other !== enemy && Math.hypot(other.x - enemy.x, other.y - enemy.y) < 80) damageEnemy(other, 2);
      }
    }
  }

  function hurtPlayer(amount) {
    const player = state.player;
    if (player.grace > 0 || player.dashLeft > 0) return 0;
    player.health = Math.max(0, player.health - amount);
    player.grace = PLAYER.hurtGrace;
    state.shake = Math.max(state.shake, 10);
    state.combo = 0;
    particles.burst(player.x, player.y, '#ff4d5e', 24, 260, 3.5, 0.6);
    sounds.push('hurt');
    return EVENT_HURT;
  }

  function hurtBloom(amount, x, y) {
    const bloom = state.bloom;
    bloom.health = Math.max(0, bloom.health - amount);
    bloom.flash = 0.25;
    state.shake = Math.max(state.shake, 6);
    particles.burst(x, y, '#ff6fa8', 14, 200, 3, 0.6);
    sounds.push('bloomhit');
  }

  function stepPlayer(dt, intent) {
    const player = state.player;
    player.aim = Math.atan2(intent.aimY - player.y, intent.aimX - player.x);
    player.grace = Math.max(0, player.grace - dt);
    player.dashReady = Math.max(0, player.dashReady - dt);
    if (intent.dash && player.dashReady <= 0 && player.dashLeft <= 0) {
      const mx = intent.moveX || Math.cos(player.aim);
      const my = intent.moveY || Math.sin(player.aim);
      const length = Math.hypot(mx, my) || 1;
      player.dashX = mx / length;
      player.dashY = my / length;
      player.dashLeft = PLAYER.dashTime;
      player.dashReady = player.dashCooldown;
      sounds.push('dash');
      if (player.nova) novaBurst(player);
    }
    let vx = intent.moveX * player.speed;
    let vy = intent.moveY * player.speed;
    if (player.dashLeft > 0) {
      player.dashLeft -= dt;
      vx = player.dashX * PLAYER.dashSpeed;
      vy = player.dashY * PLAYER.dashSpeed;
      particles.trail(player.x, player.y, '#ffd27a', 4);
    }
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + vx * dt));
    player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + vy * dt));
    player.fireTimer -= dt;
    if (intent.fire && player.fireTimer <= 0) {
      fire(player);
      player.fireTimer = player.fireDelay;
    }
  }

  function stepSpawning(dt) {
    if (state.calm > 0) { state.calm -= dt; return; }
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.queue.length > 0) {
      const type = state.queue.shift();
      const at = edgePoint(random);
      state.enemies.push(createEnemy(type, at.x, at.y, random));
      state.spawnTimer = state.spawnGap * random.range(0.6, 1.3);
    }
  }

  function stepBolts(dt) {
    for (const bolt of state.bolts) {
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      for (const enemy of state.enemies) {
        if (!enemy.alive || bolt.life <= 0 || bolt.hit.has(enemy)) continue;
        if (Math.hypot(enemy.x - bolt.x, enemy.y - bolt.y) < enemy.radius + PLAYER.boltRadius) {
          bolt.hit.add(enemy);
          damageEnemy(enemy, bolt.damage);
          particles.burst(bolt.x, bolt.y, '#fff3c4', 4, 140, 2, 0.25);
          if (bolt.pierce > 0) bolt.pierce -= 1;
          else bolt.life = 0;
        }
      }
    }
    state.bolts = state.bolts.filter((b) => b.life > 0 && b.x > -20 && b.x < FIELD.width + 20 && b.y > -20 && b.y < FIELD.height + 20);
  }

  function stepEnemies(dt) {
    let events = 0;
    const player = state.player;
    const bloom = state.bloom;
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      updateEnemy(enemy, facade, dt);
      const spec = ENEMY_TYPES[enemy.type];
      if (Math.hypot(enemy.x - bloom.x, enemy.y - bloom.y) < enemy.radius + bloom.radius) {
        hurtBloom(spec.bloomDamage, enemy.x, enemy.y);
        if (enemy.type === 'warden') {
          // The boss rebounds instead of dying on the bloom.
          const angle = Math.atan2(enemy.y - bloom.y, enemy.x - bloom.x);
          enemy.x = bloom.x + Math.cos(angle) * (bloom.radius + enemy.radius + 60);
          enemy.y = bloom.y + Math.sin(angle) * (bloom.radius + enemy.radius + 60);
          enemy.mode = 'approach';
          enemy.timer = 1.5;
        } else {
          enemy.alive = false;
          state.combo = 0;
        }
        continue;
      }
      const touching = Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.radius + player.radius;
      if (touching && player.dashLeft > 0 && !enemy.dashedBy) {
        enemy.dashedBy = true;
        damageEnemy(enemy, 2 + player.boltDamage);
      } else if (touching) {
        events |= hurtPlayer(spec.playerDamage);
      }
      if (player.dashLeft <= 0) enemy.dashedBy = false;
    }
    state.enemies = state.enemies.filter((e) => e.alive);
    return events;
  }

  function stepSpores(dt) {
    let events = 0;
    const player = state.player;
    for (const spore of state.spores) {
      spore.x += spore.vx * dt;
      spore.y += spore.vy * dt;
      spore.life -= dt;
      if (Math.hypot(spore.x - player.x, spore.y - player.y) < spore.radius + player.radius && player.grace <= 0 && player.dashLeft <= 0) {
        events |= hurtPlayer(1);
        spore.life = 0;
      } else if (Math.hypot(spore.x - BLOOM.x, spore.y - BLOOM.y) < spore.radius + BLOOM.radius) {
        hurtBloom(4, spore.x, spore.y);
        spore.life = 0;
      }
    }
    state.spores = state.spores.filter((s) => s.life > 0 && s.x > -40 && s.x < FIELD.width + 40 && s.y > -40 && s.y < FIELD.height + 40);
    return events;
  }

  function stepNectar(dt) {
    const player = state.player;
    for (const drop of state.nectar) {
      drop.life -= dt;
      drop.bob += dt * 4;
      const distance = Math.hypot(player.x - drop.x, player.y - drop.y);
      if (distance < player.pickupReach) {
        drop.x += ((player.x - drop.x) / distance) * 420 * dt;
        drop.y += ((player.y - drop.y) / distance) * 420 * dt;
      }
      if (distance < player.radius + 10) {
        drop.life = 0;
        state.bloom.health = Math.min(state.bloom.maxHealth, state.bloom.health + 3);
        addScore(5, drop.x, drop.y);
        particles.burst(drop.x, drop.y, '#7ef9ff', 10, 160, 2.5, 0.4);
        sounds.push('nectar');
      }
    }
    state.nectar = state.nectar.filter((d) => d.life > 0);
  }

  /** Advance the night by `dt` with this frame's `intent`; returns EVENT_* flags. */
  function step(dt, intent) {
    let events = 0;
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 30);
    state.banner = Math.max(0, state.banner - dt);
    state.bloom.flash = Math.max(0, state.bloom.flash - dt);
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
    stepPlayer(dt, intent);
    if (state.fighting) stepSpawning(dt);
    stepBolts(dt);
    events |= stepEnemies(dt);
    events |= stepSpores(dt);
    stepNectar(dt);
    particles.update(dt);
    if (state.player.health <= 0 || state.bloom.health <= 0) {
      state.fighting = false;
      sounds.push('lose');
      return events | EVENT_LOST;
    }
    if (state.fighting && state.calm <= 0 && state.queue.length === 0 && state.enemies.length === 0) {
      state.fighting = false;
      state.spores = [];
      if (state.wave >= WAVE_COUNT) { sounds.push('win'); return events | EVENT_WON; }
      sounds.push('clear');
      return events | EVENT_WAVE_CLEAR;
    }
    return events;
  }

  /** The sound cues raised since the last call, oldest first. */
  function drainSounds() {
    return sounds.splice(0, sounds.length);
  }

  reset();
  return { state, particles, reset, startWave, takeBoon, step, drainSounds };
}
