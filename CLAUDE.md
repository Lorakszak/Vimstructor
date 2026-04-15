# Vimstructor

Browser game that teaches Vim. Pure HTML/CSS/JavaScript. No build, no backend, no npm, no framework. Progress lives in `localStorage`. See `README.md` for the player-facing overview and curriculum.

## Run locally

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

Any static server works (`npx serve`, `caddy file-server`, etc.). **Do not open `index.html` via `file://`** when testing changes: some browsers restrict local file access and the retro-terminal font loading is more reliable under HTTP.

Hard-reload with `Ctrl-Shift-R` after edits; the browser aggressively caches the JS/CSS.

## File map

```
index.html       shell, layout, loads scripts in fixed order (see below)
css/style.css    retro-terminal theme, all styling
js/chapters.js   CHAPTERS data: chapters + lessons + cheatsheet (window.CHAPTERS)
js/vim.js        Vim class: educational subset of Vim (modes, motions, operators,
                 text objects, visual, search, substitute, undo, registers, marks)
js/lessons.js    Progress store (localStorage) + lesson runner
js/app.js        Routing, menu rendering, cheatsheet, DOM wiring, entry point
```

**Script load order is load-bearing.** `index.html` loads `chapters.js` first (defines `window.CHAPTERS`), then `vim.js`, then `lessons.js`, then `app.js`. `lessons.js` and `app.js` read `window.CHAPTERS` at parse/runtime. Preserve the order in `index.html` when adding new scripts.

## Code conventions

- **IIFE per file**: each JS file is wrapped in `(function () { 'use strict'; ... })();`. New files should follow the same shape. Exports go on `window` (e.g. `window.CHAPTERS`, `window.Vim`).
- **No modules, no imports**: plain `<script>` tags. Do not introduce `type="module"`, bundlers, or `import` statements.
- **No dependencies**: do not add npm packages or CDN `<script src>` links. Everything must work offline from a static folder.
- **Style**: 2-space indent, single quotes, semicolons, `const`/`let` (no `var`), small helper functions over classes except for `Vim` itself.
- **DOM**: use the existing `h(tag, attrs, ...kids)` helper in `app.js` instead of `innerHTML`. For lesson text with markup, use `setHTMLSafe` which only allows `<code>`, `<b>`, `<i>`, `<kbd>`, `<br>`. Do not widen the allowlist without a security reason — it is the XSS boundary.
- **Browser target**: evergreen desktop browsers. No polyfills, no transpilation.

## `localStorage` schema

```
key:   vimstructor:progress:v1
value: { "completed": { "<lessonId>": <timestamp> }, "lastLesson": "<lessonId>|null" }
```

If you change the schema shape, bump the key suffix (`:v2`) so old saves are ignored instead of crashing `JSON.parse` paths. During dev, wipe progress with `localStorage.clear()` in DevTools, or the in-app **Reset** button.

## Adding a lesson

Lessons live in `js/chapters.js` inside the `CH.push({ id, title, summary, lessons: [...] })` blocks. Each lesson is:

```js
{
  id: 'chapter-N',                  // globally unique, used as progress key
  title: '...',
  brief: '...',                     // shown in the left panel
  goal: '...',                      // may contain <code>/<kbd>/<b>/<i>/<br>
  hint: '...',
  start: { text: '...', cursor: { row, col } },
  check: (v) => /* pure predicate over Vim state */,
}
```

`check` must be a pure function of `Vim` state. Use the helpers at the top of `chapters.js` (`at`, `atRow`, `atCol`, `modeIs`, `eqText`, `lineEq`, `all`, `any`, `usedKey`, `usedSeq`, `notUsedKey`) before writing ad-hoc predicates. IDs must be unique across the whole file since they key `localStorage`.

## Extending the Vim engine

`js/vim.js` is an educational subset, not a Vim clone. When adding a motion/operator/text-object:

1. Add the key handling inside the appropriate mode path in `Vim` (normal vs. operator-pending vs. visual).
2. Make sure it composes with counts and operators where Vim does.
3. Push to `history` before mutating so `u` works.
4. Update the cheatsheet data in `js/chapters.js` so it appears in the Cheatsheet view.

Do not add features that no lesson teaches — scope is "enough Vim to make the lessons feel real."

## Verifying changes

No test suite and no linter. Verify by loading the page in a browser and playing the affected lesson(s). A Playwright MCP is configured in this repo (`.playwright-mcp/`); prefer using it to load `http://localhost:8080`, click through a lesson, and confirm the "Next" button unlocks, rather than claiming a fix works without running it.

When you touch `vim.js`, re-play at least one lesson per affected feature (motions, operators, text objects, visual, search). When you touch the progress store, verify reset + reload behaves correctly.

## Git etiquette

- Atomic commits with conventional-commit prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- Never force-push `main`. Feature branches for anything non-trivial.
- Do not commit `.playwright-mcp/` screenshots or scratch files.
