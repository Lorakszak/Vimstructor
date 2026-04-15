import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage, resetLocalStorage, getStore } from './helpers/localStorage.js';
import { Progress } from '../js/core/progress.js';

installLocalStorage();

beforeEach(() => {
  resetLocalStorage();
  Progress.load();
});

test('load initializes an empty store when localStorage is empty', () => {
  Progress.load();
  assert.equal(Progress.getActiveCourse(), null);
});

test('load silently resets when stored JSON is corrupt', () => {
  globalThis.localStorage.setItem('termstructor:progress:v2', '{not json');
  Progress.load();
  assert.equal(Progress.getActiveCourse(), null);
});

test('load silently resets when schemaVersion mismatches', () => {
  globalThis.localStorage.setItem(
    'termstructor:progress:v2',
    JSON.stringify({ schemaVersion: 99, courses: { vim: {} } })
  );
  Progress.load();
  assert.equal(Progress.getActiveCourse(), null);
});

test('load deletes the old vimstructor:progress:v1 key on first v2 load', () => {
  globalThis.localStorage.setItem('vimstructor:progress:v1', '{"legacy":true}');
  Progress.load();
  assert.equal(globalThis.localStorage.getItem('vimstructor:progress:v1'), null);
});

test('markDone records a lesson with stats', () => {
  Progress.markDone('vim', 'modes', 'lessons', 'modes-1', {
    mistakes: 0, keys: 3, durationMs: 4200,
  });
  assert.equal(Progress.isDone('vim', 'modes', 'lessons', 'modes-1'), true);
});

test('markDone records an exercise with stats', () => {
  Progress.markDone('vim', 'modes', 'exercises', 'modes-ex-1', {
    mistakes: 1, keys: 11, durationMs: 18400,
  });
  assert.equal(Progress.isDone('vim', 'modes', 'exercises', 'modes-ex-1'), true);
});

test('isDone returns false for unknown tasks', () => {
  assert.equal(Progress.isDone('vim', 'modes', 'lessons', 'nope'), false);
  assert.equal(Progress.isDone('vim', 'nope', 'lessons', 'x'), false);
  assert.equal(Progress.isDone('nope', 'modes', 'lessons', 'x'), false);
});

test('markTestPassed records the test', () => {
  Progress.markTestPassed('vim', 'modes', { mistakes: 0, keys: 42, durationMs: 64000 });
  assert.equal(Progress.isTestPassed('vim', 'modes'), true);
});

test('chapterStatus returns counts based on manifest totals', () => {
  Progress.markDone('vim', 'modes', 'lessons', 'modes-1', { mistakes: 0, keys: 3, durationMs: 100 });
  Progress.markDone('vim', 'modes', 'lessons', 'modes-2', { mistakes: 0, keys: 3, durationMs: 100 });
  Progress.markDone('vim', 'modes', 'exercises', 'modes-ex-1', { mistakes: 0, keys: 3, durationMs: 100 });

  const manifestChapter = {
    id: 'modes',
    lessons: [{ id: 'modes-1' }, { id: 'modes-2' }, { id: 'modes-3' }],
    exercises: [{ id: 'modes-ex-1' }, { id: 'modes-ex-2' }],
  };
  const status = Progress.chapterStatus('vim', 'modes', manifestChapter);
  assert.deepEqual(status.lessons, { done: 2, total: 3 });
  assert.deepEqual(status.exercises, { done: 1, total: 2 });
  assert.equal(status.test, false);
});

test('setActiveCourse + getActiveCourse round-trip', () => {
  Progress.setActiveCourse('vim');
  assert.equal(Progress.getActiveCourse(), 'vim');
});

test('setLastAt + getLastAt round-trip per course', () => {
  Progress.setLastAt('vim', 'modes', 'exercise', 'modes-ex-1');
  assert.deepEqual(Progress.getLastAt('vim'), {
    chapterId: 'modes', kind: 'exercise', taskId: 'modes-ex-1',
  });
});

test('resetCourse clears one course only', () => {
  Progress.markDone('vim', 'modes', 'lessons', 'modes-1', { mistakes: 0, keys: 3, durationMs: 100 });
  Progress.markDone('nano', 'intro', 'lessons', 'intro-1', { mistakes: 0, keys: 3, durationMs: 100 });
  Progress.resetCourse('vim');
  assert.equal(Progress.isDone('vim', 'modes', 'lessons', 'modes-1'), false);
  assert.equal(Progress.isDone('nano', 'intro', 'lessons', 'intro-1'), true);
});

test('resetAll nukes every course', () => {
  Progress.markDone('vim', 'modes', 'lessons', 'modes-1', { mistakes: 0, keys: 3, durationMs: 100 });
  Progress.resetAll();
  assert.equal(Progress.isDone('vim', 'modes', 'lessons', 'modes-1'), false);
  assert.equal(Progress.getActiveCourse(), null);
});

test('save writes JSON to localStorage synchronously when flushed', async () => {
  Progress.markDone('vim', 'modes', 'lessons', 'modes-1', { mistakes: 0, keys: 3, durationMs: 100 });
  await new Promise((r) => setTimeout(r, 150));
  const raw = globalThis.localStorage.getItem('termstructor:progress:v2');
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.schemaVersion, 2);
  assert.equal(parsed.courses.vim.chapters.modes.lessons['modes-1'].keys, 3);
});
