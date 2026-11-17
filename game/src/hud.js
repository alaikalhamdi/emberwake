// Everything drawn on top of the garden: the in-play HUD (lives, Heartbloom health, wave,
// score, combo, dash charge, boss bar) and the title, boon choice, pause, defeat and
// victory screens. All of it is drawn in field coordinates on the renderer's context.
import { COLORS, FIELD, WAVE_COUNT } from './config.js';
import { ENEMY_TYPES } from './enemies.js';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const CARD = { width: 300, height: 250, gap: 36, y: 250 };

function text(g, value, x, y, size, color = COLORS.text, align = 'center', weight = 700) {
  g.font = `${weight} ${size}px ${FONT}`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0, 0, 0, 0.55)';
  g.fillText(value, x + 2, y + 2);
  g.fillStyle = color;
  g.fillText(value, x, y);
}

function panel(g, x, y, w, h, radius = 14, fill = COLORS.panel) {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, radius);
  g.fill();
  g.strokeStyle = 'rgba(255, 210, 122, 0.25)';
  g.lineWidth = 2;
  g.stroke();
}

function bar(g, x, y, w, h, fraction, color, back = 'rgba(255,255,255,0.12)') {
  g.fillStyle = back;
  g.beginPath();
  g.roundRect(x, y, w, h, h / 2);
  g.fill();
  if (fraction <= 0) return;
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(x, y, Math.max(h, w * Math.min(1, fraction)), h, h / 2);
  g.fill();
}

function ember(g, x, y, lit) {
  g.fillStyle = lit ? COLORS.ember : 'rgba(255,255,255,0.15)';
  g.beginPath();
  g.ellipse(x, y, 8, 10, 0, 0, Math.PI * 2);
  g.fill();
  if (lit) {
    g.fillStyle = COLORS.emberCore;
    g.beginPath();
    g.arc(x, y + 2, 4, 0, Math.PI * 2);
    g.fill();
  }
}

function veil(g, alpha = 0.55) {
  g.fillStyle = `rgba(3, 8, 12, ${alpha})`;
  g.fillRect(0, 0, FIELD.width, FIELD.height);
}

/** The in-play HUD over the garden. */
export function drawHud(g, state, best, muted) {
  const player = state.player;
  // Lives.
  panel(g, 16, 14, 64 + player.maxHealth * 24, 46, 12);
  text(g, 'LIFE', 30, 37, 14, COLORS.textDim, 'left');
  for (let i = 0; i < player.maxHealth; i += 1) ember(g, 82 + i * 24, 37, i < player.health);
  // Heartbloom.
  const bloomFraction = state.bloom.health / state.bloom.maxHealth;
  panel(g, FIELD.width / 2 - 200, 14, 400, 46, 12);
  text(g, 'HEARTBLOOM', FIELD.width / 2 - 186, 37, 14, COLORS.textDim, 'left');
  bar(g, FIELD.width / 2 - 70, 29, 256, 16, bloomFraction, bloomFraction < 0.3 ? COLORS.danger : COLORS.bloom);
  text(g, `${Math.ceil(state.bloom.health)}`, FIELD.width / 2 + 58, 37, 13, COLORS.text);
  // Wave and score.
  panel(g, FIELD.width - 296, 14, 280, 70, 12);
  text(g, `WAVE ${state.wave}/${WAVE_COUNT}`, FIELD.width - 282, 35, 18, COLORS.ember, 'left');
  text(g, state.waveName, FIELD.width - 30, 35, 14, COLORS.textDim, 'right', 600);
  text(g, `SCORE ${state.score.toLocaleString('en-US')}`, FIELD.width - 282, 64, 18, COLORS.text, 'left');
  text(g, `BEST ${Math.max(best, state.score).toLocaleString('en-US')}`, FIELD.width - 30, 64, 13, COLORS.textDim, 'right', 600);
  // Combo.
  if (state.combo >= 3) {
    const multiplier = 1 + Math.min(4, Math.floor(state.combo / 6));
    text(g, `${state.combo} CHAIN`, FIELD.width - 30, 104, 20, COLORS.ember, 'right');
    if (multiplier > 1) text(g, `×${multiplier} SCORE`, FIELD.width - 30, 128, 14, '#ffd27a', 'right');
    bar(g, FIELD.width - 150, 142, 120, 5, state.comboTimer / 2.4, '#ffd27a');
  }
  // Dash charge.
  const ready = 1 - player.dashReady / player.dashCooldown;
  panel(g, 16, FIELD.height - 58, 190, 42, 12);
  text(g, ready >= 1 ? 'DASH READY' : 'DASH', 30, FIELD.height - 37, 14, ready >= 1 ? COLORS.ember : COLORS.textDim, 'left');
  bar(g, 120, FIELD.height - 44, 72, 12, ready, ready >= 1 ? COLORS.ember : '#8a7a5a');
  // Foes left this wave.
  const left = state.queue.length + state.enemies.length;
  panel(g, FIELD.width - 186, FIELD.height - 58, 170, 42, 12);
  text(g, `GLOOM LEFT ${left}`, FIELD.width - 101, FIELD.height - 37, 14, COLORS.textDim);
  text(g, muted ? 'M: sound off' : 'M: sound on', FIELD.width / 2, FIELD.height - 22, 12, 'rgba(244,234,213,0.45)', 'center', 600);
  // Boss bar.
  const boss = state.enemies.find((e) => e.type === 'warden');
  if (boss) {
    text(g, 'THE GLOOMWARDEN', FIELD.width / 2, 86, 18, '#c9a4ff');
    bar(g, FIELD.width / 2 - 260, 100, 520, 12, boss.health / ENEMY_TYPES.warden.health, '#8b5cf6');
  }
  // Wave banner.
  if (state.banner > 0) {
    const alpha = Math.min(1, state.banner);
    g.globalAlpha = alpha;
    text(g, `WAVE ${state.wave}`, FIELD.width / 2, FIELD.height / 2 - 150, 56, COLORS.ember);
    text(g, state.waveName, FIELD.width / 2, FIELD.height / 2 - 104, 26, COLORS.text, 'center', 600);
    if (state.calm > 0) text(g, `the gloom stirs in ${Math.ceil(state.calm)}…`, FIELD.width / 2, FIELD.height / 2 + 150, 18, COLORS.textDim, 'center', 600);
    g.globalAlpha = 1;
  }
}

/** The title screen, drawn over a garden that is already alive behind it. */
export function drawTitle(g, best, time) {
  veil(g, 0.28);
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  text(g, 'EMBERWAKE', FIELD.width / 2, 170, 96, COLORS.ember);
  text(g, 'a firefly guards the last Heartbloom through ten waves of night', FIELD.width / 2, 238, 22, COLORS.text, 'center', 600);
  panel(g, FIELD.width / 2 - 300, 290, 600, 210, 16);
  const lines = [
    ['WASD / Arrows', 'fly'],
    ['Mouse', 'aim'],
    ['Hold Left Click / Space', 'shoot ember bolts'],
    ['Right Click / Shift', 'flare dash: harms foes, dodges harm'],
    ['P / Esc   ·   M', 'pause   ·   sound'],
  ];
  lines.forEach(([key, action], i) => {
    text(g, key, FIELD.width / 2 - 20, 324 + i * 36, 19, COLORS.ember, 'right');
    text(g, action, FIELD.width / 2 + 4, 324 + i * 36, 19, COLORS.text, 'left', 600);
  });
  g.globalAlpha = 0.6 + 0.4 * pulse;
  text(g, 'CLICK OR PRESS ENTER TO BEGIN', FIELD.width / 2, 552, 28, '#fff3c4');
  g.globalAlpha = 1;
  text(g, best > 0 ? `best score ${best.toLocaleString('en-US')}` : 'collect nectar to heal the bloom · chain kills for multipliers', FIELD.width / 2, 600, 17, COLORS.textDim, 'center', 600);
}

/** Where each boon card sits, for clicks and drawing. */
export function boonCardRects(count) {
  const total = count * CARD.width + (count - 1) * CARD.gap;
  const left = (FIELD.width - total) / 2;
  return Array.from({ length: count }, (_, i) => ({ x: left + i * (CARD.width + CARD.gap), y: CARD.y, w: CARD.width, h: CARD.height }));
}

/** Choose a boon: three cards after a cleared wave. */
export function drawBoons(g, state, offer, hover) {
  veil(g, 0.6);
  text(g, `WAVE ${state.wave} CLEARED`, FIELD.width / 2, 130, 52, COLORS.ember);
  text(g, 'The Heartbloom grants a boon. Choose one.', FIELD.width / 2, 186, 22, COLORS.text, 'center', 600);
  const rects = boonCardRects(offer.length);
  offer.forEach((boon, i) => {
    const r = rects[i];
    const lifted = hover === i ? -8 : 0;
    panel(g, r.x, r.y + lifted, r.w, r.h, 18, hover === i ? 'rgba(40, 28, 12, 0.92)' : COLORS.panel);
    text(g, boon.icon, r.x + r.w / 2, r.y + 70 + lifted, 54, COLORS.ember);
    text(g, boon.name, r.x + r.w / 2, r.y + 140 + lifted, 26, COLORS.text);
    text(g, boon.text, r.x + r.w / 2, r.y + 180 + lifted, 16, COLORS.textDim, 'center', 600);
    text(g, `[${i + 1}]`, r.x + r.w / 2, r.y + 222 + lifted, 16, '#ffd27a');
  });
  text(g, `score ${state.score.toLocaleString('en-US')}   ·   best chain ${state.bestCombo}   ·   Heartbloom ${Math.ceil(state.bloom.health)}/${state.bloom.maxHealth}`, FIELD.width / 2, 560, 18, COLORS.textDim, 'center', 600);
}

export function drawPaused(g) {
  veil(g, 0.6);
  text(g, 'PAUSED', FIELD.width / 2, FIELD.height / 2 - 30, 64, COLORS.ember);
  text(g, 'P or Esc to resume  ·  R to restart', FIELD.width / 2, FIELD.height / 2 + 30, 22, COLORS.text, 'center', 600);
}

/** Defeat or victory, with the run's numbers and the restart prompt. */
export function drawEnd(g, state, best, won, time) {
  veil(g, 0.45);
  if (won) {
    // Dawn: warm light rising from the bottom of the garden.
    const sunrise = g.createLinearGradient(0, FIELD.height, 0, FIELD.height * 0.25);
    sunrise.addColorStop(0, 'rgba(255, 170, 90, 0.55)');
    sunrise.addColorStop(0.5, 'rgba(255, 120, 150, 0.18)');
    sunrise.addColorStop(1, 'rgba(255, 120, 150, 0)');
    g.fillStyle = sunrise;
    g.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  const title = won ? 'DAWN BREAKS' : state.bloom.health <= 0 ? 'THE BLOOM WITHERS' : 'YOUR LIGHT FADES';
  text(g, title, FIELD.width / 2, 150, 72, won ? '#ffe9a8' : COLORS.danger);
  text(g, won ? 'The Gloomwarden is gone. The Heartbloom lives to see the sun.' : `The gloom took the garden on wave ${state.wave}: ${state.waveName}.`, FIELD.width / 2, 214, 22, COLORS.text, 'center', 600);
  panel(g, FIELD.width / 2 - 260, 260, 520, 220, 16);
  const record = state.score >= best && state.score > 0;
  const rows = [
    ['Score', state.score.toLocaleString('en-US') + (record ? '  NEW BEST' : '')],
    ['Waves cleared', `${won ? state.wave : state.wave - 1} / ${WAVE_COUNT}`],
    ['Gloom banished', `${state.kills}`],
    ['Longest chain', `${state.bestCombo}`],
    ['Best score', Math.max(best, state.score).toLocaleString('en-US')],
  ];
  rows.forEach(([label, value], i) => {
    text(g, label, FIELD.width / 2 - 20, 298 + i * 36, 21, COLORS.textDim, 'right', 600);
    text(g, value, FIELD.width / 2 + 10, 298 + i * 36, 21, i === 0 && record ? '#ffd27a' : COLORS.text, 'left');
  });
  g.globalAlpha = 0.65 + 0.35 * Math.sin(time * 3);
  text(g, 'PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 540, 28, '#fff3c4');
  g.globalAlpha = 1;
}
