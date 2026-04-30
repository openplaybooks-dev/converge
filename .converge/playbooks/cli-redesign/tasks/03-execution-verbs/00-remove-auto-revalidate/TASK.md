---
id: 00-remove-auto-revalidate
title: Remove automatic re-validation on --resume
description: |
  Delete the recheckEditedCompletedTasks call from autonomous-run.ts and
  related auto-revert logic. Per spec §7.6, this behavior moves to opt-in
  `debug --revalidate` (lands in phase 04). Between this slice and phase
  04, mtime-edited completions are simply trusted.

dependencies: []

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/cli/src/autonomous-run.ts"

outputs:
  - "packages/cli/src/autonomous-run.ts"
  - "packages/cli/tests/integration/no-auto-revalidate.test.ts"

checks:
  - id: tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/no-auto-revalidate.test.ts
    description: Test confirms `run --resume` does NOT auto-re-run mtime-edited completions.
  - id: function-removed
    cmd: |
      test -f packages/cli/src/autonomous-run.ts && ! grep -q 'recheckEditedCompletedTasks' packages/cli/src/autonomous-run.ts
    description: The function is no longer referenced from autonomous-run.ts.

tags:
  - cleanup
  - removal
---

# Remove auto-revalidate

Two TDD subtasks. Red writes a test asserting the *new* behavior (no
auto-rerun); green removes the offending code.

This is the rare case where the test covers a *removal*. The red phase
asserts behavior that doesn't exist yet (because the auto-revalidation
still happens). Green deletes code until the assertion is true.

The function `recheckEditedCompletedTasks` itself is **kept** — it
returns to use in phase 04 as the implementation of `debug --revalidate`.
What's removed is the *automatic call* on the `--resume` path.

References: spec §7.6.
