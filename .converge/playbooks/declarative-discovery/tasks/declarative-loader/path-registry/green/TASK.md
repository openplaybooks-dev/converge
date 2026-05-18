---
id: path-registry-green
title: Green — implement PathRegistry
description: |
  Implement packages/core/src/config/path-registry.ts. Run tests green.

inputs:
  - packages/core/tests/config/path-registry.test.ts

outputs:
  - packages/core/src/config/path-registry.ts

checks:
  - id: path-registry-exists
    cmd: test -s packages/core/src/config/path-registry.ts
    description: Module exists.
  - id: tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- path-registry
    description: All tests pass (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — implement PathRegistry

Create `packages/core/src/config/path-registry.ts`:

```ts
export class DuplicateIdError extends Error {
  constructor(id: string, pathA: string, pathB: string) {
    super(`Duplicate task id "${id}": "${pathA}" and "${pathB}"`);
    this.name = 'DuplicateIdError';
  }
}

export class PathRegistry {
  private _map = new Map<string, string>();

  register(id: string, path: string): void {
    const existing = this._map.get(id);
    if (existing !== undefined) {
      if (existing !== path) {
        throw new DuplicateIdError(id, existing, path);
      }
      return; // idempotent
    }
    this._map.set(id, path);
  }

  resolve(id: string): string | null {
    return this._map.get(id) ?? null;
  }

  has(id: string): boolean {
    return this._map.has(id);
  }

  entries(): IterableIterator<[string, string]> {
    return this._map.entries();
  }
}
```

Run `pnpm --filter @converge core test -- path-registry` — all green.
Run `pnpm --filter @converge core typecheck` — no errors.
