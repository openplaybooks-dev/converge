---
id: parity-tests-green
title: "Green — add children: declarations to fixture; fix loader until parity passes"
description: |
  Add children: declarations to every parent TASK.md in the fixture
  playbook that match its folder structure. Fix any loader divergence
  until both loaders produce identical node sets and edge sets.

inputs:
  - packages/core/tests/config/loader-parity.test.ts
  - packages/cli/tests/fixtures/minimal-playbook

outputs:
  - packages/cli/tests/fixtures/minimal-playbook

checks:
  - id: parity-test-passes
    cmd: pnpm --filter @converge core test -- loader-parity
    description: Parity test passes (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @converge core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — achieve cross-loader parity

## Step 1 — Add children: to fixture

For each TASK.md in the fixture that has subdirectories with their own
TASK.md files, add a `children:` field listing those sub-task ids.

Example — if the fixture structure is:
```
tasks/root-task/
  TASK.md
  sub-task-a/
    TASK.md
  sub-task-b/
    TASK.md
```

Add to `tasks/root-task/TASK.md` frontmatter:
```yaml
children:
  - sub-task-a
  - sub-task-b
```

Work through the entire fixture tree. For each parent directory, add
the appropriate `children:` declaration.

## Step 2 — Fix loader divergence

Run the parity test. Common divergences to fix:

- **Root detection**: folder-scan discovers roots as directories
  directly under `tasks/`; declarative gets roots from `playbook.yml`.
  Ensure the playbook.yml lists the same roots.
- **Edge direction**: parent→child in tree = parent declares `children:`
  in declarative. Verify edge polarity matches.
- **Node ordering**: sets are compared, not arrays — order doesn't
  matter.
- **Virtual nodes**: folder-scan won't have them; declarative may.
  Exclude virtual nodes from comparison (only compare concrete nodes).
- **Missing nodes**: if a folder contains a TASK.md but no parent
  declares it as a child, folder-scan finds it but declarative
  doesn't. Add the missing declaration.

## Step 3 — Verify green

```bash
pnpm --filter @converge core test -- loader-parity
```

All assertions pass. Both loaders produce identical concrete node
sets and edge sets.

## Done when

Parity test green. Fixture is fully declarative. Both loaders agree.
