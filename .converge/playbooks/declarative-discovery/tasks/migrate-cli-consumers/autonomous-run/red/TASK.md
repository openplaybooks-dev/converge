---
id: autonomous-run-red
title: Red — baseline test for autonomous-run
outputs: packages/cli/tests/autonomous-run.test.ts
checks:
  - id: test-file-exists
    cmd: test -s packages/cli/tests/autonomous-run.test.ts
  - id: baseline-passes
    cmd: pnpm --filter @converge cli test -- autonomous-run
tags: [tdd, red]
---

# Red — autonomous-run baseline

Write test capturing that autonomous run executes tasks to completion
and returns a result. Test against minimal-playbook fixture.
