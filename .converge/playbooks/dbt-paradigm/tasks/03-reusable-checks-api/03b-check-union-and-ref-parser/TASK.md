---
title: "Widen checks to discriminated union; parse test references"
description: |
  A check can now be an inline check (existing) or a test reference.
  String shorthand test:<name>(args) expands to object form at parse time.

inputs:
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/skill-definition.ts
  - packages/core/src/config/test-md-definition.ts

outputs:
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/skill-definition.ts
  - packages/core/tests/config/check-union.test.ts

checks:
  - id: union-tests-green
    cmd: test -f packages/core/src/config/task-md-definition.ts && pnpm --filter @openplaybooks/converge-core test -- check-union
    description: Check union tests pass.
  - id: existing-tests-green
    cmd: test -f packages/core/src/config/task-md-definition.ts && pnpm --filter @openplaybooks/converge-core test
    description: Existing check tests still pass.
  - id: typecheck-green
    cmd: test -f packages/core/src/config/task-md-definition.ts && pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

skills: []
references:
  - "packages/core/src/config/skill-definition.ts"

vars: {}
dependencies:
  - 03a-test-schema
---

# 03b — Check union + reference parser

## New type

```ts
type CheckEntry = InlineCheck | TestRefCheck;

interface TestRefCheck {
  type: "test";
  name: string;
  args?: Record<string, string>;
}
```

Accepted forms in YAML:
```yaml
checks:
  - id: typecheck           # inline (existing)
    cmd: pnpm typecheck
  - test:freshness(path=output.txt)        # string shorthand
  - type: test              # object form
    name: freshness
    args:
      path: output.txt
```

## Red phase

Tests: inline check still works, object form parses, string shorthand parses,
mixed array works, malformed shorthand throws.

## Green phase

Extend `parseChecks()` in `skill-definition.ts`:
- Detect `test:<name>` prefix → parse into `TestRefCheck`.
- Detect `{ type: "test", name, args? }` object.
- Existing inline parsing unchanged.
- Record `_testRefs: string[]` on the parsed task for the `test:` selector.

## Done when

All 3 checks pass.
