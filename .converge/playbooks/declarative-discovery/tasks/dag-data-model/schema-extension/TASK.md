---
id: schema-extension
title: "Schema extension — add children: and from_seed: to TASK.md frontmatter"
description: |
  Extend the TaskDefinition type and TASK.md frontmatter parser to
  accept children: (static declared children) and from_seed: (dynamic
  children from a spawning seed). This is schema-only — the loader
  doesn't use these fields until phase 02.

inputs:
  - packages/core/src/config/task-definition.ts
  - packages/core/src/config/task-md-definition.ts
  - packages/core/tests/config/

outputs:
  - packages/core/src/config/task-definition.ts
  - packages/core/src/config/task-md-definition.ts
  - packages/core/tests/config/children-field.test.ts

checks:
  - id: children-field-parses
    cmd: pnpm --filter @converge/core test -- children-field
    description: "children: parses bare-id, object, and mixed forms."
  - id: from-seed-field-parses
    cmd: pnpm --filter @converge/core test -- from-seed-field
    description: "from_seed: field parses."
  - id: typecheck-green
    cmd: pnpm --filter @converge core typecheck
    description: Core typechecks with new fields.

skills: []
references:
  - "packages/core/src/config/task-md-definition.ts"
  - "packages/core/src/config/task-definition.ts"

vars: {}
dependencies: []
children:
  - schema-extension-red
  - schema-extension-green
---

# 04 — Schema extension

Add two new fields to the TASK.md frontmatter schema:

- `children:` — static declared children. Array of bare id strings or
  `{ id, path? }` objects.
- `from_seed:` — string naming a spawning seed. The children are
  virtual nodes materialized at runtime.

Both fields coexist — a parent can have `children:` (static) and
`from_seed:` (dynamic) simultaneously.

## ParsedChild type

```ts
export interface ParsedChild {
  id: string;
  path?: string;  // override for non-default location
}
```

## Validation

- Every `id` must match `^[\w.-]+$` (alphanumeric, dashes, dots,
  underscores)
- `path:` override must be relative (no absolute paths)
- Duplicate `id` within one parent's `children:` is an error
- `from_seed:` must be a non-empty string

## Children

### red
Write failing tests for parsing the new fields from TASK.md frontmatter.
Cover bare ids, object form, mixed arrays, from_seed, validation
errors, and RESERVED_KEYS inclusion.

### green
Extend `TaskDefinition` type and `task-md-definition.ts` parser. Add
both fields to RESERVED_KEYS. Run tests green.

## Done when

Both fields parse correctly. Validation catches invalid inputs.
Typecheck green.
