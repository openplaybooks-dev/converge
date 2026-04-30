---
id: 01-red
title: Red — failing tests for manifest writer and reader
description: |
  Write unit tests covering: atomic writes (no partial files on crash),
  version-mismatch reads, the three node states, run_results round-trip
  with output_hashes. Confirm RED.

dependencies: []

inputs:
  - "docs/design/cli-redesign.md"

outputs:
  - "packages/core/tests/unit/manifest/writer.test.ts"
  - "packages/core/tests/unit/manifest/reader.test.ts"

checks:
  - id: tests-exist
    cmd: |
      test -s packages/core/tests/unit/manifest/writer.test.ts
      test -s packages/core/tests/unit/manifest/reader.test.ts
    description: Both test files exist and are non-empty.
  - id: tests-fail
    cmd: test -e packages/core/tests/unit/manifest && cd packages/core && ! pnpm test -- tests/unit/manifest
    description: Tests fail (RED).
  - id: tests-have-assertions
    cmd: |
      grep -cE 'expect\(|assert' packages/core/tests/unit/manifest/writer.test.ts | awk '$1+0 < 5 { exit 1 }'
      grep -cE 'expect\(|assert' packages/core/tests/unit/manifest/reader.test.ts | awk '$1+0 < 5 { exit 1 }'
    description: Each test file has at least 5 assertions.

tags:
  - tdd
  - red
---

# Red — failing tests

**writer.test.ts:**
- writeManifest creates target/manifest.json with the expected nodes.
- Atomic: kill the process between temp-write and rename — the original
  manifest survives unchanged.
- Round-trip: write -> read -> deep-equal.
- Three node states (`concrete`, `expected`, `frontier`) all serialize.
- writeRunResults emits `output_hashes` per result entry.

**reader.test.ts:**
- readManifest returns null when target/ doesn't exist.
- Throws when MANIFEST_VERSION mismatches.
- Parses all three node states correctly into the discriminated union.

Run `pnpm test -- tests/unit/manifest` and confirm RED.
