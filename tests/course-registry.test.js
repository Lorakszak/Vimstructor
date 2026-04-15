import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CourseRegistry } from '../js/core/course-registry.js';

beforeEach(() => {
  CourseRegistry.clear();
});

test('register adds a course and get retrieves it', () => {
  const manifest = { id: 'vim', title: 'Vim', chapters: [] };
  CourseRegistry.register(manifest);
  assert.equal(CourseRegistry.get('vim'), manifest);
});

test('register twice with same id throws', () => {
  CourseRegistry.register({ id: 'vim', title: 'Vim', chapters: [] });
  assert.throws(
    () => CourseRegistry.register({ id: 'vim', title: 'Vim 2', chapters: [] }),
    /already registered/,
  );
});

test('list returns all registered courses in insertion order', () => {
  CourseRegistry.register({ id: 'vim', title: 'Vim', chapters: [] });
  CourseRegistry.register({ id: 'nano', title: 'nano', chapters: [] });
  const ids = CourseRegistry.list().map((c) => c.id);
  assert.deepEqual(ids, ['vim', 'nano']);
});

test('get returns null for unknown ids', () => {
  assert.equal(CourseRegistry.get('nope'), null);
});

test('has returns true only for registered courses', () => {
  CourseRegistry.register({ id: 'vim', title: 'Vim', chapters: [] });
  assert.equal(CourseRegistry.has('vim'), true);
  assert.equal(CourseRegistry.has('nano'), false);
});

test('register throws when manifest is missing required fields', () => {
  assert.throws(() => CourseRegistry.register({}), /manifest\.id/);
  assert.throws(() => CourseRegistry.register({ id: 'x' }), /manifest\.title/);
  assert.throws(() => CourseRegistry.register({ id: 'x', title: 'X' }), /manifest\.chapters/);
});
