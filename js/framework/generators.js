/**
 * Thin sugar over the Rng object from rng.js. These are framework-level
 * generators (engine-agnostic). Course-specific generators (sentence banks,
 * paragraph builders) live at courses/<id>/generators.js.
 */

export function pickFrom(rng, arr) {
  return rng.pick(arr);
}

export function randomInt(rng, lo, hi) {
  return rng.int(lo, hi);
}

export function range(n, factory) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = factory(i);
  return out;
}

/**
 * Weighted pick. `entries` is an array of [value, weight] pairs.
 * Weights are positive numbers; higher weight = more likely.
 */
export function weighted(rng, entries) {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.next() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
