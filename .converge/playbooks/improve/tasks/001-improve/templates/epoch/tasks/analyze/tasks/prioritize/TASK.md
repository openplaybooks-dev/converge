---
id: "{{taskId}}"
title: "Prioritize issues — epoch {{epoch}}"
checks:
  - id: analysis-written
    cmd: "test -f {{artifactsDir}}/prioritize/report.md"
    description: "Prioritized analysis exists"
---

# Prioritize improvements

Read all analysis reports for this epoch and pick the single best improvement to make.

## Inputs

Read these reports (some may not exist if their analysis found nothing):
- `{{artifactsDir}}/health/report.md` — project health metrics
- `{{artifactsDir}}/architecture/report.md` — architecture analysis
- `{{artifactsDir}}/dx/report.md` — developer experience analysis

## Selection criteria

Pick the improvement that:
1. Has the **highest impact** — makes converge meaningfully better as a framework
2. Has the **smallest effort** — prefer quick wins over large refactors
3. Is **self-contained** — can be done in a single task without cascading changes
4. Hasn't been done in a previous epoch — check previous epoch directories for past picks

## Output

Write `{{artifactsDir}}/prioritize/report.md`:

```markdown
# Prioritization — Epoch {{epoch}}

## Picked Improvement

- **Source:** health | architecture | dx
- **Area:** what part of the codebase
- **Description:** what to improve and why
- **Rationale:** why this was selected over other candidates

## Runner-up Candidates

### candidate-1
- **Source:** ...
- **Description:** ...
- **Skipped:** reason

### candidate-2
...
```

The picked improvement is what the implement phase will work on. Include 2-3 runner-up candidates for context.
