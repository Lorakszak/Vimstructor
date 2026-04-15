/* Vimstructor: chapter & lesson data.
   Each lesson has:
     id, title, brief, goal, hint, start {text, cursor}, check(vim)->bool
   Check is a pure predicate over vim state. Helpers below reduce noise.
*/
(function () {
  'use strict';

  // ---- lesson check helpers ----
  const eqText = (s) => (v) => v.getText() === s;
  const lineEq = (r, s) => (v) => v.lines[r] === s;
  const atRow = (r) => (v) => v.cursor.row === r;
  const atCol = (c) => (v) => v.cursor.col === c;
  const at = (r, c) => (v) => v.cursor.row === r && v.cursor.col === c;
  const modeIs = (m) => (v) => v.mode === m;
  const all = (...fns) => (v) => fns.every(f => f(v));
  const any = (...fns) => (v) => fns.some(f => f(v));
  const usedKey = (k) => (v) => v.keyLog.includes(k);
  const usedSeq = (seq) => (v) => v.keyLog.join(' ').includes(seq.join(' '));
  const notUsedKey = (k) => (v) => !v.keyLog.includes(k);

  const CH = [];

  // ============================================================
  // Chapter 1: The Four Modes
  // ============================================================
  CH.push({
    id: 'modes',
    title: 'The Four Modes',
    summary: 'Vim has Normal, Insert, Visual, and Command modes. Learn what each does.',
    lessons: [
      {
        id: 'modes-1',
        title: 'Welcome, apprentice',
        brief: 'Vim is a keyboard-driven text editor. Instead of clicking around, you issue short commands. Before touching keys, know this: Vim starts in NORMAL mode. In Normal mode, letters are commands, not text.',
        goal: 'Press any key a few times. Watch the key log and the status line. Then press <code>i</code> to switch to INSERT mode.',
        hint: 'Just press the letter i on your keyboard.',
        start: { text: 'In Normal mode, keys are commands.\nIn Insert mode, keys become text.', cursor: { row: 0, col: 0 } },
        check: (v) => v.mode === 'insert',
      },
      {
        id: 'modes-2',
        title: 'Back to Normal',
        brief: 'You are now in INSERT mode. You can type text, but you cannot run Vim commands. To command Vim, always return to NORMAL mode first.',
        goal: 'Press <code>Esc</code> to return to NORMAL mode.',
        hint: 'Hit the Esc key. If you don\'t have one, press Ctrl-[.',
        start: { text: 'Press Esc to go back to Normal.', cursor: { row: 0, col: 0 } },
        setup: (v) => { v.mode = 'insert'; v.emit('mode'); v.render(); },
        check: (v) => v.mode === 'normal',
      },
      {
        id: 'modes-3',
        title: 'Write something',
        brief: 'Now let\'s combine both. Enter Insert mode with <code>i</code>, type the word <code>hi</code>, and return to Normal with <code>Esc</code>.',
        goal: 'The buffer should contain <code>hi</code> and you should be in NORMAL mode.',
        hint: 'Press i, then type h, then i, then press Esc.',
        start: { text: '', cursor: { row: 0, col: 0 } },
        check: all(eqText('hi'), modeIs('normal')),
      },
      {
        id: 'modes-4',
        title: 'The Command line',
        brief: 'Besides Normal and Insert, Vim has a Command line (<code>:</code>) for ex-commands like saving, searching, and substituting. You\'ll meet it often.',
        goal: 'In NORMAL mode, press <code>:</code>, type <code>w</code>, and press Enter to "save" the file.',
        hint: 'Type : then w then Enter.',
        start: { text: 'Try :w to save (it is simulated here).', cursor: { row: 0, col: 0 } },
        check: (v) => v.statusMsg.includes('written'),
      },
    ],
  });

  // ============================================================
  // Chapter 2: Basic Movement (hjkl)
  // ============================================================
  CH.push({
    id: 'hjkl',
    title: 'hjkl: The Vim Arrows',
    summary: 'Move without ever leaving home row. h, j, k, l are your left, down, up, right.',
    lessons: [
      {
        id: 'hjkl-1',
        title: 'Right with l',
        brief: 'In Normal mode, <code>l</code> moves the cursor one character to the right. Your cursor starts at column 1; get it to the X.',
        goal: 'Move the cursor onto the <code>X</code>.',
        hint: 'Press l repeatedly. Or type 5l to jump five columns at once.',
        start: { text: 'abcdeXfghij', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 0 && v.cursor.col === 5,
      },
      {
        id: 'hjkl-2',
        title: 'Left with h',
        brief: '<code>h</code> moves left. Just like <code>l</code>, you can count it: <code>3h</code>.',
        goal: 'Move the cursor onto the <code>X</code>.',
        hint: 'Press h to go left.',
        start: { text: 'abcXdefghij', cursor: { row: 0, col: 9 } },
        check: (v) => v.cursor.row === 0 && v.cursor.col === 3,
      },
      {
        id: 'hjkl-3',
        title: 'Down with j',
        brief: '<code>j</code> moves the cursor down one line. Think of j as "jumping down" (or: it has a tail that hangs down).',
        goal: 'Get to the line with the <code>X</code>.',
        hint: 'Press j four times, or type 4j.',
        start: { text: 'line 1\nline 2\nline 3\nline 4\nX here', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 4,
      },
      {
        id: 'hjkl-4',
        title: 'Up with k',
        brief: '<code>k</code> moves up one line. "k" is above "j" on the keyboard, sort of.',
        goal: 'Get to the top line.',
        hint: 'Press k repeatedly.',
        start: { text: 'X top\na\nb\nc\nstart', cursor: { row: 4, col: 0 } },
        check: (v) => v.cursor.row === 0,
      },
      {
        id: 'hjkl-5',
        title: 'Counts',
        brief: 'Any motion can be prefixed with a number. <code>7j</code> moves down seven lines. <code>12l</code> moves right twelve columns. Use counts whenever you can see exactly where you need to go.',
        goal: 'Jump down exactly six lines using a count.',
        hint: 'Type 6 then j.',
        start: { text: 'start\na\nb\nc\nd\ne\ntarget\nf\ng\nh', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 6 && v.keyLog.join('').includes('6j'),
      },
    ],
  });

  // ============================================================
  // Chapter 3: Word Motion
  // ============================================================
  CH.push({
    id: 'words',
    title: 'Move by Words',
    summary: 'Instead of crawling character by character, leap word by word with w, b, and e.',
    lessons: [
      {
        id: 'words-1',
        title: 'Forward with w',
        brief: '<code>w</code> jumps to the start of the next word. A word is a run of letters/digits/underscores, or a run of punctuation.',
        goal: 'Land on the word <code>target</code>.',
        hint: 'Press w until you reach it. Try counts: 4w.',
        start: { text: 'the quick brown target fox', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 0 && v.cursor.col === 'the quick brown '.length,
      },
      {
        id: 'words-2',
        title: 'Back with b',
        brief: '<code>b</code> goes backward to the start of the previous word. It\'s the mirror of <code>w</code>.',
        goal: 'Go back to the first word of the line.',
        hint: 'Press b until you reach the start.',
        start: { text: 'first second third fourth fifth', cursor: { row: 0, col: 20 } },
        check: (v) => v.cursor.row === 0 && v.cursor.col === 0,
      },
      {
        id: 'words-3',
        title: 'End with e',
        brief: '<code>e</code> jumps to the end of the current or next word. Great before a delete-to-end.',
        goal: 'Land on the <code>d</code> at the end of <code>brand</code>.',
        hint: 'Press e a few times.',
        start: { text: 'a new brand of coffee', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 0 && v.cursor.col === 'a new bran'.length,
      },
      {
        id: 'words-4',
        title: 'WORDS vs words',
        brief: 'Uppercase <code>W</code>, <code>B</code>, <code>E</code> work on WORDS: whitespace-separated chunks. In the text below, <code>w</code> stops at each dot, but <code>W</code> does not.',
        goal: 'Use <code>W</code> to land on the word <code>here</code>.',
        hint: 'Press W repeatedly.',
        start: { text: 'foo.bar.baz qux here end', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 0 && v.cursor.col === 'foo.bar.baz qux '.length && v.keyLog.includes('W'),
      },
    ],
  });

  // ============================================================
  // Chapter 4: Line Motion
  // ============================================================
  CH.push({
    id: 'line',
    title: 'Jump Around a Line',
    summary: 'Hop to the start, end, or first non-blank of a line without counting columns.',
    lessons: [
      {
        id: 'line-1',
        title: 'To column 1 with 0',
        brief: '<code>0</code> (zero) jumps to the very first column of the current line.',
        goal: 'Go to column 1.',
        hint: 'Press 0.',
        start: { text: 'some text here and there', cursor: { row: 0, col: 15 } },
        check: (v) => v.cursor.col === 0,
      },
      {
        id: 'line-2',
        title: 'To end with $',
        brief: '<code>$</code> jumps to the end of the line.',
        goal: 'Go to the last character of the line.',
        hint: 'Press $ (shift+4).',
        start: { text: 'this line has things at the end', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.col === 'this line has things at the en'.length,
      },
      {
        id: 'line-3',
        title: 'First non-blank with ^',
        brief: '<code>^</code> goes to the first non-whitespace character. Useful for indented code.',
        goal: 'Land on the <code>i</code> of <code>if</code>.',
        hint: 'Press ^.',
        start: { text: '        if (ok) return;', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.col === 8,
      },
      {
        id: 'line-4',
        title: 'Find a char with f',
        brief: '<code>f{c}</code> jumps to the next occurrence of <code>{c}</code> on the current line. Then <code>;</code> repeats the find.',
        goal: 'Land on the second <code>o</code> of <code>look</code>.',
        hint: 'Press f then o, then ; to repeat.',
        start: { text: 'look for a moon', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 0 && v.cursor.col === 2,
      },
    ],
  });

  // ============================================================
  // Chapter 5: File Motion
  // ============================================================
  CH.push({
    id: 'file',
    title: 'Navigate the Whole File',
    summary: 'Jump to the top, the bottom, or any line number.',
    lessons: [
      {
        id: 'file-1',
        title: 'Top with gg',
        brief: '<code>gg</code> jumps to the first line of the file.',
        goal: 'Go to line 1.',
        hint: 'Type g g (two g\'s in a row).',
        start: { text: 'line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7', cursor: { row: 6, col: 0 } },
        check: (v) => v.cursor.row === 0,
      },
      {
        id: 'file-2',
        title: 'Bottom with G',
        brief: '<code>G</code> (uppercase) jumps to the last line.',
        goal: 'Go to the last line of the file.',
        hint: 'Press G.',
        start: { text: 'one\ntwo\nthree\nfour\nfive\nsix\nseven\nend', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 7,
      },
      {
        id: 'file-3',
        title: 'Goto line with number+G',
        brief: '<code>NG</code> jumps to absolute line <code>N</code>. For example, <code>5G</code> lands on line 5.',
        goal: 'Jump to line 4.',
        hint: 'Type 4 then G.',
        start: { text: 'L1\nL2\nL3\nL4 target\nL5\nL6\nL7', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 3 && v.keyLog.join('').includes('4G'),
      },
      {
        id: 'file-4',
        title: 'Goto line via command',
        brief: 'You can also use <code>:N</code> on the command line to jump to a specific line.',
        goal: 'Use <code>:3</code> to jump to line 3.',
        hint: 'Press :, type 3, press Enter.',
        start: { text: 'alpha\nbeta\ngamma\ndelta\nepsilon', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 2,
      },
    ],
  });

  // ============================================================
  // Chapter 6: Entering Insert Mode
  // ============================================================
  CH.push({
    id: 'insert',
    title: 'Six Ways to Insert',
    summary: 'i, a, I, A, o, O: different places to start typing.',
    lessons: [
      {
        id: 'insert-1',
        title: 'i: insert before cursor',
        brief: '<code>i</code> enters Insert mode to the left of the cursor. Type <code>Hello </code> in front of <code>world</code>.',
        goal: 'Buffer should read <code>Hello world</code>.',
        hint: 'Position on \'w\', press i, type "Hello ", Esc.',
        start: { text: 'world', cursor: { row: 0, col: 0 } },
        check: all(eqText('Hello world'), modeIs('normal')),
      },
      {
        id: 'insert-2',
        title: 'a: append after cursor',
        brief: '<code>a</code> starts Insert mode one column to the right. Useful when the cursor sits on the last real character.',
        goal: 'Append <code>!</code> to make <code>Hi!</code>.',
        hint: 'Move to the "i", press a, type "!", Esc.',
        start: { text: 'Hi', cursor: { row: 0, col: 1 } },
        check: all(eqText('Hi!'), modeIs('normal')),
      },
      {
        id: 'insert-3',
        title: 'I: insert at line start',
        brief: '<code>I</code> goes to the first non-blank of the line then enters Insert mode.',
        goal: 'Prepend <code>// </code> to the line so it becomes a comment.',
        hint: 'Press I, then type "// ", then Esc.',
        start: { text: '    return 42;', cursor: { row: 0, col: 10 } },
        check: all(eqText('    // return 42;'), modeIs('normal')),
      },
      {
        id: 'insert-4',
        title: 'A: append at line end',
        brief: '<code>A</code> jumps to the end of the line then enters Insert mode.',
        goal: 'Append <code>;</code> to the end of the line.',
        hint: 'Press A, type ";", Esc.',
        start: { text: 'let answer = 42', cursor: { row: 0, col: 0 } },
        check: all(eqText('let answer = 42;'), modeIs('normal')),
      },
      {
        id: 'insert-5',
        title: 'o: open line below',
        brief: '<code>o</code> opens a new line below the current one and enters Insert mode on it.',
        goal: 'Add a new second line that says <code>second</code>.',
        hint: 'Press o, type "second", Esc.',
        start: { text: 'first', cursor: { row: 0, col: 0 } },
        check: all(eqText('first\nsecond'), modeIs('normal')),
      },
      {
        id: 'insert-6',
        title: 'O: open line above',
        brief: '<code>O</code> opens a new line above the current one.',
        goal: 'Insert a new first line that says <code>zero</code>.',
        hint: 'Press O, type "zero", Esc.',
        start: { text: 'one', cursor: { row: 0, col: 0 } },
        check: all(eqText('zero\none'), modeIs('normal')),
      },
    ],
  });

  // ============================================================
  // Chapter 7: Deleting
  // ============================================================
  CH.push({
    id: 'delete',
    title: 'Deleting Text',
    summary: 'x, dd, dw, d$: delete characters, lines, words, and to end of line.',
    lessons: [
      {
        id: 'del-1',
        title: 'x: delete a character',
        brief: '<code>x</code> deletes the character under the cursor. Use counts: <code>3x</code> deletes three.',
        goal: 'Delete the stray <code>Q</code> so the word is just <code>cat</code>.',
        hint: 'Move onto Q, press x.',
        start: { text: 'caQt', cursor: { row: 0, col: 0 } },
        check: eqText('cat'),
      },
      {
        id: 'del-2',
        title: 'dw: delete a word',
        brief: '<code>dw</code> deletes from the cursor to the start of the next word. This is the "operator + motion" pattern: d is the operator, w is the motion.',
        goal: 'Delete the word <code>ugly</code> (and its trailing space).',
        hint: 'Position at "u", press d then w.',
        start: { text: 'an ugly duckling', cursor: { row: 0, col: 3 } },
        check: eqText('an duckling'),
      },
      {
        id: 'del-3',
        title: 'dd: delete a line',
        brief: '<code>dd</code> deletes the entire current line. Doubled operators always work on a line.',
        goal: 'Delete the middle line.',
        hint: 'Put the cursor on line 2, press dd.',
        start: { text: 'keep\ndelete me\nkeep', cursor: { row: 1, col: 0 } },
        check: eqText('keep\nkeep'),
      },
      {
        id: 'del-4',
        title: 'd$: delete to end of line',
        brief: '<code>d$</code> deletes from the cursor to the end of the line. Shortcut: <code>D</code>.',
        goal: 'Delete everything after <code>hello</code>.',
        hint: 'Go to the space after hello, press d then $.',
        start: { text: 'hello noise and junk', cursor: { row: 0, col: 5 } },
        check: eqText('hello'),
      },
      {
        id: 'del-5',
        title: 'Counts with operators',
        brief: 'You can prefix either the operator or motion with a count. <code>3dd</code> deletes three lines. <code>d3w</code> deletes three words.',
        goal: 'Delete exactly three lines at once.',
        hint: 'Type 3 then dd.',
        start: { text: 'keep\nrm1\nrm2\nrm3\nkeep', cursor: { row: 1, col: 0 } },
        check: eqText('keep\nkeep'),
      },
    ],
  });

  // ============================================================
  // Chapter 8: Change
  // ============================================================
  CH.push({
    id: 'change',
    title: 'Change: Delete + Insert',
    summary: 'c is like d but drops you into Insert mode so you can retype immediately.',
    lessons: [
      {
        id: 'ch-1',
        title: 'cw: change a word',
        brief: '<code>cw</code> deletes a word and puts you in Insert mode. It\'s the fastest way to rename a word.',
        goal: 'Change <code>wrong</code> to <code>right</code>.',
        hint: 'Position on \'w\' of wrong, press c then w, type "right", Esc.',
        start: { text: 'that is wrong', cursor: { row: 0, col: 8 } },
        check: all(eqText('that is right'), modeIs('normal')),
      },
      {
        id: 'ch-2',
        title: 'cc: change a line',
        brief: '<code>cc</code> replaces the entire current line.',
        goal: 'Replace the middle line with <code>replaced</code>.',
        hint: 'Cursor on line 2, cc, type "replaced", Esc.',
        start: { text: 'a\nold line\nb', cursor: { row: 1, col: 0 } },
        check: all(eqText('a\nreplaced\nb'), modeIs('normal')),
      },
      {
        id: 'ch-3',
        title: 'C: change to end of line',
        brief: '<code>C</code> is short for <code>c$</code>: change from the cursor to the end of the line.',
        goal: 'Change the end of the line from <code>placeholder</code> to <code>the end</code>.',
        hint: 'Go to the space before placeholder, C, type "the end".',
        start: { text: 'start and placeholder', cursor: { row: 0, col: 10 } },
        check: all(eqText('start and the end'), modeIs('normal')),
      },
    ],
  });

  // ============================================================
  // Chapter 9: Yank & Put
  // ============================================================
  CH.push({
    id: 'yank',
    title: 'Yank and Put',
    summary: 'In Vim, copy is "yank" (y) and paste is "put" (p).',
    lessons: [
      {
        id: 'yank-1',
        title: 'yy: yank a line',
        brief: '<code>yy</code> copies the current line into the default register. <code>p</code> puts it after the current line.',
        goal: 'Duplicate the first line so you have two copies of it.',
        hint: 'yy, then p.',
        start: { text: 'line one\nline two', cursor: { row: 0, col: 0 } },
        check: eqText('line one\nline one\nline two'),
      },
      {
        id: 'yank-2',
        title: 'p vs P',
        brief: '<code>p</code> puts after the cursor (or after the current line for a line-yank). <code>P</code> puts before.',
        goal: 'Using a linewise yank and P, put a copy of the line above itself.',
        hint: 'yy, then P.',
        start: { text: 'target', cursor: { row: 0, col: 0 } },
        check: eqText('target\ntarget'),
      },
      {
        id: 'yank-3',
        title: 'yw: yank a word',
        brief: '<code>yw</code> yanks from the cursor to the start of the next word.',
        goal: 'Yank the word <code>hello</code> and put it after the space.',
        hint: 'Cursor on "h", yw, move right, p.',
        start: { text: 'hello ', cursor: { row: 0, col: 0 } },
        check: eqText('hello hello'),
      },
    ],
  });

  // ============================================================
  // Chapter 10: Undo & Redo
  // ============================================================
  CH.push({
    id: 'undo',
    title: 'Undo and Redo',
    summary: 'Every change can be undone with u and redone with Ctrl-r.',
    lessons: [
      {
        id: 'undo-1',
        title: 'u: undo',
        brief: '<code>u</code> undoes the last change. Press it multiple times to walk back through history.',
        goal: 'The line used to say <code>keep me</code>. It was deleted. Undo it.',
        hint: 'Just press u.',
        start: { text: '', cursor: { row: 0, col: 0 } },
        setup: (v) => {
          v.setText('keep me');
          v._snapshot();
          v.lines = [''];
          v.cursor = { row: 0, col: 0 };
          v.render();
        },
        check: eqText('keep me'),
      },
      {
        id: 'undo-2',
        title: 'Ctrl-r: redo',
        brief: '<code>Ctrl-r</code> redoes what you just undid. It\'s Vim\'s "go forward again".',
        goal: 'Press u once to go back, then Ctrl-r to go forward.',
        hint: 'u, then Ctrl+r.',
        start: { text: '', cursor: { row: 0, col: 0 } },
        setup: (v) => {
          v.setText('final');
          v._snapshot();
          v.lines = ['intermediate'];
          v.render();
        },
        check: eqText('final'),
      },
    ],
  });

  // ============================================================
  // Chapter 11: Search
  // ============================================================
  CH.push({
    id: 'search',
    title: 'Search the Buffer',
    summary: '/ searches forward, ? searches backward, n / N repeat the search.',
    lessons: [
      {
        id: 'search-1',
        title: 'Forward with /',
        brief: '<code>/pattern</code> searches forward from the cursor. Press Enter to jump to the first match.',
        goal: 'Find the word <code>needle</code>.',
        hint: 'Press /, type needle, press Enter.',
        start: { text: 'hay hay hay\nhay needle hay\nhay hay hay', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 1 && v.cursor.col === 4,
      },
      {
        id: 'search-2',
        title: 'Repeat with n',
        brief: '<code>n</code> jumps to the next match of the last search. <code>N</code> goes backward.',
        goal: 'Find the second <code>foo</code>.',
        hint: '/foo Enter, then n.',
        start: { text: 'one foo two\nthree foo four\nfive foo six', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 1 && v.cursor.col === 6,
      },
      {
        id: 'search-3',
        title: 'Backward with ?',
        brief: '<code>?pattern</code> searches backward.',
        goal: 'From the bottom of the file, find the word <code>alpha</code>.',
        hint: '?alpha Enter.',
        start: { text: 'alpha\nbeta\ngamma\ndelta', cursor: { row: 3, col: 0 } },
        check: (v) => v.cursor.row === 0,
      },
    ],
  });

  // ============================================================
  // Chapter 12: Substitute
  // ============================================================
  CH.push({
    id: 'subst',
    title: 'Substitute (:s)',
    summary: 'Replace text on one line, in a range, or across the whole file.',
    lessons: [
      {
        id: 'subst-1',
        title: 'One line, one match',
        brief: '<code>:s/old/new/</code> replaces the first match of <code>old</code> on the current line with <code>new</code>.',
        goal: 'Change <code>cat</code> to <code>dog</code> on the current line.',
        hint: 'Type :s/cat/dog/ Enter.',
        start: { text: 'the cat is a cat', cursor: { row: 0, col: 0 } },
        check: eqText('the dog is a cat'),
      },
      {
        id: 'subst-2',
        title: 'All on the line',
        brief: 'Add the <code>g</code> flag to replace every match on the line.',
        goal: 'Replace every <code>cat</code> with <code>dog</code> on the current line.',
        hint: ':s/cat/dog/g',
        start: { text: 'cat cat cat', cursor: { row: 0, col: 0 } },
        check: eqText('dog dog dog'),
      },
      {
        id: 'subst-3',
        title: 'Whole file',
        brief: '<code>:%s/old/new/g</code> applies the substitution to every line in the file.',
        goal: 'Replace every <code>TODO</code> with <code>DONE</code> across the file.',
        hint: ':%s/TODO/DONE/g',
        start: { text: 'TODO one\nTODO two\nTODO three', cursor: { row: 0, col: 0 } },
        check: eqText('DONE one\nDONE two\nDONE three'),
      },
    ],
  });

  // ============================================================
  // Chapter 13: Visual Mode
  // ============================================================
  CH.push({
    id: 'visual',
    title: 'Visual Selections',
    summary: 'v starts character-visual. V starts line-visual. Then use any operator.',
    lessons: [
      {
        id: 'vis-1',
        title: 'v: character visual',
        brief: '<code>v</code> starts a character-wise selection. Move to extend it. Then hit an operator like <code>d</code> to act on it.',
        goal: 'Select and delete the word <code>middle</code>.',
        hint: 'Cursor on "m", v, then e, then d.',
        start: { text: 'the middle word', cursor: { row: 0, col: 4 } },
        check: eqText('the  word'),
      },
      {
        id: 'vis-2',
        title: 'V: line visual',
        brief: '<code>V</code> selects entire lines. Extend up or down, then apply an operator.',
        goal: 'Delete the middle two lines.',
        hint: 'Cursor on line 2, V, j to extend, d.',
        start: { text: 'keep\nrm1\nrm2\nkeep', cursor: { row: 1, col: 0 } },
        check: eqText('keep\nkeep'),
      },
      {
        id: 'vis-3',
        title: 'Yank a selection',
        brief: 'Operators work on visual selections too. <code>y</code> yanks the selected text into the register.',
        goal: 'Yank the word <code>copy</code> into the register.',
        hint: 'Position on "c", v, e, y.',
        start: { text: 'please copy me', cursor: { row: 0, col: 7 } },
        check: (v) => (v.registers['"'] && v.registers['"'].text === 'copy'),
      },
    ],
  });

  // ============================================================
  // Chapter 14: Text Objects
  // ============================================================
  CH.push({
    id: 'objects',
    title: 'Text Objects',
    summary: 'iw, aw, i", a(, ip — operate on meaningful chunks instead of raw motions.',
    lessons: [
      {
        id: 'obj-1',
        title: 'ciw: change inner word',
        brief: '<code>ciw</code> changes the word under the cursor, no matter where in the word you are. Position doesn\'t matter.',
        goal: 'Replace <code>foo</code> with <code>bar</code> using ciw.',
        hint: 'Cursor anywhere on foo, ciw, type "bar", Esc.',
        start: { text: 'some foo here', cursor: { row: 0, col: 6 } },
        check: all(eqText('some bar here'), modeIs('normal')),
      },
      {
        id: 'obj-2',
        title: 'di": delete inside quotes',
        brief: '<code>di"</code> deletes the text inside the nearest double-quoted string, leaving the quotes.',
        goal: 'Empty the string so it becomes <code>name = ""</code>.',
        hint: 'Cursor inside the quotes, di".',
        start: { text: 'name = "old value"', cursor: { row: 0, col: 10 } },
        check: eqText('name = ""'),
      },
      {
        id: 'obj-3',
        title: 'ci(: change inside parens',
        brief: '<code>ci(</code> changes whatever is between the innermost parentheses.',
        goal: 'Change the arguments to <code>(x, y)</code>.',
        hint: 'Cursor inside parens, ci(, type "x, y", Esc.',
        start: { text: 'func(a, b, c)', cursor: { row: 0, col: 6 } },
        check: all(eqText('func(x, y)'), modeIs('normal')),
      },
      {
        id: 'obj-4',
        title: 'da{: delete a block',
        brief: '<code>da{</code> deletes a whole block including the braces.',
        goal: 'Delete the entire <code>{...}</code> block including the braces.',
        hint: 'Cursor inside the braces, da{.',
        start: { text: 'if (x) { kill me } else;', cursor: { row: 0, col: 10 } },
        check: eqText('if (x)  else;'),
      },
    ],
  });

  // ============================================================
  // Chapter 15: Marks
  // ============================================================
  CH.push({
    id: 'marks',
    title: 'Marks: Bookmarks for Files',
    summary: 'Save positions with m, jump back with \' or `.',
    lessons: [
      {
        id: 'mark-1',
        title: 'Set and jump',
        brief: '<code>m{a-z}</code> sets a lowercase mark at the cursor. <code>\'{a-z}</code> jumps to the line of that mark; <code>`{a-z}</code> jumps to the exact row+column.',
        goal: 'Set mark <code>a</code> on line 1, go to line 5, then jump back to mark <code>a</code>.',
        hint: 'gg, ma, G, \'a',
        start: { text: 'start\ntwo\nthree\nfour\nfive', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 0 && v.marks.a != null,
      },
    ],
  });

  // ============================================================
  // Chapter 16: Find in Line
  // ============================================================
  CH.push({
    id: 'find',
    title: 'Find a Character in the Line',
    summary: 'f, F, t, T let you jump to (or just before) any character on the current line.',
    lessons: [
      {
        id: 'find-1',
        title: 'f: to a char',
        brief: '<code>f{c}</code> jumps forward to the next occurrence of <code>{c}</code> on the line.',
        goal: 'Jump to the <code>!</code>.',
        hint: 'Press f then !.',
        start: { text: 'hello world!', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.col === 'hello world'.length,
      },
      {
        id: 'find-2',
        title: 't: till a char',
        brief: '<code>t{c}</code> jumps just before the next <code>{c}</code>. Handy with an operator like <code>dt,</code>.',
        goal: 'Jump to the character just before the <code>.</code>.',
        hint: 'Press t then .',
        start: { text: 'the end.', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.col === 'the end'.length - 1,
      },
      {
        id: 'find-3',
        title: 'F: backward find',
        brief: '<code>F{c}</code> is the mirror: search backwards.',
        goal: 'Jump backward to the <code>@</code>.',
        hint: 'Press F then @.',
        start: { text: 'user@host:/path/here', cursor: { row: 0, col: 18 } },
        check: (v) => v.cursor.col === 'user'.length,
      },
    ],
  });

  // ============================================================
  // Chapter 17: Advanced Motions
  // ============================================================
  CH.push({
    id: 'advmov',
    title: 'Advanced Motions',
    summary: 'Paragraphs with { }, matching brackets with %, half-pages with Ctrl-d / Ctrl-u.',
    lessons: [
      {
        id: 'adv-1',
        title: 'Next paragraph with }',
        brief: '<code>}</code> jumps to the next blank line (paragraph boundary). <code>{</code> jumps to the previous one.',
        goal: 'Jump to the start of the second paragraph.',
        hint: 'Press } once.',
        start: { text: 'first para\nmore\n\nsecond para\nmore', cursor: { row: 0, col: 0 } },
        check: (v) => v.cursor.row === 2,
      },
      {
        id: 'adv-2',
        title: 'Matching bracket with %',
        brief: '<code>%</code> jumps to the matching bracket of the pair under the cursor.',
        goal: 'Jump from the opening <code>{</code> to the matching closing <code>}</code>.',
        hint: 'Position on {, press %.',
        start: { text: 'if (ok) { work(); wait(); done(); }', cursor: { row: 0, col: 8 } },
        check: (v) => v.cursor.col === 34,
      },
    ],
  });

  // ============================================================
  // Chapter 18: Putting It Together
  // ============================================================
  CH.push({
    id: 'combo',
    title: 'Putting It Together',
    summary: 'Short real-world edits. No single lesson; use any trick you know.',
    lessons: [
      {
        id: 'combo-1',
        title: 'Rename a variable',
        brief: 'The variable <code>tmp</code> appears three times. Rename every occurrence to <code>value</code>.',
        goal: 'Replace all occurrences of <code>tmp</code> with <code>value</code>.',
        hint: 'Use :%s/tmp/value/g',
        start: { text: 'let tmp = 1;\nlet b = tmp + 2;\nreturn tmp;', cursor: { row: 0, col: 0 } },
        check: eqText('let value = 1;\nlet b = value + 2;\nreturn value;'),
      },
      {
        id: 'combo-2',
        title: 'Swap two lines',
        brief: 'Two lines are in the wrong order. Swap them.',
        goal: 'The text should read <code>one\\ntwo</code>.',
        hint: 'On line 1, ddp swaps it with the next one.',
        start: { text: 'two\none', cursor: { row: 0, col: 0 } },
        check: eqText('one\ntwo'),
      },
      {
        id: 'combo-3',
        title: 'Wrap a word in quotes',
        brief: 'Turn the word <code>name</code> into <code>"name"</code> using text objects and insertion.',
        goal: 'Buffer should read <code>hello "name" here</code>.',
        hint: 'Position on name. ciw, type "\\"name\\"", Esc. (Escape the quotes when typing!) Alternatively use i and a around it.',
        start: { text: 'hello name here', cursor: { row: 0, col: 6 } },
        check: eqText('hello "name" here'),
      },
      {
        id: 'combo-4',
        title: 'Clean trailing junk',
        brief: 'There\'s a line with trailing nonsense. Keep the first three words, drop the rest.',
        goal: 'Buffer should read <code>alpha beta gamma</code>.',
        hint: 'Position after the third word, D to delete to end.',
        start: { text: 'alpha beta gamma delta epsilon zeta', cursor: { row: 0, col: 0 } },
        check: eqText('alpha beta gamma'),
      },
      {
        id: 'combo-5',
        title: 'Graduation',
        brief: 'Below is a messy line. Clean it up so it reads exactly <code>hello world</code>.',
        goal: 'Buffer should contain exactly <code>hello world</code>.',
        hint: 'Use any combination you like. You can always undo with u.',
        start: { text: '   hellooo    WORLD!!!', cursor: { row: 0, col: 0 } },
        check: eqText('hello world'),
      },
    ],
  });

  window.CHAPTERS = CH;

  // ---- cheatsheet data ----
  window.CHEATSHEET = [
    {
      group: 'Modes',
      items: [
        ['Esc', 'Return to NORMAL'],
        ['i / a', 'Insert before / after cursor'],
        ['I / A', 'Insert at line start / end'],
        ['o / O', 'Open line below / above'],
        ['v / V', 'Visual char / line'],
        [': / /', 'Command / search'],
      ],
    },
    {
      group: 'Motions',
      items: [
        ['h j k l', 'Left, down, up, right'],
        ['w / b / e', 'Next word start / prev start / word end'],
        ['W / B / E', 'Same, but WORDS (whitespace-separated)'],
        ['0 / ^ / $', 'Line start / first non-blank / end'],
        ['gg / G', 'File start / end'],
        ['NG', 'Go to line N'],
        ['{ / }', 'Prev / next paragraph'],
        ['%', 'Matching bracket'],
        ['f/F/t/T + c', 'Find char on line'],
        ['; / ,', 'Repeat find forward / back'],
      ],
    },
    {
      group: 'Edits',
      items: [
        ['x / X', 'Delete char under / before cursor'],
        ['dd / D', 'Delete line / to end of line'],
        ['dw / d$', 'Delete word / to end of line'],
        ['cc / C', 'Change line / to end of line'],
        ['cw / ciw', 'Change word / inner word'],
        ['yy / yw', 'Yank line / word'],
        ['p / P', 'Put after / before'],
        ['r{c}', 'Replace single char'],
        ['J', 'Join line below'],
        ['u / Ctrl-r', 'Undo / redo'],
      ],
    },
    {
      group: 'Text Objects',
      items: [
        ['iw / aw', 'inner word / a word (with spaces)'],
        ['i" / a"', 'inside / around double-quotes'],
        ["i' / a'", 'inside / around single-quotes'],
        ['i( / a(', 'inside / around parens'],
        ['i{ / a{', 'inside / around braces'],
        ['ip / ap', 'inner / a paragraph'],
      ],
    },
    {
      group: 'Search & Replace',
      items: [
        ['/pat', 'Search forward'],
        ['?pat', 'Search backward'],
        ['n / N', 'Next / previous match'],
        [':s/a/b/', 'Replace first on line'],
        [':s/a/b/g', 'Replace all on line'],
        [':%s/a/b/g', 'Replace all in file'],
      ],
    },
    {
      group: 'Command line',
      items: [
        [':w', 'Write'],
        [':q', 'Quit'],
        [':wq', 'Write and quit'],
        [':N', 'Go to line N'],
      ],
    },
  ];
})();
