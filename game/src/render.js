// Paints the night garden: a pre-baked ground, the Heartbloom, the firefly, the gloom, bolts,
// spores and nectar, then a darkness layer cut open by every light, then sparks in additive
// light. It reads the world's state and never changes it.
import { BLOOM, COLORS, FIELD } from './config.js';
import { ENEMY_TYPES } from './enemies.js';
import { createRandom } from './random.js';

/** Bake the garden floor once: ground tones, mossy stones, grass tufts and tiny flowers. */
function bakeGarden(seed) {
  const random = createRandom(seed ^ 0x5eed);
  const canvas = document.createElement('canvas');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const g = canvas.getContext('2d');
  const ground = g.createRadialGradient(BLOOM.x, BLOOM.y, 40, BLOOM.x, BLOOM.y, 820);
  ground.addColorStop(0, '#163a3a');
  ground.addColorStop(0.45, COLORS.groundA);
  ground.addColorStop(1, COLORS.sky);
  g.fillStyle = ground;
  g.fillRect(0, 0, FIELD.width, FIELD.height);
  // A worn ring of soil the guardians have walked around the bloom.
  g.strokeStyle = 'rgba(70, 52, 40, 0.35)';
  g.lineWidth = 46;
  g.beginPath();
  g.ellipse(BLOOM.x, BLOOM.y, 150, 120, 0, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 26; i += 1) {
    const x = random.range(0, FIELD.width);
    const y = random.range(0, FIELD.height);
    if (Math.hypot(x - BLOOM.x, y - BLOOM.y) < 200) continue;
    const r = random.range(14, 38);
    g.fillStyle = COLORS.stone;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.7, random.range(0, 3), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(80, 140, 90, 0.25)';
    g.beginPath();
    g.ellipse(x - r * 0.2, y - r * 0.25, r * 0.6, r * 0.35, 0, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 1400; i += 1) {
    const x = random.range(0, FIELD.width);
    const y = random.range(0, FIELD.height);
    const h = random.range(5, 14);
    g.strokeStyle = random.next() < 0.3 ? COLORS.grassLight : COLORS.grass;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + random.range(-3, 3), y - h / 2, x + random.range(-5, 5), y - h);
    g.stroke();
  }
  const petals = ['#ff8fb8', '#ffd27a', '#9fd8ff', '#c9a4ff'];
  for (let i = 0; i < 90; i += 1) {
    const x = random.range(0, FIELD.width);
    const y = random.range(0, FIELD.height);
    g.fillStyle = random.pick(petals);
    g.globalAlpha = 0.55;
    for (let k = 0; k < 5; k += 1) {
      const a = (k / 5) * Math.PI * 2;
      g.beginPath();
      g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  return canvas;
}

function glow(g, x, y, radius, color, alpha = 1) {
  const gradient = g.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = alpha;
  g.fillStyle = gradient;
  g.beginPath();
  g.arc(x, y, radius, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
}

function drawBloom(g, bloom, time) {
  const life = bloom.health / bloom.maxHealth;
  if (bloom.thorns) {
    g.strokeStyle = 'rgba(182, 243, 107, 0.25)';
    g.setLineDash([6, 10]);
    g.lineWidth = 2;
    g.beginPath();
    g.arc(bloom.x, bloom.y, 170, time * 0.2, time * 0.2 + Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }
  // Leaves.
  g.fillStyle = '#2f7a4f';
  for (let i = 0; i < 4; i += 1) {
    const a = i * (Math.PI / 2) + Math.PI / 4;
    g.beginPath();
    g.ellipse(bloom.x + Math.cos(a) * 40, bloom.y + Math.sin(a) * 40, 30, 11, a, 0, Math.PI * 2);
    g.fill();
  }
  // Petals that breathe and close up as the bloom is hurt.
  const open = 0.55 + life * 0.45;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + Math.sin(time * 0.8) * 0.05;
    const reach = bloom.radius * open;
    g.fillStyle = bloom.flash > 0 ? '#ffffff' : i % 2 ? COLORS.bloom : '#ff8fbf';
    g.beginPath();
    g.ellipse(bloom.x + Math.cos(a) * reach * 0.6, bloom.y + Math.sin(a) * reach * 0.6, reach * 0.62, reach * 0.3, a, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = COLORS.bloomCore;
  g.beginPath();
  g.arc(bloom.x, bloom.y, 11 + Math.sin(time * 3) * 1.5, 0, Math.PI * 2);
  g.fill();
}

function drawPlayer(g, player, time) {
  if (player.grace > 0 && Math.floor(time * 20) % 2 === 0) return;
  const flap = Math.sin(time * 40) * 0.5 + 0.5;
  g.save();
  g.translate(player.x, player.y);
  g.rotate(player.aim + Math.PI / 2);
  g.fillStyle = 'rgba(220, 240, 255, 0.55)';
  g.beginPath();
  g.ellipse(-9, -2, 9, 4 + flap * 3, -0.6, 0, Math.PI * 2);
  g.ellipse(9, -2, 9, 4 + flap * 3, 0.6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3a2a1e';
  g.beginPath();
  g.ellipse(0, -4, 5, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = COLORS.ember;
  g.beginPath();
  g.ellipse(0, 6, 7, 9, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = COLORS.emberCore;
  g.beginPath();
  g.arc(0, 7, 4, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // Aim reticle.
  g.strokeStyle = 'rgba(255, 210, 122, 0.5)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(player.x + Math.cos(player.aim) * 34, player.y + Math.sin(player.aim) * 34, 4, 0, Math.PI * 2);
  g.stroke();
}

function drawWings(g, enemy, spec, time, span) {
  const flap = Math.sin(time * 14 + enemy.phase) * 0.35;
  g.fillStyle = spec.color;
  g.beginPath();
  g.ellipse(-span * 0.55, 0, span * 0.6, span * (0.38 + flap * 0.2), -0.4 + flap, 0, Math.PI * 2);
  g.ellipse(span * 0.55, 0, span * 0.6, span * (0.38 + flap * 0.2), 0.4 - flap, 0, Math.PI * 2);
  g.fill();
}

function drawEyes(g, spacing, y, size, color) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(-spacing, y, size, 0, Math.PI * 2);
  g.arc(spacing, y, size, 0, Math.PI * 2);
  g.fill();
}

function drawEnemy(g, enemy, time) {
  const spec = ENEMY_TYPES[enemy.type];
  const r = enemy.radius;
  g.save();
  g.translate(enemy.x, enemy.y);
  if (enemy.type === 'moth' || enemy.type === 'mite') {
    drawWings(g, enemy, spec, time, r * 1.6);
    g.fillStyle = COLORS.gloomDark;
    g.beginPath();
    g.ellipse(0, 0, r * 0.45, r * 0.8, 0, 0, Math.PI * 2);
    g.fill();
    drawEyes(g, r * 0.22, -r * 0.35, 2, '#ffe36e');
  } else if (enemy.type === 'darter') {
    g.rotate(Math.atan2(enemy.vy, enemy.vx));
    if (enemy.mode === 'aim') {
      g.strokeStyle = 'rgba(255, 77, 94, 0.5)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(r, 0);
      g.lineTo(r + 200, 0);
      g.stroke();
    }
    g.fillStyle = enemy.mode === 'aim' && Math.floor(time * 16) % 2 ? '#ffffff' : spec.color;
    g.beginPath();
    g.moveTo(r * 1.5, 0);
    g.lineTo(-r, -r * 0.9);
    g.lineTo(-r * 0.4, 0);
    g.lineTo(-r, r * 0.9);
    g.closePath();
    g.fill();
  } else if (enemy.type === 'husk') {
    g.fillStyle = spec.color;
    g.beginPath();
    for (let i = 0; i <= 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      const wobble = r * (0.85 + 0.15 * Math.sin(a * 3 + time * 2 + enemy.phase));
      if (i === 0) g.moveTo(Math.cos(a) * wobble, Math.sin(a) * wobble);
      else g.lineTo(Math.cos(a) * wobble, Math.sin(a) * wobble);
    }
    g.fill();
    g.strokeStyle = '#c9a4ff';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-r * 0.5, -r * 0.2);
    g.lineTo(0, r * 0.1);
    g.lineTo(r * 0.4, -r * 0.3);
    g.stroke();
    drawEyes(g, r * 0.3, -r * 0.45, 3, '#ffe36e');
  } else if (enemy.type === 'spitter') {
    const pulse = 1 + Math.sin(time * 6 + enemy.phase) * 0.08;
    g.fillStyle = '#2f5a2a';
    g.beginPath();
    g.arc(0, 0, r * pulse, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = spec.color;
    g.beginPath();
    g.arc(0, -r * 0.2, r * 0.6 * pulse, 0, Math.PI * 2);
    g.fill();
    drawEyes(g, r * 0.25, -r * 0.3, 2.2, '#1a1a1a');
  } else if (enemy.type === 'warden') {
    const breathe = 1 + Math.sin(time * 2) * 0.04;
    glow(g, 0, 0, r * 2.2, 'rgba(139, 92, 246, 0.45)');
    drawWings(g, enemy, { color: '#24133f' }, time * 0.4, r * 1.6);
    g.fillStyle = spec.color;
    g.beginPath();
    g.ellipse(0, 0, r * 0.8 * breathe, r * breathe, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#120a22';
    for (let i = 0; i < 5; i += 1) {
      const x = (i - 2) * r * 0.28;
      g.beginPath();
      g.moveTo(x - 7, -r * 0.8);
      g.lineTo(x, -r * (1.35 + (i === 2 ? 0.25 : 0)));
      g.lineTo(x + 7, -r * 0.8);
      g.fill();
    }
    const eye = enemy.mode === 'windup' ? '#ff4d5e' : '#ffe36e';
    glow(g, 0, -r * 0.2, 26, eye, 0.6);
    g.fillStyle = eye;
    g.beginPath();
    g.ellipse(0, -r * 0.2, 12, 7, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (enemy.flash > 0) {
    g.globalCompositeOperation = 'lighter';
    glow(g, 0, 0, r * 1.4, 'rgba(255,255,255,0.8)');
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}

/** Create the renderer for `canvas`; `garden(seed)` re-bakes the ground for a new night. */
export function createRenderer(canvas) {
  const g = canvas.getContext('2d');
  const dark = document.createElement('canvas');
  dark.width = FIELD.width;
  dark.height = FIELD.height;
  const d = dark.getContext('2d');
  let ground = bakeGarden(1);
  const view = { scale: 1, offsetX: 0, offsetY: 0 };

  function fit() {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.offsetX = (width - FIELD.width * view.scale) / 2;
    view.offsetY = (height - FIELD.height * view.scale) / 2;
    return ratio;
  }

  function drawDarkness(state) {
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, FIELD.width, FIELD.height);
    d.fillStyle = 'rgba(2, 6, 12, 0.4)';
    d.fillRect(0, 0, FIELD.width, FIELD.height);
    d.globalCompositeOperation = 'destination-out';
    const bloomLight = 170 + 130 * (state.bloom.health / state.bloom.maxHealth);
    glow(d, state.bloom.x, state.bloom.y, bloomLight, 'rgba(0,0,0,1)');
    glow(d, state.player.x, state.player.y, 230, 'rgba(0,0,0,1)');
    for (const bolt of state.bolts) glow(d, bolt.x, bolt.y, 46, 'rgba(0,0,0,0.7)');
    for (const drop of state.nectar) glow(d, drop.x, drop.y, 40, 'rgba(0,0,0,0.6)');
    d.globalCompositeOperation = 'source-over';
    g.drawImage(dark, 0, 0);
  }

  function drawLights(state, particles) {
    g.globalCompositeOperation = 'lighter';
    glow(g, state.bloom.x, state.bloom.y, 120, 'rgba(255, 111, 168, 0.35)');
    glow(g, state.player.x, state.player.y, 60, 'rgba(255, 179, 71, 0.55)');
    // A violet aura under every creature so the gloom reads against the dark ground.
    for (const enemy of state.enemies) glow(g, enemy.x, enemy.y, enemy.radius * 2.4, 'rgba(139, 92, 246, 0.32)');
    for (const bolt of state.bolts) {
      glow(g, bolt.x, bolt.y, 14, 'rgba(255, 210, 122, 0.9)');
      g.fillStyle = COLORS.emberCore;
      g.beginPath();
      g.arc(bolt.x, bolt.y, 3, 0, Math.PI * 2);
      g.fill();
    }
    for (const spore of state.spores) {
      glow(g, spore.x, spore.y, 18, 'rgba(182, 243, 107, 0.8)');
      g.fillStyle = COLORS.spore;
      g.beginPath();
      g.arc(spore.x, spore.y, spore.radius * 0.7, 0, Math.PI * 2);
      g.fill();
    }
    for (const drop of state.nectar) {
      const y = drop.y + Math.sin(drop.bob) * 3;
      glow(g, drop.x, y, 16, 'rgba(126, 249, 255, 0.7)');
      g.fillStyle = COLORS.nectar;
      g.beginPath();
      g.moveTo(drop.x, y - 7);
      g.quadraticCurveTo(drop.x + 6, y + 2, drop.x, y + 5);
      g.quadraticCurveTo(drop.x - 6, y + 2, drop.x, y - 7);
      g.fill();
    }
    for (const s of particles.sparks) {
      g.globalAlpha = Math.max(0, s.life / s.max);
      g.fillStyle = s.color;
      g.beginPath();
      g.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    // Drifting motes of pollen, purely for mood.
    for (let i = 0; i < 40; i += 1) {
      const x = (i * 197 + state.time * (8 + (i % 5) * 3)) % FIELD.width;
      const y = (i * 131 + Math.sin(state.time * 0.7 + i) * 30 + FIELD.height) % FIELD.height;
      g.globalAlpha = 0.25 + 0.25 * Math.sin(state.time * 2 + i);
      g.fillStyle = '#ffe9a8';
      g.fillRect(x, y, 2, 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  function drawLabels(particles) {
    g.textAlign = 'center';
    for (const l of particles.labels) {
      g.globalAlpha = Math.min(1, l.life / l.max * 1.6);
      g.font = `700 ${Math.round(16 * l.scale)}px "Trebuchet MS", system-ui, sans-serif`;
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillText(l.text, l.x + 1, l.y + 2);
      g.fillStyle = l.color;
      g.fillText(l.text, l.x, l.y);
    }
    g.globalAlpha = 1;
  }

  /** Paint the world, then hand the context (in field coordinates) to `overlay` for the HUD. */
  function draw(world, overlay) {
    const ratio = fit();
    const state = world.state;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#030709';
    g.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? Math.sin(state.time * 90) * state.shake * 0.6 : 0;
    const shakeY = state.shake > 0 ? Math.cos(state.time * 77) * state.shake * 0.6 : 0;
    g.setTransform(view.scale * ratio, 0, 0, view.scale * ratio, (view.offsetX + shakeX) * ratio, (view.offsetY + shakeY) * ratio);
    g.save();
    g.beginPath();
    g.rect(0, 0, FIELD.width, FIELD.height);
    g.clip();
    g.drawImage(ground, 0, 0);
    drawBloom(g, state.bloom, state.time);
    for (const enemy of state.enemies) drawEnemy(g, enemy, state.time);
    drawPlayer(g, state.player, state.time);
    drawDarkness(state);
    drawLights(state, world.particles);
    drawLabels(world.particles);
    g.restore();
    g.setTransform(view.scale * ratio, 0, 0, view.scale * ratio, view.offsetX * ratio, view.offsetY * ratio);
    overlay(g);
  }

  return { draw, view: () => view, garden: (seed) => { ground = bakeGarden(seed); } };
}
