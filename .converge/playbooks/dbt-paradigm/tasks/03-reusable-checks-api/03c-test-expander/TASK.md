---
title: Create test-expander.ts — resolve test refs to inline checks
description: |
  Pure function. Looks up each TestRefCheck in the tests registry,
  validates args, substitutes {{ args.* }} placeholders, and returns
  a task with only inline checks. Runtime never sees test references.

inputs:
  - packages/core/src/config/test-md-definition.ts
  - packages/core/src/config/task-md-definition.ts

outputs:
  - packages/core/src/config/test-expander.ts
  - packages/core/tests/config/test-expander.test.ts

checks:
  - id: expander-tests-green
    cmd: test -f packages/core/src/config/test-expander.ts && pnpm --filter @openplaybooks/converge-core test -- test-expander
    description: All expander tests pass.
  - id: typecheck-green
    cmd: test -f packages/core/src/config/test-expander.ts && pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

skills: []
references: []

vars: {}
dependencies:
  - 03b-check-union-and-ref-parser
---

# 03c — Test expander

```ts
function expandTestRefs(
  task: ParsedTask,
  registry: Map<string, TestDef>,
): ParsedTask
```

## Behavior

For each `TestRefCheck` in `task.checks`:
1. Look up name in registry. Not found → `UnresolvedTestRefError`.
2. Validate args against `TestDef.args` schema.
3. Substitute `{{ args.<key> }}` in cmd/body.
4. Generate id: `<task-id>--test-<name>`. Handle collisions with suffix.
5. For `type: js`, wrap in `node -e '<script with context setup>'`.
6. Return as `InlineCheck`.

Record original test names in `_testRefs`.

## Red phase

Tests: successful expansion, unresolved ref throws, arg type mismatch throws,
missing required arg throws, id collision appends suffix, mixed inline+ref
preserves inline, js test wraps correctly.

## Done when

Both checks pass.
