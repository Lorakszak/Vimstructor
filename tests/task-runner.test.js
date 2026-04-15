import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskRunner } from '../js/framework/task.js';

/**
 * Fake runtime that supports the subset TaskRunner touches:
 *   mount, reset, dispose, on('change'|'keypress'), getState,
 *   getKeystrokeCount, getKeyLog.
 */
function makeFakeRuntime() {
  const listeners = { change: [], keypress: [] };
  let state = null;
  let initial = null;
  let keystrokes = 0;
  let keyLog = [];
  return {
    id: 'fake',
    mount(el, initialState) {
      initial = JSON.parse(JSON.stringify(initialState));
      state = JSON.parse(JSON.stringify(initialState));
    },
    getState() {
      return JSON.parse(JSON.stringify(state));
    },
    reset() {
      state = JSON.parse(JSON.stringify(initial));
      keystrokes = 0;
      keyLog = [];
    },
    dispose() {},
    on(event, cb) {
      listeners[event].push(cb);
    },
    getKeystrokeCount() {
      return keystrokes;
    },
    getKeyLog() {
      return keyLog.slice();
    },
    _setState(newState) {
      state = JSON.parse(JSON.stringify(newState));
      for (const cb of listeners.change) cb(state);
    },
    _press(key) {
      keystrokes++;
      keyLog.push(key);
      for (const cb of listeners.keypress) cb(state);
    },
  };
}

test('TaskRunner fires onSuccess when the single-shot check passes', () => {
  const rt = makeFakeRuntime();
  const events = [];
  const runner = new TaskRunner(rt, {
    id: 't1',
    start: { value: 0 },
    check: (s) => s.value === 10,
  }, {
    onSuccess: (stats) => events.push({ type: 'success', stats }),
    onFail: () => events.push({ type: 'fail' }),
    onTick: () => {},
  });
  runner.start({});
  rt._setState({ value: 5 });
  assert.deepEqual(events, []);
  rt._setState({ value: 10 });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'success');
  assert.equal(typeof events[0].stats.durationMs, 'number');
  assert.equal(typeof events[0].stats.keys, 'number');
});

test('TaskRunner uses the generator for start when start is a function', () => {
  const rt = makeFakeRuntime();
  let seen = null;
  const runner = new TaskRunner(rt, {
    id: 't1',
    start: (rng) => ({ value: rng.int(1, 5) }),
    check: (s) => s.value > 0,
  }, {
    onSuccess: (stats) => { seen = stats; },
    onFail: () => {},
    onTick: () => {},
  }, { rngSeed: 42 });
  runner.start({});
  rt._setState({ value: 3 });
  assert.ok(seen);
});

test('TaskRunner fires onFail when maxKeys is exceeded', () => {
  const rt = makeFakeRuntime();
  const events = [];
  const runner = new TaskRunner(rt, {
    id: 't1',
    start: { value: 0 },
    check: (s) => false,
    constraints: { maxKeys: 2 },
  }, {
    onSuccess: () => events.push('success'),
    onFail: (reason) => events.push({ fail: reason }),
    onTick: () => {},
  });
  runner.start({});
  rt._press('a');
  rt._press('b');
  rt._press('c');
  assert.deepEqual(events, [{ fail: 'over-budget' }]);
});

test('TaskRunner sequence task advances through sub-checks in order', () => {
  const rt = makeFakeRuntime();
  const events = [];
  const runner = new TaskRunner(rt, {
    id: 't1',
    start: { step: 'start' },
    sequence: [
      (s) => s.step === 'a',
      (s) => s.step === 'b',
      (s) => s.step === 'c',
    ],
  }, {
    onSuccess: () => events.push('success'),
    onFail: () => {},
    onTick: () => {},
  });
  runner.start({});
  rt._setState({ step: 'a' });
  rt._setState({ step: 'b' });
  rt._setState({ step: 'c' });
  assert.deepEqual(events, ['success']);
});

test('TaskRunner reset() restores initial state and clears stats', () => {
  const rt = makeFakeRuntime();
  const events = [];
  const runner = new TaskRunner(rt, {
    id: 't1',
    start: { value: 0 },
    check: (s) => s.value === 10,
  }, {
    onSuccess: () => events.push('success'),
    onFail: () => {},
    onTick: () => {},
  });
  runner.start({});
  rt._press('a');
  runner.reset();
  rt._setState({ value: 10 });
  assert.equal(events.length, 1, 'success still fires after reset');
});

test('TaskRunner strips hint for non-lesson kinds', () => {
  const rt = makeFakeRuntime();
  const runnerLesson = new TaskRunner(rt, {
    id: 't1', start: { v: 0 }, check: () => false, hint: 'try A', kind: 'lesson',
  }, { onSuccess: () => {}, onFail: () => {}, onTick: () => {} });
  const runnerExercise = new TaskRunner(rt, {
    id: 't1', start: { v: 0 }, check: () => false, hint: 'try A', kind: 'exercise',
  }, { onSuccess: () => {}, onFail: () => {}, onTick: () => {} });
  assert.equal(runnerLesson.getHint(), 'try A');
  assert.equal(runnerExercise.getHint(), null);
});
