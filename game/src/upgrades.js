// Boons: after each wave the firefly picks one of three. Each changes how the next waves
// play, and most stack, so every run grows into a different build.

export const BOONS = [
  { id: 'rapid', name: 'Quickfire', text: 'Shoot 22% faster', icon: '»', apply: (p) => { p.fireDelay *= 0.78; } },
  { id: 'twin', name: 'Twin Sparks', text: '+1 bolt per shot, fanned', icon: '⁑', max: 3, apply: (p) => { p.bolts += 1; } },
  { id: 'heavy', name: 'Hot Core', text: 'Bolts deal +1 damage', icon: '●', apply: (p) => { p.boltDamage += 1; } },
  { id: 'pierce', name: 'Lancelight', text: 'Bolts pass through +1 foe', icon: '↟', max: 3, apply: (p) => { p.pierce += 1; } },
  { id: 'swift', name: 'Featherwing', text: 'Move 15% faster', icon: '≈', max: 3, apply: (p) => { p.speed *= 1.15; } },
  { id: 'dash', name: 'Flare Dash', text: 'Dash recharges 35% sooner', icon: '⇢', max: 2, apply: (p) => { p.dashCooldown *= 0.65; } },
  { id: 'nova', name: 'Ember Nova', text: 'Dashing bursts sparks around you', icon: '✺', max: 1, apply: (p) => { p.nova = true; } },
  { id: 'heart', name: 'Glowheart', text: '+1 max life, heal fully', icon: '♥', max: 3, apply: (p) => { p.maxHealth += 1; p.health = p.maxHealth; } },
  { id: 'root', name: 'Deep Roots', text: 'Heartbloom heals 35 and +20 max', icon: '❀', apply: (p, bloom) => { bloom.maxHealth += 20; bloom.health = Math.min(bloom.maxHealth, bloom.health + 35); } },
  { id: 'magnet', name: 'Nectar Pull', text: 'Collect nectar from far away', icon: '◎', max: 2, apply: (p) => { p.pickupReach *= 1.8; } },
  { id: 'thorns', name: 'Thorn Ring', text: 'Heartbloom slows nearby gloom', icon: '✲', max: 1, apply: (p, bloom) => { bloom.thorns = true; } },
  { id: 'ember', name: 'Wildfire', text: 'Kills may ignite and burst', icon: '✹', max: 1, apply: (p) => { p.wildfire = true; } },
];

/** Three distinct boons the player can still take, chosen with `random`. */
export function offerBoons(taken, random) {
  const open = BOONS.filter((boon) => !boon.max || (taken[boon.id] ?? 0) < boon.max);
  const offer = [];
  while (offer.length < 3 && open.length > 0) offer.push(open.splice(Math.floor(random.next() * open.length), 1)[0]);
  return offer;
}
