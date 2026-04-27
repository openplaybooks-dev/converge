---
id: "{{taskId}}"
title: "Plan implementation — {{title}}"
checks:
  - id: impl-plan-written
    cmd: "test -f {{artifactsDir}}/implement/plan.md"
    description: "Implementation plan exists"
---

# Plan implementation — {{title}}

Read the analysis and produce a concrete, file-level implementation plan.

## Steps

1. Read `{{artifactsDir}}/analyze/plan.md`.
2. Reconcile the analysis against current code state — the analysis may have been written minutes or hours ago, but files may have drifted. Re-check line ranges and grep counts if they're load-bearing.
3. Write the final implementation plan. Be specific: file paths, exact lines, what becomes what.

## Output

Write `{{artifactsDir}}/implement/plan.md`:

```markdown
# {{title}} — Implementation Plan

## Summary
<one line>

## Changes (ordered)
1. File: `packages/core/src/...` — <create | move | edit | delete>; what
2. File: `packages/core/src/...` — ...

## Order of Operations
1. Do X first because Y depends on it
2. Then Z

## Post-change verification commands
- `pnpm --filter @converge/core build`
- `pnpm --filter @converge/core test`
- <any smoke checks specific to this PR>
```
