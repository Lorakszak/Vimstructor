import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/framework/rng.js';
import { typos, swapWords, shuffleLines } from '../js/framework/corrupter.js';

test('typos returns an object with corrupted and original fields', () => {
  const rng = createRng(1);
  const result = typos(rng, 'the quick brown fox', { count: 2 });
  assert.equal(typeof result.corrupted, 'string');
  assert.equal(result.original, 'the quick brown fox');
  assert.equal(result.corrupted.length, result.original.length);
});

test('typos is deterministic under a fixed seed', () => {
  const a = typos(createRng(42), 'hello world', { count: 3 });
  const b = typos(createRng(42), 'hello world', { count: 3 });
  assert.equal(a.corrupted, b.corrupted);
});

test('typos does not corrupt whitespace characters', () => {
  const rng = createRng(1);
  const result = typos(rng, 'a b c d e f g h i j', { count: 20 });
  // Positions of whitespace must still be whitespace.
  for (let i = 1; i < result.original.length; i += 2) {
    assert.equal(result.corrupted[i], ' ');
  }
});

test('swapWords swaps two adjacent words', () => {
  const rng = createRng(1);
  const result = swapWords(rng, 'one two three four five');
  assert.equal(typeof result.corrupted, 'string');
  const originalWords = result.original.split(' ').sort();
  const corruptedWords = result.corrupted.split(' ').sort();
  assert.deepEqual(originalWords, corruptedWords, 'same word bag');
});

test('swapWords on single-word input returns input unchanged', () => {
  const rng = createRng(1);
  const result = swapWords(rng, 'solo');
  assert.equal(result.corrupted, 'solo');
});

test('shuffleLines reshuffles line order', () => {
  const rng = createRng(42);
  const input = 'alpha\nbravo\ncharlie\ndelta\necho';
  const result = shuffleLines(rng, input);
  const originalLines = input.split('\n').sort();
  const corruptedLines = result.corrupted.split('\n').sort();
  assert.deepEqual(originalLines, corruptedLines);
});

test('shuffleLines is deterministic', () => {
  const input = 'a\nb\nc\nd\ne\nf';
  const a = shuffleLines(createRng(7), input);
  const b = shuffleLines(createRng(7), input);
  assert.equal(a.corrupted, b.corrupted);
});
