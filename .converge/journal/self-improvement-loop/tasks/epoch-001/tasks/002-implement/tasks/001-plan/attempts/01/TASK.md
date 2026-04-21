# Task: epoch-001/002-implement/001-plan

# Create implementation plan

Read the analysis report at `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze/report.md` and create a step-by-step implementation plan for the picked improvement.

## Rules

- Fix only the ONE picked issue — nothing else
- Don't suppress errors with `any` or `@ts-ignore`
- Don't change public API signatures unless genuinely wrong
- Don't refactor unrelated code
- Each step should be small and self-contained

## Output

Write `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/implement/plan.md`:

```markdown
# Implementation Plan — Epoch 1

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