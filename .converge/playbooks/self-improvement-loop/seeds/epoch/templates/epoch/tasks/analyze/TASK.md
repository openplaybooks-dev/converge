---
id: "{{taskId}}"
title: "Analyze — epoch {{epoch}}"
checks:
  - id: report-written
    cmd: "test -f {{artifactsDir}}/analyze/report.md"
    description: "Analysis report exists"
  - id: metrics-written
    cmd: "test -f {{projectDir}}/.converge/artifacts/improve/metrics.jsonl"
    description: "Metrics ledger exists"
---

# Analyze codebase

Evaluate framework quality across strategic dimensions and find the single most impactful improvement.

## Scoring Dimensions

Rate each dimension 1-5 (1=poor, 5=excellent):

| Dimension | What to evaluate |
|-----------|-----------------|
| **API Consistency** | Are exports, naming, parameter patterns uniform across packages? |
| **Developer Experience** | Error messages, discoverability, getting-started friction |
| **Architecture** | Module boundaries, dependency direction, no circular imports |
| **Documentation** | README accuracy, inline comments where non-obvious, type annotations |
| **Code Clarity** | Readability, minimal indirection, functions do what they say |
| **Reliability** | Error handling at boundaries, graceful degradation, test coverage |

## Steps

1. Read previous scores from `{{projectDir}}/.converge/artifacts/improve/metrics.jsonl` (if it exists) to understand trajectory
2. Run `cd {{projectDir}} && pnpm typecheck 2>&1` — note error count
3. Run `cd {{projectDir}} && pnpm test 2>&1` — note pass/fail counts
4. Evaluate each dimension by sampling key files:
   - API Consistency: check exported interfaces across `packages/core/src/`
   - Developer Experience: check error messages in CLI and loader
   - Architecture: check imports for circular deps, module boundaries
   - Documentation: check README, JSDoc coverage on public APIs
   - Code Clarity: sample complex functions for readability
   - Reliability: check error handling at system boundaries
5. Score each dimension 1-5 with a one-line justification
6. Pick the dimension with the **lowest score** → find the single most impactful improvement in that area
7. Write the analysis report and append a "before" metrics entry

## Output

Write `{{artifactsDir}}/analyze/report.md`:

```markdown
# Analysis — Epoch {{epoch}}

## Health snapshot
- Type errors: N
- Tests: N passed, N failed

## Dimension Scores
| Dimension | Score | Justification |
|-----------|-------|---------------|
| API Consistency | N/5 | ... |
| Developer Experience | N/5 | ... |
| Architecture | N/5 | ... |
| Documentation | N/5 | ... |
| Code Clarity | N/5 | ... |
| Reliability | N/5 | ... |

## Target Dimension
**<lowest scoring dimension>** (score: N/5)

## Picked improvement
- **Area:** what part of the codebase
- **Description:** what to improve and why
- **Expected impact:** how this raises the target dimension score

## Candidates considered
- candidate 1 — why skipped
- candidate 2 — why skipped
```

## Metrics Ledger

Append a JSON line to `{{projectDir}}/.converge/artifacts/improve/metrics.jsonl`:

```json
{"epoch":"{{epoch}}","phase":"before","ts":"<ISO timestamp>","scores":{"api":N,"dx":N,"arch":N,"docs":N,"clarity":N,"reliability":N},"typeErrors":N,"testsPassed":N,"testsFailed":N,"targetDimension":"<key>","targetIssue":"<one-line description>"}
```

Create the directory `{{projectDir}}/.converge/artifacts/improve/` if it doesn't exist.
