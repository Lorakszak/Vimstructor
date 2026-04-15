# Vimstructor

An online, browser-based game that teaches you the Vim text editor — from
absolute beginner to power user. Pure HTML/CSS/JavaScript, no build step,
no backend, no accounts. Your progress is stored locally in your browser.

## Play locally

```sh
# from the project root
python3 -m http.server 8080
# then open http://localhost:8080
```

Any static file server works: `npx serve`, `caddy file-server`, nginx, etc.
Opening `index.html` directly with `file://` also works but a local server is
more reliable.

## Host it online (so others can play)

It's a static site — drop the folder on any static host:

- **GitHub Pages**: push this repo, enable Pages in the repo settings,
  pick the `main` branch, root folder. Done.
- **Netlify / Cloudflare Pages / Vercel**: "Deploy a folder", no build
  command needed, publish directory = project root.
- **Your own server**: copy the folder behind any web server.

No API keys, no secrets, no backend. Just send people the URL.

## Curriculum (18 chapters)

1. The Four Modes - Normal, Insert, Visual, Command
2. hjkl: The Vim Arrows
3. Move by Words (w, b, e, W, B, E)
4. Jump Around a Line (0, $, ^, f)
5. Navigate the Whole File (gg, G, :N)
6. Six Ways to Insert (i, a, I, A, o, O)
7. Deleting Text (x, dd, dw, d$)
8. Change: Delete + Insert (cw, cc, C)
9. Yank and Put (yy, yw, p, P)
10. Undo and Redo (u, Ctrl-r)
11. Search the Buffer (/, ?, n, N)
12. Substitute (:s, :%s)
13. Visual Selections (v, V)
14. Text Objects (iw, aw, i", a(, ...)
15. Marks: Bookmarks for Files
16. Find a Character in the Line (f, F, t, T)
17. Advanced Motions ({, }, %)
18. Putting It Together

Each lesson has a goal, a hint, and a self-contained exercise inside a
live Vim editor. The goal check runs after every keystroke; pass the
check and the "Next" button unlocks.

## Architecture

```
index.html          - shell and layout
css/style.css       - retro-terminal theme
js/vim.js           - a small educational subset of Vim (mode-aware parser,
                      motions, operators, text objects, undo, search)
js/chapters.js      - chapter and lesson data, cheatsheet data
js/lessons.js       - lesson runner and localStorage progress store
js/app.js           - routing, menu, cheatsheet, wiring
```

The Vim engine is not a drop-in Vim clone. It's a teaching tool that
implements enough of Vim to make lessons feel real: modes, counts,
operator+motion composition, text objects, visual mode, search,
substitute, undo/redo, registers, marks, find-char, and friends.

## Credits

Inspired by Vim's original learn-by-doing ethos (`vimtutor`), with a
game layer on top.
