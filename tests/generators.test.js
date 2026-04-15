import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/framework/rng.js';
import { pickFrom, range, randomInt, weighted } from '../js/framework/generators.js';

test('pickFrom delegates to rng.pick', () => {
  const rng = createRng(1);
  const result = pickFrom(rng, ['a', 'b', 'c']);
  assert.ok(['a', 'b', 'c'].includes(result));
});

test('range returns an array of n items built by the factory', () => {
  const rng = createRng(1);
  const items = range(3, (i) => `item-${i}`);
  assert.deepEqual(items, ['item-0', 'item-1', 'item-2']);
});

test('randomInt is inclusive and respects bounds', () => {
  const rng = createRng(1);
  for (let i = 0; i < 500; i++) {
    const v = randomInt(rng, 1, 3);
    assert.ok(v === 1 || v === 2 || v === 3, `got ${v}`);
  }
});

test('weighted selects by weight', () => {
  const rng = createRng(1);
  const counts = { a: 0, b: 0 };
  for (let i = 0; i < 1000; i++) {
    const choice = weighted(rng, [['a', 9], ['b', 1]]);
    counts[choice]++;
  }
  assert.ok(counts.a > counts.b * 5, `expected a to dominate, got ${JSON.stringify(counts)}`);
});
