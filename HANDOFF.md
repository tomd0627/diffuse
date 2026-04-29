# Diffuse — Handoff

## Current phase
**Phase 5 complete: Final audit + README — project is deploy-ready**

## What was just completed (Phase 5)
- Moved inline styles from `diff-renderer.js` to `.diff-at-rule-hint` CSS class in `diff-output.css`
- Fixed `netlify.toml` cache headers: removed `immutable` from unhashed asset paths (was causing permanent stale cache on redeploy); changed to `max-age=3600` + `must-revalidate`
- Added `Content-Security-Policy` header to `netlify.toml`: `default-src 'none'`; allows `'self'` scripts/styles, Google Fonts stylesheet, and `fonts.gstatic.com` fonts
- Wrote `README.md`: what it does, tech, architecture diagram, local dev instructions, known limitations

## Phase 4 summary (Pre-commit tooling)
- `package.json` — `"type": "module"`, devDependencies, lint-staged config
- `.prettierrc` — single quotes, 100-char print width
- `eslint.config.js` — ESLint 9 flat config, no-console/no-unused-vars/eqeqeq/prefer-const rules
- `stylelint.config.js` — BEM selector pattern, alphabetical property order, reset.css vendor-prefix override
- `.husky/pre-commit` — runs lint-staged; blocks commits with ESLint errors

## Exact next task
**Phase 4: Pre-commit tooling**

1. Create `package.json` with devDependencies: `prettier`, `eslint`, `@eslint/js`, `stylelint`, `stylelint-config-standard`, `stylelint-order`, `husky`, `lint-staged`
2. Run `npm install`
3. Create `.prettierrc`, `eslint.config.js` (ESLint 9 flat config), `stylelint.config.js`
4. Run `npx husky init` and configure `.husky/pre-commit`
5. Configure `lint-staged` in `package.json`
6. Test: stage a file with `console.log` and verify the hook blocks it

## Decisions made this session

| Decision | Rationale |
|----------|-----------|
| ES modules (`type="module"`) | Modern, standards-based. Only `app.js` loaded in HTML. |
| Duplicate selector merging | Last-wins cascade — matches browser behavior |
| At-rules as atomic blobs | Property-level recursion into @media/@keyframes is a v2 feature; document as known limitation |
| `debounce(runDiff, 300)` | 300ms balances responsiveness vs CPU for large stylesheets |
| `innerHTML = ''` for state transitions | Simple and performant for a single-panel output region |
| `stateEmpty.remove()` on init | Detach static empty state node for programmatic management; stays in memory via JS reference |
| Tab key → 2 spaces | Standard code editor behavior; Shift+Tab removes indent |

## Known gotchas / things to watch

- **`file://` doesn't work**: ES modules require a server. Dev workflow is `npx serve .` or VS Code Live Server. Must document in README.
- **`@import` in diff**: Block-less at-rules are stripped before parsing, so they don't appear in the diff. This is intentional — they have no declarations to compare.
- **At-rule content changes**: When an `@media` block changes internally, the differ shows `~ @media { … } (block contents modified)` — not property-level. This is a documented limitation.
- **Clipboard on HTTP**: `navigator.clipboard.writeText()` requires HTTPS (or localhost). On Netlify this works fine. Error state handles the fallback gracefully.
- **Stylelint will flag existing CSS**: The CSS component files use `hintContent.style.opacity` and `hintContent.style.fontStyle` inline styles in `diff-renderer.js`. This is JS, not CSS, so Stylelint won't flag it. But the inline styles are a minor code smell — note for the Phase 5 audit.

## All phases complete

1. ~~Pre-code declaration~~ ✓
2. ~~Core HTML/CSS scaffold~~ ✓
3. ~~JS functionality~~ ✓
4. ~~Pre-commit tooling~~ ✓
5. ~~Final recruiter audit + pre-deploy audit + README~~ ✓

**Ready to deploy to Netlify.**
