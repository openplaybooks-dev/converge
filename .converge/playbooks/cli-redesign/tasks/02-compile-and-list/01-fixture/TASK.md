---
id: 01-fixture
title: Minimal-playbook test fixture
description: |
  Hand-written fixture playbook at packages/cli/tests/fixtures/minimal-playbook/.
  Used by every CLI integration test downstream. Covers: 2-3 top-level tasks,
  a tag for selection probing, a WBS parent that is unseeded (for frontier
  tests), one task with declared dependencies.

dependencies: []

inputs:
  - "docs/design/cli-redesign.md"
  - "examples/baby-app/.converge/playbooks/default/playbook.yml"

outputs:
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/playbook.yml"
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/tasks/trivial-task/TASK.md"
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/tasks/dependent-task/TASK.md"
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/tasks/unseeded-wbs/TASK.md"
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/tasks/unseeded-wbs/wbs/index.js"
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/project.yaml"
  - "packages/cli/tests/integration/_fixture-smoke.test.ts"

checks:
  - id: fixture-files-present
    cmd: |
      test -s packages/cli/tests/fixtures/minimal-playbook/.converge/project.yaml
      test -s packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/playbook.yml
      test -s packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/tasks/trivial-task/TASK.md
      test -s packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/tasks/dependent-task/TASK.md
      test -s packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/tasks/unseeded-wbs/TASK.md
    description: All required fixture files exist.
  - id: fixture-loads
    cmd: cd packages/cli && pnpm test -- tests/integration/_fixture-smoke.test.ts
    description: Smoke test confirms the fixture parses as a valid playbook.

tags:
  - fixture
---

# Minimal-playbook fixture

Two TDD subtasks: red writes a smoke test that asserts the fixture loads
correctly (initially failing because no fixture exists); green creates
the fixture files until the smoke test passes.

The fixture must contain:

1. `trivial-task` — a leaf with `tags: [trivial]`, a single `outputs:`
   entry, and a deterministic check (e.g. `test -f outputs/foo.txt`).
2. `dependent-task` — depends on `trivial-task`, has its own outputs.
3. `unseeded-wbs` — declares `wbs:` pointing to `wbs/index.js` but the
   WBS has not been run; used for frontier tests.

Reuses for downstream phases:
- Phase 02's `compile`, `list`, `compile --seed` tests.
- Phase 03's verb tests (each verb runs against this fixture).
- Phase 04 extends it with two-snapshot scenarios for `state:modified.*`.
- Phase 05 extends it with incremental and freshness-declared tasks.
- Phase 06 uses it for redirect tests.
