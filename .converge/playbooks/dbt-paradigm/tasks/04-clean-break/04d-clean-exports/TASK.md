---
title: Remove deprecated public API exports and V1/V2-prefixed aliases
description: |
  Clean packages/core/src/index.ts: remove @deprecated aliases, v1-prefixed
  re-exports, V2-prefixed type aliases, and LegacyHookFn.

inputs:
  - packages/core/src/index.ts
  - packages/core/src/hooks/types.ts
  - packages/core/src/config/skill-definition.ts

outputs:
  - packages/core/src/index.ts

checks:
  - id: no-deprecated
    cmd: test -f packages/core/src/index.ts && ! grep -q '@deprecated' packages/core/src/index.ts
    description: No deprecated JSDoc annotations.
  - id: no-v1-prefix
    cmd: test -f packages/core/src/index.ts && ! grep -q 'v1TaskDef' packages/core/src/index.ts
    description: v1-prefixed alias removed.
  - id: no-v2-prefix
    cmd: test -f packages/core/src/index.ts && ! grep -qE 'as V2|as v2' packages/core/src/index.ts
    description: V2-prefixed aliases removed.
  - id: no-legacy-hookfn
    cmd: test -f packages/core/src/index.ts && ! grep -q 'LegacyHookFn' packages/core/src/index.ts
    description: LegacyHookFn removed.
  - id: typecheck-green
    cmd: test -f packages/core/src/index.ts && pnpm -r typecheck
    description: Downstream consumers still typecheck.
  - id: tests-green
    cmd: test -f packages/core/src/index.ts && pnpm -r test
    description: All tests pass.

skills: []
references:
  - "packages/core/src/index.ts"

vars: {}
dependencies:
  - 04c-remove-v1-checkpoint
---

# 04d — Clean exports

## Remove

- `parseSkillMd` / `SkillTaskDef` (@deprecated aliases, lines ~645-647)
- `taskDef as v1TaskDef` (v1 alias, line ~317)
- `UnitConfig as V2UnitConfig` and all V2-prefixed re-exports (lines ~211-248)
- `LegacyHookFn` (deprecated type, line ~76)

## Before deleting each

```bash
grep -r '<export-name>' packages/ examples/ --include='*.ts'
```

If any consumer still imports it, update to canonical name first.

## Done when

All 6 checks pass. Public API has no deprecated or transitional symbols.
