---
id: "{{taskId}}"
title: "Analyze — epoch {{epoch}}"
checks:
  - id: report-written
    cmd: "test -f {{artifactsDir}}/analyze/report.md"
    description: "Analysis report exists"
---

# Analyze codebase

Find the single most impactful improvement to make this epoch.

## Steps

1. Run `cd {{projectDir}} && pnpm typecheck 2>&1` — note error count
2. Run `cd {{projectDir}} && pnpm test 2>&1` — note pass/fail counts
3. Scan the codebase for structural issues, API problems, or DX gaps
4. Pick the **one best improvement** — highest impact, smallest effort, self-contained

## Output

Write `{{artifactsDir}}/analyze/report.md`:

```markdown
# Analysis — Epoch {{epoch}}

## Health snapshot
- Type errors: N
- Tests: N passed, N failed

## Picked improvement
- **Area:** what part of the codebase
- **Description:** what to improve and why
- **Rationale:** why this over other options

## Candidates considered
- candidate 1 — why skipped
- candidate 2 — why skipped
```
