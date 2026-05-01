---
id: 02-green
title: Green — implement converge compile
description: |
  Implement packages/cli/src/commands-compile.ts. Wire into the main.ts
  dispatcher. Make 01-red green.

dependencies:
  - 01-red

inputs:
  - "packages/cli/tests/integration/compile.test.ts"

outputs:
  - "packages/cli/src/commands-compile.ts"

checks:
  - id: cli-builds
    cmd: test -f packages/cli/package.json && pnpm --filter @converge/cli build
    description: CLI builds.
  - id: test-passes
    cmd: cd packages/cli && pnpm test -- tests/integration/compile.test.ts
    description: Test passes (GREEN).
  - id: dispatcher-wired
    cmd: grep -q "case \"compile\"" packages/cli/src/main.ts
    description: main.ts dispatcher routes to the new command.
tags:
  - tdd
  - green
---

# Green — implement compile

`commands-compile.ts` exports an async function that:
1. Loads the playbook tree.
2. Walks every task; for each, decides state:
   - `concrete` if the TASK.md exists on disk.
   - `frontier` if the task has `wbs:` and no children have been spawned.
   - (`expected` lands in a later slice when preview manifests are wired.)
3. Computes the five hashes from phase 01 for each concrete node.
4. Builds the Manifest object.
5. Calls writeManifest.

Wire into `main.ts` by adding `case "compile":` next to the existing
dispatcher cases.

Refactor while green.
