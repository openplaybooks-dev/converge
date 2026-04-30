---
id: 01-red
title: Red — failing tests for source freshness
description: |
  Unit tests: threshold math for warn_after / error_after. Integration
  tests: real CLI invocation with faked mtimes. Confirm RED.

dependencies: []

outputs:
  - "packages/core/tests/unit/freshness/freshness.test.ts"
  - "packages/cli/tests/integration/source-freshness.test.ts"

checks:
  - id: tests-exist
    cmd: |
      test -s packages/core/tests/unit/freshness/freshness.test.ts
      test -s packages/cli/tests/integration/source-freshness.test.ts
    description: Both tests exist.
  - id: tests-fail
    cmd: test -e packages/core/tests/unit/freshness && cd packages/core && ! pnpm test -- tests/unit/freshness
    description: Tests fail (RED).

tags:
  - tdd
  - red
---

# Red — freshness tests

Unit:
- `evaluateFreshness({ loaded_at_mtime, warn_after: {12, 'hour'}, error_after: {24, 'hour'} }, now)` →
  pass when delta < warn; warn when warn ≤ delta < error; error when delta ≥ error.
- Period units: hour, minute, day all parse correctly.

Integration:
- Fixture has two tasks: `fresh-source` (loaded_at file mtime = now) and
  `stale-source` (loaded_at mtime = 30h ago).
- `source freshness --select 'name:fresh-source'` exits 0 with "pass".
- `source freshness --select 'name:stale-source'` exits non-zero with
  "error".

RED.
