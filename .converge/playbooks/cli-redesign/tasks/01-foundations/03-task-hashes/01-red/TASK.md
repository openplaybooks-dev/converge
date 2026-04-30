---
id: 01-red
title: Red — failing tests for the five task-hash functions
description: |
  Write tests covering frontmatter sort-stability, body-normalization
  whitespace handling, checks-block isolation, inputs-content hashing
  with size threshold, and upstream rollup. Confirm RED.

dependencies: []

inputs:
  - "docs/design/cli-redesign.md"

outputs:
  - "packages/core/tests/unit/hash/task.test.ts"

checks:
  - id: tests-exist
    cmd: test -s packages/core/tests/unit/hash/task.test.ts
    description: Test file exists and is non-empty.
  - id: tests-fail
    cmd: cd packages/core && pnpm test -- tests/unit/hash 2>&1; test $? -ne 0
    description: Tests fail (RED).
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(|assert' packages/core/tests/unit/hash/task.test.ts | awk '$1+0 < 8 { exit 1 }'
    description: At least 8 assertions (one per function plus edge cases).

tags:
  - tdd
  - red
---

# Red — failing tests

**task.test.ts** must cover:

- `hashTaskFrontmatter`: same frontmatter with reordered keys produces
  the same hash; different values produce different hashes.
- `hashTaskBody`: trailing whitespace per line and terminal newline are
  normalized (cosmetic edits don't change the hash); content edits do.
- `hashTaskChecks`: editing only the checks block changes only this
  hash, not frontmatter hash.
- `hashInputs`: reads file contents in declared order; reordering the
  inputs list changes the hash; editing a file's content changes the
  hash; files >50 MB are skipped with a warning (assert via captured
  console output).
- `hashUpstream`: rollup of parents' (frontmatter, body, inputs)
  triples; reordering parents changes the hash (it's order-sensitive
  by the parent list provided by the manifest, deterministic).

Run `pnpm test -- tests/unit/hash` and confirm RED.
