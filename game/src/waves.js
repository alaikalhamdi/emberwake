// The night's ten waves: which creatures come, how many, and how fast they arrive. Early
// waves teach one kind at a time; later ones mix them; the tenth brings the Gloomwarden.
import { WAVE_COUNT } from './config.js';

/** Each wave lists [type, count] groups and the seconds between spawns. */
const WAVES = [
  { name: 'First Flutter', groups: [['moth', 8]], gap: 0.9 },
  { name: 'Restless Wings', groups: [['moth', 12], ['darter', 2]], gap: 0.75 },
  { name: 'Hunters', groups: [['moth', 8], ['darter', 6]], gap: 0.7 },
  { name: 'Heavy Husks', groups: [['moth', 10], ['husk', 3]], gap: 0.7 },
  { name: 'Spore Rain', groups: [['moth', 8], ['spitter', 4], ['darter', 3]], gap: 0.65 },
  { name: 'The Swarm', groups: [['moth', 22], ['mite', 10]], gap: 0.32 },
  { name: 'Crossfire', groups: [['spitter', 6], ['darter', 6], ['husk', 2]], gap: 0.6 },
  { name: 'Deep Gloom', groups: [['husk', 5], ['moth', 14], ['spitter', 3]], gap: 0.5 },
  { name: 'Last Light', groups: [['darter', 10], ['spitter', 5], ['husk', 4], ['moth', 12]], gap: 0.42 },
  { name: 'The Gloomwarden', groups: [['warden', 1], ['moth', 10]], gap: 1.2 },
];

/** The spawn queue for wave `number` (1-based), shuffled with `random` so no two nights match. */
export function buildWave(number, random) {
  const plan = WAVES[Math.min(number, WAVE_COUNT) - 1];
  const queue = [];
  for (const [type, count] of plan.groups) for (let i = 0; i < count; i += 1) queue.push(type);
  // The boss always leads its wave; everything else is shuffled.
  const head = queue[0] === 'warden' ? [queue.shift()] : [];
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random.next() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return { name: plan.name, queue: head.concat(queue), gap: plan.gap, total: head.length + queue.length };
}

export function waveName(number) {
  return WAVES[Math.min(number, WAVE_COUNT) - 1].name;
}
