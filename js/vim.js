/* Vimstructor: Vim engine (educational subset of Vim).
   Not a complete Vim — just enough to teach the essentials convincingly. */
(function () {
  'use strict';

  const KEY_MAP = {
    'Escape': '<Esc>', 'Enter': '<CR>', 'Backspace': '<BS>',
    'Tab': '<Tab>', 'ArrowLeft': 'h', 'ArrowRight': 'l',
    'ArrowUp': 'k', 'ArrowDown': 'j', ' ': ' ',
  };

  const WORD_RE = /[A-Za-z0-9_]/;

  function classOf(c) {
    if (!c) return 'nil';
    if (/\s/.test(c)) return 'ws';
    if (WORD_RE.test(c)) return 'word';
    return 'punct';
  }

  class Vim {
    constructor(el, opts = {}) {
      this.el = el;
      this.opts = opts;
      this.lines = [''];
      this.cursor = { row: 0, col: 0 };
      this.mode = 'normal';
      this.visualAnchor = null;
      this.registers = { '"': { type: 'char', text: '' } };
      this.history = [];
      this.future = [];
      this.pending = '';
      this.lastFind = null;
      this.lastSearch = null;
      this.marks = {};
      this.cmdText = null;
      this.cmdPrefix = ':';
      this.keyLog = [];
      this.statusMsg = '';
      this.statusMsgType = '';
      this.listeners = { change: [], mode: [], keypress: [] };
      this._bind();
    }

    on(name, fn) { (this.listeners[name] ||= []).push(fn); return this; }
    emit(name, data) { (this.listeners[name] || []).forEach(f => f(data)); }

    _bind() {
      this._onKey = (e) => this._handleDomKey(e);
      this.el.addEventListener('keydown', this._onKey);
      this.el.addEventListener('click', () => this.el.focus());
    }
    destroy() { this.el.removeEventListener('keydown', this._onKey); }

    _handleDomKey(e) {
      if (e.ctrlKey && e.shiftKey) return;
      if (e.metaKey) return;
      if (e.key && e.key.length > 1 && e.key.startsWith('F') && !isNaN(+e.key.slice(1))) return;

      let k = e.key;
      if (k === 'Unidentified' || k === 'Dead') return;

      if (e.ctrlKey && !e.altKey) {
        if (k.length === 1) k = 'Ctrl-' + k.toLowerCase();
        else if (k === 'r' || k === 'd' || k === 'u') k = 'Ctrl-' + k;
        else return;
      } else if (KEY_MAP[k]) {
        k = KEY_MAP[k];
      } else if (k.length > 1) {
        return;
      }

      e.preventDefault();
      this.handleKey(k);
    }

    setText(text, cursor) {
      this.lines = text.split('\n');
      if (this.lines.length === 0) this.lines = [''];
      this.cursor = cursor ? { ...cursor } : { row: 0, col: 0 };
      this.clampCursor();
      this.history = [];
      this.future = [];
      this.pending = '';
      this.mode = 'normal';
      this.visualAnchor = null;
      this.marks = {};
      this.keyLog = [];
      this.statusMsg = '';
      this.cmdText = null;
      this.render();
      this.emit('change');
      this.emit('mode');
    }
    getText() { return this.lines.join('\n'); }
    focus() { this.el.focus(); }

    logKey(k) {
      this.keyLog.push(k);
      if (this.keyLog.length > 60) this.keyLog.shift();
    }

    handleKey(k) {
      this.logKey(k);
      if (this.cmdText !== null) {
        this._handleCmdLine(k);
      } else if (this.mode === 'insert') {
        this._handleInsert(k);
      } else {
        this._handleNormal(k);
      }
      this.emit('keypress', { key: k });
    }

    _snapshot() {
      this.history.push({
        lines: this.lines.slice(),
        cursor: { ...this.cursor },
      });
      if (this.history.length > 200) this.history.shift();
      this.future = [];
    }
    _undo() {
      if (!this.history.length) { this._status('Already at oldest change', 'err'); return; }
      const prev = this.history.pop();
      this.future.push({ lines: this.lines.slice(), cursor: { ...this.cursor } });
      this.lines = prev.lines.slice();
      this.cursor = { ...prev.cursor };
      this.clampCursor();
    }
    _redo() {
      if (!this.future.length) { this._status('Already at newest change', 'err'); return; }
      const nxt = this.future.pop();
      this.history.push({ lines: this.lines.slice(), cursor: { ...this.cursor } });
      this.lines = nxt.lines.slice();
      this.cursor = { ...nxt.cursor };
      this.clampCursor();
    }

    _status(msg, type = '') { this.statusMsg = msg; this.statusMsgType = type; }

    clampCursor() {
      if (this.cursor.row < 0) this.cursor.row = 0;
      if (this.cursor.row >= this.lines.length) this.cursor.row = this.lines.length - 1;
      const line = this.lines[this.cursor.row] || '';
      const max = this.mode === 'insert' ? line.length : Math.max(0, line.length - 1);
      if (this.cursor.col > max) this.cursor.col = max;
      if (this.cursor.col < 0) this.cursor.col = 0;
    }

    _handleInsert(k) {
      if (k === '<Esc>' || k === 'Ctrl-[') {
        this.mode = 'normal';
        if (this.cursor.col > 0) this.cursor.col--;
        this.clampCursor();
        this.render(); this.emit('mode'); this.emit('change');
        return;
      }
      if (k === '<BS>') { this._insertBackspace(); }
      else if (k === '<CR>') { this._insertNewline(); }
      else if (k === '<Tab>') { this._insertStr('  '); }
      else if (k.length === 1) { this._insertStr(k); }
      this.render(); this.emit('change');
    }
    _insertStr(s) {
      const row = this.cursor.row, col = this.cursor.col;
      const line = this.lines[row];
      this.lines[row] = line.slice(0, col) + s + line.slice(col);
      this.cursor.col += s.length;
    }
    _insertNewline() {
      const row = this.cursor.row, col = this.cursor.col;
      const line = this.lines[row];
      const left = line.slice(0, col), right = line.slice(col);
      this.lines.splice(row, 1, left, right);
      this.cursor.row++;
      this.cursor.col = 0;
    }
    _insertBackspace() {
      const row = this.cursor.row, col = this.cursor.col;
      if (col > 0) {
        const line = this.lines[row];
        this.lines[row] = line.slice(0, col - 1) + line.slice(col);
        this.cursor.col--;
      } else if (row > 0) {
        const prev = this.lines[row - 1];
        const cur = this.lines[row];
        this.cursor.col = prev.length;
        this.lines[row - 1] = prev + cur;
        this.lines.splice(row, 1);
        this.cursor.row--;
      }
    }

    _startCmd(prefix) {
      this.cmdText = '';
      this.cmdPrefix = prefix;
      this.render();
    }
    _handleCmdLine(k) {
      if (k === '<Esc>' || k === 'Ctrl-[') {
        this.cmdText = null; this.render(); return;
      }
      if (k === '<CR>') {
        const raw = this.cmdText;
        const pfx = this.cmdPrefix;
        this.cmdText = null;
        if (pfx === ':') this._runExCommand(raw);
        else this._runSearch(raw, pfx === '?');
        this.render();
        return;
      }
      if (k === '<BS>') {
        if (this.cmdText.length === 0) { this.cmdText = null; this.render(); return; }
        this.cmdText = this.cmdText.slice(0, -1);
        this.render(); return;
      }
      if (k.length === 1) {
        this.cmdText += k;
        this.render();
      }
    }
    _runExCommand(raw) {
      const cmd = raw.trim();
      if (!cmd) return;
      if (cmd === 'w' || cmd === 'write') { this._status('"' + (this.opts.filename || 'file') + '" written', 'ok'); return; }
      if (cmd === 'q' || cmd === 'quit') { this._status('(quit ignored - this is a game)', ''); return; }
      if (cmd === 'wq' || cmd === 'x') { this._status('written and quit (simulated)', 'ok'); return; }
      const sub = cmd.match(/^(%|\d+(?:,\d+)?)?s\/((?:\\.|[^\/])*)\/((?:\\.|[^\/])*)(?:\/([gi]*))?$/);
      if (sub) {
        this._substitute(sub[1], sub[2], sub[3], sub[4] || '');
        return;
      }
      if (/^\d+$/.test(cmd)) {
        const n = Math.max(1, Math.min(this.lines.length, parseInt(cmd, 10)));
        this.cursor.row = n - 1;
        this.cursor.col = 0;
        this._moveToFirstNonBlank();
        return;
      }
      if (cmd === 'help' || cmd === 'h') { this._status('Press Esc and click a chapter to learn!', ''); return; }
      this._status('Not an editor command: ' + cmd, 'err');
    }
    _substitute(range, pat, rep, flags) {
      const global = flags.includes('g');
      const ci = flags.includes('i');
      let reFlags = '';
      if (global) reFlags += 'g';
      if (ci) reFlags += 'i';
      let re;
      try { re = new RegExp(pat, reFlags); } catch { this._status('Bad pattern', 'err'); return; }
      let startRow, endRow;
      if (range === '%') { startRow = 0; endRow = this.lines.length - 1; }
      else if (range && range.includes(',')) {
        const [a, b] = range.split(',').map(s => parseInt(s, 10) - 1);
        startRow = Math.max(0, a); endRow = Math.min(this.lines.length - 1, b);
      } else if (range) {
        startRow = endRow = Math.max(0, parseInt(range, 10) - 1);
      } else {
        startRow = endRow = this.cursor.row;
      }
      this._snapshot();
      let count = 0;
      for (let r = startRow; r <= endRow; r++) {
        const before = this.lines[r];
        const after = before.replace(re, (...args) => {
          count++;
          return rep.replace(/\\(\d)/g, (_, d) => args[+d] || '');
        });
        this.lines[r] = after;
      }
      this.clampCursor();
      this._status(count + ' substitution' + (count === 1 ? '' : 's'), 'ok');
    }
    _runSearch(pat, backward) {
      if (!pat) {
        if (!this.lastSearch) return;
        pat = this.lastSearch.pattern;
      }
      this.lastSearch = { pattern: pat, backward };
      this._searchNext(1, false);
    }

    _handleNormal(k) {
      if (k === '<Esc>' || k === 'Ctrl-[') {
        this.pending = '';
        if (this.mode === 'visual' || this.mode === 'vline') {
          this.mode = 'normal';
          this.visualAnchor = null;
          this.emit('mode');
        }
        this.render();
        return;
      }
      this.pending += k;
      const result = this._parsePending();
      if (result === 'done' || result === 'invalid') this.pending = '';
      this.render();
    }

    _parsePending() {
      const p = this.pending;
      let i = 0;
      let register = null;
      if (p[0] === '"') {
        if (p.length < 2) return 'incomplete';
        register = p[1];
        i = 2;
      }
      let count = 1;
      let hasCount = false;
      let cs = '';
      while (i < p.length && /[0-9]/.test(p[i]) && !(cs === '' && p[i] === '0')) {
        cs += p[i]; i++;
      }
      if (cs) { count = parseInt(cs, 10); hasCount = true; }
      if (i >= p.length) return 'incomplete';

      const rest = p.slice(i);
      return this._parseCommand(rest, count, hasCount, register);
    }

    _parseCommand(rest, count, hasCount, register) {
      const head = rest[0];

      if (head === '0') { this._motion('0', count); return 'done'; }

      const motions = ['h','l','j','k','w','W','b','B','e','E','$','^','G','{','}','%','|','+','-'];
      if (motions.includes(head)) {
        const useCount = (head === 'G') ? (hasCount ? count : null) : count;
        this._motion(head, useCount);
        return 'done';
      }

      if ('fFtT'.includes(head)) {
        if (rest.length < 2) return 'incomplete';
        this._motionFind(head, rest[1], count);
        return 'done';
      }
      if (head === ';') { this._repeatFind(count, false); return 'done'; }
      if (head === ',') { this._repeatFind(count, true); return 'done'; }

      if (head === 'g') {
        if (rest.length < 2) return 'incomplete';
        const c2 = rest[1];
        if (c2 === 'g') { this._motion('gg', hasCount ? count : 1); return 'done'; }
        if (c2 === 'e') { this._motion('ge', count); return 'done'; }
        if (c2 === 'E') { this._motion('gE', count); return 'done'; }
        if (c2 === '_') { this._motion('g_', count); return 'done'; }
        return 'invalid';
      }

      if (head === 'v') { this._enterVisual('char'); return 'done'; }
      if (head === 'V') { this._enterVisual('line'); return 'done'; }

      if ((this.mode === 'visual' || this.mode === 'vline') && (head === 'i' || head === 'a')) {
        if (rest.length < 2) return 'incomplete';
        const range = this._textObjectRange(head, rest[1]);
        if (range) {
          const norm = this._normalizeRange(range);
          this.visualAnchor = { row: norm.start.row, col: norm.start.col };
          this.cursor = { row: norm.end.row, col: norm.end.col };
          this.clampCursor();
        }
        return 'done';
      }

      if (head === 'i') { this._enterInsert('i'); return 'done'; }
      if (head === 'I') { this._enterInsert('I'); return 'done'; }
      if (head === 'a') { this._enterInsert('a'); return 'done'; }
      if (head === 'A') { this._enterInsert('A'); return 'done'; }
      if (head === 'o') { this._enterInsert('o'); return 'done'; }
      if (head === 'O') { this._enterInsert('O'); return 'done'; }
      if (head === 's') { this._substituteChar(count); return 'done'; }
      if (head === 'S') { this._substituteLine(count); return 'done'; }

      if (head === 'x') { this._deleteChars(count, false, register); return 'done'; }
      if (head === 'X') { this._deleteChars(count, true, register); return 'done'; }

      if (head === 'p') { this._put(register, true, count); return 'done'; }
      if (head === 'P') { this._put(register, false, count); return 'done'; }

      if (head === 'u') { this._undo(); this.clampCursor(); return 'done'; }
      if (head === 'Ctrl-r') { this._redo(); this.clampCursor(); return 'done'; }

      if (head === 'r') {
        if (rest.length < 2) return 'incomplete';
        this._replaceChar(rest[1], count);
        return 'done';
      }

      if (head === 'J') { this._joinLines(count); return 'done'; }

      // C, D, Y shortcuts (c$, d$, yy)
      if (head === 'C') { return this._parseOperator('c', '$', count, register); }
      if (head === 'D') { return this._parseOperator('d', '$', count, register); }
      if (head === 'Y') { return this._parseOperator('y', 'y', count, register); }

      if (head === '/' || head === '?') { this._startCmd(head); return 'done'; }
      if (head === ':') { this._startCmd(':'); return 'done'; }

      if (head === 'n') { this._searchNext(count, false); return 'done'; }
      if (head === 'N') { this._searchNext(count, true); return 'done'; }

      if (head === 'Ctrl-d') { this._scrollHalf(count, 1); return 'done'; }
      if (head === 'Ctrl-u') { this._scrollHalf(count, -1); return 'done'; }

      if (head === 'm') {
        if (rest.length < 2) return 'incomplete';
        this.marks[rest[1]] = { row: this.cursor.row, col: this.cursor.col };
        return 'done';
      }
      if (head === "'" || head === '`') {
        if (rest.length < 2) return 'incomplete';
        const m = this.marks[rest[1]];
        if (m) {
          this.cursor.row = m.row;
          this.cursor.col = head === '`' ? m.col : 0;
          if (head === "'") this._moveToFirstNonBlank();
          this.clampCursor();
        } else {
          this._status('Mark not set: ' + rest[1], 'err');
        }
        return 'done';
      }

      if ((this.mode === 'visual' || this.mode === 'vline') && 'dcyx'.includes(head)) {
        const range = this._visualRange();
        const op = head === 'x' ? 'd' : head;
        this._applyOp(op, range, register);
        return 'done';
      }

      if ('dcy'.includes(head)) {
        return this._parseOperator(head, rest.slice(1), count, register);
      }

      return 'invalid';
    }

    _parseOperator(op, rest, count, register) {
      if (!rest) return 'incomplete';
      let mc = 1, i = 0;
      let cs = '';
      while (i < rest.length && /[0-9]/.test(rest[i]) && !(cs === '' && rest[i] === '0')) {
        cs += rest[i]; i++;
      }
      if (cs) mc = parseInt(cs, 10);
      if (i >= rest.length) return 'incomplete';
      const rest2 = rest.slice(i);
      const total = count * mc;

      if (rest2[0] === op) {
        const startRow = this.cursor.row;
        const endRow = Math.min(this.lines.length - 1, startRow + (total - 1));
        this._applyOp(op, { start: { row: startRow, col: 0 }, end: { row: endRow, col: Math.max(0, this.lines[endRow].length - 1) }, type: 'line', inclusive: true }, register);
        return 'done';
      }

      if (rest2[0] === 'i' || rest2[0] === 'a') {
        if (rest2.length < 2) return 'incomplete';
        const range = this._textObjectRange(rest2[0], rest2[1]);
        if (range) this._applyOp(op, range, register);
        return 'done';
      }

      if (rest2[0] === 'g') {
        if (rest2.length < 2) return 'incomplete';
        const c2 = rest2[1];
        if (c2 === 'g') { const range = this._motionRange('gg', 1); this._applyOp(op, range, register); return 'done'; }
        if (c2 === 'e') { const range = this._motionRange('ge', total); this._applyOp(op, range, register); return 'done'; }
        if (c2 === '_') { const range = this._motionRange('g_', total); this._applyOp(op, range, register); return 'done'; }
        return 'invalid';
      }

      if ('fFtT'.includes(rest2[0])) {
        if (rest2.length < 2) return 'incomplete';
        const range = this._motionFindRange(rest2[0], rest2[1], total);
        if (range) this._applyOp(op, range, register);
        return 'done';
      }

      const simple = ['h','l','j','k','w','W','b','B','e','E','$','^','0','G','{','}','%','+','-'];
      if (simple.includes(rest2[0])) {
        // Vim's cw / cW quirk: when the change operator is applied to a word
        // motion, it behaves like ce / cE — don't eat the trailing whitespace.
        let motionKind = rest2[0];
        if (op === 'c' && motionKind === 'w') motionKind = 'e';
        else if (op === 'c' && motionKind === 'W') motionKind = 'E';
        const range = this._motionRange(motionKind, total);
        this._applyOp(op, range, register);
        return 'done';
      }

      return 'invalid';
    }

    _motion(kind, count) {
      const r = this._motionRange(kind, count);
      if (!r) return;
      const target = r.moveTo || r.end;
      this.cursor.row = target.row;
      this.cursor.col = target.col;
      if (kind === '^') this._moveToFirstNonBlank();
      this.clampCursor();
    }

    _motionRange(kind, count) {
      // For G, a null count means "last line"; don't collapse to 1.
      const rawCount = count;
      count = count || 1;
      const start = { row: this.cursor.row, col: this.cursor.col };
      let end = { ...start };
      let type = 'char';
      let inclusive = false;

      switch (kind) {
        case 'h':
          end.col = Math.max(0, start.col - count); break;
        case 'l': {
          const line = this.lines[start.row];
          end.col = Math.min(Math.max(0, line.length - 1), start.col + count);
          break;
        }
        case 'j': {
          end.row = Math.min(this.lines.length - 1, start.row + count);
          end.col = Math.min(Math.max(0, this.lines[end.row].length - 1), start.col);
          type = 'line'; inclusive = true;
          break;
        }
        case 'k': {
          end.row = Math.max(0, start.row - count);
          end.col = Math.min(Math.max(0, this.lines[end.row].length - 1), start.col);
          type = 'line'; inclusive = true;
          break;
        }
        case '0': end.col = 0; break;
        case '$': end.col = Math.max(0, (this.lines[end.row] || '').length - 1); inclusive = true; break;
        case '^': {
          const line = this.lines[end.row];
          let c = 0; while (c < line.length && /\s/.test(line[c])) c++;
          end.col = c;
          break;
        }
        case 'g_': {
          const line = this.lines[end.row];
          let c = line.length - 1;
          while (c >= 0 && /\s/.test(line[c])) c--;
          end.col = Math.max(0, c);
          inclusive = true;
          break;
        }
        case 'w': end = this._wordMotion(count, 'w', false); break;
        case 'W': end = this._wordMotion(count, 'w', true); break;
        case 'e': end = this._wordMotion(count, 'e', false); inclusive = true; break;
        case 'E': end = this._wordMotion(count, 'e', true); inclusive = true; break;
        case 'b': end = this._wordMotion(count, 'b', false); break;
        case 'B': end = this._wordMotion(count, 'b', true); break;
        case 'ge': end = this._wordMotion(count, 'ge', false); inclusive = true; break;
        case 'gE': end = this._wordMotion(count, 'ge', true); inclusive = true; break;
        case 'G': {
          const target = rawCount != null ? Math.max(0, Math.min(this.lines.length - 1, rawCount - 1)) : this.lines.length - 1;
          end.row = target; end.col = 0;
          type = 'line'; inclusive = true;
          break;
        }
        case 'gg': {
          const target = count != null ? Math.max(0, Math.min(this.lines.length - 1, count - 1)) : 0;
          end.row = target; end.col = 0;
          type = 'line'; inclusive = true;
          break;
        }
        case '{': {
          let r = start.row - 1;
          while (r > 0 && this.lines[r].trim() !== '') r--;
          end.row = Math.max(0, r); end.col = 0;
          break;
        }
        case '}': {
          let r = start.row + 1;
          while (r < this.lines.length - 1 && this.lines[r].trim() !== '') r++;
          end.row = r; end.col = 0;
          break;
        }
        case '+': {
          end.row = Math.min(this.lines.length - 1, start.row + count);
          end.col = 0;
          type = 'line'; inclusive = true;
          break;
        }
        case '-': {
          end.row = Math.max(0, start.row - count);
          end.col = 0;
          type = 'line'; inclusive = true;
          break;
        }
        case '%': {
          const line = this.lines[start.row];
          const open = '([{', close = ')]}';
          const ch = line[start.col];
          let dir = 0, matchCh = '';
          if (open.includes(ch)) { dir = 1; matchCh = close[open.indexOf(ch)]; }
          else if (close.includes(ch)) { dir = -1; matchCh = open[close.indexOf(ch)]; }
          else break;
          let depth = 1, r = start.row, c = start.col + dir;
          while (r >= 0 && r < this.lines.length) {
            const ln = this.lines[r];
            while (c >= 0 && c < ln.length) {
              if (ln[c] === ch) depth++;
              else if (ln[c] === matchCh) {
                depth--;
                if (!depth) { end.row = r; end.col = c; return { start, end, type: 'char', inclusive: true, moveTo: end }; }
              }
              c += dir;
            }
            r += dir;
            c = dir > 0 ? 0 : (this.lines[r] ? this.lines[r].length - 1 : 0);
          }
          break;
        }
      }
      return { start, end, type, inclusive, moveTo: end };
    }

    _wordMotion(count, kind, big) {
      let { row, col } = this.cursor;
      for (let n = 0; n < count; n++) {
        if (kind === 'w') {
          const startCls = this._cls(row, col, big);
          while (this._valid(row, col) && this._cls(row, col, big) === startCls && startCls !== 'ws') {
            const [nr, nc] = this._step(row, col, 1);
            if (nr === -1) { row = this.lines.length - 1; col = Math.max(0, this.lines[row].length - 1); break; }
            row = nr; col = nc;
          }
          while (row !== -1 && this._cls(row, col, big) === 'ws') {
            const [nr, nc] = this._step(row, col, 1);
            if (nr === -1) break;
            row = nr; col = nc;
          }
        } else if (kind === 'e') {
          let [nr, nc] = this._step(row, col, 1);
          if (nr === -1) break;
          row = nr; col = nc;
          while (this._cls(row, col, big) === 'ws') {
            [nr, nc] = this._step(row, col, 1);
            if (nr === -1) break;
            row = nr; col = nc;
          }
          if (nr === -1) break;
          const startCls = this._cls(row, col, big);
          while (true) {
            const [ar, ac] = this._step(row, col, 1);
            if (ar === -1) break;
            if (this._cls(ar, ac, big) !== startCls) break;
            row = ar; col = ac;
          }
        } else if (kind === 'b') {
          let [nr, nc] = this._step(row, col, -1);
          if (nr === -1) break;
          row = nr; col = nc;
          while (this._cls(row, col, big) === 'ws') {
            [nr, nc] = this._step(row, col, -1);
            if (nr === -1) break;
            row = nr; col = nc;
          }
          if (nr === -1) break;
          const startCls = this._cls(row, col, big);
          while (true) {
            const [ar, ac] = this._step(row, col, -1);
            if (ar === -1) break;
            if (this._cls(ar, ac, big) !== startCls) break;
            row = ar; col = ac;
          }
        } else if (kind === 'ge') {
          let [nr, nc] = this._step(row, col, -1);
          if (nr === -1) break;
          row = nr; col = nc;
          while (this._cls(row, col, big) === 'ws') {
            [nr, nc] = this._step(row, col, -1);
            if (nr === -1) break;
            row = nr; col = nc;
          }
        }
      }
      return { row, col };
    }
    _cls(row, col, big) {
      const line = this.lines[row];
      if (line == null) return 'nil';
      const ch = line[col];
      if (ch == null) return 'ws';
      if (big) return /\s/.test(ch) ? 'ws' : 'word';
      return classOf(ch);
    }
    _valid(row, col) {
      return row >= 0 && row < this.lines.length && col >= 0 && col < this.lines[row].length;
    }
    _step(row, col, dir) {
      if (dir > 0) {
        col++;
        if (col >= this.lines[row].length) {
          row++;
          if (row >= this.lines.length) return [-1, -1];
          col = 0;
        }
      } else {
        col--;
        if (col < 0) {
          row--;
          if (row < 0) return [-1, -1];
          col = Math.max(0, this.lines[row].length - 1);
        }
      }
      return [row, col];
    }

    _motionFind(kind, ch, count) {
      const r = this._motionFindRange(kind, ch, count);
      if (r) {
        this.cursor = { ...r.end };
        this.clampCursor();
        this.lastFind = { kind, ch };
      } else {
        this._status('Not found: ' + ch, 'err');
      }
    }
    _motionFindRange(kind, ch, count) {
      const row = this.cursor.row;
      const line = this.lines[row];
      const dir = (kind === 'f' || kind === 't') ? 1 : -1;
      const till = (kind === 't' || kind === 'T');
      let col = this.cursor.col;
      let found = -1;
      for (let n = 0; n < count; n++) {
        found = -1;
        col += dir;
        while (col >= 0 && col < line.length) {
          if (line[col] === ch) { found = col; break; }
          col += dir;
        }
        if (found === -1) return null;
      }
      const endCol = till ? found - dir : found;
      return {
        start: { row, col: this.cursor.col },
        end: { row, col: endCol },
        type: 'char',
        inclusive: true,
        moveTo: { row, col: endCol },
      };
    }
    _repeatFind(count, reverse) {
      if (!this.lastFind) return;
      let { kind, ch } = this.lastFind;
      if (reverse) {
        const flip = { f: 'F', F: 'f', t: 'T', T: 't' };
        kind = flip[kind];
      }
      this._motionFind(kind, ch, count);
    }

    _moveToFirstNonBlank() {
      const line = this.lines[this.cursor.row];
      let c = 0;
      while (c < line.length && /\s/.test(line[c])) c++;
      this.cursor.col = c;
    }

    _enterVisual(kind) {
      this.mode = kind === 'line' ? 'vline' : 'visual';
      this.visualAnchor = { row: this.cursor.row, col: this.cursor.col };
      this.emit('mode');
    }
    _visualRange() {
      const a = this.visualAnchor;
      const b = this.cursor;
      let start, end;
      if (a.row < b.row || (a.row === b.row && a.col <= b.col)) { start = { ...a }; end = { ...b }; }
      else { start = { ...b }; end = { ...a }; }
      if (this.mode === 'vline') {
        return {
          start: { row: start.row, col: 0 },
          end: { row: end.row, col: Math.max(0, this.lines[end.row].length - 1) },
          type: 'line', inclusive: true
        };
      }
      return { start, end, type: 'char', inclusive: true };
    }

    _textObjectRange(kind, ch) {
      const inside = kind === 'i';
      if (ch === 'w' || ch === 'W') return this._textObjectWord(inside, ch === 'W');
      const pairOpens = { '(': ')', ')': ')', '[': ']', ']': ']', '{': '}', '}': '}', '<': '>', '>': '>' };
      const flip = { ')': '(', ']': '[', '}': '{', '>': '<' };
      const quoteChars = ['"', "'", '`'];
      if (pairOpens[ch] !== undefined) {
        const open = flip[ch] || ch;
        const close = pairOpens[ch];
        return this._textObjectPair(open, close, inside);
      }
      if (ch === 'b') return this._textObjectPair('(', ')', inside);
      if (ch === 'B') return this._textObjectPair('{', '}', inside);
      if (quoteChars.includes(ch)) return this._textObjectQuote(ch, inside);
      if (ch === 'p') return this._textObjectParagraph(inside);
      return null;
    }
    _textObjectWord(inside, big) {
      const row = this.cursor.row, col = this.cursor.col;
      const line = this.lines[row];
      if (!line.length) return null;
      const cls = big ? (c => /\s/.test(c) ? 'ws' : 'word') : classOf;
      const target = cls(line[col]);
      let s = col, e = col;
      while (s > 0 && cls(line[s - 1]) === target) s--;
      while (e < line.length - 1 && cls(line[e + 1]) === target) e++;
      if (!inside) {
        while (e < line.length - 1 && /\s/.test(line[e + 1])) e++;
      }
      return { start: { row, col: s }, end: { row, col: e }, type: 'char', inclusive: true };
    }
    _textObjectPair(open, close, inside) {
      const row = this.cursor.row, col = this.cursor.col;
      const line = this.lines[row];
      let depth = 0;
      let so = -1;
      for (let c = col; c >= 0; c--) {
        if (line[c] === close) depth++;
        else if (line[c] === open) {
          if (depth === 0) { so = c; break; }
          depth--;
        }
      }
      if (so === -1) return null;
      depth = 0;
      let eo = -1;
      for (let c = so + 1; c < line.length; c++) {
        if (line[c] === open) depth++;
        else if (line[c] === close) {
          if (depth === 0) { eo = c; break; }
          depth--;
        }
      }
      if (eo === -1) return null;
      if (inside) {
        if (eo - so <= 1) return null;
        return { start: { row, col: so + 1 }, end: { row, col: eo - 1 }, type: 'char', inclusive: true };
      }
      return { start: { row, col: so }, end: { row, col: eo }, type: 'char', inclusive: true };
    }
    _textObjectQuote(q, inside) {
      const row = this.cursor.row, col = this.cursor.col;
      const line = this.lines[row];
      let first = -1;
      for (let c = 0; c <= col; c++) if (line[c] === q) first = c;
      if (first === -1) {
        first = line.indexOf(q, col);
        if (first === -1) return null;
      }
      const second = line.indexOf(q, first + 1);
      if (second === -1) return null;
      if (inside) {
        if (second - first <= 1) return null;
        return { start: { row, col: first + 1 }, end: { row, col: second - 1 }, type: 'char', inclusive: true };
      }
      return { start: { row, col: first }, end: { row, col: second }, type: 'char', inclusive: true };
    }
    _textObjectParagraph(inside) {
      let r = this.cursor.row;
      let s = r, e = r;
      while (s > 0 && this.lines[s - 1].trim() !== '') s--;
      while (e < this.lines.length - 1 && this.lines[e + 1].trim() !== '') e++;
      if (!inside) {
        while (e < this.lines.length - 1 && this.lines[e + 1].trim() === '') e++;
      }
      return {
        start: { row: s, col: 0 },
        end: { row: e, col: Math.max(0, this.lines[e].length - 1) },
        type: 'line', inclusive: true
      };
    }

    _normalizeRange(range) {
      let { start, end, type, inclusive } = range;
      const cmp = (a, b) => (a.row - b.row) || (a.col - b.col);
      if (cmp(start, end) > 0) { const t = start; start = end; end = t; }
      return { start: { ...start }, end: { ...end }, type, inclusive };
    }
    _rangeText(range) {
      const { start, end, type, inclusive } = this._normalizeRange(range);
      if (type === 'line') {
        return this.lines.slice(start.row, end.row + 1).join('\n') + '\n';
      }
      if (start.row === end.row) {
        const line = this.lines[start.row];
        const ec = inclusive ? end.col + 1 : end.col;
        return line.slice(start.col, ec);
      }
      let out = this.lines[start.row].slice(start.col);
      for (let r = start.row + 1; r < end.row; r++) out += '\n' + this.lines[r];
      const ec = inclusive ? end.col + 1 : end.col;
      out += '\n' + this.lines[end.row].slice(0, ec);
      return out;
    }
    _deleteRange(range) {
      const { start, end, type, inclusive } = this._normalizeRange(range);
      this._snapshot();
      if (type === 'line') {
        this.lines.splice(start.row, end.row - start.row + 1);
        if (!this.lines.length) this.lines = [''];
        this.cursor.row = Math.min(this.lines.length - 1, start.row);
        this.cursor.col = 0;
        this._moveToFirstNonBlank();
        return;
      }
      if (start.row === end.row) {
        const line = this.lines[start.row];
        const ec = inclusive ? end.col + 1 : end.col;
        this.lines[start.row] = line.slice(0, start.col) + line.slice(ec);
      } else {
        const left = this.lines[start.row].slice(0, start.col);
        const ec = inclusive ? end.col + 1 : end.col;
        const right = this.lines[end.row].slice(ec);
        this.lines.splice(start.row, end.row - start.row + 1, left + right);
      }
      this.cursor = { ...start };
      this.clampCursor();
    }
    _applyOp(op, range, register) {
      if (!range) return;
      const text = this._rangeText(range);
      const { type } = this._normalizeRange(range);
      const reg = register || '"';
      this.registers[reg] = { type: type === 'line' ? 'line' : 'char', text };
      this.registers['"'] = this.registers[reg];
      if (op === 'y') {
        if (this.mode === 'visual' || this.mode === 'vline') {
          this.cursor = { ...this._normalizeRange(range).start };
          this.mode = 'normal'; this.visualAnchor = null; this.emit('mode');
        }
        return;
      }
      // Exit visual mode before mutating — needed for clamp semantics.
      if (this.mode === 'visual' || this.mode === 'vline') {
        this.mode = 'normal'; this.visualAnchor = null; this.emit('mode');
      }
      // For 'c', switch to insert mode BEFORE the delete so clampCursor
      // uses insert-mode bounds (col may equal line.length for appending).
      if (op === 'c') {
        this.mode = 'insert';
      }
      this._deleteRange(range);
      if (op === 'c') {
        if (type === 'line') {
          this.lines.splice(this.cursor.row, 0, '');
          this.cursor.col = 0;
        }
        this.emit('mode');
      }
      this.emit('change');
    }

    _deleteChars(count, back, register) {
      const row = this.cursor.row;
      const line = this.lines[row];
      if (!line.length) return;
      let start, end;
      if (back) {
        if (this.cursor.col === 0) return;
        start = { row, col: Math.max(0, this.cursor.col - count) };
        end = { row, col: this.cursor.col - 1 };
      } else {
        start = { row, col: this.cursor.col };
        end = { row, col: Math.min(line.length - 1, this.cursor.col + count - 1) };
      }
      if (end.col < start.col) return;
      this._applyOp('d', { start, end, type: 'char', inclusive: true }, register);
      this.clampCursor();
    }

    _replaceChar(ch, count) {
      const row = this.cursor.row;
      const line = this.lines[row];
      if (this.cursor.col + count > line.length) return;
      this._snapshot();
      const replaced = ch.repeat(count);
      this.lines[row] = line.slice(0, this.cursor.col) + replaced + line.slice(this.cursor.col + count);
      this.cursor.col += count - 1;
      this.clampCursor();
    }
    _substituteChar(count) {
      this._deleteChars(count, false, null);
      this.mode = 'insert';
      this.emit('mode');
    }
    _substituteLine(count) {
      const row = this.cursor.row;
      const endRow = Math.min(this.lines.length - 1, row + count - 1);
      this._applyOp('c', { start: { row, col: 0 }, end: { row: endRow, col: Math.max(0, this.lines[endRow].length - 1) }, type: 'line', inclusive: true }, null);
    }
    _joinLines(count) {
      if (this.cursor.row >= this.lines.length - 1) return;
      this._snapshot();
      const n = Math.max(1, count - 1) || 1;
      for (let i = 0; i < n; i++) {
        if (this.cursor.row >= this.lines.length - 1) break;
        const a = this.lines[this.cursor.row];
        const b = this.lines[this.cursor.row + 1].replace(/^\s+/, '');
        const sep = (a.length && !/\s$/.test(a) && b.length) ? ' ' : '';
        this.lines[this.cursor.row] = a + sep + b;
        this.lines.splice(this.cursor.row + 1, 1);
      }
    }

    _put(register, after, count) {
      const reg = register || '"';
      const data = this.registers[reg];
      if (!data || !data.text) { this._status('Nothing in register ' + reg, 'err'); return; }
      this._snapshot();
      const { type, text } = data;
      const times = count || 1;
      if (type === 'line') {
        const body = text.replace(/\n$/, '').split('\n');
        const targetRow = after ? this.cursor.row + 1 : this.cursor.row;
        const allLines = [];
        for (let i = 0; i < times; i++) body.forEach(l => allLines.push(l));
        this.lines.splice(targetRow, 0, ...allLines);
        this.cursor.row = targetRow;
        this.cursor.col = 0;
        this._moveToFirstNonBlank();
      } else {
        const row = this.cursor.row;
        const line = this.lines[row];
        const insertAt = (after && line.length > 0) ? Math.min(line.length, this.cursor.col + 1) : this.cursor.col;
        let repeatedText = '';
        for (let i = 0; i < times; i++) repeatedText += text;
        if (repeatedText.includes('\n')) {
          const pieces = repeatedText.split('\n');
          const before = line.slice(0, insertAt);
          const afterText = line.slice(insertAt);
          const newLines = [before + pieces[0], ...pieces.slice(1, -1), pieces[pieces.length - 1] + afterText];
          this.lines.splice(row, 1, ...newLines);
        } else {
          this.lines[row] = line.slice(0, insertAt) + repeatedText + line.slice(insertAt);
          this.cursor.col = insertAt + Math.max(0, repeatedText.length - 1);
        }
      }
      this.clampCursor();
    }

    _searchNext(count, reverse) {
      if (!this.lastSearch) { this._status('No previous search', 'err'); return; }
      let { pattern, backward } = this.lastSearch;
      if (reverse) backward = !backward;
      let row = this.cursor.row, col = this.cursor.col;
      for (let n = 0; n < count; n++) {
        const res = this._searchFrom(pattern, row, col, backward);
        if (!res) { this._status('Pattern not found: ' + pattern, 'err'); return; }
        row = res.row; col = res.col;
      }
      this.cursor.row = row; this.cursor.col = col;
      this.clampCursor();
    }
    _searchFrom(pattern, row, col, backward) {
      let re;
      try { re = new RegExp(pattern); } catch { return null; }
      const N = this.lines.length;
      if (!backward) {
        for (let i = 0; i < N; i++) {
          const r = (row + i) % N;
          const line = this.lines[r];
          const startCol = (i === 0) ? col + 1 : 0;
          const m = line.slice(startCol).match(re);
          if (m) return { row: r, col: startCol + m.index };
        }
      } else {
        for (let i = 0; i < N; i++) {
          const r = (row - i + N) % N;
          const line = this.lines[r];
          const slice = i === 0 ? line.slice(0, col) : line;
          const gre = new RegExp(pattern, 'g');
          const matches = [...slice.matchAll(gre)];
          if (matches.length) return { row: r, col: matches[matches.length - 1].index };
        }
      }
      return null;
    }

    _scrollHalf(count, dir) {
      const n = 10 * count;
      this.cursor.row = Math.max(0, Math.min(this.lines.length - 1, this.cursor.row + dir * n));
      this.clampCursor();
    }

    _enterInsert(kind) {
      this._snapshot();
      if (kind === 'i') { /* stay */ }
      else if (kind === 'a') { this.cursor.col = Math.min(this.lines[this.cursor.row].length, this.cursor.col + 1); }
      else if (kind === 'I') { this._moveToFirstNonBlank(); }
      else if (kind === 'A') { this.cursor.col = this.lines[this.cursor.row].length; }
      else if (kind === 'o') {
        this.lines.splice(this.cursor.row + 1, 0, '');
        this.cursor.row++;
        this.cursor.col = 0;
      } else if (kind === 'O') {
        this.lines.splice(this.cursor.row, 0, '');
        this.cursor.col = 0;
      }
      this.mode = 'insert';
      this.emit('mode');
      this.emit('change');
    }

    // ---------- render (DOM-based, no innerHTML) ----------
    render() {
      this.clampCursor();
      const sel = (this.mode === 'visual' || this.mode === 'vline') ? this._visualRange() : null;
      const normSel = sel ? this._normalizeRange(sel) : null;

      // clear children
      while (this.el.firstChild) this.el.removeChild(this.el.firstChild);

      for (let r = 0; r < this.lines.length; r++) {
        const line = this.lines[r];
        const lnDiv = document.createElement('div');
        lnDiv.className = 'ln';
        const num = document.createElement('span');
        num.className = 'ln-num';
        num.textContent = String(r + 1);
        lnDiv.appendChild(num);
        const content = document.createElement('span');
        content.className = 'ln-content';

        const length = line.length;
        const cellCount = length + 1; // trailing slot for cursor at EOL
        for (let c = 0; c < cellCount; c++) {
          const isEOL = c === length;
          const ch = isEOL ? ' ' : line[c];
          const span = document.createElement('span');
          span.className = 'ch';
          const isCursor = (r === this.cursor.row && c === this.cursor.col);
          let inSel = false;
          if (normSel && !isEOL) {
            const { start, end, type } = normSel;
            if (type === 'line') {
              if (r >= start.row && r <= end.row) inSel = true;
            } else {
              if (r > start.row && r < end.row) inSel = true;
              else if (start.row === end.row && r === start.row) inSel = (c >= start.col && c <= end.col);
              else if (r === start.row) inSel = c >= start.col;
              else if (r === end.row) inSel = c <= end.col;
            }
          }
          if (inSel) span.classList.add('visual');
          if (isCursor) span.classList.add('cursor');
          span.textContent = ch === '' ? ' ' : ch;
          content.appendChild(span);
        }
        lnDiv.appendChild(content);
        this.el.appendChild(lnDiv);
      }
      this.el.classList.toggle('insert', this.mode === 'insert');
    }

    getModeLabel() {
      if (this.cmdText !== null) return 'COMMAND';
      if (this.mode === 'insert') return 'INSERT';
      if (this.mode === 'visual') return 'VISUAL';
      if (this.mode === 'vline') return 'VLINE';
      return 'NORMAL';
    }
  }

  window.Vim = Vim;
})();
