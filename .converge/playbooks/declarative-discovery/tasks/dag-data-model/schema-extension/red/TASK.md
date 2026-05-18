---
id: schema-extension-red
title: "Red — failing tests for children: and from_seed: parsing"
description: |
  Write tests for parsing children: and from_seed: from TASK.md
  frontmatter. Tests import the parser and feed it YAML frontmatter
  strings. Run them. Confirm RED — the parser doesn't handle these
  fields yet.

inputs:
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/task-definition.ts

outputs:
  - packages/core/tests/config/children-field.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/config/children-field.test.ts
    description: Test file exists.
  - id: tests-fail
    cmd: "! pnpm --filter @openplaybooks/converge-core test -- children-field 2>/dev/null"
    description: Tests fail (RED) — fields not parsed yet.
  - id: tests-have-assertions
    cmd: "grep -cE 'expect\\(|assert' packages/core/tests/config/children-field.test.ts | awk '$1+0 < 8 { exit 1 }'"
    description: At least 8 assertions.

tags:
  - tdd
  - red
---

# Red — failing tests for children: and from_seed:

Write `packages/core/tests/config/children-field.test.ts`.

## Test scenarios

### children: — bare ids

```yaml
children:
  - 01-foo
  - 02-bar
```

Parses to `[{ id: '01-foo' }, { id: '02-bar' }]`.

### children: — object form with path

```yaml
children:
  - id: 03-shared
    path: ../../_shared/some-task/TASK.md
```

Parses to `[{ id: '03-shared', path: '../../_shared/some-task/TASK.md' }]`.

### children: — mixed

```yaml
children:
  - 01-foo
  - id: 02-bar
    path: ./alt/TASK.md
```

Both bare and object forms in the same array parse correctly.

### from_seed:

```yaml
from_seed: per-token
```

Parses to string `'per-token'`.

### Both fields coexist

```yaml
children:
  - 01-static
from_seed: dynamic-tasks
```

Both parse. TaskDefinition has both `children` and `from_seed`.

### Validation: empty id

```yaml
children:
  - ''
```

Throws validation error: "child id must not be empty".

### Validation: absolute path

```yaml
children:
  - id: foo
    path: /absolute/path/TASK.md
```

Throws validation error: "child path must be relative".

### Validation: duplicate ids

```yaml
children:
  - 01-foo
  - 01-foo
```

Throws validation error: "duplicate child id: 01-foo".

### RESERVED_KEYS

The keys `children` and `from_seed` are in the RESERVED_KEYS set
(or equivalent array) used by the frontmatter parser.

Run `pnpm --filter @openplaybooks/converge-core test -- children-field` — fails.
The parser doesn't recognize these fields. RED confirmed.
