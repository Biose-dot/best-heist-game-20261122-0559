// Seeded random numbers (mulberry32): the same seed always gives the same
// sequence, so a level and its staged screenshots are byte-identical on
// every run. No wall-clock or Math.random() anywhere in the simulation.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] from a seeded stream. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one element of an array from a seeded stream. */
export function randPick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
