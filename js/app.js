import { parseCSS } from './css-parser.js';
import { diffCSS } from './css-differ.js';
import { renderDiff } from './diff-renderer.js';

// ── Example stylesheets ───────────────────────────────────────────────────────
// A component library being modernized: button, card, and a removed legacy util.
// Demonstrates added rules, removed rules, changed properties, and new declarations.

const EXAMPLE_BEFORE = `/* Component: Button */
.btn {
  background-color: #007bff;
  border: none;
  border-radius: 4px;
  color: #ffffff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  padding: 8px 16px;
}

.btn:hover {
  background-color: #0056b3;
  opacity: 0.9;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Component: Card */
.card {
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin-bottom: 16px;
  padding: 16px;
}

.card__title {
  color: #212529;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

/* Legacy utility — will be removed */
.clearfix::after {
  clear: both;
  content: '';
  display: table;
}`;

const EXAMPLE_AFTER = `/* Component: Button */
.btn {
  background-color: transparent;
  border: 2px solid #7c6af7;
  border-radius: 8px;
  color: #7c6af7;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.025em;
  padding: 10px 24px;
  transition: all 0.2s ease;
}

.btn:hover {
  background-color: #7c6af7;
  color: #ffffff;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
  pointer-events: none;
}

/* Component: Card */
.card {
  background: #1e1e30;
  border: 1px solid #3d3d5c;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  margin-block-end: 24px;
  padding: 24px;
}

.card__title {
  color: #e4e4f4;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-block-end: 12px;
}

/* Component: Badge — new addition */
.badge {
  background-color: rgba(124, 106, 247, 0.15);
  border: 1px solid rgba(124, 106, 247, 0.3);
  border-radius: 9999px;
  color: #9d8ff9;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
}`;

// ── DOM references ────────────────────────────────────────────────────────────
const editorBefore = document.getElementById('css-before');
const editorAfter = document.getElementById('css-after');
const diffOutput = document.getElementById('diff-output');
const summaryCountsEl = document.getElementById('summary-counts');
const btnCopy = document.getElementById('btn-copy');
const stateEmpty = document.getElementById('state-empty');

// ── Module state ──────────────────────────────────────────────────────────────
let diffPlainText = '';
let copyTimer = null;

// ── Core pipeline ─────────────────────────────────────────────────────────────
function runDiff() {
  const before = editorBefore.value;
  const after = editorAfter.value;

  if (!before.trim() && !after.trim()) {
    showEmptyState();
    return;
  }

  try {
    const beforeRules = parseCSS(before);
    const afterRules = parseCSS(after);
    const result = diffCSS(beforeRules, afterRules);
    showDiffResult(result);
  } catch (err) {
    showErrorState(err.message);
  }
}

const debouncedDiff = debounce(runDiff, 300);

// ── State rendering ───────────────────────────────────────────────────────────
function showEmptyState() {
  diffOutput.innerHTML = '';
  stateEmpty.removeAttribute('aria-hidden');
  diffOutput.appendChild(stateEmpty);
  resetSummary();
  btnCopy.hidden = true;
  diffPlainText = '';
}

function showErrorState(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'diff-error';
  errorEl.setAttribute('role', 'alert');
  errorEl.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="diff-error-icon" aria-hidden="true" focusable="false">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
    </svg>
    <div class="diff-error-text">
      <p class="diff-error-title">Invalid CSS</p>
      <p class="diff-error-message">${escapeHtml(message)}</p>
    </div>
  `;

  diffOutput.innerHTML = '';
  diffOutput.appendChild(errorEl);
  resetSummary();
  btnCopy.hidden = true;
  diffPlainText = '';
}

function showDiffResult(result) {
  diffOutput.innerHTML = '';
  diffPlainText = renderDiff(result, diffOutput);
  updateSummary(result.counts);
  btnCopy.hidden = !diffPlainText || diffPlainText === '(no differences)';
}

// ── Summary bar ───────────────────────────────────────────────────────────────
function resetSummary() {
  summaryCountsEl.innerHTML =
    '<span class="summary-placeholder">Paste CSS in both panels to see the diff</span>';
}

function updateSummary({ added, removed, changed }) {
  if (added === 0 && removed === 0 && changed === 0) {
    summaryCountsEl.innerHTML =
      '<span class="summary-placeholder">Stylesheets are identical — no changes found</span>';
    return;
  }

  const chips = [];

  if (added > 0) {
    chips.push(
      `<span class="summary-chip summary-chip--added" aria-label="${added} declaration${added !== 1 ? 's' : ''} added">` +
        `<span class="summary-chip-symbol" aria-hidden="true">+</span>` +
        `<span>${added}</span>` +
        `<span class="summary-chip-label">added</span>` +
        `</span>`
    );
  }

  if (removed > 0) {
    chips.push(
      `<span class="summary-chip summary-chip--removed" aria-label="${removed} declaration${removed !== 1 ? 's' : ''} removed">` +
        `<span class="summary-chip-symbol" aria-hidden="true">−</span>` +
        `<span>${removed}</span>` +
        `<span class="summary-chip-label">removed</span>` +
        `</span>`
    );
  }

  if (changed > 0) {
    chips.push(
      `<span class="summary-chip summary-chip--changed" aria-label="${changed} declaration${changed !== 1 ? 's' : ''} changed">` +
        `<span class="summary-chip-symbol" aria-hidden="true">~</span>` +
        `<span>${changed}</span>` +
        `<span class="summary-chip-label">changed</span>` +
        `</span>`
    );
  }

  summaryCountsEl.innerHTML = chips.join('');
}

// ── Copy ──────────────────────────────────────────────────────────────────────
async function handleCopy() {
  if (!diffPlainText) return;

  clearTimeout(copyTimer);

  try {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API unavailable in this context');
    }
    await navigator.clipboard.writeText(diffPlainText);
    setCopyState('success');
  } catch {
    setCopyState('error');
  }

  copyTimer = setTimeout(() => setCopyState('idle'), 2200);
}

function setCopyState(state) {
  const iconCopy = btnCopy.querySelector('.icon-copy');
  const iconCheck = btnCopy.querySelector('.icon-check');
  const label = btnCopy.querySelector('.btn-copy-label');

  btnCopy.classList.remove('btn-copy--success', 'btn-copy--error');

  if (state === 'success') {
    btnCopy.classList.add('btn-copy--success');
    iconCopy.hidden = true;
    iconCheck.hidden = false;
    label.textContent = 'Copied';
    btnCopy.setAttribute('aria-label', 'Diff copied to clipboard');
  } else if (state === 'error') {
    btnCopy.classList.add('btn-copy--error');
    label.textContent = 'Failed';
    btnCopy.setAttribute('aria-label', 'Copy failed — check clipboard permissions');
  } else {
    iconCopy.hidden = false;
    iconCheck.hidden = true;
    label.textContent = 'Copy';
    btnCopy.setAttribute('aria-label', 'Copy diff output as plain text');
  }
}

// ── Tab indentation in editors ────────────────────────────────────────────────
function handleEditorKeydown(e) {
  if (e.key !== 'Tab') return;
  e.preventDefault();

  const el = e.target;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const val = el.value;

  if (e.shiftKey) {
    // Remove up to 2 spaces at start of current line
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    const linePrefix = val.slice(lineStart, start);
    const spaces = linePrefix.match(/^( {1,2})/)?.[1] ?? '';
    if (spaces.length > 0) {
      el.value = val.slice(0, lineStart) + linePrefix.slice(spaces.length) + val.slice(end);
      el.selectionStart = el.selectionEnd = start - spaces.length;
    }
  } else {
    // Insert 2 spaces at cursor
    el.value = val.slice(0, start) + '  ' + val.slice(end);
    el.selectionStart = el.selectionEnd = start + 2;
  }

  el.dispatchEvent(new Event('input'));
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  editorBefore.value = EXAMPLE_BEFORE;
  editorAfter.value = EXAMPLE_AFTER;

  // Detach static empty state node for programmatic management
  stateEmpty.remove();

  editorBefore.addEventListener('input', debouncedDiff);
  editorAfter.addEventListener('input', debouncedDiff);
  editorBefore.addEventListener('keydown', handleEditorKeydown);
  editorAfter.addEventListener('keydown', handleEditorKeydown);
  btnCopy.addEventListener('click', handleCopy);

  // Render the example diff immediately on load
  runDiff();
});
