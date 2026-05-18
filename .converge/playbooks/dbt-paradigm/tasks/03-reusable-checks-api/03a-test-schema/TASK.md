---
title: Define .test.md file format and parser
description: |
  A .test.md file defines a reusable check. Two types: cmd (shell) and
  js (JavaScript with context API). Mirror the style of task-md-definition.ts.

inputs:
  - packages/core/src/config/task-md-definition.ts

outputs:
  - packages/core/src/config/test-md-definition.ts
  - packages/core/tests/config/test-md-definition.test.ts

checks:
  - id: parser-exists
    cmd: test -s packages/core/src/config/test-md-definition.ts
    description: Test schema module exists.
  - id: parser-tests-green
    cmd: test -f packages/core/src/config/test-md-definition.ts && pnpm --filter @openplaybooks/converge-core test -- test-md-definition
    description: All test schema tests pass.
  - id: typecheck-green
    cmd: test -f packages/core/src/config/test-md-definition.ts && pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

skills: []
references:
  - "packages/core/src/config/task-md-definition.ts"

vars: {}
dependencies: []
---

# 03a — Test schema definition

## File format

### type: cmd (shell)
```yaml
---
name: freshness
description: Assert file is non-empty
type: cmd
args:
  path: string
---
test -s "{{ args.path }}"
```

### type: js (JavaScript with context API)
```yaml
---
name: api-check
type: js
args:
  endpoint: string
---
context.assert(context.inputs.length > 0, "No input files");
const data = JSON.parse(context.readFile(context.inputs[0]));
context.assert(data.status === "ok", "Expected ok status, got " + data.status);
```

`context` provides: `inputs: string[]`, `vars: Record<string, any>`, `assert(pass, msg)`, `readFile(path)`.

## Red phase

Write tests: parse valid cmd test, parse valid js test, unknown field throws,
missing name throws, args with defaults.

## Green phase

Implement `parseTestMd(content, filePath): TestDef`. Zod-based validation,
clear error messages with file path.

## Done when

All 3 checks pass.
