---
id: 02-green
title: Green — create the fixture files until smoke test passes
description: |
  Hand-write the fixture playbook directory tree. Make the smoke test
  from 01-red pass.

dependencies:
  - 01-red

outputs:
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/project.yaml"
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/playbook.yml"
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/tasks/trivial-task/TASK.md"
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/tasks/dependent-task/TASK.md"
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/tasks/unseeded-wbs/TASK.md"
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/tasks/unseeded-wbs/wbs/index.js"

checks:
  - id: smoke-passes
    cmd: cd packages/cli && pnpm test -- tests/integration/_fixture-smoke.test.ts
    description: Smoke test passes (GREEN).
  - id: no-smoke-edits
    cmd: git diff --name-only HEAD -- packages/cli/tests/integration/_fixture-smoke.test.ts | wc -l | awk '$1+0 > 0 { exit 1 }'
    description: Smoke test was not edited during green.

tags:
  - tdd
  - green
---

# Green — write the fixture

Create the six files. Keep them minimal — every line should serve a
test downstream. Anchor `examples/baby-app/.converge/playbooks/default/`
for tone but do not copy bulk; this fixture is intentionally tiny.

`unseeded-wbs/wbs/index.js`: a no-op skeleton that would, if run,
spawn one trivial child. It must not be invoked during this slice's
checks (only later in `04-compile-seed`).
