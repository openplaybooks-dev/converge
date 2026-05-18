---
title: Extend scanner to discover tests/; wire expander; implement script runner
description: |
  Add tests/ scanning to DiscoveryScanner (same pattern as seeds/ from
  phase 02). Wire expandTestRefs into the load pipeline. Implement the
  reusable check runner for shell and JS scripts.

inputs:
  - packages/core/src/task/discovery/scanner.ts
  - packages/core/src/config/test-expander.ts
  - packages/core/src/task/lifecycle/after.ts

outputs:
  - packages/core/src/task/discovery/scanner.ts
  - packages/core/src/task/checks/reusable-check-runner.ts
  - packages/core/tests/config/test-discovery.test.ts
  - packages/core/tests/task/reusable-check-runner.test.ts

checks:
  - id: discovery-tests-green
    cmd: test -f packages/core/src/config/test-expander.ts && pnpm --filter @openplaybooks/converge-core test -- test-discovery
    description: Test discovery works.
  - id: runner-tests-green
    cmd: test -f packages/core/src/config/test-expander.ts && pnpm --filter @openplaybooks/converge-core test -- reusable-check-runner
    description: Reusable check runner works.
  - id: expander-wired
    cmd: test -f packages/core/src/config/test-expander.ts && pnpm --filter @openplaybooks/converge-core test -- loader-libraries
    description: Expander wired into load pipeline.
  - id: typecheck-green
    cmd: test -f packages/core/src/config/test-expander.ts && pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.
  - id: existing-tests-green
    cmd: test -f packages/core/src/config/test-expander.ts && pnpm --filter @openplaybooks/converge-core test
    description: Existing tests still pass.

skills: []
references:
  - "packages/core/src/task/discovery/scanner.ts"

vars: {}
dependencies:
  - 03c-test-expander
---

# 03d — Discovery and script runner

## Part A — Discovery

Add glob patterns to `DiscoveryScanner`:
```
.converge/playbooks/*/tests/*.test.md
.converge/journal/*/tests/*.test.md
```

Parse each with `parseTestMd()`, build `Map<string, TestDef>`, validate
unique names. Wire `expandTestRefs()` into the load pipeline — run after
all tasks in a playbook are parsed, before tree construction.

## Part B — Script runner

```ts
function runReusableCheck(
  test: TestDef,
  ctx: { inputs: string[]; vars: Record<string, unknown> },
): Promise<{ passed: boolean; message?: string }>
```

- **type: cmd** — substitute args, run via `execAsync`. Exit 0 = pass.
- **type: js** — build context object with `inputs`, `vars`, `assert()`,
  `readFile()`. Run in child Node process. Assert failures → exit 1.

Update `runCheck()` in `after.ts` to delegate when check originated from
a test reference.

## Red phase

Tests: scanner discovers test files, duplicate names throw, expander wired
(load playbook → checks are expanded), cmd test passes/fails, js test
asserts pass/fail, js test throws is caught.

## Done when

All 5 checks pass.
