---
id: schema-extension-green
title: "Green — extend TaskDefinition and TASK.md parser for children: and from_seed:"
description: |
  Add children: and from_seed: to the TaskDefinition type and the
  TASK.md frontmatter parser. Run tests until green.

inputs:
  - packages/core/tests/config/children-field.test.ts
  - packages/core/src/config/task-definition.ts
  - packages/core/src/config/task-md-definition.ts

outputs:
  - packages/core/src/config/task-definition.ts
  - packages/core/src/config/task-md-definition.ts

checks:
  - id: children-field-parses
    cmd: pnpm --filter @openplaybooks/converge-core test -- children-field
    description: "children: field parses all forms."
  - id: from-seed-field-parses
    cmd: pnpm --filter @openplaybooks/converge-core test -- children-field
    description: "from_seed: field parses."
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.
  - id: existing-tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test
    description: No existing tests broken by schema extension.

tags:
  - tdd
  - green
---

# Green — extend schema

## Step 1 — `task-definition.ts`

Add to the `TaskDefinition` interface:

```ts
export interface ParsedChild {
  id: string;
  path?: string;
}

// In TaskDefinition:
children?: ParsedChild[];
from_seed?: string;
```

## Step 2 — `task-md-definition.ts`

Add `'children'` and `'from_seed'` to RESERVED_KEYS.

Add parsing logic in the frontmatter parser:

```ts
// Parse children:
if (frontmatter.children != null) {
  if (!Array.isArray(frontmatter.children)) {
    throw new Error('children: must be an array');
  }
  const parsed: ParsedChild[] = [];
  const seenIds = new Set<string>();
  for (const entry of frontmatter.children) {
    if (typeof entry === 'string') {
      // Bare id
      if (entry.length === 0) throw new Error('child id must not be empty');
      if (!/^[\w.-]+$/.test(entry)) throw new Error(`invalid child id: ${entry}`);
      if (seenIds.has(entry)) throw new Error(`duplicate child id: ${entry}`);
      seenIds.add(entry);
      parsed.push({ id: entry });
    } else if (typeof entry === 'object' && entry !== null) {
      // Object form: { id, path? }
      const id = entry.id;
      if (typeof id !== 'string' || id.length === 0) throw new Error('child id must be a non-empty string');
      if (!/^[\w.-]+$/.test(id)) throw new Error(`invalid child id: ${id}`);
      if (seenIds.has(id)) throw new Error(`duplicate child id: ${id}`);
      seenIds.add(id);
      const child: ParsedChild = { id };
      if (entry.path != null) {
        if (typeof entry.path !== 'string' || entry.path.length === 0) throw new Error('child path must be a non-empty string');
        if (entry.path.startsWith('/')) throw new Error('child path must be relative');
        child.path = entry.path;
      }
      parsed.push(child);
    } else {
      throw new Error('children: each entry must be a string or { id, path? } object');
    }
  }
  taskDef.children = parsed;
}

// Parse from_seed:
if (frontmatter.from_seed != null) {
  if (typeof frontmatter.from_seed !== 'string' || frontmatter.from_seed.length === 0) {
    throw new Error('from_seed: must be a non-empty string');
  }
  taskDef.from_seed = frontmatter.from_seed;
}
```

## Step 3 — Green

Run `pnpm --filter @openplaybooks/converge-core test -- children-field` — all green.
Run `pnpm --filter @openplaybooks/converge-core test` — no regressions.
Run `pnpm --filter @converge core typecheck` — no errors.

## Done when

All tests pass. New fields parse. Existing tests unchanged.
