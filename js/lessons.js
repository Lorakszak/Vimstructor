/* Vimstructor: lesson runner and progress store. */
(function () {
  'use strict';

  const STORAGE_KEY = 'vimstructor:progress:v1';

  const Progress = {
    data: null,
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        this.data = raw ? JSON.parse(raw) : { completed: {}, lastLesson: null };
      } catch {
        this.data = { completed: {}, lastLesson: null };
      }
      if (!this.data.completed) this.data.completed = {};
      return this.data;
    },
    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch {}
    },
    isDone(id) { return !!this.data.completed[id]; },
    markDone(id) { this.data.completed[id] = Date.now(); this.save(); },
    setLast(id) { this.data.lastLesson = id; this.save(); },
    reset() {
      this.data = { completed: {}, lastLesson: null };
      this.save();
    },
    totals() {
      const total = window.CHAPTERS.reduce((a, c) => a + c.lessons.length, 0);
      const done = Object.keys(this.data.completed).length;
      return { done, total };
    },
    chapterProgress(chapter) {
      const total = chapter.lessons.length;
      let done = 0;
      for (const l of chapter.lessons) if (this.isDone(l.id)) done++;
      return { done, total };
    },
  };

  // Flat list of {chapter, lesson, idx, chapterIdx} for navigation
  function flatLessons() {
    const out = [];
    window.CHAPTERS.forEach((c, ci) => {
      c.lessons.forEach((l, li) => out.push({ chapter: c, lesson: l, chapterIdx: ci, lessonIdx: li }));
    });
    return out;
  }

  function findByLessonId(id) {
    const flat = flatLessons();
    return flat.find(e => e.lesson.id === id) || null;
  }

  function nextIncomplete() {
    const flat = flatLessons();
    return flat.find(e => !Progress.isDone(e.lesson.id)) || flat[flat.length - 1];
  }

  class LessonRunner {
    constructor({ vim, ui }) {
      this.vim = vim;
      this.ui = ui;
      this.current = null;
      this.hintShown = false;
      this.completed = false;

      // Run the lesson check after every keypress, not just buffer changes —
      // motions, search, marks, and ex commands do not mutate the buffer
      // but are still goal-relevant.
      vim.on('mode', () => { this._updateStatus(); });
      vim.on('keypress', () => { this._updateStatus(); this._afterKey(); });
    }

    load(lesson, chapter) {
      this.current = { lesson, chapter };
      this.hintShown = false;
      this.completed = false;
      const start = lesson.start || { text: '', cursor: { row: 0, col: 0 } };
      this.vim.setText(start.text, start.cursor);
      if (typeof lesson.setup === 'function') {
        lesson.setup(this.vim);
      }
      Progress.setLast(lesson.id);
      this.ui.renderLessonPanel(lesson, chapter);
      this.ui.setHintVisible(false);
      this.ui.setNextEnabled(Progress.isDone(lesson.id));
      this._updateStatus();
      this.vim.focus();
    }

    restart() {
      if (!this.current) return;
      this.completed = false;
      this.load(this.current.lesson, this.current.chapter);
    }

    showHint() {
      this.hintShown = true;
      this.ui.setHintVisible(true);
    }

    _afterKey() {
      this._updateStatus();
      if (!this.current) return;
      if (this.completed) return;
      const lesson = this.current.lesson;
      try {
        const ok = !!lesson.check(this.vim);
        if (ok) {
          this.completed = true;
          Progress.markDone(lesson.id);
          this.ui.setNextEnabled(true);
          this.ui.celebrate();
          this.ui.refreshProgress();
        }
      } catch {
        // lesson check may throw if cursor is weird; ignore
      }
    }

    _updateStatus() {
      this.ui.updateStatusLine(this.vim);
    }
  }

  window.Progress = Progress;
  window.LessonRunner = LessonRunner;
  window.flatLessons = flatLessons;
  window.findByLessonId = findByLessonId;
  window.nextIncomplete = nextIncomplete;
})();
