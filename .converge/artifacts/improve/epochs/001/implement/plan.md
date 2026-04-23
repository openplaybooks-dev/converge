# Implementation Plan — Epoch 1

## Issue

- **ID:** type-003
- **Source:** types
- **File:** `packages/core/src/dispatch/dispatch-runner.ts`
- **Description:** Type error at line 84 where `ref.vars` (type `string | Record<string, string>`) is passed to `copyWithSubstitution` which expects `Record<string, string>`. The `SpawnRef` interface defines `vars: Record<string, string>`, but the union type `SpawnRef | Record<string, string>` means TypeScript cannot narrow the type without an explicit intermediate variable.

## Steps

### step-001
- **File:** `packages/core/src/dispatch/dispatch-runner.ts`
- **Description:** Extract `ref.vars` into a local const to enable type narrowing
- **Details:** In the `spawn` method, inside the `_type === "template-ref"` guard, assign `const vars = ref.vars` before calling `copyWithSubstitution`. This allows TypeScript to narrow `vars` to `Record<string, string>` since `SpawnRef.vars` is `Record<string, string>`. Line 84 changes from `await copyWithSubstitution(templateDir, destDir, ref.vars)` to `const vars = ref.vars; await copyWithSubstitution(templateDir, destDir, vars)`.