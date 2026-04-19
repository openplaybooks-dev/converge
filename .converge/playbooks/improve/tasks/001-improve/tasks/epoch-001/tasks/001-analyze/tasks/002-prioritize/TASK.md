---
id: 002-prioritize
title: Prioritize issues — epoch 1
checks:
  - id: analysis-written
    description: Prioritized analysis JSON exists
    cmd: test -f /Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/prioritize/report.json
vars:
  taskId: 002-prioritize
  epoch: 1
  projectDir: /Users/minh/Documents/converge
  artifactsDir: /Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001
---

# Prioritize issues

Read all analysis reports for this epoch and pick the single best issue to fix.

## Inputs

Read these reports (some may not exist if their analysis found nothing):
- `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze-types/report.json` — type errors
- `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze-structure/report.json` — structural issues
- `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze-api/report.json` — API surface issues
- `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze-tests/report.json` — test coverage gaps

## Selection criteria

Pick the issue that:
1. Has the **highest impact** — fixes a real bug or prevents future bugs
2. Has the **smallest effort** — prefer quick wins over large refactors
3. Is **self-contained** — can be fixed in a single task without cascading changes
4. Hasn't been fixed in a previous epoch — check previous epoch directories for past picks

## Output

Write `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/prioritize/report.json`:
```json
{
  "picked": {
    "id": "type-003",
    "source": "types",
    "file": "path/to/file.ts",
    "description": "...",
    "rationale": "Why this issue was selected over others"
  },
  "candidates": [
    { "id": "...", "source": "...", "description": "...", "skipped_reason": "..." }
  ]
}
```

The `picked` entry is what the implement phase will fix. Include 2-3 runner-up candidates in `candidates` for context.
