---
id: integration-tests
title: CLI-level integration tests — run a playbook via DAG end-to-end
description: |
  Integration test that invokes the CLI with the DAG runner and verifies
  end-to-end execution. Uses the minimal-playbook fixture (now with
  children: declarations from phase 02).

inputs:
  - packages/core/src/dag/dag-runner.ts
  - packages/cli/tests/fixtures/minimal-playbook
  - packages/cli/src/commands-run.ts

outputs:
  - packages/cli/tests/integration/dag-runner.test.ts

checks:
  - id: integration-tests-pass
    cmd: pnpm --filter @converge cli test -- dag-runner
    description: CLI integration tests pass.
  - id: typecheck-green
    cmd: pnpm --filter @converge cli typecheck
    description: CLI typechecks.

skills: []
references:
  - "packages/cli/tests/fixtures/minimal-playbook"

vars: {}
dependencies: []
children:
  - integration-tests-red
  - integration-tests-green
---

# 03 — Integration tests

End-to-end CLI test. Invokes `converge run` against the declarative
fixture and verifies tasks execute in topological order.

## Children

### red
Write the CLI integration test. Run it. Expected RED — the CLI
doesn't use the DAG runner yet.

### green
Wire the DAG runner into the CLI's run command (minimally — behind a
flag or as a separate code path for testing). Fix until the
integration test passes.

## Done when

Integration test passes. CLI can run a playbook via the DAG runner.
