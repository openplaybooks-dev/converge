---
title: Template Variable Gap Detection
status: draft
source: ui-add playbook debugging session (2026-05-23)
tags: [gap-detection, templates, outputs, inputs]
created: 2026-05-23
---

## Problem

When a task declares outputs with template variable paths like `.design/screens/{{epicId}}/{{featureId}}/SPEC.md`, the gap detector in `find-gaps.ts` incorrectly reports them as missing because `{{epicId}}` contains `{` which is matched by the glob pattern `/[*?{}]/`.

The same issue affects inputs and checks — any path containing `<name>` style variables was being treated as a glob and failing.

## Root Cause Analysis

**Location:** `packages/core/src/task/unit/find-gaps.ts`

**`hasGlobWildcards()` function:**
```typescript
function hasGlobWildcards(p: string): boolean {
  return /[*?]/.test(p);
}
```

This function is used to decide between:
- **Glob path** → run `glob()` and check match count
- **Literal path** → run `existsSync()` directly

**Problem 1:** The function does NOT detect template variables at all — `<epic-id>`, `{{epicId}}`, and `{var}` patterns are all treated as literal paths and cause false "missing" reports when the files don't literally exist at the template path.

**Problem 2:** The original comment says `{}` is excluded as "brace expansion", but the original code did include `{}` in the regex. This was "fixed" to remove `{}` but the underlying issue remains: `<...>` and `{{...}}` style variables are not handled.

## Proposed Solution

1. **Support exactly one template variable syntax: handlebars `{{varName}}`**
   - Standard in most templating systems
   - Distinct from glob characters `*`, `?`

2. **Add `hasTemplateVars()` function:**
```typescript
function hasTemplateVars(p: string): boolean {
  return /\{\{[^}]+\}\}/.test(p);
}
```

3. **Skip template variable paths in gap detection** — they are runtime-resolved, not checkable at plan time:
```typescript
// In checkInputs() loop:
if (hasTemplateVars(input)) continue;

// In output gap detection loop:
if (hasTemplateVars(output)) continue;
```

4. **Legacy `<var>` syntax (angle brackets):** The framework should NOT support this for template variables. Only `{{handlebar}}` syntax is supported. If users have `<epic-id>` in their paths, those should be treated as literal directory names (not template variables).

## Migration Path

1. **Framework change** (this RFC):
   - Add `hasTemplateVars()` detection
   - Skip template variable paths in gap detection
   - Only support `{{handlebar}}` syntax

2. **Playbook migration:**
   - Update all TASK.md files using `<epic-id>` style to use `{{epicId}}` handlebars syntax
   - The ui-add example playbook has been updated as part of this RFC's debugging session

3. **Documentation:**
   - Document the supported template variable syntax in TASK.md schema
   - Clarify that `<name>` is literal bracket notation (Next.js style), not template variables

## Verification

```bash
# Test glob path (should glob)
hasGlobWildcards("docs/product/features/*/catalog.json") → true

# Test handlebars (should NOT be glob)
hasGlobWildcards("docs/product/features/{{epicId}}/catalog.json") → false

# Test template var detection
hasTemplateVars("docs/product/features/{{epicId}}/catalog.json") → true
hasTemplateVars("docs/product/features/*/catalog.json") → false
```

## Files Affected

- `packages/core/src/task/unit/find-gaps.ts` — add `hasTemplateVars()`, modify `checkInputs()` and output gap detection

## Progress

| Item | Status |
|------|--------|
| RFC document | **done** |
| Framework fix (hasTemplateVars + skip logic) | **done** |
| Unit tests (template-var-gap.test.ts) | **done** |
| Example playbook update (ui-add) | **done** |
| Build verification | **done** |