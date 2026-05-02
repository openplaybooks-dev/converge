---
id: parity-tests
title: Cross-loader parity — declarative loader vs folder-scan produce identical DAG
description: |
  Write a parity test that loads the minimal-playbook fixture under both
  the declarative loader and the existing folder-scan loader. Assert
  identical node sets and edge sets. This is the primary gate for
  phase 02 — if parity doesn't hold, the migration isn't safe.

inputs:
  - packages/core/src/config/declarative-loader.ts
  - packages/core/src/config/loader.ts
  - packages/cli/tests/fixtures/minimal-playbook

outputs:
  - packages/core/tests/config/loader-parity.test.ts

checks:
  - id: parity-test-passes
    cmd: pnpm --filter @converge core test -- loader-parity
    description: Cross-loader parity test passes.
  - id: typecheck-green
    cmd: pnpm --filter @converge core typecheck
    description: Core typechecks.

skills: []
references:
  - "packages/core/src/config/loader.ts"

vars: {}
dependencies: []
children:
  - parity-tests-red
  - parity-tests-green
---

# 03 — Cross-loader parity

The parity test is the gate. If the declarative loader doesn't produce
the same DAG as the folder-scan loader, nothing else in this playbook
is safe.

## Test approach

1. Load `minimal-playbook` fixture under the folder-scan loader →
   extract node ids and parent-child edges.
2. Add `children:` declarations to the fixture's TASK.md files that
   match its folder structure.
3. Load under the declarative loader → extract same.
4. Assert: `nodeSet1 === nodeSet2` and `edgeSet1 === edgeSet2`.

## Children

### red
Write the parity test. Run it. Expected RED — the declarative loader
may not produce identical output yet (or the fixture doesn't have
children: declarations yet).

### green
Fix the fixture (add children: declarations) and fix any loader
divergence until parity is achieved. Run tests green.

## Done when

Parity test passes. Both loaders produce identical DAGs.
