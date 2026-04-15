import { test } from 'node:test';
import assert from 'node:assert/strict';
import { all, any, not, makeSeq } from '../js/framework/checks.js';

test('all returns true only when every check passes', () => {
  const isEven = (s) => s.n % 2 === 0;
  const isPositive = (s) => s.n > 0;
  assert.equal(all(isEven, isPositive)({ n: 4 }), true);
  assert.equal(all(isEven, isPositive)({ n: -4 }), false);
  assert.equal(all(isEven, isPositive)({ n: 3 }), false);
});

test('any returns true when at least one check passes', () => {
  const isZero = (s) => s.n === 0;
  const isNegative = (s) => s.n < 0;
  assert.equal(any(isZero, isNegative)({ n: 0 }), true);
  assert.equal(any(isZero, isNegative)({ n: -5 }), true);
  assert.equal(any(isZero, isNegative)({ n: 5 }), false);
});

test('not inverts a check', () => {
  const isEven = (s) => s.n % 2 === 0;
  const isOdd = not(isEven);
  assert.equal(isOdd({ n: 3 }), true);
  assert.equal(isOdd({ n: 4 }), false);
});

test('makeSeq walks checks in order and returns true when all are hit', () => {
  const seq = makeSeq(
    (s) => s.step === 'a',
    (s) => s.step === 'b',
    (s) => s.step === 'c',
  );
  assert.equal(seq({ step: 'a' }), false, 'one done');
  assert.equal(seq.progress(), 1);
  assert.equal(seq({ step: 'b' }), false, 'two done');
  assert.equal(seq.progress(), 2);
  assert.equal(seq({ step: 'c' }), true, 'three done');
  assert.equal(seq.progress(), 3);
  assert.equal(seq.total(), 3);
});

test('makeSeq ignores out-of-order satisfaction', () => {
  const seq = makeSeq(
    (s) => s.step === 'a',
    (s) => s.step === 'b',
  );
  assert.equal(seq({ step: 'b' }), false, 'b before a does not advance');
  assert.equal(seq.progress(), 0);
  assert.equal(seq({ step: 'a' }), false);
  assert.equal(seq.progress(), 1);
});

test('makeSeq.reset clears progress', () => {
  const seq = makeSeq(
    (s) => s.step === 'a',
    (s) => s.step === 'b',
  );
  seq({ step: 'a' });
  assert.equal(seq.progress(), 1);
  seq.reset();
  assert.equal(seq.progress(), 0);
});
