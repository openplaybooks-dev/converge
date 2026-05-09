---
id: "{{taskId}}"
title: "Verify — epoch {{epoch}}"
checks:
  - id: typecheck
    cmd: "cd {{projectDir}} && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
    description: "Zero type errors"
  - id: tests
    cmd: "cd {{projectDir}} && pnpm test 2>&1 | tail -1"
    description: "Tests pass"
  - id: result-written
    cmd: "test -f {{artifactsDir}}/verify/result.md"
    description: "Verify result recorded"
  - id: journal-appended
    cmd: "grep -q 'Epoch {{epoch}}' {{projectDir}}/.converge/artifacts/self-improvement-loop/journal.md"
    description: "Journal entry appended for this epoch"
on-fail:
  reset:
    - "002-implement"
---

# Verify

Gate the change: typecheck, test, record the result, and append to the shared journal.

## Steps

1. Run `pnpm typecheck` — must pass with zero errors
2. Run `pnpm test` — all tests must pass
3. If either fails: the task fails, triggering `on-fail.reset` to re-run implement with the failure output as feedback
4. If both pass: record the result and append to the shared journal

## Output

### Per-epoch result

Write `{{artifactsDir}}/verify/result.md`:

```markdown
# Verify — Epoch {{epoch}}

**Result:** PASSED

## Typecheck
- Zero errors

## Tests
- All passing

## What was changed
Brief summary of the fix applied, from reading the code diff.
```

### Shared journal

Append a section to `{{projectDir}}/.converge/artifacts/self-improvement-loop/journal.md`. Create the file and its directory if they don't exist. If the file already exists, add a new `## Epoch {{epoch}}` section at the end.

```markdown
## Epoch {{epoch}} — <target dimension>

**Date:** <ISO timestamp>
**Target:** <dimension> — <one-line issue description>
**Result:** PASSED
**Files changed:**
- `path/to/file.ts`

**Scores:**
| Dimension | Score |
|-----------|-------|
| API Consistency | N/5 |
| Developer Experience | N/5 |
| Architecture | N/5 |
| Documentation | N/5 |
| Code Clarity | N/5 |
| Reliability | N/5 |

**Summary:** One sentence describing the fix.
```

Copy the scores from the analyze report. Get changed files from `git diff HEAD~1 --name-only`. Keep it concise — this is a running log for future epochs to scan.
