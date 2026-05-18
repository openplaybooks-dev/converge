---
id: tombstone-tests-red
title: Red (INVERTED) — tombstone tests fail because files still exist
description: |
  Write tests asserting checkpoint files don't exist. They DO exist →
  tests FAIL. This is the correct RED state for inverted red-green.

inputs: []

outputs:
  - packages/core/tests/checkpoint/checkpoint-deleted.test.ts

checks:
  - id: tombstone-test-exists
    cmd: test -s packages/core/tests/checkpoint/checkpoint-deleted.test.ts
    description: Tombstone test file exists.
  - id: tests-fail
    cmd: "! pnpm --filter @openplaybooks/converge-core test -- checkpoint-deleted 2>/dev/null"
    description: Tests fail (RED) — files still exist (inverted).

tags:
  - tdd
  - red
---

# Red (INVERTED) — files still exist

Write `packages/core/tests/checkpoint/checkpoint-deleted.test.ts`:

```ts
import { existsSync } from "node:fs";
import { describe, it, expect } from "vitest";

describe("checkpoint infrastructure deleted", () => {
  const root = path.resolve(__dirname, "../../src/checkpoint");

  it("manager.ts does not exist", () => {
    expect(existsSync(path.join(root, "manager.ts"))).toBe(false);
  });

  it("filesystem-status.ts does not exist", () => {
    expect(existsSync(path.join(root, "filesystem-status.ts"))).toBe(false);
  });

  it("unit-checkpoint.ts does not exist", () => {
    expect(existsSync(path.join(root, "unit-checkpoint.ts"))).toBe(false);
  });

  it("task-checkpoint.ts does not exist", () => {
    expect(existsSync(path.join(root, "task-checkpoint.ts"))).toBe(false);
  });

  it("atomic-write.ts survives", () => {
    expect(existsSync(path.join(root, "atomic-write.ts"))).toBe(true);
  });
});
```

Run `pnpm --filter @openplaybooks/converge-core test -- checkpoint-deleted`.
Expected: **ALL TESTS FAIL** — files still exist. This is the RED state.
INVERTED because normally RED means "code doesn't work", but here RED means
"files still exist → deletion not done yet."
