---
id: "{{taskId}}"
title: "Implementation plan — epoch {{epoch}}"
checks:
  - id: plan-written
    cmd: "test -f {{artifactsDir}}/implement/plan.md"
    description: "Implementation plan exists"
---

# Create implementation plan

Read the prioritized issue at `{{artifactsDir}}/prioritize/report.md` and create a step-by-step implementation plan.

## Rules

- Fix only the ONE picked issue — nothing else
- Don't suppress errors with `any` or `@ts-ignore`
- Don't change public API signatures unless genuinely wrong
- Don't refactor unrelated code
- Each step should be small and self-contained

## Output

Write `{{artifactsDir}}/implement/plan.md`:

```markdown
# Implementation Plan — Epoch {{epoch}}

## Issue

- **ID:** type-003
- **Source:** types
- **File:** `path/to/file.ts`
- **Description:** ...

## Steps

### step-001
- **File:** `path/to/file.ts`
- **Description:** What to do
- **Details:** Specific changes to make

### step-002
...
```

Each step becomes a separate todo task. Keep steps small — one logical change per step.
