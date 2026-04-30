---
id: 02-green
title: Green — implement the five task-hash functions
description: |
  Implement packages/core/src/hash/task.ts and index.ts until 01-red
  tests pass. Refactor while green.

dependencies:
  - 01-red

inputs:
  - "packages/core/tests/unit/hash/task.test.ts"

outputs:
  - "packages/core/src/hash/task.ts"
  - "packages/core/src/hash/index.ts"

checks:
  - id: typecheck
    cmd: cd packages/core && pnpm typecheck
    description: Module typechecks.
  - id: tests-pass
    cmd: cd packages/core && pnpm test -- tests/unit/hash
    description: All 01-red tests pass.
  - id: no-test-file-changes
    cmd: git diff --name-only HEAD -- packages/core/tests/unit/hash/ | wc -l | awk '$1+0 > 0 { exit 1 }'
    description: Tests were not edited.

tags:
  - tdd
  - green
---

# Green — implement until tests pass

Use Node's `crypto.createHash('sha256')` consistently. Frontmatter
hashing: stable JSON serialization (sort keys recursively). Body
normalization: split on `\n`, trim trailing whitespace per line, ensure
exactly one terminal newline.

For `hashInputs`, stream large files (don't `readFileSync` a 200 MB
binary). For files crossing the 50 MB threshold, log
`[hash] skipping <path> (NN MB > 50 MB threshold)` to stderr and write
a placeholder hash like `sha256:skipped-large-file` so downstream
diffing still has *something* deterministic.

Refactor while green.
