---
title: TASK.md schema accepts children: and from_seed:; path registry shape defined
description: |
  Schema-only phase. Extend the task-md parser to accept the new fields,
  define the path-registry data structure, and update the validator.
  No loader change yet — folder-scan still walks the tree exactly as
  today. The new fields parse but are ignored at runtime until phase 03.

inputs:
  - docs/design/declarative-discovery.md
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/loader.ts
  - packages/core/src/config/validator.ts
  - packages/cli/tests/fixtures/minimal-playbook

outputs:
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/path-registry.ts
  - packages/core/src/config/validator.ts
  - packages/core/tests/config/children-field.test.ts
  - packages/core/tests/config/from-seed-field.test.ts
  - packages/core/tests/config/path-registry.test.ts
  - packages/cli/tests/fixtures/minimal-playbook

checks:
  - id: typecheck-green
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck after schema changes.
  - id: tests-green
    cmd: pnpm --filter @converge/core --filter @converge/cli test
    description: All core and CLI tests pass.
  - id: path-registry-module-present
    cmd: test -s packages/core/src/config/path-registry.ts
    description: Path registry module exists.
  - id: children-field-parses
    cmd: pnpm --filter @converge/core test -- children-field
    description: children: field parses bare-id, object, and mixed forms.
  - id: from-seed-field-parses
    cmd: pnpm --filter @converge/core test -- from-seed-field
    description: from_seed: field parses against the seed registry.
  - id: folder-scan-still-works
    cmd: pnpm --filter @converge/core test -- loader
    description: Existing folder-scan loader tests still pass — no regression.

skills: []
references:
  - "docs/design/declarative-discovery.md"

vars: {}
dependencies:
  - 01-survey-and-discovery-spec
---

# 02 — Schema for children and the path registry

Strict red-green-refactor at every leaf.

## What lands

### `task-md-definition.ts` extension

Accept two new top-level frontmatter fields:

- **`children:`** — array. Each element is either:
  - a bare string `<id>` (path resolves to `<parent-dir>/<id>/TASK.md`).
  - an object `{ id: <id>, path?: <relative-path-from-playbook-root> }`.
- **`from_seed:`** — string, the name of a spawning seed (validated
  against the seed registry from dbt-paradigm).

A parent may have either `children:`, `from_seed:`, or both. The parsed
shape exposes `children:` as a normalized array of `{ id, path? }` and
`fromSeed:` as a string-or-null.

Validation:
- Every `id` in `children:` must be a non-empty string matching the
  task id grammar (alnum + dashes).
- A `path:` override must be a relative path; absolute paths are an
  error.
- `from_seed:` must reference a seed defined in `<playbook>/seeds/`
  (validated by the loader at phase 03 — for now phase 02 just records
  the name).

### `path-registry.ts`

A new module exposing:

```ts
export interface PathRegistry {
  register(id: string, path: string): void;  // throws on duplicate id
  resolve(id: string): string | null;
  has(id: string): boolean;
  entries(): IterableIterator<[string, string]>;
}

export function createPathRegistry(): PathRegistry;
```

Phase 03 populates it; phase 02 just lands the module and tests for the
collision-on-duplicate-id behavior.

### Validator updates

`packages/core/src/config/validator.ts`:
- Accept `children:` and `from_seed:` as known fields (do not error on
  them).
- Defer reference validation to the loader (phase 03 does it once the
  registry is built).

### Fixture extension

Extend `packages/cli/tests/fixtures/minimal-playbook/`:
- Add a parent task with `children: [001-static-child]`.
- Add a task with `from_seed: example-spawn` (the seed already exists
  from dbt-paradigm phase 02; if not, add it).
- Do **not** rely on these fields actually working at runtime — phase 03
  wires the loader. Phase 02's tests are parser-only.

## TDD discipline

Each leaf:
1. Failing test (parse asserts).
2. Run — RED.
3. Implement.
4. Refactor on green.

Tests:
- `children-field.test.ts` — bare-id form, object form, mixed, error
  on absolute path, error on duplicate id within one parent.
- `from-seed-field.test.ts` — string accepted, name recorded, error on
  empty string.
- `path-registry.test.ts` — register/resolve roundtrip, duplicate-id
  error.

## Out of scope

- Loader changes (phase 03).
- Runtime / manifest changes (phase 04).
- Migration of any playbook (phase 05).
- Folder-scan deletion (phase 06).

## Done when

All six checks pass. The schema accepts the new fields. Folder-scan
loader behavior is unchanged.
