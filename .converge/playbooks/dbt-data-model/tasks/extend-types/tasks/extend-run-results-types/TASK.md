---
id: extend-run-results-types
title: Extend RunResult and RunResults types for full node lifecycle
description: |
  Extend RunResult.status to include pending/running/pass/error/skipped.
  Add started_at, completed_at, error_message fields. Replace
  RunResults.metadata.session_id with execution_id. Add playbook,
  manifest_hash, status to RunResults.metadata. Clean break — no
  deprecated session_id field.

inputs:
  - packages/core/src/manifest/types.ts

outputs:
  - packages/core/src/manifest/types.ts (modified)
  - packages/core/tests/manifest/run-results-types.test.ts (new)

checks:
  - id: run-result-status-extended
    cmd: grep -q '"pending"\|"running"\|"skipped"' packages/core/src/manifest/types.ts
    description: RunResult.status includes pending, running, skipped.
  - id: execution-id-in-metadata
    cmd: grep -q 'execution_id' packages/core/src/manifest/types.ts
    description: RunResults.metadata uses execution_id (not session_id).
  - id: no-deprecated-session-id
    cmd: "! grep -q 'session_id' packages/core/src/manifest/types.ts"
    description: No deprecated session_id field.
  - id: types-tests-pass
    cmd: pnpm --filter @converge/core test -- run-results-types
    description: Type extension tests pass.

skills: []
references:
  - "packages/core/src/manifest/types.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 01 — Extend RunResult and RunResults types

## Children

### red
Write tests that verify the extended type shape. Tests import the types
and check the new status values, new fields, and metadata shape. Expected
RED because the types don't have the new fields yet.

### green
Implement the type changes in manifest/types.ts. All tests pass. Typecheck green.

## Type changes

```ts
// RunResult.status becomes:
status: "pending" | "running" | "pass" | "error" | "skipped";

// New fields on RunResult:
started_at?: string;
completed_at?: string;
error_message?: string;

// RunResults.metadata becomes:
metadata: {
  execution_id: string;
  playbook: string;
  manifest_hash: string;
  selector: string;
  status: "running" | "complete" | "failed" | "cancelled";
};
```

No deprecated `session_id` — clean break.
