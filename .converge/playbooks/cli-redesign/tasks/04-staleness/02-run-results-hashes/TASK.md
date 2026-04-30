---
id: 02-run-results-hashes
title: run_results.json with output_hashes per task
description: |
  After every task completion in run/build/retry, write target/run_results.json
  with an output_hashes map keyed by output path. Required upstream for
  state:modified.drifted (next slice) and incremental tasks (phase 05).

dependencies:
  - 01-modified-ladder

inputs:
  - "packages/core/src/manifest/index.ts"
  - "packages/core/src/hash/index.ts"
  - "packages/cli/src/commands-run.ts"

outputs:
  - "packages/core/src/manifest/run-results.ts"
  - "packages/core/tests/unit/manifest/run-results.test.ts"

checks:
  - id: typecheck
    cmd: cd packages/core && pnpm typecheck
    description: Typechecks.
  - id: tests-green
    cmd: cd packages/core && pnpm test -- tests/unit/manifest/run-results.test.ts
    description: Unit tests pass.
  - id: run-emits-results
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook && rm -rf .converge/journal/default/target
      ../../../dist/index.js run --select 'tag:trivial' --max-duration=10000
      test -s .converge/journal/default/target/run_results.json
      node -e "const r=JSON.parse(require('fs').readFileSync('.converge/journal/default/target/run_results.json'));
      const e=r.results.find(x=>x.id==='trivial-task');
      if(!e||!e.output_hashes||Object.keys(e.output_hashes).length===0)process.exit(1);"
    description: Real run writes run_results.json with non-empty output_hashes.

tags:
  - staleness
  - run-results
---

# run_results writer

Two TDD subtasks. Red asserts the writer emits the schema with output
hashes. Green implements and wires into the run/build/retry hot path.

Hash computation uses `hashTaskBody`-style sha256 over each declared
output file's content; collected at task-completion time.
