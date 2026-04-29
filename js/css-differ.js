/**
 * @typedef {{ property: string, beforeValue: string|null, afterValue: string|null, status: 'added'|'removed'|'changed'|'unchanged' }} DeclDiff
 * @typedef {{ type: 'rule', selector: string, status: string, declarations: DeclDiff[] }} RuleDiff
 * @typedef {{ type: 'at-rule', selector: string, status: string, raw: string, rawBefore?: string }} AtRuleDiff
 * @typedef {{ rules: Array<RuleDiff|AtRuleDiff>, counts: { added: number, removed: number, changed: number, unchanged: number } }} DiffResult
 */

function normalizeSelector(sel) {
  return sel.replace(/\s+/g, ' ').trim();
}

function buildSelectorMap(rules) {
  const map = new Map();

  for (const rule of rules) {
    if (rule.type !== 'rule') continue;

    const sel = normalizeSelector(rule.selector);

    if (map.has(sel)) {
      // Later declarations for the same selector override earlier ones (last-wins cascade)
      const existing = map.get(sel);
      const merged = [...existing];

      for (const decl of rule.declarations) {
        const idx = merged.findIndex((d) => d.property === decl.property);
        if (idx !== -1) {
          merged[idx] = decl;
        } else {
          merged.push(decl);
        }
      }

      map.set(sel, merged);
    } else {
      map.set(sel, [...rule.declarations]);
    }
  }

  return map;
}

function buildAtRuleMap(rules) {
  const map = new Map();

  for (const rule of rules) {
    if (rule.type !== 'at-rule') continue;
    const sel = normalizeSelector(rule.selector);
    // Last occurrence wins for duplicate at-rule selectors
    map.set(sel, rule);
  }

  return map;
}

function getUniqueSelectors(rules, type) {
  const seen = new Set();
  const order = [];

  for (const rule of rules) {
    if (rule.type !== type) continue;
    const sel = normalizeSelector(rule.selector);
    if (!seen.has(sel)) {
      seen.add(sel);
      order.push(sel);
    }
  }

  return order;
}

function diffDeclarations(beforeDecls, afterDecls, counts) {
  const beforeMap = new Map(beforeDecls.map((d) => [d.property, d.value]));
  const afterMap = new Map(afterDecls.map((d) => [d.property, d.value]));
  const result = [];

  // Walk "after" declarations in their original order
  for (const { property, value: afterValue } of afterDecls) {
    const beforeValue = beforeMap.get(property);

    if (beforeValue === undefined) {
      result.push({ property, beforeValue: null, afterValue, status: 'added' });
      counts.added++;
    } else if (beforeValue === afterValue) {
      result.push({ property, beforeValue, afterValue, status: 'unchanged' });
      counts.unchanged++;
    } else {
      result.push({ property, beforeValue, afterValue, status: 'changed' });
      counts.changed++;
    }
  }

  // Declarations only in "before" (removed)
  for (const { property, value: beforeValue } of beforeDecls) {
    if (!afterMap.has(property)) {
      result.push({ property, beforeValue, afterValue: null, status: 'removed' });
      counts.removed++;
    }
  }

  return result;
}

/**
 * Compare two arrays of parsed CSS nodes and return a structured diff.
 * Regular rules are diffed at the property level.
 * At-rules are compared as atomic raw strings.
 *
 * @param {import('./css-parser.js').ParsedNode[]} beforeRules
 * @param {import('./css-parser.js').ParsedNode[]} afterRules
 * @returns {DiffResult}
 */
export function diffCSS(beforeRules, afterRules) {
  const beforeMap = buildSelectorMap(beforeRules);
  const afterMap = buildSelectorMap(afterRules);
  const beforeAtMap = buildAtRuleMap(beforeRules);
  const afterAtMap = buildAtRuleMap(afterRules);

  const afterSelectors = getUniqueSelectors(afterRules, 'rule');
  const beforeSelectors = getUniqueSelectors(beforeRules, 'rule');
  const afterAtSelectors = getUniqueSelectors(afterRules, 'at-rule');
  const beforeAtSelectors = getUniqueSelectors(beforeRules, 'at-rule');

  const diffRules = [];
  const counts = { added: 0, removed: 0, changed: 0, unchanged: 0 };

  // ── Regular rules present in "after" ──────────────────────────────────────
  for (const selector of afterSelectors) {
    const afterDecls = afterMap.get(selector) ?? [];
    const beforeDecls = beforeMap.get(selector);

    if (!beforeDecls) {
      // Entirely new rule
      const declarations = afterDecls.map((d) => ({
        property: d.property,
        beforeValue: null,
        afterValue: d.value,
        status: 'added',
      }));
      counts.added += declarations.length;
      diffRules.push({ type: 'rule', selector, status: 'added', declarations });
    } else {
      // Rule exists in both — diff at declaration level
      const declarations = diffDeclarations(beforeDecls, afterDecls, counts);
      const hasChanges = declarations.some((d) => d.status !== 'unchanged');
      diffRules.push({
        type: 'rule',
        selector,
        status: hasChanges ? 'modified' : 'unchanged',
        declarations,
      });
    }
  }

  // ── Regular rules only in "before" (removed) ─────────────────────────────
  const afterSelectorSet = new Set(afterSelectors);
  for (const selector of beforeSelectors) {
    if (!afterSelectorSet.has(selector)) {
      const beforeDecls = beforeMap.get(selector) ?? [];
      const declarations = beforeDecls.map((d) => ({
        property: d.property,
        beforeValue: d.value,
        afterValue: null,
        status: 'removed',
      }));
      counts.removed += declarations.length;
      diffRules.push({ type: 'rule', selector, status: 'removed', declarations });
    }
  }

  // ── At-rules present in "after" ───────────────────────────────────────────
  for (const selector of afterAtSelectors) {
    const afterRule = afterAtMap.get(selector);
    const beforeRule = beforeAtMap.get(selector);

    if (!beforeRule) {
      diffRules.push({ type: 'at-rule', selector, status: 'added', raw: afterRule.raw });
      counts.added++;
    } else {
      const normalized = (r) => r.raw.replace(/\s+/g, ' ').trim();
      if (normalized(beforeRule) === normalized(afterRule)) {
        diffRules.push({ type: 'at-rule', selector, status: 'unchanged', raw: afterRule.raw });
        counts.unchanged++;
      } else {
        diffRules.push({
          type: 'at-rule',
          selector,
          status: 'changed',
          raw: afterRule.raw,
          rawBefore: beforeRule.raw,
        });
        counts.changed++;
      }
    }
  }

  // ── At-rules only in "before" (removed) ──────────────────────────────────
  const afterAtSelectorSet = new Set(afterAtSelectors);
  for (const selector of beforeAtSelectors) {
    if (!afterAtSelectorSet.has(selector)) {
      const beforeRule = beforeAtMap.get(selector);
      diffRules.push({ type: 'at-rule', selector, status: 'removed', raw: beforeRule.raw });
      counts.removed++;
    }
  }

  return { rules: diffRules, counts };
}
