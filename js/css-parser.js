/**
 * @typedef {{ property: string, value: string }} Declaration
 * @typedef {{ type: 'rule', selector: string, declarations: Declaration[] }} CSSRule
 * @typedef {{ type: 'at-rule', selector: string, raw: string }} AtRule
 * @typedef {CSSRule | AtRule} ParsedNode
 */

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function checkBraceBalance(css) {
  let depth = 0;
  let inStr = false;
  let q = '';

  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    const prev = css[i - 1];

    if (inStr) {
      if (c === q && prev !== '\\') inStr = false;
    } else if (c === '"' || c === "'") {
      inStr = true;
      q = c;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth < 0) {
        const snippet = css.slice(Math.max(0, i - 20), i + 1).trim();
        throw new SyntaxError(`Unexpected closing brace near: …${snippet}…`);
      }
    }
  }

  if (depth !== 0) {
    throw new SyntaxError(`Missing closing brace — ${depth} unclosed block${depth > 1 ? 's' : ''}`);
  }
}

function splitDeclarations(block) {
  const decls = [];
  let depth = 0;
  let inStr = false;
  let q = '';
  let current = '';

  for (let i = 0; i < block.length; i++) {
    const c = block[i];

    if (inStr) {
      current += c;
      if (c === q && block[i - 1] !== '\\') inStr = false;
    } else if (c === '"' || c === "'") {
      inStr = true;
      q = c;
      current += c;
    } else if (c === '(') {
      depth++;
      current += c;
    } else if (c === ')') {
      depth--;
      current += c;
    } else if (c === ';' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) decls.push(trimmed);
      current = '';
    } else {
      current += c;
    }
  }

  const remaining = current.trim();
  if (remaining) decls.push(remaining);

  return decls;
}

function parseDeclarations(block) {
  return splitDeclarations(block)
    .map((decl) => {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) return null;

      const property = decl.slice(0, colonIdx).trim();
      const value = decl.slice(colonIdx + 1).trim();

      if (!property) return null;

      return { property, value };
    })
    .filter(Boolean);
}

/**
 * Parse a CSS string into an array of rule and at-rule nodes.
 * At-rules without blocks (@import, @charset, @layer references) are stripped.
 * Nested at-rules (@media, @keyframes) are treated as atomic units.
 *
 * @param {string} raw
 * @returns {ParsedNode[]}
 * @throws {SyntaxError} on unbalanced braces
 */
export function parseCSS(raw) {
  // Remove block-less at-statements: @import, @charset, @namespace, @layer ref, etc.
  const css = stripComments(raw)
    .replace(/@[a-z][^;{]*;/gi, '')
    .trim();

  if (!css) return [];

  checkBraceBalance(css);

  const rules = [];
  let i = 0;

  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;

    // Scan for opening brace, respecting quoted strings
    let selectorEnd = i;
    let inStr = false;
    let q = '';

    while (selectorEnd < css.length) {
      const c = css[selectorEnd];

      if (inStr) {
        if (c === q && css[selectorEnd - 1] !== '\\') inStr = false;
      } else if (c === '"' || c === "'") {
        inStr = true;
        q = c;
      } else if (c === '{') {
        break;
      }

      selectorEnd++;
    }

    if (selectorEnd >= css.length) break;

    const selector = css.slice(i, selectorEnd).trim();

    // Find the matching closing brace (depth-aware, respects strings)
    let depth = 0;
    let blockEnd = selectorEnd;
    inStr = false;
    q = '';

    while (blockEnd < css.length) {
      const c = css[blockEnd];

      if (inStr) {
        if (c === q && css[blockEnd - 1] !== '\\') inStr = false;
      } else if (c === '"' || c === "'") {
        inStr = true;
        q = c;
      } else if (c === '{') {
        depth++;
      } else if (c === '}') {
        depth--;
        if (depth === 0) break;
      }

      blockEnd++;
    }

    const body = css.slice(selectorEnd + 1, blockEnd);

    if (selector.startsWith('@')) {
      rules.push({ type: 'at-rule', selector, raw: css.slice(i, blockEnd + 1) });
    } else if (selector) {
      rules.push({ type: 'rule', selector, declarations: parseDeclarations(body) });
    }

    i = blockEnd + 1;
  }

  return rules;
}
