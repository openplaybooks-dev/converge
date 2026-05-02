---
id: path-registry
title: PathRegistry — id → path mapping with duplicate detection
description: |
  Implement packages/core/src/config/path-registry.ts. Pure data
  structure mapping task ids to file paths. Enforces uniqueness:
  same id + same path = idempotent; same id + different path = error.

inputs:
  - packages/core/src/dag/dag-node.ts

outputs:
  - packages/core/src/config/path-registry.ts
  - packages/core/tests/config/path-registry.test.ts

checks:
  - id: path-registry-exists
    cmd: test -s packages/core/src/config/path-registry.ts
    description: PathRegistry module exists.
  - id: tests-pass
    cmd: pnpm --filter @converge core test -- path-registry
    description: PathRegistry tests pass.
  - id: typecheck-green
    cmd: pnpm --filter @converge core typecheck
    description: Core typechecks.

skills: []
references: []

vars: {}
dependencies: []
children:
  - path-registry-red
  - path-registry-green
---

# 01 — Path registry

Simple id → path mapping. The declarative loader uses it to track
which task id maps to which file path, and to detect collisions.

## API

```ts
export class PathRegistry {
  register(id: string, path: string): void;
  resolve(id: string): string | null;
  has(id: string): boolean;
  entries(): IterableIterator<[string, string]>;
}
```

- `register(id, path)` — same id + same path = idempotent (no-op).
  Same id + different path = throws `DuplicateIdError`.
- `resolve(id)` — returns path or null.
- `has(id)` — true if registered.
- `entries()` — iterator over all [id, path] pairs.

## Children

### red
Write failing tests for PathRegistry: register, resolve, has, entries,
idempotent re-registration, duplicate detection.

### green
Implement path-registry.ts. Run tests green.

## Done when

Tests pass. Typecheck green.
