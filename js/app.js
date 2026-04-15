/* Vimstructor: main app — routing, UI rendering, wiring. */
(function () {
  'use strict';

  // ---------- small DOM helpers ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') el.className = v;
        else if (k === 'onclick') el.addEventListener('click', v);
        else if (k === 'html') setHTMLSafe(el, v);
        else if (v !== false && v != null) el.setAttribute(k, v);
      }
    }
    for (const kid of kids) {
      if (kid == null || kid === false) continue;
      if (typeof kid === 'string') el.appendChild(document.createTextNode(kid));
      else el.appendChild(kid);
    }
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  // Render a restricted subset of HTML tags into an element by tokenizing
  // allowed tags (<code>, <b>, <i>, <kbd>, <br>). Other content becomes text
  // nodes. Keeps the lesson authoring ergonomic without XSS risk.
  function setHTMLSafe(el, markup) {
    clear(el);
    if (!markup) return;
    const parser = /<(\/?)(code|b|i|kbd|br)\s*>/gi;
    const matches = [...markup.matchAll(parser)];
    let idx = 0;
    const stack = [el];
    for (const m of matches) {
      const before = markup.slice(idx, m.index);
      if (before) stack[stack.length - 1].appendChild(document.createTextNode(before));
      const closing = m[1] === '/';
      const tag = m[2].toLowerCase();
      if (tag === 'br') {
        stack[stack.length - 1].appendChild(document.createElement('br'));
      } else if (closing) {
        if (stack.length > 1) stack.pop();
      } else {
        const child = document.createElement(tag);
        stack[stack.length - 1].appendChild(child);
        stack.push(child);
      }
      idx = m.index + m[0].length;
    }
    if (idx < markup.length) {
      stack[stack.length - 1].appendChild(document.createTextNode(markup.slice(idx)));
    }
  }

  // ---------- Views ----------
  const views = {
    menu: document.getElementById('view-menu'),
    play: document.getElementById('view-play'),
    reference: document.getElementById('view-reference'),
    about: document.getElementById('view-about'),
  };
  function show(name) {
    Object.entries(views).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
    if (name === 'menu') renderMenu();
    if (name === 'reference') renderCheatsheet();
  }

  // ---------- UI bridge passed to LessonRunner ----------
  const UI = {
    renderLessonPanel(lesson, chapter) {
      const flat = flatLessons();
      const idx = flat.findIndex(e => e.lesson.id === lesson.id);

      document.getElementById('breadcrumb').textContent =
        `${chapter.title}  ·  Lesson ${flat[idx].lessonIdx + 1} of ${chapter.lessons.length}`;
      document.getElementById('lessonTitle').textContent = lesson.title;
      setHTMLSafe(document.getElementById('lessonBrief'), lesson.brief || '');
      setHTMLSafe(document.getElementById('lessonGoal'), lesson.goal || '');
      setHTMLSafe(document.getElementById('lessonHint'), lesson.hint || '');
      this.refreshProgress();
    },
    setHintVisible(v) {
      const el = document.getElementById('lessonHint');
      el.classList.toggle('show', v);
    },
    setNextEnabled(v) {
      const btn = document.getElementById('btnNext');
      btn.disabled = !v;
    },
    updateStatusLine(vim) {
      const modeEl = document.getElementById('modeIndicator');
      const label = vim.getModeLabel();
      modeEl.textContent = label;
      modeEl.className = 'mode ' + label;
      document.getElementById('slFilename').textContent = vim.opts.filename || '~/scratch';
      document.getElementById('cursorPos').textContent =
        (vim.cursor.row + 1) + ',' + (vim.cursor.col + 1);
      document.getElementById('pendingKeys').textContent = vim.pending || '';
      const cmdEl = document.getElementById('cmdline');
      cmdEl.className = 'cmdline';
      if (vim.cmdText !== null) {
        cmdEl.textContent = vim.cmdPrefix + vim.cmdText + '_';
      } else if (vim.statusMsg) {
        cmdEl.classList.add(vim.statusMsgType || '');
        cmdEl.textContent = vim.statusMsg;
      } else {
        cmdEl.textContent = '';
      }
      const log = document.getElementById('keyLog');
      clear(log);
      vim.keyLog.slice(-30).forEach(k => {
        const span = document.createElement('span');
        span.className = 'key';
        span.textContent = k;
        log.appendChild(span);
      });
    },
    celebrate() {
      toast('Lesson complete! Press Next.', false);
    },
    refreshProgress() {
      const t = Progress.totals();
      const pct = t.total ? Math.round((t.done / t.total) * 100) : 0;
      document.getElementById('progressFill').style.width = pct + '%';
      document.getElementById('progressText').textContent = `${t.done}/${t.total}`;
      document.getElementById('footerProgress').textContent = `Progress: ${t.done}/${t.total}`;
    },
  };

  function toast(msg, isErr) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.toggle('err', !!isErr);
    t.classList.add('show');
    clearTimeout(toast._tm);
    toast._tm = setTimeout(() => t.classList.remove('show'), 1600);
  }

  // ---------- Init ----------
  Progress.load();
  let vim, runner;

  function initEditor() {
    const editorEl = document.getElementById('editor');
    vim = new Vim(editorEl, { filename: '~/scratch' });
    runner = new LessonRunner({ vim, ui: UI });
    vim.setText('', { row: 0, col: 0 });
    window.Vimstructor = { vim, runner, startLesson };
  }

  // ---------- Menu rendering ----------
  function renderMenu() {
    const menuStats = document.getElementById('menuStats');
    clear(menuStats);
    const t = Progress.totals();
    menuStats.appendChild(stat('Lessons completed', t.done + ' / ' + t.total));
    menuStats.appendChild(stat('Chapters', String(window.CHAPTERS.length)));
    const last = Progress.data.lastLesson ? (findByLessonId(Progress.data.lastLesson) || null) : null;
    if (last) menuStats.appendChild(stat('Last played', last.chapter.title));

    const list = document.getElementById('chapterList');
    clear(list);

    for (let ci = 0; ci < window.CHAPTERS.length; ci++) {
      const ch = window.CHAPTERS[ci];
      const cp = Progress.chapterProgress(ch);
      const card = h('div', { class: 'chapter-card' });
      card.appendChild(h('div', { class: 'ch-num' }, 'Chapter ' + (ci + 1)));
      card.appendChild(h('h3', null, ch.title));
      card.appendChild(h('p', null, ch.summary));
      const meta = h('div', { class: 'ch-meta' });
      meta.appendChild(h('span', null, cp.total + ' lesson' + (cp.total === 1 ? '' : 's')));
      const rightMeta = h('span', { class: cp.done === cp.total ? 'done' : '' },
        cp.done === cp.total ? 'Completed' : (cp.done + '/' + cp.total));
      meta.appendChild(rightMeta);
      card.appendChild(meta);
      const progBar = h('div', { class: 'ch-progress' });
      const progFill = h('div');
      progFill.style.width = cp.total ? (100 * cp.done / cp.total) + '%' : '0%';
      progBar.appendChild(progFill);
      card.appendChild(progBar);
      card.addEventListener('click', () => {
        const first = ch.lessons.find(l => !Progress.isDone(l.id)) || ch.lessons[0];
        startLesson(first.id);
      });
      list.appendChild(card);
    }
  }
  function stat(label, value) {
    const s = h('div', { class: 'stat' });
    s.appendChild(document.createTextNode(label + ': '));
    const b = document.createElement('b');
    b.textContent = value;
    s.appendChild(b);
    return s;
  }

  // ---------- Cheatsheet rendering ----------
  function renderCheatsheet() {
    const root = document.getElementById('cheatsheet');
    clear(root);
    for (const g of window.CHEATSHEET) {
      const group = h('div', { class: 'cheat-group' });
      group.appendChild(h('h3', null, g.group));
      const table = document.createElement('table');
      for (const [keys, desc] of g.items) {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = keys;
        const td2 = document.createElement('td');
        td2.textContent = desc;
        tr.appendChild(td1);
        tr.appendChild(td2);
        table.appendChild(tr);
      }
      group.appendChild(table);
      root.appendChild(group);
    }
  }

  // ---------- Lesson start ----------
  function startLesson(lessonId) {
    const entry = findByLessonId(lessonId);
    if (!entry) return;
    show('play');
    runner.load(entry.lesson, entry.chapter);
    UI.refreshProgress();
  }

  function goNextLesson() {
    const cur = runner.current;
    if (!cur) return;
    const flat = flatLessons();
    const i = flat.findIndex(e => e.lesson.id === cur.lesson.id);
    if (i >= 0 && i < flat.length - 1) {
      startLesson(flat[i + 1].lesson.id);
    } else {
      show('menu');
      toast('You finished the curriculum. Legend.');
    }
  }
  function goPrevLesson() {
    const cur = runner.current;
    if (!cur) return;
    const flat = flatLessons();
    const i = flat.findIndex(e => e.lesson.id === cur.lesson.id);
    if (i > 0) startLesson(flat[i - 1].lesson.id);
  }

  // ---------- wire UI ----------
  function wire() {
    document.querySelectorAll('.navbtn[data-view]').forEach(b => {
      b.addEventListener('click', () => {
        const v = b.getAttribute('data-view');
        if (v === 'play') {
          const id = Progress.data.lastLesson || nextIncomplete().lesson.id;
          startLesson(id);
        } else {
          show(v);
        }
      });
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (!confirm('Reset all progress? This cannot be undone.')) return;
      Progress.reset();
      renderMenu();
      UI.refreshProgress();
      toast('Progress reset.');
    });
    document.getElementById('btnNext').addEventListener('click', goNextLesson);
    document.getElementById('btnPrev').addEventListener('click', goPrevLesson);
    document.getElementById('btnHint').addEventListener('click', () => runner.showHint());
    document.getElementById('btnReset').addEventListener('click', () => runner.restart());
  }

  // ---------- go ----------
  document.addEventListener('DOMContentLoaded', () => {
    initEditor();
    wire();
    UI.refreshProgress();
    show('menu');
  });
})();
