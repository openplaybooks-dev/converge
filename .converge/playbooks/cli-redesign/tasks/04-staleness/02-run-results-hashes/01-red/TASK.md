---
id: 01-red
title: Red — failing tests for run_results writer with output_hashes
description: |
  Unit test: writeRunResults emits the documented schema. Integration
  test: a real run produces run_results.json with output_hashes.
  Confirm RED.

dependencies: []

outputs:
  - "packages/core/tests/unit/manifest/run-results.test.ts"

checks:
  - id: test-exists
    cmd: test -s packages/core/tests/unit/manifest/run-results.test.ts
    description: Test exists.
  - id: test-fails
    cmd: test -e packages/core/tests/unit/manifest/run-results.test.ts && cd packages/core && ! pnpm test -- tests/unit/manifest/run-results.test.ts
    description: Test fails (RED).

tags:
  - tdd
  - red
---

# Red — run_results test

Cover:
- `writeRunResults` emits a JSON object with `metadata.session_id`,
  `metadata.selector`, and a `results[]` array.
- Each `result` carries `id`, `status`, `attempts`, `duration_ms`,
  optional `output_hashes` (path → sha256:...).
- Round-trip: write → read → deep-equal.
- Output hashes are content-addressed (same content → same hash;
  different content → different hash).

RED.
