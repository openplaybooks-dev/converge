---
id: "{{taskId}}"
title: "Analyze — epoch {{epoch}}"
checks:
  - id: report-written
    cmd: "test -f {{artifactsDir}}/analyze/report.md"
    description: "Analysis report exists"
---

# Analyze and pick the next fix

Pick the single most impactful thing to fix. Follow this priority order — never skip a higher tier for a lower one.

## Priority order

| Tier | What | Signal |
|------|------|--------|
| **1. Crash** | CLI exits non-zero, unhandled exception, process dies | Test run fails with stack trace or non-zero exit |
| **2. Wrong behavior** | CLI runs but produces wrong output, wrong execution order, missing tasks | Test output doesn't match expected |
| **3. Journal corruption** | manifest.json / runstate.json inconsistent, spawned children lost, resume broken | Journal directory has missing or malformed files |
| **4. Clean code** | Dead code, leaky abstractions, 200-line functions that should be 50, mixed concerns | Code quality scoring |
| **5. Structure** | Module boundaries, dependency direction, framework/project separation | Architecture scoring |

Rule: if tier N has an issue, pick that before looking at tier N+1. One fix per epoch. The loop runs endlessly — tomorrow's epoch picks the next thing.

## Inputs

1. **Test report** — `{{artifactsDir}}/test/report.md` — bugs, crashes, wrong behavior, journal issues
2. **Shared journal** — `{{projectDir}}/.converge/artifacts/self-improvement-loop/journal.md` — what previous epochs did
3. **Typecheck** — `cd {{projectDir}} && pnpm typecheck 2>&1`
4. **Test suite** — `cd {{projectDir}} && pnpm test 2>&1`

## Steps

1. Read the test report. Any Tier 1–3 issue? → that's the target. Skip to step 6.
2. Run typecheck. Any errors? → Tier 1. Skip to step 6.
3. Run tests. Any failures? → Tier 1. Skip to step 6.
4. Score code quality dimensions 1–5 by sampling key files:
   - **API Consistency** — exports, naming, parameter patterns across packages
   - **Developer Experience** — error messages, discoverability
   - **Architecture** — module boundaries, circular imports
   - **Documentation** — README accuracy, JSDoc coverage
   - **Code Clarity** — readability, indirection, functions doing what they say
   - **Reliability** — error handling at boundaries, test coverage
5. Pick the lowest-scoring dimension → one concrete improvement (Tier 4–5).
6. Write the analysis report.

## Output

Write `{{artifactsDir}}/analyze/report.md`:

```markdown
# Analysis — Epoch {{epoch}}

## Test findings
Summary from the test report: which test was run, what issues were found, severity.

## History
Brief summary from the shared journal: how many epochs completed, which dimensions have been targeted, any patterns.

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

## Target
**<lowest scoring dimension>** (score: N/5)

## Picked improvement
- **File(s):** which file(s) to change
- **What:** what to improve and why
- **Expected impact:** how this raises the target dimension score

## Refactor signal
If the targeted dimension has been scored low and fixed 3+ times without improvement, or the same file has been patched in 3+ epochs, flag it here:
- **Signal:** NONE | <describe the pattern that suggests a larger refactor>
```
