import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { attachConstraints } from '../js/framework/constraints.js';

/**
 * Fake runtime for constraint tests. Implements the subset of Runtime
 * that constraints.js touches: on('keypress'), getKeystrokeCount().
 */
function makeFakeRuntime() {
  const listeners = [];
  let keystrokes = 0;
  return {
    on(event, cb) {
      if (event === 'keypress') listeners.push(cb);
    },
    getKeystrokeCount() {
      return keystrokes;
    },
    _press() {
      keystrokes++;
      for (const cb of listeners) cb({});
    },
  };
}

test('no constraints means no fails and no ticks', () => {
  const rt = makeFakeRuntime();
  let fails = 0;
  let ticks = 0;
  attachConstraints(rt, { constraints: undefined }, {
    onFail: () => fails++,
    onTick: () => ticks++,
  });
  rt._press(); rt._press(); rt._press();
  assert.equal(fails, 0);
  assert.equal(ticks, 3, 'tick fires on each keypress even with no constraints');
});

test('maxKeys fires onFail when budget exceeded', () => {
  const rt = makeFakeRuntime();
  const fails = [];
  attachConstraints(rt, { constraints: { maxKeys: 2 } }, {
    onFail: (reason) => fails.push(reason),
    onTick: () => {},
  });
  rt._press(); rt._press(); // OK
  assert.deepEqual(fails, []);
  rt._press(); // over
  assert.deepEqual(fails, ['over-budget']);
});

test('onFail fires only once per task attempt', () => {
  const rt = makeFakeRuntime();
  const fails = [];
  attachConstraints(rt, { constraints: { maxKeys: 1 } }, {
    onFail: (reason) => fails.push(reason),
    onTick: () => {},
  });
  rt._press(); rt._press(); rt._press(); rt._press();
  assert.equal(fails.length, 1);
});

test('onTick reports keysLeft when maxKeys is set', () => {
  const rt = makeFakeRuntime();
  const ticks = [];
  attachConstraints(rt, { constraints: { maxKeys: 5 } }, {
    onFail: () => {},
    onTick: (info) => ticks.push(info),
  });
  rt._press(); rt._press();
  assert.equal(ticks[0].keysLeft, 4);
  assert.equal(ticks[1].keysLeft, 3);
});

test('onTick reports null fields for constraints not set', () => {
  const rt = makeFakeRuntime();
  const ticks = [];
  attachConstraints(rt, { constraints: {} }, {
    onFail: () => {},
    onTick: (info) => ticks.push(info),
  });
  rt._press();
  assert.equal(ticks[0].keysLeft, null);
  assert.equal(ticks[0].timeLeftMs, null);
});

test('cleanup function prevents further fails', () => {
  const rt = makeFakeRuntime();
  const fails = [];
  const cleanup = attachConstraints(rt, { constraints: { maxKeys: 1 } }, {
    onFail: (reason) => fails.push(reason),
    onTick: () => {},
  });
  cleanup();
  rt._press(); rt._press(); rt._press();
  assert.deepEqual(fails, []);
});
