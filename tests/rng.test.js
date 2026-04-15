import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/framework/rng.js';

test('rng produces the same sequence under a fixed seed', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 10; i++) {
    assert.equal(a.next(), b.next());
  }
});

test('rng.int respects its bounds (inclusive)', () => {
  const r = createRng(1);
  for (let i = 0; i < 1000; i++) {
    const v = r.int(5, 10);
    assert.ok(v >= 5 && v <= 10, `value ${v} out of [5,10]`);
  }
});

test('rng.int handles a single-value range', () => {
  const r = createRng(1);
  assert.equal(r.int(7, 7), 7);
});

test('rng.pick returns an element from the array', () => {
  const r = createRng(1);
  const arr = ['a', 'b', 'c'];
  for (let i = 0; i < 100; i++) {
    assert.ok(arr.includes(r.pick(arr)));
  }
});

test('rng.shuffle returns a new array with same elements', () => {
  const r = createRng(1);
  const original = [1, 2, 3, 4, 5];
  const shuffled = r.shuffle(original);
  assert.deepEqual(original, [1, 2, 3, 4, 5], 'original must not mutate');
  assert.equal(shuffled.length, 5);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), [1, 2, 3, 4, 5]);
});

test('rng.shuffle is deterministic under a fixed seed', () => {
  const a = createRng(42).shuffle([1, 2, 3, 4, 5]);
  const b = createRng(42).shuffle([1, 2, 3, 4, 5]);
  assert.deepEqual(a, b);
});

test('rng exposes its seed for debugging', () => {
  const r = createRng(12345);
  assert.equal(r.seed, 12345);
});
