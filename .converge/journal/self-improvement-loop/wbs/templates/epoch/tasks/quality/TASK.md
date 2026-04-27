---
id: "{{taskId}}"
title: "Quality gate — epoch {{epoch}}"
checks:
  - id: typecheck
    cmd: "cd {{projectDir}} && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
    description: "Zero type errors"
  - id: tests
    cmd: "cd {{projectDir}} && pnpm test 2>&1 | tail -1"
    description: "Tests pass"
  - id: metrics-after
    cmd: "tail -1 {{projectDir}}/.converge/artifacts/improve/metrics.jsonl | grep -q '\"phase\":\"after\"'"
    description: "After-metrics recorded"
---

# Quality gate

Verify no regressions were introduced and record improvement metrics.

## Steps

1. Run `pnpm typecheck` — must pass with zero errors
2. Run `pnpm test` — all tests must pass
3. If either fails, fix the issues

## Record After-Metrics

Once quality checks pass:

1. Read `{{artifactsDir}}/analyze/report.md` to identify which dimension was targeted
2. Re-evaluate **only the targeted dimension** by sampling the changed files — score it 1-5
3. Run typecheck and test counts for the "after" snapshot
4. Append an "after" entry to `{{projectDir}}/.converge/artifacts/improve/metrics.jsonl`:

```json
{"epoch":"{{epoch}}","phase":"after","ts":"<ISO timestamp>","scores":{"api":N,"dx":N,"arch":N,"docs":N,"clarity":N,"reliability":N},"typeErrors":N,"testsPassed":N,"testsFailed":N,"fixed":"<one-line description of what was done>"}
```

Copy unchanged dimension scores from the "before" entry. Only update the targeted dimension's score.
