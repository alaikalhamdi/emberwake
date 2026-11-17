// A simple computer guardian. It keeps near the Heartbloom on the side the danger comes
// from, steers away from creatures and spores, shoots the foe closest to the bloom and
// dashes through anything that gets too close. It drives the title-screen demo and the
// screenshot scenes; `caution` (0..1) sets how well it dodges.
import { BLOOM, FIELD } from './config.js';

function nearestThreat(state) {
  let best = null;
  let bestScore = Infinity;
  for (const enemy of state.enemies) {
    if (enemy.x < -10 || enemy.x > FIELD.width + 10 || enemy.y < -10 || enemy.y > FIELD.height + 10) continue;
    const toBloom = Math.hypot(enemy.x - BLOOM.x, enemy.y - BLOOM.y);
    const toPlayer = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
    const score = Math.min(toBloom, toPlayer * 1.2) - (enemy.type === 'warden' ? 60 : 0);
    if (score < bestScore) { bestScore = score; best = enemy; }
  }
  return best;
}

/** The intent the autopilot would give this step. */
export function autopilot(state, caution = 1) {
  const player = state.player;
  const target = nearestThreat(state);
  let goalX = BLOOM.x;
  let goalY = BLOOM.y + 120;
  if (target) {
    const angle = Math.atan2(target.y - BLOOM.y, target.x - BLOOM.x);
    goalX = BLOOM.x + Math.cos(angle) * 130;
    goalY = BLOOM.y + Math.sin(angle) * 110;
  }
  let mx = goalX - player.x;
  let my = goalY - player.y;
  const pull = Math.hypot(mx, my);
  mx = pull > 12 ? mx / pull : 0;
  my = pull > 12 ? my / pull : 0;
  let dash = false;
  const avoid = (x, y, reach, weight) => {
    const dx = player.x - x;
    const dy = player.y - y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < reach) {
      mx += (dx / distance) * weight * (1 - distance / reach) * caution;
      my += (dy / distance) * weight * (1 - distance / reach) * caution;
    }
    return distance;
  };
  for (const enemy of state.enemies) {
    const distance = avoid(enemy.x, enemy.y, enemy.radius + 90, 3);
    if (distance < enemy.radius + 34 && caution > 0.5) dash = true;
  }
  for (const spore of state.spores) avoid(spore.x, spore.y, 70, 4);
  avoid(BLOOM.x, BLOOM.y, BLOOM.radius + 50, 2);
  const length = Math.hypot(mx, my);
  return {
    moveX: length > 0.05 ? mx / length : 0,
    moveY: length > 0.05 ? my / length : 0,
    aimX: target ? target.x : player.x,
    aimY: target ? target.y : player.y - 100,
    fire: target !== null,
    dash,
  };
}
