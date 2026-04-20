---
id: "{{taskId}}"
title: "Health check — epoch {{epoch}}"
checks:
  - id: report-written
    cmd: "test -f {{artifactsDir}}/health/report.md"
    description: "Health report exists"
---

# Health check

Gather concrete metrics about project health. No opinions — just facts and numbers.

## What to measure

1. **Type errors** — run `cd {{projectDir}} && pnpm typecheck 2>&1`, count errors
2. **Tests** — run `cd {{projectDir}} && pnpm test 2>&1`, report pass/fail counts
3. **Code smells** — grep for `any` casts, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`
4. **Dead exports** — exported symbols not imported anywhere else in the project
5. **File sizes** — list files over 500 lines with line counts
6. **Dependency count** — number of production and dev dependencies across all packages

## Output

Write `{{artifactsDir}}/health/report.md`:

```markdown
# Health Report

## Type Errors
- **Count:** N
- **Files:** list of files with errors

## Tests
- **Passed:** N
- **Failed:** N
- **Skipped:** N

## Code Smells
- `any` casts: N occurrences
- `@ts-ignore`: N occurrences
- `@ts-expect-error`: N occurrences
- `eslint-disable`: N occurrences

## Dead Exports
- list of exported symbols with no consumers

## Large Files
| File | Lines |
|------|-------|
| ... | ... |

## Dependencies
- **Production:** N
- **Dev:** N
```

Report the numbers. The prioritize step will decide what matters.
