---
id: 001-todo
title: 001-todo
---

# Extract `ref.vars` into a local const to enable type narrowing

**File:** `packages/core/src/dispatch/dispatch-runner.ts`

In the `spawn` method, inside the `_type === "template-ref"` guard, assign `const vars = ref.vars` before calling `copyWithSubstitution`. This allows TypeScript to narrow `vars` to `Record<string, string>` since `SpawnRef.vars` is `Record<string, string>`. Line 84 changes from `await copyWithSubstitution(templateDir, destDir, ref.vars)` to `const vars = ref.vars; await copyWithSubstitution(templateDir, destDir, vars)`.

## Rules

- Make only the change described above
- Don't suppress errors with `any` or `@ts-ignore`
- Don't refactor unrelated code
