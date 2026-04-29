function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * Build a single diff line element and its plain-text equivalent.
 * For entire-rule changes (added/removed), all declarations inherit the rule status.
 *
 * @param {import('./css-differ.js').DeclDiff} decl
 * @param {'added'|'removed'|'modified'|'unchanged'} ruleStatus
 * @returns {{ el: HTMLElement, text: string }}
 */
function createDiffLine(decl, ruleStatus) {
  const lineStatus = ruleStatus === 'added' || ruleStatus === 'removed' ? ruleStatus : decl.status;

  const el = createEl('div', `diff-line diff-line--${lineStatus}`);
  const prefix = createEl('span', 'diff-line-prefix');
  const content = createEl('span', 'diff-line-content');
  el.append(prefix, content);

  let text = '';

  switch (lineStatus) {
    case 'added':
      prefix.textContent = '+';
      content.textContent = `  ${decl.property}: ${decl.afterValue};`;
      text = `+  ${decl.property}: ${decl.afterValue};`;
      break;

    case 'removed':
      prefix.textContent = '−';
      content.textContent = `  ${decl.property}: ${decl.beforeValue};`;
      text = `-  ${decl.property}: ${decl.beforeValue};`;
      break;

    case 'changed': {
      prefix.textContent = '~';
      // Render old value with strikethrough, then arrow, then new value
      const oldSpan = createEl(
        'span',
        'diff-change-old',
        `  ${decl.property}: ${decl.beforeValue}`
      );
      const arrowSpan = createEl('span', 'diff-change-arrow', ' → ');
      content.append(oldSpan, arrowSpan, document.createTextNode(`${decl.afterValue};`));
      text = `~  ${decl.property}: ${decl.beforeValue} → ${decl.afterValue};`;
      break;
    }

    case 'unchanged':
      prefix.textContent = ' ';
      content.textContent = `  ${decl.property}: ${decl.afterValue ?? decl.beforeValue};`;
      text = `   ${decl.property}: ${decl.afterValue ?? decl.beforeValue};`;
      break;

    default:
      break;
  }

  return { el, text };
}

function renderRule(rule, container, lines) {
  const block = createEl('div', 'diff-rule');

  const selectorClass =
    rule.status === 'added'
      ? 'diff-rule-selector diff-rule-selector--added'
      : rule.status === 'removed'
        ? 'diff-rule-selector diff-rule-selector--removed'
        : 'diff-rule-selector';

  block.append(createEl('div', selectorClass, `${rule.selector} {`));
  lines.push(`${rule.selector} {`);

  const body = createEl('div', 'diff-rule-body');

  for (const decl of rule.declarations) {
    const { el, text } = createDiffLine(decl, rule.status);
    body.appendChild(el);
    lines.push(text);
  }

  block.append(body, createEl('div', 'diff-rule-close', '}'));
  lines.push('}', '');

  container.appendChild(block);
}

function renderAtRule(rule, container, lines) {
  const block = createEl('div', 'diff-rule');

  const selectorClass =
    rule.status === 'added'
      ? 'diff-rule-selector diff-rule-selector--added'
      : rule.status === 'removed'
        ? 'diff-rule-selector diff-rule-selector--removed'
        : 'diff-rule-selector';

  const prefix = rule.status === 'added' ? '+' : rule.status === 'removed' ? '−' : '~';
  const label = `${prefix}  ${rule.selector} { … }`;

  block.append(createEl('div', selectorClass, label));

  if (rule.status === 'changed') {
    const hint = createEl('div', 'diff-line diff-line--changed');
    const hintContent = createEl('span', 'diff-line-content diff-at-rule-hint');
    hintContent.textContent = '   (block contents were modified)';
    hint.appendChild(hintContent);
    block.appendChild(hint);
  }

  lines.push(label, '');
  container.appendChild(block);
}

function renderClean(container) {
  const el = createEl('div', 'diff-clean');
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="diff-clean-icon" aria-hidden="true" focusable="false">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <path d="m9 11 3 3L22 4"/>
    </svg>
    <p class="diff-clean-title">Stylesheets are identical</p>
    <p class="diff-clean-body">No differences found between the Before and After stylesheets.</p>
  `;
  container.appendChild(el);
  return '(no differences)';
}

/**
 * Render a diff result into a container element.
 * Returns a plain-text representation of the diff for clipboard copy.
 * Only shows rules with at least one change (added/removed/modified).
 *
 * @param {import('./css-differ.js').DiffResult} diffResult
 * @param {HTMLElement} container
 * @returns {string} plain-text diff
 */
export function renderDiff(diffResult, container) {
  container.innerHTML = '';

  const { rules } = diffResult;
  const changedRules = rules.filter((r) => r.status !== 'unchanged');

  if (changedRules.length === 0) {
    return renderClean(container);
  }

  const lines = [];

  for (const rule of changedRules) {
    if (rule.type === 'at-rule') {
      renderAtRule(rule, container, lines);
    } else {
      renderRule(rule, container, lines);
    }
  }

  return lines.join('\n');
}
