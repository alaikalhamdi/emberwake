// Sparks, petals and score pops: short-lived visual feedback. The world spawns them on
// hits, kills and pickups; the renderer draws them with additive light.

/** A capped pool of particles and floating labels. */
export function createParticles(random) {
  const sparks = [];
  const labels = [];
  const MAX_SPARKS = 900;

  function burst(x, y, color, count, speed, size = 3, life = 0.6) {
    for (let i = 0; i < count; i += 1) {
      if (sparks.length >= MAX_SPARKS) sparks.shift();
      const angle = random.range(0, Math.PI * 2);
      const velocity = random.range(speed * 0.25, speed);
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: random.range(life * 0.5, life),
        max: life,
        size: random.range(size * 0.5, size),
        color,
      });
    }
  }

  function trail(x, y, color, size = 2.5) {
    if (sparks.length >= MAX_SPARKS) sparks.shift();
    sparks.push({ x, y, vx: random.range(-20, 20), vy: random.range(-20, 20), life: 0.25, max: 0.25, size, color });
  }

  function label(x, y, text, color, scale = 1) {
    labels.push({ x, y, text, color, scale, life: 0.9, max: 0.9 });
  }

  function update(dt) {
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.92;
      s.vy *= 0.92;
    }
    for (let i = labels.length - 1; i >= 0; i -= 1) {
      const l = labels[i];
      l.life -= dt;
      l.y -= 38 * dt;
      if (l.life <= 0) labels.splice(i, 1);
    }
  }

  function clear() {
    sparks.length = 0;
    labels.length = 0;
  }

  return { sparks, labels, burst, trail, label, update, clear };
}
