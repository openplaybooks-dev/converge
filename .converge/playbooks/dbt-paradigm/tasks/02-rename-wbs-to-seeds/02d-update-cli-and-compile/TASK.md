---
title: Update CLI flags and compile --seed for seed terminology
description: |
  Remove the --wbs flag (seeds are now always on). Update compile --seed
  to resolve seed names from the playbook-level seeds/ directory instead
  of per-task wbs/ paths.

inputs:
  - packages/cli/src/main.ts
  - packages/cli/src/commands-compile.ts
  - packages/cli/src/commands-run.ts

outputs:
  - packages/cli/src/main.ts
  - packages/cli/src/commands-compile.ts

checks:
  - id: no-wbs-flag
    cmd: test -f packages/cli/src/main.ts && ! grep -q 'wbs' packages/cli/src/main.ts
    description: --wbs flag removed from CLI.
  - id: compile-seed-works
    cmd: |
      test -f packages/cli/dist/index.js && node packages/cli/dist/index.js compile --seed --select '03-execution-verbs' --dir .converge/playbooks/cli-redesign 2>&1
      test $? -eq 0
    description: compile --seed works with new seed names.
  - id: typecheck-green
    cmd: test -f packages/cli/src/main.ts && pnpm -r typecheck
    description: Repo typechecks.
  - id: tests-green
    cmd: test -f packages/cli/src/main.ts && pnpm -r test
    description: All tests pass.

skills: []
references:
  - "packages/cli/src/main.ts"
  - "packages/cli/src/commands-compile.ts"

vars: {}
dependencies:
  - 02c-convert-frontmatter
---

# 02d — Update CLI

## Remove --wbs flag

In `main.ts`:
- Remove `wbs` from `cliKeys` set.
- Remove `wbs: options.wbs || false` from `runAutonomousCommand` call.
- Seeds always run — no flag needed.

## Update compile --seed

In `commands-compile.ts`:
- Currently reads `fm.wbs` as a string path relative to the task directory
  (line ~85-91). Change to read `fm.seeds` (array of names).
- Resolve each name to `seeds/<name>.seed.js` at the playbook root instead
  of `<task-dir>/<wbs-path>`.
- The rest of the compile --seed logic (building context, running script,
  writing children) stays the same.

## Red phase

```bash
# Before: --wbs flag exists
grep -q 'wbs' packages/cli/src/main.ts  # must find it
```

## Green phase

Implement the changes above. Verify:
```bash
converge compile --seed --select '<parent>' --dir <playbook>
```
Still works — same behavior, different name resolution.

## Done when

All 4 checks pass. `--wbs` is gone. `compile --seed` resolves seed names.
