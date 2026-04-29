# Diffuse

Property-level CSS diff tool. Paste two stylesheets, see exactly what changed — added, removed, and modified declarations, organized by selector.

## What it does

- Parses both stylesheets with a hand-rolled recursive CSS parser
- Diffs at the declaration level (not line-by-line) so whitespace changes or reordered rules don't create false positives
- Shows only changed rules — unchanged selectors are omitted
- Renders `+` added / `−` removed / `~` changed lines with semantic colors and a summary chip bar
- Copy-to-clipboard exports a plain-text diff
- Runs entirely in the browser — no server, no dependencies, no data leaves your machine

## Tech

- Vanilla JS (ES modules) — no framework
- CSS custom properties, logical properties, `dvh` units
- Responsive: three-column desktop → stacked mobile
- Accessible: `aria-live` summary, `role="alert"` on errors, keyboard Tab/Shift+Tab indentation in editors
- Pre-commit: ESLint 9 (flat config), Stylelint, Prettier via Husky + lint-staged

## Architecture

```
js/
  css-parser.js    — tokenizes CSS into selector/declaration nodes; handles
                     nested braces, quoted strings, and at-rules
  css-differ.js    — builds selector→declaration maps; diffs at property level
  diff-renderer.js — DOM renderer; returns plain-text string for clipboard
  app.js           — entry point; wires up events, debounce, state transitions
css/
  tokens.css       — design tokens (colors, spacing, type scale)
  reset.css        — minimal modern reset
  app.css          — layout (3-column grid, responsive breakpoints)
  components/      — header, input panels, diff output, summary bar
```

## Running locally

ES modules require a server (`file://` won't work).

```bash
npx serve .
# → http://localhost:3000
```

Or use VS Code Live Server.

## Known limitations

- `@media`, `@keyframes`, and other nested at-rules are diffed as atomic blobs — property changes inside them show as `~ @media { … } (block contents were modified)` rather than line-by-line
- `@import` and `@charset` are stripped before parsing (no declarations to compare)
- Duplicate selectors merge with last-wins semantics, matching browser cascade behavior
