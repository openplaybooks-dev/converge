---
id: 02-deps-and-init-from-prompt
title: deps verb and init --from-prompt
description: |
  Two renamed verbs. `deps list` / `deps install` replace today's
  `skills list` / `skills install`. `init --from-prompt "<goal>"`
  absorbs today's `plan "<goal>"`.

dependencies:
  - 01-redirects

inputs:
  - "packages/cli/src/main.ts"

outputs:
  - "packages/cli/src/commands-deps.ts"
  - "packages/cli/tests/integration/deps.test.ts"
  - "packages/cli/tests/integration/init-from-prompt.test.ts"

checks:
  - id: tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/deps.test.ts tests/integration/init-from-prompt.test.ts
    description: Both verb tests pass.
  - id: dispatcher
    cmd: |
      grep -q 'case "deps"' packages/cli/src/main.ts
      grep -q 'init.*from-prompt\|fromPrompt' packages/cli/src/main.ts
    description: Both verbs routed.

tags:
  - migration
  - renames
---

# deps and init --from-prompt

Two TDD subtasks combine here because both are mostly thin wrappers
around existing functionality (skills/install logic for deps; plan logic
for init --from-prompt). Red writes both tests; green wires both verbs.

If the work feels too big for one red→green pair, the per-layer planner
can split into 02a-deps and 02b-init-from-prompt — but the proposal
defaults to one slice with two tests, since the implementation work is
~50 lines per verb.
