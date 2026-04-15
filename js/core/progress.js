/**
 * Progress store. Single source of truth for per-course task completion.
 * All reads/writes go through this module; no one else touches localStorage.
 *
 * Schema: docs/superpowers/specs/2026-04-15-termstructor-redesign-design.md
 */

const KEY = 'termstructor:progress:v2';
const OLD_KEY = 'vimstructor:progress:v1';
const SCHEMA_VERSION = 2;
const SAVE_DEBOUNCE_MS = 50;

function blank() {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeCourse: null,
    courses: {},
  };
}

let data = blank();
let saveTimer = null;

function ensureCourse(courseId) {
  if (!data.courses[courseId]) {
    data.courses[courseId] = { chapters: {}, lastAt: null };
  }
  return data.courses[courseId];
}

function ensureChapter(courseId, chapterId) {
  const c = ensureCourse(courseId);
  if (!c.chapters[chapterId]) {
    c.chapters[chapterId] = { lessons: {}, exercises: {}, test: null };
  }
  return c.chapters[chapterId];
}

function flushNow() {
  try {
    globalThis.localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Progress save failed:', e);
  }
}

export const Progress = {
  load() {
    let raw = null;
    try {
      raw = globalThis.localStorage.getItem(KEY);
    } catch {
      data = blank();
      return data;
    }
    if (raw === null) {
      data = blank();
    } else {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.schemaVersion === SCHEMA_VERSION) {
          data = parsed;
        } else {
          console.warn('Progress schema mismatch, resetting');
          data = blank();
        }
      } catch {
        console.warn('Progress JSON corrupt, resetting');
        data = blank();
      }
    }
    try {
      if (globalThis.localStorage.getItem(OLD_KEY) !== null) {
        globalThis.localStorage.removeItem(OLD_KEY);
      }
    } catch {
      // ignore
    }
    return data;
  },

  // Queues a debounced write, not a synchronous persist. Subsequent
  // calls while a save is pending are collapsed into the pending one.
  save() {
    if (saveTimer !== null) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      flushNow();
    }, SAVE_DEBOUNCE_MS);
  },

  isDone(courseId, chapterId, kind, taskId) {
    return !!(
      data.courses[courseId] &&
      data.courses[courseId].chapters[chapterId] &&
      data.courses[courseId].chapters[chapterId][kind] &&
      data.courses[courseId].chapters[chapterId][kind][taskId]
    );
  },

  markDone(courseId, chapterId, kind, taskId, stats) {
    const ch = ensureChapter(courseId, chapterId);
    ch[kind][taskId] = {
      ts: Date.now(),
      mistakes: stats?.mistakes ?? 0,
      keys: stats?.keys ?? 0,
      durationMs: stats?.durationMs ?? 0,
    };
    Progress.save();
  },

  isTestPassed(courseId, chapterId) {
    return !!(
      data.courses[courseId] &&
      data.courses[courseId].chapters[chapterId] &&
      data.courses[courseId].chapters[chapterId].test &&
      data.courses[courseId].chapters[chapterId].test.passed
    );
  },

  markTestPassed(courseId, chapterId, stats) {
    const ch = ensureChapter(courseId, chapterId);
    ch.test = {
      passed: true,
      ts: Date.now(),
      mistakes: stats?.mistakes ?? 0,
      keys: stats?.keys ?? 0,
      durationMs: stats?.durationMs ?? 0,
    };
    Progress.save();
  },

  chapterStatus(courseId, chapterId, manifestChapter) {
    const ch = data.courses[courseId]?.chapters[chapterId];
    const lessonsTotal = manifestChapter.lessons.length;
    const exercisesTotal = manifestChapter.exercises.length;
    return {
      lessons: {
        done: ch ? Object.keys(ch.lessons).length : 0,
        total: lessonsTotal,
      },
      exercises: {
        done: ch ? Object.keys(ch.exercises).length : 0,
        total: exercisesTotal,
      },
      test: !!(ch?.test?.passed),
    };
  },

  courseTotals(courseId, manifest) {
    let lessonsDone = 0, lessonsTotal = 0;
    let exercisesDone = 0, exercisesTotal = 0;
    let testsPassed = 0, testsTotal = 0;
    for (const chapter of manifest.chapters) {
      const status = Progress.chapterStatus(courseId, chapter.id, chapter);
      lessonsDone += status.lessons.done;
      lessonsTotal += status.lessons.total;
      exercisesDone += status.exercises.done;
      exercisesTotal += status.exercises.total;
      if (status.test) testsPassed++;
      testsTotal++;
    }
    return {
      lessons: { done: lessonsDone, total: lessonsTotal },
      exercises: { done: exercisesDone, total: exercisesTotal },
      tests: { done: testsPassed, total: testsTotal },
    };
  },

  setLastAt(courseId, chapterId, kind, taskId) {
    const c = ensureCourse(courseId);
    c.lastAt = { chapterId, kind, taskId };
    Progress.save();
  },

  getLastAt(courseId) {
    return data.courses[courseId]?.lastAt ?? null;
  },

  setActiveCourse(courseId) {
    data.activeCourse = courseId;
    Progress.save();
  },

  getActiveCourse() {
    return data.activeCourse;
  },

  resetCourse(courseId) {
    delete data.courses[courseId];
    if (data.activeCourse === courseId) data.activeCourse = null;
    Progress.save();
  },

  resetAll() {
    data = blank();
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    flushNow();
  },
};
