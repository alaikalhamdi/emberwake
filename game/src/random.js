// A small seeded random source (mulberry32) so a seed replays the same garden and waves.

/** Returns { next, range, int, pick } driven by a 32-bit seed. */
export function createRandom(seed) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range: (low, high) => low + (high - low) * next(),
    int: (low, high) => low + Math.floor(next() * (high - low + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
  };
}
