/**
 * Task runner. Orchestrates a Runtime instance against one Task.
 *
 * A Task is one of: a lesson (deterministic start, hint allowed),
 * an exercise (generator start, optional constraints, optional sequence,
 * hint stripped), or a test task (shares base with sibling tasks,
 * hint stripped).
 *
 * @typedef {Object} Task
 * @property {string}   id
 * @property {string}   [title]
 * @property {string}   [brief]
 * @property {string}   [goal]
 * @property {string}   [hint]
 * @property {'lesson'|'exercise'|'test'} [kind]
 * @property {unknown | (rng: Rng) => unknown} start
 * @property {(snapshot: unknown) => boolean} [check]
 * @property {((snapshot: unknown) => boolean)[]} [sequence]
 * @property {{ apply: (rng: Rng, base: unknown) => unknown }} [corrupt]
 * @property {{ maxKeys?: number, timeMs?: number, maxMistakes?: number }} [constraints]
 */

import { createRng } from './rng.js';
import { makeSeq } from './checks.js';
import { attachConstraints } from './constraints.js';

export class TaskRunner {
  constructor(runtime, task, handlers, opts = {}) {
    this.runtime = runtime;
    this.task = task;
    this.handlers = handlers;
    this.rngSeed = opts.rngSeed ?? Date.now();
    this.rng = createRng(this.rngSeed);

    this._startedAtMs = 0;
    this._constraintCleanup = null;
    this._checkFn = null;
    this._initialState = null;
    this._done = false;
    this._mounted = false;

    this._onChange = this._onChange.bind(this);
    this._onKeyPress = this._onKeyPress.bind(this);
  }

  start(mountTarget) {
    // The Runtime contract has no off(), so a second start() without
    // dispose() would leak change/keypress listeners. Fail loud instead.
    if (this._mounted) {
      throw new Error('TaskRunner.start() called twice; call dispose() first');
    }
    this._mounted = true;
    this._initialState = this._buildInitialState();
    this.runtime.mount(mountTarget, this._initialState);
    this._startedAtMs = Date.now();

    this.runtime.on('change', this._onChange);
    this.runtime.on('keypress', this._onKeyPress);

    this._checkFn = this._buildCheckFn();

    this._constraintCleanup = attachConstraints(this.runtime, this.task, {
      onFail: (reason) => this._fail(reason),
      onTick: (info) => this.handlers.onTick(info),
    });
  }

  reset() {
    this._done = false;
    this._startedAtMs = Date.now();
    if (this._constraintCleanup) this._constraintCleanup();

    const seed = Date.now();
    this.rng = createRng(seed);
    this.rngSeed = seed;

    if (typeof this.task.start === 'function') {
      this._initialState = this._buildInitialState();
    }
    this.runtime.reset();

    this._checkFn = this._buildCheckFn();
    this._constraintCleanup = attachConstraints(this.runtime, this.task, {
      onFail: (reason) => this._fail(reason),
      onTick: (info) => this.handlers.onTick(info),
    });
  }

  dispose() {
    if (this._constraintCleanup) this._constraintCleanup();
    this._constraintCleanup = null;
    this._mounted = false;
  }

  getHint() {
    if ((this.task.kind ?? 'lesson') === 'lesson') {
      return this.task.hint ?? null;
    }
    return null;
  }

  _buildInitialState() {
    const base =
      typeof this.task.start === 'function'
        ? this.task.start(this.rng)
        : this.task.start;
    if (this.task.corrupt) {
      return this.task.corrupt.apply(this.rng, base);
    }
    return base;
  }

  _buildCheckFn() {
    if (this.task.sequence) {
      return makeSeq(...this.task.sequence);
    }
    if (this.task.check) {
      return this.task.check;
    }
    return () => false;
  }

  _onChange(snapshot) {
    this._evaluate(snapshot);
  }

  _onKeyPress(snapshot) {
    this._evaluate(snapshot);
  }

  _evaluate(snapshot) {
    if (this._done) return;
    if (this._checkFn(snapshot)) {
      this._done = true;
      const stats = {
        mistakes: 0,
        keys: this.runtime.getKeystrokeCount(),
        durationMs: Date.now() - this._startedAtMs,
      };
      if (this._constraintCleanup) this._constraintCleanup();
      this.handlers.onSuccess(stats);
    }
  }

  _fail(reason) {
    if (this._done) return;
    this._done = true;
    if (this._constraintCleanup) this._constraintCleanup();
    this.handlers.onFail(reason);
  }
}
