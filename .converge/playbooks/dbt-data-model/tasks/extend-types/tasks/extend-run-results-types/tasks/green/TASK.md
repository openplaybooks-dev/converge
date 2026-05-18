---
id: extend-run-results-types-green
title: Green — implement extended RunResults types
description: |
  Implement the type extensions in manifest/types.ts. Run tests — they must
  pass (GREEN). Keep the implementation minimal: just type changes.

inputs:
  - packages/core/tests/manifest/run-results-types.test.ts

outputs:
  - packages/core/src/manifest/types.ts (modified)

checks:
  - id: tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- run-results-types
    description: Extended type tests pass (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — implement extended types

Update `packages/core/src/manifest/types.ts`:

```ts
export interface RunResult {
  id: string;
  status: "pending" | "running" | "pass" | "error" | "skipped";
  attempts: number;
  duration_ms: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  output_hashes?: Record<string, string>;
  error?: string;
}

export interface RunResults {
  metadata: {
    execution_id: string;
    playbook: string;
    manifest_hash: string;
    selector: string;
    status: "running" | "complete" | "failed" | "cancelled";
  };
  results: RunResult[];
}
```

Note: `session_id` is REMOVED entirely, not deprecated. Clean break.

Run `pnpm --filter @openplaybooks/converge-core test -- run-results-types` — all tests pass.
Run `pnpm --filter @openplaybooks/converge-core typecheck` — no errors.
