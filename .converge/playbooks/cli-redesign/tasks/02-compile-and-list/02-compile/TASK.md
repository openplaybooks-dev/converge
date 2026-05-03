---
id: 02-compile
title: converge compile — write target/manifest.json
description: |
  Implement `converge compile [--select <expr>]` end-to-end. Resolves the
  static portion of the DAG, computes hashes (from phase 01), assigns
  state (`concrete` for materialized tasks, `frontier` for unseeded WBS),
  writes target/manifest.json. No execution.

dependencies:
  - 01-fixture

inputs:
  - "packages/core/src/select/index.ts"
  - "packages/core/src/manifest/index.ts"
  - "packages/core/src/hash/index.ts"
  - "packages/cli/tests/fixtures/minimal-playbook/playbook.yml"

outputs:
  - "packages/cli/src/commands-compile.ts"
  - "packages/cli/tests/integration/compile.test.ts"

checks:
  - id: cli-builds
    cmd: test -f packages/cli/package.json && pnpm --filter @converge/cli build
    description: CLI builds.
  - id: tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/compile.test.ts
    description: Compile integration test passes.
  - id: dispatcher-routes-compile
    cmd: |
      packages/cli/dist/index.js compile --help 2>&1 | grep -qi compile
    description: The dispatcher routes `compile` to the new command.

tags:
  - cli
  - compile
children:
  - 01-red
  - 02-green
---

# converge compile

Two TDD subtasks. Red writes the integration test; green implements
`commands-compile.ts` and wires it into `main.ts`.

The contract:
- `converge compile` (no args) writes `.converge/journal/<playbook>/target/manifest.json`.
- `converge compile --select <expr>` filters the manifest to selected
  nodes (still writes a complete manifest; `--select` here is for the
  user's preview output, not for skipping nodes).
- An unseeded WBS parent gets `state: "frontier"` plus a single
  `<id>#frontier` placeholder edge as documented in spec §6.1.
- Output paths in `target/` only — no other journal mutation.

References: spec §3 (verb table), §6 (manifest schema).
